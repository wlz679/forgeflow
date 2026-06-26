# Plan 3: Category 落地页 + Header + Breadcrumb Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create 6 top-level category landing pages (`/[lang]/[category-slug]/`) with Introduction / All Tools / FAQ / Guides / Cross-link sections. Add a Categories dropdown to Header. Add a Category middle layer to tool-page breadcrumbs. Extend sitemap with category URLs. Build a small `src/lib/seo-factory.ts` with 3 schema helpers to avoid inline JSON.stringify duplication.

**Architecture:** Six static page files (one per category, 6 × 2 lang = 12 pages) — chosen over dynamic route because Astro prohibits two dynamic files at the same level (`[slug].astro` is already taken). Each page composes 4 small components (`CategoryHero` / `CategoryFaq` / `CategoryGuides` / `CategoryOtherNav`) and reuses existing `ToolCard` and `FAQ`. JSON-LD emitted via new `seo-factory.ts` helpers. Header gains a `<details>`-based Categories dropdown (zero JS). Tool page breadcrumb extends from 2 to 3 items (Home > Category > Tool) by inserting one level in the existing BreadcrumbList block. Sitemap `serialize` adds `isCategory` branch with priority 0.8.

**Tech Stack:** Astro 4.16 static SSG · TypeScript 5.6 strict · Node 20+ · node:test (tsx runner) · Tailwind 4

**Task classification:** `[INTEGRATION]` × 5 — 2 reviewers (spec compliance + code quality) per task

**Predecessor spec:** `docs/superpowers/specs/2026-06-27-content-depth-pages-design.md` (commit `068cfe6`)

**Predecessor plans (must be shipped first):**
- `2026-06-27-content-pages-plan-eeat.md` (Plan 1) — adds `eeat.*` 10 keys + EeatTrustBlock + ToolMeta.EEAT fields
- `2026-06-27-content-pages-plan-about.md` (Plan 2) — adds `about.{mission,data_sources,update_policy,editorial_policy,contact,roadmap}.{h1,body}` 12 keys

Plan 3's `check-i18n-completeness.mjs` Step 1.5 re-declares the `eeat` and `about` REQUIRED_KEYS blocks verbatim (they are the same 22 keys as Plan 1 + Plan 2). This is intentional — keeps Plan 3 self-contained for execution but means Plan 3 cannot be executed in isolation; Plan 1 and Plan 2 must ship first to populate the i18n keys those blocks check.

---

## File Structure

| File | Operation | Purpose |
|---|---|---|
| `src/i18n/translations.ts` | Modify | Add 156 keys (6 categories × 26 keys = 156) + 1 `header.categories` × 2 lang = 314 entries |
| `scripts/check-i18n-completeness.mjs` | Modify | Add `category` + `header` REQUIRED_KEYS blocks (157 keys) |
| `src/lib/seo-factory.ts` | Create | `createCollectionPage()` / `createCategoryItemList()` / `createBreadcrumb3()` |
| `src/components/CategoryHero.astro` | Create | Hero block (H1 + description + tool count) |
| `src/components/CategoryFaq.astro` | Create | FAQ block (5 Q/A + FAQPage schema) |
| `src/components/CategoryGuides.astro` | Create | Guides block (manual + auto-pulled blog list) |
| `src/components/CategoryOtherNav.astro` | Create | Cross-link to other 5 categories |
| `src/pages/[lang]/saas-metrics.astro` | Create | SaaS Metrics landing |
| `src/pages/[lang]/ai-cost-tools.astro` | Create | AI Cost Tools landing |
| `src/pages/[lang]/valuation-exit.astro` | Create | Valuation & Exit landing |
| `src/pages/[lang]/freelance-pricing.astro` | Create | Freelance Pricing landing |
| `src/pages/[lang]/cost-efficiency.astro` | Create | Cost & Efficiency landing |
| `src/pages/[lang]/investment-roi.astro` | Create | Investment & ROI landing |
| `src/components/Header.astro` | Modify | Add `<details>` Categories dropdown |
| `src/pages/[lang]/[slug].astro` | Modify | Insert Category middle layer in BreadcrumbList (2 → 3 items) |
| `astro.config.mjs` | Modify | sitemap `serialize` adds `isCategory` branch (priority 0.8) |
| `tests/seo-schemas.test.ts` | Modify | Add 6 tests: CollectionPage + breadcrumb 3-layer + ItemList |

**Total: 6 new components/pages, 1 new lib, 1 new (extended) test, 4 modified files. 12 new pages × 2 lang = 12 new URL outputs (net +12 over Plan 1/2 final = 153 total).**

---

## Task 1: i18n 156 category keys + check-i18n extension

**Files:**
- Modify: `src/i18n/translations.ts`
- Modify: `scripts/check-i18n-completeness.mjs`

- [ ] **Step 1.1: Locate insertion point**

Run: `grep -nE "^  'category\.[A-F]\.name':" src/i18n/translations.ts | head -1`
Expected: a line number near the alphabetical anchor.

- [ ] **Step 1.2: Insert 156 category keys + 1 header.categories key**

**Before** the first `category.{A-F}.name:` line, insert this block (6 categories × (3 intro + 5 FAQ × 2 + 3 guides × 2) + 1 header key = 78 unique keys × 2 lang = 156 entries):

