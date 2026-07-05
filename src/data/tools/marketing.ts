import type { ToolMeta } from './types';

export const tools: ToolMeta[] = [
  {
    slug: 'solopreneur-roas-calculator',
    title: 'ROAS Calculator',
    description:
      'Calculate Return on Ad Spend (ROAS) with margin-aware net profit. See health bands, what-if scenarios (revenue +20% / spend -20%), break-even revenue, and 2x scaling projections. Industry benchmarks: 🟢 ≥4.0x · 🟡 2.0–4.0x · 🟠 1.0–2.0x · 🔴 <1.0x.',
    categoryId: 'M',
    applicationCategory: 'BusinessApplication',
    inputs: [
      { name: 'adSpend', label: 'Ad Spend ($)', placeholder: 'e.g. 5000', type: 'number' },
      { name: 'revenue', label: 'Revenue Generated ($)', placeholder: 'e.g. 20000', type: 'number' },
      { name: 'grossMargin', label: 'Gross Margin (%)', placeholder: 'e.g. 60', type: 'number' },
      {
        name: 'attributionWindow',
        label: 'Attribution Window',
        placeholder: '',
        type: 'select',
        options: ['7d', '14d', '28d', '90d'],
      },
    ],
    keywords: [
      'ROAS calculator',
      'return on ad spend',
      'ROAS',
      'ad spend ROI',
      'marketing ROI',
      'ROAS benchmark',
      'gross ROAS',
      'net ROAS',
      'solopreneur marketing',
      'performance marketing',
    ],
    tags: ['marketing', 'roas', 'roi'],
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-07-04',
    sources: [
      'https://www.meta.com/business/help/430291176997522/',
      'https://support.google.com/google-ads/answer/14090053',
      'https://blog.hubspot.com/marketing/roas',
      'https://www.shopify.com/blog/roas',
    ],
  },
  // P6-2 solopreneur-ltv-by-channel-calculator        -- added in P6-2
  // P6-3 solopreneur-funnel-value-calculator          -- added in P6-3
  // P6-4 solopreneur-cohort-retention-calculator      -- added in P6-4
  // P6-5 solopreneur-email-campaign-roi-calculator    -- added in P6-5
  // P6-6 solopreneur-content-marketing-roi-calculator -- added in P6-6
];
