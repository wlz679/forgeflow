# P0 Content Pages Overhaul — EEAT + About + Category 落地页

**Date:** 2026-06-27
**Status:** Draft (awaiting user review)
**Author:** Brainstorming session
**Predecessor:** D spec (SEO schema + og:image) — shipped 2026-06-25

## Goal

在 D spec 已建立的 schema 全套基础上，把**内容深度**补齐为搜索引擎 Helpful Content 标准：

1. **EEAT 全站**（32 工具页）—— Reviewed By / Author / Last Updated / Sources 注入 JSON-LD + UI 信任块
2. **About 页面深度**——从 4 段扩到 6 section：Mission / Data Sources / Update Policy / Editorial Policy / Contact / Roadmap
3. **Category 落地页**——6 个顶级路径 `/[lang]/[category-slug]/`，每页含 Introduction / All Tools / FAQ / Guides / Cross-link

每个 plan 独立 ship、独立 review、独立回滚。零引擎业务逻辑改动。

## Background

### ChatGPT 反馈（2026-06-25 / 2026-06-27 两轮）

ChatGPT 给出 12 项未实现建议，本 spec 覆盖其中 P0 全部 3 项 + 触及 P1 中 1 项（JSON-LD factory 为新增 category 页用）。其余 9 项（Blog Markdown / Engine 抽象 / LocalStorage / PDF / AI Explain / SearchBar 多字段 / data 分层 / components 子目录 / RelatedTools 分组）列入 Out of Scope。

### 当前状态

| 项 | 现状 |
|---|---|
| ToolMeta 字段 | slug / title / description / categoryId / applicationCategory / inputs / keywords (C) / tags (C) — 缺 EEAT |
| About 页 | 4 段 (about.p1-p4) — 无 Mission/Data Sources/Update Policy/Editorial Policy/Contact/Roadmap |
| Category 落地页 | **不存在**；首页用 CategorySection 组件渲染 6 段 |
| Header | 无 Category 入口 |
| 工具页 breadcrumb | Home > Tool（2 层） |
| i18n key 总数 | ~1386 行 |
| JSON-LD | D spec 已注入 FAQPage + SoftwareApplication + BreadcrumbList + WebSite + SearchAction + Organization + Article + Blog |

### 约束

- 纯静态 SSG（不能引入 DB / API / SSR）
- 零 engines 业务逻辑改动（`calculate()` / `customFn` / `staticExamples` 冻结）
- 32 工具数量冻结（不扩量）
- 2 语言（en/zh）
- 零新 npm 依赖

## Design

### 1. 整体架构

```
ForgeFlowKit 当前结构                          P0 改造后
─────────────────                          ──────────────────
src/                                        src/
├── data/                                   ├── data/
│   ├── categories.ts (6 分类元数据)         │   ├── categories.ts (不动)
│   ├── tools/types.ts (ToolMeta 8 字段)     │   ├── tools/types.ts (+ reviewedBy/author/dataReviewedAt/sources)
│   └── tools/{6 个 category 文件}           │   └── tools/{6 个 category 文件} (扩 EEAT 字段)
│                                            │
├── i18n/translations.ts (1386 行)          ├── i18n/translations.ts (+ ~196 key × 2 lang = 392 条)
│                                            │
├── pages/[lang]/                            ├── pages/[lang]/
│   ├── [slug].astro (32 工具)              │   ├── [slug].astro (32 工具 + EeatTrustBlock + breadcrumb 3 层)
│   ├── about.astro (4 段)                  │   ├── about.astro (6 section 重写)
│   ├── index.astro                          │   ├── index.astro (Header dropdown 触发)
│   ├── contact/privacy/terms/...            │   ├── contact/privacy/terms/... (不动)
│   └── blog/[slug].astro (不动)            │   ├── blog/[slug].astro (不动)
│                                            │   ├── saas-metrics.astro      ┐
│                                            │   ├── ai-cost-tools.astro    │
│                                            │   ├── valuation-exit.astro    │ 6 个新 category 落地页
│                                            │   ├── freelance-pricing.astro │ (顶级路径，无 [slug] 冲突)
│                                            │   ├── cost-efficiency.astro  │
│                                            │   └── investment-roi.astro   ┘
│                                            │
├── components/                              ├── components/
│   ├── Header.astro (无 Category)          │   ├── Header.astro (+ Categories dropdown)
│   ├── (其余 10 个不动)                     │   ├── EeatTrustBlock.astro (新)
│                                            │   ├── CategoryHero.astro (新)
│                                            │   ├── CategoryFaq.astro (新)
│                                            │   ├── CategoryGuides.astro (新)
│                                            │   ├── CategoryOtherNav.astro (新)
│                                            │   └── (其余 9 个不动)
│                                            │
├── layouts/BaseLayout.astro (不动)         ├── layouts/BaseLayout.astro (不动)
└── astro.config.mjs (sitemap 扩展)         └── astro.config.mjs (sitemap 加 category URL 规则)

scripts/check-i18n-completeness.mjs (新)   ← build-time key 完整性校验
tests/seo-schemas.test.ts (新)             ← 自动化 schema 结构验证
```

