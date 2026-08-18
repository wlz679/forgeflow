# P140d Tier Threshold Tightening Design

> **For agentic workers:** This spec tightens per-tier length thresholds for the 200 prose files in `src/content/tools/`. The P140c-T4 guard (`tests/tier-prose-completeness-guard.test.ts`) currently passes with 2-3x headroom on every percentile — meaning real content drift like the 5 zh H2 violations found during P140c-T4 first run can recur without tripping the guard. P140d raises thresholds by ~+70% (C3 from candidate matrix), surfaces 31 real H2 gaps that need domain-specific expansion, and ships all content + updated guard in a single branch.

**Goal:** Raise per-tier length thresholds to C3 (~+70%) so the guard has real teeth, fill the 31 newly-surfaced H2 gaps with domain-specific prose (no LLM-fluff), and ship a tightened content quality bar.

**Architecture:** Single-file threshold change (`tests/tier-prose-completeness-guard.test.ts` 6 lines) + 31 prose file expansions (zh×30 + en×1). Total +1480 chars across 31 files. No new files. No new CI guards.

**Tech Stack:** Astro 4.16.19 content collection markdown, pnpm check (typecheck + test:run), RUN_BUILD_TESTS=1 build-dep gate.

---

## Global Constraints

- Per-tier thresholds target **C3 candidate** (+70% over P140c-T4 baseline). Specific values:
  - Tier-1 (15 anchors): en perH2 200→340 / total 800→1400; zh perH2 150→255 / total 600→1000
  - Tier-2 (35 mid): en perH2 130→220 / total 500→850; zh perH2 90→150 / total 350→595
  - Tier-3 (50 remaining): en perH2 100→170 / total 400→680; zh perH2 70→120 / total 250→425
- Each prose expansion adds **domain-specific content** (concrete facts, named methodologies, real-world comparisons) — no LLM-fluff (no "in today's fast-paced business environment", no padding with rephrasings of the same idea)
- Project standard: **single quotes** throughout (`src/data/categories.ts` pattern), trailing newline
- Tier-1 prose files use the same 4-H2 structure (intro / methodology / limitations / worked example) as P140b
- Content additions must respect E-E-A-T: factual claims cite known industry sources when applicable (OpenView SaaS benchmarks, McKinsey/BCG reports, public regulatory texts, etc.) — no invented statistics
- Run `pnpm check` after each commit; pass with `tests 12XX / pass 12XX / fail 0`
- Run `RUN_BUILD_TESTS=1 pnpm test:build` after threshold bump + after each batch — guard must pass with `tests 1262 / pass 1262 / fail 0` (1264 with the +1 file (memory))

---

## Architecture

### Current state (P140c)

```typescript
// tests/tier-prose-completeness-guard.test.ts:28-32
const TIER_THRESHOLDS = {
  1: { en: { perH2: 200, total: 800 }, zh: { perH2: 150, total: 600 } },
  2: { en: { perH2: 130, total: 500 }, zh: { perH2:  90, total: 350 } },
  3: { en: { perH2: 100, total: 400 }, zh: { perH2:  70, total: 250 } },
} as const;
```

Distribution percentiles (computed `scripts/prose-stats.mjs`, master HEAD `f14a21b`):

| Group | total p10/p25/p50/p75/p90 | minH2 p10/p25/p50/p75/p90 |
|-------|---------------------------|---------------------------|
| t1-en | 2517/2728/2973/3434/3734 | 377/472/518/587/616 |
| t1-zh | 1191/1255/1506/1838/1952 | 160/171/195/226/266 |
| t2-en | 2694/2826/2972/3298/3680 | 420/469/510/567/684 |
| t2-zh | 1230/1309/1526/1693/1860 | 141/172/191/218/250 |
| t3-en | 2739/3025/3267/3920/4203 | 461/487/589/665/698 |
| t3-zh | 1252/1447/1656/1850/2046 | 166/182/213/251/271 |

Tier-1 zh minH2 p10 = 160 is just 10 chars above the 150 threshold — the guard has **no real teeth** in this most-critical tier. P140c-T4 caught 5 zh H2 violations on first run only because those particular files happened to land below 150.

