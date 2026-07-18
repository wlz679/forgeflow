export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export const categories: Category[] = [
  { id: 'A', name: 'SaaS Metrics', slug: 'saas-metrics', description: 'Calculate MRR, burn rate, churn, revenue projections, break-even, and market sizing for your SaaS business.' },
  { id: 'B', name: 'AI Cost Tools', slug: 'ai-cost-tools', description: 'Estimate OpenAI, Claude, DeepSeek, Gemini API costs, GPU pricing, AI training expenses, and image generation costs.' },
  { id: 'C', name: 'Valuation & Exit', slug: 'valuation-exit', description: 'Estimate unit economics, SaaS valuation, LTV, CAC, equity dilution, and revenue projections.' },
  { id: 'D', name: 'Freelance Pricing', slug: 'freelance-pricing', description: 'Calculate freelance rates, project profitability, affiliate income, course pricing, and email list revenue.' },
  { id: 'E', name: 'Cost & Efficiency', slug: 'cost-efficiency', description: 'Figure out meeting costs, employee costs, SaaS pricing, market size, and productivity scoring.' },
  { id: 'F', name: 'Investment & Real Estate', slug: 'investment-roi', description: 'Calculate sponsorship rates, time value, freelance taxes, equity dilution scenarios, mortgage payments, cap rates, rental yields, BRRR returns, and rent-vs-buy analysis.' },
  { id: 'M', name: 'Marketing Analytics', slug: 'marketing-analytics', description: 'Measure ROAS, LTV by channel, funnel value, cohort retention curves, email campaign ROI, and content marketing ROI for performance marketers and growth teams.' },
  { id: 'O', name: 'Operations / 库存运营', slug: 'operations-inventory', description: 'Calculate inventory turnover, carrying cost, stockout cost, reorder point, fulfillment cost, and supplier scorecards for Shopify/Amazon FBA sellers and product-based businesses.' },
  { id: 'S', name: 'Sales / 销售管理', slug: 'sales', description: 'Calculate pipeline value, sales velocity, ACV, win rate by stage, quota attainment, and pipeline coverage for B2B SaaS sales teams and RevOps.' },
  { id: 'R', name: 'Retention & Customer Success', slug: 'retention', description: 'Calculate NRR, GRR, expansion revenue, logo churn rate, customer health score, and renewal rate for mid-market B2B SaaS CSMs and RevOps leads.' },
  { id: 'P', name: 'Product Analytics', slug: 'product-analytics', description: 'Calculate funnel conversion, feature adoption, activation rate, stickiness (DAU/MAU), time-to-value, and power user curves for product managers at mid-market B2B SaaS companies ($10M-$50M ARR).' },
  { id: 'H', name: 'Hiring & Team', slug: 'hiring-team', description: 'Calculate fully-loaded employee cost, ramp time, productivity ramp curves, compensation banding, equity refresh grants, and attrition cost for People-ops managers and Head-of-HR at mid-market B2B SaaS companies ($10M-$50M ARR).' },
  { id: 'T', name: 'Customer Support', slug: 'customer-support', description: 'Calculate cost-per-support-ticket, first response time SLA, resolution time, CSAT, self-service deflection rate, and team capacity planning for CS Ops managers and Head-of-CS at mid-market B2B SaaS companies ($10M-$50M ARR).' },
  { id: 'K', name: 'Knowledge / 知识库', slug: 'knowledge', description: 'Calculate KB coverage rate, article freshness, search effectiveness, deflection quality, documentation ROI, and article helpfulness score for DevRel Leads, Documentation Managers, and Technical Writers at mid-market B2B SaaS companies ($10M-$50M ARR).' },
  { id: 'L', name: 'Legal & Compliance', slug: 'legal-compliance', description: 'Calculate GDPR fine risk, DSAR processing cost, cookie consent revenue impact, DPA negotiation cost, breach notification cost, and CMP platform ROI for DPOs, Privacy Officers, and Heads of Privacy at mid-market B2B SaaS companies ($10M-$50M ARR).' },
];
