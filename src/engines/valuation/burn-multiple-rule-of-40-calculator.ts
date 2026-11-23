import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-14：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

// ============== Math helpers (exported for tests) ==============

/**
 * Rule of 40 score: growth rate % + profit margin %. Must be ≥40 to "pass".
 * Negative margins are common at early-stage SaaS — high growth can offset.
 */
export function ruleOf40Score(growthRate: number, profitMargin: number): number {
  return growthRate + profitMargin;
}

export function ruleOf40Health(score: number): {
  emoji: string;
  label: string;
} {
  if (score >= 40) return { emoji: '🟢', label: 'PASS — top-quartile efficiency' };
  if (score >= 25) return { emoji: '🟡', label: 'borderline — close to Rule of 40' };
  if (score >= 10) return { emoji: '🟠', label: 'below — needs improvement' };
  return { emoji: '🔴', label: 'fail — burning without growth' };
}

/**
 * Burn Multiple: $ of net cash burned per $1 of new ARR added.
 * Lower is better. <1 = great, >3 = inefficient.
 * Returns Infinity when netNewARR <= 0.
 */
export function burnMultiple(netBurn: number, netNewARR: number): number {
  if (netNewARR <= 0) return Infinity;
  return netBurn / netNewARR;
}

export function burnMultipleHealth(ratio: number): {
  emoji: string;
  label: string;
} {
  if (ratio < 1) return { emoji: '🟢', label: 'great — <$1 burned per $1 ARR' };
  if (ratio < 1.5) return { emoji: '🟡', label: 'good — efficient growth' };
  if (ratio < 3) return { emoji: '🟠', label: 'concerning — needs tightening' };
  return { emoji: '🔴', label: 'inefficient — too much burn' };
}

/**
 * SaaS Health Quadrant: 2x2 placement based on growth and margin.
 * High growth >= 40%; positive margin >= 0%.
 */
export function saasQuadrant(
  growthRate: number,
  profitMargin: number,
): { emoji: string; label: string } {
  const highGrowth = growthRate >= 40;
  const positiveMargin = profitMargin >= 0;
  if (highGrowth && positiveMargin)
    return { emoji: '🟢', label: 'Stars (high growth + positive margin)' };
  if (highGrowth && !positiveMargin)
    return { emoji: '🟡', label: 'Growers (high growth + negative margin)' };
  if (!highGrowth && positiveMargin)
    return { emoji: '🟡', label: 'Profitable Plowhorses (low growth + positive margin)' };
  return { emoji: '🔴', label: 'Zombies (low growth + negative margin)' };
}

/**
 * Stage benchmark: how does your Burn Multiple compare to median SaaS at your stage?
 * Seed: <2 great, 2-3 good, >3 concerning
 * Series A: <1.5 great, 1.5-2 good, >2 concerning
 * Series B+: <1 great, 1-1.5 good, >1.5 concerning
 */
export function stageBenchmark(
  ratio: number,
  stage: 'seed' | 'a' | 'b',
): string {
  if (!isFinite(ratio)) return '— (no new ARR)';
  const benchmarks: Record<string, { great: number; good: number }> = {
    seed: { great: 2, good: 3 },
    a: { great: 1.5, good: 2 },
    b: { great: 1, good: 1.5 },
  };
  const b = benchmarks[stage];
  if (ratio < b.great) return '🟢 top-quartile for ' + stage;
  if (ratio < b.good) return '🟡 on par for ' + stage;
  return '🟠 above median for ' + stage;
}

// ============== calculate() ==============