### 2. ToolMeta 扩展

```ts
// src/data/tools/types.ts
export interface ToolMeta {
  // ... 现有 8 字段不动
  reviewedBy: string;          // 'ForgeFlowKit Team'
  author: string;              // 'ForgeFlowKit'
  dataReviewedAt: string;      // 'YYYY-MM-DD'  上次审核日期
  sources: string[];           // ['LiteLLM Pricing', 'Stripe Docs', 'HubSpot Benchmarks']
}
```

**32 工具必填规则**：
- `author` 统一 `"ForgeFlowKit"`
- `reviewedBy` 统一 `"ForgeFlowKit Team"`
- `dataReviewedAt` 全 32 工具用 2026-06-22（ChatGPT 反馈日，统一审核批次）
- `sources` 按 category 归口（详见 5.1 来源映射表）

### 3. i18n 命名空间规划

| 命名空间 | 现有 | 新增 | 总计 | 用途 |
|---|---|---|---|---|
| `about.*` | 4 段 (p1-p4) | +25 key | 29 key | 6 section 重写（见 4.1） |
| `category.{A-F}.name/desc` | 12 | 0 | 12 | 不动 |
| `category.{A-F}.intro.{1-3}` | 0 | 18 | 18 | Category 页介绍 |
| `category.{A-F}.faq.q{1-5}` | 0 | 60 | 60 | 5 FAQ × 6 cat × 2 (q/a) |
| `category.{A-F}.guide.{1-3}` | 0 | 36 | 36 | 3 Guides × 6 cat × 2 (title/desc) |
| `eeat.*` | 0 | 10 | 10 | 信任块（见 4.2） |
| `header.categories` | 0 | 2 | 2 | Dropdown label（1+1 备） |
| **合计** | | | **167 key × 2 lang = 334 条** | |

### 4. About 页 6 Section 设计

```
[Hero]   About ForgeFlowKit
[Section 1] Mission
[Section 2] Data Sources
[Section 3] Update Policy
[Section 4] Editorial Policy
[Section 5] Contact
[Section 6] Roadmap
```

| Section | 内容 | 长度 |
|---|---|---|
| Mission | 为什么做 ForgeFlowKit；服务谁；和市面上计算器的差异 | ~150 字 |
| Data Sources | 8 个 AI 工具用 LiteLLM；其他工具用 Stripe / HubSpot / 公开行业 benchmark | ~150 字 |
| Update Policy | 32 工具每季度审一次；AI 工具跟随 PRICING.json 周更；last reviewed 标签 | ~120 字 |
| Editorial Policy | 计算方法透明；不收集数据；无 affiliate 倾向；用户反馈公开 | ~150 字 |
| Contact | mailto:hello@forgeflowkit.com + "Suggest an improvement" 提示 | ~80 字 |
| Roadmap | 短期（Q3）：更多工具 + 收藏/历史；中期（Q4）：AI 解释；长期：SaaS 工作台 | ~150 字 |

