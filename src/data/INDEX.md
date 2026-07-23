# Data Index

> **数据层目录索引** — `src/data/` 下静态数据 + 类型定义 + 业务数据，按文件用途分组。
> **总数验证:** `src/data/tools/` 中 `tools: ToolMeta[]` 聚合 100 unique slugs ↔ `src/engines/` 100 engine files (1:1 对应 + 1 filename/slug intentional divergence 详见 §底部)
> **最后更新:** 2026-07-19 (P40 batch)

---

## 顶层结构

```
src/data/
├── INDEX.md (本文件)
├── ai-pricing.json          (1961 lines) — AI token / image gen / GPU / training 单 source of truth
├── og-samples.json          (1502 lines) — 100 engines 的 OG preview 示例数据 (en + zh)
├── categories.ts            (24 lines)   — ToolMeta 业务 category 枚举 (15 letter A/B/C/D/E/F/M/O/S/R/P/H/T/K/L)
├── application-categories.ts(16 lines)   — categoryId ↔ schema.org applicationCategory 映射
├── internal-links.ts        (56 lines)   — 自动 generate relatedTools 表 (per-tool 4 关联)
├── reference-data.ts        (48 lines)   — 周期性 update 的 market benchmarks (freelance rates / SaaS churn / platform fees)
└── tools/                   (15 category files + index.ts + types.ts)
    ├── types.ts             — ToolMeta interface (slug / title / description / inputs / keywords / tags / EEAT)
    ├── index.ts             — 聚合 15 category files 的 barrel export
    └── 15 个 category files — 每个文件 export `tools: ToolMeta[]` (4-8 entries each)
```

| 维度 | 总数 | 验证 |
|---|---|---|
| Top-level files (本目录) | 6 | `ls src/data/*.ts src/data/*.json` |
| `tools/` files | 17 | 15 category + `index.ts` + `types.ts` |
| `tools/` total entries | 100 | `grep -h "^\s*slug:" src/data/tools/*.ts \| wc -l` |
| engines 一致性 | 100 ↔ 100 | `src/engines/` 100 engine files |
| `ai-pricing.json` provider coverage | 4 LLM + 7 image + 6 GPU | JSON schema |

---

## 1 · 顶层文件

| File | LOC | 用途 | Update 频率 |
|---|---|---|---|
| `ai-pricing.json` | 1961 | OpenAI / Claude / Gemini / DeepSeek token + 7 image gen + 6 GPU + training cost single source of truth | **weekly** (LiteLLM upstream via `pnpm sync`) |
| `og-samples.json` | 1502 | 100 engines 的 OG 图预览数据 (headline / trend / unit / label × en + zh) | on engine add/amend |
| `reference-data.ts` | 48 | 周期性 update 的 market benchmarks: freelance rates / SaaS churn / CPL / pricing tiers / platform revenue share | monthly/quarterly |
| `categories.ts` | 24 | 业务 category 枚举 (15 letters: A SaaS Metrics / B AI Cost / C Valuation / D Freelance Pricing / E Cost & Efficiency / F Investment / M Marketing / O Operations / S Sales / R Retention / P Product Analytics / H Hiring / T Customer Support / K Knowledge / L Legal) | on category add |
| `application-categories.ts` | 16 | ToolMeta.categoryId (A-F) ↔ schema.org applicationCategory 映射 (`BusinessApplication` / `DeveloperApplication` / `FinanceApplication`) | on schema update |
| `internal-links.ts` | 56 | Auto-generate `relatedTools` 表: per-tool 4 related 关联 (same-cat first → cross-cat score>0 → score=0 stable fill) | 自动 regen per rebuild |

### 1.1 `ai-pricing.json` schema 速览

