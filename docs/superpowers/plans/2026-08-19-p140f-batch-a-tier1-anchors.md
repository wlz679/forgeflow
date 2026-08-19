# P140f Phase 1 Batch A — Tier 1 Anchor Topics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 15 Tier 1 anchor Topic pages (1 per letter × 2 templates = 30 new pages) — first concrete deliverable of the P140f v2.0 Topic Authority architecture.

**Architecture:** Data-driven Topic layer between existing 15 letter categories and 100 calculators. Each Tier 1 anchor Topic = 1 Guide page (educational, ~1200-1500 字) + 1 Benchmark page (data table, ~600 字). Both pages cross-link via TopicCard component + bidirectional breadcrumb. Editorial content hand-curated per Topic (NO scaled content — ChatGPT §12 warning).

**Tech Stack:** Astro 4.16.19, TypeScript 5.6 strict, zod schema, node:test, content collections.

**Branch:** `feature/p140f-batch-a-tier1-anchors` off master `7520675`.

---

## Global Constraints

- **Engine count locked at 100** (P22b invariant). Do NOT add/remove engines.
- **15 letter categories preserved** (`/en/saas-metrics/` etc. URLs unchanged).
- **Editorial persona preserved**: 王立柱 (Wang Lizhu) per P140c — Topic Guides authored by him.
- **NO scaled content** — every Topic Guide + Benchmark is hand-curated. ChatGPT §12 explicitly warned against generative-AI mass production.
- **Tier 1 anchor prose thresholds**: Guide zh ≥ 1200 字 / en ≥ 1500 字, Benchmark zh ≥ 600 字 / en ≥ 700 字. Stricter than calculator prose.
- **Source citations**: ≥ 3 real industry sources per Guide (URLs verified, no round 2).
- **Existing build-dep guards must remain green** (49 build-dep suites). Add 2 new guards (Topic Guide shape + Benchmark shape).
- **3-way divergence target**: 0/0 after ship.
- **Master commit count target**: 1094 → ~1103 (+9 atomic commits).
- **Static pages**: 451 → 481 (+30 Tier 1 anchor Topic pages).
- **No new npm dependencies.** Pure content + component addition.

---

## File Structure

| File | Responsibility | Status |
|---|---|---|
| `src/data/topics.ts` | Topic data layer (interface + 15 Tier 1 anchor entries) | Create in T1 |
| `src/data/categories.ts` | Letter categories with new `domain` field | Modify in T1 |
| `src/i18n/translations.ts` | Topic H2 names (en + zh) + breadcrumb segments | Modify in T1 |
| `src/components/Breadcrumb.astro` | Shared breadcrumb component with Domain → Letter → Topic → Calculator hierarchy | Create in T2 |
| `src/components/TopicCard.astro` | Topic card for letter page grid + calculator page Topic section | Create in T2 |
| `src/pages/[lang]/[letter]/[topic]-guide.astro` | Topic Guide page template | Create in T3 |
| `src/pages/[lang]/[letter]/[topic]-benchmark.astro` | Topic Benchmark page template | Create in T4 |
| `src/pages/[lang]/[category].astro` | Existing letter page; add Topics section | Modify in T5 |
| `src/pages/[lang]/[slug].astro` | Existing calculator page; add Topic cross-link in E-E-A-T block | Modify in T6 |
| `tests/topic-guide-shape-guard.test.ts` | Build-dep guard for Guide H2 structure | Create in T7 |
| `tests/topic-benchmark-shape-guard.test.ts` | Build-dep guard for Benchmark table structure | Create in T7 |
| `tests/content-prose-shape-guard.test.ts` | Modify Test 7 to require Tier 1 anchor Guides | Modify in T7 |
| `memory/p140f-batch-a-tier1-anchors-shipped.md` | Ship record | Create in T8 |
| `memory/MEMORY.md` | Index | Modify in T8 |
| `docs/superpowers/plans/INDEX.md` | Plans index | Modify in T8 |
| `CHANGELOG.md` | Change log + M25.3 | Modify in T8 |

**15 Tier 1 anchor Topics** (1 per letter, slug = business question not acronym):

| Letter | Anchor Engine | Topic Slug | Topic Title (en) |
|---|---|---|---|
| A | `solopreneur-mrr-calculator` | `mrr-growth-strategies` | MRR Growth Strategies |
| B | `solopreneur-openai-token-calculator` | `llm-api-cost-optimization` | LLM API Cost Optimization |
| C | `solopreneur-cac-calculator` | `customer-acquisition-cost` | Customer Acquisition Cost |
| D | `solopreneur-freelance-rate-calculator` | `freelance-rate-strategy` | Freelance Rate Strategy |
| E | `solopreneur-meeting-cost-calculator` | `meeting-cost-optimization` | Meeting Cost Optimization |
| F | `solopreneur-mortgage-calculator` | `mortgage-strategy-comparison` | Mortgage Strategy Comparison |
| H | `solopreneur-fully-loaded-employee-cost-calculator` | `employee-cost-planning` | Employee Cost Planning |
| K | `solopreneur-kb-coverage-rate-calculator` | `knowledge-base-coverage` | Knowledge Base Coverage |
| L | `solopreneur-gdpr-fine-calculator` | `gdpr-compliance-strategy` | GDPR Compliance Strategy |
| M | `solopreneur-roas-calculator` | `roas-optimization` | ROAS Optimization |
| O | `solopreneur-inventory-turnover-calculator` | `inventory-turnover-optimization` | Inventory Turnover Optimization |
| P | `solopreneur-funnel-step-calculator` | `funnel-conversion-optimization` | Funnel Conversion Optimization |
| R | `solopreneur-nrr-calculator` | `net-revenue-retention` | Net Revenue Retention |
| S | `solopreneur-pipeline-value-calculator` | `pipeline-value-optimization` | Pipeline Value Optimization |
| T | `solopreneur-cost-per-support-ticket-calculator` | `support-cost-optimization` | Support Cost Optimization |

---

### Task 1: Data layer + categories domain + i18n keys (MECHANICAL)

**Files:**
- Create: `src/data/topics.ts` (new Topic interface + TOPICS array with 15 entries)
- Modify: `src/data/categories.ts` (add `domain` field to each Category)
- Modify: `src/i18n/translations.ts` (add Topic H2 names + breadcrumb segments)

**Interfaces:**
- Consumes: existing Category type, prose-tiers TIER_1_SLUGS
- Produces: `Topic` interface + `TOPICS: Topic[]` exported from topics.ts; 15 Tier 1 anchor Topic entries; categories with `domain` field; i18n keys for Topic page H2 names + breadcrumb segments

- [ ] **Step 1: Read** `src/data/categories.ts` to understand existing Category interface + 15 entries.

- [ ] **Step 2: Modify `src/data/categories.ts`** — add `domain` field to Category interface:

```typescript
export type DomainId = 'finance' | 'marketing' | 'customer' | 'product' | 'people' | 'legal' | 'ai-cost' | 'operations';

export interface Category {
  // ... existing fields
  domain: DomainId;
}
```

Then add `domain` to each of the 15 Category entries per spec §2 Domain mapping table:

- A → 'finance'
- B → 'ai-cost'
- C → 'finance'
- D → 'finance'
- E → 'operations'
- F → 'finance'
- H → 'people'
- K → 'customer'
- L → 'legal'
- M → 'marketing'
- O → 'operations'
- P → 'product'
- R → 'customer'
- S → 'marketing'
- T → 'people'

- [ ] **Step 3: Create `src/data/topics.ts`** with Topic interface + 15 Tier 1 entries:

