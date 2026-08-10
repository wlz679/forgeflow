// P141-B1-T1: codegen AST builder for customFn data tables
// 守护 buildCustomFn 行为契约:
//   1. JSON field → customFn local key 映射 (openai-style input→i, output→o, context→c)
//   2. 输出不含 var 关键字 (Quick Win #5: var → const)
//   3. 输出不产生嵌套三元链 (Quick Win #6: 三元 → 查表)
//
// 位置说明:plan 原文写 `tests/core/buildCustomFn.test.ts`,但 `tests/run.mjs` 的
// flat glob 不递归子目录(P52 已建立此 pattern)。为保证 `pnpm check` 守护此测试,
// 实际放在 `tests/` 根 — 这是项目既有约定 (所有 *.test.ts 都直接放 tests/ 根)。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCustomFn } from '../src/core/buildCustomFn';

test('buildCustomFn: openai-style input/output 映射', () => {
  const models = {
    'gpt-5': { input: 2.5, output: 10, context: 256000 },
    'gpt-4o': { input: 2.5, output: 10, context: 128000 },
  };
  const src = buildCustomFn(models, 'openai-token-calc', {
    input: 'i', output: 'o', context: 'c',
  });
  // 必须能解析为合法 JS (new Function 解析失败 = 抛 SyntaxError)
  const fn = new Function('inputs', 'pick', 'fill', src);
  // 期望: const i={...}, const o={...}, const c={...}
  assert.equal(typeof fn({ model: 'gpt-5', tokens: 1000 }, () => 0, () => 0), 'object');
});

test('buildCustomFn: var → const 替换', () => {
  const src = buildCustomFn({ x: { input: 1 } }, 'test', { input: 'i', output: 'o' });
  assert.equal(src.includes('var '), false, 'must not contain var keyword');
});

test('buildCustomFn: 嵌套三元 → 查表', () => {
  const src = buildCustomFn({ x: { input: 1 } }, 'test', { input: 'i', output: 'o' });
  // 不应该有三元链 (任何 `? ... : ...` 模式都算 — nested ternary 应完全消除)
  const ternaryChain = src.match(/\?[^:?]+:[^:?]+:/g) || [];
  assert.equal(ternaryChain.length, 0, 'must have no nested ternary');
});