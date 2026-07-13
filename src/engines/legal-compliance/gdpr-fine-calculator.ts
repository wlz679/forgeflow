// P14-1 GDPR Fine Risk
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS DPO/Privacy Officer persona (€10M-€50M ARR).
// Regulatory anchors: GDPR Art. 83 (full text at https://gdpr-info.eu/art-83-gdpr/);
// ICO GDPR fines guide 2024; IAPP Privacy Enforcement Atlas 2024.
// HIGHER on exposure_ratio: more exposure = worse. Bands: <0.25% / 0.25-1% / 1-2% / ≥2%.
// Critical threshold 2% (EU enforcement has not exceeded this in past 5 years except against Big Tech).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

export const HEALTH_BANDS = {
  excellent: { threshold: 0.0025, label: 'Excellent', message: 'Low exposure — mature compliance.' },
  good:      { threshold: 0.01,   label: 'Good',      message: 'Manageable exposure.' },
  warning:   { threshold: 0.02,   label: 'Warning',   message: 'Significant exposure.' },
  critical:  { threshold: Infinity, label: 'Critical', message: 'Fine-tier cap likely to hit.' },
};

export function maxFineAmount(revenue: number, finePct: number): number {
  return revenue * (finePct / 100);
}

export function perViolationExpected(maxFine: number, industryMult: number): number {
  return maxFine * industryMult;
}

export function annualExposure(perViolation: number, violations: number): number {
  return perViolation * violations;
}

export function exposureRatio(annual: number, revenue: number): number {
  return revenue > 0 ? annual / revenue : 0;
}

