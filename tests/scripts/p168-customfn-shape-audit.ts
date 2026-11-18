#!/usr/bin/env node
// P168 B3-9 —— 可复算体检：逐引擎核对 customFn 的**返回数组形态**与页面真实契约。
//
// 页面（src/pages/[lang]/[slug].astro:2186）对 custom 型引擎只渲染 results[0]
//   ⇒ 返回多元素数组 ⇒ 第 2 行起的全部内容被静默丢弃（用户只看到第一行）。
//
// 页面渲染分支（同一文件 2189-2214）：
//   ① 单个元素里同时出现 ' → ' 与 ' | ' ⇒ 走 analysis-card（折叠详情）
//   ② 否则 custom 且 results.length === 1 ⇒ 走「仪表盘卡片」（整份报告）
//   ⇒ 把多元素合并成单元素前，必须先量「合并后会不会掉进分支①」。
//
// 用法（必须从仓库根跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-customfn-shape-audit.ts

import { getAllEngines } from '../../src/core/engines/registry.ts';

const NL = String.fromCharCode(10);
const ARROW = ' → ';
const PIPE = ' | ';

function pick(arr: unknown[]): unknown {
  return arr[Math.floor(Math.random() * arr.length)];
}
function fill(t: string, v: Record<string, string>): string {
  return t.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '{' + k + '}');
}
function syntheticInputs(engine: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const input of engine.inputs ?? []) {
    if (input.type === 'number') { out[input.name] = '1000'; continue; }
    if (input.type === 'select' && Array.isArray(input.options) && input.options.length > 0) {
      const first = input.options[0];
      out[input.name] = typeof first === 'object' && first !== null ? (first.value ?? first.label) : first;
      continue;
    }
    out[input.name] = 'SaaS';
  }
  return out;
}

async function main() {
  await import('../../src/engines/index.ts');
  const engines = getAllEngines() as any[];
  const rows: any[] = [];
  for (const e of engines) {
    const body = e.clientConfig?.customFn;
    if (typeof body !== 'string' || !body.length) continue;
    let fn: any;
    try { fn = new Function('inputs', 'pick', 'fill', body); } catch (err: any) { rows.push({ slug: e.slug, err: 'parse: ' + err.message }); continue; }
    let out: unknown;
    try { out = fn(syntheticInputs(e), pick, fill); } catch (err: any) { rows.push({ slug: e.slug, err: 'exec: ' + err.message }); continue; }
    if (!Array.isArray(out)) { rows.push({ slug: e.slug, err: 'not-array' }); continue; }
    const first = typeof out[0] === 'string' ? out[0] : '';
    const joined = out.filter((x: unknown) => typeof x === 'string').join(NL);
    rows.push({
      slug: e.slug,
      len: out.length,
      firstLen: first.length,
      joinedLen: joined.length,
      lost: joined.length - first.length,
      firstLines: first.split(NL).length,
      joinedLines: joined.split(NL).length,
      firstAnalysis: first.indexOf(ARROW) > -1 && first.indexOf(PIPE) > -1,
      joinedAnalysis: joined.indexOf(ARROW) > -1 && joined.indexOf(PIPE) > -1,
    });
  }
  const multi = rows.filter((r) => typeof r.len === 'number' && r.len > 1);
  const single = rows.filter((r) => typeof r.len === 'number' && r.len === 1);
  const errs = rows.filter((r) => r.err);
  console.log('custom 引擎 ' + rows.length + ' | 单元素 ' + single.length + ' | 多元素 ' + multi.length + ' | 异常 ' + errs.length);
  console.log('');
  console.log('—— 多元素引擎（页面只渲染 results[0] ⇒ 丢失字符）——');
  console.log('slug | 元素 | results[0]行 | 全部行 | 丢失字符 | 合并后命中analysis分支');
  multi.sort((a, b) => b.lost - a.lost).forEach((r) => console.log(r.slug + ' | ' + r.len + ' | ' + r.firstLines + ' | ' + r.joinedLines + ' | ' + r.lost + ' | ' + (r.joinedAnalysis ? 'YES' : 'no')));
  console.log('');
  console.log('—— 已修（单元素）引擎 ——');
  single.forEach((r) => console.log(r.slug + ' | 行 ' + r.joinedLines + ' | 字符 ' + r.joinedLen + ' | 合并后命中analysis分支 ' + (r.joinedAnalysis ? 'YES' : 'no')));
  if (errs.length) { console.log(''); errs.forEach((r) => console.log('ERR ' + r.slug + ' | ' + r.err)); }
  console.log('');
  console.log(multi.length === 0 && errs.length === 0 ? 'ALL OK' : 'MULTI: ' + multi.length);
  process.exitCode = 0;
}
main();