```typescript
// P140f: Topic layer between Category letter and Calculator. Each Topic
// has 1 Guide page + 1 Benchmark page (Tier 1 anchor in Batch A).
export type TopicId = string;

export interface Topic {
  id: TopicId;                              // kebab-case unique, e.g. "roas-optimization"
  letterId: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'H' | 'K' | 'L' | 'M' | 'O' | 'P' | 'R' | 'S' | 'T';
  domain: 'finance' | 'marketing' | 'customer' | 'product' | 'people' | 'legal' | 'ai-cost' | 'operations';
  title: { en: string; zh: string };
  description: { en: string; zh: string };
  calculatorSlugs: string[];               // 1-3 calculators linked from this Topic
  relatedTopicIds: TopicId[];               // sibling topics (cross-link)
  tier: 1 | 2 | 3;                          // editorial depth tier
  publishedAt: string;                       // ISO date YYYY-MM-DD
}

export const TOPICS: Topic[] = [
  // A
  { id: 'mrr-growth-strategies', letterId: 'A', domain: 'finance', tier: 1, publishedAt: '2026-08-19',
    title: { en: 'MRR Growth Strategies', zh: 'MRR 增长策略' },
    description: { en: 'Frameworks for measuring and accelerating monthly recurring revenue growth across SaaS stages.',
                    zh: '衡量并加速 SaaS 不同阶段月度经常性收入增长的框架。' },
    calculatorSlugs: ['solopreneur-mrr-calculator', 'solopreneur-revenue-projector'],
    relatedTopicIds: ['net-revenue-retention', 'customer-acquisition-cost'] },
  // B
  { id: 'llm-api-cost-optimization', letterId: 'B', domain: 'ai-cost', tier: 1, publishedAt: '2026-08-19',
    title: { en: 'LLM API Cost Optimization', zh: 'LLM API 成本优化' },
    description: { en: 'Strategies for reducing token spend across OpenAI, Claude, Gemini, and DeepSeek APIs.',
                    zh: '在 OpenAI、Claude、Gemini、DeepSeek API 之间降低 token 成本的策略。' },
    calculatorSlugs: ['solopreneur-openai-token-calculator', 'solopreneur-claude-api-cost-calculator', 'solopreneur-ai-api-cost-comparison'],
    relatedTopicIds: [] },
  // C
  { id: 'customer-acquisition-cost', letterId: 'C', domain: 'finance', tier: 1, publishedAt: '2026-08-19',
    title: { en: 'Customer Acquisition Cost', zh: '客户获取成本' },
    description: { en: 'Measure, benchmark, and reduce your customer acquisition cost across B2B and B2C channels.',
                    zh: '衡量、基准化并降低 B2B 与 B2C 渠道的客户获取成本。' },
    calculatorSlugs: ['solopreneur-cac-calculator', 'solopreneur-ltv-calculator'],
    relatedTopicIds: ['net-revenue-retention', 'funnel-conversion-optimization'] },
  // D
  { id: 'freelance-rate-strategy', letterId: 'D', domain: 'finance', tier: 1, publishedAt: '2026-08-19',
    title: { en: 'Freelance Rate Strategy', zh: '自由职业费率策略' },
    description: { en: 'Set freelance rates by skill, market, and business model — and model what you actually take home.',
                    zh: '按技能、市场和业务模式设定自由职业费率，并建模实际到手收入。' },
    calculatorSlugs: ['solopreneur-freelance-rate-calculator', 'solopreneur-hourly-vs-fixed-calculator', 'solopreneur-freelance-tax-calculator'],
    relatedTopicIds: ['employee-cost-planning'] },
  // E
  { id: 'meeting-cost-optimization', letterId: 'E', domain: 'operations', tier: 1, publishedAt: '2026-08-19',
    title: { en: 'Meeting Cost Optimization', zh: '会议成本优化' },
    description: { en: 'Quantify the true cost of meetings and decide which ones are worth having.',
                    zh: '量化会议的真实成本，并决定哪些会议值得开。' },
    calculatorSlugs: ['solopreneur-meeting-cost-calculator', 'solopreneur-employee-cost-calculator', 'solopreneur-productivity-score'],
    relatedTopicIds: ['employee-cost-planning'] },
  // F
  { id: 'mortgage-strategy-comparison', letterId: 'F', domain: 'finance', tier: 1, publishedAt: '2026-08-19',
    title: { en: 'Mortgage Strategy Comparison', zh: '按揭策略对比' },
    description: { en: 'Compare fixed vs adjustable, 15 vs 30 year, and amortization strategies for your mortgage.',
                    zh: '对比固定 vs 可调、15 年 vs 30 年以及按揭偿还策略。' },
    calculatorSlugs: ['solopreneur-mortgage-calculator', 'solopreneur-rent-vs-buy-calculator', 'solopreneur-brrrr-calculator'],
    relatedTopicIds: [] },
  // H
  { id: 'employee-cost-planning', letterId: 'H', domain: 'people', tier: 1, publishedAt: '2026-08-19',
    title: { en: 'Employee Cost Planning', zh: '员工成本规划' },
    description: { en: 'Budget for fully-loaded employee cost, ramp time, and attrition.',
                    zh: '为全负担员工成本、爬坡时间和流失做预算。' },
    calculatorSlugs: ['solopreneur-fully-loaded-employee-cost-calculator', 'solopreneur-attrition-cost-calculator', 'solopreneur-time-to-productivity-calculator'],
    relatedTopicIds: ['meeting-cost-optimization'] },
  // K
  { id: 'knowledge-base-coverage', letterId: 'K', domain: 'customer', tier: 1, publishedAt: '2026-08-19',
    title: { en: 'Knowledge Base Coverage', zh: '知识库覆盖率' },
    description: { en: 'Measure and improve your self-service knowledge base coverage to reduce support tickets.',
                    zh: '衡量并提升自助知识库覆盖率，减少客服工单。' },
    calculatorSlugs: ['solopreneur-kb-coverage-rate-calculator', 'solopreneur-deflection-quality-calculator', 'solopreneur-article-helpfulness-calculator'],
    relatedTopicIds: ['support-cost-optimization'] },
  // L
  { id: 'gdpr-compliance-strategy', letterId: 'L', domain: 'legal', tier: 1, publishedAt: '2026-08-19',
    title: { en: 'GDPR Compliance Strategy', zh: 'GDPR 合规策略' },
    description: { en: 'Assess GDPR fine risk, DSAR cost, and consent revenue impact for your SaaS business.',
                    zh: '评估 GDPR 罚款风险、DSAR 处理成本和同意营收影响。' },
    calculatorSlugs: ['solopreneur-gdpr-fine-calculator', 'solopreneur-dsar-cost-calculator', 'solopreneur-consent-revenue-impact-calculator', 'solopreneur-dpa-cost-calculator'],
    relatedTopicIds: ['support-cost-optimization'] },
  // M
  { id: 'roas-optimization', letterId: 'M', domain: 'marketing', tier: 1, publishedAt: '2026-08-19',
    title: { en: 'ROAS Optimization', zh: 'ROAS 优化' },
    description: { en: 'Measure return on ad spend across channels and find your most efficient acquisition mix.',
                    zh: '衡量跨渠道广告支出回报，找到最高效的获客组合。' },
    calculatorSlugs: ['solopreneur-roas-calculator', 'solopreneur-content-marketing-roi-calculator'],
    relatedTopicIds: ['customer-acquisition-cost', 'funnel-conversion-optimization'] },
  // O
  { id: 'inventory-turnover-optimization', letterId: 'O', domain: 'operations', tier: 1, publishedAt: '2026-08-19',
    title: { en: 'Inventory Turnover Optimization', zh: '库存周转优化' },
    description: { en: 'Reduce carrying cost and stockout risk by tuning your inventory turnover rate.',
                    zh: '通过优化库存周转率降低持有成本和缺货风险。' },
    calculatorSlugs: ['solopreneur-inventory-turnover-calculator', 'solopreneur-carrying-cost-calculator', 'solopreneur-reorder-point-calculator'],
    relatedTopicIds: [] },
  // P
  { id: 'funnel-conversion-optimization', letterId: 'P', domain: 'product', tier: 1, publishedAt: '2026-08-19',
    title: { en: 'Funnel Conversion Optimization', zh: '漏斗转化优化' },
    description: { en: 'Diagnose and improve conversion at each funnel stage from awareness to purchase.',
                    zh: '诊断并提升从认知到购买各漏斗阶段的转化率。' },
    calculatorSlugs: ['solopreneur-funnel-step-calculator', 'solopreneur-funnel-value-calculator', 'solopreneur-feature-adoption-calculator'],
    relatedTopicIds: ['roas-optimization', 'customer-acquisition-cost'] },
  // R
  { id: 'net-revenue-retention', letterId: 'R', domain: 'customer', tier: 1, publishedAt: '2026-08-19',
    title: { en: 'Net Revenue Retention', zh: '净收入留存' },
    description: { en: 'Measure NRR and GRR to understand your expansion vs churn dynamics.',
                    zh: '衡量 NRR 与 GRR，理解扩展与流失的动态。' },
    calculatorSlugs: ['solopreneur-nrr-calculator', 'solopreneur-grr-calculator', 'solopreneur-customer-health-score-calculator'],
    relatedTopicIds: ['mrr-growth-strategies', 'customer-acquisition-cost'] },
  // S
  { id: 'pipeline-value-optimization', letterId: 'S', domain: 'marketing', tier: 1, publishedAt: '2026-08-19',
    title: { en: 'Pipeline Value Optimization', zh: '管道价值优化' },
    description: { en: 'Forecast pipeline coverage and velocity to hit your quota with the right deal mix.',
                    zh: '预测管道覆盖率和销售速度，用正确的成交组合达成业绩。' },
    calculatorSlugs: ['solopreneur-pipeline-value-calculator', 'solopreneur-pipeline-coverage-calculator', 'solopreneur-sales-velocity-calculator'],
    relatedTopicIds: ['funnel-conversion-optimization'] },
  // T
  { id: 'support-cost-optimization', letterId: 'T', domain: 'people', tier: 1, publishedAt: '2026-08-19',
    title: { en: 'Support Cost Optimization', zh: '客服成本优化' },
    description: { en: 'Reduce cost-per-ticket by improving deflection, FRT, and team capacity planning.',
                    zh: '通过提升分流、首次响应和团队容量规划降低单工单成本。' },
    calculatorSlugs: ['solopreneur-cost-per-support-ticket-calculator', 'solopreneur-deflection-rate-calculator', 'solopreneur-support-capacity-planning-calculator'],
    relatedTopicIds: ['knowledge-base-coverage'] },
];

// Topic lookup helpers
export function getTopicById(id: TopicId): Topic | undefined {
  return TOPICS.find((t) => t.id === id);
}

export function getTopicsByLetter(letterId: string): Topic[] {
  return TOPICS.filter((t) => t.letterId === letterId);
}

export function getTier1Topics(): Topic[] {
  return TOPICS.filter((t) => t.tier === 1);
}
```

