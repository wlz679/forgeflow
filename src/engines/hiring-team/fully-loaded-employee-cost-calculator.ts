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
};
registerEngine(engine);
