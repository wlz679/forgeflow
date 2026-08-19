// P140f Batch A follow-up: Per-Topic content registry.
// Each Topic can ship hand-curated content (loaded from this registry)
// or fallback to [CONTENT] placeholder until editorial fill completes.

export interface TopicBenchmarkRow {
  segment: string;
  metric: string;
  benchmark: string;
  source: string;
}

export interface TopicBenchmarkContent {
  whatWeMeasure: string;
  industryBenchmarks: string;
  howToUse: string;
  sources: string;
  rows: TopicBenchmarkRow[];
}

export interface TopicGuideContentBody {
  whatIs: string;
  whyMatters: string;
  keyConcepts: string;
  howToApply: string;
  commonPitfalls: string;
}

export interface TopicGuideContent {
  en: TopicGuideContentBody;
  zh: TopicGuideContentBody;
}

export const TOPIC_GUIDE_CONTENT: Record<string, TopicGuideContent> = {
  'roas-optimization': {
    en: {
      whatIs: 'Return on Ad Spend (ROAS) measures the revenue generated for every dollar spent on advertising. It is the primary efficiency metric for performance marketing teams running paid campaigns on Meta (Facebook + Instagram), Google Ads, TikTok, LinkedIn, Pinterest, and other ad networks. ROAS is calculated as gross revenue divided by ad spend; net ROAS subtracts product COGS, fulfillment, and overhead from gross revenue for a truer profitability picture.',
      whyMatters: 'ROAS is the gating signal between profitable growth and money-losing growth. A campaign at 4.0x ROAS that scales to $50K/month spend generates $200K/month revenue. The same campaign at 1.5x ROAS loses $25K/month. Most DTC brands break even at 2.0-3.0x gross ROAS; B2B SaaS with high LTV can sustain 1.0-1.5x paid ROAS. Tracking ROAS over 30/60/90 day windows reveals whether creative fatigue, audience saturation, or seasonal demand is degrading your efficiency.',
      keyConcepts: '1) Attribution window determines what counts as a conversion — Meta default is 7-day click + 1-day view; Google search is 30-day click. Never compare ROAS across channels without normalizing the window. 2) Gross vs net ROAS — gross includes all attributed revenue; net subtracts variable costs (COGS + fulfillment). Aim for net ROAS > 2.0x for sustainable DTC. 3) Marginal ROAS — the incremental return from the next $1 of spend, not the blended average. Marginal ROAS degrades as you scale into less-responsive audience segments. 4) Creative frequency ceiling — ROAS drops sharply above ~3-5 impressions per user per week; refresh creative every 14-21 days.',
      howToApply: 'Step 1: Calculate current blended ROAS by pulling gross revenue and ad spend from your ad accounts for the last 30 days. Step 2: Compute net ROAS by subtracting COGS and fulfillment from gross revenue, then divide by ad spend. Step 3: Set per-channel ROAS targets based on your business unit economics (DTC: 2.0-3.0x net; B2B SaaS: 1.0-1.5x net; lead gen: 3.0-5.0x net). Step 4: Use the ROAS Calculator to model scenario changes (audience expansion, creative refresh, bid strategy switch) and forecast net revenue impact. Step 5: Set automated pause rules when ROAS drops below threshold for 3 consecutive days.',
      commonPitfalls: 'Comparing Meta 7-day-click ROAS against Google 30-day-click ROAS — these are not directly comparable and require normalization. Reporting blended ROAS when channel mix is fixed — set per-channel targets based on marginal CAC, since blended ROAS hides per-channel efficiency. Treating high-ROAS campaigns as indefinitely scalable — every audience segment has a frequency ceiling, and pushing past it kills ROAS. Ignoring creative fatigue — when ROAS drops 30%+ over 4 weeks, the fix is new creative angles, not budget cuts. Using ROAS as the sole metric — pair with MER (Marketing Efficiency Ratio) and incrementality testing for full picture.',
    },
    zh: {
      whatIs: '广告支出回报率（ROAS）衡量每花 1 美元广告费产生的营收。它是 Meta（Facebook + Instagram）、Google Ads、TikTok、LinkedIn、Pinterest 等付费渠道绩效营销团队的主要效率指标。ROAS = 毛收入 ÷ 广告支出；净 ROAS 进一步扣除商品 COGS、履约和运营开销，更能反映真实盈利。',
      whyMatters: 'ROAS 是区分盈利增长与亏损增长的关键信号。月支出 $50K、ROAS 4.0x 的广告每月产生 $200K 营收；同一广告 ROAS 1.5x 则每月亏 $25K。多数 DTC 品牌 2.0-3.0x 毛 ROAS 才能打平；高 LTV 的 B2B SaaS 1.0-1.5x 付费 ROAS 可持续。30/60/90 天窗口 ROAS 趋势可揭示素材疲劳、受众饱和还是季节性需求导致效率下滑。',
      keyConcepts: '1）归因窗口决定哪些算转化 — Meta 默认 7 天点击 + 1 天浏览；Google 搜索 30 天点击。跨渠道比较 ROAS 必须归一化窗口。2）毛 ROAS vs 净 ROAS — 毛 ROAS 含所有归因收入；净 ROAS 扣除可变成本（COGS + 履约）。DTC 净 ROAS 目标 > 2.0x。3）边际 ROAS — 下一美元支出的增量回报，非平均回报。随受众规模扩展边际 ROAS 下降。4）创意频次天花板 — 单用户单周曝光 3-5 次后 ROAS 急降；每 14-21 天更新素材。',
      howToApply: '步骤 1：过去 30 天从广告平台拉毛收入和广告支出，计算综合 ROAS。步骤 2：扣除 COGS 和履约后计算净 ROAS。步骤 3：按业务单元经济设分渠道 ROAS 目标（DTC：净 2.0-3.0x；B2B SaaS：净 1.0-1.5x；潜客获取：净 3.0-5.0x）。步骤 4：用 ROAS 计算器建模受众扩展、素材更新、出价策略切换场景。步骤 5：设自动暂停规则，ROAS 连续 3 天低于阈值即暂停。',
      commonPitfalls: '用 Meta 7 天点击 ROAS 直接对比 Google 30 天点击 ROAS — 不可比，必须归一化。报告综合 ROAS 但渠道组合固定 — 应基于边际 CAC 设分渠道目标，综合 ROAS 掩盖单渠道效率。把高 ROAS 广告视为可无限扩展 — 每个受众段都有频次天花板，超过即 ROAS 崩溃。忽略素材疲劳 — 4 周 ROAS 下降 30%+ 时，修复方法是新素材方向而非砍预算。只用 ROAS 一个指标 — 应配合 MER（营销效率比）和增量测试看全貌。',
    },
  },
};

