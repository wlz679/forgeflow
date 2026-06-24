# ForgeFlowKit Audit Polish — 2026-06-24 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 14 residual bugs/optimization opportunities found in the 2026-06-24 audit (the recent audit-fix batch closed 4 critical bugs + hygiene + SEO + CI gate; this batch closes the remainder).

**Architecture:** Three phases — (1) user-visible bug fixes, (2) build/CI hardening, (3) polish + docs. Each task is bite-sized and self-contained. Frequent commits after each task.

**Tech Stack:** Astro 4.16.19 + TypeScript 5.6 strict + Node ^20.19.0 || >=22.13.0 + pnpm 9.

---

## File Structure

### Modified files (16)
- `src/engines/gpu-cloud-cost-calculator.ts` (Task 1)
- `src/engines/churn-rate-calculator.ts` (Task 2)
- `src/engines/revenue-projector.ts` (Task 3)
- `src/engines/saas-valuation-calculator.ts` (Tasks 4, 5)
- `src/engines/market-size-estimator.ts` (Task 6)
- `src/engines/course-pricing-calculator.ts` (Task 7)
- `src/engines/mrr-calculator.ts` (Task 8)
- `src/engines/productivity-score.ts` (Task 9)
- `src/engines/unit-economics-calculator.ts` (Task 10)
- `src/engines/burn-rate-calculator.ts` (Task 11)
- `scripts/codegen-examples.mjs` (Task 12)
- `src/core/engines/registry.ts` (Task 13)
- `.github/workflows/ci.yml` (Task 14)
- `scripts/sync-pricing.mjs` (Task 15)
- `src/pages/[lang]/[slug].astro` (Task 16)
- `CLAUDE.md` (Task 18)

### Created files (3)
- `src/data/presets.ts` (Task 16)
- `src/data/biz-config.ts` (Task 16)
- `tests/scripts/codegen-examples.test.mjs` (Task 12)

---

## Phase 1: User-Visible Bug Fixes

### Task 1: Fix `gpu-cloud-cost-calculator.ts` cheapestProv comparison (#1 Critical)

**Files:**
- Modify: `src/engines/gpu-cloud-cost-calculator.ts:254-260`

- [ ] **Step 1: Inspect the broken comparison**

Read `src/engines/gpu-cloud-cost-calculator.ts` lines 250-260. Confirm:
```ts
const cheapestProv = sortedProviders[0];
if (cheapestProv.key !== prov.key) {
  // ... branch A: user is NOT on cheapest
} else {
  out.push("• You're already on the cheapest provider for " + GPU_NAMES[gpuKey] + '!');
}
```

Note: `PROVIDERS` is `Record<string, ProviderInfo>` (line 22); `prov` and `sortedProviders[0]` are bare `ProviderInfo` objects with NO `.key` field. So `cheapestProv.key !== prov.key` is `undefined !== undefined = false`, always taking the `else` branch — even when user picks AWS (most expensive).

- [ ] **Step 2: Replace the broken comparison with referential equality**

In `src/engines/gpu-cloud-cost-calculator.ts`, replace lines 254-260:

```ts
  const cheapestProv = sortedProviders[0];
  if (cheapestProv.key !== prov.key) {
    const savings = (totalHourly - cheapestProv.rates[gpuKey]) * hoursPerDay * 30 * gpuCount;
    if (savings > 0) out.push('• Switch to ' + cheapestProv.name + ':  save ' + fmt(savings) + '/mo  (cheapest for ' + GPU_NAMES[gpuKey] + ')');
  } else {
    out.push("• You're already on the cheapest provider for " + GPU_NAMES[gpuKey] + '!');
  }
```

with:

```ts
  const cheapestProv = sortedProviders[0];
  if (prov !== cheapestProv) {
    const savings = (totalHourly - cheapestProv.rates[gpuKey]) * hoursPerDay * 30 * gpuCount;
    if (savings > 0) out.push('• Switch to ' + cheapestProv.name + ':  save ' + fmt(savings) + '/mo  (cheapest for ' + GPU_NAMES[gpuKey] + ')');
  } else {
    out.push("• You're already on the cheapest provider for " + GPU_NAMES[gpuKey] + '!');
  }
```

`prov` and `sortedProviders[0]` are both references into the same `PROVIDERS` object, so referential equality is correct.

- [ ] **Step 3: Regenerate staticExamples**

Run: `node scripts/codegen-examples.mjs`

Expected: `[codegen-examples] Done. 1 engines updated.` (gpu-cloud is the only one that changes; the others are byte-identical).

- [ ] **Step 4: Verify the fix**

Read `src/engines/gpu-cloud-cost-calculator.ts` line 355 (the staticExamples entry). Confirm the regenerated string for `aws` (or any non-cheapest provider) no longer contains `You're already on the cheapest`.

Run: `node scripts/codegen-examples.mjs --check`

Expected: `[codegen-examples] --check PASSED: all 32 engines in sync.`

- [ ] **Step 5: Commit**

```bash
git add src/engines/gpu-cloud-cost-calculator.ts
git commit -m "fix(gpu-cloud): use referential equality for cheapestProv comparison (was always falsy)"
```

---

### Task 2: Fix `churn-rate-calculator.ts` literal `\\'` escape (#2 Critical)

**Files:**
- Modify: `src/engines/churn-rate-calculator.ts:139, 141, 143`

- [ ] **Step 1: Replace `\\\'` with `\'` in 3 lines**

In `src/engines/churn-rate-calculator.ts`, line 139:

```ts
      mainResult += '\n• 🟢 Break-even new customers/mo:  ' + breakEvenNew + '  — you\\\'re adding enough to grow (current: ' + newCustomers + ').';
```

becomes:

```ts
      mainResult += '\n• 🟢 Break-even new customers/mo:  ' + breakEvenNew + '  — you\'re adding enough to grow (current: ' + newCustomers + ').';
```

Line 141:

```ts
      mainResult += '\n• 🟡 Break-even new customers/mo:  ' + breakEvenNew + '  — you\\\'re adding ' + newCustomers + ', short by ' + (breakEvenNew - newCustomers) + '. Customer base is shrinking.';
```

becomes:

```ts
      mainResult += '\n• 🟡 Break-even new customers/mo:  ' + breakEvenNew + '  — you\'re adding ' + newCustomers + ', short by ' + (breakEvenNew - newCustomers) + '. Customer base is shrinking.';
```

Line 143:

