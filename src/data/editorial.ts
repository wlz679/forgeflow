// P140c-T1 (revised after user-provided identity): Editorial team data —
// single source of truth for E-E-A-T reviewer identity + category routing.
// Replaces P140b-T6 placeholder reviewer data at
// src/pages/[lang]/[slug].astro:1352-1366.
//
// Reviewer identity (user-provided, 2026-08-18):
//   Name: 王立柱 (Wang Lizhu)
//   Role: Founder & Editor in Chief
//   Bio: ForgeFlowKit 创始人,为独立开发者与 SaaS 创业者打造免费商业计算器。
//   Credentials: 10 年经验前端工程师 (10-year veteran front-end engineer)
//
// Note on persona model (per user decision, P140c Q1 reply):
//   Option A chosen — single real identity, transparent disclosure. NOT
//   fictional multi-persona model. All 15 categories route to the single
//   'reviewer-founder' entry; the founder personally reviews every
//   calculator with the assistance of cited sources (regulatory, standards
//   body, industry research, academic).

export interface ReviewerPersona {
  id: string;
  name: string;
  role: string;
  expertise: string[];
  bio: { en: string; zh: string };
  credentials: string[];
}

export const EDITORIAL = {
  author: 'ForgeFlowKit Editorial Team',
  bio: {
    en: "ForgeFlowKit's editorial team maintains the methodology, accuracy, and review cadence of every calculator on the site. Each prose file below the calculator form is reviewed by our founder Wang Lizhu, a 10-year veteran front-end engineer, against cited sources (regulatory docs, standards bodies, industry research, and academic literature where applicable).",
    zh: 'ForgeFlowKit 编辑团队维护本站每个计算器的方法论、准确性和审查节奏。计算器下方的每一篇编辑内容都由创始人王立柱(10 年经验前端工程师)亲自审核,对照引用的来源(监管机构文档、标准组织、行业研究,以及适用时的学术文献)。',
  },
  methodology: {
    en: 'Every calculator is reviewed against (1) primary source documentation (regulatory, standards body, vendor docs), (2) industry benchmarks (Gartner, Forrester, McKinsey, ENISA), and (3) at least one academic or peer-reviewed source when applicable. Methodology decisions are documented per calculator on its editorial prose page.',
    zh: '每个计算器都按以下来源审查:(1) 一手资料文档(监管机构、标准组织、厂商文档);(2) 行业基准(Gartner、Forrester、McKinsey、ENISA);(3) 至少一个学术或同行评议来源(适用时)。方法论决策记录在每个计算器的编辑内容页中。',
  },
  reviewCadence: 'Quarterly',
};

export const REVIEWERS: ReviewerPersona[] = [
  {
    id: 'reviewer-founder',
    name: '王立柱 (Wang Lizhu)',
    role: 'Founder & Editor in Chief',
    expertise: [
      'SaaS Metrics',
      'AI Cost Tools',
      'Valuation & Exit',
      'Freelance Pricing',
      'Cost & Efficiency',
      'Investment & Real Estate',
      'Hiring & Team',
      'Knowledge',
      'Legal & Compliance',
      'Marketing Analytics',
      'Operations',
      'Product Analytics',
      'Retention & CS',
      'Sales',
      'Customer Support',
    ],
    bio: {
      en: 'Wang Lizhu is the founder of ForgeFlowKit, building free business calculators for solopreneurs and SaaS founders.',
      zh: '王立柱是 ForgeFlowKit 的创始人,为独立开发者与 SaaS 创业者打造免费商业计算器。',
    },
    credentials: [
      '10-year veteran front-end engineer',
      'ForgeFlowKit founder (2022–present)',
    ],
  },
];

// All 15 categories route to the single founder persona. The map is
// retained (rather than collapsed to a constant) so future P-series can
// add category-specific co-reviewers without changing the call-site
// signature at [slug].astro.
const REVIEWER_BY_CATEGORY: Record<string, string> = {
  A: 'reviewer-founder', B: 'reviewer-founder', C: 'reviewer-founder',
  D: 'reviewer-founder', E: 'reviewer-founder', F: 'reviewer-founder',
  H: 'reviewer-founder', K: 'reviewer-founder', L: 'reviewer-founder',
  M: 'reviewer-founder', O: 'reviewer-founder', P: 'reviewer-founder',
  R: 'reviewer-founder', S: 'reviewer-founder', T: 'reviewer-founder',
};

export function reviewerForCategory(categoryId: string): ReviewerPersona {
  const id = REVIEWER_BY_CATEGORY[categoryId] ?? 'reviewer-founder';
  return REVIEWERS.find(r => r.id === id) ?? REVIEWERS[0]!;
}