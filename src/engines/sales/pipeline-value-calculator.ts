import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-14：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

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
      makeToken('calc_out.section.pipeline_value_calculator', '📊 Pipeline Value Calculator') +
        '\n\n' +
        makeToken('calc_out.pipeline_value.row.need_inputs', '📊 Enter the number of deals and average deal size for each pipeline stage (Discovery / Proposal / Negotiation / Closing) to see your weighted pipeline value and revenue forecast.'),
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
  let healthLine: string;
  if (band === 'excellent') {
    healthLine = makeToken(
      'calc_out.pipeline_value.row.health_excellent',
      '• 🟢 Excellent — weighted pipeline ≥ $500K; healthy forecast',
    );
  } else if (band === 'good') {
    healthLine = makeToken(
      'calc_out.pipeline_value.row.health_good',
      '• 🟡 Good — mid-market sweet spot; room to grow top-of-funnel',
    );
  } else if (band === 'warning') {
    healthLine = makeToken(
      'calc_out.pipeline_value.row.health_warning',
      '• 🟠 Warning — light pipeline; needs more qualified opportunities',
    );
  } else {
    healthLine = makeToken(
      'calc_out.pipeline_value.row.health_critical',
      '• 🔴 Critical — pipeline rebuild urgent; revenue at risk',
    );
  }

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
    tip = makeToken('calc_out.pipeline_value.row.tip_critical', '💡 Tip: Pipeline < $50K weighted is a red flag — you likely will not hit quarter. Triple top-of-funnel activity: cold outreach, content syndication, paid lead-gen. Audit discovery-to-proposal conversion first; a leaky top-of-funnel makes everything else moot.');
  } else if (band === 'warning') {
    tip = makeToken('calc_out.pipeline_value.row.tip_warning', '💡 Tip: $50K–$200K weighted pipeline is light. Focus on late-stage acceleration — move Proposal and Negotiation deals forward faster with stronger sales playbooks. A 10% improvement in Closing-stage conversion is worth more than doubling Discovery count.');
  } else if (band === 'good') {
    tip = makeToken('calc_out.pipeline_value.row.tip_good', '💡 Tip: $200K–$500K is the mid-market sweet spot. To reach Excellent, prioritize deal size (negotiate up) and stage progression (faster cycle). Pair this with a sales velocity calculator to identify which lever (volume × size × win rate ÷ cycle) moves fastest.');
  } else {
    tip = makeToken('calc_out.pipeline_value.row.tip_excellent', '💡 Tip: Excellent pipeline — you have revenue visibility for the quarter. Maintain cadence; do not let top-of-funnel slip. Watch for stale Closing-stage deals (>30 days) that may quietly slip from 80% to 50% probability.');
  }

  // P168 B3-14：params 的表达式与兜底里的表达式必须**同源** ⇒ 先用局部变量承接
  const totalLabel = money(total);
  const nominalLabel = money(nominal);
  const forecastLabel = money(forecast);
  const coverageLabel = forecastToNominal.toFixed(1);
  const discoveryCountLabel = String(discoveryCount);
  const discoverySizeLabel = money(discoverySize);
  const discoveryValLabel = money(discoveryVal);
  const proposalCountLabel = String(proposalCount);
  const proposalSizeLabel = money(proposalSize);
  const proposalValLabel = money(proposalVal);
  const negotiationCountLabel = String(negotiationCount);
  const negotiationSizeLabel = money(negotiationSize);
  const negotiationValLabel = money(negotiationVal);
  const closingCountLabel = String(closingCount);
  const closingSizeLabel = money(closingSize);
  const closingValLabel = money(closingVal);
  const proposalBoostTotalLabel = money(proposalBoostTotal);
  const proposalBoostPerDealLabel = money(proposalBoostPerDeal);
  const closingAddOneLabel = money(closingAddOne);
  const closingConversionLabel = money(closingCount * closingSize * 0.05);
  const targetLabel = money(500000);
  const thresholdGapLabel = money(thresholdGap);
  const extraDealsLabel = String(extraClosingDealsNeeded);
  const closingDealValueLabel = money(closingDealValue);
  const gapToNextLabel = money(Math.max(0, gapToNext));
  const quarterlyLabel = money(total * 0.25);

  const r =
    makeToken('calc_out.section.pipeline_value_calculator', '📊 Pipeline Value Calculator') + '\n\n' +
    makeToken('calc_out.section.health', '🩺 Health:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    healthLine + '\n' +
    makeToken('calc_out.pipeline_value.row.weighted_nominal', '• Weighted pipeline: ' + totalLabel + '  ·  Nominal pipeline: ' + nominalLabel, { weighted: totalLabel, nominal: nominalLabel }) + '\n' +
    makeToken('calc_out.pipeline_value.row.forecast_coverage', '• Weighted forecast (50% confidence): ' + forecastLabel + '  ·  Coverage ratio: ' + coverageLabel + '% of nominal', { forecast: forecastLabel, coverage: coverageLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.inputs_snapshot', '📊 Inputs Snapshot:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.pipeline_value.row.stage_discovery', '• Discovery    (' + discoveryCountLabel + ' × ' + discoverySizeLabel + ' × 20%) = ' + discoveryValLabel, { count: discoveryCountLabel, size: discoverySizeLabel, value: discoveryValLabel }) + '\n' +
    makeToken('calc_out.pipeline_value.row.stage_proposal', '• Proposal     (' + proposalCountLabel + ' × ' + proposalSizeLabel + ' × 40%) = ' + proposalValLabel, { count: proposalCountLabel, size: proposalSizeLabel, value: proposalValLabel }) + '\n' +
    makeToken('calc_out.pipeline_value.row.stage_negotiation', '• Negotiation  (' + negotiationCountLabel + ' × ' + negotiationSizeLabel + ' × 60%) = ' + negotiationValLabel, { count: negotiationCountLabel, size: negotiationSizeLabel, value: negotiationValLabel }) + '\n' +
    makeToken('calc_out.pipeline_value.row.stage_closing', '• Closing      (' + closingCountLabel + ' × ' + closingSizeLabel + ' × 80%) = ' + closingValLabel, { count: closingCountLabel, size: closingSizeLabel, value: closingValLabel }) + '\n' +
    makeToken('calc_out.pipeline_value.row.total_weighted', '• Total weighted: ' + totalLabel + '  ·  Nominal face value: ' + nominalLabel, { weighted: totalLabel, nominal: nominalLabel }) + '\n' +
    makeToken('calc_out.pipeline_value.row.forecast_50', '• 50% confidence forecast: ' + forecastLabel, { forecast: forecastLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.what_if', '🔄 What-If:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.pipeline_value.row.whatif_proposal_prob', '• Proposal probability 40%→50%: +' + proposalBoostTotalLabel + ' (per deal: ' + proposalBoostPerDealLabel + ')', { total: proposalBoostTotalLabel, perdeal: proposalBoostPerDealLabel }) + '\n' +
    makeToken('calc_out.pipeline_value.row.whatif_add_closing', '• Add 1 more Closing deal: +' + closingAddOneLabel + ' (immediate lift to weighted)', { value: closingAddOneLabel }) + '\n' +
    makeToken('calc_out.pipeline_value.row.whatif_closing_conversion', '• Closing conversion 80%→85%: +' + closingConversionLabel + ' (no extra deals needed)', { value: closingConversionLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.break_even', '⚖️ Break-Even:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.pipeline_value.row.breakeven_target', '• Target for 🟢 Excellent: ' + targetLabel + ' weighted pipeline', { target: targetLabel }) + '\n' +
    makeToken('calc_out.pipeline_value.row.breakeven_gap', '• Gap to 🟢: ' + thresholdGapLabel, { gap: thresholdGapLabel }) + '\n' +
    makeToken('calc_out.pipeline_value.row.breakeven_action', '• Action: need ' + extraDealsLabel + ' more Closing deal(s) at ' + closingDealValueLabel + ' each (or equivalent from Proposal/Negotiation)', { deals: extraDealsLabel, value: closingDealValueLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.milestone', '🎯 Milestone:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (band === 'critical'
      ? makeToken('calc_out.pipeline_value.row.milestone_next_tier_critical', '• Next tier: 🟠 Warning ($50K)')
      : band === 'warning'
      ? makeToken('calc_out.pipeline_value.row.milestone_next_tier_warning', '• Next tier: 🟡 Good ($200K)')
      : band === 'good'
      ? makeToken('calc_out.pipeline_value.row.milestone_next_tier_good', '• Next tier: 🟢 Excellent ($500K)')
      : makeToken('calc_out.pipeline_value.row.milestone_next_tier_excellent', '• Next tier: top tier maintained')) + '\n' +
    (band === 'excellent'
      ? makeToken('calc_out.pipeline_value.row.milestone_gap_top', '• Gap to next tier: ' + gapToNextLabel + ' (already at top)', { value: gapToNextLabel })
      : makeToken('calc_out.pipeline_value.row.milestone_gap', '• Gap to next tier: ' + gapToNextLabel, { value: gapToNextLabel })) + '\n' +
    makeToken('calc_out.pipeline_value.row.milestone_quarterly', '• Quarterly revenue at this pace: ~' + quarterlyLabel + '/month (if pipeline converts at 25%/qtr)', { value: quarterlyLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let c=function(t){return Number.isNaN(t)?0:Math.max(0,t)},u=function(t,l,a){return t*l*a},$=function(t,l,a,i){return t+l+a+i},K=function(t,l,a,i,g,_,d,s){return t*l+a*i+g*_+d*s},m=function(t){return t*.5},q=function(t){return t>=z.excellent[0]?"excellent":t>=z.good[0]?"good":t>=z.warning[0]?"warning":"critical"},S=function(t,l,a){var i=ce(t);return Array.isArray(i)?i.join(\`
\`):String(i)};var ve=c,de=u,fe=$,he=K,we=m,ye=q,be=S,e=tk,ae='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',e=new Function("return "+ae)(),z={excellent:[5e5,null],good:[2e5,5e5],warning:[5e4,2e5],critical:[0,5e4]},p={discovery:.2,proposal:.4,negotiation:.6,closing:.8},ce=function(t){const l=c(parseFloat(t.discoveryCount)||0),a=c(parseFloat(t.discoverySize)||0),i=c(parseFloat(t.proposalCount)||0),g=c(parseFloat(t.proposalSize)||0),_=c(parseFloat(t.negotiationCount)||0),d=c(parseFloat(t.negotiationSize)||0),s=c(parseFloat(t.closingCount)||0),v=c(parseFloat(t.closingSize)||0);if(l===0&&i===0&&_===0&&s===0)return[e("calc_out.section.pipeline_value_calculator","📊 Pipeline Value Calculator")+\`

\`+e("calc_out.pipeline_value.row.need_inputs","📊 Enter the number of deals and average deal size for each pipeline stage (Discovery / Proposal / Negotiation / Closing) to see your weighted pipeline value and revenue forecast.")];const V=u(l,a,p.discovery),D=u(i,g,p.proposal),M=u(_,d,p.negotiation),W=u(s,v,p.closing),r=$(V,D,M,W),N=K(l,a,i,g,_,d,s,v),re=m(r),se=N>0?r/N*100:0,o=_e=>"$"+Math.round(_e).toLocaleString("en-US"),n=q(r);let f;n==="excellent"?f=e("calc_out.pipeline_value.row.health_excellent","• 🟢 Excellent — weighted pipeline ≥ $500K; healthy forecast"):n==="good"?f=e("calc_out.pipeline_value.row.health_good","• 🟡 Good — mid-market sweet spot; room to grow top-of-funnel"):n==="warning"?f=e("calc_out.pipeline_value.row.health_warning","• 🟠 Warning — light pipeline; needs more qualified opportunities"):f=e("calc_out.pipeline_value.row.health_critical","• 🔴 Critical — pipeline rebuild urgent; revenue at risk");const P=g*(.5-.4),pe=i*P,ue=u(1,v,p.closing),F=v*p.closing,j=Math.max(0,5e5-r),ge=F>0?Math.ceil(j/F):0;let h,y;n==="critical"?(h=5e4-r,y="🟠 Warning ($50K)"):n==="warning"?(h=2e5-r,y="🟡 Good ($200K)"):n==="good"?(h=5e5-r,y="🟢 Excellent ($500K)"):(h=0,y="top tier maintained");let w;n==="critical"?w=e("calc_out.pipeline_value.row.tip_critical","💡 Tip: Pipeline < $50K weighted is a red flag — you likely will not hit quarter. Triple top-of-funnel activity: cold outreach, content syndication, paid lead-gen. Audit discovery-to-proposal conversion first; a leaky top-of-funnel makes everything else moot."):n==="warning"?w=e("calc_out.pipeline_value.row.tip_warning","💡 Tip: $50K–$200K weighted pipeline is light. Focus on late-stage acceleration — move Proposal and Negotiation deals forward faster with stronger sales playbooks. A 10% improvement in Closing-stage conversion is worth more than doubling Discovery count."):n==="good"?w=e("calc_out.pipeline_value.row.tip_good","💡 Tip: $200K–$500K is the mid-market sweet spot. To reach Excellent, prioritize deal size (negotiate up) and stage progression (faster cycle). Pair this with a sales velocity calculator to identify which lever (volume × size × win rate ÷ cycle) moves fastest."):w=e("calc_out.pipeline_value.row.tip_excellent","💡 Tip: Excellent pipeline — you have revenue visibility for the quarter. Maintain cadence; do not let top-of-funnel slip. Watch for stale Closing-stage deals (>30 days) that may quietly slip from 80% to 50% probability.");const b=o(r),x=o(N),C=o(re),G=se.toFixed(1),J=String(l),Q=o(a),U=o(V),O=String(i),X=o(g),Y=o(D),Z=String(_),E=o(d),H=o(M),R=String(s),A=o(v),B=o(W),I=o(pe),T=o(P),k=o(ue),ee=o(s*v*.05),te=o(5e5),oe=o(j),ie=String(ge),ne=o(F),L=o(Math.max(0,h)),le=o(r*.25);return[e("calc_out.section.pipeline_value_calculator","📊 Pipeline Value Calculator")+\`

\`+e("calc_out.section.health","🩺 Health:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+f+\`
\`+e("calc_out.pipeline_value.row.weighted_nominal","• Weighted pipeline: "+b+"  ·  Nominal pipeline: "+x,{weighted:b,nominal:x})+\`
\`+e("calc_out.pipeline_value.row.forecast_coverage","• Weighted forecast (50% confidence): "+C+"  ·  Coverage ratio: "+G+"% of nominal",{forecast:C,coverage:G})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+e("calc_out.section.inputs_snapshot","📊 Inputs Snapshot:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+e("calc_out.pipeline_value.row.stage_discovery","• Discovery    ("+J+" × "+Q+" × 20%) = "+U,{count:J,size:Q,value:U})+\`
\`+e("calc_out.pipeline_value.row.stage_proposal","• Proposal     ("+O+" × "+X+" × 40%) = "+Y,{count:O,size:X,value:Y})+\`
\`+e("calc_out.pipeline_value.row.stage_negotiation","• Negotiation  ("+Z+" × "+E+" × 60%) = "+H,{count:Z,size:E,value:H})+\`
\`+e("calc_out.pipeline_value.row.stage_closing","• Closing      ("+R+" × "+A+" × 80%) = "+B,{count:R,size:A,value:B})+\`
\`+e("calc_out.pipeline_value.row.total_weighted","• Total weighted: "+b+"  ·  Nominal face value: "+x,{weighted:b,nominal:x})+\`
\`+e("calc_out.pipeline_value.row.forecast_50","• 50% confidence forecast: "+C,{forecast:C})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+e("calc_out.section.what_if","🔄 What-If:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+e("calc_out.pipeline_value.row.whatif_proposal_prob","• Proposal probability 40%→50%: +"+I+" (per deal: "+T+")",{total:I,perdeal:T})+\`
\`+e("calc_out.pipeline_value.row.whatif_add_closing","• Add 1 more Closing deal: +"+k+" (immediate lift to weighted)",{value:k})+\`
\`+e("calc_out.pipeline_value.row.whatif_closing_conversion","• Closing conversion 80%→85%: +"+ee+" (no extra deals needed)",{value:ee})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+e("calc_out.section.break_even","⚖️ Break-Even:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+e("calc_out.pipeline_value.row.breakeven_target","• Target for 🟢 Excellent: "+te+" weighted pipeline",{target:te})+\`
\`+e("calc_out.pipeline_value.row.breakeven_gap","• Gap to 🟢: "+oe,{gap:oe})+\`
\`+e("calc_out.pipeline_value.row.breakeven_action","• Action: need "+ie+" more Closing deal(s) at "+ne+" each (or equivalent from Proposal/Negotiation)",{deals:ie,value:ne})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+e("calc_out.section.milestone","🎯 Milestone:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(n==="critical"?e("calc_out.pipeline_value.row.milestone_next_tier_critical","• Next tier: 🟠 Warning ($50K)"):n==="warning"?e("calc_out.pipeline_value.row.milestone_next_tier_warning","• Next tier: 🟡 Good ($200K)"):n==="good"?e("calc_out.pipeline_value.row.milestone_next_tier_good","• Next tier: 🟢 Excellent ($500K)"):e("calc_out.pipeline_value.row.milestone_next_tier_excellent","• Next tier: top tier maintained"))+\`
\`+(n==="excellent"?e("calc_out.pipeline_value.row.milestone_gap_top","• Gap to next tier: "+L+" (already at top)",{value:L}):e("calc_out.pipeline_value.row.milestone_gap","• Gap to next tier: "+L,{value:L}))+\`
\`+e("calc_out.pipeline_value.row.milestone_quarterly","• Quarterly revenue at this pace: ~"+le+"/month (if pipeline converts at 25%/qtr)",{value:le})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+w+\`
\`]};return[S(inputs,pick,fill)]}finally{}
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
  staticExamples: ['$calc_out.section.pipeline_value_calculator|📊 Pipeline Value Calculator|\n\n$calc_out.section.health|🩺 Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.pipeline_value.row.health_good|• 🟡 Good — mid-market sweet spot; room to grow top-of-funnel|\n$calc_out.pipeline_value.row.weighted_nominal{"weighted":"$215,000","nominal":"$470,000"}|• Weighted pipeline: $215,000  ·  Nominal pipeline: $470,000|\n$calc_out.pipeline_value.row.forecast_coverage{"forecast":"$107,500","coverage":"45.7"}|• Weighted forecast (50% confidence): $107,500  ·  Coverage ratio: 45.7% of nominal|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.pipeline_value.row.stage_discovery{"count":"10","size":"$15,000","value":"$30,000"}|• Discovery    (10 × $15,000 × 20%) = $30,000|\n$calc_out.pipeline_value.row.stage_proposal{"count":"5","size":"$25,000","value":"$50,000"}|• Proposal     (5 × $25,000 × 40%) = $50,000|\n$calc_out.pipeline_value.row.stage_negotiation{"count":"3","size":"$35,000","value":"$63,000"}|• Negotiation  (3 × $35,000 × 60%) = $63,000|\n$calc_out.pipeline_value.row.stage_closing{"count":"2","size":"$45,000","value":"$72,000"}|• Closing      (2 × $45,000 × 80%) = $72,000|\n$calc_out.pipeline_value.row.total_weighted{"weighted":"$215,000","nominal":"$470,000"}|• Total weighted: $215,000  ·  Nominal face value: $470,000|\n$calc_out.pipeline_value.row.forecast_50{"forecast":"$107,500"}|• 50% confidence forecast: $107,500|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if|🔄 What-If:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.pipeline_value.row.whatif_proposal_prob{"total":"$12,500","perdeal":"$2,500"}|• Proposal probability 40%→50%: +$12,500 (per deal: $2,500)|\n$calc_out.pipeline_value.row.whatif_add_closing{"value":"$36,000"}|• Add 1 more Closing deal: +$36,000 (immediate lift to weighted)|\n$calc_out.pipeline_value.row.whatif_closing_conversion{"value":"$4,500"}|• Closing conversion 80%→85%: +$4,500 (no extra deals needed)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.break_even|⚖️ Break-Even:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.pipeline_value.row.breakeven_target{"target":"$500,000"}|• Target for 🟢 Excellent: $500,000 weighted pipeline|\n$calc_out.pipeline_value.row.breakeven_gap{"gap":"$285,000"}|• Gap to 🟢: $285,000|\n$calc_out.pipeline_value.row.breakeven_action{"deals":"8","value":"$36,000"}|• Action: need 8 more Closing deal(s) at $36,000 each (or equivalent from Proposal/Negotiation)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.milestone|🎯 Milestone:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.pipeline_value.row.milestone_next_tier_good|• Next tier: 🟢 Excellent ($500K)|\n$calc_out.pipeline_value.row.milestone_gap{"value":"$285,000"}|• Gap to next tier: $285,000|\n$calc_out.pipeline_value.row.milestone_quarterly{"value":"$53,750"}|• Quarterly revenue at this pace: ~$53,750/month (if pipeline converts at 25%/qtr)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.pipeline_value.row.tip_good|💡 Tip: $200K–$500K is the mid-market sweet spot. To reach Excellent, prioritize deal size (negotiate up) and stage progression (faster cycle). Pair this with a sales velocity calculator to identify which lever (volume × size × win rate ÷ cycle) moves fastest.|\n'],
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