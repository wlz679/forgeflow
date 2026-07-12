// P13-6 Article Helpfulness Score
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS DevRel/Tech Writer persona ($10M-$50M ARR).
// Community-wisdom thresholds (NN/g Help & Documentation 2024 + TSIA Knowledge-Centered Service
// + Zendesk Self-Service Quality 2024). COMPOSITE dual-threshold band: helpful share (HIGHER)
// AND vote rate (HIGHER). Tiered cascade — critical reached when helpful<55% OR vote_rate<3%.
// HEALTH_BANDS shape is irregular (excellent/good have threshold1+threshold2;
// warning/critical different) — mirrors P9-5 customer-health-score pattern.
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

export const HEALTH_BANDS = {
  excellent: { threshold1: 0.85, threshold2: 0.15, label: 'Excellent', message: 'Articles helping customers.' },
  good:      { threshold1: 0.70, threshold2: 0.08, label: 'Good',      message: 'Helpful content overall.' },
  warning:   { threshold1: 0.55, label: 'Warning', message: 'Notable unhelpful share — audit bottom-20.' },
  critical:  { threshold: -Infinity, label: 'Critical', message: 'Vote loop broken — improve UI prompt + content.' },
};

export function helpfulPct(helpful: number, unhelpful: number): number {
  const total = helpful + unhelpful;
  return total > 0 ? helpful / total : 0;
}

export function voteRate(totalVotes: number, views: number): number {
  return views > 0 ? totalVotes / views : 0;
}

// Band resolves via tiered cascade. critical is reached when helpful<warning.threshold1
// OR voteRate<0.03 (any single-fail at the bottom triggers). Excellent/Good require BOTH
// thresholds AND-ed; failing just one cascades to the next tier.
export function calcHealthBand(helpful: number, voteRate: number): keyof typeof HEALTH_BANDS {
  if (helpful >= HEALTH_BANDS.excellent.threshold1 && voteRate >= HEALTH_BANDS.excellent.threshold2) return 'excellent';
  if (helpful >= HEALTH_BANDS.good.threshold1 && voteRate >= HEALTH_BANDS.good.threshold2) return 'good';
  if (helpful >= HEALTH_BANDS.warning.threshold1) return 'warning';
  return 'critical';
}

function fmtPct(x: number): string { return (x * 100).toFixed(1) + '%'; }
function fmtPctRaw(x: number): string { return x.toFixed(1) + '%'; }
function fmtInt(x: number): string { return Math.round(x).toLocaleString(); }

