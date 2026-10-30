#!/usr/bin/env node
// P162 — GPU 引擎 FAQ 的**产物**守卫（build-dep）。
//
// 为什么需要 build-dep 版本
// -----------------------
// source-only 守卫能证明「内容写对了」，但证明不了「**产物**里是对的」：
//
//   1. **模板没接解析器** —— 源码里的 token 写得再对，页面也会把
//      `{{liveGpuRange:H100}}` 原样印出去。
//   2. **只解析了一处** —— <FAQ> 组件解析了、JSON-LD 没解析 ⇒ 可见内容对，
//      但搜索引擎看到的还是带 token 的原文（SEO 通道漏了）。
//   3. **产物里还是旧价格** —— 源码改了，页面没重新构建 / 走了缓存。
//
// ⚠️ **作用域**：过期串必须查在 **FAQ 区块**里，不能查整页 ——
//    实测整页 HTML 里有 `<!-- P141-B2-T4: 步骤容器使用语义化 <ol> ... -->` 这类
//    **源码注释**，整页查 "T4" 会误报（它不是页面内容）。同理 "3-5x" 这类串
//    也可能出现在别的区块。
//
// ⚠️ 期望值是本文件里**独立写死**的字面量（不是从 live-price.ts 导出的常量）。
//    断言 2 是「产物 == 解析后的来源」的**一致性**检查（证明页面不是旧副本），
//    具体数值由断言 3 的字面量钉死 —— 两者合起来才既不与实现同源、又真能抓漂移。
//
// Build dependency: yes — 需要 `pnpm build` 的产物（RUN_BUILD_TESTS=1）。

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import '../src/engines/ai-cost/gpu-cloud-cost-calculator';
import { getEngine } from '../src/core/engines/registry';
import { resolveLiveTokens } from '../src/lib/live-price.ts';

const root = resolve(import.meta.dirname, '..');

if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

const GPU_SLUG = 'solopreneur-gpu-cloud-cost-calculator';
const FAQ_COUNT = 15;

function pagePath(lang: string): string {
  return resolve(root, 'dist', lang, GPU_SLUG, 'index.html');
}

function readPage(lang: string): string {
  const path = pagePath(lang);
  assert.ok(existsSync(path), `missing built page: ${path} — run the build first`);
  return readFileSync(path, 'utf-8');
}

function unescapeHtml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * 从产物页面里抽出 FAQ 问答对。
 *
 * ⚠️ 两个坑（都踩过）：
 *   1. **不能跨块匹配**：`<details\b[\s\S]*?</summary><p…>` 这种惰性正则会从
 *      页面顶部的「历史快照 / 最近浏览」折叠块一路跨到 FAQ 的 </summary>，
 *      把 History 当成 FAQ[0]。⇒ 必须**按 <details> 块切开**再在块内匹配。
 *   2. **summary 里第一个 span 可能是图标**：折叠块的 summary 是
 *      `<span aria-hidden="true">💾</span><span>History</span>` ⇒ 取 q 时要
 *      跳过 aria-hidden 的 span。
 *
 * 另外：页面里还有别的 <details>（历史快照 / 最近浏览），所以只取「summary
 * 后面跟着一个 <p>」的那些（FAQ 组件的形状）。
 */
function extractFaq(html: string): Array<{ q: string; a: string }> {
  const out: Array<{ q: string; a: string }> = [];
  for (const m of html.matchAll(/<details\b((?:(?!<\/details>)[\s\S])*?)<\/details>/g)) {
    const block = m[1]!;
    const afterSummary = /<\/summary>\s*<p[^>]*>([\s\S]*?)<\/p>/.exec(block);
    if (!afterSummary) continue;
    const q =
      /<summary[\s\S]*?<span(?![^>]*aria-hidden)[^>]*>([\s\S]*?)<\/span>/.exec(block)?.[1] ?? '';
    out.push({ q: unescapeHtml(q).trim(), a: unescapeHtml(afterSummary[1]!).trim() });
  }
  return out;
}

/** zh 页面的来源 = zh.json；en 页面的来源 = 引擎源（en 页面直接用 engine.faq） */
function expectedAnswers(lang: 'en' | 'zh'): Array<{ q: string; a: string }> {
  if (lang === 'en') {
    const engine = getEngine(GPU_SLUG);
    assert.ok(engine, `engine ${GPU_SLUG} must be registered`);
    return engine.faq.map((item) => ({
      q: resolveLiveTokens(item.q),
      a: resolveLiveTokens(item.a),
    }));
  }
  const locale = JSON.parse(
    readFileSync(resolve(root, 'src/i18n/locales/zh.json'), 'utf-8'),
  ) as Record<string, string>;
  return Array.from({ length: FAQ_COUNT }, (_, i) => ({
    q: resolveLiveTokens(locale[`tools.${GPU_SLUG}.faq.${i}.q`] ?? ''),
    a: resolveLiveTokens(locale[`tools.${GPU_SLUG}.faq.${i}.a`] ?? ''),
  }));
}