```ts
  // Category A — SaaS Metrics
  'category.A.intro.h2': { en: 'About SaaS Metrics Calculators', zh: '关于 SaaS 指标计算器' },
  'category.A.intro.1': { en: 'SaaS metrics are the foundation of every recurring-revenue business. Whether you are tracking monthly recurring revenue, calculating burn rate, or forecasting churn, the right numbers tell you when to grow, when to cut, and when to fundraise.', zh: 'SaaS 指标是每家经常性收入业务的基础。无论你是在跟踪月度经常性收入、计算烧钱率，还是预测流失率，正确的数字都会告诉你何时扩张、何时削减、何时融资。' },
  'category.A.intro.2': { en: 'Our 5 SaaS Metrics calculators cover the full lifecycle — from MRR tracking and churn analysis to market sizing and revenue forecasting. All run instantly in your browser, no signup, no data sent to any server.', zh: '我们的 5 个 SaaS 指标计算器覆盖完整生命周期 — 从 MRR 跟踪和流失率分析到市场规模和收入预测。全部在浏览器中即时运行，无需注册，不向任何服务器发送数据。' },
  'category.A.intro.3': { en: 'Each calculator uses industry-standard formulas referenced in OpenView SaaS Benchmarks, Stripe Documentation, and HubSpot Marketing Reports. Numbers update live as you type.', zh: '每个计算器使用 OpenView SaaS 基准、Stripe 文档和 HubSpot 营销报告中的行业标准公式。数字在你输入时实时更新。' },
  'category.A.faq.q1.q': { en: 'What is a healthy MRR growth rate for an early-stage SaaS?', zh: '早期 SaaS 健康的 MRR 增长率是多少？' },
  'category.A.faq.q1.a': { en: 'For a Series A SaaS, 10-15% MoM MRR growth is the benchmark. Below 5% signals trouble; above 20% is exceptional and often unsustainable.', zh: '对于 A 轮 SaaS，10-15% 月环比 MRR 增长是基准。低于 5% 预示问题；高于 20% 是例外且通常不可持续。' },
  'category.A.faq.q2.q': { en: 'How do I calculate burn multiple?', zh: '如何计算烧钱倍数（Burn Multiple）？' },
  'category.A.faq.q2.a': { en: 'Burn Multiple = Net Burn / Net New ARR. A score under 1.0 is great; under 0.5 is exceptional. It measures capital efficiency.', zh: '烧钱倍数 = 净烧钱 / 新增 ARR。低于 1.0 优秀；低于 0.5 卓越。它衡量资本效率。' },
  'category.A.faq.q3.q': { en: 'What is the difference between logo churn and revenue churn?', zh: '客户流失率（Logo Churn）和收入流失率（Revenue Churn）的区别是什么？' },
  'category.A.faq.q3.a': { en: 'Logo churn counts customers lost; revenue churn measures MRR lost. High logo churn with low revenue churn means your small customers are leaving while big ones stay.', zh: '客户流失率统计流失的客户数；收入流失率衡量损失的 MRR。高客户流失伴随低收入流失意味着小客户在离开而大客户在留下。' },
  'category.A.faq.q4.q': { en: 'How big should my market size estimate be?', zh: '市场规模估算应该多大？' },
  'category.A.faq.q4.a': { en: 'A useful TAM is the total spend in your specific niche, not the entire software market. Top-down estimates tend to be 10-100x larger than realistic SAMs.', zh: '有用的 TAM 是你特定细分市场的总支出，而非整个软件市场。自上而下估算往往比现实 SAM 大 10-100 倍。' },
  'category.A.faq.q5.q': { en: 'Should I forecast revenue monthly or annually?', zh: '我应该按月还是按年预测收入？' },
  'category.A.faq.q5.a': { en: 'Forecast monthly for the next 12 months; annually for years 2-3. Monthly granularity catches seasonality; annual hides it.', zh: '未来 12 个月按月预测；2-3 年按年预测。月度粒度能捕捉季节性；年度粒度会隐藏它。' },
  'category.A.guide.1.title': { en: 'The 5 SaaS Metrics That Actually Matter', zh: '真正重要的 5 个 SaaS 指标' },
  'category.A.guide.1.desc': { en: 'Why MRR, NRR, CAC payback, gross margin, and burn multiple beat vanity metrics.', zh: '为什么 MRR、NRR、CAC 回本、毛利率和烧钱倍数胜过虚荣指标。' },
  'category.A.guide.2.title': { en: 'Reading a Burn Rate Report', zh: '如何阅读烧钱率报告' },
  'category.A.guide.2.desc': { en: 'From cash balance to runway months to Default Alive vs Default Dead.', zh: '从现金余额到跑道月数再到默认存活与默认死亡。' },
  'category.A.guide.3.title': { en: 'Churn Is a Symptom, Not a Cause', zh: '流失是症状而非原因' },
  'category.A.guide.3.desc': { en: 'How to read attribution analysis to find the real driver behind customer loss.', zh: '如何阅读归因分析找到客户流失背后的真正驱动因素。' },

  // Category B — AI Cost Tools
  'category.B.intro.h2': { en: 'About AI Cost Calculators', zh: '关于 AI 成本计算器' },
  'category.B.intro.1': { en: 'AI inference costs are the second-largest expense for most AI-native startups after salaries. A single misconfigured prompt loop can burn $5,000/month without you noticing.', zh: 'AI 推理成本是大多数 AI 原生初创公司的第二大支出（仅次于工资）。单个配置错误的提示循环可能在你不注意的情况下每月烧掉 5,000 美元。' },
  'category.B.intro.2': { en: 'Our 8 AI cost calculators cover every major provider: OpenAI (GPT-4o, GPT-5), Anthropic (Claude Sonnet, Opus, Haiku), Google (Gemini), DeepSeek, plus GPU cloud pricing across 6 providers and image generation across 7 services.', zh: '我们的 8 个 AI 成本计算器覆盖每个主要提供商：OpenAI（GPT-4o、GPT-5）、Anthropic（Claude Sonnet、Opus、Haiku）、Google（Gemini）、DeepSeek，外加 6 家提供商的 GPU 云定价和 7 个服务的图像生成。' },
  'category.B.intro.3': { en: 'All pricing data syncs weekly from the LiteLLM model registry via GitHub Actions. The "Last reviewed" date on every page reflects the most recent sync.', zh: '所有定价数据通过 GitHub Actions 从 LiteLLM 模型注册表每周同步。每个页面上的「最后审核」日期反映最近一次同步。' },
  'category.B.faq.q1.q': { en: 'How much does GPT-4o cost per million tokens?', zh: 'GPT-4o 每百万 token 多少钱？' },
  'category.B.faq.q1.a': { en: 'GPT-4o is $2.50/1M input tokens and $10/1M output tokens as of 2026-06-22. Use the OpenAI token calculator for per-request estimates.', zh: '截至 2026-06-22，GPT-4o 价格为输入 $2.50/1M token，输出 $10/1M token。使用 OpenAI token 计算器进行单次请求估算。' },
  'category.B.faq.q2.q': { en: 'Is Claude cheaper than GPT-4?', zh: 'Claude 比 GPT-4 便宜吗？' },
  'category.B.faq.q2.a': { en: 'Claude Haiku 4.5 ($0.80/$4) is cheaper than GPT-4o for simple tasks. Claude Sonnet 4.5 ($3/$15) is comparable. Claude Opus 4 ($15/$75) is the premium tier.', zh: '对于简单任务，Claude Haiku 4.5（$0.80/$4）比 GPT-4o 便宜。Claude Sonnet 4.5（$3/$15）相当。Claude Opus 4（$15/$75）是高端档。' },
  'category.B.faq.q3.q': { en: 'Should I use DeepSeek for cost savings?', zh: '我应该使用 DeepSeek 节省成本吗？' },
  'category.B.faq.q3.a': { en: 'DeepSeek V3 ($0.27/$1.10) is 10x cheaper than GPT-4o for many tasks but has stricter content filters and is hosted outside the US. Use the comparison tool to evaluate.', zh: '对于许多任务，DeepSeek V3（$0.27/$1.10）比 GPT-4o 便宜 10 倍，但内容过滤器更严格且托管在美国境外。使用对比工具评估。' },
  'category.B.faq.q4.q': { en: 'How do I estimate GPU training cost?', zh: '如何估算 GPU 训练成本？' },
  'category.B.faq.q4.a': { en: 'Training cost = (GPU hourly rate × training hours × GPU count) + storage + data processing. Our AI training cost estimator handles LoRA vs full-finetune separately.', zh: '训练成本 =（GPU 时薪 × 训练小时数 × GPU 数量）+ 存储 + 数据处理。我们的 AI 训练成本估算器分别处理 LoRA 与全量微调。' },
  'category.B.faq.q5.q': { en: 'What is the cheapest image generation API?', zh: '最便宜的图像生成 API 是什么？' },
  'category.B.faq.q5.a': { en: 'For SDXL-quality images: Together AI ($0.0008/image) and Stability AI direct are cheapest. For premium DALL-E 3 quality: expect $0.04-0.08 per image.', zh: '对于 SDXL 质量图像：Together AI（$0.0008/张）和直接使用 Stability AI 最便宜。对于高端 DALL-E 3 质量：每张 0.04-0.08 美元。' },
  'category.B.guide.1.title': { en: 'Reading an AI Cost Bill', zh: '如何阅读 AI 成本账单' },
  'category.B.guide.1.desc': { en: 'What "input tokens" vs "output tokens" really cost and where surprise charges come from.', zh: '「输入 token」与「输出 token」的真实成本以及意外费用从何而来。' },
  'category.B.guide.2.title': { en: 'Cross-Provider Pricing Strategy', zh: '跨提供商定价策略' },
  'category.B.guide.2.desc': { en: 'Routing simple tasks to cheap models and complex tasks to premium models — a 5x cost cut.', zh: '将简单任务路由到便宜模型，复杂任务路由到高端模型 — 削减 5 倍成本。' },
  'category.B.guide.3.title': { en: 'GPU Cloud vs Self-Hosting', zh: 'GPU 云 vs 自建' },
  'category.B.guide.3.desc': { en: 'The break-even point for self-hosting an H100 is about 4,000 hours of utilization per year.', zh: '自建 H100 的盈亏平衡点约为每年 4,000 小时利用率。' },

  // Category C — Valuation & Exit
  'category.C.intro.h2': { en: 'About Valuation Calculators', zh: '关于估值计算器' },
  'category.C.intro.1': { en: 'Valuation is both art and arithmetic. The arithmetic is straightforward — multiple × revenue, or DCF analysis, or comparable transactions. The art is choosing which multiple applies to your stage and sector.', zh: '估值既是艺术也是算术。算术很简单 — 倍数 × 收入，或 DCF 分析，或可比交易。艺术在于选择哪个倍数适用于你的阶段和行业。' },
  'category.C.intro.2': { en: 'Our 9 valuation and unit-economics calculators help founders, angels, and acquirers estimate fair value. All formulas are based on SaaS Capital, Equidam, and Visible.vc methodology.', zh: '我们的 9 个估值和单位经济学计算器帮助创业者、天使投资人和收购方估算公允价值。所有公式基于 SaaS Capital、Equidam 和 Visible.vc 方法论。' },
  'category.C.intro.3': { en: 'Whether you are raising a seed round, planning an exit, or negotiating equity dilution, these tools give you the numbers to back your narrative.', zh: '无论你是在进行种子轮融资、规划退出，还是谈判股权稀释，这些工具都为你提供支撑叙事的数字。' },
  'category.C.faq.q1.q': { en: 'What is a good LTV/CAC ratio?', zh: 'LTV/CAC 比率多少合适？' },
  'category.C.faq.q1.a': { en: 'LTV/CAC of 3:1 is the SaaS benchmark. Below 1:1 means you are losing money on each customer; above 5:1 means you are likely under-investing in growth.', zh: '3:1 的 LTV/CAC 是 SaaS 基准。低于 1:1 意味着每位客户都在亏损；高于 5:1 意味着你可能在增长上投入不足。' },
  'category.C.faq.q2.q': { en: 'How do I value a pre-revenue SaaS?', zh: '如何为预收入 SaaS 估值？' },
  'category.C.faq.q2.a': { en: 'Pre-revenue SaaS is typically valued at $1-3M ARR-equivalent plus a factor for team and traction. The SaaS valuation calculator handles this.', zh: '预收入 SaaS 通常按 $1-3M ARR 等价估值，加上团队和牵引力的因素。SaaS 估值计算器处理此情况。' },
  'category.C.faq.q3.q': { en: 'What is the 40% rule?', zh: '40% 规则是什么？' },
  'category.C.faq.q3.a': { en: 'Rule of 40: Revenue growth rate + profit margin should equal 40% or more. It is the cleanest single number for SaaS health.', zh: '40 规则：收入增长率 + 利润率应等于或超过 40%。这是衡量 SaaS 健康度的最简洁单一数字。' },
  'category.C.faq.q4.q': { en: 'How much equity should I give up in a seed round?', zh: '种子轮我应该让出多少股权？' },
  'category.C.faq.q4.a': { en: 'A typical seed round dilutes founders by 15-25%. Use the equity dilution calculator to model specific scenarios including option pool refresh.', zh: '典型种子轮稀释创始人 15-25%。使用股权稀释计算器建模包含期权池刷新的具体场景。' },
  'category.C.faq.q5.q': { en: 'What is a reasonable SaaS valuation multiple in 2026?', zh: '2026 年合理的 SaaS 估值倍数是多少？' },
  'category.C.faq.q5.a': { en: 'Public SaaS trades at 6-12x ARR; private rounds in 2026 are 8-15x for high-growth, 4-7x for slower growth. Multiples compress as rates rise.', zh: '上市 SaaS 交易于 6-12 倍 ARR；2026 年私下轮对高增长为 8-15 倍，对较慢增长为 4-7 倍。随着利率上升倍数会压缩。' },
  'category.C.guide.1.title': { en: 'CAC, LTV, and the Unit Economics of SaaS', zh: 'CAC、LTV 与 SaaS 单位经济学' },
  'category.C.guide.1.desc': { en: 'Why your LTV/CAC ratio matters more than your revenue number.', zh: '为什么 LTV/CAC 比率比你的收入数字更重要。' },
  'category.C.guide.2.title': { en: 'Reading an Equity Term Sheet', zh: '如何阅读股权条款清单' },
  'category.C.guide.2.desc': { en: 'Pre-money vs post-money, option pool shuffle, liquidation preferences explained.', zh: '投前 vs 投后、期权池洗牌、清算优先权解析。' },
  'category.C.guide.3.title': { en: 'Valuation Multiples Across Stages', zh: '各阶段的估值倍数' },
  'category.C.guide.3.desc': { en: 'Seed to Series D: what to expect at each round in 2026.', zh: '种子轮到 D 轮：2026 年每轮预期。' },

  // Category D — Freelance Pricing
  'category.D.intro.h2': { en: 'About Freelance Pricing Calculators', zh: '关于自由职业定价计算器' },
  'category.D.intro.1': { en: 'Most freelancers undercharge. Not because they lack skill, but because they price based on hours instead of value delivered. Our calculators help you find the number that reflects your actual worth.', zh: '大多数自由职业者收费过低。不是因为缺乏技能，而是因为定价基于小时数而非交付价值。我们的计算器帮助你找到反映实际价值的数字。' },
  'category.D.intro.2': { en: 'Three freelance pricing calculators cover the most common scenarios: hourly rate, project-based pricing, and affiliate income modeling. All are based on Glassdoor, Upwork Rate Insights, and Contena benchmarks.', zh: '三个自由职业定价计算器覆盖最常见场景：小时费率、基于项目的定价和联盟收入建模。全部基于 Glassdoor、Upwork 费率洞察和 Contena 基准。' },
  'category.D.intro.3': { en: 'Use the freelance rate calculator to find your baseline, then layer in project profitability for one-off engagements.', zh: '使用自由职业费率计算器找到基线，然后为一次性合作叠加项目盈利能力。' },
  'category.D.faq.q1.q': { en: 'How do I calculate my freelance hourly rate?', zh: '如何计算我的自由职业小时费率？' },
  'category.D.faq.q1.a': { en: 'Hourly rate = (Annual income goal + business expenses + profit margin) / billable hours. Most freelancers undercount expenses and billable hours.', zh: '小时费率 =（年收入目标 + 业务支出 + 利润率）/ 可计费小时数。大多数自由职业者低估了支出和可计费小时数。' },
  'category.D.faq.q2.q': { en: 'Should I charge hourly or per project?', zh: '我应该按小时还是按项目收费？' },
  'category.D.faq.q2.a': { en: 'Charge hourly when scope is unclear; per project when scope is well-defined. Per project rewards efficiency; hourly rewards time spent.', zh: '范围不清时按小时计费；范围明确时按项目计费。按项目奖励效率；按小时奖励时间投入。' },
  'category.D.faq.q3.q': { en: 'What is a reasonable affiliate income?', zh: '合理的联盟收入是多少？' },
  'category.D.faq.q3.a': { en: 'For a content site with 50K monthly visitors: $500-2,000/month is achievable. For 500K visitors: $5,000-20,000/month. Conversion rate is the multiplier.', zh: '对于月访问量 5 万的内容站：可达到 $500-2,000/月。对于 50 万访问量：$5,000-20,000/月。转化率是关键乘数。' },
  'category.D.faq.q4.q': { en: 'How much buffer should I add to project quotes?', zh: '项目报价应该留多少缓冲？' },
  'category.D.faq.q4.a': { en: 'Add 20-30% buffer to your estimate. The first 10% covers scope creep, the second 10% covers revisions, the third 10% is your profit margin.', zh: '在估算基础上增加 20-30% 缓冲。第一个 10% 覆盖范围蔓延，第二个 10% 覆盖修订，第三个 10% 是你的利润率。' },
  'category.D.faq.q5.q': { en: 'What is the going rate for a freelance developer in 2026?', zh: '2026 年自由职业开发者的市场费率是多少？' },
  'category.D.faq.q5.a': { en: 'Mid-level freelance developers: $75-150/hour. Specialized (AI, security, blockchain): $150-300/hour. Rates are 20-30% higher in the US than in Eastern Europe or LATAM.', zh: '中级自由职业开发者：$75-150/小时。专业方向（AI、安全、区块链）：$150-300/小时。美国的费率比东欧或拉美高 20-30%。' },
  'category.D.guide.1.title': { en: 'Why You Should Never Discount', zh: '为什么你永远不应该打折' },
  'category.D.guide.1.desc': { en: 'The hidden cost of discounting freelance rates and what to do instead.', zh: '自由职业费率打折的隐性成本以及应该怎么做。' },
  'category.D.guide.2.title': { en: 'Building a Project Retainer', zh: '建立项目保留合同' },
  'category.D.guide.2.desc': { en: 'From one-off gigs to $5K/month recurring engagements.', zh: '从一次性业务到 $5K/月的经常性合作。' },
  'category.D.guide.3.title': { en: 'Affiliate Marketing for Non-Gurus', zh: '非专家的联盟营销' },
  'category.D.guide.3.desc': { en: 'Honest math on what realistic affiliate income looks like for a 50K monthly visitor site.', zh: '50K 月访问量网站的现实联盟收入数字。' },

  // Category E — Cost & Efficiency
  'category.E.intro.h2': { en: 'About Cost & Efficiency Calculators', zh: '关于成本与效率计算器' },
  'category.E.intro.1': { en: 'The cost of inefficiency is invisible until you measure it. A 30-minute meeting with 6 people at $75/hour costs $225 — and most teams hold 10+ such meetings per week. That is $11,700/month per team.', zh: '低效的成本在测量之前是不可见的。6 人参与的 30 分钟会议按 $75/小时计算，耗资 $225 — 大多数团队每周举行 10+ 次此类会议。每个团队每月 $11,700。' },
  'category.E.intro.2': { en: 'Our 3 cost & efficiency calculators surface the hidden costs of meetings, employee overhead, and personal productivity drag. Numbers come from BLS Employer Costs, Harvard Business Review, and ZipRecruiter.', zh: '我们的 3 个成本与效率计算器揭示会议、员工管理成本和个人效率拖累的隐性成本。数字来自 BLS 雇主成本、哈佛商业评论和 ZipRecruiter。' },
  'category.E.intro.3': { en: 'Use these tools to find your largest hidden expense — most teams discover it is meetings, not salaries.', zh: '使用这些工具找到你最大的隐性支出 — 大多数团队发现这是会议，而非工资。' },
  'category.E.faq.q1.q': { en: 'How much does a typical meeting cost?', zh: '一次典型会议的成本是多少？' },
  'category.E.faq.q1.a': { en: 'A 6-person, 30-minute meeting at $75/hour average costs $225. Companies with 50 employees average $150K/year in meeting time alone.', zh: '6 人、30 分钟、平均 $75/小时的会议耗资 $225。50 人的公司平均每年仅会议时间就花费 $15 万。' },
  'category.E.faq.q2.q': { en: 'What does a true employee cost beyond salary?', zh: '除工资外，员工真实成本是多少？' },
  'category.E.faq.q2.a': { en: 'Total employee cost is typically 1.25-1.4× base salary (benefits, taxes, equipment, real estate). Senior hires in the US can reach 1.5×.', zh: '员工总成本通常为基础工资的 1.25-1.4 倍（福利、税务、设备、房地产）。美国的资深员工可达 1.5 倍。' },
  'category.E.faq.q3.q': { en: 'How do I measure personal productivity?', zh: '如何衡量个人效率？' },
  'category.E.faq.q3.a': { en: 'Track deep work hours, meeting hours, and tool-switching frequency. The productivity score calculator turns these into a single comparable number.', zh: '跟踪深度工作小时数、会议小时数和工具切换频率。效率评分计算器将这些转化为单一可比较的数字。' },
  'category.E.faq.q4.q': { en: 'Are remote employees cheaper?', zh: '远程员工更便宜吗？' },
  'category.E.faq.q4.a': { en: 'Direct cost: yes, often 30-50% cheaper in lower-cost regions. Total cost: depends on time zone overlap and communication overhead — sometimes the savings are zero.', zh: '直接成本：是的，在低成本地区通常便宜 30-50%。总成本：取决于时区重叠和沟通开销 — 有时节省为零。' },
  'category.E.faq.q5.q': { en: 'How many meetings are too many?', zh: '多少会议算太多？' },
  'category.E.faq.q5.a': { en: 'Above 15 hours/week of meetings, productivity drops sharply. Above 25 hours/week, it becomes a full-time job just to attend meetings.', zh: '每周会议超过 15 小时，效率急剧下降。超过 25 小时，参加会议本身就成为一份全职工作。' },
  'category.E.guide.1.title': { en: 'The True Cost of a Meeting', zh: '一次会议的真正成本' },
  'category.E.guide.1.desc': { en: 'Why the meeting cost on your calendar is the smallest line item.', zh: '为什么日历上会议成本只是最小的一行。' },
  'category.E.guide.2.title': { en: 'Calculating Fully-Loaded Salary', zh: '计算全负荷薪资' },
  'category.E.guide.2.desc': { en: 'The 1.4x rule and what it means for hiring decisions.', zh: '1.4 倍规则及其对招聘决策的意义。' },
  'category.E.guide.3.title': { en: 'A Productivity Score for Founders', zh: '创业者的效率评分' },
  'category.E.guide.3.desc': { en: 'How to use the score to decide what to drop from your week.', zh: '如何使用评分决定本周要放弃什么。' },

  // Category F — Investment & ROI
  'category.F.intro.h2': { en: 'About Investment & ROI Calculators', zh: '关于投资与回报计算器' },
  'category.F.intro.1': { en: 'Investment decisions are mostly about time and taxes. Whether you are evaluating a sponsorship deal, calculating freelance tax, or modeling equity dilution, the right formula turns gut feelings into defendable numbers.', zh: '投资决策主要是关于时间和税收。无论你是在评估赞助协议、计算自由职业税务，还是建模股权稀释，正确的公式将直觉转化为可辩护的数字。' },
  'category.F.intro.2': { en: 'Our 4 investment & ROI calculators cover creator monetization, freelance taxes across 5 countries, equity dilution, and time value. All rates and brackets reflect 2026 IRS, Klear, and Indeed benchmarks.', zh: '我们的 4 个投资与回报计算器覆盖创作者货币化、5 个国家的自由职业税务、股权稀释和时间价值。所有税率和级别反映 2026 年 IRS、Klear 和 Indeed 基准。' },
  'category.F.intro.3': { en: 'Use these tools before signing a contract, before taking an investment offer, and before a major time commitment.', zh: '在签署合同之前、在接受投资要约之前、在重大时间承诺之前使用这些工具。' },
  'category.F.faq.q1.q': { en: 'What should I charge for a sponsored post?', zh: '一个赞助帖文我应该收多少？' },
  'category.F.faq.q1.a': { en: 'CPM-based: $25-50 per 1,000 true audience for podcasts, $15-30 for newsletters, $10-25 for YouTube. Sponsorship rate calculator gives the full formula.', zh: '基于 CPM：播客每 1,000 真实受众 $25-50，新闻通讯 $15-30，YouTube $10-25。赞助费率计算器给出完整公式。' },
  'category.F.faq.q2.q': { en: 'How do I calculate US freelance tax?', zh: '如何计算美国自由职业税务？' },
  'category.F.faq.q2.a': { en: 'Self-employment tax is 15.3% (Social Security + Medicare) on top of income tax. The freelance tax calculator handles federal + state + SE tax + quarterly payments.', zh: '自雇税为 15.3%（社会保障 +  Medicare），加上所得税。自由职业税务计算器处理联邦 + 州 + SE 税 + 季度付款。' },
  'category.F.faq.q3.q': { en: 'What is my time really worth?', zh: '我的时间到底值多少？' },
  'category.F.faq.q3.a': { en: 'Time value = (Annual income) / (Working hours per year). A $100K salary with 2,000 working hours = $50/hour. Use the time value calculator to see your meeting costs.', zh: '时间价值 =（年收入）/（每年工作小时数）。$10 万年薪、2,000 工作小时 = $50/小时。使用时间价值计算器查看会议成本。' },
  'category.F.faq.q4.q': { en: 'How much dilution is normal in a priced round?', zh: '定价轮中多少稀释是正常的？' },
  'category.F.faq.q4.a': { en: 'Seed: 15-25%. Series A: 15-20%. Series B: 10-15%. The equity dilution calculator models pre/post-money and option pool effects.', zh: '种子轮：15-25%。A 轮：15-20%。B 轮：10-15%。股权稀释计算器建模投前/投后和期权池效应。' },
  'category.F.faq.q5.q': { en: 'Should I take a lower salary for equity?', zh: '我应该为了股权接受较低的工资吗？' },
  'category.F.faq.q5.a': { en: 'At a 100x exit, a 1% stake is worth 1 year of your below-market salary. At a 10x exit, it is worth 1 month. Run the math before signing.', zh: '在 100 倍退出时，1% 股份价值相当于你低于市场 1 年的工资。在 10 倍退出时，价值相当于 1 个月。签字前先算清。' },
  'category.F.guide.1.title': { en: 'How Creator Sponsorship Rates Are Set', zh: '创作者赞助费率如何确定' },
  'category.F.guide.1.desc': { en: 'CPM, audience quality, niche, and exclusivity premiums explained.', zh: 'CPM、受众质量、细分领域和独家性溢价解析。' },
  'category.F.guide.2.title': { en: 'Quarterly Tax for Freelancers', zh: '自由职业者季度税务' },
  'category.F.guide.2.desc': { en: 'When to pay, how to estimate, and what happens if you underpay.', zh: '何时付款、如何估算以及少付时会发生什么。' },
  'category.F.guide.3.title': { en: 'Reading an Equity Grant', zh: '如何阅读股权授予' },
  'category.F.guide.3.desc': { en: 'Vesting cliffs, acceleration, and what to negotiate beyond the headline number.', zh: '归属悬崖、加速条款以及在头条数字之外要谈判什么。' },

  // Header
  'header.categories': { en: 'Categories', zh: '分类' },
```

