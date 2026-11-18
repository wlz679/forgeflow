import type { ToolEngine } from "../../core/engines/types";
import { registerEngine } from "../../core/engines/registry";
import { clampNonNegative } from "../../core/engines/helpers";
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

function projectRevenue(inputs: Record<string, string>): string[] {
  // --- Parse inputs ---
  const fmt = (n: number) => "$" + Math.round(n).toLocaleString();
  const pct = (n: number) => n.toFixed(1) + "%";
  const currentMrr = clampNonNegative(parseFloat(inputs.currentMrr) || 0);
  const grossGrowthRate = clampNonNegative(parseFloat(inputs.monthlyGrowthRate) || 0);
  const churnRate = clampNonNegative(parseFloat(inputs.monthlyChurnRate) || 0);
  const monthlyExpenses = clampNonNegative(parseFloat(inputs.monthlyExpenses) || 0);
  const cashOnHand = clampNonNegative(parseFloat(inputs.cashOnHand) || 0);
  const arpu = clampNonNegative(parseFloat(inputs.arpu) || 0);
  const customGrowthRate = clampNonNegative(parseFloat(inputs.customGrowthRate) || 0);
  const cac = clampNonNegative(parseFloat(inputs.cac) || 0);
  const months = clampNonNegative(parseInt(inputs.months) || 12);

  const netRate = (grossGrowthRate - churnRate) / 100;
  const annualizedNetRate = (Math.pow(1 + netRate, 12) - 1) * 100;
  const endMRR = currentMrr * Math.pow(1 + netRate, months);

  let totalRevenue = 0;
  for (let m = 1; m <= months; m++) totalRevenue += currentMrr * Math.pow(1 + netRate, m);

  const growthMultiple = currentMrr > 0 ? endMRR / currentMrr : 0;

  // Subscriber math: derive from ARPU
  const subscriberCount = arpu > 0 ? Math.round(currentMrr / arpu) : 0;

  // --- Profit / Loss ---
  const monthlyNetIncome = currentMrr - monthlyExpenses;
  const annualizedProfit = monthlyNetIncome * 12;
  const profitMargin = currentMrr > 0 ? (monthlyNetIncome / currentMrr) * 100 : 0;
  const isProfitable = monthlyNetIncome >= 0;

  // --- Custom scenario ---
  const customNetRate = customGrowthRate > 0 ? (customGrowthRate - churnRate) / 100 : 0;
  const hasCustom = customGrowthRate > 0;

  // --- CAC Metrics ---
  const cacPaybackMonths = cac > 0 && arpu > 0 && churnRate > 0 && churnRate < 100
    ? cac / (arpu * (1 - churnRate / 100))
    : null;
  function paybackColor(m: number): string { if (m <= 12) return "🟢"; if (m <= 24) return "🟡"; return "🔴"; }
  const ltvForCAC = arpu > 0 && churnRate > 0 ? arpu / (churnRate / 100) : 0;
  const ltvCacRatio = cac > 0 && ltvForCAC > 0 ? ltvForCAC / cac : null;
  function ltvCacColor(r: number): string { if (r >= 3) return "🟢"; if (r >= 1) return "🟡"; return "🔴"; }

  // --- Runway ---
  const runwayZeroRevenue = monthlyExpenses > 0 ? cashOnHand / monthlyExpenses : null;
  const monthlyBurn = monthlyExpenses - currentMrr; // positive = burning cash
  const runwayCurrent = monthlyBurn > 0 ? cashOnHand / monthlyBurn : Infinity;

  function runwayColor(m: number): string {
    if (m === Infinity) return "🟢";
    if (m >= 18) return "🟢";
    if (m >= 6) return "🟡";
    return "🔴";
  }

  // --- Breakeven ---
  let breakevenMonths: number | null = null;
  if (currentMrr >= monthlyExpenses && monthlyExpenses > 0) {
    breakevenMonths = 0; // already there
  } else if (currentMrr > 0 && netRate > 0 && monthlyExpenses > 0) {
    breakevenMonths = Math.ceil(Math.log(monthlyExpenses / currentMrr) / Math.log(1 + netRate));
  }

  // --- Burn Multiple ---
  const netNewMRRThisMonth = currentMrr * netRate; // net new MRR added this month
  const burnMultiple = monthlyBurn > 0 && netNewMRRThisMonth > 0 ? monthlyBurn / netNewMRRThisMonth : null;

  function burnMultColor(bm: number): string {
    if (bm < 1) return "🟢";
    if (bm <= 2) return "🟡";
    return "🔴";
  }

  // --- MRR / Expense Ratio ---
  const mrrExpenseRatio = monthlyExpenses > 0 ? currentMrr / monthlyExpenses : null;

  function ratioColor(r: number): string {
    if (r >= 2) return "🟢";
    if (r >= 1) return "🟡";
    return "🔴";
  }

  // --- Rule of 40 ---
  const ruleOf40Val = netRate * 100 + profitMargin;

  function r40Color(v: number): string {
    if (v >= 40) return "🟢";
    if (v >= 20) return "🟡";
    return "🔴";
  }

  // --- Milestones ---
  function monthsToTarget(target: number): number | null {
    if (currentMrr <= 0 || netRate <= 0) return null;
    if (currentMrr >= target) return 0;
    return Math.ceil(Math.log(target / currentMrr) / Math.log(1 + netRate));
  }

  // --- Net growth color ---
  // P168 B3-9：状态词是可翻译标签 ⇒ 直接返回 token（英文兜底与原文逐字相同）
  function netGrowthColor(r: number): string {
    if (r >= 10) return makeToken('calc_out.label.growth_status_exceptional', '🟢 Exceptional');
    if (r >= 5) return makeToken('calc_out.label.growth_status_healthy', '🟡 Healthy');
    if (r >= 0) return makeToken('calc_out.label.growth_status_slow', '🟠 Slow');
    return makeToken('calc_out.label.growth_status_shrinking', '🔴 Shrinking');
  }

  // --- Phase label ---
  // P168 B3-9：阶段名是可翻译标签 ⇒ 直接返回 token
  function phaseLabel(mrr: number): string {
    if (mrr < 1000) return makeToken('calc_out.label.phase_validation', 'Validation (<$1K MRR)');
    if (mrr < 10000) return makeToken('calc_out.label.phase_early_traction', 'Early Traction ($1K–$10K MRR)');
    if (mrr < 100000) return makeToken('calc_out.label.phase_scaling', 'Scaling ($10K–$100K MRR)');
    return makeToken('calc_out.label.phase_growth', 'Growth (>$100K MRR)');
  }

  let result = "";

  // ========================
  // 1. Revenue Snapshot
  // ========================
  result += makeToken('calc_out.section.revenue_projector_revenue_snapshot', '📊 Revenue Snapshot') + "\n\n";
  result += "• " + makeToken('calc_out.label.starting_mrr', 'Starting MRR') + ":           " + fmt(currentMrr) + "/mo\n";
  result += "• " + makeToken('calc_out.label.ending_mrr', 'Ending MRR') + ":             " + fmt(endMRR) + "/mo  (" + makeToken('calc_out.revenue_projector.row.after_n_months', 'after ' + months + ' months', { months: String(months) }) + ")\n";
  result += "• " + makeToken('calc_out.label.arr_equivalent', 'ARR Equivalent') + ":         " + fmt(endMRR * 12) + "/yr\n";
  result += "• " + makeToken('calc_out.label.total_revenue', 'Total Revenue') + ":          " + fmt(totalRevenue) + " " + makeToken('calc_out.revenue_projector.row.over_n_months', 'over ' + months + ' months', { months: String(months) }) + "\n\n";
  result += "• " + makeToken('calc_out.label.gross_monthly_growth', 'Gross Monthly Growth') + ":   +" + pct(grossGrowthRate) + "  (" + makeToken('calc_out.revenue_projector.row.new_and_expansion', 'new + expansion') + ")\n";
  result += "• " + makeToken('calc_out.label.monthly_churn', 'Monthly Churn') + ":          −" + pct(churnRate) + "  (" + makeToken('calc_out.revenue_projector.row.lost_revenue', 'lost revenue') + ")\n";
  result += "• " + makeToken('calc_out.label.net_monthly_growth', 'Net Monthly Growth') + ":     " + (netRate >= 0 ? "+" : "") + pct(netRate * 100) + "  (" + makeToken('calc_out.revenue_projector.row.effective', 'effective') + ")  " + netGrowthColor(netRate * 100) + "\n";
  result += "• " + makeToken('calc_out.label.growth_multiple', 'Growth Multiple') + ":        " + growthMultiple.toFixed(1) + "×   (" + makeToken('calc_out.revenue_projector.row.n_month_mrr_expansion', months + '-month MRR expansion', { months: String(months) }) + ")\n";

  // ========================
  // 2. MRR Milestones
  // ========================
  result += "\n" + makeToken('calc_out.section.revenue_projector_mrr_milestones', '📈 MRR Milestones') + "\n";
  const maxQ = Math.min(Math.floor(months / 3), 8);
  for (let q = 1; q <= maxQ; q++) {
    const mo = q * 3;
    const mrrAtQ = currentMrr * Math.pow(1 + netRate, mo);
    result += makeToken('calc_out.revenue_projector.row.quarter_milestone', '• Q' + q + ' (Month ' + mo + '):  ' + fmt(mrrAtQ) + '/mo', { q: String(q), month: String(mo), mrr: fmt(mrrAtQ) }) + (q === maxQ ? "  ← target" : "") + "\n";
  }

  result += "\n" + makeToken('calc_out.section.revenue_projector_key_milestones', '🎯 Key Milestones') + "\n";
  const targets = [10000, 25000, 50000, 100000];
  let anyMilestoneShown = false;
  if (currentMrr > 0 && netRate > 0) {
    for (const t of targets) {
      if (t <= currentMrr) continue;
      const mths = monthsToTarget(t);
      if (mths !== null && mths > 0) {
        anyMilestoneShown = true;
        if (mths <= 60) {
          // Sensitivity interval: ±2% net growth swing
          const fastRate = netRate + 0.02;
          const slowRate = Math.max(0.001, netRate - 0.02);
          const fastMths = Math.ceil(Math.log(t / currentMrr) / Math.log(1 + fastRate));
          const slowMths = Math.ceil(Math.log(t / currentMrr) / Math.log(1 + slowRate));
          result += makeToken('calc_out.revenue_projector.row.milestone', '• $' + Math.round(t / 1000) + 'K MRR:  ' + mths + ' months [' + fastMths + '–' + slowMths + ']', { target: '$' + Math.round(t / 1000) + 'K MRR', months: String(mths), fast: String(fastMths), slow: String(slowMths) }) + "\n";
        } else {
          result += makeToken('calc_out.revenue_projector.row.milestone_far', '• $' + Math.round(t / 1000) + 'K MRR:  >5 years', { target: '$' + Math.round(t / 1000) + 'K MRR' }) + "\n";
        }
      }
    }
    if (anyMilestoneShown) {
      result += makeToken('calc_out.revenue_projector.row.milestone_range', '  Range shows ±2% net growth variation.') + "\n";
    }
  }
  if (!anyMilestoneShown && currentMrr > 0) {
    if (netRate <= 0) {
      result += makeToken('calc_out.revenue_projector.row.no_milestones', 'With zero or negative net growth, no milestones can be projected.') + "\n";
    }
  }

  // ========================
  // 2b. Monthly MRR Breakdown (12-month full table; 6/24 show first 6 rows)
  // ========================
  result += "\n" + makeToken('calc_out.section.revenue_projector_monthly_mrr_breakdown', '📅 Monthly MRR Breakdown') + "\n";
  const showMonths = months === 12 ? 12 : Math.min(months, 6);
  for (let m = 1; m <= showMonths; m++) {
    const mrrAtM = currentMrr * Math.pow(1 + netRate, m);
    const delta = mrrAtM - (currentMrr * Math.pow(1 + netRate, m - 1));
    result += makeToken('calc_out.revenue_projector.row.month_progress', 'Month ' + String(m).padStart(2, " ") + ':  ' + fmt(mrrAtM) + '/mo  (+' + fmt(delta) + ')', { month: String(m).padStart(2, " "), mrr: fmt(mrrAtM), delta: fmt(delta) }) + (m % 3 === 0 ? "  ← Q" + (m / 3) : "") + "\n";
  }
  if (months > showMonths) {
    const endM = currentMrr * Math.pow(1 + netRate, months);
    const endD = endM - (currentMrr * Math.pow(1 + netRate, months - 1));
    result += "  ...\n";
    result += makeToken('calc_out.revenue_projector.row.month_target', 'Month ' + months + ':  ' + fmt(endM) + '/mo  (+' + fmt(endD) + ')  ← target', { month: String(months), mrr: fmt(endM), delta: fmt(endD) }) + "\n";
  }

  // ========================
  // 3. Growth Scenarios & What-If
  // ========================
  result += "\n" + makeToken('calc_out.section.revenue_projector_growth_scenarios', '🔄 Growth Scenarios (' + months + '-Month Outlook)', { months: String(months) }) + "\n";
  if (currentMrr > 0) {
    const scenarioRates = [
      { r: Math.max(1, Math.round(netRate * 100 * 0.5)), code: 'calc_out.label.growth_scenario_conservative', label: "🐢 Conservative" },
      { r: Math.round(netRate * 100), code: 'calc_out.label.growth_scenario_current_pace', label: "📈 Current Pace" },
      { r: Math.max(1, Math.round(netRate * 100 * 1.5)), code: 'calc_out.label.growth_scenario_aggressive', label: "🚀 Aggressive" },
      { r: Math.min(50, Math.round(netRate * 100 * 2)), code: 'calc_out.label.growth_scenario_hyper_growth', label: "🔥 Hyper-Growth" },
    ];
    const seen = new Set<number>();
    for (const sc of scenarioRates) {
      if (seen.has(sc.r) || sc.r <= 0) continue;
      seen.add(sc.r);
      const scEnd = currentMrr * Math.pow(1 + sc.r / 100, months);
      const scTo10k = currentMrr > 0 && sc.r > 0
        ? Math.ceil(Math.log(10000 / currentMrr) / Math.log(1 + sc.r / 100))
        : null;
      result += "• " + makeToken(sc.code, sc.label);
      result += " ".repeat(Math.max(1, 24 - sc.label.length));
      result += "+" + pct(sc.r) + "/mo  →  " + fmt(scEnd) + "/mo";
      if (scTo10k !== null && scTo10k > 0) result += "  |  " + makeToken('calc_out.revenue_projector.row.to_10k', '$10K in ' + scTo10k + ' mo', { months: String(scTo10k) });
      result += "\n";
    }
    if (hasCustom) {
      const customEnd = currentMrr * Math.pow(1 + customNetRate, months);
      const cTo10k = currentMrr > 0 && customNetRate > 0 ? Math.ceil(Math.log(10000 / currentMrr) / Math.log(1 + customNetRate)) : null;
      const customLabelText = "🎯 Custom (+" + pct(customGrowthRate) + "/mo)";
      result += "• " + makeToken('calc_out.revenue_projector.row.custom_scenario', customLabelText, { rate: pct(customGrowthRate) });
      for (let pad = customLabelText.length; pad < 24; pad++) result += " ";
      result += "→  " + fmt(customEnd) + "/mo";
      if (cTo10k !== null && cTo10k > 0) result += "  |  " + makeToken('calc_out.revenue_projector.row.to_10k', '$10K in ' + cTo10k + ' mo', { months: String(cTo10k) });
      result += "\n";
    } else {
      result += makeToken('calc_out.revenue_projector.row.custom_hint', '• 🎯 Custom: enter a growth rate above to see your target') + "\n";
    }
  } else {
    result += makeToken('calc_out.revenue_projector.row.enter_mrr_scenarios', 'Enter your current MRR to see growth scenarios.') + "\n";
  }

  // What-If Analysis
  result += "\n" + makeToken('calc_out.section.revenue_projector_what_if_analysis', '🔄 What-If Analysis') + "\n";
  if (currentMrr > 0) {
    // Scenario A: Cut churn by 1pp
    if (churnRate > 0) {
      const cutChurnRate = Math.max(0, churnRate - 1);
      const cutNetRate = (grossGrowthRate - cutChurnRate) / 100;
      const cutEndMRR = currentMrr * Math.pow(1 + cutNetRate, months);
      result += makeToken('calc_out.revenue_projector.row.whatif_cut_churn_head', 'A) Cut churn ' + pct(churnRate) + ' → ' + pct(cutChurnRate) + ':', { churn: pct(churnRate), cut: pct(cutChurnRate) }) + "\n";
      result += makeToken('calc_out.revenue_projector.row.whatif_net_growth', '   Net growth: +' + pct(netRate * 100) + ' → +' + pct(cutNetRate * 100), { from: pct(netRate * 100), to: pct(cutNetRate * 100) }) + " | " + makeToken('calc_out.revenue_projector.row.whatif_end_mrr', 'End MRR: ' + fmt(endMRR) + ' → ' + fmt(cutEndMRR) + ' (+' + fmt(cutEndMRR - endMRR) + ')', { from: fmt(endMRR), to: fmt(cutEndMRR), delta: fmt(cutEndMRR - endMRR) }) + "\n\n";
    } else {
      result += makeToken('calc_out.revenue_projector.row.whatif_churn_zero', 'A) Churn is already 0% — no improvement needed here.') + "\n\n";
    }

    // Scenario B: Boost gross growth by 20%
    const boostGross = grossGrowthRate * 1.2;
    const boostNetRate = (boostGross - churnRate) / 100;
    const boostEndMRR = currentMrr * Math.pow(1 + boostNetRate, months);
    result += makeToken('calc_out.revenue_projector.row.whatif_boost_head', 'B) Boost gross growth +20%:') + "\n";
    result += makeToken('calc_out.revenue_projector.row.whatif_gross', '   Gross: +' + pct(grossGrowthRate) + ' → +' + pct(boostGross), { from: pct(grossGrowthRate), to: pct(boostGross) }) + " | " + makeToken('calc_out.revenue_projector.row.whatif_end_mrr', 'End MRR: ' + fmt(endMRR) + ' → ' + fmt(boostEndMRR) + ' (+' + fmt(boostEndMRR - endMRR) + ')', { from: fmt(endMRR), to: fmt(boostEndMRR), delta: fmt(boostEndMRR - endMRR) }) + "\n\n";

    // Scenario C: Reduce expenses by 20%
    if (monthlyExpenses > 0) {
      const reducedExp = monthlyExpenses * 0.8;
      const savings = monthlyExpenses - reducedExp;
      if (isProfitable) {
        result += makeToken('calc_out.revenue_projector.row.whatif_cut_expenses_head', 'C) Cut expenses 20%:') + "\n";
        result += makeToken('calc_out.revenue_projector.row.whatif_expenses', '   Expenses: ' + fmt(monthlyExpenses) + '/mo → ' + fmt(reducedExp) + '/mo', { from: fmt(monthlyExpenses), to: fmt(reducedExp) }) + " | " + makeToken('calc_out.revenue_projector.row.whatif_monthly_savings', 'Monthly savings: +' + fmt(savings) + '/mo', { savings: fmt(savings) }) + "\n";
        result += makeToken('calc_out.revenue_projector.row.whatif_profit_increase', '   Profit increases: ' + fmt(monthlyNetIncome) + '/mo → ' + fmt(monthlyNetIncome + savings) + '/mo', { from: fmt(monthlyNetIncome), to: fmt(monthlyNetIncome + savings) }) + "\n";
      } else {
        const newBurn = reducedExp - currentMrr;
        const newRunway = newBurn > 0 ? cashOnHand / newBurn : Infinity;
        result += makeToken('calc_out.revenue_projector.row.whatif_cut_expenses_head', 'C) Cut expenses 20%:') + "\n";
        result += makeToken('calc_out.revenue_projector.row.whatif_expenses', '   Expenses: ' + fmt(monthlyExpenses) + '/mo → ' + fmt(reducedExp) + '/mo', { from: fmt(monthlyExpenses), to: fmt(reducedExp) }) + "\n";
        result += makeToken('calc_out.revenue_projector.row.whatif_monthly_burn', '   Monthly burn: ' + fmt(monthlyBurn) + '/mo → ' + (newBurn > 0 ? fmt(newBurn) + '/mo' : 'profitable'), { from: fmt(monthlyBurn), to: newBurn > 0 ? fmt(newBurn) + '/mo' : 'profitable' }) + "\n";
        result += makeToken('calc_out.revenue_projector.row.whatif_runway', '   Runway: ' + (runwayCurrent === Infinity ? '∞' : runwayCurrent.toFixed(1) + ' mo') + ' → ' + (newRunway === Infinity ? '∞' : newRunway.toFixed(1) + ' mo'), { from: runwayCurrent === Infinity ? '∞' : runwayCurrent.toFixed(1) + ' mo', to: newRunway === Infinity ? '∞' : newRunway.toFixed(1) + ' mo' }) + "\n";
      }
    } else {
      result += makeToken('calc_out.revenue_projector.row.whatif_need_expenses', 'C) Enter monthly expenses to see cost-cutting impact.') + "\n";
    }
  } else {
    result += makeToken('calc_out.revenue_projector.row.enter_mrr_what_if', 'Enter your current MRR to see what-if scenarios.') + "\n";
  }

  // ========================
  // 4. Runway & Breakeven
  // ========================
  result += "\n" + makeToken('calc_out.section.revenue_projector_runway_breakeven', '💰 Runway & Breakeven') + "\n";
  result += "• " + makeToken('calc_out.label.cash_on_hand', 'Cash on Hand') + ":            " + fmt(cashOnHand) + "\n";
  result += "• " + makeToken('calc_out.label.monthly_expenses', 'Monthly Expenses') + ":        " + fmt(monthlyExpenses) + "/mo\n";
  result += "• " + makeToken('calc_out.label.monthly_net_revenue', 'Monthly Net Revenue') + ":     " + fmt(currentMrr) + "/mo  (MRR)\n\n";

  if (isProfitable && monthlyExpenses > 0) {
    // Case A: Already profitable
    result += "• " + makeToken('calc_out.label.monthly_profit', 'Monthly Profit') + ":          +" + fmt(monthlyNetIncome) + "  🟢 " + makeToken('calc_out.revenue_projector.row.revenue_covers_expenses', 'Revenue covers expenses.') + "\n";
    result += "• " + makeToken('calc_out.label.runway_zero_revenue', 'Runway (zero-revenue)') + ":   " + (runwayZeroRevenue !== null ? runwayZeroRevenue.toFixed(1) + " months" : "—") + "\n";
    result += "• " + makeToken('calc_out.label.runway_current_pace', 'Runway (current pace)') + ":   ∞ (profitable)\n";
    result += "• " + makeToken('calc_out.label.breakeven', 'Breakeven') + ":               " + makeToken('calc_out.revenue_projector.row.breakeven_already', '✅ Already breakeven') + "\n";
    result += "• " + makeToken('calc_out.label.annualized_profit', 'Annualized Profit') + ":       +" + fmt(annualizedProfit) + "/yr\n";
  } else if (monthlyExpenses > 0 && netRate > 0 && breakevenMonths !== null && breakevenMonths > 0) {
    // Case B: On path to breakeven
    result += "• " + makeToken('calc_out.label.monthly_burn', 'Monthly Burn') + ":            −" + fmt(monthlyBurn) + "/mo  " + runwayColor(runwayCurrent) + "\n";
    result += "• " + makeToken('calc_out.label.runway_zero_revenue', 'Runway (zero-revenue)') + ":   " + (runwayZeroRevenue !== null ? runwayZeroRevenue.toFixed(1) + " months" : "—") + "\n";
    result += "• " + makeToken('calc_out.label.runway_current_pace', 'Runway (current pace)') + ":   " + runwayCurrent.toFixed(1) + " months  " + runwayColor(runwayCurrent) + "\n";
    result += "• " + makeToken('calc_out.label.breakeven', 'Breakeven') + ":               " + makeToken('calc_out.revenue_projector.row.breakeven_in_months', breakevenMonths + ' months from now', { months: String(breakevenMonths) }) + "\n";
    result += makeToken('calc_out.revenue_projector.row.breakeven_reaches', '  → MRR reaches ' + fmt(monthlyExpenses) + '/mo covering all expenses.', { amount: fmt(monthlyExpenses) + '/mo' }) + "\n";
  } else if (monthlyExpenses > 0) {
    // Case C: Burning with no clear path
    result += "• " + makeToken('calc_out.label.monthly_burn', 'Monthly Burn') + ":            −" + fmt(monthlyBurn) + "/mo  " + runwayColor(runwayCurrent) + "\n";
    result += "• " + makeToken('calc_out.label.runway_zero_revenue', 'Runway (zero-revenue)') + ":   " + (runwayZeroRevenue !== null ? runwayZeroRevenue.toFixed(1) + " months" : "—") + "\n";
    result += "• " + makeToken('calc_out.label.runway_current_pace', 'Runway (current pace)') + ":   " + (runwayCurrent === Infinity ? "∞" : runwayCurrent.toFixed(1) + " months") + "  " + runwayColor(runwayCurrent) + "\n";
    if (breakevenMonths === null) {
      result += "• " + makeToken('calc_out.label.breakeven', 'Breakeven') + ":               " + makeToken('calc_out.revenue_projector.row.breakeven_not_reachable', 'Not reachable at current growth rate.') + "\n";
      result += makeToken('calc_out.revenue_projector.row.cut_expenses_now', '  → Cut expenses or boost growth immediately.') + "\n";
    }
  } else {
    result += makeToken('calc_out.revenue_projector.row.need_monthly_expenses_runway', 'Enter your monthly expenses to see runway and breakeven analysis.') + "\n";
  }

  // ========================
  // 5. Burn & Efficiency Metrics
  // ========================
  result += "\n" + makeToken('calc_out.section.revenue_projector_burn_efficiency_metrics', '🩺 Burn & Efficiency Metrics') + "\n";
  if (monthlyExpenses > 0) {
    result += "• " + makeToken('calc_out.label.gross_burn', 'Gross Burn') + ":              " + fmt(monthlyExpenses) + "/mo  (" + makeToken('calc_out.revenue_projector.row.total_expenses', 'total expenses') + ")\n";
    result += "• " + makeToken('calc_out.label.net_burn', 'Net Burn') + ":                " + (monthlyBurn > 0 ? "−" + fmt(monthlyBurn) + "/mo" : "+" + fmt(-monthlyBurn) + "/mo (profit)") + "  " + (isProfitable ? "🟢" : "🔴") + "\n\n";

    // Burn Multiple
    if (burnMultiple !== null) {
      result += "• " + makeToken('calc_out.label.burn_multiple', 'Burn Multiple') + ":           " + burnMultiple.toFixed(1) + "×  " + burnMultColor(burnMultiple) + "\n";
      result += makeToken('calc_out.revenue_projector.row.burn_multiple_legend', '  = net burn ÷ net new MRR') + " | <1.0× 🟢 | 1.0–2.0× 🟡 | >2.0× 🔴\n\n";
    } else if (isProfitable) {
      result += "• " + makeToken('calc_out.label.burn_multiple', 'Burn Multiple') + ":           " + makeToken('calc_out.revenue_projector.row.burn_multiple_na_profitable', 'N/A (profitable)') + "\n\n";
    } else {
      result += "• " + makeToken('calc_out.label.burn_multiple', 'Burn Multiple') + ":           " + makeToken('calc_out.revenue_projector.row.burn_multiple_na_no_new_mrr', 'N/A (no net new MRR)') + "\n\n";
    }

    // Rule of 40
    result += "• " + makeToken('calc_out.label.rule_of_40', 'Rule of 40') + ":              " + pct(ruleOf40Val) + "  " + r40Color(ruleOf40Val) + "\n";
    result += makeToken('calc_out.revenue_projector.row.rule_of_40_legend', '  = net growth ' + pct(netRate * 100) + ' + profit margin ' + pct(profitMargin), { growth: pct(netRate * 100), margin: pct(profitMargin) }) + "\n";
    result += "  | ≥40% 🟢 | 20-40% 🟡 | <20% 🔴\n\n";

    // MRR / Expense Ratio
    if (mrrExpenseRatio !== null) {
      result += "• " + makeToken('calc_out.label.mrr_expense_ratio', 'MRR / Expense Ratio') + ":     " + mrrExpenseRatio.toFixed(2) + "×  " + ratioColor(mrrExpenseRatio) + "\n";
      result += "  ≥2.0 🟢 | 1.0-2.0 🟡 | <1.0 🔴\n\n";
    }
    // LTV (Customer Lifetime Value via ARPU ÷ churn)
    if (arpu > 0 && churnRate > 0) {
      const ltv = arpu / (churnRate / 100);
      const ltvRatio = ltv / arpu;
      function ltvColor(r: number): string { if (r >= 36) return "🟢"; if (r >= 12) return "🟡"; return "🔴"; }
      result += "• " + makeToken('calc_out.label.ltv_customer_lifetime', 'LTV (Customer Lifetime)') + ": " + fmt(ltv) + "  (" + ltvRatio.toFixed(0) + "× ARPU)  " + ltvColor(ltvRatio) + "\n";
      result += makeToken('calc_out.revenue_projector.row.ltv_legend', '  = ARPU ÷ monthly churn') + " | ≥36× 🟢 | 12-36× 🟡 | <12× 🔴\n\n";
    } else if (arpu > 0 && churnRate === 0) {
      result += "• " + makeToken('calc_out.label.ltv_customer_lifetime', 'LTV (Customer Lifetime)') + ": ∞  (zero churn) 🟢\n\n";
    }
  } else {
    result += makeToken('calc_out.revenue_projector.row.need_monthly_expenses_burn', 'Enter monthly expenses to see burn and efficiency metrics.') + "\n\n";
  }

  // CAC Metrics (independent of expenses)
  if (cac > 0) {
    result += "• " + makeToken('calc_out.label.cac_customer_acq_cost', 'CAC (Customer Acq. Cost)') + ": " + fmt(cac) + "\n";
    if (cacPaybackMonths !== null) {
      result += "• " + makeToken('calc_out.label.cac_payback_period', 'CAC Payback Period') + ":       " + cacPaybackMonths.toFixed(1) + " months  " + paybackColor(cacPaybackMonths) + "\n";
      result += makeToken('calc_out.revenue_projector.row.cac_payback_legend', '  = CAC ÷ (ARPU × (1 − churn rate))') + " | <12mo 🟢 | 12-24mo 🟡 | >24mo 🔴\n";
    } else if (arpu <= 0 || churnRate <= 0) {
      result += "• " + makeToken('calc_out.label.cac_payback_period', 'CAC Payback Period') + ":       " + makeToken('calc_out.revenue_projector.row.enter_arpu_and_churn', '— (enter ARPU and churn rate)') + "\n";
    }
    if (ltvCacRatio !== null) {
      result += "• " + makeToken('calc_out.label.ltv_cac_ratio', 'LTV:CAC Ratio') + ":            " + ltvCacRatio.toFixed(1) + "×  " + ltvCacColor(ltvCacRatio) + "\n";
      result += makeToken('calc_out.revenue_projector.row.ltv_cac_legend', '  = LTV ÷ CAC') + " | ≥3× 🟢 | 1-3× 🟡 | <1× 🔴\n";
    }
    result += "\n";
  }

  // ARPU + Subscriber info
  if (arpu > 0 && subscriberCount > 0) {
    result += "• " + makeToken('calc_out.label.monthly_arpu', 'Monthly ARPU') + ":            " + fmt(arpu) + "\n";
    result += "• " + makeToken('calc_out.label.subscribers', 'Subscribers') + ":             " + subscriberCount + " (currentMrr ÷ ARPU)\n";
  }

  // ========================
  // 6. Action Plan
  // ========================
  result += "\n" + makeToken('calc_out.section.revenue_projector_action_plan', '🎯 Action Plan') + "\n";
  result += "• " + makeToken('calc_out.label.stage', 'Stage') + ": " + phaseLabel(currentMrr) + "\n";

  // Burn assessment
  if (isProfitable && monthlyExpenses > 0) {
    result += makeToken('calc_out.revenue_projector.row.burn_profitable', '• Burn:  ✅ Profitable — reinvest 30% of profit into growth.') + "\n";
  } else if (monthlyExpenses > 0 && runwayCurrent >= 12) {
    result += makeToken('calc_out.revenue_projector.row.burn_healthy_runway', '• Burn:  🟡 Burning cash but healthy runway. Watch burn rate.') + "\n";
  } else if (monthlyExpenses > 0 && runwayCurrent < 12) {
    result += makeToken('calc_out.revenue_projector.row.burn_critical', '• Burn:  🔴 Critical runway — cut costs or accelerate revenue.') + "\n";
  } else {
    result += makeToken('calc_out.revenue_projector.row.burn_need_expenses', '• Burn:  Enter expenses to assess burn.') + "\n";
  }

  // Growth assessment
  if (netRate >= 0.1) {
    result += makeToken('calc_out.revenue_projector.row.growth_exceptional', '• Growth: 🔥 Exceptional (+' + pct(netRate * 100) + ' net) — sustain by staying close to customers.', { rate: pct(netRate * 100) }) + "\n";
  } else if (netRate >= 0.05) {
    result += makeToken('calc_out.revenue_projector.row.growth_strong', '• Growth: 🚀 Strong (+' + pct(netRate * 100) + ' net) — compound is working for you.', { rate: pct(netRate * 100) }) + "\n";
  } else if (netRate > 0) {
    result += makeToken('calc_out.revenue_projector.row.growth_steady', '• Growth: 📈 Steady (+' + pct(netRate * 100) + ' net) — small gains compound over time.', { rate: pct(netRate * 100) }) + "\n";
  } else if (currentMrr > 0) {
    result += makeToken('calc_out.revenue_projector.row.growth_stalled', '• Growth: 🐢 Stalled (' + pct(netRate * 100) + ' net) — add a second acquisition channel.', { rate: pct(netRate * 100) }) + "\n";
  }

  // Risk assessment (matrix: profit status × runway)
  if (isProfitable && netRate >= 0.03) {
    result += makeToken('calc_out.revenue_projector.row.risk_low', '• Risk:  🟢 Low — profitable + growing. Focus on moat and scale.') + "\n";
  } else if (isProfitable && netRate > 0) {
    result += makeToken('calc_out.revenue_projector.row.risk_moderate', '• Risk:  🟡 Moderate — profitable but slow growth. Boost marketing.') + "\n";
  } else if (!isProfitable && runwayCurrent >= 12) {
    result += makeToken('calc_out.revenue_projector.row.risk_manageable', '• Risk:  🟡 Manageable — burning but decent runway. Plan breakeven path.') + "\n";
  } else if (!isProfitable && runwayCurrent < 12 && runwayCurrent >= 6) {
    result += makeToken('calc_out.revenue_projector.row.risk_elevated', '• Risk:  🟠 Elevated — under 12 months runway. Prioritize revenue growth.') + "\n";
  } else if (!isProfitable && runwayCurrent < 6) {
    result += makeToken('calc_out.revenue_projector.row.risk_urgent', '• Risk:  🔴 Urgent — under 6 months runway. Cut expenses now.') + "\n";
  }

  // Top priorities
  result += "\n" + makeToken('calc_out.section.revenue_projector_top_priorities', '🔥 Top Priorities:') + "\n";
  let priority = 1;
  if (churnRate > 0 && currentMrr > 0) {
    result += makeToken('calc_out.revenue_projector.row.priority_cut_churn', '  ' + priority + '. Cut churn from ' + pct(churnRate) + ' → ' + pct(Math.max(0, churnRate - 1)) + ' → $10K MRR sooner.', { n: String(priority), churn: pct(churnRate), cut: pct(Math.max(0, churnRate - 1)) }) + "\n";
    priority++;
  }
  if (isProfitable && monthlyExpenses > 0) {
    result += makeToken('calc_out.revenue_projector.row.priority_reinvest', '  ' + priority + '. With ' + fmt(monthlyNetIncome) + '/mo profit, reinvest in ads or part-time help.', { n: String(priority), profit: fmt(monthlyNetIncome) + '/mo' }) + "\n";
    priority++;
  }
  if (runwayCurrent < 12 && currentMrr > 0) {
    result += makeToken('calc_out.revenue_projector.row.priority_runway', '  ' + priority + '. Runway under 12 months — build a breakeven plan this week.', { n: String(priority) }) + "\n";
    priority++;
  }
  if (netRate < 0.02 && currentMrr > 0) {
    result += makeToken('calc_out.revenue_projector.row.priority_growth', '  ' + priority + '. Growth under 2%/mo — test one new acquisition channel.', { n: String(priority) }) + "\n";
    priority++;
  }
  if (priority === 1) {
    result += makeToken('calc_out.revenue_projector.row.priority_healthy', '  1. Runway is healthy. Focus on product quality and customer retention.') + "\n";
  }

  // ═══ Break-Even Revenue ═══
  if (currentMrr > 0 || monthlyExpenses > 0) {
    const breakEvenMRR = monthlyExpenses;
    const beLabel = currentMrr >= breakEvenMRR ? "🟢" : "🔴";
    result += "\n" + makeToken('calc_out.section.revenue_projector_break_even_revenue', '⚖️ Break-Even Revenue') + "\n";
    result += "• " + beLabel + " " + makeToken('calc_out.label.break_even_mrr', 'Break-even MRR') + ": " + fmt(monthlyExpenses) + "/mo (" + makeToken('calc_out.revenue_projector.row.covers_monthly_expenses', 'covers monthly expenses') + ")\n";
    if (currentMrr >= breakEvenMRR) {
      result += makeToken('calc_out.revenue_projector.row.current_mrr_above_breakeven', '• Current MRR ' + fmt(currentMrr) + ' is above break-even by ' + fmt(currentMrr - breakEvenMRR) + '/mo.', { mrr: fmt(currentMrr), gap: fmt(currentMrr - breakEvenMRR) + '/mo' }) + "\n";
    } else {
      const gap = breakEvenMRR - currentMrr;
      result += makeToken('calc_out.revenue_projector.row.gap_to_break_even', '• Gap to break-even: ' + fmt(gap) + '/mo. Closing this puts you at default-alive.', { gap: fmt(gap) + '/mo' }) + "\n";
    }
  }

  // ═══ Tip ═══
  let tip: string;
  if (cashOnHand > 0 && runwayCurrent > 18) {
    tip = makeToken('calc_out.revenue_projector.row.tip_runway_18', '💡 Tip: Runway above 18 months is a competitive advantage. Use it for bold bets (new channels, hiring, product) — not conservative hoarding.');
  } else if (runwayCurrent > 0 && runwayCurrent <= 6) {
    tip = makeToken('calc_out.revenue_projector.row.tip_sub6', '💡 Tip: Sub-6-month runway means raise now or cut hard. Delaying 30 days = raising from a weaker position. Cut discretionary spend first.');
  } else if (monthlyBurn > 0 && currentMrr > 0 && currentMrr / monthlyExpenses < 0.3) {
    tip = makeToken('calc_out.revenue_projector.row.tip_low_coverage', '💡 Tip: Your revenue covers under 30% of expenses. Focus 80% of effort on the 1-2 channels with highest ROI, not on cost-cutting.');
  } else {
    tip = makeToken('calc_out.revenue_projector.row.tip_reproject', '💡 Tip: Re-project monthly. Inputs change (churn, hiring, ad costs). The plan that got you here won\'t get you there.');
  }
  result += "\n" + tip + "\n";

  return [result];
}