### Target state (P140d C3)

Bumping thresholds to C3 (+70%) flips the situation: current content has real gaps above the new bar, and the guard surfaces them as intended. Threshold change is in `tests/tier-prose-completeness-guard.test.ts:28-32` only (6 lines). Spec lists 31 specific H2 expansions required.

---

## Components

### 1. Threshold change

**File:** `tests/tier-prose-completeness-guard.test.ts` lines 28-32.

**Before:**
```typescript
const TIER_THRESHOLDS = {
  1: { en: { perH2: 200, total: 800 }, zh: { perH2: 150, total: 600 } },
  2: { en: { perH2: 130, total: 500 }, zh: { perH2:  90, total: 350 } },
  3: { en: { perH2: 100, total: 400 }, zh: { perH2:  70, total: 250 } },
} as const;
```

**After:**
```typescript
const TIER_THRESHOLDS = {
  1: { en: { perH2: 340, total: 1400 }, zh: { perH2: 255, total: 1000 } },
  2: { en: { perH2: 220, total: 850 },  zh: { perH2: 150, total: 595 } },
  3: { en: { perH2: 170, total: 680 },  zh: { perH2: 120, total: 425 } },
} as const;
```

### 2. The 31 H2 expansions

Computed by `scripts/prose-stats-target.mjs`. **31 H2 fail** across 31 files. Total +1480 chars. All zh except 1 en.

#### T1 zh (22 H2, 22 files — all 15 anchor pages have at least 1 fail)

| Slug | H2 idx | Current | Threshold | Need |
|------|--------|---------|-----------|------|
| roas-calculator | 0 | 246 | 255 | +9 |
| nrr-calculator | 2 | 245 | 255 | +10 |
| openai-token-calculator | 2 | 244 | 255 | +11 |
| pipeline-value-calculator | 0 | 226 | 255 | +29 |
| mrr-calculator | 0 | 223 | 255 | +32 |
| kb-coverage-rate-calculator | 0 | 218 | 255 | +37 |
| employee-cost-calculator | 0 | 213 | 255 | +42 |
| gdpr-fine-calculator | 2 | 213 | 255 | +42 |
| nrr-calculator | 0 | 209 | 255 | +46 |
| roas-calculator | 2 | 203 | 255 | +52 |
| kb-coverage-rate-calculator | 2 | 195 | 255 | +60 |
| inventory-turnover-calculator | 0 | 191 | 255 | +64 |
| mortgage-calculator | 2 | 189 | 255 | +66 |
| employee-cost-calculator | 2 | 187 | 255 | +68 |
| cost-per-support-ticket-calculator | 2 | 180 | 255 | +75 |
| mortgage-calculator | 0 | 177 | 255 | +78 |
| freelance-rate-calculator | 0 | 175 | 255 | +80 |
| mrr-calculator | 2 | 171 | 255 | +84 |
| funnel-step-calculator | 2 | 169 | 255 | +86 |
| inventory-turnover-calculator | 2 | 161 | 255 | +94 |
| funnel-step-calculator | 0 | 160 | 255 | +95 |
| cost-per-support-ticket-calculator | 0 | 154 | 255 | +101 |

#### T1 en (1 H2, 1 file)

| Slug | H2 idx | Current | Threshold | Need |
|------|--------|---------|-----------|------|
| mrr-calculator | 2 | 330 | 340 | +10 |

#### T2 zh (6 H2, 6 files)

| Slug | H2 idx | Current | Threshold | Need |
|------|--------|---------|-----------|------|
| resolution-time-calculator | 0 | 146 | 150 | +4 |
| reorder-point-calculator | 2 | 141 | 150 | +9 |
| resolution-time-calculator | 2 | 129 | 150 | +21 |
| churn-rate-calculator | 2 | 127 | 150 | +23 |
| first-response-time-calculator | 0 | 119 | 150 | +31 |
| first-response-time-calculator | 2 | 100 | 150 | +50 |

