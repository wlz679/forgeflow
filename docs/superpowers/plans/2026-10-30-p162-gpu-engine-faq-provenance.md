# P162 GPU 引擎 FAQ 的价格单一真相源 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 把 GPU 引擎 FAQ 里 9 条手写价格/折扣/型号主张改成从 `src/data/ai-pricing.json` 派生，并让 GPU 引擎的 FAQ **第一次进入价格守卫的覆盖范围**。

**Architecture:** 复用 P160 已建好的渲染机制（`src/pages/[lang]/[slug].astro` 的 `translatedFaq` 对 en/zh 都调 `resolveLiveTokens`）与 P161 已建好的 GPU token 家族（21 种）。本批只做两件事：**新增 3 种 token**（provider 跨型号区间 / 存储单价 / 出口单价）+ **把 FAQ 的 9 条主张 token 化**（引擎源 + `en.json` + `zh.json` 三处同步）。新增一套独立的 GPU FAQ 守卫（source-only + build-dep）与两个变异台子。

**Tech Stack:** TypeScript · Node `node:test` · `src/lib/live-price.ts`（token 解析器）· `src/data/ai-pricing.json`（真相源）· Astro（渲染）· pnpm

## Global Constraints

- **真相源**：`src/data/ai-pricing.json` 的 `gpu` 段（`providers` / `storagePerGB` / `egressPerGB`）。数据集一个字节不许改。
- **calc 层需拍板**：本批改 `src/engines/**` —— 用户已于 2026-10-30 拍板（见规格 §15 开头）。
- **三处同步**：FAQ 文本必须同时出现在 ① 引擎源 ② `src/i18n/locales/en.json` ③ `src/i18n/locales/zh.json`，按 **index** 对齐 —— zh 页���按 index 取值，错位 = 问答配错。
- **守卫期望值独立写死**：期望值必须是守卫文件里写死的字面量，**不能**从 `src/lib/live-price.ts` 导出（那会让判据与实现同源）。
- **每个断言只守一件事**；断言的强度用**变异**证明，不用「我写了它」证明。
- **变异台子三件套**：快照落盘 + **启动先还原必须在捕获 ORIGINAL 之前** + SIGINT/SIGTERM/SIGHUP 处理器；**锚点必须唯一**；no-op 变异用行为探针区分。
- **Token 形态**：无参 token（`{{liveGpuProviderCount}}`）没有冒号 ⇒ 解析正则的 payload 必须可选。
- **改完必跑**：`pnpm exec tsc --noEmit` → `node scripts/codegen-examples.mjs --check` → `node scripts/codegen-customfn.mjs --check` → `SKIP_INDEXNOW=1 astro build` → `RUN_BUILD_TESTS=1 node tests/run.mjs`。
- **文档里的数字必须实测**（不许估），且分桶（build-dep / source-only）自己复算。

---

## File Structure

| 文件 | 动作 | 职责 |
|---|---|---|
| `src/lib/live-price.ts` | Modify | 新增 3 种 GPU token：`liveGpuProviderRange` / `liveGpuStoragePerGB` / `liveGpuEgressPerGB` |
| `src/engines/ai-cost/gpu-cloud-cost-calculator.ts` | Modify | FAQ 的 9 条主张 token 化（en 源） |
| `src/i18n/locales/en.json` | Modify | 同上（en 副本） |
| `src/i18n/locales/zh.json` | Modify | 同上（zh 副本） |
| `tests/gpu-engine-faq-live-price-guard.test.ts` | Create | source-only 守卫（13 条断言） |
| `tests/gpu-engine-faq-live-price-build-guard.test.ts` | Create | build-dep 守卫（4 条断言） |
| `tmp/mutate-gpu-engine-faq.mjs` | Create | source-only 变异台子 |
| `tmp/mutate-gpu-engine-faq-build.mjs` | Create | build-dep 变异台子 |
| `docs/superpowers/specs/2026-10-27-p155-adsense-low-value-content-and-pricing-bot-diagnosis.md` | Modify | §15.6 回填实测值 |
| `CHANGELOG.md` / `AGENTS.md` | Modify | 新条目 + 守卫矩阵计数 |

