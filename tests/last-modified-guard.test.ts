// P149: regression test for Last-Modified header + sitemap <lastmod> injection.
// Catches both removal of meta tag AND removal of sitemap serialize lastmod field.
//
// P153-E2: two fixes.
//   1. The meta-tag test used to spot-check 5 hand-written paths, two of
//      which were blog pages deleted with the blog (32a982e) — so the guard
//      died with ENOENT instead of checking anything. New contract: EVERY
//      HTML file in dist/ carries the meta tag (a full build emits 438;
//      the old list covered 5).
//   2. The suite had no build gate and no build of its own, so it read
//      whatever happened to be in dist/ — on a fresh clone it failed with
//      "dist/ missing — run pnpm build first", and in CI (whose unit-test
//      step runs BEFORE the build step) it depended on an earlier suite
//      having produced dist/. Now it follows the repo's established
//      pattern for build-dependent guards: skip unless RUN_BUILD_TESTS=1,
//      and build dist/ itself if it is missing.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'en', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p149] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

function collectHtml(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectHtml(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

test("dist/ every HTML file has Last-Modified meta tag", () => {
  ensureBuilt();
  const distDir = resolve(root, "dist");
  const htmlFiles = collectHtml(distDir);
  // Non-vacuity: a broken scan (or a half-finished build) would leave this
  // empty and the loop below would pass without checking anything.
  assert.ok(htmlFiles.length >= 50, `dist/ 只有 ${htmlFiles.length} 个 HTML 文件 —— 构建可能未完成`);

  const missing: string[] = [];
  for (const file of htmlFiles) {
    const content = readFileSync(file, "utf8");
    if (!/<meta\s+http-equiv=["']last-modified["']/i.test(content)) {
      missing.push(file.slice(distDir.length + 1).replace(/\\/g, "/"));
    }
  }
  assert.deepEqual(missing, [], `${missing.length} 个页面缺 last-modified meta tag:\n  ${missing.slice(0, 20).join("\n  ")}`);
});

test("sitemap-0.xml has lastmod for every url", () => {
  ensureBuilt();
  const sitemapPath = resolve(root, "dist/sitemap-0.xml");
  const content = readFileSync(sitemapPath, "utf8");
  const urlMatches = content.match(/<url>/g) || [];
  const lastmodMatches = content.match(/<lastmod>/g) || [];
  assert.equal(lastmodMatches.length, urlMatches.length,
    `Mismatch: ${urlMatches.length} <url> but ${lastmodMatches.length} <lastmod>`);
});

test("lastmod values are valid ISO timestamps within 7 days of now", () => {
  ensureBuilt();
  const sitemapPath = resolve(root, "dist/sitemap-0.xml");
  const content = readFileSync(sitemapPath, "utf8");
  const lastmods = [...content.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(m => m[1]);
  assert.ok(lastmods.length > 0, "no lastmod entries found");
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  for (const lm of lastmods.slice(0, 20)) {
    const ts = Date.parse(lm);
    assert.ok(!isNaN(ts), `invalid lastmod: ${lm}`);
    assert.ok(Math.abs(now - ts) < sevenDaysMs, `lastmod ${lm} not within 7 days of now`);
  }
});