```ts
{
  version: 1,
  lastUpdated: 'YYYY-MM-DD',
  source: 'litellm+manual',
  llm: { openai: { models: {...} }, anthropic: {...}, google: {...}, deepseek: {...} },
  image: { providers: {...}, subTiers: {...}, advancedMult: {...} },
  gpu: { providers: {...}, storagePerGB: 0.10, egressPerGB: 0.08 },
  training: { gpuTypes: {...}, modelSizes: {...}, loraSpeedup: 0.35, dataProcessPerGB: 1.50 }
}
```

8 of 100 engines consume this JSON directly (`src/engines/ai-cost/`). Update via `pnpm sync` (fetches LiteLLM upstream + runs `codegen-customfn.mjs` to regenerate engine data tables).

### 1.2 `og-samples.json` schema 速览

```ts
{
  'solopreneur-<slug>': {
    headline: { en: '$X', zh: '$X' },
    headlineUnit: { en: '/month', zh: '/月' },
    headlineLabel: { en: '...', zh: '...' },
    trend: { en: '▲ +X% MoM', zh: '▲ 月环比 +X%' }
  }
}
```

Consumed by `scripts/build-og-images.ts` at build time. Per P23 coverage guard `scripts/check-og-samples-coverage.mjs`: 100/100 entries required (build fails if any missing — see P22b/P23 audit history).

### 1.3 `reference-data.ts` 段

- `freelanceRates` — developer/designer/writer/marketer/consultant × junior/mid/senior/expert hourly rates (USD)
- `saasBenchmarks` — avg monthly/annual churn / CPL consumer+B2B / trial→paid conversion / freemium→paid conversion
- `pricingTiers` — starter / pro / business / enterprise (range + typicalFeatures)
- `platformRevenueShare` — appStore / googlePlay / stripe / gumroad / paddle / productHunt 平台分成

`updated: 'YYYY-MM-DD'` 字段在每次 value 改动时同步更新。

### 1.4 `categories.ts` vs CLAUDE.md letters

⚠️ **两套平行 letter 分类**:

| 维度 | Letters | 来源 | 用途 |
|---|---|---|---|
| `categories.ts` | A / B / C / D / E / F / M / O / S / R / P / H / T / K / L (15 letters) | `src/data/categories.ts` | ToolMeta.categoryId schema |
| CLAUDE.md | A / B / C / D / E / F / H / K / L / M / O / P / R / S / T (15 letters, B = AI Cost Tools) | `CLAUDE.md` §Project Overview | Site nav logical categories |

**两者一一对应**:
- `categories.ts` 是 canonical source（消费方：`src/pages/[lang]/*.astro` × 15 listing pages + Header nav + `internal-links.ts`）
- `CLAUDE.md` 现已同步为 15 letters (P46 audit 2026-07-20 closed)
- 历史: P40 当时两者不一致（CLAUDE.md 列 16 letters 含 phantom I/V），P46 audit 修复

未来 AI session 修改 ToolMeta.categoryId 应**只参考 `categories.ts`**，不要被 CLAUDE.md letters 误导。

### 1.5 `application-categories.ts` schema

```ts
A: 'BusinessApplication',   // SaaS Metrics
B: 'DeveloperApplication',  // AI Cost Tools
C: 'FinanceApplication',    // Valuation & Exit
D: 'BusinessApplication',   // Freelance Pricing
E: 'BusinessApplication',   // Cost & Efficiency
F: 'FinanceApplication',    // Investment & Real Estate
```

Consumed by JSON-LD `applicationCategory` field per page. Unmapped categoryId fallback = `BusinessApplication`.

---

## 2 · `tools/` 子目录 — 15 category barrels + types + index

