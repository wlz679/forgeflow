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
    result += "\n• " + makeToken('calc_out.market_size_estimator.row.whatif_double_penetration', 'Double penetration rate:  ' + reachable.toLocaleString() + ' → ' + doublePenetration.toLocaleString() + ' customers', { from: reachable.toLocaleString(), to: doublePenetration.toLocaleString() }) + " | " + makeToken('calc_out.market_size_estimator.row.whatif_double_penetration_rev', '$' + fmt(revAtDouble) + '/yr', { value: '$' + fmt(revAtDouble) });
    result += "\n• " + makeToken('calc_out.market_size_estimator.row.whatif_cut_price_50', 'Cut price 50%:  Customers double (price-sensitive market)') + " | " + makeToken('calc_out.market_size_estimator.row.whatif_cut_price_50_rev', '$' + fmt(revAtHalfPrice) + '/yr', { value: '$' + fmt(revAtHalfPrice) });
    result += "\n• " + makeToken('calc_out.market_size_estimator.row.whatif_double_target_pct', 'Double target %:  ' + totalCustomers.toLocaleString() + ' → ' + doubleCustomers.toLocaleString() + ' addressable', { from: totalCustomers.toLocaleString(), to: doubleCustomers.toLocaleString() }) + " | " + makeToken('calc_out.market_size_estimator.row.whatif_double_target_rev', '$' + fmt(revAtDoubleMarket) + '/yr at ' + pct(penetrationRate), { value: '$' + fmt(revAtDoubleMarket), rate: pct(penetrationRate) });
    result += "\n• " + makeToken('calc_out.market_size_estimator.row.whatif_triple_pricing', 'Triple pricing (premium):  $' + fmt(reachable * annualRevPerCustomer * 3) + '/yr at same reach (only works for unique value)', { value: '$' + fmt(reachable * annualRevPerCustomer * 3) });
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
  CALC_OUTPUT_MAKE_TOKEN_JS +
  "function fmt(n){return '$'+Math.round(n).toLocaleString()}function fmtM(n){if(Math.abs(n)>=1e9)return '$'+(n/1e9).toFixed(2)+'B';if(Math.abs(n)>=1e6)return '$'+(n/1e6).toFixed(1)+'M';return '$'+Math.round(n).toLocaleString()}function pct(n){return n.toFixed(1)+'%'}function loc(n){return n.toLocaleString()}" +
  "var cnn=function(x){return Math.max(0,x)};var tm=inputs.targetMarket||'your market';var tc=cnn(parseInt(inputs.totalAddressableCustomers)||0);var ar=cnn(parseFloat(inputs.annualRevenuePerCustomer)||0);var gr=cnn(parseFloat(inputs.marketGrowthRate)||0);var sp=cnn(parseFloat(inputs.samPercent)||25);var ms=inputs.marketStage||'Growing';var tam=tc*ar;var gf=1+gr/100;" +
  "var sa={};sa['Emerging']=1.5;sa['Growing']=1.0;sa['Mature']=0.7;sa['Declining']=0.4;var sadj=sa[ms]||1.0;" +
  "var tiers=[];if(tc>100000)tiers=[{r:0.001,l:'$calc_out.label.tier_solopreneur|\\uD83D\\uDFE2 Solopreneur|'},{r:0.005,l:'$calc_out.label.tier_solopreneur|\\uD83D\\uDFE2 Solopreneur|'},{r:0.01,l:'$calc_out.label.tier_small_team|\\uD83D\\uDFE1 Small team|'},{r:0.03,l:'$calc_out.label.tier_vc_backed|\\uD83D\\uDD34 VC-backed|'}];else if(tc>10000)tiers=[{r:0.002,l:'$calc_out.label.tier_solopreneur|\\uD83D\\uDFE2 Solopreneur|'},{r:0.01,l:'$calc_out.label.tier_solopreneur|\\uD83D\\uDFE2 Solopreneur|'},{r:0.02,l:'$calc_out.label.tier_small_team|\\uD83D\\uDFE1 Small team|'},{r:0.05,l:'$calc_out.label.tier_vc_backed|\\uD83D\\uDD34 VC-backed|'}];else tiers=[{r:0.005,l:'$calc_out.label.tier_solopreneur|\\uD83D\\uDFE2 Solopreneur|'},{r:0.02,l:'$calc_out.label.tier_solopreneur|\\uD83D\\uDFE2 Solopreneur|'},{r:0.05,l:'$calc_out.label.tier_small_team|\\uD83D\\uDFE1 Small team|'},{r:0.1,l:'$calc_out.label.tier_vc_backed|\\uD83D\\uDD34 VC-backed|'}];" +
  "var r='$calc_out.section.market_size_estimator_market_size|\\uD83D\\uDCCA Market Size:|'+' '+tm+'\\n\\n$calc_out.section.market_size_estimator_market_overview|\\uD83D\\uDCCB Market Overview|\\n';if(tm)r+='\\u2022 $calc_out.label.market|Market|:            '+tm+'\\n';r+='\\u2022 $calc_out.label.market_stage|Market Stage|:      '+ms+'\\n';r+='\\u2022 $calc_out.label.addressable_customers|Addressable Customers|: '+loc(tc)+'\\n\\u2022 $calc_out.label.avg_revenue_per_customer|Avg Revenue / Customer|: '+fmt(ar)+'/yr\\n\\u2022 $calc_out.label.tam|TAM (Total Addressable Market)|: '+fmtM(tam)+'/yr\\n';if(tam>0)r+='\\u2022 '+tk('calc_out.market_size_estimator.row.sam','SAM (Serviceable): '+fmtM(tam*sp/100)+'/yr  (~'+pct(sp)+' of TAM)',{sam:fmtM(tam*sp/100),pct:pct(sp)})+'\\n';r+='\\u2022 $calc_out.label.annual_growth_rate|Annual Growth Rate|: '+pct(gr)+'\\n';" +
  "if(gr>0){var y3=tam*Math.pow(gf,3);var y5=tam*Math.pow(gf,5);r+='\\u2022 '+tk('calc_out.market_size_estimator.row.market_in_3_years','Market in 3 Years:  '+fmtM(y3)+'/yr (compounded)',{value:fmtM(y3)})+'\\n\\u2022 '+tk('calc_out.market_size_estimator.row.market_in_5_years','Market in 5 Years:  '+fmtM(y5)+'/yr (compounded)',{value:fmtM(y5)})+'\\n';}" +
  "if(tc>0&&ar>0){r+='\\n$calc_out.section.market_size_estimator_bottom_up|\\uD83D\\uDCB0 Bottom-Up Revenue Potential|\\n';for(var i=0;i<tiers.length;i++){var tr=tiers[i];var cust=Math.round(tc*tr.r);r+='\\u2022 '+tk('calc_out.market_size_estimator.row.bottom_up_tier',pct(tr.r*100)+' share  \\u2192  '+loc(cust)+' customers  \\u2192  '+fmtM(cust*ar)+'/yr',{share:pct(tr.r*100),customers:loc(cust),revenue:fmtM(cust*ar)})+'  '+tr.l+'\\n';}" +
  "r+='\\n$calc_out.section.market_size_estimator_top_down|\\uD83D\\uDD04 Top-Down Cross-Check|\\n';var tdR=[0.001,0.005,0.01,0.03];for(var ti=0;ti<tdR.length;ti++){var rev=tam*tdR[ti]*sadj;r+='\\u2022 '+(sadj!==1.0?tk('calc_out.market_size_estimator.row.top_down_rate_stage_adjusted',pct(tdR[ti]*100)+' of TAM  \\u2192  '+fmtM(rev)+'/yr  (stage-adjusted)',{share:pct(tdR[ti]*100),revenue:fmtM(rev)}):tk('calc_out.market_size_estimator.row.top_down_rate',pct(tdR[ti]*100)+' of TAM  \\u2192  '+fmtM(rev)+'/yr',{share:pct(tdR[ti]*100),revenue:fmtM(rev)}))+'\\n';}}" +
  "if(tc>0&&ar>0&&gr>0){var st=tiers[1].r;var mxP=tc>100000?0.05:tc>10000?0.08:0.12;r+='\\n$calc_out.section.market_size_estimator_growth_projection|\\uD83D\\uDCC8 3-Year Growth Projection|\\n';for(var yr=1;yr<=3;yr++){var my=tam*Math.pow(gf,yr);var raw=st*Math.pow(2,yr-1);var yrRate=Math.min(raw,mxP);r+='\\u2022 '+(raw>mxP?tk('calc_out.market_size_estimator.row.year_projection_capped','Year '+yr+': Market '+fmtM(my)+'  \\u2192  Your '+pct(yrRate*100)+'  =  '+fmtM(my*yrRate)+'/yr (capped)',{year:String(yr),market:fmtM(my),share:pct(yrRate*100),revenue:fmtM(my*yrRate)}):tk('calc_out.market_size_estimator.row.year_projection','Year '+yr+': Market '+fmtM(my)+'  \\u2192  Your '+pct(yrRate*100)+'  =  '+fmtM(my*yrRate)+'/yr',{year:String(yr),market:fmtM(my),share:pct(yrRate*100),revenue:fmtM(my*yrRate)}))+'\\n';}}" +
  "r+='\\n$calc_out.section.market_size_estimator_reality_check|\\uD83C\\uDFAF Reality Check|\\n';if(tam>=1e9)r+='\\u2022 '+tk('calc_out.market_size_estimator.row.reality_huge_market','Huge market \\u2014 you don\\'t need a large share to build a great business.')+'\\n';else if(tam>=100e6)r+='\\u2022 '+tk('calc_out.market_size_estimator.row.reality_solid_market','Solid market size \\u2014 focus on dominating a specific niche within it.')+'\\n';else if(tam>0)r+='\\u2022 '+tk('calc_out.market_size_estimator.row.reality_narrow_market','Narrow market \\u2014 you\\'ll need high pricing or high penetration to thrive.')+'\\n';" +
  "if(ms==='Emerging')r+='\\u2022 '+tk('calc_out.market_size_estimator.row.reality_stage_emerging','Emerging market: high risk, high reward. First-mover advantage possible.')+'\\n';else if(ms==='Growing')r+='\\u2022 '+tk('calc_out.market_size_estimator.row.reality_stage_growing','Growing market: sweet spot for entry. Ride the tailwind.')+'\\n';else if(ms==='Mature')r+='\\u2022 '+tk('calc_out.market_size_estimator.row.reality_stage_mature','Mature market: differentiate or compete on price. Harder to stand out.')+'\\n';else r+='\\u2022 '+tk('calc_out.market_size_estimator.row.reality_stage_declining','Declining market: pivot to a growing adjacent segment or premium niche.')+'\\n';" +
  "if(ar>0&&ar<500)r+='\\u2022 '+tk('calc_out.market_size_estimator.row.price_low','Low price point \\u2014 consider upselling, annual plans, or raising prices.')+'\\n';else if(ar>=500&&ar<5000)r+='\\u2022 '+tk('calc_out.market_size_estimator.row.price_moderate','Moderate price point \\u2014 solid. Experiment with premium tiers or annual billing.')+'\\n';else if(ar>=5000)r+='\\u2022 '+tk('calc_out.market_size_estimator.row.price_strong','Strong price point \\u2014 high-value customers mean you need fewer of them.')+'\\n';" +
  "if(tc>0&&ar>0){var c4=Math.ceil(100000/ar);var p4=tc>0?(c4/tc)*100:0;if(p4<0.5)r+='\\u2022 '+tk('calc_out.market_size_estimator.row.to_reach_100k_very_achievable','To reach $100K/yr: Need '+c4+' customers ('+pct(p4)+' penetration). \\u2705 Very achievable.',{customers:String(c4),pct:pct(p4)})+'\\n';else if(p4<2)r+='\\u2022 '+tk('calc_out.market_size_estimator.row.to_reach_100k_solid_target','To reach $100K/yr: Need '+c4+' customers ('+pct(p4)+' penetration). \\uD83D\\uDFE1 A solid target.',{customers:String(c4),pct:pct(p4)})+'\\n';else r+='\\u2022 '+tk('calc_out.market_size_estimator.row.to_reach_100k_ambitious','To reach $100K/yr: Need '+c4+' customers ('+pct(p4)+' penetration). \\uD83D\\uDD34 Ambitious \\u2014 validate demand first.',{customers:String(c4),pct:pct(p4)})+'\\n';" +
  "if(tc<5000&&ar<2000)r+='\\u2022 '+tk('calc_out.market_size_estimator.row.warning_small_pool_low_pricing','\\u26A0\\uFE0F Small pool + low pricing: reaching meaningful revenue will be hard. Consider a larger market, higher pricing, or a premium niche.')+'\\n';else if(tc<5000&&p4>5)r+='\\u2022 '+tk('calc_out.market_size_estimator.row.warning_few_customers','\\u26A0\\uFE0F This market has few customers \\u2014 you\\'ll need to capture '+pct(p4)+' to hit $100K.',{pct:pct(p4)})+'\\n';else if(p4>10)r+='\\u2022 '+tk('calc_out.market_size_estimator.row.warning_over_10pct','\\u26A0\\uFE0F You need over 10% market share to reach $100K. Either the market is very small or your pricing is too low \\u2014 adjust one of them.')+'\\n';}" +
  "var pen=1;var reach=tc*(pen/100);" +
  "if(tc<=0){r+='\\n\\n$calc_out.section.market_size_estimator_market_health|\\uD83E\\uDE7A Market Health:|\\n'+'\\u2501'.repeat(54)+'\\n\\u2022 '+tk('calc_out.market_size_estimator.row.health_no_customers','\\uD83D\\uDD34 No addressable customers. Re-check population and target %.')+'\\n\\u2022 $calc_out.label.total_addressable|Total addressable|: 0 | $calc_out.label.reachable|Reachable|: 0';}" +
  "else if(tc<10000){r+='\\n\\n$calc_out.section.market_size_estimator_market_health|\\uD83E\\uDE7A Market Health:|\\n'+'\\u2501'.repeat(54)+'\\n\\u2022 '+tk('calc_out.market_size_estimator.row.health_niche_market','\\uD83D\\uDFE0 Niche market ('+tc.toLocaleString()+' addressable). High focus needed.',{customers:tc.toLocaleString()})+'\\n\\u2022 '+tk('calc_out.market_size_estimator.row.health_reachable_at','Reachable at '+pct(pen)+': '+reach.toLocaleString()+' customers.',{rate:pct(pen),customers:reach.toLocaleString()})+'\\n\\u2022 '+tk('calc_out.market_size_estimator.row.health_pricing_matters','Pricing matters a lot \\u2014 small market \\u00D7 high ARPU works.');}" +
  "else if(tc<1000000){r+='\\n\\n$calc_out.section.market_size_estimator_market_health|\\uD83E\\uDE7A Market Health:|\\n'+'\\u2501'.repeat(54)+'\\n\\u2022 '+tk('calc_out.market_size_estimator.row.health_mid_sized_market','\\uD83D\\uDFE2 Mid-sized market ('+tc.toLocaleString()+' addressable). Standard SaaS opportunity.',{customers:tc.toLocaleString()})+'\\n\\u2022 '+tk('calc_out.market_size_estimator.row.health_reachable_at','Reachable at '+pct(pen)+': '+reach.toLocaleString()+' customers.',{rate:pct(pen),customers:reach.toLocaleString()})+'\\n\\u2022 '+tk('calc_out.market_size_estimator.row.health_achievable_focused_gtm','Achievable with focused go-to-market.');}" +
  "else{r+='\\n\\n$calc_out.section.market_size_estimator_market_health|\\uD83E\\uDE7A Market Health:|\\n'+'\\u2501'.repeat(54)+'\\n\\u2022 '+tk('calc_out.market_size_estimator.row.health_large_market','\\uD83D\\uDFE2 Large market ('+tc.toLocaleString()+' addressable). Big upside.',{customers:tc.toLocaleString()})+'\\n\\u2022 '+tk('calc_out.market_size_estimator.row.health_reachable_at','Reachable at '+pct(pen)+': '+reach.toLocaleString()+' customers.',{rate:pct(pen),customers:reach.toLocaleString()})+'\\n\\u2022 '+tk('calc_out.market_size_estimator.row.health_capture_even_01pct','Capture even 0.1% for major revenue.');}" +
  "r+='\\n\\n$calc_out.section.what_if_scenarios|\\uD83D\\uDD04 What-If Scenarios:|\\n'+'\\u2501'.repeat(54);" +
  "if(tc>0&&ar>0){var dPen=tc*(pen*2/100);var revD=dPen*ar;var revH=reach*(ar/2);var dCust=tc*2;var revDM=(dCust*pen/100)*ar;" +
  "r+='\\n\\u2022 '+tk('calc_out.market_size_estimator.row.whatif_double_penetration','Double penetration rate:  '+reach.toLocaleString()+' \\u2192 '+dPen.toLocaleString()+' customers',{from:reach.toLocaleString(),to:dPen.toLocaleString()})+' | '+tk('calc_out.market_size_estimator.row.whatif_double_penetration_rev','$'+fmt(revD)+'/yr',{value:'$'+fmt(revD)});" +
  "r+='\\n\\u2022 '+tk('calc_out.market_size_estimator.row.whatif_cut_price_50','Cut price 50%:  Customers double (price-sensitive market)')+' | '+tk('calc_out.market_size_estimator.row.whatif_cut_price_50_rev','$'+fmt(revH)+'/yr',{value:'$'+fmt(revH)});" +
  "r+='\\n\\u2022 '+tk('calc_out.market_size_estimator.row.whatif_double_target_pct','Double target %:  '+tc.toLocaleString()+' \\u2192 '+dCust.toLocaleString()+' addressable',{from:tc.toLocaleString(),to:dCust.toLocaleString()})+' | '+tk('calc_out.market_size_estimator.row.whatif_double_target_rev','$'+fmt(revDM)+'/yr at '+pct(pen),{value:'$'+fmt(revDM),rate:pct(pen)});" +
  "r+='\\n\\u2022 '+tk('calc_out.market_size_estimator.row.whatif_triple_pricing','Triple pricing (premium):  $'+fmt(reach*ar*3)+'/yr at same reach (only works for unique value)',{value:'$'+fmt(reach*ar*3)});" +
  "}else{r+='\\n\\u2022 '+tk('calc_out.market_size_estimator.row.whatif_cannot_model','\\u26A0\\uFE0F Cannot model \\u2014 enter total population, target %, and pricing to see scenarios.');}" +
  "if(tam>0&&ar>0){r+='\\n\\n$calc_out.section.market_size_estimator_break_even|\\u2696\\uFE0F Break-Even|\\n'+'\\u2500'.repeat(54);var pf100=(1e5/tam)*100;var pf1m=(1e6/tam)*100;if(pf100<0.1)r+='\\n\\u2022 '+tk('calc_out.market_size_estimator.row.breakeven_100k_very_achievable','\\uD83D\\uDFE2 To reach $100K/yr:  need '+pf100.toFixed(3)+'% of TAM  (very achievable)',{pct:pf100.toFixed(3)});else if(pf100<1)r+='\\n\\u2022 '+tk('calc_out.market_size_estimator.row.breakeven_100k_achievable','\\uD83D\\uDFE1 To reach $100K/yr:  need '+pf100.toFixed(2)+'% of TAM  (achievable for focused GTM)',{pct:pf100.toFixed(2)});else if(pf100<5)r+='\\n\\u2022 '+tk('calc_out.market_size_estimator.row.breakeven_100k_ambitious','\\uD83D\\uDFE0 To reach $100K/yr:  need '+pf100.toFixed(1)+'% of TAM  (ambitious \\u2014 strong positioning needed)',{pct:pf100.toFixed(1)});else r+='\\n\\u2022 '+tk('calc_out.market_size_estimator.row.breakeven_100k_very_high','\\uD83D\\uDD34 To reach $100K/yr:  need '+pf100.toFixed(1)+'% of TAM  (very high \\u2014 consider higher pricing or larger market)',{pct:pf100.toFixed(1)});if(pf1m<10)r+='\\n\\u2022 '+tk('calc_out.market_size_estimator.row.breakeven_1m_achievable','For $1M/yr:  need '+pf1m.toFixed(2)+'% of TAM  ('+Math.round(pf1m/100*tc).toLocaleString()+' customers)',{pct:pf1m.toFixed(2),customers:Math.round(pf1m/100*tc).toLocaleString()});else r+='\\n\\u2022 '+tk('calc_out.market_size_estimator.row.breakeven_1m_unrealistic','For $1M/yr:  need '+Math.round(pf1m).toLocaleString()+'% of TAM  (often unrealistic \\u2014 likely needs VC scale)',{pct:Math.round(pf1m).toLocaleString()});}" +
  "if(tam>0&&ar>0&&gr>0){r+='\\n\\n$calc_out.section.market_size_estimator_revenue_milestones|\\uD83C\\uDFAF Revenue Milestones|\\n'+'\\u2500'.repeat(54);var trs=[1e5,1e6,1e7];var tls=['$100K ARR','$1M ARR','$10M ARR'];for(var ri=0;ri<trs.length;ri++){var tgt=trs[ri];if(tam<tgt)r+='\\n\\u2022 '+tk('calc_out.market_size_estimator.row.milestone_unreachable',tls[ri]+':  \\uD83D\\uDD34 unreachable \\u2014 TAM $'+(tam/1e6).toFixed(1)+'M is smaller than target',{target:tls[ri],tam:'$'+(tam/1e6).toFixed(1)+'M'});else{var y2=Math.log(tgt/tam)/Math.log(gf);if(isFinite(y2)&&y2>0&&y2<20)r+='\\n\\u2022 '+tk('calc_out.market_size_estimator.row.milestone_years',tls[ri]+':  '+y2.toFixed(1)+' years  (at '+gr.toFixed(0)+'% market CAGR)',{target:tls[ri],years:y2.toFixed(1),cagr:gr.toFixed(0)});else r+='\\n\\u2022 '+tk('calc_out.market_size_estimator.row.milestone_long_horizon',tls[ri]+':  long horizon or zero growth',{target:tls[ri]});}}}" +
  "if(tam>=1e9&&ms==='Growing')r+='\\n\\n'+tk('calc_out.market_size_estimator.row.tip_large_growing','\\uD83D\\uDCA1 Tip: Large + growing market is the ideal entry point. Don\\'t try to serve everyone \\u2014 pick a wedge (specific industry, geography, or use case) and dominate it. Expansion from a wedge is 10\\u00D7 easier than building a horizontal product from day one.');else if(tam<1e8&&ar<1000)r+='\\n\\n'+tk('calc_out.market_size_estimator.row.tip_small_market_low_pricing','\\uD83D\\uDCA1 Tip: Small market with low pricing is a tough combo. Either raise price (premium positioning) or expand the addressable market (move upmarket or downmarket). The current numbers suggest you\\'ll struggle to reach $1M ARR.');else if(ms==='Declining')r+='\\n\\n'+tk('calc_out.market_size_estimator.row.tip_declining_market','\\uD83D\\uDCA1 Tip: Declining markets punish new entrants. Unless you have a structural advantage (10\\u00D7 better cost structure, captive distribution), pivot to an adjacent growing segment. The market size will keep shrinking under you.');else r+='\\n\\n'+tk('calc_out.market_size_estimator.row.tip_always_cross_check','\\uD83D\\uDCA1 Tip: Always cross-check bottom-up (customers \\u00D7 price) against top-down (TAM \\u00D7 market share). If the two methods diverge by 3\\u00D7 or more, one of your assumptions is wrong \\u2014 go back to primary research.');" +
  "return [r];";

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
    '$calc_out.section.market_size_estimator_market_size|📊 Market Size:| your market\n\n$calc_out.section.market_size_estimator_market_overview|📋 Market Overview|\n• $calc_out.label.market|Market|:            your market\n• $calc_out.label.market_stage|Market Stage|:      Growing\n• $calc_out.label.addressable_customers|Addressable Customers|: 0\n• $calc_out.label.avg_revenue_per_customer|Avg Revenue / Customer|: $0/yr\n• $calc_out.label.tam|TAM (Total Addressable Market)|: $0/yr\n• $calc_out.label.annual_growth_rate|Annual Growth Rate|: 0.0%\n\n$calc_out.section.market_size_estimator_reality_check|🎯 Reality Check|\n• $calc_out.market_size_estimator.row.reality_stage_growing|Growing market: sweet spot for entry. Ride the tailwind.|\n\n\n$calc_out.section.market_size_estimator_market_health|🩺 Market Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.market_size_estimator.row.health_no_customers|🔴 No addressable customers. Re-check population and target %.|\n• $calc_out.label.total_addressable|Total addressable|: 0 | $calc_out.label.reachable|Reachable|: 0\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.market_size_estimator.row.whatif_cannot_model|⚠️ Cannot model — enter total population, target %, and pricing to see scenarios.|\n\n$calc_out.market_size_estimator.row.tip_small_market_low_pricing|💡 Tip: Small market with low pricing is a tough combo. Either raise price (premium positioning) or expand the addressable market (move upmarket or downmarket). The current numbers suggest you\'ll struggle to reach $1M ARR.|',
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
