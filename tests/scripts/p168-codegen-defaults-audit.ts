#!/usr/bin/env node
// P168 B3-11 —— codegen defaultInputs 全量审计（100 引擎 · 真相源对照）
//
// 对照：scripts/codegen-examples.mjs 的 ENGINES 表 defaultInputs  ⇄  引擎 inputs[].name
//   —— 键名对不上 ⇒ staticExamples[0] 是「拿错输入算出来的」（B3-4 实测线上曾整页全是 0）。
//
// 两类错配：
//   missing  引擎声明了输入、defaultInputs 没给 ⇒ 引擎读到 undefined ⇒ 0 / NaN
//   unknown  defaultInputs 给了引擎没声明的键 ⇒ 值被丢弃（若引擎源码仍引用它 ⇒ 键名漂移）
//
// 跑法（从仓库根）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-codegen-defaults-audit.ts
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-codegen-defaults-audit.ts --json
//
// 退出码：0 = 全部对得上；1 = 存在错配。

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

import '../../src/engines/index.ts';
import { getAllEngines } from '../../src/core/engines/registry.ts';

const ROOT = resolve(import.meta.dirname, '..', '..');

export interface CodegenEntry {
  file: string;
  slug: string;
  subdir: string;
  defaultInputs: Record<string, string | number>;
}

export interface DefaultsRow {
  slug: string;
  codegenKeys: string[];
  engineKeys: string[];
  missing: string[];
  unknown: string[];
  unknownUsedInSource: string[];
  unknownUnused: string[];
  outputHasNaN: boolean;
  allNumbersZero: boolean;
  output: string;
}

export interface DefaultsAnalysis {
  rows: DefaultsRow[];
  mismatched: DefaultsRow[];
  uncovered: string[];
  stale: string[];
  engineTotal: number;
}

/**
 * 引擎源码里是否**真正读取**这个键。
 *
 * ⭐ 口径必须是「精确访问」而不是「词边界出现」——
 *   词边界会把 `models`（定价表里的对象键）误判成「引擎在读 models」⇒ 假阳性。
 *   故只认三种真实读取形态：inputs.key / inputs['key'] / const { key } = inputs。
 */
export function mentionsKey(source: string, key: string): boolean {
  const dotted = new RegExp('inputs\\s*\\.\\s*' + key + '\\b');
  if (dotted.test(source)) return true;
  const bracketed = new RegExp('inputs\\s*\\[\\s*[\'\"]' + key + '[\'\"]\\s*\\]');
  if (bracketed.test(source)) return true;
  const destructured = new RegExp('\\{[^}]*\\b' + key + '\\b[^}]*\\}\\s*=\\s*inputs');
  return destructured.test(source);
}

export function loadCodegenEntries(): CodegenEntry[] {
  const src = readFileSync(join(ROOT, 'scripts', 'codegen-examples.mjs'), 'utf8');
  const i = src.indexOf('const ENGINES = [');
  const j = src.indexOf('\n];', i);
  if (i < 0 || j < 0) throw new Error('codegen-examples.mjs: ENGINES table not found');
  const arr = new Function('return ' + src.slice(src.indexOf('[', i), j + 2))() as CodegenEntry[];
  return arr;
}

/** slug → 引擎文件路径（扫全目录，一次建表） */
export function buildEngineFileIndex(): Map<string, string> {
  const map = new Map<string, string>();
  const stack: string[] = [join(ROOT, 'src', 'engines')];
  while (stack.length > 0) {
    const cur = stack.pop() as string;
    for (const name of readdirSync(cur)) {
      const p = join(cur, name);
      if (statSync(p).isDirectory()) { stack.push(p); continue; }
      if (!name.endsWith('.ts')) continue;
      const text = readFileSync(p, 'utf8');
      for (const m of text.matchAll(/slug:\s*['"]([^'"]+)['"]/g)) {
        if (!map.has(m[1])) map.set(m[1], p);
      }
    }
  }
  return map;
}

