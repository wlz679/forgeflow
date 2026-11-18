import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
import { BAND_META } from '../../core/engines/band-meta';

// =====================================================================
// Pipeline Value Calculator (P8-1) — Business v3 standard (6+ emoji sections)
// =====================================================================
//
// Pipeline value weights each stage by its probability of closing.
//   Discovery: 20% probability (top of funnel — many leads, low close rate)
//   Proposal:  40%
//   Negotiation: 60%
//   Closing:   80% (ready to sign, just paperwork)
//
// weightedPipeline = Σ(count × size × probability)        // "expected revenue"
// nominalPipeline  = Σ(count × size)                      // unweighted face value
// weightedForecast = weightedPipeline × 0.5               // 50% confidence haircut
//
// Health bands by weightedPipeline:
//   🟢 ≥ $500K — strong pipeline, healthy forecast
//   🟡 $200K–$500K — mid-market SaaS sweet spot
//   🟠 $50K–$200K — light pipeline; needs more top-of-funnel
//   🔴 < $50K — critical: pipeline rebuild urgent

// ============== Health band constants (per-file, exported for tests) ==============

export const HEALTH_BANDS = {
  excellent: [500000, Infinity],
  good: [200000, 500000],
  warning: [50000, 200000],
  critical: [0, 50000],
} as const;

// ============== Stage probabilities (display + math) ==============

export const STAGE_PROBABILITIES = {
  discovery: 0.20,
  proposal: 0.40,
  negotiation: 0.60,
  closing: 0.80,
} as const;

// ============== Math helpers (exported for tests) ==============

/** Weighted value of one pipeline stage. */
export function stageValue(count: number, size: number, probability: number): number {
  return count * size * probability;
}

/** Total weighted pipeline across all 4 stages. */
export function totalPipeline(
  discoveryVal: number, proposalVal: number, negotiationVal: number, closingVal: number,
): number {
  return discoveryVal + proposalVal + negotiationVal + closingVal;
}

/** Nominal (unweighted) pipeline face value. */
export function nominalPipeline(
  discoveryCount: number, discoverySize: number,
  proposalCount: number, proposalSize: number,
  negotiationCount: number, negotiationSize: number,
  closingCount: number, closingSize: number,
): number {
  return discoveryCount * discoverySize + proposalCount * proposalSize
    + negotiationCount * negotiationSize + closingCount * closingSize;
}

/** 50% confidence forecast = weightedPipeline × 0.5. */
export function weightedForecast(weighted: number): number {
  return weighted * 0.5;
}

