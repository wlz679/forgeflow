import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

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

  // Quadrant chart (ASCII 2x2)
  let quadChart = '';
  if (growthRate >= 40) {
    quadChart += '                Margin →\n';
    quadChart += '              Negative        Positive\n';
    quadChart += '            ┌─────────────┬─────────────┐\n';
    quadChart +=
      'Growth High │  Growers ' +
      (quad.label.includes('Growers') ? '◀' : ' ') +
      '   │   Stars ' +
      (quad.label.includes('Stars') ? '◀' : ' ') +
      '  │\n';
    quadChart += '            ├─────────────┼─────────────┤\n';
    quadChart += '       Low  │  Zombies    │  Plowhorses │\n';
    quadChart += '            └─────────────┴─────────────┘';
  } else {
    quadChart += '                Margin →\n';
    quadChart += '              Negative        Positive\n';
    quadChart += '            ┌─────────────┬─────────────┐\n';
    quadChart += 'Growth High │  Growers    │   Stars     │\n';
    quadChart += '            ├─────────────┼─────────────┤\n';
    quadChart +=
      '       Low  │  Zombies ' +
      (quad.label.includes('Zombies') ? '◀' : ' ') +
      '  │  Plowhorses ' +
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
    tip =
      '💡 Tip: Burn Multiple >3 is inefficient. Either cut non-revenue-generating spend (overhead, R&D) or invest more in sales/marketing efficiency.';
  } else if (r40 < 0) {
    tip =
      '💡 Tip: Rule of 40 below 0% — burning cash without growing fast enough. Refocus on product-market fit or fundraising.';
  } else if (r40 >= 40 && isFinite(bm) && bm < 1.5) {
    tip =
      '💡 Tip: Top-quartile efficiency. Use this in your fundraising narrative and consider raising at premium valuation.';
  } else {
    tip =
      '💡 Tip: Healthy SaaS hits Rule of 40 with Burn Multiple <1.5. If you are <1, you are top-quartile. If >3, fix the model or extend runway before raising.';
  }

  const r =
    '⏰ Burn Multiple / Rule of 40 Calculator\n\n' +
    '💰 Metrics Snapshot:\n' +
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
    '• Net New ARR:      ' +
    money(netNewARR) +
    '\n' +
    '• Period:           implied quarterly (annualize if needed)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Rule of 40 Result:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Sum:  ' +
    pct1(growthRate) +
    ' + ' +
    pct1(profitMargin) +
    ' = ' +
    pct1(r40) +
    '\n' +
    '• Verdict:  ' +
    r40h.emoji +
    ' ' +
    r40h.label +
    '\n' +
    '• Component breakdown:  Growth ' +
    pct1(growthRate) +
    ' + Margin ' +
    pct1(profitMargin) +
    ' = ' +
    pct1(r40) +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Burn Multiple Result:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Ratio:  $' +
    ratioStr(bm) +
    ' burned per $1 of new ARR\n' +
    '• Verdict:  ' +
    bmh.emoji +
    ' ' +
    bmh.label +
    '\n' +
    '• Capital efficiency:  Each $1 of new ARR costs $' +
    ratioStr(bm) +
    ' in cash\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 SaaS Health Quadrant:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Your quadrant:  ' +
    quad.emoji +
    ' ' +
    quad.label +
    '\n' +
    quadChart +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Capital Efficiency Benchmarks:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Seed:        ' +
    stageBenchmark(bm, 'seed') +
    '  (median Burn Multiple 2-3)\n' +
    '• Series A:    ' +
    stageBenchmark(bm, 'a') +
    '  (median Burn Multiple 1.5-2)\n' +
    '• Series B+:   ' +
    stageBenchmark(bm, 'b') +
    '  (median Burn Multiple 1-1.5)\n' +
    '• Your ratio:  $' +
    ratioStr(bm) +
    ' per $1 ARR\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• 2× growth (new ARR $' +
    fmt(doubledARR) +
    '):       Burn Multiple $' +
    ratioStr(bmDoubleARR) +
    ' per $1 ARR\n' +
    '• Improve margin by 20pp:        Rule of 40 → ' +
    pct1(r40ImprMargin) +
    '\n' +
    '• Cut burn 50% ($' +
    fmt(halfBurn) +
    '):           Burn Multiple $' +
    ratioStr(bmHalfBurn) +
    ' per $1 ARR\n' +
    '• Add $5M ARR (new ARR $' +
    fmt(addARR) +
    '):    Burn Multiple $' +
    ratioStr(bmAddARR) +
    ' per $1 ARR\n' +
    '• Aim for Burn Multiple <1:      requires net new ARR > $' +
    fmt(reqARRForBM1) +
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
    results.push(
      'Comparison: ' +
        c.g +
        '% growth + ' +
        c.m +
        '% margin = ' +
        pct1(s) +
        ' (Rule of 40) → ' +
        h.emoji +
        ' ' +
        h.label.split(' — ')[0],
    );
  }

  return results;
}

