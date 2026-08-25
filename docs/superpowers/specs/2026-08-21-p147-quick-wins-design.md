# P147 Quick Wins — Phase 4 Followup + Cross-Link Coverage Design

> **For agentic workers:** Small followup batch (~1.5-2 hr) closing deferred items from Phase 4 fable review. 4 atomic commits on master (direct-to-master cadence per Phase 2/4 pattern). 0 new pages, 1 new build-dep guard, 4 letter pages enhanced.

**Goal:** Close Phase 4 fable review deferred items (relatedTopicIds cross-link + title/h1 mismatch) + extend Comparison cross-links to letter pages (B/C/M/R) + add new build-dep guard preventing future cross-link drift. Pre-AdSense resubmit bonus: improve SEO internal link density + page-level cross-link coverage.

**Architecture:** Augment existing `[topic]-compare.astro` template with Related Topics section (reuses TopicCard variant="compact") + optimize `<title>` for SERP. Extend 4 letter pages (B/C/M/R) with "Comparison" TopicCard grid section. New `tests/comparison-cross-link-guard.test.ts` (5 test cases) catches relatedTopicIds drift + page-render coverage.

**Tech Stack:** Astro 4.16.19 SSG + TypeScript 5.6 strict + Tailwind CSS 4 + existing v3 rendering layer + existing TopicCard component (no new components).

---

## Context

P140f Phase 4 shipped at `d338497` (2026-08-21). Fable review identified 4 Important + 5 Minor findings. Commit `d338497` closed all 4 Important + 3/5 Minor. The 2 remaining Minor items were deferred:

- **Minor #8**: `[topic]-compare.astro` doesn't render `relatedTopicIds` (4 Comparison Topics have populated `relatedTopicIds[]` in `src/data/topics.ts`, but template ignores the field — cross-link density 0)
- **Minor #9**: `<title>` vs `<h1>` mismatch (title=short SERP-friendly, h1=long editorial)

This batch closes both, plus extends cross-links to letter pages for SEO internal link density, plus adds defensive build-dep guard.

P144/P146 zh QA review and Phase 4 MEMORY count correction were already shipped in `d338497` — not in this batch's scope.

---

## 1 · Architecture

### 1.1 Modified files (5)

```
src/
├── pages/[lang]/[letter]/
│   ├── [topic]-compare.astro          ← MODIFY (add Related Topics section + optimize <title>)
│   └── b.astro                       ← MODIFY (add Comparison grid section, letter B only)
├── pages/[lang]/
│   ├── c.astro                       ← MODIFY (same pattern, letter C)
│   ├── m.astro                       ← MODIFY (same pattern, letter M)
│   └── r.astro                       ← MODIFY (same pattern, letter R)
```

Note: letter pages `a.astro`, `d.astro`, `e.astro`, `f.astro`, `h.astro`, `k.astro`, `l.astro`, `o.astro`, `p.astro`, `s.astro`, `t.astro` are NOT modified (no Comparison topics in those letters).

### 1.2 New files (2)

```
src/i18n/translations.ts              ← MODIFY (add 1 new key `letter.compare.section` × en + zh)
tests/
└── comparison-cross-link-guard.test.ts ← NEW build-dep guard (5 test cases)
```

### 1.3 Ship ops files (4)

```
memory/
├── p147-quick-wins-shipped.md         ← NEW (phase ship record)
├── MEMORY.md                          ← MODIFY (1 line index entry)
CHANGELOG.md                           ← MODIFY (M25.8 section)
docs/superpowers/plans/INDEX.md        ← MODIFY (header timestamp + 1 row)
```

---

## 2 · Data + UI Layer

### 2.1 `[topic]-compare.astro` enhancements

**Add Related Topics section** (after Related calculators, before closing `</article>`):

```typescript
// Add to frontmatter imports:
import TopicCard from '../../../components/TopicCard.astro';

// Add to frontmatter body (after existing relatedTopics derivation, or co-located):
const relatedTopics = topic.relatedTopicIds
  .map((id) => TOPICS.find((t) => t.id === id))
  .filter((t): t is Topic => Boolean(t));
```

