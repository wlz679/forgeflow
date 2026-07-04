# SEO Schema & Sitemap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add site-level + page-level structured data (schema.org) to all ForgeFlowKit pages, tier the sitemap priority by page type, and fix `og:type` per page type. Zero engine/business-logic changes.

**Architecture:** Schema is constructed at the page layer (existing pattern), passed through a new `schema` slot on `BaseLayout.astro` (already exists for tool pages) and merged with a site-level `WebSite` + `SearchAction` schema block injected automatically by `BaseLayout`. Sitemap uses a `serialize()` callback in `astro.config.mjs` to tier priority by URL pattern.

**Tech Stack:** Astro 4.16, TypeScript 5.6, `@astrojs/sitemap` 3.2.1, `node:test` (built-in, no deps).

**Scope:**
- 32 tools × 2 lang = 64 tool pages (extend existing schema)
- 32 blog posts × 2 lang = 64 blog pages (NEW Article schema)
- 2 blog index pages (NEW Blog schema)
- 4 static pages × 2 lang = 8 pages (NEW page-specific schema)
- 2 home pages (NEW Organization + ItemList schema)
- 1 sitemap config (tiered priority)
- 1 privacy-policy cleanup (old email)

**Out of scope (per design doc):** blog visual redesign, off-page SEO, page speed, AI crawler blocking, IndexNow, AMP/PWA, hreflang changes, engine logic.

**Pre-flight note (drift from design doc):** Design stated `src/pages/blog/` doesn't exist. It does — at `src/pages/[lang]/blog/`. User confirmed full scope expansion: blog Article schema + index Blog schema in this plan. Design doc will be updated in the last task.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/data/application-categories.ts` | **NEW** | Pure helper: `categoryIdToApplicationCategory(id)` |
| `src/data/tools.ts` | Modify | Add `applicationCategory` field to `ToolMeta`; populate for all 32 tools |
| `src/layouts/BaseLayout.astro` | Modify | Accept `pageType` prop; inject site-level `WebSite + SearchAction`; tier `og:type`; inject `Organization` on home |
| `src/pages/[lang]/[slug].astro` | Modify | Extend `SoftwareApplication` block with `@id`, real `applicationCategory`, `offers`, `featureList`, `isAccessibleForFree`, `provider`; pass `pageType='tool'` |
| `src/pages/[lang]/index.astro` | Modify | Build `Organization + ItemList(32 tools)` schema; pass `pageType='home'` |
| `src/pages/[lang]/about.astro` | Modify | Add `AboutPage` schema; pass `pageType='static'` |
| `src/pages/[lang]/contact.astro` | Modify | Add `ContactPage` schema; pass `pageType='static'` |
| `src/pages/[lang]/privacy-policy.astro` | Modify | Add `WebPage` schema; pass `pageType='static'`; **fix old `hello@solopreneurtools.com` → `hello@forgeflowkit.com`** |
| `src/pages/[lang]/terms.astro` | Modify | Add `WebPage` schema; pass `pageType='static'` |
| `src/pages/[lang]/blog/[slug].astro` | Modify | Add `Article` schema (headline, datePublished, author, publisher); pass `pageType='article'` |
| `src/pages/[lang]/blog/index.astro` | Modify | Add `Blog` schema; pass `pageType='static'` |
| `astro.config.mjs` | Modify | Add `serialize(item)` to tier priority/changefreq by URL pattern |
| `public/og-default.png` | **NEW** | 1×1 transparent PNG placeholder (BaseLayout default ogImage until Plan B ships real images) |
| `scripts/classify-url.ts` | **NEW** | Pure helper: `classifyUrl(url) → { kind: 'home'\|'tool'\|'blog'\|'static', priority, changefreq }` (extracted from sitemap serializer for testability) |
| `tests/sitemap.test.ts` | **NEW** | `node:test` cases for `classifyUrl` |
| `tests/application-categories.test.ts` | **NEW** | `node:test` cases for `categoryIdToApplicationCategory` |
| `tests/run.mjs` | **NEW** | Tiny test runner wrapper that invokes `node --test tests/**/*.test.ts` (no new dep) |
| `package.json` | Modify | Add `"test:unit": "node --test tests/*.test.ts"` |
| `docs/superpowers/specs/2026-06-25-seo-overhaul.md` | Modify | Correct blog-existence drift; note scope expansion |

**Not touched:** `src/engines/*.ts` (32 engines), `src/i18n/translations.ts` (no new keys needed).

---

## Task 1: Add unit-test runner

**Files:**
- Create: `tests/run.mjs`
- Create: `tests/smoke.test.ts`
- Modify: `package.json`

Project has no test framework today. Use `node:test` (built into Node ≥18; project requires `^20.19.0 || >=22.13.0`).

- [ ] **Step 1: Create `tests/run.mjs`**

```js
// Tiny wrapper to run all *.test.ts files via tsx.
// tsx is already a devDep (used by translate-wordpools).
import { spawnSync } from 'node:child_process';
import { globSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const tests = globSync('tests/*.test.ts', { cwd: root });
if (!tests.length) {
  console.error('No tests found in tests/');
  process.exit(1);
}
const r = spawnSync('node', ['--import', 'tsx/esm', '--test', ...tests], {
  cwd: root,
  stdio: 'inherit',
});
process.exit(r.status ?? 1);
```

Note: `node --test` natively supports `.ts` via `--import tsx/esm` since Node 22. Confirmed compatible with project's `^20.19.0 || >=22.13.0` because the engine field accepts both — if a CI runner happens to be on Node 20, use the existing `tsx` devDep directly. Use `node --import tsx --test tests/*.test.ts` fallback: replace with `tsx --test tests/*.test.ts` (works on both Node 20 and 22).

