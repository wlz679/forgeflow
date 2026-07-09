# P10 Product Analytics Calculator Batch — Design Spec

> **For agentic workers:** SPEC (approved). Run brainstorming → writing-plans → executing-plans next.

**Goal:** Add 6 new calculators in a NEW 'P' Product Analytics category, serving PM/generalist persona at mid-market B2B SaaS ($10M-$50M ARR). Eighth vertical-depth batch, follows P9 retention pattern.

**Architecture:** Self-registered engine (`src/engines/product-analytics/<slug>-calculator.ts`), per-calc 4-band hardcoded thresholds from PM-community consensus (Lenny's Newsletter, Reforge, Andrew Chen, Mixpanel benchmarks). Fully static — no PRICING.json entry, no API fetch (consistent with P-series M/O/S/R vertical-depth batches).

**Tech Stack:** Astro 4.16.19 static site generation, TypeScript 5.6 strict, Node appendFileSync for engine files >5000 chars (P9-2/P9-5 lesson). No new external dependencies.

---

## 1. Scope

| Item | Decision |
|------|----------|
| Vertical | Product Analytics (PM/eng-facing) |
| Category ID | `P` |
| Category slug | `product-analytics` |
| Category name | `Product Analytics` |
| Persona | PM generalist at mid-market B2B SaaS, $10M-$50M ARR |
| Stats depth | Descriptive only — no z-test, no p-value, no Bayesian, no sample-size inference |
| Calculator count | 6 (P10-1..P10-6) |
| Data-driven | No — fully static like P-series M (marketing) / O (operations) / S (sales) / R (retention) |
| Health bands | 4-band per calc, hardcoded community thresholds |
| v3 standard | Business v3: 6 emoji sections (🩺 Health · 📊 Snapshot · 🔄 What-If · ⚖️ Break-Even · 🎯 Milestone · 💡 Tip) |
| Mid-market anchor | $10M-$50M ARR appears in every ToolMeta description (P9 pattern) |
| Float precision | Math unrounded, display rounded (P-series standard) |
| Currency | USD throughout (P-series default) |

## 2. Calculator Roster (6)

| # | Calc | Slug | Inputs | Output summary | Diff vs existing |
|---|------|------|--------|----------------|------------------|
| 1 | Funnel Step Analysis | `solopreneur-funnel-step-calculator` | 2-5 step event counts (numbers) | per-step %, biggest drop identification, end-to-end % | P6 `funnel-value-calculator` is impressions→leads (marketing); P10 is event-to-event (in-product) |
| 2 | Feature Adoption Rate | `solopreneur-feature-adoption-calculator` | feature_users, active_users, WAU_vs_MAU select | adoption %, dead-feature warning | P9 `customer-health-score-calculator` is aggregate composite; P10 is single-feature penetration |
| 3 | Activation Rate | `solopreneur-activation-rate-calculator` | signups, activated, period_days select | activation %, time-bounded band | New metric — no overlap |
| 4 | Stickiness (DAU/MAU) | `solopreneur-stickiness-calculator` | DAU, MAU | stickiness ratio, SaaS vs social band | New metric — no overlap |
| 5 | Time-to-Value (TTV) | `solopreneur-time-to-value-calculator` | median_days, p90_days | TTV p50/p90 days, INVERSE band | New metric — no overlap |
| 6 | Power User Curve | `solopreneur-power-user-curve-calculator` | top_X_pct, top_X_pct_usage_share | Pareto ratio (e.g. 70/20), skew band | New metric — no overlap |

### Differentiation from existing calcs

| Existing | How P10 differs |
|----------|-----------------|
| P6-3 funnel-value-calculator | P6 = impressions → CTR → leads → sales (marketing funnel); P10-1 = event-1 → event-2 → event-3 (in-product funnel) |
| P6-4 cohort-retention-calculator | P6 = monthly retention curve (cumulative); P10-5 TTV = single time-to-event metric; P10-4 stickiness = point-in-time ratio |
| P9-5 customer-health-score-calculator | P9 = composite score 0-100 from 5 signals (account-level, CS-facing); P10-2 = single-feature adoption % (feature-level, PM-facing) |
| P9-4 logo-churn-rate-calculator | P9 = count-based aggregate churn rate over period; P10-3 activation = success rate over fixed time window |

## 3. Math Architecture

### 3.1 Per-calc engine structure

```ts
// src/engines/product-analytics/funnel-step-calculator.ts
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

const HEALTH_BANDS = {
  excellent: { threshold: 0.40, label: '🟢 Excellent', message: 'End-to-end conversion is strong — every step is pulling weight.' },
  good:      { threshold: 0.25, label: '🟡 Good',      message: 'Healthy funnel with room to optimize the weakest step.' },
  warning:   { threshold: 0.15, label: '🟠 Warning',   message: 'Material drop-offs detected — focus on the biggest delta step.' },
  critical:  { threshold: 0,    label: '🔴 Critical',  message: 'Severe leakage — most users never reach the final event.' },
};

function funnelEndToEnd(steps: number[]): number {
  return steps[steps.length - 1] / steps[0];
}

function biggestDrop(steps: number[]): number {
  let maxDelta = 0;
  let maxIdx = 0;
  for (let i = 1; i < steps.length; i++) {
    const delta = steps[i - 1] - steps[i];
    if (delta > maxDelta) { maxDelta = delta; maxIdx = i - 1; }
  }
  return maxIdx; // 0-indexed; UI translates to "Step N → Step N+1"
}

function calcBand(endToEnd: number): keyof typeof HEALTH_BANDS {
  for (const band of ['excellent', 'good', 'warning', 'critical'] as const) {
    if (endToEnd >= HEALTH_BANDS[band].threshold) return band;
  }
  return 'critical';
}

// ... helpers + engine definition ...
registerEngine(engine);
```

### 3.2 Per-calc formulas

| Calc | Formula(s) | Inputs | Output |
|------|------------|--------|--------|
| Funnel Step | `step_i = event_i / event_{i-1}`; `e2e = event_last / event_first`; `biggest_drop_idx = argmax(event_{i-1} - event_i)` | `step1..stepN` (2-5 numbers) | per-step %, e2e %, biggest-drop identification |
| Feature Adoption | `adoption = feature_users / active_users` (where active = WAU or MAU per select) | `feature_users`, `active_users`, `WAU_vs_MAU` select | adoption %, "X% of WAU use Feature Y" |
| Activation Rate | `activation = activated / signups` (time-bounded by period_days) | `signups`, `activated`, `period_days` (7/14/30) | activation %, comparison to typical SaaS baseline |
| Stickiness | `stickiness = DAU / MAU` | `DAU`, `MAU` | stickiness % + interpretation (5% SaaS median / 13% high-eng SaaS / 20%+ social) |
| Time-to-Value | `TTV_p50`, `TTV_p90` (median + p90 in days) | `median_days`, `p90_days` | p50 days, p90 days, INVERSE band |
| Power User Curve | `pareto_pct = top_X_pct_usage_share / 100` (e.g. "70/20" means top 20% drives 70% of usage) | `top_pct` (e.g. 20), `top_pct_usage_share` (e.g. 70) | pareto ratio, distribution skew label |

### 3.3 Float precision rules

- All math functions (funnelEndToEnd, adoption, activation, stickiness) return unrounded floats
- Display layer rounds to 1 decimal (`(0.625).toFixed(1)` → `"62.5"`) or 2 decimals for ratios < 1
- Percentage display: `(adoption * 100).toFixed(1) + '%'`
- Integer display for counts (no decimals)

## 4. Health Band Thresholds (Locked)

| Calc | 🟢 Excellent | 🟡 Good | 🟠 Warning | 🔴 Critical | Direction |
|------|--------------|---------|------------|--------------|-----------|
| Funnel Step end-to-end | ≥40% | 25-40% | 15-25% | <15% | Higher |
| Feature Adoption | ≥40% | 20-40% | 10-20% | <10% | Higher |
| Activation Rate | ≥40% | 25-40% | 15-25% | <15% | Higher |
| Stickiness (DAU/MAU) | ≥20% | 13-20% | 5-13% | <5% | Higher |
| Time-to-Value (median days) | ≤1 | 1-3 | 3-7 | >7 | **INVERSE** |
| Power User Pareto (top 20% / 20%) | ≥70/20 | 60-70/20 | 50-60/20 | <50/20 | Higher skew = more power-user |

**Sources for thresholds:**
- Stickiness: Mixpanel 2024 Product Benchmarks Report; Lenny's Newsletter PM Survey 2024
- Funnel + Activation: Reforge Growth Loops; a16z Consumer PM Survey 2023
- Feature Adoption: Amplitude Product Benchmarks; Heap Product Analytics Survey
- TTV: Intercom Onboarding Benchmarks; Buffer Growth Team
- Power User Pareto: Andrew Chen "The Cold Start Problem" (Pareto 70/20 anchor)

All hardcoded — no external fetch. Each ToolMeta.sources lists 2-3 of the above.

## 5. 6-Section v3 Business Standard

Each calc emits 6 emoji-prefixed section strings (P-series M/O/S/R pattern):

1. **🩺 Health** — `🩺 Funnel Health: 🟡 Good (32% end-to-end, healthy with optimization room)`
2. **📊 Snapshot** — `📊 Snapshot: 4 steps · 1000 → 800 → 500 → 320. Biggest drop: Step 2 → Step 3 (60% loss)`
3. **🔄 What-If** — `🔄 If Step 2 → Step 3 lifts from 62% to 75%: e2e lifts from 32% to 39%`
4. **⚖️ Break-Even** — `⚖️ To reach 🟡 Good (40% e2e): need Step 3 ≥ 500 (currently 500/800=62%) — raise feature visibility`
5. **🎯 Milestone** — `🎯 30-day milestone: focus on biggest-drop step (Step 2→3); +10% lifts overall funnel from 32% to 36%`
6. **💡 Tip** — `💡 Tip: For mid-market B2B SaaS, in-product funnels typically have biggest leakage at the value-discovery step. Pair with our [Activation Rate Calculator] to ensure post-funnel conversion.`

Cross-links in Tip section reference 1-3 related P-series calcs by slug.

## 6. File Touch List (Per-Calc = 8 Files)

For each of P10-1..P10-6:

| # | File path | Action | Content |
|---|-----------|--------|---------|
| 1 | `src/engines/product-analytics/<slug>-calculator.ts` | NEW | ~120 lines: imports, HEALTH_BANDS, helper functions, engine definition, registerEngine call |
| 2 | `src/engines/product-analytics/index.ts` | append `import './<slug>-calculator';` | 1 line per calc |
| 3 | `src/data/tools/product-analytics.ts` | append ToolMeta entry | 8 fields: slug/title/desc/categoryId='P'/inputs/keywords/tags/sources |
| 4 | `src/data/og-samples.json` | append OG entry (en + zh) | `headline`, `headlineUnit`, `headlineLabel` |
| 5 | `scripts/codegen-examples.mjs` | append ENGINES entry | slug + subdir + defaultInputs |
| 6 | `tests/ab-split.test.ts` | bump `68` → 74 (after P10-6) | 2 places: `getAllEngines().length === 74`, `tools.length === 74` |
| 7 | `tests/internal-links.test.ts` | bump `68` → 74 (after P10-6) | 3 places: related list size, per-tool count, info-low-density |
| 8 | `tests/<slug>-calculator.test.ts` | NEW | 8-15 tests: math (4-8) + health bands (4-7) |

Plus shared P10-0 scaffold files (separately committed as P10-0):

| File | Action |
|------|--------|
| `src/engines/product-analytics/index.ts` | NEW barrel (empty, comment-only) |
| `src/engines/product-analytics/` dir | NEW |
| `src/data/tools/product-analytics.ts` | NEW (empty `tools: ToolMeta[] = []`) |
| `src/data/categories.ts` | append entry: `{ id: 'P', name: 'Product Analytics', slug: 'product-analytics', description: '...' }` |
| `src/pages/[lang]/product-analytics.astro` | NEW (template copy from `retention.astro`) |
| `tests/ab-split.test.ts` | append `'product-analytics'` to subdir array; bump count expectations to 11 subdirs / 63 engines (post-scaffold) |

**File count:**
- P10-0 scaffold: 6 file actions + 1 dir
- P10-1..6: 6 × 8 = 48 file actions
- **Total: 54 file actions across 8 commits**

## 7. Commit Cadence

| # | Commit | Title |
|---|--------|-------|
| P10-0 | scaffold | `feat(p10-0): product analytics category scaffold + new 'P' category + listing page` |
| P10-1 | Funnel Step | `feat(p10-1): funnel step analyzer (X tests, 6-section v3, 68→69 engines)` |
| P10-2 | Feature Adoption | `feat(p10-2): feature adoption rate (X tests, 6-section v3, 69→70 engines)` |
| P10-3 | Activation Rate | `feat(p10-3): activation rate (X tests, 6-section v3, 70→71 engines)` |
| P10-4 | Stickiness | `feat(p10-4): stickiness DAU/MAU (X tests, 6-section v3, 71→72 engines)` |
| P10-5 | TTV | `feat(p10-5): time-to-value (X tests, 6-section v3, 72→73 engines)` |
| P10-6 | Power User Curve | `feat(p10-6): power user pareto curve (X tests, 6-section v3, 73→74 engines)` |
| P10-7 | docs | `docs(p10): series memory + index update` |

Per-calc execution sequence (P9 controller-direct pattern, no subagent dispatch for mechanical work):

1. Write focused tests (`tests/<slug>-calculator.test.ts`) — 8-15 tests, verify MODULE_NOT_FOUND (expected fail)
2. Write engine file (`src/engines/product-analytics/<slug>-calculator.ts`) — ~120 lines, may use Node `appendFileSync` if >5000 chars (P9-2 lesson)
3. Run focused tests — all pass
4. Wire 7 supporting files (barrel + ToolMeta + OG + codegen + ab-split + internal-links per-calc bumps)
5. Run `node scripts/codegen-examples.mjs` (regen staticExamples[0])
6. Run `node scripts/codegen-examples.mjs --check` (drift-free + customFn parse OK + escape sanity)
7. Run full `pnpm check` (574 + N P10 math tests + N cross-cutting)
8. Commit + dual push (gitee + github with `SKIP_PUSH_FETCH=1`)

## 8. Tests (Spec-Test Pair Pattern)

**P10-1 Funnel Step — spec example for the pattern:**

```ts
// tests/funnel-step-calculator.test.ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { funnelEndToEnd, biggestDrop, calcHealthBand } from '../src/engines/product-analytics/funnel-step-calculator.ts';

test('funnelEndToEnd: 1000→800→500→320 = 32%', () => {
  assert.equal(funnelEndToEnd([1000, 800, 500, 320]), 0.32);
});

test('biggestDrop: 1000→800→500→320 identifies Step 2→3 (index 1)', () => {
  assert.equal(biggestDrop([1000, 800, 500, 320]), 1);
});

// ... 6-9 more tests for each calc ...
```

**Per-calc test minimum:**
- 4-8 math tests (each formula edge case + canonical input)
- 4-7 health band tests (one per band + exact boundaries)

**Cross-cutting tests:**
- `tests/ab-split.test.ts` — 68 → 74 bumps in 2 places
- `tests/internal-links.test.ts` — 68 → 74 bumps in 3 places
- `scripts/codegen-examples.mjs --check` — 68 → 74 engines must all pass

**Test budget:**

| Source | Min tests | Max tests |
|--------|-----------|-----------|
| P10-1 Funnel Step | 8 | 12 |
| P10-2 Feature Adoption | 7 | 10 |
| P10-3 Activation Rate | 7 | 10 |
| P10-4 Stickiness | 6 | 8 |
| P10-5 TTV | 7 | 10 |
| P10-6 Power User Curve | 8 | 12 |
| **Subtotal math + bands** | **43** | **62** |
| Cross-cutting (ab-split + internal-links + codegen drift) | 5 | 8 |
| **P10 total** | **~48** | **~70** |
| Pre-P10 baseline | 574 | 574 |
| **P10 ship post** | **~622** | **~644** |

## 9. Static output (dist) Impact

| Type | Current | P10 + | Post |
|------|---------|-------|------|
| Calculator pages (en) | ~68 | +6 | 74 |
| Calculator pages (zh) | ~68 | +6 | 74 |
| Category listing pages (en) | 10 | +1 | 11 |
| Category listing pages (zh) | 10 | +1 | 11 |
| **Total dist pages (en+zh)** | ~144 | +14 | **~158** |

`pnpm build` (or `pnpm sync → pnpm build` for AI-cost calcs) must complete without errors.

## 10. Risks & Mitigations (Lessons from P-series)

| Risk | Lesson origin | Mitigation |
|------|---------------|------------|
| Over-bumping ab-split / internal-links counts | P8-0 (over-bumped 56→62) | Bump by exactly +1 per calc; P9-1 verified the lesson |
| seo-schemas/listingPages.ts drift | P9-0 (file doesn't exist) | No separate listing-page SEO file; rely on auto-gen from `[lang]/product-analytics.astro` |
| internal-links.ts drift | P9-0 (auto-generated) | Never manually edit; the build regenerates from tools/[category].ts |
| CustomFn parse failure | P9-2 / P9-5 (truncation + escape) | Use Node `appendFileSync` with explicit escape; verify via `codegen-examples.mjs --check` (which calls `new Function`) |
| spec test off-by-formula | P9-5 (test 8 "12.5" → 0) | Hand-compute each spec test expected value before committing |
| Unicode escape in customFn | P8-4 (`\uXXXX` strict) | codegen --check has LITERAL_ESCAPE_RE regex sanity test |
| Plan spec claims drift | P9-0 (listingPages.ts不存在) | Validate file paths + line numbers in plan before committing |
| INVERSE band direction | P9-4 (TTV also INVERSE) | Document INVERSE in band table for TTV calc (Section 4) |
| Mid-flight barrel import leak | P9-1 (engines/index.ts + tools/index.ts explicit imports) | Write engines/index.ts and tools/index.ts explicit imports from start, don't rely on import.meta.glob auto-discover |

## 11. Out-of-Scope

**Not in this batch:**

- A/B test statistical inference (z-test, p-value, sample size, MDE) — explicit stats-depth = basic decision
- Bayesian analytics (posterior distributions, priors)
- Session replay / heatmap / clickstream
- NPS-by-cohort (already implicit in P9 health score)
- Multi-touch attribution (P6 marketing had last-touch only)
- Real-time data fetching (static-only batch)
- Cohort retention curve (P6 has it; P10 has distinct TTV + stickiness for in-product)
- Customer health score composite (P9 already has it; P10's feature adoption is single-feature)
- Funnel-value (marketing dollars), pipeline-value (sales $), etc — already covered by P6/P8

These would be candidates for P11+ vertical-depth batches or non-batch extensions.

## 12. Success Criteria

| Criteria | Measurement |
|----------|-------------|
| 8 commits shipped (P10-0..P10-6 + P10-7 docs) | `git log --oneline --grep="p10" -10` returns 8 entries |
| All engines register | `pnpm check` shows 74 engines via `getAllEngines().length === 74` |
| All math tests pass | Per-calc `tests/<slug>-calculator.test.ts` 100% pass |
| Full pnpm check pass | 622-644 pass, 0 fail |
| codegen drift-free | `node scripts/codegen-examples.mjs --check` exits 0 |
| Static dist builds | `pnpm build` produces 158 HTML pages without error |
| Both mirrors synced | `git log origin/master..master` empty; `git log github/master..master` empty |
| `memory/p10-series-shipped.md` saved | File exists in `~/.claude/projects/.../memory/` |
| `MEMORY.md` index updated | Contains 8 P10 entries (P10-0..P10-6 + p10-series-shipped) |

## 13. Related

- [[p9-series-shipped]] — prior batch (Retention), establishes the 6-calc + scaffold + holistic pattern
- [[p9-4-logo-churn-rate-shipped]] — INVERSE band direction lesson (applied to TTV in P10-5)
- [[p9-0-scaffold-shipped]] — sitemap/seo-factory listing-page pattern (applied to P10-0)
- [[p8-0-scaffold-shipped]] — over-bump lesson (applied to P10-0 test counts)
- [[p9-2-grr-shipped]] — `node appendFileSync` for engine files >5000 chars (applied to any P10 calc with customFn >5000)
- [[plan-spec-validation]] — concrete claims (count bumps, test counts) must be validated before plan
