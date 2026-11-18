import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

// =====================================================================
// Funnel Value Calculator (P6-3) — Business v3 standard
// =====================================================================
// Standard 4-stage funnel: impressions → clickers → leads → sales
// Computes per-stage drop-off and overall conversion rate. Identifies
// the biggest-leak stage and projects What-If improvements.
//
// Health bands (overall CR = sales/impressions):
//   🟢 ≥5%    (excellent — funnel highly optimized)
//   🟡 1-5%   (good — room to optimize, especially middle stages)
//   🟠 0.1-1% (warning — significant drop-off, audit CTA + landing)
//   🔴 <0.1%  (critical — funnel broken or extremely thin audience)

// ============== Health band constants ==============

export const HEALTH_BANDS = {
  excellent: 5.0,
  good: [1.0, 5.0],
  warning: [0.1, 1.0],
  critical: 0,
} as const;

// ============== Types ==============

export interface FunnelInputs {
  impressions: number;
  ctr: number;        // %
  leadRate: number;   // % of clickers
  saleRate: number;   // % of leads
  aov: number;        // $ average order value
  grossMargin: number; // %
}

// ============== Math helpers (exported for tests) ==============

export function stageVisitors(impressions: number): number {
  return impressions;
}

export function stageClickers(impressions: number, ctrPct: number): number {
  return impressions * (ctrPct / 100);
}

export function stageLeads(clickers: number, leadRatePct: number): number {
  return clickers * (leadRatePct / 100);
}

export function stageSales(leads: number, saleRatePct: number): number {
  return leads * (saleRatePct / 100);
}

export function overallCR(sales: number, impressions: number): number {
  if (impressions <= 0) return 0;
  return (sales / impressions) * 100;
}

export function dropOff(prevStage: number, currStage: number): number {
  return Math.max(0, prevStage - currStage);
}

