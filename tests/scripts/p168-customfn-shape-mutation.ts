#!/usr/bin/env node
// P168 B3-9 —— **G15 变异台子**（customFn 返回数组长度守卫的承重证明）。
//
// 为什么要变异台子
// ------------------
// G15 断言的是「customFn 必须返回**单元素**数组」+「台账与实测**集合相等**」。
// 这类断言最常见的假绿是：**写得太宽**，什么都能过。⇒ 用变异证明它真能咬住：
//   M1 把一个**合规**引擎改回多元素 ⇒ G15 必须精确红 1 条（不得红成 2 条）。
//   M2 从台账里删掉一条**仍在欠账**的引擎 ⇒ G15 必须精确红 1 条（台账不许漂）。
//
// ⚠️ 纪律：
//   · 真相源**先落盘**成不可变副本（tmp/*.PRE-MUT）—— 脚本失败 = 内存快照跟着进程蒸发；
//   · 还原**无条件执行**（finally）+ sha256 **逐字节**校验；
//   · 一条变异只红一条断言（隔离）。
//
// 用法（必须从仓库根跑）：node node_modules/tsx/dist/cli.mjs tests/scripts/p168-customfn-shape-mutation.ts

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const ENGINE = resolve(ROOT, 'src', 'engines', 'saas', 'mrr-calculator.ts');
const GUARD_FILE = resolve(ROOT, 'tests', 'customfn-single-element-guard.test.ts');
const TMP = resolve(ROOT, 'tmp');
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });

const sha = (s: string): string => createHash('sha256').update(s).digest('hex');

const engineOrig = readFileSync(ENGINE, 'utf8');
const guardOrig = readFileSync(GUARD_FILE, 'utf8');
writeFileSync(resolve(TMP, 'p168-g15-engine.PRE-MUT'), engineOrig, 'utf8');
writeFileSync(resolve(TMP, 'p168-g15-guard.PRE-MUT'), guardOrig, 'utf8');
console.log('备份：engine sha256=' + sha(engineOrig).slice(0, 16) + ' · guard sha256=' + sha(guardOrig).slice(0, 16));

const variants = [
  {
    id: 'M1',
    name: '把合规引擎 mrr-calculator 的 clientFn 改回多元素数组',
    file: ENGINE,
    from: '"return [r];";',
    to: '"return [r, r];";',
  },
  {
    id: 'M2',
    name: '从 DEBT 台账里删掉一条仍在欠账的引擎（dscr）',
    file: GUARD_FILE,
    from: "  'solopreneur-dscr-calculator'," + String.fromCharCode(10),
    to: '',
  },
];

let survived = 0;
let notIsolated = 0;
try {
  for (const v of variants) {
    const orig = v.file === ENGINE ? engineOrig : guardOrig;
    if (orig.indexOf(v.from) < 0) {
      console.log(v.id + ' SKIP：目标串在当前文件里找不到');
      survived++;
      continue;
    }
    writeFileSync(v.file, orig.split(v.from).join(v.to), 'utf8');
    let out = '';
    let code = 0;
    try {
      out = execFileSync(
        process.execPath,
        [
          resolve(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
          '--test', '--test-concurrency=1', '--test-reporter=spec', GUARD_FILE,
        ],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], cwd: ROOT },
      );
      code = 0;
    } catch (e) {
      const err = e as { stdout?: string; stderr?: string; status?: number };
      out = String(err.stdout || '') + String(err.stderr || '');
      code = err.status === undefined ? -1 : err.status;
    }
    const failedCount = Number((out.match(/(?:^not ok |ℹ fail |# fail )(\d+)/m) || [0, '0'])[1]);
    const passCount = Number((out.match(/(?:^ok |ℹ pass |# pass )(\d+)/m) || [0, '0'])[1]);
    const caught = code !== 0 && failedCount >= 1;
    const isolated = failedCount === 1;
    if (!caught) survived++;
    if (caught && !isolated) notIsolated++;
    console.log(v.id + ' ' + v.name + ' => ' + (caught ? 'KILLED' : 'SURVIVED') + '（红 ' + failedCount + ' 条 / 绿 ' + passCount + ' 条，退出码 ' + code + '）');
    writeFileSync(v.file, orig, 'utf8');
  }
} finally {
  writeFileSync(ENGINE, engineOrig, 'utf8');
  writeFileSync(GUARD_FILE, guardOrig, 'utf8');
  const okEngine = sha(readFileSync(ENGINE, 'utf8')) === sha(engineOrig);
  const okGuard = sha(readFileSync(GUARD_FILE, 'utf8')) === sha(guardOrig);
  console.log('还原：engine ' + (okEngine ? '一致 ✓' : '不一致 ✗') + ' · guard ' + (okGuard ? '一致 ✓' : '不一致 ✗'));
  if (!okEngine || !okGuard) {
    console.log('ABORT：还原校验失败');
    process.exit(1);
  }
}
console.log('存活 ' + survived + ' · 未隔离 ' + notIsolated);
process.exit(survived === 0 && notIsolated === 0 ? 0 : 1);
