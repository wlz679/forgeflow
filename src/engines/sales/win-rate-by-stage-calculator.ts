import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

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
  const sqlEntered = Math.max(0, parseFloat(inputs.sqlEntered) || 0);
  const sqlAdvanced = Math.max(0, parseFloat(inputs.sqlAdvanced) || 0);
  const oppEntered = Math.max(0, parseFloat(inputs.oppEntered) || 0);
  const oppAdvanced = Math.max(0, parseFloat(inputs.oppAdvanced) || 0);
  const proposalEntered = Math.max(0, parseFloat(inputs.proposalEntered) || 0);
  const proposalAdvanced = Math.max(0, parseFloat(inputs.proposalAdvanced) || 0);
  const negEntered = Math.max(0, parseFloat(inputs.negEntered) || 0);
  const negAdvanced = Math.max(0, parseFloat(inputs.negAdvanced) || 0);

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
  const healthEmoji = band === 'excellent' ? '🟢' : band === 'good' ? '🟡' : band === 'warning' ? '🟠' : '🔴';
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
  "function sR(a,e){if(e<=0)return 0;return a/e;}" +
  "function oWR(r){return r[0]*r[1]*r[2]*r[3];}" +
  "function bS(r){var mi=0,mv=r[0];for(var i=1;i<r.length;i++){if(r[i]<mv){mv=r[i];mi=i;}}return mi;}" +
  "function band(v){if(v>=25)return 'excellent';if(v>=15)return 'good';if(v>=5)return 'warning';return 'critical';}" +
  "var sqlE=Math.max(0,parseFloat(inputs.sqlEntered)||0);" +
  "var sqlA=Math.max(0,parseFloat(inputs.sqlAdvanced)||0);" +
  "var oppE=Math.max(0,parseFloat(inputs.oppEntered)||0);" +
  "var oppA=Math.max(0,parseFloat(inputs.oppAdvanced)||0);" +
  "var proE=Math.max(0,parseFloat(inputs.proposalEntered)||0);" +
  "var proA=Math.max(0,parseFloat(inputs.proposalAdvanced)||0);" +
  "var negE=Math.max(0,parseFloat(inputs.negEntered)||0);" +
  "var negA=Math.max(0,parseFloat(inputs.negAdvanced)||0);" +
  "var sqlR=sR(sqlA,sqlE);" +
  "var oppR=sR(oppA,oppE);" +
  "var proR=sR(proA,proE);" +
  "var negR=sR(negA,negE);" +
  "var rates=[sqlR,oppR,proR,negR];" +
  "var ov=oWR(rates);" +
  "var ovP=ov*100;" +
  "var bnIdx=bS(rates);" +
  "var bnName=['SQL\\u2192Opp','Opp\\u2192Proposal','Proposal\\u2192Negotiation','Negotiation\\u2192Won'][bnIdx];" +
  "if(sqlE===0&&oppE===0&&proE===0&&negE===0){" +
    "return['\\uD83C\\uDFAF Win Rate by Stage Calculator\\n\\n\\uD83C\\uDFAF Enter deal counts for each stage transition (SQL\\u2192Opp, Opp\\u2192Proposal, Proposal\\u2192Negotiation, Negotiation\\u2192Won) to compute overall win rate and identify the funnel bottleneck.'];" +
  "}" +
  "var bd=band(ovP);" +
  "var he=bd==='excellent'?'\\uD83D\\uDFE2':bd==='good'?'\\uD83D\\uDFE1':bd==='warning'?'\\uD83D\\uDFE0':'\\uD83D\\uDD34';" +
  "var hl=bd==='excellent'?'Excellent \\u2014 overall win rate \\u2265 25%; healthy funnel':bd==='good'?'Good \\u2014 overall win rate 15%\\u201325%; mid-market B2B SaaS typical':bd==='warning'?'Warning \\u2014 overall win rate 5%\\u201315%; significant funnel leakage':'Critical \\u2014 overall win rate < 5%; funnel rebuild urgent';" +
  "var bb=Math.min(1,rates[bnIdx]+0.15);" +
  "var br=[rates[0],rates[1],rates[2],rates[3]];br[bnIdx]=bb;" +
  "var ovIB=oWR(br)*100;" +
  "var nb=Math.min(1,negR+0.10);" +
  "var ovIN=oWR([sqlR,oppR,proR,nb])*100;" +
  "function pct(n){return (n*100).toFixed(1)+'%';}" +
  "function pctI(n){return Math.round(n*100)+'%';}" +
  "var tgt=25;" +
  "var gap=Math.max(0,tgt-ovP);" +
  "var br2=rates[bnIdx];" +
  "var bnNeed=br2>0&&ovP>0?(br2*tgt/ovP)*100:0;" +
  "var negNeed=negR>0&&ovP>0?(negR*tgt/ovP)*100:0;" +
  "var gn,nt;" +
  "if(bd==='critical'){gn=5-ovP;nt='\\uD83D\\uDFE0 Warning (5%)';}" +
  "else if(bd==='warning'){gn=15-ovP;nt='\\uD83D\\uDFE1 Good (15%)';}" +
  "else if(bd==='good'){gn=25-ovP;nt='\\uD83D\\uDFE2 Excellent (25%)';}" +
  "else{gn=0;nt='top tier maintained';}" +
  "var tip='';" +
  "if(bd==='critical'){tip='Overall win rate < 5% means your funnel is leaking deals at every stage \\u2014 a single-digit won deal out of 100 entered is a 99-deal loss. Audit qualification criteria first (the leak is likely at top-of-funnel, but also check whether deals that reach Negotiation actually close). Funnel rebuild is overdue; invest in sales training, lead scoring, and stage-gate criteria before scaling spend.';}" +
  "else if(bd==='warning'){" +
    "if(bnIdx===0){tip='Win rate 5%\\u201315% with the leak at SQL\\u2192Opp means lead qualification is the bottleneck \\u2014 too many low-fit SQLs entering the funnel. Tighten MQL criteria, add BANT/MEDDIC qualification, and require a defined use case before passing to Opp. Volume of weak SQLs will not improve close rate; quality will.';}" +
    "else if(bnIdx===3){tip='Win rate 5%\\u201315% with the leak at Negotiation\\u2192Won means deals reach late stage but fail to close \\u2014 likely pricing friction, procurement blockers, or champion loss. Invest in sales coaching for negotiation, add a deal-desk review process, and audit discount authority. Late-stage losses are the most expensive funnel leak.';}" +
    "else{tip='Win rate 5%\\u201315% with mid-funnel leak ('+bnName+') \\u2014 your team converts leads but the middle of the funnel stalls. Add stage-gate reviews, faster Proposal-to-Negotiation cadence, and clearer next-step criteria. Mid-funnel deals that sit > 30 days rarely close at full rate.';}" +
  "}" +
  "else if(bd==='good'){" +
    "if(bnIdx===0){tip='Good 15%\\u201325% win rate with SQL\\u2192Opp as bottleneck \\u2014 qualification is the constraint. Tighten ICP, add lead-scoring, and prioritize fewer-but-better SQLs. A 10pp lift here (50%\\u219260%) compounds through every subsequent stage, so the ROI is highest at the top of the funnel.';}" +
    "else if(bnIdx===3){tip='Good 15%\\u201325% win rate with Negotiation\\u2192Won as bottleneck \\u2014 late-stage coaching will move you to Excellent fastest. Audit the last 10 lost deals: pricing, champion, competition, timing. Sales coaching focused on closing techniques typically lifts Neg\\u2192Won by 10\\u201315pp.';}" +
    "else{tip='Good 15%\\u201325% win rate is mid-market B2B SaaS typical. To reach Excellent (\\u226525%), identify your weakest stage and lift it 10pp. Funnel math is multiplicative \\u2014 a single-stage improvement compounds through all subsequent stages, so focus there for the fastest gain.';}" +
  "}" +
  "else{" +
    "if(bnIdx===0){tip='Excellent \\u2265 25% win rate \\u2014 your funnel is healthy. Maintain SQL quality; do not let volume pressure erode qualification standards. Watch for ICP drift as you scale; the easiest way to drop from 25% to 15% is to relax the SQL\\u2192Opp gate.';}" +
    "else if(bnIdx===3){tip='Excellent \\u2265 25% win rate with strong late-stage closing. Protect this \\u2014 Negotiation\\u2192Won is where most funnels collapse under growth pressure. Add deal-desk review, discount governance, and quarterly win/loss analysis to sustain 75%+ close at this stage as volume grows.';}" +
    "else{tip='Excellent \\u2265 25% win rate with mid-funnel bottleneck. You close well \\u2014 focus on velocity now (time-to-close), not raw win rate. Pair with sales velocity (P8-2) to identify whether deal-cycle compression or further win-rate lift will accelerate revenue more.';}" +
  "}" +
  "var r2='';" +
  "r2+='\\uD83C\\uDFAF Win Rate by Stage Calculator\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+he+' '+hl+'\\n';" +
  "r2+='\\u2022 Overall win rate: '+pctI(ov)+'  \\u00B7  Funnel cascade: '+pct(sqlR)+' \\u00D7 '+pct(oppR)+' \\u00D7 '+pct(proR)+' \\u00D7 '+pct(negR)+'\\n';" +
  "r2+='\\u2022 Bottleneck: '+bnName+' at '+pct(rates[bnIdx])+' (lowest stage rate)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCCA Inputs Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 SQL\\u2192Opp:          '+sqlA+' / '+sqlE+' = '+pct(sqlR)+'\\n';" +
  "r2+='\\u2022 Opp\\u2192Proposal:     '+oppA+' / '+oppE+' = '+pct(oppR)+'\\n';" +
  "r2+='\\u2022 Proposal\\u2192Neg:     '+proA+' / '+proE+' = '+pct(proR)+'\\n';" +
  "r2+='\\u2022 Negotiation\\u2192Won:  '+negA+' / '+negE+' = '+pct(negR)+'\\n';" +
  "r2+='\\u2022 Funnel product: '+pct(sqlR)+' \\u00D7 '+pct(oppR)+' \\u00D7 '+pct(proR)+' \\u00D7 '+pct(negR)+' = '+pctI(ov)+'\\n';" +
  "r2+='\\u2022 Out of '+sqlE+' SQLs entered \\u2192 ~'+Math.round(sqlE*ov)+' expected won deals at this rate\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 If '+bnName+' '+pct(rates[bnIdx])+'\\u2192'+pct(bb)+': '+pctI(ovIB/100)+' overall (+'+(ovIB-ovP).toFixed(1)+'pp)\\n';" +
  "r2+='\\u2022 If Negotiation\\u2192Won '+pct(negR)+'\\u2192'+pct(nb)+': '+pctI(ovIN/100)+' overall (+'+(ovIN-ovP).toFixed(1)+'pp)\\n';" +
  "r2+='\\u2022 Cumulative lift of +5pp at every stage: '+pctI(Math.min(1,(sqlR+0.05)*(oppR+0.05)*(proR+0.05)*(negR+0.05)))+' overall\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Break-Even:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Target for \\uD83D\\uDFE2 Excellent: '+tgt+'% overall win rate\\n';" +
  "r2+='\\u2022 Gap to \\uD83D\\uDFE2: '+gap.toFixed(1)+'pp\\n';" +
  "r2+='\\u2022 Path A \\u2014 lift '+bnName+' from '+pct(rates[bnIdx])+' to ~'+bnNeed.toFixed(0)+'% (or equivalent elsewhere)\\n';" +
  "r2+='\\u2022 Path B \\u2014 lift Negotiation\\u2192Won from '+pct(negR)+' to ~'+negNeed.toFixed(0)+'% (late-stage fix)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Milestone:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Next tier: '+nt+'\\n';" +
  "r2+='\\u2022 Gap to next tier: '+gn.toFixed(1)+'pp'+(bd==='excellent'?' (already at top)':'')+'\\n';" +
  "r2+='\\u2022 At current pace: '+Math.round(sqlE*ov)+' won deals per '+sqlE+' SQLs entered (1 in '+Math.round(1/Math.max(ov,0.0001))+')\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCA1 Tip: '+tip+'\\n';" +
  "return [r2];";

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
  ],
  howToUse: [
    'Enter deal counts at each stage transition — how many SQLs entered, how many advanced to Opp, how many Opps advanced to Proposal, etc.',
    'Read the overall win rate (product of all 4 stage rates) and identify the bottleneck (lowest stage rate).',
    'Use the What-If section to model improvements: lift the bottleneck by 15pp, lift Negotiation→Won by 10pp, or apply a cumulative +5pp at every stage.',
    'Use the Break-Even section to see what stage rate you need at bottleneck or Negotiation→Won to reach the 🟢 25% Excellent band.',
    'Pair with sales velocity (P8-2) to identify whether the bottleneck or throughput is the bigger lever after the funnel is fixed.',
  ],
};
registerEngine(engine);