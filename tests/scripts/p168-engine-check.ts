#!/usr/bin/env node
// P168 B3-7 —— **单引擎作用域**的验收闸门（给并行改造用的）。
//
// ⭐ 为什么需要它：全局守卫（tests/calc-output-i18n-guard.test.ts）把 10 个试点的
//   问题**汇总**成一条断言 ⇒ 3 个 agent 并行时互相看到对方的红 ⇒
//   agent 会去改**不属于自己**的引擎（实测已发生过）。
//   ⇒ 本工具把同一条不变量**按引擎拆开**输出：每个 agent 只看自己那一行。
//
// 用法：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-engine-check.ts brrrr
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-engine-check.ts acv --worklist
//
// 五条检查（与全局守卫同源，不新增不变量）：
//   ① 引擎声明的每个 code 在 locale(en/zh) 都有键        （= G2 方向一）
//   ② locale 里该 alias 的每个 row.* 键都被引擎声明      （= G2 方向二，本工具的增量）
//   ③ 服务端 generate() 输出 === 客户端 customFn 输出      （= G6）
//   ④ token 兜底渲染 === locale.en 模板渲染              （= G8）
//   ⑤ token 兜底渲染 === HEAD 的 staticExamples[0]        （= G9，英文页零变化）

import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import '../../src/engines/index.ts';
import { getAllEngines } from '../../src/core/engines/registry.ts';
import { renderCalcOutput } from '../../src/lib/calc-output-i18n.ts';
import { toolAlias } from '../../src/lib/calc-output-templates.ts';
import { stripComments } from '../build-dep-suites.mjs';
import { codegenDefaults, syntheticInputs, browserPick, browserFill } from './p168-server-client-parity.ts';
import { PILOT_FILES, ALLOWED_DIFFS, normalizeDates } from './p168-en-page-parity.ts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const NL = String.fromCharCode(10);

