// P13-5 Documentation ROI
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS DevRel/Tech Writer persona ($10M-$50M ARR).
// Community-wisdom thresholds (TSIA 2024 Knowledge Management ROI + Zendesk CX Trends 2024 + Gartner Customer Service 2024).
// HIGHER on roi_pct: more return = better. Excellent band ALSO requires cost/article ≤ $50 (dual-condition);
// critical uses -Infinity. calcHealthBand takes roi in PERCENTAGE form (e.g. 180 = 180%).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-15：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 两端逐字节相同，不可能漂。
//   ⚠️ 兜底与 params **同源**（同一个局部变量）⇒ 英文页逐字不变（G9）、模板不冻结数值（G8）。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

export const HEALTH_BANDS = {
  excellent: { threshold: 4.0, label: 'Excellent', message: 'KB is a profit center.' },
  good:      { threshold: 1.5, label: 'Good',      message: 'KB pays for itself.' },
  warning:   { threshold: 0.5, label: 'Warning',   message: 'Marginal return — review spend.' },
  critical:  { threshold: -Infinity, label: 'Critical', message: 'KB spend exceeds savings.' },
};

export function grossSavings(deflected: number, costPer: number): number {
  return deflected * costPer;
}

// Returns the ROI as a DECIMAL ratio ((gross - kbCost) / kbCost). Multiply by 100 for percentage.
// Guards div-by-zero: kbCost <= 0 → -Infinity (falls to critical band).
export function netROI(gross: number, kbCost: number): number {
  return kbCost > 0 ? (gross - kbCost) / kbCost : -Infinity;
}

export function costPerArticle(kbCost: number, articles: number): number {
  return articles > 0 ? kbCost / articles : Infinity;
}

