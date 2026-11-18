#!/usr/bin/env node
// P168 B3-10 —— **G6 漂移台账变异台子**（重校准版）。
//
// 为什么必须重校准
// ------------------
//   B3-10 之前，台账**非空**（32 条漂移）⇒ 变异台子去改**台账条目**（分类改错 / 删一条）
//   ⇒ 守卫必须红。
//   B3-10 之后，客户端 customFn 改成**服务端同一份代码的派生副本** ⇒ 漂移**清零**、台账**清空**
//   ⇒ 「改台账条目」这个变异**失去了对象**（目标串不存在了）。
//   ⇒ 新的失败形态有两条，而且**更重要**：
//     ① **客户端副本被改**（生成区里的字面量被手改）⇒ 客户端与服务端漂移；
//     ② **服务端改了但副本没重新生成** ⇒ 副本**陈旧**（这正是「派生」架构最典型的回归）。
//   ⇒ 台子改成直接制造这两种漂移 ⇒ 证明 G6 判据**有牙**。
//
// ⚠️ 纪律：还原**无条件执行**（finally）+ sha256 **逐字节**校验；一条变异只红一条断言（隔离）。
//   选用的引擎**未令牌化** ⇒ 不在 G6 的试点清单里 ⇒ 只会有 G6-debt 那一条红 ⇒ 隔离成立。
//
// 用法（必须从仓库根跑）：node node_modules/tsx/dist/cli.mjs tests/scripts/p168-g6-drift-ledger-mutation.ts

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const LEDGER = resolve(ROOT, 'tests', 'scripts', 'p168-server-client-drift-ledger.ts');
const GUARD = resolve(ROOT, 'tests', 'calc-output-parity-guard.test.ts');
const ENGINE = resolve(ROOT, 'src', 'engines', 'investment', 'compound-interest-calculator.ts');
const sha = (p: string): string => createHash('sha256').update(readFileSync(p, 'utf-8')).digest('hex');

const LEDGER_ORIG = readFileSync(LEDGER, 'utf-8');
const GUARD_ORIG = readFileSync(GUARD, 'utf-8');
const ENGINE_ORIG = readFileSync(ENGINE, 'utf-8');
const L0 = sha(LEDGER);
const G0 = sha(GUARD);
const E0 = sha(ENGINE);

const NLc = String.fromCharCode(10);
/** 被改的字面量：服务端与客户端副本里各出现一次（服务端在前、副本在后） */
const LIT = '\u2022 Total Contributions:      ';
const MUT = '\u2022 Total Contributions (MUT): ';

/** 只改第一次出现（服务端那处） */
function replaceFirst(text: string, from: string, to: string): string {
  const i = text.indexOf(from);
  if (i < 0) return text;
  return text.slice(0, i) + to + text.slice(i + from.length);
}

/** 生成区的边界标记（与 scripts/customfn-port.ts 发射的一致） */
const GEN_START = 'FFK-SERVER-DERIVED:start';
const GEN_END = 'FFK-SERVER-DERIVED:end';

/**
 * 只改**生成区里**的第一处出现。
 *
 * ⚠️ 为什么必须限定在生成区内：那个字面量在文件里出现**三次** ——
 *   服务端源码一次、生成区一次、`staticExamples` 一次（静态卡片的内容）。
 *   ⇒ 「改最后一次」会改到 **staticExamples** ⇒ G6 不比对静态卡片 ⇒ **变异存活**
 *   ⇒ 台子会误报「守卫没牙」⇒ 而其实是**变异没打中目标**。
 */
function replaceInGenerated(text: string, from: string, to: string): string {
  const a = text.indexOf(GEN_START);
  const b = text.indexOf(GEN_END, a + 1);
  if (a < 0 || b < 0) return text;
  const region = text.slice(a, b);
  const i = region.indexOf(from);
  if (i < 0) return text;
  return text.slice(0, a) + region.slice(0, i) + to + region.slice(i + from.length) + text.slice(b);
}

