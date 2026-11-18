#!/usr/bin/env node
// scripts/codegen-customfn.mjs
// P168 B3-10 —— 重生成每个引擎的**客户端 customFn**，内容 = 服务端那份代码。
//
// 为什么不再是「只重生成数据表」
// ============================
// 旧版（P141~P163）：本脚本只重生成 customFn 里的**数据表**（`var M={…}`），
//   **逻辑**部分是手抄的镜像 ⇒ 服务端一升级客户端就跟不上。
//   ⇒ B3-10 实测：全仓 100 个引擎欠账 **61** 条（58 条 customFn 返回多元素 + 32 条服务端↔客户端漂移，并集 61）。
//
// 现在：客户端 customFn **整段**由服务端代码派生（scripts/customfn-port.ts，TS AST + transpile）。
//   ① 漂移在**结构上**不可能发生 —— 不是「测过了没漂」，是「同一份代码」。
//   ② 数据表仍然是「算好的交互态子集」：折叠在**本次生成时**对着当前
//      src/data/ai-pricing.json 求值 ⇒ 每周的价格同步照样进浏览器
//      ⇒ P156 的「客户端最小数据架构」不被破坏。
//   ③ 生成是**确定性的**（实测：100 个引擎二次生成逐字节一致）⇒ --check 不会假红。
//
// --check：只算不写；任一引擎漂移 ⇒ exit 1。任一引擎移植失败 ⇒ exit 1（**不静默跳过**）。
//
// 用法（必须从仓库根跑）：
//   node scripts/codegen-customfn.mjs            # 生成
//   node scripts/codegen-customfn.mjs --check    # 只查漂移

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CHECK_MODE = process.argv.includes('--check');
const PORT_SENTINEL = '__FFK_PORT_JSON__';
const NL = String.fromCharCode(10);

function walk(dir, acc) {
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (entry.endsWith('.ts')) acc.push(p);
  }
  return acc;
}

/** 收集所有「有 customFn」的引擎 —— 客户端 customFn 必须永远是服务端派生的 */
function collectEngines() {
  const out = [];
  for (const f of walk(path.join(ROOT, 'src', 'engines'), [])) {
    const src = fs.readFileSync(f, 'utf8');
    if (src.indexOf('customFn') < 0) continue;
    const m = src.match(/slug:\s*['"]([^'"]+)['"]/);
    if (!m) continue;
    out.push({ file: path.relative(ROOT, f).split(path.sep).join('/'), slug: m[1] });
  }
  out.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
  return out;
}

const ENGINES = collectEngines();

if (process.argv.includes('--legacy-codegen')) {
  console.log('[codegen-customfn] 注：--legacy-codegen 已无意义（旧的手抄镜像通路已下线），本次按新通路执行。');
}

console.log('[codegen-customfn] ' + (CHECK_MODE ? 'Checking' : 'Regenerating') +
  ' client customFn from server code for ' + ENGINES.length + ' engine(s)...');

if (ENGINES.length === 0) {
  console.error('[codegen-customfn] ✗ 没找到任何带 customFn 的引擎 —— 这是「静默跳过」的典型形态，直接判失败。');
  process.exit(1);
}

// 1) 写批次清单（移植器按清单逐个处理）
const listFile = path.join(os.tmpdir(), 'ffk-customfn-port-batch.json');
fs.writeFileSync(listFile, JSON.stringify(ENGINES.map((e) => ({ file: e.file, slug: e.slug }))), 'utf8');

// 2) 调移植器（需要 tsx 才能加载 TS 模块做折叠求值）
const portArgs = ['--import', 'tsx', path.join(ROOT, 'scripts', 'customfn-port.ts'), '--batch', listFile];
if (CHECK_MODE) portArgs.push('--check');
const proc = spawnSync(process.execPath, portArgs, {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});

if (proc.status !== 0) {
  console.error('[codegen-customfn] ✗ 移植器失败（exit ' + proc.status + '）');
  if (proc.stderr) console.error(proc.stderr);
  process.exit(1);
}

const marker = (proc.stdout || '').split(NL).find((l) => l.startsWith(PORT_SENTINEL));
if (!marker) {
  console.error('[codegen-customfn] ✗ 移植器没有返回 JSON 结果');
  if (proc.stdout) console.error(proc.stdout);
  process.exit(1);
}
const results = JSON.parse(marker.slice(PORT_SENTINEL.length)).results;

// 3) 报告 —— 移植失败直接判失败（旧脚本这里是「⚠ markers not found (skipped)」⇒ 静默跳过）
const failed = results.filter((r) => !r.ok);
if (failed.length > 0) {
  console.error('');
  console.error('[codegen-customfn] ✗ ' + failed.length + ' engine(s) 移植失败（不静默跳过）：');
  for (const r of failed) console.error('  ✗ ' + r.file + ' :: ' + r.note);
  process.exit(1);
}

const drifted = results.filter((r) => r.changed);

if (CHECK_MODE) {
  for (const r of results) {
    if (r.changed) console.error('  ✗ ' + r.file + ': drift detected');
    else console.log('  ✓ ' + r.file);
  }
  if (drifted.length > 0) {
    console.error('');
    console.error('[codegen-customfn] ✗ ' + drifted.length + ' engine(s) have drift. Re-run without --check to update.');
    process.exit(1);
  }
  console.log('');
  console.log('[codegen-customfn] ✓ No drift detected.');
  process.exit(0);
}

for (const r of drifted) console.log('  ✓ ' + r.file + ' (updated)');
console.log('');
console.log('[codegen-customfn] Done. ' + drifted.length + ' engine(s) updated.');
process.exit(0);
