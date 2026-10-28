#!/usr/bin/env node
// P155 — AdSense「低价位内容」结构修复守卫。
//
// 为什么存在这个守卫
// ------------------
// 2026-10-27 AdSense 复审给出「低价位内容」，政策三条里第 ② 条是「持续精选
// 优质内容和**维护网站页面结构**」。实测（Search Console 导出 + 645 个 URL
// 逐个验活）站上有三处结构性硬伤：
//
//   1. **198 个已删除的 /blog/* URL 仍是硬 404**（合计 2,526 次展示 =
//      索引展示的 18.9%），没有任何重定向。旧的 blog slug 一律是
//      `best-` + 工具 slug，而那个工具页至今仍在 —— 实测 196/196 能映射到
//      活着的工具页，剩下 2 条是 blog 索引页。
//   2. **history / favorites / recent 三个空壳页被索引**：它们是 per-user
//      localStorage 页面，可见文字只有几百字符，却带着正常 title/robots
//      被 Google 收录并排名。
//   3. **根 `/` 是 821 字节的无标题跳转壳**：没有 `<title>`、没有 canonical、
//      没有一行可见文字，而品牌词 `forgeflowkit.com` 在 GSC 里排第 31.97
//      位 —— 域名自己的首页没有落地页。
//
// 这个守卫钉住修复后的性质，防止有人把修复改回去：
//
//   A. /blog/* → 工具页的 301 映射（含「目标页必须真的存在」这条硬约束）
//   B. 三个壳页 noindex + 移出 sitemap
//   C. 根页的 title / canonical / hreflang / 可见内容
//   D. 2.0 落点清单的数据自洽性（口径写死在文件里，不从别处推导）
//
// source-only：不依赖构建产物，所以 `pnpm check` 也会跑它。

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';

import { stripComments } from './build-dep-suites.mjs';
import { resolveBlogRedirect } from '../src/lib/blog-redirects.ts';
import { tools } from '../src/data/tools/index.ts';
import {
  PRIORITY_PAGES,
  PRIORITY_PAGE_COUNT,
  PRIORITY_TOOL_SLUGS,
  PRIORITY_IMPRESSIONS,
  P1_PAGE_COUNT,
  TOTAL_SITE_IMPRESSIONS,
  CANDIDATE_IMPRESSIONS,
  INDEXED_URL_COUNT,
  AGGREGATED_PAGE_COUNT,
  CANDIDATE_PAGE_COUNT,
  REDIRECTED_IMPRESSIONS_TOTAL,
  REDIRECTED_IMPRESSIONS_IN_LIST,
} from '../src/data/priority-pages.ts';

const root = resolve(import.meta.dirname, '..');

const MIDDLEWARE = resolve(root, 'src', 'middleware.ts');
const BLOG_ROUTE = resolve(root, 'src', 'pages', '[lang]', 'blog', '[...slug].astro');
const ASTRO_CONFIG = resolve(root, 'astro.config.mjs');
const BASE_LAYOUT = resolve(root, 'src', 'layouts', 'BaseLayout.astro');
const ROOT_INDEX = resolve(root, 'src', 'pages', 'index.astro');
const PRIORITY_DATA = resolve(root, 'src', 'data', 'priority-pages.ts');

const SHELL_PAGES = [
  resolve(root, 'src', 'pages', '[lang]', 'history.astro'),
  resolve(root, 'src', 'pages', '[lang]', 'favorites.astro'),
  resolve(root, 'src', 'pages', '[lang]', 'recent.astro'),
];

function readOrFail(p: string): string {
  assert.ok(existsSync(p), `${relative(root, p)} does not exist`);
  return readFileSync(p, 'utf8');
}

/** 源码去注释后再做文本判据 —— 否则注释里写一句「这里是 302」就能骗过守卫。 */
function codeOf(p: string): string {
  return stripComments(readFileSync(p, 'utf8'));
}

const toolSlugs = new Set(tools.map((t) => t.slug));

// 标准 JS 正则字面量解析：(?:[^/\\]|\\.)+ 匹配正则体（`\/` 是转义斜杠），
// 尾部的 [a-z]* 是 flags。注意第一版把定界符也吞进了捕获组，源变成
// "/^…$/" ⇒ 造出来的正则永远不匹配 —— 守卫红在提取上，不在实现上。
const SHELL_PAGE_RE = (() => {
  const cfg = readOrFail(ASTRO_CONFIG);
  const m = /const\s+SHELL_PAGE_RE\s*=\s*\/((?:[^/\\]|\\.)+)\/([a-z]*);/.exec(cfg);
  assert.ok(m, 'astro.config.mjs must declare SHELL_PAGE_RE');
  return new RegExp(m[1], m[2]);
})();

