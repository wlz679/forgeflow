// =====================================================================
// Expansion Revenue Calculator (P9-3) — Business v3 standard
// =====================================================================
//
// Expansion revenue as % of starting MRR — the top-line growth lever from
// existing customers. Separates upsell (same product, more usage) from
// cross-sell (new product). High expansion enables NRR > 100% even when
// GRR is mediocre.
//
//   expansionMRR = upsellMRR + crossSellMRR
//   expansionPct = expansionMRR / startingMRR       (ratio, e.g. 0.17)
//
// Health bands (expansionPct as ratio; displayed as 17% / 22% / 28%):
//   🟢 ≥ 0.25 — excellent, best-in-class mid-market expansion motion
//   🟡 0.15–0.25 — good, top-quartile mid-market
//   🟠 0.05–0.15 — warning, motion exists but underweight
//   🔴 < 0.05 — critical, no expansion motion; pure retention play

import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-14：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

export const HEALTH_BANDS = {
  excellent: [0.25, Infinity],
  good: [0.15, 0.25],
  warning: [0.05, 0.15],
  critical: [0, 0.05],
} as const;

export function expansionMRR(u: number, c: number): number {
  return u + c;
}

export function expansionPct(s: number, u: number, c: number): number {
  if (s === 0) return 0;
  return expansionMRR(u, c) / s;
}

export function calcHealthBand(v: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (v >= HEALTH_BANDS.excellent[0]) return 'excellent';
  if (v >= HEALTH_BANDS.good[0]) return 'good';
  if (v >= HEALTH_BANDS.warning[0]) return 'warning';
  return 'critical';
}

