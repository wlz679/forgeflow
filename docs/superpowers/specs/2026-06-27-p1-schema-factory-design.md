# Spec 1/3: JSON-LD Schema Factory Unification

**Date:** 2026-06-27
**Status:** Draft
**Plan:** 1 of 3 in P1 series (Schema Factory → Blog Markdown → Engine Factory)

## Context

`src/pages/[lang]/[slug].astro` is the single dynamic route that renders all 32 tool pages (it has `getStaticPaths` returning all 32 tool slugs × 2 langs). Its frontmatter contains a 50-line `JSON.stringify({...})` call that builds 3 schema.org blocks inline:

1. **FAQPage** (~9 lines) — `mainEntity` array of `Question`/`Answer` pairs from translated FAQ strings
2. **SoftwareApplication** (~22 lines) — `applicationCategory`, `offers`, `featureList`, `author`, `dateModified`, `reviewedBy`, `publisher`, `provider` etc.
3. **BreadcrumbList** (~13 lines) — 3-item breadcrumb (Home > Category > Tool) added in Plan 3

Meanwhile, `src/lib/seo-factory.ts` already exists with 3 helpers (`createCollectionPage`, `createCategoryItemList`, `createBreadcrumb3`) used by the 6 category pages. The tool-page schema is the last major inline `JSON.stringify` block in the codebase.

## Goal

Move the 3 inline schema blocks in `[slug].astro` into `src/lib/seo-factory.ts` as 3 new helpers. After this change:

- `[slug].astro` schema block: ~50 lines inline → ~10 lines (3 helper calls + `@graph` wrap)
- `seo-factory.ts`: 3 helpers → 6 helpers (3 existing + 3 new)
- All 32 tool page dist HTML output: byte-for-byte equivalent (verified by existing `tests/seo-schemas.test.ts`)

## Architecture

Pure refactor. No semantic change, no new fields, no new schema types. The 3 new helpers:

1. `createSoftwareApplication(input: SoftwareApplicationInput)` — emits the SoftwareApplication block
2. `createToolFAQPage(input: FAQPageInput)` — emits the FAQPage block
3. `createToolBreadcrumbList(input: ToolBreadcrumbInput)` — emits the BreadcrumbList block (DIFFERENT signature from existing `createBreadcrumb3` because tool-page breadcrumb is 3-item with category layer)

**Reuse existing:** the new `createToolBreadcrumbList` does NOT replace `createBreadcrumb3` (which is used by category pages). Two helpers, similar shape, different consumers.

### File Structure

| File | Operation | Purpose |
|---|---|---|
| `src/lib/seo-factory.ts` | Modify | Add 3 interfaces + 3 functions (~80 new lines) |
| `src/pages/[lang]/[slug].astro` | Modify | Replace 50-line inline with 10-line 3-helper call (lines 91-135) |
| `tests/seo-schemas.test.ts` | NO change | 4 existing tests must pass byte-equivalent (4th test was added in Plan 3; verifies BreadcrumbList 3-layer structure) |

**No new files. No new tests required (existing tests are the safety net).**

## Interface Design

```ts
export interface SoftwareApplicationInput {
  lang: 'en' | 'zh';
  toolTitle: string;
  toolDescription: string;
  toolSlug: string;        // for url + @id
  applicationCategory: string;  // from toolMeta.applicationCategory
  featureList: string[];   // 3 items from translatedHowToUse
  author: string;
  reviewedBy: string;
  dataReviewedAt: string;  // YYYY-MM-DD format
}

export interface FAQPageInput {
  faqItems: { q: string; a: string }[];  // already translated
}

export interface ToolBreadcrumbInput {
  lang: 'en' | 'zh';
  homeLabel: string;
  categoryId: string;       // e.g. 'A'
  categorySlug: string;     // e.g. 'saas-metrics'
  toolTitle: string;
  toolSlug: string;
}
```

### Helper Signatures (output shape)

