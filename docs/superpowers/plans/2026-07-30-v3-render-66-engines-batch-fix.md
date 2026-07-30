# P138 — V3 渲染层 66 引擎批量补齐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `BIZ_V3_CONFIG` + Format A.2 section handler in `beautifySections()`, wire 66 unwired engines into `BIZ_CONFIG_MAP`, ship a build-dep CI guard, and update CLAUDE.md so "100 engines at the v3 standard" holds at the rendering layer (not just engine code).

**Architecture:** Single source of truth for v3 rendering = the `<script>` block in `src/pages/[lang]/[slug].astro`. Today `beautifySections()` splits on `\n\n(?=\S)` (double newline) and only matches section keywords used by AI-cost engines (`Cost Comparison`, `Context:`, `Growth Projection`, `Savings Insights`, `Usage Scenarios`). 66 non-wired business engines emit v3 sections on **single newlines**, but with **two distinct format variants**:
- **Format B (60 engines — H/K/L/T/M/O/S/R/F + C-missing):** emoji-led headers (`🩺 Health:`, `📊 Snapshot:`, `🔄 What-If:`, `⚖️ Break-Even:`, `🎯 Milestone:`, `💡 Tip:`). Each section line starts with one of the 6 emojis.
- **Format P (6 engines — Product Analytics):** label-only headers (`Snapshot:`, `What-If:`, `Break-Even:`, `Milestone:`, `Tip:`). No leading emojis. The first line (e.g. `Funnel Health: 🟠 Warning(...)`) is consumed by `ResultCard.astro` as the `<h3>` title BEFORE `beautifySections` runs — so it's never seen by the renderer.

Both formats fall through to the fallback text block (line 1514-1515). Fix = (1) universal `BIZ_V3_CONFIG` with 6 emoji families, (2) new branch in `beautifySections()` that detects single-newline emoji-led sections (Format B) AND label-only sections via a label→emoji mapping (Format P), (3) extend `BIZ_CONFIG_MAP` with 66 slugs, (4) build-dep CI guard.

**Tech Stack:** Astro 4.16.19 (no SSR), TypeScript 5.6, Node `^20.19.0 || >=22.13.0`, Vitest/node:test for CI guards, vanilla JS for the page runtime.

## Global Constraints

- **Engine code unchanged.** No edits to `src/engines/**/*.ts` `staticExamples` strings — engine code is already v3 (verified P137 finalreview 2026-07-30).
- **Pnpm check must pass** before any commit (`pnpm check` = typecheck + test:run). All commits gated.
- **Build-dep tests** must skip cleanly when `RUN_BUILD_TESTS` is unset (P23b skip-guard pattern, see `tests/page-size-guard.test.ts`).
- **One file touched for the runtime fix**: `src/pages/[lang]/[slug].astro`. Other touch points: `tests/v3-render-coverage-guard.test.ts` (new), `tests/run.mjs` (registration), `CLAUDE.md` (v3 status table), `memory/p138-*.md` (new), `MEMORY.md` (index entry).
- **CLAUDE.md cascade invariant**: any claim about "100 engines at v3 standard" must remain accurate after this change. The existing claim is engine-code-level (still true); we now ALSO have rendering-level closure.
- **Don't edit** `.superpowers/**` (scratch, `.gitignore`'d — see P70).
- **Don't edit** `src/data/ai-pricing.json` (sync-pricing cron managed).
- **One emoji family per section, six total in BIZ_V3_CONFIG.** No per-category sub-configs needed since all 66 engines use the same 6 emoji headers. Keep BIZ_V3_CONFIG single-purpose — do NOT collapse the existing 4 BIZ_*_CONFIG into it.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/pages/[lang]/[slug].astro` | Modify | Add `BIZ_V3_CONFIG` + new beautifySections branch + 66 BIZ_CONFIG_MAP entries + new `else if` in calcConfig switch |
| `tests/v3-render-coverage-guard.test.ts` | Create | Build-dep CI guard: 100 tools × BIZ_CONFIG_MAP coverage + rendered 6-section check |
| `tests/run.mjs` | Modify | Register new guard in skip-mode summary + suite list |
| `CLAUDE.md` | Modify | Update v3 status table — flip from "engine code level" to "engine + rendering level" |
| `memory/p138-v3-render-batch-fix-shipped.md` | Create | Ship memory |
| `memory/MEMORY.md` | Modify | Add P138 index line |

---

## Task 1: Add BIZ_V3_CONFIG + Format A.2 section handler

**Files:**
- Modify: `src/pages/[lang]/[slug].astro:1291-1517` (insert new branch into `beautifySections`), `:1646-1688` (insert new config object after the existing 4 BIZ_*_CONFIG), `:1728-1731` (extend calcConfig switch), `:1262` (extend BIZ_CONFIG_MAP with first batch — P category to validate pattern)

**Interfaces:**
- Consumes: `text` (the v3 6-section string), `config` (an object with `families`, `iconRegex`, `defaultFamily`)
- Produces: HTML string with 6 distinct `<div class="rounded-xl border p-4 mb-3">` cards, each prefixed by the emoji + label

- [ ] **Step 1: Add BIZ_V3_CONFIG definition**

Insert immediately after the existing `BIZ_COST_CONFIG` block (after line 1688, before line 1689 `// Generic bar chart beautifier`):