- [ ] **Step 1.3: Verify insertion count**

Run: `grep -cE "^  'category\.[A-F]\.intro\." src/i18n/translations.ts`
Expected: `18` (3 intros × 6 categories = 18 — note `intro.h2` is 6 of the 18).

Run: `grep -cE "^  'category\.[A-F]\.faq\.q[1-5]\." src/i18n/translations.ts`
Expected: `60` (5 Q + 5 A = 10 entries × 6 categories = 60).

Run: `grep -cE "^  'category\.[A-F]\.guide\.[1-3]\." src/i18n/translations.ts`
Expected: `36` (3 guides × 2 entries (title+desc) × 6 categories = 36).

Run: `grep -cE "^  'header\.categories':" src/i18n/translations.ts`
Expected: `1`.

- [ ] **Step 1.4: tsc sanity check**

Run: `pnpm exec tsc --noEmit 2>&1 | head -5`
Expected: `0 errors`.

- [ ] **Step 1.5: Extend check-i18n-completeness.mjs**

Open `scripts/check-i18n-completeness.mjs`. **Replace** the entire `REQUIRED_KEYS` const with:

```js
const REQUIRED_KEYS = {
  eeat: [
    'eeat.title',
    'eeat.reviewed_by',
    'eeat.last_reviewed',
    'eeat.sources',
    'eeat.suggest_improvement',
    'eeat.suggest_body',
    'eeat.team',
    'eeat.author_label',
    'eeat.publisher_label',
    'eeat.contact_email',
  ],
  about: [
    'about.mission.h1',
    'about.mission.body',
    'about.data_sources.h1',
    'about.data_sources.body',
    'about.update_policy.h1',
    'about.update_policy.body',
    'about.editorial_policy.h1',
    'about.editorial_policy.body',
    'about.contact.h1',
    'about.contact.body',
    'about.roadmap.h1',
    'about.roadmap.body',
  ],
  category: (() => {
    const keys = [];
    for (const id of ['A','B','C','D','E','F']) {
      keys.push(`category.${id}.intro.h2`);
      keys.push(`category.${id}.intro.1`, `category.${id}.intro.2`, `category.${id}.intro.3`);
      for (let n = 1; n <= 5; n++) {
        keys.push(`category.${id}.faq.q${n}.q`, `category.${id}.faq.q${n}.a`);
      }
      for (let n = 1; n <= 3; n++) {
        keys.push(`category.${id}.guide.${n}.title`, `category.${id}.guide.${n}.desc`);
      }
    }
    return keys;
  })(),
  header: [
    'header.categories',
  ],
};
```

