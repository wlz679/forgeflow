#!/usr/bin/env node
// P168 B3-13 —— 「zh 整行英文」欠账台账守卫（4 条断言）。
//
// 为什么需要它（不是「再加一个守卫」）
// ---------------------------------------------
//   G4c（产物层守卫：zh 结果卡片不得有整行英文）**只覆盖 TOKENIZED**（45 个已令牌化引擎）
//   ⇒ 剩下 55 个引擎的 zh 欠账**不在任何守卫的视野里**。
//   ⇒ 「把欠账做完」与「把欠账藏进 locale」都能让 CI 全绿。
//   ⇒ 本守卫把欠账变成**显式、可核销**的清单，并守住两个方向：
//     · 漏登记（实测有欠账、台账没有）—— 欠账不可见；
//     · 忘记销账（台账有、实测已清零）—— 台账变成谎言。
//
// 四条断言（每条只守一个不变量）
//   T1 集合相等（双向）：实测 zhEn>0 的 slug 集合 ≡ ZH_EN_DEBT 的键集合 + 规模不超过 DEBT_MAX
//   T2 逐条行数相等：台账登记的 N == 实测 N
//   T3 台账 ∩ TOKENIZED = ∅（已令牌化的引擎必须从台账销账）
//   T4 源码含 token 的引擎 ≡ TOKENIZED 的引擎（双向）
//
// ⭐ T3 + T1 合起来 = 防「假绿」的核心
//   一个引擎「进了 TOKENIZED 但 locale 没补齐」⇒ zh 页回落英文兜底 ⇒ 实测仍有 zhEn>0
//   ⇒ T1 要求它进台账、T3 要求它**不许**在台账 ⇒ 两条同时红
//   ⇒ 报错合起来就是「这个引擎的令牌化没做完」。
//
// ⭐ T4 为什么必要（G4c/G6/G8/G9 的覆盖范围全由 TOKENIZED 决定）
//   引擎一旦从 TOKENIZED 里被删掉 ⇒ 那几个守卫就**不再看它** ⇒ 英文页可能悄悄变而无人守
//   ⇒ 「源码里真的吐 token 的引擎」必须与「清单」逐字对齐（双向）。
//   实测依据（2026-11-19 探针）：100 引擎 · 清单 45 · 源码含 token 45 · 源码不含 token 55
//   ⇒ 双向违规 0 ⇒ 该断言当前成立。
//
// ⭐ build-dep（读 dist/）
//   · 测量走 p168-zh-remaining-audit.ts 的 auditAll() ⇒ 它读 dist/zh/<slug>/index.html
//   · CI 的「Unit tests」步骤跑在「Build」步骤**之前** ⇒ 全新 checkout 里**没有 dist/**
//     ⇒ 守卫必须**自己**构建（照抄 tests/calc-output-render-guard.test.ts 的 ensureBuilt()）
//   · RUN_BUILD_TESTS 未设 ⇒ t.skip（仓库既有约定：产物层守卫一律 build-dep）

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DEBT_MAX, ZH_EN_DEBT, loadZhEnRows, type ZhEnRow } from './scripts/p168-tokenize-remaining-ledger.ts';
// P168 B3-8：「已令牌化引擎清单」的**单一真相源**（试点 10 + B3-8 15 + B3-9 15 + AI cost 5 = 45）
import { TOKENIZED } from './scripts/p168-tokenized-engines.mjs';
// T4 的测量口径：引擎**能吐出的全部 token code**（staticExamples + clientConfig.customFn）
import { extractEngineTokenCodes } from '../src/lib/calc-output-i18n.ts';
import '../src/engines/index.ts';
import { getAllEngines } from '../src/core/engines/registry.ts';

const ROOT = resolve(import.meta.dirname, '..');

// ⭐ CI 的「Unit tests」步骤跑在「Build」步骤**之前** ⇒ 全新 checkout 里**没有 dist/**
//   ⇒ 守卫必须**自己**构建（仓库既有约定：a11y-guard / breadcrumb-list-guard 等都是这么做的）。
//   ⚠️ 2026-11-13 实测：产物层守卫最初没写这段 ⇒ 本地绿（dist 已存在）但 **CI 必红**
//   ⇒ **本地绿 ≠ CI 绿**，产物层守卫必须自建。
function ensureBuilt(): void {
  const probe = resolve(ROOT, 'dist', 'zh', 'solopreneur-mrr-calculator', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p168-b3-13] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, 'pnpm build failed with status ' + r.status);
}

/** 实测有欠账的行（zhEn > 0）—— 传入已测出的行，避免重复扫 dist/ */
function debtRows(rows: ZhEnRow[]): ZhEnRow[] {
  return rows.filter((r) => r.zhEn > 0);
}

