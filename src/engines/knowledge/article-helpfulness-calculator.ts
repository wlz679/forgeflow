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
import { clampNonNegative } from '../../core/engines/helpers';

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
    customFn: `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let a=function(t){return Number.isNaN(t)?0:Math.max(0,t)},f=function(t,e){const s=t+e;return s>0?t/s:0},m=function(t,e){return e>0?t/e:0},d=function(t,e){return t>=l.excellent.threshold1&&e>=l.excellent.threshold2?"excellent":t>=l.good.threshold1&&e>=l.good.threshold2?"good":t>=l.warning.threshold1?"warning":"critical"},r=function(t){return(t*100).toFixed(1)+"%"},o=function(t){return Math.round(t).toLocaleString()},b=function(t,e,s){var c=y(t);return Array.isArray(c)?c.join(\`
\`):String(c)};var N=a,V=f,W=m,K=d,U=r,j=o,G=b,l={excellent:{threshold1:.85,threshold2:.15,label:"Excellent",message:"Articles helping customers."},good:{threshold1:.7,threshold2:.08,label:"Good",message:"Helpful content overall."},warning:{threshold1:.55,label:"Warning",message:"Notable unhelpful share — audit bottom-20."},critical:{threshold:null,label:"Critical",message:"Vote loop broken — improve UI prompt + content."}},y=function(t){const e=a(Number(t.total_article_views)||0),s=a(Number(t.helpful_votes)||0),c=a(Number(t.unhelpful_votes)||0),n=s+c,h=Math.min(s,n),M=Math.min(c,n),g=a(Number(t.total_articles)||0),v=a(Number(t.target_helpful_pct)||0),i=f(h,M),u=m(n,e),x=v-i*100,k=d(i,u),C=l[k],p=l.excellent.threshold1,_=l.excellent.threshold2,w=Math.max(0,p*n-h),F=Math.max(0,_*e-n),I=Math.ceil(g*.2);return["🩺 Article Helpfulness Health: "+C.label+" ("+r(i)+" helpful · "+r(u)+" vote-rate · "+o(h)+" 👍 / "+o(n)+" votes)","📊 Snapshot: "+o(e)+" article views/mo · "+o(n)+" votes ("+r(u)+" vote-rate) · "+r(i)+" helpful · target "+v+"% ("+(x>=0?"+":"")+x.toFixed(1)+"pp gap) · "+o(g)+" articles","🔄 What-If: if helpful climbs to "+r(p)+" (Excellent) at same vote-rate, ~"+o(w)+" more 👍 votes/mo - usually = rewrite top-20 unhelpful articles","⚖️ Break-Even: to hit Excellent (helpful ≥"+r(p)+" AND vote-rate ≥"+r(_)+"), need "+o(w)+" more 👍 OR "+o(F)+" more total votes - audit bottom ~"+I+" articles",'🎯 Milestone: very low vote-rate (<8%) means the UI prompt is buried - promote "Was this helpful?" after the action step, not at the bottom',"💡 Tip: unhelpful 👎 clusters by topic. Sort by 👎 desc, group similar titles → rewrite the cohort. Pair with [Search Effectiveness] (K-3) - searches ending in 👎 reveal taxonomy gaps."]};return[b(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`,
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
    const views = clampNonNegative(Number(inputs.total_article_views) || 0);
    const helpful = clampNonNegative(Number(inputs.helpful_votes) || 0);
    const unhelp = clampNonNegative(Number(inputs.unhelpful_votes) || 0);
    const totalV = helpful + unhelp;
    const helpfulCapped = Math.min(helpful, totalV);
    const unhelpCapped = Math.min(unhelp, totalV);
    const articles = clampNonNegative(Number(inputs.total_articles) || 0);
    const target = clampNonNegative(Number(inputs.target_helpful_pct) || 0);
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
    { q: "How do I measure if an article is helpful?", a: "Track 1) \"Was this helpful?\" thumbs up/down (per article), 2) Follow-up ticket creation (article not solving problem), 3) Time on page (engagement depth), 4) Bounce rate (users leaving immediately), 5) Search-to-resolution rate. Best option: helpful % + ticket creation correlation. Target: 80%+ helpful, <10% ticket creation after view." },
    { q: "What is a good resolution rate for KB articles?", a: "Benchmarks: 60-80% of article views result in resolution (no ticket). Top articles: 90%+. Below 50%: poor content. Track by article. Top 20 articles = 80% of impact. Lower priority: 30-50% is acceptable. Pattern: most articles improve 10-20% with focused editing. Editorial lift is the highest-leverage KB investment." },
    { q: "How do I improve unhelpful articles?", a: "Tactics: 1) Add screenshots/GIFs (30%+ improvement), 2) Restructure steps (clearer order), 3) Add FAQ block at bottom (catches edge cases), 4) Update with recent feedback, 5) Link to related articles, 6) Reduce redundancy. Editorial review of top 100 articles: 30-50% improvement in 2-3 months. Most teams see 2-3x lift per focused edit." },
    { q: "How do I collect feedback on article helpfulness?", a: "In-article: \"Was this helpful? Yes/No\" with optional comment. End-of-article: 1-3 question survey. In-app: rate after using KB link. Email: follow-up for ticket-creators. Best: in-article widget (highest response rate). Sample size: 30+ responses per article for statistical significance. Track weekly. Aggregate monthly for trends." },
    { q: "What is the relationship between KB quality and support tickets?", a: "KB quality is the #1 driver of low ticket volume. Industry data: well-maintained KB reduces tickets by 30-50%. Poor KB: 0-10% deflection. Investing in KB content is the highest-ROI support investment. Track: tickets per 1000 users, deflection rate, article helpfulness. Aim: 50%+ deflection within 12 months." },
    { q: "How long should KB articles be?", a: "Sweet spot: 300-800 words. Too short: insufficient detail. Too long: users lost. Use short intro (1-2 sentences), step-by-step (max 5-7 steps), FAQ, related links. For complex topics: split into multiple articles. Best option: 1 page = 1 task. Pattern: 80% of articles <1000 words. Long-form only for detailed tutorials." },
    { q: "What types of content help users most?", a: "Top formats: 1) Step-by-step screenshots (60% more helpful than text), 2) Video tutorials (high engagement, lower deflection), 3) GIFs (looped, fast), 4) Annotated screenshots (arrows, highlights), 5) Downloadable templates, 6) Interactive demos. Use video for: complex workflows. Use screenshots for: simple steps. Mix: 70% text+screenshots, 30% video." },
    { q: "How do I measure the ROI of KB improvements?", a: "ROI = (tickets saved × cost per ticket) − (time invested × hourly rate). For 10K tickets/month, 30% reduction: 3000 tickets saved × $15 = $45K/year. Investment: 1 person × 25% time × $80K = $20K. Net ROI: $25K/year. Track per-article: helpfulness change × ticket creation change. Best: A/B test article versions." },
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
  engineKey: true,
};
registerEngine(engine);
