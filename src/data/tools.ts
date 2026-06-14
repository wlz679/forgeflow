export interface ToolMeta {
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  inputs: { name: string; label: string; placeholder: string; type: 'text' | 'select' | 'number'; options?: string[] }[];
}

export const tools: ToolMeta[] = [
  // ===== Category A: SaaS Metrics =====
  {
    slug: 'solopreneur-burn-rate-calculator',
    title: 'Burn Rate Calculator',
    description: 'Analyze monthly cash flow by cost category, calculate runway with exact run-out date, Burn Multiple, and Default Alive/Dead status.',
    categoryId: 'A',
    inputs: [
      { name: 'monthlyRevenue', label: 'Monthly Revenue ($)', placeholder: 'e.g. 5000', type: 'number' },
      { name: 'teamCost', label: 'Team Cost ($/mo)', placeholder: 'e.g. 8000', type: 'number' },
      { name: 'infraCost', label: 'Infrastructure & SaaS ($/mo)', placeholder: 'e.g. 500', type: 'number' },
      { name: 'marketingCost', label: 'Marketing & Ads ($/mo)', placeholder: 'e.g. 2000', type: 'number' },
      { name: 'opsCost', label: 'Operations & Misc ($/mo)', placeholder: 'e.g. 1500', type: 'number' },
      { name: 'currentCash', label: 'Current Cash Balance ($)', placeholder: 'e.g. 50000', type: 'number' },
      { name: 'netNewRevenue', label: 'Net New Revenue Added ($/mo)', placeholder: 'e.g. 3000 (optional)', type: 'number' },
    ],
  },
  {
    slug: 'solopreneur-churn-rate-calculator',
    title: 'Churn Rate Calculator',
    description: 'Track logo churn vs revenue churn, NRR/GRR, and churn attribution. See how expansion revenue offsets churn and compare scenarios.',
    categoryId: 'A',
    inputs: [
      { name: 'customersStart', label: 'Customers at Start of Month', placeholder: 'e.g. 500', type: 'number' },
      { name: 'customersLost', label: 'Customers Lost This Month', placeholder: 'e.g. 15', type: 'number' },
      { name: 'newCustomers', label: 'New Customers This Month', placeholder: 'e.g. 25', type: 'number' },
      { name: 'avgRevenuePerCustomer', label: 'Avg Revenue per Customer ($)', placeholder: 'e.g. 50', type: 'number' },
      { name: 'expansionRevenue', label: 'Expansion Revenue ($)', placeholder: 'e.g. 500', type: 'number' },
    ],
  },
  {
    slug: 'solopreneur-market-size-estimator',
    title: 'Market Size Estimator',
    description: 'Bottom-up and top-down market sizing with configurable SAM, market stage, and 3-year projections. Industry-standard TAM/SAM/SOM framework.',
    categoryId: 'A',
    inputs: [
      { name: 'targetMarket', label: 'Target Market', placeholder: 'e.g. US dental clinics', type: 'text' },
      { name: 'totalAddressableCustomers', label: 'Total Addressable Customers', placeholder: 'e.g. 30000', type: 'number' },
      { name: 'annualRevenuePerCustomer', label: 'Avg Annual Revenue per Customer ($)', placeholder: 'e.g. 5000', type: 'number' },
      { name: 'marketGrowthRate', label: 'Market Annual Growth Rate (%)', placeholder: 'e.g. 12', type: 'number' },
      { name: 'samPercent', label: 'SAM — % of TAM You Can Reach', placeholder: 'e.g. 25', type: 'number' },
      { name: 'marketStage', label: 'Market Stage', placeholder: '', type: 'select', options: ['Emerging', 'Growing', 'Mature', 'Declining'] },
    ],
  },
  {
    slug: 'solopreneur-openai-token-calculator',
    title: 'OpenAI Token Calculator',
    description: 'Compare OpenAI API costs across 14 models — GPT-5.5 to GPT-5 Nano, GPT-4.1 family, and o-series. Toggle batch pricing, prompt caching, and growth projections.',
    categoryId: 'B',
    inputs: [
      { name: 'models', label: 'Models (comma-separated)', placeholder: 'gpt-5-mini,gpt-5.5,gpt-4.1', type: 'text' },
      { name: 'inputTokens', label: 'Input Tokens per Request', placeholder: 'e.g. 1000', type: 'number' },
      { name: 'outputTokens', label: 'Output Tokens per Request', placeholder: 'e.g. 500', type: 'number' },
      { name: 'requestsPerDay', label: 'Requests per Day', placeholder: 'e.g. 100', type: 'number' },
      { name: 'pricingMode', label: 'Pricing Mode', placeholder: '', type: 'select', options: ['realtime', 'batch'] },
      { name: 'cacheHitRate', label: 'Cache Hit Rate (%)', placeholder: 'e.g. 50', type: 'number' },
      { name: 'growthRate', label: 'Monthly Growth Rate (%)', placeholder: 'e.g. 5', type: 'number' },
      { name: 'projectionMonths', label: 'Projection Period (months)', placeholder: '', type: 'select', options: ['3', '6', '12'] },
    ],
  },
  {
    slug: 'solopreneur-claude-api-cost-calculator',
    title: 'Claude API Cost Calculator',
    description: 'Calculate Claude API costs for Fable 5, Opus 4.8, Sonnet 4.6, Haiku 4.5, and legacy models. Includes Prompt Caching, batch pricing, and cross-provider comparison.',
    categoryId: 'B',
    inputs: [
      { name: 'models', label: 'Models', placeholder: 'claude-fable-5,claude-opus-4-8,claude-sonnet-4-6,claude-haiku-4-5', type: 'text' },
      { name: 'inputTokens', label: 'Input Tokens per Request', placeholder: 'e.g. 1000', type: 'number' },
      { name: 'outputTokens', label: 'Output Tokens per Request', placeholder: 'e.g. 500', type: 'number' },
      { name: 'requestsPerDay', label: 'Requests per Day', placeholder: 'e.g. 100', type: 'number' },
      { name: 'pricingMode', label: 'Pricing Mode', placeholder: '', type: 'select', options: ['realtime', 'batch'] },
      { name: 'cacheWriteTokens', label: 'Cache Write Tokens', placeholder: 'e.g. 1000', type: 'number' },
      { name: 'cacheTTL', label: 'Cache TTL', placeholder: '', type: 'select', options: ['5min', '1hour'] },
      { name: 'cacheReadHitRate', label: 'Cache Read Hit Rate (%)', placeholder: 'e.g. 50', type: 'number' },
      { name: 'growthRate', label: 'Monthly Growth Rate (%)', placeholder: 'e.g. 5', type: 'number' },
      { name: 'projectionMonths', label: 'Projection Period', placeholder: '', type: 'select', options: ['3', '6', '12'] },
    ],
  },
  {
    slug: 'solopreneur-deepseek-api-cost-calculator',
    title: 'DeepSeek API Cost Calculator',
    description: 'Calculate DeepSeek API costs for V4 Flash, V4 Pro, and legacy R1. Includes automatic caching, growth projections, and cross-provider savings comparison.',
    categoryId: 'B',
    inputs: [
      { name: 'models', label: 'Models', placeholder: 'deepseek-v4-flash,deepseek-v4-pro-promo,deepseek-r1', type: 'text' },
      { name: 'inputTokens', label: 'Input Tokens per Request', placeholder: 'e.g. 1000', type: 'number' },
      { name: 'outputTokens', label: 'Output Tokens per Request', placeholder: 'e.g. 500', type: 'number' },
      { name: 'requestsPerDay', label: 'Requests per Day', placeholder: 'e.g. 100', type: 'number' },
      { name: 'cacheHitRate', label: 'Auto-Cache Hit Rate (%)', placeholder: 'e.g. 60', type: 'number' },
      { name: 'growthRate', label: 'Monthly Growth Rate (%)', placeholder: 'e.g. 5', type: 'number' },
      { name: 'projectionMonths', label: 'Projection Period', placeholder: '', type: 'select', options: ['3', '6', '12'] },
    ],
  },
  {
    slug: 'solopreneur-gemini-api-cost-calculator',
    title: 'Gemini API Cost Calculator',
    description: 'Calculate Google Gemini API costs across 6 models — Gemini 3.5 Flash, 3.1 Pro, 3 Flash, and legacy models. Includes Context Caching, batch pricing, growth projections, and cross-provider comparison.',
    categoryId: 'B',
    inputs: [
      { name: 'models', label: 'Models', placeholder: 'gemini-3.5-flash,gemini-3.1-pro,gemini-3-flash,gemini-1.5-flash', type: 'text' },
      { name: 'inputTokens', label: 'Input Tokens per Request', placeholder: 'e.g. 1000', type: 'number' },
      { name: 'outputTokens', label: 'Output Tokens per Request', placeholder: 'e.g. 500', type: 'number' },
      { name: 'requestsPerDay', label: 'Requests per Day', placeholder: 'e.g. 100', type: 'number' },
      { name: 'pricingMode', label: 'Pricing Mode', placeholder: '', type: 'select', options: ['realtime', 'batch'] },
      { name: 'cacheHitRate', label: 'Context Cache Hit Rate (%)', placeholder: 'e.g. 60', type: 'number' },
      { name: 'growthRate', label: 'Monthly Growth Rate (%)', placeholder: 'e.g. 5', type: 'number' },
      { name: 'projectionMonths', label: 'Projection Period', placeholder: '', type: 'select', options: ['3', '6', '12'] },
    ],
  },
  {
    slug: 'solopreneur-ai-image-cost-calculator',
    title: 'AI Image Generation Cost Calculator',
    description: 'Compare costs across 7 AI image providers (DALL-E 4/3, Midjourney V7, SD 4, Ideogram 3, Flux Pro, Leonardo AI). Subscription vs API pricing, resolution tiers, bar chart comparison, and volume scenarios.',
    categoryId: 'B',
    inputs: [
      { name: 'provider', label: 'Provider', placeholder: '', type: 'select', options: ['dalle-4', 'dalle-3', 'midjourney-v7', 'stable-diffusion-4', 'ideogram-3', 'flux-pro', 'leonardo'] },
      { name: 'imagesPerMonth', label: 'Images per Month', placeholder: 'e.g. 100', type: 'number' },
      { name: 'resolution', label: 'Resolution', placeholder: '', type: 'select', options: ['1024×1024', '1792×1024', '1024×1792', '2048×2048', '512×512', '1280×720', '1536×1536'] },
      { name: 'batchSize', label: 'Batch Size (per Call)', placeholder: 'e.g. 1', type: 'number' },
      { name: 'advancedMode', label: 'Quality Mode', placeholder: '', type: 'select', options: ['standard', 'hd', 'ultra'] },
    ],
  },
  {
    slug: 'solopreneur-ai-training-cost-estimator',
    title: 'AI Training Cost Estimator',
    description: 'Estimate the cost of training AI models from 7B to 180B parameters.',
    categoryId: 'B',
    inputs: [
      { name: 'modelParams', label: 'Model Size', placeholder: '', type: 'select', options: ['7B', '13B', '70B', '180B'] },
      { name: 'gpuType', label: 'GPU Type', placeholder: '', type: 'select', options: ['A100-80GB', 'H100-80GB', 'A6000'] },
      { name: 'gpuCount', label: 'GPU Count', placeholder: 'e.g. 8', type: 'number' },
      { name: 'hoursPerRun', label: 'Hours per Run', placeholder: 'e.g. 24', type: 'number' },
    ],
  },
  {
    slug: 'solopreneur-gpu-cloud-cost-calculator',
    title: 'GPU Cloud Cost Calculator',
    description: 'Compare GPU rental costs across AWS, GCP, Lambda Labs, and RunPod.',
    categoryId: 'B',
    inputs: [
      { name: 'provider', label: 'Cloud Provider', placeholder: '', type: 'select', options: ['aws', 'gcp', 'lambda', 'runpod'] },
      { name: 'gpuType', label: 'GPU Type', placeholder: '', type: 'select', options: ['A100', 'H100', 'L40S', 'RTX4090'] },
      { name: 'gpuCount', label: 'GPU Count', placeholder: 'e.g. 1', type: 'number' },
      { name: 'hoursPerDay', label: 'Hours per Day', placeholder: 'e.g. 8', type: 'number' },
    ],
  },
  {
    slug: 'solopreneur-ai-api-cost-comparison',
    title: 'AI API Cost Comparison',
    description: 'Cross-provider AI API cost comparison across 15 models from OpenAI, Anthropic, Google, and DeepSeek. Find the cheapest model for your usage — with bar chart, provider summary, and volume scenario planning.',
    categoryId: 'B',
    inputs: [
      { name: 'inputTokens', label: 'Input Tokens per Request', placeholder: 'e.g. 1000', type: 'number' },
      { name: 'outputTokens', label: 'Output Tokens per Request', placeholder: 'e.g. 500', type: 'number' },
      { name: 'requestsPerDay', label: 'Requests per Day', placeholder: 'e.g. 100', type: 'number' },
      { name: 'pricingMode', label: 'Pricing Mode', placeholder: '', type: 'select', options: ['realtime', 'batch'] },
    ],
  },

  // ===== Category B: AI Cost Tools =====
  {
    slug: 'solopreneur-unit-economics-calculator',
    title: 'Unit Economics Calculator',
    description: 'Analyze per-customer profitability with expansion revenue, scaling curves (1K/10K/100K), and ranked optimization levers.',
    categoryId: 'C',
    inputs: [
      { name: 'averageRevenuePerCustomer', label: 'Avg Monthly Revenue per Customer ($)', placeholder: 'e.g. 50', type: 'number' },
      { name: 'costToServePerCustomer', label: 'Monthly Cost to Serve per Customer ($)', placeholder: 'e.g. 10', type: 'number' },
      { name: 'customerAcquisitionCost', label: 'Customer Acquisition Cost ($)', placeholder: 'e.g. 200', type: 'number' },
      { name: 'monthlyChurnRate', label: 'Monthly Churn Rate (%)', placeholder: 'e.g. 3', type: 'number' },
      { name: 'expansionRevenuePerCustomer', label: 'Expansion Revenue / Customer ($)', placeholder: 'e.g. 15 (optional)', type: 'number' },
      { name: 'retentionMonths', label: 'Avg Customer Lifetime (months)', placeholder: 'e.g. 36 (optional)', type: 'number' },
    ],
  },

  // ===== Category C: Valuation & Exit =====
  {
    slug: 'solopreneur-cac-calculator',
    title: 'CAC Calculator',
    description: 'Calculate your Customer Acquisition Cost and payback period. Compare different spend scenarios to find your most efficient acquisition budget.',
    categoryId: 'C',
    inputs: [
      { name: 'marketingSpend', label: 'Marketing Spend ($)', placeholder: 'e.g. 5000', type: 'number' },
      { name: 'salesSpend', label: 'Sales Spend ($)', placeholder: 'e.g. 3000', type: 'number' },
      { name: 'newCustomers', label: 'New Customers Acquired', placeholder: 'e.g. 40', type: 'number' },
      { name: 'avgRevenuePerCustomer', label: 'Avg Monthly Revenue per Customer ($)', placeholder: 'e.g. 50', type: 'number' },
      { name: 'grossMargin', label: 'Gross Margin (%)', placeholder: 'e.g. 80', type: 'number' },
    ],
  },
  {
    slug: 'solopreneur-ltv-calculator',
    title: 'LTV Calculator',
    description: 'Calculate Customer Lifetime Value (LTV) and LTV:CAC ratio. Compare how different churn rates impact customer value and unit economics.',
    categoryId: 'C',
    inputs: [
      { name: 'monthlyRevenuePerUser', label: 'Monthly Revenue per User ($)', placeholder: 'e.g. 50', type: 'number' },
      { name: 'grossMargin', label: 'Gross Margin (%)', placeholder: 'e.g. 80', type: 'number' },
      { name: 'monthlyChurn', label: 'Monthly Churn Rate (%)', placeholder: 'e.g. 3', type: 'number' },
      { name: 'cac', label: 'Customer Acquisition Cost ($)', placeholder: 'e.g. 150', type: 'number' },
    ],
  },
  {
    slug: 'solopreneur-saas-valuation-calculator',
    title: 'SaaS Valuation Calculator',
    description: 'Estimate your SaaS company valuation based on ARR, growth rate, and profit margin. See how different multiples and scenarios affect your exit value.',
    categoryId: 'C',
    inputs: [
      { name: 'annualRevenue', label: 'Annual Revenue / ARR ($)', placeholder: 'e.g. 200000', type: 'number' },
      { name: 'growthRate', label: 'YoY Growth Rate (%)', placeholder: 'e.g. 50', type: 'number' },
      { name: 'profitMargin', label: 'Profit Margin (%)', placeholder: 'e.g. 25', type: 'number' },
    ],
  },

  // ===== Category D: Freelance Pricing =====
  {
    slug: 'solopreneur-affiliate-income-calculator',
    title: 'Affiliate Income Calculator',
    description: 'Estimate your monthly and annual affiliate income based on traffic, conversion rate, and average commission.',
    categoryId: 'D',
    inputs: [
      { name: 'monthlyTraffic', label: 'Monthly Traffic (visitors)', placeholder: 'e.g. 50000', type: 'number' },
      { name: 'conversionRate', label: 'Conversion Rate (%)', placeholder: 'e.g. 2', type: 'number' },
      { name: 'avgCommission', label: 'Average Commission ($)', placeholder: 'e.g. 50', type: 'number' },
    ],
  },
  {
    slug: 'solopreneur-break-even-calculator',
    title: 'Break-Even Calculator',
    description: 'Calculate how many months until you break even on your initial investment. Model different cost and revenue scenarios.',
    categoryId: 'C',
    inputs: [
      { name: 'monthlyCosts', label: 'Monthly Costs ($)', placeholder: 'e.g. 500', type: 'number' },
      { name: 'monthlyRevenue', label: 'Monthly Revenue ($)', placeholder: 'e.g. 1000', type: 'number' },
      { name: 'initialInvestment', label: 'Initial Investment ($)', placeholder: 'e.g. 5000', type: 'number' },
    ],
  },
  {
    slug: 'solopreneur-course-pricing-calculator',
    title: 'Course Pricing Calculator',
    description: 'Find the optimal course price to hit your income goals, factoring in platform fees. Compare revenue at different price points.',
    categoryId: 'D',
    inputs: [
      { name: 'targetMonthlyIncome', label: 'Target Monthly Income ($)', placeholder: 'e.g. 5000', type: 'number' },
      { name: 'estimatedBuyersPerMonth', label: 'Est. Buyers Per Month', placeholder: 'e.g. 50', type: 'number' },
      { name: 'platformFee', label: 'Platform Fee (%)', placeholder: 'e.g. 10', type: 'number' },
    ],
  },
  {
    slug: 'solopreneur-email-list-revenue-calculator',
    title: 'Email List Revenue Calculator',
    description: 'Calculate how much revenue your email list generates per send, per month, and per year based on your funnel metrics.',
    categoryId: 'D',
    inputs: [
      { name: 'subscriberCount', label: 'Number of Subscribers', placeholder: 'e.g. 10000', type: 'number' },
      { name: 'openRate', label: 'Open Rate (%)', placeholder: 'e.g. 25', type: 'number' },
      { name: 'clickRate', label: 'Click Rate (% of opens)', placeholder: 'e.g. 5', type: 'number' },
      { name: 'conversionRate', label: 'Conversion Rate (% of clicks)', placeholder: 'e.g. 2', type: 'number' },
      { name: 'avgOrderValue', label: 'Avg Order Value ($)', placeholder: 'e.g. 50', type: 'number' },
    ],
  },
  {
    slug: 'solopreneur-freelance-rate-calculator',
    title: 'Freelance Rate Calculator',
    description: 'Calculate your ideal hourly, daily, and monthly rate based on your skill, experience level, and market location.',
    categoryId: 'D',
    inputs: [
      { name: 'skill', label: 'Your Skill', placeholder: '', type: 'select', options: ['developer', 'designer', 'writer', 'marketer', 'consultant'] },
      { name: 'experience', label: 'Experience Level', placeholder: '', type: 'select', options: ['junior', 'mid', 'senior', 'expert'] },
      { name: 'location', label: 'Target Market', placeholder: '', type: 'select', options: ['us', 'europe', 'asia', 'remote'] },
    ],
  },
  {
    slug: 'solopreneur-hourly-vs-fixed-calculator',
    title: 'Hourly vs Fixed Rate Calculator',
    description: 'Calculate the hourly rate, monthly retainer, and project equivalents needed to reach your annual income goal.',
    categoryId: 'D',
    inputs: [
      { name: 'annualIncomeGoal', label: 'Annual Income Goal ($)', placeholder: 'e.g. 100000', type: 'number' },
      { name: 'billableHoursPerWeek', label: 'Billable Hours Per Week', placeholder: 'e.g. 30', type: 'number' },
      { name: 'weeksOffPerYear', label: 'Weeks Off Per Year', placeholder: 'e.g. 4', type: 'number' },
    ],
  },
  {
    slug: 'solopreneur-mrr-calculator',
    title: 'MRR Calculator',
    description: 'Track your MRR health: new vs churned vs expansion revenue, monthly growth rate, and time to reach key milestones.',
    categoryId: 'A',
    inputs: [
      { name: 'subscriberCount', label: 'Current Subscribers', placeholder: 'e.g. 500', type: 'number' },
      { name: 'monthlyPrice', label: 'Monthly Price ($)', placeholder: 'e.g. 29', type: 'number' },
      { name: 'monthlyChurnRate', label: 'Monthly Churn Rate (%)', placeholder: 'e.g. 3', type: 'number' },
      { name: 'expansionMRR', label: 'Expansion MRR ($/mo)', placeholder: 'e.g. 800 (upgrades & add-ons)', type: 'number' },
      { name: 'newSubsPerMonth', label: 'New Subscribers / Month', placeholder: 'e.g. 100', type: 'number' },
      { name: 'contractionMRR', label: 'Contraction MRR ($/mo)', placeholder: 'e.g. 150 (downgrades & reductions)', type: 'number' },
      { name: 'reactivationMRR', label: 'Reactivation MRR ($/mo)', placeholder: 'e.g. 100 (returned customers)', type: 'number' },
    ],
  },
  {
    slug: 'solopreneur-project-profitability-calculator',
    title: 'Project Profitability Calculator',
    description: 'Calculate profit, effective hourly rate, and profit margin for any freelance project. Compare outcomes at different cost rates.',
    categoryId: 'D',
    inputs: [
      { name: 'projectRevenue', label: 'Project Revenue ($)', placeholder: 'e.g. 5000', type: 'number' },
      { name: 'hoursEstimated', label: 'Estimated Hours', placeholder: 'e.g. 40', type: 'number' },
      { name: 'hourlyCost', label: 'Your Hourly Cost ($)', placeholder: 'e.g. 50', type: 'number' },
      { name: 'materialCost', label: 'Material/Tool Costs ($)', placeholder: 'e.g. 200', type: 'number' },
    ],
  },
  {
    slug: 'solopreneur-revenue-projector',
    title: 'SaaS Financial Forecaster',
    description: 'The complete SaaS financial health dashboard: net-growth projections, runway, breakeven, burn metrics, LTV, sensitivity analysis, and what-if scenarios.',
    categoryId: 'A',
    inputs: [
      { name: 'currentMRR', label: 'Current MRR ($)', placeholder: 'e.g. 5000', type: 'number' },
      { name: 'monthlyGrowthRate', label: 'Monthly Growth Rate (%)', placeholder: 'e.g. 8', type: 'number' },
      { name: 'monthlyChurnRate', label: 'Monthly Churn Rate (%)', placeholder: 'e.g. 3', type: 'number' },
      { name: 'monthlyExpenses', label: 'Monthly Expenses ($)', placeholder: 'e.g. 3000', type: 'number' },
      { name: 'cashOnHand', label: 'Cash on Hand ($)', placeholder: 'e.g. 60000', type: 'number' },
      { name: 'arpu', label: 'Avg Revenue Per User ($)', placeholder: 'e.g. 25', type: 'number' },
      { name: 'customGrowthRate', label: 'Custom Growth Rate (%)', placeholder: 'e.g. 7 (optional)', type: 'number' },
      { name: 'cac', label: 'CAC — Customer Acquisition Cost ($)', placeholder: 'e.g. 200 (optional)', type: 'number' },
      { name: 'months', label: 'Projection Period', placeholder: '', type: 'select', options: ['6', '12', '24'] },
    ],
  },
  {
    slug: 'solopreneur-saas-pricing-planner',
    title: 'SaaS Pricing Planner',
    description: 'Compare flat, tiered, usage-based, and freemium pricing models. Get personalized recommendations based on your product type, audience, and competitor prices.',
    categoryId: 'E',
    inputs: [
      { name: 'productType', label: 'Product Type', placeholder: '', type: 'select', options: ['SaaS', 'ebook', 'course', 'template', 'newsletter'] },
      { name: 'targetCustomer', label: 'Target Customer', placeholder: '', type: 'select', options: ['b2b', 'b2c', 'developers', 'creators'] },
      { name: 'competitorPrice', label: 'Competitor Average Price ($)', placeholder: 'e.g. 29', type: 'number' },
    ],
  },

  // ===== Category E: Cost & Efficiency =====
  {
    slug: 'solopreneur-employee-cost-calculator',
    title: 'Employee Cost Calculator',
    description: 'Calculate the true cost of hiring an employee, including benefits, employer taxes, and overhead. Compare costs across salary levels and locations.',
    categoryId: 'E',
    inputs: [
      { name: 'annualSalary', label: 'Annual Base Salary ($)', placeholder: 'e.g. 80000', type: 'number' },
      { name: 'benefitsPercentage', label: 'Benefits (% of salary)', placeholder: 'e.g. 30', type: 'number' },
      { name: 'location', label: 'Hiring Location', placeholder: '', type: 'select', options: ['us', 'uk', 'europe', 'asia', 'remote'] },
    ],
  },
  {
    slug: 'solopreneur-meeting-cost-calculator',
    title: 'Meeting Cost Calculator',
    description: 'Calculate the true dollar cost of meetings based on attendee count, hourly rates, meeting length, and frequency.',
    categoryId: 'E',
    inputs: [
      { name: 'attendees', label: 'Number of Attendees', placeholder: 'e.g. 6', type: 'number' },
      { name: 'avgHourlyRate', label: 'Avg Hourly Rate ($)', placeholder: 'e.g. 75', type: 'number' },
      { name: 'meetingMinutes', label: 'Meeting Length (minutes)', placeholder: 'e.g. 30', type: 'number' },
      { name: 'meetingsPerWeek', label: 'Meetings Per Week', placeholder: 'e.g. 1', type: 'number' },
    ],
  },

  // ===== Category F: Investment & ROI =====
  {
    slug: 'solopreneur-equity-dilution-calculator',
    title: 'Equity Dilution Calculator',
    description: 'Model how investment rounds dilute founder equity. Calculate post-money valuation, investor ownership, and your remaining shares after funding.',
    categoryId: 'C',
    inputs: [
      { name: 'companyValuation', label: 'Pre-Money Valuation ($)', placeholder: 'e.g. 5000000', type: 'number' },
      { name: 'investmentAmount', label: 'Investment Amount ($)', placeholder: 'e.g. 1000000', type: 'number' },
      { name: 'founderShares', label: 'Founder Shares Issued', placeholder: 'e.g. 10000000', type: 'number' },
    ],
  },
  {
    slug: 'solopreneur-freelance-tax-calculator',
    title: 'Freelance Tax Calculator',
    description: 'Estimate your freelance taxes across 5 countries. See your taxable income, quarterly payments, effective tax rate, and monthly take-home pay.',
    categoryId: 'F',
    inputs: [
      { name: 'annualIncome', label: 'Annual Income ($)', placeholder: 'e.g. 100000', type: 'number' },
      { name: 'businessExpenses', label: 'Business Expenses ($)', placeholder: 'e.g. 15000', type: 'number' },
      { name: 'country', label: 'Country', placeholder: '', type: 'select', options: ['us', 'uk', 'canada', 'australia', 'germany'] },
    ],
  },
  {
    slug: 'solopreneur-productivity-score',
    title: 'Productivity Score Calculator',
    description: 'Rate your solopreneur productivity with a scored assessment. Get actionable tips based on your deep work hours, tool stack, and meeting load.',
    categoryId: 'E',
    inputs: [
      { name: 'weeklyDeepWorkHours', label: 'Weekly Deep Work Hours', placeholder: 'e.g. 15', type: 'number' },
      { name: 'toolsUsed', label: 'Tools / Apps Used Weekly', placeholder: 'e.g. 5', type: 'number' },
      { name: 'meetingsPerWeek', label: 'Meetings Per Week', placeholder: 'e.g. 3', type: 'number' },
    ],
  },
  {
    slug: 'solopreneur-sponsorship-rate-calculator',
    title: 'Sponsorship Rate Calculator',
    description: 'Estimate what brands will pay to sponsor your content. Calculate CPM-based rates for podcasts, newsletters, YouTube, and blogs.',
    categoryId: 'F',
    inputs: [
      { name: 'monthlyDownloads', label: 'Monthly Downloads / Listens', placeholder: 'e.g. 10000', type: 'number' },
      { name: 'emailSubscribers', label: 'Email Subscribers', placeholder: 'e.g. 5000', type: 'number' },
      { name: 'socialFollowers', label: 'Social Media Followers', placeholder: 'e.g. 15000', type: 'number' },
      { name: 'contentType', label: 'Content Type', placeholder: '', type: 'select', options: ['podcast', 'newsletter', 'youtube', 'blog'] },
    ],
  },
  {
    slug: 'solopreneur-time-value-calculator',
    title: 'Time Value Calculator',
    description: 'Discover what your time is really worth. Calculate your hourly rate and see the dollar cost of meetings, distractions, and daily time waste.',
    categoryId: 'F',
    inputs: [
      { name: 'annualIncome', label: 'Annual Income ($)', placeholder: 'e.g. 100000', type: 'number' },
      { name: 'hoursPerWeek', label: 'Hours Worked Per Week', placeholder: 'e.g. 40', type: 'number' },
      { name: 'weeksPerYear', label: 'Weeks Worked Per Year', placeholder: 'e.g. 48', type: 'number' },
    ],
  },
];
