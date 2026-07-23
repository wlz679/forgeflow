# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **ForgeFlowKit** — a static calculator SPA providing free business calculators for solopreneurs / SaaS founders. Currently 100 calculators live at the site root across 15 categories (A/B/C/D/E/F/H/K/L/M/O/P/R/S/T), each rendered as its own page. Engine count locked at `EXPECTED_ENGINE_COUNT = 100` (see `tests/lib/engine-count.ts`); see P16 milestone for trigger events.

> **Categories (15 letters, canonical from `src/data/categories.ts`):** A=SaaS Metrics · B=AI Cost Tools · C=Valuation & Exit · D=Freelance Pricing · E=Cost & Efficiency · F=Investment & Real Estate · H=Hiring & Team · K=Knowledge · L=Legal & Compliance · M=Marketing Analytics · O=Operations · P=Product Analytics · R=Retention & Customer Success · S=Sales · T=Customer Support. (AI cost is letter B, not a 16th separate category.) P46 audit 2026-07-20 closed drift where prior versions listed "16 categories (B/C/.../I/.../V + AI cost)" — letters I and V are phantom.

Calculator categories (high-level, by `src/data/categories.ts` letter):

- **A — SaaS Metrics** — MRR, burn rate, churn, break-even, valuation, equity dilution, ARR multiple, NRR, etc. (engines 1-30 from P0 scaffold; P-series additions)
- **B — AI Cost Tools** (8 data-driven engines, see "Data-Driven Engines" below) — OpenAI / Claude / Gemini / DeepSeek token pricing, AI image gen cost (7 providers), GPU cloud cost, AI training cost estimator, cross-provider API comparison
- **C — Valuation & Exit** — Unit economics, SaaS valuation, LTV, CAC, etc.
- **D — Freelance Pricing** — Hourly-vs-fixed, freelance rate, sponsorship rate, course pricing, SaaS pricing, email list revenue
- **E — Cost & Efficiency** — Employee cost, meeting cost, productivity score
- **F — Investment & Real Estate** — Compound interest, mortgage, cap rates, BRRR returns, rent-vs-buy (covers M4 investment + M5 real-estate)
- **H — Hiring & Team** — Fully-loaded employee cost, ramp time, equity refresh grants, attrition cost
- **K — Knowledge** — KB coverage, article freshness, search effectiveness, documentation ROI
- **L — Legal & Compliance** — GDPR fine, DSAR cost, consent revenue impact, DPA cost, breach notification, CMP ROI
- **M — Marketing Analytics** — ROAS, LTV by channel, funnel value, cohort retention, email campaign ROI
- **O — Operations** — Inventory turnover, carrying cost, stockout cost, reorder point, fulfillment cost, supplier scorecards
- **P — Product Analytics** — Funnel conversion, feature adoption, activation rate, stickiness, power user curves
- **R — Retention & Customer Success** — NRR, GRR, expansion revenue, logo churn, customer health, renewal rate
- **S — Sales** — Pipeline value, sales velocity, ACV, win rate by stage, quota attainment, pipeline coverage
- **T — Customer Support** — Cost-per-ticket, FRT SLA, resolution time, CSAT, self-service deflection, team capacity

> **History**: pre-P46, CLAUDE.md described categories using a different taxonomy (B=Business / C=Pricing / D=HR / E=Personal / I=Investment / V=Valuation). That taxonomy was renamed/merged during P0-P16 to match `categories.ts`. P46 audit (2026-07-20) closed the drift.

Goal: every calculator should match **world-leading / industry-leading** quality. The v3 standard has two variants — see "v3 standard — two variants" section below.

**v3 standard — two variants:**

| Variant         | Mandatory sections                                                                                                                  | Applies to                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Business v3** | 6+ emoji sections · 🩺 Health (🟢🟡🟠🔴) · 🔄 What-If · ⚖️ Break-Even · 🎯 Milestone/Projection · 💡 Tip                            | A / C / D / E / F / H / K / L / M / O / P / R / S / T category engines (92 business) |
| **AI Cost v3**  | 6+ emoji sections · 🩺 Health (🟢🟡🟠🔴) · 🔄 What-If · 💡 Tip · 📊 Cost Breakdown · 🏆 Provider Comparison · 📅 Data updated badge | B category engines driven by `src/data/ai-pricing.json` (8)                          |

