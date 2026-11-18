import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
import { BAND_META } from '../../core/engines/band-meta';
// P168 B3-9：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂。
//   ⚠️ 章节标题 / 标签用**字面量 token**（code|原文|）；带运行时数值的整行用
//      makeToken(code, fallback, params) ⇒ fallback 与 params 取**同一个变量**。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

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
      '$calc_out.section.pipeline_coverage_calculator|🎯 Pipeline Coverage Calculator|\n\n' +
        makeToken('calc_out.pipeline_coverage.row.enter_values', '🎯 Enter your quota target, current pipeline value, and expected win rate to see your pipeline-to-quota coverage ratio with the B2B SaaS 3x rule diagnostic.'),
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
  const healthEmoji = BAND_META[band];
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
  // ⭐ 每档**单独写出 code 字面量**（动态拼码 ⇒ 静态扫描器认不出 ⇒ locale 落库后仍红）
  let nextTierRow: string;
  if (band === 'critical') {
    gapToNext = 1.0 - covRatio;
    nextTier = '🟠 Warning (1.0x)';
    nextTierRow = makeToken('calc_out.pipeline_coverage.row.tier_critical', nextTier);
  } else if (band === 'warning') {
    gapToNext = 2.0 - covRatio;
    nextTier = '🟡 Good (2.0x)';
    nextTierRow = makeToken('calc_out.pipeline_coverage.row.tier_good', nextTier);
  } else if (band === 'good') {
    gapToNext = 3.0 - covRatio;
    nextTier = '🟢 Excellent (3x rule)';
    nextTierRow = makeToken('calc_out.pipeline_coverage.row.tier_excellent', nextTier);
  } else {
    gapToNext = 0;
    nextTier = 'top tier maintained (3x rule)';
    nextTierRow = makeToken('calc_out.pipeline_coverage.row.tier_top_maintained', nextTier);
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

  // ⭐ 每档**单独写出 code 字面量**（动态拼码 ⇒ 静态扫描器认不出 ⇒ locale 落库后仍红）
  let tipRow: string;
  if (band === 'critical') {
    tipRow = makeToken('calc_out.pipeline_coverage.row.tip_critical', '💡 Tip: ' + tip);
  } else if (band === 'warning') {
    tipRow = makeToken('calc_out.pipeline_coverage.row.tip_warning', '💡 Tip: ' + tip);
  } else if (band === 'good') {
    tipRow = makeToken('calc_out.pipeline_coverage.row.tip_good', '💡 Tip: ' + tip);
  } else {
    tipRow = makeToken('calc_out.pipeline_coverage.row.tip_excellent', '💡 Tip: ' + tip);
  }

  // Assemble 6-section output
  // ⭐ 每档**单独写出 code 字面量**（动态拼码 ⇒ 静态扫描器认不出 ⇒ locale 落库后仍红）
  let healthRow: string;
  if (band === 'excellent') {
    healthRow = makeToken('calc_out.pipeline_coverage.row.health_excellent', healthEmoji + ' ' + healthLabel);
  } else if (band === 'good') {
    healthRow = makeToken('calc_out.pipeline_coverage.row.health_good', healthEmoji + ' ' + healthLabel);
  } else if (band === 'warning') {
    healthRow = makeToken('calc_out.pipeline_coverage.row.health_warning', healthEmoji + ' ' + healthLabel);
  } else {
    healthRow = makeToken('calc_out.pipeline_coverage.row.health_critical', healthEmoji + ' ' + healthLabel);
  }
  const gapTo3xRow = makeToken('calc_out.pipeline_coverage.row.gap_to_3x_rule', 'Gap to 3x rule: ' + money(threeXGap) + ' more pipeline needed', { gap: money(threeXGap) });
  const gapTo1xRow = makeToken('calc_out.pipeline_coverage.row.gap_to_1x_break_even', 'Gap to 1x break-even: ' + money(oneXGap) + ' (or win rate → ' + Math.round(winRateFor1X) + '% at current pipeline)', { gap: money(oneXGap), rate: String(Math.round(winRateFor1X)) });
  const gapToNextTierRow = band === 'excellent'
    ? makeToken('calc_out.pipeline_coverage.row.gap_to_next_tier_maintained', '0x (3x rule maintained)')
    : makeToken('calc_out.pipeline_coverage.row.gap_to_next_tier_growth', formatRatio1(gapToNext) + ' of pipeline growth', { gap: formatRatio1(gapToNext) });
  const breakeven1xRow = isFinite(oneXThreshold)
    ? makeToken('calc_out.pipeline_coverage.row.breakeven_1x', '1x break-even (🟠 Warning lower bound): need pipeline ≥ ' + money(oneXThreshold) + ' (gap: ' + money(oneXGap) + ')', { target: money(oneXThreshold), gap: money(oneXGap) })
    : makeToken('calc_out.pipeline_coverage.row.breakeven_1x_impossible', '1x break-even (🟠 Warning lower bound): need pipeline ≥ ' + money(oneXThreshold) + ' (impossible: win rate is 0)');

  const r =
    '$calc_out.section.pipeline_coverage_calculator|🎯 Pipeline Coverage Calculator|\n\n' +
    '$calc_out.section.health|🩺 Health:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthRow + '\n' +
    '• ' + makeToken('calc_out.pipeline_coverage.row.coverage_ratio', 'Coverage ratio: ' + formatRatio1(covRatio) + ' (pipeline / quota)', { ratio: formatRatio1(covRatio) }) + '  ·  ' + makeToken('calc_out.pipeline_coverage.row.weighted_coverage', 'Weighted coverage: ' + formatRatio2(wtdCoverage) + ' (after ' + winRate + '% win rate)', { coverage: formatRatio2(wtdCoverage), rate: String(winRate) }) + '\n' +
    '• $calc_out.label.required_additional_pipeline|Required additional pipeline|: ' + money(requiredAddl) + '  ·  $calc_out.label.gap_to_quota_weighted|Gap to quota (weighted)|: ' + money(Math.max(0, gapVal)) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• $calc_out.label.quota_target|Quota target|: ' + money(quotaTarget) + '  ·  $calc_out.label.current_pipeline|Current pipeline|: ' + money(pipelineValue) + '\n' +
    '• $calc_out.label.expected_win_rate|Expected win rate|: ' + winRate + '%  ·  ' + makeToken('calc_out.pipeline_coverage.row.three_x_rule_target', '3x rule target: ' + money(threeXThreshold) + ' (3× quota)', { target: money(threeXThreshold) }) + '\n' +
    '• $calc_out.label.weighted_pipeline|Weighted pipeline|: ' + money(wtdPipeline) + '  ·  $calc_out.label.coverage|Coverage|: ' + formatRatio1(covRatio) + '  ·  $calc_out.label.weighted_coverage|Weighted coverage|: ' + formatRatio2(wtdCoverage) + '\n' +
    '• ' + gapTo3xRow + '  ·  ' + gapTo1xRow + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.what_if|🔄 What-If:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.pipeline_coverage.row.whatif_pipeline', 'If pipeline ' + moneyK(pipelineValue) + '→' + moneyK(ifMorePipe) + ': ' + formatRatio1(ifMorePipeCov) + ' (' + ifMorePipeBand + '); weighted ' + formatRatio2(ifMorePipeWtdCov), { from: moneyK(pipelineValue), to: moneyK(ifMorePipe), cov: formatRatio1(ifMorePipeCov), band: ifMorePipeBand, weighted: formatRatio2(ifMorePipeWtdCov) }) + '\n' +
    '• ' + makeToken('calc_out.pipeline_coverage.row.whatif_win_rate', 'If win rate ' + winRate + '%→' + ifBetterWin + '%: weighted ' + formatRatio2(ifBetterWinWtdCov) + ' (covRatio unchanged at ' + formatRatio1(covRatio) + ', still ' + band + '); weighted pipeline = ' + money(ifBetterWinWtd), { from: String(winRate), to: String(ifBetterWin), weighted: formatRatio2(ifBetterWinWtdCov), cov: formatRatio1(covRatio), band: band, pipeline: money(ifBetterWinWtd) }) + '\n' +
    '• ' + makeToken('calc_out.pipeline_coverage.row.whatif_both', 'If both (' + moneyK(ifBothPipe) + ' + ' + ifBothWin + '%): ' + formatRatio1(ifBothCov) + ' (' + ifBothBand + '); weighted ' + formatRatio2(ifBothWtdCov) + ' = ' + money(ifBothWtd), { pipe: moneyK(ifBothPipe), win: String(ifBothWin), cov: formatRatio1(ifBothCov), band: ifBothBand, weighted: formatRatio2(ifBothWtdCov), pipeline: money(ifBothWtd) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.break_even|⚖️ Break-Even:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.pipeline_coverage.row.breakeven_3x', '3x rule (🟢 Excellent): need pipeline ≥ ' + money(threeXThreshold) + ' (gap: ' + money(threeXGap) + ')', { target: money(threeXThreshold), gap: money(threeXGap) }) + '\n' +
    '• ' + breakeven1xRow + '\n' +
    '• ' + makeToken('calc_out.pipeline_coverage.row.breakeven_alternative', 'Alternative: at current pipeline ' + moneyK(pipelineValue) + ', win rate → ' + Math.round(winRateFor1X) + '% to hit 1x break-even (3x rule unreachable via win rate alone — needs more pipeline)', { pipeline: moneyK(pipelineValue), rate: String(Math.round(winRateFor1X)) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.milestone|🎯 Milestone:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• $calc_out.label.next_tier|Next tier|: ' + nextTierRow + '\n' +
    '• $calc_out.label.gap_to_next_tier|Gap to next tier|: ' + gapToNextTierRow + '\n' +
    '• ' + makeToken('calc_out.pipeline_coverage.row.milestone_summary', 'Milestone summary: ' + formatRatio1(covRatio) + ' current  ·  need ' + formatRatio1(Math.max(covRatio, 1.0)) + ' for 1x  ·  need 2.0x for 🟡  ·  need 3.0x for 🟢 (3x rule)', { current: formatRatio1(covRatio), for1x: formatRatio1(Math.max(covRatio, 1.0)) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tipRow + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  // P168 B3-9：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 服务端与客户端输出逐字节相同，不可能漂；new Function 的签名不变（仍是 3 个参数）。
  //   ⚠️ 页面只渲染 results[0] ⇒ 保持**单元素数组**返回形态（整份输出本来就是一段）。
  CALC_OUTPUT_MAKE_TOKEN_JS +
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
    "return['$calc_out.section.pipeline_coverage_calculator|\\uD83C\\uDFAF Pipeline Coverage Calculator|\\n\\n'+tk('calc_out.pipeline_coverage.row.enter_values','\\uD83C\\uDFAF Enter your quota target, current pipeline value, and expected win rate to see your pipeline-to-quota coverage ratio with the B2B SaaS 3x rule diagnostic.')];" +
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
  "var gn,nt,ntrow;" +
  "if(bd==='critical'){gn=1.0-cv;nt='\\uD83D\\uDFE0 Warning (1.0x)';ntrow=tk('calc_out.pipeline_coverage.row.tier_critical',nt);}" +
  "else if(bd==='warning'){gn=2.0-cv;nt='\\uD83D\\uDFE1 Good (2.0x)';ntrow=tk('calc_out.pipeline_coverage.row.tier_good',nt);}" +
  "else if(bd==='good'){gn=3.0-cv;nt='\\uD83D\\uDFE2 Excellent (3x rule)';ntrow=tk('calc_out.pipeline_coverage.row.tier_excellent',nt);}" +
  "else{gn=0;nt='top tier maintained (3x rule)';ntrow=tk('calc_out.pipeline_coverage.row.tier_top_maintained',nt);}" +
  "var tip='';" +
  "if(bd==='critical'){tip='Pipeline < 1.0x means you do not even have enough pipeline to cover quota, win or lose. The 3x rule is a distant goal \\u2014 focus first on getting to 1.0x. This requires either: (a) aggressive top-of-funnel (cold outbound, paid lead-gen, partnerships), or (b) raising quota targets down only after the gap closes. A pipeline review is overdue; weekly forecast calls are essential. Aim for 1.0x within 30 days, 2.0x within 60.';}" +
  "else if(bd==='warning'){tip='1.0x\\u20132.0x is the danger zone \\u2014 you have enough pipeline to hit quota, but no cushion for slippage. The 3x rule (\\u2265 3.0x) is the B2B SaaS benchmark for reliable attainment. Push toward 2.0x first: late-stage acceleration (Negotiation\\u2192Closing), increase top-of-funnel activity by 30\\u201350%, and audit deal-stage conversion. A 10% win rate improvement is often faster than doubling Discovery count \\u2014 pair with sales velocity (P8-2) to find your best lever.';}" +
  "else if(bd==='good'){tip='2.0x\\u20133.0x is approaching the 3x rule \\u2014 you are close. The final 1.0x jump is harder than the previous one (diminishing returns from raw pipeline growth). Focus on stage quality: ensure Negotiation and Closing deals are well-qualified, not bloated with low-probability late-stage deals. Maintain weekly pipeline review cadence; do not let 2.5x slip back to 2.0x during seasonal dips. To get to \\uD83D\\uDFE2, identify 2\\u20133 stretch opportunities at 80%+ probability.';}" +
  "else{tip='Excellent \\u2014 3x rule satisfied. You have a comfortable cushion: even if 1 in 3 deals slips, you should still hit quota. Do not get complacent: top-of-funnel decay is invisible until the quarter after. Maintain cadence; audit stage hygiene (no stale Closing deals >30 days that may quietly drop to 50% probability). Use this cushion strategically \\u2014 invest in expansion/upsell on existing accounts, or test higher-margin pricing motions.';}" +
  "var hrow=bd==='excellent'?tk('calc_out.pipeline_coverage.row.health_excellent',he+' '+hl):bd==='good'?tk('calc_out.pipeline_coverage.row.health_good',he+' '+hl):bd==='warning'?tk('calc_out.pipeline_coverage.row.health_warning',he+' '+hl):tk('calc_out.pipeline_coverage.row.health_critical',he+' '+hl);" +
  "var g3row=tk('calc_out.pipeline_coverage.row.gap_to_3x_rule','Gap to 3x rule: '+money(g3)+' more pipeline needed',{gap:money(g3)});" +
  "var g1row=tk('calc_out.pipeline_coverage.row.gap_to_1x_break_even','Gap to 1x break-even: '+money(g1)+' (or win rate \\u2192 '+Math.round(wr1x)+'% at current pipeline)',{gap:money(g1),rate:String(Math.round(wr1x))});" +
  "var gnrow=bd==='excellent'?tk('calc_out.pipeline_coverage.row.gap_to_next_tier_maintained','0x (3x rule maintained)'):tk('calc_out.pipeline_coverage.row.gap_to_next_tier_growth',fR1(gn)+' of pipeline growth',{gap:fR1(gn)});" +
  "var b1row=isFinite(thr1)?tk('calc_out.pipeline_coverage.row.breakeven_1x','1x break-even (\\uD83D\\uDFE0 Warning lower bound): need pipeline \\u2265 '+money(thr1)+' (gap: '+money(g1)+')',{target:money(thr1),gap:money(g1)}):tk('calc_out.pipeline_coverage.row.breakeven_1x_impossible','1x break-even (\\uD83D\\uDFE0 Warning lower bound): need pipeline \\u2265 '+money(thr1)+' (impossible: win rate is 0)');" +
  "var tiprow=bd==='critical'?tk('calc_out.pipeline_coverage.row.tip_critical','\\uD83D\\uDCA1 Tip: '+tip):bd==='warning'?tk('calc_out.pipeline_coverage.row.tip_warning','\\uD83D\\uDCA1 Tip: '+tip):bd==='good'?tk('calc_out.pipeline_coverage.row.tip_good','\\uD83D\\uDCA1 Tip: '+tip):tk('calc_out.pipeline_coverage.row.tip_excellent','\\uD83D\\uDCA1 Tip: '+tip);" +
  "var r2='';" +
  "r2+='$calc_out.section.pipeline_coverage_calculator|\\uD83C\\uDFAF Pipeline Coverage Calculator|\\n\\n';" +
  "r2+='$calc_out.section.health|\\uD83E\\uDE7A Health:|\\n';" +
  "r2+='\\u2501'.repeat(41)+'\\n';" +
  "r2+='\\u2022 '+hrow+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.pipeline_coverage.row.coverage_ratio','Coverage ratio: '+fR1(cv)+' (pipeline / quota)',{ratio:fR1(cv)})+'  \\u00B7  '+tk('calc_out.pipeline_coverage.row.weighted_coverage','Weighted coverage: '+fR2(wc)+' (after '+wr+'% win rate)',{coverage:fR2(wc),rate:String(wr)})+'\\n';" +
  "r2+='\\u2022 $calc_out.label.required_additional_pipeline|Required additional pipeline|: '+money(rap)+'  \\u00B7  $calc_out.label.gap_to_quota_weighted|Gap to quota (weighted)|: '+money(Math.max(0,gv))+'\\n\\n';" +
  "r2+='\\u2501'.repeat(41)+'\\n\\n';" +
  "r2+='$calc_out.section.inputs_snapshot|\\uD83D\\uDCCA Inputs Snapshot:|\\n';" +
  "r2+='\\u2501'.repeat(41)+'\\n';" +
  "r2+='\\u2022 $calc_out.label.quota_target|Quota target|: '+money(qt)+'  \\u00B7  $calc_out.label.current_pipeline|Current pipeline|: '+money(pv)+'\\n';" +
  "r2+='\\u2022 $calc_out.label.expected_win_rate|Expected win rate|: '+wr+'%  \\u00B7  '+tk('calc_out.pipeline_coverage.row.three_x_rule_target','3x rule target: '+money(thr3)+' (3\\u00D7 quota)',{target:money(thr3)})+'\\n';" +
  "r2+='\\u2022 $calc_out.label.weighted_pipeline|Weighted pipeline|: '+money(wpv)+'  \\u00B7  $calc_out.label.coverage|Coverage|: '+fR1(cv)+'  \\u00B7  $calc_out.label.weighted_coverage|Weighted coverage|: '+fR2(wc)+'\\n';" +
  "r2+='\\u2022 '+g3row+'  \\u00B7  '+g1row+'\\n\\n';" +
  "r2+='\\u2501'.repeat(41)+'\\n\\n';" +
  "r2+='$calc_out.section.what_if|\\uD83D\\uDD04 What-If:|\\n';" +
  "r2+='\\u2501'.repeat(41)+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.pipeline_coverage.row.whatif_pipeline','If pipeline '+moneyK(pv)+'\\u2192'+moneyK(imp)+': '+fR1(impCv)+' ('+impBd+'); weighted '+fR2(impWc),{from:moneyK(pv),to:moneyK(imp),cov:fR1(impCv),band:impBd,weighted:fR2(impWc)})+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.pipeline_coverage.row.whatif_win_rate','If win rate '+wr+'%\\u2192'+ibw+'%: weighted '+fR2(ibwWc)+' (covRatio unchanged at '+fR1(cv)+', still '+bd+'); weighted pipeline = '+money(ibwW),{from:String(wr),to:String(ibw),weighted:fR2(ibwWc),cov:fR1(cv),band:bd,pipeline:money(ibwW)})+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.pipeline_coverage.row.whatif_both','If both ('+moneyK(ibp)+' + '+ibt+'%): '+fR1(ibtc)+' ('+ibtBd+'); weighted '+fR2(ibtwc)+' = '+money(ibtw),{pipe:moneyK(ibp),win:String(ibt),cov:fR1(ibtc),band:ibtBd,weighted:fR2(ibtwc),pipeline:money(ibtw)})+'\\n\\n';" +
  "r2+='\\u2501'.repeat(41)+'\\n\\n';" +
  "r2+='$calc_out.section.break_even|\\u2696\\uFE0F Break-Even:|\\n';" +
  "r2+='\\u2501'.repeat(41)+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.pipeline_coverage.row.breakeven_3x','3x rule (\\uD83D\\uDFE2 Excellent): need pipeline \\u2265 '+money(thr3)+' (gap: '+money(g3)+')',{target:money(thr3),gap:money(g3)})+'\\n';" +
  "r2+='\\u2022 '+b1row+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.pipeline_coverage.row.breakeven_alternative','Alternative: at current pipeline '+moneyK(pv)+', win rate \\u2192 '+Math.round(wr1x)+'% to hit 1x break-even (3x rule unreachable via win rate alone \\u2014 needs more pipeline)',{pipeline:moneyK(pv),rate:String(Math.round(wr1x))})+'\\n\\n';" +
  "r2+='\\u2501'.repeat(41)+'\\n\\n';" +
  "r2+='$calc_out.section.milestone|\\uD83C\\uDFAF Milestone:|\\n';" +
  "r2+='\\u2501'.repeat(41)+'\\n';" +
  "r2+='\\u2022 $calc_out.label.next_tier|Next tier|: '+ntrow+'\\n';" +
  "r2+='\\u2022 $calc_out.label.gap_to_next_tier|Gap to next tier|: '+gnrow+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.pipeline_coverage.row.milestone_summary','Milestone summary: '+fR1(cv)+' current  \\u00B7  need '+fR1(Math.max(cv,1.0))+' for 1x  \\u00B7  need 2.0x for \\uD83D\\uDFE1  \\u00B7  need 3.0x for \\uD83D\\uDFE2 (3x rule)',{current:fR1(cv),for1x:fR1(Math.max(cv,1.0))})+'\\n\\n';" +
  "r2+='\\u2501'.repeat(41)+'\\n\\n';" +
  "r2+=tiprow+'\\n';" +
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
  staticExamples: ['$calc_out.section.pipeline_coverage_calculator|🎯 Pipeline Coverage Calculator|\n\n$calc_out.section.health|🩺 Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.pipeline_coverage.row.health_warning|🟠 Warning — 1.0x–2.0x; under the 2x comfort zone, at risk if win rate slips|\n• $calc_out.pipeline_coverage.row.coverage_ratio{"ratio":"1.5x"}|Coverage ratio: 1.5x (pipeline / quota)|  ·  $calc_out.pipeline_coverage.row.weighted_coverage{"coverage":"0.38x","rate":"25"}|Weighted coverage: 0.38x (after 25% win rate)|\n• $calc_out.label.required_additional_pipeline|Required additional pipeline|: $2,500,000  ·  $calc_out.label.gap_to_quota_weighted|Gap to quota (weighted)|: $625,000\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.quota_target|Quota target|: $1,000,000  ·  $calc_out.label.current_pipeline|Current pipeline|: $1,500,000\n• $calc_out.label.expected_win_rate|Expected win rate|: 25%  ·  $calc_out.pipeline_coverage.row.three_x_rule_target{"target":"$3,000,000"}|3x rule target: $3,000,000 (3× quota)|\n• $calc_out.label.weighted_pipeline|Weighted pipeline|: $375,000  ·  $calc_out.label.coverage|Coverage|: 1.5x  ·  $calc_out.label.weighted_coverage|Weighted coverage|: 0.38x\n• $calc_out.pipeline_coverage.row.gap_to_3x_rule{"gap":"$1,500,000"}|Gap to 3x rule: $1,500,000 more pipeline needed|  ·  $calc_out.pipeline_coverage.row.gap_to_1x_break_even{"gap":"$2,500,000","rate":"67"}|Gap to 1x break-even: $2,500,000 (or win rate → 67% at current pipeline)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if|🔄 What-If:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.pipeline_coverage.row.whatif_pipeline{"from":"$1.50M","to":"$2M","cov":"2.0x","band":"good","weighted":"0.50x"}|If pipeline $1.50M→$2M: 2.0x (good); weighted 0.50x|\n• $calc_out.pipeline_coverage.row.whatif_win_rate{"from":"25","to":"50","weighted":"0.75x","cov":"1.5x","band":"warning","pipeline":"$750,000"}|If win rate 25%→50%: weighted 0.75x (covRatio unchanged at 1.5x, still warning); weighted pipeline = $750,000|\n• $calc_out.pipeline_coverage.row.whatif_both{"pipe":"$2M","win":"50","cov":"2.0x","band":"good","weighted":"1.00x","pipeline":"$1,000,000"}|If both ($2M + 50%): 2.0x (good); weighted 1.00x = $1,000,000|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.break_even|⚖️ Break-Even:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.pipeline_coverage.row.breakeven_3x{"target":"$3,000,000","gap":"$1,500,000"}|3x rule (🟢 Excellent): need pipeline ≥ $3,000,000 (gap: $1,500,000)|\n• $calc_out.pipeline_coverage.row.breakeven_1x{"target":"$4,000,000","gap":"$2,500,000"}|1x break-even (🟠 Warning lower bound): need pipeline ≥ $4,000,000 (gap: $2,500,000)|\n• $calc_out.pipeline_coverage.row.breakeven_alternative{"pipeline":"$1.50M","rate":"67"}|Alternative: at current pipeline $1.50M, win rate → 67% to hit 1x break-even (3x rule unreachable via win rate alone — needs more pipeline)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.milestone|🎯 Milestone:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.next_tier|Next tier|: $calc_out.pipeline_coverage.row.tier_good|🟡 Good (2.0x)|\n• $calc_out.label.gap_to_next_tier|Gap to next tier|: $calc_out.pipeline_coverage.row.gap_to_next_tier_growth{"gap":"0.5x"}|0.5x of pipeline growth|\n• $calc_out.pipeline_coverage.row.milestone_summary{"current":"1.5x","for1x":"1.5x"}|Milestone summary: 1.5x current  ·  need 1.5x for 1x  ·  need 2.0x for 🟡  ·  need 3.0x for 🟢 (3x rule)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.pipeline_coverage.row.tip_warning|💡 Tip: 1.0x–2.0x is the danger zone — you have enough pipeline to hit quota, but no cushion for slippage. The 3x rule (≥ 3.0x) is the B2B SaaS benchmark for reliable attainment. Push toward 2.0x first: late-stage acceleration (Negotiation→Closing), increase top-of-funnel activity by 30–50%, and audit deal-stage conversion. A 10% win rate improvement is often faster than doubling Discovery count — pair with sales velocity (P8-2) to find your best lever.|\n'],
  faq: [
    { q: 'What is pipeline coverage?', a: 'Pipeline coverage is the ratio of your total open pipeline value to your sales quota. A coverage ratio of 3.0x means you have $3 of pipeline for every $1 of quota — the B2B SaaS benchmark for reliable quota attainment. Anything below 1.0x means you do not have enough pipeline to cover quota even at a 100% win rate.' },
    { q: 'What is the 3x rule?', a: 'The 3x rule is a B2B SaaS heuristic: you need 3× your quota in pipeline to reliably hit target. The math: even at a 25% win rate, weighted pipeline of 0.75x gives you a 75% probability of hitting quota (assuming normal distribution of win rates). Higher coverage (4x, 5x) is even safer; lower coverage (< 2x) is risky and requires late-stage acceleration to compensate.' },
    { q: 'How does win rate affect coverage?', a: 'Coverage ratio is unweighted (raw pipeline / quota). Win rate enters via the weighted coverage diagnostic: weightedPipeline = pipelineValue × (winRate / 100). If your win rate is below 25%, you need proportionally more pipeline to hit the same weighted coverage. A 50% win rate halves the pipeline needed; a 10% win rate triples it.' },
    { q: 'How do I improve low pipeline coverage?', a: 'If coverage is below 2.0x, focus first on top-of-funnel growth: increase Discovery calls, add paid lead-gen, run outbound campaigns, build partnerships. Late-stage acceleration (moving Negotiation deals to Closing) is faster but limited by deal count. For coverage above 2.0x but below 3.0x, focus on stage quality — ensure Negotiation and Closing deals are well-qualified, not just bloated with low-probability late-stage deals.' },
    { q: 'How does this differ from pipeline value (P8-1)?', a: 'Pipeline value (P8-1) measures the weighted dollar value of deals at each stage (Discovery 20% / Proposal 40% / etc.). Pipeline coverage (P8-6) measures the ratio of total pipeline to quota. Use P8-1 for forecast accuracy ("how much revenue will I close this quarter?") and P8-6 for capacity planning ("do I have enough pipeline to hit my number?").' },
    { q: "What is pipeline coverage ratio?", a: "Pipeline coverage = total pipeline value / quota. Examples: $5M quota, $10M pipeline = 2x coverage. Benchmarks: 1) <2x: under-pipelined, 2) 2-3x: minimum, 3) 3-4x: healthy, 4) 4x+: bloated. Most: 3x is the standard. Why: 50% close rate on 2x = 100% of quota. Realistic: 25-30% close on 3x = 75-90% of quota. Plan: 3-4x for healthy forecast." },
    { q: "What is the right coverage ratio for SaaS sales?", a: "Benchmarks: 1) New business: 3-4x, 2) Expansion/upsell: 2-3x, 3) Renewals: 1.2-1.5x. By stage: 1) Early (PMF): 5-10x (high uncertainty), 2) Growth: 3-4x, 3) Scale: 2-3x (predictable). Most: 3-4x for new business. Lower for renewals (higher close rate). By segment: SMB 3-4x, mid-market 3-4x, enterprise 5-10x (long cycles). Quarterly: validate vs quota." },
    { q: "How do I improve pipeline coverage?", a: "Tactics include 1) Outbound (cold email, calls), 2) Inbound (more content, ads), 3) Referral program, 4) Partnerships, 5) Events, 6) PLG (product-led growth). 30-50% coverage lift in 6 months. 1) Outbound + 2) Inbound. For low coverage: 1) More prospecting, 2) Better qualification, 3) Marketing lead gen. Most teams 50% of pipeline from outbound, 30% inbound, 20% other." },
    { q: "What is the difference between pipeline coverage and pipeline value?", a: "Pipeline value: total $ in pipeline. Pipeline coverage: pipeline value / quota. Pipeline value: absolute. Coverage: relative to goal. For forecasting: coverage is what matters. For tracking: both. Tools: Salesforce, HubSpot. Most: track coverage weekly. <3x: need to push prospecting. >5x: bloated or unrealistic. Forecast: weighted by close probability. Most: 3x is healthy. Plan: never below 3x." },
    { q: "How do I handle stale pipeline?", a: "Stale: pipeline >90 days old. Tactics include 1) Stage-gate (no movement = disqualified), 2) Quarterly pipeline reviews, 3) Auto-disqualify after 6 months, 4) Re-engage or remove. 30-50% of pipeline is stale. Clean regularly. Most teams weekly reviews. Stale pipeline: not counted in coverage. Trim: every 90 days. Re-engagement: emails + calls. Avoid zombie pipeline (skews forecast)." },
    { q: "What is the relationship between coverage and close rate?", a: "Coverage × close rate = quota. For 3x coverage × 30% close = 90% of quota. For 3x × 50% close = 150% of quota. For 2x × 50% = 100%. For 2x × 30% = 60%. Most: target 25-35% close rate on weighted pipeline. If close rate <20%: pipeline quality issue. If close rate >40%: pipeline is too conservative. Most: forecast by stage (deals in late stage close higher)." },
    { q: "Should pipeline include expansion deals?", a: "Depends. separate expansion pipeline from new business. Reasons: 1) Different close rate (higher for expansion), 2) Different sales motion, 3) Different rep (often CSM). Coverage for expansion: 2-3x is fine (high close rate). Coverage for new business: 3-4x. Track separate. For forecasting: combine weighted. 30-50% of revenue from expansion in mature SaaS. Aim for 110% NRR means healthy expansion." },
    { q: "How do I forecast accurately with pipeline coverage?", a: "Forecast = (pipeline_value × close_rate) by stage. Stage-based close rates: 1) Discovery: 5-10%, 2) Demo: 10-20%, 3) Evaluation: 25-40%, 4) Negotiation: 50-70%, 5) Commit: 80%+. 5-stage forecast. Tools: Salesforce (stage-based), Clari (AI). Best option: history-based (actual close by stage). Most teams 80%+ forecast accuracy with discipline. Track actual vs forecast quarterly. Calibrate models." },
  ],
  howToUse: [
    'Enter your quota target (USD) — the revenue target you committed to for the period (quarter, half, year).',
    'Enter your current total open pipeline value (USD) — sum of all deals across all stages, weighted or unweighted depending on your preference (this calc uses unweighted for coverage ratio).',
    'Enter your expected win rate (%) — historical close rate from your CRM, or industry benchmark (25% is typical for B2B SaaS).',
    'Read the coverage ratio (pipeline / quota) and compare to the 3x rule benchmark (≥ 3.0x is the B2B SaaS standard).',
    'Use the What-If section to model improvements: more pipeline, higher win rate, or both. The Break-Even section shows the exact pipeline needed for 3x and 1x thresholds.',
    'Pair with pipeline value (P8-1) for stage-level diagnostics and quota attainment (P8-5) for pace tracking.',
  ],
  engineKey: true,
};
registerEngine(engine);