**AboutPage schema 扩展**：在现有 `@type: AboutPage` 块加 `dateModified`（用 build date 兜底）。

### 5. EEAT 信任块设计

```
┌──────────────────────────────────────────────────────┐
│ ✓  Editorial Standards                              │
│                                                      │
│ Reviewed by: ForgeFlowKit Team                      │
│ Last reviewed: 2026-06-22                           │
│ Data sources: LiteLLM Pricing, Stripe Docs,         │
│               HubSpot Marketing Benchmarks          │
│                                                      │
│ 📧 Suggest an improvement →                         │
└──────────────────────────────────────────────────────┘
```

**位置**：`[slug].astro` 底部，`<RelatedTools />` 之后、`<Footer />` 之前。

**样式**：浅灰背景、紧凑 padding、`<small>` 文本大小。

**数据来源**：`tool.reviewedBy` / `tool.dataReviewedAt` / `tool.sources` + i18n `eeat.*` key。

#### 5.1 sources 字段归口映射

| categoryId | 类别 | 推荐 sources | 工具数 |
|---|---|---|---|
| A | SaaS Metrics | Stripe Docs, HubSpot Marketing Benchmarks, OpenView SaaS Benchmarks | 5 |
| B | AI Cost Tools | LiteLLM Pricing, OpenAI Pricing, Anthropic Pricing | 8 |
| C | Valuation & Exit | SaaS Capital, Equidam, Visible.vc | 9 |
| D | Freelance Pricing | Glassdoor, Upwork, Contena | 3 |
| E | Cost & Efficiency | BLS Employer Costs, Harvard Business Review, ZipRecruiter | 3 |
| F | Investment & ROI | IRS Tax Data, Klear Sponsorship Rates, Indeed Salary | 4 |

**复用规则**：同 category 工具共享 sources 数组。

### 6. Category 落地页设计

#### 6.1 URL 设计

```
/[lang]/saas-metrics/         → 6 tools
/[lang]/ai-cost-tools/        → 7 tools
/[lang]/valuation-exit/       → 9 tools
/[lang]/freelance-pricing/    → 3 tools
/[lang]/cost-efficiency/      → 3 tools
/[lang]/investment-roi/       → 4 tools
```

**为什么不 dynamic route**：`[category].astro` 同级 `[slug].astro` 会冲突（Astro 限制）。6 静态 page 文件 + 6 个独立 page = 6 段重复结构，但可读性最高 + 不改 URL。

#### 6.2 页面结构

```
[CategoryHero]
  H1: {id}. {category.name}
  Description: {category.desc}
  Stats: {n} tools · Last updated 2026-06-22

[Introduction]
  H2: t('category.{id}.intro_h2')
  Body: t('category.{id}.intro.1') + intro.2 + intro.3

[All Tools]
  H2: All {N} {Category} Tools
  Grid: 3-4 cols
  - ToolCard for each tool in category

[FAQ]
  H2: Frequently Asked Questions
  5 条 category.{id}.faq.q{1-5}.{q,a}
  + FAQPage schema (独立 JSON-LD 块)

[Guides & Articles]
  H2: Guides & Articles
  3 条 guides (手动) + N 条 blog (自动 from blogPosts filtered by toolSlug in category)

[Cross-link]
  H2: Explore Other Categories
  5 cards (exclude current)
```

#### 6.3 JSON-LD：CollectionPage + ItemList

```json
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "SaaS Metrics Calculators",
  "description": "Calculate MRR, burn rate, churn...",
  "inLanguage": "en",
  "isPartOf": { "@id": "https://forgeflowkit.com/#website" },
  "hasPart": {
    "@type": "ItemList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "MRR Calculator", "url": "/en/solopreneur-mrr-calculator/" },
      ...
    ]
  }
}
```

