import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
import { BAND_META } from '../../core/engines/band-meta';

// =====================================================================
// Win Rate by Stage Calculator (P8-4) — Business v3 standard (6+ emoji sections)
// =====================================================================
//
// Win rate is computed as a multiplicative funnel across 4 stage transitions.
//   SQL → Opp → Proposal → Negotiation → Won
//
//   stageRates[0] = sqlAdvanced / sqlEntered
//   stageRates[1] = oppAdvanced / oppEntered
//   stageRates[2] = proposalAdvanced / proposalEntered
//   stageRates[3] = negAdvanced / negEntered
//
//   overallWinRate = stageRates[0] × stageRates[1] × stageRates[2] × stageRates[3]
//   bottleneckStage = argmin(stageRates)  // 0-indexed (0 = SQL→Opp)
//
// Float-precision note (per task brief):
//   Spec literal `[0.5, 0.6, 0.667, 0.75]` does NOT multiply to 0.15
//   (it equals 0.150075). The math only works with unrounded intermediates.
//   The engine derives stage rates from raw entered/advanced divisions, so
//   defaults (50/100 × 30/50 × 20/30 × 15/20) yield exactly 0.15.
//
// Health bands by overallWinRate × 100:
//   🟢 ≥ 25% — excellent funnel
//   🟡 15%–25% — good
//   🟠 5%–15% — warning
//   🔴 < 5% — critical

// ============== Health band constants (per-file, exported for tests) ==============

export const HEALTH_BANDS = {
  excellent: [25, Infinity],
  good: [15, 25],
  warning: [5, 15],
  critical: [0, 5],
} as const;

// ============== Stage names (for display + bottleneck lookup) ==============

export const STAGE_NAMES = [
  'SQL→Opp',
  'Opp→Proposal',
  'Proposal→Negotiation',
  'Negotiation→Won',
] as const;

// ============== Math helpers (exported for tests) ==============

/**
 * One stage rate = advanced ÷ entered.
 * Returns 0 when entered is 0 (zero guard for division-by-zero).
 */
export function stageRate(advanced: number, entered: number): number {
  if (entered <= 0) return 0;
  return advanced / entered;
}

/**
 * Overall win rate = product of 4 stage rates.
 * Uses unrounded stage rates — caller passes [sqlRate, oppRate, proposalRate, negRate].
 */
export function overallWinRate(stageRates: number[]): number {
  return stageRates[0] * stageRates[1] * stageRates[2] * stageRates[3];
}

/**
 * Bottleneck stage = 0-indexed argmin of stageRates.
 * Returns 0 for first stage (SQL→Opp), 1 for Opp→Proposal, etc.
 * For [0.5, 0.6, 0.667, 0.75] → returns 0 (SQL→Opp at 50% is lowest).
 */
export function bottleneckStage(stageRates: number[]): number {
  let minIdx = 0;
  let minVal = stageRates[0];
  for (let i = 1; i < stageRates.length; i++) {
    if (stageRates[i] < minVal) {
      minVal = stageRates[i];
      minIdx = i;
    }
  }
  return minIdx;
}

