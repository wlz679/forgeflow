#!/usr/bin/env node
// P168 B3-13 —— 「zh 整行英文」欠账台账**变异台子**（证明守卫有牙）。
//
// 为什么需要它
// -------------
//   守卫说「台账与现实一致」⇒ 但**守得住吗**？本台子用 4 条变异回答这个问题：
//   每条变异精确地破坏**一个**不变量 ⇒ 守卫必须精确地红 **1 条**断言（KILLED + 隔离）。
//   ⇒ 「红」说明有牙；「只红 1 条」说明不变量没有被别处重复守（否则一个变异红一片 ⇒ 变异台子
//     分不清是哪个不变量在起作用 ⇒ 台账规则会慢慢糊成一团）。
//
// 四条变异（每条精确红 1 条断言）
//   M1 台账里某一条的行数 +1            → T2 红（逐条行数）
//   M2 删掉台账里一条（该引擎仍有欠账）  → T1 红（集合相等：实测有 / 台账无）
//   M3 塞一条幽灵 slug（不存在的引擎）   → T1 红（集合相等：台账有 / 实测无）
//   M4 从 TOKENIZED 里删掉一个引擎        → T4 红（源码含 token ≡ TOKENIZED）
//
// ⚠️ M4 的隔离前提：只跑**本守卫这一个测试文件**
//   tests/calc-output-en-parity-guard.test.ts 里硬编码了 TOKENIZED.length === 45
//   ⇒ 从 TOKENIZED 删掉一个引擎会让**那个**套件也红 ⇒ 判定范围只限本守卫。
//   （M1/M2/M3 只改台账文件 ⇒ 不影响别的套件，但统一只跑一个文件更省时。）
//
// ⚠️ 纪律（照抄 B3-12 的 G6 台子）
//   · 还原**无条件执行**（finally）+ sha256 **逐字节**校验；
//   · 每条变异必须**真的改到文件**（写完校验 sha256 已变）——
//     否则「变异没打中」会被误报成「守卫没牙」⇒ 台子会让人去「修」一个根本没坏的守卫；
//   · **负对照**：未变异时守卫必须绿（绿了才说明下面的红是变异造成的）。
//
// 用法（必须从仓库根跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/mutate-p168-tokenize-remaining.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const LEDGER = resolve(ROOT, 'tests', 'scripts', 'p168-tokenize-remaining-ledger.ts');
const GUARD = resolve(ROOT, 'tests', 'tokenize-remaining-ledger-guard.test.ts');
const TOKENIZED_LIST = resolve(ROOT, 'tests', 'scripts', 'p168-tokenized-engines.mjs');

/** 逐字节 sha256（用 Buffer，不经过 utf-8 解码 ⇒ 行尾/字节差异都能看见） */
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

const LEDGER_ORIG = readFileSync(LEDGER);
const GUARD_ORIG = readFileSync(GUARD);
const LIST_ORIG = readFileSync(TOKENIZED_LIST);
const L0 = sha(LEDGER);
const G0 = sha(GUARD);
const T0 = sha(TOKENIZED_LIST);

const NL = String.fromCharCode(10);

/**
 * 跑**只有**本守卫这一个文件的测试，返回红/绿条数。
 *
 * ⚠️ 必须显式给子进程带上 RUN_BUILD_TESTS=1 —— 本守卫是 build-dep（读 dist/），
 *   没有这个变量时 T1/T2 会 t.skip ⇒ 变异 M1/M2 **不会被杀**（台子会误报「守卫没牙」）。
 */