Why two variants: `Break-Even` and `Milestone` are business-domain concepts. Forcing them onto a token-pricing calculator is anti-semantic — the result is emoji-fluff, not analysis. The AI Cost variant substitutes domain-natural sections (cost decomposition, provider comparison) that match what users actually want.

**v3 status (P16 milestone locked 2026-07-15/16):** All 100 engines at the v3 standard. Engine count per category:

<!-- codegen:start engine-count -->

| Letter | Category Name | Engine Count |
|--------|---------------|--------------|
| A | SaaS Metrics | 5 |
| B | AI Cost Tools | 8 |
| C | Valuation & Exit | 10 |
| D | Freelance Pricing | 6 |
| E | Cost & Efficiency | 5 |
| F | Investment & Real Estate | 10 |
| H | Hiring & Team | 6 |
| K | Knowledge / 知识库 | 6 |
| L | Legal & Compliance | 6 |
| M | Marketing Analytics | 8 |
| O | Operations / 库存运营 | 6 |
| P | Product Analytics | 6 |
| R | Retention & Customer Success | 6 |
| S | Sales / 销售管理 | 6 |
| T | Customer Support | 6 |
| **Total** | | **100** |

<!-- codegen:end -->

8 AI cost engines meet the AI Cost v3 variant; 92 business engines meet the Business v3 variant (across 15 categories). UI wiring (`BIZ_CONFIG_MAP` + 4 `BIZ_*_CONFIG` + 205 preset-chip references) and i18n (15 × 6 preset keys per engine) complete. Historical batch reference: see `docs/superpowers/plans/2026-06-22-close-v3-gap-7-business-calculators.md` for the original 7-batch close.

## Commands

```bash
pnpm dev                # Dev server (Astro, port 4321 default)
pnpm build              # Production build (313+ static pages: 100 calcs × 2 langs + 15 category listings × 2 langs + 2 landing pages × 2 langs = ~314)
pnpm preview            # Preview built app
pnpm sync               # Update AI pricing from LiteLLM + regen engine data tables
pnpm test:unit          # Unit tests (skips 5 build-dependent by default)
pnpm test:build         # Build-dependent test wrapper (requires RUN_BUILD_TESTS=1)
pnpm translate          # Translate wordpools (translate-wordpools.ts)
```

**Requires pnpm** — enforced via `preinstall` script. Node `^20.19.0 || >=22.13.0`.

## Tech Stack

- **Astro 4.16.19** (static site generation, no SSR) + **TypeScript 5.6** (strict)
- **`@astrojs/sitemap` 3.2.1** for sitemap generation
- **Tailwind CSS 4** (via `@tailwindcss/vite`)
- **No Vue / React / Pinia** — project is pure Astro pages + custom engine runtime
- **Self-hosted engines** — `src/engines/*.ts` register themselves via `registerEngine()` at import time. Each engine has:
  - `calculate(inputs)` — server-side, called by Astro pages to render static examples
  - `customFn` — minified JS string that runs in the browser for live interactions
  - `staticExamples` — pre-baked output strings, used as the initial page render
  - `dataLastUpdated` (optional) — shown as a `📅 Data updated: YYYY-MM-DD` badge

## Architecture

### Pages (`src/pages/[lang]/`)

- `[lang]/[slug].astro` — the main calculator page. Auto-imports all engines from `src/engines/`.
- `[lang]/index.astro` — landing page
- `[lang]/blog/` — blog posts
- `[lang]/about.astro`, `contact.astro`, `privacy-policy.astro`, `terms.astro` — static content

i18n: English (`en`) and Chinese (`zh`). Translations in `src/i18n/translations.ts`.

### Engines (`src/engines/`)