// ─────────────────────────────────────────────────────────────
// 1. 产物里没有未解析的 token（整页，含 JSON-LD）
// ─────────────────────────────────────────────────────────────
test('P162: GPU 工具页的产物里没有未解析的 {{liveGpu*}} token', () => {
  const violations: string[] = [];
  for (const lang of ['en', 'zh'] as const) {
    const html = readPage(lang);
    if (html.includes('{{liveGpu')) {
      violations.push(`${lang}: 页面里还有未解析的 {{liveGpu*}} token`);
    }
  }
  assert.deepEqual(
    violations,
    [],
    'FAQ 的 token 必须在渲染层被解析（<FAQ> 与 JSON-LD 两条通道都要）：\n' +
      violations.map((v) => `  - ${v}`).join('\n'),
  );
});

// ─────────────────────────────────────────────────────────────
// 2. 产物里的 FAQ == 解析后的来源（证明页面不是旧副本）
// ─────────────────────────────────────────────────────────────
test('P162: 产物里的 15 条 FAQ 等于解析后的来源答案', () => {
  const violations: string[] = [];
  for (const lang of ['en', 'zh'] as const) {
    const faq = extractFaq(readPage(lang));
    if (faq.length !== FAQ_COUNT) {
      violations.push(`${lang}: 抽出 ${faq.length} 条 FAQ（期望 ${FAQ_COUNT}）`);
      continue;
    }
    const expected = expectedAnswers(lang);
    for (let i = 0; i < FAQ_COUNT; i++) {
      if (faq[i]!.q !== expected[i]!.q) {
        violations.push(`${lang} FAQ[${i}].q 与来源不一致`);
      }
      if (faq[i]!.a !== expected[i]!.a) {
        violations.push(
          `${lang} FAQ[${i}].a 与来源不一致\n` +
            `      页面: ${faq[i]!.a.slice(0, 120)}\n` +
            `      来源: ${expected[i]!.a.slice(0, 120)}`,
        );
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    '产物里的 FAQ 必须等于「来源 + 解析后的 token」（页面不是旧副本）：\n' +
      violations.map((v) => `  - ${v}`).join('\n'),
  );
});

// ─────────────────────────────────────────────────────────────
// 3. 页面上发布的价格 == 独立写死的字面量
// ─────────────────────────────────────────────────────────────
/**
 * **逐条**钉死：第 i 条 FAQ 里必须出现的派生值。
 *
 * ⚠️ **必须逐条查，不能把整页 FAQ 文本拼起来查** ——
 *    build-dep 变异台子实测抓到过（B3 存活）：FAQ[0] 的 ratio 被写反成 0.2x，
 *    而 FAQ[8] 里**正确**的「5.1x Vast.ai」照样出现在整页文本里 ⇒ 整页查的
 *    「存在性」断言被另一条 FAQ 的正确值**当挡箭牌**挡掉了 ⇒ 变异存活。
 *    ⇒ 存在性断言要**落在它要守的那一条**上。
 *
 * 期望值是**独立写死的字面量**（照数据集手算）：
 *   Vast.ai / RunPod / Lambda Labs 跨型号区间 = $0.35-$2.20 / $0.39-$2.49 / $0.50-$2.80
 *   H100 / L40S / A100 / RTX 4090 跨供应商区间 = $1.69-$4.20 / $0.59-$1.20 / $0.69-$3.50 / $0.44-$0.80
 *   AWS / GCP / Azure ÷ Vast.ai（A100） = 5.07 → 5.1 / 4.06 → 4.1 / 4.35 → 4.3
 *   现货折扣带 = 30-60% · 预留折扣带 = 10-30%
 *   存储 = $0.10/GB · 出口 = $0.08/GB
 *   20×L40S 24/7 30 天 = 20 × 24 × 30 × $0.59 = $8,496.00
 *
 * ⚠️ 比率用**语言中立**的数字（'5.1'）而不是 '5.1x'：en 写「5.1x」、zh 写「5.1 倍」，
 *    同一个 token 两边都通顺 ⇒ 判据也必须两边都成立。
 */
const PINNED_BY_ENTRY: Array<{ index: number; needles: string[]; what: string }> = [
  { index: 0, needles: ['$0.35-$2.20', '$0.39-$2.49', '$0.50-$2.80', '5.1', '4.1', '4.3', '10-30%'], what: '三家 provider 的跨型号区间 + 与 Vast.ai 的 A100 倍数 + 预留带' },
  { index: 1, needles: ['30-60%', '10-30%'], what: '现货带 + 预留带' },
  { index: 2, needles: ['$1.69-$4.20'], what: 'H100 跨供应商区间' },
  { index: 3, needles: ['$0.10/GB', '$0.08/GB'], what: '存储单价 + 出口单价' },
  { index: 7, needles: ['$0.59-$1.20', '$0.69-$3.50', '$1.69-$4.20', '$0.44-$0.80'], what: '四个型号的跨供应商区间' },
  { index: 8, needles: ['$0.69-$3.50', '5.1', '30-60%'], what: 'A100 区间 + 倍数 + 现货带' },
  { index: 9, needles: ['10-30%', '30-60%'], what: '预留带 + 现货带' },
  { index: 10, needles: ['$0.59', '$8,496.00'], what: 'L40S 最低按需单价 + 20 卡月账单' },
  { index: 13, needles: ['$0.10/GB'], what: '存储单价' },
];

test('P162: GPU 工具页**逐条 FAQ** 发布的是派生后的价格（写死的字面量）', () => {
  const violations: string[] = [];
  for (const lang of ['en', 'zh'] as const) {
    const faq = extractFaq(readPage(lang));
    for (const { index, needles, what } of PINNED_BY_ENTRY) {
      const entry = faq[index];
      if (!entry) {
        violations.push(`${lang}: 抽不出 FAQ[${index}]`);
        continue;
      }
      const text = `${entry.q}\n${entry.a}`;
      for (const needle of needles) {
        if (!text.includes(needle)) {
          violations.push(`${lang} FAQ[${index}] 缺 "${needle}"（${what}）`);
        }
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    'GPU 工具页的每一条 FAQ 都必须发布该条自己的派生价格：\n' +
      violations.map((v) => `  - ${v}`).join('\n'),
  );
});

// ─────────────────────────────────────────────────────────────
// 4. P162 修掉的过期串在 FAQ 区块里已消失
// ─────────────────────────────────────────────────────────────
test('P162: P162 修掉的过期 GPU 串在产物 FAQ 里已消失', () => {
  // 这些是 P162 修掉的手写价格 / 型号 / 折扣带（来自旧 FAQ 原文）。
  // ⚠️ 只查 **FAQ 区块**（不查整页）—— 整页 HTML 里有源码注释（P141-B2-T4），
  //    整页查 "T4" 会误报。
  const stale: Array<{ needle: string; note: string }> = [
    { needle: '$32/hour', note: '旧 AWS p4d 实例价' },
    { needle: '$30/hour', note: '旧 GCP a2-ultragpu 实例价' },
    { needle: '$35/hour', note: '旧 Azure NDv5 实例价' },
    { needle: '$0.75/hour', note: '旧 A10G 单价' },
    { needle: '$10,800/month', note: '旧推理月账单' },
    { needle: '$30,000', note: '旧 H100 硬件价' },
    { needle: '$0.35-2.20/hr', note: '旧 Vast.ai 区间（少一个 $）' },
    { needle: '$0.39-2.49/hr', note: '旧 RunPod 区间' },
    { needle: '$0.50-2.80/hr', note: '旧 Lambda Labs 区间' },
    { needle: '40-60% cheaper', note: '旧现货折扣带' },
    { needle: '15-30% discount', note: '旧预留折扣带' },
    { needle: '60-70% off', note: '旧现货折扣带（另一处）' },
    { needle: '60-80% off', note: '旧现货折扣带（另一处）' },
    { needle: '30-50% cheaper', note: '旧「专业云便宜」带' },
    { needle: '3-5x', note: '旧「贵 3-5 倍」说法' },
  ];
  // 型号 / 供应商（数据集里没有的）—— 必须用词边界，否则 L4 会误伤 L40S
  const staleTerms: Array<{ re: RegExp; note: string }> = [
    { re: /\bA10G\b/, note: '数据集没有这个型号' },
    { re: /\bL4\b/, note: '数据集没有 L4（是 L40S）' },
    { re: /\bT4\b/, note: '数据集没有 T4' },
    { re: /\bA100 40GB\b/, note: '数据集只有 A100 80GB' },
    { re: /\bCoreWeave\b/, note: '数据集的 gpu.providers 没有它' },
  ];
  const violations: string[] = [];
  for (const lang of ['en', 'zh'] as const) {
    const text = extractFaq(readPage(lang))
      .map((f) => `${f.q}\n${f.a}`)
      .join('\n');
    for (const { needle, note } of stale) {
      if (text.includes(needle)) violations.push(`${lang}: 仍有 "${needle}"（${note}）`);
    }
    for (const { re, note } of staleTerms) {
      if (re.test(text)) violations.push(`${lang}: 仍有 ${re.source}（${note}）`);
    }
  }
  assert.deepEqual(
    violations,
    [],
    'P162 修掉的过期 GPU 串还在产物里发布着：\n' +
      violations.map((v) => `  - ${v}`).join('\n'),
  );
});