#### 6.4 Header Dropdown 设计

**零 JS 实现**——纯 CSS `<details><summary>` 或 `:focus-within`：

```
[Categories ▾]  ←  hover/click 展开
├─ 📊 SaaS Metrics
│   Calculate MRR, burn rate, churn...
├─ 🤖 AI Cost Tools
│   Estimate OpenAI, Claude, GPU...
├─ 💎 Valuation & Exit
│   SaaS valuation, LTV, CAC...
├─ 💼 Freelance Pricing
│   Freelance rates, project profit...
├─ ⚡ Cost & Efficiency
│   Meeting cost, employee cost...
└─ 📈 Investment & ROI
    Sponsorship, time value...
```

**实施注意**：Plan 3 启动前**先读 Header.astro** 摸清现状（是否有 mobile menu 框架，是否已有 dropdown pattern）；如有复用，无则新建。

### 7. 工具页 Breadcrumb 3 层

```
旧:  Home › MRR Calculator
新:  Home › SaaS Metrics › MRR Calculator
```

**改动**：`[slug].astro` 现有 BreadcrumbList 块（line 101-107）从 2 items → 3 items。

**数据流**：
```ts
const tool = tools.find(t => t.slug === slug);
const category = categories.find(c => c.id === tool.categoryId);
const breadcrumb = [
  { name: t('home.title', lang), url: `/${lang}/` },
  { name: t(`category.${category.id}.name`, lang), url: `/${lang}/${category.slug}/` },
  { name: tool.title, url: `/${lang}/${tool.slug}/` },
];
```

### 8. Sitemap 升级（astro.config.mjs）

复用 D spec 的 serialize 函数，加 `isCategory` 分支：

```js
serialize(item) {
  const isHome = /\/(en|zh)\/?$/.test(item.url);
  const isTool = /^\/(en|zh)\/[^/]+\/?$/.test(item.url)
                 && !['about','contact','privacy-policy','terms','saas-metrics','ai-cost-tools','valuation-exit','freelance-pricing','cost-efficiency','investment-roi','blog'].some(s => item.url.endsWith(s + '/'));
  const isCategory = ['saas-metrics','ai-cost-tools','valuation-exit','freelance-pricing','cost-efficiency','investment-roi'].some(s => item.url.endsWith(s + '/'));
  const isBlog = /^\/(en|zh)\/blog\//.test(item.url);

  if (isHome) return { ...item, changefreq: 'daily', priority: 1.0 };
  if (isCategory) return { ...item, changefreq: 'weekly', priority: 0.8 };  // NEW
  if (isTool) return { ...item, changefreq: 'monthly', priority: 0.9 };
  if (isBlog) return { ...item, changefreq: 'weekly', priority: 0.7 };
  return { ...item, changefreq: 'monthly', priority: 0.5 };
}
```

## Implementation Plan（3 plans）

### Plan 1: EEAT 全站

**Files**：
- `src/data/tools/types.ts` — ToolMeta +4 字段
- `src/data/tools/{saas,ai-cost,valuation,freelance,cost,investment}.ts` — 32 工具逐个填字段
- `src/components/EeatTrustBlock.astro` — 新建
- `src/pages/[lang]/[slug].astro` — 插入 `<EeatTrustBlock />` + JSON-LD 加 author/dateModified/reviewedBy
- `src/i18n/translations.ts` — +10 key (eeat.*)
- `scripts/check-i18n-completeness.mjs` — 新建（先含 eeat.* 强制）
- `tests/seo-schemas.test.ts` — 新建（先覆盖 author/dateModified 断言）

**Tasks**：3-4 个（含 subagent-driven-development task list）

### Plan 2: About 深度

**Files**：
- `src/pages/[lang]/about.astro` — 重写为 6 section
- `src/i18n/translations.ts` — 改 about.p1-p4 → about.{mission,data_sources,update_policy,editorial_policy,contact,roadmap}.{h1,body}
- `scripts/check-i18n-completeness.mjs` — 加 about.* 强制

