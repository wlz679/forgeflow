# Engines Category Field Drift Fix — Design Spec

**Date**: 2026-06-26
**Status**: Draft (pending user review)
**Author**: brainstorming session
**Scope**: Remove dead `category` field from 32 engine files + ToolEngine type + CLAUDE.md example
**Roadmap position**: Foundation prerequisite for A+B spec (engines/ subdirectory + tools.ts split)

## Problem

`src/engines/*.ts` 每个文件都有 `category: 'X'` 字段，但**没有任何代码消费它**：

- `src/engines/index.ts` 不消费（已 grep 确认）
- `src/core/engines/registry.ts` 只读 `slug`，不读 `.category`（已 Read 确认）
- 全 `src/` grep `\.category\b` 仅命中 types.ts 定义 + 32 个 engine 字面量赋值（已 grep 确认）

而 `src/data/tools.ts` 的 `categoryId` 字段才是真实的分类数据源，被以下实际消费：

- `src/data/application-categories.ts` —— 用 `categoryIdToApplicationCategory(id)` 映射到 schema.org
- `src/data/internal-links.ts` —— 用 `categoryId` 做同分类推荐
- 页面渲染（`src/pages/[lang]/[slug].astro` 和 components）

**结果：两套分类数据已 drift**。32 个工具中 13 个 engines/.ts 的 category 字段和 tools.ts categoryId 不一致（约 40%）：

| 错位 examples | tools.ts categoryId | engines/.ts category |
|---|---|---|
| cac-calculator | C (Valuation & Exit) | B |
| ltv-calculator | C | B |
| saas-valuation-calculator | C | B |
| affiliate-income-calculator | D (Freelance Pricing) | C |
| break-even-calculator | C | A |
| employee-cost-calculator | E (Cost & Efficiency) | D |
| meeting-cost-calculator | E | D |
| equity-dilution-calculator | F (Investment & ROI) | E |
| freelance-rate-calculator | D | C |
| freelance-tax-calculator | F | E |
| hourly-vs-fixed-calculator | D | C |
| sponsorship-rate-calculator | F | E |
| time-value-calculator | F | E |

Drift 当前**没有运行时症状**（因为没有消费者），但**正在污染 A+B spec 的设计**——如果按 engines/.ts category 拆目录，40% 工具会去错位置。

## Goals

1. **单一分类数据源**：删除 engines/.ts 的 `category` 字段，统一以 `tools.ts` 的 `categoryId` 为真相
2. **Drift 不可能再发生**：未来新增 engine 如果手滑加 `category`，会被 `tsc` 报错（类型不允许）
3. **零 public API 变更**：外部消费者（页面、components、其他 data 文件）无感知
4. **零新文件、零新依赖**
5. **总 diff ≤ 35 行**（机械删除 + 文档同步）

## Non-Goals

- 重做 `categories.ts` 的 6 类语义（保持 A-F 不变）
- 拆 `tools.ts`（那是 A+B spec 的事）
- 拆 `engines/` 目录（那是 A+B spec 的事）
- 改 `application-categories.ts` 或 `internal-links.ts`
- 改 `engines/` 任何业务逻辑（`calculate()` / `customFn` / `staticExamples` / `faq` / `howToUse`）
- 引入 category 字段的替代品（如 `categoryResolver()` 函数）—— YAGNI

## Design

### 1. 删除 `ToolEngine.category` 类型字段

**文件**: `src/core/engines/types.ts`

```diff
 export interface ToolEngine {
   slug: string;
   title: string;
   description: string;
-  category: string;
   inputs: ToolInput[];
   clientConfig: ClientConfig;
   generate(inputs: Record<string, string>): string[];
   staticExamples: string[];
   faq: { q: string; a: string }[];
   howToUse: string[];
   dataLastUpdated?: string;
 }
```

删除后，未来新增 engine 即使手写 `category: 'X'`，TypeScript 会立即报错（"Object literal may only specify known properties"）。

### 2. 删除 32 个 engine 文件的字面量字段

**文件**: `src/engines/*.ts` × 32

每个文件删一行（`grep` 显示两种引号风格都要处理）：

```diff
 const engine: ToolEngine = {
   slug: 'solopreneur-...',
   title: '...',
   description: '...',
-  category: 'B',   // 或 category: "A", 两种风格都有
   inputs: [...],
   ...
 };
```

涉及文件清单（按字母序）：

```
affiliate-income-calculator.ts
ai-api-cost-comparison.ts
ai-image-generation-cost-calculator.ts
ai-training-cost-estimator.ts
break-even-calculator.ts
burn-rate-calculator.ts
cac-calculator.ts
churn-rate-calculator.ts
claude-api-cost-calculator.ts
course-pricing-calculator.ts
deepseek-api-cost-calculator.ts
email-list-revenue-calculator.ts
employee-cost-calculator.ts
equity-dilution-calculator.ts
freelance-rate-calculator.ts
freelance-tax-calculator.ts
gemini-api-cost-calculator.ts
gpu-cloud-cost-calculator.ts
hourly-vs-fixed-calculator.ts
ltv-calculator.ts
market-size-estimator.ts
meeting-cost-calculator.ts
mrr-calculator.ts
openai-token-calculator.ts
productivity-score.ts
project-profitability-calculator.ts
revenue-projector.ts
saas-pricing-planner.ts
saas-valuation-calculator.ts
sponsorship-rate-calculator.ts
time-value-calculator.ts
unit-economics-calculator.ts
```

