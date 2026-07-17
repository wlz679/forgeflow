import type { ToolEngine } from "../../core/engines/types";
import { registerEngine } from "../../core/engines/registry";
import { clampNonNegative } from "../../core/engines/helpers";

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
  function netGrowthColor(r: number): string {
    if (r >= 10) return "🟢 Exceptional";
    if (r >= 5) return "🟡 Healthy";
    if (r >= 0) return "🟠 Slow";
    return "🔴 Shrinking";
  }

  // --- Phase label ---
  function phaseLabel(mrr: number): string {
    if (mrr < 1000) return "Validation (<$1K MRR)";
    if (mrr < 10000) return "Early Traction ($1K–$10K MRR)";
    if (mrr < 100000) return "Scaling ($10K–$100K MRR)";
    return "Growth (>$100K MRR)";
  }

  let result = "";

  // ========================
  // 1. Revenue Snapshot
  // ========================
  result += "📊 Revenue Snapshot\n\n";
  result += "• Starting MRR:           " + fmt(currentMrr) + "/mo\n";
  result += "• Ending MRR:             " + fmt(endMRR) + "/mo  (after " + months + " months)\n";
  result += "• ARR Equivalent:         " + fmt(endMRR * 12) + "/yr\n";
  result += "• Total Revenue:          " + fmt(totalRevenue) + " over " + months + " months\n\n";
  result += "• Gross Monthly Growth:   +" + pct(grossGrowthRate) + "  (new + expansion)\n";
  result += "• Monthly Churn:          −" + pct(churnRate) + "  (lost revenue)\n";
  result += "• Net Monthly Growth:     " + (netRate >= 0 ? "+" : "") + pct(netRate * 100) + "  (effective)  " + netGrowthColor(netRate * 100) + "\n";
  result += "• Growth Multiple:        " + growthMultiple.toFixed(1) + "×   (" + months + "-month MRR expansion)\n";

  // ========================
  // 2. MRR Milestones
  // ========================
  result += "\n📈 MRR Milestones\n";
  const maxQ = Math.min(Math.floor(months / 3), 8);
  for (let q = 1; q <= maxQ; q++) {
    const mo = q * 3;
    const mrrAtQ = currentMrr * Math.pow(1 + netRate, mo);
    result += "• Q" + q + " (Month " + mo + "):  " + fmt(mrrAtQ) + "/mo" + (q === maxQ ? "  ← target" : "") + "\n";
  }

  result += "\n🎯 Key Milestones\n";
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
          result += "• $" + Math.round(t / 1000) + "K MRR:  " + mths + " months [" + fastMths + "–" + slowMths + "]\n";
        } else {
          result += "• $" + Math.round(t / 1000) + "K MRR:  >5 years\n";
        }
      }
    }
    if (anyMilestoneShown) {
      result += "  Range shows ±2% net growth variation.\n";
    }
  }
  if (!anyMilestoneShown && currentMrr > 0) {
    if (netRate <= 0) {
      result += "With zero or negative net growth, no milestones can be projected.\n";
    }
  }

  // ========================
  // 2b. Monthly MRR Breakdown (12-month full table; 6/24 show first 6 rows)
  // ========================
  result += "\n📅 Monthly MRR Breakdown\n";
  const showMonths = months === 12 ? 12 : Math.min(months, 6);
  for (let m = 1; m <= showMonths; m++) {
    const mrrAtM = currentMrr * Math.pow(1 + netRate, m);
    const delta = mrrAtM - (currentMrr * Math.pow(1 + netRate, m - 1));
    result += "Month " + String(m).padStart(2, " ") + ":  " + fmt(mrrAtM) + "/mo  (+" + fmt(delta) + ")" + (m % 3 === 0 ? "  ← Q" + (m / 3) : "") + "\n";
  }
  if (months > showMonths) {
    const endM = currentMrr * Math.pow(1 + netRate, months);
    const endD = endM - (currentMrr * Math.pow(1 + netRate, months - 1));
    result += "  ...\nMonth " + months + ":  " + fmt(endM) + "/mo  (+" + fmt(endD) + ")  ← target\n";
  }

  // ========================
  // 3. Growth Scenarios & What-If
  // ========================
  result += "\n🔄 Growth Scenarios (" + months + "-Month Outlook)\n";
  if (currentMrr > 0) {
    const scenarioRates = [
      { r: Math.max(1, Math.round(netRate * 100 * 0.5)), label: "🐢 Conservative" },
      { r: Math.round(netRate * 100), label: "📈 Current Pace" },
      { r: Math.max(1, Math.round(netRate * 100 * 1.5)), label: "🚀 Aggressive" },
      { r: Math.min(50, Math.round(netRate * 100 * 2)), label: "🔥 Hyper-Growth" },
    ];
    const seen = new Set<number>();
    for (const sc of scenarioRates) {
      if (seen.has(sc.r) || sc.r <= 0) continue;
      seen.add(sc.r);
      const scEnd = currentMrr * Math.pow(1 + sc.r / 100, months);
      const scTo10k = currentMrr > 0 && sc.r > 0
        ? Math.ceil(Math.log(10000 / currentMrr) / Math.log(1 + sc.r / 100))
        : null;
      result += "• " + sc.label;
      result += " ".repeat(Math.max(1, 24 - sc.label.length));
      result += "+" + pct(sc.r) + "/mo  →  " + fmt(scEnd) + "/mo";
      if (scTo10k !== null && scTo10k > 0) result += "  |  $10K in " + scTo10k + " mo";
      result += "\n";
    }
    if (hasCustom) {
      const customEnd = currentMrr * Math.pow(1 + customNetRate, months);
      const cTo10k = currentMrr > 0 && customNetRate > 0 ? Math.ceil(Math.log(10000 / currentMrr) / Math.log(1 + customNetRate)) : null;
      result += "• 🎯 Custom (+" + pct(customGrowthRate) + "/mo)";
      for (let pad = ("🎯 Custom (+" + pct(customGrowthRate) + "/mo)").length; pad < 24; pad++) result += " ";
      result += "→  " + fmt(customEnd) + "/mo";
      if (cTo10k !== null && cTo10k > 0) result += "  |  $10K in " + cTo10k + " mo";
      result += "\n";
    } else {
      result += "• 🎯 Custom: enter a growth rate above to see your target\n";
    }
  } else {
    result += "Enter your current MRR to see growth scenarios.\n";
  }

  // What-If Analysis
  result += "\n🔄 What-If Analysis\n";
  if (currentMrr > 0) {
    // Scenario A: Cut churn by 1pp
    if (churnRate > 0) {
      const cutChurnRate = Math.max(0, churnRate - 1);
      const cutNetRate = (grossGrowthRate - cutChurnRate) / 100;
      const cutEndMRR = currentMrr * Math.pow(1 + cutNetRate, months);
      result += "A) Cut churn " + pct(churnRate) + " → " + pct(cutChurnRate) + ":\n";
      result += "   Net growth: +" + pct(netRate * 100) + " → +" + pct(cutNetRate * 100) + " | End MRR: " + fmt(endMRR) + " → " + fmt(cutEndMRR) + " (+" + fmt(cutEndMRR - endMRR) + ")\n\n";
    } else {
      result += "A) Churn is already 0% — no improvement needed here.\n\n";
    }

    // Scenario B: Boost gross growth by 20%
    const boostGross = grossGrowthRate * 1.2;
    const boostNetRate = (boostGross - churnRate) / 100;
    const boostEndMRR = currentMrr * Math.pow(1 + boostNetRate, months);
    result += "B) Boost gross growth +20%:\n";
    result += "   Gross: +" + pct(grossGrowthRate) + " → +" + pct(boostGross) + " | End MRR: " + fmt(endMRR) + " → " + fmt(boostEndMRR) + " (+" + fmt(boostEndMRR - endMRR) + ")\n\n";

    // Scenario C: Reduce expenses by 20%
    if (monthlyExpenses > 0) {
      const reducedExp = monthlyExpenses * 0.8;
      const savings = monthlyExpenses - reducedExp;
      if (isProfitable) {
        result += "C) Cut expenses 20%:\n";
        result += "   Expenses: " + fmt(monthlyExpenses) + "/mo → " + fmt(reducedExp) + "/mo | Monthly savings: +" + fmt(savings) + "/mo\n";
        result += "   Profit increases: " + fmt(monthlyNetIncome) + "/mo → " + fmt(monthlyNetIncome + savings) + "/mo\n";
      } else {
        const newBurn = reducedExp - currentMrr;
        const newRunway = newBurn > 0 ? cashOnHand / newBurn : Infinity;
        result += "C) Cut expenses 20%:\n";
        result += "   Expenses: " + fmt(monthlyExpenses) + "/mo → " + fmt(reducedExp) + "/mo\n";
        result += "   Monthly burn: " + fmt(monthlyBurn) + "/mo → " + (newBurn > 0 ? fmt(newBurn) + "/mo" : "profitable") + "\n";
        result += "   Runway: " + (runwayCurrent === Infinity ? "∞" : runwayCurrent.toFixed(1) + " mo") + " → " + (newRunway === Infinity ? "∞" : newRunway.toFixed(1) + " mo") + "\n";
      }
    } else {
      result += "C) Enter monthly expenses to see cost-cutting impact.\n";
    }
  } else {
    result += "Enter your current MRR to see what-if scenarios.\n";
  }

  // ========================
  // 4. Runway & Breakeven
  // ========================
  result += "\n💰 Runway & Breakeven\n";
  result += "• Cash on Hand:            " + fmt(cashOnHand) + "\n";
  result += "• Monthly Expenses:        " + fmt(monthlyExpenses) + "/mo\n";
  result += "• Monthly Net Revenue:     " + fmt(currentMrr) + "/mo  (MRR)\n\n";

  if (isProfitable && monthlyExpenses > 0) {
    // Case A: Already profitable
    result += "• Monthly Profit:          +" + fmt(monthlyNetIncome) + "  🟢 Revenue covers expenses.\n";
    result += "• Runway (zero-revenue):   " + (runwayZeroRevenue !== null ? runwayZeroRevenue.toFixed(1) + " months" : "—") + "\n";
    result += "• Runway (current pace):   ∞ (profitable)\n";
    result += "• Breakeven:               ✅ Already breakeven\n";
    result += "• Annualized Profit:       +" + fmt(annualizedProfit) + "/yr\n";
  } else if (monthlyExpenses > 0 && netRate > 0 && breakevenMonths !== null && breakevenMonths > 0) {
    // Case B: On path to breakeven
    result += "• Monthly Burn:            −" + fmt(monthlyBurn) + "/mo  " + runwayColor(runwayCurrent) + "\n";
    result += "• Runway (zero-revenue):   " + (runwayZeroRevenue !== null ? runwayZeroRevenue.toFixed(1) + " months" : "—") + "\n";
    result += "• Runway (current pace):   " + runwayCurrent.toFixed(1) + " months  " + runwayColor(runwayCurrent) + "\n";
    result += "• Breakeven:               " + breakevenMonths + " months from now\n";
    result += "  → MRR reaches " + fmt(monthlyExpenses) + "/mo covering all expenses.\n";
  } else if (monthlyExpenses > 0) {
    // Case C: Burning with no clear path
    result += "• Monthly Burn:            −" + fmt(monthlyBurn) + "/mo  " + runwayColor(runwayCurrent) + "\n";
    result += "• Runway (zero-revenue):   " + (runwayZeroRevenue !== null ? runwayZeroRevenue.toFixed(1) + " months" : "—") + "\n";
    result += "• Runway (current pace):   " + (runwayCurrent === Infinity ? "∞" : runwayCurrent.toFixed(1) + " months") + "  " + runwayColor(runwayCurrent) + "\n";
    if (breakevenMonths === null) {
      result += "• Breakeven:               Not reachable at current growth rate.\n";
      result += "  → Cut expenses or boost growth immediately.\n";
    }
  } else {
    result += "Enter your monthly expenses to see runway and breakeven analysis.\n";
  }

  // ========================
  // 5. Burn & Efficiency Metrics
  // ========================
  result += "\n🩺 Burn & Efficiency Metrics\n";
  if (monthlyExpenses > 0) {
    result += "• Gross Burn:              " + fmt(monthlyExpenses) + "/mo  (total expenses)\n";
    result += "• Net Burn:                " + (monthlyBurn > 0 ? "−" + fmt(monthlyBurn) + "/mo" : "+" + fmt(-monthlyBurn) + "/mo (profit)") + "  " + (isProfitable ? "🟢" : "🔴") + "\n\n";

    // Burn Multiple
    if (burnMultiple !== null) {
      result += "• Burn Multiple:           " + burnMultiple.toFixed(1) + "×  " + burnMultColor(burnMultiple) + "\n";
      result += "  = net burn ÷ net new MRR | <1.0× 🟢 | 1.0–2.0× 🟡 | >2.0× 🔴\n\n";
    } else if (isProfitable) {
      result += "• Burn Multiple:           N/A (profitable)\n\n";
    } else {
      result += "• Burn Multiple:           N/A (no net new MRR)\n\n";
    }

    // Rule of 40
    result += "• Rule of 40:              " + pct(ruleOf40Val) + "  " + r40Color(ruleOf40Val) + "\n";
    result += "  = net growth " + pct(netRate * 100) + " + profit margin " + pct(profitMargin) + "\n";
    result += "  | ≥40% 🟢 | 20-40% 🟡 | <20% 🔴\n\n";

    // MRR / Expense Ratio
    if (mrrExpenseRatio !== null) {
      result += "• MRR / Expense Ratio:     " + mrrExpenseRatio.toFixed(2) + "×  " + ratioColor(mrrExpenseRatio) + "\n";
      result += "  ≥2.0 🟢 | 1.0-2.0 🟡 | <1.0 🔴\n\n";
    }
    // LTV (Customer Lifetime Value via ARPU ÷ churn)
    if (arpu > 0 && churnRate > 0) {
      const ltv = arpu / (churnRate / 100);
      const ltvRatio = ltv / arpu;
      function ltvColor(r: number): string { if (r >= 36) return "🟢"; if (r >= 12) return "🟡"; return "🔴"; }
      result += "• LTV (Customer Lifetime): " + fmt(ltv) + "  (" + ltvRatio.toFixed(0) + "× ARPU)  " + ltvColor(ltvRatio) + "\n";
      result += "  = ARPU ÷ monthly churn | ≥36× 🟢 | 12-36× 🟡 | <12× 🔴\n\n";
    } else if (arpu > 0 && churnRate === 0) {
      result += "• LTV (Customer Lifetime): ∞  (zero churn) 🟢\n\n";
    }
  } else {
    result += "Enter monthly expenses to see burn and efficiency metrics.\n\n";
  }

  // CAC Metrics (independent of expenses)
  if (cac > 0) {
    result += "• CAC (Customer Acq. Cost): " + fmt(cac) + "\n";
    if (cacPaybackMonths !== null) {
      result += "• CAC Payback Period:       " + cacPaybackMonths.toFixed(1) + " months  " + paybackColor(cacPaybackMonths) + "\n";
      result += "  = CAC ÷ (ARPU × (1 − churn rate)) | <12mo 🟢 | 12-24mo 🟡 | >24mo 🔴\n";
    } else if (arpu <= 0 || churnRate <= 0) {
      result += "• CAC Payback Period:       — (enter ARPU and churn rate)\n";
    }
    if (ltvCacRatio !== null) {
      result += "• LTV:CAC Ratio:            " + ltvCacRatio.toFixed(1) + "×  " + ltvCacColor(ltvCacRatio) + "\n";
      result += "  = LTV ÷ CAC | ≥3× 🟢 | 1-3× 🟡 | <1× 🔴\n";
    }
    result += "\n";
  }

  // ARPU + Subscriber info
  if (arpu > 0 && subscriberCount > 0) {
    result += "• Monthly ARPU:            " + fmt(arpu) + "\n";
    result += "• Subscribers:             " + subscriberCount + " (currentMrr ÷ ARPU)\n";
  }

  // ========================
  // 6. Action Plan
  // ========================
  result += "\n🎯 Action Plan\n";
  result += "• Stage: " + phaseLabel(currentMrr) + "\n";

  // Burn assessment
  if (isProfitable && monthlyExpenses > 0) {
    result += "• Burn:  ✅ Profitable — reinvest 30% of profit into growth.\n";
  } else if (monthlyExpenses > 0 && runwayCurrent >= 12) {
    result += "• Burn:  🟡 Burning cash but healthy runway. Watch burn rate.\n";
  } else if (monthlyExpenses > 0 && runwayCurrent < 12) {
    result += "• Burn:  🔴 Critical runway — cut costs or accelerate revenue.\n";
  } else {
    result += "• Burn:  Enter expenses to assess burn.\n";
  }

  // Growth assessment
  if (netRate >= 0.1) {
    result += "• Growth: 🔥 Exceptional (+" + pct(netRate * 100) + " net) — sustain by staying close to customers.\n";
  } else if (netRate >= 0.05) {
    result += "• Growth: 🚀 Strong (+" + pct(netRate * 100) + " net) — compound is working for you.\n";
  } else if (netRate > 0) {
    result += "• Growth: 📈 Steady (+" + pct(netRate * 100) + " net) — small gains compound over time.\n";
  } else if (currentMrr > 0) {
    result += "• Growth: 🐢 Stalled (" + pct(netRate * 100) + " net) — add a second acquisition channel.\n";
  }

  // Risk assessment (matrix: profit status × runway)
  if (isProfitable && netRate >= 0.03) {
    result += "• Risk:  🟢 Low — profitable + growing. Focus on moat and scale.\n";
  } else if (isProfitable && netRate > 0) {
    result += "• Risk:  🟡 Moderate — profitable but slow growth. Boost marketing.\n";
  } else if (!isProfitable && runwayCurrent >= 12) {
    result += "• Risk:  🟡 Manageable — burning but decent runway. Plan breakeven path.\n";
  } else if (!isProfitable && runwayCurrent < 12 && runwayCurrent >= 6) {
    result += "• Risk:  🟠 Elevated — under 12 months runway. Prioritize revenue growth.\n";
  } else if (!isProfitable && runwayCurrent < 6) {
    result += "• Risk:  🔴 Urgent — under 6 months runway. Cut expenses now.\n";
  }

  // Top priorities
  result += "\n🔥 Top Priorities:\n";
  let priority = 1;
  if (churnRate > 0 && currentMrr > 0) {
    result += "  " + priority + ". Cut churn from " + pct(churnRate) + " → " + pct(Math.max(0, churnRate - 1)) + " → $10K MRR sooner.\n";
    priority++;
  }
  if (isProfitable && monthlyExpenses > 0) {
    result += "  " + priority + ". With " + fmt(monthlyNetIncome) + "/mo profit, reinvest in ads or part-time help.\n";
    priority++;
  }
  if (runwayCurrent < 12 && currentMrr > 0) {
    result += "  " + priority + ". Runway under 12 months — build a breakeven plan this week.\n";
    priority++;
  }
  if (netRate < 0.02 && currentMrr > 0) {
    result += "  " + priority + ". Growth under 2%/mo — test one new acquisition channel.\n";
    priority++;
  }
  if (priority === 1) {
    result += "  1. Runway is healthy. Focus on product quality and customer retention.\n";
  }

  // ═══ Break-Even Revenue ═══
  if (currentMrr > 0 || monthlyExpenses > 0) {
    const breakEvenMRR = monthlyExpenses;
    const beLabel = currentMrr >= breakEvenMRR ? "🟢" : "🔴";
    result += "\n⚖️ Break-Even Revenue\n";
    result += "• " + beLabel + " Break-even MRR: " + fmt(monthlyExpenses) + "/mo (covers monthly expenses)\n";
    if (currentMrr >= breakEvenMRR) {
      result += "• Current MRR " + fmt(currentMrr) + " is above break-even by " + fmt(currentMrr - breakEvenMRR) + "/mo.\n";
    } else {
      const gap = breakEvenMRR - currentMrr;
      result += "• Gap to break-even: " + fmt(gap) + "/mo. Closing this puts you at default-alive.\n";
    }
  }

  // ═══ Tip ═══
  let tip: string;
  if (cashOnHand > 0 && runwayCurrent > 18) {
    tip = "💡 Tip: Runway above 18 months is a competitive advantage. Use it for bold bets (new channels, hiring, product) — not conservative hoarding.";
  } else if (runwayCurrent > 0 && runwayCurrent <= 6) {
    tip = "💡 Tip: Sub-6-month runway means raise now or cut hard. Delaying 30 days = raising from a weaker position. Cut discretionary spend first.";
  } else if (monthlyBurn > 0 && currentMrr > 0 && currentMrr / monthlyExpenses < 0.3) {
    tip = "💡 Tip: Your revenue covers under 30% of expenses. Focus 80% of effort on the 1-2 channels with highest ROI, not on cost-cutting.";
  } else {
    tip = "💡 Tip: Re-project monthly. Inputs change (churn, hiring, ad costs). The plan that got you here won't get you there.";
  }
  result += "\n" + tip + "\n";

  return [result];
}

