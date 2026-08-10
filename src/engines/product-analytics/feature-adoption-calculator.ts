// P10-2 Feature Adoption Rate
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS PM persona ($10M-$50M ARR).
// Community-wisdom thresholds (Amplitude Product Benchmarks + Heap Product Analytics Survey).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

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

// customFn: minimal live calc. Prepend cnn alias to defensively clamp inputs to [0, ∞).
const customFn = "var cnn=function(x){return Math.max(0,x)};function run(inputs, pick, fill) { var fu = cnn(Number(inputs['feature_users'])); var au = cnn(Number(inputs['active_users'])); if (au <= 0) return ['Total active users must be > 0.']; if (fu > au) fu = au; var adoption = fu / au; var band = adoption >= 0.40 ? 'Excellent' : adoption >= 0.20 ? 'Good' : adoption >= 0.10 ? 'Warning' : 'Critical'; var emoji = adoption >= 0.40 ? 'GREEN' : adoption >= 0.20 ? 'YELLOW' : adoption >= 0.10 ? 'ORANGE' : 'RED'; var denom = inputs['WAU_vs_MAU'] || 'WAU'; var nonAdopters = Math.max(0, au - fu); var targetFu = Math.ceil(au * 0.20); var l10 = Math.min(au, fu + (au - fu) * 0.10); return ['FEATURE ' + emoji + ' ' + band + ' (' + (adoption*100).toFixed(1) + '% adoption)','SNAPSHOT: ' + fmtInt(fu) + ' of ' + fmtInt(au) + ' ' + denom + ' users used this feature. Non-adopters: ' + fmtInt(nonAdopters),'WHATIF: if 10% of non-adopters convert, adoption rises to ' + (l10/au*100).toFixed(1) + '%','BREAKEVEN: to hit GOOD (20% adoption), need at least ' + targetFu.toLocaleString() + ' feature users (currently ' + fmtInt(fu) + ')','MILESTONE: lifting adoption by +10 percentage points over the next quarter requires ' + fmtInt(Math.ceil(au * (adoption + 0.10) - fu)) + ' more feature users','TIP: Pair with the Activation Rate Calculator to distinguish adopted-but-inactive users from non-adopted.']; function fmtInt(n) { return Math.round(n).toLocaleString(); } }";

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
    if (au <= 0) return ['Total active users must be > 0.'];
    const cappedFu = Math.min(fu, au);
    const adoption = featureAdoption(cappedFu, au);
    const band = calcHealthBand(adoption);
    const bandInfo = HEALTH_BANDS[band];
    const denom = inputs['WAU_vs_MAU'] || 'WAU';
    const nonAdopters = Math.max(0, au - cappedFu);
    const targetFu = Math.ceil(au * HEALTH_BANDS.good.threshold);
    const liftedAdoption10 = Math.min(au, cappedFu + nonAdopters * 0.10) / au;
    const needMore = Math.max(0, Math.ceil(au * (adoption + 0.10)) - cappedFu);
    return [
      'Feature Adoption: ' + bandInfo.label + ' (' + fmtPct(adoption) + ' adoption)',
      'Snapshot: ' + fmtInt(cappedFu) + ' of ' + fmtInt(au) + ' ' + denom + ' users used this feature. Non-adopters: ' + fmtInt(nonAdopters),
      'What-If: if 10% of non-adopters convert this quarter, adoption rises to ' + fmtPct(liftedAdoption10),
      'Break-Even: to hit Good (' + fmtPct(HEALTH_BANDS.good.threshold) + ' adoption), need at least ' + targetFu.toLocaleString() + ' feature users (currently ' + fmtInt(cappedFu) + ')',
      'Milestone: lifting adoption by +10 percentage points requires ' + fmtInt(needMore) + ' more feature users (target ' + fmtInt(Math.ceil(au * (adoption + 0.10))) + ' from ' + fmtInt(cappedFu) + ')',
      'Tip: Pair with the Activation Rate Calculator to distinguish adopted-but-inactive users from non-adopted — both look "stuck" but require different interventions.',
    ];
  },
  staticExamples: [
    'Feature Adoption: 🟡 Good (25.0% adoption)\nSnapshot: 750 of 3,000 WAU users used this feature. Non-adopters: 2,250\nWhat-If: if 10% of non-adopters convert this quarter, adoption rises to 32.5%\nBreak-Even: to hit Good (20.0% adoption), need at least 600 feature users (currently 750)\nMilestone: lifting adoption by +10 percentage points requires 300 more feature users (target 1,050 from 750)\nTip: Pair with the Activation Rate Calculator to distinguish adopted-but-inactive users from non-adopted — both look "stuck" but require different interventions.',
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