Each engine is a single self-contained `.ts` file. The registry pattern (`src/core/engines/registry.ts`) is called via `registerEngine(engine)` at module import.

**Pattern for a new engine:**

```ts
import type { ToolEngine } from "../core/engines/types";
import { registerEngine } from "../core/engines/registry";

const engine: ToolEngine = {
  slug: "solopreneur-my-calc",
  title: "My Calculator",
  description: "...",
  inputs: [{ name: "foo", label: "Foo", type: "number" }],
  clientConfig: { type: "custom", wordPools: {}, customFn: "..." },
  generate(inputs) {
    /* returns string[] */
  },
  staticExamples: ["..."],
  faq: [{ q: "...", a: "..." }],
  howToUse: ["..."],
};
registerEngine(engine);
```

### Data-Driven Engines (8 of 100)

These engines read from `src/data/ai-pricing.json` (single source of truth):

| Engine                                | PRICING key                                 | Notes                    |
| ------------------------------------- | ------------------------------------------- | ------------------------ |
| `openai-token-calculator`             | `llm.openai.models`                         | 14 GPT models            |
| `claude-api-cost-calculator`          | `llm.anthropic.models`                      | 7 Claude models          |
| `gemini-api-cost-calculator`          | `llm.google.models`                         | 6 Gemini models          |
| `deepseek-api-cost-calculator`        | `llm.deepseek.models`                       | 4 DeepSeek models        |
| `ai-api-cost-comparison`              | `llm.*` (all 4 providers)                   | Cross-provider view      |
| `ai-image-generation-cost-calculator` | `image.providers`                           | 7 image gen providers    |
| `gpu-cloud-cost-calculator`           | `gpu.providers`                             | 6 GPU cloud providers    |
| `ai-training-cost-estimator`          | `training.gpuTypes` + `training.modelSizes` | Training cost calculator |

PRICING.json schema:

```json
{
  "version": 1,
  "lastUpdated": "YYYY-MM-DD",
  "source": "litellm+manual",
  "llm": { "openai": { "name": "...", "models": { "gpt-5": {...} } } },
  "image": { "providers": {...}, "subTiers": {...}, "advancedMult": {...} },
  "gpu": { "providers": {...}, "storagePerGB": 0.10, "egressPerGB": 0.08 },
  "training": { "gpuTypes": {...}, "modelSizes": {...}, "loraSpeedup": 0.35, "dataProcessPerGB": 1.50 }
}
```

### Automation Scripts (`scripts/`)

- `sync-pricing.mjs` — Fetches `https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json` and updates `src/data/ai-pricing.json`. Runs weekly via GitHub Action.
- `codegen-customfn.mjs` — Reads `PRICING.json` and regenerates the **data table** section of each engine's `customFn` minified JS string. Keeps client-side data in sync with PRICING. Field name mapping per engine (e.g. JSON `input` → customFn `i`).

**Run order:** `sync-pricing.mjs` → `codegen-customfn.mjs` → `pnpm build`.

The two scripts together implement a `pnpm sync` convenience script.

### GitHub Actions (`.github/workflows/`)

- `sync-pricing.yml` — Monday 06:00 UTC cron. Runs `pnpm sync` and commits changes if any. Workflow also runs on push to `sync-pricing.mjs`, `codegen-customfn.mjs`, `ai-pricing.json`, or the workflow file itself.

## Directory Conventions

| Directory            | Purpose                                                   |
| -------------------- | --------------------------------------------------------- |
| `src/engines/`       | One engine per `.ts` file. Self-registering.              |
| `src/core/engines/`  | Engine framework: `types.ts`, `registry.ts`, `helpers.ts` |
| `src/data/`          | Static data files (PRICING.json etc.)                     |
| `src/pages/[lang]/`  | Astro pages, one per locale                               |
| `src/i18n/`          | Translation strings                                       |
| `src/scripts/`       | Legacy utility scripts                                    |
| `src/components/`    | Shared Astro components (if any)                          |
| `scripts/`           | Build-time automation (sync, codegen)                     |
| `.github/workflows/` | CI/CD                                                     |