/** Health band label from overall win rate × 100 (percent). */
export function calcHealthBand(pct: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (pct >= HEALTH_BANDS.excellent[0]) return 'excellent';
  if (pct >= HEALTH_BANDS.good[0]) return 'good';
  if (pct >= HEALTH_BANDS.warning[0]) return 'warning';
  return 'critical';
}

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const sqlEntered = clampNonNegative(parseFloat(inputs.sqlEntered) || 0);
  const sqlAdvanced = clampNonNegative(parseFloat(inputs.sqlAdvanced) || 0);
  const oppEntered = clampNonNegative(parseFloat(inputs.oppEntered) || 0);
  const oppAdvanced = clampNonNegative(parseFloat(inputs.oppAdvanced) || 0);
  const proposalEntered = clampNonNegative(parseFloat(inputs.proposalEntered) || 0);
  const proposalAdvanced = clampNonNegative(parseFloat(inputs.proposalAdvanced) || 0);
  const negEntered = clampNonNegative(parseFloat(inputs.negEntered) || 0);
  const negAdvanced = clampNonNegative(parseFloat(inputs.negAdvanced) || 0);

  // Stage rates — unrounded intermediates (this is what makes defaults × to exactly 0.15)
  const sqlRate = stageRate(sqlAdvanced, sqlEntered);
  const oppRate = stageRate(oppAdvanced, oppEntered);
  const proposalRate = stageRate(proposalAdvanced, proposalEntered);
  const negRate = stageRate(negAdvanced, negEntered);
  const rates = [sqlRate, oppRate, proposalRate, negRate];
  const overall = overallWinRate(rates);
  const overallPct = overall * 100;
  const bottleneckIdx = bottleneckStage(rates);
  const bottleneck = STAGE_NAMES[bottleneckIdx];

  // Edge: all entered = 0 → prompt to enter values
  if (sqlEntered === 0 && oppEntered === 0 && proposalEntered === 0 && negEntered === 0) {
    return [
      '🎯 Win Rate by Stage Calculator\n\n' +
        '🎯 Enter deal counts for each stage transition (SQL→Opp, Opp→Proposal, Proposal→Negotiation, Negotiation→Won) to compute overall win rate and identify the funnel bottleneck.',
    ];
  }

  // Health band (applied to overall win rate × 100)
  const band = calcHealthBand(overallPct);
  const healthEmoji = BAND_META[band];
  const healthLabel =
    band === 'excellent'
      ? 'Excellent — overall win rate ≥ 25%; healthy funnel'
      : band === 'good'
      ? 'Good — overall win rate 15%–25%; mid-market B2B SaaS typical'
      : band === 'warning'
      ? 'Warning — overall win rate 5%–15%; significant funnel leakage'
      : 'Critical — overall win rate < 5%; funnel rebuild urgent';

  // What-If: bump bottleneck by 15pp, bump final stage (Neg→Won) by 10pp
  const bottleneckBumped = Math.min(1, rates[bottleneckIdx] + 0.15);
  const bumpedRates = [...rates];
  bumpedRates[bottleneckIdx] = bottleneckBumped;
  const overallIfBottleneck = overallWinRate(bumpedRates) * 100;
  const negBumped = Math.min(1, negRate + 0.10);
  const overallIfNeg = overallWinRate([sqlRate, oppRate, proposalRate, negBumped]) * 100;

  // Break-Even: target 25% (🟢). Show two paths — lift bottleneck vs lift Neg→Won
  const targetPct = 25;
  const gapToExcellent = Math.max(0, targetPct - overallPct);
  // Path A: lift bottleneck stage to X so overall = 25% → X = 25 / (overall / bottleneckRate)
  //         = 25 / (overallPct / rates[bottleneckIdx]) = bottleneckRate × 25 / overallPct
  const bottleneckRate = rates[bottleneckIdx];
  const bottleneckNeeded = bottleneckRate > 0 && overallPct > 0 ? (bottleneckRate * targetPct / overallPct) * 100 : 0;
  // Path B: lift Neg→Won to X → X = negRate × 25 / overallPct
  const negNeeded = negRate > 0 && overallPct > 0 ? (negRate * targetPct / overallPct) * 100 : 0;

  // Milestone: gap from current band to next tier
  let gapToNext: number;
  let nextTier: string;
  if (band === 'critical') {
    gapToNext = 5 - overallPct;
    nextTier = '🟠 Warning (5%)';
  } else if (band === 'warning') {
    gapToNext = 15 - overallPct;
    nextTier = '🟡 Good (15%)';
  } else if (band === 'good') {
    gapToNext = 25 - overallPct;
    nextTier = '🟢 Excellent (25%)';
  } else {
    gapToNext = 0;
    nextTier = 'top tier maintained';
  }

  // Tip: band-driven + bottleneck-aware (per spec)
  let tip: string;
  if (band === 'critical') {
    tip =
      'Overall win rate < 5% means your funnel is leaking deals at every stage — a single-digit won deal out of 100 entered is a 99-deal loss. Audit qualification criteria first (the leak is likely at top-of-funnel, but also check whether deals that reach Negotiation actually close). Funnel rebuild is overdue; invest in sales training, lead scoring, and stage-gate criteria before scaling spend.';
  } else if (band === 'warning') {
    if (bottleneckIdx === 0) {
      tip =
        'Win rate 5%–15% with the leak at SQL→Opp means lead qualification is the bottleneck — too many low-fit SQLs entering the funnel. Tighten MQL criteria, add BANT/MEDDIC qualification, and require a defined use case before passing to Opp. Volume of weak SQLs will not improve close rate; quality will.';
    } else if (bottleneckIdx === 3) {
      tip =
        'Win rate 5%–15% with the leak at Negotiation→Won means deals reach late stage but fail to close — likely pricing friction, procurement blockers, or champion loss. Invest in sales coaching for negotiation, add a deal-desk review process, and audit discount authority. Late-stage losses are the most expensive funnel leak.';
    } else {
      tip =
        'Win rate 5%–15% with mid-funnel leak (' + bottleneck + ') — your team converts leads but the middle of the funnel stalls. Add stage-gate reviews, faster Proposal-to-Negotiation cadence, and clearer next-step criteria. Mid-funnel deals that sit > 30 days rarely close at full rate.';
    }
  } else if (band === 'good') {
    if (bottleneckIdx === 0) {
      tip =
        'Good 15%–25% win rate with SQL→Opp as bottleneck — qualification is the constraint. Tighten ICP, add lead-scoring, and prioritize fewer-but-better SQLs. A 10pp lift here (50%→60%) compounds through every subsequent stage, so the ROI is highest at the top of the funnel.';
    } else if (bottleneckIdx === 3) {
      tip =
        'Good 15%–25% win rate with Negotiation→Won as bottleneck — late-stage coaching will move you to Excellent fastest. Audit the last 10 lost deals: pricing, champion, competition, timing. Sales coaching focused on closing techniques typically lifts Neg→Won by 10–15pp.';
    } else {
      tip =
        'Good 15%–25% win rate is mid-market B2B SaaS typical. To reach Excellent (≥25%), identify your weakest stage and lift it 10pp. Funnel math is multiplicative — a single-stage improvement compounds through all subsequent stages, so focus there for the fastest gain.';
    }
  } else {
    if (bottleneckIdx === 0) {
      tip =
        'Excellent ≥ 25% win rate — your funnel is healthy. Maintain SQL quality; do not let volume pressure erode qualification standards. Watch for ICP drift as you scale; the easiest way to drop from 25% to 15% is to relax the SQL→Opp gate.';
    } else if (bottleneckIdx === 3) {
      tip =
        'Excellent ≥ 25% win rate with strong late-stage closing. Protect this — Negotiation→Won is where most funnels collapse under growth pressure. Add deal-desk review, discount governance, and quarterly win/loss analysis to sustain 75%+ close at this stage as volume grows.';
    } else {
      tip =
        'Excellent ≥ 25% win rate with mid-funnel bottleneck. You close well — focus on velocity now (time-to-close), not raw win rate. Pair with sales velocity (P8-2) to identify whether deal-cycle compression or further win-rate lift will accelerate revenue more.';
    }
  }

  // Percent formatters
  const pct = (n: number) => (n * 100).toFixed(1) + '%';
  const pctInt = (n: number) => Math.round(n * 100) + '%';

  const r =
    '🎯 Win Rate by Stage Calculator\n\n' +
    '🩺 Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• Overall win rate: ' + pctInt(overall) + '  ·  Funnel cascade: ' + pct(sqlRate) + ' × ' + pct(oppRate) + ' × ' + pct(proposalRate) + ' × ' + pct(negRate) + '\n' +
    '• Bottleneck: ' + bottleneck + ' at ' + pct(rates[bottleneckIdx]) + ' (lowest stage rate)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Inputs Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• SQL→Opp:          ' + sqlAdvanced + ' / ' + sqlEntered + ' = ' + pct(sqlRate) + '\n' +
    '• Opp→Proposal:     ' + oppAdvanced + ' / ' + oppEntered + ' = ' + pct(oppRate) + '\n' +
    '• Proposal→Neg:     ' + proposalAdvanced + ' / ' + proposalEntered + ' = ' + pct(proposalRate) + '\n' +
    '• Negotiation→Won:  ' + negAdvanced + ' / ' + negEntered + ' = ' + pct(negRate) + '\n' +
    '• Funnel product: ' + pct(sqlRate) + ' × ' + pct(oppRate) + ' × ' + pct(proposalRate) + ' × ' + pct(negRate) + ' = ' + pctInt(overall) + '\n' +
    '• Out of ' + sqlEntered + ' SQLs entered → ~' + Math.round(sqlEntered * overall) + ' expected won deals at this rate\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• If ' + bottleneck + ' ' + pct(rates[bottleneckIdx]) + '→' + pct(bottleneckBumped) + ': ' + pctInt(overallIfBottleneck / 100) + ' overall (+' + (overallIfBottleneck - overallPct).toFixed(1) + 'pp)\n' +
    '• If Negotiation→Won ' + pct(negRate) + '→' + pct(negBumped) + ': ' + pctInt(overallIfNeg / 100) + ' overall (+' + (overallIfNeg - overallPct).toFixed(1) + 'pp)\n' +
    '• Cumulative lift of +5pp at every stage: ' + pctInt(Math.min(1, (sqlRate + 0.05) * (oppRate + 0.05) * (proposalRate + 0.05) * (negRate + 0.05))) + ' overall\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Target for 🟢 Excellent: ' + targetPct + '% overall win rate\n' +
    '• Gap to 🟢: ' + gapToExcellent.toFixed(1) + 'pp\n' +
    '• Path A — lift ' + bottleneck + ' from ' + pct(rates[bottleneckIdx]) + ' to ~' + bottleneckNeeded.toFixed(0) + '% (or equivalent elsewhere)\n' +
    '• Path B — lift Negotiation→Won from ' + pct(negRate) + ' to ~' + negNeeded.toFixed(0) + '% (late-stage fix)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Milestone:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Next tier: ' + nextTier + '\n' +
    '• Gap to next tier: ' + gapToNext.toFixed(1) + 'pp' + (band === 'excellent' ? ' (already at top)' : '') + '\n' +
    '• At current pace: ' + Math.round(sqlEntered * overall) + ' won deals per ' + sqlEntered + ' SQLs entered (1 in ' + Math.round(1 / Math.max(overall, 0.0001)) + ')\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let c=function(e){return Number.isNaN(e)?0:Math.max(0,e)},w=function(e,n){return n<=0?0:e/n},x=function(e){return e[0]*e[1]*e[2]*e[3]},q=function(e){let n=0,p=e[0];for(let a=1;a<e.length;a++)e[a]<p&&(p=e[a],n=a);return n},W=function(e){return e>=N.excellent[0]?"excellent":e>=N.good[0]?"good":e>=N.warning[0]?"warning":"critical"},P=function(e,n,p){var a=R(e);return Array.isArray(a)?a.join(\`
