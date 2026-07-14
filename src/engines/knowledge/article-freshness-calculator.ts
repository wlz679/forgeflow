// P13-2 Article Freshness
// 6-section v3 Business template.
//
// Mid-market B2B SaaS DevRel/Tech Writer persona ($10M-$50M ARR).
// Community-wisdom thresholds (NN/g + TSIA Knowledge-Centered Service 2024 + Intercom Help Center Best Practices).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

export const HEALTH_BANDS = {
  excellent: { threshold: 0.80, label: 'Excellent', message: 'Fresh KB - most articles reviewed recently.' },
  good:      { threshold: 0.55, label: 'Good',      message: 'Healthy review cadence.' },
  warning:   { threshold: 0.40, label: 'Warning',   message: 'Stale content creeping in.' },
  critical:  { threshold: -Infinity, label: 'Critical', message: 'KB content outdated.' },
};

export function freshRate12mo(updated: number, total: number): number {
  return total > 0 ? updated / total : 0;
}

export function staleCount(updated: number, total: number): number {
  return Math.max(0, total - updated);
}

export function calcHealthBand(fresh: number): keyof typeof HEALTH_BANDS {
  if (fresh >= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (fresh >= HEALTH_BANDS.good.threshold) return 'good';
  if (fresh >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtPct(x: number): string { return (x * 100).toFixed(1) + '%'; }
function fmtInt(x: number): string { return Math.round(x).toLocaleString(); }

const engine: ToolEngine = {
  slug: 'solopreneur-article-freshness-calculator',
  title: 'Article Freshness',
  description:
    'Measure what % of KB articles are fresh (updated in last 12 months). HIGHER health bands - fresher content = better accuracy: 🟢 >=80% - 🟡 55-80% - 🟠 40-55% - 🔴 <40%. For mid-market B2B SaaS ($10M-$50M ARR) DevRel Leads and Technical Writers.',
  inputs: [
    { name: 'total_articles',        label: 'Total KB articles',          placeholder: 'e.g. 500', type: 'number' },
    { name: 'articles_updated_12mo', label: 'Articles updated in 12mo',   placeholder: 'e.g. 325', type: 'number' },
    { name: 'articles_updated_6mo',  label: 'Articles updated in 6mo',    placeholder: 'e.g. 200', type: 'number' },
    { name: 'target_freshness_pct',  label: 'Internal freshness target (%)', placeholder: 'e.g. 70', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `var cnn=function(x){return Math.max(0,x)};function run(inputs, pick, fill) {
  var total = cnn(Number(inputs.total_articles) || 0);
  var up12 = cnn(Number(inputs.articles_updated_12mo) || 0);
  var up6 = cnn(Number(inputs.articles_updated_6mo) || 0);
  var target = cnn(Number(inputs.target_freshness_pct) || 0);
  if (up12 > total) up12 = total;
  if (up6 > up12) up6 = up12;
  var fresh12 = total > 0 ? up12 / total : 0;
  var fresh6 = total > 0 ? up6 / total : 0;
  var stale = Math.max(0, total - up12);
  var band = fresh12 >= 0.80 ? 'Excellent' : fresh12 >= 0.55 ? 'Good' : fresh12 >= 0.40 ? 'Warning' : 'Critical';
  var emoji = fresh12 >= 0.80 ? '🟢' : fresh12 >= 0.55 ? '🟡' : fresh12 >= 0.40 ? '🟠' : '🔴';
  var altFresh = 0.80;
  var lift = Math.max(0, altFresh * total - up12);
  var monthsAt10 = lift > 0 ? Math.ceil(lift / 10) : 0;
  return [
    '🩺 Article Freshness Health: ' + emoji + ' ' + band + ' (' + (fresh12*100).toFixed(1) + '% fresh in 12mo - ' + stale.toLocaleString() + ' stale)',
    '📊 Snapshot: ' + up12.toLocaleString() + '/' + total.toLocaleString() + ' updated 12mo - ' + up6.toLocaleString() + '/' + total.toLocaleString() + ' updated 6mo - ' + stale.toLocaleString() + ' stale - target ' + target + '% (' + Math.abs(target - fresh12*100).toFixed(1) + 'pp gap)',
    '🔄 What-If: if 12mo freshness climbs to 80% (Excellent), ' + Math.round(lift).toLocaleString() + ' more articles reviewed (~10/mo cadence)',
    '⚖️ Break-Even: to hit >=80% (Excellent), need ' + Math.round(lift).toLocaleString() + ' more articles reviewed; at 10/mo cadence = ~' + monthsAt10 + ' months',
    '🎯 Milestone: audit stale articles quarterly - products that change >2x/year need reviews every 6mo',
    '💡 Tip: stale articles are the silent killer - ' + (stale*100/Math.max(1,total)).toFixed(0) + '% of KB has wrong info customers act on. Tag with last-reviewed date. Pair with [Deflection Quality] (K-4) - fresh articles drive lower reopen.',
  ];
}`,
  },
  generate(inputs) {
    const total = clampNonNegative(Number(inputs.total_articles) || 0);
    const up12 = Math.min(clampNonNegative(Number(inputs.articles_updated_12mo) || 0), total);
    const up6 = Math.min(clampNonNegative(Number(inputs.articles_updated_6mo) || 0), up12);
    const targetPct = clampNonNegative(Number(inputs.target_freshness_pct) || 0);
    const fresh12 = freshRate12mo(up12, total);
    const fresh6 = total > 0 ? up6 / total : 0;
    const stale = staleCount(up12, total);
    const band = calcHealthBand(fresh12);
    const bandInfo = HEALTH_BANDS[band];
    const altFresh = HEALTH_BANDS.excellent.threshold;
    const lift = Math.max(0, altFresh * total - up12);
    const monthsAt10 = lift > 0 ? Math.ceil(lift / 10) : 0;
    const gapPct = targetPct - fresh12 * 100;
    return [
      '🩺 Article Freshness Health: ' + bandInfo.label + ' (' + fmtPct(fresh12) + ' fresh in 12mo - ' + fmtInt(stale) + ' stale)',
      '📊 Snapshot: ' + fmtInt(up12) + '/' + fmtInt(total) + ' updated 12mo - ' + fmtInt(up6) + '/' + fmtInt(total) + ' updated 6mo - ' + fmtInt(stale) + ' stale - target ' + targetPct + '% (' + (gapPct >= 0 ? '+' : '') + gapPct.toFixed(1) + 'pp gap)',
      '🔄 What-If: if 12mo freshness climbs to ' + fmtPct(altFresh) + ' (Excellent), ' + fmtInt(lift) + ' more articles reviewed (~10/mo cadence)',
      '⚖️ Break-Even: to hit ' + fmtPct(HEALTH_BANDS.excellent.threshold) + ' (Excellent), need ' + fmtInt(lift) + ' more articles reviewed; at 10/mo cadence = ~' + monthsAt10 + ' months',
      '🎯 Milestone: audit stale articles quarterly - products that change >2x/year need reviews every 6mo',
      '💡 Tip: stale articles are the silent killer - ' + Math.round(stale * 100 / Math.max(1, total)) + '% of KB has wrong info customers act on. Tag with last-reviewed date. Pair with [Deflection Quality] (K-4) - fresh articles drive lower reopen.',
    ];
  },
  staticExamples: [
    '🩺 Article Freshness Health: Good (65.0% fresh in 12mo - 175 stale)\n📊 Snapshot: 325/500 updated 12mo - 200/500 updated 6mo - 175 stale - target 70% (+5.0pp gap)\n🔄 What-If: if 12mo freshness climbs to 80.0% (Excellent), 75 more articles reviewed (~10/mo cadence)\n⚖️ Break-Even: to hit 80.0% (Excellent), need 75 more articles reviewed; at 10/mo cadence = ~8 months\n🎯 Milestone: audit stale articles quarterly - products that change >2x/year need reviews every 6mo\n💡 Tip: stale articles are the silent killer - 35% of KB has wrong info customers act on. Tag with last-reviewed date. Pair with [Deflection Quality] (K-4) - fresh articles drive lower reopen.',
  ],
  faq: [
    { q: 'What is "article freshness"?', a: 'The % of KB articles updated within the last 12 months. Stale articles contain outdated steps, screenshots, or product behavior - customers following them hit dead ends and reopen tickets. NN/g recommends 70%+ as the mature target.' },
    { q: 'Why 12mo, not 6mo?', a: '12mo is the industry-standard review window (NN/g + Intercom Help Center). 6mo is a secondary cadence metric - useful for fast-moving products. The health band is driven by the 12mo figure to avoid penalizing stable products.' },
    { q: 'How do I track last-updated?', a: 'Most KB platforms (Document360, Zendesk Guide, Intercom Articles) auto-track last-updated date. If manual, add a Last reviewed: YYYY-MM-DD footer discipline. Set a 12mo reminder cron for the review queue.' },
    { q: 'Does this pair with K-4 Deflection Quality?', a: 'Yes - K-4 measures ticket reopen rate (proxy for content quality). Stale articles (low K-2) cause reopen spikes. Audit stale FIRST when K-4 reopens climb.' },
    { q: 'What if my product changes monthly?', a: 'Aim for 6mo cadence instead of 12mo. Track both rates (12mo is the band driver; 6mo is informational). If 6mo drops below 12mo x 0.5, your editorial review backlog is the bottleneck.' },
    { q: 'Why does K-2 use gap_pct instead of an absolute target band?', a: 'Target is customer-set (varies by company maturity). The 4 health bands are HARD thresholds (>=80/55/40%) - gap_pct is informational only, shown in Snapshot. This matches P9-5 customer-health-score pattern.' },
  ],
  howToUse: [
    'Enter total KB articles and last-12mo / last-6mo updated counts from your KB admin dashboard.',
    'Enter your internal freshness target % (default: 70%).',
    'Read the 12mo fresh rate band - 🟢 Excellent >=80% - 🟡 Good 55-80% - 🟠 Warning 40-55% - 🔴 Critical <40%.',
    'Use the Snapshot to compute stale_count = (articles needed) and feed to writers.',
    'Pair with K-4 Deflection Quality (P12-5 / batch partner) to prioritize WHICH stale articles to refresh.',
  ],
  sources: [
    'https://www.nngroup.com/articles/help-and-documentation/',
    'https://www.tsia.com/blog/knowledge-centered-service',
    'https://www.intercom.com/help/articles/what-is-help-center-best-practices',
    'https://www.gartner.com/en/customer-service-support',
  ],
};
registerEngine(engine);