- [ ] **Step 1.6: Run check-i18n**

Run: `node scripts/check-i18n-completeness.mjs`
Expected: `✅ i18n completeness check passed (179 required keys present).` (10 eeat + 12 about + 156 category + 1 header = 179)

- [ ] **Step 1.7: Mutation test (catches missing key)**

Run:
```bash
node -e "const fs = require('fs'); const p = 'src/i18n/translations.ts'; const s = fs.readFileSync(p, 'utf-8'); fs.writeFileSync(p, s.replace(\"'category.A.intro.1':\", \"'category.A._temp_disabled':\"));"
node scripts/check-i18n-completeness.mjs
```
Expected: exit 1, output includes `category.A.intro.1`.

Restore: `git checkout src/i18n/translations.ts`
Re-verify: `node scripts/check-i18n-completeness.mjs` → exit 0.

- [ ] **Step 1.8: Commit**

```bash
git add src/i18n/translations.ts scripts/check-i18n-completeness.mjs
git commit -m "feat(i18n): 156 category.* keys + 1 header.categories + check-i18n extension"
```

---

## Task 2: src/lib/seo-factory.ts — 3 schema helpers

**Files:**
- Create: `src/lib/seo-factory.ts`

- [ ] **Step 2.1: Create lib directory and file**

Create `src/lib/seo-factory.ts`:

