#!/usr/bin/env node
// P168 B3-9 —— **token 逐条校验**（可复算工具）—— locale 模板正确性的**权威判据**。
//
// ⭐ 判据（对每个 token 出现逐条判定）：
//   ① **占位符守恒**：locale 模板的 {param} 集合 == token 自带 params 的键集合
//      ⇒ 缺一个 ⇒ 该参数的值在模板里被**冻结**（页面显示的是默认输入的数）
//   ② **渲染等价**：用 token 自带 params 渲染 locale 模板 == token 的英文兜底文本
//      ⇒ 不等 ⇒ 模板写错了（英文页会显示错文案）
//
// ⭐⭐ 为什么必须有 ①（占位符守恒）—— 往返体检的盲区：
//   往返体检（p168-locale-roundtrip.ts）靠「换输入重新走到该分支」来暴露冻结值
//   ⇒ 分支**没被换输入走到**的 code ⇒ 冻结值看不出来（本批实测：claude health_spread_ok
//   的模板冻结成 10.0x，但该分支只有默认输入会走到 ⇒ 往返体检漏过）
//   ⇒ 占位符守恒**不需要重新走到分支**：params 就在 token 里 ⇒ 一眼看出漏掉的参数。
//
// ⭐ 样本来源（params + fallback 都在里面）：
//   · staticExamples（静态样本里就是 $code{params}|fallback| 的完整形态）
//   · generate() 默认输入 + 两组变体输入
//   · 客户端 customFn 默认输入 + 两组变体输入
//
// 用法（从仓库根跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-locale-token-parity.ts
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-locale-token-parity.ts --json

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import '../../src/engines/index.ts';
import { getAllEngines } from '../../src/core/engines/registry.ts';
import { renderCalcOutput, CALC_OUTPUT_TOKEN_RE } from '../../src/lib/calc-output-i18n.ts';
import { TOKENIZED } from './p168-tokenized-engines.mjs';
import { codegenDefaults, syntheticInputs } from './p168-server-client-parity.ts';
import { variantsOf } from './p168-variant-set.ts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const NL = String.fromCharCode(10);
const JSON_OUT = process.argv.includes('--json');

export interface Violation {
  code: string;
  alias: string;
  kind: 'placeholder-missing' | 'placeholder-extra' | 'render-mismatch';
  detail: string;
  params: Record<string, string>;
  fallback: string;
  template: string;
}

function placeholders(s: string): string[] {
  const out: string[] = [];
  for (const m of s.matchAll(/\{(\w+)\}/g)) out.push(m[1]);
  return [...new Set(out)].sort();
}

// ⭐⭐ 2026-11-25 B3-16 T2：变体集原先在本文件里**又写了一份**（保比）⇒ 仓库里
//   同一套「要试哪些输入」有 **3 份**实现 ⇒ 必然各自漂移。
//   ⇒ 现统一 import **共享模块** tests/scripts/p168-variant-set.ts
//     （保比 + **非等比** ⇒ 采样到的 token 更多 ⇒ 覆盖更全；判据本身一字未改）。
function tokensOf(text: string): { code: string; params: Record<string, string>; fallback: string; token: string }[] {
  const re = new RegExp(CALC_OUTPUT_TOKEN_RE.source, 'g');
  const out: { code: string; params: Record<string, string>; fallback: string; token: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    let params: Record<string, string> = {};
    if (m[2]) { try { params = JSON.parse(m[2]); } catch { params = {}; } }
    out.push({ code: m[1], params, fallback: m[3] || '', token: m[0] });
  }
  return out;
}