export const TOPIC_BENCHMARK_CONTENT: Record<string, { en: TopicBenchmarkContent; zh: TopicBenchmarkContent }> = {
  'roas-optimization': {
    en: {
      whatWeMeasure: 'ROAS benchmarks for Meta Ads, Google Ads, TikTok, and other paid channels, segmented by business model (DTC e-commerce, B2B SaaS, lead generation) and company stage (early, growth, mature).',
      industryBenchmarks: 'Q3 2025 data; updated quarterly per Topic review cadence.',
      rows: [
        { segment: 'DTC e-commerce (early stage)', metric: 'Gross ROAS (Meta 7d-click)', benchmark: '2.5-4.0x', source: 'Shopify ROAS Guide 2024; Meta for Business benchmarks' },
        { segment: 'DTC e-commerce (growth stage)', metric: 'Gross ROAS (Meta 7d-click)', benchmark: '3.0-5.0x', source: 'Shopify ROAS Guide; Triple Whale DTC benchmarks 2024' },
        { segment: 'DTC e-commerce (mature)', metric: 'Net ROAS (post-COGS)', benchmark: '2.0-3.5x', source: 'Triple Whale; Littledata benchmarks' },
        { segment: 'B2B SaaS (SMB)', metric: 'Paid ROAS (Google Search 30d)', benchmark: '1.5-2.5x', source: 'OpenView SaaS Benchmarks 2024' },
        { segment: 'B2B SaaS (Mid-market)', metric: 'Paid ROAS (LinkedIn 30d)', benchmark: '0.8-1.5x', source: 'LinkedIn Marketing Solutions; OpenView' },
        { segment: 'Lead generation', metric: 'Cost per qualified lead (CPL)', benchmark: '$50-$300 (B2B); $20-$80 (B2C)', source: 'HubSpot State of Marketing 2024' },
        { segment: 'Google Shopping', metric: 'Gross ROAS', benchmark: '3.0-8.0x', source: 'Google Ads Help Center; Shopify' },
        { segment: 'TikTok Ads', metric: 'Gross ROAS', benchmark: '1.5-3.5x', source: 'TikTok for Business benchmarks 2024' },
      ],
      howToUse: 'Pick the row matching your business model + stage. Compare your channel ROAS against the benchmark. If below mid-range, audit attribution window and creative fatigue. If above mid-range, you have scaling headroom — test marginal ROAS by increasing budget 20% over 7 days. For multi-channel operations, weight benchmarks by channel mix — a 50/50 Meta/Google portfolio averages around 3.5-5.0x gross ROAS for early-stage DTC.',
      sources: 'Meta Ads Help Center ROAS measurement guide; Google Ads ROAS documentation; Shopify ROAS Guide; Triple Whale DTC benchmarks 2024; OpenView SaaS Benchmarks 2024; HubSpot State of Marketing 2024; LinkedIn Marketing Solutions benchmarks; TikTok for Business benchmarks 2024.',
    },
    zh: {
      whatWeMeasure: 'Meta Ads、Google Ads、TikTok 等付费渠道的 ROAS 基准，按业务模型（DTC 电商、B2B SaaS、潜客获取）和公司阶段（早期、成长期、成熟期）细分。',
      industryBenchmarks: '2025 Q3 数据；按 Topic 季度审查节奏更新。',
      rows: [
        { segment: 'DTC 电商（早期）', metric: '毛 ROAS（Meta 7 天点击）', benchmark: '2.5-4.0x', source: 'Shopify ROAS 指南 2024；Meta for Business 基准' },
        { segment: 'DTC 电商（成长期）', metric: '毛 ROAS（Meta 7 天点击）', benchmark: '3.0-5.0x', source: 'Shopify ROAS 指南；Triple Whale DTC 基准 2024' },
        { segment: 'DTC 电商（成熟期）', metric: '净 ROAS（扣 COGS 后）', benchmark: '2.0-3.5x', source: 'Triple Whale；Littledata 基准' },
        { segment: 'B2B SaaS（SMB）', metric: '付费 ROAS（Google 搜索 30 天）', benchmark: '1.5-2.5x', source: 'OpenView SaaS 基准 2024' },
        { segment: 'B2B SaaS（中端市场）', metric: '付费 ROAS（LinkedIn 30 天）', benchmark: '0.8-1.5x', source: 'LinkedIn 营销解决方案；OpenView' },
        { segment: '潜客获取', metric: '单合格潜客成本（CPL）', benchmark: '$50-$300（B2B）；$20-$80（B2C）', source: 'HubSpot 营销现状报告 2024' },
        { segment: 'Google Shopping', metric: '毛 ROAS', benchmark: '3.0-8.0x', source: 'Google Ads 帮助中心；Shopify' },
        { segment: 'TikTok Ads', metric: '毛 ROAS', benchmark: '1.5-3.5x', source: 'TikTok for Business 基准 2024' },
      ],
      howToUse: '选与你的业务模型 + 阶段匹配的行。对比你的渠道 ROAS 与基准。低于中位，审计归因窗口和素材疲劳。高于中位，有扩展空间 — 测试边际 ROAS，7 天增加预算 20%。多渠道运营时，按渠道组合加权基准 — 早期 DTC 的 50/50 Meta/Google 组合平均约 3.5-5.0x 毛 ROAS。',
      sources: 'Meta Ads 帮助中心 ROAS 衡量指南；Google Ads ROAS 文档；Shopify ROAS 指南；Triple Whale DTC 基准 2024；OpenView SaaS 基准 2024；HubSpot 营销现状报告 2024；LinkedIn 营销解决方案基准；TikTok for Business 基准 2024。',
    },
  },
};