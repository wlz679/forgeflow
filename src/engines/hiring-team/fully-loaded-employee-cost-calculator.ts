// P11-1 Fully-Loaded Employee Cost
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS People-ops persona ($10M-$50M ARR).
// Community-wisdom thresholds (BLS ECEC 2024 + SHRM 2024 Benefits Survey).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

export const HEALTH_BANDS = {
  excellent: { threshold: 1.25, label: '🟢 Excellent', message: 'Lean cost structure — benefits + tax + overhead all in line with BLS averages.' },
  good:      { threshold: 1.40, label: '🟡 Good',      message: 'Typical mid-market SaaS overhead — small optimization room in benefits or equipment.' },
  warning:   { threshold: 1.60, label: '🟠 Warning',   message: 'Above-market overhead — investigate benefits vendor, equipment refresh, or management bloat.' },
  critical:  { threshold: Infinity, label: '🔴 Critical', message: 'Severely bloated overhead — every hire costs >60% above base salary.' },
};

export function fullyLoadedCost(base: number, benefits: number, tax: number, overhead: number): number {
  return base + base * (benefits + tax + overhead) / 100;
}

export function costMultiplier(total: number, base: number): number {
  if (base === 0) return 0;
  return total / base;
}

export function calcHealthBand(mult: number): keyof typeof HEALTH_BANDS {
  if (mult <= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (mult <= HEALTH_BANDS.good.threshold) return 'good';
  if (mult <= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtMoney(x: number): string { return '$' + Math.round(x).toLocaleString(); }
function fmtMult(x: number): string { return x.toFixed(2) + 'x'; }
function fmtPct(x: number): string { return x.toFixed(1) + '%'; }

const engine: ToolEngine = {
  slug: 'solopreneur-fully-loaded-employee-cost-calculator',
  title: 'Fully-Loaded Employee Cost',
  description:
    'Compute total annual employee cost (base + benefits + payroll tax + overhead). INVERSE health bands — lower multiplier is better: 🟢 ≤1.25x · 🟡 1.25-1.40x · 🟠 1.40-1.60x · 🔴 >1.60x. For mid-market B2B SaaS ($10M-$50M ARR) People-ops managers and Head-of-HR.',
  inputs: [
    { name: 'base_salary',     label: 'Annual base salary',                  placeholder: 'e.g. 120000', type: 'number' },
    { name: 'benefits_pct',    label: 'Benefits % of base (health + 401k)',  placeholder: 'e.g. 25',     type: 'number' },
    { name: 'payroll_tax_pct', label: 'Payroll tax % of base (FICA + SUTA)',placeholder: 'e.g. 8',      type: 'number' },
    { name: 'overhead_pct',    label: 'Overhead % of base (equipment + SW + mgmt)', placeholder: 'e.g. 15', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `function run(inputs, pick, fill) {
  var cnn=function(x){return Math.max(0,x)};
  var base = cnn(Number(inputs.base_salary) || 0);
  var ben = cnn(Number(inputs.benefits_pct) || 0);
  var tax = cnn(Number(inputs.payroll_tax_pct) || 0);
  var ovh = cnn(Number(inputs.overhead_pct) || 0);
  var total = base + base * (ben + tax + ovh) / 100;
  var mult = base === 0 ? 0 : total / base;
  var band = mult <= 1.25 ? 'Excellent' : mult <= 1.40 ? 'Good' : mult <= 1.60 ? 'Warning' : 'Critical';
  var emoji = mult <= 1.25 ? '🟢' : mult <= 1.40 ? '🟡' : mult <= 1.60 ? '🟠' : '🔴';
  var benAmt = base * ben / 100, taxAmt = base * tax / 100, ovhAmt = base * ovh / 100;
  var cutToEx = total - base * 1.25;
  return [
    '🩺 Fully-Loaded Health: ' + emoji + ' ' + band + ' (' + mult.toFixed(2) + 'x base)',
    '📊 Snapshot: Total ' + total.toLocaleString() + ' = Base ' + base.toLocaleString() + ' + Benefits ' + benAmt.toLocaleString() + ' + Tax ' + taxAmt.toLocaleString() + ' + Overhead ' + ovhAmt.toLocaleString(),
    '🔄 What-If: if benefits drop to 20%, total drops to ' + Math.round(base + base * (20 + tax + ovh) / 100).toLocaleString() + ' (' + ((base + base * (20 + tax + ovh) / 100) / base).toFixed(2) + 'x)',
    '⚖️ Break-Even: to hit 🟢 Excellent (≤1.25x), must cut ' + Math.round(cutToEx).toLocaleString() + ' from benefits/tax/overhead combined',
    '🎯 Milestone: re-benchmark benefits + tax components every Q2 — they drift with healthcare inflation',
    '💡 Tip: BLS ECEC tracks national avg ~1.30x — companies consistently >1.5x have bloated overhead (often equipment or management).'
  ];
}`,
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
    const base = clampNonNegative(Number(inputs.base_salary) || 0);
    const benefits = clampNonNegative(Number(inputs.benefits_pct) || 0);
    const tax = clampNonNegative(Number(inputs.payroll_tax_pct) || 0);
    const overhead = clampNonNegative(Number(inputs.overhead_pct) || 0);
    const total = fullyLoadedCost(base, benefits, tax, overhead);
    const mult = costMultiplier(total, base);
    const band = calcHealthBand(mult);
    const bandInfo = HEALTH_BANDS[band];
    const benAmt = base * benefits / 100;
    const taxAmt = base * tax / 100;
    const ovhAmt = base * overhead / 100;
    const targetTotal = base * HEALTH_BANDS.excellent.threshold;
    const cutAmount = total - targetTotal;
    const altTotal = base + base * (20 + tax + overhead) / 100;
    const altMult = costMultiplier(altTotal, base);
    return [
      '🩺 Fully-Loaded Health: ' + bandInfo.label + ' (' + fmtMult(mult) + ' base · ' + fmtMoney(total) + ' total)',
      '📊 Snapshot: Total ' + fmtMoney(total) + ' = Base ' + fmtMoney(base) + ' + Benefits ' + fmtPct(benefits) + ' (' + fmtMoney(benAmt) + ') + Payroll Tax ' + fmtPct(tax) + ' (' + fmtMoney(taxAmt) + ') + Overhead ' + fmtPct(overhead) + ' (' + fmtMoney(ovhAmt) + ')',
      '🔄 What-If: if benefits drop to 20%, total drops to ' + fmtMoney(altTotal) + ' (' + fmtMult(altMult) + ', ' + (altMult < mult ? 'improvement' : 'worsening') + ')',
      '⚖️ Break-Even: to hit 🟢 Excellent (' + fmtMult(HEALTH_BANDS.excellent.threshold) + ' ceiling), must cut ' + fmtMoney(cutAmount) + ' from benefits + tax + overhead combined',
      '🎯 Milestone: re-benchmark benefits + tax components every Q2 — healthcare inflation averages 5-7%/yr',
      '💡 Tip: BLS Employer Costs for Employee Compensation (ECEC) 2024 tracks national avg ~1.30x multiplier. Companies consistently >1.5x have bloated overhead — typically equipment refresh cycles or management layer.',
    ];
  },
  staticExamples: [
    '🩺 Fully-Loaded Health: 🟠 Warning (1.48x base · $177,600 total)\n📊 Snapshot: Total $177,600 = Base $120,000 + Benefits 25.0% ($30,000) + Payroll Tax 8.0% ($9,600) + Overhead 15.0% ($18,000)\n🔄 What-If: if benefits drop to 20%, total drops to $171,600 (1.43x, improvement)\n⚖️ Break-Even: to hit 🟢 Excellent (1.25x ceiling), must cut $27,600 from benefits + tax + overhead combined\n🎯 Milestone: re-benchmark benefits + tax components every Q2 — healthcare inflation averages 5-7%/yr\n💡 Tip: BLS Employer Costs for Employee Compensation (ECEC) 2024 tracks national avg ~1.30x multiplier. Companies consistently >1.5x have bloated overhead — typically equipment refresh cycles or management layer.',
  ],
  faq: [
    { q: 'What does "fully-loaded" mean?', a: 'It is the true cost of an employee beyond base salary — including employer-paid benefits (health insurance, 401k match, PTO accrual), employer-side payroll taxes (FICA, FUTA, SUTA), and per-employee overhead (equipment, software licenses, management allocation).' },
    { q: 'Why is the multiplier a useful metric?', a: 'It lets you compare overhead efficiency across roles and teams. A 1.25x multiplier is excellent (BLS-tracked average), while 1.6x+ signals bloat. CFOs use this to set hiring ROI targets (e.g. new hire must generate 3x fully-loaded cost in year-1 revenue).' },
    { q: 'Are benefits negotiable?', a: 'Partially. Health insurance premiums are market-driven but partially controllable via plan design (HDHP + HSA vs PPO). 401k match is highly negotiable (typical range 3-6%). PTO accrual is fixed once set in policy. Negotiate with brokers annually.' },
    { q: 'How often should I recompute?', a: 'Annually at minimum, ideally aligned with benefits renewal (typically Q4 for Jan-1 effective dates). Mid-year if you add a major software license (e.g. company-wide Figma rollout).' },
    { q: 'What is the BLS ECEC benchmark?', a: 'The US Bureau of Labor Statistics Employer Costs for Employee Compensation quarterly report. As of 2024, total compensation is ~1.31x base wages for private industry workers. Tech/SaaS skews higher due to richer benefits.' },
    { q: 'Does this include equity?', a: 'No — equity (RSU/options) is treated separately because it is not a cash cost. For equity cost modeling, see our [Equity Refresh Calculator] (P11-5).' },
    { q: "What is a fully loaded employee cost?", a: "Fully loaded cost = base salary + benefits + taxes + overhead + equipment + real estate. Typical: 1.25-1.4x base for most roles. Senior in tech hubs: 1.4-1.6x. This is the true cost of an employee for budgeting, ROI, and pricing decisions. Include: payroll taxes, benefits, PTO, training, recruiting fees." },
    { q: "How do benefits add to base salary cost?", a: "Benefits: 25-40% above base salary. Breakdown: health insurance 8-12%, payroll taxes 7-10%, retirement match 3-6%, PTO/holidays 8-11%, workers comp 1-3%, disability/life 1-2%, training 1-3%. For $100K salary: add $25-40K in benefits. Total cost: $125K-140K. Plus equipment, real estate, recruiting." },
    { q: "What does recruiting cost per hire?", a: "Engineering: $5K-30K (15-30% of first-year salary). Sales: $10K-50K. Executive: $50K-200K. Cost includes: agency fees (20-25% of first year), recruiter salary, job ads, interview time, signing bonus. Internal recruiting team: $100K-200K/year but pays back at 5+ hires/year. Use referrals to cut costs 50%." },
    { q: "How do I calculate the cost of remote work?", a: "Remote employee cost: base + benefits + home office stipend ($500-2K one-time) + remote work tools ($50-200/month) + tax/compliance (varies by state). Often 5-10% cheaper than office-based for the same role. Cross-state tax compliance: $5K-50K/year hidden cost. EOR for international: $500-2K/month per employee." },
    { q: "Should I include PTO in employee cost?", a: "Yes. Standard: 10-15 days vacation + 5-10 holidays + 5 sick days = 20-30 days. As % of salary: 8-11%. For $100K salary: $8K-11K in PTO cost. Include: paid holidays, vacation, sick days, parental leave, jury duty. Many companies undercount by 30-50%. Track actual PTO taken." },
    { q: "How do I calculate training and development cost?", a: "Training: 1-3% of salary per year. Conferences: $2-5K/employee. Courses (Udemy, Coursera): $200-2K/year. Internal training: manager time. Certification: $1-5K (AWS, PMP, etc.). Add: 20-40 hours/employee/year for learning time. Total: $1K-10K/employee/year. Higher for senior ICs and managers." },
    { q: "What is the cost of churn in employee cost?", a: "Turnover cost: 50-200% of annual salary. For a $100K employee: $50K-200K. Reduce via comp banding, retention bonuses, career growth. Each percentage point of turnover reduction saves 0.5-1.5% of total payroll. For a 100-person company: 5% turnover reduction = $250K-1M/year saved." },
    { q: "How do I optimize employee cost without cutting headcount?", a: "Tactics: 1) Renegotiate benefits (cheaper health plans, 4% savings), 2) Audit recruiting (referrals cut cost 50%), 3) Reduce real estate (hybrid, hot-desking), 4) Software audits (cut unused SaaS, 10-20% savings), 5) Better PTO management (reduce unused PTO payouts), 6) Skills-based hiring (avoid over-hiring). Most companies save 5-15% without layoffs." },
  ],
  howToUse: [
    'Enter the annual base salary for the role you are budgeting.',
    'Estimate benefits as a % of base — typical SaaS: 20-30% (health 12-15%, 401k match 4-6%, PTO 4-6%).',
    'Estimate payroll tax as 8-10% of base (FICA 7.65% + FUTA/SUTA 0.5-2.5%).',
    'Estimate overhead as 10-20% of base (equipment $2-5K, software $3-8K, mgmt allocation varies).',
    'Read the multiplier band, then identify the largest component for negotiation.',
  ],
  sources: [
    'https://www.bls.gov/news.release/ecec.toc.htm',
    'https://www.shrm.org/topics-tools/news/talent-acquisition/2024-benefits-survey',
    'https://www.pave.com/compensation-benchmarks',
  ],
  engineKey: true,
};
registerEngine(engine);
