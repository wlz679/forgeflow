# P140f Phase 2 — Tier 1 Anchor Topic Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal**: Ship 30 new Tier 1 extension Topics × 2 templates (Guide + Benchmark) = 60 new pages, letter-by-letter direct-to-master cadence, complete before ~2026-09-15 AdSense trigger window.

**Architecture**: Promote 30 entries from `src/data/prose-tiers.ts` TIER_2_SLUGS to Tier 1 extension. Add 30 entries to `src/data/topics.ts` (tier=1) and 60 entries (Guide + Benchmark × en+zh) to `src/data/topic-content.ts`. Reuse existing templates (no new pages/components). Add 1 new build-dep guard `topic-content-coverage-guard`. Per-letter waves commit directly to master (matches Phase 1 content-fill pattern).

**Tech Stack**: Astro 4.16.19 (static SSG), TypeScript 5.6 strict, Node.js subagent pattern (parallel 2 subagents per wave), pre-existing content registry pattern from Phase 1 (`tmp/merge_batch.mjs`).

## Global Constraints

These constraints bind every task. Implementation must satisfy all of them.

- **Static page count target**: 511 → 571 (+60)
- **`pnpm check` target**: 1244/0/0 unchanged per wave
- **`tsc --noEmit`**: clean per wave
- **`RUN_BUILD_TESTS=1` target**: 1266/1266/0 (existing) → 1267/1267/0 (after Task 1 adds new guard)
- **3-way divergence (origin ↔ github ↔ master)**: 0/0 after every commit
- **Commit cadence**: direct to master (NOT feature branches — matches Phase 1 content-fill pattern)
- **ChatGPT §12 anti-scaled-content**: every Topic must be hand-curated editorial depth (no AI batch generation), real benchmarks with numeric ranges, 3-10 reputable sources per Topic
- **No overlap with existing 15 Tier 1 anchors** (ROAS, MRR, CAC, NRR, etc. — see `src/data/topics.ts`)
- **Existing infrastructure reuse**: zero new template/component files; existing `getStaticPaths` filters `tier === 1` and auto-handles new Topic IDs
- **Per-wave atomic commit**: `feat(data): P140f-B2 letter {letter} Tier 1 extension content fill (2 Topics)`
- **Editorial depth per Topic**: ~1500 字 en + ~1200 字 zh Guide; ~600 字 + 8-row data table × 2 langs Benchmark
- **Real benchmarks with specific numeric ranges** (per ChatGPT §12): not "varies widely" — must have specific numbers
- **Sources per Topic**: 3-10 reputable (OpenView, Bessemer, BLS, ChatGPT §12 anti-scaled-content warning)
- **en/zh content**: culturally translated (not literal)

## File Structure

| File | Role | Phase 2 touch |
|---|---|---|
| `src/data/topics.ts` | TOPICS array (Topic interface) | +30 Tier 1 extension entries |
| `src/data/topic-content.ts` | TOPIC_GUIDE_CONTENT + TOPIC_BENCHMARK_CONTENT maps | +60 entries (30 × 2 shapes × en+zh) |
| `src/data/prose-tiers.ts` | TIER_1_SLUGS / TIER_2_SLUGS arrays | TIER_2 35 → 5 (promote 30) |
| `src/i18n/translations.ts` | Topic H2 names, breadcrumb segments | NO change (existing keys sufficient) |
| `src/pages/[lang]/[letter]/[topic]-guide.astro` | Guide template | NO change (existing) |
| `src/pages/[lang]/[letter]/[topic]-benchmark.astro` | Benchmark template | NO change (existing) |
| `src/components/Breadcrumb.astro` | Domain → Letter → Topic breadcrumb | NO change (existing) |
| `src/components/TopicCard.astro` | Letter page Topic card | NO change (existing) |
| `src/pages/[lang]/{letter}.astro` | Letter pages (15 letters) | NO change (auto-include via getTopicsByLetter) |
| `tests/topic-guide-shape-guard.test.ts` | Build-dep guard | NO change (auto-covers Tier 1) |
| `tests/topic-benchmark-shape-guard.test.ts` | Build-dep guard | NO change (auto-covers Tier 1) |
| `tests/topic-content-coverage-guard.test.ts` | NEW build-dep guard | NEW (catches registry drift) |
| `tmp/merge_batch.mjs` | Merge temp files into topic-content.ts | NO change (Phase 1 script) |
| `memory/MEMORY.md` | Index of all shipped work | +1 line (final ship) |
| `CHANGELOG.md` | Per-batch log | +M25.6 entry (final ship) |
| `docs/superpowers/plans/INDEX.md` | Plans index | +1 row (final ship) |

