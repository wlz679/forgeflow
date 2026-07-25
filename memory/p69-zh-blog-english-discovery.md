# P69 Discovery — zh Blog Pages Show English (Pre-Test Discovery)

> **Status:** DISCOVERY REPORT — bug found BEFORE writing P69 test.
> **Date:** 2026-07-25
> **Discovered during:** pre-flight check for P69 (blog-page CJK guard)

## TL;DR

While preparing P69 (blog-page CJK guard mirroring P67b/P68), an inspection of `dist/zh/blog/<slug>/index.html` revealed a **systematic bug**: 100 out of 101 zh blog pages have **pure English h1**, identical to their en counterparts. This is the exact bug class that P66b defends against (over-cleansing / missing translation), but for blog posts instead of categories or tools.

## Evidence

```
$ for f in $(find dist/zh/blog -name index.html); do
    h=$(grep -o '<h1[^>]*>[^<]*</h1>' "$f" | head -1)
    if echo "$h" | grep -q "[一-鿿]"; then echo CJK; else echo ENG; fi
  done | sort | uniq -c

    1 CJK
  100 ENG
```

Sample zh blog h1 (no CJK):
```html
<h1 class="text-2xl font-extrabold text-gray-900 mb-4">
  Best Activation Rate for Entrepreneurs (2026)
</h1>
```

Same as en counterpart:
```html
<h1 class="text-2xl font-extrabold text-gray-900 mb-4">
  Best Activation Rate for Entrepreneurs (2026)
</h1>
```

## Root cause

`src/pages/[lang]/blog/[slug].astro:73`:
```astro
<h1 class="text-2xl font-extrabold text-gray-900 mb-4">{post.title}</h1>
```

`post.title` comes from `src/lib/blog.ts:36`:
```ts
title: entry.data.title,  // Astro Content Collection frontmatter `title` field
```

The blog markdown frontmatter is English-only (`src/content/blog/best-*.md`, 100 files):
```markdown
---
title: 'Best Activation Rate for Entrepreneurs (2026)'
excerpt: 'Discover the best activation rate to grow your solo business...'
ogImage: 'solopreneur-activation-rate-calculator'
toolSlug: 'solopreneur-activation-rate-calculator'
---
```

No `titleZh` or `title.zh` field exists in frontmatter. The `lang` parameter in the template is **not used** for title translation (compare to category pages which use `t(\`category.${CATEGORY_ID}.name\`, lang)` post-P62).

## Blast radius

| Layer | Affected | Detail |
|---|---|---|
| API | n/a | static site |
| Component | partial | `breadcrumb` line 62 (`{post.title}`), `og alt` line 70 |
| **View (h1)** | **YES** | line 73 — primary user-facing issue |
| **Meta title** | **YES** | line 25 — `metaTitle = \`${post.title} — ForgeFlowKit Blog\`` |
| **JSON-LD headline** | **YES** | line 41 — `headline: post.title` (SEO impact) |
| Content body | YES | `post.content` (markdown body) is also English — not user-visible on this discovery but worth noting |
| Tests | n/a | no blog CJK guard exists yet |
| Util / Layout / Route / Permission | n/a | static site |

User-visible impact: every Chinese-speaking visitor to `/zh/blog/<slug>/` sees English title, English body, English breadcrumb — the entire blog is functionally not localized.

## Why P66b didn't catch this

P66b's `category-zh-cjk-preservation` walks `dist/zh/<slug>/index.html` (15 category pages). It does NOT walk `dist/zh/blog/<slug>/index.html` (101 blog pages). Different page template, different path prefix, different test scope.

P67b walks `dist/zh/solopreneur-*/index.html` (100 tool pages). Also doesn't include blog.

P68 walks `dist/en/solopreneur-*/index.html` (100 en tool pages). Same scope gap.

## Decision points

The user should choose:

### Option A — Fix the bug + write the test
Add zh title (and possibly excerpt + content) translations to all 100 blog posts, then write P69 zh-preservation test as regression guard. **Scope:** large (~100 markdown files need `titleZh` field, plus template change to use `t()` or frontmatter lookup). Could be 1-3 commits depending on whether body content is also translated.

### Option B — Write test as bug report + ship failing test
Write P69 zh-preservation test that fails with 100 violations. Ship the test as a "bug report" — locks current state, prevents further regression, makes bug explicit. Fix the actual translation gap as a follow-up batch. **Scope:** 1 commit (failing test).

### Option C — Defer P69 + plan larger fix
Skip P69 (blog page CJK guard) entirely. Plan a dedicated P69 batch that scopes the full blog i18n translation gap (titles + excerpts + content bodies for 100 posts). **Scope:** 0 commits today; 1+ commits in a future batch.

### Option D — Skip blog pages entirely
Acknowledge that the blog system was English-only by design (not a bug, but a scope choice). Focus CJK defense on category + tool pages only. **Scope:** 0 commits; document the design choice in CLAUDE.md.

## Recommendation

**Option A** (or staged: A-lite = titles + excerpts only, defer bodies to A-2) — this is a real user-visible bug that should be fixed. The P62 fix established the pattern for category i18n; blog i18n is the natural extension. Title-only fix is ~100 mechanical entries; body content is a separate (much larger) scope.

## What was NOT done

- ❌ Did NOT write P69 test that would fail (would require user approval for "ship failing test" pattern)
- ❌ Did NOT modify any source files
- ❌ Did NOT modify any markdown files
- ❌ Did NOT commit anything

This is a discovery report only. The working tree is unchanged.

## Related references

- P62: original category-page CJK leak fix (different bug class, same defense pattern)
- P66b: zh category page preservation (test pattern to mirror)
- P67b: zh tool page preservation (test pattern to mirror)
- P68: en tool page leak guard (test pattern to mirror)
- CLAUDE.md "Hard-breakpoint exemption": audit-grade cross-link requirement for design decisions — would apply to Option D if chosen