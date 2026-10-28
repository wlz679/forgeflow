#!/usr/bin/env node
// P156 — AI cost 页「模型集口径」守卫（source-only）。
//
// 为什么存在这个守卫
// ------------------
// P156 之前，交互态白名单只写在 `scripts/codegen-customfn.mjs` 里（它决定
// 哪些模型被打包进客户端 customFn），而构建期的 `calculate()` 仍然遍历
// **全量数据集**。于是同一页出现两个数字：
//
//   静态正文（预渲染进 #static-results）："Cost Comparison (138 Models)"
//                                         "Comparing 245 models across 4 providers"
//   交互工具实际能选：                      18 / 4
//
// 用户读「138 Models」，碰一下计算器，它变成「18 Models」—— 大的那个够不着。
// 而且每周的定价 bot 同步只会让这个差距更大（数据集 244 → 245 → …）。
//
// 本守卫盯三件事
// --------------
//   1. 交互态白名单的数量是**写死的字面量**：openai 18 / anthropic 13 /
//      google 8 / deepseek 5（合计 44），对比页 4。数字变了必须改这里，
//      不能悄悄跟着数据集漂。
//   2. 白名单**只有一份**：`scripts/codegen-customfn.mjs` 必须从
//      `src/data/ai-pricing-popular.json` 读，不许自己再写一遍。两份清单
//      各改各的 ⇒ 静态页和交互态静默分叉，正是 P156 要消灭的那个 bug。
//   3. 五个 AI cost 引擎的**静态文案数字 == 白名单数量**。
//
// Build dependency: none (source-only).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const POPULAR_JSON = resolve(root, 'src', 'data', 'ai-pricing-popular.json');
const CODEGEN = resolve(root, 'scripts', 'codegen-customfn.mjs');
const ENGINE_DIR = resolve(root, 'src', 'engines', 'ai-cost');

const popular = JSON.parse(readFileSync(POPULAR_JSON, 'utf-8'));
const codeGenSrc = readFileSync(CODEGEN, 'utf-8');

/** Read an engine source with whole-line `//` comments removed. */
function engineSource(file: string): string {
  return readFileSync(resolve(ENGINE_DIR, file), 'utf-8')
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//'))
    .join('\n');
}

// ---------------------------------------------------------------------------
// 1. The interactive set has hard-coded sizes
// ---------------------------------------------------------------------------

test('P156: the interactive model set has the expected per-provider sizes', () => {
  assert.equal(popular.popularModelKeys.openai.length, 18, 'openai interactive set should be 18 models');
  assert.equal(popular.popularModelKeys.anthropic.length, 13, 'anthropic interactive set should be 13 models');
  assert.equal(popular.popularModelKeys.google.length, 8, 'google interactive set should be 8 models');
  assert.equal(popular.popularModelKeys.deepseek.length, 5, 'deepseek interactive set should be 5 models');
});

test('P156: the four provider calculators expose 44 models in total', () => {
  const total = Object.values(popular.popularModelKeys).reduce((n, k) => n + k.length, 0);
  assert.equal(total, 44, `interactive set should total 44 models, got ${total}`);
});

test('P156: the comparison page compares exactly 4 flagship models', () => {
  const flags = Object.entries(popular.comparisonFlagshipKeys);
  assert.equal(flags.length, 4, `comparison should have 4 flagships, got ${flags.length}`);
  assert.deepEqual(
    flags.map(([p]) => p).sort(),
    ['anthropic', 'deepseek', 'google', 'openai'],
    'the comparison flagships must cover all four providers',
  );
});

test('P156: every comparison flagship is also in its provider interactive set', () => {
  for (const [provider, key] of Object.entries<string>(popular.comparisonFlagshipKeys)) {
    const list = popular.popularModelKeys[provider] ?? [];
    assert.ok(
      list.includes(key),
      `comparison flagship ${provider}/${key} is missing from the ${provider} interactive set — ` +
        'the comparison page would then be able to price a model the provider page cannot show',
    );
  }
});

