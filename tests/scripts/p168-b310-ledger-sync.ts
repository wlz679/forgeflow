#!/usr/bin/env node
// P168 B3-10 —— **台账销账同步工具**（把「修好一条 ⇒ 销一条」变成机械动作）。
//
// 为什么需要它
// ------------------
// 两张台账都要求「**只能变小不能变大**」⇒ 每修好一个引擎就要手动删一条 ⇒
//   手工删条目容易漏（漏了 ⇒ 守卫红）或删错（删错 ⇒ 覆盖漏洞）。
// ⇒ 本工具**按实测**重新生成两张台账的内容，并打印成可直接粘贴的源码块。
//
// 用法（必须从仓库根跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-b310-ledger-sync.ts            # 打印两个台账的新内容
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-b310-ledger-sync.ts --g15     # 只打印 G15 的 DEBT 块
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-b310-ledger-sync.ts --g6      # 只打印 G6 的 DRIFT_DEBT 块

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { getAllEngines } from '../../src/core/engines/registry.ts';
import { codegenDefaults } from './p168-server-client-parity.ts';
import { loadDriftRows } from './p168-server-client-drift-ledger.ts';

const NLc = String.fromCharCode(10);
const ROOT = resolve(process.cwd());

function pick(a: unknown[]): unknown { return a[Math.floor(Math.random() * a.length)]; }
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

/** 多元素探针（与 G15 守卫**同一套口径**：codegen 默认 + synthetic 两套输入） */
export function probeMulti(): Map<string, number> {
  const engines = getAllEngines() as any[];
  const defaults = codegenDefaults();
  const out = new Map<string, number>();
  for (const e of engines) {
    const body = e.clientConfig && e.clientConfig.customFn;
    if (typeof body !== 'string' || !body.length) continue;
    let fn: any;
    try { fn = new Function('inputs', 'pick', 'fill', body); } catch { continue; }
    const sets: Record<string, unknown>[] = [];
    const d = defaults[e.slug];
    if (d) sets.push(d);
    sets.push(syntheticInputs(e));
    let best = 0;
    for (const inputs of sets) {
      let o: unknown;
      try { o = fn(inputs, pick, fill); } catch { continue; }
      if (Array.isArray(o) && o.length > 1) best = Math.max(best, o.length);
    }
    if (best > 1) out.set(e.slug, best);
  }
  return out;
}

/** 从 G15 守卫文件里抽出当前的 DEBT 列表（保持顺序） */
function currentG15Debt(): string[] {
  const src = readFileSync(resolve(ROOT, 'tests', 'customfn-single-element-guard.test.ts'), 'utf-8');
  const i = src.indexOf('const DEBT = new Set<string>([');
  if (i < 0) return [];
  const j = src.indexOf(']);', i);
  const body = src.slice(i, j);
  return [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

function isCli(): boolean {
  const self = resolve(import.meta.dirname, 'p168-b310-ledger-sync.ts');
  return resolve(process.argv[1] ?? '') === self;
}

if (isCli()) {
  const wantG15 = !process.argv.includes('--g6');
  const wantG6 = !process.argv.includes('--g15');

  if (wantG15) {
    const multi = probeMulti();
    const slugs = [...multi.keys()].sort();
    const prev = currentG15Debt();
    const removed = prev.filter((s) => !multi.has(s));
    const added = slugs.filter((s) => !prev.includes(s));
    console.log('// G15 DEBT（' + slugs.length + ' 条）—— 实测多元素（codegen 默认 + synthetic 两套口径）');
    if (removed.length) console.log('// 已销账（不再多元素）：' + removed.join(', '));
    if (added.length) console.log('// ⚠️ 新增多元素（修法之外的漂移，需说明）：' + added.join(', '));
    console.log('const DEBT = new Set<string>(');
    for (const s of slugs) console.log("  '" + s + "',");
    console.log(']);');
  }

  if (wantG6) {
    const rows = loadDriftRows();
    const src = readFileSync(resolve(ROOT, 'tests', 'scripts', 'p168-server-client-drift-ledger.ts'), 'utf-8');
    const notes = new Map<string, string>();
    const kinds = new Map<string, string>();
    const re = /'([^']+)': \{ kind: '([^']+)', note: \"([^\"]*)\" \}/g;
    for (const m of src.matchAll(re)) { notes.set(m[1], m[3]); kinds.set(m[1], m[2]); }
    const slugs = rows.map((r) => r.slug).sort();
    console.log('');
    console.log('// G6 DRIFT_DEBT（' + slugs.length + ' 条）—— 实测漂移（codegen 默认输入）');
    console.log('export const DRIFT_DEBT: Record<string, { kind: DriftKind; note: string }> = {');
    for (const r of rows) {
      const kind = kinds.get(r.slug) ?? r.kind;
      const note = notes.get(r.slug) ?? 'TODO：补人写理由（首行差异 #' + r.firstDiffLine + '：服务端「' + r.serverLine.slice(0, 60) + '」客户端「' + r.clientLine.slice(0, 60) + '」）';
      const safeNote = note.replace(/'/g, "");
      console.log("  '" + r.slug + "': { kind: '" + kind + "', note: '" + safeNote + "' },");
    }
    console.log('};');
  }
}