#!/usr/bin/env node
// P160 — 引擎 FAQ 的价格单一真相源守卫（build-dep）。
//
// 为什么需要 build-dep 版本
// -------------------------
// 源码守卫（engine-faq-live-price-guard.test.ts）盯的是「源文件里还有没有手写
// 单价」「token 引用的 key 存不存在」「三处来源是否对齐」。但**页面最终长什么样**
// 只有产物知道：
//
//   1. **token 必须真的被解析** —— src/pages/[lang]/[slug].astro 的 translatedFaq
//      里只要漏接解析器，页面就会把 `{{live:openai/gpt-5}}` 原样印给用户。
//      这在源码层看不出来（源码里 token 就是 token）。
//   2. **渲染值必须等于实时数据集的值** —— 解析器写错了（每 1M 的价又乘了一次
//      1e6），页面会安静地显示一个错得离谱的数字。
//   3. **旧价格必须消失** —— P160 修掉的正是那批已经漂移的价格；产物里还留着
//      它们，就说明页面没真正走到新数据上。
//
// 本守卫直接读 dist/ 的 HTML，断言：
//   · 全站 dist 里没有未解析的 `{{live*}}` token；
//   · 5 个 LLM 引擎的 en + zh 页面都渲染出了**引擎源**里 FAQ 的解析后文本；
//   · 关键价格 == 写死字面量（= 数据集实时值）；
//   · P160 修掉的那批过期价格串在对应产物里已经消失。
//
// ⚠️ 期望值全部是本文件里**独立写死**的字面量，不是从被测模块导出的常量。
//    数据集本身（`src/data/ai-pricing.json`）是真相源，直接读它比对 ——
//    不调 `live-price.ts` 的导出函数（那会让判据与实现同源）。
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern)

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

import PRICING from '../src/data/ai-pricing.json';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

/** P160 覆盖的 5 个 LLM 引擎 —— 写死 */
const ENGINE_SLUGS = [
  'solopreneur-ai-api-cost-comparison',
  'solopreneur-claude-api-cost-calculator',
  'solopreneur-gemini-api-cost-calculator',
  'solopreneur-deepseek-api-cost-calculator',
  'solopreneur-openai-token-calculator',
] as const;

/**
 * 每个引擎页面必须出现的**关键价格**（独立写死 = 数据集实时值）。
 *
 *   claude  FAQ[8]  Haiku 4.5 = $1.00/$5.00（旧文案 $0.80/$4 ← 漂了）
 *                   Opus 4.8  = $5.00/$25.00（旧文案 $15/$75 ← 差 3 倍）
 *   gemini  FAQ[11] Gemini 2.5 Flash = $0.30/$2.50（旧文案 $0.075/$0.30 ← 输出差 8.33 倍）
 *   deepseek FAQ[0] V4.1 Flash 1017 = $0.15/$0.60；3,000 reqs/月 ⇒ $1.35
 *   openai  FAQ[1]  GPT-5 Nano = $0.05/$0.40
 *   compare FAQ[0]  DeepSeek Coder = $0.14/$0.28
 */
const PAGE_EXPECTATIONS: Record<string, { live: string[]; stale: string[] }> = {
  'solopreneur-claude-api-cost-calculator': {
    live: ['$1.00 / $5.00', '$5.00 / $25.00'],
    stale: ['$0.80/$4', '$15/$75'],
  },
  'solopreneur-gemini-api-cost-calculator': {
    live: ['$0.30 / $2.50'],
    stale: ['$0.075/$0.30'],
  },
  'solopreneur-deepseek-api-cost-calculator': {
    live: ['$0.15 / $0.60', '$1.35'],
    stale: [],
  },
  'solopreneur-openai-token-calculator': {
    live: ['$0.05 / $0.40'],
    stale: [],
  },
  'solopreneur-ai-api-cost-comparison': {
    live: ['$0.14 / $0.28', '$0.15 / $0.60'],
    stale: [],
  },
};

function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'en', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p160] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

function readPage(slug: string, lang: 'en' | 'zh'): string {
  const abs = resolve(root, 'dist', lang, slug, 'index.html');
  assert.ok(existsSync(abs), `page not found in dist/: ${lang}/${slug}/index.html`);
  return readFileSync(abs, 'utf-8');
}