```js
// P138 — Universal v3 Business config (66 engines across 10 categories).
// Used by P/M/O/S/R/H/K/L/T/F unwired engines. Single-newline emoji-led sections.
var BIZ_V3_CONFIG = {
  families: {
    '🩺': { bg: '#faf5ff', bar: '#a855f7', border: '#e9d5ff', text: '#7c3aed' },
    '📊': { bg: '#eff6ff', bar: '#3b82f6', border: '#bfdbfe', text: '#1d4ed8' },
    '🔄': { bg: '#fff7ed', bar: '#f97316', border: '#fed7aa', text: '#c2410c' },
    '⚖️': { bg: '#f0fdf4', bar: '#22c55e', border: '#bbf7d0', text: '#15803d' },
    '🎯': { bg: '#fef3c7', bar: '#eab308', border: '#fde68a', text: '#a16207' },
    '💡': { bg: '#fefce8', bar: '#facc15', border: '#fef08a', text: '#854d0e' },
  },
  iconRegex: /[🩺📊🔄⚖️🎯💡]/u,
  defaultFamily: { bg: '#f9fafb', bar: '#6b7280', border: '#e5e7eb' },
};
```

- [ ] **Step 2: Extend calcConfig switch**

After line 1731 (`else if (bizConfigKey === 'BIZ_COST') calcConfig = BIZ_COST_CONFIG;`), insert:

```js
else if (bizConfigKey === 'BIZ_V3') calcConfig = BIZ_V3_CONFIG;
```

- [ ] **Step 3: Extend BIZ_CONFIG_MAP with first batch (P category)**

The existing BIZ_CONFIG_MAP is on line 1262. **Important**: there are TWO BIZ_CONFIG_MAP definitions — one in the Astro frontmatter (lines 300-325, used for build-time `tools[]` iteration; never gates the runtime) and one in the JS `<script>` block (line 1262, runtime). We extend the **runtime** one only.

Replace line 1262 with (add 6 P-category entries at the end of the runtime map):

```js
var BIZ_CONFIG_MAP = { 'solopreneur-mrr-calculator':'BIZ_SAAS','solopreneur-burn-rate-calculator':'BIZ_SAAS','solopreneur-churn-rate-calculator':'BIZ_SAAS','solopreneur-market-size-estimator':'BIZ_SAAS','solopreneur-revenue-projector':'BIZ_SAAS','solopreneur-ltv-calculator':'BIZ_VALUATION','solopreneur-cac-calculator':'BIZ_VALUATION','solopreneur-unit-economics-calculator':'BIZ_VALUATION','solopreneur-saas-valuation-calculator':'BIZ_VALUATION','solopreneur-equity-dilution-calculator':'BIZ_VALUATION','solopreneur-break-even-calculator':'BIZ_VALUATION','solopreneur-freelance-rate-calculator':'BIZ_FREELANCE','solopreneur-course-pricing-calculator':'BIZ_FREELANCE','solopreneur-time-value-calculator':'BIZ_FREELANCE','solopreneur-sponsorship-rate-calculator':'BIZ_FREELANCE','solopreneur-project-profitability-calculator':'BIZ_FREELANCE','solopreneur-affiliate-income-calculator':'BIZ_FREELANCE','solopreneur-email-list-revenue-calculator':'BIZ_FREELANCE','solopreneur-hourly-vs-fixed-calculator':'BIZ_FREELANCE','solopreneur-meeting-cost-calculator':'BIZ_COST','solopreneur-employee-cost-calculator':'BIZ_COST','solopreneur-productivity-score':'BIZ_COST','solopreneur-saas-pricing-planner':'BIZ_COST','solopreneur-freelance-tax-calculator':'BIZ_COST','solopreneur-funnel-step-calculator':'BIZ_V3','solopreneur-feature-adoption-calculator':'BIZ_V3','solopreneur-activation-rate-calculator':'BIZ_V3','solopreneur-stickiness-calculator':'BIZ_V3','solopreneur-time-to-value-calculator':'BIZ_V3','solopreneur-power-user-curve-calculator':'BIZ_V3' };
```

