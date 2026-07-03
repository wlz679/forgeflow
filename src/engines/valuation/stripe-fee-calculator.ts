import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

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
      label: 'fixed fee dominates — set $5 minimum or use no-fixed-fee provider',
    };
  }
  if (effectiveRate < 0.02) return { emoji: '🟢', label: 'excellent rate' };
  if (effectiveRate < 0.03) return { emoji: '🟡', label: 'standard rate' };
  if (effectiveRate < 0.04) return { emoji: '🟠', label: 'above average' };
  return { emoji: '🔴', label: 'high — consider switching' };
}

// ============== calculate() — full 9-section v3 output ==============

function calculateStripeFee(inputs: Record<string, string>): string[] {
  const chargeAmount = parseFloat(inputs.chargeAmount) || 0;
  const monthlyTransactions = Math.max(0, parseFloat(inputs.monthlyTransactions) || 0);
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
      '⏰ Stripe Fee Calculator\n\n' +
      '💰 Enter a charge amount above $0 to see your payment processing fees, provider comparison, and annual projections.',
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
    const marker = row.provider === effectiveProvider ? ' ← selected' : '';
    compSection +=
      '• ' + (row.displayName + (row.provider === effectiveProvider ? ' (selected)' : '')).padEnd(22) +
      '  fee: ' + money(row.fee.totalFee).padStart(8) +
      '  (' + cents(row.fee.percentageFee) + ' + ' + cents(row.fee.fixedFee) + ')' +
      '  net: ' + money(row.fee.netReceived) + marker + '\n';
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
    tip = '💡 Tip: At your volume, you\'re paying ' + money(volume.yearly.fees) + '/yr in fees. Contact Stripe sales — they negotiate 0.1-0.3% off at $50K MRR. The 30-min call pays for itself.';
  } else if (chargeAmount < 5) {
    tip = '💡 Tip: On charges under $5, the 30¢ fixed fee dominates. Charge $5 minimum, or use PayPal (3.5% flat) for small transactions — Wise is cheapest but takes 1-2 days for payouts.';
  } else {
    tip = '💡 Tip: Stripe fees are unavoidable but negotiable at $50K+ MRR. Each 0.1% reduction saves ' + money(volume.yearly.fees * 0.001 / 0.01) + '/yr at your volume. Consider annual plans (lower per-tx fees), pass fees to customers (+' + money(passToCustomerDelta) + ' to cover ' + money(chargeAmount) + '), or compare Wise for international.';
  }

  const providerDisplay = PROVIDER_LABELS[effectiveProvider];
  const r =
    '⏰ Stripe Fee Calculator\n\n' +
    '💰 Single Charge Breakdown:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Charge Amount:        ' + money(chargeAmount) + '\n' +
    '• Provider:             ' + providerDisplay + (internationalCards ? ' (international cards applied)' : '') + '\n' +
    '• Percentage Fee:       ' + money(fee.percentageFee) + '  (' + pct(FEE_SCHEDULES[effectiveProvider].percentage) + ')\n' +
    '• Fixed Fee:            ' + money(fee.fixedFee) + '\n' +
    '• Total Fee:            ' + money(fee.totalFee) + '\n' +
    '• Net Received:         ' + money(fee.netReceived) + '   ← what hits your bank\n' +
    '• Effective Fee Rate:   ' + pct(fee.effectiveRate) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Provider Comparison (for ' + money(chargeAmount) + ' charge, sorted by total fee):\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    compSection + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Fee Efficiency Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + health.emoji + ' ' + health.label + '\n' +
    '• Industry average: ~2.9% + 30¢ (Stripe US standard)\n' +
    (chargeAmount < 5
      ? '• On ' + money(chargeAmount) + ' charge: fixed fee is ' + pct(fee.fixedFee / chargeAmount) + ' of total. Set $5 minimum or use PayPal/Wise.\n'
      : '• On ' + money(chargeAmount) + ' charge: fixed fee is ' + pct(fee.fixedFee / chargeAmount) + ' of total fee.\n') +
    '• Vs average: ' + (fee.effectiveRate < 0.029 ? '🟢 better than average' : fee.effectiveRate === 0.029 ? '🟡 equal to average' : '🟠 worse than average') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Volume Projection:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (monthlyTransactions <= 0
      ? '• Enter monthly transaction count for batch projection.\n'
      : '• Monthly:  ' + money(volume.monthly.gross) + ' gross  →  ' + money(volume.monthly.fees) + ' fees  →  ' + money(volume.monthly.net) + ' net\n' +
        '• Yearly:   ' + money(volume.yearly.gross) + ' gross  →  ' + money(volume.yearly.fees) + ' fees  →  ' + money(volume.yearly.net) + ' net\n' +
        '• Annualized impact: fees cost ' + money(volume.yearly.fees) + '/yr — could fund ~' + Math.round(volume.yearly.fees / (chargeAmount * 0.5)) + ' extra transactions at your average ticket.\n') +
    '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even on Provider Choice:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Cheapest provider: ' + cheapest.displayName + ' (' + money(cheapest.fee.totalFee) + ' per ' + money(chargeAmount) + ' charge)\n' +
    '• Most expensive:    ' + mostExpensive.displayName + ' (' + money(mostExpensive.fee.totalFee) + ' per ' + money(chargeAmount) + ' charge)\n' +
    (monthlyTransactions > 0
      ? '• Annual savings if switching: ' + money(annualSavingsIfSwitched) + '\n'
      : '• Annual savings if switching: (enter monthly transactions to compute)\n') +
    '• Switching friction: Stripe ↔ PayPal takes 1-2 weeks; Wise requires account setup + payout delays.\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Raise price by $1:                 ' + money(chargeAmount + 1) + ' charge → net ' + money(feeRaise1.netReceived) + ' (' + (raise1Delta >= 0 ? '+' : '') + money(raise1Delta) + ' vs current)\n' +
    '• Pass fees to customer:            charge ' + money(passToCustomer) + ' instead of ' + money(chargeAmount) + ' (add ' + money(passToCustomerDelta) + ') to net the same amount\n' +
    '• Switch to annual billing:         save ' + money(annualBillingSavings) + '/yr in fixed fees (11 fewer transactions × ' + cents(fixedPerTx) + ')\n' +
    '• Negotiate 0.5% volume discount:   save ' + money(negotiationSavings) + '/yr' + (negotiable ? '' : ' (volume below $50K MRR — partial credit)') + '\n' +
    '• Bundle 12 transactions:           fee on $' + fmt(bundledAmount) + ' single charge (' + money(bundledFee) + ') vs 12× current (' + money(unbundledFees) + ') — save ' + money(bundleSavings) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip;

  const results: string[] = [r];

  // SEO long-tail comparison rows at 5 different charge amounts
  const amounts = [1, 10, 100, 1000, 10000];
  for (const a of amounts) {
    const f = calculateFee(a, effectiveProvider);
    results.push(
      'Comparison: $' + fmt(a) + ' charge via ' + providerDisplay +
      ' → fee ' + money(f.totalFee) + ' (' + pct(f.effectiveRate) + '), net ' + money(f.netReceived)
    );
  }

  return results;
}

