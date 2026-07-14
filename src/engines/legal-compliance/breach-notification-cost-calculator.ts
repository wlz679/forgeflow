// P14-5 Data Breach Notification Cost
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS DPO/Privacy Officer persona (€10M-€50M ARR).
// Regulatory anchors: GDPR Art. 33 (notify supervisory authority within 72h) +
// GDPR Art. 34 (notify data subjects without undue delay if high risk);
// ICO breach reporting guide 2024; ENISA Threat Landscape 2024.
// HIGHER on annual_breach_cost: more cost = worse privacy incident exposure. Bands: <€50K / €50-250K / €250K-1M / >=€1M.
// Critical threshold €1M (EU mid-market breach benchmarks).
//
// Lesson 1: file path uses .ts suffix (codegen-examples.mjs joins via path.join + file)
// Lesson 2: customFn uses return run(inputs, pick, fill); wrapper for runtime safety
// Lesson 3: Break-Even uses targetAnnual = threshold - 1 for strict-< boundary correctness
// Lesson 4: What-If uses altAnnual < annual guard for "drops to" vs "stays at"
// Lesson 5: Health line uses Math.round (integer inputs/band thresholds so no boundary contradiction)
// Lesson 6: Leading € format consistently in both generate() and customFn
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

export const HEALTH_BANDS = {
  excellent: { threshold: 50_000,    label: 'Excellent', message: 'No breaches or small-scale.' },
  good:      { threshold: 250_000,   label: 'Good',      message: 'Manageable breach exposure.' },
  warning:   { threshold: 1_000_000, label: 'Warning',   message: 'Significant exposure.' },
  critical:  { threshold: Infinity,  label: 'Critical',  message: 'Severe exposure.' },
};

export function notificationCost(subjects: number, costPerSubject: number): number {
  return subjects * costPerSubject;
}

export function costPerBreach(notifCost: number, remediation: number): number {
  return notifCost + remediation;
}

export function annualBreachCost(breaches: number, costPer: number): number {
  return breaches * costPer;
}

