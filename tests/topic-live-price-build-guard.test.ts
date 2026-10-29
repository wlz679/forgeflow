#!/usr/bin/env node
// P158 — editorial content 的价格单一真相源守卫（build-dep）。
//
// 为什么需要 build-dep 版本
// -------------------------
// 源码守卫盯的是「源文件里还有没有手写单价」「token 引用的 key 存不存在」。
// 但**页面最终长什么样**只有产物知道：
//
//   1. **token 必须真的被解析** —— 三个模板里只要有一个漏接解析器，
//      页面就会把 `{{live:openai/gpt-5}}` 原样印给用户。这在源码层看不出来。
//   2. **渲染值必须等于实时数据集的值** —— 解析器写错了（比如把每 1M 的价
//      又乘了一次 1e6），页面会安静地显示一个错得离谱的数字。
//   3. **旧价格必须消失** —— P158 修掉的正是那批已经漂移的价格；
//      产物里还留着它们，就说明页面没真正走到新数据上。
//
// 本守卫直接读 dist/ 的 HTML，断言：
//   · 全站 dist 里没有未解析的 `{{live*}}` token；
//   · 基准页 / 对比页 / guide 页（en + zh）渲染出的价格 == 数据集实时值；
//   · P158 修掉的那批过期价格串在产物里已经消失。
//
// ⚠️ 期望值全部是本文件里**独立写死**的字面量。数据集本身是真相源，
//    直接读它比对 —— 不调 `live-price.ts` 的导出函数（那会让判据与实现同源）。
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern)

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

import PRICING from '../src/data/ai-pricing.json';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

/**
 * 期望的实时价格 —— 独立写死。
 *
 * 数据集（2026-10-28）里的实际值：
 *   openai/gpt-5                 $1.25 / $10.00   （旧文案写的是 $2.50 / $10.00 ← 漂了）
 *   anthropic/claude-sonnet-4-5   $3.00 / $15.00
 *   google/gemini-2.5-pro        $1.25 / $10.00   （旧文案写的是 $1.25 / $5.00  ← 漂了）
 *   openai/gpt-4o                $2.50 / $10.00
 *   anthropic/claude-haiku-4-5   $1.00 / $5.00
 *   deepseek/deepseek-v3         $0.27 / $1.10
 *   deepseek/deepseek-r1         $0.55 / $2.19
 *   google/gemini-2.5-flash      $0.30 / $2.50    （旧文案写的是 $0.075 / $0.30 ← 漂了 8.33×）
 *
 *   anthropic/claude-sonnet-5    $2.00 / $10.00   （旧文案 $3 / $15   ← 漂了）
 *   google/gemini-3.1-pro        $2.00 / $12.00   （旧文案 $2.50 / $10 ← 漂了）
 *   deepseek/deepseek-v4-flash   $0.30 / $1.20    （旧文案 $0.14 / $0.28 ← 漂了）
 */
const BENCHMARK_ROW_PRICES = [
  '$1.25 / $10.00',
  '$3.00 / $15.00',
  '$1.25 / $10.00',
  '$2.50 / $10.00',
  '$1.00 / $5.00',
  '$0.27 / $1.10',
  '$0.55 / $2.19',
  '$0.30 / $2.50',
];

const COMPARE_PRICING_CELLS = ['$2.00 / $10.00', '$1.25 / $10.00', '$2.00 / $12.00', '$0.30 / $1.20'];

/** P158 修掉后必须从产物里消失的过期串 */
const STALE_BENCHMARK_PRICES = ['$0.075 / $0.30', '$1.25 / $5.00'];
const STALE_COMPARE_CELLS = [
  '$3 / $15 per 1M',
  '$5 / $15 per 1M',
  '$2.50 / $10 per 1M',
  '$0.14 / $0.28 per 1M',
];
/** 旧文案里那些按旧价格算出来的倍数说法 */
const STALE_RATIO_CLAIMS = ['40x cheaper', '50x cheaper', '10-40x cheaper', '3-7x', '20x pricing differential'];
/**
 * guide 正文里被修掉的旧单价（en / zh 分开 —— zh 用全角括号和「入」）。
 * guide 行的括注是「模型名（单价）」形态，所以括号内的单价必须逐语言断言。
 */
const GUIDE_EXPECTATIONS: Record<string, { live: string[]; stale: string[] }> = {
  en: {
    live: [
      '($0.30 in)',
      '($0.15 in)',
      '($0.27 in)',
      '($1.00 in)',
      '($1.25 in)',
      '($3.00 in)',
      'costs $15.00/M vs $3.00/M input',
    ],
    stale: ['($0.075 in)', '($0.075/$0.30)', 'costs $3.00/M vs $0.30/M input'],
  },
  zh: {
    live: [
      '（$0.30 入）',
      '（$0.15 入）',
      '（$0.27 入）',
      '（$1.00 入）',
      '（$1.25 入）',
      '（$3.00 入）',
      '每百万 $15.00，输入仅 $3.00',
    ],
    stale: ['（$0.075 入）', '（$0.075/$0.30）', '每百万 $3.00，输入仅 $0.30'],
  },
};

