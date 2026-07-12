// P13-3 Search Effectiveness
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS DevRel/Tech Writer persona ($10M-$50M ARR).
// Community-wisdom thresholds (NN/g Help & Documentation + Algolia Search UX 2024 + Zendesk Search Analytics).
// COMPOSITE dual-threshold band: CTR (higher better) AND no-result rate (lower better).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

export const HEALTH_BANDS = {
  excellent: { ctr: 0.85, noResult: 0.05, label: 'Excellent', message: 'Search is working - users find answers quickly.' },
  good:      { ctr: 0.70, noResult: 0.10, label: 'Good',      message: 'Search mostly works - room for query tuning.' },
  warning:   { ctr: 0.55, noResult: 0.20, label: 'Warning',   message: 'Search struggles - missing content or bad synonyms.' },
  critical:  { ctr: -Infinity, noResult: Infinity, label: 'Critical', message: 'Search is failing users.' },
};

export function ctr(withClick: number, total: number): number {
  return total > 0 ? withClick / total : 0;
}

export function noResultRate(noResult: number, total: number): number {
  return total > 0 ? noResult / total : 0;
}

export function abandonedSearches(total: number, withClick: number, noResult: number): number {
  return Math.max(0, total - withClick - noResult);
}

export function calcHealthBand(ctrVal: number, noResult: number): keyof typeof HEALTH_BANDS {
  if (ctrVal >= HEALTH_BANDS.excellent.ctr && noResult <= HEALTH_BANDS.excellent.noResult) return 'excellent';
  if (ctrVal >= HEALTH_BANDS.good.ctr && noResult <= HEALTH_BANDS.good.noResult) return 'good';
  if (ctrVal >= HEALTH_BANDS.warning.ctr && noResult <= HEALTH_BANDS.warning.noResult) return 'warning';
  return 'critical';
}

function fmtPct(x: number): string { return (x * 100).toFixed(1) + '%'; }
function fmtInt(x: number): string { return Math.round(x).toLocaleString(); }

