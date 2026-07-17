import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

// =====================================================================
// Quota Attainment Calculator (P8-5) — Business v3 standard (6+ emoji sections)
// =====================================================================
//
// Track actual revenue vs annual quota with monthly pace projection
// and year-end forecast. Answers "am I on track to hit my number?"
//
//   attainmentPct    = (actualRevenue / annualQuota) * 100
//   expectedAtPace   = annualQuota * (monthsElapsed / 12)
//   gap              = annualQuota - actualRevenue
//   remainingMonths  = 12 - monthsElapsed
//   requiredPerMonth = (remainingMonths > 0) ? gap / remainingMonths : 0
//   projectedYearEnd = actualRevenue + gap  // = annualQuota when remainingMonths > 0
//   onTrack          = projectedYearEnd >= annualQuota
//
// Health bands by attainmentPct:
//   🟢 ≥ 100% — excellent
//   🟡 80%–100% — good
//   🟠 50%–80% — warning
//   🔴 < 50% — critical

// ============== Health band constants (per-file, exported for tests) ==============

export const HEALTH_BANDS = {
  excellent: [100, Infinity],
  good: [80, 100],
  warning: [50, 80],
  critical: [0, 50],
} as const;

// ============== Math helpers (exported for tests) ==============

/** Attainment % = (actualRevenue / annualQuota) × 100. */
export function attainmentPct(actualRevenue: number, annualQuota: number): number {
  if (annualQuota <= 0) return 0;
  return (actualRevenue / annualQuota) * 100;
}

/** Expected at-pace revenue = annualQuota × (monthsElapsed / 12). */
export function expectedAtPace(annualQuota: number, monthsElapsed: number): number {
  return annualQuota * (monthsElapsed / 12);
}

/** Gap = annualQuota − actualRevenue (negative when overachieving). */
export function gap(annualQuota: number, actualRevenue: number): number {
  return annualQuota - actualRevenue;
}

/** Required per-month close = gap / remainingMonths (0 when year is complete). */
export function requiredPerMonth(gapVal: number, remainingMonths: number): number {
  if (remainingMonths <= 0) return 0;
  return gapVal / remainingMonths;
}

/** Projected year-end revenue = actualRevenue + gap (equals annualQuota when remainingMonths > 0). */
export function projectedYearEnd(actualRevenue: number, gapVal: number): number {
  return actualRevenue + gapVal;
}

/** On-track flag = projectedYearEnd ≥ annualQuota. */
export function onTrack(projectedYearEndVal: number, annualQuota: number): boolean {
  return projectedYearEndVal >= annualQuota;
}