- [ ] **Step 2: Update `tests/run.mjs` to use `tsx` directly for max compat**

```js
import { spawnSync } from 'node:child_process';
import { globSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const tests = globSync('tests/*.test.ts', { cwd: root });
if (!tests.length) {
  console.error('No tests found in tests/');
  process.exit(1);
}
const r = spawnSync('npx', ['tsx', '--test', ...tests], {
  cwd: root,
  stdio: 'inherit',
});
process.exit(r.status ?? 1);
```

- [ ] **Step 3: Create `tests/smoke.test.ts` (sanity test, will be deleted at end of plan)**

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';

test('node:test runner works', () => {
  assert.equal(1 + 1, 2);
});
```

- [ ] **Step 4: Add `test:unit` script to `package.json`**

In the `scripts` block, add:
```json
"test:unit": "node tests/run.mjs"
```

- [ ] **Step 5: Run the smoke test**

Run: `pnpm test:unit`
Expected: `tests 1`, `pass 1`, `fail 0`. Exit 0.

- [ ] **Step 6: Commit**

```bash
git add tests/run.mjs tests/smoke.test.ts package.json
git commit -m "chore(tests): add node:test runner for SEO unit tests"
```

---

## Task 2: `application-categories` helper (TDD)

**Files:**
- Create: `src/data/application-categories.ts`
- Create: `tests/application-categories.test.ts`

Maps each `ToolMeta.categoryId` (A–F) to a schema.org `applicationCategory` value. From the design (section 4.3.2):

| categoryId | applicationCategory |
|---|---|
| A | `BusinessApplication` |
| B | `DeveloperApplication` |
| C | `FinanceApplication` |
| D | `BusinessApplication` |
| E | `BusinessApplication` |
| F | `FinanceApplication` |

- [ ] **Step 1: Write failing test `tests/application-categories.test.ts`**

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { categoryIdToApplicationCategory, CATEGORY_TO_APPLICATION } from '../src/data/application-categories.ts';

test('all 6 categories mapped', () => {
  assert.equal(Object.keys(CATEGORY_TO_APPLICATION).length, 6);
});

test('A SaaS Metrics → BusinessApplication', () => {
  assert.equal(categoryIdToApplicationCategory('A'), 'BusinessApplication');
});

test('B AI Cost Tools → DeveloperApplication', () => {
  assert.equal(categoryIdToApplicationCategory('B'), 'DeveloperApplication');
});

test('C Valuation & Exit → FinanceApplication', () => {
  assert.equal(categoryIdToApplicationCategory('C'), 'FinanceApplication');
});

test('D Freelance Pricing → BusinessApplication', () => {
  assert.equal(categoryIdToApplicationCategory('D'), 'BusinessApplication');
});

test('E Cost & Efficiency → BusinessApplication', () => {
  assert.equal(categoryIdToApplicationCategory('E'), 'BusinessApplication');
});

test('F Investment & ROI → FinanceApplication', () => {
  assert.equal(categoryIdToApplicationCategory('F'), 'FinanceApplication');
});

test('unknown categoryId falls back to BusinessApplication', () => {
  assert.equal(categoryIdToApplicationCategory('Z'), 'BusinessApplication');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit`
Expected: FAIL — "Cannot find module '../src/data/application-categories.ts'"

- [ ] **Step 3: Create `src/data/application-categories.ts`**

```ts
// Maps ToolMeta.categoryId (A-F) to schema.org applicationCategory value.
// Source: design doc §4.3.2. SaaS/finance tools get specific types;
// freelance/cost tools use the generic BusinessApplication.

export const CATEGORY_TO_APPLICATION: Record<string, string> = {
  A: 'BusinessApplication',   // SaaS Metrics
  B: 'DeveloperApplication',  // AI Cost Tools
  C: 'FinanceApplication',    // Valuation & Exit
  D: 'BusinessApplication',   // Freelance Pricing
  E: 'BusinessApplication',   // Cost & Efficiency
  F: 'FinanceApplication',    // Investment & ROI
};

export function categoryIdToApplicationCategory(id: string): string {
  return CATEGORY_TO_APPLICATION[id] ?? 'BusinessApplication';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit`
Expected: all `application-categories` tests pass; smoke test still passes.

- [ ] **Step 5: Commit**

```bash
git add src/data/application-categories.ts tests/application-categories.test.ts
git commit -m "feat(seo): add categoryIdToApplicationCategory helper"
```

---

## Task 3: Extend `ToolMeta` with `applicationCategory`

**Files:**
- Modify: `src/data/tools.ts:1-7` (interface) and each of 32 tool entries

Add an `applicationCategory` string field to the `ToolMeta` interface. Populate using the `categoryId`-based mapping. Each entry gets the value matching its `categoryId`.

- [ ] **Step 1: Update `ToolMeta` interface**

Replace the interface at `src/data/tools.ts:1-7`:

```ts
export interface ToolMeta {
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  inputs: { name: string; label: string; placeholder: string; type: 'text' | 'select' | 'number'; options?: string[] }[];
  applicationCategory: string;   // schema.org type (e.g. 'BusinessApplication')
}
```

- [ ] **Step 2: Add `applicationCategory` to every tool entry**

