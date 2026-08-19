---
name: p141h-adsense-p0-fixes-shipped
description: P141h AdSense P0 audit fixes — placeholder leakage + stale sources/last-reviewed. Closes ChatGPT's 4 P0 AdSense flags confirmed real by audit (1 of 4 was real; 3 were false).
metadata:
  type: project
  shipped: 2026-08-19
  commits: 3 atomic on master
  branch: master (no feature branch — small targeted fixes)
---

# P141h AdSense P0 Audit Fixes — SHIPPED

**Date:** 2026-08-19
**Commits:** 3 atomic on master (`4218609` + `20a79ae` + `bebae0f`)
**Trigger:** User shared ChatGPT AdSense rejection analysis 2026-08-19; user chose Option A "只修 P0" after 2-Explore audit validated which ChatGPT claims were real vs false.
**Resubmit window:** unchanged (~2026-09-01 trigger per `adsense-resubmit-window.md`).

---

## Why this batch exists

User asked ChatGPT to review why AdSense rejected ForgeFlowKit for "low-value content" (status needs review). ChatGPT returned a 20-section report scoring ForgeFlowKit 58/100 with 4 P0 issues:
1. i18n key leakage (homepage + listing pages)
2. Tool count inconsistency (32/82/100)
3. AdSense placeholder text ("AdSense — home hero/mid/footer")
4. Missing title/description/canonical/og

Plus 3 MAJOR tool-page issues:
1. Sources/methodology not visible per-tool
2. Health-band thresholds without source citation
3. "Last reviewed" date stale

I dispatched 2 Explore subagents in parallel to validate. Result: **ChatGPT claims 4 P0 issues — 3 were FALSE, 1 was REAL but narrow scope**. Tool-page MAJORs were 4 issues — 1 PARTIAL (sources missing), 3 PARTIAL (last reviewed stale, threshold transparency, formula/assumptions schema).

This batch ships the REAL P0s only. **Net result: 4 critical/low-risk bug fixes that directly address Google-crawl-visible issues + 1 new CI guard preventing the regression class.**

---

## ChatGPT vs audit reality

| ChatGPT claim | Audit verdict | Evidence |
|---|---|---|
| Homepage/category i18n leakage (`category.M.name` etc.) | **FALSE** | dist/en/index.html + 15 category pages: 0 occurrences |
| Tool count 32/82/100 | **FALSE** | Codebase uniformly 100 (`EXPECTED_ENGINE_COUNT` + `tools.length`) |
| "AdSense — home hero/mid/footer" in DOM | **FALSE** | `AdUnit.astro` deleted in P140a; guards work |
| Missing SEO meta | **FALSE** | BaseLayout emits all; 5 spot-check pages pass |
| i18n leakage on tool pages | **REAL but narrow** | renewal-rate-calculator (en + zh), 2 input placeholders only |
| Sources not displayed | **REAL** | prose has sources[]; `src/data/tools/*.ts` `sourcesRich: []` empty |
| Last reviewed stale | **REAL** | prose = 2026-07-31; toolMeta = 2026-06-22 (~5 weeks) |
| Health-band thresholds without source | **REAL** | 8+ marketing engines; deferred to P1 |

---

## Changes (3 atomic commits)

### P0-1: `i18n(fix): P0-1 add 2 renewal-rate-calculator placeholder keys (en + zh)` — `4218609`

**File:** `src/i18n/translations.ts` (+2 lines)

Added 2 missing `.placeholder` keys:
- `tools.solopreneur-renewal-rate-calculator.input.arrRenewed.placeholder`: `'e.g. 720000'` / `'例如 720000'`
- `tools.solopreneur-renewal-rate-calculator.input.arrUpForRenewal.placeholder`: `'e.g. 1000000'` / `'例如 1000000'`

**Why these specific values:** The engine's canonical example is `arrRenewed=720000, arrUpForRenewal=1000000` → renewal rate 72%. These placeholder values produce a meaningful example when the user reads them.

### P0-2: `fix(pages): P0-2 prose-first sources + last reviewed (audit fix)` — `20a79ae`

**File:** `src/pages/[lang]/[slug].astro` (+16 / -3 lines)

Single refactor: 2 new constants defined after `proseEntry` lookup:
```typescript
const proseFirstSourcesRich: { name: string; url: string }[] =
  proseEntry?.data.sources && proseEntry.data.sources.length > 0
    ? proseEntry.data.sources
    : toolMeta.sourcesRich;
const proseFirstDataReviewedAt: string =
  proseEntry?.data.data_reviewed_at ?? toolMeta.dataReviewedAt;
```

Used at:
- Line ~456: `createSoftwareApplication(dataReviewedAt)` — JSON-LD `dateModified`
- Line ~1366: `<EeatTrustBlock sourcesRich={proseFirstSourcesRich} ...>` — Sources render
- Line ~1367: `<EeatTrustBlock ... dataReviewedAt={proseFirstDataReviewedAt} />` — Last reviewed

