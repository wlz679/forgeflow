# Plan 1/3: JSON-LD Schema Factory Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the 3 inline schema.org blocks (FAQPage / SoftwareApplication / BreadcrumbList) from `src/pages/[lang]/[slug].astro` into 3 new helpers in `src/lib/seo-factory.ts`, reducing inline JSON.stringify from ~50 lines to ~10 lines while preserving byte-equivalent output for all 32 tool pages.

**Architecture:** Pure refactor. Add 3 interfaces + 3 functions to `seo-factory.ts` (alongside the existing 3 helpers for category pages). Refactor `[slug].astro` to call them. All output must be byte-equivalent to current — verified by existing `tests/seo-schemas.test.ts` (4 tests, no changes) + manual byte-diff.

**Tech Stack:** Astro 4.16 static SSG · TypeScript 5.6 strict · Node 20+ · node:test (tsx runner) · Tailwind 4

**Task classification:** `[MECHANICAL]` × 2 — 1 spec reviewer per task (no separate code-quality review; spec is the contract).

**Predecessor spec:** `docs/superpowers/specs/2026-06-27-p1-schema-factory-design.md` (commit `1e317c9`)

---

## File Structure

| File | Operation | Purpose |
|---|---|---|
| `src/lib/seo-factory.ts` | Modify | Add 3 interfaces + 3 functions (~75 new lines, 0 changes to existing 3) |
| `src/pages/[lang]/[slug].astro` | Modify | Replace lines 91-135 (50 lines inline) with ~10 lines (3 helper calls + wrap) |
| `tests/seo-schemas.test.ts` | NO change | 4 existing tests must still pass byte-equivalent |

**No new files. No new tests required (existing 4 tests are the safety net).**

---

## Global Constraints

- **Branch:** `v2_20260626` (do NOT switch to or merge with `master`)
- **Forbidden files:** `src/engines/` · `src/data/` (including `blog-posts.ts` and `tools/*.ts`) · `astro.config.mjs` · `src/components/Category*` · `src/components/Header.astro` — any of these in a diff = blocker
- **Quality gate:** `pnpm check` must exit 0 before each commit
- **Build target:** 153 pages must remain
- **No master merge.** Push to `origin` (gitee/calcKit) + `github` (wlz679/forgeflow) only
- **Byte-equivalent:** the 3 new helpers must produce output **identical** to the current inline. Verified by `tests/seo-schemas.test.ts` (4/4 pass) + manual byte-diff of 32 tool page × 2 lang = 64 dist HTML files
- **Style:** 2-space indent, single quotes, trailing commas, match existing file style

---

## Pre-flight findings (CRITICAL — read before starting)

### Drift #1: `createBreadcrumb3` already exists for category pages

`src/lib/seo-factory.ts:63-89` already exports `createBreadcrumb3()` — a 3-item BreadcrumbList (Home > Category > Current Page). The spec's "new helper `createToolBreadcrumbList`" overlaps with this.

**Resolution:** The tool-page breadcrumb uses `Astro.site?.toString() || '/'` for the Home item's `item` value (line 124 in `[slug].astro`). The existing `createBreadcrumb3` uses `${SITE_URL}/${lang}/` (a hardcoded URL string, not Astro.site). These produce **different** `item` strings in the JSON-LD.

**Therefore the new `createToolBreadcrumbList` must accept `homeItem: string` as a parameter** (not a lang+slug combo like `createBreadcrumb3`). The caller (`[slug].astro`) passes `Astro.site?.toString() || '/'`. This preserves byte-equivalent output.

### Drift #2: `createCollectionPage` already has `'@context'`

