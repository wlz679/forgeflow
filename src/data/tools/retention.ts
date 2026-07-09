// Retention & Customer Success ToolMeta entries (P9 batch, 6 calcs).
// Per-task adds one entry. See src/data/tools/index.ts for barrel.
import type { ToolMeta } from './types';
export const tools: ToolMeta[] = [
  {
    slug: 'solopreneur-nrr-calculator',
    title: 'NRR Calculator',
    description:
      'Compute Net Revenue Retention (NRR) — the headline SaaS metric every board reports. NRR measures how much revenue you keep + grow from existing customers. For mid-market B2B SaaS ($10M–$50M ARR) CSMs and RevOps leads.',
    categoryId: 'R',
    applicationCategory: 'BusinessApplication',
    inputs: [
      { name: 'startingMRR',  label: 'Starting MRR (USD)', placeholder: 'e.g. 100000', type: 'number' },
      { name: 'expansionMRR', label: 'Expansion MRR (upsell + cross-sell)', placeholder: 'e.g. 15000', type: 'number' },
      { name: 'downgradeMRR', label: 'Downgrade MRR', placeholder: 'e.g. 5000', type: 'number' },
      { name: 'churnedMRR',   label: 'Churned MRR', placeholder: 'e.g. 8000', type: 'number' },
    ],
    keywords: [
      'NRR calculator',
      'net revenue retention',
      'NRR',
      'net dollar retention',
      'NDR',
      'retention metric',
      'saas KPI',
      'expansion revenue',
      'B2B SaaS',
      'mid-market SaaS',
    ],
    tags: ['retention', 'csm', 'nrr', 'saas-metrics'],
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-07-09',
    sources: [
      'https://www.saas-capital.com/blog-posts/saas-retention-metrics/',
      'https://openviewpartners.com/blog/the-real-story-behind-net-dollar-retention/',
      'https://www.iconiqcapital.com/growth/tte-net-dollar-retention',
    ],
  },
  {
    slug: 'solopreneur-grr-calculator',
    title: 'GRR Calculator',
    description:
      'Compute Gross Revenue Retention (GRR) — the pure retention signal that strips out expansion. GRR ≤ 100% always. Health bands: 🟢 ≥95% · 🟡 90-95% · 🟠 80-90% · 🔴 <80%. For mid-market B2B SaaS ($10M–$50M ARR) CSMs and RevOps leads.',
    categoryId: 'R',
    applicationCategory: 'BusinessApplication',
    inputs: [
      { name: 'startingMRR',  label: 'Starting MRR (USD)', placeholder: 'e.g. 100000', type: 'number' },
      { name: 'downgradeMRR', label: 'Downgrade MRR',       placeholder: 'e.g. 5000',   type: 'number' },
      { name: 'churnedMRR',   label: 'Churned MRR',         placeholder: 'e.g. 8000',   type: 'number' },
    ],
    keywords: [
      'GRR calculator',
      'gross revenue retention',
      'GRR',
      'gross retention',
      'retention metric',
      'saas retention',
      'B2B SaaS',
      'mid-market SaaS',
      'churn rate',
    ],
    tags: ['retention', 'csm', 'grr', 'saas-metrics'],
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-07-09',
    sources: [
      'https://www.saas-capital.com/blog-posts/saas-retention-metrics/',
      'https://openviewpartners.com/blog/the-real-story-behind-net-dollar-retention/',
      'https://www.iconiqcapital.com/growth/tte-net-dollar-retention',
    ],
  },
];