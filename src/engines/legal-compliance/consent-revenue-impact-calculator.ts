// P14-3 Cookie Consent Revenue Impact
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS DPO/Privacy Officer persona (€10M-€50M ARR).
// Regulatory anchors: GDPR ePrivacy Art. 5(3) + Recital 32 (cookie consent);
// IAB TCF v2.2 framework; OneTrust CMP impact benchmarks 2024.
// INVERSE on consent_gap_pp: larger gap = worse revenue exposure. Bands: <5pp / 5-15pp / 15-30pp / ≥30pp.
// Critical threshold 30pp (industry rule of thumb: >30pp gap = severe UX failure, most CMP vendors ship
// pre-built consent UX that closes 10-25pp within 4-6 weeks).
//
// SPEC GAP NOTE: Spec §3.3 lists 4 inputs (monthly_visitors, current_consent_rate_pct,
// target_consent_rate_pct, conversion_rate_pct) but revenue math requires an AOV/ARPU anchor.
// Per plan decision: AOV=€80 hardcoded in BOTH generate() and customFn (mid-market B2B SaaS
// ARPU benchmark). FAQ explains; user can rescale in mind. NOT adding a 5th input.
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

const AOV_EUR = 80; // hardcoded per spec — mid-market B2B SaaS ARPU anchor (€80/customer)

export const HEALTH_BANDS = {
  excellent: { threshold: 5,        label: 'Excellent', message: 'Consent near target — minimal revenue leakage.' },
  good:      { threshold: 15,       label: 'Good',      message: 'Manageable consent gap.' },
  warning:   { threshold: 30,       label: 'Warning',   message: 'Significant revenue exposure.' },
  critical:  { threshold: Infinity, label: 'Critical',  message: 'Severe UX failure — most visitors bounce at consent wall.' },
};

export function consentGap(current: number, target: number): number {
  // clamp current/target defensively to [0, 100]
  const c = Math.min(100, Math.max(0, current));
  const t = Math.min(100, Math.max(0, target));
  return Math.max(0, t - c);
}

export function monthlyRecoverableVisitors(visitors: number, gap: number): number {
  return visitors * (gap / 100);
}

export function monthlyRecoveredRevenue(recoverableVisitors: number, conv: number, aov: number): number {
  return recoverableVisitors * (conv / 100) * aov;
}

export function annualRecoveredRevenue(monthly: number): number {
  return monthly * 12;
}

