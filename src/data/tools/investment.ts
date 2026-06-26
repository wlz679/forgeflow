import type { ToolMeta } from './types';

export const tools: ToolMeta[] = [
  {
    slug: 'solopreneur-freelance-tax-calculator',
    title: 'Freelance Tax Calculator',
    description: 'Estimate your freelance taxes across 5 countries. See your taxable income, quarterly payments, effective tax rate, and monthly take-home pay.',
    categoryId: 'F',
    applicationCategory: 'FinanceApplication',
    inputs: [
      { name: 'annualIncome', label: 'Annual Income ($)', placeholder: 'e.g. 100000', type: 'number' },
      { name: 'businessExpenses', label: 'Business Expenses ($)', placeholder: 'e.g. 15000', type: 'number' },
      { name: 'country', label: 'Country', placeholder: '', type: 'select', options: ['us', 'uk', 'canada', 'australia', 'germany'] },
    ],
    keywords: ['freelance tax', 'tax', 'self-employment', 'quarterly tax', 'taxable income', 'freelance'],
    tags: ['tax', 'freelance', 'finance'],
  },
  {
    slug: 'solopreneur-sponsorship-rate-calculator',
    title: 'Sponsorship Rate Calculator',
    description: 'Estimate what brands will pay to sponsor your content. Calculate CPM-based rates for podcasts, newsletters, YouTube, and blogs.',
    categoryId: 'F',
    applicationCategory: 'FinanceApplication',
    inputs: [
      { name: 'monthlyDownloads', label: 'Monthly Downloads / Listens', placeholder: 'e.g. 10000', type: 'number' },
      { name: 'emailSubscribers', label: 'Email Subscribers', placeholder: 'e.g. 5000', type: 'number' },
      { name: 'socialFollowers', label: 'Social Media Followers', placeholder: 'e.g. 15000', type: 'number' },
      { name: 'contentType', label: 'Content Type', placeholder: '', type: 'select', options: ['podcast', 'newsletter', 'youtube', 'blog'] },
    ],
    keywords: ['sponsorship', 'cpm', 'creator', 'podcast', 'newsletter', 'pricing'],
    tags: ['sponsorship', 'creator', 'pricing'],
  },
  {
    slug: 'solopreneur-time-value-calculator',
    title: 'Time Value Calculator',
    description: 'Discover what your time is really worth. Calculate your hourly rate and see the dollar cost of meetings, distractions, and daily time waste.',
    categoryId: 'F',
    applicationCategory: 'FinanceApplication',
    inputs: [
      { name: 'annualIncome', label: 'Annual Income ($)', placeholder: 'e.g. 100000', type: 'number' },
      { name: 'hoursPerWeek', label: 'Hours Worked Per Week', placeholder: 'e.g. 40', type: 'number' },
      { name: 'weeksPerYear', label: 'Weeks Worked Per Year', placeholder: 'e.g. 48', type: 'number' },
    ],
    keywords: ['time value', 'hourly rate', 'productivity', 'freelance', 'time waste', 'annual income'],
    tags: ['time', 'productivity', 'rate'],
  }
];
