// Customer Support ToolMeta entries (P12 batch, 6 calcs).
// Per-task adds one entry. See src/data/tools/index.ts for barrel.
import type { ToolMeta } from './types';
export const tools: ToolMeta[] = [
  {
    slug: 'solopreneur-cost-per-support-ticket-calculator',
    title: 'Cost-per-Support-Ticket',
    description:
      'Compute weighted average cost-per-support-ticket across multi-tier T1/T2/T3 structure. INVERSE health bands — lower $/ticket = better cost control: 🟢 ≤$10 · 🟡 $10-$25 · 🟠 $25-$50 · 🔴 >$50. For mid-market B2B SaaS ($10M-$50M ARR) CS Ops managers and Head-of-CS.',
    categoryId: 'T',
    applicationCategory: 'BusinessApplication',
    inputs: [
      { name: 't1_cost',        label: 'T1 cost per ticket ($)',  placeholder: 'e.g. 8',    type: 'number' },
      { name: 't2_cost',        label: 'T2 cost per ticket ($)',  placeholder: 'e.g. 25',   type: 'number' },
      { name: 't3_cost',        label: 'T3 cost per ticket ($)',  placeholder: 'e.g. 70',   type: 'number' },
      { name: 't1_share',       label: 'T1 share of tickets (%)', placeholder: 'e.g. 55',   type: 'number' },
      { name: 't2_share',       label: 'T2 share of tickets (%)', placeholder: 'e.g. 30',   type: 'number' },
      { name: 'monthly_volume', label: 'Monthly ticket volume',   placeholder: 'e.g. 5000', type: 'number' },
    ],
    keywords: [
      'cost per support ticket',
      'support ticket cost',
      'tier 1 cost',
      'tier 2 cost',
      'tier 3 cost',
      'multi tier support cost',
      'TSIA benchmark',
      'Zendesk cost',
      'mid-market SaaS support',
    ],
    tags: ['customer-support', 'cs-ops', 'cost'],
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-07-10',
    sources: [
      'https://www.tsia.com/blog/support-operations-benchmark',
      'https://www.zendesk.com/customer-experience-trends/',
      'https://www.freshworks.com/customer-service-benchmark/',
    ],
  },
];