# P82 Audit Filter + Glossary Guard Ship Log

## Summary

P82 ships 2 small improvements that close defense gaps identified in P79 and P78:
1. **`scripts/p72-audit-v6.cjs`** — filter strips `<head>` to remove SEO `<title>` / `<meta>` false positives (Blog 303 → 3 hits)
2. **`tests/translation-glossary-guard.test.ts`** — new CI guard verifying structural invariants (every tool/blog/category has expected i18n keys)

**Date:** 2026-07-26
**Batch ID:** P82
**Files touched:** 2 (1 audit script + 1 new test)
**Test delta:** 1180 → 1181 pass (+1 from new glossary guard)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### T1: Audit script filter improvement

Modified `scripts/p72-audit-v6.cjs` to add `<head>` strip:

```js
// P82: strip <head> too — SEO <title>/<meta og:title>/<meta twitter:title>
// tags contain brand strings like "ForgeFlowKit Blog" which are by-design
// (per glossary Brand Name Preservation rule). Excluding <head>
// removes ~303 false-positive "Blog" hits.
const stripped = content.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, ' ')
                         .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
                         .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
                         .replace(/<[^>]+type="application\/ld\+json"[^>]*>[\s\S]*?<\/[^>]+>/gi, ' ');
```

**Impact on audit output**:

| Pattern | Pre-P82 | Post-P82 |
|---|---|---|
| Blog | 303 / 101 pages | 3 / 1 page |
| Other patterns | unchanged | unchanged |

The 300 reduction is from `<title>ForgeFlowKit Blog</title>` and `<meta og:title>...Blog` style tags. By-design brand preservation per `docs/i18n/zh-terminology.md` "Brand Name Preservation" section.

### T2: Translation glossary guard

New test `tests/translation-glossary-guard.test.ts`:

- Parses `src/i18n/translations.ts` with state-machine parser (improved over P72 audit to skip `//...` comment lines)
- Verifies structural invariants:
  - Every tool slug (from `src/data/tools/*.ts`) has `tools.${slug}.description` key
  - Every category ID (from `src/data/categories.ts`) has `category.${id}.name` AND `category.${id}.desc` keys
  - Every blog slug (from `src/content/blog/*.md`) has `blog.${slug}.title` AND `blog.${slug}.excerpt` keys
- Any drift = test fails with detailed violation list

**Build dependency**: NONE — this is a pure source-file scan (no `pnpm build` needed). Doesn't go in `tests/run.mjs` build-dep count.

**Why no build-dep**: faster feedback (25ms vs 30s), runs on every commit regardless of build-dep gate.

## Why this exists

### T1 rationale

P79 re-audit found 303 "Blog" hits on 101 zh pages — all in `<title>` / `<meta og:title>` / `<meta twitter:title>` tags. These are SEO metadata containing `ForgeFlowKit Blog` (brand + page type) which is intentionally kept per glossary rule. The audit script's filter was missing `<head>` strip, so it counted these by-design instances as defects.

Without filter improvement, future audits would generate 303 false-positive hits every time, drowning real defects. P82 fix makes audit output actionable.

### T2 rationale

P17 (2026-06-22) introduced `tools.*.description` keys; P69 (2026-07-23) added `blog.*.title/excerpt`; P73 (2026-07-25) added `legal.*` keys; P78 (2026-07-26) extended glossary with structural patterns.

Without a CI guard:
- A future batch adding a new tool forgets to add `tools.${slug}.description` key
- P80/P81-style template fix would still use raw English fallback (silent regression)
- Audit script doesn't catch this specifically (only catches cross-page hardcoded EN)

P82 guard catches the structural drift BEFORE any template change exposes English to zh users.

## TDD verification

### Glossary guard defense check (proven)

1. **Baseline PASS**: Run against current state → 1 pass / 0 fail
2. **Comment-out inject**: `// 'tools.solopreneur-mrr-calculator.description':` (comment out one key) → run → 1 fail / 0 pass ✓
3. **Restore**: `cp /tmp/translations-before.ts` → re-run → 1 pass / 0 fail ✓

Comment-out robustness was a real concern: the initial parser (mirroring P72 audit-v6) didn't strip `//` lines, so a dev commenting out a key wouldn't trigger the guard. P82 added line-comment masking to the parser.

### Parser robustness improvements over P72 audit-v6

| Aspect | P72 audit-v6 | P82 glossary guard |
|---|---|---|
| Handles `//` line comments | ❌ (counts commented keys as present) | ✅ (strips comments first) |
| Detects missing structural keys | ❌ (only does dist/zh scan) | ✅ (direct translations.ts scan) |
| Build dependency | None | None |

## Coverage matrix update

| Defense layer | Test file | Status |
|---|---|---|
| en cat page h1 + cross-link | `category-en-cjk-guard` | ✅ |
| zh cat page h1 + cross-link | `category-zh-cjk-preservation` | ✅ |
| en/zh tool page h1 | `tool-en-cjk-guard`, `tool-zh-cjk-preservation` | ✅ |
| en/zh blog page h1 | `blog-en-cjk-guard`, `blog-zh-cjk-preservation` | ✅ |
| en/zh tool/blog cross-link | `tool-cross-link-cjk-guard`, `blog-cross-link-cjk-guard` | ✅ |
| 11 known hardcoded EN | `zh-hardcoded-english-guard` | ✅ |
| **Structural i18n keys** | **`translation-glossary-guard` (NEW)** | ✅ |

**Total: 15 tests, 11 build-dep + 4 source-only + glossary guard**

## What was NOT done

- ❌ Did NOT update `tests/run.mjs` count — glossary guard doesn't require `pnpm build`, so doesn't go in build-dep count
- ❌ Did NOT modify `scripts/p72-audit-v6.cjs` to also skip `//` comments — focus was narrow filter improvement
- ❌ Did NOT add similar guard for calculator output content i18n (different scope)

## Related references

- **P72** — original audit script + 6 defects
- **P73** — legal page i18n
- **P78** — translation glossary structural patterns (P82 enforces these)
- **P79** — re-audit identified `<head>` false positive
- **P80/P81** — tool description i18n fixes (glossary guard ensures no future regression)

## P83+ candidate

- **Calculator output content i18n** — translate `customFn` output strings (different scope)
- **Translation glossary pattern checks** — verify NEW translation keys follow naming patterns (e.g., `tools.${slug}.faq.*` if FAQ added)
- **OG image localization** — image generation scope
- **Audit script improvements** — strip comments too (mirror P82 glossary guard parser)