function runGuard() {
  let out = '';
  let code = 0;
  try {
    out = execFileSync(
      process.execPath,
      [
        resolve(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
        '--test', '--test-concurrency=1', '--test-reporter=tap', GUARD,
      ],
      {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: ROOT,
        env: { ...process.env, RUN_BUILD_TESTS: '1' },
      },
    );
    code = 0;
  } catch (e) {
    const err = e;
    out = String(err.stdout || '') + String(err.stderr || '');
    code = err.status === undefined ? -1 : err.status;
  }
  // ⚠️ 用 TAP 报告器逐行数（spec 报告器只给汇总，定位不到是哪一条红了）
  const failed = (out.match(/^not ok \d+/gm) || []).length;
  const passed = (out.match(/^ok \d+/gm) || []).length;
  return { out, code, failed, passed };
}

const variants = [
  {
    id: 'M1',
    name: '台账里某一条的行数 +1（数字与现实脱节）',
    file: LEDGER,
    orig: LEDGER_ORIG,
    apply: (t) => t.replace(
      "'solopreneur-meeting-cost-calculator': 41,",
      "'solopreneur-meeting-cost-calculator': 42,",
    ),
    expect: 'T2',
  },
  {
    id: 'M2',
    name: '删掉台账里一条（该引擎实测仍有欠账）',
    file: LEDGER,
    orig: LEDGER_ORIG,
    apply: (t) => t.replace(/  'solopreneur-course-pricing-calculator': 38,\r?\n/, ''),
    expect: 'T1',
  },
  {
    id: 'M3',
    name: '台账塞进一条不存在的引擎（幽灵欠账）',
    file: LEDGER,
    orig: LEDGER_ORIG,
    apply: (t) => t.replace(
      'export const ZH_EN_DEBT: Record<string, number> = {',
      'export const ZH_EN_DEBT: Record<string, number> = {' + NL
        + "  'solopreneur-ghost-engine-calculator': 3,",
    ),
    expect: 'T1',
  },
  {
    id: 'M4',
    name: '从 TOKENIZED 里删掉一个引擎（源码仍吐 token ⇒ 那几个守卫不再覆盖它）',
    file: TOKENIZED_LIST,
    orig: LIST_ORIG,
    apply: (t) => t.replace(/  \{ slug: 'solopreneur-gpu-cloud-cost-calculator'[^\n]*\r?\n/, ''),
    expect: 'T4',
  },
];

let survived = 0;
let notIsolated = 0;

// ── 负对照：未变异时守卫必须绿（否则下面的红说明不了问题）────────────────
const control = runGuard();
const controlOk = control.code === 0 && control.failed === 0 && control.passed > 0;
console.log(
  '负对照（未变异）：' + (controlOk ? '绿 ✓' : '红 ✗')
    + '（红 ' + control.failed + ' 条 / 绿 ' + control.passed + ' 条，退出码 ' + control.code + '）',
);
if (!controlOk) {
  console.log(control.out);
  survived++;
}

try {
  for (const v of variants) {
    const origText = v.orig.toString('utf-8');
    const mutated = v.apply(origText);
    // ⚠️ 「变异有没有真的打中目标」的判据 = **改完的内容与原文不同**
    //   （否则「变异没打中」会被误报成「守卫没牙」⇒ 台子会误导人去修一个没坏的守卫）。
    if (mutated === origText) {
      console.log(v.id + ' SKIP：变异没有生效（目标串可能不存在）');
      survived++;
      continue;
    }
    writeFileSync(v.file, mutated, 'utf-8');
    // ⚠️ 必须真的改到文件（写完校验 sha256 已变）—— 否则文件没落盘 ⇒ 变异等于没做。
    if (sha(v.file) === (v.file === LEDGER ? L0 : T0)) {
      console.log(v.id + ' SKIP：写盘后 sha256 没变（文件没被改动？）');
      survived++;
      continue;
    }
    const r = runGuard();
    const caught = r.code !== 0 && r.failed >= 1;
    const isolated = r.failed === 1;
    if (!caught) survived++;
    if (caught && !isolated) notIsolated++;
    console.log(
      v.id + ' ' + v.name + ' => ' + (caught ? 'KILLED' : 'SURVIVED')
        + '（期望红 ' + v.expect + ' · 红 ' + r.failed + ' 条 / 绿 ' + r.passed + ' 条，退出码 ' + r.code + '）',
    );
    if (!caught) console.log(r.out);
    writeFileSync(v.file, v.orig);
  }
} finally {
  // ⭐ 还原**无条件执行**（finally）+ sha256 **逐字节**校验
  writeFileSync(LEDGER, LEDGER_ORIG);
  writeFileSync(GUARD, GUARD_ORIG);
  writeFileSync(TOKENIZED_LIST, LIST_ORIG);
  const okL = sha(LEDGER) === L0;
  const okG = sha(GUARD) === G0;
  const okT = sha(TOKENIZED_LIST) === T0;
  console.log('还原：台账 ' + (okL ? '一致 ✓' : '不一致 ✗')
    + ' · 守卫 ' + (okG ? '一致 ✓' : '不一致 ✗')
    + ' · 令牌化清单 ' + (okT ? '一致 ✓' : '不一致 ✗'));
  if (!okL || !okG || !okT) process.exit(1);
}
console.log('存活 ' + survived + ' · 未隔离 ' + notIsolated);
process.exit(survived === 0 && notIsolated === 0 ? 0 : 1);
