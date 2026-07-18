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
