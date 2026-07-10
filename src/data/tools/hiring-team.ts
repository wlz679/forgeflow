// Hiring & Team ToolMeta entries (P11 batch, 6 calcs).
// Per-task adds one entry. See src/data/tools/index.ts for barrel.
import type { ToolMeta } from './types';
export const tools: ToolMeta[] = [
  {
    slug: 'solopreneur-fully-loaded-employee-cost-calculator',
    title: 'Fully-Loaded Employee Cost',
    description:
      'Compute total annual employee cost (base + benefits + payroll tax + overhead). INVERSE health bands — lower multiplier is better: 🟢 ≤1.25x · 🟡 1.25-1.40x · 🟠 1.40-1.60x · 🔴 >1.60x. For mid-market B2B SaaS ($10M-$50M ARR) People-ops managers and Head-of-HR.',
    categoryId: 'H',
    applicationCategory: 'BusinessApplication',
    inputs: [
      { name: 'base_salary',     label: 'Annual base salary',                       placeholder: 'e.g. 120000', type: 'number' },
      { name: 'benefits_pct',    label: 'Benefits % of base (health + 401k + PTO)', placeholder: 'e.g. 25',     type: 'number' },
      { name: 'payroll_tax_pct', label: 'Payroll tax % of base (FICA + FUTA + SUTA)',placeholder: 'e.g. 8',      type: 'number' },
      { name: 'overhead_pct',    label: 'Overhead % of base (equipment + SW + mgmt)', placeholder: 'e.g. 15',     type: 'number' },
    ],
    keywords: [
      'fully loaded employee cost',
      'employee cost calculator',
      'fully loaded cost',
      'total compensation cost',
      'benefits percentage',
      'overhead per employee',
      'BLS ECEC',
      'SHRM benefits survey',
      'mid-market SaaS',
    ],
    tags: ['hiring-team', 'people-ops', 'cost'],
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-07-10',
    sources: [
      'https://www.bls.gov/news.release/ecec.toc.htm',
      'https://www.shrm.org/topics-tools/news/talent-acquisition/2024-benefits-survey',
      'https://www.pave.com/compensation-benchmarks',
    ],
  },
];