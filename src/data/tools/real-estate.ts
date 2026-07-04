import type { ToolMeta } from './types';

export const tools: ToolMeta[] = [
  {
    slug: 'solopreneur-mortgage-calculator',
    title: 'Mortgage Calculator',
    description:
      'Calculate your monthly P&I payment, total interest over the loan term, and amortization milestones. Compare 15y vs 30y terms, model rate changes, and check LTV-driven PMI implications.',
    categoryId: 'F',
    applicationCategory: 'FinanceApplication',
    inputs: [
      { name: 'homePrice', label: 'Home Price ($)', placeholder: 'e.g. 500000', type: 'number' },
      { name: 'downPayment', label: 'Down Payment ($)', placeholder: 'e.g. 100000', type: 'number' },
      { name: 'loanTermYears', label: 'Loan Term (years)', placeholder: 'e.g. 30', type: 'number' },
      { name: 'interestRate', label: 'Annual Interest Rate (%)', placeholder: 'e.g. 6.5', type: 'number' },
    ],
    keywords: [
      'mortgage calculator',
      'monthly payment',
      'P&I',
      'amortization',
      'home loan',
      '15 vs 30 year mortgage',
      'PMI',
      'LTV',
    ],
    tags: ['mortgage', 'real-estate', 'finance'],
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-07-04',
    sources: [
      'https://www.bankrate.com/mortgages/mortgage-calculator',
      'https://www.consumerfinance.gov/owning-a-home/loan-estimate/',
    ],
  },
  {
    slug: 'solopreneur-rent-vs-buy-calculator',
    title: 'Rent vs Buy Calculator',
    description:
      'Decide whether to rent or buy with NPV comparison over your stay horizon. Includes down payment opportunity cost, selling costs, and appreciation. Multiplies into 6 time horizons to show how the answer changes with commitment length.',
    categoryId: 'F',
    applicationCategory: 'FinanceApplication',
    inputs: [
      { name: 'monthlyRent', label: 'Current Monthly Rent ($)', placeholder: 'e.g. 2000', type: 'number' },
      { name: 'homePrice', label: 'Home Purchase Price ($)', placeholder: 'e.g. 500000', type: 'number' },
      { name: 'downPayment', label: 'Down Payment ($)', placeholder: 'e.g. 100000', type: 'number' },
      { name: 'mortgageRate', label: 'Mortgage Rate (%)', placeholder: 'e.g. 6.5', type: 'number' },
      { name: 'yearsToStay', label: 'Years You Plan to Stay', placeholder: 'e.g. 7', type: 'number' },
      { name: 'annualAppreciation', label: 'Expected Home Appreciation (%/yr)', placeholder: 'e.g. 3', type: 'number' },
      { name: 'annualRentIncrease', label: 'Annual Rent Increase (%/yr)', placeholder: 'e.g. 3', type: 'number' },
    ],
    keywords: [
      'rent vs buy calculator',
      'rent or buy',
      'NPV real estate',
      'time horizon rent buy',
      'first time home buyer',
      'opportunity cost',
      'breakeven rent buy',
    ],
    tags: ['real-estate', 'decision', 'personal finance'],
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-07-04',
    sources: [
      'https://www.consumerfinance.gov/owning-a-home/',
      'https://www.bankrate.com/mortgages/rent-vs-buy-calculator/',
    ],
  },
  {
    slug: 'solopreneur-cap-rate-calculator',
    title: 'Cap Rate Calculator',
    description:
      'Calculate property cap rate (NOI / value) and compare to market benchmarks (Class A/B/C urban, value-add, distressed). Includes reverse implied-value calc at user-chosen target cap rates.',
    categoryId: 'F',
    applicationCategory: 'FinanceApplication',
    inputs: [
      { name: 'propertyValue', label: 'Property Value ($)', placeholder: 'e.g. 500000', type: 'number' },
      { name: 'annualRentIncome', label: 'Annual Gross Rental Income ($)', placeholder: 'e.g. 36000', type: 'number' },
      { name: 'annualExpenses', label: 'Annual Operating Expenses ($)', placeholder: 'e.g. 12000', type: 'number' },
      { name: 'vacancyRate', label: 'Vacancy Rate (%)', placeholder: 'e.g. 5', type: 'number' },
    ],
    keywords: [
      'cap rate calculator',
      'NOI',
      'rental property cap rate',
      'real estate investment',
      'Class A cap rate',
      'cap rate by city',
      'implied value',
    ],
    tags: ['real-estate', 'investment', 'cap-rate'],
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-07-04',
    sources: [
      'https://www.biggerpockets.com/blog/cap-rate-explained/',
      'https://www.bankrate.com/real-estate/cap-rate/',
    ],
  },
  // P5-4 rental-yield -- added in P5-4
  // P5-5 brrrr -- added in P5-5
  // P5-6 dscr -- added in P5-6
];