`createSoftwareApplication` returns the SoftwareApplication object:
```ts
{
  '@type': 'SoftwareApplication',
  '@id': `${SITE_URL}/${lang}/${toolSlug}/#app`,
  name, applicationCategory, operatingSystem: 'Web',
  description, url, offers: {...}, featureList,
  isAccessibleForFree: true, inLanguage: lang,
  provider: { '@id': `${SITE_URL}/#org` },
  author: { '@id': `${SITE_URL}/#org` },
  dateModified, reviewedBy: {...}, publisher: { '@id': `${SITE_URL}/#org` },
}
```

`createToolFAQPage` returns the FAQPage object:
```ts
{
  '@type': 'FAQPage',
  mainEntity: faqItems.map(item => ({
    '@type': 'Question', name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
}
```

`createToolBreadcrumbList` returns the BreadcrumbList object:
```ts
{
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { position: 1, name: homeLabel, item: Astro.site?.... },   // ⚠️ see Error Handling
    { position: 2, name: categoryName, item: `${SITE_URL}/${lang}/${categorySlug}/` },
    { position: 3, name: toolTitle, item: `${SITE_URL}/${lang}/${toolSlug}/` },
  ],
}
```

## Error Handling

- `createToolBreadcrumbList` does NOT have access to `Astro.site` (it's a pure function in a lib file). The existing inline uses `Astro.site?.toString() || '/'` for the Home item.
- **Resolution:** accept `homeItem: string` as a parameter, with the caller (`[slug].astro`) passing `Astro.site?.toString() || '/'`. The interface above should add `homeItem: string`.
- All other fields are required strings (no optional chaining needed at the helper level).

## Testing

- **Existing tests are the safety net:** `tests/seo-schemas.test.ts` already has 4 tests that verify:
  1. 32 tool pages emit SoftwareApplication with author/dateModified/reviewedBy
  2. author is uniform ForgeFlowKit across 32 tools (data-level)
  3. 6 category pages emit CollectionPage with ItemList
  4. 32 tool pages breadcrumb has 3 items
- **No new tests required.** After the refactor, run `node --import tsx tests/seo-schemas.test.ts` → must still show 4/4 pass.
- **Build verification:** `pnpm build` → 153 pages, no warnings introduced.
- **Byte-equivalent check (optional, recommended):** capture `[slug].astro` schema output before and after refactor, diff them. Should be empty diff for 32 tool pages × 2 langs = 64 pages. (Implementation: save the build output once, do the refactor, build again, diff.)

## Acceptance Criteria

- [ ] `pnpm check` exit 0
- [ ] `pnpm build` 153 pages
- [ ] `node --import tsx tests/seo-schemas.test.ts` 4/4 pass
- [ ] `git diff src/engines/ src/data/ astro.config.mjs` empty
- [ ] `src/lib/seo-factory.ts` exports 6 functions (3 existing + 3 new), no other changes to that file's API
- [ ] `src/pages/[lang]/[slug].astro` lines 91-135 reduced from ~50 lines inline to ~10 lines (3 helper calls + JSON.stringify wrap)
- [ ] Plan 1 follow-up fix from Plan 4 (Task 1: author @id reference) preserved — all 3 `@id` references still point to `https://forgeflowkit.com/#org`

## Out of Scope

- Adding NEW schema fields (e.g., `aggregateRating`, `screenshot`, `video`) — would be a separate spec
- Refactoring the 6 category pages to use the new helpers (they already use the 3 existing ones correctly)
- Changing the `SoftwareApplication` shape (e.g., removing `reviewedBy`, splitting into `WebApplication`)

## Risks

| Risk | Mitigation |
|---|---|
| Test 1 (`author['@id']`) breaks due to field ordering change | Test uses `assert.equal` on value only, not on order. Safe. |
| `Astro.site` undefined in production build | Caller passes the resolved value; helper is pure |
| `@graph` ordering changes (FAQPage first vs SoftwareApplication first) | Order preserved exactly as current inline |
| New helper has typo in field name (e.g., `featureList` vs `featureLists`) | Existing test 1 covers key fields; byte-equivalent diff catches typos |

## Rollback

```bash
git revert <spec1-first-sha>..<spec1-last-sha>  # 1 commit
```

Restores:
- `[slug].astro` to 50-line inline
- `seo-factory.ts` to 3-helper version (existing 3 unchanged)
