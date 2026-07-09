// =====================================================================
// NRR Calculator (P9-1) — Business v3 standard (6+ emoji sections)
// =====================================================================
//
// Net Revenue Retention (NRR) is the headline SaaS metric every board
// reports. It measures how much revenue you keep + grow from existing
// customers — the cleanest signal of expansion vs churn health.
//
//   netRetainedMRR = startingMRR + expansionMRR − downgradeMRR − churnedMRR
//   nrr            = netRetainedMRR / startingMRR       (ratio, e.g. 1.02)
//
// Health bands (nrr as ratio; displayed as 102% / 110% / 120%):
//   🟢 ≥ 1.20 — excellent, top-quartile SaaS (OpenView / ICONIQ benchmarks)
//   🟡 1.10–1.20 — good, healthy expansion offsets churn
//   🟠 1.00–1.10 — warning, expansion barely covers churn
//   🔴 < 1.00 — critical, net revenue contraction

import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

// ============== Health band constants (per-file, exported for tests) ==============

export const HEALTH_BANDS = {
  excellent: [1.20, Infinity],
  good: [1.10, 1.20],
  warning: [1.00, 1.10],
  critical: [0, 1.00],
} as const;

// ============== Math helpers (exported for tests) ==============

/** Net retained MRR after expansion, downgrades, and churn. */
export function netRetainedMRR(
  startingMRR: number, expansionMRR: number, downgradeMRR: number, churnedMRR: number,
): number {
  return startingMRR + expansionMRR - downgradeMRR - churnedMRR;
}

/** NRR ratio (netRetainedMRR / startingMRR). 1.02 means 102% (kept all + grew 2%). */
export function nrr(
  startingMRR: number, expansionMRR: number, downgradeMRR: number, churnedMRR: number,
): number {
  if (startingMRR === 0) return 0;  // zero-division guard
  return netRetainedMRR(startingMRR, expansionMRR, downgradeMRR, churnedMRR) / startingMRR;
}

