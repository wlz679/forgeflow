// P13-2 Article Freshness
// 6-section v3 Business template.
//
// Mid-market B2B SaaS DevRel/Tech Writer persona ($10M-$50M ARR).
// Community-wisdom thresholds (NN/g + TSIA Knowledge-Centered Service 2024 + Intercom Help Center Best Practices).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-15：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 两端逐字节相同，不可能漂。
//   ⚠️ 兜底与 params **同源**（同一个局部变量）⇒ 英文页逐字不变（G9）、模板不冻结数值（G8）。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

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
    customFn: CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let s=function(e){return Number.isNaN(e)?0:Math.max(0,e)},g=function(e,t){return t>0?e/t:0},f=function(e,t){return Math.max(0,t-e)},m=function(e){return e>=n.excellent.threshold?"excellent":e>=n.good.threshold?"good":e>=n.warning.threshold?"warning":"critical"},c=function(e){return(e*100).toFixed(1)+"%"},r=function(e){return Math.round(e).toLocaleString()},p=function(e,t,a){var l=q(e);return Array.isArray(l)?l.join(\`
\`):String(l)};var S=s,L=g,O=f,C=m,I=c,W=r,E=p,i=tk,j='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',i=new Function("return "+j)(),n={excellent:{threshold:.8,label:"Excellent",message:"Fresh KB - most articles reviewed recently."},good:{threshold:.55,label:"Good",message:"Healthy review cadence."},warning:{threshold:.4,label:"Warning",message:"Stale content creeping in."},critical:{threshold:null,label:"Critical",message:"KB content outdated."}},q=function(e){const t=s(Number(e.total_articles)||0),a=Math.min(s(Number(e.articles_updated_12mo)||0),t),l=Math.min(s(Number(e.articles_updated_6mo)||0),a),b=s(Number(e.target_freshness_pct)||0),h=g(a,t),G=t>0?l/t:0,u=f(a,t),K=m(h),N=n[K],v=n.excellent.threshold,o=Math.max(0,v*t-a),P=o>0?Math.ceil(o/10):0,_=b-h*100,w=r(a),d=r(t),x=r(l),y=r(u),k=String(b),F=(_>=0?"+":"")+_.toFixed(1),M=String(Math.round(u*100/Math.max(1,t)));return["🩺 Article Freshness Health: "+N.label+" ("+c(h)+" fresh in 12mo - "+r(u)+" stale)",i("calc_out.article_freshness.row.snapshot","📊 Snapshot: "+w+"/"+d+" updated 12mo - "+x+"/"+d+" updated 6mo - "+y+" stale - target "+k+"% ("+F+"pp gap)",{up12:w,total:d,up6:x,stale:y,target:k,gap:F}),"🔄 What-If: if 12mo freshness climbs to "+c(v)+" (Excellent), "+r(o)+" more articles reviewed (~10/mo cadence)","⚖️ Break-Even: to hit "+c(n.excellent.threshold)+" (Excellent), need "+r(o)+" more articles reviewed; at 10/mo cadence = ~"+P+" months","🎯 Milestone: audit stale articles quarterly - products that change >2x/year need reviews every 6mo",i("calc_out.article_freshness.row.tip","💡 Tip: stale articles are the silent killer - "+M+"% of KB has wrong info customers act on. Tag with last-reviewed date. Pair with [Deflection Quality] (K-4) - fresh articles drive lower reopen.",{stale_pct:M})]};return[p(inputs,pick,fill)]}finally{}
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
    // P168 B3-15：Snapshot / Tip 两行令牌化 —— 兜底与 params 取**同一个局部变量**
    //   ⇒ 英文页逐字不变；locale 模板把该变量换成 {param} ⇒ 模板不冻结运行时数值。
    //   ⚠️ 命名空间必须精确等于 toolAlias(slug) = 'article_freshness'（见 B3_15_BATCH）。
    const up12Label = fmtInt(up12);
    const totalLabel = fmtInt(total);
    const up6Label = fmtInt(up6);
    const staleLabel = fmtInt(stale);
    const targetLabel = String(targetPct);
    const gapLabel = (gapPct >= 0 ? '+' : '') + gapPct.toFixed(1);
    const stalePctLabel = String(Math.round(stale * 100 / Math.max(1, total)));
    return [
      '🩺 Article Freshness Health: ' + bandInfo.label + ' (' + fmtPct(fresh12) + ' fresh in 12mo - ' + fmtInt(stale) + ' stale)',
      makeToken(
        'calc_out.article_freshness.row.snapshot',
        '📊 Snapshot: ' + up12Label + '/' + totalLabel + ' updated 12mo - ' + up6Label + '/' + totalLabel + ' updated 6mo - ' + staleLabel + ' stale - target ' + targetLabel + '% (' + gapLabel + 'pp gap)',
        { up12: up12Label, total: totalLabel, up6: up6Label, stale: staleLabel, target: targetLabel, gap: gapLabel },
      ),
      '🔄 What-If: if 12mo freshness climbs to ' + fmtPct(altFresh) + ' (Excellent), ' + fmtInt(lift) + ' more articles reviewed (~10/mo cadence)',
      '⚖️ Break-Even: to hit ' + fmtPct(HEALTH_BANDS.excellent.threshold) + ' (Excellent), need ' + fmtInt(lift) + ' more articles reviewed; at 10/mo cadence = ~' + monthsAt10 + ' months',
      '🎯 Milestone: audit stale articles quarterly - products that change >2x/year need reviews every 6mo',
      makeToken(
        'calc_out.article_freshness.row.tip',
        '💡 Tip: stale articles are the silent killer - ' + stalePctLabel + '% of KB has wrong info customers act on. Tag with last-reviewed date. Pair with [Deflection Quality] (K-4) - fresh articles drive lower reopen.',
        { stale_pct: stalePctLabel },
      ),
    ];
  },
  staticExamples: [
    '🩺 Article Freshness Health: Good (65.0% fresh in 12mo - 175 stale)\n$calc_out.article_freshness.row.snapshot{"up12":"325","total":"500","up6":"200","stale":"175","target":"70","gap":"+5.0"}|📊 Snapshot: 325/500 updated 12mo - 200/500 updated 6mo - 175 stale - target 70% (+5.0pp gap)|\n🔄 What-If: if 12mo freshness climbs to 80.0% (Excellent), 75 more articles reviewed (~10/mo cadence)\n⚖️ Break-Even: to hit 80.0% (Excellent), need 75 more articles reviewed; at 10/mo cadence = ~8 months\n🎯 Milestone: audit stale articles quarterly - products that change >2x/year need reviews every 6mo\n$calc_out.article_freshness.row.tip{"stale_pct":"35"}|💡 Tip: stale articles are the silent killer - 35% of KB has wrong info customers act on. Tag with last-reviewed date. Pair with [Deflection Quality] (K-4) - fresh articles drive lower reopen.|',
  ],
  faq: [
    { q: 'What is "article freshness"?', a: 'The % of KB articles updated within the last 12 months. Stale articles contain outdated steps, screenshots, or product behavior - customers following them hit dead ends and reopen tickets. NN/g recommends 70%+ as the mature target.' },
    { q: 'Why 12mo, not 6mo?', a: '12mo is the industry-standard review window (NN/g + Intercom Help Center). 6mo is a secondary cadence metric - useful for fast-moving products. The health band is driven by the 12mo figure to avoid penalizing stable products.' },
    { q: 'How do I track last-updated?', a: 'Most KB platforms (Document360, Zendesk Guide, Intercom Articles) auto-track last-updated date. If manual, add a Last reviewed: YYYY-MM-DD footer discipline. Set a 12mo reminder cron for the review queue.' },
    { q: 'Does this pair with K-4 Deflection Quality?', a: 'Yes - K-4 measures ticket reopen rate (proxy for content quality). Stale articles (low K-2) cause reopen spikes. Audit stale FIRST when K-4 reopens climb.' },
    { q: 'What if my product changes monthly?', a: 'Aim for 6mo cadence instead of 12mo. Track both rates (12mo is the band driver; 6mo is informational). If 6mo drops below 12mo x 0.5, your editorial review backlog is the bottleneck.' },
    { q: 'Why does K-2 use gap_pct instead of an absolute target band?', a: 'Target is customer-set (varies by company maturity). The 4 health bands are HARD thresholds (>=80/55/40%) - gap_pct is informational only, shown in Snapshot. This matches P9-5 customer-health-score pattern.' },
    { q: "How often should I update knowledge base articles?", a: "Decay rates vary by topic: stable topics (how-to, processes) every 6-12 months. News/regulatory/legal: monthly. Tech/software: quarterly. Best practice: track view count + last updated. If an article has >1000 views and hasn't been updated in 12 months, refresh. Set calendar reminders for top 100 articles annually." },
    { q: "What is the cost of stale content?", a: "Stale content causes: 1) Self-service failure (users search, find outdated, create ticket), 2) Trust loss (users doubt accuracy of all content), 3) Increased support cost ($10-25 per ticket), 4) Wrong decisions by users. Cost per stale article: $100-1000/year in support tickets. Top 100 articles: $10K-100K/year impact. Update quarterly." },
    { q: "How do I identify stale articles?", a: "Track: 1) Last updated date, 2) View count trend (declining = users don't trust), 3) \"Was this helpful?\" feedback (low ratings = stale), 4) Ticket creation after view (high = answer is wrong). Use analytics: Google Analytics for help center. Score: views × age × feedback. Update top scorers first." },
    { q: "How do I prioritize KB updates?", a: "Prioritize: 1) High-traffic articles (top 20 = 80% of views), 2) Recently changed features (release notes), 3) High-ticket creation (article drives tickets), 4) Low ratings (users frustrated), 5) Compliance/regulatory changes. Spend 1-2 hours/week on updates. Track update velocity. Aim: 5-10% of articles refreshed monthly." },
    { q: "What is the half-life of a knowledge base article?", a: "Half-life: time until article is \"half stale.\" By topic: software docs 6-12 months, regulatory 6-12 months, business processes 12-24 months, evergreen concepts 24-60 months. Most relevant recent update survives best. The first 6 months after a feature launch is the freshness window. Update aggressively during this period." },
    { q: "How do I structure articles for longevity?", a: "Best practices: 1) Date of last update at top, 2) Version/last-reviewed date, 3) \"Applies to: v2.3+\" labels, 4) Screenshots with version labels, 5) Steps that are not version-specific, 6) \"Last updated by [name], [date]\" footer. Self-archiving content (older versions) preserves history. Avoid: copy-paste from old docs without review." },
    { q: "What is the ROI of knowledge base freshness?", a: "Investment: 1-2 hours/week per author. Returns: 1) 20-50% reduction in support tickets, 2) Higher self-service deflection, 3) Better CSAT (users find current info), 4) SEO traffic (fresh content ranks). For a 10K-ticket/month support org: $20K-50K/year saved. Author cost: $5K-15K/year. ROI: 3-10x." },
    { q: "How do I automate article freshness?", a: "Automation: 1) Auto-archive articles with no views in 6 months, 2) Auto-flag articles older than 12 months for review, 3) AI detects outdated screenshots / terms, 4) Auto-suggest related articles to update when feature changes, 5) Email quarterly digest of articles to update. Most teams: 50%+ automation coverage in 6 months." },
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
  engineKey: true,
};
registerEngine(engine);