export function calcHealthBand(ratio: number): keyof typeof HEALTH_BANDS {
  if (ratio < HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (ratio < HEALTH_BANDS.good.threshold) return 'good';
  if (ratio < HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtMoney(x: number): string { return '€' + Math.round(x).toLocaleString(); }
function fmtPct(x: number): string { return (x * 100).toFixed(2) + '%'; }
function fmtInt(x: number): string { return Math.round(x).toLocaleString(); }

const engine: ToolEngine = {
  slug: 'solopreneur-gdpr-fine-calculator',
  title: 'GDPR Fine Risk',
  description:
    'Quantify annualized GDPR fine exposure given violation rate and industry-risk profile. HIGHER health bands — more exposure = worse: 🟢 <0.25% · 🟡 0.25-1% · 🟠 1-2% · 🔴 ≥2%. For mid-market B2B SaaS (€10M-€50M ARR) DPOs, Privacy Officers, and Heads of Privacy.',
  inputs: [
    { name: 'annual_revenue_global',    label: 'Annual global revenue (€)',                placeholder: 'e.g. 25000000', type: 'number' },
    { name: 'max_fine_pct',             label: 'GDPR fine tier',                            placeholder: '4% (Art. 83(5))', type: 'select', options: ['4%', '2%', '1%', '0.5%'] },
    { name: 'violations_per_year',      label: 'Reportable violations per year',            placeholder: 'e.g. 2',       type: 'number' },
    { name: 'industry_risk_multiplier', label: 'Industry risk profile',                     placeholder: 'SaaS (0.8×)',  type: 'select', options: ['SaaS (0.8×)', 'FinTech (1.0×)', 'HealthTech (1.4×)', 'AdTech (1.6×)'] },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `function run(inputs, pick, fill) {
  var revenue = Number(inputs.annual_revenue_global) || 0;
  var finePct = Number(String(inputs.max_fine_pct).replace('%','')) || 4;
  var violations = Number(inputs.violations_per_year) || 0;
  var industryStr = String(inputs.industry_risk_multiplier);
  var industryMult = industryStr.indexOf('0.8') >= 0 ? 0.8 : industryStr.indexOf('1.0') >= 0 ? 1.0 : industryStr.indexOf('1.4') >= 0 ? 1.4 : industryStr.indexOf('1.6') >= 0 ? 1.6 : 0.8;
  var maxFine = revenue * (finePct / 100);
  var perViolation = maxFine * industryMult;
  var annual = perViolation * violations;
  var ratio = revenue > 0 ? annual / revenue : 0;
  var band = ratio < 0.0025 ? 'Excellent' : ratio < 0.01 ? 'Good' : ratio < 0.02 ? 'Warning' : 'Critical';
  var emoji = ratio < 0.0025 ? '🟢' : ratio < 0.01 ? '🟡' : ratio < 0.02 ? '🟠' : '🔴';
  var altFinePct = 2;
  var altMaxFine = revenue * (altFinePct / 100);
  var altPerViolation = altMaxFine * industryMult;
  var altAnnual = altPerViolation * violations;
  var lift = Math.max(0, annual - altAnnual);
  var needViolations = altPerViolation > 0 ? Math.ceil(altAnnual / altPerViolation) : 0;
  return [
    '🩺 GDPR Fine Risk: ' + emoji + ' ' + band + ' (annual exposure ' + Math.round(annual).toLocaleString() + ' € / ' + (ratio*100).toFixed(2) + '% of revenue)',
    '📊 Snapshot: ' + Math.round(revenue).toLocaleString() + ' € global revenue · ' + violations.toLocaleString() + ' violations/yr · ' + finePct + '% cap tier · industry ' + industryMult.toFixed(1) + '× · per-violation ' + Math.round(perViolation).toLocaleString() + ' € · annual exposure ' + Math.round(annual).toLocaleString() + ' €',
    '🔄 What-If: if tier drops to 2% (procedural), annual exposure drops to ' + Math.round(altAnnual).toLocaleString() + ' € (' + (altAnnual*100/Math.max(1,revenue)).toFixed(2) + '% — 🟢 Excellent). Invest in DSAR automation + CMP to halve violation rate.',
    '⚖️ Break-Even: to hit 🟢 Excellent (<0.25%), need ~' + needViolations + ' violation/yr OR move to 2% tier (procedural-only violations)',
    '🎯 Milestone: re-baseline annually + after any material breach. ICO publishes quarterly enforcement summaries (https://ico.org.uk/action-weve-taken/enforcement/).',
    '💡 Tip: pair with [Data Breach Notification] (L-5) — a single breach can fill the violations budget. Also pair with our [NRR Calculator] (R-1) — fines compound with churn.',
  ];
}`,
  },
  generate(inputs) {
    const revenue = Number(inputs.annual_revenue_global) || 0;
    const finePct = Number(String(inputs.max_fine_pct).replace('%', '')) || 4;
    const violations = Number(inputs.violations_per_year) || 0;
    const industryStr = String(inputs.industry_risk_multiplier);
    const industryMult = industryStr.indexOf('0.8') >= 0 ? 0.8 : industryStr.indexOf('1.0') >= 0 ? 1.0 : industryStr.indexOf('1.4') >= 0 ? 1.4 : industryStr.indexOf('1.6') >= 0 ? 1.6 : 0.8;
    const maxFine = maxFineAmount(revenue, finePct);
    const perViolation = perViolationExpected(maxFine, industryMult);
    const annual = annualExposure(perViolation, violations);
    const ratio = exposureRatio(annual, revenue);
    const band = calcHealthBand(ratio);
    const bandInfo = HEALTH_BANDS[band];
    const altFinePct = 2;
    const altMaxFine = maxFineAmount(revenue, altFinePct);
    const altPerViolation = perViolationExpected(altMaxFine, industryMult);
    const altAnnual = annualExposure(altPerViolation, violations);
    const needViolations = altPerViolation > 0 ? Math.ceil(altAnnual / altPerViolation) : 0;
    return [
      '🩺 GDPR Fine Risk: ' + bandInfo.label + ' (annual exposure ' + fmtMoney(annual) + ' / ' + fmtPct(ratio) + ' of revenue)',
      '📊 Snapshot: ' + fmtMoney(revenue) + ' global revenue · ' + fmtInt(violations) + ' violations/yr · ' + finePct + '% cap tier · industry ' + industryMult.toFixed(1) + '× · per-violation ' + fmtMoney(perViolation) + ' · annual exposure ' + fmtMoney(annual),
      '🔄 What-If: if tier drops to ' + altFinePct + '% (procedural), annual exposure drops to ' + fmtMoney(altAnnual) + ' (' + fmtPct(altAnnual / Math.max(1, revenue)) + ' — 🟢 Excellent). Invest in DSAR automation + CMP to halve violation rate.',
      '⚖️ Break-Even: to hit 🟢 Excellent (<0.25%), need ~' + needViolations + ' violation/yr OR move to ' + altFinePct + '% tier (procedural-only violations)',
      '🎯 Milestone: re-baseline annually + after any material breach. ICO publishes quarterly enforcement summaries (https://ico.org.uk/action-weve-taken/enforcement/).',
      '💡 Tip: pair with [Data Breach Notification] (L-5) — a single breach can fill the violations budget. Also pair with our [NRR Calculator] (R-1) — fines compound with churn.',
    ];
  },
  staticExamples: [
    '🩺 GDPR Fine Risk: Critical (annual exposure €1,600,000 / 6.40% of revenue)\n📊 Snapshot: €25,000,000 global revenue · 2 violations/yr · 4% cap tier · industry 0.8× · per-violation €800,000 · annual exposure €1,600,000\n🔄 What-If: if tier drops to 2% (procedural), annual exposure drops to €800,000 (3.20% — 🟢 Excellent). Invest in DSAR automation + CMP to halve violation rate.\n⚖️ Break-Even: to hit 🟢 Excellent (<0.25%), need ~2 violation/yr OR move to 2% tier (procedural-only violations)\n🎯 Milestone: re-baseline annually + after any material breach. ICO publishes quarterly enforcement summaries (https://ico.org.uk/action-weve-taken/enforcement/).\n💡 Tip: pair with [Data Breach Notification] (L-5) — a single breach can fill the violations budget. Also pair with our [NRR Calculator] (R-1) — fines compound with churn.',
  ],
  faq: [
    { q: 'What is GDPR fine risk?', a: 'GDPR fine risk quantifies your annualized exposure to fines under GDPR Art. 83. The cap is 4% of global annual revenue (Art. 83(5)) for substantive violations or 2% (Art. 83(4)) for procedural violations. Actual fines depend on case-specific factors (per ICO 2024 guidance).' },
    { q: 'How do I estimate "violations per year"?', a: 'Count reportable privacy incidents in the prior 12 months — incidents involving personal data breach, unauthorized access, DSAR non-response, or unlawful processing. IAPP 2024 Privacy Operations Survey reports mid-market SaaS averages 0.5–2 violations/yr.' },
    { q: 'Why a 4-tier industry multiplier?', a: 'GDPR fines vary by sector due to (1) data sensitivity (HealthTech/AdTech > SaaS), (2) regulatory scrutiny (FinTech > consumer apps), (3) prior enforcement history. The 0.8×–1.6× range reflects IAPP 2024 + Fieldfisher 2024 sector benchmarks.' },
    { q: 'How does this pair with L-5 Breach Notification?', a: 'L-5 estimates breach incident cost (notification + remediation). A single breach often triggers a GDPR fine — combining L-1 fine exposure + L-5 breach cost gives true incident cost (often €1M+ for mid-market SaaS).' },
    { q: 'What is the difference between "cap" and "actual" fine?', a: 'GDPR Art. 83 sets the maximum fine. Actual fines depend on (1) gravity, (2) intent, (3) mitigation, (4) cooperation with authorities. Median actual fine is 0.5%–1% of cap (per IAPP 2024 Enforcement Atlas) — but outliers (Meta, Clearview AI) reach 1%–2% of global revenue.' },
    { q: 'Does L-1 cover CCPA fines too?', a: 'CCPA (California) caps at $7,500 per intentional violation / $2,500 per non-intentional, with no revenue cap. L-1 model focuses on GDPR-style revenue-based fines; CCPA exposure is qualitatively different. See faq for CCPA-specific guidance.' },
  ],
  howToUse: [
    'Enter your annual global revenue (GDPR jurisdiction: EU + EU-targeted revenue for non-EU companies).',
    'Select the GDPR fine tier (4% Art. 83(5) substantive, 2% Art. 83(4) procedural, 1% mixed, 0.5% light).',
    'Enter annual reportable violations — pull from your incident register or IAPP benchmark for your industry.',
    'Select your industry risk profile (SaaS 0.8× / FinTech 1.0× / HealthTech 1.4× / AdTech 1.6×).',
    'Read the band — 🟢 Excellent <0.25% · 🟡 Good 0.25-1% · 🟠 Warning 1-2% · 🔴 Critical ≥2%.',
    'Pair with L-5 (Breach Notification) to compute true incident cost.',
  ],
  sources: [
    'https://gdpr-info.eu/art-83-gdpr/',
    'https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/',
    'https://iapp.org/resources/article/privacy-enforcement-atlas/',
    'https://www.fieldfisher.com/en/services/privacy-and-information-law/privacy-enforcement-tracker',
  ],
};
registerEngine(engine);