For each of the 32 tool entries, add the field after `categoryId`. Use the table below (derived from Task 2's mapping):

| Slug | categoryId | applicationCategory |
|---|---|---|
| `solopreneur-burn-rate-calculator` | A | `BusinessApplication` |
| `solopreneur-churn-rate-calculator` | A | `BusinessApplication` |
| `solopreneur-market-size-estimator` | A | `BusinessApplication` |
| `solopreneur-openai-token-calculator` | B | `DeveloperApplication` |
| `solopreneur-claude-api-cost-calculator` | B | `DeveloperApplication` |
| `solopreneur-deepseek-api-cost-calculator` | B | `DeveloperApplication` |
| `solopreneur-gemini-api-cost-calculator` | B | `DeveloperApplication` |
| `solopreneur-ai-image-cost-calculator` | B | `DeveloperApplication` |
| `solopreneur-ai-training-cost-estimator` | B | `DeveloperApplication` |
| `solopreneur-gpu-cloud-cost-calculator` | B | `DeveloperApplication` |
| `solopreneur-ai-api-cost-comparison` | B | `DeveloperApplication` |
| `solopreneur-unit-economics-calculator` | C | `FinanceApplication` |
| `solopreneur-cac-calculator` | C | `FinanceApplication` |
| `solopreneur-ltv-calculator` | C | `FinanceApplication` |
| `solopreneur-saas-valuation-calculator` | C | `FinanceApplication` |
| `solopreneur-break-even-calculator` | C | `FinanceApplication` |
| `solopreneur-equity-dilution-calculator` | C | `FinanceApplication` |
| `solopreneur-affiliate-income-calculator` | D | `BusinessApplication` |
| `solopreneur-course-pricing-calculator` | D | `BusinessApplication` |
| `solopreneur-email-list-revenue-calculator` | D | `BusinessApplication` |
| `solopreneur-freelance-rate-calculator` | D | `BusinessApplication` |
| `solopreneur-hourly-vs-fixed-calculator` | D | `BusinessApplication` |
| `solopreneur-mrr-calculator` | A | `BusinessApplication` |
| `solopreneur-project-profitability-calculator` | D | `BusinessApplication` |
| `solopreneur-revenue-projector` | A | `BusinessApplication` |
| `solopreneur-saas-pricing-planner` | E | `BusinessApplication` |
| `solopreneur-employee-cost-calculator` | E | `BusinessApplication` |
| `solopreneur-meeting-cost-calculator` | E | `BusinessApplication` |
| `solopreneur-productivity-score` | E | `BusinessApplication` |
| `solopreneur-freelance-tax-calculator` | F | `FinanceApplication` |
| `solopreneur-sponsorship-rate-calculator` | F | `FinanceApplication` |
| `solopreneur-time-value-calculator` | F | `FinanceApplication` |

Concrete edit pattern (each entry gets the field inserted after `categoryId`):

For example, `solopreneur-burn-rate-calculator` (lines 11-25), after `categoryId: 'A',` add:
```ts
    categoryId: 'A',
    applicationCategory: 'BusinessApplication',
    inputs: [
```

Apply to all 32 entries. To avoid copy-paste errors, the implementation should be verifiable via grep — see Step 3.

- [ ] **Step 3: Verify all 32 entries populated**

Run (POSIX shell — works on Git Bash):
```bash
grep -c "applicationCategory:" src/data/tools.ts
```
Expected: `32` (one per tool entry; the interface line itself doesn't count because of the space-after-colon style).

If count is not 32, search for `categoryId:` lines without `applicationCategory:` on the next line:
```bash
grep -B1 "categoryId:" src/data/tools.ts | grep -c "categoryId:"
```
This should equal 32. Then manually scan each `categoryId:` location to confirm `applicationCategory:` follows.

- [ ] **Step 4: Typecheck**

Run: `pnpm exec astro check`
Expected: 0 errors. The `applicationCategory` field is required on the interface; all 32 entries satisfy it.

- [ ] **Step 5: Commit**

```bash
git add src/data/tools.ts
git commit -m "feat(seo): add applicationCategory field to all 32 ToolMeta entries"
```

---

## Task 4: Site-level schema injection in `BaseLayout`

**Files:**
- Modify: `src/layouts/BaseLayout.astro`

Inject a site-level `WebSite + SearchAction` schema (and `Organization` on home) automatically. Accept `pageType` prop and tier `og:type`. Existing `schema` prop continues to pass through for page-specific schemas.

- [ ] **Step 1: Update `Props` interface and add page-type→og-type map**

Replace `src/layouts/BaseLayout.astro:5-11` with:

```ts
export interface Props {
  title: string;
  description: string;
  ogImage?: string;
  schema?: string;
  pageType?: 'home' | 'tool' | 'article' | 'static';
}
const { title, description, ogImage = '/og-default.png', schema, pageType = 'static' } = Astro.props;
const lang = getLang(Astro);

const ogType = { home: 'website', tool: 'product', article: 'article', static: 'website' }[pageType];

const SITE_URL = 'https://forgeflowkit.com';
const siteSchema = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'ForgeFlowKit',
      description: 'Free business calculators for solopreneurs and SaaS founders',
      inLanguage: ['en', 'zh'],
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/en/?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
});

const orgSchema = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#org`,
      name: 'ForgeFlowKit',
      url: SITE_URL,
      logo: `${SITE_URL}/favicon.svg`,
      sameAs: [],
    },
  ],
});
```

- [ ] **Step 2: Create `public/og-default.png` placeholder**

BaseLayout defaults `ogImage` to `/og-default.png` but the file does not exist (verified during pre-flight). Without this, every page has a 404 og:image until Plan B runs. Plan B will overwrite with per-tool images but the default is still needed for pages that don't get a per-page ogImage.

Generate a 1×1 transparent PNG via Node and write it:

Run:
```bash
node -e "
const fs = require('fs');
// 1x1 transparent PNG (89 bytes)
const png = Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D49444154789C636000000000050001A5F645400000000049454E44AE426082', 'hex');
fs.writeFileSync('public/og-default.png', png);
console.log('Wrote', png.length, 'bytes');
"
```
Expected: `Wrote 89 bytes`. Verify: `ls -lh public/og-default.png`.

- [ ] **Step 3: Render `og:type` from the lookup and inject both schema blocks**

Replace the `<head>` body in `src/layouts/BaseLayout.astro` (current lines 26-38). Specifically:

Change line 29 from:
```astro
<meta property="og:type" content="website" />
```
to:
```astro
<meta property="og:type" content={ogType} />
```

Replace line 38:
```astro
{schema && <script type="application/ld+json" set:html={schema} />}
```
with:
```astro
<script type="application/ld+json" set:html={siteSchema} />
{pageType === 'home' && <script type="application/ld+json" set:html={orgSchema} />}
{schema && <script type="application/ld+json" set:html={schema} />}
```

The order matters: site schema → org (if home) → page-specific schema. Each renders as its own `<script type="application/ld+json">` block; Google accepts multiple blocks on a page.

- [ ] **Step 4: Verify build still passes**

Run: `pnpm build`
Expected: 138 pages generated (or whatever the current count is — the layout change is additive). No errors.

- [ ] **Step 5: Spot-check a built page**

Run: `cat dist/en/mrr-calculator/index.html | head -50`
Expected: see `<script type="application/ld+json">` blocks containing `"@type":"WebSite"`, `"@type":"SoftwareApplication"` (still from old [slug].astro; will be enriched in next task), and `og:type content="product"`.

If `og:type content="website"` still appears, the page didn't pass `pageType` — task incomplete. (Page-level pages still pass `pageType='tool'` only after Task 5; this task verifies BaseLayout mechanics work by viewing the tool page which currently passes nothing — it will still get `static` default → `og:type=website`. That's expected at this stage; Task 5 makes it `product`.)

- [ ] **Step 6: Commit**

```bash
git add src/layouts/BaseLayout.astro public/og-default.png
git commit -m "feat(seo): inject site-level WebSite + SearchAction schema, tier og:type by pageType + add og:image placeholder"
```

---

## Task 5: Enrich `SoftwareApplication` schema in tool pages

**Files:**
- Modify: `src/pages/[lang]/[slug].astro:83-109` (schema block) and `:112` (BaseLayout call)

Extend the existing `@type: SoftwareApplication` block. Per design §4.3.5: add `@id`, real `applicationCategory`, `offers`, `featureList`, `isAccessibleForFree`, `inLanguage`, `provider`. Also pass `pageType='tool'`.

- [ ] **Step 1: Update schema construction in `[slug].astro`**

Replace the `const schema = JSON.stringify({...})` block at `src/pages/[lang]/[slug].astro:83-109`. Add imports first (top of frontmatter):

```ts
import { tools } from '../../data/tools';
import { categoryIdToApplicationCategory } from '../../data/application-categories';
```

(Wait — `tools` is already imported on line 13. Only the `application-categories` import is new.)

In the frontmatter (after line 81, where `translatedHowToUse` is built), add:

```ts
const toolMeta = tools.find(t => t.slug === slug)!;
const featureList = translatedHowToUse.slice(0, 3);
const url = `https://forgeflowkit.com/${lang}/${slug}/`;
```

Then replace the schema block:

```ts
const schema = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'FAQPage',
      mainEntity: translatedFaq.map(item => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${url}#app`,
      name: toolTitle,
      applicationCategory: toolMeta.applicationCategory,
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
      provider: { '@id': 'https://forgeflowkit.com/#org' },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: t('breadcrumb.home', lang), item: Astro.site?.toString() || '/' },
        { '@type': 'ListItem', position: 2, name: toolTitle },
      ],
    },
  ],
});
```

- [ ] **Step 2: Pass `pageType='tool'` to BaseLayout**

Replace line 112:

```astro
<BaseLayout title={metaTitle} description={toolDescription} schema={schema}>
```

with:

```astro
<BaseLayout title={metaTitle} description={toolDescription} schema={schema} pageType="tool">
```

- [ ] **Step 3: Build and spot-check**

Run: `pnpm build`
Expected: 0 errors.

Run: `cat dist/en/mrr-calculator/index.html | grep -A 25 'SoftwareApplication'`
Expected: see `@id`, `applicationCategory`, `offers`, `featureList`, `isAccessibleForFree`, `provider`, `inLanguage`. Also `og:type content="product"`.

- [ ] **Step 4: Verify all 32 tool pages have `applicationCategory` (sanity)**

Run:
```bash
for f in dist/en/*/index.html; do
  if ! grep -q '"applicationCategory"' "$f"; then echo "MISSING: $f"; fi
done
```
Expected: no output (all 32 pages have the field). Pages under `/en/about/` etc. don't have it — those aren't tool pages; the loop scopes to `dist/en/*/index.html` which catches all per-tool directories. If any tool page is missing it, debug before proceeding.

- [ ] **Step 5: Commit**

```bash
git add src/pages/\[lang\]/\[slug\].astro
git commit -m "feat(seo): enrich SoftwareApplication schema with category, offers, featureList, provider"
```

---

## Task 6: Home page schema (`Organization + ItemList`)

**Files:**
- Modify: `src/pages/[lang]/index.astro:27` (BaseLayout call) and add schema construction

- [ ] **Step 1: Add schema string construction before BaseLayout call**

After line 24 (`const translatedTools = ...`), add:

```ts
const SITE_URL = 'https://forgeflowkit.com';
const homeSchema = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'ItemList',
      name: 'ForgeFlowKit Business Calculators',
      itemListElement: translatedTools.map((tool, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: tool.title,
        url: `${SITE_URL}/${lang}/${tool.slug}/`,
      })),
    },
  ],
});
```

- [ ] **Step 2: Pass schema + pageType to BaseLayout**

Replace line 27:

```astro
<BaseLayout title={title} description={description}>
```

with:

```astro
<BaseLayout title={title} description={description} schema={homeSchema} pageType="home">
```

- [ ] **Step 3: Build and verify**

Run: `pnpm build`
Run: `cat dist/en/index.html | grep -A 5 'ItemList' | head -20`
Expected: see `@type: ItemList`, `itemListElement` with 32 entries.

Run: `cat dist/en/index.html | grep 'og:type'`
Expected: `og:type content="website"`.

Run: `cat dist/en/index.html | grep -c 'ListItem'`
Expected: 32 (one per tool).

- [ ] **Step 4: Commit**

```bash
git add src/pages/\[lang\]/index.astro
git commit -m "feat(seo): add ItemList(32 tools) schema to home, mark pageType=home"
```

---

## Task 7: Static page schemas (about, contact, privacy-policy, terms)

**Files:**
- Modify: `src/pages/[lang]/about.astro:16` (BaseLayout call) + add schema
- Modify: `src/pages/[lang]/contact.astro:16` + add schema
- Modify: `src/pages/[lang]/privacy-policy.astro:14` + add schema + fix old email
- Modify: `src/pages/[lang]/terms.astro:14` + add schema

Per design §4.3.6:

| Page | schema.org type | Notes |
|---|---|---|
| about | `AboutPage` | `isPartOf: #website` |
| contact | `ContactPage` | `publisher: #org` |
| privacy-policy | `WebPage` | `dateModified` |
| terms | `WebPage` | `dateModified` |

