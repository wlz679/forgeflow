---
name: p140g-author-bio-pages-shipped
description: P140g author bio pages — per-reviewer detail pages at /[lang]/about/authors/[slug].astro + about-card link + build-dep test. Closes P140c ship record "Out of scope" line 529.
metadata:
  type: project
  shipped: 2026-08-19
  commits: 5 atomic on feature/p140g-author-bio-pages
  branch: feature/p140g-author-bio-pages
---

# P140g Author Bio Pages — SHIPPED

**Date:** 2026-08-19
**Branch:** `feature/p140g-author-bio-pages` (5 atomic commits + spec + plan on master before branch)
**Trigger:** User "继续" after P140d-T8 ship; chose Option A "Author bio pages" from 3-way recommendation (small + continues E-E-A-T)
**Closes:** P140c ship record "Out of scope (P140d candidates)" line 529 — **last** item in the P140c out-of-scope list

---

## Why this batch exists

P140c-T1 (E-E-A-T Completion) explicitly chose **Option A — single real founder persona** (王立柱 / Wang Lizhu) over fabricated multi-persona, in response to AdSense E-E-A-T standards. The about page has a `#our-reviewers` section rendering a card per reviewer with name + role + bio + credentials, but per-author detail pages were deferred.

P140g ships those deferred pages with **Minimal scope** (Approach A chosen in brainstorming):
- 1 new route (`src/pages/[lang]/about/authors/[slug].astro`)
- 1 modify (`src/pages/[lang]/about.astro` — "Read full bio →" link in reviewer card)
- 1 new build-dep test (`tests/authors-page-render-guard.test.ts`)
- 6 new i18n keys
- **No new data fields** — reuses existing `ReviewerPersona` (id/name/role/expertise/bio/credentials)

---

## Change (4 files + 1 spec + 1 plan)

### 1. `src/i18n/translations.ts` (+8 lines)

Added 6 new keys after the E-E-A-T section:

```typescript
// P140g: author bio pages i18n keys (1 new route + 1 about-page link)
'authors.page.title_suffix': { en: '{name} — About ForgeFlowKit', zh: '{name} — 关于 ForgeFlowKit' },
'authors.section.bio': { en: 'Background', zh: '背景' },
'authors.section.credentials': { en: 'Credentials', zh: '资质' },
'authors.section.categories': { en: 'Categories Reviewed', zh: '审核类别' },
'authors.back_to_about': { en: '← Back to About', zh: '← 返回关于' },
'authors.read_full_bio': { en: 'Read full bio →', zh: '阅读完整简介 →' },
```

### 2. `src/pages/[lang]/about/authors/[slug].astro` (NEW, +98 lines)

**Pattern:** Per-reviewer detail pages extending P140c's transparent single-founder disclosure.

- **`getStaticPaths()`**: `2 langs × N reviewers` static pages — today = **2 pages** (en + zh for the single founder persona).
- **3 H2 sections**: Background / Credentials / Categories Reviewed
- **Header**: name (h1) + role (subtitle)
- **Back-link**: `← Back to About` → `/{lang}/about/#editorial-standards`
- **SEO**: JSON-LD Person schema (worksFor ForgeFlowKit editorial team) + hreflang × 2 + canonical + x-default (latter 4 emitted by BaseLayout)
- **Categories grid**: All 15 categories the reviewer covers, linked to `/{lang}/{cat.slug}/` — today the single reviewer covers all 15
- **Data**: ZERO change to `editorial.ts` (Approach A constraint); reuses existing `ReviewerPersona`

### 3. `src/pages/[lang]/about.astro` (+6 lines, line 160-165)

Inside the `REVIEWERS.map()` card, after the credentials paragraph:

```astro
<a
  href={`/${lang}/about/authors/${r.id}/`}
  class="text-[#7C3AED] hover:underline text-sm font-medium mt-2 inline-block"
>
  {t('authors.read_full_bio', lang)}
</a>
```

Same purple `text-[#7C3AED] hover:underline` styling as cross-links in about page.

### 4. `tests/authors-page-render-guard.test.ts` (NEW, +76 lines)

**Build-dep guard** (P23b skip-guard pattern; runs only with `RUN_BUILD_TESTS=1`).

