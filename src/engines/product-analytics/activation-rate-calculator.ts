// P10-3 Activation Rate
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS PM persona ($10M-$50M ARR).
// Community-wisdom thresholds (Reforge Growth Loops + a16z Consumer PM Survey 2023).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

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

// customFn: minimal live calc. Prepend cnn alias to defensively clamp inputs to [0, ∞).
const customFn = "var cnn=function(x){return Math.max(0,x)};function run(inputs, pick, fill) { var s = cnn(Number(inputs['signups'])); var a = cnn(Number(inputs['activated'])); if (s <= 0) return ['Signups must be > 0.']; if (a > s) a = s; var rate = a / s; var band = rate >= 0.40 ? 'Excellent' : rate >= 0.25 ? 'Good' : rate >= 0.15 ? 'Warning' : 'Critical'; var emoji = rate >= 0.40 ? 'GREEN' : rate >= 0.25 ? 'YELLOW' : rate >= 0.15 ? 'ORANGE' : 'RED'; var days = inputs['period_days'] || '7'; var nonActivated = Math.max(0, s - a); var targetA = Math.ceil(s * 0.25); return ['ACTIVATION ' + emoji + ' ' + band + ' (' + (rate*100).toFixed(1) + '% within ' + days + ' days)','SNAPSHOT: ' + fmtInt(a) + ' of ' + fmtInt(s) + ' signups reached the aha-moment in ' + days + ' days. Non-activated: ' + fmtInt(nonActivated),'WHATIF: reducing time-to-value by 1 day typically lifts activation by +5 to +10 percentage points','BREAKEVEN: to hit GOOD (25% activation), need at least ' + targetA.toLocaleString() + ' activated signups (currently ' + fmtInt(a) + ')','MILESTONE: focus on the activation event itself (what does aha look like for YOUR product?) — narrowing the definition often reveals leaks','TIP: Activation is downstream of TTV - pair with the Time-to-Value Calculator.']; function fmtInt(n) { return Math.round(n).toLocaleString(); } }";

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
  generate(inputs) {
    const signups = clampNonNegative(Number(inputs['signups']));
    let activated = clampNonNegative(Number(inputs['activated']));
    if (signups <= 0) return ['Signups must be > 0.'];
    if (activated > signups) activated = signups;
    const rate = activationRate(activated, signups);
    const band = calcHealthBand(rate);
    const bandInfo = HEALTH_BANDS[band];
    const days = inputs['period_days'] || '7';
    const nonActivated = Math.max(0, signups - activated);
    const targetActivated = Math.ceil(signups * HEALTH_BANDS.good.threshold);
    return [
      'Activation: ' + bandInfo.label + ' (' + fmtPct(rate) + ' within ' + days + ' days)',
      'Snapshot: ' + fmtInt(activated) + ' of ' + fmtInt(signups) + ' signups reached the aha-moment in ' + days + ' days. Non-activated: ' + fmtInt(nonActivated),
      'What-If: reducing time-to-value typically lifts activation by +5 to +10 percentage points (each day saved = more users reach aha within window)',
      'Break-Even: to hit Good (' + fmtPct(HEALTH_BANDS.good.threshold) + ' activation), need at least ' + targetActivated.toLocaleString() + ' activated signups (currently ' + fmtInt(activated) + ')',
      'Milestone: narrowing the aha-moment definition (what does activation MEAN for YOUR product?) often reveals leaks hidden in vague definitions',
      'Tip: Activation rate is downstream of TTV - pair with the Time-to-Value Calculator (P10-5) to diagnose why users are not activating.',
    ];
  },
  staticExamples: [
    'Activation: 🟡 Good (30.0% within 7 days)\nSnapshot: 150 of 500 signups reached the aha-moment in 7 days. Non-activated: 350\nWhat-If: reducing time-to-value typically lifts activation by +5 to +10 percentage points (each day saved = more users reach aha within window)\nBreak-Even: to hit Good (25.0% activation), need at least 125 activated signups (currently 150)\nMilestone: narrowing the aha-moment definition (what does activation MEAN for YOUR product?) often reveals leaks hidden in vague definitions\nTip: Activation rate is downstream of TTV - pair with the Time-to-Value Calculator (P10-5) to diagnose why users are not activating.',
  ],
  faq: [
    { q: 'What is the "aha-moment"?', a: 'The product action that correlates with retention — e.g. for Slack it was "team sends 2000 messages", for Dropbox "user installs on 2nd device". Defining this accurately is the hardest part of activation.' },
    { q: 'How long should the window be?', a: '7 days for fast-action products (mobile apps). 14 days for self-serve SaaS. 30 days for B2B with longer evaluation cycles. Pick the window matching your product.' },
    { q: 'What if activated > signups?', a: 'Indicates sample-mismatch: signups counted in one window, activated in another. The engine caps to prevent >100% artifacts. Fix the reporting pipeline.' },
    { q: 'How is activation different from conversion?', a: 'Activation = reached product value moment (may not pay). Conversion = paid. Optimize activation first; conversion downstream of activation.' },
    { q: 'What if activation rate is below 15%?', a: 'Critical — diagnose the funnel first. Pair with Funnel Step Calculator (P10-1) to identify where signups drop off before aha-moment.' },
    { q: 'Should I count "any action" as activation?', a: 'No. Activation must be the specific behavior that predicts retention. Counting "any action" inflates the rate and hides real leaks.' },
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
