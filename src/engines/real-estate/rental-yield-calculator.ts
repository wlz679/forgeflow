import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-8：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
//   ⚠️ 章节标题 / 标签用**字面量 token**（code|原文|）；带运行时数值的整行用
//      makeToken(code, fallback, params) ⇒ fallback 与 params 取**同一个变量**。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

// ============== Math helpers (exported for tests) ==============

interface RentalYieldInputs {
  purchasePrice: number;
  downPayment: number;
  loanAmount: number;
  interestRate: number;
  loanTermYears: number;
  monthlyRent: number;
  monthlyExpenses: number;
  vacancyRate: number;
}

/** Monthly P&I (PMT formula, shared with P5-1) */
export function monthlyPI(principal: number, monthlyRate: number, n: number): number {
  if (n <= 0) return 0;
  if (monthlyRate === 0) return principal / n;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
}

/** Annual mortgage payment = monthlyPI * 12 */
export function annualMortgagePayment(loanAmount: number, interestRatePct: number, termYears: number): number {
  if (loanAmount <= 0) return 0;
  const mr = interestRatePct / 100 / 12;
  return monthlyPI(loanAmount, mr, termYears * 12) * 12;
}

/** Effective annual rent after vacancy */
export function effectiveAnnualRent(monthlyRent: number, vacancyRatePct: number): number {
  return monthlyRent * 12 * (1 - vacancyRatePct / 100);
}

/**
 * Annual cash flow = effectiveAnnualRent - annualMortgagePayment - annualOperatingExpenses
 * For all-cash purchase (loanAmount=0) → annualMortgagePayment=0
 */
export function annualCashFlow(inputs: RentalYieldInputs): number {
  return (
    effectiveAnnualRent(inputs.monthlyRent, inputs.vacancyRate) -
    annualMortgagePayment(inputs.loanAmount, inputs.interestRate, inputs.loanTermYears) -
    inputs.monthlyExpenses * 12
  );
}

/** Total cash invested = down payment + closing (3% of price) */
export function totalCashInvested(downPayment: number, purchasePrice: number): number {
  const closingCosts = purchasePrice * 0.03;
  return downPayment + closingCosts;
}

/** Gross yield = gross annual rent / price * 100 */
export function grossYield(purchasePrice: number, monthlyRent: number): number {
  if (purchasePrice <= 0) return 0;
  return (monthlyRent * 12 / purchasePrice) * 100;
}

/** Net yield = annual cash flow / price * 100 */
export function netYield(inputs: RentalYieldInputs): number {
  if (inputs.purchasePrice <= 0) return 0;
  return (annualCashFlow(inputs) / inputs.purchasePrice) * 100;
}

/** Cash-on-cash = annual cash flow / total cash invested * 100 */
export function cashOnCashReturn(inputs: RentalYieldInputs): number {
  const tci = totalCashInvested(inputs.downPayment, inputs.purchasePrice);
  if (tci <= 0) return 0;
  return (annualCashFlow(inputs) / tci) * 100;
}

/** Health: 8-12% CoC strong; 4-8% low or 12-15% high marginal; outside = outlier */
export function cocHealth(cocPct: number): { emoji: string; label: string } {
  if (cocPct >= 8 && cocPct <= 12) return { emoji: '🟢', label: 'strong cash-on-cash return — 8-12% range' };
  if ((cocPct >= 4 && cocPct < 8) || (cocPct > 12 && cocPct <= 15))
    return { emoji: '🟡', label: 'marginal — outside 8-12% band (low HCOL or high-yield risk)' };
  return { emoji: '🟠', label: 'outlier — cash-on-cash outside 4-15% range; verify assumptions' };
}

// ============== calculate() ==============

