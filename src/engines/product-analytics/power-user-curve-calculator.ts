// P10-6 Power User Pareto Curve
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS PM persona ($10M-$50M ARR).
// Community-wisdom thresholds (Andrew Chen "The Cold Start Problem" + Pareto 70/20 anchor).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-15：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 两端逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

export const HEALTH_BANDS = {
  excellent: { threshold: 3.5, label: '🟢 Excellent', message: 'Strong power-user concentration — top users drive disproportionate usage.' },
  good:      { threshold: 3.0, label: '🟡 Good',      message: 'Healthy Pareto distribution; power users exist and are visible.' },
  warning:   { threshold: 2.5, label: '🟠 Warning',   message: 'Diffuse usage — no strong power-user tier emerging.' },
  critical:  { threshold: 0,   label: '🔴 Critical',  message: 'Very even distribution — usage spread across all users, no power-user leverage.' },
};

export function paretoRatio(topShare: number, topPct: number): number {
  if (topPct <= 0 || topPct > 100) return 0;
  const capped = Math.min(topShare, 100);
  return capped / topPct;
}

export function calcHealthBand(ratio: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (ratio >= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (ratio >= HEALTH_BANDS.good.threshold) return 'good';
  if (ratio >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtRatio(r: number): string {
  return r.toFixed(2) + 'x';
}

// customFn: minimal live calc. Prepend cnn alias to defensively clamp inputs to [0, ∞).
const customFn =
    // P168 B3-10: client = verbatim mirror of the server generate() (same logic, same order). +
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let l=function(e){return Number.isNaN(e)?0:Math.max(0,e)},_=function(e,t){return t<=0||t>100?0:Math.min(e,100)/t},g=function(e){return e>=i.excellent.threshold?"excellent":e>=i.good.threshold?"good":e>=i.warning.threshold?"warning":"critical"},u=function(e){return e.toFixed(2)+"x"},h=function(e,t,n){var c=m(e);return Array.isArray(c)?c.join(\`
\`):String(c)};var C=l,P=_,q=g,L=u,M=h,r=tk,F='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',r=new Function("return "+F)(),i={excellent:{threshold:3.5,label:"🟢 Excellent",message:"Strong power-user concentration — top users drive disproportionate usage."},good:{threshold:3,label:"🟡 Good",message:"Healthy Pareto distribution; power users exist and are visible."},warning:{threshold:2.5,label:"🟠 Warning",message:"Diffuse usage — no strong power-user tier emerging."},critical:{threshold:0,label:"🔴 Critical",message:"Very even distribution — usage spread across all users, no power-user leverage."}},m=function(e){const t=l(Number(e.top_pct));let n=l(Number(e.top_pct_usage_share));if(t<=0||t>100)return[r("calc_out.power_user_curve.row.error_top_pct","Top percent must be 1-100.")];n>100&&(n=100);const c=_(n,t),p=g(c),d=Math.min(100,n+(100-n)*.1),S=(t*i.good.threshold).toFixed(1),s=u(c),o=n.toFixed(1),a=t.toFixed(1),f=(100-t).toFixed(1),w=(100-n).toFixed(1),b=d.toFixed(1),v=u(d/t),x=u(i.good.threshold),y=S,j=p==="excellent"?r("calc_out.power_user_curve.row.concentration_excellent","🟢 Excellent ("+s+" ratio — "+o+"/"+a+")",{ratio:s,share:o,pct:a}):p==="good"?r("calc_out.power_user_curve.row.concentration_good","🟡 Good ("+s+" ratio — "+o+"/"+a+")",{ratio:s,share:o,pct:a}):p==="warning"?r("calc_out.power_user_curve.row.concentration_warning","🟠 Warning ("+s+" ratio — "+o+"/"+a+")",{ratio:s,share:o,pct:a}):r("calc_out.power_user_curve.row.concentration_critical","🔴 Critical ("+s+" ratio — "+o+"/"+a+")",{ratio:s,share:o,pct:a});return[r("calc_out.label.power_user_concentration","Power User Concentration")+": "+j,r("calc_out.label.snapshot","Snapshot")+": "+r("calc_out.power_user_curve.row.snapshot_detail","top "+a+"% of users drive "+o+"% of total usage. The remaining "+f+"% of users account for "+w+"% of usage.",{top:a,share:o,rest_users:f,rest_share:w}),r("calc_out.power_user_curve.row.whatif_upgrade_10pct","What-If: if 10% of mid-tier users upgrade their engagement to power-user level, share rises to "+b+"% (ratio lifts to "+v+")",{share:b,ratio:v}),r("calc_out.power_user_curve.row.break_even_good","Break-Even: to hit Good ("+x+" ratio), need top "+a+"% users driving at least "+y+"% of usage (currently "+o+"%)",{ratio:x,top:a,target:y,current:o}),r("calc_out.power_user_curve.row.milestone_programs","Milestone: power-user programs (VIP support, beta features, dedicated CSM) can amplify existing concentration by +5-15 percentage points in usage share within 1 quarter"),r("calc_out.power_user_curve.row.tip_pair_nrr","Tip: Power users are the seed for referrals and product feedback. Pair with the NRR Calculator (P9 batch) to project revenue impact.")]};return[h(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

const engine: ToolEngine = {
  slug: 'solopreneur-power-user-curve-calculator',
  title: 'Power User Pareto Curve',
  description:
    'Compute the Pareto ratio of power-user concentration: top X% of users driving Y% of total usage. Canonical 70/20 = 3.5x. Higher = more concentrated (more leverage for power-user programs). For mid-market B2B SaaS ($10M-$50M ARR) product managers.',
  categoryId: 'P',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'top_pct',             label: 'Top % of users by activity',          placeholder: 'e.g. 20', type: 'number' },
    { name: 'top_pct_usage_share', label: '% of total usage from those users',   placeholder: 'e.g. 70', type: 'number' },
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
    const topPct = clampNonNegative(Number(inputs['top_pct']));
    let topShare = clampNonNegative(Number(inputs['top_pct_usage_share']));
    if (topPct <= 0 || topPct > 100) return [makeToken('calc_out.power_user_curve.row.error_top_pct', 'Top percent must be 1-100.')];
    if (topShare > 100) topShare = 100;
    const ratio = paretoRatio(topShare, topPct);
    const band = calcHealthBand(ratio);
    const l10share = Math.min(100, topShare + (100 - topShare) * 0.10);
    const targetShare = (topPct * HEALTH_BANDS.good.threshold).toFixed(1);

    // P168 B3-15：params 的表达式与兜底里的表达式必须**同源** ⇒ 先用局部变量承接
    const ratioLabel = fmtRatio(ratio);
    const topShareLabel = topShare.toFixed(1);
    const topPctLabel = topPct.toFixed(1);
    const restUsersLabel = (100 - topPct).toFixed(1);
    const restShareLabel = (100 - topShare).toFixed(1);
    const liftShareLabel = l10share.toFixed(1);
    const liftRatioLabel = fmtRatio(l10share / topPct);
    const goodRatioLabel = fmtRatio(HEALTH_BANDS.good.threshold);
    const targetShareLabel = targetShare;

    // P168 B3-15：健康度 4 档各写一个 code 字面量（静态扫描认得出 ⇒ 不许动态拼码）
    const bandRow =
      band === 'excellent'
        ? makeToken('calc_out.power_user_curve.row.concentration_excellent', '🟢 Excellent (' + ratioLabel + ' ratio — ' + topShareLabel + '/' + topPctLabel + ')', { ratio: ratioLabel, share: topShareLabel, pct: topPctLabel })
        : band === 'good'
        ? makeToken('calc_out.power_user_curve.row.concentration_good', '🟡 Good (' + ratioLabel + ' ratio — ' + topShareLabel + '/' + topPctLabel + ')', { ratio: ratioLabel, share: topShareLabel, pct: topPctLabel })
        : band === 'warning'
        ? makeToken('calc_out.power_user_curve.row.concentration_warning', '🟠 Warning (' + ratioLabel + ' ratio — ' + topShareLabel + '/' + topPctLabel + ')', { ratio: ratioLabel, share: topShareLabel, pct: topPctLabel })
        : makeToken('calc_out.power_user_curve.row.concentration_critical', '🔴 Critical (' + ratioLabel + ' ratio — ' + topShareLabel + '/' + topPctLabel + ')', { ratio: ratioLabel, share: topShareLabel, pct: topPctLabel });

    return [
      makeToken('calc_out.label.power_user_concentration', 'Power User Concentration') + ': ' + bandRow,
      makeToken('calc_out.label.snapshot', 'Snapshot') + ': ' + makeToken('calc_out.power_user_curve.row.snapshot_detail', 'top ' + topPctLabel + '% of users drive ' + topShareLabel + '% of total usage. The remaining ' + restUsersLabel + '% of users account for ' + restShareLabel + '% of usage.', { top: topPctLabel, share: topShareLabel, rest_users: restUsersLabel, rest_share: restShareLabel }),
      makeToken('calc_out.power_user_curve.row.whatif_upgrade_10pct', 'What-If: if 10% of mid-tier users upgrade their engagement to power-user level, share rises to ' + liftShareLabel + '% (ratio lifts to ' + liftRatioLabel + ')', { share: liftShareLabel, ratio: liftRatioLabel }),
      makeToken('calc_out.power_user_curve.row.break_even_good', 'Break-Even: to hit Good (' + goodRatioLabel + ' ratio), need top ' + topPctLabel + '% users driving at least ' + targetShareLabel + '% of usage (currently ' + topShareLabel + '%)', { ratio: goodRatioLabel, top: topPctLabel, target: targetShareLabel, current: topShareLabel }),
      makeToken('calc_out.power_user_curve.row.milestone_programs', 'Milestone: power-user programs (VIP support, beta features, dedicated CSM) can amplify existing concentration by +5-15 percentage points in usage share within 1 quarter'),
      makeToken('calc_out.power_user_curve.row.tip_pair_nrr', 'Tip: Power users are the seed for referrals and product feedback. Pair with the NRR Calculator (P9 batch) to project revenue impact.'),
    ];
  },
  staticExamples: [
    '$calc_out.label.power_user_concentration|Power User Concentration|: $calc_out.power_user_curve.row.concentration_excellent{"ratio":"3.50x","share":"70.0","pct":"20.0"}|🟢 Excellent (3.50x ratio — 70.0/20.0)|\n$calc_out.label.snapshot|Snapshot|: $calc_out.power_user_curve.row.snapshot_detail{"top":"20.0","share":"70.0","rest_users":"80.0","rest_share":"30.0"}|top 20.0% of users drive 70.0% of total usage. The remaining 80.0% of users account for 30.0% of usage.|\n$calc_out.power_user_curve.row.whatif_upgrade_10pct{"share":"73.0","ratio":"3.65x"}|What-If: if 10% of mid-tier users upgrade their engagement to power-user level, share rises to 73.0% (ratio lifts to 3.65x)|\n$calc_out.power_user_curve.row.break_even_good{"ratio":"3.00x","top":"20.0","target":"60.0","current":"70.0"}|Break-Even: to hit Good (3.00x ratio), need top 20.0% users driving at least 60.0% of usage (currently 70.0%)|\n$calc_out.power_user_curve.row.milestone_programs|Milestone: power-user programs (VIP support, beta features, dedicated CSM) can amplify existing concentration by +5-15 percentage points in usage share within 1 quarter|\n$calc_out.power_user_curve.row.tip_pair_nrr|Tip: Power users are the seed for referrals and product feedback. Pair with the NRR Calculator (P9 batch) to project revenue impact.|',
  ],
  faq: [
    { q: 'What is Pareto ratio?', a: 'The ratio of usage share to user share. 70/20 = 3.5 means top 20% of users generate 3.5x their proportional share of usage (70% / 20% = 3.5). Higher = more concentrated.' },
    { q: 'Why is 70/20 the canonical anchor?', a: 'Andrew Chen "The Cold Start Problem" cites 70/20 as a common Pareto for many consumer + SaaS products. Strong PMFs often approach 80/20 or 90/10 (top 10% driving 80%+ usage).' },
    { q: 'How is this different from feature adoption?', a: 'Feature adoption = % of users using Feature X. Power User Curve = concentration of OVERALL usage across all users. A 25% adoption feature may have very high power-user concentration (90/10).' },
    { q: 'How do I compute this from analytics?', a: 'Sort users by total activity (events, sessions, minutes). Take top X% by total activity. Sum their usage share. The Pareto ratio = usage_share / top_pct * 100.' },
    { q: 'What is a "good" ratio for B2B SaaS?', a: 'Andrew Chen + Lenny surveys: 70/20 (3.5x) is solid. World-class power-user programs push toward 80/10-15 (5.3x-8x). Below 50/20 (2.5x) is diffuse — no clear power users.' },
    { q: 'What if my ratio is <2.5x?', a: 'Either (a) the product is too "horizontal" (every user uses equally), or (b) the analytics are wrong (mixing power-tier and standard-tier in same cohort). Diagnose via cohort breakdown first.' },
    { q: "What is a power user curve?", a: "Power user curve = distribution of users by activity level. Often follows power law / Pareto: 20% of users = 80% of activity. Identify power users: top 10% by engagement. Compare their behavior to average. Power users: 5-10x more active, longer retention, higher LTV. Use: 1) Find what makes them successful, 2) Replicate in onboarding, 3) Reward with premium features." },
    { q: "How do I identify power users?", a: "Method 1: Top 10% by engagement score. Method 2: Specific behaviors (e.g., 3+ sessions/week, 5+ features used). Method 3: Specific actions (e.g., invited 5+ users, used 30+ times). Power users: typically 5-10% of total user base. Look for: 1) High frequency, 2) Feature breadth, 3) Long tenure. Compare behavior to average. Most: define based on business outcomes." },
    { q: "How do I use power user insights to grow?", a: "Process: 1) Identify power users, 2) Profile them (demographics, behavior, motivations), 3) Survey them (why they love the product), 4) Find patterns, 5) Replicate in onboarding (default settings, suggested features), 6) Build features they ask for. Most teams: 30-50% activation lift. Power users are 5-10% of base, generate 30-50% of revenue. Don't ignore." },
    { q: "What is the difference between power users and whale users?", a: "Power user: high engagement (active, frequent). Whale user: high revenue (spends a lot). They overlap but are different. Examples: Slack power user = 50 messages/day. Whale = 100-seat enterprise customer. Optimize for: power users (engagement drives LTV) + whales (revenue). For SaaS: power user = high retention. For gaming: whale = high spend. Both valuable." },
    { q: "What is the 1-9-90 rule?", a: "1-9-90: 1% of users create content, 9% engage with it, 90% consume. Common in social/marketplaces. Examples: Reddit, Twitter, YouTube. For most products: similar distribution. Strategy: 1) Reward creators (the 1%), 2) Support engagers (the 9%), 3) Optimize for consumers (the 90%). Don't build for all equally. Power users = creators. Most revenue from engaged users." },
    { q: "How does power user curve affect retention strategy?", a: "Power users drive long-term retention. Average user: 30-50% retention at month 6. Power users: 70-90%. Strategy: 1) Identify early (within 30 days), 2) Reward (loyalty program, premium tier), 3) Engage (personalized comms), 4) Listen to feedback. Cost: lower churn, higher LTV. Most teams: 5-10x LTV lift for power users. Don't treat all users the same." },
    { q: "Should I have a separate experience for power users?", a: "Yes, for top 5-10%. Options: 1) Premium tier (advanced features), 2) Beta access (early features), 3) Community access (peer support), 4) Direct support channel, 5) Loyalty rewards. Cost: minimal, revenue: 5-20% of total. Most teams: power users pay 2-3x more (premium tier). Make it a no-brainer: 10x more value, 2x more cost. Power users self-select." },
    { q: "How do I convert regular users to power users?", a: "Tactics include 1) Onboarding modeled on power user behavior, 2) Progressive disclosure (advanced features appear as user progresses), 3) Suggestions (\"users like you also use X\"), 4) Gamification (badges, streaks), 5) Re-engagement (when usage drops), 6) Community (peer learning). Most teams 5-15% conversion to power user in 6-12 months. Long-term: builds community and word-of-mouth." },
  ],
  howToUse: [
    'Decide the top-X% threshold (usually 20%, sometimes 10% or 5% for power-user concentration).',
    'Pull your user-activity metric (DAU events, sessions, minutes, etc.) from analytics.',
    'Sort users by total activity. Sum the top-X% usage as % of total usage.',
    'Enter top_pct and top_pct_usage_share. The engine computes ratio + band.',
    'If ratio is low (<2.5x), diagnose: is it diffuse usage, or are you mixing cohorts?',
  ],
  sources: [
    'https://andrewchen.co/the-cold-start-problem/',
    'https://www.lennysnewsletter.com/p/power-users',
    'https://a16z.com/power-user-curve/',
  ],
  engineKey: true,
};

registerEngine(engine);