function calculateBurnMultiple(inputs: Record<string, string>): string[] {
  // intentionally NOT clamped: semantically can be negative (negative growth / negative margin)
  const growthRate = parseFloat(inputs.revenueGrowth) || 0;
  const profitMargin = parseFloat(inputs.profitMargin) || 0;
  const netBurn = clampNonNegative(parseFloat(inputs.netBurn) || 0);
  const netNewARR = clampNonNegative(parseFloat(inputs.netNewARR) || 0);

  if (growthRate === 0 && profitMargin === 0 && netBurn === 0 && netNewARR === 0) {
    return [
      '⏰ Burn Multiple / Rule of 40 Calculator\n\n' +
        '💰 Enter revenue growth, profit margin, net burn, and net new ARR to see Rule of 40 score and Burn Multiple.',
    ];
  }

  // Rule of 40
  const r40 = ruleOf40Score(growthRate, profitMargin);
  const r40h = ruleOf40Health(r40);

  // Burn Multiple
  const bm = burnMultiple(netBurn, netNewARR);
  const bmh = burnMultipleHealth(bm);

  // Quadrant
  const quad = saasQuadrant(growthRate, profitMargin);

  // Format helpers
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const money = (n: number) => '$' + fmt(n);
  const pct1 = (n: number) => n.toFixed(1) + '%';
  const ratioStr = (n: number) => (isFinite(n) ? n.toFixed(2) : '∞');

  // P168 B3-14：象限图的**标签**令牌化（框线/箭头/空白留在 token 之外 ⇒ 英文页逐字不变）
  //   ⚠️ 中文模板要**补足空格**保持 ASCII 图的列宽（CJK 占 2 列）。
  const qMargin = makeToken('calc_out.burn_multiple_rule_of_40.row.quad_margin', 'Margin →');
  const qNegative = makeToken('calc_out.burn_multiple_rule_of_40.row.quad_negative', 'Negative');
  const qPositive = makeToken('calc_out.burn_multiple_rule_of_40.row.quad_positive', 'Positive');
  const qGrowthHigh = makeToken('calc_out.burn_multiple_rule_of_40.row.quad_growth_high', 'Growth High');
  const qGrowers = makeToken('calc_out.burn_multiple_rule_of_40.row.quad_growers', 'Growers');
  const qStars = makeToken('calc_out.burn_multiple_rule_of_40.row.quad_stars', 'Stars');
  const qLow = makeToken('calc_out.burn_multiple_rule_of_40.row.quad_low', 'Low');
  const qZombies = makeToken('calc_out.burn_multiple_rule_of_40.row.quad_zombies', 'Zombies');
  const qPlowhorses = makeToken('calc_out.burn_multiple_rule_of_40.row.quad_plowhorses', 'Plowhorses');

  // Quadrant chart (ASCII 2x2)
  let quadChart = '';
  if (growthRate >= 40) {
    quadChart += '                ' + qMargin + '\n';
    quadChart += '              ' + qNegative + '        ' + qPositive + '\n';
    quadChart += '            ┌─────────────┬─────────────┐\n';
    quadChart +=
      qGrowthHigh +
      ' │  ' +
      qGrowers +
      ' ' +
      (quad.label.includes('Growers') ? '◀' : ' ') +
      '   │   ' +
      qStars +
      ' ' +
      (quad.label.includes('Stars') ? '◀' : ' ') +
      '  │\n';
    quadChart += '            ├─────────────┼─────────────┤\n';
    quadChart +=
      '       ' +
      qLow +
      '  │  ' +
      qZombies +
      '    │  ' +
      qPlowhorses +
      ' │\n';
    quadChart += '            └─────────────┴─────────────┘';
  } else {
    quadChart += '                ' + qMargin + '\n';
    quadChart += '              ' + qNegative + '        ' + qPositive + '\n';
    quadChart += '            ┌─────────────┬─────────────┐\n';
    quadChart += qGrowthHigh + ' │  ' + qGrowers + '    │   ' + qStars + '     │\n';
    quadChart += '            ├─────────────┼─────────────┤\n';
    quadChart +=
      '       ' +
      qLow +
      '  │  ' +
      qZombies +
      ' ' +
      (quad.label.includes('Zombies') ? '◀' : ' ') +
      '  │  ' +
      qPlowhorses +
      ' ' +
      (quad.label.includes('Plowhorses') ? '◀' : ' ') +
      '│\n';
    quadChart += '            └─────────────┴─────────────┘';
  }

  // What-If scenarios
  // 1. 2× growth (same burn, 2× new ARR)
  const doubledARR = netNewARR * 2;
  const bmDoubleARR = burnMultiple(netBurn, doubledARR);
  // 2. Improve margin by 20pp
  const r40ImprMargin = ruleOf40Score(growthRate, profitMargin + 20);
  // 3. Cut burn 50%
  const halfBurn = netBurn / 2;
  const bmHalfBurn = burnMultiple(halfBurn, netNewARR);
  // 4. Add $5M ARR (same burn)
  const addARR = netBurn + 5000000;
  const bmAddARR = burnMultiple(netBurn, addARR);
  // 5. Aim for Burn Multiple <1 — required ARR
  const reqARRForBM1 = netBurn; // if BM<1, then netBurn/netNewARR < 1 → netNewARR > netBurn

  // Tip selection
  let tip: string;
  if (!isFinite(bm) || bm > 3) {
    tip = makeToken(
      'calc_out.burn_multiple_rule_of_40.row.tip_inefficient',
      '💡 Tip: Burn Multiple >3 is inefficient. Either cut non-revenue-generating spend (overhead, R&D) or invest more in sales/marketing efficiency.',
    );
  } else if (r40 < 0) {
    tip = makeToken(
      'calc_out.burn_multiple_rule_of_40.row.tip_negative_rule40',
      '💡 Tip: Rule of 40 below 0% — burning cash without growing fast enough. Refocus on product-market fit or fundraising.',
    );
  } else if (r40 >= 40 && isFinite(bm) && bm < 1.5) {
    tip = makeToken(
      'calc_out.burn_multiple_rule_of_40.row.tip_top_quartile',
      '💡 Tip: Top-quartile efficiency. Use this in your fundraising narrative and consider raising at premium valuation.',
    );
  } else {
    tip = makeToken(
      'calc_out.burn_multiple_rule_of_40.row.tip_healthy',
      '💡 Tip: Healthy SaaS hits Rule of 40 with Burn Multiple <1.5. If you are <1, you are top-quartile. If >3, fix the model or extend runway before raising.',
    );
  }

  // P168 B3-14：params 的表达式与兜底里的表达式必须**同源** ⇒ 先用局部变量承接
  const netNewArrLabel = money(netNewARR);
  const growthPctLabel = pct1(growthRate);
  const marginPctLabel = pct1(profitMargin);
  const r40Label = pct1(r40);
  const bmRatioLabel = ratioStr(bm);
  const benchSeed = stageBenchmark(bm, 'seed');
  const benchA = stageBenchmark(bm, 'a');
  const benchB = stageBenchmark(bm, 'b');
  const doubledArrLabel = fmt(doubledARR);
  const bmDoubleArrLabel = ratioStr(bmDoubleARR);
  const r40ImprMarginLabel = pct1(r40ImprMargin);
  const halfBurnLabel = fmt(halfBurn);
  const bmHalfBurnLabel = ratioStr(bmHalfBurn);
  const addArrLabel = fmt(addARR);
  const bmAddArrLabel = ratioStr(bmAddARR);
  const reqArrLabel = fmt(reqARRForBM1);

  const r =
    makeToken('calc_out.section.burn_multiple_calculator', '⏰ Burn Multiple / Rule of 40 Calculator') + '\n\n' +
    makeToken('calc_out.section.burn_multiple_metrics_snapshot', '💰 Metrics Snapshot:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Revenue Growth:   ' +
    pct1(growthRate) +
    '\n' +
    '• Profit Margin:    ' +
    pct1(profitMargin) +
    '\n' +
    '• Net Burn:         ' +
    money(netBurn) +
    '\n' +
    makeToken('calc_out.burn_multiple_rule_of_40.row.net_new_arr', '• Net New ARR:      ' + netNewArrLabel, { value: netNewArrLabel }) +
    '\n' +
    makeToken('calc_out.burn_multiple_rule_of_40.row.period_note', '• Period:           implied quarterly (annualize if needed)') +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.burn_multiple_rule_of_40', '📐 Rule of 40 Result:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Sum:  ' +
    pct1(growthRate) +
    ' + ' +
    pct1(profitMargin) +
    ' = ' +
    pct1(r40) +
    '\n' +
    (r40h.label === 'PASS — top-quartile efficiency'
      ? makeToken('calc_out.burn_multiple_rule_of_40.row.verdict_rule40_pass', '• Verdict:  🟢 PASS — top-quartile efficiency')
      : r40h.label === 'borderline — close to Rule of 40'
      ? makeToken('calc_out.burn_multiple_rule_of_40.row.verdict_rule40_borderline', '• Verdict:  🟡 borderline — close to Rule of 40')
      : r40h.label === 'below — needs improvement'
      ? makeToken('calc_out.burn_multiple_rule_of_40.row.verdict_rule40_below', '• Verdict:  🟠 below — needs improvement')
      : makeToken('calc_out.burn_multiple_rule_of_40.row.verdict_rule40_fail', '• Verdict:  🔴 fail — burning without growth')) +
    '\n' +
    makeToken('calc_out.burn_multiple_rule_of_40.row.rule40_breakdown', '• Component breakdown:  Growth ' + growthPctLabel + ' + Margin ' + marginPctLabel + ' = ' + r40Label, { growth: growthPctLabel, margin: marginPctLabel, total: r40Label }) +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.burn_multiple_result', '🩺 Burn Multiple Result:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.burn_multiple_rule_of_40.row.burn_ratio', '• Ratio:  $' + bmRatioLabel + ' burned per $1 of new ARR', { ratio: bmRatioLabel }) +
    '\n' +
    (bmh.label === 'great — <$1 burned per $1 ARR'
      ? makeToken('calc_out.burn_multiple_rule_of_40.row.verdict_bm_great', '• Verdict:  🟢 great — <$1 burned per $1 ARR')
      : bmh.label === 'good — efficient growth'
      ? makeToken('calc_out.burn_multiple_rule_of_40.row.verdict_bm_good', '• Verdict:  🟡 good — efficient growth')
      : bmh.label === 'concerning — needs tightening'
      ? makeToken('calc_out.burn_multiple_rule_of_40.row.verdict_bm_concerning', '• Verdict:  🟠 concerning — needs tightening')
      : makeToken('calc_out.burn_multiple_rule_of_40.row.verdict_bm_inefficient', '• Verdict:  🔴 inefficient — too much burn')) +
    '\n' +
    makeToken('calc_out.burn_multiple_rule_of_40.row.capital_efficiency', '• Capital efficiency:  Each $1 of new ARR costs $' + bmRatioLabel + ' in cash', { ratio: bmRatioLabel }) +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.burn_multiple_quadrant', '🎯 SaaS Health Quadrant:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (quad.label === 'Stars (high growth + positive margin)'
      ? makeToken('calc_out.burn_multiple_rule_of_40.row.quadrant_stars', '• Your quadrant:  🟢 Stars (high growth + positive margin)')
      : quad.label === 'Growers (high growth + negative margin)'
      ? makeToken('calc_out.burn_multiple_rule_of_40.row.quadrant_growers', '• Your quadrant:  🟡 Growers (high growth + negative margin)')
      : quad.label === 'Profitable Plowhorses (low growth + positive margin)'
      ? makeToken('calc_out.burn_multiple_rule_of_40.row.quadrant_plowhorses', '• Your quadrant:  🟡 Profitable Plowhorses (low growth + positive margin)')
      : makeToken('calc_out.burn_multiple_rule_of_40.row.quadrant_zombies', '• Your quadrant:  🔴 Zombies (low growth + negative margin)')) +
    '\n' +
    quadChart +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.burn_multiple_benchmarks', '⚖️ Capital Efficiency Benchmarks:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (benchSeed === '🟢 top-quartile for seed'
      ? makeToken('calc_out.burn_multiple_rule_of_40.row.bench_seed_great', '• Seed:        🟢 top-quartile for seed  (median Burn Multiple 2-3)')
      : benchSeed === '🟡 on par for seed'
      ? makeToken('calc_out.burn_multiple_rule_of_40.row.bench_seed_good', '• Seed:        🟡 on par for seed  (median Burn Multiple 2-3)')
      : benchSeed === '🟠 above median for seed'
      ? makeToken('calc_out.burn_multiple_rule_of_40.row.bench_seed_median', '• Seed:        🟠 above median for seed  (median Burn Multiple 2-3)')
      : makeToken('calc_out.burn_multiple_rule_of_40.row.bench_seed_na', '• Seed:        — (no new ARR)  (median Burn Multiple 2-3)')) +
    '\n' +
    (benchA === '🟢 top-quartile for a'
      ? makeToken('calc_out.burn_multiple_rule_of_40.row.bench_a_great', '• Series A:    🟢 top-quartile for a  (median Burn Multiple 1.5-2)')
      : benchA === '🟡 on par for a'
      ? makeToken('calc_out.burn_multiple_rule_of_40.row.bench_a_good', '• Series A:    🟡 on par for a  (median Burn Multiple 1.5-2)')
      : benchA === '🟠 above median for a'
      ? makeToken('calc_out.burn_multiple_rule_of_40.row.bench_a_median', '• Series A:    🟠 above median for a  (median Burn Multiple 1.5-2)')
      : makeToken('calc_out.burn_multiple_rule_of_40.row.bench_a_na', '• Series A:    — (no new ARR)  (median Burn Multiple 1.5-2)')) +
    '\n' +
    (benchB === '🟢 top-quartile for b'
      ? makeToken('calc_out.burn_multiple_rule_of_40.row.bench_b_great', '• Series B+:   🟢 top-quartile for b  (median Burn Multiple 1-1.5)')
      : benchB === '🟡 on par for b'
      ? makeToken('calc_out.burn_multiple_rule_of_40.row.bench_b_good', '• Series B+:   🟡 on par for b  (median Burn Multiple 1-1.5)')
      : benchB === '🟠 above median for b'
      ? makeToken('calc_out.burn_multiple_rule_of_40.row.bench_b_median', '• Series B+:   🟠 above median for b  (median Burn Multiple 1-1.5)')
      : makeToken('calc_out.burn_multiple_rule_of_40.row.bench_b_na', '• Series B+:   — (no new ARR)  (median Burn Multiple 1-1.5)')) +
    '\n' +
    makeToken(
      'calc_out.burn_multiple_rule_of_40.row.your_ratio',
      '• Your ratio:  $' + bmRatioLabel + ' per $1 ARR',
      { ratio: bmRatioLabel },
    ) +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.what_if_scenarios', '🔄 What-If Scenarios:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.burn_multiple_rule_of_40.row.whatif_double_growth', '• 2× growth (new ARR $' + doubledArrLabel + '):       Burn Multiple $' + bmDoubleArrLabel + ' per $1 ARR', { arr: doubledArrLabel, ratio: bmDoubleArrLabel }) +
    '\n' +
    makeToken('calc_out.burn_multiple_rule_of_40.row.whatif_margin_20pp', '• Improve margin by 20pp:        Rule of 40 → ' + r40ImprMarginLabel, { score: r40ImprMarginLabel }) +
    '\n' +
    makeToken('calc_out.burn_multiple_rule_of_40.row.whatif_cut_burn_50', '• Cut burn 50% ($' + halfBurnLabel + '):           Burn Multiple $' + bmHalfBurnLabel + ' per $1 ARR', { burn: halfBurnLabel, ratio: bmHalfBurnLabel }) +
    '\n' +
    makeToken('calc_out.burn_multiple_rule_of_40.row.whatif_add_5m_arr', '• Add $5M ARR (new ARR $' + addArrLabel + '):    Burn Multiple $' + bmAddArrLabel + ' per $1 ARR', { arr: addArrLabel, ratio: bmAddArrLabel }) +
    '\n' +
    makeToken('calc_out.burn_multiple_rule_of_40.row.whatif_aim_bm_under_1', '• Aim for Burn Multiple <1:      requires net new ARR > $' + reqArrLabel, { arr: reqArrLabel }) +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip;

  const results: string[] = [r];

  // SEO long-tail comparison rows at 5 growth/margin combos
  const combos = [
    { g: 50, m: -20 },
    { g: 100, m: -20 },
    { g: 150, m: 0 },
    { g: 200, m: 10 },
    { g: 300, m: 20 },
  ];
  for (let idx = 0; idx < combos.length; idx++) {
    const c = combos[idx];
    const s = ruleOf40Score(c.g, c.m);
    const h = ruleOf40Health(s);
    const growthLabel = String(c.g);
    const marginLabel = String(c.m);
    const scoreLabel = pct1(s);
    const verdictLabel = h.label.split(' — ')[0];
    // ⚠️ 成员访问表达式（h.emoji）会让模板推导**静默失败** ⇒ 先用局部变量承接
    const verdictEmoji = h.emoji;
    results.push(
      makeToken(
        'calc_out.burn_multiple_rule_of_40.row.comparison',
        'Comparison: ' +
          growthLabel +
          '% growth + ' +
          marginLabel +
          '% margin = ' +
          scoreLabel +
          ' (Rule of 40) → ' +
          verdictEmoji +
          ' ' +
          verdictLabel,
        {
          growth: growthLabel,
          margin: marginLabel,
          score: scoreLabel,
          verdict: verdictLabel,
          emoji: verdictEmoji,
        },
      ),
    );
  }

  return results;
}

// ============== customFn ==============

const customFn =
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let R=function(e){return Number.isNaN(e)?0:Math.max(0,e)},g=function(e,t){return e+t},v=function(e){return e>=40?{emoji:"🟢",label:"PASS — top-quartile efficiency"}:e>=25?{emoji:"🟡",label:"borderline — close to Rule of 40"}:e>=10?{emoji:"🟠",label:"below — needs improvement"}:{emoji:"🔴",label:"fail — burning without growth"}},s=function(e,t){return t<=0?1/0:e/t},y=function(e){return e<1?{emoji:"🟢",label:"great — <$1 burned per $1 ARR"}:e<1.5?{emoji:"🟡",label:"good — efficient growth"}:e<3?{emoji:"🟠",label:"concerning — needs tightening"}:{emoji:"🔴",label:"inefficient — too much burn"}},$=function(e,t){const l=e>=40,n=t>=0;return l&&n?{emoji:"🟢",label:"Stars (high growth + positive margin)"}:l&&!n?{emoji:"🟡",label:"Growers (high growth + negative margin)"}:!l&&n?{emoji:"🟡",label:"Profitable Plowhorses (low growth + positive margin)"}:{emoji:"🔴",label:"Zombies (low growth + negative margin)"}},w=function(e,t){if(!isFinite(e))return"— (no new ARR)";const n={seed:{great:2,good:3},a:{great:1.5,good:2},b:{great:1,good:1.5}}[t];return e<n.great?"🟢 top-quartile for "+t:e<n.good?"🟡 on par for "+t:"🟠 above median for "+t},j=function(e){const t=parseFloat(e.revenueGrowth)||0,l=parseFloat(e.profitMargin)||0,n=R(parseFloat(e.netBurn)||0),b=R(parseFloat(e.netNewARR)||0);if(t===0&&l===0&&n===0&&b===0)return[\`⏰ Burn Multiple / Rule of 40 Calculator

💰 Enter revenue growth, profit margin, net burn, and net new ARR to see Rule of 40 score and Burn Multiple.\`];const f=g(t,l),q=v(f),_=s(n,b),A=y(_),a=$(t,l),p=i=>i.toLocaleString("en-US",{maximumFractionDigits:0}),P=i=>"$"+p(i),u=i=>i.toFixed(1)+"%",m=i=>isFinite(i)?i.toFixed(2):"∞",F=r("calc_out.burn_multiple_rule_of_40.row.quad_margin","Margin →"),G=r("calc_out.burn_multiple_rule_of_40.row.quad_negative","Negative"),N=r("calc_out.burn_multiple_rule_of_40.row.quad_positive","Positive"),C=r("calc_out.burn_multiple_rule_of_40.row.quad_growth_high","Growth High"),V=r("calc_out.burn_multiple_rule_of_40.row.quad_growers","Growers"),E=r("calc_out.burn_multiple_rule_of_40.row.quad_stars","Stars"),I=r("calc_out.burn_multiple_rule_of_40.row.quad_low","Low"),x=r("calc_out.burn_multiple_rule_of_40.row.quad_zombies","Zombies"),H=r("calc_out.burn_multiple_rule_of_40.row.quad_plowhorses","Plowhorses");let o="";t>=40?(o+="                "+F+\`
\`,o+="              "+G+"        "+N+\`
\`,o+=\`            ┌─────────────┬─────────────┐
\`,o+=C+" │  "+V+" "+(a.label.includes("Growers")?"◀":" ")+"   │   "+E+" "+(a.label.includes("Stars")?"◀":" ")+\`  │
\`,o+=\`            ├─────────────┼─────────────┤
\`,o+="       "+I+"  │  "+x+"    │  "+H+\` │
\`,o+="            └─────────────┴─────────────┘"):(o+="                "+F+\`
\`,o+="              "+G+"        "+N+\`
\`,o+=\`            ┌─────────────┬─────────────┐
\`,o+=C+" │  "+V+"    │   "+E+\`     │
\`,o+=\`            ├─────────────┼─────────────┤
\`,o+="       "+I+"  │  "+x+" "+(a.label.includes("Zombies")?"◀":" ")+"  │  "+H+" "+(a.label.includes("Plowhorses")?"◀":" ")+\`│
\`,o+="            └─────────────┴─────────────┘");const D=b*2,fr=s(n,D),pr=g(t,l+20),Y=n/2,dr=s(Y,b),Z=n+5e6,gr=s(n,Z),wr=n;let d;!isFinite(_)||_>3?d=r("calc_out.burn_multiple_rule_of_40.row.tip_inefficient","💡 Tip: Burn Multiple >3 is inefficient. Either cut non-revenue-generating spend (overhead, R&D) or invest more in sales/marketing efficiency."):f<0?d=r("calc_out.burn_multiple_rule_of_40.row.tip_negative_rule40","💡 Tip: Rule of 40 below 0% — burning cash without growing fast enough. Refocus on product-market fit or fundraising."):f>=40&&isFinite(_)&&_<1.5?d=r("calc_out.burn_multiple_rule_of_40.row.tip_top_quartile","💡 Tip: Top-quartile efficiency. Use this in your fundraising narrative and consider raising at premium valuation."):d=r("calc_out.burn_multiple_rule_of_40.row.tip_healthy","💡 Tip: Healthy SaaS hits Rule of 40 with Burn Multiple <1.5. If you are <1, you are top-quartile. If >3, fix the model or extend runway before raising.");const z=P(b),O=u(t),U=u(l),J=u(f),c=m(_),S=w(_,"seed"),B=w(_,"a"),M=w(_,"b"),K=p(D),Q=m(fr),W=u(pr),X=p(Y),T=m(dr),k=p(Z),rr=m(gr),er=p(wr),tr=[r("calc_out.section.burn_multiple_calculator","⏰ Burn Multiple / Rule of 40 Calculator")+\`

\`+r("calc_out.section.burn_multiple_metrics_snapshot","💰 Metrics Snapshot:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Revenue Growth:   \`+u(t)+\`
• Profit Margin:    \`+u(l)+\`
• Net Burn:         \`+P(n)+\`
\`+r("calc_out.burn_multiple_rule_of_40.row.net_new_arr","• Net New ARR:      "+z,{value:z})+\`
\`+r("calc_out.burn_multiple_rule_of_40.row.period_note","• Period:           implied quarterly (annualize if needed)")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+r("calc_out.section.burn_multiple_rule_of_40","📐 Rule of 40 Result:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Sum:  \`+u(t)+" + "+u(l)+" = "+u(f)+\`
\`+(q.label==="PASS — top-quartile efficiency"?r("calc_out.burn_multiple_rule_of_40.row.verdict_rule40_pass","• Verdict:  🟢 PASS — top-quartile efficiency"):q.label==="borderline — close to Rule of 40"?r("calc_out.burn_multiple_rule_of_40.row.verdict_rule40_borderline","• Verdict:  🟡 borderline — close to Rule of 40"):q.label==="below — needs improvement"?r("calc_out.burn_multiple_rule_of_40.row.verdict_rule40_below","• Verdict:  🟠 below — needs improvement"):r("calc_out.burn_multiple_rule_of_40.row.verdict_rule40_fail","• Verdict:  🔴 fail — burning without growth"))+\`
\`+r("calc_out.burn_multiple_rule_of_40.row.rule40_breakdown","• Component breakdown:  Growth "+O+" + Margin "+U+" = "+J,{growth:O,margin:U,total:J})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+r("calc_out.section.burn_multiple_result","🩺 Burn Multiple Result:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+r("calc_out.burn_multiple_rule_of_40.row.burn_ratio","• Ratio:  $"+c+" burned per $1 of new ARR",{ratio:c})+\`
\`+(A.label==="great — <$1 burned per $1 ARR"?r("calc_out.burn_multiple_rule_of_40.row.verdict_bm_great","• Verdict:  🟢 great — <$1 burned per $1 ARR"):A.label==="good — efficient growth"?r("calc_out.burn_multiple_rule_of_40.row.verdict_bm_good","• Verdict:  🟡 good — efficient growth"):A.label==="concerning — needs tightening"?r("calc_out.burn_multiple_rule_of_40.row.verdict_bm_concerning","• Verdict:  🟠 concerning — needs tightening"):r("calc_out.burn_multiple_rule_of_40.row.verdict_bm_inefficient","• Verdict:  🔴 inefficient — too much burn"))+\`
\`+r("calc_out.burn_multiple_rule_of_40.row.capital_efficiency","• Capital efficiency:  Each $1 of new ARR costs $"+c+" in cash",{ratio:c})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+r("calc_out.section.burn_multiple_quadrant","🎯 SaaS Health Quadrant:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(a.label==="Stars (high growth + positive margin)"?r("calc_out.burn_multiple_rule_of_40.row.quadrant_stars","• Your quadrant:  🟢 Stars (high growth + positive margin)"):a.label==="Growers (high growth + negative margin)"?r("calc_out.burn_multiple_rule_of_40.row.quadrant_growers","• Your quadrant:  🟡 Growers (high growth + negative margin)"):a.label==="Profitable Plowhorses (low growth + positive margin)"?r("calc_out.burn_multiple_rule_of_40.row.quadrant_plowhorses","• Your quadrant:  🟡 Profitable Plowhorses (low growth + positive margin)"):r("calc_out.burn_multiple_rule_of_40.row.quadrant_zombies","• Your quadrant:  🔴 Zombies (low growth + negative margin)"))+\`
\`+o+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+r("calc_out.section.burn_multiple_benchmarks","⚖️ Capital Efficiency Benchmarks:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(S==="🟢 top-quartile for seed"?r("calc_out.burn_multiple_rule_of_40.row.bench_seed_great","• Seed:        🟢 top-quartile for seed  (median Burn Multiple 2-3)"):S==="🟡 on par for seed"?r("calc_out.burn_multiple_rule_of_40.row.bench_seed_good","• Seed:        🟡 on par for seed  (median Burn Multiple 2-3)"):S==="🟠 above median for seed"?r("calc_out.burn_multiple_rule_of_40.row.bench_seed_median","• Seed:        🟠 above median for seed  (median Burn Multiple 2-3)"):r("calc_out.burn_multiple_rule_of_40.row.bench_seed_na","• Seed:        — (no new ARR)  (median Burn Multiple 2-3)"))+\`
\`+(B==="🟢 top-quartile for a"?r("calc_out.burn_multiple_rule_of_40.row.bench_a_great","• Series A:    🟢 top-quartile for a  (median Burn Multiple 1.5-2)"):B==="🟡 on par for a"?r("calc_out.burn_multiple_rule_of_40.row.bench_a_good","• Series A:    🟡 on par for a  (median Burn Multiple 1.5-2)"):B==="🟠 above median for a"?r("calc_out.burn_multiple_rule_of_40.row.bench_a_median","• Series A:    🟠 above median for a  (median Burn Multiple 1.5-2)"):r("calc_out.burn_multiple_rule_of_40.row.bench_a_na","• Series A:    — (no new ARR)  (median Burn Multiple 1.5-2)"))+\`
\`+(M==="🟢 top-quartile for b"?r("calc_out.burn_multiple_rule_of_40.row.bench_b_great","• Series B+:   🟢 top-quartile for b  (median Burn Multiple 1-1.5)"):M==="🟡 on par for b"?r("calc_out.burn_multiple_rule_of_40.row.bench_b_good","• Series B+:   🟡 on par for b  (median Burn Multiple 1-1.5)"):M==="🟠 above median for b"?r("calc_out.burn_multiple_rule_of_40.row.bench_b_median","• Series B+:   🟠 above median for b  (median Burn Multiple 1-1.5)"):r("calc_out.burn_multiple_rule_of_40.row.bench_b_na","• Series B+:   — (no new ARR)  (median Burn Multiple 1-1.5)"))+\`
\`+r("calc_out.burn_multiple_rule_of_40.row.your_ratio","• Your ratio:  $"+c+" per $1 ARR",{ratio:c})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+r("calc_out.section.what_if_scenarios","🔄 What-If Scenarios:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+r("calc_out.burn_multiple_rule_of_40.row.whatif_double_growth","• 2× growth (new ARR $"+K+"):       Burn Multiple $"+Q+" per $1 ARR",{arr:K,ratio:Q})+\`
\`+r("calc_out.burn_multiple_rule_of_40.row.whatif_margin_20pp","• Improve margin by 20pp:        Rule of 40 → "+W,{score:W})+\`
\`+r("calc_out.burn_multiple_rule_of_40.row.whatif_cut_burn_50","• Cut burn 50% ($"+X+"):           Burn Multiple $"+T+" per $1 ARR",{burn:X,ratio:T})+\`
\`+r("calc_out.burn_multiple_rule_of_40.row.whatif_add_5m_arr","• Add $5M ARR (new ARR $"+k+"):    Burn Multiple $"+rr+" per $1 ARR",{arr:k,ratio:rr})+\`
\`+r("calc_out.burn_multiple_rule_of_40.row.whatif_aim_bm_under_1","• Aim for Burn Multiple <1:      requires net new ARR > $"+er,{arr:er})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+d],nr=[{g:50,m:-20},{g:100,m:-20},{g:150,m:0},{g:200,m:10},{g:300,m:20}];for(let i=0;i<nr.length;i++){const h=nr[i],or=g(h.g,h.m),lr=v(or),ir=String(h.g),ur=String(h.m),_r=u(or),ar=lr.label.split(" — ")[0],cr=lr.emoji;tr.push(r("calc_out.burn_multiple_rule_of_40.row.comparison","Comparison: "+ir+"% growth + "+ur+"% margin = "+_r+" (Rule of 40) → "+cr+" "+ar,{growth:ir,margin:ur,score:_r,verdict:ar,emoji:cr}))}return tr},L=function(e,t,l){var n=br(e);return Array.isArray(n)?n.join(\`
\`):String(n)};var mr=R,hr=g,Rr=v,vr=s,qr=y,Ar=$,Sr=w,Br=j,Mr=L,r=tk,sr='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',r=new Function("return "+sr)(),br=function(e){return j(e)};return[L(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-burn-multiple-rule-of-40-calculator',
  title: 'Burn Multiple / Rule of 40 Calculator',
  description:
    'Measure your SaaS capital efficiency with two VC-favorite metrics: Burn Multiple ($ burned per $1 of new ARR) and Rule of 40 (growth % + margin %). See your SaaS health quadrant, compare to stage benchmarks, and find what-if scenarios to improve efficiency.',
  inputs: [
    {
      name: 'revenueGrowth',
      label: 'Revenue Growth (%)',
      placeholder: 'e.g. 100',
      type: 'number',
    },
    {
      name: 'profitMargin',
      label: 'Profit Margin (%)',
      placeholder: 'e.g. -20',
      type: 'number',
    },
    {
      name: 'netBurn',
      label: 'Net Burn ($)',
      placeholder: 'e.g. 2000000',
      type: 'number',
    },
    {
      name: 'netNewARR',
      label: 'Net New ARR ($)',
      placeholder: 'e.g. 1500000',
      type: 'number',
    },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
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
  generate(inputs: Record<string, string>): string[] {
    return calculateBurnMultiple(inputs);
  },
  staticExamples: ['$calc_out.section.burn_multiple_calculator|⏰ Burn Multiple / Rule of 40 Calculator|\n\n$calc_out.section.burn_multiple_metrics_snapshot|💰 Metrics Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Revenue Growth:   100.0%\n• Profit Margin:    -20.0%\n• Net Burn:         $2,000,000\n$calc_out.burn_multiple_rule_of_40.row.net_new_arr{"value":"$1,500,000"}|• Net New ARR:      $1,500,000|\n$calc_out.burn_multiple_rule_of_40.row.period_note|• Period:           implied quarterly (annualize if needed)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.burn_multiple_rule_of_40|📐 Rule of 40 Result:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Sum:  100.0% + -20.0% = 80.0%\n$calc_out.burn_multiple_rule_of_40.row.verdict_rule40_pass|• Verdict:  🟢 PASS — top-quartile efficiency|\n$calc_out.burn_multiple_rule_of_40.row.rule40_breakdown{"growth":"100.0%","margin":"-20.0%","total":"80.0%"}|• Component breakdown:  Growth 100.0% + Margin -20.0% = 80.0%|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.burn_multiple_result|🩺 Burn Multiple Result:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.burn_multiple_rule_of_40.row.burn_ratio{"ratio":"1.33"}|• Ratio:  $1.33 burned per $1 of new ARR|\n$calc_out.burn_multiple_rule_of_40.row.verdict_bm_good|• Verdict:  🟡 good — efficient growth|\n$calc_out.burn_multiple_rule_of_40.row.capital_efficiency{"ratio":"1.33"}|• Capital efficiency:  Each $1 of new ARR costs $1.33 in cash|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.burn_multiple_quadrant|🎯 SaaS Health Quadrant:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.burn_multiple_rule_of_40.row.quadrant_growers|• Your quadrant:  🟡 Growers (high growth + negative margin)|\n                $calc_out.burn_multiple_rule_of_40.row.quad_margin|Margin →|\n              $calc_out.burn_multiple_rule_of_40.row.quad_negative|Negative|        $calc_out.burn_multiple_rule_of_40.row.quad_positive|Positive|\n            ┌─────────────┬─────────────┐\n$calc_out.burn_multiple_rule_of_40.row.quad_growth_high|Growth High| │  $calc_out.burn_multiple_rule_of_40.row.quad_growers|Growers| ◀   │   $calc_out.burn_multiple_rule_of_40.row.quad_stars|Stars|    │\n            ├─────────────┼─────────────┤\n       $calc_out.burn_multiple_rule_of_40.row.quad_low|Low|  │  $calc_out.burn_multiple_rule_of_40.row.quad_zombies|Zombies|    │  $calc_out.burn_multiple_rule_of_40.row.quad_plowhorses|Plowhorses| │\n            └─────────────┴─────────────┘\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.burn_multiple_benchmarks|⚖️ Capital Efficiency Benchmarks:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.burn_multiple_rule_of_40.row.bench_seed_great|• Seed:        🟢 top-quartile for seed  (median Burn Multiple 2-3)|\n$calc_out.burn_multiple_rule_of_40.row.bench_a_great|• Series A:    🟢 top-quartile for a  (median Burn Multiple 1.5-2)|\n$calc_out.burn_multiple_rule_of_40.row.bench_b_good|• Series B+:   🟡 on par for b  (median Burn Multiple 1-1.5)|\n$calc_out.burn_multiple_rule_of_40.row.your_ratio{"ratio":"1.33"}|• Your ratio:  $1.33 per $1 ARR|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.burn_multiple_rule_of_40.row.whatif_double_growth{"arr":"3,000,000","ratio":"0.67"}|• 2× growth (new ARR $3,000,000):       Burn Multiple $0.67 per $1 ARR|\n$calc_out.burn_multiple_rule_of_40.row.whatif_margin_20pp{"score":"100.0%"}|• Improve margin by 20pp:        Rule of 40 → 100.0%|\n$calc_out.burn_multiple_rule_of_40.row.whatif_cut_burn_50{"burn":"1,000,000","ratio":"0.67"}|• Cut burn 50% ($1,000,000):           Burn Multiple $0.67 per $1 ARR|\n$calc_out.burn_multiple_rule_of_40.row.whatif_add_5m_arr{"arr":"7,000,000","ratio":"0.29"}|• Add $5M ARR (new ARR $7,000,000):    Burn Multiple $0.29 per $1 ARR|\n$calc_out.burn_multiple_rule_of_40.row.whatif_aim_bm_under_1{"arr":"2,000,000"}|• Aim for Burn Multiple <1:      requires net new ARR > $2,000,000|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.burn_multiple_rule_of_40.row.tip_top_quartile|💡 Tip: Top-quartile efficiency. Use this in your fundraising narrative and consider raising at premium valuation.|\n$calc_out.burn_multiple_rule_of_40.row.comparison{"growth":"50","margin":"-20","score":"30.0%","verdict":"borderline","emoji":"🟡"}|Comparison: 50% growth + -20% margin = 30.0% (Rule of 40) → 🟡 borderline|\n$calc_out.burn_multiple_rule_of_40.row.comparison{"growth":"100","margin":"-20","score":"80.0%","verdict":"PASS","emoji":"🟢"}|Comparison: 100% growth + -20% margin = 80.0% (Rule of 40) → 🟢 PASS|\n$calc_out.burn_multiple_rule_of_40.row.comparison{"growth":"150","margin":"0","score":"150.0%","verdict":"PASS","emoji":"🟢"}|Comparison: 150% growth + 0% margin = 150.0% (Rule of 40) → 🟢 PASS|\n$calc_out.burn_multiple_rule_of_40.row.comparison{"growth":"200","margin":"10","score":"210.0%","verdict":"PASS","emoji":"🟢"}|Comparison: 200% growth + 10% margin = 210.0% (Rule of 40) → 🟢 PASS|\n$calc_out.burn_multiple_rule_of_40.row.comparison{"growth":"300","margin":"20","score":"320.0%","verdict":"PASS","emoji":"🟢"}|Comparison: 300% growth + 20% margin = 320.0% (Rule of 40) → 🟢 PASS|'],
  faq: [
    {
      q: 'What is the Burn Multiple?',
      a: 'Burn Multiple (coined by David Sacks at Craft Ventures) is the ratio of net cash burned to net new ARR added in a given period. Formula: Burn Multiple = Net Burn / Net New ARR. It measures capital efficiency — how many dollars of cash you burn to add $1 of ARR. Lower is better. <1 means you added more ARR than you burned in cash (top-quartile efficiency). 1-1.5 is good. 1.5-3 is concerning. >3 means you are burning too much for the ARR you are adding.',
    },
    {
      q: 'What is the Rule of 40?',
      a: 'The Rule of 40 (popularized by Bessemer Venture Partners) states that a SaaS company is healthy if its revenue growth rate + profit margin ≥ 40%. Formula: Rule of 40 = Growth % + Margin %. Example: 100% growth + (-20%) margin = 80% Rule of 40 → PASS. Example: 20% growth + 5% margin = 25% → borderline. Example: 10% growth + (-30%) margin = -20% → fail. The rule balances growth vs profitability — high growth can offset low (or negative) margins, and vice versa.',
    },
    {
      q: 'What is a good Burn Multiple by stage?',
      a: 'Median Burn Multiple benchmarks vary by stage: Seed (pre-PMF): 2-3 is good, <2 is great. Series A: 1.5-2 is good, <1.5 is great. Series B+: 1-1.5 is good, <1 is great. The benchmark tightens as you scale because larger companies should achieve capital efficiency. Top-quartile SaaS achieves Burn Multiple <1 at Series A and beyond — they add more ARR than they burn in cash. If you are >3, fix the model (cut inefficient spend) or extend runway before raising.',
    },
    {
      q: 'What is the SaaS Health Quadrant?',
      a: 'The SaaS Health Quadrant is a 2x2 matrix of growth rate vs profit margin. Four quadrants: (1) Stars — high growth (≥40%) + positive margin: rare, top-tier companies. (2) Growers — high growth + negative margin: typical VC-backed SaaS burning cash to grow. (3) Profitable Plowhorses — low growth + positive margin: mature SaaS, low growth ceiling but profitable. (4) Zombies — low growth + negative margin: in trouble, burning cash without growing fast enough. Most VC-backed startups live in the Growers quadrant. The goal is to move toward Stars or Profitable Plowhorses.',
    },
    {
      q: 'Should I aim for Rule of 40 or Burn Multiple first?',
      a: 'Both matter, but they measure different things. Rule of 40 is a forward-looking indicator of sustainability (can you grow profitably?). Burn Multiple is a backward-looking indicator of capital efficiency (how much did you spend per ARR?). At seed stage, focus on Burn Multiple — you need to demonstrate capital efficiency to raise Series A. At Series A and beyond, focus on Rule of 40 — investors want to see you can reach cash-flow positive while growing. A company with Burn Multiple <1 AND Rule of 40 >40% is in unicorn territory.',
    },

    { q: "What is Burn Multiple?", a: "Burn multiple = net burn / net new ARR. Measures: capital efficiency. For $5M net burn, $10M net new ARR: 0.5x. Lower = more efficient. Benchmarks: 1) <0.5x: world-class, 2) 0.5-1x: excellent, 3) 1-2x: good, 4) 2-3x: concerning, 5) >3x: inefficient. Top: <1x. Most: aim for <2x. Investors: prefer <1x. Track: trailing 12 months. Combine with Rule of 40 for full picture." },
    { q: "How do I improve my Rule of 40 score?", a: "1) Increase growth (more revenue, faster), 2) Increase margin (cut costs), 3) Both. 1) Growth is harder. 2) Margin easier. Most teams cut costs 10-20% = 5-10 pp margin lift. Growth: depends on product + market. Aim for 50%+ growth + 20%+ margin = 70 rule of 40. Or: 30% growth + 30% margin = 60. Top: 100% growth + 0% margin = 100 (great if capital efficient)." },
    { q: "What is a good Burn Multiple for seed stage?", a: "Seed: 1) Pre-PMF: 2-5x (high burn, low ARR), 2) PMF: 1-2x, 3) Growth: 0.5-1x, 4) Series A ready: <1x. aim for 1x by Series A. Top: <0.5x. Avoid >3x (capital inefficient). Track monthly. validate efficiency before raising. Investors: key metric. Capital efficiency: separates good from great. improve 1-2x per year. Aim for <1x by $1-2M ARR." },
    { q: "What is the relationship between Rule of 40 and valuation?", a: "Higher Rule of 40 = higher multiple. Below 40: 3-6x ARR. Above 40: 8-12x. 50-60: 12-18x. 80+: 18-30x. Investors: Rule of 40 is the gate. Above 40: investable. Below: risky. 40-60 is the target. Top: 80+. Use TTM (trailing 12 months). track quarterly. Show: improving trend matters. Most teams 5-10 pp improvement per year." },
    { q: "Can I have a high Rule of 40 with negative margin?", a: "Yes, if growth is high enough. 100% growth + (-50%) margin = 50 (above 40). Investors: accept this for early stage. Trade-off: high growth requires investment. Below 40 with negative margin: bad. Above 40 with negative margin: acceptable early. Above 40 with positive margin: great. Top: positive margin + 30% growth = 40+ (mature). Most: rule of 40 includes both. Use: cash + non-GAAP. Be honest." },
    { q: "How do I calculate Burn Multiple accurately?", a: "Formula: net burn / net new ARR. Net burn = gross burn - revenue. Net new ARR = ending ARR - starting ARR + churn. Track monthly, rolling 12 months. For $100K net burn, $200K net new ARR: 0.5x. quarterly review. Tools: Fathom, Mosaic, custom. Compare: by stage (seed vs Series A). <1x is the goal. Top: <0.5x. Avoid 2x+ (inefficient). Be consistent: methodology matters." },
    { q: "Should Rule of 40 use growth or ARR growth rate?", a: "Either, but specify. ARR growth: 1) YoY (year over year), 2) QoQ (quarter over quarter). Use TTM for stability. YoY TTM. For 50% YoY: 50. For 30% QoQ annualized: 130% (not directly comparable). Investors: prefer TTM YoY. Be consistent. track monthly, show TTM. Avoid 1-month spike (skews). Use trailing 12 months or last 4 quarters. 30%+ YoY + 10%+ margin = 40 (pass)." },
  ],
  howToUse: [
    'Enter your revenue growth rate (%) — year-over-year or annualized.',
    'Enter your profit margin (%) — EBITDA-based, can be negative for early-stage.',
    'Enter your net burn ($) — total cash spent in the period.',
    'Enter your net new ARR ($) — ARR added in the period (new + expansion - churn).',
    'Review your Rule of 40 score, Burn Multiple ratio, and SaaS Health Quadrant.',
    'Check the stage benchmarks (Seed / Series A / B+) to see how you compare.',
    'Use the 5 what-if scenarios to model improvements (cut burn, grow ARR, etc.).',
  ],
  engineKey: true,
};

registerEngine(engine);
