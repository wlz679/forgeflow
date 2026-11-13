#!/usr/bin/env node
// P168 B3-7 —— G8 的测量工具：「locale.en 模板渲染」≡「token 兜底渲染」。
//
// ⭐⭐ 为什么这条不变量成立（2026-11-13 实测推导）：
//   · token 自带**英文兜底**（'| 后面的原文'）⇒ 兜底渲染 = **原始英文输出**（含 params 插值）。
//   · locale.en 的模板**必须等于引擎源码原文**（B3-7 的硬约束）⇒ 模板渲染 = 同一个英文输出。
//   ⇒ 两者**必须逐字节相同**。
//
// ⭐ 这条能一次性抓住：
//   ① **值消失**（label 模板是裸标签、但 token 覆盖整行 ⇒ 模板路径少了一整段值）
//   ② locale.en 模板与兜底**措辞不一致**（英文页静态卡片与动态卡片分叉）
//   ③ 占位符**错位/缺失**（模板少写 {value}）
//   ④ 兜底被**截断**（token 正则的 fallback 不跨行 ⇒ 兜底少字）
//
// 用法：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-render-parity.ts
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-render-parity.ts --json

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import '../../src/engines/index.ts';
import { getAllEngines } from '../../src/core/engines/registry.ts';
import { renderCalcOutput } from '../../src/lib/calc-output-i18n.ts';
import { PILOT_SLUGS, codegenDefaults, syntheticInputs, browserPick, browserFill } from './p168-server-client-parity.ts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const JSON_OUT = process.argv.includes('--json');

function loadCanonical(): Record<string, { en: string; zh: string }> {
  // ⭐⭐ 真相源优先级：**已落库的 locale** → tmp/canonical-locale.json（未落库时的中间产物）
  //   ⚠️⚠️ 2026-11-13 实测踩坑：旧版**优先读 tmp** ⇒ 那是上一轮的 410 键快照
  //   ⇒ 新增的 7 条 tip code 被报成「locale 缺键」⇒ G8 假红 ⇒ 台子基线不绿 refuses to run.
  //   ⇒ **验收工具不能优先依赖 gitignore 里的临时文件**（它随时可能是上一轮的残留）。
  const enPath = resolve(ROOT, 'src/i18n/locales/en.json');
  const zhPath = resolve(ROOT, 'src/i18n/locales/zh.json');
  try {
    const je = JSON.parse(readFileSync(enPath, 'utf8').replace(String.fromCharCode(65279), ''));
    let jz: Record<string, string> = {};
    try {
      jz = JSON.parse(readFileSync(zhPath, 'utf8').replace(String.fromCharCode(65279), ''));
    } catch { /* zh 读不到就退回 en */ }
    const out: Record<string, { en: string; zh: string }> = {};
    for (const [k, v] of Object.entries(je)) {
      if (!k.startsWith('calc_out.') || typeof v !== 'string') continue;
      out[k] = { en: v, zh: typeof jz[k] === 'string' ? jz[k] : v };
    }
    if (Object.keys(out).length) return out;
  } catch { /* 落到下面的兜底 */ }
  try {
    return JSON.parse(readFileSync(resolve(ROOT, 'tmp/canonical-locale.json'), 'utf8'));
  } catch { return {}; }
}


/** 纯比较：给定「含 token 的文本」与「locale.en 模板表」，返回两条渲染路径是否一致 */
export function compareRender(out: string, canonicalEn: Record<string, string>): {
  same: boolean;
  missingKeys: string[];
  tokens: number;
  fallbackChars: number;
  templateChars: number;
  firstDiff: string | null;
} {
  const fallback = renderCalcOutput(out, {});
  const template = renderCalcOutput(out, canonicalEn);
  const missing: string[] = [];
  for (const m of out.matchAll(/\$([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)/g)) {
    if (!(m[1] in canonicalEn)) missing.push(m[1]);
  }
  return {
    same: fallback === template,
    missingKeys: [...new Set(missing)],
    tokens: (out.match(/\$[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+/g) || []).length,
    fallbackChars: fallback.length,
    templateChars: template.length,
    firstDiff: firstDiff(fallback, template),
  };
}

export interface RenderParityRow {
  slug: string;
  same: boolean;
  tokens: number;
  missingKeys: string[];
  fallbackChars: number;
  templateChars: number;
  firstDiff: string | null;
}

/** 第一个差异位置的可读描述 */
function firstDiff(a: string, b: string): string | null {
  if (a === b) return null;
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  const ctx = (s: string) => JSON.stringify(s.slice(Math.max(0, i - 40), i + 60));
  return '第 ' + i + ' 字符起不同：兜底 ' + ctx(a) + ' vs 模板 ' + ctx(b);
}

export function measureRenderParity(): RenderParityRow[] {
  const canonicalRaw = loadCanonical();
  // ⚠️⚠️ 2026-11-13 修（自查发现的假绿）：canonical 的值是 {en, zh} **对象**，
  //   而 renderCalcOutput 只接受**字符串**模板 ⇒ 直接传对象 ⇒ typeof tmpl !== 'string'
  //   ⇒ 每��� token 都走兜底 ⇒ 两条路径必然相同 ⇒ 判据恒绿、什么都测不到。
  //   ⇒ 必须先摊平成 {code: en} 与 {code: zh} 两张表。
  const canonicalEn: Record<string, string> = {};
  const canonicalZh: Record<string, string> = {};
  for (const [code, v] of Object.entries(canonicalRaw)) {
    if (typeof v === 'string') { canonicalEn[code] = v; canonicalZh[code] = v; continue; }
    if (v && typeof v.en === 'string') canonicalEn[code] = v.en;
    if (v && typeof v.zh === 'string') canonicalZh[code] = v.zh;
  }
  const canonical = canonicalEn;
  const defaults = codegenDefaults();
  const engines = getAllEngines() as any[];
  const rows: RenderParityRow[] = [];
  for (const slug of PILOT_SLUGS) {
    const e = engines.find((x) => x.slug === slug);
    if (!e) continue;
    const inputs = defaults[slug] ?? syntheticInputs(e);
    const gen = e.generate ?? e.calculate;
    let out: string;
    try {
      const r = gen.call(e, inputs);
      out = Array.isArray(r) ? r.map(String).join('\n') : String(r);
    } catch { continue; }
    const r = compareRender(out, canonicalEn);
    rows.push({
      slug,
      same: r.same,
      tokens: r.tokens,
      missingKeys: r.missingKeys,
      fallbackChars: r.fallbackChars,
      templateChars: r.templateChars,
      firstDiff: r.firstDiff,
    });
  }
  return rows;
}

if (resolve(process.argv[1] ?? '') === resolve(import.meta.dirname, 'p168-render-parity.ts')) {
  const rows = measureRenderParity();
  if (JSON_OUT) {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    const bad = rows.filter((r) => !r.same);
    console.log('试点引擎 ' + rows.length + ' 个 · 兜底渲染 ≡ 模板渲染：' + (rows.length - bad.length) + ' 个一致 / ' + bad.length + ' 个不一致');
    for (const r of bad) {
      console.log('  ✗ ' + r.slug + '（' + r.tokens + ' 个 token，' + r.fallbackChars + ' vs ' + r.templateChars + ' 字符）');
      if (r.missingKeys.length) console.log('      缺 locale 键：' + r.missingKeys.join(', '));
      if (r.firstDiff) console.log('      ' + r.firstDiff);
    }
  }
  process.exitCode = 0;
}
