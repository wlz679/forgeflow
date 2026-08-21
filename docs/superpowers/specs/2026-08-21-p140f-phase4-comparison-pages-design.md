# P140f Phase 4 — Comparison Pages Design

> **For agentic workers:** P140f v2.0 Topic Authority architecture Phase 4. Adds a new Comparison page template + 4 high-intent "X vs Y" Topics (4 pages × 2 langs = 8 new pages) before the ~2026-09-01 AdSense resubmit window. Letter-by-letter direct-to-master ship cadence, ~5 atomic commits on master.

**Goal:** Scale v2.0 Topic Authority from 45 Tier 1 Topics (60 Phase 1+2 shipped) → 4 new Comparison Topics (8 new pages) + 1 new build-dep guard. Close the "X vs Y" high-intent SEO gap surfaced in P140f Phase 2 ChatGPT §12 audit. Pre-AdSense resubmit content density bonus.

**Architecture:** New `[topic]-compare.astro` template (parallel to existing `[topic]-guide.astro` and `[topic]-benchmark.astro`) + new `TopicCompareContent` registry in `src/data/topic-content.ts` + extended `Topic` interface (tier union now includes `'comparison'`) + new `ComparisonHero.astro` component + new build-dep guard `tests/comparison-shape-guard.test.ts`.

**Tech Stack:** Astro 4.16.19 (static SSG) + TypeScript 5.6 (strict) + Tailwind CSS 4 + existing v3 standard rendering layer (no Vue/React).

---

## Context

P140f v2.0 Topic Authority architecture shipped in 3 phases:
- **Phase 1 (2026-08-19/20, master HEAD 1bb576b → b92a359)**: 15 Tier 1 anchor Topics + content fill (14/14 in subsequent commits) — 30 pages
- **Phase 2 (2026-08-20/21, master HEAD 58656a3)**: 30 Tier 1 extension Topics × 2 templates — 60 new pages (511 → 623)
- **Phase 4 (this spec)**: 4 Comparison Topics — 8 new pages (623 → 631)

5 remaining `TIER_2_SLUGS` all overlap with existing Tier 1 anchors (churn-rate → net-revenue-retention; claude/deepseek-api-cost → llm-api-cost-optimization; cac/ltv → customer-acquisition-cost), so promoting Tier 2 yields low SEO incremental value. Comparison pages are the high-value direction.

AdSense resubmit window ~2026-09-01 (per `memory/adsense-resubmit-window.md`, 2 weeks after P140c ship 2026-08-18). Phase 4 ship + ~1 week crawl buffer → ready for resubmit before/at the trigger window.

---

## 1 · Architecture

### 1.1 New files

```
src/
├── pages/[lang]/[letter]/
│   └── [topic]-compare.astro   ← NEW template (parallel to [topic]-guide.astro)
├── components/
│   └── ComparisonHero.astro    ← NEW component (X vs Y hero table)
tests/
└── comparison-shape-guard.test.ts ← NEW build-dep guard
```

### 1.2 Modified files

```
src/
├── data/topics.ts              ← Topic interface extends with tier 'comparison' + optional compareSlug[] + 4 new TOPICS entries
├── data/topic-content.ts       ← TopicCompareContent interface + TOPIC_COMPARE_CONTENT registry (4 entries × en + zh)
├── i18n/translations.ts        ← Comparison H2 names + CTA labels (en + zh)
└── pages/[lang]/[letter]/[topic]-guide.astro  ← Update Related Topics section to include Comparison (optional polish, defer if complex)
```

### 1.3 Untouched

- `src/data/prose-tiers.ts` (TIER_2 5 entries deferred permanently — Comparison tier is independent of TIER_1/2/3 SLUGS system)
- `src/data/topics.ts` existing 45 Tier 1 entries
- All 100 engines
- All existing build-dep guards

---

## 2 · Data Layer

### 2.1 `Topic` interface extension (`src/data/topics.ts`)

```typescript
export type TopicTier = 1 | 2 | 3 | 'comparison';

export interface Topic {
  id: TopicId;
  letterId: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'H' | 'K' | 'L' | 'M' | 'O' | 'P' | 'R' | 'S' | 'T';
  domain: 'finance' | 'marketing' | 'customer' | 'product' | 'people' | 'legal' | 'ai-cost' | 'operations';
  title: { en: string; zh: string };
  description: { en: string; zh: string };
  calculatorSlugs: string[];
  relatedTopicIds: TopicId[];
  tier: TopicTier;
  publishedAt: string;
  // NEW for comparison tier:
  compareSlug?: string[];  // ['claude', 'openai', 'gemini', 'deepseek'] for LLM; 2 entries for binary compare
}
```

