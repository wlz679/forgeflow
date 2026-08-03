// P13-4 Deflection Quality
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS DevRel/Tech Writer persona ($10M-$50M ARR).
// Community-wisdom thresholds (NN/g + TSIA Knowledge-Centered Service 2024 + Intercom Help Center Best Practices).
// INVERSE on reopen rate: lower reopen = better deflection quality (critical uses Infinity).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

export const HEALTH_BANDS = {
  excellent: { threshold: 0.08, label: 'Excellent', message: 'KB content solving customer problems.' },
  good:      { threshold: 0.15, label: 'Good',      message: 'Most deflected tickets stay solved.' },
  warning:   { threshold: 0.25, label: 'Warning',   message: 'Notable reopen rate - audit top articles.' },
  critical:  { threshold: Infinity, label: 'Critical', message: 'Deflection masking product gaps.' },
};

export function reopenRate(reopened: number, deflected: number): number {
  return deflected > 0 ? reopened / deflected : 0;
}

export function qualityPct(reopen: number): number {
  return Math.max(0, 100 - reopen * 100);
}

export function gapToTarget(quality: number, target: number): number {
  return target - quality;
}

export function calcHealthBand(reopen: number): keyof typeof HEALTH_BANDS {
  if (reopen <= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (reopen <= HEALTH_BANDS.good.threshold) return 'good';
  if (reopen <= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtPct(x: number): string { return (x * 100).toFixed(1) + '%'; }
function fmtPctRaw(x: number): string { return x.toFixed(1) + '%'; }
function fmtInt(x: number): string { return Math.round(x).toLocaleString(); }

const engine: ToolEngine = {
  slug: 'solopreneur-deflection-quality-calculator',
  title: 'Deflection Quality',
  description:
    'Measure % of self-service-deflected tickets that get reopened (proxy for content quality). INVERSE health bands - lower reopen = better deflection: 🟢 ≤8% reopen · 🟡 8-15% · 🟠 15-25% · 🔴 >25%. For mid-market B2B SaaS ($10M-$50M ARR) DevRel Leads, Documentation Managers, and CS Ops leads.',
  inputs: [
    { name: 'tickets_deflected_30d', label: 'Tickets deflected (30d)',       placeholder: 'e.g. 1750', type: 'number' },
    { name: 'tickets_reopened_30d',  label: 'Tickets reopened (30d)',         placeholder: 'e.g. 210',  type: 'number' },
    { name: 'target_quality_pct',    label: 'Target quality % (no reopen)',   placeholder: 'e.g. 90',   type: 'number' },
    { name: 'deflection_source',     label: 'Deflection source',              placeholder: 'Both',      type: 'select', options: ['KB', 'Chatbot', 'Both'] },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `var cnn=function(x){return Math.max(0,x)};function run(inputs, pick, fill) {
  var deflected = cnn(Number(inputs.tickets_deflected_30d) || 0);
  var reopened = cnn(Number(inputs.tickets_reopened_30d) || 0);
  var target = cnn(Number(inputs.target_quality_pct) || 0);
  var source = inputs.deflection_source || 'Both';
  if (reopened > deflected) reopened = deflected;
  var reopen = deflected > 0 ? reopened / deflected : 0;
  var quality = Math.max(0, 100 - reopen * 100);
  var gap = target - quality;
  var band = reopen <= 0.08 ? 'Excellent' : reopen <= 0.15 ? 'Good' : reopen <= 0.25 ? 'Warning' : 'Critical';
  var emoji = reopen <= 0.08 ? '🟢' : reopen <= 0.15 ? '🟡' : reopen <= 0.25 ? '🟠' : '🔴';
  var altReopen = 0.08;
  var altQuality = 100 - altReopen * 100;
  var liftReopen = Math.max(0, reopened - altReopen * deflected);
  var reopenFree = liftReopen;
  return [
    '🩺 Deflection Quality Health: ' + emoji + ' ' + band + ' (' + (reopen*100).toFixed(1) + '% reopen · ' + quality.toFixed(1) + '% quality · ' + Math.round(reopened).toLocaleString() + ' of ' + Math.round(deflected).toLocaleString() + ' reopened)',
    '📊 Snapshot: ' + Math.round(reopened).toLocaleString() + ' of ' + Math.round(deflected).toLocaleString() + ' tickets reopened (' + (reopen*100).toFixed(1) + '%) via ' + source + ' · quality ' + quality.toFixed(1) + '% · target ' + target + '% (' + (gap >= 0 ? '+' : '') + gap.toFixed(1) + 'pp gap)',
    '🔄 What-If: if reopen rate drops to 8% (Excellent), ' + Math.round(reopenFree).toLocaleString() + ' fewer reopen tickets/mo - saved quality climbs to ' + altQuality.toFixed(1) + '%',
    '⚖️ Break-Even: to hit ≤8% reopen (Excellent), need ' + Math.round(reopenFree).toLocaleString() + ' fewer reopens/mo OR refresh ~' + Math.ceil(reopenFree / 10) + ' top-reopen articles',
    '🎯 Milestone: track reopen weekly - products that change >2x/year see reopen spikes 30 days post-release',
    '💡 Tip: reopens >20% mean content is technically present but answers the WRONG question. Audit top-reopen articles monthly. Pair with [Article Freshness] (K-2) - stale articles drive reopen spikes.',
  ];
}`,
  },
  generate(inputs) {
    const deflected = clampNonNegative(Number(inputs.tickets_deflected_30d) || 0);
    const reopened = Math.min(clampNonNegative(Number(inputs.tickets_reopened_30d) || 0), deflected);
    const targetPct = clampNonNegative(Number(inputs.target_quality_pct) || 0);
    const source = String(inputs.deflection_source || 'Both');
    const reopen = reopenRate(reopened, deflected);
    const quality = qualityPct(reopen);
    const gap = gapToTarget(quality, targetPct);
    const band = calcHealthBand(reopen);
    const bandInfo = HEALTH_BANDS[band];
    const altReopen = HEALTH_BANDS.excellent.threshold;
    const liftReopen = Math.max(0, reopened - altReopen * deflected);
    return [
      '🩺 Deflection Quality Health: ' + bandInfo.label + ' (' + fmtPct(reopen) + ' reopen · ' + fmtPctRaw(quality) + ' quality · ' + fmtInt(reopened) + ' of ' + fmtInt(deflected) + ' reopened)',
      '📊 Snapshot: ' + fmtInt(reopened) + ' of ' + fmtInt(deflected) + ' tickets reopened (' + fmtPct(reopen) + ') via ' + source + ' · quality ' + fmtPctRaw(quality) + ' · target ' + targetPct + '% (' + (gap >= 0 ? '+' : '') + gap.toFixed(1) + 'pp gap)',
      '🔄 What-If: if reopen rate drops to ' + fmtPct(altReopen) + ' (Excellent), ' + fmtInt(liftReopen) + ' fewer reopen tickets/mo - saved quality climbs to ' + fmtPctRaw(100 - altReopen * 100),
      '⚖️ Break-Even: to hit ' + fmtPct(HEALTH_BANDS.excellent.threshold) + ' reopen (Excellent), need ' + fmtInt(liftReopen) + ' fewer reopens/mo OR refresh ~' + Math.ceil(liftReopen / 10) + ' top-reopen articles',
      '🎯 Milestone: track reopen weekly - products that change >2x/year see reopen spikes 30 days post-release',
      '💡 Tip: reopens >20% mean content is technically present but answers the WRONG question. Audit top-reopen articles monthly. Pair with [Article Freshness] (K-2) - stale articles drive reopen spikes.',
    ];
  },
  staticExamples: [
    '🩺 Deflection Quality Health: Good (12.0% reopen · 88.0% quality · 210 of 1,750 reopened)\n📊 Snapshot: 210 of 1,750 tickets reopened (12.0%) via Both · quality 88.0% · target 90% (+2.0pp gap)\n🔄 What-If: if reopen rate drops to 8.0% (Excellent), 70 fewer reopen tickets/mo - saved quality climbs to 92.0%\n⚖️ Break-Even: to hit 8.0% reopen (Excellent), need 70 fewer reopens/mo OR refresh ~7 top-reopen articles\n🎯 Milestone: track reopen weekly - products that change >2x/year see reopen spikes 30 days post-release\n💡 Tip: reopens >20% mean content is technically present but answers the WRONG question. Audit top-reopen articles monthly. Pair with [Article Freshness] (K-2) - stale articles drive reopen spikes.',
  ],
  faq: [
    { q: 'What is deflection quality?', a: 'Deflection quality measures the % of self-service-deflected tickets (via KB or chatbot) that customers reopen within 30 days. Reopen is the strongest proxy for content quality - if a customer had to come back, the article did not solve their problem. TSIA 2024 reports mature KBs run 8-15% reopen; >25% means content is technically present but wrong.' },
    { q: 'Why track reopen vs deflection volume?', a: 'P12-5 deflection rate counts HOW MANY tickets are deflected (volume metric). K-4 quality measures HOW GOOD those deflections are (reopen proxy). High volume + high reopen = false economy - looks good in dashboards but customers are frustrated. Mid-market target: 25-40% deflection AND ≤15% reopen.' },
    { q: 'How do I measure reopen?', a: 'Most helpdesks (Zendesk, Intercom, Freshdesk) tag tickets as "reopens" when a customer replies within X days of a closed-by-self-service ticket. Default window: 30 days. Export via helpdesk API or analytics warehouse. If untagged, sample 100 deflected tickets monthly and check reply history.' },
    { q: 'What if reopen is high (>25%)?', a: 'Audit the top 10 reopened articles monthly. Common causes: (1) screenshots show old UI, (2) steps reference deprecated features, (3) answer addresses a tangential question. Refreshing 1-2 articles per week compounds - 8% reopen is achievable in 6 months for a 500-article KB.' },
    { q: 'How does this pair with K-2 Article Freshness?', a: 'K-2 measures WHAT % of articles are updated recently (upstream metric). K-4 measures whether articles actually solve problems (downstream outcome). Low K-2 + high K-4 reopen = stale content. Audit stale FIRST when reopens climb.' },
    { q: 'Why does K-4 use 4 inputs (vs 3 for K-2)?', a: 'K-4 adds deflection_source (KB/Chatbot/Both) because chatbot reopens typically run 2-3x higher than KB reopens (chatbots answer narrowly). Knowing the source lets you triage - chatbot reopens = intent-matching gaps; KB reopens = content gaps.' },
    { q: "What is deflection quality?", a: "Deflection quality = the percentage of \"deflected\" tickets that were actually resolved by self-service (not just abandoned). High deflection with low quality = users give up frustrated. Track: deflection rate × ticket creation rate (after deflection). Good: 30-50% deflection with <20% re-ticket. Bad: 50% deflection with 40% re-ticket (low quality)." },
    { q: "How is deflection quality different from deflection rate?", a: "Deflection rate: % of tickets avoided (potentially good or bad). Deflection quality: % of deflected tickets that were actually resolved. Bad deflection: user searches, finds nothing, gets frustrated, gives up, calls support anyway (higher cost). High deflection + high quality = true success. Track both. Quality matters more than quantity." },
    { q: "What causes low deflection quality?", a: "Causes: 1) Search returning irrelevant results, 2) Outdated content, 3) Content doesn't match user query, 4) Too-jargon-y for users, 5) Critical info missing. Symptoms: users go to search → find article → create ticket anyway. Fix: better search (AI/LLM-powered), content audit, user journey mapping. Most teams: 50%+ improvement in 6 months." },
    { q: "How do I improve deflection quality?", a: "Tactics: 1) Better search (Algolia, AI search), 2) AI chatbot for natural language queries, 3) Content audit (top 100 articles quarterly), 4) User research (where do users get stuck?), 5) Improve article helpfulness (track feedback). Most teams: 20-40% improvement in quality in 6 months. Aim: deflection rate >40% AND quality >70%." },
    { q: "What is the right deflection target?", a: "B2B SaaS: 40-60% deflection is good. 70%+ is excellent. B2C: 30-50%. By topic: 60-80% for tier-1 (password, billing), 20-40% for tier-2 (technical issues). Tie deflection to ticket topic. Set per-topic targets. Realistic: 10-20 point improvement per year. Aim for steady growth, not perfection." },
    { q: "How do I measure deflection quality?", a: "Formula: 1 - (tickets created after view / total deflection). Track: KB views that led to ticket creation. Per article: ticket creation rate (post-view). Top 20 articles: 5-15% ticket creation = good. >30% = poor quality. Use: Google Analytics event tracking on KB articles, integrate with ticket system. Most platforms have reports." },
    { q: "How do AI chatbots improve deflection quality?", a: "Modern AI chatbots (GPT-4 class) handle natural language queries, return relevant answers, escalate when unsure. Improvement: 30-50% better deflection than keyword search. Limits: not all queries. Best: hybrid (AI for quick lookup, human for complex). Most teams: 60%+ deflection with AI + good KB. ROI: 5-10x in 12 months." },
    { q: "What is the cost of poor deflection quality?", a: "Poor deflection: users give up, escalate to higher-cost channels. Cost: 3-5x higher (chat > email > KB). Bad experience: increased churn. Industry data: 80% of customers have tried self-service before contacting support. If self-service fails, 60% report being frustrated. Avoid at all costs. Quality matters more than quantity." },
  ],
  howToUse: [
    'Pull tickets_deflected_30d from your helpdesk platform - count of tickets closed by self-service (KB click or chatbot resolve) in the last 30 days.',
    'Pull tickets_reopened_30d - tickets where the customer replied within 30 days of self-service closure.',
    'Enter your target_quality_pct - typically 85-95% (default 90%).',
    'Select deflection_source (KB / Chatbot / Both) - chatbot reopens typically run higher than KB.',
    'Read the reopen rate band - 🟢 Excellent ≤8% · 🟡 Good 8-15% · 🟠 Warning 15-25% · 🔴 Critical >25%.',
    'Use Snapshot to identify the reopen tickets count = candidate articles to audit (10-20 articles per refresh cycle).',
  ],
  sources: [
    'https://www.tsia.com/blog/knowledge-centered-service',
    'https://www.nngroup.com/articles/help-and-documentation/',
    'https://www.intercom.com/help/articles/what-is-help-center-best-practices',
    'https://www.zendesk.com/customer-experience-trends/',
  ],
  engineKey: true,
};
registerEngine(engine);
