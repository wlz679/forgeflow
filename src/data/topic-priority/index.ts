// P166 —— 主题页新形态（「修复优先级表」+「达标清单」）的装配层。
//
// 这一层是新增的，不寄生在 src/data/topic-content.ts 上 —— 原因见 types.ts 顶部：
// topic-content.ts 被审计脚本与价格台账按文本解析，拆它会连带改两处依赖
// （审计会悄悄少报几个主题，比直接报错更坏）。
//
// ⚠️ 本文件由 tmp/gen-topic-priority-index.ts 生成（铺开 42 个主题时手抄必错）。
//    名单 = src/data/topics.ts 里 tier 1 的全部主题（45 个）。
//    守卫会独立断言「本名单 == topics.ts 的 tier-1 全集」⇒ 不多不少。
//
// 装配方式：显式 import + 显式装配（不做目录扫描）——
//   · 顺序 = 名单顺序（= topics.ts 顺序）⇒ 渲染层的输出顺序可预期
//   · 加一个主题 = 加一个文件 + 重跑生成器 ⇒ 下一批可并行写、互不冲突
import type { TopicPriorityContent } from './types';
import { priority as mrrGrowthStrategies } from './mrr-growth-strategies';
import { priority as llmApiCostOptimization } from './llm-api-cost-optimization';
import { priority as customerAcquisitionCost } from './customer-acquisition-cost';
import { priority as freelanceRateStrategy } from './freelance-rate-strategy';
import { priority as meetingCostOptimization } from './meeting-cost-optimization';
import { priority as mortgageStrategyComparison } from './mortgage-strategy-comparison';
import { priority as employeeCostPlanning } from './employee-cost-planning';
import { priority as knowledgeBaseCoverage } from './knowledge-base-coverage';
import { priority as gdprComplianceStrategy } from './gdpr-compliance-strategy';
import { priority as roasOptimization } from './roas-optimization';
import { priority as inventoryTurnoverOptimization } from './inventory-turnover-optimization';
import { priority as funnelConversionOptimization } from './funnel-conversion-optimization';
import { priority as netRevenueRetention } from './net-revenue-retention';
import { priority as pipelineValueOptimization } from './pipeline-value-optimization';
import { priority as supportCostOptimization } from './support-cost-optimization';
import { priority as arrMultipleValuation } from './arr-multiple-valuation';
import { priority as burnRateOptimization } from './burn-rate-optimization';
import { priority as aiImageCostOptimization } from './ai-image-cost-optimization';
import { priority as gpuCloudCostOptimization } from './gpu-cloud-cost-optimization';
import { priority as equityDilutionOptimization } from './equity-dilution-optimization';
import { priority as unitEconomicsOptimization } from './unit-economics-optimization';
import { priority as projectProfitabilityOptimization } from './project-profitability-optimization';
import { priority as saasPricingStrategy } from './saas-pricing-strategy';
import { priority as meetingCostAnalysis } from './meeting-cost-analysis';
import { priority as productivityScoreOptimization } from './productivity-score-optimization';
import { priority as compoundInterestOptimization } from './compound-interest-optimization';
import { priority as capRateOptimization } from './cap-rate-optimization';
import { priority as fullyLoadedEmployeeCostOptimization } from './fully-loaded-employee-cost-optimization';
import { priority as attritionCostOptimization } from './attrition-cost-optimization';
import { priority as articleFreshnessOptimization } from './article-freshness-optimization';
import { priority as searchEffectivenessOptimization } from './search-effectiveness-optimization';
import { priority as dsarCostOptimization } from './dsar-cost-optimization';
import { priority as consentRevenueOptimization } from './consent-revenue-optimization';
import { priority as ltvByChannelOptimization } from './ltv-by-channel-optimization';
import { priority as emailCampaignRoiOptimization } from './email-campaign-roi-optimization';
import { priority as carryingCostOptimization } from './carrying-cost-optimization';
import { priority as reorderPointOptimization } from './reorder-point-optimization';
import { priority as featureAdoptionOptimization } from './feature-adoption-optimization';
import { priority as stickinessOptimization } from './stickiness-optimization';
import { priority as grrOptimization } from './grr-optimization';
import { priority as customerHealthScoreOptimization } from './customer-health-score-optimization';
import { priority as firstResponseTimeOptimization } from './first-response-time-optimization';
import { priority as resolutionTimeOptimization } from './resolution-time-optimization';
import { priority as salesVelocityOptimization } from './sales-velocity-optimization';
import { priority as acvOptimization } from './acv-optimization';

