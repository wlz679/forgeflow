import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

// =====================================================================
// Supplier Performance Scorecard Calculator (P7-6) — Business v3 standard
// =====================================================================
//
// Weighted composite score across 4 dimensions: on-time, defect, lead variance, cost variance.
// Each metric scored 0–100, then weighted by preset (balanced/quality/speed/cost).
// Letter grade A/B/C/D + emoji band.
// Health bands (composite score):
//   🟢 ≥ 90   — A — strategic partner
//   🟡 80–90  — B — solid, monitor
//   🟠 70–80  — C — underperforming
//   🔴 < 70   — D — replace
//
// Applies to physical-product businesses (Shopify/Amazon FBA/DTC) — service
// businesses with no suppliers should skip this calculator.

// ============== Health band constants (per-file, exported for tests) ==============

export const HEALTH_BANDS = {
  excellent: 90,
  good: [80, 90],
  warning: [70, 80],
  critical: 0,
} as const;

// ============== Math helpers (exported for tests) ==============

/** Score 0–100 for on-time delivery; clamp at 100. */
export function scoreOnTime(onTimePct: number): number {
  return Math.min(100, onTimePct);
}

/** Score 0–100 for defect rate; 1% defect = -10 points. */
export function scoreDefect(defectRatePct: number): number {
  return clamp(100 - defectRatePct * 10, 0, 100);
}

/** Score 0–100 for lead-time variance; 1 day variance = -5 points. */
export function scoreLead(leadVarianceDays: number): number {
  return clamp(100 - leadVarianceDays * 5, 0, 100);
}

/** Score 0–100 for cost variance; 1% cost variance = -2 points. */
export function scoreCost(costVariancePct: number): number {
  return clamp(100 - Math.abs(costVariancePct) * 2, 0, 100);
}

/** Numeric clamp helper. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Weight preset lookup. */
const WEIGHTS: Record<string, { onTime: number; defect: number; lead: number; cost: number }> = {
  balanced: { onTime: 0.4, defect: 0.3, lead: 0.15, cost: 0.15 },
  quality:  { onTime: 0.25, defect: 0.5, lead: 0.15, cost: 0.1 },
  speed:    { onTime: 0.5, defect: 0.2, lead: 0.25, cost: 0.05 },
  cost:     { onTime: 0.2, defect: 0.2, lead: 0.1, cost: 0.5 },
};
export function getWeights(preset: string): { onTime: number; defect: number; lead: number; cost: number } {
  return WEIGHTS[preset] ?? WEIGHTS.balanced;
}

/** Composite score = weighted sum of 4 sub-scores. */
export function compositeScore(
  onTime: number,
  defect: number,
  lead: number,
  cost: number,
  weights: { onTime: number; defect: number; lead: number; cost: number }
): number {
  return onTime * weights.onTime + defect * weights.defect + lead * weights.lead + cost * weights.cost;
}

/** Letter grade from composite score (A/B/C/D). */
export function gradeFromScore(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  return 'D';
}

