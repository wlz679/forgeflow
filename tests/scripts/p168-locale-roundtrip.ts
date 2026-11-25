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
// ⭐⭐⭐ 为什么变体集里**必须有非等比变体**（2026-11-25 B3-16 实测）：
//   本脚本原先的 3 个变体是「默认 / 全局 ×2 / 全局 ×3+1」⇒ **全部保比**
//   （分子分母**同步**放大）⇒ **比例型 param**（如 stale_pct = stale / total）
//   的值**恒定不变** ⇒ 「模板把数值冻死」这条逃逸在全站 2,403 个 code 上
//   **结构性看不见**（2026-11-25 复审实测：把 article_freshness 的 tip 行
//   {stale_pct} 冻成字面量**并**删掉源码 param ⇒ 本脚本仍 exit 0 · 不一致 0）。
//   ⇒ **逐参数独立扰动**（只改一个输入、其余原样 ⇒ 分子分母**不同步**）
//   是唯一能把比例型 param 撬动的那一类变体 ⇒ 变体集**必须**含它。
//   ⇒ 变体集升级为「保比 + 非等比」后，本脚本在 B3-16 修完 D-1/D-2/D-3 之前
//     实测出 **3 条真实缺陷**（其中 D-1 是**用户可见的错误数字**）。
//
// ⭐⭐ 变体集**只有一处实现**（防漂移）：
//   变体集实现在 **tests/scripts/p168-variant-set.ts**（共享模块）
//   ⇒ 本脚本、诊断脚本 tests/scripts/p168-locale-roundtrip-nonratio.ts、
//     逐 token 校验 tests/scripts/p168-locale-token-parity.ts
//     **三个消费者都 import 它** ⇒ 三把尺子不会各自漂移。
//   ⚠️ 共享模块只负责「要试哪些输入」；**判定口径在各自消费方**（一字不改）。
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
import { variantsOf } from './p168-variant-set.ts';

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
    for (const v of variantsOf(base)) {
      try { texts.push((gen(v.inputs) || []).join(NL)); } catch { /* 输入无效 ⇒ 跳过 */ }
    }
    for (const ex of e.staticExamples ?? []) texts.push(ex);
    const cf = e.clientConfig && e.clientConfig.customFn;
    if (cf) {
      try {
        const fn = new Function('inputs', 'pick', 'fill', cf);
        for (const v of variantsOf(base)) {
          // ⚠️ **逐变体 try**（与诊断脚本 p168-locale-roundtrip-nonratio.ts 同款）
          //   ⇒ 某个变体在客户端侧抛异常，不会丢掉该引擎**后续全部变体**的文本
          //   ⇒ 两把尺子采到的文本集合保持一致（否则将来会采到不同集合）
          try {
            texts.push((fn(v.inputs ?? {}, (x: any) => x, (a: any, b: any) => b) || []).join(NL));
          } catch { /* 该变体在客户端侧不可用 ⇒ 跳过 */ }
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