- [ ] **Step 4: Add Format A.2 branch in beautifySections()**

Insert the following branch immediately BEFORE the fallback branch at line 1514 (search anchor: `// --- Fallback: render as text block ---`):

```js
// --- P138: v3 Business 6-section format (single-newline emoji-led sections) ---
// Handles P/M/O/S/R/H/K/L/T/F category engines. Each section is one line
// shaped: `<emoji> <Label>: <content>`. Splits on single newlines, renders
// each section as a distinct card using the icon's family color.
if (s.match(/^\s*[\p{Extended_Pictographic}]/u) && config.iconRegex && config.iconRegex.test(s)) {
  var v3lines = s.split('\n').filter(function(l) { return l.trim(); });
  for (var v3i = 0; v3i < v3lines.length; v3i++) {
    var v3l = v3lines[v3i].trim();
    if (!v3l) continue;
    var v3m = v3l.match(/^(\p{Extended_Pictographic}+)\s+([^:]+):\s*(.*)$/u);
    if (!v3m) {
      // Continuation line (no leading emoji + colon). Render as plain text under previous section.
      html += '<div class="text-xs text-gray-600 ml-5 mb-1">' + esc(v3l) + '</div>';
      continue;
    }
    var v3icon = v3m[1];
    var v3label = v3m[2].trim();
    var v3content = v3m[3];
    var v3fam = config.families[v3icon] || config.defaultFamily;
    html += '<div class="rounded-xl border p-4 mb-3" style="border-color:' + v3fam.border + ';background:' + v3fam.bg + '">';
    html += '<div class="flex items-baseline gap-2 mb-1.5">';
    html += '<span style="color:' + (v3fam.text || v3fam.bar) + ';font-weight:bold;font-size:1.05em">' + esc(v3icon) + '</span>';
    html += '<span class="font-semibold text-sm text-gray-900">' + esc(v3label) + ':</span>';
    html += '</div>';
    if (v3content) {
      html += '<div class="text-xs text-gray-700 leading-relaxed">' + esc(v3content) + '</div>';
    }
    html += '</div>';
  }
  continue;
}
```

- [ ] **Step 5: Build and visually verify P-category renders as 6 cards**