**Add to JSX** (after `Related calculators` section):

```astro
{relatedTopics.length > 0 && (
  <section class="mt-10">
    <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-4">
      {t('topic.guide.h2.related', lang)}
    </h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      {relatedTopics.map((rt) => <TopicCard topic={rt} lang={lang} variant="compact" />)}
    </div>
  </section>
)}
```

**Optimize `<title>`** (replace existing `const title = ...` line):

```typescript
const title = `${content.heroTitle[lang]} — ${topic.title[lang]} Comparison`;
```

Result: title combines editorial hero framing + topic identifier + "Comparison" keyword. Example:
- en: `"Claude vs OpenAI vs Gemini vs DeepSeek — Which LLM API Should You Choose in 2026? — LLM Provider Comparison Comparison"`
- zh: `"Claude vs OpenAI vs Gemini vs DeepSeek — 2026 年 LLM API 选择指南 — LLM 提供商对比 Comparison"`

Wait — that double "Comparison" is awkward. Refined:

```typescript
const title = `${content.heroTitle[lang]} — ${topic.title[lang]}`;
```

Example:
- en: `"Claude vs OpenAI vs Gemini vs DeepSeek — Which LLM API Should You Choose in 2026? — LLM Provider Comparison"`
- zh: `"Claude vs OpenAI vs Gemini vs DeepSeek — 2026 年 LLM API 选择指南 — LLM 提供商对比"`

Better. Single "Comparison" semantic implicit in URL (-compare) + page metadata (articleSection).

### 2.2 Letter page grid (B/C/M/R only)

For each of `src/pages/[lang]/b.astro`, `c.astro`, `m.astro`, `r.astro`:

**Add to frontmatter imports**:

```typescript
import { TOPICS } from '../../data/topics';
```

**Add to frontmatter body** (after existing tier-1 grid derivation):

```typescript
const comparisonTopics = TOPICS.filter((t) => t.letterId === 'B' && t.tier === 'comparison');
// (replace 'B' with the actual letter in each file: 'B', 'C', 'M', 'R')
```

**Add to JSX** (after existing Tier 1 grid, before footer):

```astro
{comparisonTopics.length > 0 && (
  <section class="mt-12">
    <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-4">
      {t('letter.compare.section', lang)}
    </h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {comparisonTopics.map((c) => <TopicCard topic={c} lang={lang} variant="full" />)}
    </div>
  </section>
)}
```

### 2.3 New i18n key

```typescript
'letter.compare.section': {
  en: 'X vs Y comparisons',
  zh: '对比专题',
},
```

Add to `src/i18n/translations.ts` (find `letter.*` namespace, or create if absent — most likely exists for letter pages).

### 2.4 TopicCard variant check

`TopicCard` component must support `variant="compact"` and `variant="full"`. Read `src/components/TopicCard.astro` first to verify both variants exist; if `compact` doesn't exist, use existing variant (likely `default`).

---

## 3 · Build-dep Guard — `tests/comparison-cross-link-guard.test.ts`

5 test cases (per ChatGPT §12 defense-in-depth pattern):

1. **relatedTopicIds completeness**: For every `Topic` with `tier === 'comparison'`, assert `relatedTopicIds.length >= 1` (catches empty cross-link)
2. **relatedTopicIds resolution**: Every `id` in `relatedTopicIds[*]` resolves to an existing `TOPICS` entry (catches orphan IDs)
3. **Reciprocal advisory**: For each (A, B) pair where A.relatedTopicIds includes B, log advisory if B.relatedTopicIds does NOT include A (warn-only, not fail — explicit asymmetry allowed per spec)
4. **Page render (build-dep)**: Walk 4 × 2 = 8 expected comparison routes in `dist/`, assert each has ≥1 `<a href>` to a related topic (`${cat.slug}/${relatedTopicId}-` substring match)
5. **Letter page render (build-dep)**: Walk 4 letter page routes (`b`, `c`, `m`, `r`) in `dist/` × 2 langs = 8 pages, assert each has the Compare grid section (search for `letter.compare.section` translation string in HTML)

