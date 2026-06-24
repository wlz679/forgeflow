# Audit-Driven Fix Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all CRITICAL + HIGH + cheap MEDIUM findings from the 2026-06-24 global audit, in priority order. Defer complex refactors (H1, H2, H3) to separate plans.

**Architecture:**
- Each fix is one atomic commit
- After each commit, run `pnpm build` to verify nothing breaks
- Group related fixes into batched commits where they're in the same file
- All 32 engines pass `codegen-examples.mjs --check` after every change

**Tech Stack:** Astro 4.16.19, TypeScript 5.6, pnpm

**Reference audit:** 全局审计报告（2026-06-24）— the prior message in conversation.

---

## File Structure

| Action | File | Risk |
|---|---|---|
| Modify | `src/engines/saas-valuation-calculator.ts` (1 char) | trivial |
| Modify | `src/engines/churn-rate-calculator.ts` (1 char × N) | trivial |
| Modify | `src/engines/deepseek-api-cost-calculator.ts` (1 line delete) | trivial |
| Modify | `src/engines/gpu-cloud-cost-calculator.ts` (parens) | trivial |
| Modify | 7 engines `staticExamples[1..n]` ($$ → $) | trivial |
| Delete | `scripts/_audit-howTouse.cjs` | none |
| Delete | `scripts/_verify-counts.cjs` | none |
| Delete | `scripts/add-v3-sections.mjs` | none |
| Modify | `package.json` (remove google-trends-api) | none |
| Modify | `src/layouts/BaseLayout.astro` (SEO) | low |
| Create | `scripts/codegen-customfn.mjs` (add --check) | low |
| Modify | `package.json` (add check scripts) | none |
| Create | `.github/workflows/ci.yml` | low |

**Deferred to separate plans (too large for one batch):**
- H1: 8 AI cost engines' `customFn` needs 🩺 + 🔄 sections synced (touches minified JS strings; needs careful diff)
- H2: Extract `Presets` component from `[slug].astro` (700-line refactor)
- H3: `sync-pricing.mjs` schema validation + pin to commit SHA (touches CI supply chain)

---

## Task 1: Fix C1 — `bm2` undefined in saas-valuation

**Files:**
- Modify: `src/engines/saas-valuation-calculator.ts:204`

- [ ] **Step 1: Locate the line**

Run grep to confirm line 204 contains `var pm2=bm2+(rp>=30?0.5:0);`.

- [ ] **Step 2: Replace `bm2` with `bm`**

```ts
var pm2=bm+(rp>=30?0.5:0);
```

- [ ] **Step 3: Verify build succeeds**

Run: `pnpm build 2>&1 | tail -20`
Expected: Build completes without TS error.

- [ ] **Step 4: Commit**

```bash
git add src/engines/saas-valuation-calculator.ts
git commit -m "fix(saas-valuation): use declared 'bm' instead of undefined 'bm2' (NaN in margin scenario)"
```

---

## Task 2: Fix C2 — escaped-unicode in churn-rate

**Files:**
- Modify: `src/engines/churn-rate-calculator.ts:99` (and any other `\\u` occurrences in `generate()`)

- [ ] **Step 1: Find all `\\u` in the file outside customFn**

Run: `grep -n '\\\\u' src/engines/churn-rate-calculator.ts`
Expected: lines in `generate()` (not the minified customFn block)

- [ ] **Step 2: Replace `\\u` with `\u` on those lines**

For each line, do the find-and-replace. The customFn block (large minified string near bottom) is already correct — don't touch it.

- [ ] **Step 3: Verify**

Run: `grep -n '\\\\u' src/engines/churn-rate-calculator.ts`
Expected: no output (all `\\u` are now `\u` in generate()).

- [ ] **Step 4: Commit**

```bash
git add src/engines/churn-rate-calculator.ts
git commit -m "fix(churn-rate): replace literal '\\\\u' escape with proper '\\u' in generate() output"
```

---

## Task 3: Fix C3 — false "no caching" claim in deepseek

**Files:**
- Modify: `src/engines/deepseek-api-cost-calculator.ts:391`

