// P10-5 Time-to-Value (TTV)
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS PM persona ($10M-$50M ARR).
// Community-wisdom thresholds (Intercom Onboarding Benchmarks + Buffer Growth Team).
//
// INVERSE BAND DIRECTION: lower TTV = better.
// P9-4 lesson applied: lower_is_better uses <= comparison (NOT >=).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-15：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 两端逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

export const HEALTH_BANDS = {
  excellent: { threshold: 1,    label: '🟢 Excellent', message: 'Lightning-fast aha-moment - users see value within their first session.' },
  good:      { threshold: 3,    label: '🟡 Good',      message: 'Fast TTV - users reach aha within a few days. Strong onboarding.' },
  warning:   { threshold: 7,    label: '🟠 Warning',   message: 'Slow TTV - users take up to a week to find value. Optimize the first-run experience.' },
  critical:  { threshold: Infinity, label: '🔴 Critical', message: 'Very slow TTV - users wait more than a week. Major activation risk.' },
};

export function calcHealthBand(days: number): 'excellent' | 'good' | 'warning' | 'critical' {
  // INVERSE direction (P9-4 lesson): lower = better
  if (days < 0) return 'critical';
  if (days <= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (days <= HEALTH_BANDS.good.threshold) return 'good';
  if (days <= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtDays(n: number): string {
  if (n === 0) return '0 days (same-session)';
  if (n < 1) return (n * 24).toFixed(1) + ' hours';
  if (n === 1) return '1 day';
  if (n < 7) return n.toFixed(1) + ' days';
  if (n < 30) return n.toFixed(0) + ' days (~' + (n / 7).toFixed(1) + ' weeks)';
  return n.toFixed(0) + ' days (~' + (n / 30).toFixed(1) + ' months)';
}

// customFn: minimal live calc. Prepend cnn alias to defensively clamp inputs to [0, ∞).
const customFn =
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let s=function(t){return Number.isNaN(t)?0:Math.max(0,t)},u=function(t){return t<0?"critical":t<=l.excellent.threshold?"excellent":t<=l.good.threshold?"good":t<=l.warning.threshold?"warning":"critical"},c=function(t){return t===0?"0 days (same-session)":t<1?(t*24).toFixed(1)+" hours":t===1?"1 day":t<7?t.toFixed(1)+" days":t<30?t.toFixed(0)+" days (~"+(t/7).toFixed(1)+" weeks)":t.toFixed(0)+" days (~"+(t/30).toFixed(1)+" months)"},d=function(t,r,n){var o=g(t);return Array.isArray(o)?o.join(\`
\`):String(o)};var m=s,v=u,w=c,y=d,e=tk,h='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',e=new Function("return "+h)(),l={excellent:{threshold:1,label:"🟢 Excellent",message:"Lightning-fast aha-moment - users see value within their first session."},good:{threshold:3,label:"🟡 Good",message:"Fast TTV - users reach aha within a few days. Strong onboarding."},warning:{threshold:7,label:"🟠 Warning",message:"Slow TTV - users take up to a week to find value. Optimize the first-run experience."},critical:{threshold:null,label:"🔴 Critical",message:"Very slow TTV - users wait more than a week. Major activation risk."}},g=function(t){const r=s(Number(t.median_days));let n=s(Number(t.p90_days));if(r<0||n<0)return[e("calc_out.time_to_value.row.error_days_negative","Days must be >= 0.")];n<r&&(n=r);const o=u(r),p=n-r,a=c(r),i=c(n),_=p.toFixed(1),f=o==="excellent"?e("calc_out.time_to_value.row.ttv_excellent","🟢 Excellent (median "+a+", p90 "+i+")",{median:a,p90:i}):o==="good"?e("calc_out.time_to_value.row.ttv_good","🟡 Good (median "+a+", p90 "+i+")",{median:a,p90:i}):o==="warning"?e("calc_out.time_to_value.row.ttv_warning","🟠 Warning (median "+a+", p90 "+i+")",{median:a,p90:i}):e("calc_out.time_to_value.row.ttv_critical","🔴 Critical (median "+a+", p90 "+i+")",{median:a,p90:i});return[e("calc_out.label.time_to_value","Time-to-Value")+": "+f,e("calc_out.label.snapshot","Snapshot")+": "+e("calc_out.time_to_value.row.snapshot_detail","50% of users reach the aha-moment in "+a+". 90% do within "+i+". Long-tail gap: "+_+" days.",{median:a,p90:i,gap:_}),e("calc_out.time_to_value.row.whatif_cut_one_day","What-If: cutting the first milestone by 1 day typically improves activation rate by +8 to +12 percentage points (each day saved = more users reach aha within window)"),e("calc_out.time_to_value.row.break_even_good","Break-Even: to hit Good (median <=3 days), focus the onboarding flow on the single most important first action; remove any steps that delay aha beyond day 3"),e("calc_out.time_to_value.row.milestone_p50_first","Milestone: reduce p50 first (widest impact across users), then close the long-tail gap by tackling p90-causing frictions (e.g. complex initial setup)"),e("calc_out.time_to_value.row.tip_pair_activation","Tip: Faster TTV = higher activation = higher retention. Pair with the Activation Rate Calculator and Customer Health Score (P9 batch).")]};return[d(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

const engine: ToolEngine = {
  slug: 'solopreneur-time-to-value-calculator',
  title: 'Time-to-Value (TTV)',
  description:
    'Compute the median (p50) and p90 days from signup to key action (aha-moment). The PM metric for diagnosing onboarding speed. INVERSE health bands - lower is better: green <=1 day · yellow 1-3 days · orange 3-7 days · red >7 days. For mid-market B2B SaaS ($10M-$50M ARR) product managers.',
  categoryId: 'P',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'median_days', label: 'Median TTV in days (p50)', placeholder: 'e.g. 2', type: 'number' },
    { name: 'p90_days',    label: 'p90 TTV in days (long tail)', placeholder: 'e.g. 5', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
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
    const p50 = clampNonNegative(Number(inputs['median_days']));
    let p90 = clampNonNegative(Number(inputs['p90_days']));
    if (p50 < 0 || p90 < 0) return [makeToken('calc_out.time_to_value.row.error_days_negative', 'Days must be >= 0.')];
    if (p90 < p50) p90 = p50;
    const band = calcHealthBand(p50);
    const gap = p90 - p50;

    // P168 B3-15：params 的表达式与兜底里的表达式必须**同源** ⇒ 先用局部变量承接
    const medianLabel = fmtDays(p50);
    const p90Label = fmtDays(p90);
    const gapLabel = gap.toFixed(1);

    // P168 B3-15：健康度 4 档各写一个 code 字面量（静态扫描认得出 ⇒ 不许动态拼码）
    const bandRow =
      band === 'excellent'
        ? makeToken('calc_out.time_to_value.row.ttv_excellent', '🟢 Excellent (median ' + medianLabel + ', p90 ' + p90Label + ')', { median: medianLabel, p90: p90Label })
        : band === 'good'
        ? makeToken('calc_out.time_to_value.row.ttv_good', '🟡 Good (median ' + medianLabel + ', p90 ' + p90Label + ')', { median: medianLabel, p90: p90Label })
        : band === 'warning'
        ? makeToken('calc_out.time_to_value.row.ttv_warning', '🟠 Warning (median ' + medianLabel + ', p90 ' + p90Label + ')', { median: medianLabel, p90: p90Label })
        : makeToken('calc_out.time_to_value.row.ttv_critical', '🔴 Critical (median ' + medianLabel + ', p90 ' + p90Label + ')', { median: medianLabel, p90: p90Label });

    return [
      makeToken('calc_out.label.time_to_value', 'Time-to-Value') + ': ' + bandRow,
      makeToken('calc_out.label.snapshot', 'Snapshot') + ': ' + makeToken('calc_out.time_to_value.row.snapshot_detail', '50% of users reach the aha-moment in ' + medianLabel + '. 90% do within ' + p90Label + '. Long-tail gap: ' + gapLabel + ' days.', { median: medianLabel, p90: p90Label, gap: gapLabel }),
      makeToken('calc_out.time_to_value.row.whatif_cut_one_day', 'What-If: cutting the first milestone by 1 day typically improves activation rate by +8 to +12 percentage points (each day saved = more users reach aha within window)'),
      makeToken('calc_out.time_to_value.row.break_even_good', 'Break-Even: to hit Good (median <=3 days), focus the onboarding flow on the single most important first action; remove any steps that delay aha beyond day 3'),
      makeToken('calc_out.time_to_value.row.milestone_p50_first', 'Milestone: reduce p50 first (widest impact across users), then close the long-tail gap by tackling p90-causing frictions (e.g. complex initial setup)'),
      makeToken('calc_out.time_to_value.row.tip_pair_activation', 'Tip: Faster TTV = higher activation = higher retention. Pair with the Activation Rate Calculator and Customer Health Score (P9 batch).'),
    ];
  },
  staticExamples: [
    '$calc_out.label.time_to_value|Time-to-Value|: $calc_out.time_to_value.row.ttv_good{"median":"2.0 days","p90":"5.0 days"}|🟡 Good (median 2.0 days, p90 5.0 days)|\n$calc_out.label.snapshot|Snapshot|: $calc_out.time_to_value.row.snapshot_detail{"median":"2.0 days","p90":"5.0 days","gap":"3.0"}|50% of users reach the aha-moment in 2.0 days. 90% do within 5.0 days. Long-tail gap: 3.0 days.|\n$calc_out.time_to_value.row.whatif_cut_one_day|What-If: cutting the first milestone by 1 day typically improves activation rate by +8 to +12 percentage points (each day saved = more users reach aha within window)|\n$calc_out.time_to_value.row.break_even_good|Break-Even: to hit Good (median <=3 days), focus the onboarding flow on the single most important first action; remove any steps that delay aha beyond day 3|\n$calc_out.time_to_value.row.milestone_p50_first|Milestone: reduce p50 first (widest impact across users), then close the long-tail gap by tackling p90-causing frictions (e.g. complex initial setup)|\n$calc_out.time_to_value.row.tip_pair_activation|Tip: Faster TTV = higher activation = higher retention. Pair with the Activation Rate Calculator and Customer Health Score (P9 batch).|',
  ],
  faq: [
    { q: 'What is TTV (Time-to-Value)?', a: 'The time from signup (or first session) to the moment the user reaches their first "aha" - the action that correlates with retention. Lower = better.' },
    { q: 'What does p50 / p90 mean?', a: 'p50 = median, half of users reach aha within this many days. p90 = 90% of users reach aha within this many days. The gap reveals long-tail friction.' },
    { q: 'Why is the band INVERSE (lower = better)?', a: 'Because lower TTV is universally better for retention. Unlike NRR / Adoption where higher = better, TTV follows the opposite direction. Bands: green <=1d · yellow 1-3d · orange 3-7d · red >7d.' },
    { q: 'What is a "good" TTV?', a: 'Intercom benchmarks: B2B SaaS should aim for p50 <= 3 days. Consumer / mobile should aim for same-session (p50 <= 1 hour). World-class: p50 <= 1 hour for PLG products.' },
    { q: 'How is TTV different from Time-to-First-Action?', a: 'TTFA = first click/key event (low bar). TTV = the moment user perceives value (high bar, correlates with retention). Optimize TTV, not TTFA.' },
    { q: 'What if p90 < p50 in inputs?', a: 'Indicates a data error (p90 should always be >= p50). The engine clamps p90 to p50 to prevent artifact-based misreporting.' },
    { q: "What is time-to-value (TTV)?", a: "TTV = time from signup to first meaningful value. For Slack: team sends 2000 messages. For Dropbox: file uploaded. For SaaS: first activation event. Benchmarks: 1) Best-in-class: <5 minutes, 2) Good: <1 hour, 3) Average: <1 day, 4) Bad: >1 day. TTV is the #1 driver of activation and retention. Optimize aggressively. Most: <1 hour is achievable." },
    { q: "How do I reduce time-to-value?", a: "1) Pre-onboard (laptop, accounts, docs before day 1), 2) Reduce steps (cut signup form fields), 3) Default settings (use smart defaults), 4) Sample data (so users see value), 5) Guided tour (5-step interactive), 6) One-click setup. Most teams 50-70% TTV reduction in 3-6 months. Best option: cut to <5 minutes for SaaS. Major retention lift: 30-50%." },
    { q: "What is the difference between TTV and time-to-first-action?", a: "TTV: time to value moment. TFA: time to first click/use. TFA < TTV (e.g., first click at 1 minute, TTV at 5 minutes). Track both. TFA is leading indicator. TTV is lagging. Optimize TFA first (faster wins). Then TTV. Most products: 80% of TTV is TFA. The \"value moment\" varies per product. Test: identify the magic moment, then optimize time to it." },
    { q: "How do I find my value moment?", a: "Process: 1) Survey retained users (\"when did the product click?\"), 2) Track cohort retention vs specific actions, 3) Find action with highest correlation to 30-day retention. The \"magic moment\" is the action users take that signals value. Examples: Slack: 2K team messages, Dropbox: 1 file in folder. Define clearly. Use in onboarding. Most products: 1-3 candidate moments." },
    { q: "Should I optimize TTV or TTV to first $?", a: "Different metrics. TTV to first value (free users): time to activation. TTV to first $ (paid): time to conversion. For SaaS: both matter. Free user TTV → activation → retention. Paid user TTV → revenue. Optimize: 1) TTV to activation (for free users), 2) TTV to paid (for trial users). Most teams: 5-10x ROI on TTV optimization. Magic: cut TTV to <5 min = 30% activation lift." },
    { q: "What is the relationship between TTV and churn?", a: "Strong correlation. Users who hit TTV in <1 hour: 2-3x lower churn. >24 hours: 5x higher churn. TTV is the leading indicator of churn. Optimize TTV: biggest impact on retention. Most teams 20-30% improvement in TTV = 10-15% churn reduction. Track TTV by cohort. Cut long TTV (long-tail users). The first 24 hours matter most." },
    { q: "How do I measure TTV accurately?", a: "Method: 1) Define value event clearly, 2) Track time from signup to event, 3) Use timestamp data, 4) Calculate distribution (median, p90). Tools: Mixpanel, Amplitude, Heap, PostHog. Track per cohort. Watch the long tail. Most: median is best metric (mean is skewed by long tail). Aim: p90 <30 minutes. Optimize for the slow end." },
    { q: "What if my product is complex with long TTV?", a: "Complex products (B2B, enterprise): 1-7 days TTV is acceptable. Tactics: 1) Pre-onboarding (sales/CS sets up), 2) Templates, 3) Onboarding calls, 4) Self-serve wizards. For B2C: TTV should be <1 hour. Enterprise: 1-7 days is fine if delivered value is high. Trade-off: longer TTV is OK if delivered value is high. Track cohort retention. Optimize TTV when it's a churn driver." },
  ],
  howToUse: [
    'Define your aha-moment (same as Activation Rate calc).',
    'Pull the per-user TTV for the period from your analytics tool - Mixpanel/Amplitude Cohorts report the median and p90 by cohort.',
    'Enter the p50 (median) and p90 days. Band reflects p50 - the average user experience.',
    'Look at the gap between p50 and p90 to identify long-tail friction (users who never quite get there).',
    'Optimize p50 first for widest impact; then close the p90 gap.',
  ],
  sources: [
    'https://www.intercom.com/blog/onboarding-benchmarks/',
    'https://buffer.com/resources/time-to-value',
    'https://www.lennysnewsletter.com/p/onboarding',
  ],
  engineKey: true,
};

registerEngine(engine);
