import type { ToolMeta } from './types';

export const tools: ToolMeta[] = [
  {
    slug: 'solopreneur-affiliate-income-calculator',
    title: 'Affiliate Income Calculator',
    description: 'Estimate your monthly and annual affiliate income based on traffic, conversion rate, and average commission.',
    categoryId: 'D',
    applicationCategory: 'BusinessApplication',
    inputs: [
      { name: 'monthlyTraffic', label: 'Monthly Traffic (visitors)', placeholder: 'e.g. 50000', type: 'number' },
      { name: 'conversionRate', label: 'Conversion Rate (%)', placeholder: 'e.g. 2', type: 'number' },
      { name: 'avgCommission', label: 'Average Commission ($)', placeholder: 'e.g. 50', type: 'number' },
    ],
  },
  {
    slug: 'solopreneur-course-pricing-calculator',
    title: 'Course Pricing Calculator',
    description: 'Find the optimal course price to hit your income goals, factoring in platform fees. Compare revenue at different price points.',
    categoryId: 'D',
    applicationCategory: 'BusinessApplication',
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
    applicationCategory: 'BusinessApplication',
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
    applicationCategory: 'BusinessApplication',
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
    applicationCategory: 'BusinessApplication',
    inputs: [
      { name: 'annualIncomeGoal', label: 'Annual Income Goal ($)', placeholder: 'e.g. 100000', type: 'number' },
      { name: 'billableHoursPerWeek', label: 'Billable Hours Per Week', placeholder: 'e.g. 30', type: 'number' },
      { name: 'weeksOffPerYear', label: 'Weeks Off Per Year', placeholder: 'e.g. 4', type: 'number' },
    ],
  },
  {
    slug: 'solopreneur-project-profitability-calculator',
    title: 'Project Profitability Calculator',
    description: 'Calculate profit, effective hourly rate, and profit margin for any freelance project. Compare outcomes at different cost rates.',
    categoryId: 'D',
    applicationCategory: 'BusinessApplication',
    inputs: [
      { name: 'projectRevenue', label: 'Project Revenue ($)', placeholder: 'e.g. 5000', type: 'number' },
      { name: 'hoursEstimated', label: 'Estimated Hours', placeholder: 'e.g. 40', type: 'number' },
      { name: 'hourlyCost', label: 'Your Hourly Cost ($)', placeholder: 'e.g. 50', type: 'number' },
      { name: 'materialCost', label: 'Material/Tool Costs ($)', placeholder: 'e.g. 200', type: 'number' },
    ],
  }
];
