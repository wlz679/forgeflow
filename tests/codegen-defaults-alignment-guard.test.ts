#!/usr/bin/env node
// P168 B3-11 —— codegen defaultInputs 对齐守卫（100 引擎）
//
// 为什么需要它（B3-11 实测取证）
//   scripts/codegen-examples.mjs 的 ENGINES 表是 staticExamples[0] 的输入真相源。
//   实测 **12 个引擎**的 defaultInputs 键名与引擎 inputs[].name 对不上 ⇒
//   静态示例是「拿错输入算出来的」。实测 burn-rate 的静态卡片写着
//   「Gross Burn: $0/mo · Net Burn: $-20,000/mo」（引擎读 teamCost/infraCost/…，
//   codegen 给的却是早已废弃的 monthlyExpenses）。
//   ⇒ 修复只落在 codegen 表；src/engines/** 的 staticExamples 由 codegen 重新生成。
//
// 四条断言（各守各的，一个不变量只守一处；一条变异只红一条）
//   T1 覆盖      注册表里的每个引擎都在 ENGINES 表里；表里没有失效 slug
//   T2 键集对齐  defaultInputs 的键集合 == 引擎 inputs[].name 的键集合（双向精确）
//   T3 非退化    用 defaultInputs 现算的输出不含 NaN/undefined，且不是「全部数字为 0」
//   T4 修复在生效 12 个引擎「已提交的 staticExamples[0]」≠「用修复前输入算出的结果」
//
// ⭐ 三条设计决定（都是被自己的坑逼出来的）
//   ① T4 比较的是**已提交的产物**而不是 codegen 表的当前值
//      ⇒ 改表不改产物时，只有 T2 变红 ⇒ 变异仍然隔离；
//      而「把表改回修复前的样子并重新生成」⇒ 产物 == 修复前结果 ⇒ T4 变红。
//   ② T4 必须注入 codegen 同款的 Date mock（REFERENCE_DATE = 2026-07-15）
//      ⇒ mrr / burn-rate 的静态示例里有「~Sep 2027」这类日期标签
//      ⇒ 不 mock ⇒ 日期不同 ⇒ 输出必然不同 ⇒ T4 **恒绿 = 真空绿**。
//   ③ 「静态示例已同步」这条不变量**不在这里守**
//      ⇒ 它的家是既有 CI 门禁 `pnpm check:examples`（= codegen-examples.mjs --check）
//      ⇒ 一个不变量只守一处；本守卫不再重复。
//
// ⭐ T4 为什么用「差分」而不是「写死字面量」：
//   引擎文案/数值随迭代会变，写死整段输出会变成「一改就红」的脆弱守卫；
//   差分断言的是「修复在生效」这一语义，且对引擎文案变化免疫。
//   旧输入写在 tests/fixtures/p168-codegen-defaults/legacy-defaults.json（可复算，不留 tmp/）。

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import '../src/engines/index.ts';
import { getAllEngines } from '../src/core/engines/registry.ts';
import { analyzeCodegenDefaults } from './scripts/p168-codegen-defaults-audit.ts';

const ROOT = resolve(import.meta.dirname, '..');
const LEGACY_PATH = join(ROOT, 'tests', 'fixtures', 'p168-codegen-defaults', 'legacy-defaults.json');

const LEGACY = JSON.parse(readFileSync(LEGACY_PATH, 'utf8')) as Record<string, Record<string, string | number>>;

/** codegen 同款的 Date mock（scripts/codegen-examples.mjs buildRunnerScript 里的那份）
 *  —— 必须与 codegen 用同一个 REFERENCE_DATE，否则静态示例里的日期标签对不上。 */
const REFERENCE_DATE_ISO = '2026-07-15T00:00:00Z';

function withMockedDate<T>(fn: () => T): T {
  const RealDate = Date;
  const reference = new RealDate(REFERENCE_DATE_ISO);
  class MockDate extends RealDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(reference.getTime());
        return;
      }
      super(...(args as []));
    }
    static now(): number { return reference.getTime(); }
  }
  (globalThis as any).Date = MockDate;
  try {
    return fn();
  } finally {
    (globalThis as any).Date = RealDate;
  }
}

/** 跑引擎并把**全部**元素拼起来（T3 用：退化检查要看到所有数字）。 */
function runEngine(engine: any, inputs: Record<string, any>): string {
  const gen = engine.generate ?? engine.calculate;
  const res = gen.call(engine, inputs);
  return Array.isArray(res) ? res.map(String).join('\n') : String(res);
}

/**
 * ⭐ T4 必须比**拼接后**的产物，而不是 res[0]：
 *   codegen 写进 staticExamples[0] 的是 `lines.join('\\n')`（scripts/codegen-examples.mjs:325）
 *   ⇒ 产物 = generate() 返回数组的**全部元素**按行拼接。
 *   实测 AI cost 三个引擎的 generate() 返回 **101 / 97 / 76 个元素**，ltv / cac 返回 6 个
 *   ⇒ 若拿 res[0] 去比，两边**结构上就不可能相等** ⇒ T4 恒绿 = 真空绿。
 */