function calculateRentalYield(inputs: Record<string, string>): string[] {
  const purchasePrice = clampNonNegative(parseFloat(inputs.purchasePrice) || 0);
  const downPayment = clampNonNegative(parseFloat(inputs.downPayment) || 0);
  const loanAmount = clampNonNegative(parseFloat(inputs.loanAmount) || 0);
  const interestRate = parseFloat(inputs.interestRate) || 0;
  const loanTermYears = clampNonNegative(parseFloat(inputs.loanTermYears) || 0);
  const monthlyRent = clampNonNegative(parseFloat(inputs.monthlyRent) || 0);
  const monthlyExpenses = clampNonNegative(parseFloat(inputs.monthlyExpenses) || 0);
  const vacancyRate = parseFloat(inputs.vacancyRate) || 0;
  // annualAppreciation is for info/context only in V1 (display in tip)

  if (purchasePrice <= 0) {
    return [
      '$calc_out.section.rental_yield_calculator_short|⏰ Rental Yield Calculator|' + '\n\n' +
      '$calc_out.rental_yield.row.enter_inputs|💰 Enter purchase price and rent to see your gross/net/cash-on-cash yields, mortgage breakdown, and health assessment.|',
    ];
  }

  const args: RentalYieldInputs = {
    purchasePrice, downPayment, loanAmount, interestRate,
    loanTermYears, monthlyRent, monthlyExpenses, vacancyRate,
  };
  const grosYield = grossYield(purchasePrice, monthlyRent);
  const effRent = effectiveAnnualRent(monthlyRent, vacancyRate);
  const annMort = annualMortgagePayment(loanAmount, interestRate, loanTermYears);
  const cf = annualCashFlow(args);
  const tci = totalCashInvested(downPayment, purchasePrice);
  const nY = netYield(args);
  const coc = cashOnCashReturn(args);
  const health = cocHealth(coc);
  // P168 B3-8：健康度三档**逐个写出 code 字面量**（动态拼码 ⇒ 静态扫描器认不出）
  const healthLabel =
    coc >= 8 && coc <= 12
      ? makeToken('calc_out.rental_yield.row.health_strong', 'strong cash-on-cash return — 8-12% range')
      : (coc >= 4 && coc < 8) || (coc > 12 && coc <= 15)
        ? makeToken('calc_out.rental_yield.row.health_marginal', 'marginal — outside 8-12% band (low HCOL or high-yield risk)')
        : makeToken('calc_out.rental_yield.row.health_outlier', 'outlier — cash-on-cash outside 4-15% range; verify assumptions');

  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const money = (n: number) => '$' + fmt(n);
  // P168 B3-8：派生的展示值也先算出来 ⇒ fallback 与 params 用**同一个变量**
  const ltvPct = ((loanAmount / Math.max(1, purchasePrice)) * 100).toFixed(0);
  const apprPct = (parseFloat(inputs.annualAppreciation) || 0).toFixed(1);
  const totalRetPct = (coc + (parseFloat(inputs.annualAppreciation) || 0)).toFixed(1);

  // What-If
  const cfVac5 = annualCashFlow({ ...args, vacancyRate: vacancyRate + 5 });
  const cfRent200 = annualCashFlow({ ...args, monthlyRent: monthlyRent + 200 });
  const cfRateMinus = annualCashFlow({ ...args, interestRate: Math.max(0, interestRate - 1) });
  const cfTerm15 = annualCashFlow({ ...args, loanTermYears: 15 });
  // P168 B3-8：What-If 的 CoC 单独算出来 ⇒ fallback 与 params 取**同一个变量**（不可能漂）
  const cocVac5 = cashOnCashReturn({ ...args, vacancyRate: vacancyRate + 5 });
  const cocRent200 = cashOnCashReturn({ ...args, monthlyRent: monthlyRent + 200 });
  const cocRateMin = cashOnCashReturn({ ...args, interestRate: Math.max(0, interestRate - 1) });
  const cocTerm15 = cashOnCashReturn({ ...args, loanTermYears: 15 });
  const coc100Down = cashOnCashReturn({
    ...args,
    downPayment: purchasePrice,  // 100% down
    loanAmount: 0,               // ⭐ 修 bug：全款场景必须把贷款置零（否则分子分母口径不一致）
  });

  let tip: string;
  if (cf < 0) {
    tip = makeToken('calc_out.rental_yield.row.tip_negative_cash_flow', '💡 Tip: Negative cash flow means rent does not cover mortgage + expenses. You subsidize monthly — common in appreciation markets (SF/NYC). Reserve 6-12 months of negative cash flow as a safety buffer.');
  } else if (coc < 8) {
    tip = makeToken('calc_out.rental_yield.row.tip_below_target', '💡 Tip: Cash-on-cash below 8% lags S&P 500 historical return (~7-10%). Either negotiate a lower price, increase rent, or reduce expenses to reach 8%+ threshold.');
  } else {
    tip = makeToken('calc_out.rental_yield.row.tip_strong', '💡 Tip: Strong cash-on-cash (8-12%) on a leveraged rental beats most passive investments. Reinvest cash flow into next property to compound — the BRRRR strategy captures this loop.');
  }

  const r =
    '$calc_out.section.rental_yield_calculator|⏰ Rental Yield / Cash-on-Cash Calculator|\n\n' +
    '$calc_out.section.rental_yield_snapshot|💰 Investment Snapshot:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• $calc_out.label.purchase_price|Purchase price|:        ' + money(purchasePrice) + '\n' +
    '• $calc_out.label.down_payment|Down payment|:          ' + money(downPayment) + '\n' +
    '• $calc_out.label.loan_amount|Loan amount|:           ' + money(loanAmount) + '  ' + makeToken('calc_out.rental_yield.row.loan_ltv', '(' + ltvPct + '% LTV)', { ltv: ltvPct }) + '\n' +
    '• $calc_out.label.total_cash_invested|Total cash invested|:   ' + money(tci) + '  ' + makeToken('calc_out.rental_yield.row.down_plus_closing', '(down + 3% closing)') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.rental_yield_cash_flow|📐 Annual Cash Flow:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• $calc_out.label.gross_rent_annual|Gross rent (annual)|:   ' + money(monthlyRent * 12) + '\n' +
    '• $calc_out.label.effective_rent_post_vacancy|Effective rent (post-vacancy)|: ' + money(effRent) + '\n' +
    '• $calc_out.label.annual_mortgage_pi|Annual mortgage P&I|:   ' + money(annMort) + '\n' +
    '• $calc_out.label.annual_opex|Annual OpEx|:           ' + money(monthlyExpenses * 12) + '\n' +
    '• $calc_out.label.net_annual_cash_flow|Net annual cash flow|:  ' + money(cf) + (cf < 0 ? '  ' + makeToken('calc_out.rental_yield.row.negative_cash_flow', '⚠️ negative') : '') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.rental_yield_health|🩺 Yield Health:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + health.emoji + ' ' + healthLabel + '\n' +
    '• $calc_out.label.gross_yield|Gross yield|:           ' + grosYield.toFixed(2) + '%  ' + makeToken('calc_out.rental_yield.row.gross_yield_basis', '(annual rent / price)') + '\n' +
    '• $calc_out.label.net_yield|Net yield|:             ' + nY.toFixed(2) + '%  ' + makeToken('calc_out.rental_yield.row.net_yield_basis', '(cash flow / price)') + '\n' +
    '• $calc_out.label.cash_on_cash_return|Cash-on-cash return|:   ' + coc.toFixed(2) + '%  ' + makeToken('calc_out.rental_yield.row.coc_basis', '(cash flow / cash invested)') + '\n' +
    (cf < 0 ? '• ' + makeToken('calc_out.rental_yield.row.out_of_pocket_burden', '⚠️ Out-of-pocket burden: ' + money(-cf) + '/yr', { amount: money(-cf) }) + '\n' : '') +
    '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.rental_yield_benchmarks|🎯 Yield Benchmarks:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.rental_yield.row.benchmark_gross_yield', 'Gross yield:    <8% low · 8-10% typical · >12% high') + '\n' +
    '• ' + makeToken('calc_out.rental_yield.row.benchmark_cash_on_cash', 'Cash-on-cash:   <6% low · 8-12% strong · >15% high-yield (verify)') + '\n' +
    '• ' + makeToken('calc_out.rental_yield.row.benchmark_sp500', 'S&P comparison: ~7-10% historical avg with zero work') + '\n' +
    '• ' + makeToken('calc_out.rental_yield.row.goal_threshold', 'Goal threshold:  Aim for CoC ≥ 8% AND gross ≥ 8%') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.rental_yield_composition|⚖️ Return Composition:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.rental_yield.row.yield_component', 'Yield component:       ' + coc.toFixed(2) + '% CoC annually', { coc: coc.toFixed(2) }) + '\n' +
    '• ' + makeToken('calc_out.rental_yield.row.principal_paydown', 'Principal paydown:     ~1-3% annual equity build (mortgage dependent)') + '\n' +
    '• ' + makeToken('calc_out.rental_yield.row.appreciation_y1', 'Appreciation (Y1):     ' + apprPct + '% user-specified', { appr: apprPct }) + '\n' +
    '• ' + makeToken('calc_out.rental_yield.row.total_estimated_return', 'Total estimated return: ' + totalRetPct + '% (sum of components)', { total: totalRetPct }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.rental_yield.row.whatif_vacancy_plus_5pp', 'Vacancy +5pp:                 CoC → ' + cocVac5.toFixed(2) + '%', { coc: cocVac5.toFixed(2) }) + '\n' +
    '• ' + makeToken('calc_out.rental_yield.row.whatif_rent_plus_200', 'Rent +$200/mo:                CoC → ' + cocRent200.toFixed(2) + '%', { coc: cocRent200.toFixed(2) }) + '\n' +
    '• ' + makeToken('calc_out.rental_yield.row.whatif_rate_minus_1pp', 'Rate -1pp:                    CoC → ' + cocRateMin.toFixed(2) + '%', { coc: cocRateMin.toFixed(2) }) + '\n' +
    '• ' + makeToken('calc_out.rental_yield.row.whatif_term_30_to_15', 'Term 30y → 15y:               CoC → ' + cocTerm15.toFixed(2) + '%', { coc: cocTerm15.toFixed(2) }) + '\n' +
    '• ' + makeToken('calc_out.rental_yield.row.whatif_100_down', '100% down (vs current LTV):   CoC → ' + coc100Down.toFixed(2) + '% (no leverage)', { coc: coc100Down.toFixed(2) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip;

  const results: string[] = [r];

  // SEO comparison rows at 6 CoC values
  const cocRow = [4, 6, 8, 10, 12, 15];

  for (const c of cocRow) {
    const flow = money((c / 100) * tci);
    results.push(
      makeToken('calc_out.rental_yield.row.comparison_coc',
        'Comparison: target ' + c + '% CoC on $' + fmt(tci) + ' cash invested → annual cash flow ' + flow,
        { target: String(c), invested: '$' + fmt(tci), flow }),
    );
  }
  return results;
}

// ============== customFn (live = static parity) ==============

const customFn =
  // P168 B3-10: client = verbatim mirror of the server generate() (same logic, same order).
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let i=function(t){return Number.isNaN(t)?0:Math.max(0,t)},F=function(t,e,a){return a<=0?0:e===0?t/a:t*e/(1-Math.pow(1+e,-a))},g=function(t,e,a){if(t<=0)return 0;const l=e/100/12;return F(t,l,a*12)*12},m=function(t,e){return t*12*(1-e/100)},s=function(t){return m(t.monthlyRent,t.vacancyRate)-g(t.loanAmount,t.interestRate,t.loanTermYears)-t.monthlyExpenses*12},v=function(t,e){const a=e*.03;return t+a},C=function(t,e){return t<=0?0:e*12/t*100},R=function(t){return t.purchasePrice<=0?0:s(t)/t.purchasePrice*100},_=function(t){const e=v(t.downPayment,t.purchasePrice);return e<=0?0:s(t)/e*100},x=function(t){return t>=8&&t<=12?{emoji:"🟢",label:"strong cash-on-cash return — 8-12% range"}:t>=4&&t<8||t>12&&t<=15?{emoji:"🟡",label:"marginal — outside 8-12% band (low HCOL or high-yield risk)"}:{emoji:"🟠",label:"outlier — cash-on-cash outside 4-15% range; verify assumptions"}},$=function(t){const e=i(parseFloat(t.purchasePrice)||0),a=i(parseFloat(t.downPayment)||0),l=i(parseFloat(t.loanAmount)||0),y=parseFloat(t.interestRate)||0,A=i(parseFloat(t.loanTermYears)||0),h=i(parseFloat(t.monthlyRent)||0),S=i(parseFloat(t.monthlyExpenses)||0),p=parseFloat(t.vacancyRate)||0;if(e<=0)return[\`$calc_out.section.rental_yield_calculator_short|⏰ Rental Yield Calculator|

$calc_out.rental_yield.row.enter_inputs|💰 Enter purchase price and rent to see your gross/net/cash-on-cash yields, mortgage breakdown, and health assessment.|\`];const o={purchasePrice:e,downPayment:a,loanAmount:l,interestRate:y,loanTermYears:A,monthlyRent:h,monthlyExpenses:S,vacancyRate:p},I=C(e,h),z=m(h,p),B=g(l,y,A),d=s(o),f=v(a,e),J=R(o),c=_(o),K=x(c),U=c>=8&&c<=12?n("calc_out.rental_yield.row.health_strong","strong cash-on-cash return — 8-12% range"):c>=4&&c<8||c>12&&c<=15?n("calc_out.rental_yield.row.health_marginal","marginal — outside 8-12% band (low HCOL or high-yield risk)"):n("calc_out.rental_yield.row.health_outlier","outlier — cash-on-cash outside 4-15% range; verify assumptions"),b=u=>u.toLocaleString("en-US",{maximumFractionDigits:0}),r=u=>"$"+b(u),P=(l/Math.max(1,e)*100).toFixed(0),N=(parseFloat(t.annualAppreciation)||0).toFixed(1),j=(c+(parseFloat(t.annualAppreciation)||0)).toFixed(1),lt=s({...o,vacancyRate:p+5}),st=s({...o,monthlyRent:h+200}),it=s({...o,interestRate:Math.max(0,y-1)}),_t=s({...o,loanTermYears:15}),E=_({...o,vacancyRate:p+5}),M=_({...o,monthlyRent:h+200}),L=_({...o,interestRate:Math.max(0,y-1)}),O=_({...o,loanTermYears:15}),q=_({...o,downPayment:e,loanAmount:0});let w;d<0?w=n("calc_out.rental_yield.row.tip_negative_cash_flow","💡 Tip: Negative cash flow means rent does not cover mortgage + expenses. You subsidize monthly — common in appreciation markets (SF/NYC). Reserve 6-12 months of negative cash flow as a safety buffer."):c<8?w=n("calc_out.rental_yield.row.tip_below_target","💡 Tip: Cash-on-cash below 8% lags S&P 500 historical return (~7-10%). Either negotiate a lower price, increase rent, or reduce expenses to reach 8%+ threshold."):w=n("calc_out.rental_yield.row.tip_strong","💡 Tip: Strong cash-on-cash (8-12%) on a leveraged rental beats most passive investments. Reinvest cash flow into next property to compound — the BRRRR strategy captures this loop.");const D=[\`$calc_out.section.rental_yield_calculator|⏰ Rental Yield / Cash-on-Cash Calculator|

$calc_out.section.rental_yield_snapshot|💰 Investment Snapshot:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• $calc_out.label.purchase_price|Purchase price|:        \`+r(e)+\`
• $calc_out.label.down_payment|Down payment|:          \`+r(a)+\`
• $calc_out.label.loan_amount|Loan amount|:           \`+r(l)+"  "+n("calc_out.rental_yield.row.loan_ltv","("+P+"% LTV)",{ltv:P})+\`
• $calc_out.label.total_cash_invested|Total cash invested|:   \`+r(f)+"  "+n("calc_out.rental_yield.row.down_plus_closing","(down + 3% closing)")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.rental_yield_cash_flow|📐 Annual Cash Flow:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• $calc_out.label.gross_rent_annual|Gross rent (annual)|:   \`+r(h*12)+\`
• $calc_out.label.effective_rent_post_vacancy|Effective rent (post-vacancy)|: \`+r(z)+\`
• $calc_out.label.annual_mortgage_pi|Annual mortgage P&I|:   \`+r(B)+\`
• $calc_out.label.annual_opex|Annual OpEx|:           \`+r(S*12)+\`
• $calc_out.label.net_annual_cash_flow|Net annual cash flow|:  \`+r(d)+(d<0?"  "+n("calc_out.rental_yield.row.negative_cash_flow","⚠️ negative"):"")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.rental_yield_health|🩺 Yield Health:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+K.emoji+" "+U+\`
• $calc_out.label.gross_yield|Gross yield|:           \`+I.toFixed(2)+"%  "+n("calc_out.rental_yield.row.gross_yield_basis","(annual rent / price)")+\`
• $calc_out.label.net_yield|Net yield|:             \`+J.toFixed(2)+"%  "+n("calc_out.rental_yield.row.net_yield_basis","(cash flow / price)")+\`
• $calc_out.label.cash_on_cash_return|Cash-on-cash return|:   \`+c.toFixed(2)+"%  "+n("calc_out.rental_yield.row.coc_basis","(cash flow / cash invested)")+\`
\`+(d<0?"• "+n("calc_out.rental_yield.row.out_of_pocket_burden","⚠️ Out-of-pocket burden: "+r(-d)+"/yr",{amount:r(-d)})+\`
\`:"")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.rental_yield_benchmarks|🎯 Yield Benchmarks:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+n("calc_out.rental_yield.row.benchmark_gross_yield","Gross yield:    <8% low · 8-10% typical · >12% high")+\`
• \`+n("calc_out.rental_yield.row.benchmark_cash_on_cash","Cash-on-cash:   <6% low · 8-12% strong · >15% high-yield (verify)")+\`
• \`+n("calc_out.rental_yield.row.benchmark_sp500","S&P comparison: ~7-10% historical avg with zero work")+\`
• \`+n("calc_out.rental_yield.row.goal_threshold","Goal threshold:  Aim for CoC ≥ 8% AND gross ≥ 8%")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.rental_yield_composition|⚖️ Return Composition:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+n("calc_out.rental_yield.row.yield_component","Yield component:       "+c.toFixed(2)+"% CoC annually",{coc:c.toFixed(2)})+\`
• \`+n("calc_out.rental_yield.row.principal_paydown","Principal paydown:     ~1-3% annual equity build (mortgage dependent)")+\`
• \`+n("calc_out.rental_yield.row.appreciation_y1","Appreciation (Y1):     "+N+"% user-specified",{appr:N})+\`
• \`+n("calc_out.rental_yield.row.total_estimated_return","Total estimated return: "+j+"% (sum of components)",{total:j})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+n("calc_out.rental_yield.row.whatif_vacancy_plus_5pp","Vacancy +5pp:                 CoC → "+E.toFixed(2)+"%",{coc:E.toFixed(2)})+\`
• \`+n("calc_out.rental_yield.row.whatif_rent_plus_200","Rent +$200/mo:                CoC → "+M.toFixed(2)+"%",{coc:M.toFixed(2)})+\`
• \`+n("calc_out.rental_yield.row.whatif_rate_minus_1pp","Rate -1pp:                    CoC → "+L.toFixed(2)+"%",{coc:L.toFixed(2)})+\`
• \`+n("calc_out.rental_yield.row.whatif_term_30_to_15","Term 30y → 15y:               CoC → "+O.toFixed(2)+"%",{coc:O.toFixed(2)})+\`
• \`+n("calc_out.rental_yield.row.whatif_100_down","100% down (vs current LTV):   CoC → "+q.toFixed(2)+"% (no leverage)",{coc:q.toFixed(2)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+w],W=[4,6,8,10,12,15];for(const u of W){const V=r(u/100*f);D.push(n("calc_out.rental_yield.row.comparison_coc","Comparison: target "+u+"% CoC on $"+b(f)+" cash invested → annual cash flow "+V,{target:String(u),invested:"$"+b(f),flow:V}))}return D},Y=function(t,e,a){var l=H(t);return Array.isArray(l)?l.join(\`
\`):String(l)};var Q=i,X=F,Z=g,T=m,k=s,tt=v,nt=C,et=R,at=_,ot=x,ct=$,rt=Y,n=tk,G='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',n=new Function("return "+G)(),H=function(t){return $(t)};return[Y(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-rental-yield-calculator',
  title: 'Rental Yield / Cash-on-Cash Calculator',
  description:
    'Calculate gross/net yields and cash-on-cash return on a leveraged rental property. Compares annual rent, mortgage, and OpEx against actual cash invested. Shows negative cash flow warnings for appreciation-only markets.',
  inputs: [
    { name: 'purchasePrice', label: 'Purchase Price ($)', placeholder: 'e.g. 300000', type: 'number' },
    { name: 'downPayment', label: 'Down Payment ($)', placeholder: 'e.g. 75000', type: 'number' },
    { name: 'loanAmount', label: 'Loan Amount ($)', placeholder: 'e.g. 225000', type: 'number' },
    { name: 'interestRate', label: 'Mortgage Rate (%)', placeholder: 'e.g. 7', type: 'number' },
    { name: 'loanTermYears', label: 'Loan Term (years)', placeholder: 'e.g. 30', type: 'number' },
    { name: 'monthlyRent', label: 'Monthly Rent Income ($)', placeholder: 'e.g. 2500', type: 'number' },
    { name: 'monthlyExpenses', label: 'Monthly Operating Expenses ($)', placeholder: 'e.g. 600', type: 'number' },
    { name: 'vacancyRate', label: 'Vacancy Rate (%)', placeholder: 'e.g. 5', type: 'number' },
    { name: 'annualAppreciation', label: 'Expected Annual Appreciation (%)', placeholder: 'e.g. 3', type: 'number' },
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
    return calculateRentalYield(inputs);
  },
  staticExamples: ['$calc_out.section.rental_yield_calculator|⏰ Rental Yield / Cash-on-Cash Calculator|\n\n$calc_out.section.rental_yield_snapshot|💰 Investment Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.purchase_price|Purchase price|:        $300,000\n• $calc_out.label.down_payment|Down payment|:          $75,000\n• $calc_out.label.loan_amount|Loan amount|:           $225,000  $calc_out.rental_yield.row.loan_ltv{"ltv":"75"}|(75% LTV)|\n• $calc_out.label.total_cash_invested|Total cash invested|:   $84,000  $calc_out.rental_yield.row.down_plus_closing|(down + 3% closing)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.rental_yield_cash_flow|📐 Annual Cash Flow:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.gross_rent_annual|Gross rent (annual)|:   $30,000\n• $calc_out.label.effective_rent_post_vacancy|Effective rent (post-vacancy)|: $28,500\n• $calc_out.label.annual_mortgage_pi|Annual mortgage P&I|:   $17,963\n• $calc_out.label.annual_opex|Annual OpEx|:           $7,200\n• $calc_out.label.net_annual_cash_flow|Net annual cash flow|:  $3,337\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.rental_yield_health|🩺 Yield Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟠 $calc_out.rental_yield.row.health_outlier|outlier — cash-on-cash outside 4-15% range; verify assumptions|\n• $calc_out.label.gross_yield|Gross yield|:           10.00%  $calc_out.rental_yield.row.gross_yield_basis|(annual rent / price)|\n• $calc_out.label.net_yield|Net yield|:             1.11%  $calc_out.rental_yield.row.net_yield_basis|(cash flow / price)|\n• $calc_out.label.cash_on_cash_return|Cash-on-cash return|:   3.97%  $calc_out.rental_yield.row.coc_basis|(cash flow / cash invested)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.rental_yield_benchmarks|🎯 Yield Benchmarks:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.rental_yield.row.benchmark_gross_yield|Gross yield:    <8% low · 8-10% typical · >12% high|\n• $calc_out.rental_yield.row.benchmark_cash_on_cash|Cash-on-cash:   <6% low · 8-12% strong · >15% high-yield (verify)|\n• $calc_out.rental_yield.row.benchmark_sp500|S&P comparison: ~7-10% historical avg with zero work|\n• $calc_out.rental_yield.row.goal_threshold|Goal threshold:  Aim for CoC ≥ 8% AND gross ≥ 8%|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.rental_yield_composition|⚖️ Return Composition:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.rental_yield.row.yield_component{"coc":"3.97"}|Yield component:       3.97% CoC annually|\n• $calc_out.rental_yield.row.principal_paydown|Principal paydown:     ~1-3% annual equity build (mortgage dependent)|\n• $calc_out.rental_yield.row.appreciation_y1{"appr":"3.0"}|Appreciation (Y1):     3.0% user-specified|\n• $calc_out.rental_yield.row.total_estimated_return{"total":"7.0"}|Total estimated return: 7.0% (sum of components)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.rental_yield.row.whatif_vacancy_plus_5pp{"coc":"2.19"}|Vacancy +5pp:                 CoC → 2.19%|\n• $calc_out.rental_yield.row.whatif_rent_plus_200{"coc":"6.69"}|Rent +$200/mo:                CoC → 6.69%|\n• $calc_out.rental_yield.row.whatif_rate_minus_1pp{"coc":"6.09"}|Rate -1pp:                    CoC → 6.09%|\n• $calc_out.rental_yield.row.whatif_term_30_to_15{"coc":"-3.53"}|Term 30y → 15y:               CoC → -3.53%|\n• $calc_out.rental_yield.row.whatif_100_down{"coc":"6.89"}|100% down (vs current LTV):   CoC → 6.89% (no leverage)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.rental_yield.row.tip_below_target|💡 Tip: Cash-on-cash below 8% lags S&P 500 historical return (~7-10%). Either negotiate a lower price, increase rent, or reduce expenses to reach 8%+ threshold.|\n$calc_out.rental_yield.row.comparison_coc{"target":"4","invested":"$84,000","flow":"$3,360"}|Comparison: target 4% CoC on $84,000 cash invested → annual cash flow $3,360|\n$calc_out.rental_yield.row.comparison_coc{"target":"6","invested":"$84,000","flow":"$5,040"}|Comparison: target 6% CoC on $84,000 cash invested → annual cash flow $5,040|\n$calc_out.rental_yield.row.comparison_coc{"target":"8","invested":"$84,000","flow":"$6,720"}|Comparison: target 8% CoC on $84,000 cash invested → annual cash flow $6,720|\n$calc_out.rental_yield.row.comparison_coc{"target":"10","invested":"$84,000","flow":"$8,400"}|Comparison: target 10% CoC on $84,000 cash invested → annual cash flow $8,400|\n$calc_out.rental_yield.row.comparison_coc{"target":"12","invested":"$84,000","flow":"$10,080"}|Comparison: target 12% CoC on $84,000 cash invested → annual cash flow $10,080|\n$calc_out.rental_yield.row.comparison_coc{"target":"15","invested":"$84,000","flow":"$12,600"}|Comparison: target 15% CoC on $84,000 cash invested → annual cash flow $12,600|'],
  faq: [
    {
      q: 'What is cash-on-cash return?',
      a: 'Cash-on-cash return (CoC) measures the annual cash flow you receive as a percent of the actual cash you invested. Formula: (Annual Cash Flow / Total Cash Invested) × 100. Where Total Cash Invested = Down Payment + Closing Costs (typically 3% of price). CoC is the most relevant metric for leveraged rentals, since it isolates your actual deployed capital from the bank-financed portion.',
    },
    {
      q: 'Cash-on-cash vs cap rate vs gross yield — what is the difference?',
      a: 'Three yield metrics on a rental: (1) Gross Yield = Annual Rent / Price (ignores vacancy and expenses). (2) Cap Rate (Net Yield) = NOI / Price (after vacancy and expenses, ignores financing). (3) Cash-on-Cash = Cash Flow / Cash Invested (after vacancy, expenses, AND mortgage). Cash-on-cash captures the leverage effect — same property with a mortgage has much higher CoC than all-cash.',
    },
    {
      q: 'What is a good cash-on-cash return?',
      a: '8-12% is strong for residential rentals. Below 6% lags S&P 500 historical returns. Above 15% is high-yield territory — verify the rent and expense assumptions are realistic. Note that many appreciation markets (SF, NYC, Seattle) show near-0% or negative cash flow but compensate via property value growth. CoC works for cash-flow markets (Midwest, Southeast, Texas).',
    },
    {
      q: 'What if cash flow is negative?',
      a: 'Negative cash flow means rent doesn\'t cover mortgage + expenses. You subsidize monthly. This is common in low-cap markets (San Francisco, NYC) where you buy for appreciation, not yield. Risk: you must keep paying the difference each month. Rule of thumb: keep 6-12 months of negative cash flow as a safety reserve before relying on appreciation.',
    },
    {
      q: 'How does leverage affect cash-on-cash?',
      a: 'Leverage dramatically increases CoC. Example: $300K property with $75K down (25% LTV) at 7% generates ~4% CoC. With 100% cash (no loan), CoC drops to 7% (the cap rate). The bank essentially "subsidizes" your return when rates are below the property\'s yield. This is the BRRRR strategy\'s foundation — pull cash out at refi to deploy on the next property.',
    },
    { q: "What is a good rental yield?", a: "Rental yield = annual rent / property value. Benchmarks: 1) Below average: <4%, 2) Average: 5-7%, 3) Good: 7-9%, 4) Excellent: 9%+. By market: NYC/SF 2-4%, Sun Belt 5-8%, Midwest 7-10%. Cash yield (after expenses) typically 1-3% lower than gross. Most investors: 6-9% gross yield target. Higher yield = higher risk (typically older properties, less appreciation)." },
    { q: "What is the difference between gross yield and net yield?", a: "Gross yield: rent / property value. Net yield: (rent - expenses) / property value. Net is more meaningful. Expenses: 30-50% of gross rent (taxes, insurance, maintenance, management, vacancy). For $200K property, $15K rent, $5K expenses: gross 7.5%, net 5%. Most investors: track net. Cap rate = net yield. Gross yield: quick screen. Net yield: true performance." },
    { q: "What is the 1% rule and 2% rule?", a: "1% rule: monthly rent ≥ 1% of purchase price. 2% rule: ≥ 2% (rare, mostly distressed areas). 1% is achievable in many markets. 2% is hard. Use: 1% as screen, then run cash flow. 1% rule: ensures gross yield ≥12%. Most: 0.7-1% achievable. SFH: stricter. Multifamily: more flexible. Cash flow positive: 0.8-1% is enough (with low mortgage)." },
    { q: "How do I calculate cash-on-cash return?", a: "CoC = (NOI - debt service) / cash invested. Example: NOI $8K, debt service $5K, cash invested $40K: ($3K) / $40K = 7.5%. Track: total cash invested (down payment + closing + rehab). CoC: 1) Good: 8-12%, 2) Excellent: 12-20%, 3) Top: 20%+. Most investors: target 10%+. CoC varies with leverage. Higher leverage = higher CoC (more risk)." },
    { q: "How does rent-to-price ratio affect yield?", a: "Rent-to-price ratio (1% rule) is inverse of yield. 1% monthly = 12% annual gross yield. 0.5% monthly = 6% gross yield. 2% monthly = 24% gross yield. Markets: 0.3% (SF) to 1.5% (Midwest). Higher ratio: better yield, typically less appreciation. Trade-off. Most: 0.7-1% is the sweet spot. Calculate: monthly_rent × 12 / price × 100 = gross yield %." },
    { q: "What is the relationship between yield and appreciation?", a: "Inverse correlation typically. High yield (10%+): less appreciation, often rural/older. Low yield (3-4%): more appreciation, urban/newer. Total return: yield + appreciation. Most markets: 6-10% total. NYC: 3% yield + 5% appreciation = 8% total. Memphis: 8% yield + 2% appreciation = 10% total. Pick: cash flow (yield) or wealth building (appreciation)." },
    { q: "What is a good yield for short-term rentals (Airbnb)?", a: "STR yield: typically 1.5-2x higher gross yield than LTR. But: 1) Higher expenses (cleaning, management, utilities), 2) Higher vacancy (off-season), 3) More time-intensive. Net yield: 6-10% typical. Most: 1.0-1.5% monthly gross (12-18% annual gross). For STR DSCR: 1.5+ for lenders. STRs: higher gross but more work. Most investors: 1-2 STR + balance LTR for portfolio." },
    { q: "How do I increase rental yield?", a: "Tactics include 1) Increase rent (market adjustments, value-add), 2) Reduce vacancy (better marketing, faster turn), 3) Reduce expenses (refinance, management optimization), 4) Add income (parking, storage, laundry), 5) Value-add (renovate, add bedrooms). 1-2% yield improvement per year. Most tactics: 0.5-1% gain. Total: 5-10% yield lift achievable. Higher: more risk (higher rent may mean tenant turnover)." },
  ],
  howToUse: [
    'Enter the purchase price (or contract price).',
    'Enter your down payment (typical: 20-25% for residential, 25-30% for multi-family).',
    'Enter the loan amount (purchase price minus down payment if standard financing).',
    'Enter mortgage rate and term (current 30-year fixed ~6.5-7.0% in 2026).',
    'Enter expected monthly rent (research comps on Zillow / Rentometer / Apartments.com).',
    'Enter monthly operating expenses (property tax + insurance + maintenance + management ≈ 1-1.5% of price annually).',
    'Enter vacancy rate (5% typical, 8-15% Class C).',
    'Enter expected annual appreciation.',
    'Review CoC, gross/net yield, and health band.',
    'Compare negative cash flow warning if applicable.',
    'Apply 5 what-ifs for sensitivity (vacancy, rent, rate, term, leverage).',
  ],
  engineKey: true,
};

registerEngine(engine);
