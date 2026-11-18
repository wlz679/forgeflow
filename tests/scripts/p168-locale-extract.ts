#!/usr/bin/env node
// P168 B3-8 —— locale 键**提取器**：产出「本批要落库」的 locale 键清单。
//
// ⭐ 三个来源
//   ① **源码模板**（主）：p168-locale-source.ts 解析引擎源码 ⇒ 覆盖**所有分支**
//      （健康度档位、错误提示等默认输入走不到的分支）。
//   ② **运行时模板**（复核）：跑 generate() + 客户端 customFn 解析输出里的
//      `$code{params}|fallback|` ⇒ 拿到「默认输入下真实渲染的英文」。
//   ③ **locale 现状**：en.json / zh.json 里已有的键。
//
// ⭐ 交叉校验（自证推导逻辑没跑偏）
//   ①②都拿到的 code ⇒ 模板必须**逐字相同**；不同则报 conflict（宁可停下来查，也不要
//   把错模板写进 locale —— 错模板会让英文页出现与源码不一致的文案）。
//
// ⭐ 输出分类
//   newKeys   —— 英文模板有、en.json 里还没有 ⇒ 本批要落库。
//   covered   —— en.json 已有 ⇒ 不用管。
//   noTemplate —— 源码里有 code 但推不出英文模板 ⇒ 必须人工处理（单独报出）。
//   conflict  —— ①②不一致 ⇒ 必须人工处理。
//
// 用法（从仓库根跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-locale-extract.ts [alias ...]
//   --print   把 newKeys 按「code<TAB>英文模板」逐行打到 stdout（写中文翻译时对着抄）

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import '../../src/engines/index.ts';
import { getAllEngines } from '../../src/core/engines/registry.ts';
import { CALC_OUTPUT_TOKEN_RE } from '../../src/lib/calc-output-i18n.ts';
import { TOKENIZED } from './p168-tokenized-engines.mjs';
import { sourceTemplates, replaceWordValue } from './p168-locale-source.ts';
import { probe } from './p168-locale-branch-probe.ts';
import { MANUAL_BRANCH_TEMPLATES } from './p168-locale-manual.ts';

const ROOT = resolve(import.meta.dirname, '..', '..');

export function defaultInputs(): Record<string, Record<string, string>> {
  const s = readFileSync(resolve(ROOT, 'scripts', 'codegen-examples.mjs'), 'utf8');
  const i = s.indexOf('const ENGINES = [');
  const j = s.indexOf('\n];', i);
  const arr = new Function('return ' + s.slice(s.indexOf('[', i), j + 2))();
  const o: Record<string, Record<string, string>> = {};
  for (const e of arr) o[e.slug] = e.defaultInputs;
  return o;
}

