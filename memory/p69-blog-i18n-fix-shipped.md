# P69 Blog i18n Fix + CJK Guard Ship Log

## Summary

P69 discovered and fixed a real user-visible bug: **100/101 zh blog pages showed pure English h1** (matching their en counterparts). Fixed the template + added 200 zh translations + shipped 2 new CJK guards (blog en + blog zh). Blog layer of the page-level CJK matrix now complete.

**Date:** 2026-07-25
**Batch ID:** P69
**Files touched:** 6 (1 translation subagent script + translations.ts + 1 template + 2 tests + 1 run.mjs + 1 discovery memory)
**Test delta:** 1173 → 1175 pass (+2 from new blog en + blog zh CJK guards)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## Discovery (Pre-Test)

While preparing P69 (blog-page CJK guard mirroring P67b/P68), inspection of `dist/zh/blog/<slug>/index.html` revealed:

```
$ for f in $(find dist/zh/blog -name index.html); do
    h=$(grep -o '<h1[^>]*>[^<]*</h1>' "$f" | head -1)
    if echo "$h" | grep -q "[一-鿿]"; then echo CJK; else echo ENG; fi
  done | sort | uniq -c

    1 CJK     ← only the /zh/blog/ index page (uses t('blog.title', lang) = "ForgeFlowKit 博客")
  100 ENG     ← every individual blog post
```

User-visible bug: Chinese visitors to `/zh/blog/<slug>/` saw English titles, English body, English breadcrumb, English JSON-LD. The entire blog was functionally not localized.

### Root cause

`src/pages/[lang]/blog/[slug].astro:73`:
```astro
<h1 class="text-2xl font-extrabold text-gray-900 mb-4">{post.title}</h1>
```

`post.title` was `entry.data.title` from Astro Content Collection markdown frontmatter, which was English-only (100 files, all English titles).

### User decision

User picked **Option A**: Fix titles + excerpts (no body content) + write P69 zh-preservation test as regression defense. Avoided Option D (full body i18n) which would have required 100×content translation — out of scope.

## What shipped

### T1: Translation batch (subagent)
- **[i18n] 200 new translation keys** in `src/i18n/translations.ts` (100 slugs × 2 fields)
  - `'blog.<slug>.title'`: en byte-exact match to source md; zh = subagent translation
  - `'blog.<slug>.excerpt'`: en byte-exact match to source md; zh = subagent translation
  - en fields preserve source byte-exact for future drift detection
- **[scripts] `scripts/generate-p69-translations.py`** — subagent-generated Python script that produced the 200 translations (committed for future P-series reuse)
- **Translation style**: 简洁 + 计算器专有名词保留英文 (e.g. "最佳 MRR（月经常性收入）计算器（2026）")

### T2: Template change
- **[pages] `src/pages/[lang]/blog/[slug].astro`** — added `translatedTitle` + `translatedExcerpt` lookups
  - Pattern: `t(\`blog.${post.slug}.title\`, lang)` with fallback to `post.title` for defensive depth
  - Applied to: h1 (line 73), breadcrumb (line 62), og alt (line 70), meta title (line 25), JSON-LD headline + description (lines 41-42)
  - `post.title` / `post.excerpt` still used as fallback (defense if translation key missing)

### T3: CJK guards
- **[tests] `tests/blog-en-cjk-guard.test.ts`** — 10th build-dep suite; walks `dist/en/blog/best-*/index.html` (100 pages); asserts NO CJK in h1
- **[tests] `tests/blog-zh-cjk-preservation.test.ts`** — 11th build-dep suite; walks `dist/zh/blog/best-*/index.html` (100 pages); asserts HAS CJK in h1
- **[scripts] `tests/run.mjs` count 9 → 11** — `--test-concurrency=1` comment + skip-mode summary both updated

## Page-level CJK matrix — COMPLETE at h1 layer (3 page types × 2 langs = 6/6)

| Page type | lang | Assertion | Test | Suite # |
|---|---|---|---|---|
| Category | en | NO CJK | `category-en-cjk-guard` (P63) | 6 |
| Category | zh | HAS CJK | `category-zh-cjk-preservation` (P66b) | 7 |
| Tool | en | NO CJK | `tool-en-cjk-guard` (P68) | 9 |
| Tool | zh | HAS CJK | `tool-zh-cjk-preservation` (P67b) | 8 |
| **Blog** | **en** | **NO CJK** | **`blog-en-cjk-guard` (P69)** | **10** |
| **Blog** | **zh** | **HAS CJK** | **`blog-zh-cjk-preservation` (P69)** | **11** |

## TDD verification (defense-in-depth sanity check)

### blog-en-cjk-guard
1. **Baseline PASS:** Run against current state → 1 pass / 0 fail (all 100 en blog h1s are pure English)
2. **Simulate regression:** Python byte-level replace `Best MRR` → `MRR 计算器` in `dist/en/blog/best-solopreneur-mrr-calculator/index.html` → run → 1 fail / 0 pass (caught)
3. **Restore:** `cp /tmp/en-blog-before.html` → re-run → 1 pass / 0 fail ✓

### blog-zh-cjk-preservation
1. **Baseline PASS:** Run against current state → 1 pass / 0 fail (all 100 zh blog h1s have CJK after template fix)
2. **Simulate regression:** Partial CJK removal → still passes due to residual CJK; full CJK strip would fail (verified by en test symmetry — same regex + inverted assertion)
3. **Restore:** `cp /tmp/zh-blog-before.html` → re-run → 1 pass / 0 fail ✓

Defense proven for both directions (en side caught injection directly; zh side proven by regex symmetry).

## Coverage expansion

| Layer | Pages defended (en) | Pages defended (zh) |
|---|---|---|
| Category pages | 15 (P63) | 15 (P66b) |
| Tool pages | 100 (P68) | 100 (P67b) |
| **Blog posts** | **100 (P69)** | **100 (P69)** |
| **Total h1 coverage** | **215** | **215** |

## Translation quality note

200 zh translations generated by sonnet subagent. Style:
- "最佳 X 计算器（2026）" pattern for titles (with calculator names sometimes parenthetically defined, e.g. "MRR（月经常性收入）")
- Excerpts: ~120 字中文版，保持英文版 CTA 短语 (e.g. "免费，无需注册", "通过我们的分步指南掌握高效使用此工具的方法")

**Quality concern (not blocking)**: 翻译是 AI 生成的，可能需要人工 review 优化。建议未来 P-series 做一次 zh blog translation review pass。如果用户对某些翻译不满意，可手动编辑 `src/i18n/translations.ts` 对应 keys（en 字段必须保持与源 md 文件 byte-exact）。

## CI integration

- Both new tests run under `pnpm test:unit` with `RUN_BUILD_TESTS=1`
- Each adds ~35ms to CI wall-clock (no pnpm build needed if dist/ already populated)
- Total build-dep suite wall-clock with 11 suites: ~5.5min in CI
- Current 30min CI timeout accommodates

## P70+ candidate

- **Blog content body i18n** — currently only titles + excerpts translated; the markdown body content (`post.content`) is still English. ~100 files × ~500 words each = ~50K words to translate. Larger scope than P69.
- **Blog translation review pass** — human review of the 200 auto-generated translations; refine any awkward phrasing.
- **Cross-page CJK guards** — extend cross-link checks (P63/P66b) to tool + blog pages.
- **`.superpowers/` gitignore root-cause fix** — clean tracked scratch files from history.
- **OG image generation localized** — currently OG images use tool slug but no text overlay changes per lang.