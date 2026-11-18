#!/usr/bin/env node
// P168 B3-9 —— **守卫「代码形态假设」变异台子**（令牌化改写代码形态后，守卫会不会失明）。
//
// 为什么需要这个台子
// ------------------
// 令牌化把服务端 prose 从单行 `out.push('…')` 改写成多行 `out.push(makeToken(code, '…', {…}))`
// ⇒ 两条既有守卫都**按代码形态找东西**：
//   · `engine-prose-live-price-guard` 的 E1 要求「锚点句与 `out.push(` **同行**」
//     ⇒ 形态一变就**红**（吵闹但安全）⇒ 本批修法：定位「包住锚点的那条 out.push 语句」。
//   · `price-render-defect-guard` 的扫描面是「**含 `out.push` 的那一行**」
//     ⇒ 形态一变，**续行里的写死价就逃过判据** ⇒ **静默变真空绿**（安静但危险）
//     ⇒ 本批修法：扫描面扩到「整条 push 语句覆盖到的每一行」。
//
// ⇒ 本台子用两条变异证明这两个守卫**真能咬住**，而不是「改完照样绿」：
//   G1 给训练引擎**多行 push 的续行**加 `'$' + fmt(...)` ⇒ 价格守卫必须精确红 1 条
//      （⚠️ 旧的逐行扫在这一行 `pushLine=0` ⇒ 完全看不见）。
//   G2 把 gemini prose 的派生价改成写死 `'$0.50'` ⇒ prose 守卫必须精确红 1 条。
//
// ⚠️ 纪律：
//   · 真相源**先落盘**成不可变副本（tmp/*.PRE-MUT）；
//   · 还原**无条件执行**（finally）+ sha256 **逐字节**校验；
//   · 一条变异只红一条断言（隔离）。
//
// 用法（必须从仓库根跑）：node node_modules/tsx/dist/cli.mjs tests/scripts/p168-guard-shape-mutation.ts

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const TRAIN_ENGINE = resolve(ROOT, 'src', 'engines', 'ai-cost', 'ai-training-cost-estimator.ts');
const GEMINI_ENGINE = resolve(ROOT, 'src', 'engines', 'ai-cost', 'gemini-api-cost-calculator.ts');
const PRICE_GUARD = resolve(ROOT, 'tests', 'price-render-defect-guard.test.ts');
const PROSE_GUARD = resolve(ROOT, 'tests', 'engine-prose-live-price-guard.test.ts');
const TMP = resolve(ROOT, 'tmp');
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });

const sha = (s: string): string => createHash('sha256').update(s).digest('hex');

const ORIGINALS: Record<string, string> = {
  [TRAIN_ENGINE]: readFileSync(TRAIN_ENGINE, 'utf8'),
  [GEMINI_ENGINE]: readFileSync(GEMINI_ENGINE, 'utf8'),
};
for (const [file, content] of Object.entries(ORIGINALS)) {
  writeFileSync(resolve(TMP, 'p168-shape-' + file.split(/[\\/]/).pop() + '.PRE-MUT'), content, 'utf8');
}
console.log(
  '备份：train=' +
    sha(ORIGINALS[TRAIN_ENGINE]).slice(0, 16) +
    ' · gemini=' +
    sha(ORIGINALS[GEMINI_ENGINE]).slice(0, 16),
);

const variants = [
  {
    id: 'G1',
    name: '给训练引擎「多行 push 的续行」加写死的 $ + fmt(...)（旧逐行扫看不见这一行）',
    file: TRAIN_ENGINE,
    guard: PRICE_GUARD,
    from: '      fmt(cumTotal).padEnd(16),',
    to: "      '$' + fmt(cumTotal).padEnd(16),",
  },
  {
    id: 'G2',
    name: '把 gemini prose 的派生价改成写死价（E1 的「不许写死 $价」必须咬住）',
    file: GEMINI_ENGINE,
    guard: PROSE_GUARD,
    from: "input: '$' + gf.input.toFixed(2), output: '$' + gf.output.toFixed(2)",
    to: "input: '$0.50', output: '$' + gf.output.toFixed(2)",
  },
];

let survived = 0;
let notIsolated = 0;
try {
  for (const v of variants) {
    const orig = ORIGINALS[v.file];
    const hits = orig.split(v.from).length - 1;
    if (hits !== 1) {
      console.log(v.id + ' SKIP：目标串命中 ' + hits + ' 次（必须恰好 1 次）');
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
          '--test',
          '--test-concurrency=1',
          '--test-reporter=spec',
          v.guard,
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
    console.log(
      v.id +
        ' ' +
        v.name +
        ' => ' +
        (caught ? 'KILLED' : 'SURVIVED') +
        '（红 ' +
        failedCount +
        ' 条 / 绿 ' +
        passCount +
        ' 条，退出码 ' +
        code +
        '）',
    );
    writeFileSync(v.file, orig, 'utf8');
  }
} finally {
  for (const [file, content] of Object.entries(ORIGINALS)) {
    writeFileSync(file, content, 'utf8');
  }
  let allOk = true;
  for (const [file, content] of Object.entries(ORIGINALS)) {
    const ok = sha(readFileSync(file, 'utf8')) === sha(content);
    console.log('还原：' + file.split(/[\\/]/).pop() + ' ' + (ok ? '一致 ✓' : '不一致 ✗'));
    if (!ok) allOk = false;
  }
  if (!allOk) {
    console.log('ABORT：还原校验失败');
    process.exit(1);
  }
}
console.log('存活 ' + survived + ' · 未隔离 ' + notIsolated);
process.exit(survived === 0 && notIsolated === 0 ? 0 : 1);