---

## 4 · Ship + Acceptance

### 4.1 Atomic commits (4)

| # | Commit | Files | LOC |
|---|---|---|---|
| C1 | fix(pages): P147-C1 — render relatedTopicIds + optimize title in [topic]-compare.astro | 1 modified | ~30 |
| C2 | feat(pages): P147-C2 — letter pages B/C/M/R add Comparison grid + i18n key | 5 modified (4 letter + 1 i18n) | ~60 |
| C3 | feat(guard): P147-C3 — comparison-cross-link-guard (5 cases) | 1 new | ~150 |
| C4 | docs(ship): P147-C4 — final ship ops (MEMORY + CHANGELOG M25.8 + plans/INDEX) | 4 modified/created | ~100 |

### 4.2 Acceptance

| Metric | Expected |
|---|---|
| Atomic commits on master | +4 (1163 → 1167) |
| New pages | 0 |
| Letter pages enhanced | 4 (B/C/M/R only) |
| Build-dep suites | 52 → 53 (+1 new comparison-cross-link-guard) |
| `pnpm check` | unchanged (1256/0/0) |
| `RUN_BUILD_TESTS=1 pnpm test:build` | 1267/0/0 → 1268/0/0 (+1 test) |
| `tsc --noEmit` | clean |
| 3-way divergence | 0/0 after each commit |

### 4.3 Pre-AdSense resubmit impact

- 4 comparison pages gain Related Topics cross-links (improves internal link density)
- 4 letter pages gain Comparison grid (improves navigation depth)
- SERP title optimization improves CTR for "X vs Y" queries
- Build-dep guard catches future cross-link drift class

Combined Phase 1+2+4+P147 contribution: **+98 pages + improved cross-link density + new defensive guard**.

---

## 5 · Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| TopicCard variant mismatch (`compact` not supported) | Low | Read TopicCard.astro first; fall back to `variant="default"` if `compact` absent |
| relatedTopicIds orphan IDs (point to deleted topics) | Low | Guard Test 2 catches at build time; pre-flight `git grep relatedTopicIds` |
| Letter page grid section title collision with Tier 1 section | Low | Use distinct section heading `letter.compare.section` |
| `<title>` length overflow (Google SERP truncate at 60 chars) | Low | heroTitle is already short per Phase 4 spec; verified manually |

**Overall risk**: **Low**. Modifications are additive (new section, new grid); no deletions or refactors.

---

## 6 · Out of Scope (deferred)

- **Tier 3 selective promotion** (50 entries): too large for Quick Win; deferred to Phase 5
- **Comparison → Topic Guide/Benchmark cross-link** (asymmetric): advisory warn in Test 3, not enforced
- **Phase 3 AdSense resubmit prep**: wait ~2026-09-01 trigger window (no prep work possible before then)
- **5 remaining letter pages (A/D/E/F/H/K/L/O/P/S/T)**: no Comparison topics in those letters, no grid to add
- **Comparison grid on Topic Guide/Benchmark pages**: defer — Topic Guide/Benchmark already have relatedTopicIds rendering, Comparison is the outlier

---

## Related

- `docs/superpowers/specs/2026-08-21-p140f-phase4-comparison-pages-design.md` — Phase 4 design (this batch closes deferred items)
- `memory/p140f-phase4-comparison-pages-shipped.md` — Phase 4 ship record (fable review findings list)
- `src/components/TopicCard.astro` — reused for cross-link (verify `compact` + `full` variants)
- `src/pages/[lang]/[letter]/[topic]-compare.astro` — modified template
- `src/data/topics.ts` — 4 Comparison Topic entries with `relatedTopicIds[]` already populated
- `memory/adsense-resubmit-window.md` — AdSense trigger ~2026-09-01