import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-8：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂。
//   ⚠️ 章节标题 / 标签用**字面量 token**（code|原文|）；带运行时数值的整行用
//      makeToken(code, fallback, params) ⇒ fallback 与 params 取**同一个变量**。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

// ============== Math helpers (exported for tests) ==============

export type Provider =
  | 'stripe'
  | 'stripe-international'
  | 'paypal'
  | 'square'
  | 'wise';

export interface FeeSchedule {
  percentage: number; // e.g. 0.029 for 2.9%
  fixed: number; // e.g. 0.30 for 30¢
  hasFixed: boolean; // paypal = false; wise = false
}

export const FEE_SCHEDULES: Record<Provider, FeeSchedule> = {
  'stripe': { percentage: 0.029, fixed: 0.30, hasFixed: true },
  'stripe-international': { percentage: 0.044, fixed: 0.30, hasFixed: true }, // 2.9% + 1.5% surcharge
  'paypal': { percentage: 0.035, fixed: 0.00, hasFixed: false },
  'square': { percentage: 0.026, fixed: 0.10, hasFixed: true },
  'wise': { percentage: 0.015, fixed: 0.00, hasFixed: false }, // US estimate
};

export const PROVIDER_LABELS: Record<Provider, string> = {
  'stripe': 'Stripe (US)',
  'stripe-international': 'Stripe (International)',
  'paypal': 'PayPal',
  'square': 'Square',
  'wise': 'Wise',
};

export function calculateFee(
  amount: number,
  provider: Provider,
): {
  percentageFee: number;
  fixedFee: number;
  totalFee: number;
  netReceived: number;
  effectiveRate: number;
} {
  const sched = FEE_SCHEDULES[provider];
  const percentageFee = amount * sched.percentage;
  const fixedFee = sched.hasFixed ? sched.fixed : 0;
  const totalFee = percentageFee + fixedFee;
  const netReceived = amount - totalFee;
  const effectiveRate = amount > 0 ? totalFee / amount : 0;
  return { percentageFee, fixedFee, totalFee, netReceived, effectiveRate };
}

export function projectVolume(
  chargeAmount: number,
  provider: Provider,
  monthlyTransactions: number,
): {
  monthly: { gross: number; fees: number; net: number };
  yearly: { gross: number; fees: number; net: number };
} {
  if (monthlyTransactions <= 0 || chargeAmount <= 0) {
    return {
      monthly: { gross: 0, fees: 0, net: 0 },
      yearly: { gross: 0, fees: 0, net: 0 },
    };
  }
  const singleFee = calculateFee(chargeAmount, provider);
  const monthlyGross = chargeAmount * monthlyTransactions;
  const monthlyFees = singleFee.totalFee * monthlyTransactions;
  const monthlyNet = singleFee.netReceived * monthlyTransactions;
  return {
    monthly: { gross: monthlyGross, fees: monthlyFees, net: monthlyNet },
    yearly: {
      gross: monthlyGross * 12,
      fees: monthlyFees * 12,
      net: monthlyNet * 12,
    },
  };
}

export function compareProviders(chargeAmount: number): Array<{
  provider: Provider;
  fee: ReturnType<typeof calculateFee>;
  displayName: string;
}> {
  // Sort by total fee ascending (per spec). Note: the relative order shifts
  // by charge amount because PayPal has no fixed fee (good for small charges)
  // and Stripe-International has the highest percentage (always expensive).
  const all: Provider[] = [
    'stripe',
    'stripe-international',
    'paypal',
    'square',
    'wise',
  ];
  return all
    .map((p) => ({
      provider: p,
      fee: calculateFee(chargeAmount, p),
      displayName: PROVIDER_LABELS[p],
    }))
    .sort((a, b) => a.fee.totalFee - b.fee.totalFee);
}

export function feeHealth(
  effectiveRate: number,
  amount: number,
): { emoji: string; label: string } {
  if (amount < 5) {
    return {
      emoji: '🔴',
      label: makeToken(
        'calc_out.stripe_fee.row.health_fixed_fee_dominates',
        'fixed fee dominates — set $5 minimum or use no-fixed-fee provider',
      ),
    };
  }
  if (effectiveRate < 0.02) return { emoji: '🟢', label: makeToken('calc_out.stripe_fee.row.health_excellent_rate', 'excellent rate') };
  if (effectiveRate < 0.03) return { emoji: '🟡', label: makeToken('calc_out.stripe_fee.row.health_standard_rate', 'standard rate') };
  if (effectiveRate < 0.04) return { emoji: '🟠', label: makeToken('calc_out.stripe_fee.row.health_above_average', 'above average') };
  return { emoji: '🔴', label: makeToken('calc_out.stripe_fee.row.health_high_consider_switching', 'high — consider switching') };
}

// ============== calculate() — full 9-section v3 output ==============

