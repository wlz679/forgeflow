// P11-3 Productivity Ramp Curve
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS People-ops persona ($10M-$50M ARR).
// Community-wisdom thresholds (Bersin by Deloitte + Andrew Chen Cold Start Problem + Reforge).
// 3 curve shapes: SlowStart (^2) / Linear / S-Curve (logistic).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-15：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 两端逐字节相同，不可能漂。
//   ⚠️ 兜底与 params **同源**（同一个局部变量）⇒ 英文页逐字不变（G9）、模板不冻结数值（G8）。
//   ⚠️ 命名空间必须精确等于 toolAlias(slug)（见 tests/scripts/p168-tokenized-engines.mjs）。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

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
    customFn: CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let l=function(t){return Number.isNaN(t)?0:Math.max(0,t)},h=function(t,r,o,e){const a=100-o;if(t<=0)return o;if(t>=r)return 100;if(e==="Linear")return o+a*(t/r);if(e==="SlowStart")return o+a*Math.pow(t/r,2);const c=12/r,s=r/2;return o+a/(1+Math.exp(-c*(t-s)))},i=function(t,r,o){for(let e=.1;e<=t*2;e+=.1)if(h(e,t,r,o)>=50)return Math.round(e*10)/10;return t},f=function(t){const r=t/100;return r<=n.excellent.threshold?"excellent":r<=n.good.threshold?"good":r<=n.warning.threshold?"warning":"critical"},p=function(t){return t.toFixed(1)+"%"},m=function(t){return"$"+Math.round(t).toLocaleString()},d=function(t,r,o){var e=w(t);return Array.isArray(e)?e.join(\`
\`):String(e)};var C=l,M=h,j=i,q=f,L=p,N=m,O=d,u=tk,b='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',u=new Function("return "+b)(),n={excellent:{threshold:.3,label:"🟢 Excellent",message:"Steep ramp — employee reaches P50 productivity in <30% of months_to_full."},good:{threshold:.5,label:"🟡 Good",message:"Healthy ramp — P50 reached at 30-50% of months_to_full (typical for S-Curve)."},warning:{threshold:.7,label:"🟠 Warning",message:"Slow ramp — P50 takes 50-70% of months_to_full. Onboarding likely needs scope/buddy support."},critical:{threshold:null,label:"🔴 Critical",message:"Very slow ramp — employee takes >70% of months_to_full to reach P50 productivity."}},w=function(t){const r=l(Number(t.months_to_full)||6),o=l(Number(t.starting_pct)||0),e=t.curve_shape||"S-Curve",a=l(Number(t.monthly_cost)||0),c=i(r,o,e),s=c/r,S=f(s*100),k=n[S],P=i(r,o,"Linear"),x=i(r,o,"SlowStart"),_=String(r),g=e,v=String(o),y=m(a);return["🩺 Ramp Health: "+k.label+" (P50 at month "+c+", "+p(s*100)+" of months_to_full)",u("calc_out.productivity_ramp_curve.row.snapshot","📊 Snapshot: "+_+"mo "+g+" curve · "+v+"% start · "+y+"/mo fully-loaded",{months:_,shape:g,start:v,monthly_cost:y}),"🔄 What-If: Linear curve hits P50 at same month ("+P+"); SlowStart hits P50 at month "+x.toFixed(1)+" (slower)","⚖️ Break-Even: to hit 🟢 Excellent (P50 ≤"+n.excellent.threshold*100+"% of months_to_full), use S-Curve with shorter months_to_full or pre-onboarding bootcamp","🎯 Milestone: At month "+Math.round(r/2)+" the hire should be at ~50% productivity — pair with [Time to Productivity Calculator] (P11-2) for ramp-weeks",u("calc_out.productivity_ramp_curve.row.tip","💡 Tip: S-Curve is realistic for knowledge work; SlowStart fits roles with heavy upfront training (sales, compliance, certifications).")]};return[d(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`,
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
    const monthsToFull = clampNonNegative(Number(inputs.months_to_full) || 6);
    const starting = clampNonNegative(Number(inputs.starting_pct) || 0);
    const shape = (inputs.curve_shape || 'S-Curve') as 'SlowStart' | 'Linear' | 'S-Curve';
    const monthlyCost = clampNonNegative(Number(inputs.monthly_cost) || 0);
    const p50Month = findP50Month(monthsToFull, starting, shape);
    const p50Pct = p50Month / monthsToFull;
    const band = calcHealthBand(p50Pct * 100); // pass as percentage (0-100)
    const bandInfo = HEALTH_BANDS[band];
    const linearP50 = findP50Month(monthsToFull, starting, 'Linear');
    const slowP50 = findP50Month(monthsToFull, starting, 'SlowStart');
    const monthsLabel = String(monthsToFull);
    const shapeLabel = shape;
    const startLabel = String(starting);
    const monthlyCostLabel = fmtMoney(monthlyCost);
    return [
      '🩺 Ramp Health: ' + bandInfo.label + ' (P50 at month ' + p50Month + ', ' + fmtPct(p50Pct * 100) + ' of months_to_full)',
      makeToken(
        'calc_out.productivity_ramp_curve.row.snapshot',
        '📊 Snapshot: ' + monthsLabel + 'mo ' + shapeLabel + ' curve · ' + startLabel + '% start · ' + monthlyCostLabel + '/mo fully-loaded',
        { months: monthsLabel, shape: shapeLabel, start: startLabel, monthly_cost: monthlyCostLabel },
      ),
      '🔄 What-If: Linear curve hits P50 at same month (' + linearP50 + '); SlowStart hits P50 at month ' + slowP50.toFixed(1) + ' (slower)',
      '⚖️ Break-Even: to hit 🟢 Excellent (P50 ≤' + (HEALTH_BANDS.excellent.threshold * 100) + '% of months_to_full), use S-Curve with shorter months_to_full or pre-onboarding bootcamp',
      '🎯 Milestone: At month ' + Math.round(monthsToFull / 2) + ' the hire should be at ~50% productivity — pair with [Time to Productivity Calculator] (P11-2) for ramp-weeks',
      makeToken(
        'calc_out.productivity_ramp_curve.row.tip',
        '💡 Tip: S-Curve is realistic for knowledge work; SlowStart fits roles with heavy upfront training (sales, compliance, certifications).',
      ),
    ];
  },
  staticExamples: [
    '🩺 Ramp Health: 🟡 Good (P50 at month 3, 50.0% of months_to_full)\n$calc_out.productivity_ramp_curve.row.snapshot{"months":"6","shape":"S-Curve","start":"0","monthly_cost":"$14,833"}|📊 Snapshot: 6mo S-Curve curve · 0% start · $14,833/mo fully-loaded|\n🔄 What-If: Linear curve hits P50 at same month (3); SlowStart hits P50 at month 4.3 (slower)\n⚖️ Break-Even: to hit 🟢 Excellent (P50 ≤30% of months_to_full), use S-Curve with shorter months_to_full or pre-onboarding bootcamp\n🎯 Milestone: At month 3 the hire should be at ~50% productivity — pair with [Time to Productivity Calculator] (P11-2) for ramp-weeks\n$calc_out.productivity_ramp_curve.row.tip|💡 Tip: S-Curve is realistic for knowledge work; SlowStart fits roles with heavy upfront training (sales, compliance, certifications).|',
  ],
  faq: [
    { q: 'Which curve shape should I pick?', a: 'S-Curve is realistic for most knowledge work (engineering, PM, design, marketing) — slow start while learning, accelerating as they ramp. Linear is the simplest baseline. SlowStart fits roles with heavy upfront training (sales bootcamp, compliance certification, equipment training).' },
    { q: 'What does "P50" mean here?', a: 'P50 = the month at which the hire reaches 50% of full productivity. Lower P50 = steeper ramp = better. A 6-month ramp where P50 hits at month 3 (50% of months_to_full) is a healthy S-Curve. If P50 hits at month 5 (83% of months_to_full), the curve is too flat.' },
    { q: 'How is this different from P11-2 (Ramp Time)?', a: 'P11-2 measures HOW LONG until first productivity (a single time-to-event). P11-3 models the CURVE — productivity as a function of time. P11-3 is the projection tool; P11-2 is the milestone marker.' },
    { q: 'Can I use real productivity data to fit the curve?', a: 'Yes — pull your HRIS for monthly performance review scores, deploy velocity, or OKR completion rate. Fit the parameters (months_to_full, starting_pct) to minimize RMSE against actual data. P11-3 defaults are reasonable starting points, not the law.' },
    { q: 'Does this include ramp cost?', a: 'Not directly. P11-3 outputs a productivity curve; cost is the input (monthly_cost). For total ramp cost (cost × non-productive fraction), pair with our [Fully-Loaded Employee Cost Calculator] (P11-1) and [Attrition Cost Calculator] (P11-6).' },
    { q: 'What if my hire starts at >0%?', a: 'Internal transfers, promotions, and rehires often have non-zero starting productivity. Set starting_pct to your best estimate (e.g. 30% for a promoted IC who already knows the codebase). The curve then ramps from there to 100%.' },
    { q: "How long does it take for a new hire to be fully productive?", a: "Benchmarks: engineers 3-6 months to full productivity. Sales reps 6-12 months. Customer success 3-6 months. Marketing 2-4 months. Senior ICs: 6-12 months. Executives: 12-18 months. New managers: 6-12 months. First 30 days: 50% productive. 90 days: 70%. 6 months: 85-90%. 12 months: 100%." },
    { q: "What is the typical ramp curve shape?", a: "S-curve: slow start (first 30 days), acceleration (months 1-3), plateau (months 3-6), full productivity (months 6-12). The first month is the steepest learning curve. Months 1-3: biggest delta. Months 6-12: mostly autonomy. Track monthly productivity vs. fully-loaded day 1." },
    { q: "How do I accelerate ramp time?", a: "Top tactics: 1) Structured onboarding (first 30 days plan), 2) Buddy/mentor system, 3) Pre-onboarding (laptop, accounts, docs sent week before), 4) Clear first-month projects, 5) Manager 1:1 twice weekly at first, 6) Documentation-first culture. Most teams cut ramp by 20-30% with these." },
    { q: "What is the cost of ramp time?", a: "For a new hire at $100K salary with 6-month ramp: 50% productivity for 3 months = $25K lost productivity. Add: recruiting $20K, onboarding $5K, training $5K. Total cost of ramp: $50K-60K. Same calculation for all new hires. Plan for ramp cost in hiring budget. Investors expect this in burn rate." },
    { q: "How does ramp vary by role and seniority?", a: "Junior ICs: 3-6 months. Senior ICs: 6-9 months. Managers: 6-12 months. Senior managers: 9-15 months. VPs: 12-18 months. C-suite: 12-24 months. Specialized roles (AI, security): 6-12 months. Generic roles (admin, support): 1-3 months. The more specialized, the longer the ramp. Plan for return on investment." },
    { q: "How do I measure productivity ramp?", a: "Track 1) Output vs. senior peers (story points, tickets, design output), 2) Quality (bugs, customer feedback), 3) Velocity over time (PRs/week, calls/week), 4) Independence (questions asked, decisions made). Use weekly check-ins, monthly review, peer feedback. Aim for 70% by month 3, 90% by month 6." },
    { q: "What is the difference between ramp time and time-to-productivity?", a: "Ramp time: full productivity (90%+). Time-to-productivity: first meaningful output (basic tasks). Time-to-productivity: 1-4 weeks. Ramp time: 3-12 months. Track both. New hires need quick wins to feel successful. Set early goals: first PR, first customer call, first design review. Celebrate early wins." },
    { q: "How do I plan hiring budget with ramp time?", a: "Plan: 50% productivity for 3 months, 70% for 3 months, 90% from month 6. Cost: hire month 1 = full salary + 50% productivity cost. Sales: 6-month ramp = 50% of quota average. Engineers: 3-month ramp = 75% productivity on average. Bake into hiring budget. Investors expect this. Communicate ramp cost in board meetings." },
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
  engineKey: true,
};
registerEngine(engine);