**Fixes both Issue 1 (Sources never displayed) + Issue 4 (Last reviewed stale) in one refactor** — single root cause: page template reading from parallel `src/data/tools/*.ts` records instead of canonical prose frontmatter.

**Verified on dist/en/solopreneur-cac-calculator/index.html**:
- Sources now render: SaaS Capital, OpenView, a16z (3 from prose frontmatter; was empty)
- JSON-LD `dateModified`: `2026-06-22` → `2026-07-31`
- "Last reviewed: 1 month ago (2026-06-22)" → "19 days ago (2026-07-31)"

### P0-3: `test(guard): P0-3 placeholder i18n leakage guard (build-dep)` — `bebae0f`

**File:** `tests/engine-input-placeholder-i18n-guard.test.ts` (NEW, +78 lines)

Build-dep guard (RUN_BUILD_TESTS=1):
1. Calls `buildWithEnv({})` to refresh dist/
2. Walks all 200 tool pages (100 slugs × 2 langs)
3. Regex `/placeholder="(tools\.[a-z0-9-]+\.[a-zA-Z0-9_.]+)"/g`
4. Fails if any placeholder attribute value starts with `tools.` (raw i18n key)

**Coverage today:** 200 page checks (100 × 2 langs).
**Closes the regression class** for future engine updates that add input fields without corresponding `translations.ts` entries.

---

## Verification

| Check | Result |
|---|---|
| `tsc --noEmit` | clean (after each commit) |
| `pnpm build` | 451 pages (unchanged) |
| `dist/en/solopreneur-cac-calculator/index.html` sources render | ✓ SaaS Capital + OpenView + a16z |
| `dist/en/solopreneur-cac-calculator/index.html` JSON-LD dateModified | ✓ `2026-07-31` (was `2026-06-22`) |
| `dist/en/solopreneur-renewal-rate-calculator/index.html` placeholder | ✓ `e.g. 1000000` / `e.g. 720000` (was raw i18n key) |
| `dist/zh/solopreneur-renewal-rate-calculator/index.html` placeholder | ✓ `例如 1000000` / `例如 720000` (was raw i18n key) |
| `RUN_BUILD_TESTS=1 tsx --test tests/engine-input-placeholder-i18n-guard.test.ts` | **1/1 pass** (28s build) |
| `pnpm check` (default) | 1244/0/0 unchanged (build-dep test excluded by skip-guard) |

---

## What was deliberately NOT done (deferred)

- **P1 Health-band source citations** — 8+ marketing engines need inline source citations in prose H2 bodies. Deferred to next batch (~3-4 h).
- **P1 Assumptions / Common Mistakes H2** — schema extension for richer tool pages. Deferred to brainstorm (~1-2 h).
- **P2 Topic Authority upgrade** — Domain → Topic Cluster → Topic → Product redesign. Deferred to dedicated brainstorm.
- **About page hardcoded "100" / "100 个"** — `src/pages/[lang]/about.astro:186-187` currently consistent with `tools.length = 100` but drifts silently on future batch. Single-character fix deferred (MINOR severity).

---

## Files touched

| File | Change | Commit |
|---|---|---|
| `src/i18n/translations.ts` | +2 placeholder keys | `4218609` |
| `src/pages/[lang]/[slug].astro` | +16 / -3 (prose-first constants + 3 usage sites) | `20a79ae` |
| `tests/engine-input-placeholder-i18n-guard.test.ts` | NEW (+78) | `bebae0f` |
| `memory/p141h-adsense-p0-fixes-shipped.md` | NEW | (this file) |
| `memory/MEMORY.md` | +1 index line | (this commit) |
| `CHANGELOG.md` | +M25.0 + header update | (this commit) |

---

## Resubmit window status

`adsense-resubmit-window.md` trigger ~2026-09-01 — unchanged by this batch.
This batch closes REAL issues surfaced by audit but does not advance the trigger.
After 2026-09-01 trigger fires: verify Google Search Console shows updated content (sources rendered, fresh dates, no placeholder leakage) before resubmitting.

---

## Related

- [[adsense-resubmit-window]] — trigger + how to apply
- [[p140a-adsense-scaffold-shipped]] — original scaffold (deleted AdUnit.astro placeholder)
- [[p140b-editorial-prose-shipped]] — 200 prose files mass-write (4-H2 schema)
- [[p140c-eeat-completion-shipped]] — single founder persona + E-E-A-T trust block
- [[p140d-tier-threshold-tightening-shipped]] — sister AdSense quality batch
- [[p140g-author-bio-pages-shipped]] — preceding batch
- [[p141-ocr-batch-fix-shipped]] — earlier P-series
- ChatGPT 2026-08-19 audit report (user-provided, not in repo)