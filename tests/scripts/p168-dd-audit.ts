#!/usr/bin/env node
// P168 B3-8 —— 双美元号（$$）**运行时层**审计：逐引擎跑服务端 generate() 与客户端 customFn，
//   统计「可见的双美元号」出现次数。
//
// ⭐ 为什么需要它（与 G14 的分工）
//   · G14（tests/calc-output-no-dd-guard.test.ts）守的是**产物层**（dist HTML）
//     ⇒ 能证明「用户看到的页面没有 $$」，但**不能告诉你在源码里改哪一行**。
//   · 本工具守的是**运行时层**（引擎真实吐出的字符串）⇒ 精确指向「哪个引擎、哪一处」
//     ⇒ 用来定位缺陷点，也用来验证修复后是否真的归零。
//   ⇒ 两层不是重复守同一个不变量：一个是产物，一个是运行时。
//
// 用法（从仓库根跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-dd-audit.ts            # 全部引擎
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-dd-audit.ts affiliate  # 只看匹配的引擎
//
// 判定口径（与 G14 完全一致）：`$$` 后面不跟 `$` 才算缺陷（`$$$` 是合法示例）。

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import '../../src/engines/index.ts';
import { getAllEngines } from '../../src/core/engines/registry.ts';

const DD = /\$\$(?!\$)/g;

function defaultInputs(): Record<string, Record<string, string>> {
  const src = readFileSync(resolve(import.meta.dirname, '..', '..', 'scripts', 'codegen-examples.mjs'), 'utf8');
  const i = src.indexOf('const ENGINES = [');
  const j = src.indexOf('\n];', i);
  const arr = new Function('return ' + src.slice(src.indexOf('[', i), j + 2))();
  const out: Record<string, Record<string, string>> = {};
  for (const e of arr) out[e.slug] = e.defaultInputs;
  return out;
}

const defaults = defaultInputs();
const engines = getAllEngines() as any[];
const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const use = only.length ? engines.filter((e) => only.some((n) => e.slug.includes(n))) : engines;

let totalServer = 0;
let totalClient = 0;
let badEngines = 0;
console.log('slug'.padEnd(52) + 'server  client');
for (const e of use) {
  const inputs = defaults[e.slug];
  if (!inputs) continue;
  const gen = e.generate ?? e.calculate;
  let sTxt = '';
  try { sTxt = (gen(inputs) as string[]).join('\n'); } catch (err) { sTxt = 'ERR ' + String(err); }
  const s = (sTxt.match(DD) || []).length;
  let cTxt = '';
  const cf = e.clientConfig && e.clientConfig.customFn;
  if (cf) {
    try {
      const fn = new Function('inputs', 'pick', 'fill', cf);
      cTxt = (fn(inputs, (x: any) => x, (a: any, b: any) => b) as string[]).join('\n');
    } catch (err) { cTxt = 'ERR ' + String(err); }
  }
  const c = (cTxt.match(DD) || []).length;
  totalServer += s;
  totalClient += c;
  if (s || c) { badEngines++; console.log(e.slug.padEnd(52) + String(s).padStart(5) + String(c).padStart(8)); }
}
console.log('—— ' + use.length + ' 个引擎 · 服务端 ' + totalServer + ' 处 / 客户端 ' + totalClient + ' 处 · 有缺陷的引擎 ' + badEngines);
console.log(totalServer + totalClient === 0 ? 'ALL OK' : 'NOT YET');
process.exitCode = totalServer + totalClient === 0 ? 0 : 1;