// ───────────────────────────────────────────────────────────────────
// A. 301：已删除的 /blog/* URL 回工具页
// ───────────────────────────────────────────────────────────────────

test('a deleted blog URL redirects to its tool page in the same language', () => {
  assert.equal(
    resolveBlogRedirect('/en/blog/best-solopreneur-acv-calculator/'),
    '/en/solopreneur-acv-calculator/',
    'the deleted blog URL must land on the tool page it used to promote',
  );
  assert.equal(
    resolveBlogRedirect('/zh/blog/best-solopreneur-acv-calculator/'),
    '/zh/solopreneur-acv-calculator/',
    'the zh variant must land on the zh tool page, not the en one',
  );
});

test('the deleted blog index redirects to the language homepage', () => {
  assert.equal(resolveBlogRedirect('/en/blog/'), '/en/');
  assert.equal(resolveBlogRedirect('/zh/blog/'), '/zh/');
});

test('the blog redirect accepts the URL with or without a trailing slash', () => {
  // GSC 的「网页」表里两种写法都出现过（实测 56 组）—— 只认带斜杠的写法，
  // 会让其中一半的 404 继续 404。
  assert.equal(
    resolveBlogRedirect('/en/blog/best-solopreneur-acv-calculator'),
    '/en/solopreneur-acv-calculator/',
  );
  assert.equal(resolveBlogRedirect('/en/blog'), '/en/');
});

test('live pages are not hijacked by the blog redirect', () => {
  assert.equal(resolveBlogRedirect('/en/solopreneur-acv-calculator/'), null);
  assert.equal(resolveBlogRedirect('/en/saas-metrics/'), null);
  assert.equal(resolveBlogRedirect('/'), null);
});

test('a blog URL whose tool page does not exist is left as a 404', () => {
  // 这是本守卫最要紧的一条：301 → 404 比 404 更糟（它把权重永久交给
  // 另一个 404）。所以不存在的目标必须老实返回 null。
  assert.equal(
    resolveBlogRedirect('/en/blog/best-no-such-tool-exists-xyz/'),
    null,
    'a blog slug with no live tool page must NOT be redirected — redirecting to ' +
      'a missing page hands its link equity to another 404.',
  );
});

test('every redirect target is itself a registered tool page', () => {
  // 穷举注册表里的每一个 slug：凡是被 301 的，目标必须仍然在注册表里。
  // 这条把「301 不可能指向不存在的页面」从口头承诺变成可执行断言。
  const targets: string[] = [];
  for (const slug of toolSlugs) {
    for (const lang of ['en', 'zh']) {
      const target = resolveBlogRedirect(`/${lang}/blog/best-${slug}/`);
      assert.ok(target, `/${lang}/blog/best-${slug}/ must redirect`);
      targets.push(target);
    }
  }
  const missing = targets.filter((t) => !toolSlugs.has(t.split('/')[2]));
  assert.deepEqual(
    missing,
    [],
    'every 301 target must be a registered tool page; these are not: ' + missing.join(', '),
  );
});

test('the middleware issues a 301, not a temporary redirect', () => {
  // 旧的 blog URL 已经被删除，这是把权重搬回活页面 —— 永久重定向。
  // 302/307 会让 Google 继续按原 URL 抓那个 404。
  const code = codeOf(MIDDLEWARE);
  assert.match(
    code,
    /context\.redirect\(\s*target\s*,\s*301\s*\)/,
    'src/middleware.ts must redirect with status 301 — a 302 would leave Google ' +
      'crawling the 404 indefinitely.',
  );
  assert.ok(
    !/\bcontext\.redirect\([^)]*\b(302|307|308)\b/.test(code),
    'the middleware must not use a temporary redirect status for the blog mapping.',
  );
});

test('the blog route is rendered on demand — that is what makes the 301 fire at all', () => {
  // 这一条是整条链路的**承重墙**。
  //
  // 实测（2026-10-28，wrangler pages dev）：第一版把 301 放在 middleware 里，
  // 而 /en/blog/* 在本站**没有任何页面** ⇒ 落进 404 路由 ⇒ 404.astro 是
  // **预渲染**的 ⇒ middleware 根本不参与 ⇒ `/en/blog/best-…/` 返回
  // **404 且没有 Location 头**。构建照样 exit 0。
  //
  // 改成 `export const prerender = false` 之后，这条 URL 面才由 Function 处理，
  // middleware 才会跑，301 才真的发得出去（实测 5/5 通过）。
  //
  // 一旦有人把它改回预渲染，301 会**静默**失效（站点变成 404，但没有报错）。
  const code = codeOf(BLOG_ROUTE);
  assert.match(
    code,
    /export\s+const\s+prerender\s*=\s*false/,
    'src/pages/[lang]/blog/[...slug].astro must set `export const prerender = false` — ' +
      'a prerendered route is served by the static asset layer, which never runs ' +
      'middleware, so the 301 would silently stop working.',
  );
});

