#!/usr/bin/env node
// P168 B3-8 —— **诊断工具**（不是守卫）：打印「服务端输出 vs 客户端 customFn 输出」的逐行差异。
//
// 用法：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-client-diff.ts <slug> [<slug> ...]
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-client-diff.ts --all
//
// ⭐ 为什么需要它：G6 只报「行数/字符数」两个汇总数字 ⇒ 不知道**差在哪一行**。
//   本工具逐行对齐 ⇒ 直接给出「第 N 行：服务端 X / 客户端 Y」。
//
// ⚠️ 用与 p168-server-client-parity.ts **完全相同**的输入（codegen defaultInputs，缺则 synthetic）
//   ⇒ 数字与 G6 可直接对照。

import '../../src/engines/index.ts';
import { getAllEngines } from '../../src/core/engines/registry.ts';
import { codegenDefaults, syntheticInputs } from './p168-server-client-parity.ts';
import { resolve } from 'node:path';

const NL = String.fromCharCode(10);

function pick(arr: unknown[]): unknown { return arr[Math.floor(Math.random() * arr.length)]; }
function fill(t: string, v: Record<string, string>): string {
  return t.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '{' + k + '}');
}

function join(out: unknown): string {
  return Array.isArray(out) ? out.map(String).join(NL) : String(out);
}

export function diffEngine(slug: string): string {
  const engines = getAllEngines() as any[];
  const engine = engines.find((e) => e.slug === slug);
  if (!engine) return '✗ 找不到引擎 ' + slug;
  const cf = engine.clientConfig && engine.clientConfig.customFn;
  if (typeof cf !== 'string' || cf.length === 0) return '· ' + slug + ' ⇒ 无 customFn';
  const defaults = codegenDefaults();
  const inputs = defaults[slug] ?? syntheticInputs(engine);
  let server = '';
  let client = '';
  let serverError: string | null = null;
  let clientError: string | null = null;
  try {
    const gen = engine.generate ?? engine.calculate;
    server = join(gen.call(engine, inputs));
  } catch (err: any) {
    serverError = String(err && err.message);
  }
  try {
    const fn = new Function('inputs', 'pick', 'fill', cf);
    client = join(fn(inputs, pick, fill));
  } catch (err: any) {
    clientError = String(err && err.message);
  }
  const head = '── ' + slug + ' ── 服务端 ' + server.split(NL).length + ' 行 / 客户端 ' + client.split(NL).length + ' 行'
    + (serverError ? ' | 服务端抛错: ' + serverError : '')
    + (clientError ? ' | 客户端抛错: ' + clientError : '');
  if (serverError || clientError) return head;
  if (server === client) return head + NL + '  ✔ 两端逐字相同';
  const s = server.split(NL);
  const c = client.split(NL);
  const lines: string[] = [head];
  const max = Math.max(s.length, c.length);
  let n = 0;
  for (let i = 0; i < max; i++) {
    if (s[i] === c[i]) continue;
    n++;
    lines.push('  #' + (i + 1));
    lines.push('    S: ' + (s[i] === undefined ? '(无此行)' : s[i]));
    lines.push('    C: ' + (c[i] === undefined ? '(无此行)' : c[i]));
  }
  lines.push('  —— 差异行数 ' + n);
  return lines.join(NL);
}

// ── CLI ────────────────────────────────────────────────────────────────
function isCli(): boolean {
  const self = resolve(import.meta.dirname, 'p168-client-diff.ts');
  return resolve(process.argv[1] ?? '') === self;
}

if (isCli()) {
  const args = process.argv.slice(2).filter((a) => a !== '--all');
  const slugs = args.length > 0
    ? args
    : (getAllEngines() as any[]).map((e) => e.slug);
  for (const slug of slugs) console.log(diffEngine(slug));
}
