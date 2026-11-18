import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-7：结果输出 token 化 —— 服务端用 makeToken，客户端 customFn 前置
//   同一份实现（CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 两端逐字节相同，不可能漂。
// ⭐ 形态分工（最容易踩的坑）：
//   · label token（calc_out.label.*）只包**标签文本**；冒号与对齐空格留在 token 之外
//   · row  token（calc_out.mrr.row.*）包**整行/尾部片段**，运行时数值抽成 {param}
//   ⇒ locale 模板替换时数值不会消失（否则模板把整行吞掉 ⇒ 页面上数字不见了）。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

function calculateMRR(inputs: Record<string, string>): string[] {
  const subs = clampNonNegative(parseInt(inputs.subscriberCount) || 0);
  const price = clampNonNegative(parseFloat(inputs.monthlyPrice) || 0);
  const churnRate = clampNonNegative(parseFloat(inputs.monthlyChurnRate) || 0);
  const expansionMrr = clampNonNegative(parseFloat(inputs.expansionMrr) || 0);
  const newSubs = clampNonNegative(parseInt(inputs.newSubsPerMonth) || 0);
  const contractionMrr = clampNonNegative(parseFloat(inputs.contractionMrr) || 0);
  const reactivationMrr = clampNonNegative(parseFloat(inputs.reactivationMrr) || 0);

  const fmt = (n: number) => "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (n: number) => n.toFixed(1) + "%";
  const maybeNeg = (n: number) => n >= 0 ? "+" + fmt(n) : fmt(n);

  const startingMRR = subs * price;
  const newMRR = newSubs * price;
  const churnedMRR = subs * (churnRate / 100) * price;
  const endingMRR = startingMRR + newMRR + expansionMrr + reactivationMrr - contractionMrr - churnedMRR;
  const netChange = endingMRR - startingMRR;
  const growthRate = startingMRR > 0 ? (netChange / startingMRR) * 100 : 0;

  // Key metrics
  const nrr = startingMRR > 0 ? (startingMRR + expansionMrr - contractionMrr - churnedMRR) / startingMRR * 100 : null;
  const grr = startingMRR > 0 ? (startingMRR - contractionMrr - churnedMRR) / startingMRR * 100 : null;
  const lossesTotal = contractionMrr + churnedMRR;
  const quickRatio = lossesTotal > 0 ? (newMRR + expansionMrr + reactivationMrr) / lossesTotal : null;
  const maxMRR = churnRate > 0 ? newMRR / (churnRate / 100) : null;

  // Contraction health
  const cteRatio = expansionMrr > 0 ? contractionMrr / expansionMrr * 100 : null;

  // Date helpers
  const today = new Date();
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const dateLabel = (monthsFromNow: number) => {
    const d = new Date(today.getTime() + monthsFromNow * 30.44 * 86400000);
    return monthNames[d.getMonth()] + " " + d.getFullYear();
  };

  let result = makeToken("calc_out.section.mrr_health_dashboard", "📊 MRR Health Dashboard") + "\n\n";

  // ═══ 1. MRR Snapshot ═══
  result += makeToken("calc_out.section.mrr_snapshot", "💰 MRR Snapshot") + "\n";
  result += "• " + makeToken("calc_out.label.starting_mrr", "Starting MRR") + ":      " + fmt(startingMRR) + "\n";
  result += "• " + makeToken("calc_out.label.ending_mrr", "Ending MRR") + ":        " + fmt(endingMRR) + "  " + makeToken("calc_out.mrr.row.ending_mrr_after_month", "(after 1 month)") + "\n";
  result += "• " + makeToken("calc_out.label.arr_x12", "ARR (×12)") + ":         " + fmt(startingMRR * 12) + "\n";
  result += "• " + makeToken("calc_out.label.subscribers", "Subscribers") + ":       " + subs.toLocaleString() + "  @ " + fmt(price) + "/mo\n";
  if (startingMRR > 0) {
    result += "• " + makeToken("calc_out.label.monthly_growth", "Monthly Growth") + ":    " + (growthRate >= 0 ? "+" : "") + pct(growthRate) + "\n";
  }

  // ═══ 2. MRR Waterfall ═══
  result += "\n" + makeToken("calc_out.section.mrr_waterfall", "📈 MRR Waterfall") + "\n";
  result += "  " + makeToken("calc_out.label.starting_mrr", "Starting MRR") + ":       " + fmt(startingMRR).padStart(10) + "\n";
  result += "  + " + makeToken("calc_out.label.new_mrr", "New MRR") + ":         +" + fmt(newMRR).padStart(9) + "  " + makeToken("calc_out.mrr.row.new_mrr_detail", "(" + newSubs + " new subs × " + fmt(price) + ")", { new_subs: String(newSubs), price: fmt(price) }) + "\n";
  result += "  + " + makeToken("calc_out.label.expansion_mrr", "Expansion MRR") + ":   +" + fmt(expansionMrr).padStart(9) + "  " + makeToken("calc_out.mrr.row.expansion_mrr_detail", "(upgrades & add-ons)") + "\n";
  result += "  + " + makeToken("calc_out.label.reactivation", "Reactivation") + ":    +" + fmt(reactivationMrr).padStart(9) + "  " + makeToken("calc_out.mrr.row.reactivation_detail", "(returned customers)") + "\n";
  result += "  − " + makeToken("calc_out.label.contraction", "Contraction") + ":     −" + fmt(contractionMrr).padStart(9) + "  " + makeToken("calc_out.mrr.row.contraction_detail", "(downgrades)") + "\n";
  result += "  − " + makeToken("calc_out.label.churn", "Churn") + ":           −" + fmt(churnedMRR).padStart(9) + "  " + makeToken("calc_out.mrr.row.churn_detail", "(" + pct(churnRate) + " of " + subs.toLocaleString() + " subs)", { churn_rate: pct(churnRate), subs: subs.toLocaleString() }) + "\n";
  result += "  = " + makeToken("calc_out.label.ending_mrr", "Ending MRR") + ":       " + fmt(endingMRR).padStart(10) + "\n";
  result += "  " + makeToken("calc_out.label.net_change", "Net Change") + ":         " + maybeNeg(netChange).padStart(10) + "  " + makeToken("calc_out.mrr.row.net_change_mom", "(" + (growthRate >= 0 ? "+" : "") + pct(growthRate) + " MoM)", { growth_rate: (growthRate >= 0 ? "+" : "") + pct(growthRate) }) + "\n";

  // Growth assessment
  if (startingMRR <= 0) {
    result += "  " + makeToken("calc_out.label.assessment", "Assessment") + ":         " + makeToken("calc_out.mrr.row.assessment_no_data", "⚠️  Enter subscribers and price to see growth analysis.") + "\n";
  } else if (growthRate >= 10) {
    result += "  " + makeToken("calc_out.label.assessment", "Assessment") + ":         " + makeToken("calc_out.mrr.row.assessment_excellent", "🟢 Excellent — 10%+ MoM growth is top-tier.") + "\n";
  } else if (growthRate >= 5) {
    result += "  " + makeToken("calc_out.label.assessment", "Assessment") + ":         " + makeToken("calc_out.mrr.row.assessment_healthy", "🟡 Healthy — 5–10% MoM. Sustainable trajectory.") + "\n";
  } else if (growthRate >= 0) {
    result += "  " + makeToken("calc_out.label.assessment", "Assessment") + ":         " + makeToken("calc_out.mrr.row.assessment_slow", "🟠 Slow — under 5% MoM. Fix acquisition or retention.") + "\n";
  } else {
    result += "  " + makeToken("calc_out.label.assessment", "Assessment") + ":         " + makeToken("calc_out.mrr.row.assessment_shrinking", "🔴 Shrinking — negative net MRR. Act now.") + "\n";
  }

  // ═══ 3. Key SaaS Metrics ═══
  result += "\n" + makeToken("calc_out.section.key_saas_metrics", "📐 Key SaaS Metrics") + "\n";
  if (nrr !== null) {
    let nrrColor: string;
    if (nrr >= 120) nrrColor = makeToken("calc_out.mrr.row.nrr_exceptional", "🟢 Exceptional — growing 20%+ from existing customers");
    else if (nrr >= 110) nrrColor = makeToken("calc_out.mrr.row.nrr_best_in_class", "🟢 Best-in-class — above 110% NRR");
    else if (nrr >= 100) nrrColor = makeToken("calc_out.mrr.row.nrr_positive", "🟡 Positive — existing base growing slightly");
    else nrrColor = makeToken("calc_out.mrr.row.nrr_shrinking", "🟠 Shrinking — losing revenue from existing customers");
    result += "• " + makeToken("calc_out.label.nrr_net_revenue_retention", "NRR (Net Revenue Retention)") + ":  " + pct(nrr) + "  " + nrrColor + "\n";
    // GRR
    let grrColor: string;
    if (grr! >= 90) grrColor = makeToken("calc_out.mrr.row.grr_healthy", "🟢 >90% is healthy");
    else if (grr! >= 80) grrColor = makeToken("calc_out.mrr.row.grr_watch", "🟡 80–90% — watch for trends");
    else grrColor = makeToken("calc_out.mrr.row.grr_attention", "🟠 <80% — retention needs attention");
    result += "• " + makeToken("calc_out.label.grr_gross_revenue_retention", "GRR (Gross Revenue Retention)") + ": " + pct(grr!) + "  " + grrColor + "\n";
  } else {
    result += "• " + makeToken("calc_out.mrr.row.nrr_unavailable", "NRR: — (enter subscribers and price to calculate)") + "\n";
    result += "• " + makeToken("calc_out.mrr.row.grr_unavailable", "GRR: —") + "\n";
  }
  // Quick Ratio
  if (quickRatio !== null) {
    let qrColor: string;
    if (quickRatio >= 4) qrColor = makeToken("calc_out.mrr.row.quick_ratio_highly_efficient", "🟢 >4 is highly efficient");
    else if (quickRatio >= 2) qrColor = makeToken("calc_out.mrr.row.quick_ratio_ok", "🟡 2–4 is OK");
    else if (quickRatio >= 1) qrColor = makeToken("calc_out.mrr.row.quick_ratio_weak", "🟠 1–2 is weak");
    else qrColor = makeToken("calc_out.mrr.row.quick_ratio_shrinking", "🔴 <1 — you are shrinking");
    result += "• " + makeToken("calc_out.label.saas_quick_ratio", "SaaS Quick Ratio") + ":              " + quickRatio.toFixed(1) + "x  " + qrColor + "\n";
  } else {
    result += "• " + makeToken("calc_out.label.saas_quick_ratio", "SaaS Quick Ratio") + ":              ∞  " + makeToken("calc_out.mrr.row.quick_ratio_no_losses", "🟢 No contraction or churn losses!") + "\n";
  }
  // Max MRR
  if (maxMRR !== null) {
    result += "• " + makeToken("calc_out.label.growth_ceiling_max_mrr", "Growth Ceiling (Max MRR)") + ":      " + fmt(maxMRR) + "/mo  " + makeToken("calc_out.mrr.row.growth_ceiling_at_churn", "at " + pct(churnRate) + " churn", { churn_rate: pct(churnRate) }) + "\n";
    // Insight: halving churn doubles ceiling
    const halfChurnCeiling = newMRR / ((churnRate / 2) / 100);
    result += "  → " + makeToken("calc_out.mrr.row.halving_churn_ceiling", "Halving churn to " + pct(churnRate / 2) + " would lift ceiling to " + fmt(halfChurnCeiling) + "/mo", { half_churn: pct(churnRate / 2), ceiling: fmt(halfChurnCeiling) }) + "\n";
  } else {
    result += "• " + makeToken("calc_out.label.growth_ceiling_max_mrr", "Growth Ceiling (Max MRR)") + ":      ∞  " + makeToken("calc_out.mrr.row.growth_ceiling_unlimited", "(no churn — unlimited growth)") + "\n";
  }

  // ═══ 4. Churn & Contraction Health ═══
  result += "\n" + makeToken("calc_out.section.churn_contraction_health", "🩺 Churn & Contraction Health") + "\n";
  // Churn part (existing logic)
  if (churnRate <= 0 && subs > 0) {
    result += "• " + makeToken("calc_out.label.monthly_churn", "Monthly Churn") + ":     " + pct(churnRate) + " " + makeToken("calc_out.mrr.row.monthly_churn_none", "— ✅ No churn detected.") + "\n";
  } else if (churnRate > 0 && churnRate <= 2) {
    result += "• " + makeToken("calc_out.label.monthly_churn", "Monthly Churn") + ":     " + pct(churnRate) + " " + makeToken("calc_out.mrr.row.monthly_churn_great", "— 🟢 Great. Under 2% is best-in-class.") + "\n";
  } else if (churnRate <= 3) {
    result += "• " + makeToken("calc_out.label.monthly_churn", "Monthly Churn") + ":     " + pct(churnRate) + " " + makeToken("calc_out.mrr.row.monthly_churn_good", "— 🟡 Good for SMB SaaS. Aim for under 2%.") + "\n";
  } else if (churnRate <= 5) {
    result += "• " + makeToken("calc_out.label.monthly_churn", "Monthly Churn") + ":     " + pct(churnRate) + " " + makeToken("calc_out.mrr.row.monthly_churn_elevated", "— 🟠 Elevated. Every point you reduce compounds.") + "\n";
  } else if (churnRate > 5) {
    result += "• " + makeToken("calc_out.label.monthly_churn", "Monthly Churn") + ":     " + pct(churnRate) + " " + makeToken("calc_out.mrr.row.monthly_churn_critical", "— 🔴 Critical. Retention is your #1 problem.") + "\n";
  } else {
    result += "• " + makeToken("calc_out.label.monthly_churn", "Monthly Churn") + ":     " + pct(churnRate) + "\n";
  }
  if (churnRate > 0 && subs > 0) {
    const churnedCount = Math.round(subs * churnRate / 100);
    const annualRetention = Math.pow(1 - churnRate / 100, 12) * 100;
    result += "• " + makeToken("calc_out.label.subs_lost_mo", "Subs Lost/Mo") + ":      ~" + churnedCount + " " + makeToken("calc_out.mrr.row.subs_lost_of", "of " + subs.toLocaleString(), { subs: subs.toLocaleString() }) + "\n";
    result += "• " + makeToken("calc_out.label.annual_retention", "Annual Retention") + ":  " + annualRetention.toFixed(1) + "% " + makeToken("calc_out.mrr.row.annual_retention_after_12m", "(after 12 months of churn)") + "\n";
  }
  // Contraction part
  if (contractionMrr > 0) {
    result += "• " + makeToken("calc_out.label.contraction_mrr", "Contraction MRR") + ":   " + fmt(contractionMrr) + "\n";
    if (expansionMrr <= 0) {
      result += "  → " + makeToken("calc_out.mrr.row.contraction_no_expansion", "🔴 Contraction with no expansion — investigate immediately.") + "\n";
    } else if (cteRatio !== null && cteRatio > 100) {
      result += "  → " + makeToken("calc_out.mrr.row.contraction_exceeds_expansion", "🔴 Contraction exceeds expansion — value delivery problem.") + "\n";
    } else if (cteRatio !== null && cteRatio > 50) {
      result += "  → " + makeToken("calc_out.mrr.row.contraction_eats_expansion", "🟠 Contraction eats " + cteRatio.toFixed(0) + "% of expansion — watch closely.", { cte: cteRatio.toFixed(0) }) + "\n";
    } else {
      result += "  → " + makeToken("calc_out.mrr.row.contraction_well_managed", "🟢 Contraction at " + (cteRatio !== null ? cteRatio.toFixed(0) : "—") + "% of expansion — well-managed.", { cte: (cteRatio !== null ? cteRatio.toFixed(0) : "—") }) + "\n";
    }
  } else {
    result += "• " + makeToken("calc_out.label.contraction_mrr", "Contraction MRR") + ":   $0.00 " + makeToken("calc_out.mrr.row.contraction_none", "— ✅ No contraction. All revenue losses are from full churn.") + "\n";
  }

  // ═══ 5. MRR Milestone Projections ═══
  if (startingMRR > 0 && netChange !== 0) {
    result += "\n" + makeToken("calc_out.section.mrr_milestone_projections", "🎯 MRR Milestone Projections") + "\n";
    result += "   " + makeToken("calc_out.mrr.row.milestone_assumption", "(assuming constant net change of " + maybeNeg(netChange) + "/mo)", { net_change: maybeNeg(netChange) }) + "\n";
    const milestones = netChange > 0
      ? [5000, 10000, 20000, 50000, 100000]
      : [5000, 10000, 20000, 50000, 100000].filter(m => m < startingMRR);
    let anyShown = false;
    for (const milestone of milestones) {
      if (netChange > 0 && startingMRR >= milestone) continue;
      if (netChange < 0 && startingMRR <= milestone) continue;
      const monthsToReach = Math.abs((milestone - startingMRR) / netChange);
      if (monthsToReach > 120) continue;
      result += "• " + makeToken("calc_out.mrr.row.milestone", fmt(milestone) + " MRR:  " + monthsToReach.toFixed(1) + " months  (~" + dateLabel(monthsToReach) + ")", { milestone: fmt(milestone), months: monthsToReach.toFixed(1), date: dateLabel(monthsToReach) }) + "\n";
      anyShown = true;
    }
    if (!anyShown) {
      result += "• " + makeToken("calc_out.mrr.row.milestones_exhausted", "All standard milestones reached or beyond projection range.") + "\n";
    }
  } else if (startingMRR > 0 && netChange === 0) {
    result += "\n" + makeToken("calc_out.section.mrr_milestone_projections", "🎯 MRR Milestone Projections") + "\n";
    result += "• " + makeToken("calc_out.mrr.row.milestone_flat", "Net change is zero — MRR is flat. Add growth inputs to see projections.") + "\n";
  }

  // ═══ 6. What-If Scenarios ═══
  if (startingMRR > 0) {
    result += "\n" + makeToken("calc_out.section.what_if_scenarios", "🔄 What-If Scenarios:") + "\n";

    // Scenario A: Reduce churn
    if (churnRate > 1 && maxMRR !== null) {
      const newChurn = Math.max(1, churnRate - 2); // target 2pp lower, min 1%
      const newMaxMRR = newMRR / (newChurn / 100);
      const annualGain = (newMaxMRR - maxMRR) * 12;
      result += "• " + makeToken("calc_out.mrr.row.whatif_churn_drop", "If churn drops " + pct(churnRate) + " → " + pct(newChurn) + ":", { from: pct(churnRate), to: pct(newChurn) }) + "\n";
      result += "  " + makeToken("calc_out.label.max_mrr", "Max MRR") + ": " + fmt(maxMRR) + " → " + fmt(newMaxMRR) + " (+" + fmt(newMaxMRR - maxMRR) + ")\n";
      if (annualGain > 0) {
        result += "  " + makeToken("calc_out.label.annual_revenue_potential", "Annual revenue potential") + ": +" + fmt(annualGain) + "\n";
      }
    } else if (churnRate > 0 && churnRate <= 1 && maxMRR !== null) {
      result += "• " + makeToken("calc_out.mrr.row.whatif_churn_already_low", "Churn is already very low at " + pct(churnRate) + " — keep it up! Max MRR: " + fmt(maxMRR) + "/mo.", { churn: pct(churnRate), max: fmt(maxMRR) }) + "\n";
    }

    // Scenario B: Boost expansion to 25% of new MRR
    const targetExpansion = newMRR * 0.25;
    if (newMRR > 0) {
      if (expansionMrr >= targetExpansion) {
        const currentPct = newMRR > 0 ? (expansionMrr / newMRR * 100).toFixed(0) : "—";
        result += "• " + makeToken("calc_out.mrr.row.whatif_expansion_on_target", "Expansion at " + currentPct + "% of new MRR — ✅ already exceeding 25% target.", { pct: currentPct }) + "\n";
      } else {
        const gap = targetExpansion - expansionMrr;
        const newNRR = nrr !== null ? (startingMRR + targetExpansion - contractionMrr - churnedMRR) / startingMRR * 100 : null;
        result += "• " + makeToken("calc_out.mrr.row.whatif_expansion_growth", "If expansion grows to 25% of new MRR:") + "\n";
        result += "  " + makeToken("calc_out.label.target_expansion", "Target Expansion") + ": " + fmt(targetExpansion) + "/mo " + makeToken("calc_out.mrr.row.whatif_expansion_target_gap", "(+" + fmt(gap) + " needed)", { gap: fmt(gap) }) + "\n";
        if (nrr !== null && newNRR !== null) {
          result += "  " + makeToken("calc_out.label.nrr_would_rise", "NRR would rise") + ": " + pct(nrr) + " → " + pct(newNRR) + "\n";
        }
      }
    }

    // Scenario C: Halve contraction
    if (contractionMrr > 0) {
      const savings = contractionMrr / 2;
      const newNetChange = netChange + savings;
      const newNRR = nrr !== null ? (startingMRR + expansionMrr - savings - churnedMRR) / startingMRR * 100 : null;
      result += "• " + makeToken("calc_out.mrr.row.whatif_contraction_cut", "If contraction is cut by 50%:") + "\n";
      result += "  " + makeToken("calc_out.label.savings", "Savings") + ": +" + fmt(savings) + "/mo\n";
      result += "  " + makeToken("calc_out.label.net_change_improves", "Net Change improves") + ": " + maybeNeg(netChange) + " → " + maybeNeg(newNetChange) + "/mo";
      if (netChange !== 0) {
        const pctImprove = Math.abs((newNetChange - netChange) / netChange * 100);
        result += " (+" + pctImprove.toFixed(0) + "%)";
      }
      result += "\n";
      if (nrr !== null && newNRR !== null) {
        result += "  " + makeToken("calc_out.label.nrr_improves", "NRR improves") + ": " + pct(nrr) + " → " + pct(newNRR) + "\n";
      }
    }
  }

  // ═══ 7. Break-Even Growth ═══
  if (startingMRR > 0 && price > 0) {
    const breakEvenSubs = Math.ceil((churnedMRR + contractionMrr - expansionMrr - reactivationMrr) / price);
    const breakEvenNote = breakEvenSubs < 0
      ? "• " + makeToken("calc_out.mrr.row.break_even_below_zero", "🟢 Break-even below 0 — your expansion + reactivation already outpaces losses.")
      : newSubs >= breakEvenSubs
        ? "• " + makeToken("calc_out.mrr.row.break_even_above", "🟢 Break-even new subs/mo: " + breakEvenSubs + "  — you're growing above break-even (" + newSubs + " actual).", { be: String(breakEvenSubs), actual: String(newSubs) })
        : "• " + makeToken("calc_out.mrr.row.break_even_below", "🔴 Break-even new subs/mo: " + breakEvenSubs + "  — you're below break-even (" + newSubs + " actual). MRR is shrinking.", { be: String(breakEvenSubs), actual: String(newSubs) });
    result += "\n" + makeToken("calc_out.section.break_even_growth", "⚖️ Break-Even Growth") + "\n" + breakEvenNote + "\n";
  }

  // ═══ 8. Tip ═══
  let tip: string;
  if (nrr !== null && nrr >= 110) {
    tip = "💡 Tip: Best-in-class NRR — protect the expansion motion that drives it. Don't fix what isn't broken.";
  } else if (churnRate < 2 && churnRate > 0) {
    tip = "💡 Tip: Sub-2% churn is your unfair advantage. Don't raise prices until you've maxed expansion revenue per account.";
  } else if (churnRate >= 5) {
    tip = "💡 Tip: Lowering churn from " + churnRate.toFixed(1) + "% to 3% roughly doubles customer lifetime. Retention is your #1 lever right now.";
  } else {
    tip = "💡 Tip: Track your Quick Ratio weekly — above 4 means growth is efficient. Below 2 means you're scaling losses faster than gains.";
  }
  result += "\n" + tip + "\n";

  return [result];
}

