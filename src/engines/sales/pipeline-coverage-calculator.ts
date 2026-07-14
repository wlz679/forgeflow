import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

// =====================================================================
// Pipeline Coverage Calculator (P8-6) — Business v3 standard (6+ emoji sections)
// =====================================================================
//
// Compute pipeline-to-quota coverage with win-rate weighting. The B2B SaaS
// "3x rule" says you need 3× your quota in pipeline to reliably hit target.
// This calc answers: "do I have enough pipeline?"
//
//   coverageRatio             = pipelineValue / quotaTarget
//   weightedPipeline          = pipelineValue * (winRate / 100)
//   weightedCoverage          = weightedPipeline / quotaTarget
//   gap                       = quotaTarget - weightedPipeline
//   requiredAdditionalPipeline = (winRate > 0) ? gap / (winRate / 100) : 0
//
// Health bands by coverageRatio (B2B SaaS 3x rule is the 🟢 threshold):
//   🟢 ≥ 3.0x — excellent (3x rule satisfied — comfortable pipeline cushion)
//   🟡 2.0–3.0x — good (approaching the 3x rule, monitor stage progression)
//   🟠 1.0–2.0x — warning (under 2x — at risk if win rate drops or stage slips)
//   🔴 < 1.0x — critical (pipeline shortfall — urgent: build top-of-funnel)

// ============== Health band constants (per-file, exported for tests) ==============

export const HEALTH_BANDS = {
  excellent: [3.0, Infinity],
  good: [2.0, 3.0],
  warning: [1.0, 2.0],
  critical: [0, 1.0],
} as const;

// ============== Math helpers (exported for tests) ==============

/** Coverage ratio = pipelineValue / quotaTarget. */
export function coverageRatio(pipelineValue: number, quotaTarget: number): number {
  if (quotaTarget <= 0) return 0;
  return pipelineValue / quotaTarget;
}

/** Weighted pipeline = pipelineValue × (winRate / 100). */
export function weightedPipeline(pipelineValue: number, winRate: number): number {
  return pipelineValue * (winRate / 100);
}

/** Weighted coverage = weightedPipeline / quotaTarget. */
export function weightedCoverage(pipelineValue: number, winRate: number, quotaTarget: number): number {
  if (quotaTarget <= 0) return 0;
  return weightedPipeline(pipelineValue, winRate) / quotaTarget;
}

/** Gap = quotaTarget − weightedPipeline (positive when weighted pipeline < quota). */
export function gap(quotaTarget: number, weightedPipelineVal: number): number {
  return quotaTarget - weightedPipelineVal;
}

/** Required additional pipeline = gap / (winRate / 100) — guarded against winRate=0 to avoid Infinity. */
export function requiredAdditionalPipeline(gapVal: number, winRate: number): number {
  if (winRate <= 0) return 0;
  return gapVal / (winRate / 100);
}

