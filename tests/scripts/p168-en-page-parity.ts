#!/usr/bin/env node
// P168 B3-7 —— **英文页零变化**判据的可复算测量工具。
//
// 用法：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-en-page-parity.ts              # 全部 10 个试点
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-en-page-parity.ts mrr         # 只看一个
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-en-page-parity.ts --allow-list # 允许「有意改动」清单
//
// ⭐⭐ 为什么需要它（B3-7 的产品承诺：zh 页改中文，**英文页一个字都不改**）：
//   · 静态卡片 = `engine.staticExamples[0]`（codegen 用**服务端 generate()** 生成）。
//   · HEAD 版的 `staticExamples[0]` = **token 化之前**的英文输出。
//   · 现在版的 token 自带**英文兜底** ⇒ 兜底渲染 = token 化后的英文输出。
//   ⇒ **兜底渲染 == HEAD 的 staticExamples[0]** ⇒ 英文页逐字不变。
//
// ⚠️ 这条判据**补上了 G8 的盲区**：G8 只比「兜底渲染 vs locale.en 模板渲染」
//   ⇒ 两边一起错时它照样绿 ⇒ 它发现不了「兜底本身与源码原文不同」。
//   实测本工具当场抓到 rent_vs_buy 的两处真实回归：
//     ① `padEnd(10)` 的对齐空格被 token 化时丢弃（英文页的对齐变了）；
//     ② verdict 多出一个空格。
//   ⚠️ 已知**有意**的例外：mrr 的 `🔄 What-If Scenarios` → `🔄 What-If Scenarios:`
//     （全仓主流写法带冒号；已由计划记录）。

import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

import '../../src/engines/index.ts';
import { getAllEngines } from '../../src/core/engines/registry.ts';
import { renderCalcOutput } from '../../src/lib/calc-output-i18n.ts';
import { PILOT_SLUGS, codegenDefaults } from './p168-server-client-parity.ts';

const NL = String.fromCharCode(10);

/** 试点引擎的源文件（slug → 仓库路径）—— 工具自带，不依赖 tmp/ ⇒ CI 也能跑 */
export const PILOT_FILES: Record<string, string> = {
  'solopreneur-mrr-calculator': 'src/engines/saas/mrr-calculator.ts',
  'solopreneur-rent-vs-buy-calculator': 'src/engines/real-estate/rent-vs-buy-calculator.ts',
  'solopreneur-brrrr-calculator': 'src/engines/real-estate/brrrr-calculator.ts',
  'solopreneur-project-profitability-calculator': 'src/engines/freelance/project-profitability-calculator.ts',
  'solopreneur-coupon-attribution-calculator': 'src/engines/marketing/coupon-attribution-calculator.ts',
  'solopreneur-saas-valuation-calculator': 'src/engines/valuation/saas-valuation-calculator.ts',
  'solopreneur-acv-calculator': 'src/engines/sales/acv-calculator.ts',
  'solopreneur-funnel-step-calculator': 'src/engines/product-analytics/funnel-step-calculator.ts',
  'solopreneur-activation-rate-calculator': 'src/engines/product-analytics/activation-rate-calculator.ts',
  'solopreneur-stickiness-calculator': 'src/engines/product-analytics/stickiness-calculator.ts',
};

/** ⭐ 已记录的「有意改动」白名单（每条都要写明理由） */
export const ALLOWED_DIFFS: Record<string, string[]> = {
  // mrr：`🔄 What-If Scenarios` → `🔄 What-If Scenarios:`（全仓主流写法带冒号；计划已记录）
  'solopreneur-mrr-calculator': ['🔄 What-If Scenarios:'],
};

export interface EnParityRow {
  slug: string;
  same: boolean;
  allowed: boolean;
  headChars: number;
  nowChars: number;
  diffs: string[];
}

function headStaticExample(file: string): string | null {
  let src: string;
  try {
    src = execSync('git show HEAD:' + file, { encoding: 'utf8', maxBuffer: 1 << 28 });
  } catch {
    return null;
  }
  const m = src.match(/staticExamples:\s*\[\s*'((?:[^'\\]|\\.)*)'/);
  if (!m) return null;
  return m[1].replace(/\\n/g, NL).replace(/\\'/g, "'");
}

/**
 * ⭐ 日期归一化：`dateLabel()` 用**当前月份**推算里程碑日期
 *   （实测 mrr 的 `(~Sep 2026)` 现在是 `(~Jan 2027)`）
 *   ⇒ HEAD 的静态示例是**几个月前**生成的 ⇒ 这一项**必然**随时间变
 *   ⇒ 它不是「英文页被改了」，而是「时间在走」⇒ 归一化掉。
 */
export function normalizeDates(text: string): string {
  return text.replace(/\(~[A-Z][a-z]{2} \d{4}\)/g, '(~DATE)');
}

export function measureEnParity(slugs: string[]): EnParityRow[] {
  const engines = getAllEngines() as any[];
  const defaults = codegenDefaults();
  const rows: EnParityRow[] = [];
  for (const slug of slugs) {
    const file = PILOT_FILES[slug];
    const e = engines.find((x) => x.slug === slug);
    if (!e || !file) continue;
    const head = headStaticExample(file);
    if (head === null) continue;
    const raw = (e.generate ?? e.calculate).call(e, defaults[slug]);
    const text = Array.isArray(raw) ? raw.map(String).join(NL) : String(raw);
    const now = renderCalcOutput(text, {});
    const A = normalizeDates(head).split(NL), B = normalizeDates(now).split(NL);
    const diffs: string[] = [];
    for (let i = 0; i < Math.max(A.length, B.length); i++) {
      if (A[i] !== B[i]) diffs.push('第 ' + (i + 1) + ' 行：HEAD ' + JSON.stringify(A[i]) + ' vs 现在 ' + JSON.stringify(B[i]));
    }
    const allow = ALLOWED_DIFFS[slug] ?? [];
    const allowed = diffs.length > 0 && diffs.every((d) => allow.some((a) => d.includes(a)));
    rows.push({ slug, same: head === now, allowed, headChars: head.length, nowChars: now.length, diffs });
  }
  return rows;
}

if (resolve(process.argv[1] ?? '') === resolve(import.meta.dirname, 'p168-en-page-parity.ts')) {
  const args = process.argv.slice(2);
  const named = args.filter((a) => !a.startsWith('--'));
  const slugs = named.length
    ? PILOT_SLUGS.filter((s) => named.some((n) => s.includes(n.replace(/^solopreneur-/, '').replace(/-calculator$/, ''))))
    : PILOT_SLUGS;
  const rows = measureEnParity(slugs);
  let bad = 0;
  for (const r of rows) {
    if (r.same) { console.log('✔ ' + r.slug + ' ⇒ 英文页逐字不变（' + r.nowChars + ' 字符）'); continue; }
    if (r.allowed) { console.log('⊙ ' + r.slug + ' ⇒ 只有「已记录的有意改动」（' + r.diffs.length + ' 处）'); continue; }
    bad++;
    console.log('✗ ' + r.slug + ' ⇒ 英文页有 ' + r.diffs.length + ' 处未记录差异（' + r.headChars + ' → ' + r.nowChars + ' 字符）');
    for (const d of r.diffs.slice(0, 5)) console.log('    ' + d);
  }
  console.log('—— ' + rows.length + ' 个试点 · 未记录差异 ' + bad + ' 个');
  process.exitCode = bad === 0 ? 0 : 1;
}
