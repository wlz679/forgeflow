# Batch 2: 24 Business Calculators → v3 Standard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring all 24 business calculators (non-AI) to the same industry-leading standard as the 8 AI calculators — emoji health tiers (🟢🟡🟠🔴), sectioned dashboard output, what-if scenarios, detail cards, bar charts, presets, and `beautifySections` integration.

**Architecture:**
- **Engine layer:** Standardize `calculate()` to emit a 4-6 section emoji-headed dashboard (💰 Snapshot / 📐 Metrics / 🩺 Health / 🎯 Projections / 🔄 What-If) matching MRR template. Health tiers use 🟢🟡🟠🔴. `customFn` byte-for-byte sync (per project CLAUDE.md rule).
- **UI layer:** Add 4 `BIZ_*` family configs to `src/pages/[lang]/[slug].astro` `beautifySections`, each linked to a category: SaaS Metrics / Valuation / Freelance / Cost. Wire `isXxx` flags + `preset-buttons` for each calculator.
- **i18n layer:** Add `tools.${slug}.preset.*` keys (~6 per calculator × 24 = ~144 keys) for scenario chips.

**Tech Stack:** Astro 4.16.19 + TypeScript 5.6.3 + `@astrojs/sitemap@3.2.1` (locked in batch 1).

---

## Scope Audit (verified)

| Layer | Status | Evidence |
|---|---|---|
| **i18n** | ✅ All 24 tools have title/desc/≥5 FAQ/≥5 howToUse | `node audit-i18n.cjs` returned OK for all 24 |
| **Engines** | ⚠️ All 24 exist, but only MRR (419 lines) is v3 quality. Most are 150-180 lines, plain text, no health tiers | `wc -l src/engines/*.ts` |
| **UI** | ❌ Zero business calc has `beautifySections` config or presets. Only 8 AI calcs have isXxx flags | `grep isXxx src/pages/[lang]/[slug].astro` |
| **Build** | ✅ 141 pages pass | `pnpm build` 3.7s |

**v3 template (from MRR):**
1. Header: emoji + title
2. Section 1: 💰 Snapshot (key numbers)
3. Section 2: 📐 Key Metrics (industry ratios)
4. Section 3: 🩺 Health (tier-coded with 🟢🟡🟠🔴)
5. Section 4: 🎯 Projections / Milestones
6. Section 5: 🔄 What-If Scenarios (actionable)
7. Footer: 💡 Tip

---

## File Structure (delta)

### New
- `src/pages/[lang]/[slug].astro` — add 4 family configs (`BIZ_SAAS_CONFIG`, `BIZ_VALUATION_CONFIG`, `BIZ_FREELANCE_CONFIG`, `BIZ_COST_CONFIG`) + wire isXxx + add 24 preset chip blocks

### Modified
- 24 `src/engines/*.ts` — add emoji sections, health tiers, what-if scenarios, staticExamples update
- `src/i18n/translations.ts` — add ~144 preset keys (6 per calc × 24)

---

## Priority Groups (by ROI / visibility)

### Group A (P1) — 8 high-traffic calculators
mrr, ltv, cac, burn-rate, churn-rate, saas-valuation, unit-economics, revenue-projector

### Group B (P2) — 8 mid-traffic
break-even, market-size, time-value, sponsorship-rate, equity-dilution, freelance-rate, course-pricing, project-profitability

### Group C (P3) — 8 lower-traffic / simple
affiliate-income, email-list-revenue, hourly-vs-fixed, meeting-cost, employee-cost, productivity-score, saas-pricing-planner, freelance-tax

---

## Task 1: BeautifySections family configs + preset UI wiring

**Files:**
- Modify: `src/pages/[lang]/[slug].astro:884-966` (add 4 configs after GPU_CONFIG)
- Modify: `src/pages/[lang]/[slug].astro:998-1005` (wire 4 BIZ configs in calcConfig)
- Modify: `src/pages/[lang]/[slug].astro:425-540` (add 24 preset chip blocks after isGpu block)

- [ ] **Step 1: Add 4 family configs to [slug].astro**