const variants = [
  {
    id: 'M1',
    name: '改客户端副本（生成区）里的一个字面量 ⇒ 客户端与服务端漂移',
    file: ENGINE,
    apply: (t: string) => replaceInGenerated(t, LIT, MUT),
  },
  {
    id: 'M2',
    name: '改服务端里的一个字面量但**不重新生成副本** ⇒ 副本陈旧',
    file: ENGINE,
    apply: (t: string) => replaceFirst(t, LIT, MUT),
  },
  {
    id: 'M3',
    name: '台账塞进一条不存在的引擎（幽灵欠账）',
    file: LEDGER,
    apply: (t: string) => t.replace(
      'export const DRIFT_DEBT: Record<string, { kind: DriftKind; note: string }> = {',
      'export const DRIFT_DEBT: Record<string, { kind: DriftKind; note: string }> = {' + NLc
        + "  'solopreneur-ghost-engine-calculator': { kind: 'wording', note: '幽灵' },",
    ),
  },
];

let survived = 0;
let notIsolated = 0;
try {
  for (const v of variants) {
    const orig = v.file === LEDGER ? LEDGER_ORIG : ENGINE_ORIG;
    // ⚠️ 「变异有没有真的打中目标」的判据 = **改完的内容与原文不同**
    //   （旧版用「目标串命中次数」⇒ 台账清零后目标串不存在 ⇒ 命中 0 次 ⇒ 报 SKIP
    //    ⇒ 台子会把「变异没打中」误报成「守卫没牙」⇒ 会去「修」一个根本没坏的守卫）。
    const mutated = v.apply(orig);
    if (mutated === orig) {
      console.log(v.id + ' SKIP：变异没有生效（目标串可能不存在）');
      survived++;
      continue;
    }
    writeFileSync(v.file, mutated, 'utf-8');
    let out = '';
    let code = 0;
    try {
      out = execFileSync(process.execPath, [
        resolve(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
        '--test', '--test-concurrency=1', '--test-reporter=spec', GUARD,
      ], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], cwd: ROOT });
      code = 0;
    } catch (e) {
      const err = e as { stdout?: string; stderr?: string; status?: number };
      out = String(err.stdout || '') + String(err.stderr || '');
      code = err.status === undefined ? -1 : err.status;
    }
    const failed = Number((out.match(/(?:^not ok |fail |# fail )(\d+)/m) || [0, '0'])[1]);
    const passed = Number((out.match(/(?:^ok |pass |# pass )(\d+)/m) || [0, '0'])[1]);
    const caught = code !== 0 && failed >= 1;
    const isolated = failed === 1;
    if (!caught) survived++;
    if (caught && !isolated) notIsolated++;
    console.log(
      v.id + ' ' + v.name + ' => ' + (caught ? 'KILLED' : 'SURVIVED') +
        '（红 ' + failed + ' 条 / 绿 ' + passed + ' 条，退出码 ' + code + '）',
    );
    writeFileSync(v.file, orig, 'utf-8');
  }
} finally {
  writeFileSync(LEDGER, LEDGER_ORIG, 'utf-8');
  writeFileSync(GUARD, GUARD_ORIG, 'utf-8');
  writeFileSync(ENGINE, ENGINE_ORIG, 'utf-8');
  const okL = sha(LEDGER) === L0;
  const okG = sha(GUARD) === G0;
  const okE = sha(ENGINE) === E0;
  console.log('还原：台账 ' + (okL ? '一致 ✓' : '不一致 ✗') + ' · 守卫 ' + (okG ? '一致 ✓' : '不一致 ✗') + ' · 引擎 ' + (okE ? '一致 ✓' : '不一致 ✗'));
  if (!okL || !okG || !okE) process.exit(1);
}
console.log('存活 ' + survived + ' · 未隔离 ' + notIsolated);
process.exit(survived === 0 && notIsolated === 0 ? 0 : 1);