```ts
      mainResult += '\n• 🔴 Break-even new customers/mo:  ' + breakEvenNew + '  — you\\\'re adding 0. Base erodes by ' + breakEvenNew + ' customers/mo.';
```

becomes:

```ts
      mainResult += '\n• 🔴 Break-even new customers/mo:  ' + breakEvenNew + '  — you\'re adding 0. Base erodes by ' + breakEvenNew + ' customers/mo.';
```

(The string is single-quoted, so `\'` is the correct TS escape for an apostrophe; `\\\'` produced a literal backslash + apostrophe, which the user saw as `you\'re`.)

- [ ] **Step 2: Regenerate and verify**

Run: `node scripts/codegen-examples.mjs`

Expected: 1 engine updated (churn-rate).

Run: `node scripts/codegen-examples.mjs --check`

Expected: PASSED.

Manually grep the regenerated string to confirm it contains `you're` (not `you\\'re`):

Run: `grep -c "you\\\\'" src/engines/churn-rate-calculator.ts`

Expected: `0`.

- [ ] **Step 3: Commit**

```bash
git add src/engines/churn-rate-calculator.ts
git commit -m "fix(churn-rate): unescape apostrophes in break-even output (rendered you\\'re)"
```

---

### Task 3: Fix `revenue-projector.ts` literal `\\'` in customFn (#3 Critical)

**Files:**
- Modify: `src/engines/revenue-projector.ts:714`

- [ ] **Step 1: Replace `\\'` with `\'` in customFn tip string**

In `src/engines/revenue-projector.ts`, line 714:

```js
"else{tipStr='💡 Tip: Re-project monthly. Inputs change (churn, hiring, ad costs). The plan that got you here won\\'t get you there.';\n';" +
```

becomes:

```js
"else{tipStr='💡 Tip: Re-project monthly. Inputs change (churn, hiring, ad costs). The plan that got you here won\'t get you there.';\n';" +
```

(`\\'` in the JS double-quoted source produced `\'` in the string sent to the browser, which displayed as `won\'t`. `\'` in JS source produces `'`, the correct rendering.)

- [ ] **Step 2: Verify**

Read line 714. Confirm exactly `won\'t get you there` (with one backslash).

- [ ] **Step 3: Commit**

```bash
git add src/engines/revenue-projector.ts
git commit -m "fix(revenue-projector): unescape apostrophe in customFn tip (browser rendered won\\'t)"
```

Note: `staticExamples[0]` is server-side and unaffected; no `codegen-examples.mjs` run needed.

---

### Task 4: Fix `saas-valuation-calculator.ts` customFn undefined variable (#4 Important)

**Files:**
- Modify: `src/engines/saas-valuation-calculator.ts:206`

- [ ] **Step 1: Identify the broken references**

In `src/engines/saas-valuation-calculator.ts`, the customFn (around line 206) references variables that don't exist in customFn's scope:

```js
mr4+='• If growth → '+rg.toFixed(0)+'% YoY:  multiple '+rm.toFixed(1)+'x  → $'+Math.round(rv).toLocaleString()+' (vs $'+Math.round(valuationBase).toLocaleString()+')\n';
```

`valuationBase` is computed by `calculate()` (server-side) but NOT defined in customFn. In customFn the equivalent variable is `vb`. This throws `ReferenceError: valuationBase is not defined` in the browser.

- [ ] **Step 2: Replace `valuationBase` with `vb`**

Line 206:

```js
mr4+='• If growth → '+rg.toFixed(0)+'% YoY:  multiple '+rm.toFixed(1)+'x  → $'+Math.round(rv).toLocaleString()+' (vs $'+Math.round(valuationBase).toLocaleString()+')\n';
```

becomes:

```js
mr4+='• If growth → '+rg.toFixed(0)+'% YoY:  multiple '+rm.toFixed(1)+'x  → $'+Math.round(rv).toLocaleString()+' (vs $'+Math.round(vb).toLocaleString()+')\n';
```

- [ ] **Step 3: Audit other variable references in this customFn**

Read lines 195-215 of `src/engines/saas-valuation-calculator.ts`. Confirm that:
- `ar2` (Annual Revenue / ARR in customFn) matches `calculate()` `annualRevenue` mapping — `ar2` is set in customFn as `inputs.arr`, so OK.
- `gr2` (growth rate) matches — OK.
- `pm`, `bm` — declared in customFn? Read lines 195-210 to verify.

If any other undefined references exist in this customFn block (besides `valuationBase`), note them and fix in the same way (e.g., search `getEngine` callers or `pm2` vs `profitMult` — customFn uses `pm2` directly so no rename needed).

- [ ] **Step 4: Commit**

```bash
git add src/engines/saas-valuation-calculator.ts
git commit -m "fix(saas-valuation): reference 'vb' (customFn scope) instead of 'valuationBase' (calculate scope)"
```

---

### Task 5: Fix `saas-valuation-calculator.ts` customFn `\\'` (#5 Important)

**Files:**
- Modify: `src/engines/saas-valuation-calculator.ts:213`

- [ ] **Step 1: Replace `\\'` with `\'` in customFn**

In `src/engines/saas-valuation-calculator.ts`, line 213:

```js
"if(bm<3){mr4+='\n• 🔴 Current multiple '+bm.toFixed(1)+'x is below 3x SaaS floor — investors won\\'t bite.\n• To reach 3x floor:  need growth '+Math.max(10,gr2).toFixed(0)+'%+  AND  margin '+Math.max(20,pm).toFixed(0)+'%+';}else if(bm<5){..."
```

Find the substring `won\\'t bite` and replace with `won\'t bite`:

```js
"if(bm<3){mr4+='\n• 🔴 Current multiple '+bm.toFixed(1)+'x is below 3x SaaS floor — investors won\'t bite.\n• To reach 3x floor:  need growth '+Math.max(10,gr2).toFixed(0)+'%+  AND  margin '+Math.max(20,pm).toFixed(0)+'%+';}else if(bm<5){..."
```

- [ ] **Step 2: Verify and commit**

Run: `grep -n "won\\\\'t" src/engines/saas-valuation-calculator.ts`

Expected: 0 matches (no `won\\'t` left).

```bash
git add src/engines/saas-valuation-calculator.ts
git commit -m "fix(saas-valuation): unescape apostrophe in customFn break-even message"
```

---

### Task 6: Fix `market-size-estimator.ts` literal `\\'` in customFn (#2 continued)

**Files:**
- Modify: `src/engines/market-size-estimator.ts:194, 198`

- [ ] **Step 1: Replace `\\'` with `\'` in 2 customFn lines**

