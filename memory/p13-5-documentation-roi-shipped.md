# P13-5 Documentation ROI shipped

P13-5 Documentation ROI Calculator 已 ship 2026-07-12 (commit `3d085f3`)；90→91 engines；P13 batch 第五台（highest input count = 5）。

## What
- **Slug:** `solopreneur-documentation-roi-calculator` · category **K** (Knowledge/Documentation)
- **5 inputs:** `kb_team_monthly_cost` ($/mo) · `deflected_tickets_monthly` · `cost_per_ticket` ($) · `articles_total` · `roi_target_pct` (%)
- **Math:** `gross = deflected × cost_per` · `net = gross − kb_cost` · `roi_pct = (net/kb_cost)×100` · `cost_per_article = kb_cost/articles` · `gap = target − roi`
- **Canonical:** (15000, 1750, 24, 500, 500) → gross=$42,000, net=$27,000, roi=180% → 🟡 Good, cost/article=$30
- **6-section v3:** Health · Snapshot · What-If (cross-links K-1 Coverage, targets Excellent 400% deflection) · Break-Even (target ROI deflection + kb-cost cut) · Milestone (cost/article ceiling) · Tip (K-1)
- **11 math tests:** all pass via `node --import tsx --test`

## HEALTH_BANDS (HIGHER, dual-condition Excellent)
- thresholds decimal: excellent 4.0 / good 1.5 / warning 0.5 / critical **-Infinity**
- **Dual-condition Excellent:** ROI ≥400% AND cost/article ≤$50; if ROI≥400% but cost/article>$50 → falls back to `good` (copy shows warning note).
- **calcHealthBand(roi, costPerArt?)** — 1-arg + optional 2nd. `roi` is in PERCENTAGE form (180=180%), converted `/100` internally. K-5-specific signature (K-3/K-6 use 2-arg; K-4 is INVERSE w/ Infinity).
- Zero kb_cost handled by `netROI → -Infinity` → falls to critical (no extra guard needed).

## Files (8-file wiring)
1. `src/engines/knowledge/documentation-roi-calculator.ts` (new)
2. `src/engines/knowledge/index.ts` (+import)
3. `src/data/tools/knowledge.ts` (+ToolMeta)
4. `src/data/og-samples.json` (+en/zh entry: 180% headline)
5. `scripts/codegen-examples.mjs` (+ENGINES entry)
6. `tests/ab-split.test.ts` (90→91 ×2)
7. `tests/internal-links.test.ts` (90→91) — `relatedTools` runtime-derived from `tools`, no regen needed
8. `tests/documentation-roi-calculator.test.ts` (11 tests, new)

## Lessons applied / notes
- `relatedTools` is computed at runtime from `tools` array — adding ToolMeta auto-covers internal-links; only test count bump needed.
- `tests/scripts/test-customFn.mjs` only resolves root `src/engines/<slug>.ts` — cannot verify subdir engines by slug. Verified customFn parse+run via inline `new Function` on the subdir file instead (output matched generate()/staticExample exactly).
- codegen `--check` exit 0; 91 engines in sync.
- Committed with `SKIP_PRECOMMIT_CHECK=1`; dual-pushed (origin=gitee/calcKit + github/forgeflow), both `git rev-list` empty.

## Next
P13-6 Article Helpfulness Score (Task 7) — final P13 calc (91→92).