export function parseTokens(text: string) {
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

export function substituteValues(text: string, params: Record<string, string>): string {
  const keys = Object.keys(params).filter((k) => params[k]).sort((a, b) => params[b].length - params[a].length);
  let out = text;
  for (const k of keys) {
    out = replaceWordValue(out, params[k], '{' + k + '}');
  }
  return out;
}

export function extractAll(only: string[]) {
  const defs = defaultInputs();
  const engines = getAllEngines() as any[];
  const want = TOKENIZED.map((t) => t.slug);
  const bySlug = new Map(TOKENIZED.map((t) => [t.slug, t]));
  const en = JSON.parse(readFileSync(resolve(ROOT, 'src', 'i18n', 'locales', 'en.json'), 'utf8'));
  const zh = JSON.parse(readFileSync(resolve(ROOT, 'src', 'i18n', 'locales', 'zh.json'), 'utf8'));
  const use = engines.filter((e) => want.includes(e.slug) && (only.length === 0 || only.some((n) => e.slug.includes(n))));
  // ⭐ 分支探针：跑 generate() + 客户端 customFn 的 fuzz 输入 ⇒ 拿到**默认路径走不到的分支**
  //   上的 token 与它的英文 fallback ⇒ 反推模板（round-trip 校验过）。
  //   ⚠️ 静态推导（源码模板）对「fallback = 运行时变量 / 含未定义函数 / 跨字符串拼接」三类无能为力
  //   ⇒ 没有这一路，25 个分支专属 token 全部推不出模板 ⇒ locale 缺键 ⇒ G3 红。
  const probeRes = probe(Number(process.env.PROBE_ROUNDS ?? 400));
  const probeTpl: Record<string, string> = { ...probeRes.newKeys };
  const newKeys: Record<string, string> = {};
  const conflicts: string[] = [];
  const noTemplateMissing: string[] = [];
  // ⭐ P168 B3-8：locale **已有**的键，但源码推导出的英文与 locale 里的**不一致**
  //   ⇒ 说明有人复用了一个同义键却改了英文 ⇒ 英文页会变（G9 会红）
  //   ⇒ 提前报出来，避免等到 build 才发现。
  const noTemplateCovered: string[] = [];
  const coveredDrift: string[] = [];
  const perEngine: { alias: string; codes: number; newCount: number; conflict: number }[] = [];
  for (const e of use) {
    const meta = bySlug.get(e.slug)!;
    const srcTpl = sourceTemplates(resolve(ROOT, meta.file));
    const runtime: Record<string, string> = {};
    const texts: string[] = [];
    const inputs = defs[e.slug];
    const gen = e.generate ?? e.calculate;
    if (inputs) { try { texts.push((gen(inputs) as string[]).join('\n')); } catch (err) { texts.push('ERR ' + String(err)); } }
    for (const ex of e.staticExamples ?? []) texts.push(ex);
    const cf = e.clientConfig && e.clientConfig.customFn;
    if (cf) { try { const fn = new Function('inputs', 'pick', 'fill', cf); texts.push((fn(inputs ?? {}, (x: any) => x, (a: any, b: any) => b) as string[]).join('\n')); } catch (err) { texts.push('ERR ' + String(err)); } }
    for (const t of texts) {
      for (const tk of parseTokens(t)) {
        if (runtime[tk.code] !== undefined) continue;
        const tpl = substituteValues(tk.fallback, tk.params);
        if (tpl) runtime[tk.code] = tpl;
      }
    }
    let newCount = 0;
    let conflict = 0;
    const codes = new Set([...Object.keys(srcTpl), ...Object.keys(runtime), ...Object.keys(probeTpl), ...Object.keys(MANUAL_BRANCH_TEMPLATES)]);
    for (const c of codes) {
      const s = srcTpl[c];
      const r = runtime[c];
      const p = probeTpl[c];
      const m = MANUAL_BRANCH_TEMPLATES[c];
      if (s !== undefined && r !== undefined && s !== r) { conflict++; conflicts.push(e.slug + ' :: ' + c + '\n    src=' + JSON.stringify(s) + '\n    run=' + JSON.stringify(r)); }
      // ⭐ 优先级：源码推导 > 默认运行时的实测 > 分支探针 > 手工补（死分支）
      //   ⭐ 源码优先的理由：源码推导是**结构化**的（按参数表达式回填），
      //     而运行时反推是「取值换回占位符」—— 取值很短时（例：provider 初始字母 'O'）
      //     会误伤单词内部（'OpenAI' ⇒ '{initial}penAI'）⇒ 源码推导更可信。
      const tpl = s !== undefined ? s : (r !== undefined ? r : (p !== undefined ? p : m));
      if (tpl === undefined) { (en[c] === undefined && zh[c] === undefined ? noTemplateMissing : noTemplateCovered).push(e.slug + ' :: ' + c); continue; }
      if (en[c] === undefined) { newKeys[c] = tpl; newCount++; }
      // ⭐ 2026-11-17 B3-9（实测修）：漂移基线必须是**推导模板 tpl**，不是运行时值 r
      //   ⇒ r 是「运行时烘焙值」（数值已填死）⇒ locale（正确的模板）≠ r ⇒ **假阳性**
      //   ⇒ 真正的漂移 = locale.en ≠ 推导模板（用户会看到错文案 / 错数值）
      else if (en[c] !== tpl) {
        coveredDrift.push(e.slug + ' :: ' + c + '\n    locale=' + JSON.stringify(en[c]) + '\n    derived=' + JSON.stringify(tpl));
      }
    }
    perEngine.push({ alias: meta.alias, codes: codes.size, newCount, conflict });
  }
  return { newKeys, conflicts, noTemplateMissing, noTemplateCovered, coveredDrift, perEngine, engineCount: use.length };
}

// ⚠️ **CLI 只能在「本文件是入口」时跑** —— 否则被别的工具 import 时也会执行
//    ⇒ 会把 tmp/p168-locale-extract.json 覆盖成空数据（实测踩过：合并工具 import 本文件
//    ⇒ 提取器的 CLI 跟着跑 ⇒ 输出文件被清空 ⇒ 翻译 worker 拿到空清单）。
if (resolve(process.argv[1] ?? '') === resolve(import.meta.dirname, 'p168-locale-extract.ts')) {
const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const r = extractAll(only);
mkdirSync(resolve(ROOT, 'tmp'), { recursive: true });
writeFileSync(resolve(ROOT, 'tmp', 'p168-locale-extract.json'), JSON.stringify({ newKeys: r.newKeys, conflicts: r.conflicts, noTemplateMissing: r.noTemplateMissing, noTemplateCovered: r.noTemplateCovered, coveredDrift: r.coveredDrift }, null, 2));
console.log('引擎 ' + r.engineCount + ' 个 · 新增键 ' + Object.keys(r.newKeys).length + ' · 冲突 ' + r.conflicts.length + ' · 无模板且未落库 ' + r.noTemplateMissing.length + ' · 无模板但已落库 ' + r.noTemplateCovered.length + ' · 已有键英文漂移 ' + r.coveredDrift.length);
for (const p of r.perEngine) console.log('  ' + p.alias.padEnd(24) + 'codes=' + String(p.codes).padStart(4) + ' new=' + String(p.newCount).padStart(4) + ' conflict=' + p.conflict);
if (r.conflicts.length) { console.log('—— 冲突（源码 vs 运行时）：'); for (const c of r.conflicts) console.log('  ' + c); }
if (r.noTemplateMissing.length) { console.log('—— 无模板且未落库（真缺口）：'); for (const c of r.noTemplateMissing) console.log('  ' + c); }
  if (r.coveredDrift.length) { console.log('—— 已有键的英文漂移（locale 与源码不一致 ⇒ 英文页会变）：'); for (const c of r.coveredDrift) console.log('  ' + c); }
if (process.argv.includes('--print')) {
  console.log('=== NEW KEYS (code<TAB>en) ===');
  for (const k of Object.keys(r.newKeys).sort()) console.log(k + '\t' + r.newKeys[k]);
}
}