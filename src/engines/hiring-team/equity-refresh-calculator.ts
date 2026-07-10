// P11-5 Equity Refresh Grant
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS People-ops persona ($10M-$50M ARR).
// Community-wisdom thresholds (Pave 2024 equity refresh benchmarks + Carta equity data + YC People Ops playbook).
// HIGHER band direction — more dilution = more retention signal = better.
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

export const HEALTH_BANDS = {
  excellent: { threshold: 0.20, label: '🟢 Excellent', message: 'Top-quartile refresh — strong retention signal, employee sees real upside.' },
  good:      { threshold: 0.10, label: '🟡 Good',      message: 'Solid refresh grant — competitive with market, retains key employees.' },
  warning:   { threshold: 0.05, label: '🟠 Warning',   message: 'Below market — employee may not see meaningful upside vs. original grant.' },
  critical:  { threshold: -Infinity, label: '🔴 Critical', message: 'Trivial refresh — retention risk; employee likely shopping for new equity.' },
};

const ROLE_TARGET_PCT: Record<'High' | 'Med' | 'Low', number> = {
  High: 0.15,
  Med: 0.08,
  Low: 0.03,
};

export function refreshGrant(currentShares: number, yearsSinceGrant: number, refreshPoolPct: number, totalCompanyShares: number, roleCriticality: 'High' | 'Med' | 'Low'): { shares: number; dilutionPct: number } {
  const poolSize = totalCompanyShares * refreshPoolPct / 100;
  const roleTargetPct = ROLE_TARGET_PCT[roleCriticality];
  const yearsFactor = yearsSinceGrant >= 4 ? 1.0 : 1.0 + (4 - yearsSinceGrant) / 4;
  const shares = Math.round(poolSize * roleTargetPct * yearsFactor);
  const dilutionPct = totalCompanyShares === 0 ? 0 : shares / totalCompanyShares * 100;
  return { shares, dilutionPct };
}