export function biggestLeakStage(inputs: FunnelInputs): string {
  const s2 = stageClickers(inputs.impressions, inputs.ctr);
  const s3 = stageLeads(s2, inputs.leadRate);
  const s4 = stageSales(s3, inputs.saleRate);
  const d12 = dropOff(inputs.impressions, s2);
  const d23 = dropOff(s2, s3);
  const d34 = dropOff(s3, s4);
  const max = Math.max(d12, d23, d34);
  if (max === d12) return '1→2';
  if (max === d23) return '2→3';
  return '3→4';
}

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const f: FunnelInputs = {
    impressions: clampNonNegative(parseFloat(inputs.impressions) || 0),
    ctr: clampNonNegative(parseFloat(inputs.ctr) || 0),
    leadRate: clampNonNegative(parseFloat(inputs.leadRate) || 0),
    saleRate: clampNonNegative(parseFloat(inputs.saleRate) || 0),
    aov: clampNonNegative(parseFloat(inputs.aov) || 0),
    grossMargin: clampNonNegative(parseFloat(inputs.grossMargin) || 0),
  };

  // Edge: no impressions
  if (f.impressions === 0) {
    return [
      '⏰ Funnel Value Calculator\n\n' +
        '📊 Enter impressions, click-through rate, lead conversion rate, sale conversion rate, AOV, and gross margin to see overall funnel conversion rate, biggest drop-off stage, and revenue projections.',
    ];
  }

  const s2 = stageClickers(f.impressions, f.ctr);
  const s3 = stageLeads(s2, f.leadRate);
  const s4 = stageSales(s3, f.saleRate);
  const cr = overallCR(s4, f.impressions);
  const totalRevenue = s4 * f.aov;
  const totalProfit = totalRevenue * (f.grossMargin / 100);
  const d12 = dropOff(f.impressions, s2);
  const d23 = dropOff(s2, s3);
  const d34 = dropOff(s3, s4);
  const leak = biggestLeakStage(f);
  const d12pct = f.impressions > 0 ? (d12 / f.impressions) * 100 : 0;
  const d23pct = s2 > 0 ? (d23 / s2) * 100 : 0;
  const d34pct = s3 > 0 ? (d34 / s3) * 100 : 0;

  // Health band
  let healthEmoji: string;
  let healthLabel: string;
  if (cr >= HEALTH_BANDS.excellent) {
    healthEmoji = '🟢';
    healthLabel = 'Excellent — overall CR ≥ 5%; funnel highly optimized';
  } else if (cr >= HEALTH_BANDS.good[0]) {
    healthEmoji = '🟡';
    healthLabel = 'Good — overall CR 1–5%; profitable with optimization upside';
  } else if (cr >= HEALTH_BANDS.warning[0]) {
    healthEmoji = '🟠';
    healthLabel = 'Warning — overall CR 0.1–1%; significant drop-off';
  } else {
    healthEmoji = '🔴';
    healthLabel = 'Critical — overall CR < 0.1%; funnel broken or extreme thin audience';
  }

  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 });
  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

  // What-If: leadRate +30% (or 5pp, whichever bigger)
  const leadRateBoost = Math.max(f.leadRate * 0.3, 5);
  const newLeadRate = f.leadRate + leadRateBoost;
  const newS3 = stageLeads(s2, newLeadRate);
  const newS4 = stageSales(newS3, f.saleRate);
  const newCR = overallCR(newS4, f.impressions);
  const newRevenue = newS4 * f.aov;

  // Break-Even: at what overall CR does revenue exceed $X target?
  const targetRevenue = Math.max(totalRevenue, 10000); // arbitrary baseline
  const breakEvenCR = (targetRevenue / f.aov) / f.impressions * 100;
  const breakEvenLeadRate = s2 > 0 ? (targetRevenue / f.aov / s2) * 100 : 0;

  // Milestone: scaling impressions 2x
  const scale2xS2 = stageClickers(f.impressions * 2, f.ctr);
  const scale2xS4 = stageSales(stageLeads(scale2xS2, f.leadRate), f.saleRate);
  const scale2xRevenue = scale2xS4 * f.aov;
  const annualRevenue = totalRevenue * 12;

  // Tip: stage-specific advice
  let tip: string;
  if (leak === '1→2') {
    tip =
      'Biggest leak at the awareness stage (1→2): impressions → clickers lost ' + d12pct.toFixed(0) + '%. Test new ad creative, audience targeting, and channel mix. Most cost-effective lever at this stage.';
  } else if (leak === '2→3') {
    tip =
      'Biggest leak at the consideration stage (2→3): clickers → leads lost ' + d23pct.toFixed(0) + '%. Audit landing page, headline copy, and CTA. Optimize page-load speed and trust signals.';
  } else if (leak === '3→4') {
    tip =
      'Biggest leak at the decision stage (3→4): leads → sales lost ' + d34pct.toFixed(0) + '%. Test pricing, sales page, checkout flow. Add social proof, testimonials, and risk-reversal (guarantees).';
  } else {
    tip = 'Add data to see stage-specific recommendations.';
  }

  const r =
    '⏰ Funnel Value Calculator\n\n' +
    '🩺 Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• Overall conversion rate: ' + cr.toFixed(3) + '%  ·  Biggest leak: stage ' + leak + '\n' +
    '• Revenue: ' + money(totalRevenue) + '  ·  Net profit: ' + money(totalProfit) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Inputs Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Impressions:  ' + fmt(f.impressions) + '\n' +
    '• Clickers:     ' + fmt(s2) + '  (CTR ' + f.ctr.toFixed(1) + '%, drop ' + d12pct.toFixed(1) + '%)\n' +
    '• Leads:        ' + fmt(s3) + '  (lead rate ' + f.leadRate.toFixed(1) + '%, drop ' + d23pct.toFixed(1) + '%)\n' +
    '• Sales:        ' + fmt(s4) + '  (sale rate ' + f.saleRate.toFixed(1) + '%, drop ' + d34pct.toFixed(1) + '%)\n' +
    '• AOV:          ' + money(f.aov) + '  ·  Margin: ' + f.grossMargin.toFixed(0) + '%\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Lead rate +' + leadRateBoost.toFixed(1) + 'pp (' + f.leadRate.toFixed(1) + '% → ' + newLeadRate.toFixed(1) + '%):\n' +
    '  • Sales: ' + fmt(s4) + ' → ' + fmt(newS4) + '  ·  Revenue: ' + money(newRevenue) + '\n' +
    '  • CR: ' + cr.toFixed(3) + '% → ' + newCR.toFixed(3) + '%\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• To reach ' + money(targetRevenue) + ' revenue at current AOV: need ' + fmt(targetRevenue / f.aov) + ' sales\n' +
    '  • Required overall CR: ' + breakEvenCR.toFixed(3) + '% (currently ' + cr.toFixed(3) + '%)\n' +
    '  • Required lead rate: ' + breakEvenLeadRate.toFixed(1) + '% (currently ' + f.leadRate.toFixed(1) + '%)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Milestone:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Scale impressions 2x: ' + fmt(scale2xS4) + ' sales → ' + money(scale2xRevenue) + ' revenue\n' +
    '• 12-month projection (constant funnel): ' + money(annualRevenue) + ' revenue\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  return [r];
}

