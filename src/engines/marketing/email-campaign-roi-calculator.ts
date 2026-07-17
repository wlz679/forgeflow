import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

// =====================================================================
// Email Campaign ROI Calculator (P6-5) — Business v3 standard
// =====================================================================
// Inputs: list size, open rate, CTR, AOV per click, campaign cost, # emails.
// Computes gross/net revenue, ROI %, cost-per-click/open.
// Health bands based on ROI %.

// ============== Health band constants ==============

export const HEALTH_BANDS = {
  excellent: 300,
  good: [100, 300],
  warning: [0, 100],
  critical: 0,
} as const;

// ============== Math helpers (exported for tests) ==============

/** Gross revenue = listSize × numEmails × (openRate/100) × (ctr/100) × aovPerClick */
export function calcGrossRevenue(
  listSize: number,
  openRatePct: number,
  ctrPct: number,
  aovPerClick: number,
  numEmails: number
): number {
  const emailsDelivered = listSize * numEmails;
  const opens = emailsDelivered * (openRatePct / 100);
  const clicks = opens * (ctrPct / 100);
  return clicks * aovPerClick;
}

/** Net revenue = grossRevenue - campaignCost */
export function calcNetRevenue(grossRevenue: number, campaignCost: number): number {
  return grossRevenue - campaignCost;
}

/** ROI % = (netRevenue / campaignCost) × 100. Returns Infinity if cost = 0. */
export function calcROI(netRevenue: number, campaignCost: number): number {
  if (campaignCost <= 0) return Infinity;
  return (netRevenue / campaignCost) * 100;
}

/** Cost per click = campaignCost / clicks. Infinity when clicks = 0. */
export function costPerClick(campaignCost: number, clicks: number): number {
  if (clicks <= 0) return Infinity;
  return campaignCost / clicks;
}