```ts
/**
 * Schema.org JSON-LD factory helpers for SEO-critical pages.
 * Centralizes CollectionPage / ItemList / BreadcrumbList construction
 * so 6 category pages don't reinvent the same JSON.stringify block.
 *
 * See spec: docs/superpowers/specs/2026-06-27-content-depth-pages-design.md §6.3
 */

const SITE_URL = 'https://forgeflowkit.com';

export interface CollectionPageInput {
  lang: 'en' | 'zh';
  categorySlug: string;        // 'saas-metrics'
  categoryId: string;          // 'A'
  categoryName: string;        // 'SaaS Metrics'
  categoryDescription: string; // i18n category.{id}.desc
  tools: { slug: string; title: string }[];  // all tools in this category
}

export function createCollectionPage(input: CollectionPageInput) {
  const { lang, categorySlug, categoryName, categoryDescription, tools } = input;
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE_URL}/${lang}/${categorySlug}/#collection`,
    name: categoryName,
    description: categoryDescription,
    inLanguage: lang,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    hasPart: createCategoryItemList({ lang, categorySlug, tools }),
  };
}

export interface ItemListInput {
  lang: 'en' | 'zh';
  categorySlug: string;
  tools: { slug: string; title: string }[];
}

export function createCategoryItemList(input: ItemListInput) {
  const { lang, categorySlug, tools } = input;
  return {
    '@type': 'ItemList',
    name: `${input.tools.length} ${tools[0]?.title ? 'Calculators' : 'Tools'}`,
    itemListElement: tools.map((tool, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: tool.title,
      url: `${SITE_URL}/${lang}/${tool.slug}/`,
    })),
  };
}

export interface Breadcrumb3Input {
  lang: 'en' | 'zh';
  homeLabel: string;
  categoryName: string;
  categorySlug: string;
  currentPageName: string;
  currentPageSlug: string;
}

