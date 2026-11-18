// P10-2 Feature Adoption Rate
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS PM persona ($10M-$50M ARR).
// Community-wisdom thresholds (Amplitude Product Benchmarks + Heap Product Analytics Survey).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-8：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

export const HEALTH_BANDS = {
  excellent: { threshold: 0.40, label: '🟢 Excellent', message: 'Broad feature appeal — the feature is core to the user experience.' },
  good:      { threshold: 0.20, label: '🟡 Good',      message: 'Healthy adoption; consider promoting deeper engagement among non-adopters.' },
  warning:   { threshold: 0.10, label: '🟠 Warning',   message: 'Niche adoption — most active users do not use this feature.' },
  critical:  { threshold: 0,    label: '🔴 Critical',  message: 'Dead feature — consider deprecation or repositioning.' },
};

export function featureAdoption(featureUsers: number, activeUsers: number): number {
  if (activeUsers <= 0) return 0;
  if (featureUsers >= activeUsers) return 1.0;
  return featureUsers / activeUsers;
}

export function calcHealthBand(rate: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (rate >= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (rate >= HEALTH_BANDS.good.threshold) return 'good';
  if (rate >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtPct(x: number): string { return (x * 100).toFixed(1) + '%'; }
function fmtInt(n: number): string { return Math.round(n).toLocaleString(); }

// customFn: 浏览器侧的同一份计算（P168 B3-8：与服务端 generate **逐字镜像**）。
// ⚠️ 客户端原本与服务端**漂移**：emoji 写成 GREEN/YELLOW 文字、Break-Even 写 20%（服务端 20.0%）、
//    What-If / Milestone / Tip 三整句不同 ⇒ 一律以**服务端**为准。
const customFn =
  // P168 B3-10: client = verbatim mirror of the server generate() (same logic, same order).
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let f=function(t){return Number.isNaN(t)?0:Math.max(0,t)},_=function(t,c){return c<=0?0:t>=c?1:t/c},h=function(t){return t>=a.excellent.threshold?"excellent":t>=a.good.threshold?"good":t>=a.warning.threshold?"warning":"critical"},i=function(t){return(t*100).toFixed(1)+"%"},e=function(t){return Math.round(t).toLocaleString()},g=function(t,c,n){var o=y(t);return Array.isArray(o)?o.join(\`
\`):String(o)};var j=f,W=_,C=h,N=i,O=e,P=g,r=tk,x='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',r=new Function("return "+x)(),a={excellent:{threshold:.4,label:"🟢 Excellent",message:"Broad feature appeal — the feature is core to the user experience."},good:{threshold:.2,label:"🟡 Good",message:"Healthy adoption; consider promoting deeper engagement among non-adopters."},warning:{threshold:.1,label:"🟠 Warning",message:"Niche adoption — most active users do not use this feature."},critical:{threshold:0,label:"🔴 Critical",message:"Dead feature — consider deprecation or repositioning."}},y=function(t){const c=f(Number(t.feature_users)),n=f(Number(t.active_users));if(n<=0)return[r("calc_out.feature_adoption.row.error_active_users_zero","Total active users must be > 0.")];const o=Math.min(c,n),u=_(o,n),s=h(u),F=a[s],b=t.WAU_vs_MAU||"WAU",p=Math.max(0,n-o),v=Math.ceil(n*a.good.threshold),w=Math.min(n,o+p*.1)/n,m=Math.max(0,Math.ceil(n*(u+.1))-o),M=i(u),l=F.label+" ("+M+" adoption)",d={pct:M},q=r(s==="excellent"?"calc_out.feature_adoption.row.band_excellent":s==="good"?"calc_out.feature_adoption.row.band_good":s==="warning"?"calc_out.feature_adoption.row.band_warning":"calc_out.feature_adoption.row.band_critical",l,d);return[r("calc_out.label.feature_adoption","Feature Adoption")+": "+q,r("calc_out.label.snapshot","Snapshot")+": "+r("calc_out.feature_adoption.row.snapshot_detail",e(o)+" of "+e(n)+" "+b+" users used this feature. Non-adopters: "+e(p),{feature_users:e(o),active_users:e(n),denom:b,non_adopters:e(p)}),r("calc_out.feature_adoption.row.whatif_convert_10pct","What-If: if 10% of non-adopters convert this quarter, adoption rises to "+i(w),{lifted:i(w)}),r("calc_out.feature_adoption.row.break_even_target","Break-Even: to hit Good ("+i(a.good.threshold)+" adoption), need at least "+v.toLocaleString()+" feature users (currently "+e(o)+")",{target_pct:i(a.good.threshold),target:v.toLocaleString(),current:e(o)}),r("calc_out.feature_adoption.row.milestone_plus_10pp","Milestone: lifting adoption by +10 percentage points requires "+e(m)+" more feature users (target "+e(Math.ceil(n*(u+.1)))+" from "+e(o)+")",{more:e(m),target:e(Math.ceil(n*(u+.1))),current:e(o)}),r("calc_out.feature_adoption.row.tip_activation_pairing",'Tip: Pair with the Activation Rate Calculator to distinguish adopted-but-inactive users from non-adopted — both look "stuck" but require different interventions.')]};return[g(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

const engine: ToolEngine = {
  slug: 'solopreneur-feature-adoption-calculator',
  title: 'Feature Adoption Rate',
  description:
    'Compute feature adoption as % of active users (WAU or MAU) — the PM metric for measuring how many users actually use a specific feature. Health bands: green >=40% · yellow 20-40% · orange 10-20% · red <10%. For mid-market B2B SaaS ($10M-$50M ARR) product managers.',
  categoryId: 'P',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'feature_users', label: 'Users using this feature in period', placeholder: 'e.g. 750', type: 'number' },
    { name: 'active_users',  label: 'Total active users in period',       placeholder: 'e.g. 3000', type: 'number' },
    { name: 'WAU_vs_MAU',    label: 'Active-user window',                  type: 'select',
      options: ['WAU', 'MAU'],
      default: 'WAU' },
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
    const fu = clampNonNegative(Number(inputs['feature_users']));
    const au = clampNonNegative(Number(inputs['active_users']));
    if (au <= 0) return [makeToken('calc_out.feature_adoption.row.error_active_users_zero', 'Total active users must be > 0.')];
    const cappedFu = Math.min(fu, au);
    const adoption = featureAdoption(cappedFu, au);
    const band = calcHealthBand(adoption);
    const bandInfo = HEALTH_BANDS[band];
    const denom = inputs['WAU_vs_MAU'] || 'WAU';
    const nonAdopters = Math.max(0, au - cappedFu);
    const targetFu = Math.ceil(au * HEALTH_BANDS.good.threshold);
    const liftedAdoption10 = Math.min(au, cappedFu + nonAdopters * 0.10) / au;
    const needMore = Math.max(0, Math.ceil(au * (adoption + 0.10)) - cappedFu);
    // ⚠️ band 决定 code 后缀 ⇒ 4 个 band code 必须**逐个写出字面量**（拼字符串 ⇒ 静态扫描器认不出）
    const ratePct = fmtPct(adoption);
    const bandFallback = bandInfo.label + ' (' + ratePct + ' adoption)';
    const bandParams = { pct: ratePct };
    const bandRow =
      band === 'excellent' ? makeToken('calc_out.feature_adoption.row.band_excellent', bandFallback, bandParams)
      : band === 'good' ? makeToken('calc_out.feature_adoption.row.band_good', bandFallback, bandParams)
      : band === 'warning' ? makeToken('calc_out.feature_adoption.row.band_warning', bandFallback, bandParams)
      : makeToken('calc_out.feature_adoption.row.band_critical', bandFallback, bandParams);
    return [
      makeToken('calc_out.label.feature_adoption', 'Feature Adoption') + ': ' + bandRow,
      makeToken('calc_out.label.snapshot', 'Snapshot') + ': ' + makeToken('calc_out.feature_adoption.row.snapshot_detail', fmtInt(cappedFu) + ' of ' + fmtInt(au) + ' ' + denom + ' users used this feature. Non-adopters: ' + fmtInt(nonAdopters), { feature_users: fmtInt(cappedFu), active_users: fmtInt(au), denom: denom, non_adopters: fmtInt(nonAdopters) }),
      makeToken('calc_out.feature_adoption.row.whatif_convert_10pct', 'What-If: if 10% of non-adopters convert this quarter, adoption rises to ' + fmtPct(liftedAdoption10), { lifted: fmtPct(liftedAdoption10) }),
      makeToken('calc_out.feature_adoption.row.break_even_target', 'Break-Even: to hit Good (' + fmtPct(HEALTH_BANDS.good.threshold) + ' adoption), need at least ' + targetFu.toLocaleString() + ' feature users (currently ' + fmtInt(cappedFu) + ')', { target_pct: fmtPct(HEALTH_BANDS.good.threshold), target: targetFu.toLocaleString(), current: fmtInt(cappedFu) }),
      makeToken('calc_out.feature_adoption.row.milestone_plus_10pp', 'Milestone: lifting adoption by +10 percentage points requires ' + fmtInt(needMore) + ' more feature users (target ' + fmtInt(Math.ceil(au * (adoption + 0.10))) + ' from ' + fmtInt(cappedFu) + ')', { more: fmtInt(needMore), target: fmtInt(Math.ceil(au * (adoption + 0.10))), current: fmtInt(cappedFu) }),
      makeToken('calc_out.feature_adoption.row.tip_activation_pairing', 'Tip: Pair with the Activation Rate Calculator to distinguish adopted-but-inactive users from non-adopted — both look "stuck" but require different interventions.'),
    ];
  },
  staticExamples: [
    '$calc_out.label.feature_adoption|Feature Adoption|: $calc_out.feature_adoption.row.band_good{"pct":"25.0%"}|🟡 Good (25.0% adoption)|\n$calc_out.label.snapshot|Snapshot|: $calc_out.feature_adoption.row.snapshot_detail{"feature_users":"750","active_users":"3,000","denom":"WAU","non_adopters":"2,250"}|750 of 3,000 WAU users used this feature. Non-adopters: 2,250|\n$calc_out.feature_adoption.row.whatif_convert_10pct{"lifted":"32.5%"}|What-If: if 10% of non-adopters convert this quarter, adoption rises to 32.5%|\n$calc_out.feature_adoption.row.break_even_target{"target_pct":"20.0%","target":"600","current":"750"}|Break-Even: to hit Good (20.0% adoption), need at least 600 feature users (currently 750)|\n$calc_out.feature_adoption.row.milestone_plus_10pp{"more":"300","target":"1,050","current":"750"}|Milestone: lifting adoption by +10 percentage points requires 300 more feature users (target 1,050 from 750)|\n$calc_out.feature_adoption.row.tip_activation_pairing|Tip: Pair with the Activation Rate Calculator to distinguish adopted-but-inactive users from non-adopted — both look "stuck" but require different interventions.|',
  ],
  faq: [
    { q: 'WAU or MAU — which denominator?', a: 'WAU shows feature engagement among weekly-active users (stickier test). MAU shows overall reach. Use WAU for engagement-decisions; MAU for reach-decisions.' },
    { q: 'When is a feature "dead"?', a: 'Amplitude / Heap benchmarks: <10% adoption of WAU over 2 consecutive quarters signals a dead feature. Below 5% (and no growth) suggests deprecation.' },
    { q: 'What if feature_users > active_users?', a: 'Counts from different periods or sampling. The engine caps feature_users at active_users to prevent >100% adoption artifacts.' },
    { q: 'How is "adoption" different from "usage frequency"?', a: 'Adoption = did they use it ever. Usage frequency = how often. A 25% adoption feature may have power-users using it daily.' },
    { q: 'When does adoption rate reset (period boundary)?', a: 'Compute monthly for stable products; weekly for fast-iteration. Pair with cohort analysis (P6 Cohort Retention Calculator) to distinguish new-adoption vs retained-adoption.' },
    { q: 'Should I remove low-adoption features?', a: 'Not always. If the feature supports power-users (high-LTV segment), small adoption can be high revenue. Cross-link with NRR / LTV calc (P9 Retention batch) before deprecation.' },
    { q: "What is feature adoption rate?", a: "Feature adoption = % of users who use a specific feature within a defined period. Benchmarks: 10-30% adoption in first 30 days is good for new features. Mature features: 30-60% adoption. Calculate: users_using_feature / total_users. By user type: power users adopt 2-3x faster. Track: adoption over time, segment by user attributes." },
    { q: "How do I launch a feature for high adoption?", a: "1) In-app announcement (5-10x lift vs email), 2) Onboarding flow integration, 3) Default-on (controversial but effective), 4) Email + push + in-app combo, 5) Sales/CSM enablement, 6) Tutorial overlay. Most teams 5-15% adoption in first 30 days. 30-50% in 30 days. Best option: integrate into existing flow (not separate page)." },
    { q: "What is the difference between adoption and engagement?", a: "Adoption: % of users who try the feature (binary). Engagement: how often and deeply users use it. Examples: Slack: adopted = 50%, engaged = 30% (daily active in feature). Track adoption (breadth) + engagement (depth). High adoption + low engagement = surface-level use. Low adoption + high engagement = power-user feature. Best option: high in both." },
    { q: "How do I measure feature adoption accurately?", a: "Definition matters: 1) \"Tried\": any event in feature, 2) \"Activated\": completed key action, 3) \"Habitual\": used 3+ times in 7 days. Track: \"tried\" for launch, \"habitual\" for retention. Tools: Mixpanel, Amplitude, Heap, PostHog. Use unique user counts (not sessions). Compare to baseline. Most: define 1-3 metrics per feature. Update quarterly." },
    { q: "Should I focus on adoption or depth of use?", a: "Depends on feature goal. 1) Adoption-focused: features that drive value for everyone (e.g., search). 2) Depth-focused: features for power users (e.g., API, advanced settings). 3) Both: most features. Pattern: 80% adoption for universal features, 10-30% for advanced. Track both. Most teams: 80% of features optimize for adoption, 20% for depth." },
    { q: "How do I find features that drive retention?", a: "Process: 1) Track feature usage per cohort, 2) Correlate with 30/60/90 day retention, 3) Find features with high correlation. The \"magic features\" that drive retention often: 1) Are used early (day 1-7), 2) Are used repeatedly, 3) Are used in combination with others. Top features often correlate with 2-3x retention. Optimize: improve discoverability of magic features." },
    { q: "How do I handle features with low adoption?", a: "Decide: 1) Improve (better onboarding, in-app hints), 2) Deprecate (if not adding value), 3) Combine (merge with related feature), 4) Re-position (find the right audience). Before killing: 1) Survey power users, 2) Check revenue impact, 3) Test with cohorts. Some features have low adoption but high value (e.g., admin tools). Don't kill without data. 20-30% of features have <10% adoption." },
    { q: "How does feature adoption differ for B2B vs B2C?", a: "B2B: 1) Slower adoption (1-3 months vs 1-3 weeks), 2) Higher engagement (work tools used daily), 3) Admin-driven (workplace adoption), 4) Higher stakes (decisions affect teams). B2C: 1) Faster (viral, novelty), 2) Lower daily engagement, 3) User-driven, 4) Lower stakes. B2B adoption: 30-50% within 90 days is good. B2C: 30-50% within 30 days. Track per segment." },
  ],
  howToUse: [
    'Pick a feature you want to measure (one feature per analysis run).',
    'Pull feature_users count from your analytics tool (Mixpanel, Amplitude, Heap) — count of distinct users who triggered the feature event.',
    'Pull active_users count over the same period (WAU or MAU per the dropdown).',
    'Read the band: green/yellow/orange/red indicates adoption depth.',
    'For dead-feature remediation: pair with cohort analysis to see WHICH user segment ignores the feature.',
  ],
  sources: [
    'https://amplitude.com/blog/product-analytics-benchmarks',
    'https://heap.io/blog/product-adoption',
    'https://mixpanel.com/blog/feature-adoption/',
  ],
  engineKey: true,
};

registerEngine(engine);