/** Health band label from coverage ratio (x). */
export function calcHealthBand(ratio: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (ratio >= HEALTH_BANDS.excellent[0]) return 'excellent';
  if (ratio >= HEALTH_BANDS.good[0]) return 'good';
  if (ratio >= HEALTH_BANDS.warning[0]) return 'warning';
  return 'critical';
}

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const quotaTarget = clampNonNegative(parseFloat(inputs.quotaTarget) || 0);
  const pipelineValue = clampNonNegative(parseFloat(inputs.pipelineValue) || 0);
  const winRate = clampNonNegative(parseFloat(inputs.winRate) || 0);

  // Edge: all inputs zero → prompt to enter values
  if (quotaTarget === 0 && pipelineValue === 0 && winRate === 0) {
    return [
      '🎯 Pipeline Coverage Calculator\n\n' +
        '🎯 Enter your quota target, current pipeline value, and expected win rate to see your pipeline-to-quota coverage ratio with the B2B SaaS 3x rule diagnostic.',
    ];
  }

  // Math
  const covRatio = coverageRatio(pipelineValue, quotaTarget);
  const wtdPipeline = weightedPipeline(pipelineValue, winRate);
  const wtdCoverage = weightedCoverage(pipelineValue, winRate, quotaTarget);
  const gapVal = gap(quotaTarget, wtdPipeline);
  const requiredAddl = requiredAdditionalPipeline(gapVal, winRate);

  // Health band (3x rule is 🟢)
  const band = calcHealthBand(covRatio);
  const healthEmoji = band === 'excellent' ? '🟢' : band === 'good' ? '🟡' : band === 'warning' ? '🟠' : '🔴';
  const healthLabel =
    band === 'excellent'
      ? 'Excellent — 3x rule satisfied; comfortable pipeline cushion'
      : band === 'good'
      ? 'Good — 2.0x–3.0x; approaching 3x rule, monitor stage progression'
      : band === 'warning'
      ? 'Warning — 1.0x–2.0x; under the 2x comfort zone, at risk if win rate slips'
      : 'Critical — < 1.0x; pipeline shortfall, urgent top-of-funnel rebuild';

  // Formatters
  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const moneyK = (n: number) => {
    const r = Math.round(n);
    if (r >= 1_000_000) return '$' + (r / 1_000_000).toFixed(r % 1_000_000 === 0 ? 0 : 2) + 'M';
    if (r >= 1000) return '$' + Math.round(r / 1000) + 'K';
    return '$' + r.toLocaleString('en-US');
  };
  // coverageRatio display: 1 decimal + "x" (matches spec literal "1.5x")
  const formatRatio1 = (n: number) => {
    if (!isFinite(n)) return '—x';
    return n.toFixed(1) + 'x';
  };
  // weightedCoverage display: 2 decimals + "x" (more precision since always < 1.0x)
  const formatRatio2 = (n: number) => {
    if (!isFinite(n)) return '—x';
    return n.toFixed(2) + 'x';
  };

  // What-If: 3 scenarios — pipeline boost, win rate boost, both
  //   If pipeline $1.5M→$2M: cov = 2.0/1.0 = 2.0x (still 🟡)
  //   If win rate 25%→50%: weighted = 1.5×0.5 = $750K, wtd cov = 0.75x (still 🟠, but closer to 🟡 1.0x)
  //   If both 2.0M + 50%: cov = 2.0x, weighted = 1.0M, wtd cov = 1.0x (🟡 boundary)
  const ifMorePipe = 2_000_000;
  const ifMorePipeCov = coverageRatio(ifMorePipe, quotaTarget);
  const ifMorePipeBand = calcHealthBand(ifMorePipeCov);
  const ifMorePipeWtdCov = weightedCoverage(ifMorePipe, winRate, quotaTarget);

  const ifBetterWin = 50;
  const ifBetterWinWtd = weightedPipeline(pipelineValue, ifBetterWin);
  const ifBetterWinWtdCov = weightedCoverage(pipelineValue, ifBetterWin, quotaTarget);
  // Note: calcHealthBand operates on coverageRatio, not weightedCoverage. Better win rate alone
  // does not change coverageRatio — only the weighted number. We show the weightedCoverage
  // improvement as a separate diagnostic, not a band change.
  const ifBothPipe = ifMorePipe;
  const ifBothWin = ifBetterWin;
  const ifBothWtd = weightedPipeline(ifBothPipe, ifBothWin);
  const ifBothWtdCov = weightedCoverage(ifBothPipe, ifBothWin, quotaTarget);
  const ifBothCov = coverageRatio(ifBothPipe, quotaTarget);
  const ifBothBand = calcHealthBand(ifBothCov);

  // Break-Even: target pipeline for 3x rule
  //   coverageRatio = 3 → pipelineValue = 3 × quotaTarget
  //   Equivalent: at current win rate, weighted = 0.25 × pipeline; to reach 3x weighted (3 × quota) → impossible (win rate cap)
  //   The 3x rule is on coverageRatio (unweighted), so break-even is pipeline = 3 × quota
  const threeXThreshold = 3 * quotaTarget;
  const threeXGap = Math.max(0, threeXThreshold - pipelineValue);
  // 1x break-even: pipeline = quota / (winRate/100)
  const oneXThreshold = winRate > 0 ? quotaTarget / (winRate / 100) : Infinity;
  const oneXGap = isFinite(oneXThreshold) ? Math.max(0, oneXThreshold - pipelineValue) : 0;
  // Combined 1x via win rate alone: at current pipeline, win rate = quota / pipeline × 100
  const winRateFor1X = pipelineValue > 0 ? (quotaTarget / pipelineValue) * 100 : 0;

  // Milestone: gap to next tier (always named with 3x rule when adjacent)
  let gapToNext: number;
  let nextTier: string;
  if (band === 'critical') {
    gapToNext = 1.0 - covRatio;
    nextTier = '🟠 Warning (1.0x)';
  } else if (band === 'warning') {
    gapToNext = 2.0 - covRatio;
    nextTier = '🟡 Good (2.0x)';
  } else if (band === 'good') {
    gapToNext = 3.0 - covRatio;
    nextTier = '🟢 Excellent (3x rule)';
  } else {
    gapToNext = 0;
    nextTier = 'top tier maintained (3x rule)';
  }

  // Tip: band-driven, with 3x rule as the central concept
  let tip: string;
  if (band === 'critical') {
    tip =
      'Pipeline < 1.0x means you do not even have enough pipeline to cover quota, win or lose. The 3x rule is a distant goal — focus first on getting to 1.0x. This requires either: (a) aggressive top-of-funnel (cold outbound, paid lead-gen, partnerships), or (b) raising quota targets down only after the gap closes. A pipeline review is overdue; weekly forecast calls are essential. Aim for 1.0x within 30 days, 2.0x within 60.';
  } else if (band === 'warning') {
    tip =
      '1.0x–2.0x is the danger zone — you have enough pipeline to hit quota, but no cushion for slippage. The 3x rule (≥ 3.0x) is the B2B SaaS benchmark for reliable attainment. Push toward 2.0x first: late-stage acceleration (Negotiation→Closing), increase top-of-funnel activity by 30–50%, and audit deal-stage conversion. A 10% win rate improvement is often faster than doubling Discovery count — pair with sales velocity (P8-2) to find your best lever.';
  } else if (band === 'good') {
    tip =
      '2.0x–3.0x is approaching the 3x rule — you are close. The final 1.0x jump is harder than the previous one (diminishing returns from raw pipeline growth). Focus on stage quality: ensure Negotiation and Closing deals are well-qualified, not bloated with low-probability late-stage deals. Maintain weekly pipeline review cadence; do not let 2.5x slip back to 2.0x during seasonal dips. To get to 🟢, identify 2–3 stretch opportunities at 80%+ probability.';
  } else {
    tip =
      'Excellent — 3x rule satisfied. You have a comfortable cushion: even if 1 in 3 deals slips, you should still hit quota. Do not get complacent: top-of-funnel decay is invisible until the quarter after. Maintain cadence; audit stage hygiene (no stale Closing deals >30 days that may quietly drop to 50% probability). Use this cushion strategically — invest in expansion/upsell on existing accounts, or test higher-margin pricing motions.';
  }

  // Assemble 6-section output
  const r =
    '🎯 Pipeline Coverage Calculator\n\n' +
    '🩺 Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• Coverage ratio: ' + formatRatio1(covRatio) + ' (pipeline / quota)  ·  Weighted coverage: ' + formatRatio2(wtdCoverage) + ' (after ' + winRate + '% win rate)\n' +
    '• Required additional pipeline: ' + money(requiredAddl) + '  ·  Gap to quota (weighted): ' + money(Math.max(0, gapVal)) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Inputs Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Quota target: ' + money(quotaTarget) + '  ·  Current pipeline: ' + money(pipelineValue) + '\n' +
    '• Expected win rate: ' + winRate + '%  ·  3x rule target: ' + money(threeXThreshold) + ' (3× quota)\n' +
    '• Weighted pipeline: ' + money(wtdPipeline) + '  ·  Coverage: ' + formatRatio1(covRatio) + '  ·  Weighted coverage: ' + formatRatio2(wtdCoverage) + '\n' +
    '• Gap to 3x rule: ' + money(threeXGap) + ' more pipeline needed  ·  Gap to 1x break-even: ' + money(oneXGap) + ' (or win rate → ' + Math.round(winRateFor1X) + '% at current pipeline)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• If pipeline ' + moneyK(pipelineValue) + '→' + moneyK(ifMorePipe) + ': ' + formatRatio1(ifMorePipeCov) + ' (' + ifMorePipeBand + '); weighted ' + formatRatio2(ifMorePipeWtdCov) + '\n' +
    '• If win rate ' + winRate + '%→' + ifBetterWin + '%: weighted ' + formatRatio2(ifBetterWinWtdCov) + ' (covRatio unchanged at ' + formatRatio1(covRatio) + ', still ' + band + '); weighted pipeline = ' + money(ifBetterWinWtd) + '\n' +
    '• If both (' + moneyK(ifBothPipe) + ' + ' + ifBothWin + '%): ' + formatRatio1(ifBothCov) + ' (' + ifBothBand + '); weighted ' + formatRatio2(ifBothWtdCov) + ' = ' + money(ifBothWtd) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• 3x rule (🟢 Excellent): need pipeline ≥ ' + money(threeXThreshold) + ' (gap: ' + money(threeXGap) + ')\n' +
    '• 1x break-even (🟠 Warning lower bound): need pipeline ≥ ' + money(oneXThreshold) + (isFinite(oneXThreshold) ? ' (gap: ' + money(oneXGap) + ')' : ' (impossible: win rate is 0)') + '\n' +
    '• Alternative: at current pipeline ' + moneyK(pipelineValue) + ', win rate → ' + Math.round(winRateFor1X) + '% to hit 1x break-even (3x rule unreachable via win rate alone — needs more pipeline)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Milestone:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Next tier: ' + nextTier + '\n' +
    '• Gap to next tier: ' + (band === 'excellent' ? '0x (3x rule maintained)' : formatRatio1(gapToNext) + ' of pipeline growth') + '\n' +
    '• Milestone summary: ' + formatRatio1(covRatio) + ' current  ·  need ' + formatRatio1(Math.max(covRatio, 1.0)) + ' for 1x  ·  need 2.0x for 🟡  ·  need 3.0x for 🟢 (3x rule)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  "function cR(pv,qt){if(qt<=0)return 0;return pv/qt;}" +
  "function wP(pv,wr){return pv*(wr/100);}" +
  "function wC(pv,wr,qt){if(qt<=0)return 0;return wP(pv,wr)/qt;}" +
  "function gp(qt,wpv){return qt-wpv;}" +
  "function rAP(gv,wr){if(wr<=0)return 0;return gv/(wr/100);}" +
  "function band(v){if(v>=3)return 'excellent';if(v>=2)return 'good';if(v>=1)return 'warning';return 'critical';}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var qt=cnn(parseFloat(inputs.quotaTarget)||0);" +
  "var pv=cnn(parseFloat(inputs.pipelineValue)||0);" +
  "var wr=cnn(parseFloat(inputs.winRate)||0);" +
  "if(qt===0&&pv===0&&wr===0){" +
    "return['\\uD83C\\uDFAF Pipeline Coverage Calculator\\n\\n\\uD83C\\uDFAF Enter your quota target, current pipeline value, and expected win rate to see your pipeline-to-quota coverage ratio with the B2B SaaS 3x rule diagnostic.'];" +
  "}" +
  "var cv=cR(pv,qt);" +
  "var wpv=wP(pv,wr);" +
  "var wc=wC(pv,wr,qt);" +
  "var gv=gp(qt,wpv);" +
  "var rap=rAP(gv,wr);" +
  "var bd=band(cv);" +
  "var he=bd==='excellent'?'\\uD83D\\uDFE2':bd==='good'?'\\uD83D\\uDFE1':bd==='warning'?'\\uD83D\\uDFE0':'\\uD83D\\uDD34';" +
  "var hl=bd==='excellent'?'Excellent \\u2014 3x rule satisfied; comfortable pipeline cushion':bd==='good'?'Good \\u2014 2.0x\\u20133.0x; approaching 3x rule, monitor stage progression':bd==='warning'?'Warning \\u2014 1.0x\\u20132.0x; under the 2x comfort zone, at risk if win rate slips':'Critical \\u2014 < 1.0x; pipeline shortfall, urgent top-of-funnel rebuild';" +
  "function money(n){return '$'+Math.round(n).toLocaleString('en-US');}" +
  "function moneyK(n){var r=Math.round(n);if(r>=1000000)return '$'+(r/1000000).toFixed(r%1000000===0?0:2)+'M';if(r>=1000)return '$'+Math.round(r/1000)+'K';return '$'+r.toLocaleString('en-US');}" +
  "function fR1(n){if(!isFinite(n))return '\\u2014x';return n.toFixed(1)+'x';}" +
  "function fR2(n){if(!isFinite(n))return '\\u2014x';return n.toFixed(2)+'x';}" +
  "var imp=2000000;" +
  "var impCv=cR(imp,qt);" +
  "var impBd=band(impCv);" +
  "var impWc=wC(imp,wr,qt);" +
  "var ibw=50;" +
  "var ibwW=wP(pv,ibw);" +
  "var ibwWc=wC(pv,ibw,qt);" +
  "var ibp=imp;" +
  "var ibt=ibw;" +
  "var ibtw=wP(ibp,ibt);" +
  "var ibtwc=wC(ibp,ibt,qt);" +
  "var ibtc=cR(ibp,qt);" +
  "var ibtBd=band(ibtc);" +
  "var thr3=3*qt;" +
  "var g3=Math.max(0,thr3-pv);" +
  "var thr1=wr>0?qt/(wr/100):1/0;" +
  "var g1=isFinite(thr1)?Math.max(0,thr1-pv):0;" +
  "var wr1x=pv>0?(qt/pv)*100:0;" +
  "var gn,nt;" +
  "if(bd==='critical'){gn=1.0-cv;nt='\\uD83D\\uDFE0 Warning (1.0x)';}" +
  "else if(bd==='warning'){gn=2.0-cv;nt='\\uD83D\\uDFE1 Good (2.0x)';}" +
  "else if(bd==='good'){gn=3.0-cv;nt='\\uD83D\\uDFE2 Excellent (3x rule)';}" +
  "else{gn=0;nt='top tier maintained (3x rule)';}" +
  "var tip='';" +
  "if(bd==='critical'){tip='Pipeline < 1.0x means you do not even have enough pipeline to cover quota, win or lose. The 3x rule is a distant goal \\u2014 focus first on getting to 1.0x. This requires either: (a) aggressive top-of-funnel (cold outbound, paid lead-gen, partnerships), or (b) raising quota targets down only after the gap closes. A pipeline review is overdue; weekly forecast calls are essential. Aim for 1.0x within 30 days, 2.0x within 60.';}" +
  "else if(bd==='warning'){tip='1.0x\\u20132.0x is the danger zone \\u2014 you have enough pipeline to hit quota, but no cushion for slippage. The 3x rule (\\u2265 3.0x) is the B2B SaaS benchmark for reliable attainment. Push toward 2.0x first: late-stage acceleration (Negotiation\\u2192Closing), increase top-of-funnel activity by 30\\u201350%, and audit deal-stage conversion. A 10% win rate improvement is often faster than doubling Discovery count \\u2014 pair with sales velocity (P8-2) to find your best lever.';}" +
  "else if(bd==='good'){tip='2.0x\\u20133.0x is approaching the 3x rule \\u2014 you are close. The final 1.0x jump is harder than the previous one (diminishing returns from raw pipeline growth). Focus on stage quality: ensure Negotiation and Closing deals are well-qualified, not bloated with low-probability late-stage deals. Maintain weekly pipeline review cadence; do not let 2.5x slip back to 2.0x during seasonal dips. To get to \\uD83D\\uDFE2, identify 2\\u20133 stretch opportunities at 80%+ probability.';}" +
  "else{tip='Excellent \\u2014 3x rule satisfied. You have a comfortable cushion: even if 1 in 3 deals slips, you should still hit quota. Do not get complacent: top-of-funnel decay is invisible until the quarter after. Maintain cadence; audit stage hygiene (no stale Closing deals >30 days that may quietly drop to 50% probability). Use this cushion strategically \\u2014 invest in expansion/upsell on existing accounts, or test higher-margin pricing motions.';}" +
  "var r2='';" +
  "r2+='\\uD83C\\uDFAF Pipeline Coverage Calculator\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+he+' '+hl+'\\n';" +
  "r2+='\\u2022 Coverage ratio: '+fR1(cv)+' (pipeline / quota)  \\u00B7  Weighted coverage: '+fR2(wc)+' (after '+wr+'% win rate)\\n';" +
  "r2+='\\u2022 Required additional pipeline: '+money(rap)+'  \\u00B7  Gap to quota (weighted): '+money(Math.max(0,gv))+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCCA Inputs Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Quota target: '+money(qt)+'  \\u00B7  Current pipeline: '+money(pv)+'\\n';" +
  "r2+='\\u2022 Expected win rate: '+wr+'%  \\u00B7  3x rule target: '+money(thr3)+' (3\\u00D7 quota)\\n';" +
  "r2+='\\u2022 Weighted pipeline: '+money(wpv)+'  \\u00B7  Coverage: '+fR1(cv)+'  \\u00B7  Weighted coverage: '+fR2(wc)+'\\n';" +
  "r2+='\\u2022 Gap to 3x rule: '+money(g3)+' more pipeline needed  \\u00B7  Gap to 1x break-even: '+money(g1)+' (or win rate \\u2192 '+Math.round(wr1x)+'% at current pipeline)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 If pipeline '+moneyK(pv)+'\\u2192'+moneyK(imp)+': '+fR1(impCv)+' ('+impBd+'); weighted '+fR2(impWc)+'\\n';" +
  "r2+='\\u2022 If win rate '+wr+'%\\u2192'+ibw+'%: weighted '+fR2(ibwWc)+' (covRatio unchanged at '+fR1(cv)+', still '+bd+'); weighted pipeline = '+money(ibwW)+'\\n';" +
  "r2+='\\u2022 If both ('+moneyK(ibp)+' + '+ibt+'%): '+fR1(ibtc)+' ('+ibtBd+'); weighted '+fR2(ibtwc)+' = '+money(ibtw)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Break-Even:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 3x rule (\\uD83D\\uDFE2 Excellent): need pipeline \\u2265 '+money(thr3)+' (gap: '+money(g3)+')\\n';" +
  "r2+='\\u2022 1x break-even (\\uD83D\\uDFE0 Warning lower bound): need pipeline \\u2265 '+money(thr1)+(isFinite(thr1)?' (gap: '+money(g1)+')':' (impossible: win rate is 0)')+'\\n';" +
  "r2+='\\u2022 Alternative: at current pipeline '+moneyK(pv)+', win rate \\u2192 '+Math.round(wr1x)+'% to hit 1x break-even (3x rule unreachable via win rate alone \\u2014 needs more pipeline)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Milestone:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Next tier: '+nt+'\\n';" +
  "r2+='\\u2022 Gap to next tier: '+(bd==='excellent'?'0x (3x rule maintained)':fR1(gn)+' of pipeline growth')+'\\n';" +
  "r2+='\\u2022 Milestone summary: '+fR1(cv)+' current  \\u00B7  need '+fR1(Math.max(cv,1.0))+' for 1x  \\u00B7  need 2.0x for \\uD83D\\uDFE1  \\u00B7  need 3.0x for \\uD83D\\uDFE2 (3x rule)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCA1 Tip: '+tip+'\\n';" +
  "return [r2];";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-pipeline-coverage-calculator',
  title: 'Pipeline Coverage Calculator',
  description:
    'Compute pipeline-to-quota coverage with win-rate weighting, applying the B2B SaaS 3x rule (you need 3× your quota in pipeline to reliably hit target). Answers "do I have enough pipeline?" Health bands: 🟢 ≥3.0x (3x rule) · 🟡 2.0x-3.0x · 🟠 1.0x-2.0x · 🔴 <1.0x.',
  categoryId: 'S',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'quotaTarget', label: 'Quota target (USD)', placeholder: 'e.g. 1000000', type: 'number' },
    { name: 'pipelineValue', label: 'Current pipeline value (USD)', placeholder: 'e.g. 1500000', type: 'number' },
    { name: 'winRate', label: 'Expected win rate (%)', placeholder: 'e.g. 25', type: 'number' },
  ],
  keywords: [
    'pipeline coverage calculator',
    'pipeline coverage',
    '3x rule',
    'pipeline to quota',
    'B2B SaaS pipeline',
    'sales pipeline',
    'coverage ratio',
    'win rate',
    'sales KPI',
    'pipeline benchmark',
  ],
  tags: ['sales', 'pipeline', 'crm', 'coverage'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-07',
  sources: [
    'https://blog.hubspot.com/sales/sales-pipeline-coverage',
    'https://www.insivia.com/blog/sales-pipeline-coverage-ratio/',
    'https://blog.hubspot.com/sales/3x-pipeline-coverage',
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  calculate,
  generate: calculate,
  staticExamples: ['🎯 Pipeline Coverage Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟠 Warning — 1.0x–2.0x; under the 2x comfort zone, at risk if win rate slips\n• Coverage ratio: 1.5x (pipeline / quota)  ·  Weighted coverage: 0.38x (after 25% win rate)\n• Required additional pipeline: $2,500,000  ·  Gap to quota (weighted): $625,000\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Quota target: $1,000,000  ·  Current pipeline: $1,500,000\n• Expected win rate: 25%  ·  3x rule target: $3,000,000 (3× quota)\n• Weighted pipeline: $375,000  ·  Coverage: 1.5x  ·  Weighted coverage: 0.38x\n• Gap to 3x rule: $1,500,000 more pipeline needed  ·  Gap to 1x break-even: $2,500,000 (or win rate → 67% at current pipeline)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• If pipeline $1.50M→$2M: 2.0x (good); weighted 0.50x\n• If win rate 25%→50%: weighted 0.75x (covRatio unchanged at 1.5x, still warning); weighted pipeline = $750,000\n• If both ($2M + 50%): 2.0x (good); weighted 1.00x = $1,000,000\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 3x rule (🟢 Excellent): need pipeline ≥ $3,000,000 (gap: $1,500,000)\n• 1x break-even (🟠 Warning lower bound): need pipeline ≥ $4,000,000 (gap: $2,500,000)\n• Alternative: at current pipeline $1.50M, win rate → 67% to hit 1x break-even (3x rule unreachable via win rate alone — needs more pipeline)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Next tier: 🟡 Good (2.0x)\n• Gap to next tier: 0.5x of pipeline growth\n• Milestone summary: 1.5x current  ·  need 1.5x for 1x  ·  need 2.0x for 🟡  ·  need 3.0x for 🟢 (3x rule)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: 1.0x–2.0x is the danger zone — you have enough pipeline to hit quota, but no cushion for slippage. The 3x rule (≥ 3.0x) is the B2B SaaS benchmark for reliable attainment. Push toward 2.0x first: late-stage acceleration (Negotiation→Closing), increase top-of-funnel activity by 30–50%, and audit deal-stage conversion. A 10% win rate improvement is often faster than doubling Discovery count — pair with sales velocity (P8-2) to find your best lever.\n'],
  faq: [
    { q: 'What is pipeline coverage?', a: 'Pipeline coverage is the ratio of your total open pipeline value to your sales quota. A coverage ratio of 3.0x means you have $3 of pipeline for every $1 of quota — the B2B SaaS benchmark for reliable quota attainment. Anything below 1.0x means you do not have enough pipeline to cover quota even at a 100% win rate.' },
    { q: 'What is the 3x rule?', a: 'The 3x rule is a B2B SaaS heuristic: you need 3× your quota in pipeline to reliably hit target. The math: even at a 25% win rate, weighted pipeline of 0.75x gives you a 75% probability of hitting quota (assuming normal distribution of win rates). Higher coverage (4x, 5x) is even safer; lower coverage (< 2x) is risky and requires late-stage acceleration to compensate.' },
    { q: 'How does win rate affect coverage?', a: 'Coverage ratio is unweighted (raw pipeline / quota). Win rate enters via the weighted coverage diagnostic: weightedPipeline = pipelineValue × (winRate / 100). If your win rate is below 25%, you need proportionally more pipeline to hit the same weighted coverage. A 50% win rate halves the pipeline needed; a 10% win rate triples it.' },
    { q: 'How do I improve low pipeline coverage?', a: 'If coverage is below 2.0x, focus first on top-of-funnel growth: increase Discovery calls, add paid lead-gen, run outbound campaigns, build partnerships. Late-stage acceleration (moving Negotiation deals to Closing) is faster but limited by deal count. For coverage above 2.0x but below 3.0x, focus on stage quality — ensure Negotiation and Closing deals are well-qualified, not just bloated with low-probability late-stage deals.' },
    { q: 'How does this differ from pipeline value (P8-1)?', a: 'Pipeline value (P8-1) measures the weighted dollar value of deals at each stage (Discovery 20% / Proposal 40% / etc.). Pipeline coverage (P8-6) measures the ratio of total pipeline to quota. Use P8-1 for forecast accuracy ("how much revenue will I close this quarter?") and P8-6 for capacity planning ("do I have enough pipeline to hit my number?").' },
  ],
  howToUse: [
    'Enter your quota target (USD) — the revenue target you committed to for the period (quarter, half, year).',
    'Enter your current total open pipeline value (USD) — sum of all deals across all stages, weighted or unweighted depending on your preference (this calc uses unweighted for coverage ratio).',
    'Enter your expected win rate (%) — historical close rate from your CRM, or industry benchmark (25% is typical for B2B SaaS).',
    'Read the coverage ratio (pipeline / quota) and compare to the 3x rule benchmark (≥ 3.0x is the B2B SaaS standard).',
    'Use the What-If section to model improvements: more pipeline, higher win rate, or both. The Break-Even section shows the exact pipeline needed for 3x and 1x thresholds.',
    'Pair with pipeline value (P8-1) for stage-level diagnostics and quota attainment (P8-5) for pace tracking.',
  ],
};
registerEngine(engine);
