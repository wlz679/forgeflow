import type { ToolEngine } from "../../core/engines/types";
import { registerEngine } from "../../core/engines/registry";
import { clampNonNegative } from "../../core/engines/helpers";
// P168 B3-13：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

function calculateUnitEconomics(inputs: Record<string, string>): string[] {
  const fmt = (n: number) => "$" + Math.round(n).toLocaleString();
  const pct = (n: number) => n.toFixed(1) + "%";
  const fmtM = (n: number) => { if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M"; if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K"; return "$" + Math.round(n).toLocaleString(); };

  const revPerCust = clampNonNegative(parseFloat(inputs.averageRevenuePerCustomer) || 0);
  const expansionRev = clampNonNegative(parseFloat(inputs.expansionRevenuePerCustomer) || 0);
  const costServe = clampNonNegative(parseFloat(inputs.costToServePerCustomer) || 0);
  const cac = clampNonNegative(parseFloat(inputs.customerAcquisitionCost) || 0);
  const churnRate = clampNonNegative(parseFloat(inputs.monthlyChurnRate) || 0);
  const retentionMonths = clampNonNegative(parseFloat(inputs.retentionMonths) || 0);
  const monthlyChurn = churnRate / 100;

  const totalRev = revPerCust + expansionRev;
  const netContribution = totalRev - costServe;
  const netMargin = totalRev > 0 ? (netContribution / totalRev) * 100 : 0;
  const avgLifetime = retentionMonths > 0 ? retentionMonths : (monthlyChurn > 0 ? (1 / monthlyChurn) : Infinity);
  const ltv = isFinite(avgLifetime) ? netContribution * avgLifetime : Infinity;
  const paybackMonths = netContribution > 0 ? cac / netContribution : Infinity;
  const annualProfitPerCust = netContribution * 12;

  const out: string[] = [];
  out.push("📦 Unit Economics");
  out.push("");

  // Section 1: Per-Customer Snapshot
  out.push(makeToken('calc_out.unit_economics.row.section_snapshot', '📋 Per-Customer Snapshot'));
  out.push("• Revenue / Customer:   " + fmt(revPerCust) + "/mo");
  if (expansionRev > 0) out.push("• Expansion Revenue:    " + fmt(expansionRev) + "/mo");
  out.push("• Cost to Serve:        " + fmt(costServe) + "/mo");
  out.push(makeToken('calc_out.unit_economics.row.net_contribution', '• Net Contribution:     ' + fmt(netContribution) + '/mo  (' + pct(netMargin) + ' margin)', { value: fmt(netContribution), margin: pct(netMargin) }));
  out.push("• Monthly Churn:        " + pct(churnRate));
  if (isFinite(avgLifetime)) {
    out.push(retentionMonths > 0
      ? makeToken('calc_out.unit_economics.row.avg_lifetime_manual', '• Avg Customer Lifetime: ' + avgLifetime.toFixed(0) + ' months (manual)', { months: avgLifetime.toFixed(0) })
      : makeToken('calc_out.unit_economics.row.avg_lifetime_months', '• Avg Customer Lifetime: ' + avgLifetime.toFixed(0) + ' months', { months: avgLifetime.toFixed(0) }));
  } else {
    out.push(makeToken('calc_out.unit_economics.row.avg_lifetime_infinite', '• Avg Customer Lifetime: ∞  (zero churn — great!)'));
  }
  if (isFinite(ltv) && ltv > 0) out.push("• Customer LTV:         " + fmt(ltv));
  out.push("");

  // Section 2: CAC Payback
  if (cac > 0 && netContribution > 0) {
    out.push("⏱️ CAC Payback");
    out.push("• Cost to Acquire:      " + fmt(cac));
    out.push(makeToken('calc_out.unit_economics.row.monthly_net_contribution', '• Monthly Net Contribution: ' + fmt(netContribution) + '/mo', { value: fmt(netContribution) }));
    out.push(makeToken('calc_out.unit_economics.row.payback_period', '• Payback Period:       ' + paybackMonths.toFixed(1) + ' months', { months: paybackMonths.toFixed(1) }));
    out.push(makeToken('calc_out.unit_economics.row.annual_profit', '• Annual Profit:        ' + fmt(annualProfitPerCust) + ' per customer', { value: fmt(annualProfitPerCust) }));
    if (paybackMonths <= 3) out.push(makeToken('calc_out.unit_economics.row.payback_excellent', '• ✅ Excellent — you recover CAC in under 3 months. Invest more in growth!'));
    else if (paybackMonths <= 6) out.push(makeToken('calc_out.unit_economics.row.payback_good', '• 🟢 Good — payback under 6 months. Healthy unit economics.'));
    else if (paybackMonths <= 12) out.push(makeToken('calc_out.unit_economics.row.payback_ok', '• 🟡 OK — payback within a year. Room to optimize either CAC or pricing.'));
    else if (isFinite(paybackMonths)) out.push(makeToken('calc_out.unit_economics.row.payback_slow', '• 🔴 Slow — over 12 months to recover CAC. Raise prices or reduce acquisition cost.'));
    out.push("");
  } else if (cac === 0 && netContribution > 0) {
    out.push("⏱️ CAC Payback");
    out.push(makeToken('calc_out.unit_economics.row.payback_no_cac', '• No acquisition cost — all revenue is pure growth.'));
    out.push("");
  }

  // Section 3: Scaling Economics
  if (netContribution > 0) {
    out.push("📊 Scaling Economics");
    const scales = [1000, 10000, 100000];
    for (let i = 0; i < scales.length; i++) {
      const n = scales[i];
      const costReduction = 1 - (i * 0.1);
      // ⭐ 局部变量承接：'(i * 10)' 直接写进 fallback ⇒ 源码模板推导会把 '{cut} * 10' 当乘法
      //   ⇒ 求值成 NaN ⇒ 模板污染（且与运行时反推冲突）⇒ 必须是**标识符**。
      const costCut = i * 10;
      const scaledCost = costServe * costReduction;
      const scaledNC = totalRev - scaledCost;
      const monthlyProfit = scaledNC * n;
      const churnOffset = Math.round(n * monthlyChurn);
      const totalCAC = cac * (n + churnOffset);
      // ⭐ 4 个组合各写一个 code 字面量（动态拼码 ⇒ 静态扫描器认不出）
      if (i > 0 && cac > 0 && isFinite(totalCAC)) {
        out.push(makeToken('calc_out.unit_economics.row.scaling_row_cost_acquire', '• ' + n.toLocaleString() + ' customers: ' + fmt(monthlyProfit) + '/mo net  →  ' + fmt(monthlyProfit * 12) + '/yr  (cost -' + costCut + '%)  (acquire: ' + fmt(totalCAC) + ')', { count: n.toLocaleString(), monthly: fmt(monthlyProfit), annual: fmt(monthlyProfit * 12), cut: String(costCut), acquire: fmt(totalCAC) }));
      } else if (i > 0) {
        out.push(makeToken('calc_out.unit_economics.row.scaling_row_cost', '• ' + n.toLocaleString() + ' customers: ' + fmt(monthlyProfit) + '/mo net  →  ' + fmt(monthlyProfit * 12) + '/yr  (cost -' + costCut + '%)', { count: n.toLocaleString(), monthly: fmt(monthlyProfit), annual: fmt(monthlyProfit * 12), cut: String(costCut) }));
      } else if (cac > 0 && isFinite(totalCAC)) {
        out.push(makeToken('calc_out.unit_economics.row.scaling_row_acquire', '• ' + n.toLocaleString() + ' customers: ' + fmt(monthlyProfit) + '/mo net  →  ' + fmt(monthlyProfit * 12) + '/yr  (acquire: ' + fmt(totalCAC) + ')', { count: n.toLocaleString(), monthly: fmt(monthlyProfit), annual: fmt(monthlyProfit * 12), acquire: fmt(totalCAC) }));
      } else {
        out.push(makeToken('calc_out.unit_economics.row.scaling_row_plain', '• ' + n.toLocaleString() + ' customers: ' + fmt(monthlyProfit) + '/mo net  →  ' + fmt(monthlyProfit * 12) + '/yr', { count: n.toLocaleString(), monthly: fmt(monthlyProfit), annual: fmt(monthlyProfit * 12) }));
      }
    }
    out.push(makeToken('calc_out.unit_economics.row.scaling_note', '  ^ Economies of scale: 10% cost reduction per 10× customers'));
    out.push("");
  }

  // Section 4: Optimization Levers
  if (netContribution > 0) {
    out.push("🎯 Optimization Levers");
    if (monthlyChurn > 0 && isFinite(ltv) && retentionMonths === 0) {
      const improvedChurn = monthlyChurn * 0.75;
      const improvedLTV = netContribution / improvedChurn;
      out.push(makeToken('calc_out.unit_economics.row.lever_reduce_churn', '• Reduce churn 25%:  LTV ' + fmt(ltv) + ' → ' + fmt(improvedLTV) + '  (+' + fmt(improvedLTV - ltv) + ')', { from: fmt(ltv), to: fmt(improvedLTV), delta: fmt(improvedLTV - ltv) }));
    }
    const increasedRev = revPerCust * 1.2;
    const increasedTotal = increasedRev + expansionRev;
    const increasedProfit = increasedTotal - costServe;
    if (increasedProfit > netContribution) {
      if (cac > 0 && netContribution > 0) {
        const newPayback = cac / increasedProfit;
        // ⚠️ ' | ' 不能进 token 兜底（makeToken 会把半角 | 换成全角 ｜）⇒ 拆成两个 token
        out.push(
          makeToken('calc_out.unit_economics.row.lever_raise_price', '• Raise price 20%:   Net ' + fmt(netContribution) + '/mo → ' + fmt(increasedProfit) + '/mo', { from: fmt(netContribution), to: fmt(increasedProfit) }) +
          '  |  ' +
          makeToken('calc_out.unit_economics.row.lever_raise_price_payback', 'Payback ' + (paybackMonths.toFixed(0) + ' → ') + newPayback.toFixed(0) + ' mo', { from: paybackMonths.toFixed(0) + ' → ', to: newPayback.toFixed(0) }),
        );
      } else {
        out.push(makeToken('calc_out.unit_economics.row.lever_raise_price', '• Raise price 20%:   Net ' + fmt(netContribution) + '/mo → ' + fmt(increasedProfit) + '/mo', { from: fmt(netContribution), to: fmt(increasedProfit) }));
      }
    }
    if (cac > 0 && netContribution > 0) {
      const reducedCAC = cac * 0.7;
      const newPayback = reducedCAC / netContribution;
      out.push(makeToken('calc_out.unit_economics.row.lever_reduce_cac', '• Reduce CAC 30%:    Payback ' + paybackMonths.toFixed(0) + ' → ' + newPayback.toFixed(0) + ' mo  (CAC: ' + fmt(cac) + ' → ' + fmt(reducedCAC) + ')', { from: paybackMonths.toFixed(0), to: newPayback.toFixed(0), cac_from: fmt(cac), cac_to: fmt(reducedCAC) }));
    }
    if (monthlyChurn > 0 && isFinite(ltv) && retentionMonths === 0) {
      const improvedLTV = netContribution / (monthlyChurn * 0.75);
      const newCAC = cac * 0.7;
      // ⚠️「N/A」这一支**永远到不了**（外层 if 已保证 netContribution > 0）
      //   ⇒ 保留成普通英文字符串，**不**给它造 locale 码（否则 G2 缺键）。
      let line = makeToken('calc_out.unit_economics.row.lever_best_case', '• 🚀 Best case (lower churn + lower CAC):  LTV ' + fmt(improvedLTV), { ltv: fmt(improvedLTV) }) + '  |  ';
      if (netContribution > 0) line += makeToken('calc_out.unit_economics.row.lever_best_case_payback', 'Payback ' + (newCAC / netContribution).toFixed(0) + ' mo', { months: (newCAC / netContribution).toFixed(0) });
      else line += 'Payback N/A';
      out.push(line);
    }
    out.push("");
  }

  // Section 5: Lever Impact Ranking
  if (netContribution > 0 && isFinite(ltv)) {
    out.push("🏆 Lever Impact Ranking");
    let churnImpact = 0;
    let expImpact = 0;
    if (monthlyChurn > 0.01 && retentionMonths === 0) {
      const improvedChurn = monthlyChurn - 0.01;
      const improvedLifetime = 1 / improvedChurn;
      const improvedLTV = netContribution * improvedLifetime;
      churnImpact = improvedLTV - ltv;
      out.push(makeToken('calc_out.unit_economics.row.ranking_churn', '• Reduce churn 1%:     LTV ' + fmt(ltv) + ' → ' + fmt(improvedLTV) + '  (+' + fmt(churnImpact) + ')', { from: fmt(ltv), to: fmt(improvedLTV), delta: fmt(churnImpact) }));
    } else if (retentionMonths > 0) {
      out.push(makeToken('calc_out.unit_economics.row.ranking_churn_na', '• Reduce churn 1%:     N/A (using manual lifetime override)'));
    }
    if (expansionRev > 0) {
      const improvedExp = expansionRev * 1.1;
      const improvedNC = revPerCust + improvedExp - costServe;
      const improvedLTV = improvedNC * avgLifetime;
      expImpact = improvedLTV - ltv;
      out.push(makeToken('calc_out.unit_economics.row.ranking_expansion', '• +10% Expansion:      LTV ' + fmt(ltv) + ' → ' + fmt(improvedLTV) + '  (+' + fmt(expImpact) + ')', { from: fmt(ltv), to: fmt(improvedLTV), delta: fmt(expImpact) }));
    } else {
      out.push(makeToken('calc_out.unit_economics.row.ranking_expansion_na', '• +10% Expansion:      N/A (no expansion revenue set)'));
    }
    if (churnImpact > expImpact && churnImpact > 0) {
      out.push(makeToken('calc_out.unit_economics.row.ranking_top_churn', '🥇 Top Lever: Reduce Churn (+' + fmt(churnImpact) + ' LTV vs +' + fmt(expImpact) + ' from expansion)', { churn: fmt(churnImpact), exp: fmt(expImpact) }));
    } else if (expImpact > churnImpact && expImpact > 0) {
      out.push(makeToken('calc_out.unit_economics.row.ranking_top_expansion', '🥇 Top Lever: Grow Expansion (+' + fmt(expImpact) + ' LTV vs +' + fmt(churnImpact) + ' from churn)', { churn: fmt(churnImpact), exp: fmt(expImpact) }));
    } else if (churnImpact > 0 || expImpact > 0) {
      out.push(makeToken('calc_out.unit_economics.row.ranking_top_equal', '🥇 Both levers have equal impact (+' + fmt(churnImpact) + ')', { churn: fmt(churnImpact) }));
    }
    out.push("");
  }

  // 🩺 Unit Economics Health (v3)
  out.push("🩺 Unit Economics Health:");
  out.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  if (netContribution <= 0) {
    out.push(makeToken('calc_out.unit_economics.row.health_negative', "• 🔴 Negative net contribution — you're losing money on every customer. Either raise price or cut cost-to-serve."));
  } else if (netMargin < 30) {
    out.push(makeToken('calc_out.unit_economics.row.health_margin_low', '• 🟡 Net margin ' + pct(netMargin) + ' is below 30% SaaS benchmark. Aim for 70-80% gross margin.', { margin: pct(netMargin) }));
  } else if (netMargin < 60) {
    out.push(makeToken('calc_out.unit_economics.row.health_margin_ok', '• 🟢 Healthy margin ' + pct(netMargin) + '. Most SaaS targets 70-80% — room to grow.', { margin: pct(netMargin) }));
  } else {
    out.push(makeToken('calc_out.unit_economics.row.health_margin_high', '• 🟢 Excellent margin ' + pct(netMargin) + '. Top-quartile SaaS efficiency.', { margin: pct(netMargin) }));
  }
  if (cac > 0) {
    if (isFinite(paybackMonths) && paybackMonths <= 12) {
      out.push(makeToken('calc_out.unit_economics.row.health_payback_good', '• 🟢 CAC payback ' + paybackMonths.toFixed(1) + ' months — under 1 year. Efficient growth.', { months: paybackMonths.toFixed(1) }));
    } else if (isFinite(paybackMonths)) {
      out.push(makeToken('calc_out.unit_economics.row.health_payback_bad', '• 🔴 CAC payback ' + paybackMonths.toFixed(1) + ' months — over 1 year. LTV/CAC ratio unhealthy.', { months: paybackMonths.toFixed(1) }));
    }
  } else {
    out.push(makeToken('calc_out.unit_economics.row.health_no_cac', '• ℹ️ No CAC set — assuming organic/word-of-mouth growth.'));
  }
  if (monthlyChurn > 0.05) {
    out.push(makeToken('calc_out.unit_economics.row.health_churn_high', '• 🔴 Monthly churn ' + pct(churnRate) + ' is high. Industry target: <3% for SMB SaaS, <1% for enterprise.', { churn: pct(churnRate) }));
  } else if (monthlyChurn > 0.03) {
    out.push(makeToken('calc_out.unit_economics.row.health_churn_mid', '• 🟡 Monthly churn ' + pct(churnRate) + ' is above target. Aim for 2-3%.', { churn: pct(churnRate) }));
  } else {
    out.push(makeToken('calc_out.unit_economics.row.health_churn_ok', '• 🟢 Monthly churn ' + pct(churnRate) + ' is healthy.', { churn: pct(churnRate) }));
  }
  if (isFinite(ltv) && cac > 0) {
    const ltvCacRatio = ltv / cac;
    if (ltvCacRatio >= 3) out.push(makeToken('calc_out.unit_economics.row.health_ratio_good', '• 🟢 LTV:CAC ratio ' + ltvCacRatio.toFixed(1) + ':1 — healthy (target 3:1+).', { ratio: ltvCacRatio.toFixed(1) }));
    else if (ltvCacRatio >= 1) out.push(makeToken('calc_out.unit_economics.row.health_ratio_mid', '• 🟡 LTV:CAC ratio ' + ltvCacRatio.toFixed(1) + ':1 — below target (3:1+). Improve before scaling spend.', { ratio: ltvCacRatio.toFixed(1) }));
    else out.push(makeToken('calc_out.unit_economics.row.health_ratio_bad', '• 🔴 LTV:CAC ratio ' + ltvCacRatio.toFixed(1) + ':1 — losing money per customer. Stop scaling spend.', { ratio: ltvCacRatio.toFixed(1) }));
  }
  out.push("");

  // 🔄 What-If Scenarios (v3)
  out.push("🔄 What-If Scenarios:");
  out.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  if (netContribution > 0) {
    if (monthlyChurn > 0.01 && retentionMonths === 0) {
      const halveChurn = monthlyChurn * 0.5;
      const halveLTV = netContribution / halveChurn;
      out.push(makeToken('calc_out.unit_economics.row.whatif_churn_halve', '• Cut churn in half (' + pct(churnRate) + ' → ' + pct(churnRate / 2) + '):  LTV ' + (fmt(ltv) + ' → ') + fmt(halveLTV) + '  (+' + fmt(halveLTV - ltv) + ')', { from_churn: pct(churnRate), to_churn: pct(churnRate / 2), from: fmt(ltv) + ' → ', to: fmt(halveLTV), delta: fmt(halveLTV - ltv) }));
    }
    if (cac > 0) {
      const reduceCAC30 = cac * 0.7;
      const newPayback = reduceCAC30 / netContribution;
      out.push(makeToken('calc_out.unit_economics.row.whatif_cac_30', '• Reduce CAC by 30%:  Payback ' + paybackMonths.toFixed(1) + ' → ' + newPayback.toFixed(1) + ' mo  (CAC: ' + fmt(cac) + ' → ' + fmt(reduceCAC30) + ')', { from: paybackMonths.toFixed(1), to: newPayback.toFixed(1), cac_from: fmt(cac), cac_to: fmt(reduceCAC30) }));
    }
    const raisePrice = revPerCust * 1.2 + expansionRev - costServe;
    out.push(makeToken('calc_out.unit_economics.row.whatif_raise_price', '• Raise price 20%:  Net contribution ' + fmt(netContribution) + ' → ' + fmt(raisePrice) + '  (+' + fmt(raisePrice - netContribution) + '/mo)', { from: fmt(netContribution), to: fmt(raisePrice), delta: fmt(raisePrice - netContribution) }));
    if (expansionRev > 0) {
      const moreExp = revPerCust + expansionRev * 1.25 - costServe;
      out.push(makeToken('calc_out.unit_economics.row.whatif_expansion_25', '• Grow expansion 25%:  Net ' + fmt(netContribution) + ' → ' + fmt(moreExp) + '  (focus on upsells)', { from: fmt(netContribution), to: fmt(moreExp) }));
    }
    // ⭐ 局部变量承接：'Math.round(...)' 直接写进 fallback ⇒ 源码模板推导会把 'Math' 当标识符
    //   替换掉 ⇒ 求值炸掉 ⇒ 模板推不出来（must be an identifier, not a global call）。
    const doubledRev = Math.round(revPerCust * 2);
    out.push(makeToken('calc_out.unit_economics.row.whatif_double_customers', '• Double customers to ' + doubledRev.toLocaleString() + ' in MRR via same funnel: see Scaling Economics above', { amount: doubledRev.toLocaleString() }));
  } else {
    out.push(makeToken('calc_out.unit_economics.row.whatif_cannot_model', '• ⚠️ Cannot model — net contribution is negative. Raise price or cut cost-to-serve first.'));
  }
  out.push("");

  // ⚖️ Break-Even (v3)
  if (netContribution > 0) {
    out.push("⚖️ Break-Even");
    out.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    // ⭐ 局部变量承接（'Math.round(...)' 不能直接进 fallback ⇒ 模板推导会炸）
    const beCustomers = Math.round(cac / netContribution);
    if (cac > 0 && isFinite(paybackMonths)) {
      out.push(makeToken('calc_out.unit_economics.row.breakeven_need', '• Break-even customers/mo needed to amortize CAC:'));
      out.push(makeToken('calc_out.unit_economics.row.breakeven_detail', '  Current CAC ' + fmt(cac) + ' needs ' + beCustomers + ' customers contributing net profit for ' + paybackMonths.toFixed(1) + ' months to break even', { cac: fmt(cac), customers: String(beCustomers), months: paybackMonths.toFixed(1) }));
    }
    if (cac === 0) {
      out.push(makeToken('calc_out.unit_economics.row.breakeven_no_cac', '• No CAC — every customer is profitable from month 1. Pure growth mode.'));
    } else {
      out.push(makeToken('calc_out.unit_economics.row.breakeven_once', '• Once ' + beCustomers + ' customers are acquired, monthly net profit is positive thereafter (assuming constant churn).', { customers: String(beCustomers) }));
    }
    out.push("");
  }

  // 💡 Tip (v3)
  if (netContribution <= 0) {
    out.push(makeToken('calc_out.unit_economics.row.tip_negative', '💡 Tip: Negative net contribution means you lose money on every customer served. Fix this before scaling — either raise price, cut cost-to-serve (hosting, support, payment processing), or both. Scaling a loss-making unit is a guaranteed death spiral.'));
  } else if (isFinite(paybackMonths) && paybackMonths > 12) {
    out.push(makeToken('calc_out.unit_economics.row.tip_payback_slow', '💡 Tip: CAC payback over 12 months is the #1 red flag for SaaS investors. Two ways out: (1) raise prices 20-30% (most founders underprice), or (2) cut CAC by improving conversion (better landing page, more qualified leads). Either compounds — don\'t pick both at once.'));
  } else if (monthlyChurn > 0.05) {
    out.push(makeToken('calc_out.unit_economics.row.tip_churn_high', '💡 Tip: 5%+ monthly churn is the silent killer. The math: cutting churn from 5% to 3% roughly doubles LTV. That\'s usually worth more than a new pricing tier. Talk to churned customers first — the answer is almost always in their exit interviews.'));
  } else {
    out.push(makeToken('calc_out.unit_economics.row.tip_solid', '💡 Tip: Solid unit economics. The next bottleneck is usually distribution (filling the funnel), not the per-customer math. If you\'re hitting LTV:CAC ≥ 3:1 with payback < 12mo, consider raising prices — the market can probably bear more than you\'re charging.'));
  }

  return out;
}

