# P72 i18n Completeness Audit — Findings Report

> **Status:** DISCOVERY (audit complete, fix scope TBD with user)
> **Date:** 2026-07-25
> **Audit script:** `scripts/p72-audit-v6.cjs` (state-machine parser, ships with P72)

## TL;DR

P72 i18n audit found **6 user-visible defects** where zh pages render English text. translations.ts itself is structurally complete (3583 keys, 0 missing en/zh). The defects are all in **rendering layer** — pages/components use raw `post.title` / hardcoded English strings instead of routing through `t()` lookups.

## Audit scope & method

- **Static analysis** of `src/i18n/translations.ts` (3583 keys via state-machine parser — final v6 script, not regex)
- **t() call site coverage** of `src/**/*.astro` + `.ts` (201 calls, 0 real missing keys)
- **dist/zh HTML body scan** for hardcoded English UI strings (filtered: excludes `<script>`, `<style>`, JSON-LD, brand names, model/preset labels, placeholders)

## What's structurally OK

- ✅ translations.ts: 3583 keys, 0 missing en/zh
- ✅ Footer: i18n-clean (uses `t('site.name')` + `t('footer.copyright')`)
- ✅ Header: 11 i18n keys, all bilingual
- ✅ Most components (CopyButton, FAQ, RelatedTools, RecentViewed, etc.): i18n-clean
- ✅ Blog detail page (`[slug].astro`) — fixed by P69, uses `t(\`blog.${slug}.title\`, lang)` with fallback
- ✅ Blog title/excerpt translations: 200 keys, 0 zh===en drift

## 6 user-visible defects

### D1: Blog index page renders 200 EN strings
- **Files:** `src/pages/[lang]/blog/index.astro:31,47,48`
- **What:** JSON-LD `blogPost.headline: p.title` + `<h2>{post.title}</h2>` + `<p>{post.excerpt}</p>` use raw MD frontmatter (English)
- **Impact:** 100 EN h2 + 100 EN JSON-LD headlines = **200 EN strings on `/zh/blog/`**
- **Fix:** Mirror P69 pattern — use `t(\`blog.${p.slug}.title\`, lang)` with fallback

### D2: 100 tool pages show EN blog link text
- **File:** `src/components/RelatedBlog.astro:19`
- **What:** `{post.title}` uses raw EN title in related blog section
- **Impact:** 1 EN string per tool page × 100 = **100 EN strings on `/zh/solopreneur-*/`**
- **Fix:** Use `t(\`blog.${post.slug}.title\`, lang)` lookup (key exists from P69)

### D3: CategoryGuides has hardcoded EN headers + EN blog titles
- **File:** `src/components/CategoryGuides.astro:16,31,36`
- **What:** `<h2>Guides & Articles</h2>` + `<h3>Related Articles</h3>` + `{post.title}` (EN)
- **Impact:** 2 EN section headers + ~5 EN blog titles per page × ~6 category pages = **~30-40 EN strings**
- **Fix:** Use `t('related_blog.title', lang)` (existing key '阅读完整指南') + i18n key for "Related Articles"

### D4: privacy-policy page is entirely EN-hardcoded
- **File:** `src/pages/[lang]/privacy-policy.astro`
- **What:** `<h1>Privacy Policy</h1>`, `<h2>Information We Collect</h2>`, `<h2>Cookies and Tracking</h2>`, etc. all hardcoded EN
- **Impact:** 1 zh page, but legal pages are high-trust signals
- **Fix:** Full i18n split (zh sibling text for each section)

### D5: terms page is entirely EN-hardcoded
- **File:** `src/pages/[lang]/terms.astro`
- **What:** `<h1>Terms & Conditions</h1>` + all body sections EN
- **Impact:** 1 zh page
- **Fix:** Full i18n split

### D6: MD blog body content is EN-only (deferred)
- **Files:** 100 MD files at `src/content/blog/*.md`
- **What:** Body markdown content is English; rendered verbatim to zh pages
- **Impact:** 100 zh blog pages show EN body (sections like "What is X", "Why Entrepreneurs Need This Tool", etc.)
- **Effort:** Highest of all — translating 100 MD bodies (~300+ lines each)
- **Decision:** Defer to separate batch (P72+ T2 may or may not include)

## Priority ranking

| # | Fix | Files | User-visible impact | Effort |
|---|---|---|---|---|
| 1 | D1 (blog index) | 1 | **200 EN strings** | Low |
| 2 | D2 (RelatedBlog) | 1 | **100 EN strings** | Low |
| 3 | D3 (CategoryGuides) | 1 + 1 new i18n key | **~30-40 EN strings** | Low-Med |
| 4 | D4 + D5 (privacy + terms) | 2 | **2 zh pages fully EN** | Medium |
| 5 | D6 (MD bodies) | 100 | 100 zh blog bodies | Very High |

## Recommendation

**T2 fix scope = P1 + P2 + P3** (D1 + D2 + D3) — all low-effort, high-impact, shared pattern (use `t(\`blog.${slug}.title\`, lang)`). Defer D4/D5 to P73+ (separate batch for legal i18n), defer D6 to dedicated P74+ (large translation scope).

## Audit script artifact

- `scripts/p72-audit-v6.cjs` — final working audit script. 199 lines, state-machine parser. Can be re-run anytime: `node scripts/p72-audit-v6.cjs`.
- Subagent iteration left 13 scratch files in scripts/ — all cleaned up (kept only v6).

## What was NOT done

- ❌ Did NOT fix any of the 6 defects
- ❌ Did NOT commit audit script (kept locally; can ship with T2 if useful for CI)
- ❌ Did NOT add regression tests (deferred to T2 if scope includes them)
- ❌ Did NOT modify any source files

This is a discovery report. Working tree only differs from HEAD by the audit script.