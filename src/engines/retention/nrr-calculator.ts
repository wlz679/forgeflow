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
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-14：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

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
  const startingMRR  = clampNonNegative(parseFloat(inputs.startingMRR)  || 0);
  const expansionMRR = clampNonNegative(parseFloat(inputs.expansionMRR) || 0);
  const downgradeMRR = clampNonNegative(parseFloat(inputs.downgradeMRR) || 0);
  const churnedMRR   = clampNonNegative(parseFloat(inputs.churnedMRR)   || 0);

  // Edge: all inputs zero → prompt to enter values
  if (startingMRR === 0 && expansionMRR === 0 && downgradeMRR === 0 && churnedMRR === 0) {
    return [
      makeToken('calc_out.section.nrr_calculator', '📊 NRR Calculator') +
        '\n\n' +
        makeToken('calc_out.nrr.row.need_inputs', '📊 Enter your starting MRR, expansion MRR (upsell + cross-sell), downgrade MRR, and churned MRR to see your Net Revenue Retention ratio — the headline SaaS metric every board reports.'),
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
  let healthLine: string;
  if (band === 'excellent') {
    healthLine = makeToken(
      'calc_out.nrr.row.health_excellent',
      '• 🟢 Excellent — NRR ≥ 120%; top-quartile SaaS (OpenView / ICONIQ benchmarks)',
    );
  } else if (band === 'good') {
    healthLine = makeToken(
      'calc_out.nrr.row.health_good',
      '• 🟡 Good — NRR 110–120%; expansion covers churn with margin to spare',
    );
  } else if (band === 'warning') {
    healthLine = makeToken(
      'calc_out.nrr.row.health_warning',
      '• 🟠 Warning — NRR 100–110%; expansion barely offsets churn, fragile',
    );
  } else {
    healthLine = makeToken(
      'calc_out.nrr.row.health_critical',
      '• 🔴 Critical — NRR < 100%; net revenue contraction, urgent intervention',
    );
  }

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
    tip = makeToken('calc_out.nrr.row.tip_critical', '💡 Tip: NRR < 100% means you are shrinking your existing-customer revenue base every month. Stop the bleed first: audit the top 5 churned accounts for the actual reason (champion left? product gap? pricing?), then build a save playbook. Expansion is meaningless if you are losing ground faster.');
  } else if (band === 'warning') {
    tip = makeToken('calc_out.nrr.row.tip_warning', '💡 Tip: NRR 100–110% is fragile — one bad quarter of churn can flip you under 100%. Double down on customer success: quarterly business reviews, usage monitoring (red-flag accounts before they churn), and a price-increase motion for accounts getting value but underpaying.');
  } else if (band === 'good') {
    tip = makeToken('calc_out.nrr.row.tip_good', '💡 Tip: NRR 110–120% is healthy B2B SaaS. To push to Excellent (≥120%), focus on the customers who are getting the most value — offer them higher tiers, more seats, or premium support. A 10% price increase on your top 20% of accounts often moves NRR more than 50 new logos.');
  } else {
    tip = makeToken('calc_out.nrr.row.tip_excellent', '💡 Tip: NRR ≥ 120% is top-quartile SaaS. Maintain the engine: keep NPS high, monitor usage trends weekly, and protect your champion relationships. The risk at this level is overconfidence — even top-quartile NRR can slip 5pp in two quarters if you stop investing in CS.');
  }

  // P168 B3-14：params 的表达式与兜底里的表达式必须**同源** ⇒ 先用局部变量承接
  const ratioPctLabel = pctInt(ratio);
  const growthLabel = pct1(growthAboveBaseline);
  const retainedLabel = money(retained);
  const lostLabel = money(lostMRR);
  const startingLabel = money(startingMRR);
  const expansionLabel = money(expansionMRR);
  const expansionDoubleLabel = money(expansionMRR * 2);
  const downgradeLabel = money(downgradeMRR);
  const churnedLabel = money(churnedMRR);
  const churnedHalfLabel = money(churnedMRR / 2);
  const ratioLabel = ratio.toFixed(4);
  const lostPctLabel = pct1(startingMRR > 0 ? (lostMRR / startingMRR) * 100 : 0);
  const nrrHalveChurnLabel = pctInt(nrrHalveChurn);
  const liftHalveChurnLabel = pct1(liftHalveChurn * 100);
  const nrrDoubleExpandLabel = pctInt(nrrDoubleExpand);
  const liftDoubleExpandLabel = pct1(liftDoubleExpand * 100);
  const nrrZeroDowngradeLabel = pctInt(nrrZeroDowngrade);
  const liftZeroDowngradeLabel = pct1(liftZeroDowngrade * 100);
  const targetRetainedLabel = money(targetRetained);
  const gapToExcellentLabel = money(gapToExcellent);
  const additionalExpansionLabel = money(additionalExpansionNeeded);
  const gapToNextLabel = money(Math.max(0, gapToNext));
  const annualCompoundedLabel = money(annualCompounded);

  const r =
    makeToken('calc_out.section.nrr_calculator', '📊 NRR Calculator') + '\n\n' +
    makeToken('calc_out.section.health', '🩺 Health:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    healthLine + '\n' +
    makeToken('calc_out.nrr.row.nrr_summary', '• NRR: ' + ratioPctLabel + '%  ·  Growth above baseline: +' + growthLabel + '%', { pct: ratioPctLabel, growth: growthLabel }) + '\n' +
    makeToken('calc_out.nrr.row.retained_lost', '• Net retained MRR: ' + retainedLabel + '  ·  Lost MRR (downgrade + churn): ' + lostLabel, { retained: retainedLabel, lost: lostLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.inputs_snapshot', '📊 Inputs Snapshot:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.nrr.row.starting_mrr', '• Starting MRR:           ' + startingLabel, { value: startingLabel }) + '\n' +
    makeToken('calc_out.nrr.row.expansion_mrr', '• Expansion MRR (upsell + cross-sell):  +' + expansionLabel, { value: expansionLabel }) + '\n' +
    makeToken('calc_out.nrr.row.downgrade_mrr', '• Downgrade MRR:         -' + downgradeLabel, { value: downgradeLabel }) + '\n' +
    makeToken('calc_out.nrr.row.churned_mrr', '• Churned MRR:           -' + churnedLabel, { value: churnedLabel }) + '\n' +
    makeToken('calc_out.nrr.row.net_retained', '• Net retained MRR:      ' + retainedLabel + ' (starting + expansion − downgrade − churn)', { value: retainedLabel }) + '\n' +
    makeToken('calc_out.nrr.row.nrr_ratio', '• NRR ratio: ' + ratioLabel + ' (' + ratioPctLabel + '%)  ·  Lost as % of start: ' + lostPctLabel + '%', { ratio: ratioLabel, pct: ratioPctLabel, lost: lostPctLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.what_if', '🔄 What-If:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.nrr.row.whatif_halve_churn', '• Halve churn (' + churnedHalfLabel + ' instead of ' + churnedLabel + '): NRR ' + nrrHalveChurnLabel + '% (+' + liftHalveChurnLabel + 'pp)', { half: churnedHalfLabel, full: churnedLabel, pct: nrrHalveChurnLabel, lift: liftHalveChurnLabel }) + '\n' +
    makeToken('calc_out.nrr.row.whatif_double_expansion', '• Double expansion (+' + expansionLabel + ' → +' + expansionDoubleLabel + '): NRR ' + nrrDoubleExpandLabel + '% (+' + liftDoubleExpandLabel + 'pp)', { from: expansionLabel, to: expansionDoubleLabel, pct: nrrDoubleExpandLabel, lift: liftDoubleExpandLabel }) + '\n' +
    makeToken('calc_out.nrr.row.whatif_zero_downgrade', '• Eliminate downgrades (-' + downgradeLabel + ' → 0): NRR ' + nrrZeroDowngradeLabel + '% (+' + liftZeroDowngradeLabel + 'pp)', { value: downgradeLabel, pct: nrrZeroDowngradeLabel, lift: liftZeroDowngradeLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.break_even', '⚖️ Break-Even:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.nrr.row.breakeven_target', '• Target for 🟢 Excellent: NRR ≥ 120% (retained MRR ≥ ' + targetRetainedLabel + ')', { value: targetRetainedLabel }) + '\n' +
    makeToken('calc_out.nrr.row.breakeven_current', '• Current net retained: ' + retainedLabel + '  ·  Gap to 🟢: ' + gapToExcellentLabel, { current: retainedLabel, gap: gapToExcellentLabel }) + '\n' +
    makeToken('calc_out.nrr.row.breakeven_action', '• Action: add ' + additionalExpansionLabel + ' in expansion MRR (or equivalent via churn/downgrade reduction)', { value: additionalExpansionLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.milestone', '🎯 Milestone:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (band === 'critical'
      ? makeToken('calc_out.nrr.row.milestone_next_tier_critical', '• Next tier: 🟠 Warning (100%)')
      : band === 'warning'
      ? makeToken('calc_out.nrr.row.milestone_next_tier_warning', '• Next tier: 🟡 Good (110%)')
      : band === 'good'
      ? makeToken('calc_out.nrr.row.milestone_next_tier_good', '• Next tier: 🟢 Excellent (120%)')
      : makeToken('calc_out.nrr.row.milestone_next_tier_excellent', '• Next tier: top tier maintained')) + '\n' +
    (band === 'excellent'
      ? makeToken('calc_out.nrr.row.milestone_gap_top', '• Gap to next tier: ' + gapToNextLabel + ' more retained MRR (already at top)', { value: gapToNextLabel })
      : makeToken('calc_out.nrr.row.milestone_gap', '• Gap to next tier: ' + gapToNextLabel + ' more retained MRR', { value: gapToNextLabel })) + '\n' +
    makeToken('calc_out.nrr.row.milestone_annual', '• Annual compounded projection: ~' + annualCompoundedLabel + '/year MRR (if NRR compounds for 12 months)', { value: annualCompoundedLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let u=function(t){return Number.isNaN(t)?0:Math.max(0,t)},E=function(t,r,o,e){return t+r-o-e},p=function(t,r,o,e){return t===0?0:E(t,r,o,e)/t},S=function(t){return t>=L.excellent[0]?"excellent":t>=L.good[0]?"good":t>=L.warning[0]?"warning":"critical"},m=function(t,r,o){var e=tn(t);return Array.isArray(e)?e.join(\`
\`):String(e)};var cn=u,ln=E,sn=p,un=S,pn=m,n=tk,nn='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',n=new Function("return "+nn)(),L={excellent:[1.2,null],good:[1.1,1.2],warning:[1,1.1],critical:[0,1]},tn=function(t){const r=u(parseFloat(t.startingMRR)||0),o=u(parseFloat(t.expansionMRR)||0),e=u(parseFloat(t.downgradeMRR)||0),i=u(parseFloat(t.churnedMRR)||0);if(r===0&&o===0&&e===0&&i===0)return[n("calc_out.section.nrr_calculator","📊 NRR Calculator")+\`

\`+n("calc_out.nrr.row.need_inputs","📊 Enter your starting MRR, expansion MRR (upsell + cross-sell), downgrade MRR, and churned MRR to see your Net Revenue Retention ratio — the headline SaaS metric every board reports.")];const d=E(r,o,e,i),l=p(r,o,e,i),C=(l-1)*100,q=e+i,a=f=>"$"+Math.round(f).toLocaleString("en-US"),w=f=>Math.round(f*100).toString(),g=f=>f.toFixed(1),c=S(l);let _;c==="excellent"?_=n("calc_out.nrr.row.health_excellent","• 🟢 Excellent — NRR ≥ 120%; top-quartile SaaS (OpenView / ICONIQ benchmarks)"):c==="good"?_=n("calc_out.nrr.row.health_good","• 🟡 Good — NRR 110–120%; expansion covers churn with margin to spare"):c==="warning"?_=n("calc_out.nrr.row.health_warning","• 🟠 Warning — NRR 100–110%; expansion barely offsets churn, fragile"):_=n("calc_out.nrr.row.health_critical","• 🔴 Critical — NRR < 100%; net revenue contraction, urgent intervention");const D=p(r,o,e,i/2),F=p(r,o*2,e,i),G=p(r,o,0,i),rn=D-l,en=F-l,on=G-l,j=1.2*r,I=Math.max(0,j-d),an=I;let R,b,O;c==="critical"?(R=1*r-d,b="🟠 Warning (100%)"):c==="warning"?(R=1.1*r-d,b="🟡 Good (110%)"):c==="good"?(R=1.2*r-d,b="🟢 Excellent (120%)"):(R=0,b="top tier maintained"),O=r*Math.pow(1+C/100,12);let h;c==="critical"?h=n("calc_out.nrr.row.tip_critical","💡 Tip: NRR < 100% means you are shrinking your existing-customer revenue base every month. Stop the bleed first: audit the top 5 churned accounts for the actual reason (champion left? product gap? pricing?), then build a save playbook. Expansion is meaningless if you are losing ground faster."):c==="warning"?h=n("calc_out.nrr.row.tip_warning","💡 Tip: NRR 100–110% is fragile — one bad quarter of churn can flip you under 100%. Double down on customer success: quarterly business reviews, usage monitoring (red-flag accounts before they churn), and a price-increase motion for accounts getting value but underpaying."):c==="good"?h=n("calc_out.nrr.row.tip_good","💡 Tip: NRR 110–120% is healthy B2B SaaS. To push to Excellent (≥120%), focus on the customers who are getting the most value — offer them higher tiers, more seats, or premium support. A 10% price increase on your top 20% of accounts often moves NRR more than 50 new logos."):h=n("calc_out.nrr.row.tip_excellent","💡 Tip: NRR ≥ 120% is top-quartile SaaS. Maintain the engine: keep NPS high, monitor usage trends weekly, and protect your champion relationships. The risk at this level is overconfidence — even top-quartile NRR can slip 5pp in two quarters if you stop investing in CS.");const x=w(l),W=g(C),s=a(d),Z=a(q),H=a(r),v=a(o),P=a(o*2),N=a(e),M=a(i),A=a(i/2),B=l.toFixed(4),$=g(r>0?q/r*100:0),z=w(D),J=g(rn*100),K=w(F),Q=g(en*100),U=w(G),X=g(on*100),Y=a(j),V=a(I),T=a(an),y=a(Math.max(0,R)),k=a(O);return[n("calc_out.section.nrr_calculator","📊 NRR Calculator")+\`

\`+n("calc_out.section.health","🩺 Health:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+_+\`
\`+n("calc_out.nrr.row.nrr_summary","• NRR: "+x+"%  ·  Growth above baseline: +"+W+"%",{pct:x,growth:W})+\`
\`+n("calc_out.nrr.row.retained_lost","• Net retained MRR: "+s+"  ·  Lost MRR (downgrade + churn): "+Z,{retained:s,lost:Z})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+n("calc_out.section.inputs_snapshot","📊 Inputs Snapshot:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+n("calc_out.nrr.row.starting_mrr","• Starting MRR:           "+H,{value:H})+\`
\`+n("calc_out.nrr.row.expansion_mrr","• Expansion MRR (upsell + cross-sell):  +"+v,{value:v})+\`
\`+n("calc_out.nrr.row.downgrade_mrr","• Downgrade MRR:         -"+N,{value:N})+\`
\`+n("calc_out.nrr.row.churned_mrr","• Churned MRR:           -"+M,{value:M})+\`
\`+n("calc_out.nrr.row.net_retained","• Net retained MRR:      "+s+" (starting + expansion − downgrade − churn)",{value:s})+\`
\`+n("calc_out.nrr.row.nrr_ratio","• NRR ratio: "+B+" ("+x+"%)  ·  Lost as % of start: "+$+"%",{ratio:B,pct:x,lost:$})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+n("calc_out.section.what_if","🔄 What-If:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+n("calc_out.nrr.row.whatif_halve_churn","• Halve churn ("+A+" instead of "+M+"): NRR "+z+"% (+"+J+"pp)",{half:A,full:M,pct:z,lift:J})+\`
\`+n("calc_out.nrr.row.whatif_double_expansion","• Double expansion (+"+v+" → +"+P+"): NRR "+K+"% (+"+Q+"pp)",{from:v,to:P,pct:K,lift:Q})+\`
\`+n("calc_out.nrr.row.whatif_zero_downgrade","• Eliminate downgrades (-"+N+" → 0): NRR "+U+"% (+"+X+"pp)",{value:N,pct:U,lift:X})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+n("calc_out.section.break_even","⚖️ Break-Even:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+n("calc_out.nrr.row.breakeven_target","• Target for 🟢 Excellent: NRR ≥ 120% (retained MRR ≥ "+Y+")",{value:Y})+\`
\`+n("calc_out.nrr.row.breakeven_current","• Current net retained: "+s+"  ·  Gap to 🟢: "+V,{current:s,gap:V})+\`
\`+n("calc_out.nrr.row.breakeven_action","• Action: add "+T+" in expansion MRR (or equivalent via churn/downgrade reduction)",{value:T})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+n("calc_out.section.milestone","🎯 Milestone:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(c==="critical"?n("calc_out.nrr.row.milestone_next_tier_critical","• Next tier: 🟠 Warning (100%)"):c==="warning"?n("calc_out.nrr.row.milestone_next_tier_warning","• Next tier: 🟡 Good (110%)"):c==="good"?n("calc_out.nrr.row.milestone_next_tier_good","• Next tier: 🟢 Excellent (120%)"):n("calc_out.nrr.row.milestone_next_tier_excellent","• Next tier: top tier maintained"))+\`
\`+(c==="excellent"?n("calc_out.nrr.row.milestone_gap_top","• Gap to next tier: "+y+" more retained MRR (already at top)",{value:y}):n("calc_out.nrr.row.milestone_gap","• Gap to next tier: "+y+" more retained MRR",{value:y}))+\`
\`+n("calc_out.nrr.row.milestone_annual","• Annual compounded projection: ~"+k+"/year MRR (if NRR compounds for 12 months)",{value:k})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+h+\`
\`]};return[m(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

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
  staticExamples: ['$calc_out.section.nrr_calculator|📊 NRR Calculator|\n\n$calc_out.section.health|🩺 Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.nrr.row.health_warning|• 🟠 Warning — NRR 100–110%; expansion barely offsets churn, fragile|\n$calc_out.nrr.row.nrr_summary{"pct":"102","growth":"2.0"}|• NRR: 102%  ·  Growth above baseline: +2.0%|\n$calc_out.nrr.row.retained_lost{"retained":"$102,000","lost":"$13,000"}|• Net retained MRR: $102,000  ·  Lost MRR (downgrade + churn): $13,000|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.nrr.row.starting_mrr{"value":"$100,000"}|• Starting MRR:           $100,000|\n$calc_out.nrr.row.expansion_mrr{"value":"$15,000"}|• Expansion MRR (upsell + cross-sell):  +$15,000|\n$calc_out.nrr.row.downgrade_mrr{"value":"$5,000"}|• Downgrade MRR:         -$5,000|\n$calc_out.nrr.row.churned_mrr{"value":"$8,000"}|• Churned MRR:           -$8,000|\n$calc_out.nrr.row.net_retained{"value":"$102,000"}|• Net retained MRR:      $102,000 (starting + expansion − downgrade − churn)|\n$calc_out.nrr.row.nrr_ratio{"ratio":"1.0200","pct":"102","lost":"13.0"}|• NRR ratio: 1.0200 (102%)  ·  Lost as % of start: 13.0%|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if|🔄 What-If:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.nrr.row.whatif_halve_churn{"half":"$4,000","full":"$8,000","pct":"106","lift":"4.0"}|• Halve churn ($4,000 instead of $8,000): NRR 106% (+4.0pp)|\n$calc_out.nrr.row.whatif_double_expansion{"from":"$15,000","to":"$30,000","pct":"117","lift":"15.0"}|• Double expansion (+$15,000 → +$30,000): NRR 117% (+15.0pp)|\n$calc_out.nrr.row.whatif_zero_downgrade{"value":"$5,000","pct":"107","lift":"5.0"}|• Eliminate downgrades (-$5,000 → 0): NRR 107% (+5.0pp)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.break_even|⚖️ Break-Even:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.nrr.row.breakeven_target{"value":"$120,000"}|• Target for 🟢 Excellent: NRR ≥ 120% (retained MRR ≥ $120,000)|\n$calc_out.nrr.row.breakeven_current{"current":"$102,000","gap":"$18,000"}|• Current net retained: $102,000  ·  Gap to 🟢: $18,000|\n$calc_out.nrr.row.breakeven_action{"value":"$18,000"}|• Action: add $18,000 in expansion MRR (or equivalent via churn/downgrade reduction)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.milestone|🎯 Milestone:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.nrr.row.milestone_next_tier_warning|• Next tier: 🟡 Good (110%)|\n$calc_out.nrr.row.milestone_gap{"value":"$8,000"}|• Gap to next tier: $8,000 more retained MRR|\n$calc_out.nrr.row.milestone_annual{"value":"$126,824"}|• Annual compounded projection: ~$126,824/year MRR (if NRR compounds for 12 months)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.nrr.row.tip_warning|💡 Tip: NRR 100–110% is fragile — one bad quarter of churn can flip you under 100%. Double down on customer success: quarterly business reviews, usage monitoring (red-flag accounts before they churn), and a price-increase motion for accounts getting value but underpaying.|\n'],  // auto-filled by codegen-examples (placeholder for first codegen run)
  faq: [
    { q: 'What is Net Revenue Retention (NRR)?', a: 'NRR measures the revenue you keep and grow from existing customers over a period, expressed as a percentage of starting revenue. NRR > 100% means existing customers grew net of churn; NRR < 100% means net contraction. The headline SaaS metric every board reports.' },
    { q: 'How is NRR different from GRR?', a: 'NRR includes expansion (upsell, cross-sell) and can exceed 100%; GRR excludes expansion entirely, so it can never exceed 100%. GRR is the "pure retention" signal; NRR is the "retention + growth" signal. Best-in-class SaaS targets NRR ≥ 120% and GRR ≥ 90%.' },
    { q: 'What is a good NRR for B2B SaaS?', a: 'Top-quartile B2B SaaS achieves NRR ≥ 120% (OpenView / ICONIQ benchmarks for $10M-$50M ARR companies). Median is around 105-110%. Below 100% means you are shrinking your existing-customer revenue base — a critical red flag for board reporting.' },
    { q: 'How do I improve NRR?', a: 'Three levers: (1) reduce churn (proactive CS, save playbooks, exit interviews), (2) reduce downgrades (tier alignment, usage-based pricing), (3) increase expansion (cross-sell, price increases on high-value accounts, seat expansion). Often the highest-ROI lever is expansion via price increase on accounts getting strong value.' },
    { q: 'How often should NRR be measured?', a: 'Quarterly for board reporting; monthly for operational tracking. Year-over-year NRR (NRR over 12 months) is the standard for fundraising and acquisition due diligence. Note that NRR is sensitive to cohort timing — a recent expansion surge takes ~12 months to fully compound.' },
    { q: "What is NRR (Net Revenue Retention)?", a: "NRR = (starting MRR + expansion - churn - contraction) / starting MRR × 100. Measures: how revenue grows from existing customers. Components: 1) Gross retention, 2) Expansion. Benchmarks: 1) <100%: shrinking, 2) 100%: treading water, 3) 100-110%: healthy, 4) 110-120%: excellent, 5) 120%+: world-class. Most SaaS: 100-115%. Top: 120%+. Snowflake: 168%, Datadog: 130%." },
    { q: "What is a good NRR for SaaS?", a: "Benchmarks: 1) <100%: revenue declining, 2) 100-110%: average, 3) 110-120%: best-in-class, 4) 120%+: world-class. By segment: SMB 90-100%, mid-market 100-110%, enterprise 110-130%. By stage: early 80-100%, growth 100-110%, scale 110-130%. Most teams target 110%+. Investors: NRR is the #2 metric after growth. 120%+." },
    { q: "What drives high NRR?", a: "Components: 1) Strong gross retention (95%+), 2) Strong expansion (10-20%/year), 3) Low contraction, 4) Low churn. Best NRR: combination of low churn + high expansion. Drivers: 1) Usage-based pricing (more adoption = more revenue), 2) Tier upgrades, 3) Seat expansion, 4) Cross-sell. Top SaaS: usage-based + strong onboarding. Net: 110-130% achievable." },
    { q: "How is NRR different from gross dollar retention?", a: "NRR includes expansion (net). Gross Dollar Retention (GDR): only churn/contraction (gross). GDR = (start - churn - contraction) / start. NRR = GDR + expansion rate. Always: NRR >= GDR. For investors: NRR is the headline. For operations: GDR is the foundation. Strong NRR + weak GDR: churning and expanding (risky). Strong GDR + weak NRR: stable but not growing (limit)." },

    { q: "What is a good NRR for early-stage SaaS?", a: "Early-stage: 1) Pre-PMF: <80% (high churn, low expansion), 2) PMF: 90-100%, 3) Growth: 100-110%, 4) Scale: 110-130%. Most seed-stage: 80-100% (acceptable for early). Series A: 100-110%. Series B: 110%+. Series C: 115%+. For valuation: investors look at NRR trajectory. Steady improvement matters. Aim: +5 pp per year. World-class from day 1: rare." },
    { q: "What is the relationship between NRR and CAC?", a: "NRR + CAC = LTV:CAC. For 110% NRR and 1:1 CAC: 1.1 LTV:CAC (poor). For 110% NRR and 1:3 CAC: 3.3:1 (excellent). For 120% NRR and 1:3 CAC: 4:1 (great). Investors: NRR is NRR, but unit economics matter. Aim: NRR 110% + CAC payback <18 months. Strong NRR: lowers CAC requirement. Weak NRR: must be very capital efficient." },
    { q: "How do I forecast NRR in financial models?", a: "Forecast: 1) Gross retention (e.g., 92% annually = 0.993 monthly), 2) Expansion rate (e.g., 15% annually = 1.012 monthly), 3) Net: 92% × 1.15 = 105.8% annual NRR. For 7-year model: cohort-based (each cohort has its own retention). Most: 3-5 year cohort model. Calculate: sum of (cohort × monthly retention × monthly expansion). NRR by cohort: 80% initial, matures to 110% over 3 years." },
  ],
  howToUse: [
    'Enter your Starting MRR (revenue from existing customers at the start of the period).',
    'Enter Expansion MRR (upsell + cross-sell revenue from existing customers during the period).',
    'Enter Downgrade MRR (customers who reduced tier/seats during the period).',
    'Enter Churned MRR (customers who fully cancelled during the period).',
    'Read the NRR percentage and Health band. Pair with GRR (P9-2) to see pure retention vs expansion-driven retention separately.',
  ],
  engineKey: true,
};

registerEngine(engine);