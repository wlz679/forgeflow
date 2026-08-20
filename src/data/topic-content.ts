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
  'mrr-growth-strategies': {
    en: {
      whatIs: 'MRR growth strategies are the playbooks SaaS founders use to push a recurring-revenue number upward, faster, and more durably than the baseline trajectory. MRR — Monthly Recurring Revenue — is the single most-watched metric in subscription businesses because it converts directly into ARR, valuation multiples, and burn coverage. But MRR is not a single number: it is the net result of five flows (new MRR, expansion MRR, reactivation MRR, contraction MRR, churned MRR). Growth strategy is the deliberate engineering of those five flows — which to prioritize at each stage, how much to spend on each, and which leading KPIs predict whether the motion is actually working before the trailing ARR number catches up.',
      whyMatters: 'Founders who treat MRR as one number consistently underperform those who decompose it into the five-component waterfall. The reason is leverage: at $5K MRR, halving churn loses ~$150/month in revenue but doubles the LTV contribution from retention work. At $500K MRR, the same churn improvement is worth $15K/month. Stage-specific MoM growth bands are well-documented — 15-20% MoM pre-PMF, 7-10% MoM at $1K-$10K MRR, 5-7% MoM at $10K-$100K MRR, 3-5% MoM above $100K. Investors benchmark on three layered indicators: net new MRR (gross − churned), NRR (existing-customer expansion), and Rule of 40 (growth + margin). Missing the band signals — to you and the market — that acquisition or retention is broken, even when the headline MRR number still grows.',
      keyConcepts: '1) The MRR waterfall: New MRR + Expansion MRR + Reactivation MRR − Contraction MRR − Churned MRR = Net New MRR. Operators read bottom-up because each component has a distinct cost, timeline, and failure mode. 2) NRR vs GRR: GRR excludes expansion; NRR includes it. Best-in-class NRR > 110% means existing customers grow revenue 10%+ annually even with zero new logos — Snowflake, Datadog, and Twilio all run NRR > 120%. 3) SaaS Quick Ratio = (New + Expansion + Reactivation) / (Churned + Contraction). Above 4 is the bar for capital-efficient growth; below 2 means scaling losses faster than gains. 4) Growth ceiling math: at constant churn, MRR asymptotically approaches New MRR / Churn. Halving churn doubles the ceiling — this is why retention is the highest-leverage variable. 5) Stage-specific levers: pre-revenue → founder-led sales + PLG; early traction → paid acquisition + onboarding; scaling → segmentation + expansion revenue; growth → PLG-sales hybrid + NRR motion. 6) Unit-economics gate before scaling paid spend: LTV:CAC > 3x, CAC payback < 12 months, gross margin > 70%.',
      howToApply: 'Step 1: Decompose MRR into the five components using the MRR Calculator — subscribers, price, monthly churn %, new subs/mo, expansion MRR, contraction MRR, reactivation MRR. Read NRR and Quick Ratio before deciding what to fix. Step 2: Diagnose your stage from MRR bands: <$1K validation, $1K-$10K early traction, $10K-$100K scaling, >$100K growth. Match your growth target to the stage band from the benchmark table — chasing 15% MoM at $50K MRR burns capital; settling for 5% MoM at $2K MRR starves product-market-fit signal. Step 3: Build a 12-month projection in the Revenue Forecaster using current MRR, gross growth rate, churn, monthly expenses, cash on hand, and ARPU. Use the four built-in scenarios (Conservative / Current Pace / Aggressive / Hyper-Growth) to bracket the realistic range. Step 4: Run both calculators\' What-If branches. Cutting churn by 1pp typically has 2-3x the revenue impact of adding the same percentage to gross growth. Boosting expansion to 25% of new MRR moves NRR into best-in-class territory. Step 5: Set three growth targets per quarter, not one: net new MRR (operational signal), NRR (retention signal), CAC payback (efficiency signal). Review weekly. Step 6: Stress-test downside — model −20% growth and +2pp churn simultaneously. If runway falls below 12 months under that scenario, raise now or cut discretionary spend.',
      commonPitfalls: 'Optimizing for gross new MRR while ignoring churn — dashboards look great, growth is net-zero. Targeting 15% MoM at $50K MRR — that band belongs to pre-PMF, not scaling-stage. Treating reactivation as a marketing metric instead of a product signal — returning customers tell you what was missing the first time. Confusing Quick Ratio above 4 with "we are safe" — at 0.1% monthly churn, QR=4 still compounds slowly. Pricing as a retention lever instead of a growth lever — price increases are net-positive MRR drivers, deep discounts are not. Forecasting with a constant growth rate — SaaS growth is mean-reverting; build scenarios with ±2pp bands. Ignoring contribution margin in MRR math — $1 of net-new MRR at 40% gross margin is worth less than $1 of expansion MRR at 90% margin.',
    },
    zh: {
      whatIs: 'MRR 增长策略是 SaaS 创业者用来让经常性收入数字向上、加快、并持续高于基线轨迹的系统打法。MRR（月度经常性收入）是订阅业务最受关注的指标，因为它直接转化为 ARR、估值倍数和烧钱覆盖。但 MRR 不是单一数字，而是五条流的净结果：新 MRR、扩展 MRR、重新激活 MRR、降级 MRR、流失 MRR。增长策略就是对这五条流的刻意工程——每个阶段该优先推哪条、花多少资源、哪个领先 KPI 能预测这个动作是否真的有效，赶在滞后的 ARR 数字反应之前。',
      whyMatters: '把 MRR 当作一个数字看的人，长期跑赢不到那些把它拆成五条流的人。底层是杠杆效应：$5K MRR 时，流失翻倍每月仅多丢 ~$150；但同样幅度的留存改善，每月 LTV 贡献翻倍。$500K MRR 时，同样的流失改善每月值 $15K。按阶段分层的 MoM 增长带已是行业共识——PMF 前 15-20% MoM，$1K-$10K MRR 应达 7-10% MoM，$10K-$100K MRR 维持 5-7% MoM，超过 $100K MRR 健康区间 3-5%。投资人看三个层级指标：净新增 MRR（毛增 − 流失）、NRR（老客户动态）、Rule of 40（增长 + 利润率）。错过增长带信号——无论对你还是市场——都意味着获客或留存动作失灵，哪怕表观 MRR 数字仍在涨。',
      keyConcepts: '1）MRR 瀑布流：新 MRR + 扩展 MRR + 重新激活 MRR − 降级 MRR − 流失 MRR = 净新增 MRR。运营者自下而上读，因为每条流的成本、时间线、失效模式都不同。2）NRR vs GRR：GRR 不含扩展；NRR 含。最优 NRR > 110% 意味着即便零新客，老客户年收入也增长 10%+——Snowflake、Datadog、Twilio 均跑在 NRR > 120%。3）SaaS Quick Ratio =（新 + 扩展 + 重新激活）/（流失 + 降级）。> 4 是资本高效增长门槛；< 2 说明亏损扩张速度快于增长。4）增长天花板数学：流失恒定时，MRR 渐近逼近 新 MRR ÷ 流失。流失砍半，天花板翻倍——所以留存才是最大杠杆变量。5）阶段杠杆：未收期 → 创始人销售 + PLG；早期 → 付费获客 + onboarding；规模化 → 分层 + 扩展收入；增长期 → PLG 销售混合 + NRR 动作。6）单位经济学门槛再放大付费投放：LTV:CAC > 3x、CAC 回本 < 12 个月、毛利率 > 70%。',
      howToApply: '步骤 1：用 MRR 计算器把当前 MRR 拆为五个分量——订阅数、价格、月流失%、新客/月、扩展 MRR、降级 MRR、重新激活 MRR。先看 NRR 与 Quick Ratio 再决定修哪里。步骤 2：按 MRR 规模定位阶段：<$1K 验证期、$1K-$10K 早期、$10K-$100K 规模化期、>$100K 增长期。把增长目标映射到基准表中对应阶段的增长带——$50K MRR 追 15% MoM 会烧光现金；$2K MRR 凑 5% MoM 会饿死 PMF 信号。步骤 3：用当前 MRR、毛增、流失、月支出、现金、ARPU 在收入预测器里建 12 个月投影。用内置四档场景（保守、当前节奏、激进、超速增长）框出真实区间。步骤 4：跑两个计算器的 What-If 分支。流失减 1pp 的收入影响，通常是同等百分比抬毛增的 2-3 倍；扩展做到新 MRR 的 25% 可把 NRR 推进顶尖区间。步骤 5：每季度设三个而非一个增长目标：净新增 MRR（运营信号）、NRR（留存信号）、CAC 回本（效率信号），周度复盘。步骤 6：下行情景压力测试——同时建模 −20% 增长、+2pp 流失；若跑道跌破 12 个月，立刻融资或砍非必要支出。',
      commonPitfalls: '只优化毛新增 MRR 而不看流失——仪表盘好看，掩盖净零增长。$50K MRR 追 15% MoM——这个增长带属于 PMF 前，不是规模化期。把重新激活当成营销指标而非产品信号——回归客户告诉你之前哪里没满足。把 Quick Ratio > 4 当成"我们已经稳了"——月流失 0.1% 时 QR=4 复利仍慢。把定价当留存杠杆而非增长杠杆——涨价是净正 MRR 驱动，深折价不是。用恒定增长率预测——SaaS 增长均值回归，必建 ±2pp 波带场景。MRR 算法忽略贡献毛利——1 块新 MRR 毛利 40%，不如 1 块扩展 MRR 毛利 90% 划算。',
    },
  },
  'customer-acquisition-cost': {
    en: {
      whatIs: 'Customer Acquisition Cost (CAC) measures the fully-loaded cost of converting a prospect into a paying customer. The standard formula is total sales + marketing spend (excluding post-sale customer success) divided by new paying customers acquired in the same period. CAC is the single most important unit-economics input for SaaS, DTC e-commerce, and any recurring-revenue business — every CAC decision compounds across every month of the acquired customer\'s lifetime. A blended $500 CAC is healthy when paired with a $2,500 LTV (5:1 ratio) and catastrophic when paired with a $600 LTV (1.2:1). CAC never stands alone; always interpret it next to LTV and payback period.',
      whyMatters: 'CAC is the gateway between sustainable growth and cash-flow collapse. A startup at 1:1 LTV:CAC can raise capital but cannot operate sustainably; at 3:1 it can self-fund modest growth; at 5:1+ it has unlimited scale headroom. Most early-stage growth failures trace to CAC rising faster than LTV — typically because founders scale paid acquisition before unit economics stabilize. Tracking CAC by channel (paid vs organic vs referral vs sales-led) and by cohort (acquisition month) reveals whether efficiency improves as spend scales or degrades into saturated audiences and creative fatigue. CAC is also the leading indicator investors use to value SaaS companies: an improving CAC trend over 6-12 months commands higher revenue multiples than a flat or declining one.',
      keyConcepts: '1) Blended vs paid CAC — blended includes organic/referral and is naturally lower; paid CAC is the cleaner benchmark for scaling decisions and is typically 2-3x blended. 2) Fully-loaded CAC must include sales salaries, SDR/BDR commissions, marketing tools, content production, paid media, and allocated overhead. Most founders understate CAC 2-3x by ignoring sales headcount. 3) CAC payback period = CAC / (ARPU × gross margin %) — measures how many months of gross profit it takes to recover acquisition cost; capital-efficient SaaS clears payback in 5-12 months, late-stage enterprise can tolerate 18-24 months. 4) LTV:CAC ratio is the gating metric: 1:1 means you lose money on every customer (danger), 3:1 is the healthy benchmark, 5:1+ means you are under-investing in growth. 5) Marginal CAC rises with spend — your first $10K/month is cheaper than your $10M/month as you exhaust the most responsive audience segments; never scale paid spend without a diminishing-returns model.',
      howToApply: 'Step 1: Pull total sales + marketing spend for the last quarter from your finance system, excluding customer success / post-sale costs. Step 2: Count new paying customers acquired in the same window (exclude expansion revenue and reactivation of churned accounts). Step 3: Fully-loaded CAC = total spend / new customers. Step 4: Compute payback months = CAC / (monthly ARPU × gross margin %). Step 5: Compute LTV:CAC by dividing cohort-actual LTV (NOT projected LTV) by CAC. Step 6: Use the CAC Calculator to model spend cuts/doubles and their payback impact, plus compare scenarios at higher and lower customer counts. Step 7: Audit CAC by channel monthly — kill channels where LTV:CAC < 1.5:1, scale channels where LTV:CAC > 4:1 and payback stays under 12 months. Step 8: Re-benchmark against industry peers every quarter; CAC rises as categories mature, so a flat CAC is effectively an efficiency win.',
      commonPitfalls: 'Treating blended CAC as the only number — paid CAC is your scaling decision; blended hides organic padding that cannot be scaled. Excluding sales salaries from CAC — fully-loaded CAC is 2-3x what most founders report, and your SaaS investors know this. Comparing CAC across attribution windows — Meta 7-day-click and Google 30-day-click CAC are NOT directly comparable; normalize before benchmarking. Optimizing CAC without LTV context — a $50 CAC with $100 LTV is worse than a $500 CAC with $5K LTV. Ignoring CAC payback period — many SaaS companies show positive LTV:CAC but negative cash flow because payback exceeds 18 months. Forgetting channel mix drift — as paid CAC rises due to audience saturation, shift budget to organic and referral channels BEFORE unit economics break, not after. Imputing zero cost for founder-driven sales — solopreneurs should value their sales time at opportunity cost to avoid rosier CAC readings than reality.',
    },
    zh: {
      whatIs: '客户获取成本（CAC）衡量将一位潜客转化为付费客户所花的全部成本。标准公式为：总销售费用 + 总营销费用（不含售后客成）÷ 同一周期内新增付费客户数。CAC 是 SaaS、DTC 电商和所有订阅型业务最重要的单位经济学指标 —— 一次 CAC 决策会在该客户的整个生命周期中持续放大。综合 CAC 500 美元若对应 LTV 2,500 美元（5:1 比例）属健康，若对应 600 美元（1.2:1）则是灾难。CAC 永远不能单独看，必须与 LTV、回本周期一起解读。',
      whyMatters: 'CAC 是区分可持续增长与现金流崩溃的门槛。LTV:CAC 1:1 的初创公司能融到资但不能自我运转；3:1 可自我造血做温和增长；5:1+ 拥有无限扩展空间。绝大多数早期增长失败都源于 CAC 上升速度快于 LTV —— 通常因为创始人在单位经济学尚未稳固时即启动付费扩量。按渠道（付费 / 自然 / 转介绍 / 销售驱动）和按群组（获取月份）追踪 CAC，可揭示投入扩大时效率是提升还是滑入受众饱和与素材疲劳。CAC 也是投资人评估 SaaS 的领先指标：6-12 个月持续改善的 CAC 趋势能撑起更高的营收倍数。',
      keyConcepts: '1）综合 vs 付费 CAC —— 综合含自然流量 / 转介绍，天然偏低；付费 CAC 是扩量决策的更纯净参照，通常是综合的 2-3 倍。2）全负荷 CAC 必须含销售工资、SDR/BDR 佣金、营销工具、内容制作、付费媒体和分摊管理费 —— 多数创始人漏项导致 CAC 报低 2-3 倍。3）CAC 回本周期 = CAC / (ARPU × 毛利率%) —— 衡量用毛利回收获客成本所需月数；资金效率型 SaaS 5-12 个月回本，晚期大客户 SaaS 可容忍 18-24 个月。4）LTV:CAC 是门槛指标：1:1 危险（每单亏损）、3:1 健康、5:1+ 投入不足。5）边际 CAC 随支出上升 —— 每月 1 万美元比 1000 万美元便宜，因为响应受众会被消耗殆尽；没有边际递减模型就盲目加预算是最常见死法。',
      howToApply: '步骤 1：从财务系统拉过去一个季度的总销售 + 营销支出（排除客成 / 售后）。步骤 2：数同期新增付费客户（不含扩展收入和已流失客户的二次激活）。步骤 3：全负荷 CAC = 总支出 / 新增客户。步骤 4：回本月数 = CAC / (月 ARPU × 毛利率%)。步骤 5：用群组真实 LTV（勿用预测值）算 LTV:CAC。步骤 6：用 CAC 计算器建模支出砍半 / 翻倍对回本的影响，并对比不同客户量场景。步骤 7：每月按渠道审计 CAC —— LTV:CAC < 1.5 的渠道砍掉，> 4 且回本 ≤ 12 月的渠道加码。步骤 8：每个季度与行业基准重对 —— 行业整体 CAC 会随品类成熟上升，因此 CAC 不升就是效率提升。',
      commonPitfalls: '只看综合 CAC —— 付费 CAC 才是扩量决策依据，综合数字掩盖了无法规模化的自然流量稀释。低报 CAC —— 不含销售工资会让真实全负荷数字比你看到的差 2-3 倍。跨归因窗口直接比较 —— Meta 7 天点击 和 Google 30 天点击 的 CAC 不可比，必须归一化。只优化 CAC 不看 LTV —— $50 CAC / $100 LTV 比 $500 CAC / $5K LTV 更糟。忽略回本周期 —— 很多 SaaS LTV:CAC 看似健康但回本超 18 月，现金流为负。忽视渠道组合漂移 —— 付费 CAC 因受众饱和上升时，必须提前把预算转向自然流量与转介绍，不要等破裂才动手。把创始人做销售的时间当作免费 —— 独立创业者应按机会成本把自己的销售时间纳入 CAC，否则会高估效率。',
    },
  },
  'funnel-conversion-optimization': {
    en: {
      whatIs: 'Funnel conversion optimization is the discipline of measuring and improving the percentage of users who progress through each stage of a defined journey — from first awareness signal to the terminal conversion event (purchase, signup, activation, or paid). A funnel is a series of ordered steps where each step captures fewer users than the last, and optimization means identifying the largest absolute drop-off, diagnosing its root cause, and shipping targeted experiments to recover those users. Funnels come in three flavors: marketing funnels (impressions → click → lead → sale, 4 stages), in-product funnels (signup → first action → second action → conversion, 2-5 events tracked in Mixpanel/Amplitude), and checkout funnels (cart → checkout info → shipping → payment → confirmation, 4-6 steps tracked in Shopify/BigCommerce).',
      whyMatters: 'Funnel optimization is the highest-ROI growth lever in most SaaS and DTC businesses because the same acquisition budget converts 30-50% more revenue when mid-funnel drop-offs are tightened. A SaaS funnel that lifts activation from 30% to 45% produces 50% more paying customers without spending an extra dollar on ads. A DTC checkout funnel that lifts completion from 30% to 45% recovers the same revenue lift at zero CAC. The cost of ignoring funnel data is compounding: 97-99% of impressions never click in most paid funnels, 70% of carts are abandoned before checkout, and 60-80% of SaaS signups never reach activation. Each of those gaps is recoverable revenue sitting in the leak.',
      keyConcepts: '1) Marketing funnel vs in-product funnel — marketing funnels measure paid traffic → revenue with revenue-weighted economics (CTR, lead rate, sale rate, AOV); in-product funnels measure event-to-event progression after signup and focus on engagement quality (adoption, activation, retention). 2) Biggest-leak diagnosis — the absolute user loss at each step reveals where optimization dollars produce the most lift; percentage drop-off can mislead when step volumes are small. 3) Stage-specific levers — awareness (creative + targeting), consideration (landing page + CTA), intent (pricing + social proof), purchase (checkout friction), activation (aha moment timing). 4) Activation as the SaaS bottleneck — the signup → activation step is the single biggest leak in most SaaS funnels (40-70% drop); optimizing activation typically triples paid conversion downstream. 5) End-to-end vs step-rate — e2e conversion compounds multiplicatively across steps, so a 10% lift at each of 5 steps produces a 60% overall lift.',
      howToApply: 'Step 1: Define your funnel stages as numbered, observable events (impressions, clicks, leads, sales for marketing; or signup, first_action, activation, conversion for in-product). Step 2: Pull user counts at each stage for the most recent 30-day window from your analytics tool (Mixpanel, Amplitude, Heap, or Shopify for checkout). Step 3: Use the Funnel Value Calculator to model revenue impact for the 4-stage marketing funnel, or the Funnel Step Conversion Analyzer for the 2-5 step in-product funnel. Step 4: Identify the biggest-leak step from the Snapshot section — that is your highest-leverage optimization target. Step 5: Run one experiment per week on that step (ad creative variant, landing page CTA copy, checkout field reduction, onboarding tooltip). Step 6: After 4 weeks of experiments on the leak, recompute and move to the next biggest-leak step. Step 7: For SaaS products, pair with the Feature Adoption Calculator to measure post-activation engagement depth.',
      commonPitfalls: 'Optimizing percentage drop-off instead of absolute user loss — a 50% drop on 10 users matters less than a 10% drop on 100,000 users; always weight by stage volume. Ignoring the funnel stage attribution window — paid CTR (7-day click) and organic conversion (30-day click) measure different cohorts; never blend without normalization. Treating the top of funnel as the optimization priority — the biggest absolute leak is usually NOT awareness (everyone has low CTR); it is more often the mid-funnel landing page or the activation step. Declaring funnel optimization done after a single experiment — most stages require 3-5 experiments before compounding gains appear; one-and-done produces single-digit lifts. Comparing funnels across business models — DTC checkout benchmarks (cart → checkout 50-70%) and SaaS signup benchmarks (visitor → signup 2-10%) live in different universes; use the matching row.',
    },
    zh: {
      whatIs: '漏斗转化优化是衡量并提升用户在定义旅程各阶段（从首次认知信号到终极转化事件——购买、注册、激活或付费）转化率的学科。漏斗是一组有序步骤，每步捕获的用户数递减；优化即识别最大绝对流失、诊断根因、并上线针对性实验来挽回这些用户。漏斗分三类：营销漏斗（曝光→点击→潜客→销售，4 阶段）、产品内漏斗（注册→首次行为→二次行为→转化，在 Mixpanel/Amplitude 追踪 2-5 个事件）、结账漏斗（购物车→填写结账→物流→支付→确认，在 Shopify/BigCommerce 追踪 4-6 步）。',
      whyMatters: '漏斗优化是大多数 SaaS 和 DTC 业务中 ROI 最高的增长杠杆，因为同样的获客预算在中段流失收窄时能多产生 30-50% 营收。SaaS 漏斗激活率从 30% 提升到 45%，付费用户数增加 50% 而广告费一分不加。DTC 结账漏斗完成率从 30% 提升到 45%，以零额外 CAC 获得同等营收提升。忽视漏斗数据的代价是复利式的：多数付费漏斗 97-99% 的曝光不点击、70% 的购物车在结账前放弃、60-80% 的 SaaS 注册从未激活。每一处差距都是可挽回的沉睡收入。',
      keyConcepts: '1）营销漏斗 vs 产品内漏斗 — 营销漏斗衡量付费流量→营收，含收入加权经济（CTR、潜客率、销售率、AOV）；产品内漏斗衡量注册后事件→事件进程，聚焦参与质量（采用、激活、留存）。2）最大流失诊断 — 各步绝对用户损失揭示优化预算能产生最大提升的位置；步量小时，百分比流失会误导。3）阶段专属抓手 — 认知（创意+定向）、考虑（落地页+CTA）、意向（定价+社会证明）、购买（结账摩擦）、激活（啊哈时刻时机）。4）激活是 SaaS 瓶颈 — 注册→激活是多数 SaaS 漏斗最大流失（40-70% 跌落）；优化激活通常让下游付费转化翻三倍。6）端到端 vs 步率 — e2e 转化跨步乘法复合，每步 10% 提升在 5 步漏斗产生 60% 整体提升。',
      howToApply: '步骤 1：把漏斗阶段定义为可观测的有序事件（营销：曝光、点击、潜客、销售；产品内：注册、首次行为、激活、转化）。步骤 2：从分析工具（Mixpanel、Amplitude、Heap，或 Shopify 处理结账）拉最近 30 天窗口每阶段用户数。步骤 3：用 Funnel Value Calculator 建模 4 阶段营销漏斗营收影响，或用 Funnel Step Conversion Analyzer 处理 2-5 步产品内漏斗。步骤 4：从 Snapshot 段识别最大流失步——这是最高杠杆的优化目标。步骤 5：每周在该步跑一个实验（广告创意变体、落地页 CTA 文案、结账字段精简、入职提示框）。步骤 6：在该流失上跑 4 周实验后，重新计算并转向下一个最大流失步。步骤 7：SaaS 产品配合 Feature Adoption Calculator 衡量激活后参与深度。',
      commonPitfalls: '优化百分比流失而非绝对用户损失 — 10 个用户 50% 流失远不如 100,000 个用户 10% 流失重要；始终按阶段体量加权。忽视漏斗阶段归因窗口 — 付费 CTR（7 天点击）和自然搜索转化（30 天点击）衡量不同队列；未归一化不可混合。把漏斗顶视为优化重点 — 绝对最大流失不是认知（大家 CTR 都低）；更常出现在中段落地页或激活步。跑一次实验就宣布漏斗优化完成 — 多数阶段需要 3-5 个实验才显现复利；一锤子只能产生个位数提升。跨业务模型比漏斗 — DTC 结账基准（购物车→结账 50-70%）和 SaaS 注册基准（访客→注册 2-10%）属于不同宇宙；用匹配的行。',
    },
  },
  'net-revenue-retention': {
    en: {
      whatIs: 'Net Revenue Retention (NRR) measures the recurring revenue retained and expanded from existing customers over a period, expressed as a percentage of starting recurring revenue. NRR = (starting MRR + expansion MRR - downgrade MRR - churned MRR) / starting MRR. NRR > 100% means existing customers grew net of churn; NRR < 100% means existing-customer revenue shrank. Gross Revenue Retention (GRR) is the expansion-stripped cousin: GRR = (starting MRR - downgrade MRR - churned MRR) / starting MRR; GRR <= 100% always. Customer Health Score (CHS) is the leading indicator — a 0-100 composite that flags accounts at risk of churn before they appear in either retention metric.',
      whyMatters: 'NRR is the headline SaaS metric every board reports because it isolates the efficiency of your existing-customer revenue engine — without the noise of new logo acquisition. Snowflake has run NRR > 150% for years; Datadog, Twilio, MongoDB, Atlassian all print NRR > 120% at scale. GRR is what tells you whether your foundation is healthy: a company with NRR = 130% and GRR = 70% is expanding aggressively while customers churn underneath — unsustainable. CHS catches this 3-6 months earlier. Investors anchor valuation on NRR: 120%+ NRR earns 10-20x ARR multiples; <100% NRR caps multiples near 3-6x. Rule of 40 (Bessemer) and Magic Number (SaaS Capital) both require NRR >= 100% to compound capital efficiently.',
      keyConcepts: '1) NRR vs GRR — NRR includes expansion (upsell + cross-sell + seat growth + price increase), GRR does not. Always NRR >= GRR. The gap measures expansion intensity. 2) Cohort-anchored calculation — both metrics are anchored to a starting cohort of customers; new logos acquired mid-period do not affect NRR/GRR for that period. 3) Annual vs monthly cadence — board reporting is annual NRR (12-month trailing); operational tracking is monthly. Annual NRR is far more stable than monthly. 4) Leading vs lagging indicators — NRR and GRR are lagging (you know after the period). CHS is leading (you can act in-period). 6) Expansion drivers — upsell (5-15% of starting MRR/year), cross-sell (3-8%), price increase (variable, typically 5-10% on renewing accounts getting strong value), seat growth (10-20% in PLG). 5) The Rule of 40 (Bessemer) — growth rate + profit margin >= 40%; requires NRR >= 100% to compound without dilution. Magic Number (SaaS Capital) — net new ARR / prior-period S&M spend; > 0.75 means efficient growth engine.',
      howToApply: 'Step 1: Pull starting MRR, expansion MRR, downgrade MRR, and churned MRR from your billing system for the period (typically trailing 12 months for board, trailing month for tracking). Step 2: Compute NRR using the formula above; classify into Excellent (≥120%), Good (110-120%), Warning (100-110%), Critical (<100%). Step 3: Compute GRR separately; the gap (NRR minus GRR) tells you how much retention depends on expansion. A gap > 25pp is expansion-dependent and risky. Step 4: Compute a Customer Health Score for top-50 accounts using 5 signals (product usage, NPS, support tickets, engagement, contract value) — identify the bottom decile for save plays. Step 5: Set per-tier NRR targets (Enterprise 120-140%, Mid-market 110-130%, SMB 100-115%) and per-tier GRR floors (Enterprise ≥95%, Mid-market ≥90%, SMB ≥85%). Step 6: Track logo churn separately — Enterprise 5-10%/year, Mid-market 10-15%, SMB 15-25%. Step 7: For forecasting, decompose NRR into gross retention × expansion rate; project cohorts forward 36-60 months to model LTV/CAC payback.',
      commonPitfalls: 'Calculating NRR on new customers too — NRR is strictly an existing-customer metric; new logo MRR goes in new ARR, not in NRR. Comparing monthly NRR to annual NRR — monthly NRR is noisy (seasonality, deal timing); use trailing-12 for board, monthly only for operational alerts. Treating high NRR as a substitute for GRR — a 130% NRR with 80% GRR is a leaky bucket; investors see through this. Reporting blended NRR when you have tiered segments — Enterprise, Mid-market, and SMB have very different NRR dynamics; track separately. Ignoring expansion source breakdown — upsell vs cross-sell vs price increase behave very differently; price-increase motion is the highest-ROI lever but requires strong GRR first. Letting CHS drift to "all green" — recalibrate weights quarterly; a model that always scores 80+ catches no churn.',
    },
    zh: {
      whatIs: '净收入留存（NRR）衡量一段时间内从现有客户保留并扩展的经常性收入，以起始经常性收入的百分比表示。NRR =（起始 MRR + 扩展 MRR − 降级 MRR − 流失 MRR）÷ 起始 MRR。NRR > 100% 表示现有客户净增长；NRR < 100% 表示现有客户收入净收缩。毛收入留存（GRR）是剥离扩展的版本：GRR =（起始 MRR − 降级 MRR − 流失 MRR）÷ 起始 MRR；GRR 永远 ≤ 100%。客户健康分（CHS）是先行指标 — 0-100 的综合分数，在账户流失进入留存指标前提前预警。',
      whyMatters: 'NRR 是每个董事会都会汇报的头部 SaaS 指标，因为它剥离了新客获取噪音，单独衡量现有客户的收入引擎效率。Snowflake 多年保持 NRR > 150%；Datadog、Twilio、MongoDB、Atlassian 在规模化阶段 NRR 都 > 120%。GRR 揭示基础是否健康：NRR = 130% 且 GRR = 70% 的公司是疯狂扩展同时客户流失 — 不可持续。CHS 比这两个指标早 3-6 个月捕捉风险。投资者按 NRR 锚定估值：NRR 120%+ 估值 10-20x ARR；NRR < 100% 估值上限 3-6x。Bessemer 的 40 法则和 SaaS Capital 的 Magic Number 都要求 NRR ≥ 100% 才能高效复合资本。',
      keyConcepts: '1）NRR vs GRR — NRR 含扩展（升级 + 交叉销售 + 席位增长 + 涨价），GRR 不含。永远 NRR ≥ GRR。两者差值衡量扩展强度。2）队列锚定计算 — 两个指标都锚定起始客户队列；期间获取的新 logo 不影响该期 NRR/GRR。3）年度 vs 月度节奏 — 董事会用年度 NRR（12 个月滚动）；运营追踪用月度。年度 NRR 比月度稳定得多。4）先行 vs 滞后指标 — NRR 和 GRR 是滞后（期后才知道）；CHS 是先行（期内就能行动）。5）扩展驱动 — 升级（起始 MRR 的 5-15%/年）、交叉销售（3-8%）、涨价（通常 5-10%，针对获取高价值的续约账户）、席位增长（PLG 模型 10-20%）。6）40 法则（Bessemer）— 增长率 + 利润率 ≥ 40%；要求 NRR ≥ 100% 才能非稀释复合。Magic Number（SaaS Capital）— 净新 ARR ÷ 上期 S&M 支出；> 0.75 说明增长引擎高效。',
      howToApply: '步骤 1：从计费系统拉取期间起始 MRR、扩展 MRR、降级 MRR、流失 MRR（董事会用 12 个月滚动，运营追踪用月度）。步骤 2：用上述公式计算 NRR；分入优秀（≥120%）、良好（110-120%）、警告（100-110%）、危急（<100%）。步骤 3：单独计算 GRR；NRR 与 GRR 差值告诉你留存多依赖扩展。差值 > 25pp 表示扩展依赖度高，风险大。步骤 4：用 5 个信号（产品使用、NPS、支持工单、参与度、合同价值）计算前 50 大账户的 CHS — 锁定底部 10% 做挽回。步骤 5：设分等级 NRR 目标（企业 120-140%、中端市场 110-130%、SMB 100-115%）和分等级 GRR 底线（企业 ≥95%、中端市场 ≥90%、SMB ≥85%）。步骤 6：单独追踪 logo 流失 — 企业 5-10%/年、中端市场 10-15%、SMB 15-25%。步骤 7：预测时把 NRR 拆成毛留存 × 扩展率；队列前向投影 36-60 个月建模 LTV/CAC 回收期。',
      commonPitfalls: '把新客算进 NRR — NRR 严格是现有客户指标；新 logo MRR 算新 ARR，不算 NRR。用月度 NRR 对比年度 NRR — 月度 NRR 噪音大（季节性、交易时机）；董事会用滚动 12 个月，月度只用于运营告警。把高 NRR 当 GRR 替代品 — 130% NRR + 80% GRR 是漏桶；投资者看得穿。按分层客户报时使用混合 NRR — 企业、中端市场、SMB NRR 动态差异大；分层追踪。忽略扩展来源拆分 — 升级、交叉销售、涨价行为差异大；涨价是 ROI 最高的杠杆但需要 GRR 先强。任由 CHS 漂成"全绿" — 每季度重新校准权重；永远 80+ 的模型捕捉不到流失。',
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
  'mrr-growth-strategies': {
    en: {
      whatWeMeasure: 'MRR growth benchmarks across SaaS stages — pre-PMF, early traction ($1K-$10K MRR), scaling ($10K-$100K MRR), and growth (>$100K MRR) — covering net MoM growth rate, NRR, GRR, SaaS Quick Ratio, monthly churn, CAC payback, and Rule of 40.',
      industryBenchmarks: 'Q3 2025 data, blended from OpenView, Bessemer, SaaS Capital, KeyBanc, ICONIQ, and Recurly; updated quarterly per Topic review cadence.',
      rows: [
        { segment: 'Pre-PMF / Validation (<$1K MRR)', metric: 'Net monthly growth rate (MoM)', benchmark: '15-20% MoM', source: 'OpenView SaaS Benchmarks 2024; Bessemer State of the Cloud' },
        { segment: 'Early Traction ($1K-$10K MRR)', metric: 'Net monthly growth rate (MoM)', benchmark: '7-10% MoM', source: 'OpenView SaaS Benchmarks 2024; SaaS Capital' },
        { segment: 'Scaling ($10K-$100K MRR)', metric: 'Net monthly growth rate (MoM)', benchmark: '5-7% MoM', source: 'KeyBanc SaaS Survey 2024; SaaS Capital' },
        { segment: 'Growth (>$100K MRR)', metric: 'Net monthly growth rate (MoM)', benchmark: '3-5% MoM', source: 'OpenView; Bessemer State of the Cloud' },
        { segment: 'All SaaS stages', metric: 'Net Revenue Retention (NRR)', benchmark: '110%+ best-in-class; 100-110% healthy; <100% red flag', source: 'OpenView; ICONIQ Growth; Bessemer' },
        { segment: 'All SaaS stages', metric: 'SaaS Quick Ratio', benchmark: '>4 highly efficient; 2-4 healthy; <2 warning', source: 'OpenView SaaS Benchmarks 2024' },
        { segment: 'SMB SaaS', metric: 'Monthly logo churn', benchmark: '<2% great; 2-3% good; >5% critical', source: 'OpenView; Recurly State of Subscriptions' },
        { segment: 'All SaaS stages', metric: 'CAC payback period', benchmark: '<12 months great; 12-24 mo ok; >24 mo problematic', source: 'OpenView; Bessemer State of the Cloud 2024' },
      ],
      howToUse: 'Pick the row matching your MRR stage, then look up your corresponding metric (net MoM growth, NRR, Quick Ratio, churn, CAC payback). Compare against the benchmark band: if below mid-range, audit the bottleneck — at <$10K MRR fix activation or onboarding; at $10K-$100K MRR fix segmentation or expansion revenue; above $100K MRR fix NRR motion or sales-product handoff. If above mid-range, you have scaling headroom — test marginal efficiency by raising paid spend 20% over 30 days while watching the Quick Ratio stay above 4. Always re-benchmark quarterly; stage transitions (e.g. crossing $10K MRR) reset what "good" means.',
      sources: 'OpenView Partners SaaS Benchmarks 2024; Bessemer Venture Partners State of the Cloud 2024; SaaS Capital Index of SaaS Financial Performance; KeyBanc Capital Markets SaaS Survey 2024; ICONIQ Growth State of SaaS 2024; Recurly State of Subscriptions 2024.',
    },
    zh: {
      whatWeMeasure: '跨 SaaS 阶段的 MRR 增长基准——PMF 前、早期（$1K-$10K MRR）、规模化期（$10K-$100K MRR）、增长期（>$100K MRR）——覆盖净 MoM 增长率、NRR、GRR、SaaS Quick Ratio、月流失、CAC 回本周期、Rule of 40。',
      industryBenchmarks: '2025 Q3 数据；融合 OpenView、Bessemer、SaaS Capital、KeyBanc、ICONIQ、Recurly；按 Topic 季度审查节奏更新。',
      rows: [
        { segment: 'PMF 前 / 验证期（<$1K MRR）', metric: '净月度增长率（MoM）', benchmark: '15-20% MoM', source: 'OpenView SaaS 基准 2024；Bessemer State of the Cloud' },
        { segment: '早期（$1K-$10K MRR）', metric: '净月度增长率（MoM）', benchmark: '7-10% MoM', source: 'OpenView SaaS 基准 2024；SaaS Capital' },
        { segment: '规模化期（$10K-$100K MRR）', metric: '净月度增长率（MoM）', benchmark: '5-7% MoM', source: 'KeyBanc SaaS 调研 2024；SaaS Capital' },
        { segment: '增长期（>$100K MRR）', metric: '净月度增长率（MoM）', benchmark: '3-5% MoM', source: 'OpenView；Bessemer State of the Cloud' },
        { segment: '所有 SaaS 阶段', metric: '净收入留存（NRR）', benchmark: '110%+ 顶级；100-110% 健康；<100% 红警', source: 'OpenView；ICONIQ Growth；Bessemer' },
        { segment: '所有 SaaS 阶段', metric: 'SaaS Quick Ratio', benchmark: '>4 高效；2-4 健康；<2 警戒', source: 'OpenView SaaS 基准 2024' },
        { segment: 'SMB SaaS', metric: '月度 logo 流失', benchmark: '<2% 优；2-3% 良；>5% 危', source: 'OpenView；Recurly 订阅现状' },
        { segment: '所有 SaaS 阶段', metric: 'CAC 回本周期', benchmark: '<12 个月优；12-24 月可；>24 月问题', source: 'OpenView；Bessemer State of the Cloud 2024' },
      ],
      howToUse: '按你的 MRR 阶段选行，再查对应指标（净 MoM 增长、NRR、Quick Ratio、流失、CAC 回本）。与基准带对比：低于中段就诊断瓶颈——<$10K MRR 修激活或 onboarding；$10K-$100K MRR 修分层或扩展收入；>$100K MRR 修 NRR 动作或销售-产品衔接。高于中段有扩展空间——30 天增付费投放 20% 看 Quick Ratio 是否守住 > 4。每季度重对一次；阶段跨越（如突破 $10K MRR）会重置"好"的标准。',
      sources: 'OpenView Partners SaaS 基准 2024；Bessemer Venture Partners State of the Cloud 2024；SaaS Capital SaaS 财务表现指数；KeyBanc Capital Markets SaaS 调研 2024；ICONIQ Growth State of SaaS 2024；Recurly 订阅现状 2024。',
    },
  },
  'customer-acquisition-cost': {
    en: {
      whatWeMeasure: 'Fully-loaded blended CAC and paid CAC by business model (B2B SaaS SMB / mid-market / enterprise, B2C SaaS, DTC e-commerce, lead generation), plus the two LTV:CAC ratio and payback-period anchors used to decide whether the spend is worth scaling.',
      industryBenchmarks: 'Q3 2025 data; updated quarterly per Topic review cadence (HubSpot State of Marketing, OpenView SaaS Benchmarks, KeyBanc, Triple Whale).',
      rows: [
        { segment: 'B2B SaaS (SMB, self-serve)', metric: 'Blended CAC', benchmark: '$300-$1,500', source: 'OpenView SaaS Benchmarks 2024; ChartMogul' },
        { segment: 'B2B SaaS (Mid-market)', metric: 'Blended CAC (sales-led)', benchmark: '$1,000-$5,000', source: 'OpenView 2024; KeyBanc SaaS Survey' },
        { segment: 'B2B SaaS (Enterprise)', metric: 'Blended CAC (field-sales)', benchmark: '$5,000-$25,000', source: 'SaaS Capital; Bessemer State of the Cloud 2024' },
        { segment: 'B2C SaaS (PLG/self-serve)', metric: 'Blended CAC', benchmark: '$50-$300', source: 'OpenView 2024; ChartMogul SMB SaaS data' },
        { segment: 'DTC e-commerce (Meta + Google)', metric: 'Paid CAC (first-order)', benchmark: '$20-$80', source: 'Triple Whale 2024; Shopify DTC guide' },
        { segment: 'Lead generation', metric: 'Cost per qualified lead (CPL)', benchmark: '$50-$300 B2B; $20-$80 B2C', source: 'HubSpot State of Marketing 2024' },
        { segment: 'LTV:CAC ratio (healthy anchor)', metric: 'Ratio benchmark', benchmark: '1:1 danger · 3:1 healthy · 5:1+ mature', source: 'OpenView 2024; SaaS Capital' },
        { segment: 'CAC payback period', metric: 'Months to recover CAC from gross profit', benchmark: '5-7 mo SMB · 12-18 mo mid-market · 18-24 mo enterprise', source: 'OpenView 2024; Bessemer 2024' },
      ],
      howToUse: 'Pick the row matching your business model + stage. Compute your fully-loaded blended CAC AND your paid CAC separately (paid is usually 2-3x blended). Compute payback months = CAC / (ARPU × gross margin). Compare against this table: if LTV:CAC < 1.5 or payback > 18 months, you have a unit-economics problem that more spend will not solve — cut channels where LTV:CAC < 1.5, raise LTV through pricing or retention, or pivot ICP before scaling. If LTV:CAC > 5 and payback < 6 months, you are under-investing in growth — capture the market before competitors widen their funnels.',
      sources: 'OpenView Partners SaaS Benchmarks 2024; SaaS Capital; ChartMogul SaaS benchmark reports 2024; KeyBanc Capital Markets SaaS Survey 2024; Bessemer Venture Partners State of the Cloud 2024; HubSpot State of Marketing 2024; Triple Whale DTC e-commerce benchmarks 2024; Shopify DTC CAC/ROAS Guide 2024; Meta Ads Help Center CAC measurement guidance.',
    },
    zh: {
      whatWeMeasure: '按业务模型（B2B SaaS SMB / 中端 / 大客户、B2C SaaS、DTC 电商、潜客获取）划分的全负荷综合 CAC 与付费 CAC，外加判断"投入是否值得扩量"的两个锚点：LTV:CAC 比例和回本周期。',
      industryBenchmarks: '2025 Q3 数据；按 Topic 季度节奏审查更新（HubSpot 营销现状、OpenView SaaS 基准、KeyBanc、Triple Whale）。',
      rows: [
        { segment: 'B2B SaaS（SMB 自助）', metric: '综合 CAC', benchmark: '$300-$1,500', source: 'OpenView SaaS 基准 2024；ChartMogul' },
        { segment: 'B2B SaaS（中端市场）', metric: '综合 CAC（销售驱动）', benchmark: '$1,000-$5,000', source: 'OpenView 2024；KeyBanc SaaS 调查' },
        { segment: 'B2B SaaS（大客户）', metric: '综合 CAC（驻外销售）', benchmark: '$5,000-$25,000', source: 'SaaS Capital；Bessemer 云端现状 2024' },
        { segment: 'B2C SaaS（PLG / 自助）', metric: '综合 CAC', benchmark: '$50-$300', source: 'OpenView 2024；ChartMogul SMB SaaS 数据' },
        { segment: 'DTC 电商（Meta + Google）', metric: '付费 CAC（首单）', benchmark: '$20-$80', source: 'Triple Whale 2024；Shopify DTC 指南' },
        { segment: '潜客获取', metric: '单合格潜客成本（CPL）', benchmark: '$50-$300 B2B；$20-$80 B2C', source: 'HubSpot 营销现状报告 2024' },
        { segment: 'LTV:CAC 比例（健康锚点）', metric: '比例基准', benchmark: '1:1 危险 · 3:1 健康 · 5:1+ 成熟', source: 'OpenView 2024；SaaS Capital' },
        { segment: 'CAC 回本周期', metric: '用毛利回收 CAC 的月数', benchmark: '5-7 月 SMB · 12-18 月中端 · 18-24 月大客户', source: 'OpenView 2024；Bessemer 2024' },
      ],
      howToUse: '选与你的业务模型 + 阶段匹配的行。分别算全负荷综合 CAC 和付费 CAC（付费通常是综合的 2-3 倍）。回本月数 = CAC / (ARPU × 毛利率)。拿结果对比本表：若 LTV:CAC < 1.5 或回本 > 18 月，单位经济学有问题，靠加预算是救不了的 —— 应先砍 LTV:CAC < 1.5 的渠道、靠提价或留存抬 LTV，或调整 ICP，再决定是否扩量。若 LTV:CAC > 5 且回本 < 6 月，你正处于投入不足区间 —— 应在竞品拓宽漏斗前抢市占。',
      sources: 'OpenView Partners SaaS 基准 2024；SaaS Capital；ChartMogul SaaS 基准报告 2024；KeyBanc 资本市场 SaaS 调查 2024；Bessemer 风险投资 云端现状 2024；HubSpot 营销现状报告 2024；Triple Whale DTC 电商基准 2024；Shopify DTC CAC/ROAS 指南 2024；Meta Ads 帮助中心 CAC 衡量指南。',
    },
  },
  'funnel-conversion-optimization': {
    en: {
      whatWeMeasure: 'Funnel-stage conversion rates across three funnel types: marketing (awareness → interest → consideration → intent → purchase), e-commerce checkout (cart → checkout → purchase), and SaaS signup (visitor → signup → activation → paid). Benchmarks are segmented by funnel type and stage; industry-vertical adjustments apply (B2B vs B2C, SMB vs mid-market).',
      industryBenchmarks: '2025 H2 data; updated semi-annually per Topic review cadence. Sources triangulated across Mixpanel, Amplitude, Hotjar session data, Unbounce CRO benchmarks, WordStream paid-media data, Monetate e-commerce benchmarks, Baymard Institute checkout research, and Salesforce State of Commerce.',
      rows: [
        { segment: 'Marketing funnel — Awareness → Interest (paid ad click-through)', metric: 'CTR (clickers ÷ impressions)', benchmark: '5-15%', source: 'WordStream paid-media benchmarks 2024; Google Ads industry CTR' },
        { segment: 'Marketing funnel — Interest → Consideration (landing page → lead)', metric: 'Lead capture rate (leads ÷ clickers)', benchmark: '20-40%', source: 'Unbounce landing page benchmarks; HubSpot State of Marketing' },
        { segment: 'Marketing funnel — Consideration → Intent (lead → MQL/SQL)', metric: 'Lead-to-qualified rate', benchmark: '30-50%', source: 'Salesforce State of Commerce; Demand Gen Report B2B' },
        { segment: 'Marketing funnel — Intent → Purchase (qualified → closed)', metric: 'Close rate (sales ÷ qualified leads)', benchmark: '10-30%', source: 'Salesforce sales benchmarks; Implisit B2B funnel report' },
        { segment: 'E-commerce checkout — Cart → Checkout (begin checkout)', metric: 'Cart-abandonment inverse (1 − abandonment)', benchmark: '50-70%', source: 'Baymard Institute checkout usability research; Shopify DTC data' },
        { segment: 'E-commerce checkout — Checkout → Purchase (complete order)', metric: 'Checkout completion rate', benchmark: '30-50%', source: 'Baymard Institute; Monetate e-commerce benchmarks 2024' },
        { segment: 'SaaS signup — Visitor → Signup (account creation)', metric: 'Signup conversion rate', benchmark: '2-10%', source: 'Mixpanel SaaS funnel benchmarks; Amplitude Product Benchmarks' },
        { segment: 'SaaS signup — Signup → Activation → Paid (aha moment + monetization)', metric: 'Signup → activation; activation → paid', benchmark: '30-60% activation; 10-30% paid', source: 'Amplitude Product Benchmarks; Mixpanel activation reports; OpenView SaaS benchmarks' },
      ],
      howToUse: 'Pick the row matching your funnel type (marketing / checkout / SaaS) and stage. Compare your observed conversion rate against the benchmark range. If below the low end, audit that stage — typical root causes are creative fatigue (awareness), landing-page friction (consideration), missing social proof (intent), or onboarding gap (activation). If above the high end, you have scaling headroom — test marginal improvements at the next-leak step. For multi-step funnels, weight benchmarks by stage volume: a marketing funnel with 1M impressions but only 5% CTR has 950K potential users recoverable; a SaaS funnel with 100K visitors but only 3% signup has 7K potential users at the activation step. Always recompute monthly; funnel benchmarks drift with seasonality and product changes.',
      sources: 'Mixpanel funnel analysis methodology; Amplitude Product Benchmarks 2024; Hotjar session-replay conversion insights; Unbounce Conversion Benchmark Report 2024; WordStream paid-media CTR benchmarks; Monetate e-commerce quarterly benchmarks; Baymard Institute checkout usability research (60+ studies); Salesforce State of Commerce 2024; HubSpot State of Marketing 2024; Demand Gen Report B2B funnel benchmarks.',
    },
    zh: {
      whatWeMeasure: '三类漏斗的阶段转化率：营销（认知→兴趣→考虑→意向→购买）、结账（购物车→结账→购买）、SaaS 注册（访客→注册→激活→付费）。按漏斗类型和阶段细分；按行业垂直调整（B2B vs B2C、SMB vs 中端市场）。',
      industryBenchmarks: '2025 下半年数据；按 Topic 半年审查节奏更新。来源在 Mixpanel、Amplitude、Hotjar 会话数据、Unbounce CRO 基准、WordStream 付费媒体数据、Monetate 电商基准、Baymard Institute 结账研究、Salesforce 商业现状之间三角验证。',
      rows: [
        { segment: '营销漏斗 — 认知→兴趣（付费广告点击）', metric: 'CTR（点击数÷曝光数）', benchmark: '5-15%', source: 'WordStream 付费媒体基准 2024；Google Ads 行业 CTR' },
        { segment: '营销漏斗 — 兴趣→考虑（落地页→潜客）', metric: '潜客捕获率（潜客÷点击数）', benchmark: '20-40%', source: 'Unbounce 落地页基准；HubSpot 营销现状报告' },
        { segment: '营销漏斗 — 考虑→意向（潜客→MQL/SQL）', metric: '潜客→合格率', benchmark: '30-50%', source: 'Salesforce 商业现状；Demand Gen Report B2B' },
        { segment: '营销漏斗 — 意向→购买（合格→成交）', metric: '成交率（销售÷合格潜客）', benchmark: '10-30%', source: 'Salesforce 销售基准；Implisit B2B 漏斗报告' },
        { segment: '电商结账 — 购物车→结账（开始结账）', metric: '购物车放弃率反推（1 − 放弃率）', benchmark: '50-70%', source: 'Baymard Institute 结账可用性研究；Shopify DTC 数据' },
        { segment: '电商结账 — 结账→购买（完成订单）', metric: '结账完成率', benchmark: '30-50%', source: 'Baymard Institute；Monetate 电商基准 2024' },
        { segment: 'SaaS 注册 — 访客→注册（创建账号）', metric: '注册转化率', benchmark: '2-10%', source: 'Mixpanel SaaS 漏斗基准；Amplitude 产品基准' },
        { segment: 'SaaS 注册 — 注册→激活→付费（啊哈时刻+变现）', metric: '注册→激活；激活→付费', benchmark: '30-60% 激活；10-30% 付费', source: 'Amplitude 产品基准；Mixpanel 激活报告；OpenView SaaS 基准' },
      ],
      howToUse: '选与你的漏斗类型（营销 / 结账 / SaaS）和阶段匹配的行。对比你的观察转化率与基准范围。低于下限，审计该阶段——典型根因有素材疲劳（认知）、落地页摩擦（考虑）、社会证明缺失（意向）、入职断层（激活）。高于上限，有扩展空间——测试下一流失步的边际改善。多步漏斗按阶段体量加权基准：营销漏斗 100 万曝光但仅 5% CTR 有 95 万潜在用户可挽回；SaaS 漏斗 10 万访客但仅 3% 注册有 7 千潜在用户在激活步。每月重算一次；漏斗基准随季节性和产品变动漂移。',
      sources: 'Mixpanel 漏斗分析方法论；Amplitude 产品基准 2024；Hotjar 会话回放转化洞察；Unbounce 转化基准报告 2024；WordStream 付费媒体 CTR 基准；Monetate 电商季度基准；Baymard Institute 结账可用性研究（60+ 研究）；Salesforce 商业现状 2024；HubSpot 营销现状报告 2024；Demand Gen Report B2B 漏斗基准。',
    },
  },
  'net-revenue-retention': {
    en: {
      whatWeMeasure: 'NRR, GRR, logo churn, and expansion revenue benchmarks segmented by SaaS tier (Enterprise, Mid-market, SMB, B2C) and company stage (early, growth, mature). Plus Customer Health Score distribution targets and Magic Number / Rule of 40 thresholds for capital-efficient growth.',
      industryBenchmarks: '2025 SaaS benchmarks; OpenView 2024 SaaS Benchmarks report, Bessemer State of the Cloud 2024, SaaS Capital SaaS Metrics Guide, KeyBanc Capital Markets SaaS Survey, Gainsight Customer Success Benchmarks, Vitally Customer Success Benchmarks.',
      rows: [
        { segment: 'Enterprise SaaS', metric: 'NRR (annual)', benchmark: '120-140%', source: 'OpenView SaaS Benchmarks 2024; ICONIQ Topline Growth' },
        { segment: 'Mid-market SaaS', metric: 'NRR (annual)', benchmark: '110-130%', source: 'OpenView SaaS Benchmarks; Bessemer State of the Cloud 2024' },
        { segment: 'SMB SaaS', metric: 'NRR (annual)', benchmark: '100-115%', source: 'SaaS Capital Metrics Guide; KeyBanc SaaS Survey' },
        { segment: 'B2C SaaS', metric: 'NRR (annual)', benchmark: '80-110%', source: 'Vitally Customer Success Benchmarks; Gainsight' },
        { segment: 'Enterprise SaaS', metric: 'GRR (annual)', benchmark: '95-100%', source: 'OpenView; ICONIQ' },
        { segment: 'Mid-market SaaS', metric: 'GRR (annual)', benchmark: '90-95%', source: 'SaaS Capital; OpenView' },
        { segment: 'SMB SaaS', metric: 'GRR (annual)', benchmark: '85-90%', source: 'SaaS Capital; KeyBanc SaaS Survey' },
        { segment: 'Enterprise SaaS', metric: 'Logo churn (gross, annual)', benchmark: '5-10%', source: 'Bessemer State of the Cloud; Gainsight' },
        { segment: 'Mid-market SaaS', metric: 'Logo churn (gross, annual)', benchmark: '10-15%', source: 'SaaS Capital; OpenView' },
        { segment: 'SMB SaaS', metric: 'Logo churn (gross, annual)', benchmark: '15-25%', source: 'KeyBanc SaaS Survey; Gainsight Customer Health' },
        { segment: 'Expansion — Upsell (annual)', metric: '% of starting MRR', benchmark: '5-15%', source: 'OpenView; Bessemer State of the Cloud 2024' },
        { segment: 'Expansion — Cross-sell (annual)', metric: '% of starting MRR', benchmark: '3-8%', source: 'OpenView SaaS Benchmarks; Gainsight' },
        { segment: 'Customer Health Score distribution', metric: '% Champions (≥80)', benchmark: '30%+', source: 'Gainsight Customer Success Benchmarks; Vitally' },
        { segment: 'Customer Health Score distribution', metric: '% Critical (<40)', benchmark: '<10%', source: 'Gainsight; Vitally Customer Health' },
        { segment: 'Rule of 40 (Bessemer)', metric: 'Growth + Profit Margin', benchmark: '≥40%', source: 'Bessemer State of the Cloud 2024' },
        { segment: 'Magic Number (SaaS Capital)', metric: 'Net New ARR ÷ prior S&M spend', benchmark: '>0.75', source: 'SaaS Capital Metrics Guide' },
      ],
      howToUse: 'Pick the row matching your segment + metric. Compare against the benchmark range. NRR below mid-range: audit expansion source (upsell vs cross-sell vs price increase) and GRR — a low NRR with low GRR is leaky; a low NRR with high GRR is expansion-deficient. GRR below mid-range: churn is the problem — proactive save motion, exit interviews on lost accounts, champion-relationship protection. Logo churn above mid-range: high-touch coverage missing; tier CSM coverage and quarterly business reviews typically reduce logo churn 30-50% within 2 quarters. CHS Champion share below 30% or Critical share above 10%: recalibrate weights and audit data quality — a model that never flags anything is useless. For valuation context, NRR >= 120% supports 10-20x ARR multiples; NRR 100-120% supports 6-10x; NRR < 100% caps at 3-6x. Rule of 40 and Magic Number are gating signals for capital-efficient growth: if you miss both, fix retention before scaling S&M.',
      sources: 'OpenView Partners 2024 SaaS Benchmarks Report; Bessemer Venture Partners State of the Cloud 2024; SaaS Capital SaaS Metrics Guide; KeyBanc Capital Markets 2024 SaaS Survey; ICONIQ Growth TTE-Net Dollar Retention; Gainsight Customer Success Benchmarks 2024; Vitally Customer Success Benchmarks; OpenView The Real Story Behind Net Dollar Retention; SaaS Capital SaaS Retention Metrics; Gainsight Customer Health Score Framework.',
    },
    zh: {
      whatWeMeasure: '企业、中端市场、SMB、B2C 各分层 SaaS 的 NRR、GRR、logo 流失、扩展收入基准，外加 CHS 分布目标和 Magic Number / 40 法则的资本高效增长门槛。',
      industryBenchmarks: '2025 SaaS 基准；OpenView 2024 SaaS 基准报告、Bessemer 云现状 2024、SaaS Capital SaaS 指标指南、KeyBanc 资本市场 SaaS 调查、Gainsight 客户成功基准、Vitally 客户成功基准。',
      rows: [
        { segment: '企业级 SaaS', metric: 'NRR（年度）', benchmark: '120-140%', source: 'OpenView SaaS 基准 2024；ICONIQ 顶部增长' },
        { segment: '中端市场 SaaS', metric: 'NRR（年度）', benchmark: '110-130%', source: 'OpenView SaaS 基准；Bessemer 云现状 2024' },
        { segment: 'SMB SaaS', metric: 'NRR（年度）', benchmark: '100-115%', source: 'SaaS Capital 指标指南；KeyBanc SaaS 调查' },
        { segment: 'B2C SaaS', metric: 'NRR（年度）', benchmark: '80-110%', source: 'Vitally 客户成功基准；Gainsight' },
        { segment: '企业级 SaaS', metric: 'GRR（年度）', benchmark: '95-100%', source: 'OpenView；ICONIQ' },
        { segment: '中端市场 SaaS', metric: 'GRR（年度）', benchmark: '90-95%', source: 'SaaS Capital；OpenView' },
        { segment: 'SMB SaaS', metric: 'GRR（年度）', benchmark: '85-90%', source: 'SaaS Capital；KeyBanc SaaS 调查' },
        { segment: '企业级 SaaS', metric: 'Logo 流失（毛，年度）', benchmark: '5-10%', source: 'Bessemer 云现状；Gainsight' },
        { segment: '中端市场 SaaS', metric: 'Logo 流失（毛，年度）', benchmark: '10-15%', source: 'SaaS Capital；OpenView' },
        { segment: 'SMB SaaS', metric: 'Logo 流失（毛，年度）', benchmark: '15-25%', source: 'KeyBanc SaaS 调查；Gainsight 客户健康' },
        { segment: '扩展 — 升级（年度）', metric: '起始 MRR 占比', benchmark: '5-15%', source: 'OpenView；Bessemer 云现状 2024' },
        { segment: '扩展 — 交叉销售（年度）', metric: '起始 MRR 占比', benchmark: '3-8%', source: 'OpenView SaaS 基准；Gainsight' },
        { segment: '客户健康分分布', metric: '冠军占比（≥80）', benchmark: '30%+', source: 'Gainsight 客户成功基准；Vitally' },
        { segment: '客户健康分分布', metric: '危急占比（<40）', benchmark: '<10%', source: 'Gainsight；Vitally 客户健康' },
        { segment: '40 法则（Bessemer）', metric: '增长率 + 利润率', benchmark: '≥40%', source: 'Bessemer 云现状 2024' },
        { segment: 'Magic Number（SaaS Capital）', metric: '净新 ARR ÷ 上期 S&M 支出', benchmark: '>0.75', source: 'SaaS Capital 指标指南' },
      ],
      howToUse: '选与你的分层 + 指标匹配的行。对比你的数据与基准区间。NRR 低于中位：审计扩展来源（升级、交叉销售、涨价）和 GRR — NRR 低 + GRR 低是漏桶；NRR 低 + GRR 高是扩展不足。GRR 低于中位：流失是问题 — 主动挽回、流失账户退出访谈、冠军关系保护。Logo 流失高于中位：缺失高接触覆盖；分层 CSM 覆盖和季度业务回顾通常在 2 个季度内降低 logo 流失 30-50%。CHS 冠军占比 < 30% 或危急占比 > 10%：重新校准权重并审计数据质量 — 永不预警的模型没用。估值语境：NRR ≥ 120% 支持 10-20x ARR 倍数；NRR 100-120% 支持 6-10x；NRR < 100% 上限 3-6x。40 法则和 Magic Number 是资本高效增长的门槛：两个都不达标，先修留存再扩 S&M。',
      sources: 'OpenView Partners 2024 SaaS 基准报告；Bessemer Venture Partners 云现状 2024；SaaS Capital SaaS 指标指南；KeyBanc 资本市场 2024 SaaS 调查；ICONIQ Growth TTE-Net Dollar Retention；Gainsight 客户成功基准 2024；Vitally 客户成功基准；OpenView The Real Story Behind Net Dollar Retention；SaaS Capital SaaS 留存指标；Gainsight 客户健康分框架。',
    },
  },
};