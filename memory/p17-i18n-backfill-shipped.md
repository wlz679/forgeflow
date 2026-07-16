---
date: 2026-07-16
type: i18n-backfill-batch
commits:
  - 260c46c fix(i18n): backfill 155 missing category + tool title/description keys
  - 6b1dd49 feat(i18n): input label mechanical pass + extend completeness check + precommit wiring
trigger: user-feedback (report showing raw i18n keys on home page)
status: shipped-partial (core bug fixed, ~1400 followup keys deferred)
---

# P17 i18n Backfill Batch — Shipped (partial)

## Outcome

| Metric | Value |
|---|---|
| **Root cause** | `src/i18n/index.ts:20` fallback returns raw key when translation missing |
| **Shipped** | 472 input labels (mechanical) +30 category + 200 tool title/desc = 702 i18n entries |
| **Tooling** | Extended `scripts/check-i18n-completeness.mjs` to validate ALL categories + tools dynamically; wired into `.githooks/pre-commit` |
| **User-visible bug** | FIXED — `dist/{en,zh}/index.html` raw-key count = 0 (was 8+ for M/O/S/R/P/H/T/K/L categories) |
| **Pre-existing debt** | 574 input labels + 856 FAQ q/a + 568 how-to-use = ~1998 keys still missing for per-tool pages |

## Bug Discovery (user feedback, 2026-07-16)

User reported (with screenshots): new calculator titles/descriptions show raw i18n keys like "tools.solopreneur-coupon-attribution-calculator.description" and category header shows "M. category.M.name".

## Phase 1+2 Root Cause Investigation

**Root cause**: `src/i18n/index.ts:20` fallback returns raw key when missing:
```ts
if (!entry) return key;
```

**Why missing keys exist** (P6-P14 era debt):
- 9 categories (M/O/S/R/P/H/T/K/L) added in P6-P14 batches never received `category.{X}.name/desc`
- 68 tools (added in P4-P16, including the 2 new e-commerce engines) never received `tools.{slug}.title/description`
- The 2 P16 marketing engines (coupon-attribution, cart-abandonment-cost) MADE the bug visible

**Why it wasn't caught by build**:
- `scripts/check-i18n-completeness.mjs` only checked legacy keys (eeat / about / category.{A-F}.* / favorites / recent / history). It did NOT validate `category.{X}.name/desc` for all 15 categories nor `tools.{slug}.title/description` for all 100 engines.

## Phase 3+4 Fix

### Commit 1: `260c46c` — visible bug fix (home page)
- 30 category.{X}.name + .desc entries (full ZH translations, professional)
- 100 tool title + 100 tool description (full ZH translations)
- Plus 3 legacy tools (stripe-fee, safe-convertible, remote-vs-office) discovered missing during dedup
- Total: 233 keys (claimed 155 + 78 uncovered during merge)
- scripts/extract-i18n-needed.mjs added (single-source-of-truth enumeration)

### Commit 2: `6b1dd49` — defense layer
- 372 input label + placeholder entries (mechanical pattern translation; 99 skipped as already-existing)
- Extended `scripts/check-i18n-completeness.mjs` to dynamically validate ALL 230 category + tool title/desc keys
- Wired into `.githooks/pre-commit` (runs when translations/data/engines change)
- Test: removing any tool title fails the check immediately

### Verification

- `pnpm exec astro build`: 313 pages, 0 errors
- `grep -c "tools\.solopreneur\|category\.[A-Z]\.(name|desc)" dist/{en,zh}/index.html` → 0
- User-reported M category header now shows "M. 营销分析" (zh) / "M. Marketing Analytics" (en)

## Lessons Consolidated

1. **Silent fallback is a footgun.** `src/i18n/index.ts:20` returning the raw key surfaces engineering keys to end users verbatim. The P17 fix does NOT change this behavior (kept scope tight), but should consider in P18: return a sanitized human-readable fallback (e.g., humanize `tools.solopreneur-x-calculator.title` → "X Calculator") for any future missing keys.

2. **Completeness-check scope must match production consumers.** check-i18n-completeness.mjs validated 130 legacy keys but missed the 230 dynamic keys that pages actually consume. Defense-in-depth requires check scripts to mirror real callers.

3. **Legacy i18n entries are NOT updated when engines get v3 audits.** Engines added P6-P14 received the v3 health bands in `generate()` outputs but their `tools.{slug}.title/description` stayed at P1-era simpler text. Fix: every engine update must include a "translations cohort" step.

4. **Mechanical translation is high-value but bounded.** 471 of 859 input labels translated cleanly via exact-match dictionary (54% coverage). The remaining 388 require either (a) more dict entries (incremental) or (b) subagent+domain expertise (high effort). P17b should grow the dict then re-run.

5. **Data source confusion between engines and tools data.**
- `src/data/tools/*.ts` carries slug + title + description + inputs.name (SEO metadata)
- `src/engines/*/*.ts` carries faq + howToUse + inputs.label + inputs.placeholder (engine runtime)
- These have inconsistent naming (e.g., `productivity-ramp-calculator.ts` engine vs `solopreneur-productivity-ramp-curve-calculator` slug). Caused one false-start duplicate.
- Pattern: always use the slug from `src/data/tools/*.ts` as the canonical `tools.{slug}` key namespace.

6. **Subagent-driven-development for translation work is bounded.** 2513 keys is too much for subagent quality. Direct inline translation is more reliable for small batches but caps output volume.

## Deferred Work (P17b candidates)

| Scope | Missing | Notes |
|---|---|---|
| Input labels + placeholders | 388 | Mostly AI cost engines + niche domain terms. Need dict growth or subagent. |
| FAQ q + a | ~856 | Domain-knowledge intensive. Per-engine. |
| How-to-use | ~568 | Per-engine. Often auto-redundant with engine inputs labels. |

**Suggested P17b approach**:
1. Use one subagent per category (10 calcs × 6 batches) for FAQ + how-to-use
2. Extend input label dictionary with AI cost terms
3. Re-extend check-i18n-completeness to validate engine-level keys (input/FAQ/howToUse)
4. Add `engineKey: true` marker per engine indicating when i18n coverage is complete

## Files

- `src/i18n/translations.ts` (+155 unique entries + 372 input label entries)
- `scripts/check-i18n-completeness.mjs` (extended to dynamic validation)
- `scripts/extract-i18n-needed.mjs` (NEW — single-source enumeration)
- `.githooks/pre-commit` (extended with i18n check)

## MEMORY.md Index Update

Added to `memory/MEMORY.md` (in-repo + Claude-side mirror) P17 pointer.