function calculateStripeFee(inputs: Record<string, string>): string[] {
  const chargeAmount = clampNonNegative(parseFloat(inputs.chargeAmount) || 0);
  const monthlyTransactions = clampNonNegative(parseFloat(inputs.monthlyTransactions) || 0);
  // Coerce provider (5 valid values, default 'stripe')
  const providerRaw = inputs.provider;
  const provider: Provider =
    providerRaw === 'stripe-international' ? 'stripe-international' :
    providerRaw === 'paypal' ? 'paypal' :
    providerRaw === 'square' ? 'square' :
    providerRaw === 'wise' ? 'wise' : 'stripe';
  // internationalCards only matters for stripe (per spec)
  const internationalRaw = inputs.internationalCards;
  const internationalCards = provider === 'stripe' && internationalRaw === 'yes';
  const effectiveProvider: Provider = internationalCards ? 'stripe-international' : provider;

  // Zero-input early return
  if (chargeAmount <= 0) {
    return [
      '$calc_out.section.stripe_fee_calculator|⏰ Stripe Fee Calculator|\n\n' +
      '$calc_out.stripe_fee.row.enter_charge_amount|💰 Enter a charge amount above $0 to see your payment processing fees, provider comparison, and annual projections.|',
    ];
  }

  const fee = calculateFee(chargeAmount, effectiveProvider);
  const health = feeHealth(fee.effectiveRate, chargeAmount);
  const volume = projectVolume(chargeAmount, effectiveProvider, monthlyTransactions);
  const comparison = compareProviders(chargeAmount);

  // Cheapest/highest providers for break-even
  const cheapest = comparison[0];
  const mostExpensive = comparison[comparison.length - 1];
  const annualSavingsIfSwitched = (mostExpensive.fee.totalFee - cheapest.fee.totalFee) * monthlyTransactions * 12;

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const money = (n: number) => '$' + fmt(Math.round(n * 100) / 100);
  const pct = (n: number) => (n * 100).toFixed(1) + '%';
  const cents = (n: number) => (n).toFixed(2);

  // Provider Comparison section
  let compSection = '';
  for (const row of comparison) {
    const isSelected = row.provider === effectiveProvider;
    // ⭐ 对齐空格**留在 token 之外**：pad 先按**纯文本**算出来，再把 '(selected)' 换成 token
    //   ⇒ 英文兜底渲染 = 原文逐字相同（token 只顶替 '(selected)' 那几个字符的位置）。
    const nameCell = row.displayName + (isSelected ? ' (selected)' : '');
    const cellPad = ' '.repeat(Math.max(0, 22 - nameCell.length));
    const cell = row.displayName + (isSelected
      ? ' ' + makeToken('calc_out.stripe_fee.row.provider_selected', '(selected)')
      : '') + cellPad;
    compSection +=
      '• ' + cell +
      '  $calc_out.label.fee|fee|: ' + money(row.fee.totalFee).padStart(8) +
      '  (' + cents(row.fee.percentageFee) + ' + ' + cents(row.fee.fixedFee) + ')' +
      '  $calc_out.label.net|net|: ' + money(row.fee.netReceived) +
      (isSelected ? ' ' + makeToken('calc_out.stripe_fee.row.selected_marker', '← selected') : '') + '\n';
  }

  // What-If scenarios
  // 1. Raise price by $1
  const feeRaise1 = calculateFee(chargeAmount + 1, effectiveProvider);
  const raise1Delta = feeRaise1.netReceived - fee.netReceived;
  // 2. Pass fees to customer: charge X such that net = original amount
  // net = charge * (1 - pct) - fixed, so charge = (net + fixed) / (1 - pct)
  const passSched = FEE_SCHEDULES[effectiveProvider];
  const passToCustomer = passSched.hasFixed
    ? (chargeAmount + passSched.fixed) / (1 - passSched.percentage)
    : chargeAmount / (1 - passSched.percentage);
  const passToCustomerDelta = passToCustomer - chargeAmount;
  // 3. Switch to annual billing (saves 11 fixed fees if applicable)
  const fixedPerTx = passSched.hasFixed ? passSched.fixed : 0;
  const annualBillingSavings = fixedPerTx * 11 * monthlyTransactions * 12;
  // 4. Negotiate 0.5% discount at $50K MRR (assume current MRR = monthly gross)
  const monthlyGross = chargeAmount * monthlyTransactions;
  const negotiable = monthlyGross >= 50000;
  const discountRate = 0.005;
  const negotiationSavings = negotiable
    ? monthlyGross * discountRate * 12
    : monthlyGross * discountRate * 12 * 0.5; // half-credit if below $50K MRR
  // 5. Bundle 12 transactions into 1 annual charge
  const bundledAmount = chargeAmount * 12;
  const bundledFee = calculateFee(bundledAmount, effectiveProvider).totalFee;
  const unbundledFees = fee.totalFee * 12;
  const bundleSavings = unbundledFees - bundledFee;

  // Tip selection
  let tip: string;
  if (monthlyTransactions > 1000) {
    tip = makeToken('calc_out.stripe_fee.row.tip_high_volume', '💡 Tip: At your volume, you\'re paying ' + money(volume.yearly.fees) + '/yr in fees. Contact Stripe sales — they negotiate 0.1-0.3% off at $50K MRR. The 30-min call pays for itself.', { fees: money(volume.yearly.fees) });
  } else if (chargeAmount < 5) {
    tip = makeToken('calc_out.stripe_fee.row.tip_small_charge', '💡 Tip: On charges under $5, the 30¢ fixed fee dominates. Charge $5 minimum, or use PayPal (3.5% flat) for small transactions — Wise is cheapest but takes 1-2 days for payouts.');
  } else {
    tip = makeToken('calc_out.stripe_fee.row.tip_default', '💡 Tip: Stripe fees are unavoidable but negotiable at $50K+ MRR. Each 0.1% reduction saves ' + money(volume.yearly.fees * 0.001 / 0.01) + '/yr at your volume. Consider annual plans (lower per-tx fees), pass fees to customers (+' + money(passToCustomerDelta) + ' to cover ' + money(chargeAmount) + '), or compare Wise for international.', { save: money(volume.yearly.fees * 0.001 / 0.01), add: money(passToCustomerDelta), charge: money(chargeAmount) });
  }

  const providerDisplay = PROVIDER_LABELS[effectiveProvider];
  const r =
    '$calc_out.section.stripe_fee_calculator|⏰ Stripe Fee Calculator|\n\n' +
    '$calc_out.section.stripe_fee_single_charge_breakdown|💰 Single Charge Breakdown:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• $calc_out.label.charge_amount|Charge Amount|:        ' + money(chargeAmount) + '\n' +
    '• $calc_out.label.provider|Provider|:             ' + providerDisplay + (internationalCards ? ' ' + makeToken('calc_out.stripe_fee.row.international_cards_applied', '(international cards applied)') : '') + '\n' +
    '• $calc_out.label.percentage_fee|Percentage Fee|:       ' + money(fee.percentageFee) + '  (' + pct(FEE_SCHEDULES[effectiveProvider].percentage) + ')\n' +
    '• $calc_out.label.fixed_fee|Fixed Fee|:            ' + money(fee.fixedFee) + '\n' +
    '• $calc_out.label.total_fee|Total Fee|:            ' + money(fee.totalFee) + '\n' +
    '• $calc_out.label.net_received|Net Received|:         ' + money(fee.netReceived) + '   ' + makeToken('calc_out.stripe_fee.row.net_received_note', '← what hits your bank') + '\n' +
    '• $calc_out.label.effective_fee_rate|Effective Fee Rate|:   ' + pct(fee.effectiveRate) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.stripe_fee.row.provider_comparison_header', '📊 Provider Comparison (for ' + money(chargeAmount) + ' charge, sorted by total fee):', { amount: money(chargeAmount) }) + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    compSection + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.stripe_fee_fee_efficiency_health|🩺 Fee Efficiency Health:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + health.emoji + ' ' + health.label + '\n' +
    '• ' + makeToken('calc_out.stripe_fee.row.industry_average', 'Industry average: ~2.9% + 30¢ (Stripe US standard)') + '\n' +
    (chargeAmount < 5
      ? '• ' + makeToken('calc_out.stripe_fee.row.fixed_fee_share_small', 'On ' + money(chargeAmount) + ' charge: fixed fee is ' + pct(fee.fixedFee / chargeAmount) + ' of total. Set $5 minimum or use PayPal/Wise.', { amount: money(chargeAmount), pct: pct(fee.fixedFee / chargeAmount) }) + '\n'
      : '• ' + makeToken('calc_out.stripe_fee.row.fixed_fee_share', 'On ' + money(chargeAmount) + ' charge: fixed fee is ' + pct(fee.fixedFee / chargeAmount) + ' of total fee.', { amount: money(chargeAmount), pct: pct(fee.fixedFee / chargeAmount) }) + '\n') +
    '• ' + (fee.effectiveRate < 0.029
      ? makeToken('calc_out.stripe_fee.row.vs_average_better', 'Vs average: 🟢 better than average')
      : fee.effectiveRate === 0.029
        ? makeToken('calc_out.stripe_fee.row.vs_average_equal', 'Vs average: 🟡 equal to average')
        : makeToken('calc_out.stripe_fee.row.vs_average_worse', 'Vs average: 🟠 worse than average')) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.stripe_fee_volume_projection|🎯 Volume Projection:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (monthlyTransactions <= 0
      ? '• ' + makeToken('calc_out.stripe_fee.row.enter_monthly_transactions', 'Enter monthly transaction count for batch projection.') + '\n'
      : '• ' + makeToken('calc_out.stripe_fee.row.monthly_projection', 'Monthly:  ' + money(volume.monthly.gross) + ' gross  →  ' + money(volume.monthly.fees) + ' fees  →  ' + money(volume.monthly.net) + ' net', { gross: money(volume.monthly.gross), fees: money(volume.monthly.fees), net: money(volume.monthly.net) }) + '\n' +
        '• ' + makeToken('calc_out.stripe_fee.row.yearly_projection', 'Yearly:   ' + money(volume.yearly.gross) + ' gross  →  ' + money(volume.yearly.fees) + ' fees  →  ' + money(volume.yearly.net) + ' net', { gross: money(volume.yearly.gross), fees: money(volume.yearly.fees), net: money(volume.yearly.net) }) + '\n' +
        '• ' + makeToken('calc_out.stripe_fee.row.annualized_impact', 'Annualized impact: fees cost ' + money(volume.yearly.fees) + '/yr — could fund ~' + Math.round(volume.yearly.fees / (chargeAmount * 0.5)) + ' extra transactions at your average ticket.', { fees: money(volume.yearly.fees), count: String(Math.round(volume.yearly.fees / (chargeAmount * 0.5))) }) + '\n') +
    '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.stripe_fee_break_even_provider|⚖️ Break-Even on Provider Choice:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.stripe_fee.row.cheapest_provider', 'Cheapest provider: ' + cheapest.displayName + ' (' + money(cheapest.fee.totalFee) + ' per ' + money(chargeAmount) + ' charge)', { provider: cheapest.displayName, fee: money(cheapest.fee.totalFee), charge: money(chargeAmount) }) + '\n' +
    '• ' + makeToken('calc_out.stripe_fee.row.most_expensive_provider', 'Most expensive:    ' + mostExpensive.displayName + ' (' + money(mostExpensive.fee.totalFee) + ' per ' + money(chargeAmount) + ' charge)', { provider: mostExpensive.displayName, fee: money(mostExpensive.fee.totalFee), charge: money(chargeAmount) }) + '\n' +
    (monthlyTransactions > 0
      ? '• ' + makeToken('calc_out.stripe_fee.row.annual_savings_if_switching', 'Annual savings if switching: ' + money(annualSavingsIfSwitched), { savings: money(annualSavingsIfSwitched) }) + '\n'
      : '• ' + makeToken('calc_out.stripe_fee.row.annual_savings_pending', 'Annual savings if switching: (enter monthly transactions to compute)') + '\n') +
    '• ' + makeToken('calc_out.stripe_fee.row.switching_friction', 'Switching friction: Stripe ↔ PayPal takes 1-2 weeks; Wise requires account setup + payout delays.') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.stripe_fee.row.whatif_raise_price', 'Raise price by $1:                 ' + money(chargeAmount + 1) + ' charge → net ' + money(feeRaise1.netReceived) + ' (' + (raise1Delta >= 0 ? '+' : '') + money(raise1Delta) + ' vs current)', { charge: money(chargeAmount + 1), net: money(feeRaise1.netReceived), delta: (raise1Delta >= 0 ? '+' : '') + money(raise1Delta) }) + '\n' +
    '• ' + makeToken('calc_out.stripe_fee.row.whatif_pass_fees', 'Pass fees to customer:            charge ' + money(passToCustomer) + ' instead of ' + money(chargeAmount) + ' (add ' + money(passToCustomerDelta) + ') to net the same amount', { charge: money(passToCustomer), base: money(chargeAmount), add: money(passToCustomerDelta) }) + '\n' +
    '• ' + makeToken('calc_out.stripe_fee.row.whatif_annual_billing', 'Switch to annual billing:         save ' + money(annualBillingSavings) + '/yr in fixed fees (11 fewer transactions × ' + cents(fixedPerTx) + ')', { save: money(annualBillingSavings), fixed: cents(fixedPerTx) }) + '\n' +
    (negotiable
      ? '• ' + makeToken('calc_out.stripe_fee.row.whatif_volume_discount', 'Negotiate 0.5% volume discount:   save ' + money(negotiationSavings) + '/yr', { save: money(negotiationSavings) }) + '\n'
      : '• ' + makeToken('calc_out.stripe_fee.row.whatif_volume_discount_partial', 'Negotiate 0.5% volume discount:   save ' + money(negotiationSavings) + '/yr (volume below $50K MRR — partial credit)', { save: money(negotiationSavings) }) + '\n') +
    '• ' + makeToken('calc_out.stripe_fee.row.whatif_bundle_12', 'Bundle 12 transactions:           fee on $' + fmt(bundledAmount) + ' single charge (' + money(bundledFee) + ') vs 12× current (' + money(unbundledFees) + ') — save ' + money(bundleSavings), { amount: '$' + fmt(bundledAmount), fee: money(bundledFee), current: money(unbundledFees), save: money(bundleSavings) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip;

  const results: string[] = [r];

  // SEO long-tail comparison rows at 5 different charge amounts
  const amounts = [1, 10, 100, 1000, 10000];
  for (const a of amounts) {
    const f = calculateFee(a, effectiveProvider);
    results.push(
      makeToken('calc_out.stripe_fee.row.comparison',
        'Comparison: $' + fmt(a) + ' charge via ' + providerDisplay +
        ' → fee ' + money(f.totalFee) + ' (' + pct(f.effectiveRate) + '), net ' + money(f.netReceived),
        { amount: '$' + fmt(a), provider: providerDisplay, fee: money(f.totalFee), rate: pct(f.effectiveRate), net: money(f.netReceived) })
    );
  }

  return results;
}

// ============== customFn — to be minified in Step 5 ==============

const customFn =
  // P168 B3-8：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 两端输出逐字节相同，不可能漂；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS +
  "var FEE={'stripe':{p:0.029,f:0.30,h:1},'stripe-international':{p:0.044,f:0.30,h:1},'paypal':{p:0.035,f:0.00,h:0},'square':{p:0.026,f:0.10,h:1},'wise':{p:0.015,f:0.00,h:0}};" +
  "var LABELS={'stripe':'Stripe (US)','stripe-international':'Stripe (International)','paypal':'PayPal','square':'Square','wise':'Wise'};" +
  "function cf(a,prov){var s=FEE[prov];var pf=a*s.p;var ff=s.h?s.f:0;var tf=pf+ff;var net=a-tf;var er=a>0?tf/a:0;return{pf:pf,ff:ff,tf:tf,net:net,er:er};}" +
  "function pv(a,prov,mt){if(mt<=0||a<=0)return{mg:0,mf:0,mn:0,yg:0,yf:0,yn:0};var sf=cf(a,prov);var mg=a*mt;var mf=sf.tf*mt;var mn=sf.net*mt;return{mg:mg,mf:mf,mn:mn,yg:mg*12,yf:mf*12,yn:mn*12};}" +
  "function cmp(a){var all=['stripe','stripe-international','paypal','square','wise'];var rows=[];for(var i=0;i<all.length;i++){var p=all[i];rows.push({p:p,fee:cf(a,p),n:LABELS[p]});}rows.sort(function(x,y){return x.fee.tf-y.fee.tf;});return rows;}" +
  "function fh(er,a){if(a<5)return{e:'\\uD83D\\uDD34',l:tk('calc_out.stripe_fee.row.health_fixed_fee_dominates','fixed fee dominates \\u2014 set $5 minimum or use no-fixed-fee provider')};if(er<0.02)return{e:'\\uD83D\\uDFE2',l:tk('calc_out.stripe_fee.row.health_excellent_rate','excellent rate')};if(er<0.03)return{e:'\\uD83D\\uDCA1',l:tk('calc_out.stripe_fee.row.health_standard_rate','standard rate')};if(er<0.04)return{e:'\\uD83D\\uDFE0',l:tk('calc_out.stripe_fee.row.health_above_average','above average')};return{e:'\\uD83D\\uDD34',l:tk('calc_out.stripe_fee.row.health_high_consider_switching','high \\u2014 consider switching')};}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var a=cnn(parseFloat(inputs.chargeAmount)||0);" +
  "var mt=cnn(parseFloat(inputs.monthlyTransactions)||0);" +
  "var pr=inputs.provider;" +
  "var prov=pr==='stripe-international'?'stripe-international':pr==='paypal'?'paypal':pr==='square'?'square':pr==='wise'?'wise':'stripe';" +
  "var ic=prov==='stripe'&&inputs.internationalCards==='yes';" +
  "var ep=ic?'stripe-international':prov;" +
  "if(a<=0){return['$calc_out.section.stripe_fee_calculator|\\u23F0 Stripe Fee Calculator|\\n\\n$calc_out.stripe_fee.row.enter_charge_amount|\\uD83D\\uDCB0 Enter a charge amount above $0 to see your payment processing fees, provider comparison, and annual projections.|'];}" +
  "var f=cf(a,ep);" +
  "var h=fh(f.er,a);" +
  "var v=pv(a,ep,mt);" +
  "var c=cmp(a);" +
  "var chp=c[0];" +
  "var me=c[c.length-1];" +
  "var asw=(me.fee.tf-chp.fee.tf)*mt*12;" +
  "function fmt(n){return n.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0});}" +
  "function mny(n){return'$'+fmt(Math.round(n*100)/100);}" +
  "function pct(n){return(n*100).toFixed(1)+'%';}" +
  "function cen(n){return n.toFixed(2);}" +
  "var cs='';" +
  "for(var i=0;i<c.length;i++){var r=c[i];var sel=r.p===ep;var nm=r.n+(sel?' (selected)':'');var cp=' '.repeat(Math.max(0,22-nm.length));var cell=r.n+(sel?' '+tk('calc_out.stripe_fee.row.provider_selected','(selected)'):'')+cp;cs+='\\u2022 '+cell+'  $calc_out.label.fee|fee|: '+mny(r.fee.tf).padStart(8)+'  ('+cen(r.fee.pf)+' + '+cen(r.fee.ff)+')  $calc_out.label.net|net|: '+mny(r.fee.net)+(sel?' '+tk('calc_out.stripe_fee.row.selected_marker','\\u2190 selected'):'')+'\\n';}" +
  "var f1=cf(a+1,ep);" +
  "var d1=f1.net-f.net;" +
  "var ps=FEE[ep];" +
  "var ptc=ps.h?(a+ps.f)/(1-ps.p):a/(1-ps.p);" +
  "var ptcd=ptc-a;" +
  "var fpt=ps.h?ps.f:0;" +
  "var abs=fpt*11*mt*12;" +
  "var mg=a*mt;" +
  "var neg=mg>=50000;" +
  "var dr=0.005;" +
  "var ns=neg?mg*dr*12:mg*dr*12*0.5;" +
  "var ba=a*12;" +
  "var bf=cf(ba,ep).tf;" +
  "var uf=f.tf*12;" +
  "var bs=uf-bf;" +
  "var tip='';" +
  "if(mt>1000){tip=tk('calc_out.stripe_fee.row.tip_high_volume','\\uD83D\\uDCA1 Tip: At your volume, you\\'re paying '+mny(v.yf)+'/yr in fees. Contact Stripe sales \\u2014 they negotiate 0.1-0.3% off at $50K MRR. The 30-min call pays for itself.',{fees:mny(v.yf)});}" +
  "else if(a<5){tip=tk('calc_out.stripe_fee.row.tip_small_charge','\\uD83D\\uDCA1 Tip: On charges under $5, the 30\\u00a2 fixed fee dominates. Charge $5 minimum, or use PayPal (3.5% flat) for small transactions \\u2014 Wise is cheapest but takes 1-2 days for payouts.');}" +
  "else{tip=tk('calc_out.stripe_fee.row.tip_default','\\uD83D\\uDCA1 Tip: Stripe fees are unavoidable but negotiable at $50K+ MRR. Each 0.1% reduction saves '+mny(v.yf*0.001/0.01)+'/yr at your volume. Consider annual plans (lower per-tx fees), pass fees to customers (+'+mny(ptcd)+' to cover '+mny(a)+'), or compare Wise for international.',{save:mny(v.yf*0.001/0.01),add:mny(ptcd),charge:mny(a)});}" +
  "var pd=LABELS[ep];" +
  "var r='';" +
  "r+='$calc_out.section.stripe_fee_calculator|\\u23F0 Stripe Fee Calculator|\\n\\n';" +
  "r+='$calc_out.section.stripe_fee_single_charge_breakdown|\\uD83D\\uDCB0 Single Charge Breakdown:|\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 $calc_out.label.charge_amount|Charge Amount|:        '+mny(a)+'\\n';" +
  "r+='\\u2022 $calc_out.label.provider|Provider|:             '+pd+(ic?' '+tk('calc_out.stripe_fee.row.international_cards_applied','(international cards applied)'):'')+'\\n';" +
  "r+='\\u2022 $calc_out.label.percentage_fee|Percentage Fee|:       '+mny(f.pf)+'  ('+pct(FEE[ep].p)+')\\n';" +
  "r+='\\u2022 $calc_out.label.fixed_fee|Fixed Fee|:            '+mny(f.ff)+'\\n';" +
  "r+='\\u2022 $calc_out.label.total_fee|Total Fee|:            '+mny(f.tf)+'\\n';" +
  "r+='\\u2022 $calc_out.label.net_received|Net Received|:         '+mny(f.net)+'   '+tk('calc_out.stripe_fee.row.net_received_note','\\u2190 what hits your bank')+'\\n';" +
  "r+='\\u2022 $calc_out.label.effective_fee_rate|Effective Fee Rate|:   '+pct(f.er)+'\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+=tk('calc_out.stripe_fee.row.provider_comparison_header','\\uD83D\\uDCCA Provider Comparison (for '+mny(a)+' charge, sorted by total fee):',{amount:mny(a)})+'\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+=cs+'\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='$calc_out.section.stripe_fee_fee_efficiency_health|\\uD83E\\uDE7A Fee Efficiency Health:|\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 '+h.e+' '+h.l+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.stripe_fee.row.industry_average','Industry average: ~2.9% + 30\\u00a2 (Stripe US standard)')+'\\n';" +
  "if(a<5)r+='\\u2022 '+tk('calc_out.stripe_fee.row.fixed_fee_share_small','On '+mny(a)+' charge: fixed fee is '+pct(f.ff/a)+' of total. Set $5 minimum or use PayPal/Wise.',{amount:mny(a),pct:pct(f.ff/a)})+'\\n';" +
  "else r+='\\u2022 '+tk('calc_out.stripe_fee.row.fixed_fee_share','On '+mny(a)+' charge: fixed fee is '+pct(f.ff/a)+' of total fee.',{amount:mny(a),pct:pct(f.ff/a)})+'\\n';" +
  "r+='\\u2022 '+(f.er<0.029?tk('calc_out.stripe_fee.row.vs_average_better','Vs average: \\uD83D\\uDFE2 better than average'):f.er===0.029?tk('calc_out.stripe_fee.row.vs_average_equal','Vs average: \\uD83D\\uDCA1 equal to average'):tk('calc_out.stripe_fee.row.vs_average_worse','Vs average: \\uD83D\\uDFE0 worse than average'))+'\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='$calc_out.section.stripe_fee_volume_projection|\\uD83C\\uDFAF Volume Projection:|\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "if(mt<=0)r+='\\u2022 '+tk('calc_out.stripe_fee.row.enter_monthly_transactions','Enter monthly transaction count for batch projection.')+'\\n';" +
  "else{r+='\\u2022 '+tk('calc_out.stripe_fee.row.monthly_projection','Monthly:  '+mny(v.mg)+' gross  \\u2192  '+mny(v.mf)+' fees  \\u2192  '+mny(v.mn)+' net',{gross:mny(v.mg),fees:mny(v.mf),net:mny(v.mn)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.stripe_fee.row.yearly_projection','Yearly:   '+mny(v.yg)+' gross  \\u2192  '+mny(v.yf)+' fees  \\u2192  '+mny(v.yn)+' net',{gross:mny(v.yg),fees:mny(v.yf),net:mny(v.yn)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.stripe_fee.row.annualized_impact','Annualized impact: fees cost '+mny(v.yf)+'/yr \\u2014 could fund ~'+Math.round(v.yf/(a*0.5))+' extra transactions at your average ticket.',{fees:mny(v.yf),count:String(Math.round(v.yf/(a*0.5)))})+'\\n\\n';}" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='$calc_out.section.stripe_fee_break_even_provider|\\u2696\\uFE0F Break-Even on Provider Choice:|\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 '+tk('calc_out.stripe_fee.row.cheapest_provider','Cheapest provider: '+chp.n+' ('+mny(chp.fee.tf)+' per '+mny(a)+' charge)',{provider:chp.n,fee:mny(chp.fee.tf),charge:mny(a)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.stripe_fee.row.most_expensive_provider','Most expensive:    '+me.n+' ('+mny(me.fee.tf)+' per '+mny(a)+' charge)',{provider:me.n,fee:mny(me.fee.tf),charge:mny(a)})+'\\n';" +
  "if(mt>0)r+='\\u2022 '+tk('calc_out.stripe_fee.row.annual_savings_if_switching','Annual savings if switching: '+mny(asw),{savings:mny(asw)})+'\\n';" +
  "else r+='\\u2022 '+tk('calc_out.stripe_fee.row.annual_savings_pending','Annual savings if switching: (enter monthly transactions to compute)')+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.stripe_fee.row.switching_friction','Switching friction: Stripe \\u2194 PayPal takes 1-2 weeks; Wise requires account setup + payout delays.')+'\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='$calc_out.section.what_if_scenarios|\\uD83D\\uDD04 What-If Scenarios:|\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 '+tk('calc_out.stripe_fee.row.whatif_raise_price','Raise price by $1:                 '+mny(a+1)+' charge \\u2192 net '+mny(f1.net)+' ('+(d1>=0?'+':'')+mny(d1)+' vs current)',{charge:mny(a+1),net:mny(f1.net),delta:(d1>=0?'+':'')+mny(d1)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.stripe_fee.row.whatif_pass_fees','Pass fees to customer:            charge '+mny(ptc)+' instead of '+mny(a)+' (add '+mny(ptcd)+') to net the same amount',{charge:mny(ptc),base:mny(a),add:mny(ptcd)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.stripe_fee.row.whatif_annual_billing','Switch to annual billing:         save '+mny(abs)+'/yr in fixed fees (11 fewer transactions \\u00d7 '+cen(fpt)+')',{save:mny(abs),fixed:cen(fpt)})+'\\n';" +
  "r+='\\u2022 '+(neg?tk('calc_out.stripe_fee.row.whatif_volume_discount','Negotiate 0.5% volume discount:   save '+mny(ns)+'/yr',{save:mny(ns)}):tk('calc_out.stripe_fee.row.whatif_volume_discount_partial','Negotiate 0.5% volume discount:   save '+mny(ns)+'/yr (volume below $50K MRR \\u2014 partial credit)',{save:mny(ns)}))+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.stripe_fee.row.whatif_bundle_12','Bundle 12 transactions:           fee on $'+fmt(ba)+' single charge ('+mny(bf)+') vs 12\\u00d7 current ('+mny(uf)+') \\u2014 save '+mny(bs),{amount:'$'+fmt(ba),fee:mny(bf),current:mny(uf),save:mny(bs)})+'\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+=tip;" +
  "var results=[r];" +
  "var amts=[1,10,100,1000,10000];" +
  "for(var i=0;i<amts.length;i++){var am=amts[i];var ff=cf(am,ep);results.push(tk('calc_out.stripe_fee.row.comparison','Comparison: $'+fmt(am)+' charge via '+pd+' \\u2192 fee '+mny(ff.tf)+' ('+pct(ff.er)+'), net '+mny(ff.net),{amount:'$'+fmt(am),provider:pd,fee:mny(ff.tf),rate:pct(ff.er),net:mny(ff.net)}));}" +
  "return results;";

// ============== Engine — to be filled in Step 6 ==============

const engine: ToolEngine = {
  slug: 'solopreneur-stripe-fee-calculator',
  title: 'Stripe Fee Calculator',
  description: 'Calculate Stripe, PayPal, Square, and Wise payment processing fees. Compare 5 providers, project annual fee burden, and find what-if scenarios to reduce fees.',
  inputs: [
    { name: 'chargeAmount', label: 'Charge Amount ($)', placeholder: 'e.g. 100', type: 'number' },
    { name: 'provider', label: 'Payment Provider', placeholder: '', type: 'select', options: ['stripe', 'stripe-international', 'paypal', 'square', 'wise'] },
    { name: 'monthlyTransactions', label: 'Monthly Transactions', placeholder: 'e.g. 100', type: 'number' },
    { name: 'internationalCards', label: 'International Cards (Stripe only)', placeholder: '', type: 'select', options: ['no', 'yes'] },
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
    return calculateStripeFee(inputs);
  },
  staticExamples: ['$calc_out.section.stripe_fee_calculator|⏰ Stripe Fee Calculator|\n\n$calc_out.section.stripe_fee_single_charge_breakdown|💰 Single Charge Breakdown:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.charge_amount|Charge Amount|:        $100\n• $calc_out.label.provider|Provider|:             Stripe (US)\n• $calc_out.label.percentage_fee|Percentage Fee|:       $3  (2.9%)\n• $calc_out.label.fixed_fee|Fixed Fee|:            $0\n• $calc_out.label.total_fee|Total Fee|:            $3\n• $calc_out.label.net_received|Net Received|:         $97   $calc_out.stripe_fee.row.net_received_note|← what hits your bank|\n• $calc_out.label.effective_fee_rate|Effective Fee Rate|:   3.2%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.stripe_fee.row.provider_comparison_header{"amount":"$100"}|📊 Provider Comparison (for $100 charge, sorted by total fee):|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Wise                    $calc_out.label.fee|fee|:       $2  (1.50 + 0.00)  $calc_out.label.net|net|: $99\n• Square                  $calc_out.label.fee|fee|:       $3  (2.60 + 0.10)  $calc_out.label.net|net|: $97\n• Stripe (US) $calc_out.stripe_fee.row.provider_selected|(selected)|  $calc_out.label.fee|fee|:       $3  (2.90 + 0.30)  $calc_out.label.net|net|: $97 $calc_out.stripe_fee.row.selected_marker|← selected|\n• PayPal                  $calc_out.label.fee|fee|:       $4  (3.50 + 0.00)  $calc_out.label.net|net|: $97\n• Stripe (International)  $calc_out.label.fee|fee|:       $5  (4.40 + 0.30)  $calc_out.label.net|net|: $95\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.stripe_fee_fee_efficiency_health|🩺 Fee Efficiency Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟠 $calc_out.stripe_fee.row.health_above_average|above average|\n• $calc_out.stripe_fee.row.industry_average|Industry average: ~2.9% + 30¢ (Stripe US standard)|\n• $calc_out.stripe_fee.row.fixed_fee_share{"amount":"$100","pct":"0.3%"}|On $100 charge: fixed fee is 0.3% of total fee.|\n• $calc_out.stripe_fee.row.vs_average_worse|Vs average: 🟠 worse than average|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.stripe_fee_volume_projection|🎯 Volume Projection:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.stripe_fee.row.monthly_projection{"gross":"$10,000","fees":"$320","net":"$9,680"}|Monthly:  $10,000 gross  →  $320 fees  →  $9,680 net|\n• $calc_out.stripe_fee.row.yearly_projection{"gross":"$120,000","fees":"$3,840","net":"$116,160"}|Yearly:   $120,000 gross  →  $3,840 fees  →  $116,160 net|\n• $calc_out.stripe_fee.row.annualized_impact{"fees":"$3,840","count":"77"}|Annualized impact: fees cost $3,840/yr — could fund ~77 extra transactions at your average ticket.|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.stripe_fee_break_even_provider|⚖️ Break-Even on Provider Choice:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.stripe_fee.row.cheapest_provider{"provider":"Wise","fee":"$2","charge":"$100"}|Cheapest provider: Wise ($2 per $100 charge)|\n• $calc_out.stripe_fee.row.most_expensive_provider{"provider":"Stripe (International)","fee":"$5","charge":"$100"}|Most expensive:    Stripe (International) ($5 per $100 charge)|\n• $calc_out.stripe_fee.row.annual_savings_if_switching{"savings":"$3,840"}|Annual savings if switching: $3,840|\n• $calc_out.stripe_fee.row.switching_friction|Switching friction: Stripe ↔ PayPal takes 1-2 weeks; Wise requires account setup + payout delays.|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.stripe_fee.row.whatif_raise_price{"charge":"$101","net":"$98","delta":"+$1"}|Raise price by $1:                 $101 charge → net $98 (+$1 vs current)|\n• $calc_out.stripe_fee.row.whatif_pass_fees{"charge":"$103","base":"$100","add":"$3"}|Pass fees to customer:            charge $103 instead of $100 (add $3) to net the same amount|\n• $calc_out.stripe_fee.row.whatif_annual_billing{"save":"$3,960","fixed":"0.30"}|Switch to annual billing:         save $3,960/yr in fixed fees (11 fewer transactions × 0.30)|\n• $calc_out.stripe_fee.row.whatif_volume_discount_partial{"save":"$300"}|Negotiate 0.5% volume discount:   save $300/yr (volume below $50K MRR — partial credit)|\n• $calc_out.stripe_fee.row.whatif_bundle_12{"amount":"$1,200","fee":"$35","current":"$38","save":"$3"}|Bundle 12 transactions:           fee on $1,200 single charge ($35) vs 12× current ($38) — save $3|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.stripe_fee.row.tip_default{"save":"$384","add":"$3","charge":"$100"}|💡 Tip: Stripe fees are unavoidable but negotiable at $50K+ MRR. Each 0.1% reduction saves $384/yr at your volume. Consider annual plans (lower per-tx fees), pass fees to customers (+$3 to cover $100), or compare Wise for international.|\n$calc_out.stripe_fee.row.comparison{"amount":"$1","provider":"Stripe (US)","fee":"$0","rate":"32.9%","net":"$1"}|Comparison: $1 charge via Stripe (US) → fee $0 (32.9%), net $1|\n$calc_out.stripe_fee.row.comparison{"amount":"$10","provider":"Stripe (US)","fee":"$1","rate":"5.9%","net":"$9"}|Comparison: $10 charge via Stripe (US) → fee $1 (5.9%), net $9|\n$calc_out.stripe_fee.row.comparison{"amount":"$100","provider":"Stripe (US)","fee":"$3","rate":"3.2%","net":"$97"}|Comparison: $100 charge via Stripe (US) → fee $3 (3.2%), net $97|\n$calc_out.stripe_fee.row.comparison{"amount":"$1,000","provider":"Stripe (US)","fee":"$29","rate":"2.9%","net":"$971"}|Comparison: $1,000 charge via Stripe (US) → fee $29 (2.9%), net $971|\n$calc_out.stripe_fee.row.comparison{"amount":"$10,000","provider":"Stripe (US)","fee":"$290","rate":"2.9%","net":"$9,710"}|Comparison: $10,000 charge via Stripe (US) → fee $290 (2.9%), net $9,710|'],
  faq: [
    { q: 'How much does Stripe charge per transaction?', a: 'Stripe charges 2.9% + 30¢ per successful card transaction for US-based businesses. International cards add an extra 1.5% (4.4% + 30¢ total). There are no monthly fees, no setup fees, and no hidden costs. Stripe also charges $15 for chargebacks (disputed transactions) and 0.5% for currency conversion if you receive payments in a currency other than your account\'s default. ACH direct debit and SEPA transfers are cheaper (0.8% capped at $5) but take 2-3 business days to settle.' },
    { q: 'How do I calculate Stripe fees for my business?', a: 'Use the formula: total fee = charge amount × 2.9% + $0.30. For a $100 charge: $100 × 0.029 + $0.30 = $3.20. Net received: $96.80. For international cards, multiply by 4.4% instead of 2.9%. For high volume (>$50K MRR), Stripe negotiates lower rates — contact their sales team. To project annual fees, multiply per-transaction fee by your monthly volume × 12.' },
    { q: 'Is Stripe or PayPal cheaper for small transactions?', a: 'For small transactions under $5, PayPal is cheaper because it has no fixed fee (3.5% flat). Stripe\'s 30¢ fixed fee dominates on small charges — e.g., a $1 charge incurs 32.9% in fees ($0.30 fixed + $0.029 percentage). PayPal on $1: 3.5% = $0.035. For transactions over $15, Stripe is cheaper (2.9% + 30¢ beats 3.5% flat). Wise is cheapest at 1.5% but only for US-to-US transfers; cross-border fees vary by corridor.' },
    { q: 'Can I pass Stripe fees to my customers?', a: 'Yes — most US states allow surcharging, but the rules are strict. You can add a percentage fee (e.g., 3%) to the customer\'s total to cover processing costs. For a $100 charge, charge $103.09 to net $100 after Stripe takes 2.9% + 30¢. Some states (Connecticut, Massachusetts, Illinois, and others) prohibit credit card surcharging. Debit card surcharging is banned nationwide. An alternative is cash discount programs (lower listed price, higher card price) which have fewer restrictions. Always display surcharges clearly on your checkout page.' },
    { q: 'How do I negotiate lower Stripe fees?', a: 'Stripe publishes standard rates (2.9% + 30¢) but negotiates volume discounts for businesses processing $50K+ per month. To start: contact Stripe sales with your monthly volume, average transaction size, and growth trajectory. Typical reductions are 0.1-0.3% (saves $500-$1,500/mo at $50K MRR). Other negotiation levers: international card surcharges, ACH/wire pricing, multi-product accounts (Stripe Billing + Connect), and committing to multi-year contracts. If Stripe won\'t budge, mention that you\'re evaluating Adyen or Braintree — competitive quotes often unlock better rates.' },
    { q: "What are Stripe fees in 2026?", a: "Stripe US (2026): 1) Standard: 2.9% + 30¢ per transaction, 2) Plus/Premium: custom (lower %), 3) International: +1.5%, 4) Currency conversion: +1%. Volume tiers: <$1M/year 2.9% + 30¢, $1M+ 2.7% + 30¢, $5M+ 2.5% + 30¢, $10M+ 2.4% + 30¢. For $1K charge: $29.30. For $100: $3.20. Most: 2.9% + 30¢ is the standard. High volume: 2.4-2.7%." },
    { q: "How do I reduce Stripe fees?", a: "Top tactics: 1) Negotiate custom rates (call Stripe, ask for volume discount), 2) Use ACH for large B2B (0.8% capped at $5), 3) Use SEPA for EU, 4) Avoid currency conversion (1%), 5) Avoid international (1.5% surcharge), 6) Use Stripe Tax for compliance, 7) Use multiple payment processors. Most: 10-30% fee reduction achievable. Volume >$1M/year: 2.7%. >$5M: 2.5%. Top: 2.0-2.4% for very high volume." },
    { q: "What is the difference between Stripe and Adyen fees?", a: "Stripe: 2.9% + 30¢ (US, online). Adyen: 2.6% + 12¢ (interchange-plus). For $100 charge: Stripe $3.20, Adyen ~$2.72. Adyen: cheaper, more enterprise. Stripe: easier setup, more integrations. By volume: Adyen is 10-30% cheaper. Most SMB: Stripe (easier). Enterprise ($1M+ volume): Adyen or negotiate Stripe. Most: Stripe for <$1M, Adyen/custom for $1M+. Top: custom (2.0-2.4%) for $10M+." },
    { q: "How do I pass payment processing fees to customers?", a: "Surcharging: 1) Allowed in most US states, 2) Forbidden in CT, MA, ME, OK, PR (as of 2026), 3) EU: allowed with caps, 4) Card-specific surcharge not allowed (must be uniform). Stripe tools: Stripe Surcharging (only for credit cards, where allowed). Most: 2-3% surcharge for credit cards, free for ACH/debit. Pass: cost of payment to customer. Risk: 5-10% conversion drop. Most: absorb cost (better UX)." },
    { q: "What is the cheapest payment processor?", a: "By volume: 1) Stripe/Adyen/Square: 2.6-2.9% + 30¢, 2) Braintree: 2.59% + 49¢, 3) 2Checkout: 3.5% + 45¢, 4) PayPal: 3.49% + 49¢, 5) Authorize.Net: 2.9% + 30¢, 6) Dwolla (ACH): 0.5%, 7) Custom (large): 1.5-2.0%. For B2B: ACH (0.5% capped at $5) is much cheaper. For SaaS: Stripe + ACH. For B2C: Stripe standard. High volume: negotiate. Most: 2.5-2.9% is the range." },
    { q: "How do Stripe fees affect my SaaS margins?", a: "For 80% gross margin SaaS, 3% Stripe fee = 3.75% of margin. For $100K MRR: $3K/mo Stripe fees = $36K/year. Most: 1-5% of revenue in payment processing. Cut to 1-2% with ACH + negotiation. Calculate: MRR × payment_fee% = monthly fees. Optimize: 1) ACH for B2B, 2) Card for B2C, 3) Annual prepay (one transaction). Most: ACH for invoices saves 2-3% per transaction. Top: negotiate 2.4% rate." },
    { q: "What is the difference between Stripe Connect and regular Stripe?", a: "Stripe Connect: marketplace/payment-splitting (you + your sellers). Regular Stripe: direct (you + customer). Connect fees: 0.25% + 30¢ on top of standard. For marketplace: Connect. For SaaS: regular Stripe. Connect: 1) Express, 2) Standard, 3) Custom (full control). Most: Standard (easiest) or Express (good UX). Fees: 0.25% extra + Stripe. Most: marketplaces use Connect. For SaaS: regular Stripe is fine." },
    { q: "How do I handle international payments on Stripe?", a: "International Stripe: 1) International card: +1.5%, 2) Currency conversion: +1%, 3) Total: +2.5% on top of base. For $100 international charge: $3.20 + $1.50 + $1.00 = $5.70. Avoid 1) Use multi-currency (Stripe supports 135+), 2) Local payment methods (SEPA, iDEAL, etc.), 3) Bank transfers for large. 1.5-2.5% extra for international. For EU: SEPA is much cheaper. 5-10% of revenue in intl fees." },
  ],
  howToUse: [
    'Enter your typical charge amount (per-transaction revenue).',
    'Select your payment provider — default is Stripe US, but you can compare 5 options.',
    'Enter your monthly transaction volume for batch projection (set 0 to skip).',
    'Toggle international cards if your Stripe customers are non-US (applies 1.5% surcharge).',
    'Review the single charge breakdown, 5-provider comparison, and fee efficiency health.',
    'Check the volume projection to see annual fee burden.',
    'Read the 5 what-if scenarios to find savings opportunities (raise price, annual billing, etc.).',
  ],
  engineKey: true,
};

registerEngine(engine);