#### T3 zh (2 H2, 2 files)

| Slug | H2 idx | Current | Threshold | Need |
|------|--------|---------|-----------|------|
| deflection-rate-calculator | 2 | 93 | 120 | +27 |
| support-capacity-planning-calculator | 2 | 76 | 120 | +44 |

**Total: 31 expansions, +1480 chars across 31 files.**

### 3. Expansion quality bar (per H2 fix)

Each H2 expansion adds **domain-specific content** following the pattern from P140c-T4's 5 zh H2 drift fix (memory reference: `p140c-eeat-completion-shipped.md` §"Drive-by discipline notes"):

> Each expansion added specific domain knowledge (OpenView ARR-tier breakdown, DTC vs B2B ROAS variance, CSAT/FRT as complementary dimensions, etc.) — no LLM-fluff.

Examples of acceptable expansion (from P140c-T4 fix):
- `mrr.zh` intro (121→223): added specific OpenView ARR-tier context (early-stage vs growth vs enterprise benchmarks)
- `roas.zh` intro (148→246): added DTC vs B2B ROAS variance (DTC breakeven ~2-3x vs B2B SaaS ~3-5x)
- `cost-per-support-ticket.zh` limitations (127→180): added specific industry benchmark ranges
- `resolution-time.zh` limitations (89→129): added CSAT/FRT complementary dimensions

Anti-patterns to avoid:
- Repetition of the same idea with different words
- Generic statements like "in today's fast-paced business environment"
- Padding with examples that don't add domain knowledge
- Adding "this is important because" boilerplate

### 4. New ship record

`memory/p140d-tier-threshold-tightening-shipped.md` — record:
- 1 threshold-change commit + 3 batch commits + 1 ship record commit
- pnpm check / RUN_BUILD_TESTS=1 verification
- Lessons learned (e.g., en already well-padded so C3 mostly affects zh — tightening is asymmetric; recommend monitoring for zh drift in future batches)

---

## Workflow

### Pre-flight: verify distribution + identify exact H2 gaps

```bash
node_modules/.bin/tsx scripts/prose-stats.mjs          # current distribution
node_modules/.bin/tsx scripts/prose-stats-target.mjs   # exact 31 H2 fail list
```

Expected: 31 H2 fail at C3 thresholds (already validated in this spec).

### Commit 1 — threshold bump

```bash
# Edit tests/tier-prose-completeness-guard.test.ts lines 28-32 to C3 values
# Verify: RUN_BUILD_TESTS=1 node_modules/.bin/tsx --test tests/tier-prose-completeness-guard.test.ts
# Expect: FAIL with 31 H2 violations (or per-tier message)
git add tests/tier-prose-completeness-guard.test.ts
git commit -m "feat(guard): P140d-T1 bump tier length thresholds to C3 (+70%)

P140c-T4 thresholds (T1 zh perH2 150, etc.) had 2-3x headroom on every
percentile, meaning real drift like the 5 zh H2 violations found during
P140c-T4 first run could recur without tripping the guard. Bump to C3
(+70%) so the guard has real teeth.

C3 thresholds:
  T1: en perH2 200→340 / total 800→1400; zh perH2 150→255 / total 600→1000
  T2: en perH2 130→220 / total 500→850; zh perH2 90→150 / total 350→595
  T3: en perH2 100→170 / total 400→680; zh perH2 70→120 / total 250→425

Computed via scripts/prose-stats-target.mjs:
- 22 T1 zh H2 + 6 T2 zh H2 + 2 T3 zh H2 + 1 T1 en H2 = 31 gaps
- Total +1480 chars across 31 files

Will be filled in commits 2-4. This commit intentionally fails the guard
to surface the gap set."
```

### Commit 2 — T1 zh batch (22 H2 expansions across 22 files)

For each of 22 files, expand the failing H2 with domain-specific content. Subagent per file (parallel-safe).

Example subagent dispatch for `cost-per-support-ticket-calculator.zh H2[0]` (currently 154 chars, need +101 → target ≥ 255 chars):