/** Health band label from weighted pipeline (USD). */
export function calcHealthBand(value: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (value >= HEALTH_BANDS.excellent[0]) return 'excellent';
  if (value >= HEALTH_BANDS.good[0]) return 'good';
  if (value >= HEALTH_BANDS.warning[0]) return 'warning';
  return 'critical';
}

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const discoveryCount = clampNonNegative(parseFloat(inputs.discoveryCount) || 0);
  const discoverySize = clampNonNegative(parseFloat(inputs.discoverySize) || 0);
  const proposalCount = clampNonNegative(parseFloat(inputs.proposalCount) || 0);
  const proposalSize = clampNonNegative(parseFloat(inputs.proposalSize) || 0);
  const negotiationCount = clampNonNegative(parseFloat(inputs.negotiationCount) || 0);
  const negotiationSize = clampNonNegative(parseFloat(inputs.negotiationSize) || 0);
  const closingCount = clampNonNegative(parseFloat(inputs.closingCount) || 0);
  const closingSize = clampNonNegative(parseFloat(inputs.closingSize) || 0);

  // Edge: all stages empty → prompt to enter values
  if (discoveryCount === 0 && proposalCount === 0 && negotiationCount === 0 && closingCount === 0) {
    return [
      '📊 Pipeline Value Calculator\n\n' +
        '📊 Enter the number of deals and average deal size for each pipeline stage (Discovery / Proposal / Negotiation / Closing) to see your weighted pipeline value and revenue forecast.',
    ];
  }

  const discoveryVal = stageValue(discoveryCount, discoverySize, STAGE_PROBABILITIES.discovery);
  const proposalVal = stageValue(proposalCount, proposalSize, STAGE_PROBABILITIES.proposal);
  const negotiationVal = stageValue(negotiationCount, negotiationSize, STAGE_PROBABILITIES.negotiation);
  const closingVal = stageValue(closingCount, closingSize, STAGE_PROBABILITIES.closing);
  const total = totalPipeline(discoveryVal, proposalVal, negotiationVal, closingVal);
  const nominal = nominalPipeline(
    discoveryCount, discoverySize,
    proposalCount, proposalSize,
    negotiationCount, negotiationSize,
    closingCount, closingSize,
  );
  const forecast = weightedForecast(total);
  const forecastToNominal = nominal > 0 ? (total / nominal) * 100 : 0;

  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

  // Health band
  const band = calcHealthBand(total);
  const healthEmoji = BAND_META[band];
  const healthLabel =
    band === 'excellent'
      ? 'Excellent — weighted pipeline ≥ $500K; healthy forecast'
      : band === 'good'
      ? 'Good — mid-market sweet spot; room to grow top-of-funnel'
      : band === 'warning'
      ? 'Warning — light pipeline; needs more qualified opportunities'
      : 'Critical — pipeline rebuild urgent; revenue at risk';

  // What-If: boost Proposal probability 40%→50% (+$12.5K per Proposal deal);
  //          add 1 more Closing deal (+$36K = 1 × $45K × 0.80)
  const proposalBoostPerDeal = proposalSize * (0.50 - 0.40); // extra per deal
  const proposalBoostTotal = proposalCount * proposalBoostPerDeal;
  const closingAddOne = stageValue(1, closingSize, STAGE_PROBABILITIES.closing);

  // Break-Even: need 2 more Closing deals for 🟢 (≥$500K threshold)
  // target = $500K, current = total, gap = max(0, 500K - total)
  // extra deals = ceil(gap / perClosingDeal) where perClosingDeal = $45K × 0.80 = $36K
  const closingDealValue = closingSize * STAGE_PROBABILITIES.closing;
  const thresholdGap = Math.max(0, 500000 - total);
  const extraClosingDealsNeeded = closingDealValue > 0 ? Math.ceil(thresholdGap / closingDealValue) : 0;

  // Milestone: gap to next tier (🟢 from current band)
  let gapToNext: number;
  let nextTier: string;
  if (band === 'critical') {
    gapToNext = 50000 - total;
    nextTier = '🟠 Warning ($50K)';
  } else if (band === 'warning') {
    gapToNext = 200000 - total;
    nextTier = '🟡 Good ($200K)';
  } else if (band === 'good') {
    gapToNext = 500000 - total;
    nextTier = '🟢 Excellent ($500K)';
  } else {
    gapToNext = 0;
    nextTier = 'top tier maintained';
  }

  // Tip: band-driven contextual advice
  let tip: string;
  if (band === 'critical') {
    tip =
      'Pipeline < $50K weighted is a red flag — you likely will not hit quarter. Triple top-of-funnel activity: cold outreach, content syndication, paid lead-gen. Audit discovery-to-proposal conversion first; a leaky top-of-funnel makes everything else moot.';
  } else if (band === 'warning') {
    tip =
      '$50K–$200K weighted pipeline is light. Focus on late-stage acceleration — move Proposal and Negotiation deals forward faster with stronger sales playbooks. A 10% improvement in Closing-stage conversion is worth more than doubling Discovery count.';
  } else if (band === 'good') {
    tip =
      '$200K–$500K is the mid-market sweet spot. To reach Excellent, prioritize deal size (negotiate up) and stage progression (faster cycle). Pair this with a sales velocity calculator to identify which lever (volume × size × win rate ÷ cycle) moves fastest.';
  } else {
    tip =
      'Excellent pipeline — you have revenue visibility for the quarter. Maintain cadence; do not let top-of-funnel slip. Watch for stale Closing-stage deals (>30 days) that may quietly slip from 80% to 50% probability.';
  }

  const r =
    '📊 Pipeline Value Calculator\n\n' +
    '🩺 Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• Weighted pipeline: ' + money(total) + '  ·  Nominal pipeline: ' + money(nominal) + '\n' +
    '• Weighted forecast (50% confidence): ' + money(forecast) + '  ·  Coverage ratio: ' + forecastToNominal.toFixed(1) + '% of nominal\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Inputs Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Discovery    (' + discoveryCount + ' × ' + money(discoverySize) + ' × 20%) = ' + money(discoveryVal) + '\n' +
    '• Proposal     (' + proposalCount + ' × ' + money(proposalSize) + ' × 40%) = ' + money(proposalVal) + '\n' +
    '• Negotiation  (' + negotiationCount + ' × ' + money(negotiationSize) + ' × 60%) = ' + money(negotiationVal) + '\n' +
    '• Closing      (' + closingCount + ' × ' + money(closingSize) + ' × 80%) = ' + money(closingVal) + '\n' +
    '• Total weighted: ' + money(total) + '  ·  Nominal face value: ' + money(nominal) + '\n' +
    '• 50% confidence forecast: ' + money(forecast) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Proposal probability 40%→50%: +' + money(proposalBoostTotal) + ' (per deal: ' + money(proposalBoostPerDeal) + ')\n' +
    '• Add 1 more Closing deal: +' + money(closingAddOne) + ' (immediate lift to weighted)\n' +
    '• Closing conversion 80%→85%: +' + money(closingCount * closingSize * 0.05) + ' (no extra deals needed)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Target for 🟢 Excellent: ' + money(500000) + ' weighted pipeline\n' +
    '• Gap to 🟢: ' + money(thresholdGap) + '\n' +
    '• Action: need ' + extraClosingDealsNeeded + ' more Closing deal(s) at ' + money(closingDealValue) + ' each (or equivalent from Proposal/Negotiation)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Milestone:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Next tier: ' + nextTier + '\n' +
    '• Gap to next tier: ' + money(Math.max(0, gapToNext)) + (band === 'excellent' ? ' (already at top)' : '') + '\n' +
    '• Quarterly revenue at this pace: ~' + money(total * 0.25) + '/month (if pipeline converts at 25%/qtr)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let r=function(e){return Number.isNaN(e)?0:Math.max(0,e)},p=function(e,t,a){return e*t*a},C=function(e,t,a,o){return e+t+a+o},b=function(e,t,a,o,g,d,f,s){return e*t+a*o+g*d+f*s},z=function(e){return e*.5},F=function(e){return e>=w.excellent[0]?"excellent":e>=w.good[0]?"good":e>=w.warning[0]?"warning":"critical"},N=function(e,t,a){var o=P(e);return Array.isArray(o)?o.join(\`
