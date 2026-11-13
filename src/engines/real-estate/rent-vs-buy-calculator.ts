import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-7：结果输出 token 化 —— 服务端用 makeToken，客户端 customFn 前置
//   同一份实现（CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 两端逐字节相同，不可能漂。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

// ============== Math helpers (exported for tests) ==============

/** Monthly P&I (PMT formula). Zero-rate handled. */
export function monthlyPI(principal: number, monthlyRate: number, n: number): number {
  if (n <= 0) return 0;
  if (monthlyRate === 0) return principal / n;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
}

/**
 * Total rent paid over `years` years with annual increase `g`.
 * Geometric sum: monthlyRent * 12 * ((1+g)^N - 1) / g
 * Zero growth reduces to monthlyRent * 12 * N.
 */
export function totalRentPaidSeries(monthlyRent: number, annualRentIncreasePct: number, years: number): number {
  const g = annualRentIncreasePct / 100;
  if (years <= 0) return 0;
  if (g === 0) return monthlyRent * 12 * years;
  return monthlyRent * 12 * (Math.pow(1 + g, years) - 1) / g;
}

/**
 * Opportunity gain if down payment were invested at 7% annual (S&P average).
 * returns downPayment * ((1+r)^years - 1)
 */
export function opportunityGain(downPayment: number, annualReturnPct: number, years: number): number {
  if (years <= 0) return 0;
  return downPayment * (Math.pow(1 + annualReturnPct / 100, years) - 1);
}

/** futureValue = homePrice * (1 + appreciation)^years */
export function futureValue(homePrice: number, annualAppreciationPct: number, years: number): number {
  return homePrice * Math.pow(1 + annualAppreciationPct / 100, years);
}

interface NetCostBuyArgs {
  homePrice: number;
  downPayment: number;
  mortgageRate: number;
  yearsToStay: number;
  annualAppreciation: number;
}

/**
 * Net cost of buying over `yearsToStay`.
 * V1 simplification: assumes yearsToStay == loanTerm (30y typical), so remainingBalance = 0.
 */
export function netCostBuy(args: NetCostBuyArgs): {
  initialOutlay: number;
  totalMortgagePaid: number;
  totalHoldingCosts: number;
  sellingCosts: number;
  netProceeds: number;
  netCostBuy: number;
} {
  const principal = args.homePrice - args.downPayment;
  const monthlyRate = args.mortgageRate / 100 / 12;
  const n = args.yearsToStay * 12;
  const monthly = monthlyPI(principal, monthlyRate, n);
  const totalMortgagePaid = monthly * n;
  const fv = futureValue(args.homePrice, args.annualAppreciation, args.yearsToStay);
  const sellingCosts = fv * 0.06;
  const netProceeds = fv - sellingCosts;  // V1 simplification: remainingBalance = 0
  const buyClosingCosts = args.homePrice * 0.03;
  const initialOutlay = args.downPayment + buyClosingCosts;
  const monthlyPropertyTaxMaint = args.homePrice * 0.012 / 12;
  const totalHoldingCosts = monthlyPropertyTaxMaint * n;
  const cost = initialOutlay + totalMortgagePaid + totalHoldingCosts - netProceeds;
  return { initialOutlay, totalMortgagePaid, totalHoldingCosts, sellingCosts, netProceeds, netCostBuy: cost };
}

interface TotalRentCostArgs {
  monthlyRent: number;
  annualRentIncrease: number;
  downPayment: number;
  yearsToStay: number;
}

/**
 * Renting cost = total rent paid over stay MINUS opportunity gain from investing down payment at 7%.
 */
export function totalRentCost(args: TotalRentCostArgs): {
  totalRentPaid: number;
  opportunityGain: number;
  total: number;
} {
  const totalRentPaid = totalRentPaidSeries(args.monthlyRent, args.annualRentIncrease, args.yearsToStay);
  const oppGain = opportunityGain(args.downPayment, 7, args.yearsToStay);
  return { totalRentPaid, opportunityGain: oppGain, total: totalRentPaid - oppGain };
}

/**
 * Verdict based on savings = totalRentCost - netCostBuy.
 * - savings > 30K → 🟢 BUY strongly favored (buying saved you more than $30K)
 * - |savings| ≤ 30K → 🟡 CLOSE call
 * - savings < -30K → 🟠 RENT favored (renting saved you more than $30K)
 */
export function verdict(savings: number): { emoji: string; label: string } {
  // P168 B3-7：判定短语是**片段**（不是整行）⇒ verdict() 直接返回 token；
  //   Decision Snapshot 与 Verdict Health 两处复用同一个 token。
  if (savings > 30000) {
    return {
      emoji: '🟢',
      label: makeToken(
        'calc_out.rent_vs_buy.row.verdict_buy_strongly_favored',
        'BUY strongly favored — buying saves > $30K over renting',
      ),
    };
  }
  if (savings >= -30000) {
    return {
      emoji: '🟡',
      label: makeToken(
        'calc_out.rent_vs_buy.row.verdict_close_call',
        'CLOSE call — within $30K; sensitivity matters',
      ),
    };
  }
  return {
    emoji: '🟠',
    label: makeToken(
      'calc_out.rent_vs_buy.row.verdict_rent_favored',
      'RENT favored — renting saves > $30K over buying',
    ),
  };
}

// ============== calculate() ==============

