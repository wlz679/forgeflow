#!/usr/bin/env node
// P168 B3-8 —— **分支探针**：用 fuzz 输入跑 generate() + 客户端 customFn，
//   捕获**默认输入走不到的分支**上的 token，反推它们的英文模板。
//
// ⭐ 为什么需要它（2026-11-16 实测）
//   提取器的「源码推导」对三类 fallback 无能为力：
//     ① fallback = **运行时变量**（例：makeToken(code, bandFallback, bandParams)）
//        ⇒ 静态求值 ReferenceError ⇒ 推不出模板；
//     ② fallback 表达式里含**未定义函数**（例：money(...) / pct(...)）
//        ⇒ new Function 求值 ReferenceError；
//     ③ fallback 里**内嵌字符串拼接**的 params（例：{ cap: '$' + x.toLocaleString() }）
//        ⇒ 表达式跨「字符串片段 / 代码片段」边界 ⇒ 整串匹配失效。
//   ⇒ 这三类共 25 个分支专属 token（健康度档位 / 小额分支 / 非美国税务分支...）
//      全部推不出英文模板 ⇒ locale 缺键 ⇒ G3 红 ⇒ zh 页对应分支仍是英文。
//
// ⭐ 本工具的办法：**真的把它跑起来**
//   ① 按引擎 inputs 的类型 fuzz 出一批输入（number 覆盖多量级、select 覆盖每个选项）；
//   ② 跑服务端 generate() 与客户端 customFn ⇒ 捕获输出里的全部 token；
//   ③ 用 token 自带的 params 把 fallback 里的取值换回 {param} ⇒ 英文模板；
//   ④ **round-trip 校验**：模板回填后必须逐字等于 fallback（否则丢弃）；
//   ⑤ 同一 code 在多次观察里推导出不同模板 ⇒ 记为 conflict（必须人工看）。
//
// ⭐ 为什么不改引擎源码
//   把「变量 fallback」改成「字面量模板」也能解决，但会动到 3 个引擎的服务端+客户端镜像，
//   一旦渲染结果变了就会撞 G9（英文页逐字不变）⇒ 风险面大得多。
//   探针是**只读**的：不碰引擎，只补 locale 缺的键 ⇒ 英文页零风险。
//
// 用法（从仓库根跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-locale-branch-probe.ts
//   PROBE_ROUNDS=800 node .../p168-locale-branch-probe.ts   # 加轮次

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import '../../src/engines/index.ts';
import { getAllEngines } from '../../src/core/engines/registry.ts';
import { CALC_OUTPUT_TOKEN_RE, extractEngineTokenCodes } from '../../src/lib/calc-output-i18n.ts';
import { TOKENIZED } from './p168-tokenized-engines.mjs';
import { replaceWordValue } from './p168-locale-source.ts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const NL = String.fromCharCode(10);

function parseTokens(text: string) {
  const re = new RegExp(CALC_OUTPUT_TOKEN_RE.source, 'g');
  const out: { code: string; params: Record<string, string>; fallback: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    let params: Record<string, string> = {};
    if (m[2]) { try { params = JSON.parse(m[2]); } catch { params = {}; } }
    out.push({ code: m[1], params, fallback: m[3] || '' });
  }
  return out;
}

/** 把 fallback 里的 param 取值**全部**换回 {param}（长的先换） */
function substituteAll(text: string, params: Record<string, string>): string {
  const keys = Object.keys(params).filter((k) => params[k]).sort((a, b) => params[b].length - params[a].length);
  let out = text;
  for (const k of keys) {
    out = replaceWordValue(out, params[k], '{' + k + '}');
  }
  return out;
}

/** 按 {param} 模板回填（round-trip 校验用；手写扫描，不用正则） */
function fillTemplate(tpl: string, params: Record<string, string>): string {
  let out = '';
  let i = 0;
  while (i < tpl.length) {
    if (tpl[i] === '{') {
      const close = tpl.indexOf('}', i);
      if (close > i) {
        const key = tpl.slice(i + 1, close);
        if (/^[A-Za-z0-9_]+$/.test(key) && params[key] != null) { out += params[key]; i = close + 1; continue; }
      }
    }
    out += tpl[i];
    i++;
  }
  return out;
}