const BENCHMARK_PAGES = [
  '/en/ai-cost-tools/llm-api-cost-optimization-benchmark',
  '/zh/ai-cost-tools/llm-api-cost-optimization-benchmark',
];
const COMPARE_PAGES = [
  '/en/ai-cost-tools/llm-provider-comparison-compare',
  '/zh/ai-cost-tools/llm-provider-comparison-compare',
];
const GUIDE_PAGES = [
  '/en/ai-cost-tools/llm-api-cost-optimization-guide',
  '/zh/ai-cost-tools/llm-api-cost-optimization-guide',
];

function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'en', 'ai-cost-tools', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p158] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

function readPage(path: string): string {
  for (const rel of [`dist${path}/index.html`, `dist${path}.html`]) {
    const abs = resolve(root, rel);
    if (existsSync(abs)) return readFileSync(abs, 'utf-8');
  }
  assert.fail(`page not found in dist/: ${path}`);
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 递归列出 dist 下的所有 html */
function htmlFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) htmlFiles(full, acc);
    else if (entry.endsWith('.html')) acc.push(full);
  }
  return acc;
}

// ---------------------------------------------------------------------------
// 1. 全站没有未解析的 token
// ---------------------------------------------------------------------------

test('P158: no page in dist/ prints an unresolved live token', () => {
  ensureBuilt();
  const offenders: string[] = [];
  for (const file of htmlFiles(resolve(root, 'dist'))) {
    const html = readFileSync(file, 'utf-8');
    const hits = html.match(/\{\{live[^}]*\}\}/g);
    if (hits) offenders.push(`${file.replace(root, '.')}: ${hits.slice(0, 3).join(', ')}`);
  }
  assert.deepEqual(
    offenders,
    [],
    'these pages still print raw {{live*}} tokens — a template is missing the resolver, ' +
      'or the token kind is not implemented',
  );
});

// ---------------------------------------------------------------------------
// 2. 基准页：渲染值 == 数据集实时值
// ---------------------------------------------------------------------------

test('P158: the LLM benchmark page publishes the live dataset prices', () => {
  ensureBuilt();
  for (const page of BENCHMARK_PAGES) {
    const text = stripTags(readPage(page));
    for (const price of BENCHMARK_ROW_PRICES) {
      assert.ok(
        text.includes(price),
        `${page} must publish the live price "${price}" (from src/data/ai-pricing.json, lastUpdated ${(PRICING as any).lastUpdated})`,
      );
    }
  }
});

test('P158: the drifted LLM benchmark prices are gone from the product', () => {
  ensureBuilt();
  for (const page of BENCHMARK_PAGES) {
    const text = stripTags(readPage(page));
    for (const stale of STALE_BENCHMARK_PRICES) {
      assert.ok(
        !text.includes(stale),
        `${page} still shows the stale price "${stale}" — the benchmark rows must be rendered from the live dataset`,
      );
    }
    for (const claim of STALE_RATIO_CLAIMS) {
      assert.ok(
        !text.includes(claim),
        `${page} still claims "${claim}" — that multiple was computed from the stale prices and must be derived too`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// 3. 对比页：4 个定价格 == 数据集实时值
// ---------------------------------------------------------------------------

test('P158: the comparison page publishes the live dataset prices', () => {
  ensureBuilt();
  for (const page of COMPARE_PAGES) {
    const text = stripTags(readPage(page));
    for (const price of COMPARE_PRICING_CELLS) {
      assert.ok(text.includes(price), `${page} must publish the live price "${price}"`);
    }
  }
});

test('P158: the drifted comparison pricing cells are gone from the product', () => {
  ensureBuilt();
  for (const page of COMPARE_PAGES) {
    const text = stripTags(readPage(page));
    for (const stale of STALE_COMPARE_CELLS) {
      assert.ok(
        !text.includes(stale),
        `${page} still shows the stale pricing cell "${stale}" — all four cells were wrong before P158`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// 4. guide 页：正文单价 == 数据集实时值
// ---------------------------------------------------------------------------

test('P158: the LLM guide page publishes the live dataset prices', () => {
  ensureBuilt();
  for (const page of GUIDE_PAGES) {
    const lang = page.startsWith('/en/') ? 'en' : 'zh';
    const text = stripTags(readPage(page));
    for (const price of GUIDE_EXPECTATIONS[lang].live) {
      assert.ok(text.includes(price), `${page} must publish the live price "${price}"`);
    }
  }
});

test('P158: the drifted guide prices are gone from the product', () => {
  ensureBuilt();
  for (const page of GUIDE_PAGES) {
    const lang = page.startsWith('/en/') ? 'en' : 'zh';
    const text = stripTags(readPage(page));
    for (const stale of GUIDE_EXPECTATIONS[lang].stale) {
      assert.ok(
        !text.includes(stale),
        `${page} still shows the stale price "${stale}" — the guide body must be rendered from the live dataset`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// 5. 数据集日期必须出现在基准页的 source 行里
// ---------------------------------------------------------------------------

test('P158: the benchmark page states the live dataset date', () => {
  ensureBuilt();
  const date = String((PRICING as any).lastUpdated);
  for (const page of BENCHMARK_PAGES) {
    const text = stripTags(readPage(page));
    assert.ok(
      text.includes(date),
      `${page} must state the live dataset date "${date}" so a reader can tell how fresh the table is`,
    );
  }
});