**Tasks**：2 个

### Plan 3: Category 落地页 + Header + Breadcrumb

**Files**：
- `src/pages/[lang]/saas-metrics.astro` 等 6 个新 page
- `src/components/CategoryHero.astro`、`CategoryFaq.astro`、`CategoryGuides.astro`、`CategoryOtherNav.astro` — 4 个新
- `src/components/Header.astro` — 加 Categories dropdown
- `src/pages/[lang]/[slug].astro` — breadcrumb 改 3 层
- `src/i18n/translations.ts` — +156 key (category.* intro/faq/guide + header.categories)
- `scripts/check-i18n-completeness.mjs` — 加 category.* 强制
- `astro.config.mjs` — sitemap serialize 加 isCategory
- `tests/seo-schemas.test.ts` — 加 6 category 页 CollectionPage 断言 + breadcrumb 3 层断言

**Tasks**：5-6 个

## Files Touched（汇总）

| 文件 | 操作 | Plan |
|---|---|---|
| `src/data/tools/types.ts` | +4 字段 | 1 |
| `src/data/tools/{6 cat}.ts` | 32 工具逐个填 | 1 |
| `src/components/EeatTrustBlock.astro` | 新建 | 1 |
| `src/pages/[lang]/[slug].astro` | 增 UI 信任块 + JSON-LD + breadcrumb 3 层 | 1, 3 |
| `src/pages/[lang]/about.astro` | 重写 6 section | 2 |
| `src/pages/[lang]/saas-metrics.astro` 等 6 个 | 新建 | 3 |
| `src/components/CategoryHero.astro` 等 4 个 | 新建 | 3 |
| `src/lib/seo-factory.ts` | 新建（createCollectionPage/createCategoryItemList/createBreadcrumb3 helper） | 3 |
| `src/components/Header.astro` | +Categories dropdown | 3 |
| `src/i18n/translations.ts` | +167 key × 2 lang | 1, 2, 3 |
| `scripts/check-i18n-completeness.mjs` | 新建 | 1, 2, 3 |
| `tests/seo-schemas.test.ts` | 新建 | 1, 3 |
| `astro.config.mjs` | sitemap serialize 扩 isCategory | 3 |
| `package.json` | +`check:i18n` script | 1 |

## Acceptance Criteria

### Plan 1: EEAT

- [ ] `pnpm check` exit 0（含新 `check:i18n`）
- [ ] `pnpm test:unit` 全绿
- [ ] `pnpm build` 成功
- [ ] 32 工具 HTML 抽样 5 个：含 author/dateModified/reviewedBy JSON-LD
- [ ] 32 工具 HTML 抽样 5 个：UI 信任块可见且文案来自 ToolMeta
- [ ] 32 工具 dataReviewedAt = '2026-06-22'（统一批次）
- [ ] Schema Markup Validator 抽 5 工具页：EEAT 字段全绿

### Plan 2: About

- [ ] `pnpm check` exit 0
- [ ] `/en/about/` 肉眼可见 6 section 顺序
- [ ] 6 section 文案 i18n 双语一致
- [ ] `about.contact` 含有效 mailto:hello@forgeflowkit.com
- [ ] AboutPage schema 含 dateModified

### Plan 3: Category 落地页

- [ ] `pnpm check` exit 0
- [ ] `pnpm build` 成功，153 页生成（D spec 末态 141 + 6 category × 2 lang = 153）
- [ ] 6 category URL 全部 200 OK
- [ ] Header dropdown 6 项可见且跳转正确
- [ ] 32 工具页 breadcrumb 3 层
- [ ] sitemap 含 12 category URL（6 × 2 lang），priority=0.8
- [ ] Schema Markup Validator 抽 2 category 页 + 2 工具页：CollectionPage + breadcrumb 全绿
- [ ] `src/lib/seo-factory.ts`（新）含 createCollectionPage()、createCategoryItemList()、createBreadcrumb3() helper；6 category page 全部用 helper 而非内联 JSON.stringify