// ============== customFn ==============

const customFn =
  "function r40(g,m){return g+m;}" +
  "function r40h(s){if(s>=40)return{e:'\\uD83D\\uDFE2',l:'PASS \\u2014 top-quartile efficiency'};if(s>=25)return{e:'\\uD83D\\uDCA1',l:'borderline \\u2014 close to Rule of 40'};if(s>=10)return{e:'\\uD83D\\uDFE0',l:'below \\u2014 needs improvement'};return{e:'\\uD83D\\uDD34',l:'fail \\u2014 burning without growth'};}" +
  "function bm(b,arr){if(arr<=0)return Infinity;return b/arr;}" +
  "function bmh(r){if(r<1)return{e:'\\uD83D\\uDFE2',l:'great \\u2014 <$1 burned per $1 ARR'};if(r<1.5)return{e:'\\uD83D\\uDCA1',l:'good \\u2014 efficient growth'};if(r<3)return{e:'\\uD83D\\uDFE0',l:'concerning \\u2014 needs tightening'};return{e:'\\uD83D\\uDD34',l:'inefficient \\u2014 too much burn'};}" +
  "function quad(g,m){var hg=g>=40;var pm=m>=0;if(hg&&pm)return{e:'\\uD83D\\uDFE2',l:'Stars (high growth + positive margin)'};if(hg&&!pm)return{e:'\\uD83D\\uDCA1',l:'Growers (high growth + negative margin)'};if(!hg&&pm)return{e:'\\uD83D\\uDCA1',l:'Profitable Plowhorses (low growth + positive margin)'};return{e:'\\uD83D\\uDD34',l:'Zombies (low growth + negative margin)'};}" +
  "function sb(r,st){if(!isFinite(r))return'\\u2014 (no new ARR)';var B={seed:{great:2,good:3},a:{great:1.5,good:2},b:{great:1,good:1.5}};var b=B[st];if(r<b.great)return'\\uD83D\\uDFE2 top-quartile for '+st;if(r<b.good)return'\\uD83D\\uDCA1 on par for '+st;return'\\uD83D\\uDFE0 above median for '+st;}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  // intentionally NOT clamped: semantically can be negative
  "var g=parseFloat(inputs.revenueGrowth)||0;" +
  "var m=parseFloat(inputs.profitMargin)||0;" +
  "var nb=cnn(parseFloat(inputs.netBurn)||0);" +
  "var nA=cnn(parseFloat(inputs.netNewARR)||0);" +
  "if(g===0&&m===0&&nb===0&&nA===0){return['\\u23F0 Burn Multiple / Rule of 40 Calculator\\n\\n\\uD83D\\uDCB0 Enter revenue growth, profit margin, net burn, and net new ARR to see Rule of 40 score and Burn Multiple.'];}" +
  "var s=r40(g,m);" +
  "var sh=r40h(s);" +
  "var b2=bm(nb,nA);" +
  "var bh2=bmh(b2);" +
  "var q=quad(g,m);" +
  "function fmt(n){return n.toLocaleString('en-US',{maximumFractionDigits:0});}" +
  "function money(n){return'$'+fmt(n);}" +
  "function pct1(n){return n.toFixed(1)+'%';}" +
  "function ratS(n){return isFinite(n)?n.toFixed(2):'\\u221E';}" +
  "var qc='';" +
  "if(g>=40){" +
    "qc+='                Margin \\u2192\\n';" +
    "qc+='              Negative        Positive\\n';" +
    "qc+='            \\u250C\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u252C\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2510\\n';" +
    "qc+='Growth High \\u2502  Growers '+(q.l.indexOf('Growers')>=0?'\\u25C0':' ')+'   \\u2502   Stars '+(q.l.indexOf('Stars')>=0?'\\u25C0':' ')+'  \\u2502\\n';" +
    "qc+='            \\u251C\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u253C\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2524\\n';" +
    "qc+='       Low  \\u2502  Zombies    \\u2502  Plowhorses \\u2502\\n';" +
    "qc+='            \\u2514\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2534\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2518';" +
  "}else{" +
    "qc+='                Margin \\u2192\\n';" +
    "qc+='              Negative        Positive\\n';" +
    "qc+='            \\u250C\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u252C\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2510\\n';" +
    "qc+='Growth High \\u2502  Growers    \\u2502   Stars     \\u2502\\n';" +
    "qc+='            \\u251C\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u253C\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2524\\n';" +
    "qc+='       Low  \\u2502  Zombies '+(q.l.indexOf('Zombies')>=0?'\\u25C0':' ')+'  \\u2502  Plowhorses '+(q.l.indexOf('Plowhorses')>=0?'\\u25C0':' ')+'\\u2502\\n';" +
    "qc+='            \\u2514\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2534\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2518';" +
  "}" +
  "var dbl=nA*2;" +
  "var bmDbl=bm(nb,dbl);" +
  "var r40Im=r40(g,m+20);" +
  "var hb=nb/2;" +
  "var bmHb=bm(hb,nA);" +
  "var addA=nb+5000000;" +
  "var bmAa=bm(nb,addA);" +
  "var reqA=nb;" +
  "var tip='';" +
  "if(!isFinite(b2)||b2>3)tip='\\uD83D\\uDCA1 Tip: Burn Multiple >3 is inefficient. Either cut non-revenue-generating spend (overhead, R&D) or invest more in sales/marketing efficiency.';" +
  "else if(s<0)tip='\\uD83D\\uDCA1 Tip: Rule of 40 below 0% \\u2014 burning cash without growing fast enough. Refocus on product-market fit or fundraising.';" +
  "else if(s>=40&&isFinite(b2)&&b2<1.5)tip='\\uD83D\\uDCA1 Tip: Top-quartile efficiency. Use this in your fundraising narrative and consider raising at premium valuation.';" +
  "else tip='\\uD83D\\uDCA1 Tip: Healthy SaaS hits Rule of 40 with Burn Multiple <1.5. If you are <1, you are top-quartile. If >3, fix the model or extend runway before raising.';" +
  "var r2='';" +
  "r2+='\\u23F0 Burn Multiple / Rule of 40 Calculator\\n\\n';" +
  "r2+='\\uD83D\\uDCB0 Metrics Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Revenue Growth:   '+pct1(g)+'\\n';" +
  "r2+='\\u2022 Profit Margin:    '+pct1(m)+'\\n';" +
  "r2+='\\u2022 Net Burn:         '+money(nb)+'\\n';" +
  "r2+='\\u2022 Net New ARR:      '+money(nA)+'\\n';" +
  "r2+='\\u2022 Period:           implied quarterly (annualize if needed)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCD0 Rule of 40 Result:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Sum:  '+pct1(g)+' + '+pct1(m)+' = '+pct1(s)+'\\n';" +
  "r2+='\\u2022 Verdict:  '+sh.e+' '+sh.l+'\\n';" +
  "r2+='\\u2022 Component breakdown:  Growth '+pct1(g)+' + Margin '+pct1(m)+' = '+pct1(s)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Burn Multiple Result:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Ratio:  $'+ratS(b2)+' burned per $1 of new ARR\\n';" +
  "r2+='\\u2022 Verdict:  '+bh2.e+' '+bh2.l+'\\n';" +
  "r2+='\\u2022 Capital efficiency:  Each $1 of new ARR costs $'+ratS(b2)+' in cash\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF SaaS Health Quadrant:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Your quadrant:  '+q.e+' '+q.l+'\\n';" +
  "r2+=qc+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Capital Efficiency Benchmarks:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Seed:        '+sb(b2,'seed')+'  (median Burn Multiple 2-3)\\n';" +
  "r2+='\\u2022 Series A:    '+sb(b2,'a')+'  (median Burn Multiple 1.5-2)\\n';" +
  "r2+='\\u2022 Series B+:   '+sb(b2,'b')+'  (median Burn Multiple 1-1.5)\\n';" +
  "r2+='\\u2022 Your ratio:  $'+ratS(b2)+' per $1 ARR\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If Scenarios:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 2\\u00d7 growth (new ARR $'+fmt(dbl)+'):       Burn Multiple $'+ratS(bmDbl)+' per $1 ARR\\n';" +
  "r2+='\\u2022 Improve margin by 20pp:        Rule of 40 \\u2192 '+pct1(r40Im)+'\\n';" +
  "r2+='\\u2022 Cut burn 50% ($'+fmt(hb)+'):           Burn Multiple $'+ratS(bmHb)+' per $1 ARR\\n';" +
  "r2+='\\u2022 Add $5M ARR (new ARR $'+fmt(addA)+'):    Burn Multiple $'+ratS(bmAa)+' per $1 ARR\\n';" +
  "r2+='\\u2022 Aim for Burn Multiple <1:      requires net new ARR > $'+fmt(reqA)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=tip;" +
  "var results=[r2];" +
  "var combos=[{g:50,m:-20},{g:100,m:-20},{g:150,m:0},{g:200,m:10},{g:300,m:20}];" +
  "for(var j=0;j<combos.length;j++){var c=combos[j];var s2=r40(c.g,c.m);var h2=r40h(s2);results.push('Comparison: '+c.g+'% growth + '+c.m+'% margin = '+pct1(s2)+' (Rule of 40) \\u2192 '+h2.e+' '+h2.l.split(' \\u2014 ')[0]);}" +
  "return results;";

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
  generate(inputs: Record<string, string>): string[] {
    return calculateBurnMultiple(inputs);
  },
  staticExamples: ['⏰ Burn Multiple / Rule of 40 Calculator\n\n💰 Metrics Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Revenue Growth:   100.0%\n• Profit Margin:    -20.0%\n• Net Burn:         $2,000,000\n• Net New ARR:      $1,500,000\n• Period:           implied quarterly (annualize if needed)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Rule of 40 Result:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Sum:  100.0% + -20.0% = 80.0%\n• Verdict:  🟢 PASS — top-quartile efficiency\n• Component breakdown:  Growth 100.0% + Margin -20.0% = 80.0%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Burn Multiple Result:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Ratio:  $1.33 burned per $1 of new ARR\n• Verdict:  🟡 good — efficient growth\n• Capital efficiency:  Each $1 of new ARR costs $1.33 in cash\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 SaaS Health Quadrant:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Your quadrant:  🟡 Growers (high growth + negative margin)\n                Margin →\n              Negative        Positive\n            ┌─────────────┬─────────────┐\nGrowth High │  Growers ◀   │   Stars    │\n            ├─────────────┼─────────────┤\n       Low  │  Zombies    │  Plowhorses │\n            └─────────────┴─────────────┘\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Capital Efficiency Benchmarks:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Seed:        🟢 top-quartile for seed  (median Burn Multiple 2-3)\n• Series A:    🟢 top-quartile for a  (median Burn Multiple 1.5-2)\n• Series B+:   🟡 on par for b  (median Burn Multiple 1-1.5)\n• Your ratio:  $1.33 per $1 ARR\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 2× growth (new ARR $3,000,000):       Burn Multiple $0.67 per $1 ARR\n• Improve margin by 20pp:        Rule of 40 → 100.0%\n• Cut burn 50% ($1,000,000):           Burn Multiple $0.67 per $1 ARR\n• Add $5M ARR (new ARR $7,000,000):    Burn Multiple $0.29 per $1 ARR\n• Aim for Burn Multiple <1:      requires net new ARR > $2,000,000\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: Top-quartile efficiency. Use this in your fundraising narrative and consider raising at premium valuation.\nComparison: 50% growth + -20% margin = 30.0% (Rule of 40) → 🟡 borderline\nComparison: 100% growth + -20% margin = 80.0% (Rule of 40) → 🟢 PASS\nComparison: 150% growth + 0% margin = 150.0% (Rule of 40) → 🟢 PASS\nComparison: 200% growth + 10% margin = 210.0% (Rule of 40) → 🟢 PASS\nComparison: 300% growth + 20% margin = 320.0% (Rule of 40) → 🟢 PASS'],
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