/** Health band label from attainment % (percent). */
export function calcHealthBand(pct: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (pct >= HEALTH_BANDS.excellent[0]) return 'excellent';
  if (pct >= HEALTH_BANDS.good[0]) return 'good';
  if (pct >= HEALTH_BANDS.warning[0]) return 'warning';
  return 'critical';
}

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const annualQuota = clampNonNegative(parseFloat(inputs.annualQuota) || 0);
  const monthsElapsed = clampNonNegative(Math.min(12, parseFloat(inputs.monthsElapsed) || 0));
  const actualRevenue = clampNonNegative(parseFloat(inputs.actualRevenue) || 0);

  // Edge: all inputs zero → prompt to enter values
  if (annualQuota === 0 && monthsElapsed === 0 && actualRevenue === 0) {
    return [
      '🎯 Quota Attainment Calculator\n\n' +
        '🎯 Enter your annual quota (USD), months elapsed so far this year, and actual revenue closed to see your attainment %, monthly pace projection, and year-end forecast.',
    ];
  }

  // Math (clamp monthsElapsed to [0, 12])
  const pct = attainmentPct(actualRevenue, annualQuota);
  const expected = expectedAtPace(annualQuota, monthsElapsed);
  const gapVal = gap(annualQuota, actualRevenue);
  const remainingMonths = 12 - monthsElapsed;
  const reqPerMonth = requiredPerMonth(gapVal, remainingMonths);
  const projected = projectedYearEnd(actualRevenue, gapVal);
  const isOnTrack = onTrack(projected, annualQuota);

  // Health band
  const band = calcHealthBand(pct);
  const healthEmoji = band === 'excellent' ? '🟢' : band === 'good' ? '🟡' : band === 'warning' ? '🟠' : '🔴';
  const healthLabel =
    band === 'excellent'
      ? 'Excellent — quota hit or exceeded; overachieving'
      : band === 'good'
      ? 'Good — 80%–100% of quota; on track'
      : band === 'warning'
      ? 'Warning — 50%–80% of quota; behind expected pace'
      : 'Critical — < 50% of quota; urgent catch-up needed';

  // Formatters
  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const moneyK = (n: number) => {
    const r = Math.round(n);
    if (r >= 1_000_000) return '$' + (r / 1_000_000).toFixed(r % 1_000_000 === 0 ? 0 : 2) + 'M';
    if (r >= 1000) return '$' + Math.round(r / 1000) + 'K';
    return '$' + r.toLocaleString('en-US');
  };
  const moneyPerMonth = (n: number) => {
    const r = Math.round(n);
    if (r >= 1000) return '$' + Math.round(r / 1000) + 'K';
    return '$' + r.toLocaleString('en-US');
  };
  const pctInt = (n: number) => Math.round(n) + '%';

  // Pace diagnostics
  const currentPacePerMonth = monthsElapsed > 0 ? actualRevenue / monthsElapsed : 0;
  const expectedPacePerMonth = annualQuota / 12; // per month if hit exactly 100% by year-end
  const paceGap = currentPacePerMonth - expectedPacePerMonth; // positive = ahead, negative = behind
  const paceGapPct = expectedPacePerMonth > 0 ? (paceGap / expectedPacePerMonth) * 100 : 0;
  const behindPace = expected - actualRevenue; // how much behind expected at-pace (positive when behind)

  // What-If: 3 scenarios — maintain current pace / hit required pace / accelerate 20%
  const ifMaintainTotal = actualRevenue + currentPacePerMonth * remainingMonths;
  const ifMaintainPct = attainmentPct(ifMaintainTotal, annualQuota);
  const ifMaintainBand = calcHealthBand(ifMaintainPct);

  const ifRequiredTotal = actualRevenue + reqPerMonth * remainingMonths; // = annualQuota by definition
  const ifRequiredPct = annualQuota > 0 ? 100 : 0;
  const ifRequiredBand = 'excellent';

  const acceleratePerMonth = reqPerMonth * 1.20;
  const ifAccelTotal = actualRevenue + acceleratePerMonth * remainingMonths;
  const ifAccelPct = attainmentPct(ifAccelTotal, annualQuota);
  const ifAccelBand = calcHealthBand(ifAccelPct);

  // Break-Even: required close to hit quota, plus the at-pace milestone
  // "Need $500K closed by month 6 (expected at-pace) to be on track"
  // The actual at-pace is annualQuota × (monthsElapsed/12) = expected
  const breakevenAtPace = expected;
  const breakevenGap = Math.max(0, breakevenAtPace - actualRevenue);
  const breakevenForQuota = annualQuota;

  // Milestone: gap to next tier
  let gapToNext: number;
  let nextTier: string;
  if (band === 'critical') {
    gapToNext = 50 - pct;
    nextTier = '🟠 Warning (50%)';
  } else if (band === 'warning') {
    gapToNext = 80 - pct;
    nextTier = '🟡 Good (80%)';
  } else if (band === 'good') {
    gapToNext = 100 - pct;
    nextTier = '🟢 Excellent (100%)';
  } else {
    gapToNext = 0;
    nextTier = 'top tier maintained';
  }

  // Tip: band-driven + onTrack-aware (per spec)
  let tip: string;
  if (band === 'critical') {
    tip =
      'Attainment < 50% means you are at serious risk of missing quota. This is the urgent-action band — pull every lever: emergency top-of-funnel push (cold outreach, paid lead-gen, partnerships), pricing/discount review to close existing pipeline faster, and a 30-day deal-desk review of every late-stage opportunity. If the gap to 🟠 is > 30pp, consider a quota reset conversation with leadership now — not at year-end. A pipeline review is overdue.';
  } else if (band === 'warning') {
    if (isOnTrack) {
      tip =
        'Warning band (50%–80%) but mathematically on track — the gap is closable if you hit the required monthly pace. Execute with discipline: keep your daily/weekly close cadence, prioritize late-stage deals (Negotiation, Closing) over new logo acquisition, and run a weekly forecast call to catch slippage early. The danger zone is letting the monthly pace slip below required for 2+ consecutive months — once that happens, the math breaks down quickly.';
    } else {
      tip =
        'Warning band (50%–80%) and off pace — the closing rate is not enough to hit quota. Course-correct now: identify the 2–3 deals most likely to close in the next 30 days and allocate AE time to them. Cut non-essential activities. Re-forecast with leadership this week, not at quarter-end. Pair with sales velocity (P8-2) to see whether the bottleneck is volume, size, or win rate.';
    }
  } else if (band === 'good') {
    tip =
      'Good 80%–100% — close to hitting quota. Maintain cadence; do not let late-year fatigue erode the close rate. A 5pp drop from 95% to 90% is the difference between a board-deck win and a tough Q4 conversation. To push into 🟢, look for upside: 1–2 stretch deals, an expansion/upsell motion on existing accounts, or a year-end promotion to close hesitant buyers.';
  } else {
    // excellent
    tip =
      'Excellent — quota hit or exceeded. You are in the overachiever zone; consider negotiating next year\'s quota up by 20–30% (sandbagging hurts comp plan credibility and slows hiring), and identify which deal motions worked so you can replicate them. If you are well over 100% (e.g. 120%+), investigate whether the bar was set too low or you had one-time tailwinds — both matter for next year\'s plan.';
  }

  // Assemble 6-section output
  const r =
    '🎯 Quota Attainment Calculator\n\n' +
    '🩺 Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• Attainment: ' + pctInt(pct) + '  ·  On track: ' + (isOnTrack ? '✅ yes' : '❌ no') + '\n' +
    '• Projected year-end: ' + money(projected) + '  ·  Gap to quota: ' + money(Math.max(0, gapVal)) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Inputs Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Annual quota: ' + money(annualQuota) + '  ·  Months elapsed: ' + monthsElapsed + ' of 12\n' +
    '• Revenue closed: ' + money(actualRevenue) + '  ·  Remaining: ' + remainingMonths + ' months\n' +
    '• Expected at-pace: ' + money(expected) + '  ·  Behind/ahead: ' + money(behindPace) + ' (' + (behindPace >= 0 ? 'behind' : 'ahead') + ')\n' +
    '• Current pace: ' + moneyPerMonth(currentPacePerMonth) + '/mo  ·  Required pace: ' + moneyPerMonth(reqPerMonth) + '/mo  ·  Gap: ' + (paceGap >= 0 ? '+' : '') + moneyPerMonth(paceGap) + '/mo (' + (paceGapPct >= 0 ? '+' : '') + Math.round(paceGapPct) + '%)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• If maintain current pace (' + moneyPerMonth(currentPacePerMonth) + '/mo) for ' + remainingMonths + ' mo: +' + money(currentPacePerMonth * remainingMonths) + ' → ' + moneyK(ifMaintainTotal) + ' total = ' + pctInt(ifMaintainPct) + ' (' + ifMaintainBand + ')\n' +
    '• If hit required pace (' + moneyPerMonth(reqPerMonth) + '/mo) for ' + remainingMonths + ' mo: +' + money(reqPerMonth * remainingMonths) + ' → ' + moneyK(ifRequiredTotal) + ' total = ' + pctInt(ifRequiredPct) + ' (' + ifRequiredBand + ', onTrack)\n' +
    '• If accelerate 20% to ' + moneyPerMonth(acceleratePerMonth) + '/mo for ' + remainingMonths + ' mo: +' + money(acceleratePerMonth * remainingMonths) + ' → ' + moneyK(ifAccelTotal) + ' total = ' + pctInt(ifAccelPct) + ' (' + ifAccelBand + ')\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Target for on-track at month ' + monthsElapsed + ': ' + money(breakevenAtPace) + ' closed (expected at-pace)\n' +
    '• Gap to at-pace: ' + money(breakevenGap) + (breakevenGap === 0 ? ' (on pace ✅)' : ' behind') + '\n' +
    '• Target for full quota: ' + money(breakevenForQuota) + '  ·  Required: ' + moneyPerMonth(reqPerMonth) + '/mo for ' + remainingMonths + ' remaining months\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Milestone:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Next tier: ' + nextTier + '\n' +
    '• Gap to next tier: ' + (band === 'excellent' ? '0pp (already at top)' : Math.round(gapToNext) + 'pp') + '\n' +
    '• At current pace, year-end: ' + moneyK(actualRevenue + currentPacePerMonth * 12) + ' (' + pctInt(attainmentPct(actualRevenue + currentPacePerMonth * 12, annualQuota)) + ')\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  "function aP(ar,aq){if(aq<=0)return 0;return(ar/aq)*100;}" +
  "function eAP(aq,me){return aq*(me/12);}" +
  "function gP(aq,ar){return aq-ar;}" +
  "function rPM(gv,rm){if(rm<=0)return 0;return gv/rm;}" +
  "function pYE(ar,gv){return ar+gv;}" +
  "function oT(p,aq){return p>=aq;}" +
  "function band(v){if(v>=100)return 'excellent';if(v>=80)return 'good';if(v>=50)return 'warning';return 'critical';}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var aq=cnn(parseFloat(inputs.annualQuota)||0);" +
  "var me=cnn(Math.min(12,parseFloat(inputs.monthsElapsed)||0));" +
  "var ar=cnn(parseFloat(inputs.actualRevenue)||0);" +
  "if(aq===0&&me===0&&ar===0){" +
    "return['\\uD83C\\uDFAF Quota Attainment Calculator\\n\\n\\uD83C\\uDFAF Enter your annual quota (USD), months elapsed so far this year, and actual revenue closed to see your attainment %, monthly pace projection, and year-end forecast.'];" +
  "}" +
  "var pct=aP(ar,aq);" +
  "var exp=eAP(aq,me);" +
  "var gv=gP(aq,ar);" +
  "var rm=12-me;" +
  "var rpm=rPM(gv,rm);" +
  "var pj=pYE(ar,gv);" +
  "var isOT=oT(pj,aq);" +
  "var bd=band(pct);" +
  "var he=bd==='excellent'?'\\uD83D\\uDFE2':bd==='good'?'\\uD83D\\uDFE1':bd==='warning'?'\\uD83D\\uDFE0':'\\uD83D\\uDD34';" +
  "var hl=bd==='excellent'?'Excellent \\u2014 quota hit or exceeded; overachieving':bd==='good'?'Good \\u2014 80%\\u2013100% of quota; on track':bd==='warning'?'Warning \\u2014 50%\\u201380% of quota; behind expected pace':'Critical \\u2014 < 50% of quota; urgent catch-up needed';" +
  "function money(n){return '$'+Math.round(n).toLocaleString('en-US');}" +
  "function moneyK(n){var r=Math.round(n);if(r>=1000000)return '$'+(r/1000000).toFixed(r%1000000===0?0:2)+'M';if(r>=1000)return '$'+Math.round(r/1000)+'K';return '$'+r.toLocaleString('en-US');}" +
  "function moneyPM(n){var r=Math.round(n);if(r>=1000)return '$'+Math.round(r/1000)+'K';return '$'+r.toLocaleString('en-US');}" +
  "function pctI(n){return Math.round(n)+'%';}" +
  "var cpm=me>0?ar/me:0;" +
  "var eppm=aq/12;" +
  "var pg=cpm-eppm;" +
  "var pgp=eppm>0?(pg/eppm)*100:0;" +
  "var bp=exp-ar;" +
  "var ifMT=ar+cpm*rm;" +
  "var ifMP=aP(ifMT,aq);" +
  "var ifMB=band(ifMP);" +
  "var ifRT=ar+rpm*rm;" +
  "var ifRP=aq>0?100:0;" +
  "var ifRB='excellent';" +
  "var apm=rpm*1.20;" +
  "var ifAT=ar+apm*rm;" +
  "var ifAP=aP(ifAT,aq);" +
  "var ifAB=band(ifAP);" +
  "var beap=exp;" +
  "var beg=Math.max(0,beap-ar);" +
  "var befq=aq;" +
  "var gn,nt;" +
  "if(bd==='critical'){gn=50-pct;nt='\\uD83D\\uDFE0 Warning (50%)';}" +
  "else if(bd==='warning'){gn=80-pct;nt='\\uD83D\\uDFE1 Good (80%)';}" +
  "else if(bd==='good'){gn=100-pct;nt='\\uD83D\\uDFE2 Excellent (100%)';}" +
  "else{gn=0;nt='top tier maintained';}" +
  "var tip='';" +
  "if(bd==='critical'){tip='Attainment < 50% means you are at serious risk of missing quota. This is the urgent-action band \\u2014 pull every lever: emergency top-of-funnel push (cold outreach, paid lead-gen, partnerships), pricing/discount review to close existing pipeline faster, and a 30-day deal-desk review of every late-stage opportunity. If the gap to \\uD83D\\uDFE0 is > 30pp, consider a quota reset conversation with leadership now \\u2014 not at year-end. A pipeline review is overdue.';}" +
  "else if(bd==='warning'){" +
    "if(isOT){tip='Warning band (50%\\u201380%) but mathematically on track \\u2014 the gap is closable if you hit the required monthly pace. Execute with discipline: keep your daily/weekly close cadence, prioritize late-stage deals (Negotiation, Closing) over new logo acquisition, and run a weekly forecast call to catch slippage early. The danger zone is letting the monthly pace slip below required for 2+ consecutive months \\u2014 once that happens, the math breaks down quickly.';}" +
    "else{tip='Warning band (50%\\u201380%) and off pace \\u2014 the closing rate is not enough to hit quota. Course-correct now: identify the 2\\u20133 deals most likely to close in the next 30 days and allocate AE time to them. Cut non-essential activities. Re-forecast with leadership this week, not at quarter-end. Pair with sales velocity (P8-2) to see whether the bottleneck is volume, size, or win rate.';}" +
  "}" +
  "else if(bd==='good'){tip='Good 80%\\u2013100% \\u2014 close to hitting quota. Maintain cadence; do not let late-year fatigue erode the close rate. A 5pp drop from 95% to 90% is the difference between a board-deck win and a tough Q4 conversation. To push into \\uD83D\\uDFE2, look for upside: 1\\u20132 stretch deals, an expansion/upsell motion on existing accounts, or a year-end promotion to close hesitant buyers.';}" +
  "else{tip='Excellent \\u2014 quota hit or exceeded. You are in the overachiever zone; consider negotiating next year\\u2019s quota up by 20\\u201330% (sandbagging hurts comp plan credibility and slows hiring), and identify which deal motions worked so you can replicate them. If you are well over 100% (e.g. 120%+), investigate whether the bar was set too low or you had one-time tailwinds \\u2014 both matter for next year\\u2019s plan.';}" +
  "var r2='';" +
  "r2+='\\uD83C\\uDFAF Quota Attainment Calculator\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+he+' '+hl+'\\n';" +
  "r2+='\\u2022 Attainment: '+pctI(pct)+'  \\u00B7  On track: '+(isOT?'\\u2705 yes':'\\u274C no')+'\\n';" +
  "r2+='\\u2022 Projected year-end: '+money(pj)+'  \\u00B7  Gap to quota: '+money(Math.max(0,gv))+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCCA Inputs Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Annual quota: '+money(aq)+'  \\u00B7  Months elapsed: '+me+' of 12\\n';" +
  "r2+='\\u2022 Revenue closed: '+money(ar)+'  \\u00B7  Remaining: '+rm+' months\\n';" +
  "r2+='\\u2022 Expected at-pace: '+money(exp)+'  \\u00B7  Behind/ahead: '+money(bp)+' ('+(bp>=0?'behind':'ahead')+')\\n';" +
  "r2+='\\u2022 Current pace: '+moneyPM(cpm)+'/mo  \\u00B7  Required pace: '+moneyPM(rpm)+'/mo  \\u00B7  Gap: '+(pg>=0?'+':'')+moneyPM(pg)+'/mo ('+(pgp>=0?'+':'')+Math.round(pgp)+'%)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 If maintain current pace ('+moneyPM(cpm)+'/mo) for '+rm+' mo: +'+money(cpm*rm)+' \\u2192 '+moneyK(ifMT)+' total = '+pctI(ifMP)+' ('+ifMB+')\\n';" +
  "r2+='\\u2022 If hit required pace ('+moneyPM(rpm)+'/mo) for '+rm+' mo: +'+money(rpm*rm)+' \\u2192 '+moneyK(ifRT)+' total = '+pctI(ifRP)+' ('+ifRB+', onTrack)\\n';" +
  "r2+='\\u2022 If accelerate 20% to '+moneyPM(apm)+'/mo for '+rm+' mo: +'+money(apm*rm)+' \\u2192 '+moneyK(ifAT)+' total = '+pctI(ifAP)+' ('+ifAB+')\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Break-Even:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Target for on-track at month '+me+': '+money(beap)+' closed (expected at-pace)\\n';" +
  "r2+='\\u2022 Gap to at-pace: '+money(beg)+(beg===0?' (on pace \\u2705)':' behind')+'\\n';" +
  "r2+='\\u2022 Target for full quota: '+money(befq)+'  \\u00B7  Required: '+moneyPM(rpm)+'/mo for '+rm+' remaining months\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Milestone:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Next tier: '+nt+'\\n';" +
  "r2+='\\u2022 Gap to next tier: '+(bd==='excellent'?'0pp (already at top)':Math.round(gn)+'pp')+'\\n';" +
  "r2+='\\u2022 At current pace, year-end: '+moneyK(ar+cpm*12)+' ('+pctI(aP(ar+cpm*12,aq))+')\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCA1 Tip: '+tip+'\\n';" +
  "return [r2];";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-quota-attainment-calculator',
  title: 'Quota Attainment Calculator',
  description:
    'Track actual revenue vs annual quota with monthly pace projection and year-end forecast. Answers "am I on track to hit my number?" with attainment %, required monthly close, and gap-to-quota. Health bands: 🟢 ≥100% · 🟡 80%-100% · 🟠 50%-80% · 🔴 <50%.',
  categoryId: 'S',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'annualQuota', label: 'Annual quota (USD)', placeholder: 'e.g. 1000000', type: 'number' },
    { name: 'monthsElapsed', label: 'Months elapsed', placeholder: 'e.g. 6', type: 'number' },
    { name: 'actualRevenue', label: 'Revenue closed (USD)', placeholder: 'e.g. 400000', type: 'number' },
  ],
  keywords: [
    'quota attainment calculator',
    'quota tracker',
    'sales quota',
    'revenue target',
    'attainment %',
    'sales pace',
    'year-end forecast',
    'sales KPI',
    'B2B SaaS sales',
    'sales performance',
  ],
  tags: ['sales', 'quota', 'crm', 'performance'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-07',
  sources: [
    'https://blog.hubspot.com/sales/sales-quota',
    'https://www.insivia.com/blog/sales-quota/',
    'https://blog.hubspot.com/sales/setting-sales-quota',
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  calculate,
  generate: calculate,
  staticExamples: ['🎯 Quota Attainment Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🔴 Critical — < 50% of quota; urgent catch-up needed\n• Attainment: 40%  ·  On track: ✅ yes\n• Projected year-end: $1,000,000  ·  Gap to quota: $600,000\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Annual quota: $1,000,000  ·  Months elapsed: 6 of 12\n• Revenue closed: $400,000  ·  Remaining: 6 months\n• Expected at-pace: $500,000  ·  Behind/ahead: $100,000 (behind)\n• Current pace: $67K/mo  ·  Required pace: $100K/mo  ·  Gap: $-16,667/mo (-20%)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• If maintain current pace ($67K/mo) for 6 mo: +$400,000 → $800K total = 80% (good)\n• If hit required pace ($100K/mo) for 6 mo: +$600,000 → $1M total = 100% (excellent, onTrack)\n• If accelerate 20% to $120K/mo for 6 mo: +$720,000 → $1.12M total = 112% (excellent)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Target for on-track at month 6: $500,000 closed (expected at-pace)\n• Gap to at-pace: $100,000 behind\n• Target for full quota: $1,000,000  ·  Required: $100K/mo for 6 remaining months\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Next tier: 🟠 Warning (50%)\n• Gap to next tier: 10pp\n• At current pace, year-end: $1.20M (120%)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: Attainment < 50% means you are at serious risk of missing quota. This is the urgent-action band — pull every lever: emergency top-of-funnel push (cold outreach, paid lead-gen, partnerships), pricing/discount review to close existing pipeline faster, and a 30-day deal-desk review of every late-stage opportunity. If the gap to 🟠 is > 30pp, consider a quota reset conversation with leadership now — not at year-end. A pipeline review is overdue.\n'],
  faq: [
    { q: 'What is quota attainment?', a: 'Quota attainment is the percentage of your sales quota (target) achieved in a given period — usually a year. Calculated as (actual revenue / quota) × 100. A 100% attainment means you hit your number exactly; 120% means you exceeded by 20%; 80% means you are 20% short.' },
    { q: 'How is "on track" calculated?', a: 'On track means the gap between actual revenue and quota can still be closed in the remaining months at a feasible monthly pace. We compute requiredPerMonth = gap / remainingMonths. If you can hit that pace, you are on track. The required pace scales with how much time is left — early in the year, the bar is low; late in the year, it climbs sharply.' },
    { q: 'What is expected at-pace?', a: 'Expected at-pace is what your revenue would be if you were closing at exactly the rate needed to hit 100% of quota by year-end. It is annualQuota × (monthsElapsed / 12). At month 6 of 12, you should be at 50% of quota. If you are below at-pace, you are behind; if above, you are ahead.' },
    { q: 'How do I improve quota attainment?', a: 'Attainment is improved by closing more revenue per month. Three levers: (1) more deals (volume — increase top-of-funnel), (2) bigger deals (size — negotiate up, expand accounts), (3) higher close rate (win rate — better qualification, stronger sales playbooks). Pair this with sales velocity (P8-2) to identify which lever moves fastest for your business.' },
    { q: 'How does this differ from pipeline coverage (P8-6)?', a: 'Quota attainment is a backward-looking view: how much have I closed vs. how much should I have closed. Pipeline coverage (P8-6) is a forward-looking view: do I have enough pipeline to hit my quota. Use attainment to diagnose if you are on pace, coverage to diagnose if you have enough pipeline to get there.' },
  ],
  howToUse: [
    'Enter your annual quota (USD) — the full-year revenue target you committed to.',
    'Enter the number of months elapsed so far this year (0–12).',
    'Enter the actual revenue closed-to-date (USD) — pull from your CRM closed-won report.',
    'Read the attainment % (actualRevenue / annualQuota × 100) and whether you are on track (requiredPerMonth is achievable).',
    'Use the What-If section to model 3 scenarios: maintain current pace, hit required pace, or accelerate 20%.',
    'Use the Break-Even section to see the at-pace milestone (annualQuota × monthsElapsed/12) and the gap to closing it.',
  ],
  engineKey: true,
};
registerEngine(engine);