- [ ] **Step 1: Read context around line 391**

Read lines 388-395 to see the false-claim line and the dead `if (true)` block that follows.

- [ ] **Step 2: Delete the misleading line**

Remove the line that says "This provider does not offer prompt caching". Keep the dead `if (true)` block (it's harmless) or delete it too — engineer's choice.

- [ ] **Step 3: Regen staticExamples[0]**

Run: `node scripts/codegen-examples.mjs`
Expected: regenerates and exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/engines/deepseek-api-cost-calculator.ts
git commit -m "fix(deepseek): remove contradictory 'no caching' claim (engine models cache savings at L26,119)"
```

---

## Task 4: Fix C4 — operator-precedence in gpu-cloud

**Files:**
- Modify: `src/engines/gpu-cloud-cost-calculator.ts:106`

- [ ] **Step 1: Read the line**

Read line 106. Current code:
```ts
out.push('\u{1F5A5}️ ' + prov.name + ' GPU Cost — ' + TIER_LABELS[pricingTier] || pricingTier.toUpperCase());
```

- [ ] **Step 2: Add parens to bind `||` correctly**

```ts
out.push(('\u{1F5A5}️ ' + prov.name + ' GPU Cost — ' + TIER_LABELS[pricingTier]) || pricingTier.toUpperCase());
```

- [ ] **Step 3: Regen + commit**

```bash
node scripts/codegen-examples.mjs
git add src/engines/gpu-cloud-cost-calculator.ts
git commit -m "fix(gpu-cloud): parenthesize concatenation so fallback to pricingTier fires on unknown tier"
```

---

## Task 5: Delete 3 obsolete scripts (Hygiene)

**Files:**
- Delete: `scripts/_audit-howTouse.cjs`
- Delete: `scripts/_verify-counts.cjs`
- Delete: `scripts/add-v3-sections.mjs`

- [ ] **Step 1: Verify they have no remaining references**

Run:
```bash
grep -rn "_audit-howTouse\|_verify-counts\|add-v3-sections" src/ scripts/ .github/ docs/ 2>/dev/null
```
Expected: no output (zero references).

- [ ] **Step 2: Delete the 3 files**

```bash
git rm scripts/_audit-howTouse.cjs scripts/_verify-counts.cjs scripts/add-v3-sections.mjs
```

- [ ] **Step 3: Commit**

```bash
git commit -m "chore(scripts): delete 3 obsolete scripts (_audit-howTouse, _verify-counts, add-v3-sections)"
```

---

## Task 6: Remove unused devDep `google-trends-api`

**Files:**
- Modify: `package.json:31`

- [ ] **Step 1: Confirm zero usage**

Run: `grep -rn "google-trends-api" src/ scripts/ 2>/dev/null`
Expected: no output.

- [ ] **Step 2: Remove dep**

```bash
pnpm remove google-trends-api
```

- [ ] **Step 3: Verify lockfile updated + build still works**

```bash
pnpm install --frozen-lockfile
pnpm build 2>&1 | tail -5
```
Expected: install + build succeed.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): remove unused google-trends-api devDep"
```

---

## Task 7: Fix `$$` typos in 7 engines' `staticExamples[1..n]` (M10)

**Files:**
- Modify: `src/engines/unit-economics-calculator.ts:288`
- Modify: `src/engines/course-pricing-calculator.ts:245`
- Modify: `src/engines/freelance-rate-calculator.ts:252`
- Modify: `src/engines/affiliate-income-calculator.ts:243`
- Modify: `src/engines/email-list-revenue-calculator.ts:268`
- Modify: `src/engines/ai-image-generation-cost-calculator.ts:477-478`
- Modify: `src/engines/ai-training-cost-estimator.ts:304`

- [ ] **Step 1: For each file, replace `$$` with `$` inside `staticExamples` strings only**

The cleanest way: use the Edit tool per file. The match is unambiguous because these are display strings. Be careful not to touch anything inside the `customFn` minified string (which uses `'$'` not `$$`).

- [ ] **Step 2: Verify no other `$$` remains in engines**

Run: `grep -rn '\\$\\$' src/engines/`
Expected: no output (or only matches in comments/strings that are intentional).

- [ ] **Step 3: Commit (one commit, multiple files)**

```bash
git add src/engines/unit-economics-calculator.ts src/engines/course-pricing-calculator.ts \
        src/engines/freelance-rate-calculator.ts src/engines/affiliate-income-calculator.ts \
        src/engines/email-list-revenue-calculator.ts src/engines/ai-image-generation-cost-calculator.ts \
        src/engines/ai-training-cost-estimator.ts
git commit -m "fix(engines): replace '\$\$' with '\$' in staticExamples display strings (7 engines)"
```

---

## Task 8: Add canonical + hreflang + twitter card to BaseLayout (M5)

**Files:**
- Modify: `src/layouts/BaseLayout.astro:1-35`

- [ ] **Step 1: Add the SEO tags inside `<head>`**

After the existing `og:type` line (around line 23), add:

```astro
<link rel="canonical" href={`https://forgeflowkit.com${Astro.url.pathname}`} />
<link rel="alternate" hreflang="en" href={`https://forgeflowkit.com/en${Astro.url.pathname.replace(/^\/(en|zh)/, '')}`} />
<link rel="alternate" hreflang="zh" href={`https://forgeflowkit.com/zh${Astro.url.pathname.replace(/^\/(en|zh)/, '')}`} />
<link rel="alternate" hreflang="x-default" href={`https://forgeflowkit.com/en${Astro.url.pathname.replace(/^\/(en|zh)/, '')}`} />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={`https://forgeflowkit.com${ogImage}`} />
```

Note: `Astro.url.pathname` is always available. The hreflang alternates need to swap the language prefix; if the user is on `/en/`, the alternates should be `/en/<path>` and `/zh/<path>`.

- [ ] **Step 2: Verify build**

Run: `pnpm build 2>&1 | tail -5`
Expected: build succeeds, all 141 pages generated.

- [ ] **Step 3: Spot-check one rendered page**

Run: `grep -E "canonical|hreflang|twitter:" dist/en/solopreneur-mrr-calculator/index.html | head -10`
Expected: 1 canonical + 3 hreflang + 4 twitter meta tags.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "feat(seo): add canonical, hreflang (en/zh/x-default), twitter card to BaseLayout"
```

---

## Task 9: Add `--check` mode to `codegen-customfn.mjs` (H5)

**Files:**
- Modify: `scripts/codegen-customfn.mjs` (add CLI flag handling)

- [ ] **Step 1: Read the script's main() / run() function**

Find the entry point. The script currently has no CLI flag handling.

- [ ] **Step 2: Capture current output as the "expected" baseline**

Run: `node scripts/codegen-customfn.mjs > /tmp/baseline.mjs.out 2>&1`
Expected: writes to engines (idempotent on first run; subsequent runs should be no-op).

Actually, since the script writes directly to engine files, the way to make `--check` work is:
1. Make the script buffer its output (write to memory, not disk) when `--check` is passed
2. Compare with the current on-disk content
3. Exit 1 if any diff

The minimal change: wrap the existing per-engine `writeFileSync` calls in a function that, on `--check`, diffs against current content.

- [ ] **Step 3: Add `--check` handling**

At the top of the script (or wherever the entry point is), parse `process.argv`:
```js
const CHECK_MODE = process.argv.includes('--check');
```

Then for each engine file, change:
```js
fs.writeFileSync(filePath, content);
```
to:
```js
if (CHECK_MODE) {
  const current = fs.readFileSync(filePath, 'utf8');
  if (current !== content) {
    console.error(`✗ ${file}: drift detected (re-run without --check to update)`);
    hasDiff = true;
  }
} else {
  fs.writeFileSync(filePath, content);
}
```

At the end, `if (hasDiff) process.exit(1)`.

- [ ] **Step 4: Verify --check passes on clean state**

Run: `node scripts/codegen-customfn.mjs --check`
Expected: exits 0, prints nothing (or "✓ all engines in sync").

- [ ] **Step 5: Verify --check fails on injected drift**

Inject a tiny edit to one engine's customFn, run --check, expect exit 1. Revert the edit.

- [ ] **Step 6: Commit**

```bash
git add scripts/codegen-customfn.mjs
git commit -m "feat(codegen-customfn): add --check mode (mirrors codegen-examples) for CI drift detection"
```

---

## Task 10: Add `check` scripts to `package.json` (M1)

**Files:**
- Modify: `package.json:8-14`

- [ ] **Step 1: Add the scripts**

```json
"scripts": {
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "sync": "node scripts/sync-pricing.mjs && node scripts/codegen-customfn.mjs && node scripts/codegen-examples.mjs",
  "translate": "tsx scripts/translate-wordpools.ts",
  "check": "tsc --noEmit && node scripts/codegen-examples.mjs --check && node scripts/codegen-customfn.mjs --check",
  "check:examples": "node scripts/codegen-examples.mjs --check",
  "check:customfn": "node scripts/codegen-customfn.mjs --check",
  "check:types": "tsc --noEmit"
}
```

- [ ] **Step 2: Verify all check scripts work**

Run each:
- `pnpm check:examples` — should exit 0
- `pnpm check:customfn` — should exit 0 (after Task 9)
- `pnpm check:types` — should exit 0
- `pnpm check` — should exit 0

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat(scripts): add check / check:examples / check:customfn / check:types (CLAUDE.md promised pnpm check)"
```

---

## Task 11: Add `.github/workflows/ci.yml` (H10)

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the workflow file**

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [master, main]

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Typecheck
        run: pnpm check:types

      - name: Drift check (staticExamples)
        run: pnpm check:examples

      - name: Drift check (customFn data tables)
        run: pnpm check:customfn

      - name: Build
        run: pnpm build
```

- [ ] **Step 2: Verify YAML is well-formed**

Run: `node -e "require('fs').readFileSync('.github/workflows/ci.yml', 'utf8')" && echo OK`
Expected: OK

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add CI workflow (typecheck + drift checks + build on PR/push to master)"
```

---

## Final verification

After all 11 tasks:

- [ ] **Step 1: Run the full quality gate locally**

```bash
pnpm check && pnpm build
```
Expected: all green, 141 pages built.

- [ ] **Step 2: Review git log**

```bash
git log --oneline -15
```
Expected: 11 atomic commits, all with clear messages.

- [ ] **Step 3: (Optional) Push to remote and open a PR**

```bash
git push -u origin HEAD
gh pr create --title "fix(audit): 4 critical bugs + hygiene + SEO + CI gate" --body "Closes 4 critical + several high/medium audit findings from 2026-06-24 global audit. Defers H1/H2/H3 to follow-up plans."
```

---

## Self-review (before execution)

**Spec coverage:**
- ✅ C1 (saas-valuation bm2) — Task 1
- ✅ C2 (churn-rate escape) — Task 2
- ✅ C3 (deepseek false claim) — Task 3
- ✅ C4 (gpu-cloud precedence) — Task 4
- ✅ Hygiene 3 scripts — Task 5
- ✅ Hygiene google-trends-api — Task 6
- ✅ M10 (7 `$$` typos) — Task 7
- ✅ M5 (BaseLayout SEO) — Task 8
- ✅ H5 (codegen-customfn --check) — Task 9
- ✅ M1 (package.json check scripts) — Task 10
- ✅ H10 (ci.yml) — Task 11

**Deferred (out of scope):**
- H1: 8 AI cost customFn sync (needs per-engine diff review)
- H2: Presets component extraction (700-line refactor)
- H3: sync-pricing.mjs schema + SHA pin (touches CI supply chain; needs separate review)
- H6: break-even + unit-economics 🎯 section (engine content)
- H7: ai-image section order (engine content)
- H8: ai-training 🏆 section (engine content)
- H9: hourly-vs-fixed math fix (engine content)
- M2-M9, M11-M12, all LOW/NIT (defer to engine-quality follow-up plan)

**Total: 11 atomic commits, ~2-3 hours of work.**