/** codegen 的默认输入（作为 fuzz 的基线） */
function codegenDefaults(): Record<string, Record<string, string>> {
  const s = readFileSync(resolve(ROOT, 'scripts', 'codegen-examples.mjs'), 'utf8');
  const i = s.indexOf('const ENGINES = [');
  const j = s.indexOf(NL + '];', i);
  const arr = new Function('return ' + s.slice(s.indexOf('[', i), j + 2))();
  const o: Record<string, Record<string, string>> = {};
  for (const e of arr) o[e.slug] = e.defaultInputs;
  return o;
}

/** 造一批 fuzz 输入：number 覆盖多量级、select 覆盖每个选项、其余沿用默认值 */
function fuzzInputs(engine: any, base: Record<string, string>, seed: number): Record<string, string> {
  const out: Record<string, string> = { ...base };
  const nums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 40, 50, 60, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1200, 1500, 2000, 3000, 5000, 7500, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
  const small = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.75, 0.85, 0.9, 0.95];
  const rand = (n: number) => Math.floor(Math.abs(Math.sin(seed * 9301 + n * 49297) * 233280) % 1 * 1000) / 1000;
  const inputs = engine.inputs ?? [];
  for (let k = 0; k < inputs.length; k++) {
    const inp = inputs[k];
    if (inp.type === 'select') {
      const opts = inp.options ?? [];
      if (opts.length) out[inp.name] = String(opts[Math.floor(rand(k) * opts.length) % opts.length]);
    } else if (inp.type === 'number') {
      const r = rand(k + 7);
      out[inp.name] = r < 0.12 ? String(small[Math.floor(rand(k + 3) * small.length) % small.length]) : String(nums[Math.floor(r * nums.length) % nums.length]);
    }
  }
  return out;
}
export interface ProbeResult {
  observedAll?: Record<string, { tpl: string; samples: number; ok: boolean; alt?: string }>;
  newKeys: Record<string, string>;
  conflicts: string[];
  unresolved: string[];
  observedCount: number;
  rounds: number;
  perEngine: { alias: string; observed: number; codes: number; newCount: number }[];
}

