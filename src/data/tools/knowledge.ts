// Knowledge/Documentation ToolMeta entries (P13 batch, 6 calcs).
// Per-task adds one entry. See src/data/tools/index.ts for barrel.
import type { ToolMeta } from './types';
export const tools: ToolMeta[] = [
  {
    slug: 'solopreneur-kb-coverage-rate-calculator',
    title: 'KB Coverage Rate',
    description:
      'Measure what % of inbound support tickets have a matching KB article. HIGHER health bands — more coverage = better self-service: 🟢 ≥85% · 🟡 60-85% · 🟠 40-60% · 🔴 <40%. For mid-market B2B SaaS ($10M-$50M ARR) DevRel Leads, Documentation Managers, and Technical Writers.',
    categoryId: 'K',
    applicationCategory: 'BusinessApplication',
    inputs: [
      { name: 'monthly_tickets',         label: 'Monthly inbound tickets',  placeholder: 'e.g. 5000', type: 'number' },
      { name: 'tickets_with_kb_match',   label: 'Tickets with KB match',   placeholder: 'e.g. 3500', type: 'number' },
      { name: 'total_articles',          label: 'Total KB articles',       placeholder: 'e.g. 500',  type: 'number' },
      { name: 'industry_benchmark',      label: 'Industry',                placeholder: 'SaaS',      type: 'select', options: ['SaaS', 'FinTech', 'HealthTech', 'eCommerce'] },
    ],
    keywords: [
      'kb coverage',
      'kb coverage rate',
      'knowledge base coverage',
      'article coverage',
      'kb gap',
      'support ticket matching',
      'tsia knowledge management',
      'zendesk knowledge',
      'mid-market saas documentation',
    ],
    tags: ['knowledge', 'kb', 'coverage'],
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-07-12',
    sources: [
      'https://www.tsia.com/blog/knowledge-management-benchmark',
      'https://www.zendesk.com/customer-experience-trends/',
      'https://www.nngroup.com/articles/help-and-documentation/',
    ],
  },
];
