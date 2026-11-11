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
  'solopreneur-churn-rate-calculator': [
    { code: 'churn_rate_healthy', inputs: {"customersStart":"1000","customersLost":"15","newCustomers":"25","avgRevenuePerCustomer":"50","expansionRevenue":"800"} },
    { code: 'churn_rate_average', inputs: {"customersStart":"500","customersLost":"15","newCustomers":"20","avgRevenuePerCustomer":"50","expansionRevenue":"400"} },
    { code: 'churn_rate_high', inputs: {"customersStart":"200","customersLost":"15","newCustomers":"10","avgRevenuePerCustomer":"60","expansionRevenue":"200"} },
  ],
  'solopreneur-employee-cost-calculator': [
    { code: 'employee_cost_lean', inputs: {"annualSalary":"0","benefitsPercentage":"0","location":"us"} },
    { code: 'employee_cost_standard', inputs: {"annualSalary":"20000","benefitsPercentage":"7.5","location":"us"} },
    { code: 'employee_cost_high', inputs: {"annualSalary":"160000","benefitsPercentage":"60","location":"us"} },
    { code: 'employee_cost_excessive', inputs: {"annualSalary":"400000","benefitsPercentage":"150","location":"us"} },
  ],
  'solopreneur-equity-dilution-calculator': [
    { code: 'dilution_healthy', inputs: {"companyValuation":"0","investmentAmount":"0","founderShares":"0"} },
    { code: 'dilution_excessive', inputs: {"companyValuation":"500000","investmentAmount":"1000000","founderShares":"10000000"} },
    { code: 'dilution_aggressive', inputs: {"companyValuation":"2500000","investmentAmount":"1000000","founderShares":"10000000"} },
  ],
  'solopreneur-freelance-rate-calculator': [
    { code: 'freelance_rate_entry', inputs: {"annualIncome":"0","expenses":"0","billableHrs":"0","profit":"0"} },
    { code: 'freelance_rate_market', inputs: {"annualIncome":"8000","expenses":"1000","billableHrs":"120","profit":"2000"} },
    { code: 'freelance_rate_premium', inputs: {"annualIncome":"160000","expenses":"10000","billableHrs":"1200","profit":"20000"} },
    { code: 'freelance_rate_below_market', inputs: {"annualIncome":"80000","expenses":"20000","billableHrs":"1200","profit":"20000"} },
  ],
  'solopreneur-rent-vs-buy-calculator': [
    { code: 'rentbuy_close', inputs: {"monthlyRent":"200","homePrice":"50000","downPayment":"10000","mortgageRate":"0.65","yearsToStay":"0.7","annualAppreciation":"0.3","annualRentIncrease":"0.3"} },
    { code: 'rentbuy_buy', inputs: {"monthlyRent":"2000","homePrice":"500000","downPayment":"100000","mortgageRate":"6.5","yearsToStay":"7","annualAppreciation":"3","annualRentIncrease":"3"} },
    { code: 'rentbuy_rent', inputs: {"monthlyRent":"200000","homePrice":"50000000","downPayment":"10000000","mortgageRate":"650","yearsToStay":"700","annualAppreciation":"300","annualRentIncrease":"300"} },
  ],
  'solopreneur-saas-valuation-calculator': [
    { code: 'saasval_floor', inputs: {"annualRevenue":"500000","growthRate":"5","profitMargin":"5"} },
    { code: 'saasval_median', inputs: {"annualRevenue":"1000000","growthRate":"50","profitMargin":"25"} },
    { code: 'saasval_premium', inputs: {"annualRevenue":"5000000","growthRate":"120","profitMargin":"35"} },
  ],
  'solopreneur-acv-calculator': [
    { code: 'acv_micro_transaction', inputs: {"totalContractValue":"10000","contractLength":"12","numCustomers":"12","expansionRate":"0"} },
    { code: 'acv_smb_tier', inputs: {"totalContractValue":"60000","contractLength":"12","numCustomers":"12","expansionRate":"0"} },
    { code: 'acv_mid_market', inputs: {"totalContractValue":"300000","contractLength":"12","numCustomers":"12","expansionRate":"10"} },
    { code: 'acv_enterprise_grade', inputs: {"totalContractValue":"1200000","contractLength":"12","numCustomers":"12","expansionRate":"10"} },
  ],
  'solopreneur-comp-banding-calculator': [
    { code: 'comp_banding_below_p25', inputs: {"role_title":"Senior Engineer","base_salary":"100000","market_p25":"130000","market_p50":"155000","market_p75":"185000"} },
    { code: 'comp_banding_p25_to_p50', inputs: {"role_title":"Senior Engineer","base_salary":"140000","market_p25":"130000","market_p50":"155000","market_p75":"185000"} },
    { code: 'comp_banding_p50_to_p75', inputs: {"role_title":"Senior Engineer","base_salary":"160000","market_p25":"130000","market_p50":"155000","market_p75":"185000"} },
    { code: 'comp_banding_top_quartile', inputs: {"role_title":"Senior Engineer","base_salary":"190000","market_p25":"130000","market_p50":"155000","market_p75":"185000"} },
  ],
  'solopreneur-csat-calculator': [
    { code: 'csat_biased_sample', inputs: {"csat_pct":"87","response_rate":"12","sample_size":"200","target_csat":"90"} },
    { code: 'csat_critical', inputs: {"csat_pct":"62","response_rate":"40","sample_size":"350","target_csat":"90"} },
    { code: 'csat_warning', inputs: {"csat_pct":"75","response_rate":"38","sample_size":"260","target_csat":"90"} },
    { code: 'csat_good', inputs: {"csat_pct":"87","response_rate":"35","sample_size":"200","target_csat":"90"} },
    { code: 'csat_excellent', inputs: {"csat_pct":"93","response_rate":"41","sample_size":"520","target_csat":"90"} },
  ],
  'solopreneur-customer-health-score-calculator': [
    { code: 'healthscore_critical', inputs: {"productUsage":"7.5","nps":"4","supportTickets":"0.5","engagement":"8","contractValue":"6","weightPreset":"balanced"} },
    { code: 'healthscore_at_risk', inputs: {"productUsage":"18.75","nps":"10","supportTickets":"1.25","engagement":"20","contractValue":"15","weightPreset":"balanced"} },
    { code: 'healthscore_monitor', inputs: {"productUsage":"75","nps":"40","supportTickets":"5","engagement":"80","contractValue":"60","weightPreset":"balanced"} },
    { code: 'healthscore_excellent', inputs: {"productUsage":"150","nps":"80","supportTickets":"10","engagement":"160","contractValue":"120","weightPreset":"balanced"} },
  ],
  'solopreneur-funnel-step-calculator': [
    { code: 'funnelstep_warning', inputs: {"step1":"100","step2":"80","step3":"50","step4":"32","step5":"21"} },
    { code: 'funnelstep_healthy', inputs: {"step1":"0","step2":"800","step3":"500","step4":"320","step5":"210"} },
    { code: 'funnelstep_excellent', inputs: {"step1":"100","step2":"800","step3":"500","step4":"320","step5":"210"} },
    { code: 'funnelstep_critical', inputs: {"step1":"2000","step2":"800","step3":"500","step4":"320","step5":"210"} },
  ],
  'solopreneur-gpu-cloud-cost-calculator': [
    { code: 'gpu_cloud_on_demand', inputs: {"provider":"runpod","gpuType":"A100","gpuCount":"4","hoursPerDay":"8","pricingTier":"on-demand","includeStorage":"yes"} },
    { code: 'gpu_cloud_spot', inputs: {"provider":"runpod","gpuType":"A100","gpuCount":"4","hoursPerDay":"8","pricingTier":"spot","includeStorage":"yes"} },
    { code: 'gpu_cloud_reserved', inputs: {"provider":"runpod","gpuType":"A100","gpuCount":"4","hoursPerDay":"8","pricingTier":"reserved","includeStorage":"yes"} },
  ],
  'solopreneur-kb-coverage-rate-calculator': [
    { code: 'kbcover_critical', inputs: {"monthly_tickets":"5000","tickets_with_kb_match":"1200","total_articles":"180","industry_benchmark":"SaaS"} },
    { code: 'kbcover_warning', inputs: {"monthly_tickets":"5000","tickets_with_kb_match":"2500","total_articles":"320","industry_benchmark":"SaaS"} },
    { code: 'kbcover_good', inputs: {"monthly_tickets":"5000","tickets_with_kb_match":"3500","total_articles":"500","industry_benchmark":"SaaS"} },
    { code: 'kbcover_excellent', inputs: {"monthly_tickets":"5000","tickets_with_kb_match":"4400","total_articles":"620","industry_benchmark":"SaaS"} },
  ],
  'solopreneur-roas-calculator': [
    { code: 'roas_critical', inputs: {"adSpend":"5000","revenue":"4000","grossMargin":"60","attributionWindow":"28d"} },
    { code: 'roas_excellent', inputs: {"adSpend":"5000","revenue":"20000","grossMargin":"60","attributionWindow":"28d"} },
    { code: 'roas_good', inputs: {"adSpend":"5000","revenue":"15000","grossMargin":"60","attributionWindow":"28d"} },
    { code: 'roas_warning_thin_margin', inputs: {"adSpend":"5000","revenue":"7500","grossMargin":"40","attributionWindow":"28d"} },
    { code: 'roas_warning_funnel', inputs: {"adSpend":"5000","revenue":"7500","grossMargin":"60","attributionWindow":"28d"} },
  ],
  'solopreneur-stockout-cost-calculator': [
    { code: 'stockout_excellent', inputs: {"lostSalesPerDay":"100","avgStockoutDays":"0.5","lostCustomerRate":"3","customerLTV":"20","annualRevenue":"60000","recoveryRate":"1"} },
    { code: 'stockout_measurable', inputs: {"lostSalesPerDay":"500","avgStockoutDays":"2.5","lostCustomerRate":"15","customerLTV":"100","annualRevenue":"300000","recoveryRate":"5"} },
    { code: 'stockout_critical', inputs: {"lostSalesPerDay":"1000","avgStockoutDays":"5","lostCustomerRate":"30","customerLTV":"200","annualRevenue":"600000","recoveryRate":"10"} },
    { code: 'stockout_serious', inputs: {"lostSalesPerDay":"250","avgStockoutDays":"5","lostCustomerRate":"30","customerLTV":"200","annualRevenue":"600000","recoveryRate":"10"} },
  ]
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