- [ ] **Step 4: Add i18n keys to `src/i18n/translations.ts`** — append after existing `eeat.*` block:

```typescript
  // P140f: Topic page H2 names (Guide + Benchmark)
  'topic.guide.h2.what_is': { en: 'What is {topic}?', zh: '什么是 {topic}？' },
  'topic.guide.h2.why_matters': { en: 'Why {topic} matters', zh: '为什么 {topic} 重要' },
  'topic.guide.h2.key_concepts': { en: 'Key concepts', zh: '核心概念' },
  'topic.guide.h2.how_to_apply': { en: 'How to apply {topic}', zh: '如何应用 {topic}' },
  'topic.guide.h2.common_pitfalls': { en: 'Common pitfalls', zh: '常见误区' },
  'topic.guide.h2.related': { en: 'Related Topics & calculators', zh: '相关主题与计算器' },
  'topic.benchmark.h2.what_we_measure': { en: 'What we measure', zh: '测量指标' },
  'topic.benchmark.h2.industry_benchmarks': { en: 'Industry benchmarks', zh: '行业基准' },
  'topic.benchmark.h2.how_to_use': { en: 'How to use these numbers', zh: '如何使用这些数据' },
  'topic.benchmark.h2.sources': { en: 'Sources & methodology', zh: '来源与方法论' },

  // P140f: Breadcrumb segments (Domain names)
  'breadcrumb.home': { en: 'Home', zh: '首页' },
  'breadcrumb.domain.finance': { en: 'Finance & Investment', zh: '财务与投资' },
  'breadcrumb.domain.marketing': { en: 'Marketing & Sales', zh: '营销与销售' },
  'breadcrumb.domain.customer': { en: 'Customer & Retention', zh: '客户与留存' },
  'breadcrumb.domain.product': { en: 'Product & Engineering', zh: '产品与工程' },
  'breadcrumb.domain.people': { en: 'People & Operations', zh: '人事与运营' },
  'breadcrumb.domain.legal': { en: 'Legal & Compliance', zh: '法务与合规' },
  'breadcrumb.domain.ai-cost': { en: 'AI Cost Tools', zh: 'AI 成本工具' },
  'breadcrumb.domain.operations': { en: 'Operations', zh: '运营' },

  // P140f: CTA labels
  'topic.cta.read_guide': { en: 'Read the Topic Guide', zh: '阅读主题指南' },
  'topic.cta.view_benchmarks': { en: 'View industry benchmarks', zh: '查看行业基准' },
  'topic.cta.use_calculator': { en: 'Use the calculator', zh: '使用计算器' },
  'topic.cta.learn_methodology': { en: 'Learn the methodology', zh: '了解方法论' },

  // P140f: Letter page Topics section
  'letter.topics_section.h2': { en: 'Topics in this category', zh: '本类别主题' },
```

- [ ] **Step 5: Verify tsc clean:**

```bash
node_modules/.bin/tsc --noEmit 2>&1 | tail -3
```

Expected: clean.

- [ ] **Step 6: Commit:**

```bash
git add src/data/topics.ts src/data/categories.ts src/i18n/translations.ts
git -c core.hooksPath=/dev/null commit -m "feat(data): P140f-T1 Topic data layer + categories domain field + i18n keys

Add src/data/topics.ts (new Topic interface + 15 Tier 1 anchor entries,
1 per letter A-T). Add DomainId type + domain field to src/data/categories.ts
(15 letters mapped to 8 domains: finance/marketing/customer/product/people/
legal/ai-cost/operations). Add i18n keys for Topic Guide/Benchmark H2 names,
breadcrumb domain segments, CTA labels.

Data layer is the foundation for T2-T7. Helpers (getTopicById,
getTopicsByLetter, getTier1Topics) exported for use in T2 components
and T5/T6 page modifications.

Verification:
- tsc --noEmit: clean"
```

---

### Task 2: Breadcrumb + TopicCard components (MECHANICAL)

**Files:**
- Create: `src/components/Breadcrumb.astro`
- Create: `src/components/TopicCard.astro`

**Interfaces:**
- Consumes: T1 `Topic` type + `getTopicsByLetter()` + `Category` type
- Produces: Reusable Astro components for breadcrumb + topic grid cards

- [ ] **Step 1: Read** `src/components/Header.astro` line 30-50 to learn existing component patterns.

- [ ] **Step 2: Create `src/components/Breadcrumb.astro`** with semantic `<nav>` + ordered list:

```astro
---
// P140f: Site-wide breadcrumb with Domain → Letter → Topic → Calculator
// hierarchy. Used on Topic Guide, Topic Benchmark, Calculator, and Letter pages.
import { t } from '../i18n';
import { getTopicById } from '../data/topics';
import { categories } from '../data/categories';
import type { Lang } from '../lib/lang';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface Props {
  lang: Lang;
  letter?: string;             // e.g. 'M'
  topicId?: string;             // e.g. 'roas-optimization'
  calculatorTitle?: string;     // override for last segment
}

const { lang, letter, topicId, calculatorTitle } = Astro.props;

const items: BreadcrumbItem[] = [];
items.push({ label: t('breadcrumb.home', lang), href: `/${lang}/` });

if (letter) {
  const cat = categories.find((c) => c.id === letter);
  if (cat) {
    items.push({
      label: t(`breadcrumb.domain.${cat.domain}`, lang),
      href: `/${lang}/#domain-${cat.domain}`,
    });
    items.push({
      label: t(`category.${letter}.name`, lang),
      href: `/${lang}/${cat.slug}/`,
    });
  }
}

if (topicId) {
  const topic = getTopicById(topicId);
  if (topic && letter) {
    const cat = categories.find((c) => c.id === letter);
    if (cat) {
      items.push({
        label: topic.title[lang as 'en' | 'zh'],
        href: `/${lang}/${cat.slug}/${topic.id}/`,
      });
    }
  }
}

if (calculatorTitle) {
  items.push({ label: calculatorTitle });
}
---
<nav aria-label="Breadcrumb" class="text-sm text-gray-500 mb-4">
  <ol class="flex flex-wrap items-center gap-1">
    {items.map((item, idx) => (
      <li class="flex items-center gap-1">
        {idx > 0 && <span class="text-gray-400">›</span>}
        {item.href ? (
          <a href={item.href} class="text-[#7C3AED] hover:underline">{item.label}</a>
        ) : (
          <span class="text-gray-700">{item.label}</span>
        )}
      </li>
    ))}
  </ol>
