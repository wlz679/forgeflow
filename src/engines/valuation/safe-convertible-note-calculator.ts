import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

// ============== Math helpers (exported for tests) ==============

/**
 * Number of SAFE shares issued at conversion, given the cap.
 * Closed-form algebra from capPrice = (postMoneyCap - investment) / existingShares:
 *   SAFEshares = investment / capPrice = investment × existingShares / (postMoneyCap - investment)
 * Returns 0 if cap <= investment (caller should validate).
 */
export function safeSharesAtCap(
  investment: number,
  postMoneyCap: number,
  existingShares: number,
): number {
  const effectivePreMoney = postMoneyCap - investment;
  if (effectivePreMoney <= 0 || existingShares <= 0) return 0;
  return (investment * existingShares) / effectivePreMoney;
}

/**
 * Cap price per share: (postMoneyCap - investment) / existingShares.
 * This is the per-share price at which SAFE converts if the cap governs.
 * Returns 0 if effective pre-money is non-positive.
 */
export function capPrice(
  postMoneyCap: number,
  effectivePreMoney: number,
  existingShares: number,
): number {
  if (effectivePreMoney <= 0 || existingShares <= 0) return 0;
  return effectivePreMoney / existingShares;
}

/**
 * Discount price per share: (nextRoundValuation / existingShares) × (1 - discountRate/100).
 * If nextRoundValuation = 0 or existingShares = 0, returns Infinity (so cap always wins).
 */
export function discountPrice(
  nextRoundValuation: number,
  existingShares: number,
  discountRatePercent: number,
): number {
  if (nextRoundValuation <= 0 || existingShares <= 0) return Infinity;
  return (nextRoundValuation / existingShares) * (1 - discountRatePercent / 100);
}

/**
 * Conversion price = min(capPrice, discountPrice). The SAFE converts at whichever is lower
 * (better for the SAFE investor).
 */
export function conversionPrice(
  capP: number,
  discountP: number,
): number {
  return Math.min(capP, discountP);
}

/**
 * SAFE investor ownership at conversion, as a fraction (0-1).
 *   own = SAFEshares / (existingShares + SAFEshares)
 */
export function safeOwnership(
  safeShares: number,
  existingShares: number,
): number {
  const total = existingShares + safeShares;
  if (total <= 0) return 0;
  return safeShares / total;
}

/**
 * Health assessment based on cap-to-investment ratio.
 *   ratio < 5 → 🟠 aggressive (low cap)
 *   ratio 5-10 → 🟡 standard
 *   ratio >= 10 → 🟢 founder-friendly (high cap)
 */
export function dealHealth(capToInvestmentRatio: number): {
  emoji: string;
  label: string;
} {
  if (capToInvestmentRatio < 5)
    return { emoji: '🟠', label: 'low cap — aggressive for founder' };
  if (capToInvestmentRatio <= 10)
    return { emoji: '🟡', label: 'standard cap' };
  return { emoji: '🟢', label: 'founder-friendly cap' };
}

/**
 * Discount assessment.
 *   0% → 🟢 no discount (post-money standard)
 *   1-15% → 🟡 moderate
 *   16-25% → 🟠 high
 *   > 25% → 🔴 very high
 */
export function discountHealth(discountRatePercent: number): {
  emoji: string;
  label: string;
} {
  if (discountRatePercent === 0)
    return { emoji: '🟢', label: 'no discount (post-money standard)' };
  if (discountRatePercent <= 15)
    return { emoji: '🟡', label: 'moderate discount' };
  if (discountRatePercent <= 25)
    return { emoji: '🟠', label: 'high discount' };
  return { emoji: '🔴', label: 'very high discount — unusual' };
}

/**
 * SAFE type label for display.
 */
export function safeType(
  postMoneyCap: number,
  discountRatePercent: number,
): string {
  if (postMoneyCap > 0 && discountRatePercent === 0)
    return 'Post-Money SAFE (YC Standard)';
  if (postMoneyCap > 0 && discountRatePercent > 0)
    return 'Post-Money SAFE with Discount';
  if (postMoneyCap <= 0 && discountRatePercent > 0)
    return 'Discount-Only SAFE (Pre-Conversion)';
  return 'Custom SAFE';
}

// ============== calculate() ==============

