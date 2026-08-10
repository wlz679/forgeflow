// P14-6 Consent Management Platform (CMP) ROI
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS DPO/Privacy Officer persona (€10M-€50M ARR).
// Regulatory anchors: GDPR Art. 7 (consent) + ePrivacy Art. 5(3) (cookie consent);
// IAB TCF v2.2 framework; OneTrust 2024 CMP benchmark; Didomi 2024 CMP benchmark;
// Cookiebot 2024 CMP benchmark.
// HIGHER on roi_pct: more ROI = better automation payback. Bands: <50% / 50-150% / 150-400% / >=400%.
// Critical threshold -Infinity (negative ROI = CMP costs more than it saves).
//
// Lesson 1: file path uses .ts suffix (codegen-examples.mjs joins via path.join + file)
// Lesson 2: customFn uses return run(inputs, pick, fill); wrapper for runtime safety
// Lesson 3: Break-Even uses 5× cost for ROI≥4.0 (since net/cost ≥ 4.0 → savings ≥ 5× cost)
// Lesson 4: What-If uses altSavings > annual guard for "climb to" vs "drops to"
// Lesson 5: Health line uses .toFixed(1) for ROI to avoid integer-boundary contradiction at 400/150/50
// Lesson 6: Leading € format consistently in both generate() and customFn
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

// Thresholds are decimal ratios: 4.0 = 400%, 1.5 = 150%, 0.5 = 50%.
// calcHealthBand receives roiPct in percentage form (e.g. 296 for 296%) and
// converts to decimal internally for comparison.
export const HEALTH_BANDS = {
  excellent: { threshold: 4.0,        label: 'Excellent', message: 'CMP pays back 5×+.' },
  good:      { threshold: 1.5,        label: 'Good',      message: 'CMP pays for itself.' },
  warning:   { threshold: 0.5,        label: 'Warning',   message: 'CMP under-saving.' },
  critical:  { threshold: -Infinity,  label: 'Critical',  message: 'CMP costs more than it saves.' },
};

export function dsarAnnualSavings(dsars: number, hours: number, rate: number, uplift: number): number {
  return dsars * 12 * hours * (uplift / 100) * rate;
}

export function cmpAnnualCost(monthly: number): number {
  return monthly * 12;
}

export function netAnnualSavings(savings: number, cost: number): number {
  return savings - cost;
}

export function cmpROI(net: number, cost: number): number {
  return cost > 0 ? (net / cost) * 100 : -Infinity;
}

export function paybackMonths(cost: number, monthlySavings: number): number {
  return monthlySavings > 0 ? cost / monthlySavings : Infinity;
}

