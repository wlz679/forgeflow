#!/usr/bin/env node
// P156 —— AI cost 页「静态文案 == 交互态」守卫（build-dep）。
//
// 为什么需要 build-dep 版本
// -------------------------
// `tests/ai-cost-scope-guard.test.ts` 盯的是源码里的文案数字。但真正的
// 不一致发生在**产物**上：页面里同时存在
//
//   - 预渲染的静态结果（"Cost Comparison (18 Models)"）
//   - 内联的客户端 customFn（客户端**真正带**的那张模型表）
//
// 而这两个数字之间的差，只有把产物摊开才能看到。本守卫直接读 dist/ 的
// HTML，断言：
//
//   1. 客户端 customFn **实际带的模型集合** == 交互态白名单
//      （src/data/ai-pricing-popular.json）—— 一个不多一个不少
//      ⇒ 客户端没有偷偷背上整份价格表（P156 的核心约束）
//   2. 静态文案宣称的模型数 == 客户端实际带的数量
//      ⇒ 「文案说 138、只能选 18」这种不一致一旦回归，CI 会直接红
//
// ⭐ 测量口径是**数据锚定**的（见 tests/_clientfn-tables.ts）：
//   旧口径按**代码形态**找 `var M={` ⇒ 移植（客户端改由服务端派生）后形态一变
//   就测不到、静默返回 0 ⇒ 守卫会因「形态变了」而红，可用户看到的东西一点没变
//   —— 那是**测错了**，不是**坏了**。
//   新口径：先从产物里取出 clientConfig（define:vars 注入 ⇒ 双重转义的 JSON 串），
//   再按「应该带的模型 key」反查那张表 ⇒ 与变量名、与字面量形态都无关。
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern)

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { extractClientConfig, measureClientTable } from './_clientfn-tables.ts';
import POPULAR from '../src/data/ai-pricing-popular.json';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

const OPENAI_PAGE = resolve(root, 'dist', 'en', 'solopreneur-openai-token-calculator', 'index.html');
const COMPARISON_PAGE = resolve(root, 'dist', 'en', 'solopreneur-ai-api-cost-comparison', 'index.html');

/** Run `pnpm build` if dist/ is missing. */
function ensureBuilt(): void {
  if (existsSync(OPENAI_PAGE)) return;
  console.log('[p156] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

function pageHtml(file: string): string {
  ensureBuilt();
  assert.ok(existsSync(file), `${file} does not exist — the build did not produce this page`);
  return readFileSync(file, 'utf-8');
}

/**
 * 客户端**实际带**的模型 key 集合（从产物里的 clientConfig 量出来）。
 * expectedKeys = 「应该带的」那一组（交互态白名单）⇒ 用来反查是哪张表。
 */
function clientModels(html: string, expectedKeys: string[], slug: string): string[] {
  const cfg = extractClientConfig(html);
  assert.ok(
    cfg && typeof cfg.customFn === 'string',
    `${slug}: the built page does not inline a client customFn (clientConfig missing or unparseable)`,
  );
  const table = measureClientTable(cfg!.customFn!, expectedKeys);
  assert.ok(
    table,
    `${slug}: could not locate the client model table in the inlined customFn ` +
      `(expected it to carry ${expectedKeys.length} model(s))`,
  );
  return table!.models;
}

test('P156: every AI-cost page carries exactly the interactive model set', () => {
  const pages: Array<[string, string[]]> = [
    ['solopreneur-openai-token-calculator', POPULAR.popularModelKeys.openai],
    ['solopreneur-claude-api-cost-calculator', POPULAR.popularModelKeys.anthropic],
    ['solopreneur-gemini-api-cost-calculator', POPULAR.popularModelKeys.google],
    ['solopreneur-deepseek-api-cost-calculator', POPULAR.popularModelKeys.deepseek],
  ];
  for (const [slug, expected] of pages) {
    const html = pageHtml(resolve(root, 'dist', 'en', slug, 'index.html'));
    const models = clientModels(html, expected, slug);
    assert.deepEqual(
      models,
      [...expected].sort(),
      `${slug}: the client must carry EXACTLY the interactive set ` +
        `(${expected.length} models) — one extra model means the client is shipping ` +
        `data the visitor cannot select (P156 bundle-size regression); one missing means ` +
        `a model the page advertises is not actually selectable.`,
    );
  }
});

test('P156: the openai page static copy matches its client table', () => {
  const html = pageHtml(OPENAI_PAGE);
  const expected = POPULAR.popularModelKeys.openai;
  const models = clientModels(html, expected, 'solopreneur-openai-token-calculator');

  const claims = [...html.matchAll(/Cost Comparison \((\d+) Models\)/g)].map((m) => Number(m[1]));
  assert.ok(
    claims.length > 0,
    'the openai page does not state a model count at all — the static copy lost its heading',
  );
  for (const claim of claims) {
    assert.equal(
      claim,
      models.length,
      `the openai page claims "${claim} Models" but the interactive table only carries ` +
        `${models.length} — the visitor is promised a scope the tool cannot deliver`,
    );
  }
});

test('P156: the comparison page static copy matches its client table', () => {
  const html = pageHtml(COMPARISON_PAGE);
  const expected = Object.values(POPULAR.comparisonFlagshipKeys);
  const models = clientModels(html, expected, 'solopreneur-ai-api-cost-comparison');

  const claims = [...html.matchAll(/Comparing (\d+) models across (\d+) providers/g)];
  assert.ok(claims.length > 0, 'the comparison page does not state a model count at all');
  for (const claim of claims) {
    assert.equal(
      Number(claim[1]),
      models.length,
      `the comparison page claims "${claim[1]} models" but the interactive table only ` +
        `carries ${models.length} — the visitor is promised a scope the tool cannot deliver`,
    );
    assert.equal(Number(claim[2]), 4, 'the comparison page must still cover all four providers');
  }
});