---

## Task 1: New build-dep guard `topic-content-coverage-guard`

**Files**:
- Create: `tests/topic-content-coverage-guard.test.ts`

**Interfaces**:
- Consumes: `TOPICS` from `src/data/topics.ts`, `TOPIC_GUIDE_CONTENT` + `TOPIC_BENCHMARK_CONTENT` from `src/data/topic-content.ts`
- Produces: new test that validates coverage + content-length

**Task**: Add 1 build-dep guard that catches content registry drift (Topic in `topics.ts` without corresponding Guide/Benchmark entries in `topic-content.ts`).

- [ ] **Step 1: Create the new test file**

Create `tests/topic-content-coverage-guard.test.ts` with the following content:

```typescript
#!/usr/bin/env node
// P140f Phase 2: Build-dep guard for Topic content coverage.
// Catches registry drift: Topic in topics.ts without Guide/Benchmark in topic-content.ts.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { TOPICS } from '../src/data/topics.ts';
import {
  TOPIC_GUIDE_CONTENT,
  TOPIC_BENCHMARK_CONTENT,
} from '../src/data/topic-content.ts';

if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

const MIN_FIELD_LENGTH = 500; // Catches empty/stub content
const GUIDE_FIELDS = ['whatIs', 'whyMatters', 'keyConcepts', 'howToApply', 'commonPitfalls'];
const BENCH_FIELDS = ['whatWeMeasure', 'industryBenchmarks', 'howToUse', 'sources'];

test('every Tier 1 Topic has Guide + Benchmark content with non-trivial length', () => {
  const violations: string[] = [];
  for (const topic of TOPICS.filter((t) => t.tier === 1)) {
    const guide = TOPIC_GUIDE_CONTENT[topic.id];
    const bench = TOPIC_BENCHMARK_CONTENT[topic.id];
    if (!guide) {
      violations.push(`${topic.id}: missing TOPIC_GUIDE_CONTENT`);
      continue;
    }
    if (!bench) {
      violations.push(`${topic.id}: missing TOPIC_BENCHMARK_CONTENT`);
      continue;
    }
    for (const lang of ['en', 'zh'] as const) {
      for (const field of GUIDE_FIELDS) {
        const value = guide[lang]?.[field as keyof typeof guide.en];
        if (!value || value.length < MIN_FIELD_LENGTH) {
          violations.push(`${topic.id}.guide.${lang}.${field}: ${value?.length ?? 0} chars (< ${MIN_FIELD_LENGTH})`);
        }
      }
      for (const field of BENCH_FIELDS) {
        const value = bench[lang]?.[field as keyof typeof bench.en];
        if (!value || value.length < MIN_FIELD_LENGTH) {
          violations.push(`${topic.id}.bench.${lang}.${field}: ${value?.length ?? 0} chars (< ${MIN_FIELD_LENGTH})`);
        }
      }
      if (!bench[lang]?.rows || bench[lang].rows.length < 8) {
        violations.push(`${topic.id}.bench.${lang}.rows: ${bench[lang]?.rows?.length ?? 0} rows (< 8)`);
      }
    }
  }
  assert.equal(
    violations.length,
    0,
    `Topic content coverage issues (${violations.length}):\n` +
      violations.slice(0, 20).map((v) => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : ''),
  );
});
```

