// P11-3 Productivity Ramp Curve
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS People-ops persona ($10M-$50M ARR).
// Community-wisdom thresholds (Bersin by Deloitte + Andrew Chen Cold Start Problem + Reforge).
// 3 curve shapes: SlowStart (^2) / Linear / S-Curve (logistic).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

export const HEALTH_BANDS = {
  excellent: { threshold: 0.30, label: '🟢 Excellent', message: 'Steep ramp — employee reaches P50 productivity in <30% of months_to_full.' },
  good:      { threshold: 0.50, label: '🟡 Good',      message: 'Healthy ramp — P50 reached at 30-50% of months_to_full (typical for S-Curve).' },
  warning:   { threshold: 0.70, label: '🟠 Warning',   message: 'Slow ramp — P50 takes 50-70% of months_to_full. Onboarding likely needs scope/buddy support.' },
  critical:  { threshold: Infinity, label: '🔴 Critical', message: 'Very slow ramp — employee takes >70% of months_to_full to reach P50 productivity.' },
};

export function productivityAtMonth(t: number, monthsToFull: number, starting: number, shape: 'SlowStart' | 'Linear' | 'S-Curve'): number {
  const range = 100 - starting;
  if (t <= 0) return starting;
  if (t >= monthsToFull) return 100;
  if (shape === 'Linear') return starting + range * (t / monthsToFull);
  if (shape === 'SlowStart') return starting + range * Math.pow(t / monthsToFull, 2);
  // S-Curve logistic: productivity(t) = starting + (100 - starting) / (1 + e^(-k*(t - t0)))
  // k = 12 / months_to_full, t0 = months_to_full / 2
  const k = 12 / monthsToFull;
  const t0 = monthsToFull / 2;
  return starting + range / (1 + Math.exp(-k * (t - t0)));
}

export function findP50Month(monthsToFull: number, starting: number, shape: 'SlowStart' | 'Linear' | 'S-Curve'): number {
  // Find the first month t where productivity(t) >= 50%
  for (let t = 0.1; t <= monthsToFull * 2; t += 0.1) {
    if (productivityAtMonth(t, monthsToFull, starting, shape) >= 50) {
      return Math.round(t * 10) / 10;
    }
  }
  return monthsToFull;
}