## Notes for Future Sessions

- **CLAUDE.md is THE source of truth** for future AI sessions. Keep it accurate.
- **Engine pattern is strict** — `calculate()` is the source of truth; `staticExamples[0]` is auto-regenerated from it by `scripts/codegen-examples.mjs`. **After editing `calculate()` in any engine, run `node scripts/codegen-examples.mjs` before committing** — `staticExamples[0]` will drift otherwise (the v3 bug found in commit 1385725 was caused by skipping this step). Use `node scripts/codegen-examples.mjs --check` in CI / pre-commit to detect drift; exit 1 means someone forgot to regen. `customFn` is minified; `codegen-customfn.mjs` only auto-updates the data-table portion (PRICING.json-driven), the logic is hand-minified.
- **`codegen-examples.mjs` only regenerates `staticExamples[0]`** — engines that ship `[1+]`, `[2+]`, ... (alternative scenarios shown on the page) are not auto-checked. If `generate()` logic changes, verify `[1+]` manually or hand-edit them. The `--check` mode also flags literal `\\'` or `\uXXXX` escape sequences in regenerated output (a sign that `generate()` is producing broken escape chains).
- **customFn JS parse safety** — every engine's `customFn` is a JS source string sent to `new Function('inputs', 'pick', 'fill', customFn)` in the browser. **It must parse as valid JS or the whole page silently fails.** Use `node tests/scripts/test-customFn.mjs <slug>` (or no args for all 100) to verify a customFn parses, OR `node tests/scripts/verify-customfn.mjs` (P15 expanded parser: matches 4 customFn declaration styles — top-level `const customFn`, `let customFn`, `var customFn`, and `clientConfig: { customFn }` inline form). Watch out for the `}}if(...)` ASI trap — `}` followed by `if` (or any statement-starter token) is a JS parse error; insert a literal `;` between them.
- **Pre-commit hook** (`.githooks/pre-commit`) runs `codegen-examples.mjs --check` automatically. Enable once after clone: `git config core.hooksPath .githooks`. Bypass with `git commit --no-verify` (only when intentional).
- **PRICING.json is the source of truth** for 8 engines. To add a new model, edit JSON and run `pnpm sync`.
- **Visual diagrams** preferred over text for page/UI discussions.
- **Don't over-engineer** — match existing style; avoid speculative abstractions.
- **Cascade audit pattern** — when P-series batches claim "X deferred to P23+" / "P22+ candidates" / "P23b+ candidates" in specs/plans/memory files, those claims propagate across 4-8 batches without re-verification. **Every P-series memory file should have either a commit ref (closed) or a concrete trigger criterion (DEFER UNTIL: ...) for any pending item.** Vague "periodic review" / "may need audit" / "X fails remain baseline" lines are code smell — convert to trigger or close. Pattern formalized in P27 + extended in P28/P30/P31 (memory files → project memory → specs → plans → CLAUDE.md invariant check).
- **GH Action `sync-pricing.yml` cron can fire during push window** — `.github/workflows/sync-pricing.yml` triggers on push to `ai-pricing.json` / `codegen-customfn.mjs` / `sync-pricing.mjs` / the workflow file itself, AND on Monday 06:00 UTC cron. During a push, the action can commit a divergent SHA (e.g. LiteLLM sync) onto github while your local push is in flight, causing silent rejection. **Pre-push fetch both remotes immediately before each push** (`git fetch origin && git fetch github`) and check divergence; if found, resolve via `reset + cherry-pick + force-with-lease` (see P43 ship memory §Ship Sequence for the worked example with tree-hash verification).
- **Pre-push hook may report false-negative `ahead=0`** — after `git push origin master` succeeds, the local hook that checks `ahead=N` for the next remote's push can misread ahead count (origin push refreshed local state, making local look "current"). When the hook blocks a github push with "ahead=0" but the commit is verifiably not yet on github, **bypass the hook via `git -c core.hooksPath=/dev/null push <remote> <branch>`** — this skips the wrapper hook entirely. See P44 ship memory §Ship Sequence step 6-7 for the worked example.

