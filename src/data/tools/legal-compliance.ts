// Legal & Compliance ToolMeta entries (P14 batch, 6 calcs).
// Per-task adds one entry. See src/data/tools/index.ts for barrel.
import type { ToolMeta } from './types';
export const tools: ToolMeta[] = [
  {
    slug: 'solopreneur-gdpr-fine-calculator',
    title: 'GDPR Fine Risk',
    description:
      'Quantify annualized GDPR fine exposure given violation rate and industry-risk profile. HIGHER health bands — more exposure = worse: 🟢 <0.25% · 🟡 0.25-1% · 🟠 1-2% · 🔴 ≥2%. For mid-market B2B SaaS (€10M-€50M ARR) DPOs, Privacy Officers, and Heads of Privacy.',
    categoryId: 'L',
    applicationCategory: 'BusinessApplication',
    inputs: [
      { name: 'annual_revenue_global',    label: 'Annual global revenue (€)',                placeholder: 'e.g. 25000000', type: 'number' },
      { name: 'max_fine_pct',             label: 'GDPR fine tier',                            placeholder: '4% (Art. 83(5))', type: 'select', options: ['4%', '2%', '1%', '0.5%'] },
      { name: 'violations_per_year',      label: 'Reportable violations per year',            placeholder: 'e.g. 2',       type: 'number' },
      { name: 'industry_risk_multiplier', label: 'Industry risk profile',                     placeholder: 'SaaS (0.8×)',  type: 'select', options: ['SaaS (0.8×)', 'FinTech (1.0×)', 'HealthTech (1.4×)', 'AdTech (1.6×)'] },
    ],
    keywords: [
      'gdpr fine',
      'gdpr penalty',
      'gdpr fine risk',
      'gdpr art 83',
      'ico fine',
      'data protection fine',
      'privacy fine calculator',
      'dpo fine exposure',
      'mid-market saas gdpr',
    ],
    tags: ['legal', 'compliance', 'gdpr', 'privacy'],
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-07-13',
    sources: [
      'https://gdpr-info.eu/art-83-gdpr/',
      'https://ico.org.uk/for-organisations/guide-to-data-protection/',
      'https://iapp.org/resources/article/privacy-enforcement-atlas/',
    ],
  },
  {
    slug: 'solopreneur-dsar-cost-calculator',
    title: 'DSAR Processing Cost',
    description:
      'Quantify annualized cost of processing Data Subject Access Requests (DSAR) given volume, manual hours, DPO rate, and automation %. HIGHER health bands — more cost = worse operational exposure: 🟢 <€25K/yr · 🟡 €25-100K · 🟠 €100-300K · 🔴 ≥€300K. For mid-market B2B SaaS (€10M-€50M ARR) DPOs, Privacy Officers, and Heads of Privacy.',
    categoryId: 'L',
    applicationCategory: 'BusinessApplication',
    inputs: [
      { name: 'dsars_per_month',  label: 'DSARs per month',        placeholder: 'e.g. 50',  type: 'number' },
      { name: 'hours_per_dsar',   label: 'Manual hours per DSAR',  placeholder: 'e.g. 2.5', type: 'number' },
      { name: 'hourly_rate_dpo',  label: 'DPO hourly rate (€/hr)', placeholder: 'e.g. 95',  type: 'number' },
      { name: 'automation_pct',   label: 'Automation (%)',         placeholder: 'e.g. 30',  type: 'number' },
    ],
    keywords: [
      'dsar cost',
      'dsar processing',
      'data subject access request',
      'gdpr art 15',
      'dsar calculator',
      'privacy request cost',
      'dpo workload',
      'dsar automation',
      'mid-market saas privacy',
    ],
    tags: ['legal', 'compliance', 'gdpr', 'dsar'],
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-07-13',
    sources: [
      'https://gdpr-info.eu/art-15-gdpr/',
      'https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/individual-rights/right-of-access/',
      'https://iapp.org/news/a/2024-privacy-operations-survey/',
    ],
  },
];