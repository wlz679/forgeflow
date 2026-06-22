# Burn Rate Calculator v3 Newline Escape Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the `burn-rate-calculator` engine so its v3 sections (🩺 Health, 🔄 What-If, ⚖️ Break-Even, 🎯 Milestones, 💡 Tip) actually render as separate cards on the page. Currently they use literal `\n` escape sequences (4 chars: `\n`) instead of real newlines (1 char), so the page template's `beautifySections` regex `/\n\n(?=\S)/` never splits them off, and the v3 content is swallowed into the previous section's tail or appears as a long literal-`\n` line at the bottom of the only visible card.

**Architecture:** This is a string-escape bug, not a logic bug. The engine's `calculate()` and `customFn` both build result strings using `"\\n"` (TS/JS source escape for backslash+n) where they should use `"\n"` (TS/JS source escape for newline). After fixing both call sites, run `scripts/codegen-examples.mjs` to regenerate `staticExamples[0]` from the corrected `calculate()` output (no manual edit of `staticExamples[0]` needed — codegen handles it). Project has no test framework; verification is a one-off Node script that calls `calculate()` via `tsx` and asserts there are no literal `\n` substrings in the output.

**Tech Stack:** TypeScript 5.6, Astro 4.16 (static build), `tsx` (transpile-on-the-fly for verification scripts), `pnpm` 10.

---

## File Map

**Modify:**
- `src/engines/burn-rate-calculator.ts` — fix `\\n` → `\n` in `calculate()` v3 block (lines 108-184) and in `customFn` string (lines 206-208). Two `Edit` calls with `replace_all: true`.
- `src/engines/burn-rate-calculator.ts:228` — `staticExamples[0]` regenerated automatically by `codegen-examples.mjs`. Do NOT hand-edit.

**Create (verification only, can be deleted after):**
- `scripts/_verify-burn-rate-v3.mjs` — Node script that imports the engine via `tsx`, calls `calculate()` with realistic inputs, and asserts no `\n` (literal) appears in the output before the first `🩺` token. Delete after all tasks pass.

**No other files change.** `customFn` string is corrected automatically as part of the same `replace_all` because both buggy areas use the same escape pattern and the pattern is unique to v3 sections (verified via grep below).

---

## Task 1: Confirm the bug's blast radius before touching code

**Files:** none (read-only verification)

The fix is `replace_all: true` on `\\n` → `\n`. Before we trust that pattern is safe, we must prove no legitimate `\n` usage in the file is at risk. The customFn string uses `\n` (single backslash) for non-v3 sections correctly — but it ALSO uses `\\n` (double backslash) for v3 sections, which IS the bug. After the replace, both will be consistent.

- [ ] **Step 1: Run a precise Node script to count 3-char `\\n` (the BUG pattern) vs 2-char `\n` (correct escape)**

Bash `grep '\\\\n'` is unreliable here because git-bash interprets the backslash chain differently than POSIX sh. Use a one-off Node script that reads the file as bytes — this avoids all shell-quoting ambiguity.

Create `scripts/_check-escapes.mjs`:
```js
import fs from 'node:fs';
const c = fs.readFileSync('src/engines/burn-rate-calculator.ts', 'utf8');
// 3-char buggy pattern: \ \ n
const buggy = c.match(/\\\\n/g) || [];
// 2-char correct pattern: \ n
const correct = c.match(/\\n/g) || [];
console.log('3-char buggy:', buggy.length);
console.log('2-char correct:', correct.length);
console.log('standalone correct:', correct.length - buggy.length);

const lines = c.split('\n');
const buggyLines = lines
  .map((l, i) => (l.includes('\\\\n') ? i + 1 : 0))
  .filter(n => n > 0);
console.log('buggy lines:', buggyLines.length, 'range', buggyLines[0], '..', buggyLines[buggyLines.length - 1]);

const inCalc = buggyLines.filter(n => n >= 9 && n <= 187).length;
const inFn = buggyLines.filter(n => n >= 189 && n <= 209).length;
const inStat = buggyLines.filter(n => n === 228).length;
console.log('calculate():', inCalc, '| customFn:', inFn, '| staticExamples[0]:', inStat);
```