export function calcHealthBand(gap: number): keyof typeof HEALTH_BANDS {
  // INVERSE on gap_pp — smaller gap = better. Larger gap = worse.
  if (gap < HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (gap < HEALTH_BANDS.good.threshold) return 'good';
  if (gap < HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtMoney(x: number): string { return '€' + Math.round(x).toLocaleString(); }
function fmtNum(x: number, decimals: number): string { return x.toFixed(decimals); }
function fmtPp(x: number): string { return x.toFixed(1) + 'pp'; }

const engine: ToolEngine = {
  slug: 'solopreneur-consent-revenue-impact-calculator',
  title: 'Cookie Consent Revenue Impact',
  description:
    'Quantify monthly + annual revenue recoverable by closing the cookie consent gap. Assumes €80 AOV (mid-market B2B SaaS ARPU benchmark) — adjust mentally for your segment. INVERSE health bands — smaller gap = better: 🟢 <5pp · 🟡 5-15pp · 🟠 15-30pp · 🔴 ≥30pp. For mid-market B2B SaaS (€10M-€50M ARR) DPOs, Privacy Officers, and Growth leads.',
  inputs: [
    { name: 'monthly_visitors',          label: 'Monthly visitors',             placeholder: 'e.g. 200000', type: 'number' },
    { name: 'current_consent_rate_pct',  label: 'Current consent rate (%)',     placeholder: 'e.g. 55',     type: 'number' },
    { name: 'target_consent_rate_pct',   label: 'Target consent rate (%)',      placeholder: 'e.g. 75',     type: 'number' },
    { name: 'conversion_rate_pct',       label: 'Conversion rate (%)',          placeholder: 'e.g. 2',      type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `var cnn=function(x){return Math.max(0,x)};function run(inputs, pick, fill) {
  var visitors = cnn(Number(inputs.monthly_visitors) || 0);
  var current = cnn(Number(inputs.current_consent_rate_pct) || 0);
  var target = cnn(Number(inputs.target_consent_rate_pct) || 0);
  var conv = cnn(Number(inputs.conversion_rate_pct) || 0);
  if (current < 0) current = 0;
  if (current > 100) current = 100;
  if (target < 0) target = 0;
  if (target > 100) target = 100;
  var aov = 80;
  var gap = Math.max(0, target - current);
  var recoverable = visitors * (gap / 100);
  var monthly = recoverable * (conv / 100) * aov;
  var annual = monthly * 12;
  var band = gap < 5 ? 'Excellent' : gap < 15 ? 'Good' : gap < 30 ? 'Warning' : 'Critical';
  var emoji = gap < 5 ? '🟢' : gap < 15 ? '🟡' : gap < 30 ? '🟠' : '🔴';
  var altConsent = 70;
  var altGap = Math.max(0, target - altConsent);
  var altRecoverable = visitors * (altGap / 100);
  var altMonthly = altRecoverable * (conv / 100) * aov;
  var altAnnual = altMonthly * 12;
  var altEmoji = altGap < 5 ? '🟢' : altGap < 15 ? '🟡' : altGap < 30 ? '🟠' : '🔴';
  var needCurrentPct = Math.max(0, target - 4.9);
  var needCurrentLift = Math.max(0, needCurrentPct - current);
  var needTargetPct = Math.min(100, current + 4.9);
  var needTargetReduction = Math.max(0, target - needTargetPct);
  return [
    '🩺 Consent Revenue: ' + emoji + ' ' + band + ' (gap ' + gap.toFixed(1) + 'pp · recoverable ' + Math.round(monthly).toLocaleString() + ' € /mo · ' + Math.round(annual).toLocaleString() + ' € /yr)',
    '📊 Snapshot: ' + visitors.toLocaleString() + ' visitors/mo · consent ' + current.toFixed(1) + '% → target ' + target.toFixed(1) + '% (gap ' + gap.toFixed(1) + 'pp) · conv ' + conv.toFixed(2) + '% × €' + aov + ' AOV · monthly recoverable ' + Math.round(monthly).toLocaleString() + ' € · annual ' + Math.round(annual).toLocaleString() + ' €',
    '🔄 What-If: if consent climbs to 70% (gap=5pp, ' + altEmoji + ' Good), recoverable drops to ' + Math.round(altAnnual).toLocaleString() + ' €/yr. Premium CMP vendors typically lift consent 10-15pp within 4-6 weeks.',
    '⚖️ Break-Even: to hit 🟢 Excellent (<5pp), need consent ≥' + needCurrentPct.toFixed(1) + '% (lift +' + needCurrentLift.toFixed(1) + 'pp) OR reduce target to ≤' + needTargetPct.toFixed(1) + '% (drop ' + needTargetReduction.toFixed(1) + 'pp)',
    '🎯 Milestone: re-baseline quarterly + after any CMP rollout / consent UX change. IAB TCF v2.2 audits can drop consent rate by 5-10pp if vendor compliance slips.',
    '💡 Tip: pair with [CMP ROI] (L-6) — premium CMP lifts consent 10-15pp. Also pair with our [Funnel Step Calculator] (P-1) — consent wall is the top step-leak for EU traffic.',
  ];
}
return run(inputs, pick, fill);`,
  },
  generate(inputs) {
    const visitors = clampNonNegative(Number(inputs.monthly_visitors) || 0);
    const current = clampNonNegative(Number(inputs.current_consent_rate_pct) || 0);
    const target = clampNonNegative(Number(inputs.target_consent_rate_pct) || 0);
    const conv = clampNonNegative(Number(inputs.conversion_rate_pct) || 0);
    const gap = consentGap(current, target);
    const recoverable = monthlyRecoverableVisitors(visitors, gap);
    const monthly = monthlyRecoveredRevenue(recoverable, conv, AOV_EUR);
    const annual = annualRecoveredRevenue(monthly);
    const band = calcHealthBand(gap);
    const bandInfo = HEALTH_BANDS[band];
    const altConsent = 70;
    const altGap = consentGap(altConsent, target);
    const altRecoverable = monthlyRecoverableVisitors(visitors, altGap);
    const altMonthly = monthlyRecoveredRevenue(altRecoverable, conv, AOV_EUR);
    const altAnnual = annualRecoveredRevenue(altMonthly);
    const altBand = calcHealthBand(altGap);
    const altEmoji = altGap < 5 ? '🟢' : altGap < 15 ? '🟡' : altGap < 30 ? '🟠' : '🔴';
    // Break-Even targets for 🟢 Excellent (gap <5pp, strict less-than):
    //   Path A: lift current consent to (target - 4.9)%
    //   Path B: reduce target consent to (current + 4.9)%  (capped 0-100)
    // The -4.9 epsilon keeps the displayed value aligned with user intuition (70 vs 60)
    // while mathematically yielding gap=4.9, which IS 'excellent' under strict-<.
    const needCurrentPct = Math.max(0, Math.min(100, target - 4.9));
    const needCurrentLift = Math.max(0, needCurrentPct - current);
    const needTargetPct = Math.max(0, Math.min(100, current + 4.9));
    const needTargetReduction = Math.max(0, target - needTargetPct);
    return [
      '🩺 Consent Revenue: ' + bandInfo.label + ' (gap ' + fmtPp(gap) + ' · recoverable ' + fmtMoney(monthly) + '/mo · ' + fmtMoney(annual) + '/yr)',
      '📊 Snapshot: ' + visitors.toLocaleString() + ' visitors/mo · consent ' + fmtPp(current) + ' → target ' + fmtPp(target) + ' (gap ' + fmtPp(gap) + ') · conv ' + fmtNum(conv, 2) + '% × €' + AOV_EUR + ' AOV · monthly recoverable ' + fmtMoney(monthly) + ' · annual ' + fmtMoney(annual),
      '🔄 What-If: if consent climbs to ' + altConsent + '% (gap=' + fmtPp(altGap) + ', ' + altEmoji + ' ' + HEALTH_BANDS[altBand].label + '), recoverable drops to ' + fmtMoney(altAnnual) + '/yr. Premium CMP vendors typically lift consent 10-15pp within 4-6 weeks.',
      '⚖️ Break-Even: to hit 🟢 Excellent (<5pp), need consent ≥' + fmtPp(needCurrentPct) + ' (lift +' + fmtPp(needCurrentLift) + ') OR reduce target to ≤' + fmtPp(needTargetPct) + ' (drop ' + fmtPp(needTargetReduction) + ')',
      '🎯 Milestone: re-baseline quarterly + after any CMP rollout / consent UX change. IAB TCF v2.2 audits can drop consent rate by 5-10pp if vendor compliance slips.',
      '💡 Tip: pair with [CMP ROI] (L-6) — premium CMP lifts consent 10-15pp. Also pair with our [Funnel Step Calculator] (P-1) — consent wall is the top step-leak for EU traffic.',
    ];
  },
  staticExamples: [
    '🩺 Consent Revenue: Warning (gap 20.0pp · recoverable €64,000/mo · €768,000/yr)\n📊 Snapshot: 200,000 visitors/mo · consent 55.0pp → target 75.0pp (gap 20.0pp) · conv 2.00% × €80 AOV · monthly recoverable €64,000 · annual €768,000\n🔄 What-If: if consent climbs to 70% (gap=5.0pp, 🟡 Good), recoverable drops to €192,000/yr. Premium CMP vendors typically lift consent 10-15pp within 4-6 weeks.\n⚖️ Break-Even: to hit 🟢 Excellent (<5pp), need consent ≥70.1pp (lift +15.1pp) OR reduce target to ≤59.9pp (drop 15.1pp)\n🎯 Milestone: re-baseline quarterly + after any CMP rollout / consent UX change. IAB TCF v2.2 audits can drop consent rate by 5-10pp if vendor compliance slips.\n💡 Tip: pair with [CMP ROI] (L-6) — premium CMP lifts consent 10-15pp. Also pair with our [Funnel Step Calculator] (P-1) — consent wall is the top step-leak for EU traffic.',
  ],
  faq: [
    { q: 'What is cookie consent revenue impact?', a: 'Cookie consent revenue impact measures the monthly/annual revenue you lose because visitors reject analytics + marketing cookies. EU/EEA traffic under GDPR ePrivacy Recital 32 must give explicit consent before non-essential cookies fire — visitors who decline convert at ~40-60% lower rates (per OneTrust 2024 benchmark).' },
    { q: 'Why is AOV (€80) hardcoded instead of being an input?', a: 'Spec §3.3 lists only 4 inputs (visitors + 3 rates) but the math requires an AOV anchor to compute recovered revenue. Per plan decision, we hardcode €80 (mid-market B2B SaaS ARPU benchmark) and document the assumption here. Recovered revenue scales linearly with AOV — if your ARPU is €200, multiply the result by 2.5×. Adjust mentally or rescale your input visitors (200K visitors × €200 ÷ €80 = 500K effective visitors).' },
    { q: 'How do I estimate "current consent rate"?', a: 'Pull from your CMP analytics dashboard (OneTrust, Cookiebot, Usercentrics, Iubenda) — typically 40-70% for EU traffic. Measure as % of visitors who click "Accept All" on the consent banner (NOT banner views — only meaningful interactions count under IAB TCF v2.2).' },
    { q: 'What is a realistic target consent rate?', a: 'GDPR-compliant UX benchmarks: 55-70% "Accept All" rates are typical for premium CMPs (OneTrust 2024). Below 50% = severe UX failure (consent wall too aggressive). Above 75% = dark-pattern territory (CNIL + ICO have issued fines for "consent by design" patterns). Target 70% as the upper bound.' },
    { q: 'How does this pair with L-6 CMP ROI?', a: 'L-6 CMP ROI measures the payback period of investing in a premium Consent Management Platform. CMPs typically lift consent rate by 10-15pp (per OneTrust 2024). L-3 quantifies the recoverable revenue that uplift unlocks — multiply L-3\'s monthly recovered revenue by your CMP cost to compute payback.' },
    { q: 'What is the difference between L-1 GDPR Fine and L-3 Consent Revenue?', a: 'L-1 measures regulatory fine exposure (worst-case: data breach + Art. 83 fine). L-3 measures revenue leakage from cookie consent friction (everyday operational loss). L-1 is a tail-risk metric; L-3 is a run-rate metric. Both matter for the mid-market DPO budget.' },
  ],
  howToUse: [
    'Enter monthly EU/EEA visitors — pull from Google Analytics segment filtered by EU geo.',
    'Enter current consent rate — pull from your CMP analytics dashboard (% clicking "Accept All").',
    'Enter target consent rate — benchmark against premium CMP deployments (55-70% realistic).',
    'Enter conversion rate — site-wide or EU-segmented, whichever you measure consent against.',
    'Read the band — 🟢 Excellent <5pp · 🟡 Good 5-15pp · 🟠 Warning 15-30pp · 🔴 Critical ≥30pp.',
    'Pair with L-6 (CMP ROI) to project payback from a consent-UX upgrade.',
  ],
  sources: [
    'https://gdpr-info.eu/recitals/no-32/',
    'https://iabeurope.eu/tcf-for-vendors/',
    'https://www.onetrust.com/blog/consent-rate-benchmarks/',
    'https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/cookies-and-similar-technologies/',
  ],
};
registerEngine(engine);