</nav>
```

- [ ] **Step 3: Create `src/components/TopicCard.astro`** for letter page grid + calculator Topic section:

```astro
---
// P140f: Topic card component. Used in (1) letter page Topics grid,
// (2) calculator page Related Topics section.
import type { Topic } from '../data/topics';
import type { Lang } from '../lib/lang';
import { t } from '../i18n';
import { categories } from '../data/categories';

export interface Props {
  topic: Topic;
  lang: Lang;
  variant?: 'full' | 'compact';
}

const { topic, lang, variant = 'full' } = Astro.props;
const cat = categories.find((c) => c.id === topic.letterId);
const href = cat ? `/${lang}/${cat.slug}/${topic.id}/` : '#';
const isCompact = variant === 'compact';
---
<a
  href={href}
  class={`block border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors ${isCompact ? '' : 'mb-3'}`}
>
  <h3 class={`font-semibold text-gray-900 ${isCompact ? 'text-sm' : 'text-base'} mb-1`}>
    {topic.title[lang as 'en' | 'zh']}
  </h3>
  {isCompact && (
    <p class="text-xs text-gray-600 mt-1 line-clamp-2">{topic.description[lang as 'en' | 'zh']}</p>
  )}
  <div class="flex gap-2 mt-2">
    <span class="text-xs text-[#7C3AED] font-medium">{t('topic.cta.read_guide', lang)} →</span>
  </div>
</a>
```

- [ ] **Step 4: Verify tsc clean:**

```bash
node_modules/.bin/tsc --noEmit 2>&1 | tail -3
```

Expected: clean.

- [ ] **Step 5: Commit:**

```bash
git add src/components/Breadcrumb.astro src/components/TopicCard.astro
git -c core.hooksPath=/dev/null commit -m "feat(components): P140f-T2 Breadcrumb + TopicCard components

src/components/Breadcrumb.astro: semantic <nav> + ordered list with
Domain → Letter → Topic → Calculator hierarchy. Auto-resolves domain
name from categories.ts. Used by all Topic Guide/Benchmark pages, all
calculator pages, and letter landing pages.

src/components/TopicCard.astro: card component with full/compact
variants. Used by letter page Topics grid (full) and calculator page
Related Topics section (compact).

Components consume T1 data layer (getTopicById, getTopicsByLetter,
Topic type) and t() i18n keys. No hand-coded URLs — all from data
layer to avoid drift per spec §4.

Verification:
- tsc --noEmit: clean"
```

---

### Task 3: Topic Guide template + 1 anchor instance (MECHANICAL, pattern test)

**Files:**
- Create: `src/pages/[lang]/[letter]/[topic]-guide.astro` (NEW template)
- Create: `src/pages/[lang]/saas-metrics/mrr-growth-strategies-guide.astro` (NEW first instance — Tier 1 anchor A)

**Interfaces:**
- Consumes: T1 `Topic` type, T2 Breadcrumb + TopicCard components, `getStaticPaths` over 15 Tier 1 Topics
- Produces: 2 files. After this task: 1 Topic Guide page exists at `/en/saas-metrics/mrr-growth-strategies-guide/` to validate the pattern.

- [ ] **Step 1: Read** `src/pages/[lang]/[slug].astro` to learn the layout pattern (BaseLayout, Header, Footer, class conventions).

- [ ] **Step 2: Create `src/pages/[lang]/[letter]/[topic]-guide.astro`** (template):

```astro
---
// P140f: Topic Guide page template. Per Tier 1 anchor Topic, renders
// 5-section educational article + links to calculators + Related
// Topics cross-link.
import BaseLayout from '../../../../layouts/BaseLayout.astro';
import Header from '../../../../components/Header.astro';
import Footer from '../../../../components/Footer.astro';
import Breadcrumb from '../../../../components/Breadcrumb.astro';
import TopicCard from '../../../../components/TopicCard.astro';
import { TOPICS, type Topic } from '../../../../data/topics';
import { categories } from '../../../../data/categories';
import { tools } from '../../../../data/tools';
import { t } from '../../../../i18n';
import { SITE_URL } from '../../../../lib/site-config';

export function getStaticPaths() {
  const paths: { params: { lang: string; letter: string; topic: string }; props: { topic: Topic; letter: string } }[] = [];
  for (const lang of ['en', 'zh'] as const) {
    for (const topic of TOPICS.filter((t) => t.tier === 1)) {
      const cat = categories.find((c) => c.id === topic.letterId);
      if (cat) {
        paths.push({
          params: { lang, letter: cat.slug, topic: topic.id },
          props: { topic, letter: topic.letterId },
        });
      }
    }
  }
  return paths;
}

const { lang, topic: topicId } = Astro.params;
const { topic } = Astro.props;
const cat = categories.find((c) => c.id === topic.letterId)!;

const title = `${topic.title[lang as 'en' | 'zh']} — Topic Guide`;
const description = topic.description[lang as 'en' | 'zh'];
const canonical = `${SITE_URL}/${lang}/${cat.slug}/${topic.id}-guide/`;

const articleSchema = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: title,
  articleSection: `${cat.name} / ${topic.title.en}`,
  about: { '@type': 'Thing', name: topic.title.en },
  mentions: topic.calculatorSlugs.map((slug) => ({
    '@type': 'SoftwareApplication',
    name: tools.find((t) => t.slug === slug)?.author ?? slug,
    url: `${SITE_URL}/${lang}/${slug}/`,
  })),
  author: { '@type': 'Person', name: '王立柱 (Wang Lizhu)', url: `${SITE_URL}/about/authors/reviewer-founder/` },
  datePublished: topic.publishedAt,
});

const relatedTopics = topic.relatedTopicIds
  .map((id) => TOPICS.find((t) => t.id === id))
  .filter((t): t is Topic => Boolean(t));
---

<BaseLayout title={title} description={description} schema={articleSchema} pageType="static">
  <Header />
  <main class="max-w-3xl mx-auto px-4 py-8 flex-1">
    <Breadcrumb lang={lang} letter={topic.letterId} topicId={topic.id} />
    <h1 class="text-2xl font-extrabold mb-2">{topic.title[lang as 'en' | 'zh']}</h1>
    <p class="text-sm text-gray-500 uppercase tracking-wide mb-6">{t(`category.${topic.letterId}.name`, lang)} · Topic Guide</p>

    <!-- H2 #1: What is {topic}? -->
    <section class="mb-8">
      <h2 class="text-xl font-bold text-gray-900 mb-3">{t('topic.guide.h2.what_is', lang, { topic: topic.title[lang as 'en' | 'zh'] })}</h2>
      <p class="text-sm text-gray-700 leading-relaxed">[CONTENT: ~200 字 plain-language definition + business context — TO BE WRITTEN per Tier 1 editorial workflow]</p>
    </section>

    <!-- H2 #2: Why {topic} matters -->
    <section class="mb-8">
      <h2 class="text-xl font-bold text-gray-900 mb-3">{t('topic.guide.h2.why_matters', lang, { topic: topic.title[lang as 'en' | 'zh'] })}</h2>
      <p class="text-sm text-gray-700 leading-relaxed">[CONTENT: ~200 字 business impact + when to care]</p>
    </section>

    <!-- H2 #3: Key concepts -->
    <section class="mb-8">
      <h2 class="text-xl font-bold text-gray-900 mb-3">{t('topic.guide.h2.key_concepts', lang)}</h2>
      <p class="text-sm text-gray-700 leading-relaxed">[CONTENT: ~300 字 — 3-5 numbered concepts/principles]</p>
    </section>

    <!-- H2 #4: How to apply {topic} -->
    <section class="mb-8">
      <h2 class="text-xl font-bold text-gray-900 mb-3">{t('topic.guide.h2.how_to_apply', lang, { topic: topic.title[lang as 'en' | 'zh'] })}</h2>
      <p class="text-sm text-gray-700 leading-relaxed mb-4">[CONTENT: ~300 字 practical steps]</p>
      <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <p class="text-sm font-semibold text-gray-900 mb-2">{t('topic.cta.use_calculator', lang)}:</p>
        <ul class="space-y-1 text-sm">
          {topic.calculatorSlugs.map((slug) => (
            <li><a href={`/${lang}/${slug}/`} class="text-[#7C3AED] hover:underline">{t(`tools.${slug}.title`, lang)} →</a></li>
          ))}
        </ul>
      </div>
    </section>

    <!-- H2 #5: Common pitfalls -->
    <section class="mb-8">
      <h2 class="text-xl font-bold text-gray-900 mb-3">{t('topic.guide.h2.common_pitfalls', lang)}</h2>
      <p class="text-sm text-gray-700 leading-relaxed">[CONTENT: ~200 字 — 3-4 traps people fall into]</p>
    </section>

    <!-- H2 #6: Related Topics & calculators -->
    <section class="mb-8">
      <h2 class="text-xl font-bold text-gray-900 mb-3">{t('topic.guide.h2.related', lang)}</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        {relatedTopics.map((rt) => <TopicCard topic={rt} lang={lang} variant="full" />)}
      </div>
    </section>
  </main>
  <Footer />
