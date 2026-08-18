# P140g Author Bio Pages — Design Spec

> **Status:** APPROVED (2026-08-18, user approved Approach A — Minimal scope, single new route + about.astro micro-modify + 1 test)
> **Branch:** `feature/p140g-author-bio-pages`
> **Goal:** Add per-reviewer detail pages at `/{lang}/about/authors/{slug}/` extending P140c E-E-A-T's transparent single-founder disclosure. Currently 1 reviewer (王立柱); infrastructure must support N.
> **Out of scope (P140c deferred list item 529) closes here.**

---

## §1 Context

P140c-T1 explicitly chose **Option A — single real founder persona** (王立柱 / Wang Lizhu) over fabricated multi-persona, in response to AdSense E-E-A-T standards. The about page (line 137-172) has a `#our-reviewers` section rendering a card per reviewer with name + role + bio + credentials.

The user (P140c ship record §"Out of scope" line 529) flagged per-author bio pages as deferred. This spec ships that deferred item with **Minimal scope**:
- 1 new page route (i18n'd, lang × reviewer cartesian)
- ~1 line added to existing about reviewer card (link to full bio)
- 1 build-dep test for page render + hreflang + JSON-LD Person schema
- **No new data fields** — reuse existing `ReviewerPersona` (id/name/role/expertise/bio/credentials)

---

## §2 Architecture

### Data flow

```
src/data/editorial.ts (existing, no change)
  REVIEWERS: ReviewerPersona[]
    ↓ (loop in getStaticPaths)
src/pages/[lang]/about/authors/[slug].astro (NEW)
  - filters REVIEWERS by id (slug === id)
  - renders expanded bio + categories list + credentials
  - emits JSON-LD Person + hreflang + canonical
  - 404 if slug doesn't match (Astro default — page not generated)
    ↓
src/pages/[lang]/about.astro (line 151-161, MODIFY)
  - reviewer card appends "Read full bio →" link → /{lang}/about/authors/{r.id}/
    ↓
tests/authors-page-render-guard.test.ts (NEW, build-dep)
  - getStaticPaths parity: 2 langs × N reviewers
  - JSON-LD Person schema present + valid
  - hreflang x 2 + canonical present
  - all ReviewerPersona fields render (id/name/role/expertise/bio/credentials)
```

### Why no new components

P140c's reviewer card (about.astro line 151-161) renders the same 4 fields the bio page will render. A `ReviewerCard.astro` component would only have 2 consumers — that's **YAGNI premature abstraction**. If a 3rd consumer appears (e.g., per-tool footer attribution), we can extract then.

### Why no new data file

`REVIEWERS: ReviewerPersona[]` already lives in `editorial.ts` with the E-E-A-T trust block consumer (`reviewerForCategory()`). Splitting to `src/data/authors.ts` violates DRY without clear scope win.

---

## §3 Component Design

### 3.1 `src/pages/[lang]/about/authors/[slug].astro` (NEW)

**Static paths**: `{ lang: 'en' | 'zh' } × { slug: REVIEWERS[].id }` — today = **2 pages**.

**Page shape**:

```astro
---
import BaseLayout from '../../../../layouts/BaseLayout.astro';
import Header from '../../../../components/Header.astro';
import Footer from '../../../../components/Footer.astro';
import { REVIEWERS, EDITORIAL } from '../../../../data/editorial';
import { t, getLang } from '../../../../i18n';
import { SITE_URL } from '../../../../lib/site-config';
import { categories } from '../../../../data/categories';

export function getStaticPaths() {
  const paths: { params: { lang: string; slug: string }; props: { reviewer: ReviewerPersona } }[] = [];
  for (const lang of ['en', 'zh']) {
    for (const r of REVIEWERS) {
      paths.push({ params: { lang, slug: r.id }, props: { reviewer: r } });
    }
  }
  return paths;
}

const { lang, slug } = Astro.params;
const { reviewer } = Astro.props;
// Astro 4.x auto-404s when slug doesn't match a getStaticPaths entry (no explicit handler needed)

const title = `${reviewer.name} — ${t('about.title', lang)}`;
const description = reviewer.bio[lang as 'en' | 'zh'];
const canonical = `${SITE_URL}/${lang}/about/authors/${slug}/`;
// hreflang: en + zh + x-default
const personSchema = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': `${canonical}#person`,
  name: reviewer.name,
  jobTitle: reviewer.role,
  description: reviewer.bio.en,
  knowsAbout: reviewer.expertise,
  url: canonical,
  worksFor: { '@type': 'Organization', name: EDITORIAL.author },
});

// Filter categories to ones this reviewer is assigned to (currently all 15
// since single-founder model). Use reviewer.expertise as the lookup key.
const assignedCategories = categories.filter(c => reviewer.expertise.includes(c.name));
---
```

**Rendered sections** (3 H2 + header + back-link):

1. **Header** (h1 + subtitle): `name` (h1) + `role` (subtitle, plain text)
2. **Bio** (h2): expanded bio (~3× current about card length, ≥ 400 字 zh / ≥ 250 字 en — meets tier-3 prose thresholds)
3. **Credentials** (h2): bullet list of credentials with separator dots
4. **Categories covered** (h2): 15 categories as a grid (link to `/{lang}/{cat.slug}/`) — or fewer if reviewer doesn't cover all
5. **Back-link** (plain text, not h2): `← Back to About` → `/{lang}/about/#editorial-standards`

