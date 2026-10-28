#!/usr/bin/env node
// P155 — sitemap 存在性与内容守卫（build-dep）。
//
// 为什么存在这个守卫
// ------------------
// P155 的第一版 sitemap filter 写错了：
//
//     filter: (page) => !SHELL_PAGE_RE.test(new URL(page.url).pathname)
//
// `@astrojs/sitemap` 的 filter 收到的是 **URL 字符串**
// （其 .d.ts 写明 `filter?(page: string): boolean`；实现里是
// `pageUrls.filter(filter)`，而 `pageUrls` 是 `string[]`）
// ⇒ `page.url` 是 `undefined` ⇒ `new URL(undefined)` 抛 `TypeError: Invalid URL`
// ⇒ 集成自己的 catch 块 `logger.error(...)` 之后 **直接 return**
// ⇒ **dist/ 里一个 sitemap 文件都没有**，而构建依然 exit 0。
//
// 这类失败有三个要命的地方：
//   1. 构建是绿的（exit 0）—— CI 不会因为它红；
//   2. `dist/` 里少文件这件事不在任何现有守卫的检查范围内
//      （`sitemap-url-coverage-guard` 走的是 dist/<lang>/**/index.html，
//      不读 sitemap）；
//   3. `robots.txt` 仍然指着 `https://forgeflowkit.com/sitemap-index.xml`
//      ⇒ 站点对外宣称有 sitemap，实际 404。
//
// 所以这个守卫专门盯**产物文件本身**：
//   1. `dist/sitemap-0.xml` 必须存在（生成阶段抛异常 ⇒ 缺席）
//   2. 三个 per-user 壳页不得出现在 sitemap 里
//   3. 根 URL 的 hreflang 必须是 en→/en/、zh→/zh/、x-default→/
//      （改之前三个全指向 `/`）
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern)

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

const SITEMAP = resolve(root, 'dist', 'sitemap-0.xml');

/** Run `pnpm build` if dist/sitemap-0.xml missing. */
function ensureBuilt(): void {
  if (existsSync(SITEMAP)) return;
  console.log('[p155] dist/sitemap-0.xml missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

function sitemapXml(): string {
  ensureBuilt();
  assert.ok(
    existsSync(SITEMAP),
    'dist/sitemap-0.xml does not exist — the sitemap was NOT generated.\n' +
      'The most likely cause is an exception inside the sitemap integration\'s ' +
      'filter/serialize step: the integration catches it, logs "Error filtering ' +
      'pages" and then returns WITHOUT writing anything, while the build still ' +
      'exits 0. Check the build log for "[@astrojs/sitemap] Error filtering pages".',
  );
  return readFileSync(SITEMAP, 'utf-8');
}

test('the sitemap file is actually generated', () => {
  const xml = sitemapXml();
  assert.ok(xml.includes('<urlset'), 'dist/sitemap-0.xml is not a sitemap');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
  assert.ok(locs.length > 100, `the sitemap looks truncated: ${locs.length} <loc> entries`);
});

test('no per-user shell page is listed in the sitemap', () => {
  const xml = sitemapXml();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
  const shells = locs.filter((loc) =>
    /forgeflowkit\.com\/(en|zh)\/(history|favorites|recent)\/?$/.test(loc),
  );
  assert.deepEqual(
    shells,
    [],
    'these per-user localStorage shells are in the sitemap — they render almost ' +
      'no visible text, and indexed empty shells are exactly what AdSense\'s ' +
      '"低价位内容" item ② ("维护网站页面结构") points at.',
  );
});

test('the root URL in the sitemap advertises the real language homepages', () => {
  const xml = sitemapXml();
  const block = /<url>([\s\S]*?)<\/url>/g;
  let rootBlock: string | null = null;
  for (const m of xml.matchAll(block)) {
    if (/<loc>https:\/\/forgeflowkit\.com\/<\/loc>/.test(m[1]!)) {
      rootBlock = m[1]!;
      break;
    }
  }
  assert.ok(rootBlock, 'the root URL https://forgeflowkit.com/ must be in the sitemap');

  const linkRe = /<xhtml:link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"\s*\/>/g;
  const hreflangs: Record<string, string> = {};
  for (const lm of rootBlock.matchAll(linkRe)) hreflangs[lm[1]!] = lm[2]!;

  assert.equal(
    hreflangs['en'],
    'https://forgeflowkit.com/en/',
    'the root page\'s en alternate must point at /en/ — before P155 all three ' +
      'alternates pointed at "/" itself, i.e. the domain home claimed to be ' +
      'every language.',
  );
  assert.equal(hreflangs['zh'], 'https://forgeflowkit.com/zh/');
  assert.equal(
    hreflangs['x-default'],
    'https://forgeflowkit.com/',
    'the root page\'s x-default must point at the root itself',
  );
});
