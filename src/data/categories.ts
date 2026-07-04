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
  { id: 'F', name: 'Investment & ROI', slug: 'investment-roi', description: 'Calculate sponsorship rates, time value, freelance taxes, and equity dilution scenarios.' },
  { id: 'M', name: 'Marketing Analytics', slug: 'marketing-analytics', description: 'Measure ROAS, LTV by channel, funnel value, cohort retention curves, email campaign ROI, and content marketing ROI for performance marketers and growth teams.' },
];
