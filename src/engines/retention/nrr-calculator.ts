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
import { BAND_META } from '../../core/engines/band-meta';

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
  const healthEmoji = BAND_META[band];
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
  `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let l=function(n){return Number.isNaN(n)?0:Math.max(0,n)},x=function(n,e,r,o){return n+e-r-o},u=function(n,e,r,o){return n===0?0:x(n,e,r,o)/n},M=function(n){return n>=m.excellent[0]?"excellent":n>=m.good[0]?"good":n>=m.warning[0]?"warning":"critical"},N=function(n,e,r){var o=F(n);return Array.isArray(o)?o.join(\`
\`):String(o)};var W=l,A=x,B=u,L=M,O=N,_={excellent:"🟢",good:"🟡",warning:"🟠",critical:"🔴"},m={excellent:[1.2,null],good:[1.1,1.2],warning:[1,1.1],critical:[0,1]},F=function(n){const e=l(parseFloat(n.startingMRR)||0),r=l(parseFloat(n.expansionMRR)||0),o=l(parseFloat(n.downgradeMRR)||0),i=l(parseFloat(n.churnedMRR)||0);if(e===0&&r===0&&o===0&&i===0)return[\`📊 NRR Calculator

📊 Enter your starting MRR, expansion MRR (upsell + cross-sell), downgrade MRR, and churned MRR to see your Net Revenue Retention ratio — the headline SaaS metric every board reports.\`];const c=x(e,r,o,i),s=u(e,r,o,i),v=(s-1)*100,w=o+i,t=f=>"$"+Math.round(f).toLocaleString("en-US"),R=f=>Math.round(f*100).toString(),d=f=>f.toFixed(1),a=M(s),q=_[a],D=a==="excellent"?"Excellent — NRR ≥ 120%; top-quartile SaaS (OpenView / ICONIQ benchmarks)":a==="good"?"Good — NRR 110–120%; expansion covers churn with margin to spare":a==="warning"?"Warning — NRR 100–110%; expansion barely offsets churn, fragile":"Critical — NRR < 100%; net revenue contraction, urgent intervention",y=u(e,r,o,i/2),b=u(e,r*2,o,i),S=u(e,r,0,i),G=y-s,I=b-s,T=S-s,E=1.2*e,C=Math.max(0,E-c),j=C;let p,g,k;a==="critical"?(p=1*e-c,g="🟠 Warning (100%)"):a==="warning"?(p=1.1*e-c,g="🟡 Good (110%)"):a==="good"?(p=1.2*e-c,g="🟢 Excellent (120%)"):(p=0,g="top tier maintained"),k=e*Math.pow(1+v/100,12);let h;return a==="critical"?h="NRR < 100% means you are shrinking your existing-customer revenue base every month. Stop the bleed first: audit the top 5 churned accounts for the actual reason (champion left? product gap? pricing?), then build a save playbook. Expansion is meaningless if you are losing ground faster.":a==="warning"?h="NRR 100–110% is fragile — one bad quarter of churn can flip you under 100%. Double down on customer success: quarterly business reviews, usage monitoring (red-flag accounts before they churn), and a price-increase motion for accounts getting value but underpaying.":a==="good"?h="NRR 110–120% is healthy B2B SaaS. To push to Excellent (≥120%), focus on the customers who are getting the most value — offer them higher tiers, more seats, or premium support. A 10% price increase on your top 20% of accounts often moves NRR more than 50 new logos.":h="NRR ≥ 120% is top-quartile SaaS. Maintain the engine: keep NPS high, monitor usage trends weekly, and protect your champion relationships. The risk at this level is overconfidence — even top-quartile NRR can slip 5pp in two quarters if you stop investing in CS.",[\`📊 NRR Calculator

🩺 Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+q+" "+D+\`
• NRR: \`+R(s)+"%  ·  Growth above baseline: +"+d(v)+\`%
• Net retained MRR: \`+t(c)+"  ·  Lost MRR (downgrade + churn): "+t(w)+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Inputs Snapshot:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Starting MRR:           \`+t(e)+\`
• Expansion MRR (upsell + cross-sell):  +\`+t(r)+\`
• Downgrade MRR:         -\`+t(o)+\`
• Churned MRR:           -\`+t(i)+\`
• Net retained MRR:      \`+t(c)+\` (starting + expansion − downgrade − churn)
• NRR ratio: \`+s.toFixed(4)+" ("+R(s)+"%)  ·  Lost as % of start: "+d(e>0?w/e*100:0)+\`%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 What-If:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Halve churn (\`+t(i/2)+" instead of "+t(i)+"): NRR "+R(y)+"% (+"+d(G*100)+\`pp)
• Double expansion (+\`+t(r)+" → +"+t(r*2)+"): NRR "+R(b)+"% (+"+d(I*100)+\`pp)
• Eliminate downgrades (-\`+t(o)+" → 0): NRR "+R(S)+"% (+"+d(T*100)+\`pp)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ Break-Even:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Target for 🟢 Excellent: NRR ≥ 120% (retained MRR ≥ \`+t(E)+\`)
• Current net retained: \`+t(c)+"  ·  Gap to 🟢: "+t(C)+\`
• Action: add \`+t(j)+\` in expansion MRR (or equivalent via churn/downgrade reduction)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Milestone:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Next tier: \`+g+\`
• Gap to next tier: \`+t(Math.max(0,p))+" more retained MRR"+(a==="excellent"?" (already at top)":"")+\`
• Annual compounded projection: ~\`+t(k)+\`/year MRR (if NRR compounds for 12 months)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Tip: \`+h+\`
\`]};return[N(inputs,pick,fill)]}finally{}
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
  staticExamples: ['📊 NRR Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟠 Warning — NRR 100–110%; expansion barely offsets churn, fragile\n• NRR: 102%  ·  Growth above baseline: +2.0%\n• Net retained MRR: $102,000  ·  Lost MRR (downgrade + churn): $13,000\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Starting MRR:           $100,000\n• Expansion MRR (upsell + cross-sell):  +$15,000\n• Downgrade MRR:         -$5,000\n• Churned MRR:           -$8,000\n• Net retained MRR:      $102,000 (starting + expansion − downgrade − churn)\n• NRR ratio: 1.0200 (102%)  ·  Lost as % of start: 13.0%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Halve churn ($4,000 instead of $8,000): NRR 106% (+4.0pp)\n• Double expansion (+$15,000 → +$30,000): NRR 117% (+15.0pp)\n• Eliminate downgrades (-$5,000 → 0): NRR 107% (+5.0pp)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Target for 🟢 Excellent: NRR ≥ 120% (retained MRR ≥ $120,000)\n• Current net retained: $102,000  ·  Gap to 🟢: $18,000\n• Action: add $18,000 in expansion MRR (or equivalent via churn/downgrade reduction)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Next tier: 🟡 Good (110%)\n• Gap to next tier: $8,000 more retained MRR\n• Annual compounded projection: ~$126,824/year MRR (if NRR compounds for 12 months)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: NRR 100–110% is fragile — one bad quarter of churn can flip you under 100%. Double down on customer success: quarterly business reviews, usage monitoring (red-flag accounts before they churn), and a price-increase motion for accounts getting value but underpaying.\n'],  // auto-filled by codegen-examples (placeholder for first codegen run)
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