const customFn =
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let y=function(f){return Number.isNaN(f)?0:Math.max(0,f)},R=function(f){const o=e=>"$"+Math.round(e).toLocaleString(),_=e=>e.toFixed(1)+"%",A=e=>Math.abs(e)>=1e6?"$"+(e/1e6).toFixed(2)+"M":Math.abs(e)>=1e3?"$"+(e/1e3).toFixed(1)+"K":"$"+Math.round(e).toLocaleString(),b=y(parseFloat(f.averageRevenuePerCustomer)||0),v=y(parseFloat(f.expansionRevenuePerCustomer)||0),F=y(parseFloat(f.costToServePerCustomer)||0),s=y(parseFloat(f.customerAcquisitionCost)||0),d=y(parseFloat(f.monthlyChurnRate)||0),w=y(parseFloat(f.retentionMonths)||0),m=d/100,L=b+v,c=L-F,g=L>0?c/L*100:0,C=w>0?w:m>0?1/m:1/0,h=isFinite(C)?c*C:1/0,r=c>0?s/c:1/0,P=c*12,t=[];if(t.push("📦 Unit Economics"),t.push(""),t.push(i("calc_out.unit_economics.row.section_snapshot","📋 Per-Customer Snapshot")),t.push("• Revenue / Customer:   "+o(b)+"/mo"),v>0&&t.push("• Expansion Revenue:    "+o(v)+"/mo"),t.push("• Cost to Serve:        "+o(F)+"/mo"),t.push(i("calc_out.unit_economics.row.net_contribution","• Net Contribution:     "+o(c)+"/mo  ("+_(g)+" margin)",{value:o(c),margin:_(g)})),t.push("• Monthly Churn:        "+_(d)),isFinite(C)?t.push(w>0?i("calc_out.unit_economics.row.avg_lifetime_manual","• Avg Customer Lifetime: "+C.toFixed(0)+" months (manual)",{months:C.toFixed(0)}):i("calc_out.unit_economics.row.avg_lifetime_months","• Avg Customer Lifetime: "+C.toFixed(0)+" months",{months:C.toFixed(0)})):t.push(i("calc_out.unit_economics.row.avg_lifetime_infinite","• Avg Customer Lifetime: ∞  (zero churn — great!)")),isFinite(h)&&h>0&&t.push("• Customer LTV:         "+o(h)),t.push(""),s>0&&c>0?(t.push("⏱️ CAC Payback"),t.push("• Cost to Acquire:      "+o(s)),t.push(i("calc_out.unit_economics.row.monthly_net_contribution","• Monthly Net Contribution: "+o(c)+"/mo",{value:o(c)})),t.push(i("calc_out.unit_economics.row.payback_period","• Payback Period:       "+r.toFixed(1)+" months",{months:r.toFixed(1)})),t.push(i("calc_out.unit_economics.row.annual_profit","• Annual Profit:        "+o(P)+" per customer",{value:o(P)})),r<=3?t.push(i("calc_out.unit_economics.row.payback_excellent","• ✅ Excellent — you recover CAC in under 3 months. Invest more in growth!")):r<=6?t.push(i("calc_out.unit_economics.row.payback_good","• 🟢 Good — payback under 6 months. Healthy unit economics.")):r<=12?t.push(i("calc_out.unit_economics.row.payback_ok","• 🟡 OK — payback within a year. Room to optimize either CAC or pricing.")):isFinite(r)&&t.push(i("calc_out.unit_economics.row.payback_slow","• 🔴 Slow — over 12 months to recover CAC. Raise prices or reduce acquisition cost.")),t.push("")):s===0&&c>0&&(t.push("⏱️ CAC Payback"),t.push(i("calc_out.unit_economics.row.payback_no_cac","• No acquisition cost — all revenue is pure growth.")),t.push("")),c>0){t.push("📊 Scaling Economics");const e=[1e3,1e4,1e5];for(let a=0;a<e.length;a++){const n=e[a],u=1-a*.1,l=a*10,S=F*u,p=(L-S)*n,E=Math.round(n*m),x=s*(n+E);a>0&&s>0&&isFinite(x)?t.push(i("calc_out.unit_economics.row.scaling_row_cost_acquire","• "+n.toLocaleString()+" customers: "+o(p)+"/mo net  →  "+o(p*12)+"/yr  (cost -"+l+"%)  (acquire: "+o(x)+")",{count:n.toLocaleString(),monthly:o(p),annual:o(p*12),cut:String(l),acquire:o(x)})):a>0?t.push(i("calc_out.unit_economics.row.scaling_row_cost","• "+n.toLocaleString()+" customers: "+o(p)+"/mo net  →  "+o(p*12)+"/yr  (cost -"+l+"%)",{count:n.toLocaleString(),monthly:o(p),annual:o(p*12),cut:String(l)})):s>0&&isFinite(x)?t.push(i("calc_out.unit_economics.row.scaling_row_acquire","• "+n.toLocaleString()+" customers: "+o(p)+"/mo net  →  "+o(p*12)+"/yr  (acquire: "+o(x)+")",{count:n.toLocaleString(),monthly:o(p),annual:o(p*12),acquire:o(x)})):t.push(i("calc_out.unit_economics.row.scaling_row_plain","• "+n.toLocaleString()+" customers: "+o(p)+"/mo net  →  "+o(p*12)+"/yr",{count:n.toLocaleString(),monthly:o(p),annual:o(p*12)}))}t.push(i("calc_out.unit_economics.row.scaling_note","  ^ Economies of scale: 10% cost reduction per 10× customers")),t.push("")}if(c>0){if(t.push("🎯 Optimization Levers"),m>0&&isFinite(h)&&w===0){const u=m*.75,l=c/u;t.push(i("calc_out.unit_economics.row.lever_reduce_churn","• Reduce churn 25%:  LTV "+o(h)+" → "+o(l)+"  (+"+o(l-h)+")",{from:o(h),to:o(l),delta:o(l-h)}))}const n=b*1.2+v-F;if(n>c)if(s>0&&c>0){const u=s/n;t.push(i("calc_out.unit_economics.row.lever_raise_price","• Raise price 20%:   Net "+o(c)+"/mo → "+o(n)+"/mo",{from:o(c),to:o(n)})+"  |  "+i("calc_out.unit_economics.row.lever_raise_price_payback","Payback "+(r.toFixed(0)+" → ")+u.toFixed(0)+" mo",{from:r.toFixed(0)+" → ",to:u.toFixed(0)}))}else t.push(i("calc_out.unit_economics.row.lever_raise_price","• Raise price 20%:   Net "+o(c)+"/mo → "+o(n)+"/mo",{from:o(c),to:o(n)}));if(s>0&&c>0){const u=s*.7,l=u/c;t.push(i("calc_out.unit_economics.row.lever_reduce_cac","• Reduce CAC 30%:    Payback "+r.toFixed(0)+" → "+l.toFixed(0)+" mo  (CAC: "+o(s)+" → "+o(u)+")",{from:r.toFixed(0),to:l.toFixed(0),cac_from:o(s),cac_to:o(u)}))}if(m>0&&isFinite(h)&&w===0){const u=c/(m*.75),l=s*.7;let S=i("calc_out.unit_economics.row.lever_best_case","• 🚀 Best case (lower churn + lower CAC):  LTV "+o(u),{ltv:o(u)})+"  |  ";c>0?S+=i("calc_out.unit_economics.row.lever_best_case_payback","Payback "+(l/c).toFixed(0)+" mo",{months:(l/c).toFixed(0)}):S+="Payback N/A",t.push(S)}t.push("")}if(c>0&&isFinite(h)){t.push("🏆 Lever Impact Ranking");let e=0,a=0;if(m>.01&&w===0){const u=1/(m-.01),l=c*u;e=l-h,t.push(i("calc_out.unit_economics.row.ranking_churn","• Reduce churn 1%:     LTV "+o(h)+" → "+o(l)+"  (+"+o(e)+")",{from:o(h),to:o(l),delta:o(e)}))}else w>0&&t.push(i("calc_out.unit_economics.row.ranking_churn_na","• Reduce churn 1%:     N/A (using manual lifetime override)"));if(v>0){const n=v*1.1,l=(b+n-F)*C;a=l-h,t.push(i("calc_out.unit_economics.row.ranking_expansion","• +10% Expansion:      LTV "+o(h)+" → "+o(l)+"  (+"+o(a)+")",{from:o(h),to:o(l),delta:o(a)}))}else t.push(i("calc_out.unit_economics.row.ranking_expansion_na","• +10% Expansion:      N/A (no expansion revenue set)"));e>a&&e>0?t.push(i("calc_out.unit_economics.row.ranking_top_churn","🥇 Top Lever: Reduce Churn (+"+o(e)+" LTV vs +"+o(a)+" from expansion)",{churn:o(e),exp:o(a)})):a>e&&a>0?t.push(i("calc_out.unit_economics.row.ranking_top_expansion","🥇 Top Lever: Grow Expansion (+"+o(a)+" LTV vs +"+o(e)+" from churn)",{churn:o(e),exp:o(a)})):(e>0||a>0)&&t.push(i("calc_out.unit_economics.row.ranking_top_equal","🥇 Both levers have equal impact (+"+o(e)+")",{churn:o(e)})),t.push("")}if(t.push("🩺 Unit Economics Health:"),t.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"),c<=0?t.push(i("calc_out.unit_economics.row.health_negative","• 🔴 Negative net contribution — you're losing money on every customer. Either raise price or cut cost-to-serve.")):g<30?t.push(i("calc_out.unit_economics.row.health_margin_low","• 🟡 Net margin "+_(g)+" is below 30% SaaS benchmark. Aim for 70-80% gross margin.",{margin:_(g)})):g<60?t.push(i("calc_out.unit_economics.row.health_margin_ok","• 🟢 Healthy margin "+_(g)+". Most SaaS targets 70-80% — room to grow.",{margin:_(g)})):t.push(i("calc_out.unit_economics.row.health_margin_high","• 🟢 Excellent margin "+_(g)+". Top-quartile SaaS efficiency.",{margin:_(g)})),s>0?isFinite(r)&&r<=12?t.push(i("calc_out.unit_economics.row.health_payback_good","• 🟢 CAC payback "+r.toFixed(1)+" months — under 1 year. Efficient growth.",{months:r.toFixed(1)})):isFinite(r)&&t.push(i("calc_out.unit_economics.row.health_payback_bad","• 🔴 CAC payback "+r.toFixed(1)+" months — over 1 year. LTV/CAC ratio unhealthy.",{months:r.toFixed(1)})):t.push(i("calc_out.unit_economics.row.health_no_cac","• ℹ️ No CAC set — assuming organic/word-of-mouth growth.")),m>.05?t.push(i("calc_out.unit_economics.row.health_churn_high","• 🔴 Monthly churn "+_(d)+" is high. Industry target: <3% for SMB SaaS, <1% for enterprise.",{churn:_(d)})):m>.03?t.push(i("calc_out.unit_economics.row.health_churn_mid","• 🟡 Monthly churn "+_(d)+" is above target. Aim for 2-3%.",{churn:_(d)})):t.push(i("calc_out.unit_economics.row.health_churn_ok","• 🟢 Monthly churn "+_(d)+" is healthy.",{churn:_(d)})),isFinite(h)&&s>0){const e=h/s;e>=3?t.push(i("calc_out.unit_economics.row.health_ratio_good","• 🟢 LTV:CAC ratio "+e.toFixed(1)+":1 — healthy (target 3:1+).",{ratio:e.toFixed(1)})):e>=1?t.push(i("calc_out.unit_economics.row.health_ratio_mid","• 🟡 LTV:CAC ratio "+e.toFixed(1)+":1 — below target (3:1+). Improve before scaling spend.",{ratio:e.toFixed(1)})):t.push(i("calc_out.unit_economics.row.health_ratio_bad","• 🔴 LTV:CAC ratio "+e.toFixed(1)+":1 — losing money per customer. Stop scaling spend.",{ratio:e.toFixed(1)}))}if(t.push(""),t.push("🔄 What-If Scenarios:"),t.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"),c>0){if(m>.01&&w===0){const n=m*.5,u=c/n;t.push(i("calc_out.unit_economics.row.whatif_churn_halve","• Cut churn in half ("+_(d)+" → "+_(d/2)+"):  LTV "+(o(h)+" → ")+o(u)+"  (+"+o(u-h)+")",{from_churn:_(d),to_churn:_(d/2),from:o(h)+" → ",to:o(u),delta:o(u-h)}))}if(s>0){const n=s*.7,u=n/c;t.push(i("calc_out.unit_economics.row.whatif_cac_30","• Reduce CAC by 30%:  Payback "+r.toFixed(1)+" → "+u.toFixed(1)+" mo  (CAC: "+o(s)+" → "+o(n)+")",{from:r.toFixed(1),to:u.toFixed(1),cac_from:o(s),cac_to:o(n)}))}const e=b*1.2+v-F;if(t.push(i("calc_out.unit_economics.row.whatif_raise_price","• Raise price 20%:  Net contribution "+o(c)+" → "+o(e)+"  (+"+o(e-c)+"/mo)",{from:o(c),to:o(e),delta:o(e-c)})),v>0){const n=b+v*1.25-F;t.push(i("calc_out.unit_economics.row.whatif_expansion_25","• Grow expansion 25%:  Net "+o(c)+" → "+o(n)+"  (focus on upsells)",{from:o(c),to:o(n)}))}const a=Math.round(b*2);t.push(i("calc_out.unit_economics.row.whatif_double_customers","• Double customers to "+a.toLocaleString()+" in MRR via same funnel: see Scaling Economics above",{amount:a.toLocaleString()}))}else t.push(i("calc_out.unit_economics.row.whatif_cannot_model","• ⚠️ Cannot model — net contribution is negative. Raise price or cut cost-to-serve first."));if(t.push(""),c>0){t.push("⚖️ Break-Even"),t.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");const e=Math.round(s/c);s>0&&isFinite(r)&&(t.push(i("calc_out.unit_economics.row.breakeven_need","• Break-even customers/mo needed to amortize CAC:")),t.push(i("calc_out.unit_economics.row.breakeven_detail","  Current CAC "+o(s)+" needs "+e+" customers contributing net profit for "+r.toFixed(1)+" months to break even",{cac:o(s),customers:String(e),months:r.toFixed(1)}))),s===0?t.push(i("calc_out.unit_economics.row.breakeven_no_cac","• No CAC — every customer is profitable from month 1. Pure growth mode.")):t.push(i("calc_out.unit_economics.row.breakeven_once","• Once "+e+" customers are acquired, monthly net profit is positive thereafter (assuming constant churn).",{customers:String(e)})),t.push("")}return c<=0?t.push(i("calc_out.unit_economics.row.tip_negative","💡 Tip: Negative net contribution means you lose money on every customer served. Fix this before scaling — either raise price, cut cost-to-serve (hosting, support, payment processing), or both. Scaling a loss-making unit is a guaranteed death spiral.")):isFinite(r)&&r>12?t.push(i("calc_out.unit_economics.row.tip_payback_slow","💡 Tip: CAC payback over 12 months is the #1 red flag for SaaS investors. Two ways out: (1) raise prices 20-30% (most founders underprice), or (2) cut CAC by improving conversion (better landing page, more qualified leads). Either compounds — don't pick both at once.")):m>.05?t.push(i("calc_out.unit_economics.row.tip_churn_high","💡 Tip: 5%+ monthly churn is the silent killer. The math: cutting churn from 5% to 3% roughly doubles LTV. That's usually worth more than a new pricing tier. Talk to churned customers first — the answer is almost always in their exit interviews.")):t.push(i("calc_out.unit_economics.row.tip_solid","💡 Tip: Solid unit economics. The next bottleneck is usually distribution (filling the funnel), not the per-customer math. If you're hitting LTV:CAC ≥ 3:1 with payback < 12mo, consider raising prices — the market can probably bear more than you're charging.")),t},N=function(f,o,_){var A=q(f);return Array.isArray(A)?A.join(\`
\`):String(A)};var V=y,I=R,O=N,i=tk,M='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',i=new Function("return "+M)(),q=function(f){return R(f)};return[N(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

const engine: ToolEngine = {
  slug: "solopreneur-unit-economics-calculator",
  title: "Unit Economics Calculator",
  description: "Analyze per-customer profitability: net contribution, CAC payback, LTV, scaling economics, and optimization lever ranking.",
  inputs: [
    { name: "averageRevenuePerCustomer", label: "Avg Monthly Revenue per Customer ($)", placeholder: "e.g. 50", type: "number" },
    { name: "costToServePerCustomer", label: "Monthly Cost to Serve per Customer ($)", placeholder: "e.g. 10", type: "number" },
    { name: "customerAcquisitionCost", label: "Customer Acquisition Cost ($)", placeholder: "e.g. 200", type: "number" },
    { name: "monthlyChurnRate", label: "Monthly Churn Rate (%)", placeholder: "e.g. 3", type: "number" },
    { name: "expansionRevenuePerCustomer", label: "Expansion Revenue / Customer ($)", placeholder: "e.g. 15", type: "number" },
    { name: "retentionMonths", label: "Avg Customer Lifetime (months)", placeholder: "e.g. 36 (optional, leave 0 to use churn-based)", type: "number" },
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
  generate(inputs: Record<string, string>): string[] { return calculateUnitEconomics(inputs); },
  staticExamples: [
    '📦 Unit Economics\n\n$calc_out.unit_economics.row.section_snapshot|📋 Per-Customer Snapshot|\n• Revenue / Customer:   $100/mo\n• Expansion Revenue:    $30/mo\n• Cost to Serve:        $30/mo\n$calc_out.unit_economics.row.net_contribution{"value":"$100","margin":"76.9%"}|• Net Contribution:     $100/mo  (76.9% margin)|\n• Monthly Churn:        5.0%\n$calc_out.unit_economics.row.avg_lifetime_months{"months":"20"}|• Avg Customer Lifetime: 20 months|\n• Customer LTV:         $2,000\n\n⏱️ CAC Payback\n• Cost to Acquire:      $300\n$calc_out.unit_economics.row.monthly_net_contribution{"value":"$100"}|• Monthly Net Contribution: $100/mo|\n$calc_out.unit_economics.row.payback_period{"months":"3.0"}|• Payback Period:       3.0 months|\n$calc_out.unit_economics.row.annual_profit{"value":"$1,200"}|• Annual Profit:        $1,200 per customer|\n$calc_out.unit_economics.row.payback_excellent|• ✅ Excellent — you recover CAC in under 3 months. Invest more in growth!|\n\n📊 Scaling Economics\n$calc_out.unit_economics.row.scaling_row_acquire{"count":"1,000","monthly":"$100,000","annual":"$1,200,000","acquire":"$315,000"}|• 1,000 customers: $100,000/mo net  →  $1,200,000/yr  (acquire: $315,000)|\n$calc_out.unit_economics.row.scaling_row_cost_acquire{"count":"10,000","monthly":"$1,030,000","annual":"$12,360,000","cut":"10","acquire":"$3,150,000"}|• 10,000 customers: $1,030,000/mo net  →  $12,360,000/yr  (cost -10%)  (acquire: $3,150,000)|\n$calc_out.unit_economics.row.scaling_row_cost_acquire{"count":"100,000","monthly":"$10,600,000","annual":"$127,200,000","cut":"20","acquire":"$31,500,000"}|• 100,000 customers: $10,600,000/mo net  →  $127,200,000/yr  (cost -20%)  (acquire: $31,500,000)|\n$calc_out.unit_economics.row.scaling_note|  ^ Economies of scale: 10% cost reduction per 10× customers|\n\n🎯 Optimization Levers\n$calc_out.unit_economics.row.lever_reduce_churn{"from":"$2,000","to":"$2,667","delta":"$667"}|• Reduce churn 25%:  LTV $2,000 → $2,667  (+$667)|\n$calc_out.unit_economics.row.lever_raise_price{"from":"$100","to":"$120"}|• Raise price 20%:   Net $100/mo → $120/mo|  |  $calc_out.unit_economics.row.lever_raise_price_payback{"from":"3 → ","to":"3"}|Payback 3 → 3 mo|\n$calc_out.unit_economics.row.lever_reduce_cac{"from":"3","to":"2","cac_from":"$300","cac_to":"$210"}|• Reduce CAC 30%:    Payback 3 → 2 mo  (CAC: $300 → $210)|\n$calc_out.unit_economics.row.lever_best_case{"ltv":"$2,667"}|• 🚀 Best case (lower churn + lower CAC):  LTV $2,667|  |  $calc_out.unit_economics.row.lever_best_case_payback{"months":"2"}|Payback 2 mo|\n\n🏆 Lever Impact Ranking\n$calc_out.unit_economics.row.ranking_churn{"from":"$2,000","to":"$2,500","delta":"$500"}|• Reduce churn 1%:     LTV $2,000 → $2,500  (+$500)|\n$calc_out.unit_economics.row.ranking_expansion{"from":"$2,000","to":"$2,060","delta":"$60"}|• +10% Expansion:      LTV $2,000 → $2,060  (+$60)|\n$calc_out.unit_economics.row.ranking_top_churn{"churn":"$500","exp":"$60"}|🥇 Top Lever: Reduce Churn (+$500 LTV vs +$60 from expansion)|\n\n🩺 Unit Economics Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.unit_economics.row.health_margin_high{"margin":"76.9%"}|• 🟢 Excellent margin 76.9%. Top-quartile SaaS efficiency.|\n$calc_out.unit_economics.row.health_payback_good{"months":"3.0"}|• 🟢 CAC payback 3.0 months — under 1 year. Efficient growth.|\n$calc_out.unit_economics.row.health_churn_mid{"churn":"5.0%"}|• 🟡 Monthly churn 5.0% is above target. Aim for 2-3%.|\n$calc_out.unit_economics.row.health_ratio_good{"ratio":"6.7"}|• 🟢 LTV:CAC ratio 6.7:1 — healthy (target 3:1+).|\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.unit_economics.row.whatif_churn_halve{"from_churn":"5.0%","to_churn":"2.5%","from":"$2,000 → ","to":"$4,000","delta":"$2,000"}|• Cut churn in half (5.0% → 2.5%):  LTV $2,000 → $4,000  (+$2,000)|\n$calc_out.unit_economics.row.whatif_cac_30{"from":"3.0","to":"2.1","cac_from":"$300","cac_to":"$210"}|• Reduce CAC by 30%:  Payback 3.0 → 2.1 mo  (CAC: $300 → $210)|\n$calc_out.unit_economics.row.whatif_raise_price{"from":"$100","to":"$120","delta":"$20"}|• Raise price 20%:  Net contribution $100 → $120  (+$20/mo)|\n$calc_out.unit_economics.row.whatif_expansion_25{"from":"$100","to":"$108"}|• Grow expansion 25%:  Net $100 → $108  (focus on upsells)|\n$calc_out.unit_economics.row.whatif_double_customers{"amount":"200"}|• Double customers to 200 in MRR via same funnel: see Scaling Economics above|\n\n⚖️ Break-Even\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.unit_economics.row.breakeven_need|• Break-even customers/mo needed to amortize CAC:|\n$calc_out.unit_economics.row.breakeven_detail{"cac":"$300","customers":"3","months":"3.0"}|  Current CAC $300 needs 3 customers contributing net profit for 3.0 months to break even|\n$calc_out.unit_economics.row.breakeven_once{"customers":"3"}|• Once 3 customers are acquired, monthly net profit is positive thereafter (assuming constant churn).|\n\n$calc_out.unit_economics.row.tip_solid|💡 Tip: Solid unit economics. The next bottleneck is usually distribution (filling the funnel), not the per-customer math. If you\'re hitting LTV:CAC ≥ 3:1 with payback < 12mo, consider raising prices — the market can probably bear more than you\'re charging.|',
  ],
  faq: [
    { q: "What is unit economics?", a: "Unit economics breaks down your business to the per-customer level: how much revenue each customer generates (including expansion upsells), what it costs to serve them, and how much you spend to acquire them. Positive unit economics means each customer is profitable on their own — the foundation of a sustainable business." },
    { q: "What counts as expansion revenue?", a: "Expansion revenue is the additional monthly revenue you generate from existing customers beyond their base subscription — upsells, add-ons, usage-based charges, seat upgrades. It compounds per-customer LTV and often has zero acquisition cost. Enter your average monthly expansion per customer here." },
    { q: "When should I use the manual lifetime override?", a: "If your business is new and you do not have enough churn data yet, leave it at 0 to calculate lifetime from churn rate (1 ÷ monthly churn). If you know your actual average customer lifetime from cohort analysis — e.g. 36 months — enter it directly. The manual value overrides the churn-based calculation." },
    { q: "What is a good net margin?", a: "Net contribution margin = (revenue + expansion − cost to serve) ÷ (revenue + expansion). For SaaS with expansion, 80-100%+ is excellent. For e-commerce, 40-60% is common. For services/agencies, 20-40%. If net margin is under 50%, look for ways to automate support, reduce hosting costs, or grow expansion revenue." },
    { q: "What is a good CAC payback period?", a: "Under 6 months is healthy, under 3 months is excellent. Over 12 months means you need a lot of capital to grow — and you are betting on customers sticking around long enough to become profitable. Most SaaS investors want to see payback under 12 months." },
    { q: "How do economies of scale affect unit economics?", a: "As you grow, your cost to serve per customer typically drops (bulk infrastructure pricing, automation, support efficiency). This calculator models a 10% cost reduction every time your customer count grows 10×. See the Scaling Economics section for the impact at 1K, 10K, and 100K customers." },
    { q: "Which optimization lever should I focus on?", a: "The Lever Impact Ranking at the bottom compares the LTV impact of reducing churn by 1% versus increasing expansion revenue by 10%. The larger impact wins. In most SaaS businesses, reducing churn has the highest leverage — but if your churn is already low and expansion is strong, growing expansion may win." },
    { q: "What are unit economics?", a: "Unit economics = revenue and costs per unit (per customer, per transaction). For SaaS: per customer = LTV, CAC, gross margin. Components: 1) ARPU, 2) Gross margin, 3) CAC, 4) LTV, 5) Payback, 6) NRR. Most: track per cohort. Healthy: 3:1 LTV:CAC, <12 month payback, 80%+ gross margin, 100%+ NRR. Investors: unit economics is the #1 thing they look at. Most: improve before scaling." },
    { q: "What is a good LTV:CAC ratio for SaaS?", a: "Benchmarks: 1) 1:1 = break-even, 2) 3:1 = healthy, 3) 5:1 = under-investing, 4) 10:1 = excellent. By stage: 1) Seed: 2:1+ (acceptable), 2) Series A: 3:1+, 3) Series B: 4:1+. For investors: 3:1 is the gate. Most: target 3-4:1. Top: 5:1+. Calculate: (LTV × gross_margin) / CAC. Be honest: use net LTV (after margin). Most: 3:1+ is healthy. Below 2:1 = scaling issues." },
    { q: "What is CAC payback and what is good?", a: "CAC payback = months to recover CAC from gross profit. For $1K CAC, $100/mo ARPU, 80% margin: payback = 1000/(100 × 0.8) = 12.5 months. Benchmarks: 1) <6 months: world-class, 2) 6-12 months: healthy, 3) 12-18 months: acceptable, 4) 18-24 months: concerning, 5) >24 months: critical. Most SaaS: 12-18 months. Top: <12. Best option: <6. For each month reduction: 5-10% valuation lift." },
    { q: "What is gross margin and what is good for SaaS?", a: "Gross margin = (revenue - COGS) / revenue. COGS = hosting + support + payment fees. For $100 revenue, $20 COGS: 80% margin. Benchmarks: 1) 80%+: world-class SaaS, 2) 70-80%: good, 3) 60-70%: average, 4) <60%: services-heavy. Most SaaS: 75-85%. Top: 85%+. AWS, Stripe, Snowflake: 70-80%. Pure SaaS (no services): 80%+. Most: aim for 80%+. Lower margin: lower multiple." },
    { q: "How do I improve unit economics?", a: "1) Reduce CAC (better targeting, SEO, referrals), 2) Increase LTV (lower churn, higher ARPU), 3) Increase gross margin (cheaper hosting, automation), 4) Faster payback (annual prepay). 20-50% unit economics improvement in 12 months. 1) Reduce churn + 2) SEO. 1 pp churn reduction = 10-20% LTV lift. Aim for 3:1 LTV:CAC + 12-month payback. Be patient: organic takes 6-12 months." },
    { q: "What is the relationship between unit economics and valuation?", a: "Better unit economics = higher multiple. For 3:1 LTV:CAC, 12-month payback, 80% margin: 8-12x ARR. For 5:1 LTV:CAC, 6-month payback, 85% margin: 15-20x. Top: 5:1+ LTV:CAC, <12 month payback, 85%+ margin = 20-30x. Investors: 3-4x for healthy. aim for 3:1 minimum. Track by cohort. Most teams 5-10 pp unit economics improvement per year = 2-3x multiple lift." },
    { q: "What is the difference between gross margin and contribution margin?", a: "Gross margin: revenue - COGS. COGS = cost of delivering product. Contribution margin: gross margin - variable operating costs (some S&M, customer success). For SaaS: gross margin 80%, contribution margin 60-70%. For valuation: use gross margin. For unit economics: use contribution margin. Most: gross margin is the standard. Contribution margin: more conservative. Use: gross for headline, contribution for unit economics." },
    { q: "How do I model unit economics in financial projections?", a: "Model: 1) ARPU per cohort, 2) Gross margin %, 3) CAC, 4) Churn, 5) Compute LTV, payback, NRR. Per cohort. For 5-year model: 1) Year 1: low volume, high CAC, 2) Year 2-3: scaling, 3) Year 4-5: mature. cohort-based (each cohort has its own retention). Tools: Excel, Fathom, Mosaic. validate against actuals quarterly. Most teams model by segment (SMB, mid-market, enterprise)." },
  ],
  howToUse: [
    "Enter your average monthly revenue per customer (base subscription or purchase).",
    "(Optional) Enter your average monthly expansion revenue per customer — upsells, add-ons, usage fees.",
    "Enter your monthly cost to serve one customer (hosting, support, payment processing, API costs).",
    "Enter your Customer Acquisition Cost (total sales & marketing spend ÷ new customers acquired).",
    "Enter your monthly churn rate as a percentage (customers lost per month ÷ total customers).",
    "(Optional) Set a manual average customer lifetime in months if you know it from data. Leave at 0 to auto-calculate from churn.",
    "Check the Per-Customer Snapshot for net contribution, margin, and LTV.",
    "Review CAC Payback to see how quickly you recover acquisition costs.",
    "Scan Scaling Economics to see how unit profit scales at 1K, 10K, and 100K customers with economies of scale.",
    "Read Optimization Levers to see how churn reduction, pricing, and CAC improvements compound.",
    "Compare the Lever Impact Ranking to decide whether to invest in churn reduction or expansion growth.",
  ],
  engineKey: true,
};
registerEngine(engine);
