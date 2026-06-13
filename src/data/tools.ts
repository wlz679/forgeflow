export interface ToolMeta {
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  inputs: { name: string; label: string; placeholder: string; type: 'text' | 'select' | 'number'; options?: string[] }[];
}

export const tools: ToolMeta[] = [
  // ===== Category A: Market Sizing =====
  {
    slug: 'solopreneur-burn-rate-calculator',
    title: 'Burn Rate Calculator',
    description: 'Calculate your net monthly burn rate by comparing starting vs ending cash over a period. See how different cash levels affect your runway.',
    categoryId: 'A',
    inputs: [
      { name: 'startingCash', label: 'Starting Cash ($)', placeholder: 'e.g. 100000', type: 'number' },
      { name: 'endingCash', label: 'Ending Cash ($)', placeholder: 'e.g. 70000', type: 'number' },
      { name: 'months', label: 'Number of Months', placeholder: 'e.g. 6', type: 'number' },
    ],
  },
  {
    slug: 'solopreneur-churn-rate-calculator',
    title: 'Churn Rate Calculator',
    description: 'Calculate your monthly and annual customer churn rate. See churn impact on revenue and compare different churn scenarios.',
    categoryId: 'A',
    inputs: [
      { name: 'customersStart', label: 'Customers at Start of Month', placeholder: 'e.g. 500', type: 'number' },
      { name: 'customersLost', label: 'Customers Lost This Month', placeholder: 'e.g. 15', type: 'number' },
      { name: 'newCustomers', label: 'New Customers This Month', placeholder: 'e.g. 25', type: 'number' },
      { name: 'avgRevenuePerCustomer', label: 'Avg Revenue per Customer ($)', placeholder: 'e.g. 50', type: 'number' },
    ],
  },
  {
    slug: 'solopreneur-market-size-estimator',
    title: 'Market Size Estimator',
    description: 'Get TAM, SAM, growth rate, and key driver estimates for any industry or product category.',
    categoryId: 'A',
    inputs: [
      { name: 'topic', label: 'Industry or Product Category', placeholder: 'e.g. AI productivity tools, pet care', type: 'text' },
    ],
  },
  {
    slug: 'solopreneur-openai-token-calculator',
    title: 'OpenAI Token Calculator',
    description: 'Estimate your OpenAI API costs based on model, token usage, and request volume.',
    categoryId: 'B',
    inputs: [
      { name: 'model', label: 'Model', placeholder: '', type: 'select', options: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o-mini'] },
      { name: 'inputTokens', label: 'Input Tokens per Request', placeholder: 'e.g. 1000', type: 'number' },
      { name: 'outputTokens', label: 'Output Tokens per Request', placeholder: 'e.g. 500', type: 'number' },
      { name: 'requestsPerDay', label: 'Requests per Day', placeholder: 'e.g. 100', type: 'number' },
    ],
  },
  {
    slug: 'solopreneur-claude-api-cost-calculator',
    title: 'Claude API Cost Calculator',
    description: 'Calculate Claude API costs for Opus, Sonnet, and Haiku models.',
    categoryId: 'B',
    inputs: [
      { name: 'model', label: 'Model', placeholder: '', type: 'select', options: ['claude-opus', 'claude-sonnet', 'claude-haiku'] },
      { name: 'inputTokens', label: 'Input Tokens per Request', placeholder: 'e.g. 1000', type: 'number' },
      { name: 'outputTokens', label: 'Output Tokens per Request', placeholder: 'e.g. 500', type: 'number' },
      { name: 'requestsPerDay', label: 'Requests per Day', placeholder: 'e.g. 100', type: 'number' },
    ],
  },
  {
    slug: 'solopreneur-deepseek-api-cost-calculator',
    title: 'DeepSeek API Cost Calculator',
    description: 'Calculate DeepSeek API costs and compare savings vs OpenAI.',
    categoryId: 'B',
    inputs: [
      { name: 'model', label: 'Model', placeholder: '', type: 'select', options: ['deepseek-chat', 'deepseek-reasoner'] },
      { name: 'inputTokens', label: 'Input Tokens per Request', placeholder: 'e.g. 1000', type: 'number' },
      { name: 'outputTokens', label: 'Output Tokens per Request', placeholder: 'e.g. 500', type: 'number' },
      { name: 'requestsPerDay', label: 'Requests per Day', placeholder: 'e.g. 100', type: 'number' },
    ],
  },
  {
    slug: 'solopreneur-gemini-api-cost-calculator',
    title: 'Gemini API Cost Calculator',
    description: 'Calculate Google Gemini API costs for 2.0 Flash, 1.5 Pro, and 1.5 Flash models.',
    categoryId: 'B',
    inputs: [
      { name: 'model', label: 'Model', placeholder: '', type: 'select', options: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'] },
      { name: 'inputTokens', label: 'Input Tokens per Request', placeholder: 'e.g. 1000', type: 'number' },
      { name: 'outputTokens', label: 'Output Tokens per Request', placeholder: 'e.g. 500', type: 'number' },
      { name: 'requestsPerDay', label: 'Requests per Day', placeholder: 'e.g. 100', type: 'number' },
    ],
  },
  {
    slug: 'solopreneur-ai-image-cost-calculator',
    title: 'AI Image Generation Cost Calculator',
    description: 'Estimate costs for AI image generation across DALL-E 3, Midjourney, and Stable Diffusion.',
    categoryId: 'B',
    inputs: [
      { name: 'provider', label: 'Provider', placeholder: '', type: 'select', options: ['dall-e-3', 'dall-e-2', 'midjourney', 'stable-diffusion'] },
      { name: 'imagesPerMonth', label: 'Images per Month', placeholder: 'e.g. 100', type: 'number' },
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
    description: 'Compare AI API costs across GPT-4o, Claude, Gemini, and DeepSeek side by side.',
    categoryId: 'B',
    inputs: [
      { name: 'monthlyInputTokens', label: 'Monthly Input Tokens', placeholder: 'e.g. 1000000', type: 'number' },
      { name: 'monthlyOutputTokens', label: 'Monthly Output Tokens', placeholder: 'e.g. 500000', type: 'number' },
    ],
  },

  // Unit Economics — per-customer profitability analysis
  {
    slug: 'solopreneur-unit-economics-calculator',
    title: 'Unit Economics Calculator',
    description: 'Analyze per-customer profitability: gross margin, CAC payback, LTV, and how to optimize your unit economics.',
    categoryId: 'C',
    inputs: [
      { name: 'averageRevenuePerCustomer', label: 'Avg Monthly Revenue per Customer ($)', placeholder: 'e.g. 50', type: 'number' },
      { name: 'costToServePerCustomer', label: 'Monthly Cost to Serve per Customer ($)', placeholder: 'e.g. 10', type: 'number' },
      { name: 'customerAcquisitionCost', label: 'Customer Acquisition Cost ($)', placeholder: 'e.g. 200', type: 'number' },
      { name: 'monthlyChurnRate', label: 'Monthly Churn Rate (%)', placeholder: 'e.g. 3', type: 'number' },
    ],
  },

  // ===== Category B: Branding & Naming =====
  {
    slug: 'solopreneur-cac-calculator',
    title: 'CAC Calculator',
    description: 'Calculate your Customer Acquisition Cost and payback period. Compare different spend scenarios to find your most efficient acquisition budget.',
    categoryId: 'B',
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
    categoryId: 'B',
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
    categoryId: 'B',
    inputs: [
      { name: 'annualRevenue', label: 'Annual Revenue / ARR ($)', placeholder: 'e.g. 200000', type: 'number' },
      { name: 'growthRate', label: 'YoY Growth Rate (%)', placeholder: 'e.g. 50', type: 'number' },
      { name: 'profitMargin', label: 'Profit Margin (%)', placeholder: 'e.g. 25', type: 'number' },
    ],
  },

  // ===== Category C: Pricing & Finance =====
  {
    slug: 'solopreneur-affiliate-income-calculator',
    title: 'Affiliate Income Calculator',
    description: 'Estimate your monthly and annual affiliate income based on traffic, conversion rate, and average commission.',
    categoryId: 'C',
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
    categoryId: 'C',
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
    categoryId: 'C',
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
    categoryId: 'C',
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
    categoryId: 'C',
    inputs: [
      { name: 'annualIncomeGoal', label: 'Annual Income Goal ($)', placeholder: 'e.g. 100000', type: 'number' },
      { name: 'billableHoursPerWeek', label: 'Billable Hours Per Week', placeholder: 'e.g. 30', type: 'number' },
      { name: 'weeksOffPerYear', label: 'Weeks Off Per Year', placeholder: 'e.g. 4', type: 'number' },
    ],
  },
  {
    slug: 'solopreneur-mrr-calculator',
    title: 'MRR Calculator',
    description: 'Calculate your Monthly Recurring Revenue from subscriber count and pricing. See how different subscriber levels and prices scale.',
    categoryId: 'C',
    inputs: [
      { name: 'subscriberCount', label: 'Number of Subscribers', placeholder: 'e.g. 500', type: 'number' },
      { name: 'monthlyPrice', label: 'Monthly Price ($)', placeholder: 'e.g. 29', type: 'number' },
      { name: 'annualDiscount', label: 'Annual Plan Discount', placeholder: '', type: 'select', options: ['0%', '10%', '20%', '30%'] },
    ],
  },
  {
    slug: 'solopreneur-project-profitability-calculator',
    title: 'Project Profitability Calculator',
    description: 'Calculate profit, effective hourly rate, and profit margin for any freelance project. Compare outcomes at different cost rates.',
    categoryId: 'C',
    inputs: [
      { name: 'projectRevenue', label: 'Project Revenue ($)', placeholder: 'e.g. 5000', type: 'number' },
      { name: 'hoursEstimated', label: 'Estimated Hours', placeholder: 'e.g. 40', type: 'number' },
      { name: 'hourlyCost', label: 'Your Hourly Cost ($)', placeholder: 'e.g. 50', type: 'number' },
      { name: 'materialCost', label: 'Material/Tool Costs ($)', placeholder: 'e.g. 200', type: 'number' },
    ],
  },
  {
    slug: 'solopreneur-revenue-projector',
    title: 'Revenue Projector',
    description: 'Project your MRR growth over 6, 12, or 24 months. Compare different growth rate scenarios to plan your financial future.',
    categoryId: 'C',
    inputs: [
      { name: 'currentMRR', label: 'Current MRR ($)', placeholder: 'e.g. 2000', type: 'number' },
      { name: 'monthlyGrowthRate', label: 'Monthly Growth Rate (%)', placeholder: 'e.g. 5', type: 'number' },
      { name: 'months', label: 'Projection Period', placeholder: '', type: 'select', options: ['6', '12', '24'] },
    ],
  },
  {
    slug: 'solopreneur-saas-pricing-planner',
    title: 'SaaS Pricing Planner',
    description: 'Compare flat, tiered, usage-based, and freemium pricing models. Get personalized recommendations based on your product type, audience, and competitor prices.',
    categoryId: 'C',
    inputs: [
      { name: 'productType', label: 'Product Type', placeholder: '', type: 'select', options: ['SaaS', 'ebook', 'course', 'template', 'newsletter'] },
      { name: 'targetCustomer', label: 'Target Customer', placeholder: '', type: 'select', options: ['b2b', 'b2c', 'developers', 'creators'] },
      { name: 'competitorPrice', label: 'Competitor Average Price ($)', placeholder: 'e.g. 29', type: 'number' },
    ],
  },

  // ===== Category D: Landing Page & Copy =====
  {
    slug: 'solopreneur-employee-cost-calculator',
    title: 'Employee Cost Calculator',
    description: 'Calculate the true cost of hiring an employee, including benefits, employer taxes, and overhead. Compare costs across salary levels and locations.',
    categoryId: 'D',
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
    categoryId: 'D',
    inputs: [
      { name: 'attendees', label: 'Number of Attendees', placeholder: 'e.g. 6', type: 'number' },
      { name: 'avgHourlyRate', label: 'Avg Hourly Rate ($)', placeholder: 'e.g. 75', type: 'number' },
      { name: 'meetingMinutes', label: 'Meeting Length (minutes)', placeholder: 'e.g. 30', type: 'number' },
      { name: 'meetingsPerWeek', label: 'Meetings Per Week', placeholder: 'e.g. 1', type: 'number' },
    ],
  },

  // ===== Category E: Launch & Growth =====
  {
    slug: 'solopreneur-equity-dilution-calculator',
    title: 'Equity Dilution Calculator',
    description: 'Model how investment rounds dilute founder equity. Calculate post-money valuation, investor ownership, and your remaining shares after funding.',
    categoryId: 'E',
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
    categoryId: 'E',
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
    categoryId: 'E',
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
    categoryId: 'E',
    inputs: [
      { name: 'annualIncome', label: 'Annual Income ($)', placeholder: 'e.g. 100000', type: 'number' },
      { name: 'hoursPerWeek', label: 'Hours Worked Per Week', placeholder: 'e.g. 40', type: 'number' },
      { name: 'weeksPerYear', label: 'Weeks Worked Per Year', placeholder: 'e.g. 48', type: 'number' },
    ],
  },
];