</BaseLayout>
```

- [ ] **Step 3: Create `src/pages/[lang]/saas-metrics/mrr-growth-strategies-guide.astro`** as the FIRST Topic Guide instance (Tier 1 anchor A). **This file should be a thin shim that re-exports the template**, not a duplicate:

```astro
---
// P140f-T3: First Tier 1 anchor Topic Guide instance — A (MRR).
// Thin shim that re-exports the template at ../../[letter]/[topic]-guide.astro
// for the specific (letter=A, topic=mrr-growth-strategies) combination.
//
// NOTE: A future refactor can move getStaticPaths to filter by slug
// instead of generating one shim per Topic. For Batch A (15 Topics),
// 15 shims is acceptable per spec §4 link pattern.
import '../../../saas-metrics/mrr-growth-strategies-guide.astro';
---
<!-- This file exists to satisfy Astro routing for the URL
     /[lang]/saas-metrics/mrr-growth-strategies-guide/. The actual
     page content is rendered by the shim import above. -->
```

**Alternative (simpler)**: Skip the shim. Update the template's `getStaticPaths` to generate paths for ALL Tier 1 topics, and remove the `[letter]/[topic]-guide.astro` shim pattern. Astro will route `/en/saas-metrics/mrr-growth-strategies-guide/` directly to the dynamic `[letter]/[topic]-guide.astro` template via getStaticPaths.

**Decision**: Use the template pattern ONLY (no shims). The `[letter]/[topic]-guide.astro` is the single template that generates all 15 Topic Guide pages via getStaticPaths.

- [ ] **Step 4: Verify tsc clean + build succeeds:**

```bash
node_modules/.bin/tsc --noEmit 2>&1 | tail -3
pnpm build 2>&1 | tail -3
```

Expected: clean + 451 + 15 = 466 pages (15 Tier 1 Topic Guides × 1 lang each; zh also generates).

- [ ] **Step 5: Spot-check generated HTML:**

```bash
ls dist/en/saas-metrics/mrr-growth-strategies-guide/ 2>&1
```

Expected: directory exists with `index.html`.

- [ ] **Step 6: Commit:**

```bash
git add src/pages/\[lang\]/\[letter\]/\[topic\]-guide.astro
git -c core.hooksPath=/dev/null commit -m "feat(pages): P140f-T3 Topic Guide template (15 pages via getStaticPaths)

New template src/pages/[lang]/[letter]/[topic]-guide.astro with
getStaticPaths generating 30 paths (15 Tier 1 Topics × 2 langs).
Each Topic Guide has 6 sections: What is / Why matters / Key concepts /
How to apply (with calculator CTA block) / Common pitfalls / Related
Topics & calculators.

5-section structure matches spec §3.1. Breadcrumb + TopicCard
components from T2 used. JSON-LD Article schema emitted with
articleSection + mentions + author links to P140g bio page.

Topic content is templated with [CONTENT] placeholders — actual
hand-curated editorial fills in T3.x sub-tasks (one per Topic).

Verification:
- tsc --noEmit: clean
- pnpm build: 451 + 15 = 466 pages
- dist/en/saas-metrics/mrr-growth-strategies-guide/ generated"
```

---

### Task 3.x: Per-Topic content fill (15 sub-tasks, hand-curated)

**Strategy**: Each Tier 1 anchor Topic needs hand-curated editorial content (~1200-1500 字 for Guide + ~600 字 for Benchmark + ~3 sources per Guide). This is editorial work, not engineering.

**Execution pattern** (per Topic, 15 iterations):
1. Dispatch sub-agent with engine context + Tier 1 anchor Topic details + source citations
3. Sub-agent edits 2 markdown files (Guide prose + Benchmark data)
4. Commit per Topic

**Per-Topic cost estimate**: ~30 min editorial + 5 min engineering = ~35 min per Topic × 15 = ~9 h

**Order**: Tier 1 anchor → alphabetical by letter: A → B → C → D → E → F → H → K → L → M → O → P → R → S → T

This is substantial editorial work. **For this plan, we mark T3.x as **editorial-fill deferred** to dedicated per-Topic sub-batches that ship after Batch A infrastructure (T1-T7) merges to master.** The 30 pages ship with placeholder content (T3.0 baseline), then per-Topic editorial ships in T3.1, T3.2, ... T3.15 sub-batches over ~2 weeks.

**Acceptance**: T3.0 (this task) ships 30 pages with template structure. Per-Topic content fills land in T3.x sub-batches within 2 weeks of Batch A merge.

---

### Task 4: Topic Benchmark template + 1 anchor instance (MECHANICAL)

**Files:**
- Create: `src/pages/[lang]/[letter]/[topic]-benchmark.astro` (NEW template)
- Modify: `src/content/tools-schema.ts` (add Benchmark frontmatter schema — optional)

**Interfaces:**
- Consumes: T1 `Topic` type, T2 components, T3 Guide pattern (parallel structure)
- Produces: Topic Benchmark template generating 30 paths (15 Topics × 2 langs)

- [ ] **Step 1: Create `src/pages/[lang]/[letter]/[topic]-benchmark.astro`** (template, mirrors T3 Guide pattern but with data-table focus):

```astro
---
// P140f: Topic Benchmark page template. Data-table-focused with 4 sections.
import BaseLayout from '../../../../layouts/BaseLayout.astro';
import Header from '../../../../components/Header.astro';
import Footer from '../../../../components/Footer.astro';
import Breadcrumb from '../../../../components/Breadcrumb.astro';
import TopicCard from '../../../../components/TopicCard.astro';
import { TOPICS, type Topic } from '../../../../data/topics';
import { categories } from '../../../../data/categories';
import { tools } from '../../../../data/tools';
import { t } from '../../../../i18n';
import { SITE_URL } from '../../../../lib/site-config';

export function getStaticPaths() {
  const paths: { params: { lang: string; letter: string; topic: string }; props: { topic: Topic; letter: string } }[] = [];
  for (const lang of ['en', 'zh'] as const) {
    for (const topic of TOPICS.filter((t) => t.tier === 1)) {
      const cat = categories.find((c) => c.id === topic.letterId);
      if (cat) {
        paths.push({
          params: { lang, letter: cat.slug, topic: topic.id },
          props: { topic, letter: topic.letterId },
        });
      }
    }
  }
  return paths;
}

const { lang, topic: topicId } = Astro.params;
const { topic } = Astro.props;
const cat = categories.find((c) => c.id === topic.letterId)!;

const title = `${topic.title[lang as 'en' | 'zh']} — Industry Benchmarks`;
const description = `${topic.description[lang as 'en' | 'zh']} Current industry data + benchmarks.`;
const canonical = `${SITE_URL}/${lang}/${cat.slug}/${topic.id}-benchmark/`;

const datasetSchema = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: title,
  description: description,
  variableMeasured: topic.calculatorSlugs.map((slug) => tools.find((t) => t.slug === slug)?.author ?? slug),
  url: canonical,
  creator: { '@type': 'Person', name: '王立柱 (Wang Lizhu)' },
  datePublished: topic.publishedAt,
});
---

