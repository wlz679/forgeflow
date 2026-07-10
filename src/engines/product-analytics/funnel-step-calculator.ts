// P10-1 Funnel Step Conversion Analyzer
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS PM persona ($10M-$50M ARR).
// Community-wisdom thresholds (Lenny's Newsletter / Reforge / Mixpanel benchmarks).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

export const HEALTH_BANDS = {
  excellent: { threshold: 0.40, label: '🟢 Excellent', message: 'End-to-end conversion is strong — every step is pulling weight.' },
  good:      { threshold: 0.25, label: '🟡 Good',      message: 'Healthy funnel with room to optimize the weakest step.' },
  warning:   { threshold: 0.15, label: '🟠 Warning',   message: 'Material drop-offs detected — focus on the biggest delta step.' },
  critical:  { threshold: 0,    label: '🔴 Critical',  message: 'Severe leakage — most users never reach the final event.' },
};

export function funnelEndToEnd(steps: number[]): number {
  if (steps.length < 2) return 0;
  return steps[steps.length - 1] / steps[0];
}

export function biggestDrop(steps: number[]): number {
  if (steps.length < 2) return 0;
  let maxDelta = 0;
  let maxIdx = 0;
  for (let i = 1; i < steps.length; i++) {
    const delta = steps[i - 1] - steps[i];
    if (delta > maxDelta) { maxDelta = delta; maxIdx = i - 1; }
  }
  return maxIdx;
}