function calculateSafe(inputs: Record<string, string>): string[] {
  const investment = clampNonNegative(parseFloat(inputs.investmentAmount) || 0);
  const postMoneyCap = clampNonNegative(parseFloat(inputs.postMoneyCap) || 0);
  const discountRate = clampNonNegative(parseFloat(inputs.discountRate) || 0);
  const existingShares = clampNonNegative(parseFloat(inputs.existingShares) || 0);
  const nextRoundValuation = clampNonNegative(parseFloat(inputs.nextRoundValuation) || 0);

  // Edge case: cap must exceed investment
  if (postMoneyCap > 0 && postMoneyCap <= investment) {
    return [
      '⏰ SAFE / Convertible Note Calculator\n\n' +
        '💰 The post-money cap ($' +
        postMoneyCap.toLocaleString() +
        ') must exceed the investment amount ($' +
        investment.toLocaleString() +
        '). A SAFE cannot have a cap lower than the investment it represents.',
    ];
  }
  if (investment <= 0 || postMoneyCap <= 0 || existingShares <= 0) {
    return [
      '⏰ SAFE / Convertible Note Calculator\n\n' +
        '💰 Enter investment amount, post-money cap, and existing fully diluted shares to see SAFE conversion mechanics.',
    ];
  }

  // Core math
  const effectivePreMoney = postMoneyCap - investment;
  const cp = capPrice(postMoneyCap, effectivePreMoney, existingShares);
  const dp = discountPrice(
    nextRoundValuation > 0 ? nextRoundValuation : postMoneyCap,
    existingShares,
    discountRate,
  );
  const cvp = conversionPrice(cp, dp);
  const safeShares = investment / cvp;
  const own = safeOwnership(safeShares, existingShares);
  const existingOwn = 1 - own;
  const capToInvestmentRatio = postMoneyCap / investment;
  const dh = dealHealth(capToInvestmentRatio);
  const dish = discountHealth(discountRate);
  const type = safeType(postMoneyCap, discountRate);

  // Format helpers
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const money = (n: number) => '$' + fmt(n);
  const money2 = (n: number) => '$' + n.toFixed(2);
  const pct = (n: number) => (n * 100).toFixed(1) + '%';
  const shares = (n: number) => Math.round(n).toLocaleString('en-US');

  // Ownership pie chart (20 chars wide)
  const safeBars = Math.round(own * 20);
  const existingBars = 20 - safeBars;
  const pieChart =
    '▓'.repeat(existingBars) +
    '░'.repeat(safeBars) +
    '  Existing ' +
    pct(existingOwn) +
    '  |  SAFE ' +
    pct(own);

  // Effective post-money at conversion
  const effectivePostMoney = cvp * (existingShares + safeShares);
  const capGoverns = cvp === cp;

  // What-If scenarios
  // 1. Double the SAFE ($1M instead of $500K)
  const doubleShares = safeSharesAtCap(investment * 2, postMoneyCap, existingShares);
  const doubleOwn = safeOwnership(doubleShares, existingShares);
  // 2. Lower cap to 6:1 ratio
  const lowerCap = investment * 6;
  const lowerCapShares =
    lowerCap > investment ? safeSharesAtCap(investment, lowerCap, existingShares) : 0;
  const lowerCapOwn =
    lowerCap > investment ? safeOwnership(lowerCapShares, existingShares) : 0;
  // 3. Add 20% discount
  const withDiscountCvp = conversionPrice(
    cp,
    discountPrice(postMoneyCap, existingShares, 20),
  );
  const withDiscountShares = investment / withDiscountCvp;
  const withDiscountOwn = safeOwnership(withDiscountShares, existingShares);
  // 4. No cap (cap = $100M, effectively capless)
  const noCapShares = safeSharesAtCap(investment, 100000000, existingShares);
  const noCapOwn = safeOwnership(noCapShares, existingShares);
  // 5. Stack with prior $250K SAFE at $4M cap
  const priorSafeShares = safeSharesAtCap(250000, 4000000, existingShares);
  const stackedShares = priorSafeShares + safeShares;
  const stackedOwn = safeOwnership(stackedShares, existingShares);

  // Tip selection
  let tip: string;
  if (discountRate === 0) {
    tip =
      '💡 Tip: Post-money SAFE (YC standard) protects founders by fixing SAFE holder’s post-money % at conversion. Avoid pre-money SAFE with discount unless investor is strategic.';
  } else if (discountRate > 15 && capToInvestmentRatio < 8) {
    tip =
      '💡 Tip: Aggressive terms: low cap + high discount = double protection for investor. Push back on discount if cap is already low.';
  } else if (existingOwn < 0.5) {
    tip =
      '💡 Tip: Heavy dilution ahead. Consider raising smaller, increasing your cap, or negotiating a higher cap with investor.';
  } else {
    tip =
      '💡 Tip: Standard terms: $5M post-money cap on $500K raise → ~10% dilution. If investor asks for >20% discount, that’s a red flag. Pro-rata rights are negotiable but rarely granted at SAFE stage.';
  }

  const r =
    '⏰ SAFE / Convertible Note Calculator\n\n' +
    '💰 Deal Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Investment:          ' +
    money(investment) +
    '\n' +
    '• Post-Money Cap:      ' +
    money(postMoneyCap) +
    '\n' +
    '• Discount Rate:       ' +
    discountRate +
    '%\n' +
    '• Effective Pre-Money: ' +
    money(effectivePreMoney) +
    '  (cap − investment)\n' +
    '• SAFE Type:           ' +
    type +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Conversion Mechanics:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Cap Price:           ' +
    money2(cp) +
    ' per share  (post-money cap / (existing + SAFE shares))\n' +
    (discountRate > 0
      ? '• Discount Price:      ' +
        money2(dp) +
        ' per share  (next round × (1 − discount))\n'
      : '• Discount Price:      n/a (no discount)\n') +
    '• Conversion Price:    ' +
    money2(cvp) +
    ' per share  ← ' +
    (capGoverns ? 'CAP GOVERNS' : 'DISCOUNT GOVERNS') +
    '\n' +
    '• Shares Issued:       ' +
    shares(safeShares) +
    '  (' +
    money(investment) +
    ' ÷ ' +
    money2(cvp) +
    ')\n' +
    '• SAFE Ownership:      ' +
    pct(own) +
    ' at conversion\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Deal Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' +
    dh.emoji +
    ' ' +
    dh.label +
    ' (cap is ' +
    capToInvestmentRatio.toFixed(1) +
    '× investment)\n' +
    '• ' +
    dish.emoji +
    ' ' +
    dish.label +
    '\n' +
    '• Conversion trigger:  whichever is lower (cap or discount) at next priced round\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Ownership Outcomes:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Existing Pool (founder + prior investors + options):\n' +
    '    pre-SAFE:  100.0%  (' +
    shares(existingShares) +
    ' shares)\n' +
    '    post-SAFE: ' +
    pct(existingOwn) +
    '  (' +
    shares(existingShares) +
    ' of ' +
    shares(existingShares + safeShares) +
    ' shares)\n' +
    '• SAFE Holder: ' +
    pct(own) +
    '  (' +
    shares(safeShares) +
    ' shares at conversion)\n' +
    '• Pie: ' +
    pieChart +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Dilution Analysis:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Existing pool dilution: −' +
    pct(own) +
    '  (from 100% to ' +
    pct(existingOwn) +
    ')\n' +
    '• SAFE-as-%-of-post: ' +
    pct(own) +
    '\n' +
    '• Effective post-money at conversion: ' +
    money(effectivePostMoney) +
    '  (' +
    (capGoverns ? 'cap governs' : 'discount governs') +
    ')\n' +
    '• Cap sensitivity: at 2× cap ($' +
    fmt(postMoneyCap * 2) +
    '), SAFE holder would get ' +
    pct(safeOwnership(safeSharesAtCap(investment, postMoneyCap * 2, existingShares), existingShares)) +
    ' instead of ' +
    pct(own) +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Double the SAFE ($' +
    fmt(investment * 2) +
    '):            existing pool drops to ' +
    pct(1 - doubleOwn) +
    ', SAFE holder rises to ' +
    pct(doubleOwn) +
    '\n' +
    '• Lower cap to $' +
    fmt(lowerCap) +
    ':                SAFE holder gets ' +
    pct(lowerCapOwn) +
    ', existing pool drops to ' +
    pct(1 - lowerCapOwn) +
    '\n' +
    '• Add 20% discount:                conversion at ' +
    money2(withDiscountCvp) +
    ' per share, SAFE holder gets ' +
    pct(withDiscountOwn) +
    '\n' +
    '• No cap (cap = $100M):            effectively discount-only, SAFE holder gets ' +
    pct(noCapOwn) +
    '\n' +
    '• Stack with prior $250K SAFE at $4M cap: cumulative SAFE ownership ' +
    pct(stackedOwn) +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip;

  const results: string[] = [r];

  // SEO long-tail comparison rows at 5 different cap levels
  const caps = [1000000, 3000000, 5000000, 10000000, 20000000];
  for (let idx = 0; idx < caps.length; idx++) {
    const c1 = caps[idx];
    const s1 = safeSharesAtCap(investment, c1, existingShares);
    const o1 = safeOwnership(s1, existingShares);
    results.push(
      'Comparison: $' +
        fmt(c1) +
        ' cap on $' +
        fmt(investment) +
        ' SAFE → SAFE holder gets ' +
        pct(o1) +
        ' (' +
        shares(s1) +
        ' shares)',
    );
  }

  return results;
}

// ============== customFn ==============

const customFn =
  "function sShares(i,c,e){var ep=c-i;if(ep<=0||e<=0)return 0;return i*e/ep;}" +
  "function cpFn(c,ep,e){if(ep<=0||e<=0)return 0;return ep/e;}" +
  "function dpFn(nr,e,dr){if(nr<=0||e<=0)return Infinity;return nr/e*(1-dr/100);}" +
  "function cvpFn(c,d){return Math.min(c,d);}" +
  "function ownFn(s,e){var t=e+s;if(t<=0)return 0;return s/t;}" +
  "function dhFn(r){if(r<5)return{e:'\\uD83D\\uDFE0',l:'low cap \\u2014 aggressive for founder'};if(r<=10)return{e:'\\uD83D\\uDCA1',l:'standard cap'};return{e:'\\uD83D\\uDFE2',l:'founder-friendly cap'};}" +
  "function dishFn(d){if(d===0)return{e:'\\uD83D\\uDFE2',l:'no discount (post-money standard)'};if(d<=15)return{e:'\\uD83D\\uDCA1',l:'moderate discount'};if(d<=25)return{e:'\\uD83D\\uDFE0',l:'high discount'};return{e:'\\uD83D\\uDD34',l:'very high discount \\u2014 unusual'};}" +
  "function typeFn(c,d){if(c>0&&d===0)return'Post-Money SAFE (YC Standard)';if(c>0&&d>0)return'Post-Money SAFE with Discount';if(c<=0&&d>0)return'Discount-Only SAFE (Pre-Conversion)';return'Custom SAFE';}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var i=cnn(parseFloat(inputs.investmentAmount)||0);" +
  "var c=cnn(parseFloat(inputs.postMoneyCap)||0);" +
  "var d=cnn(parseFloat(inputs.discountRate)||0);" +
  "var e=cnn(parseFloat(inputs.existingShares)||0);" +
  "var nr=cnn(parseFloat(inputs.nextRoundValuation)||0);" +
  "if(c>0&&c<=i){return['\\u23F0 SAFE / Convertible Note Calculator\\n\\n\\uD83D\\uDCB0 The post-money cap ($'+c.toLocaleString()+') must exceed the investment amount ($'+i.toLocaleString()+'). A SAFE cannot have a cap lower than the investment it represents.'];}" +
  "if(i<=0||c<=0||e<=0){return['\\u23F0 SAFE / Convertible Note Calculator\\n\\n\\uD83D\\uDCB0 Enter investment amount, post-money cap, and existing fully diluted shares to see SAFE conversion mechanics.'];}" +
  "var ep=c-i;" +
  "var cp=cpFn(c,ep,e);" +
  "var dp=dpFn(nr>0?nr:c,e,d);" +
  "var cvp=cvpFn(cp,dp);" +
  "var sShares1=i/cvp;" +
  "var own=ownFn(sShares1,e);" +
  "var eOwn=1-own;" +
  "var r=c/i;" +
  "var dh=dhFn(r);" +
  "var dish=dishFn(d);" +
  "var type=typeFn(c,d);" +
  "function fmt(n){return n.toLocaleString('en-US',{maximumFractionDigits:0});}" +
  "function money(n){return'$'+fmt(n);}" +
  "function money2(n){return'$'+n.toFixed(2);}" +
  "function pct(n){return(n*100).toFixed(1)+'%';}" +
  "function shares(n){return Math.round(n).toLocaleString('en-US');}" +
  "var sb=Math.round(own*20);" +
  "var eb=20-sb;" +
  "var pie='\\u2593'.repeat(eb)+'\\u2591'.repeat(sb)+'  Existing '+pct(eOwn)+'  |  SAFE '+pct(own);" +
  "var effPost=cvp*(e+sShares1);" +
  "var capGov=cvp===cp;" +
  "var dblSh=sShares(i*2,c,e);" +
  "var dblOwn=ownFn(dblSh,e);" +
  "var lc=i*6;" +
  "var lcSh=lc>i?sShares(i,lc,e):0;" +
  "var lcOwn=lc>i?ownFn(lcSh,e):0;" +
  "var wdcvp=cvpFn(cp,dpFn(c,e,20));" +
  "var wdSh=i/wdcvp;" +
  "var wdOwn=ownFn(wdSh,e);" +
  "var ncSh=sShares(i,100000000,e);" +
  "var ncOwn=ownFn(ncSh,e);" +
  "var prSh=sShares(250000,4000000,e);" +
  "var stSh=prSh+sShares1;" +
  "var stOwn=ownFn(stSh,e);" +
  "var tip='';" +
  "if(d===0)tip='\\uD83D\\uDCA1 Tip: Post-money SAFE (YC standard) protects founders by fixing SAFE holder\\u2019s post-money % at conversion. Avoid pre-money SAFE with discount unless investor is strategic.';" +
  "else if(d>15&&r<8)tip='\\uD83D\\uDCA1 Tip: Aggressive terms: low cap + high discount = double protection for investor. Push back on discount if cap is already low.';" +
  "else if(eOwn<0.5)tip='\\uD83D\\uDCA1 Tip: Heavy dilution ahead. Consider raising smaller, increasing your cap, or negotiating a higher cap with investor.';" +
  "else tip='\\uD83D\\uDCA1 Tip: Standard terms: $5M post-money cap on $500K raise \\u2192 ~10% dilution. If investor asks for >20% discount, that\\u2019s a red flag. Pro-rata rights are negotiable but rarely granted at SAFE stage.';" +
  "var r2='';" +
  "r2+='\\u23F0 SAFE / Convertible Note Calculator\\n\\n';" +
  "r2+='\\uD83D\\uDCB0 Deal Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Investment:          '+money(i)+'\\n';" +
  "r2+='\\u2022 Post-Money Cap:      '+money(c)+'\\n';" +
  "r2+='\\u2022 Discount Rate:       '+d+'%\\n';" +
  "r2+='\\u2022 Effective Pre-Money: '+money(ep)+'  (cap \\u2212 investment)\\n';" +
  "r2+='\\u2022 SAFE Type:           '+type+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCD0 Conversion Mechanics:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Cap Price:           '+money2(cp)+' per share  (post-money cap / (existing + SAFE shares))\\n';" +
  "if(d>0)r2+='\\u2022 Discount Price:      '+money2(dp)+' per share  (next round \\u00d7 (1 \\u2212 discount))\\n';" +
  "else r2+='\\u2022 Discount Price:      n/a (no discount)\\n';" +
  "r2+='\\u2022 Conversion Price:    '+money2(cvp)+' per share  \\u2190 '+(capGov?'CAP GOVERNS':'DISCOUNT GOVERNS')+'\\n';" +
  "r2+='\\u2022 Shares Issued:       '+shares(sShares1)+'  ('+money(i)+' \\u00f7 '+money2(cvp)+')\\n';" +
  "r2+='\\u2022 SAFE Ownership:      '+pct(own)+' at conversion\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Deal Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+dh.e+' '+dh.l+' (cap is '+r.toFixed(1)+'\\u00d7 investment)\\n';" +
  "r2+='\\u2022 '+dish.e+' '+dish.l+'\\n';" +
  "r2+='\\u2022 Conversion trigger:  whichever is lower (cap or discount) at next priced round\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Ownership Outcomes:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Existing Pool (founder + prior investors + options):\\n';" +
  "r2+='    pre-SAFE:  100.0%  ('+shares(e)+' shares)\\n';" +
  "r2+='    post-SAFE: '+pct(eOwn)+'  ('+shares(e)+' of '+shares(e+sShares1)+' shares)\\n';" +
  "r2+='\\u2022 SAFE Holder: '+pct(own)+'  ('+shares(sShares1)+' shares at conversion)\\n';" +
  "r2+='\\u2022 Pie: '+pie+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Dilution Analysis:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Existing pool dilution: \\u2212'+pct(own)+'  (from 100% to '+pct(eOwn)+')\\n';" +
  "r2+='\\u2022 SAFE-as-%-of-post: '+pct(own)+'\\n';" +
  "r2+='\\u2022 Effective post-money at conversion: '+money(effPost)+'  ('+(capGov?'cap governs':'discount governs')+')\\n';" +
  "r2+='\\u2022 Cap sensitivity: at 2\\u00d7 cap ($'+fmt(c*2)+'), SAFE holder would get '+pct(ownFn(sShares(i,c*2,e),e))+' instead of '+pct(own)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If Scenarios:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Double the SAFE ($'+fmt(i*2)+'):            existing pool drops to '+pct(1-dblOwn)+', SAFE holder rises to '+pct(dblOwn)+'\\n';" +
  "r2+='\\u2022 Lower cap to $'+fmt(lc)+':                SAFE holder gets '+pct(lcOwn)+', existing pool drops to '+pct(1-lcOwn)+'\\n';" +
  "r2+='\\u2022 Add 20% discount:                conversion at '+money2(wdcvp)+' per share, SAFE holder gets '+pct(wdOwn)+'\\n';" +
  "r2+='\\u2022 No cap (cap = $100M):            effectively discount-only, SAFE holder gets '+pct(ncOwn)+'\\n';" +
  "r2+='\\u2022 Stack with prior $250K SAFE at $4M cap: cumulative SAFE ownership '+pct(stOwn)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=tip;" +
  "var results=[r2];" +
  "var caps=[1000000,3000000,5000000,10000000,20000000];" +
  "for(var j=0;j<caps.length;j++){var cj=caps[j];var sj=sShares(i,cj,e);var oj=ownFn(sj,e);results.push('Comparison: $'+fmt(cj)+' cap on $'+fmt(i)+' SAFE \\u2192 SAFE holder gets '+pct(oj)+' ('+shares(sj)+' shares)');}" +
  "return results;";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-safe-convertible-note-calculator',
  title: 'SAFE / Convertible Note Calculator',
  description:
    'Model your SAFE (Simple Agreement for Future Equity) round. See how valuation cap and discount rate interact, what ownership % the SAFE investor gets at conversion, and how much existing shareholders are diluted. Covers YC post-money SAFE, pre-money SAFE with discount, and discount-only structures.',
  inputs: [
    {
      name: 'investmentAmount',
      label: 'Investment Amount ($)',
      placeholder: 'e.g. 500000',
      type: 'number',
    },
    {
      name: 'postMoneyCap',
      label: 'Post-Money Valuation Cap ($)',
      placeholder: 'e.g. 5000000',
      type: 'number',
    },
    {
      name: 'discountRate',
      label: 'Discount Rate (%)',
      placeholder: 'e.g. 0 or 20',
      type: 'number',
    },
    {
      name: 'existingShares',
      label: 'Existing Fully Diluted Shares',
      placeholder: 'e.g. 1000000',
      type: 'number',
    },
    {
      name: 'nextRoundValuation',
      label: 'Expected Next Round Valuation ($)',
      placeholder: 'e.g. 5000000',
      type: 'number',
    },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs: Record<string, string>): string[] {
    return calculateSafe(inputs);
  },
  staticExamples: ['⏰ SAFE / Convertible Note Calculator\n\n💰 Deal Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Investment:          $500,000\n• Post-Money Cap:      $5,000,000\n• Discount Rate:       0%\n• Effective Pre-Money: $4,500,000  (cap − investment)\n• SAFE Type:           Post-Money SAFE (YC Standard)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Conversion Mechanics:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Cap Price:           $4.50 per share  (post-money cap / (existing + SAFE shares))\n• Discount Price:      n/a (no discount)\n• Conversion Price:    $4.50 per share  ← CAP GOVERNS\n• Shares Issued:       111,111  ($500,000 ÷ $4.50)\n• SAFE Ownership:      10.0% at conversion\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Deal Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 standard cap (cap is 10.0× investment)\n• 🟢 no discount (post-money standard)\n• Conversion trigger:  whichever is lower (cap or discount) at next priced round\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Ownership Outcomes:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Existing Pool (founder + prior investors + options):\n    pre-SAFE:  100.0%  (1,000,000 shares)\n    post-SAFE: 90.0%  (1,000,000 of 1,111,111 shares)\n• SAFE Holder: 10.0%  (111,111 shares at conversion)\n• Pie: ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░  Existing 90.0%  |  SAFE 10.0%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Dilution Analysis:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Existing pool dilution: −10.0%  (from 100% to 90.0%)\n• SAFE-as-%-of-post: 10.0%\n• Effective post-money at conversion: $5,000,000  (cap governs)\n• Cap sensitivity: at 2× cap ($10,000,000), SAFE holder would get 5.0% instead of 10.0%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Double the SAFE ($1,000,000):            existing pool drops to 80.0%, SAFE holder rises to 20.0%\n• Lower cap to $3,000,000:                SAFE holder gets 16.7%, existing pool drops to 83.3%\n• Add 20% discount:                conversion at $4.00 per share, SAFE holder gets 11.1%\n• No cap (cap = $100M):            effectively discount-only, SAFE holder gets 0.5%\n• Stack with prior $250K SAFE at $4M cap: cumulative SAFE ownership 15.1%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: Post-money SAFE (YC standard) protects founders by fixing SAFE holder’s post-money % at conversion. Avoid pre-money SAFE with discount unless investor is strategic.\nComparison: $1,000,000 cap on $500,000 SAFE → SAFE holder gets 50.0% (1,000,000 shares)\nComparison: $3,000,000 cap on $500,000 SAFE → SAFE holder gets 16.7% (200,000 shares)\nComparison: $5,000,000 cap on $500,000 SAFE → SAFE holder gets 10.0% (111,111 shares)\nComparison: $10,000,000 cap on $500,000 SAFE → SAFE holder gets 5.0% (52,632 shares)\nComparison: $20,000,000 cap on $500,000 SAFE → SAFE holder gets 2.5% (25,641 shares)'],
  faq: [
    {
      q: 'What is a SAFE and how does conversion work?',
      a: 'A SAFE (Simple Agreement for Future Equity) is Y Combinator’s standardized contract for early-stage startup funding. Unlike a priced round, a SAFE has no fixed share price at signing — instead, it converts to equity at a future priced round. The conversion price is the lower of two values: the valuation cap price (a discount to the cap) or the discount price (a discount to the next round). For a $500K SAFE on a $5M cap with 1M existing shares, the SAFE holder gets ~10% at conversion (post-money SAFE convention, YC standard since 2018).',
    },
    {
      q: 'What is the difference between pre-money and post-money SAFE?',
      a: 'Pre-money SAFE (YC’s older form, pre-2018): the cap refers to pre-money valuation, so the SAFE holder’s ownership at conversion depends on the size of the priced round — bigger rounds = more dilution for SAFE holder. Post-money SAFE (YC standard since 2018): the cap refers to post-money valuation, so the SAFE holder’s % is fixed at conversion. For founders, post-money SAFE is dramatically better because the math is predictable. Always use post-money SAFE unless the investor is strategic and willing to negotiate the discount differently.',
    },
    {
      q: 'How does the discount rate interact with the cap?',
      a: 'A SAFE typically has both a valuation cap (e.g., $5M) and a discount rate (e.g., 20%). At conversion, the SAFE holder gets the lower of: (1) the cap price = cap / total fully diluted shares, or (2) the discount price = next round price per share × (1 - discount). Example: $5M cap, 20% discount, next round at $10M → cap price = $4.50/share, discount price = $8.00/share, SAFE converts at $4.50 (cap wins). But if next round is at $5M → cap price $4.50, discount price $4.00, SAFE converts at $4.00 (discount wins).',
    },
    {
      q: 'What is MFN (Most Favored Nation) in a SAFE?',
      a: 'MFN is a clause that gives the SAFE holder the right to upgrade to better terms if you issue a subsequent SAFE with more favorable terms (lower cap, higher discount, or other sweeteners). MFN is common for early SAFEs to protect the first investor from being penalized for being early. The downside for founders: each new SAFE with MFN can create a chain of upgrades that erodes your future flexibility. Most YC post-money SAFEs don’t include MFN by default — only add it if the investor is a strategic anchor.',
    },
    {
      q: 'When does a SAFE convert and what triggers it?',
      a: 'A SAFE converts at a "liquidity event" — most commonly a priced equity round (Series Seed, Series A, etc.) where the company issues preferred stock to new investors. At conversion, the SAFE holder’s investment is converted to shares at the conversion price (min of cap and discount). Other less common triggers: an IPO, an acquisition (change of control), or the maturity date (typically 10 years after issuance — rarely reached in practice). Note: SAFEs do not accrue interest (unlike convertible notes), so the investment amount at conversion is exactly what was originally invested.',
    },
    { q: "What is a SAFE (Simple Agreement for Future Equity)?", a: "SAFE = Simple Agreement for Future Equity. Created by Y Combinator. Investor gives money now, gets equity later (when priced round happens). No interest, no maturity date. Discount: 10-30% off next round price. Valuation cap: max valuation to convert at. MFN: most-favored-nation (gets best terms). Most: 70-80% of seed rounds use SAFEs. Cheaper, faster than priced rounds. Most common: post-money SAFE (YC standard)." },
    { q: "How is a SAFE different from a convertible note?", a: "SAFE: not a debt (no interest, no maturity). Convertible note: debt that converts (has interest, maturity date). For founder: SAFE is better (no debt on books, no maturity pressure). For investor: convertible note has more protections (interest, maturity, senior). Most: SAFE is preferred for early-stage. Use convertible: when investor wants debt-like protection. Most rounds: SAFE. Most: 80%+ of seed rounds now use SAFEs." },
    { q: "What is a valuation cap?", a: "Valuation cap: max valuation at which SAFE converts. For SAFE at $5M cap: investor converts at min of (cap or next round price). If next round is $10M valuation: investor gets $5M valuation. If next round is $3M: investor gets $3M (no benefit). Cap protects investors from high-valuation rounds. Founder-friendly: higher cap. Investor-friendly: lower cap. Most: 1.5-3x current valuation. Trade-off." },
    { q: "What is a discount rate?", a: "Discount: % off next round price. For 20% discount: investor gets shares at 80% of next round price. Combined with cap: investor gets min of (cap or discounted price). Most: 15-25% discount. Common: 20%. For very early: 20-30%. For later: 10-20%. Most: discount + cap is standard. Cap is more important. Most investors: cap is non-negotiable. Discount: less important. Cap drives the economics." },
    { q: "How does a SAFE convert at a priced round?", a: "At priced round: SAFE converts to equity. Calculation: investment / conversion_price. Conversion price = min(price based on cap, price based on discount). For $500K SAFE at $5M cap, 20% discount, $10M priced: 1) Cap: 500K/5M = 10%, 2) Discount: 500K/(10M × 0.8) = 6.25%, 3) Investor gets 10% (cap). Founder dilution: 10% from SAFE. Most: cap is the floor. Discount only matters if no cap or cap is very high." },
    { q: "What is MFN (Most Favored Nation)?", a: "MFN: SAFE gets best terms of any future SAFE. For first SAFE without MFN, second SAFE with better terms: first SAFE still has original terms. With MFN: first SAFE gets the better terms. Most: MFN is investor-friendly. Most SAFEs: include MFN. YC: standard MFN. Trade-off: founder-friendly to exclude (later SAFEs get worse terms). Most: MFN is standard. Avoid: no MFN (later SAFEs will demand it anyway)." },
    { q: "How much equity does a $500K SAFE at $5M cap give?", a: "Calculate: $500K / $5M cap = 10% of post-money. But: post-money SAFE includes the SAFE itself. For $500K SAFE at $5M cap, $5M round: 1) Post-money = $5M, 2) SAFE = 10%, 3) New investor at $5M post-money = $5M-$500K = $4.5M for new = same 10% if $4.5M price. For YC post-money SAFE: SAFE ownership = investment / cap. So 10% from SAFE. Most: 10% for $500K SAFE at $5M cap. Most: aim for 10-25% dilution per round." },
    { q: "What is the post-money SAFE vs pre-money SAFE?", a: "Pre-money SAFE: cap = pre-money valuation (excludes SAFE). YC post-money SAFE: cap = post-money valuation (includes SAFE). Pre-money: founder-friendly, hard to model. Post-money: investor-friendly, easy to model. Most: post-money SAFE is YC standard (since 2018). For $5M cap post-money: SAFE = 10% immediately. For pre-money $5M: SAFE = 9% (5M/5.5M). Most: 90%+ of SAFEs are now post-money. Use YC standard." },
  ],
  howToUse: [
    'Enter the SAFE investment amount (e.g., $500,000).',
    'Set the post-money valuation cap (e.g., $5,000,000 for a typical seed round).',
    'Enter the discount rate (0% for standard post-money SAFE, 20% for pre-money SAFE).',
    'Enter your existing fully diluted shares (founder + prior investors + option pool).',
    'Set the expected next round valuation (default = cap; adjust if you expect a different round size).',
    'Review the conversion mechanics, deal health, and ownership outcomes.',
    'Check the 5 what-if scenarios for sensitivity analysis (double SAFE, lower cap, etc.).',
  ],
  engineKey: true,
};

registerEngine(engine);