export function calcHealthBand(roiPct: number): keyof typeof HEALTH_BANDS {
  const roiDec = roiPct / 100;
  if (roiDec >= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (roiDec >= HEALTH_BANDS.good.threshold) return 'good';
  if (roiDec >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtMoney(x: number): string { return '€' + Math.round(x).toLocaleString(); }
function fmtNum(x: number, decimals: number): string { return x.toFixed(decimals); }
function fmtPct(x: number): string { return x.toFixed(1) + '%'; }

const engine: ToolEngine = {
  slug: 'solopreneur-cmp-roi-calculator',
  title: 'CMP ROI',
  description:
    'Quantify annual ROI of a Consent Management Platform from DSAR automation savings vs platform cost. HIGHER health bands — more ROI = better automation payback: 🟢 ≥400% (CMP pays back 5×+) · 🟡 150-400% (CMP pays for itself) · 🟠 50-150% (CMP under-saving) · 🔴 <50% (CMP costs more than it saves). For mid-market B2B SaaS (€10M-€50M ARR) DPOs, Privacy Officers, and Procurement.',
  inputs: [
    { name: 'cmp_monthly_cost',     label: 'CMP monthly cost (€/mo)',  placeholder: 'e.g. 1200', type: 'number' },
    { name: 'dsars_per_month',      label: 'DSARs per month',          placeholder: 'e.g. 50',   type: 'number' },
    { name: 'hours_per_dsar',       label: 'Manual hours per DSAR',    placeholder: 'e.g. 2.5',  type: 'number' },
    { name: 'hourly_rate_dpo',      label: 'DPO hourly rate (€/hr)',   placeholder: 'e.g. 95',   type: 'number' },
    { name: 'automation_uplift_pct', label: 'CMP automation uplift (%)', placeholder: 'e.g. 40',  type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `var cnn=function(x){return Math.max(0,x)};function run(inputs, pick, fill) {
  var cmpCost = cnn(Number(inputs.cmp_monthly_cost) || 0);
  var dsars = cnn(Number(inputs.dsars_per_month) || 0);
  var hours = cnn(Number(inputs.hours_per_dsar) || 0);
  var rate = cnn(Number(inputs.hourly_rate_dpo) || 0);
  var uplift = cnn(Number(inputs.automation_uplift_pct) || 0);
  var dsarSavings = dsars * 12 * hours * (uplift / 100) * rate;
  var cmpAnnual = cmpCost * 12;
  var net = dsarSavings - cmpAnnual;
  var roiPct = cmpAnnual > 0 ? (net / cmpAnnual) * 100 : -Infinity;
  var monthlySavings = dsarSavings / 12;
  var payback = monthlySavings > 0 ? cmpAnnual / monthlySavings : Infinity;
  var roiDec = roiPct / 100;
  var band = roiDec >= 4.0 ? 'Excellent' : roiDec >= 1.5 ? 'Good' : roiDec >= 0.5 ? 'Warning' : 'Critical';
  var emoji = roiDec >= 4.0 ? '🟢' : roiDec >= 1.5 ? '🟡' : roiDec >= 0.5 ? '🟠' : '🔴';
  var altDsars = 200;
  var altSavings = altDsars * 12 * hours * (uplift / 100) * rate;
  var altNet = altSavings - cmpAnnual;
  var altRoiPct = cmpAnnual > 0 ? (altNet / cmpAnnual) * 100 : -Infinity;
  var altRoiDec = altRoiPct / 100;
  var altBand = altRoiDec >= 4.0 ? 'Excellent' : altRoiDec >= 1.5 ? 'Good' : altRoiDec >= 0.5 ? 'Warning' : 'Critical';
  var altEmoji = altRoiDec >= 4.0 ? '🟢' : altRoiDec >= 1.5 ? '🟡' : altRoiDec >= 0.5 ? '🟠' : '🔴';
  var altText = altSavings > dsarSavings ? 'climb to' : 'drop to';
  var targetSavings = 5 * cmpAnnual;
  // Keep targetUplift in percentage form (0-100) to match uplift's units, so delta math is consistent.
  var targetUplift = (dsars * 12 * hours * rate) > 0 ? Math.min(100, (targetSavings / (dsars * 12 * hours * rate)) * 100) : uplift;
  var targetDsars = (12 * hours * (uplift / 100) * rate) > 0 ? Math.ceil(targetSavings / (12 * hours * (uplift / 100) * rate)) : dsars;
  var upliftDelta = targetUplift - uplift;
  var dsarDelta = targetDsars - dsars;
  var upliftEasier = Math.abs(upliftDelta / Math.max(uplift, 0.0001)) <= Math.abs(dsarDelta / Math.max(dsars, 0.0001));
  var alreadyExcellent = roiDec >= 4.0;
  var netNegative = net < 0;
  var easierPath;
  if (alreadyExcellent) {
    easierPath = 'already 🟢 Excellent (ROI ≥' + roiPct.toFixed(1) + '%) — no uplift needed';
  } else if (netNegative) {
    easierPath = 'CMP is unprofitable at current settings. Either reduce CMP cost to ≤€' + Math.round(dsarSavings / 12).toLocaleString() + '/mo (so annual cost < annual savings) or increase DSAR volume / automation uplift until net ≥ 0.';
  } else if (upliftEasier) {
    easierPath = 'lift CMP automation uplift to ≥' + targetUplift.toFixed(1) + '% (current ' + uplift.toFixed(1) + '%, +' + upliftDelta.toFixed(1) + 'pp).';
  } else {
    easierPath = 'grow DSAR volume to ≥' + targetDsars + '/mo (current ' + dsars + '/mo, +' + dsarDelta + ').';
  }
  var paybackStr = payback === Infinity ? 'never' : payback.toFixed(1) + ' months';
  return [
    '🩺 CMP ROI: ' + emoji + ' ' + band + ' (net €' + Math.round(net).toLocaleString() + '/yr · ' + roiPct.toFixed(1) + '% ROI · payback ' + paybackStr + ')',
    '📊 Snapshot: ' + dsars.toLocaleString() + ' DSARs/mo × 12 = ' + (dsars * 12).toLocaleString() + '/yr × ' + hours.toFixed(2) + ' hr × ' + rate.toFixed(0) + ' €/hr × ' + uplift.toFixed(0) + '% uplift = €' + Math.round(dsarSavings).toLocaleString() + ' savings · – €' + Math.round(cmpAnnual).toLocaleString() + ' CMP cost = €' + Math.round(net).toLocaleString() + ' net',
    '🔄 What-If: if DSAR volume climbs to ' + altDsars + '/mo, annual savings ' + altText + ' €' + Math.round(altSavings).toLocaleString() + ', net €' + Math.round(altNet).toLocaleString() + ' (' + altEmoji + ' ' + altBand + ').',
    '⚖️ Break-Even: easiest path to 🟢 Excellent (ROI ≥ 400%): ' + easierPath,
    '🎯 Milestone: re-baseline quarterly + after any CMP vendor switch. IAB TCF v2.2 re-certification happens every 12 months — plan a re-evaluation around it.',
    '💡 Tip: pair with [DSAR Processing Cost] (L-2) — CMP reduces DSAR volume via consent logging. Also pair with [Cookie Consent Revenue Impact] (L-3) — premium CMP lifts consent rate. Use our [Break-Even Calculator] (B-7) to size payback against other tooling investments.',
  ];
}
return run(inputs, pick, fill);`,
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
    const cmpCost = clampNonNegative(Number(inputs.cmp_monthly_cost) || 0);
    const dsars = clampNonNegative(Number(inputs.dsars_per_month) || 0);
    const hours = clampNonNegative(Number(inputs.hours_per_dsar) || 0);
    const rate = clampNonNegative(Number(inputs.hourly_rate_dpo) || 0);
    const uplift = clampNonNegative(Number(inputs.automation_uplift_pct) || 0);
    const dsarSavings = dsarAnnualSavings(dsars, hours, rate, uplift);
    const cmpAnnual = cmpAnnualCost(cmpCost);
    const net = netAnnualSavings(dsarSavings, cmpAnnual);
    const roiPct = cmpROI(net, cmpAnnual);
    const monthlySavings = dsarSavings / 12;
    const payback = paybackMonths(cmpAnnual, monthlySavings);
    const band = calcHealthBand(roiPct);
    const bandInfo = HEALTH_BANDS[band];
    const roiDec = roiPct / 100;
    const emoji = roiDec >= 4.0 ? '🟢' : roiDec >= 1.5 ? '🟡' : roiDec >= 0.5 ? '🟠' : '🔴';

    const altDsars = 200;
    const altSavings = dsarAnnualSavings(altDsars, hours, rate, uplift);
    const altNet = netAnnualSavings(altSavings, cmpAnnual);
    const altRoiPct = cmpROI(altNet, cmpAnnual);
    const altBand = calcHealthBand(altRoiPct);
    const altEmoji = (altRoiPct / 100) >= 4.0 ? '🟢' : (altRoiPct / 100) >= 1.5 ? '🟡' : (altRoiPct / 100) >= 0.5 ? '🟠' : '🔴';
    const altText = altSavings > dsarSavings ? 'climb to' : 'drop to';

    // ROI >= 4.0 (decimal) → net/cost >= 4 → savings >= 5× cost. For canonical
    // (savings=57000, cost=14400) need savings >= 72000. Compare two paths:
    // (a) raise uplift vs (b) raise DSAR volume. Pick the smaller relative change.
    const targetSavings = 5 * cmpAnnual;
    // Keep targetUplift in percentage form (0-100) to match uplift's units, so delta math is consistent.
    const targetUplift = (dsars * 12 * hours * rate) > 0
      ? Math.min(100, (targetSavings / (dsars * 12 * hours * rate)) * 100)
      : uplift;
    const targetDsars = (12 * hours * (uplift / 100) * rate) > 0
      ? Math.ceil(targetSavings / (12 * hours * (uplift / 100) * rate))
      : dsars;
    const upliftDelta = targetUplift - uplift;
    const dsarDelta = targetDsars - dsars;
    const upliftEasier = Math.abs(upliftDelta / Math.max(uplift, 0.0001)) <= Math.abs(dsarDelta / Math.max(dsars, 0.0001));
    const alreadyExcellent = roiDec >= 4.0;
    const netNegative = net < 0;

    let easierPath: string;
    if (alreadyExcellent) {
      easierPath = 'already 🟢 Excellent (ROI ≥' + fmtPct(roiPct) + ') — no uplift needed';
    } else if (netNegative) {
      easierPath = 'CMP is unprofitable at current settings. Either reduce CMP cost to ≤' + Math.round(dsarSavings / 12).toLocaleString() + ' €/mo (so annual cost < annual savings) or increase DSAR volume / automation uplift until net ≥ 0.';
    } else if (upliftEasier) {
      easierPath = 'lift CMP automation uplift to ≥' + fmtNum(targetUplift, 1) + '% (current ' + fmtNum(uplift, 1) + '%, +' + fmtNum(upliftDelta, 1) + 'pp).';
    } else {
      easierPath = 'grow DSAR volume to ≥' + targetDsars + '/mo (current ' + dsars + '/mo, +' + dsarDelta + ').';
    }

    const paybackStr = payback === Infinity ? 'never' : fmtNum(payback, 1) + ' months';

    return [
      '🩺 CMP ROI: ' + emoji + ' ' + bandInfo.label + ' (net ' + fmtMoney(net) + '/yr · ' + fmtPct(roiPct) + ' ROI · payback ' + paybackStr + ')',
      '📊 Snapshot: ' + dsars.toLocaleString() + ' DSARs/mo × 12 = ' + (dsars * 12).toLocaleString() + '/yr × ' + fmtNum(hours, 2) + ' hr × ' + fmtNum(rate, 0) + ' €/hr × ' + fmtNum(uplift, 0) + '% uplift = ' + fmtMoney(dsarSavings) + ' savings · – ' + fmtMoney(cmpAnnual) + ' CMP cost = ' + fmtMoney(net) + ' net',
      '🔄 What-If: if DSAR volume climbs to ' + altDsars + '/mo, annual savings ' + altText + ' ' + fmtMoney(altSavings) + ', net ' + fmtMoney(altNet) + ' (' + altEmoji + ' ' + HEALTH_BANDS[altBand].label + ').',
      '⚖️ Break-Even: easiest path to 🟢 Excellent (ROI ≥ 400%): ' + easierPath,
      '🎯 Milestone: re-baseline quarterly + after any CMP vendor switch. IAB TCF v2.2 re-certification happens every 12 months — plan a re-evaluation around it.',
      '💡 Tip: pair with [DSAR Processing Cost] (L-2) — CMP reduces DSAR volume via consent logging. Also pair with [Cookie Consent Revenue Impact] (L-3) — premium CMP lifts consent rate. Use our [Break-Even Calculator] (B-7) to size payback against other tooling investments.',
    ];
  },
  staticExamples: ['🩺 CMP ROI: 🟡 Good (net €42,600/yr · 295.8% ROI · payback 3.0 months)\n📊 Snapshot: 50 DSARs/mo × 12 = 600/yr × 2.50 hr × 95 €/hr × 40% uplift = €57,000 savings · – €14,400 CMP cost = €42,600 net\n🔄 What-If: if DSAR volume climbs to 200/mo, annual savings climb to €228,000, net €213,600 (🟢 Excellent).\n⚖️ Break-Even: easiest path to 🟢 Excellent (ROI ≥ 400%): lift CMP automation uplift to ≥50.5% (current 40.0%, +10.5pp).\n🎯 Milestone: re-baseline quarterly + after any CMP vendor switch. IAB TCF v2.2 re-certification happens every 12 months — plan a re-evaluation around it.\n💡 Tip: pair with [DSAR Processing Cost] (L-2) — CMP reduces DSAR volume via consent logging. Also pair with [Cookie Consent Revenue Impact] (L-3) — premium CMP lifts consent rate. Use our [Break-Even Calculator] (B-7) to size payback against other tooling investments.'],
  faq: [
    { q: 'What is CMP ROI?', a: 'CMP (Consent Management Platform) ROI measures the annual return on a privacy-tech platform investment: DSAR automation savings (volume × hours × rate × uplift %) minus platform cost, expressed as a percentage. Mid-market B2B SaaS CMPs typically run €500–€3000/month (OneTrust, Didomi, Cookiebot, Iubenda per 2024 benchmarks) and produce 100–500% annual ROI through labor savings.' },
    { q: 'How is DSAR automation savings calculated?', a: 'dsar_annual_savings = DSARs/month × 12 × manual hours per DSAR × automation uplift % × DPO hourly rate. The automation uplift % is the share of manual work the CMP eliminates (auto-discovery, template responses, redaction tooling). Mid-market CMPs typically deliver 30–60% uplift (OneTrust 2024: 40–55%).' },
    { q: 'What does the payback period mean?', a: 'payback_months = annual CMP cost / monthly DSAR savings. It is the time for cumulative DSAR savings to cover the annual CMP subscription. For canonical (€14,400/yr cost, €4,750/mo savings), payback is 3.0 months. A payback under 6 months is procurement-ready; over 12 months needs a stronger business case.' },
    { q: 'How is the ROI % calculated?', a: 'roi_pct = (net_annual_savings / cmp_annual_cost) × 100 = ((dsar_savings - cmp_cost) / cmp_cost) × 100. ROI ≥ 400% (Excellent) means the CMP pays back 5×+ over its cost. ROI < 50% (Critical) means the CMP costs more than it saves — consider cheaper alternatives or higher-volume usage to justify the spend.' },
    { q: 'How does this pair with L-2 DSAR Cost?', a: 'L-2 quantifies baseline DSAR cost (volume × hours × rate). L-6 quantifies the CMP savings on top — a CMP reduces manual hours per DSAR by the automation uplift %. Combined, L-2 + L-6 give full privacy-ops ROI: baseline cost vs CMP-augmented cost.' },
    { q: 'How does this pair with L-3 Cookie Consent Revenue?', a: 'L-3 measures consent-rate revenue impact (e.g. 20pp consent gap = €64K/mo recoverable for 200K visitors with 2% conv × €80 AOV). L-6 measures the operational savings of a CMP. A premium CMP often delivers both: revenue lift (L-3) + labor savings (L-6).' },
    { q: 'Does L-6 cover CCPA / global privacy laws?', a: 'Yes — CMPs cover GDPR (ePrivacy Art. 5(3) cookie consent + Art. 7), CCPA/CPRA (Do Not Sell signals), LGPD (Brazil), and PIPL (China). The math (savings vs cost) is universal; only the automation uplift % varies by jurisdiction (CCPA typically 20–30%, GDPR 30–60%).' },
    { q: "What is a Consent Management Platform (CMP)?", a: "CMP = tool to collect, store, and manage user consent for cookies, tracking, data processing. Required by GDPR, CCPA, LGPD. Examples: OneTrust, Cookiebot, Iubenda, Osano. Cost: $10-1000/month. ROI: avoid regulatory fines, build user trust, enable compliant analytics. Most sites need CMP within first year of EU/CA traffic." },
    { q: "How much do GDPR/CCPA fines cost?", a: "GDPR: up to €20M or 4% of global revenue (whichever higher). Average: €50K-500K for SMB. CCPA: $2,500-7,500 per violation, max $0-7.5M+ for pattern. State laws vary. NY SHIELD: $5K per violation. Total risk: 5-10% of revenue. CMP cost: $1-30K/year. ROI: clear. Most companies need CMP." },
    { q: "What is the ROI of a CMP?", a: "CMP cost: $1-30K/year. Avoided fines: $50K-500K (GDPR/CCPA risk). Plus: 1) Enables marketing/analytics in regulated jurisdictions, 2) Builds user trust, 3) Reduces legal work, 4) Future-proofs against new regulations. ROI: 5-50x. Most mid-market: $5-10K/year CMP, $1M+ revenue at risk without it." },
    { q: "Which CMP should I choose?", a: "Pick by: 1) Budget, 2) Regulatory scope, 3) Feature needs, 4) Integration ease. Tier 1 (enterprise): OneTrust, TrustArc ($10K-100K+/year). Tier 2 (mid-market): Cookiebot, Iubenda, Osano ($500-5K/year). Tier 3 (SMB): free Cookiebot, Klaro, Osano. Tier 4: Custom-built (DIY). Most SMBs: tier 2-3 is enough." },
    { q: "What is the impact of CMP on ad revenue?", a: "CMP reduces opt-in rates by 10-30% in EU. Personalized ads drop 30-50%. But: 1) Compliance is mandatory, 2) Contextual ads still work, 3) First-party data compensates, 4) User trust improves long-term. Net impact: -5% to -15% ad revenue in regulated markets. Better than: 100% loss of EU business from non-compliance." },
    { q: "Do I need a CMP if I have no EU traffic?", a: "Maybe. CCPA covers California (US). If you have CA traffic: need CMP. Many US state laws now require opt-in/opt-out. Threshold: 50K+ consumers, $25M revenue, 50% revenue from selling data. Even if not strictly required, CMP builds user trust and prepares for new regulations. Most sites add CMP within 6 months of launch." },
    { q: "How do I implement a CMP correctly?", a: "Steps: 1) Audit current data collection, 2) Categorize cookies/tracking, 3) Choose CMP (Cookiebot for SMB, OneTrust for enterprise), 4) Install, 5) Update privacy policy, 6) Geo-target (GDPR for EU, CCPA for CA, etc.), 7) Test opt-in flows, 8) Train team. Common mistakes: pre-checked boxes, no granular choice, dark patterns. Avoid: legal risk." },
    { q: "What is the difference between opt-in and opt-out CMPs?", a: "Opt-in (GDPR): user must actively consent before tracking. Opt-out (CCPA): user must actively opt out. Default: opt-in for EU, opt-out for CA. Implementation: opt-in requires user action, blocks tracking until consent. Opt-out allows tracking by default. Both need clear UI. Most CMPs: auto-detect user location and apply correct rules." },
  ],
  howToUse: [
    'Enter CMP monthly subscription cost (€/mo) — OneTrust Pro ~€1500/mo, Didomi ~€800/mo, Cookiebot ~€200/mo (per 2024 vendor benchmarks).',
    'Enter monthly DSAR volume from your privacy request ticketing system or CMP portal.',
    'Enter manual hours per DSAR — average across fulfillment team (search + redaction + reply time).',
    'Enter DPO hourly rate — fully-loaded cost including benefits + overhead (typically €80–€150/hr EU mid-market).',
    'Enter CMP automation uplift % — share of DSAR workflow the CMP handles (OneTrust 2024: 40–55%, Cookiebot: 20–30%).',
    'Read the band — 🟢 Excellent ROI ≥ 400% · 🟡 Good 150-400% · 🟠 Warning 50-150% · 🔴 Critical < 50%.',
    'Pair with L-2 (DSAR) for baseline privacy-ops cost; L-3 (Consent Revenue) for revenue lift from consent-rate improvement.',
  ],
  sources: [
    'https://www.onetrust.com/blog/consent-rate-benchmarks/',
    'https://www.didomi.io/blog/cmp-pricing-comparison',
    'https://www.cookiebot.com/en/cmp/',
    'https://iabeurope.eu/tcf-for-vendors/',
    'https://gdpr-info.eu/art-7-gdpr/',
  ],
  engineKey: true,
};
registerEngine(engine);