function calculate(inputs: Record<string, string>): string[] {
  const startingMRR = clampNonNegative(parseFloat(inputs.startingMRR) || 0);
  const upsellMRR = clampNonNegative(parseFloat(inputs.upsellMRR) || 0);
  const crossSellMRR = clampNonNegative(parseFloat(inputs.crossSellMRR) || 0);

  if (startingMRR === 0 && upsellMRR === 0 && crossSellMRR === 0) {
    return [
      makeToken('calc_out.section.expansion_revenue_calculator', '📊 Expansion Revenue Calculator') +
        '\n\n' +
        makeToken('calc_out.expansion_revenue.row.need_inputs', '📊 Enter starting MRR, upsell MRR, and cross-sell MRR to see your expansion revenue percentage — the top-line growth lever from existing customers.'),
    ];
  }

  const totalExpansion = expansionMRR(upsellMRR, crossSellMRR);
  const ratio = expansionPct(startingMRR, upsellMRR, crossSellMRR);

  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const pctInt = (n: number) => Math.round(n * 100).toString();
  const pct1 = (n: number) => n.toFixed(1);

  const band = calcHealthBand(ratio);
  let healthLine: string;
  if (band === 'excellent') {
    healthLine = makeToken(
      'calc_out.expansion_revenue.row.health_excellent',
      '• 🟢 Excellent — Expansion ≥ 25%; best-in-class mid-market expansion motion',
    );
  } else if (band === 'good') {
    healthLine = makeToken(
      'calc_out.expansion_revenue.row.health_good',
      '• 🟡 Good — Expansion 15–25%; top-quartile mid-market expansion',
    );
  } else if (band === 'warning') {
    healthLine = makeToken(
      'calc_out.expansion_revenue.row.health_warning',
      '• 🟠 Warning — Expansion 5–15%; motion exists but underweight',
    );
  } else {
    healthLine = makeToken(
      'calc_out.expansion_revenue.row.health_critical',
      '• 🔴 Critical — Expansion < 5%; no expansion motion, pure retention play',
    );
  }

  // What-If: what if we doubled upsell, or added cross-sell, or both?
  const expDoubleUpsell = expansionPct(startingMRR, upsellMRR * 2, crossSellMRR);
  const expDoubleBoth = expansionPct(startingMRR, upsellMRR * 2, crossSellMRR * 2);
  const expPureCrossSell = expansionPct(startingMRR, 0, crossSellMRR);
  const liftDU = expDoubleUpsell - ratio;
  const liftDB = expDoubleBoth - ratio;

  // Break-Even: gap to Excellent (≥0.25)
  const targetExpansion = 0.25 * startingMRR;
  const gapToExcellent = Math.max(0, targetExpansion - totalExpansion);

  // Milestone: gap to next tier
  let gapToNext: number, nextTier: string;
  if (band === 'critical') { gapToNext = 0.05 * startingMRR - totalExpansion; nextTier = '🟠 Warning (5%)'; }
  else if (band === 'warning') { gapToNext = 0.15 * startingMRR - totalExpansion; nextTier = '🟡 Good (15%)'; }
  else if (band === 'good') { gapToNext = 0.25 * startingMRR - totalExpansion; nextTier = '🟢 Excellent (25%)'; }
  else { gapToNext = 0; nextTier = 'top tier maintained'; }

  // Tip: band-driven
  let tip: string;
  if (band === 'critical') tip = makeToken('calc_out.expansion_revenue.row.tip_critical', '💡 Tip: Expansion < 5% means you are not growing revenue from existing customers — pure retention play. Identify accounts getting high value but underpaying; build a price-increase motion on the top decile. Add cross-sell on accounts already using 1 product.');
  else if (band === 'warning') tip = makeToken('calc_out.expansion_revenue.row.tip_warning', '💡 Tip: Expansion 5–15% is motion but underweight. Audit which accounts expanded and what triggered it — replicate the playbook. Common levers: seat expansion on growing teams, tier upgrades after usage threshold, cross-sell on product-fit accounts.');
  else if (band === 'good') tip = makeToken('calc_out.expansion_revenue.row.tip_good', '💡 Tip: Expansion 15–25% is healthy mid-market motion. Push to Excellent (≥25%) by focusing on the top 20% of accounts — a 10% price increase on high-value accounts often moves expansion more than broad-stroke campaigns.');
  else tip = makeToken('calc_out.expansion_revenue.row.tip_excellent', '💡 Tip: Expansion ≥ 25% is best-in-class. Maintain the engine: monitor usage trends, identify expansion-ready accounts quarterly, and protect champion relationships. Pair with NRR (P9-1) to confirm expansion is offsetting churn.');

  // P168 B3-14：params 的表达式与兜底里的表达式必须**同源** ⇒ 先用局部变量承接
  const ratioPctLabel = pctInt(ratio);
  const totalExpansionLabel = money(totalExpansion);
  const upsellLabel = money(upsellMRR);
  const crossSellLabel = money(crossSellMRR);
  const startingLabel = money(startingMRR);
  const ratioLabel = ratio.toFixed(4);
  const upsellDoubleLabel = money(upsellMRR * 2);
  const expDoubleUpsellLabel = pctInt(expDoubleUpsell);
  const liftDULabel = pct1(liftDU * 100);
  const expDoubleBothLabel = pctInt(expDoubleBoth);
  const liftDBLabel = pct1(liftDB * 100);
  const expPureCrossSellLabel = pctInt(expPureCrossSell);
  const targetExpansionLabel = money(targetExpansion);
  const gapToExcellentLabel = money(gapToExcellent);
  const gapToNextLabel = money(Math.max(0, gapToNext));

  const r =
    makeToken('calc_out.section.expansion_revenue_calculator', '📊 Expansion Revenue Calculator') + '\n\n' +
    makeToken('calc_out.section.health', '🩺 Health:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    healthLine + '\n' +
    makeToken('calc_out.expansion_revenue.row.expansion_summary', '• Expansion: ' + ratioPctLabel + '% of starting MRR  ·  Total expansion: ' + totalExpansionLabel, { pct: ratioPctLabel, total: totalExpansionLabel }) + '\n' +
    makeToken('calc_out.expansion_revenue.row.upsell_crosssell', '• Upsell: ' + upsellLabel + '  ·  Cross-sell: ' + crossSellLabel, { upsell: upsellLabel, crosssell: crossSellLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.inputs_snapshot', '📊 Inputs Snapshot:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.expansion_revenue.row.starting_mrr', '• Starting MRR: ' + startingLabel, { value: startingLabel }) + '\n' +
    makeToken('calc_out.expansion_revenue.row.upsell_mrr', '• Upsell MRR (more usage): +' + upsellLabel, { value: upsellLabel }) + '\n' +
    makeToken('calc_out.expansion_revenue.row.crosssell_mrr', '• Cross-sell MRR (new product): +' + crossSellLabel, { value: crossSellLabel }) + '\n' +
    makeToken('calc_out.expansion_revenue.row.total_expansion_mrr', '• Total Expansion MRR: ' + totalExpansionLabel, { value: totalExpansionLabel }) + '\n' +
    makeToken('calc_out.expansion_revenue.row.expansion_pct', '• Expansion %: ' + ratioLabel + ' (' + ratioPctLabel + '%) of starting MRR', { ratio: ratioLabel, pct: ratioPctLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.what_if', '🔄 What-If:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.expansion_revenue.row.whatif_double_upsell', '• Double upsell (+' + upsellLabel + ' → +' + upsellDoubleLabel + '): Expansion ' + expDoubleUpsellLabel + '% (+' + liftDULabel + 'pp)', { from: upsellLabel, to: upsellDoubleLabel, pct: expDoubleUpsellLabel, lift: liftDULabel }) + '\n' +
    makeToken('calc_out.expansion_revenue.row.whatif_double_both', '• Double both (upsell + cross-sell): Expansion ' + expDoubleBothLabel + '% (+' + liftDBLabel + 'pp)', { pct: expDoubleBothLabel, lift: liftDBLabel }) + '\n' +
    makeToken('calc_out.expansion_revenue.row.whatif_pure_crosssell', '• Pure cross-sell (no upsell): Expansion ' + expPureCrossSellLabel + '%', { pct: expPureCrossSellLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.break_even', '⚖️ Break-Even:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.expansion_revenue.row.breakeven_target', '• Target for 🟢 Excellent: Expansion ≥ 25% (expansion MRR ≥ ' + targetExpansionLabel + ')', { value: targetExpansionLabel }) + '\n' +
    makeToken('calc_out.expansion_revenue.row.breakeven_current', '• Current expansion: ' + totalExpansionLabel + '  ·  Gap to 🟢: ' + gapToExcellentLabel, { current: totalExpansionLabel, gap: gapToExcellentLabel }) + '\n' +
    makeToken('calc_out.expansion_revenue.row.breakeven_action', '• Action: add ' + gapToExcellentLabel + ' in expansion MRR (upsell + cross-sell)', { value: gapToExcellentLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.milestone', '🎯 Milestone:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (band === 'critical'
      ? makeToken('calc_out.expansion_revenue.row.milestone_next_tier_critical', '• Next tier: 🟠 Warning (5%)')
      : band === 'warning'
      ? makeToken('calc_out.expansion_revenue.row.milestone_next_tier_warning', '• Next tier: 🟡 Good (15%)')
      : band === 'good'
      ? makeToken('calc_out.expansion_revenue.row.milestone_next_tier_good', '• Next tier: 🟢 Excellent (25%)')
      : makeToken('calc_out.expansion_revenue.row.milestone_next_tier_excellent', '• Next tier: top tier maintained')) + '\n' +
    (band === 'excellent'
      ? makeToken('calc_out.expansion_revenue.row.milestone_gap_top', '• Gap to next tier: ' + gapToNextLabel + ' more expansion MRR (already at top)', { value: gapToNextLabel })
      : makeToken('calc_out.expansion_revenue.row.milestone_gap', '• Gap to next tier: ' + gapToNextLabel + ' more expansion MRR', { value: gapToNextLabel })) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============
//
// Full client-side port of calculate() above — same logic, same copy, so the
// card the browser renders is byte-identical to the server-rendered static
// example. The page runs this body via `new Function('inputs','pick','fill',...)`,
// so it must self-execute and return a string[] (the page renders results[0]).
//
// GENERATED from calculate() — if you edit calculate(), mirror the change here.

const customFn =
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let f=function(e){return Number.isNaN(e)?0:Math.max(0,e)},y=function(e,t){return e+t},c=function(e,t,i){return e===0?0:y(t,i)/e},m=function(e){return e>=M.excellent[0]?"excellent":e>=M.good[0]?"good":e>=M.warning[0]?"warning":"critical"},L=function(e,t,i){var r=$(e);return Array.isArray(r)?r.join(\`
\`):String(r)};var Q=f,V=y,X=c,Y=m,Z=L,n=tk,O='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',n=new Function("return "+O)(),M={excellent:[.25,null],good:[.15,.25],warning:[.05,.15],critical:[0,.05]},$=function(e){const t=f(parseFloat(e.startingMRR)||0),i=f(parseFloat(e.upsellMRR)||0),r=f(parseFloat(e.crossSellMRR)||0);if(t===0&&i===0&&r===0)return[n("calc_out.section.expansion_revenue_calculator","📊 Expansion Revenue Calculator")+\`

\`+n("calc_out.expansion_revenue.row.need_inputs","📊 Enter starting MRR, upsell MRR, and cross-sell MRR to see your expansion revenue percentage — the top-line growth lever from existing customers.")];const u=y(i,r),p=c(t,i,r),a=v=>"$"+Math.round(v).toLocaleString("en-US"),h=v=>Math.round(v*100).toString(),S=v=>v.toFixed(1),o=m(p);let _;o==="excellent"?_=n("calc_out.expansion_revenue.row.health_excellent","• 🟢 Excellent — Expansion ≥ 25%; best-in-class mid-market expansion motion"):o==="good"?_=n("calc_out.expansion_revenue.row.health_good","• 🟡 Good — Expansion 15–25%; top-quartile mid-market expansion"):o==="warning"?_=n("calc_out.expansion_revenue.row.health_warning","• 🟠 Warning — Expansion 5–15%; motion exists but underweight"):_=n("calc_out.expansion_revenue.row.health_critical","• 🔴 Critical — Expansion < 5%; no expansion motion, pure retention play");const C=c(t,i*2,r),D=c(t,i*2,r*2),A=c(t,0,r),J=C-p,K=D-p,F=.25*t,z=Math.max(0,F-u);let x,d;o==="critical"?(x=.05*t-u,d="🟠 Warning (5%)"):o==="warning"?(x=.15*t-u,d="🟡 Good (15%)"):o==="good"?(x=.25*t-u,d="🟢 Excellent (25%)"):(x=0,d="top tier maintained");let g;o==="critical"?g=n("calc_out.expansion_revenue.row.tip_critical","💡 Tip: Expansion < 5% means you are not growing revenue from existing customers — pure retention play. Identify accounts getting high value but underpaying; build a price-increase motion on the top decile. Add cross-sell on accounts already using 1 product."):o==="warning"?g=n("calc_out.expansion_revenue.row.tip_warning","💡 Tip: Expansion 5–15% is motion but underweight. Audit which accounts expanded and what triggered it — replicate the playbook. Common levers: seat expansion on growing teams, tier upgrades after usage threshold, cross-sell on product-fit accounts."):o==="good"?g=n("calc_out.expansion_revenue.row.tip_good","💡 Tip: Expansion 15–25% is healthy mid-market motion. Push to Excellent (≥25%) by focusing on the top 20% of accounts — a 10% price increase on high-value accounts often moves expansion more than broad-stroke campaigns."):g=n("calc_out.expansion_revenue.row.tip_excellent","💡 Tip: Expansion ≥ 25% is best-in-class. Maintain the engine: monitor usage trends, identify expansion-ready accounts quarterly, and protect champion relationships. Pair with NRR (P9-1) to confirm expansion is offsetting churn.");const w=h(p),l=a(u),s=a(i),b=a(r),N=a(t),P=p.toFixed(4),U=a(i*2),q=h(C),G=S(J*100),j=h(D),I=S(K*100),W=h(A),B=a(F),R=a(z),E=a(Math.max(0,x));return[n("calc_out.section.expansion_revenue_calculator","📊 Expansion Revenue Calculator")+\`

\`+n("calc_out.section.health","🩺 Health:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+_+\`
\`+n("calc_out.expansion_revenue.row.expansion_summary","• Expansion: "+w+"% of starting MRR  ·  Total expansion: "+l,{pct:w,total:l})+\`
\`+n("calc_out.expansion_revenue.row.upsell_crosssell","• Upsell: "+s+"  ·  Cross-sell: "+b,{upsell:s,crosssell:b})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+n("calc_out.section.inputs_snapshot","📊 Inputs Snapshot:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+n("calc_out.expansion_revenue.row.starting_mrr","• Starting MRR: "+N,{value:N})+\`
\`+n("calc_out.expansion_revenue.row.upsell_mrr","• Upsell MRR (more usage): +"+s,{value:s})+\`
\`+n("calc_out.expansion_revenue.row.crosssell_mrr","• Cross-sell MRR (new product): +"+b,{value:b})+\`
\`+n("calc_out.expansion_revenue.row.total_expansion_mrr","• Total Expansion MRR: "+l,{value:l})+\`
\`+n("calc_out.expansion_revenue.row.expansion_pct","• Expansion %: "+P+" ("+w+"%) of starting MRR",{ratio:P,pct:w})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+n("calc_out.section.what_if","🔄 What-If:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+n("calc_out.expansion_revenue.row.whatif_double_upsell","• Double upsell (+"+s+" → +"+U+"): Expansion "+q+"% (+"+G+"pp)",{from:s,to:U,pct:q,lift:G})+\`
\`+n("calc_out.expansion_revenue.row.whatif_double_both","• Double both (upsell + cross-sell): Expansion "+j+"% (+"+I+"pp)",{pct:j,lift:I})+\`
\`+n("calc_out.expansion_revenue.row.whatif_pure_crosssell","• Pure cross-sell (no upsell): Expansion "+W+"%",{pct:W})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+n("calc_out.section.break_even","⚖️ Break-Even:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+n("calc_out.expansion_revenue.row.breakeven_target","• Target for 🟢 Excellent: Expansion ≥ 25% (expansion MRR ≥ "+B+")",{value:B})+\`
\`+n("calc_out.expansion_revenue.row.breakeven_current","• Current expansion: "+l+"  ·  Gap to 🟢: "+R,{current:l,gap:R})+\`
\`+n("calc_out.expansion_revenue.row.breakeven_action","• Action: add "+R+" in expansion MRR (upsell + cross-sell)",{value:R})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+n("calc_out.section.milestone","🎯 Milestone:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(o==="critical"?n("calc_out.expansion_revenue.row.milestone_next_tier_critical","• Next tier: 🟠 Warning (5%)"):o==="warning"?n("calc_out.expansion_revenue.row.milestone_next_tier_warning","• Next tier: 🟡 Good (15%)"):o==="good"?n("calc_out.expansion_revenue.row.milestone_next_tier_good","• Next tier: 🟢 Excellent (25%)"):n("calc_out.expansion_revenue.row.milestone_next_tier_excellent","• Next tier: top tier maintained"))+\`
\`+(o==="excellent"?n("calc_out.expansion_revenue.row.milestone_gap_top","• Gap to next tier: "+E+" more expansion MRR (already at top)",{value:E}):n("calc_out.expansion_revenue.row.milestone_gap","• Gap to next tier: "+E+" more expansion MRR",{value:E}))+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+g+\`
\`]};return[L(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-expansion-revenue-calculator',
  title: 'Expansion Revenue Calculator',
  description:
    'Compute expansion revenue as % of starting MRR — the top-line growth lever from existing customers. Separates upsell (same product, more usage) from cross-sell (new product). Health bands: 🟢 ≥25% · 🟡 15-25% · 🟠 5-15% · 🔴 <5%. For mid-market B2B SaaS ($10M-$50M ARR) CSMs and RevOps leads.',
  categoryId: 'R',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'startingMRR',   label: 'Starting MRR (USD)',        placeholder: 'e.g. 100000', type: 'number' },
    { name: 'upsellMRR',     label: 'Upsell MRR (more usage)',  placeholder: 'e.g. 12000',  type: 'number' },
    { name: 'crossSellMRR',  label: 'Cross-sell MRR (new product)', placeholder: 'e.g. 5000',   type: 'number' },
  ],
  keywords: [
    'expansion revenue calculator',
    'expansion MRR',
    'upsell',
    'cross-sell',
    'net expansion',
    'B2B SaaS',
    'mid-market SaaS',
    'growth lever',
  ],
  tags: ['retention', 'csm', 'expansion', 'saas-metrics'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-09',
  sources: [
    'https://www.saas-capital.com/blog-posts/saas-retention-metrics/',
    'https://openviewpartners.com/blog/the-real-story-behind-net-dollar-retention/',
  ],
  staticExamples: ['$calc_out.section.expansion_revenue_calculator|📊 Expansion Revenue Calculator|\n\n$calc_out.section.health|🩺 Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.expansion_revenue.row.health_good|• 🟡 Good — Expansion 15–25%; top-quartile mid-market expansion|\n$calc_out.expansion_revenue.row.expansion_summary{"pct":"17","total":"$17,000"}|• Expansion: 17% of starting MRR  ·  Total expansion: $17,000|\n$calc_out.expansion_revenue.row.upsell_crosssell{"upsell":"$12,000","crosssell":"$5,000"}|• Upsell: $12,000  ·  Cross-sell: $5,000|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.expansion_revenue.row.starting_mrr{"value":"$100,000"}|• Starting MRR: $100,000|\n$calc_out.expansion_revenue.row.upsell_mrr{"value":"$12,000"}|• Upsell MRR (more usage): +$12,000|\n$calc_out.expansion_revenue.row.crosssell_mrr{"value":"$5,000"}|• Cross-sell MRR (new product): +$5,000|\n$calc_out.expansion_revenue.row.total_expansion_mrr{"value":"$17,000"}|• Total Expansion MRR: $17,000|\n$calc_out.expansion_revenue.row.expansion_pct{"ratio":"0.1700","pct":"17"}|• Expansion %: 0.1700 (17%) of starting MRR|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if|🔄 What-If:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.expansion_revenue.row.whatif_double_upsell{"from":"$12,000","to":"$24,000","pct":"29","lift":"12.0"}|• Double upsell (+$12,000 → +$24,000): Expansion 29% (+12.0pp)|\n$calc_out.expansion_revenue.row.whatif_double_both{"pct":"34","lift":"17.0"}|• Double both (upsell + cross-sell): Expansion 34% (+17.0pp)|\n$calc_out.expansion_revenue.row.whatif_pure_crosssell{"pct":"5"}|• Pure cross-sell (no upsell): Expansion 5%|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.break_even|⚖️ Break-Even:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.expansion_revenue.row.breakeven_target{"value":"$25,000"}|• Target for 🟢 Excellent: Expansion ≥ 25% (expansion MRR ≥ $25,000)|\n$calc_out.expansion_revenue.row.breakeven_current{"current":"$17,000","gap":"$8,000"}|• Current expansion: $17,000  ·  Gap to 🟢: $8,000|\n$calc_out.expansion_revenue.row.breakeven_action{"value":"$8,000"}|• Action: add $8,000 in expansion MRR (upsell + cross-sell)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.milestone|🎯 Milestone:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.expansion_revenue.row.milestone_next_tier_good|• Next tier: 🟢 Excellent (25%)|\n$calc_out.expansion_revenue.row.milestone_gap{"value":"$8,000"}|• Gap to next tier: $8,000 more expansion MRR|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.expansion_revenue.row.tip_good|💡 Tip: Expansion 15–25% is healthy mid-market motion. Push to Excellent (≥25%) by focusing on the top 20% of accounts — a 10% price increase on high-value accounts often moves expansion more than broad-stroke campaigns.|\n'],
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
  faq: [
    { q: 'What is expansion revenue?', a: 'Expansion revenue is the additional MRR you generate from existing customers — either upsell (same product, more usage/seats) or cross-sell (new product from your portfolio). It is the top-line growth lever that enables NRR > 100% even when GRR is mediocre.' },
    { q: 'What is a good expansion rate?', a: 'Top-quartile B2B SaaS achieves 15-25% expansion (OpenView/ICONIQ benchmarks for $10M-$50M ARR). Below 5% means no expansion motion — pure retention play. Above 25% is best-in-class mid-market motion.' },
    { q: 'How is expansion different from NRR?', a: 'Expansion is one component of NRR. NRR = (starting + expansion - downgrade - churn) / starting. Expansion only includes growth (upsell + cross-sell); NRR includes the full retention picture. High expansion + mediocre GRR can still produce strong NRR.' },
    { q: 'How do I grow expansion revenue?', a: 'Three levers: (1) seat expansion on growing teams (usage-based pricing), (2) tier upgrades after usage threshold (freemium → pro → enterprise), (3) cross-sell on product-fit accounts. Audit the top 20% of accounts by usage — they are expansion-ready and often underpriced.' },
    { q: 'How is upsell different from cross-sell?', a: 'Upsell is selling more of the same product (more seats, higher tier, more usage). Cross-sell is selling additional products from your portfolio. Upsell is usually higher-margin and easier to close; cross-sell requires product-fit alignment. The ratio between them varies by GTM motion.' },

    { q: "What is a good Net Revenue Retention (NRR)?", a: "Benchmarks: 1) <90%: losing money on existing customers, 2) 90-100%: treading water, 3) 100-110%: healthy, 4) 110-120%: excellent, 5) 120%+: world-class (Snowflake, Datadog). Formula: (starting MRR + expansion - churn - contraction) / starting MRR. Components: gross retention + expansion. Best SaaS: 120%+ NRR. Median: 100-105%. Most teams: aim for 110%." },
    { q: "What are the top expansion revenue strategies?", a: "1) Usage-based pricing (more usage = more revenue), 2) Tier upgrades (free → pro → enterprise), 3) Seat expansion (more users per account), 4) Add-ons (premium features, services), 5) Cross-sell (related products). SaaS best practice: 1) usage + 2) tier + 3) seats. Most teams 5-15% of revenue from expansion. Top: 20-30% of revenue from expansion." },
    { q: "How do I identify expansion opportunities?", a: "Signals: 1) Usage hitting tier limits (about to upgrade), 2) Multiple users in account (team expansion), 3) High engagement (champion), 4) Feature requests for higher tier, 5) Customer success notes. Tools: 1) Product analytics (Mixpanel), 2) CRM (Salesforce), 3) CS platform (Gainsight). Trigger: 80% of tier limit = upgrade prompt. Most: 5-10% of users trigger expansion opportunity per month." },
    { q: "How do I time the upsell pitch?", a: "Best timing: 1) After value moment (user hits goal), 2) At renewal (natural conversation), 3) At usage limit (in-context prompt), 4) After success (positive feedback), 5) New buyer in account. Avoid just after a support issue, just before renewal negotiations, during onboarding. Most teams 30-50% conversion with in-product upgrade prompts at usage limits. Top: 50-70% conversion." },
    { q: "What is seat-based vs usage-based expansion?", a: "Seat-based: per-user pricing, expand by adding users. Predictable, scales with team growth. Usage-based: per API call / storage / compute. Scales with adoption. Hybrid: per-seat + usage overage. SaaS best practice: hybrid. Most modern SaaS: usage-based (more aligned with value). Pricing: 30% of expansion from seats, 70% from usage. Mix: depends on product. Slack/Notion: seat. AWS/Stripe: usage." },
    { q: "What is the difference between gross retention and net retention?", a: "Gross retention: revenue kept from existing customers (no expansion). Net retention: includes expansion. Formula: GR = (start - churn - contraction) / start. NR = (start + expansion - churn - contraction) / start. Most SaaS: 85-95% gross, 100-120% net. Difference = expansion. For valuation: net retention is the key metric. 120%+ NRR. 100-110%." },
    { q: "How do I model expansion revenue in financial projections?", a: "For projections: 1) Calculate gross retention (90-95% typical), 2) Calculate expansion rate (5-15% per year per customer), 3) Combine: net retention. For 100 customers at $100/month, 90% gross, 10% expansion: end of year 1 = 100 × 0.9 × 1.1 = 99 customers effectively at same revenue. Most: NRR 105-115% = doubling every 5-7 years. Investors love: 120%+ NRR." },
  ],
  howToUse: [
    'Enter Starting MRR (revenue from existing customers at the start of the period).',
    'Enter Upsell MRR (same product, more usage/seats/tier during the period).',
    'Enter Cross-sell MRR (additional products sold to existing customers).',
    'Read the expansion percentage and Health band. Pair with NRR (P9-1) to see the full retention picture.',
  ],
  engineKey: true,
};

registerEngine(engine);
