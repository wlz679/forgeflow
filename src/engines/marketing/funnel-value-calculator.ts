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
  "function sV(i){return i;}" +
  "function sC(i,c){return i*(c/100);}" +
  "function sL(c,lr){return c*(lr/100);}" +
  "function sS(l,sr){return l*(sr/100);}" +
  "function oCR(s,i){if(i<=0)return 0;return(s/i)*100;}" +
  "function dO(p,c){return Math.max(0,p-c);}" +
  "function bLS(f){var s2=sC(f.i,f.c);var s3=sL(s2,f.l);var s4=sS(s3,f.s);var d12=dO(f.i,s2);var d23=dO(s2,s3);var d34=dO(s3,s4);var m=Math.max(d12,d23,d34);if(m===d12)return'1\\u21922';if(m===d23)return'2\\u21923';return'3\\u21924';}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var f={i:cnn(parseFloat(inputs.impressions)||0),c:cnn(parseFloat(inputs.ctr)||0),l:cnn(parseFloat(inputs.leadRate)||0),s:cnn(parseFloat(inputs.saleRate)||0),a:cnn(parseFloat(inputs.aov)||0),g:cnn(parseFloat(inputs.grossMargin)||0)};" +
  "if(f.i===0){return['\\u23F0 Funnel Value Calculator\\n\\n\\uD83D\\uDCCA Enter impressions, click-through rate, lead conversion rate, sale conversion rate, AOV, and gross margin to see overall funnel conversion rate, biggest drop-off stage, and revenue projections.'];}" +
  "var s2=sC(f.i,f.c);var s3=sL(s2,f.l);var s4=sS(s3,f.s);" +
  "var cr=oCR(s4,f.i);var tR=s4*f.a;var tP=tR*(f.g/100);" +
  "var d12=dO(f.i,s2);var d23=dO(s2,s3);var d34=dO(s3,s4);" +
  "var leak=bLS(f);" +
  "var d12p=f.i>0?(d12/f.i)*100:0;var d23p=s2>0?(d23/s2)*100:0;var d34p=s3>0?(d34/s3)*100:0;" +
  "var hE='',hL='';" +
  "if(cr>=5){hE='\\uD83D\\uDFE2';hL='Excellent \\u2014 overall CR \\u2265 5%; funnel highly optimized';}" +
  "else if(cr>=1){hE='\\uD83D\\uDFE1';hL='Good \\u2014 overall CR 1\\u20135%; profitable with optimization upside';}" +
  "else if(cr>=0.1){hE='\\uD83D\\uDFE0';hL='Warning \\u2014 overall CR 0.1\\u20131%; significant drop-off';}" +
  "else{hE='\\uD83D\\uDD34';hL='Critical \\u2014 overall CR < 0.1%; funnel broken or extreme thin audience';}" +
  "function fmt(n){return n.toLocaleString('en-US',{maximumFractionDigits:1});}" +
  "function money(n){return '$'+Math.round(n).toLocaleString('en-US');}" +
  "var boost=Math.max(f.l*0.3,5);var nLR=f.l+boost;" +
  "var nS3=sL(s2,nLR);var nS4=sS(nS3,f.s);var nCR=oCR(nS4,f.i);var nRev=nS4*f.a;" +
  "var tRev=Math.max(tR,10000);" +
  "var beCR=(tRev/f.a)/f.i*100;var beLR=s2>0?(tRev/f.a/s2)*100:0;" +
  "var s2x=sC(f.i*2,f.c);var s4x=sS(sL(s2x,f.l),f.s);var s2xR=s4x*f.a;var annR=tR*12;" +
  "var tip='';" +
  "if(leak==='1\\u21922'){tip='Biggest leak at the awareness stage (1\\u21922): impressions \\u2192 clickers lost '+d12p.toFixed(0)+'%. Test new ad creative, audience targeting, and channel mix. Most cost-effective lever at this stage.';}" +
  "else if(leak==='2\\u21923'){tip='Biggest leak at the consideration stage (2\\u21923): clickers \\u2192 leads lost '+d23p.toFixed(0)+'%. Audit landing page, headline copy, and CTA. Optimize page-load speed and trust signals.';}" +
  "else if(leak==='3\\u21924'){tip='Biggest leak at the decision stage (3\\u21924): leads \\u2192 sales lost '+d34p.toFixed(0)+'%. Test pricing, sales page, checkout flow. Add social proof, testimonials, and risk-reversal (guarantees).';}" +
  "else{tip='Add data to see stage-specific recommendations.';}" +
  "var r2='';" +
  "r2+='\\u23F0 Funnel Value Calculator\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+hE+' '+hL+'\\n';" +
  "r2+='\\u2022 Overall conversion rate: '+cr.toFixed(3)+'%  \\u00B7  Biggest leak: stage '+leak+'\\n';" +
  "r2+='\\u2022 Revenue: '+money(tR)+'  \\u00B7  Net profit: '+money(tP)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCCA Inputs Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Impressions:  '+fmt(f.i)+'\\n';" +
  "r2+='\\u2022 Clickers:     '+fmt(s2)+'  (CTR '+f.c.toFixed(1)+'%, drop '+d12p.toFixed(1)+'%)\\n';" +
  "r2+='\\u2022 Leads:        '+fmt(s3)+'  (lead rate '+f.l.toFixed(1)+'%, drop '+d23p.toFixed(1)+'%)\\n';" +
  "r2+='\\u2022 Sales:        '+fmt(s4)+'  (sale rate '+f.s.toFixed(1)+'%, drop '+d34p.toFixed(1)+'%)\\n';" +
  "r2+='\\u2022 AOV:          '+money(f.a)+'  \\u00B7  Margin: '+f.g.toFixed(0)+'%\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Lead rate +'+boost.toFixed(1)+'pp ('+f.l.toFixed(1)+'% \\u2192 '+nLR.toFixed(1)+'%):\\n';" +
  "r2+='  \\u2022 Sales: '+fmt(s4)+' \\u2192 '+fmt(nS4)+'  \\u00B7  Revenue: '+money(nRev)+'\\n';" +
  "r2+='  \\u2022 CR: '+cr.toFixed(3)+'% \\u2192 '+nCR.toFixed(3)+'%\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Break-Even:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 To reach '+money(tRev)+' revenue at current AOV: need '+fmt(tRev/f.a)+' sales\\n';" +
  "r2+='  \\u2022 Required overall CR: '+beCR.toFixed(3)+'% (currently '+cr.toFixed(3)+'%)\\n';" +
  "r2+='  \\u2022 Required lead rate: '+beLR.toFixed(1)+'% (currently '+f.l.toFixed(1)+'%)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Milestone:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Scale impressions 2x: '+fmt(s4x)+' sales \\u2192 '+money(s2xR)+' revenue\\n';" +
  "r2+='\\u2022 12-month projection (constant funnel): '+money(annR)+' revenue\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCA1 Tip: '+tip+'\\n';" +
  "return [r2];";

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
  generate: calculate,
  staticExamples: ['⏰ Funnel Value Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🔴 Critical — overall CR < 0.1%; funnel broken or extreme thin audience\n• Overall conversion rate: 0.019%  ·  Biggest leak: stage 1→2\n• Revenue: $1,500  ·  Net profit: $1,050\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Impressions:  100,000\n• Clickers:     2,500  (CTR 2.5%, drop 97.5%)\n• Leads:        375  (lead rate 15.0%, drop 85.0%)\n• Sales:        18.8  (sale rate 5.0%, drop 95.0%)\n• AOV:          $80  ·  Margin: 70%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Lead rate +5.0pp (15.0% → 20.0%):\n  • Sales: 18.8 → 25  ·  Revenue: $2,000\n  • CR: 0.019% → 0.025%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• To reach $10,000 revenue at current AOV: need 125 sales\n  • Required overall CR: 0.125% (currently 0.019%)\n  • Required lead rate: 5.0% (currently 15.0%)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Scale impressions 2x: 37.5 sales → $3,000 revenue\n• 12-month projection (constant funnel): $18,000 revenue\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: Biggest leak at the awareness stage (1→2): impressions → clickers lost 98%. Test new ad creative, audience targeting, and channel mix. Most cost-effective lever at this stage.\n'],
  faq: [
    { q: 'What is a typical funnel conversion rate?', a: 'E-commerce funnels: 1-3% overall CR (impressions → sale). B2B SaaS free-trial funnels: 0.1-1%. Lead-gen funnels: 0.5-2%. Industry varies; benchmark your funnel vs your specific vertical.' },
    { q: 'Where is the biggest leak in most funnels?', a: 'Awareness stage (1→2) — typically 97-99% of impressions never click. Optimization focus: ad creative + targeting. Second-biggest leak varies by business — measure yours.' },
    { q: 'How do I improve a specific stage?', a: 'Stage 1→2 (CTR): test creative, copy, audience. Stage 2→3 (lead rate): landing page, headline, CTA. Stage 3→4 (sale rate): pricing, sales page, checkout, social proof.' },
    { q: 'Should I focus on CTR or conversion rate?', a: 'Both matter but conversion rate has 3-5x more ROI than CTR (a 30% landing page lift often beats a 30% CTR lift). Optimize the bottom of the funnel first.' },
  ],
  howToUse: [
    'Enter top-of-funnel impressions for the period (month, quarter).',
    'Enter your CTR (clickers ÷ impressions × 100).',
    'Enter lead conversion rate (leads ÷ clickers × 100).',
    'Enter sale conversion rate (sales ÷ leads × 100).',
    'Enter AOV (average order value) and gross margin %.',
    'Read the biggest leak — that is your highest-leverage optimization target.',
  ],
};

registerEngine(engine);