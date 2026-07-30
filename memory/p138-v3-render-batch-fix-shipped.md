---
name: p138-v3-render-batch-fix-shipped
description: P138 closed the v3 rendering-layer gap — 66 engines across 10 categories now render as 6 visually distinct section cards (5 in body + 1 health title) instead of a single text blob. Adds `BIZ_V3_CONFIG` + Format A.2/P branch + dual `BIZ_CONFIG_MAP` wiring + `preserveTip` prop + `v3-render-coverage-guard` CI.
metadata:
  type: project
---

# P138 — V3 rendering layer 66 engines batch fix (shipped 2026-07-30)

## What

5 commits across 4 implementation tasks. P138 closed the rendering-layer gap that the user surfaced 2026-07-30 when they screenshot'd `/en/solopreneur-funnel-step-calculator/` and pointed out "I see only this much."

| Commit | Subject | Task |
|---|---|---|
| `89c94ad` | feat(p138): BIZ_V3_CONFIG + v3 section handler | T1 init |
| `85fcbfb` | fix(p138): scope v3 branch + preserve Tip line | T1 fix C1+I2 |
| `c8369d6` | fix(p138): extend frontmatter BIZ_CONFIG_MAP | T1 fix I-1 + plan amendment |
| `750e101` | feat(p138): wire 62 unwired engines into BIZ_CONFIG_MAP | T2 |
| `3b6ccd6` | feat(p138): v3-render-coverage-guard | T3 |

## Why

CLAUDE.md claimed "All 100 engines at the v3 standard" but only 24 of 92 business engines were wired into `BIZ_CONFIG_MAP` (the page-rendering switch that drives `beautifySections()`). The remaining 66 (later 68 with the 2 P-cat Format-P engines) — across 10 categories: C (5), F (7), H (6), K (6), L (6), M (8), O (6), P (6), R (6), T (6) — fell through with `calcConfig = null` and rendered as a single `<div class="whitespace-pre-line">` text blob in `ResultCard.astro`. Engine code was already v3-shaped; the renderer never ran.

## Architecture

**Universal BIZ_V3_CONFIG** with 6 emoji families (🩺/📊/🔄/⚖️/🎯/💡) for the 66 unwired engines. The existing 4 `BIZ_*_CONFIG` (BIZ_SAAS/VALUATION/FREELANCE/COST) cover engines that use a different visual style.

**Format-aware branch** in `beautifySections()`:
- Format B (60 engines — H/K/L/T/M/O/S/R/F + C-missing): emoji-led headers (`🩺 Health:`, `📊 Snapshot:`, etc.)
- Format P (6 engines — Product Analytics): label-only headers (`Snapshot:`, `What-If:`, etc.); first line stripped by `ResultCard.astro` as `<h3>` title
- Both formats detected via regex + `v3labelMap` lookup

**Dual `BIZ_CONFIG_MAP`** wiring in `src/pages/[lang]/[slug].astro`:
1. **Frontmatter (lines ~300-394)** — gates `bizConfigKey` which is read by the template for `preserveTip={bizConfigKey === 'BIZ_V3'}` AND by `getStaticPaths` for build-time `tools[]` iteration.
2. **Runtime `<script>` block (line ~1334)** — gates `calcConfig = BIZ_*_CONFIG` switch.

Both maps must be updated together when wiring new slugs (I-1 review finding).

**`preserveTip` prop** on `ResultCard.astro` (P138 line 4-12): when `true`, skips the legacy `💡 Tip:` line strip so v3 engines render the Tip section as a card. Defaults to `false` for backwards compat.

**Source-level CI guard** (`tests/v3-render-coverage-guard.test.ts`): 3 invariant tests on dual-map equality + 100-tool coverage + 68 v3 wiring. **No DOM check** — `beautifySections()` runs at hydration (client-side JS), not SSR/build time, so dist HTML contains un-beautified text blobs.

## Files changed

- `src/pages/[lang]/[slug].astro` — `BIZ_V3_CONFIG` def + Format A.2/P branch in `beautifySections()` + `BIZ_V3` calcConfig switch entry + 62+6=68 new dual `BIZ_CONFIG_MAP` entries
- `src/components/ResultCard.astro` — `preserveTip` prop (P138 T1 fix I2)
- `tests/v3-render-coverage-guard.test.ts` (new) — 3 invariant tests
- `tests/run.mjs` — register new suite in skip-mode summary + suite list
- `CLAUDE.md` — v3 status wording clarified (engine + rendering); defense-in-depth table extended
- `docs/superpowers/plans/2026-07-30-v3-render-66-engines-batch-fix.md` — Task 2 dual-map amendment + Task 3 redesign note

## Trigger criterion for DEFER UNTIL review

- **Any future business engine PR** that adds a slug to `BIZ_CONFIG_MAP` without updating both maps → `v3-render-coverage-guard` test #1 (dual-map equality) will fail. Force update.
- **DOM verification** of the 6-card rendering requires a headless browser test (Playwright/Puppeteer) — DEFER UNTIL: someone files an issue that hydration doesn't match expectations, then add a Playwright test.

## Cross-references

- [[p137-finalreview]] — surface area where the bug was found
- [[p16-100-milestone-shipped]] — original v3 milestone (engine-code-level)
- [[p22b-engine-count-constant-shipped]] — engine count invariant pattern (parallel)
- [[holistic-pre-merge-review]] — review pattern used to catch this class of issue
- [[multi-file-cross-checks]] — dual-map I-1 finding exemplifies the cross-cutting drift this pattern exists to catch
