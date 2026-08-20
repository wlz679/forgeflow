# P140f Phase 2 — Tier 1 Anchor Topic Extension Design

**Date**: 2026-08-20
**Author**: Claude (brainstorming → writing-plans → executing-plans)
**Parent spec**: [p140f-v2-topic-authority-design.md](./2026-08-19-p140f-v2-topic-authority-design.md)
**Trigger**: User "启动" → launch Phase 2 brainstorm after Phase 1 (commit `e788b7c`) shipped + AdSense resubmit window ~2026-09-15.

---

## §1 Scope

**Goal**: Expand Tier 1 anchor Topics from 15 → 45 (15 anchors + 30 extensions). Each letter gets +2 Tier 1 extension Topics (15 letters × 2 = 30). Each Topic × 2 templates (Guide + Benchmark) = **60 new pages**.

| Metric | Phase 1 (shipped) | Phase 2 (this spec) | Delta |
|---|---|---|---|
| Tier 1 Topics in `topics.ts` | 15 | 45 | +30 |
| Topic pages (en + zh) | 60 | 120 | +60 |
| Static site pages | 511 | 571 | +60 |
| Build-dep guards (Topic-related) | 2 | 3 | +1 |
| Letters affected | 15 (anchor) | 15 (extension) | 0 |
| Tier 2 SLUGS in `prose-tiers.ts` | 35 | 5 | -30 |

**Workflow**:
- **Letter-by-letter**: 15 waves (A→T), each wave 1 letter × 2 Topic × 2 templates = 4 pages, ~1-2 days/wave, ~3 weeks total (target: complete before ~2026-09-15 AdSense trigger).
- **Subagent pattern**: Each Topic 1 general-purpose subagent, ~5 min/subagent, 8-row data table × 2 langs.
- **Content registry reuse**: Phase 1 `TOPIC_GUIDE_CONTENT` + `TOPIC_BENCHMARK_CONTENT` map pattern + `tmp/merge_batch.mjs` script reused without modification.
- **Cross-link auto-effect**: letter page `getTopicsByLetter(CATEGORY_ID)` already wired — new Topics appear on letter page grids automatically.

---

## §2 Topic Selection + Tier Boundary

**Source**: `src/data/prose-tiers.ts` `TIER_2_SLUGS` (35 entries, 1 letter missing). **Promote** 30 entries to Tier 1 extension (Phase 1 anchors remain unchanged).

**Selection criteria** (priority order, when GSC data unavailable):
1. **High-traffic calculators** — Google Search Console top impressions (assume post-Phase 3 GSC data; without it, use SEO potential)
2. **Distinct business question** — no overlap with anchor Topic (e.g., ROAS anchor covers "marketing ROI"; extension Topic should NOT duplicate "ROAS optimization")
3. **User research frequency** — chat logs / customer surveys / sales calls mentioning high
4. **Stage relevance** — high-traffic letters (B/M/R) may warrant 3 extensions instead of 2 if GSC data supports

**Avoid overlap**:
- ROAS anchor (M) → no extension on ROAS-optimization duplicate
- NRR anchor (R) → no extension on NRR-related duplicate
- MRR anchor (A) → no extension on MRR-projection duplicate
- CAC anchor (C) → no extension on CAC-related duplicate

**Tier boundary updates**:
| File | Before | After | Reason |
|---|---|---|---|
| `src/data/topics.ts` TOPICS | 15 entries (tier=1) | 45 entries (tier=1) | +30 Tier 1 extension |
| `src/data/prose-tiers.ts` TIER_2_SLUGS | 35 entries | 5 entries | promote 30 to Tier 1 |
| `src/data/prose-tiers.ts` TIER_1_SLUGS | 15 entries | 15 entries | unchanged (anchors distinct) |
| `src/data/prose-tiers.ts` `tierOf(slug)` | Tier 1/Tier 2/Tier 3 | unchanged | prose-count tier ≠ Topic layer |

**`prose-tiers.ts` change** is critical — once 30 SLUGS promoted out of TIER_2_SLUGS, the `tierOf(slug)` function will return Tier 3 for those SLUGS. This is correct because:
- Tier 1 in prose-tiers = full prose coverage (5 sections)
- Tier 2 in prose-tiers = partial prose coverage (3-4 sections)
- Tier 1 in Topic layer = tier 1 anchor OR tier 1 extension (broader semantic)
- These two tier systems are independent and don't conflict

---

## §3 Data Layer

**No new files.** All extension Topics use existing schema and templates.

### `src/data/topics.ts` — 30 new Topic entries