const engine: ToolEngine = {
  slug: 'solopreneur-article-helpfulness-calculator',
  title: 'Article Helpfulness Score',
  description:
    'Measure KB article helpfulness via helpful-vote share + vote participation. HIGHER health bands — more 👍 + more engagement = better content: 🟢 ≥85% helpful AND ≥15% vote-rate · 🟡 ≥70% & ≥8% · 🟠 ≥55% · 🔴 either fails. For mid-market B2B SaaS ($10M-$50M ARR) DevRel Leads, Documentation Managers, and CS Ops leads.',
  inputs: [
    { name: 'total_article_views', label: 'Monthly article views',     placeholder: 'e.g. 25000', type: 'number' },
    { name: 'helpful_votes',       label: 'Helpful votes (👍)',        placeholder: 'e.g. 2400',  type: 'number' },
    { name: 'unhelpful_votes',     label: 'Unhelpful votes (👎)',      placeholder: 'e.g. 700',   type: 'number' },
    { name: 'total_articles',      label: 'Total KB articles',         placeholder: 'e.g. 500',   type: 'number' },
    { name: 'target_helpful_pct',  label: 'Target helpful % (👍 share)', placeholder: 'e.g. 75',   type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `function run(inputs, pick, fill) {
  var views = Number(inputs.total_article_views) || 0;
  var helpful = Number(inputs.helpful_votes) || 0;
  var unhelp = Number(inputs.unhelpful_votes) || 0;
  var articles = Number(inputs.total_articles) || 0;
  var target = Number(inputs.target_helpful_pct) || 0;
  if (helpful < 0) helpful = 0;
  if (unhelp < 0) unhelp = 0;
  var totalV = helpful + unhelp;
  if (helpful > totalV) helpful = totalV;
  if (unhelp > totalV) unhelp = totalV;
  var hpct = totalV > 0 ? helpful / totalV : 0;
  var vr = views > 0 ? totalV / views : 0;
  var gap = target - hpct * 100;
  var band = (hpct >= 0.85 && vr >= 0.15) ? 'Excellent' : (hpct >= 0.70 && vr >= 0.08) ? 'Good' : hpct >= 0.55 ? 'Warning' : 'Critical';
  var emoji = (hpct >= 0.85 && vr >= 0.15) ? '🟢' : (hpct >= 0.70 && vr >= 0.08) ? '🟡' : hpct >= 0.55 ? '🟠' : '🔴';
  var altHpct = 0.85;
  var liftHelpful = Math.max(0, altHpct * totalV - helpful);
  var altVr = 0.15;
  var liftVotes = Math.max(0, altVr * views - totalV);
  var bottom20Count = Math.ceil(articles * 0.2);
  return [
    '🩺 Article Helpfulness Health: ' + emoji + ' ' + band + ' (' + (hpct*100).toFixed(1) + '% helpful · ' + (vr*100).toFixed(1) + '% vote-rate · ' + Math.round(helpful).toLocaleString() + ' 👍 / ' + Math.round(totalV).toLocaleString() + ' votes)',
    '📊 Snapshot: ' + Math.round(views).toLocaleString() + ' article views/mo · ' + Math.round(totalV).toLocaleString() + ' votes (' + (vr*100).toFixed(1) + '% vote-rate) · ' + (hpct*100).toFixed(1) + '% helpful · target ' + target + '% (' + (gap >= 0 ? '+' : '') + gap.toFixed(1) + 'pp gap) · ' + Math.round(articles).toLocaleString() + ' articles',
    '🔄 What-If: if helpful climbs to 85% (Excellent) at same vote-rate, ~' + Math.round(liftHelpful).toLocaleString() + ' more 👍 votes/mo - usually = rewrite top-20 unhelpful articles',
    '⚖️ Break-Even: to hit Excellent (helpful ≥85% AND vote-rate ≥15%), need ' + Math.round(liftHelpful).toLocaleString() + ' more 👍 OR ' + Math.round(liftVotes).toLocaleString() + ' more total votes - audit bottom ~' + bottom20Count + ' articles',
    '🎯 Milestone: very low vote-rate (<8%) means the UI prompt is buried - promote "Was this helpful?" after the action step, not at the bottom',
    '💡 Tip: unhelpful 👎 clusters by topic. Sort by 👎 desc, group similar titles → rewrite the cohort. Pair with [Search Effectiveness] (K-3) - searches ending in 👎 reveal taxonomy gaps.',
  ];
}`,
  },
  generate(inputs) {
    const views = Number(inputs.total_article_views) || 0;
    const helpful = Math.max(0, Number(inputs.helpful_votes) || 0);
    const unhelp = Math.max(0, Number(inputs.unhelpful_votes) || 0);
    const totalV = helpful + unhelp;
    const helpfulCapped = Math.min(helpful, totalV);
    const unhelpCapped = Math.min(unhelp, totalV);
    const articles = Number(inputs.total_articles) || 0;
    const target = Number(inputs.target_helpful_pct) || 0;
    const hpct = helpfulPct(helpfulCapped, unhelpCapped);
    const vr = voteRate(totalV, views);
    const gap = target - hpct * 100;
    const band = calcHealthBand(hpct, vr);
    const bandInfo = HEALTH_BANDS[band];
    const altHpct = HEALTH_BANDS.excellent.threshold1;
    const altVr = HEALTH_BANDS.excellent.threshold2;
    const liftHelpful = Math.max(0, altHpct * totalV - helpfulCapped);
    const liftVotes = Math.max(0, altVr * views - totalV);
    const bottom20Count = Math.ceil(articles * 0.2);
    return [
      '🩺 Article Helpfulness Health: ' + bandInfo.label + ' (' + fmtPct(hpct) + ' helpful · ' + fmtPct(vr) + ' vote-rate · ' + fmtInt(helpfulCapped) + ' 👍 / ' + fmtInt(totalV) + ' votes)',
      '📊 Snapshot: ' + fmtInt(views) + ' article views/mo · ' + fmtInt(totalV) + ' votes (' + fmtPct(vr) + ' vote-rate) · ' + fmtPct(hpct) + ' helpful · target ' + target + '% (' + (gap >= 0 ? '+' : '') + gap.toFixed(1) + 'pp gap) · ' + fmtInt(articles) + ' articles',
      '🔄 What-If: if helpful climbs to ' + fmtPct(altHpct) + ' (Excellent) at same vote-rate, ~' + fmtInt(liftHelpful) + ' more 👍 votes/mo - usually = rewrite top-20 unhelpful articles',
      '⚖️ Break-Even: to hit Excellent (helpful ≥' + fmtPct(altHpct) + ' AND vote-rate ≥' + fmtPct(altVr) + '), need ' + fmtInt(liftHelpful) + ' more 👍 OR ' + fmtInt(liftVotes) + ' more total votes - audit bottom ~' + bottom20Count + ' articles',
      '🎯 Milestone: very low vote-rate (<8%) means the UI prompt is buried - promote "Was this helpful?" after the action step, not at the bottom',
      '💡 Tip: unhelpful 👎 clusters by topic. Sort by 👎 desc, group similar titles → rewrite the cohort. Pair with [Search Effectiveness] (K-3) - searches ending in 👎 reveal taxonomy gaps.',
    ];
  },
  staticExamples: [
    '🩺 Article Helpfulness Health: Good (77.4% helpful · 12.4% vote-rate · 2,400 👍 / 3,100 votes)\n📊 Snapshot: 25,000 article views/mo · 3,100 votes (12.4% vote-rate) · 77.4% helpful · target 75% (-2.4pp gap) · 500 articles\n🔄 What-If: if helpful climbs to 85.0% (Excellent) at same vote-rate, ~235 more 👍 votes/mo - usually = rewrite top-20 unhelpful articles\n⚖️ Break-Even: to hit Excellent (helpful ≥85.0% AND vote-rate ≥15.0%), need 235 more 👍 OR 650 more total votes - audit bottom ~100 articles\n🎯 Milestone: very low vote-rate (<8%) means the UI prompt is buried - promote "Was this helpful?" after the action step, not at the bottom\n💡 Tip: unhelpful 👎 clusters by topic. Sort by 👎 desc, group similar titles → rewrite the cohort. Pair with [Search Effectiveness] (K-3) - searches ending in 👎 reveal taxonomy gaps.',
  ],
  faq: [
    { q: 'What is article helpfulness?', a: 'Article helpfulness measures two things: (1) helpful share = 👍 / total votes (quality signal - how often an article actually solves the question), and (2) vote rate = total votes / article views (engagement signal - how often users bother to vote at all). Tracking both catches content quality AND UI-prompt issues.' },
    { q: 'Why track BOTH helpful share AND vote rate?', a: 'Helpful share alone is misleading: 100% helpful from 3 votes is noise. Vote rate alone hides quality: 30% vote-rate at 50% helpful means lots of people voted, half were unhappy. The AND-band requires BOTH thresholds met — excellent content needs ≥85% helpful AND ≥15% vote-rate.' },
    { q: 'How do I measure helpful votes?', a: 'Most KB platforms (Zendesk Guide, Intercom Articles, Document360) collect 👍/👎 reactions on each article. Export the per-article totals monthly. If your platform does not, the engineering cost of adding a "Was this helpful?" widget to every KB article template is small (one afternoon for most static-site setups).' },
    { q: 'What if vote rate is very low (<8%)?', a: 'Low vote rate almost always means the UI prompt is buried or non-intrusive. Move the "Was this helpful?" prompt to AFTER the actionable step (where users succeeded or failed). Bottom-of-page prompts get <5% engagement; mid-article prompts get 15-25%. The vote loop is broken at the UI level, not the content level.' },
    { q: 'How does this pair with K-3 Search Effectiveness?', a: 'K-3 measures upstream search discoverability (CTR + no-result rate). K-6 measures downstream content helpfulness (👍 share). High CTR + low helpful = search surfaces the article but content does not deliver — refresh priority list. Low CTR + high helpful = content is fine, search taxonomy needs work.' },
    { q: 'Why is the band composite (AND) rather than single-metric?', a: 'Helpful share alone over-weights engaged voters (small-N bias). Vote rate alone misses quality (high engagement at low helpful share means wide distribution of bad content). The AND-band requires both metrics to clear their thresholds — catches dual-failure modes that single-metric bands miss.' },
  ],
  howToUse: [
    'Pull total_article_views from your KB analytics — monthly unique article-page views across the whole KB.',
    'Pull helpful_votes and unhelpful_votes — 👍 and 👎 totals across all articles that month (sum the per-article exports).',
    'Enter total_articles — admin count of articles in your KB (drives the bottom-20 audit estimate in Break-Even).',
    'Enter target_helpful_pct — internal goal for the helpful-share (default 75%).',
    'Read the composite band — 🟢 Excellent (helpful ≥85% AND vote-rate ≥15%) · 🟡 Good (≥70% AND ≥8%) · 🟠 Warning (≥55%) · 🔴 Critical (helpful <55% OR vote-rate <3%).',
    'Use Snapshot to identify the helpful-vs-target gap (positive = below target = room to grow; negative = above target).',
  ],
  sources: [
    'https://www.nngroup.com/articles/help-and-documentation/',
    'https://www.tsia.com/blog/knowledge-centered-service',
    'https://www.zendesk.com/blog/search-analytics-self-service/',
    'https://www.intercom.com/help/articles/what-is-help-center-best-practices',
  ],
};
registerEngine(engine);