export function calcHealthBand(dilutionPct: number): keyof typeof HEALTH_BANDS {
  if (dilutionPct >= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (dilutionPct >= HEALTH_BANDS.good.threshold) return 'good';
  if (dilutionPct >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtMoney(x: number): string { return '$' + Math.round(x).toLocaleString(); }
function fmtPct(x: number): string { return x.toFixed(2) + '%'; }
function fmtShares(x: number): string { return x.toLocaleString() + ' shares'; }

const engine: ToolEngine = {
  slug: 'solopreneur-equity-refresh-calculator',
  title: 'Equity Refresh Grant',
  description:
    'Compute the recommended equity refresh grant (shares + dilution %) for a key employee based on the company refresh pool, role criticality, and time since original grant. HIGHER health bands — more dilution is better (stronger retention signal): 🟢 ≥0.20% · 🟡 0.10-0.20% · 🟠 0.05-0.10% · 🔴 <0.05%. For mid-market B2B SaaS ($10M-$50M ARR) People-ops managers and Head-of-HR.',
  inputs: [
    { name: 'current_shares',       label: 'Employee current shares',       placeholder: 'e.g. 10000',     type: 'number' },
    { name: 'years_since_grant',    label: 'Years since original grant',     placeholder: 'e.g. 3',         type: 'number' },
    { name: 'refresh_pool_pct',     label: 'Refresh pool % of total equity', placeholder: 'e.g. 1.5',       type: 'number' },
    { name: 'total_company_shares', label: 'Total fully-diluted shares',     placeholder: 'e.g. 10000000',  type: 'number' },
    { name: 'role_criticality',     label: 'Role criticality', type: 'select', options: ['High', 'Med', 'Low'], default: 'Med' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `function run(inputs, pick, fill) {
  var cs = Number(inputs.current_shares) || 0;
  var ys = Number(inputs.years_since_grant) || 0;
  var rp = Number(inputs.refresh_pool_pct) || 0;
  var ts = Number(inputs.total_company_shares) || 0;
  var rc = inputs.role_criticality || 'Med';
  var poolSize = ts * rp / 100;
  var rtp = rc === 'High' ? 0.15 : rc === 'Low' ? 0.03 : 0.08;
  var yf = ys >= 4 ? 1.0 : 1.0 + (4 - ys) / 4;
  var shares = Math.round(poolSize * rtp * yf);
  var dil = ts === 0 ? 0 : shares / ts * 100;
  var band = dil >= 0.20 ? 'Excellent' : dil >= 0.10 ? 'Good' : dil >= 0.05 ? 'Warning' : 'Critical';
  var emoji = dil >= 0.20 ? '🟢' : dil >= 0.10 ? '🟡' : dil >= 0.05 ? '🟠' : '🔴';
  var altShares = Math.round(poolSize * (rc === 'High' ? 0.15 : 0.08) * yf);
  return [
    '🩺 Equity Refresh: ' + emoji + ' ' + band + ' (' + shares.toLocaleString() + ' shares, ' + dil.toFixed(2) + '% dilution)',
    '📊 Snapshot: Pool ' + Math.round(poolSize).toLocaleString() + ' shares · Criticality ' + rc + ' (' + (rtp * 100).toFixed(0) + '% of pool) · Years factor ' + yf.toFixed(2),
    '🔄 What-If: if criticality is High, refresh = ' + altShares.toLocaleString() + ' shares (' + (ts === 0 ? 0 : altShares / ts * 100).toFixed(2) + '% dilution)',
    '⚖️ Break-Even: to hit 🟢 Excellent (≥0.20% dilution), need 20,000+ shares — bump criticality to High',
    '🎯 Milestone: Refresh at year 4 anniversary; pair with our [Compensation Banding Calculator] (P11-4) for cash+equity total',
    '💡 Tip: Refresh grants should be top-up not replacement — preserve original grant value to maintain retention signal.'
  ];
}`,
  },
  generate(inputs) {
    const currentShares = Number(inputs.current_shares) || 0;
    const years = Number(inputs.years_since_grant) || 0;
    const poolPct = Number(inputs.refresh_pool_pct) || 0;
    const total = Number(inputs.total_company_shares) || 0;
    const crit = (inputs.role_criticality || 'Med') as 'High' | 'Med' | 'Low';
    const { shares, dilutionPct } = refreshGrant(currentShares, years, poolPct, total, crit);
    const band = calcHealthBand(dilutionPct);
    const bandInfo = HEALTH_BANDS[band];
    const poolSize = total * poolPct / 100;
    const roleTarget = ROLE_TARGET_PCT[crit];
    const yearsFactor = years >= 4 ? 1.0 : 1.0 + (4 - years) / 4;
    const altShares = Math.round(poolSize * ROLE_TARGET_PCT.High * yearsFactor);
    const altDilution = total === 0 ? 0 : altShares / total * 100;
    return [
      '🩺 Equity Refresh: ' + bandInfo.label + ' (' + shares.toLocaleString() + ' shares, ' + fmtPct(dilutionPct) + ' dilution)',
      '📊 Snapshot: Pool ' + Math.round(poolSize).toLocaleString() + ' shares · Criticality ' + crit + ' (' + (roleTarget * 100).toFixed(0) + '% of pool = ' + Math.round(poolSize * roleTarget).toLocaleString() + ' shares) · Years factor ' + yearsFactor.toFixed(2) + ' · Net: ' + shares.toLocaleString() + ' shares',
      '🔄 What-If: if criticality is High, refresh = ' + altShares.toLocaleString() + ' shares (' + fmtPct(altDilution) + ' dilution)',
      '⚖️ Break-Even: to hit 🟢 Excellent (≥0.20% dilution), need 20,000+ shares — bump criticality to High (target 28,125+ shares)',
      '🎯 Milestone: Refresh at year 4 anniversary; pair with [Compensation Banding Calculator] (P11-4) for cash + equity total',
      '💡 Tip: Refresh grants should be top-up not replacement — preserve original grant value to maintain retention signal over multiple cycles.',
    ];
  },
  staticExamples: [
    '🩺 Equity Refresh: 🟡 Good (15,000 shares, 0.15% dilution)\n📊 Snapshot: Pool 150,000 shares · Criticality Med (8% of pool = 12,000 shares) · Years factor 1.25 · Net: 15,000 shares\n🔄 What-If: if criticality is High, refresh = 28,125 shares (0.28% dilution)\n⚖️ Break-Even: to hit 🟢 Excellent (≥0.20% dilution), need 20,000+ shares — bump criticality to High (target 28,125+ shares)\n🎯 Milestone: Refresh at year 4 anniversary; pair with [Compensation Banding Calculator] (P11-4) for cash + equity total\n💡 Tip: Refresh grants should be top-up not replacement — preserve original grant value to maintain retention signal over multiple cycles.',
  ],
  faq: [
    { q: 'What is a "refresh grant"?', a: 'A new equity grant given to an existing employee, typically at a vesting anniversary (year 2-4). It supplements (does not replace) the original grant. Purpose: combat equity dilution from continued vesting, recognize ongoing contribution, and create new retention incentives.' },
    { q: 'What is the recommended refresh pool size?', a: 'YC People Ops playbook suggests 0.5-2.0% of fully-diluted shares per year for the refresh pool. Mature companies tend toward 1.0-1.5%. Pave 2024 data shows top-quartile retention programs use 1.5-2.5%.' },
    { q: 'How does years_since_grant affect the math?', a: 'P11-5 uses a "newer-grant boost" — employees with <4 years since original grant get a +0.25/year multiplier (capped at +1.0). Rationale: newer employees are still vesting their original grant and need stronger refresh signal to stay.' },
    { q: 'What is "role criticality"?', a: 'A subjective tier for how critical the role is to retention. High = founder-track, VP, staff engineer, key account exec (15% of pool). Med = senior ICs, managers, established leaders (8% of pool). Low = junior ICs, support functions, individual contributors (3% of pool).' },
    { q: 'Should refresh grants vest?', a: 'Yes — typically 4-year vest with 1-year cliff, same as the original grant. Some companies use performance-based vesting for senior roles (refresh tied to next promotion cycle or OKR achievement). P11-5 computes the GRANT size; vesting schedule is a separate decision.' },
    { q: 'Is 0.15% dilution a lot?', a: 'For a single employee, yes — top-quartile retention is 0.10-0.30% per cycle. For a company with 100 employees, the cumulative dilution from refresh grants is 10-30% over 5 years — which is why the refresh pool is critical to budget correctly.' },
  ],
  howToUse: [
    'Enter employee current shares (original grant, may be fully vested or partially).',
    'Enter years since original grant (typical refresh cycle: 2-4 years).',
    'Enter refresh pool as % of total equity (typical: 0.5-2.0% of fully-diluted).',
    'Enter total fully-diluted share count (includes all options, RSUs, converts).',
    'Select role criticality — High/Med/Low maps to 15%/8%/3% of pool.',
    'Read the band, then check What-If for what a criticality bump would do.',
  ],
  sources: [
    'https://www.pave.com/compensation-benchmarks',
    'https://carta.com/data/equity-benchmarks/',
    'https://www.ycombinator.com/library/4A-handbook-for-people-operations',
  ],
};
registerEngine(engine);