```typescript
// Existing 15 Tier 1 anchors unchanged
export const TOPICS: Topic[] = [
  { id: 'mrr-growth-strategies', letterId: 'A', tier: 1, ... },  // Phase 1 anchor
  // ... 14 more Phase 1 anchors ...
  // NEW: 30 Tier 1 extension entries
  {
    id: 'burn-rate-optimization',  // example for A
    letterId: 'A',
    domain: 'finance',
    tier: 1,  // extension is also tier=1
    publishedAt: '2026-09-XX',  // per-wave date
    title: { en: 'Burn Rate Optimization', zh: '燃烧率优化' },
    description: { en: '...', zh: '...' },
    calculatorSlugs: ['solopreneur-burn-rate-calculator'],
    relatedTopicIds: ['mrr-growth-strategies'],
  },
  // ... 29 more (2 per letter) ...
];
```

### `src/data/topic-content.ts` — 30 new Guide + Benchmark entries

```typescript
// Existing 15 entries (ROAS + 14 Phase 1) unchanged
export const TOPIC_GUIDE_CONTENT: Record<string, TopicGuideContent> = {
  'roas-optimization': { en: {...}, zh: {...} },
  'mrr-growth-strategies': { en: {...}, zh: {...} },
  // ... 13 more Phase 1 ...
  'burn-rate-optimization': { en: {...}, zh: {...} },  // NEW
  'burn-rate-runway': { en: {...}, zh: {...} },        // NEW (2nd for A)
  // ... 28 more ...
};

export const TOPIC_BENCHMARK_CONTENT: Record<string, { en: TopicBenchmarkContent; zh: TopicBenchmarkContent }> = {
  'roas-optimization': { en: {...}, zh: {...} },
  // ... 14 more Phase 1 ...
  'burn-rate-optimization': { en: {...}, zh: {...} },  // NEW
  // ... 29 more ...
};
```

### Reused infrastructure (zero new files)

| File | Role | Phase 2 usage |
|---|---|---|
| `src/pages/[lang]/[letter]/[topic]-guide.astro` | Guide template | Auto-handles new Topic IDs via `getStaticPaths` filter `tier === 1` |
| `src/pages/[lang]/[letter]/[topic]-benchmark.astro` | Benchmark template | Same |
| `src/components/Breadcrumb.astro` | Domain → Letter → Topic → Calculator | Auto-resolves from topics.ts |
| `src/components/TopicCard.astro` | Letter page Topics grid | Auto-renders new Topics |
| `src/pages/[lang]/{letter}.astro` | Letter pages | Auto-includes new Topics via `getTopicsByLetter` |

---

## §4 Content Production Pattern

### Per-letter wave workflow

```
For each letter in [A, B, C, D, E, F, H, K, L, M, O, P, R, S, T]:
  1. Identify 2 Tier 1 extension Topic IDs (from TIER_2_SLUGS, avoiding overlap)
  2. Read calculator engines for those Topic slugs
  3. Dispatch 2 subagents in parallel (one per Topic)
  4. Each subagent writes tmp/topic-content-<id>.ts with Guide + Benchmark
  5. Subagent returns: file path, char counts, sources, 8-row table summary
  6. Run tmp/merge_batch.mjs <letter-slug> to merge 2 entries into topic-content.ts
  7. Add 2 new entries to topics.ts TOPICS array (in same commit)
  8. Remove 2 promoted SLUGS from prose-tiers.ts TIER_2_SLUGS
  9. Run: tsc --noEmit + RUN_BUILD_TESTS=1 (all 3 guards)
  10. If green: commit + 3-way push
```

### Subagent prompt template (reusable per Topic)

```
You are filling content for ONE Tier 1 extension Topic. Pattern at commit 1bb576b for ROAS, e6c6390 for Batch 2/3/4.

**Topic**: <topic-id>
**Title (en/zh)**: <title-en> / <title-zh>
**Description (en)**: <description-en>
**Calculator slugs**: <calculator-slugs>
**Related Topics**: <related-topic-ids>
**Letter**: <letter>  // Anchor letter
**Domain**: <domain>

Tasks:
1. Read src/data/topic-content.ts (ROAS entry as pattern)
2. Read engine code at src/engines/<subdir>/<engine>.ts for each calculator
3. Generate TOPIC_GUIDE_CONTENT[<id>] (en + zh, 5 fields each)
4. Generate TOPIC_BENCHMARK_CONTENT[<id>] (en + zh, 4 fields + 8 benchmark rows each)
5. Write to tmp/topic-content-<id>.ts in EXACT standard format:
   - 2-space indent for top key, 4-space for en/zh, 6-space for fields
   - No export const
   - Two entries with same key (Guide shape + Benchmark shape)

Quality requirements:
- Real benchmarks with specific numeric ranges (per ChatGPT §12 anti-scaled-content)
- 5-10 reputable sources per Topic
- en + zh culturally translated (not literal)

Hard constraints:
- Only modify tmp/topic-content-<id>.ts
- No git operations

Time budget: ~5-7 min

Report back: file path, char counts, sources, 8-row table summary.
```