The existing helper emits `'@context': 'https://schema.org'` at the top level. The new helpers (`createSoftwareApplication`, `createToolFAQPage`) should NOT emit `'@context'` (they're blocks inside a `@graph`). Only `createToolBreadcrumbList` will emit `'@context'` because BreadcrumbList is a top-level schema.org type that the original inline also declared with `@context`.

**This matches the current inline**: the existing `[slug].astro:92` wraps everything in `JSON.stringify({ '@context': '...', '@graph': [...] })`. Each block inside `@graph` is a single schema object. So the new helpers should return objects **without** `'@context'` (since they'll be inside `@graph`), and the caller adds the single `@context` at the JSON.stringify level. **Exception:** the inline `BreadcrumbList` block does NOT have its own `@context` either — only the outer wrapper has it. So `createToolBreadcrumbList` returns an object without `@context`. Same for the other two helpers.

### Drift #3: `@graph` array ordering

Current inline emits blocks in order: `FAQPage` → `SoftwareApplication` → `BreadcrumbList`. The refactored version must preserve this exact order in the `@graph` array.

---

## Task 1: Add 3 new helpers to `src/lib/seo-factory.ts`

**Files:**
- Modify: `src/lib/seo-factory.ts` (append 3 interfaces + 3 functions after line 89; do NOT modify existing 89 lines)

- [ ] **Step 1.1: Read current file end to confirm insertion point**

Run: `tail -5 src/lib/seo-factory.ts`
Expected: closing `}` of `createBreadcrumb3` at line 89, followed by a final newline.

- [ ] **Step 1.2: Append the 3 interfaces and 3 functions**

Add this code at the end of `src/lib/seo-factory.ts` (after the existing `createBreadcrumb3` function, after line 89):

```ts

// =====================================================================
// Tool-page schema helpers (added 2026-06-27, Plan 1/3 of P1 series)
// See spec: docs/superpowers/specs/2026-06-27-p1-schema-factory-design.md
// These 3 helpers are used by src/pages/[lang]/[slug].astro (32 tool pages
// rendered via 1 dynamic route). Output is byte-equivalent to the previous
// inline JSON.stringify block in [slug].astro lines 91-135.
// =====================================================================

export interface SoftwareApplicationInput {
  lang: 'en' | 'zh';
  toolTitle: string;
  toolDescription: string;
  toolSlug: string;             // for url + @id
  applicationCategory: string;  // from toolMeta.applicationCategory
  featureList: string[];        // 3 items from translatedHowToUse
  author: string;
  reviewedBy: string;
  dataReviewedAt: string;       // YYYY-MM-DD format
}

export function createSoftwareApplication(input: SoftwareApplicationInput) {
  const { lang, toolTitle, toolDescription, toolSlug, applicationCategory, featureList, author, reviewedBy, dataReviewedAt } = input;
  const url = `${SITE_URL}/${lang}/${toolSlug}/`;
  return {
    '@type': 'SoftwareApplication',
    '@id': `${url}#app`,
    name: toolTitle,
    applicationCategory,
    operatingSystem: 'Web',
    description: toolDescription,
    url,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    featureList,
    isAccessibleForFree: true,
    inLanguage: lang,
    provider: { '@id': `${SITE_URL}/#org` },
    author: { '@id': `${SITE_URL}/#org` },
    dateModified: dataReviewedAt,
    reviewedBy: { '@type': 'Organization', name: reviewedBy },
    publisher: { '@id': `${SITE_URL}/#org` },
  };
}

export interface FAQPageInput {
  faqItems: { q: string; a: string }[];
}

export function createToolFAQPage(input: FAQPageInput) {
  const { faqItems } = input;
  return {
    '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

export interface ToolBreadcrumbInput {
  lang: 'en' | 'zh';
  homeItem: string;             // caller passes Astro.site?.toString() || '/'
  homeLabel: string;            // typically t('breadcrumb.home', lang)
  categoryName: string;         // t('category.${id}.name', lang)
  categorySlug: string;         // e.g. 'saas-metrics'
  toolTitle: string;
  toolSlug: string;
}

export function createToolBreadcrumbList(input: ToolBreadcrumbInput) {
  const { lang, homeItem, homeLabel, categoryName, categorySlug, toolTitle, toolSlug } = input;
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: homeLabel, item: homeItem },
      {
        '@type': 'ListItem',
        position: 2,
        name: categoryName,
        item: `${SITE_URL}/${lang}/${categorySlug}/`,
      },
      { '@type': 'ListItem', position: 3, name: toolTitle, item: `${SITE_URL}/${lang}/${toolSlug}/` },
    ],
  };
}
```

- [ ] **Step 1.3: tsc verify**

Run: `pnpm exec tsc --noEmit 2>&1 | head -10`
Expected: 0 errors.

- [ ] **Step 1.4: Sanity check — no exports broke**

Run: `grep -nE "^export" src/lib/seo-factory.ts`
Expected: 6 exports (3 existing + 3 new):
- `export interface CollectionPageInput`
- `export interface ItemListInput`
- `export interface Breadcrumb3Input`
- `export interface SoftwareApplicationInput` (new)
- `export interface FAQPageInput` (new)
- `export interface ToolBreadcrumbInput` (new)
- `export function createCollectionPage`
- `export function createCategoryItemList`
- `export function createBreadcrumb3`
- `export function createSoftwareApplication` (new)
- `export function createToolFAQPage` (new)
- `export function createToolBreadcrumbList` (new)

(That's 12 total lines containing `export` — 6 interfaces + 6 functions, including the 3 new ones.)

- [ ] **Step 1.5: Build still passes (sanity)**

Run: `pnpm build 2>&1 | tail -3`
Expected: `Complete! 153 pages generated.`

- [ ] **Step 1.6: Tests still pass (sanity — the new helpers aren't called yet)**

Run: `node --import tsx tests/seo-schemas.test.ts 2>&1 | tail -8`
Expected: `# pass 4 / fail 0`

