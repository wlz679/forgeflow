#!/usr/bin/env node
// P168 B3-7 G8：**兜底渲染 ≡ locale.en 模板渲染**（试点引擎）。
//
// ⭐⭐ 这条判据为什么成立：
//   · token 自带**英文兜底**（'| 后面的原文'）⇒ 兜底渲染 = **原始英文输出**（含 params 插值）。
//   · locale.en 的模板**必须等于引擎源码原文**（B3-7 硬约束）⇒ 模板渲染 = 同一个英文输出。
//   ⇒ 两者**必须逐字节相同**。
//
// ⭐ 它一次性抓住：
//   ① **值消失**（label 模板是裸标签、但 token 覆盖整行 ⇒ 模板路径少了一整段值）
//   ② locale.en 模板与兜底**措辞不一致**（英文页静态卡片与动态卡片分叉）
//   ③ 占位符**错位/缺失**  ④ 兜底被**截断**（fallback 不跨行）
//
// ⚠️⚠️ **防假绿**：locale 里还没有 calc_out.* 键时，模板路径会退化成兜底路径 ⇒ 恒绿。
//   ⇒ 本守卫要求：**已 token 化的引擎，其每个 code 都必须已在 locale 里**（missingKeys 必须为空）
//   ⇒ locale 没落库 ⇒ 红（而不是绿）。
//
// source-only：不依赖构建产物。

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { compareRender, measureRenderParity } from './scripts/p168-render-parity.ts';

test('P168 B3-7 G8：已 token 化的试点引擎，兜底渲染 ≡ locale.en 模板渲染', () => {
  const rows = measureRenderParity();
  assert.ok(rows.length >= 10, '只测到 ' + rows.length + ' 个引擎（期望 ≥ 10）');
  const problems: string[] = [];
  let tokenized = 0;
  for (const r of rows) {
    if (r.tokens === 0) continue;   // 还没 token 化的引擎 ⇒ 本判据不适用
    tokenized += 1;
    if (r.missingKeys.length > 0) {
      problems.push(r.slug + '：locale 里缺 ' + r.missingKeys.length + ' 个 code（' + r.missingKeys.slice(0, 3).join(', ') + '…）⇒ 本判据会假绿，locale 必须先落库');
      continue;
    }
    if (!r.same) {
      problems.push(r.slug + '：兜底 ' + r.fallbackChars + ' 字符 vs 模板 ' + r.templateChars + ' 字符；' + (r.firstDiff || ''));
    }
  }
  assert.ok(tokenized > 0, '没有任何试点引擎含 token ⇒ 本守卫在测空气（检测器自检失败）');
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('P168 B3-7 G8 检测器自检：值消失 / 措辞不一致 必须被抓出来', () => {
  // ① 「token 覆盖整行 + 裸标签模板」⇒ 值消失 ⇒ 必须判为不一致
  const bad = compareRender('$calc_out.label.x|Label: $42|', { 'calc_out.label.x': 'Label' });
  assert.equal(bad.same, false, '检测器没看出值消失 ⇒ 自检失效');
  assert.ok(bad.firstDiff, '没给出差异位置');
  // ② 「token 只包标签（冒号与数值在 token 之外）」⇒ 两条路径都还原出同一个原句 ⇒ 必须判为一致
  const good = compareRender('• $calc_out.label.x|Label|: $42', { 'calc_out.label.x': 'Label' });
  assert.equal(good.same, true, '形态正确的样本被判成不一致：' + String(good.firstDiff));
  // ②b ⭐ 新格式的核心能力：token 后面跟任意文本都不会被吞掉
  const tail = compareRender('• $calc_out.label.x|Label|: $42 and more', { 'calc_out.label.x': 'Label' });
  assert.equal(tail.same, true, 'token 后的文本被吞了：' + String(tail.firstDiff));
  // ③ locale 缺键 ⇒ 必须被报成 missingKeys（否则模板路径退化 ⇒ 假绿）
  const missing = compareRender('$calc_out.label.x|Label', {});
  assert.deepEqual(missing.missingKeys, ['calc_out.label.x']);
});
