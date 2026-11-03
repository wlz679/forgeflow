// P166 —— 主题页两种新形态的数据形状（「修复优先级表」+「达标清单」）。
//
// 为什么单独一层
// ------------
// 原计划是把 src/data/topic-content.ts（2,900 行 / 980 KB）拆成每主题一个文件。
// 执行前取证发现它被两个东西按文本解析：
//   1. scripts/audit-gemini-extractability.mjs —— 用文本 indexOf 切块 + 正则抓主题对象。
//      拆了它抓不到 ⇒ 审计报告会悄悄少报几个主题（比直接报错更坏）。
//   2. src/data/price-claim-surface-ledger.ts —— 价格主张台账把 topic-content.ts 记成价格入口；
//      tests/price-claim-surface-ledger-guard.test.ts 反向要求「全仓扫出的每个价格入口都必须
//      登记」⇒ 拆了它要连带改台账 + 守卫的硬编码清单。
//
// ⇒ 改案：新形态放进独立的一层 src/data/topic-priority/，topic-content.ts 一个字节都不动。
//   每主题一个文件 ⇒ 下一批铺其余 42 个主题时可以并行写、互不冲突。
//
// 这两种形态与既有内容的区别（P165 取证结论：照搬既有散文 = 抄写自己）：
//   · howToUse（基准页）= 「选哪一行 → 单一动作」—— 一个指标 → 一件事
//   · howToApply（指南页）= 「Step N 编号链」—— 按顺序做什么
//   · fixPriority = 「多个指标都不达标 → 先修哪个 → 它会带动谁 → 什么时候会反过来拖累另一个」
//   · readinessChecklist = 「每一步的达标线」—— 不达标就别往下走

/**
 * P166 —— 「修复优先级表」：多个指标同时不达标时，先修哪个。
 */
export interface TopicFixPriorityRow {
  priority: number;   // 1 = 最先修；必须 1..N 连续
  metric: string;
  fixFirst: string;
  alsoMoves: string;
  backfire: string;
}

/** P166 —— 「修复优先级表」整体（导语 + 行）。 */
export interface TopicFixPriorityTable {
  intro: string;
  rows: TopicFixPriorityRow[];
}

/** P166 —— 「达标清单」：每一步的达标线；不达标就别往下走。 */
export interface TopicReadinessItem {
  step: number;      // 对应 howToApply 的第几步
  label: string;     // 这一步在做什么（短）
  gate: string;      // 达标线
  blockIf: string;   // 不达标时卡在哪
}

/** P166 —— 「达标清单」整体（导语 + 项）。 */
export interface TopicReadinessChecklist {
  intro: string;
  items: TopicReadinessItem[];
}

/** 一个主题的新形态内容（两种语言各一份）。 */
export interface TopicPriorityContent {
  fixPriority: { en: TopicFixPriorityTable; zh: TopicFixPriorityTable };
  readinessChecklist: { en: TopicReadinessChecklist; zh: TopicReadinessChecklist };
}
