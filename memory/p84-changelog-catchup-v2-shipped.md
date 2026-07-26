# P84 CHANGELOG Catch-up v2 Ship Log

## Summary

P84 closes the CHANGELOG documentation gap from P66b-P83 (19 batches, ~30 commits). Adds M18.0 milestone section documenting the i18n defense-in-depth era.

**Date:** 2026-07-26
**Batch ID:** P84
**Files touched:** 1 (CHANGELOG.md)
**Test delta:** unchanged (docs-only)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### CHANGELOG.md — new M18.0 milestone section

Inserted between M16.0 (line 64) and M17.0 (line 67, shifted to ~200).

**M18.0 — i18n defense-in-depth (P66b-P83)** covers:
- 7 page-level CJK matrix tests (P66b/P67b/P68/P69/P71)
- All i18n render-layer fixes (P62/P69/P72 T2-A/P73/P75/P80/P81)
- 2 CI defense guards (P74 hardcoded-EN + P82/P83 glossary)
- Audit script improvements (P79/P82/P83)
- Glossary extension (P78)
- Defects closed table (16/16 closed)
- Ship drama section (P75 TS schema discovery, P83 orphan false positives, P77 standing rule, P79 audit noise)

### Header + footer updates

- L5: `最后更新: 2026-07-24 (P65 CHANGELOG catch-up)` → `最后更新: 2026-07-26 (P84 CHANGELOG catch-up v2)`
- Bottom Notes: `Last CHANGELOG update — P65 (2026-07-24); covers P46-P64` → `Last CHANGELOG update — P84 (2026-07-26); covers P66b-P83 batches in M18.0 milestone`

## Why this exists

P65 (2026-07-24) documented P46-P64 (19 batches). Between P65 and now:
- 19 more batches shipped (P66b-P83)
- ~30 more commits
- M18.0 era = i18n defense-in-depth

Without P84, users reading CHANGELOG see a gap from 2026-07-24 → 2026-07-26 with no documentation of:
- 7 new CI guards (now 13 build-dep suites + 2 source-only)
- 100 MD body translations
- 22 legal page i18n keys
- 16 real defects fixed
- Glossary structural patterns formalized

P84 makes M18.0 era discoverable in CHANGELOG.

## Coverage

The M18.0 section includes:
- 5 themed subsections (Added matrix / Added fixes / Added CI defense / Fixed / Changed)
- Engineering metrics table
- Defects closed table (16/16 closed)
- Ship drama section (4 key learnings)
- 19 ship log links (one per P-batch in range)

## Engineering metrics

| Metric | Before P84 | After P84 |
|---|---|---|
| pnpm check | 1181 / 0 / 0 | **1181 / 0 / 0**（docs-only） |
| CHANGELOG last update | 2026-07-24 (P65) | **2026-07-26 (P84)** |
| Documented milestones | 11 (M0.x → M17.0) | **12 (+ M18.0)** |
| Documented batches gap | P66b-P83 (19 unrecorded) | **0 gap** |
| Working tree | clean | **clean** |

## What was NOT done

- ❌ Did NOT update MEMORY.md auto-index — the auto-memory at `C:\Users\元始天尊\.claude\projects\...` is updated separately per session
- ❌ Did NOT add new i18n keys or source code changes — docs-only batch
- ❌ Did NOT create a NEW ship memory file — used existing per-batch ship memories (linked from M18.0)

## Related references

- **P45** — original CHANGELOG creation (337 lines)
- **P65** — first CHANGELOG catch-up (P46-P64)
- **CLAUDE.md** "Cascade audit pattern" — every P-series memory file should have commit ref; M18.0 is the commit ref for P66b-P83

## P85+ candidate

- **Calculator output content i18n** — translate `customFn` output strings (P79 "Save 51" residual)
- **OG image localization** — image generation scope
- **Shared parser library** — extract from audit + glossary guard (refactor only)
- **New dimension defense** (sitemap / robots / meta descriptions)