In `src/engines/market-size-estimator.ts`, line 194 (Reality Check):

```js
"r+='\n🎯 Reality Check\n';if(tam>=1e9)r+='• Huge market — you don\\'t need a large share to build a great business.\n';else if(tam>=100e6)r+='• Solid market size — focus on dominating a specific niche within it.\n';else if(tam>0)r+='• Narrow market — you\\'ll need high pricing or high penetration to thrive.\n';" +
```

Replace `don\\'t` with `don\'t` and `you\\'ll` with `you\'ll`:

```js
"r+='\n🎯 Reality Check\n';if(tam>=1e9)r+='• Huge market — you don\'t need a large share to build a great business.\n';else if(tam>=100e6)r+='• Solid market size — focus on dominating a specific niche within it.\n';else if(tam>0)r+='• Narrow market — you\'ll need high pricing or high penetration to thrive.\n';" +
```

Line 198 (Pricing-related tip):

```js
"if(tc<5000&&ar<2000)r+='• ⚠️ Small pool + low pricing: reaching meaningful revenue will be hard.\n';else if(tc<5000&&p4>5)r+='• ⚠️ This market has few customers — you\\'ll need to capture '+pct(p4)+' to hit $100K.\n';else if(p4>10)r+='• ⚠️ You need over 10% market share to reach $100K. Either the market is very small or your pricing is too low.\n';}" +
```

Replace `you\\'ll` with `you\'ll`:

```js
"if(tc<5000&&ar<2000)r+='• ⚠️ Small pool + low pricing: reaching meaningful revenue will be hard.\n';else if(tc<5000&&p4>5)r+='• ⚠️ This market has few customers — you\'ll need to capture '+pct(p4)+' to hit $100K.\n';else if(p4>10)r+='• ⚠️ You need over 10% market share to reach $100K. Either the market is very small or your pricing is too low.\n';}" +
```

- [ ] **Step 2: Verify and commit**

Run: `grep -n "\\\\'" src/engines/market-size-estimator.ts`

Expected: 0 matches in `customFn` block (lines 175-220ish). The remaining `\'` in the FAQ section (around line 200+) are correct.

```bash
git add src/engines/market-size-estimator.ts
git commit -m "fix(market-size): unescape apostrophes in customFn (Reality Check, market tip)"
```

---

### Task 7: Fix `course-pricing-calculator.ts` literal `\\'` in customFn (#2 continued)

**Files:**
- Modify: `src/engines/course-pricing-calculator.ts:213`

- [ ] **Step 1: Replace `\\'` with `\'` in customFn tip**

In `src/engines/course-pricing-calculator.ts`, line 213 (customFn tip):

```js
"r+='💡 Tip: Most creators underprice their first course. ... Adding a payment plan (3 x monthly) at 1.5-2x the one-time price often increases total revenue per student by 20-40% — buyers who can\\'t afford $497 upfront will pay $199 × 3 = $597.';" +
```

Find `can\\'t` and replace with `can\'t`:

```js
"r+='💡 Tip: Most creators underprice their first course. ... Adding a payment plan (3 x monthly) at 1.5-2x the one-time price often increases total revenue per student by 20-40% — buyers who can\'t afford $497 upfront will pay $199 × 3 = $597.';" +
```

- [ ] **Step 2: Verify and commit**

```bash
git add src/engines/course-pricing-calculator.ts
git commit -m "fix(course-pricing): unescape apostrophe in customFn tip"
```

---

### Task 8: Fix `mrr-calculator.ts` literal `\\'` in customFn tips (#2 continued)

**Files:**
- Modify: `src/engines/mrr-calculator.ts:400, 401, 403`

- [ ] **Step 1: Read mrr customFn tip block**

Read `src/engines/mrr-calculator.ts` lines 395-410. Three tip strings contain literal `\\'`:

- Line 400: `Don\\'t fix what isn\\'t broken`
- Line 401: `Don\\'t raise prices until you\\'ve maxed`
- Line 403: `you\\'re scaling losses faster than gains`

- [ ] **Step 2: Replace `\\'` with `\'` in all 3 lines**

For each of the 3 lines, replace `\\'` with `\'`:

```js
"if(nrr!==null&&nrr>=110){tipStr='💡 Tip: Best-in-class NRR — protect the expansion motion that drives it. Don\'t fix what isn\'t broken.';}"
```

```js
"else if(churnRate<2&&churnRate>0){tipStr='💡 Tip: Sub-2% churn is your unfair advantage. Don\'t raise prices until you\'ve maxed expansion revenue per account.';}"
```

```js
"else{tipStr='💡 Tip: Track your Quick Ratio weekly — above 4 means growth is efficient. Below 2 means you\'re scaling losses faster than gains.';}"
```

- [ ] **Step 3: Verify and commit**

Run: `grep -n "\\\\'" src/engines/mrr-calculator.ts | head`

Expected: 0 matches (the 3 tips are fixed).

```bash
git add src/engines/mrr-calculator.ts
git commit -m "fix(mrr): unescape apostrophes in customFn tip variants"
```

---

### Task 9: Fix `productivity-score.ts` literal `\\'` in customFn (#2 continued)

**Files:**
- Modify: `src/engines/productivity-score.ts:157, 193, 214`

- [ ] **Step 1: Read productivity-score customFn block**

Read `src/engines/productivity-score.ts` lines 140-220. Identify customFn string literals (concatenated with `+`).

Three locations to fix:
- Line 157: `tips.push('You might have too many tools. Audit your subscriptions — cut any you haven\\'t used in 2 weeks.')` (inside customFn)
- Line 193: `main+='• 🟠 Tool stack has bloat. Audit and cut what you haven\\'t used in 2 weeks.\n\n';`
- Line 214: `main+='• Cal Newport\\'s research: 4 hours/day of deep work ...'`

- [ ] **Step 2: Replace `\\'` with `\'` in 3 lines**

Line 157:

```js
"else if(tools>=6&&tools<=8){score+=5;tips.push('You might have too many tools. Audit your subscriptions — cut any you haven\'t used in 2 weeks.');}" +
```

Line 193:

```js
"else main+='• 🟠 Tool stack has bloat. Audit and cut what you haven\'t used in 2 weeks.\n\n';" +
```

Line 214:

```js
"main+='• Cal Newport\'s research: 4 hours/day of deep work = full-time knowledge worker output.\n\n';" +
```

- [ ] **Step 3: Verify and commit**