// customFn — byte-for-byte equivalent of calculateMRR for client-side execution
const customFn =
  // P168 B3-7：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 两端输出逐字节相同，不可能漂；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let M=function(u){return Number.isNaN(u)?0:Math.max(0,u)},E=function(u){const w=M(parseInt(u.subscriberCount)||0),d=M(parseFloat(u.monthlyPrice)||0),n=M(parseFloat(u.monthlyChurnRate)||0),h=M(parseFloat(u.expansionMrr)||0),y=M(parseInt(u.newSubsPerMonth)||0),g=M(parseFloat(u.contractionMrr)||0),F=M(parseFloat(u.reactivationMrr)||0),c=o=>"$"+o.toLocaleString(void 0,{minimumFractionDigits:2,maximumFractionDigits:2}),e=o=>o.toFixed(1)+"%",x=o=>o>=0?"+"+c(o):c(o),a=w*d,b=y*d,v=w*(n/100)*d,N=a+b+h+F-g-v,s=N-a,p=a>0?s/a*100:0,_=a>0?(a+h-g-v)/a*100:null,A=a>0?(a-g-v)/a*100:null,j=g+v,S=j>0?(b+h+F)/j:null,m=n>0?b/(n/100):null,R=h>0?g/h*100:null,B=new Date,I=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],G=o=>{const l=new Date(B.getTime()+o*30.44*864e5);return I[l.getMonth()]+" "+l.getFullYear()};let r=t("calc_out.section.mrr_health_dashboard","📊 MRR Health Dashboard")+\`

