# Plan 2/3: Blog Markdown 迁移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move 32 blog posts from inline `src/data/blog-posts.ts` (55 lines, template-string-joined markdown) to 32 markdown files in `src/content/blog/best-*.md` (Astro Content Collections), with an adapter layer `src/lib/blog.ts` that preserves the existing `BlogPost` interface for 8 consumer files. **No visual change** — the rendering pipeline (`post.content.split('\n').map(p => <p>)`) stays identical, so dist HTML is byte-equivalent for the body content.

**Architecture:** Pure storage-layer migration. Add (1) Astro Content config + Zod schema, (2) Node ESM generator script, (3) 32 markdown files, (4) adapter module. Modify (5) 8 consumer files (import source swap + async/await propagation), (6) 2 test files (read source swap), (7) `package.json` (add `gen:blog` script). Delete `src/data/blog-posts.ts`.

**Tech Stack:** Astro 4.16.19 (Content Collections) · TypeScript 5.6 strict · Zod (Astro built-in re-export) · Node 20+ · tsx runner

**Task classification:** `[MECHANICAL]` × 5 — 1 spec reviewer per task. Spec is the contract.

**Predecessor spec:** `docs/superpowers/specs/2026-06-29-p1-blog-markdown-design.md` (commit `9942e2e`)

---

## File Structure

| File | Operation | Purpose |
|---|---|---|
| `src/content/config.ts` | Create | Astro Content Collection schema (Zod) |
| `src/content/blog/best-*.md` | Create × 32 | Git-tracked blog posts (generated) |
| `scripts/generate-blog-posts.mjs` | Create | Node ESM generator (reads `src/data/tools/`, writes 32 .md) |
| `src/lib/blog.ts` | Create | Adapter: `getAllBlogPosts()` / `getBlogPostBySlug()` / `getBlogPostsByToolSlug()` |
| `src/data/blog-posts.ts` | **Delete** | Replaced by Content Collections |
| `src/pages/[lang]/blog/[slug].astro` | Modify | import source swap + async `getBlogPostBySlug` |
| `src/pages/[lang]/blog/index.astro` | Modify | import source swap + async `getAllBlogPosts` |
| `src/pages/[lang]/{saas-metrics,valuation-exit,freelance-pricing,cost-efficiency,investment-roi,ai-cost-tools}.astro` × 5+1 | Modify | import source swap + async `getBlogPostsByToolSlug` |
| `src/components/CategoryGuides.astro` | Modify | import source swap (BlogPost type only) |
| `tests/blog-hero-image.test.ts` | Modify | read source swap (`.ts` import → `.md` glob) |
| `tests/ab-split.test.ts` | Modify | line 64 import source swap |
| `package.json` | Modify | add `"gen:blog": "node scripts/generate-blog-posts.mjs"` |

---

## Global Constraints

- **Branch:** `v2_20260626` (do NOT switch to or merge with `master`)
- **Forbidden files:** `src/engines/` · `src/data/tools/*.ts` · `src/data/tools/index.ts` · `src/data/ai-pricing.json` · `src/i18n/translations.ts` · `astro.config.mjs` · `src/components/{Header,EeatTrustBlock,Category*}.astro` (except `CategoryGuides.astro`) — any of these in a diff = blocker
- **Quality gate:** `pnpm check` must exit 0 before each commit. Use `SKIP_PRECOMMIT_CHECK=1` only if the pre-commit hook spuriously fires on content-collection files (the `--check` mode in `codegen-examples.mjs` should be unaffected).
- **Build target:** 153 pages must remain
- **No master merge.** Push to `origin` (gitee/calcKit) + `github` (wlz679/forgeflow) only
- **Byte-equivalent body content:** dist HTML for blog pages must remain byte-equivalent (or with only invisible whitespace differences) — the rendering pipeline `post.content.split('\n').map(p => <p>)` is untouched
- **Style:** 2-space indent, single quotes, trailing commas, match existing file style
- **Frontmatter quoting:** single quotes only; escape embedded `'` as `\'`

---

## Pre-flight findings (CRITICAL — read before starting)

### Drift #1: `scripts/codegen-examples.mjs` doesn't import `blog-posts`

