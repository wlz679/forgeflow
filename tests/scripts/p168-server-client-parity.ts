#!/usr/bin/env node
// P168 B3-7 —— 「服务端输出 ≡ 客户端 customFn 输出」的**可复算**测量工具。
//
// 用法：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-server-client-parity.ts            # 全仓 100 个
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-server-client-parity.ts --pilot    # 只看 10 个试点
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-server-client-parity.ts --json     # 机器可读
//
// ⭐ 为什么需要它（2026-11-12 实测）：
//   页面上的**静态卡片**来自 engine.staticExamples[0]（codegen 从服务端 generate() 生成），
//   **动态卡片**（用户点「计算」）来自客户端 customFn。
//   ⇒ 两边不一致 ⇒ 同一页两处内容不同 ⇒ 用户看到的东西前后矛盾。
//   ⇒ 实测全仓 **55/100** 个引擎存在漂移（静态卡片有、动态卡片没有的段落最多差 20 行）。
//   ⇒ G3 只比对「两边声明的 token code 集合」，抓不到这个 ⇒ 需要本工具 + G6 守卫。

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import '../../src/engines/index.ts';
import { getAllEngines } from '../../src/core/engines/registry.ts';

/** B3-7 的 10 个试点引擎 */
export const PILOT_SLUGS = [
  'solopreneur-mrr-calculator',
  'solopreneur-rent-vs-buy-calculator',
  'solopreneur-brrrr-calculator',
  'solopreneur-project-profitability-calculator',
  'solopreneur-coupon-attribution-calculator',
  'solopreneur-saas-valuation-calculator',
  'solopreneur-acv-calculator',
  'solopreneur-funnel-step-calculator',
  'solopreneur-activation-rate-calculator',
  'solopreneur-stickiness-calculator',
];

function pick(arr: unknown[]): unknown { return arr[Math.floor(Math.random() * arr.length)]; }
function fill(t: string, v: Record<string, string>): string {
  return t.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '{' + k + '}');
}

/** 浏览器里那两个 helper 的原样实现（astro:1505-1506） */
export function browserPick(arr: unknown[]): unknown { return pick(arr); }
export function browserFill(t: string, v: Record<string, string>): string { return fill(t, v); }

/**
 * 从 scripts/codegen-examples.mjs 的 ENGINES 表里取每引擎的 defaultInputs
 *（codegen 用它们生成 staticExamples[0] ⇒ 用同一组输入才能比出「静态卡片 vs 动态卡片」）。
 * ⭐ 解析失败不致命 ⇒ 回落 syntheticInputs（措辞漂移与输入无关，仍能测出来）。
 */
export function codegenDefaults(): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  try {
    const src = readFileSync(resolve(import.meta.dirname, '..', '..', 'scripts', 'codegen-examples.mjs'), 'utf8');
    const i = src.indexOf('const ENGINES = [');
    if (i < 0) return out;
    const j = src.indexOf('\n];', i);
    if (j < 0) return out;
    const arr = new Function('return ' + src.slice(src.indexOf('[', i), j + 2))();
    for (const e of arr) out[e.slug] = e.defaultInputs;
  } catch {
    /* 回落 synthetic */
  }
  return out;
}

/** 没有 defaultInputs 的引擎：按声明的 type 造一份贴近真实的输入 */
export function syntheticInputs(engine: any): Record<string, unknown> {
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

export interface ParityRow {
  slug: string;
  source: 'codegen-defaults' | 'synthetic';
  same: boolean;
  serverError: string | null;
  clientError: string | null;
  serverLines: number;
  clientLines: number;
  serverChars: number;
  clientChars: number;
}

function join(out: unknown): string {
  return Array.isArray(out) ? out.map(String).join('\n') : String(out);
}

/** 跑一遍比对 */
export function measureParity(engines: any[], defaults: Record<string, Record<string, string>>): ParityRow[] {
  const rows: ParityRow[] = [];
  for (const e of engines) {
    const cf = e.clientConfig && e.clientConfig.customFn;
    if (typeof cf !== 'string' || cf.length === 0) continue;
    const d = defaults[e.slug];
    const inputs = d ?? syntheticInputs(e);
    let server: string | null = null;
    let serverError: string | null = null;
    try {
      const gen = e.generate ?? e.calculate;
      server = join(gen.call(e, inputs));
    } catch (err: any) {
      serverError = String(err && err.message);
    }
    let client: string | null = null;
    let clientError: string | null = null;
    try {
      const fn = new Function('inputs', 'pick', 'fill', cf);
      client = join(fn(inputs, pick, fill));
    } catch (err: any) {
      clientError = String(err && err.message);
    }
    rows.push({
      slug: e.slug,
      source: d ? 'codegen-defaults' : 'synthetic',
      same: server !== null && client !== null && server === client,
      serverError, clientError,
      serverLines: server === null ? 0 : server.split('\n').length,
      clientLines: client === null ? 0 : client.split('\n').length,
      serverChars: server === null ? 0 : server.length,
      clientChars: client === null ? 0 : client.length,
    });
  }
  return rows;
}

export function loadParityRows(slugs?: string[]): ParityRow[] {
  const engines = getAllEngines() as any[];
  const use = slugs && slugs.length > 0 ? engines.filter((e) => slugs.includes(e.slug)) : engines;
  return measureParity(use, codegenDefaults());
}

// ── CLI ────────────────────────────────────────────────────────────────
function isCli(): boolean {
  const self = resolve(import.meta.dirname, 'p168-server-client-parity.ts');
  return resolve(process.argv[1] ?? '') === self;
}

if (isCli()) {
  const pilot = process.argv.includes('--pilot');
  const json = process.argv.includes('--json');
  const rows = loadParityRows(pilot ? PILOT_SLUGS : undefined);
  const drift = rows.filter((r) => !r.same);
  if (json) {
    console.log(JSON.stringify({ total: rows.length, same: rows.length - drift.length, drift: drift.length, rows }, null, 2));
  } else {
    console.log('总引擎 ' + rows.length + ' · 一致 ' + (rows.length - drift.length) + ' · 漂移 ' + drift.length);
    for (const r of drift) {
      console.log('  ✗ ' + r.slug + ' | ' + r.source + ' | 服务端 ' + r.serverLines + '行/' + r.serverChars + '字符 vs 客户端 ' + r.clientLines + '行/' + r.clientChars + '字符'
        + (r.serverError ? ' | 服务端抛错: ' + r.serverError : '')
        + (r.clientError ? ' | 客户端抛错: ' + r.clientError : ''));
    }
  }
  process.exitCode = 0;
}