## Communication Style

- **Page layout / UI structure**: When discussing page layouts, component arrangements, or UI structure, prefer visual communication — use ASCII diagrams, wireframe mockups, or component tree sketches to convey the design, not text descriptions alone.

## Superpowers Workflow (自动编排) ★

收到指令先分类，再动手。不要先问问题、先读代码、先解释——先分类，先调 Skill。

**默认走严格流程**（先看触发器）；快速通道是例外，需 6 条全部满足才放行。

### 强制自检 — 收到任务先对照触发器

收到任何任务，先逐条对照，**命中任意一条即强制调 Skill**（包括用户在"继续/可以/开始"等快速通道词）：

| 触发信号（命中任意一条）                                       | 必走 Skill                                   |
| -------------------------------------------------------------- | -------------------------------------------- |
| 涉及**字段命名/重命名/字典映射/接口字段对齐**                  | `superpowers:brainstorming`                  |
| 用户说**"不显示/没生效/错了/失败/没出来/不对"** 等失败信号     | `superpowers:systematic-debugging`           |
| **改动 ≥ 2 个文件** 或跨模块/跨层                              | `superpowers:writing-plans`                  |
| 用户说**"做完/完成/好了/提交吧"**                              | `superpowers:verification-before-completion` |
| 涉及**API/数据契约/字段含义** 变更                             | `superpowers:brainstorming`                  |
| 已有 plan 文件 + 用户说"执行/继续"                             | `superpowers:executing-plans`                |
| 写完复杂改动、commit 前                                        | `superpowers:requesting-code-review`         |
| 涉及**合并/PR/发布/收尾**                                      | `superpowers:finishing-a-development-branch` |
| **plan/设计/契约与现状不一致**（执行时发现现状已与文档脱节）   | 停止 + 报告差异，**不擅自继续**              |
| 任务中发现自己**在做关键推断**（如"两个接口字段一样可以合并"） | 暂停 + 把推断说出来让用户确认                |

### 快速通道（**仅**全部满足才能跳过 Skill）

- 单文件改动
- 用户已精确指定每个修改点（无歧义）
- 不涉及接口、字段、状态、数据流、契约
- 没有 bug 排查成分
- 不是清理/重构动作
- 没有命中上方触发器表的任何一行

任意一条不满足 → 必须走对应 Skill。

### 推荐执行链

从上到下串联，不跳步：

```
新功能/新模块:
brainstorming → writing-plans → executing-plans → requesting-code-review → verification-before-completion

Bug修复:
systematic-debugging → verification-before-completion

重构/跨文件改动:
writing-plans → executing-plans → requesting-code-review → verification-before-completion
```

### 红线动作（违反即视为未走流程）

- **绝不在调 Skill 前**输出任何"我来帮你xxx" / "我看看" / "让我先读一下" / "我先排查" — 调 Skill 必须是**第一条输出**
- **绝不**用 Read/Grep 替代码逻辑推理 — 结构问题（"X 怎么调到 Y"、"X 是怎么实现的"）必须先 `codegraph_context` / `codegraph_trace`
- **绝不**基于"看起来简单"跳过 Skill — 用户描述含"不显示/错了/没生效"等失败信号，**默认就是 bug**，必须走 `systematic-debugging`
- **绝不**在 Skill 触发后跳过其内部步骤（即使是简单的"快速通道"，触发器命中就必须走完）

### 反模式案例（不得重演）

