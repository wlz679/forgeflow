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
  {
    slug: 'solopreneur-article-freshness-calculator',
    title: 'Article Freshness',
    description:
      'Measure what % of KB articles are fresh (updated in last 12 months). HIGHER health bands - fresher content = better accuracy.',
    categoryId: 'K',
    applicationCategory: 'BusinessApplication',
    inputs: [
      { name: 'total_articles',        label: 'Total KB articles',            placeholder: 'e.g. 500', type: 'number' },
      { name: 'articles_updated_12mo', label: 'Articles updated in 12mo',     placeholder: 'e.g. 325', type: 'number' },
      { name: 'articles_updated_6mo',  label: 'Articles updated in 6mo',      placeholder: 'e.g. 200', type: 'number' },
      { name: 'target_freshness_pct',  label: 'Internal freshness target (%)', placeholder: 'e.g. 70', type: 'number' },
    ],
    keywords: [
      'article freshness',
      'kb freshness',
      'stale content',
      'content review cadence',
      'kb review',
      'last reviewed',
      'help center freshness',
      'documentation freshness',
      'mid-market saas documentation',
    ],
    tags: ['knowledge', 'kb', 'freshness'],
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-07-12',
    sources: [
      'https://www.nngroup.com/articles/help-and-documentation/',
      'https://www.tsia.com/blog/knowledge-centered-service',
      'https://www.intercom.com/help/articles/what-is-help-center-best-practices',
    ],
  },
];