// roi is in PERCENTAGE form (180 = 180%). Excellent band is dual-condition:
// ROI ≥ 400% AND cost/article ≤ $50. If cost/article exceeds $50, falls back to 'good'.
export function calcHealthBand(roi: number, costPerArt?: number): keyof typeof HEALTH_BANDS {
  const roiDec = roi / 100;
  if (roiDec >= HEALTH_BANDS.excellent.threshold && (costPerArt === undefined || costPerArt <= 50)) return 'excellent';
  if (roiDec >= HEALTH_BANDS.good.threshold) return 'good';
  if (roiDec >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtMoney(x: number): string { return '$' + Math.round(x).toLocaleString(); }
function fmtMoney2(x: number): string { return '$' + x.toFixed(2); }
function fmtInt(x: number): string { return Math.round(x).toLocaleString(); }

const engine: ToolEngine = {
  slug: 'solopreneur-documentation-roi-calculator',
  title: 'Documentation ROI',
  description:
    'Calculate the ROI of your knowledge base: gross ticket-deflection savings minus KB team cost. HIGHER health bands — more return = better: 🟢 ROI ≥400% AND ≤$50/article · 🟡 ≥150% · 🟠 ≥50% · 🔴 <50%. For mid-market B2B SaaS ($10M-$50M ARR) DevRel Leads, Documentation Managers, and CS Ops leads.',
  inputs: [
    { name: 'kb_team_monthly_cost',      label: 'KB team monthly cost ($/mo)',   placeholder: 'e.g. 15000', type: 'number' },
    { name: 'deflected_tickets_monthly', label: 'Tickets deflected (per month)',  placeholder: 'e.g. 1750',  type: 'number' },
    { name: 'cost_per_ticket',           label: 'Cost per ticket ($)',            placeholder: 'e.g. 24',    type: 'number' },
    { name: 'articles_total',            label: 'Total KB articles',              placeholder: 'e.g. 500',   type: 'number' },
    { name: 'roi_target_pct',            label: 'ROI target (%)',                 placeholder: 'e.g. 500',   type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let c=function(t){return Number.isNaN(t)?0:Math.max(0,t)},h=function(t,e){return t*e},m=function(t,e){return e>0?(t-e)/e:-1/0},p=function(t,e){return e>0?t/e:1/0},_=function(t,e){const n=t/100;return n>=l.excellent.threshold&&(e===void 0||e<=50)?"excellent":n>=l.good.threshold?"good":n>=l.warning.threshold?"warning":"critical"},s=function(t){return"$"+Math.round(t).toLocaleString()},d=function(t){return"$"+t.toFixed(2)},r=function(t){return Math.round(t).toLocaleString()},v=function(t,e,n){var o=q(t);return Array.isArray(o)?o.join(\`
\`):String(o)};var V=c,X=h,Y=m,Z=p,T=_,A=s,H=d,tt=r,et=v,f=tk,G='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',f=new Function("return "+G)(),l={excellent:{threshold:4,label:"Excellent",message:"KB is a profit center."},good:{threshold:1.5,label:"Good",message:"KB pays for itself."},warning:{threshold:.5,label:"Warning",message:"Marginal return — review spend."},critical:{threshold:null,label:"Critical",message:"KB spend exceeds savings."}},q=function(t){const e=c(Number(t.kb_team_monthly_cost)||0),n=c(Number(t.deflected_tickets_monthly)||0),o=c(Number(t.cost_per_ticket)||0),b=c(Number(t.articles_total)||0),a=c(Number(t.roi_target_pct)||0),u=h(n,o),k=u-e,x=m(u,e),g=x*100,i=p(e,b),E=a-g,P=_(g,i),W=l[P],J=x>=4&&i>50?" — ROI excellent but "+d(i)+"/article >$50 caps it to Good":"",y=isFinite(g)?g.toFixed(0)+"%":"n/a",I=isFinite(i)?d(i):"n/a",O=(k>=0?"":"-")+"$"+Math.abs(Math.round(k)).toLocaleString(),F=o>0?5*e/o:0,K=F*o,z=K-e,Q=e*(1+a/100),w=o>0?Q/o:0,R=w-n,U=a>-100?u/(1+a/100):0,S=r(n),L=String(o),N=s(u),$=s(e),M=O,j=r(b),B=y,C=String(a)+"%",D=E.toFixed(0);return["🩺 Documentation ROI Health: "+W.label+" ("+y+" ROI · "+O+"/mo net savings · "+I+"/article/mo)"+J,f("calc_out.documentation_roi.row.snapshot","📊 Snapshot: "+S+" tickets deflected × $"+L+"/ticket = "+N+"/mo gross · minus "+$+"/mo KB cost = "+M+"/mo net · "+j+" articles · ROI "+B+" vs "+C+" target ("+D+"pp gap)",{deflected:S,cost_per:L,gross:N,kb_cost:$,net:M,articles:j,roi:B,target:C,gap:D}),"🔄 What-If: if deflection climbs to "+r(F)+"/mo (from "+r(n)+", see K-1 Coverage), gross = "+s(K)+"/mo, net = "+s(z)+"/mo, ROI hits 400% (Excellent)","⚖️ Break-Even: to hit your "+a+"% ROI target, deflect "+r(w)+"/mo ("+(R>=0?"+":"")+r(R)+"/mo) OR cut KB cost below "+s(U)+"/mo","🎯 Milestone: cost/article = "+I+"/mo across "+r(b)+" articles. Keep it ≤$50 as the KB scales — the Excellent band needs ROI ≥400% AND ≤$50/article.",f("calc_out.documentation_roi.row.tip","💡 Tip: ROI scales with deflection volume first. Grow coverage before cutting team cost — see [KB Coverage Rate] (K-1) to find gap topics that lift deflection.")]};return[v(inputs,pick,fill)]}finally{}
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
    const kbCost = clampNonNegative(Number(inputs.kb_team_monthly_cost) || 0);
    const deflected = clampNonNegative(Number(inputs.deflected_tickets_monthly) || 0);
    const costPer = clampNonNegative(Number(inputs.cost_per_ticket) || 0);
    const articles = clampNonNegative(Number(inputs.articles_total) || 0);
    const target = clampNonNegative(Number(inputs.roi_target_pct) || 0);
    const gross = grossSavings(deflected, costPer);
    const net = gross - kbCost;
    const roiDec = netROI(gross, kbCost);
    const roi = roiDec * 100;
    const costPerArt = costPerArticle(kbCost, articles);
    const gap = target - roi;
    const band = calcHealthBand(roi, costPerArt);
    const bandInfo = HEALTH_BANDS[band];
    const costWarn = (roiDec >= 4.0 && costPerArt > 50) ? ' — ROI excellent but ' + fmtMoney2(costPerArt) + '/article >$50 caps it to Good' : '';
    const roiStr = isFinite(roi) ? roi.toFixed(0) + '%' : 'n/a';
    const costPerArtStr = isFinite(costPerArt) ? fmtMoney2(costPerArt) : 'n/a';
    const netStr = (net >= 0 ? '' : '-') + '$' + Math.abs(Math.round(net)).toLocaleString();
    const excDeflected = costPer > 0 ? (5 * kbCost) / costPer : 0;
    const excGross = excDeflected * costPer;
    const excNet = excGross - kbCost;
    const targetGross = kbCost * (1 + target / 100);
    const targetDeflected = costPer > 0 ? targetGross / costPer : 0;
    const targetDelta = targetDeflected - deflected;
    const kbCostForTarget = target > -100 ? gross / (1 + target / 100) : 0;
    // P168 B3-15：Snapshot / Tip 两行令牌化 —— 兜底与 params 取**同一个局部变量**
    //   ⇒ 英文页逐字不变；locale 模板把该变量换成 {param} ⇒ 模板不冻结运行时数值。
    //   ⚠️ 命名空间必须精确等于 toolAlias(slug) = 'documentation_roi'（见 B3_15_BATCH）。
    const deflectedLabel = fmtInt(deflected);
    const costPerLabel = String(costPer);
    const grossLabel = fmtMoney(gross);
    const kbCostLabel = fmtMoney(kbCost);
    const netLabel = netStr;
    const articlesLabel = fmtInt(articles);
    const roiLabel = roiStr;
    // ⚠️ 默认输入下 articles 与 target 同为 500 ⇒ 运行时取值无法区分 ⇒
    //   target 的取值带上单位 '%'，两者才互不相同（模板 {target} 仍渲染成 "500%"）。
    const targetLabel = String(target) + '%';
    const gapLabel = gap.toFixed(0);
    return [
      '🩺 Documentation ROI Health: ' + bandInfo.label + ' (' + roiStr + ' ROI · ' + netStr + '/mo net savings · ' + costPerArtStr + '/article/mo)' + costWarn,
      makeToken(
        'calc_out.documentation_roi.row.snapshot',
        '📊 Snapshot: ' + deflectedLabel + ' tickets deflected × $' + costPerLabel + '/ticket = ' + grossLabel + '/mo gross · minus ' + kbCostLabel + '/mo KB cost = ' + netLabel + '/mo net · ' + articlesLabel + ' articles · ROI ' + roiLabel + ' vs ' + targetLabel + ' target (' + gapLabel + 'pp gap)',
        { deflected: deflectedLabel, cost_per: costPerLabel, gross: grossLabel, kb_cost: kbCostLabel, net: netLabel, articles: articlesLabel, roi: roiLabel, target: targetLabel, gap: gapLabel },
      ),
      '🔄 What-If: if deflection climbs to ' + fmtInt(excDeflected) + '/mo (from ' + fmtInt(deflected) + ', see K-1 Coverage), gross = ' + fmtMoney(excGross) + '/mo, net = ' + fmtMoney(excNet) + '/mo, ROI hits 400% (Excellent)',
      '⚖️ Break-Even: to hit your ' + target + '% ROI target, deflect ' + fmtInt(targetDeflected) + '/mo (' + (targetDelta >= 0 ? '+' : '') + fmtInt(targetDelta) + '/mo) OR cut KB cost below ' + fmtMoney(kbCostForTarget) + '/mo',
      '🎯 Milestone: cost/article = ' + costPerArtStr + '/mo across ' + fmtInt(articles) + ' articles. Keep it ≤$50 as the KB scales — the Excellent band needs ROI ≥400% AND ≤$50/article.',
      makeToken(
        'calc_out.documentation_roi.row.tip',
        '💡 Tip: ROI scales with deflection volume first. Grow coverage before cutting team cost — see [KB Coverage Rate] (K-1) to find gap topics that lift deflection.',
      ),
    ];
  },
  staticExamples: [
    '🩺 Documentation ROI Health: Good (180% ROI · $27,000/mo net savings · $30.00/article/mo)\n$calc_out.documentation_roi.row.snapshot{"deflected":"1,750","cost_per":"24","gross":"$42,000","kb_cost":"$15,000","net":"$27,000","articles":"500","roi":"180%","target":"500%","gap":"320"}|📊 Snapshot: 1,750 tickets deflected × $24/ticket = $42,000/mo gross · minus $15,000/mo KB cost = $27,000/mo net · 500 articles · ROI 180% vs 500% target (320pp gap)|\n🔄 What-If: if deflection climbs to 3,125/mo (from 1,750, see K-1 Coverage), gross = $75,000/mo, net = $60,000/mo, ROI hits 400% (Excellent)\n⚖️ Break-Even: to hit your 500% ROI target, deflect 3,750/mo (+2,000/mo) OR cut KB cost below $7,000/mo\n🎯 Milestone: cost/article = $30.00/mo across 500 articles. Keep it ≤$50 as the KB scales — the Excellent band needs ROI ≥400% AND ≤$50/article.\n$calc_out.documentation_roi.row.tip|💡 Tip: ROI scales with deflection volume first. Grow coverage before cutting team cost — see [KB Coverage Rate] (K-1) to find gap topics that lift deflection.|',
  ],
  faq: [
    { q: 'How is Documentation ROI calculated?', a: 'ROI = (net savings / KB team cost) × 100, where net savings = (tickets deflected × cost per ticket) − KB team monthly cost. Example: 1,750 tickets deflected × $24 = $42,000 gross savings − $15,000 KB cost = $27,000 net → ROI 180%. It answers "for every $1 spent on the KB, how many $ of support cost do we avoid?"' },
    { q: 'What counts as a "deflected ticket"?', a: 'A deflected ticket is a support contact that self-service (KB article, in-app search, chatbot) resolved before it became a live agent ticket. Most helpdesks (Zendesk, Intercom, Freshdesk) tag these or log KB clicks preceding session close. Pair with K-1 Coverage and P12-5 Deflection Rate to measure volume.' },
    { q: 'Why does the Excellent band need TWO conditions?', a: 'Excellent requires ROI ≥400% AND cost/article ≤$50/mo. High ROI alone can hide a bloated content operation — a KB with 5,000 rarely-read articles is expensive to maintain even if aggregate deflection is high. The dual-condition rewards lean, high-leverage content. If ROI ≥400% but cost/article >$50, the band caps at Good.' },
    { q: 'What cost per ticket should I use?', a: 'Use your blended fully-loaded cost — agent salary + tooling + overhead ÷ tickets handled. Mid-market B2B SaaS runs $15-$40/ticket (Zendesk 2024 benchmarks; Tier-1 ~$8, Tier-3 ~$70). If unknown, our Cost per Support Ticket calculator derives it from tier mix.' },
    { q: 'How do I improve Documentation ROI?', a: 'Two levers: raise deflection volume (grow coverage — see K-1 — and search effectiveness — see K-3) or lower cost per article (consolidate stale/duplicate content — see K-2 Freshness). Raising deflection is usually higher-leverage than cutting team cost, because deflection savings compound while cost cuts are one-time.' },
    { q: 'Why does P13-5 use 5 inputs when other KB calcs use 3-4?', a: 'ROI is a composite metric — it needs cost inputs (team cost, cost per ticket), a volume input (deflected tickets), a normalizer (articles_total for cost/article), and a target (roi_target_pct) for the Break-Even line. The other K calcs measure single ratios; ROI ties them together into dollars.' },
    { q: "How do I calculate the ROI of documentation?", a: "ROI = (support cost saved + product velocity gained) / (time invested in docs). Quantify: 1) Tickets deflected × cost per ticket, 2) Faster onboarding × salary, 3) Faster product adoption × revenue. 10K tickets × 30% deflection × $15 = $45K/year. 1 doc author × 25% time × $80K = $20K. Net ROI: $25K (125% ROI). Strong case." },
    { q: "What is the ROI of good documentation?", a: "Industry benchmarks: 3-10x ROI within 12 months. Drivers: 1) Reduced support tickets (40-60% reduction), 2) Faster onboarding (50% faster ramp), 3) Better product adoption (5-15% conversion lift), 4) Lower churn (5-10% reduction). Total: 3-10x return. Top performers: 20-50x. Investment pays back in 3-6 months typically." },
    { q: "How do I justify documentation investment to leadership?", a: "Frame in dollars: 1) Show ticket volume + cost: $300K/year in support, 2) Show deflection potential: 30% reduction = $90K/year saved, 3) Compare to doc cost: $30K/year (1 part-time author), 4) Net ROI: 3x. Add: faster onboarding, faster product adoption. Use case studies. Most CFOs: 3x ROI is auto-approved." },
    { q: "What is the cost of poor documentation?", a: "Poor docs cost: 1) Higher support cost (30-50% more tickets), 2) Slower onboarding (50% longer ramp time), 3) Lower product adoption (10-20% lower), 4) Higher churn (5-10% higher). For a 10K-customer SaaS: $500K-2M/year in lost revenue + support cost. Top 3 cost-cutting levers: docs, automation, processes." },
    { q: "How do I measure documentation quality?", a: "Metrics: 1) Avg time-to-find-answer (target <2 min), 2) Articles found via search (target 80%+), 3) Helpful rating per article (target 80%+), 4) Ticket creation after view (target <20%), 5) Coverage (% of features documented). Use HelpScout, Document360, or similar. Track monthly. Improve lowest metrics first." },
    { q: "How do I scale documentation as the product grows?", a: "Stages: 1) Founder-written (0-100 users), 2) Dedicated writer (100-1000 users), 3) Documentation team + engineers (1000-10000 users), 4) Documentation platform + contributors (10000+). Cost: 1 FTE per 50-100 articles maintained. Tooling: docs-as-code (Hugo, Docusaurus), versioning, AI-assisted writing." },
    { q: "Should I use AI for documentation?", a: "Yes. AI helps: 1) Draft initial articles (50% faster), 2) Update based on product changes (auto-flag), 3) Translate content (5x faster), 4) Generate code examples, 5) Summarize PRs into release notes. Caution: edit heavily (AI errors are noticeable). Top teams: 30-50% doc productivity boost with AI. Use AI for first drafts, human for polish." },
    { q: "How do I make documentation a priority in my org?", a: "Tactics: 1) Tie docs to release (no PR merged without docs), 2) Doc reviews in PR process, 3) Doc quality in OKRs, 4) Doc appreciation (highlight good docs), 5) Doc audits (quarterly). Make docs a part of \"definition of done.\" Billing: 5-10% of eng time on docs. Top performers: 15-20%. Document the cost of NOT having docs." },
  ],
  howToUse: [
    'Enter KB team monthly cost — fully-loaded cost of writers, tools (Zendesk Guide, Document360), and overhead attributable to the KB.',
    'Enter tickets deflected per month — self-service resolutions before a live ticket (pull from helpdesk deflection tags or P12-5 Deflection Rate).',
    'Enter cost per ticket — blended fully-loaded agent cost per handled ticket (mid-market: $15-$40).',
    'Enter total KB articles — admin count from your KB platform (drives cost/article).',
    'Enter your ROI target % — internal goal for the Break-Even line (default 500%).',
    'Read the ROI band — 🟢 Excellent ≥400% AND ≤$50/article · 🟡 Good ≥150% · 🟠 Warning ≥50% · 🔴 Critical <50%.',
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
