#!/usr/bin/env node
// P163 — 价格主张覆盖面台账。
//
// 这张表回答一个问题：**站内哪些地方在讲价格，各自由谁看着。**
//
// 为什么要有它：P161/P162 两次返工的共同根因是「发现机制缺失」——
// 没有一张表回答「哪些入口在讲价格」，于是每次都要靠「撞见一个修一个」。
// GPU 引擎 FAQ 在 P162 之前长期不在任何价格守卫内，就是这张表缺失的直接后果。
//
// 契约（由 tests/price-claim-surface-ledger-guard.test.ts 双向校验）：
//   - 正向：台账里的每个入口都真的存在（锚点可定位、内容非空）
//   - 反向：全仓扫出的每个价格入口都必须登记 ⇒ 漏登记就红
//   - 每个入口至少有一个守卫看着它 ⇒ 没有守卫 = 没登记
//
// ⚠️ 新增一个「讲价格」的入口时，必须同时在本表加一行 —— 否则守卫会红。

export interface PriceClaimSurface {
  id: string;
  layer: 'topic-page' | 'engine-faq' | 'engine-prose' | 'engine-customfn' | 'engine-static-example';
  file: string;
  locator: string;
  guardedBy: string[];
  note: string;
}

export const PRICE_CLAIM_SURFACES: PriceClaimSurface[] = [
  // ── 主题页（editorial content）────────────────────────────────────────
  {
    id: 'topic-compare:llm-provider-comparison',
    layer: 'topic-page',
    file: 'src/data/topic-content.ts',
    locator: 'llm-provider-comparison',
    guardedBy: ['tests/topic-live-price-guard.test.ts', 'tests/topic-live-price-build-guard.test.ts'],
    note: 'LLM 供应商对比页；价格已由 P158 派生成 live token',
  },
  {
    id: 'topic-guide:llm-api-cost-optimization',
    layer: 'topic-page',
    file: 'src/data/topic-content.ts',
    locator: 'llm-api-cost-optimization',
    guardedBy: ['tests/topic-live-price-guard.test.ts', 'tests/topic-live-price-build-guard.test.ts'],
    note: 'LLM 成本优化指南页；价格已由 P158 派生成 live token',
  },
  {
    id: 'topic-benchmark:llm-api-cost-optimization',
    layer: 'topic-page',
    file: 'src/data/topic-content.ts',
    locator: 'llm-api-cost-optimization',
    guardedBy: ['tests/topic-live-price-guard.test.ts', 'tests/topic-live-price-build-guard.test.ts'],
    note: 'LLM 基准表页；价格已由 P158 派生成 live token',
  },
  {
    id: 'topic-page-template:compare',
    layer: 'topic-page',
    file: 'src/pages/[lang]/[letter]/[topic]-compare.astro',
    locator: 'resolveLiveTokensDeep',
    guardedBy: ['tests/topic-live-price-build-guard.test.ts'],
    note: '对比页模板层；P161 已把 GPU 基准行派生成 token',
  },

  // ── 引擎 FAQ（5 个 LLM 引擎，P160）─────────────────────────────────────
  {
    id: 'engine-faq:comparison',
    layer: 'engine-faq',
    file: 'src/engines/ai-cost/ai-api-cost-comparison.ts',
    locator: 'faq:',
    guardedBy: ['tests/engine-faq-live-price-guard.test.ts', 'tests/engine-faq-live-price-build-guard.test.ts'],
    note: 'P160：FAQ 里的模型单价已派生成 token',
  },
  {
    id: 'engine-faq:claude',
    layer: 'engine-faq',
    file: 'src/engines/ai-cost/claude-api-cost-calculator.ts',
    locator: 'faq:',
    guardedBy: ['tests/engine-faq-live-price-guard.test.ts', 'tests/engine-faq-live-price-build-guard.test.ts'],
    note: 'P160：FAQ 里的模型单价已派生成 token',
  },
  {
    id: 'engine-faq:gemini',
    layer: 'engine-faq',
    file: 'src/engines/ai-cost/gemini-api-cost-calculator.ts',
    locator: 'faq:',
    guardedBy: ['tests/engine-faq-live-price-guard.test.ts', 'tests/engine-faq-live-price-build-guard.test.ts'],
    note: 'P160：FAQ 里的模型单价已派生成 token',
  },
  {
    id: 'engine-faq:deepseek',
    layer: 'engine-faq',
    file: 'src/engines/ai-cost/deepseek-api-cost-calculator.ts',
    locator: 'faq:',
    guardedBy: ['tests/engine-faq-live-price-guard.test.ts', 'tests/engine-faq-live-price-build-guard.test.ts'],
    note: 'P160：FAQ 里的模型单价已派生成 token',
  },
  {
    id: 'engine-faq:openai',
    layer: 'engine-faq',
    file: 'src/engines/ai-cost/openai-token-calculator.ts',
    locator: 'faq:',
    guardedBy: ['tests/engine-faq-live-price-guard.test.ts', 'tests/engine-faq-live-price-build-guard.test.ts'],
    note: 'P160：FAQ 里的模型单价已派生成 token',
  },
  {
    id: 'engine-faq:gpu',
    layer: 'engine-faq',
    file: 'src/engines/ai-cost/gpu-cloud-cost-calculator.ts',
    locator: 'faq:',
    guardedBy: ['tests/gpu-engine-faq-live-price-guard.test.ts', 'tests/gpu-engine-faq-live-price-build-guard.test.ts'],
    note: 'P162：FAQ 里的 GPU 单价/折扣/倍数已派生成 token',
  },
  {
    id: 'engine-faq:image',
    layer: 'engine-faq',
    file: 'src/engines/ai-cost/ai-image-generation-cost-calculator.ts',
    locator: 'faq:',
    guardedBy: ['tests/image-training-faq-live-price-guard.test.ts'],
    note: 'P163：FAQ 里的图片单价/订阅档位已派生成 token',
  },
  {
    id: 'engine-faq:training',
    layer: 'engine-faq',
    file: 'src/engines/ai-cost/ai-training-cost-estimator.ts',
    locator: 'faq:',
    guardedBy: ['tests/image-training-faq-live-price-guard.test.ts'],
    note: 'P163：FAQ 里的 GPU 小时价/存储价已派生成 token',
  },

  // ── 引擎 prose（引擎自身 calculate() 产出的文案）────────────────────────
  {
    id: 'engine-prose:gemini',
    layer: 'engine-prose',
    file: 'src/engines/ai-cost/gemini-api-cost-calculator.ts',
    locator: 'cheapest frontier-quality model',
    guardedBy: ['tests/engine-faq-live-price-guard.test.ts'],
    note: 'P163：Gemini 3 Flash 的 $0.50/$3.00 改为派生（数据集实为 in=0.5 / out=3）',
  },
  {
    id: 'engine-prose:image',
    layer: 'engine-prose',
    file: 'src/engines/ai-cost/ai-image-generation-cost-calculator.ts',
    locator: 'Pricing:',
    guardedBy: ['tests/price-render-defect-guard.test.ts'],
    note: 'P163：prose 里的手写单价改为派生；$$ 双美元号在此修',
  },
  {
    id: 'engine-prose:training',
    layer: 'engine-prose',
    file: 'src/engines/ai-cost/ai-training-cost-estimator.ts',
    locator: 'GPU Compute:',
    guardedBy: ['tests/price-render-defect-guard.test.ts'],
    note: 'P163：Spot/Reserved 折扣带改为派生；$$ 双美元号在此修',
  },

  // ── 引擎 customFn（客户端交互态，与服务端 calculate() 平行的第二实现）────
  {
    id: 'engine-customfn:gemini',
    layer: 'engine-customfn',
    file: 'src/engines/ai-cost/gemini-api-cost-calculator.ts',
    locator: 'cheapest frontier-quality model',
    guardedBy: ['tests/engine-faq-live-price-guard.test.ts'],
    note: 'P163：customFn 里那份手写价改为派生（P162 §15.8 第 4 条）',
  },
  {
    id: 'engine-customfn:image',
    layer: 'engine-customfn',
    file: 'src/engines/ai-cost/ai-image-generation-cost-calculator.ts',
    locator: 'const customFn',
    guardedBy: ['tests/price-render-defect-guard.test.ts'],
    note: 'P163：customFn 里的手写单价与写死倍数改为派生',
  },
  {
    id: 'engine-customfn:training',
    layer: 'engine-customfn',
    file: 'src/engines/ai-cost/ai-training-cost-estimator.ts',
    locator: 'const customFn',
    guardedBy: ['tests/price-render-defect-guard.test.ts'],
    note: 'P163：customFn 里的 Spot/Reserved 折扣带改为派生',
  },

  // ── 引擎 staticExamples ──────────────────────────────────────────────
  {
    id: 'engine-static-example:image',
    layer: 'engine-static-example',
    file: 'src/engines/ai-cost/ai-image-generation-cost-calculator.ts',
    locator: 'staticExamples: [',
    guardedBy: ['tests/price-render-defect-guard.test.ts'],
    note: 'P163：第 2 个元素是手写且 codegen 不碰（锚点只覆盖第 1 项）⇒ 本批删除',
  },
  {
    id: 'engine-static-example:training',
    layer: 'engine-static-example',
    file: 'src/engines/ai-cost/ai-training-cost-estimator.ts',
    locator: 'staticExamples: [',
    guardedBy: ['tests/price-render-defect-guard.test.ts'],
    note: 'codegen 产物（第 1 项）；但含 $$ 双美元号，随 prose 一起修',
  },
  {
    id: 'engine-static-example:gpu',
    layer: 'engine-static-example',
    file: 'src/engines/ai-cost/gpu-cloud-cost-calculator.ts',
    locator: 'staticExamples: [',
    guardedBy: ['tests/gpu-live-price-guard.test.ts'],
    note: 'codegen 产物（第 1 项）',
  },
  {
    id: 'engine-static-example:openai',
    layer: 'engine-static-example',
    file: 'src/engines/ai-cost/openai-token-calculator.ts',
    locator: 'staticExamples: [',
    guardedBy: ['tests/engine-faq-live-price-guard.test.ts'],
    note: 'codegen 产物（第 1 项）',
  },
  {
    id: 'engine-static-example:claude',
    layer: 'engine-static-example',
    file: 'src/engines/ai-cost/claude-api-cost-calculator.ts',
    locator: 'staticExamples: [',
    guardedBy: ['tests/engine-faq-live-price-guard.test.ts'],
    note: 'codegen 产物（第 1 项）',
  },
  {
    id: 'engine-static-example:gemini',
    layer: 'engine-static-example',
    file: 'src/engines/ai-cost/gemini-api-cost-calculator.ts',
    locator: 'staticExamples: [',
    guardedBy: ['tests/engine-faq-live-price-guard.test.ts'],
    note: 'codegen 产物（第 1 项）',
  },
  {
    id: 'engine-static-example:deepseek',
    layer: 'engine-static-example',
    file: 'src/engines/ai-cost/deepseek-api-cost-calculator.ts',
    locator: 'staticExamples: [',
    guardedBy: ['tests/engine-faq-live-price-guard.test.ts'],
    note: 'codegen 产物（第 1 项）',
  },
  {
    id: 'engine-static-example:comparison',
    layer: 'engine-static-example',
    file: 'src/engines/ai-cost/ai-api-cost-comparison.ts',
    locator: 'staticExamples: [',
    guardedBy: ['tests/engine-faq-live-price-guard.test.ts'],
    note: 'codegen 产物（第 1 项）',
  },
];