| File | LOC | Entries | Engines ↔ | Data category |
|---|---|---|---|---|
| `ai-cost.ts` | 179 | 8 | ai-cost/ (8) | B (AI Cost Tools) |
| `cost.ts` | 107 | 5 | cost/ (5) + valuation/ (0) | E (Cost & Efficiency) |
| `customer-support.ts` | 176 | 6 | customer-support/ (6) | T (Customer Support) |
| `freelance.ts` | 115 | 6 | freelance/ (3) + valuation/ (3: course-pricing, email-list-revenue, project-profitability) | D (Freelance Pricing) |
| `hiring-team.ts` | 208 | 6 | hiring-team/ (6) | H (Hiring & Team) |
| `investment.ts` | 79 | 4 | investment/ (4 — equity-dilution 不在此, 在 valuation.ts) | F (Investment & Real Estate) |
| `knowledge.ts` | 211 | 6 | knowledge/ (6) | K (Knowledge) |
| `legal-compliance.ts` | 216 | 6 | legal-compliance/ (6) | L (Legal & Compliance) |
| `marketing.ts` | 329 | 8 | marketing/ (8) | M (Marketing Analytics) |
| `operations.ts` | 223 | 6 | operations/ (6) | O (Operations) |
| `product-analytics.ts` | 204 | 6 | product-analytics/ (6) | P (Product Analytics) |
| `real-estate.ts` | 210 | 6 | real-estate/ (6) | F (Investment & Real Estate) |
| `retention.ts` | 207 | 6 | retention/ (6) | R (Retention & Customer Success) |
| `saas.ts` | 113 | 5 | saas/ (5) | A (SaaS Metrics) |
| `sales.ts` | 220 | 6 | sales/ (6) | S (Sales) |
| `valuation.ts` | 231 | 10 | valuation/ (9) | C (Valuation & Exit) + partial A |
| **Total entries** | | **100** | **100 ↔ 100** ✓ | |

> **注:** tools/ 物理 subdir 组织 ≠ engines/ 物理 subdir ≠ categories.ts letters。三个独立维度 (per P39 INDEX 物理 vs 字母 pattern)。
>
> **特别 cases:**
> - `tools/cost.ts` 含 `solopreneur-saas-pricing-planner` — engines/ 中归 cost/
> - `tools/freelance.ts` 含 3 valuation engines (course-pricing, email-list-revenue, project-profitability)
> - `tools/investment.ts` 4 entries (无 equity-dilution); `tools/valuation.ts` 10 entries 含 equity-dilution
> - `tools/valuation.ts` 10 entries vs `engines/valuation/` 9 engines — 差 1: saas-pricing-planner (在 tools/cost.ts, P60 移到 engines/cost/)。P59-era "13 — equity-dilution + 12 others" 已闭环；P59-era "差 3 (freelance)" 由 P59 关闭

---

## 3 · `types.ts` — ToolMeta 接口

```ts
export interface ToolMeta {
  slug: string;                          // 'solopreneur-<engine-slug>'
  title: string;                         // Human-readable title
  description: string;                   // 1-2 sentences (i18n mirror in src/i18n/)
  categoryId: string;                    // A-F / M / O / S / R / P / H / T / K / L (per categories.ts)
  applicationCategory: string;           // schema.org type (per application-categories.ts)
  inputs: { name, label, placeholder, type: 'text'|'select'|'number', options? }[];
  keywords: string[];                    // 5-10 per tool; drives recommendation algorithm
  tags: string[];                        // 3-5 per tool; reserved for UI / Schema.org reuse
  // EEAT (added 2026-06-27, P0 content-depth spec)
  reviewedBy: string;                    // e.g. 'ForgeFlowKit Team'
  author: string;                        // e.g. 'ForgeFlowKit'
  dataReviewedAt: string;                // ISO date YYYY-MM-DD
  sources: string[];                     // Reference citations
}
```

---

## 4 · `index.ts` — barrel pattern

聚合 15 category files 为单一 `tools: ToolMeta[]` export (100 entries):

```ts
import { tools as saas } from './saas';
import { tools as aiCost } from './ai-cost';
// ... 16 imports total

export const tools: ToolMeta[] = [
  ...saas, ...aiCost, ...valuation, ...freelance, ...cost,
  ...investment, ...realEstate, ...marketing, ...operations,
  ...sales, ...retention, ...productAnalytics, ...hiringTeam,
  ...customerSupport, ...knowledge, ...legalCompliance,
];

export type { ToolMeta };
```

