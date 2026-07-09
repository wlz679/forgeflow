// Product Analytics ToolMeta entries (P10 batch, 6 calcs).
// Per-task adds one entry. See src/data/tools/index.ts for barrel.
import type { ToolMeta } from './types';
export const tools: ToolMeta[] = [
  {
    slug: 'solopreneur-funnel-step-calculator',
    title: 'Funnel Step Conversion Analyzer',
    description:
      'Compute end-to-end conversion across an in-product event funnel (2-5 steps) — the standard PM metric for measuring progression through product moments. Health bands: green >=40% · yellow 25-40% · orange 15-25% · red <15%. For mid-market B2B SaaS ($10M-$50M ARR) product managers.',
    categoryId: 'P',
    applicationCategory: 'BusinessApplication',
    inputs: [
      { name: 'step1', label: 'Step 1 - Entry event count', placeholder: 'e.g. 1000', type: 'number' },
      { name: 'step2', label: 'Step 2 - Next event count',  placeholder: 'e.g. 800',  type: 'number' },
      { name: 'step3', label: 'Step 3 (optional)',          placeholder: 'e.g. 500',  type: 'number' },
      { name: 'step4', label: 'Step 4 (optional)',          placeholder: 'e.g. 320',  type: 'number' },
    ],
    keywords: [
      'funnel step calculator',
      'in-product funnel',
      'conversion funnel',
      'event funnel',
      'funnel analysis',
      'product analytics',
      'PM',
      'B2B SaaS',
      'mid-market SaaS',
    ],
    tags: ['product-analytics', 'pm', 'funnel'],
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-07-09',
    sources: [
      'https://www.reforge.com/blog/growth-loops',
      'https://amplitude.com/blog/mobile-funnels',
      'https://mixpanel.com/blog/funnel-analysis/',
    ],
  },
];