- [ ] **Step 1.7: Commit**

```bash
git add src/lib/seo-factory.ts
git commit -m "feat(lib): add 3 tool-page schema helpers (SoftwareApplication/FAQPage/BreadcrumbList)"
```

---

## Task 2: Refactor `[slug].astro` to use the 3 new helpers

**Files:**
- Modify: `src/pages/[lang]/[slug].astro` (replace lines 91-135 with 3 helper calls + wrap)

- [ ] **Step 2.1: Capture pre-refactor dist for byte-diff verification**

```bash
# Build first to ensure dist is up-to-date with current code
pnpm build 2>&1 | tail -3
# Save the JSON-LD output of 1 representative tool page
cp dist/en/solopreneur-mrr-calculator/index.html /tmp/before-slug-mrr.html
# Extract the schema.org JSON-LD blocks (3 <script type="application/ld+json"> blocks)
grep -oE '<script type="application/ld\+json">[^<]*</script>' /tmp/before-slug-mrr.html | head -1 > /tmp/before-block1.txt
grep -oE '<script type="application/ld\+json">[^<]*</script>' /tmp/before-slug-mrr.html | sed -n '2p' > /tmp/before-block2.txt
grep -oE '<script type="application/ld\+json">[^<]*</script>' /tmp/before-slug-mrr.html | sed -n '3p' > /tmp/before-block3.txt
```

(If `/tmp/` is not writable on Windows, use `./tmp/` and clean up after.)

- [ ] **Step 2.2: Read the existing import block in [slug].astro**

Run: `sed -n '1,30p' src/pages/\[lang\]/\[slug].astro`
Expected: the existing import of `createCollectionPage, createBreadcrumb3` from `../../lib/seo-factory` (added in Plan 3).

- [ ] **Step 2.3: Update the import to add the 3 new helpers**

Find the existing import:
```ts
import { createCollectionPage, createBreadcrumb3 } from '../../lib/seo-factory';
```

Replace with:
```ts
import { createCollectionPage, createBreadcrumb3, createSoftwareApplication, createToolFAQPage, createToolBreadcrumbList } from '../../lib/seo-factory';
```

- [ ] **Step 2.4: Replace the inline `schema = JSON.stringify({...})` block (lines 91-135)**

Find the entire block from `const schema = JSON.stringify({` through the closing `});` (line 135).

Replace with:

```ts
const categoryName = t(`category.${toolMeta.categoryId}.name`, lang);
const categorySlug = categories.find(c => c.id === toolMeta.categoryId)?.slug ?? '';
const homeItem = Astro.site?.toString() || '/';

const schema = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    createToolFAQPage({ faqItems: translatedFaq }),
    createSoftwareApplication({
      lang,
      toolTitle,
      toolDescription,
      toolSlug: slug,
      applicationCategory: toolMeta.applicationCategory,
      featureList,
      author: toolMeta.author,
      reviewedBy: toolMeta.reviewedBy,
      dataReviewedAt: toolMeta.dataReviewedAt,
    }),
    createToolBreadcrumbList({
      lang,
      homeItem,
      homeLabel: t('breadcrumb.home', lang),
      categoryName,
      categorySlug,
      toolTitle,
      toolSlug: slug,
    }),
  ],
});
```

- [ ] **Step 2.5: tsc verify**

Run: `pnpm exec tsc --noEmit 2>&1 | head -10`
Expected: 0 errors.

- [ ] **Step 2.6: Build**

Run: `pnpm build 2>&1 | tail -3`
Expected: `Complete! 153 pages generated.`

- [ ] **Step 2.7: Byte-diff verification — CRITICAL**

