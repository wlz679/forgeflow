// P168 —— 决策建议的**分支探针**：每个建议码一组实测输入。
//
// ⭐ 这些输入是**穷举扫描**出来的，不是推测值：
//   tmp/sweep-tips.ts 对 ltv 跑了 1296 组渠道组合、其余三个引擎跑了网格，
//   把每个引擎观察到的 tip 文本归并成「建议码模板」后，取每档的第一个样本。
// ⭐ 探针的用途是**守恒**：
//   引擎源码里的建议码集合 == locale 的模板集合 == 探针跑出来的集合。
//   三者相等 ⇒ 每个码都有模板、每个模板都被跑过、每个分支都被译过。
//
// ⚠️ 文件名不能带 .test.ts —— tests/build-dep-suites.mjs 的 walkTestSuites
//    只收 *.test.ts / *.test.mjs，带了会让套件计数漂移。

import { getAllEngines } from '../src/core/engines/registry.ts';
import '../src/engines/index.ts';
import { extractDecisionLines } from '../src/lib/decision-support.ts';

export interface TipProbe {
  /** 期望的建议码 */
  code: string;
  /** 引擎输入 */
  inputs: Record<string, string>;
}

export const TIP_PROBES: Record<string, TipProbe[]> = {
  'solopreneur-burn-rate-calculator': [
    { code: 'burn_high_burn', inputs: { monthlyRevenue: '0', netNewRevenue: '0', teamCost: '100', infraCost: '0', marketingCost: '0', opsCost: '0', currentCash: '50000' } },
    { code: 'burn_positive_burn', inputs: { monthlyRevenue: '98', netNewRevenue: '0', teamCost: '100', infraCost: '0', marketingCost: '0', opsCost: '0', currentCash: '50000' } },
    { code: 'burn_cashflow_positive', inputs: { monthlyRevenue: '0', netNewRevenue: '0', teamCost: '0', infraCost: '0', marketingCost: '0', opsCost: '0', currentCash: '50000' } },
  ],
  'solopreneur-gdpr-fine-calculator': [
    { code: 'gdpr_mature', inputs: { annual_revenue_global: '25000000', max_fine_pct: '0.5%', violations_per_year: '0', industry_risk_multiplier: 'SaaS (0.8×)' } },
    { code: 'gdpr_manageable', inputs: { annual_revenue_global: '25000000', max_fine_pct: '0.5%', violations_per_year: '1', industry_risk_multiplier: 'SaaS (0.8×)' } },
    { code: 'gdpr_full_programme', inputs: { annual_revenue_global: '25000000', max_fine_pct: '2%', violations_per_year: '1', industry_risk_multiplier: 'SaaS (0.8×)' } },
    { code: 'gdpr_escalate', inputs: { annual_revenue_global: '25000000', max_fine_pct: '4%', violations_per_year: '1', industry_risk_multiplier: 'SaaS (0.8×)' } },
  ],
  'solopreneur-cac-calculator': [
    { code: 'cac_no_revenue', inputs: { marketingSpend: '600', salesSpend: '0', newCustomers: '10', avgRevenuePerCustomer: '0', grossMargin: '100' } },
    { code: 'cac_payback_fast', inputs: { marketingSpend: '600', salesSpend: '0', newCustomers: '10', avgRevenuePerCustomer: '20', grossMargin: '100' } },
    { code: 'cac_payback_within_12', inputs: { marketingSpend: '600', salesSpend: '0', newCustomers: '10', avgRevenuePerCustomer: '7.5', grossMargin: '100' } },
    { code: 'cac_payback_past_12', inputs: { marketingSpend: '600', salesSpend: '0', newCustomers: '10', avgRevenuePerCustomer: '4', grossMargin: '100' } },
    { code: 'cac_payback_slow', inputs: { marketingSpend: '600', salesSpend: '0', newCustomers: '10', avgRevenuePerCustomer: '2', grossMargin: '100' } },
  ],
  'solopreneur-ltv-by-channel-calculator': [
    { code: 'ltv_no_data', inputs: { ch1_spend: '0', ch1_conv: '0', ch1_ltv: '0', ch2_spend: '0', ch2_conv: '0', ch2_ltv: '20' } },
    { code: 'ltv_single_channel', inputs: { ch1_spend: '0', ch1_conv: '0', ch1_ltv: '0', ch2_spend: '100', ch2_conv: '10', ch2_ltv: '20' } },
    { code: 'ltv_no_green', inputs: { ch1_spend: '0', ch1_conv: '10', ch1_ltv: '0', ch2_spend: '100', ch2_conv: '10', ch2_ltv: '20' } },
    { code: 'ltv_strong_winner', inputs: { ch1_spend: '0', ch1_conv: '10', ch1_ltv: '0', ch2_spend: '100', ch2_conv: '10', ch2_ltv: '50' } },
    { code: 'ltv_similar_ratios', inputs: { ch1_spend: '100', ch1_conv: '10', ch1_ltv: '20', ch2_spend: '100', ch2_conv: '10', ch2_ltv: '20' } },
    { code: 'ltv_both_healthy', inputs: { ch1_spend: '100', ch1_conv: '10', ch1_ltv: '20', ch2_spend: '100', ch2_conv: '10', ch2_ltv: '50' } },
  ],
};

/** 跑某个工具的探针，返回观察到的建议码集合（去重） */
export function probeCodes(slug: string): string[] {
  const engines = getAllEngines() as any[];
  const engine = engines.find((e) => e.slug === slug);
  if (!engine) return [];
  const out = new Set<string>();
  for (const probe of TIP_PROBES[slug] ?? []) {
    const results = engine.generate(probe.inputs);
    const joined = (Array.isArray(results) ? results : [results]).join('\n');
    const lines = extractDecisionLines(joined);
    if (lines.tipCode) {
      out.add(lines.tipCode);
      continue;
    }
    // ⭐ 还没改码的引擎 ⇒ tip 还是旧式英文句子 ⇒ 记下来由断言报错
    out.add('LEGACY:' + lines.tip.slice(0, 40));
  }
  return [...out];
}