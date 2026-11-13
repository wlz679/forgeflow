#!/usr/bin/env node
// P168 B3-7 —— **渲染抽样工具**：把试点引擎的服务端输出用 locale 渲染成 en / zh 两栏并排打印。
//
// 用法：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-render-sample.ts                # 全部 10 个试点
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-render-sample.ts mrr           # 只看一个
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-render-sample.ts mrr 40        # 只看前 40 行
//
// ⭐ 为什么需要它：
//   · 「zh 页显示中文」这件事**肉眼可验**，但「数值有没有被模板替换掉」**只能肉眼验**
//     （守卫只能告诉你「不一致」，不能给你看渲染结果）。
//   · 本工具是 Task 20 目视验收的**取样器**：把改动前后的差异摆在屏幕上。
//   · ⭐ 真相源优先级：`src/i18n/locales/*.json`（落库后的真值）→ `tmp/canonical-locale.json`（未落库时的中间产物）。

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import '../../src/engines/index.ts';
import { getAllEngines } from '../../src/core/engines/registry.ts';
import { renderCalcOutput } from '../../src/lib/calc-output-i18n.ts';
import { PILOT_SLUGS, codegenDefaults, syntheticInputs } from './p168-server-client-parity.ts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const NL = String.fromCharCode(10);

/** 读 locale 的 calc_out.* 模板（en / zh 两张表） */
export function loadTemplates(): { en: Record<string, string>; zh: Record<string, string>; source: string } {
  const en: Record<string, string> = {};
  const zh: Record<string, string> = {};
  const realEn = resolve(ROOT, 'src', 'i18n', 'locales', 'en.json');
  const realZh = resolve(ROOT, 'src', 'i18n', 'locales', 'zh.json');
  if (existsSync(realEn) && existsSync(realZh)) {
    const je = JSON.parse(readFileSync(realEn, 'utf8').replace(/^\uFEFF/, ''));
    const jz = JSON.parse(readFileSync(realZh, 'utf8').replace(/^\uFEFF/, ''));
    for (const [k, v] of Object.entries(je)) if (k.startsWith('calc_out.') && typeof v === 'string') en[k] = v;
    for (const [k, v] of Object.entries(jz)) if (k.startsWith('calc_out.') && typeof v === 'string') zh[k] = v;
    if (Object.keys(en).length) return { en, zh, source: 'src/i18n/locales' };
  }
  const tmp = resolve(ROOT, 'tmp', 'canonical-locale.json');
  if (existsSync(tmp)) {
    const c = JSON.parse(readFileSync(tmp, 'utf8')) as Record<string, { en?: string; zh?: string }>;
    for (const [k, v] of Object.entries(c)) {
      if (typeof v === 'string') { en[k] = v; zh[k] = v; continue; }
      if (v && typeof v.en === 'string') en[k] = v.en;
      if (v && typeof v.zh === 'string') zh[k] = v.zh;
    }
    return { en, zh, source: 'tmp/canonical-locale.json' };
  }
  return { en, zh, source: '(空)' };
}

export interface SampleRow { slug: string; en: string[]; zh: string[] }

export function renderSample(slugs: string[], limit = Infinity): { rows: SampleRow[]; source: string } {
  const { en, zh, source } = loadTemplates();
  const defaults = codegenDefaults();
  const engines = getAllEngines() as any[];
  const rows: SampleRow[] = [];
  for (const slug of slugs) {
    const e = engines.find((x) => x.slug === slug);
    if (!e) continue;
    const inputs = defaults[slug] ?? syntheticInputs(e);
    const gen = e.generate ?? e.calculate;
    const raw = gen.call(e, inputs);
    const text = Array.isArray(raw) ? raw.map(String).join(NL) : String(raw);
    rows.push({
      slug,
      en: renderCalcOutput(text, en).split(NL).slice(0, limit),
      zh: renderCalcOutput(text, zh).split(NL).slice(0, limit),
    });
  }
  return { rows, source };
}

if (resolve(process.argv[1] ?? '') === resolve(import.meta.dirname, 'p168-render-sample.ts')) {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => /^\d+$/.test(a));
  const limit = limitArg ? Number(limitArg) : Infinity;
  const named = args.filter((a) => !/^\d+$/.test(a));
  const slugs = named.length
    ? PILOT_SLUGS.filter((s) => named.some((n) => s.includes(n.replace(/^solopreneur-/, '').replace(/-calculator$/, ''))))
    : PILOT_SLUGS;
  const { rows, source } = renderSample(slugs, limit);
  console.log('模板来源：' + source + ' · 引擎 ' + rows.length + ' 个');
  for (const r of rows) {
    console.log('');
    console.log('══════ ' + r.slug + ' ══════');
    for (let i = 0; i < Math.max(r.en.length, r.zh.length); i++) {
      console.log('EN ' + JSON.stringify(r.en[i] ?? ''));
      console.log('ZH ' + JSON.stringify(r.zh[i] ?? ''));
    }
  }
  process.exitCode = 0;
}