```bash
# Extract the 3 JSON-LD blocks from the new build
cp dist/en/solopreneur-mrr-calculator/index.html /tmp/after-slug-mrr.html
grep -oE '<script type="application/ld\+json">[^<]*</script>' /tmp/after-slug-mrr.html | head -1 > /tmp/after-block1.txt
grep -oE '<script type="application/ld\+json">[^<]*</script>' /tmp/after-slug-mrr.html | sed -n '2p' > /tmp/after-block2.txt
grep -oE '<script type="application/ld\+json">[^<]*</script>' /tmp/after-slug-mrr.html | sed -n '3p' > /tmp/after-block3.txt

# Compare each block
diff /tmp/before-block1.txt /tmp/after-block1.txt
diff /tmp/before-block2.txt /tmp/after-block2.txt
diff /tmp/before-block3.txt /tmp/after-block3.txt
```

Expected: **no diff output** for any of the 3 blocks (byte-equivalent).

If diff shows changes, **STOP and report** — the helper output shape doesn't match inline.

(Also verify with another tool page, e.g. `solopreneur-burn-rate-calculator` — same byte-equivalent expectation.)

- [ ] **Step 2.8: Full test suite**

Run: `node --import tsx tests/seo-schemas.test.ts 2>&1 | tail -8`
Expected: `# pass 4 / fail 0`

Run: `node --import tsx tests/classify-url.test.ts 2>&1 | tail -8`
Expected: `# pass 12 / fail 0`

- [ ] **Step 2.9: Cleanup tmp files**

```bash
rm -f /tmp/before-*.txt /tmp/after-*.txt /tmp/before-slug-*.html /tmp/after-slug-*.html
# Or on Windows: del /tmp/before-*.txt etc.
```

(Only if you created files in `/tmp/`.)

- [ ] **Step 2.10: Commit**

```bash
git add src/pages/\[lang\]/\[slug].astro
git commit -m "refactor(slug): use 3 new schema factory helpers (50 lines → 10 lines, byte-equivalent)"
```

---

## Final Acceptance Checklist

- [ ] `pnpm check` exit 0
- [ ] `pnpm build` 153 pages
- [ ] `tests/seo-schemas.test.ts` 4/4 pass
- [ ] `tests/classify-url.test.ts` 12/12 pass
- [ ] Byte-equivalent: 3 JSON-LD blocks in 1+ tool page dist HTML identical to pre-refactor
- [ ] `git diff src/engines/ src/data/ src/data/blog-posts.ts src/data/tools/ astro.config.mjs` empty
- [ ] `src/lib/seo-factory.ts` exports 6 functions (3 existing + 3 new) and 6 interfaces
- [ ] `src/pages/[lang]/[slug].astro` schema block reduced from ~50 lines inline to ~10 lines (3 helper calls + wrap)
- [ ] 2 commits on `v2_20260626`
- [ ] Pushed to `origin` (gitee/calcKit) and `github` (wlz679/forgeflow)
- [ ] `master` branch NOT touched

## Rollback

```bash
git revert <plan1-first-sha>..<plan1-last-sha>  # 2 commits
```

Restores:
- `src/lib/seo-factory.ts` to 3-helper version
- `[slug].astro` to inline 50-line JSON.stringify block

## Notes for Implementer

- **Read the pre-flight findings section above FIRST** — there are 3 spec drifts you must respect:
  1. `createToolBreadcrumbList` takes `homeItem: string` (not lang+slug combo) because the existing inline uses `Astro.site?.toString() || '/'` which differs from `createBreadcrumb3`'s hardcoded URL
  2. None of the 3 new helpers emit `'@context'` at the top level — only the outer `JSON.stringify` wrapper does (current inline confirms this)
  3. `@graph` array order: FAQPage → SoftwareApplication → BreadcrumbList (must preserve)
- **Task 1 and Task 2 are sequenced**: Task 1 adds the helpers, Task 2 uses them. Don't try to combine — keeps the diff easy to review.
- **Byte-equivalent verification (Step 2.7) is the safety net** — if it shows any diff, the helper shape is wrong. Don't proceed.
- **The `??` fallback for `categorySlug`** in Task 2.4 is a defensive belt — in practice `categories.find(...)` always returns a value because all 32 tools have a valid A-F categoryId. But TypeScript's `find()` returns `T | undefined`, so the `??` satisfies the type checker.
- **Don't push to master** — only to `v2_20260626` on both remotes, per user explicit constraint.
- **The Plan 4 follow-up fix** (JSON-LD author uses `@id: 'https://forgeflowkit.com/#org'`) must be preserved in the new `createSoftwareApplication` helper. The helper code above already does this (line 38 in the new code: `author: { '@id': \`${SITE_URL}/#org\` }`).