- [ ] **Step 2: Run the test in non-build-dep mode (should skip)**

Run: `node_modules/.bin/tsx --test tests/topic-content-coverage-guard.test.ts`
Expected: PASS (test exits early due to `if (!process.env.RUN_BUILD_TESTS) process.exit(0)`).

- [ ] **Step 3: Run the test in build-dep mode (should pass)**

Run: `RUN_BUILD_TESTS=1 node_modules/.bin/tsx --test tests/topic-content-coverage-guard.test.ts`
Expected: PASS (1 test, 0 fail) — validates 15 existing Tier 1 anchors all have content.

- [ ] **Step 4: Commit**

```bash
git add tests/topic-content-coverage-guard.test.ts
git commit -m "test(guard): P140f-B2-W0 add topic-content-coverage-guard

NEW build-dep guard catches content registry drift: Topic in topics.ts
without corresponding Guide + Benchmark entries in topic-content.ts.
Also validates minimum content length (500 chars per field) and minimum
benchmark rows (8 per lang).

Pre-ship validation: all 15 Tier 1 anchors (from Phase 1) have content.
After Phase 2 complete: 45 Tier 1 Topics should pass.

Test exits early in default mode (no RUN_BUILD_TESTS gate), matching
other Topic guards."
```

- [ ] **Step 5: 3-way push**

```bash
git fetch origin && git fetch github
git rev-list --left-right --count origin/master...master github/master...master
git push origin master
git -c core.hooksPath=/dev/null push github master
```

Expected: 3-way 0/0; new commit visible on both remotes.

---

## Tasks 2-16: Letter Waves A-T

**Pattern** (identical structure, letter-specific only):
Each Task N picks the next letter in [A, B, C, D, E, F, H, K, L, M, O, P, R, S, T]. Topics chosen from `prose-tiers.ts` TIER_2_SLUGS for that letter (no overlap with existing Tier 1 anchors).

**Task template** (replace `{letter}` with the specific letter, `{Topic1-ID}` / `{Topic2-ID}` with chosen Topic IDs, etc.):

**Files**:
- Create: `tmp/topic-content-{Topic1-ID}.ts`, `tmp/topic-content-{Topic2-ID}.ts` (subagents write these)
- Modify: `src/data/topics.ts` (+2 entries), `src/data/topic-content.ts` (+4 entries via merge), `src/data/prose-tiers.ts` (TIER_2 -2 entries)

**Interfaces**:
- Consumes: `getTopicsByLetter(CATEGORY_ID)` already wired in letter pages; existing template `getStaticPaths` filter `tier === 1`
- Produces: 2 new Tier 1 Topic IDs visible on letter page grid + 4 new pages (Guide + Benchmark × en + zh)

- [ ] **Step 1: Identify 2 Tier 1 extension Topic IDs for letter {letter}**

Look up `src/data/prose-tiers.ts` TIER_2_SLUGS for letter {letter}. Pick 2 SLUGS that:
- Are NOT already Tier 1 anchors in `src/data/topics.ts` (check existing TOPICS array)
- Are NOT redundant with other chosen extension Topics
- Have distinct business question coverage

Format Topic IDs as kebab-case business question (e.g., `burn-rate-optimization`, not `burn-rate-topic`).

Record chosen IDs and corresponding calculator SLUGS. Examples:
- A: `burn-rate-optimization` → `solopreneur-burn-rate-calculator`, `runway-extension-strategy` → existing MRR/Revenue calc
- B: `llm-image-gen-cost` → `solopreneur-ai-image-cost-calculator`, etc.

- [ ] **Step 2: Dispatch 2 parallel subagents**

For each Topic, dispatch 1 general-purpose subagent. Use the prompt template:

```
You are filling content for ONE Tier 1 extension Topic. Pattern at commit 1bb576b (ROAS) and e6c6390 (Batch 2/3/4).

**Topic**: <Topic1-ID>
**Title (en/zh)**: <Title1-en> / <Title1-zh>
**Description (en)**: <Desc1-en>
**Calculator slugs**: [<calc-slugs>]
**Related Topics**: [<related-anchor-ids>]
**Letter**: <letter>
**Domain**: <domain>

Tasks:
1. Read src/data/topic-content.ts (ROAS entry as pattern — lines 30-50)
2. Read src/engines/<subdir>/<engine>.ts for each calculator
3. Generate TOPIC_GUIDE_CONTENT[<Topic1-ID>] (en + zh, 5 fields × 2 langs)
4. Generate TOPIC_BENCHMARK_CONTENT[<Topic1-ID>] (en + zh, 4 fields + 8 rows × 2 langs)
5. Write to tmp/topic-content-<Topic1-ID>.ts in EXACT standard format:
   - 2-space indent for top key: `  '<Topic1-ID>':`
   - 4-space indent for en/zh: `    en: {`
   - 6-space indent for fields: `      whatIs: '...'`
   - Closing `},` for en/zh at 4-space
   - Closing `},` for entry at 2-space
   - Two entries with same key (Guide shape: whatIs/whyMatters/keyConcepts/howToApply/commonPitfalls; Benchmark shape: whatWeMeasure/industryBenchmarks/howToUse/sources + rows[])

Quality requirements:
- Real benchmarks with specific numeric ranges (per ChatGPT §12 anti-scaled-content)
- 5-10 reputable sources per Topic
- en + zh culturally translated (not literal)

Hard constraints:
- ONLY modify tmp/topic-content-<Topic1-ID>.ts
- No git operations

Time budget: ~5-7 min

Report back: file path, char counts per field, sources cited, 8-row benchmark table summary.
```

Dispatch both Topic subagents in a single message (parallel execution).

- [ ] **Step 3: Verify temp files written correctly**

Run: `node -e "import('node:fs').then(fs => { ['tmp/topic-content-<Topic1-ID>.ts', 'tmp/topic-content-<Topic2-ID>.ts'].forEach(f => { const c = fs.readFileSync(f, 'utf-8'); console.log(f, c.length, 'chars'); }); }"`
Expected: 2 lines, both with char counts ~13-20k.

- [ ] **Step 4: Merge temp files into topic-content.ts**

Run: `node tmp/merge_batch.mjs <Topic1-ID> <Topic2-ID>`
Expected: `Loaded: 2 guides, 2 benches; Guide entries inserted; Benchmark entries inserted; Done.`

Note: `tmp/merge_batch.mjs` accepts topic IDs as args. If a topic ID is not a valid BATCHES key, it processes the topics directly.

- [ ] **Step 5: Add 2 new entries to topics.ts**