function resolveEngineSource(entry: CodegenEntry, index: Map<string, string>): string | null {
  const direct = join(ROOT, 'src', 'engines', entry.subdir, entry.file);
  if (existsSync(direct)) return readFileSync(direct, 'utf8');
  const p = index.get(entry.slug);
  return p ? readFileSync(p, 'utf8') : null;
}

export function analyzeCodegenDefaults(): DefaultsAnalysis {
  const entries = loadCodegenEntries();
  const index = buildEngineFileIndex();
  const engines = getAllEngines() as any[];
  const bySlug = new Map<string, any>();
  for (const e of engines) bySlug.set(e.slug, e);

  const rows: DefaultsRow[] = [];
  const stale: string[] = [];
  for (const entry of entries) {
    const engine = bySlug.get(entry.slug);
    if (!engine) { stale.push(entry.slug); continue; }
    const engineKeys: string[] = (engine.inputs ?? []).map((i: any) => i.name);
    const codegenKeys = Object.keys(entry.defaultInputs ?? {});
    const source = resolveEngineSource(entry, index);
    const missing = engineKeys.filter((k) => !codegenKeys.includes(k));
    const unknown = codegenKeys.filter((k) => !engineKeys.includes(k));
    const unknownUsedInSource: string[] = [];
    const unknownUnused: string[] = [];
    for (const k of unknown) {
      if (source && mentionsKey(source, k)) unknownUsedInSource.push(k);
      else unknownUnused.push(k);
    }
    let output = '';
    try {
      const gen = engine.generate ?? engine.calculate;
      const res = gen.call(engine, entry.defaultInputs as unknown as Record<string, string>);
      output = Array.isArray(res) ? res.map(String).join('\n') : String(res);
    } catch (err) {
      output = 'ERROR: ' + String(err);
    }
    const outputHasNaN = /NaN|undefined/.test(output);
    const nums = [...output.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
    const allNumbersZero = nums.length > 0 && nums.every((v) => v === 0);
    rows.push({ slug: entry.slug, codegenKeys, engineKeys, missing, unknown, unknownUsedInSource, unknownUnused, outputHasNaN, allNumbersZero, output });
  }
  const covered = new Set(rows.map((r) => r.slug));
  const uncovered = engines.map((e: any) => e.slug).filter((s: string) => !covered.has(s));
  const mismatched = rows.filter((r) => r.missing.length > 0 || r.unknown.length > 0);
  return { rows, mismatched, uncovered, stale, engineTotal: engines.length };
}

function isCli(): boolean {
  const self = resolve(import.meta.dirname, 'p168-codegen-defaults-audit.ts');
  return resolve(process.argv[1] ?? '') === self;
}

if (isCli()) {
  const analysis = analyzeCodegenDefaults();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(analysis, null, 2));
  } else {
    console.log('codegen ENGINES 条目 ' + analysis.rows.length + ' · 引擎总数 ' + analysis.engineTotal + ' · 错配 ' + analysis.mismatched.length + ' · 未覆盖 ' + analysis.uncovered.length + ' · 失效条目 ' + analysis.stale.length);
    console.log('');
    for (const r of analysis.mismatched) {
      console.log('MISMATCH ' + r.slug);
      if (r.missing.length) console.log('  codegen 缺: ' + r.missing.join(', '));
      if (r.unknown.length) console.log('  codegen 多: ' + r.unknown.join(', ') + (r.unknownUsedInSource.length ? '（其中引擎源码仍在用: ' + r.unknownUsedInSource.join(', ') + '）' : ''));
      if (r.allNumbersZero) console.log('  ⚠ 输出全 0');
      if (r.outputHasNaN) console.log('  ⚠ 输出含 NaN/undefined');
    }
    if (analysis.uncovered.length) console.log('' + 'UNCOVERED ' + analysis.uncovered.join(', '));
    if (analysis.stale.length) console.log('' + 'STALE ' + analysis.stale.join(', '));
  }
  process.exitCode = analysis.mismatched.length > 0 || analysis.uncovered.length > 0 || analysis.stale.length > 0 ? 1 : 0;
}
