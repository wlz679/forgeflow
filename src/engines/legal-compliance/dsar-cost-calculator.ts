// P14-2 DSAR (Data Subject Access Request) Processing Cost
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS DPO/Privacy Officer persona (€10M-€50M ARR).
// Regulatory anchors: GDPR Art. 15 (right of access, full text at https://gdpr-info.eu/art-15-gdpr/);
// ICO DSAR code of practice; IAPP Privacy Operations Survey 2024.
// HIGHER on annual_cost: more cost = worse operational exposure. Bands: <€25K / €25-100K / €100-300K / ≥€300K.
// automation_pct is CLAMPED to [0, 100] defensively (negative hours make no sense).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

export const HEALTH_BANDS = {
  excellent: { threshold: 25_000,   label: 'Excellent', message: 'Low DSAR volume or high automation.' },
  good:      { threshold: 100_000,  label: 'Good',      message: 'Manageable DSAR cost.' },
  warning:   { threshold: 300_000,  label: 'Warning',   message: 'Significant operational load.' },
  critical:  { threshold: Infinity, label: 'Critical',  message: 'DSAR consuming disproportionate resources.' },
};

export function manualHoursPerDSAR(hours: number, automationPct: number): number {
  const clampedAuto = Math.min(100, Math.max(0, automationPct));
  return hours * (1 - clampedAuto / 100);
}

export function annualDSARCost(dsars: number, hours: number, rate: number, automationPct: number): number {
  return dsars * 12 * manualHoursPerDSAR(hours, automationPct) * rate;
}

export function costPerDSAR(hours: number, rate: number, automationPct: number): number {
  return manualHoursPerDSAR(hours, automationPct) * rate;
}