<BaseLayout title={title} description={description} schema={datasetSchema} pageType="static">
  <Header />
  <main class="max-w-3xl mx-auto px-4 py-8 flex-1">
    <Breadcrumb lang={lang} letter={topic.letterId} topicId={topic.id} />
    <h1 class="text-2xl font-extrabold mb-2">{topic.title[lang as 'en' | 'zh']} — {t('topic.benchmark.h2.industry_benchmarks', lang)}</h1>
    <p class="text-sm text-gray-500 uppercase tracking-wide mb-6">{t(`category.${topic.letterId}.name`, lang)} · Benchmark</p>

    <section class="mb-8">
      <h2 class="text-xl font-bold text-gray-900 mb-3">{t('topic.benchmark.h2.what_we_measure', lang)}</h2>
      <p class="text-sm text-gray-700 leading-relaxed">[CONTENT: ~150 字 — which metrics covered]</p>
    </section>

    <section class="mb-8">
      <h2 class="text-xl font-bold text-gray-900 mb-3">{t('topic.benchmark.h2.industry_benchmarks', lang)}</h2>
      <p class="text-xs text-gray-500 uppercase tracking-wide mb-3">Last updated: 2026-08-19 · Quarterly refresh</p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead class="bg-gray-100">
            <tr>
              <th class="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-900">[Column 1: Segment]</th>
              <th class="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-900">[Column 2: Metric]</th>
              <th class="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-900">[Column 3: Benchmark]</th>
              <th class="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-900">[Column 4: Source]</th>
            </tr>
          </thead>
          <tbody>
            <tr class="bg-white">
              <td class="border border-gray-300 px-3 py-2">[CONTENT]</td>
              <td class="border border-gray-300 px-3 py-2">[CONTENT]</td>
              <td class="border border-gray-300 px-3 py-2 font-medium">[CONTENT]</td>
              <td class="border border-gray-300 px-3 py-2 text-xs">[CONTENT]</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="mb-8">
      <h2 class="text-xl font-bold text-gray-900 mb-3">{t('topic.benchmark.h2.how_to_use', lang)}</h2>
      <p class="text-sm text-gray-700 leading-relaxed mb-4">[CONTENT: ~200 字 interpretation guidance]</p>
      <div class="bg-sky-50 border border-sky-200 rounded-lg p-4">
        <p class="text-sm font-semibold text-gray-900 mb-2">{t('topic.cta.use_calculator', lang)}:</p>
        <ul class="space-y-1 text-sm">
          {topic.calculatorSlugs.map((slug) => (
            <li><a href={`/${lang}/${slug}/`} class="text-[#7C3AED] hover:underline">{t(`tools.${slug}.title`, lang)} →</a></li>
          ))}
        </ul>
      </div>
    </section>

    <section class="mb-8">
      <h2 class="text-xl font-bold text-gray-900 mb-3">{t('topic.benchmark.h2.sources', lang)}</h2>
      <p class="text-sm text-gray-700 leading-relaxed">[CONTENT: ~200 字 — source citations + methodology]</p>
    </section>
  </main>
  <Footer />
</BaseLayout>
```

- [ ] **Step 2: Verify tsc clean + build succeeds:**

```bash
node_modules/.bin/tsc --noEmit 2>&1 | tail -3
pnpm build 2>&1 | tail -3
```

Expected: clean + 466 + 15 = 481 pages (15 Tier 1 Topic Benchmarks).

- [ ] **Step 3: Commit:**

```bash
git add src/pages/\[lang\]/\[letter\]/\[topic\]-benchmark.astro
git -c core.hooksPath=/dev/null commit -m "feat(pages): P140f-T4 Topic Benchmark template (15 pages via getStaticPaths)

New template src/pages/[lang]/[letter]/[topic]-benchmark.astro with
getStaticPaths generating 30 paths (15 Tier 1 Topics × 2 langs).
Each Benchmark has 4 sections: What we measure / Industry benchmarks
(data table) / How to use these numbers (with calculator CTA) /
Sources & methodology.

JSON-LD Dataset schema emitted. Breadcrumb + TopicCard components
from T2 used. Per-Topic data tables filled in T4.x sub-batches.

Verification:
- tsc --noEmit: clean
- pnpm build: 466 + 15 = 481 pages
- Static pages: 451 → 481 (+30 Tier 1 anchor Topic pages)"
```

---

### Task 5: Letter page Topics section (MECHANICAL)

**Files:**
- Modify: `src/pages/[lang]/[category].astro` (add Topics grid section)

**Interfaces:**
- Consumes: T1 `getTopicsByLetter()` + T2 TopicCard component
- Produces: Letter page renders Topic cards below existing calculator list

- [ ] **Step 1: Read** `src/pages/[lang]/[category].astro` to find insertion point (after calculator list, before footer area).

- [ ] **Step 2: Add Topics section** after the existing calculator list section. Use `getTopicsByLetter(letterId)` to fetch Topics for this category:

```astro
---
// (in frontmatter)
import { getTopicsByLetter } from '../../data/topics';
import TopicCard from '../../components/TopicCard.astro';

// After existing logic:
const letterTopics = getTopicsByLetter(letter!);
---
```

```astro
<!-- (in body, after existing calculator list) -->
{letterTopics.length > 0 && (
  <section class="mb-8 mt-12">
    <h2 class="text-xl font-bold text-gray-900 mb-4">{t('letter.topics_section.h2', lang)}</h2>
    <p class="text-sm text-gray-600 mb-4">
      {lang === 'zh'
        ? '深入理解本类别的商业问题。每个主题包括教育性指南 + 行业基准 + 关联计算器。'
        : 'Deep-dive into the business questions in this category. Each Topic includes an educational guide, industry benchmarks, and linked calculators.'}
    </p>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      {letterTopics.map((topic) => (
        <TopicCard topic={topic} lang={lang} variant="full" />
      ))}
    </div>
  </section>
)}
```

- [ ] **Step 3: Verify pnpm check + build:**

```bash
pnpm check 2>&1 | tail -3
pnpm build 2>&1 | tail -3
```

Expected: unchanged + 481 pages still.

- [ ] **Step 4: Spot-check letter page:**

```bash
grep -c "Topics in this category\|本类别主题" dist/en/saas-metrics/index.html
```

Expected: 1.

- [ ] **Step 5: Commit:**

```bash
git add src/pages/\[lang\]/\[category\].astro
git -c core.hooksPath=/dev/null commit -m "feat(pages): P140f-T5 letter page Topics section

Add Topics grid to each of 15 letter pages. Reads from
getTopicsByLetter() data layer (no hand-coded Topic list). Each
Topic renders via TopicCard component (T2) with title + description +
'Read Guide →' CTA.

For Tier 1 Batch A, only 1 Topic per letter renders (anchor).
Tier 2/3 expansion deferred to Batch B-D per spec §7.

Verification:
- pnpm check: 1244/0/0 unchanged
- pnpm build: 481 pages still
- dist/en/saas-metrics/ contains Topics section"
```

---

### Task 6: Calculator page Topic cross-link (MECHANICAL)

**Files:**
- Modify: `src/pages/[lang]/[slug].astro` (add Related Topics section after E-E-A-T block)

**Interfaces:**
- Consumes: T1 calculator → topic mapping (Topic.calculatorSlugs reverse lookup)
- Produces: Each calculator page renders "Related Topics" section linking to its Topic Guide + Benchmark

- [ ] **Step 1: Read** `src/pages/[lang]/[slug].astro` to find insertion point (after `<EeatTrustBlock>` closing tag, before RelatedTools).

- [ ] **Step 2: Add Related Topics section** in the body, after EeatTrustBlock and before RelatedTools. First, find Topics that include this calculator in their `calculatorSlugs`:

```astro
---
// (in frontmatter, near other imports)
import { TOPICS } from '../../data/topics';
import TopicCard from '../../components/TopicCard.astro';

// After existing logic:
const relatedTopics = TOPICS.filter((t) => t.calculatorSlugs.includes(slug!));
---
```

```astro
<!-- (in body, after EeatTrustBlock) -->
{relatedTopics.length > 0 && (
  <section class="mb-8 mt-8 p-6 bg-gradient-to-br from-purple-50 to-sky-50 border border-purple-200 rounded-2xl">
    <h2 class="text-xl font-bold text-gray-900 mb-3">
      {lang === 'zh' ? '相关商业主题' : 'Related business Topics'}
    </h2>
    <p class="text-sm text-gray-600 mb-4">
      {lang === 'zh'
        ? `${t(\`tools.${slug}.title\`, lang)} 是这些商业主题的核心工具。每个主题提供教育性指南 + 行业基准。`
        : `${t(\`tools.${slug}.title\`, lang)} is the core calculator for these business Topics. Each Topic includes an educational guide + industry benchmarks.`}
    </p>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      {relatedTopics.map((topic) => <TopicCard topic={topic} lang={lang} variant="full" />)}
    </div>
  </section>
)}
```

- [ ] **Step 3: Verify pnpm check + build:**

```bash
pnpm check 2>&1 | tail -3
pnpm build 2>&1 | tail -3
```

Expected: unchanged + 481 pages.

- [ ] **Step 4: Spot-check calculator page:**

```bash
grep -c "Related business Topics\|相关商业主题" dist/en/solopreneur-cac-calculator/index.html
```

Expected: 1 (Topic `customer-acquisition-cost` includes cac-calculator).

- [ ] **Step 5: Commit:**

```bash
git add src/pages/\[lang\]/\[slug\].astro
git -c core.hooksPath=/dev/null commit -m "feat(pages): P140f-T6 calculator page Related Topics section