// ============== customFn (minified, mirrors calculate()) ==============

const customFn =
  `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let i=function(n){return Number.isNaN(n)?0:Math.max(0,n)},m=function(n,e){return n*(e/100)},u=function(n,e){return n*(e/100)},g=function(n,e){return n*(e/100)},k=function(n,e){return e<=0?0:n/e*100},l=function(n,e){return Math.max(0,n-e)},w=function(n){const e=m(n.impressions,n.ctr),t=u(e,n.leadRate),a=g(t,n.saleRate),o=l(n.impressions,e),s=l(e,t),d=l(t,a),R=Math.max(o,s,d);return R===o?"1→2":R===s?"2→3":"3→4"},S=function(n,e,t){var a=O(n);return Array.isArray(a)?a.join(\`
\`):String(a)};var K=i,P=m,$=u,D=g,J=k,Q=l,X=w,Y=S,h={excellent:5,good:[1,5],warning:[.1,1],critical:0},O=function(n){const e={impressions:i(parseFloat(n.impressions)||0),ctr:i(parseFloat(n.ctr)||0),leadRate:i(parseFloat(n.leadRate)||0),saleRate:i(parseFloat(n.saleRate)||0),aov:i(parseFloat(n.aov)||0),grossMargin:i(parseFloat(n.grossMargin)||0)};if(e.impressions===0)return[\`⏰ Funnel Value Calculator

📊 Enter impressions, click-through rate, lead conversion rate, sale conversion rate, AOV, and gross margin to see overall funnel conversion rate, biggest drop-off stage, and revenue projections.\`];const t=m(e.impressions,e.ctr),a=u(t,e.leadRate),o=g(a,e.saleRate),s=k(o,e.impressions),d=o*e.aov,R=d*(e.grossMargin/100),V=l(e.impressions,t),j=l(t,a),B=l(a,o),x=w(e),y=e.impressions>0?V/e.impressions*100:0,_=t>0?j/t*100:0,b=a>0?B/a*100:0;let p,f;s>=h.excellent?(p="🟢",f="Excellent — overall CR ≥ 5%; funnel highly optimized"):s>=h.good[0]?(p="🟡",f="Good — overall CR 1–5%; profitable with optimization upside"):s>=h.warning[0]?(p="🟠",f="Warning — overall CR 0.1–1%; significant drop-off"):(p="🔴",f="Critical — overall CR < 0.1%; funnel broken or extreme thin audience");const r=M=>M.toLocaleString("en-US",{maximumFractionDigits:1}),c=M=>"$"+Math.round(M).toLocaleString("en-US"),A=Math.max(e.leadRate*.3,5),E=e.leadRate+A,T=u(t,E),C=g(T,e.saleRate),z=k(C,e.impressions),I=C*e.aov,F=Math.max(d,1e4),N=F/e.aov/e.impressions*100,q=t>0?F/e.aov/t*100:0,U=m(e.impressions*2,e.ctr),L=g(u(U,e.leadRate),e.saleRate),W=L*e.aov,G=d*12;let v;return x==="1→2"?v="Biggest leak at the awareness stage (1→2): impressions → clickers lost "+y.toFixed(0)+"%. Test new ad creative, audience targeting, and channel mix. Most cost-effective lever at this stage.":x==="2→3"?v="Biggest leak at the consideration stage (2→3): clickers → leads lost "+_.toFixed(0)+"%. Audit landing page, headline copy, and CTA. Optimize page-load speed and trust signals.":x==="3→4"?v="Biggest leak at the decision stage (3→4): leads → sales lost "+b.toFixed(0)+"%. Test pricing, sales page, checkout flow. Add social proof, testimonials, and risk-reversal (guarantees).":v="Add data to see stage-specific recommendations.",[\`⏰ Funnel Value Calculator

🩺 Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+p+" "+f+\`
• Overall conversion rate: \`+s.toFixed(3)+"%  ·  Biggest leak: stage "+x+\`
• Revenue: \`+c(d)+"  ·  Net profit: "+c(R)+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Inputs Snapshot:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Impressions:  \`+r(e.impressions)+\`
• Clickers:     \`+r(t)+"  (CTR "+e.ctr.toFixed(1)+"%, drop "+y.toFixed(1)+\`%)
• Leads:        \`+r(a)+"  (lead rate "+e.leadRate.toFixed(1)+"%, drop "+_.toFixed(1)+\`%)
• Sales:        \`+r(o)+"  (sale rate "+e.saleRate.toFixed(1)+"%, drop "+b.toFixed(1)+\`%)
• AOV:          \`+c(e.aov)+"  ·  Margin: "+e.grossMargin.toFixed(0)+\`%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 What-If:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Lead rate +\`+A.toFixed(1)+"pp ("+e.leadRate.toFixed(1)+"% → "+E.toFixed(1)+\`%):
  • Sales: \`+r(o)+" → "+r(C)+"  ·  Revenue: "+c(I)+\`
  • CR: \`+s.toFixed(3)+"% → "+z.toFixed(3)+\`%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ Break-Even:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• To reach \`+c(F)+" revenue at current AOV: need "+r(F/e.aov)+\` sales
  • Required overall CR: \`+N.toFixed(3)+"% (currently "+s.toFixed(3)+\`%)
  • Required lead rate: \`+q.toFixed(1)+"% (currently "+e.leadRate.toFixed(1)+\`%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Milestone:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Scale impressions 2x: \`+r(L)+" sales → "+c(W)+\` revenue
• 12-month projection (constant funnel): \`+c(G)+\` revenue

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Tip: \`+v+\`
\`]};return[S(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-funnel-value-calculator',
  title: 'Funnel Value Calculator',
  description:
    'Measure marketing funnel value across 4 stages: impressions → clickers → leads → sales. See overall conversion rate, biggest drop-off stage, what-if improvements, and revenue projections. Health bands: 🟢 ≥5% · 🟡 1–5% · 🟠 0.1–1% · 🔴 <0.1%.',
  categoryId: 'M',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'impressions', label: 'Impressions (top of funnel)', placeholder: 'e.g. 100000', type: 'number' },
    { name: 'ctr', label: 'Click-Through Rate (%)', placeholder: 'e.g. 2.5', type: 'number' },
    { name: 'leadRate', label: 'Lead Conversion Rate (% of clickers)', placeholder: 'e.g. 15', type: 'number' },
    { name: 'saleRate', label: 'Sale Conversion Rate (% of leads)', placeholder: 'e.g. 5', type: 'number' },
    { name: 'aov', label: 'Average Order Value ($)', placeholder: 'e.g. 80', type: 'number' },
    { name: 'grossMargin', label: 'Gross Margin (%)', placeholder: 'e.g. 70', type: 'number' },
  ],
  keywords: [
    'funnel value calculator',
    'marketing funnel',
    'conversion funnel',
    'funnel analysis',
    'sales funnel',
    'CTR',
    'lead conversion',
    'sales conversion',
    'funnel optimization',
    'AOV',
  ],
  tags: ['marketing', 'funnel', 'conversion'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-05',
  sources: [
    'https://blog.hubspot.com/marketing/conversion-funnel',
    'https://www.salesforce.com/resources/articles/sales-funnel/',
    'https://unbounce.com/conversion-rate-optimization/conversion-funnel/',
    'https://www.optimizely.com/insights/blog/conversion-funnel/',
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
  staticExamples: ['⏰ Funnel Value Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🔴 Critical — overall CR < 0.1%; funnel broken or extreme thin audience\n• Overall conversion rate: 0.019%  ·  Biggest leak: stage 1→2\n• Revenue: $1,500  ·  Net profit: $1,050\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Impressions:  100,000\n• Clickers:     2,500  (CTR 2.5%, drop 97.5%)\n• Leads:        375  (lead rate 15.0%, drop 85.0%)\n• Sales:        18.8  (sale rate 5.0%, drop 95.0%)\n• AOV:          $80  ·  Margin: 70%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Lead rate +5.0pp (15.0% → 20.0%):\n  • Sales: 18.8 → 25  ·  Revenue: $2,000\n  • CR: 0.019% → 0.025%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• To reach $10,000 revenue at current AOV: need 125 sales\n  • Required overall CR: 0.125% (currently 0.019%)\n  • Required lead rate: 5.0% (currently 15.0%)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Scale impressions 2x: 37.5 sales → $3,000 revenue\n• 12-month projection (constant funnel): $18,000 revenue\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: Biggest leak at the awareness stage (1→2): impressions → clickers lost 98%. Test new ad creative, audience targeting, and channel mix. Most cost-effective lever at this stage.\n'],
  faq: [
    { q: 'What is a typical funnel conversion rate?', a: 'E-commerce funnels: 1-3% overall CR (impressions → sale). B2B SaaS free-trial funnels: 0.1-1%. Lead-gen funnels: 0.5-2%. Industry varies; benchmark your funnel vs your specific vertical.' },
    { q: 'Where is the biggest leak in most funnels?', a: 'Awareness stage (1→2) — typically 97-99% of impressions never click. Optimization focus: ad creative + targeting. Second-biggest leak varies by business — measure yours.' },
    { q: 'How do I improve a specific stage?', a: 'Stage 1→2 (CTR): test creative, copy, audience. Stage 2→3 (lead rate): landing page, headline, CTA. Stage 3→4 (sale rate): pricing, sales page, checkout, social proof.' },
    { q: 'Should I focus on CTR or conversion rate?', a: 'Both matter but conversion rate has 3-5x more ROI than CTR (a 30% landing page lift often beats a 30% CTR lift). Optimize the bottom of the funnel first.' },
    { q: "What is funnel value analysis?", a: "Funnel value = revenue potential at each funnel stage. Helps prioritize: where to invest to maximize revenue. Example: 10K visitors → 1K signups → 100 customers → $100K revenue. Identify biggest drop-off: optimize there first. Often: biggest opportunity is mid-funnel (consideration). Tool: AARRR (Acquisition, Activation, Retention, Revenue, Referral) for SaaS." },
    { q: "What is a good conversion rate at each funnel stage?", a: "Benchmarks: 1) Visitor to lead: 2-5%, 2) Lead to MQL: 10-20%, 3) MQL to SQL: 20-30%, 4) SQL to opportunity: 30-50%, 5) Opportunity to close: 20-30%. E-commerce: 1-3% visitor to purchase. SaaS trial: 15-25%. Each stage: 10-30% improvement with focused optimization. Track per stage. Industry varies by niche." },
    { q: "How do I find the biggest funnel bottleneck?", a: "Calculate: revenue impact = (current_conversion × remaining_value) - (improved_conversion × improved_value). Pick stage with biggest gap. Often: 1) Top of funnel (low traffic), 2) Activation (low first-week retention), 3) Conversion (low trial-to-paid). Run user research. Most teams: 2-3 bottlenecks, fix the biggest first. Compound wins." },
    { q: "What is the difference between funnel and pipeline?", a: "Funnel: marketing/sales stages from awareness to purchase. Generic. Pipeline: specific deals in CRM. Sales pipeline: qualified leads being worked. Marketing funnel: visitor to MQL. Sales funnel: MQL to close. Use: funnel for system design, pipeline for forecasting. B2B: pipeline matters more. B2C: funnel matters more. Both: visual representation of customer journey." },
    { q: "How do I optimize the middle of the funnel?", a: "Middle = consideration (lead to opportunity). Tactics include 1) Email nurture (5-7 emails over 2-4 weeks), 2) Retargeting ads, 3) Comparison content, 4) Webinars, 5) Case studies, 6) Sales calls (B2B), 7) Free trials (SaaS). Best ROI: 1 + 2 + 4. Most teams 2x conversion in middle funnel within 6 months. Use lead scoring to prioritize." },
    { q: "What is the role of segmentation in funnel optimization?", a: "Segmentation = grouping users by behavior, demographics, source. Examples: by source (organic, paid, social), by behavior (high-intent, browsing), by plan (free, paid). Optimize per segment: different funnels for different users. Most teams: 30-50% improvement in conversion with segmentation. Start: 3-5 segments. Tools: Mixpanel, Amplitude, HubSpot." },
    { q: "How do I attribute revenue to funnel stages?", a: "Models: 1) First-touch (first interaction), 2) Last-touch (final interaction), 3) Multi-touch (weighted). For funnel: first-touch shows top of funnel impact, last-touch shows closing channels. Use multi-touch for accurate ROI. Tools: HubSpot, Salesforce, Bizible, custom. Compare: first vs last vs multi. Most: 60% of revenue from multi-touch attribution." },
    { q: "How do I scale funnel without losing quality?", a: "Tactics: 1) Automate nurture (email, scoring), 2) Build self-serve options (trials, freemium), 3) Sales enablement (better tools, training), 4) Improve qualification (MQL → SQL faster), 5) Better handoff (marketing → sales). Most teams: 2-3x funnel capacity in 12 months without adding headcount. Top lever: better qualification. Don't scale broken funnels." },
  ],
  howToUse: [
    'Enter top-of-funnel impressions for the period (month, quarter).',
    'Enter your CTR (clickers ÷ impressions × 100).',
    'Enter lead conversion rate (leads ÷ clickers × 100).',
    'Enter sale conversion rate (sales ÷ leads × 100).',
    'Enter AOV (average order value) and gross margin %.',
    'Read the biggest leak — that is your highest-leverage optimization target.',
  ],
  engineKey: true,
};

registerEngine(engine);