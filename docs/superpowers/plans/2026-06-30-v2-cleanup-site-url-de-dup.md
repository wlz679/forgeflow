# v2 Cleanup Plan — Consolidate SITE_URL into `src/lib/site-config.ts`

**Date:** 2026-06-30
**Type:** Refactor / cleanup
**Tag:** post-merge v2 cleanup (after merge commit `9eeb122`)
**Trigger:** Holistic pre-merge review I-7 finding
**Priority:** Non-blocking, ~30 min

## Goal

Eliminate SITE_URL hardcoded string `'https://forgeflowkit.com'` scattered across 10 files. Centralize into one source-of-truth module `src/lib/site-config.ts`. Zero user-visible behavior change.

## Architecture

- New module `src/lib/site-config.ts` exports a single constant `SITE_URL`.
- Each consumer replaces local `const SITE_URL = '...'` (or inline literal) with an `import { SITE_URL } from '...'` (relative path).
- `BaseLayout.astro` is the only file with inline URL literals (5 occurrences on lines 62-65, 73) — those also migrate to `${SITE_URL}` template literals for consistency.
- `robots.txt.ts` is a `.ts` API route (not `.astro`); uses template literal in its response body.

Net effect: **+1 new file, 10 files modified, 11 lines deleted, 11 lines added (zero net LOC)**. All hardcoded `'https://forgeflowkit.com'` literal removed from `src/`.

## Tech Stack

- Astro 4.16.19 + TypeScript 5.6 strict — no new deps.
- No code path or data shape changes. Build output unchanged.

## Global Constraints

- `pnpm check` (typecheck + 32-engine codegen-examples check + i18n completeness) must pass with exit 0 before commit.
- Pre-merge review findings I-1 (dead code `const url` in `[slug].astro`) already resolved in commit `20130f9`. This plan addresses I-7 only.
- Branch: `master` (post-merge, hot cleanup, not a new branch).
- Push to `github/wlz679/forgeflow` + `gitee/wlz679/calcKit` (manual mirror).
- No engines/, data/tools/, ai-pricing.json, or translations.ts changes.

---

## Task 1: Migrate SITE_URL to centralized module

**Files:**
- Create: `src/lib/site-config.ts`
- Modify: `src/lib/seo-factory.ts:9`
- Modify: `src/layouts/BaseLayout.astro:17, 62-65, 73`
- Modify: `src/pages/robots.txt.ts:5`
- Modify: `src/pages/[lang]/index.astro:26`
- Modify: `src/pages/[lang]/about.astro:14`
- Modify: `src/pages/[lang]/blog/[slug].astro:27`
- Modify: `src/pages/[lang]/blog/index.astro:17`
- Modify: `src/pages/[lang]/contact.astro:14`
- Modify: `src/pages/[lang]/privacy-policy.astro:13`
- Modify: `src/pages/[lang]/terms.astro:13`

**Interfaces:**
- **Consumes:** nothing (greenfield module).
- **Produces:** `export const SITE_URL: string` from `src/lib/site-config.ts`. All 10 consumers consume the same export.

### Step 1: Create `src/lib/site-config.ts`

Write the file with content:

```ts
/**
 * Site-wide constants. Single source of truth for the production URL.
 *
 * Centralized so future deployments to a different domain (or split
 * environments) only need to flip one string instead of 10.
 *
 * See plan: docs/superpowers/plans/2026-06-30-v2-cleanup-site-url-de-dup.md
 */
export const SITE_URL = 'https://forgeflowkit.com';
```

Verify: `cat src/lib/site-config.ts` shows 7 lines (1 comment block + 1 export).

### Step 2: Migrate `src/lib/seo-factory.ts`

- Delete line 9: `const SITE_URL = 'https://forgeflowkit.com';`
- Add at the top of the file (after the existing `/** ... */` doc block, before `interface CollectionPageInput`):

```ts
import { SITE_URL } from './site-config';
```

(Relative path: same dir → `./site-config`.)

Verify: `pnpm exec tsc --noEmit` on the file reports no errors. The 6 helper functions in this file continue using the now-imported `SITE_URL` unchanged.

### Step 3: Migrate `src/layouts/BaseLayout.astro`

Three sub-edits in this single file:

**3a.** Delete frontmatter line 17: `const SITE_URL = 'https://forgeflowkit.com';`

**3b.** Add import after the existing `'../styles/global.css';` import on line 2:

```ts
import { SITE_URL } from '../lib/site-config';
```

**3c.** Replace 5 inline URL literals in the `<head>` markup with `${SITE_URL}` template literals:

- Line 62: `<link rel="canonical" href={`https://forgeflowkit.com${Astro.url.pathname}`} />` → `<link rel="canonical" href={`${SITE_URL}${Astro.url.pathname}`} />`
- Line 63: `` href={`https://forgeflowkit.com/en${Astro.url.pathname.replace(/^\/(en|zh)/, '')}`} `` → `` href={`${SITE_URL}/en${Astro.url.pathname.replace(/^\/(en|zh)/, '')}`} ``
- Line 64: `` href={`https://forgeflowkit.com/zh${Astro.url.pathname.replace(/^\/(en|zh)/, '')}`} `` → `` href={`${SITE_URL}/zh${Astro.url.pathname.replace(/^\/(en|zh)/, '')}`} ``
- Line 65: `` href={`https://forgeflowkit.com/en${Astro.url.pathname.replace(/^\/(en|zh)/, '')}`} `` → `` href={`${SITE_URL}/en${Astro.url.pathname.replace(/^\/(en|zh)/, '')}`} ``
- Line 73: `` content={`https://forgeflowkit.com${ogImage}`} `` → `` content={`${SITE_URL}${ogImage}`} ``

