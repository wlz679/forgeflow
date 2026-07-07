import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

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
  const discoveryCount = Math.max(0, parseFloat(inputs.discoveryCount) || 0);
  const discoverySize = Math.max(0, parseFloat(inputs.discoverySize) || 0);
  const proposalCount = Math.max(0, parseFloat(inputs.proposalCount) || 0);
  const proposalSize = Math.max(0, parseFloat(inputs.proposalSize) || 0);
  const negotiationCount = Math.max(0, parseFloat(inputs.negotiationCount) || 0);
  const negotiationSize = Math.max(0, parseFloat(inputs.negotiationSize) || 0);
  const closingCount = Math.max(0, parseFloat(inputs.closingCount) || 0);
  const closingSize = Math.max(0, parseFloat(inputs.closingSize) || 0);

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
  const healthEmoji = band === 'excellent' ? '🟢' : band === 'good' ? '🟡' : band === 'warning' ? '🟠' : '🔴';
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
  "function sv(c,s,p){return c*s*p;}" +
  "function tp(d,p,n,c){return d+p+n+c;}" +
  "function np(dc,ds,pc,ps,nc,ns,cc,cs){return dc*ds+pc*ps+nc*ns+cc*cs;}" +
  "function wf(w){return w*0.5;}" +
  "function band(v){if(v>=500000)return 'excellent';if(v>=200000)return 'good';if(v>=50000)return 'warning';return 'critical';}" +
  "var dc=Math.max(0,parseFloat(inputs.discoveryCount)||0);" +
  "var ds=Math.max(0,parseFloat(inputs.discoverySize)||0);" +
  "var pc=Math.max(0,parseFloat(inputs.proposalCount)||0);" +
  "var ps=Math.max(0,parseFloat(inputs.proposalSize)||0);" +
  "var nc=Math.max(0,parseFloat(inputs.negotiationCount)||0);" +
  "var ns=Math.max(0,parseFloat(inputs.negotiationSize)||0);" +
  "var cc=Math.max(0,parseFloat(inputs.closingCount)||0);" +
  "var cs=Math.max(0,parseFloat(inputs.closingSize)||0);" +
  "if(dc===0&&pc===0&&nc===0&&cc===0){" +
    "return['\\uD83D\\uDCCA Pipeline Value Calculator\\n\\n\\uD83D\\uDCCA Enter the number of deals and average deal size for each pipeline stage (Discovery / Proposal / Negotiation / Closing) to see your weighted pipeline value and revenue forecast.'];" +
  "}" +
  "var dv=sv(dc,ds,0.20);" +
  "var pv=sv(pc,ps,0.40);" +
  "var nv=sv(nc,ns,0.60);" +
  "var cv=sv(cc,cs,0.80);" +
  "var t=tp(dv,pv,nv,cv);" +
  "var nom=np(dc,ds,pc,ps,nc,ns,cc,cs);" +
  "var fc=wf(t);" +
  "var ftn=nom>0?(t/nom)*100:0;" +
  "function money(n){return '$'+Math.round(n).toLocaleString('en-US');}" +
  "var bd=band(t);" +
  "var he=bd==='excellent'?'\\uD83D\\uDFE2':bd==='good'?'\\uD83D\\uDFE1':bd==='warning'?'\\uD83D\\uDFE0':'\\uD83D\\uDD34';" +
  "var hl=bd==='excellent'?'Excellent \\u2014 weighted pipeline \\u2265 $500K; healthy forecast':bd==='good'?'Good \\u2014 mid-market sweet spot; room to grow top-of-funnel':bd==='warning'?'Warning \\u2014 light pipeline; needs more qualified opportunities':'Critical \\u2014 pipeline rebuild urgent; revenue at risk';" +
  "var pbpd=ps*(0.50-0.40);" +
  "var pbt=pc*pbpd;" +
  "var cao=sv(1,cs,0.80);" +
  "var cdv=cs*0.80;" +
  "var tg=Math.max(0,500000-t);" +
  "var ecn=cdv>0?Math.ceil(tg/cdv):0;" +
  "var gn,nt;" +
  "if(bd==='critical'){gn=50000-t;nt='\\uD83D\\uDFE0 Warning ($50K)';}" +
  "else if(bd==='warning'){gn=200000-t;nt='\\uD83D\\uDFE1 Good ($200K)';}" +
  "else if(bd==='good'){gn=500000-t;nt='\\uD83D\\uDFE2 Excellent ($500K)';}" +
  "else{gn=0;nt='top tier maintained';}" +
  "var tip='';" +
  "if(bd==='critical'){tip='Pipeline < $50K weighted is a red flag \\u2014 you likely will not hit quarter. Triple top-of-funnel activity: cold outreach, content syndication, paid lead-gen. Audit discovery-to-proposal conversion first; a leaky top-of-funnel makes everything else moot.';}" +
  "else if(bd==='warning'){tip='$50K\\u2013$200K weighted pipeline is light. Focus on late-stage acceleration \\u2014 move Proposal and Negotiation deals forward faster with stronger sales playbooks. A 10% improvement in Closing-stage conversion is worth more than doubling Discovery count.';}" +
  "else if(bd==='good'){tip='$200K\\u2013$500K is the mid-market sweet spot. To reach Excellent, prioritize deal size (negotiate up) and stage progression (faster cycle). Pair this with a sales velocity calculator to identify which lever (volume \\u00D7 size \\u00D7 win rate \\u00F7 cycle) moves fastest.';}" +
  "else{tip='Excellent pipeline \\u2014 you have revenue visibility for the quarter. Maintain cadence; do not let top-of-funnel slip. Watch for stale Closing-stage deals (>30 days) that may quietly slip from 80% to 50% probability.';}" +
  "var r2='';" +
  "r2+='\\uD83D\\uDCCA Pipeline Value Calculator\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+he+' '+hl+'\\n';" +
  "r2+='\\u2022 Weighted pipeline: '+money(t)+'  \\u00B7  Nominal pipeline: '+money(nom)+'\\n';" +
  "r2+='\\u2022 Weighted forecast (50% confidence): '+money(fc)+'  \\u00B7  Coverage ratio: '+ftn.toFixed(1)+'% of nominal\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCCA Inputs Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Discovery    ('+dc+' \\u00D7 '+money(ds)+' \\u00D7 20%) = '+money(dv)+'\\n';" +
  "r2+='\\u2022 Proposal     ('+pc+' \\u00D7 '+money(ps)+' \\u00D7 40%) = '+money(pv)+'\\n';" +
  "r2+='\\u2022 Negotiation  ('+nc+' \\u00D7 '+money(ns)+' \\u00D7 60%) = '+money(nv)+'\\n';" +
  "r2+='\\u2022 Closing      ('+cc+' \\u00D7 '+money(cs)+' \\u00D7 80%) = '+money(cv)+'\\n';" +
  "r2+='\\u2022 Total weighted: '+money(t)+'  \\u00B7  Nominal face value: '+money(nom)+'\\n';" +
  "r2+='\\u2022 50% confidence forecast: '+money(fc)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Proposal probability 40%\\u219250%: +'+money(pbt)+' (per deal: '+money(pbpd)+')\\n';" +
  "r2+='\\u2022 Add 1 more Closing deal: +'+money(cao)+' (immediate lift to weighted)\\n';" +
  "r2+='\\u2022 Closing conversion 80%\\u219285%: +'+money(cc*cs*0.05)+' (no extra deals needed)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Break-Even:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Target for \\uD83D\\uDFE2 Excellent: '+money(500000)+' weighted pipeline\\n';" +
  "r2+='\\u2022 Gap to \\uD83D\\uDFE2: '+money(tg)+'\\n';" +
  "r2+='\\u2022 Action: need '+ecn+' more Closing deal(s) at '+money(cdv)+' each (or equivalent from Proposal/Negotiation)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Milestone:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Next tier: '+nt+'\\n';" +
  "r2+='\\u2022 Gap to next tier: '+money(Math.max(0,gn))+(bd==='excellent'?' (already at top)':'')+'\\n';" +
  "r2+='\\u2022 Quarterly revenue at this pace: ~'+money(t*0.25)+'/month (if pipeline converts at 25%/qtr)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCA1 Tip: '+tip+'\\n';" +
  "return [r2];";

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
  generate: calculate,
  staticExamples: ['📊 Pipeline Value Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 Good — mid-market sweet spot; room to grow top-of-funnel\n• Weighted pipeline: $215,000  ·  Nominal pipeline: $470,000\n• Weighted forecast (50% confidence): $107,500  ·  Coverage ratio: 45.7% of nominal\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Discovery    (10 × $15,000 × 20%) = $30,000\n• Proposal     (5 × $25,000 × 40%) = $50,000\n• Negotiation  (3 × $35,000 × 60%) = $63,000\n• Closing      (2 × $45,000 × 80%) = $72,000\n• Total weighted: $215,000  ·  Nominal face value: $470,000\n• 50% confidence forecast: $107,500\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Proposal probability 40%→50%: +$12,500 (per deal: $2,500)\n• Add 1 more Closing deal: +$36,000 (immediate lift to weighted)\n• Closing conversion 80%→85%: +$4,500 (no extra deals needed)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Target for 🟢 Excellent: $500,000 weighted pipeline\n• Gap to 🟢: $285,000\n• Action: need 8 more Closing deal(s) at $36,000 each (or equivalent from Proposal/Negotiation)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Next tier: 🟢 Excellent ($500K)\n• Gap to next tier: $285,000\n• Quarterly revenue at this pace: ~$53,750/month (if pipeline converts at 25%/qtr)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: $200K–$500K is the mid-market sweet spot. To reach Excellent, prioritize deal size (negotiate up) and stage progression (faster cycle). Pair this with a sales velocity calculator to identify which lever (volume × size × win rate ÷ cycle) moves fastest.\n'],
  faq: [
    { q: 'What is a sales pipeline value?', a: 'Pipeline value is the total dollar amount of all deals in your sales pipeline, weighted by the probability each deal will close at its current stage. A weighted pipeline gives you a realistic forecast, while a raw (nominal) pipeline shows your theoretical maximum.' },
    { q: 'How are stage probabilities determined?', a: 'Stage probabilities reflect historical win rates at each stage of your sales funnel. Common defaults: Discovery 20%, Proposal 40%, Negotiation 60%, Closing 80%. Replace these with your own historical conversion rates for a more accurate forecast.' },
    { q: 'Why is the weighted forecast multiplied by 50%?', a: 'The 50% haircut acknowledges that even probability-weighted forecasts tend to over-predict by ~2x. Combining stage probability with a 50% confidence adjustment yields a conservative estimate suitable for board reporting and quota planning.' },
    { q: 'How do I improve a weak pipeline?', a: 'Light pipelines ($50K-$200K) benefit from late-stage acceleration — better sales playbooks, faster follow-up, deal review cadences. Critical pipelines (<$50K) need top-of-funnel work: more Discovery calls, content syndication, paid lead generation, and lead qualification.' },
    { q: 'How does this differ from sales velocity?', a: 'Pipeline value is a static snapshot — what you have right now. Sales velocity measures throughput — how fast your pipeline generates revenue (opps × size × win rate ÷ cycle days). Use pipeline value for forecast accuracy, velocity for productivity optimization.' },
  ],
  howToUse: [
    'Enter the number of deals currently in each pipeline stage (Discovery, Proposal, Negotiation, Closing).',
    'Enter the average deal size for each stage — pull from your CRM or use weighted average across recent closed deals.',
    'Read the weighted pipeline (expected revenue) and nominal pipeline (face value). The gap between them shows probability-adjusted risk.',
    'Use the What-If section to model improvements: faster Closing-stage conversion, more Proposal deals, higher deal size.',
    'Compare to sales velocity (P8-2) to identify whether your bottleneck is volume, size, win rate, or cycle time.',
  ],
};
registerEngine(engine);