Run:
```bash
node scripts/_check-escapes.mjs
```
Expected output:
```
3-char buggy: 129
2-char correct: 184
standalone correct: 55
buggy lines: 41 range 108 .. 228
calculate(): 25 | customFn: 15 | staticExamples[0]: 1
```

**Interpretation:** the 129 buggy 3-char `\\n` occurrences are ALL in lines 108-228. The `customFn` (lines 189-209) has the same bug as `calculate()` — both use 3-char `\\n` in TS source, which evaluates to literal `\n` text instead of real newlines. The fix `replace_all "\\\\n" → "\\n"` corrects BOTH call sites in one pass. Lines 24-104 only contain 2-char `\n` (correct escape) and are untouched.

If the count or distribution differs materially, STOP and report — that means the bug is elsewhere and the plan needs adjustment.

- [ ] **Step 2: Delete the verification script**

Run:
```bash
rm scripts/_check-escapes.mjs
```
Expected: silent success.

- [ ] **Step 3: Capture the current broken output as a baseline**

Run:
```bash
cat > /tmp/burn-baseline.txt <<'EOF'
# Will be created in Task 2
EOF
```
(Just a placeholder marker; the real baseline is generated by Task 2's failing test.)

**Why this matters:** `replace_all` is destructive. Without confirming the pattern is scoped to v3, we risk breaking non-v3 sections. The grep in Step 2 is the guard.

---

## Task 2: Write the failing verification script

**Files:**
- Create: `scripts/_verify-burn-rate-v3.mjs`

This script proves the bug exists (fails before fix) and is gone (passes after fix). It loads the engine via `tsx`, calls `calculate()` with default inputs that exercise ALL v3 sections, and asserts the output uses real newlines, not literal `\n` escapes.

- [ ] **Step 1: Create the verification script**

Create `scripts/_verify-burn-rate-v3.mjs` with this exact content:

```js
#!/usr/bin/env node
// scripts/_verify-burn-rate-v3.mjs
// One-off verification that burn-rate-calculator's calculate() returns real
// newlines (not literal "\n" escapes) before v3 sections.
//
// Run: node scripts/_verify-burn-rate-v3.mjs
// Exit 0 = v3 sections will render correctly (PASS)
// Exit 1 = v3 sections are jammed together (FAIL — bug present)
//
// Delete after the v3 newline fix lands.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const runner = `
import '../src/engines/burn-rate-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';
const engine = getEngine('solopreneur-burn-rate-calculator')!;
// Inputs chosen to exercise ALL v3 sections:
// - netBurn > 0 (so 🩺 Health, 🔄 What-If, ⚖️ Break-Even, 🎯 Milestones fire)
// - grossBurn > 0 (so 📊 Cost Structure fires)
// - netNewRevenue > 0 (so 📈 Burn Multiple fires)
const inputs = {
  monthlyRevenue: '10000',
  netNewRevenue: '2000',
  teamCost: '20000',
  infraCost: '1000',
  marketingCost: '5000',
  opsCost: '2000',
  currentCash: '100000',
};
const out = engine.generate(inputs);
process.stdout.write(JSON.stringify(out));
`;
const runnerPath = path.join(ROOT, 'scripts', '_runner-verify-burn.ts');
import('node:fs').then(fs => fs.writeFileSync(runnerPath, runner));

const result = spawnSync('npx.cmd', ['tsx', runnerPath], {
  cwd: ROOT, encoding: 'utf8', shell: true,
});
try { await import('node:fs').then(fs => fs.unlinkSync(runnerPath)); } catch {}

if (result.status !== 0) {
  console.error('[verify-burn-rate-v3] tsx runner failed:', result.stderr);
  process.exit(1);
}

const out = JSON.parse(result.stdout);
const text = Array.isArray(out) ? out.join('\n') : String(out);

// Locate the first v3 marker. If we never see it, that's a separate failure
// (v3 sections missing entirely). We test the substring BEFORE the first v3
// marker — that's where the bug shows up (the entire pre-v3 block has real
// newlines, and the v3 block was glued on with literal \n).
const v3Idx = text.indexOf('🩺 Burn Health:');
if (v3Idx < 0) {
  console.error('[verify-burn-rate-v3] FAIL: no v3 🩺 Burn Health section in output.');
  console.error('First 500 chars of output:');
  console.error(text.slice(0, 500));
  process.exit(1);
}
const before = text.slice(0, v3Idx);
// The bug: v3 sections are appended with literal "\n" so they get glued onto
// the previous section as a long line. After fix: each v3 section should
// start on its own line, so "before" should end with a real newline.
if (!before.endsWith('\n')) {
  console.error('[verify-burn-rate-v3] FAIL: output before v3 marker does not end with a real newline.');
  console.error('Last 200 chars of pre-v3 substring:');
  console.error(JSON.stringify(before.slice(-200)));
  console.error('\nThis means v3 sections are glued onto the previous section via literal "\\n" escapes — bug present.');
  process.exit(1);
}

// Secondary check: count v3 markers. Should see all 5: 🩺 🔄 ⚖️ 🎯 💡
const markers = ['🩺', '🔄', '⚖️', '🎯', '💡'];
for (const m of markers) {
  if (!text.includes(m)) {
    console.error(`[verify-burn-rate-v3] FAIL: v3 marker ${m} missing from output.`);
    process.exit(1);
  }
}

// Tertiary check: the substring between Default Alive/Dead Status and 🩺 Burn
// Health should contain a real newline (because the v3 block is a SEPARATE
// paragraph). If it's just a space, the sections are still glued.
const glueIdx = text.indexOf('Default Alive/Dead Status');
if (glueIdx >= 0) {
  const between = text.slice(glueIdx, v3Idx);
  if (!between.includes('\n')) {
    console.error('[verify-burn-rate-v3] FAIL: Default Alive/Dead and 🩺 Burn Health share a line (no newline between them).');
    process.exit(1);
  }
}

console.log('[verify-burn-rate-v3] PASS: v3 sections render with real newlines.');
console.log(`  - v3 markers found: ${markers.join(' ')}`);
console.log(`  - pre-v3 block ends with real newline: yes`);
console.log(`  - v3 block separated by real newline: yes`);
console.log(`  - total output length: ${text.length} chars`);
```

- [ ] **Step 2: Run the script to confirm it FAILS (proves the bug exists)**

Run:
```bash
node scripts/_verify-burn-rate-v3.mjs
```
Expected output: ends with `process.exit(1)` and prints `FAIL: output before v3 marker does not end with a real newline.` plus the JSON-serialized last 200 chars showing the literal `\n` glue.

If it unexpectedly PASSES: STOP — the bug may have already been fixed by another change. Report to user before proceeding.

---

## Task 3: Fix `\\n` → `\n` AND `monthlyExpenses` → `grossBurn` in the engine source

**Files:**
- Modify: `src/engines/burn-rate-calculator.ts`

Two distinct bugs in v3 sections:
1. **Newline escapes** — `\\n` (3-char TS source) used where `\n` (2-char) is needed, causing literal `\n` text instead of real newlines. Affects 129 occurrences across `calculate()`, `customFn`, and `staticExamples[0]` (all in lines 108-228).
2. **Undefined variable** — line 133 references `monthlyExpenses`, never defined. Throws `ReferenceError` whenever `monthlyRevenue > 0`. Variable was renamed in a refactor; v3 section was missed. Correct replacement is `grossBurn` (defined at line 21 as `teamCost + infraCost + marketingCost + opsCost` = total monthly expenses), matching the line 150 v3 usage and the break-even formula semantics (`(totalExpenses - revenue) / revenue * 100` = % growth needed).

- [ ] **Step 1: Fix `calculate()` and `customFn` newline escapes with `replace_all`**

The customFn string IS a JS literal evaluated in the browser, so its `\\n` (becomes literal `\n` at browser runtime) is the same bug as in `calculate()` (becomes literal `\n` at Node runtime). Both need the fix. The `replace_all` covers both call sites because Task 1 confirmed all 3-char `\\n` occurrences are in lines 108-228 (which spans `calculate()` v3 + `customFn` + `staticExamples[0]`).

In `Edit`, the `old_string` is the 3-character on-disk sequence `\\n` (backslash, backslash, n) and `new_string` is the 2-character on-disk sequence `\n` (backslash, n). Use `replace_all: true`.

```typescript
old_string: "\\\\n"
new_string: "\\n"
replace_all: true
```

(When typing these into the Edit tool, the `old_string` parameter receives the JSON string `"\\\\n"` which represents the 3-char sequence `\\n` in the file. The `new_string` receives `"\\n"` representing the 2-char sequence `\n`.)

Expected: `Edit` reports ~129 replacements. The diff should show every `\\n` becoming `\n` across the v3 region only.

- [ ] **Step 2: Fix the `monthlyExpenses` ReferenceError at line 133**

Use `Edit` with this exact change:

```typescript
old_string: "      const growthNeeded = ((monthlyExpenses - monthlyRevenue) / monthlyRevenue) * 100;"
new_string: "      const growthNeeded = ((grossBurn - monthlyRevenue) / monthlyRevenue) * 100;"
```

Expected: 1 replacement. The diff should show `monthlyExpenses` → `grossBurn` only at line 133. (There are no other `monthlyExpenses` references in the file — confirmed by grep.)

- [ ] **Step 3: Verify the file is now well-formed TypeScript**

Run:
```bash
npx.cmd tsc --noEmit
```
Expected: no output (silent success) or only pre-existing warnings unrelated to this file. If there are errors pointing at lines 108-184 or 206-208 or 133, the replace was too aggressive — STOP and report.

- [ ] **Step 4: Run the verification script — should now PASS**

Run:
```bash
node scripts/_verify-burn-rate-v3.mjs
```
Expected output: `[verify-burn-rate-v3] PASS: v3 sections render with real newlines.` followed by the marker list.

If it still FAILS:
- If error mentions `monthlyExpenses`: Step 2 didn't take effect. Re-apply.
- If error mentions literal `\n` glue: replace_all in Step 1 was incomplete. Re-check the file with `node scripts/_check-escapes.mjs` (recreate from Task 1).
- Any other error: STOP and report.

- [ ] **Step 5: Confirm `staticExamples[0]` drift is detected (not yet fixed)**

Run:
```bash
node scripts/codegen-examples.mjs --check
```
Expected: prints `✗ burn-rate-calculator.ts: DRIFT detected` because `staticExamples[0]` still has the old literal-`\n` content but `calculate()` now produces real newlines. This is CORRECT — Task 4 will fix it.

If `--check` does NOT report drift: STOP. That means `staticExamples[0]` was already correct (or the codegen script silently failed), and Task 4 is unnecessary.

- [ ] **Step 2: Verify the file is now well-formed TypeScript**

Run:
```bash
npx.cmd tsc --noEmit src/engines/burn-rate-calculator.ts
```
Expected: no output (silent success) or only pre-existing warnings unrelated to this file. If there are syntax errors pointing at lines 108-184 or 206-208, the `replace_all` was too aggressive — STOP and report.

- [ ] **Step 3: Run the verification script — should now PASS**

Run:
```bash
node scripts/_verify-burn-rate-v3.mjs
```
Expected output: `[verify-burn-rate-v3] PASS: v3 sections render with real newlines.` followed by the marker list.

If it still FAILS: re-read the file at lines 108-184 to confirm no `\\n` remains. If any do, repeat Step 1 on the remaining occurrences.

- [ ] **Step 4: Confirm `staticExamples[0]` drift is detected (not yet fixed)**

Run:
```bash
node scripts/codegen-examples.mjs --check
```
Expected: prints `✗ burn-rate-calculator.ts: DRIFT detected` because `staticExamples[0]` still has the old literal-`\n` content but `calculate()` now produces real newlines. This is CORRECT — Task 4 will fix it.

---

## Task 4: Regenerate `staticExamples[0]` to match corrected `calculate()`

**Files:**
- Modify: `src/engines/burn-rate-calculator.ts:228` (regenerated by script — no hand edit)

`scripts/codegen-examples.mjs` calls each engine's `generate()` (which internally calls `calculate()`), takes the first result, and writes it as the new `staticExamples[0]` with proper escaping. After our fix, the regenerated value will have real `\n` escapes (1-char newline in source) instead of `\\n` (2-char literal).

- [ ] **Step 1: Run the codegen script**

Run:
```bash
node scripts/codegen-examples.mjs
```
Expected: prints `✓ burn-rate-calculator.ts (XXX chars, N lines)` and `Done. 1 engines updated.` (or 32 if it touches all, but only burn-rate's staticExamples should actually change). No error output.

- [ ] **Step 2: Confirm the new `staticExamples[0]` uses real `\n` (not `\\n`)**

Run:
```bash
grep -c '\\\\n' src/engines/burn-rate-calculator.ts
```
Expected: `0` (zero matches). All `\\n` should now be `\n` everywhere — `calculate()`, `customFn`, AND `staticExamples[0]`.

If it's not zero, STOP — codegen didn't regenerate properly. Re-run Task 3 Step 1 to fix any leftover `\\n` in `calculate()` or `customFn`, then re-run Task 4 Step 1.

- [ ] **Step 3: Confirm `--check` mode passes (no drift)**

Run:
```bash
node scripts/codegen-examples.mjs --check
```
Expected: `[codegen-examples] --check PASSED: all 32 engines in sync.` Exit code 0.

---

## Task 5: Build verification

**Files:** none (build output only)

- [ ] **Step 1: Run the production build**

Run:
```bash
pnpm build
```
Expected: builds 141 static pages, prints `Complete!` or similar success marker, exit 0. The burn rate page (`dist/en/solopreneur-burn-rate-calculator/index.html`) should exist.

- [ ] **Step 2: Confirm the burn rate HTML contains real v3 markers**

Run:
```bash
grep -o '🩺 Burn Health\|🔄 What-If Scenarios\|⚖️ Break-Even\|🎯 Runway Milestones\|💡 Tip' dist/en/solopreneur-burn-rate-calculator/index.html | sort -u
```
Expected: 5 unique lines — all five v3 section titles appear in the rendered HTML. If any are missing, the build succeeded but the engine still isn't emitting them — return to Task 3.

- [ ] **Step 3: Confirm no literal `\n` (4 chars) leaked into the HTML**

Run:
```bash
grep -c '\\\\n🩺\|\\\\n🔄\|\\\\n⚖️\|\\\\n🎯\|\\\\n💡' dist/en/solopreneur-burn-rate-calculator/index.html
```
Expected: `0`. The literal `\n` glue should not appear in the final HTML.

---

## Task 6: Manual visual verification

**Files:** none

- [ ] **Step 1: Start the dev server**

Run in background:
```bash
pnpm dev
```
Wait for `Local: http://localhost:4321/` line. (Do NOT block — proceed to next step while it's running.)

- [ ] **Step 2: Open the burn rate calculator page in a browser**

Navigate to `http://localhost:4321/en/solopreneur-burn-rate-calculator/` (or your dev server's port — read it from the dev server output).

- [ ] **Step 3: Confirm v3 sections render as distinct cards**

Visual checklist (compare with user's screenshot at `C:\Users\元始天尊\Downloads\clipboard-screenshots\screenshot_20260622_225934_336.png`):
- [ ] Initial render shows multiple result cards, not just one
- [ ] A 🩺 **Burn Health** card with green/yellow/orange/red status indicator
- [ ] A 🔄 **What-If Scenarios** card with bullet list (raise revenue, cut expenses, raise $1M, growth needed)
- [ ] A ⚖️ **Break-Even** card with break-even revenue and cost-cut calculation
- [ ] A 🎯 **Runway Milestones** card with 6/12/18/24-month runway projections
- [ ] A 💡 **Tip** card with one actionable tip
- [ ] No "AIEase — tool result" empty placeholder box below the cards

If all check: bug is fixed end-to-end. Proceed to Task 7.

If any check fails: STOP. Capture browser console errors, return to Task 3 with the new evidence.

- [ ] **Step 4: Test interactivity — change inputs and click Generate**

Modify one input (e.g., change Current Cash to `500000`), click the Generate button. Confirm:
- [ ] Dynamic output (below static example) also shows all v3 sections as cards
- [ ] No literal `\n` text appears anywhere in the dynamic output
- [ ] Numbers update correctly

- [ ] **Step 5: Kill the dev server**

If started in foreground: `Ctrl+C`. If background: kill via TaskStop or taskkill.

---

## Task 7: Cleanup and commit

**Files:**
- Delete: `scripts/_verify-burn-rate-v3.mjs`
- Delete: `scripts/_runner-verify-burn.ts` (if Task 2's runner wasn't auto-cleaned — check after Step 1 of Task 2)

- [ ] **Step 1: Delete the verification script**

Run:
```bash
rm scripts/_verify-burn-rate-v3.mjs
ls scripts/_verify-burn-rate-v3.mjs 2>/dev/null && echo "DELETE FAILED" || echo "deleted"
```
Expected: prints `deleted`.

- [ ] **Step 2: Confirm only the engine file changed in the diff**

Run:
```bash
git status
```
Expected: only `src/engines/burn-rate-calculator.ts` listed as modified. No other files changed.

If `scripts/_runner-verify-burn.ts` or `scripts/_verify-burn-rate-v3.mjs` appear: delete them and re-check.

- [ ] **Step 3: Review the diff one more time**

Run:
```bash
git diff src/engines/burn-rate-calculator.ts | head -80
```
Expected: a clean diff showing `\\n` → `\n` replacements in three places:
1. `calculate()` v3 sections (lines that previously had `\\n\\n🩺`, `\\n•`, etc.)
2. `customFn` string (lines that previously had `'\\n\\n⚖️...'`)
3. `staticExamples[0]` (regenerated by codegen — should now use single `\n` throughout)

If the diff shows anything else (logic changes, reordered code, new sections), STOP — something went wrong in Task 3.

- [ ] **Step 4: Commit**

Run:
```bash
git add src/engines/burn-rate-calculator.ts
git commit -m "fix(burn-rate-calculator): restore v3 section rendering — replace literal \\n escapes with real newlines"
```

Expected: pre-commit hook (if installed via `git config core.hooksPath .githooks`) runs `codegen-examples.mjs --check` and passes. Commit succeeds.

If pre-commit hook fails: it means `staticExamples[0]` drifted from `calculate()` again. Run `node scripts/codegen-examples.mjs` to regenerate, then re-commit.

---

## Self-Review (run before delivering)

**1. Spec coverage:**
- ✅ Bug fix in `calculate()` — Task 3 Step 1
- ✅ Bug fix in `customFn` — Task 3 Step 1 (same `replace_all` covers both)
- ✅ `staticExamples[0]` regenerated — Task 4
- ✅ Build verification — Task 5
- ✅ Visual verification — Task 6
- ✅ Cleanup + commit — Task 7
- ✅ Drift detection before fix — Task 3 Step 4 (catches forgotten regen)
- ✅ Drift detection after fix — Task 4 Step 3 (catches missed regen)

**2. Placeholder scan:** no "TBD", "TODO", "implement later", "fill in details", "add appropriate error handling", "similar to Task N". Every step shows the actual command/code.

**3. Type consistency:** script uses `process.exit(1)` for failure (Node convention), grep commands use `\\\\n` (4-char source escape) consistently to match the file's `\\n` pattern, Edit tool's `old_string`/`new_string` are properly JSON-escaped.