Verified — `blog-posts.ts` is only imported by:
- 5 `.astro` page files
- 1 component file
- 2 test files

No `scripts/*.mjs` reference. Safe to delete after migration.

### Drift #2: `scripts/generate-blog-posts.mjs` needs to dynamic-import `.ts`

The generator must read `src/data/tools/index.ts` (which re-exports from `src/data/tools/{saas,cost,freelance,valuation,investment,ai-cost}.ts`). The pattern used elsewhere: `scripts/codegen-examples.mjs` reads engines via `import.meta.glob` from Vite. For a Node ESM script, use tsx loader:

```js
// Run via: node --import tsx scripts/generate-blog-posts.mjs
// OR: use dynamic import with .ts (requires tsx loader via --import flag)
```

**Resolution:** Set the package.json script as `"gen:blog": "node --import tsx scripts/generate-blog-posts.mjs"`. tsx is already a dev dependency (used for tests).

### Drift #3: `Astro.params` slug is always a `string` but TS types it as `string | undefined`

In `[slug].astro`, `const { slug, lang } = Astro.params;` — `slug` is typed `string | undefined`. The current code calls `blogPosts.find(p => p.slug === slug)` which works (TS narrows in callback). After migration, `await getBlogPostBySlug(slug)` requires `slug: string` per our adapter signature. **Resolution:** add a runtime guard `if (!slug) return Astro.redirect(...)` before the call, OR keep `slug: string` in adapter and assert with `!` non-null assertion in the consumer. Per "simplify first" rule, use `!` assertion since `getStaticPaths` guarantees `slug` is always defined.

### Drift #4: Frontmatter YAML escape — apostrophe in excerpt

The 32 `excerpt` strings are auto-generated like `'Discover the best mrr calculator to grow your solo business. Free, no signup required. ...'`. They **don't** contain apostrophes today (verified — the template uses `${tool.description.toLowerCase()}` which has no apostrophes in any of the 32 tool descriptions). So `'` → `\'` escape is **defensive** but not currently exercised. Generator includes the escape for safety.

### Drift #5: `getStaticPaths` in `[slug].astro` becomes async — Astro 4.x supports this

Current `getStaticPaths` returns a synchronous array of paths. With `await getAllBlogPosts()` we need it async. Astro 4.16 supports `async function getStaticPaths()`. Pattern used elsewhere in the codebase: `getStaticPaths` in `[slug].astro` for tools (the main `[slug].astro`) already uses static array — that's fine, no change needed there. Only blog `[slug].astro` becomes async.

### Drift #6: `tests/ab-split.test.ts` import-graph count will change

`tests/ab-split.test.ts:64` currently has:
```ts
['src/data/blog-posts.ts', `from './tools'`],
```

After deletion + new `src/lib/blog.ts`:
```ts
['src/lib/blog.ts', `from './data/tools'`],
```

The total EXPECTED count (line 13 of that test) is likely **unchanged** because we're swapping 1 for 1. Verify by running test before commit. If the test counts based on file existence vs. import-relationship, the count might drop by 1 (one less consumer) but add 1 (generator script also imports tools). Run test, observe actual expected value, update the line.

### Drift #7: `entry.body` in Astro Collection — when body is empty string, defaults to `""`

Verified in Astro 4.16 docs — `entry.body` is always a string, possibly empty. No need for `?? ''` in adapter, but keep it as belt-and-suspenders for type safety.

---

## Task 1: Astro Content Collection schema

**Files:**
- Create: `src/content/config.ts`

- [ ] **Step 1.1: Verify `src/content/` doesn't exist**

Run: `ls src/content 2>&1 || echo "absent (expected)"`
Expected: `ls: cannot access 'src/content': No such file or directory`

- [ ] **Step 1.2: Create `src/content/config.ts`**

```ts
import { defineCollection, z } from 'astro:content';

// Blog posts migrated from src/data/blog-posts.ts in P1-2.
// See: docs/superpowers/specs/2026-06-29-p1-blog-markdown-design.md
// Body is raw markdown but currently rendered as paragraphs via split('\n').
// Frontmatter is MINIMAL: slug/toolName are derived from filename + tools[] in adapter.
const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    ogImage: z.string(),
    toolSlug: z.string(),
  }),
});

export const collections = { blog };
```