### Quality bar (per Topic)

- **Editorial depth**: ~1500字 en + ~1200字 zh Guide; ~600字 + 8-row data table per lang Benchmark
- **Real numbers**: All benchmarks from industry data, not invented ranges
- **Cross-link**: `relatedTopicIds` to existing Tier 1 anchors for internal linking graph

---

## §5 Build-Dep Guards

**Existing (auto-cover new Topics)**:
| File | Coverage |
|---|---|
| `tests/topic-guide-shape-guard.test.ts` | Tier 1 Topic Guide 5 mandatory H2 + Article schema + Breadcrumb |
| `tests/topic-benchmark-shape-guard.test.ts` | Tier 1 Topic Benchmark 4 mandatory H2 + Dataset schema + table + Breadcrumb |

Both guards filter `TOPICS.filter((t) => t.tier === 1)` — new extension Topics automatically included.

**NEW guard** (1 file, ~50 lines):
| File | Coverage |
|---|---|
| `tests/topic-content-coverage-guard.test.ts` | Every Tier 1 Topic (anchor + extension) has both Guide + Benchmark entries in `topic-content.ts` with non-trivial content (≥500 chars per field). Catches registry drift if Topic added without content. |

```typescript
// Sketch
test('every Tier 1 Topic has Guide + Benchmark content', () => {
  for (const topic of TOPICS.filter((t) => t.tier === 1)) {
    const guide = TOPIC_GUIDE_CONTENT[topic.id];
    const bench = TOPIC_BENCHMARK_CONTENT[topic.id];
    assert(guide && bench, `${topic.id}: missing Guide or Benchmark`);
    for (const lang of ['en', 'zh']) {
      for (const field of ['whatIs', 'whyWhy', 'keyConcepts', 'howToApply', 'commonPitfalls']) {
        assert(guide[lang][field].length >= 500, `${topic.id}.${lang}.${field}: too short`);
      }
    }
  }
});
```

---

## §6 Ship Cadence

**Letter-by-letter, 15 waves, DIRECT TO MASTER**:

| Wave | Letter | 2 Topics × 2 pages | Target date |
|---|---|---|---|
| 1 | A | SaaS Metrics extensions | 2026-08-21 |
| 2 | B | AI Cost extensions | 2026-08-23 |
| 3 | C | Valuation extensions | 2026-08-25 |
| 4 | D | Freelance extensions | 2026-08-27 |
| 5 | E | Cost extensions | 2026-08-29 |
| 6 | F | Real Estate extensions | 2026-08-31 |
| 7 | H | Hiring extensions | 2026-09-02 |
| 8 | K | Knowledge extensions | 2026-09-04 |
| 9 | L | Legal extensions | 2026-09-06 |
| 10 | M | Marketing extensions | 2026-09-08 |
| 11 | O | Operations extensions | 2026-09-10 |
| 12 | P | Product extensions | 2026-09-12 |
| 13 | R | Retention extensions | 2026-09-14 |
| 14 | S | Sales extensions | 2026-09-15 |
| 15 | T | Support extensions | 2026-09-17 |

(Some waves may run in parallel — see §7.)

### Per-wave ship procedure (direct to master)

**Decision**: Direct commits to master (NOT feature branches). Rationale:
- Phase 1 content fill (14 Topics, 4 commits) shipped directly to master successfully
- Each wave is small (4 pages, 2-3 files modified)
- Avoids 15-branch management overhead
- Reverts possible via `git revert` if needed

Per wave:
1. Identify 2 Tier 1 extension Topic IDs (from TIER_2_SLUGS, avoiding overlap)
2. Read calculator engines for those Topic slugs
3. Dispatch 2 subagents in parallel (one per Topic)
4. Each subagent writes `tmp/topic-content-<id>.ts` with Guide + Benchmark
5. Subagent returns: file path, char counts, sources, 8-row table summary
6. Run `tmp/merge_batch.mjs` to merge 2 entries into `topic-content.ts`
7. Add 2 new entries to `topics.ts` TOPICS array (in same commit)
8. Remove 2 promoted SLUGS from `prose-tiers.ts` TIER_2_SLUGS
9. Run: `tsc --noEmit` + `RUN_BUILD_TESTS=1` (all 3 guards)
10. Commit: `feat(data): P140f-B2 letter {letter} Tier 1 extension content fill (2 Topics)`
11. **3-way push**: origin (gitee) + github + master