export function calcHealthBand(rate: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (rate >= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (rate >= HEALTH_BANDS.good.threshold) return 'good';
  if (rate >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtPct(x: number): string { return (x * 100).toFixed(1) + '%'; }

const engine: ToolEngine = {
  slug: 'solopreneur-funnel-step-calculator',
  title: 'Funnel Step Conversion Analyzer',
  description:
    'Compute end-to-end conversion across an in-product event funnel (2-5 steps) — the standard PM metric for measuring progression through product moments. Health bands: green >=40% · yellow 25-40% · orange 15-25% · red <15%. For mid-market B2B SaaS ($10M-$50M ARR) product managers.',
  inputs: [
    { name: 'step1', label: 'Step 1 - Entry event count', placeholder: 'e.g. 1000', type: 'number' },
    { name: 'step2', label: 'Step 2 - Next event count',  placeholder: 'e.g. 800',  type: 'number' },
    { name: 'step3', label: 'Step 3 (optional)',          placeholder: 'e.g. 500',  type: 'number' },
    { name: 'step4', label: 'Step 4 (optional)',          placeholder: 'e.g. 320',  type: 'number' },
    { name: 'step5', label: 'Step 5 (optional)',          placeholder: 'e.g. 210',  type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: "function run(inputs, pick, fill) {\n  var steps = [];\n  for (var i = 1; i <= 5; i++) { var v = Number(inputs['step' + i]); if (v > 0) steps.push(v); }\n  if (steps.length < 2) return ['At least 2 step counts required.'];\n  var e2e = steps[steps.length - 1] / steps[0];\n  var band = e2e >= 0.40 ? 'Excellent' : e2e >= 0.25 ? 'Good' : e2e >= 0.15 ? 'Warning' : 'Critical';\n  var emoji = e2e >= 0.40 ? 'GREEN' : e2e >= 0.25 ? 'YELLOW' : e2e >= 0.15 ? 'ORANGE' : 'RED';\n  var dropIdx = 0, maxDelta = 0;\n  for (var j = 1; j < steps.length; j++) { var d = steps[j-1] - steps[j]; if (d > maxDelta) { maxDelta = d; dropIdx = j-1; } }\n  var stepRate = []; for (var k = 1; k < steps.length; k++) stepRate.push((steps[k]/steps[k-1]*100).toFixed(1) + '%');\n  return [\n    'FUNNEL ' + emoji + ' ' + band + ' (' + (e2e*100).toFixed(1) + '% end-to-end)',\n    'SNAPSHOT: ' + steps.length + ' steps ' + steps.join(' -> ') + '. Biggest drop: Step ' + (dropIdx+1) + ' -> Step ' + (dropIdx+2) + ' (lost ' + maxDelta + ' users)',\n    'WHATIF: if biggest drop step improves by +10%, e2e lifts to ' + ((steps[steps.length - 1] + maxDelta*0.5) / steps[0] * 100).toFixed(1) + '%',\n    'BREAKEVEN: to hit GOOD (40% e2e), need final step >= ' + Math.ceil(steps[0] * 0.4).toLocaleString() + ' (currently ' + steps[steps.length-1].toLocaleString() + ')',\n    'MILESTONE: optimize Step ' + (dropIdx+1) + ' -> Step ' + (dropIdx+2) + ' first; a 20% retention gain there lifts funnel to ' + ((steps[steps.length - 1] + maxDelta*0.2) / steps[0] * 100).toFixed(1) + '%',\n    'TIP: PM rule of thumb - in-product funnels lose the most users at the value-discovery step. Pair with Activation Rate Calculator to measure post-funnel commitment.'\n  ];\n}",
  },
  generate(inputs) {
    const steps: number[] = [];
    for (let i = 1; i <= 5; i++) {
      const v = Number(inputs['step' + i]);
      if (v > 0) steps.push(v);
    }
    if (steps.length < 2) return ['At least 2 step counts required.'];
    const e2e = funnelEndToEnd(steps);
    const dropIdx = biggestDrop(steps);
    const maxDelta = steps[dropIdx] - steps[dropIdx + 1];
    const band = calcHealthBand(e2e);
    const bandInfo = HEALTH_BANDS[band];
    const stepRates: string[] = [];
    for (let i = 1; i < steps.length; i++) stepRates.push(fmtPct(steps[i] / steps[i - 1]));
    const targetFinal = Math.ceil(steps[0] * HEALTH_BANDS.good.threshold);
    const liftedFinal = steps[steps.length - 1] + maxDelta * 0.5;
    return [
      'Funnel Health: ' + bandInfo.label + ' (' + fmtPct(e2e) + ' end-to-end)',
      'Snapshot: ' + steps.length + ' steps ' + steps.join(' -> ') + '. Step rates: ' + stepRates.join(' - ') + '. Biggest drop: Step ' + (dropIdx + 1) + ' -> Step ' + (dropIdx + 2) + ' (lost ' + maxDelta.toLocaleString() + ' users)',
      'What-If: if biggest drop step improves by +10% retention, e2e lifts to ' + fmtPct(liftedFinal / steps[0]),
      'Break-Even: to hit Good (' + fmtPct(HEALTH_BANDS.good.threshold) + ' e2e), need final step >= ' + targetFinal.toLocaleString() + ' (currently ' + steps[steps.length - 1].toLocaleString() + ')',
      'Milestone: optimize Step ' + (dropIdx + 1) + ' -> Step ' + (dropIdx + 2) + ' first; a 20% retention gain there lifts funnel to ' + fmtPct((steps[steps.length - 1] + maxDelta * 0.2) / steps[0]),
      'Tip: PM rule of thumb - in-product funnels lose the most users at the value-discovery step. Pair with Activation Rate Calculator to measure post-funnel commitment.',
    ];
  },
  staticExamples: [
    'Funnel Health: 🟠 Warning (21.0% end-to-end)\nSnapshot: 5 steps 1000 -> 800 -> 500 -> 320 -> 210. Step rates: 80.0% - 62.5% - 64.0% - 65.6%. Biggest drop: Step 2 -> Step 3 (lost 300 users)\nWhat-If: if biggest drop step improves by +10% retention, e2e lifts to 36.0%\nBreak-Even: to hit Good (25.0% e2e), need final step >= 250 (currently 210)\nMilestone: optimize Step 2 -> Step 3 first; a 20% retention gain there lifts funnel to 27.0%\nTip: PM rule of thumb - in-product funnels lose the most users at the value-discovery step. Pair with Activation Rate Calculator to measure post-funnel commitment.',
  ],
  faq: [
    { q: 'What is an in-product funnel vs a marketing funnel?', a: 'Marketing funnels track impressions -> leads -> customers (P6). In-product funnels track event-to-event within the product - e.g. signup -> first_action -> second_action -> conversion. PMs use in-product funnels to find where users get stuck.' },
    { q: 'How is "biggest drop" calculated?', a: 'It identifies the absolute drop (not percentage) between consecutive steps. For 1000->800->500->320, biggest drop is Step 2->3 (300 lost). Percentage drops and absolute drops can disagree - we use absolute to match where the most users leak.' },
    { q: 'Are 2 steps enough?', a: 'Yes - a 2-step funnel is the simplest conversion analysis (input event -> outcome event). With 2 steps the e2e conversion equals the step-2 conversion.' },
    { q: 'How often should I recompute this?', a: 'Weekly or bi-weekly for fast-moving products; monthly for stable products. Pair with the Cohort Retention Calculator (P6) to spot retention issues that affect funnel top-of-funnel counts.' },
    { q: 'What if one step has 0 users?', a: 'A 0 step either indicates an unreached event (pre-launch) or a complete hard wall (no users can progress past Step N). The engine handles 0 gracefully by skipping it - but review your funnel definition if a step shows 0 in steady-state.' },
    { q: 'Why is 25% the bar for Good?', a: 'Reforge + Mixpanel benchmarks: a healthy in-product funnel converts 25-40% end-to-end for B2B SaaS with 3-5 steps. Below 25% means one or more steps has leakage; above 40% is world-class (often a sign of excellent onboarding).' },
  ],
  howToUse: [
    'Map your product moment as a numbered event chain (e.g. 1=signup, 2=first_action, 3=second_action, 4=conversion).',
    'Pull the user count for each step from your analytics tool (Mixpanel, Amplitude, Heap).',
    'Fill steps 1-4 in order. Skip a step by leaving it blank (the engine counts only non-zero steps).',
    'Read the band (green/yellow/orange/red), then focus on the "Biggest drop" step from the Snapshot.',
    'Pair with the Break-Even section to set the next-quarter optimization target for that step.',
  ],
  sources: [
    'https://www.reforge.com/blog/growth-loops',
    'https://amplitude.com/blog/mobile-funnels',
    'https://mixpanel.com/blog/funnel-analysis/',
    'https://www.lennysnewsletter.com/p/funnels',
  ],
};

registerEngine(engine);
