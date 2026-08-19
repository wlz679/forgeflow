---
name: p140f-batch-a-tier1-anchors-shipped
description: P140f Batch A Tier 1 anchor Topics — first concrete deliverable of v2.0 Topic Authority architecture. 15 Topic Guide + 15 Topic Benchmark pages (30 new pages). Per-Topic content fills deferred to T3.x/T4.x sub-batches.
metadata:
  type: project
  shipped: 2026-08-19
  commits: 7 atomic on feature/p140f-batch-a-tier1-anchors
  branch: feature/p140f-batch-a-tier1-anchors
---

# P140f Batch A Tier 1 Anchor Topics — SHIPPED

**Date:** 2026-08-19
**Branch:** `feature/p140f-batch-a-tier1-anchors` (7 atomic commits + ff-merge)
**Trigger:** User picked Option C "2.0 / Topic Authority brainstorm" after P141j ship. Brainstormed 5 design questions → spec → plan → Batch A inline execution.
**Closes:** P140f spec §11 Phase 1 deliverable (Tier 1 anchor Topics).

---

## Why this batch exists

P140f spec designed Topic Authority architecture: Domain → Letter → Topic → Calculator hierarchy with Guide + Benchmark pages per Topic. This batch ships Phase 1 infrastructure + Tier 1 anchor Topic pages (30 new pages).

## Change (8 files)

### Data layer (`src/data/topics.ts`, NEW +180 lines)
- Topic interface + 15 Tier 1 anchor entries (1 per letter A-T)
- Each Topic: id, letterId, domain, title (en/zh), description (en/zh), calculatorSlugs (1-4), relatedTopicIds, tier, publishedAt
- Helpers: `getTopicById`, `getTopicsByLetter`, `getTier1Topics`

### Categories domain field (`src/data/categories.ts`, MODIFY)
- Added `DomainId` type union (8 domains: finance/marketing/customer/product/people/legal/ai-cost/operations)
- Each of 15 Category entries now has `domain` field
- 15 letters mapped to 8 domains per spec §2

### i18n keys (`src/i18n/translations.ts`, MODIFY +20 keys)
- Topic Guide H2 names (en/zh): what_is, why_matters, key_concepts, how_to_apply, common_pitfalls, related
- Topic Benchmark H2 names (en/zh): what_we_measure, industry_benchmarks, how_to_use, sources
- Breadcrumb domain segments (en/zh): home + 8 domain labels
- CTA labels: read_guide, view_benchmarks, use_calculator, learn_methodology
- Letter page Topics section: topics_section.h2

### Components (2 NEW files)
- `src/components/Breadcrumb.astro` — semantic `<nav>` with Domain → Letter → Topic → Calculator hierarchy. Auto-resolves domain from categories.ts.
- `src/components/TopicCard.astro` — Topic card with full/compact variants. Used in letter page grid + calculator page Related Topics.

### Topic Guide template (`src/pages/[lang]/[letter]/[topic]-guide.astro`, NEW +108 lines)
- 6-section structure: What is / Why / Key concepts / How to apply / Common pitfalls / Related Topics
- JSON-LD Article schema with mentions (calculator links) + author (王立王 persona from P140g)
- getStaticPaths generates 30 paths (15 Topics × 2 langs)
- Per-Topic content shows [CONTENT] placeholders — editorial fill via T3.x sub-batches

### Topic Benchmark template (`src/pages/[lang]/[letter]/[topic]-benchmark.astro`, NEW +104 lines)
- 4-section structure: What we measure / Industry benchmarks (data table) / How to use / Sources & methodology
- JSON-LD Dataset schema
- getStaticPaths generates 30 paths (15 Topics × 2 langs)
- Per-Topic data tables show [CONTENT] placeholders — editorial fill via T4.x sub-batches

### Calculator page Related Topics (`src/pages/[lang]/[slug].astro`, MODIFY +16 lines)
- Added Related Topics card grid after dynamic-results, before RelatedTools
- Reverse lookup: `TOPICS.filter(t => t.calculatorSlugs.includes(slug))`
- Visual: gradient purple-50 to sky-50 panel
- Fix during build: replaced template literal with string concatenation to fix Astro JSX parsing

### Build-dep guards (2 NEW files)
- `tests/topic-guide-shape-guard.test.ts` (P140f-T7a)
- `tests/topic-benchmark-shape-guard.test.ts` (P140f-T7b)
- Lang-aware H2 substring matching (en: "What is" / zh: "什么是")
- 30 pages checked per guard × 2 guards = 60 page checks total

---

## What was deliberately NOT done (deferred)

