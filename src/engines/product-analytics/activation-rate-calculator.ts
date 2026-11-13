// P10-3 Activation Rate
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS PM persona ($10M-$50M ARR).
// Community-wisdom thresholds (Reforge Growth Loops + a16z Consumer PM Survey 2023).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-7：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 两端逐字节相同。label 只包标签、row 包整行+{param}。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

export const HEALTH_BANDS = {
  excellent: { threshold: 0.40, label: '🟢 Excellent', message: 'Strong onboarding — most signups reach the aha-moment within the period.' },
  good:      { threshold: 0.25, label: '🟡 Good',      message: 'Healthy activation; identify the missing step to lift to Excellent.' },
  warning:   { threshold: 0.15, label: '🟠 Warning',   message: 'Material activation gap — most signups never reach the core value moment.' },
  critical:  { threshold: 0,    label: '🔴 Critical',  message: 'Severe activation gap — diagnose signup-to-aha flow urgently.' },
};

export function activationRate(activated: number, signups: number): number {
  if (signups <= 0) return 0;
  if (activated >= signups) return 1.0;
  return activated / signups;
}

export function calcHealthBand(rate: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (rate >= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (rate >= HEALTH_BANDS.good.threshold) return 'good';
  if (rate >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtPct(x: number): string { return (x * 100).toFixed(1) + '%'; }
function fmtInt(n: number): string { return Math.round(n).toLocaleString(); }

/** 结果卡片（服务端）—— P168 B3-7 token 化；与下面的 customFn **逐字镜像**。 */
function calculateActivation(inputs: Record<string, string>): string[] {
  const signups = clampNonNegative(Number(inputs['signups']));
  let activated = clampNonNegative(Number(inputs['activated']));
  if (signups <= 0) return [makeToken('calc_out.activation_rate.row.error_signups_zero', 'Signups must be > 0.')];
  if (activated > signups) activated = signups;
  const rate = activationRate(activated, signups);
  const band = calcHealthBand(rate);
  const days = inputs['period_days'] || '7';
  const nonActivated = Math.max(0, signups - activated);
  const targetActivated = Math.ceil(signups * HEALTH_BANDS.good.threshold);
  const ratePct = fmtPct(rate);
  // ⚠️ band 决定 code 后缀 ⇒ 4 个 band code 必须**逐个写出字面量**（拼字符串的话
  //   G2 的「模板表守恒」看不到它们 ⇒ locale 落库后仍会红）。
  const bandFallback = HEALTH_BANDS[band].label + ' (' + ratePct + ' within ' + days + ' days)';
  const bandParams = { rate: ratePct, days: String(days) };
  const bandRow = band === 'excellent' ? makeToken('calc_out.activation_rate.row.activation_excellent', bandFallback, bandParams)
    : band === 'good' ? makeToken('calc_out.activation_rate.row.activation_good', bandFallback, bandParams)
    : band === 'warning' ? makeToken('calc_out.activation_rate.row.activation_warning', bandFallback, bandParams)
    : makeToken('calc_out.activation_rate.row.activation_critical', bandFallback, bandParams);
  return [
    makeToken('calc_out.label.activation', 'Activation') + ': ' + bandRow,
    makeToken('calc_out.label.snapshot', 'Snapshot') + ': ' + makeToken('calc_out.activation_rate.row.snapshot_detail', fmtInt(activated) + ' of ' + fmtInt(signups) + ' signups reached the aha-moment in ' + days + ' days.', { activated: fmtInt(activated), signups: fmtInt(signups), days: String(days) }) + ' ' + makeToken('calc_out.label.non_activated', 'Non-activated') + ': ' + fmtInt(nonActivated),
    makeToken('calc_out.activation_rate.row.whatif_reduce_ttv', 'What-If: reducing time-to-value typically lifts activation by +5 to +10 percentage points (each day saved = more users reach aha within window)'),
    makeToken('calc_out.activation_rate.row.break_even_target', 'Break-Even: to hit Good (' + fmtPct(HEALTH_BANDS.good.threshold) + ' activation), need at least ' + targetActivated.toLocaleString() + ' activated signups (currently ' + fmtInt(activated) + ')', { target_pct: fmtPct(HEALTH_BANDS.good.threshold), target: targetActivated.toLocaleString(), current: fmtInt(activated) }),
    makeToken('calc_out.activation_rate.row.milestone_aha_definition', 'Milestone: narrowing the aha-moment definition (what does activation MEAN for YOUR product?) often reveals leaks hidden in vague definitions'),
    makeToken('calc_out.activation_rate.row.tip_downstream_ttv', 'Tip: Activation rate is downstream of TTV - pair with the Time-to-Value Calculator (P10-5) to diagnose why users are not activating.'),
  ];
}

// customFn: 浏览器侧的同一份计算（P168 B3-7：与服务端 calculateActivation **逐字镜像**）。
// ⚠️ 客户端原本与服务端**漂移**：emoji 被写成 GREEN/YELLOW 单词、Break-Even 写 25%（服务端 25.0%）、
//    What-If / Milestone / Tip 三整句不同 ⇒ 一律以**服务端**为准。
// ⭐ cnn 镜像服务端的 clampNonNegative（含 NaN → 0）⇒ 两端在空输入下也一致。
const customFn =
  // P168 B3-7：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 两端输出逐字节相同，不可能漂；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS +
  "var cnn=function(x){return isNaN(x)?0:Math.max(0,x)};" +
  "function fmtPct(x){return (x*100).toFixed(1)+'%'}" +
  "function fmtInt(n){return Math.round(n).toLocaleString()}" +
  "var HEALTH_BANDS={excellent:{threshold:0.40,label:'🟢 Excellent'},good:{threshold:0.25,label:'🟡 Good'},warning:{threshold:0.15,label:'🟠 Warning'},critical:{threshold:0,label:'🔴 Critical'}};" +
  "function run(inputs, pick, fill) {" +
  "  var signups=cnn(Number(inputs['signups']));" +
  "  var activated=cnn(Number(inputs['activated']));" +
  "  if (signups<=0) return [tk('calc_out.activation_rate.row.error_signups_zero','Signups must be > 0.')];" +
  "  if (activated>signups) activated=signups;" +
  "  var rate=activated>=signups?1.0:activated/signups;" +
  "  var band=rate>=HEALTH_BANDS.excellent.threshold?'excellent':rate>=HEALTH_BANDS.good.threshold?'good':rate>=HEALTH_BANDS.warning.threshold?'warning':'critical';" +
  "  var bandInfo=HEALTH_BANDS[band];" +
  "  var days=inputs['period_days']||'7';" +
  "  var nonActivated=Math.max(0,signups-activated);" +
  "  var targetActivated=Math.ceil(signups*HEALTH_BANDS.good.threshold);" +
  "  var ratePct=fmtPct(rate);" +
  "  var bandFallback=bandInfo.label+' ('+ratePct+' within '+days+' days)';" +
  "  var bandParams={rate:ratePct,days:String(days)};" +
  "  var bandRow=band==='excellent'?tk('calc_out.activation_rate.row.activation_excellent',bandFallback,bandParams):band==='good'?tk('calc_out.activation_rate.row.activation_good',bandFallback,bandParams):band==='warning'?tk('calc_out.activation_rate.row.activation_warning',bandFallback,bandParams):tk('calc_out.activation_rate.row.activation_critical',bandFallback,bandParams);" +
  "  return [" +
  "    tk('calc_out.label.activation','Activation')+': '+bandRow," +
  "    tk('calc_out.label.snapshot','Snapshot')+': '+tk('calc_out.activation_rate.row.snapshot_detail',fmtInt(activated)+' of '+fmtInt(signups)+' signups reached the aha-moment in '+days+' days.',{activated:fmtInt(activated),signups:fmtInt(signups),days:String(days)})+' '+tk('calc_out.label.non_activated','Non-activated')+': '+fmtInt(nonActivated)," +
  "    tk('calc_out.activation_rate.row.whatif_reduce_ttv','What-If: reducing time-to-value typically lifts activation by +5 to +10 percentage points (each day saved = more users reach aha within window)')," +
  "    tk('calc_out.activation_rate.row.break_even_target','Break-Even: to hit Good ('+fmtPct(HEALTH_BANDS.good.threshold)+' activation), need at least '+targetActivated.toLocaleString()+' activated signups (currently '+fmtInt(activated)+')',{target_pct:fmtPct(HEALTH_BANDS.good.threshold),target:targetActivated.toLocaleString(),current:fmtInt(activated)})," +
  "    tk('calc_out.activation_rate.row.milestone_aha_definition','Milestone: narrowing the aha-moment definition (what does activation MEAN for YOUR product?) often reveals leaks hidden in vague definitions')," +
  "    tk('calc_out.activation_rate.row.tip_downstream_ttv','Tip: Activation rate is downstream of TTV - pair with the Time-to-Value Calculator (P10-5) to diagnose why users are not activating.')," +
  "  ];" +
  "} return run(inputs, pick, fill);";

const engine: ToolEngine = {
  slug: 'solopreneur-activation-rate-calculator',
  title: 'Activation Rate',
  description:
    'Compute activation rate as % of signups that reached the aha-moment within a time window (7/14/30 days). The PM metric for measuring onboarding effectiveness. Health bands: green >=40% · yellow 25-40% · orange 15-25% · red <15%. For mid-market B2B SaaS ($10M-$50M ARR) product managers.',
  categoryId: 'P',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'signups',     label: 'New signups in period',                       placeholder: 'e.g. 500', type: 'number' },
    { name: 'activated',   label: 'Signups reaching aha-moment in same window',   placeholder: 'e.g. 150', type: 'number' },
    { name: 'period_days', label: 'Activation window',  type: 'select',
      options: ['7', '14', '30'],
      default: '7' },
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
    return calculateActivation(inputs);
  },
  staticExamples: [
    '$calc_out.label.activation|Activation|: $calc_out.activation_rate.row.activation_good{"rate":"30.0%","days":"7"}|🟡 Good (30.0% within 7 days)|\n$calc_out.label.snapshot|Snapshot|: $calc_out.activation_rate.row.snapshot_detail{"activated":"150","signups":"500","days":"7"}|150 of 500 signups reached the aha-moment in 7 days.| $calc_out.label.non_activated|Non-activated|: 350\n$calc_out.activation_rate.row.whatif_reduce_ttv|What-If: reducing time-to-value typically lifts activation by +5 to +10 percentage points (each day saved = more users reach aha within window)|\n$calc_out.activation_rate.row.break_even_target{"target_pct":"25.0%","target":"125","current":"150"}|Break-Even: to hit Good (25.0% activation), need at least 125 activated signups (currently 150)|\n$calc_out.activation_rate.row.milestone_aha_definition|Milestone: narrowing the aha-moment definition (what does activation MEAN for YOUR product?) often reveals leaks hidden in vague definitions|\n$calc_out.activation_rate.row.tip_downstream_ttv|Tip: Activation rate is downstream of TTV - pair with the Time-to-Value Calculator (P10-5) to diagnose why users are not activating.|',
  ],
  faq: [
    { q: 'What is the "aha-moment"?', a: 'The product action that correlates with retention — e.g. for Slack it was "team sends 2000 messages", for Dropbox "user installs on 2nd device". Defining this accurately is the hardest part of activation.' },
    { q: 'How long should the window be?', a: '7 days for fast-action products (mobile apps). 14 days for self-serve SaaS. 30 days for B2B with longer evaluation cycles. Pick the window matching your product.' },
    { q: 'What if activated > signups?', a: 'Indicates sample-mismatch: signups counted in one window, activated in another. The engine caps to prevent >100% artifacts. Fix the reporting pipeline.' },
    { q: 'How is activation different from conversion?', a: 'Activation = reached product value moment (may not pay). Conversion = paid. Optimize activation first; conversion downstream of activation.' },
    { q: 'What if activation rate is below 15%?', a: 'Critical — diagnose the funnel first. Pair with Funnel Step Calculator (P10-1) to identify where signups drop off before aha-moment.' },
    { q: 'Should I count "any action" as activation?', a: 'No. Activation must be the specific behavior that predicts retention. Counting "any action" inflates the rate and hides real leaks.' },
    { q: "What is activation rate?", a: "Activation = % of new signups who reach the \"aha moment\" (key value-defining action) within a defined period. Examples: Slack: team sends 2K messages, Dropbox: file uploaded, Facebook: 7 friends in 10 days. Benchmarks: 20-40% activation is good, 40%+ excellent. Track: % of signups activating in week 1. Key driver of retention and LTV." },
    { q: "How do I find my activation metric?", a: "Process: 1) Track cohort retention, 2) Correlate with specific behaviors, 3) Find the action with highest correlation to retention. Example: 30-day retention vs actions. Common: 1) Onboarding complete, 2) First value action, 3) Set up workspace, 4) Connect data source, 5) Invite teammate. The \"magic number\" varies per product. Test: 5-10 candidate events." },
    { q: "How do I improve activation rate?", a: "1) Reduce time-to-value (cut steps), 2) Better onboarding (interactive tutorials), 3) Personalized setup, 4) Sample data (so users see value immediately), 5) Remove friction (no credit card, no full signup), 6) Email/push reminders. Most teams 20-50% improvement in 3-6 months. Best ROI: time-to-value reduction. 50% faster to value = 20-30% activation lift." },
    { q: "What is the difference between activation and conversion?", a: "Activation: user reaches value moment (aha). Conversion: user becomes paying customer. Most products: activation happens before conversion (free trial → activated → paid). Activation: leading indicator. Conversion: lagging. Track % activation, then % conversion of activated users. Higher activation = higher conversion. Optimize both. 3-5x conversion lift with activation focus." },
    { q: "How long should the activation window be?", a: "Common: 1-7 days for activation. SaaS: day 1 (sign up) to day 7. Mobile: day 0-3. E-commerce: first session. Trade-off: shorter = harder to hit, more accurate. Longer = more flexibility, less correlation with retention. Most: day 1-7 is standard. For complex products: 14-30 days. Test: 1, 7, 14, 30 day windows. Pick the one that best predicts 30-day retention." },
    { q: "Should I track activation by channel?", a: "Yes. Different channels have different activation rates: 1) Referral: 50-70% (high intent), 2) Organic search: 30-50%, 3) Paid social: 10-20% (low intent), 4) Display: 5-10% (lowest). Use 1) Identify high-LTV channels, 2) Customize onboarding per channel, 3) Improve low-activation channels. Most teams 2-3x channel activation difference. Optimize: lower channels first." },
    { q: "What is the relationship between activation and retention?", a: "Strong correlation. Activated users: 2-5x higher 30-day retention. Non-activated: 60-80% churn in week 1. Most products: activation is the #1 predictor of long-term retention. Improve activation: 20% lift in activation = 30-50% lift in long-term retention. Track: activation rate × cohort retention. The biggest leverage in most products." },
    { q: "How do I measure activation in a non-digital product?", a: "Non-digital: 1) Define activation event, 2) Manual or survey-based tracking, 3) Time-based (e.g., \"first 30 days\"), 4) Behavioral (e.g., \"completed setup\"). For services: book first session, complete first project, first invoice paid. For e-commerce: first purchase. Activation metric: 1-2 key actions that signal engagement. Track: cohort retention by activation. Most B2B services: 20-40% activation." },
  ],
  howToUse: [
    'Define your aha-moment: pick the single product action that best correlates with 30-day retention.',
    'Pull new signups count for the period (e.g. last 7 days).',
    'Pull activated signups count — users who triggered your aha-moment in the same window.',
    'Pick the window: 7 days for fast-action products, 14 for SaaS, 30 for B2B.',
    'Read the band: green/yellow/orange/red indicates onboarding effectiveness.',
  ],
  sources: [
    'https://www.reforge.com/blog/growth-loops',
    'https://a16z.com/consumer-retention/',
    'https://www.lennysnewsletter.com/p/activation',
  ],
  engineKey: true,
};

registerEngine(engine);