**Why explicit imports (vs `import.meta.glob`):** test runner + prebuild script 都在 `tsx` 下运行；`tsx` 不实现 `import.meta.glob`。Explicit imports 兼容所有运行环境。

**Consumers** (per P35 INDEX audit):
- `src/pages/[lang]/index.astro` — landing page
- `src/pages/[lang]/[slug].astro` — calculator page
- `src/data/internal-links.ts` — relatedTools generation
- `scripts/generate-blog-posts.mjs` — blog post seeds
- `src/i18n/translations.ts` (read indirectly via build)

---

## 5 · 物理 subdir vs 字母分类 vs Engines subdir — 三维 crosswalk

| tools/ file | categoryId (字母) | engines/ subdir | category slug |
|---|---|---|---|
| `ai-cost.ts` | B | `ai-cost/` | ai-cost-tools |
| `cost.ts` | E | `cost/` (5) + `valuation/` (0) | cost-efficiency |
| `customer-support.ts` | T | `customer-support/` | customer-support |
| `freelance.ts` | D | `freelance/` (3) + `valuation/` (3) | freelance-pricing |
| `hiring-team.ts` | H | `hiring-team/` | hiring-team |
| `investment.ts` | F | `investment/` (4 of 5) | investment-roi |
| `knowledge.ts` | K | `knowledge/` | knowledge |
| `legal-compliance.ts` | L | `legal-compliance/` | legal-compliance |
| `marketing.ts` | M | `marketing/` | marketing-analytics |
| `operations.ts` | O | `operations/` | operations-inventory |
| `product-analytics.ts` | P | `product-analytics/` | product-analytics |
| `real-estate.ts` | F | `real-estate/` | investment-roi |
| `retention.ts` | R | `retention/` | retention |
| `saas.ts` | A | `saas/` | saas-metrics |
| `sales.ts` | S | `sales/` | sales |
| `valuation.ts` | C | `valuation/` (9 of 10) | valuation-exit |

**Summary**: 3 个独立分类维度共存 — tools/ 物理 (15 files), categoryId (15 letters A/B/C/D/E/F/H/K/L/M/O/P/R/S/T), engines 物理 (15 subdirs)。三者**1:1 对应** by canonical letter after P46 audit; Index 标注 crosswalk 防止 future AI session 误合并。

---

## 6 · 维护约定

- **navigator, not catalog** — INDEX 列 file + 用途 + LOC + entry count; 不重述 ToolMeta 详情 (tools/ files 自身是 source of truth)
- **新增 ToolMeta** 必须更新 (1) 对应 `tools/<category>.ts` (2) `tools/index.ts` barrel (3) `og-samples.json` (P23 coverage guard) (4) `src/i18n/translations.ts` (P17 completeness check)
- **新增 category** 必须更新 (1) `tools/<new>.ts` (2) `tools/index.ts` (3) `categories.ts` (4) `application-categories.ts` (5) P40 INDEX (6) P39 INDEX (7) CLAUDE.md
- **Tools entry count drift (≠ 100)** triggers cascade audit (per P22b pattern: `EXPECTED_ENGINE_COUNT` constant + drift guard)
- **ai-pricing.json schema 变更** 触发 `scripts/codegen-customfn.mjs` 重生 + `pnpm sync` 测试
- **filename vs slug intentional divergence** — `engines/ai-cost/ai-image-generation-cost-calculator.ts` (filename) ↔ `solopreneur-ai-image-cost-calculator` (slug, consumers). 不动其一即可保持 100/100 映射

---

## 7 · 验证

- **0 production code touched** (P40 不动现有 files)
- **0 test files touched**
- tools/ entries ↔ engines/ files 1:1 验证（99 精确匹配 + 1 intentional filename/slug divergence）
- `ai-pricing.json` 1961 LOC / `og-samples.json` 1502 LOC — build-time critical
- 与 P39 `src/engines/INDEX.md` 互补：P39 写 engines 视角；P40 写 data 视角
