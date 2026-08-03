import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

// ─── Math helpers ─────────────────────────────────────────────────────────

export function renewalRate(arrRenewed: number, arrUpForRenewal: number): number {
  if (arrUpForRenewal <= 0) return 0;
  return arrRenewed / arrUpForRenewal;
}

// ─── Health bands ─────────────────────────────────────────────────────────

export const HEALTH_BANDS = {
  excellent: { label: '🟢 Excellent', threshold: 0.90, message: "World-class gross retention — best-in-class SaaS renews 90%+ of ARR." },
  good:      { label: '🟡 Good',      threshold: 0.80, message: "Healthy renewal rate; mid-market SaaS median is around 85% — you're on track." },
  warning:   { label: '🟠 Warning',   threshold: 0.70, message: "Below median — investigate churn drivers and customer success coverage." },
  critical:  { label: '🔴 Critical',  threshold: 0,    message: "Severe revenue leakage — major CS intervention required before next renewal cycle." },
} as const;

export type HealthBandKey = keyof typeof HEALTH_BANDS;

export function calcHealthBand(rate: number): HealthBandKey {
  if (rate >= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (rate >= HEALTH_BANDS.good.threshold) return 'good';
  if (rate >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

// ─── Engine ────────────────────────────────────────────────────────────────

const engine: ToolEngine = {
  slug: 'solopreneur-renewal-rate-calculator',
  title: 'Renewal Rate Calculator',
  description: 'Measure the share of contracted ARR that successfully renewed this cycle — the cleanest read on whether customers stay or leave when their contract comes up.',
  category: 'retention',
  version: '1.0.0',
  inputs: [
    { name: 'arrUpForRenewal',  label: 'ARR up for renewal ($)',   type: 'number', default: 1_000_000, min: 0, step: 50_000, hint: 'Total annual recurring revenue on contracts that came up for renewal in the period.' },
    { name: 'arrRenewed',       label: 'ARR renewed ($)',          type: 'number', default: 850_000,   min: 0, step: 50_000, hint: 'Of the up-for-renewal ARR, how much actually renewed (excludes expansion, which is captured separately by NRR/GRR).' },
  ],
  generate(inputs) {
    const arrUpForRenewal = clampNonNegative(Number(inputs.arrUpForRenewal) || 0);
    const arrRenewed = clampNonNegative(Number(inputs.arrRenewed) || 0);
    const rate = renewalRate(arrRenewed, arrUpForRenewal);
    const band = calcHealthBand(rate);
    const bandInfo = HEALTH_BANDS[band];

    const fmt = formatCurrency;

    return [
      '🩺 Renewal Rate Health: ' + bandInfo.label + ' (' + (rate * 100).toFixed(1) + '%)',
      '📊 Snapshot: ' + fmt(arrRenewed) + ' of ' + fmt(arrUpForRenewal) + ' up-for-renewal ARR renewed.',
      '🔄 What-If: Each +5pp in renewal rate recovers ' + fmt(arrUpForRenewal * 0.05) + ' of ARR; a 90% target would lift renewed ARR to ' + fmt(arrUpForRenewal * 0.90) + '.',
      '⚖️ Break-Even: To hit 90% (world-class), you need ' + fmt(arrUpForRenewal * 0.90 - arrRenewed) + ' more renewed ARR.',
      '🎯 Milestone: Move from ' + (rate * 100).toFixed(1) + '% → 80% (good band) requires retaining ' + fmt(arrUpForRenewal * 0.80 - arrRenewed) + ' more; → 90% requires ' + fmt(arrUpForRenewal * 0.90 - arrRenewed) + ' more.',
      '💡 Tip: Renewal rate is the cleanest gross retention signal — GRR folds in downgrades and churn; renewal rate isolates the renewal decision itself. Pair with [[solopreneur-grr-calculator]] to see the full gross retention picture, and [[solopreneur-nrr-calculator]] to capture expansion impact.',
    ];
  },
  staticExamples: [
    '🩺 Renewal Rate Health: 🟡 Good (85.0%)\n📊 Snapshot: $850,000 of $1,000,000 up-for-renewal ARR renewed.\n🔄 What-If: Each +5pp in renewal rate recovers $50,000 of ARR; a 90% target would lift renewed ARR to $900,000.\n⚖️ Break-Even: To hit 90% (world-class), you need $50,000 more renewed ARR.\n🎯 Milestone: Move from 85.0% → 80% (good band) requires retaining $-50,000 more; → 90% requires $50,000 more.\n💡 Tip: Renewal rate is the cleanest gross retention signal — GRR folds in downgrades and churn; renewal rate isolates the renewal decision itself. Pair with [[solopreneur-grr-calculator]] to see the full gross retention picture, and [[solopreneur-nrr-calculator]] to capture expansion impact.',
    '📊 Snapshot: $850,000 of $1,000,000 up-for-renewal ARR renewed.',
    '🔄 What-If: Each +5pp in renewal rate recovers $50,000 of ARR; a 90% target would lift renewed ARR to $900,000.',
    '⚖️ Break-Even: To hit 90% (world-class), you need $50,000 more renewed ARR.',
    '🎯 Milestone: Move from 85.0% → 80% (good band) requires retaining $0 more; → 90% requires $50,000 more.',
    '💡 Tip: Renewal rate is the cleanest gross retention signal — GRR folds in downgrades and churn; renewal rate isolates the renewal decision itself. Pair with [[solopreneur-grr-calculator]] to see the full gross retention picture, and [[solopreneur-nrr-calculator]] to capture expansion impact.',
  ],
  faq: [
    { q: 'What is a good renewal rate for B2B SaaS?', a: 'Top-quartile B2B SaaS renews 90%+ of ARR (net of churn). Mid-market median sits around 85%. Below 80% is a warning sign of CS or product-market-fit issues; below 70% is critical.' },
    { q: 'How is renewal rate different from gross retention rate (GRR)?', a: 'Renewal rate only counts whether the contract was renewed, ignoring mid-cycle downgrades and expansions. GRR folds in downgrades and lost customers, giving a more comprehensive (but lower) view of retention. Use both: renewal rate for the renewal motion itself, GRR for the full retention picture.' },
    { q: 'Should expansion revenue be counted in the renewal rate?', a: 'No — renewal rate is intentionally gross: it isolates whether the contract renewed, not whether it grew. Expansion belongs in net metrics like NRR or net revenue retention. Counting expansion in renewal rate inflates the number and hides the underlying renewal motion.' },
    { q: 'How often should I measure renewal rate?', a: 'Quarterly is standard for B2B SaaS with annual contracts — each quarter captures a new cohort that came up for renewal. Monthly measurement works only if you have enough contracts renewing each month to be statistically meaningful (typically $1M+ in monthly up-for-renewal ARR).' },
    { q: 'What drives a low renewal rate?', a: 'Common causes: poor product-market fit (customers do not see ongoing value), weak customer success coverage (no proactive renewal motion), pricing misalignment (cost vs perceived value), competitive displacement, and budget cuts at the customer. Diagnose by exit-interviewing churned accounts and surveying renewed ones.' },
    { q: 'Can I use renewal rate for monthly or quarterly contracts?', a: 'Yes — the same math applies at any cadence: contracts renewed / contracts up for renewal. For monthly contracts, measure monthly; for annual, measure annually or quarterly with a rolling 12-month cohort. The denominator is whatever set of contracts came up for renewal in the period.' },
    { q: "What is a good renewal rate for SaaS?", a: "Benchmarks: 1) Gross renewal: 80-90% is good, 90%+ excellent, 2) Net renewal (with expansion): 100-110% is healthy, 110-120% excellent. By segment: SMB 70-85%, mid-market 85-95%, enterprise 95%+. By industry: vertical SaaS 95%+, horizontal 85-90%. Most: 85%+ gross. Top: 95%+. Track: monthly cohort, TTM (trailing 12 months)." },
    { q: "What is the difference between gross and net renewal rate?", a: "Gross renewal: % of customers who renew (count, not revenue). Net renewal: % of revenue retained (with expansion). Example: 100 customers, 90 renew, $5K → $6K each: gross 90%, net 108%. Net is more important for revenue. Gross for customer count. Most: track both. Net: 100%+ = growth without new sales. Gross: 90%+ = healthy retention." },
    { q: "How do I improve renewal rates?", a: "Top tactics: 1) Proactive customer success (1:1 QBRs), 2) Value realization (track outcomes), 3) Renewal process (90 days out), 4) Executive alignment, 5) Adoption programs, 6) Risk scoring. Most teams: 5-15 pp improvement. Aim: 90%+ gross. CSM impact: 1 FTE per $1-2M ARR. Best: align CSM comp to renewals (not just satisfaction). Top performers: 95%+ gross." },
    { q: "When should I start the renewal process?", a: "Best practice: 90-120 days before renewal. Process: 1) 120 days: health check, 2) 90 days: review usage + value, 3) 60 days: renewal conversation, 4) 30 days: terms, 5) Day 0: close. Most: 60-90 days start. Critical: align with annual planning. Late: hard to retain. CSM: 30-50% retention lift with proactive process. Tools: Gainsight, ChurnZero, custom." },
    { q: "What are the top reasons for non-renewal?", a: "Top 5: 1) Not seeing value (40-50%), 2) Budget (15-20%), 3) Switching to competitor (15-20%), 4) Company downsized/changed (10-15%), 5) Bad support (5-10%). Address: 1) Value realization, 2) ROI documentation, 3) Competitive intel, 4) Account changes, 5) CSAT. Most: 50%+ of non-renewal is preventable. Track: exit interview data. Improve weakest area first." },
    { q: "Should I discount for renewal?", a: "Tactic-dependent. Avoid: 1) Discounting without value conversation (signals weakness), 2) Same discount every year (entitlement), 3) Large discounts (>20%). Use: 1) Multi-year lock (10-15% off), 2) Price increase with notice, 3) Bundled services, 4) Renewal for term extension. Best: never discount on renewal alone. Increase value. Most: 5-10% of renewals get small discounts. Top performers: 1-3%." },
    { q: "What is a healthy renewal pipeline?", a: "Pipeline: 1) All renewals 90+ days out, 2) Categorized by risk (high/med/low), 3) Assigned to CSM, 4) Tracked in CRM. Healthy: 80% low-risk, 15% medium, 5% high. Most: 60-70% low-risk, 20-30% medium, 10-15% high. Tools: Gainsight, ChurnZero, custom spreadsheet. Review weekly. Goal: 90%+ of renewals in low-risk by 60 days out. Track conversion by risk." },
    { q: "How is renewal rate related to NRR?", a: "Renewal rate is a component of NRR. NRR = (renewals + expansion - churn) / start. Renewal rate alone: % of customers who renew. NRR: % of revenue retained + expanded. If 90% renew at same price: GRR 90%. If expansion adds 15%: NRR 105%. Strong NRR: high renewal + strong expansion. Aim: 90%+ gross renewal + 15% expansion = 105% NRR. Most SaaS: 100-110% NRR target." },
  ],
  howToUse: [
    'Enter the total ARR on contracts that came up for renewal in the period (e.g., this quarter).',
    'Enter the ARR on contracts that actually renewed — exclude expansion (upsell/cross-sell) since that belongs in NRR.',
    'Read the health band: 🟢 ≥90% is world-class, 🟡 80-90% is healthy, 🟠 70-80% is a warning, 🔴 <70% is critical.',
    'Use the What-If section to model the ARR impact of moving up 5 percentage points at a time.',
    'Pair with GRR (for full gross retention) and NRR (for net retention including expansion) to see the full retention picture.',
  ],
  sources: [
    { label: 'OpenView 2024 SaaS Benchmarks — Net Retention by ARR Band', url: 'https://openviewpartners.com/blog/saas-benchmarks/' },
    { label: 'ICONIQ Growth 2024 — SaaS Retention Metrics', url: 'https://iconiqcapital.com/growth/saas-retention-metrics' },
    { label: 'SaaS Capital — Retention Benchmark Study', url: 'https://www.saascapital.com/insights-private-company-benchmarks' },
  ],
  // customFn is attached via the `engine.clientConfig = { ..., customFn }` rewrite below.
  // (Declaring `customFn: ''` here as a placeholder would need `customFn?: string` on
  // ToolEngine, but the literal placeholder is dead code — clientConfig is overwritten
  // immediately after registerEngine() reads the literal at module init.)
  clientConfig: { type: 'custom', wordPools: {}, customFn: '' },
  engineKey: true,
};

function formatCurrency(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}

// ─── Minimal live customFn (computed in browser; mirrors calculate math) ───

const customFn = "var cnn=function(x){return Math.max(0,x)};const up=cnn(Number(inputs.arrUpForRenewal)||0);const renewed=cnn(Number(inputs.arrRenewed)||0);const rate=up>0?renewed/up:0;let band='critical';if(rate>=0.90)band='excellent';else if(rate>=0.80)band='good';else if(rate>=0.70)band='warning';const pct=(rate*100).toFixed(1)+'%';const BAND_LABEL={excellent:'🟢 Excellent',good:'🟡 Good',warning:'🟠 Warning',critical:'🔴 Critical'};const fmt=n=>'$'+Math.round(n).toLocaleString('en-US');return['🩺 Renewal Rate Health: '+BAND_LABEL[band]+' ('+pct+')','📊 Snapshot: '+fmt(renewed)+' of '+fmt(up)+' up-for-renewal ARR renewed.','🔄 What-If: Each +5pp recovers '+fmt(up*0.05)+'; 90% target lifts renewed to '+fmt(up*0.90)+'.','⚖️ Break-Even: To hit 90%, need '+fmt(up*0.90-renewed)+' more renewed ARR.','🎯 Milestone: → 80% needs '+fmt(up*0.80-renewed)+' more; → 90% needs '+fmt(up*0.90-renewed)+' more.','💡 Tip: Pair with [[solopreneur-grr-calculator]] for full gross retention and [[solopreneur-nrr-calculator]] for expansion impact.',];";
engine.clientConfig = { type: 'custom', wordPools: {}, customFn };

registerEngine(engine);

export { engine, customFn };