---

## Task 1: source-only 守卫（先写，红）

**Files:**
- Create: `tests/gpu-engine-faq-live-price-guard.test.ts`
- Test: `tests/gpu-engine-faq-live-price-guard.test.ts`

**Interfaces:**
- Consumes: `src/data/ai-pricing.json`（真相源）、`src/lib/live-price.ts` 的 `resolveLiveTokens`、引擎 FAQ 三处来源。
- Produces: 一条会红的守卫；后续 Task 2/3 让它转绿。

- [x] **Step 1: 写守卫骨架与「三处来源」读取**

从引擎源读 `faq` 数组（`import { getEngine } from '../core/engines/registry'` 或直接读文件 + 正则），从 `en.json` / `zh.json` 读 `tools.solopreneur-gpu-cloud-cost-calculator.faq.N.q|a`。

- [x] **Step 2: 写 13 条断言**（每条只守一件事）

1. **无手写单价**：FAQ 答案里不许出现「$数字/hr」「$数字/GB」形态（数据集拥有的单价形态），白名单除外。
2. **白名单不腐烂**：白名单每条必须仍出现在文本里。
3. **token 可解析**：FAQ 里用到的每个 GPU token 都能被 `resolveLiveTokens` 吃掉（解析失败 = 构建期炸）。
4. **三处同步**：引擎源 / `en.json` / `zh.json` 逐条对齐（条数与 index 一致）+ **token 集合一致** + `en.json` 的问题不得重复。
5. **token 数量下限 + 关键派生值钉死**：token 总数有下限（防「把价格全删掉」钻空子），且关键派生值 == 独立写死的字面量。
6. **名实一致**：价格 token 的型号必须与同句提到的型号对得上（如 `{{liveGpuRange:H100}}` 附近必须出现 H100）。
7. **每个 token 种类都真的被实现**：对 FAQ 里用到的每一种 token 跑一次真实替换，断言 token 被吃掉。
8. **关键派生值 == 写死字面量**：`vastai` 区间 `$0.35-2.20`、`runpod` `$0.39-2.49`、`lambdalabs` `$0.50-2.80`、H100 区间 `$1.69-$4.20`、现货带 `30-60`、预留带 `10-30`、存储 `$0.10`、出口 `$0.08`。
9. **无手写折扣带**：FAQ 里不得出现「数字区间 + %」且紧邻折扣词（沿用 P161 第 16 条的形状判据；中文「低」只认紧邻写法）。

- [x] **Step 3: 跑守卫，确认它红**

Run: `node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\gpu-engine-faq-live-price-guard.test.ts`
Expected: FAIL（FAQ 还是手写的、3 种新 token 还不存在）

---

## Task 2: 新增 3 种 GPU token

**Files:**
- Modify: `src/lib/live-price.ts`（TOKEN_KINDS 两处清单 + `resolveGpuToken` + 顶部注释）
- Test: `tests/gpu-engine-faq-live-price-guard.test.ts`

- [x] **Step 1: 实现 `liveGpuProviderRange`**

payload = provider key。返回该 provider **跨型号**的按需价区间，格式与 `liveGpuRange` 一致：`$0.35-2.20`。provider 不存在时抛 `UnknownGpuProviderError`。

- [x] **Step 2: 实现 `liveGpuStoragePerGB` / `liveGpuEgressPerGB`**

无参。读 `PRICING.gpu.storagePerGB` / `PRICING.gpu.egressPerGB`，用 `formatPrice` 输出 `$0.10` / `$0.08`。值为 0 或缺失时抛错（不许显示 $0）。

- [x] **Step 3: 把 3 个名字加进 TOKEN_KINDS 的两处清单 + 顶部注释**

⚠️ 两处清单（模块扫描器用的 + 守卫交叉校验用的）必须同时加 —— P161 的教训：漏一处 = 解析器或守卫有一边瞎掉。

