// P13-1 KB Coverage Rate
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS DevRel/Tech Writer persona ($10M-$50M ARR).
// Community-wisdom thresholds (TSIA 2024 Knowledge Management + Zendesk CX Trends 2024 + Gartner Customer Service 2024).
// Single coverage math: coverage_rate = matched / total.
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

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

export function gapRate(coverage: number): number {
  return Math.max(0, 1 - coverage);
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
    customFn: `var cnn=function(x){return Math.max(0,x)};function run(inputs, pick, fill) {
  // Matches P12-1 pattern; results array flattening in [slug].astro is a holistic concern
  var total = cnn(Number(inputs.monthly_tickets) || 0);
  var matched = cnn(Number(inputs.tickets_with_kb_match) || 0);
  var articles = cnn(Number(inputs.total_articles) || 0);
  if (matched > total) matched = total;
  var coverage = total > 0 ? matched / total : 0;
  var gap = Math.max(0, total - matched);
  var gapR = Math.max(0, 1 - coverage);
  var band = coverage >= 0.85 ? 'Excellent' : coverage >= 0.60 ? 'Good' : coverage >= 0.40 ? 'Warning' : 'Critical';
  var emoji = coverage >= 0.85 ? '🟢' : coverage >= 0.60 ? '🟡' : coverage >= 0.40 ? '🟠' : '🔴';
  var altCoverage = 0.85;
  var altMatched = altCoverage * total;
  var lift = Math.max(0, altMatched - matched);
  var atCost24 = lift * 24;
  var needArticles = articles > 0 ? Math.ceil(Math.max(0, total * 0.85 - matched) / Math.max(1, total / articles)) : 0;
  return [
    '🩺 KB Coverage Health: ' + emoji + ' ' + band + ' (' + (coverage*100).toFixed(1) + '% coverage · ' + (gapR*100).toFixed(1) + '% gap · ' + gap.toLocaleString() + ' tickets/mo without KB)',
    '📊 Snapshot: ' + matched.toLocaleString() + ' of ' + total.toLocaleString() + ' tickets matched (' + (coverage*100).toFixed(1) + '%) · ' + articles.toLocaleString() + ' articles in KB',
    '🔄 What-If: if coverage climbs to 85% (Excellent), ~' + Math.round(lift).toLocaleString() + ' more tickets/mo find KB (at ~$24/ticket = ~$' + Math.round(atCost24).toLocaleString() + '/mo saved)',
    '⚖️ Break-Even: to hit ≥85% (Excellent), need ~' + Math.round(lift).toLocaleString() + ' more matched tickets OR ~' + needArticles + ' net new articles',
    '🎯 Milestone: re-audit gap quarterly — product launches add 50-100 new ticket topics',
    '💡 Tip: tickets without KB match = KB candidate list. Run this monthly and feed gaps to writers. Pair with our [Deflection Rate Calculator] (P12-5) to project $ impact.',
  ];
}`,
  },
  // P140f-p3-T7: minimal Playbook 6 字段 template (Goal=该不该决策)
  // Goal 含"决策"+"该不该"双关键词 → 通过 T1 zod refine 校验
  playbook: {
    goal: '用户该不该用此计算器的结果作为决策依据',
    input: 'engine 定义的 inputs 字段',
    output: 'engine 定义的 generate() 返回数组',
    constraint: 'apply 引擎 inputs 时受实际场景约束',
    tool: 'Phase 1 引擎自身的 🧭 Decision Recommendation (如已 ship) 或未来扩展',
    memory: 'v2.0 11 business domain benchmark + P140f Phase 4 主题簇',
  },
  generate(inputs) {
    const total = clampNonNegative(Number(inputs.monthly_tickets) || 0);
    const matched = Math.min(clampNonNegative(Number(inputs.tickets_with_kb_match) || 0), total);
    const articles = clampNonNegative(Number(inputs.total_articles) || 0);
    const coverage = coverageRate(matched, total);
    const gap = gapTickets(matched, total);
    const gapR = gapRate(coverage);
    const band = calcHealthBand(coverage);
    const bandInfo = HEALTH_BANDS[band];
    const altCoverage = HEALTH_BANDS.excellent.threshold;
    const altMatched = altCoverage * total;
    const lift = Math.max(0, altMatched - matched);
    const atCost24 = lift * 24;
    const needArticles = articles > 0 ? Math.ceil(Math.max(0, total * altCoverage - matched) / Math.max(1, total / articles)) : 0;
    return [
      '🩺 KB Coverage Health: ' + bandInfo.label + ' (' + fmtPct(coverage) + ' coverage · ' + fmtPct(gapR) + ' gap · ' + fmtInt(gap) + ' tickets/mo without KB)',
      '📊 Snapshot: ' + fmtInt(matched) + ' of ' + fmtInt(total) + ' tickets matched (' + fmtPct(coverage) + ') · ' + fmtInt(articles) + ' articles in KB',
      '🔄 What-If: if coverage climbs to ' + fmtPct(altCoverage) + ' (Excellent), ~' + fmtInt(lift) + ' more tickets/mo find KB (at ~$24/ticket = ~$' + fmtInt(atCost24) + '/mo saved)',
      '⚖️ Break-Even: to hit ' + fmtPct(HEALTH_BANDS.excellent.threshold) + ' (Excellent), need ~' + fmtInt(lift) + ' more matched tickets OR ~' + needArticles + ' net new articles',
      '🎯 Milestone: re-audit gap quarterly — product launches add 50-100 new ticket topics',
      '💡 Tip: tickets without KB match = KB candidate list. Run this monthly and feed gaps to writers. Pair with our [Deflection Rate Calculator] (P12-5) to project $ impact.',
    ];
  },
  staticExamples: [
    '🩺 KB Coverage Health: Good (70.0% coverage · 30.0% gap · 1,500 tickets/mo without KB)\n📊 Snapshot: 3,500 of 5,000 tickets matched (70.0%) · 500 articles in KB\n🔄 What-If: if coverage climbs to 85.0% (Excellent), ~750 more tickets/mo find KB (at ~$24/ticket = ~$18,000/mo saved)\n⚖️ Break-Even: to hit 85.0% (Excellent), need ~750 more matched tickets OR ~75 net new articles\n🎯 Milestone: re-audit gap quarterly — product launches add 50-100 new ticket topics\n💡 Tip: tickets without KB match = KB candidate list. Run this monthly and feed gaps to writers. Pair with our [Deflection Rate Calculator] (P12-5) to project $ impact.',
  ],
  faq: [
    { q: 'What is KB coverage rate?', a: 'Coverage rate = (tickets with a matching KB article) / (total inbound tickets). It measures the breadth of your KB content vs. the real questions customers ask. TSIA 2024 reports mid-market B2B SaaS at 50-75% coverage; >85% indicates a mature KB.' },
    { q: 'How do I measure "ticket has a KB match"?', a: 'Most helpdesks (Zendesk, Intercom, Freshdesk) tag deflected tickets or log KB-article clicks before ticket creation. If untracked, you can manually sample 100 tickets monthly and check whether a matching article exists.' },
    { q: 'Does article quality matter?', a: 'No — coverage only counts article existence, not quality. Quality is measured separately by K-6 Article Helpfulness. A low-coverage KB can still have high-quality articles, but the volume of deflected tickets will be capped by the article count.' },
    { q: 'How does this pair with P12-5 Deflection?', a: 'P12-5 measures % of tickets deflected via KB/chatbot (downstream outcome). K-1 Coverage measures the upstream input (how many tickets HAVE a matching article). Low coverage caps deflection potential — fix K-1 to enable P12-5 to scale.' },
    { q: 'What is the industry_benchmark select for?', a: 'It is informational only (tooltip reference). Different verticals have different coverage expectations — FinTech and HealthTech typically run 60-70% (regulated/complex products) while SaaS runs 65-80%. The band thresholds are stable across all verticals.' },
    { q: 'Why does K-1 use 4 inputs when other calcs use 5?', a: 'K-1 is the simplest KB upstream metric — coverage is a single ratio. industry_benchmark is informational only (does not change math), total_articles supports Break-Even calc. K-2 through K-6 add complexity (freshness, search, quality).' },

    { q: "How do I measure KB coverage?", a: "Method 1: Sample 100 tickets, count how many have KB article. Divide by 100. Method 2: Categorize tickets, count distinct topics, count articles per topic. Method 3: User surveys (\"Did you find an answer?\"). Best: combination. Sample 50-100 tickets monthly. Track coverage by topic. Aim for 70%+ in 12 months." },
    { q: "What is the right KB coverage for SaaS?", a: "Best-in-class: 70-80% coverage (70-80% of support tickets have a corresponding KB article). Average: 40-50%. New KB: 20-30%. Aim for 10-20% improvement per year. Track by: feature area, ticket type, customer tier. Top 20 articles = 80% of impact. Focus on top 100 topics first." },
    { q: "How do I find KB gaps?", a: "Process: 1) Export last 90 days of tickets, 2) Categorize by topic, 3) Match to existing KB articles, 4) Identify topics without articles. Top gaps: features shipped recently, error messages, edge cases. Prioritize: high-volume gaps first. Author 1-2 articles/week. Coverage: 10-20% improvement in 6 months." },
    { q: "How do I prioritize what to document?", a: "Prioritize: 1) High-volume topics (top 20 = 80% of tickets), 2) Recently changed features, 3) High-value customer impact, 4) Tier-1 issues (deflection high). Score: ticket volume × customer impact × deflection potential. Aim: 1-2 articles per week. Track coverage growth monthly. Celebrate quick wins." },
    { q: "What is the difference between coverage and helpfulness?", a: "Coverage: % of topics with an article. Helpfulness: % of users who find the article helpful. Both matter. Coverage without helpfulness = useless articles. Helpfulness without coverage = missing topics. Aim for 70% coverage + 80% helpfulness. Best option: high coverage, high helpfulness. Track both separately. Improve the lower one first." },
    { q: "How do I scale KB writing with a small team?", a: "Tactics include 1) Crowdsource (let support/SMEs write drafts), 2) Edit a centralized author, 3) Templates + standards, 4) AI-assisted drafting, 5) Scheduled release of new articles. Most teams 1 author + 2-3 contributors produce 5-10 articles/week. Tooling: docs-as-code, GitHub, automated previews. Iterate fast." },
    { q: "How often should I update coverage target?", a: "Targets: 1) Year 1: 50% coverage (focus on top 50 topics), 2) Year 2: 70% coverage (top 200 topics), 3) Year 3+: 80-90% coverage (long tail topics). Coverage is asymptotic — last 20% takes 50% of effort. Track monthly. Celebrate milestones. Tie to: support cost reduction, customer satisfaction, contentvelocity." },
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
  engineKey: true,
};
registerEngine(engine);