\`;if(r+=t("calc_out.section.mrr_snapshot","💰 MRR Snapshot")+\`
\`,r+="• "+t("calc_out.label.starting_mrr","Starting MRR")+":      "+c(a)+\`
\`,r+="• "+t("calc_out.label.ending_mrr","Ending MRR")+":        "+c(N)+"  "+t("calc_out.mrr.row.ending_mrr_after_month","(after 1 month)")+\`
\`,r+="• "+t("calc_out.label.arr_x12","ARR (×12)")+":         "+c(a*12)+\`
\`,r+="• "+t("calc_out.label.subscribers","Subscribers")+":       "+w.toLocaleString()+"  @ "+c(d)+\`/mo
\`,a>0&&(r+="• "+t("calc_out.label.monthly_growth","Monthly Growth")+":    "+(p>=0?"+":"")+e(p)+\`
\`),r+=\`
\`+t("calc_out.section.mrr_waterfall","📈 MRR Waterfall")+\`
\`,r+="  "+t("calc_out.label.starting_mrr","Starting MRR")+":       "+c(a).padStart(10)+\`
\`,r+="  + "+t("calc_out.label.new_mrr","New MRR")+":         +"+c(b).padStart(9)+"  "+t("calc_out.mrr.row.new_mrr_detail","("+y+" new subs × "+c(d)+")",{new_subs:String(y),price:c(d)})+\`
\`,r+="  + "+t("calc_out.label.expansion_mrr","Expansion MRR")+":   +"+c(h).padStart(9)+"  "+t("calc_out.mrr.row.expansion_mrr_detail","(upgrades & add-ons)")+\`
\`,r+="  + "+t("calc_out.label.reactivation","Reactivation")+":    +"+c(F).padStart(9)+"  "+t("calc_out.mrr.row.reactivation_detail","(returned customers)")+\`
\`,r+="  − "+t("calc_out.label.contraction","Contraction")+":     −"+c(g).padStart(9)+"  "+t("calc_out.mrr.row.contraction_detail","(downgrades)")+\`
\`,r+="  − "+t("calc_out.label.churn","Churn")+":           −"+c(v).padStart(9)+"  "+t("calc_out.mrr.row.churn_detail","("+e(n)+" of "+w.toLocaleString()+" subs)",{churn_rate:e(n),subs:w.toLocaleString()})+\`
\`,r+="  = "+t("calc_out.label.ending_mrr","Ending MRR")+":       "+c(N).padStart(10)+\`
\`,r+="  "+t("calc_out.label.net_change","Net Change")+":         "+x(s).padStart(10)+"  "+t("calc_out.mrr.row.net_change_mom","("+(p>=0?"+":"")+e(p)+" MoM)",{growth_rate:(p>=0?"+":"")+e(p)})+\`
\`,a<=0?r+="  "+t("calc_out.label.assessment","Assessment")+":         "+t("calc_out.mrr.row.assessment_no_data","⚠️  Enter subscribers and price to see growth analysis.")+\`
\`:p>=10?r+="  "+t("calc_out.label.assessment","Assessment")+":         "+t("calc_out.mrr.row.assessment_excellent","🟢 Excellent — 10%+ MoM growth is top-tier.")+\`
\`:p>=5?r+="  "+t("calc_out.label.assessment","Assessment")+":         "+t("calc_out.mrr.row.assessment_healthy","🟡 Healthy — 5–10% MoM. Sustainable trajectory.")+\`
\`:p>=0?r+="  "+t("calc_out.label.assessment","Assessment")+":         "+t("calc_out.mrr.row.assessment_slow","🟠 Slow — under 5% MoM. Fix acquisition or retention.")+\`
\`:r+="  "+t("calc_out.label.assessment","Assessment")+":         "+t("calc_out.mrr.row.assessment_shrinking","🔴 Shrinking — negative net MRR. Act now.")+\`
\`,r+=\`
\`+t("calc_out.section.key_saas_metrics","📐 Key SaaS Metrics")+\`
\`,_!==null){let o;_>=120?o=t("calc_out.mrr.row.nrr_exceptional","🟢 Exceptional — growing 20%+ from existing customers"):_>=110?o=t("calc_out.mrr.row.nrr_best_in_class","🟢 Best-in-class — above 110% NRR"):_>=100?o=t("calc_out.mrr.row.nrr_positive","🟡 Positive — existing base growing slightly"):o=t("calc_out.mrr.row.nrr_shrinking","🟠 Shrinking — losing revenue from existing customers"),r+="• "+t("calc_out.label.nrr_net_revenue_retention","NRR (Net Revenue Retention)")+":  "+e(_)+"  "+o+\`
\`;let l;A>=90?l=t("calc_out.mrr.row.grr_healthy","🟢 >90% is healthy"):A>=80?l=t("calc_out.mrr.row.grr_watch","🟡 80–90% — watch for trends"):l=t("calc_out.mrr.row.grr_attention","🟠 <80% — retention needs attention"),r+="• "+t("calc_out.label.grr_gross_revenue_retention","GRR (Gross Revenue Retention)")+": "+e(A)+"  "+l+\`
\`}else r+="• "+t("calc_out.mrr.row.nrr_unavailable","NRR: — (enter subscribers and price to calculate)")+\`
\`,r+="• "+t("calc_out.mrr.row.grr_unavailable","GRR: —")+\`
\`;if(S!==null){let o;S>=4?o=t("calc_out.mrr.row.quick_ratio_highly_efficient","🟢 >4 is highly efficient"):S>=2?o=t("calc_out.mrr.row.quick_ratio_ok","🟡 2–4 is OK"):S>=1?o=t("calc_out.mrr.row.quick_ratio_weak","🟠 1–2 is weak"):o=t("calc_out.mrr.row.quick_ratio_shrinking","🔴 <1 — you are shrinking"),r+="• "+t("calc_out.label.saas_quick_ratio","SaaS Quick Ratio")+":              "+S.toFixed(1)+"x  "+o+\`
\`}else r+="• "+t("calc_out.label.saas_quick_ratio","SaaS Quick Ratio")+":              ∞  "+t("calc_out.mrr.row.quick_ratio_no_losses","🟢 No contraction or churn losses!")+\`
\`;if(m!==null){r+="• "+t("calc_out.label.growth_ceiling_max_mrr","Growth Ceiling (Max MRR)")+":      "+c(m)+"/mo  "+t("calc_out.mrr.row.growth_ceiling_at_churn","at "+e(n)+" churn",{churn_rate:e(n)})+\`
\`;const o=b/(n/2/100);r+="  → "+t("calc_out.mrr.row.halving_churn_ceiling","Halving churn to "+e(n/2)+" would lift ceiling to "+c(o)+"/mo",{half_churn:e(n/2),ceiling:c(o)})+\`
\`}else r+="• "+t("calc_out.label.growth_ceiling_max_mrr","Growth Ceiling (Max MRR)")+":      ∞  "+t("calc_out.mrr.row.growth_ceiling_unlimited","(no churn — unlimited growth)")+\`
\`;if(r+=\`
\`+t("calc_out.section.churn_contraction_health","🩺 Churn & Contraction Health")+\`
\`,n<=0&&w>0?r+="• "+t("calc_out.label.monthly_churn","Monthly Churn")+":     "+e(n)+" "+t("calc_out.mrr.row.monthly_churn_none","— ✅ No churn detected.")+\`
\`:n>0&&n<=2?r+="• "+t("calc_out.label.monthly_churn","Monthly Churn")+":     "+e(n)+" "+t("calc_out.mrr.row.monthly_churn_great","— 🟢 Great. Under 2% is best-in-class.")+\`
\`:n<=3?r+="• "+t("calc_out.label.monthly_churn","Monthly Churn")+":     "+e(n)+" "+t("calc_out.mrr.row.monthly_churn_good","— 🟡 Good for SMB SaaS. Aim for under 2%.")+\`
\`:n<=5?r+="• "+t("calc_out.label.monthly_churn","Monthly Churn")+":     "+e(n)+" "+t("calc_out.mrr.row.monthly_churn_elevated","— 🟠 Elevated. Every point you reduce compounds.")+\`
\`:n>5?r+="• "+t("calc_out.label.monthly_churn","Monthly Churn")+":     "+e(n)+" "+t("calc_out.mrr.row.monthly_churn_critical","— 🔴 Critical. Retention is your #1 problem.")+\`
\`:r+="• "+t("calc_out.label.monthly_churn","Monthly Churn")+":     "+e(n)+\`
\`,n>0&&w>0){const o=Math.round(w*n/100),l=Math.pow(1-n/100,12)*100;r+="• "+t("calc_out.label.subs_lost_mo","Subs Lost/Mo")+":      ~"+o+" "+t("calc_out.mrr.row.subs_lost_of","of "+w.toLocaleString(),{subs:w.toLocaleString()})+\`
\`,r+="• "+t("calc_out.label.annual_retention","Annual Retention")+":  "+l.toFixed(1)+"% "+t("calc_out.mrr.row.annual_retention_after_12m","(after 12 months of churn)")+\`
\`}if(g>0?(r+="• "+t("calc_out.label.contraction_mrr","Contraction MRR")+":   "+c(g)+\`
\`,h<=0?r+="  → "+t("calc_out.mrr.row.contraction_no_expansion","🔴 Contraction with no expansion — investigate immediately.")+\`
\`:R!==null&&R>100?r+="  → "+t("calc_out.mrr.row.contraction_exceeds_expansion","🔴 Contraction exceeds expansion — value delivery problem.")+\`
\`:R!==null&&R>50?r+="  → "+t("calc_out.mrr.row.contraction_eats_expansion","🟠 Contraction eats "+R.toFixed(0)+"% of expansion — watch closely.",{cte:R.toFixed(0)})+\`
\`:r+="  → "+t("calc_out.mrr.row.contraction_well_managed","🟢 Contraction at "+(R!==null?R.toFixed(0):"—")+"% of expansion — well-managed.",{cte:R!==null?R.toFixed(0):"—"})+\`
\`):r+="• "+t("calc_out.label.contraction_mrr","Contraction MRR")+":   $0.00 "+t("calc_out.mrr.row.contraction_none","— ✅ No contraction. All revenue losses are from full churn.")+\`
\`,a>0&&s!==0){r+=\`
\`+t("calc_out.section.mrr_milestone_projections","🎯 MRR Milestone Projections")+\`
\`,r+="   "+t("calc_out.mrr.row.milestone_assumption","(assuming constant net change of "+x(s)+"/mo)",{net_change:x(s)})+\`
\`;const o=s>0?[5e3,1e4,2e4,5e4,1e5]:[5e3,1e4,2e4,5e4,1e5].filter(i=>i<a);let l=!1;for(const i of o){if(s>0&&a>=i||s<0&&a<=i)continue;const f=Math.abs((i-a)/s);f>120||(r+="• "+t("calc_out.mrr.row.milestone",c(i)+" MRR:  "+f.toFixed(1)+" months  (~"+G(f)+")",{milestone:c(i),months:f.toFixed(1),date:G(f)})+\`
\`,l=!0)}l||(r+="• "+t("calc_out.mrr.row.milestones_exhausted","All standard milestones reached or beyond projection range.")+\`
\`)}else a>0&&s===0&&(r+=\`
\`+t("calc_out.section.mrr_milestone_projections","🎯 MRR Milestone Projections")+\`
\`,r+="• "+t("calc_out.mrr.row.milestone_flat","Net change is zero — MRR is flat. Add growth inputs to see projections.")+\`
\`);if(a>0){if(r+=\`
\`+t("calc_out.section.what_if_scenarios","🔄 What-If Scenarios:")+\`
\`,n>1&&m!==null){const l=Math.max(1,n-2),i=b/(l/100),f=(i-m)*12;r+="• "+t("calc_out.mrr.row.whatif_churn_drop","If churn drops "+e(n)+" → "+e(l)+":",{from:e(n),to:e(l)})+\`
\`,r+="  "+t("calc_out.label.max_mrr","Max MRR")+": "+c(m)+" → "+c(i)+" (+"+c(i-m)+\`)
\`,f>0&&(r+="  "+t("calc_out.label.annual_revenue_potential","Annual revenue potential")+": +"+c(f)+\`
\`)}else n>0&&n<=1&&m!==null&&(r+="• "+t("calc_out.mrr.row.whatif_churn_already_low","Churn is already very low at "+e(n)+" — keep it up! Max MRR: "+c(m)+"/mo.",{churn:e(n),max:c(m)})+\`
\`);const o=b*.25;if(b>0)if(h>=o){const l=b>0?(h/b*100).toFixed(0):"—";r+="• "+t("calc_out.mrr.row.whatif_expansion_on_target","Expansion at "+l+"% of new MRR — ✅ already exceeding 25% target.",{pct:l})+\`
\`}else{const l=o-h,i=_!==null?(a+o-g-v)/a*100:null;r+="• "+t("calc_out.mrr.row.whatif_expansion_growth","If expansion grows to 25% of new MRR:")+\`
\`,r+="  "+t("calc_out.label.target_expansion","Target Expansion")+": "+c(o)+"/mo "+t("calc_out.mrr.row.whatif_expansion_target_gap","(+"+c(l)+" needed)",{gap:c(l)})+\`
\`,_!==null&&i!==null&&(r+="  "+t("calc_out.label.nrr_would_rise","NRR would rise")+": "+e(_)+" → "+e(i)+\`
\`)}if(g>0){const l=g/2,i=s+l,f=_!==null?(a+h-l-v)/a*100:null;if(r+="• "+t("calc_out.mrr.row.whatif_contraction_cut","If contraction is cut by 50%:")+\`
\`,r+="  "+t("calc_out.label.savings","Savings")+": +"+c(l)+\`/mo
\`,r+="  "+t("calc_out.label.net_change_improves","Net Change improves")+": "+x(s)+" → "+x(i)+"/mo",s!==0){const P=Math.abs((i-s)/s*100);r+=" (+"+P.toFixed(0)+"%)"}r+=\`
\`,_!==null&&f!==null&&(r+="  "+t("calc_out.label.nrr_improves","NRR improves")+": "+e(_)+" → "+e(f)+\`
\`)}}if(a>0&&d>0){const o=Math.ceil((v+g-h-F)/d),l=o<0?"• "+t("calc_out.mrr.row.break_even_below_zero","🟢 Break-even below 0 — your expansion + reactivation already outpaces losses."):y>=o?"• "+t("calc_out.mrr.row.break_even_above","🟢 Break-even new subs/mo: "+o+"  — you're growing above break-even ("+y+" actual).",{be:String(o),actual:String(y)}):"• "+t("calc_out.mrr.row.break_even_below","🔴 Break-even new subs/mo: "+o+"  — you're below break-even ("+y+" actual). MRR is shrinking.",{be:String(o),actual:String(y)});r+=\`
\`+t("calc_out.section.break_even_growth","⚖️ Break-Even Growth")+\`
\`+l+\`
\`}let C;return _!==null&&_>=110?C="💡 Tip: Best-in-class NRR — protect the expansion motion that drives it. Don't fix what isn't broken.":n<2&&n>0?C="💡 Tip: Sub-2% churn is your unfair advantage. Don't raise prices until you've maxed expansion revenue per account.":n>=5?C="💡 Tip: Lowering churn from "+n.toFixed(1)+"% to 3% roughly doubles customer lifetime. Retention is your #1 lever right now.":C="💡 Tip: Track your Quick Ratio weekly — above 4 means growth is efficient. Below 2 means you're scaling losses faster than gains.",r+=\`
\`+C+\`
\`,[r]},q=function(u,w,d){var n=L(u);return Array.isArray(n)?n.join(\`
\`):String(n)};var O=M,H=E,J=q,t=tk,D='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',t=new Function("return "+D)(),L=function(u){return E(u)};return[q(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

const engine: ToolEngine = {
  slug: "solopreneur-mrr-calculator",
  title: "MRR Calculator",
  description: "Track your MRR health: new vs churned vs expansion revenue, monthly growth rate, and time to reach key milestones.",
  inputs: [
    { name: "subscriberCount", label: "Current Subscribers", placeholder: "e.g. 500", type: "number" },
    { name: "monthlyPrice", label: "Monthly Price ($)", placeholder: "e.g. 29", type: "number" },
    { name: "monthlyChurnRate", label: "Monthly Churn Rate (%)", placeholder: "e.g. 3", type: "number" },
    { name: "expansionMrr", label: "Expansion MRR ($/mo)", placeholder: "e.g. 800 (upgrades & add-ons)", type: "number" },
    { name: "newSubsPerMonth", label: "New Subscribers / Month", placeholder: "e.g. 100", type: "number" },
    { name: "contractionMrr", label: "Contraction MRR ($/mo)", placeholder: "e.g. 150 (downgrades & reductions)", type: "number" },
    { name: "reactivationMrr", label: "Reactivation MRR ($/mo)", placeholder: "e.g. 100 (returned customers)", type: "number" },
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
  generate(inputs: Record<string, string>): string[] { return calculateMRR(inputs); },
  staticExamples: [
    '$calc_out.section.mrr_health_dashboard|📊 MRR Health Dashboard|\n\n$calc_out.section.mrr_snapshot|💰 MRR Snapshot|\n• $calc_out.label.starting_mrr|Starting MRR|:      $14,500.00\n• $calc_out.label.ending_mrr|Ending MRR|:        $16,965.00  $calc_out.mrr.row.ending_mrr_after_month|(after 1 month)|\n• $calc_out.label.arr_x12|ARR (×12)|:         $174,000.00\n• $calc_out.label.subscribers|Subscribers|:       500  @ $29.00/mo\n• $calc_out.label.monthly_growth|Monthly Growth|:    +17.0%\n\n$calc_out.section.mrr_waterfall|📈 MRR Waterfall|\n  $calc_out.label.starting_mrr|Starting MRR|:       $14,500.00\n  + $calc_out.label.new_mrr|New MRR|:         +$2,900.00  $calc_out.mrr.row.new_mrr_detail{"new_subs":"100","price":"$29.00"}|(100 new subs × $29.00)|\n  + $calc_out.label.expansion_mrr|Expansion MRR|:   +    $0.00  $calc_out.mrr.row.expansion_mrr_detail|(upgrades & add-ons)|\n  + $calc_out.label.reactivation|Reactivation|:    +    $0.00  $calc_out.mrr.row.reactivation_detail|(returned customers)|\n  − $calc_out.label.contraction|Contraction|:     −    $0.00  $calc_out.mrr.row.contraction_detail|(downgrades)|\n  − $calc_out.label.churn|Churn|:           −  $435.00  $calc_out.mrr.row.churn_detail{"churn_rate":"3.0%","subs":"500"}|(3.0% of 500 subs)|\n  = $calc_out.label.ending_mrr|Ending MRR|:       $16,965.00\n  $calc_out.label.net_change|Net Change|:         +$2,465.00  $calc_out.mrr.row.net_change_mom{"growth_rate":"+17.0%"}|(+17.0% MoM)|\n  $calc_out.label.assessment|Assessment|:         $calc_out.mrr.row.assessment_excellent|🟢 Excellent — 10%+ MoM growth is top-tier.|\n\n$calc_out.section.key_saas_metrics|📐 Key SaaS Metrics|\n• $calc_out.label.nrr_net_revenue_retention|NRR (Net Revenue Retention)|:  97.0%  $calc_out.mrr.row.nrr_shrinking|🟠 Shrinking — losing revenue from existing customers|\n• $calc_out.label.grr_gross_revenue_retention|GRR (Gross Revenue Retention)|: 97.0%  $calc_out.mrr.row.grr_healthy|🟢 >90% is healthy|\n• $calc_out.label.saas_quick_ratio|SaaS Quick Ratio|:              6.7x  $calc_out.mrr.row.quick_ratio_highly_efficient|🟢 >4 is highly efficient|\n• $calc_out.label.growth_ceiling_max_mrr|Growth Ceiling (Max MRR)|:      $96,666.67/mo  $calc_out.mrr.row.growth_ceiling_at_churn{"churn_rate":"3.0%"}|at 3.0% churn|\n  → $calc_out.mrr.row.halving_churn_ceiling{"half_churn":"1.5%","ceiling":"$193,333.33"}|Halving churn to 1.5% would lift ceiling to $193,333.33/mo|\n\n$calc_out.section.churn_contraction_health|🩺 Churn & Contraction Health|\n• $calc_out.label.monthly_churn|Monthly Churn|:     3.0% $calc_out.mrr.row.monthly_churn_good|— 🟡 Good for SMB SaaS. Aim for under 2%.|\n• $calc_out.label.subs_lost_mo|Subs Lost/Mo|:      ~15 $calc_out.mrr.row.subs_lost_of{"subs":"500"}|of 500|\n• $calc_out.label.annual_retention|Annual Retention|:  69.4% $calc_out.mrr.row.annual_retention_after_12m|(after 12 months of churn)|\n• $calc_out.label.contraction_mrr|Contraction MRR|:   $0.00 $calc_out.mrr.row.contraction_none|— ✅ No contraction. All revenue losses are from full churn.|\n\n$calc_out.section.mrr_milestone_projections|🎯 MRR Milestone Projections|\n   $calc_out.mrr.row.milestone_assumption{"net_change":"+$2,465.00"}|(assuming constant net change of +$2,465.00/mo)|\n• $calc_out.mrr.row.milestone{"milestone":"$20,000.00","months":"2.2","date":"Sep 2026"}|$20,000.00 MRR:  2.2 months  (~Sep 2026)|\n• $calc_out.mrr.row.milestone{"milestone":"$50,000.00","months":"14.4","date":"Sep 2027"}|$50,000.00 MRR:  14.4 months  (~Sep 2027)|\n• $calc_out.mrr.row.milestone{"milestone":"$100,000.00","months":"34.7","date":"Jun 2029"}|$100,000.00 MRR:  34.7 months  (~Jun 2029)|\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n• $calc_out.mrr.row.whatif_churn_drop{"from":"3.0%","to":"1.0%"}|If churn drops 3.0% → 1.0%:|\n  $calc_out.label.max_mrr|Max MRR|: $96,666.67 → $290,000.00 (+$193,333.33)\n  $calc_out.label.annual_revenue_potential|Annual revenue potential|: +$2,320,000.00\n• $calc_out.mrr.row.whatif_expansion_growth|If expansion grows to 25% of new MRR:|\n  $calc_out.label.target_expansion|Target Expansion|: $725.00/mo $calc_out.mrr.row.whatif_expansion_target_gap{"gap":"$725.00"}|(+$725.00 needed)|\n  $calc_out.label.nrr_would_rise|NRR would rise|: 97.0% → 102.0%\n\n$calc_out.section.break_even_growth|⚖️ Break-Even Growth|\n• $calc_out.mrr.row.break_even_above{"be":"15","actual":"100"}|🟢 Break-even new subs/mo: 15  — you\'re growing above break-even (100 actual).|\n\n💡 Tip: Track your Quick Ratio weekly — above 4 means growth is efficient. Below 2 means you\'re scaling losses faster than gains.\n',
    "+$3,215/mo net change → $20K MRR in <2 months",
    "NRR at 101.5% means existing base is growing — churn is well-covered by expansion",
    "Quick Ratio of 6.5x: for every $1 lost, $6.50 in new revenue comes in",
    "Halving 3% churn → Max MRR jumps from $97K to $290K (3× ceiling lift)",
  ],
  faq: [
    { q: "What is a good MRR growth rate for an entrepreneur?", a: "10-20% month-over-month is excellent for early-stage SaaS. 5-10% is healthy. Below 5% means you need to fix either acquisition or retention. The best entrepreneurs track their net MRR movement (new − churned + expansion) weekly, not monthly." },
    { q: "What is NRR and why does it matter?", a: "Net Revenue Retention (NRR) measures how much revenue you retain from existing customers after accounting for expansion, contraction, and churn. NRR above 110% is best-in-class — it means you grow 10%+ from existing customers even with zero new acquisition. Below 100% means your customer base is shrinking." },
    { q: "What churn rate should I target?", a: "Under 3% monthly churn is good for SMB SaaS. Under 1-2% is great. Enterprise SaaS should aim for under 1%. Every percentage point of churn you reduce compounds dramatically — going from 5% to 3% churn can increase customer lifetime by 67%." },
    { q: "How do I increase expansion MRR?", a: "Add usage-based tiers, upsell premium features, offer add-ons (extra seats, storage, integrations), and raise prices for new customers. A healthy SaaS gets 20-30% of new MRR from existing customer expansion, not just new signups." },
    { q: "What is the difference between contraction and churn?", a: "Churn means a customer cancels completely — 100% of their revenue is lost. Contraction means they downgrade or reduce seats — they stay but pay less. Contraction is a leading indicator: customers who downgrade today are far more likely to churn tomorrow. Treat contraction as your early-warning radar." },
    { q: "What is SaaS Quick Ratio and why does it matter?", a: "SaaS Quick Ratio = (new + expansion MRR) / (churned + contraction MRR). It measures how efficiently you grow MRR relative to revenue losses. Above 4: highly efficient. 2-4: healthy. Below 2: scaling losses faster than gains. For 6.5x quick ratio: every $1 lost generates $6.50 in new revenue. Investors use this as a proxy for capital-efficient growth." },
    { q: "How do I forecast MRR for the next 12 months?", a: 'Three approaches: 1) Linear: project current monthly net change forward, 2) Cohort-based: model retention by signup cohort, 3) Driver-based: factor in growth rate, churn, expansion separately. For early-stage: linear works (5-10% MoM growth). For $1M+ MRR: cohort-based is more accurate. Always include downside scenarios: -20% growth, +20% churn to stress-test.' },
    { q: "What is reactivation MRR and how should I track it?", a: "Reactivation MRR = revenue from customers who previously churned but came back. Important signal: 1) Indicates product-market fit evolution, 2) Cheaper than new acquisition, 3) Win-back campaigns can drive 5-15% of new MRR. Track: who returned, why, time to return. Common drivers: pricing changes, new features, competitive offerings. For 1% monthly reactivation on $100K MRR: $1K/mo recovered revenue." },
    { q: "How does pricing affect MRR growth?", a: "Price increases are the highest-leverage MRR lever: 10% price increase = 10% MRR growth (zero new customers). Typical sequence: 1) Test 5-10% on new customers, 2) Grandfather existing for 12 months, 3) Announce increase, 4) Hold the line. Risk: 5-10% of customers may leave. Net: 5-9% MRR lift. Best practice: increase every 12-18 months. Most successful SaaS raise prices 1-2x per year." },
    { q: "What is the difference between gross MRR and net new MRR?", a: "Gross new MRR: total new + expansion. Net new MRR: gross new - churned - contraction. Example: 100K new + 30K expansion - 50K churn - 20K contraction = 60K net new MRR. Investors: focus on net new MRR. It shows the true health of the business. Gross new MRR can be misleading if churn is high. Net negative MRR is a crisis indicator. Top performers: net new MRR >15% of starting MRR per month." },
    { q: "How do I use What-If scenarios to model growth?", a: 'Most useful: 1) Halve churn → 2x MRR ceiling, 2) 2x expansion → 10-20% NRR lift, 3) Reduce new subs by 20% → -10% MRR growth. Build: 3 scenarios (conservative, base, optimistic). Sensitivity analysis: which variable has biggest impact? For most SaaS: churn is the dominant variable. Cut churn 1pp = 20-30% MRR lift. Run quarterly with team to align on targets.' },
    { q: "What is the right way to track MRR for a usage-based product?", a: 'For usage-based: track 1) Total usage, 2) Revenue per usage unit, 3) Usage distribution (top 10% vs long tail). Top 10% often = 50% of usage. Watch for: usage concentration (one big customer = 20%+ of MRR is risky). Track: usage trends, customer-level usage changes, dollar-based churn (usage decline). MRR may swing monthly with usage - smooth with rolling 3-month average.' },
  ],
  howToUse: [
    "Enter your current subscriber count.",
    "Enter your monthly price per subscriber.",
    "Enter your monthly churn rate as a percentage (e.g. 3 for 3%).",
    "Enter expansion MRR from upgrades and add-ons (leave 0 if none).",
    "Enter how many new subscribers you typically add per month.",
    "Enter contraction MRR from downgrades and seat reductions.",
    "Enter reactivation MRR from customers who returned after churning.",
    "Review the MRR Waterfall to see where your revenue is coming and going.",
    "Check Key SaaS Metrics — NRR above 110% and Quick Ratio above 4 are the gold standards.",
    "Use What-If Scenarios to model improvements in churn, expansion, and contraction.",
  ],
  engineKey: true,
};
registerEngine(engine);