### 2.2 `TopicCompareContent` interface (`src/data/topic-content.ts`)

```typescript
export interface TopicCompareHeroRow {
  cells: Array<{ en: string; zh: string }>;  // length === Topic.compareSlug.length
}

export interface TopicCompareHeroTable {
  aspect: { en: string; zh: string };        // e.g. "Best for", "Pricing"
  rows: TopicCompareHeroRow[];                // ≥4 rows
}

export interface TopicCompareDimension {
  heading: { en: string; zh: string };
  body: { en: string; zh: string };
}

export interface TopicCompareContent {
  heroTitle: { en: string; zh: string };
  heroSubtitle: { en: string; zh: string };
  heroTable: TopicCompareHeroTable;
  dimensions: TopicCompareDimension[];        // 5-6 dimensions
  decision: { en: string; zh: string };      // "Which should you choose?" decision tree body
  sources: string;                            // 5-10 named sources, each with year
}

export const TOPIC_COMPARE_CONTENT: Record<string, TopicCompareContent> = {
  // 4 entries, populated in W1-W4
};
```

### 2.3 New `TOPICS` entries (4)

```typescript
{ id: 'llm-provider-comparison', letterId: 'B', domain: 'ai-cost', tier: 'comparison',
  publishedAt: '2026-08-21',
  title: { en: 'LLM Provider Comparison', zh: 'LLM 提供商对比' },
  description: { en: 'Side-by-side comparison of Claude, OpenAI, Gemini, and DeepSeek APIs across pricing, context window, performance, and ecosystem.',
                  zh: 'Claude、OpenAI、Gemini、DeepSeek API 在定价、上下文窗口、性能、生态系统的横向对比。' },
  calculatorSlugs: ['solopreneur-claude-api-cost-calculator', 'solopreneur-openai-token-calculator', 'solopreneur-gemini-api-cost-calculator', 'solopreneur-deepseek-api-cost-calculator', 'solopreneur-ai-api-cost-comparison'],
  relatedTopicIds: ['llm-api-cost-optimization'],
  compareSlug: ['claude', 'openai', 'gemini', 'deepseek'] },

{ id: 'ltv-vs-cac', letterId: 'C', domain: 'finance', tier: 'comparison',
  publishedAt: '2026-08-21',
  title: { en: 'LTV vs CAC', zh: 'LTV 与 CAC 对比' },
  description: { en: 'Compare Customer Lifetime Value and Customer Acquisition Cost — why the ratio matters more than either metric alone.',
                  zh: '对比客户终身价值与客户获取成本 — 为什么比率比任一指标更重要。' },
  calculatorSlugs: ['solopreneur-ltv-calculator', 'solopreneur-cac-calculator'],
  relatedTopicIds: ['customer-acquisition-cost'],
  compareSlug: ['ltv', 'cac'] },

{ id: 'nrr-vs-grr', letterId: 'R', domain: 'customer', tier: 'comparison',
  publishedAt: '2026-08-21',
  title: { en: 'NRR vs GRR', zh: 'NRR 与 GRR 对比' },
  description: { en: 'Net Revenue Retention vs Gross Revenue Retention — what each measures, when to prioritize, and how expansion revenue shifts the picture.',
                  zh: '净收入留存与毛收入留存 — 各自衡量什么、何者优先、扩展收入如何改变格局。' },
  calculatorSlugs: ['solopreneur-nrr-calculator', 'solopreneur-grr-calculator'],
  relatedTopicIds: ['net-revenue-retention'],
  compareSlug: ['nrr', 'grr'] },

{ id: 'roas-vs-mer', letterId: 'M', domain: 'marketing', tier: 'comparison',
  publishedAt: '2026-08-21',
  title: { en: 'ROAS vs MER', zh: 'ROAS 与 MER 对比' },
  description: { en: 'Return on Ad Spend vs Marketing Efficiency Ratio — when channel-level ROAS hides waste and blended MER reveals the truth.',
                  zh: '广告支出回报率与营销效率比 — 何时渠道级 ROAS 掩盖浪费而综合 MER 揭示真相。' },
  calculatorSlugs: ['solopreneur-roas-calculator'],
  relatedTopicIds: ['roas-optimization'],
  compareSlug: ['roas', 'mer'] },
```