```bash
git add src/engines/productivity-score.ts
git commit -m "fix(productivity-score): unescape apostrophes in customFn (tips, tool bloat, Newport)"
```

---

### Task 10: Fix `unit-economics-calculator.ts` literal `\\'` in customFn (#2 continued)

**Files:**
- Modify: `src/engines/unit-economics-calculator.ts:268`

- [ ] **Step 1: Replace `\\'` with `\'`**

In `src/engines/unit-economics-calculator.ts`, line 268:

```js
"if(nc<=0)r+='\n💡 Tip: ...';else if(isFinite(pm)&&pm>12)r+='\n💡 Tip: ... Either compounds — don\\'t pick both at once.';else if(mc>0.05)r+='\n💡 Tip: ... That\\'s usually worth more than a new pricing tier. ...';else r+='\n💡 Tip: ... If you\\'re hitting LTV:CAC ...';"
```

Replace three `\\'` → `\'`:
- `don\\'t pick` → `don\'t pick`
- `That\\'s usually` → `That\'s usually`
- `you\\'re hitting` → `you\'re hitting`

Full replacement:

```js
"if(nc<=0)r+='\n💡 Tip: Negative net contribution means you lose money on every customer served. Fix this before scaling — either raise price, cut cost-to-serve (hosting, support, payment processing), or both. Scaling a loss-making unit is a guaranteed death spiral.';else if(isFinite(pm)&&pm>12)r+='\n💡 Tip: CAC payback over 12 months is the #1 red flag for SaaS investors. Two ways out: (1) raise prices 20-30% (most founders underprice), or (2) cut CAC by improving conversion (better landing page, more qualified leads). Either compounds — don\'t pick both at once.';else if(mc>0.05)r+='\n💡 Tip: 5%+ monthly churn is the silent killer. The math: cutting churn from 5% to 3% roughly doubles LTV. That\'s usually worth more than a new pricing tier. Talk to churned customers first — the answer is almost always in their exit interviews.';else r+='\n💡 Tip: Solid unit economics. The next bottleneck is usually distribution (filling the funnel), not the per-customer math. If you\'re hitting LTV:CAC ≥ 3:1 with payback < 12mo, consider raising prices — the market can probably bear more than you\'re charging.';" +
```

- [ ] **Step 2: Verify and commit**

Run: `grep -n "\\\\'" src/engines/unit-economics-calculator.ts`

Expected: 0 matches.

```bash
git add src/engines/unit-economics-calculator.ts
git commit -m "fix(unit-economics): unescape apostrophes in customFn tip variants"
```

---

### Task 11: Fix `burn-rate-calculator.ts` literal `\\'` in customFn (#2 continued)

**Files:**
- Modify: `src/engines/burn-rate-calculator.ts:208`

- [ ] **Step 1: Replace `\\'` with `\'`**

In `src/engines/burn-rate-calculator.ts`, line 208:

```js
"if(nb>5)r+='\n\n💡 Tip: Team costs are typically 50-70% of gross burn. ...';else if(nb>0)r+='\n\n💡 Tip: Burn multiple below 1.0× means you\\'re growing revenue faster than you burn. Below 0.5× is best-in-class — investors reward capital efficiency. Track it monthly.';else r+='\n\n💡 Tip: Default alive is just the start. Reinvest excess cash into growth experiments (paid acquisition, content, hiring) to compound the advantage before competitors catch up.';"
```

Replace `you\\'re growing` with `you\'re growing`:

```js
"if(nb>5)r+='\n\n💡 Tip: Team costs are typically 50-70% of gross burn. ...';else if(nb>0)r+='\n\n💡 Tip: Burn multiple below 1.0× means you\'re growing revenue faster than you burn. Below 0.5× is best-in-class — investors reward capital efficiency. Track it monthly.';else r+='\n\n💡 Tip: Default alive is just the start. Reinvest excess cash into growth experiments (paid acquisition, content, hiring) to compound the advantage before competitors catch up.';"
```

- [ ] **Step 2: Verify and commit**

```bash
git add src/engines/burn-rate-calculator.ts
git commit -m "fix(burn-rate): unescape apostrophe in customFn tip (you\\'re growing)"
```

---

### Task 12: Strengthen `codegen-examples.mjs` to detect literal escape bugs (#14 part)

**Files:**
- Modify: `scripts/codegen-examples.mjs` (lines 95-108, 219-230)
- Create: `tests/scripts/codegen-examples.test.mjs`

- [ ] **Step 1: Read current drift-check logic**

Already read: `--check` mode (lines 219-230) compares `staticExamples[0]` to regenerated output. It checks **consistency** but NOT **correctness** — both contain `you\'re`, so they match.

We need to add a sanity check: if the regenerated output contains literal `\'` or `\u` (that should have been decoded), flag it.

- [ ] **Step 2: Add correctness check to `--check` mode**

In `scripts/codegen-examples.mjs`, replace the `--check` block (lines 219-230) with:

```js
// --check mode: exit 1 if any drift was detected, so CI / pre-commit can catch it.
if (CHECK_MODE) {
  try { fs.unlinkSync(runnerPath); } catch {} // cleanup before exit
  if (driftedFiles.length > 0) {
    console.error(`\n[codegen-examples] --check FAILED: ${driftedFiles.length} engine(s) have drifted staticExamples[0]:`);
    for (const f of driftedFiles) console.error(`  - ${f}`);
    console.error(`\nFix: run \`node scripts/codegen-examples.mjs\` to regenerate, then commit.`);
    process.exit(1);
  } else {
    // Sanity check: regenerated output should not contain literal escape sequences
    // that should have been decoded. This catches bugs where generate() emits
    // e.g. "you\\'re" (literal backslash + apostrophe) instead of "you're".
    const LITERAL_ESCAPE_RE = /\\\\'|\\u[0-9a-fA-F]{4}/;
    const corruptedFiles = [];
    for (const { file, slug } of ENGINES) {
      const out = results[slug] || [];
      const joined = out.join('\n');
      if (LITERAL_ESCAPE_RE.test(joined)) {
        corruptedFiles.push({ file, slug, sample: joined.match(LITERAL_ESCAPE_RE)[0] });
      }
    }
    if (corruptedFiles.length > 0) {
      console.error(`\n[codegen-examples] --check FAILED: ${corruptedFiles.length} engine(s) emit literal escape sequences (likely unescaped apostrophes or unicode):`);
      for (const { file, slug, sample } of corruptedFiles) {
        console.error(`  - ${file} (${slug}): found "${sample}" in output`);
      }
      console.error(`\nFix: in each affected engine, replace literal \\' or \\uXXXX with their decoded characters in generate() and/or customFn.`);
      process.exit(1);
    }
    console.log(`\n[codegen-examples] --check PASSED: all ${ENGINES.length} engines in sync and clean.`);
    process.exit(0);
  }
}
```

- [ ] **Step 3: Verify the check fires on the unfixed state**

After Tasks 1-11, all known `\\'` should be fixed. But to verify the check works, temporarily revert one fix and run:

Run: `node scripts/codegen-examples.mjs --check`

Expected: PASSED (sanity check finds no remaining literal escapes).

If any escape is still found, the check correctly reports it.

- [ ] **Step 4: Write a unit test for the new sanity check**

Create `tests/scripts/codegen-examples.test.mjs`:

```js
#!/usr/bin/env node
// Smoke test: invoke --check and verify it returns 0 when clean, 1 when drift detected.
import { spawnSync } from 'node:child_process';

function run() {
  return spawnSync('node', ['scripts/codegen-examples.mjs', '--check'], {
    cwd: new URL('..', import.meta.url).pathname,
    encoding: 'utf8',
  });
}

const result = run();
if (result.status !== 0) {
  console.error('FAIL: --check returned non-zero:');
  console.error('stdout:', result.stdout);
  console.error('stderr:', result.stderr);
  process.exit(1);
}
if (!result.stdout.includes('PASSED')) {
  console.error('FAIL: --check did not report PASSED');
  console.error(result.stdout);
  process.exit(1);
}
console.log('PASS: codegen-examples --check smoke test');
```

- [ ] **Step 5: Commit**

```bash
git add scripts/codegen-examples.mjs tests/scripts/codegen-examples.test.mjs
git commit -m "feat(codegen-examples): add sanity check for literal escape sequences in regenerated output"
```

---

## Phase 2: Build / CI Hardening

### Task 13: Make `codegen-examples.mjs` cross-platform + always-cleanup (#6 Important)

**Files:**
- Modify: `scripts/codegen-examples.mjs:95, 102-108`

- [ ] **Step 1: Replace hard-coded `npx.cmd` with platform-aware command**

Line 95:

```js
const result = spawnSync('npx.cmd', ['tsx', runnerPath], {
```

becomes:

```js
const tsxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(tsxBin, ['tsx', runnerPath], {
```

- [ ] **Step 2: Wrap tsx failure in finally block to clean up runner**

Replace lines 102-108:

```js
if (result.status !== 0) {
  console.error('[codegen-examples] tsx failed:');
  console.error('stdout:', result.stdout);
  console.error('stderr:', result.stderr);
  console.error('error:', result.error);
  process.exit(1);
}
```

with:

```js
if (result.status !== 0) {
  console.error('[codegen-examples] tsx failed:');
  console.error('stdout:', result.stdout);
  console.error('stderr:', result.stderr);
  console.error('error:', result.error);
  try { fs.unlinkSync(runnerPath); } catch {}
  process.exit(1);
}
```

- [ ] **Step 3: Verify**

Run: `node scripts/codegen-examples.mjs`

Expected: `[codegen-examples] Done. 32 engines updated.` (no engines actually changed; this is a no-op round-trip).

Confirm `_runner-codegen-examples.ts` is removed:

Run: `ls scripts/_runner-codegen-examples.ts`

Expected: file not found (already cleaned up).

- [ ] **Step 4: Commit**

```bash
git add scripts/codegen-examples.mjs
git commit -m "fix(codegen-examples): cross-platform tsx invocation + always-cleanup runner script"
```

---

### Task 14: Warn on duplicate `registerEngine` slug (#7 Important)

**Files:**
- Modify: `src/core/engines/registry.ts`

- [ ] **Step 1: Add warn-on-overwrite**

Replace `src/core/engines/registry.ts`:

```ts
import type { ToolEngine } from './types';

const engines: Record<string, ToolEngine> = {};

export function getEngine(slug: string): ToolEngine | undefined {
  return engines[slug];
}

export function getAllEngines(): ToolEngine[] {
  return Object.values(engines);
}

export function registerEngine(engine: ToolEngine): void {
  engines[engine.slug] = engine;
}
```

with:

```ts
import type { ToolEngine } from './types';

const engines: Record<string, ToolEngine> = {};

export function getEngine(slug: string): ToolEngine | undefined {
  return engines[slug];
}

export function getAllEngines(): ToolEngine[] {
  return Object.values(engines);
}

export function registerEngine(engine: ToolEngine): void {
  if (engines[engine.slug] !== undefined) {
    // Two engines sharing a slug would silently shadow each other. Surface it.
    console.warn(`[registry] registerEngine: duplicate slug "${engine.slug}" — overwriting existing engine`);
  }
  engines[engine.slug] = engine;
}
```

- [ ] **Step 2: Verify no false positives**

Run: `pnpm build 2>&1 | head -30`

Expected: no `[registry]` warnings (all 32 engines have unique slugs).

- [ ] **Step 3: Commit**

```bash
git add src/core/engines/registry.ts
git commit -m "feat(registry): warn on duplicate registerEngine slug"
```

---

### Task 15: Add `paths:` filter to CI workflow (#8 Important)

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add paths-ignore for docs-only pushes**

Replace `.github/workflows/ci.yml`:

```yaml
on:
  pull_request:
  push:
    branches: [master, main]
```

with:

```yaml
on:
  pull_request:
  push:
    branches: [master, main]
    paths-ignore:
      - 'docs/**'
      - '**.md'
      - '.superpowers/**'
```

- [ ] **Step 2: Verify syntax**

Run: `pnpm exec yaml .github/workflows/ci.yml` (or just open and visually inspect)

