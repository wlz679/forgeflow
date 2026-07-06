// Operations / Inventory ToolMeta entries (P7 batch, 6 calcs).
// Per-task adds one entry. See src/data/tools/index.ts for barrel.
import type { ToolMeta } from './types';
export const tools: ToolMeta[] = [
  {
    slug: 'solopreneur-inventory-turnover-calculator',
    title: 'Inventory Turnover Calculator',
    description:
      'Measure how many times your inventory cycles per year and how many days to sell. The fundamental inventory health metric for Shopify, Amazon FBA, and DTC brands.',
    categoryId: 'O',
    applicationCategory: 'BusinessApplication',
    inputs: [
      { name: 'annualCOGS', label: 'Annual COGS', type: 'number', placeholder: 'e.g. 240000' },
      { name: 'avgInventory', label: 'Average Inventory Value', type: 'number', placeholder: 'e.g. 40000' },
      { name: 'periodDays', label: 'Period (days)', type: 'number', placeholder: 'e.g. 365' },
      { name: 'industry', label: 'Industry benchmark', placeholder: '', type: 'select', options: ['general', 'apparel', 'electronics', 'grocery', 'furniture'] },
    ],
    keywords: [
      'inventory turnover calculator',
      'days to sell',
      'COGS ratio',
      'inventory health',
      'stock turn',
      'inventory cycle',
      'Shopify inventory',
      'Amazon FBA metrics',
      'DTC inventory',
      'working capital',
    ],
    tags: ['operations', 'inventory', 'turnover', 'cogs'],
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-07-06',
    sources: [
      'https://www.investopedia.com/terms/i/inventory-turnover.asp',
      'https://www.shopify.com/blog/inventory-turnover-ratio',
      'https://corporatefinanceinstitute.com/resources/accounting/inventory-turnover/',
    ],
  },
  {
    slug: 'solopreneur-carrying-cost-calculator',
    title: 'Carrying Cost Calculator',
    description:
      'Total annual cost of holding inventory — storage + insurance + shrinkage + opportunity cost + other. Industry rule of thumb: 20–30% of inventory value per year.',
    categoryId: 'O',
    applicationCategory: 'BusinessApplication',
    inputs: [
      { name: 'avgInventoryValue', label: 'Average Inventory Value', type: 'number', placeholder: 'e.g. 50000' },
      { name: 'storageRate', label: 'Storage Cost (% of inventory)', type: 'number', placeholder: 'e.g. 8' },
      { name: 'insuranceRate', label: 'Insurance Cost (%)', type: 'number', placeholder: 'e.g. 1.5' },
      { name: 'shrinkageRate', label: 'Shrinkage / Damage (%)', type: 'number', placeholder: 'e.g. 2' },
      { name: 'oppCostRate', label: 'Opportunity Cost (%)', type: 'number', placeholder: 'e.g. 8' },
      { name: 'otherCostsPct', label: 'Other Carrying Costs (%)', type: 'number', placeholder: 'e.g. 2' },
    ],
    keywords: [
      'carrying cost calculator',
      'inventory holding cost',
      'storage cost',
      'shrinkage rate',
      'opportunity cost inventory',
      'inventory carrying cost',
      'total inventory cost',
      'B2B inventory metrics',
      'warehouse cost',
      'inventory financing',
    ],
    tags: ['operations', 'inventory', 'carrying-cost', 'storage'],
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-07-06',
    sources: [
      'https://www.investopedia.com/terms/c/carrying-cost.asp',
      'https://www.shopify.com/blog/carrying-cost',
      'https://www.shipbob.com/blog/carrying-cost/',
    ],
  },
];