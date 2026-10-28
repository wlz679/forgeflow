// P155 — 2.0 灵魂改造的落点清单（2026-10-27 用户拍板重定）
//
// 这份清单是**实测出来的**，不是拍脑袋选的。
//
// 背景：AdSense 在 2026-10-27 复审给出「低价位内容」。Search Console 实测
// （2026-07-26 → 2026-10-25，92 天）：9,554 展示 / 20 点击 / CTR 0.21% /
// 加权平均排名 29.6，386/567 个查询排在第 5 页以后。
//
// ⇒ **给 437 页平均加同一套板块不会改善平均排名**，只会摊薄权重、把页面间
// 相似度推高（正是政策链接里《适用于 Google 网页搜索的垃圾内容政策》说的
// 规模化内容滥用）。真正的杠杆是「把已经有展示的页面做深」。
//
// 所以 2.0 的落点从「437 页各加板块」重定为「**只投给下面这些页面**」，
// 而且产出必须是**页面独有的结论**（真实行业阈值、跨引擎对比、基于用户输入
// 算出来的建议），不是模板句。
//
// ── 口径（重要）──────────────────────────────────────────────────
// 数据来源：Search Console「Performance on Search」导出（网页.csv），
// 2026-10-27 下载；当时有展示的 URL 共 645 行。
//
// ⚠️ 1. 图表.csv 的逐日展示合计 = 9,554，而网页.csv 的逐页展示合计 =
//    13,383。两者对不上（相差 40%），**原因未查明**（可能是搜索类型口径
//    或抽样差异）。**本清单一律以网页表为唯一分母** —— 它是唯一能定位到
//    URL 的表。
//
// ⚠️ 2. 早先文档里写的「21 页 / 59 页」是**错的**：那两个数字是用
//    **图表表的 9,554 当分母**去累加**网页表的展示**得到的。口径统一后，
//    真实数字是下面这两个。
//
// ⚠️ 3. 404 的 /blog/* URL **不是独立页面** —— 它们会 301 回工具页。
//    所以本清单先把它们的展示**归并**进目标工具页，再算集中度。
//    否则会出现「给一个 404 投资 2.0 内容」的荒唐结论。
//
// ⚠️ 4. history / favorites / recent 三个壳页正在被 noindex，
//    **不在 2.0 的施工对象里**。
//
// ⚠️ 5. GSC 的网页表把 `https://forgeflowkit.com/x/` 与
//    `https://www.forgeflowkit.com/x/` 列为两行（实测 24 组），另有 56 组
//    带 / 不带尾斜杠各一行 ⇒ 共 80 次合并，聚合后剩 565 个页面。
//    本清单**按 pathname 聚合求和**，位置按展示加权。

/** 全站（网页表口径）总展示数 —— 2026-10-27 */
export const TOTAL_SITE_IMPRESSIONS = 13383;

/** 网页表里的 URL 行数（含 www/apex 两种 host）—— 2026-10-27 */
export const INDEXED_URL_COUNT = 645;

/** 按 pathname 聚合后的页面数 —— 2026-10-27 */
export const AGGREGATED_PAGE_COUNT = 565;

/** 活页（200）里扣掉壳页后的候选数 —— 2026-10-27 */
export const CANDIDATE_PAGE_COUNT = 398;

/** 贡献 50% 展示所需的前 N 个页面 —— 2026-10-27 */
export const P1_PAGE_COUNT = 38;

/** 贡献 80% 展示所需的前 N 个页面 —— 2026-10-27 */
export const PRIORITY_PAGE_COUNT = 117;

export type PriorityPageKind = 'tool' | 'hub' | 'topic' | 'home' | 'static';
export type PriorityTier = 'P1' | 'P2';

export interface PriorityPage {
  /** 站点路径，如 /en/solopreneur-acv-calculator/ */
  path: string;
  lang: 'en' | 'zh' | 'root';
  /** tool = 计算器页；hub = 分类页；topic = 主题/指南子页；home = 首页；static = 其它静态页 */
  kind: PriorityPageKind;
  /** 计算器页的工具 slug（可直接喂给 engines / topic 相关代码） */
  slug: string | null;
  /** 92 天内的展示次数（含从 404 blog URL 归并进来的部分） */
  impressions: number;
  /** 92 天内的点击次数 */
  clicks: number;
  /** 点击率（0–1） */
  ctr: number;
  /** 平均排名 */
  position: number;
  /** 其中由 404 blog URL 301 归并进来的展示数 */
  redirectedImpressions: number;
  /** P1 = 前 38 个（占 50% 展示）；P2 = 到第 117 个（占 80%） */
  tier: PriorityTier;
}

