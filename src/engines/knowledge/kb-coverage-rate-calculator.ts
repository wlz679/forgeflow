// P13-1 KB Coverage Rate
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS DevRel/Tech Writer persona ($10M-$50M ARR).
// Community-wisdom thresholds (TSIA 2024 Knowledge Management + Zendesk CX Trends 2024 + Gartner Customer Service 2024).
// Single coverage math: coverage_rate = matched / total.
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

export const HEALTH_BANDS = {
  excellent: { threshold: 0.85, label: 'Excellent', message: 'Comprehensive KB coverage.' },
  good:      { threshold: 0.60, label: 'Good',      message: 'Healthy match rate.' },
  warning:   { threshold: 0.40, label: 'Warning',   message: 'Significant KB gaps.' },
  critical:  { threshold: -Infinity, label: 'Critical', message: 'KB largely non-existent.' },
};

export function coverageRate(matched: number, total: number): number {
  return total > 0 ? matched / total : 0;
}

export function gapTickets(matched: number, total: number): number {
  return Math.max(0, total - matched);
}

export function calcHealthBand(coverage: number): keyof typeof HEALTH_BANDS {
  if (coverage >= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (coverage >= HEALTH_BANDS.good.threshold) return 'good';
  if (coverage >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtPct(x: number): string { return (x * 100).toFixed(1) + '%'; }
function fmtInt(x: number): string { return Math.round(x).toLocaleString(); }

const engine: ToolEngine = {
  slug: 'solopreneur-kb-coverage-rate-calculator',
  title: 'KB Coverage Rate',
  description:
    'Measure what % of inbound support tickets have a matching KB article. HIGHER health bands — more coverage = better self-service: 🟢 ≥85% · 🟡 60-85% · 🟠 40-60% · 🔴 <40%. For mid-market B2B SaaS ($10M-$50M ARR) DevRel Leads, Documentation Managers, and Technical Writers.',
  inputs: [
    { name: 'monthly_tickets',         label: 'Monthly inbound tickets',                placeholder: 'e.g. 5000', type: 'number' },
    { name: 'tickets_with_kb_match',   label: 'Tickets with KB match',                 placeholder: 'e.g. 3500', type: 'number' },
    { name: 'total_articles',          label: 'Total KB articles',                     placeholder: 'e.g. 500',  type: 'number' },
    { name: 'industry_benchmark',      label: 'Industry',                              placeholder: 'SaaS',      type: 'select', options: ['SaaS', 'FinTech', 'HealthTech', 'eCommerce'] },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `function run(inputs, pick, fill) {
  var total = Number(inputs.monthly_tickets) || 0;
  var matched = Number(inputs.tickets_with_kb_match) || 0;
  var articles = Number(inputs.total_articles) || 0;
  if (matched > total) matched = total;
  var coverage = total > 0 ? matched / total : 0;
  var gap = Math.max(0, total - matched);
  var band = coverage >= 0.85 ? 'Excellent' : coverage >= 0.60 ? 'Good' : coverage >= 0.40 ? 'Warning' : 'Critical';
  var emoji = coverage >= 0.85 ? '🟢' : coverage >= 0.60 ? '🟡' : coverage >= 0.40 ? '🟠' : '🔴';
  var altCoverage = 0.85;
  var altMatched = altCoverage * total;
  var lift = altMatched - matched;
  var atCost24 = lift * 24;
  var needArticles = articles > 0 ? Math.ceil((total * 0.85 - matched) / (total / articles)) : 0;
  return [
    '🩺 KB Coverage Health: ' + emoji + ' ' + band + ' (' + (coverage*100).toFixed(1) + '% coverage · ' + gap.toLocaleString() + ' tickets/mo without KB)',
    '📊 Snapshot: ' + matched.toLocaleString() + ' of ' + total.toLocaleString() + ' tickets matched (' + (coverage*100).toFixed(1) + '%) · ' + articles.toLocaleString() + ' articles in KB',
    '🔄 What-If: if coverage climbs to 85% (Excellent), ~' + Math.round(lift).toLocaleString() + ' more tickets/mo find KB (at ~$24/ticket = ~$' + Math.round(atCost24).toLocaleString() + '/mo saved)',
    '⚖️ Break-Even: to hit ≥85% (Excellent), need ~' + Math.round(lift).toLocaleString() + ' more matched tickets OR ~' + needArticles + ' net new articles',
    '🎯 Milestone: re-audit gap quarterly — product launches add 50-100 new ticket topics',
    '💡 Tip: tickets without KB match = KB candidate list. Run this monthly and feed gaps to writers. Pair with our [Deflection Rate Calculator] (P12-5) to project $ impact.',
  ];
}`,
  },
  generate(inputs) {
    const total = Number(inputs.monthly_tickets) || 0;
    const matched = Math.min(Number(inputs.tickets_with_kb_match) || 0, total);
    const articles = Number(inputs.total_articles) || 0;
    const coverage = coverageRate(matched, total);
    const gap = gapTickets(matched, total);
    const band = calcHealthBand(coverage);
    const bandInfo = HEALTH_BANDS[band];
    const altCoverage = HEALTH_BANDS.excellent.threshold;
    const altMatched = altCoverage * total;
    const lift = Math.max(0, altMatched - matched);
    const atCost24 = lift * 24;
    const needArticles = articles > 0 ? Math.ceil(Math.max(0, total * altCoverage - matched) / Math.max(1, total / articles)) : 0;
    return [
      '🩺 KB Coverage Health: ' + bandInfo.label + ' (' + fmtPct(coverage) + ' coverage · ' + fmtInt(gap) + ' tickets/mo without KB)',
      '📊 Snapshot: ' + fmtInt(matched) + ' of ' + fmtInt(total) + ' tickets matched (' + fmtPct(coverage) + ') · ' + fmtInt(articles) + ' articles in KB',
      '🔄 What-If: if coverage climbs to ' + fmtPct(altCoverage) + ' (Excellent), ~' + fmtInt(lift) + ' more tickets/mo find KB (at ~$24/ticket = ~$' + fmtInt(atCost24) + '/mo saved)',
      '⚖️ Break-Even: to hit ' + fmtPct(HEALTH_BANDS.excellent.threshold) + ' (Excellent), need ~' + fmtInt(lift) + ' more matched tickets OR ~' + needArticles + ' net new articles',
      '🎯 Milestone: re-audit gap quarterly — product launches add 50-100 new ticket topics',
      '💡 Tip: tickets without KB match = KB candidate list. Run this monthly and feed gaps to writers. Pair with our [Deflection Rate Calculator] (P12-5) to project $ impact.',
    ];
  },
  staticExamples: [
    '🩺 KB Coverage Health: Good (70.0% coverage · 1,500 tickets/mo without KB)\n📊 Snapshot: 3,500 of 5,000 tickets matched (70.0%) · 500 articles in KB\n🔄 What-If: if coverage climbs to 85.0% (Excellent), ~750 more tickets/mo find KB (at ~$24/ticket = ~$18,000/mo saved)\n⚖️ Break-Even: to hit 85.0% (Excellent), need ~750 more matched tickets OR ~75 net new articles\n🎯 Milestone: re-audit gap quarterly — product launches add 50-100 new ticket topics\n💡 Tip: tickets without KB match = KB candidate list. Run this monthly and feed gaps to writers. Pair with our [Deflection Rate Calculator] (P12-5) to project $ impact.',
  ],
  faq: [
    { q: 'What is KB coverage rate?', a: 'Coverage rate = (tickets with a matching KB article) / (total inbound tickets). It measures the breadth of your KB content vs. the real questions customers ask. TSIA 2024 reports mid-market B2B SaaS at 50-75% coverage; >85% indicates a mature KB.' },
    { q: 'How do I measure "ticket has a KB match"?', a: 'Most helpdesks (Zendesk, Intercom, Freshdesk) tag deflected tickets or log KB-article clicks before ticket creation. If untracked, you can manually sample 100 tickets monthly and check whether a matching article exists.' },
    { q: 'Does article quality matter?', a: 'No — coverage only counts article existence, not quality. Quality is measured separately by K-6 Article Helpfulness. A low-coverage KB can still have high-quality articles, but the volume of deflected tickets will be capped by the article count.' },
    { q: 'How does this pair with P12-5 Deflection?', a: 'P12-5 measures % of tickets deflected via KB/chatbot (downstream outcome). K-1 Coverage measures the upstream input (how many tickets HAVE a matching article). Low coverage caps deflection potential — fix K-1 to enable P12-5 to scale.' },
    { q: 'What is the industry_benchmark select for?', a: 'It is informational only (tooltip reference). Different verticals have different coverage expectations — FinTech and HealthTech typically run 60-70% (regulated/complex products) while SaaS runs 65-80%. The band thresholds are stable across all verticals.' },
    { q: 'Why does K-1 use 4 inputs when other calcs use 5?', a: 'K-1 is the simplest KB upstream metric — coverage is a single ratio. industry_benchmark is informational only (does not change math), total_articles supports Break-Even calc. K-2 through K-6 add complexity (freshness, search, quality).' },
  ],
  howToUse: [
    'Enter monthly inbound tickets — pull from your helpdesk platform (Zendesk, Intercom, Freshdesk).',
    'Enter tickets with a matching KB article (deflected + ticket-with-suggestion) — most platforms tag this automatically.',
    'Enter total KB articles — admin count from your KB platform.',
    'Read the coverage rate band — 🟢 Excellent ≥85% · 🟡 Good 60-85% · 🟠 Warning 40-60% · 🔴 Critical <40%.',
    'Use the Snapshot line to identify gap_tickets (= articles needed) and feed to writers as a monthly backlog.',
  ],
  sources: [
    'https://www.tsia.com/blog/knowledge-management-benchmark',
    'https://www.zendesk.com/customer-experience-trends/',
    'https://www.gartner.com/en/customer-service-support',
    'https://www.nngroup.com/articles/help-and-documentation/',
  ],
};
registerEngine(engine);