**Total commits across Phase 2**:
- ~15 atomic content commits (1 per letter wave)
- ~15 wave ship records (memory/p140f-b2-letter-{letter}-extension-shipped.md)
- ~1 new guard commit (topic-content-coverage-guard) — Wave 0
- ~1 MEMORY index bump
- ~1 CHANGELOG M25.6 entry
- **~33 commits**

**Static pages delta**: 511 → 571 (+60).

---

## §7 Parallelism & Race Conditions

**Constraint**: Multiple waves shipped concurrently by different sessions/subagents would race-write to `src/data/topic-content.ts`.

**Solution**: Each wave uses a separate `feature/p140f-b2-letter-{letter}-extension` branch. Waves ship **sequentially** in time (each wave 1-2 days apart), not in parallel. This:
- Avoids merge conflicts on `topic-content.ts`
- Allows each wave to be reviewed independently
- Matches spec §7 cadence (3-4 weeks for Phase 2)

**If user wants faster**: could ship 2 letters per wave by doing per-letter commit on the same branch, but this risks conflicts. **Default is 1 letter = 1 wave**.

---

## §8 Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Tier 1 extension duplicates existing anchor Topic | Selection criteria §2 step 2 (no overlap) |
| GSC data unavailable (no Phase 3 yet) → arbitrary Topic selection | Use SEO potential as proxy; revisit after GSC data available |
| `prose-tiers.ts` TIER_2 list shrinks dramatically (35 → 5) → affects other code | `tierOf()` semantic change is intentional (Tier 2 in prose-tiers no longer matches Topic layer Tier 2); document in code comment |
| ChatGPT §12 scaled content violation | Per-Topic subagent quality bar (real sources, editorial depth); same as Phase 1 |
| Letter wave ships before AdSense trigger | AdSense resubmit deferred to ~2026-09-15 per spec §7; Phase 2 must complete before then |
| User prefers 55 instead of 30 Topics | spec §11 says 30; user already chose 30 in §1. Defer 55 to Phase 4 if needed |

---

## §9 Out of Scope (deferred)

- **Tier 2 Topics** (remaining 5) — Phase 4 (after AdSense approval)
- **Tier 3 Topics** — Phase 5 (after Phase 4 success)
- **Comparison pages** — spec §10 deferred to Phase 4
- **Analysis pages** — spec §10 deferred to Phase 5
- **Author bio pages per Topic** — spec §10 deferred (P140g bio pages suffice)
- **Topic comments / community** — spec §10 deferred to v3.0
- **Domain pages** — spec §10 explicit decision: nav-only, no Domain route

---

## §10 Acceptance Criteria

| Check | Target |
|---|---|
| `pnpm check` | 1244/0/0 unchanged per wave |
| `tsc --noEmit` | clean per wave |
| `RUN_BUILD_TESTS=1 pnpm test:build` | 1267/1267/0 per wave (+1 guard) |
| Static pages | 511 → 571 (+60) |
| 3-way divergence | 0/0 after each wave ship |
| Build-dep guards | 49 + 2 (existing Topic) + 1 (NEW coverage) = 52 green |
| `topic-content.ts` size | ~57 KB → ~120 KB (~7000 lines added) |
| `topics.ts` size | ~110 lines → ~250 lines (~30 entries × ~5 lines each) |
| `prose-tiers.ts` TIER_2_SLUGS | 35 → 5 |
| Master commit count | 1108 → ~1140 (+33 atomic) |

---

## §11 Tasks (for plan)

1. **Wave 0** — Pre-ship: write new `topic-content-coverage-guard` (1 atomic commit)
2. **Wave 1-15** — Letter-by-letter content fills (15 atomic commits + 15 ship records)
3. **Wave 16** — Final ship: MEMORY bump + CHANGELOG M25.6 + plans/INDEX sync (1 atomic commit)

Each wave is its own sub-plan → execute → ship → verify cycle.

---

## Related

- [[p140f-batch-a-tier1-anchors-shipped]] — Phase 1 infrastructure (commit 4b09f12)
- [[p140f-batch-a-tier1-content-fill-shipped]] — Phase 1 content fills (commit e788b7c)
- [P140f v2.0 Topic Authority spec](./2026-08-19-p140f-v2-topic-authority-design.md) — parent spec, §7 Phase 2 definition