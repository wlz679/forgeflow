#!/usr/bin/env node
// P165 — 分类页的结构化数据守卫（build-dep）。
//
// 为什么需要这个守卫
// ------------------
// 2026-11-02 接决策层时普查模板，发现 **15 个分类页有两种模板**：
//
//   · full（6 页）—— CategoryHero + 介绍段 + 工具网格 + CategoryFaq + CategoryGuides
//                  + comparisonTopics + JSON-LD（CollectionPage + BreadcrumbList + ItemList）
//   · lean（9 页）—— 只有 h1+描述 + 工具网格 + topics + 其它分类导航
//     ⇒ **lean 页没有任何分类页级 JSON-LD**（产物里只有站点级的 WebSite/SearchAction）
//     ⇒ 少 BreadcrumbList（拿不到面包屑富结果）与 ItemList（工具清单富结果）。
//
// 这不是「内容多少」的问题，是**同一类页面模板不一致**：6 页有、9 页没有。
// P165 把 9 页补成同形，本守卫钉死「每个分类页都有这三类 schema」，
// 防止以后新加的分类页又落回 lean 形态。
//
// ⚠️ 断言必须**逐页**查，不能只查一个代表页：这类缺陷天然是「一部分页有、一部分页没有」
//   —— 查全站平均值会把 9/15 的缺失稀释掉。
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern)

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { categories } from '../src/data/categories.ts';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'en', 'saas-metrics', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p165] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

/**
 * 取出页面里所有 application/ld+json 块的 @type 集合。
 *
 * ⚠️ 必须**递归**收集：分类页的 ItemList 不是 `@graph` 的顶层节点，而是
 *    `CollectionPage.hasPart` 里的**嵌套**节点（seo-factory.ts:32
 *    `hasPart: createCategoryItemList(...)`）。只扫顶层 ⇒ 30 页全部误判为
 *    「缺 ItemList」⇒ 守卫恒红；而「只扫顶层」本身也正是**这一类模板缺陷
 *    之所以没被发现**的原因（顶层永远只有 CollectionPage + BreadcrumbList）。
 */
function jsonLdTypes(html: string): Set<string> {
  const types = new Set<string>();
  const collect = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const x of node) collect(x);
      return;
    }
    if (!node || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;
    const t = obj['@type'];
    if (typeof t === 'string') types.add(t);
    else if (Array.isArray(t)) for (const x of t) if (typeof x === 'string') types.add(x);
    // 继续往里走（hasPart / mainEntity / itemListElement …）
    for (const key of Object.keys(obj)) {
      if (key === '@type') continue;
      collect(obj[key]);
    }
  };
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(m[1]!.trim());
    } catch {
      continue; // 解析不了的块不参与判定（另有 json-ld 守卫管格式）
    }
    const graph = (parsed as Record<string, unknown>)?.['@graph'] ?? [parsed];
    collect(graph);
  }
  return types;
}

/** 分类页必须自带的三类 schema —— 缺任何一类都拿不到对应的富结果 */
const REQUIRED_TYPES = ['CollectionPage', 'BreadcrumbList', 'ItemList'];

for (const cat of categories) {
  for (const lang of ['en', 'zh'] as const) {
    test(`P165: /${lang}/${cat.slug}/ has the category-page schema types`, () => {
      ensureBuilt();
      const file = resolve(root, 'dist', lang, cat.slug, 'index.html');
      assert.ok(existsSync(file), `dist/ has no /${lang}/${cat.slug}/ page`);
      const types = jsonLdTypes(readFileSync(file, 'utf-8'));
      const missing = REQUIRED_TYPES.filter((t) => !types.has(t));
      assert.deepEqual(
        missing,
        [],
        `/${lang}/${cat.slug}/ is missing ${missing.join(', ')} in its JSON-LD ` +
          `（现在有：${[...types].sort().join(', ')}）—— ` +
          '分类页必须与 full 模板同形，否则拿不到面包屑与工具清单富结果',
      );
    });
  }
}

test('P165: 守卫覆盖全部分类（防止新分类页落回 lean 形态）', () => {
  // 期望值写死：15 个分类。分类增减时这里必须跟着改（这是一条显式的提醒，不是自动跟随）。
  assert.equal(categories.length, 15, `expected 15 categories, got ${categories.length}`);
});

test('P165: 类型收集器看得见嵌套的 @type（否则它会恒红或恒绿）', () => {
  // 为什么需要这条自检
  // ------------------
  // 分类页的 ItemList 藏在 `CollectionPage.hasPart` 里，不在 `@graph` 顶层。
  // 一个只扫顶层的收集器会把 **30/30 页**判成「缺 ItemList」（恒红）；
  // 而如果把断言写成「顶层有 ItemList」，它又会永远看不到真正的 ItemList（恒绿）。
  // ⇒ 收集器的**能力**本身必须被断言，否则它既可以是错的、也可以是废的。
  const nested = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        hasPart: { '@type': 'ItemList', itemListElement: [{ '@type': 'ListItem', position: 1 }] },
      },
    ],
  });
  const html = `<script type="application/ld+json">${nested}</script>`;
  const types = jsonLdTypes(html);
  assert.ok(types.has('ItemList'), `类型收集器没看见嵌套的 ItemList，实际：${[...types].join(', ')}`);
  assert.ok(types.has('CollectionPage'), `类型收集器没看见顶层 CollectionPage，实际：${[...types].join(', ')}`);
});