- [x] **Step 4: 跑守卫，确认断言 3 / 7 / 8 转绿（其余仍红）**

---

## Task 3: FAQ 三处 token 化

**Files:**
- Modify: `src/engines/ai-cost/gpu-cloud-cost-calculator.ts:373-389`
- Modify: `src/i18n/locales/en.json`（`tools.solopreneur-gpu-cloud-cost-calculator.faq.*`）
- Modify: `src/i18n/locales/zh.json`（同上）
- Test: `tests/gpu-engine-faq-live-price-guard.test.ts`

- [x] **Step 1: 按下表改写 9 条（en）**

| index | 改写要点 |
|---|---|
| 0 | 三个区间 → `{{liveGpuProviderRange:vastai}}` / `{{liveGpuProviderRange:runpod}}` / `{{liveGpuProviderRange:lambdalabs}}`；「贵 3-5x」→ `{{liveGpuRatio:vastai\|A100\|on\|aws\|A100\|on}}x`（⚠️ **payload 顺序 = 「便宜方在前」** ⇒ 返回值是 B/A；写反会得到 0.2x）；「30-60%」→ `{{liveGpuOffReserved}}%`；**供应商显示名也走 `{{liveGpuProviderName:<key>}}`** |
| 1 | 「40-60% cheaper」→ `{{liveGpuOffSpot}}%`；「15-30% discount」→ `{{liveGpuOffReserved}}%` |
| 2 | H100 硬件 `~$30,000` 与「~$2/hr、~15,000 小时」→ 定性（五位数采购 / 几千小时回本）；租价改 `{{liveGpuRange:H100}}` |
| 3 | storage `$0.10/GB/month` → `{{liveGpuStoragePerGB}}/GB/month`；egress `$0.05-0.12/GB` 保留为**市场区间**（白名单）并补一句「本计算器按 `{{liveGpuEgressPerGB}}/GB` 建模」；100GB/1TB 的月额保留手写（守卫**逐来源**独立重算） |
| 7 | A10G / L4 / A100 40GB / T4 → L40S / A100 80GB / H100 80GB / RTX 4090，价格用 `{{liveGpuRange:L40S}}` 等 |
| 8 | p4d `$32` / a2 `$30` / NDv5 `$35` → 去掉金额（实例名可留），改比 **per-GPU-hour**：`{{liveGpuRange:A100}}` + `{{liveGpuRatio:vastai\|A100\|on\|aws\|A100\|on}}x`；删 CoreWeave；「60-70% off」→ `{{liveGpuOffSpot}}%` |
| 9 | 「Reserved: 30-60% off」→ `{{liveGpuOffReserved}}%`；「Spot: 60-80% off」→ `{{liveGpuOffSpot}}%` |
| 10 | 「20 GPUs × $0.75/hour」→ `{{liveGpuRate:min\|L40S}}`（⚠️ `liveGpuRate` 只吃 **2 段** payload：provider\|type，档位由 kind 决定 —— 写成 3 段会解析失败），合计 → `{{liveGpuMonthly:min\|L40S\|on\|20\|24}}` |
| 13 | 「$0.10-0.20/GB/month」→ 「about `{{liveGpuStoragePerGB}}/GB/month`（高端档更高）」 |

- [x] **Step 2: 同步改 zh（三处 index 必须一一对应）**

⚠️ 中文用「低 {{...}}%」/「便宜 {{...}}%」承载 band token（与 P161 的 md 口径一致）；`liveGpuShare` 自带 `%`、`liveGpuRatio` 不带 `x` ⇒ 文案里要自己补。

- [x] **Step 3: 跑守卫，确认全绿**

- [x] **Step 4: 跑既有的三个 FAQ 守卫，确认没把别的工具弄红**

Run: `node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\engine-en-faq-i18n-guard.test.ts tests\engine-zh-faq-i18n-guard.test.ts tests\engine-faq-coverage-guard.test.ts`