### 3.2 `src/pages/[lang]/about.astro` (MODIFY, ~3 lines added)

Add at end of reviewer card (after credentials line 158):

```astro
<a
  href={`/${lang}/about/authors/${r.id}/`}
  class="text-[#7C3AED] hover:underline text-sm font-medium mt-2 inline-block"
>
  {lang === 'zh' ? '阅读完整简介 →' : 'Read full bio →'}
</a>
```

### 3.3 `tests/authors-page-render-guard.test.ts` (NEW, build-dep)

Mirrors `tests/about-page-render-guard.test.ts` pattern if it exists; otherwise follows `tests/sources-quality-guard.test.ts` style.

**Tests**:

1. **`getStaticPaths() generates N langs × M reviewers`** — assert paths.length === 2 × REVIEWERS.length
2. **Page renders all required fields** — for each generated path, verify reviewer.name + bio[lang] + role + credentials all appear in HTML
3. **JSON-LD Person schema present** — grep `<script type="application/ld+json">` with `"@type":"Person"`
4. **hreflang tags present** — 2 tags (en + zh) + x-default + canonical
5. **404 behavior** — invalid slug returns Astro default 404 (skip if not testable in static build)

---

## §4 i18n Keys (NEW)

Add to `src/i18n/translations.ts`:

| Key | en | zh |
|---|---|---|
| `authors.page.title_suffix` | `{name} — About ForgeFlowKit` | `{name} — 关于 ForgeFlowKit` |
| `authors.section.bio` | `Background` | `背景` |
| `authors.section.credentials` | `Credentials` | `资质` |
| `authors.section.categories` | `Categories Reviewed` | `审核类别` |
| `authors.back_to_about` | `← Back to About` | `← 返回关于` |
| `authors.read_full_bio` | `Read full bio →` | `阅读完整简介 →` |

---

## §5 Quality bar

### Acceptance criteria

| Check | Target |
|---|---|
| `pnpm check` | 1244 / 0 / 0 (unchanged) |
| `RUN_BUILD_TESTS=1 pnpm test:build` | 1263 / 1263 / 0 (+1 test from authors-page-render-guard) |
| `pnpm build` | succeeds, generates 2 new static HTML pages (`/en/about/authors/reviewer-founder/` + `/zh/about/authors/reviewer-founder/`) |
| `git rev-list --left-right --count origin/master...master github/master...master` | 0 / 0 after 3-way push |
| Master commit count | 1066 → 1069 (3 atomic commits: T1 page + T2 about modify + T3 ship record) |

### Defense-in-depth gates this spec must satisfy

- **i18n (a11y + hreflang)**: `hreflang × 2 (sitemap + html)` guards pass — new page emits 2 hreflang tags
- **SEO**: canonical + og-meta + json-ld × 3 (presence + field + faqpage) — new page has canonical + og:title + JSON-LD Person
- **i18n page-level**: `category-en-cjk-guard` (P63) + `tool-zh-cjk-preservation` (P67b) — not directly applicable (not a tool/category page), but bio page must have lang-aware content (no English content leaked into zh)
- **Build-dep source guards**: 4 codegen + 4 i18n structural — unchanged
- **Performance size**: existing `page-size-guard` (200KB), `js-bundle-size-guard` (100KB), `css-bundle-size-guard` (60KB+5KB) — new page is text-only, well under limits

### What MUST NOT change

- Engine count (locked at 100)
- `src/data/editorial.ts` data shape (no new fields — Approach A constraint)
- Reviewer count (still 1, no new personas — user decision)
- about page sections other than reviewer card link addition

---

## §6 Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Adding 2 static pages increases build time slightly | Trivial — 2 text-only pages, ~1ms each |
| Future reviewer adds (if any) require manual `REVIEWERS` array push | Acceptable — explicit > implicit; matches P140c decision |
| hreflang x-default convention varies (en vs zh) | Use `en` as x-default per existing site convention (check BaseLayout) |
| Bio content may feel thin with 1 reviewer + Minimal scope | Acceptable — user explicitly chose Minimal; P140c about-page card already has full bio. Bio page is expansion (×3) + categories grid. |

---

## §7 Out of scope

- Per-tool reviewer attribution (footer / sidebar) — separate P-series
- Author photos / avatars — P140c chose transparency over fabrication; no fake photos
- Author blog post byline attribution — blog system doesn't yet carry author slug
- Reviewer co-signing workflow (multi-reviewer per category) — deferred per P140c about-page future-expansion note (2027 plan)

---

## §8 Tasks (for plan)

1. **T1**: Create `src/pages/[lang]/about/authors/[slug].astro` with getStaticPaths + 5 H2 sections + JSON-LD Person + hreflang + canonical
2. **T2**: Add 6 i18n keys to `src/i18n/translations.ts`
3. **T3**: Modify `src/pages/[lang]/about.astro` line 151-161 to add "Read full bio →" link
4. **T4**: Create `tests/authors-page-render-guard.test.ts` (5 tests)
5. **T5**: Ship record (`memory/p140g-author-bio-pages-shipped.md`) + MEMORY index + plans/INDEX + 3-way push
6. **T6 (optional)**: holistic cross-cutting review (fable)

---

**How to apply:** Use this spec as source of truth when writing the implementation plan. Approval gate: user review of this spec before plan writes.