export function createBreadcrumb3(input: Breadcrumb3Input) {
  const { lang, homeLabel, categoryName, categorySlug, currentPageName, currentPageSlug } = input;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: homeLabel,
        item: `${SITE_URL}/${lang}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: categoryName,
        item: `${SITE_URL}/${lang}/${categorySlug}/`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: currentPageName,
        item: `${SITE_URL}/${lang}/${currentPageSlug}/`,
      },
    ],
  };
}
```

- [ ] **Step 2.2: tsc verify**

Run: `pnpm exec tsc --noEmit 2>&1 | head -10`
Expected: `0 errors`.

- [ ] **Step 2.3: Commit**

```bash
git add src/lib/seo-factory.ts
git commit -m "feat(lib): seo-factory with createCollectionPage/createCategoryItemList/createBreadcrumb3"
```

---

## Task 3: 4 new category components

**Files:**
- Create: `src/components/CategoryHero.astro`
- Create: `src/components/CategoryFaq.astro`
- Create: `src/components/CategoryGuides.astro`
- Create: `src/components/CategoryOtherNav.astro`

- [ ] **Step 3.1: CategoryHero.astro**

```astro
---
import { t, getLang } from '../i18n';

export interface Props {
  categoryId: string;       // 'A'
  categoryName: string;     // 'SaaS Metrics' (translated)
  categoryDesc: string;     // translated
  toolCount: number;
}

const { categoryId, categoryName, categoryDesc, toolCount } = Astro.props;
const lang = getLang(Astro);
---

<section class="mb-10 p-8 bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-2xl">
  <div class="text-xs font-semibold text-[#7C3AED] mb-2">Category {categoryId}</div>
  <h1 class="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">{categoryName}</h1>
  <p class="text-sm text-gray-600 leading-relaxed max-w-2xl mb-4">{categoryDesc}</p>
  <div class="flex gap-4 text-xs text-gray-500">
    <span>🧮 {toolCount} {toolCount === 1 ? 'tool' : 'tools'}</span>
    <span>📅 {t('eeat.last_reviewed', lang)}: 2026-06-22</span>
  </div>
</section>
```

- [ ] **Step 3.2: CategoryFaq.astro**

```astro
---
import { t, getLang } from '../i18n';

export interface Props {
  categoryId: string;
  faqItems: { q: string; a: string }[];  // 5 items, pre-translated
}

const { categoryId, faqItems } = Astro.props;
const lang = getLang(Astro);
---

<section class="mb-10">
  <h2 class="text-2xl font-bold text-gray-900 mb-6">{t('faq.title', lang) || 'Frequently Asked Questions'}</h2>
  <div class="space-y-4">
    {faqItems.map((item) => (
      <details class="group p-5 bg-white border border-gray-200 rounded-xl">
        <summary class="cursor-pointer font-semibold text-gray-900 flex items-center justify-between">
          <span>{item.q}</span>
          <span class="text-[#7C3AED] group-open:rotate-45 transition-transform text-xl">+</span>
        </summary>
        <p class="mt-3 text-sm text-gray-700 leading-relaxed">{item.a}</p>
      </details>
    ))}
  </div>
</section>
```

- [ ] **Step 3.3: CategoryGuides.astro**

```astro
---
import { t, getLang } from '../i18n';
import type { BlogPost } from '../data/blog-posts';

export interface Props {
  categoryId: string;
  manualGuides: { title: string; desc: string }[];  // 3, from i18n
  blogPosts: BlogPost[];                            // auto-filtered from blogPosts by toolSlug in category
}

const { manualGuides, blogPosts } = Astro.props;
const lang = getLang(Astro);
---

<section class="mb-10">
  <h2 class="text-2xl font-bold text-gray-900 mb-6">Guides & Articles</h2>

  {manualGuides.length > 0 && (
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {manualGuides.map((g) => (
        <article class="p-5 bg-white border border-gray-200 rounded-xl">
          <h3 class="text-sm font-bold text-gray-900 mb-2">{g.title}</h3>
          <p class="text-xs text-gray-600">{g.desc}</p>
        </article>
      ))}
    </div>
  )}

  {blogPosts.length > 0 && (
    <>
      <h3 class="text-sm font-semibold text-gray-700 mb-3 mt-6">Related Articles</h3>
      <ul class="space-y-2">
        {blogPosts.map((post) => (
          <li>
            <a href={`/${lang}/blog/${post.slug}/`} class="text-sm text-[#7C3AED] hover:underline">
              {post.title}
            </a>
          </li>
        ))}
      </ul>
    </>
  )}
</section>
```

- [ ] **Step 3.4: CategoryOtherNav.astro**

```astro
---
import { t, getLang } from '../i18n';
import type { Category } from '../data/categories';

export interface Props {
  currentCategoryId: string;
  categories: Category[];  // all 6; will filter out current
}

const { currentCategoryId, categories } = Astro.props;
const lang = getLang(Astro);
const others = categories.filter(c => c.id !== currentCategoryId);
---

<section class="mt-12 pt-10 border-t border-gray-200">
  <h2 class="text-xl font-bold text-gray-900 mb-5">Explore Other Categories</h2>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
    {others.map((c) => (
      <a href={`/${lang}/${c.slug}/`} class="p-4 bg-white border border-gray-200 rounded-xl hover:border-[#7C3AED] hover:shadow-md transition-all">
        <div class="text-xs font-semibold text-[#7C3AED] mb-1">Category {c.id}</div>
        <div class="text-sm font-bold text-gray-900">{t(`category.${c.id}.name`, lang)}</div>
      </a>
    ))}
  </div>
</section>
```

- [ ] **Step 3.5: tsc verify**

Run: `pnpm exec tsc --noEmit 2>&1 | head -5`
Expected: `0 errors`.

- [ ] **Step 3.6: Commit**

```bash
git add src/components/CategoryHero.astro src/components/CategoryFaq.astro src/components/CategoryGuides.astro src/components/CategoryOtherNav.astro
git commit -m "feat(components): 4 category page components (Hero/Faq/Guides/OtherNav)"
```

---

## Task 4: 6 category page files

**Files:**
- Create: `src/pages/[lang]/saas-metrics.astro`
- Create: `src/pages/[lang]/ai-cost-tools.astro`
- Create: `src/pages/[lang]/valuation-exit.astro`
- Create: `src/pages/[lang]/freelance-pricing.astro`
- Create: `src/pages/[lang]/cost-efficiency.astro`
- Create: `src/pages/[lang]/investment-roi.astro`

Each file follows the same pattern. The 6 files differ only in:
- File name
- `categorySlug` (1st arg)
- `categoryId` (e.g. 'A' / 'B' / ...)

- [ ] **Step 4.1: Create saas-metrics.astro**

Create `src/pages/[lang]/saas-metrics.astro`:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Header from '../../components/Header.astro';
import Footer from '../../components/Footer.astro';
import ToolCard from '../../components/ToolCard.astro';
import CategoryHero from '../../components/CategoryHero.astro';
import CategoryFaq from '../../components/CategoryFaq.astro';
import CategoryGuides from '../../components/CategoryGuides.astro';
import CategoryOtherNav from '../../components/CategoryOtherNav.astro';
import { categories } from '../../data/categories';
import { tools } from '../../data/tools';
import { blogPosts } from '../../data/blog-posts';
import { t, getLang } from '../../i18n';
import { createCollectionPage, createBreadcrumb3 } from '../../lib/seo-factory';

export function getStaticPaths() {
  return [
    { params: { lang: 'en' } },
    { params: { lang: 'zh' } },
  ];
}

const lang = getLang(Astro);
const CATEGORY_ID = 'A';
const CATEGORY_SLUG = 'saas-metrics';
const category = categories.find(c => c.id === CATEGORY_ID)!;
const translatedName = t(`category.${CATEGORY_ID}.name`, lang);
const translatedDesc = t(`category.${CATEGORY_ID}.desc`, lang);

const translatedTools = tools
  .filter(t => t.categoryId === CATEGORY_ID)
  .map(t => ({
    ...t,
    title: t.title,           // ToolMeta.title is English; translation lives in i18n
    translatedTitle: t(`tools.${t.slug}.title`, lang),
  }));

// Override with translated titles for display
const displayTools = translatedTools.map(t => ({
  slug: t.slug,
  title: t.translatedTitle,
  description: t.description,  // English fallback
}));

const faqItems = [1,2,3,4,5].map(n => ({
  q: t(`category.${CATEGORY_ID}.faq.q${n}.q`, lang),
  a: t(`category.${CATEGORY_ID}.faq.q${n}.a`, lang),
}));

const manualGuides = [1,2,3].map(n => ({
  title: t(`category.${CATEGORY_ID}.guide.${n}.title`, lang),
  desc: t(`category.${CATEGORY_ID}.guide.${n}.desc`, lang),
}));

const toolSlugsInCategory = new Set(translatedTools.map(t => t.slug));
const relatedBlogPosts = blogPosts.filter(p => toolSlugsInCategory.has(p.toolSlug));

const schema = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    createCollectionPage({
      lang,
      categorySlug: CATEGORY_SLUG,
      categoryId: CATEGORY_ID,
      categoryName: translatedName,
      categoryDescription: translatedDesc,
      tools: displayTools.map(t => ({ slug: t.slug, title: t.title })),
    }),
    createBreadcrumb3({
      lang,
      homeLabel: t('breadcrumb.home', lang),
      categoryName: translatedName,
      categorySlug: CATEGORY_SLUG,
      currentPageName: translatedName,
      currentPageSlug: CATEGORY_SLUG,
    }),
  ],
});
---