---

## Task 4: build-dep 守卫

**Files:**
- Create: `tests/gpu-engine-faq-live-price-build-guard.test.ts`

- [x] **Step 1: 写 4 条断言**

1. `dist/` 全站没有未解析的 `{{liveGpu*}}` token。
2. GPU 工具页（en + zh）渲染出**解析后**的 FAQ 文本（不是带 token 的原文）。
3. 页面上的价格 == 数据集实时值（如 `$1.69-$4.20`、`30-60`）。
4. P162 修掉的过期价格串已从产物消失（**按作用域**查 —— `$32/hour` 之类也在别的工具里）。

- [x] **Step 2: 构建后跑**

Run: `$env:SKIP_INDEXNOW='1'; node_modules\.bin\astro.cmd build` 然后 `RUN_BUILD_TESTS=1 node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\gpu-engine-faq-live-price-build-guard.test.ts`

---

## Task 5: 变异台子

**Files:**
- Create: `tmp/mutate-gpu-engine-faq.mjs`（source-only）
- Create: `tmp/mutate-gpu-engine-faq-build.mjs`（build-dep）

- [x] **Step 1: 写 source-only 台子**，至少 6 条变异：① 把 `{{liveGpuOffSpot}}` 换成手写 `50-70% off` ② 把 `{{liveGpuProviderRange:vastai}}` 换回 `$0.35-2.20/hr` ③ 把 `{{liveGpuOffReserved}}` 换回 `30-60% off` ④ 删掉 `{{liveGpuStoragePerGB}}` ⑤ zh 的两条 FAQ 互换（index 错位）⑥ 把 `{{liveGpuRatio:min|A100|on|max|A100|on}}` 的 payload 顺序写反
- [x] **Step 2: 写 build-dep 台子**，至少 3 条变异（真重建后红）
- [x] **Step 3: 跑两个台子，确认 KILLED 且工作区 sha256 还原**

⚠️ 台子的 `restoreFromSnapshot()` 调用点必须在捕获 `ORIGINAL` **之前**（P161 修过的顺序 bug）。

---

## Task 6: 全量验证与文档

- [x] **Step 1: `pnpm exec tsc --noEmit`** ⇒ exit 0
- [x] **Step 2: `node scripts\codegen-examples.mjs --check`** 与 `node scripts\codegen-customfn.mjs --check`** ⇒ 均 exit 0（⚠️ codegen 会重写引擎文件的 `staticExamples` 段 —— FAQ 在 `staticExamples` **之外**，不该被 codegen 碰；跑完确认 `git diff` 里没有意外的 staticExamples 变化）
- [x] **Step 3: `SKIP_INDEXNOW=1 astro build`** ⇒ exit 0
- [x] **Step 4: `RUN_BUILD_TESTS=1 node tests\run.mjs`** ⇒ 0 失败 / 0 跳过，并**从日志里数出**套件数与断言数（不许估）
- [x] **Step 5: 回填** 规格 §15.6、CHANGELOG 新条目、AGENTS.md 的守卫矩阵（Price Provenance 维度 +1、套件计数）
- [x] **Step 6: 询问用户是否 commit**（用户规则：先问再 commit）

---

## Self-Review

- **Spec coverage**：规格 §15.1 取证 → Task 3 Step 1 的改写表；§15.2 两条更正 → Task 3（存储/出口改派生）+ 不动 staticExamples；§15.3 三种新 token → Task 2；§15.4 范围 → Task 3 + Task 1 白名单；§15.5 守卫 → Task 1/4/5；§15.6 验证 → Task 6；§15.7 维度 3 → 已在规格内；§15.8 待拍板 → 不在本批。
- **Placeholder scan**：无 TBD；改写表逐条给出目标 token；断言逐条给出判据。
- **Type consistency**：`liveGpuProviderRange`（1 参）/ `liveGpuStoragePerGB`（0 参）/ `liveGpuEgressPerGB`（0 参）与 Task 1 断言 8 的期望值一一对应。