export function calcHealthBand(p50Pct: number): keyof typeof HEALTH_BANDS {
  // p50Pct is a percentage (0-100); HEALTH_BANDS thresholds are decimal fractions.
  const ratio = p50Pct / 100;
  if (ratio <= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (ratio <= HEALTH_BANDS.good.threshold) return 'good';
  if (ratio <= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtPct(x: number): string { return x.toFixed(1) + '%'; }
function fmtMoney(x: number): string { return '$' + Math.round(x).toLocaleString(); }

const engine: ToolEngine = {
  slug: 'solopreneur-productivity-ramp-curve-calculator',
  title: 'Productivity Ramp Curve',
  description:
    'Model the productivity ramp curve for a new hire over months_to_full — pick from SlowStart, Linear, or S-Curve shape. INVERSE health bands based on P50 month as % of months_to_full: 🟢 ≤30% · 🟡 30-50% · 🟠 50-70% · 🔴 >70%. For mid-market B2B SaaS ($10M-$50M ARR) People-ops managers and Head-of-HR.',
  inputs: [
    { name: 'months_to_full', label: 'Months to full productivity',         placeholder: 'e.g. 6',     type: 'number' },
    { name: 'starting_pct',  label: 'Starting productivity % at month 0',  placeholder: 'e.g. 0',     type: 'number' },
    { name: 'curve_shape',   label: 'Curve shape', type: 'select', options: ['SlowStart', 'Linear', 'S-Curve'], default: 'S-Curve' },
    { name: 'monthly_cost',  label: 'Fully-loaded monthly cost',           placeholder: 'e.g. 14833', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `function run(inputs, pick, fill) {
  var mt = Number(inputs.months_to_full) || 6;
  var sp = Number(inputs.starting_pct) || 0;
  var sh = inputs.curve_shape || 'S-Curve';
  var mc = Number(inputs.monthly_cost) || 0;
  // Find P50 month
  var p50 = mt;
  for (var t = 0.1; t <= mt * 2; t += 0.1) {
    var p = 0;
    if (t >= mt) p = 100;
    else if (sh === 'Linear') p = sp + (100 - sp) * (t / mt);
    else if (sh === 'SlowStart') p = sp + (100 - sp) * Math.pow(t / mt, 2);
    else { var k = 12 / mt, t0 = mt / 2; p = sp + (100 - sp) / (1 + Math.exp(-k * (t - t0))); }
    if (p >= 50) { p50 = Math.round(t * 10) / 10; break; }
  }
  var p50Pct = p50 / mt;
  var band = p50Pct <= 0.30 ? 'Excellent' : p50Pct <= 0.50 ? 'Good' : p50Pct <= 0.70 ? 'Warning' : 'Critical';
  var emoji = p50Pct <= 0.30 ? '🟢' : p50Pct <= 0.50 ? '🟡' : p50Pct <= 0.70 ? '🟠' : '🔴';
  return [
    '🩺 Ramp Health: ' + emoji + ' ' + band + ' (P50 at month ' + p50 + ', ' + (p50Pct * 100).toFixed(0) + '% of months_to_full)',
    '📊 Snapshot: ' + mt + 'mo ' + sh + ' curve, ' + sp + '% start, $' + mc.toLocaleString() + '/mo fully-loaded',
    '🔄 What-If: Linear curve hits P50 at same month (' + p50 + '); SlowStart hits P50 at month ' + (Math.sqrt(0.5) * mt).toFixed(1) + ' (slower)',
    '⚖️ Break-Even: to hit 🟢 Excellent (P50 ≤30%), use S-Curve with shorter months_to_full or pre-onboarding bootcamp',
    '🎯 Milestone: At month ' + Math.round(mt / 2) + ' the hire should be at ~50% productivity — pair with [Time to Productivity Calculator] (P11-2)',
    '💡 Tip: S-Curve is realistic for knowledge work; SlowStart fits roles with heavy upfront training (sales, compliance).'
  ];
}`,
  },
  generate(inputs) {
    const monthsToFull = Number(inputs.months_to_full) || 6;
    const starting = Number(inputs.starting_pct) || 0;
    const shape = (inputs.curve_shape || 'S-Curve') as 'SlowStart' | 'Linear' | 'S-Curve';
    const monthlyCost = Number(inputs.monthly_cost) || 0;
    const p50Month = findP50Month(monthsToFull, starting, shape);
    const p50Pct = p50Month / monthsToFull;
    const band = calcHealthBand(p50Pct * 100); // pass as percentage (0-100)
    const bandInfo = HEALTH_BANDS[band];
    const linearP50 = findP50Month(monthsToFull, starting, 'Linear');
    const slowP50 = findP50Month(monthsToFull, starting, 'SlowStart');
    return [
      '🩺 Ramp Health: ' + bandInfo.label + ' (P50 at month ' + p50Month + ', ' + fmtPct(p50Pct * 100) + ' of months_to_full)',
      '📊 Snapshot: ' + monthsToFull + 'mo ' + shape + ' curve · ' + starting + '% start · ' + fmtMoney(monthlyCost) + '/mo fully-loaded',
      '🔄 What-If: Linear curve hits P50 at same month (' + linearP50 + '); SlowStart hits P50 at month ' + slowP50.toFixed(1) + ' (slower)',
      '⚖️ Break-Even: to hit 🟢 Excellent (P50 ≤' + (HEALTH_BANDS.excellent.threshold * 100) + '% of months_to_full), use S-Curve with shorter months_to_full or pre-onboarding bootcamp',
      '🎯 Milestone: At month ' + Math.round(monthsToFull / 2) + ' the hire should be at ~50% productivity — pair with [Time to Productivity Calculator] (P11-2) for ramp-weeks',
      '💡 Tip: S-Curve is realistic for knowledge work; SlowStart fits roles with heavy upfront training (sales, compliance, certifications).',
    ];
  },
  staticExamples: [
    '🩺 Ramp Health: 🟡 Good (P50 at month 3, 50.0% of months_to_full)\n📊 Snapshot: 6mo S-Curve curve · 0% start · $14,833/mo fully-loaded\n🔄 What-If: Linear curve hits P50 at same month (3); SlowStart hits P50 at month 4.3 (slower)\n⚖️ Break-Even: to hit 🟢 Excellent (P50 ≤30% of months_to_full), use S-Curve with shorter months_to_full or pre-onboarding bootcamp\n🎯 Milestone: At month 3 the hire should be at ~50% productivity — pair with [Time to Productivity Calculator] (P11-2) for ramp-weeks\n💡 Tip: S-Curve is realistic for knowledge work; SlowStart fits roles with heavy upfront training (sales, compliance, certifications).',
  ],
  faq: [
    { q: 'Which curve shape should I pick?', a: 'S-Curve is realistic for most knowledge work (engineering, PM, design, marketing) — slow start while learning, accelerating as they ramp. Linear is the simplest baseline. SlowStart fits roles with heavy upfront training (sales bootcamp, compliance certification, equipment training).' },
    { q: 'What does "P50" mean here?', a: 'P50 = the month at which the hire reaches 50% of full productivity. Lower P50 = steeper ramp = better. A 6-month ramp where P50 hits at month 3 (50% of months_to_full) is a healthy S-Curve. If P50 hits at month 5 (83% of months_to_full), the curve is too flat.' },
    { q: 'How is this different from P11-2 (Ramp Time)?', a: 'P11-2 measures HOW LONG until first productivity (a single time-to-event). P11-3 models the CURVE — productivity as a function of time. P11-3 is the projection tool; P11-2 is the milestone marker.' },
    { q: 'Can I use real productivity data to fit the curve?', a: 'Yes — pull your HRIS for monthly performance review scores, deploy velocity, or OKR completion rate. Fit the parameters (months_to_full, starting_pct) to minimize RMSE against actual data. P11-3 defaults are reasonable starting points, not the law.' },
    { q: 'Does this include ramp cost?', a: 'Not directly. P11-3 outputs a productivity curve; cost is the input (monthly_cost). For total ramp cost (cost × non-productive fraction), pair with our [Fully-Loaded Employee Cost Calculator] (P11-1) and [Attrition Cost Calculator] (P11-6).' },
    { q: 'What if my hire starts at >0%?', a: 'Internal transfers, promotions, and rehires often have non-zero starting productivity. Set starting_pct to your best estimate (e.g. 30% for a promoted IC who already knows the codebase). The curve then ramps from there to 100%.' },
  ],
  howToUse: [
    'Enter months_to_full — how many months until the hire reaches 100% productivity (typical: 3-9 months).',
    'Enter starting_pct — productivity at month 0 (0 for external hire, 20-40% for internal transfer).',
    'Pick curve shape — S-Curve for knowledge work, Linear for baseline, SlowStart for training-heavy roles.',
    'Enter monthly_cost — fully-loaded monthly cost (annual fully-loaded / 12, or use P11-1).',
    'Read the P50 month as % of months_to_full — the band tells you how steep the ramp is.',
  ],
  sources: [
    'https://www.bersin.com/research/talent-acquisition/',
    'https://andrewchen.co/the-cold-start-problem/',
    'https://www.reforge.com/blog/growth-loops',
  ],
};
registerEngine(engine);