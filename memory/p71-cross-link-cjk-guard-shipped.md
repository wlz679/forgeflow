# P71 Cross-link CJK Guard Ship Log

## Summary

P71 extends the page-level CJK matrix to the **cross-link layer**. Tool and blog pages contain cross-links to all 15 category pages (via `CategoryOtherNav` / footer). P63/P66b walked only the category pages themselves; P71 walks tool + blog pages and asserts their cross-link text is CJK-correct.

**Date:** 2026-07-25
**Batch ID:** P71
**Files touched:** 3 (2 new test files + 1 run.mjs count + 1 memory)
**Test delta:** 1175 → 1179 pass (+4 from new cross-link guards × 2 langs)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### Added
- **[tests] `tests/tool-cross-link-cjk-guard.test.ts`** — 12th build-dep suite, 2 test blocks:
  - `en tool pages contain NO CJK in <a href="/en/<category>/"> cross-link bodies (anti-leak)`
  - `zh tool pages contain CJK in <a href="/zh/<category>/"> cross-link bodies (preservation)`
- **[tests] `tests/blog-cross-link-cjk-guard.test.ts`** — 13th build-dep suite, 2 test blocks:
  - `en blog pages contain NO CJK in <a href="/en/<category>/"> cross-link bodies (anti-leak)`
  - `zh blog pages contain CJK in <a href="/zh/<category>/"> cross-link bodies (preservation)`

### Changed
- **[scripts] `tests/run.mjs` count 11 → 13 build-dep suites** — `--test-concurrency=1` comment + skip-mode summary both updated

## Page-level CJK matrix — h1 + cross-link layers now complete

### H1 layer (P63 / P66b / P67b / P68 / P69)
| Page type | en | zh |
|---|---|---|
| Category | ✓ NO (P63) | ✓ HAS (P66b) |
| Tool | ✓ NO (P68) | ✓ HAS (P67b) |
| Blog | ✓ NO (P69) | ✓ HAS (P69) |

### Cross-link layer (P71) — NEW
| Page type | en | zh |
|---|---|---|
| Category | ✓ NO (P63 partial) | ✓ HAS (P66b partial) |
| Tool | ✓ **NO (P71)** | ✓ **HAS (P71)** |
| Blog | ✓ **NO (P71)** | ✓ **HAS (P71)** |

**Coverage expansion**: cross-link layer now covers 200 tool pages + 200 blog pages × 15 category cross-refs each = 6,000 cross-link assertions across en + zh.

## Why this exists

Tool pages (`/en/solopreneur-mrr-calculator/`) and blog pages (`/en/blog/best-solopreneur-mrr-calculator/`) render a `CategoryOtherNav` grid in the footer with links to all 15 categories. The link text comes from `t(\`category.${id}.name\`, lang)`. A future refactor that breaks this lookup chain (e.g., wrong fallback, hardcoded English default) would silently show English category names on zh tool/blog pages, even if the main h1 is correctly translated.

P63's `category-en-cjk-guard` walked `dist/en/<category>/index.html` and checked cross-links — but it only checked the cross-links FROM category pages TO other category pages. It never checked the cross-links FROM tool/blog pages TO category pages. P71 closes this gap.

## Test design

Both tests follow the same pattern:

```ts
for each tool/blog slug (100 total):
  for each category slug (15 total):
    find <a href="/<lang>/<category-slug>/">...</a> bodies
    assert CJK or NO CJK based on direction
```

Total assertions per file: ~100 × 15 = 1,500 cross-link checks per direction. Both en + zh: ~3,000 checks per file.

## Coverage expansion

| Layer | Pages with cross-link assertions |  |
|---|---|---|
| Tool pages (en) | 100 | (P71) |
| Tool pages (zh) | 100 | (P71) |
| Blog pages (en) | 100 | (P71) |
| Blog pages (zh) | 100 | (P71) |
| **Total** | **400** | |

## CI integration

- 2 new build-dep suites, each with 2 test blocks
- Each suite adds ~150-250ms to CI wall-clock (no pnpm build needed if dist/ already populated)
- Total build-dep suite wall-clock with 13 suites: ~6min in CI
- Current 30min CI timeout accommodates

## P71+ candidate

- **CLAUDE.md standing rule** — add "Never `git add` files under `.superpowers/`" to "Notes for Future Sessions"
- **Blog body content i18n** — translate ~50K words across 100 markdown bodies (large scope)
- **Blog translation review pass** — human review of 200 AI-generated zh translations (P69 follow-up)
- **OG image localization** — text overlay changes per lang
- **Other i18n gap audit** — footer text, breadcrumb labels, error messages