> Expand `src/content/tools/solopreneur-cost-per-support-ticket-calculator.zh.md` H2 section at index 0 (intro, currently 154 chars after frontmatter removal) to ≥255 chars after frontmatter. Add specific industry knowledge: SaaS support cost benchmarks per Zendesk/Salesforce benchmarks, ticket cost range $15-50 for B2B SaaS, cost drivers (headcount, tooling, training), etc. No LLM-fluff. Match existing tone. Don't change other sections. Commit when done.

Each subagent: 1 file edit + 1 commit. Or 1 combined commit with all 22 if we trust individual review (recommended: subagent per file for quality control, but land as single combined commit at end).

### Commit 3 — T2 zh batch (6 H2 expansions across 6 files)

Same pattern. 6 subagents → 1 commit.

### Commit 4 — T3 zh + T1 en batch (3 H2 expansions across 3 files)

Same pattern. 3 subagents → 1 commit.

### Commit 5 — ship record + 3-way push

`memory/p140d-tier-threshold-tightening-shipped.md` + MEMORY.md index + plans/INDEX.md row + 3-way push.

```bash
# Verify final state
pnpm check 2>&1 | tail -3                                              # 1244/0/0
RUN_BUILD_TESTS=1 pnpm test:build 2>&1 | grep -E "^# (tests|pass|fail)"  # 1262/1262/0
git rev-list --left-right --count origin/master...master                  # 0
git rev-list --left-right --count github/master...master                  # 0
```

---

## Ship Plan

| # | Commit | Subject prefix | Files |
|---|--------|----------------|-------|
| 1 | T1 | `feat(guard):` | `tests/tier-prose-completeness-guard.test.ts` |
| 2 | T2 | `fix(i18n):` | 22 zh files (T1 batch) |
| 3 | T3 | `fix(i18n):` | 6 zh files (T2 batch) |
| 4 | T4 | `fix(i18n):` | 2 zh + 1 en files (T3 zh + T1 en batch) |
| 5 | ship | `docs(ship):` | `memory/p140d-*.md` + `memory/MEMORY.md` + `docs/superpowers/plans/INDEX.md` |

5 atomic commits on `feature/p140d-tier-threshold-tightening` (off master `f14a21b`).

Branch strategy: single PR. Commit 1 intentionally fails guard (CI red between commits 1 and 4 is acceptable — single branch, not split).

Subagent count: ~30 (22 T1 + 6 T2 + 3 small batch, each expand + verify). Plus 1 final review.

Time estimate: ~3-4 hours (31 expansions × ~5 min + review + ship).

---

## Self-Review

### Spec coverage

- Threshold change: §Architecture + §Components §1 ✓
- 31 H2 list: §Components §2 ✓
- Quality bar: §Components §3 ✓
- Ship record: §Components §4 ✓
- Workflow: §Workflow (5 steps) ✓
- Ship plan: §Ship Plan (5 commits table) ✓

### Placeholder scan

- No "TBD" / "TODO" / "fill in details"
- All concrete thresholds specified
- All 31 H2 listed with file + idx + chars + threshold + need

### Internal consistency

- Thresholds in §Global Constraints match §Architecture match §Components §1
- 31 H2 count matches §Components §2 sum (22+1+6+2=31) ✓
- Subagent count matches §Ship Plan (30 expanders + 1 final review = 31) ✓

### Scope check

- Single batch, single PR, single branch — focused
- No unrelated refactoring

### Ambiguity check

- "domain-specific content" defined in §Components §3 with examples + anti-patterns
- H2 idx is 0-based — matches `extractH2Bodies` in guard (slice(1) drops intro/preamble, then map index)

---

## Related

- `memory/p140c-eeat-completion-shipped.md` — pattern reference (5 zh H2 drift fix)
- `docs/superpowers/specs/2026-08-18-p140c-eeat-completion-design.md` — tier system origin
- `tests/tier-prose-completeness-guard.test.ts` — guard being modified
- `scripts/prose-stats.mjs` + `scripts/prose-stats-target.mjs` — measurement scripts