All get `pageType='static'`.

- [ ] **Step 1: `about.astro`**

In frontmatter, add:

```ts
const SITE_URL = 'https://forgeflowkit.com';
const aboutSchema = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'AboutPage',
      '@id': `${SITE_URL}/${lang}/about/#webpage`,
      url: `${SITE_URL}/${lang}/about/`,
      name: title,
      description,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      inLanguage: lang,
    },
  ],
});
```

Replace `<BaseLayout title={title} description={description}>` (line 16) with:

```astro
<BaseLayout title={title} description={description} schema={aboutSchema} pageType="static">
```

- [ ] **Step 2: `contact.astro`**

In frontmatter, add:

```ts
const SITE_URL = 'https://forgeflowkit.com';
const contactSchema = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'ContactPage',
      '@id': `${SITE_URL}/${lang}/contact/#webpage`,
      url: `${SITE_URL}/${lang}/contact/`,
      name: title,
      description,
      publisher: { '@id': `${SITE_URL}/#org` },
      inLanguage: lang,
    },
  ],
});
```

Replace `<BaseLayout title={title} description={description}>` (line 16) with:

```astro
<BaseLayout title={title} description={description} schema={contactSchema} pageType="static">
```

- [ ] **Step 3: `privacy-policy.astro`**

In frontmatter, add:

```ts
const SITE_URL = 'https://forgeflowkit.com';
const privacySchema = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/${lang}/privacy-policy/#webpage`,
      url: `${SITE_URL}/${lang}/privacy-policy/`,
      name: title,
      description,
      dateModified: '2026-01-01',
      inLanguage: lang,
    },
  ],
});
```

Replace `<BaseLayout title={title} description={description}>` (line 14) with:

```astro
<BaseLayout title={title} description={description} schema={privacySchema} pageType="static">
```

**Also fix the old email** in line 27: change `hello@solopreneurtools.com` → `hello@forgeflowkit.com`.

- [ ] **Step 4: `terms.astro`**

In frontmatter, add:

```ts
const SITE_URL = 'https://forgeflowkit.com';
const termsSchema = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/${lang}/terms/#webpage`,
      url: `${SITE_URL}/${lang}/terms/`,
      name: title,
      description,
      dateModified: '2026-01-01',
      inLanguage: lang,
    },
  ],
});
```

Replace `<BaseLayout title={title} description={description}>` (line 14) with:

```astro
<BaseLayout title={title} description={description} schema={termsSchema} pageType="static">
```

- [ ] **Step 5: Build + verify all 4 static pages × 2 langs = 8 pages**

Run: `pnpm build`
Expected: 0 errors.

Run:
```bash
for slug in about contact privacy-policy terms; do
  for lang in en zh; do
    file="dist/$lang/$slug/index.html"
    if [ ! -f "$file" ]; then echo "MISSING: $file"; continue; fi
    if ! grep -q '"@type"' "$file"; then echo "NO SCHEMA: $file"; fi
    if ! grep -q 'og:type content="website"' "$file"; then echo "WRONG og:type: $file"; fi
  done
