# C Spec: Internal-Links Multi-Dimensional Recommendation

**Date:** 2026-06-26
**Status:** Draft (awaiting user review)
**Author:** Brainstorming session
**Predecessor:** A+B spec (engines/tools split) — already merged

## Goal

Upgrade the related-tools recommendation algorithm from a single dimension (same `categoryId`) to a multi-dimensional one (same category + shared keywords), so that small categories (cost=4, investment=3) can still fill the 4-slot related-tools area with high-quality, semantically relevant picks.

## Background

### Current state

`src/data/internal-links.ts` (single dimension):

```ts
import { tools } from './tools';
export const relatedTools: Record<string, string[]> = {};
for (const tool of tools) {
  const sameCategory = tools.filter(t => t.categoryId === tool.categoryId && t.slug !== tool.slug);
  relatedTools[tool.slug] = sameCategory.slice(0, 4).map(t => t.slug);
}
```

### Problem

Small categories can't fill 4 slots:

| Category | Tool count | Max same-cat related |
| --- | --- | --- |
| saas | 5 | 4 ✓ |
| ai-cost | 8 | 4 ✓ |
| valuation | 6 | 4 ✓ |
| freelance | 6 | 4 ✓ |
| **cost** | **4** | **3 ✗** |
| **investment** | **3** | **2 ✗** |

The current implementation truncates the list at `slice(0, 4)`, leaving cost tools with 3 related, investment tools with 2. That's a UX gap and a wasted SEO/internal-linking opportunity.

### Constraints

- `RelatedTools.astro` and `[slug].astro` consume `relatedTools[slug]` as `string[]` of slugs — **UI contract unchanged**.
- All 32 tools already exist and ship; we are not adding tools.
- TS strict mode — new fields must be non-optional or defaulted.
- No new dependencies.

## Design

### 1. ToolMeta extension

**File:** `src/data/tools/types.ts`

Add two required fields to `ToolMeta`:

```ts
export interface ToolMeta {
  // ... existing fields unchanged
  keywords: string[];   // 5-10 per tool, drives recommendation algorithm
  tags: string[];       // 3-5 per tool, reserved for future UI / Schema.org reuse
}
```

**Semantics:**

- `keywords` — used by the recommendation algorithm. Two tools with N shared keywords get a similarity score of N. Case-insensitive comparison, original-case storage.
- `tags` — user-facing semantic labels, reserved for future UI consumption (tag clouds, filters, Schema.org `keywords` field). Not used by the recommendation algorithm in this spec.

**Annotation policy:**

- Same-category tools should share 2-3 keywords (guarantees the recommendation picks them).
- Cross-category keyword sharing is welcome (e.g. `cac-calculator` and `ltv-calculator` both share `unit economics`).
- Small categories (cost, investment) MUST share at least 1 keyword with tools in other categories so the fallback can find high-quality cross-category picks.
- Avoid bloat: 5-10 keywords, 3-5 tags is the soft target. Empty arrays are allowed but discouraged.

### 2. Annotation across 6 category files

**Files to modify:** `src/data/tools/{saas,ai-cost,valuation,freelance,cost,investment}.ts`

| File | Tool count | Total keywords | Total tags |
| --- | --- | --- | --- |
| saas.ts | 5 | 25-50 | 15-25 |
| ai-cost.ts | 8 | 40-80 | 24-40 |
| valuation.ts | 6 | 30-60 | 18-30 |
| freelance.ts | 6 | 30-60 | 18-30 |
| cost.ts | 4 | 20-40 | 12-20 |
| investment.ts | 3 | 15-30 | 9-15 |

**Example annotations:**

```ts
// saas.ts
{
  slug: 'burn-rate-calculator',
  // ... existing fields
  keywords: ['cash flow', 'runway', 'burn rate', 'saas metrics', 'startup finance', 'operating cost'],
  tags: ['saas', 'finance', 'runway'],
}

// valuation.ts
{
  slug: 'cac-calculator',
  keywords: ['cac', 'customer acquisition cost', 'marketing', 'unit economics', 'saas metrics'],
  tags: ['cac', 'marketing', 'saas'],
}
{
  slug: 'ltv-calculator',
  keywords: ['ltv', 'lifetime value', 'unit economics', 'saas metrics', 'retention'],
  tags: ['ltv', 'retention', 'saas'],
}
```

### 3. Algorithm: same-category-first + shared-keywords supplement

**File:** `src/data/internal-links.ts` (full rewrite)

```
For each tool T:
  sameCat = tools where categoryId == T.categoryId AND slug != T.slug
  sameRanked = sameCat sorted by (sharedKeywords desc, slug asc)
  picked = sameRanked[0..4]

  if picked.length < 4:
    pickedSlugs = Set(picked.map(p => p.slug))
    crossCat = tools where categoryId != T.categoryId AND slug != T.slug AND slug not in pickedSlugs
    crossRanked = crossCat sorted by (sharedKeywords desc, slug asc) where score > 0
    for s in crossRanked:
      if picked.length >= 4: break
      picked.push(s.c)

  relatedTools[T.slug] = picked.map(t => t.slug)
```

**Tie-breaker:** `slug.localeCompare(slug)` — deterministic, ensures stable output across runs and platforms.

**Score-zero cross-category picks are skipped** — if a tool has no keyword overlap with any cross-category tool, we don't pad with random picks; we leave the list short. Empty fallback is better than irrelevant fallback.

### 4. Implementation