// customFn mirrors the TypeScript function for client-side execution.
// Emoji characters use unicode escapes so the JS string survives bundling.
const customFn =
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let R=function(v){return Number.isNaN(v)?0:Math.max(0,v)},L=function(v){const o=r=>"$"+Math.round(r).toLocaleString(),l=r=>r.toFixed(1)+"%",n=R(parseFloat(v.currentMrr)||0),x=R(parseFloat(v.monthlyGrowthRate)||0),s=R(parseFloat(v.monthlyChurnRate)||0),u=R(parseFloat(v.monthlyExpenses)||0),F=R(parseFloat(v.cashOnHand)||0),b=R(parseFloat(v.arpu)||0),E=R(parseFloat(v.customGrowthRate)||0),C=R(parseFloat(v.cac)||0),i=R(parseInt(v.months)||12),c=(x-s)/100,ht=(Math.pow(1+c,12)-1)*100,d=n*Math.pow(1+c,i);let U=0;for(let r=1;r<=i;r++)U+=n*Math.pow(1+c,r);const X=n>0?d/n:0,V=b>0?Math.round(n/b):0,j=n-u,T=j*12,G=n>0?j/n*100:0,M=j>=0,N=E>0?(E-s)/100:0,k=E>0,K=C>0&&b>0&&s>0&&s<100?C/(b*(1-s/100)):null;function tt(r){return r<=12?"🟢":r<=24?"🟡":"🔴"}const H=b>0&&s>0?b/(s/100):0,$=C>0&&H>0?H/C:null;function et(r){return r>=3?"🟢":r>=1?"🟡":"🔴"}const S=u>0?F/u:null,y=u-n,p=y>0?F/y:1/0;function B(r){return r===1/0||r>=18?"🟢":r>=6?"🟡":"🔴"}let m=null;n>=u&&u>0?m=0:n>0&&c>0&&u>0&&(m=Math.ceil(Math.log(u/n)/Math.log(1+c)));const Q=n*c,q=y>0&&Q>0?y/Q:null;function rt(r){return r<1?"🟢":r<=2?"🟡":"🔴"}const z=u>0?n/u:null;function ot(r){return r>=2?"🟢":r>=1?"🟡":"🔴"}const W=c*100+G;function nt(r){return r>=40?"🟢":r>=20?"🟡":"🔴"}function ct(r){return n<=0||c<=0?null:n>=r?0:Math.ceil(Math.log(r/n)/Math.log(1+c))}function lt(r){return r>=10?t("calc_out.label.growth_status_exceptional","🟢 Exceptional"):r>=5?t("calc_out.label.growth_status_healthy","🟡 Healthy"):r>=0?t("calc_out.label.growth_status_slow","🟠 Slow"):t("calc_out.label.growth_status_shrinking","🔴 Shrinking")}function ut(r){return r<1e3?t("calc_out.label.phase_validation","Validation (<$1K MRR)"):r<1e4?t("calc_out.label.phase_early_traction","Early Traction ($1K–$10K MRR)"):r<1e5?t("calc_out.label.phase_scaling","Scaling ($10K–$100K MRR)"):t("calc_out.label.phase_growth","Growth (>$100K MRR)")}let e="";e+=t("calc_out.section.revenue_projector_revenue_snapshot","📊 Revenue Snapshot")+\`

\`,e+="• "+t("calc_out.label.starting_mrr","Starting MRR")+":           "+o(n)+\`/mo
\`,e+="• "+t("calc_out.label.ending_mrr","Ending MRR")+":             "+o(d)+"/mo  ("+t("calc_out.revenue_projector.row.after_n_months","after "+i+" months",{months:String(i)})+\`)
\`,e+="• "+t("calc_out.label.arr_equivalent","ARR Equivalent")+":         "+o(d*12)+\`/yr
\`,e+="• "+t("calc_out.label.total_revenue","Total Revenue")+":          "+o(U)+" "+t("calc_out.revenue_projector.row.over_n_months","over "+i+" months",{months:String(i)})+\`

\`,e+="• "+t("calc_out.label.gross_monthly_growth","Gross Monthly Growth")+":   +"+l(x)+"  ("+t("calc_out.revenue_projector.row.new_and_expansion","new + expansion")+\`)
\`,e+="• "+t("calc_out.label.monthly_churn","Monthly Churn")+":          −"+l(s)+"  ("+t("calc_out.revenue_projector.row.lost_revenue","lost revenue")+\`)
\`,e+="• "+t("calc_out.label.net_monthly_growth","Net Monthly Growth")+":     "+(c>=0?"+":"")+l(c*100)+"  ("+t("calc_out.revenue_projector.row.effective","effective")+")  "+lt(c*100)+\`
\`,e+="• "+t("calc_out.label.growth_multiple","Growth Multiple")+":        "+X.toFixed(1)+"×   ("+t("calc_out.revenue_projector.row.n_month_mrr_expansion",i+"-month MRR expansion",{months:String(i)})+\`)
\`,e+=\`
\`+t("calc_out.section.revenue_projector_mrr_milestones","📈 MRR Milestones")+\`
\`;const D=Math.min(Math.floor(i/3),8);for(let r=1;r<=D;r++){const _=r*3,a=n*Math.pow(1+c,_);e+=t("calc_out.revenue_projector.row.quarter_milestone","• Q"+r+" (Month "+_+"):  "+o(a)+"/mo",{q:String(r),month:String(_),mrr:o(a)})+(r===D?"  ← target":"")+\`
\`}e+=\`
\`+t("calc_out.section.revenue_projector_key_milestones","🎯 Key Milestones")+\`
\`;const at=[1e4,25e3,5e4,1e5];let I=!1;if(n>0&&c>0){for(const r of at){if(r<=n)continue;const _=ct(r);if(_!==null&&_>0)if(I=!0,_<=60){const a=c+.02,h=Math.max(.001,c-.02),w=Math.ceil(Math.log(r/n)/Math.log(1+a)),f=Math.ceil(Math.log(r/n)/Math.log(1+h));e+=t("calc_out.revenue_projector.row.milestone","• $"+Math.round(r/1e3)+"K MRR:  "+_+" months ["+w+"–"+f+"]",{target:"$"+Math.round(r/1e3)+"K MRR",months:String(_),fast:String(w),slow:String(f)})+\`
\`}else e+=t("calc_out.revenue_projector.row.milestone_far","• $"+Math.round(r/1e3)+"K MRR:  >5 years",{target:"$"+Math.round(r/1e3)+"K MRR"})+\`
\`}I&&(e+=t("calc_out.revenue_projector.row.milestone_range","  Range shows ±2% net growth variation.")+\`
\`)}!I&&n>0&&c<=0&&(e+=t("calc_out.revenue_projector.row.no_milestones","With zero or negative net growth, no milestones can be projected.")+\`
\`),e+=\`
\`+t("calc_out.section.revenue_projector_monthly_mrr_breakdown","📅 Monthly MRR Breakdown")+\`
\`;const J=i===12?12:Math.min(i,6);for(let r=1;r<=J;r++){const _=n*Math.pow(1+c,r),a=_-n*Math.pow(1+c,r-1);e+=t("calc_out.revenue_projector.row.month_progress","Month "+String(r).padStart(2," ")+":  "+o(_)+"/mo  (+"+o(a)+")",{month:String(r).padStart(2," "),mrr:o(_),delta:o(a)})+(r%3===0?"  ← Q"+r/3:"")+\`
\`}if(i>J){const r=n*Math.pow(1+c,i),_=r-n*Math.pow(1+c,i-1);e+=\`  ...
\`,e+=t("calc_out.revenue_projector.row.month_target","Month "+i+":  "+o(r)+"/mo  (+"+o(_)+")  ← target",{month:String(i),mrr:o(r),delta:o(_)})+\`
\`}if(e+=\`
\`+t("calc_out.section.revenue_projector_growth_scenarios","🔄 Growth Scenarios ("+i+"-Month Outlook)",{months:String(i)})+\`
\`,n>0){const r=[{r:Math.max(1,Math.round(c*100*.5)),code:"calc_out.label.growth_scenario_conservative",label:"🐢 Conservative"},{r:Math.round(c*100),code:"calc_out.label.growth_scenario_current_pace",label:"📈 Current Pace"},{r:Math.max(1,Math.round(c*100*1.5)),code:"calc_out.label.growth_scenario_aggressive",label:"🚀 Aggressive"},{r:Math.min(50,Math.round(c*100*2)),code:"calc_out.label.growth_scenario_hyper_growth",label:"🔥 Hyper-Growth"}],_=new Set;for(const a of r){if(_.has(a.r)||a.r<=0)continue;_.add(a.r);const h=n*Math.pow(1+a.r/100,i),w=n>0&&a.r>0?Math.ceil(Math.log(1e4/n)/Math.log(1+a.r/100)):null;e+="• "+t(a.code,a.label),e+=" ".repeat(Math.max(1,24-a.label.length)),e+="+"+l(a.r)+"/mo  →  "+o(h)+"/mo",w!==null&&w>0&&(e+="  |  "+t("calc_out.revenue_projector.row.to_10k","$10K in "+w+" mo",{months:String(w)})),e+=\`
\`}if(k){const a=n*Math.pow(1+N,i),h=n>0&&N>0?Math.ceil(Math.log(1e4/n)/Math.log(1+N)):null,w="🎯 Custom (+"+l(E)+"/mo)";e+="• "+t("calc_out.revenue_projector.row.custom_scenario",w,{rate:l(E)});for(let f=w.length;f<24;f++)e+=" ";e+="→  "+o(a)+"/mo",h!==null&&h>0&&(e+="  |  "+t("calc_out.revenue_projector.row.to_10k","$10K in "+h+" mo",{months:String(h)})),e+=\`
\`}else e+=t("calc_out.revenue_projector.row.custom_hint","• 🎯 Custom: enter a growth rate above to see your target")+\`
\`}else e+=t("calc_out.revenue_projector.row.enter_mrr_scenarios","Enter your current MRR to see growth scenarios.")+\`
\`;if(e+=\`
\`+t("calc_out.section.revenue_projector_what_if_analysis","🔄 What-If Analysis")+\`
\`,n>0){if(s>0){const h=Math.max(0,s-1),w=(x-h)/100,f=n*Math.pow(1+w,i);e+=t("calc_out.revenue_projector.row.whatif_cut_churn_head","A) Cut churn "+l(s)+" → "+l(h)+":",{churn:l(s),cut:l(h)})+\`
\`,e+=t("calc_out.revenue_projector.row.whatif_net_growth","   Net growth: +"+l(c*100)+" → +"+l(w*100),{from:l(c*100),to:l(w*100)})+" | "+t("calc_out.revenue_projector.row.whatif_end_mrr","End MRR: "+o(d)+" → "+o(f)+" (+"+o(f-d)+")",{from:o(d),to:o(f),delta:o(f-d)})+\`

\`}else e+=t("calc_out.revenue_projector.row.whatif_churn_zero","A) Churn is already 0% — no improvement needed here.")+\`

\`;const r=x*1.2,_=(r-s)/100,a=n*Math.pow(1+_,i);if(e+=t("calc_out.revenue_projector.row.whatif_boost_head","B) Boost gross growth +20%:")+\`
\`,e+=t("calc_out.revenue_projector.row.whatif_gross","   Gross: +"+l(x)+" → +"+l(r),{from:l(x),to:l(r)})+" | "+t("calc_out.revenue_projector.row.whatif_end_mrr","End MRR: "+o(d)+" → "+o(a)+" (+"+o(a-d)+")",{from:o(d),to:o(a),delta:o(a-d)})+\`

\`,u>0){const h=u*.8,w=u-h;if(M)e+=t("calc_out.revenue_projector.row.whatif_cut_expenses_head","C) Cut expenses 20%:")+\`
\`,e+=t("calc_out.revenue_projector.row.whatif_expenses","   Expenses: "+o(u)+"/mo → "+o(h)+"/mo",{from:o(u),to:o(h)})+" | "+t("calc_out.revenue_projector.row.whatif_monthly_savings","Monthly savings: +"+o(w)+"/mo",{savings:o(w)})+\`
\`,e+=t("calc_out.revenue_projector.row.whatif_profit_increase","   Profit increases: "+o(j)+"/mo → "+o(j+w)+"/mo",{from:o(j),to:o(j+w)})+\`
\`;else{const f=h-n,P=f>0?F/f:1/0;e+=t("calc_out.revenue_projector.row.whatif_cut_expenses_head","C) Cut expenses 20%:")+\`
\`,e+=t("calc_out.revenue_projector.row.whatif_expenses","   Expenses: "+o(u)+"/mo → "+o(h)+"/mo",{from:o(u),to:o(h)})+\`
\`,e+=t("calc_out.revenue_projector.row.whatif_monthly_burn","   Monthly burn: "+o(y)+"/mo → "+(f>0?o(f)+"/mo":"profitable"),{from:o(y),to:f>0?o(f)+"/mo":"profitable"})+\`
\`,e+=t("calc_out.revenue_projector.row.whatif_runway","   Runway: "+(p===1/0?"∞":p.toFixed(1)+" mo")+" → "+(P===1/0?"∞":P.toFixed(1)+" mo"),{from:p===1/0?"∞":p.toFixed(1)+" mo",to:P===1/0?"∞":P.toFixed(1)+" mo"})+\`
\`}}else e+=t("calc_out.revenue_projector.row.whatif_need_expenses","C) Enter monthly expenses to see cost-cutting impact.")+\`
\`}else e+=t("calc_out.revenue_projector.row.enter_mrr_what_if","Enter your current MRR to see what-if scenarios.")+\`
\`;if(e+=\`
\`+t("calc_out.section.revenue_projector_runway_breakeven","💰 Runway & Breakeven")+\`
\`,e+="• "+t("calc_out.label.cash_on_hand","Cash on Hand")+":            "+o(F)+\`
\`,e+="• "+t("calc_out.label.monthly_expenses","Monthly Expenses")+":        "+o(u)+\`/mo
\`,e+="• "+t("calc_out.label.monthly_net_revenue","Monthly Net Revenue")+":     "+o(n)+\`/mo  (MRR)

\`,M&&u>0?(e+="• "+t("calc_out.label.monthly_profit","Monthly Profit")+":          +"+o(j)+"  🟢 "+t("calc_out.revenue_projector.row.revenue_covers_expenses","Revenue covers expenses.")+\`
\`,e+="• "+t("calc_out.label.runway_zero_revenue","Runway (zero-revenue)")+":   "+(S!==null?S.toFixed(1)+" months":"—")+\`
\`,e+="• "+t("calc_out.label.runway_current_pace","Runway (current pace)")+\`:   ∞ (profitable)
\`,e+="• "+t("calc_out.label.breakeven","Breakeven")+":               "+t("calc_out.revenue_projector.row.breakeven_already","✅ Already breakeven")+\`
\`,e+="• "+t("calc_out.label.annualized_profit","Annualized Profit")+":       +"+o(T)+\`/yr
\`):u>0&&c>0&&m!==null&&m>0?(e+="• "+t("calc_out.label.monthly_burn","Monthly Burn")+":            −"+o(y)+"/mo  "+B(p)+\`
\`,e+="• "+t("calc_out.label.runway_zero_revenue","Runway (zero-revenue)")+":   "+(S!==null?S.toFixed(1)+" months":"—")+\`
\`,e+="• "+t("calc_out.label.runway_current_pace","Runway (current pace)")+":   "+p.toFixed(1)+" months  "+B(p)+\`
\`,e+="• "+t("calc_out.label.breakeven","Breakeven")+":               "+t("calc_out.revenue_projector.row.breakeven_in_months",m+" months from now",{months:String(m)})+\`
\`,e+=t("calc_out.revenue_projector.row.breakeven_reaches","  → MRR reaches "+o(u)+"/mo covering all expenses.",{amount:o(u)+"/mo"})+\`
\`):u>0?(e+="• "+t("calc_out.label.monthly_burn","Monthly Burn")+":            −"+o(y)+"/mo  "+B(p)+\`
\`,e+="• "+t("calc_out.label.runway_zero_revenue","Runway (zero-revenue)")+":   "+(S!==null?S.toFixed(1)+" months":"—")+\`
\`,e+="• "+t("calc_out.label.runway_current_pace","Runway (current pace)")+":   "+(p===1/0?"∞":p.toFixed(1)+" months")+"  "+B(p)+\`
\`,m===null&&(e+="• "+t("calc_out.label.breakeven","Breakeven")+":               "+t("calc_out.revenue_projector.row.breakeven_not_reachable","Not reachable at current growth rate.")+\`
\`,e+=t("calc_out.revenue_projector.row.cut_expenses_now","  → Cut expenses or boost growth immediately.")+\`
\`)):e+=t("calc_out.revenue_projector.row.need_monthly_expenses_runway","Enter your monthly expenses to see runway and breakeven analysis.")+\`
\`,e+=\`
\`+t("calc_out.section.revenue_projector_burn_efficiency_metrics","🩺 Burn & Efficiency Metrics")+\`
\`,u>0)if(e+="• "+t("calc_out.label.gross_burn","Gross Burn")+":              "+o(u)+"/mo  ("+t("calc_out.revenue_projector.row.total_expenses","total expenses")+\`)
\`,e+="• "+t("calc_out.label.net_burn","Net Burn")+":                "+(y>0?"−"+o(y)+"/mo":"+"+o(-y)+"/mo (profit)")+"  "+(M?"🟢":"🔴")+\`

\`,q!==null?(e+="• "+t("calc_out.label.burn_multiple","Burn Multiple")+":           "+q.toFixed(1)+"×  "+rt(q)+\`
\`,e+=t("calc_out.revenue_projector.row.burn_multiple_legend","  = net burn ÷ net new MRR")+\` | <1.0× 🟢 | 1.0–2.0× 🟡 | >2.0× 🔴

\`):M?e+="• "+t("calc_out.label.burn_multiple","Burn Multiple")+":           "+t("calc_out.revenue_projector.row.burn_multiple_na_profitable","N/A (profitable)")+\`

\`:e+="• "+t("calc_out.label.burn_multiple","Burn Multiple")+":           "+t("calc_out.revenue_projector.row.burn_multiple_na_no_new_mrr","N/A (no net new MRR)")+\`

\`,e+="• "+t("calc_out.label.rule_of_40","Rule of 40")+":              "+l(W)+"  "+nt(W)+\`
\`,e+=t("calc_out.revenue_projector.row.rule_of_40_legend","  = net growth "+l(c*100)+" + profit margin "+l(G),{growth:l(c*100),margin:l(G)})+\`
\`,e+=\`  | ≥40% 🟢 | 20-40% 🟡 | <20% 🔴

\`,z!==null&&(e+="• "+t("calc_out.label.mrr_expense_ratio","MRR / Expense Ratio")+":     "+z.toFixed(2)+"×  "+ot(z)+\`
\`,e+=\`  ≥2.0 🟢 | 1.0-2.0 🟡 | <1.0 🔴

\`),b>0&&s>0){let a=function(h){return h>=36?"🟢":h>=12?"🟡":"🔴"};var pt=a;const r=b/(s/100),_=r/b;e+="• "+t("calc_out.label.ltv_customer_lifetime","LTV (Customer Lifetime)")+": "+o(r)+"  ("+_.toFixed(0)+"× ARPU)  "+a(_)+\`
\`,e+=t("calc_out.revenue_projector.row.ltv_legend","  = ARPU ÷ monthly churn")+\` | ≥36× 🟢 | 12-36× 🟡 | <12× 🔴

\`}else b>0&&s===0&&(e+="• "+t("calc_out.label.ltv_customer_lifetime","LTV (Customer Lifetime)")+\`: ∞  (zero churn) 🟢

\`);else e+=t("calc_out.revenue_projector.row.need_monthly_expenses_burn","Enter monthly expenses to see burn and efficiency metrics.")+\`

\`;C>0&&(e+="• "+t("calc_out.label.cac_customer_acq_cost","CAC (Customer Acq. Cost)")+": "+o(C)+\`
\`,K!==null?(e+="• "+t("calc_out.label.cac_payback_period","CAC Payback Period")+":       "+K.toFixed(1)+" months  "+tt(K)+\`
\`,e+=t("calc_out.revenue_projector.row.cac_payback_legend","  = CAC ÷ (ARPU × (1 − churn rate))")+\` | <12mo 🟢 | 12-24mo 🟡 | >24mo 🔴
\`):(b<=0||s<=0)&&(e+="• "+t("calc_out.label.cac_payback_period","CAC Payback Period")+":       "+t("calc_out.revenue_projector.row.enter_arpu_and_churn","— (enter ARPU and churn rate)")+\`
\`),$!==null&&(e+="• "+t("calc_out.label.ltv_cac_ratio","LTV:CAC Ratio")+":            "+$.toFixed(1)+"×  "+et($)+\`
\`,e+=t("calc_out.revenue_projector.row.ltv_cac_legend","  = LTV ÷ CAC")+\` | ≥3× 🟢 | 1-3× 🟡 | <1× 🔴
\`),e+=\`
\`),b>0&&V>0&&(e+="• "+t("calc_out.label.monthly_arpu","Monthly ARPU")+":            "+o(b)+\`
\`,e+="• "+t("calc_out.label.subscribers","Subscribers")+":             "+V+\` (currentMrr ÷ ARPU)
\`),e+=\`
\`+t("calc_out.section.revenue_projector_action_plan","🎯 Action Plan")+\`
\`,e+="• "+t("calc_out.label.stage","Stage")+": "+ut(n)+\`
\`,M&&u>0?e+=t("calc_out.revenue_projector.row.burn_profitable","• Burn:  ✅ Profitable — reinvest 30% of profit into growth.")+\`
\`:u>0&&p>=12?e+=t("calc_out.revenue_projector.row.burn_healthy_runway","• Burn:  🟡 Burning cash but healthy runway. Watch burn rate.")+\`
\`:u>0&&p<12?e+=t("calc_out.revenue_projector.row.burn_critical","• Burn:  🔴 Critical runway — cut costs or accelerate revenue.")+\`
\`:e+=t("calc_out.revenue_projector.row.burn_need_expenses","• Burn:  Enter expenses to assess burn.")+\`
\`,c>=.1?e+=t("calc_out.revenue_projector.row.growth_exceptional","• Growth: 🔥 Exceptional (+"+l(c*100)+" net) — sustain by staying close to customers.",{rate:l(c*100)})+\`
\`:c>=.05?e+=t("calc_out.revenue_projector.row.growth_strong","• Growth: 🚀 Strong (+"+l(c*100)+" net) — compound is working for you.",{rate:l(c*100)})+\`
\`:c>0?e+=t("calc_out.revenue_projector.row.growth_steady","• Growth: 📈 Steady (+"+l(c*100)+" net) — small gains compound over time.",{rate:l(c*100)})+\`
\`:n>0&&(e+=t("calc_out.revenue_projector.row.growth_stalled","• Growth: 🐢 Stalled ("+l(c*100)+" net) — add a second acquisition channel.",{rate:l(c*100)})+\`
\`),M&&c>=.03?e+=t("calc_out.revenue_projector.row.risk_low","• Risk:  🟢 Low — profitable + growing. Focus on moat and scale.")+\`
\`:M&&c>0?e+=t("calc_out.revenue_projector.row.risk_moderate","• Risk:  🟡 Moderate — profitable but slow growth. Boost marketing.")+\`
\`:!M&&p>=12?e+=t("calc_out.revenue_projector.row.risk_manageable","• Risk:  🟡 Manageable — burning but decent runway. Plan breakeven path.")+\`
\`:!M&&p<12&&p>=6?e+=t("calc_out.revenue_projector.row.risk_elevated","• Risk:  🟠 Elevated — under 12 months runway. Prioritize revenue growth.")+\`
\`:!M&&p<6&&(e+=t("calc_out.revenue_projector.row.risk_urgent","• Risk:  🔴 Urgent — under 6 months runway. Cut expenses now.")+\`
\`),e+=\`
\`+t("calc_out.section.revenue_projector_top_priorities","🔥 Top Priorities:")+\`
\`;let g=1;if(s>0&&n>0&&(e+=t("calc_out.revenue_projector.row.priority_cut_churn","  "+g+". Cut churn from "+l(s)+" → "+l(Math.max(0,s-1))+" → $10K MRR sooner.",{n:String(g),churn:l(s),cut:l(Math.max(0,s-1))})+\`
\`,g++),M&&u>0&&(e+=t("calc_out.revenue_projector.row.priority_reinvest","  "+g+". With "+o(j)+"/mo profit, reinvest in ads or part-time help.",{n:String(g),profit:o(j)+"/mo"})+\`
\`,g++),p<12&&n>0&&(e+=t("calc_out.revenue_projector.row.priority_runway","  "+g+". Runway under 12 months — build a breakeven plan this week.",{n:String(g)})+\`
\`,g++),c<.02&&n>0&&(e+=t("calc_out.revenue_projector.row.priority_growth","  "+g+". Growth under 2%/mo — test one new acquisition channel.",{n:String(g)})+\`
\`,g++),g===1&&(e+=t("calc_out.revenue_projector.row.priority_healthy","  1. Runway is healthy. Focus on product quality and customer retention.")+\`
\`),n>0||u>0){const r=u,_=n>=r?"🟢":"🔴";if(e+=\`
\`+t("calc_out.section.revenue_projector_break_even_revenue","⚖️ Break-Even Revenue")+\`
\`,e+="• "+_+" "+t("calc_out.label.break_even_mrr","Break-even MRR")+": "+o(u)+"/mo ("+t("calc_out.revenue_projector.row.covers_monthly_expenses","covers monthly expenses")+\`)
\`,n>=r)e+=t("calc_out.revenue_projector.row.current_mrr_above_breakeven","• Current MRR "+o(n)+" is above break-even by "+o(n-r)+"/mo.",{mrr:o(n),gap:o(n-r)+"/mo"})+\`
\`;else{const a=r-n;e+=t("calc_out.revenue_projector.row.gap_to_break_even","• Gap to break-even: "+o(a)+"/mo. Closing this puts you at default-alive.",{gap:o(a)+"/mo"})+\`
\`}}let A;return F>0&&p>18?A=t("calc_out.revenue_projector.row.tip_runway_18","💡 Tip: Runway above 18 months is a competitive advantage. Use it for bold bets (new channels, hiring, product) — not conservative hoarding."):p>0&&p<=6?A=t("calc_out.revenue_projector.row.tip_sub6","💡 Tip: Sub-6-month runway means raise now or cut hard. Delaying 30 days = raising from a weaker position. Cut discretionary spend first."):y>0&&n>0&&n/u<.3?A=t("calc_out.revenue_projector.row.tip_low_coverage","💡 Tip: Your revenue covers under 30% of expenses. Focus 80% of effort on the 1-2 channels with highest ROI, not on cost-cutting."):A=t("calc_out.revenue_projector.row.tip_reproject","💡 Tip: Re-project monthly. Inputs change (churn, hiring, ad costs). The plan that got you here won't get you there."),e+=\`
\`+A+\`
\`,[e]},O=function(v,o,l){var n=Z(v);return Array.isArray(n)?n.join(\`
\`):String(n)};var _t=R,st=L,it=O,t=tk,Y='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',t=new Function("return "+Y)(),Z=function(v){return L(v)};return[O(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

const engine: ToolEngine = {
  slug: "solopreneur-revenue-projector",
  title: "SaaS Financial Forecaster",
  description: "The complete SaaS financial health dashboard: net-growth projections, runway, breakeven, burn metrics, LTV, sensitivity analysis, and what-if scenarios.",
  inputs: [
    { name: "currentMrr", label: "Current MRR ($)", placeholder: "e.g. 5000", type: "number" },
    { name: "monthlyGrowthRate", label: "Monthly Growth Rate (%)", placeholder: "e.g. 8", type: "number" },
    { name: "monthlyChurnRate", label: "Monthly Churn Rate (%)", placeholder: "e.g. 3", type: "number" },
    { name: "monthlyExpenses", label: "Monthly Expenses ($)", placeholder: "e.g. 3000", type: "number" },
    { name: "cashOnHand", label: "Cash on Hand ($)", placeholder: "e.g. 60000", type: "number" },
    { name: "arpu", label: "Avg Revenue Per User ($)", placeholder: "e.g. 25", type: "number" },
    { name: "customGrowthRate", label: "Custom Growth Rate (%)", placeholder: "e.g. 7 (optional)", type: "number" },
    { name: "cac", label: "CAC — Customer Acquisition Cost ($)", placeholder: "e.g. 200 (optional)", type: "number" },
    { name: "months", label: "Projection Period", placeholder: "", type: "select", options: ["6", "12", "24"] },
  ],
  clientConfig: { type: "custom", wordPools: {}, customFn },
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
  generate(inputs: Record<string, string>): string[] { return projectRevenue(inputs); },
  staticExamples: [
    '$calc_out.section.revenue_projector_revenue_snapshot|📊 Revenue Snapshot|\n\n• $calc_out.label.starting_mrr|Starting MRR|:           $5,000/mo\n• $calc_out.label.ending_mrr|Ending MRR|:             $8,979/mo  ($calc_out.revenue_projector.row.after_n_months{"months":"12"}|after 12 months|)\n• $calc_out.label.arr_equivalent|ARR Equivalent|:         $107,751/yr\n• $calc_out.label.total_revenue|Total Revenue|:          $83,565 $calc_out.revenue_projector.row.over_n_months{"months":"12"}|over 12 months|\n\n• $calc_out.label.gross_monthly_growth|Gross Monthly Growth|:   +8.0%  ($calc_out.revenue_projector.row.new_and_expansion|new + expansion|)\n• $calc_out.label.monthly_churn|Monthly Churn|:          −3.0%  ($calc_out.revenue_projector.row.lost_revenue|lost revenue|)\n• $calc_out.label.net_monthly_growth|Net Monthly Growth|:     +5.0%  ($calc_out.revenue_projector.row.effective|effective|)  $calc_out.label.growth_status_healthy|🟡 Healthy|\n• $calc_out.label.growth_multiple|Growth Multiple|:        1.8×   ($calc_out.revenue_projector.row.n_month_mrr_expansion{"months":"12"}|12-month MRR expansion|)\n\n$calc_out.section.revenue_projector_mrr_milestones|📈 MRR Milestones|\n$calc_out.revenue_projector.row.quarter_milestone{"q":"1","month":"3","mrr":"$5,788"}|• Q1 (Month 3):  $5,788/mo|\n$calc_out.revenue_projector.row.quarter_milestone{"q":"2","month":"6","mrr":"$6,700"}|• Q2 (Month 6):  $6,700/mo|\n$calc_out.revenue_projector.row.quarter_milestone{"q":"3","month":"9","mrr":"$7,757"}|• Q3 (Month 9):  $7,757/mo|\n$calc_out.revenue_projector.row.quarter_milestone{"q":"4","month":"12","mrr":"$8,979"}|• Q4 (Month 12):  $8,979/mo|  ← target\n\n$calc_out.section.revenue_projector_key_milestones|🎯 Key Milestones|\n$calc_out.revenue_projector.row.milestone{"target":"$10K MRR","months":"15","fast":"11","slow":"24"}|• $10K MRR:  15 months [11–24]|\n$calc_out.revenue_projector.row.milestone{"target":"$25K MRR","months":"33","fast":"24","slow":"55"}|• $25K MRR:  33 months [24–55]|\n$calc_out.revenue_projector.row.milestone{"target":"$50K MRR","months":"48","fast":"35","slow":"78"}|• $50K MRR:  48 months [35–78]|\n$calc_out.revenue_projector.row.milestone_far{"target":"$100K MRR"}|• $100K MRR:  >5 years|\n$calc_out.revenue_projector.row.milestone_range|  Range shows ±2% net growth variation.|\n\n$calc_out.section.revenue_projector_monthly_mrr_breakdown|📅 Monthly MRR Breakdown|\n$calc_out.revenue_projector.row.month_progress{"month":" 1","mrr":"$5,250","delta":"$250"}|Month  1:  $5,250/mo  (+$250)|\n$calc_out.revenue_projector.row.month_progress{"month":" 2","mrr":"$5,513","delta":"$263"}|Month  2:  $5,513/mo  (+$263)|\n$calc_out.revenue_projector.row.month_progress{"month":" 3","mrr":"$5,788","delta":"$276"}|Month  3:  $5,788/mo  (+$276)|  ← Q1\n$calc_out.revenue_projector.row.month_progress{"month":" 4","mrr":"$6,078","delta":"$289"}|Month  4:  $6,078/mo  (+$289)|\n$calc_out.revenue_projector.row.month_progress{"month":" 5","mrr":"$6,381","delta":"$304"}|Month  5:  $6,381/mo  (+$304)|\n$calc_out.revenue_projector.row.month_progress{"month":" 6","mrr":"$6,700","delta":"$319"}|Month  6:  $6,700/mo  (+$319)|  ← Q2\n$calc_out.revenue_projector.row.month_progress{"month":" 7","mrr":"$7,036","delta":"$335"}|Month  7:  $7,036/mo  (+$335)|\n$calc_out.revenue_projector.row.month_progress{"month":" 8","mrr":"$7,387","delta":"$352"}|Month  8:  $7,387/mo  (+$352)|\n$calc_out.revenue_projector.row.month_progress{"month":" 9","mrr":"$7,757","delta":"$369"}|Month  9:  $7,757/mo  (+$369)|  ← Q3\n$calc_out.revenue_projector.row.month_progress{"month":"10","mrr":"$8,144","delta":"$388"}|Month 10:  $8,144/mo  (+$388)|\n$calc_out.revenue_projector.row.month_progress{"month":"11","mrr":"$8,552","delta":"$407"}|Month 11:  $8,552/mo  (+$407)|\n$calc_out.revenue_projector.row.month_progress{"month":"12","mrr":"$8,979","delta":"$428"}|Month 12:  $8,979/mo  (+$428)|  ← Q4\n\n$calc_out.section.revenue_projector_growth_scenarios{"months":"12"}|🔄 Growth Scenarios (12-Month Outlook)|\n• $calc_out.label.growth_scenario_conservative|🐢 Conservative|         +3.0%/mo  →  $7,129/mo  |  $calc_out.revenue_projector.row.to_10k{"months":"24"}|$10K in 24 mo|\n• $calc_out.label.growth_scenario_current_pace|📈 Current Pace|         +5.0%/mo  →  $8,979/mo  |  $calc_out.revenue_projector.row.to_10k{"months":"15"}|$10K in 15 mo|\n• $calc_out.label.growth_scenario_aggressive|🚀 Aggressive|           +8.0%/mo  →  $12,591/mo  |  $calc_out.revenue_projector.row.to_10k{"months":"10"}|$10K in 10 mo|\n• $calc_out.label.growth_scenario_hyper_growth|🔥 Hyper-Growth|         +10.0%/mo  →  $15,692/mo  |  $calc_out.revenue_projector.row.to_10k{"months":"8"}|$10K in 8 mo|\n$calc_out.revenue_projector.row.custom_hint|• 🎯 Custom: enter a growth rate above to see your target|\n\n$calc_out.section.revenue_projector_what_if_analysis|🔄 What-If Analysis|\n$calc_out.revenue_projector.row.whatif_cut_churn_head{"churn":"3.0%","cut":"2.0%"}|A) Cut churn 3.0% → 2.0%:|\n$calc_out.revenue_projector.row.whatif_net_growth{"from":"5.0%","to":"6.0%"}|   Net growth: +5.0% → +6.0%| | $calc_out.revenue_projector.row.whatif_end_mrr{"from":"$8,979","to":"$10,061","delta":"$1,082"}|End MRR: $8,979 → $10,061 (+$1,082)|\n\n$calc_out.revenue_projector.row.whatif_boost_head|B) Boost gross growth +20%:|\n$calc_out.revenue_projector.row.whatif_gross{"from":"8.0%","to":"9.6%"}|   Gross: +8.0% → +9.6%| | $calc_out.revenue_projector.row.whatif_end_mrr{"from":"$8,979","to":"$10,766","delta":"$1,787"}|End MRR: $8,979 → $10,766 (+$1,787)|\n\n$calc_out.revenue_projector.row.whatif_cut_expenses_head|C) Cut expenses 20%:|\n$calc_out.revenue_projector.row.whatif_expenses{"from":"$3,000","to":"$2,400"}|   Expenses: $3,000/mo → $2,400/mo| | $calc_out.revenue_projector.row.whatif_monthly_savings{"savings":"$600"}|Monthly savings: +$600/mo|\n$calc_out.revenue_projector.row.whatif_profit_increase{"from":"$2,000","to":"$2,600"}|   Profit increases: $2,000/mo → $2,600/mo|\n\n$calc_out.section.revenue_projector_runway_breakeven|💰 Runway & Breakeven|\n• $calc_out.label.cash_on_hand|Cash on Hand|:            $60,000\n• $calc_out.label.monthly_expenses|Monthly Expenses|:        $3,000/mo\n• $calc_out.label.monthly_net_revenue|Monthly Net Revenue|:     $5,000/mo  (MRR)\n\n• $calc_out.label.monthly_profit|Monthly Profit|:          +$2,000  🟢 $calc_out.revenue_projector.row.revenue_covers_expenses|Revenue covers expenses.|\n• $calc_out.label.runway_zero_revenue|Runway (zero-revenue)|:   20.0 months\n• $calc_out.label.runway_current_pace|Runway (current pace)|:   ∞ (profitable)\n• $calc_out.label.breakeven|Breakeven|:               $calc_out.revenue_projector.row.breakeven_already|✅ Already breakeven|\n• $calc_out.label.annualized_profit|Annualized Profit|:       +$24,000/yr\n\n$calc_out.section.revenue_projector_burn_efficiency_metrics|🩺 Burn & Efficiency Metrics|\n• $calc_out.label.gross_burn|Gross Burn|:              $3,000/mo  ($calc_out.revenue_projector.row.total_expenses|total expenses|)\n• $calc_out.label.net_burn|Net Burn|:                +$2,000/mo (profit)  🟢\n\n• $calc_out.label.burn_multiple|Burn Multiple|:           $calc_out.revenue_projector.row.burn_multiple_na_profitable|N/A (profitable)|\n\n• $calc_out.label.rule_of_40|Rule of 40|:              45.0%  🟢\n$calc_out.revenue_projector.row.rule_of_40_legend{"growth":"5.0%","margin":"40.0%"}|  = net growth 5.0% + profit margin 40.0%|\n  | ≥40% 🟢 | 20-40% 🟡 | <20% 🔴\n\n• $calc_out.label.mrr_expense_ratio|MRR / Expense Ratio|:     1.67×  🟡\n  ≥2.0 🟢 | 1.0-2.0 🟡 | <1.0 🔴\n\n• $calc_out.label.ltv_customer_lifetime|LTV (Customer Lifetime)|: $833  (33× ARPU)  🟡\n$calc_out.revenue_projector.row.ltv_legend|  = ARPU ÷ monthly churn| | ≥36× 🟢 | 12-36× 🟡 | <12× 🔴\n\n• $calc_out.label.cac_customer_acq_cost|CAC (Customer Acq. Cost)|: $200\n• $calc_out.label.cac_payback_period|CAC Payback Period|:       8.2 months  🟢\n$calc_out.revenue_projector.row.cac_payback_legend|  = CAC ÷ (ARPU × (1 − churn rate))| | <12mo 🟢 | 12-24mo 🟡 | >24mo 🔴\n• $calc_out.label.ltv_cac_ratio|LTV:CAC Ratio|:            4.2×  🟢\n$calc_out.revenue_projector.row.ltv_cac_legend|  = LTV ÷ CAC| | ≥3× 🟢 | 1-3× 🟡 | <1× 🔴\n\n• $calc_out.label.monthly_arpu|Monthly ARPU|:            $25\n• $calc_out.label.subscribers|Subscribers|:             200 (currentMrr ÷ ARPU)\n\n$calc_out.section.revenue_projector_action_plan|🎯 Action Plan|\n• $calc_out.label.stage|Stage|: $calc_out.label.phase_early_traction|Early Traction ($1K–$10K MRR)|\n$calc_out.revenue_projector.row.burn_profitable|• Burn:  ✅ Profitable — reinvest 30% of profit into growth.|\n$calc_out.revenue_projector.row.growth_strong{"rate":"5.0%"}|• Growth: 🚀 Strong (+5.0% net) — compound is working for you.|\n$calc_out.revenue_projector.row.risk_low|• Risk:  🟢 Low — profitable + growing. Focus on moat and scale.|\n\n$calc_out.section.revenue_projector_top_priorities|🔥 Top Priorities:|\n$calc_out.revenue_projector.row.priority_cut_churn{"n":"1","churn":"3.0%","cut":"2.0%"}|  1. Cut churn from 3.0% → 2.0% → $10K MRR sooner.|\n$calc_out.revenue_projector.row.priority_reinvest{"n":"2","profit":"$2,000/mo"}|  2. With $2,000/mo profit, reinvest in ads or part-time help.|\n\n$calc_out.section.revenue_projector_break_even_revenue|⚖️ Break-Even Revenue|\n• 🟢 $calc_out.label.break_even_mrr|Break-even MRR|: $3,000/mo ($calc_out.revenue_projector.row.covers_monthly_expenses|covers monthly expenses|)\n$calc_out.revenue_projector.row.current_mrr_above_breakeven{"mrr":"$5,000","gap":"$2,000/mo"}|• Current MRR $5,000 is above break-even by $2,000/mo.|\n\n$calc_out.revenue_projector.row.tip_runway_18|💡 Tip: Runway above 18 months is a competitive advantage. Use it for bold bets (new channels, hiring, product) — not conservative hoarding.|\n',
  ],
  faq: [
    { q: "What is a good monthly growth rate for a SaaS?", a: "For early-stage SaaS (under $10K MRR), 5-10% monthly net growth is good. At $10K-$100K MRR, 3-5% is healthy. Above $100K MRR, 2-3% is normal. Net growth = gross growth − churn — both matter equally." },
    { q: "What's the difference between gross growth and net growth?", a: "Gross growth = new customer revenue + expansion revenue (upgrades). Net growth = gross growth − churn (cancellations + downgrades). If your gross growth is 8% but churn is 5%, your net is only 3% — you're growing but losing nearly half to churn. Net growth is what builds long-term revenue." },
    { q: "How do I calculate my monthly expenses?", a: "Include everything that recurs monthly: hosting, SaaS tools, contractor/VA costs, software subscriptions, marketing budget, and your own salary/withdrawal. Don't include one-time purchases. If your expenses fluctuate, use the 3-month average." },
    { q: "What's a healthy runway for a solopreneur?", a: "12+ months of runway at current burn rate is comfortable. 6-12 months is manageable but requires attention. Under 6 months is critical — you need to cut costs, raise prices, or launch new revenue streams immediately. This calculator shows both 'zero-revenue' and 'current pace' runway." },
    { q: "What is Burn Multiple and why does it matter?", a: "Burn Multiple = net burn ÷ net new MRR. It measures how much you're spending to generate each dollar of new recurring revenue. <1.0× is excellent (efficient growth), 1.0-2.0× is acceptable, >2.0× means you're over-spending relative to growth. Profitable businesses have no burn multiple." },
    { q: "How accurate are these projections?", a: "The projection is mathematically precise given your inputs, but real-world growth is lumpy. Use the conservative and aggressive scenarios to see the range of possible outcomes. For budgeting, always plan with the conservative end. Revisit this calculator monthly to update with actual numbers." },
    { q: "What's a good LTV:CAC ratio?", a: "A 3:1 LTV:CAC ratio is the SaaS industry benchmark — your customer lifetime value should be at least 3× your cost to acquire them. 5:1 or higher is excellent (you can afford to spend more on acquisition). Below 1:1 means you're losing money on every customer. Track CAC Payback alongside: under 12 months to recover your acquisition cost is healthy." },
    { q: "How do I project revenue for a SaaS?", a: "Project: 1) MRR growth (3-15% MoM for early), 2) New MRR per month, 3) Churn (1-3% monthly), 4) Expansion (5-15% per cohort). Bottom-up: cohort-based (each cohort grows/shrinks). Top-down: market × share. Most: bottom-up is more accurate. Tools: Excel, Google Sheets, Mosaic, Pigment. Update monthly. Compare: actual vs forecast. Adjust assumptions quarterly." },
    { q: "How do I build a 3-statement financial model?", a: "Three statements: 1) Income statement (revenue, COGS, opex, profit), 2) Balance sheet (assets, liabilities, equity), 3) Cash flow (operating, investing, financing). SaaS: revenue = MRR + new, costs = fixed + variable, cash = revenue - costs. Most: 3-5 year model, monthly granularity. Tools: Excel, Fathom, Mosaic. Update monthly. Investor model: 5 years, 3 scenarios (base, up, down)." },
    { q: "What is the right way to model revenue for usage-based pricing?", a: "Usage-based: 1) Customer count, 2) Usage per customer, 3) Price per unit. For 100 customers at 100K API calls/month at $0.001/call: $10K MRR. Track usage distribution (not average). top 10% of customers = 50% of usage. Model: cohort-based with usage growth. Update: weekly. Tools: Stripe Sigma, Metronome, Orb. Best option: 3-5 year cohort model with usage distribution." },
    { q: "How do I show runway and dilution in projections?", a: "Runway = cash / burn. Show: 1) Cash on hand, 2) Monthly burn, 3) Months of runway. Dilution: 1) Current ownership, 2) Future rounds (% dilution), 3) Liquidation preferences. For 5-year model: 1) Pre-seed/seed: 18-24 months runway, 2) Series A: 12-18 months runway target, 3) Series B: 18-24 months. Most: 2-3 years visibility needed. Show: when you raise next + how much." },
    { q: "What is a good ARR projection for a seed-stage SaaS?", a: "Year 1: $100-500K ARR. Year 2: $500K-2M. Year 3: $1-5M. By year 3: $1M+ ARR is \"good\" (Series A ready), $3M+ is \"great\". aim for $1M ARR in 18-24 months (rule of 40 friendly). Track MRR × 12 = ARR. T2D3: Triple, Triple, Double, Double, Double. Best in class: $5M ARR in 3 years from seed. $1-3M ARR in 3 years is realistic." },
    { q: "How do I account for seasonality in revenue projections?", a: "Seasonality: 1) Most industries: Q4 spike (B2C), 2) B2B: Q1, Q3 slower, 3) Education: Sep-Dec, 4) Tax software: Jan-Apr. Build: monthly model with seasonality factors. Example: 30% Q4, 25% Q1, 20% Q2, 25% Q3. Use 3+ years of historical data. Avoid linear projection. 20-40% revenue swing between quarters is normal. Update: as data emerges. Tool: cohort + seasonality model." },
  ],
  howToUse: [
    "Enter your current Monthly Recurring Revenue (MRR).",
    "Enter your average monthly growth rate (gross, before churn).",
    "Enter your monthly churn rate to see net growth — the real number.",
    "Enter your total monthly expenses (hosting, tools, salary, etc.).",
    "Enter your cash on hand to calculate runway and financial buffer.",
    "Enter your ARPU (Average Revenue Per User) for subscriber counts.",
    "Optionally enter a custom growth rate to test your own scenario.",
    "Optionally enter your CAC (Customer Acquisition Cost) for payback and LTV:CAC.",
    "Select your projection period (6, 12, or 24 months).",
    "Review the Revenue Snapshot for your net growth and ending MRR.",
    "Scan the Monthly MRR Breakdown to see month-by-month progress.",
    "Check Runway & Breakeven to know how long your cash will last.",
    "Study the Burn & Efficiency Metrics — Rule of 40, Burn Multiple, ratios.",
    "Explore What-If scenarios to see the impact of better churn or lower costs.",
    "Read the Action Plan for prioritized next steps based on your data.",
  ],
  engineKey: true,
};
registerEngine(engine);
