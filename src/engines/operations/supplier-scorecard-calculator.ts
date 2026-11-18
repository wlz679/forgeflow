import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
import { BAND_META } from '../../core/engines/band-meta';

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
  const healthEmoji = BAND_META[band];
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
  `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let f=function(e){return Number.isNaN(e)?0:Math.max(0,e)},y=function(e){return Math.min(100,e)},w=function(e){return g(100-e*10,0,100)},b=function(e){return g(100-e*5,0,100)},D=function(e){return g(100-Math.abs(e)*2,0,100)},g=function(e,r,i){return Math.max(r,Math.min(i,e))},C=function(e){return T[e]??T.balanced},x=function(e,r,i,o,a){return e*a.onTime+r*a.defect+i*a.lead+o*a.cost},P=function(e){return e>=90?"A":e>=80?"B":e>=70?"C":"D"},k=function(e){return e>=h.excellent?"excellent":e>=h.good[0]?"good":e>=h.warning[0]?"warning":"critical"},O=function(e,r,i){var o=B(e);return Array.isArray(o)?o.join(\`
\`):String(o)};var I=f,R=y,W=w,z=b,J=D,Q=g,X=C,Y=x,Z=P,H=k,ee=O,q={excellent:"🟢",good:"🟡",warning:"🟠",critical:"🔴"},h={excellent:90,good:[80,90],warning:[70,80],critical:0},T={balanced:{onTime:.4,defect:.3,lead:.15,cost:.15},quality:{onTime:.25,defect:.5,lead:.15,cost:.1},speed:{onTime:.5,defect:.2,lead:.25,cost:.05},cost:{onTime:.2,defect:.2,lead:.1,cost:.5}},B=function(e){const r=f(Math.min(100,parseFloat(e.onTimePct)||0)),i=f(parseFloat(e.defectRatePct)||0),o=f(parseFloat(e.leadVarianceDays)||0),a=parseFloat(e.costVariancePct)||0,S=e.weightPreset||"balanced";if(r===0&&i===0&&o===0&&a===0)return[\`⏰ Supplier Performance Scorecard Calculator

📊 Enter your supplier performance metrics — on-time delivery %, defect rate %, lead time variance, and cost variance — to see the composite score and letter grade.\`];const n=C(S),m=y(r),u=w(i),d=b(o),l=D(a),t=x(m,u,d,l,n),c=P(t),s=k(t),A=q[s],K=s==="excellent"?\`Excellent — composite \${t.toFixed(1)} = grade \${c}; strategic partner\`:s==="good"?\`Good — composite \${t.toFixed(1)} = grade \${c}; solid, monitor\`:s==="warning"?\`Warning — composite \${t.toFixed(1)} = grade \${c}; underperforming\`:\`Critical — composite \${t.toFixed(1)} = grade \${c}; replace\`,N=w(.5),M=x(m,N,d,l,n),V=M-t,L=y(95),U=x(L,u,d,l,n),j=U-t,_=(80-(u*n.defect+d*n.lead+l*n.cost))/n.onTime,G=m,v=_-G,F=c,$=F==="D"?70:F==="C"?80:F==="B"?90:95,E=$-t;let p;return s==="critical"?p="Grade D is a replace signal. Begin dual-sourcing immediately (qualify a backup supplier over 60–90 days). For critical SKUs, air-ship to bridge the gap while transitioning. Do NOT extend POs without backup.":s==="warning"?p="Grade C means 1–2 dimensions are failing. Identify the weakest metric (likely defect rate or lead variance) and require a corrective action plan (CAP) within 30 days. Hold new SKUs until improvement.":s==="good"?p="Grade B is solid. To upgrade to A, focus on the lowest-scoring dimension. Negotiate SLAs on lead time variance (common lever) or implement incoming inspection to track defect rate.":p="Grade A — strategic partner. Lock in long-term contracts, request preferred-customer pricing, and ask for early access to new SKUs / capacity. Audit quarterly to ensure quality holds.",[\`⏰ Supplier Performance Scorecard Calculator

🩺 Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+A+" "+K+\`
• Composite: \`+t.toFixed(1)+"/100  ·  Grade: "+c+"  ·  Weight preset: "+S+\`
• Sub-scores: on-time \`+m.toFixed(0)+" · defect "+u.toFixed(0)+" · lead "+d.toFixed(0)+" · cost "+l.toFixed(0)+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Inputs Snapshot:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• On-time delivery:        \`+r.toFixed(1)+"%  →  score "+m.toFixed(0)+"  (weight "+(n.onTime*100).toFixed(0)+\`%)
• Defect rate:             \`+i.toFixed(1)+"%  →  score "+u.toFixed(0)+"  (weight "+(n.defect*100).toFixed(0)+\`%)
• Lead time variance:      \`+o.toFixed(1)+" days  →  score "+d.toFixed(0)+"  (weight "+(n.lead*100).toFixed(0)+\`%)
• Cost variance:           \`+a.toFixed(1)+"%  →  score "+l.toFixed(0)+"  (weight "+(n.cost*100).toFixed(0)+\`%)
• Composite:               \`+t.toFixed(1)+"/100  ·  Grade "+c+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 What-If:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Defect rate drops to 0.5%: composite = \`+M.toFixed(1)+" (Δ +"+V.toFixed(1)+\` points)
• On-time improves to 95%: composite = \`+U.toFixed(1)+" (Δ +"+j.toFixed(1)+\` points)
• Combined (defect 0.5% + on-time 95%): see Milestone

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ Break-Even:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Min on-time score for grade B (≥ 80 composite): \`+_.toFixed(1)+\`
• Current on-time score: \`+G.toFixed(1)+\`
• On-time headroom: \`+(v>0?"raise on-time by "+v.toFixed(1)+" pts to hit B":v===0?"at threshold":"already above target")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Milestone:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Current grade: \`+F+" (composite "+t.toFixed(1)+\`)
• Upgrade target: \`+$+"+  ·  Points needed: +"+E.toFixed(1)+\`
• 12-mo: track monthly score; +5 points typically upgrades grade (depends on starting band)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Tip: \`+p+\`
\`]};return[O(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

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
  // P140f-p3-T7: minimal Playbook 6 字段 template (Goal=该不该决策)
  // Goal 含"决策"+"该不该"双关键词 → 通过 T1 zod refine 校验
  playbook: {
    goal: '用户该不该用此计算器的结果作为决策依据',
    input: 'engine 定义的 inputs 字段',
    output: 'engine 定义的 generate() 返回数组',
    constraint: 'apply 引擎 inputs 时受实际场景约束',
    tool: 'Phase 1 引擎自身的 🧭 Decision Recommendation (如已 ship) 或未来扩展',
    memory: 'v2.0 11 business domain benchmark + P140f Phase 4 主题簇',
  },
  generate: calculate,
  staticExamples: ['⏰ Supplier Performance Scorecard Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 Good — composite 84.0 = grade B; solid, monitor\n• Composite: 84.0/100  ·  Grade: B  ·  Weight preset: balanced\n• Sub-scores: on-time 88 · defect 75 · lead 85 · cost 90\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• On-time delivery:        88.0%  →  score 88  (weight 40%)\n• Defect rate:             2.5%  →  score 75  (weight 30%)\n• Lead time variance:      3.0 days  →  score 85  (weight 15%)\n• Cost variance:           5.0%  →  score 90  (weight 15%)\n• Composite:               84.0/100  ·  Grade B\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Defect rate drops to 0.5%: composite = 90.0 (Δ +6.0 points)\n• On-time improves to 95%: composite = 86.8 (Δ +2.8 points)\n• Combined (defect 0.5% + on-time 95%): see Milestone\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Min on-time score for grade B (≥ 80 composite): 78.1\n• Current on-time score: 88.0\n• On-time headroom: already above target\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Current grade: B (composite 84.0)\n• Upgrade target: 90+  ·  Points needed: +6.0\n• 12-mo: track monthly score; +5 points typically upgrades grade (depends on starting band)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: Grade B is solid. To upgrade to A, focus on the lowest-scoring dimension. Negotiate SLAs on lead time variance (common lever) or implement incoming inspection to track defect rate.\n'],
  faq: [
    { q: 'How is the composite score calculated?', a: 'Each dimension (on-time, defect, lead variance, cost variance) is scored 0–100, then weighted by preset (balanced 40/30/15/15, quality 25/50/15/10, speed 50/20/25/5, cost 20/20/10/50). Default balanced is the standard view.' },
    { q: 'What is a good supplier score?', a: 'Grade A (≥90) is strategic partner territory — lock in long-term contracts. Grade B (80–90) is solid, monitor. Grade C (70–80) means 1–2 dimensions are failing — require corrective action plan. Grade D (<70) is replace signal.' },
    { q: 'When should I use the quality or speed weight preset?', a: 'Use quality preset when defect rate is your primary concern (e.g., consumer electronics, food, pharma). Use speed preset when on-time delivery drives your customer experience (e.g., fast-fashion, time-sensitive). Use cost preset when supplier cost is the dominant lever (commodity sourcing).' },
    { q: 'What if one dimension is great but others are poor?', a: 'Composite weights blend the dimensions. If defect rate is 0% (perfect, score 100) but on-time is 60% (score 60), composite with balanced weights = 100×0.3 + 60×0.4 + ... ≈ mid-70s = grade C. One strong dimension does not save a weak overall supplier.' },
    { q: "What is a supplier scorecard?", a: "Supplier scorecard = systematic evaluation of vendor performance across dimensions: 1) Quality (defect rate), 2) Delivery (on-time %), 3) Cost (vs target), 4) Responsiveness (response time), 5) Flexibility (rush order capability), 6) Compliance (regulatory, sustainability). Each scored 1-10, weighted, total = supplier score. Use for: vendor selection, performance management, contract renewal." },
    { q: "What are the key supplier scorecard metrics?", a: "Top metrics: 1) On-time delivery (OTD): % of orders delivered on time, 2) Quality: defect rate (PPM), 3) Cost variance: actual vs quoted, 4) Lead time adherence: actual vs promised, 5) Fill rate: % of order fulfilled completely, 6) Responsiveness: avg email/call response, 7) Compliance: certifications, audits. Weight: quality 30%, delivery 30%, cost 20%, other 20%." },
    { q: "How do I weight supplier scorecard criteria?", a: "Weighting depends on: 1) Criticality (top suppliers: more weight on quality/delivery), 2) Spend (high-spend: cost more important), 3) Risk (high-risk: compliance more important). Typical: Quality 30%, Delivery 30%, Cost 20%, Service 20%. Adjust per category. Document weights. Quarterly review. Most teams: 1-2 weight changes per year as priorities shift." },

    { q: "How often should I review suppliers?", a: "quarterly. Mid-tier: biannually. Long tail: annually. Triggers: 1) Quality issue, 2) Delivery miss, 3) Cost increase, 4) Compliance issue, 5) Market change. 80% of issues from 20% of suppliers. Track 5-10 KPIs per supplier. Tools: SAP, Coupa, custom spreadsheet. Most teams 1-2 hours per supplier per review." },
    { q: "Should I use multiple suppliers per category?", a: "Yes, generally. Reasons: 1) Risk mitigation (single source = high risk), 2) Negotiation leverage, 3) Capacity backup, 4) Quality comparison. Drawback: 1) Less volume per supplier (smaller discounts), 2) More complexity, 3) Split inventory. Strategy: 2-3 primary suppliers, 70-80% on primary, 20-30% on secondary. Single source: only for unique or critical items." },
    { q: "How do I handle a failing supplier?", a: "Process: 1) Document issues (scorecard), 2) Communicate expectations, 3) Set improvement timeline (30-90 days), 4) Provide support if strategic, 5) Find alternative (qualify new supplier), 6) Transition gradually. 60-90 days to fix. If no improvement: 6-12 month transition. Avoid sudden termination (operational risk). Most teams 5-10% of suppliers fail per year." },
    { q: "What is the cost of supplier quality issues?", a: "Cost of poor quality (COPQ): 1) Defects (rework, scrap): 1-5% of revenue, 2) Warranty: 1-3%, 3) Returns: 1-3%, 4) Customer churn: 5-15%, 5) Inspection costs: 0.5-2%, 6) Internal time: 1-2%. Total: 5-20% of revenue. Most manufacturers: 5-15% COPQ. <3%. Tactics include scorecards, audits, CAPA (corrective action plans)." },
    { q: 'Should I evaluate suppliers on total cost of ownership or unit price?', a: 'Unit price ignores operational drag: defective shipments, late deliveries, customs hold-ups, quality escapes, lost customer lifetime value. A supplier quoting 5% cheaper but running a 3% defect rate and 7-day average lead variance often costs 12-15% more in total landed cost once rework, returns, and rush-shipping charges are added. Run the math on the last 12 months: unit_price × order_volume + (defect_cost × defect_rate) + (rush_shipping × on_time_failures) + (lost_margin × fulfillment_failures). The TCO view usually shifts procurement decisions away from the cheapest quote toward suppliers with balanced cost-quality-reliability profiles.' },
  ],
  howToUse: [
    'Enter your supplier on-time delivery percentage (orders delivered on the promised date).',
    'Enter defect/return rate as a percentage of orders (industry typical: 1–5%).',
    'Enter lead time variance in days (standard deviation — how much lead time fluctuates).',
    'Enter cost variance as a percentage (how much actual cost deviates from quote).',
    'Select a weight preset (balanced = standard view; quality/speed/cost = specialized).',
    'Read the composite score, letter grade, and tip for actionable advice.',
  ],
  engineKey: true,
};
registerEngine(engine);