function calculateRentVsBuy(inputs: Record<string, string>): string[] {
  const monthlyRent = clampNonNegative(parseFloat(inputs.monthlyRent) || 0);
  const homePrice = clampNonNegative(parseFloat(inputs.homePrice) || 0);
  const downPayment = clampNonNegative(parseFloat(inputs.downPayment) || 0);
  const mortgageRate = parseFloat(inputs.mortgageRate) || 0;
  const yearsToStay = clampNonNegative(parseFloat(inputs.yearsToStay) || 0);
  const annualAppreciation = parseFloat(inputs.annualAppreciation) || 0;
  const annualRentIncrease = parseFloat(inputs.annualRentIncrease) || 0;

  if (yearsToStay <= 0) {
    return [
      '$calc_out.section.rent_vs_buy_calculator|⏰ Rent-vs-Buy Calculator|' +
        '\n\n' +
        '$calc_out.rent_vs_buy.row.enter_years_required|💰 Enter years you plan to stay (>0). This is the horizon for the comparison.|',
    ];
  }
  if (homePrice <= 0 && monthlyRent <= 0) {
    return [
      '$calc_out.section.rent_vs_buy_calculator|⏰ Rent-vs-Buy Calculator|' +
        '\n\n' +
        '$calc_out.rent_vs_buy.row.enter_inputs_required|💰 Enter rent, home price, and down payment to compare total cost over your stay horizon.|',
    ];
  }

  // Default home price if only rent provided
  const effHomePrice = homePrice > 0 ? homePrice : monthlyRent * 200;  // rough rent-multiplier rule
  const effDown = downPayment > 0 ? downPayment : effHomePrice * 0.2;

  const buyRes = netCostBuy({
    homePrice: effHomePrice,
    downPayment: effDown,
    mortgageRate,
    yearsToStay,
    annualAppreciation,
  });
  const rentRes = totalRentCost({
    monthlyRent,
    annualRentIncrease,
    downPayment: effDown,
    yearsToStay,
  });
  const savings = rentRes.total - buyRes.netCostBuy;
  const v = verdict(savings);

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const money = (n: number) => '$' + fmt(n);

  // Pre-compute projections at 6 stay horizons — used by both 🎯 Milestone and SEO rows
  const horizonYears = [3, 5, 7, 10, 15, 30];
  const horizonRows = horizonYears.map(h => {
    const buyH = netCostBuy({
      homePrice: effHomePrice,
      downPayment: effDown,
      mortgageRate,
      yearsToStay: h,
      annualAppreciation,
    });
    const rentH = totalRentCost({
      monthlyRent,
      annualRentIncrease,
      downPayment: effDown,
      yearsToStay: h,
    });
    const s = rentH.total - buyH.netCostBuy;
    const winner = s > 30000 ? 'BUY' : s < -30000 ? 'RENT' : 'CLOSE';
    return { h, buy: buyH.netCostBuy, rent: rentH.total, s, winner };
  });

  // Find breakeven year via linear interpolation where savings sign flips
  let breakevenYr: number | null = null;
  for (let i = 0; i < horizonRows.length - 1; i++) {
    const a = horizonRows[i];
    const b = horizonRows[i + 1];
    if (a.s < 0 && b.s >= 0) {
      const t = -a.s / (b.s - a.s);
      breakevenYr = a.h + t * (b.h - a.h);
      break;
    } else if (a.s >= 0 && b.s < 0) {
      const t = a.s / (a.s - b.s);
      breakevenYr = a.h + t * (b.h - a.h);
      break;
    }
  }
  const breakevenLabel = breakevenYr !== null
    ? breakevenYr.toFixed(1) + ' years'
    : 'beyond 30 years';

  // P168 B3-4：💡 Tip 改成**建议码**（复用本引擎 🩺 Verdict Health 的三档 verdict band）
  //   —— 原先是一条写死的英文建议，对任何输入都只说同一句话 ⇒ 动态层名不副实。
  //   ⚠️ customFn 里必须写**逐字相同**的一份（守卫「两套实现不许漂」守着这条）。
  const rentBuyTipParams = {
    savings: money(Math.abs(savings)),
    years: String(yearsToStay),
    breakeven: breakevenLabel,
  };
  const rentBuyTip =
    savings > 30000
      ? { code: 'rentbuy_buy', params: rentBuyTipParams }
      : savings >= -30000
      ? { code: 'rentbuy_close', params: rentBuyTipParams }
      : { code: 'rentbuy_rent', params: rentBuyTipParams };

  // P168 B3-7：🎯 里程碑行 —— 三档措辞各写死一个 code（守卫只认字面量）；
  //   运行时数值同时进 params 与 fallback（同一个变量 ⇒ 两侧不可能漂）。
  //   ⚠️ padEnd(10) 的对齐空格随 token 化一起消失（对齐由 locale 模板决定）。
  const horizonLines = horizonRows.map(hr => {
    const sign = hr.s >= 0 ? '+' : '-';
    const amount = fmt(Math.abs(hr.s));
    // P168 B3-7：对齐空格**必须留在兜底里**（locale.en 要逐字等于源码原文）
    const lbl = (hr.winner === 'BUY' ? 'buy wins' : hr.winner === 'RENT' ? 'rent wins' : 'close').padEnd(10);
    if (hr.winner === 'BUY') {
      return makeToken(
        'calc_out.rent_vs_buy.row.horizon_buy_wins',
        '• ' + hr.h + 'y: ' + lbl + '(' + sign + '$' + amount + ')',
        { years: String(hr.h), sign, amount },
      );
    }
    if (hr.winner === 'RENT') {
      return makeToken(
        'calc_out.rent_vs_buy.row.horizon_rent_wins',
        '• ' + hr.h + 'y: ' + lbl + '(' + sign + '$' + amount + ')',
        { years: String(hr.h), sign, amount },
      );
    }
    return makeToken(
      'calc_out.rent_vs_buy.row.horizon_close',
      '• ' + hr.h + 'y: ' + lbl + '(' + sign + '$' + amount + ')',
      { years: String(hr.h), sign, amount },
    );
  });

  // P168 B3-7：⭐ 每一行 = 一个 token，token 的匹配范围 = 整行。
  //   ⭐⭐ 为什么「标签 + 值」必须在**同一个** token 里：token 正则的 fallback 段
  //   会一直吃到下一个 token（中途的换行/项目符号都会被吃掉）⇒ 值若留在 token
  //   之外，会被模板一起替换掉 ⇒ 值必须走 params，标签与值同属一个 token。
  const r =
    '$calc_out.section.rent_vs_buy_calculator|⏰ Rent-vs-Buy Calculator|\n\n' +
    '$calc_out.section.decision_snapshot|💰 Decision Snapshot:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken(
      'calc_out.rent_vs_buy.row.years_to_plan_to_stay',
      '• Years you plan to stay:  ' + yearsToStay + ' years',
      { years: String(yearsToStay) },
    ) + '\n' +
    '• ' + makeToken(
'calc_out.label.current_monthly_rent', 
'Current monthly rent'
    ) + ':    ' + money(monthlyRent) + '\n' +
    '• ' + makeToken(
'calc_out.label.home_price_assumed', 
'Home price (assumed)'
    ) + ':    ' + money(effHomePrice) + '\n' +
    makeToken(
      'calc_out.rent_vs_buy.row.down_payment_assumed',
      '• Down payment (assumed):  ' + money(effDown) + '  (20% if not specified)',
      { amount: money(effDown) },
    ) + '\n' +
    '• ' + makeToken(
'calc_out.label.verdict', 
'Verdict'
    ) + ':                 ' + v.emoji + ' ' + v.label + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.cost_breakdown|📐 Cost Breakdown:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken(
      'calc_out.rent_vs_buy.row.buying_cost_over_years',
      'Buying cost (over ' + yearsToStay + ' years):',
      { years: String(yearsToStay) },
    ) + '\n' +
    '• ' + makeToken(
'calc_out.label.down_plus_closing', 
'Down + closing'
    ) + ':         ' + money(buyRes.initialOutlay) + '\n' +
    '• ' + makeToken(
'calc_out.label.total_mortgage_paid', 
'Total mortgage paid'
    ) + ':    ' + money(buyRes.totalMortgagePaid) + '\n' +
    '• ' + makeToken(
'calc_out.label.property_tax_maint', 
'Property tax + maint'
    ) + ':   ' + money(buyRes.totalHoldingCosts) + '\n' +
    '• ' + makeToken(
'calc_out.label.selling_costs_at_end', 
'Selling costs (at end)'
    ) + ': ' + money(buyRes.sellingCosts) + '\n' +
    '• ' + makeToken(
'calc_out.label.net_proceeds_sale', 
'Net proceeds (sale)'
    ) + ':    ' + money(buyRes.netProceeds) + '\n' +
    '• ' + makeToken(
'calc_out.label.net_cost_of_buying', 
'Net cost of buying'
    ) + ':     ' + money(buyRes.netCostBuy) + '\n\n' +
    makeToken(
      'calc_out.rent_vs_buy.row.renting_cost_over_years',
      'Renting cost (over ' + yearsToStay + ' years):',
      { years: String(yearsToStay) },
    ) + '\n' +
    '• ' + makeToken(
'calc_out.label.total_rent_paid', 
'Total rent paid'
    ) + ':        ' + money(rentRes.totalRentPaid) + '\n' +
    '• ' + makeToken(
'calc_out.label.opportunity_gain_7pct', 
'Opportunity gain (7%)'
    ) + ': -' + money(rentRes.opportunityGain) + '\n' +
    '• ' + makeToken(
'calc_out.label.net_cost_of_renting', 
'Net cost of renting'
    ) + ':    ' + money(rentRes.total) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.verdict_health|🩺 Verdict Health:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + v.emoji + ' ' + v.label + '\n' +
    '• ' + makeToken(
'calc_out.label.savings_rent_vs_buy', 
'Savings (rent vs buy)'
    ) + ':  ' + money(savings) + '\n' +
    '  ' + makeToken(
      'calc_out.rent_vs_buy.row.savings_positive_note',
      '(positive = buying was cheaper by this much)',
    ) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.side_by_side|⚖️ Side-by-Side:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken(
'calc_out.label.buying_net_cost', 
'Buying net cost'
    ) + ':  ' + money(buyRes.netCostBuy) + '\n' +
    '• ' + makeToken(
'calc_out.label.renting_net_cost', 
'Renting net cost'
    ) + ': ' + money(rentRes.total) + '\n' +
    (savings > 0
      ? makeToken(
          'calc_out.rent_vs_buy.row.difference_buying_cheaper',
          '• Difference:       ' + money(Math.abs(savings)) + ' (buying cheaper)',
          { amount: money(Math.abs(savings)) },
        )
      : savings < 0
        ? makeToken(
            'calc_out.rent_vs_buy.row.difference_renting_cheaper',
            '• Difference:       ' + money(Math.abs(savings)) + ' (renting cheaper)',
            { amount: money(Math.abs(savings)) },
          )
        : makeToken(
            'calc_out.rent_vs_buy.row.difference_equal',
            '• Difference:       ' + money(Math.abs(savings)) + ' (equal)',
            { amount: money(Math.abs(savings)) },
          )) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.stay_horizon_milestone|🎯 Stay-Horizon Milestone:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken(
      'calc_out.rent_vs_buy.row.horizon_intro',
      'At different stay horizons, the math flips:',
    ) + '\n' +
    horizonLines.join('\n') + '\n' +
    makeToken(
      'calc_out.rent_vs_buy.row.breakeven_note',
      '💡 Breakeven ≈ ' + breakevenLabel + ' — selling + closing costs (~9%) recouped at this horizon.',
      { breakeven: breakevenLabel },
    ) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken(
      'calc_out.rent_vs_buy.row.whatif_stay_horizon_5y',
      '• Stay 5 years:  runs the comparison at 5y horizon',
      { years: '5' },
    ) + '\n' +
    makeToken(
      'calc_out.rent_vs_buy.row.whatif_stay_horizon_10y',
      '• Stay 10 years: runs the comparison at 10y horizon',
      { years: '10' },
    ) + '\n' +
    makeToken(
      'calc_out.rent_vs_buy.row.whatif_stay_horizon_15y',
      '• Stay 15 years: runs the comparison at 15y horizon',
      { years: '15' },
    ) + '\n' +
    makeToken(
      'calc_out.rent_vs_buy.row.whatif_appreciation_plus_2pp',
      '• Appreciation +2pp: rerun with ' + (annualAppreciation + 2) + '% (boost buying math)',
      { appreciation: String(annualAppreciation + 2) },
    ) + '\n' +
    makeToken(
      'calc_out.rent_vs_buy.row.whatif_down_20',
      '• 20% down (vs current): rerun with $' + fmt(effHomePrice * 0.2) + ' down',
      { down: fmt(effHomePrice * 0.2) },
    ) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + JSON.stringify(rentBuyTip);

  const results: string[] = [r];

  // SEO comparison rows (reuse pre-computed horizonRows)
  // P168 B3-7：三档措辞各写死一个 code（守卫只认字面量）；运行时数值同时进 params 与 fallback。
  for (const hr of horizonRows) {
    const buy = money(hr.buy);
    const rent = money(hr.rent);
    const savingsText = money(hr.s);
    if (hr.winner === 'BUY') {
      results.push(
        makeToken(
          'calc_out.rent_vs_buy.row.comparison_buy_favored',
          'Comparison: ' + hr.h + '-year stay → buy ' + buy + ' vs rent ' + rent + ' → BUY favored (savings ' + savingsText + ')',
          { years: String(hr.h), buy, rent, savings: savingsText },
        ),
      );
    } else if (hr.winner === 'RENT') {
      results.push(
        makeToken(
          'calc_out.rent_vs_buy.row.comparison_rent_favored',
          'Comparison: ' + hr.h + '-year stay → buy ' + buy + ' vs rent ' + rent + ' → RENT favored (savings ' + savingsText + ')',
          { years: String(hr.h), buy, rent, savings: savingsText },
        ),
      );
    } else {
      results.push(
        makeToken(
          'calc_out.rent_vs_buy.row.comparison_close',
          'Comparison: ' + hr.h + '-year stay → buy ' + buy + ' vs rent ' + rent + ' → CLOSE (savings ' + savingsText + ')',
          { years: String(hr.h), buy, rent, savings: savingsText },
        ),
      );
    }
  }

  return results;
}

