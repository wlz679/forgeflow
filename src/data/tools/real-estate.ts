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
  // P5-2 rent-vs-buy -- added in P5-2
  // P5-3 cap-rate -- added in P5-3
  // P5-4 rental-yield -- added in P5-4
  // P5-5 brrrr -- added in P5-5
  // P5-6 dscr -- added in P5-6
];