/** Cost per open = campaignCost / opens. Infinity when opens = 0. */
export function costPerOpen(campaignCost: number, opens: number): number {
  if (opens <= 0) return Infinity;
  return campaignCost / opens;
}

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const listSize = clampNonNegative(parseFloat(inputs.listSize) || 0);
  const openRate = clampNonNegative(parseFloat(inputs.openRate) || 0);
  const ctr = clampNonNegative(parseFloat(inputs.ctr) || 0);
  const aovPerClick = clampNonNegative(parseFloat(inputs.aovPerClick) || 0);
  const campaignCost = clampNonNegative(parseFloat(inputs.campaignCost) || 0);
  const numEmails = Math.max(1, parseFloat(inputs.numEmails) || 1);

  // Edge: no list
  if (listSize === 0) {
    return [
      '⏰ Email Campaign ROI Calculator\n\n' +
        '📊 Enter list size, open rate, CTR, AOV per click, campaign cost, and number of emails to see ROI %, cost-per-click/open, and projected scaling outcomes.',
    ];
  }

  const emailsDelivered = listSize * numEmails;
  const opens = emailsDelivered * (openRate / 100);
  const clicks = opens * (ctr / 100);
  const grossRevenue = calcGrossRevenue(listSize, openRate, ctr, aovPerClick, numEmails);
  const netRevenue = calcNetRevenue(grossRevenue, campaignCost);
  const roi = calcROI(netRevenue, campaignCost);
  const cpc = costPerClick(campaignCost, clicks);
  const cpo = costPerOpen(campaignCost, opens);

  // Health band (ROI %)
  let healthEmoji: string;
  let healthLabel: string;
  if (campaignCost > 0 && roi >= HEALTH_BANDS.excellent) {
    healthEmoji = '🟢';
    healthLabel = 'Excellent — ROI ≥ 300%; profitable and scalable';
  } else if (campaignCost > 0 && roi >= HEALTH_BANDS.good[0]) {
    healthEmoji = '🟡';
    healthLabel = 'Good — ROI 100–300%; profitable with optimization upside';
  } else if (campaignCost > 0 && roi >= HEALTH_BANDS.warning[0]) {
    healthEmoji = '🟠';
    healthLabel = 'Warning — ROI 0–100%; breaking even, optimize creative';
  } else if (campaignCost === 0) {
    healthEmoji = '⚪';
    healthLabel = 'No cost entered — ROI infinite; verify cost estimate';
  } else {
    healthEmoji = '🔴';
    healthLabel = 'Critical — ROI < 0%; losing money on this campaign';
  }

  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const money2 = (n: number) => (isFinite(n) ? '$' + n.toFixed(2) : '∞');
  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });

  // What-If: openRate +5pp (typical improvement from subject-line testing)
  const openRateBoost = 5;
  const newOpenRate = openRate + openRateBoost;
  const newOpens = emailsDelivered * (newOpenRate / 100);
  const newClicks = newOpens * (ctr / 100);
  const newRevenue = newClicks * aovPerClick;
  const newROI = campaignCost > 0 ? ((newRevenue - campaignCost) / campaignCost) * 100 : Infinity;

  // Break-Even: target ROI = 300%
  const targetROI = HEALTH_BANDS.excellent;
  const breakEvenRevenue = campaignCost * (targetROI / 100) + campaignCost;
  const breakEvenClicks = aovPerClick > 0 ? breakEvenRevenue / aovPerClick : 0;
  const breakEvenOpenRate = ctr > 0 && numEmails > 0 ? (breakEvenClicks / (listSize * numEmails)) / (ctr / 100) : 0;

  // Milestone: scaling with list growth +5%/quarter
  const quarterlyListSizes = [listSize, listSize * 1.05, listSize * 1.1025, listSize * 1.1576]; // +5% compound
  const annualRevenue = quarterlyListSizes.reduce(
    (acc, qSize, i) => acc + calcGrossRevenue(qSize, openRate, ctr, aovPerClick, numEmails),
    0,
  );
  const annualCost = campaignCost * 4;
  const annualNet = annualRevenue - annualCost;
  const annualROI = annualCost > 0 ? (annualNet / annualCost) * 100 : Infinity;

  // Tip
  let tip: string;
  if (campaignCost === 0) {
    tip = 'Enter a realistic campaign cost (copy + design + ESP fees) to see accurate ROI. Email costs typically run $200–$2K for SMB campaigns.';
  } else if (roi < 0) {
    tip = 'You are losing money on this campaign. Audit open rate first (subject lines), then CTR (CTA placement, copy). Consider list segmentation — engaged subscribers convert 2-5x better.';
  } else if (openRate < 21) {
    tip = 'Open rate below industry average (21% per HubSpot 2024). Test new subject lines — short, personalized, with curiosity. List hygiene also matters: remove inactive subscribers monthly.';
  } else if (ctr < 2) {
    tip = 'Open rate OK but CTR low. Test CTA placement (above fold), link count (1-3 max), and button color. Clear value prop above the fold typically doubles CTR.';
  } else if (roi >= HEALTH_BANDS.excellent) {
    tip = 'Excellent ROI. Scale send cadence (weekly → 2-3x/week), test list segmentation, and refresh creative monthly. Don\'t let audience fatigue set in.';
  } else {
    tip = 'Good ROI but with room to optimize. Test A/B variants of subject lines, body copy, and CTAs. A 30% open rate improvement at this band could push ROI into 🟢.';
  }

  const r =
    '⏰ Email Campaign ROI Calculator\n\n' +
    '🩺 Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• Gross revenue: ' + money(grossRevenue) + '  ·  Net revenue: ' + money(netRevenue) + '\n' +
    '• Industry benchmark open rate: 21% (yours: ' + openRate.toFixed(1) + '%)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Inputs Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• List size:       ' + fmt(listSize) + '\n' +
    '• Emails sent:     ' + fmt(emailsDelivered) + '  (' + numEmails + ' per subscriber)\n' +
    '• Opens:           ' + fmt(opens) + '  (' + openRate.toFixed(1) + '% open rate)\n' +
    '• Clicks:          ' + fmt(clicks) + '  (' + ctr.toFixed(1) + '% CTR)\n' +
    '• AOV per click:   ' + money(aovPerClick) + '\n' +
    '• Campaign cost:   ' + money(campaignCost) + '\n' +
    '• ROI:             ' + (isFinite(roi) ? roi.toFixed(0) + '%' : '∞') + '\n' +
    '• Cost per click:  ' + money2(cpc) + '  ·  Cost per open: ' + money2(cpo) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Open rate +5pp (' + openRate.toFixed(1) + '% → ' + newOpenRate.toFixed(1) + '%):\n' +
    '  • Revenue: ' + money(grossRevenue) + ' → ' + money(newRevenue) + ' (+' + money(newRevenue - grossRevenue) + ')\n' +
    '  • ROI: ' + (isFinite(roi) ? roi.toFixed(0) : '∞') + '% → ' + (isFinite(newROI) ? newROI.toFixed(0) : '∞') + '%\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• To hit 🟢 ROI (' + targetROI + '%):\n' +
    '  • Required revenue: ' + money(breakEvenRevenue) + '  (currently ' + money(grossRevenue) + ')\n' +
    '  • Required clicks: ' + fmt(breakEvenClicks) + '  ·  Required open rate: ' + breakEvenOpenRate.toFixed(1) + '% (currently ' + openRate.toFixed(1) + '%)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Milestone:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Annual projection (list +5%/quarter):\n' +
    '  • Revenue: ' + money(annualRevenue) + '  ·  Cost: ' + money(annualCost) + '\n' +
    '  • Net: ' + money(annualNet) + '  ·  Annual ROI: ' + (isFinite(annualROI) ? annualROI.toFixed(0) + '%' : '∞') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  return [r];
}