Append after GPU_CONFIG (line 966):
```javascript
// Business calculator family configs — handles all 24 non-AI calculators via category
var BIZ_SAAS_CONFIG = {
  families: {
    '💰': { bg: '#eff6ff', bar: '#3b82f6', border: '#bfdbfe', text: '#3b82f6' },
    '📊': { bg: '#f0fdf4', bar: '#22c55e', border: '#bbf7d0', text: '#22c55e' },
    '📈': { bg: '#fff7ed', bar: '#f97316', border: '#fed7aa', text: '#f97316' },
  },
  iconRegex: /[💰📊📈]/u,
  defaultFamily: { bg: '#f9fafb', bar: '#6b7280', border: '#e5e7eb' },
};

var BIZ_VALUATION_CONFIG = {
  families: {
    '💎': { bg: '#f5f3ff', bar: '#7c3aed', border: '#ddd6fe', text: '#7c3aed' },
    '📊': { bg: '#eff6ff', bar: '#2563eb', border: '#bfdbfe', text: '#2563eb' },
    '💰': { bg: '#fffbeb', bar: '#f59e0b', border: '#fde68a', text: '#f59e0b' },
  },
  iconRegex: /[💎📊💰]/u,
  defaultFamily: { bg: '#f9fafb', bar: '#6b7280', border: '#e5e7eb' },
};

var BIZ_FREELANCE_CONFIG = {
  families: {
    '⏱️': { bg: '#ecfdf5', bar: '#10b981', border: '#a7f3d0', text: '#10b981' },
    '💵': { bg: '#fffbeb', bar: '#f59e0b', border: '#fde68a', text: '#f59e0b' },
    '🎯': { bg: '#f0fdf4', bar: '#22c55e', border: '#bbf7d0', text: '#22c55e' },
  },
  iconRegex: /[⏱️💵🎯]/u,
  defaultFamily: { bg: '#f9fafb', bar: '#6b7280', border: '#e5e7eb' },
};

var BIZ_COST_CONFIG = {
  families: {
    '💸': { bg: '#fef2f2', bar: '#ef4444', border: '#fecaca', text: '#ef4444' },
    '⏰': { bg: '#fff7ed', bar: '#f97316', border: '#fed7aa', text: '#f97316' },
    '👥': { bg: '#eff6ff', bar: '#3b82f6', border: '#bfdbfe', text: '#3b82f6' },
  },
  iconRegex: /[💸⏰👥]/u,
  defaultFamily: { bg: '#f9fafb', bar: '#6b7280', border: '#e5e7eb' },
};
```

- [ ] **Step 2: Wire 24 isXxx flags**

In `[slug].astro` after `isGpu` line, add:
```javascript
const isBurnRate = slug === 'solopreneur-burn-rate-calculator';
const isChurnRate = slug === 'solopreneur-churn-rate-calculator';
const isMRR = slug === 'solopreneur-mrr-calculator';
const isMarketSize = slug === 'solopreneur-market-size-estimator';
const isRevenueProjector = slug === 'solopreneur-revenue-projector';
// ... 19 more
```

In `<script define:vars>` after `var isGpu`:
```javascript
var isBurnRate = toolSlug === 'solopreneur-burn-rate-calculator';
// ... 19 more
```

In calcConfig switch (after `else if (isGpu) calcConfig = GPU_CONFIG;`):
```javascript
else if (isBurnRate || isChurnRate || isMRR || isMarketSize) calcConfig = BIZ_SAAS_CONFIG;
else if (isLTV || isCAC || isUnitEcon || isSaasValuation || isEquity) calcConfig = BIZ_VALUATION_CONFIG;
else if (isFreelanceRate || isCoursePricing || isTimeValue || isSponsorship || isProjectProfit || isAffiliate || isEmailList || isHourlyFixed) calcConfig = BIZ_FREELANCE_CONFIG;
else if (isMeetingCost || isEmployeeCost || isProductivity || isPricingPlanner || isFreelanceTax || isBreakEven) calcConfig = BIZ_COST_CONFIG;
```

- [ ] **Step 3: Add preset chip blocks**

After `isGpu` preset block (ends ~line 540), add 24 `isXxx && (<div class="flex flex-wrap gap-2 mt-3">...` blocks, each with 4-6 chips following the existing pattern. **Pattern** (per calc):
```jsx
{isMRR && (
  <div class="flex flex-wrap gap-2 mt-3">
    <span class="text-sm text-gray-500 mr-1">{lang === 'zh' ? '场景预设：' : 'Scenarios:'}</span>
    <button type="button" class="preset-chip text-xs px-3 py-1.5 rounded-full border hover:bg-gray-100 transition"
      data-subscribercount="500" data-monthlyprice="29" data-monthlychurnrate="3" data-expansionmrr="500" data-newsubspermonth="50" data-contractionmrr="100" data-reactivationmrr="50">
      {t('tools.solopreneur-mrr-calculator.preset.early-stage', lang)}
    </button>
    {/* 5 more presets */}
  </div>
)}
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: 141 pages, no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): beautifySections + presets wiring for 24 business calculators"
```

---

## Task 2-9: Group A — 8 high-traffic engine rewrites

**For each engine in Group A, apply v3 pattern:**

### Pattern (universal v3 transform)