done
```
Expected: no output. All 8 pages have schema and `og:type=website`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/\[lang\]/about.astro src/pages/\[lang\]/contact.astro \
        src/pages/\[lang\]/privacy-policy.astro src/pages/\[lang\]/terms.astro
git commit -m "feat(seo): add page-specific schema to about/contact/privacy/terms + fix privacy email"
```

---

## Task 8: Article schema on blog post pages

**Files:**
- Modify: `src/pages/[lang]/blog/[slug].astro:27` (BaseLayout call) + add schema construction

Per design (extended for blog after pre-flight drift): each of the 32 blog posts gets `Article` schema. The `BlogPost` data has `title`, `excerpt` (use as `description`), `toolName`, `toolSlug`. `datePublished` is the same for all posts (no per-post date field); use `2026-06-25` (today) as a fallback or generate per-post from post slug. Plan uses a single `datePublished` per post based on `post.slug` ordering — blog posts are ordered by `tools.map(...)`, so use array index to compute a fake date.

- [ ] **Step 1: Add schema construction in `blog/[slug].astro` frontmatter**

After line 23 (`const metaDescription = post.excerpt;`), add:

```ts
const SITE_URL = 'https://forgeflowkit.com';
// Blog posts are generated from tools.map(); assign synthetic dates so JSON-LD
// datePublished is present. Real publication dates are not tracked in blog-posts.ts.
const postIndex = blogPosts.findIndex(p => p.slug === post.slug);
const baseDate = new Date('2026-06-01');
const datePublished = new Date(baseDate.getTime() + postIndex * 86400000).toISOString().slice(0, 10);

const articleSchema = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      '@id': `${SITE_URL}/${lang}/blog/${post.slug}/#article`,
      headline: post.title,
      description: post.excerpt,
      url: `${SITE_URL}/${lang}/blog/${post.slug}/`,
      datePublished,
      inLanguage: lang,
      author: { '@type': 'Organization', name: 'ForgeFlowKit' },
      publisher: { '@id': `${SITE_URL}/#org` },
      isPartOf: { '@id': `${SITE_URL}/#website` },
    },
  ],
});
```

- [ ] **Step 2: Pass `schema` + `pageType='article'` to BaseLayout**

Replace line 27:

```astro
<BaseLayout title={metaTitle} description={metaDescription}>
```

with:

```astro
<BaseLayout title={metaTitle} description={metaDescription} schema={articleSchema} pageType="article">
```

- [ ] **Step 3: Build + verify**

Run: `pnpm build`
Expected: 0 errors.

Run:
```bash
for lang in en zh; do
  ls dist/$lang/blog/ | head -5
