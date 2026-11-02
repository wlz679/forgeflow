#!/usr/bin/env node
// P163 — 价格主张覆盖面台账守卫（source-only）。
//
// 为什么需要这个守卫
// ------------------
// P161（GPU 主题页 + 工具页 prose）和 P162（GPU 引擎 FAQ）都是「撞见一个修一个」。
// 两次返工的共同根因是：**发现机制缺失** —— 没有一张表回答「哪些入口在讲价格、
// 各自由谁看着」。GPU 引擎 FAQ 在 P162 之前长期没有任何价格守卫，就是这张表
// 缺失的直接后果。
//
// 本守卫把台账变成可执行契约：
//   1. 台账自身合法（id 唯一 / file 存在 / guardedBy 非空）
//   2. 正向：台账里的每个入口都**真的存在**且内容非空
//   3. 反向：扫描全仓找出的每个价格入口**必须**在台账里 ⇒ 漏登记就红
//   4. 每个 guardedBy 指向的守卫文件**真的存在**
//
// ⚠️ 期望值全部是本文件里**独立写死**的字面量。
// Build dependency: none (source-only).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { PRICE_CLAIM_SURFACES } from '../src/data/price-claim-surface-ledger.ts';

const root = resolve(import.meta.dirname, '..');

/** 独立写死的合法 layer 取值 */
const LAYERS = new Set([
  'topic-page',
  'engine-faq',
  'engine-prose',
  'engine-customfn',
  'engine-static-example',
]);

/**
 * 独立写死的**期望入口清单**（26 个）。
 *
 * 为什么不能只靠「反向全仓扫文件」：那张表是**文件级**的 —— 同一个文件登记了
 * 3 条（faq / prose / customFn），删掉其中 1 条，另外 2 条还在 ⇒ 文件级扫描
 * 照样通过 ⇒ **漏登记一条入口不会被发现**。
 * （P163 变异台子 L1 就是靠这条洞存活的 ⇒ 这里补上入口级的双向校验。）
 *
 * 这份清单是台账的**独立判据**：台账里少一条、多一条，都必须红。
 * 新增一个「讲价格」的入口时，本表与台账**一起**改。
 */
const EXPECTED_SURFACE_IDS = [
  // 主题页（editorial content）
  'topic-compare:llm-provider-comparison',
  'topic-guide:llm-api-cost-optimization',
  'topic-benchmark:llm-api-cost-optimization',
  'topic-page-template:compare',
  // 引擎 FAQ（8 个 AI 引擎）
  'engine-faq:comparison',
  'engine-faq:claude',
  'engine-faq:gemini',
  'engine-faq:deepseek',
  'engine-faq:openai',
  'engine-faq:gpu',
  'engine-faq:image',
  'engine-faq:training',
  // 引擎 prose
  'engine-prose:gemini',
  'engine-prose:image',
  'engine-prose:training',
  // 引擎 customFn
  'engine-customfn:gemini',
  'engine-customfn:image',
  'engine-customfn:training',
  // 引擎 staticExamples
  'engine-static-example:image',
  'engine-static-example:training',
  'engine-static-example:gpu',
  'engine-static-example:openai',
  'engine-static-example:claude',
  'engine-static-example:gemini',
  'engine-static-example:deepseek',
  'engine-static-example:comparison',
];

test('台账必须登记这 26 个入口，一个都不能少（入口级漏登记检查）', () => {
  const registered = new Set(PRICE_CLAIM_SURFACES.map((s) => s.id));
  const missing = EXPECTED_SURFACE_IDS.filter((id) => !registered.has(id));
  assert.deepEqual(
    missing,
    [],
    `台账漏登记了 ${missing.length} 个入口：\n` +
      missing.join('\n') +
      '\n文件级的全仓扫描看不见这条 —— 同一个文件还有别的条目登记着。',
  );
});

test('台账里不许出现期望清单之外的条目（凭空多一条同样是错）', () => {
  const known = new Set(EXPECTED_SURFACE_IDS);
  const extra = PRICE_CLAIM_SURFACES.map((s) => s.id).filter((id) => !known.has(id));
  assert.deepEqual(
    extra,
    [],
    `台账多出了 ${extra.length} 个未登记在期望清单里的条目：\n` + extra.join('\n'),
  );
});