export function probe(rounds: number): ProbeResult {
  const defaults = codegenDefaults();
  const engines = getAllEngines() as any[];
  const want = TOKENIZED.map((t) => t.slug);
  const bySlug = new Map(TOKENIZED.map((t) => [t.slug, t]));
  const en = JSON.parse(readFileSync(resolve(ROOT, 'src', 'i18n', 'locales', 'en.json'), 'utf8'));
  const observed: Record<string, { tpl: string; samples: number; ok: boolean; alt?: string; alts?: Record<string, number> }> = {};
  const perEngine: ProbeResult['perEngine'] = [];
  for (const e of engines) {
    if (!want.includes(e.slug)) continue;
    const meta = bySlug.get(e.slug)!;
    const gen = e.generate ?? e.calculate;
    const cf = e.clientConfig && e.clientConfig.customFn;
    const base = defaults[e.slug] ?? {};
    const before = Object.keys(observed).length;
    // 边界组合：每个 number 输入单独取 0，外加「全部取 0」
    //   （实测 type_custom = postMoneyCap<=0 && discountRate===0 只能这样命中）
    const numNames = (e.inputs ?? []).filter((x: any) => x.type === 'number').map((x: any) => x.name);
    const boundarySets = [];
    for (const nm of numNames) {
      const z = { ...base };
      z[nm] = '0';
      boundarySets.push(z);
    }
    {
      const z = { ...base };
      for (const nm of numNames) z[nm] = '0';
      boundarySets.push(z);
    }
    for (let r = 0; r < rounds; r++) {
      const inputs = (r < boundarySets.length) ? boundarySets[r] : fuzzInputs(e, base, r + 1);
      const texts: string[] = [];
      try { texts.push((gen(inputs) as string[]).join(NL)); } catch { /* 这组输入引擎抛错 => 跳过 */ }
      if (cf) {
        try {
          const fn = new Function('inputs', 'pick', 'fill', cf);
          texts.push((fn(inputs, (x: any) => x, (a: any, b: any) => b) as string[]).join(NL));
        } catch { /* 客户端同样可能抛错 */ }
      }
      for (const t of texts) {
        for (const tk of parseTokens(t)) {
          if (!tk.fallback) continue;
          const tpl = substituteAll(tk.fallback, tk.params);
          if (!tpl) continue;
          // ⭐ round-trip：模板回填后必须逐字等于 fallback，否则说明推导把文案改坏了
          if (fillTemplate(tpl, tk.params) !== tk.fallback) continue;
          const cur = observed[tk.code];
          if (!cur) { observed[tk.code] = { tpl, samples: 1, ok: true, alts: { [tpl]: 1 } }; continue; }
          cur.samples++;
          cur.alts![tpl] = (cur.alts![tpl] ?? 0) + 1;
          // 众数：占位符归属歧义（两个 param 的值恰好相同）会让推导模板在多次观察间抖动
          //   => 取出现次数最多的那个（真实模板在多数样本里一致）
          let best = '';
          let bestN = 0;
          let tie = false;
          for (const k of Object.keys(cur.alts!)) {
            if (cur.alts![k] > bestN) { best = k; bestN = cur.alts![k]; tie = false; }
            else if (cur.alts![k] === bestN) tie = true;
          }
          cur.tpl = best;
          cur.ok = !tie;
          cur.alt = Object.keys(cur.alts!).filter((k) => k !== best).join(' || ');
        }
      }
    }
    const allCodes = extractEngineTokenCodes(e);
    const mine = Object.keys(observed).filter((c) => c.includes('.' + meta.alias + '.'));
    perEngine.push({ alias: meta.alias, observed: mine.length, codes: allCodes.length, newCount: mine.filter((c) => en[c] === undefined).length });
    void before;
  }
  const newKeys: Record<string, string> = {};
  const conflicts: string[] = [];
  for (const c of Object.keys(observed).sort()) {
    const o = observed[c];
    if (!o.ok) { conflicts.push(c + NL + '    第一次: ' + JSON.stringify(o.tpl) + NL + '    另一次: ' + JSON.stringify(o.alt ?? '')); continue; }
    if (en[c] === undefined) newKeys[c] = o.tpl;
  }
  // ⭐ 未被观察到的 code（探针跑不到的分支）—— 由提取器的源码推导兜底
  const unresolved: string[] = [];
  for (const e of engines) {
    if (!want.includes(e.slug)) continue;
    for (const c of extractEngineTokenCodes(e)) {
      if (observed[c] === undefined && en[c] === undefined) unresolved.push(e.slug + ' :: ' + c);
    }
  }
  const observedOut: Record<string, { tpl: string; samples: number; ok: boolean; alt?: string }> = {};
  for (const c of Object.keys(observed).sort()) observedOut[c] = observed[c];
  return { newKeys, conflicts, unresolved, observedCount: Object.keys(observed).length, rounds, perEngine, observedAll: observedOut };
}

if (resolve(process.argv[1] ?? '') === resolve(import.meta.dirname, 'p168-locale-branch-probe.ts')) {
  const rounds = Number(process.env.PROBE_ROUNDS ?? 400);
  const r = probe(rounds);
  mkdirSync(resolve(ROOT, 'tmp'), { recursive: true });
  writeFileSync(resolve(ROOT, 'tmp', 'p168-locale-branch-probe.json'), JSON.stringify(r, null, 2));
  console.log('轮次 ' + r.rounds + ' · 观察到的 code ' + r.observedCount + ' · locale 新增键 ' + Object.keys(r.newKeys).length + ' · 冲突 ' + r.conflicts.length + ' · 未观察到 ' + r.unresolved.length);
  for (const p of r.perEngine) console.log('  ' + p.alias.padEnd(24) + 'observed=' + String(p.observed).padStart(4) + ' codes=' + String(p.codes).padStart(4) + ' new=' + String(p.newCount).padStart(4));
  if (r.conflicts.length) { console.log('—— 冲突（同一 code 推导出不同模板，必须人工看）：'); for (const c of r.conflicts) console.log('  ' + c); }
  if (r.unresolved.length) { console.log('—— 未观察到且 locale 也没有（探针跑不到的分支）：'); for (const c of r.unresolved) console.log('  ' + c); }
  // ⭐ 防真空绿：探针一个 code 都没观察到 => 一定哪里错了
  if (r.observedCount === 0) { console.log('探针一个 code 都没观察到（过滤或引擎加载有问题）'); process.exit(1); }
  process.exitCode = r.conflicts.length ? 1 : 0;
}
