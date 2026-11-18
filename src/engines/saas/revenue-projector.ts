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
  CALC_OUTPUT_MAKE_TOKEN_JS +
  "function fmt(n){return '$'+Math.round(n).toLocaleString()}\n" +
  "function pct(n){return n.toFixed(1)+'%'}\n" +
  "var cnn=function(x){return Math.max(0,x)};\n" +
  "var mr=cnn(parseFloat(inputs.currentMrr)||0);\n" +
  "var gr=cnn(parseFloat(inputs.monthlyGrowthRate)||0);\n" +
  "var cr=cnn(parseFloat(inputs.monthlyChurnRate)||0);\n" +
  "var ex=cnn(parseFloat(inputs.monthlyExpenses)||0);\n" +
  "var cash=cnn(parseFloat(inputs.cashOnHand)||0);\n" +
  "var arpu=cnn(parseFloat(inputs.arpu)||0);\n" +
  "var cgr=cnn(parseFloat(inputs.customGrowthRate)||0);\n" +
  "var cac=cnn(parseFloat(inputs.cac)||0);\n" +
  "var mo=cnn(parseInt(inputs.months)||12);\n" +
  "var nr=(gr-cr)/100;\n" +
  "var annRate=(Math.pow(1+nr,12)-1)*100;\n" +
  "var end=mr*Math.pow(1+nr,mo);\n" +
  "var total=0;for(var i=1;i<=mo;i++)total+=mr*Math.pow(1+nr,i);\n" +
  "var mult=mr>0?end/mr:0;\n" +
  "var subs=arpu>0?Math.round(mr/arpu):0;\n" +
  "var netInc=mr-ex;\n" +
  "var annProfit=netInc*12;\n" +
  "var pMargin=mr>0?(netInc/mr)*100:0;\n" +
  "var isProf=netInc>=0;\n" +
  "var rZero=ex>0?cash/ex:null;\n" +
  "var mBurn=ex-mr;\n" +
  "var rCurr=mBurn>0?cash/mBurn:Infinity;\n" +
  "function rColor(m){if(m===Infinity)return '\\uD83D\\uDFE2';if(m>=18)return '\\uD83D\\uDFE2';if(m>=6)return '\\uD83D\\uDFE1';return '\\uD83D\\uDD34';}\n" +
  "var beMonths=null;\n" +
  "if(mr>=ex&&ex>0)beMonths=0;\n" +
  "else if(mr>0&&nr>0&&ex>0)beMonths=Math.ceil(Math.log(ex/mr)/Math.log(1+nr));\n" +
  "var netNew=mr*nr;\n" +
  "var cNr=cgr>0?(cgr-cr)/100:0;var hasCustom=cgr>0;\n" +
  "var cacPb=null;if(cac>0&&arpu>0&&cr>0&&cr<100)cacPb=cac/(arpu*(1-cr/100));\n" +
  "function pbColor(m){if(m<=12)return '\\uD83D\\uDFE2';if(m<=24)return '\\uD83D\\uDFE1';return '\\uD83D\\uDD34';}\n" +
  "var ltvC=arpu>0&&cr>0?arpu/(cr/100):0;\n" +
  "var ltvCRatio=cac>0&&ltvC>0?ltvC/cac:null;\n" +
  "function lcColor(r){if(r>=3)return '\\uD83D\\uDFE2';if(r>=1)return '\\uD83D\\uDFE1';return '\\uD83D\\uDD34';}\n" +
  "var bm=mBurn>0&&netNew>0?mBurn/netNew:null;\n" +
  "function bmColor(b){if(b<1)return '\\uD83D\\uDFE2';if(b<=2)return '\\uD83D\\uDFE1';return '\\uD83D\\uDD34';}\n" +
  "var mrrExp=ex>0?mr/ex:null;\n" +
  "function r2Color(r){if(r>=2)return '\\uD83D\\uDFE2';if(r>=1)return '\\uD83D\\uDFE1';return '\\uD83D\\uDD34';}\n" +
  "var r40=nr*100+pMargin;\n" +
  "function r40Color(v){if(v>=40)return '\\uD83D\\uDFE2';if(v>=20)return '\\uD83D\\uDFE1';return '\\uD83D\\uDD34';}\n" +
  "function mthsTo(t){if(mr<=0||nr<=0)return null;if(mr>=t)return 0;return Math.ceil(Math.log(t/mr)/Math.log(1+nr));}\n" +
  "function ngColor(r){if(r>=10)return tk('calc_out.label.growth_status_exceptional','\\uD83D\\uDFE2 Exceptional');if(r>=5)return tk('calc_out.label.growth_status_healthy','\\uD83D\\uDFE1 Healthy');if(r>=0)return tk('calc_out.label.growth_status_slow','\\uD83D\\uDFE0 Slow');return tk('calc_out.label.growth_status_shrinking','\\uD83D\\uDD34 Shrinking');}\n" +
  "function phase(m){if(m<1000)return tk('calc_out.label.phase_validation','Validation (<$1K MRR)');if(m<10000)return tk('calc_out.label.phase_early_traction','Early Traction ($1K\\u2013$10K MRR)');if(m<100000)return tk('calc_out.label.phase_scaling','Scaling ($10K\\u2013$100K MRR)');return tk('calc_out.label.phase_growth','Growth (>$100K MRR)');}\n" +
  "var r='';\n" +
  "r+=tk('calc_out.section.revenue_projector_revenue_snapshot','\\uD83D\\uDCCA Revenue Snapshot')+'\\n\\n';\n" +
  "r+='\\u2022 '+tk('calc_out.label.starting_mrr','Starting MRR')+':           '+fmt(mr)+'/mo\\n';\n" +
  "r+='\\u2022 '+tk('calc_out.label.ending_mrr','Ending MRR')+':             '+fmt(end)+'/mo  ('+tk('calc_out.revenue_projector.row.after_n_months','after '+mo+' months',{months:String(mo)})+')\\n';\n" +
  "r+='\\u2022 '+tk('calc_out.label.arr_equivalent','ARR Equivalent')+':         '+fmt(end*12)+'/yr\\n';\n" +
  "r+='\\u2022 '+tk('calc_out.label.total_revenue','Total Revenue')+':          '+fmt(total)+' '+tk('calc_out.revenue_projector.row.over_n_months','over '+mo+' months',{months:String(mo)})+'\\n\\n';\n" +
  "r+='\\u2022 '+tk('calc_out.label.gross_monthly_growth','Gross Monthly Growth')+':   +'+pct(gr)+'  ('+tk('calc_out.revenue_projector.row.new_and_expansion','new + expansion')+')\\n';\n" +
  "r+='\\u2022 '+tk('calc_out.label.monthly_churn','Monthly Churn')+':          \\u2212'+pct(cr)+'  ('+tk('calc_out.revenue_projector.row.lost_revenue','lost revenue')+')\\n';\n" +
  "r+='\\u2022 '+tk('calc_out.label.net_monthly_growth','Net Monthly Growth')+':     '+(nr>=0?'+':'')+pct(nr*100)+'  ('+tk('calc_out.revenue_projector.row.effective','effective')+')  '+ngColor(nr*100)+'\\n';\n" +
  "r+='\\u2022 '+tk('calc_out.label.growth_multiple','Growth Multiple')+':        '+mult.toFixed(1)+'\\u00d7   ('+tk('calc_out.revenue_projector.row.n_month_mrr_expansion',mo+'-month MRR expansion',{months:String(mo)})+')\\n';\n" +
  "r+='\\n'+tk('calc_out.section.revenue_projector_mrr_milestones','\\uD83D\\uDCC8 MRR Milestones')+'\\n';\n" +
  "var maxQ=Math.min(Math.floor(mo/3),8);\n" +
  "for(var q=1;q<=maxQ;q++){var mth=q*3;var mAt=mr*Math.pow(1+nr,mth);r+=tk('calc_out.revenue_projector.row.quarter_milestone','\\u2022 Q'+q+' (Month '+mth+'):  '+fmt(mAt)+'/mo',{q:String(q),month:String(mth),mrr:fmt(mAt)})+(q===maxQ?'  \\u2190 target':'')+'\\n';}\n" +
  "r+='\\n'+tk('calc_out.section.revenue_projector_key_milestones','\\uD83C\\uDFAF Key Milestones')+'\\n';\n" +
  "var tgts=[10000,25000,50000,100000];var anyShown=false;\n" +
  "if(mr>0&&nr>0){for(var ti=0;ti<tgts.length;ti++){var tg=tgts[ti];if(tg<=mr)continue;var mth2=mthsTo(tg);if(mth2!==null&&mth2>0){anyShown=true;if(mth2<=60){var fastR=nr+0.02;var slowR=Math.max(0.001,nr-0.02);var fastM=Math.ceil(Math.log(tg/mr)/Math.log(1+fastR));var slowM=Math.ceil(Math.log(tg/mr)/Math.log(1+slowR));r+=tk('calc_out.revenue_projector.row.milestone','\\u2022 $'+Math.round(tg/1000)+'K MRR:  '+mth2+' months ['+fastM+'\\u2013'+slowM+']',{target:'$'+Math.round(tg/1000)+'K MRR',months:String(mth2),fast:String(fastM),slow:String(slowM)})+'\\n';}else{r+=tk('calc_out.revenue_projector.row.milestone_far','\\u2022 $'+Math.round(tg/1000)+'K MRR:  >5 years',{target:'$'+Math.round(tg/1000)+'K MRR'})+'\\n';}}}}\n" +
  "if(!anyShown&&mr>0){if(nr<=0){r+=tk('calc_out.revenue_projector.row.no_milestones','With zero or negative net growth, no milestones can be projected.')+'\\n';}}\n" +
  "if(anyShown){r+=tk('calc_out.revenue_projector.row.milestone_range','  Range shows \\u00b12% net growth variation.')+'\\n';}\n" +
  "r+='\\n'+tk('calc_out.section.revenue_projector_monthly_mrr_breakdown','\\uD83D\\uDCC5 Monthly MRR Breakdown')+'\\n';\n" +
  "var showMo=mo===12?12:Math.min(mo,6);\n" +
  "for(var im=1;im<=showMo;im++){var mAtM=mr*Math.pow(1+nr,im);var dlt=mAtM-(mr*Math.pow(1+nr,im-1));r+=tk('calc_out.revenue_projector.row.month_progress','Month '+(' '+im).slice(-2)+':  '+fmt(mAtM)+'/mo  (+'+fmt(dlt)+')',{month:(' '+im).slice(-2),mrr:fmt(mAtM),delta:fmt(dlt)})+(im%3===0?'  \\u2190 Q'+(im/3):'')+'\\n';}\n" +
  "if(mo>showMo){var endM=mr*Math.pow(1+nr,mo);var endD=endM-(mr*Math.pow(1+nr,mo-1));r+='  ...\\n';r+=tk('calc_out.revenue_projector.row.month_target','Month '+mo+':  '+fmt(endM)+'/mo  (+'+fmt(endD)+')  \\u2190 target',{month:String(mo),mrr:fmt(endM),delta:fmt(endD)})+'\\n';}\n" +
  "r+='\\n'+tk('calc_out.section.revenue_projector_growth_scenarios','\\uD83D\\uDD04 Growth Scenarios ('+mo+'-Month Outlook)',{months:String(mo)})+'\\n';\n" +
  "if(mr>0){\n" +
  "var scRates=[{r:Math.max(1,Math.round(nr*100*0.5)),c:'calc_out.label.growth_scenario_conservative',l:'\\uD83D\\uDC22 Conservative'},{r:Math.round(nr*100),c:'calc_out.label.growth_scenario_current_pace',l:'\\uD83D\\uDCC8 Current Pace'},{r:Math.max(1,Math.round(nr*100*1.5)),c:'calc_out.label.growth_scenario_aggressive',l:'\\uD83D\\uDE80 Aggressive'},{r:Math.min(50,Math.round(nr*100*2)),c:'calc_out.label.growth_scenario_hyper_growth',l:'\\uD83D\\uDD25 Hyper-Growth'}];\n" +
  "var seen={};\n" +
  "for(var si=0;si<scRates.length;si++){var sc=scRates[si];if(seen[sc.r]||sc.r<=0)continue;seen[sc.r]=true;\n" +
  "var scEnd=mr*Math.pow(1+sc.r/100,mo);\n" +
  "var sc10k=mr>0&&sc.r>0?Math.ceil(Math.log(10000/mr)/Math.log(1+sc.r/100)):null;\n" +
  "r+='\\u2022 '+tk(sc.c,sc.l);\n" +
  "r+=' '.repeat(Math.max(1,24-sc.l.length));\n" +
  "r+='+'+pct(sc.r)+'/mo  \\u2192  '+fmt(scEnd)+'/mo';\n" +
  "if(sc10k!==null&&sc10k>0)r+='  |  '+tk('calc_out.revenue_projector.row.to_10k','$10K in '+sc10k+' mo',{months:String(sc10k)});\n" +
  "r+='\\n';}\n" +
  "if(hasCustom){\n" +
  "var cuEnd=mr*Math.pow(1+cNr,mo);\n" +
  "var cu10k=mr>0&&cNr>0?Math.ceil(Math.log(10000/mr)/Math.log(1+cNr)):null;\n" +
  "var cuLabel='\\u2022 \\uD83C\\uDFAF Custom (+'+pct(cgr)+'/mo)';\n" +
  "r+='\\u2022 '+tk('calc_out.revenue_projector.row.custom_scenario','\\uD83C\\uDFAF Custom (+'+pct(cgr)+'/mo)',{rate:pct(cgr)});for(var cp=cuLabel.length;cp<24;cp++)r+=' ';\n" +
  "r+='\\u2192  '+fmt(cuEnd)+'/mo';\n" +
  "if(cu10k!==null&&cu10k>0)r+='  |  '+tk('calc_out.revenue_projector.row.to_10k','$10K in '+cu10k+' mo',{months:String(cu10k)});\n" +
  "r+='\\n';\n" +
  "}else{\n" +
  "r+=tk('calc_out.revenue_projector.row.custom_hint','\\u2022 \\uD83C\\uDFAF Custom: enter a growth rate above to see your target')+'\\n';\n" +
  "}\n" +
  "}else{r+=tk('calc_out.revenue_projector.row.enter_mrr_scenarios','Enter your current MRR to see growth scenarios.')+'\\n';}\n" +
  "r+='\\n'+tk('calc_out.section.revenue_projector_what_if_analysis','\\uD83D\\uDD04 What-If Analysis')+'\\n';\n" +
  "if(mr>0){\n" +
  "if(cr>0){\n" +
  "var cutCR=Math.max(0,cr-1);\n" +
  "var cutNR=(gr-cutCR)/100;\n" +
  "var cutEnd=mr*Math.pow(1+cutNR,mo);\n" +
  "r+=tk('calc_out.revenue_projector.row.whatif_cut_churn_head','A) Cut churn '+pct(cr)+' \\u2192 '+pct(cutCR)+':',{churn:pct(cr),cut:pct(cutCR)})+'\\n';\n" +
  "r+=tk('calc_out.revenue_projector.row.whatif_net_growth','   Net growth: +'+pct(nr*100)+' \\u2192 +'+pct(cutNR*100),{from:pct(nr*100),to:pct(cutNR*100)})+' | '+tk('calc_out.revenue_projector.row.whatif_end_mrr','End MRR: '+fmt(end)+' \\u2192 '+fmt(cutEnd)+' (+'+fmt(cutEnd-end)+')',{from:fmt(end),to:fmt(cutEnd),delta:fmt(cutEnd-end)})+'\\n\\n';\n" +
  "}else{r+=tk('calc_out.revenue_projector.row.whatif_churn_zero','A) Churn is already 0% \\u2014 no improvement needed here.')+'\\n\\n';}\n" +
  "var boostG=gr*1.2;var boostNR=(boostG-cr)/100;var boostEnd=mr*Math.pow(1+boostNR,mo);\n" +
  "r+=tk('calc_out.revenue_projector.row.whatif_boost_head','B) Boost gross growth +20%:')+'\\n';\n" +
  "r+=tk('calc_out.revenue_projector.row.whatif_gross','   Gross: +'+pct(gr)+' \\u2192 +'+pct(boostG),{from:pct(gr),to:pct(boostG)})+' | '+tk('calc_out.revenue_projector.row.whatif_end_mrr','End MRR: '+fmt(end)+' \\u2192 '+fmt(boostEnd)+' (+'+fmt(boostEnd-end)+')',{from:fmt(end),to:fmt(boostEnd),delta:fmt(boostEnd-end)})+'\\n\\n';\n" +
  "if(ex>0){\n" +
  "var redEx=ex*0.8;var sav=ex-redEx;\n" +
  "if(isProf){\n" +
  "r+=tk('calc_out.revenue_projector.row.whatif_cut_expenses_head','C) Cut expenses 20%:')+'\\n';\n" +
  "r+=tk('calc_out.revenue_projector.row.whatif_expenses','   Expenses: '+fmt(ex)+'/mo \\u2192 '+fmt(redEx)+'/mo',{from:fmt(ex),to:fmt(redEx)})+' | '+tk('calc_out.revenue_projector.row.whatif_monthly_savings','Monthly savings: +'+fmt(sav)+'/mo',{savings:fmt(sav)})+'\\n';\n" +
  "r+=tk('calc_out.revenue_projector.row.whatif_profit_increase','   Profit increases: '+fmt(netInc)+'/mo \\u2192 '+fmt(netInc+sav)+'/mo',{from:fmt(netInc),to:fmt(netInc+sav)})+'\\n';\n" +
  "}else{\n" +
  "var newBurn=redEx-mr;var newRw=newBurn>0?cash/newBurn:Infinity;\n" +
  "r+=tk('calc_out.revenue_projector.row.whatif_cut_expenses_head','C) Cut expenses 20%:')+'\\n';\n" +
  "r+=tk('calc_out.revenue_projector.row.whatif_expenses','   Expenses: '+fmt(ex)+'/mo \\u2192 '+fmt(redEx)+'/mo',{from:fmt(ex),to:fmt(redEx)})+'\\n';\n" +
  "r+=tk('calc_out.revenue_projector.row.whatif_monthly_burn','   Monthly burn: '+fmt(mBurn)+'/mo \\u2192 '+(newBurn>0?fmt(newBurn)+'/mo':'profitable'),{from:fmt(mBurn),to:newBurn>0?fmt(newBurn)+'/mo':'profitable'})+'\\n';\n" +
  "r+=tk('calc_out.revenue_projector.row.whatif_runway','   Runway: '+(rCurr===Infinity?'\\u221e':rCurr.toFixed(1)+' mo')+' \\u2192 '+(newRw===Infinity?'\\u221e':newRw.toFixed(1)+' mo'),{from:rCurr===Infinity?'\\u221e':rCurr.toFixed(1)+' mo',to:newRw===Infinity?'\\u221e':newRw.toFixed(1)+' mo'})+'\\n';\n" +
  "}\n" +
  "}else{r+=tk('calc_out.revenue_projector.row.whatif_need_expenses','C) Enter monthly expenses to see cost-cutting impact.')+'\\n';}\n" +
  "}else{r+=tk('calc_out.revenue_projector.row.enter_mrr_what_if','Enter your current MRR to see what-if scenarios.')+'\\n';}\n" +
  "r+='\\n'+tk('calc_out.section.revenue_projector_runway_breakeven','\\uD83D\\uDCB0 Runway & Breakeven')+'\\n';\n" +
  "r+='\\u2022 '+tk('calc_out.label.cash_on_hand','Cash on Hand')+':            '+fmt(cash)+'\\n';\n" +
  "r+='\\u2022 '+tk('calc_out.label.monthly_expenses','Monthly Expenses')+':        '+fmt(ex)+'/mo\\n';\n" +
  "r+='\\u2022 '+tk('calc_out.label.monthly_net_revenue','Monthly Net Revenue')+':     '+fmt(mr)+'/mo  (MRR)\\n\\n';\n" +
  "if(isProf&&ex>0){\n" +
  "r+='\\u2022 '+tk('calc_out.label.monthly_profit','Monthly Profit')+':          +'+fmt(netInc)+'  \\uD83D\\uDFE2 '+tk('calc_out.revenue_projector.row.revenue_covers_expenses','Revenue covers expenses.')+'\\n';\n" +
  "r+='\\u2022 '+tk('calc_out.label.runway_zero_revenue','Runway (zero-revenue)')+':   '+(rZero!==null?rZero.toFixed(1)+' months':'\\u2014')+'\\n';\n" +
  "r+='\\u2022 '+tk('calc_out.label.runway_current_pace','Runway (current pace)')+':   \\u221e (profitable)\\n';\n" +
  "r+='\\u2022 '+tk('calc_out.label.breakeven','Breakeven')+':               '+tk('calc_out.revenue_projector.row.breakeven_already','\\u2705 Already breakeven')+'\\n';\n" +
  "r+='\\u2022 '+tk('calc_out.label.annualized_profit','Annualized Profit')+':       +'+fmt(annProfit)+'/yr\\n';\n" +
  "}else if(ex>0&&nr>0&&beMonths!==null&&beMonths>0){\n" +
  "r+='\\u2022 '+tk('calc_out.label.monthly_burn','Monthly Burn')+':            \\u2212'+fmt(mBurn)+'/mo  '+rColor(rCurr)+'\\n';\n" +
  "r+='\\u2022 '+tk('calc_out.label.runway_zero_revenue','Runway (zero-revenue)')+':   '+(rZero!==null?rZero.toFixed(1)+' months':'\\u2014')+'\\n';\n" +
  "r+='\\u2022 '+tk('calc_out.label.runway_current_pace','Runway (current pace)')+':   '+rCurr.toFixed(1)+' months  '+rColor(rCurr)+'\\n';\n" +
  "r+='\\u2022 '+tk('calc_out.label.breakeven','Breakeven')+':               '+tk('calc_out.revenue_projector.row.breakeven_in_months',beMonths+' months from now',{months:String(beMonths)})+'\\n';\n" +
  "r+=tk('calc_out.revenue_projector.row.breakeven_reaches','  \\u2192 MRR reaches '+fmt(ex)+'/mo covering all expenses.',{amount:fmt(ex)+'/mo'})+'\\n';\n" +
  "}else if(ex>0){\n" +
  "r+='\\u2022 '+tk('calc_out.label.monthly_burn','Monthly Burn')+':            \\u2212'+fmt(mBurn)+'/mo  '+rColor(rCurr)+'\\n';\n" +
  "r+='\\u2022 '+tk('calc_out.label.runway_zero_revenue','Runway (zero-revenue)')+':   '+(rZero!==null?rZero.toFixed(1)+' months':'\\u2014')+'\\n';\n" +
  "r+='\\u2022 '+tk('calc_out.label.runway_current_pace','Runway (current pace)')+':   '+(rCurr===Infinity?'\\u221e':rCurr.toFixed(1)+' months')+'  '+rColor(rCurr)+'\\n';\n" +
  "if(beMonths===null){\n" +
  "r+='\\u2022 '+tk('calc_out.label.breakeven','Breakeven')+':               '+tk('calc_out.revenue_projector.row.breakeven_not_reachable','Not reachable at current growth rate.')+'\\n';\n" +
  "r+=tk('calc_out.revenue_projector.row.cut_expenses_now','  \\u2192 Cut expenses or boost growth immediately.')+'\\n';\n" +
  "}\n" +
  "}else{r+=tk('calc_out.revenue_projector.row.need_monthly_expenses_runway','Enter your monthly expenses to see runway and breakeven analysis.')+'\\n';}\n" +
  "r+='\\n'+tk('calc_out.section.revenue_projector_burn_efficiency_metrics','\\uD83E\\uDE7A Burn & Efficiency Metrics')+'\\n';\n" +
  "if(ex>0){\n" +
  "r+='\\u2022 '+tk('calc_out.label.gross_burn','Gross Burn')+':              '+fmt(ex)+'/mo  ('+tk('calc_out.revenue_projector.row.total_expenses','total expenses')+')\\n';\n" +
  "r+='\\u2022 '+tk('calc_out.label.net_burn','Net Burn')+':                '+(mBurn>0?'\\u2212'+fmt(mBurn)+'/mo':'+'+fmt(-mBurn)+'/mo (profit)')+'  '+(isProf?'\\uD83D\\uDFE2':'\\uD83D\\uDD34')+'\\n\\n';\n" +
  "if(bm!==null){\n" +
  "r+='\\u2022 '+tk('calc_out.label.burn_multiple','Burn Multiple')+':           '+bm.toFixed(1)+'\\u00d7  '+bmColor(bm)+'\\n';\n" +
  "r+=tk('calc_out.revenue_projector.row.burn_multiple_legend','  = net burn \\u00f7 net new MRR')+' | <1.0\\u00d7 \\uD83D\\uDFE2 | 1.0\\u20132.0\\u00d7 \\uD83D\\uDFE1 | >2.0\\u00d7 \\uD83D\\uDD34\\n\\n';\n" +
  "}else if(isProf){\n" +
  "r+='\\u2022 '+tk('calc_out.label.burn_multiple','Burn Multiple')+':           '+tk('calc_out.revenue_projector.row.burn_multiple_na_profitable','N/A (profitable)')+'\\n\\n';\n" +
  "}else{\n" +
  "r+='\\u2022 '+tk('calc_out.label.burn_multiple','Burn Multiple')+':           '+tk('calc_out.revenue_projector.row.burn_multiple_na_no_new_mrr','N/A (no net new MRR)')+'\\n\\n';\n" +
  "}\n" +
  "r+='\\u2022 '+tk('calc_out.label.rule_of_40','Rule of 40')+':              '+pct(r40)+'  '+r40Color(r40)+'\\n';\n" +
  "r+=tk('calc_out.revenue_projector.row.rule_of_40_legend','  = net growth '+pct(nr*100)+' + profit margin '+pct(pMargin),{growth:pct(nr*100),margin:pct(pMargin)})+'\\n';\n" +
  "r+='  | \\u226540% \\uD83D\\uDFE2 | 20-40% \\uD83D\\uDFE1 | <20% \\uD83D\\uDD34\\n\\n';\n" +
  "if(mrrExp!==null){\n" +
  "r+='\\u2022 '+tk('calc_out.label.mrr_expense_ratio','MRR / Expense Ratio')+':     '+mrrExp.toFixed(2)+'\\u00d7  '+r2Color(mrrExp)+'\\n';\n" +
  "r+='  \\u22652.0 \\uD83D\\uDFE2 | 1.0-2.0 \\uD83D\\uDFE1 | <1.0 \\uD83D\\uDD34\\n\\n';\n" +
  "}\n" +
  "if(arpu>0&&cr>0){\n" +
  "var ltv=arpu/(cr/100);var ltvR=ltv/arpu;\n" +
  "function ltvColor(r){if(r>=36)return '\\uD83D\\uDFE2';if(r>=12)return '\\uD83D\\uDFE1';return '\\uD83D\\uDD34';}\n" +
  "r+='\\u2022 '+tk('calc_out.label.ltv_customer_lifetime','LTV (Customer Lifetime)')+': '+fmt(ltv)+'  ('+ltvR.toFixed(0)+'\\u00d7 ARPU)  '+ltvColor(ltvR)+'\\n';\n" +
  "r+=tk('calc_out.revenue_projector.row.ltv_legend','  = ARPU \\u00f7 monthly churn')+' | \\u226536\\u00d7 \\uD83D\\uDFE2 | 12-36\\u00d7 \\uD83D\\uDFE1 | <12\\u00d7 \\uD83D\\uDD34\\n\\n';\n" +
  "}else if(arpu>0&&cr===0){\n" +
  "r+='\\u2022 '+tk('calc_out.label.ltv_customer_lifetime','LTV (Customer Lifetime)')+': \\u221e  (zero churn) \\uD83D\\uDFE2\\n\\n';\n" +
  "}\n" +
  "}else{r+=tk('calc_out.revenue_projector.row.need_monthly_expenses_burn','Enter monthly expenses to see burn and efficiency metrics.')+'\\n\\n';}\n" +
  "if(cac>0){\n" +
  "r+='\\u2022 '+tk('calc_out.label.cac_customer_acq_cost','CAC (Customer Acq. Cost)')+': '+fmt(cac)+'\\n';\n" +
  "if(cacPb!==null){\n" +
  "r+='\\u2022 '+tk('calc_out.label.cac_payback_period','CAC Payback Period')+':       '+cacPb.toFixed(1)+' months  '+pbColor(cacPb)+'\\n';\n" +
  "r+=tk('calc_out.revenue_projector.row.cac_payback_legend','  = CAC \\u00f7 (ARPU \\u00d7 (1 \\u2212 churn rate))')+' | <12mo \\uD83D\\uDFE2 | 12-24mo \\uD83D\\uDFE1 | >24mo \\uD83D\\uDD34\\n';\n" +
  "}else if(arpu<=0||cr<=0){\n" +
  "r+='\\u2022 '+tk('calc_out.label.cac_payback_period','CAC Payback Period')+':       '+tk('calc_out.revenue_projector.row.enter_arpu_and_churn','\\u2014 (enter ARPU and churn rate)')+'\\n';\n" +
  "}\n" +
  "if(ltvCRatio!==null){\n" +
  "r+='\\u2022 '+tk('calc_out.label.ltv_cac_ratio','LTV:CAC Ratio')+':            '+ltvCRatio.toFixed(1)+'\\u00d7  '+lcColor(ltvCRatio)+'\\n';\n" +
  "r+=tk('calc_out.revenue_projector.row.ltv_cac_legend','  = LTV \\u00f7 CAC')+' | \\u22653\\u00d7 \\uD83D\\uDFE2 | 1-3\\u00d7 \\uD83D\\uDFE1 | <1\\u00d7 \\uD83D\\uDD34\\n';\n" +
  "}\n" +
  "r+='\\n';\n" +
  "}\n" +
  "if(arpu>0&&subs>0){r+='\\u2022 '+tk('calc_out.label.monthly_arpu','Monthly ARPU')+':            '+fmt(arpu)+'\\n';r+='\\u2022 '+tk('calc_out.label.subscribers','Subscribers')+':             '+subs+' (currentMrr \\u00f7 ARPU)\\n';}\n" +
  "r+='\\n'+tk('calc_out.section.revenue_projector_action_plan','\\uD83C\\uDFAF Action Plan')+'\\n';\n" +
  "r+='\\u2022 '+tk('calc_out.label.stage','Stage')+': '+phase(mr)+'\\n';\n" +
  "if(isProf&&ex>0)r+=tk('calc_out.revenue_projector.row.burn_profitable','\\u2022 Burn:  \\u2705 Profitable \\u2014 reinvest 30% of profit into growth.')+'\\n';\n" +
  "else if(ex>0&&rCurr>=12)r+=tk('calc_out.revenue_projector.row.burn_healthy_runway','\\u2022 Burn:  \\uD83D\\uDFE1 Burning cash but healthy runway. Watch burn rate.')+'\\n';\n" +
  "else if(ex>0&&rCurr<12)r+=tk('calc_out.revenue_projector.row.burn_critical','\\u2022 Burn:  \\uD83D\\uDD34 Critical runway \\u2014 cut costs or accelerate revenue.')+'\\n';\n" +
  "else r+=tk('calc_out.revenue_projector.row.burn_need_expenses','\\u2022 Burn:  Enter expenses to assess burn.')+'\\n';\n" +
  "if(nr>=0.1)r+=tk('calc_out.revenue_projector.row.growth_exceptional','\\u2022 Growth: \\uD83D\\uDD25 Exceptional (+'+pct(nr*100)+' net) \\u2014 sustain by staying close to customers.',{rate:pct(nr*100)})+'\\n';\n" +
  "else if(nr>=0.05)r+=tk('calc_out.revenue_projector.row.growth_strong','\\u2022 Growth: \\uD83D\\uDE80 Strong (+'+pct(nr*100)+' net) \\u2014 compound is working for you.',{rate:pct(nr*100)})+'\\n';\n" +
  "else if(nr>0)r+=tk('calc_out.revenue_projector.row.growth_steady','\\u2022 Growth: \\uD83D\\uDCC8 Steady (+'+pct(nr*100)+' net) \\u2014 small gains compound over time.',{rate:pct(nr*100)})+'\\n';\n" +
  "else if(mr>0)r+=tk('calc_out.revenue_projector.row.growth_stalled','\\u2022 Growth: \\uD83D\\uDC22 Stalled ('+pct(nr*100)+' net) \\u2014 add a second acquisition channel.',{rate:pct(nr*100)})+'\\n';\n" +
  "if(isProf&&nr>=0.03)r+=tk('calc_out.revenue_projector.row.risk_low','\\u2022 Risk:  \\uD83D\\uDFE2 Low \\u2014 profitable + growing. Focus on moat and scale.')+'\\n';\n" +
  "else if(isProf&&nr>0)r+=tk('calc_out.revenue_projector.row.risk_moderate','\\u2022 Risk:  \\uD83D\\uDFE1 Moderate \\u2014 profitable but slow growth. Boost marketing.')+'\\n';\n" +
  "else if(!isProf&&rCurr>=12)r+=tk('calc_out.revenue_projector.row.risk_manageable','\\u2022 Risk:  \\uD83D\\uDFE1 Manageable \\u2014 burning but decent runway. Plan breakeven path.')+'\\n';\n" +
  "else if(!isProf&&rCurr<12&&rCurr>=6)r+=tk('calc_out.revenue_projector.row.risk_elevated','\\u2022 Risk:  \\uD83D\\uDFE0 Elevated \\u2014 under 12 months runway. Prioritize revenue growth.')+'\\n';\n" +
  "else if(!isProf&&rCurr<6)r+=tk('calc_out.revenue_projector.row.risk_urgent','\\u2022 Risk:  \\uD83D\\uDD34 Urgent \\u2014 under 6 months runway. Cut expenses now.')+'\\n';\n" +
  "var prio=1;r+='\\n'+tk('calc_out.section.revenue_projector_top_priorities','\\uD83D\\uDD25 Top Priorities:')+'\\n';\n" +
  "if(cr>0&&mr>0){\n" +
  "var fasterCut=Math.max(0,cr-1);\n" +
  "r+=tk('calc_out.revenue_projector.row.priority_cut_churn','  '+prio+'. Cut churn from '+pct(cr)+' \\u2192 '+pct(fasterCut)+' \\u2192 $10K MRR sooner.',{n:String(prio),churn:pct(cr),cut:pct(fasterCut)})+'\\n';\n" +
  "prio++;}\n" +
  "if(isProf&&ex>0){r+=tk('calc_out.revenue_projector.row.priority_reinvest','  '+prio+'. With '+fmt(netInc)+'/mo profit, reinvest in ads or part-time help.',{n:String(prio),profit:fmt(netInc)+'/mo'})+'\\n';prio++;}\n" +
  "if(rCurr<12&&mr>0){r+=tk('calc_out.revenue_projector.row.priority_runway','  '+prio+'. Runway under 12 months \\u2014 build a breakeven plan this week.',{n:String(prio)})+'\\n';prio++;}\n" +
  "if(nr<0.02&&mr>0){r+=tk('calc_out.revenue_projector.row.priority_growth','  '+prio+'. Growth under 2%/mo \\u2014 test one new acquisition channel.',{n:String(prio)})+'\\n';prio++;}\n" +
  "if(prio===1){r+=tk('calc_out.revenue_projector.row.priority_healthy','  1. Runway is healthy. Focus on product quality and customer retention.')+'\\n';}\n" +
  "if(mr>0||ex>0){var beMRR2=ex;var beLab=mr>=beMRR2?'\\uD83D\\uDFE2':'\\uD83D\\uDD34';r+='\\n'+tk('calc_out.section.revenue_projector_break_even_revenue','\\u2696\\uFE0F Break-Even Revenue')+'\\n';r+='\\u2022 '+beLab+' '+tk('calc_out.label.break_even_mrr','Break-even MRR')+': '+fmt(ex)+'/mo ('+tk('calc_out.revenue_projector.row.covers_monthly_expenses','covers monthly expenses')+')\\n';if(mr>=beMRR2){r+=tk('calc_out.revenue_projector.row.current_mrr_above_breakeven','\\u2022 Current MRR '+fmt(mr)+' is above break-even by '+fmt(mr-beMRR2)+'/mo.',{mrr:fmt(mr),gap:fmt(mr-beMRR2)+'/mo'})+'\\n';}else{var gap2=beMRR2-mr;r+=tk('calc_out.revenue_projector.row.gap_to_break_even','\\u2022 Gap to break-even: '+fmt(gap2)+'/mo. Closing this puts you at default-alive.',{gap:fmt(gap2)+'/mo'})+'\\n';}}\n" +
  "var tipStr;\n" +
  "if(cash>0&&rCurr>18){tipStr=tk('calc_out.revenue_projector.row.tip_runway_18','\\uD83D\\uDCA1 Tip: Runway above 18 months is a competitive advantage. Use it for bold bets (new channels, hiring, product) \\u2014 not conservative hoarding.');}\n" +
  "else if(rCurr>0&&rCurr<=6){tipStr=tk('calc_out.revenue_projector.row.tip_sub6','\\uD83D\\uDCA1 Tip: Sub-6-month runway means raise now or cut hard. Delaying 30 days = raising from a weaker position. Cut discretionary spend first.');}\n" +
  "else if(mBurn>0&&mr>0&&mr/ex<0.3){tipStr=tk('calc_out.revenue_projector.row.tip_low_coverage','\\uD83D\\uDCA1 Tip: Your revenue covers under 30% of expenses. Focus 80% of effort on the 1-2 channels with highest ROI, not on cost-cutting.');}\n" +
  "else{tipStr=tk('calc_out.revenue_projector.row.tip_reproject','\\uD83D\\uDCA1 Tip: Re-project monthly. Inputs change (churn, hiring, ad costs). The plan that got you here won\\'t get you there.');}\n" +
  "r+='\\n'+tipStr+'\\n';\n" +
  "return [r];\n";

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
    '$calc_out.section.revenue_projector_revenue_snapshot|📊 Revenue Snapshot|\n\n• $calc_out.label.starting_mrr|Starting MRR|:           $0/mo\n• $calc_out.label.ending_mrr|Ending MRR|:             $0/mo  ($calc_out.revenue_projector.row.after_n_months{"months":"12"}|after 12 months|)\n• $calc_out.label.arr_equivalent|ARR Equivalent|:         $0/yr\n• $calc_out.label.total_revenue|Total Revenue|:          $0 $calc_out.revenue_projector.row.over_n_months{"months":"12"}|over 12 months|\n\n• $calc_out.label.gross_monthly_growth|Gross Monthly Growth|:   +8.0%  ($calc_out.revenue_projector.row.new_and_expansion|new + expansion|)\n• $calc_out.label.monthly_churn|Monthly Churn|:          −3.0%  ($calc_out.revenue_projector.row.lost_revenue|lost revenue|)\n• $calc_out.label.net_monthly_growth|Net Monthly Growth|:     +5.0%  ($calc_out.revenue_projector.row.effective|effective|)  $calc_out.label.growth_status_healthy|🟡 Healthy|\n• $calc_out.label.growth_multiple|Growth Multiple|:        0.0×   ($calc_out.revenue_projector.row.n_month_mrr_expansion{"months":"12"}|12-month MRR expansion|)\n\n$calc_out.section.revenue_projector_mrr_milestones|📈 MRR Milestones|\n$calc_out.revenue_projector.row.quarter_milestone{"q":"1","month":"3","mrr":"$0"}|• Q1 (Month 3):  $0/mo|\n$calc_out.revenue_projector.row.quarter_milestone{"q":"2","month":"6","mrr":"$0"}|• Q2 (Month 6):  $0/mo|\n$calc_out.revenue_projector.row.quarter_milestone{"q":"3","month":"9","mrr":"$0"}|• Q3 (Month 9):  $0/mo|\n$calc_out.revenue_projector.row.quarter_milestone{"q":"4","month":"12","mrr":"$0"}|• Q4 (Month 12):  $0/mo|  ← target\n\n$calc_out.section.revenue_projector_key_milestones|🎯 Key Milestones|\n\n$calc_out.section.revenue_projector_monthly_mrr_breakdown|📅 Monthly MRR Breakdown|\n$calc_out.revenue_projector.row.month_progress{"month":" 1","mrr":"$0","delta":"$0"}|Month  1:  $0/mo  (+$0)|\n$calc_out.revenue_projector.row.month_progress{"month":" 2","mrr":"$0","delta":"$0"}|Month  2:  $0/mo  (+$0)|\n$calc_out.revenue_projector.row.month_progress{"month":" 3","mrr":"$0","delta":"$0"}|Month  3:  $0/mo  (+$0)|  ← Q1\n$calc_out.revenue_projector.row.month_progress{"month":" 4","mrr":"$0","delta":"$0"}|Month  4:  $0/mo  (+$0)|\n$calc_out.revenue_projector.row.month_progress{"month":" 5","mrr":"$0","delta":"$0"}|Month  5:  $0/mo  (+$0)|\n$calc_out.revenue_projector.row.month_progress{"month":" 6","mrr":"$0","delta":"$0"}|Month  6:  $0/mo  (+$0)|  ← Q2\n$calc_out.revenue_projector.row.month_progress{"month":" 7","mrr":"$0","delta":"$0"}|Month  7:  $0/mo  (+$0)|\n$calc_out.revenue_projector.row.month_progress{"month":" 8","mrr":"$0","delta":"$0"}|Month  8:  $0/mo  (+$0)|\n$calc_out.revenue_projector.row.month_progress{"month":" 9","mrr":"$0","delta":"$0"}|Month  9:  $0/mo  (+$0)|  ← Q3\n$calc_out.revenue_projector.row.month_progress{"month":"10","mrr":"$0","delta":"$0"}|Month 10:  $0/mo  (+$0)|\n$calc_out.revenue_projector.row.month_progress{"month":"11","mrr":"$0","delta":"$0"}|Month 11:  $0/mo  (+$0)|\n$calc_out.revenue_projector.row.month_progress{"month":"12","mrr":"$0","delta":"$0"}|Month 12:  $0/mo  (+$0)|  ← Q4\n\n$calc_out.section.revenue_projector_growth_scenarios{"months":"12"}|🔄 Growth Scenarios (12-Month Outlook)|\n$calc_out.revenue_projector.row.enter_mrr_scenarios|Enter your current MRR to see growth scenarios.|\n\n$calc_out.section.revenue_projector_what_if_analysis|🔄 What-If Analysis|\n$calc_out.revenue_projector.row.enter_mrr_what_if|Enter your current MRR to see what-if scenarios.|\n\n$calc_out.section.revenue_projector_runway_breakeven|💰 Runway & Breakeven|\n• $calc_out.label.cash_on_hand|Cash on Hand|:            $60,000\n• $calc_out.label.monthly_expenses|Monthly Expenses|:        $3,000/mo\n• $calc_out.label.monthly_net_revenue|Monthly Net Revenue|:     $0/mo  (MRR)\n\n• $calc_out.label.monthly_burn|Monthly Burn|:            −$3,000/mo  🟢\n• $calc_out.label.runway_zero_revenue|Runway (zero-revenue)|:   20.0 months\n• $calc_out.label.runway_current_pace|Runway (current pace)|:   20.0 months  🟢\n• $calc_out.label.breakeven|Breakeven|:               $calc_out.revenue_projector.row.breakeven_not_reachable|Not reachable at current growth rate.|\n$calc_out.revenue_projector.row.cut_expenses_now|  → Cut expenses or boost growth immediately.|\n\n$calc_out.section.revenue_projector_burn_efficiency_metrics|🩺 Burn & Efficiency Metrics|\n• $calc_out.label.gross_burn|Gross Burn|:              $3,000/mo  ($calc_out.revenue_projector.row.total_expenses|total expenses|)\n• $calc_out.label.net_burn|Net Burn|:                −$3,000/mo  🔴\n\n• $calc_out.label.burn_multiple|Burn Multiple|:           $calc_out.revenue_projector.row.burn_multiple_na_no_new_mrr|N/A (no net new MRR)|\n\n• $calc_out.label.rule_of_40|Rule of 40|:              5.0%  🔴\n$calc_out.revenue_projector.row.rule_of_40_legend{"growth":"5.0%","margin":"0.0%"}|  = net growth 5.0% + profit margin 0.0%|\n  | ≥40% 🟢 | 20-40% 🟡 | <20% 🔴\n\n• $calc_out.label.mrr_expense_ratio|MRR / Expense Ratio|:     0.00×  🔴\n  ≥2.0 🟢 | 1.0-2.0 🟡 | <1.0 🔴\n\n• $calc_out.label.ltv_customer_lifetime|LTV (Customer Lifetime)|: $833  (33× ARPU)  🟡\n$calc_out.revenue_projector.row.ltv_legend|  = ARPU ÷ monthly churn| | ≥36× 🟢 | 12-36× 🟡 | <12× 🔴\n\n• $calc_out.label.cac_customer_acq_cost|CAC (Customer Acq. Cost)|: $200\n• $calc_out.label.cac_payback_period|CAC Payback Period|:       8.2 months  🟢\n$calc_out.revenue_projector.row.cac_payback_legend|  = CAC ÷ (ARPU × (1 − churn rate))| | <12mo 🟢 | 12-24mo 🟡 | >24mo 🔴\n• $calc_out.label.ltv_cac_ratio|LTV:CAC Ratio|:            4.2×  🟢\n$calc_out.revenue_projector.row.ltv_cac_legend|  = LTV ÷ CAC| | ≥3× 🟢 | 1-3× 🟡 | <1× 🔴\n\n\n$calc_out.section.revenue_projector_action_plan|🎯 Action Plan|\n• $calc_out.label.stage|Stage|: $calc_out.label.phase_validation|Validation (<$1K MRR)|\n$calc_out.revenue_projector.row.burn_healthy_runway|• Burn:  🟡 Burning cash but healthy runway. Watch burn rate.|\n$calc_out.revenue_projector.row.growth_strong{"rate":"5.0%"}|• Growth: 🚀 Strong (+5.0% net) — compound is working for you.|\n$calc_out.revenue_projector.row.risk_manageable|• Risk:  🟡 Manageable — burning but decent runway. Plan breakeven path.|\n\n$calc_out.section.revenue_projector_top_priorities|🔥 Top Priorities:|\n$calc_out.revenue_projector.row.priority_healthy|  1. Runway is healthy. Focus on product quality and customer retention.|\n\n$calc_out.section.revenue_projector_break_even_revenue|⚖️ Break-Even Revenue|\n• 🔴 $calc_out.label.break_even_mrr|Break-even MRR|: $3,000/mo ($calc_out.revenue_projector.row.covers_monthly_expenses|covers monthly expenses|)\n$calc_out.revenue_projector.row.gap_to_break_even{"gap":"$3,000/mo"}|• Gap to break-even: $3,000/mo. Closing this puts you at default-alive.|\n\n$calc_out.revenue_projector.row.tip_runway_18|💡 Tip: Runway above 18 months is a competitive advantage. Use it for bold bets (new channels, hiring, product) — not conservative hoarding.|\n',
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