**单引号 vs 双引号**：实施前先 grep 列出实际引号风格，匹配各自的字面量精确字符串做 Edit 替换（不能跨风格 replace_all）。两个 grep 结果已确认两种风格都存在：

- 单引号：例如 `category: 'B',`（27 个）
- 双引号：例如 `category: "A",`（5 个：burn-rate / break-even / market-size / mrr / openai-token / revenue-projector / unit-economics 等 — 实施时以实际为准）

### 3. 同步 CLAUDE.md 示例

**文件**: `CLAUDE.md` line 77

```diff
 const engine: ToolEngine = {
   slug: 'solopreneur-my-calc',
   title: 'My Calculator',
   description: '...',
-  category: 'B',
   inputs: [{ name: 'foo', label: 'Foo', type: 'number' }],
   clientConfig: { type: 'custom', wordPools: {}, customFn: '...' },
   generate(inputs) { /* returns string[] */ },
   staticExamples: ['...'],
   faq: [{ q: '...', a: '...' }],
   howToUse: ['...'],
 };
```

防止未来按 CLAUDE.md 示例创建 engine 时又把 category 加回去。

### 4. 不动的东西（明确边界）

- `src/data/tools.ts` —— categoryId 已经是真相，不动
- `src/data/categories.ts` —— 6 类语义不变
- `src/data/application-categories.ts` —— 消费 tools.ts，不变
- `src/data/internal-links.ts` —— 消费 tools.ts，不变
- `src/core/engines/registry.ts` —— 只读 slug，与 category 无关
- 任何 page / component —— 不引用 `engine.category`

## Files Touched

| 文件 | 操作 | 行数 |
|---|---|---|
| `src/core/engines/types.ts` | 删 `category: string;` | −1 |
| `src/engines/*.ts` × 32 | 各删 `category: 'X',` 或 `category: "X",` | −32 |
| `CLAUDE.md` | 删示例里的 `category: 'B',` | −1 |
| **合计** | | **−34** |

无新增文件。

## Acceptance Criteria

- [ ] `src/core/engines/types.ts` 第 21 行 `category: string;` 已删除
- [ ] 32 个 `src/engines/*.ts` 文件的 `category:` 行全部删除（grep `^  category:` in src/engines 应返回 0 行）
- [ ] `CLAUDE.md` line 77 示例中的 `category: 'B',` 已删除
- [ ] `pnpm check`（typecheck + test:run）通过，0 errors
- [ ] `pnpm build` 通过，141 static pages 全部产出
- [ ] Spot check 1：访问 `/en/solopreneur-cac-calculator` 页面正常渲染，RelatedTools 区块显示同分类工具（证明 tools.ts categoryId 仍被正确消费）
- [ ] Spot check 2：访问 `/en/solopreneur-openai-token-calculator` 页面正常渲染（AI Cost v3 类）
- [ ] `git diff --stat` 显示总改动 ≤ 35 行（不含可能的自动生成的 changelog）
- [ ] 全 `src/` grep `\.category\b` 应仅命中 `application-categories.ts` / `categories.ts` / `tools.ts` / `internal-links.ts` 等**消费者**，不再命中任何 `src/engines/*.ts`

## Risks & Mitigations

| 风险 | 缓解 |
|---|---|
| 删 `category` 后某隐藏消费点 break | 实施前已 grep 全 src/（含 .astro），仅命中类型定义 + 32 个字面量赋值；运行时引用 0 处 |
| 32 个文件 Edit 操作漏改 | 用 `replace_all` + 两种字面量分别处理；改完用 `grep ^  category: src/engines/*.ts` 验证返回 0 行 |
| 未来新 engine 误加 category（破坏类型） | 这是**预期收益**（drift 从源头被堵住），不是风险 |
| CLAUDE.md 示例忘改 → 新人参照错例 | spec 明确点出 line 77；实施步骤里有 CLAUDE.md 更新项 |
| `pnpm build` / `pnpm check` 失败 | 阻塞 commit，按错误信息逐个修；理论上不应该失败（删除孤字段不会触发新错误） |

## Out-of-Scope 备注

本次 spec 不做的事，未来 spec 接续：

- **A+B spec**：在 drift 修复**之后**才能正确做（分类映射以 tools.ts categoryId 为准）。Blocked by this spec。
- **C spec**：internal-links 自动推荐。依赖 A+B 落地的分类目录。
- **D spec**：JSON-LD Schema 工厂。
- **E spec**：内容/SEO 层升级（FAQ→metadata、Blog→MD、Category Page 增强、About EEAT）。
- **F spec**：用户功能层（收藏/历史/分享/PDF/AI Explain），独立模块。

## Open questions

None. 设计已与用户确认（brainstorming session 2026-06-26 决定走"删除字段"方案）。