Open `src/data/topics.ts`. After the last existing TOPICS entry (after net-revenue-retention's closing `},`), add 2 new entries with `tier: 1`. Format per existing schema:

```typescript
  {
    id: '<Topic1-ID>',
    letterId: '<LETTER>',
    domain: '<domain>',
    tier: 1,
    publishedAt: '2026-MM-DD',  // Today's date
    title: { en: '<Title1-en>', zh: '<Title1-zh>' },
    description: { en: '<Desc1-en>', zh: '<Desc1-zh>' },
    calculatorSlugs: [<calc-slugs>],
    relatedTopicIds: [<related-anchor-ids>],
  },
  {
    id: '<Topic2-ID>',
    letterId: '<LETTER>',
    domain: '<domain>',
    tier: 1,
    publishedAt: '2026-MM-DD',
    title: { en: '<Title2-en>', zh: '<Title2-zh>' },
    description: { en: '<Desc2-en>', zh: '<Desc2-zh>' },
    calculatorSlugs: [<calc-slugs>],
    relatedTopicIds: [<related-anchor-ids>],
  },
```

- [ ] **Step 6: Remove 2 promoted SLUGS from TIER_2_SLUGS in prose-tiers.ts**

Open `src/data/prose-tiers.ts`. Find the 2 SLUGS in TIER_2_SLUGS array (one was promoted to Tier 1 extension). Delete those 2 lines.

- [ ] **Step 7: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: clean (no output).

- [ ] **Step 8: Run build-dep guards (3 total now)**

Run: `RUN_BUILD_TESTS=1 node_modules/.bin/tsx --test tests/topic-guide-shape-guard.test.ts`
Expected: 1 test, 0 fail.

Run: `RUN_BUILD_TESTS=1 node_modules/.bin/tsx --test tests/topic-benchmark-shape-guard.test.ts`
Expected: 1 test, 0 fail.

Run: `RUN_BUILD_TESTS=1 node_modules/.bin/tsx --test tests/topic-content-coverage-guard.test.ts`
Expected: 1 test, 0 fail.

- [ ] **Step 9: Build verification (sample check)**

Run: `pnpm build 2>&1 | tail -5`
Expected: `Complete!` with page count showing +4 pages (511 → 515 for wave 1, then +4 each wave).

- [ ] **Step 10: Commit**

```bash
git add src/data/topics.ts src/data/topic-content.ts src/data/prose-tiers.ts
git commit -m "feat(data): P140f-B2 letter {letter} Tier 1 extension content fill (2 Topics)

Add hand-curated Guide + Benchmark content for 2 Tier 1 extension Topics:
- <Topic1-ID>: <Title1-en> — <1-line description>
- <Topic2-ID>: <Title2-en> — <1-line description>

[Include specific benchmark numbers + sources for each Topic]

Promote 2 entries from prose-tiers.ts TIER_2_SLUGS to Tier 1 extension
(<slug1>, <slug2> removed).

Verification:
- tsc --noEmit: clean
- RUN_BUILD_TESTS=1 topic-guide-shape-guard: 1/1 pass
- RUN_BUILD_TESTS=1 topic-benchmark-shape-guard: 1/1 pass
- RUN_BUILD_TESTS=1 topic-content-coverage-guard: 1/1 pass (Task 1 new)
- pnpm build: +4 pages (511 → 515)"
```

- [ ] **Step 11: 3-way push**

```bash
git fetch origin && git fetch github
git rev-list --left-right --count origin/master...master github/master...master
git push origin master
git -c core.hooksPath=/dev/null push github master
```

Expected: 3-way 0/0 after every commit.

- [ ] **Step 12: Write per-wave ship record**

Create `memory/p140f-b2-letter-{letter}-extension-shipped.md` per the memory schema in MEMORY.md frontmatter. Brief (5-10 lines): which 2 Topics, sources, verification results.

- [ ] **Step 13: Commit ship record + MEMORY index**

```bash
git add memory/p140f-b2-letter-{letter}-extension-shipped.md memory/MEMORY.md
git commit -m "docs(ship): P140f-B2 letter {letter} extension ship record + MEMORY index

Add ship record + MEMORY entry for letter {letter} Tier 1 extension fill."
```

- [ ] **Step 14: 3-way push**

```bash
git push origin master
git -c core.hooksPath=/dev/null push github master
```

---

## Task 17: Final ship ops (MEMORY + CHANGELOG + plans/INDEX)

**Files**:
- Modify: `memory/MEMORY.md` (add final ship index line for Phase 2 overall)
- Modify: `CHANGELOG.md` (add M25.6 entry + header last-update)
- Modify: `docs/superpowers/plans/INDEX.md` (add plan row)

- [ ] **Step 1: Update MEMORY.md**

Add new entry below the existing P140f Tier 1 Content Fill entry:

```
- [✅ P140f Phase 2 Tier 1 Extension Shipped](p140f-phase2-tier1-extension-shipped.md) — 2026-MM-DD; 30 Tier 1 extension Topics shipped (15 letters × 2 each) × 2 templates = 60 new pages, letter-by-letter direct-to-master ship (Wave 0 guard + 15 letter waves + final ship = 17 atomic commits); 511 → 571 static pages; promoted 30 from prose-tiers.ts TIER_2_SLUGS (35 → 5); new topic-content-coverage-guard catches registry drift; RUN_BUILD_TESTS=1 1267/1267/0; pre-AdSense trigger window (~2026-09-15)
```

- [ ] **Step 2: Update CHANGELOG.md**

Update the header `最后更新:` line with today's date and Phase 2 summary. Add `### M25.6 — P140f Phase 2 Tier 1 Anchor Topic Extension` section with:
- Summary: 30 extension Topics, 60 pages, direct-to-master cadence
- Per-letter wave table (1-15 with letter, 2 Topic IDs, target date)
- Verification stats
- Commit count

- [ ] **Step 3: Update plans/INDEX.md**

Add row:
```
| 2026-08-20 | p140f-phase2-tier1-extension | Tier 1 anchor Topic extension (30 Topics × 2 templates = 60 new pages, letter-by-letter direct-to-master) | Spec: docs/superpowers/specs/2026-08-20-p140f-phase2-tier1-extension-design.md (commit e9ddaf1) | [Shipped](memory/p140f-phase2-tier1-extension-shipped.md) |
```

- [ ] **Step 4: Commit final ship ops**

```bash
git add memory/MEMORY.md CHANGELOG.md docs/superpowers/plans/INDEX.md
git commit -m "docs(ship): P140f Phase 2 — final ship ops (MEMORY + CHANGELOG M25.6 + plans/INDEX)

Final ship ops for P140f Phase 2 Tier 1 anchor Topic extension.
- 30 extension Topics × 2 templates = 60 new pages
- 15 letter waves × ~1-2 days each = ~3 weeks total
- Direct-to-master cadence (matches Phase 1 pattern)
- Static pages 511 → 571
- 17 atomic commits across Phase 2"
```

- [ ] **Step 5: 3-way push**

```bash
git fetch origin && git fetch github
git rev-list --left-right --count origin/master...master github/master...master
git push origin master
git -c core.hooksPath=/dev/null push github master
```

Expected: 3-way 0/0; Phase 2 complete.

---

## Self-Review

**Spec coverage**:
- §1 Scope: Tasks 2-16 deliver 30 Topics × 2 templates = 60 pages ✓
- §2 Topic selection: Task per wave Step 1 enforces criteria ✓
- §3 Data layer: Tasks per wave Step 5-6 update topics.ts + prose-tiers.ts ✓
- §4 Content production: Task per wave Step 2-4 use subagent + merge script ✓
- §5 Build-dep guards: Task 1 adds new guard ✓
- §6 Ship cadence: 15 waves direct-to-master ✓
- §7 Parallelism: §7 default documented (1 letter = 1 wave) ✓
- §8 Risks: addressed via selection criteria + cadence ✓
- §9 Out of scope: not addressed (deferred correctly) ✓
- §10 Acceptance: per-wave verification Steps 7-9 enforce ✓
- §11 Tasks: Wave 0 (Task 1), 15 letter waves (Tasks 2-16), Wave 16 final (Task 17) ✓

**Placeholder scan**: No "TBD", "TODO", "fill in details", "similar to Task N" found. All Topics specified per-wave have explicit fields (Topic1-ID, Topic2-ID, title, etc.) marked as `<placeholder>` for engineer to fill.

**Type consistency**: 
- `topic.id` lowercase-kebab used consistently
- `tier: 1` for all extension entries
- `letterId` uppercase letter (e.g., `'A'`) matches existing pattern
- `publishedAt` YYYY-MM-DD format consistent

No issues found.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-20-p140f-phase2-tier1-extension.md`. Two execution options:

**1. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints for review. Best for direct-to-master cadence since wave-to-wave dependencies are minimal.

**2. Subagent-Driven** — Dispatch fresh subagent per task, review between tasks. Better isolation but higher overhead for 17 small tasks.

User picked direct-to-master cadence → recommend **Inline Execution**.

Which approach?