export function calcHealthBand(cost: number): keyof typeof HEALTH_BANDS {
  if (cost < HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (cost < HEALTH_BANDS.good.threshold) return 'good';
  if (cost < HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtMoney(x: number): string { return '€' + Math.round(x).toLocaleString(); }
function fmtNum(x: number, decimals: number): string { return x.toFixed(decimals); }
function fmtPct(x: number): string { return x.toFixed(1) + '%'; }

const engine: ToolEngine = {
  slug: 'solopreneur-dsar-cost-calculator',
  title: 'DSAR Processing Cost',
  description:
    'Quantify annualized cost of processing Data Subject Access Requests (DSAR) given volume, manual hours, DPO rate, and automation %. HIGHER health bands — more cost = worse operational exposure: 🟢 <€25K/yr · 🟡 €25-100K · 🟠 €100-300K · 🔴 ≥€300K. For mid-market B2B SaaS (€10M-€50M ARR) DPOs, Privacy Officers, and Heads of Privacy.',
  inputs: [
    { name: 'dsars_per_month',  label: 'DSARs per month',       placeholder: 'e.g. 50',  type: 'number' },
    { name: 'hours_per_dsar',   label: 'Manual hours per DSAR',  placeholder: 'e.g. 2.5', type: 'number' },
    { name: 'hourly_rate_dpo',  label: 'DPO hourly rate (€/hr)', placeholder: 'e.g. 95',  type: 'number' },
    { name: 'automation_pct',   label: 'Automation (%)',         placeholder: 'e.g. 30',  type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `var cnn=function(x){return Math.max(0,x)};function run(inputs, pick, fill) {
  var dsars = cnn(Number(inputs.dsars_per_month) || 0);
  var hours = cnn(Number(inputs.hours_per_dsar) || 0);
  var rate = cnn(Number(inputs.hourly_rate_dpo) || 0);
  var automationPct = cnn(Number(inputs.automation_pct) || 0);
  if (automationPct < 0) automationPct = 0;
  if (automationPct > 100) automationPct = 100;
  var manualHours = hours * (1 - automationPct / 100);
  var costPerDSARv = manualHours * rate;
  var annual = dsars * 12 * manualHours * rate;
  var band = annual < 25000 ? 'Excellent' : annual < 100000 ? 'Good' : annual < 300000 ? 'Warning' : 'Critical';
  var emoji = annual < 25000 ? '🟢' : annual < 100000 ? '🟡' : annual < 300000 ? '🟠' : '🔴';
  var altAutomationPct = 60;
  var altManualHours = hours * (1 - altAutomationPct / 100);
  var altAnnual = dsars * 12 * altManualHours * rate;
  var altEmoji = altAnnual < 25000 ? '🟢' : altAnnual < 100000 ? '🟡' : altAnnual < 300000 ? '🟠' : '🔴';
  var targetCost = 25000;
  var targetManualHours = (dsars * 12 * rate) > 0 ? targetCost / (dsars * 12 * rate) : 0;
  var needAutomation = hours > 0 ? Math.min(100, Math.max(0, (1 - targetManualHours / hours) * 100)) : 0;
  var needDSARs = (12 * manualHours * rate) > 0 ? Math.ceil(targetCost / (12 * manualHours * rate)) : 0;
  return [
    '🩺 DSAR Cost: ' + emoji + ' ' + band + ' (annual cost ' + Math.round(annual).toLocaleString() + ' € · ' + (manualHours).toFixed(2) + ' hr/DSAR · ' + Math.round(costPerDSARv).toLocaleString() + ' €/DSAR)',
    '📊 Snapshot: ' + dsars.toLocaleString() + ' DSARs/mo × 12 = ' + (dsars*12).toLocaleString() + '/yr · ' + (hours).toFixed(2) + ' hr/DSAR · ' + automationPct.toFixed(0) + '% automation (' + manualHours.toFixed(2) + ' manual hr) · ' + Math.round(rate).toLocaleString() + ' €/hr DPO · annual cost ' + Math.round(annual).toLocaleString() + ' €',
    '🔄 What-If: if automation climbs to 60%, manual hours drop to ' + altManualHours.toFixed(2) + ', annual cost drops to ' + Math.round(altAnnual).toLocaleString() + ' € (' + altEmoji + '). Push past ~82% automation to reach 🟢 Excellent (<€25K).',
    '⚖️ Break-Even: to hit 🟢 Excellent (<€25K), need automation ≥' + needAutomation.toFixed(0) + '% OR cut DSARs to ≤' + needDSARs + '/mo (current ' + automationPct.toFixed(0) + '%)',
    '🎯 Milestone: re-baseline quarterly + after any product launch that adds data-collection surface (DSAR volume correlates with consent changes).',
    '💡 Tip: pair with [CMP ROI] (L-6) — CMP reduces DSAR volume via consent logging. Also pair with our [Cost-per-Ticket Calculator] (P12-1) to size the broader privacy ops budget.',
  ];
}
return run(inputs, pick, fill);`,
  },
  generate(inputs) {
    const dsars = clampNonNegative(Number(inputs.dsars_per_month) || 0);
    const hours = clampNonNegative(Number(inputs.hours_per_dsar) || 0);
    const rate = clampNonNegative(Number(inputs.hourly_rate_dpo) || 0);
    const automationPct = clampNonNegative(Number(inputs.automation_pct) || 0);
    const manualHours = manualHoursPerDSAR(hours, automationPct);
    const costPerDSARv = costPerDSAR(hours, rate, automationPct);
    const annual = annualDSARCost(dsars, hours, rate, automationPct);
    const band = calcHealthBand(annual);
    const bandInfo = HEALTH_BANDS[band];
    const altAutomationPct = 60;
    const altManualHours = manualHoursPerDSAR(hours, altAutomationPct);
    const altAnnual = annualDSARCost(dsars, hours, rate, altAutomationPct);
    const altBand = calcHealthBand(altAnnual);
    const targetCost = HEALTH_BANDS.excellent.threshold;
    const targetManualHours = (dsars * 12 * rate) > 0 ? targetCost / (dsars * 12 * rate) : 0;
    const needAutomation = hours > 0 ? Math.min(100, Math.max(0, (1 - targetManualHours / hours) * 100)) : 0;
    const needDSARs = (12 * manualHours * rate) > 0 ? Math.ceil(targetCost / (12 * manualHours * rate)) : 0;
    return [
      '🩺 DSAR Cost: ' + bandInfo.label + ' (annual cost ' + fmtMoney(annual) + ' · ' + fmtNum(manualHours, 2) + ' hr/DSAR · ' + fmtMoney(costPerDSARv) + '/DSAR)',
      '📊 Snapshot: ' + dsars.toLocaleString() + ' DSARs/mo × 12 = ' + (dsars * 12).toLocaleString() + '/yr · ' + fmtNum(hours, 2) + ' hr/DSAR · ' + fmtPct(automationPct) + ' automation (' + fmtNum(manualHours, 2) + ' manual hr) · ' + fmtMoney(rate) + '/hr DPO · annual cost ' + fmtMoney(annual),
      '🔄 What-If: if automation climbs to ' + altAutomationPct + '%, manual hours drop to ' + fmtNum(altManualHours, 2) + ', annual cost drops to ' + fmtMoney(altAnnual) + ' (' + HEALTH_BANDS[altBand].label + '). Push past ~82% automation to reach 🟢 Excellent (<€25K).',
      '⚖️ Break-Even: to hit 🟢 Excellent (<€' + (targetCost / 1000).toFixed(0) + 'K), need automation ≥' + needAutomation.toFixed(0) + '% OR cut DSARs to ≤' + needDSARs + '/mo (current ' + fmtPct(automationPct) + ')',
      '🎯 Milestone: re-baseline quarterly + after any product launch that adds data-collection surface (DSAR volume correlates with consent changes).',
      '💡 Tip: pair with [CMP ROI] (L-6) — CMP reduces DSAR volume via consent logging. Also pair with our [Cost-per-Ticket Calculator] (P12-1) to size the broader privacy ops budget.',
    ];
  },
  staticExamples: [
    '🩺 DSAR Cost: Good (annual cost €99,750 · 1.75 hr/DSAR · €166/DSAR)\n📊 Snapshot: 50 DSARs/mo × 12 = 600/yr · 2.50 hr/DSAR · 30.0% automation (1.75 manual hr) · €95/hr DPO · annual cost €99,750\n🔄 What-If: if automation climbs to 60%, manual hours drop to 1.00, annual cost drops to €57,000 (Good). Push past ~82% automation to reach 🟢 Excellent (<€25K).\n⚖️ Break-Even: to hit 🟢 Excellent (<€25K), need automation ≥82% OR cut DSARs to ≤13/mo (current 30.0%)\n🎯 Milestone: re-baseline quarterly + after any product launch that adds data-collection surface (DSAR volume correlates with consent changes).\n💡 Tip: pair with [CMP ROI] (L-6) — CMP reduces DSAR volume via consent logging. Also pair with our [Cost-per-Ticket Calculator] (P12-1) to size the broader privacy ops budget.',
  ],
  faq: [
    { q: 'What is DSAR processing cost?', a: 'DSAR (Data Subject Access Request) processing cost = annual labor cost to fulfill GDPR Art. 15 access requests. Each request takes manual hours × DPO hourly rate, scaled by annual request volume minus automation savings. Mid-market B2B SaaS averages 30–100 DSARs/mo (IAPP 2024 Privacy Operations Survey).' },
    { q: 'How do I estimate "manual hours per DSAR"?', a: 'Baseline: 2–4 hours per DSAR for manual search + redaction + reply (per ICO DSAR code of practice). With automation tools (OneTrust DSAR, Securys, Transcend), drops to 0.5–1 hour. Most mid-market DSARs require manual redaction for third-party data references (Art. 15(4)).' },
    { q: 'What does the "automation %" input mean?', a: 'Automation % = share of DSAR workflow handled by tooling (auto-discovery of user data, template responses, redaction). 30% automation = 70% manual effort remaining. 80%+ automation = mostly template-driven with human review only for edge cases (per OneTrust 2024 benchmark).' },
    { q: 'How does this pair with L-6 CMP ROI?', a: 'CMP (Consent Management Platform) reduces DSAR volume by ~30–50% via granular consent logging (data subjects see exactly what you have and only request access for unclear items). L-6 quantifies CMP cost savings; L-2 quantifies DSAR cost savings — combined gives full privacy-ops ROI.' },
    { q: 'What is the difference between L-1 GDPR Fine and L-2 DSAR Cost?', a: 'L-1 measures regulatory fine exposure (worst-case scenario: data breach + Art. 83 fine). L-2 measures operational cost of routine privacy ops (legitimate requests you must fulfill under Art. 15). Both are mid-market DPO metrics but address different budget lines: fines (risk) vs. ops (run-rate).' },
    { q: 'Does L-2 cover CCPA / global privacy laws?', a: 'CCPA, LGPD, PIPL all have similar data-access rights (with variations). The math (volume × hours × rate) is universal; only the monthly DSAR volume input changes by jurisdiction. For US-only companies, the volume may be 50–70% lower than EU (less consumer awareness).' },
  ],
  howToUse: [
    'Enter monthly DSAR volume — pull from your privacy request ticketing system or OneTrust DSAR portal.',
    'Enter manual hours per DSAR — average across fulfillment team (search + redaction + reply time).',
    'Enter DPO hourly rate — fully-loaded cost including benefits + overhead (typically €80–€150/hr EU mid-market).',
    'Enter automation % — current share of workflow handled by tooling (start at 0% if fully manual).',
    'Read the band — 🟢 Excellent <€25K · 🟡 Good €25-100K · 🟠 Warning €100-300K · 🔴 Critical ≥€300K.',
    'Pair with L-6 (CMP ROI) to project savings from consent tooling; L-1 (GDPR Fine) for risk context.',
  ],
  sources: [
    'https://gdpr-info.eu/art-15-gdpr/',
    'https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/individual-rights/right-of-access/',
    'https://iapp.org/news/a/2024-privacy-operations-survey/',
    'https://www.onetrust.com/products/dsar-automation/',
  ],
  engineKey: true,
};
registerEngine(engine);