/** 本批 12 个错配引擎里，修复会改变静态示例输出的 10 个。
 *  openai-token-calculator 与 ai-api-cost-comparison 是「键对齐但输出不变」：
 *  · openai：引擎对 projectionMonths 有等价回落（非法值 → 12），补不补都是 12 个月
 *  · ai-api-cost-comparison：引擎忽略 models、pricingMode 缺省即 realtime
 *  ⇒ 这两个由 T2（键集对齐）承重，不进 T4。 */
const T4_SLUGS = [
  'solopreneur-claude-api-cost-calculator',
  'solopreneur-gemini-api-cost-calculator',
  'solopreneur-deepseek-api-cost-calculator',
  'solopreneur-ltv-calculator',
  'solopreneur-cac-calculator',
  'solopreneur-burn-rate-calculator',
  'solopreneur-break-even-calculator',
  'solopreneur-market-size-estimator',
  'solopreneur-mrr-calculator',
  'solopreneur-revenue-projector'
];

// === T1: 覆盖 ===
test('T1: codegen ENGINES 表覆盖全部引擎，且没有失效条目', () => {
  const analysis = analyzeCodegenDefaults();
  assert.equal(
    analysis.uncovered.length,
    0,
    '以下引擎没有出现在 scripts/codegen-examples.mjs 的 ENGINES 表里 ⇒ 它们的静态示例不是 codegen 生成的，' +
    '改了引擎也不会触发 codegen --check 报错：\n  ' + analysis.uncovered.join('\n  ')
  );
  assert.equal(
    analysis.stale.length,
    0,
    'ENGINES 表里这些 slug 在引擎注册表里不存在（文件被改名/删除但表没跟上）：\n  ' + analysis.stale.join('\n  ')
  );
  assert.equal(
    analysis.rows.length,
    analysis.engineTotal,
    'ENGINES 表条目数（' + analysis.rows.length + '）与注册表引擎数（' + analysis.engineTotal + '）不一致'
  );
});

// === T2: 键集对齐（根因层） ===
test('T2: 每个引擎的 defaultInputs 键集合与 inputs[].name 完全一致', () => {
  const analysis = analyzeCodegenDefaults();
  if (analysis.mismatched.length === 0) return;
  const detail = analysis.mismatched
    .map((r) => {
      const miss = r.missing.length ? 'codegen 缺: ' + r.missing.join(', ') : '';
      const extra = r.unknown.length ? 'codegen 多: ' + r.unknown.join(', ') : '';
      return '  ' + r.slug + '  [' + miss + (miss && extra ? ' | ' : '') + extra + ']';
    })
    .join('\n');
  assert.fail(
    analysis.mismatched.length + ' 个引擎的 codegen defaultInputs 与引擎 inputs[].name 对不上 ⇒ ' +
    'staticExamples[0] 是拿错输入算出来的（实测线上曾整页全是 0）：\n' + detail
  );
});

// === T3: 非退化（用户可见层） ===
test('T3: 用 defaultInputs 现算的输出不含 NaN/undefined，且不是全部数字为 0', () => {
  const analysis = analyzeCodegenDefaults();
  const bad: string[] = [];
  for (const r of analysis.rows) {
    if (r.outputHasNaN) bad.push(r.slug + '（输出含 NaN/undefined）');
    else if (r.allNumbersZero) bad.push(r.slug + '（输出全部数字为 0）');
  }
  assert.equal(bad.length, 0, '静态示例是退化输出（用户看到的是 0 或 NaN）：\n  ' + bad.join('\n  '));
});

// === T4: 修复在生效（用户可见层 · 本批承重） ===
test('T4: 12 个引擎已提交的 staticExamples[0] 必须 ≠ 用「修复前输入」算出的结果', () => {
  const engines = getAllEngines() as any[];
  const bySlug = new Map<string, any>();
  for (const e of engines) bySlug.set(e.slug, e);
  const same: string[] = [];
  for (const slug of T4_SLUGS) {
    const engine = bySlug.get(slug);
    const legacy = LEGACY[slug];
    assert.ok(engine, '引擎注册表里缺少 ' + slug);
    assert.ok(legacy, '夹具里缺少 ' + slug + ' 的修复前输入');
    const committed = engine.staticExamples[0];
    assert.ok(typeof committed === 'string' && committed.length > 0, slug + ' 没有 staticExamples[0]');
    let legacyOut = '';
    try {
      legacyOut = withMockedDate(() => runEngine(engine, legacy as Record<string, any>));
    } catch (err) {
      legacyOut = 'ERROR: ' + String(err);
    }
    if (committed === legacyOut) same.push(slug);
  }
  assert.equal(
    same.length,
    0,
    '这些引擎已提交的静态示例 == 用「修复前输入」算出来的结果 ⇒ defaultInputs 修复没有生效：\n  ' + same.join('\n  ')
  );
});
