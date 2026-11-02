// P165 —— 分类页「决策层」的数据形状（从 src/data/category-decision-layers.ts 拆出）。
//
// 拆分的理由：P165 要给 14 个分类各写一份决策层（92 行工具取舍对照表 + 各 3-4 步选型链），
// 单文件会变成一个几千行的巨型模块 —— 既难审、也**没法并行写**（并行写同一个文件必然冲突）。
// 拆成「每分类一个文件」之后：
//   · 每个文件都很小，可独立审、独立验字节；
//   · 多个 worker 可以各写各的文件，互不重叠；
//   · index.ts 只做合并，不含内容。
//
// 设计说明（哪些是硬约束、为什么）见 index.ts 顶部的注释。
export type DecisionLang = 'en' | 'zh';

export interface DecisionChainStep {
  /**
   * 这一步用到的工具（≥ 1）。
   * 多个 = 「按你实际在用的那家 / 那类场景选一个」，不是「全部都要跑」。
   */
  slugs: string[];
  /** 这一步在回答什么问题（页面独有的决策说明，不是工具简介的复述） */
  purpose: Record<DecisionLang, string>;
}

export interface ToolChoiceRow {
  /** 工具 slug —— 必须存在于 src/data/tools 注册表且属于该类别 */
  slug: string;
  /** 它回答什么问题 */
  answers: Record<DecisionLang, string>;
  /** 什么时候该用它（而不是别的那个） */
  useWhen: Record<DecisionLang, string>;
}

export interface CategoryDecisionLayer {
  /** 选型链路的一句话导语 */
  chainIntro: Record<DecisionLang, string>;
  /** L1：选型链路 */
  chain: DecisionChainStep[];
  /** L2：工具取舍对照表 */
  choices: ToolChoiceRow[];
}
