# P1-3 Engine Factory 抽象 — 决策 spec（不实施）

**Date:** 2026-06-29
**Status:** Approved（user: "可以"）
**Branch:** `v2_20260626`
**Predecessors:**
- P1-1 JSON-LD Schema Factory（shipped, commit `760fcf3`）
- P1-2 Blog Markdown 迁移（shipped, commit `cfacff9`）
- ChatGPT 反馈（2026-06-25 / 2026-06-27 两轮）

## Context

P1 系列原计划包含 3 个 spec：

| # | Spec | 实施状态 |
|---|---|---|
| 1/3 | JSON-LD Schema Factory 统一 | ✅ shipped as P1-1 |
| 2/3 | Blog Markdown 迁移 | ✅ shipped as P1-2 |
| 3/3 | createCalculator 工厂抽象 | ❌ **本 spec：决策不实施** |

ChatGPT 在 2026-06-25 / 2026-06-27 两轮反馈中建议引入 `createCalculator({...})` 工厂函数抽象 engine 创建 boilerplate（见 `docs/superpowers/specs/2026-06-27-content-depth-pages-design.md:398`）。本 spec 记录对该建议的评估结论。

## Decision

**不实施 createCalculator 工厂抽象。P1 系列至此关闭（3/3 spec 完成：1 实施 + 1 实施 + 1 不实施决策）。**

## Reasoning

| # | 理由 | 证据 |
|---|---|---|
| 1 | 引擎形态高度异质，抽象成本 ≫ 收益 | 24 business 引擎 `calculate()` 各自领域数学（MRR / 估值 / LTV / 员工成本 等），8 AI 引擎 data-driven 读 `PRICING.json` + `codegen-customfn.mjs` 自动生成 customFn，`clientConfig` 三型（templates / combinations / custom）。强行抽象 = 多 overload 或参数爆炸，比直写还复杂 |
| 2 | 现有抽象层已经足够 | `src/core/engines/helpers.ts` 已抽 4 个生成层工具（`randomPick` / `fillTemplate` / `generateFromTemplates` / `generateCombinations`）；`registry.ts` 提供 `registerEngine` / `getEngine` / `getAllEngines`；`types.ts` 定义 `ToolEngine` interface。三层各司其职，再加 factory = 第 4 层冗余 |
| 3 | P1-1 工厂成功 ≠ P1-3 工厂成功 | P1-1 成功条件：32 工具页 schema shape **完全统一**，factory = 共享 3 个 helper。P1-3 场景：engine shape **不统一**，factory 没有"统一形状"可抽 |
| 4 | 最近 commits 显示 engines 已稳定组织 | `89124ff refactor(tools): split tools.ts into 6 category files + index.ts`（已按 category 拆分）+ `0dbf970 fix(ab-split): replace import.meta.glob with explicit imports for tsx`（import 机制已优化）。没有"engine 创建冗长"的反馈记录 |
| 5 | P1-3 价值是"代码组织"，P1-1 / P1-2 是"用户价值" | P1-1 schema factory → 用户可见（SEO）；P1-2 Blog Markdown → 用户可见（内容现代化）；P1-3 engine factory → 仅代码组织，**零用户价值**。P1 系列的战略价值在用户面，不在抽象面 |
| 6 | YAGNI / 简洁优先 | 32 引擎重写 = 32 文件 diff + 4 codegen 脚本适配 + 32 customFn 重写 + spec + plan + holistic review + 测试 + push。边际收益仅 ~64 行 boilerplate 节省，ROI 极差 |

## Alternatives Considered

### Option A: 极薄 wrap（仅 registerEngine 包装）
- **范围**：仅 wrap `registerEngine` + 提供默认 props
- **收益**：32 引擎 × 2 行 ≈ 64 行节省
- **评价**：边际价值，零架构改善。**不推荐**。

### Option B: 中等抽象（重塑 engine shape）
- **范围**：拆分 `calculate` / `staticExamples` / `faq` / `howToUse` 为独立模块
- **收益**：代码表面更优雅
- **成本**：32 文件 diff + 4 codegen 脚本适配 + 32 customFn 重写 + 测试 + push
- **评价**：ROI 极差。**不推荐**。

### Option C: 不做工厂（推荐）
- **范围**：本 spec 决策
- **收益**：节省实现成本 + 维持现有清晰分层
- **评价**：详见 Reasoning 6 条理由。**✅ 采纳**。

## Revisit Conditions

以下任一条件触发时，重新评估本决策：

1. **新增工具需求 > 5 个** → factory 降低门槛的价值开始显现
2. **engine 创建出现具体痛点反馈**（如"重复模式难维护"）
3. **`calculate()` 逻辑出现共享层**（如通用格式化、通用统计）→ factory 自然浮现
4. **`clientConfig` 形态收敛到 ≤ 2 种** → 抽象面变窄，工厂变得简洁

当前 4 个条件均不成立。

## Out of Scope

ChatGPT 反馈中的其他建议（已分类）：

| 建议 | 分类 | 状态 |
|---|---|---|
| LocalStorage 收藏 / 历史 / 最近 | 商业化层 | out of P1 |
| PDF 导出 | 用户功能 | out of P1 |
| AI Explain | 用户功能 | out of P1 |
| SearchBar 多字段 | 内容 / SEO | out of P1（可能在 P2 考虑） |
| data 分层 | 重构级 | out of P1 |
| components 子目录 | 重构级 | out of P1 |
| RelatedTools 分组 | 用户功能 | out of P1 |
| **Engine `createCalculator({...})` 抽象** | 代码组织 | **本 spec：不做** |

## Current Engine Architecture（决策时的现状）

```
src/
├── core/engines/
│   ├── types.ts        ToolEngine interface（7 必填 + 1 可选字段）
│   ├── registry.ts     registerEngine / getEngine / getAllEngines
│   └── helpers.ts      randomPick / fillTemplate / generateFromTemplates / generateCombinations
└── engines/
    ├── index.ts        6 子目录 side-effect import 聚合
    ├── saas/           5 引擎
    ├── ai-cost/        8 引擎（data-driven, codegen-customfn.mjs 自动同步 PRICING.json）
    ├── valuation/      9 引擎
    ├── freelance/      3 引擎
    ├── cost/           3 引擎
    └── investment/     4 引擎
```

## Acceptance

- [x] P1 系列 3 spec 状态明确：1 实施 + 1 实施 + 1 不实施决策
- [x] Reasoning 列出具体证据（6 条 + commit hash）
- [x] Alternatives 列出 A / B / C 三选项 + 推荐
- [x] Revisit 条件明确（4 条触发器）
- [x] Out of Scope 标记 ChatGPT 其他建议
- [x] 无代码改动
- [x] 无 engines 业务逻辑改动（CLAUDE.md 冻结约束遵守）
- [x] 不动 `engines/`、`data/tools/`、`data/ai-pricing.json`、`i18n/translations.ts`、`astro.config.mjs`