// ============== customFn (live = static parity) ==============

const customFn =
  // P168 B3-7：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 两端输出逐字节相同，不可能漂；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS +
  "function monthlyPI(p,r,n){if(n<=0)return 0;if(r===0)return p/n;return(p*r)/(1-Math.pow(1+r,-n));}" +
  "function totalRentPaidSeries(mr,gr,y){var g=gr/100;if(y<=0)return 0;if(g===0)return mr*12*y;return mr*12*(Math.pow(1+g,y)-1)/g;}" +
  "function opportunityGain(dp,ar,y){if(y<=0)return 0;return dp*(Math.pow(1+ar/100,y)-1);}" +
  "function futureValue(hp,ap,y){return hp*Math.pow(1+ap/100,y);}" +
  "function netCostBuy(homePrice,downPayment,mortgageRate,yearsToStay,annualAppreciation){var principal=homePrice-downPayment;var monthlyRate=mortgageRate/100/12;var n=yearsToStay*12;var monthly=monthlyPI(principal,monthlyRate,n);var totalMortgagePaid=monthly*n;var fv=futureValue(homePrice,annualAppreciation,yearsToStay);var sellingCosts=fv*0.06;var netProceeds=fv-sellingCosts;var buyClosingCosts=homePrice*0.03;var initialOutlay=downPayment+buyClosingCosts;var monthlyPropertyTaxMaint=homePrice*0.012/12;var totalHoldingCosts=monthlyPropertyTaxMaint*n;var cost=initialOutlay+totalMortgagePaid+totalHoldingCosts-netProceeds;return{initialOutlay:initialOutlay,totalMortgagePaid:totalMortgagePaid,totalHoldingCosts:totalHoldingCosts,sellingCosts:sellingCosts,netProceeds:netProceeds,netCostBuy:cost};}" +
  "function totalRentCost(mr,ri,dp,y){var trp=totalRentPaidSeries(mr,ri,y);var og=opportunityGain(dp,7,y);return{totalRentPaid:trp,opportunityGain:og,total:trp-og};}" +
  "function verdict(savings){if(savings>30000)return{e:'\\uD83D\\uDFE2',l:tk('calc_out.rent_vs_buy.row.verdict_buy_strongly_favored','BUY strongly favored \\u2014 buying saves > $30K over renting')};if(savings>=-30000)return{e:'\\uD83D\\uDFE1',l:tk('calc_out.rent_vs_buy.row.verdict_close_call','CLOSE call \\u2014 within $30K; sensitivity matters')};return{e:'\\uD83D\\uDFE0',l:tk('calc_out.rent_vs_buy.row.verdict_rent_favored','RENT favored \\u2014 renting saves > $30K over buying')};}" +
  "var clampNonNegative=function(x){return Math.max(0,x)};" +
  "var monthlyRent=clampNonNegative(parseFloat(inputs.monthlyRent)||0);" +
  "var homePrice=clampNonNegative(parseFloat(inputs.homePrice)||0);" +
  "var downPayment=clampNonNegative(parseFloat(inputs.downPayment)||0);" +
  "var mortgageRate=parseFloat(inputs.mortgageRate)||0;" +
  "var yearsToStay=clampNonNegative(parseFloat(inputs.yearsToStay)||0);" +
  "var annualAppreciation=parseFloat(inputs.annualAppreciation)||0;" +
  "var annualRentIncrease=parseFloat(inputs.annualRentIncrease)||0;" +
  "if(yearsToStay<=0){return['$calc_out.section.rent_vs_buy_calculator|\\u23F0 Rent-vs-Buy Calculator|'+'\\n\\n'+'$calc_out.rent_vs_buy.row.enter_years_required|\\uD83D\\uDCB0 Enter years you plan to stay (>0). This is the horizon for the comparison.|'];}" +
  "if(homePrice<=0&&monthlyRent<=0){return['$calc_out.section.rent_vs_buy_calculator|\\u23F0 Rent-vs-Buy Calculator|'+'\\n\\n'+'$calc_out.rent_vs_buy.row.enter_inputs_required|\\uD83D\\uDCB0 Enter rent, home price, and down payment to compare total cost over your stay horizon.|'];}" +
  "var effHomePrice=homePrice>0?homePrice:monthlyRent*200;" +
  "var effDown=downPayment>0?downPayment:effHomePrice*0.2;" +
  "var buyRes=netCostBuy(effHomePrice,effDown,mortgageRate,yearsToStay,annualAppreciation);" +
  "var rentRes=totalRentCost(monthlyRent,annualRentIncrease,effDown,yearsToStay);" +
  "var savings=rentRes.total-buyRes.netCostBuy;" +
  "var v=verdict(savings);" +
  "function fmt(n){return n.toLocaleString('en-US',{maximumFractionDigits:0});}" +
  "function money(n){return '$'+fmt(n);}" +
  "var horizonYears=[3,5,7,10,15,30];" +
  "var horizonRows=horizonYears.map(function(h){var buyH=netCostBuy(effHomePrice,effDown,mortgageRate,h,annualAppreciation);var rentH=totalRentCost(monthlyRent,annualRentIncrease,effDown,h);var s=rentH.total-buyH.netCostBuy;var winner=s>30000?'BUY':s<-30000?'RENT':'CLOSE';return{h:h,buy:buyH.netCostBuy,rent:rentH.total,s:s,winner:winner};});" +
  "var breakevenYr=null;" +
  "for(var bi=0;bi<horizonRows.length-1;bi++){var a=horizonRows[bi];var b=horizonRows[bi+1];if(a.s<0&&b.s>=0){var t=-a.s/(b.s-a.s);breakevenYr=a.h+t*(b.h-a.h);break;}else if(a.s>=0&&b.s<0){var t=a.s/(a.s-b.s);breakevenYr=a.h+t*(b.h-a.h);break;}}" +
  "var breakevenLabel=breakevenYr!==null?breakevenYr.toFixed(1)+' years':'beyond 30 years';" +
  "var r2='';" +
  "r2+='$calc_out.section.rent_vs_buy_calculator|\\u23F0 Rent-vs-Buy Calculator|'+'\\n\\n';" +
  "r2+='$calc_out.section.decision_snapshot|\\uD83D\\uDCB0 Decision Snapshot:|'+'\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+=tk('calc_out.rent_vs_buy.row.years_to_plan_to_stay','\\u2022 Years you plan to stay:  '+yearsToStay+' years',{years:yearsToStay})+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.current_monthly_rent','Current monthly rent')+':    ' + money(monthlyRent)+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.home_price_assumed','Home price (assumed)')+':    ' + money(effHomePrice)+'\\n';" +
  "r2+=tk('calc_out.rent_vs_buy.row.down_payment_assumed','\\u2022 Down payment (assumed):  '+money(effDown)+'  (20% if not specified)',{amount:money(effDown)})+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.verdict','Verdict')+':                 ' + v.e + ' '+v.l+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='$calc_out.section.cost_breakdown|\\uD83D\\uDCD0 Cost Breakdown:|'+'\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+=tk('calc_out.rent_vs_buy.row.buying_cost_over_years','Buying cost (over '+yearsToStay+' years):',{years:yearsToStay})+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.down_plus_closing','Down + closing')+':         ' + money(buyRes.initialOutlay)+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.total_mortgage_paid','Total mortgage paid')+':    ' + money(buyRes.totalMortgagePaid)+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.property_tax_maint','Property tax + maint')+':   ' + money(buyRes.totalHoldingCosts)+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.selling_costs_at_end','Selling costs (at end)')+': ' + money(buyRes.sellingCosts)+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.net_proceeds_sale','Net proceeds (sale)')+':    ' + money(buyRes.netProceeds)+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.net_cost_of_buying','Net cost of buying')+':     ' + money(buyRes.netCostBuy)+'\\n\\n';" +
  "r2+=tk('calc_out.rent_vs_buy.row.renting_cost_over_years','Renting cost (over '+yearsToStay+' years):',{years:yearsToStay})+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.total_rent_paid','Total rent paid')+':        ' + money(rentRes.totalRentPaid)+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.opportunity_gain_7pct','Opportunity gain (7%)')+': -' + money(rentRes.opportunityGain)+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.net_cost_of_renting','Net cost of renting')+':    ' + money(rentRes.total)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='$calc_out.section.verdict_health|\\uD83E\\uDE7A Verdict Health:|'+'\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+v.e+' '+v.l+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.savings_rent_vs_buy','Savings (rent vs buy)')+':  ' + money(savings)+'\\n';" +
  "r2+='  '+tk('calc_out.rent_vs_buy.row.savings_positive_note','(positive = buying was cheaper by this much)')+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='$calc_out.section.side_by_side|\\u2696\\uFE0F Side-by-Side:|'+'\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.buying_net_cost','Buying net cost')+':  ' + money(buyRes.netCostBuy)+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.renting_net_cost','Renting net cost')+': ' + money(rentRes.total)+'\\n';" +
  "r2+=(savings>0?tk('calc_out.rent_vs_buy.row.difference_buying_cheaper','\\u2022 Difference:       '+money(Math.abs(savings))+' (buying cheaper)',{amount:money(Math.abs(savings))}):savings<0?tk('calc_out.rent_vs_buy.row.difference_renting_cheaper','\\u2022 Difference:       '+money(Math.abs(savings))+' (renting cheaper)',{amount:money(Math.abs(savings))}):tk('calc_out.rent_vs_buy.row.difference_equal','\\u2022 Difference:       '+money(Math.abs(savings))+' (equal)',{amount:money(Math.abs(savings))}))+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  // 🎯 Stay-Horizon Milestone (matches calculate() output, uses pre-computed hrows + brkL)
  "r2+='$calc_out.section.stay_horizon_milestone|\\uD83C\\uDFAF Stay-Horizon Milestone:|'+'\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+=tk('calc_out.rent_vs_buy.row.horizon_intro','At different stay horizons, the math flips:')+'\\n';" +
  "for(var him=0;him<horizonRows.length;him++){var hr=horizonRows[him];var sign=hr.s>=0?'+':'-';var amount=fmt(Math.abs(hr.s));var lbl=(hr.winner==='BUY'?'buy wins':hr.winner==='RENT'?'rent wins':'close').padEnd(10);r2+=(hr.winner==='BUY'?tk('calc_out.rent_vs_buy.row.horizon_buy_wins','\\u2022 '+hr.h+'y: '+lbl+'('+sign+'$'+amount+')',{years:hr.h,sign:sign,amount:amount}):hr.winner==='RENT'?tk('calc_out.rent_vs_buy.row.horizon_rent_wins','\\u2022 '+hr.h+'y: '+lbl+'('+sign+'$'+amount+')',{years:hr.h,sign:sign,amount:amount}):tk('calc_out.rent_vs_buy.row.horizon_close','\\u2022 '+hr.h+'y: '+lbl+'('+sign+'$'+amount+')',{years:hr.h,sign:sign,amount:amount}))+'\\n';}" +
  "r2+=tk('calc_out.rent_vs_buy.row.breakeven_note','\\uD83D\\uDCA1 Breakeven \\u2248 '+breakevenLabel+' \\u2014 selling + closing costs (~9%) recouped at this horizon.',{breakeven:breakevenLabel})+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='$calc_out.section.what_if_scenarios|\\uD83D\\uDD04 What-If Scenarios:|'+'\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+=tk('calc_out.rent_vs_buy.row.whatif_stay_horizon_5y','\\u2022 Stay 5 years:  runs the comparison at 5y horizon',{years:'5'})+'\\n';" +
  "r2+=tk('calc_out.rent_vs_buy.row.whatif_stay_horizon_10y','\\u2022 Stay 10 years: runs the comparison at 10y horizon',{years:'10'})+'\\n';" +
  "r2+=tk('calc_out.rent_vs_buy.row.whatif_stay_horizon_15y','\\u2022 Stay 15 years: runs the comparison at 15y horizon',{years:'15'})+'\\n';" +
  "r2+=tk('calc_out.rent_vs_buy.row.whatif_appreciation_plus_2pp','\\u2022 Appreciation +2pp: rerun with '+(annualAppreciation+2)+'% (boost buying math)',{appreciation:annualAppreciation+2})+'\\n';" +
  "r2+=tk('calc_out.rent_vs_buy.row.whatif_down_20','\\u2022 20% down (vs current): rerun with $'+fmt(effHomePrice*0.2)+' down',{down:fmt(effHomePrice*0.2)})+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "var rentBuyTipParams={savings:money(Math.abs(savings)),years:String(yearsToStay),breakeven:breakevenLabel};" +
  "var rentBuyTip=savings>30000?{code:'rentbuy_buy',params:rentBuyTipParams}:savings>=-30000?{code:'rentbuy_close',params:rentBuyTipParams}:{code:'rentbuy_rent',params:rentBuyTipParams};" +
  "r2+='\\uD83D\\uDCA1 Tip: '+JSON.stringify(rentBuyTip);" +
  "var results=[r2];" +
  "for(var hi=0;hi<horizonRows.length;hi++){var hr=horizonRows[hi];var buy=money(hr.buy);var rent=money(hr.rent);var savingsText=money(hr.s);results.push(hr.winner==='BUY'?tk('calc_out.rent_vs_buy.row.comparison_buy_favored','Comparison: '+hr.h+'-year stay \\u2192 buy '+buy+' vs rent '+rent+' \\u2192 BUY favored (savings '+savingsText+')',{years:hr.h,buy:buy,rent:rent,savings:savingsText}):hr.winner==='RENT'?tk('calc_out.rent_vs_buy.row.comparison_rent_favored','Comparison: '+hr.h+'-year stay \\u2192 buy '+buy+' vs rent '+rent+' \\u2192 RENT favored (savings '+savingsText+')',{years:hr.h,buy:buy,rent:rent,savings:savingsText}):tk('calc_out.rent_vs_buy.row.comparison_close','Comparison: '+hr.h+'-year stay \\u2192 buy '+buy+' vs rent '+rent+' \\u2192 CLOSE (savings '+savingsText+')',{years:hr.h,buy:buy,rent:rent,savings:savingsText}));}" +
  "return results;";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-rent-vs-buy-calculator',
  title: 'Rent-vs-Buy Calculator',
  description:
    'Decide whether to rent or buy with NPV comparison over your stay horizon. Includes down payment opportunity cost, selling costs, and appreciation. Multiplies into 6 time horizons to show how the answer changes with commitment length.',
  inputs: [
    { name: 'monthlyRent', label: 'Current Monthly Rent ($)', placeholder: 'e.g. 2000', type: 'number' },
    { name: 'homePrice', label: 'Home Purchase Price ($)', placeholder: 'e.g. 500000', type: 'number' },
    { name: 'downPayment', label: 'Down Payment ($)', placeholder: 'e.g. 100000', type: 'number' },
    { name: 'mortgageRate', label: 'Mortgage Rate (%)', placeholder: 'e.g. 6.5', type: 'number' },
    { name: 'yearsToStay', label: 'Years You Plan to Stay', placeholder: 'e.g. 7', type: 'number' },
    { name: 'annualAppreciation', label: 'Expected Home Appreciation (%/yr)', placeholder: 'e.g. 3', type: 'number' },
    { name: 'annualRentIncrease', label: 'Annual Rent Increase (%/yr)', placeholder: 'e.g. 3', type: 'number' },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  // P140f-p3-T7: minimal Playbook 6 字段 template (Goal=该不该决策)
  // Goal 含"决策"+"该不该"双关键词 → 通过 T1 zod refine 校验
  playbook: {
    goal: '用户该不该在这段居住期内买下这套房，而不是继续租',
    input: 'engine 定义的 inputs 字段',
    output: 'engine 定义的 generate() 返回数组',
    constraint: 'apply 引擎 inputs 时受实际场景约束',
    tool: '页面的「🧭 算完之后」决策区块（决策支持已由区块独占）',
    memory: 'v2.0 11 business domain benchmark + P140f Phase 4 主题簇',
  },
  generate(inputs: Record<string, string>): string[] {
    return calculateRentVsBuy(inputs);
  },
  staticExamples: ['$calc_out.section.rent_vs_buy_calculator|⏰ Rent-vs-Buy Calculator|\n\n$calc_out.section.decision_snapshot|💰 Decision Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.rent_vs_buy.row.years_to_plan_to_stay{"years":"7"}|• Years you plan to stay:  7 years|\n• $calc_out.label.current_monthly_rent|Current monthly rent|:    $2,000\n• $calc_out.label.home_price_assumed|Home price (assumed)|:    $500,000\n$calc_out.rent_vs_buy.row.down_payment_assumed{"amount":"$100,000"}|• Down payment (assumed):  $100,000  (20% if not specified)|\n• $calc_out.label.verdict|Verdict|:                 🟢 $calc_out.rent_vs_buy.row.verdict_buy_strongly_favored|BUY strongly favored — buying saves > $30K over renting|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.cost_breakdown|📐 Cost Breakdown:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.rent_vs_buy.row.buying_cost_over_years{"years":"7"}|Buying cost (over 7 years):|\n• $calc_out.label.down_plus_closing|Down + closing|:         $115,000\n• $calc_out.label.total_mortgage_paid|Total mortgage paid|:    $498,941\n• $calc_out.label.property_tax_maint|Property tax + maint|:   $42,000\n• $calc_out.label.selling_costs_at_end|Selling costs (at end)|: $36,896\n• $calc_out.label.net_proceeds_sale|Net proceeds (sale)|:    $578,041\n• $calc_out.label.net_cost_of_buying|Net cost of buying|:     $77,900\n\n$calc_out.rent_vs_buy.row.renting_cost_over_years{"years":"7"}|Renting cost (over 7 years):|\n• $calc_out.label.total_rent_paid|Total rent paid|:        $183,899\n• $calc_out.label.opportunity_gain_7pct|Opportunity gain (7%)|: -$60,578\n• $calc_out.label.net_cost_of_renting|Net cost of renting|:    $123,321\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.verdict_health|🩺 Verdict Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 $calc_out.rent_vs_buy.row.verdict_buy_strongly_favored|BUY strongly favored — buying saves > $30K over renting|\n• $calc_out.label.savings_rent_vs_buy|Savings (rent vs buy)|:  $45,421\n  $calc_out.rent_vs_buy.row.savings_positive_note|(positive = buying was cheaper by this much)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.side_by_side|⚖️ Side-by-Side:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.buying_net_cost|Buying net cost|:  $77,900\n• $calc_out.label.renting_net_cost|Renting net cost|: $123,321\n$calc_out.rent_vs_buy.row.difference_buying_cheaper{"amount":"$45,421"}|• Difference:       $45,421 (buying cheaper)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.stay_horizon_milestone|🎯 Stay-Horizon Milestone:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.rent_vs_buy.row.horizon_intro|At different stay horizons, the math flips:|\n$calc_out.rent_vs_buy.row.horizon_close{"years":"3","sign":"-","amount":"9,087"}|• 3y: close     (-$9,087)|\n$calc_out.rent_vs_buy.row.horizon_close{"years":"5","sign":"+","amount":"17,435"}|• 5y: close     (+$17,435)|\n$calc_out.rent_vs_buy.row.horizon_buy_wins{"years":"7","sign":"+","amount":"45,421"}|• 7y: buy wins  (+$45,421)|\n$calc_out.rent_vs_buy.row.horizon_buy_wins{"years":"10","sign":"+","amount":"90,028"}|• 10y: buy wins  (+$90,028)|\n$calc_out.rent_vs_buy.row.horizon_buy_wins{"years":"15","sign":"+","amount":"170,518"}|• 15y: buy wins  (+$170,518)|\n$calc_out.rent_vs_buy.row.horizon_buy_wins{"years":"30","sign":"+","amount":"416,220"}|• 30y: buy wins  (+$416,220)|\n$calc_out.rent_vs_buy.row.breakeven_note{"breakeven":"3.7 years"}|💡 Breakeven ≈ 3.7 years — selling + closing costs (~9%) recouped at this horizon.|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.rent_vs_buy.row.whatif_stay_horizon_5y{"years":"5"}|• Stay 5 years:  runs the comparison at 5y horizon|\n$calc_out.rent_vs_buy.row.whatif_stay_horizon_10y{"years":"10"}|• Stay 10 years: runs the comparison at 10y horizon|\n$calc_out.rent_vs_buy.row.whatif_stay_horizon_15y{"years":"15"}|• Stay 15 years: runs the comparison at 15y horizon|\n$calc_out.rent_vs_buy.row.whatif_appreciation_plus_2pp{"appreciation":"5"}|• Appreciation +2pp: rerun with 5% (boost buying math)|\n$calc_out.rent_vs_buy.row.whatif_down_20{"down":"100,000"}|• 20% down (vs current): rerun with $100,000 down|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: {"code":"rentbuy_buy","params":{"savings":"$45,421","years":"7","breakeven":"3.7 years"}}\n$calc_out.rent_vs_buy.row.comparison_close{"years":"3","buy":"$60,764","rent":"$51,677","savings":"$-9,087"}|Comparison: 3-year stay → buy $60,764 vs rent $51,677 → CLOSE (savings $-9,087)|\n$calc_out.rent_vs_buy.row.comparison_close{"years":"5","buy":"$69,729","rent":"$87,164","savings":"$17,435"}|Comparison: 5-year stay → buy $69,729 vs rent $87,164 → CLOSE (savings $17,435)|\n$calc_out.rent_vs_buy.row.comparison_buy_favored{"years":"7","buy":"$77,900","rent":"$123,321","savings":"$45,421"}|Comparison: 7-year stay → buy $77,900 vs rent $123,321 → BUY favored (savings $45,421)|\n$calc_out.rent_vs_buy.row.comparison_buy_favored{"years":"10","buy":"$88,390","rent":"$178,418","savings":"$90,028"}|Comparison: 10-year stay → buy $88,390 vs rent $178,418 → BUY favored (savings $90,028)|\n$calc_out.rent_vs_buy.row.comparison_buy_favored{"years":"15","buy":"$99,953","rent":"$270,471","savings":"$170,518"}|Comparison: 15-year stay → buy $99,953 vs rent $270,471 → BUY favored (savings $170,518)|\n$calc_out.rent_vs_buy.row.comparison_buy_favored{"years":"30","buy":"$64,365","rent":"$480,584","savings":"$416,220"}|Comparison: 30-year stay → buy $64,365 vs rent $480,584 → BUY favored (savings $416,220)|'],
  faq: [
    {
      q: 'When does it make financial sense to buy vs rent?',
      a: 'Generally 7+ years. The rule of thumb: if you stay less than 5 years, transaction costs (3% buy closing + 6% selling) plus limited appreciation time usually favor renting. If you stay 7+ years, appreciation + forced savings + principal paydown usually make buying cheaper. The exact break-even depends on your rent-to-price ratio, appreciation rate, and how much you would otherwise invest the down payment.',
    },
    {
      q: 'How is the opportunity cost of the down payment calculated?',
      a: 'The opportunity cost is what your down payment would earn if invested instead. We assume 7% annual (roughly S&P 500 historical average). For a $100K down payment over 5 years, that is ~$40K of opportunity gain subtracted from renting costs. Adjust your expected return if you have a different investment strategy.',
    },
    {
      q: 'What costs are included in "net cost of buying"?',
      a: 'Initial outlay (down payment + 3% closing costs) + total mortgage P&I over the stay + ongoing property tax + maintenance (1.2%/yr of home value annually) + 6% selling costs at horizon MINUS net sale proceeds (home value at appreciation minus selling costs). In V1 we assume the loan term equals your stay, so there is no remaining balance at sale.',
    },
    {
      q: 'How accurate is this calculator?',
      a: 'It captures the major cash flows: mortgage, holding costs, transaction costs, appreciation, and opportunity gain. It does NOT model property tax increases, insurance changes, repairs, or tax deductions (mortgage interest deduction in the US can save 10-25% of monthly interest cost for higher earners). For a personalized analysis, combine with a tax advisor.',
    },
    {
      q: 'Should I include homeowners insurance and HOA fees?',
      a: 'Yes — our 1.2%/yr "property tax + maintenance" estimate is conservative and assumes roughly 0.8% property tax + 0.4% maintenance/insurance. HOA fees in condos/co-ops can add 0.5-2% of home value annually and should be added to the property tax + maintenance line for accurate results. Adjust the calculation or use a different model for high-HOA markets.',
    },
    { q: "Is it better to rent or buy in 2026?", a: "It depends. Buy wins when: 1) Staying 5+ years, 2) Rent-to-price ratio <0.7%, 3) Can afford 20% down, 4) Property appreciates. Rent wins when: 1) Staying <3 years, 2) High rent-to-price (0.8%+), 3) Investment returns >property appreciation, 4) Flexibility needed. Most: 5-7 year break-even. HCOL: often rent wins. LCOL: buy usually wins. Calculate both scenarios." },
    { q: "How long should I plan to stay before buying makes sense?", a: "Break-even: typically 5-7 years. Components: 1) Transaction costs (5-8% of price), 2) Opportunity cost of down payment, 3) Maintenance, 4) Property tax. Below 3 years: rent wins (transaction costs). 3-5 years: depends on appreciation. 5-7 years: usually break-even. 7+ years: buy typically wins. Most first-time buyers: plan 7-10 years. The longer you stay, the more buy wins." },
    { q: "What are the hidden costs of buying?", a: "Beyond mortgage: 1) Property taxes (1-2% of home value), 2) Insurance (0.3-1%), 3) Maintenance (1-2% per year), 4) HOA (if applicable), 5) Closing costs (2-5% of price), 6) Opportunity cost of down payment (4-7% per year). For $400K home: $4-12K/year in hidden costs. Add: utilities, repairs, landscaping. Most: 1.5-2.5% of home value in true annual cost." },
    { q: "What is the opportunity cost of a down payment?", a: "Down payment opportunity cost: 1) $80K down (20% of $400K), 2) Invested in S&P 500: 7-10% return = $5.6K-8K/year, 3) Tied up in house: 0% return (or appreciation). Net: 4-7% per year in foregone returns. For 7 years: $30-50K. Add: closing costs, maintenance. For break-even: must appreciate 4%+ per year to justify. Most LCOL markets: hit this. HCOL: often miss." },
    { q: "How does appreciation affect rent vs buy?", a: "Appreciation: 1) 0-2% per year: cash flow positive markets, 2) 2-4% per year: average US, 3) 4-6% per year: hot markets, 4) 6%+: unsustainable. For 30 years: 3% appreciation doubles home value. 6%: 6x. plan 3-4% appreciation long-term. Hot markets: 5-7% short-term, but mean revert. Track 10-year historical. Avoid assuming continued high appreciation." },
    { q: "What about tax benefits of buying?", a: "Mortgage interest deduction: 1) Up to $750K of mortgage (post-TCJA), 2) Itemize required, 3) Most first-year buyers don't benefit (standard deduction). Property tax: $10K SALT cap. For most buyers: $1-3K/year tax benefit. Higher brackets: more. For $400K mortgage at 6.5%: ~$25K interest year 1, $2-5K tax savings. For most: not the deciding factor. For higher brackets: significant." },
    { q: "How does inflation affect rent vs buy?", a: "Inflation helps buyers. Fixed mortgage payment: stays same. Rents: typically inflate 3-5% per year. For 30-year mortgage: paid in \"cheaper\" dollars over time. 3% inflation: $2,528 mortgage today = $1,272 in today's dollars in 20 years. Most: high inflation = buy wins. Low inflation: smaller effect. Historically: 2-3% inflation, 3-4% rent growth. Real returns favor buy in inflationary environments." },
    { q: "What is the best way to decide rent vs buy?", a: "Process: 1) Calculate total cost of buying (5-7 years), 2) Calculate total cost of renting (5-7 years), 3) Subtract appreciation (estimated 3-4%/year), 4) Subtract opportunity cost (5% return on down payment), 5) Compare. Include: closing costs, maintenance, transaction fees. Most: <5 years, rent. 5-7 years: depends on market. 7+ years: usually buy. Tools: NYT rent vs buy calculator, ours. Most: 5-7 year horizon is the tipping point." },
  ],
  howToUse: [
    'Enter your current monthly rent.',
    'Enter the home price you would buy at.',
    'Enter your planned down payment.',
    'Enter the mortgage rate you would finance at.',
    'Enter years you plan to stay in the home (key sensitivity).',
    'Enter expected annual home appreciation (default 3% = long-term US average).',
    'Enter expected annual rent increase (default 3% = typical rent inflation).',
    'Review the verdict and side-by-side net cost comparison.',
    'Check the 6 time-horizon SEO rows — answer changes dramatically with commitment length.',
    'Apply the 5 what-ifs to find your break-even stay duration.',
  ],
  engineKey: true,
};

registerEngine(engine);