/** Health band label from composite score. */
export function calcHealthBand(score: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (score >= HEALTH_BANDS.excellent) return 'excellent';
  if (score >= HEALTH_BANDS.good[0]) return 'good';
  if (score >= HEALTH_BANDS.warning[0]) return 'warning';
  return 'critical';
}

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const onTimePct = clampNonNegative(Math.min(100, parseFloat(inputs.onTimePct) || 0));
  const defectRatePct = clampNonNegative(parseFloat(inputs.defectRatePct) || 0);
  const leadVarianceDays = clampNonNegative(parseFloat(inputs.leadVarianceDays) || 0);
  const costVariancePct = parseFloat(inputs.costVariancePct) || 0;
  const weightPreset = inputs.weightPreset || 'balanced';

  // Edge: all zero scores → prompt
  if (onTimePct === 0 && defectRatePct === 0 && leadVarianceDays === 0 && costVariancePct === 0) {
    return [
      '⏰ Supplier Performance Scorecard Calculator\n\n' +
        '📊 Enter your supplier performance metrics — on-time delivery %, defect rate %, lead time variance, and cost variance — to see the composite score and letter grade.',
    ];
  }

  const weights = getWeights(weightPreset);
  const sOT = scoreOnTime(onTimePct);
  const sDef = scoreDefect(defectRatePct);
  const sLead = scoreLead(leadVarianceDays);
  const sCost = scoreCost(costVariancePct);
  const score = compositeScore(sOT, sDef, sLead, sCost, weights);
  const grade = gradeFromScore(score);

  // Health band
  const band = calcHealthBand(score);
  const healthEmoji = band === 'excellent' ? '🟢' : band === 'good' ? '🟡' : band === 'warning' ? '🟠' : '🔴';
  const healthLabel =
    band === 'excellent'
      ? `Excellent — composite ${score.toFixed(1)} = grade ${grade}; strategic partner`
      : band === 'good'
      ? `Good — composite ${score.toFixed(1)} = grade ${grade}; solid, monitor`
      : band === 'warning'
      ? `Warning — composite ${score.toFixed(1)} = grade ${grade}; underperforming`
      : `Critical — composite ${score.toFixed(1)} = grade ${grade}; replace`;

  // What-If: defect rate drops to 0.5%, then on-time improves to 95%
  const defDown = 0.5;
  const sDefDown = scoreDefect(defDown);
  const scoreDefDown = compositeScore(sOT, sDefDown, sLead, sCost, weights);
  const scoreDeltaDef = scoreDefDown - score;

  const otUp = 95;
  const sOTUp = scoreOnTime(otUp);
  const scoreOTUp = compositeScore(sOTUp, sDef, sLead, sCost, weights);
  const scoreDeltaOT = scoreOTUp - score;

  // Break-Even: min on-time for grade B (≥ 80 composite, balanced weights)
  // composite = onTime × 0.40 + defect × 0.30 + lead × 0.15 + cost × 0.15 ≥ 80
  // If other 3 fixed: onTime ≥ (80 - defect × 0.30 - lead × 0.15 - cost × 0.15) / 0.40
  const otherContribution = sDef * weights.defect + sLead * weights.lead + sCost * weights.cost;
  const targetOnTimeScore = (80 - otherContribution) / weights.onTime;
  const currentOnTimeScore = sOT;
  const onTimeHeadroom = targetOnTimeScore - currentOnTimeScore;

  // Milestone: 12-mo — track monthly score trend; +5 → upgrade grade
  const currentGrade = grade;
  const nextGradeThreshold = currentGrade === 'D' ? 70 : currentGrade === 'C' ? 80 : currentGrade === 'B' ? 90 : 95;
  const pointsToUpgrade = nextGradeThreshold - score;

  // Tip: band-driven contextual advice
  let tip: string;
  if (band === 'critical') {
    tip =
      'Grade D is a replace signal. Begin dual-sourcing immediately (qualify a backup supplier over 60–90 days). For critical SKUs, air-ship to bridge the gap while transitioning. Do NOT extend POs without backup.';
  } else if (band === 'warning') {
    tip =
      'Grade C means 1–2 dimensions are failing. Identify the weakest metric (likely defect rate or lead variance) and require a corrective action plan (CAP) within 30 days. Hold new SKUs until improvement.';
  } else if (band === 'good') {
    tip =
      'Grade B is solid. To upgrade to A, focus on the lowest-scoring dimension. Negotiate SLAs on lead time variance (common lever) or implement incoming inspection to track defect rate.';
  } else {
    tip =
      'Grade A — strategic partner. Lock in long-term contracts, request preferred-customer pricing, and ask for early access to new SKUs / capacity. Audit quarterly to ensure quality holds.';
  }

  const r =
    '⏰ Supplier Performance Scorecard Calculator\n\n' +
    '🩺 Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• Composite: ' + score.toFixed(1) + '/100  ·  Grade: ' + grade + '  ·  Weight preset: ' + weightPreset + '\n' +
    '• Sub-scores: on-time ' + sOT.toFixed(0) + ' · defect ' + sDef.toFixed(0) + ' · lead ' + sLead.toFixed(0) + ' · cost ' + sCost.toFixed(0) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Inputs Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• On-time delivery:        ' + onTimePct.toFixed(1) + '%  →  score ' + sOT.toFixed(0) + '  (weight ' + (weights.onTime * 100).toFixed(0) + '%)\n' +
    '• Defect rate:             ' + defectRatePct.toFixed(1) + '%  →  score ' + sDef.toFixed(0) + '  (weight ' + (weights.defect * 100).toFixed(0) + '%)\n' +
    '• Lead time variance:      ' + leadVarianceDays.toFixed(1) + ' days  →  score ' + sLead.toFixed(0) + '  (weight ' + (weights.lead * 100).toFixed(0) + '%)\n' +
    '• Cost variance:           ' + costVariancePct.toFixed(1) + '%  →  score ' + sCost.toFixed(0) + '  (weight ' + (weights.cost * 100).toFixed(0) + '%)\n' +
    '• Composite:               ' + score.toFixed(1) + '/100  ·  Grade ' + grade + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Defect rate drops to 0.5%: composite = ' + scoreDefDown.toFixed(1) + ' (Δ +' + scoreDeltaDef.toFixed(1) + ' points)\n' +
    '• On-time improves to 95%: composite = ' + scoreOTUp.toFixed(1) + ' (Δ +' + scoreDeltaOT.toFixed(1) + ' points)\n' +
    '• Combined (defect 0.5% + on-time 95%): see Milestone\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Min on-time score for grade B (≥ 80 composite): ' + targetOnTimeScore.toFixed(1) + '\n' +
    '• Current on-time score: ' + currentOnTimeScore.toFixed(1) + '\n' +
    '• On-time headroom: ' + (onTimeHeadroom > 0 ? 'raise on-time by ' + onTimeHeadroom.toFixed(1) + ' pts to hit B' : onTimeHeadroom === 0 ? 'at threshold' : 'already above target') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Milestone:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Current grade: ' + currentGrade + ' (composite ' + score.toFixed(1) + ')\n' +
    '• Upgrade target: ' + nextGradeThreshold + '+  ·  Points needed: +' + pointsToUpgrade.toFixed(1) + '\n' +
    '• 12-mo: track monthly score; +5 points typically upgrades grade (depends on starting band)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  "function sOT(p){return Math.min(100,p);}" +
  "function sDef(d){return Math.max(0,Math.min(100,100-d*10));}" +
  "function sLead(lv){return Math.max(0,Math.min(100,100-lv*5));}" +
  "function sCost(cv){return Math.max(0,Math.min(100,100-Math.abs(cv)*2));}" +
  "var W={balanced:{onTime:0.4,defect:0.3,lead:0.15,cost:0.15},quality:{onTime:0.25,defect:0.5,lead:0.15,cost:0.1},speed:{onTime:0.5,defect:0.2,lead:0.25,cost:0.05},cost:{onTime:0.2,defect:0.2,lead:0.1,cost:0.5}};" +
  "function gw(p){return W[p]||W.balanced;}" +
  "function cs(ot,df,ld,ct,w){return ot*w.onTime+df*w.defect+ld*w.lead+ct*w.cost;}" +
  "function gr(s){if(s>=90)return 'A';if(s>=80)return 'B';if(s>=70)return 'C';return 'D';}" +
  "function band(s){if(s>=90)return 'excellent';if(s>=80)return 'good';if(s>=70)return 'warning';return 'critical';}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var otp=cnn(Math.min(100,parseFloat(inputs.onTimePct)||0));" +
  "var drp=cnn(parseFloat(inputs.defectRatePct)||0);" +
  "var lvd=cnn(parseFloat(inputs.leadVarianceDays)||0);" +
  "var cvp=parseFloat(inputs.costVariancePct)||0;" +
  "var wp=inputs.weightPreset||'balanced';" +
  "if(otp===0&&drp===0&&lvd===0&&cvp===0){return['\\u23F0 Supplier Performance Scorecard Calculator\\n\\n\\uD83D\\uDCCA Enter your supplier performance metrics \\u2014 on-time delivery %, defect rate %, lead time variance, and cost variance \\u2014 to see the composite score and letter grade.'];}" +
  "var w=gw(wp);" +
  "var s1=sOT(otp);var s2=sDef(drp);var s3=sLead(lvd);var s4=sCost(cvp);" +
  "var sc=cs(s1,s2,s3,s4,w);" +
  "var g=gr(sc);" +
  "var bd=band(sc);" +
  "var he=bd==='excellent'?'\\uD83D\\uDFE2':bd==='good'?'\\uD83D\\uDFE1':bd==='warning'?'\\uD83D\\uDFE0':'\\uD83D\\uDD34';" +
  "var hl=bd==='excellent'?'Excellent \\u2014 composite '+sc.toFixed(1)+' = grade '+g+'; strategic partner':bd==='good'?'Good \\u2014 composite '+sc.toFixed(1)+' = grade '+g+'; solid, monitor':bd==='warning'?'Warning \\u2014 composite '+sc.toFixed(1)+' = grade '+g+'; underperforming':'Critical \\u2014 composite '+sc.toFixed(1)+' = grade '+g+'; replace';" +
  "var dD=0.5;var sD2=sDef(dD);var scD=cs(s1,sD2,s3,s4,w);var scDlt=scD-sc;" +
  "var otU=95;var sOU=sOT(otU);var scOU=cs(sOU,s2,s3,s4,w);var scOlt=scOU-sc;" +
  "var oc=s2*w.defect+s3*w.lead+s4*w.cost;var tOT=(80-oc)/w.onTime;var cOT=s1;var oth=tOT-cOT;" +
  "var cg=g;var nGT=cg==='D'?70:cg==='C'?80:cg==='B'?90:95;var pt2up=nGT-sc;" +
  "var tip='';" +
  "if(bd==='critical'){tip='Grade D is a replace signal. Begin dual-sourcing immediately (qualify a backup supplier over 60\\u201390 days). For critical SKUs, air-ship to bridge the gap while transitioning. Do NOT extend POs without backup.';}" +
  "else if(bd==='warning'){tip='Grade C means 1\\u20132 dimensions are failing. Identify the weakest metric (likely defect rate or lead variance) and require a corrective action plan (CAP) within 30 days. Hold new SKUs until improvement.';}" +
  "else if(bd==='good'){tip='Grade B is solid. To upgrade to A, focus on the lowest-scoring dimension. Negotiate SLAs on lead time variance (common lever) or implement incoming inspection to track defect rate.';}" +
  "else{tip='Grade A \\u2014 strategic partner. Lock in long-term contracts, request preferred-customer pricing, and ask for early access to new SKUs / capacity. Audit quarterly to ensure quality holds.';}" +
  "var r2='';" +
  "r2+='\\u23F0 Supplier Performance Scorecard Calculator\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+he+' '+hl+'\\n';" +
  "r2+='\\u2022 Composite: '+sc.toFixed(1)+'/100  \\u00B7  Grade: '+g+'  \\u00B7  Weight preset: '+wp+'\\n';" +
  "r2+='\\u2022 Sub-scores: on-time '+s1.toFixed(0)+' \\u00B7 defect '+s2.toFixed(0)+' \\u00B7 lead '+s3.toFixed(0)+' \\u00B7 cost '+s4.toFixed(0)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCCA Inputs Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 On-time delivery:        '+otp.toFixed(1)+'%  \\u2192  score '+s1.toFixed(0)+'  (weight '+(w.onTime*100).toFixed(0)+'%)\\n';" +
  "r2+='\\u2022 Defect rate:             '+drp.toFixed(1)+'%  \\u2192  score '+s2.toFixed(0)+'  (weight '+(w.defect*100).toFixed(0)+'%)\\n';" +
  "r2+='\\u2022 Lead time variance:      '+lvd.toFixed(1)+' days  \\u2192  score '+s3.toFixed(0)+'  (weight '+(w.lead*100).toFixed(0)+'%)\\n';" +
  "r2+='\\u2022 Cost variance:           '+cvp.toFixed(1)+'%  \\u2192  score '+s4.toFixed(0)+'  (weight '+(w.cost*100).toFixed(0)+'%)\\n';" +
  "r2+='\\u2022 Composite:               '+sc.toFixed(1)+'/100  \\u00B7  Grade '+g+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Defect rate drops to 0.5%: composite = '+scD.toFixed(1)+' (\\u0394 +'+scDlt.toFixed(1)+' points)\\n';" +
  "r2+='\\u2022 On-time improves to 95%: composite = '+scOU.toFixed(1)+' (\\u0394 +'+scOlt.toFixed(1)+' points)\\n';" +
  "r2+='\\u2022 Combined (defect 0.5% + on-time 95%): see Milestone\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Break-Even:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Min on-time score for grade B (\\u2265 80 composite): '+tOT.toFixed(1)+'\\n';" +
  "r2+='\\u2022 Current on-time score: '+cOT.toFixed(1)+'\\n';" +
  "r2+='\\u2022 On-time headroom: '+(oth>0?'raise on-time by '+oth.toFixed(1)+' pts to hit B':oth===0?'at threshold':'already above target')+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Milestone:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Current grade: '+cg+' (composite '+sc.toFixed(1)+')\\n';" +
  "r2+='\\u2022 Upgrade target: '+nGT+'+  \\u00B7  Points needed: +'+pt2up.toFixed(1)+'\\n';" +
  "r2+='\\u2022 12-mo: track monthly score; +5 points typically upgrades grade (depends on starting band)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCA1 Tip: '+tip+'\\n';" +
  "return [r2];";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-supplier-scorecard-calculator',
  title: 'Supplier Performance Scorecard Calculator',
  description:
    'Weighted composite supplier score — on-time + defect + lead + cost. Letter grade A/B/C/D with health bands. Industry benchmarks: 🟢 ≥90 (A) · 🟡 80–90 (B) · 🟠 70–80 (C) · 🔴 <70 (D).',
  categoryId: 'O',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'onTimePct', label: 'On-Time Delivery (%)', placeholder: 'e.g. 88', type: 'number' },
    { name: 'defectRatePct', label: 'Defect / Return Rate (%)', placeholder: 'e.g. 2.5', type: 'number' },
    { name: 'leadVarianceDays', label: 'Lead Time Variance (days, std dev)', placeholder: 'e.g. 3', type: 'number' },
    { name: 'costVariancePct', label: 'Cost Variance (%)', placeholder: 'e.g. 5', type: 'number' },
    {
      name: 'weightPreset',
      label: 'Weight Preset',
      placeholder: '',
      type: 'select',
      options: ['balanced', 'quality', 'speed', 'cost'],
    },
  ],
  keywords: [
    'supplier scorecard',
    'supplier performance',
    'vendor rating',
    'on-time delivery',
    'defect rate',
    'lead time variance',
    'cost variance',
    'composite score',
    'letter grade supplier',
    'supplier evaluation',
  ],
  tags: ['operations', 'supplier', 'vendor-management', 'scorecard'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-06',
  sources: [
    'https://www.scoreboard.com/supplier-scorecard/',
    'https://www.smartsheet.com/supplier-scorecard',
    'https://www.iso.org/standard/62085.html',
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  calculate,
  generate: calculate,
  staticExamples: ['⏰ Supplier Performance Scorecard Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 Good — composite 84.0 = grade B; solid, monitor\n• Composite: 84.0/100  ·  Grade: B  ·  Weight preset: balanced\n• Sub-scores: on-time 88 · defect 75 · lead 85 · cost 90\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• On-time delivery:        88.0%  →  score 88  (weight 40%)\n• Defect rate:             2.5%  →  score 75  (weight 30%)\n• Lead time variance:      3.0 days  →  score 85  (weight 15%)\n• Cost variance:           5.0%  →  score 90  (weight 15%)\n• Composite:               84.0/100  ·  Grade B\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Defect rate drops to 0.5%: composite = 90.0 (Δ +6.0 points)\n• On-time improves to 95%: composite = 86.8 (Δ +2.8 points)\n• Combined (defect 0.5% + on-time 95%): see Milestone\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Min on-time score for grade B (≥ 80 composite): 78.1\n• Current on-time score: 88.0\n• On-time headroom: already above target\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Current grade: B (composite 84.0)\n• Upgrade target: 90+  ·  Points needed: +6.0\n• 12-mo: track monthly score; +5 points typically upgrades grade (depends on starting band)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: Grade B is solid. To upgrade to A, focus on the lowest-scoring dimension. Negotiate SLAs on lead time variance (common lever) or implement incoming inspection to track defect rate.\n'],
  faq: [
    { q: 'How is the composite score calculated?', a: 'Each dimension (on-time, defect, lead variance, cost variance) is scored 0–100, then weighted by preset (balanced 40/30/15/15, quality 25/50/15/10, speed 50/20/25/5, cost 20/20/10/50). Default balanced is the standard view.' },
    { q: 'What is a good supplier score?', a: 'Grade A (≥90) is strategic partner territory — lock in long-term contracts. Grade B (80–90) is solid, monitor. Grade C (70–80) means 1–2 dimensions are failing — require corrective action plan. Grade D (<70) is replace signal.' },
    { q: 'When should I use the quality or speed weight preset?', a: 'Use quality preset when defect rate is your primary concern (e.g., consumer electronics, food, pharma). Use speed preset when on-time delivery drives your customer experience (e.g., fast-fashion, time-sensitive). Use cost preset when supplier cost is the dominant lever (commodity sourcing).' },
    { q: 'What if one dimension is great but others are poor?', a: 'Composite weights blend the dimensions. If defect rate is 0% (perfect, score 100) but on-time is 60% (score 60), composite with balanced weights = 100×0.3 + 60×0.4 + ... ≈ mid-70s = grade C. One strong dimension does not save a weak overall supplier.' },
  ],
  howToUse: [
    'Enter your supplier on-time delivery percentage (orders delivered on the promised date).',
    'Enter defect/return rate as a percentage of orders (industry typical: 1–5%).',
    'Enter lead time variance in days (standard deviation — how much lead time fluctuates).',
    'Enter cost variance as a percentage (how much actual cost deviates from quote).',
    'Select a weight preset (balanced = standard view; quality/speed/cost = specialized).',
    'Read the composite score, letter grade, and tip for actionable advice.',
  ],
};
registerEngine(engine);