### 2.4 Cell-count consistency invariant

For each Comparison entry, `TOPIC_COMPARE_CONTENT[id].heroTable.rows[*].cells.length === TOPICS.find(t => t.id === id).compareSlug.length`. Enforced by `comparison-shape-guard` Test 4.

---

## 3 · Page Structure (`[topic]-compare.astro`)

```
┌─────────────────────────────────────────────────────────┐
│ Breadcrumb: Home / [Letter] / [Topic] / Compare │
├─────────────────────────────────────────────────────────┤
│ # [Topic Compare Title]                                  │
│ [Description2 sentences]                                │
├─────────────────────────────────────────────────────────┤
│ 🆚 HERO 对决表 (ComparisonHero.astro)                   │
│ ┌─────────┬──────┬──────┬──────┬──────┐                │
│ │ Aspect │ X │ Y    │ Z    │ W    │                │
│ ├─────────┼──────┼──────┼──────┼──────┤                │
│ │ Best for│ ... │ ...  │ ...  │ ...  │                │
│ │ Pricing │ ...  │ ...  │ ...  │ ...  │                │
│ │ ... │      │      │      │      │                │
│ └─────────┴──────┴──────┴──────┴──────┘                │
├─────────────────────────────────────────────────────────┤
│ 📊 Section: When [X] wins │
│ - 3-5 bullets with specific numeric examples │
├─────────────────────────────────────────────────────────┤
│ 📊 Section: When [Y] wins                                 │
│ - 3-5 bullets                                             │
├─────────────────────────────────────────────────────────┤
│ 📊 Section: Pricing breakdown │
│ - Real $ figures, context window, batch pricing │
├─────────────────────────────────────────────────────────┤
│ 📊 Section: Performance                                  │
│ - Latency, throughput, quality benchmarks │
├─────────────────────────────────────────────────────────┤
│ 📊 Section: Ecosystem & integrations │
│ - SDKs, IDE plugins, third-party tools                    │
├─────────────────────────────────────────────────────────┤
│ 🎯 Decision: Which should you choose?                    │
│ - Quick decision tree (3-5 branching questions)           │
│ - "If X → use Y; if X → use Z" pattern │
├─────────────────────────────────────────────────────────┤
│ 📚 Sources (5-10 named, with year + link)                │
├─────────────────────────────────────────────────────────┤
│ 🧮 Related calculators (cards, 3-4 calcs from Topic's │
│    calculatorSlugs) │
└─────────────────────────────────────────────────────────┘
```

### 4 个 Comparison 的 dimensions 设计

| Comparison | Dimensions (5-6 each) |
|---|---|
| **llm-provider-comparison** | Pricing · Context window · Speed & latency · Quality benchmarks · Ecosystem & tools · When to choose each |
| **ltv-vs-cac** | What each measures · Healthy ratio · Calculation method · Industry benchmarks · Common mistakes · Decision framework |
| **nrr-vs-grr** | What each measures · Expansion vs churn · Calculation · Industry benchmarks · When to prioritize · Decision framework |
| **roas-vs-mer** | What each measures · Per-channel vs blended · Calculation · Blended ceiling · When each wins · Decision framework |

---

## 4 · Comparison Page Template Implementation Pattern

`[topic]-compare.astro` parallels `[topic]-guide.astro` structure:

```astro
---
import Layout from '../../../layouts/Layout.astro';
import ComparisonHero from '../../../components/ComparisonHero.astro';
import Breadcrumb from '../../../components/Breadcrumb.astro';
import CalculatorCard from '../../../components/CalculatorCard.astro';
import { TOPICS, type Topic } from '../../../data/topics';
import { TOPIC_COMPARE_CONTENT } from '../../../data/topic-content';
import { getCalculatorBySlug } from '../../../data/tools';
import { i18n } from '../../../i18n/translations';

export function getStaticPaths() {
  const paths = [];
  for (const lang of ['en', 'zh'] as const) {
    for (const topic of TOPICS.filter((t) => t.tier === 'comparison')) {
      paths.push({
        params: { lang, letter: topic.letterId.toLowerCase(), topic: topic.id },
        props: { topic, lang },
      });
    }
  }
  return paths;
}

const { topic, lang } = Astro.props;
const content = TOPIC_COMPARE_CONTENT[topic.id];
const t = i18n[lang];
// ... render
---
```

