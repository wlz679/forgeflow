import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-9：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

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
      '$calc_out.section.email_campaign_roi_calculator|⏰ Email Campaign ROI Calculator|\n\n' +
        makeToken(
          'calc_out.email_campaign_roi.row.enter_prompt',
          '📊 Enter list size, open rate, CTR, AOV per click, campaign cost, and number of emails to see ROI %, cost-per-click/open, and projected scaling outcomes.',
        ),
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

  // ── P168 B3-9：健康度整行 → token（5 档各写一个 **code 字面量**；兜底取 healthEmoji + healthLabel ⇒ emoji 不会走样）
  const healthRow =
    campaignCost > 0 && roi >= HEALTH_BANDS.excellent
      ? makeToken('calc_out.email_campaign_roi.row.health_excellent', healthEmoji + ' ' + healthLabel)
      : campaignCost > 0 && roi >= HEALTH_BANDS.good[0]
      ? makeToken('calc_out.email_campaign_roi.row.health_good', healthEmoji + ' ' + healthLabel)
      : campaignCost > 0 && roi >= HEALTH_BANDS.warning[0]
      ? makeToken('calc_out.email_campaign_roi.row.health_warning', healthEmoji + ' ' + healthLabel)
      : campaignCost === 0
      ? makeToken('calc_out.email_campaign_roi.row.health_no_cost', healthEmoji + ' ' + healthLabel)
      : makeToken('calc_out.email_campaign_roi.row.health_critical', healthEmoji + ' ' + healthLabel);

  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const money2 = (n: number) => (isFinite(n) ? '$' + n.toFixed(2) : '∞');
  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  // P168 B3-9：∞ 单独取一个变量（兜底里要用 ⇒ 只手打一次）
  const infMark = '∞';

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

  // ── P168 B3-9：Tip 整行 → token（6 种形态各写一个 code 字面量）
  const tipToken =
    campaignCost === 0
      ? makeToken('calc_out.email_campaign_roi.row.tip_no_cost', '💡 Tip: ' + tip)
      : roi < 0
      ? makeToken('calc_out.email_campaign_roi.row.tip_negative_roi', '💡 Tip: ' + tip)
      : openRate < 21
      ? makeToken('calc_out.email_campaign_roi.row.tip_low_open_rate', '💡 Tip: ' + tip)
      : ctr < 2
      ? makeToken('calc_out.email_campaign_roi.row.tip_low_ctr', '💡 Tip: ' + tip)
      : roi >= HEALTH_BANDS.excellent
      ? makeToken('calc_out.email_campaign_roi.row.tip_excellent', '💡 Tip: ' + tip)
      : makeToken('calc_out.email_campaign_roi.row.tip_good', '💡 Tip: ' + tip);

  const r =
    '$calc_out.section.email_campaign_roi_calculator|⏰ Email Campaign ROI Calculator|\n\n' +
    '$calc_out.section.health|🩺 Health:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthRow + '\n' +
    '• $calc_out.label.gross_revenue|Gross revenue|: ' + money(grossRevenue) + '  ·  $calc_out.label.net_revenue|Net revenue|: ' + money(netRevenue) + '\n' +
    '• $calc_out.label.industry_benchmark_open_rate|Industry benchmark open rate|: ' + makeToken('calc_out.email_campaign_roi.row.benchmark_open_rate', '21% (yours: ' + openRate.toFixed(1) + '%)', { open: openRate.toFixed(1) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• $calc_out.label.list_size|List size|:       ' + fmt(listSize) + '\n' +
    '• $calc_out.label.emails_sent|Emails sent|:     ' + makeToken('calc_out.email_campaign_roi.row.emails_sent_detail', fmt(emailsDelivered) + '  (' + numEmails + ' per subscriber)', { count: fmt(emailsDelivered), emails: String(numEmails) }) + '\n' +
    '• $calc_out.label.opens|Opens|:           ' + makeToken('calc_out.email_campaign_roi.row.opens_detail', fmt(opens) + '  (' + openRate.toFixed(1) + '% open rate)', { count: fmt(opens), open: openRate.toFixed(1) }) + '\n' +
    '• $calc_out.label.clicks|Clicks|:          ' + makeToken('calc_out.email_campaign_roi.row.clicks_detail', fmt(clicks) + '  (' + ctr.toFixed(1) + '% CTR)', { count: fmt(clicks), ctr: ctr.toFixed(1) }) + '\n' +
    '• $calc_out.label.aov_per_click|AOV per click|:   ' + money(aovPerClick) + '\n' +
    '• $calc_out.label.campaign_cost|Campaign cost|:   ' + money(campaignCost) + '\n' +
    '• $calc_out.label.roi|ROI|:             ' + (isFinite(roi) ? roi.toFixed(0) + '%' : infMark) + '\n' +
    '• $calc_out.label.cost_per_click|Cost per click|:  ' + money2(cpc) + '  ·  $calc_out.label.cost_per_open|Cost per open|: ' + money2(cpo) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.what_if|🔄 What-If:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.email_campaign_roi.row.whatif_open_rate_boost', 'Open rate +5pp (' + openRate.toFixed(1) + '% → ' + newOpenRate.toFixed(1) + '%):', { from: openRate.toFixed(1), to: newOpenRate.toFixed(1) }) + '\n' +
    '  • $calc_out.label.revenue|Revenue|: ' + makeToken('calc_out.email_campaign_roi.row.whatif_revenue', money(grossRevenue) + ' → ' + money(newRevenue) + ' (+' + money(newRevenue - grossRevenue) + ')', { from: money(grossRevenue), to: money(newRevenue), delta: money(newRevenue - grossRevenue) }) + '\n' +
    '  • $calc_out.label.roi|ROI|: ' + makeToken('calc_out.email_campaign_roi.row.whatif_roi', (isFinite(roi) ? roi.toFixed(0) : infMark) + '% → ' + (isFinite(newROI) ? newROI.toFixed(0) : infMark) + '%', { from: isFinite(roi) ? roi.toFixed(0) : infMark, to: isFinite(newROI) ? newROI.toFixed(0) : infMark }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.break_even|⚖️ Break-Even:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.email_campaign_roi.row.break_even_target', 'To hit 🟢 ROI (' + targetROI + '%):', { target: String(targetROI) }) + '\n' +
    '  • $calc_out.label.required_revenue|Required revenue|: ' + makeToken('calc_out.email_campaign_roi.row.break_even_required_revenue', money(breakEvenRevenue) + '  (currently ' + money(grossRevenue) + ')', { need: money(breakEvenRevenue), now: money(grossRevenue) }) + '\n' +
    '  • $calc_out.label.required_clicks|Required clicks|: ' + fmt(breakEvenClicks) + '  ·  $calc_out.label.required_open_rate|Required open rate|: ' + makeToken('calc_out.email_campaign_roi.row.break_even_required_open_rate', breakEvenOpenRate.toFixed(1) + '% (currently ' + openRate.toFixed(1) + '%)', { need: breakEvenOpenRate.toFixed(1), now: openRate.toFixed(1) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.milestone|🎯 Milestone:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.email_campaign_roi.row.annual_projection', 'Annual projection (list +5%/quarter):') + '\n' +
    '  • $calc_out.label.revenue|Revenue|: ' + money(annualRevenue) + '  ·  $calc_out.label.cost|Cost|: ' + money(annualCost) + '\n' +
    '  • $calc_out.label.net_amount|Net|: ' + money(annualNet) + '  ·  $calc_out.label.annual_roi|Annual ROI|: ' + (isFinite(annualROI) ? annualROI.toFixed(0) + '%' : infMark) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tipToken + '\n';

  return [r];
}

// ============== customFn (minified, mirrors calculate()) ==============

const customFn =
  // P168 B3-9：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 服务端与客户端输出逐字节相同，不可能漂；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS +
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
  "if(ls===0){return['$calc_out.section.email_campaign_roi_calculator|\\u23F0 Email Campaign ROI Calculator|\\n\\n'+tk('calc_out.email_campaign_roi.row.enter_prompt','\\uD83D\\uDCCA Enter list size, open rate, CTR, AOV per click, campaign cost, and number of emails to see ROI %, cost-per-click/open, and projected scaling outcomes.')];}" +
  "var ed=ls*ne;var op=ed*(or2/100);var cl=op*(ctr2/100);" +
  "var gr=cGR(ls,or2,ctr2,av,ne);var nr=cNR(gr,cc);var roi=cROI(nr,cc);" +
  "var pc=cPC(cc,cl);var po=cPO(cc,op);" +
  "var hE='',hL='';" +
  "if(cc>0&&roi>=300){hE='\\uD83D\\uDFE2';hL='Excellent \\u2014 ROI \\u2265 300%; profitable and scalable';}" +
  "else if(cc>0&&roi>=100){hE='\\uD83D\\uDFE1';hL='Good \\u2014 ROI 100\\u2013300%; profitable with optimization upside';}" +
  "else if(cc>0&&roi>=0){hE='\\uD83D\\uDFE0';hL='Warning \\u2014 ROI 0\\u2013100%; breaking even, optimize creative';}" +
  "else if(cc===0){hE='\\u26AA';hL='No cost entered \\u2014 ROI infinite; verify cost estimate';}" +
  "else{hE='\\uD83D\\uDD34';hL='Critical \\u2014 ROI < 0%; losing money on this campaign';}" +
  "var hT=cc>0&&roi>=300?tk('calc_out.email_campaign_roi.row.health_excellent',hE+' '+hL):cc>0&&roi>=100?tk('calc_out.email_campaign_roi.row.health_good',hE+' '+hL):cc>0&&roi>=0?tk('calc_out.email_campaign_roi.row.health_warning',hE+' '+hL):cc===0?tk('calc_out.email_campaign_roi.row.health_no_cost',hE+' '+hL):tk('calc_out.email_campaign_roi.row.health_critical',hE+' '+hL);" +
  "function money(n){return '$'+Math.round(n).toLocaleString('en-US');}" +
  "function money2(n){return isFinite(n)?'$'+n.toFixed(2):'\\u221E';}" +
  "function fmt(n){return n.toLocaleString('en-US',{maximumFractionDigits:0});}" +
  "var infMark='\\u221E';" +
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
  "var tipToken=cc===0?tk('calc_out.email_campaign_roi.row.tip_no_cost','\\uD83D\\uDCA1 Tip: '+tip):roi<0?tk('calc_out.email_campaign_roi.row.tip_negative_roi','\\uD83D\\uDCA1 Tip: '+tip):or2<21?tk('calc_out.email_campaign_roi.row.tip_low_open_rate','\\uD83D\\uDCA1 Tip: '+tip):ctr2<2?tk('calc_out.email_campaign_roi.row.tip_low_ctr','\\uD83D\\uDCA1 Tip: '+tip):roi>=300?tk('calc_out.email_campaign_roi.row.tip_excellent','\\uD83D\\uDCA1 Tip: '+tip):tk('calc_out.email_campaign_roi.row.tip_good','\\uD83D\\uDCA1 Tip: '+tip);" +
  "var r2='';" +
  "r2+='$calc_out.section.email_campaign_roi_calculator|\\u23F0 Email Campaign ROI Calculator|\\n\\n';" +
  "r2+='$calc_out.section.health|\\uD83E\\uDE7A Health:|\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+hT+'\\n';" +
  "r2+='\\u2022 $calc_out.label.gross_revenue|Gross revenue|: '+money(gr)+'  \\u00B7  $calc_out.label.net_revenue|Net revenue|: '+money(nr)+'\\n';" +
  "r2+='\\u2022 $calc_out.label.industry_benchmark_open_rate|Industry benchmark open rate|: '+tk('calc_out.email_campaign_roi.row.benchmark_open_rate','21% (yours: '+or2.toFixed(1)+'%)',{open:or2.toFixed(1)})+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='$calc_out.section.inputs_snapshot|\\uD83D\\uDCCA Inputs Snapshot:|\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 $calc_out.label.list_size|List size|:       '+fmt(ls)+'\\n';" +
  "r2+='\\u2022 $calc_out.label.emails_sent|Emails sent|:     '+tk('calc_out.email_campaign_roi.row.emails_sent_detail',fmt(ed)+'  ('+ne+' per subscriber)',{count:fmt(ed),emails:String(ne)})+'\\n';" +
  "r2+='\\u2022 $calc_out.label.opens|Opens|:           '+tk('calc_out.email_campaign_roi.row.opens_detail',fmt(op)+'  ('+or2.toFixed(1)+'% open rate)',{count:fmt(op),open:or2.toFixed(1)})+'\\n';" +
  "r2+='\\u2022 $calc_out.label.clicks|Clicks|:          '+tk('calc_out.email_campaign_roi.row.clicks_detail',fmt(cl)+'  ('+ctr2.toFixed(1)+'% CTR)',{count:fmt(cl),ctr:ctr2.toFixed(1)})+'\\n';" +
  "r2+='\\u2022 $calc_out.label.aov_per_click|AOV per click|:   '+money(av)+'\\n';" +
  "r2+='\\u2022 $calc_out.label.campaign_cost|Campaign cost|:   '+money(cc)+'\\n';" +
  "r2+='\\u2022 $calc_out.label.roi|ROI|:             '+(isFinite(roi)?roi.toFixed(0)+'%':infMark)+'\\n';" +
  "r2+='\\u2022 $calc_out.label.cost_per_click|Cost per click|:  '+money2(pc)+'  \\u00B7  $calc_out.label.cost_per_open|Cost per open|: '+money2(po)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='$calc_out.section.what_if|\\uD83D\\uDD04 What-If:|\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+tk('calc_out.email_campaign_roi.row.whatif_open_rate_boost','Open rate +5pp ('+or2.toFixed(1)+'% \\u2192 '+nO.toFixed(1)+'%):',{from:or2.toFixed(1),to:nO.toFixed(1)})+'\\n';" +
  "r2+='  \\u2022 $calc_out.label.revenue|Revenue|: '+tk('calc_out.email_campaign_roi.row.whatif_revenue',money(gr)+' \\u2192 '+money(nRev)+' (+'+money(nRev-gr)+')',{from:money(gr),to:money(nRev),delta:money(nRev-gr)})+'\\n';" +
  "r2+='  \\u2022 $calc_out.label.roi|ROI|: '+tk('calc_out.email_campaign_roi.row.whatif_roi',(isFinite(roi)?roi.toFixed(0):infMark)+'% \\u2192 '+(isFinite(nROI2)?nROI2.toFixed(0):infMark)+'%',{from:isFinite(roi)?roi.toFixed(0):infMark,to:isFinite(nROI2)?nROI2.toFixed(0):infMark})+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='$calc_out.section.break_even|\\u2696\\uFE0F Break-Even:|\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+tk('calc_out.email_campaign_roi.row.break_even_target','To hit \\uD83D\\uDFE2 ROI ('+tROI+'%):',{target:String(tROI)})+'\\n';" +
  "r2+='  \\u2022 $calc_out.label.required_revenue|Required revenue|: '+tk('calc_out.email_campaign_roi.row.break_even_required_revenue',money(beR)+'  (currently '+money(gr)+')',{need:money(beR),now:money(gr)})+'\\n';" +
  "r2+='  \\u2022 $calc_out.label.required_clicks|Required clicks|: '+fmt(beCl)+'  \\u00B7  $calc_out.label.required_open_rate|Required open rate|: '+tk('calc_out.email_campaign_roi.row.break_even_required_open_rate',beOR.toFixed(1)+'% (currently '+or2.toFixed(1)+'%)',{need:beOR.toFixed(1),now:or2.toFixed(1)})+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='$calc_out.section.milestone|\\uD83C\\uDFAF Milestone:|\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+tk('calc_out.email_campaign_roi.row.annual_projection','Annual projection (list +5%/quarter):')+'\\n';" +
  "r2+='  \\u2022 $calc_out.label.revenue|Revenue|: '+money(annR)+'  \\u00B7  $calc_out.label.cost|Cost|: '+money(annC)+'\\n';" +
  "r2+='  \\u2022 $calc_out.label.net_amount|Net|: '+money(annN)+'  \\u00B7  $calc_out.label.annual_roi|Annual ROI|: '+(isFinite(annROI)?annROI.toFixed(0)+'%':infMark)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=tipToken+'\\n';" +
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
  staticExamples: ['$calc_out.section.email_campaign_roi_calculator|⏰ Email Campaign ROI Calculator|\n\n$calc_out.section.health|🩺 Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.email_campaign_roi.row.health_excellent|🟢 Excellent — ROI ≥ 300%; profitable and scalable|\n• $calc_out.label.gross_revenue|Gross revenue|: $12,500  ·  $calc_out.label.net_revenue|Net revenue|: $12,000\n• $calc_out.label.industry_benchmark_open_rate|Industry benchmark open rate|: $calc_out.email_campaign_roi.row.benchmark_open_rate{"open":"25.0"}|21% (yours: 25.0%)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.list_size|List size|:       10,000\n• $calc_out.label.emails_sent|Emails sent|:     $calc_out.email_campaign_roi.row.emails_sent_detail{"count":"40,000","emails":"4"}|40,000  (4 per subscriber)|\n• $calc_out.label.opens|Opens|:           $calc_out.email_campaign_roi.row.opens_detail{"count":"10,000","open":"25.0"}|10,000  (25.0% open rate)|\n• $calc_out.label.clicks|Clicks|:          $calc_out.email_campaign_roi.row.clicks_detail{"count":"500","ctr":"5.0"}|500  (5.0% CTR)|\n• $calc_out.label.aov_per_click|AOV per click|:   $25\n• $calc_out.label.campaign_cost|Campaign cost|:   $500\n• $calc_out.label.roi|ROI|:             2400%\n• $calc_out.label.cost_per_click|Cost per click|:  $1.00  ·  $calc_out.label.cost_per_open|Cost per open|: $0.05\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if|🔄 What-If:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.email_campaign_roi.row.whatif_open_rate_boost{"from":"25.0","to":"30.0"}|Open rate +5pp (25.0% → 30.0%):|\n  • $calc_out.label.revenue|Revenue|: $calc_out.email_campaign_roi.row.whatif_revenue{"from":"$12,500","to":"$15,000","delta":"$2,500"}|$12,500 → $15,000 (+$2,500)|\n  • $calc_out.label.roi|ROI|: $calc_out.email_campaign_roi.row.whatif_roi{"from":"2400","to":"2900"}|2400% → 2900%|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.break_even|⚖️ Break-Even:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.email_campaign_roi.row.break_even_target{"target":"300"}|To hit 🟢 ROI (300%):|\n  • $calc_out.label.required_revenue|Required revenue|: $calc_out.email_campaign_roi.row.break_even_required_revenue{"need":"$2,000","now":"$12,500"}|$2,000  (currently $12,500)|\n  • $calc_out.label.required_clicks|Required clicks|: 80  ·  $calc_out.label.required_open_rate|Required open rate|: $calc_out.email_campaign_roi.row.break_even_required_open_rate{"need":"0.0","now":"25.0"}|0.0% (currently 25.0%)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.milestone|🎯 Milestone:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.email_campaign_roi.row.annual_projection|Annual projection (list +5%/quarter):|\n  • $calc_out.label.revenue|Revenue|: $53,876  ·  $calc_out.label.cost|Cost|: $2,000\n  • $calc_out.label.net_amount|Net|: $51,876  ·  $calc_out.label.annual_roi|Annual ROI|: 2594%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.email_campaign_roi.row.tip_excellent|💡 Tip: Excellent ROI. Scale send cadence (weekly → 2-3x/week), test list segmentation, and refresh creative monthly. Don\'t let audience fatigue set in.|\n'],
  faq: [
    { q: 'What is a good email open rate?', a: 'Average: 21% (HubSpot 2024). Good: 25-30%. Excellent: >30%. Varies by industry — B2B typically higher than B2C. Subject line, sender name, and send time all impact open rate.' },
    { q: 'What is a typical email campaign ROI?', a: 'DMA reports email ROI at $36-$42 per $1 spent — the highest of any marketing channel. Most solopreneur campaigns achieve 200-500% ROI on warm lists.' },
    { q: 'How many emails should be in a campaign?', a: 'For product launches: 3-5 emails over 2 weeks. For newsletters: 1 per week. For launches: 5-7 emails over 10 days. Avoid sending more than 1/day — list fatigue.' },
    { q: 'Should I include HTML cost in campaign cost?', a: 'Yes. Total cost = copywriting + design + ESP fee + list management. For SMB campaigns: $200-$2K. For enterprise: $5K-$20K. Otherwise ROI is overstated.' },
    { q: "What is a good ROI for email marketing?", a: "Average: $36-42 per $1 spent (DMA, 2026). Top performers: $50-100 per $1. By type: welcome emails 320% revenue per email. Cart abandonment: 5-15% recovery. Newsletter: $0.10-0.50 per recipient per send. B2B: $50-100 per lead. ROI is highest of all digital channels. Track: revenue, list size, engagement." },
    { q: "What is a good email open rate in 2026?", a: "Benchmarks: 25-30% is good, 35%+ is excellent. Apple MPP (2021) cut rates 15-20%. Industry average: 25%. List hygiene matters: clean inactive (no opens in 6 months). Subject lines: 6-8 words, personalize, curiosity. Send time: Tuesday-Thursday 10am-2pm recipient time. Open rates are declining industry-wide but engagement is more meaningful." },
    { q: "How do I grow my email list?", a: "Top tactics: 1) Lead magnets (tools, templates, guides): 5-20% conversion, 2) Content upgrades: 10-30% conversion, 3) Exit-intent popups: 2-5% conversion, 4) Checkouts: 30-50% opt-in if asked, 5) Partnerships, 6) Social media. Target: 100-1000 subscribers/month. Avoid: buying lists (low quality, high spam). 80% of value from engaged subscribers." },
    { q: "How often should I send emails?", a: "Best for engagement: 1-2 emails/week. Daily works for: news, daily tips, deals. Weekly: newsletters, content creators. Twice monthly: product launches. Quality > quantity. Test frequency: unsubscribe rate vs. engagement. The right frequency fills the inbox without overwhelming. Most: weekly is sweet spot for B2C newsletters, 2-3x/week for B2B nurture." },
    { q: "What are the best email types for ROI?", a: "Top 5 by ROI: 1) Welcome series: 320% revenue per email, 2) Cart abandonment: 5-15% recovery, 3) Browse abandonment: 2-5% recovery, 4) Re-engagement: 5-10% reactivation, 5) Birthday/anniversary: 2-5x open rate. Best ROI: lifecycle + behavioral. Avoid: batch-and-blast (low engagement, high spam). Automation = 5-10x ROI." },
    { q: "How do I avoid spam filters?", a: "Tactics: 1) Use double opt-in (50%+ lower spam complaints), 2) Authenticate SPF/DKIM/DMARC, 3) Avoid spam words (\"FREE\", \"URGENT\", \"$$$\"), 4) Maintain <0.1% spam complaint rate, 5) Clean inactive subscribers quarterly, 6) Consistent sending volume, 7) Plain-text + HTML mix, 8) Easy unsubscribe. Most deliverability issues: list hygiene." },
    { q: "Should I use plain text or HTML emails?", a: "HTML: visual, branded, higher CTR (often), more spam risk. Plain text: personal, conversational, higher deliverability, lower CTR. Best for cold outreach: plain text. Best for newsletters: HTML. Best for transactional: HTML with minimal styling. A/B test both. Many teams: plain text for sales/cold, HTML for newsletters/promotional." },
    { q: "How do I measure email engagement beyond opens?", a: "With Apple MPP, opens are less reliable. Better metrics: 1) Click-through rate (CTR): 2-5% is good, 2) Conversion rate: 1-5%, 3) Revenue per email, 4) List growth rate, 5) Unsubscribe rate (<0.5% per send is good), 6) Spam complaint rate (<0.1%), 7) Reply rate (B2B), 8) Site visits from email. Focus on clicks + conversions, not opens." },
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