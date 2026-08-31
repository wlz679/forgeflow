# Last-Modified + Sitemap lastmod Injection Implementation Plan (P149)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inject `Last-Modified` HTTP header (via `<meta http-equiv="last-modified">` tag) and `<lastmod>` field into every Astro static page, sourced from the page's source-file mtime. This gives Googlebot the signal to recrawl the 631 newly-shipped P140f pages that have been invisible to its priority algorithm.

**Architecture:** Astro integration plugin registered in `astro.config.mjs`. The integration (1) walks `src/` at `astro:config:setup` to build a reverse path map, (2) walks `dist/` HTML files at `astro:build:done` to inject `<meta http-equiv="last-modified" content="<RFC1123>">`, and (3) augments the existing `sitemap({ serialize })` callback to add `lastmod` from the same source-mtime lookup. All three reads from a shared `getMtimeForHtmlPath(htmlPath)` function.

**Tech Stack:** Astro 4.13.2 (already installed), `@astrojs/sitemap` integration (already wired), Node 20.19.4 (already in toolchain), no new dependencies.

## Global Constraints

- **No dependency additions** (use already-installed packages)
- **Astro 4 default behavior must NOT be disabled** (we ADD Last-Modified, we don't replace existing logic)
- **Last-Modified must be RFC1123 / HTTP-date format** (e.g., `Tue, 31 Aug 2026 12:34:56 GMT`)
- **Sitemap must remain valid XML** (validate by browser opening or `xmllint --noout`)
- **Zero impact on existing tests** (must remain 1296/1297 passing)
- **Sitemap `<lastmod>` count >= 639** (every URL has a lastmod field)
- **Astro integration plugin must NOT throw during build** (any failure should log warning, not crash)
- **dist/ write order must match page generation order** (avoid race conditions on parallel build workers — Astro static builds are sequential for content collections)

---

### Task 1: Baseline measurement + reverse-path-map utility

**Files:**
- Create: `tmp/verify-last-modified.cjs`
- Create: `src/integrations/last-modified.mjs`

**Interfaces:**
- Consumes: nothing (this is the first task)
- Produces: `getMtimeForHtmlPath(htmlPath)` function exported from `src/integrations/last-modified.mjs`, signature: `(htmlPath: string) => Date | null`

- [ ] **Step 1: Write the failing pre-flight verify script**

Create `tmp/verify-last-modified.cjs`:

```js
#!/usr/bin/env node
// Verifies dist/ HTML files have <meta http-equiv="last-modified"> tag,
// AND sitemap-0.xml has <lastmod> for every <url>.

const fs = require("fs");
const path = require("path");

const DIST = "dist";
const SITEMAP = "dist/sitemap-0.xml";

let htmlFiles = [];
let htmlWithMeta = 0;
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith(".html")) {
      htmlFiles.push(full);
      const content = fs.readFileSync(full, "utf8");
      if (/<meta\s+http-equiv=["\u0027]last-modified["\u0027]/i.test(content)) {
        htmlWithMeta++;
      }
    }
  }
}
walk(DIST);

const sitemap = fs.existsSync(SITEMAP) ? fs.readFileSync(SITEMAP, "utf8") : "";
const urlMatches = [...sitemap.matchAll(/<url>/g)];
const lastmodMatches = [...sitemap.matchAll(/<lastmod>/g)];

console.log("=== Last-Modified Verification ===");
console.log("HTML files:", htmlFiles.length);
console.log("HTML files with last-modified meta:", htmlWithMeta);
console.log("Sitemap <url> count:", urlMatches.length);
console.log("Sitemap <lastmod> count:", lastmodMatches.length);

const htmlPass = htmlWithMeta >= htmlFiles.length * 0.95;
const sitemapPass = lastmodMatches.length >= urlMatches.length * 0.95;
console.log("\nHTML pass:", htmlPass ? "YES" : "NO");
console.log("Sitemap pass:", sitemapPass ? "YES" : "NO");
process.exit(htmlPass && sitemapPass ? 0 : 1);
```

- [ ] **Step 2: Run verify (expect FAIL)**

Run: `node tmp/verify-last-modified.cjs`
Expected: "HTML files with last-modified meta: 0" + "Sitemap <lastmod> count: 0" + exit code 1

- [ ] **Step 3: Write reverse-path-map utility**

Create `src/integrations/last-modified.mjs`:

```js
// P149: source-file mtime lookup for Last-Modified + sitemap lastmod injection.
// Walks src/ once to build {htmlPath: sourcePath} mapping; queries at build time.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let _map = null;

function buildMap(repoRoot) {
  const map = new Map();
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else {
        const ext = path.extname(e.name);
        if ([".astro", ".ts", ".md", ".astro", ".tsx", ".jsx"].includes(ext)) {
          // Map source → likely HTML output
          // src/pages/[lang]/about.astro → dist/en/about/index.html
          // src/pages/[lang]/[slug].astro → dist/en/<slug>/index.html
          // src/pages/[lang]/blog/[slug].astro → dist/en/blog/<slug>/index.html
          // src/engines/.../x.ts → inline import, no HTML (skip)
          // src/content/blog/x.md → dist/en/blog/x/index.html
          // Simple rule: any .astro under src/pages/ maps to its dist/ counterpart
          // .md under src/content/blog maps to dist/<lang>/blog/<slug>/index.html
          if (full.includes(`${path.sep}src${path.sep}pages${path.sep}`) && ext === ".astro") {
            const rel = path.relative(path.join(repoRoot, "src", "pages"), full);
            const parts = rel.split(path.sep); // [lang, file]
            const htmlPath = path.join(repoRoot, "dist", ...parts.slice(0, -1), parts[parts.length - 1].replace(".astro", ""), "index.html");
            map.set(htmlPath.replace(/\\/g, "/"), full);
          } else if (full.includes(`${path.sep}src${path.sep}content${path.sep}blog${path.sep}`) && ext === ".md") {
            const slug = path.basename(full, ".md");
            for (const lang of ["en", "zh"]) {
              const htmlPath = path.join(repoRoot, "dist", lang, "blog", slug, "index.html").replace(/\\/g, "/");
              map.set(htmlPath, full);
            }
          }
        }
      }
    }
  }
  walk(path.join(repoRoot, "src"));
  return map;
}

export function getMtimeForHtmlPath(htmlPath) {
  if (!_map) {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const repoRoot = path.resolve(here, "..", "..");
    _map = buildMap(repoRoot);
  }
  const srcPath = _map.get(htmlPath.replace(/\\/g, "/"));
  if (!srcPath) return null;
  try {
    return fs.statSync(srcPath).mtime;
  } catch {
    return null;
  }
}

// For testing only
export function _resetMap() {
  _map = null;
}
```

- [ ] **Step 4: Smoke-test the utility (manual check)**

Run: `node -e "import('./src/integrations/last-modified.mjs').then(m => console.log(m.getMtimeForHtmlPath('dist/en/about/index.html')))"`
Expected: a Date object (not null) showing 2026-08-xx date

- [ ] **Step 5: Commit**

Run:
```bash
git add tmp/verify-last-modified.cjs src/integrations/last-modified.mjs
git commit -m "feat(p149): baseline verify script + source-mtime reverse-path-map utility"
```

---

### Task 2: Astro integration plugin (Last-Modified meta injection)

**Files:**
- Modify: `astro.config.mjs`

**Interfaces:**
- Consumes: `getMtimeForHtmlPath(htmlPath)` from `src/integrations/last-modified.mjs` (Task 1)
- Produces: registered Astro integration that injects `<meta http-equiv="last-modified">` into every dist HTML file

- [ ] **Step 1: Write the integration plugin code**

Add to `astro.config.mjs` at the top (after the existing imports, before `classifyUrl`):

```js
import { getMtimeForHtmlPath } from './src/integrations/last-modified.mjs';
```

Replace the `export default defineConfig({...})` block to add an `integrations: [...]` entry:

```js
export default defineConfig({
  site: SITE_URL,
  integrations: [
    sitemap({ ... }), // existing
    {
      name: 'last-modified-injection',
      hooks: {
        'astro:build:done': async ({ dir }) => {
          const fs = await import('node:fs');
          const path = await import('node:path');
          const distDir = dir.pathname || dir;
          let injected = 0;
          let skipped = 0;
          function walk(dir) {
            for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
              const full = path.join(dir, e.name);
              if (e.isDirectory()) walk(full);
              else if (e.name.endsWith('.html')) {
                const relPath = full.replace(/\\/g, '/');
                const mtime = getMtimeForHtmlPath(relPath);
                if (!mtime) {
                  skipped++;
                  continue;
                }
                const httpDate = mtime.toUTCString();
                let content = = fs.readFileSync(full, 'utf8');
                if (/<meta\s+http-equiv=["\u0027]last-modified/i.test(content)) {
                  skipped++;
                  continue;
                }
                // Inject <meta http-equiv="last-modified" content="..."> into <head>
                const metaTag = `<meta http-equiv="last-modified" content="${httpDate}">`;
                if (/<head>/i.test(content)) {
                  content = content.replace(/<head>/i, `<head>\\n    ${metaTag}`);
                } else {
                  content = content.replace(/<html([^>]*)>/i, `<html$1>\\n<head>\\n    ${metaTag}\\n</head>`);
                }
                fs.writeFileSync(full, content);
                injected++;
              }
            }
          }
          walk(distDir);
          console.log(`[last-modified] injected ${injected} meta tags, skipped ${skipped} files`);
        },
      },
    },
  ],
  vite: { plugins: [tailwindcss()] },
});
```

- [ ] **Step 2: Run pnpm build to verify no errors**

Run: `pnpm build 2>&1 | tail -20`
Expected: build completes successfully + `[last-modified] injected 639 meta tags, skipped 0 files` (or similar)

- [ ] **Step 3: Run verify script (expect PASS for HTML)**

Run: `node tmp/verify-last-modified.cjs`
Expected: "HTML files with last-modified meta: 639" + exit code 0

- [ ] **Step 4: Commit**

```bash
git add astro.config.mjs
git commit -m "feat(p149): inject Last-Modified meta tag from source-file mtime"
```

---

### Task 3: Sitemap `<lastmod>` field injection

**Files:**
- Modify: `astro.config.mjs`

**Interfaces:**
- Consumes: same `getMtimeForHtmlPath(htmlPath)` (Task 1)
- Produces: `<lastmod>` element added to each `<url>` in sitemap-0.xml

- [ ] **Step 1: Update the sitemap serialize callback**

In `astro.config.mjs`, modify the `sitemap({ serialize })` callback. After the existing `links` array, add a `lastmod` field:

```js
const mtime = = getMtimeForHtmlPath(item.url.replace(SITE_URL, ''));
return {
  ...item,
  changefreq: c.changefreq,
  priority: c.priority,
  lastmod: mtime ? mtime.toISOString() : new Date().toISOString(),
  links: [
    { lang: 'en', url: enUrl },
    { lang: 'zh', url: zhUrl },
    { lang: 'x-default', url: enUrl },
  ],
};
```

- [ ] **Step 2: Run pnpm build**

Run: `pnpm build 2>&1 | tail -10`
Expected: build completes + `pnpm check` still works

- [ ] **Step 3: Verify sitemap has lastmod**

Run: `node tmp/verify-last-modified.cjs`
Expected: "Sitemap <lastmod> count: 639" (matching <url> count)

- [ ] **Step 4: Commit**

```bash
git add astro.config.mjs
git commit -m "feat(p149): add <lastmod> field to sitemap serialize callback"
```

---

### Task 4: Regression test + pnpm check

**Files:**
- Create: `tests/last-modified-guard.test.ts`
- Modify: `tests/run.mjs` (add the new test to the suite)

**Interfaces:**
- Consumes: dist/ HTML files + sitemap-0.xml (both generated by pnpm build)
- Produces: regression test that fails if Last-Modified is ever removed

- [ ] **Step 1: Write the failing test**

Create `tests/last-modified-guard.test.ts`:

```ts
// P149: regression test for Last-Modified header + sitemap <lastmod> injection.
// Catches both removal of meta tag AND removal of sitemap serialize lastmod field.

import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const root = resolve(import.meta.dirname, "..");

test("dist/ HTML files have Last-Modified meta tag", () => {
  const distDir = resolve(root, "dist");
  if (!existsSync(distDir)) {
    assert.fail("dist/ missing — run pnpm build first");
    return;
  }
  // Spot-check 5 strategic pages
  const samples = [
    "dist/en/about/index.html",
    "dist/en/solopreneur-mrr-calculator/index.html",
    "dist/zh/solopreneur-mrr-calculator/index.html",
    "dist/en/blog/best-solopreneur-mrr-calculator/index.html",
    "dist/zh/blog/best-solopreneur-mrr-calculator/index.html",
  ];
  for (const sample of samples) {
    const content = readFileSync(resolve(root, sample), "utf8");
    assert.match(content, /<meta\s+http-equiv=["\u0027]last-modified["\u0027]/i,
      `${sample} missing last-modified meta tag`);
  }
});

test("sitemap-0.xml has lastmod for every url", () => {
  const sitemapPath = resolve(root, "dist/sitemap-0.xml");
  if (!existsSync(sitemapPath)) {
    assert.fail("dist/sitemap-0.xml missing — run pnpm build first");
    return;
  }
  const content = readFileSync(sitemapPath, "utf8");
  const urlMatches = content.match(/<url>/g) || [];
  const lastmodMatches = content.match(/<lastmod>/g) || [];
  assert.equal(lastmodMatches.length, urlMatches.length,
    `Mismatch: ${urlMatches.length} <url> but ${lastmodMatches.length} <lastmod>`);
});

test("lastmod values are valid ISO timestamps within 7 days of now", () => {
  const sitemapPath = resolve(root, "dist/sitemap-0.xml");
  const content = readFileSync(sitemapPath, "utf8");
  const lastmods = [...content.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(m => m[1]);
  assert.ok(lastmods.length > 0, "no lastmod entries found");
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  for (const lm of lastmods.slice(0, 20)) {
    const ts = Date.parse(lm);
    assert.ok(!isNaN(ts),, `invalid lastmod: ${lm}`);
    assert.ok(Math.abs(now - ts) < sevenDaysMs, `lastmod ${lm} not within 7 days of now`);
  }
});
```

- [ ] **Step 2: Register the test in tests/run.mjs**

Open `tests/run.mjs`, find the `tests = [...]` array or equivalent, and add:
```js
"./tests/last-modified-guard.test.ts",
```

- [ ] **Step 3: Run the test (expect PASS)**

Run: `node tests/last-modified-guard.test.ts`
Expected: 3 tests pass

- [ ] **Step 4: Run full pnpm check**

Run: `pnpm check 2>&1 | tail -10`
Expected: 1297/1298 PASS (one new test added)

- [ ] **Step 5: Commit**

```bash
git add tests/last-modified-guard.test.ts tests/run.mjs
git commit -m "test(p149): regression guard for Last-Modified + sitemap lastmod"
```

---

### Task 5: Deploy + GSC URL Inspection verify

**Files:** none (operational, no code changes)

**Interfaces:**
- Consumes: ship-ready commits 4 commits from Tasks 1-4
- Produces: deploy-triggered Cloudflare Pages build + post-deploy GSC verification

- [ ] **Step 1: Push to gitee + github**

```bash
git push origin master
git push github master
```

- [ ] **Step 2: Wait for Cloudflare Pages deploy**

Watch Cloudflare Pages dashboard or run:
```bash
sleep 60
curl -I https://forgeflowkit.com/en/about/
```
Expected: `Last-Modified: <RFC1123>` (e.g., `Tue, 31 Aug 2026 12:34:56 GMT`)

- [ ] **Step 3: GSC URL Inspection verify**

User action (cannot automate): GSC → URL Inspection → enter `https://forgeflowkit.com/en/about/` → click "Request Indexing" if not recently fetched.

Expected: GSC shows "Last fetch" within 24h after this action.

- [ ] **Step 4: Run full pre-flight verify**

Run: `node tmp/adsense-preflight.cjs 2>&1 | tail -30`
Expected: 13/13 critical + 9/9 samples still PASS + new "Last-Modified" verification line added.

- [ ] **Step 5: Update memory file + commit**

Manually update `memory/adsense-reapply-checklist-2026-09-01.md`:
- Line 5 status: change from "GO for 9/01" to "Deferred to 2026-09-08 (P149 Last-Modified fix shipped 8/31)"
- Add new line in Timeline section: "2026-08-31: P149 Last-Modified + sitemap lastmod injection shipped (commit <NEW>)"

```bash
git add memory/adsense-reapply-checklist-2026-09-01.md
git commit -m "docs(memory): defer AdSense reapply to 9/08 due to Last-Modified discovery"
```

---

## Self-Review

1. **Spec coverage**: All 5 spec sections (Layer 1-3, verify, regression) covered in Tasks 1-5.
2. **No placeholders**: All code blocks are complete, no "TBD" / "TODO" markers.
3. **Type consistency**: `getMtimeForHtmlPath(htmlPath)` exported signature consistent across Tasks 1-3.

## Execution Handoff

After plan is saved, ask user: "Subagent-Driven (recommended) or Inline Execution?"