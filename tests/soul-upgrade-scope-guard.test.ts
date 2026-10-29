#!/usr/bin/env node
// P157 — 2.0「灵魂改造」施工范围守卫（source-only）。
//
// 为什么存在这个守卫
// ------------------
// D2 拍的是「只投给贡献 80% 展示的页面」= 117 页这个**候选池**；
// D6 拍的是**施工面**：117 页里哪些真的动、按什么顺序动。
//
// 施工范围是**纯决策**，不写下来就会被悄悄改掉：多投一页 = 白做一轮内容；
// 少投一页 = 那一页永远停在 AdSense 眼里的「低价位内容」上。
// 而这个决策的价值全部来自**它跟实测数字对齐** —— 一旦 GSC 数据更新、
// 清单重新聚合，改动范围就必须是一次**显式重拍**，不能是顺手改了个数字。
//
// 本守卫盯五件事
// --------------
//   1. 施工面 = 112 页（工具 71 + 分类 19 + 主题 22），批次顺序固定。
//   2. 被排除的**具体是哪 5 页**（按 path 钉死，不只钉数量 ——
//      否则「换掉一个成员」数量不变、决策已经变了）。
//   3. 每批次的页数与展示数是**写死的字面量**。
//   4. 施工面与排除集**不相交**，且两者并集 == 清单里的 117 页（不许有孤儿页）。
//   5. 施工面里**不含** home / static —— 样板页上做「灵魂改造」没有语义。
//
// ⚠️ 期望值全部是本文件里**独立写死**的字面量，不是从被测模块导出的常量。
//    （导出常量也要断言，但那是「常量 == 字面量」的第二道，不当第一道。）
//
// Build dependency: none (source-only).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  PRIORITY_PAGES,
  PRIORITY_PAGE_COUNT,
  PRIORITY_IMPRESSIONS,
  SOUL_BATCH_1_IMPRESSIONS,
  SOUL_BATCH_1_PAGE_COUNT,
  SOUL_BATCH_2_IMPRESSIONS,
  SOUL_BATCH_2_PAGE_COUNT,
  SOUL_BATCH_3_IMPRESSIONS,
  SOUL_BATCH_3_PAGE_COUNT,
  SOUL_BATCH_KIND,
  SOUL_BATCH_ORDER,
  SOUL_EXCLUDED_IMPRESSIONS,
  SOUL_EXCLUDED_KINDS,
  SOUL_EXCLUDED_PAGE_COUNT,
  SOUL_SCOPE_COVERAGE_PERCENT,
  SOUL_SCOPE_IMPRESSIONS,
  SOUL_SCOPE_PAGE_COUNT,
  SOUL_UNIQUE_TOOL_SLUG_COUNT,
  soulBatchPages,
  soulScopePages,
} from '../src/data/priority-pages.ts';

/** D6 拍板时写死的排除名单 —— 换成员必须重拍板，不能顺手改 */
const EXCLUDED_PATHS: readonly string[] = [
  '/en',
  '/zh',
  '/en/contact',
  '/en/privacy-policy',
  '/en/about',
];

// ---------------------------------------------------------------------------
// 1. The scope is 112 pages, split into three batches in a fixed order
// ---------------------------------------------------------------------------

test('P157: the 2.0 construction scope is 112 pages', () => {
  assert.equal(soulScopePages().length, 112, 'the 2.0 scope should be 112 pages');
});

test('P157: the batch order is hub → topic → tool', () => {
  assert.deepEqual(
    [...SOUL_BATCH_ORDER],
    ['B1-hub', 'B2-topic', 'B3-tool'],
    'the batch order must stay hub → topic → tool (thinnest / zero-click first)',
  );
});

test('P157: each batch maps to exactly one page kind', () => {
  assert.equal(SOUL_BATCH_KIND['B1-hub'], 'hub');
  assert.equal(SOUL_BATCH_KIND['B2-topic'], 'topic');
  assert.equal(SOUL_BATCH_KIND['B3-tool'], 'tool');
});

test('P157: batch 1 (category hubs) is 19 pages', () => {
  assert.equal(soulBatchPages('B1-hub').length, 19, 'batch 1 should be 19 category pages');
});

test('P157: batch 2 (topic pages) is 22 pages', () => {
  assert.equal(soulBatchPages('B2-topic').length, 22, 'batch 2 should be 22 topic pages');
});

test('P157: batch 3 (tool pages) is 71 pages', () => {
  assert.equal(soulBatchPages('B3-tool').length, 71, 'batch 3 should be 71 tool pages');
});

// ---------------------------------------------------------------------------
// 2. The excluded set is pinned by path, not just by count
// ---------------------------------------------------------------------------

test('P157: exactly five pages are excluded', () => {
  assert.equal(SOUL_EXCLUDED_PAGE_COUNT, 5, '5 pages should be excluded');
  const excluded = PRIORITY_PAGES.filter((p) => SOUL_EXCLUDED_KINDS.includes(p.kind));
  assert.equal(excluded.length, 5, `expected 5 excluded pages, got ${excluded.length}`);
});

test('P157: the excluded pages are exactly the two homepages and three boilerplate statics', () => {
  const excluded = PRIORITY_PAGES.filter((p) => SOUL_EXCLUDED_KINDS.includes(p.kind));
  assert.deepEqual(
    excluded.map((p) => p.path).sort(),
    [...EXCLUDED_PATHS].sort(),
    'the excluded set must be exactly /en, /zh, /en/contact, /en/privacy-policy, /en/about — ' +
      'the two homepages plus the three boilerplate static pages',
  );
});