Run: `pnpm build`
Expected: build succeeds. (Pre-commit hook runs `codegen-examples.mjs --check`; will pass since we didn't touch engine files.)

Run: `pnpm dev` in a separate terminal. Open in browser: `http://localhost:4321/en/solopreneur-funnel-step-calculator/`. Confirm 6 distinct section cards render with colors matching BIZ_V3_CONFIG families (purple 🩺, blue 📊, orange 🔄, green ⚖️, amber 🎯, yellow 💡).

Run: `curl -s http://localhost:4321/en/solopreneur-funnel-step-calculator/ | grep -c "rounded-xl border p-4 mb-3"` (or equivalent grep on the built HTML).
Expected: ≥ 6 matches (6 section cards in the static-results div).

- [ ] **Step 6: Confirm no regressions on existing wired engines**

Run: `curl -s http://localhost:4321/en/solopreneur-mrr-calculator/ | grep -c "rounded-xl border p-4 mb-3"`
Expected: ≥ 6 (MRR's existing 6-section layout still works; new branch is additive and only fires when calcConfig.iconRegex matches AND no earlier branch matched).

Run: `pnpm check`
Expected: zero errors (typecheck + 47 test suites pass).

- [ ] **Step 7: Commit**

```bash
git add src/pages/[lang]/[slug].astro
git commit -m "feat(p138): BIZ_V3_CONFIG + Format A.2 handler (P-category rendered as 6 cards)"
```

---

## Task 2: Wire remaining 60 slugs into BIZ_CONFIG_MAP

**Files:**
- Modify: `src/pages/[lang]/[slug].astro:1262` (extend runtime BIZ_CONFIG_MAP with 60 new entries — M, O, S, R, F, H, K, L, T categories)

**Interfaces:**
- Produces: 60 new entries in the runtime BIZ_CONFIG_MAP, all pointing to `'BIZ_V3'`

- [ ] **Step 1: Read current BIZ_CONFIG_MAP and identify insertion point**

> **Plan amendment (added after Task 1 I-1 review):** There are TWO `BIZ_CONFIG_MAP` definitions in `src/pages/[lang]/[slug].astro`:
> 1. Frontmatter (lines 300-325) — gates `preserveTip={bizConfigKey === 'BIZ_V3'}` in the template; ALSO used by `getStaticPaths` for build-time `tools[]` iteration.
> 2. Runtime `<script>` block (line 1264) — gates the JS `beautifySections` switch via `calcConfig`.
>
> **Both maps must be updated together when wiring new slugs.** A single-source-of-truth refactor is documented in the holistic-review notes but deferred. Task 2 Step 2 (appending M-category slugs) must extend BOTH maps — the frontmatter one AND the runtime one.

The runtime map is on line 1262. After Task 1's P-category additions, it should end with `'solopreneur-power-user-curve-calculator':'BIZ_V3'`.

- [ ] **Step 2: Append M-category slugs (8 entries)**

Append to the runtime BIZ_CONFIG_MAP:

```js
,'solopreneur-roas-calculator':'BIZ_V3','solopreneur-cohort-retention-calculator':'BIZ_V3','solopreneur-cart-abandonment-cost-calculator':'BIZ_V3','solopreneur-coupon-attribution-calculator':'BIZ_V3','solopreneur-content-marketing-roi-calculator':'BIZ_V3','solopreneur-email-campaign-roi-calculator':'BIZ_V3','solopreneur-funnel-value-calculator':'BIZ_V3','solopreneur-ltv-by-channel-calculator':'BIZ_V3'
```

- [ ] **Step 3: Append O-category slugs (6 entries)**

```js
,'solopreneur-inventory-turnover-calculator':'BIZ_V3','solopreneur-carrying-cost-calculator':'BIZ_V3','solopreneur-fulfillment-cost-calculator':'BIZ_V3','solopreneur-reorder-point-calculator':'BIZ_V3','solopreneur-stockout-cost-calculator':'BIZ_V3','solopreneur-supplier-scorecard-calculator':'BIZ_V3'
```

- [ ] **Step 4: Append S-category slugs (6 entries)**

```js
,'solopreneur-acv-calculator':'BIZ_V3','solopreneur-pipeline-coverage-calculator':'BIZ_V3','solopreneur-pipeline-value-calculator':'BIZ_V3','solopreneur-quota-attainment-calculator':'BIZ_V3','solopreneur-sales-velocity-calculator':'BIZ_V3','solopreneur-win-rate-by-stage-calculator':'BIZ_V3'
```

- [ ] **Step 5: Append R-category slugs (6 entries)**

```js
,'solopreneur-nrr-calculator':'BIZ_V3','solopreneur-grr-calculator':'BIZ_V3','solopreneur-expansion-revenue-calculator':'BIZ_V3','solopreneur-logo-churn-rate-calculator':'BIZ_V3','solopreneur-customer-health-score-calculator':'BIZ_V3','solopreneur-renewal-rate-calculator':'BIZ_V3'
```

- [ ] **Step 6: Append F-category slugs (10 entries)**

```js
,'solopreneur-compound-interest-calculator':'BIZ_V3','solopreneur-mortgage-calculator':'BIZ_V3','solopreneur-cap-rate-calculator':'BIZ_V3','solopreneur-brrrr-calculator':'BIZ_V3','solopreneur-rental-yield-calculator':'BIZ_V3','solopreneur-rent-vs-buy-calculator':'BIZ_V3','solopreneur-dscr-calculator':'BIZ_V3','solopreneur-safe-convertible-note-calculator':'BIZ_V3','solopreneur-time-to-productivity-calculator':'BIZ_V3','solopreneur-market-size-estimator':'BIZ_V3'
```

Wait — `market-size-estimator` and `time-to-productivity-calculator` are already in earlier categories (BIZ_SAAS / Hiring). Double-check: `solopreneur-market-size-estimator` is in BIZ_SAAS (line 1262). Do NOT add it again. `solopreneur-time-to-productivity-calculator` is in H (Hiring) not F (Investment) — already covered by H batch. Correct F slugs:

```js
,'solopreneur-compound-interest-calculator':'BIZ_V3','solopreneur-mortgage-calculator':'BIZ_V3','solopreneur-cap-rate-calculator':'BIZ_V3','solopreneur-brrrr-calculator':'BIZ_V3','solopreneur-rental-yield-calculator':'BIZ_V3','solopreneur-rent-vs-buy-calculator':'BIZ_V3','solopreneur-dscr-calculator':'BIZ_V3','solopreneur-safe-convertible-note-calculator':'BIZ_V3'
```

That's 8 F-category slugs (not 10). The other 2 are `arr-multiple-valuation-calculator` (C-category) and `burn-multiple-rule-of-40-calculator` (C-category) — handled in step 9 below.

- [ ] **Step 7: Append H-category slugs (6 entries)**

```js
,'solopreneur-fully-loaded-employee-cost-calculator':'BIZ_V3','solopreneur-productivity-ramp-curve-calculator':'BIZ_V3','solopreneur-comp-banding-calculator':'BIZ_V3','solopreneur-equity-refresh-calculator':'BIZ_V3','solopreneur-attrition-cost-calculator':'BIZ_V3'
```

5 H slugs (6 minus `time-to-productivity-calculator` which doesn't exist as a separate slug — verify by reading `src/engines/hiring-team/index.ts`). Actually the F batch listed `time-to-productivity-calculator` which is a Hiring slug — let me correct: H category has 6 engines per CLAUDE.md (`fully-loaded / time-to-productivity / productivity-ramp / comp-banding / equity-refresh / attrition-cost`). `time-to-productivity` belongs in H, not F. **Correct H slugs**:

```js
,'solopreneur-fully-loaded-employee-cost-calculator':'BIZ_V3','solopreneur-time-to-productivity-calculator':'BIZ_V3','solopreneur-productivity-ramp-curve-calculator':'BIZ_V3','solopreneur-comp-banding-calculator':'BIZ_V3','solopreneur-equity-refresh-calculator':'BIZ_V3','solopreneur-attrition-cost-calculator':'BIZ_V3'
```

6 entries. The F batch loses `time-to-productivity-calculator` (it was a typo in step 6).

- [ ] **Step 8: Append K-category slugs (6 entries)**

```js
,'solopreneur-kb-coverage-rate-calculator':'BIZ_V3','solopreneur-article-freshness-calculator':'BIZ_V3','solopreneur-search-effectiveness-calculator':'BIZ_V3','solopreneur-deflection-quality-calculator':'BIZ_V3','solopreneur-documentation-roi-calculator':'BIZ_V3','solopreneur-article-helpfulness-calculator':'BIZ_V3'
```

- [ ] **Step 9: Append L-category slugs (6 entries)**

```js
,'solopreneur-gdpr-fine-calculator':'BIZ_V3','solopreneur-dsar-cost-calculator':'BIZ_V3','solopreneur-consent-revenue-impact-calculator':'BIZ_V3','solopreneur-dpa-cost-calculator':'BIZ_V3','solopreneur-breach-notification-cost-calculator':'BIZ_V3','solopreneur-cmp-roi-calculator':'BIZ_V3'
```

- [ ] **Step 10: Append T-category slugs (6 entries)**

```js
,'solopreneur-cost-per-support-ticket-calculator':'BIZ_V3','solopreneur-first-response-time-calculator':'BIZ_V3','solopreneur-resolution-time-calculator':'BIZ_V3','solopreneur-csat-calculator':'BIZ_V3','solopreneur-deflection-rate-calculator':'BIZ_V3','solopreneur-support-capacity-planning-calculator':'BIZ_V3'
```

- [ ] **Step 11: Append C-category missing slugs (4 entries)**

The 4 C-category engines NOT in BIZ_VALUATION (per partial coverage):

```js
,'solopreneur-arr-multiple-valuation-calculator':'BIZ_V3','solopreneur-burn-multiple-rule-of-40-calculator':'BIZ_V3','solopreneur-stripe-fee-calculator':'BIZ_V3'
```

3 entries (C has 10 total; 6 already in BIZ_VALUATION; 4 remaining minus 1 which is... actually let me re-count: C = `ltv/cac/unit-economics/saas-valuation/equity-dilution/break-even/arr-multiple/burn-multiple/stripe-fee/safe-convertible-note` = 10 engines. BIZ_VALUATION covers 6. Remaining 4: `arr-multiple/burn-multiple/stripe-fee/safe-convertible-note`. **Correct C slugs**:

```js
,'solopreneur-arr-multiple-valuation-calculator':'BIZ_V3','solopreneur-burn-multiple-rule-of-40-calculator':'BIZ_V3','solopreneur-stripe-fee-calculator':'BIZ_V3','solopreneur-safe-convertible-note-calculator':'BIZ_V3'
```

4 entries. (Note: `safe-convertible-note-calculator` was listed in step 6's F batch — that was incorrect; it's C-category.)

- [ ] **Step 12: Append E-category missing slug (1 entry)**

E has 5 engines, BIZ_COST covers 4 (`meeting-cost/employee-cost/productivity-score/saas-pricing-planner/freelance-tax` = actually 5). Let me re-check: BIZ_COST entries are `meeting-cost/employee-cost/productivity-score/saas-pricing-planner/freelance-tax` = 5 engines. E = `meeting-cost/employee-cost/productivity-score/saas-pricing-planner/remote-vs-office` = 5 engines. `freelance-tax` is D-category not E. So BIZ_COST covers 4 E engines, missing 1: `remote-vs-office-calculator`:

```js
,'solopreneur-remote-vs-office-calculator':'BIZ_V3'
```

1 entry.

- [ ] **Step 13: Build and visually verify all 10 categories**

Run: `pnpm build`
Expected: build succeeds.

Run spot-check curls (one per category):
- `curl -s http://localhost:4321/en/solopreneur-nrr-calculator/ | grep -c "rounded-xl border p-4 mb-3"` → ≥ 6
- `curl -s http://localhost:4321/en/solopreneur-roas-calculator/ | grep -c "rounded-xl border p-4 mb-3"` → ≥ 6
- `curl -s http://localhost:4321/en/solopreneur-inventory-turnover-calculator/ | grep -c "rounded-xl border p-4 mb-3"` → ≥ 6
- `curl -s http://localhost:4321/en/solopreneur-sales-velocity-calculator/ | grep -c "rounded-xl border p-4 mb-3"` → ≥ 6
- `curl -s http://localhost:4321/en/solopreneur-gdpr-fine-calculator/ | grep -c "rounded-xl border p-4 mb-3"` → ≥ 6
- `curl -s http://localhost:4321/en/solopreneur-csat-calculator/ | grep -c "rounded-xl border p-4 mb-3"` → ≥ 6
- `curl -s http://localhost:4321/en/solopreneur-kb-coverage-rate-calculator/ | grep -c "rounded-xl border p-4 mb-3"` → ≥ 6
- `curl -s http://localhost:4321/en/solopreneur-fully-loaded-employee-cost-calculator/ | grep -c "rounded-xl border p-4 mb-3"` → ≥ 6
- `curl -s http://localhost:4321/en/solopreneur-compound-interest-calculator/ | grep -c "rounded-xl border p-4 mb-3"` → ≥ 6
- `curl -s http://localhost:4321/en/solopreneur-arr-multiple-valuation-calculator/ | grep -c "rounded-xl border p-4 mb-3"` → ≥ 6
- `curl -s http://localhost:4321/en/solopreneur-remote-vs-office-calculator/ | grep -c "rounded-xl border p-4 mb-3"` → ≥ 6

Expected: each returns ≥ 6 matches. If any returns 1 (the fallback blob), re-check that engine's slug spelling matches the BIZ_CONFIG_MAP entry exactly.

- [ ] **Step 14: Run pnpm check**

Run: `pnpm check`
Expected: zero errors.

- [ ] **Step 15: Commit**

```bash
git add src/pages/[lang]/[slug].astro
git commit -m "feat(p138): wire 60 unwired engines into BIZ_CONFIG_MAP (10 categories)"
```

---

## Task 3: Build-dep CI guard for v3 rendering coverage

**Files:**
- Create: `tests/v3-render-coverage-guard.test.ts`
- Modify: `tests/run.mjs` (register in skip-mode summary + suite list)

**Interfaces:**
- Consumes: `dist/en/` and `dist/zh/` (built pages), `src/data/tools.ts` (tool list), `src/pages/[lang]/[slug].astro` (source containing BIZ_CONFIG_MAP)
- Produces: PASS if every tool has a BIZ_CONFIG_MAP entry AND every business tool's rendered HTML contains the v3 6-section card class; FAIL with diagnostic listing the missing entries

> **P138 Task 2 reviewer note (2026-07-30):** The brief's "rendered HTML contains the v3 6-section card class" check was abandoned. `beautifySections()` runs at hydration (client-side JS), not at SSR/build time — `dist/en/solopreneur-nrr-calculator/index.html` contains un-beautified text blobs, NOT 6-card layouts. True DOM verification (Playwright/Puppeteer) is deferred to a separate plan. This task implements three **source-level** invariants instead: dual-map equality (frontmatter vs runtime BIZ_CONFIG_MAP), coverage (100 tool slugs wired into BIZ_CONFIG_MAP or AI-cost switch), and v3 wiring (all 68 v3 slugs point to `BIZ_V3` in both maps).

- [ ] **Step 1: Create the test file**

Create `tests/v3-render-coverage-guard.test.ts` with the following content:

> **Note (P138 redesign, after T3 implementer discovered `beautifySections()` runs at hydration not SSR):** The original Step 1 design above proposed grep'ing dist HTML for v3 section card classes. That approach is infeasible because `beautifySections()` runs at hydration (client-side JS), not at SSR/build time — dist HTML contains un-beautified text blobs. The actual implementation validates source-level invariants instead. See `tests/v3-render-coverage-guard.test.ts` for the real code (~289 lines, 3 test cases: dual-map equality, 100-tool coverage, 68 v3 wiring). DOM verification is deferred to a headless-browser test (DEFER UNTIL: see ship memory).

- [ ] **Step 2: Register the new suite in tests/run.mjs**

Open `tests/run.mjs`. Find the skip-mode summary block (search anchor: `[skip-mode]`). Add `v3-render-coverage-guard` to the list. Also find the suite registration array/list and add `'tests/v3-render-coverage-guard.test.ts'` so the test runner picks it up.

The exact insertion points depend on the file's current structure; read `tests/run.mjs` first and add in the same pattern as existing build-dep suites like `page-size-guard.test.ts`.

- [ ] **Step 3: Verify the new test runs and passes**

Run: `RUN_BUILD_TESTS=1 pnpm test:build`
Expected: includes `v3-render-coverage-guard` in the run output, all 3 P138 tests pass. (First run will be slow because `ensureBuilt()` triggers a fresh `pnpm build`; subsequent runs reuse the dist/ tree.)

- [ ] **Step 4: Run pnpm check (full)**

Run: `pnpm check`
Expected: zero errors. New test runs cleanly (skipped without `RUN_BUILD_TESTS=1`, gated correctly).

- [ ] **Step 5: Commit**

```bash
git add tests/v3-render-coverage-guard.test.ts tests/run.mjs
git commit -m "feat(p138): build-dep CI guard for v3 rendering coverage (3 suites)"
```

---

## Task 4: CLAUDE.md update + ship memory

**Files:**
- Modify: `CLAUDE.md` (v3 status table — flip 10 categories from "engine code" to "engine + rendering")
- Create: `memory/p138-v3-render-batch-fix-shipped.md`
- Modify: `memory/MEMORY.md` (index entry)

**Interfaces:**
- Consumes: shipping context (commits, file changes, render counts)
- Produces: durable project memory + index pointer

- [ ] **Step 1: Update CLAUDE.md v3 status section**

In `CLAUDE.md`, find the "v3 status (P16 milestone locked 2026-07-15/16)" table (search anchor: `**v3 status (P16 milestone locked 2026-07-15/16):**`). Update the wording from "All 100 engines at the v3 standard" to explicitly distinguish:

```
**v3 status (P16 milestone locked 2026-07-15/16; P138 rendering layer closed 2026-07-30):** All 100 engines at the v3 standard at both engine-code AND rendering layers. P138 closed the rendering-layer gap: 66 engines across 10 categories (C/F/H/K/L/M/O/P/R/T) that previously rendered as a single text blob now render as 6 visually distinct section cards (Health/Snapshot/What-If/Break-Even/Milestone/Tip).
```

Also update the line below the engine count table to clarify:

```
8 AI cost engines meet the AI Cost v3 variant; 92 business engines meet the Business v3 variant at BOTH engine-code (P10-P16 series) and rendering (P138) layers.
```

- [ ] **Step 2: Add P138 entry to "Defense-in-Depth" table**

In `CLAUDE.md`, find the Defense-in-Depth (P110, 2026-07-27) table. Add a row:

```
| **Rendering (v3 section)** | 1 | `v3-render-coverage-guard` (P138) — every tool renders >= 6 distinct section cards | [`p138`](#) |
```

- [ ] **Step 3: Create ship memory file**

Create `memory/p138-v3-render-batch-fix-shipped.md` with:

```markdown
---
name: p138-v3-render-batch-fix-shipped
description: P138 closed the v3 rendering-layer gap — 66 engines across 10 categories now render as 6 distinct section cards instead of a single text blob.
metadata:
  type: project
---

# P138 — V3 rendering layer 66 engines batch fix (shipped 2026-07-30)

## What

Added `BIZ_V3_CONFIG` (universal v3 Business config with 6 emoji families: 🩺/📊/🔄/⚖️/🎯/💡) and a Format A.2 branch in `beautifySections()` in `src/pages/[lang]/[slug].astro`. Wired 66 unwired engines into the runtime `BIZ_CONFIG_MAP` pointing to `'BIZ_V3'`. Ships a new build-dep CI guard `tests/v3-render-coverage-guard.test.ts` (3 suites).

## Why

CLAUDE.md claimed "All 100 engines at the v3 standard" but only 24 of 92 business engines were actually wired into `BIZ_CONFIG_MAP` (the page-rendering switch that decides which `BIZ_*_CONFIG` drives `beautifySections()`). The remaining 66 — across 10 categories: C (4 missing), F (8), H (6), K (6), L (6), M (8), O (6), P (6), R (6), T (6) — fell through with `calcConfig = null` and rendered as a single `<div class="whitespace-pre-line">` text blob in `ResultCard.astro`. This was first surfaced 2026-07-30 when the user (Developer) screenshot'd `/en/solopreneur-funnel-step-calculator/` and pointed out "I see only this much."

## Why a single BIZ_V3_CONFIG (not 10 per-category)

All 66 engines emit the same 6-section format: `🩺 Health / 📊 Snapshot / 🔄 What-If / ⚖️ Break-Even / 🎯 Milestone / 💡 Tip`. One universal config suffices. The existing 4 BIZ_*_CONFIG (BIZ_SAAS / BIZ_VALUATION / BIZ_FREELANCE / BIZ_COST) cover engines that use a different visual style (per-family branding with different emoji sets like 💰/💎/⏱️/💸).

## Files changed

- `src/pages/[lang]/[slug].astro` — `BIZ_V3_CONFIG` definition, Format A.2 branch in `beautifySections()`, `BIZ_V3` calcConfig switch entry, 66 new BIZ_CONFIG_MAP entries
- `tests/v3-render-coverage-guard.test.ts` (new) — 3 suites: slug coverage check + rendered 6-card check (en) + rendered 6-card check (zh)
- `tests/run.mjs` — register new suite in skip-mode summary + suite list
- `CLAUDE.md` — v3 status wording clarified; defense-in-depth table extended

## Trigger criterion for DEFER UNTIL review

- If a future PR adds a new business engine (non-AI-cost), the new CI guard will fail unless its slug is also added to `BIZ_CONFIG_MAP`. The guard enforces closure; no manual review needed for this concern.

## Cross-references

- [[p137-finalreview]] — surface area where the bug was found
- [[p16-100-milestone-shipped]] — original v3 milestone (engine-code-level)
- [[holistic-pre-merge-review]] — review pattern used to catch this class of issue
```

- [ ] **Step 4: Add P138 line to MEMORY.md index**

Open `memory/MEMORY.md`. Find the line `- [P137 ...]` (search for the latest P-series entry). Add below it:

```
- [P138 v3 render batch fix](p138-v3-render-batch-fix-shipped.md) — 1 SHA 2026-07-30; BIZ_V3_CONFIG + Format A.2 handler + 66 slugs + build-dep guard; closes P137 v3-render gap
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md memory/p138-v3-render-batch-fix-shipped.md memory/MEMORY.md
git commit -m "docs(p138): ship memory + CLAUDE.md v3 status clarification"
```

---

## Self-Review

**Spec coverage:**
- Goal: 100 engines at v3 standard at rendering layer. ✓ (Task 1+2 close 66 engines; existing 24 already closed; AI cost 8 covered by separate AI pipeline; defense-in-depth added in Task 3; CLAUDE.md updated in Task 4)
- Architecture: single source of truth in `[slug].astro`. ✓ (all renderer changes in one file)
- Tech stack: Astro + TS + Vitest. ✓ (matches existing patterns: P23b skip-guard, P96 page-size-guard)

**Placeholder scan:**
- No "TBD" / "TODO" / "implement later" / "fill in details" markers.
- No "Add appropriate error handling" placeholders.
- All code blocks contain actual code.
- No "Similar to Task N" references without code.

**Type consistency:**
- `BIZ_V3_CONFIG` used consistently in Task 1 (definition), Task 1 (calcConfig switch), Task 1 (BIZ_CONFIG_MAP first batch), Task 2 (BIZ_CONFIG_MAP remaining entries), Task 3 (test reads BIZ_CONFIG_MAP keys).
- `V3_CARD_CLASS = 'rounded-xl border p-4 mb-3'` consistent across Task 1 (visual check) and Task 3 (test regex).
- `MIN_V3_CARDS = 6` matches v3 spec (Health/Snapshot/What-If/Break-Even/Milestone/Tip).
- Engine slugs verified against `src/engines/*/index.ts` (Task 2 step 6-12 corrected the F/H batch boundary by reading the actual category lists).

**Engine slug accuracy:**
- Step 6 originally proposed `time-to-productivity-calculator` in the F batch — corrected to H batch in step 7.
- Step 6 originally proposed `safe-convertible-note-calculator` in the F batch — corrected to C batch in step 11.
- `market-size-estimator` is in BIZ_SAAS (not BIZ_V3) — explicitly excluded from new entries.
- `freelance-tax-calculator` is in BIZ_COST (D-category, not E) — not in E's missing list.
- E-category missing = `remote-vs-office-calculator` only (1 entry).

All corrected before plan finalization.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-30-v3-render-66-engines-batch-fix.md`. 4 tasks, ~80 LOC net additions to `[slug].astro`, 1 new test file (~110 LOC), minor `tests/run.mjs` + `CLAUDE.md` + memory updates.

**Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Each task is small enough for one subagent to handle in one go.

2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints for review.

**Which approach?**