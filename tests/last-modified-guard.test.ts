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

// ============================================================
// ⛔ P168 B3-6（2026-11-11）—— 本文件**不再**断言 lastmod 的「值」
// ============================================================
//
// 被删掉的那条断言是：`lastmod values are valid ISO timestamps within 7 days of now`。
//
// ⭐⭐ **它当年正是在给 bug 背书**，必须说清楚为什么删：
//   ① 它要求「lastmod ≈ 现在」⇒ 只有「每次部署都刷新全部 lastmod」才能满足
//      ⇒ **它就是那个 bug 的守卫**，而不是它的防线。
//   ② B3-6 修好之后（lastmod = 内容的 git 变更时间），实测 **431 个 URL 里 192 个**
//      的真实内容时间在 7 天之外（最老的一个 2026-07-25）
//      ⇒ **内容没变的页面如实报旧时间**才是正确行为，这条断言会把「说实话」判成失败。
//   ③ 它抽查的是**前 20 个** URL —— 恰恰漏掉了 2026-09-29 / 2026-07-25 这两个真值
//      （实测它们排在第 4 位和末尾附近 ⇒ 抽查恰好能撞上，也恰好说明抽查不可靠）。
//
// ⭐ 覆盖**没有丢失**：值层的判据整体移交
//   `tests/sitemap-lastmod-accuracy-guard.test.ts`（P168 B3-6 新增），且更强：
//   · **全部** 431 条（不是抽 20 条）逐条检查；
//   · 判据从「时间在 7 天内」换成「**等于某个内容源文件的 git 变更时间**」
//     （⇒ ISO 合法性由「能被 Date.parse 且落在 git 时间集合里」一并保证，更严）；
//   · 外加两条源码层断言（路径形态无关性 + 真相源 = git 内容时间）。
//
// ⇒ 本文件**只守结构层**：meta tag 在不在、sitemap 每条 URL 有没有 lastmod。
//   （一个不变量只守一处 ⇒ 值层归新守卫，结构层归本守卫。）
