# P163 — 价格主张覆盖面台账 + 图片/训练引擎派生化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让「哪些入口在讲价格、各自由谁看着」变成 CI 可校验的数据，同时把图片/训练两个引擎的 FAQ + prose + customFn 派生化，并修掉取证中发现的三个真实缺陷（`$$` 双美元号、写死的 13x 倍数、训练档位带与数据集不符）。

**Architecture:** 三层并行推进 —— ① `src/data/price-claim-surface-ledger.ts` 台账（数据）+ `tests/price-claim-surface-ledger-guard.test.ts` 双向校验；② `src/lib/live-price.ts` 新增 `liveImage*` / `liveTraining*` 两个 token 家族，两个引擎的 FAQ/prose 走 token（沿用 P160 的 `translatedFaq` 渲染层解析，**不改模板**）；③ `tests/price-render-defect-guard.test.ts` 按失败模式查渲染产物（`$$` / 写死倍数 / 档位带）。最后加 `ai-pricing-popular.json` 的显式规则 + 守卫。

**Tech Stack:** TypeScript（strict）、Node.js `node:test`、Astro 5、pnpm、tsx（跑 TS 测试与引擎探针）。

## Global Constraints

- 宪法（`AGENTS.md`）：AI **不得**擅自修改 Roadmap / Phase；`src/engines/**` 属 calc 层 —— 本批已由用户于 2026-10-30 问卷**明确拍板授权**（FAQ + prose + customFn 三处全部可改）。
- 规格：`docs/superpowers/specs/2026-10-27-p155-adsense-low-value-content-and-pricing-bot-diagnosis.md` §16（唯一事实源；本计划的每个断言都要能对回 §16 的某一条）。
- **维度 3 scan**：§16.7 的信号 AA / AB / AC / AD 是本批的设计依据；任何偏离都要在规格里写明理由。
- 守卫规范：
  - 期望值必须是**独立写死的字面量**，不得从被测模块导出常量。
  - 每个断言**只守一件事**；断言按**失败模式**枚举，不是按「对象」枚举。
  - 台账类守卫必须**双向**校验（正向存在性 + 反向无遗漏）。
  - 白名单每条必须写明「**数据集为什么不拥有它**」，写不出来就说明该派生。
  - 白名单锚点要锚在**完整措辞**上，不锚裸数字。
- 变异台子纪律：启动时**先还原**再捕获 ORIGINAL；锚点必须唯一（`split(from).length - 1 === 1`）；收尾**无条件还原** + sha256 逐字节校验；**无效变异（no-op）必须剔除**，否则会被误读成「守卫没抓到」。
- 提交信息：`type(scope): 中文标题` + 含实测数字的正文；**绝不能含** `[CI Skip]` / `[Skip CI]` / `[CF-Pages-Skip]`；用 `git commit -F <utf8file>`。
- PowerShell 5.1：`node -e` 里含 `$` 的字符串会被当变量展开 ⇒ 校验脚本一律写成 `.ts` 文件再执行；`Select-String -Path` 把 `[lang]` 当通配符 ⇒ 对含 `[]` 的路径用 `-LiteralPath`。
- `bash` 工具：**不要 `cd <dir>` 后再写文件**（会被安全策略拦）⇒ 用绝对路径或脚本文件。
- 手工跑多个测试文件必须带 `--test-concurrency=1`。
- 中文/英文量法**必须分开**（CJK 感知计数）。
- `tmp/` 已 gitignore；用户的 `bing-block-urls.csv` **不得提交**。

---

### Task 1: 价格主张覆盖面台账（数据 + 守卫）

**Files:**
- Create: `src/data/price-claim-surface-ledger.ts`
- Create: `tests/price-claim-surface-ledger-guard.test.ts`
- Modify: `tests/run.mjs`（注册新套件）

**Interfaces:**
- Consumes: 无（首个任务）。
- Produces:
  ```ts
  // src/data/price-claim-surface-ledger.ts
  export interface PriceClaimSurface {
    id: string;                 // 稳定标识，如 'engine-faq:gpu'
    layer: 'topic-page' | 'engine-faq' | 'engine-prose' | 'engine-customfn' | 'engine-static-example';
    file: string;              // 相对仓库根的路径
    /** 定位该入口的锚点：引擎 slug / 主题 id / 数组下标 */
    locator: string;
    /** 负责看着这个入口的守卫文件（相对仓库根） */
    guardedBy: string[];
    /** 该入口讲价格的部分里，哪些是派生 token、哪些是手写 */
    note: string;
  }
  export const PRICE_CLAIM_SURFACES: PriceClaimSurface[];
  ```
  守卫 import：`import { PRICE_CLAIM_SURFACES } from '../src/data/price-claim-surface-ledger.ts';`

- [x] **Step 1: 写失败的守卫测试**

创建 `tests/price-claim-surface-ledger-guard.test.ts`：

```ts
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
import { resolve, join } from 'node:path';

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
  // 独立写死：已知的价格入口清单（引擎文件名 + 主题页文件）
  const scanned = new Set<string>();
  const engineFiles = [
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
  for (const f of engineFiles) {
    const src = readFileSync(resolve(root, f), 'utf-8');
    // 含 $数字 或含 live token ⇒ 就是一个「讲价格」的入口文件
    if (/\$\s?\d/.test(src) || /\{\{live/.test(src)) scanned.add(f);
  }
  const registered = new Set(PRICE_CLAIM_SURFACES.map((s) => s.file));
  for (const f of scanned) {
    assert.ok(registered.has(f), `价格入口未登记到台账: ${f}`);
  }
});
```

- [x] **Step 2: 跑测试确认失败**

Run: `node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests/price-claim-surface-ledger-guard.test.ts`
Expected: FAIL —— `Cannot find module '../src/data/price-claim-surface-ledger.ts'`

- [x] **Step 3: 建台账数据文件**

创建 `src/data/price-claim-surface-ledger.ts`。内容必须与本文件下方「台账初始内容」一致（**23 条**，覆盖：8 个 AI 引擎 × FAQ/prose/customFn 三层 + 主题页 + GPU staticExamples + 对比页）。

台账初始内容（逐条独立写死 `id` / `layer` / `file` / `locator` / `guardedBy` / `note`）：

```ts
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
    id: 'topic-page:gpu-compare',
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
    note: 'P163：customFn 里的 40% off 折扣带改为派生',
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
```

- [x] **Step 4: 跑测试确认通过**

Run: `node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests/price-claim-surface-ledger-guard.test.ts`
Expected: PASS（3 个 test 全绿）

- [x] **Step 5: 在 `tests/run.mjs` 注册新套件**

`tests/run.mjs` 里找到 source-only 套件的登记位置，加一行：

```js
    'tests/price-claim-surface-ledger-guard.test.ts',
```

Run: `node tests\run.mjs`（不带 `RUN_BUILD_TESTS`）
Expected: 套件总数 +1，无失败。

- [x] **Step 6: Commit**

```bash
git add src/data/price-claim-surface-ledger.ts tests/price-claim-surface-ledger-guard.test.ts tests/run.mjs
git commit -F tmp/commit-msg-p163-t1.txt
```

commit message 文件内容（**不含** `[CI Skip]`）：

```
feat(guard): P163 价格主张覆盖面台账 —— 让「谁在讲价格、谁在看着」可被 CI 校验

P161/P162 两次返工的共同根因是发现机制缺失：没有一张表回答「哪些入口
在讲价格、各自由谁看着」。GPU 引擎 FAQ 在 P162 之前长期不在任何价格守卫内，
就是这张表缺失的直接后果。

本任务交付台账数据 + 双向校验守卫：
- 正向：台账里的每个入口都真的存在（锚点可定位、内容非空）
- 反向：全仓扫出的每个价格入口都必须登记 ⇒ 漏登记就红
- 每个入口至少有一个守卫看着它 ⇒ 没有守卫 = 没登记

实测：台账 23 条入口，守卫 3 条断言全绿。
```

---

### Task 2: 修 `$$` 双美元号（渲染层 bug，用户可见）

**Files:**
- Modify: `src/engines/ai-cost/ai-image-generation-cost-calculator.ts`（`fmt` 附近 + 10 处调用点 + customFn）
- Modify: `src/engines/ai-cost/ai-training-cost-estimator.ts`（1 处调用点 + customFn）
- Create: `tests/price-render-defect-guard.test.ts`