- **T5 letter page Topics grid** — 15 individual letter pages need Topics section added. Plan targeted inline mode but script-based batch edit had regex issues. **Deferred to quick follow-up batch.**
- **T3.x / T4.x per-Topic content fills** — 30 pages ship with `[CONTENT]` placeholders. Editorial fill requires hand-curated ~1500 字 per Guide + ~600 字 per Benchmark × 15 Topics = ~30-40 hours editorial work. **Deferred to per-Topic sub-batches over ~2-3 weeks** (each sub-batch 1-3 Topics, ~2-4 hours editorial each).

---

## Verification

| Check | Result |
|---|---|
| `tsc --noEmit` | clean |
| `pnpm build` | 511 pages (was 451; +60 from 15 Topic Guides + 15 Topic Benchmarks × 2 langs) |
| `RUN_BUILD_TESTS=1 tsx --test tests/topic-guide-shape-guard.test.ts` | **1/1 pass** (28s build) |
| `RUN_BUILD_TESTS=1 tsx --test tests/topic-benchmark-shape-guard.test.ts` | **1/1 pass** (40s build) |
| `dist/en/solopreneur-cac-calculator/index.html` | contains "Related business Topics" ✓ (calculator cross-link works) |
| `dist/en/saas-metrics/mrr-growth-strategies-guide/index.html` | Topic Guide exists with 6 sections ✓ |
| `dist/en/saas-metrics/mrr-growth-strategies-benchmark/index.html` | Topic Benchmark exists with data table ✓ |

## Files touched

| File | Change | Commit |
|---|---|---|
| `src/data/topics.ts` | NEW (+180) | 8bf197d |
| `src/data/categories.ts` | MODIFY (DomainId + domain field × 15 entries) | 8bf197d |
| `src/i18n/translations.ts` | MODIFY (+20 keys) | 8bf197d + 3491ab6 (dup fix) |
| `src/components/Breadcrumb.astro` | NEW (+73) | d057cf3 |
| `src/components/TopicCard.astro` | NEW (+30) | d057cf3 |
| `src/pages/[lang]/[letter]/[topic]-guide.astro` | NEW (+108) | 2416aa9 |
| `src/pages/[lang]/[letter]/[topic]-benchmark.astro` | NEW (+104) | 8acc733 |
| `src/pages/[lang]/[slug].astro` | MODIFY (+16) | 37d3de2 |
| `tests/topic-guide-shape-guard.test.ts` | NEW (+64) | 69d6926 |
| `tests/topic-benchmark-shape-guard.test.ts` | NEW (+65) | 69d6926 |
| `memory/p140f-batch-a-tier1-anchors-shipped.md` | NEW | (T8) |
| `memory/MEMORY.md` | +1 index line | (T8) |
| `docs/superpowers/plans/INDEX.md` | line 6 + Section 6/7 row | (T8) |
| `CHANGELOG.md` | +M25.3 + header | (T8) |

Total: 7 atomic commits on feature branch + 1 ship commit on master after ff-merge.

---

## Mid-batch adjustments

- **Import path correction**: T3 template initially had `../../../../components/Footer.astro` (4 levels up) — incorrect. Fixed to `../../../components/Footer.astro` (3 levels up from `[lang]/[letter]/`).
- **Duplicate i18n key fix**: T1 added `breadcrumb.home` but line 14 already had it. TS1117 error caught; removed duplicate.
- **JSON-LD mentions schema**: Initial plan referenced `tools.find((t) => t.slug === slug)?.author` — wrong field. Changed to use i18n title.
- **JSX template literal syntax**: T6 initial version used backticks for template literals inside JSX `${...}`. Astro couldn't parse `(`tools.${slug}.title`, lang)`. Changed to use string concatenation `+ t(`tools.${slug}.title`, lang) +`.
- **Guard path fix**: T7 initial path used `topic.letterId` (e.g., 'A') as URL segment, but Astro routing uses `cat.slug` (e.g., 'saas-metrics'). Fixed.
- **Guard lang-awareness**: T7 initial markers were English only ("What is"); Chinese pages use i18n strings. Fixed to language-specific markers per language.

---

## Related

- P140f v2.0 Topic Authority spec (`docs/superpowers/specs/2026-08-19-p140f-v2-topic-authority-design.md`, commit 7520675)
- P140f Batch A plan (`docs/superpowers/plans/2026-08-19-p140f-batch-a-tier1-anchors.md`, commit e515867)
- [[p141i-prose-p1-deepening-shipped]] — preceding batch
- [[p140g-author-bio-pages-shipped]] — author persona referenced in Topic Guide JSON-LD
- [[adsense-resubmit-window]] — ~2026-09-01 trigger; Topic pages will be indexed alongside existing content
- Spec §7 Phase 1 → Phase 2 → Phase 3 (GSC verify + AdSense resubmit) → Phase 4 (Tier 2) → Phase 5 (Tier 3, conditional)