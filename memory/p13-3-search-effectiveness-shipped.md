---
date: 2026-07-12
commit: 00cbd6c
engine: search-effectiveness-calculator
category: K (Knowledge/Documentation)
series: P13
status: shipped
---

# P13-3 Search Effectiveness Calculator — Shipped

## What shipped

- **Engine:** `src/engines/knowledge/search-effectiveness-calculator.ts` (NEW, 124 lines)
- **Tests:** `tests/search-effectiveness-calculator.test.ts` (NEW, **13 math tests**)
- **ToolMeta:** `src/data/tools/knowledge.ts` third entry
- **OG sample:** `src/data/og-samples.json` en + zh
- **Codegen:** `scripts/codegen-examples.mjs` ENGINES entry
- **Bumps:** `tests/ab-split.test.ts` 88→89 (engines + tools); `tests/internal-links.test.ts` 88→89
- Engine count: 88 → **89** (P13 series on track for 92 final)

## Inputs (4)

| name | label | type |
|---|---|---|
| total_searches | Monthly in-app searches | number |
| searches_with_click | Searches with click | number |
| searches_no_result | Searches with no result | number |
| industry_benchmark | Industry (B2B SaaS / Consumer) | select |

## Math

- `ctr = with_click / total_searches` (zero divisor guard → 0)
- `no_result_rate = searches_no_result / total_searches` (zero divisor guard → 0)
- `abandoned_searches = max(0, total - with_click - no_result)`
- `lift_to_excellent = max(0, 0.85 * total - with_click)` (What-If)
- `fewer_tickets = lift_to_excellent * 0.5` (~50% click-to-ticket-prevention, K-3 specific)
- `no_res_lift = max(0, 0.05 * total - no_res)` (Break-Even)

## HEALTH_BANDS (composite dual-threshold, tiered cascade)

- 🟢 excellent: CTR ≥ 85% AND no-result ≤ 5%
- 🟡 good:      CTR ≥ 70% AND no-result ≤ 10%
- 🟠 warning:   CTR ≥ 55% AND no-result ≤ 20%
- 🔴 critical:  both tier fails (CTR < 55% AND no-result > 20%)

`calcHealthBand(ctr, noResult)` — 2-arg composite signature (NOT 1-arg like K-1 K-2).

## Canonical (per spec §3.3)

`total=12000, with_click=9000, no_result=960, industry='B2B SaaS'`
→ CTR 75% / no-result 8% → 🟡 **Good** (75≥70 AND 8≤10) · 1,200 lift to excellent → 600 fewer tickets/mo at 50% click-to-ticket-prevention.

## Lessons

1. **Resume-without-context recovery**: previous implementer bailed after creating 2/8 files. Sufficient context was in `task-4-brief.md` (85 lines) + reference engine `kb-coverage-rate-calculator.ts` + reference `customer-support.ts` ToolMeta pattern. Read brief FIRST, then resume — no need to re-discover.

2. **Brief internal-contradiction caught**: brief said `(0.85, 0.06) → critical` and `(0.84, 0.05) → critical` (strict OR-fail at every level), but engine implements **tiered cascade** matching brief's own "so use:" code block. With cascade:
   - (0.85, 0.06): excellent fails (0.06 > 0.05) → drops to good (0.85≥0.70 AND 0.06≤0.10 ✓) → **good**, not critical
   - (0.84, 0.05): excellent fails (0.84 < 0.85) → drops to good (0.84≥0.70 AND 0.05≤0.10 ✓) → **good**, not critical
   - Tests must reflect actual engine behavior, not brief narrative. Brief's "critical the moment EITHER fails" oversimplification applies only at the warning→critical boundary (both AND/OR alike agree there).

3. **2-arg vs 1-arg calcHealthBand signature**: K-1, K-2 use `calcHealthBand(coverage)` (1-arg single-metric). K-3 uses `calcHealthBand(ctr, noResult)` (2-arg composite dual-metric). Test #13 asserts `calcHealthBand.length === 2` to lock signature — prevents future refactor drift.

4. **Tiered cascade semantics** (duplicate of K-4 K-5 K-6 pattern): engine code matches brief "so use:" template exactly. Failure at higher tier drops to next tier where BOTH thresholds must still hold. Critical reachable ONLY when both warning thresholds fail. This is mathematically what `if-else if-else if-else` does — well-known ladder pattern.

5. **Codegen-exit-0 contract**: `node scripts/codegen-examples.mjs --check` exit 0 (= no drift) is the pre-commit gate that auto-validates `staticExamples[0]` matches `generate()` output. Without this, `staticExamples[0]` could be hand-out-of-date (the v3 bug from commit 1385725 in CLAUDE.md). Always run codegen once after `generate()` changes.

6. **internal-links.ts is auto-generated** (per P9-0 + P9-1 lessons): runtime `for tool of tools` loop computes related entries from keywords + category. NO manual edit of `src/data/internal-links.ts` needed — only the test count assertion bumps. Verified by `wc -l` = 56 lines of pure logic (no tool data).

## Verification

- `node --import tsx tests/search-effectiveness-calculator.test.ts` → **13/13 pass**
- `node --import tsx tests/ab-split.test.ts` → 89 engines + 89 tools pass
- `node --import tsx tests/internal-links.test.ts` → 89 keys + 4-each related lists pass
- `node scripts/codegen-examples.mjs --check` → **89/89 PASS exit 0**
- Engine imports cleanly via tsx (TS source parses, `HEALTH_BANDS` + `calcHealthBand` + `ctr` + `noResultRate` + `abandonedSearches` all exported)
- Both `git push origin HEAD` and `git push github HEAD` → both `git rev-list ...HEAD` = 0 ahead
- Memory file `p13-3-search-effectiveness-shipped.md` (this) + MEMORY.md index updated

## File paths (absolute)

- Engine: `D:\E\独立站\youtube-tools\src\engines\knowledge\search-effectiveness-calculator.ts`
- Tests: `D:\E\独立站\youtube-tools\tests\search-effectiveness-calculator.test.ts`
- ToolMeta: `D:\E\独立站\youtube-tools\src\data\tools\knowledge.ts`
- OG: `D:\E\独立站\youtube-tools\src\data\og-samples.json`
- Codegen: `D:\E\独立站\youtube-tools\scripts\codegen-examples.mjs`
- Index barrel: `D:\E\独立站\youtube-tools\src\engines\knowledge\index.ts`
- Memory: `D:\E\独立站\youtube-tools\memory\p13-3-search-effectiveness-shipped.md` (this file)