/** 引擎源码里声明的 token code（与守卫同一套口径：$字面量 / 构造器首参 / 裸映射表字面量） */
export function declaredCodes(rawSrc: string): string[] {
  // ⚠️ 与守卫同一口径：**先剥注释** ⇒ 注释里的 code 不算「已声明」
  const src = stripComments(rawSrc);
  const out = new Set<string>();
  for (const m of src.matchAll(/\$(calc_out\.[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)/g)) out.add(m[1]);
  for (const m of src.matchAll(/\b(?:tk|tok|makeToken)\(\s*['"](calc_out\.[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)['"]/g)) out.add(m[1]);
  for (const m of src.matchAll(/['"](calc_out\.[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)['"]/g)) out.add(m[1]);
  return [...out].sort();
}

function findEngineFile(slug: string): string | null {
  if (PILOT_FILES[slug]) return resolve(ROOT, PILOT_FILES[slug]);
  let found: string | null = null;
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = resolve(dir, name);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      if (!name.endsWith('.ts')) continue;
      if (readFileSync(full, 'utf8').includes("slug: '" + slug + "'")) { found = full; return; }
    }
  };
  walk(resolve(ROOT, 'src', 'engines'));
  return found;
}

function loadLocale(lang: 'en' | 'zh'): Record<string, string> {
  const j = JSON.parse(readFileSync(resolve(ROOT, 'src', 'i18n', 'locales', lang + '.json'), 'utf8').replace(/^\uFEFF/, ''));
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(j)) if (k.startsWith('calc_out.') && typeof v === 'string') out[k] = v;
  return out;
}

/** ⚠️ git show 必须用**仓库相对路径**（绝对路径会被 git 当成 pathspec 而报 'exists on disk, but not in HEAD'） */
function headStaticExample(file: string): string | null {
  let src: string;
  const rel = file.startsWith(ROOT) ? file.slice(ROOT.length + 1).split('\\').join('/') : file;
  try { src = execSync('git show HEAD:' + rel, { encoding: 'utf8', maxBuffer: 1 << 28 }); }
  catch { return null; }
  const m = src.match(/staticExamples:\s*\[\s*'((?:[^'\\]|\\.)*)'/);
  if (!m) return null;
  return m[1].replace(/\\n/g, NL).replace(/\\'/g, "'");
}

export interface EngineCheck {
  slug: string; alias: string;
  missing: string[]; dead: string[];
  parity: boolean; render: boolean; enpage: boolean;
  serverText: string; clientText: string; fallback: string; template: string;
  head: string | null; diffs: string[];
}

export function checkEngine(slug: string): EngineCheck | null {
  const engines = getAllEngines() as any[];
  const e = engines.find((x) => x.slug === slug);
  const file = findEngineFile(slug);
  if (!e || !file) return null;
  const alias = toolAlias(slug);
  const en = loadLocale('en');
  const zh = loadLocale('zh');
  const src = readFileSync(file, 'utf8');
  const declared = declaredCodes(src);
  const missing = declared.filter((c) => !(c in en) || !(c in zh));
  const rowKeys = Object.keys(en).filter((k) => k.startsWith('calc_out.' + alias + '.row.'));
  const dead = rowKeys.filter((k) => !declared.includes(k));
  const inputs = codegenDefaults()[slug] ?? syntheticInputs(e);
  const gen = e.generate ?? e.calculate;
  let serverText = '';
  try { const r = gen.call(e, inputs); serverText = Array.isArray(r) ? r.map(String).join(NL) : String(r); } catch { }
  let clientText = '';
  try {
    const cf = e.clientConfig && e.clientConfig.customFn;
    const fn = new Function('inputs', 'pick', 'fill', cf);
    const r = fn(inputs, browserPick, browserFill);
    clientText = Array.isArray(r) ? r.map(String).join(NL) : String(r);
  } catch { }
  const fallback = renderCalcOutput(serverText, {});
  const template = renderCalcOutput(serverText, en);
  const head = headStaticExample(file);
  const diffs: string[] = [];
  if (head !== null) {
    const A = normalizeDates(head).split(NL), B = normalizeDates(fallback).split(NL);
    for (let i = 0; i < Math.max(A.length, B.length); i++) if (A[i] !== B[i]) diffs.push('第 ' + (i + 1) + ' 行：HEAD ' + JSON.stringify(A[i]) + ' vs 现在 ' + JSON.stringify(B[i]));
  }
  const allow = ALLOWED_DIFFS[slug] ?? [];
  const enpage = head === null ? false : (diffs.length === 0 || diffs.every((d) => allow.some((a) => d.includes(a))));
  return { slug, alias, missing, dead, parity: serverText === clientText, render: fallback === template, enpage, serverText, clientText, fallback, template, head, diffs };
}

const args = process.argv.slice(2);
const aliases = args.filter((a) => !a.startsWith('--'));
const worklist = args.includes('--worklist');
const engines = getAllEngines() as any[];
const targets = aliases.length
  ? engines.filter((e) => aliases.some((a) => toolAlias(e.slug) === a || e.slug.includes(a)))
  : engines.filter((e) => PILOT_FILES[e.slug]);
let bad = 0;
for (const e of targets) {
  const c = checkEngine(e.slug);
  if (!c) { console.log('? 找不到引擎 ' + e.slug); continue; }
  const ok = c.missing.length === 0 && c.dead.length === 0 && c.parity && c.render && c.enpage;
  if (!ok) bad++;
  console.log((ok ? '✔ ' : '✗ ') + c.slug + '（alias ' + c.alias + '）');
  console.log('   ① locale 缺键（引擎声明了但 locale 没有）：' + (c.missing.length ? c.missing.join(', ') : '无'));
  console.log('   ② 死键（locale 有但引擎没声明）：' + (c.dead.length ? c.dead.length + ' 个 → ' + c.dead.join(', ') : '无'));
  console.log('   ③ 服务端 ≡ 客户端：' + (c.parity ? '一致' : '**漂移**'));
  console.log('   ④ 兜底 ≡ locale.en 模板：' + (c.render ? '一致' : '**不一致**'));
  console.log('   ⑤ 英文页零变化：' + (c.enpage ? '一致' : (c.diffs.length ? '**有 ' + c.diffs.length + ' 处差异**' : '无法比（HEAD 无 staticExamples）')));
  if (worklist) {
    console.log('   —— 本引擎的 locale row 键（这就是改造清单）：');
    for (const k of Object.keys(JSON.parse(readFileSync(resolve(ROOT, 'src', 'i18n', 'locales', 'en.json'), 'utf8').replace(/^\uFEFF/, '')))) {
      if (!k.startsWith('calc_out.' + c.alias + '.row.')) continue;
      const v = JSON.parse(readFileSync(resolve(ROOT, 'src', 'i18n', 'locales', 'en.json'), 'utf8').replace(/^\uFEFF/, ''))[k];
      console.log('     ' + k + '  ⇒  ' + v);
    }
  }
  if (!ok && c.diffs.length) for (const d of c.diffs.slice(0, 6)) console.log('      ' + d);
}
console.log('—— ' + targets.length + ' 个引擎 · 不通过 ' + bad + ' 个');
process.exitCode = bad === 0 ? 0 : 1;
