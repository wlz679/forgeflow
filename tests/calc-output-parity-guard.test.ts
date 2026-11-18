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
import { DRIFT_DEBT, loadDriftRows, measureDrift, customFnCoverage } from './scripts/p168-server-client-drift-ledger.ts';
import { EXPECTED_ENGINE_COUNT } from './engine-count.ts';

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

// ── P168 B3-10：G6 漂移台账 ──────────────────────────────────────────────
// G6 上面那条只守「已令牌化的 45 个引擎」⇒ 其余引擎的漂移此前**不可见、不可守**。
// 实测全仓：100 个引擎 · 一致 68 · 漂移 32 ⇒ 这 32 条是「静态卡片 vs 动态卡片内容矛盾」的
// **已知欠账**。台账只能变小不能变大（修好一条销一条），每条的分类必须与实测一致。

test('P168 B3-10 G6-debt：全仓 G6 漂移集合 ≡ 台账（不得新增，也不得修好却忘了销账）', () => {
  const rows = loadDriftRows();
  const actual = new Set(rows.map((r) => r.slug));
  const newly = [...actual].filter((s) => !(s in DRIFT_DEBT));
  const fixed = Object.keys(DRIFT_DEBT).filter((s) => !actual.has(s));
  assert.deepEqual(
    newly,
    [],
    'these engines now drift between the server output and the client customFn - ' +
      'the static card and the dynamic card contradict each other. Fix the engine and ' +
      'add the entry to DRIFT_DEBT (the ledger may shrink, it may never grow). ' + newly.join(' | '),
  );
  assert.deepEqual(
    fixed,
    [],
    'these DRIFT_DEBT entries no longer drift - remove them from DRIFT_DEBT ' +
      '(the ledger may shrink, it may never drift). ' + fixed.join(' | '),
  );
});

test('P168 B3-10 G6-debt-b：台账里每条的分类必须与实测一致（台账条目不许是空壳）', () => {
  const rows = loadDriftRows();
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  const wrong: string[] = [];
  for (const [slug, entry] of Object.entries(DRIFT_DEBT)) {
    const row = bySlug.get(slug);
    // ⭐ 台账里「不存在于实测」的条目由上一条断言（G6-debt 的 fixed 列表）负责
  //   ⇒ 这里**跳过**它 ⇒ 「存在性」只有一个家（一个不变量只守一处）
  //   ⇒ 一条变异（塞一条幽灵欠账）因此只红 1 条断言，隔离不破。
    if (!row) continue;
    if (row.kind !== entry.kind) {
      wrong.push(slug + '：台账写 ' + entry.kind + '，实测 ' + row.kind);
    }
  }
  assert.deepEqual(
    wrong,
    [],
    '台账的分类与实测不一致 ⇒ 这条欠账的性质被写错了（分类决定修法与优先级）。' + wrong.join(' | '),
  );
});

test('P168 B3-10 G6-debt-c：防真空绿 —— 测量必须覆盖每一个带 customFn 的引擎（不是「台账非空」）', () => {
  // ⭐ 台账清零是**合法结局**（B3-10 已把 32 条漂移全部修完）⇒ 原来这条「台账必须非空」
  //   守的是「欠账存在」这个**回溯型**不变量 ⇒ 修好之后它反而会**挡住修复**。
  // ⇒ 换成守**目标型**不变量：**测量不许漏掉任何一个引擎**。
  const cov = customFnCoverage();
  assert.equal(
    cov.withCustomFn,
    EXPECTED_ENGINE_COUNT,
    '带 customFn 的引擎数应等于引擎总数（少了 = 那个引擎根本没有动态实现）',
  );
  assert.deepEqual(
    cov.parseFailures,
    [],
    'customFn 语法错误 ⇒ 该页动态卡片整页空白：' + cov.parseFailures.join(' | '),
  );
});

test('P168 B3-10 G6-debt 自检：造一个「客户端整段缺失」的假引擎，分类器必须看得见', () => {
  const fake = [
    {
      slug: 'fake-missing-section',
      inputs: [],
      clientConfig: { customFn: "return ['ONLY ONE LINE'];" },
      generate: () => ['SERVER LINE 1', 'SERVER LINE 2', 'SERVER LINE 3'],
    },
  ];
  const rows = measureDrift(fake as any, {});
  assert.equal(rows.length, 1, 'the detector saw no drift at all');
  assert.equal(rows[0].kind, 'missing-section', 'the detector must classify a truncated client as missing-section');
  assert.equal(rows[0].firstDiffLine, 1);
  assert.equal(rows[0].clientLines, 1);
  assert.equal(rows[0].serverLines, 3);
});