test('the blog route answers unknown blog URLs with a real 404, not a soft one', () => {
  // 200 + 404 页 = soft 404 ⇒ Google 会把它当正常页面索引。
  //
  // ⚠️ 判据必须断**那个带 404 正文的响应**，不能只断「文件里出现过
  // `new Response(... status: 404)`」—— 这个文件里有两个 Response（一个是
  // lang 校验的 `new Response(null, { status: 404 })`），用宽松正则会匹配到
  // 第一个，于是把真正那个响应的状态码改成 200 也照样绿（变异台子实测）。
  const code = codeOf(BLOG_ROUTE);
  assert.match(
    code,
    /new\s+Response\(\s*body\s*,\s*\{[^}]*status:\s*404/,
    'the blog route must return the 404 body with status 404 for blog URLs that ' +
      'map to no tool page.',
  );
  assert.ok(
    !/status:\s*200/.test(code),
    'the blog route must never answer with 200 — a soft 404 gets indexed as a ' +
      'normal page.',
  );
  assert.ok(
    !/Astro\.rewrite\(\s*['"]\/404['"]\s*\)/.test(code),
    'the blog route must not rewrite to /404: 404.astro is a PRERENDERED route, ' +
      'so it has no page component in the server bundle — Astro.rewrite() throws ' +
      '"TypeError: module.page is not a function" and the request 500s (measured ' +
      '2026-10-28).',
  );
});

test('the blog redirect logic lives in a pure module, not inline in the middleware', () => {
  // 纯逻辑单独成文件 ⇒ 守卫可以直接 import 测它，不用起服务器。
  assert.ok(existsSync(resolve(root, 'src', 'lib', 'blog-redirects.ts')));
  const code = codeOf(MIDDLEWARE);
  assert.match(code, /resolveBlogRedirect/, 'the middleware must delegate to resolveBlogRedirect');
});

// ───────────────────────────────────────────────────────────────────
// B. 壳页：noindex + 移出 sitemap
// ───────────────────────────────────────────────────────────────────

test('every per-user shell page asks for noindex', () => {
  for (const p of SHELL_PAGES) {
    const code = codeOf(p);
    assert.match(
      code,
      /robots\s*=\s*["']noindex,\s*follow["']/,
      `${relative(root, p)} must pass robots="noindex, follow" to BaseLayout — these ` +
        'pages render the visitor\'s own localStorage, so the server-rendered copy ' +
        'is an empty shell that must not be indexed.',
    );
  }
});

test('the layout emits the robots prop instead of hard-coding index, follow', () => {
  const code = codeOf(BASE_LAYOUT);
  assert.match(
    code,
    /<meta\s+name=["']robots["']\s+content=\{robots\}\s*\/?>/,
    'BaseLayout.astro must render <meta name="robots" content={robots} /> — ' +
      'hard-coding "index, follow" there makes the noindex prop a no-op.',
  );
  assert.match(code, /robots\s*\?\s*:\s*string/, 'BaseLayout.astro must declare the robots prop');
});

test('the sitemap filter excludes every shell page and nothing else', () => {
  for (const p of ['/en/history', '/en/favorites', '/en/recent', '/zh/history', '/zh/favorites', '/zh/recent']) {
    assert.ok(SHELL_PAGE_RE.test(p), `${p} must be excluded from the sitemap`);
  }
  for (const p of ['/en/', '/en/saas-metrics', '/en/solopreneur-acv-calculator', '/zh/about']) {
    assert.ok(!SHELL_PAGE_RE.test(p), `${p} must NOT be excluded from the sitemap`);
  }
});

test('the sitemap filter actually works when the integration calls it', () => {
  // ⚠️ 这一条是「行为判据」，不是文本判据。
  //
  // 第一版的守卫只查 `filter: (…) => !SHELL_PAGE_RE.test(...)` 这个**形状**，
  // 于是下面这个真实回归 100% 逃逸：
  //     filter: (page) => !SHELL_PAGE_RE.test(new URL(page.url).pathname)
  // @astrojs/sitemap 的 filter 收到的是 **URL 字符串**（.d.ts:
  // `filter?(page: string): boolean`；实现里是 `pageUrls.filter(filter)`，
  // pageUrls 是 string[]）⇒ `page.url` 是 undefined ⇒ `new URL(undefined)`
  // 抛 "Invalid URL" ⇒ 集成自己的 catch 直接 return ⇒ **一个 sitemap 都没写**，
  // 而构建依然 exit 0。
  //
  // 教训：文本判据抓不到「把条件改坏」。所以这里把 astro.config.mjs 里那个
  // filter 表达式**原样取出来、当成真函数跑一遍**。
  const cfg = stripComments(readOrFail(ASTRO_CONFIG));
  const m = /filter:\s*(\([^)]*\)\s*=>\s*[^\n]*?),?\s*\n/.exec(cfg);
  assert.ok(m, 'astro.config.mjs must pass a filter to the sitemap integration');
  const expr = m[1];

  // eslint-disable-next-line no-new-func
  const filter = new Function('SHELL_PAGE_RE', `return (${expr});`)(SHELL_PAGE_RE) as (url: string) => boolean;

  // 集成传进来的是绝对 URL 字符串。
  assert.equal(
    filter('https://forgeflowkit.com/en/solopreneur-acv-calculator/'),
    true,
    'a normal page must stay in the sitemap',
  );
  assert.equal(
    filter('https://forgeflowkit.com/en/history/'),
    false,
    'the history shell must be filtered out',
  );
  assert.equal(
    filter('https://forgeflowkit.com/zh/recent/'),
    false,
    'the recent shell must be filtered out',
  );
});

// ───────────────────────────────────────────────────────────────────
// C. 根页：品牌落地页
// ───────────────────────────────────────────────────────────────────

test('the root page carries a title, a canonical link and visible text', () => {
  const src = readOrFail(ROOT_INDEX);
  assert.match(src, /<title>[^<]+<\/title>/, 'the root page needs a <title>');
  assert.match(
    src,
    /<link\s+rel=["']canonical["']\s+href=\{`\$\{SITE_URL\}\/`\}\s*\/?>/,
    'the root page needs a canonical link pointing at the site root',
  );
  assert.match(
    src,
    /const\s+SITE_URL\s*=\s*["']https:\/\/forgeflowkit\.com["']/,
    'the root page must resolve SITE_URL to the apex domain',
  );
  assert.match(src, /<h1[^>]*>[^<]+<\/h1>/, 'the root page needs visible text (an h1)');
  // 之前根页是 821 字节的 meta-refresh 壳，一行可见文字都没有。
  const text = src.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  assert.ok(text.length > 80, `the root page must render real copy, got ${text.length} chars of text`);
});

test('the root page advertises all three hreflang variants', () => {
  const src = readOrFail(ROOT_INDEX);
  assert.match(src, /hreflang=["']en["']/, 'the root page needs an en alternate');
  assert.match(src, /hreflang=["']zh["']/, 'the root page needs a zh alternate');
  assert.match(src, /hreflang=["']x-default["']/, 'the root page needs an x-default alternate');
  assert.match(src, /<meta\s+name=["']robots["']\s+content=["']index,\s*follow["']/);
});

test('the root page only auto-redirects visitors who already chose a language', () => {
  // yt-lang cookie 全站从未被设置过（grep 全仓库只有这一处读取）⇒ 旧代码里
  // `m ? m[1] : 'en'` 的兜底是唯一生效的分支：每个访客都被丢进英文首页。
  const src = readOrFail(ROOT_INDEX);
  const scripts = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const code = scripts.join('\n');
  assert.match(code, /yt-lang=/, 'the root page must read the yt-lang cookie');
  assert.match(
    code,
    /if\s*\(\s*m\s*\)\s*window\.location\.replace\(/,
    'the redirect must be guarded by "the visitor picked a language" — an ' +
      'unguarded redirect sends every first-time visitor to the English homepage.',
  );
  assert.ok(
    !/window\.location\.replace\([^)]*:\s*["'](en|zh)["']/.test(code),
    'the root page must not fall back to a default language on redirect — the ' +
      'yt-lang cookie is never written anywhere, so a fallback makes English the ' +
      'only reachable homepage for every visitor.',
  );
});

// ───────────────────────────────────────────────────────────────────
// D. 2.0 落点清单：口径自洽
// ───────────────────────────────────────────────────────────────────

test('the priority list counts agree with the list it ships', () => {
  assert.equal(PRIORITY_PAGES.length, PRIORITY_PAGE_COUNT);
  assert.equal(
    PRIORITY_PAGES.reduce((a, p) => a + p.impressions, 0),
    PRIORITY_IMPRESSIONS,
  );
});

test('the priority list really covers 80% of the candidate impressions', () => {
  assert.ok(
    PRIORITY_IMPRESSIONS >= CANDIDATE_IMPRESSIONS * 0.8,
    `the priority list holds ${PRIORITY_IMPRESSIONS} of ${CANDIDATE_IMPRESSIONS} ` +
      `candidate impressions (${((PRIORITY_IMPRESSIONS / CANDIDATE_IMPRESSIONS) * 100).toFixed(1)}%), ` +
      'below the 80% it is supposed to cover.',
  );
});

test('the measured constants are the ones Search Console actually produced', () => {
  // 期望值写死，不从别处推导：这些数字是 2026-10-27 导出的实测值。
  assert.equal(TOTAL_SITE_IMPRESSIONS, 13383, '网页.csv 的逐页展示合计');
  assert.equal(INDEXED_URL_COUNT, 645, '网页.csv 的 URL 行数');
  assert.equal(AGGREGATED_PAGE_COUNT, 565, '按 pathname 聚合后的页面数');
  assert.equal(CANDIDATE_IMPRESSIONS, 13164, '候选页展示合计（活页扣掉壳页）');
  assert.equal(CANDIDATE_PAGE_COUNT, 398, '候选页数');
  assert.equal(P1_PAGE_COUNT, 38, '贡献 50% 展示的页面数');
  assert.equal(PRIORITY_PAGE_COUNT, 117, '贡献 80% 展示的页面数');
  assert.equal(PRIORITY_IMPRESSIONS, 10557, '清单内展示合计');
});

test('the priority list contains no shell page', () => {
  const shells = PRIORITY_PAGES.filter((p) =>
    /^\/(en|zh)\/(history|favorites|recent)\/?$/.test(p.path),
  );
  assert.deepEqual(
    shells.map((s) => s.path),
    [],
    'the shell pages are being noindexed — investing 2.0 content in them is ' +
      'throwing the work away.',
  );
});

test('every tool slug in the priority list is a registered tool', () => {
  const unknown = PRIORITY_TOOL_SLUGS.filter((s) => !toolSlugs.has(s));
  assert.deepEqual(
    unknown,
    [],
    'PRIORITY_TOOL_SLUGS must only contain registered tool slugs; unknown: ' + unknown.join(', '),
  );
});

test('the priority list carries the 301-merged impressions for the pages that received them', () => {
  // 404 的 blog URL 不是独立页面 —— 它们的展示会通过 301 归到工具页。
  // 如果清单里没有 redirectedImpressions 这一列，2.0 的施工方就看不到
  // 「这个页面其实还在吃一大块旧 blog 的流量」。
  const merged = PRIORITY_PAGES.filter((p) => p.redirectedImpressions > 0);
  assert.ok(
    merged.length > 0,
    'no page records redirectedImpressions — the blog 404s were not merged into ' +
      'their 301 targets, so the list understates the demand on those pages.',
  );
  const total = merged.reduce((a, p) => a + p.redirectedImpressions, 0);
  assert.equal(
    total,
    REDIRECTED_IMPRESSIONS_IN_LIST,
    'the merged impressions recorded on the list must add up to the constant the ' +
      'data file declares',
  );
  assert.equal(
    REDIRECTED_IMPRESSIONS_TOTAL,
    2526,
    'all 198 dead blog URLs carried 2,526 impressions, and every one of them ' +
      'maps to a live tool page — none may be dropped.',
  );
  assert.ok(
    REDIRECTED_IMPRESSIONS_IN_LIST <= REDIRECTED_IMPRESSIONS_TOTAL,
    'the list cannot hold more merged impressions than the whole site has',
  );
});

test('the priority data file states its own measurement window and caveats', () => {
  // 口径写进文件本体（而不是只存在于某次对话里）—— 下一个人改这个文件时
  // 必须先看见这些前提。
  const src = readOrFail(PRIORITY_DATA);
  assert.match(src, /2026-10-27/, 'the file must carry the measurement date');
  assert.match(src, /9,554/, 'the file must state the chart-table total');
  assert.match(src, /13,383/, 'the file must state the page-table total');
  // 必须断**整句**而不是「文件里出现过 59」—— 后者会被任何含 59 的数字
  // 满足，删掉整段口径说明也照样绿。
  assert.ok(
    src.includes('「21 页 / 59 页」是**错的**'),
    'the file must record that the earlier 21/59 figures were wrong',
  );
  assert.match(src, /noindex/, 'the file must record that shell pages are excluded');
});
