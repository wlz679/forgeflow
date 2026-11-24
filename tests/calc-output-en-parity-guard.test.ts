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
import { ALLOWED_DIFFS, measureEnParity, normalizeDates, BASELINE_SHA, baselineStaticExample, baselineShaFor, PILOT_FILES, stripPricingBanner } from './scripts/p168-en-page-parity.ts';
import { PILOT_SLUGS } from './scripts/p168-server-client-parity.ts';
// P168 B3-8：「已令牌化引擎清单」的**单一真相源**（试点 10 + B3-8 15 + B3-9 20 + B3-13 10 + B3-14 18 = 73）
import { TOKENIZED } from './scripts/p168-tokenized-engines.mjs';

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
  // ①-b P168 B3-11：burn-rate 的 run-out 日期（格式不同：带冒号 + 多空格）也必须归一化
  assert.equal(
    normalizeDates('• Est. Cash Run-out:   Feb 2027'),
    normalizeDates('• Est. Cash Run-out:   Jun 2027'),
    '日期归一化没把 burn-rate 的 run-out 日期归一掉',
  );
  // ② 白名单必须只覆盖「已记录的有意改动」
  //   ⚠️ P168 B3-11：mrr 原先登记的「What-If Scenarios 冒号」差异**已不存在**
  //     （基线重钉到 f2a9ff4 ⇒ 那次有意改动进了基线）⇒ 按「白名单不许养肥」移除该条目
  //     ⇒ 原来这条「mrr 的有意改动没登记」的断言随之**作废并删除**（不是改松）：
  //     mrr 的「有意改动」现在由**基线**承载（谁动了那一行 ⇒ 与基线不等 ⇒ G9 变红）。
  // ⭐ P168 B3-8：白名单条目会随批次增长（B3-8 新增 $$ 修复与 rental-yield 数值修复）
  //   ⇒ 不能把**数量**写死 ⇒ 改成两条更强的判据：
  //     · 白名单里的每个 slug 都必须是**已令牌化引擎**（不许登记不存在的引擎）；
  //     · 白名单里的每个标记都必须**真的出现在**该引擎当前的差异里（不许白名单养肥）。
  for (const slug of Object.keys(ALLOWED_DIFFS)) {
    assert.ok(PILOT_SLUGS.includes(slug), '白名单里有未登记的引擎：' + slug);
    const row = measureEnParity([slug])[0];
    assert.ok(row, slug + '：白名单里的引擎测不到');
    for (const marker of ALLOWED_DIFFS[slug]) {
      assert.ok(row.diffs.some((d) => d.includes(marker)), slug + '：白名单标记「' + marker + '」在当前差异里找不到（白名单过期？）');
    }
  }
});

test('P168 B3-7 G9 基线自检：基线必须是固定 SHA（不得用 HEAD）且渲染后是纯英文', () => {
  // ⚠️ 2026-11-13 实测：基线若用 HEAD ⇒ 本批一提交，HEAD 就是「已 token 化」的版本
  //   ⇒ 基线里全是 token 原文 ⇒ 与「渲染后的英文」必然不等 ⇒ **G9 提交后必红**（CI 必红）。
  //   ⇒ 基线必须是**固定 SHA**，且必须能自证「它是 token 化之前的版本」。
  assert.notEqual(BASELINE_SHA, 'HEAD', '基线不得用 HEAD（一提交就失去意义）');
  // ⭐ P168 B3-8：基线**按引擎分组** ⇒ 自检必须查「这个引擎**实际用的**那个基线」
  //   （否则自检查的是单值 BASELINE_SHA，而 G9 比对用的是分组基线 ⇒ 判据与被测物脱节）
  for (const slug of PILOT_SLUGS) {
    const sha = baselineShaFor(slug);
    assert.notEqual(sha, 'HEAD', slug + '：基线不得用 HEAD（一提交就失去意义）');
    const head = baselineStaticExample(PILOT_FILES[slug], sha);
    assert.ok(head !== null, slug + '：基线 ' + sha + ' 取不到（浅克隆？）');
    assert.ok(!head.includes('$calc_out.'), slug + '：基线渲染后仍残留 token ⇒ 基线不是可渲染的英文基线');
  }
});

test('P168 B3-8 stripPricingBanner 检测器自检：只删 pricing 那一行，且渲染后仍能删', () => {
  const NL2 = String.fromCharCode(10);
  const withBanner = ['📅 Pricing last updated: 2026-11-09 (data synced weekly)', '🔴 Real-time Pricing', 'Input: 1,000 tokens'].join(NL2);
  assert.equal(stripPricingBanner(withBanner), ['🔴 Real-time Pricing', 'Input: 1,000 tokens'].join(NL2));
  // 渲染后（token 已替换成英文兜底）仍要能删掉
  const afterRender = '$calc_out.section.x|Pricing last updated: 2026-11-09|'.replace(/\$calc_out\.section\.x\|Pricing last updated: 2026-11-09\|/, '📅 Pricing last updated: 2026-11-09');
  assert.ok(stripPricingBanner(afterRender).indexOf('Pricing last updated') < 0, '渲染后没删掉 pricing 行');
  // 其它行不许被误删
  assert.ok(stripPricingBanner('📅 Usage Scenarios').indexOf('Usage Scenarios') >= 0, '误删了别的 📅 开头行');
});

test('P168 B3-9 真相源自检：TOKENIZED 必须覆盖 73 个引擎且分组基线不同', () => {
  assert.equal(TOKENIZED.length, 73, 'TOKENIZED 应有 73 个引擎，实际 ' + TOKENIZED.length);
  const b37 = TOKENIZED.filter((e) => e.baseline === 'd3b3c1d');
  const b38 = TOKENIZED.filter((e) => e.baseline === '5c1c789');
  const b39 = TOKENIZED.filter((e) => e.baseline === '5c1bd52');
  const b313 = TOKENIZED.filter((e) => e.baseline === '94bffb2');
  const b314 = TOKENIZED.filter((e) => e.baseline === '9abe1f0');
  assert.equal(b37.length, 10, 'B3-7 试点应为 10 个，实际 ' + b37.length);
  assert.equal(b38.length, 15, 'B3-8 本批应为 15 个，实际 ' + b38.length);
  assert.equal(b39.length, 20, 'B3-9 本批应为 20 个（15 铺量 + 5 AI cost），实际 ' + b39.length);
  assert.equal(b313.length, 10, 'B3-13 两组应为 10 个（组 1 五个 + 组 2 五个），实际 ' + b313.length);
  assert.equal(b314.length, 18, 'B3-14 两组应为 18 个（组 1 九个 + 组 2 九个），实际 ' + b314.length);
  assert.equal(new Set(TOKENIZED.map((e) => e.slug)).size, 73, 'TOKENIZED 里有重复 slug');
  // 基线不得用 HEAD（一提交就失去意义）
  for (const e of TOKENIZED) assert.notEqual(e.baseline, 'HEAD', e.slug + ' 的基线不得用 HEAD');
});