<BaseLayout
  title={`${translatedName} — ForgeFlowKit`}
  description={translatedDesc}
  schema={schema}
  pageType="static"
>
  <Header />
  <main class="max-w-6xl mx-auto px-4 py-8 flex-1">
    <CategoryHero
      categoryId={CATEGORY_ID}
      categoryName={translatedName}
      categoryDesc={translatedDesc}
      toolCount={displayTools.length}
    />

    <section class="mb-10">
      <h2 class="text-2xl font-bold text-gray-900 mb-3">{t(`category.${CATEGORY_ID}.intro.h2`, lang)}</h2>
      <p class="text-sm text-gray-700 leading-relaxed mb-3">{t(`category.${CATEGORY_ID}.intro.1`, lang)}</p>
      <p class="text-sm text-gray-700 leading-relaxed mb-3">{t(`category.${CATEGORY_ID}.intro.2`, lang)}</p>
      <p class="text-sm text-gray-700 leading-relaxed">{t(`category.${CATEGORY_ID}.intro.3`, lang)}</p>
    </section>

    <section class="mb-10">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">All {displayTools.length} {translatedName} Tools</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {displayTools.map(t => <ToolCard slug={t.slug} title={t.title} description={t.description} />)}
      </div>
    </section>

    <CategoryFaq categoryId={CATEGORY_ID} faqItems={faqItems} />
    <CategoryGuides categoryId={CATEGORY_ID} manualGuides={manualGuides} blogPosts={relatedBlogPosts} />
    <CategoryOtherNav currentCategoryId={CATEGORY_ID} categories={categories} />
  </main>
  <Footer />
</BaseLayout>
```

- [ ] **Step 4.2: Create the other 5 category pages**

For each remaining category, **copy** saas-metrics.astro and change these 2 lines:

| File | CATEGORY_ID | CATEGORY_SLUG |
|---|---|---|
| `ai-cost-tools.astro` | `'B'` | `'ai-cost-tools'` |
| `valuation-exit.astro` | `'C'` | `'valuation-exit'` |
| `freelance-pricing.astro` | `'D'` | `'freelance-pricing'` |
| `cost-efficiency.astro` | `'E'` | `'cost-efficiency'` |
| `investment-roi.astro` | `'F'` | `'investment-roi'` |

The rest of the file is identical (use `cp` or duplicate via your editor).

- [ ] **Step 4.3: tsc verify**

Run: `pnpm exec tsc --noEmit 2>&1 | head -5`
Expected: `0 errors`.

- [ ] **Step 4.4: Build & verify**

Run: `pnpm build 2>&1 | tail -5`
Expected: `Complete! 153 pages generated.` (was 141; +6 cat × 2 lang = +12).

- [ ] **Step 4.5: Spot-check 3 things per category**

Run:
```bash
for slug in saas-metrics ai-cost-tools valuation-exit freelance-pricing cost-efficiency investment-roi; do
  echo "=== $slug ==="
  ls dist/en/$slug/index.html && \
  grep -c "CollectionPage" dist/en/$slug/index.html && \
  grep -c "ItemList" dist/en/$slug/index.html
done
```
Expected: each line shows the file exists, `CollectionPage` count = 1+, `ItemList` count = 1+.

- [ ] **Step 4.6: Commit**

```bash
git add src/pages/\[lang\]/saas-metrics.astro src/pages/\[lang\]/ai-cost-tools.astro src/pages/\[lang\]/valuation-exit.astro src/pages/\[lang\]/freelance-pricing.astro src/pages/\[lang\]/cost-efficiency.astro src/pages/\[lang\]/investment-roi.astro
git commit -m "feat(pages): 6 category landing pages (top-level paths, CollectionPage + ItemList schema)"
```

---

## Task 5: Header dropdown + breadcrumb 3-layer + sitemap + test extension

**Files:**
- Modify: `src/components/Header.astro`
- Modify: `src/pages/[lang]/[slug].astro`
- Modify: `astro.config.mjs`
- Modify: `tests/seo-schemas.test.ts`

- [ ] **Step 5.1: Read current Header.astro to find the right insertion point**

Run: `cat src/components/Header.astro`
Expected: 44-line file with `navItems` array, `<header>`, `<nav>`, `<script>` at end.

- [ ] **Step 5.2: Add categories import + navItems entry**

In `src/components/Header.astro`, **add import** at the top (after existing imports):

```ts
import { categories } from '../data/categories';
```

**Modify** the `navItems` array to include categories (a special dropdown item):

Replace the existing `const navItems = [...]` block with:

```ts
const categoriesWithTranslated = categories.map(c => ({
  href: `/${lang}/${c.slug}/`,
  name: t(`category.${c.id}.name`, lang),
  desc: t(`category.${c.id}.desc`, lang),
  id: c.id,
  slug: c.slug,
}));
```

- [ ] **Step 5.3: Add Categories dropdown to the nav**

Find the `<div class="flex items-center gap-6 text-sm">` block (line ~25). It currently maps `navItems`. **Add** the categories dropdown **before** the `navItems.map`:

```astro
    <details class="relative group">
      <summary class="cursor-pointer text-gray-600 hover:text-[#7C3AED] transition-colors duration-200 list-none flex items-center gap-1">
        {t('header.categories', lang)}
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
      </summary>
      <ul class="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-96 overflow-auto">
        {categoriesWithTranslated.map(c => (
          <li>
            <a href={c.href} class="block px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0">
              <div class="text-xs font-semibold text-[#7C3AED]">Category {c.id}</div>
              <div class="text-sm font-bold text-gray-900">{c.name}</div>
              <div class="text-xs text-gray-500 mt-1 line-clamp-1">{c.desc}</div>
            </a>
          </li>
        ))}
      </ul>
    </details>