test('P157: the excluded kinds are home and static only', () => {
  assert.deepEqual([...SOUL_EXCLUDED_KINDS].sort(), ['home', 'static']);
});

// ---------------------------------------------------------------------------
// 3. Impression counts are hard-coded literals
// ---------------------------------------------------------------------------

test('P157: batch 1 covers 1,789 impressions', () => {
  assert.equal(SOUL_BATCH_1_IMPRESSIONS, 1789);
});

test('P157: batch 2 covers 1,748 impressions', () => {
  assert.equal(SOUL_BATCH_2_IMPRESSIONS, 1748);
});

test('P157: batch 3 covers 6,508 impressions', () => {
  assert.equal(SOUL_BATCH_3_IMPRESSIONS, 6508);
});

test('P157: the scope covers 10,045 impressions', () => {
  assert.equal(SOUL_SCOPE_IMPRESSIONS, 10045);
});

test('P157: the scope covers 75.1% of the site impressions', () => {
  assert.equal(SOUL_SCOPE_COVERAGE_PERCENT, 75.1);
});

test('P157: the excluded pages account for 512 impressions', () => {
  assert.equal(SOUL_EXCLUDED_IMPRESSIONS, 512);
});

test('P157: the batch impression counts add up to the scope total', () => {
  const total = SOUL_BATCH_1_IMPRESSIONS + SOUL_BATCH_2_IMPRESSIONS + SOUL_BATCH_3_IMPRESSIONS;
  assert.equal(total, SOUL_SCOPE_IMPRESSIONS, 'the three batches must partition the scope');
});

test('P157: the scope impressions are actually derived from the page list', () => {
  const derived = soulScopePages().reduce((n, p) => n + p.impressions, 0);
  assert.equal(derived, 10045, `scope impressions should derive to 10,045, got ${derived}`);
});

test('P157: the scope covers 75.1% of the whole site', () => {
  const derived = (soulScopePages().reduce((n, p) => n + p.impressions, 0) / 13383) * 100;
  assert.ok(
    Math.abs(derived - 75.1) < 0.05,
    `scope coverage should be ~75.1% of the site total, got ${derived.toFixed(2)}%`,
  );
});

// ---------------------------------------------------------------------------
// 4. Scope and exclusion partition the list — no orphans, no overlap
// ---------------------------------------------------------------------------

test('P157: the scope and the excluded set do not overlap', () => {
  const scopePaths = new Set(soulScopePages().map((p) => p.path));
  const excludedPaths = PRIORITY_PAGES.filter((p) => SOUL_EXCLUDED_KINDS.includes(p.kind)).map(
    (p) => p.path,
  );
  for (const path of excludedPaths) {
    assert.ok(
      !scopePaths.has(path),
      `${path} is both in the scope and in the excluded set — a page must be one or the other`,
    );
  }
});

test('P157: every page in the list is either in scope or excluded', () => {
  const scopePaths = new Set(soulScopePages().map((p) => p.path));
  const excludedPaths = new Set(
    PRIORITY_PAGES.filter((p) => SOUL_EXCLUDED_KINDS.includes(p.kind)).map((p) => p.path),
  );
  const orphans = PRIORITY_PAGES.filter((p) => !scopePaths.has(p.path) && !excludedPaths.has(p.path));
  assert.deepEqual(
    orphans.map((p) => p.path),
    [],
    'these pages are in neither the scope nor the excluded set — every listed page must be decided',
  );
});

test('P157: the three batches partition the scope', () => {
  const batchPaths = new Set(SOUL_BATCH_ORDER.flatMap((b) => soulBatchPages(b).map((p) => p.path)));
  const scopePaths = soulScopePages().map((p) => p.path);
  assert.equal(batchPaths.size, 112, `the batches should cover 112 distinct pages, got ${batchPaths.size}`);
  assert.deepEqual(
    scopePaths.filter((p) => !batchPaths.has(p)).sort(),
    [],
    'every in-scope page must belong to one of the three batches',
  );
});

// ---------------------------------------------------------------------------
// 5. No boilerplate in the scope
// ---------------------------------------------------------------------------

test('P157: the scope contains no home or static page', () => {
  const offenders = soulScopePages().filter((p) => p.kind === 'home' || p.kind === 'static');
  assert.deepEqual(
    offenders.map((p) => p.path),
    [],
    'homepages and boilerplate statics must stay out of the 2.0 scope',
  );
});

test('P157: the tool pages in scope de-duplicate to 53 slugs', () => {
  const slugs = new Set(soulBatchPages('B3-tool').map((p) => p.slug).filter((s): s is string => !!s));
  assert.equal(slugs.size, 53, `the 71 tool pages should cover 53 distinct slugs, got ${slugs.size}`);
  assert.equal(SOUL_UNIQUE_TOOL_SLUG_COUNT, 53);
});

// ---------------------------------------------------------------------------
// 6. The exported constants still match the list they describe
// ---------------------------------------------------------------------------

test('P157: the exported scope constants match the page list', () => {
  assert.equal(SOUL_SCOPE_PAGE_COUNT, soulScopePages().length);
  assert.equal(SOUL_BATCH_1_PAGE_COUNT, soulBatchPages('B1-hub').length);
  assert.equal(SOUL_BATCH_2_PAGE_COUNT, soulBatchPages('B2-topic').length);
  assert.equal(SOUL_BATCH_3_PAGE_COUNT, soulBatchPages('B3-tool').length);
});

test('P157: the priority list itself is unchanged — 117 pages / 10,557 impressions', () => {
  assert.equal(PRIORITY_PAGE_COUNT, 117);
  assert.equal(PRIORITY_IMPRESSIONS, 10557);
});
