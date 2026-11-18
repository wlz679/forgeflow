#!/usr/bin/env node
// P168 B3-9 —— **locale 模板等价体检**（可复算工具）。
//
// ⭐⭐ 判据（与 G8 同义，但**逐 code** + **多组输入**）：
//   locale 模板 T 与「token 自带的英文兜底」必须**渲染出完全一样的文本**：
//       renderCalcOutput(text, {})            ← 兜底路径
//     === renderCalcOutput(text, { code: T })  ← 模板路径
//   ⇒ 这是「英文页静态卡片与动态卡片必须一致」的可判定形式。
//
// ⭐ 为什么必须**多组输入**（不是只跑默认输入）：
//   「数值被冻结」这个缺陷在**默认输入**下常常看不出来（冻结值恰好等于默认值）
//   ⇒ 只跑默认输入 ⇒ 缺陷被漏过（实测：6 个引擎在默认输入下全绿，换输入才暴露）。
//
// ⭐ 为什么必须**逐 code**（而不是只看整页）：
//   整页比较只报「第一个差异位置」⇒ 掩盖了其余同样出错的 code。
//
// 用法：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-locale-roundtrip.ts            # 体检报告
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-locale-roundtrip.ts --json     # 机器可读

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import '../../src/engines/index.ts';
import { getAllEngines } from '../../src/core/engines/registry.ts';
import { renderCalcOutput, CALC_OUTPUT_TOKEN_RE } from '../../src/lib/calc-output-i18n.ts';
import { TOKENIZED } from './p168-tokenized-engines.mjs';
import { codegenDefaults, syntheticInputs } from './p168-server-client-parity.ts';
import { sourceTemplatesWithOrigin } from './p168-locale-source.ts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const NL = String.fromCharCode(10);
const JSON_OUT = process.argv.includes('--json');

export interface CodeRow {
  code: string;
  aliases: string[];
  /** locale 里的现值（en） */
  landed: string | null;
  /** 现值与兜底渲染是否一致 */
  landedOk: boolean;
  /** 推导候选（与兜底渲染一致的才有资格） */
  candidates: { origin: string; tpl: string }[];
  instances: number;
  sampleFallback: string;
}

function variantsOf(base: Record<string, string>): Record<string, string>[] {
  const v2: Record<string, string> = {};
  const v3: Record<string, string> = {};
  for (const [k, val] of Object.entries(base)) {
    const n = Number(val);
    if (Number.isFinite(n) && n > 0) { v2[k] = String(n * 2); v3[k] = String(n * 3 + 1); }
    else { v2[k] = val; v3[k] = val; }
  }
  return [base, v2, v3];
}

/** 该文本里出现的全部 token code */
function codesOf(text: string): string[] {
  const out: string[] = [];
  const re = new RegExp(CALC_OUTPUT_TOKEN_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[1]);
  return [...new Set(out)];
}

export function measure(): CodeRow[] {
  const engines = getAllEngines() as any[];
  const defaults = codegenDefaults();
  const en = JSON.parse(readFileSync(resolve(ROOT, 'src/i18n/locales/en.json'), 'utf8'));
  // code -> { texts: {alias, text}[], aliases }
  const agg = new Map<string, { items: { alias: string; text: string }[]; aliases: Set<string> }>();
  for (const meta of TOKENIZED) {
    const e = engines.find((x) => x.slug === meta.slug);
    if (!e) continue;
    const base = defaults[meta.slug] ?? syntheticInputs(e);
    const gen = e.generate ?? e.calculate;
    const texts: string[] = [];
    for (const inp of variantsOf(base)) {
      try { texts.push((gen(inp) || []).join(NL)); } catch { /* 输入无效 ⇒ 跳过 */ }
    }
    for (const ex of e.staticExamples ?? []) texts.push(ex);
    const cf = e.clientConfig && e.clientConfig.customFn;
    if (cf) {
      try {
        const fn = new Function('inputs', 'pick', 'fill', cf);
        for (const inp of variantsOf(base)) {
          texts.push((fn(inp ?? {}, (x: any) => x, (a: any, b: any) => b) || []).join(NL));
        }
      } catch { /* 忽略 */ }
    }
    for (const t of texts) {
      for (const code of codesOf(t)) {
        if (!agg.has(code)) agg.set(code, { items: [], aliases: new Set() });
        agg.get(code)!.items.push({ alias: meta.alias, text: t });
        agg.get(code)!.aliases.add(meta.alias);
      }
    }
  }
  const rows: CodeRow[] = [];
  for (const [code, g] of agg) {
    const landed = typeof en[code] === 'string' ? (en[code] as string) : null;
    const consistent = (tpl: string): boolean =>
      g.items.every((it) => renderCalcOutput(it.text, {}) === renderCalcOutput(it.text, { [code]: tpl }));
    const landedOk = landed !== null && consistent(landed);
    const cands: { origin: string; tpl: string }[] = [];
    for (const meta of TOKENIZED) {
      if (!g.aliases.has(meta.alias)) continue;
      const { ctor, lit } = sourceTemplatesWithOrigin(meta.file);
      if (ctor[code] !== undefined) cands.push({ origin: 'constructor', tpl: ctor[code] });
      if (lit[code] !== undefined) cands.push({ origin: 'literal', tpl: lit[code] });
    }
    const winners = cands.filter((c) => consistent(c.tpl));
    rows.push({
      code,
      aliases: [...g.aliases],
      landed,
      landedOk,
      candidates: winners,
      instances: g.items.length,
      sampleFallback: '',
    });
  }
  return rows.sort((a, b) => a.code.localeCompare(b.code));
}

if (JSON_OUT) {
  console.log(JSON.stringify({ rows: measure() }, null, 2));
} else {
  const rows = measure();
  const bad = rows.filter((r) => r.landed !== null && !r.landedOk);
  console.log('模板 code ' + rows.length + ' 个 · locale 现值与兜底渲染不一致 ' + bad.length + ' 个');
  for (const r of bad) {
    console.log('### ' + r.code + ' | ' + r.aliases.join(',') + ' | 实例 ' + r.instances);
    console.log('  现值: ' + JSON.stringify(r.landed));
    for (const c of r.candidates) console.log('  可用候选(' + c.origin + '): ' + JSON.stringify(c.tpl));
    if (!r.candidates.length) console.log('  ⚠️ 无用候选 ⇒ 需改引擎源码');
  }
}