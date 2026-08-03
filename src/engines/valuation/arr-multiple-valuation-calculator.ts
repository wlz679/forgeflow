import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

// ============== Math helpers (exported for tests) ==============

/**
 * ARR Multiple = Valuation / ARR. The headline SaaS valuation metric.
 * Returns Infinity when ARR <= 0.
 */
export function arrMultiple(valuation: number, arr: number): number {
  if (arr <= 0) return Infinity;
  return valuation / arr;
}

/**
 * Expected multiple heuristic: 5x base + growth/10 + margin/5.
 * - 0% growth + 0% margin = 5x (mature, breakeven)
 * - 50% growth + 0% margin = 10x
 * - 100% growth + 0% margin = 15x
 * - 100% growth + 20% margin = 19x
 * - 200% growth + 0% margin = 25x (hyper)
 */
export function expectedMultiple(growthRate: number, profitMargin: number): number {
  return 5 + growthRate / 10 + profitMargin / 5;
}

/**
 * Health: how does actual multiple compare to expected?
 * - within 30%: 🟢 reasonable
 * - 30-60% off: 🟡 above/below market
 * - >60% off: 🟠 outlier
 */
export function multipleHealth(actual: number, expected: number): {
  emoji: string;
  label: string;
} {
  if (expected <= 0) return { emoji: '🟡', label: 'neutral (no expected baseline)' };
  const ratio = actual / expected;
  if (ratio >= 0.7 && ratio <= 1.3)
    return { emoji: '🟢', label: 'reasonable — within 30% of expected' };
  if (ratio >= 0.4 && ratio <= 1.6)
    return { emoji: '🟡', label: 'above/below market — 30-60% off expected' };
  return { emoji: '🟠', label: 'outlier — >60% off expected' };
}

/**
 * Multiple tier by growth rate.
 * - <20% growth: 3-8x (slow)
 * - 20-50%: 8-15x (medium)
 * - 50-100%: 15-25x (fast)
 * - >100%: 25-40x (hyper)
 */
export function multipleTier(growthRate: number): {
  emoji: string;
  label: string;
  range: string;
} {
  if (growthRate < 20) return { emoji: '🟡', label: 'Slow growth', range: '3-8x' };
  if (growthRate < 50) return { emoji: '🟢', label: 'Medium growth', range: '8-15x' };
  if (growthRate < 100) return { emoji: '🟢', label: 'Fast growth', range: '15-25x' };
  return { emoji: '🟢', label: 'Hyper growth', range: '25-40x' };
}

/**
 * Forward valuation: projected ARR in 12 months × forward multiple.
 */
export function forwardValuation(
  arr: number,
  growthRate: number,
  forwardMultiple: number,
): number {
  const projectedARR = arr * (1 + growthRate / 100);
  return projectedARR * forwardMultiple;
}

// ============== calculate() ==============