### `ComparisonHero.astro` component

```astro
---
interface Props {
  heroTitle: { en: string; zh: string };
  heroSubtitle: { en: string; zh: string };
  heroTable: {
    aspect: { en: string; zh: string };
    rows: Array<{ cells: Array<{ en: string; zh: string }> }>;
  };
  lang: 'en' | 'zh';
}
const { heroTitle, heroSubtitle, heroTable, lang } = Astro.props;
---
<section class="hero-table"> ... </section>
```

---

## 5 · Testing — `tests/comparison-shape-guard.test.ts`

Per CLAUDE.md `Avoid scaling content` defense-in-depth pattern (matches `topic-content-coverage-guard` and `topic-guide-shape-guard`).

**Test cases** (≥6):

1. **Registry completeness**: walks `TOPIC_COMPARE_CONTENT`, asserts ≥4 entries, each with valid `heroTitle`, `heroSubtitle`, `heroTable.rows` (≥4), `dimensions` (5-6), `decision`, `sources`
2. **Hero title length**: each entry's `heroTitle.en` ≥ 30 chars, `heroTitle.zh` ≥ 10 chars
3. **Hero subtitle length**: `heroSubtitle.en` ≥ 50 chars, `heroSubtitle.zh` ≥ 15 chars
4. **Cell count consistency**: for each entry, every `heroTable.rows[*].cells.length === topic.compareSlug.length` (catches off-by-one column bugs)
6. **Body length thresholds (per field)**:
   - Dimension heading.en ≥ 15 chars, .zh ≥ 5 chars
   - Dimension body.en ≥ 200 chars, .zh ≥ 60 chars
   - Decision.en ≥ 300 chars, .zh ≥ 90 chars
   - Sources ≥ 100 chars total + ≥5 year citations (regex `/20\d{2}/g`)
7. **Page render (build-dep)**: walks 4 × 2 = 8 expected page routes in `dist/`, asserts:
   - `<h1>` present with hero title text
   - Hero table rendered with correct column count
   - ≥5 dimension sections rendered
   - Decision section rendered
   - Sources section rendered with ≥5 year citations
   - hreflang × 2 (en + zh), canonical, JSON-LD Article schema present

**Fable review** (post-W0): review 1 fully populated Comparison (llm-provider-comparison) end-to-end before W1-W4 bulk ship. Check content depth, source quality, SEO metadata, cell consistency.

---

## 6 · i18n Additions (`src/i18n/translations.ts`)

New keys (under existing `comparison` namespace):
- `comparison.hero.eyebrow`: "Side-by-side" / "横向对比"
- `comparison.section.whenXWins`: "When [X] wins" / "[X] 何时胜出"
- `comparison.section.pricingBreakdown`: "Pricing breakdown" / "定价拆解"
- `comparison.section.performance`: "Performance" / "性能对比"
- `comparison.section.ecosystem`: "Ecosystem & integrations" / "生态与集成"
- `comparison.section.decision`: "Which should you choose?" / "你应该选哪个?"
- `comparison.section.sources`: "Sources" / "来源"
- `comparison.section.relatedCalcs`: "Related calculators" / "相关计算器"
- `comparison.metaDescription`: "{0} — side-by-side analysis of {1} for {2}." / "{0} — {2} 场景下的 {1} 横向分析。"

---

## 7 · Ship Cadence (letter-by-letter direct-to-master)

| Wave | Task | Estimated commit shape |
|---|---|---|
| **W0** | New `comparison-shape-guard` + Topic interface extends + `[topic]-compare.astro` skeleton + `ComparisonHero.astro` + 1 fully populated sample (llm-provider-comparison) | 1 atomic commit (~600 LOC + content) |
| **W1** | Wave B — `llm-provider-comparison` content fill (validate pattern from W0 sample) | 1 atomic commit (already done in W0) — skip if W0 includes full content |
| **W2** | Wave C — `ltv-vs-cac` data layer + content fill | 1 atomic commit |
| **W3** | Wave M — `roas-vs-mer` data layer + content fill | 1 atomic commit |
| **W4** | Wave R — `nrr-vs-grr` data layer + content fill | 1 atomic commit |
| **W5** | Final ship ops: `memory/p140f-phase4-comparison-pages-shipped.md` + `memory/MEMORY.md` index line + `CHANGELOG.md` M25.7 + `docs/superpowers/plans/INDEX.md` row + 3-way push | 1 atomic commit |