Mirrors `tests/engine-faq-html-render-guard.test.ts` (P146-S2) pattern. For each `(lang, reviewer.id)` combination, asserts `dist/{lang}/about/authors/{reviewer.id}/index.html` contains:

- `reviewer.name`
- `reviewer.role`
- `reviewer.bio[lang]`
- All credentials
- `"@type":"Person"` (JSON-LD)
- `hreflang="en"` + `hreflang="zh"` + `rel="canonical"`

Today: 2 langs × 1 reviewer = **2 page checks**. Future reviewers add N more checks at zero test-code cost.

---

## Verification

| Check | Result |
|---|---|
| `tsc --noEmit` | clean |
| `pnpm build` | 451 pages built (was 449; +2 new author bio pages) |
| `pnpm check` | skip-guard preserved — does not run build-dep tests without opt-in |
| `RUN_BUILD_TESTS=1 tsx --test tests/authors-page-render-guard.test.ts` | **1/1 pass** (56s including build) |
| `dist/{lang}/about/authors/reviewer-founder/index.html` exists | ✓ both langs |
| JSON-LD Person + hreflang × 2 + canonical all present in dist HTML | ✓ |

---

## What was deliberately NOT done (out of scope)

- **No `ReviewerCard.astro` component extraction** — YAGNI: only 2 places render reviewer data today (about card + bio page).
- **No `src/data/authors.ts` split** — DRY violation; `REVIEWERS` already lives in `editorial.ts` with the `reviewerForCategory()` consumer.
- **No new `ReviewerPersona` fields** — Approach A constraint; existing fields sufficient.
- **No per-tool reviewer attribution** — separate P-series if needed.
- **No reviewer photos / avatars** — P140c chose transparency over fabrication; no fake photos.
- **No blog post author attribution** — blog system doesn't carry author slug yet.

---

## What was deliberately NOT changed

- Engine count (locked at 100)
- Reviewer count (still 1, no new personas — user decision per P140c)
- About page sections other than reviewer card link addition
- `src/data/editorial.ts` (Approach A constraint)

---

## Defense-in-depth status

| Guard | Status |
|---|---|
| a11y-guard (P95) | unchanged — bio page uses `<h1>` + `<h2>` hierarchy + lang-aware content |
| i18n page-level (P62-P83) | new page renders both langs, no CJK in en pages |
| dead-i18n-keys-guard (P103) | 6 new keys have consumers (used in T2 page + T3 about modify) |
| SEO hreflang × 2 | new page emits 2 hreflang tags via BaseLayout |
| SEO canonical | new page emits canonical via BaseLayout |
| SEO json-ld | new page emits Person schema |
| Performance size triad (P96/P106/P107/P108) | new page is text-only, well under limits |
| Build-dep (47 suites + this new = 48) | +1 suite, no regressions |

---

## Files touched

| File | Change | Commit |
|---|---|---|
| `docs/superpowers/specs/2026-08-18-p140g-author-bio-pages-design.md` | NEW (220 lines) | 7a31d24 |
| `docs/superpowers/plans/2026-08-18-p140g-author-bio-pages.md` | NEW (582 lines) | 690e59c |
| `src/i18n/translations.ts` | +8 | 16e685b (T1) |
| `src/pages/[lang]/about/authors/[slug].astro` | NEW (98 lines) | 8d9ee70 (T2) |
| `src/pages/[lang]/about.astro` | +6 | db3788f (T3) |
| `tests/authors-page-render-guard.test.ts` | NEW (76 lines) | 09397e1 (T4) |
| `memory/p140g-author-bio-pages-shipped.md` | NEW | T5 (this batch) |
| `memory/MEMORY.md` | +1 index line | T5 (this batch) |
| `docs/superpowers/plans/INDEX.md` | +1 row + line 6 update | T5 (this batch) |

---

## Related

- [[p140c-eeat-completion-shipped]] — closed scope (line 529 now resolved; this closes the last out-of-scope item from that batch)
- [[p140d-t8-zh-coverage-guard-shipped]] — sister P140d batch
- [[p140d-tier-threshold-tightening-shipped]] — earlier E-E-A-T infrastructure
- [[p140e-index-changelog-catchup-shipped]] — preceding doc catch-up
- [[p140f-v2-strategy-design]] — APPROVED Path C deferred to v2.0
- [[p146-p145-followup-shipped]] — last build-dep batch