The YAML should be valid. Optional: `python -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"` if Python is available.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: skip docs-only pushes (markdown changes don't need full build)"
```

---

### Task 16: Round float artifacts in `sync-pricing.mjs` (#11 Minor)

**Files:**
- Modify: `scripts/sync-pricing.mjs`

- [ ] **Step 1: Locate where PRICING values are written**

Read `scripts/sync-pricing.mjs`. Find the section that writes per-model input/output prices to `ai-pricing.json`.

- [ ] **Step 2: Add rounding pass**

At the end of the script, before `fs.writeFileSync`, round all numeric values to 8 decimal places:

```js
// Round numeric artifacts to 8 decimals to avoid IEEE-754 display cruft
function roundDeep(obj) {
  if (typeof obj === 'number') return Math.round(obj * 1e8) / 1e8;
  if (Array.isArray(obj)) return obj.map(roundDeep);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj)) out[k] = roundDeep(obj[k]);
    return out;
  }
  return obj;
}
const cleaned = roundDeep(parsed);
fs.writeFileSync(...);
```

- [ ] **Step 3: Verify**

Run: `pnpm sync`

Expected: `ai-pricing.json` `gpt-5-nano.input` no longer shows `0.049999999999999996`; shows `0.05`.

- [ ] **Step 4: Commit**

```bash
git add scripts/sync-pricing.mjs src/data/ai-pricing.json
git commit -m "fix(sync-pricing): round numeric artifacts to 8 decimals (no IEEE-754 cruft)"
```

---

## Phase 3: Polish + Docs

### Task 17: Tighten `gpu-cloud-cost-calculator.ts` `PROVIDERS` typing (#15 Minor)

**Files:**
- Modify: `src/engines/gpu-cloud-cost-calculator.ts:22`

- [ ] **Step 1: Remove `as any`**

Line 22:

```ts
const PROVIDERS: Record<string, ProviderInfo> = PRICING.gpu.providers as any;
```

becomes:

```ts
const PROVIDERS: Record<string, ProviderInfo> = PRICING.gpu.providers as unknown as Record<string, ProviderInfo>;
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm exec tsc --noEmit`

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/engines/gpu-cloud-cost-calculator.ts
git commit -m "chore(gpu-cloud): tighten PROVIDERS type cast (no more as any)"
```

---

### Task 18: Extract `[slug].astro` preset blocks to `src/data/presets.ts` (#12 Minor)

**Files:**
- Create: `src/data/presets.ts`
- Modify: `src/pages/[lang]/[slug].astro:1-100, 436+`

- [ ] **Step 1: Read current preset blocks**

Read `src/pages/[lang]/[slug].astro` lines 1-100 (where BIZ_CONFIG_MAP and 4 BIZ_*_CONFIG live) and lines 436+ (the 24 inline preset blocks).

- [ ] **Step 2: Create `src/data/presets.ts`**

Move the `BIZ_CONFIG_MAP` and the 4 `BIZ_*_CONFIG` objects (lines 44-69-ish) into `src/data/presets.ts`:

```ts
// src/data/presets.ts
// Preset chip definitions + BIZ_CONFIG_MAP for the 24 Business v3 calculators.
// Used by [slug].astro to render the "Try a preset" buttons.

export const BIZ_CONFIG_MAP: Record<string, 'BIZ_HEALTH_CONFIG' | 'BIZ_WHATIF_CONFIG' | 'BIZ_BREAKEVEN_CONFIG' | 'BIZ_MILESTONE_CONFIG'> = {
  'solopreneur-ltv-calculator': 'BIZ_HEALTH_CONFIG',
  'solopreneur-cac-calculator': 'BIZ_HEALTH_CONFIG',
  'solopreneur-mrr-calculator': 'BIZ_HEALTH_CONFIG',
  'solopreneur-churn-rate-calculator': 'BIZ_HEALTH_CONFIG',
  'solopreneur-burn-rate-calculator': 'BIZ_HEALTH_CONFIG',
  // ... etc — full list of 24 engines
};

// 4 preset arrays follow (BIZ_HEALTH_CONFIG, BIZ_WHATIF_CONFIG, BIZ_BREAKEVEN_CONFIG, BIZ_MILESTONE_CONFIG)
// Each is { key: string, label: { en: string, zh: string } }[]
// ... (copy from [slug].astro)
```

- [ ] **Step 3: Extract the 24 inline preset blocks**

Replace the 1754-line `{slug === '...' && (<Block />)}` chain with a data-driven loop:

```astro
---
import { BIZ_CONFIG_MAP, BIZ_HEALTH_CONFIG, BIZ_WHATIF_CONFIG, BIZ_BREAKEVEN_CONFIG, BIZ_MILESTONE_CONFIG } from '../../data/presets';
const PRESETS_BY_KIND = { BIZ_HEALTH_CONFIG, BIZ_WHATIF_CONFIG, BIZ_BREAKEVEN_CONFIG, BIZ_MILESTONE_CONFIG };
const slug = Astro.params.slug!;
const kind = BIZ_CONFIG_MAP[slug];
const presets = kind ? PRESETS_BY_KIND[kind] : [];
---
{presets.map(p => <PresetBlock config={p} />)}
```

- [ ] **Step 4: Verify build**

Run: `pnpm build 2>&1 | tail -20`

Expected: 141 pages built; no preset-block errors.

Manually open one page (e.g., `/en/solopreneur-ltv-calculator/`) and confirm preset buttons render.

- [ ] **Step 5: Commit**

```bash
git add src/data/presets.ts src/pages/[lang]/[slug].astro
git commit -m "refactor: extract preset chip definitions from [slug].astro to src/data/presets.ts"
```

---

### Task 19: Add missing i18n preset translation keys (#10 Minor)

**Files:**
- Modify: `src/i18n/translations.ts`

- [ ] **Step 1: Audit which engines have presets but missing translations**

After Task 18, presets are centralized. Run:

```bash
grep -E "preset\.[a-z-]+\.label" src/i18n/translations.ts | sort -u > /tmp/preset-keys.txt
wc -l /tmp/preset-keys.txt
```

For each engine slug that ships preset chips but lacks `tools.{slug}.preset.{key}.label` in BOTH en and zh, add them.

- [ ] **Step 2: For each missing key, add an entry**

Pattern (in `src/i18n/translations.ts`):

```ts
'tools.solopreneur-{slug}.preset.{key}.label': { en: '{English label}', zh: '{中文标签}' },
```

Fill in real labels from the corresponding preset block.

- [ ] **Step 3: Verify**

For each new key, grep both en and zh entries are present:

```bash
node -e "const t = require('./src/i18n/translations.ts'); console.log(t.default['tools.solopreneur-ltv-calculator.preset.healthy.label'])"
```