done
```
Expected: directory `best-solopreneur-mrr-calculator/`, etc.

Run: `cat dist/en/blog/best-solopreneur-mrr-calculator/index.html | grep -A 3 'Article'`
Expected: see `@type:Article`, `headline`, `datePublished`, `author`.

Run: `cat dist/en/blog/best-solopreneur-mrr-calculator/index.html | grep 'og:type'`
Expected: `og:type content="article"`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/\[lang\]/blog/\[slug\].astro
git commit -m "feat(seo): add Article schema to all 32 blog posts (64 pages)"
```

---

## Task 9: Blog index schema

**Files:**
- Modify: `src/pages/[lang]/blog/index.astro:18` (BaseLayout call) + add schema

The blog index page lists all posts; gets a `Blog` schema.

- [ ] **Step 1: Add schema construction**

After line 15 (`const description = t(...)`), add:

```ts
const SITE_URL = 'https://forgeflowkit.com';
const blogIndexSchema = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Blog',
      '@id': `${SITE_URL}/${lang}/blog/#blog`,
      url: `${SITE_URL}/${lang}/blog/`,
      name: title,
      description,
      inLanguage: lang,
      publisher: { '@id': `${SITE_URL}/#org` },
      blogPost: blogPosts.map(p => ({
        '@type': 'BlogPosting',
        headline: p.title,
        url: `${SITE_URL}/${lang}/blog/${p.slug}/`,
      })),
    },
  ],
});
```

- [ ] **Step 2: Pass to BaseLayout**

Replace line 18:

```astro
<BaseLayout title={title} description={description}>
```

with:

```astro
<BaseLayout title={title} description={description} schema={blogIndexSchema} pageType="static">
```

(Use `static` pageType because blog index is not an article — `og:type=website` is correct here.)

- [ ] **Step 3: Build + verify**

Run: `pnpm build`
Run: `cat dist/en/blog/index.html | grep -A 3 'Blog'`
Expected: see `@type:Blog`, `blogPost` array.

- [ ] **Step 4: Commit**

```bash
git add src/pages/\[lang\]/blog/index.astro
git commit -m "feat(seo): add Blog schema to blog index page"
```

---

## Task 10: Sitemap tiered priority (TDD on `classifyUrl`)

**Files:**
- Create: `scripts/classify-url.ts`
- Create: `tests/classify-url.test.ts`
- Modify: `astro.config.mjs` (sitemap `serialize`)

The `@astrojs/sitemap` config currently uses flat `changefreq: 'weekly', priority: 0.7`. Tier it by URL pattern.

- [ ] **Step 1: Write failing test `tests/classify-url.test.ts`**

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { classifyUrl } from '../scripts/classify-url.ts';

const SITE = 'https://forgeflowkit.com';

test('home page (en) gets priority 1.0 daily', () => {
  const c = classifyUrl(`${SITE}/en/`);
  assert.equal(c.kind, 'home');
  assert.equal(c.priority, 1.0);
  assert.equal(c.changefreq, 'daily');
});

test('home page (zh) gets priority 1.0 daily', () => {
  const c = classifyUrl(`${SITE}/zh/`);
  assert.equal(c.kind, 'home');
  assert.equal(c.priority, 1.0);
});

test('tool page gets priority 0.9 monthly', () => {
  const c = classifyUrl(`${SITE}/en/mrr-calculator/`);
  assert.equal(c.kind, 'tool');
  assert.equal(c.priority, 0.9);
  assert.equal(c.changefreq, 'monthly');
});

test('blog post gets priority 0.7 weekly', () => {
  const c = classifyUrl(`${SITE}/en/blog/best-mrr-calculator/`);
  assert.equal(c.kind, 'blog');
  assert.equal(c.priority, 0.7);
  assert.equal(c.changefreq, 'weekly');
});

test('blog index gets priority 0.7 weekly', () => {
  const c = classifyUrl(`${SITE}/en/blog/`);
  assert.equal(c.kind, 'blog');
  assert.equal(c.priority, 0.7);
});

test('about page gets priority 0.5 monthly', () => {
  const c = classifyUrl(`${SITE}/en/about/`);
  assert.equal(c.kind, 'static');
  assert.equal(c.priority, 0.5);
  assert.equal(c.changefreq, 'monthly');
});

test('contact page gets priority 0.5 monthly', () => {
  const c = classifyUrl(`${SITE}/en/contact/`);
  assert.equal(c.kind, 'static');
  assert.equal(c.priority, 0.5);
});

test('privacy-policy is static', () => {
  const c = classifyUrl(`${SITE}/en/privacy-policy/`);
  assert.equal(c.kind, 'static');
});

test('terms is static', () => {
  const c = classifyUrl(`${SITE}/en/terms/`);
  assert.equal(c.kind, 'static');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit`
