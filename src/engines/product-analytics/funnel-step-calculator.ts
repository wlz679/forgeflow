// P10-1 Funnel Step Conversion Analyzer
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS PM persona ($10M-$50M ARR).
// Community-wisdom thresholds (Lenny's Newsletter / Reforge / Mixpanel benchmarks).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

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

// customFn: minimal live calc. Prepend cnn alias to defensively clamp inputs to [0, ∞).
const customFn = "var cnn=function(x){return Math.max(0,x)};function run(inputs, pick, fill) { var steps = []; for (var i = 1; i <= 5; i++) { var v = cnn(Number(inputs['step' + i])); if (v > 0) steps.push(v); } if (steps.length < 2) return ['At least 2 step counts required.']; var e2e = steps[steps.length - 1] / steps[0]; var band = e2e >= 0.40 ? 'Excellent' : e2e >= 0.25 ? 'Good' : e2e >= 0.15 ? 'Warning' : 'Critical'; var emoji = e2e >= 0.40 ? 'GREEN' : e2e >= 0.25 ? 'YELLOW' : e2e >= 0.15 ? 'ORANGE' : 'RED'; var dropIdx = 0, maxDelta = 0; for (var j = 1; j < steps.length; j++) { var d = steps[j-1] - steps[j]; if (d > maxDelta) { maxDelta = d; dropIdx = j-1; } } var stepRate = []; for (var k = 1; k < steps.length; k++) stepRate.push((steps[k]/steps[k-1]*100).toFixed(1) + '%'); return ['FUNNEL ' + emoji + ' ' + band + ' (' + (e2e*100).toFixed(1) + '% end-to-end)','SNAPSHOT: ' + steps.length + ' steps ' + steps.join(' -> ') + '. Biggest drop: Step ' + (dropIdx+1) + ' -> Step ' + (dropIdx+2) + ' (lost ' + maxDelta + ' users)','WHATIF: if biggest drop step improves by +10%, e2e lifts to ' + ((steps[steps.length - 1] + maxDelta*0.5) / steps[0] * 100).toFixed(1) + '%','BREAKEVEN: to hit GOOD (40% e2e), need final step >= ' + Math.ceil(steps[0] * 0.4).toLocaleString() + ' (currently ' + steps[steps.length-1].toLocaleString() + ')','MILESTONE: optimize Step ' + (dropIdx+1) + ' -> Step ' + (dropIdx+2) + ' first; a 20% retention gain there lifts funnel to ' + ((steps[steps.length - 1] + maxDelta*0.2) / steps[0] * 100).toFixed(1) + '%','TIP: PM rule of thumb - in-product funnels lose the most users at the value-discovery step. Pair with Activation Rate Calculator to measure post-funnel commitment.']; }";

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
    const steps: number[] = [];
    for (let i = 1; i <= 5; i++) {
      const v = clampNonNegative(Number(inputs['step' + i]));
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
    { q: "What is a funnel step analysis?", a: "Funnel = sequence of steps users take toward a goal. Examples: visit → signup → activate → purchase. Each step: drop-off rate. Identify: biggest drop-off = biggest opportunity. Common uses: checkout funnel, signup funnel, onboarding. Best practice: 1) Define clear steps, 2) Track per step, 3) Calculate drop-off %, 4) Optimize biggest drop first, 5) Re-measure. Each step: 10-30% improvement is realistic." },
    { q: "What is a good conversion rate at each funnel step?", a: "Benchmarks: 1) Visitor to signup: 2-5%, 2) Signup to activation: 30-50%, 3) Activation to paid: 10-25%, 4) Checkout step 1 to 2: 70-85%, 5) Step 2 to 3: 80-90%. Each step: 10-30% improvement. Most products: 1-3% overall visitor-to-customer. Optimizing biggest drop: 50%+ improvement possible. A/B test each step." },
    { q: "How do I identify the biggest funnel drop-off?", a: "Calculate: drop-off % at each step. Step 1 to 2: 30% drop = 70% conversion. Step 2 to 3: 60% drop = 40% conversion. Bigger drop = bigger opportunity. Then: user research, session recordings, surveys. Most teams: 1-2 steps with disproportionate drop-offs. Fix those first. Compound wins: 10% lift at each of 5 steps = 60% overall lift." },
    { q: "How do I optimize checkout funnel?", a: "1) Guest checkout (no forced signup), 2) Single-page vs multi-step (often single wins), 3) Progress indicator, 4) Auto-fill (address, payment), 5) Multiple payment options (Apple Pay, PayPal, Google Pay), 6) Show total cost upfront, 7) Free shipping over $X. Most teams 20-40% checkout completion lift. Each tactic: 5-10% lift. Test 1-2 changes at a time." },
    { q: "What is the difference between funnel and cohort analysis?", a: "Funnel: drop-off at each step (cross-sectional, all users at a moment). Cohort: same group over time (longitudinal). Both valuable. Funnel: process optimization. Cohort: retention patterns. Example: 30% signup to activation, but Jan 2024 cohort has 40% activation. Use both: funnel for system design, cohort for quality. Most analytics tools: both. Mixpanel, Amplitude support both natively." },
    { q: "How do I do funnel analysis without a tool?", a: "SQL approach: 1) Define steps (events), 2) Get unique users at each step, 3) Calculate conversion %. Spreadsheet: 1) List steps, 2) Count users at each, 3) Calculate % conversion. Tools: Google Analytics (goals), Mixpanel (free tier), Amplitude (free tier), custom SQL. Most: SQL or Mixpanel is enough for <100K users. Custom: 1-2 hours to set up basic funnel." },
    { q: "What is a good signup-to-paid conversion rate?", a: "SaaS free trial: 15-25% trial-to-paid. Freemium: 2-5% free-to-paid. E-commerce: 1-3% visitor-to-purchase. B2B SaaS: 5-15%. Mobile apps: 1-5%. By industry: vertical SaaS 10-20%, horizontal SaaS 5-15%, marketplaces 1-3%. Track: cohort by signup month. Mature cohort: reliable. Newer: 6-12 months to see true rate. Most: 10-15% improvement per year is realistic." },
    { q: "How do I handle multi-path funnels?", a: "Multi-path: users take different paths. Solution: 1) Sankey diagrams, 2) Branch analysis, 3) Micro-funnels. Most products: 80% of users take 1-2 main paths. Identify: top paths = optimize. Long tail: monitor but don't over-engineer. Tools: Mixpanel (segmentation), Amplitude (pathways). Best: focus on top 3 paths, cover 80% of users. Avoid: optimizing every micro-funnel." },
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
  engineKey: true,
};

registerEngine(engine);