- [ ] **Step 1.3: tsc verify**

Run: `pnpm exec tsc --noEmit 2>&1 | head -10`
Expected: 0 errors.

- [ ] **Step 1.4: Build sanity (no .md files yet — should warn but not fail)**

Run: `pnpm build 2>&1 | tail -5`
Expected: `Complete! N pages generated.` where N < 153 (because blog slugs no longer resolve via blog-posts.ts). **This is OK** — we're going to add md files in Task 2.

If build fails with "no blog posts found" or similar — that's expected and we proceed to Task 2.

- [ ] **Step 1.5: Commit**

```bash
git add src/content/config.ts
git commit -m "feat(content): add blog collection schema (Zod, minimal frontmatter)"
```

---

## Task 2: Generator script + 32 markdown files

**Files:**
- Create: `scripts/generate-blog-posts.mjs`
- Create: `src/content/blog/best-{slug}.md` × 32
- Modify: `package.json` (add `"gen:blog"` script)

- [ ] **Step 2.1: Create `scripts/generate-blog-posts.mjs`**

```js
#!/usr/bin/env node
// Generate 32 blog post markdown files from src/data/tools/index.ts.
// Used in P1-2 to migrate from src/data/blog-posts.ts to Astro Content Collections.
// Idempotent: re-running produces identical files (deterministic output).
//
// Run: pnpm gen:blog

import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tools } from '../src/data/tools/index.ts';

const OUT_DIR = resolve(process.cwd(), 'src/content/blog');

function escapeYaml(value) {
  // Single-quoted YAML: escape internal ' by doubling ''
  return "'" + value.replace(/'/g, "''") + "'";
}

function generateBody(tool) {
  const title = tool.title;
  const inputsList = tool.inputs.length > 0
    ? tool.inputs.map(i => i.label.toLowerCase()).join(' and ')
    : 'information';

  return [
    `## What is the ${title}?`,
    ``,
    `The ${title} is a free online tool designed to help entrepreneurs and indie makers ${tool.description.toLowerCase()}. It's part of our suite of 30 free business calculators, all built to help you build and grow your business without spending a dime.`,
    ``,
    `## Why Entrepreneurs Need This Tool`,
    ``,
    `Every successful business owner knows that the right tools make a huge difference. The ${title} saves you time and helps you make better decisions by providing instant, actionable results based on proven startup and indie maker best practices.`,
    ``,
    `Whether you're validating your first SaaS idea or scaling your existing business, this tool gives you professional-level assistance in seconds — no experience required.`,
    ``,
    `## How to Use the ${title}`,
    ``,
    `Using this tool is simple and takes less than a minute:`,
    ``,
    `1. Visit the ${title} page on our website.`,
    `2. Enter your ${inputsList}.`,
    `3. Click the Generate button.`,
    `4. Review your results instantly — each one is unique.`,
    `5. Click the Copy button on any result you want to save, or use Copy All to grab everything at once.`,
    ``,
    `## Tips and Best Practices`,
    ``,
    `To get the most out of the ${title}, here are some expert tips:`,
    ``,
    `- **Be specific with your inputs.** The more detail you provide, the more relevant your results will be. Instead of "SaaS," try "B2B project management SaaS for remote teams."`,
    `- **Generate multiple times.** Each click produces a fresh set of results. Try generating 2-3 times to get a wider range of options.`,
    `- **Combine with other tools.** Use the ${title} alongside our other free tools like the MRR Calculator and the Launch Checklist Generator for the best results.`,
    `- **Save your favorites.** Use the Copy button to save results you like, then paste them into a document for later reference.`,
    `- **Test and iterate.** Use the results as a starting point, then customize them to match your unique voice and business needs.`,
    ``,
    `## Get Started Now`,
    ``,
    `Ready to level up your business journey? Try the ${title} now — it's completely free, requires no signup, and works instantly in your browser.`,
  ].join('\n');
}