function calculateARRMultiple(inputs: Record<string, string>): string[] {
  const arr = clampNonNegative(parseFloat(inputs.arr) || 0);
  const valuation = clampNonNegative(parseFloat(inputs.valuation) || 0);
  // intentionally NOT clamped: semantically can be negative (negative growth / negative margin)
  const growthRate = parseFloat(inputs.growthRate) || 0;
  const profitMargin = parseFloat(inputs.profitMargin) || 0;

  if (arr === 0 && valuation === 0) {
    return [
      '⏰ ARR Multiple / Valuation Multiplier Calculator\n\n' +
        '💰 Enter ARR and valuation to see your multiple, expected baseline (by growth+margin), and forward valuation projection.',
    ];
  }
  if (arr === 0) {
    return [
      '⏰ ARR Multiple / Valuation Multiplier Calculator\n\n' +
        '💰 Enter ARR > 0 to compute valuation multiples. ARR (Annual Recurring Revenue) is the foundational metric for SaaS valuation.',
    ];
  }

  // Core math
  const multiple = arrMultiple(valuation, arr);
  const expected = expectedMultiple(growthRate, profitMargin);
  const health = multipleHealth(multiple, expected);
  const tier = multipleTier(growthRate);
  const fwdVal10 = forwardValuation(arr, growthRate, 10);
  const fwdVal20 = forwardValuation(arr, growthRate, 20);
  const projectedARR = arr * (1 + growthRate / 100);
  const impliedFwdMultiple = arrMultiple(valuation, projectedARR);

  // Format helpers
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const money = (n: number) => '$' + fmt(n);
  const multipleFmt = (n: number) => (isFinite(n) ? n.toFixed(2) + 'x' : '∞');

  // ASCII multiple bar (current vs tier range)
  const barLen = 40;
  const tierLow = parseFloat(tier.range.split('-')[0]);
  const tierHigh = parseFloat(tier.range.split('-')[1].replace('x', ''));
  const scale = (n: number) =>
    Math.max(0, Math.min(barLen, Math.round((n / 40) * barLen)));
  let asciiBar = '';
  asciiBar += ' 0x' + ' '.repeat(barLen - 4) + '40x\n';
  asciiBar +=
    ' ' +
    '─'.repeat(scale(tierLow)) +
    '┤' +
    '─'.repeat(Math.max(0, scale(multiple) - scale(tierLow) - 1)) +
    (multiple >= tierLow && multiple <= tierHigh ? '●' : '◆') +
    '─'.repeat(Math.max(0, scale(tierHigh) - scale(multiple) - 1)) +
    '┤' +
    '─'.repeat(Math.max(0, barLen - scale(tierHigh))) +
    ' ' +
    tier.range +
    '\n';
  asciiBar += '           ▲ you: ' + multipleFmt(multiple);

  // What-If scenarios
  // 1. Double growth (100%)
  const doubleGrowthExpected = expectedMultiple(Math.min(200, growthRate * 2), profitMargin);
  // 2. Improve margin by 20pp
  const improvedMarginExpected = expectedMultiple(growthRate, profitMargin + 20);
  // 3. Cut valuation 20%
  const cutValMultiple = multiple * 0.8;
  // 4. Target 10x: required valuation
  const target10xVal = arr * 10;
  // 5. Sell at 20x: required valuation
  const target20xVal = arr * 20;

  // Tip selection
  let tip: string;
  if (multiple > 30) {
    tip =
      '💡 Tip: Hyper-growth premium. Make sure you can sustain 100%+ growth for 3+ years — investors will haircut your multiple if growth slows.';
  } else if (multiple < 5) {
    tip =
      '💡 Tip: Low multiple. Either growth is slow, retention is weak, or the market does not believe in the model. Cut burn and demonstrate PMF before next round.';
  } else {
    tip =
      '💡 Tip: ARR multiples depend on growth + margin. 50% growth + 0% margin = 10x is typical. Hyper-growth (100%+) trades at 20-30x. Profitable SaaS commands 2-4x premium over unprofitable peers.';
  }

  const r =
    '⏰ ARR Multiple / Valuation Multiplier Calculator\n\n' +
    '💰 Valuation Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ARR:                ' +
    money(arr) +
    '\n' +
    '• Valuation:          ' +
    money(valuation) +
    '\n' +
    '• Multiple:           ' +
    multipleFmt(multiple) +
    '  (valuation / ARR)\n' +
    '• Growth Rate:        ' +
    growthRate +
    '%\n' +
    '• Profit Margin:      ' +
    profitMargin +
    '%\n' +
    '• Rule of 40 sum:     ' +
    (growthRate + profitMargin).toFixed(1) +
    '%  (growth + margin)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Multiple Determination:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Base:               5.00x  (mature SaaS floor)\n' +
    '• Growth contribution: +' +
    (growthRate / 10).toFixed(2) +
    'x  (growth ' +
    growthRate +
    '% / 10)\n' +
    '• Margin contribution: +' +
    (profitMargin / 5).toFixed(2) +
    'x  (margin ' +
    profitMargin +
    '% / 5)\n' +
    '• Expected multiple:   ' +
    expected.toFixed(2) +
    'x  (5 + growth/10 + margin/5)\n' +
    '• Actual multiple:     ' +
    multipleFmt(multiple) +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Multiple Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' +
    health.emoji +
    ' ' +
    health.label +
    '\n' +
    '• Ratio (actual / expected): ' +
    (multiple / expected).toFixed(2) +
    'x\n' +
    '• Interpretation:  ' +
    (multiple > expected
      ? 'premium — investors pay above market for your growth+margin profile'
      : multiple < expected
        ? 'discount — your growth+margin profile suggests a higher multiple'
        : 'aligned with market expectations') +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Multiple Ranges by Stage:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Slow growth (<20%):    3-8x\n' +
    '• Medium growth (20-50%): 8-15x\n' +
    '• Fast growth (50-100%):  15-25x\n' +
    '• Hyper growth (>100%):   25-40x\n' +
    '• Your tier:  ' +
    tier.emoji +
    ' ' +
    tier.label +
    ' (' +
    tier.range +
    ')\n' +
    asciiBar +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Forward Valuation:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Current ARR:           ' +
    money(arr) +
    '\n' +
    '• Projected ARR (12 mo): ' +
    money(projectedARR) +
    '  (current × (1 + ' +
    growthRate +
    '%))\n' +
    '• Implied fwd multiple:  ' +
    multipleFmt(impliedFwdMultiple) +
    '  (at current valuation)\n' +
    '• At forward 10x:        ' +
    money(fwdVal10) +
    '  (next round target)\n' +
    '• At forward 20x:        ' +
    money(fwdVal20) +
    '  (aggressive target)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Double growth (' +
    Math.min(200, growthRate * 2) +
    '%):    expected multiple → ' +
    doubleGrowthExpected.toFixed(2) +
    'x\n' +
    '• Improve margin +20pp:           expected multiple → ' +
    improvedMarginExpected.toFixed(2) +
    'x (+4x)\n' +
    '• Cut valuation 20%:               multiple → ' +
    cutValMultiple.toFixed(2) +
    'x\n' +
    '• Target 10x multiple:             required valuation = ' +
    money(target10xVal) +
    '\n' +
    '• Sell at 20x multiple:            required valuation = ' +
    money(target20xVal) +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip;

  const results: string[] = [r];

  // SEO long-tail comparison rows at 5 ARR levels
  const arrs = [500000, 1000000, 5000000, 10000000, 50000000];
  for (let idx = 0; idx < arrs.length; idx++) {
    const a = arrs[idx];
    const m = arrMultiple(valuation, a);
    results.push(
      'Comparison: $' +
        fmt(a) +
        ' ARR at ' +
        money(valuation) +
        ' valuation → ' +
        multipleFmt(m) +
        ' multiple',
    );
  }

  return results;
}