## Out of Scope（推迟到 P1/P2）

| 类别 | 项 |
|---|---|
| 内容/SEO | Blog 改 Markdown |
| 内容/SEO | Engine `createCalculator({...})` 抽象 |
| 内容/SEO | JSON-LD Schema Factory **完全统一**（本 spec 在 `src/lib/seo-factory.ts` 新增 3 个 helper 用于 6 category 页；已有 FAQPage/SoftwareApplication/BreadcrumbList 不重构） |
| 内容/SEO | SearchBar 多字段（title/desc/keywords/aliases） |
| 商业化 | LocalStorage 收藏/历史/最近 |
| 商业化 | PDF 导出 / 分享链接 |
| 商业化 | AI Explain |
| 工程 | data 分层（finance/marketing/...） |
| 工程 | components/ 子目录化 |
| SEO | RelatedTools People also use / Recently / Popular 分组 |
| 工具量 | 32→80-100 工具 |

## Risks & Mitigations

| # | 风险 | 缓解 |
|---|---|---|
| 1 | i18n 167 key × 2 lang = 334 条翻译工作量大 | 分阶段：Plan 1 10 + Plan 2 30 + Plan 3 156；completeness check 强制 |
| 2 | 32 工具 × 4 EEAT 字段 = 128 字段必填 | 字段统一：author="ForgeFlowKit"，reviewedBy="ForgeFlowKit Team"；sources 按 category 归口 |
| 3 | 6 个静态 page 文件重复结构 | copy-paste pattern + 4 个新 component 复用；不抽 dynamic route（避免和 [slug].astro 冲突） |
| 4 | Header dropdown 与现有 mobile menu 冲突 | Plan 3 启动前先读 Header.astro 摸清现状 |
| 5 | Sitemap serialize 正则误判 | 复用 D spec pattern + 显式枚举 6 category slug |
| 6 | BreadcrumbList 3 层 validator 警告 | 中间层代表 category 内部层级，是 Google 推荐模式 |
| 7 | i18n completeness check 误报 | key 缺失 = 抛错；key 存在但值为空 = warn not error |
| 8 | Category slug 与未来工具 slug 撞车 | 工具统一 `solopreneur-` 前缀，category 无前缀，无撞车风险 |

## Rollback Plan

| Plan 失败 | 动作 | 影响 |
|---|---|---|
| Plan 1 失败 | `git revert <sha>` | ToolMeta 4 字段回退；EEAT 信任块移除；32 工具页回到 D 之后状态 |
| Plan 2 失败 | `git revert <sha>` | about.astro 回到 4 段原貌 |
| Plan 3 失败 | `git revert <sha>` | 6 category 页面删除；Header dropdown 移除；breadcrumb 回到 2 层 |

**关键不变量**：原 `[slug].astro:83-109` 的 FAQPage + SoftwareApplication 块（D spec 注入）**保留**，本次只**扩展**。

## References

- Predecessor: `docs/superpowers/specs/2026-06-25-seo-overhaul-design.md` (D, shipped)
- Predecessor: `docs/superpowers/specs/2026-06-26-c-internal-links-multi-dim-design.md` (C, shipped)
- Predecessor: `docs/superpowers/specs/2026-06-26-ab-engines-tools-split-design.md` (A+B, merged)
- Current: `src/data/tools/types.ts`、`src/data/categories.ts`、`src/pages/[lang]/[slug].astro`、`src/pages/[lang]/about.astro`
- Component: `src/components/CategorySection.astro`（首页用，6 category 共用模板可借鉴）
- i18n: `src/i18n/translations.ts:38-69`（about.* + category.* 现有 key）
- Schema factory pattern: `src/data/application-categories.ts`（D spec 引入的 helper 模式）