test('台账自身合法：id 唯一、layer 合法、file 与 guardedBy 存在', () => {
  const ids = new Set<string>();
  for (const s of PRICE_CLAIM_SURFACES) {
    assert.ok(!ids.has(s.id), `台账 id 重复: ${s.id}`);
    ids.add(s.id);
    assert.ok(LAYERS.has(s.layer), `${s.id}: layer 非法 "${s.layer}"`);
    assert.ok(s.file.length > 0, `${s.id}: file 为空`);
    assert.ok(existsSync(resolve(root, s.file)), `${s.id}: file 不存在 ${s.file}`);
    assert.ok(s.guardedBy.length > 0, `${s.id}: guardedBy 为空 —— 没有守卫看着的入口等于没登记`);
    for (const g of s.guardedBy) {
      assert.ok(existsSync(resolve(root, g)), `${s.id}: 守卫文件不存在 ${g}`);
    }
  }
});

test('正向：台账里的每个入口都能在文件里找到锚点且内容非空', () => {
  for (const s of PRICE_CLAIM_SURFACES) {
    const src = readFileSync(resolve(root, s.file), 'utf-8');
    assert.ok(src.includes(s.locator), `${s.id}: 锚点 "${s.locator}" 不在 ${s.file} 里`);
    assert.ok(src.trim().length > 0, `${s.id}: ${s.file} 内容为空`);
  }
});

test('反向：全仓扫出的价格入口必须都在台账里登记', () => {
  // 独立写死：已知的价格入口文件清单
  const scanned = new Set<string>();
  const priceFiles = [
    'src/engines/ai-cost/openai-token-calculator.ts',
    'src/engines/ai-cost/claude-api-cost-calculator.ts',
    'src/engines/ai-cost/gemini-api-cost-calculator.ts',
    'src/engines/ai-cost/deepseek-api-cost-calculator.ts',
    'src/engines/ai-cost/ai-api-cost-comparison.ts',
    'src/engines/ai-cost/gpu-cloud-cost-calculator.ts',
    'src/engines/ai-cost/ai-image-generation-cost-calculator.ts',
    'src/engines/ai-cost/ai-training-cost-estimator.ts',
    'src/data/topic-content.ts',
    'src/pages/[lang]/[letter]/[topic]-compare.astro',
  ];
  for (const f of priceFiles) {
    const src = readFileSync(resolve(root, f), 'utf-8');
    // 含 $数字 或含 live token ⇒ 就是一个「讲价格」的入口文件
    if (/\$\s?\d/.test(src) || /\{\{live/.test(src)) scanned.add(f);
  }
  const registered = new Set(PRICE_CLAIM_SURFACES.map((s) => s.file));
  for (const f of scanned) {
    assert.ok(registered.has(f), `价格入口未登记到台账: ${f}`);
  }
});

test('台账覆盖了全部 8 个 AI 引擎（漏一个引擎 = 一整类入口失守）', () => {
  // 独立写死：8 个 AI 引擎文件
  const engineFiles = [
    'src/engines/ai-cost/openai-token-calculator.ts',
    'src/engines/ai-cost/claude-api-cost-calculator.ts',
    'src/engines/ai-cost/gemini-api-cost-calculator.ts',
    'src/engines/ai-cost/deepseek-api-cost-calculator.ts',
    'src/engines/ai-cost/ai-api-cost-comparison.ts',
    'src/engines/ai-cost/gpu-cloud-cost-calculator.ts',
    'src/engines/ai-cost/ai-image-generation-cost-calculator.ts',
    'src/engines/ai-cost/ai-training-cost-estimator.ts',
  ];
  const registered = new Set(PRICE_CLAIM_SURFACES.map((s) => s.file));
  for (const f of engineFiles) {
    assert.ok(registered.has(f), `引擎未登记到台账: ${f}`);
  }
});

test('每个引擎都至少有一条 FAQ 层登记（FAQ 是最容易被漏的层）', () => {
  const engineFiles = [
    'src/engines/ai-cost/openai-token-calculator.ts',
    'src/engines/ai-cost/claude-api-cost-calculator.ts',
    'src/engines/ai-cost/gemini-api-cost-calculator.ts',
    'src/engines/ai-cost/deepseek-api-cost-calculator.ts',
    'src/engines/ai-cost/ai-api-cost-comparison.ts',
    'src/engines/ai-cost/gpu-cloud-cost-calculator.ts',
    'src/engines/ai-cost/ai-image-generation-cost-calculator.ts',
    'src/engines/ai-cost/ai-training-cost-estimator.ts',
  ];
  const faqLayer = new Set(
    PRICE_CLAIM_SURFACES.filter((s) => s.layer === 'engine-faq').map((s) => s.file),
  );
  for (const f of engineFiles) {
    assert.ok(faqLayer.has(f), `引擎的 FAQ 层未登记到台账: ${f}`);
  }
});