/** 带新形态内容的主题名单（全部 tier-1 主题）。 */
export const PRIORITY_TOPICS = [
  'mrr-growth-strategies',
  'llm-api-cost-optimization',
  'customer-acquisition-cost',
  'freelance-rate-strategy',
  'meeting-cost-optimization',
  'mortgage-strategy-comparison',
  'employee-cost-planning',
  'knowledge-base-coverage',
  'gdpr-compliance-strategy',
  'roas-optimization',
  'inventory-turnover-optimization',
  'funnel-conversion-optimization',
  'net-revenue-retention',
  'pipeline-value-optimization',
  'support-cost-optimization',
  'arr-multiple-valuation',
  'burn-rate-optimization',
  'ai-image-cost-optimization',
  'gpu-cloud-cost-optimization',
  'equity-dilution-optimization',
  'unit-economics-optimization',
  'project-profitability-optimization',
  'saas-pricing-strategy',
  'meeting-cost-analysis',
  'productivity-score-optimization',
  'compound-interest-optimization',
  'cap-rate-optimization',
  'fully-loaded-employee-cost-optimization',
  'attrition-cost-optimization',
  'article-freshness-optimization',
  'search-effectiveness-optimization',
  'dsar-cost-optimization',
  'consent-revenue-optimization',
  'ltv-by-channel-optimization',
  'email-campaign-roi-optimization',
  'carrying-cost-optimization',
  'reorder-point-optimization',
  'feature-adoption-optimization',
  'stickiness-optimization',
  'grr-optimization',
  'customer-health-score-optimization',
  'first-response-time-optimization',
  'resolution-time-optimization',
  'sales-velocity-optimization',
  'acv-optimization',
] as const;

/** 主题 id → 该主题的新形态内容。渲染层按 topic.id 取，取不到就不渲染新区段。 */
export const TOPIC_PRIORITY_CONTENT: Record<string, TopicPriorityContent> = {
  'mrr-growth-strategies': mrrGrowthStrategies,
  'llm-api-cost-optimization': llmApiCostOptimization,
  'customer-acquisition-cost': customerAcquisitionCost,
  'freelance-rate-strategy': freelanceRateStrategy,
  'meeting-cost-optimization': meetingCostOptimization,
  'mortgage-strategy-comparison': mortgageStrategyComparison,
  'employee-cost-planning': employeeCostPlanning,
  'knowledge-base-coverage': knowledgeBaseCoverage,
  'gdpr-compliance-strategy': gdprComplianceStrategy,
  'roas-optimization': roasOptimization,
  'inventory-turnover-optimization': inventoryTurnoverOptimization,
  'funnel-conversion-optimization': funnelConversionOptimization,
  'net-revenue-retention': netRevenueRetention,
  'pipeline-value-optimization': pipelineValueOptimization,
  'support-cost-optimization': supportCostOptimization,
  'arr-multiple-valuation': arrMultipleValuation,
  'burn-rate-optimization': burnRateOptimization,
  'ai-image-cost-optimization': aiImageCostOptimization,
  'gpu-cloud-cost-optimization': gpuCloudCostOptimization,
  'equity-dilution-optimization': equityDilutionOptimization,
  'unit-economics-optimization': unitEconomicsOptimization,
  'project-profitability-optimization': projectProfitabilityOptimization,
  'saas-pricing-strategy': saasPricingStrategy,
  'meeting-cost-analysis': meetingCostAnalysis,
  'productivity-score-optimization': productivityScoreOptimization,
  'compound-interest-optimization': compoundInterestOptimization,
  'cap-rate-optimization': capRateOptimization,
  'fully-loaded-employee-cost-optimization': fullyLoadedEmployeeCostOptimization,
  'attrition-cost-optimization': attritionCostOptimization,
  'article-freshness-optimization': articleFreshnessOptimization,
  'search-effectiveness-optimization': searchEffectivenessOptimization,
  'dsar-cost-optimization': dsarCostOptimization,
  'consent-revenue-optimization': consentRevenueOptimization,
  'ltv-by-channel-optimization': ltvByChannelOptimization,
  'email-campaign-roi-optimization': emailCampaignRoiOptimization,
  'carrying-cost-optimization': carryingCostOptimization,
  'reorder-point-optimization': reorderPointOptimization,
  'feature-adoption-optimization': featureAdoptionOptimization,
  'stickiness-optimization': stickinessOptimization,
  'grr-optimization': grrOptimization,
  'customer-health-score-optimization': customerHealthScoreOptimization,
  'first-response-time-optimization': firstResponseTimeOptimization,
  'resolution-time-optimization': resolutionTimeOptimization,
  'sales-velocity-optimization': salesVelocityOptimization,
  'acv-optimization': acvOptimization,
};

export type {
  TopicFixPriorityRow,
  TopicFixPriorityTable,
  TopicReadinessItem,
  TopicReadinessChecklist,
  TopicPriorityContent,
} from './types';