Expected: FAIL — "Cannot find module '../scripts/classify-url.ts'"

- [ ] **Step 3: Create `scripts/classify-url.ts`**

```ts
// Pure URL classifier for sitemap serialization.
// Exported separately from astro.config.mjs so it's testable.

export type PageKind = 'home' | 'tool' | 'blog' | 'static';
export interface Classification {
  kind: PageKind;
  priority: number;
  changefreq: 'daily' | 'weekly' | 'monthly';
}

const STATIC_SLUGS = new Set(['about', 'contact', 'privacy-policy', 'terms']);

export function classifyUrl(url: string): Classification {
  // strip origin
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  // path is like '/en/foo/' or '/en/blog/foo/'

  // Home: /en/ or /zh/ exactly (with optional trailing slash)
  if (/^\/(en|zh)\/?$/.test(path)) {
    return { kind: 'home', priority: 1.0, changefreq: 'daily' };
  }

  // Blog: /<lang>/blog/ or /<lang>/blog/<post>/
  if (/^\/(en|zh)\/blog(\/|$)/.test(path)) {
    return { kind: 'blog', priority: 0.7, changefreq: 'weekly' };
  }

  // Static: /<lang>/<static-slug>/
  const staticMatch = path.match(/^\/(en|zh)\/([^/]+)\/?$/);
  if (staticMatch && STATIC_SLUGS.has(staticMatch[2])) {
    return { kind: 'static', priority: 0.5, changefreq: 'monthly' };
  }

  // Default: tool
  return { kind: 'tool', priority: 0.9, changefreq: 'monthly' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit`
Expected: all `classify-url` tests pass.

- [ ] **Step 5: Update `astro.config.mjs` to use `classifyUrl`**

Replace `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { classifyUrl } from './scripts/classify-url.ts';

export default defineConfig({
  site: 'https://forgeflowkit.com',
  integrations: [
    sitemap({
      entryLimit: 45000,
      serialize(item) {
        const c = classifyUrl(item.url);
        return { ...item, changefreq: c.changefreq, priority: c.priority };
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
```

- [ ] **Step 6: Build + verify sitemap output**

Run: `pnpm build`
Expected: build succeeds; `dist/sitemap-0.xml` is generated.

Run:
```bash
grep -oP '<loc>[^<]+</loc>\s*<changefreq>[^<]+' dist/sitemap-0.xml | head -20
```
Expected: home pages show `<changefreq>daily`, tool pages `<changefreq>monthly`, blog `<changefreq>weekly`, static `<changefreq>monthly`.

Run:
```bash
grep -oP '<loc>[^<]+</loc>\s*<priority>[^<]+' dist/sitemap-0.xml | head -20
```
Expected: home shows `1.0`, tools `0.9`, blog `0.7`, static `0.5`.

- [ ] **Step 7: Commit**

```bash
git add scripts/classify-url.ts tests/classify-url.test.ts astro.config.mjs
git commit -m "feat(seo): tier sitemap priority/changefreq by URL pattern (home/tool/blog/static)"
```

---

## Task 11: End-to-end validation

**Files:** none (validation only)

- [ ] **Step 1: Full clean build**

Run: `pnpm build`
Expected: 0 errors. Page count should be ≥138 (32 tools × 2 + 32 blog × 2 + 4 static × 2 + 2 home = 138; + sitemap/blog redirects may add a few).

- [ ] **Step 2: Run typecheck**

Run: `pnpm exec astro check`
Expected: 0 type errors.

- [ ] **Step 3: Run all unit tests**