```ts
// src/data/internal-links.ts
import { tools, type ToolMeta } from './tools';

function sharedKeywords(a: ToolMeta, b: ToolMeta): number {
  const aSet = new Set(a.keywords.map(k => k.toLowerCase()));
  const bSet = new Set(b.keywords.map(k => k.toLowerCase()));
  let n = 0;
  for (const k of aSet) if (bSet.has(k)) n++;
  return n;
}

function rankByKeywords(source: ToolMeta, candidates: ToolMeta[]) {
  return candidates
    .map(c => ({ c, score: sharedKeywords(source, c) }))
    .sort((a, b) => b.score - a.score || a.c.slug.localeCompare(b.c.slug));
}

export const relatedTools: Record<string, string[]> = {};
for (const tool of tools) {
  const sameCat = tools.filter(t => t.categoryId === tool.categoryId && t.slug !== tool.slug);
  const picked: ToolMeta[] = rankByKeywords(tool, sameCat).slice(0, 4).map(s => s.c);

  if (picked.length < 4) {
    const pickedSlugs = new Set(picked.map(p => p.slug));
    const crossCat = tools.filter(t =>
      t.categoryId !== tool.categoryId && t.slug !== tool.slug && !pickedSlugs.has(t.slug)
    );
    for (const s of rankByKeywords(tool, crossCat)) {
      if (picked.length >= 4) break;
      if (s.score > 0) picked.push(s.c);
    }
  }

  relatedTools[tool.slug] = picked.map(t => t.slug);
}
```

### 5. UI / consumer impact

**Zero changes** to:

- `src/components/RelatedTools.astro`
- `src/pages/[lang]/[slug].astro`
- `src/data/tools/index.ts`
- `src/engines/**`

The consumer contract (`relatedTools[slug]: string[]` of up to 4 slugs) is preserved.

### 6. Expected behavior per category

| Category | Same-cat available | Algorithm result |
| --- | --- | --- |
| saas (5) | 4 | 4 same-category, sorted by shared keywords |
| ai-cost (8) | 7 | 4 same-category |
| valuation (6) | 5 | 4 same-category |
| freelance (6) | 5 | 4 same-category |
| **cost (4)** | **3** | **3 same-category + 1 cross-category** |
| **investment (3)** | **2** | **2 same-category + 2 cross-category** |

The cross-category fallback only activates when there are < 4 same-category tools AND there is at least 1 cross-category tool with shared keywords.

## Testing

### Unit tests (new file: `tests/internal-links.test.ts`)

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { relatedTools } from '../src/data/internal-links.ts';
import { tools } from '../src/data/tools/index.ts';

test('all 32 tools have relatedTools entry', () => {
  assert.equal(Object.keys(relatedTools).length, 32);
  for (const t of tools) assert.ok(relatedTools[t.slug], `missing entry for ${t.slug}`);
});

test('related list never includes the tool itself', () => {
  for (const t of tools) {
    assert.ok(!relatedTools[t.slug].includes(t.slug), `${t.slug} self-references`);
  }
});

test('related list has 4 entries (fallback fills from cross-category)', () => {
  for (const t of tools) {
    assert.equal(relatedTools[t.slug].length, 4, `${t.slug} has ${relatedTools[t.slug].length} related, want 4`);
  }
});

test('small categories use cross-category fallback', () => {
  for (const tool of tools.filter(x => x.categoryId === 'investment')) {
    const sameCat = tools.filter(x => x.categoryId === 'investment' && x.slug !== tool.slug);
    assert.ok(relatedTools[tool.slug].length > sameCat.length, `${tool.slug} fallback inactive`);
  }
});

test('related list is sorted: same-category first, then by shared keywords desc', () => {
  for (const t of tools) {
    const related = relatedTools[t.slug].map(s => tools.find(x => x.slug === s)!);
    let seenCross = false;
    for (const r of related) {
      if (r.categoryId !== t.categoryId) seenCross = true;
      else if (seenCross) assert.fail(`${t.slug}: same-category ${r.slug} appears after cross-category`);
    }
  }
});

test('no duplicate slugs in any related list', () => {
  for (const t of tools) {
    const set = new Set(relatedTools[t.slug]);
    assert.equal(set.size, relatedTools[t.slug].length, `${t.slug} has duplicates`);
  }
});
```

### Acceptance checklist

- [ ] `pnpm check` exits 0
- [ ] `node --import tsx tests/internal-links.test.ts` — 6/6 pass
- [ ] `pnpm build` succeeds (141 static pages)
- [ ] Manual spot check: 1 saas + 1 cost + 1 investment page render RelatedTools with 4 links each
- [ ] Investment tool's related list contains at least 1 cross-category tool

## Implementation Plan (to be written by writing-plans)

3 tasks:

1. **Task 1 [INTEGRATION]** — `types.ts` field additions + annotate all 32 tools in 6 category files
2. **Task 2 [MECHANICAL]** — rewrite `internal-links.ts` to multi-dimensional algorithm
3. **Task 3 [INTEGRATION]** — add 6 unit tests, run `pnpm check` + `pnpm build`, manual spot check

## Out of scope (future work)

- UI rendering of `tags` (tag clouds, filters)
- Schema.org `keywords` field integration
- Per-tool customization of `relatedTools` (admin override)
- Tag-based navigation pages (`/tag/saas`)

## Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Annotation is subjective, low-quality picks | Spot-check 5-6 tools manually; iterate on keywords |
| Cross-category fallback produces irrelevant picks | Score-zero picks are skipped (no random padding) |
| TS strict mode catches missing fields in 6 files | Annotation is done atomically in one commit; build catches drift |
| `pnpm build` regresses | Build is run as the final acceptance check |

## References

- Predecessor: `docs/superpowers/specs/2026-06-26-ab-engines-tools-split-design.md`
- Predecessor plan: `docs/superpowers/plans/2026-06-26-ab-engines-tools-split.md`
- Current implementation: `src/data/internal-links.ts`
- Current type def: `src/data/tools/types.ts`
- Consumer: `src/components/RelatedTools.astro`