// ---------------------------------------------------------------------------
// 2. One single source of truth
// ---------------------------------------------------------------------------

test('P156: the codegen script reads the shared list instead of redefining it', () => {
  assert.ok(
    codeGenSrc.includes('ai-pricing-popular.json'),
    'scripts/codegen-customfn.mjs must read src/data/ai-pricing-popular.json',
  );
});

test('P156: the codegen script hard-codes NO model key of its own', () => {
  const allKeys = Object.values<string[]>(popular.popularModelKeys).flat();
  const codegenKeys = [
    ...Object.values<string>(popular.comparisonFlagshipKeys),
  ];
  const leaked = [...allKeys, ...codegenKeys].filter((key) =>
    codeGenSrc.includes(`'${key}'`) || codeGenSrc.includes(`"${key}"`),
  );
  assert.deepEqual(
    leaked,
    [],
    'these model keys are hard-coded in scripts/codegen-customfn.mjs — the interactive ' +
      'set must live in exactly one place (src/data/ai-pricing-popular.json), otherwise ' +
      'the bundled client table and the build-time engine silently diverge',
  );
});

// ---------------------------------------------------------------------------
// 3. The static copy states the interactive count
// ---------------------------------------------------------------------------

test('P156: the openai page copy says 18 models — the interactive count', () => {
  const src = engineSource('openai-token-calculator.ts');
  const claims = [...src.matchAll(/Cost Comparison \((\d+) Models\)/g)].map((m) => Number(m[1]));
  assert.deepEqual(
    claims,
    [18],
    `the openai static copy must claim exactly 18 models (the interactive count), found ${JSON.stringify(claims)}`,
  );
});

test('P156: the comparison page copy says 4 models — the interactive count', () => {
  const src = engineSource('ai-api-cost-comparison.ts');
  const claims = [...src.matchAll(/Comparing (\d+) models across (\d+) providers/g)];
  assert.equal(claims.length, 1, `expected exactly one comparison claim, found ${claims.length}`);
  assert.equal(Number(claims[0]![1]), 4, 'the comparison copy must claim 4 models (the interactive count)');
  assert.equal(Number(claims[0]![2]), 4, 'the comparison copy must still claim 4 providers');
});

test('P156: no AI cost engine still advertises the full dataset size', () => {
  const files = [
    'openai-token-calculator.ts',
    'claude-api-cost-calculator.ts',
    'gemini-api-cost-calculator.ts',
    'deepseek-api-cost-calculator.ts',
    'ai-api-cost-comparison.ts',
  ];
  for (const file of files) {
    const src = engineSource(file);
    const stale = [...src.matchAll(/Cost Comparison \((\d{3}) Models\)|Comparing (\d{3}) models/g)]
      .map((m) => m[0]);
    assert.deepEqual(
      stale,
      [],
      `${file} still advertises a 3-digit model count (${JSON.stringify(stale)}) — that is the ` +
        'pre-P156 dataset size, which the interactive tool cannot deliver',
    );
  }
});

test('P156: every AI cost engine reads the shared interactive set', () => {
  const expectations: Array<[string, string]> = [
    ['openai-token-calculator.ts', 'pickInteractiveModels'],
    ['claude-api-cost-calculator.ts', 'pickInteractiveModels'],
    ['gemini-api-cost-calculator.ts', 'pickInteractiveModels'],
    ['deepseek-api-cost-calculator.ts', 'pickInteractiveModels'],
    ['ai-api-cost-comparison.ts', 'pickFlagshipModels'],
  ];
  for (const [file, symbol] of expectations) {
    const src = engineSource(file);
    assert.ok(
      /from\s+['"]\.\.\/\.\.\/data\/ai-pricing-popular['"]/.test(src),
      `${file} must import the shared interactive set from src/data/ai-pricing-popular`,
    );
    assert.ok(
      src.includes(symbol),
      `${file} must use ${symbol}() so its build-time model set matches the client bundle`,
    );
  }
});
