// P165 — 2.0「灵魂改造」批次 1：分类页的「决策层」（Category Decision Layer）。
//
// 这是 D6 拍板的批次 1（分类页 19 页，1,789 展示，全站 13.4%，**0 点击**）的内容形态。
// P159 先用 1 个类别（AI Cost Tools）做样板跑通形态与验收判据；
// **P165 把剩下 14 个分类全部铺开** —— 样板阶段就写明「跑通后铺其余 11 个类别」，
// 这次补上（实测：15 个分类里当时只有 1 个有决策层，19 个有展示的分类页里 18 页是空的）。
//
// ── 这一层为什么必须存在 ──────────────────────────────────────────
//
// 实测（GSC 网页表，2026-07-26 → 2026-10-25）：
//   分类页 19 页 = 1,789 展示 = 全站 13.4%，**0 点击**，加权排名 38.6。
//   19 个分类页的正文词数中位只有 655（英文页 620）。
//   组内「模板词」占比 **12.6%** —— 19 个分类页共用同一副「描述骨架」，
//   是全站唯一带组内模板词的一类 ⇒ AdSense 最可能采样的那类页面。
//
// 所以分类页缺的不是「更多字」，而是**这一类工具该怎么组合使用**的答案。
// 下面这两层正是那个答案：
//
//   L1 选型链路（chain）——「先做 A，再做 B，最后校准 C」
//   L2 工具取舍对照（choices）——「每个工具回答什么问题、什么时候不该用它」
//
// ⚠️ 与主题页的差别（这是 P165 取证时才发现的，别照搬错）：
//   主题页**已经有**这两样东西的散文形态 —— 基准页的 `howToUse` 是逐档阈值解读，
//   指南页的 `howToApply` 是编号步骤链 ⇒ 在主题页上再加一层 = 抄写自己 ⇒
//   主题页的形态要另定（2026-11-02 用户拍板：基准页做「定位表」+ 指南页做「门槛清单」），
//   **不在本批**。
//   而分类页**真的缺**：实测它们只有「1 段分类描述 + 工具网格」，零解读散文。
//
// ── 两条硬约束 ────────────────────────────────────────────────────
//
// 1. **不搬运主题页的基准表。** 那是站内自己制造重复内容，正是 §10.1【C】
//    刚证明要避开的那条线。分类页给的是**决策层**，主题页给的是**基准表**。
// 2. **不写价格。** 主题页基准表里的价格目前是手写的静态值，与实时数据集
//    已经漂移（实测 6 行漂移，最严重的一条输出价差 8.33 倍）⇒ 在价格改成
//    从 `src/data/ai-pricing.json` 派生之前，分类页**不发布任何价格**。
//    ⇒ L3「阈值速查」层被这项工作阻塞，暂不实现（见规格文档 §11.4 —— 原写 §10.5，但该规格根本没有 §10.5，只有 §10.1–§10.4；P164 修正这条断链）。
//
// ── 数据形状 ──────────────────────────────────────────────────────
//
// 每个 step 的 slugs 可以有多个 —— 表示「这一步按你实际情况选一个」，
// 不是「这些工具串起来都要跑一遍」。choices 必须覆盖该类别的**每一个**工具
// （守卫钉住），否则用户会在对照表里找不到自己的工具。
import type { CategoryDecisionLayer } from './types';
import { A } from './a';
import { B } from './b';
import { C } from './c';
import { D } from './d';
import { E } from './e';
import { F } from './f';
import { H } from './h';
import { K } from './k';
import { L } from './l';
import { M } from './m';
import { O } from './o';
import { P } from './p';
import { R } from './r';
import { S } from './s';
import { T } from './t';

export const CATEGORY_DECISION_LAYERS: Record<string, CategoryDecisionLayer> = {
  A,
  B,
  C,
  D,
  E,
  F,
  H,
  K,
  L,
  M,
  O,
  P,
  R,
  S,
  T,
};

/** 取某个类别的决策层；没有配置就返回 null（调用方据此不渲染该区块） */
export function getCategoryDecisionLayer(categoryId: string): CategoryDecisionLayer | null {
  return CATEGORY_DECISION_LAYERS[categoryId] ?? null;
}

export type { DecisionLang, DecisionChainStep, ToolChoiceRow, CategoryDecisionLayer } from './types';
