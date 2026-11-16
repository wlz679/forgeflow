// P168 B3-8 —— 「已令牌化引擎」的**单一真相源**。
//
// 为什么抽出来（2026-11-16 实测）
//   本批要把 15 个新引擎加进**全部**守卫（G4/G13 · G6 · G8 · G9 · G12/G12b · G4d），
//   而清单此前散在 4 个文件里（p168-card-text.mjs 的 PILOT、p168-server-client-parity.ts
//   的 PILOT_SLUGS、p168-en-page-parity.ts 的 PILOT_FILES、calc-output-i18n-guard.test.ts
//   的 PILOT_SLUGS Set）⇒ 散着加必然漏 ⇒ 抽成一处。
//
// ⭐ baseline 字段：B3-8 的 G9 需要**按引擎分组**的基线
//   · B3-7 的 10 个试点 → d3b3c1d（B3-7 令牌化之前，不变）
//   · B3-8 的 15 个     → 5c1c789（B3-8 令牌化之前的最后一个提交）
//   ⇒ 基线必须钉在**该组令牌化之前**（G9 工具的自检会验这一点）。

/** @type {{slug:string,file:string,alias:string,baseline:string}[]} */
export const B3_7_PILOTS = [
  { slug: 'solopreneur-mrr-calculator', file: 'src/engines/saas/mrr-calculator.ts', alias: 'mrr', baseline: 'd3b3c1d' },
  { slug: 'solopreneur-rent-vs-buy-calculator', file: 'src/engines/real-estate/rent-vs-buy-calculator.ts', alias: 'rent_vs_buy', baseline: 'd3b3c1d' },
  { slug: 'solopreneur-brrrr-calculator', file: 'src/engines/real-estate/brrrr-calculator.ts', alias: 'brrrr', baseline: 'd3b3c1d' },
  { slug: 'solopreneur-project-profitability-calculator', file: 'src/engines/freelance/project-profitability-calculator.ts', alias: 'project_profitability', baseline: 'd3b3c1d' },
  { slug: 'solopreneur-coupon-attribution-calculator', file: 'src/engines/marketing/coupon-attribution-calculator.ts', alias: 'coupon_attribution', baseline: 'd3b3c1d' },
  { slug: 'solopreneur-saas-valuation-calculator', file: 'src/engines/valuation/saas-valuation-calculator.ts', alias: 'saas_valuation', baseline: 'd3b3c1d' },
  { slug: 'solopreneur-acv-calculator', file: 'src/engines/sales/acv-calculator.ts', alias: 'acv', baseline: 'd3b3c1d' },
  { slug: 'solopreneur-funnel-step-calculator', file: 'src/engines/product-analytics/funnel-step-calculator.ts', alias: 'funnel_step', baseline: 'd3b3c1d' },
  { slug: 'solopreneur-activation-rate-calculator', file: 'src/engines/product-analytics/activation-rate-calculator.ts', alias: 'activation_rate', baseline: 'd3b3c1d' },
  { slug: 'solopreneur-stickiness-calculator', file: 'src/engines/product-analytics/stickiness-calculator.ts', alias: 'stickiness', baseline: 'd3b3c1d' },
];

/** @type {{slug:string,file:string,alias:string,baseline:string}[]} */
export const B3_8_BATCH = [
  { slug: 'solopreneur-time-value-calculator', file: 'src/engines/investment/time-value-calculator.ts', alias: 'time_value', baseline: '5c1c789' },
  { slug: 'solopreneur-freelance-rate-calculator', file: 'src/engines/freelance/freelance-rate-calculator.ts', alias: 'freelance_rate', baseline: '5c1c789' },
  { slug: 'solopreneur-reorder-point-calculator', file: 'src/engines/operations/reorder-point-calculator.ts', alias: 'reorder_point', baseline: '5c1c789' },
  { slug: 'solopreneur-feature-adoption-calculator', file: 'src/engines/product-analytics/feature-adoption-calculator.ts', alias: 'feature_adoption', baseline: '5c1c789' },
  { slug: 'solopreneur-safe-convertible-note-calculator', file: 'src/engines/valuation/safe-convertible-note-calculator.ts', alias: 'safe_convertible_note', baseline: '5c1c789' },
  { slug: 'solopreneur-stripe-fee-calculator', file: 'src/engines/valuation/stripe-fee-calculator.ts', alias: 'stripe_fee', baseline: '5c1c789' },
  { slug: 'solopreneur-stockout-cost-calculator', file: 'src/engines/operations/stockout-cost-calculator.ts', alias: 'stockout_cost', baseline: '5c1c789' },
  { slug: 'solopreneur-ai-api-cost-comparison', file: 'src/engines/ai-cost/ai-api-cost-comparison.ts', alias: 'ai_api_cost_comparison', baseline: '5c1c789' },
  { slug: 'solopreneur-rental-yield-calculator', file: 'src/engines/real-estate/rental-yield-calculator.ts', alias: 'rental_yield', baseline: '5c1c789' },
  { slug: 'solopreneur-sales-velocity-calculator', file: 'src/engines/sales/sales-velocity-calculator.ts', alias: 'sales_velocity', baseline: '5c1c789' },
  { slug: 'solopreneur-freelance-tax-calculator', file: 'src/engines/investment/freelance-tax-calculator.ts', alias: 'freelance_tax', baseline: '5c1c789' },
  { slug: 'solopreneur-quota-attainment-calculator', file: 'src/engines/sales/quota-attainment-calculator.ts', alias: 'quota_attainment', baseline: '5c1c789' },
  { slug: 'solopreneur-burn-rate-calculator', file: 'src/engines/saas/burn-rate-calculator.ts', alias: 'burn_rate', baseline: '5c1c789' },
  { slug: 'solopreneur-cart-abandonment-cost-calculator', file: 'src/engines/marketing/cart-abandonment-cost-calculator.ts', alias: 'cart_abandonment_cost', baseline: '5c1c789' },
  { slug: 'solopreneur-inventory-turnover-calculator', file: 'src/engines/operations/inventory-turnover-calculator.ts', alias: 'inventory_turnover', baseline: '5c1c789' },
];

export const TOKENIZED = [...B3_7_PILOTS, ...B3_8_BATCH];

/** 按 slug 取基线 SHA（未知 slug 回落到 B3-8 的基线） */
export function baselineFor(slug) {
  const hit = TOKENIZED.find((e) => e.slug === slug);
  return hit ? hit.baseline : '5c1c789';
}