1. **Header** — single emoji + title
2. **💰 Snapshot** — 5-7 key numbers
3. **📐 Key Metrics** — industry ratios with benchmarks
4. **🩺 Health** — tier-coded with 🟢🟡🟠🔴
5. **🎯 Projections** — milestones / time-to-goal
6. **🔄 What-If Scenarios** — 2-3 actionable
7. **💡 Tip** — closing insight

**Files:** 8 engines. Each ~150-180 lines → ~350-450 lines.

- [ ] **Step 1: Rewrite `mrr-calculator.ts`** — already v3, just verify quality + add Group A-specific presets
- [ ] **Step 2: Rewrite `ltv-calculator.ts`** — add Section 3 (Churn Sensitivity 1%-8%), Section 4 (Health Tier for LTV:CAC), Section 5 (Break-even CAC)
- [ ] **Step 3: Rewrite `cac-calculator.ts`** — add Health Tier, LTV:CAC preview, Blended vs Paid CAC split
- [ ] **Step 4: Rewrite `burn-rate-calculator.ts`** — add Default Alive/Dead status (already in desc), Gross/Net Burn, Runway Projection
- [ ] **Step 5: Rewrite `churn-rate-calculator.ts`** — add NRR/GRR (already partial), Logo vs Revenue Churn, Cohort view
- [ ] **Step 6: Rewrite `saas-valuation-calculator.ts`** — add Multiple Range (Conservative/Base/Optimistic), ARR Tier 🟢🟡🟠🔴, Exit Value
- [ ] **Step 7: Rewrite `unit-economics-calculator.ts`** — add Scaling Curves (1K/10K/100K), Optimization Levers ranked
- [ ] **Step 8: Rewrite `revenue-projector.ts`** — add What-If (reduce churn, raise price, increase retention)

**For each engine: verify `customFn` byte-sync, update `staticExamples` to match new output.**

- [ ] **Step 9: Build + commit**

```bash
pnpm build && git add -A && git commit -m "feat(engines): v3 rewrite for 8 high-traffic business calculators"
```

---

## Task 10-17: Group B — 8 mid-traffic engine rewrites

Same v3 pattern. **For each:**
- [ ] `break-even-calculator.ts` — Sensitivity Analysis, Time-to-Break-Even
- [ ] `market-size-estimator.ts` — TAM/SAM/SOM 3-tier, CAGR Projection
- [ ] `time-value-calculator.ts` — Daily/Hourly/Minute breakdown, Cost of Interruptions
- [ ] `sponsorship-rate-calculator.ts` — CPM by content type, Tier 🟢🟡🟠🔴
- [ ] `equity-dilution-calculator.ts` — Pre/Post Money, Founder vs Investor % over rounds
- [ ] `freelance-rate-calculator.ts` — Hourly/Daily/Project matrix, Market percentile
- [ ] `course-pricing-calculator.ts` — Price sensitivity curve, Revenue per platform
- [ ] `project-profitability-calculator.ts` — Effective hourly, Margin tier, vs Industry avg

- [ ] **Step 9: Build + commit**

```bash
pnpm build && git add -A && git commit -m "feat(engines): v3 rewrite for 8 mid-traffic business calculators"
```

---

## Task 18-25: Group C — 8 lower-traffic engine rewrites

- [ ] `affiliate-income-calculator.ts`
- [ ] `email-list-revenue-calculator.ts`
- [ ] `hourly-vs-fixed-calculator.ts`
- [ ] `meeting-cost-calculator.ts`
- [ ] `employee-cost-calculator.ts`
- [ ] `productivity-score.ts`
- [ ] `saas-pricing-planner.ts`
- [ ] `freelance-tax-calculator.ts`

- [ ] **Step 26: Build + commit**

```bash
pnpm build && git add -A && git commit -m "feat(engines): v3 rewrite for 8 lower-traffic business calculators"
```

---

## Task 26: i18n preset keys (~144 keys)

- [ ] **Step 1:** Add preset keys to translations.ts for all 24 calcs. Each calc gets 4-6 preset.* keys (en + zh).
- [ ] **Step 2:** Run `pnpm build && npx tsc --noEmit` to verify.
- [ ] **Step 3:** Commit.

---

## Task 27: Final verification + Gitee push

- [ ] Open each of 24 calcs in browser (or static HTML review)
- [ ] Verify: emoji sections present, 🟢🟡🟠🔴 tiers, presets work, beautifySections renders
- [ ] Verify: typecheck 0 errors, build 141 pages
- [ ] `git push origin master`
- [ ] Confirm Gitee Pages deploy

---

## Self-Review (checklist)

- [x] Spec coverage: every section from v3 MRR pattern mapped to all 24 calcs
- [x] No placeholders: all engines have explicit file paths
- [x] Type consistency: all engines return `string[]` from `calculate()` and `customFn`
- [x] Tests: each engine rebuilds its `staticExamples` after `calculate()` change (manual visual check)
