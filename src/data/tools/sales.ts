// Sales / CRM ToolMeta entries (P8 batch, 6 calcs).
// Per-task adds one entry. See src/data/tools/index.ts for barrel.
import type { ToolMeta } from './types';
export const tools: ToolMeta[] = [
  {
    slug: 'solopreneur-pipeline-value-calculator',
    title: 'Pipeline Value Calculator',
    description:
      'Compute the weighted value of your sales pipeline by stage probability. The fundamental sales KPI for B2B SaaS founders and sales managers.',
    categoryId: 'S',
    applicationCategory: 'BusinessApplication',
    inputs: [
      { name: 'discoveryCount', label: 'Discovery deals', placeholder: '10', type: 'number' },
      { name: 'discoverySize', label: 'Discovery avg deal size (USD)', placeholder: '15000', type: 'number' },
      { name: 'proposalCount', label: 'Proposal deals', placeholder: '5', type: 'number' },
      { name: 'proposalSize', label: 'Proposal avg deal size (USD)', placeholder: '25000', type: 'number' },
      { name: 'negotiationCount', label: 'Negotiation deals', placeholder: '3', type: 'number' },
      { name: 'negotiationSize', label: 'Negotiation avg deal size (USD)', placeholder: '35000', type: 'number' },
      { name: 'closingCount', label: 'Closing deals', placeholder: '2', type: 'number' },
      { name: 'closingSize', label: 'Closing avg deal size (USD)', placeholder: '45000', type: 'number' },
    ],
    keywords: [
      'pipeline value calculator',
      'sales pipeline',
      'weighted pipeline',
      'pipeline forecast',
      'deal probability',
      'stage probability',
      'sales KPI',
      'B2B SaaS sales',
      'pipeline coverage',
      'revenue forecast',
    ],
    tags: ['sales', 'pipeline', 'crm', 'forecast'],
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-07-07',
    sources: [
      'https://www.insivia.com/blog/sales-pipeline-value/',
      'https://blog.hubspot.com/sales/sales-pipeline',
      'https://www.salesforce.com/resources/articles/sales-pipeline/',
    ],
  },
];