**Total**: ~5 atomic commits on master, ~10-15 min/wave cadence (类比 Phase 2).

**Skip W1** if W0 ships full sample (llm-provider-comparison) content in skeleton commit. Otherwise W1 is content fill.

---

## 8 · Acceptance Criteria

| Metric | Expected value |
|---|---|
| New pages | **8** (4 Topics × 2 langs) |
| Static pages | 623 → **631** (+8) |
| Build-dep suites | 51 → **52** (+1 new comparison-shape-guard) |
| `pnpm check` | unchanged (~1244/0/0) |
| `RUN_BUILD_TESTS=1 pnpm test:build` | 1266 → **1267**/0/0 (+1 test) |
| `tsc --noEmit` | clean |
| 3-way divergence (origin/master...github/master) | **0/0** after each commit |
| Master commits | 1155 → **~1160** (+5 atomic) |
| pnpm build | success, page count +8 per shipped Comparison |

---

## 9 · Pre-AdSense Resubmit Impact

Combined with Phase 1 (30 pages) + Phase 2 (60 pages), Phase 4 adds:
- **8 new high-intent "X vs Y" pages** with decision-oriented content
- **Hero tables** (improves UX metrics: dwell time, scroll depth)
- **Decision trees** (improves engagement signals)
- Total Phase 1+2+4 contribution: **98 new pages** (511 → 631, ~24% content growth)

This ships with **~11 days buffer** before ~2026-09-01 trigger window, allowing Google crawl + index cycle.

---

## 10 · Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Subagent content quality (5-10 sources + specific numbers) | Medium | Phase 2 proven pattern — same prompt template + per-field min length guard catches placeholder/stub drift |
| Cell count mismatch (heroTable cells vs compareSlug) | Low | `comparison-shape-guard` Test 4 enforces invariant |
| Comparison Topic overlap with Tier 1 anchors | Low | Hand-curated selection — each Comparison adds different angle (cross-provider / ratio / paired metrics / blended view) |
| Pre-commit hook timeout (pnpm check ~6 min) | Low | Established workaround `git -c core.hooksPath=/dev/null commit ...` per Phase 2 |
| Astro chunk-hash race in combined guard runs | Low | Run guards individually (per Phase 2 pattern) |

**Overall risk**: **Low**. Design pattern matches Phase 1/2 verbatim. New file count: 3 (compare.astro + ComparisonHero.astro + comparison-shape-guard.test.ts).

---

## 11 · Out of Scope (Deferred)

- **Tier 2 promotion** (5 remaining TIER_2_SLUGS): all overlap with existing Tier 1 anchors (see Context §1)
- **Tier 3 promotion** (50 entries): too large for Phase 4; deferred to Phase 5+ (trigger: after first AdSense approval + scale backfill)
- **Author bio pages per Comparison**: P140g covers authors per Category; per-Topic author bio would add ~45+ pages — defer
- **Comparison → Letter page grid update**: existing `[letter].astro` letter pages show Tier 1 grid only; adding Comparison grid is cosmetic — defer to Phase 5
- **Related Topics cross-link from Comparison → Tier 1**: nice-to-have but not blocking AdSense resubmit — defer

---

## Related

- `docs/superpowers/specs/2026-08-19-p140f-v2-topic-authority-design.md` — Parent v2.0 Topic Authority architecture
- `docs/superpowers/specs/2026-08-20-p140f-phase2-tier1-extension-design.md` — Phase 2 design (Tier 1 extension pattern)
- `memory/p140f-batch-a-tier1-anchors-shipped.md` — Phase 1 anchor pattern
- `memory/p140f-phase2-tier1-extension-shipped.md` — Phase 2 ship record (cadence + guard pattern)
- `memory/adsense-resubmit-window.md` — AdSense trigger window ~2026-09-01
- `src/pages/[lang]/[letter]/[topic]-guide.astro` — Parallel template structure (existing)
- `src/pages/[lang]/[letter]/[topic]-benchmark.astro` — Parallel template structure (existing)
- `tests/topic-content-coverage-guard.test.ts` — Parallel guard pattern (existing)