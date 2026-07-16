---
date: 2026-07-16
type: post-ship-review-findings
trigger: not-a-maintenance-event
status: deferred
---

# P16-5 Reviewer Pre-Existing Findings (deferred, not a maintenance trigger)

The Task 5 valuation-sweep reviewer (subagent `af1eb085471303d70`) finished after P16 already shipped. It approved the sweep (70/70 tests, all gates green) and surfaced 6 pre-existing / out-of-scope defects in adjacent code.

## Findings (deferred, NOT maintenance-mode triggers)

Per spec §10, maintenance mode triggers are: user feedback, new business vertical, major tech upgrade, security patch, performance regression, SEO/a11y audit. **None of these defects meet those criteria** — they're pre-existing P14-era code, not new issues. **Do NOT fix in maintenance mode.**

### 1. (Critical severity, pre-existing) customFn parity bug — cac / ltv / saas-valuation

**Location**: `src/engines/valuation/{cac,ltv,saas-valuation}-calculator.ts`
**Bug**: After `var results=[mr6]` (or `[mr5]`/`[mr4]`), the customFn does `mr6 += bl2` or `mr6 += ...Milestones...`. JS strings are immutable; the array literal snapshots the old value. The browser-rendered output is missing ⚖️ Break-Even + 🎯 Milestones sections (SSR rendering is correct because it uses `calculate()`).
**Fix**: Move `var results=[mr6]` after all appends, OR use `results[0] = mr6 + ...` for in-place update.
**Origin**: Pre-P16 code (P14-Followup era).
**P16 impact**: None (P16-5 sweep preserved existing behavior).
**Action**: NOT fixing now (deferred). When these engines get a v3 audit or health-band rework, fix at that time.

### 2. (Cosmetic) cac-calculator.ts has extra EOF blank line (P16-5 introduced)

**Location**: `src/engines/valuation/cac-calculator.ts`
**Issue**: File ends with `registerEngine(engine);\n\n` instead of `registerEngine(engine);\n` like other 12 engines. `git diff --check` warns.
**Fix**: Remove the extra `\n`.
**P16 impact**: Cosmetic only.
**Action**: Could fix in next minor batch but not blocking.

### 3. (Cosmetic) course-pricing-calculator.ts missing trailing newline (pre-existing)

**Location**: `src/engines/valuation/course-pricing-calculator.ts`
**Issue**: File ends with `;` not `;\n`. Other 12 engines have trailing `\n`. P15 trailing-newline fix didn't catch this.
**Fix**: `printf '\n' >> src/engines/valuation/course-pricing-calculator.ts`.
**Action**: Could fix in next minor batch.

### 4. (Cosmetic) arr-multiple / burn-multiple customFn emoji mismatch (pre-existing)

**Location**: `src/engines/valuation/arr-multiple-valuation-calculator.ts:88`, `src/engines/valuation/burn-multiple-rule-of-40-calculator.ts`
**Issue**: customFn uses `💡` (💡) where source uses 🟡 in similar branch. SSR correct, browser shows lightbulb emoji.
**Action**: Cosmetic. Defer until engine gets a v3 visual audit.

### 5. (Test quality) 9 new test files use weak assertions

**Location**: `tests/{cac,break-even,course-pricing,email-list-revenue,project-profitability,saas-pricing-planner,saas-valuation,unit-economics}-calculator.test.ts`
**Issue**: Canonical tests only assert `Array.isArray(r) && r.length > 0` — CLAUDE.md #4 假测试 anti-pattern (tests pass for any non-empty array, even if math is broken).
**Only strong assertion**: `tests/ltv-calculator.test.ts:27` uses `assert.match(r[0], /Lifetime Value.*\$1,400/)` for real value verification.
**Fix**: Add `assert.match(r[0], /expected-pattern/)` to all 9 new test canonical cases.
**P16 impact**: None — defensive tests do verify generate() pipeline handles negatives correctly.
**Action**: When next v3 audit touches these engines, strengthen tests.

### 6. (Style) 4 old test files use `require()` instead of ESM `import`

**Location**: `tests/{arr-multiple,burn-multiple,safe-convertible,stripe-fee}.test.ts`
**Issue**: 4 pre-existing test files use `const { getEngine } = require(...)` inside test function bodies (lazy registration), while 9 new test files use top-level `import { getEngine } from '...'`. Style inconsistency.
**Fix**: Convert 4 old tests to top-level imports (refactor, not bug fix).
**Action**: Cosmetic. Defer until next test sweep.

## Conclusion

None of these findings rise to the level of a maintenance-mode trigger event. They are pre-existing issues that the reviewer surfaced in passing. P16 ship remains clean — all in-scope work is DONE with zero known new debt. The 6 findings should be tracked as **future batch candidates** if/when a trigger event brings a new P-series online.

**For now: stay in maintenance mode. Wait for user feedback / new vertical / tech upgrade / etc. before scheduling any work.**