```

- [ ] **Step 5.4: Build & verify Header**

Run: `pnpm build 2>&1 | tail -3`
Expected: `Complete! 153 pages generated.`

Run: `grep -c "header.categories\|Categories" dist/en/solopreneur-mrr-calculator/index.html`
Expected: `>= 1` (the dropdown label "Categories" appears in the header on every page).

- [ ] **Step 5.5: Read current [slug].astro to find the breadcrumb JSON-LD block**

Run: `sed -n '100,115p' src/pages/\[lang\]/\[slug\].astro`
Expected: the BreadcrumbList block, currently 2 items (Home, Tool).

- [ ] **Step 5.6: Extend breadcrumb to 3 items**

In the existing BreadcrumbList `itemListElement` array, **insert** a 2nd item between Home and Tool:

Current:
```ts
itemListElement: [
  { '@type': 'ListItem', position: 1, name: t('breadcrumb.home', lang), item: Astro.site?.toString() || '/' },
  { '@type': 'ListItem', position: 2, name: toolTitle, item: url },
],
```

Replace with:
```ts
itemListElement: [
  { '@type': 'ListItem', position: 1, name: t('breadcrumb.home', lang), item: Astro.site?.toString() || '/' },
  {
    '@type': 'ListItem',
    position: 2,
    name: t(`category.${toolMeta.categoryId}.name`, lang),
    item: `https://forgeflowkit.com/${lang}/${categories.find(c => c.id === toolMeta.categoryId)?.slug}/`,
  },
  { '@type': 'ListItem', position: 3, name: toolTitle, item: url },
],
```

**Add the import** at the top of the file (near other data imports):

```ts
import { categories } from '../../data/categories';
```

- [ ] **Step 5.7: Build & verify breadcrumb 3 items**

Run: `pnpm build 2>&1 | tail -3`
Expected: `Complete! 153 pages generated.`

Run: `grep -c "position.*2" dist/en/solopreneur-mrr-calculator/index.html`
Expected: `>= 2` (2 occurrences: one for the new category position 2 in breadcrumb; one for ItemList position 2 if mrr is the 2nd tool — but typically the breadcrumb adds 1).

A cleaner check:
```bash
node -e "
const html = require('fs').readFileSync('dist/en/solopreneur-mrr-calculator/index.html', 'utf-8');
const m = html.match(/<script type=\"application\/ld\+json\">([\s\S]*?)<\/script>/g);
for (const b of m) {
  const j = JSON.parse(b.replace(/<script[^>]*>|<\/script>/g, ''));
  const graph = j['@graph'] || [j];
  const bc = graph.find(x => x['@type'] === 'BreadcrumbList');
  if (bc) console.log('BreadcrumbList items:', bc.itemListElement.length);
}
"
```
Expected: `BreadcrumbList items: 3`.

- [ ] **Step 5.8: Read current astro.config.mjs**

Run: `cat astro.config.mjs`
Expected: contains a `sitemap({...})` call with `serialize(item) {...}`.

- [ ] **Step 5.9: Extend sitemap serialize to detect category URLs**

Find the `serialize(item)` function. **Add** an `isCategory` check **before** the `isTool` check:

```js
const categorySlugs = ['saas-metrics','ai-cost-tools','valuation-exit','freelance-pricing','cost-efficiency','investment-roi'];
const isCategory = categorySlugs.some(s => item.url.endsWith('/' + s + '/'));
```

Then in the priority branches, add (between `isHome` and `isTool`):

```js
if (isCategory) return { ...item, changefreq: 'weekly', priority: 0.8 };
```

Also extend the `isTool` exclusion list to include category slugs (otherwise category pages get classified as tools):

```js
const excludeSlugs = ['about','contact','privacy-policy','terms','blog', ...categorySlugs];
const isTool = /^\/(en|zh)\/[^/]+\/?$/.test(item.url)
               && !excludeSlugs.some(s => item.url.endsWith(s + '/'));
```

- [ ] **Step 5.10: Build & verify sitemap**

Run: `pnpm build 2>&1 | tail -3`
Expected: `Complete! 153 pages generated.`

Run: `grep -A 3 "saas-metrics" dist/sitemap-0.xml | head -10`
Expected: shows `<loc>https://forgeflowkit.com/en/saas-metrics/</loc>` followed by `<priority>0.8</priority>`.

- [ ] **Step 5.11: Extend seo-schemas.test.ts**

Open `tests/seo-schemas.test.ts`. **Append** these 2 tests to the end of the file:

```ts
test('CATEGORY — all 6 category pages emit CollectionPage with ItemList', { skip: !existsSync(distDir) }, () => {
  const categorySlugs = ['saas-metrics','ai-cost-tools','valuation-exit','freelance-pricing','cost-efficiency','investment-roi'];
  for (const slug of categorySlugs) {
    const path = resolve(distDir, 'en', slug, 'index.html');
    assert.ok(existsSync(path), `dist missing: ${path}`);
    const html = readFileSync(path, 'utf-8');
    const blocks = extractJsonLd(html);
    const graph = blocks.flatMap(b => b['@graph'] ?? [b]);
    const cp = graph.find(b => b['@type'] === 'CollectionPage');
    assert.ok(cp, `${slug}: no CollectionPage schema`);
    assert.ok(cp.hasPart, `${slug}: CollectionPage missing hasPart`);
    assert.equal(cp.hasPart['@type'], 'ItemList', `${slug}: hasPart should be ItemList`);
    assert.ok(Array.isArray(cp.hasPart.itemListElement) && cp.hasPart.itemListElement.length > 0, `${slug}: ItemList should have 1+ items`);
  }
});

test('BREADCRUMB — every tool page breadcrumb has 3 items (Home > Category > Tool)', { skip: !existsSync(distDir) }, () => {
  for (const tool of tools) {
    const path = resolve(distDir, 'en', tool.slug, 'index.html');
    assert.ok(existsSync(path), `dist missing: ${path}`);
    const html = readFileSync(path, 'utf-8');
    const blocks = extractJsonLd(html);
    const graph = blocks.flatMap(b => b['@graph'] ?? [b]);
    const bc = graph.find(b => b['@type'] === 'BreadcrumbList');
    assert.ok(bc, `${tool.slug}: no BreadcrumbList schema`);
    assert.equal(bc.itemListElement.length, 3, `${tool.slug}: breadcrumb should have 3 items, has ${bc.itemListElement.length}`);
    assert.equal(bc.itemListElement[0].position, 1, `${tool.slug}: position 1 should be Home`);
    assert.equal(bc.itemListElement[2].position, 3, `${tool.slug}: position 3 should be Tool`);
  }
});
```

- [ ] **Step 5.12: Run schema tests**

Run: `node --import tsx tests/seo-schemas.test.ts 2>&1 | tail -20`
Expected: `# tests 4 / pass 4 / fail 0` (2 Plan 1 tests + 2 Plan 3 tests).

- [ ] **Step 5.13: Run pnpm check end-to-end**

Run: `pnpm check 2>&1 | tail -5`
Expected: exit 0. Output includes `i18n completeness check passed (179 required keys present)`.

- [ ] **Step 5.14: Commit**

```bash
git add src/components/Header.astro src/pages/\[lang\]/\[slug\].astro astro.config.mjs tests/seo-schemas.test.ts
git commit -m "feat(integration): Header Categories dropdown + breadcrumb 3-layer + sitemap category + 2 schema tests"
```

---

## Final Acceptance Checklist

- [ ] `pnpm check` exit 0
- [ ] `pnpm test:unit` exit 0 (36 existing + 2 Plan 1 + 2 Plan 3 = 40 tests pass)
- [ ] `pnpm build` succeeds, 153 pages
- [ ] `node scripts/check-i18n-completeness.mjs` exit 0
- [ ] 6 category URLs return 200: `/en/saas-metrics/`, `/en/ai-cost-tools/`, `/en/valuation-exit/`, `/en/freelance-pricing/`, `/en/cost-efficiency/`, `/en/investment-roi/` (and zh variants)
- [ ] Header dropdown shows 6 categories on every page
- [ ] 32 tool pages breadcrumb has 3 items
- [ ] sitemap-0.xml includes 12 category URLs with priority 0.8
- [ ] Schema Markup Validator抽 2 category pages: CollectionPage + ItemList + BreadcrumbList 全绿
- [ ] Schema Markup Validator抽 2 tool pages: BreadcrumbList now has 3 items (Home, Category, Tool)
- [ ] No diff in engines/, blog-posts.ts, og-samples.json
- [ ] `git status` clean (no untracked except historical)

## Rollback

```bash
git revert <plan3-first-sha>..<plan3-last-sha>  # 5 commits
```

This restores:
- 6 category page files deleted
- 4 new category components deleted
- seo-factory.ts deleted
- Header.astro back to 2 nav items
- [slug].astro breadcrumb back to 2 items
- astro.config.mjs sitemap back to no isCategory
- seo-schemas.test.ts back to 2 tests
- i18n back to no category.* intro/faq/guide, no header.categories
- check-i18n back to eeat + about only

## Notes for Implementer

- **Six static page files = intentional duplication**. Don't try to extract a shared template via dynamic route — Astro disallows it at the same level as `[slug].astro`. 6 files = acceptable copy-paste, each ~110 lines.
- **The 6 pages differ only in 2 string literals** (CATEGORY_ID, CATEGORY_SLUG). When copying, **double-check both are correct** for the destination file.
- **The Header dropdown uses `<details>` (zero JS)**. Click toggles open; click outside does NOT auto-close (browser default). For better UX, an Alpine/Tailwind click-outside could be added, but that's out of scope.
- **Breadcrumb middle layer depends on category slug existing** — Task 5.6 will fail build if a tool's categoryId doesn't have a matching `categories.find()`. Verify all 32 tools have a valid A-F categoryId (already verified at A+B spec time).
- **The `t('faq.title', lang)` fallback in CategoryFaq.astro** — if `faq.title` doesn't exist in translations, the empty string is shown. Plan 1/2 don't add it; spec uses 'Frequently Asked Questions' as a literal. Acceptable.
- **i18n key count** = 156 (category) + 1 (header) = 157 new keys × 2 lang = 314 entries. Total check-i18n keys: 10 eeat + 12 about + 156 category + 1 header = 179 unique.
- **Engine layer untouched** — this plan only touches pages, components, lib, i18n, config, and tests.
- **blog-posts.ts unchanged** — `CategoryGuides.astro` reads from existing `blogPosts` array; no new blog content needed.
