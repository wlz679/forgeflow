// P166 —— 主题页新形态（「修复优先级表」+「达标清单」）的装配层。
//
// 这一层是新增的，不寄生在 src/data/topic-content.ts 上 —— 原因见 types.ts 顶部：
// topic-content.ts 被审计脚本与价格台账按文本解析，拆它会连带改两处依赖
// （审计会悄悄少报几个主题，比直接报错更坏）。
//
// 装配方式：显式 import + 显式装配（不做目录扫描）——
//   · 顺序 = 试点名单顺序 ⇒ 渲染层的输出顺序可预期
//   · 加一个主题 = 加一个文件 + 在下面两处各加一行 ⇒ 下一批铺 42 个主题时可并行写
//
// 试点名单（3 个：1 个 B 类 + 1 个 C 类 + 1 个 R 类）
//   · llm-api-cost-optimization  （B —— 价格重 ⇒ 必须走 live token 派生）
//   · customer-acquisition-cost   （C）
//   · net-revenue-retention       （R）
import type { TopicPriorityContent } from './types';
import { priority as llmApiCostOptimization } from './llm-api-cost-optimization';
import { priority as customerAcquisitionCost } from './customer-acquisition-cost';
import { priority as netRevenueRetention } from './net-revenue-retention';

/** P166 试点名单（3 个：1 个 B 类 + 1 个 C 类 + 1 个 R 类）。铺开到 42 个时只改这里 + 加文件。 */
export const PILOT_PRIORITY_TOPICS = [
  'llm-api-cost-optimization',
  'customer-acquisition-cost',
  'net-revenue-retention',
] as const;

/** 主题 id → 该主题的新形态内容。渲染层按 topic.id 取，取不到就不渲染新区段。 */
export const TOPIC_PRIORITY_CONTENT: Record<string, TopicPriorityContent> = {
  'llm-api-cost-optimization': llmApiCostOptimization,
  'customer-acquisition-cost': customerAcquisitionCost,
  'net-revenue-retention': netRevenueRetention,
};

export type {
  TopicFixPriorityRow,
  TopicFixPriorityTable,
  TopicReadinessItem,
  TopicReadinessChecklist,
  TopicPriorityContent,
} from './types';