Run: `pnpm test:unit`
Expected: all tests pass. Smoke test still passing (delete it now or leave for future tests; per plan's design, leave it).

- [ ] **Step 4: Schema Markup Validator spot-checks**

Manual validation (Google's Rich Results Test, schema.org validator). Sample these URLs:
- `https://forgeflowkit.com/en/mrr-calculator/` — SoftwareApplication + FAQPage + BreadcrumbList + WebSite
- `https://forgeflowkit.com/en/ai-image-cost-calculator/` — same shape, `applicationCategory:DeveloperApplication`
- `https://forgeflowkit.com/en/` — Organization + ItemList(32) + WebSite
- `https://forgeflowkit.com/en/about/` — AboutPage
- `https://forgeflowkit.com/en/blog/best-mrr-calculator/` — Article
- `https://forgeflowkit.com/en/blog/` — Blog

All should validate without errors.

- [ ] **Step 5: Verify og:type per page type**

Run:
```bash
grep -r 'og:type' dist/en/mrr-calculator/index.html dist/en/index.html dist/en/about/index.html dist/en/blog/best-mrr-calculator/index.html dist/en/blog/index.html
```
Expected:
- mrr-calculator → `og:type content="product"`
- index → `og:type content="website"`
- about → `og:type content="website"`
- blog/[slug] → `og:type content="article"`
- blog/index → `og:type content="website"`

- [ ] **Step 6: Verify sitemap has correct priorities**

Already done in Task 10 Step 6. Run a final:
```bash
echo "=== home ==="; grep -B0 -A1 'forgeflowkit.com/en/<' dist/sitemap-0.xml | head -10
echo "=== tool ==="; grep 'mrr-calculator' dist/sitemap-0.xml | head -3
echo "=== blog ==="; grep '/blog/' dist/sitemap-0.xml | head -3
echo "=== static ==="; grep 'about' dist/sitemap-0.xml | head -3
```
Expected: home priority=1.0 daily; tool priority=0.9 monthly; blog priority=0.7 weekly; static priority=0.5 monthly.

- [ ] **Step 7: Final commit (any stragglers)**

If Step 1-6 surfaced any cleanup, commit it now:
```bash
git add -A
git commit -m "chore(seo): post-validation cleanup"
```

---

## Task 12: Update design spec to reflect blog drift

**Files:**
- Modify: `docs/superpowers/specs/2026-06-25-seo-overhaul.md`

The design doc incorrectly states blog doesn't exist. Correct that and document the scope expansion.

- [ ] **Step 1: Locate the design doc**

Run: `ls docs/superpowers/specs/`
Expected: `2026-06-25-seo-overhaul.md` exists.

- [ ] **Step 2: Update the "Non-Goals" section**

Find and replace the blog-related lines in `docs/superpowers/specs/2026-06-25-seo-overhaul.md`. Specifically:
- In the table at the top, change the "Out of scope" row about blog:
  - FROM: "博客实装：src/pages/blog/ 目录不存在，blog 数据在 src/data/blog-posts.ts 但无渲染页面"
  - TO: "博客实装：page rendering 已存在（src/pages/[lang]/blog/）；本次仅扩 Article + Blog schema（user-confirmed in pre-flight 2026-06-25）"

- [ ] **Step 3: Add a note in the spec about scope drift**

After the "Goals" section, add:

```markdown
## 1.1 Pre-flight drift (2026-06-25)

During plan writing, pre-flight discovered:
- `src/pages/[lang]/blog/[slug].astro` and `src/pages/[lang]/blog/index.astro` already exist (53-line BlogPost generator in `src/data/blog-posts.ts`).
- Design doc said "blog doesn't exist" — incorrect.

User confirmed (via AskUserQuestion): expand scope to include Article + Blog schema for blog pages.

Implications:
- Plan A grew from "32 tool pages + 8 static + 2 home" to include "64 blog pages + 2 blog index".
- Plan B unchanged (blogs reuse tool og:image — 1:1 mapping via `blog-posts.ts: tools.map(...)`).
- Total pages now: 138 (vs design's estimate of 141).
```

- [ ] **Step 4: Commit spec update**

```bash
git add docs/superpowers/specs/2026-06-25-seo-overhaul.md
git commit -m "docs(spec): correct blog existence drift, document scope expansion"
```

---

## Acceptance Criteria (mirror design §6 Phase 1)

- [ ] `pnpm build` 0 errors
- [ ] `pnpm test:unit` all green
- [ ] `pnpm exec astro check` 0 errors
- [ ] All 32 tool pages × 2 langs = 64 pages have `SoftwareApplication` schema with: `@id`, real `applicationCategory` (not 'Multimedia'), `offers`, `featureList`, `isAccessibleForFree`, `provider`
- [ ] All 32 blog posts × 2 langs = 64 pages have `Article` schema
- [ ] All 4 static pages × 2 langs = 8 pages have page-specific schema (AboutPage/ContactPage/WebPage/WebPage)
- [ ] Both home pages have `Organization` + `ItemList(32 tools)`
- [ ] All pages have site-level `WebSite + SearchAction`
- [ ] Tool pages have `og:type=product`; blog posts `og:type=article`; other pages `og:type=website`
- [ ] Sitemap: home priority=1.0 daily; tools 0.9 monthly; blog 0.7 weekly; static 0.5 monthly
- [ ] privacy-policy.astro no longer contains `hello@solopreneurtools.com`

## Rollback Plan

| Failure mode | Rollback |
|---|---|
| Build fails | `git revert <last-commit>` — additive change; tool page rendering unchanged |
| Schema invalid | Validate one page first via Schema Markup Validator before proceeding; if specific page type fails, delete that schema block only |
| og:type wrong | Task 4's `pageType` prop default is `'static'` → `og:type=website`; if all pages accidentally default, revert to `'website'` hardcode in BaseLayout (one-line change) |
| Sitemap mis-tiered | The `classifyUrl` function has 9 unit tests; if real URLs mis-classify, add a test + fix regex |

## Risk & Mitigations

| Risk | Mitigation |
|---|---|
| Tool page imports break (added import in frontmatter) | Task 5 Step 3 catches with `pnpm build` |
| `applicationCategory` field missing on any entry | Task 3 Step 3 grep verifies count=32 |
| Schema Markup Validator rejects custom types | Use only schema.org core types (BusinessApplication/DeveloperApplication/FinanceApplication all valid) |
| Astro check warns about unused imports | All new imports are referenced |
| Sitemap serialize throws on unexpected URL | Default case in `classifyUrl` is `tool` (priority 0.9); no URL unmapped |