/** 递归列出 dist 下所有 html */
function listHtml(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const st = statSync(abs);
    if (st.isDirectory()) listHtml(abs, out);
    else if (entry.endsWith('.html')) out.push(abs);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// 1. 全站 dist 没有未解析的 token
// ─────────────────────────────────────────────────────────────
test('P160: dist 产物里没有未解析的 {{live*}} token', () => {
  ensureBuilt();
  const files = listHtml(resolve(root, 'dist'));
  assert.ok(files.length > 50, `dist 里只找到 ${files.length} 个 html —— 构建不完整？`);
  const offenders: string[] = [];
  for (const f of files) {
    const html = readFileSync(f, 'utf-8');
    if (/\{\{live[A-Za-z]*[:}]/.test(html)) {
      offenders.push(relative(root, f));
    }
  }
  assert.equal(
    offenders.length,
    0,
    `产物里出现了未解析的 live token（渲染层漏接解析器）：\n` +
      offenders.slice(0, 20).map((f) => `  - ${f}`).join('\n'),
  );
});

// ─────────────────────────────────────────────────────────────
// 2. 引擎 FAQ 的解析后文本真的渲染进了页面（en + zh）
// ─────────────────────────────────────────────────────────────
test('P160: 5 个 LLM 引擎的 FAQ 文本以「解析后」的形式出现在页面里（en + zh）', () => {
  ensureBuilt();
  const enLocale = JSON.parse(readFileSync(resolve(root, 'src/i18n/locales/en.json'), 'utf-8')) as Record<string, string>;
  const zhLocale = JSON.parse(readFileSync(resolve(root, 'src/i18n/locales/zh.json'), 'utf-8')) as Record<string, string>;

  const violations: string[] = [];
  for (const slug of ENGINE_SLUGS) {
    for (const lang of ['en', 'zh'] as const) {
      const html = readPage(slug, lang);
      const locale = lang === 'en' ? enLocale : zhLocale;
      // 每条 FAQ 的答案（含价格）都必须以解析后的形态出现
      for (let i = 0; i < 15; i++) {
        const raw = locale[`tools.${slug}.faq.${i}.a`];
        if (typeof raw !== 'string' || raw === '') continue;
        if (!raw.includes('{{live')) continue; // 没有价格的条目不参与
        const resolved = resolveFaqAnswer(raw);
        if (!resolved) continue;
        const needle = escapeForHtml(resolved);
        if (!html.includes(needle)) {
          violations.push(`${lang}/${slug} FAQ[${i}].a 的解析后文本未出现在页面里`);
        }
      }
    }
  }
  assert.equal(
    violations.length,
    0,
    `FAQ 的解析后文本未渲染到页面：\n` + violations.slice(0, 20).map((v) => `  - ${v}`).join('\n'),
  );
});

// ─────────────────────────────────────────────────────────────
// 3 + 4. 关键价格 == 写死字面量；过期价格串必须消失
// ─────────────────────────────────────────────────────────────
test('P160: 页面上的价格 == 数据集实时值，且 P160 修掉的过期价格串已消失', () => {
  ensureBuilt();
  const violations: string[] = [];

  // 先用数据集核对「写死字面量」确实是数据集当前的值（防止数据集变了而字面量没跟上）
  const expectationsAgainstDataset: Array<[string, number, number]> = [
    ['anthropic/claude-haiku-4-5', 1, 5],
    ['anthropic/claude-opus-4-8', 5, 25],
    ['google/gemini-2.5-flash', 0.3, 2.5],
    ['deepseek/deepseek-v4.1-flash-1017', 0.15, 0.6],
    ['openai/gpt-5-nano', 0.05, 0.4],
    ['deepseek/deepseek-coder', 0.14, 0.28],
  ];
  for (const [key, input, output] of expectationsAgainstDataset) {
    const [provider, model] = key.split('/');
    const m = (PRICING as any).llm?.[provider]?.models?.[model];
    assert.ok(m, `数据集里没有 ${key}`);
    assert.equal(Number(m.input), input, `数据集里 ${key} 的输入价不再是 ${input}`);
    assert.equal(Number(m.output), output, `数据集里 ${key} 的输出价不再是 ${output}`);
  }

  for (const slug of ENGINE_SLUGS) {
    const exp = PAGE_EXPECTATIONS[slug];
    assert.ok(exp, `${slug} 没有写死期望值`);
    for (const lang of ['en', 'zh'] as const) {
      const html = readPage(slug, lang);
      for (const live of exp.live) {
        if (!html.includes(live)) {
          violations.push(`${lang}/${slug}: 页面缺少关键价格 "${live}"`);
        }
      }
      for (const stale of exp.stale) {
        if (html.includes(stale)) {
          violations.push(`${lang}/${slug}: 页面仍显示过期价格 "${stale}"`);
        }
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `页面价格与数据集不一致：\n` + violations.map((v) => `  - ${v}`).join('\n'),
  );
});

// ─────────────────────────────────────────────────────────────
// 工具
// ─────────────────────────────────────────────────────────────
function escapeForHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 用**独立实现**解析 FAQ 里的 live token（不复用 src/lib/live-price.ts，
 * 免得判据与实现同源）。
 *
 * 只覆盖本守卫用到的 token 种类：
 *   live / liveIn / liveOut / liveBatch / liveBatchIn / liveBatchOut
 *   liveShareIn / liveShareOut / liveShareMix
 *   liveCostIn / liveCostOut / liveCostMix
 *   liveScaledIn / liveScaledOut / liveMonthlyAt
 */
function resolveFaqAnswer(raw: string): string | null {
  const pricing = PRICING as any;
  let ok = true;

  const fmt = (v: number): string => {
    let s = v.toFixed(4).replace(/0+$/, '');
    if (!s.includes('.')) return `${s}.00`;
    const [i, f] = s.split('.');
    return `${i}.${f.padEnd(2, '0')}`;
  };
  const money2 = (v: number): string => {
    const [i, f] = Math.abs(v).toFixed(2).split('.');
    return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${f}`;
  };
  /** 单次请求成本可能到 5 位小数（1000 token × $1.25/1M = $0.00125）⇒ 6 位精度 */
  const fmtExact = (v: number): string => {
    let s = Math.abs(v).toFixed(6).replace(/0+$/, '');
    if (!s.includes('.')) return `${s}.00`;
    const [i, f] = s.split('.');
    return `${i}.${f.padEnd(2, '0')}`;
  };
  const modelOf = (key: string) => {
    const [provider, model] = key.split('/');
    return pricing.llm?.[provider]?.models?.[model];
  };
  const batchOf = (m: any, which: 'in' | 'out'): number =>
    which === 'in' ? Number(m.batchInput ?? 0) : Number(m.batchOutput ?? 0);
  const mixed = (m: any): number => (1000 * Number(m.input) + 500 * Number(m.output)) / 1e6;

  const out = raw.replace(
    /\{\{(live|liveIn|liveOut|liveBatch|liveBatchIn|liveBatchOut|liveShareIn|liveShareOut|liveShareMix|liveCostIn|liveCostOut|liveCostMix|liveScaledIn|liveScaledOut|liveMonthlyAt):([^}|]+)(?:\|([^}]*))?\}\}/g,
    (_m, kind: string, key: string, params?: string) => {
      const parts = (params ?? '').split('|').filter((x) => x !== '');
      const m = modelOf(key);
      if (!m) {
        ok = false;
        return '';
      }
      switch (kind) {
        case 'live':
          return `$${fmt(Number(m.input))} / $${fmt(Number(m.output))}`;
        case 'liveIn':
          return `$${fmt(Number(m.input))}`;
        case 'liveOut':
          return `$${fmt(Number(m.output))}`;
        case 'liveBatch':
          return `$${fmt(batchOf(m, 'in'))} / $${fmt(batchOf(m, 'out'))}`;
        case 'liveBatchIn':
          return `$${fmt(batchOf(m, 'in'))}`;
        case 'liveBatchOut':
          return `$${fmt(batchOf(m, 'out'))}`;
        case 'liveScaledIn':
          return `$${fmt(Number(params) * Number(m.input))}`;
        case 'liveScaledOut':
          return `$${fmt(Number(params) * Number(m.output))}`;
        case 'liveCostIn':
          return `$${fmtExact((Number(params) * Number(m.input)) / 1e6)}`;
        case 'liveCostOut':
          return `$${fmtExact((Number(params) * Number(m.output)) / 1e6)}`;
        case 'liveCostMix':
          return `$${fmtExact((Number(parts[0]) * Number(m.input) + Number(parts[1]) * Number(m.output)) / 1e6)}`;
        case 'liveMonthlyAt':
          return `$${money2(Number(params) * mixed(m))}`;
        case 'liveShareIn':
          return `${Math.round((Number(m.input) / Number(modelOf(parts[0]).input)) * 100)}%`;
        case 'liveShareOut':
          return `${Math.round((Number(m.output) / Number(modelOf(parts[0]).output)) * 100)}%`;
        case 'liveShareMix':
          return `${Math.round((mixed(m) / mixed(modelOf(parts[0]))) * 100)}%`;
        default:
          ok = false;
          return '';
      }
    },
  );
  return ok ? out : null;
}