test('P168 B3-13 T1：实测有欠账的引擎集合 ≡ 台账 ZH_EN_DEBT（双向，且规模不超上限）', (t) => {
  if (!process.env.RUN_BUILD_TESTS) {
    t.skip('build-dep：需要 RUN_BUILD_TESTS=1 与已构建的 dist/');
    return;
  }
  ensureBuilt();
  const rows = loadZhEnRows();
  const total = getAllEngines().length;
  // ⚠️ 量不到就报错，绝不报 0 —— 下面的集合比较只有在**全量**测量下才有意义。
  assert.equal(
    rows.length,
    total,
    '只测到 ' + rows.length + '/' + total + ' 个引擎的 zh 页 ⇒ 数字不完整（dist 过期 / 缺页）'
      + '⇒ 本次比较无意义（先补构建：pnpm build:full）',
  );
  const measured = new Set(debtRows(rows).map((r) => r.slug));
  const newly = [...measured].filter((s) => !(s in ZH_EN_DEBT)).sort();
  const fixed = Object.keys(ZH_EN_DEBT).filter((s) => !measured.has(s)).sort();
  assert.deepEqual(
    newly,
    [],
    '这些引擎的 zh 页仍有整行英文，但台账里没有 ⇒ 要么把欠账补完（令牌化），要么登记进台账。'
      + '台账只能变小不能变大 —— 修好一条就销一条。 ' + newly.join(' | '),
  );
  assert.deepEqual(
    fixed,
    [],
    '台账里的这些条目实测 zhEn 已是 0（已修好）⇒ 从台账销账（台账只能变小不能变大）。 ' + fixed.join(' | '),
  );
  // ⭐ 台账「只能变小不能变大」的可执行形式 —— 一个**独立于实测**的硬上限。
  //   T1 要求「实测有欠账就必须登记」⇒ 单看 T1 台账可以变大 ⇒ 那正是「欠账在长」的情形。
  const entries = Object.keys(ZH_EN_DEBT).length;
  assert.ok(
    entries <= DEBT_MAX,
    '台账有 ' + entries + ' 条，超过本批规模上限 DEBT_MAX=' + DEBT_MAX
      + ' ⇒ 欠账在增长（台账只能变小不能变大）',
  );
});

test('P168 B3-13 T2：台账登记的行数必须与实测逐条相等', (t) => {
  if (!process.env.RUN_BUILD_TESTS) {
    t.skip('build-dep：需要 RUN_BUILD_TESTS=1 与已构建的 dist/');
    return;
  }
  ensureBuilt();
  const bySlug = new Map(loadZhEnRows().map((r) => [r.slug, r]));
  const wrong: string[] = [];
  for (const [slug, n] of Object.entries(ZH_EN_DEBT)) {
    const row = bySlug.get(slug);
    // ⭐ 台账里「不存在于实测」的条目由 T1 负责 ⇒ 这里**跳过**它
    //   ⇒「存在性」只有一个家（一个不变量只守一处）
    //   ⇒ 一条变异（塞一条幽灵欠账）因此只红 1 条断言，隔离不破。
    if (!row) continue;
    if (row.zhEn !== n) {
      wrong.push(slug + '：台账写 ' + n + ' 行，实测 ' + row.zhEn + ' 行');
    }
  }
  assert.deepEqual(
    wrong,
    [],
    '台账数字与现实脱节 ⇒ 改了引擎文案就必须同步更新台账。 ' + wrong.join(' | '),
  );
});

test('P168 B3-13 T3：台账与 TOKENIZED 不得有交集（已令牌化的引擎必须销账）', () => {
  const tokenized = new Set(TOKENIZED.map((e) => e.slug));
  const overlap = Object.keys(ZH_EN_DEBT).filter((s) => tokenized.has(s)).sort();
  assert.deepEqual(
    overlap,
    [],
    '已令牌化的引擎必须从台账销账（多半是 locale 缺键 ⇒ zh 回落英文兜底 ⇒ zh 页仍有整行英文）。 '
      + overlap.join(' | '),
  );
});

test('P168 B3-13 T4：源码含 token 的引擎 ≡ TOKENIZED 的引擎（双向）', () => {
  const sourceTokens = new Set<string>();
  for (const e of getAllEngines()) {
    if (extractEngineTokenCodes(e).length > 0) sourceTokens.add(e.slug);
  }
  const listed = new Set(TOKENIZED.map((e) => e.slug));
  const notListed = [...sourceTokens].filter((s) => !listed.has(s)).sort();
  const listedButSilent = [...listed].filter((s) => !sourceTokens.has(s)).sort();
  assert.deepEqual(
    notListed,
    [],
    '源码在吐 token 却不在 TOKENIZED 清单里 ⇒ G4c/G6/G8/G9 都不再覆盖它 ⇒ 英文页可能悄悄变而无人守。 '
      + notListed.join(' | '),
  );
  assert.deepEqual(
    listedButSilent,
    [],
    '清单里有引擎但源码不再吐 token ⇒ 那几个守卫对它**空转**（覆盖落空）。 '
      + listedButSilent.join(' | '),
  );
});