// ============== customFn (minified, mirrors calculate()) ==============

const customFn =
  "function cGR(ls,o,ct,av,ne){var ed=ls*ne;var op=ed*(o/100);var cl=op*(ct/100);return cl*av;}" +
  "function cNR(gr,cc){return gr-cc;}" +
  "function cROI(nr,cc){if(cc<=0)return Infinity;return(nr/cc)*100;}" +
  "function cPC(cc,cl){if(cl<=0)return Infinity;return cc/cl;}" +
  "function cPO(cc,op){if(op<=0)return Infinity;return cc/op;}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var ls=cnn(parseFloat(inputs.listSize)||0);" +
  "var or2=cnn(parseFloat(inputs.openRate)||0);" +
  "var ctr2=cnn(parseFloat(inputs.ctr)||0);" +
  "var av=cnn(parseFloat(inputs.aovPerClick)||0);" +
  "var cc=cnn(parseFloat(inputs.campaignCost)||0);" +
  "var ne=Math.max(1,parseFloat(inputs.numEmails)||1);" +
  "if(ls===0){return['\\u23F0 Email Campaign ROI Calculator\\n\\n\\uD83D\\uDCCA Enter list size, open rate, CTR, AOV per click, campaign cost, and number of emails to see ROI %, cost-per-click/open, and projected scaling outcomes.'];}" +
  "var ed=ls*ne;var op=ed*(or2/100);var cl=op*(ctr2/100);" +
  "var gr=cGR(ls,or2,ctr2,av,ne);var nr=cNR(gr,cc);var roi=cROI(nr,cc);" +
  "var pc=cPC(cc,cl);var po=cPO(cc,op);" +
  "var hE='',hL='';" +
  "if(cc>0&&roi>=300){hE='\\uD83D\\uDFE2';hL='Excellent \\u2014 ROI \\u2265 300%; profitable and scalable';}" +
  "else if(cc>0&&roi>=100){hE='\\uD83D\\uDFE1';hL='Good \\u2014 ROI 100\\u2013300%; profitable with optimization upside';}" +
  "else if(cc>0&&roi>=0){hE='\\uD83D\\uDFE0';hL='Warning \\u2014 ROI 0\\u2013100%; breaking even, optimize creative';}" +
  "else if(cc===0){hE='\\u26AA';hL='No cost entered \\u2014 ROI infinite; verify cost estimate';}" +
  "else{hE='\\uD83D\\uDD34';hL='Critical \\u2014 ROI < 0%; losing money on this campaign';}" +
  "function money(n){return '$'+Math.round(n).toLocaleString('en-US');}" +
  "function money2(n){return isFinite(n)?'$'+n.toFixed(2):'\\u221E';}" +
  "function fmt(n){return n.toLocaleString('en-US',{maximumFractionDigits:0});}" +
  "var boost=5;var nO=or2+boost;var nOp2=ed*(nO/100);var nCl2=nOp2*(ctr2/100);" +
  "var nRev=nCl2*av;var nROI2=cc>0?((nRev-cc)/cc)*100:Infinity;" +
  "var tROI=300;var beR=cc*(tROI/100)+cc;var beCl=av>0?beR/av:0;" +
  "var beOR=ctr2>0&&ne>0?(beCl/(ls*ne))/(ctr2/100):0;" +
  "var qSizes=[ls,ls*1.05,ls*1.1025,ls*1.1576];" +
  "var annR=qSizes.reduce(function(a,q,i){return a+cGR(q,or2,ctr2,av,ne);},0);" +
  "var annC=cc*4;var annN=annR-annC;var annROI=annC>0?(annN/annC)*100:Infinity;" +
  "var tip='';" +
  "if(cc===0){tip='Enter a realistic campaign cost (copy + design + ESP fees) to see accurate ROI. Email costs typically run $200\\u2013$2K for SMB campaigns.';}" +
  "else if(roi<0){tip='You are losing money on this campaign. Audit open rate first (subject lines), then CTR (CTA placement, copy). Consider list segmentation \\u2014 engaged subscribers convert 2-5x better.';}" +
  "else if(or2<21){tip='Open rate below industry average (21% per HubSpot 2024). Test new subject lines \\u2014 short, personalized, with curiosity. List hygiene also matters: remove inactive subscribers monthly.';}" +
  "else if(ctr2<2){tip='Open rate OK but CTR low. Test CTA placement (above fold), link count (1-3 max), and button color. Clear value prop above the fold typically doubles CTR.';}" +
  "else if(roi>=300){tip='Excellent ROI. Scale send cadence (weekly \\u2192 2-3x/week), test list segmentation, and refresh creative monthly. Don\\'t let audience fatigue set in.';}" +
  "else{tip='Good ROI but with room to optimize. Test A/B variants of subject lines, body copy, and CTAs. A 30% open rate improvement at this band could push ROI into \\uD83D\\uDFE2.';}" +
  "var r2='';" +
  "r2+='\\u23F0 Email Campaign ROI Calculator\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+hE+' '+hL+'\\n';" +
  "r2+='\\u2022 Gross revenue: '+money(gr)+'  \\u00B7  Net revenue: '+money(nr)+'\\n';" +
  "r2+='\\u2022 Industry benchmark open rate: 21% (yours: '+or2.toFixed(1)+'%)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCCA Inputs Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 List size:       '+fmt(ls)+'\\n';" +
  "r2+='\\u2022 Emails sent:     '+fmt(ed)+'  ('+ne+' per subscriber)\\n';" +
  "r2+='\\u2022 Opens:           '+fmt(op)+'  ('+or2.toFixed(1)+'% open rate)\\n';" +
  "r2+='\\u2022 Clicks:          '+fmt(cl)+'  ('+ctr2.toFixed(1)+'% CTR)\\n';" +
  "r2+='\\u2022 AOV per click:   '+money(av)+'\\n';" +
  "r2+='\\u2022 Campaign cost:   '+money(cc)+'\\n';" +
  "r2+='\\u2022 ROI:             '+(isFinite(roi)?roi.toFixed(0)+'%':'\\u221E')+'\\n';" +
  "r2+='\\u2022 Cost per click:  '+money2(pc)+'  \\u00B7  Cost per open: '+money2(po)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Open rate +5pp ('+or2.toFixed(1)+'% \\u2192 '+nO.toFixed(1)+'%):\\n';" +
  "r2+='  \\u2022 Revenue: '+money(gr)+' \\u2192 '+money(nRev)+' (+'+money(nRev-gr)+')\\n';" +
  "r2+='  \\u2022 ROI: '+(isFinite(roi)?roi.toFixed(0):'\\u221E')+'% \\u2192 '+(isFinite(nROI2)?nROI2.toFixed(0):'\\u221E')+'%\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Break-Even:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 To hit \\uD83D\\uDFE2 ROI ('+tROI+'%):\\n';" +
  "r2+='  \\u2022 Required revenue: '+money(beR)+'  (currently '+money(gr)+')\\n';" +
  "r2+='  \\u2022 Required clicks: '+fmt(beCl)+'  \\u00B7  Required open rate: '+beOR.toFixed(1)+'% (currently '+or2.toFixed(1)+'%)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Milestone:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Annual projection (list +5%/quarter):\\n';" +
  "r2+='  \\u2022 Revenue: '+money(annR)+'  \\u00B7  Cost: '+money(annC)+'\\n';" +
  "r2+='  \\u2022 Net: '+money(annN)+'  \\u00B7  Annual ROI: '+(isFinite(annROI)?annROI.toFixed(0)+'%':'\\u221E')+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCA1 Tip: '+tip+'\\n';" +
  "return [r2];";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-email-campaign-roi-calculator',
  title: 'Email Campaign ROI Calculator',
  description:
    'Measure email campaign ROI: gross/net revenue, cost-per-click/open, and projected scaling. Industry benchmark open rate 21% included. Health: 🟢 ≥300% ROI · 🟡 100–300% · 🟠 0–100% · 🔴 <0%.',
  categoryId: 'M',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'listSize', label: 'Email List Size (subscribers)', placeholder: 'e.g. 10000', type: 'number' },
    { name: 'openRate', label: 'Open Rate (%)', placeholder: 'e.g. 25', type: 'number' },
    { name: 'ctr', label: 'Click-Through Rate (% of openers)', placeholder: 'e.g. 5', type: 'number' },
    { name: 'aovPerClick', label: 'Revenue per Click ($)', placeholder: 'e.g. 25', type: 'number' },
    { name: 'campaignCost', label: 'Campaign Cost ($)', placeholder: 'e.g. 500', type: 'number' },
    { name: 'numEmails', label: 'Number of Emails in Campaign', placeholder: 'e.g. 4', type: 'number' },
  ],
  keywords: [
    'email campaign ROI',
    'email marketing ROI',
    'email ROI calculator',
    'email open rate',
    'email CTR',
    'newsletter ROI',
    'email list monetization',
    'campaign cost',
    'cost per click',
    'email marketing benchmark',
  ],
  tags: ['marketing', 'email', 'roi'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-06',
  sources: [
    'https://blog.hubspot.com/marketing/email-marketing-roi',
    'https://www.campaignmonitor.com/resources/guides/email-marketing-roi/',
    'https://mailchimp.com/resources/email-marketing-benchmarks/',
    'https://www.salesforce.com/resources/articles/email-marketing-stats/',
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  calculate,
  generate: calculate,
  staticExamples: ['⏰ Email Campaign ROI Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 Excellent — ROI ≥ 300%; profitable and scalable\n• Gross revenue: $12,500  ·  Net revenue: $12,000\n• Industry benchmark open rate: 21% (yours: 25.0%)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• List size:       10,000\n• Emails sent:     40,000  (4 per subscriber)\n• Opens:           10,000  (25.0% open rate)\n• Clicks:          500  (5.0% CTR)\n• AOV per click:   $25\n• Campaign cost:   $500\n• ROI:             2400%\n• Cost per click:  $1.00  ·  Cost per open: $0.05\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Open rate +5pp (25.0% → 30.0%):\n  • Revenue: $12,500 → $15,000 (+$2,500)\n  • ROI: 2400% → 2900%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• To hit 🟢 ROI (300%):\n  • Required revenue: $2,000  (currently $12,500)\n  • Required clicks: 80  ·  Required open rate: 0.0% (currently 25.0%)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Annual projection (list +5%/quarter):\n  • Revenue: $53,876  ·  Cost: $2,000\n  • Net: $51,876  ·  Annual ROI: 2594%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: Excellent ROI. Scale send cadence (weekly → 2-3x/week), test list segmentation, and refresh creative monthly. Don\'t let audience fatigue set in.\n'],
  faq: [
    { q: 'What is a good email open rate?', a: 'Average: 21% (HubSpot 2024). Good: 25-30%. Excellent: >30%. Varies by industry — B2B typically higher than B2C. Subject line, sender name, and send time all impact open rate.' },
    { q: 'What is a typical email campaign ROI?', a: 'DMA reports email ROI at $36-$42 per $1 spent — the highest of any marketing channel. Most solopreneur campaigns achieve 200-500% ROI on warm lists.' },
    { q: 'How many emails should be in a campaign?', a: 'For product launches: 3-5 emails over 2 weeks. For newsletters: 1 per week. For launches: 5-7 emails over 10 days. Avoid sending more than 1/day — list fatigue.' },
    { q: 'Should I include HTML cost in campaign cost?', a: 'Yes. Total cost = copywriting + design + ESP fee + list management. For SMB campaigns: $200-$2K. For enterprise: $5K-$20K. Otherwise ROI is overstated.' },
  ],
  howToUse: [
    'Enter your email list size (active subscribers).',
    'Enter expected/actual open rate (industry average 21%).',
    'Enter click-through rate (typically 2-5%).',
    'Enter revenue per click (AOV or estimated average).',
    'Include ALL costs: copywriting, design, ESP fees.',
    'Enter number of emails in the campaign (1-10 typical).',
  ],
  engineKey: true,
};

registerEngine(engine);