/** 2.0 灵魂改造的落点清单，按展示降序 */
export const PRIORITY_PAGES: PriorityPage[] = [
  { path: '/en/solopreneur-gemini-api-cost-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-gemini-api-cost-calculator', impressions: 516, clicks: 0, ctr: 0, position: 26.4, redirectedImpressions: 30, tier: 'P1' },
  { path: '/zh/solopreneur-time-value-calculator', lang: 'zh', kind: 'tool', slug: 'solopreneur-time-value-calculator', impressions: 460, clicks: 2, ctr: 0.0043, position: 9.7, redirectedImpressions: 2, tier: 'P1' },
  { path: '/en/solopreneur-csat-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-csat-calculator', impressions: 402, clicks: 0, ctr: 0, position: 83.7, redirectedImpressions: 295, tier: 'P1' },
  { path: '/en/ai-cost-tools', lang: 'en', kind: 'hub', slug: 'ai-cost-tools', impressions: 369, clicks: 0, ctr: 0, position: 53.8, redirectedImpressions: 0, tier: 'P1' },
  { path: '/zh/solopreneur-freelance-rate-calculator', lang: 'zh', kind: 'tool', slug: 'solopreneur-freelance-rate-calculator', impressions: 331, clicks: 1, ctr: 0.003, position: 18.8, redirectedImpressions: 11, tier: 'P1' },
  { path: '/en/ai-cost-tools/llm-provider-comparison-compare', lang: 'en', kind: 'topic', slug: null, impressions: 293, clicks: 0, ctr: 0, position: 8.2, redirectedImpressions: 0, tier: 'P1' },
  { path: '/zh/solopreneur-reorder-point-calculator', lang: 'zh', kind: 'tool', slug: 'solopreneur-reorder-point-calculator', impressions: 277, clicks: 0, ctr: 0, position: 36.9, redirectedImpressions: 2, tier: 'P1' },
  { path: '/en/saas-metrics', lang: 'en', kind: 'hub', slug: 'saas-metrics', impressions: 276, clicks: 0, ctr: 0, position: 58.1, redirectedImpressions: 0, tier: 'P1' },
  { path: '/en', lang: 'en', kind: 'home', slug: null, impressions: 247, clicks: 0, ctr: 0, position: 20.1, redirectedImpressions: 17, tier: 'P1' },
  { path: '/en/solopreneur-ai-api-cost-comparison', lang: 'en', kind: 'tool', slug: 'solopreneur-ai-api-cost-comparison', impressions: 232, clicks: 0, ctr: 0, position: 60.2, redirectedImpressions: 17, tier: 'P1' },
  { path: '/zh/solopreneur-feature-adoption-calculator', lang: 'zh', kind: 'tool', slug: 'solopreneur-feature-adoption-calculator', impressions: 191, clicks: 0, ctr: 0, position: 11.1, redirectedImpressions: 2, tier: 'P1' },
  { path: '/zh/operations-inventory', lang: 'zh', kind: 'hub', slug: 'operations-inventory', impressions: 176, clicks: 0, ctr: 0, position: 55.2, redirectedImpressions: 0, tier: 'P1' },
  { path: '/en/solopreneur-remote-vs-office-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-remote-vs-office-calculator', impressions: 166, clicks: 1, ctr: 0.006, position: 18.8, redirectedImpressions: 121, tier: 'P1' },
  { path: '/en/solopreneur-roas-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-roas-calculator', impressions: 165, clicks: 0, ctr: 0, position: 44.1, redirectedImpressions: 5, tier: 'P1' },
  { path: '/zh', lang: 'zh', kind: 'home', slug: null, impressions: 164, clicks: 0, ctr: 0, position: 24.6, redirectedImpressions: 27, tier: 'P1' },
  { path: '/zh/solopreneur-safe-convertible-note-calculator', lang: 'zh', kind: 'tool', slug: 'solopreneur-safe-convertible-note-calculator', impressions: 135, clicks: 1, ctr: 0.0074, position: 66.1, redirectedImpressions: 2, tier: 'P1' },
  { path: '/zh/marketing-analytics/roas-optimization-benchmark', lang: 'zh', kind: 'topic', slug: null, impressions: 130, clicks: 0, ctr: 0, position: 68.3, redirectedImpressions: 0, tier: 'P1' },
  { path: '/en/solopreneur-deepseek-api-cost-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-deepseek-api-cost-calculator', impressions: 128, clicks: 0, ctr: 0, position: 54.4, redirectedImpressions: 1, tier: 'P1' },
  { path: '/en/solopreneur-sponsorship-rate-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-sponsorship-rate-calculator', impressions: 125, clicks: 0, ctr: 0, position: 7.3, redirectedImpressions: 52, tier: 'P1' },
  { path: '/en/retention', lang: 'en', kind: 'hub', slug: 'retention', impressions: 123, clicks: 0, ctr: 0, position: 50.8, redirectedImpressions: 0, tier: 'P1' },
  { path: '/en/solopreneur-cart-abandonment-cost-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-cart-abandonment-cost-calculator', impressions: 114, clicks: 0, ctr: 0, position: 36.3, redirectedImpressions: 0, tier: 'P1' },
  { path: '/zh/solopreneur-stripe-fee-calculator', lang: 'zh', kind: 'tool', slug: 'solopreneur-stripe-fee-calculator', impressions: 113, clicks: 2, ctr: 0.0177, position: 12.3, redirectedImpressions: 2, tier: 'P1' },
  { path: '/zh/valuation-exit/equity-dilution-optimization-guide', lang: 'zh', kind: 'topic', slug: null, impressions: 111, clicks: 0, ctr: 0, position: 20.6, redirectedImpressions: 0, tier: 'P1' },
  { path: '/en/retention/net-revenue-retention-benchmark', lang: 'en', kind: 'topic', slug: null, impressions: 110, clicks: 0, ctr: 0, position: 10, redirectedImpressions: 0, tier: 'P1' },
  { path: '/zh/solopreneur-stockout-cost-calculator', lang: 'zh', kind: 'tool', slug: 'solopreneur-stockout-cost-calculator', impressions: 110, clicks: 0, ctr: 0, position: 22.4, redirectedImpressions: 3, tier: 'P1' },
  { path: '/en/solopreneur-saas-valuation-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-saas-valuation-calculator', impressions: 100, clicks: 0, ctr: 0, position: 74.7, redirectedImpressions: 40, tier: 'P1' },
  { path: '/en/ai-cost-tools/gpu-cloud-cost-optimization-benchmark', lang: 'en', kind: 'topic', slug: null, impressions: 93, clicks: 0, ctr: 0, position: 37.4, redirectedImpressions: 0, tier: 'P1' },
  { path: '/zh/freelance-pricing', lang: 'zh', kind: 'hub', slug: 'freelance-pricing', impressions: 92, clicks: 0, ctr: 0, position: 19.6, redirectedImpressions: 0, tier: 'P1' },
  { path: '/en/marketing-analytics', lang: 'en', kind: 'hub', slug: 'marketing-analytics', impressions: 92, clicks: 0, ctr: 0, position: 26.5, redirectedImpressions: 0, tier: 'P1' },
  { path: '/zh/cost-efficiency/meeting-cost-analysis-guide', lang: 'zh', kind: 'topic', slug: null, impressions: 92, clicks: 0, ctr: 0, position: 71.1, redirectedImpressions: 0, tier: 'P1' },
  { path: '/en/retention/nrr-vs-grr-compare', lang: 'en', kind: 'topic', slug: null, impressions: 91, clicks: 0, ctr: 0, position: 15.2, redirectedImpressions: 0, tier: 'P1' },
  { path: '/en/solopreneur-sales-velocity-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-sales-velocity-calculator', impressions: 90, clicks: 0, ctr: 0, position: 51, redirectedImpressions: 88, tier: 'P1' },
  { path: '/zh/cost-efficiency/productivity-score-optimization-guide', lang: 'zh', kind: 'topic', slug: null, impressions: 88, clicks: 0, ctr: 0, position: 3.7, redirectedImpressions: 0, tier: 'P1' },
  { path: '/zh/solopreneur-pipeline-coverage-calculator', lang: 'zh', kind: 'tool', slug: 'solopreneur-pipeline-coverage-calculator', impressions: 88, clicks: 0, ctr: 0, position: 7.2, redirectedImpressions: 52, tier: 'P1' },
  { path: '/zh/solopreneur-ai-api-cost-comparison', lang: 'zh', kind: 'tool', slug: 'solopreneur-ai-api-cost-comparison', impressions: 85, clicks: 2, ctr: 0.0235, position: 19.5, redirectedImpressions: 0, tier: 'P1' },
  { path: '/zh/valuation-exit/ltv-vs-cac-compare', lang: 'zh', kind: 'topic', slug: null, impressions: 84, clicks: 0, ctr: 0, position: 75.6, redirectedImpressions: 0, tier: 'P1' },
  { path: '/zh/solopreneur-sales-velocity-calculator', lang: 'zh', kind: 'tool', slug: 'solopreneur-sales-velocity-calculator', impressions: 80, clicks: 0, ctr: 0, position: 11.7, redirectedImpressions: 5, tier: 'P1' },
  { path: '/en/solopreneur-supplier-scorecard-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-supplier-scorecard-calculator', impressions: 80, clicks: 0, ctr: 0, position: 30.7, redirectedImpressions: 77, tier: 'P1' },
  { path: '/en/solopreneur-quota-attainment-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-quota-attainment-calculator', impressions: 79, clicks: 0, ctr: 0, position: 7.3, redirectedImpressions: 72, tier: 'P2' },
  { path: '/en/hiring-team/employee-cost-planning-benchmark', lang: 'en', kind: 'topic', slug: null, impressions: 77, clicks: 0, ctr: 0, position: 48.6, redirectedImpressions: 0, tier: 'P2' },
  { path: '/en/solopreneur-cap-rate-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-cap-rate-calculator', impressions: 76, clicks: 0, ctr: 0, position: 57.2, redirectedImpressions: 2, tier: 'P2' },
  { path: '/zh/knowledge', lang: 'zh', kind: 'hub', slug: 'knowledge', impressions: 74, clicks: 0, ctr: 0, position: 19.4, redirectedImpressions: 0, tier: 'P2' },
  { path: '/zh/solopreneur-rental-yield-calculator', lang: 'zh', kind: 'tool', slug: 'solopreneur-rental-yield-calculator', impressions: 73, clicks: 0, ctr: 0, position: 12.5, redirectedImpressions: 2, tier: 'P2' },
  { path: '/en/solopreneur-course-pricing-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-course-pricing-calculator', impressions: 73, clicks: 0, ctr: 0, position: 27.7, redirectedImpressions: 1, tier: 'P2' },
  { path: '/zh/solopreneur-coupon-attribution-calculator', lang: 'zh', kind: 'tool', slug: 'solopreneur-coupon-attribution-calculator', impressions: 70, clicks: 0, ctr: 0, position: 17.4, redirectedImpressions: 2, tier: 'P2' },
  { path: '/en/freelance-pricing/saas-pricing-strategy-benchmark', lang: 'en', kind: 'topic', slug: null, impressions: 69, clicks: 0, ctr: 0, position: 6.8, redirectedImpressions: 0, tier: 'P2' },
  { path: '/en/knowledge', lang: 'en', kind: 'hub', slug: 'knowledge', impressions: 68, clicks: 0, ctr: 0, position: 17.1, redirectedImpressions: 0, tier: 'P2' },
  { path: '/en/valuation-exit', lang: 'en', kind: 'hub', slug: 'valuation-exit', impressions: 67, clicks: 0, ctr: 0, position: 26.5, redirectedImpressions: 0, tier: 'P2' },
  { path: '/zh/solopreneur-freelance-tax-calculator', lang: 'zh', kind: 'tool', slug: 'solopreneur-freelance-tax-calculator', impressions: 67, clicks: 0, ctr: 0, position: 25.7, redirectedImpressions: 5, tier: 'P2' },
  { path: '/zh/solopreneur-quota-attainment-calculator', lang: 'zh', kind: 'tool', slug: 'solopreneur-quota-attainment-calculator', impressions: 65, clicks: 0, ctr: 0, position: 15.6, redirectedImpressions: 6, tier: 'P2' },
  { path: '/zh/solopreneur-employee-cost-calculator', lang: 'zh', kind: 'tool', slug: 'solopreneur-employee-cost-calculator', impressions: 65, clicks: 0, ctr: 0, position: 14.7, redirectedImpressions: 53, tier: 'P2' },
  { path: '/en/solopreneur-unit-economics-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-unit-economics-calculator', impressions: 65, clicks: 0, ctr: 0, position: 43.1, redirectedImpressions: 51, tier: 'P2' },
  { path: '/en/solopreneur-inventory-turnover-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-inventory-turnover-calculator', impressions: 62, clicks: 0, ctr: 0, position: 8.9, redirectedImpressions: 51, tier: 'P2' },
  { path: '/en/solopreneur-revenue-projector', lang: 'en', kind: 'tool', slug: 'solopreneur-revenue-projector', impressions: 62, clicks: 0, ctr: 0, position: 13, redirectedImpressions: 59, tier: 'P2' },
  { path: '/en/valuation-exit/unit-economics-optimization-benchmark', lang: 'en', kind: 'topic', slug: null, impressions: 60, clicks: 0, ctr: 0, position: 9.8, redirectedImpressions: 0, tier: 'P2' },
  { path: '/zh/solopreneur-burn-rate-calculator', lang: 'zh', kind: 'tool', slug: 'solopreneur-burn-rate-calculator', impressions: 60, clicks: 0, ctr: 0, position: 18.5, redirectedImpressions: 2, tier: 'P2' },
  { path: '/en/solopreneur-fulfillment-cost-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-fulfillment-cost-calculator', impressions: 60, clicks: 0, ctr: 0, position: 58.8, redirectedImpressions: 27, tier: 'P2' },
  { path: '/en/solopreneur-time-to-value-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-time-to-value-calculator', impressions: 60, clicks: 0, ctr: 0, position: 8.1, redirectedImpressions: 52, tier: 'P2' },
  { path: '/en/freelance-pricing', lang: 'en', kind: 'hub', slug: 'freelance-pricing', impressions: 59, clicks: 0, ctr: 0, position: 18.6, redirectedImpressions: 0, tier: 'P2' },
  { path: '/en/cost-efficiency/productivity-score-optimization-benchmark', lang: 'en', kind: 'topic', slug: null, impressions: 58, clicks: 0, ctr: 0, position: 49.9, redirectedImpressions: 0, tier: 'P2' },
  { path: '/en/solopreneur-ai-training-cost-estimator', lang: 'en', kind: 'tool', slug: 'solopreneur-ai-training-cost-estimator', impressions: 57, clicks: 1, ctr: 0.0175, position: 25.9, redirectedImpressions: 20, tier: 'P2' },
  { path: '/en/solopreneur-email-list-revenue-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-email-list-revenue-calculator', impressions: 57, clicks: 0, ctr: 0, position: 13.9, redirectedImpressions: 43, tier: 'P2' },
  { path: '/en/solopreneur-mrr-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-mrr-calculator', impressions: 57, clicks: 0, ctr: 0, position: 16.1, redirectedImpressions: 50, tier: 'P2' },
  { path: '/zh/operations-inventory/reorder-point-optimization-guide', lang: 'zh', kind: 'topic', slug: null, impressions: 56, clicks: 0, ctr: 0, position: 25.3, redirectedImpressions: 0, tier: 'P2' },
  { path: '/en/hiring-team', lang: 'en', kind: 'hub', slug: 'hiring-team', impressions: 56, clicks: 0, ctr: 0, position: 10.2, redirectedImpressions: 0, tier: 'P2' },
  { path: '/zh/solopreneur-inventory-turnover-calculator', lang: 'zh', kind: 'tool', slug: 'solopreneur-inventory-turnover-calculator', impressions: 55, clicks: 0, ctr: 0, position: 22.7, redirectedImpressions: 2, tier: 'P2' },
  { path: '/en/customer-support', lang: 'en', kind: 'hub', slug: 'customer-support', impressions: 55, clicks: 0, ctr: 0, position: 11.3, redirectedImpressions: 0, tier: 'P2' },
  { path: '/en/solopreneur-safe-convertible-note-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-safe-convertible-note-calculator', impressions: 55, clicks: 0, ctr: 0, position: 10.1, redirectedImpressions: 31, tier: 'P2' },
  { path: '/en/solopreneur-cohort-retention-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-cohort-retention-calculator', impressions: 54, clicks: 0, ctr: 0, position: 6.8, redirectedImpressions: 36, tier: 'P2' },
  { path: '/zh/solopreneur-cart-abandonment-cost-calculator', lang: 'zh', kind: 'tool', slug: 'solopreneur-cart-abandonment-cost-calculator', impressions: 53, clicks: 0, ctr: 0, position: 43.7, redirectedImpressions: 0, tier: 'P2' },
  { path: '/en/solopreneur-time-value-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-time-value-calculator', impressions: 53, clicks: 0, ctr: 0, position: 8.4, redirectedImpressions: 8, tier: 'P2' },
  { path: '/en/solopreneur-funnel-value-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-funnel-value-calculator', impressions: 53, clicks: 0, ctr: 0, position: 53.5, redirectedImpressions: 11, tier: 'P2' },
  { path: '/en/solopreneur-pipeline-value-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-pipeline-value-calculator', impressions: 53, clicks: 0, ctr: 0, position: 37.5, redirectedImpressions: 45, tier: 'P2' },
  { path: '/en/solopreneur-coupon-attribution-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-coupon-attribution-calculator', impressions: 52, clicks: 0, ctr: 0, position: 28.9, redirectedImpressions: 37, tier: 'P2' },
  { path: '/en/solopreneur-stripe-fee-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-stripe-fee-calculator', impressions: 52, clicks: 0, ctr: 0, position: 7.8, redirectedImpressions: 43, tier: 'P2' },
  { path: '/zh/legal-compliance/consent-revenue-optimization-guide', lang: 'zh', kind: 'topic', slug: null, impressions: 51, clicks: 0, ctr: 0, position: 89.7, redirectedImpressions: 0, tier: 'P2' },
  { path: '/en/solopreneur-resolution-time-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-resolution-time-calculator', impressions: 50, clicks: 1, ctr: 0.02, position: 8.6, redirectedImpressions: 28, tier: 'P2' },
  { path: '/en/valuation-exit/ltv-vs-cac-compare', lang: 'en', kind: 'topic', slug: null, impressions: 49, clicks: 0, ctr: 0, position: 26.5, redirectedImpressions: 0, tier: 'P2' },
  { path: '/zh/solopreneur-email-list-revenue-calculator', lang: 'zh', kind: 'tool', slug: 'solopreneur-email-list-revenue-calculator', impressions: 49, clicks: 0, ctr: 0, position: 20.3, redirectedImpressions: 2, tier: 'P2' },
  { path: '/zh/ai-cost-tools', lang: 'zh', kind: 'hub', slug: 'ai-cost-tools', impressions: 48, clicks: 0, ctr: 0, position: 21, redirectedImpressions: 0, tier: 'P2' },
  { path: '/en/solopreneur-pipeline-coverage-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-pipeline-coverage-calculator', impressions: 48, clicks: 0, ctr: 0, position: 21.5, redirectedImpressions: 36, tier: 'P2' },
  { path: '/en/saas-metrics/mrr-growth-strategies-guide', lang: 'en', kind: 'topic', slug: null, impressions: 47, clicks: 0, ctr: 0, position: 76, redirectedImpressions: 0, tier: 'P2' },
  { path: '/zh/solopreneur-roas-calculator', lang: 'zh', kind: 'tool', slug: 'solopreneur-roas-calculator', impressions: 47, clicks: 0, ctr: 0, position: 43, redirectedImpressions: 3, tier: 'P2' },
  { path: '/zh/valuation-exit', lang: 'zh', kind: 'hub', slug: 'valuation-exit', impressions: 46, clicks: 0, ctr: 0, position: 27, redirectedImpressions: 0, tier: 'P2' },
  { path: '/zh/cost-efficiency', lang: 'zh', kind: 'hub', slug: 'cost-efficiency', impressions: 45, clicks: 0, ctr: 0, position: 25.6, redirectedImpressions: 0, tier: 'P2' },
  { path: '/zh/solopreneur-cap-rate-calculator', lang: 'zh', kind: 'tool', slug: 'solopreneur-cap-rate-calculator', impressions: 45, clicks: 0, ctr: 0, position: 19.9, redirectedImpressions: 1, tier: 'P2' },
  { path: '/zh/solopreneur-productivity-score', lang: 'zh', kind: 'tool', slug: 'solopreneur-productivity-score', impressions: 43, clicks: 0, ctr: 0, position: 4, redirectedImpressions: 41, tier: 'P2' },
  { path: '/en/valuation-exit/customer-acquisition-cost-benchmark', lang: 'en', kind: 'topic', slug: null, impressions: 42, clicks: 0, ctr: 0, position: 50.6, redirectedImpressions: 0, tier: 'P2' },
  { path: '/zh/solopreneur-cohort-retention-calculator', lang: 'zh', kind: 'tool', slug: 'solopreneur-cohort-retention-calculator', impressions: 42, clicks: 0, ctr: 0, position: 22.7, redirectedImpressions: 3, tier: 'P2' },
  { path: '/en/legal-compliance', lang: 'en', kind: 'hub', slug: 'legal-compliance', impressions: 40, clicks: 0, ctr: 0, position: 19.9, redirectedImpressions: 0, tier: 'P2' },
  { path: '/zh/hiring-team/attrition-cost-optimization-guide', lang: 'zh', kind: 'topic', slug: null, impressions: 39, clicks: 0, ctr: 0, position: 23.5, redirectedImpressions: 0, tier: 'P2' },
  { path: '/zh/solopreneur-market-size-estimator', lang: 'zh', kind: 'tool', slug: 'solopreneur-market-size-estimator', impressions: 39, clicks: 0, ctr: 0, position: 28.1, redirectedImpressions: 1, tier: 'P2' },
  { path: '/zh/solopreneur-churn-rate-calculator', lang: 'zh', kind: 'tool', slug: 'solopreneur-churn-rate-calculator', impressions: 39, clicks: 0, ctr: 0, position: 23.4, redirectedImpressions: 3, tier: 'P2' },
  { path: '/en/saas-metrics/burn-rate-optimization-benchmark', lang: 'en', kind: 'topic', slug: null, impressions: 38, clicks: 0, ctr: 0, position: 27.7, redirectedImpressions: 0, tier: 'P2' },
  { path: '/zh/solopreneur-ltv-by-channel-calculator', lang: 'zh', kind: 'tool', slug: 'solopreneur-ltv-by-channel-calculator', impressions: 38, clicks: 0, ctr: 0, position: 25, redirectedImpressions: 2, tier: 'P2' },
  { path: '/zh/solopreneur-mrr-calculator', lang: 'zh', kind: 'tool', slug: 'solopreneur-mrr-calculator', impressions: 38, clicks: 0, ctr: 0, position: 20.3, redirectedImpressions: 3, tier: 'P2' },
  { path: '/en/solopreneur-ai-image-cost-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-ai-image-cost-calculator', impressions: 38, clicks: 0, ctr: 0, position: 21.6, redirectedImpressions: 13, tier: 'P2' },
  { path: '/en/product-analytics/funnel-conversion-optimization-guide', lang: 'en', kind: 'topic', slug: null, impressions: 37, clicks: 0, ctr: 0, position: 88.3, redirectedImpressions: 0, tier: 'P2' },
  { path: '/en/solopreneur-hourly-vs-fixed-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-hourly-vs-fixed-calculator', impressions: 37, clicks: 0, ctr: 0, position: 4, redirectedImpressions: 33, tier: 'P2' },
  { path: '/en/solopreneur-dscr-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-dscr-calculator', impressions: 37, clicks: 0, ctr: 0, position: 96, redirectedImpressions: 36, tier: 'P2' },
  { path: '/en/operations-inventory', lang: 'en', kind: 'hub', slug: 'operations-inventory', impressions: 36, clicks: 0, ctr: 0, position: 22.6, redirectedImpressions: 0, tier: 'P2' },
  { path: '/en/solopreneur-fully-loaded-employee-cost-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-fully-loaded-employee-cost-calculator', impressions: 36, clicks: 0, ctr: 0, position: 25.9, redirectedImpressions: 5, tier: 'P2' },
  { path: '/zh/solopreneur-ai-training-cost-estimator', lang: 'zh', kind: 'tool', slug: 'solopreneur-ai-training-cost-estimator', impressions: 35, clicks: 1, ctr: 0.0286, position: 8.8, redirectedImpressions: 2, tier: 'P2' },
  { path: '/en/solopreneur-attrition-cost-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-attrition-cost-calculator', impressions: 35, clicks: 0, ctr: 0, position: 6.8, redirectedImpressions: 0, tier: 'P2' },
  { path: '/en/contact', lang: 'en', kind: 'static', slug: null, impressions: 34, clicks: 0, ctr: 0, position: 2.6, redirectedImpressions: 0, tier: 'P2' },
  { path: '/en/privacy-policy', lang: 'en', kind: 'static', slug: null, impressions: 34, clicks: 0, ctr: 0, position: 5, redirectedImpressions: 0, tier: 'P2' },
  { path: '/zh/saas-metrics', lang: 'zh', kind: 'hub', slug: 'saas-metrics', impressions: 34, clicks: 0, ctr: 0, position: 20.3, redirectedImpressions: 0, tier: 'P2' },
  { path: '/zh/solopreneur-revenue-projector', lang: 'zh', kind: 'tool', slug: 'solopreneur-revenue-projector', impressions: 34, clicks: 0, ctr: 0, position: 25.7, redirectedImpressions: 5, tier: 'P2' },
  { path: '/en/solopreneur-reorder-point-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-reorder-point-calculator', impressions: 34, clicks: 0, ctr: 0, position: 7.9, redirectedImpressions: 26, tier: 'P2' },
  { path: '/en/solopreneur-grr-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-grr-calculator', impressions: 34, clicks: 0, ctr: 0, position: 64.3, redirectedImpressions: 26, tier: 'P2' },
  { path: '/en/solopreneur-ltv-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-ltv-calculator', impressions: 34, clicks: 0, ctr: 0, position: 75, redirectedImpressions: 32, tier: 'P2' },
  { path: '/en/solopreneur-gpu-cloud-cost-calculator', lang: 'en', kind: 'tool', slug: 'solopreneur-gpu-cloud-cost-calculator', impressions: 34, clicks: 0, ctr: 0, position: 0, redirectedImpressions: 34, tier: 'P2' },
  { path: '/en/about', lang: 'en', kind: 'static', slug: null, impressions: 33, clicks: 0, ctr: 0, position: 1.9, redirectedImpressions: 0, tier: 'P2' },
  { path: '/en/cost-efficiency', lang: 'en', kind: 'hub', slug: 'cost-efficiency', impressions: 33, clicks: 0, ctr: 0, position: 16.2, redirectedImpressions: 0, tier: 'P2' },
  { path: '/zh/solopreneur-funnel-step-calculator', lang: 'zh', kind: 'tool', slug: 'solopreneur-funnel-step-calculator', impressions: 33, clicks: 0, ctr: 0, position: 21.4, redirectedImpressions: 0, tier: 'P2' },
  { path: '/zh/investment-roi/compound-interest-optimization-benchmark', lang: 'zh', kind: 'topic', slug: null, impressions: 33, clicks: 0, ctr: 0, position: 85.4, redirectedImpressions: 0, tier: 'P2' },
  { path: '/zh/solopreneur-cac-calculator', lang: 'zh', kind: 'tool', slug: 'solopreneur-cac-calculator', impressions: 33, clicks: 0, ctr: 0, position: 13.2, redirectedImpressions: 1, tier: 'P2' },
];