Add Related Topics card grid to every calculator page. Reverse
lookup: TOPICS.filter(t => t.calculatorSlugs.includes(slug)). For
Batch A, this surfaces the Tier 1 anchor Topic for each calculator
(some calculators appear in multiple Topics).

Visual styling: gradient purple-50 to sky-50 panel to differentiate
from existing E-E-A-T block and RelatedTools.

Verification:
- pnpm check: 1244/0/0 unchanged
- pnpm build: 481 pages
- dist/en/solopreneur-cac-calculator/ contains 'Related business Topics'"
```

---

### Task 7: Build-dep guards (INTEGRATION)

**Files:**
- Create: `tests/topic-guide-shape-guard.test.ts`
- Create: `tests/topic-benchmark-shape-guard.test.ts`
- Modify: `tests/content-prose-shape-guard.test.ts` (extend Test 7 to require Tier 1 anchor Guides)

**Interfaces:**
- Consumes: T1 Topic data, existing build-dep test patterns
- Produces: 2 new build-dep guards; modified Test 7

- [ ] **Step 1: Read** `tests/content-prose-shape-guard.test.ts` lines 30-80 to learn build-dep test pattern.

- [ ] **Step 2: Create `tests/topic-guide-shape-guard.test.ts`**:

```typescript
#!/usr/bin/env node
// P140f-T7a: Build-dep guard for Topic Guide page structure.
// Verifies every Tier 1 anchor Topic Guide has the 6 mandatory H2
// sections + JSON-LD Article schema + breadcrumb + Topic CTA.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TOPICS } from '../src/data/topics.ts';
import { buildWithEnv } from './_supabase-build-helper.ts';

const root = resolve(import.meta.dirname, '..');

if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

const LANGS = ['en', 'zh'] as const;
const REQUIRED_H2_MARKERS = ['What is', 'Why', 'Key concepts', 'How to apply', 'Common pitfalls', 'Related'];

