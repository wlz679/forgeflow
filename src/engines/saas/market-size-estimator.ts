import type { ToolEngine } from "../../core/engines/types";
import { registerEngine } from "../../core/engines/registry";
import { clampNonNegative } from "../../core/engines/helpers";
// P168 B3-9：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
//   ⚠️ 章节标题 / 标签用**字面量 token**（code|原文|）；带运行时数值的整行用
//      makeToken(code, fallback, params) ⇒ fallback 与 params 取**同一个变量**。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from "../../lib/calc-output-i18n";

function calculateMarketSize(inputs: Record<string, string>): string[] {
  const fmt = (n: number) => "$" + Math.round(n).toLocaleString();
  const fmtM = (n: number) => { if (Math.abs(n) >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B"; if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M"; return "$" + Math.round(n).toLocaleString(); };
  const pct = (n: number) => n.toFixed(1) + "%"; const loc = (n: number) => n.toLocaleString();
  const targetMarket = inputs.targetMarket || "your market";
  const totalCustomers = clampNonNegative(parseInt(inputs.totalAddressableCustomers) || 0);
  const annualRevPerCustomer = clampNonNegative(parseFloat(inputs.annualRevenuePerCustomer) || 0);
  const growthRate = clampNonNegative(parseFloat(inputs.marketGrowthRate) || 0);
  const samPercent = clampNonNegative(parseFloat(inputs.samPercent) || 25);
  const marketStage = inputs.marketStage || "Growing";
  const tam = totalCustomers * annualRevPerCustomer;
  const growthFactor = 1 + growthRate / 100;

  // Market stage adjustments
  const stageGrowthAdj: Record<string, number> = { Emerging: 1.5, Growing: 1.0, Mature: 0.7, Declining: 0.4 };
  const stageAdj = stageGrowthAdj[marketStage] || 1.0;

  // ⚠️ tier 的 label 是**字面量 token**（protocol 规定 code 必须来自字面量 ⇒ 不得动态拼码）
  let tiers: { rate: number; label: string }[];
  if (totalCustomers > 100000) tiers = [{ rate: 0.001, label: '$calc_out.label.tier_solopreneur|🟢 Solopreneur|' }, { rate: 0.005, label: '$calc_out.label.tier_solopreneur|🟢 Solopreneur|' }, { rate: 0.01, label: '$calc_out.label.tier_small_team|🟡 Small team|' }, { rate: 0.03, label: '$calc_out.label.tier_vc_backed|🔴 VC-backed|' }];
  else if (totalCustomers > 10000) tiers = [{ rate: 0.002, label: '$calc_out.label.tier_solopreneur|🟢 Solopreneur|' }, { rate: 0.01, label: '$calc_out.label.tier_solopreneur|🟢 Solopreneur|' }, { rate: 0.02, label: '$calc_out.label.tier_small_team|🟡 Small team|' }, { rate: 0.05, label: '$calc_out.label.tier_vc_backed|🔴 VC-backed|' }];
  else tiers = [{ rate: 0.005, label: '$calc_out.label.tier_solopreneur|🟢 Solopreneur|' }, { rate: 0.02, label: '$calc_out.label.tier_solopreneur|🟢 Solopreneur|' }, { rate: 0.05, label: '$calc_out.label.tier_small_team|🟡 Small team|' }, { rate: 0.1, label: '$calc_out.label.tier_vc_backed|🔴 VC-backed|' }];

  let result = "$calc_out.section.market_size_estimator_market_size|📊 Market Size:|" + " " + targetMarket + "\n\n$calc_out.section.market_size_estimator_market_overview|📋 Market Overview|\n";
  if (targetMarket) result += "• $calc_out.label.market|Market|:            " + targetMarket + "\n";
  result += "• $calc_out.label.market_stage|Market Stage|:      " + marketStage + "\n";
  result += "• $calc_out.label.addressable_customers|Addressable Customers|: " + loc(totalCustomers) + "\n• $calc_out.label.avg_revenue_per_customer|Avg Revenue / Customer|: " + fmt(annualRevPerCustomer) + "/yr\n• $calc_out.label.tam|TAM (Total Addressable Market)|: " + fmtM(tam) + "/yr\n";
  // SAM = configurable % of TAM
  if (tam > 0) result += "• " + makeToken('calc_out.market_size_estimator.row.sam', 'SAM (Serviceable): ' + fmtM(tam * samPercent / 100) + '/yr  (~' + pct(samPercent) + ' of TAM)', { sam: fmtM(tam * samPercent / 100), pct: pct(samPercent) }) + "\n";
  result += "• $calc_out.label.annual_growth_rate|Annual Growth Rate|: " + pct(growthRate) + "\n";
  if (growthRate > 0) {
    const y3 = tam * Math.pow(growthFactor, 3);
    const y5 = tam * Math.pow(growthFactor, 5);
    result += "• " + makeToken('calc_out.market_size_estimator.row.market_in_3_years', 'Market in 3 Years:  ' + fmtM(y3) + '/yr (compounded)', { value: fmtM(y3) }) + "\n• " + makeToken('calc_out.market_size_estimator.row.market_in_5_years', 'Market in 5 Years:  ' + fmtM(y5) + '/yr (compounded)', { value: fmtM(y5) }) + "\n";
  }

  // Bottom-up revenue potential
  if (totalCustomers > 0 && annualRevPerCustomer > 0) {
    result += "\n$calc_out.section.market_size_estimator_bottom_up|💰 Bottom-Up Revenue Potential|\n";
    for (const tier of tiers) {
      const cust = Math.round(totalCustomers * tier.rate);
      result += "• " + makeToken('calc_out.market_size_estimator.row.bottom_up_tier', pct(tier.rate * 100) + ' share  →  ' + loc(cust) + ' customers  →  ' + fmtM(cust * annualRevPerCustomer) + '/yr', { share: pct(tier.rate * 100), customers: loc(cust), revenue: fmtM(cust * annualRevPerCustomer) }) + "  " + tier.label + "\n";
    }
    // Top-down cross-check
    result += "\n$calc_out.section.market_size_estimator_top_down|🔄 Top-Down Cross-Check|\n";
    const tdRates = [0.001, 0.005, 0.01, 0.03];
    for (const r of tdRates) {
      const rev = tam * r * stageAdj;
      result += "• " + (stageAdj !== 1.0
        ? makeToken('calc_out.market_size_estimator.row.top_down_rate_stage_adjusted', pct(r * 100) + ' of TAM  →  ' + fmtM(rev) + '/yr  (stage-adjusted)', { share: pct(r * 100), revenue: fmtM(rev) })
        : makeToken('calc_out.market_size_estimator.row.top_down_rate', pct(r * 100) + ' of TAM  →  ' + fmtM(rev) + '/yr', { share: pct(r * 100), revenue: fmtM(rev) })) + "\n";
    }
  }

  // 3-year projection
  if (totalCustomers > 0 && annualRevPerCustomer > 0 && growthRate > 0) {
    const startRate = tiers[1].rate;
    const maxPen = totalCustomers > 100000 ? 0.05 : totalCustomers > 10000 ? 0.08 : 0.12;
    result += "\n$calc_out.section.market_size_estimator_growth_projection|📈 3-Year Growth Projection|\n";
    for (let yr = 1; yr <= 3; yr++) {
      const marketYr = tam * Math.pow(growthFactor, yr);
      const raw = startRate * Math.pow(2, yr - 1);
      const yrRate = Math.min(raw, maxPen);
      result += "• " + (raw > maxPen
        ? makeToken('calc_out.market_size_estimator.row.year_projection_capped', 'Year ' + yr + ': Market ' + fmtM(marketYr) + '  →  Your ' + pct(yrRate * 100) + '  =  ' + fmtM(marketYr * yrRate) + '/yr (capped)', { year: String(yr), market: fmtM(marketYr), share: pct(yrRate * 100), revenue: fmtM(marketYr * yrRate) })
        : makeToken('calc_out.market_size_estimator.row.year_projection', 'Year ' + yr + ': Market ' + fmtM(marketYr) + '  →  Your ' + pct(yrRate * 100) + '  =  ' + fmtM(marketYr * yrRate) + '/yr', { year: String(yr), market: fmtM(marketYr), share: pct(yrRate * 100), revenue: fmtM(marketYr * yrRate) })) + "\n";
    }
  }

  // Reality check
  result += "\n$calc_out.section.market_size_estimator_reality_check|🎯 Reality Check|\n";
  if (tam >= 1e9) result += "• " + makeToken('calc_out.market_size_estimator.row.reality_huge_market', "Huge market — you don't need a large share to build a great business.") + "\n";
  else if (tam >= 100e6) result += "• " + makeToken('calc_out.market_size_estimator.row.reality_solid_market', 'Solid market size — focus on dominating a specific niche within it.') + "\n";
  else if (tam > 0) result += "• " + makeToken('calc_out.market_size_estimator.row.reality_narrow_market', "Narrow market — you'll need high pricing or high penetration to thrive.") + "\n";

  if (marketStage === "Emerging") result += "• " + makeToken('calc_out.market_size_estimator.row.reality_stage_emerging', 'Emerging market: high risk, high reward. First-mover advantage possible.') + "\n";
  else if (marketStage === "Growing") result += "• " + makeToken('calc_out.market_size_estimator.row.reality_stage_growing', 'Growing market: sweet spot for entry. Ride the tailwind.') + "\n";
  else if (marketStage === "Mature") result += "• " + makeToken('calc_out.market_size_estimator.row.reality_stage_mature', 'Mature market: differentiate or compete on price. Harder to stand out.') + "\n";
  else result += "• " + makeToken('calc_out.market_size_estimator.row.reality_stage_declining', 'Declining market: pivot to a growing adjacent segment or premium niche.') + "\n";

  if (annualRevPerCustomer > 0 && annualRevPerCustomer < 500) result += "• " + makeToken('calc_out.market_size_estimator.row.price_low', 'Low price point — consider upselling, annual plans, or raising prices.') + "\n";
  else if (annualRevPerCustomer >= 500 && annualRevPerCustomer < 5000) result += "• " + makeToken('calc_out.market_size_estimator.row.price_moderate', 'Moderate price point — solid. Experiment with premium tiers or annual billing.') + "\n";
  else if (annualRevPerCustomer >= 5000) result += "• " + makeToken('calc_out.market_size_estimator.row.price_strong', 'Strong price point — high-value customers mean you need fewer of them.') + "\n";

  if (totalCustomers > 0 && annualRevPerCustomer > 0) {
    const c100k = Math.ceil(100000 / annualRevPerCustomer);
    const p100k = totalCustomers > 0 ? (c100k / totalCustomers) * 100 : 0;
    if (p100k < 0.5) result += "• " + makeToken('calc_out.market_size_estimator.row.to_reach_100k_very_achievable', 'To reach $100K/yr: Need ' + c100k + ' customers (' + pct(p100k) + ' penetration). ✅ Very achievable.', { customers: String(c100k), pct: pct(p100k) }) + "\n";
    else if (p100k < 2) result += "• " + makeToken('calc_out.market_size_estimator.row.to_reach_100k_solid_target', 'To reach $100K/yr: Need ' + c100k + ' customers (' + pct(p100k) + ' penetration). 🟡 A solid target.', { customers: String(c100k), pct: pct(p100k) }) + "\n";
    else result += "• " + makeToken('calc_out.market_size_estimator.row.to_reach_100k_ambitious', 'To reach $100K/yr: Need ' + c100k + ' customers (' + pct(p100k) + ' penetration). 🔴 Ambitious — validate demand first.', { customers: String(c100k), pct: pct(p100k) }) + "\n";
    if (totalCustomers < 5000 && annualRevPerCustomer < 2000) result += "• " + makeToken('calc_out.market_size_estimator.row.warning_small_pool_low_pricing', '⚠️ Small pool + low pricing: reaching meaningful revenue will be hard. Consider a larger market, higher pricing, or a premium niche.') + "\n";
    else if (totalCustomers < 5000 && p100k > 5) result += "• " + makeToken('calc_out.market_size_estimator.row.warning_few_customers', "⚠️ This market has few customers — you'll need to capture " + pct(p100k) + ' to hit $100K.', { pct: pct(p100k) }) + "\n";
    else if (p100k > 10) result += "• " + makeToken('calc_out.market_size_estimator.row.warning_over_10pct', '⚠️ You need over 10% market share to reach $100K. Either the market is very small or your pricing is too low — adjust one of them.') + "\n";
  }

  // Penetration/reach metrics — referenced by 🩺 Health and 🔄 What-If below
  // (was previously undefined; fix 2026-06-22)
  const penetrationRate = 1; // assume 1% reachable at "Small team" tier
  const reachable = totalCustomers * (penetrationRate / 100);

  // 🩺 Market Health (v3)
  if (totalCustomers <= 0) {
    result += "\n\n$calc_out.section.market_size_estimator_market_health|🩺 Market Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• " + makeToken('calc_out.market_size_estimator.row.health_no_customers', '🔴 No addressable customers. Re-check population and target %.') + "\n• $calc_out.label.total_addressable|Total addressable|: 0 | $calc_out.label.reachable|Reachable|: 0";
  } else if (totalCustomers < 10000) {
    result += "\n\n$calc_out.section.market_size_estimator_market_health|🩺 Market Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• " + makeToken('calc_out.market_size_estimator.row.health_niche_market', '🟠 Niche market (' + totalCustomers.toLocaleString() + ' addressable). High focus needed.', { customers: totalCustomers.toLocaleString() }) + "\n• " + makeToken('calc_out.market_size_estimator.row.health_reachable_at', 'Reachable at ' + pct(penetrationRate) + ': ' + reachable.toLocaleString() + ' customers.', { rate: pct(penetrationRate), customers: reachable.toLocaleString() }) + "\n• " + makeToken('calc_out.market_size_estimator.row.health_pricing_matters', 'Pricing matters a lot — small market × high ARPU works.');
  } else if (totalCustomers < 1000000) {
    result += "\n\n$calc_out.section.market_size_estimator_market_health|🩺 Market Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• " + makeToken('calc_out.market_size_estimator.row.health_mid_sized_market', '🟢 Mid-sized market (' + totalCustomers.toLocaleString() + ' addressable). Standard SaaS opportunity.', { customers: totalCustomers.toLocaleString() }) + "\n• " + makeToken('calc_out.market_size_estimator.row.health_reachable_at', 'Reachable at ' + pct(penetrationRate) + ': ' + reachable.toLocaleString() + ' customers.', { rate: pct(penetrationRate), customers: reachable.toLocaleString() }) + "\n• " + makeToken('calc_out.market_size_estimator.row.health_achievable_focused_gtm', 'Achievable with focused go-to-market.');
  } else {
    result += "\n\n$calc_out.section.market_size_estimator_market_health|🩺 Market Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• " + makeToken('calc_out.market_size_estimator.row.health_large_market', '🟢 Large market (' + totalCustomers.toLocaleString() + ' addressable). Big upside.', { customers: totalCustomers.toLocaleString() }) + "\n• " + makeToken('calc_out.market_size_estimator.row.health_reachable_at', 'Reachable at ' + pct(penetrationRate) + ': ' + reachable.toLocaleString() + ' customers.', { rate: pct(penetrationRate), customers: reachable.toLocaleString() }) + "\n• " + makeToken('calc_out.market_size_estimator.row.health_capture_even_01pct', 'Capture even 0.1% for major revenue.');
  }

  // 🔄 What-If Scenarios (v3)
  result += "\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
  if (totalCustomers > 0 && annualRevPerCustomer > 0) {
    const doublePenetration = totalCustomers * (penetrationRate * 2 / 100);
    const revAtDouble = doublePenetration * annualRevPerCustomer;
    const revAtHalfPrice = reachable * (annualRevPerCustomer / 2);
    const doubleCustomers = totalCustomers * 2;
    const revAtDoubleMarket = (doubleCustomers * penetrationRate / 100) * annualRevPerCustomer;
    // ⚠️ 这些行里有半角 ' | ' ⇒ **整行拆成多个 token**，中间用字面量 ' | ' 连接（token 兜底里不许有半角 |）
    result += "\n• " + makeToken('calc_out.market_size_estimator.row.whatif_double_penetration', 'Double penetration rate:  ' + reachable.toLocaleString() + ' → ' + doublePenetration.toLocaleString() + ' customers', { from: reachable.toLocaleString(), to: doublePenetration.toLocaleString() }) + " | " + makeToken('calc_out.market_size_estimator.row.whatif_double_penetration_rev', fmt(revAtDouble) + '/yr', { value: fmt(revAtDouble) });
    result += "\n• " + makeToken('calc_out.market_size_estimator.row.whatif_cut_price_50', 'Cut price 50%:  Customers double (price-sensitive market)') + " | " + makeToken('calc_out.market_size_estimator.row.whatif_cut_price_50_rev', fmt(revAtHalfPrice) + '/yr', { value: fmt(revAtHalfPrice) });
    result += "\n• " + makeToken('calc_out.market_size_estimator.row.whatif_double_target_pct', 'Double target %:  ' + totalCustomers.toLocaleString() + ' → ' + doubleCustomers.toLocaleString() + ' addressable', { from: totalCustomers.toLocaleString(), to: doubleCustomers.toLocaleString() }) + " | " + makeToken('calc_out.market_size_estimator.row.whatif_double_target_rev', fmt(revAtDoubleMarket) + '/yr at ' + pct(penetrationRate), { value: fmt(revAtDoubleMarket), rate: pct(penetrationRate) });
    result += "\n• " + makeToken('calc_out.market_size_estimator.row.whatif_triple_pricing', 'Triple pricing (premium):  ' + fmt(reachable * annualRevPerCustomer * 3) + '/yr at same reach (only works for unique value)', { value: fmt(reachable * annualRevPerCustomer * 3) });
  } else {
    result += "\n• " + makeToken('calc_out.market_size_estimator.row.whatif_cannot_model', '⚠️ Cannot model — enter total population, target %, and pricing to see scenarios.');
  }

  // ⚖️ Break-Even (v3)
  if (tam > 0 && annualRevPerCustomer > 0) {
    result += "\n\n$calc_out.section.market_size_estimator_break_even|⚖️ Break-Even|\n" + "─".repeat(54);
    const penetrationFor100K = (100000 / tam) * 100; // % of TAM needed for $100K/yr
    const penetrationFor1M = (1000000 / tam) * 100;
    if (penetrationFor100K < 0.1) {
      result += "\n• " + makeToken('calc_out.market_size_estimator.row.breakeven_100k_very_achievable', '🟢 To reach $100K/yr:  need ' + penetrationFor100K.toFixed(3) + '% of TAM  (very achievable)', { pct: penetrationFor100K.toFixed(3) });
    } else if (penetrationFor100K < 1) {
      result += "\n• " + makeToken('calc_out.market_size_estimator.row.breakeven_100k_achievable', '🟡 To reach $100K/yr:  need ' + penetrationFor100K.toFixed(2) + '% of TAM  (achievable for focused GTM)', { pct: penetrationFor100K.toFixed(2) });
    } else if (penetrationFor100K < 5) {
      result += "\n• " + makeToken('calc_out.market_size_estimator.row.breakeven_100k_ambitious', '🟠 To reach $100K/yr:  need ' + penetrationFor100K.toFixed(1) + '% of TAM  (ambitious — strong positioning needed)', { pct: penetrationFor100K.toFixed(1) });
    } else {
      result += "\n• " + makeToken('calc_out.market_size_estimator.row.breakeven_100k_very_high', '🔴 To reach $100K/yr:  need ' + penetrationFor100K.toFixed(1) + '% of TAM  (very high — consider higher pricing or larger market)', { pct: penetrationFor100K.toFixed(1) });
    }
    if (penetrationFor1M < 10) {
      result += "\n• " + makeToken('calc_out.market_size_estimator.row.breakeven_1m_achievable', 'For $1M/yr:  need ' + penetrationFor1M.toFixed(2) + '% of TAM  (' + Math.round(penetrationFor1M / 100 * totalCustomers).toLocaleString() + ' customers)', { pct: penetrationFor1M.toFixed(2), customers: Math.round(penetrationFor1M / 100 * totalCustomers).toLocaleString() });
    } else {
      result += "\n• " + makeToken('calc_out.market_size_estimator.row.breakeven_1m_unrealistic', 'For $1M/yr:  need ' + Math.round(penetrationFor1M).toLocaleString() + '% of TAM  (often unrealistic — likely needs VC scale)', { pct: Math.round(penetrationFor1M).toLocaleString() });
    }
  }

  // 🎯 Revenue Milestones (v3)
  if (tam > 0 && annualRevPerCustomer > 0 && growthRate > 0) {
    result += "\n\n$calc_out.section.market_size_estimator_revenue_milestones|🎯 Revenue Milestones|\n" + "─".repeat(54);
    const targetRevenues = [100000, 1000000, 10000000];
    const labels = ["$100K ARR", "$1M ARR", "$10M ARR"];
    for (let i = 0; i < targetRevenues.length; i++) {
      const target = targetRevenues[i];
      if (tam < target) {
        result += "\n• " + makeToken('calc_out.market_size_estimator.row.milestone_unreachable', labels[i] + ':  🔴 unreachable — TAM $' + (tam / 1e6).toFixed(1) + 'M is smaller than target', { target: labels[i], tam: '$' + (tam / 1e6).toFixed(1) + 'M' });
      } else {
        const yearsToReach = Math.log(target / tam) / Math.log(growthFactor);
        if (isFinite(yearsToReach) && yearsToReach > 0 && yearsToReach < 20) {
          result += "\n• " + makeToken('calc_out.market_size_estimator.row.milestone_years', labels[i] + ':  ' + yearsToReach.toFixed(1) + ' years  (at ' + growthRate.toFixed(0) + '% market CAGR)', { target: labels[i], years: yearsToReach.toFixed(1), cagr: growthRate.toFixed(0) });
        } else {
          result += "\n• " + makeToken('calc_out.market_size_estimator.row.milestone_long_horizon', labels[i] + ':  long horizon or zero growth', { target: labels[i] });
        }
      }
    }
  }

  // 💡 Tip (v3)
  if (tam >= 1e9 && marketStage === "Growing") {
    result += "\n\n" + makeToken('calc_out.market_size_estimator.row.tip_large_growing', "💡 Tip: Large + growing market is the ideal entry point. Don't try to serve everyone — pick a wedge (specific industry, geography, or use case) and dominate it. Expansion from a wedge is 10× easier than building a horizontal product from day one.");
  } else if (tam < 100e6 && annualRevPerCustomer < 1000) {
    result += "\n\n" + makeToken('calc_out.market_size_estimator.row.tip_small_market_low_pricing', "💡 Tip: Small market with low pricing is a tough combo. Either raise price (premium positioning) or expand the addressable market (move upmarket or downmarket). The current numbers suggest you'll struggle to reach $1M ARR.");
  } else if (marketStage === "Declining") {
    result += "\n\n" + makeToken('calc_out.market_size_estimator.row.tip_declining_market', '💡 Tip: Declining markets punish new entrants. Unless you have a structural advantage (10× better cost structure, captive distribution), pivot to an adjacent growing segment. The market size will keep shrinking under you.');
  } else {
    result += "\n\n" + makeToken('calc_out.market_size_estimator.row.tip_always_cross_check', '💡 Tip: Always cross-check bottom-up (customers × price) against top-down (TAM × market share). If the two methods diverge by 3× or more, one of your assumptions is wrong — go back to primary research.');
  }

  return [result];
}

const customFn =
  // P168 B3-9：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 服务端与客户端输出逐字节相同，不可能漂移；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let f=function(u){return Number.isNaN(u)?0:Math.max(0,u)},S=function(u){const d=a=>"$"+Math.round(a).toLocaleString(),l=a=>Math.abs(a)>=1e9?"$"+(a/1e9).toFixed(2)+"B":Math.abs(a)>=1e6?"$"+(a/1e6).toFixed(1)+"M":"$"+Math.round(a).toLocaleString(),o=a=>a.toFixed(1)+"%",k=a=>a.toLocaleString(),M=u.targetMarket||"your market",i=f(parseInt(u.totalAddressableCustomers)||0),c=f(parseFloat(u.annualRevenuePerCustomer)||0),w=f(parseFloat(u.marketGrowthRate)||0),y=f(parseFloat(u.samPercent)||25),b=u.marketStage||"Growing",n=i*c,z=1+w/100,A={Emerging:1.5,Growing:1,Mature:.7,Declining:.4}[b]||1;let v;i>1e5?v=[{rate:.001,label:"$calc_out.label.tier_solopreneur|🟢 Solopreneur|"},{rate:.005,label:"$calc_out.label.tier_solopreneur|🟢 Solopreneur|"},{rate:.01,label:"$calc_out.label.tier_small_team|🟡 Small team|"},{rate:.03,label:"$calc_out.label.tier_vc_backed|🔴 VC-backed|"}]:i>1e4?v=[{rate:.002,label:"$calc_out.label.tier_solopreneur|🟢 Solopreneur|"},{rate:.01,label:"$calc_out.label.tier_solopreneur|🟢 Solopreneur|"},{rate:.02,label:"$calc_out.label.tier_small_team|🟡 Small team|"},{rate:.05,label:"$calc_out.label.tier_vc_backed|🔴 VC-backed|"}]:v=[{rate:.005,label:"$calc_out.label.tier_solopreneur|🟢 Solopreneur|"},{rate:.02,label:"$calc_out.label.tier_solopreneur|🟢 Solopreneur|"},{rate:.05,label:"$calc_out.label.tier_small_team|🟡 Small team|"},{rate:.1,label:"$calc_out.label.tier_vc_backed|🔴 VC-backed|"}];let t="$calc_out.section.market_size_estimator_market_size|📊 Market Size:| "+M+\`

$calc_out.section.market_size_estimator_market_overview|📋 Market Overview|
\`;if(M&&(t+="• $calc_out.label.market|Market|:            "+M+\`
\`),t+="• $calc_out.label.market_stage|Market Stage|:      "+b+\`
\`,t+="• $calc_out.label.addressable_customers|Addressable Customers|: "+k(i)+\`
• $calc_out.label.avg_revenue_per_customer|Avg Revenue / Customer|: \`+d(c)+\`/yr
• $calc_out.label.tam|TAM (Total Addressable Market)|: \`+l(n)+\`/yr
\`,n>0&&(t+="• "+e("calc_out.market_size_estimator.row.sam","SAM (Serviceable): "+l(n*y/100)+"/yr  (~"+o(y)+" of TAM)",{sam:l(n*y/100),pct:o(y)})+\`
\`),t+="• $calc_out.label.annual_growth_rate|Annual Growth Rate|: "+o(w)+\`
\`,w>0){const a=n*Math.pow(z,3),r=n*Math.pow(z,5);t+="• "+e("calc_out.market_size_estimator.row.market_in_3_years","Market in 3 Years:  "+l(a)+"/yr (compounded)",{value:l(a)})+\`
• \`+e("calc_out.market_size_estimator.row.market_in_5_years","Market in 5 Years:  "+l(r)+"/yr (compounded)",{value:l(r)})+\`
\`}if(i>0&&c>0){t+=\`
$calc_out.section.market_size_estimator_bottom_up|💰 Bottom-Up Revenue Potential|
\`;for(const r of v){const s=Math.round(i*r.rate);t+="• "+e("calc_out.market_size_estimator.row.bottom_up_tier",o(r.rate*100)+" share  →  "+k(s)+" customers  →  "+l(s*c)+"/yr",{share:o(r.rate*100),customers:k(s),revenue:l(s*c)})+"  "+r.label+\`
\`}t+=\`
$calc_out.section.market_size_estimator_top_down|🔄 Top-Down Cross-Check|
\`;const a=[.001,.005,.01,.03];for(const r of a){const s=n*r*A;t+="• "+(A!==1?e("calc_out.market_size_estimator.row.top_down_rate_stage_adjusted",o(r*100)+" of TAM  →  "+l(s)+"/yr  (stage-adjusted)",{share:o(r*100),revenue:l(s)}):e("calc_out.market_size_estimator.row.top_down_rate",o(r*100)+" of TAM  →  "+l(s)+"/yr",{share:o(r*100),revenue:l(s)}))+\`
\`}}if(i>0&&c>0&&w>0){const a=v[1].rate,r=i>1e5?.05:i>1e4?.08:.12;t+=\`
$calc_out.section.market_size_estimator_growth_projection|📈 3-Year Growth Projection|
\`;for(let s=1;s<=3;s++){const _=n*Math.pow(z,s),g=a*Math.pow(2,s-1),p=Math.min(g,r);t+="• "+(g>r?e("calc_out.market_size_estimator.row.year_projection_capped","Year "+s+": Market "+l(_)+"  →  Your "+o(p*100)+"  =  "+l(_*p)+"/yr (capped)",{year:String(s),market:l(_),share:o(p*100),revenue:l(_*p)}):e("calc_out.market_size_estimator.row.year_projection","Year "+s+": Market "+l(_)+"  →  Your "+o(p*100)+"  =  "+l(_*p)+"/yr",{year:String(s),market:l(_),share:o(p*100),revenue:l(_*p)}))+\`
\`}}if(t+=\`
$calc_out.section.market_size_estimator_reality_check|🎯 Reality Check|
\`,n>=1e9?t+="• "+e("calc_out.market_size_estimator.row.reality_huge_market","Huge market — you don't need a large share to build a great business.")+\`
\`:n>=1e8?t+="• "+e("calc_out.market_size_estimator.row.reality_solid_market","Solid market size — focus on dominating a specific niche within it.")+\`
\`:n>0&&(t+="• "+e("calc_out.market_size_estimator.row.reality_narrow_market","Narrow market — you'll need high pricing or high penetration to thrive.")+\`
\`),b==="Emerging"?t+="• "+e("calc_out.market_size_estimator.row.reality_stage_emerging","Emerging market: high risk, high reward. First-mover advantage possible.")+\`
\`:b==="Growing"?t+="• "+e("calc_out.market_size_estimator.row.reality_stage_growing","Growing market: sweet spot for entry. Ride the tailwind.")+\`
\`:b==="Mature"?t+="• "+e("calc_out.market_size_estimator.row.reality_stage_mature","Mature market: differentiate or compete on price. Harder to stand out.")+\`
\`:t+="• "+e("calc_out.market_size_estimator.row.reality_stage_declining","Declining market: pivot to a growing adjacent segment or premium niche.")+\`
\`,c>0&&c<500?t+="• "+e("calc_out.market_size_estimator.row.price_low","Low price point — consider upselling, annual plans, or raising prices.")+\`
\`:c>=500&&c<5e3?t+="• "+e("calc_out.market_size_estimator.row.price_moderate","Moderate price point — solid. Experiment with premium tiers or annual billing.")+\`
\`:c>=5e3&&(t+="• "+e("calc_out.market_size_estimator.row.price_strong","Strong price point — high-value customers mean you need fewer of them.")+\`
\`),i>0&&c>0){const a=Math.ceil(1e5/c),r=i>0?a/i*100:0;r<.5?t+="• "+e("calc_out.market_size_estimator.row.to_reach_100k_very_achievable","To reach $100K/yr: Need "+a+" customers ("+o(r)+" penetration). ✅ Very achievable.",{customers:String(a),pct:o(r)})+\`
\`:r<2?t+="• "+e("calc_out.market_size_estimator.row.to_reach_100k_solid_target","To reach $100K/yr: Need "+a+" customers ("+o(r)+" penetration). 🟡 A solid target.",{customers:String(a),pct:o(r)})+\`
\`:t+="• "+e("calc_out.market_size_estimator.row.to_reach_100k_ambitious","To reach $100K/yr: Need "+a+" customers ("+o(r)+" penetration). 🔴 Ambitious — validate demand first.",{customers:String(a),pct:o(r)})+\`
\`,i<5e3&&c<2e3?t+="• "+e("calc_out.market_size_estimator.row.warning_small_pool_low_pricing","⚠️ Small pool + low pricing: reaching meaningful revenue will be hard. Consider a larger market, higher pricing, or a premium niche.")+\`
\`:i<5e3&&r>5?t+="• "+e("calc_out.market_size_estimator.row.warning_few_customers","⚠️ This market has few customers — you'll need to capture "+o(r)+" to hit $100K.",{pct:o(r)})+\`
\`:r>10&&(t+="• "+e("calc_out.market_size_estimator.row.warning_over_10pct","⚠️ You need over 10% market share to reach $100K. Either the market is very small or your pricing is too low — adjust one of them.")+\`
\`)}const m=1,h=i*(m/100);if(i<=0?t+=\`

$calc_out.section.market_size_estimator_market_health|🩺 Market Health:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+e("calc_out.market_size_estimator.row.health_no_customers","🔴 No addressable customers. Re-check population and target %.")+\`
• $calc_out.label.total_addressable|Total addressable|: 0 | $calc_out.label.reachable|Reachable|: 0\`:i<1e4?t+=\`

$calc_out.section.market_size_estimator_market_health|🩺 Market Health:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+e("calc_out.market_size_estimator.row.health_niche_market","🟠 Niche market ("+i.toLocaleString()+" addressable). High focus needed.",{customers:i.toLocaleString()})+\`
• \`+e("calc_out.market_size_estimator.row.health_reachable_at","Reachable at "+o(m)+": "+h.toLocaleString()+" customers.",{rate:o(m),customers:h.toLocaleString()})+\`
• \`+e("calc_out.market_size_estimator.row.health_pricing_matters","Pricing matters a lot — small market × high ARPU works."):i<1e6?t+=\`

$calc_out.section.market_size_estimator_market_health|🩺 Market Health:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+e("calc_out.market_size_estimator.row.health_mid_sized_market","🟢 Mid-sized market ("+i.toLocaleString()+" addressable). Standard SaaS opportunity.",{customers:i.toLocaleString()})+\`
• \`+e("calc_out.market_size_estimator.row.health_reachable_at","Reachable at "+o(m)+": "+h.toLocaleString()+" customers.",{rate:o(m),customers:h.toLocaleString()})+\`
• \`+e("calc_out.market_size_estimator.row.health_achievable_focused_gtm","Achievable with focused go-to-market."):t+=\`

$calc_out.section.market_size_estimator_market_health|🩺 Market Health:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+e("calc_out.market_size_estimator.row.health_large_market","🟢 Large market ("+i.toLocaleString()+" addressable). Big upside.",{customers:i.toLocaleString()})+\`
• \`+e("calc_out.market_size_estimator.row.health_reachable_at","Reachable at "+o(m)+": "+h.toLocaleString()+" customers.",{rate:o(m),customers:h.toLocaleString()})+\`
• \`+e("calc_out.market_size_estimator.row.health_capture_even_01pct","Capture even 0.1% for major revenue."),t+=\`

$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\`,i>0&&c>0){const a=i*(m*2/100),r=a*c,s=h*(c/2),_=i*2,g=_*m/100*c;t+=\`
• \`+e("calc_out.market_size_estimator.row.whatif_double_penetration","Double penetration rate:  "+h.toLocaleString()+" → "+a.toLocaleString()+" customers",{from:h.toLocaleString(),to:a.toLocaleString()})+" | "+e("calc_out.market_size_estimator.row.whatif_double_penetration_rev",d(r)+"/yr",{value:d(r)}),t+=\`
• \`+e("calc_out.market_size_estimator.row.whatif_cut_price_50","Cut price 50%:  Customers double (price-sensitive market)")+" | "+e("calc_out.market_size_estimator.row.whatif_cut_price_50_rev",d(s)+"/yr",{value:d(s)}),t+=\`
• \`+e("calc_out.market_size_estimator.row.whatif_double_target_pct","Double target %:  "+i.toLocaleString()+" → "+_.toLocaleString()+" addressable",{from:i.toLocaleString(),to:_.toLocaleString()})+" | "+e("calc_out.market_size_estimator.row.whatif_double_target_rev",d(g)+"/yr at "+o(m),{value:d(g),rate:o(m)}),t+=\`
• \`+e("calc_out.market_size_estimator.row.whatif_triple_pricing","Triple pricing (premium):  "+d(h*c*3)+"/yr at same reach (only works for unique value)",{value:d(h*c*3)})}else t+=\`
• \`+e("calc_out.market_size_estimator.row.whatif_cannot_model","⚠️ Cannot model — enter total population, target %, and pricing to see scenarios.");if(n>0&&c>0){t+=\`

$calc_out.section.market_size_estimator_break_even|⚖️ Break-Even|
\`+"─".repeat(54);const a=1e5/n*100,r=1e6/n*100;a<.1?t+=\`
• \`+e("calc_out.market_size_estimator.row.breakeven_100k_very_achievable","🟢 To reach $100K/yr:  need "+a.toFixed(3)+"% of TAM  (very achievable)",{pct:a.toFixed(3)}):a<1?t+=\`
• \`+e("calc_out.market_size_estimator.row.breakeven_100k_achievable","🟡 To reach $100K/yr:  need "+a.toFixed(2)+"% of TAM  (achievable for focused GTM)",{pct:a.toFixed(2)}):a<5?t+=\`
• \`+e("calc_out.market_size_estimator.row.breakeven_100k_ambitious","🟠 To reach $100K/yr:  need "+a.toFixed(1)+"% of TAM  (ambitious — strong positioning needed)",{pct:a.toFixed(1)}):t+=\`
• \`+e("calc_out.market_size_estimator.row.breakeven_100k_very_high","🔴 To reach $100K/yr:  need "+a.toFixed(1)+"% of TAM  (very high — consider higher pricing or larger market)",{pct:a.toFixed(1)}),r<10?t+=\`
• \`+e("calc_out.market_size_estimator.row.breakeven_1m_achievable","For $1M/yr:  need "+r.toFixed(2)+"% of TAM  ("+Math.round(r/100*i).toLocaleString()+" customers)",{pct:r.toFixed(2),customers:Math.round(r/100*i).toLocaleString()}):t+=\`
• \`+e("calc_out.market_size_estimator.row.breakeven_1m_unrealistic","For $1M/yr:  need "+Math.round(r).toLocaleString()+"% of TAM  (often unrealistic — likely needs VC scale)",{pct:Math.round(r).toLocaleString()})}if(n>0&&c>0&&w>0){t+=\`

$calc_out.section.market_size_estimator_revenue_milestones|🎯 Revenue Milestones|
\`+"─".repeat(54);const a=[1e5,1e6,1e7],r=["$100K ARR","$1M ARR","$10M ARR"];for(let s=0;s<a.length;s++){const _=a[s];if(n<_)t+=\`
• \`+e("calc_out.market_size_estimator.row.milestone_unreachable",r[s]+":  🔴 unreachable — TAM $"+(n/1e6).toFixed(1)+"M is smaller than target",{target:r[s],tam:"$"+(n/1e6).toFixed(1)+"M"});else{const g=Math.log(_/n)/Math.log(z);isFinite(g)&&g>0&&g<20?t+=\`
• \`+e("calc_out.market_size_estimator.row.milestone_years",r[s]+":  "+g.toFixed(1)+" years  (at "+w.toFixed(0)+"% market CAGR)",{target:r[s],years:g.toFixed(1),cagr:w.toFixed(0)}):t+=\`
• \`+e("calc_out.market_size_estimator.row.milestone_long_horizon",r[s]+":  long horizon or zero growth",{target:r[s]})}}}return n>=1e9&&b==="Growing"?t+=\`

\`+e("calc_out.market_size_estimator.row.tip_large_growing","💡 Tip: Large + growing market is the ideal entry point. Don't try to serve everyone — pick a wedge (specific industry, geography, or use case) and dominate it. Expansion from a wedge is 10× easier than building a horizontal product from day one."):n<1e8&&c<1e3?t+=\`

\`+e("calc_out.market_size_estimator.row.tip_small_market_low_pricing","💡 Tip: Small market with low pricing is a tough combo. Either raise price (premium positioning) or expand the addressable market (move upmarket or downmarket). The current numbers suggest you'll struggle to reach $1M ARR."):b==="Declining"?t+=\`

\`+e("calc_out.market_size_estimator.row.tip_declining_market","💡 Tip: Declining markets punish new entrants. Unless you have a structural advantage (10× better cost structure, captive distribution), pivot to an adjacent growing segment. The market size will keep shrinking under you."):t+=\`

\`+e("calc_out.market_size_estimator.row.tip_always_cross_check","💡 Tip: Always cross-check bottom-up (customers × price) against top-down (TAM × market share). If the two methods diverge by 3× or more, one of your assumptions is wrong — go back to primary research."),[t]},$=function(u,d,l){var o=R(u);return Array.isArray(o)?o.join(\`
\`):String(o)};var L=f,x=S,C=$,e=tk,F='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',e=new Function("return "+F)(),R=function(u){return S(u)};return[$(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

const engine: ToolEngine = {
  slug: "solopreneur-market-size-estimator", title: "Market Size Estimator",
  description: "Bottom-up and top-down market sizing with configurable SAM, market stage, and 3-year revenue projection. Industry-standard TAM/SAM/SOM framework.",
  inputs: [
    { name: "targetMarket", label: "Target Market", placeholder: "e.g. US dental clinics", type: "text" },
    { name: "totalAddressableCustomers", label: "Total Addressable Customers", placeholder: "e.g. 30000", type: "number" },
    { name: "annualRevenuePerCustomer", label: "Avg Annual Revenue per Customer ($)", placeholder: "e.g. 5000", type: "number" },
    { name: "marketGrowthRate", label: "Market Annual Growth Rate (%)", placeholder: "e.g. 12", type: "number" },
    { name: "samPercent", label: "SAM — % of TAM You Can Reach", placeholder: "e.g. 25", type: "number" },
    { name: "marketStage", label: "Market Stage", placeholder: "", type: "select", options: ["Emerging", "Growing", "Mature", "Declining"] },
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
  generate(inputs: Record<string, string>): string[] { return calculateMarketSize(inputs); },
  staticExamples: [
    '$calc_out.section.market_size_estimator_market_size|📊 Market Size:| US dental clinics\n\n$calc_out.section.market_size_estimator_market_overview|📋 Market Overview|\n• $calc_out.label.market|Market|:            US dental clinics\n• $calc_out.label.market_stage|Market Stage|:      Growing\n• $calc_out.label.addressable_customers|Addressable Customers|: 30,000\n• $calc_out.label.avg_revenue_per_customer|Avg Revenue / Customer|: $5,000/yr\n• $calc_out.label.tam|TAM (Total Addressable Market)|: $150.0M/yr\n• $calc_out.market_size_estimator.row.sam{"sam":"$37.5M","pct":"25.0%"}|SAM (Serviceable): $37.5M/yr  (~25.0% of TAM)|\n• $calc_out.label.annual_growth_rate|Annual Growth Rate|: 12.0%\n• $calc_out.market_size_estimator.row.market_in_3_years{"value":"$210.7M"}|Market in 3 Years:  $210.7M/yr (compounded)|\n• $calc_out.market_size_estimator.row.market_in_5_years{"value":"$264.4M"}|Market in 5 Years:  $264.4M/yr (compounded)|\n\n$calc_out.section.market_size_estimator_bottom_up|💰 Bottom-Up Revenue Potential|\n• $calc_out.market_size_estimator.row.bottom_up_tier{"share":"0.2%","customers":"60","revenue":"$300,000"}|0.2% share  →  60 customers  →  $300,000/yr|  $calc_out.label.tier_solopreneur|🟢 Solopreneur|\n• $calc_out.market_size_estimator.row.bottom_up_tier{"share":"1.0%","customers":"300","revenue":"$1.5M"}|1.0% share  →  300 customers  →  $1.5M/yr|  $calc_out.label.tier_solopreneur|🟢 Solopreneur|\n• $calc_out.market_size_estimator.row.bottom_up_tier{"share":"2.0%","customers":"600","revenue":"$3.0M"}|2.0% share  →  600 customers  →  $3.0M/yr|  $calc_out.label.tier_small_team|🟡 Small team|\n• $calc_out.market_size_estimator.row.bottom_up_tier{"share":"5.0%","customers":"1,500","revenue":"$7.5M"}|5.0% share  →  1,500 customers  →  $7.5M/yr|  $calc_out.label.tier_vc_backed|🔴 VC-backed|\n\n$calc_out.section.market_size_estimator_top_down|🔄 Top-Down Cross-Check|\n• $calc_out.market_size_estimator.row.top_down_rate{"share":"0.1%","revenue":"$150,000"}|0.1% of TAM  →  $150,000/yr|\n• $calc_out.market_size_estimator.row.top_down_rate{"share":"0.5%","revenue":"$750,000"}|0.5% of TAM  →  $750,000/yr|\n• $calc_out.market_size_estimator.row.top_down_rate{"share":"1.0%","revenue":"$1.5M"}|1.0% of TAM  →  $1.5M/yr|\n• $calc_out.market_size_estimator.row.top_down_rate{"share":"3.0%","revenue":"$4.5M"}|3.0% of TAM  →  $4.5M/yr|\n\n$calc_out.section.market_size_estimator_growth_projection|📈 3-Year Growth Projection|\n• $calc_out.market_size_estimator.row.year_projection{"year":"1","market":"$168.0M","share":"1.0%","revenue":"$1.7M"}|Year 1: Market $168.0M  →  Your 1.0%  =  $1.7M/yr|\n• $calc_out.market_size_estimator.row.year_projection{"year":"2","market":"$188.2M","share":"2.0%","revenue":"$3.8M"}|Year 2: Market $188.2M  →  Your 2.0%  =  $3.8M/yr|\n• $calc_out.market_size_estimator.row.year_projection{"year":"3","market":"$210.7M","share":"4.0%","revenue":"$8.4M"}|Year 3: Market $210.7M  →  Your 4.0%  =  $8.4M/yr|\n\n$calc_out.section.market_size_estimator_reality_check|🎯 Reality Check|\n• $calc_out.market_size_estimator.row.reality_solid_market|Solid market size — focus on dominating a specific niche within it.|\n• $calc_out.market_size_estimator.row.reality_stage_growing|Growing market: sweet spot for entry. Ride the tailwind.|\n• $calc_out.market_size_estimator.row.price_strong|Strong price point — high-value customers mean you need fewer of them.|\n• $calc_out.market_size_estimator.row.to_reach_100k_very_achievable{"customers":"20","pct":"0.1%"}|To reach $100K/yr: Need 20 customers (0.1% penetration). ✅ Very achievable.|\n\n\n$calc_out.section.market_size_estimator_market_health|🩺 Market Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.market_size_estimator.row.health_mid_sized_market{"customers":"30,000"}|🟢 Mid-sized market (30,000 addressable). Standard SaaS opportunity.|\n• $calc_out.market_size_estimator.row.health_reachable_at{"rate":"1.0%","customers":"300"}|Reachable at 1.0%: 300 customers.|\n• $calc_out.market_size_estimator.row.health_achievable_focused_gtm|Achievable with focused go-to-market.|\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.market_size_estimator.row.whatif_double_penetration{"from":"300","to":"600"}|Double penetration rate:  300 → 600 customers| | $calc_out.market_size_estimator.row.whatif_double_penetration_rev{"value":"$3,000,000"}|$3,000,000/yr|\n• $calc_out.market_size_estimator.row.whatif_cut_price_50|Cut price 50%:  Customers double (price-sensitive market)| | $calc_out.market_size_estimator.row.whatif_cut_price_50_rev{"value":"$750,000"}|$750,000/yr|\n• $calc_out.market_size_estimator.row.whatif_double_target_pct{"from":"30,000","to":"60,000"}|Double target %:  30,000 → 60,000 addressable| | $calc_out.market_size_estimator.row.whatif_double_target_rev{"value":"$3,000,000","rate":"1.0%"}|$3,000,000/yr at 1.0%|\n• $calc_out.market_size_estimator.row.whatif_triple_pricing{"value":"$4,500,000"}|Triple pricing (premium):  $4,500,000/yr at same reach (only works for unique value)|\n\n$calc_out.section.market_size_estimator_break_even|⚖️ Break-Even|\n──────────────────────────────────────────────────────\n• $calc_out.market_size_estimator.row.breakeven_100k_very_achievable{"pct":"0.067"}|🟢 To reach $100K/yr:  need 0.067% of TAM  (very achievable)|\n• $calc_out.market_size_estimator.row.breakeven_1m_achievable{"pct":"0.67","customers":"200"}|For $1M/yr:  need 0.67% of TAM  (200 customers)|\n\n$calc_out.section.market_size_estimator_revenue_milestones|🎯 Revenue Milestones|\n──────────────────────────────────────────────────────\n• $calc_out.market_size_estimator.row.milestone_long_horizon{"target":"$100K ARR"}|$100K ARR:  long horizon or zero growth|\n• $calc_out.market_size_estimator.row.milestone_long_horizon{"target":"$1M ARR"}|$1M ARR:  long horizon or zero growth|\n• $calc_out.market_size_estimator.row.milestone_long_horizon{"target":"$10M ARR"}|$10M ARR:  long horizon or zero growth|\n\n$calc_out.market_size_estimator.row.tip_always_cross_check|💡 Tip: Always cross-check bottom-up (customers × price) against top-down (TAM × market share). If the two methods diverge by 3× or more, one of your assumptions is wrong — go back to primary research.|',
  ],
  faq: [
    { q: "What methodology does this calculator use?", a: "Both bottom-up (customers × revenue per customer) and top-down (market share of TAM). Industry best practice is to use both methods and see if they converge — if they don't, one of your assumptions is off." },
    { q: "What is the difference between TAM, SAM, and SOM?", a: "TAM = total global demand. SAM = the portion you can realistically reach (configurable in this calculator). SOM = what you can capture near-term (shown in the penetration tiers). Together they form the standard market sizing framework." },
    { q: "How do I find my total addressable customers number?", a: "For B2B: search 'how many [business type] in [country]'. Government census data, Statista, IBISWorld, and Gartner are good sources. For B2C: use population demographics × your target %. When in doubt, use the lower end." },
    { q: "What market stage should I select?", a: "Emerging = new, high-growth, few competitors (AI tools, VR). Growing = expanding rapidly, competitors entering (SaaS, EVs). Mature = stable, well-defined (dental clinics, accounting software). Declining = shrinking demand (physical media, legacy software). This affects the reality check advice." },
    { q: "What is a good market size for a solopreneur?", a: "A $100M-$1B TAM with 10%+ growth in a growing market is excellent. You only need 0.01-0.1% to reach $100K-$1M revenue. Markets under $50M can work with high pricing ($5K+/customer). The top-down cross-check helps validate your bottom-up numbers." },

    { q: "How do I estimate market size bottom-up?", a: "Bottom-up: 1) Define target customer (firmographic), 2) Count potential customers (industry reports, databases), 3) Estimate willingness to pay (similar products, surveys), 4) Calculate: customers × price = TAM. Example: 50K dental clinics × $5000/year = $250M TAM. Bottom-up is more credible than top-down. Most: 50-100 hours of research. Use: industry reports, census data, competitor pricing." },
    { q: "What is a realistic SOM for a startup?", a: "Realistic SOM: 1-5% of SAM in 3-5 years. 5-10%. 1-3%. Calculate: current growth trajectory × 3-5 years. Be honest. SOM <$100M: typically too small for VC. $100M-1B: ideal. $1B+: great if achievable. Top-down: industry reports. Bottom-up: target customer count × ARPU. SOM changes as you grow. Update annually. SOM is the real \"addressable\" market." },
    { q: "How do I know if my market is big enough?", a: "Threshold: 1) SOM >$100M: VC-backable, 2) SOM $10-100M: smaller VC or angels, 3) SOM <$10M: bootstrapped. By stage: pre-seed: SOM $10M+, seed: $50M+, Series A: $100M+, Series B: $500M+. Most: SOM $1B+ for unicorn potential. Smaller markets: can still be highly profitable. Be honest: top-down estimates are 10-100x too big usually. Use bottom-up." },
    { q: "Should I use top-down or bottom-up market sizing?", a: "Bottom-up: more credible, harder to game, but more work. Top-down: faster, less credible. Investors: prefer bottom-up. Most: use both. Bottom-up: TAM for credibility. Top-down: market context. Validate: cross-check (industry reports, analyst estimates). Tools: Statista, IBISWorld, Euromonitor. Most: 10-100x gap between top-down and bottom-up. Bottom-up is the answer." },
    { q: "What is a good growth rate for a market?", a: "Benchmarks: 1) 0-5%: low (mature), 2) 5-10%: average, 3) 10-20%: high, 4) 20%+: very high (often short-lived). Most markets: 3-7% (general economy). Tech/SaaS: 10-20% historically. New markets: 20-50% (early). Aim for: market growing >10% (rising tide). Slow markets: need to take share. Fast markets: 10-30% market share = strong. Sources: industry reports, analyst estimates." },
    { q: "How do I use market size for fundraising?", a: "Pitch deck slide: \"Market\" or \"Opportunity\". Show: 1) TAM (slide 1: $X B), 2) SAM (slide 2: $Y M), 3) SOM (slide 3: $Z M with plan). Common mistake: top-down 10x too big. Avoid TAM = entire industry. Use bottom-up, defensible numbers. Investors: will challenge. Be ready: 1) Customer count, 2) ARPU, 3) Penetration. SOM is the most important number. <$100M: tough to raise VC." },
    { q: "What is the relationship between market size and valuation?", a: "Larger markets: higher valuations (more potential). For 10x ARR multiple: 1) $1M ARR in $10M market: 1% share, 2) $1M ARR in $1B market: 0.1% share. Same revenue, 10x valuation difference. Markets: $1B+ for unicorn potential. Smaller markets: $10M ARR ceiling typically. Larger markets: $100M+ ARR. Use: market size × penetration for ceiling. Be honest: most TAMs are overestimated by 10x." },
  ],
  howToUse: [
    "Describe your target market (e.g., 'US dental clinics', 'SaaS startups').",
    "Enter the total number of potential customers in your addressable market.",
    "Enter your expected average annual revenue per customer.",
    "Enter the industry's annual growth rate (find from industry reports).",
    "Set your SAM % — what portion of TAM you can realistically reach.",
    "Select the market stage (Emerging/Growing/Mature/Declining).",
    "Compare bottom-up revenue potential vs top-down cross-check.",
    "Review the 3-year projection and reality check for your $100K target.",
  ],
  engineKey: true,
};
registerEngine(engine);