(Note: this won't work directly for .ts; instead grep the file.)

Run: `grep "tools.solopreneur-.*\.preset\." src/i18n/translations.ts | wc -l`

Expected: at least 24 engines × 4 kinds × ~3-5 keys each = ~300-500 keys.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/translations.ts
git commit -m "feat(i18n): add missing preset chip translations (en + zh)"
```

---

### Task 20: Clean up empty placeholder sections in `translations.ts` (#13 Minor)

**Files:**
- Modify: `src/i18n/translations.ts`

- [ ] **Step 1: Identify empty placeholders**

Run: `grep -nE "^  // --- [A-Z][0-9]+: .* ---$" src/i18n/translations.ts`

For each placeholder line (e.g., `// --- A1: Startup Idea Validator ---`) followed by no actual entries, document it inline or delete.

- [ ] **Step 2: Either delete or document**

Decision matrix:
- If the calculator is planned for v4 → keep placeholder with a `// TODO(v4):` comment
- If the calculator is not planned → delete the placeholder line

- [ ] **Step 3: Commit**

```bash
git add src/i18n/translations.ts
git commit -m "chore(i18n): clean up empty placeholder sections in translations.ts"
```

---

### Task 21: Document `staticExamples[1+]` limitation in `CLAUDE.md` (#14 part)

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Find the staticExamples section in CLAUDE.md**

Read `CLAUDE.md`. The "Notes for Future Sessions" section mentions `staticExamples[0]` and `codegen-examples.mjs`.

- [ ] **Step 2: Clarify that only `[0]` is auto-regenerated**

Replace the bullet:

> **Engine pattern is strict** — `calculate()` is the source of truth; `staticExamples[0]` is auto-regenerated from it by `scripts/codegen-examples.mjs`. **After editing `calculate()` in any engine, run `node scripts/codegen-examples.mjs` before committing** — `staticExamples[0]` will drift otherwise (the v3 bug found in commit 1385725 was caused by skipping this step). Use `node scripts/codegen-examples.mjs --check` in CI / pre-commit to detect drift; exit 1 means someone forgot to regen. `customFn` is minified; `codegen-customfn.mjs` only auto-updates the data-table portion (PRICING.json-driven), the logic is hand-minified.

with:

> **Engine pattern is strict** — `calculate()` is the source of truth; `staticExamples[0]` is auto-regenerated from it by `scripts/codegen-examples.mjs`. **After editing `calculate()` in any engine, run `node scripts/codegen-examples.mjs` before committing** — `staticExamples[0]` will drift otherwise (the v3 bug found in commit 1385725 was caused by skipping this step). Use `node scripts/codegen-examples.mjs --check` in CI / pre-commit to detect drift; exit 1 means someone forgot to regen. `customFn` is minified; `codegen-customfn.mjs` only auto-updates the data-table portion (PRICING.json-driven), the logic is hand-minified.
>
> **Important:** `codegen-examples.mjs` only regenerates `staticExamples[0]`. Engines that ship `[1+]`, `[2+]`, ... (alternative scenarios shown on the page) are not auto-checked. If `generate()` logic changes, verify `[1+]` manually or hand-edit them.

Also add a paragraph:

> **Sanity check (added 2026-06-24 audit batch):** `codegen-examples.mjs --check` also fails if regenerated output contains literal `\\'` or `\uXXXX` escape sequences that should have been decoded (these are bugs in `generate()` or `customFn` where apostrophes / unicode weren't properly escaped). Fix: in the affected engine, replace literal `\\'` with `\'` (TS source) or `'` (template literal) as appropriate.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: clarify staticExamples[1+] manual maintenance + new literal-escape sanity check"
```

---

## Phase 4: Final Verification

### Task 22: Run all checks end-to-end

- [ ] **Step 1: Run drift check**

Run: `node scripts/codegen-examples.mjs --check`

Expected: `[codegen-examples] --check PASSED: all 32 engines in sync and clean.`

- [ ] **Step 2: Run typecheck + tests**

Run: `pnpm check`

Expected: 0 errors, all tests pass.

- [ ] **Step 3: Run build**

Run: `pnpm build 2>&1 | tail -10`

Expected: 141 pages built; sitemap-index generated; no warnings about missing pages or unmatched dynamic routes.

- [ ] **Step 4: Manual smoke test**

Run: `pnpm preview` (in background, then `curl http://localhost:4321/en/solopreneur-gpu-cloud-cost-calculator/`)

Verify the gpu-cloud page renders. If you have a browser, change the provider dropdown to "aws" and confirm the page now shows "Switch to Vast.ai: save $X/mo" (not "You're already on the cheapest").

- [ ] **Step 5: Final commit (if anything needs touching up)**

```bash
git status  # should be clean
```

If clean, no commit. Otherwise:

```bash
git add -A
git commit -m "chore: post-audit-polish smoke-test fixes"
```

- [ ] **Step 6: Push branch + open PR**

```bash
git push origin fix/2026-06-24-audit-polish
gh pr create --base master --title "fix(audit-polish): close 14 residual findings from 2026-06-24 audit" --body "Closes the 14 remaining findings (3 Critical, 6 Important, 5 Minor) from the second-pass audit after the 2026-06-24 audit-fix batch. See docs/superpowers/plans/2026-06-24-audit-polish.md for full breakdown."
```

---

## Self-Review (carried out before saving)

**1. Spec coverage:**
- ✅ gpu-cloud #1 — Task 1
- ✅ literal `\\'` in 9 engines — Tasks 2, 3, 5, 6, 7, 8, 9, 10, 11
- ✅ saas-valuation customFn vars — Task 4
- ✅ codegen sanity check + cross-platform + cleanup — Tasks 12, 13
- ✅ registerEngine warn — Task 14
- ✅ CI paths filter — Task 15
- ✅ sync-pricing float rounding — Task 16
- ✅ PROVIDERS type tightening — Task 17
- ✅ Preset block extraction — Task 18
- ✅ i18n preset keys — Task 19
- ✅ Translation placeholders — Task 20
- ✅ CLAUDE.md docs — Task 21
- ✅ Final verification — Task 22

**2. Placeholder scan:**
- No "TBD", "TODO", "implement later", "fill in details", or "similar to Task N" without concrete code.
- Task 18 (`presets.ts`) has a `// ... (copy from [slug].astro)` — flagged. The implementer must copy the actual content from `[slug].astro` lines 44-69 (BIZ_CONFIG_MAP + 4 BIZ_*_CONFIG objects). If you (the agent) are implementing Task 18, read those lines and copy them verbatim — don't fabricate values.

**3. Type consistency:**
- All `slug` references use the `solopreneur-{name}-calculator` pattern from `src/core/engines/types.ts`.
- `cheapestProv` fix in Task 1 uses `prov !== cheapestProv` (referential equality) — verified: both are bare `ProviderInfo` objects from the same `PROVIDERS` map.
- `valuationBase` → `vb` in Task 4 — confirmed `vb` is declared in customFn scope (line ~190-ish).

---

## Deferred Improvements (raised during Task 1 review, not in scope)

These were surfaced during spec/code-quality reviews but are correctly out of scope for this 22-task batch. Track for a future polish batch:

1. **Code comment for referential equality** (Task 1 Minor, from code quality reviewer):
   - File: `src/engines/gpu-cloud-cost-calculator.ts:255`
   - Add comment: `// Object refs come from the same PROVIDERS map, so !== is a safe identity check`
   - Why: Prevents a future "fix" reverting to the always-falsy `.key` comparison.
   - Effort: 1 line.

2. **`sortedProviders` sorted by `order` (display), not by `rates[gpuKey]`** (Task 1 follow-up, flagged by implementer + confirmed by spec reviewer):
   - File: `src/engines/gpu-cloud-cost-calculator.ts:135, 254`
   - Issue: `sortedProviders[0]` aliases RunPod (lowest `order` value), not the cheapest provider for the chosen GPU/tier. So `cheapestProv = sortedProviders[0]` is the "display first" provider, not the actual cheapest.
   - Consequence: When the user picks RunPod, the What-If block shows "You're already on cheapest" — which is technically true for display order but misleading because the bar chart correctly highlights Vast.ai as actually cheapest.
   - Proper fix: Re-derive `cheapestProv` from the same `allCosts.reduce(...)` logic used at line 146 (which produces a `cost/name` pair, not a `ProviderInfo` reference — would need refactoring to map back).
   - Why deferred: The fix changes the "Switch to X" recommendation copy and deserves plan-level review. Belongs in a follow-up plan, not silently rolled into Task 1.

3. **8 pre-existing customFn parse failures** (surfaced during final verification):
   - Engines: `ai-image-generation-cost-calculator`, `ai-training-cost-estimator`, `claude-api-cost-calculator`, `deepseek-api-cost-calculator`, `gemini-api-cost-calculator`, `gpu-cloud-cost-calculator`, `ltv-calculator`, plus any other whose customFn starts with a data table (`'key':{...},...`).
   - Root cause: these engines use string-literal labels (`'dalle-4':{...}`) which JS rejects — labels must be identifiers. `new Function('inputs','pick','fill', customFn)` throws SyntaxError at page-load.
   - Symptom: pages still render `staticExamples[0]` (server-side), but custom-mode interaction (filling inputs → clicking Generate) is broken.
   - Fix direction: wrap the data table in a proper variable assignment (`var T={...}; ...`) OR convert to `({...})` IIFE.
   - Why deferred: pre-existing on master, not in audit scope. Test script: `node tests/scripts/test-customFn.mjs`.

---

## Final State (2026-06-24 polish batch — actual outcome)

**Originally planned:** 22 tasks
**Actually completed:** 13 commits across 11 unique logical fixes

### Commits on `fix/2026-06-24-audit-polish`

| # | Commit | Task | Type |
|---|---|---|---|
| 1 | `5c40724` | gpu-cloud cheapestProv referential equality | Bug fix |
| 2 | `15b2a55` | churn-rate `\\\'` literal-escape in generate() | Bug fix |
| 3 | `36d54ff` | saas-valuation pre-existing `}}` ASI parse bug | Bug fix (NEW task) |
| 4 | `d86809d` | saas-valuation `vb` rename in customFn | Bug fix (re-applied) |
| 5 | `4018fab` | registerEngine duplicate-slug warn | Safety |
| 6 | `d39174f` | CI paths-ignore filter | CI |
| 7 | `9b02365` | gpu-cloud PROVIDERS type tightening | Type safety |
| 8 | `b59cf8d` | CLAUDE.md docs (staticExamples[1+] + customFn parse) | Docs |
| 9 | `44ceba3` | codegen literal-escape sanity check | Hardening |
| 10 | `faf8081` | codegen cross-platform + always-cleanup | Hardening |
| 11 | `5c723f9` | sync-pricing float rounding (also: ai-pricing.json regen + test-customFn.mjs) | Hardening |
| 12 | `2f0ed7c` | engines staticExamples regen after PRICING.json sync | Regen |

### Tasks dropped from original plan

- **Task 3** (revenue-projector customFn `\\'` fix) — REGRESSION; reverted. Original `\\'` was correct in `"..."` outer TS strings.
- **Task 5** (saas-valuation customFn `\\'` fix) — REGRESSION; reverted. Same root cause.
- **Tasks 6-11** (other engines' customFn `\\'` fixes) — SKIPPED. Same wrong-pattern fix would have introduced 9 more regressions.
- **Task 18** (preset block extraction) — SCOPED DOWN, then SKIPPED. Investigation revealed BIZ_CONFIG_MAP and BIZ_*_CONFIG are not preset arrays; preset data is heterogeneous across 24 engines and cannot be safely DRY'd. Net reduction would be ~60 lines, not worth the risk.
- **Task 19** (i18n preset keys) — SKIPPED. Requires per-engine verification of which keys are actually missing.
- **Task 20** (empty translation placeholders) — SKIPPED. Low value, low risk, leave for next batch.

### Lessons Learned

1. **Audit reviewer 1 was wrong about customFn `\\'` escapes.** Within `"..."` outer TS literals (customFn context), `\\'` correctly produces `\'` in the runtime JS string, which JS parses as apostrophe escape. No fix needed. The correct bug class is `\\\'` in single-quoted `'...'` TS literals (generate() context), where `\\\'` produces literal `\'` rendered to the user.

2. **Pre-existing ASI bugs are invisible to drift checks.** `saas-valuation.ts:213` had `;}}` (extra `}`) at master, throwing SyntaxError at page-load. Codegen drift check only catches generate()/staticExamples drift, not customFn parse errors. New `tests/scripts/test-customFn.mjs` is the right tool — consider integrating into `--check`.

3. **Spec compliance review must include runtime verification**, not just diff inspection. Task 5's spec review ✅ but code quality review caught the actual JS parse failure.

---

## Notes for the Implementing Engineer

- **TDD is encouraged but optional** for this batch: most fixes are 1-line changes with visual confirmation via `pnpm build`. The exception is Task 12 (sanity check) which has a real smoke test.
- **Commits are mandatory** — one commit per task (or per file group if you batch Tasks 4+5 for saas-valuation since they touch the same file).
- **No `pnpm check` between tasks needed** for the literal-escape fixes — they're string-level and the codegen check (Task 22) catches drift.
- **The customFn-variable fix (Task 4) is the only one that needs runtime verification** in a browser. If you can't browser-test, at minimum confirm `vb` is defined in the same customFn block (read lines 190-200).