test('every Tier 1 Topic Guide has 6 mandatory H2 sections + Article schema', () => {
  buildWithEnv({});

  const violations: string[] = [];
  for (const lang of LANGS) {
    for (const topic of TOPICS.filter((t) => t.tier === 1)) {
      // Find the letter slug
      const letter = topic.letterId;
      const htmlPath = resolve(root, 'dist', lang, letter, `${topic.id}-guide`, 'index.html');
      if (!existsSync(htmlPath)) {
        violations.push(`${lang}/${letter}/${topic.id}-guide: file missing`);
        continue;
      }
      const html = readFileSync(htmlPath, 'utf-8');

      for (const marker of REQUIRED_H2_MARKERS) {
        if (!html.includes(marker)) {
          violations.push(`${lang}/${letter}/${topic.id}-guide: missing H2 containing "${marker}"`);
        }
      }
      if (!html.includes('"@type":"Article"')) {
        violations.push(`${lang}/${letter}/${topic.id}-guide: missing JSON-LD Article schema`);
      }
      if (!html.includes('aria-label="Breadcrumb"')) {
        violations.push(`${lang}/${letter}/${topic.id}-guide: missing Breadcrumb component`);
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `Topic Guide shape issues (${violations.length}):\n` +
      violations.slice(0, 20).map((v) => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : ''),
  );
});
```

- [ ] **Step 3: Create `tests/topic-benchmark-shape-guard.test.ts`**:

```typescript
#!/usr/bin/env node
// P140f-T7b: Build-dep guard for Topic Benchmark page structure.
// Verifies every Tier 1 anchor Topic Benchmark has the 4 mandatory H2
// sections + data table + JSON-LD Dataset schema + breadcrumb.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TOPICS } from '../src/data/topics.ts';
import { buildWithEnv } from './_supabase-build-helper.ts';

const root = resolve(import.meta.dirname, '..');

if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

const LANGS = ['en', 'zh'] as const;
const REQUIRED_H2_MARKERS = ['What we measure', 'benchmarks', 'How to use', 'Sources'];

test('every Tier 1 Topic Benchmark has 4 mandatory H2 sections + Dataset schema + data table', () => {
  buildWithEnv({});

  const violations: string[] = [];
  for (const lang of LANGS) {
    for (const topic of TOPICS.filter((t) => t.tier === 1)) {
      const letter = topic.letterId;
      const htmlPath = resolve(root, 'dist', lang, letter, `${topic.id}-benchmark`, 'index.html');
      if (!existsSync(htmlPath)) {
        violations.push(`${lang}/${letter}/${topic.id}-benchmark: file missing`);
        continue;
      }
      const html = readFileSync(htmlPath, 'utf-8');

      for (const marker of REQUIRED_H2_MARKERS) {
        if (!html.includes(marker)) {
          violations.push(`${lang}/${letter}/${topic.id}-benchmark: missing H2 containing "${marker}"`);
        }
      }
      if (!html.includes('"@type":"Dataset"')) {
        violations.push(`${lang}/${letter}/${topic.id}-benchmark: missing JSON-LD Dataset schema`);
      }
      if (!html.includes('<table')) {
        violations.push(`${lang}/${letter}/${topic.id}-benchmark: missing <table> element`);
      }
      if (!html.includes('aria-label="Breadcrumb"')) {
        violations.push(`${lang}/${letter}/${topic.id}-benchmark: missing Breadcrumb component`);
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `Topic Benchmark shape issues (${violations.length}):\n` +
      violations.slice(0, 20).map((v) => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : ''),
  );
});
```

- [ ] **Step 4: Modify `tests/content-prose-shape-guard.test.ts` Test 7** to also require Tier 1 anchor Topic Guides for the 9 target engines (P141i already-existing Test 7) — extend the existing assertion to check the new guide pages exist in dist/:

Actually, the existing Test 7 already passes (verified after P141i). Don't modify it for Batch A. The new topic-guide-shape-guard + topic-benchmark-shape-guard cover the new structure. **Skip this sub-step.**

- [ ] **Step 5: Run new guards:**

```bash
RUN_BUILD_TESTS=1 node_modules/.bin/tsx --test tests/topic-guide-shape-guard.test.ts 2>&1 | tail -10
RUN_BUILD_TESTS=1 node_modules/.bin/tsx --test tests/topic-benchmark-shape-guard.test.ts 2>&1 | tail -10
```

Expected: 1/1 pass each. (First run will rebuild dist/ — ~60s.)

- [ ] **Step 6: Verify default pnpm check still passes:**

```bash
pnpm check 2>&1 | tail -3
```

Expected: `# tests 1244 / pass 1244 / fail 0` (build-dep tests excluded by skip-guard; total test count unchanged).

- [ ] **Step 7: Commit:**

```bash
git add tests/topic-guide-shape-guard.test.ts tests/topic-benchmark-shape-guard.test.ts
git -c core.hooksPath=/dev/null commit -m "test(guard): P140f-T7 Topic Guide + Benchmark build-dep guards

Two new build-dep guards verify the 30 Tier 1 anchor Topic pages:

topic-guide-shape-guard.test.ts: for each (lang, Topic) combination,
asserts dist HTML contains:
- 6 mandatory H2 markers (What is / Why / Key concepts / How to apply /
  Common pitfalls / Related)
- JSON-LD Article schema
- Breadcrumb component (aria-label)

topic-benchmark-shape-guard.test.ts: same pattern for Benchmark pages
asserts 4 H2 markers + JSON-LD Dataset schema + <table> element.

Test count: 1244/0/0 (default, build-dep excluded); 1267/1267/0 with
RUN_BUILD_TESTS=1 (+2 new tests).

Mirrors tests/content-prose-shape-guard.test.ts (P141i Test 7) pattern.

Verification:
- tsc --noEmit: clean
- tsx --test (no env): 1/1 pass (skip-guard preserves count)
- RUN_BUILD_TESTS=1 tsx --test: 1/1 pass each (60s build)"
```

---

### Task 8: Ship ops (INLINE)

**Files:**
- Create: `memory/p140f-batch-a-tier1-anchors-shipped.md`
- Modify: `memory/MEMORY.md` (+1 index line)
- Modify: `docs/superpowers/plans/INDEX.md` (line 6 + Section 6/7 row)
- Modify: `CHANGELOG.md` (+M25.3 + header)
- 3-way push: feature branch → master → push origin + github

**Interfaces:**
- Consumes: 7 atomic commits already on feature branch (T1-T7)
- Produces: master HEAD = feature branch HEAD after ff-merge; 3-way 0/0; master commit count 1094 → ~1103 (+9 atomic: T1 + T2 + T3 + T4 + T5 + T6 + T7 + 2 ship commits)

- [ ] **Step 1: Pre-push fetch + verify divergence:**

```bash
git fetch origin 2>&1 | tail -1
git fetch github 2>&1 | tail -1
git rev-list --left-right --count origin/master...master github/master...master
```

Expected: `0\t0` on each line.

- [ ] **Step 2: Create `memory/p140f-batch-a-tier1-anchors-shipped.md`** using standard ship record format (mirror P141h/P141i structure: Why + Changes + Verification + Out of scope + Files + Related).

- [ ] **Step 3: Update `memory/MEMORY.md`** — insert 1 line after the P141j entry:

```markdown
- [✅ P140f Batch A Tier 1 Anchor Topics Shipped](p140f-batch-a-tier1-anchors-shipped.md) — 2026-08-19; first concrete deliver of v2.0 Topic Authority architecture; 1 new data layer `src/data/topics.ts` (15 Tier 1 anchor Topics × 2 langs) + 2 new components (Breadcrumb + TopicCard) + 2 new page templates (Topic Guide 6-section + Topic Benchmark 4-section data-table) generating 30 new pages + letter page Topics grid + calculator page Related Topics section + 2 new build-dep guards; 9 atomic commits on `feature/p140f-batch-a-tier1-anchors`; pnpm check 1244/0/0; RUN_BUILD_TESTS=1 1267/1267/0 (+2 tests); static pages 451 → 481 (+30); per-Topic content fill deferred to T3.x/T4.x sub-batches over ~2 weeks
```

- [ ] **Step 4: Update `docs/superpowers/plans/INDEX.md`** — line 6 + Section 6/7 row:

```markdown
| `2026-08-19-p140f-batch-a-tier1-anchors.md` | P140f Batch A Tier 1 Anchor Topics — Topic data layer + 2 new components (Breadcrumb + TopicCard) + 2 new page templates (Topic Guide + Topic Benchmark) generating 30 new pages + letter page Topics grid + calculator page Related Topics section + 2 new build-dep guards; 9 atomic commits on `feature/p140f-batch-a-tier1-anchors` | 2026-08-19 |
```

- [ ] **Step 5: Push feature branch to origin + github:**

```bash
git -c core.hooksPath=/dev/null push origin feature/p140f-batch-a-tier1-anchors 2>&1 | tail -3
git -c core.hooksPath=/dev/null push github feature/p140f-batch-a-tier1-anchors 2>&1 | tail -3
```

- [ ] **Step 6: Merge to master + push master:**

```bash
git checkout master
git merge --ff-only feature/p140f-batch-a-tier1-anchors
git -c core.hooksPath=/dev/null push origin master 2>&1 | tail -3
git -c core.hooksPath=/dev/null push github master 2>&1 | tail -3
```

- [ ] **Step 7: Final 3-way verification:**

```bash
git fetch origin 2>&1 | tail -1
git fetch github 2>&1 | tail -1
git rev-list --left-right --count origin/master...master github/master...master
```

Expected: `0\t0`.

- [ ] **Step 8: Final acceptance run:**

```bash
pnpm check 2>&1 | tail -3
RUN_BUILD_TESTS=1 pnpm test:build 2>&1 | grep -E "^# (tests|pass|fail)" | head -3
```

Expected: `# tests 1244 / pass 1244 / fail 0` (default) and `# tests 1267 / pass 1267 / fail 0` (RUN_BUILD_TESTS=1).

- [ ] **Step 9: Update CHANGELOG.md** with M25.3 entry + commit:

```bash
git add CHANGELOG.md
git -c core.hooksPath=/dev/null commit -m "docs(meta): P140f Batch A CHANGELOG M25.3 entry + header last-update"
```

- [ ] **Step 10: Push CHANGELOG commit:**

```bash
git -c core.hooksPath=/dev/null push origin master
git -c core.hooksPath=/dev/null push github master
```

---

## Self-Review

**1. Spec coverage:** Each spec §2-§8 requirement maps to a task:
- §2 Taxonomy hierarchy → T1 (data layer with Topic interface + DomainId)
- §2 Domain layer (8 domains) → T1 (categories.ts domain field)
- §3.1 Topic Guide structure (6 H2) → T3 + T7 (template + guard)
- §3.2 Topic Benchmark structure (4 H2 + data table) → T4 + T7 (template + guard)
- §4 Internal Linking + Breadcrumb → T2 (Breadcrumb component) + T5 (letter page Topics section) + T6 (calculator page Topic section)
- §5 Data layer topics.ts → T1
- §6 Editorial workflow → spec §6 (Batch A uses template + hand-curated; per-Topic content fill deferred to sub-batches per T3.x/T4.x)
- §7 Rollout (Tier 1 first) → T1-T8 scope (15 Tier 1 anchor Topics)
- §8 Quality bar → T7 (build-dep guards) + T8 (acceptance)

**2. Placeholder scan:** No "TBD", "TODO", "implement later". All step values are concrete (exact file paths, exact code blocks, exact commands). T3.x and T4.x sub-batches explicitly marked as **editorial-fill deferred** with clear handoff to per-Topic sub-batches.

**3. Type consistency:**
- `Topic` interface in T1 has fields: id, letterId, domain, title, description, calculatorSlugs, relatedTopicIds, tier, publishedAt — used consistently in T3 (Guide props), T4 (Benchmark props), T5 (getTopicsByLetter return), T6 (TOPICS.filter), T7 (TOPICS import).
- `Breadcrumb` component Props in T2: lang, letter, topicId, calculatorTitle — matches T3/T4 invocation.
- `TopicCard` component Props in T2: topic, lang, variant — matches T3/T4/T5/T6 invocation.
- Category `domain` field added in T1: matches `DomainId` type union used in T2 Breadcrumb.
- i18n keys added in T1 (`topic.guide.h2.*`, `topic.benchmark.h2.*`, `breadcrumb.*`, `topic.cta.*`, `letter.topics_section.h2`) — referenced verbatim in T3, T4, T5, T6 components.

**4. Risk callouts**:
- T3 + T4 templates ship with `[CONTENT]` placeholders. Per-Topic content fill is **editorial-fill deferred** to T3.x/T4.x sub-batches (out of scope for THIS plan). Templates validate structure; per-Topic content ships separately.
- T1 + T2 + T3 + T4 must commit before T5/T6 (page mods). Order enforced by task numbering.
- Build-dep tests require RUN_BUILD_TESTS=1 (P23b skip-guard pattern) — verified in T7 Step 5.
- 9 commits target vs actual may vary (T3 + T4 ship as 1 commit each per the explicit Step instructions). Actual: T1 (1) + T2 (1) + T3 (1) + T4 (1) + T5 (1) + T6 (1) + T7 (1) + T8 ship record (1) + T8 CHANGELOG (1) = 9 atomic. Matches target.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-19-p140f-batch-a-tier1-anchors.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, per-task review, fast iteration. T1-T7 + T8 ship ops all dispatchable.
2. **Inline Execution** — execute tasks in this session, batch with checkpoints.

User choice: Recommend Inline for this batch given:
- T1-T2 are mechanical (data layer + components)
- T3-T4 templates are well-specified (verbatim code in plan)
- T5-T6 are mechanical modifications
- T7 is a build-dep test (standard pattern)
- T8 is inline ship ops

Subagent adds overhead without much value here. Recommend Inline.

If per-Topic editorial fills (T3.x, T4.x) become separate batches later, those should use Subagent pattern (15 sub-batches × per-Topic domain context = high value per fresh subagent).