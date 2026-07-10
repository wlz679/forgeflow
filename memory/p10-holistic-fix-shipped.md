# P10 Holistic Review Fix (shipped 2026-07-10, commit 214c4ac)

P10-7 holistic review surfaced 1 critical bug + 2 stale dist findings:

## Finding #1 (Agent 1, SPEC-COMPLIANCE)

**Bug**: P10-1 Funnel Step `src/engines/product-analytics/funnel-step-calculator.ts` and `src/data/tools/product-analytics.ts` only supported step1..step4 (4 inputs), but spec Section 2 + description claimed "2-5 steps". Description/marketing-implementation mismatch.

**Fix**: Added `step5` input to both `inputs[]` array (engine + ToolMeta), updated loop limits from `i <= 4` to `i <= 5` in both `generate()` and customFn, updated `codegen-examples.mjs` defaultInputs to include `step5: '210'`.

**Side effect**: Canonical 5-step end-to-end = 210/1000 = 21% (Warning band, not Good). Updated og-samples.json headline from "32% Good" to "21% Warning". Documented in staticExamples.

## Finding #2-3 (Agent 2, CROSS-FILE INTEGRITY)

**Stale dist pages**: `dist/en/solopreneur-funnel-step-calculator/index.html` and `dist/zh/.../index.html` still showed old "32% Good" snapshot from before step5 addition.

**Fix**: Ran `pnpm build` to regenerate dist (dist/ is gitignored, so only the build artifact updated locally; CI/deploy will rebuild on push).

## Other Agent 1 Observations (all informational, not bugs)

- #2: TTV `critical: { threshold: Infinity }` — intentional sentinel for INVERSE bands (only `days < 0` triggers critical). P9-4 lesson applied.
- #3: Funnel Step "to hit Good (25% e2e)" — text uses HEALTH_BANDS.good.threshold correctly per spec Section 4. Semantically odd in canonical (32% is already Good so the advice is moot) but mathematically correct.
- #4: funnel-step engine object missing `categoryId: 'P'` / `applicationCategory` style — cosmetic; only P10-1 has this (P10-2..6 have it).
- #5: Spec section 5 self-typo at line 137 "🟡 Good (40% e2e)" — 40% is Excellent threshold. Implementation correct (HEALTH_BANDS.good.threshold = 0.25).

## Tests after fix

- 13/13 funnel-step tests ✓
- ab-split ✓ at 74 engines, 74 tools
- internal-links ✓ at 74 tools
- codegen --check ✓ all 74 in sync

## Dual push

- gitee: `fc9ed65..214c4ac` ✓
- github: `fc9ed65..214c4ac` ✓