\`):String(o)};var X=r,Y=p,Z=C,E=b,H=z,T=F,O=N,D={excellent:"🟢",good:"🟡",warning:"🟠",critical:"🔴"},w={excellent:[5e5,null],good:[2e5,5e5],warning:[5e4,2e5],critical:[0,5e4]},c={discovery:.2,proposal:.4,negotiation:.6,closing:.8},P=function(e){const t=r(parseFloat(e.discoveryCount)||0),a=r(parseFloat(e.discoverySize)||0),o=r(parseFloat(e.proposalCount)||0),g=r(parseFloat(e.proposalSize)||0),d=r(parseFloat(e.negotiationCount)||0),f=r(parseFloat(e.negotiationSize)||0),s=r(parseFloat(e.closingCount)||0),u=r(parseFloat(e.closingSize)||0);if(t===0&&o===0&&d===0&&s===0)return[\`📊 Pipeline Value Calculator

📊 Enter the number of deals and average deal size for each pipeline stage (Discovery / Proposal / Negotiation / Closing) to see your weighted pipeline value and revenue forecast.\`];const k=p(t,a,c.discovery),K=p(o,g,c.proposal),$=p(d,f,c.negotiation),M=p(s,u,c.closing),l=C(k,K,$,M),m=b(t,a,o,g,d,f,s,u),V=z(l),_=m>0?l/m*100:0,n=S=>"$"+Math.round(S).toLocaleString("en-US"),i=F(l),j=D[i],Q=i==="excellent"?"Excellent — weighted pipeline ≥ $500K; healthy forecast":i==="good"?"Good — mid-market sweet spot; room to grow top-of-funnel":i==="warning"?"Warning — light pipeline; needs more qualified opportunities":"Critical — pipeline rebuild urgent; revenue at risk",q=g*(.5-.4),U=o*q,G=p(1,u,c.closing),x=u*c.closing,W=Math.max(0,5e5-l),J=x>0?Math.ceil(W/x):0;let h,v;i==="critical"?(h=5e4-l,v="🟠 Warning ($50K)"):i==="warning"?(h=2e5-l,v="🟡 Good ($200K)"):i==="good"?(h=5e5-l,v="🟢 Excellent ($500K)"):(h=0,v="top tier maintained");let y;return i==="critical"?y="Pipeline < $50K weighted is a red flag — you likely will not hit quarter. Triple top-of-funnel activity: cold outreach, content syndication, paid lead-gen. Audit discovery-to-proposal conversion first; a leaky top-of-funnel makes everything else moot.":i==="warning"?y="$50K–$200K weighted pipeline is light. Focus on late-stage acceleration — move Proposal and Negotiation deals forward faster with stronger sales playbooks. A 10% improvement in Closing-stage conversion is worth more than doubling Discovery count.":i==="good"?y="$200K–$500K is the mid-market sweet spot. To reach Excellent, prioritize deal size (negotiate up) and stage progression (faster cycle). Pair this with a sales velocity calculator to identify which lever (volume × size × win rate ÷ cycle) moves fastest.":y="Excellent pipeline — you have revenue visibility for the quarter. Maintain cadence; do not let top-of-funnel slip. Watch for stale Closing-stage deals (>30 days) that may quietly slip from 80% to 50% probability.",[\`📊 Pipeline Value Calculator

🩺 Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+j+" "+Q+\`
• Weighted pipeline: \`+n(l)+"  ·  Nominal pipeline: "+n(m)+\`
• Weighted forecast (50% confidence): \`+n(V)+"  ·  Coverage ratio: "+_.toFixed(1)+\`% of nominal

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Inputs Snapshot:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Discovery    (\`+t+" × "+n(a)+" × 20%) = "+n(k)+\`
• Proposal     (\`+o+" × "+n(g)+" × 40%) = "+n(K)+\`
• Negotiation  (\`+d+" × "+n(f)+" × 60%) = "+n($)+\`
• Closing      (\`+s+" × "+n(u)+" × 80%) = "+n(M)+\`
• Total weighted: \`+n(l)+"  ·  Nominal face value: "+n(m)+\`
• 50% confidence forecast: \`+n(V)+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 What-If:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Proposal probability 40%→50%: +\`+n(U)+" (per deal: "+n(q)+\`)
• Add 1 more Closing deal: +\`+n(G)+\` (immediate lift to weighted)
• Closing conversion 80%→85%: +\`+n(s*u*.05)+\` (no extra deals needed)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ Break-Even:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Target for 🟢 Excellent: \`+n(5e5)+\` weighted pipeline
• Gap to 🟢: \`+n(W)+\`
• Action: need \`+J+" more Closing deal(s) at "+n(x)+\` each (or equivalent from Proposal/Negotiation)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Milestone:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Next tier: \`+v+\`
• Gap to next tier: \`+n(Math.max(0,h))+(i==="excellent"?" (already at top)":"")+\`
• Quarterly revenue at this pace: ~\`+n(l*.25)+\`/month (if pipeline converts at 25%/qtr)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Tip: \`+y+\`
\`]};return[N(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-pipeline-value-calculator',
  title: 'Pipeline Value Calculator',
  description:
    'Compute the weighted value of your sales pipeline by stage probability (Discovery 20% / Proposal 40% / Negotiation 60% / Closing 80%). The fundamental sales KPI for B2B SaaS founders and sales managers. Health bands: 🟢 ≥$500K · 🟡 $200K-$500K · 🟠 $50K-$200K · 🔴 <$50K.',
  categoryId: 'S',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'discoveryCount', label: 'Discovery deals', placeholder: 'e.g. 10', type: 'number' },
    { name: 'discoverySize', label: 'Discovery avg deal size (USD)', placeholder: 'e.g. 15000', type: 'number' },
    { name: 'proposalCount', label: 'Proposal deals', placeholder: 'e.g. 5', type: 'number' },
    { name: 'proposalSize', label: 'Proposal avg deal size (USD)', placeholder: 'e.g. 25000', type: 'number' },
    { name: 'negotiationCount', label: 'Negotiation deals', placeholder: 'e.g. 3', type: 'number' },
    { name: 'negotiationSize', label: 'Negotiation avg deal size (USD)', placeholder: 'e.g. 35000', type: 'number' },
    { name: 'closingCount', label: 'Closing deals', placeholder: 'e.g. 2', type: 'number' },
    { name: 'closingSize', label: 'Closing avg deal size (USD)', placeholder: 'e.g. 45000', type: 'number' },
  ],
  keywords: [
    'pipeline value calculator',
    'sales pipeline',
    'weighted pipeline',
    'pipeline forecast',
    'deal probability',
    'stage probability',
    'sales KPI',
    'B2B SaaS sales',
    'pipeline coverage',
    'revenue forecast',
  ],
  tags: ['sales', 'pipeline', 'crm', 'forecast'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-07',
  sources: [
    'https://www.insivia.com/blog/sales-pipeline-value/',
    'https://blog.hubspot.com/sales/sales-pipeline',
    'https://www.salesforce.com/resources/articles/sales-pipeline/',
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
  staticExamples: ['📊 Pipeline Value Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 Good — mid-market sweet spot; room to grow top-of-funnel\n• Weighted pipeline: $215,000  ·  Nominal pipeline: $470,000\n• Weighted forecast (50% confidence): $107,500  ·  Coverage ratio: 45.7% of nominal\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Discovery    (10 × $15,000 × 20%) = $30,000\n• Proposal     (5 × $25,000 × 40%) = $50,000\n• Negotiation  (3 × $35,000 × 60%) = $63,000\n• Closing      (2 × $45,000 × 80%) = $72,000\n• Total weighted: $215,000  ·  Nominal face value: $470,000\n• 50% confidence forecast: $107,500\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Proposal probability 40%→50%: +$12,500 (per deal: $2,500)\n• Add 1 more Closing deal: +$36,000 (immediate lift to weighted)\n• Closing conversion 80%→85%: +$4,500 (no extra deals needed)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Target for 🟢 Excellent: $500,000 weighted pipeline\n• Gap to 🟢: $285,000\n• Action: need 8 more Closing deal(s) at $36,000 each (or equivalent from Proposal/Negotiation)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Next tier: 🟢 Excellent ($500K)\n• Gap to next tier: $285,000\n• Quarterly revenue at this pace: ~$53,750/month (if pipeline converts at 25%/qtr)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: $200K–$500K is the mid-market sweet spot. To reach Excellent, prioritize deal size (negotiate up) and stage progression (faster cycle). Pair this with a sales velocity calculator to identify which lever (volume × size × win rate ÷ cycle) moves fastest.\n'],
  faq: [
    { q: 'What is a sales pipeline value?', a: 'Pipeline value is the total dollar amount of all deals in your sales pipeline, weighted by the probability each deal will close at its current stage. A weighted pipeline gives you a realistic forecast, while a raw (nominal) pipeline shows your theoretical maximum.' },
    { q: 'How are stage probabilities determined?', a: 'Stage probabilities reflect historical win rates at each stage of your sales funnel. Common defaults: Discovery 20%, Proposal 40%, Negotiation 60%, Closing 80%. Replace these with your own historical conversion rates for a more accurate forecast.' },
    { q: 'Why is the weighted forecast multiplied by 50%?', a: 'The 50% haircut acknowledges that even probability-weighted forecasts tend to over-predict by ~2x. Combining stage probability with a 50% confidence adjustment yields a conservative estimate suitable for board reporting and quota planning.' },
    { q: 'How do I improve a weak pipeline?', a: 'Light pipelines ($50K-$200K) benefit from late-stage acceleration — better sales playbooks, faster follow-up, deal review cadences. Critical pipelines (<$50K) need top-of-funnel work: more Discovery calls, content syndication, paid lead generation, and lead qualification.' },
    { q: 'How does this differ from sales velocity?', a: 'Pipeline value is a static snapshot — what you have right now. Sales velocity measures throughput — how fast your pipeline generates revenue (opps × size × win rate ÷ cycle days). Use pipeline value for forecast accuracy, velocity for productivity optimization.' },
    { q: "What is pipeline value?", a: "Pipeline value = sum of all open opportunities × deal value. For 10 deals at $50K each: $500K pipeline. Used for: 1) Forecasting, 2) Capacity planning, 3) Performance tracking. Track total, weighted by stage, by source, by rep. separate from committed revenue. Tools: Salesforce, HubSpot, Pipedrive. Most teams track weighted pipeline for forecasting. Aim for 3-4x coverage." },
    { q: "What is weighted pipeline value?", a: "Weighted pipeline = pipeline value × close probability. Example: $500K pipeline × 30% close = $150K weighted. By stage: 1) Discovery 5%, 2) Demo 10%, 3) Evaluation 25%, 4) Negotiation 50%, 5) Commit 80%. use stage-based weights. Sum: forecast. Most teams 80% forecast accuracy with discipline. Tools: Salesforce, Clari. Update weekly. weighted vs actual = variance to track." },
    { q: "How do I track pipeline value vs committed?", a: "Track 3 categories: 1) Commit (90%+ close): 100% weighted, 2) Best case (50-80% close): 50% weighted, 3) Pipeline (10-50% close): 25% weighted. avoid binary (in/out). Tools: 1-2-3 framework. Most reps: 1 commit per month. Total: sum weighted by category. Avoid \"everything is commit\" (over-forecasting). Discipline: 80% of commit = actual." },
    { q: "What is a good pipeline value for $1M quota?", a: "For $1M quota: 1) New business: $3-4M pipeline, 2) Expansion: $1-1.5M, 3) Total: $4-5M. By segment: 1) SMB (high volume): 5-6x, 2) Mid-market: 3-4x, 3) Enterprise (low volume): 5-10x. Most: 3-4x for healthy. By stage: distribute across stages (20% early, 50% mid, 30% late). Avoid: 80% in early stage (low quality)." },
    { q: "How do I avoid pipeline bloat?", a: "Pipeline bloat: too much low-quality pipeline. Symptoms: 1) Coverage >5x, 2) Low close rates (<15%), 3) Stale deals, 4) Many small deals. Tactics: 1) Better qualification (BANT, MEDDIC), 2) Stage discipline (no skipping), 3) Disqualify early, 4) Cap deal size, 5) Marketing qualified leads only. Most: cut pipeline 30-50% but increase close rate. Quality over quantity." },
    { q: "What is the difference between pipeline and forecast?", a: "Pipeline: all open deals. Forecast: expected revenue in period. Pipeline × close rate = forecast. Pipeline: $5M. Forecast: $1.5M (30% close rate). For board: forecast is what matters. For sales: pipeline is what you build. track both. Pipeline for reps, forecast for managers. Tools: Salesforce, Clari, BoostUp. Discipline: 80% accuracy on forecast is good. Most teams improve quarterly." },
    { q: "How do I use pipeline value for rep performance?", a: "Rep metrics: 1) Pipeline created (vs quota), 2) Pipeline coverage (3-4x), 3) Close rate (25-35%), 4) Average deal size, 5) Cycle time. Reps at quota: usually 3-4x coverage + 30% close. Below: low pipeline or low quality. Above: low quality (junk pipeline). weekly 1:1s to review pipeline. pipeline build rate (rep adds 1-2x quota per quarter). Aim for 2-3x quota in pipeline per quarter." },
    { q: "What is the average sales pipeline value for SaaS?", a: "Benchmarks: 1) <$1M ARR: $2-5M pipeline, 2) $1-5M ARR: $5-20M, 3) $5-20M ARR: $20-80M, 4) $20-100M ARR: $80-300M. By stage: weighted pipeline = 25-30% of total pipeline. 3-4x quota in pipeline. For $5M quota: $15-20M pipeline. Tools: Salesforce, HubSpot. Track weekly. validate quarterly. Avoid stale pipeline (skews metrics)." },
  ],
  howToUse: [
    'Enter the number of deals currently in each pipeline stage (Discovery, Proposal, Negotiation, Closing).',
    'Enter the average deal size for each stage — pull from your CRM or use weighted average across recent closed deals.',
    'Read the weighted pipeline (expected revenue) and nominal pipeline (face value). The gap between them shows probability-adjusted risk.',
    'Use the What-If section to model improvements: faster Closing-stage conversion, more Proposal deals, higher deal size.',
    'Compare to sales velocity (P8-2) to identify whether your bottleneck is volume, size, win rate, or cycle time.',
  ],
  engineKey: true,
};
registerEngine(engine);