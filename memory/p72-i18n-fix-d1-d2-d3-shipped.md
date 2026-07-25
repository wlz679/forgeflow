# P72 T2-A i18n Render Layer Fix (D1 + D2 + D3) Ship Log

## Summary

P72 T2-A fixes 3 user-visible i18n defects in the render layer found by the P72 i18n audit. 330+ English strings on zh pages are now correctly localized.

**Date:** 2026-07-25
**Batch ID:** P72 T2-A
**Files touched:** 4 (3 templates/components + 1 translations.ts)
**Test delta:** 1179 → 1179 (no new tests; existing tests still pass)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### D1: Blog index page (src/pages/[lang]/blog/index.astro)
- Added `translatedPosts` array with lang-aware title + excerpt (mirrors P69 [slug].astro pattern)
- JSON-LD `blogPost.headline` now uses `translatedTitle` (was raw `p.title`)
- `<h2>` and `<p>` use `translatedTitle` / `translatedExcerpt` (was raw `post.title` / `post.excerpt`)
- Fallback to raw values if i18n key missing (defense in depth)
- **Impact:** 200 EN strings on `/zh/blog/` (100 JSON-LD headlines + 100 h2 titles) → now CJK

### D2: RelatedBlog component (src/components/RelatedBlog.astro)
- Added `translatedTitles` Map in frontmatter
- `<a>{post.title}</a>` → `<a>{translatedTitles.get(post.slug)}</a>`
- **Impact:** 100 EN strings on `/zh/solopreneur-*/` (1 per tool page) → now CJK

### D3: CategoryGuides component (src/components/CategoryGuides.astro)
- Added 2 new i18n keys: `category.guides_heading` + `category.related_articles`
- `<h2>Guides & Articles</h2>` → `<h2>{t('category.guides_heading', lang)}</h2>`
- `<h3>Related Articles</h3>` → `<h3>{t('category.related_articles', lang)}</h3>`
- `<a>{post.title}</a>` → `<a>{translatedTitles.get(post.slug)}</a>` (uses existing blog.* keys from P69)
- **Impact:** ~30-40 EN strings (2 section headers + ~5 blog titles per page × 6+ category pages)

### translations.ts additions (P72 T2-D3)
```ts
'category.guides_heading': { en: 'Guides & Articles', zh: '指南与文章' },
'category.related_articles': { en: 'Related Articles', zh: '相关文章' },
```

## Why this exists

P72 T1 audit (sonnet subagent + state-machine parser) found 6 user-visible i18n defects where zh pages rendered English. The audit confirmed translations.ts is structurally complete (3583 keys, 0 missing en/zh); the defects were all in the render layer — pages/components bypassing `t()` lookup and using raw English strings.

T2-A focuses on the 3 highest-impact defects with shared fix pattern (use `t(\`blog.${slug}.title\`, lang)` lookup). The remaining 3 defects (D4 = privacy-policy, D5 = terms, D6 = MD blog body) are deferred to P73+ — different scopes (legal i18n split + 100 MD translations).

## Fix pattern (mirrors P69)

All 3 fixes follow the same P69 pattern:

```ts
// In frontmatter:
const translatedX = new Map<string, string>(
  posts.map(p => {
    const key = `blog.${p.slug}.title`;
    return [p.slug, t(key, lang) !== key ? t(key, lang) : p.title];
  })
);

// In template:
{translatedX.get(post.slug)}  // instead of {post.title}
```

This pattern:
- Uses existing P69 i18n keys (200 blog.* keys added in P69 T1)
- Falls back to raw `post.title` if key missing (defense in depth — no breakage on key omission)
- Mirrors the [slug].astro P69 implementation

## Coverage expansion

| Component / page | zh strings fixed | Status |
|---|---|---|
| `/zh/blog/` index | 200 (100 JSON-LD + 100 h2) | ✅ Fixed (D1) |
| `/zh/solopreneur-*/` (100 pages) | 100 (1 RelatedBlog link each) | ✅ Fixed (D2) |
| `/zh/<category>/` pages (15) | ~30-40 (2 headers + ~5 titles per page on 6 affected pages) | ✅ Fixed (D3) |

## Verification

After rebuild, manual grep of dist/zh confirms:
- `dist/zh/blog/index.html` — 100 h2 titles now CJK (e.g. "最佳 MRR（月经常性收入）计算器（2026）")
- `dist/zh/blog/index.html` — 100 JSON-LD `blogPost.headline` values now CJK
- `dist/zh/solopreneur-mrr-calculator/index.html` — RelatedBlog link text now CJK (e.g. "最佳 MRR（月经常性收入）计算器（2026）")
- `dist/zh/saas-metrics/index.html` — CategoryGuides h2 now "指南与文章" (was "Guides & Articles")
- `dist/zh/saas-metrics/index.html` — CategoryGuides h3 now "相关文章" (was "Related Articles")

## Audit script ships

`scripts/p72-audit-v6.cjs` — state-machine parser of translations.ts + t() call site coverage + dist/zh hardcoded English scan. Re-runnable for future audits. Subagent left 13 scratch files (translations.cjs, full.cjs, v2-v5.cjs, check-keys.cjs, parse-only.cjs, findings*.json, verify-keys.cjs) — all cleaned up; only v6 retained.

## What was NOT done (deferred)

- ❌ D4 (privacy-policy.astro) — full i18n split. Page is EN-hardcoded for both langs.
- ❌ D5 (terms.astro) — same as D4.
- ❌ D6 (MD blog body content) — 100 markdown files have EN-only body. Large scope; separate batch.
- ❌ No new CJK guard tests — D1/D2/D3 fixes don't break existing P66b/P67b/P68/P69/P71 tests (verified by manual grep); new tests would only verify the previously-EN strings now have CJK.

## P73+ candidate

- **D4 + D5 (legal pages)** — full i18n split. Privacy + Terms pages need ~10-15 new i18n keys.
- **D6 (MD blog bodies)** — 100 MD files × ~300 lines each. Subagent-driven translation.
- **Audit script as CI guard** — `scripts/p72-audit-v6.cjs` could become a build-dep test to prevent future render-layer defects.
- **CLAUDE.md standing rule** — formalize `.superpowers/` gitignore rule from P70.

## CI integration

- No new build-dep suites (TDD defense check verified via existing tests)
- 3 small template changes + 2 i18n keys = minimal CI impact
- Total session commit count continues to grow incrementally

## Related references

- **P69** — blog title/excerpt translation batch (200 zh keys) that T2-A now leverages
- **P62** — original category i18n fix that established the `t()` lookup pattern
- **P72 audit** — sonnet subagent + state-machine parser found these defects