// ============== customFn ==============

const customFn =
  "function am(v,a){if(a<=0)return Infinity;return v/a;}" +
  "function em(g,m){return 5+g/10+m/5;}" +
  "function mh(act,exp){if(exp<=0)return{e:'\\uD83D\\uDCA1',l:'neutral (no expected baseline)'};var r=act/exp;if(r>=0.7&&r<=1.3)return{e:'\\uD83D\\uDFE2',l:'reasonable \\u2014 within 30% of expected'};if(r>=0.4&&r<=1.6)return{e:'\\uD83D\\uDCA1',l:'above/below market \\u2014 30-60% off expected'};return{e:'\\uD83D\\uDFE0',l:'outlier \\u2014 >60% off expected'};}" +
  "function mt(g){if(g<20)return{e:'\\uD83D\\uDCA1',l:'Slow growth',r:'3-8x'};if(g<50)return{e:'\\uD83D\\uDFE2',l:'Medium growth',r:'8-15x'};if(g<100)return{e:'\\uD83D\\uDFE2',l:'Fast growth',r:'15-25x'};return{e:'\\uD83D\\uDFE2',l:'Hyper growth',r:'25-40x'};}" +
  "function fv(a,g,fm){return a*(1+g/100)*fm;}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var arr=cnn(parseFloat(inputs.arr)||0);" +
  "var val=cnn(parseFloat(inputs.valuation)||0);" +
  // intentionally NOT clamped: semantically can be negative
  "var gr=parseFloat(inputs.growthRate)||0;" +
  "var pm=parseFloat(inputs.profitMargin)||0;" +
  "if(arr===0&&val===0){return['\\u23F0 ARR Multiple / Valuation Multiplier Calculator\\n\\n\\uD83D\\uDCB0 Enter ARR and valuation to see your multiple, expected baseline (by growth+margin), and forward valuation projection.'];}" +
  "if(arr===0){return['\\u23F0 ARR Multiple / Valuation Multiplier Calculator\\n\\n\\uD83D\\uDCB0 Enter ARR > 0 to compute valuation multiples. ARR (Annual Recurring Revenue) is the foundational metric for SaaS valuation.'];}" +
  "var mlt=am(val,arr);" +
  "var exp=em(gr,pm);" +
  "var hl=mh(mlt,exp);" +
  "var tr=mt(gr);" +
  "var fv10=fv(arr,gr,10);" +
  "var fv20=fv(arr,gr,20);" +
  "var proj=arr*(1+gr/100);" +
  "var implFwd=am(val,proj);" +
  "function fmt(n){return n.toLocaleString('en-US',{maximumFractionDigits:0});}" +
  "function money(n){return'$'+fmt(n);}" +
  "function mFmt(n){return isFinite(n)?n.toFixed(2)+'x':'\\u221E';}" +
  "var barLen=40;" +
  "var tLow=parseFloat(tr.r.split('-')[0]);" +
  "var tHigh=parseFloat(tr.r.split('-')[1].replace('x',''));" +
  "function sc2(n){return Math.max(0,Math.min(barLen,Math.round((n/40)*barLen)));}" +
  "var ab='';" +
  "ab+=' 0x'+' '.repeat(barLen-4)+'40x\\n';" +
  "ab+=' '+'\\u2500'.repeat(sc2(tLow))+'\\u2524'+'\\u2500'.repeat(Math.max(0,sc2(mlt)-sc2(tLow)-1))+(mlt>=tLow&&mlt<=tHigh?'\\u25CF':'\\u25C6')+'\\u2500'.repeat(Math.max(0,sc2(tHigh)-sc2(mlt)-1))+'\\u2524'+'\\u2500'.repeat(Math.max(0,barLen-sc2(tHigh)))+' '+tr.r+'\\n';" +
  "ab+='           \\u25B2 you: '+mFmt(mlt);" +
  "var dgExp=em(Math.min(200,gr*2),pm);" +
  "var imExp=em(gr,pm+20);" +
  "var cvMlt=mlt*0.8;" +
  "var t10=arr*10;" +
  "var t20=arr*20;" +
  "var tip='';" +
  "if(mlt>30)tip='\\uD83D\\uDCA1 Tip: Hyper-growth premium. Make sure you can sustain 100%+ growth for 3+ years \\u2014 investors will haircut your multiple if growth slows.';" +
  "else if(mlt<5)tip='\\uD83D\\uDCA1 Tip: Low multiple. Either growth is slow, retention is weak, or the market does not believe in the model. Cut burn and demonstrate PMF before next round.';" +
  "else tip='\\uD83D\\uDCA1 Tip: ARR multiples depend on growth + margin. 50% growth + 0% margin = 10x is typical. Hyper-growth (100%+) trades at 20-30x. Profitable SaaS commands 2-4x premium over unprofitable peers.';" +
  "var r2='';" +
  "r2+='\\u23F0 ARR Multiple / Valuation Multiplier Calculator\\n\\n';" +
  "r2+='\\uD83D\\uDCB0 Valuation Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 ARR:                '+money(arr)+'\\n';" +
  "r2+='\\u2022 Valuation:          '+money(val)+'\\n';" +
  "r2+='\\u2022 Multiple:           '+mFmt(mlt)+'  (valuation / ARR)\\n';" +
  "r2+='\\u2022 Growth Rate:        '+gr+'%\\n';" +
  "r2+='\\u2022 Profit Margin:      '+pm+'%\\n';" +
  "r2+='\\u2022 Rule of 40 sum:     '+(gr+pm).toFixed(1)+'%  (growth + margin)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCD0 Multiple Determination:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Base:               5.00x  (mature SaaS floor)\\n';" +
  "r2+='\\u2022 Growth contribution: +'+(gr/10).toFixed(2)+'x  (growth '+gr+'% / 10)\\n';" +
  "r2+='\\u2022 Margin contribution: +'+(pm/5).toFixed(2)+'x  (margin '+pm+'% / 5)\\n';" +
  "r2+='\\u2022 Expected multiple:   '+exp.toFixed(2)+'x  (5 + growth/10 + margin/5)\\n';" +
  "r2+='\\u2022 Actual multiple:     '+mFmt(mlt)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Multiple Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+hl.e+' '+hl.l+'\\n';" +
  "r2+='\\u2022 Ratio (actual / expected): '+(mlt/exp).toFixed(2)+'x\\n';" +
  "r2+='\\u2022 Interpretation:  '+(mlt>exp?'premium \\u2014 investors pay above market for your growth+margin profile':mlt<exp?'discount \\u2014 your growth+margin profile suggests a higher multiple':'aligned with market expectations')+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Multiple Ranges by Stage:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Slow growth (<20%):    3-8x\\n';" +
  "r2+='\\u2022 Medium growth (20-50%): 8-15x\\n';" +
  "r2+='\\u2022 Fast growth (50-100%):  15-25x\\n';" +
  "r2+='\\u2022 Hyper growth (>100%):   25-40x\\n';" +
  "r2+='\\u2022 Your tier:  '+tr.e+' '+tr.l+' ('+tr.r+')\\n';" +
  "r2+=ab+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Forward Valuation:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Current ARR:           '+money(arr)+'\\n';" +
  "r2+='\\u2022 Projected ARR (12 mo): '+money(proj)+'  (current \\u00d7 (1 + '+gr+'%))\\n';" +
  "r2+='\\u2022 Implied fwd multiple:  '+mFmt(implFwd)+'  (at current valuation)\\n';" +
  "r2+='\\u2022 At forward 10x:        '+money(fv10)+'  (next round target)\\n';" +
  "r2+='\\u2022 At forward 20x:        '+money(fv20)+'  (aggressive target)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If Scenarios:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Double growth ('+Math.min(200,gr*2)+'%):    expected multiple \\u2192 '+dgExp.toFixed(2)+'x\\n';" +
  "r2+='\\u2022 Improve margin +20pp:           expected multiple \\u2192 '+imExp.toFixed(2)+'x (+4x)\\n';" +
  "r2+='\\u2022 Cut valuation 20%:               multiple \\u2192 '+cvMlt.toFixed(2)+'x\\n';" +
  "r2+='\\u2022 Target 10x multiple:             required valuation = '+money(t10)+'\\n';" +
  "r2+='\\u2022 Sell at 20x multiple:            required valuation = '+money(t20)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=tip;" +
  "var results=[r2];" +
  "var arrs=[500000,1000000,5000000,10000000,50000000];" +
  "for(var j=0;j<arrs.length;j++){var a=arrs[j];var m2=am(val,a);results.push('Comparison: $'+fmt(a)+' ARR at '+money(val)+' valuation \\u2192 '+mFmt(m2)+' multiple');}" +
  "return results;";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-arr-multiple-valuation-calculator',
  title: 'ARR Multiple / Valuation Multiplier Calculator',
  description:
    'Determine if your SaaS valuation multiple is reasonable given your growth rate and profit margin. See your expected multiple (heuristic: 5x base + growth/10 + margin/5), compare to stage benchmarks (Slow/Medium/Fast/Hyper growth tiers), and project forward valuation at 10x and 20x.',
  inputs: [
    {
      name: 'arr',
      label: 'Annual Recurring Revenue ($)',
      placeholder: 'e.g. 1000000',
      type: 'number',
    },
    {
      name: 'valuation',
      label: 'Valuation ($)',
      placeholder: 'e.g. 15000000',
      type: 'number',
    },
    {
      name: 'growthRate',
      label: 'Annual Growth Rate (%)',
      placeholder: 'e.g. 50',
      type: 'number',
    },
    {
      name: 'profitMargin',
      label: 'Profit Margin (%)',
      placeholder: 'e.g. 0',
      type: 'number',
    },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs: Record<string, string>): string[] {
    return calculateARRMultiple(inputs);
  },
  staticExamples: ['⏰ ARR Multiple / Valuation Multiplier Calculator\n\n💰 Valuation Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• ARR:                $1,000,000\n• Valuation:          $15,000,000\n• Multiple:           15.00x  (valuation / ARR)\n• Growth Rate:        50%\n• Profit Margin:      0%\n• Rule of 40 sum:     50.0%  (growth + margin)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Multiple Determination:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Base:               5.00x  (mature SaaS floor)\n• Growth contribution: +5.00x  (growth 50% / 10)\n• Margin contribution: +0.00x  (margin 0% / 5)\n• Expected multiple:   10.00x  (5 + growth/10 + margin/5)\n• Actual multiple:     15.00x\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Multiple Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 above/below market — 30-60% off expected\n• Ratio (actual / expected): 1.50x\n• Interpretation:  premium — investors pay above market for your growth+margin profile\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Multiple Ranges by Stage:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Slow growth (<20%):    3-8x\n• Medium growth (20-50%): 8-15x\n• Fast growth (50-100%):  15-25x\n• Hyper growth (>100%):   25-40x\n• Your tier:  🟢 Fast growth (15-25x)\n 0x                                    40x\n ───────────────┤●─────────┤─────────────── 15-25x\n           ▲ you: 15.00x\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Forward Valuation:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Current ARR:           $1,000,000\n• Projected ARR (12 mo): $1,500,000  (current × (1 + 50%))\n• Implied fwd multiple:  10.00x  (at current valuation)\n• At forward 10x:        $15,000,000  (next round target)\n• At forward 20x:        $30,000,000  (aggressive target)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Double growth (100%):    expected multiple → 15.00x\n• Improve margin +20pp:           expected multiple → 14.00x (+4x)\n• Cut valuation 20%:               multiple → 12.00x\n• Target 10x multiple:             required valuation = $10,000,000\n• Sell at 20x multiple:            required valuation = $20,000,000\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: ARR multiples depend on growth + margin. 50% growth + 0% margin = 10x is typical. Hyper-growth (100%+) trades at 20-30x. Profitable SaaS commands 2-4x premium over unprofitable peers.\nComparison: $500,000 ARR at $15,000,000 valuation → 30.00x multiple\nComparison: $1,000,000 ARR at $15,000,000 valuation → 15.00x multiple\nComparison: $5,000,000 ARR at $15,000,000 valuation → 3.00x multiple\nComparison: $10,000,000 ARR at $15,000,000 valuation → 1.50x multiple\nComparison: $50,000,000 ARR at $15,000,000 valuation → 0.30x multiple'],
  faq: [
    {
      q: 'What is an ARR multiple?',
      a: 'ARR multiple is the ratio of a SaaS company valuation to its Annual Recurring Revenue: Multiple = Valuation / ARR. It is the headline metric investors use to compare SaaS companies. A startup valued at $15M with $1M ARR is at a 15x multiple. The multiple varies hugely by growth rate and profit margin: slow growth (<20%) trades at 3-8x, medium (20-50%) at 8-15x, fast (50-100%) at 15-25x, and hyper-growth (100%+) at 25-40x+. Public SaaS companies trade at 5-20x depending on fundamentals.',
    },
    {
      q: 'How is ARR multiple determined?',
      a: 'ARR multiple is determined by market forces (supply/demand for SaaS investments) and fundamentals (growth, margin, retention, market). The two biggest drivers are: (1) Growth rate — each 10% of growth adds ~1x to the multiple (linear relationship). (2) Profit margin — each 5% of margin adds ~1x. A 50% growth + 0% margin company is at ~10x. A 100% growth + 20% margin company is at ~19x. Other factors (NRR, market category, gross margin) matter but are harder to model.',
    },
    {
      q: 'What is a good ARR multiple?',
      a: 'A good ARR multiple depends on your stage and growth: Seed (10-15x is typical), Series A (10-20x), Series B (12-25x), Series C+ (15-30x). The best way to gauge yours is to look at recent comparable raises. Public SaaS benchmarks (per ICONIQ, Bessemer): Rule of 40 passing companies trade at 10-20x; hyper-growth (100%+) trades at 20-40x. Note: ARR multiples compress in tougher funding environments (2022-2023 saw 5-15x for most SaaS).',
    },
    {
      q: 'How do I increase my ARR multiple?',
      a: 'Three primary levers: (1) Accelerate growth — every 10% of growth adds ~1x to multiple. (2) Improve margins — every 5% of margin adds ~1x. (3) Demonstrate retention — Net Dollar Retention (NDR) > 120% commands a 2-4x premium. Secondary levers: (4) Expand into a larger market (TAM expansion = more upside for investor). (5) Build competitive moats (switching costs, network effects). (6) Improve sales efficiency (LTV/CAC ratio). Most companies focus on (1) and (2) because they are easiest to demonstrate to investors in a deck.',
    },
    {
      q: 'What is the difference between ARR multiple and revenue multiple?',
      a: 'ARR multiple is for SaaS companies with subscription revenue; revenue multiple is for all companies. ARR is the annualized run rate of recurring subscription contracts — it excludes one-time fees, services revenue, and usage-based charges. Revenue (under ASC 606) is recognized ratably over the contract term. For a typical SaaS with annual contracts paid upfront, ARR and revenue are nearly identical. For usage-based or services-heavy SaaS, ARR < revenue (because revenue is amortized). The headline metric VCs use is ARR for early-stage SaaS and revenue for later-stage / public.',
    },
    { q: "What is a SaaS ARR multiple?", a: "ARR multiple = valuation / ARR. For $50M valuation on $10M ARR: 5x multiple. Benchmarks: 1) Top quartile: 15-25x, 2) Above average: 8-15x, 3) Average: 5-8x, 4) Below average: 3-5x, 5) Distressed: <3x. By stage: 1) Seed: 10-15x, 2) Series A: 8-12x, 3) Series B: 6-10x, 4) Public: 5-15x. Higher multiple: better growth + retention. Most: 8-12x is \"good\" for venture-scale." },
    { q: "What factors affect SaaS ARR multiples?", a: "Top 5: 1) Growth rate (50%+ gets premium), 2) Net retention (110%+ premium, <100% discount), 3) Gross margin (75%+ premium, <60% discount), 4) Rule of 40 (above 40 = premium), 5) Market size (larger = higher multiple). Secondary: 6) Payback (<18 months), 7) Logo retention, 8) Sales efficiency, 9) Team quality, 10) Market position. Most: growth + NRR = 70% of valuation. Aim: 100%+ growth + 110% NRR." },
    { q: "How is ARR multiple different from revenue multiple?", a: "ARR (Annual Recurring Revenue): annualized subscription revenue. Revenue: total (including one-time). For SaaS: ARR multiple is more relevant. Multiples: ARR multiple typically 1.5-2x revenue multiple. ARR is recurring (more predictable), so it gets a premium. Most: use ARR for SaaS. Use revenue for non-SaaS. Difference: ARR strips non-recurring (setup fees, etc.). Aim: pure ARR (cleanest)." },
    { q: "What is the difference between public and private multiples?", a: "Public SaaS (2026): 8-15x ARR (median ~10x). High growth: 15-25x. Mature: 4-8x. Private rounds: similar but often premium for high growth. Benchmarks: Snowflake peak 100x, now 60x. Datadog: 30x. Cloudflare: 25x. Average public: 10-12x. Average private: 8-15x. Stage: pre-revenue gets 5-10x forward ARR. Most: 8-12x private. Use comparable transactions. Latest deals: most accurate." },
    { q: "How do I justify a higher ARR multiple?", a: "Top factors: 1) Growth: 100%+ YoY, 2) NRR: 120%+, 3) Gross margin: 80%+, 4) Rule of 40: 50%+, 5) Sales efficiency: $1+ ARR per $1 S&M, 6) Payback: <12 months, 7) Logo retention: 95%+, 8) Market: $1B+ TAM. Strong on 3-4 of these: 15-20x. Weak on most: 3-5x. Most: investors pay 2-3x for every 100% growth. Aim: 100%+ growth + 110% NRR = 15-20x." },
    { q: "What is Rule of 40 and why does it matter?", a: "Rule of 40: revenue growth rate + profit margin should be ≥40%. For 60% growth + (-20%) margin: 40% (pass). For 30% growth + 10% margin: 40% (pass). For 100% growth + 0% margin: 100% (great). Investors: rule of 40 is the gold standard for SaaS. Above 40: premium multiple (10-20x). Below 40: discount. Most: aim for 50-80. Top: 80%+. Be honest: it's a balance, not a target." },
    { q: "How do I calculate my own ARR multiple?", a: "For valuation: 1) Calculate ARR, 2) Apply multiple, 3) Result = valuation. For $5M ARR, 10x: $50M. For $20M ARR, 8x: $160M. For benchmarking: 1) Find comparable companies, 2) Average their multiples, 3) Adjust for differences. Sources: public filings, VC databases (PitchBook), comparable transactions. Most: use 3-5 comps. Adjust for growth, retention, market. Be honest: most multiples are 5-10x for healthy SaaS." },
    { q: "What is the impact of gross margin on valuation?", a: "Higher gross margin = higher multiple. SaaS target: 75-85%. Below 60%: 3-5x. 60-75%: 5-10x. 75-85%: 10-15x. 85%+: 15-25x. Why: better unit economics, more profit per dollar, more cash to reinvest. Below 60%: signals services-heavy or low-margin. Most: aim for 80%+. Top: 85%+. Calculate: (revenue - COGS) / revenue. COGS = hosting + support + payment fees. Sales/marketing is opex (not COGS)." },
  ],
  howToUse: [
    'Enter your current ARR (Annual Recurring Revenue).',
    'Enter the valuation you are raising at (or have raised at).',
    'Enter your annual growth rate (YoY or annualized).',
    'Enter your EBITDA profit margin (can be negative for unprofitable).',
    'Review your multiple, expected baseline (5 + growth/10 + margin/5), and health assessment.',
    'Check the stage benchmarks (Slow/Medium/Fast/Hyper growth) to see how you compare.',
    'Use the forward valuation projection to set your next round target.',
    'Apply the 5 what-if scenarios to model growth and margin improvements.',
  ],
  engineKey: true,
};

registerEngine(engine);