| 用户说             | 错误做法                                | 正确做法                                                                            |
| ------------------ | --------------------------------------- | ----------------------------------------------------------------------------------- |
| "总数柱没显示"     | 猜是 legend 状态问题，加 `selected: {}` | 走 `systematic-debugging`，**先看接口返回**——根因是字段名错读（`total` vs `count`） |
| "红灯不亮"         | 直接改 hook.cjs，猜了两次原因           | 走 `systematic-debugging`，**先写最小复现 + 观察日志**                              |
| "表格不显示"       | 直接看 template 找 undefined 风险       | 走 `systematic-debugging`，**先看接口返回 + 浏览器报错**                            |
| "加交互式 label"   | 改了两次间距被退回                      | 走 `brainstorming`，**先确认交互行为**（点击切换 vs 跳转）                          |
| "改成 XXX 字段名"  | 直接全局替换                            | 走 `brainstorming`，**先确认全部消费点 + 契约变更影响**                             |
| "显示不对"         | 改模板、加 fallback                     | 走 `systematic-debugging`，**先验证数据契约**（后端实际返回什么）                   |
| "两个接口字段一样" | 直接合并、删旧 API                      | 走 `systematic-debugging`，**先验证空数据/异常路径**——字段相同 ≠ 行为相同           |

### 强制规则（不可跳过）

0. **Skill 调用必须可见** — 每次调 Skill 前**用一句话说明调用目的**（例："这是 bug 排查，调 `superpowers:systematic-debugging`"）。无理由的 Skill 调用 = 没调
1. **先匹配，后说话** — 收到用户第一条消息，先对决策路由表（注意快速通道），命中即调 Skill，调完 Skill 再回复。不允许先说"我来帮你xxx"再调 Skill。**陈述假设、呈现权衡**——面临多种实现路径时，列出选项和利弊，不替用户做选择。有更简单的方案时主动提出
2. **先读懂，再动手** — 改文件前必须先读文件，理解其职责、数据流和上下游关系。不确定时用 `codegraph_context` 或 `codegraph_trace` 摸清调用链。禁止在不理解代码意图的情况下修改
3. **TDD 按场景** — 新写纯函数/工具函数/数据映射逻辑前先写测试。接入 API、替换 mock、简单 CRUD 等已有测试覆盖的场景不需要 TDD
4. **拒绝假测试** — 测试必须验证真实行为，禁止以下形式：
   - 空断言（`expect(true).toBe(true)`）
   - 仅测 mock 不测真实逻辑
   - 绕过核心逻辑只测无关细节
   - 为覆盖率而写的无用测试
     每条测试用例失败时能准确指出哪里坏了，才是有效测试
5. **简洁优先** — 只写解决问题所需的最少代码。不为单次使用创建抽象层，不添加未被要求的"灵活性"或"可配置性"，不为不可能发生的场景写错误处理。如果 200 行能变 50 行，重写它。试金石：高级工程师看了会说"过度设计"吗？
6. **精准变更** — 只改必须改的代码，不动相邻代码。不重构没坏的东西，不顺手改格式/注释/import 排序。匹配现有代码风格，即使你更倾向另一种写法。发现无关死代码 → 提出来，但不要擅自删除。测试：每一行改动都必须能追溯到用户的请求
7. **提交前过质量门禁** — 每次 commit 前必须 `pnpm check`（typecheck + test:run），零错误才能提交。复杂改动可额外调 `Skill("superpowers:requesting-code-review")`
8. **冲突不妥协** — 合并冲突、架构冲突、需求与现状矛盾时，不走捷径、不掩盖、不强行合并。先理解双方意图，再决定保留/舍弃/重构，不确定时列出选项给用户决断
9. **问题必报** — review 或 test 发现问题，列表给用户，由用户决断，不擅自改。遇到不确定、不理解、无法验证、推断依据不足的情况，**立即说出来 + 暂停 + 等用户确认**，绝不默默继续。这是触发器表"做关键推断要暂停"的执行细则
10. **Skill 工具优先** — 用 `Skill` 工具调用技能，不要用 Read 读技能文件
11. **代码注释** — 以下位置必须写注释，给新人看的：
    - **数据流/调用链** — 跨接口编排（如"柱状图+环形图数据来自 A 接口，表格数据来自 B 接口"）
    - **字段映射** — API DTO → UI 字段的非同名转换（如 `finished_count` → 表格"已完结"列）
    - **非显而易见的业务规则** — 如百分比转换、状态码映射、秒数格式化公式
    - **不用写** — 自解释代码、Vue/Element Plus 框架常识

