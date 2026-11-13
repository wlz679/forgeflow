#!/usr/bin/env node
// P168 B3-7 G6：客户端 customFn 输出 ≡ 服务端 generate() 输出。
//
// ⭐ 为什么需要这条（2026-11-12 实测）：
//   页面上的**静态卡片**来自 engine.staticExamples[0]（codegen 用服务端 generate() 生成），
//   **动态卡片**（用户点「计算」按钮）来自客户端 customFn。
//   ⇒ 两边不一致 ⇒ 同一页两处内容不同 ⇒ 用户看到的东西前后矛盾。
//   ⇒ 实测：10 个试点引擎里有 6 个漂移；全仓 100 个里 **55 个**漂移。
//   ⇒ 最严重的 saas_valuation：客户端**少输出 21 行**（整个 🩺 Valuation Health 区块没了）。
//   ⇒ ⚠️ G3 只比对「两边声明的 token code 集合」，抓不到这个 ⇒ 需要本条**行为级**判据。
//
// source-only：不依赖构建产物 ⇒ pnpm check 也会跑它。

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { PILOT_SLUGS, loadParityRows, measureParity } from './scripts/p168-server-client-parity.ts';

test('P168 B3-7 G6：试点引擎的客户端 customFn 输出 ≡ 服务端 generate() 输出', () => {
  const rows = loadParityRows(PILOT_SLUGS);
  assert.equal(rows.length, PILOT_SLUGS.length, '只测到 ' + rows.length + ' 个引擎（期望 ' + PILOT_SLUGS.length + '）');
  const problems = rows
    .filter((r) => !r.same)
    .map((r) => r.slug + '：服务端 ' + r.serverLines + '行/' + r.serverChars + '字符 vs 客户端 '
      + r.clientLines + '行/' + r.clientChars + '字符'
      + (r.serverError ? '；服务端抛错 ' + r.serverError : '')
      + (r.clientError ? '；客户端抛错 ' + r.clientError : ''));
  assert.deepEqual(
    problems,
    [],
    '客户端 customFn 的输出必须与服务端 generate() **逐字一致** —— 静态卡片与动态卡片是同一份结果的两次渲染。\n'
      + problems.join('\n'),
  );
});

test('P168 B3-7 G6 检测器自检：造一对漂移的假引擎，判据必须看得见', () => {
  const fake = [
    {
      slug: 'fake-drift',
      inputs: [],
      clientConfig: { customFn: "return ['CLIENT LINE'];" },
      generate: () => ['SERVER LINE'],
    },
  ];
  const rows = measureParity(fake as any, {});
  assert.equal(rows.length, 1);
  assert.equal(rows[0].same, false, '检测器没看出漂移 ⇒ 自检失效');
  assert.equal(rows[0].serverLines, 1);
  assert.equal(rows[0].clientLines, 1);
});