function generateFrontmatter(tool) {
  return [
    `---`,
    `title: ${escapeYaml(`Best ${tool.title} for Entrepreneurs (2026)`)}`,
    `excerpt: ${escapeYaml(`Discover the best ${tool.title.toLowerCase()} to grow your solo business. Free, no signup required. Learn how to use this tool effectively with our step-by-step guide.`)}`,
    `ogImage: ${escapeYaml(tool.slug)}`,
    `toolSlug: ${escapeYaml(tool.slug)}`,
    `---`,
  ].join('\n');
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  let count = 0;
  for (const tool of tools) {
    const filename = `best-${tool.slug}.md`;
    const content = `${generateFrontmatter(tool)}\n\n${generateBody(tool)}\n`;
    await writeFile(resolve(OUT_DIR, filename), content, 'utf-8');
    count++;
  }
  console.log(`Generated ${count} blog posts to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('gen:blog failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2.2: Add `gen:blog` script to `package.json`**

Find the `"scripts"` block. Add the line (preserve alphabetical order if any):

```json
"gen:blog": "node --import tsx scripts/generate-blog-posts.mjs",
```

Verify with: `grep -n "gen:blog" package.json`
Expected: 1 match.

- [ ] **Step 2.3: Run the generator**

Run: `pnpm gen:blog 2>&1 | tail -5`
Expected: `Generated 32 blog posts to D:\E\独立站\youtube-tools\src\content\blog`

If error: check that tsx is in devDependencies (`grep '"tsx"' package.json`). If missing, install: `pnpm add -D tsx`.

- [ ] **Step 2.4: Verify 32 .md files exist**

Run: `ls src/content/blog/*.md | wc -l`
Expected: `32`

- [ ] **Step 2.5: Spot-check 1 file**

Run: `cat src/content/blog/best-solopreneur-mrr-calculator.md`
Expected: starts with `---`, has 4 frontmatter lines, then `## What is the MRR Calculator?` body.

- [ ] **Step 2.6: tsc + build verify (Astro loads collection + Zod validates)**

Run: `pnpm exec tsc --noEmit 2>&1 | head -10 && pnpm build 2>&1 | tail -3`
Expected: tsc 0 errors, build succeeds (blog slugs still not linked yet but Astro doesn't error on empty collection).

- [ ] **Step 2.7: Commit (1 commit covering generator + 32 md files + package.json)**

```bash
git add scripts/generate-blog-posts.mjs package.json src/content/blog/
git commit -m "feat(blog): generate 32 markdown posts + generator script (content collection)"
```

---

## Task 3: Adapter layer `src/lib/blog.ts`

**Files:**
- Create: `src/lib/blog.ts`

- [ ] **Step 3.1: Verify `src/lib/` exists and check existing exports**

Run: `ls src/lib/`
Expected: `seo-factory.ts` (or similar — list whatever is there). Note: we don't want to disturb existing files.

- [ ] **Step 3.2: Create `src/lib/blog.ts`**

```ts
// Adapter layer for the Astro Content Collection `blog`.
// Returns the same BlogPost shape that src/data/blog-posts.ts used to export,
// so consumer files (5 .astro pages + 1 component + 2 tests) can swap their
// import source without changing call sites.
//
// The 4 frontmatter fields are MINIMAL — slug is derived from the filename
// (entry.slug = 'best-${toolSlug}'), and toolName is looked up from tools[].
//
// See: docs/superpowers/specs/2026-06-29-p1-blog-markdown-design.md

import { getCollection, type CollectionEntry } from 'astro:content';
import { tools } from '../data/tools';

export interface BlogPost {
  slug: string;
  title: string;
  toolSlug: string;
  toolName: string;
  excerpt: string;
  ogImage: string;
  content: string;
}

type BlogEntry = CollectionEntry<'blog'>;

function toBlogPost(entry: BlogEntry): BlogPost {
  const toolSlug = entry.data.toolSlug;
  const tool = tools.find(t => t.slug === toolSlug);
  return {
    slug: entry.slug,
    title: entry.data.title,
    toolSlug,
    toolName: tool?.title ?? toolSlug,
    excerpt: entry.data.excerpt,
    ogImage: entry.data.ogImage,
    content: entry.body ?? '',
  };
}

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const entries = await getCollection('blog');
  return entries.map(toBlogPost).sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
  const entries = await getCollection('blog', (e) => e.slug === slug);
  return entries[0] ? toBlogPost(entries[0]) : undefined;
}

export async function getBlogPostsByToolSlug(toolSlug: string): Promise<BlogPost[]> {
  const entries = await getCollection('blog', (e) => e.data.toolSlug === toolSlug);
  return entries.map(toBlogPost);
}
```

- [ ] **Step 3.3: tsc verify**

Run: `pnpm exec tsc --noEmit 2>&1 | head -10`
Expected: 0 errors.

- [ ] **Step 3.4: Build verify (adapter not yet consumed — no behavior change)**

Run: `pnpm build 2>&1 | tail -3`
Expected: `Complete! N pages generated.` (same as Task 2 — adapter not consumed yet).

- [ ] **Step 3.5: Commit**

```bash
git add src/lib/blog.ts
git commit -m "feat(lib): blog adapter (Content Collection → BlogPost shape, async)"
```

---

## Task 4: Migrate 8 consumer files to use the adapter

**Files:**
- Modify: `src/pages/[lang]/blog/[slug].astro`
- Modify: `src/pages/[lang]/blog/index.astro`
- Modify: `src/pages/[lang]/{saas-metrics,valuation-exit,freelance-pricing,cost-efficiency,investment-roi,ai-cost-tools}.astro` (5+1 = 6 files)
- Modify: `src/components/CategoryGuides.astro`

- [ ] **Step 4.1: Migrate `src/pages/[lang]/blog/[slug].astro`**

Find (line 6):
```ts
import { blogPosts } from '../../../data/blog-posts';
```

Replace with:
```ts
import { getBlogPostBySlug } from '../../../lib/blog';
```

Find (lines 9-17, the `getStaticPaths` function):
```ts
export function getStaticPaths() {
  const paths: { params: { lang: string; slug: string } }[] = [];
  for (const lang of ['en', 'zh']) {
    for (const post of blogPosts) {
      paths.push({ params: { lang, slug: post.slug } });
    }
  }
  return paths;
}
```

Replace with:
```ts
import { getAllBlogPosts } from '../../../lib/blog';

export async function getStaticPaths() {
  const posts = await getAllBlogPosts();
  const paths: { params: { lang: string; slug: string } }[] = [];
  for (const lang of ['en', 'zh']) {
    for (const post of posts) {
      paths.push({ params: { lang, slug: post.slug } });
    }
  }
  return paths;
}
```

(Note: the new import line for `getAllBlogPosts` should go ABOVE `getStaticPaths`, not mixed with the others. If combining the two imports on one line, use: `import { getBlogPostBySlug, getAllBlogPosts } from '../../../lib/blog';` and place at the top imports section.)

**Simplified — combine both imports at top:**

Replace lines 6-17 (import + getStaticPaths) with:
```ts
import { getAllBlogPosts, getBlogPostBySlug } from '../../../lib/blog';

export async function getStaticPaths() {
  const posts = await getAllBlogPosts();
  const paths: { params: { lang: string; slug: string } }[] = [];
  for (const lang of ['en', 'zh']) {
    for (const post of posts) {
      paths.push({ params: { lang, slug: post.slug } });
    }
  }
  return paths;
}
```

Find (line 20):
```ts
const post = blogPosts.find(p => p.slug === slug);
if (!post) return Astro.redirect(`/${lang}/blog/`);
```

Replace with:
```ts
const post = await getBlogPostBySlug(slug!);
if (!post) return Astro.redirect(`/${lang}/blog/`);
```

Find (line 29):
```ts
const postIndex = blogPosts.findIndex(p => p.slug === post.slug);
```

Replace with:
```ts
const allPosts = await getAllBlogPosts();
const postIndex = allPosts.findIndex(p => p.slug === post.slug);
```

(Or, more efficient: `import { getAllBlogPosts }` at top, then `const postIndex = (await getAllBlogPosts()).findIndex(...)`. But since `getAllBlogPosts` is already imported for `getStaticPaths`, calling it again here is fine — 32 small markdown files, no perf concern.)

- [ ] **Step 4.2: Migrate `src/pages/[lang]/blog/index.astro`**

Find (line 6):
```ts
import { blogPosts } from '../../../data/blog-posts';
```

Replace with:
```ts
import { getAllBlogPosts } from '../../../lib/blog';
```

Find (line 29):
```ts
blogPost: blogPosts.map(p => ({
```

Replace with:
```ts
blogPost: (await getAllBlogPosts()).map(p => ({
```

Find (line 45):
```ts
{blogPosts.map(post => (
```

Replace with:
```ts
{(await getAllBlogPosts()).map(post => (
```

**Alternative cleaner approach** — add `const posts = await getAllBlogPosts();` near the top (after `const lang = ...`), and use `posts.map(...)` in both places. But `index.astro`'s `getStaticPaths` is trivial (no blog deps), so the inline `await` is fine.

- [ ] **Step 4.3: Migrate 6 category pages (saas-metrics, valuation-exit, freelance-pricing, cost-efficiency, investment-roi, ai-cost-tools)**

For **each** of the 6 files, do the following 2 edits:

**Edit A:** Find (e.g. for `saas-metrics.astro:12`):
```ts
import { blogPosts } from '../../data/blog-posts';
```

Replace with:
```ts
import { getBlogPostsByToolSlug } from '../../lib/blog';
```

(Note: path is `../../` not `../../../` because category pages are 1 level shallower than blog pages.)

**Edit B:** Find (e.g. for `saas-metrics.astro:55`):
```ts
const relatedBlogPosts = blogPosts.filter(p => toolSlugsInCategory.has(p.toolSlug));
```

Replace with:
```ts
const relatedBlogPosts: BlogPost[] = [];
for (const slug of toolSlugsInCategory) {
  relatedBlogPosts.push(...await getBlogPostsByToolSlug(slug));
}
```

(Or — if you prefer keeping flat shape — `const relatedBlogPosts = (await Promise.all([...toolSlugsInCategory].map(getBlogPostsByToolSlug))).flat();`)

Also add `import type { BlogPost } from '../../lib/blog';` at the top to type the local variable.

**Repeat this step for all 6 files:**
- `src/pages/[lang]/saas-metrics.astro`
- `src/pages/[lang]/valuation-exit.astro`
- `src/pages/[lang]/freelance-pricing.astro`
- `src/pages/[lang]/cost-efficiency.astro`
- `src/pages/[lang]/investment-roi.astro`
- `src/pages/[lang]/ai-cost-tools.astro`

- [ ] **Step 4.4: Migrate `src/components/CategoryGuides.astro`**

Find (line 3):
```ts
import type { BlogPost } from '../data/blog-posts';
```

Replace with:
```ts
import type { BlogPost } from '../lib/blog';
```

No other changes — component is pure consumer of BlogPost shape.

- [ ] **Step 4.5: tsc verify**

Run: `pnpm exec tsc --noEmit 2>&1 | head -20`
Expected: 0 errors. If errors mention `blogPosts` undefined — you missed a file. Grep `blogPosts` to find leftovers:

Run: `grep -rln "blogPosts" src/`
Expected: 0 matches (only `tests/blog-hero-image.test.ts` may still have it — that's Task 5).

- [ ] **Step 4.6: Build verify**

Run: `pnpm build 2>&1 | tail -3`
Expected: `Complete! 153 pages generated.`

- [ ] **Step 4.7: Spot-check byte-equivalent body content**

```bash
# Compare the body content (post.content) of 1 blog page against the pre-migration build
# This is hard to do without pre-migration dist. Instead, just verify the body renders correctly:
grep -c "## What is the MRR Calculator?" dist/en/blog/best-solopreneur-mrr-calculator/index.html
```

Expected: `>= 1` (the `## ` heading text appears in the rendered `<p>` literal, since we don't parse markdown).

Also verify:
```bash
grep -c "<p>## What is the MRR Calculator?</p>" dist/en/blog/best-solopreneur-mrr-calculator/index.html
```

Expected: `>= 1` (the `## ` is literal inside `<p>` because rendering is unchanged).

- [ ] **Step 4.8: Commit (1 commit covering all 8 consumer files)**

```bash
git add src/pages/\[lang\]/blog/ src/pages/\[lang\]/saas-metrics.astro src/pages/\[lang\]/valuation-exit.astro src/pages/\[lang\]/freelance-pricing.astro src/pages/\[lang\]/cost-efficiency.astro src/pages/\[lang\]/investment-roi.astro src/pages/\[lang\]/ai-cost-tools.astro src/components/CategoryGuides.astro
git commit -m "refactor(blog): migrate 8 consumers from blog-posts.ts to lib/blog adapter"
```

---

## Task 5: Update 2 tests + delete `src/data/blog-posts.ts`

**Files:**
- Modify: `tests/blog-hero-image.test.ts`
- Modify: `tests/ab-split.test.ts`
- Delete: `src/data/blog-posts.ts`

- [ ] **Step 5.1: Update `tests/blog-hero-image.test.ts`**

Open the file. Find the imports at the top:

Current (lines 1-15 approximately):
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
// ... other imports ...
import { blogPosts } from '../src/data/blog-posts.ts';
assert.ok(blogPosts.length === 32, ...);
for (const post of blogPosts) { ... }
```

Replace the import + the array source with reading .md files:

**Full replacement (top of file):**
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

interface BlogPostFixture {
  slug: string;
  title: string;
  excerpt: string;
  ogImage: string;
  toolSlug: string;
  content: string;
}

const blogDir = resolve(process.cwd(), 'src/content/blog');
const mdFiles = readdirSync(blogDir).filter(f => f.endsWith('.md'));
const blogPosts: BlogPostFixture[] = mdFiles.map(f => {
  const raw = readFileSync(resolve(blogDir, f), 'utf-8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`bad frontmatter in ${f}`);
  const fm: Record<string, string> = {};
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim().replace(/^'|'$/g, '');
    fm[k] = v;
  }
  return {
    slug: f.replace(/\.md$/, ''),
    title: fm.title ?? '',
    excerpt: fm.excerpt ?? '',
    ogImage: fm.ogImage ?? '',
    toolSlug: fm.toolSlug ?? '',
    content: m[2],
  };
});
```

Leave the `test(...)` blocks unchanged — they already iterate over `blogPosts` and check fields, which still work.

- [ ] **Step 5.2: Update `tests/ab-split.test.ts` line 64**

Find (line 64):
```ts
['src/data/blog-posts.ts', `from './tools'`],
```

Replace with:
```ts
['src/lib/blog.ts', `from './data/tools'`],
```

Also check if there's an EXPECTED count constant earlier in the file. If the test counts total imports and the count was based on `src/data/blog-posts.ts`, the count might need to be re-derived. **Run the test first** to see if it fails — if so, the count assertion line will need adjustment:

Run: `node --import tsx tests/ab-split.test.ts 2>&1 | tail -10`

If the test fails with "expected N imports, got M", read the test's source to understand whether N is hard-coded and update accordingly.

- [ ] **Step 5.3: Delete `src/data/blog-posts.ts`**

Run: `git rm src/data/blog-posts.ts`
Expected: `rm 'src/data/blog-posts.ts'`

Verify nothing still imports it:
```bash
grep -rn "data/blog-posts" src/ tests/ scripts/
```
Expected: 0 matches.

- [ ] **Step 5.4: Full test suite**

Run: `node --import tsx tests/blog-hero-image.test.ts 2>&1 | tail -5 && node --import tsx tests/ab-split.test.ts 2>&1 | tail -5 && node --import tsx tests/seo-schemas.test.ts 2>&1 | tail -5 && node --import tsx tests/classify-url.test.ts 2>&1 | tail -5`

Expected: all pass (`# pass N / fail 0`).

- [ ] **Step 5.5: tsc + build verify**

Run: `pnpm exec tsc --noEmit 2>&1 | head -10 && pnpm build 2>&1 | tail -3`
Expected: tsc 0 errors, `Complete! 153 pages generated.`

- [ ] **Step 5.6: Forbidden-files check**

Run:
```bash
git diff --name-only HEAD~5..HEAD | grep -E "^(src/engines/|src/data/tools/|src/data/ai-pricing.json|src/i18n/translations.ts|astro.config.mjs|src/components/(Header|EeatTrustBlock|Category(?!Guides)|CategoryHero|CategoryOtherNav))"
```

Expected: **0 matches** (the `CategoryGuides` is allowed but the negative lookbehind in bash is fragile — manually verify by reading `git log -p HEAD~5..HEAD -- src/components/`).

Allowed components to be touched: only `CategoryGuides.astro` (Task 4.4).

- [ ] **Step 5.7: Commit (1 commit for tests + deletion)**

```bash
git add tests/blog-hero-image.test.ts tests/ab-split.test.ts src/data/blog-posts.ts
git commit -m "refactor(blog): migrate 2 tests to read .md + delete blog-posts.ts"
```

---

## Final Acceptance Checklist

- [ ] All 5 commits on `v2_20260626` branch (Tasks 1, 2, 3, 4, 5)
- [ ] `pnpm check` exit 0 after all 5 tasks
- [ ] `pnpm build` 153 pages (no regression)
- [ ] `tests/blog-hero-image.test.ts` pass (32 posts)
- [ ] `tests/ab-split.test.ts` pass (line 64 swap)
- [ ] `tests/seo-schemas.test.ts` 4/4 pass (unaffected)
- [ ] `tests/classify-url.test.ts` 12/12 pass (unaffected)
- [ ] No diff in `src/engines/`, `src/data/tools/`, `src/data/ai-pricing.json`, `src/i18n/`, `astro.config.mjs`, `src/components/{Header,EeatTrustBlock,CategoryHero,CategoryOtherNav}.astro`
- [ ] `src/data/blog-posts.ts` deleted
- [ ] 32 `src/content/blog/best-*.md` files exist + Zod schema passes
- [ ] `pnpm gen:blog` re-runs successfully (idempotent)
- [ ] Spot-check: 1 blog page dist HTML body content renders same as pre-migration (split('\n') → <p>)
- [ ] Pushed to `origin` (gitee/calcKit) and `github` (wlz679/forgeflow)
- [ ] `master` branch NOT touched

## Rollback

```bash
git revert <plan2-first-sha>..<plan2-last-sha>  # 5 commits
```

Then manually restore `src/content/blog/*.md` removal:
```bash
git rm -r src/content/blog/  # since git revert doesn't remove untracked-but-now-tracked files... wait, they're tracked, so revert handles it
```

Re-verifies:
- `src/data/blog-posts.ts` restored with original 32 posts
- 8 consumer files re-import `blogPosts` from `data/blog-posts`
- 2 test files re-import `blogPosts` from `data/blog-posts`
- 32 .md files untracked again (revert will recreate the deletion commit which removes them)

## Notes for Implementer

- **Don't skip pre-flight findings** — there are 7 drifts that materially affect how to write the code (especially Drift #6 about the ab-split test count).
- **All 5 tasks are sequential** because each builds on the previous:
  - Task 1 → empty collection schema (no consumers affected yet)
  - Task 2 → 32 .md files exist (but no consumers read them yet)
  - Task 3 → adapter ready (but no consumers call it yet)
  - Task 4 → 8 consumers migrated (but tests + old file still reference blog-posts.ts)
  - Task 5 → tests migrated + old file deleted (clean state)
  - **Don't try to combine tasks** — keeps each diff small and reviewable.
- **Task 2 is the riskiest** because of frontmatter YAML escaping (Drift #4). If `pnpm build` fails with Zod validation errors after Task 2, the most likely cause is an unescaped character in `excerpt` or `title`. Run `pnpm build 2>&1 | grep -A 3 "blog/"` to see which file(s) failed.
- **Task 4 step 4.3 has 6 nearly-identical edits** — consider using a subagent with `multi_file_edit` if your harness supports it, or just grind through it manually with copy-paste + sed.
- **Byte-equivalent verification is light** in this plan because the body content is template-generated and the generator script is deterministic. The real validation is `pnpm build` succeeding with 153 pages and the spot-check grep in Step 4.7.
- **Push after all 5 tasks complete** (not after each task) — keeps the PR atomic.
- **Don't push to master** — only to `v2_20260626` on both remotes, per user explicit constraint.
- **`pnpm gen:blog` is idempotent** — re-running produces identical files (deterministic tools.map() iteration + fixed template). If you need to add a new blog post in the future, run the generator to bootstrap, then hand-edit the .md file.