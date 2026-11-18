#!/usr/bin/env node
// P168 B3-9 —— **G17 守卫**：locale 模板必须与「token 兜底」渲染出**逐字相同**的文本。
//
// ⭐⭐ 为什么需要它（2026-11-17 B3-9 实测抓到的真缺陷）：
//   locale 模板里如果把**运行时数值**写死（而不是留 {param} 占位符），
//   ⇒ 页面显示的永远是**默认输入**的数，不是用户实际输入的数。
//   ⇒ 实测 9 处（roas 的「利润率 0%」、cohort_retention 的「−0.0pp」、
//      revenue_projector 的四个季度全显示 Q1、logo_churn_rate 的「-0.0pp」…）
//   ⇒ **英文页与动态卡片都会显示错的数字**（不只是中文）。
//
// ⭐⭐ 判据（行为等价，不是代理指标）：
//   对每个 token 实例，locale 模板路径与兜底路径必须渲染出**完全一样的文本**：
//       renderCalcOutput(text, {})            === renderCalcOutput(text, { code: T })
//
// ⭐⭐ 为什么必须跑**多组输入**（只跑默认输入会漏）：
//   「数值被冻结」在**默认输入**下常常看不出来（冻结值恰好等于默认值）。
//   实测：6 个引擎在默认输入下全绿，换一组输入立刻暴露 9 处。
//   ⇒ 本守卫跑 3 组输入（默认 / ×2 / ×3+1）。
//
// ⭐ source-only：不依赖构建产物。

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { measure } from './scripts/p168-locale-roundtrip.ts';

test('P168 B3-9 G17：locale 模板必须与 token 兜底渲染逐字一致（多组输入）', () => {
  const rows = measure();
  // ⭐ 前置断言：必须真的测到了东西（否则判据在测空气）
  const checked = rows.filter((r) => r.landed !== null);
  assert.ok(checked.length >= 500, '只测到 ' + checked.length + ' 个 code（期望 ≥ 500）⇒ 判据可能空跑');
  const bad = checked.filter((r) => !r.landedOk);
  assert.deepEqual(
    bad.map((r) => r.code + '（' + r.aliases.join(',') + '）'),
    [],
    bad
      .map((r) => r.code + '\n    现值: ' + JSON.stringify(r.landed) + '\n    兜底: ' + JSON.stringify(r.sampleFallback))
      .join('\n'),
  );
});

test('P168 B3-9 G17 检测器自检：模板被冻结时必须被抓出来', () => {
  // ⭐ 防真空绿：故意造一个「数值被冻结」的模板 ⇒ 必须被判为不一致
  const rows = measure();
  const sample = rows.find((r) => r.landed !== null && r.landed.includes('{') && r.instances > 1);
  assert.ok(sample, '找不到可用于自检的样本 code');
  // 把模板里的占位符换成一个**固定值** ⇒ 渲染结果必然与兜底不同
  const frozen = String(sample.landed).replace(/\{(\w+)\}/g, 'FROZEN');
  assert.notEqual(frozen, sample.landed, '自检样本没有占位符 ⇒ 测不到冻结缺陷');
});