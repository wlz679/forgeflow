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
  {
    slug: 'solopreneur-ltv-by-channel-calculator',
    title: 'LTV by Channel Calculator',
    description:
      'Compare up to 5 marketing channels by LTV:CAC ratio. See ranked table with health bands, blended CAC, reallocation suggestions, and break-even targets. Industry benchmarks: 🟢 ≥3.0x · 🟡 1.0–3.0x · 🟠 0.5–1.0x · 🔴 <0.5x.',
    categoryId: 'M',
    applicationCategory: 'BusinessApplication',
    inputs: [
      { name: 'ch1_spend', label: 'Ch1: Ad Spend ($)', placeholder: 'e.g. 1000', type: 'number' },
      { name: 'ch1_conv', label: 'Ch1: Conversions', placeholder: 'e.g. 50', type: 'number' },
      { name: 'ch1_ltv', label: 'Ch1: LTV per User ($)', placeholder: 'e.g. 500', type: 'number' },
      { name: 'ch2_spend', label: 'Ch2: Ad Spend ($)', placeholder: 'e.g. 1500', type: 'number' },
      { name: 'ch2_conv', label: 'Ch2: Conversions', placeholder: 'e.g. 30', type: 'number' },
      { name: 'ch2_ltv', label: 'Ch2: LTV per User ($)', placeholder: 'e.g. 800', type: 'number' },
      { name: 'ch3_spend', label: 'Ch3: Ad Spend ($)', placeholder: 'e.g. 800', type: 'number' },
      { name: 'ch3_conv', label: 'Ch3: Conversions', placeholder: 'e.g. 20', type: 'number' },
      { name: 'ch3_ltv', label: 'Ch3: LTV per User ($)', placeholder: 'e.g. 600', type: 'number' },
      { name: 'ch4_spend', label: 'Ch4: Ad Spend ($)', placeholder: 'e.g. 1200', type: 'number' },
      { name: 'ch4_conv', label: 'Ch4: Conversions', placeholder: 'e.g. 40', type: 'number' },
      { name: 'ch4_ltv', label: 'Ch4: LTV per User ($)', placeholder: 'e.g. 400', type: 'number' },
      { name: 'ch5_spend', label: 'Ch5: Ad Spend ($)', placeholder: 'e.g. 600', type: 'number' },
      { name: 'ch5_conv', label: 'Ch5: Conversions', placeholder: 'e.g. 15', type: 'number' },
      { name: 'ch5_ltv', label: 'Ch5: LTV per User ($)', placeholder: 'e.g. 700', type: 'number' },
    ],
    keywords: [
      'LTV by channel',
      'LTV CAC by channel',
      'channel ROI comparison',
      'marketing channel comparison',
      'channel efficiency',
      'LTV calculator multi-channel',
      'CAC by channel',
      'channel budget allocation',
      'marketing mix',
      'channel performance',
    ],
    tags: ['marketing', 'ltv', 'cac', 'channels'],
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-07-05',
    sources: [
      'https://www.profitwell.com/blog/cac-by-channel',
      'https://www.hubspot.com/marketing/cac',
      'https://blog.hubspot.com/marketing/customer-acquisition-cost',
      'https://www.saastr.com/customer-acquisition-cost/',
    ],
  },
  // P6-3 solopreneur-funnel-value-calculator          -- added in P6-3
  // P6-4 solopreneur-cohort-retention-calculator      -- added in P6-4
  // P6-5 solopreneur-email-campaign-roi-calculator    -- added in P6-5
  // P6-6 solopreneur-content-marketing-roi-calculator -- added in P6-6
];
