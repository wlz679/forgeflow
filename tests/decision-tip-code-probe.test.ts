#!/usr/bin/env node
// P168 B3-8 —— 「建议码探针」的**语义自检**（source-only）。
//
// ⭐ 为什么需要它（2026-11-16 实测假红）
//   `decision-support-build-guard` 的「结果卡片里没有建议码」判据，原来用
//   `cardHtml.includes(tipCode)`（**子串**）⇒ 而 P168 B3-8 的 token 名里
//   **含建议码前缀**（`calc_out.section.freelance_rate_market_position` 里有
//   `freelance_rate_market`）⇒ 子串匹配把「token 名」误判成「建议码」
//   ⇒ en/zh 的 freelance-rate 各假红 1 条。
//   ⇒ 修法：按**词边界**匹配（标识符语义）⇒ `tipCodeRegex`。
//
// ⭐⭐ 为什么自检必须**独立成文件**（不能放在守卫文件里）
//   `decision-support-build-guard` 是 **build-dep**（文件顶部有 skip-guard：
//   无 `RUN_BUILD_TESTS` 时 `process.exit(0)`）⇒ 自检若放在那里 ⇒
//   **source-only 模式下永远被跳过 ⇒ 真空绿**。
//   ⇒ 探针实现放共享夹具 `tests/_decision-support-fixture.ts`（无 skip-guard）
//   ⇒ 本文件独立跑 ⇒ 「词边界」这条语义被**持续**证明。

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { tipCodeRegex } from './_decision-support-fixture.ts';

test('P168 B3-8：建议码探针自检 —— 词边界匹配（token 名含前缀不得误判；真建议码必须被抓住）', () => {
  const code = 'freelance_rate_market';
  const re = tipCodeRegex(code);

  // ① token 名里含建议码前缀 ⇒ **不得**命中（这是本批的假红来源）
  assert.equal(
    re.test('calc_out.section.freelance_rate_market_position'),
    false,
    'token 名里含建议码前缀时不得误判为「卡片里还有建议码」',
  );
  assert.equal(
    re.test('"calc_out.section.freelance_rate_market_position":"\u{1F4A1} Market Position:"'),
    false,
    '模板表里的 token 键名不得误判',
  );
  assert.equal(
    re.test('$calc_out.section.freelance_rate_market_position|\uD83E\uDE7A Market Position:|'),
    false,
    'raw 属性里的 token 原文不得误判',
  );

  // ② 真正的建议码（JSON 值 / decision_tip 模板键）⇒ **必须**命中
  assert.equal(
    re.test('\uD83D\uDCA1 Tip: {"code":"freelance_rate_market","params":{}}'),
    true,
    '决策 JSON 里的建议码必须被抓住（这才是「建议在卡片与决策区块各有一家」）',
  );
  assert.equal(
    re.test('"decision_tip.freelance_rate_market":"Most freelancers undercharge by 30-50%"'),
    true,
    'decision_tip 模板键里的建议码必须被抓住',
  );
  assert.equal(re.test('freelance_rate_below_market'), false, '别的建议码不得命中');
});