### 防偷懒规则（不可跳过）★

这些规则针对一个反复出现的问题：Claude 只完成"基础设施"或"单个入口"，但遗漏了需要同样改动的其他消费者页面。

**1. 端到端完备 — 不交付"半截功能"**

改一个功能时，必须追溯到**所有消费端**。典型反例：

- 只改了共享组件（如 `DownloadRecords`），但没把所有页面的 `onExport` 接进去
- 只改了 API 定义，但没把调用方从 mock 换成真实接口
- 只改了一个 tab 的逻辑，但没改同页面其他 tab

**正确做法**：接到功能需求后，先搜索全局找出**所有相关点**，列出清单，逐一处理。清单未清零 = 功能未完成。

**2. 主动全域扫描 — 动手前先摸底**

改功能前必须：

```bash
# 搜索所有可能受影响的文件
grep -rn "关键词" src/
```

扫描后输出影响面清单，逐层确认：

| 层级       | 是否受影响 | 具体文件/符号 |
| ---------- | ---------- | ------------- |
| API        | □          |               |
| Store      | □          |               |
| Hook       | □          |               |
| Component  | □          |               |
| View       | □          |               |
| Route      | □          |               |
| Permission | □          |               |
| Test       | □          |               |
| Util       | □          |               |
| Layout     | □          |               |

所有勾选项必须检查，不得遗漏。

**3. 自问"还有什么" — 声称完成前的自查**

每次说"完成"之前，反问自己三个问题：

- 还有没有其他页面/组件/模块需要同样的改动？
- 所有占位符/空函数都处理完了吗？
- 用户描述的场景从头到尾能走通吗？

三个问题任意一个回答"不确定"或"没查过"，那就还没完成。继续查，继续改。

**4. 真实案例回顾**

以下对话模式**每次都要识别**，不得重演：

| 用户说          | 典型错误做法        | 正确做法                             |
| --------------- | ------------------- | ------------------------------------ |
| "接入真实 API"  | 只改了共享组件      | 搜索所有调用方/占位符，每一处都接入  |
| "完善 X 功能"   | 只改了一个页面/入口 | 检查所有相似页面/入口是否同样需要改  |
| "替换/迁移 XXX" | 改了一处就停        | 全局搜索旧调用，全量替换，确认无残留 |

**5. 覆盖率终验 — 宣布完成前的最后一道关**

每次声称"完成"前，必须执行（按项目实际情况增删关键词）：

```bash
grep -rn "TODO" src/
grep -rn "FIXME" src/
grep -rn "mock" src/          # JS/TS 项目；其他语言删
grep -rn "placeholder" src/
grep -rn "开发中" src/         # 中文项目；其他语言替换
```

确认无残留的 TODO、mock 调用、占位逻辑、空实现、临时代码。有任一命中 → 未完成，继续处理。

# Lazy mode — 写代码前先走这 7 级阶梯

1. 这个东西真的需要存在吗？（YAGNI）
2. 代码库里已经有的吗？复用，别重写
3. 标准库已经做了吗？用它
4. 原生平台 API 能覆盖吗？用它
5. 已装依赖能解决吗？用它
6. 能一行写完吗？就一行
7. 以上都不行，才写满足要求的最小代码

# ——不省的地方（必须保留）——

- 理解问题本身：先把任务和涉及的代码读完、顺着真实流程 trace 一遍再下手
- 信任边界的输入校验
- 防止数据丢失的错误处理
- 安全
- 可访问性
- 硬件相关场景的实测校准（平台永远不是理想规格）

# ——代码留痕规则——

非平凡逻辑必须留一个能跑的最小自检（assert 演示或单文件测试，不要框架、不要 fixture），
trivial 一行代码不用写测试。简化的地方用 `ponytail:` 注释标出来，
写明已知上限（比如 O(n²)、全局锁、naive 启发式）和升级路径。