/** 其中属于计算器页的 slug（去重）—— 2.0 改造的实际施工对象 */
export const PRIORITY_TOOL_SLUGS: string[] = [
  'solopreneur-ai-api-cost-comparison',
  'solopreneur-ai-image-cost-calculator',
  'solopreneur-ai-training-cost-estimator',
  'solopreneur-attrition-cost-calculator',
  'solopreneur-burn-rate-calculator',
  'solopreneur-cac-calculator',
  'solopreneur-cap-rate-calculator',
  'solopreneur-cart-abandonment-cost-calculator',
  'solopreneur-churn-rate-calculator',
  'solopreneur-cohort-retention-calculator',
  'solopreneur-coupon-attribution-calculator',
  'solopreneur-course-pricing-calculator',
  'solopreneur-csat-calculator',
  'solopreneur-deepseek-api-cost-calculator',
  'solopreneur-dscr-calculator',
  'solopreneur-email-list-revenue-calculator',
  'solopreneur-employee-cost-calculator',
  'solopreneur-feature-adoption-calculator',
  'solopreneur-freelance-rate-calculator',
  'solopreneur-freelance-tax-calculator',
  'solopreneur-fulfillment-cost-calculator',
  'solopreneur-fully-loaded-employee-cost-calculator',
  'solopreneur-funnel-step-calculator',
  'solopreneur-funnel-value-calculator',
  'solopreneur-gemini-api-cost-calculator',
  'solopreneur-gpu-cloud-cost-calculator',
  'solopreneur-grr-calculator',
  'solopreneur-hourly-vs-fixed-calculator',
  'solopreneur-inventory-turnover-calculator',
  'solopreneur-ltv-by-channel-calculator',
  'solopreneur-ltv-calculator',
  'solopreneur-market-size-estimator',
  'solopreneur-mrr-calculator',
  'solopreneur-pipeline-coverage-calculator',
  'solopreneur-pipeline-value-calculator',
  'solopreneur-productivity-score',
  'solopreneur-quota-attainment-calculator',
  'solopreneur-remote-vs-office-calculator',
  'solopreneur-rental-yield-calculator',
  'solopreneur-reorder-point-calculator',
  'solopreneur-resolution-time-calculator',
  'solopreneur-revenue-projector',
  'solopreneur-roas-calculator',
  'solopreneur-saas-valuation-calculator',
  'solopreneur-safe-convertible-note-calculator',
  'solopreneur-sales-velocity-calculator',
  'solopreneur-sponsorship-rate-calculator',
  'solopreneur-stockout-cost-calculator',
  'solopreneur-stripe-fee-calculator',
  'solopreneur-supplier-scorecard-calculator',
  'solopreneur-time-to-value-calculator',
  'solopreneur-time-value-calculator',
  'solopreneur-unit-economics-calculator',
];

/** 清单里展示数的合计（应 ≥ 80% × 候选页展示合计） */
export const PRIORITY_IMPRESSIONS = 10557;

/** 候选页（活页扣掉壳页）的展示合计 —— 集中度的分母 */
export const CANDIDATE_IMPRESSIONS = 13164;

/** 全站由 404 blog URL 301 归并回来的展示总数 */
export const REDIRECTED_IMPRESSIONS_TOTAL = 2526;

/** 其中落在本清单（前 117 页）里的部分 */
export const REDIRECTED_IMPRESSIONS_IN_LIST = 1898;
