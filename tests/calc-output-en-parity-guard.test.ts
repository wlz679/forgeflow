#!/usr/bin/env node
// P168 B3-7 G9：**英文页零变化**（zh 页改中文，英文页一个字都不改）。
//
// ⭐ 这条不变量为什么成立：
//   · 静态卡片 = `engine.staticExamples[0]`（codegen 用**服务端 generate()** 生成）。
//   · HEAD 版的 `staticExamples[0]` = **token 化之前**的英文输出。
//   · 现在版的 token 自带**英文兜底** ⇒ 兜底渲染 = token 化后的英文输出。
//   ⇒ **兜底渲染 == HEAD 的 staticExamples[0]** ⇒ 英文页逐字不变。
//
// ⭐⭐ 它补上了 G8 的盲区：G8 只比「兜底渲染 vs locale.en 模板渲染」
//   ⇒ 两边一起错时它照样绿 ⇒ 它发现不了「兜底本身与源码原文不同」。
//   实测本条当场抓到 rent_vs_buy 的两处真实回归：
//     ① `padEnd(10)` 的对齐空格在 token 化时被丢弃；
//     ② verdict 多出一个空格。
//   ⚠️ 两处**都已修** ⇒ 现在 10/10 试点「未记录差异 = 0」。
//
// ⚠️ 已知**有意**的例外（白名单，每条都要写明理由）：
//   mrr 的 `🔄 What-If Scenarios` → `🔄 What-If Scenarios:`（全仓主流写法带冒号；计划已记录）。
//
// ⚠️ 日期归一化：`dateLabel()` 用**当前月份**推算里程碑日期
//   （实测 mrr 的 `(~Sep 2026)` 现在是 `(~Jan 2027)`）
//   ⇒ HEAD 的静态示例是几个月前生成的 ⇒ 这一项**必然**随时间变
//   ⇒ 它不是「英文页被改了」，而是「时间在走」⇒ 归一化掉。
//
// source-only：不依赖构建产物。

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ALLOWED_DIFFS, measureEnParity, normalizeDates } from './scripts/p168-en-page-parity.ts';
import { PILOT_SLUGS } from './scripts/p168-server-client-parity.ts';

test('P168 B3-7 G9：试点引擎的英文页逐字不变（token 化只改 zh，不改 en）', () => {
  const rows = measureEnParity(PILOT_SLUGS);
  assert.equal(rows.length, PILOT_SLUGS.length, '只测到 ' + rows.length + ' 个引擎（期望 ' + PILOT_SLUGS.length + '）');
  const problems: string[] = [];
  for (const r of rows) {
    if (r.same || r.allowed) continue;
    problems.push(r.slug + '：' + r.diffs.length + ' 处未记录差异（' + r.headChars + ' → ' + r.nowChars + ' 字符）\n    ' + r.diffs.slice(0, 3).join('\n    '));
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('P168 B3-7 G9 检测器自检：未记录的差异必须被抓出来', () => {
  // ① 日期归一化：只差月份的里程碑日期**不算**差异
  assert.equal(
    normalizeDates('• $20,000.00 MRR: 2.2 months (~Sep 2026)'),
    normalizeDates('• $20,000.00 MRR: 2.2 months (~Jan 2027)'),
    '日期归一化没把月份差异归一掉',
  );
  // ② 白名单必须只覆盖「已记录的有意改动」
  assert.ok(ALLOWED_DIFFS['solopreneur-mrr-calculator'], 'mrr 的有意改动没登记');
  assert.equal(Object.keys(ALLOWED_DIFFS).length, 1, '白名单里有未登记的引擎');
});