**Interfaces:**
- Consumes: Task 1 的台账（本任务不依赖 Task 1 的代码，但守卫要引用台账里的 `engine-prose:image` / `engine-prose:training` 两条）。
- Produces:
  - 图片引擎新增内部函数：`function fmtNum(n: number): string { return n.toFixed(2); }`（**不带 `$`**）
  - 训练引擎同样新增 `fmtNum`
  - 守卫：`tests/price-render-defect-guard.test.ts`

- [x] **Step 1: 写失败的守卫测试**

创建 `tests/price-render-defect-guard.test.ts`，本任务只写 D1 那一条断言（另两条在 Task 3 / Task 5 追加）：

```ts
#!/usr/bin/env node
// P163 — 价格渲染缺陷守卫（source-only）。
//
// 为什么需要这个守卫
// ------------------
// 规格 §16.7 信号 AB：**渲染层 bug 不会被任何价格守卫抓到**。
// 现有价格守卫（topic / engine-faq / gpu-*）查的是「有没有手写价」，
// 而 D1（$$ 双美元号）不是真相源漂移，是**代码 bug** ⇒ 它们对它完全失明。
//
// ⇒ 断言必须按**失败模式**枚举，而不是按「对象」枚举。
//
// 本文件每条断言只守一个失败模式：
//   D1 —— `$$` 双美元号（图片 10 处 + 训练 1 处）
//   D2 —— 写死的倍数（"13x cheaper"）
//   D3 —— 训练 Spot/Reserved 折扣带与数据集不符
//
// ⚠️ 期望值全部是本文件里**独立写死**的字面量。
// Build dependency: none (source-only).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const IMAGE_ENGINE = 'src/engines/ai-cost/ai-image-generation-cost-calculator.ts';
const TRAINING_ENGINE = 'src/engines/ai-cost/ai-training-cost-estimator.ts';

test('D1：引擎输出里不得出现 $$ 双美元号', () => {
  // 独立写死：两个引擎的源码
  for (const rel of [IMAGE_ENGINE, TRAINING_ENGINE]) {
    const src = readFileSync(resolve(root, rel), 'utf-8');
    // 只查「拼字符串」的行（out.push / o.push），排除注释
    const offenders = src
      .split('\n')
      .map((l, i) => [i + 1, l] as const)
      .filter(([, l]) => /out\.push|"o\.push/.test(l))
      .filter(([, l]) => /['"`][^'"`]*\$['"`]\s*\+\s*fmt/.test(l));
    assert.deepEqual(
      offenders.map(([n, l]) => `${rel}:${n}`),
      [],
      `${rel}: 发现 ${offenders.length} 处 '$ + fmt(...)' 形态 ⇒ fmt() 已带 $，再拼一个就是 $$`
    );
  }
});
```

- [x] **Step 2: 跑测试确认失败**

Run: `node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests/price-render-defect-guard.test.ts`
Expected: FAIL —— 报出图片引擎 10 处 + 训练引擎 1 处。

- [x] **Step 3: 修图片引擎**

在 `ai-image-generation-cost-calculator.ts` 的 `fmt` 定义（`:22`）之后加：

```ts
function fmtNum(n: number): string { return n.toFixed(2); } // 不带 $（fmt 已带，别再拼）
```

把 10 处 `'$' + fmt(...)` 改成 `'$' + fmtNum(...)`：

| 行 | 改前 | 改后 |
|---|---|---|
| 252 | `'• Cut volume in half: Save $' + fmt(monthlyCost - halfCost) + '/mo ($' + fmt(monthlyCost) + ' → $' + fmt(halfCost) + ')'` | 三个 `fmt(` 全换 `fmtNum(` |
| 259 | `'• Switch to SD 4 API ($0.003/img): $' + fmt(sd4Cost) + '/mo  (saves $' + fmt(sd4Savings) + '/mo)'` | 两个 `fmt(` 全换 `fmtNum(` |
| 261 | `'• Switch to SD 4 API: $' + fmt(sd4Cost) + '/mo  (already cheaper)'` | 一个 |
| 269 | `'• Switch to ' + subAlt.name + ' ($' + subBasic + '/mo): saves $' + fmt(monthlyCost - subBasic) + '/mo'` | 一个 |
| 271 | `'• Switch to ' + subAlt.name + ' ($' + subBasic + '/mo): +$' + fmt(subBasic - monthlyCost) + '/mo vs pay-per-image'` | 一个 |
| 278 | `'• Drop subscription, go per-image (' + cheapestApi.name + '): $' + fmt(altCost) + '/mo  (vs $' + bestTier + '/mo)'` | 一个 |
| 284 | `'• Double volume to ' + lc(imgs * 2) + ' imgs/mo: $' + fmt(imgs * 2 * perImageCost) + '/mo'` | 一个 |
| 300 | `'   Switch to Ideogram 3 ($0.04/img) to save $' + fmt(monthlyCost - altCost) + '/mo with similar quality.'` | 一个 |
| 303 | `'   At <100 imgs/mo, SD 4 API is 13x cheaper ($' + fmt(altCost) + ' vs $' + fmt(monthlyCost) + '/mo).'` | 两个（D2 在 Task 3 一并改文案） |
| 306 | `'   Subscription is underutilized. Per-image (Ideogram 3) would be ~$' + fmt(altCost) + '/mo.'` | 一个 |

**customFn 侧**（同文件 `:424-452`）：customFn 里的 `fm` 同样带 `$`。加一个不带 `$` 的 `fn`，并把对应的 `fm(` 换成 `fn(`：

```ts
// customFn 数据表附近新增（minified 风格，与既有 fm 并列）
"function fn(n){return n.toFixed(2);}" +
```

需要改的 customFn 行：`:425`（两个 `fm`）、`:427`（两个）、`:428`（一个）、`:433`（一个）、`:434`（一个）、`:437`（一个）、`:440`（一个）、`:451`（两个）。**`:410` / `:386` 那些是「不带 $ 的整块文案」，不要动。**

- [x] **Step 4: 修训练引擎**

`ai-training-cost-estimator.ts:84`：

```ts
// 改前
out.push('Data Processing:' + pad(' $' + fmt(dataProcessCost), 45) + fmt(dataProcessCost));
// 改后（fmt 已带 $，pad 里那个 ' $' 是多余的）
out.push('Data Processing:' + pad(' ' + fmt(dataProcessCost), 45) + fmt(dataProcessCost));
```

customFn 侧 `:235`：

```ts
// 改前
"o.push('Data Processing:'+pd2(' $'+fm2(dpc),45)+fm2(dpc));" +
// 改后
"o.push('Data Processing:'+pd2(' '+fm2(dpc),45)+fm2(dpc));" +
```

- [x] **Step 5: 重新生成 staticExamples（codegen）**

Run: `node scripts\codegen-examples.mjs`
Expected: `✓ ai-image-generation-cost-calculator.ts` / `✓ ai-training-cost-estimator.ts`，工作区有 diff（`$$` 消失）。

Run: `node scripts\codegen-examples.mjs --check`
Expected: PASSED。

- [x] **Step 6: 跑测试确认通过**

Run: `node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests/price-render-defect-guard.test.ts`
Expected: PASS（D1 绿）。

- [x] **Step 7: 目视验产物**

Run: `node node_modules\tsx\dist\cli.mjs tmp\p163-probe-defects.ts`
Expected: 第 2 节所有 provider 的 `$$x` 计数**全为 0**；第 5 节训练输出无 `$$1000.00`。

- [x] **Step 8: 在 `tests/run.mjs` 注册新套件**

加一行：

```js
    'tests/price-render-defect-guard.test.ts',
```

- [x] **Step 9: Commit**

```bash
git add src/engines/ai-cost/ai-image-generation-cost-calculator.ts src/engines/ai-cost/ai-training-cost-estimator.ts tests/price-render-defect-guard.test.ts tests/run.mjs
git commit -F tmp/commit-msg-p163-t2.txt
```

commit message 文件内容：

```
fix(engines): P163 修 $$ 双美元号 —— fmt() 已带 $，调用处又拼了一个

实测（2026-10-30）：图片引擎 10 处 + 训练引擎 1 处。dalle-3 / 100 张的
输出含 8 处 $$（save $$4.00/mo、($$8.00 → $$4.00)），训练引擎默认示例
出现 Data Processing: $$1000.00 ⇒ 页面直接给用户看双美元号。

根因：fmt(n) 返回 '$' + n.toFixed(2)，调用处写成 '$' + fmt(...) ⇒ $$。
修法：新增 fmtNum(n)（不带 $）与 customFn 侧的 fn(n)，只改「要 $ 的地方」
显式拼 '$'；不改 fmt 本身（它被 30+ 处表格/对齐逻辑使用）。

新增守卫 tests/price-render-defect-guard.test.ts（D1）。
```

---

### Task 3: 修写死的「13x cheaper」倍数

**Files:**
- Modify: `src/engines/ai-cost/ai-image-generation-cost-calculator.ts`（prose `:303` + customFn `:451` + 删除 `staticExamples[1]`）
- Modify: `tests/price-render-defect-guard.test.ts`（追加 D2 断言）

**Interfaces:**
- Consumes: Task 2 的 `fmtNum`。
- Produces: 守卫追加第 2 条断言（D2）。

- [x] **Step 1: 追加失败的守卫断言**

在 `tests/price-render-defect-guard.test.ts` 末尾追加：

```ts
test('D2：倍数不得是写死的字面量，必须由当前单价算出', () => {
  const src = readFileSync(resolve(root, IMAGE_ENGINE), 'utf-8');
  // 「13x」这类写死倍数：数字 + x + cheaper
  const offenders = src
    .split('\n')
    .map((l, i) => [i + 1, l] as const)
    .filter(([, l]) => /\d+(?:\.\d+)?x\s+cheaper/.test(l));
  assert.deepEqual(
    offenders.map(([n]) => n),
    [],
    '图片引擎发现写死的 "Nx cheaper" ⇒ 倍数会随 provider 单价失真（实测 flux-pro $0.05/SD4 $0.003 = 16.7x，文案却说 13x）'
  );
});
```

- [x] **Step 2: 跑测试确认失败**

Run: `node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests/price-render-defect-guard.test.ts`
Expected: FAIL —— 报出 `:303`（prose）与 `:451`（customFn）两行。

- [x] **Step 3: 修 prose**

`ai-image-generation-cost-calculator.ts:301-303`。当前：

```ts
  } else if (p.perImage >= 0.04 && imgs < 100) {
    const altCost = imgs * 0.003;
    out.push('   At <100 imgs/mo, SD 4 API is 13x cheaper ($' + fmtNum(altCost) + ' vs $' + fmtNum(monthlyCost) + '/mo).');
  }
```

改为（倍数由 `p.perImage / 0.003` 算出）：

```ts
  } else if (p.perImage >= 0.04 && imgs < 100) {
    const altCost = imgs * 0.003;
    const sd4Ratio = Math.round(p.perImage / 0.003);
    out.push('   At <100 imgs/mo, SD 4 API is ' + sd4Ratio + 'x cheaper ($' + fmtNum(altCost) + ' vs $' + fmtNum(monthlyCost) + '/mo).');
  }
```

> ⚠️ `0.003` 是 SD 4 的数据集单价（`image.providers['stable-diffusion-4'].perImage`）。Task 4 派生化时把这两处 `0.003` 也换成 token 派生值。

- [x] **Step 4: 修 customFn**

`:451` 当前：

```ts
  "else if(p.pi>=0.04&&im<100){var ac3=im*0.003;o.push('   At <100 imgs/mo, SD 4 API is 13x cheaper ($'+fm(ac3)+' vs $'+fm(mc)+'/mo).');}" +
```

改为（`fm` 在 Task 2 已换成 `fn`；倍数由 `p.pi` 算出）：

```ts
  "else if(p.pi>=0.04&&im<100){var ac3=im*0.003;o.push('   At <100 imgs/mo, SD 4 API is '+Math.round(p.pi/0.003)+'x cheaper ($'+fn(ac3)+' vs $'+fn(mc)+'/mo).');}" +
```

- [x] **Step 5: 删掉 `staticExamples[1]`**

`ai-image-generation-cost-calculator.ts:491` 是 `staticExamples` 数组的**第 2 个元素**（手写、codegen 不碰、`--check` 不校验、页面也不渲染 —— `[slug].astro:1349` 在 `clientConfig.type === 'custom'` 时只渲染 `staticExamples[0]`）。

⇒ 删掉它，把数组从：

```ts
  staticExamples: [
    '\n🎨 DALL-E 3 Cost Estimate\n\n...13x cheaper...',
    '🔄 What-If Scenarios:\n...13x cheaper...',
  ],
```

改成：

```ts
  staticExamples: [
    '\n🎨 DALL-E 3 Cost Estimate\n\n...',
  ],
```

> ⚠️ 删之前先确认第 1 个元素末尾就是完整的 `calculate()` 输出（codegen 负责重生成，第 1 项由 `codegen-examples.mjs` 覆盖）。

- [x] **Step 6: 重新生成 staticExamples**

Run: `node scripts\codegen-examples.mjs`
Run: `node scripts\codegen-examples.mjs --check`
Expected: 两次都过；工作区 diff 里不再有 `13x`。

- [x] **Step 7: 跑测试确认通过**

Run: `node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests/price-render-defect-guard.test.ts`
Expected: PASS（D1 + D2 绿）。

- [x] **Step 8: 验倍数正确性**

Run: `node node_modules\tsx\dist\cli.mjs tmp\p163-probe-defects.ts`
Expected: 第 3 节 `ideogram-3` 显示 13x、`flux-pro` 显示 **17x**（`0.05/0.003 = 16.67 → round = 17`）。

- [x] **Step 9: Commit**

```bash
git add src/engines/ai-cost/ai-image-generation-cost-calculator.ts tests/price-render-defect-guard.test.ts
git commit -F tmp/commit-msg-p163-t3.txt
```

commit message 文件内容：

```
fix(engines): P163 写死的 "13x cheaper" 改为由单价算出，并删掉 codegen 管不到的 staticExamples[1]

实测（2026-10-30）：13x 在 Ideogram 3（$0.04）上恰好正确（0.04/0.003=13.3），
但分支条件是 perImage >= 0.04 ⇒ flux-pro（$0.05）走同一分支，真实倍数是 16.7x，
文案却说 13x ⇒ 对所有非 $0.04 的 provider 都错。

修法：倍数改为 Math.round(p.perImage / 0.003) 实时计算（customFn 同步）。

另：staticExamples 的第 2 个元素是手写、codegen-examples.mjs 的锚点只覆盖
第 1 项、--check 也不校验它 ⇒ 一块没有任何守卫的死区（这正是 P162 §15.2
那条更正只对第 1 项成立的盲区）。页面在 custom 模式下只渲染 staticExamples[0]
⇒ 第 2 项既不上页面又是唯一的手写漂移源 ⇒ 本批删除。

新增守卫 D2。
```

---

### Task 4: `live-price.ts` 新增 image / training token + 两个引擎 FAQ 派生化

**Files:**
- Modify: `src/lib/live-price.ts`（`TOKEN_KINDS` / `GPU_TOKEN_KINDS` 附近 + 新增 resolver）
- Modify: `src/engines/ai-cost/ai-image-generation-cost-calculator.ts`（FAQ 15 条 + prose）
- Modify: `src/engines/ai-cost/ai-training-cost-estimator.ts`（FAQ 15 条 + prose）
- Modify: `src/i18n/locales/en.json`、`src/i18n/locales/zh.json`（两引擎的 faq.* + 训练 FAQ 缺的 q/a）
- Create: `tests/image-training-faq-live-price-guard.test.ts`

**Interfaces:**
- Consumes: Task 1 台账；Task 2/3 的 `fmtNum`。
- Produces:
  ```ts
  // src/lib/live-price.ts 新增（加入 TOKEN_KINDS）
  export type ImageTokenKind =
    | 'liveImagePerImage'      // {{liveImagePerImage:<provider>}}  → "0.080"
    | 'liveImageSubRange'      // {{liveImageSubRange:<provider>}}  → "$10-$120/mo"
    | 'liveImageSubTier'       // {{liveImageSubTier:<provider>:<tier>}} → "30"
    | 'liveImageAdvMult'       // {{liveImageAdvMult:<mode>}}      → "1.3"
    | 'liveTrainingGpuRate'    // {{liveTrainingGpuRate:<gpuKey>}}  → "3.50"
    | 'liveTrainingStorage'    // {{liveTrainingStorage}}           → "0.10"
    | 'liveTrainingDataProcess'; // {{liveTrainingDataProcess}}      → "1.5"
  ```

- [x] **Step 1: 写失败的守卫测试**

创建 `tests/image-training-faq-live-price-guard.test.ts`：

```ts
#!/usr/bin/env node
// P163 — 图片 / 训练引擎 FAQ 的价格单一真相源守卫（source-only）。
//
// 覆盖：src/engines/ai-cost/ai-image-generation-cost-calculator.ts
//       src/engines/ai-cost/ai-training-cost-estimator.ts
//
// 本守卫盯住六条性质（与 P160 同形，但断言对象不同）：
//   1. 手写单价归零（白名单逐条写「数据集为什么不拥有它」）
//   2. token 引用的 provider / gpuKey 必须在数据集里存在
//   3. 三处同步：引擎 .ts 的 FAQ、en.json、zh.json 逐条对齐
//   4. token 数量有下限（不靠删价格钻空子）
//   5. 名实一致：token 引用的 provider 名与同句提到的名字对得上
//   6. 白名单不腐烂：每条白名单必须仍在文本里出现
//
// ⚠️ 期望值全部是本文件里**独立写死**的字面量。
// Build dependency: none (source-only).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import PRICING from '../src/data/ai-pricing.json';
import { resolveLiveTokens } from '../src/lib/live-price.ts';

const root = resolve(import.meta.dirname, '..');

const ENGINES = [
  {
    slug: 'solopreneur-ai-image-cost-calculator',
    file: 'src/engines/ai-cost/ai-image-generation-cost-calculator.ts',
    providerKeys: ['dalle-4', 'dalle-3', 'midjourney-v7', 'stable-diffusion-4', 'ideogram-3', 'flux-pro', 'leonardo'],
  },
  {
    slug: 'solopreneur-ai-training-cost-estimator',
    file: 'src/engines/ai-cost/ai-training-cost-estimator.ts',
    providerKeys: ['H200-141GB', 'H100-80GB', 'A100-80GB', 'L40S-48GB', 'RTX-6000'],
  },
] as const;

/** 白名单：FAQ 里**保留手写**的金额 —— 每条写明「数据集为什么不拥有它」 */
const ALLOWED_RAW_PRICES: Array<{ slug: string; snippets: string[]; reason: string }> = [
  {
    slug: 'solopreneur-ai-image-cost-calculator',
    snippets: ['Together AI'],
    reason: '数据集的 image.providers 只有 7 家，没有 Together AI ⇒ 没有可派生的单价',
  },
  {
    slug: 'solopreneur-ai-image-cost-calculator',
    snippets: ['Stability AI'],
    reason: '数据集没有 Stability AI 直连这一档 ⇒ 没有可派生的单价',
  },
  {
    slug: 'solopreneur-ai-image-cost-calculator',
    snippets: ['FLUX schnell'],
    reason: '数据集只有 flux-pro，没有 schnell 这个变体的单价 ⇒ 没有可派生的单价',
  },
  {
    slug: 'solopreneur-ai-training-cost-estimator',
    snippets: ['per 1M training tokens'],
    reason: '数据集只有 GPU 小时价与存储/处理单价，没有「每 1M training token」这一计价维度',
  },
];

test('图片 / 训练两个引擎的 FAQ 里不出现手写单价（白名单除外）', () => {
  for (const e of ENGINES) {
    const src = readFileSync(resolve(root, e.file), 'utf-8');
    const faqStart = src.indexOf('faq: [');
    assert.ok(faqStart > 0, `${e.slug}: 找不到 faq: [`);
    const faqEnd = src.indexOf('howToUse:', faqStart);
    const faq = src.slice(faqStart, faqEnd);
    const priceRe = /\$\s?\d+(?:\.\d+)?/g;
    const hits = (faq.match(priceRe) || []).length;
    const allowedHits = ALLOWED_RAW_PRICES
      .filter((a) => a.slug === e.slug)
      .reduce((n, a) => n + a.snippets.filter((s) => faq.includes(s)).length, 0);
    assert.ok(
      hits === 0,
      `${e.slug}: FAQ 里还有 ${hits} 处手写单价（白名单允许 ${allowedHits} 处）⇒ 全部要派生成 token`
    );
  }
});

test('token 引用的 provider / gpuKey 在数据集里都存在', () => {
  const imageProv: any = (PRICING as any).image.providers;
  const trainGpu: any = (PRICING as any).training.gpuTypes;
  const re = /\{\{(liveImagePerImage|liveImageSubRange|liveTrainingGpuRate):([^{}]+)\}\}/g;
  for (const e of ENGINES) {
    const src = readFileSync(resolve(root, e.file), 'utf-8');
    const faq = src.slice(src.indexOf('faq: ['), src.indexOf('howToUse:'));
    for (const m of faq.matchAll(re)) {
      const kind = m[1]!;
      const key = m[2]!;
      if (kind === 'liveTrainingGpuRate') {
        assert.ok(trainGpu[key], `${e.slug}: gpuKey 不存在 ${key}`);
      } else {
        assert.ok(imageProv[key], `${e.slug}: provider 不存在 ${key}`);
      }
    }
  }
});

test('三处同步：引擎源 / en.json / zh.json 的 FAQ 条数与 token 形态一致', () => {
  const en = JSON.parse(readFileSync(resolve(root, 'src/i18n/locales/en.json'), 'utf-8'));
  const zh = JSON.parse(readFileSync(resolve(root, 'src/i18n/locales/zh.json'), 'utf-8'));
  for (const e of ENGINES) {
    const src = readFileSync(resolve(root, e.file), 'utf-8');
    const faqStart = src.indexOf('faq: [');
    const faqEnd = src.indexOf('howToUse:', faqStart);
    const faq = src.slice(faqStart, faqEnd);
    const count = (faq.match(/\{ q:/g) || []).length;
    for (let i = 0; i < count; i++) {
      const enA = en[`tools.${e.slug}.faq.${i}.a`];
      const zhA = zh[`tools.${e.slug}.faq.${i}.a`];
      assert.ok(typeof enA === 'string' && enA.length > 0, `${e.slug}.faq.${i}.a 在 en.json 缺失`);
      assert.ok(typeof zhA === 'string' && zhA.length > 0, `${e.slug}.faq.${i}.a 在 zh.json 缺失`);
      // 引擎源里有 token 的条目，i18n 两侧也必须有 token（否则 zh 页面会显示原始 token 或英文原文）
      const srcTok = (faq.split(`{ q:`)[i + 1] || '').match(/\{\{live[A-Za-z]+\}\}/g) || [];
      for (const t of srcTok) {
        assert.ok(enA.includes(t), `${e.slug}.faq.${i}.a 在 en.json 缺 token ${t}`);
        assert.ok(zhA.includes(t), `${e.slug}.faq.${i}.a 在 zh.json 缺 token ${t}`);
      }
    }
  }
});

test('token 数量有下限（不靠删价格钻空子）', () => {
  const expectations = [
    { file: 'src/engines/ai-cost/ai-image-generation-cost-calculator.ts', min: 12 },
    { file: 'src/engines/ai-cost/ai-training-cost-estimator.ts', min: 8 },
  ];
  for (const { file, min } of expectations) {
    const src = readFileSync(resolve(root, file), 'utf-8');
    const faq = src.slice(src.indexOf('faq: ['), src.indexOf('howToUse:'));
    const n = (faq.match(/\{\{live[A-Za-z]+\}\}/g) || []).length;
    assert.ok(n >= min, `${file}: FAQ 里只有 ${n} 个 token（下限 ${min}）⇒ 可能在靠删价格钻空子`);
  }
});

test('每种 token 都真的被实现了（不只是列在清单里）', () => {
  const cases: Array<[string, string]> = [
    ['{{liveImagePerImage:dalle-3}}', '0.08'],
    ['{{liveImageSubRange:midjourney-v7}}', '$10-$120/mo'],
    ['{{liveTrainingGpuRate:A100-80GB}}', '1.50'],
  ];
  for (const [token, expected] of cases) {
    assert.equal(resolveLiveTokens(token), expected, `token ${token} 解析结果不对`);
  }
});

test('白名单不腐烂：每条白名单必须仍在文本里出现', () => {
  for (const e of ENGINES) {
    const src = readFileSync(resolve(root, e.file), 'utf-8');
    const faq = src.slice(src.indexOf('faq: ['), src.indexOf('howToUse:'));
    for (const a of ALLOWED_RAW_PRICES.filter((x) => x.slug === e.slug)) {
      for (const s of a.snippets) {
        assert.ok(faq.includes(s), `${e.slug}: 白名单锚点 "${s}" 已不在文本里 ⇒ 白名单该删`);
      }
    }
  }
});
```

- [x] **Step 2: 跑测试确认失败**

Run: `node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests/image-training-faq-live-price-guard.test.ts`
Expected: FAIL（多处）。

- [x] **Step 3: 在 `live-price.ts` 实现 token**

在 `src/lib/live-price.ts`：

**(a)** 在 `TOKEN_KINDS` 集合里加 7 种：

```ts
  'liveImagePerImage',
  'liveImageSubRange',
  'liveImageSubTier',
  'liveImageAdvMult',
  'liveTrainingGpuRate',
  'liveTrainingStorage',
  'liveTrainingDataProcess',
```

**(b)** 新增 resolver（放在 `resolveGpuToken` 之后、`resolveLiveTokens` 之前）：

```ts
/**
 * P163：图片 / 训练两个引擎的价格 token。
 *
 * 与 GPU token 家族同样的约定：**返回值语言中立**（只给数字与单位，不带
 * "per month" / "张" 等文案），由调用点的文案自己补。
 */
function resolveImageTrainingToken(kind: string, payload: string): string | null {
  const imageProv = (PRICING as any).image?.providers ?? {};
  const trainGpu = (PRICING as any).training?.gpuTypes ?? {};
  const subTiers = (PRICING as any).image?.subTiers ?? {};
  const advMult = (PRICING as any).image?.advancedMult ?? {};

  if (kind === 'liveImagePerImage') {
    const p = imageProv[payload];
    if (!p || typeof p.perImage !== 'number') return null;
    return p.perImage.toFixed(3);
  }
  if (kind === 'liveImageSubRange') {
    const p = imageProv[payload];
    if (!p || typeof p.subRange !== 'string') return null;
    return p.subRange;
  }
  if (kind === 'liveImageSubTier') {
    const [provider, tierIdx] = payload.split(':');
    const tiers = subTiers[provider!];
    if (!tiers) return null;
    const v = tiers[Number(tierIdx)];
    if (typeof v !== 'number') return null;
    return String(v);
  }
  if (kind === 'liveImageAdvMult') {
    const v = advMult[payload];
    if (typeof v !== 'number') return null;
    return String(v);
  }
  if (kind === 'liveTrainingGpuRate') {
    const g = trainGpu[payload];
    if (!g || typeof g.hourlyRate !== 'number') return null;
    return g.hourlyRate.toFixed(2);
  }
  if (kind === 'liveTrainingStorage') {
    const v = (PRICING as any).gpu?.storagePerGB;
    if (typeof v !== 'number') return null;
    return v.toFixed(2);
  }
  if (kind === 'liveTrainingDataProcess') {
    const v = (PRICING as any).training?.dataProcessPerGB;
    if (typeof v !== 'number') return null;
    return v.toFixed(2);
  }
  return null;
}
```

**(c)** 在 `resolveLiveTokens` 的 token 分派处接入（找到 `liveGpu` 分支附近，加一段）：

```ts
  } else if (kind.startsWith('liveImage') || kind.startsWith('liveTraining')) {
    const value = resolveImageTrainingToken(kind, payload);
    if (value === null) return match; // 未解析 ⇒ 保留原样，由守卫发现
    return value;
  }
```

> ⚠️ 若 `resolveLiveTokens` 用的是统一的 `TOKEN_KINDS` 分派表，按既有结构插入即可 —— **先读 `resolveLiveTokens`（`:829`）的实现再改**，保持它既有的「未解析就原样返回」语义。

- [x] **Step 4: 图片引擎 FAQ 派生化**

改 `src/engines/ai-cost/ai-image-generation-cost-calculator.ts` 的 `faq` 数组（15 条）。逐条替换（`{{liveImagePerImage:<provider>}}` 返回 3 位小数如 `0.080`；`{{liveImageSubRange:<provider>}}` 返回 `$10-$120/mo`）：

| # | 原文片段 | 改为 |
|---|---|---|
| 0 | `Stable Diffusion 4 via API at $0.003/image` | `Stable Diffusion 4 via API at {{liveImagePerImage:stable-diffusion-4}}/image` |
| 0 | `Midjourney V7 at $10-120/mo` | `Midjourney V7 at {{liveImageSubRange:midjourney-v7}}` |
| 0 | `Leonardo AI at $12-49/mo` | `Leonardo AI at {{liveImageSubRange:leonardo}}` |
| 0 | `DALL-E 3 ($0.08)` | `DALL-E 3 ({{liveImagePerImage:dalle-3}})` |
| 0 | `Ideogram 3 ($0.04)` | `Ideogram 3 ({{liveImagePerImage:ideogram-3}})` |
| 1 | `Midjourney Basic ($10/mo)` | `Midjourney Basic ({{liveImageSubTier:midjourney-v7:0}}/mo)` |
| 1 | `Midjourney Pro ($30/mo)` | `Midjourney Pro ({{liveImageSubTier:midjourney-v7:1}}/mo)` |
| 1 | `Leonardo ($29/mo)` | `Leonardo ({{liveImageSubTier:leonardo:1}}/mo)` |
| 1 | `Midjourney Mega ($60-120/mo)` | `Midjourney Mega ({{liveImageSubTier:midjourney-v7:2}}-{{liveImageSubTier:midjourney-v7:3}}/mo)` |
| 6 | `SD 4 API at $0.003/image` | `SD 4 API at {{liveImagePerImage:stable-diffusion-4}}/image` |
| 6 | `Ideogram 3 at $0.04/image` | `Ideogram 3 at {{liveImagePerImage:ideogram-3}}/image` |
| 6 | `Midjourney V7 Basic at $10/mo` | `Midjourney V7 Basic at {{liveImageSubTier:midjourney-v7:0}}/mo` |
| 7 | `Flux Pro: $0.05/image` | `Flux Pro: {{liveImagePerImage:flux-pro}}/image` |
| 8 | `DALL-E 3: best instruction following, $0.04-0.08/image` | `DALL-E 3: best instruction following, {{liveImagePerImage:dalle-3}}-{{liveImagePerImage:dalle-4}}/image` |
| 8 | `Flux Pro: best aesthetic + prompt adherence, $0.05/image` | `Flux Pro: best aesthetic + prompt adherence, {{liveImagePerImage:flux-pro}}/image` |
| 9 | `FLUX schnell for fast drafts ($0.003/image)` | **保留手写**（白名单：数据集没有 schnell 变体） |
| 12 | `At $0.01/image (mid-tier): $40/month. At $0.05/image (premium): $200/month` | **改为定性**（数据集没有 $0.01 / $0.05 这两档的普适口径）：`At a mid-tier per-image price: $40/month. At a premium per-image price: $200/month` |
| 11 | `Image gen: $0.001-0.10/image` | **改为定性**：`Image gen: fractions of a cent per image` |
| 11 | `Stock photos: $0.10-5/image` | **改为定性**：`Stock photos: $0.10-5/image`（图库是市场形态，数据集不拥有 ⇒ 保留但列入白名单） |

> ⚠️ **实测提醒**：`{{liveImagePerImage:dalle-3}}` 返回 `0.080`（3 位），文案里要写成 `$0.080` ⇒ token 前面要带 `$`。**约定：token 返回裸数字，文案自己补 `$`。**

- [x] **Step 5: 训练引擎 FAQ 派生化**

改 `src/engines/ai-cost/ai-training-cost-estimator.ts` 的 `faq` 数组（15 条）：

| # | 原文片段 | 改为 |
|---|---|---|
| 0 | `$50-500 on 2-4 H100 GPUs` | `$50-500 on 2-4 {{liveTrainingGpuName:H100-80GB}} GPUs`（名字也派生，或保留 `H100 GPUs` 手写；**本批只派生价格**）⇒ 保留 `H100 GPUs` |
| 0 | `at $3.50/hr/GPU` | `at {{liveTrainingGpuRate:H200-141GB}}/hr/GPU` |
| 0 | `RTX 6000 at $0.50/hr` | `RTX 6000 at {{liveTrainingGpuRate:RTX-6000}}/hr` |
| 9 (Which GPU) | `$3.50/hr` | `{{liveTrainingGpuRate:H200-141GB}}/hr` |
| 9 | `$2.50/hr` | `{{liveTrainingGpuRate:H100-80GB}}/hr` |
| 9 | `$1.50/hr` | `{{liveTrainingGpuRate:A100-80GB}}/hr` |
| 9 | `$0.80/hr` | `{{liveTrainingGpuRate:L40S-48GB}}/hr` |
| 9 | `$0.50/hr` | `{{liveTrainingGpuRate:RTX-6000}}/hr` |
| 10 | `At $0.10/GB/month` | `At {{liveTrainingStorage}}/GB/month` |
| 13 | `$0.07/1M (A100 effective)` | **保留手写 + 白名单**（数据集没有「每 1M 训练 token」这一计价维度） |
| 19 | `$3-25/1M training tokens` | **保留手写 + 白名单** |
| 19 | `$1-2/hour GPU` | **改为定性**：`$1-2/hour GPU` ⇒ 改为 `a low single-digit hourly rate` |
| 13 | `Spot/preemptible instances save 40-60%` | **Task 5 处理**（档位带对齐数据集） |
| 6 | `128 H200 GPUs × 720 hrs × $3.50/hr` | `× {{liveTrainingGpuRate:H200-141GB}}/hr` |

- [x] **Step 6: i18n 三处同步**

改 `src/i18n/locales/en.json` 与 `src/i18n/locales/zh.json` 的两个 slug 的 `faq.*.a` 键，**与引擎源逐条对齐**（token 完全相同；zh 侧保留中文文案但 token 原样带过去）。

> ⚠️ **写文件后必须验字节**（Write 工具偶发把 `/` 写成 `'`）—— 用 `node -e` 读回校验或 `Select-String` 抽查。

- [x] **Step 7: prose 里的手写价也派生**

- 图片引擎 prose `:293`（`Stable Diffusion 4 ($0.003/image)`）⇒ 改为 `'• 💰 Budget is #1 concern:              → Stable Diffusion 4 ($' + fmtNum(p_sd4.perImage) + '/image)'`，`p_sd4` 取 `PROVIDERS['stable-diffusion-4']`。
- 图片引擎 prose `:295`（`Midjourney V7 Mega ($60-120/mo)`）⇒ 用 `SUB_TIERS['midjourney-v7'][2]` / `[3]`。
- 训练引擎 prose `:137` 的 `40% off` ⇒ **Task 5 处理**。

- [x] **Step 8: 跑测试确认通过**

Run: `node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests/image-training-faq-live-price-guard.test.ts`
Expected: PASS（6 条全绿）。

- [x] **Step 9: tsc + codegen**

Run: `pnpm exec tsc --noEmit` ⇒ exit 0
Run: `node scripts\codegen-examples.mjs` 然后 `node scripts\codegen-examples.mjs --check` ⇒ PASSED

- [x] **Step 10: 在 `tests/run.mjs` 注册新套件**

```js
    'tests/image-training-faq-live-price-guard.test.ts',
```

- [x] **Step 11: Commit**

```bash
git add src/lib/live-price.ts src/engines/ai-cost/ai-image-generation-cost-calculator.ts src/engines/ai-cost/ai-training-cost-estimator.ts src/i18n/locales/en.json src/i18n/locales/zh.json tests/image-training-faq-live-price-guard.test.ts tests/run.mjs
git commit -F tmp/commit-msg-p163-t4.txt
```

commit message 文件内容：

```
feat(engines): P163 图片 / 训练两个引擎的 FAQ 与 prose 派生化

实测（2026-10-30）：图片 7 家 perImage（$0.003/$0.08/$0.04/$0.05）与训练 5 种
GPU 小时价（$3.50/$2.50/$1.50/$0.80/$0.50）当前与数据集完全一致 —— 但仍是手写，
每次 bot 刷新数据集就要人工同步一次。

新增 7 种 token：liveImagePerImage / liveImageSubRange / liveImageSubTier /
liveImageAdvMult / liveTrainingGpuRate / liveTrainingStorage /
liveTrainingDataProcess。返回值语言中立（裸数字），文案自己补 $ 与单位。

三处同步：引擎源 + en.json + zh.json。三个数据集没有的主体（Together AI /
Stability AI / FLUX schnell / 每 1M training token 计价）保留手写并进白名单，
每条写明「数据集为什么不拥有它」。

新增守卫 tests/image-training-faq-live-price-guard.test.ts（6 条）。
```

---

### Task 5: 训练引擎 Spot/Reserved 折扣带对齐数据集（D3）

**Files:**
- Modify: `src/engines/ai-cost/ai-training-cost-estimator.ts`（`:132-137` prose + customFn `:255-258`）
- Modify: `tests/price-render-defect-guard.test.ts`（追加 D3 断言）

**Interfaces:**
- Consumes: Task 2 的 `fmtNum`。
- Produces: 守卫追加第 3 条断言（D3）。

- [x] **Step 1: 追加失败的守卫断言**

```ts
test('D3：训练引擎的 Spot/Reserved 折扣带必须与数据集一致', () => {
  const src = readFileSync(resolve(root, TRAINING_ENGINE), 'utf-8');
  const gpu: any = (PRICING as any).gpu;
  // 数据集口径：现货带 / 预留带
  const spotBand = gpu.spotMult;
  const reservedBand = gpu.reservedMult;
  assert.ok(Array.isArray(spotBand), '数据集 gpu.spotMult 必须是数组');
  assert.ok(Array.isArray(reservedBand), '数据集 gpu.reservedMult 必须是数组');

  // 引擎里不允许出现单一写死折扣百分比（40% / 60%）
  const offenders = src
    .split('\n')
    .map((l, i) => [i + 1, l] as const)
    .filter(([, l]) => /Spot\/Reserved Discount \(\d+% off\)/.test(l));
  assert.deepEqual(
    offenders.map(([n]) => n),
    [],
    '训练引擎仍有写死的单一 Spot/Reserved 折扣百分比 ⇒ 数据集给的是带（区间），不是单值'
  );

  // 引擎读到的带必须来自数据集，而不是硬编码常量
  assert.ok(
    /gpu\.spotMult/.test(src) || /spotMult/.test(src),
    '训练引擎没有引用 gpu.spotMult ⇒ 折扣带没有单一真相源'
  );
});
```

- [x] **Step 2: 跑测试确认失败**

Expected: FAIL —— 报出 `:137` 与 customFn `:258` 两行。

- [x] **Step 3: 修 prose**

`ai-training-cost-estimator.ts:132-137` 当前：

```ts
  const withReserved = totalCost * 0.6; // spot instance savings
  out.push('Optimistic (spot instances + optimizations):  ' + fmt(optimistic));
  ...
  out.push('With Spot/Reserved Discount (40% off):          ' + fmt(withReserved));
```

改为（按数据集的**带**给出上下界，不再给单一百分比）：

```ts
  // P163：D3 —— 折扣是**带**（区间），不是单值；上下界都来自数据集。
  const spotMult = (PRICING as any).gpu.spotMult as number[];   // 现货带，如 [0.30, 0.60]
  const reservedMult = (PRICING as any).gpu.reservedMult as number[]; // 预留带
  const withReserved = totalCost * (1 - reservedMult[reservedMult.length - 1]);
  out.push('Optimistic (spot instances + optimizations):  ' + fmt(optimistic));
  ...
  out.push('With Reserved Discount (' + Math.round(reservedMult[reservedMult.length - 1] * 100) + '% off):          ' + fmt(withReserved));
```

> ⚠️ **先读 `src/data/ai-pricing.json` 的 `gpu.spotMult` / `gpu.reservedMult` 实际结构**（数组还是对象、方向是「折扣率」还是「乘数」），再决定上面的取法 —— **期望值必须以数据集实际结构为准，不能凭猜**。

- [x] **Step 4: 修 customFn**

customFn 侧 `:255-258` 同步改：把 `tc*0.6` 与写死的 `40% off` 换成从数据表读带。

> ⚠️ customFn 的数据表由 `scripts/codegen-customfn.mjs` 生成 —— **先跑 `node scripts\codegen-customfn.mjs` 看它给这个引擎生成的数据表结构**，按那个结构改 customFn 的**逻辑段**（codegen 只重生成数据表，逻辑段手工维护）。

- [x] **Step 5: 跑测试确认通过**

Run: `node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests/price-render-defect-guard.test.ts`
Expected: PASS（D1 + D2 + D3 全绿）。

- [x] **Step 6: codegen + tsc**

Run: `node scripts\codegen-customfn.mjs` → `node scripts\codegen-customfn.mjs --check` ⇒ PASSED
Run: `node scripts\codegen-examples.mjs` → `node scripts\codegen-examples.mjs --check` ⇒ PASSED
Run: `pnpm exec tsc --noEmit` ⇒ exit 0

- [x] **Step 7: Commit**

```bash
git add src/engines/ai-cost/ai-training-cost-estimator.ts tests/price-render-defect-guard.test.ts
git commit -F tmp/commit-msg-p163-t5.txt
```

commit message 文件内容：

```
fix(engines): P163 训练引擎的 Spot/Reserved 折扣带对齐数据集（40% → 数据集口径）

实测（2026-10-30）：训练引擎写死「With Spot/Reserved Discount (40% off)」
（totalCost * 0.6）。但数据集 gpu 段给的是**带**：现货 30-60%、预留 10-30%
—— 40% 既不是现货带中位也不是预留带中位。而 P162 已在 GPU FAQ 把这两条带
改正过，训练引擎却还留着旧口径 ⇒ 同一份事实两处口径（D3）。

修法：改用数据集的带，输出上界（最保守的预留折扣），不再给单一百分比；
customFn 侧同步。守卫新增 D3 断言。

另：数据集 training.gpuTypes.H200-141GB.hourlyRate = 3.5 与 gpu.rates.H200
（$2.20-5.00 跨供应商区间）是**不同语义的两处真相源** —— 训练估算用前者，
云 GPU 现货比价用后者；本批在规格 §16.2 里写明，避免下一个读代码的人
误判其中一处为漂移。
```

---

### Task 6: `ai-pricing-popular.json` 显式规则 + 守卫

**Files:**
- Modify: `src/data/ai-pricing-popular.json`（加 `_rule` 键 + `excludedModels`）
- Create: `tests/popular-models-rule-guard.test.ts`
- Modify: `tests/run.mjs`

**Interfaces:**
- Consumes: `src/data/ai-pricing.json` 的 `llm` 段。
- Produces:
  ```ts
  // src/data/ai-pricing-popular.json 的新增结构
  {
    "_rule": {
      "rule": "数据集里每个 LLM 模型要么在 popularModelKeys 里，要么在 excludedModels 里并写明理由。新模型进 ai-pricing.json 后必须做这个决定。",
      "updatedAt": "2026-10-30"
    },
    "popularModelKeys": { ... },
    "comparisonFlagshipKeys": { ... },
    "excludedModels": [
      { "provider": "openai", "key": "gpt-4-turbo-legacy", "reason": "..." }
    ]
  }
  ```
  ⚠️ **实际排除项必须由数据集实况决定** —— 本批先跑一次脚本列出「数据集里有、popular 里没有」的模型，逐条写理由（若一个都没有，`excludedModels` 可以是空数组，但守卫仍要成立）。

- [x] **Step 1: 写失败的守卫测试**

创建 `tests/popular-models-rule-guard.test.ts`：

```ts
#!/usr/bin/env node
// P163 — 「新模型必须决定是否进交互态」的规则守卫（source-only）。
//
// 为什么需要这个守卫
// ------------------
// src/data/ai-pricing-popular.json 决定「哪些模型进交互态」。现状：它是一个
// 纯清单，没有任何规则说明「新模型进 ai-pricing.json 后**必须**决定是否进这里」
// ⇒ 新模型会静默地只进数据集、不进交互态 ⇒ 用户在计算器里根本选不到它。
//
// 这是一个**流程洞**，不是代码 bug ⇒ 只能靠「规则 + 守卫」把它变成可执行契约。
//
// ⚠️ 期望值全部是本文件里**独立写死**的字面量。
// Build dependency: none (source-only).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import PRICING from '../src/data/ai-pricing.json';
import POPULAR from '../src/data/ai-pricing-popular.json';

const root = resolve(import.meta.dirname, '..');

test('popular.json 必须带 _rule 规则键（写明新模型进数据集后要做什么）', () => {
  const rule = (POPULAR as any)._rule;
  assert.ok(rule, 'popular.json 缺少 _rule');
  assert.ok(typeof rule.rule === 'string' && rule.rule.length > 20, '_rule.rule 必须写清规则');
  assert.ok(/popularModelKeys/.test(rule.rule), '_rule.rule 必须点名 popularModelKeys');
  assert.ok(/excludedModels/.test(rule.rule), '_rule.rule 必须点名 excludedModels');
});

test('数据集里每个 LLM 模型要么进 popular、要么被显式排除并写明理由', () => {
  const llm: any = (PRICING as any).llm;
  const popular: any = (POPULAR as any).popularModelKeys;
  const excluded: any = (POPULAR as any).excludedModels ?? [];
  const excludedKeys = new Set(excluded.map((e: any) => `${e.provider}/${e.key}`));

  const missing: string[] = [];
  for (const [provider, group] of Object.entries(llm)) {
    for (const key of Object.keys((group as any).models ?? {})) {
      const inPopular = (popular[provider] ?? []).includes(key);
      const inExcluded = excludedKeys.has(`${provider}/${key}`);
      if (!inPopular && !inExcluded) missing.push(`${provider}/${key}`);
    }
  }
  assert.deepEqual(missing, [], `这些模型既不在 popularModelKeys 也不在 excludedModels：\n${missing.join('\n')}`);
});

test('每条排除项都写了理由（且理由非空）', () => {
  const excluded: any = (POPULAR as any).excludedModels ?? [];
  for (const e of excluded) {
    assert.ok(typeof e.provider === 'string' && e.provider.length > 0, '排除项缺 provider');
    assert.ok(typeof e.key === 'string' && e.key.length > 0, '排除项缺 key');
    assert.ok(typeof e.reason === 'string' && e.reason.trim().length > 5, `排除项 ${e.provider}/${e.key} 缺理由`);
  }
});

test('popularModelKeys 引用的模型在数据集里都存在（反向：不能引用幽灵 key）', () => {
  const llm: any = (PRICING as any).llm;
  const popular: any = (POPULAR as any).popularModelKeys;
  for (const [provider, keys] of Object.entries(popular)) {
    const models = (llm as any)[provider]?.models ?? {};
    for (const key of keys as string[]) {
      assert.ok(models[key], `popularModelKeys 引用了不存在的模型 ${provider}/${key}`);
    }
  }
});
```

- [x] **Step 2: 跑测试确认失败**

Expected: FAIL（`_rule` 缺失 + 排除项缺失）。

- [x] **Step 3: 列出「数据集有、popular 没有」的模型**

写一个一次性脚本（放 `tmp/`）：

```ts
import PRICING from '../src/data/ai-pricing.json';
import POPULAR from '../src/data/ai-pricing-popular.json';
const llm: any = (PRICING as any).llm;
const popular: any = (POPULAR as any).popularModelKeys;
const rows: string[] = [];
for (const [provider, group] of Object.entries(llm)) {
  for (const key of Object.keys((group as any).models ?? {})) {
    if (!((popular[provider] ?? []).includes(key))) rows.push(`${provider}/${key}`);
  }
}
console.log(rows.length);
console.log(rows.join('\n'));
```

Run: `node node_modules\tsx\dist\cli.mjs tmp\p163-list-missing-popular.ts`
Expected: 打印数量与清单。

- [x] **Step 4: 写 `_rule` 与 `excludedModels`**

按 Step 3 的**实际清单**逐条写理由（理由必须是事实，例如「旧版模型，已被 v5 系列取代」「内部别名，不对外展示」）。

- [x] **Step 5: 跑测试确认通过**

Run: `node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests/popular-models-rule-guard.test.ts`
Expected: PASS（4 条全绿）。

- [x] **Step 6: 注册套件 + Commit**

```js
    'tests/popular-models-rule-guard.test.ts',
```

```bash
git add src/data/ai-pricing-popular.json tests/popular-models-rule-guard.test.ts tests/run.mjs
git commit -F tmp/commit-msg-p163-t6.txt
```

---

### Task 7: 变异台子（证明守卫真的在测）

**Files:**
- Create: `tmp/mutate-p163-ledger.mjs`
- Create: `tmp/mutate-p163-render.mjs`
- Create: `tmp/mutate-p163-faq.mjs`

**Interfaces:**
- Consumes: Task 1/2/4/5/6 的守卫与实现。
- Produces: 三份变异台子报告（每份都是「变异 → 守卫红 → 还原」的证据）。

- [x] **Step 1: 台子纪律（照 P161/P162 的形状）**

每个台子必须：
1. **启动时先还原**（在捕获 ORIGINAL 之前）—— 用 `sha256` 记录原始内容。
2. 每个变异**锚点唯一**：`split(from).length - 1 === 1`，否则跳过并报错。
3. **剔除 no-op**：变异后若文件内容与原文相同 ⇒ 该变异无效，**不算 KILLED，也不算 SURVIVED**，单独报告。
4. 收尾**无条件还原** + `sha256` 逐字节校验。

- [x] **Step 2: 台子 A —— 台账守卫**

变异清单（每条一个"如果守卫没在看这条"的场景）：

| id | 变异 | 期望 |
|---|---|---|
| L1 | 从 `PRICE_CLAIM_SURFACES` 里删掉一个引擎 FAQ 条目 | 反向检查红（漏登记） |
| L2 | 把一个条目的 `file` 改成不存在的路径 | 正向检查红（file 不存在） |
| L3 | 把一个条目的 `guardedBy` 清空 | 「没有守卫看着」检查红 |
| L4 | 把一个条目的 `locator` 改成文本里不存在的字符串 | 锚点检查红 |
| L5 | 把一个条目的 `guardedBy` 指向不存在的守卫文件 | 守卫文件存在性检查红 |

- [x] **Step 3: 台子 B —— 渲染缺陷守卫（D1/D2/D3）**

| id | 变异 | 期望 |
|---|---|---|
| R1 | 在图片引擎某处插入 `'$' + fmt(` | D1 红 |
| R2 | 把 `Math.round(p.perImage / 0.003)` 换成字面量 `13` | D2 红 |
| R3 | 把训练引擎的 `reservedMult[...]` 换成写死的 `0.6` + 恢复 `40% off` 文案 | D3 红 |

- [x] **Step 4: 台子 C —— FAQ 派生化守卫**

| id | 变异 | 期望 |
|---|---|---|
| F1 | 把图片 FAQ 某条里的 token 换回手写 `$0.08` | 手写单价检查红 |
| F2 | 把图片 FAQ 某条 token 的 payload 改成不存在的 provider | provider 存在性检查红 |
| F3 | 从 en.json 删掉某条 FAQ 的 token（只删 token，保留文案） | 三处同步检查红 |
| F4 | 从引擎源删掉一个 token | token 下限检查红 |
| F5 | 把一个已不存在的白名单锚点写进白名单 | 白名单不腐烂检查红 |

- [x] **Step 5: 跑三个台子并记录**

Run: `node tmp\mutate-p163-ledger.mjs` ⇒ 期望 **5/5 KILLED**，问题数 0
Run: `node tmp\mutate-p163-render.mjs` ⇒ 期望 **3/3 KILLED**
Run: `node tmp\mutate-p163-faq.mjs` ⇒ 期望 **5/5 KILLED**

**注意**：`KILLED` 但 `WRONG-KILLER` 也要算进问题数（P161 教训）⇒ 汇总行必须是 `问题:0`。

- [x] **Step 6: 收尾还原校验**

Run: `git status -sb` ⇒ 工作区只剩本批的**预期改动**（引擎 + 守卫 + 数据 + i18n），无残留变异。

---

### Task 8: 全量验证 + 文档回填

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `AGENTS.md`
- Modify: `docs/superpowers/specs/2026-10-27-p155-adsense-low-value-content-and-pricing-bot-diagnosis.md`（§16.6 回填实测）

**Interfaces:**
- Consumes: 全部前序任务。
- Produces: 上线所需的全部文档。

- [x] **Step 1: 类型检查**

Run: `pnpm exec tsc --noEmit` ⇒ exit 0

- [x] **Step 2: codegen 漂移检查（两个）**

Run: `node scripts\codegen-examples.mjs --check` ⇒ exit 0
Run: `node scripts\codegen-customfn.mjs --check` ⇒ exit 0

- [x] **Step 3: 构建**

Run: `$env:SKIP_INDEXNOW='1'; node_modules\.bin\astro.cmd build` ⇒ exit 0

- [x] **Step 4: 全量测试**

Run:
```powershell
$env:RUN_BUILD_TESTS='1'; $env:SKIP_INDEXNOW='1'
node tests\run.mjs 2>&1 | Out-File -Encoding utf8 "$env:TEMP\ffk-p163-full.txt"
```
Expected: **0 失败 / 0 跳过 / exit 0**。套件数与断言数**自己复算**（不要估）：

Run: `node -e "import('./tests/build-dep-suites.mjs').then(m=>{const a=m.walkTestSuites(process.cwd()),b=m.computeBuildDepSuites(process.cwd());console.log(a.length,b.length,a.length-b.length);})"`

- [x] **Step 5: 回填实测数字到规格 §16.6**

把 Step 4 的实测套件数 / 断言数 / 分桶写进规格 §16.6（**不许写估计值**）。

- [x] **Step 6: 更新 CHANGELOG**

新增 P163 节：三个缺陷（D1/D2/D3）+ 台账 + token 家族 + 守卫条数 + 变异台子结果 + 实测数字。

- [x] **Step 7: 更新 AGENTS.md**

- Defense-in-Depth 头加 `P163 added Coverage Ledger + Price Render Defect dimensions 2026-10-30`
- 套件计数行改实测值
- Price Provenance 行从 6→8（加「渲染缺陷」维度说明）
- Total 行改实测值
- 加 P163 note

- [x] **Step 8: 询问用户后 commit + push**

**⛔ 必须在 commit 前问用户**（用户明确规则：不许自动 commit）。用 `ask_user` 带选项 + 推荐项。

commit:
```bash
git add <本批精确文件列表>   # 不碰 bing-block-urls.csv
git commit -F tmp/commit-msg-p163-final.txt
```

push（两端）:
```powershell
$env:GIT_SSH_COMMAND = 'C:/Windows/System32/OpenSSH/ssh.exe'
$env:GIT_SSH_VARIANT = 'external'
git fetch 'ssh://git@ssh.github.com:443/wlz679/forgeflow.git' master:refs/remotes/github/master
git fetch origin master
git push 'ssh://git@ssh.github.com:443/wlz679/forgeflow.git' master:master
git push origin master:master
git rev-list --left-right --count origin/master...HEAD   # 期望 0<TAB>0
```

- [x] **Step 9: 复核 CI**

Run（匿名读 GitHub API）:
```powershell
Invoke-RestMethod -Uri 'https://api.github.com/repos/wlz679/forgeflow/actions/runs?per_page=10' -Headers @{'User-Agent'='x';'Accept'='application/vnd.github+json'}
```
Expected: 本次 push 触发的 run `conclusion = success`。

---

## Self-Review

**1. 规格覆盖**

| 规格 §16 小节 | 对应任务 |
|---|---|
| §16.1 三个缺陷（D1/D2/D3）+ staticExamples[1] 死区 | Task 2、Task 3、Task 5 |
| §16.2 图片/训练手写价对照 | Task 4（派生化）+ Task 4 Step 5（定性化） |
| §16.3.1 台账 | Task 1 |
| §16.3.2 派生化 | Task 4 |
| §16.3.3 D1/D2/D3 修法 | Task 2、3、5 |
| §16.4 范围界定（staticExamples[1] 删掉 / 3 家定性化 / gemini customFn） | Task 3、4、6 |
| §16.5 守卫 | Task 1、2/3/5、4 |
| §16.6 popular 规则 | Task 6 |
| §16.7 维度 3 scan | 规格已写；Task 8 Step 5 记录 |

**2. 占位符扫描**

- 无 TBD / TODO / 「类似 Task N」。
- Task 4 Step 4/5 的替换表是**逐行写死**的（不是「把所有 $0.08 都换掉」）。
- Task 5 Step 3 明确要求「先读数据集实际结构再定取法」—— 这是**必要的读-再定**，不是占位符（数据集结构必须实测，不能凭空断言）。
- Task 6 Step 3 要求先跑脚本列出实际清单 ⇒ 排除项不能凭空写。

**3. 类型一致性**

- `PriceClaimSurface` 的 5 个字段在 Task 1 的接口块与实现里一致。
- `fmtNum` / `fn` 命名在 Task 2/3/4/5 一致。
- 7 种 token 名在 Task 4 的接口块、守卫、resolver 里一致：`liveImagePerImage` / `liveImageSubRange` / `liveImageSubTier` / `liveImageAdvMult` / `liveTrainingGpuRate` / `liveTrainingStorage` / `liveTrainingDataProcess`。
- 守卫文件名在台账的 `guardedBy` 与各 Task 的「注册套件」步骤里一致。
