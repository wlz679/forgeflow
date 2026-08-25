---
name: p147-quick-wins-shipped
description: P147 Quick Wins — Phase 4 followup + cross-link coverage. 4 atomic commits on master (C1 cross-link + title, C2 letter page grid, C3 cross-link guard, C4 ship ops). 0 new pages, 1 new build-dep guard, 4 letter pages enhanced.
metadata:
  type: project
  shipped: 2026-08-21
  scope: full batch (4 atomic commits on master)
---

# P147 Quick Wins — Phase 4 Followup — SHIPPED

**Date:** 2026-08-21
**Scope:** Full P147 batch (4 atomic commits on master, direct-to-master cadence)
**Parent design:** `docs/superpowers/specs/2026-08-21-p147-quick-wins-design.md` (commit ee7ac41)
**Parent plan:** `docs/superpowers/plans/2026-08-21-p147-quick-wins.md`

---

## Change Summary

| Metric | Before (M25.7) | After (M25.8) |
|---|---|---|
| Comparison pages (en + zh) | 8 | 8 (unchanged) |
| Static pages built | 631 | 631 (unchanged — cross-link only) |
| Letter pages with Comparison grid | 0 | **4** (B/C/M/R) |
| Build-dep suites | 52 | **53** (+1 new comparison-cross-link-guard) |
| Master commits | 1163 | **1167** (+4 atomic) |

---

## Per-Commit Ship Log

| Commit | Description |
|---|---|
| C1 (`ab6805e`) | fix(pages): render relatedTopicIds + optimize title in [topic]-compare.astro |
| C2 (`e1bbe96`) | feat(pages): letter pages B/C/M/R add Comparison grid + i18n key |
| C3 (`92704e5`) | feat(guard): comparison-cross-link-guard (5 cases) |
| C4 (this) | docs(ship): final ship ops (MEMORY + CHANGELOG M25.8 + plans/INDEX) |

---

## Closes

- ✅ Phase 4 fable Minor #8 (relatedTopicIds cross-link)
- ✅ Phase 4 fable Minor #9 (`<title>` mismatch — optimized, not eliminated)

## Already Closed (out of P147 scope)

- ✅ Phase 4 fable Minor #5 (MEMORY/CHANGELOG commit count correction — in `d338497`)
- ✅ Phase 4 fable Minor #7 (3 unused i18n keys removed — in `d338497`)
- ✅ P144/P146 zh QA review (no fixes needed, closed in P146 ship record)

---

## Verification

| Check | Result |
|---|---|
| tsc --noEmit | clean |
| comparison-shape-guard | 7/7 pass |
| comparison-cross-link-guard | 5/5 pass |
| pnpm build | success, 631 pages |
| 3-way divergence | 0/0 after each commit |
| pnpm check | 1257/0/0 (was 1256, +1 test) |

---

## Pre-AdSense Resubmit Impact

- Improved internal link density (Related Topics + Comparison grid)
- SERP CTR optimization for "X vs Y" queries
- New defensive guard catches cross-link drift class
- Combined Phase 1+2+4+P147: 98 new pages + cross-link density

---

## Related

- [[p140f-phase4-comparison-pages-shipped]] — Phase 4 ship record (fable review findings list)
- `docs/superpowers/specs/2026-08-21-p147-quick-wins-design.md` — P147 spec
- `docs/superpowers/plans/2026-08-21-p147-quick-wins.md` — P147 plan
- [[adsense-resubmit-window]] — AdSense trigger ~2026-09-01