// customFn mirrors the TypeScript function for client-side execution.
// Emoji characters use unicode escapes so the JS string survives bundling.
const customFn =
  "function fmt(n){return '$'+Math.round(n).toLocaleString()}" +
  "function pct(n){return n.toFixed(1)+'%'}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var mr=cnn(parseFloat(inputs.currentMrr)||0);" +
  "var gr=cnn(parseFloat(inputs.monthlyGrowthRate)||0);" +
  "var cr=cnn(parseFloat(inputs.monthlyChurnRate)||0);" +
  "var ex=cnn(parseFloat(inputs.monthlyExpenses)||0);" +
  "var cash=cnn(parseFloat(inputs.cashOnHand)||0);" +
  "var arpu=cnn(parseFloat(inputs.arpu)||0);" +
  "var cgr=cnn(parseFloat(inputs.customGrowthRate)||0);" +
  "var cac=cnn(parseFloat(inputs.cac)||0);" +
  "var mo=cnn(parseInt(inputs.months)||12);" +
  "var nr=(gr-cr)/100;" +
  "var annRate=(Math.pow(1+nr,12)-1)*100;" +
  "var end=mr*Math.pow(1+nr,mo);" +
  "var total=0;for(var i=1;i<=mo;i++)total+=mr*Math.pow(1+nr,i);" +
  "var mult=mr>0?end/mr:0;" +
  "var subs=arpu>0?Math.round(mr/arpu):0;" +
  "var netInc=mr-ex;" +
  "var annProfit=netInc*12;" +
  "var pMargin=mr>0?(netInc/mr)*100:0;" +
  "var isProf=netInc>=0;" +
  "var rZero=ex>0?cash/ex:null;" +
  "var mBurn=ex-mr;" +
  "var rCurr=mBurn>0?cash/mBurn:Infinity;" +
  "function rColor(m){if(m===Infinity)return '\\uD83D\\uDFE2';if(m>=18)return '\\uD83D\\uDFE2';if(m>=6)return '\\uD83D\\uDFE1';return '\\uD83D\\uDD34';}" +
  "var beMonths=null;" +
  "if(mr>=ex&&ex>0)beMonths=0;" +
  "else if(mr>0&&nr>0&&ex>0)beMonths=Math.ceil(Math.log(ex/mr)/Math.log(1+nr));" +
  "var netNew=mr*nr;" +
  "var cNr=cgr>0?(cgr-cr)/100:0;var hasCustom=cgr>0;" +
  "var cacPb=null;if(cac>0&&arpu>0&&cr>0&&cr<100)cacPb=cac/(arpu*(1-cr/100));" +
  "function pbColor(m){if(m<=12)return '\\uD83D\\uDFE2';if(m<=24)return '\\uD83D\\uDFE1';return '\\uD83D\\uDD34';}" +
  "var ltvC=arpu>0&&cr>0?arpu/(cr/100):0;" +
  "var ltvCRatio=cac>0&&ltvC>0?ltvC/cac:null;" +
  "function lcColor(r){if(r>=3)return '\\uD83D\\uDFE2';if(r>=1)return '\\uD83D\\uDFE1';return '\\uD83D\\uDD34';}" +
  "var bm=mBurn>0&&netNew>0?mBurn/netNew:null;" +
  "function bmColor(b){if(b<1)return '\\uD83D\\uDFE2';if(b<=2)return '\\uD83D\\uDFE1';return '\\uD83D\\uDD34';}" +
  "var mrrExp=ex>0?mr/ex:null;" +
  "function r2Color(r){if(r>=2)return '\\uD83D\\uDFE2';if(r>=1)return '\\uD83D\\uDFE1';return '\\uD83D\\uDD34';}" +
  "var r40=nr*100+pMargin;" +
  "function r40Color(v){if(v>=40)return '\\uD83D\\uDFE2';if(v>=20)return '\\uD83D\\uDFE1';return '\\uD83D\\uDD34';}" +
  "function mthsTo(t){if(mr<=0||nr<=0)return null;if(mr>=t)return 0;return Math.ceil(Math.log(t/mr)/Math.log(1+nr));}" +
  "function ngColor(r){if(r>=10)return '\\uD83D\\uDFE2 Exceptional';if(r>=5)return '\\uD83D\\uDFE1 Healthy';if(r>=0)return '\\uD83D\\uDFE0 Slow';return '\\uD83D\\uDD34 Shrinking';}" +
  "function phase(m){if(m<1000)return 'Validation (<$1K MRR)';if(m<10000)return 'Early Traction ($1K\\u2013$10K MRR)';if(m<100000)return 'Scaling ($10K\\u2013$100K MRR)';return 'Growth (>$100K MRR)';}" +

  // Section 1: Revenue Snapshot
  "var r='\\uD83D\\uDCCA Revenue Snapshot\\n\\n';" +
  "r+='\\u2022 Starting MRR:           '+fmt(mr)+'/mo\\n';" +
  "r+='\\u2022 Ending MRR:             '+fmt(end)+'/mo  (after '+mo+' months)\\n';" +
  "r+='\\u2022 ARR Equivalent:         '+fmt(end*12)+'/yr\\n';" +
  "r+='\\u2022 Total Revenue:          '+fmt(total)+' over '+mo+' months\\n\\n';" +
  "r+='\\u2022 Gross Monthly Growth:   +'+pct(gr)+'  (new + expansion)\\n';" +
  "r+='\\u2022 Monthly Churn:          \\u2212'+pct(cr)+'  (lost revenue)\\n';" +
  "r+='\\u2022 Net Monthly Growth:     '+(nr>=0?'+':'')+pct(nr*100)+'  (effective)  '+ngColor(nr*100)+'\\n';" +
  "r+='\\u2022 Growth Multiple:        '+mult.toFixed(1)+'\\u00d7   ('+mo+'-month MRR expansion)\\n';" +

  // Section 2: MRR Milestones
  "r+='\\n\\uD83D\\uDCC8 MRR Milestones\\n';" +
  "var maxQ=Math.min(Math.floor(mo/3),8);" +
  "for(var q=1;q<=maxQ;q++){var mth=q*3;var mAt=mr*Math.pow(1+nr,mth);r+='\\u2022 Q'+q+' (Month '+mth+'):  '+fmt(mAt)+'/mo'+(q===maxQ?'  \\u2190 target':'')+'\\n';}" +
  "r+='\\n\\uD83C\\uDFAF Key Milestones\\n';" +
  "var tgts=[10000,25000,50000,100000];var anyShown=false;" +
  "if(mr>0&&nr>0){for(var ti=0;ti<tgts.length;ti++){var tg=tgts[ti];if(tg<=mr)continue;var mth2=mthsTo(tg);if(mth2!==null&&mth2>0){anyShown=true;if(mth2<=60){var fastR=nr+0.02;var slowR=Math.max(0.001,nr-0.02);var fastM=Math.ceil(Math.log(tg/mr)/Math.log(1+fastR));var slowM=Math.ceil(Math.log(tg/mr)/Math.log(1+slowR));r+='\\u2022 $'+Math.round(tg/1000)+'K MRR:  '+mth2+' months ['+fastM+'\\u2013'+slowM+']\\n';}else{r+='\\u2022 $'+Math.round(tg/1000)+'K MRR:  >5 years\\n';}}}}" +
  "if(!anyShown&&mr>0){if(nr<=0){r+='With zero or negative net growth, no milestones can be projected.\\n';}}" +
  "if(anyShown){r+='  Range shows \\u00b12% net growth variation.\\n';}" +

  // Section 2b: Monthly MRR Breakdown
  "r+='\\n\\uD83D\\uDCC5 Monthly MRR Breakdown\\n';" +
  "var showMo=mo===12?12:Math.min(mo,6);" +
  "for(var im=1;im<=showMo;im++){var mAtM=mr*Math.pow(1+nr,im);var dlt=mAtM-(mr*Math.pow(1+nr,im-1));r+='Month '+(' '+im).slice(-2)+':  '+fmt(mAtM)+'/mo  (+'+fmt(dlt)+')'+(im%3===0?'  \\u2190 Q'+(im/3):'')+'\\n';}" +
  "if(mo>showMo){var endM=mr*Math.pow(1+nr,mo);var endD=endM-(mr*Math.pow(1+nr,mo-1));r+='  ...\\nMonth '+mo+':  '+fmt(endM)+'/mo  (+'+fmt(endD)+')  \\u2190 target\\n';}" +

  // Section 3: Growth Scenarios
  "r+='\\n\\uD83D\\uDD04 Growth Scenarios ('+mo+'-Month Outlook)\\n';" +
  "if(mr>0){" +
  "var scRates=[{r:Math.max(1,Math.round(nr*100*0.5)),l:'\\uD83D\\uDC22 Conservative'},{r:Math.round(nr*100),l:'\\uD83D\\uDCC8 Current Pace'},{r:Math.max(1,Math.round(nr*100*1.5)),l:'\\uD83D\\uDE80 Aggressive'},{r:Math.min(50,Math.round(nr*100*2)),l:'\\uD83D\\uDD25 Hyper-Growth'}];" +
  "var seen={};" +
  "for(var si=0;si<scRates.length;si++){var sc=scRates[si];if(seen[sc.r]||sc.r<=0)continue;seen[sc.r]=true;" +
  "var scEnd=mr*Math.pow(1+sc.r/100,mo);" +
  "var sc10k=mr>0&&sc.r>0?Math.ceil(Math.log(10000/mr)/Math.log(1+sc.r/100)):null;" +
  "r+='\\u2022 '+sc.l;for(var pad=sc.l.length;pad<24;pad++)r+=' ';" +
  "r+='+'+pct(sc.r)+'/mo  \\u2192  '+fmt(scEnd)+'/mo';" +
  "if(sc10k!==null&&sc10k>0)r+='  |  $10K in '+sc10k+' mo';" +
  "r+='\\n';}" +
  "if(hasCustom){" +
  "var cuEnd=mr*Math.pow(1+cNr,mo);" +
  "var cu10k=mr>0&&cNr>0?Math.ceil(Math.log(10000/mr)/Math.log(1+cNr)):null;" +
  "var cuLabel='\\u2022 \\uD83C\\uDFAF Custom (+'+pct(cgr)+'/mo)';" +
  "r+=cuLabel;for(var cp=cuLabel.length;cp<24;cp++)r+=' ';" +
  "r+='\\u2192  '+fmt(cuEnd)+'/mo';" +
  "if(cu10k!==null&&cu10k>0)r+='  |  $10K in '+cu10k+' mo';" +
  "r+='\\n';" +
  "}else{" +
  "r+='\\u2022 \\uD83C\\uDFAF Custom: enter a growth rate above to see your target\\n';" +
  "}" +
  "}else{r+='Enter your current MRR to see growth scenarios.\\n';}" +

  // What-If Analysis
  "r+='\\n\\uD83D\\uDD04 What-If Analysis\\n';" +
  "if(mr>0){" +
  // Scenario A
  "if(cr>0){" +
  "var cutCR=Math.max(0,cr-1);" +
  "var cutNR=(gr-cutCR)/100;" +
  "var cutEnd=mr*Math.pow(1+cutNR,mo);" +
  "r+='A) Cut churn '+pct(cr)+' \\u2192 '+pct(cutCR)+':\\n';" +
  "r+='   Net growth: +'+pct(nr*100)+' \\u2192 +'+pct(cutNR*100)+' | End MRR: '+fmt(end)+' \\u2192 '+fmt(cutEnd)+' (+'+fmt(cutEnd-end)+')\\n\\n';" +
  "}else{r+='A) Churn is already 0% \\u2014 no improvement needed here.\\n\\n';}" +
  // Scenario B
  "var boostG=gr*1.2;var boostNR=(boostG-cr)/100;var boostEnd=mr*Math.pow(1+boostNR,mo);" +
  "r+='B) Boost gross growth +20%:\\n';" +
  "r+='   Gross: +'+pct(gr)+' \\u2192 +'+pct(boostG)+' | End MRR: '+fmt(end)+' \\u2192 '+fmt(boostEnd)+' (+'+fmt(boostEnd-end)+')\\n\\n';" +
  // Scenario C
  "if(ex>0){" +
  "var redEx=ex*0.8;var sav=ex-redEx;" +
  "if(isProf){" +
  "r+='C) Cut expenses 20%:\\n';" +
  "r+='   Expenses: '+fmt(ex)+'/mo \\u2192 '+fmt(redEx)+'/mo | Monthly savings: +'+fmt(sav)+'/mo\\n';" +
  "r+='   Profit increases: '+fmt(netInc)+'/mo \\u2192 '+fmt(netInc+sav)+'/mo\\n';" +
  "}else{" +
  "var newBurn=redEx-mr;var newRw=newBurn>0?cash/newBurn:Infinity;" +
  "r+='C) Cut expenses 20%:\\n';" +
  "r+='   Expenses: '+fmt(ex)+'/mo \\u2192 '+fmt(redEx)+'/mo\\n';" +
  "r+='   Monthly burn: '+fmt(mBurn)+'/mo \\u2192 '+(newBurn>0?fmt(newBurn)+'/mo':'profitable')+'\\n';" +
  "r+='   Runway: '+(rCurr===Infinity?'\\u221e':rCurr.toFixed(1)+' mo')+' \\u2192 '+(newRw===Infinity?'\\u221e':newRw.toFixed(1)+' mo')+'\\n';" +
  "}" +
  "}else{r+='C) Enter monthly expenses to see cost-cutting impact.\\n';}" +
  "}else{r+='Enter your current MRR to see what-if scenarios.\\n';}" +

  // Section 4: Runway & Breakeven
  "r+='\\n\\uD83D\\uDCB0 Runway & Breakeven\\n';" +
  "r+='\\u2022 Cash on Hand:            '+fmt(cash)+'\\n';" +
  "r+='\\u2022 Monthly Expenses:        '+fmt(ex)+'/mo\\n';" +
  "r+='\\u2022 Monthly Net Revenue:     '+fmt(mr)+'/mo  (MRR)\\n\\n';" +
  "if(isProf&&ex>0){" +
  "r+='\\u2022 Monthly Profit:          +'+fmt(netInc)+'  \\uD83D\\uDFE2 Revenue covers expenses.\\n';" +
  "r+='\\u2022 Runway (zero-revenue):   '+(rZero!==null?rZero.toFixed(1)+' months':'\\u2014')+'\\n';" +
  "r+='\\u2022 Runway (current pace):   \\u221e (profitable)\\n';" +
  "r+='\\u2022 Breakeven:               \\u2705 Already breakeven\\n';" +
  "r+='\\u2022 Annualized Profit:       +'+fmt(annProfit)+'/yr\\n';" +
  "}else if(ex>0&&nr>0&&beMonths!==null&&beMonths>0){" +
  "r+='\\u2022 Monthly Burn:            \\u2212'+fmt(mBurn)+'/mo  '+rColor(rCurr)+'\\n';" +
  "r+='\\u2022 Runway (zero-revenue):   '+(rZero!==null?rZero.toFixed(1)+' months':'\\u2014')+'\\n';" +
  "r+='\\u2022 Runway (current pace):   '+rCurr.toFixed(1)+' months  '+rColor(rCurr)+'\\n';" +
  "r+='\\u2022 Breakeven:               '+beMonths+' months from now\\n';" +
  "r+='  \\u2192 MRR reaches '+fmt(ex)+'/mo covering all expenses.\\n';" +
  "}else if(ex>0){" +
  "r+='\\u2022 Monthly Burn:            \\u2212'+fmt(mBurn)+'/mo  '+rColor(rCurr)+'\\n';" +
  "r+='\\u2022 Runway (zero-revenue):   '+(rZero!==null?rZero.toFixed(1)+' months':'\\u2014')+'\\n';" +
  "r+='\\u2022 Runway (current pace):   '+(rCurr===Infinity?'\\u221e':rCurr.toFixed(1)+' months')+'  '+rColor(rCurr)+'\\n';" +
  "if(beMonths===null){" +
  "r+='\\u2022 Breakeven:               Not reachable at current growth rate.\\n';" +
  "r+='  \\u2192 Cut expenses or boost growth immediately.\\n';" +
  "}" +
  "}else{r+='Enter your monthly expenses to see runway and breakeven analysis.\\n';}" +

  // Section 5: Burn & Efficiency Metrics
  "r+='\\n\\uD83E\\uDE7A Burn & Efficiency Metrics\\n';" +
  "if(ex>0){" +
  "r+='\\u2022 Gross Burn:              '+fmt(ex)+'/mo  (total expenses)\\n';" +
  "r+='\\u2022 Net Burn:                '+(mBurn>0?'\\u2212'+fmt(mBurn)+'/mo':'+'+fmt(-mBurn)+'/mo (profit)')+'  '+(isProf?'\\uD83D\\uDFE2':'\\uD83D\\uDD34')+'\\n\\n';" +
  // Burn Multiple
  "if(bm!==null){" +
  "r+='\\u2022 Burn Multiple:           '+bm.toFixed(1)+'\\u00d7  '+bmColor(bm)+'\\n';" +
  "r+='  = net burn \\u00f7 net new MRR | <1.0\\u00d7 \\uD83D\\uDFE2 | 1.0\\u20132.0\\u00d7 \\uD83D\\uDFE1 | >2.0\\u00d7 \\uD83D\\uDD34\\n\\n';" +
  "}else if(isProf){" +
  "r+='\\u2022 Burn Multiple:           N/A (profitable)\\n\\n';" +
  "}else{" +
  "r+='\\u2022 Burn Multiple:           N/A (no net new MRR)\\n\\n';" +
  "}" +
  // Rule of 40
  "r+='\\u2022 Rule of 40:              '+pct(r40)+'  '+r40Color(r40)+'\\n';" +
  "r+='  = net growth '+pct(nr*100)+' + profit margin '+pct(pMargin)+'\\n';" +
  "r+='  | \\u226540% \\uD83D\\uDFE2 | 20-40% \\uD83D\\uDFE1 | <20% \\uD83D\\uDD34\\n\\n';" +
  // MRR / Expense Ratio
  "if(mrrExp!==null){" +
  "r+='\\u2022 MRR / Expense Ratio:     '+mrrExp.toFixed(2)+'\\u00d7  '+r2Color(mrrExp)+'\\n';" +
  "r+='  \\u22652.0 \\uD83D\\uDFE2 | 1.0-2.0 \\uD83D\\uDFE1 | <1.0 \\uD83D\\uDD34\\n\\n';" +
  "}" +
  // LTV
  "if(arpu>0&&cr>0){" +
  "var ltv=arpu/(cr/100);var ltvR=ltv/arpu;" +
  "function ltvColor(r){if(r>=36)return '\\uD83D\\uDFE2';if(r>=12)return '\\uD83D\\uDFE1';return '\\uD83D\\uDD34';}" +
  "r+='\\u2022 LTV (Customer Lifetime): '+fmt(ltv)+'  ('+ltvR.toFixed(0)+'\\u00d7 ARPU)  '+ltvColor(ltvR)+'\\n';" +
  "r+='  = ARPU \\u00f7 monthly churn | \\u226536\\u00d7 \\uD83D\\uDFE2 | 12-36\\u00d7 \\uD83D\\uDFE1 | <12\\u00d7 \\uD83D\\uDD34\\n\\n';" +
  "}else if(arpu>0&&cr===0){" +
  "r+='\\u2022 LTV (Customer Lifetime): \\u221e  (zero churn) \\uD83D\\uDFE2\\n\\n';" +
  "}" +
  "}else{r+='Enter monthly expenses to see burn and efficiency metrics.\\n\\n';}" +
  // CAC Metrics (independent of expenses)
  "if(cac>0){" +
  "r+='\\u2022 CAC (Customer Acq. Cost): '+fmt(cac)+'\\n';" +
  "if(cacPb!==null){" +
  "r+='\\u2022 CAC Payback Period:       '+cacPb.toFixed(1)+' months  '+pbColor(cacPb)+'\\n';" +
  "r+='  = CAC \\u00f7 (ARPU \\u00d7 (1 \\u2212 churn rate)) | <12mo \\uD83D\\uDFE2 | 12-24mo \\uD83D\\uDFE1 | >24mo \\uD83D\\uDD34\\n';" +
  "}else if(arpu<=0||cr<=0){" +
  "r+='\\u2022 CAC Payback Period:       \\u2014 (enter ARPU and churn rate)\\n';" +
  "}" +
  "if(ltvCRatio!==null){" +
  "r+='\\u2022 LTV:CAC Ratio:            '+ltvCRatio.toFixed(1)+'\\u00d7  '+lcColor(ltvCRatio)+'\\n';" +
  "r+='  = LTV \\u00f7 CAC | \\u22653\\u00d7 \\uD83D\\uDFE2 | 1-3\\u00d7 \\uD83D\\uDFE1 | <1\\u00d7 \\uD83D\\uDD34\\n';" +
  "}" +
  "r+='\\n';" +
  "}" +
  // ARPU + Subscribers
  "if(arpu>0&&subs>0){r+='\\u2022 Monthly ARPU:            '+fmt(arpu)+'\\n';r+='\\u2022 Subscribers:             '+subs+' (currentMrr \\u00f7 ARPU)\\n';}" +

  // Section 6: Action Plan
  "r+='\\n\\uD83C\\uDFAF Action Plan\\n';" +
  "r+='\\u2022 Stage: '+phase(mr)+'\\n';" +
  // Burn
  "if(isProf&&ex>0)r+='\\u2022 Burn:  \\u2705 Profitable \\u2014 reinvest 30% of profit into growth.\\n';" +
  "else if(ex>0&&rCurr>=12)r+='\\u2022 Burn:  \\uD83D\\uDFE1 Burning cash but healthy runway. Watch burn rate.\\n';" +
  "else if(ex>0&&rCurr<12)r+='\\u2022 Burn:  \\uD83D\\uDD34 Critical runway \\u2014 cut costs or accelerate revenue.\\n';" +
  "else r+='\\u2022 Burn:  Enter expenses to assess burn.\\n';" +
  // Growth
  "if(nr>=0.1)r+='\\u2022 Growth: \\uD83D\\uDD25 Exceptional (+'+pct(nr*100)+' net) \\u2014 sustain by staying close to customers.\\n';" +
  "else if(nr>=0.05)r+='\\u2022 Growth: \\uD83D\\uDE80 Strong (+'+pct(nr*100)+' net) \\u2014 compound is working for you.\\n';" +
  "else if(nr>0)r+='\\u2022 Growth: \\uD83D\\uDCC8 Steady (+'+pct(nr*100)+' net) \\u2014 small gains compound over time.\\n';" +
  "else if(mr>0)r+='\\u2022 Growth: \\uD83D\\uDC22 Stalled ('+pct(nr*100)+' net) \\u2014 add a second acquisition channel.\\n';" +
  // Risk
  "if(isProf&&nr>=0.03)r+='\\u2022 Risk:  \\uD83D\\uDFE2 Low \\u2014 profitable + growing. Focus on moat and scale.\\n';" +
  "else if(isProf&&nr>0)r+='\\u2022 Risk:  \\uD83D\\uDFE1 Moderate \\u2014 profitable but slow growth. Boost marketing.\\n';" +
  "else if(!isProf&&rCurr>=12)r+='\\u2022 Risk:  \\uD83D\\uDFE1 Manageable \\u2014 burning but decent runway. Plan breakeven path.\\n';" +
  "else if(!isProf&&rCurr<12&&rCurr>=6)r+='\\u2022 Risk:  \\uD83D\\uDFE0 Elevated \\u2014 under 12 months runway. Prioritize revenue growth.\\n';" +
  "else if(!isProf&&rCurr<6)r+='\\u2022 Risk:  \\uD83D\\uDD34 Urgent \\u2014 under 6 months runway. Cut expenses now.\\n';" +
  // Priorities
  "var prio=1;r+='\\n\\uD83D\\uDD25 Top Priorities:\\n';" +
  "if(cr>0&&mr>0){" +
  "var fasterCut=Math.max(0,cr-1);" +
  "r+='  '+prio+'. Cut churn from '+pct(cr)+' \\u2192 '+pct(fasterCut)+' \\u2192 $10K MRR sooner.\\n';" +
  "prio++;}" +
  "if(isProf&&ex>0){r+='  '+prio+'. With '+fmt(netInc)+'/mo profit, reinvest in ads or part-time help.\\n';prio++;}" +
  "if(rCurr<12&&mr>0){r+='  '+prio+'. Runway under 12 months \\u2014 build a breakeven plan this week.\\n';prio++;}" +
  "if(nr<0.02&&mr>0){r+='  '+prio+'. Growth under 2%/mo \\u2014 test one new acquisition channel.\\n';prio++;}" +
  "if(prio===1){r+='  1. Runway is healthy. Focus on product quality and customer retention.\\n';}" +
  "if(mr>0||ex>0){var beMRR2=ex;var beLab=mr>=beMRR2?'\\uD83D\\uDFE2':'\\uD83D\\uDD34';r+='\\n\\u2696\\uFE0F Break-Even Revenue\\n';r+='\\u2022 '+beLab+' Break-even MRR: '+fmt(ex)+'/mo (covers monthly expenses)\\n';if(mr>=beMRR2){r+='\\u2022 Current MRR '+fmt(mr)+' is above break-even by '+fmt(mr-beMRR2)+'/mo.\\n';}else{var gap2=beMRR2-mr;r+='\\u2022 Gap to break-even: '+fmt(gap2)+'/mo. Closing this puts you at default-alive.\\n';}}" +
  "var tipStr;" +
  "if(cash>0&&rCurr>18){tipStr='\\uD83D\\uDCA1 Tip: Runway above 18 months is a competitive advantage. Use it for bold bets (new channels, hiring, product) \\u2014 not conservative hoarding.';}" +
  "else if(rCurr>0&&rCurr<=6){tipStr='\\uD83D\\uDCA1 Tip: Sub-6-month runway means raise now or cut hard. Delaying 30 days = raising from a weaker position. Cut discretionary spend first.';}" +
  "else if(mBurn>0&&mr>0&&mr/ex<0.3){tipStr='\\uD83D\\uDCA1 Tip: Your revenue covers under 30% of expenses. Focus 80% of effort on the 1-2 channels with highest ROI, not on cost-cutting.';}" +
  "else{tipStr='\\uD83D\\uDCA1 Tip: Re-project monthly. Inputs change (churn, hiring, ad costs). The plan that got you here won\\'t get you there.';}" +
  "r+='\\n'+tipStr+'\\n';" +

  "return [r];";

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
  generate(inputs: Record<string, string>): string[] { return projectRevenue(inputs); },
  staticExamples: [
    '📊 Revenue Snapshot\n\n• Starting MRR:           $0/mo\n• Ending MRR:             $0/mo  (after 12 months)\n• ARR Equivalent:         $0/yr\n• Total Revenue:          $0 over 12 months\n\n• Gross Monthly Growth:   +8.0%  (new + expansion)\n• Monthly Churn:          −3.0%  (lost revenue)\n• Net Monthly Growth:     +5.0%  (effective)  🟡 Healthy\n• Growth Multiple:        0.0×   (12-month MRR expansion)\n\n📈 MRR Milestones\n• Q1 (Month 3):  $0/mo\n• Q2 (Month 6):  $0/mo\n• Q3 (Month 9):  $0/mo\n• Q4 (Month 12):  $0/mo  ← target\n\n🎯 Key Milestones\n\n📅 Monthly MRR Breakdown\nMonth  1:  $0/mo  (+$0)\nMonth  2:  $0/mo  (+$0)\nMonth  3:  $0/mo  (+$0)  ← Q1\nMonth  4:  $0/mo  (+$0)\nMonth  5:  $0/mo  (+$0)\nMonth  6:  $0/mo  (+$0)  ← Q2\nMonth  7:  $0/mo  (+$0)\nMonth  8:  $0/mo  (+$0)\nMonth  9:  $0/mo  (+$0)  ← Q3\nMonth 10:  $0/mo  (+$0)\nMonth 11:  $0/mo  (+$0)\nMonth 12:  $0/mo  (+$0)  ← Q4\n\n🔄 Growth Scenarios (12-Month Outlook)\nEnter your current MRR to see growth scenarios.\n\n🔄 What-If Analysis\nEnter your current MRR to see what-if scenarios.\n\n💰 Runway & Breakeven\n• Cash on Hand:            $60,000\n• Monthly Expenses:        $3,000/mo\n• Monthly Net Revenue:     $0/mo  (MRR)\n\n• Monthly Burn:            −$3,000/mo  🟢\n• Runway (zero-revenue):   20.0 months\n• Runway (current pace):   20.0 months  🟢\n• Breakeven:               Not reachable at current growth rate.\n  → Cut expenses or boost growth immediately.\n\n🩺 Burn & Efficiency Metrics\n• Gross Burn:              $3,000/mo  (total expenses)\n• Net Burn:                −$3,000/mo  🔴\n\n• Burn Multiple:           N/A (no net new MRR)\n\n• Rule of 40:              5.0%  🔴\n  = net growth 5.0% + profit margin 0.0%\n  | ≥40% 🟢 | 20-40% 🟡 | <20% 🔴\n\n• MRR / Expense Ratio:     0.00×  🔴\n  ≥2.0 🟢 | 1.0-2.0 🟡 | <1.0 🔴\n\n• LTV (Customer Lifetime): $833  (33× ARPU)  🟡\n  = ARPU ÷ monthly churn | ≥36× 🟢 | 12-36× 🟡 | <12× 🔴\n\n• CAC (Customer Acq. Cost): $200\n• CAC Payback Period:       8.2 months  🟢\n  = CAC ÷ (ARPU × (1 − churn rate)) | <12mo 🟢 | 12-24mo 🟡 | >24mo 🔴\n• LTV:CAC Ratio:            4.2×  🟢\n  = LTV ÷ CAC | ≥3× 🟢 | 1-3× 🟡 | <1× 🔴\n\n\n🎯 Action Plan\n• Stage: Validation (<$1K MRR)\n• Burn:  🟡 Burning cash but healthy runway. Watch burn rate.\n• Growth: 🚀 Strong (+5.0% net) — compound is working for you.\n• Risk:  🟡 Manageable — burning but decent runway. Plan breakeven path.\n\n🔥 Top Priorities:\n  1. Runway is healthy. Focus on product quality and customer retention.\n\n⚖️ Break-Even Revenue\n• 🔴 Break-even MRR: $3,000/mo (covers monthly expenses)\n• Gap to break-even: $3,000/mo. Closing this puts you at default-alive.\n\n💡 Tip: Runway above 18 months is a competitive advantage. Use it for bold bets (new channels, hiring, product) — not conservative hoarding.\n',
  ],
  faq: [
    { q: "What is a good monthly growth rate for a SaaS?", a: "For early-stage SaaS (under $10K MRR), 5-10% monthly net growth is good. At $10K-$100K MRR, 3-5% is healthy. Above $100K MRR, 2-3% is normal. Net growth = gross growth − churn — both matter equally." },
    { q: "What's the difference between gross growth and net growth?", a: "Gross growth = new customer revenue + expansion revenue (upgrades). Net growth = gross growth − churn (cancellations + downgrades). If your gross growth is 8% but churn is 5%, your net is only 3% — you're growing but losing nearly half to churn. Net growth is what builds long-term revenue." },
    { q: "How do I calculate my monthly expenses?", a: "Include everything that recurs monthly: hosting, SaaS tools, contractor/VA costs, software subscriptions, marketing budget, and your own salary/withdrawal. Don't include one-time purchases. If your expenses fluctuate, use the 3-month average." },
    { q: "What's a healthy runway for a solopreneur?", a: "12+ months of runway at current burn rate is comfortable. 6-12 months is manageable but requires attention. Under 6 months is critical — you need to cut costs, raise prices, or launch new revenue streams immediately. This calculator shows both 'zero-revenue' and 'current pace' runway." },
    { q: "What is Burn Multiple and why does it matter?", a: "Burn Multiple = net burn ÷ net new MRR. It measures how much you're spending to generate each dollar of new recurring revenue. <1.0× is excellent (efficient growth), 1.0-2.0× is acceptable, >2.0× means you're over-spending relative to growth. Profitable businesses have no burn multiple." },
    { q: "How accurate are these projections?", a: "The projection is mathematically precise given your inputs, but real-world growth is lumpy. Use the conservative and aggressive scenarios to see the range of possible outcomes. For budgeting, always plan with the conservative end. Revisit this calculator monthly to update with actual numbers." },
    { q: "What's a good LTV:CAC ratio?", a: "A 3:1 LTV:CAC ratio is the SaaS industry benchmark — your customer lifetime value should be at least 3× your cost to acquire them. 5:1 or higher is excellent (you can afford to spend more on acquisition). Below 1:1 means you're losing money on every customer. Track CAC Payback alongside: under 12 months to recover your acquisition cost is healthy." },
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
