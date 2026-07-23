# Task 4 Report — Update 3 test file import paths

## 1. Status

DONE

## 2. Edit commands run (per file)

**File 1:** `tests/course-pricing-calculator.test.ts`
- old_string: `import '../src/engines/valuation/course-pricing-calculator.ts';`
- new_string: `import '../src/engines/freelance/course-pricing-calculator.ts';`

**File 2:** `tests/email-list-revenue-calculator.test.ts`
- old_string: `import '../src/engines/valuation/email-list-revenue-calculator.ts';`
- new_string: `import '../src/engines/freelance/email-list-revenue-calculator.ts';`

**File 3:** `tests/project-profitability-calculator.test.ts`
- old_string: `import '../src/engines/valuation/project-profitability-calculator.ts';`
- new_string: `import '../src/engines/freelance/project-profitability-calculator.ts';`

## 3. `grep -n` verification

**Step 2a — stale valuation paths:**
```bash
grep -nE "src/engines/valuation/(course-pricing|email-list-revenue|project-profitability)" tests/*.test.ts || echo "OK: no stale valuation paths"
```
Output:
```
OK: no stale valuation paths
```

(Note: the brief used bare `grep -n` without `-E`; that returns 0 matches because BRE treats parentheses as literals. With `-E` for proper alternation support, the result is the same — 0 matches, "OK: no stale valuation paths". Either form confirms the invariant.)

**Step 2b — fresh freelance paths:**
```bash
grep -nE "src/engines/freelance/(course-pricing|email-list-revenue|project-profitability)" tests/*.test.ts
```
Output:
```
tests/course-pricing-calculator.test.ts:3:import '../src/engines/freelance/course-pricing-calculator.ts';
tests/email-list-revenue-calculator.test.ts:3:import '../src/engines/freelance/email-list-revenue-calculator.ts';
tests/project-profitability-calculator.test.ts:3:import '../src/engines/freelance/project-profitability-calculator.ts';
```

3 fresh freelance paths confirmed on line 3 of each file.

## 4. Step 3 smoke check

**Command:**
```bash
pnpm exec node --import tsx --test tests/course-pricing-calculator.test.ts tests/email-list-revenue-calculator.test.ts tests/project-profitability-calculator.test.ts 2>&1 | tail -25
```

**Tail-25 output:**
```
  ...
# Subtest: project-profitability: canonical $10K rev / 100 hrs / $50/hr / $500 materials → profit
ok 7 - project-profitability: canonical $10K rev / 100 hrs / $50/hr / $500 materials → profit
  ---
  duration_ms: 19.0969
  ...
# Subtest: project-profitability: zero hours returns projection
ok 8 - project-profitability: zero hours returns projection
  ---
  duration_ms: 0.2483
  ...
# Subtest: project-profitability: negative inputs clamp to 0 (defensive layer 2)
ok 9 - project-profitability: negative inputs clamp to 0 (defensive layer 2)
  ---
  duration_ms: 0.2854
  ...
1..9
# tests 9
# suites 0
# pass 9
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 691.1946
```

Result: **9 pass / 0 fail / 0 skipped**. No functional regression. Engine registration via sub-barrel + path resolution works after the move.

## 5. Concerns

None. Working tree is dirty (per plan: T8 is the single atomic commit). 3 edits applied, 0 stale paths, 9/9 smoke tests pass.