// ============== customFn — to be minified in Step 5 ==============

const customFn =
  "var FEE={'stripe':{p:0.029,f:0.30,h:1},'stripe-international':{p:0.044,f:0.30,h:1},'paypal':{p:0.035,f:0.00,h:0},'square':{p:0.026,f:0.10,h:1},'wise':{p:0.015,f:0.00,h:0}};" +
  "var LABELS={'stripe':'Stripe (US)','stripe-international':'Stripe (International)','paypal':'PayPal','square':'Square','wise':'Wise'};" +
  "function cf(a,prov){var s=FEE[prov];var pf=a*s.p;var ff=s.h?s.f:0;var tf=pf+ff;var net=a-tf;var er=a>0?tf/a:0;return{pf:pf,ff:ff,tf:tf,net:net,er:er};}" +
  "function pv(a,prov,mt){if(mt<=0||a<=0)return{mg:0,mf:0,mn:0,yg:0,yf:0,yn:0};var sf=cf(a,prov);var mg=a*mt;var mf=sf.tf*mt;var mn=sf.net*mt;return{mg:mg,mf:mf,mn:mn,yg:mg*12,yf:mf*12,yn:mn*12};}" +
  "function cmp(a){var ord=['wise','square','stripe','stripe-international','paypal'];var rows=[];for(var i=0;i<ord.length;i++){var p=ord[i];rows.push({p:p,fee:cf(a,p),n:LABELS[p]});}return rows;}" +
  "function fh(er,a){if(a<5)return{e:'\\uD83D\\uDD34',l:'fixed fee dominates \\u2014 set $5 minimum or use no-fixed-fee provider'};if(er<0.02)return{e:'\\uD83D\\uDFE2',l:'excellent rate'};if(er<0.03)return{e:'\\uD83D\\uDCA1',l:'standard rate'};if(er<0.04)return{e:'\\uD83D\\uDFE0',l:'above average'};return{e:'\\uD83D\\uDD34',l:'high \\u2014 consider switching'};}" +
  "var a=parseFloat(inputs.chargeAmount)||0;" +
  "var mt=Math.max(0,parseFloat(inputs.monthlyTransactions)||0);" +
  "var pr=inputs.provider;" +
  "var prov=pr==='stripe-international'?'stripe-international':pr==='paypal'?'paypal':pr==='square'?'square':pr==='wise'?'wise':'stripe';" +
  "var ic=prov==='stripe'&&inputs.internationalCards==='yes';" +
  "var ep=ic?'stripe-international':prov;" +
  "if(a<=0){return['\\u23F0 Stripe Fee Calculator\\n\\n\\uD83D\\uDCB0 Enter a charge amount above $0 to see your payment processing fees, provider comparison, and annual projections.'];}" +
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
  "for(var i=0;i<c.length;i++){var r=c[i];var mk=r.p===ep?' \\u2190 selected':'';cs+='\\u2022 '+(r.n+(r.p===ep?' (selected)':'')).slice(0,22).padEnd(22)+'  fee: '+mny(r.fee.tf)+'  ('+cen(r.fee.pf)+' + '+cen(r.fee.ff)+')  net: '+mny(r.fee.net)+mk+'\\n';}" +
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
  "if(mt>1000){tip='\\uD83D\\uDCA1 Tip: At your volume, you\\u2019re paying '+mny(v.yf)+'/yr in fees. Contact Stripe sales \\u2014 they negotiate 0.1-0.3% off at $50K MRR. The 30-min call pays for itself.';}" +
  "else if(a<5){tip='\\uD83D\\uDCA1 Tip: On charges under $5, the 30\\u00a2 fixed fee dominates. Charge $5 minimum, or use PayPal (3.5% flat) for small transactions \\u2014 Wise is cheapest but takes 1-2 days for payouts.';}" +
  "else{tip='\\uD83D\\uDCA1 Tip: Stripe fees are unavoidable but negotiable at $50K+ MRR. Each 0.1% reduction saves '+mny(v.yf*0.001/0.01)+'/yr at your volume. Consider annual plans (lower per-tx fees), pass fees to customers (+'+mny(ptcd)+' to cover '+mny(a)+'), or compare Wise for international.';}" +
  "var pd=LABELS[ep];" +
  "var r='';" +
  "r+='\\u23F0 Stripe Fee Calculator\\n\\n';" +
  "r+='\\uD83D\\uDCB0 Single Charge Breakdown:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Charge Amount:        '+mny(a)+'\\n';" +
  "r+='\\u2022 Provider:             '+pd+(ic?' (international cards applied)':'')+'\\n';" +
  "r+='\\u2022 Percentage Fee:       '+mny(f.pf)+'  ('+pct(FEE[ep].p)+')\\n';" +
  "r+='\\u2022 Fixed Fee:            '+mny(f.ff)+'\\n';" +
  "r+='\\u2022 Total Fee:            '+mny(f.tf)+'\\n';" +
  "r+='\\u2022 Net Received:         '+mny(f.net)+'   \\u2190 what hits your bank\\n';" +
  "r+='\\u2022 Effective Fee Rate:   '+pct(f.er)+'\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDCCA Provider Comparison (for '+mny(a)+' charge, sorted by total fee):\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+=cs+'\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83E\\uDE7A Fee Efficiency Health:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 '+h.e+' '+h.l+'\\n';" +
  "r+='\\u2022 Industry average: ~2.9% + 30\\u00a2 (Stripe US standard)\\n';" +
  "if(a<5)r+='\\u2022 On '+mny(a)+' charge: fixed fee is '+pct(f.ff/a)+' of total. Set $5 minimum or use PayPal/Wise.\\n';" +
  "else r+='\\u2022 On '+mny(a)+' charge: fixed fee is '+pct(f.ff/a)+' of total fee.\\n';" +
  "r+='\\u2022 Vs average: '+(f.er<0.029?'\\uD83D\\uDFE2 better than average':f.er===0.029?'\\uD83D\\uDCA1 equal to average':'\\uD83D\\uDFE0 worse than average')+'\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83C\\uDFAF Volume Projection:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "if(mt<=0)r+='\\u2022 Enter monthly transaction count for batch projection.\\n\\n';" +
  "else{r+='\\u2022 Monthly:  '+mny(v.mg)+' gross  \\u2192  '+mny(v.mf)+' fees  \\u2192  '+mny(v.mn)+' net\\n';" +
  "r+='\\u2022 Yearly:   '+mny(v.yg)+' gross  \\u2192  '+mny(v.yf)+' fees  \\u2192  '+mny(v.yn)+' net\\n';" +
  "r+='\\u2022 Annualized impact: fees cost '+mny(v.yf)+'/yr \\u2014 could fund ~'+Math.round(v.yf/(a*0.5))+' extra transactions at your average ticket.\\n\\n';}" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\u2696\\uFE0F Break-Even on Provider Choice:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Cheapest provider: '+chp.n+' ('+mny(chp.fee.tf)+' per '+mny(a)+' charge)\\n';" +
  "r+='\\u2022 Most expensive:    '+me.n+' ('+mny(me.fee.tf)+' per '+mny(a)+' charge)\\n';" +
  "if(mt>0)r+='\\u2022 Annual savings if switching: '+mny(asw)+'\\n';" +
  "else r+='\\u2022 Annual savings if switching: (enter monthly transactions to compute)\\n';" +
  "r+='\\u2022 Switching friction: Stripe \\u2194 PayPal takes 1-2 weeks; Wise requires account setup + payout delays.\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDD04 What-If Scenarios:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Raise price by $1:                 '+mny(a+1)+' charge \\u2192 net '+mny(f1.net)+' ('+(d1>=0?'+':'')+mny(d1)+' vs current)\\n';" +
  "r+='\\u2022 Pass fees to customer:            charge '+mny(ptc)+' instead of '+mny(a)+' (add '+mny(ptcd)+') to net the same amount\\n';" +
  "r+='\\u2022 Switch to annual billing:         save '+mny(abs)+'/yr in fixed fees (11 fewer transactions \\u00d7 '+cen(fpt)+')\\n';" +
  "r+='\\u2022 Negotiate 0.5% volume discount:   save '+mny(ns)+'/yr'+(neg?'': ' (volume below $50K MRR \\u2014 partial credit)')+'\\n';" +
  "r+='\\u2022 Bundle 12 transactions:           fee on $'+fmt(ba)+' single charge ('+mny(bf)+') vs 12\\u00d7 current ('+mny(uf)+') \\u2014 save '+mny(bs)+'\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+=tip;" +
  "var results=[r];" +
  "var amts=[1,10,100,1000,10000];" +
  "for(var i=0;i<amts.length;i++){var am=amts[i];var ff=cf(am,ep);results.push('Comparison: $'+fmt(am)+' charge via '+pd+' \\u2192 fee '+mny(ff.tf)+' ('+pct(ff.er)+'), net '+mny(ff.net));}" +
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
  generate(inputs: Record<string, string>): string[] {
    return calculateStripeFee(inputs);
  },
  staticExamples: ['⏰ Stripe Fee Calculator\n\n💰 Single Charge Breakdown:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Charge Amount:        $100\n• Provider:             Stripe (US)\n• Percentage Fee:       $3  (2.9%)\n• Fixed Fee:            $0\n• Total Fee:            $3\n• Net Received:         $97   ← what hits your bank\n• Effective Fee Rate:   3.2%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Provider Comparison (for $100 charge, sorted by total fee):\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Wise                    fee:       $2  (1.50 + 0.00)  net: $99\n• Square                  fee:       $3  (2.60 + 0.10)  net: $97\n• Stripe (US) (selected)  fee:       $3  (2.90 + 0.30)  net: $97 ← selected\n• PayPal                  fee:       $4  (3.50 + 0.00)  net: $97\n• Stripe (International)  fee:       $5  (4.40 + 0.30)  net: $95\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Fee Efficiency Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟠 above average\n• Industry average: ~2.9% + 30¢ (Stripe US standard)\n• On $100 charge: fixed fee is 0.3% of total fee.\n• Vs average: 🟠 worse than average\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Volume Projection:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Monthly:  $10,000 gross  →  $320 fees  →  $9,680 net\n• Yearly:   $120,000 gross  →  $3,840 fees  →  $116,160 net\n• Annualized impact: fees cost $3,840/yr — could fund ~77 extra transactions at your average ticket.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even on Provider Choice:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Cheapest provider: Wise ($2 per $100 charge)\n• Most expensive:    Stripe (International) ($5 per $100 charge)\n• Annual savings if switching: $3,840\n• Switching friction: Stripe ↔ PayPal takes 1-2 weeks; Wise requires account setup + payout delays.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Raise price by $1:                 $101 charge → net $98 (+$1 vs current)\n• Pass fees to customer:            charge $103 instead of $100 (add $3) to net the same amount\n• Switch to annual billing:         save $3,960/yr in fixed fees (11 fewer transactions × 0.30)\n• Negotiate 0.5% volume discount:   save $300/yr (volume below $50K MRR — partial credit)\n• Bundle 12 transactions:           fee on $1,200 single charge ($35) vs 12× current ($38) — save $3\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: Stripe fees are unavoidable but negotiable at $50K+ MRR. Each 0.1% reduction saves $384/yr at your volume. Consider annual plans (lower per-tx fees), pass fees to customers (+$3 to cover $100), or compare Wise for international.\nComparison: $1 charge via Stripe (US) → fee $0 (32.9%), net $1\nComparison: $10 charge via Stripe (US) → fee $1 (5.9%), net $9\nComparison: $100 charge via Stripe (US) → fee $3 (3.2%), net $97\nComparison: $1,000 charge via Stripe (US) → fee $29 (2.9%), net $971\nComparison: $10,000 charge via Stripe (US) → fee $290 (2.9%), net $9,710'],
  faq: [
    { q: 'How much does Stripe charge per transaction?', a: 'Stripe charges 2.9% + 30¢ per successful card transaction for US-based businesses. International cards add an extra 1.5% (4.4% + 30¢ total). There are no monthly fees, no setup fees, and no hidden costs. Stripe also charges $15 for chargebacks (disputed transactions) and 0.5% for currency conversion if you receive payments in a currency other than your account\'s default. ACH direct debit and SEPA transfers are cheaper (0.8% capped at $5) but take 2-3 business days to settle.' },
    { q: 'How do I calculate Stripe fees for my business?', a: 'Use the formula: total fee = charge amount × 2.9% + $0.30. For a $100 charge: $100 × 0.029 + $0.30 = $3.20. Net received: $96.80. For international cards, multiply by 4.4% instead of 2.9%. For high volume (>$50K MRR), Stripe negotiates lower rates — contact their sales team. To project annual fees, multiply per-transaction fee by your monthly volume × 12.' },
    { q: 'Is Stripe or PayPal cheaper for small transactions?', a: 'For small transactions under $5, PayPal is cheaper because it has no fixed fee (3.5% flat). Stripe\'s 30¢ fixed fee dominates on small charges — e.g., a $1 charge incurs 32.9% in fees ($0.30 fixed + $0.029 percentage). PayPal on $1: 3.5% = $0.035. For transactions over $15, Stripe is cheaper (2.9% + 30¢ beats 3.5% flat). Wise is cheapest at 1.5% but only for US-to-US transfers; cross-border fees vary by corridor.' },
    { q: 'Can I pass Stripe fees to my customers?', a: 'Yes — most US states allow surcharging, but the rules are strict. You can add a percentage fee (e.g., 3%) to the customer\'s total to cover processing costs. For a $100 charge, charge $103.09 to net $100 after Stripe takes 2.9% + 30¢. Some states (Connecticut, Massachusetts, Illinois, and others) prohibit credit card surcharging. Debit card surcharging is banned nationwide. An alternative is cash discount programs (lower listed price, higher card price) which have fewer restrictions. Always display surcharges clearly on your checkout page.' },
    { q: 'How do I negotiate lower Stripe fees?', a: 'Stripe publishes standard rates (2.9% + 30¢) but negotiates volume discounts for businesses processing $50K+ per month. To start: contact Stripe sales with your monthly volume, average transaction size, and growth trajectory. Typical reductions are 0.1-0.3% (saves $500-$1,500/mo at $50K MRR). Other negotiation levers: international card surcharges, ACH/wire pricing, multi-product accounts (Stripe Billing + Connect), and committing to multi-year contracts. If Stripe won\'t budge, mention that you\'re evaluating Adyen or Braintree — competitive quotes often unlock better rates.' },
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
};

registerEngine(engine);