export function check(): { violations: Violation[]; codes: number; occurrences: number } {
  const engines = getAllEngines() as any[];
  const defaults = codegenDefaults();
  const en = JSON.parse(readFileSync(resolve(ROOT, 'src', 'i18n', 'locales', 'en.json'), 'utf8'));
  const violations: Violation[] = [];
  const seen = new Set<string>();
  let codes = 0;
  let occurrences = 0;
  for (const meta of TOKENIZED) {
    const e = engines.find((x) => x.slug === meta.slug);
    if (!e) continue;
    const base = defaults[meta.slug] ?? syntheticInputs(e);
    const gen = e.generate ?? e.calculate;
    const texts: string[] = [];
    for (const v of variantsOf(base)) {
      try { texts.push((gen(v.inputs) || []).join(NL)); } catch { /* 输入无效 */ }
    }
    for (const ex of e.staticExamples ?? []) texts.push(ex);
    const cf = e.clientConfig && e.clientConfig.customFn;
    if (cf) {
      try {
        const fn = new Function('inputs', 'pick', 'fill', cf);
        for (const v of variantsOf(base)) texts.push((fn(v.inputs ?? {}, (x: any) => x, (a: any, b: any) => b) || []).join(NL));
      } catch { /* 忽略 */ }
    }
    for (const t of texts) {
      for (const tk of tokensOf(t)) {
        occurrences++;
        seen.add(tk.code);
        const tpl = en[tk.code];
        if (typeof tpl !== 'string') continue;
        const tph = placeholders(tpl);
        const pkeys = Object.keys(tk.params).sort();
        // ⭐ 只有「取值出现在兜底文本里」的参数才**必须**有占位符
        //   ⇒ 有些 token 带**装饰性参数**（值不在文本里，例 unit_hrs_per_epoch 的 hrs=24
        //      文本只是 ' hrs/epoch'）⇒ 那类参数不需要占位符，否则误报
        const inFallback = pkeys.filter((k) => !!tk.params[k] && tk.fallback.includes(tk.params[k]));
        const missing = inFallback.filter((k) => !tph.includes(k));
        const extra = tph.filter((k) => !pkeys.includes(k));
        if (missing.length) {
          violations.push({ code: tk.code, alias: meta.alias, kind: 'placeholder-missing', detail: '模板缺参数占位符: ' + missing.join(',') + ' | params=' + JSON.stringify(tk.params) + ' | tpl=' + JSON.stringify(tpl), params: tk.params, fallback: tk.fallback, template: tpl });
          continue;
        }
        if (extra.length) {
          violations.push({ code: tk.code, alias: meta.alias, kind: 'placeholder-extra', detail: '模板多了不存在的占位符: ' + extra.join(',') + ' | params=' + JSON.stringify(tk.params) + ' | tpl=' + JSON.stringify(tpl), params: tk.params, fallback: tk.fallback, template: tpl });
          continue;
        }
        const rendered = renderCalcOutput(tk.token, { [tk.code]: tpl });
        const plain = renderCalcOutput(tk.token, {});
        if (rendered !== plain) {
          violations.push({ code: tk.code, alias: meta.alias, kind: 'render-mismatch', detail: '模板渲染 != 兜底文本 | params=' + JSON.stringify(tk.params) + NL + '    模板渲染: ' + JSON.stringify(rendered) + NL + '    兜底文本: ' + JSON.stringify(plain), params: tk.params, fallback: tk.fallback, template: tpl });
        }
      }
    }
  }
  codes = seen.size;
  const byCode = new Map<string, Violation>();
  for (const v of violations) if (!byCode.has(v.code + '|' + v.kind)) byCode.set(v.code + '|' + v.kind, v);
  return { violations: [...byCode.values()], codes, occurrences };
}

if (JSON_OUT) {
  console.log(JSON.stringify(check(), null, 2));
} else {
  const r = check();
  console.log('token 出现 ' + r.occurrences + ' 次 · 覆盖 code ' + r.codes + ' 个 · 违规 ' + r.violations.length + ' 条');
  for (const v of r.violations) {
    console.log('### ' + v.code + ' [' + v.alias + '] ' + v.kind);
    console.log('  ' + v.detail);
  }
}