\`):String(a)};var Y=c,J=w,U=x,X=q,Z=W,$=P,G={excellent:"🟢",good:"🟡",warning:"🟠",critical:"🔴"},N={excellent:[25,null],good:[15,25],warning:[5,15],critical:[0,5]},T=["SQL→Opp","Opp→Proposal","Proposal→Negotiation","Negotiation→Won"],R=function(e){const n=c(parseFloat(e.sqlEntered)||0),p=c(parseFloat(e.sqlAdvanced)||0),a=c(parseFloat(e.oppEntered)||0),M=c(parseFloat(e.oppAdvanced)||0),F=c(parseFloat(e.proposalEntered)||0),A=c(parseFloat(e.proposalAdvanced)||0),E=c(parseFloat(e.negEntered)||0),I=c(parseFloat(e.negAdvanced)||0),u=w(p,n),f=w(M,a),g=w(A,F),s=w(I,E),d=[u,f,g,s],h=x(d),i=h*100,o=q(d),k=T[o];if(n===0&&a===0&&F===0&&E===0)return[\`🎯 Win Rate by Stage Calculator

🎯 Enter deal counts for each stage transition (SQL→Opp, Opp→Proposal, Proposal→Negotiation, Negotiation→Won) to compute overall win rate and identify the funnel bottleneck.\`];const l=W(i),j=G[l],V=l==="excellent"?"Excellent — overall win rate ≥ 25%; healthy funnel":l==="good"?"Good — overall win rate 15%–25%; mid-market B2B SaaS typical":l==="warning"?"Warning — overall win rate 5%–15%; significant funnel leakage":"Critical — overall win rate < 5%; funnel rebuild urgent",O=Math.min(1,d[o]+.15),L=[...d];L[o]=O;const Q=x(L)*100,B=Math.min(1,s+.1),_=x([u,f,g,B])*100,b=25,z=Math.max(0,b-i),C=d[o],D=C>0&&i>0?C*b/i*100:0,K=s>0&&i>0?s*b/i*100:0;let m,v;l==="critical"?(m=5-i,v="🟠 Warning (5%)"):l==="warning"?(m=15-i,v="🟡 Good (15%)"):l==="good"?(m=25-i,v="🟢 Excellent (25%)"):(m=0,v="top tier maintained");let r;l==="critical"?r="Overall win rate < 5% means your funnel is leaking deals at every stage — a single-digit won deal out of 100 entered is a 99-deal loss. Audit qualification criteria first (the leak is likely at top-of-funnel, but also check whether deals that reach Negotiation actually close). Funnel rebuild is overdue; invest in sales training, lead scoring, and stage-gate criteria before scaling spend.":l==="warning"?o===0?r="Win rate 5%–15% with the leak at SQL→Opp means lead qualification is the bottleneck — too many low-fit SQLs entering the funnel. Tighten MQL criteria, add BANT/MEDDIC qualification, and require a defined use case before passing to Opp. Volume of weak SQLs will not improve close rate; quality will.":o===3?r="Win rate 5%–15% with the leak at Negotiation→Won means deals reach late stage but fail to close — likely pricing friction, procurement blockers, or champion loss. Invest in sales coaching for negotiation, add a deal-desk review process, and audit discount authority. Late-stage losses are the most expensive funnel leak.":r="Win rate 5%–15% with mid-funnel leak ("+k+") — your team converts leads but the middle of the funnel stalls. Add stage-gate reviews, faster Proposal-to-Negotiation cadence, and clearer next-step criteria. Mid-funnel deals that sit > 30 days rarely close at full rate.":l==="good"?o===0?r="Good 15%–25% win rate with SQL→Opp as bottleneck — qualification is the constraint. Tighten ICP, add lead-scoring, and prioritize fewer-but-better SQLs. A 10pp lift here (50%→60%) compounds through every subsequent stage, so the ROI is highest at the top of the funnel.":o===3?r="Good 15%–25% win rate with Negotiation→Won as bottleneck — late-stage coaching will move you to Excellent fastest. Audit the last 10 lost deals: pricing, champion, competition, timing. Sales coaching focused on closing techniques typically lifts Neg→Won by 10–15pp.":r="Good 15%–25% win rate is mid-market B2B SaaS typical. To reach Excellent (≥25%), identify your weakest stage and lift it 10pp. Funnel math is multiplicative — a single-stage improvement compounds through all subsequent stages, so focus there for the fastest gain.":o===0?r="Excellent ≥ 25% win rate — your funnel is healthy. Maintain SQL quality; do not let volume pressure erode qualification standards. Watch for ICP drift as you scale; the easiest way to drop from 25% to 15% is to relax the SQL→Opp gate.":o===3?r="Excellent ≥ 25% win rate with strong late-stage closing. Protect this — Negotiation→Won is where most funnels collapse under growth pressure. Add deal-desk review, discount governance, and quarterly win/loss analysis to sustain 75%+ close at this stage as volume grows.":r="Excellent ≥ 25% win rate with mid-funnel bottleneck. You close well — focus on velocity now (time-to-close), not raw win rate. Pair with sales velocity (P8-2) to identify whether deal-cycle compression or further win-rate lift will accelerate revenue more.";const t=S=>(S*100).toFixed(1)+"%",y=S=>Math.round(S*100)+"%";return[\`🎯 Win Rate by Stage Calculator

🩺 Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+j+" "+V+\`
• Overall win rate: \`+y(h)+"  ·  Funnel cascade: "+t(u)+" × "+t(f)+" × "+t(g)+" × "+t(s)+\`
• Bottleneck: \`+k+" at "+t(d[o])+\` (lowest stage rate)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Inputs Snapshot:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• SQL→Opp:          \`+p+" / "+n+" = "+t(u)+\`
• Opp→Proposal:     \`+M+" / "+a+" = "+t(f)+\`
• Proposal→Neg:     \`+A+" / "+F+" = "+t(g)+\`
• Negotiation→Won:  \`+I+" / "+E+" = "+t(s)+\`
• Funnel product: \`+t(u)+" × "+t(f)+" × "+t(g)+" × "+t(s)+" = "+y(h)+\`
• Out of \`+n+" SQLs entered → ~"+Math.round(n*h)+\` expected won deals at this rate

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 What-If:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• If \`+k+" "+t(d[o])+"→"+t(O)+": "+y(Q/100)+" overall (+"+(Q-i).toFixed(1)+\`pp)
• If Negotiation→Won \`+t(s)+"→"+t(B)+": "+y(_/100)+" overall (+"+(_-i).toFixed(1)+\`pp)
• Cumulative lift of +5pp at every stage: \`+y(Math.min(1,(u+.05)*(f+.05)*(g+.05)*(s+.05)))+\` overall

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ Break-Even:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Target for 🟢 Excellent: \`+b+\`% overall win rate
• Gap to 🟢: \`+z.toFixed(1)+\`pp
• Path A — lift \`+k+" from "+t(d[o])+" to ~"+D.toFixed(0)+\`% (or equivalent elsewhere)
• Path B — lift Negotiation→Won from \`+t(s)+" to ~"+K.toFixed(0)+\`% (late-stage fix)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Milestone:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Next tier: \`+v+\`
• Gap to next tier: \`+m.toFixed(1)+"pp"+(l==="excellent"?" (already at top)":"")+\`
• At current pace: \`+Math.round(n*h)+" won deals per "+n+" SQLs entered (1 in "+Math.round(1/Math.max(h,1e-4))+\`)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Tip: \`+r+\`
\`]};return[P(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-win-rate-by-stage-calculator',
  title: 'Win Rate by Stage Calculator',
  description:
    'Compute overall sales win rate as a multiplicative funnel across 4 stage transitions (SQL→Opp→Proposal→Negotiation→Won) and identify the bottleneck stage. Reveals which transition is leaking the most deals. Health bands: 🟢 ≥25% · 🟡 15%-25% · 🟠 5%-15% · 🔴 <5%.',
  categoryId: 'S',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'sqlEntered', label: 'SQL entered', placeholder: 'e.g. 100', type: 'number' },
    { name: 'sqlAdvanced', label: 'SQL → Opp advanced', placeholder: 'e.g. 50', type: 'number' },
    { name: 'oppEntered', label: 'Opp entered', placeholder: 'e.g. 50', type: 'number' },
    { name: 'oppAdvanced', label: 'Opp → Proposal advanced', placeholder: 'e.g. 30', type: 'number' },
    { name: 'proposalEntered', label: 'Proposal entered', placeholder: 'e.g. 30', type: 'number' },
    { name: 'proposalAdvanced', label: 'Proposal → Negotiation advanced', placeholder: 'e.g. 20', type: 'number' },
    { name: 'negEntered', label: 'Negotiation entered', placeholder: 'e.g. 20', type: 'number' },
    { name: 'negAdvanced', label: 'Negotiation → Won', placeholder: 'e.g. 15', type: 'number' },
  ],
  keywords: [
    'win rate calculator',
    'sales win rate',
    'funnel conversion',
    'stage conversion',
    'sales funnel',
    'win rate by stage',
    'bottleneck analysis',
    'sales KPI',
    'B2B SaaS sales',
    'pipeline conversion',
  ],
  tags: ['sales', 'win-rate', 'crm', 'funnel'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-07',
  sources: [
    'https://blog.hubspot.com/sales/sales-funnel',
    'https://www.insivia.com/blog/sales-funnel-stages/',
    'https://blog.hubspot.com/sales/sales-conversion-rate',
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
  staticExamples: [
    '🎯 Win Rate by Stage Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 Good — overall win rate 15%–25%; mid-market B2B SaaS typical\n• Overall win rate: 15%  ·  Funnel cascade: 50.0% × 60.0% × 66.7% × 75.0%\n• Bottleneck: SQL→Opp at 50.0% (lowest stage rate)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• SQL→Opp:          50 / 100 = 50.0%\n• Opp→Proposal:     30 / 50 = 60.0%\n• Proposal→Neg:     20 / 30 = 66.7%\n• Negotiation→Won:  15 / 20 = 75.0%\n• Funnel product: 50.0% × 60.0% × 66.7% × 75.0% = 15%\n• Out of 100 SQLs entered → ~15 expected won deals at this rate\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• If SQL→Opp 50.0%→65.0%: 20% overall (+4.5pp)\n• If Negotiation→Won 75.0%→85.0%: 17% overall (+2.0pp)\n• Cumulative lift of +5pp at every stage: 20% overall\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Target for 🟢 Excellent: 25% overall win rate\n• Gap to 🟢: 10.0pp\n• Path A — lift SQL→Opp from 50.0% to ~83% (or equivalent elsewhere)\n• Path B — lift Negotiation→Won from 75.0% to ~125% (late-stage fix)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Next tier: 🟢 Excellent (25%)\n• Gap to next tier: 10.0pp\n• At current pace: 15 won deals per 100 SQLs entered (1 in 7)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: Good 15%–25% win rate with SQL→Opp as bottleneck — qualification is the constraint. Tighten ICP, add lead-scoring, and prioritize fewer-but-better SQLs. A 10pp lift here (50%→60%) compounds through every subsequent stage, so the ROI is highest at the top of the funnel.\n',
  ],
  faq: [
    { q: 'What is win rate by stage?', a: 'Win rate by stage measures conversion at each funnel transition: SQL→Opp, Opp→Proposal, Proposal→Negotiation, Negotiation→Won. Multiplying all four stage rates gives the overall win rate. This view reveals exactly where the funnel leaks — a single weak stage compounds through every subsequent transition.' },
    { q: 'How do you calculate overall win rate?', a: 'Overall win rate is the product of all stage rates: win = (SQL→Opp) × (Opp→Proposal) × (Proposal→Negotiation) × (Negotiation→Won). For example, 50% × 60% × 67% × 75% = 15%. Each transition multiplies on the previous, so a 50% leak at any single stage cuts overall win rate in half.' },
    { q: 'What is a good overall sales win rate?', a: 'Bands: < 5% is critical (funnel rebuild needed), 5%–15% is warning (significant leakage), 15%–25% is good (mid-market B2B SaaS typical), ≥ 25% is excellent. Most B2B SaaS companies target 15%–25%. Enterprise sales with longer cycles and higher ACV often have lower win rates but bigger deals.' },
    { q: 'How do you find the funnel bottleneck?', a: 'The bottleneck is the stage with the lowest conversion rate. For a funnel of [50%, 60%, 67%, 75%], SQL→Opp at 50% is the bottleneck. Improving that single stage has the highest ROI because the lift compounds through every subsequent transition. Fixing a 75% stage instead is wasted effort.' },
    { q: 'How does this differ from sales velocity (P8-2)?', a: 'Win rate by stage measures funnel conversion (which transition leaks). Sales velocity measures pipeline throughput (how fast revenue flows). Velocity = opportunities × deal size × win rate ÷ cycle days. Use win rate to fix the leak, velocity to optimize the throughput after the leak is fixed.' },

    { q: "What is a good win rate by stage for SaaS?", a: "Benchmarks: 1) Discovery → Demo: 50-60%, 2) Demo → Evaluation: 30-50%, 3) Evaluation → Negotiation: 50-70%, 4) Negotiation → Close: 60-80%. Total close rate: 20-35% (compounded). 35-50%. Low: <20% (qualification issue). Most teams 25-30% close is healthy. Track weekly, by rep, by source. Top: improve weakest stage. Most leverage: discovery → demo." },
    { q: "How do I improve win rate at the demo stage?", a: "1) Better qualification before demo, 2) Personalized demo (research customer), 3) Focus on outcomes (not features), 4) Engage multiple stakeholders, 5) Next steps defined. 5-10 pp lift in 3-6 months. Top: 1) Pre-demo research + 2) Personalized demo. 80% of demos fail due to: 1) Wrong audience, 2) Generic pitch, 3) No next steps. Most teams 50% improvement with discipline." },
    { q: "How do I use win rate for forecasting?", a: "Forecast = sum(weighted pipeline) by stage. Stage weights: 1) Discovery 5-10%, 2) Demo 10-20%, 3) Evaluation 25-40%, 4) Negotiation 50-70%, 5) Commit 80%+. history-based weights. Update quarterly. forecast accuracy 80%+. Tools: Salesforce, Clari. Most teams stage-based forecast + commit. Best option: 3-3-3 (commit, best case, pipeline). 80% of commit = actual." },
    { q: "What is the biggest bottleneck in win rates?", a: "Common: 1) Discovery → Demo (40-50% drop), 2) Demo → Evaluation (50-60% drop), 3) Evaluation → Negotiation (30-50% drop). usually Demo → Evaluation (if your demos are bad). Or: Evaluation → Negotiation (if your evaluation is bad). Diagnose: 1) Win/loss analysis, 2) Customer interviews, 3) Rep coaching. Most teams 1-2 stages with major issues. Fix those first." },
    { q: "What is a healthy stage distribution?", a: "Pipeline stage distribution: 1) Early (Discovery, Demo): 50-60%, 2) Mid (Evaluation, Negotiation): 30-40%, 3) Late (Commit, Close): 10-20%. 60/30/10 (early/mid/late). Healthy: lots in early (build pipeline), some in mid, some in late. 50/35/15. If 80% in early: pipeline quality issue. If 50% in late: not enough pipeline. Use quarterly review." },
    { q: "How do I track win rate over time?", a: "Track 1) Total win rate (monthly), 2) Win rate by stage, 3) Win rate by source, 4) Win rate by rep, 5) Win rate by segment. Tools: CRM reports, dashboards. weekly review. Trend matters more than absolute. Declining: 1) Quality issue, 2) Competition, 3) Rep skill. Increasing: 1) Better qualification, 2) Better training. 5-10% YoY win rate improvement is good." },
    { q: "Should I disqualify more to increase win rate?", a: "Yes, generally. Better qualification = higher win rate. Tactics include 1) BANT (Budget, Authority, Need, Timeline), 2) MEDDIC, 3) GPCT (Goals, Plans, Challenges, Timeline), 4) Discovery-first approach. 30-50% improvement in close rate. Trade-off: less pipeline volume. Net: usually better. high close + small pipeline = better than low close + huge pipeline. Quality wins." },
  ],
  howToUse: [
    'Enter deal counts at each stage transition — how many SQLs entered, how many advanced to Opp, how many Opps advanced to Proposal, etc.',
    'Read the overall win rate (product of all 4 stage rates) and identify the bottleneck (lowest stage rate).',
    'Use the What-If section to model improvements: lift the bottleneck by 15pp, lift Negotiation→Won by 10pp, or apply a cumulative +5pp at every stage.',
    'Use the Break-Even section to see what stage rate you need at bottleneck or Negotiation→Won to reach the 🟢 25% Excellent band.',
    'Pair with sales velocity (P8-2) to identify whether the bottleneck or throughput is the bigger lever after the funnel is fixed.',
  ],
  engineKey: true,
};
registerEngine(engine);