const engine: ToolEngine = {
  slug: 'solopreneur-search-effectiveness-calculator',
  title: 'Search Effectiveness',
  description:
    'Measure KB in-app search effectiveness via CTR + no-result rate. HIGHER health bands - lower no-result + higher CTR = better self-service: 🟢 CTR >=85% & no-result <=5% · 🟡 CTR 70-85% & no-result <=10% · 🟠 CTR 55-70% & no-result <=20% · 🔴 either fails. For mid-market B2B SaaS ($10M-$50M ARR) DevRel Leads, Documentation Managers, and Technical Writers.',
  inputs: [
    { name: 'total_searches',        label: 'Monthly in-app searches',   placeholder: 'e.g. 12000', type: 'number' },
    { name: 'searches_with_click',   label: 'Searches with click',       placeholder: 'e.g. 9000',  type: 'number' },
    { name: 'searches_no_result',    label: 'Searches with no result',   placeholder: 'e.g. 960',   type: 'number' },
    { name: 'industry_benchmark',    label: 'Industry',                  placeholder: 'B2B SaaS',  type: 'select', options: ['B2B SaaS', 'Consumer'] },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `function run(inputs, pick, fill) {
  var total = Number(inputs.total_searches) || 0;
  var withClick = Number(inputs.searches_with_click) || 0;
  var noRes = Number(inputs.searches_no_result) || 0;
  if (withClick > total) withClick = total;
  if (noRes > total) noRes = total;
  var ctrV = total > 0 ? withClick / total : 0;
  var noResR = total > 0 ? noRes / total : 0;
  var abandoned = Math.max(0, total - withClick - noRes);
  var band = (ctrV >= 0.85 && noResR <= 0.05) ? 'Excellent' : (ctrV >= 0.70 && noResR <= 0.10) ? 'Good' : (ctrV >= 0.55 && noResR <= 0.20) ? 'Warning' : 'Critical';
  var emoji = (ctrV >= 0.85 && noResR <= 0.05) ? '🟢' : (ctrV >= 0.70 && noResR <= 0.10) ? '🟡' : (ctrV >= 0.55 && noResR <= 0.20) ? '🟠' : '🔴';
  var altCtr = 0.85;
  var lift = Math.max(0, altCtr * total - withClick);
  var fewerTickets = lift * 0.5;
  var noResLift = Math.max(0, noRes - 0.05 * total);
  return [
    '🩺 Search Effectiveness Health: ' + emoji + ' ' + band + ' (CTR ' + (ctrV*100).toFixed(1) + '% / no-result ' + (noResR*100).toFixed(1) + '%)',
    '📊 Snapshot: ' + total.toLocaleString() + ' searches/mo · ' + withClick.toLocaleString() + ' with click (' + (ctrV*100).toFixed(1) + '% CTR) · ' + noRes.toLocaleString() + ' no-result (' + (noResR*100).toFixed(1) + '%) · ' + abandoned.toLocaleString() + ' abandoned/dwell',
    '🔄 What-If: if CTR climbs to 85% (Excellent), ' + Math.round(lift).toLocaleString() + ' more searches find answers → at ~50% click-to-ticket-prevention rate, ~' + Math.round(fewerTickets).toLocaleString() + ' fewer tickets/mo',
    '⚖️ Break-Even: to hit Excellent (CTR ≥85% AND no-result ≤5%), need ' + Math.round(lift).toLocaleString() + ' more clicks OR ' + Math.round(noResLift).toLocaleString() + ' fewer no-result searches',
    '🎯 Milestone: search "pogo-sticking" (search → click → back to search) is the #1 KB UX failure — track per query weekly',
    '💡 Tip: no-result >15% means content gaps OR bad search synonyms — run [KB Coverage Rate] (K-1) on top no-result queries.',
  ];
}`,
  },
  generate(inputs) {
    const total = Number(inputs.total_searches) || 0;
    const withClick = Math.min(Number(inputs.searches_with_click) || 0, total);
    const noRes = Math.min(Number(inputs.searches_no_result) || 0, total);
    const ctrVal = ctr(withClick, total);
    const noResR = noResultRate(noRes, total);
    const abandoned = abandonedSearches(total, withClick, noRes);
    const band = calcHealthBand(ctrVal, noResR);
    const bandInfo = HEALTH_BANDS[band];
    const altCtr = HEALTH_BANDS.excellent.ctr;
    const lift = Math.max(0, altCtr * total - withClick);
    const fewerTickets = lift * 0.5;
    const noResLift = Math.max(0, noRes - HEALTH_BANDS.excellent.noResult * total);
    return [
      '🩺 Search Effectiveness Health: ' + bandInfo.label + ' (CTR ' + fmtPct(ctrVal) + ' / no-result ' + fmtPct(noResR) + ')',
      '📊 Snapshot: ' + fmtInt(total) + ' searches/mo · ' + fmtInt(withClick) + ' with click (' + fmtPct(ctrVal) + ' CTR) · ' + fmtInt(noRes) + ' no-result (' + fmtPct(noResR) + ') · ' + fmtInt(abandoned) + ' abandoned/dwell',
      '🔄 What-If: if CTR climbs to ' + fmtPct(altCtr) + ' (Excellent), ' + fmtInt(lift) + ' more searches find answers → at ~50% click-to-ticket-prevention rate, ~' + fmtInt(fewerTickets) + ' fewer tickets/mo',
      '⚖️ Break-Even: to hit Excellent (CTR ≥' + fmtPct(HEALTH_BANDS.excellent.ctr) + ' AND no-result ≤' + fmtPct(HEALTH_BANDS.excellent.noResult) + '), need ' + fmtInt(lift) + ' more clicks OR ' + fmtInt(noResLift) + ' fewer no-result searches',
      '🎯 Milestone: search "pogo-sticking" (search → click → back to search) is the #1 KB UX failure — track per query weekly',
      '💡 Tip: no-result >15% means content gaps OR bad search synonyms — run [KB Coverage Rate] (K-1) on top no-result queries.',
    ];
  },
  staticExamples: [
    '🩺 Search Effectiveness Health: Good (CTR 75.0% / no-result 8.0%)\n📊 Snapshot: 12,000 searches/mo · 9,000 with click (75.0% CTR) · 960 no-result (8.0%) · 2,040 abandoned/dwell\n🔄 What-If: if CTR climbs to 85.0% (Excellent), 1,200 more searches find answers → at ~50% click-to-ticket-prevention rate, ~600 fewer tickets/mo\n⚖️ Break-Even: to hit Excellent (CTR ≥85.0% AND no-result ≤5.0%), need 1,200 more clicks OR 360 fewer no-result searches\n🎯 Milestone: search "pogo-sticking" (search → click → back to search) is the #1 KB UX failure — track per query weekly\n💡 Tip: no-result >15% means content gaps OR bad search synonyms — run [KB Coverage Rate] (K-1) on top no-result queries.',
  ],
  faq: [
    { q: 'What is search effectiveness?', a: 'Search effectiveness measures how well your in-app KB search serves users. Two metrics: CTR (% of searches that result in a click) and no-result rate (% of searches returning zero matches). High CTR + low no-result = users find answers quickly.' },
    { q: 'Why track BOTH CTR and no-result?', a: 'CTR alone is misleading - a high CTR with many zero-result searches means users see results but click low-quality matches. No-result alone misses "pogo-sticking" (search → click → return to search). The AND-band catches BOTH failure modes simultaneously.' },
    { q: 'How do I measure CTR and no-result?', a: 'Most KB platforms (Zendesk Guide, Intercom Articles, Document360) export search analytics with CTR and zero-result events. Algolia and Coveo provide dedicated search analytics dashboards. If your platform does not, log client-side search events to your analytics warehouse.' },
    { q: 'Why is "pogo-sticking" the #1 KB UX failure?', a: 'Pogo-sticking (search → click → back to search) means the user clicked but the article did not answer their question - the silent failure mode. Algolia 2024 reports 30-40% of KB clicks pogo-stick on poorly-tuned synonym maps.' },
    { q: 'How does this pair with K-1 Coverage Rate?', a: 'K-1 measures upstream KB coverage (% of tickets with a matching article). K-3 measures search discoverability (% of searches that find a useful article). Low K-3 with high K-1 = content exists but search cant surface it (synonym/taxonomy problem).' },
    { q: 'Why is the band composite (AND) rather than single-metric?', a: 'Single-metric bands fail: 100% CTR with 80% no-result means users only click when matched (misleading). 0% no-result with 20% CTR means users see results but never click (also misleading). The AND-band requires BOTH targets met - catches dual-failure modes.' },
  ],
  howToUse: [
    'Pull monthly search totals from your KB platform analytics dashboard (Zendesk Guide, Intercom, Document360, Algolia).',
    'Enter searches with click (CTR numerator) and searches with no result (zero-result count).',
    'Select industry benchmark (B2B SaaS or Consumer - informational only).',
    'Read the composite health band - 🟢 Excellent (CTR ≥85% AND no-result ≤5%) · 🟡 Good (CTR 70-85% AND no-result ≤10%) · 🟠 Warning (CTR 55-70% AND no-result ≤20%) · 🔴 Critical (either fails).',
    'Use Snapshot to identify abandoned searches = browse-without-click (UX problem) vs. pogo-stick (content problem).',
  ],
  sources: [
    'https://www.nngroup.com/articles/help-and-documentation/',
    'https://www.algolia.com/doc/guides/managing-results/relevance-overview/',
    'https://www.zendesk.com/blog/search-analytics-self-service/',
    'https://www.gartner.com/en/customer-service-support',
  ],
};
registerEngine(engine);