export function calcHealthBand(cost: number): keyof typeof HEALTH_BANDS {
  if (cost < HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (cost < HEALTH_BANDS.good.threshold) return 'good';
  if (cost < HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtMoney(x: number): string { return '€' + Math.round(x).toLocaleString(); }
function fmtNum(x: number, decimals: number): string { return x.toFixed(decimals); }

const engine: ToolEngine = {
  slug: 'solopreneur-breach-notification-cost-calculator',
  title: 'Data Breach Notification Cost',
  description:
    'Quantify annual data breach notification cost from breach frequency, data subjects per breach, notification cost per subject, and remediation cost per breach. HIGHER health bands — more cost = worse privacy incident exposure: 🟢 <€50K/yr · 🟡 €50-250K · 🟠 €250K-1M · 🔴 ≥€1M. For mid-market B2B SaaS (€10M-€50M ARR) DPOs, Privacy Officers, and CISOs.',
  inputs: [
    { name: 'breaches_per_year',             label: 'Breaches per year',                  placeholder: 'e.g. 1',     type: 'number' },
    { name: 'data_subjects_per_breach',      label: 'Data subjects per breach',           placeholder: 'e.g. 50000', type: 'number' },
    { name: 'notification_cost_per_subject', label: 'Notification cost per subject (€/subject)', placeholder: 'e.g. 5', type: 'number' },
    { name: 'remediation_cost_per_breach',   label: 'Remediation cost per breach (€)', placeholder: 'e.g. 80000', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `var cnn=function(x){return Math.max(0,x)};function run(inputs, pick, fill) {
  var breaches = cnn(Number(inputs.breaches_per_year) || 0);
  var subjects = cnn(Number(inputs.data_subjects_per_breach) || 0);
  var cps = cnn(Number(inputs.notification_cost_per_subject) || 0);
  var remediation = cnn(Number(inputs.remediation_cost_per_breach) || 0);
  var notifCost = subjects * cps;
  var perBreach = notifCost + remediation;
  var annual = breaches * perBreach;
  var band = annual < 50000 ? 'Excellent' : annual < 250000 ? 'Good' : annual < 1000000 ? 'Warning' : 'Critical';
  var emoji = annual < 50000 ? '🟢' : annual < 250000 ? '🟡' : annual < 1000000 ? '🟠' : '🔴';
  var altBreaches = 0.3;
  var altAnnual = altBreaches * perBreach;
  var altBand = altAnnual < 50000 ? 'Excellent' : altAnnual < 250000 ? 'Good' : altAnnual < 1000000 ? 'Warning' : 'Critical';
  var altEmoji = altAnnual < 50000 ? '🟢' : altAnnual < 250000 ? '🟡' : altAnnual < 1000000 ? '🟠' : '🔴';
  var altText = altAnnual < annual ? 'drops to' : 'stays at';
  var targetAnnual = 49999;
  var targetBreaches = perBreach > 0 ? targetAnnual / perBreach : breaches;
  var breachReductionPct = breaches > 0 ? Math.min(100, Math.max(0, (breaches - targetBreaches) / breaches * 100)) : 0;
  var viableSubjectsCut = remediation < targetAnnual;
  var targetSubjectsRaw = viableSubjectsCut ? (targetAnnual - remediation) / Math.max(cps, 0.0001) : 0;
  var targetSubjects = Math.max(0, targetSubjectsRaw);
  var subjectReductionPct = subjects > 0 ? Math.min(100, Math.max(0, (subjects - targetSubjects) / subjects * 100)) : 100;
  var easierPath;
  if (annual < 50000) {
    easierPath = 'already below €50K — no reduction needed';
  } else if (!viableSubjectsCut) {
    easierPath = 'reduce breach frequency to ≤' + targetBreaches.toFixed(2) + '/yr (' + breachReductionPct.toFixed(1) + '% fewer — ~1 breach every ' + (1 / Math.max(targetBreaches, 0.0001)).toFixed(1) + ' years). Subject reduction alone cannot reach Excellent because remediation (€' + remediation.toLocaleString() + ') alone exceeds the threshold.';
  } else if (breachReductionPct <= subjectReductionPct) {
    easierPath = 'reduce breach frequency to ≤' + targetBreaches.toFixed(2) + '/yr (' + breachReductionPct.toFixed(1) + '% fewer — ~1 breach every ' + (1 / Math.max(targetBreaches, 0.0001)).toFixed(1) + ' years).';
  } else {
    easierPath = 'reduce subjects at risk to ≤' + targetSubjects.toFixed(0) + '/breach (' + subjectReductionPct.toFixed(1) + '% fewer) via data minimization. Remediation floor must drop below €50K to leave headroom.';
  }
  return [
    '🩺 Breach Notification Cost: ' + emoji + ' ' + band + ' (annual cost €' + Math.round(annual).toLocaleString() + ' · €' + Math.round(perBreach).toLocaleString() + '/breach · €' + Math.round(notifCost).toLocaleString() + ' notification)',
    '📊 Snapshot: ' + breaches.toLocaleString() + ' breach/yr × ' + subjects.toLocaleString() + ' subjects × ' + cps.toFixed(2) + ' €/subject = €' + Math.round(notifCost).toLocaleString() + ' notification · + €' + Math.round(remediation).toLocaleString() + ' remediation = €' + Math.round(perBreach).toLocaleString() + '/breach · annual €' + Math.round(annual).toLocaleString(),
    '🔄 What-If: if breaches drop to 0.3/yr (3 in 10 years), annual cost ' + altText + ' €' + Math.round(altAnnual).toLocaleString() + ' (' + altEmoji + ' ' + altBand + ').',
    '⚖️ Break-Even: easiest path to 🟢 Excellent (<€50K): ' + easierPath,
    '🎯 Milestone: re-baseline annually + after any incident. ICO publishes quarterly enforcement summaries (https://ico.org.uk/action-weve-taken/enforcement/). GDPR Art. 33: notify supervisory authority within 72h; Art. 34: notify data subjects without undue delay if high risk.',
    '💡 Tip: pair with [GDPR Fine Calculator] (L-1) — a single breach fills the violations budget. Also pair with our [NRR Calculator] (R-1) — breach exposure compounds with customer churn.',
  ];
}
return run(inputs, pick, fill);`,
  },
  generate(inputs) {
    const breaches = clampNonNegative(Number(inputs.breaches_per_year) || 0);
    const subjects = clampNonNegative(Number(inputs.data_subjects_per_breach) || 0);
    const cps = clampNonNegative(Number(inputs.notification_cost_per_subject) || 0);
    const remediation = clampNonNegative(Number(inputs.remediation_cost_per_breach) || 0);
    const notifCost = notificationCost(subjects, cps);
    const perBreach = costPerBreach(notifCost, remediation);
    const annual = annualBreachCost(breaches, perBreach);
    const band = calcHealthBand(annual);
    const bandInfo = HEALTH_BANDS[band];
    const emoji = annual < 50_000 ? '🟢' : annual < 250_000 ? '🟡' : annual < 1_000_000 ? '🟠' : '🔴';
    const altBreaches = 0.3;
    const altAnnual = annualBreachCost(altBreaches, perBreach);
    const altBand = calcHealthBand(altAnnual);
    const altEmoji = altAnnual < 50_000 ? '🟢' : altAnnual < 250_000 ? '🟡' : altAnnual < 1_000_000 ? '🟠' : '🔴';

    // Strict-< band: use 49,999 so the displayed easier path actually lands in Excellent.
    // Path A: reduce breach frequency (target_breaches = 49,999 / cost_per_breach).
    // Path B: reduce subjects (data minimization) — only viable if remediation < 49,999.
    // Easier = whichever % reduction is smaller. For canonical (1 breach/yr, €80K remediation),
    // Path B is INFEASIBLE because remediation alone exceeds the €50K threshold.
    const targetAnnual = HEALTH_BANDS.excellent.threshold - 1;
    const targetBreaches = perBreach > 0 ? targetAnnual / perBreach : breaches;
    const breachReductionPct = breaches > 0
      ? Math.min(100, Math.max(0, ((breaches - targetBreaches) / breaches) * 100))
      : 0;
    const viableSubjectsCut = remediation < targetAnnual;
    const targetSubjectsRaw = viableSubjectsCut
      ? (targetAnnual - remediation) / Math.max(cps, 0.0001)
      : 0;
    const targetSubjects = Math.max(0, targetSubjectsRaw);
    const subjectReductionPct = subjects > 0
      ? Math.min(100, Math.max(0, ((subjects - targetSubjects) / subjects) * 100))
      : 100;

    let easierPath: string;
    if (annual < HEALTH_BANDS.excellent.threshold) {
      easierPath = 'already below €50K — no reduction needed';
    } else if (!viableSubjectsCut) {
      easierPath = 'reduce breach frequency to ≤' + fmtNum(targetBreaches, 2) + '/yr (' + fmtNum(breachReductionPct, 1) + '% fewer — ~1 breach every ' + fmtNum(1 / Math.max(targetBreaches, 0.0001), 1) + ' years). Subject reduction alone cannot reach Excellent because remediation (€' + remediation.toLocaleString() + ') alone exceeds the threshold.';
    } else if (breachReductionPct <= subjectReductionPct) {
      easierPath = 'reduce breach frequency to ≤' + fmtNum(targetBreaches, 2) + '/yr (' + fmtNum(breachReductionPct, 1) + '% fewer — ~1 breach every ' + fmtNum(1 / Math.max(targetBreaches, 0.0001), 1) + ' years).';
    } else {
      easierPath = 'reduce subjects at risk to ≤' + fmtNum(targetSubjects, 0) + '/breach (' + fmtNum(subjectReductionPct, 1) + '% fewer) via data minimization. Remediation floor must drop below €50K to leave headroom.';
    }

    const altText = altAnnual < annual ? 'drops to' : 'stays at';

    return [
      '🩺 Breach Notification Cost: ' + emoji + ' ' + bandInfo.label + ' (annual cost ' + fmtMoney(annual) + ' · ' + fmtMoney(perBreach) + '/breach · ' + fmtMoney(notifCost) + ' notification)',
      '📊 Snapshot: ' + breaches.toLocaleString() + ' breach/yr × ' + subjects.toLocaleString() + ' subjects × ' + fmtNum(cps, 2) + ' €/subject = ' + fmtMoney(notifCost) + ' notification · + ' + fmtMoney(remediation) + ' remediation = ' + fmtMoney(perBreach) + '/breach · annual ' + fmtMoney(annual),
      '🔄 What-If: if breaches drop to ' + altBreaches + '/yr (3 in 10 years), annual cost ' + altText + ' ' + fmtMoney(altAnnual) + ' (' + altEmoji + ' ' + HEALTH_BANDS[altBand].label + ').',
      '⚖️ Break-Even: easiest path to 🟢 Excellent (<€50K): ' + easierPath,
      '🎯 Milestone: re-baseline annually + after any incident. ICO publishes quarterly enforcement summaries (https://ico.org.uk/action-weve-taken/enforcement/). GDPR Art. 33: notify supervisory authority within 72h; Art. 34: notify data subjects without undue delay if high risk.',
      '💡 Tip: pair with [GDPR Fine Calculator] (L-1) — a single breach fills the violations budget. Also pair with our [NRR Calculator] (R-1) — breach exposure compounds with customer churn.',
    ];
  },
  staticExamples: ['🩺 Breach Notification Cost: 🟠 Warning (annual cost €330,000 · €330,000/breach · €250,000 notification)\n📊 Snapshot: 1 breach/yr × 50,000 subjects × 5.00 €/subject = €250,000 notification · + €80,000 remediation = €330,000/breach · annual €330,000\n🔄 What-If: if breaches drop to 0.3/yr (3 in 10 years), annual cost drops to €99,000 (🟡 Good).\n⚖️ Break-Even: easiest path to 🟢 Excellent (<€50K): reduce breach frequency to ≤0.15/yr (84.8% fewer — ~1 breach every 6.6 years). Subject reduction alone cannot reach Excellent because remediation (€80,000) alone exceeds the threshold.\n🎯 Milestone: re-baseline annually + after any incident. ICO publishes quarterly enforcement summaries (https://ico.org.uk/action-weve-taken/enforcement/). GDPR Art. 33: notify supervisory authority within 72h; Art. 34: notify data subjects without undue delay if high risk.\n💡 Tip: pair with [GDPR Fine Calculator] (L-1) — a single breach fills the violations budget. Also pair with our [NRR Calculator] (R-1) — breach exposure compounds with customer churn.'],
  faq: [
    { q: 'What is data breach notification cost?', a: 'Data breach notification cost is the annualized cost of notifying data subjects and remediating systems after a personal data breach, under GDPR Art. 33 (notify supervisory authority within 72h) and Art. 34 (notify data subjects without undue delay if high risk). The model combines breach frequency × per-breach cost (notification + remediation).' },
    { q: 'How do I estimate breaches per year?', a: 'Use your internal incident register from the prior 12 months, classified by GDPR Art. 4(12) definition: any breach of security leading to accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to personal data. Mid-market B2B SaaS averages 0.5–2 reportable breaches per year per ENISA Threat Landscape 2024.' },
    { q: 'How do I estimate notification cost per subject?', a: 'Per-subject cost covers postal letters/emails, call-center staffing, identity-protection credit monitoring (12–24 months), and legal/operations overhead. ICO 2024 breach-reporting guide cites £2–£8/subject for B2C notification campaigns; B2B is lower (~€1–€3/subject) due to consolidated enterprise contracts.' },
    { q: 'What does remediation cost per breach include?', a: 'Remediation covers forensic investigation, legal counsel, regulator liaison (ICO, CNIL, BfDI), system hardening, and post-incident audits. ENISA 2024 places mid-market SaaS remediation at €50K–€200K per breach; a full-blown ransomware recovery can exceed €500K.' },
    { q: 'How does this pair with L-1 GDPR Fine Risk?', a: 'L-1 measures regulatory tail risk (fine exposure under GDPR Art. 83). L-5 measures the operational incident cost (notification + remediation). A single breach typically triggers both: notification cost + GDPR fine + customer churn. Combine L-1 × L-5 to model true single-incident cost.' },
    { q: 'How does this pair with R-1 NRR (Net Revenue Retention)?', a: 'A breach commonly causes 5–10pp NRR drop in the 12 months after disclosure (per IAPP Privacy Enforcement Atlas 2024). R-1 measures baseline retention; pair with L-5 to model the retention shock from a breach event. CISOs typically reserve 3–6 months of breach-recovery budget to manage the retention bleed.' },
  ],
  howToUse: [
    'Enter the expected or historical number of reportable breaches per year (per GDPR Art. 4(12)).',
    'Enter the average number of data subjects affected per breach.',
    'Enter the all-in notification cost per subject (€/post, email, call-center, credit monitoring).',
    'Enter the average remediation cost per breach (forensics, legal, regulator liaison, system hardening).',
    'Read the band — 🟢 Excellent <€50K/yr · 🟡 Good €50-250K · 🟠 Warning €250K-1M · 🔴 Critical ≥€1M.',
    'Pair with L-1 (GDPR Fine) + R-1 (NRR) to model true single-incident cost including fine + churn.',
  ],
  sources: [
    'https://gdpr-info.eu/art-33-gdpr/',
    'https://gdpr-info.eu/art-34-gdpr/',
    'https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/personal-data-breaches/',
    'https://www.enisa.europa.eu/publications/enisa-threat-landscape-2024',
  ],
};
registerEngine(engine);