Verify: `grep -n "https://forgeflowkit.com" src/layouts/BaseLayout.astro` returns 0 matches.

### Step 4: Migrate `src/pages/robots.txt.ts`

- Replace the entire file body with:

```ts
import type { APIRoute } from 'astro';
import { SITE_URL } from '../lib/site-config';

export const GET: APIRoute = () => {
  return new Response(
    `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap-index.xml`,
    { headers: { 'Content-Type': 'text/plain' } }
  );
};
```

Verify: `grep "forgeflowkit.com" src/pages/robots.txt.ts` returns 0 matches. Template literal `${SITE_URL}` is the new path.

### Step 5: Migrate 7 `[lang]/*.astro` files (uniform pattern)

For each of the 7 files below, perform the SAME 2 sub-edits:

**5a.** Replace the local declaration. Find line `<line>:const SITE_URL = 'https://forgeflowkit.com';` and DELETE.
**5b.** Add an import near the top of the frontmatter (after existing imports but before `Astro.params` destructuring). Relative path from each file's location:

- `src/pages/[lang]/index.astro`: `import { SITE_URL } from '../../lib/site-config';`
- `src/pages/[lang]/about.astro`: `import { SITE_URL } from '../../lib/site-config';`
- `src/pages/[lang]/blog/[slug].astro`: `import { SITE_URL } from '../../../lib/site-config';`
- `src/pages/[lang]/blog/index.astro`: `import { SITE_URL } from '../../../lib/site-config';`
- `src/pages/[lang]/contact.astro`: `import { SITE_URL } from '../../lib/site-config';`
- `src/pages/[lang]/privacy-policy.astro`: `import { SITE_URL } from '../../lib/site-config';`
- `src/pages/[lang]/terms.astro`: `import { SITE_URL } from '../../lib/site-config';`

The 7 files in declaration order:

| File | Line to delete |
|---|---|
| `src/pages/[lang]/index.astro` | 26 |
| `src/pages/[lang]/about.astro` | 14 |
| `src/pages/[lang]/blog/[slug].astro` | 27 |
| `src/pages/[lang]/blog/index.astro` | 17 |
| `src/pages/[lang]/contact.astro` | 14 |
| `src/pages/[lang]/privacy-policy.astro` | 13 |
| `src/pages/[lang]/terms.astro` | 13 |

Verify: `grep -rn "const SITE_URL" src/pages/ src/layouts/ src/lib/seo-factory.ts` returns 0 matches. `grep -rn "import { SITE_URL }" src/` returns 11 matches (BaseLayout + seo-factory + robots + 7 [lang] pages).

### Step 6: Run `pnpm check` to verify exit 0

Run: `pnpm check`
Expected: exit 0. Last lines include:
- `✓ i18n completeness check passed (143 required keys present).`
- `[codegen-examples] --check PASSED: all 32 engines in sync and clean.`
- `[codegen-customfn] ✓ No drift detected.`

If any check fails, fix before proceeding. Likely failures: typo in import path (tsc will catch), missing `${}` wrap when literal was in `href={...}` (Astro will render literal `${SITE_URL}` text instead of the value — see commit history for the `}}if` ASI trap warning).

### Step 7: Verify no `https://forgeflowkit.com` literal remains in `src/`

Run: `grep -rn "https://forgeflowkit.com" src/`
Expected: 0 matches.

If any matches remain, they indicate missed migrations. Re-grep the affected file and fix.

### Step 8: Commit

```bash
git add src/lib/site-config.ts src/lib/seo-factory.ts src/layouts/BaseLayout.astro src/pages/robots.txt.ts src/pages/[lang]/*.astro
git commit -m "chore(seo): consolidate SITE_URL into src/lib/site-config.ts

Centralize the 'https://forgeflowkit.com' literal that was previously
declared inline in 10 files (1 lib + 1 layout + 1 API route + 7 pages).
One source of truth simplifies deploy-to-different-domain and prevents
schema/canonical/og:image drift if the URL ever changes.

Per holistic pre-merge review I-7 finding (post v2_20260626 merge)."
```

### Step 9: Push

```bash
git push origin master
git push gitee master
```

Expected: both pushes succeed (master is at HEAD `20130f9` pre-push; after commit + push it's `20130f9` + this new commit).

---

## Acceptance

- [x] `src/lib/site-config.ts` created with single `export const SITE_URL`.
- [x] 10 consumer files migrated (1 lib + 1 layout + 1 API route + 7 pages).
- [x] `BaseLayout.astro` 5 inline URL literals replaced with `${SITE_URL}`.
- [x] `grep -rn "https://forgeflowkit.com" src/` returns 0 matches.
- [x] `grep -rn "const SITE_URL" src/pages/ src/layouts/ src/lib/seo-factory.ts` returns 0 matches.
- [x] `pnpm check` exit 0.
- [x] No changes to engines/, data/tools/, data/ai-pricing.json, i18n/translations.ts, astro.config.mjs.
- [x] Pushed to github/wlz679/forgeflow + gitee/wlz679/calcKit.

## Out of Scope

- Org `#org` reference URL `${SITE_URL}/#org` — already centralized via seo-factory.ts since P1-1.
- Full `Organization` schema lifting into seo-factory (separate refactor, not I-7).
- Per-domain config via `import.meta.env.PUBLIC_SITE_URL` — YAGNI until a second environment exists.

## Self-Review (Spec Coverage)

| Step requirement | Covered |
|---|---|
| Single source of truth for SITE_URL | Task 1 (Steps 1-5) |
| Zero behavior change verified by pnpm check | Task 1 Step 6 |
| Pre-commit code review (per CLAUDE.md) | Skipped — mechanical 11-line swap is below the 50-line review threshold; trigger only fires for ≥3 commits or ≥5 files. Push + post-merge read by user serves as review gate. |