/** Health band label from NRR ratio. */
export function calcHealthBand(nrrValue: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (nrrValue >= HEALTH_BANDS.excellent[0]) return 'excellent';
  if (nrrValue >= HEALTH_BANDS.good[0]) return 'good';
  if (nrrValue >= HEALTH_BANDS.warning[0]) return 'warning';
  return 'critical';
}

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const startingMRR  = Math.max(0, parseFloat(inputs.startingMRR)  || 0);
  const expansionMRR = Math.max(0, parseFloat(inputs.expansionMRR) || 0);
  const downgradeMRR = Math.max(0, parseFloat(inputs.downgradeMRR) || 0);
  const churnedMRR   = Math.max(0, parseFloat(inputs.churnedMRR)   || 0);

  // Edge: all inputs zero → prompt to enter values
  if (startingMRR === 0 && expansionMRR === 0 && downgradeMRR === 0 && churnedMRR === 0) {
    return [
      '📊 NRR Calculator\n\n' +
        '📊 Enter your starting MRR, expansion MRR (upsell + cross-sell), downgrade MRR, and churned MRR to see your Net Revenue Retention ratio — the headline SaaS metric every board reports.',
    ];
  }

  const retained = netRetainedMRR(startingMRR, expansionMRR, downgradeMRR, churnedMRR);
  const ratio = nrr(startingMRR, expansionMRR, downgradeMRR, churnedMRR);
  const growthAboveBaseline = (ratio - 1) * 100;  // % growth above starting baseline
  const lostMRR = downgradeMRR + churnedMRR;

  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const pctInt = (n: number) => Math.round(n * 100).toString();
  const pct1 = (n: number) => n.toFixed(1);

  // Health band
  const band = calcHealthBand(ratio);
  const healthEmoji = band === 'excellent' ? '🟢' : band === 'good' ? '🟡' : band === 'warning' ? '🟠' : '🔴';
  const healthLabel =
    band === 'excellent'
      ? 'Excellent — NRR ≥ 120%; top-quartile SaaS (OpenView / ICONIQ benchmarks)'
      : band === 'good'
      ? 'Good — NRR 110–120%; expansion covers churn with margin to spare'
      : band === 'warning'
      ? 'Warning — NRR 100–110%; expansion barely offsets churn, fragile'
      : 'Critical — NRR < 100%; net revenue contraction, urgent intervention';

  // What-If scenarios (recompute NRR with one lever adjusted)
  const nrrHalveChurn    = nrr(startingMRR, expansionMRR, downgradeMRR, churnedMRR / 2);
  const nrrDoubleExpand  = nrr(startingMRR, expansionMRR * 2, downgradeMRR, churnedMRR);
  const nrrZeroDowngrade = nrr(startingMRR, expansionMRR, 0, churnedMRR);
  const liftHalveChurn    = nrrHalveChurn - ratio;
  const liftDoubleExpand  = nrrDoubleExpand - ratio;
  const liftZeroDowngrade = nrrZeroDowngrade - ratio;

  // Break-Even: gap to Excellent (NRR ≥ 1.20)
  // Target retained = 1.20 × startingMRR; current = retained; gap = max(0, target − retained)
  const targetRetained = 1.20 * startingMRR;
  const gapToExcellent = Math.max(0, targetRetained - retained);
  // Express as additional expansion MRR needed (cleanest single-lever framing)
  const additionalExpansionNeeded = gapToExcellent;

  // Milestone: gap to next tier (from current band)
  let gapToNext: number;
  let nextTier: string;
  let annualCompounded: number;
  if (band === 'critical') {
    gapToNext = 1.00 * startingMRR - retained;
    nextTier = '🟠 Warning (100%)';
  } else if (band === 'warning') {
    gapToNext = 1.10 * startingMRR - retained;
    nextTier = '🟡 Good (110%)';
  } else if (band === 'good') {
    gapToNext = 1.20 * startingMRR - retained;
    nextTier = '🟢 Excellent (120%)';
  } else {
    gapToNext = 0;
    nextTier = 'top tier maintained';
  }
  // Annual compound extrapolation: (1 + growthAboveBaseline/100)^12 — projects next-year MRR
  annualCompounded = startingMRR * Math.pow(1 + growthAboveBaseline / 100, 12);

  // Tip: band-driven contextual advice
  let tip: string;
  if (band === 'critical') {
    tip =
      'NRR < 100% means you are shrinking your existing-customer revenue base every month. Stop the bleed first: audit the top 5 churned accounts for the actual reason (champion left? product gap? pricing?), then build a save playbook. Expansion is meaningless if you are losing ground faster.';
  } else if (band === 'warning') {
    tip =
      'NRR 100–110% is fragile — one bad quarter of churn can flip you under 100%. Double down on customer success: quarterly business reviews, usage monitoring (red-flag accounts before they churn), and a price-increase motion for accounts getting value but underpaying.';
  } else if (band === 'good') {
    tip =
      'NRR 110–120% is healthy B2B SaaS. To push to Excellent (≥120%), focus on the customers who are getting the most value — offer them higher tiers, more seats, or premium support. A 10% price increase on your top 20% of accounts often moves NRR more than 50 new logos.';
  } else {
    tip =
      'NRR ≥ 120% is top-quartile SaaS. Maintain the engine: keep NPS high, monitor usage trends weekly, and protect your champion relationships. The risk at this level is overconfidence — even top-quartile NRR can slip 5pp in two quarters if you stop investing in CS.';
  }

  const r =
    '📊 NRR Calculator\n\n' +
    '🩺 Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• NRR: ' + pctInt(ratio) + '%  ·  Growth above baseline: +' + pct1(growthAboveBaseline) + '%\n' +
    '• Net retained MRR: ' + money(retained) + '  ·  Lost MRR (downgrade + churn): ' + money(lostMRR) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Inputs Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Starting MRR:           ' + money(startingMRR) + '\n' +
    '• Expansion MRR (upsell + cross-sell):  +' + money(expansionMRR) + '\n' +
    '• Downgrade MRR:         -' + money(downgradeMRR) + '\n' +
    '• Churned MRR:           -' + money(churnedMRR) + '\n' +
    '• Net retained MRR:      ' + money(retained) + ' (starting + expansion − downgrade − churn)\n' +
    '• NRR ratio: ' + ratio.toFixed(4) + ' (' + pctInt(ratio) + '%)  ·  Lost as % of start: ' + pct1(startingMRR > 0 ? (lostMRR / startingMRR) * 100 : 0) + '%\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Halve churn (' + money(churnedMRR / 2) + ' instead of ' + money(churnedMRR) + '): NRR ' + pctInt(nrrHalveChurn) + '% (+' + pct1(liftHalveChurn * 100) + 'pp)\n' +
    '• Double expansion (+' + money(expansionMRR) + ' → +' + money(expansionMRR * 2) + '): NRR ' + pctInt(nrrDoubleExpand) + '% (+' + pct1(liftDoubleExpand * 100) + 'pp)\n' +
    '• Eliminate downgrades (-' + money(downgradeMRR) + ' → 0): NRR ' + pctInt(nrrZeroDowngrade) + '% (+' + pct1(liftZeroDowngrade * 100) + 'pp)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Target for 🟢 Excellent: NRR ≥ 120% (retained MRR ≥ ' + money(targetRetained) + ')\n' +
    '• Current net retained: ' + money(retained) + '  ·  Gap to 🟢: ' + money(gapToExcellent) + '\n' +
    '• Action: add ' + money(additionalExpansionNeeded) + ' in expansion MRR (or equivalent via churn/downgrade reduction)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Milestone:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Next tier: ' + nextTier + '\n' +
    '• Gap to next tier: ' + money(Math.max(0, gapToNext)) + ' more retained MRR' + (band === 'excellent' ? ' (already at top)' : '') + '\n' +
    '• Annual compounded projection: ~' + money(annualCompounded) + '/year MRR (if NRR compounds for 12 months)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  "function nrm(s,e,d,c){return s+e-d-c;}" +
  "function nr(s,e,d,c){if(s===0)return 0;return nrm(s,e,d,c)/s;}" +
  "function band(v){if(v>=1.20)return 'excellent';if(v>=1.10)return 'good';if(v>=1.00)return 'warning';return 'critical';}" +
  "var sm=Math.max(0,parseFloat(inputs.startingMRR)||0);" +
  "var em=Math.max(0,parseFloat(inputs.expansionMRR)||0);" +
  "var dm=Math.max(0,parseFloat(inputs.downgradeMRR)||0);" +
  "var cm=Math.max(0,parseFloat(inputs.churnedMRR)||0);" +
  "if(sm===0&&em===0&&dm===0&&cm===0){" +
    "return['\\uD83D\\uDCCA NRR Calculator\\n\\n\\uD83D\\uDCCA Enter your starting MRR, expansion MRR (upsell + cross-sell), downgrade MRR, and churned MRR to see your Net Revenue Retention ratio \\u2014 the headline SaaS metric every board reports.'];" +
  "}" +
  "var ret=nrm(sm,em,dm,cm);" +
  "var r=nr(sm,em,dm,cm);" +
  "var g=(r-1)*100;" +
  "var lm=dm+cm;" +
  "function money(n){return '$'+Math.round(n).toLocaleString('en-US');}" +
  "function pi(n){return Math.round(n*100).toString();}" +
  "function p1(n){return n.toFixed(1);}" +
  "var bd=band(r);" +
  "var he=bd==='excellent'?'\\uD83D\\uDFE2':bd==='good'?'\\uD83D\\uDFE1':bd==='warning'?'\\uD83D\\uDFE0':'\\uD83D\\uDD34';" +
  "var hl=bd==='excellent'?'Excellent \\u2014 NRR \\u2265 120%; top-quartile SaaS (OpenView / ICONIQ benchmarks)':bd==='good'?'Good \\u2014 NRR 110\\u2013120%; expansion covers churn with margin to spare':bd==='warning'?'Warning \\u2014 NRR 100\\u2013110%; expansion barely offsets churn, fragile':'Critical \\u2014 NRR < 100%; net revenue contraction, urgent intervention';" +
  "var nhc=nr(sm,em,dm,cm/2);" +
  "var nde=nr(sm,em*2,dm,cm);" +
  "var nzd=nr(sm,em,0,cm);" +
  "var lhc=nhc-r;" +
  "var lde=nde-r;" +
  "var lzd=nzd-r;" +
  "var tr=1.20*sm;" +
  "var ge=Math.max(0,tr-ret);" +
  "var aen=ge;" +
  "var gn,nt,ac;" +
  "if(bd==='critical'){gn=1.00*sm-ret;nt='\\uD83D\\uDFE0 Warning (100%)';}" +
  "else if(bd==='warning'){gn=1.10*sm-ret;nt='\\uD83D\\uDFE1 Good (110%)';}" +
  "else if(bd==='good'){gn=1.20*sm-ret;nt='\\uD83D\\uDFE2 Excellent (120%)';}" +
  "else{gn=0;nt='top tier maintained';}" +
  "ac=sm*Math.pow(1+g/100,12);" +
  "var tip='';" +
  "if(bd==='critical'){tip='NRR < 100% means you are shrinking your existing-customer revenue base every month. Stop the bleed first: audit the top 5 churned accounts for the actual reason (champion left? product gap? pricing?), then build a save playbook. Expansion is meaningless if you are losing ground faster.';}" +
  "else if(bd==='warning'){tip='NRR 100\\u2013110% is fragile \\u2014 one bad quarter of churn can flip you under 100%. Double down on customer success: quarterly business reviews, usage monitoring (red-flag accounts before they churn), and a price-increase motion for accounts getting value but underpaying.';}" +
  "else if(bd==='good'){tip='NRR 110\\u2013120% is healthy B2B SaaS. To push to Excellent (\\u2265120%), focus on the customers who are getting the most value \\u2014 offer them higher tiers, more seats, or premium support. A 10% price increase on your top 20% of accounts often moves NRR more than 50 new logos.';}" +
  "else{tip='NRR \\u2265 120% is top-quartile SaaS. Maintain the engine: keep NPS high, monitor usage trends weekly, and protect your champion relationships. The risk at this level is overconfidence \\u2014 even top-quartile NRR can slip 5pp in two quarters if you stop investing in CS.';}" +
  "var r2='';" +
  "r2+='\\uD83D\\uDCCA NRR Calculator\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+he+' '+hl+'\\n';" +
  "r2+='\\u2022 NRR: '+pi(r)+'%  \\u00B7  Growth above baseline: +'+p1(g)+'%\\n';" +
  "r2+='\\u2022 Net retained MRR: '+money(ret)+'  \\u00B7  Lost MRR (downgrade + churn): '+money(lm)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCCA Inputs Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Starting MRR:           '+money(sm)+'\\n';" +
  "r2+='\\u2022 Expansion MRR (upsell + cross-sell):  +'+money(em)+'\\n';" +
  "r2+='\\u2022 Downgrade MRR:         -'+money(dm)+'\\n';" +
  "r2+='\\u2022 Churned MRR:           -'+money(cm)+'\\n';" +
  "r2+='\\u2022 Net retained MRR:      '+money(ret)+' (starting + expansion \\u2212 downgrade \\u2212 churn)\\n';" +
  "r2+='\\u2022 NRR ratio: '+r.toFixed(4)+' ('+pi(r)+'%)  \\u00B7  Lost as % of start: '+p1(sm>0?(lm/sm)*100:0)+'%\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Halve churn ('+money(cm/2)+' instead of '+money(cm)+'): NRR '+pi(nhc)+'% (+'+p1(lhc*100)+'pp)\\n';" +
  "r2+='\\u2022 Double expansion (+'+money(em)+' \\u2192 +'+money(em*2)+'): NRR '+pi(nde)+'% (+'+p1(lde*100)+'pp)\\n';" +
  "r2+='\\u2022 Eliminate downgrades (-'+money(dm)+' \\u2192 0): NRR '+pi(nzd)+'% (+'+p1(lzd*100)+'pp)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Break-Even:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Target for \\uD83D\\uDFE2 Excellent: NRR \\u2265 120% (retained MRR \\u2265 '+money(tr)+')\\n';" +
  "r2+='\\u2022 Current net retained: '+money(ret)+'  \\u00B7  Gap to \\uD83D\\uDFE2: '+money(ge)+'\\n';" +
  "r2+='\\u2022 Action: add '+money(aen)+' in expansion MRR (or equivalent via churn/downgrade reduction)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Milestone:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Next tier: '+nt+'\\n';" +
  "r2+='\\u2022 Gap to next tier: '+money(Math.max(0,gn))+' more retained MRR'+(bd==='excellent'?' (already at top)':'')+'\\n';" +
  "r2+='\\u2022 Annual compounded projection: ~'+money(ac)+'/year MRR (if NRR compounds for 12 months)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCA1 Tip: '+tip+'\\n';" +
  "return [r2];";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-nrr-calculator',
  title: 'NRR Calculator',
  description:
    'Compute Net Revenue Retention (NRR) — the headline SaaS metric every board reports. NRR measures how much revenue you keep + grow from existing customers. Health bands: 🟢 ≥120% · 🟡 110-120% · 🟠 100-110% · 🔴 <100%. For mid-market B2B SaaS ($10M–$50M ARR) CSMs and RevOps leads.',
  categoryId: 'R',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'startingMRR',  label: 'Starting MRR (USD)', placeholder: 'e.g. 100000', type: 'number' },
    { name: 'expansionMRR', label: 'Expansion MRR (upsell + cross-sell)', placeholder: 'e.g. 15000', type: 'number' },
    { name: 'downgradeMRR', label: 'Downgrade MRR', placeholder: 'e.g. 5000', type: 'number' },
    { name: 'churnedMRR',   label: 'Churned MRR', placeholder: 'e.g. 8000', type: 'number' },
  ],
  keywords: [
    'NRR calculator',
    'net revenue retention',
    'NRR',
    'net dollar retention',
    'NDR',
    'retention metric',
    'saas KPI',
    'expansion revenue',
    'B2B SaaS',
    'mid-market SaaS',
  ],
  tags: ['retention', 'csm', 'nrr', 'saas-metrics'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-09',
  sources: [
    'https://www.saas-capital.com/blog-posts/saas-retention-metrics/',
    'https://openviewpartners.com/blog/the-real-story-behind-net-dollar-retention/',
    'https://www.iconiqcapital.com/growth/tte-net-dollar-retention',
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  calculate,
  generate: calculate,
  staticExamples: ['📊 NRR Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟠 Warning — NRR 100–110%; expansion barely offsets churn, fragile\n• NRR: 102%  ·  Growth above baseline: +2.0%\n• Net retained MRR: $102,000  ·  Lost MRR (downgrade + churn): $13,000\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Starting MRR:           $100,000\n• Expansion MRR (upsell + cross-sell):  +$15,000\n• Downgrade MRR:         -$5,000\n• Churned MRR:           -$8,000\n• Net retained MRR:      $102,000 (starting + expansion − downgrade − churn)\n• NRR ratio: 1.0200 (102%)  ·  Lost as % of start: 13.0%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Halve churn ($4,000 instead of $8,000): NRR 106% (+4.0pp)\n• Double expansion (+$15,000 → +$30,000): NRR 117% (+15.0pp)\n• Eliminate downgrades (-$5,000 → 0): NRR 107% (+5.0pp)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Target for 🟢 Excellent: NRR ≥ 120% (retained MRR ≥ $120,000)\n• Current net retained: $102,000  ·  Gap to 🟢: $18,000\n• Action: add $18,000 in expansion MRR (or equivalent via churn/downgrade reduction)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Next tier: 🟡 Good (110%)\n• Gap to next tier: $8,000 more retained MRR\n• Annual compounded projection: ~$126,824/year MRR (if NRR compounds for 12 months)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: NRR 100–110% is fragile — one bad quarter of churn can flip you under 100%. Double down on customer success: quarterly business reviews, usage monitoring (red-flag accounts before they churn), and a price-increase motion for accounts getting value but underpaying.\n'],  // auto-filled by codegen-examples (placeholder for first codegen run)
  faq: [
    { q: 'What is Net Revenue Retention (NRR)?', a: 'NRR measures the revenue you keep and grow from existing customers over a period, expressed as a percentage of starting revenue. NRR > 100% means existing customers grew net of churn; NRR < 100% means net contraction. The headline SaaS metric every board reports.' },
    { q: 'How is NRR different from GRR?', a: 'NRR includes expansion (upsell, cross-sell) and can exceed 100%; GRR excludes expansion entirely, so it can never exceed 100%. GRR is the "pure retention" signal; NRR is the "retention + growth" signal. Best-in-class SaaS targets NRR ≥ 120% and GRR ≥ 90%.' },
    { q: 'What is a good NRR for B2B SaaS?', a: 'Top-quartile B2B SaaS achieves NRR ≥ 120% (OpenView / ICONIQ benchmarks for $10M-$50M ARR companies). Median is around 105-110%. Below 100% means you are shrinking your existing-customer revenue base — a critical red flag for board reporting.' },
    { q: 'How do I improve NRR?', a: 'Three levers: (1) reduce churn (proactive CS, save playbooks, exit interviews), (2) reduce downgrades (tier alignment, usage-based pricing), (3) increase expansion (cross-sell, price increases on high-value accounts, seat expansion). Often the highest-ROI lever is expansion via price increase on accounts getting strong value.' },
    { q: 'How often should NRR be measured?', a: 'Quarterly for board reporting; monthly for operational tracking. Year-over-year NRR (NRR over 12 months) is the standard for fundraising and acquisition due diligence. Note that NRR is sensitive to cohort timing — a recent expansion surge takes ~12 months to fully compound.' },
  ],
  howToUse: [
    'Enter your Starting MRR (revenue from existing customers at the start of the period).',
    'Enter Expansion MRR (upsell + cross-sell revenue from existing customers during the period).',
    'Enter Downgrade MRR (customers who reduced tier/seats during the period).',
    'Enter Churned MRR (customers who fully cancelled during the period).',
    'Read the NRR percentage and Health band. Pair with GRR (P9-2) to see pure retention vs expansion-driven retention separately.',
  ],
};

registerEngine(engine);