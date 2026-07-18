// P13-5 Documentation ROI
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS DevRel/Tech Writer persona ($10M-$50M ARR).
// Community-wisdom thresholds (TSIA 2024 Knowledge Management ROI + Zendesk CX Trends 2024 + Gartner Customer Service 2024).
// HIGHER on roi_pct: more return = better. Excellent band ALSO requires cost/article ≤ $50 (dual-condition);
// critical uses -Infinity. calcHealthBand takes roi in PERCENTAGE form (e.g. 180 = 180%).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

export const HEALTH_BANDS = {
  excellent: { threshold: 4.0, label: 'Excellent', message: 'KB is a profit center.' },
  good:      { threshold: 1.5, label: 'Good',      message: 'KB pays for itself.' },
  warning:   { threshold: 0.5, label: 'Warning',   message: 'Marginal return — review spend.' },
  critical:  { threshold: -Infinity, label: 'Critical', message: 'KB spend exceeds savings.' },
};

export function grossSavings(deflected: number, costPer: number): number {
  return deflected * costPer;
}

// Returns the ROI as a DECIMAL ratio ((gross - kbCost) / kbCost). Multiply by 100 for percentage.
// Guards div-by-zero: kbCost <= 0 → -Infinity (falls to critical band).
export function netROI(gross: number, kbCost: number): number {
  return kbCost > 0 ? (gross - kbCost) / kbCost : -Infinity;
}

export function costPerArticle(kbCost: number, articles: number): number {
  return articles > 0 ? kbCost / articles : Infinity;
}

// roi is in PERCENTAGE form (180 = 180%). Excellent band is dual-condition:
// ROI ≥ 400% AND cost/article ≤ $50. If cost/article exceeds $50, falls back to 'good'.
export function calcHealthBand(roi: number, costPerArt?: number): keyof typeof HEALTH_BANDS {
  const roiDec = roi / 100;
  if (roiDec >= HEALTH_BANDS.excellent.threshold && (costPerArt === undefined || costPerArt <= 50)) return 'excellent';
  if (roiDec >= HEALTH_BANDS.good.threshold) return 'good';
  if (roiDec >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtMoney(x: number): string { return '$' + Math.round(x).toLocaleString(); }
function fmtMoney2(x: number): string { return '$' + x.toFixed(2); }
function fmtInt(x: number): string { return Math.round(x).toLocaleString(); }

const engine: ToolEngine = {
  slug: 'solopreneur-documentation-roi-calculator',
  title: 'Documentation ROI',
  description:
    'Calculate the ROI of your knowledge base: gross ticket-deflection savings minus KB team cost. HIGHER health bands — more return = better: 🟢 ROI ≥400% AND ≤$50/article · 🟡 ≥150% · 🟠 ≥50% · 🔴 <50%. For mid-market B2B SaaS ($10M-$50M ARR) DevRel Leads, Documentation Managers, and CS Ops leads.',
  inputs: [
    { name: 'kb_team_monthly_cost',      label: 'KB team monthly cost ($/mo)',   placeholder: 'e.g. 15000', type: 'number' },
    { name: 'deflected_tickets_monthly', label: 'Tickets deflected (per month)',  placeholder: 'e.g. 1750',  type: 'number' },
    { name: 'cost_per_ticket',           label: 'Cost per ticket ($)',            placeholder: 'e.g. 24',    type: 'number' },
    { name: 'articles_total',            label: 'Total KB articles',              placeholder: 'e.g. 500',   type: 'number' },
    { name: 'roi_target_pct',            label: 'ROI target (%)',                 placeholder: 'e.g. 500',   type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `var cnn=function(x){return Math.max(0,x)};function run(inputs, pick, fill) {
  var kbCost = cnn(Number(inputs.kb_team_monthly_cost) || 0);
  var deflected = cnn(Number(inputs.deflected_tickets_monthly) || 0);
  var costPer = cnn(Number(inputs.cost_per_ticket) || 0);
  var articles = cnn(Number(inputs.articles_total) || 0);
  var target = cnn(Number(inputs.roi_target_pct) || 0);
  var gross = deflected * costPer;
  var net = gross - kbCost;
  var roi = kbCost > 0 ? (net / kbCost) * 100 : -Infinity;
  var roiDec = roi / 100;
  var costPerArt = articles > 0 ? kbCost / articles : Infinity;
  var gap = target - roi;
  var isExc = roiDec >= 4.0 && costPerArt <= 50;
  var band = isExc ? 'Excellent' : roiDec >= 1.5 ? 'Good' : roiDec >= 0.5 ? 'Warning' : 'Critical';
  var emoji = isExc ? '🟢' : roiDec >= 1.5 ? '🟡' : roiDec >= 0.5 ? '🟠' : '🔴';
  var costWarn = (roiDec >= 4.0 && costPerArt > 50) ? ' — ROI excellent but $' + costPerArt.toFixed(2) + '/article >$50 caps it to Good' : '';
  var roiStr = isFinite(roi) ? roi.toFixed(0) + '%' : 'n/a';
  var costPerArtStr = isFinite(costPerArt) ? '$' + costPerArt.toFixed(2) : 'n/a';
  var excDeflected = costPer > 0 ? (5 * kbCost) / costPer : 0;
  var excGross = excDeflected * costPer;
  var excNet = excGross - kbCost;
  var targetGross = kbCost * (1 + target / 100);
  var targetDeflected = costPer > 0 ? targetGross / costPer : 0;
  var targetDelta = targetDeflected - deflected;
  var kbCostForTarget = target > -100 ? gross / (1 + target / 100) : 0;
  return [
    '🩺 Documentation ROI Health: ' + emoji + ' ' + band + ' (' + roiStr + ' ROI · ' + (net >= 0 ? '' : '-') + '$' + Math.abs(Math.round(net)).toLocaleString() + '/mo net savings · ' + costPerArtStr + '/article/mo)' + costWarn,
    '📊 Snapshot: ' + Math.round(deflected).toLocaleString() + ' tickets deflected × $' + costPer + '/ticket = $' + Math.round(gross).toLocaleString() + '/mo gross · minus $' + Math.round(kbCost).toLocaleString() + '/mo KB cost = ' + (net >= 0 ? '' : '-') + '$' + Math.abs(Math.round(net)).toLocaleString() + '/mo net · ' + Math.round(articles).toLocaleString() + ' articles · ROI ' + roiStr + ' vs ' + target + '% target (' + gap.toFixed(0) + 'pp gap)',
    '🔄 What-If: if deflection climbs to ' + Math.round(excDeflected).toLocaleString() + '/mo (from ' + Math.round(deflected).toLocaleString() + ', see K-1 Coverage), gross = $' + Math.round(excGross).toLocaleString() + '/mo, net = $' + Math.round(excNet).toLocaleString() + '/mo, ROI hits 400% (Excellent)',
    '⚖️ Break-Even: to hit your ' + target + '% ROI target, deflect ' + Math.round(targetDeflected).toLocaleString() + '/mo (' + (targetDelta >= 0 ? '+' : '') + Math.round(targetDelta).toLocaleString() + '/mo) OR cut KB cost below $' + Math.round(kbCostForTarget).toLocaleString() + '/mo',
    '🎯 Milestone: cost/article = ' + costPerArtStr + '/mo across ' + Math.round(articles).toLocaleString() + ' articles. Keep it ≤$50 as the KB scales — the Excellent band needs ROI ≥400% AND ≤$50/article.',
    '💡 Tip: ROI scales with deflection volume first. Grow coverage before cutting team cost — see [KB Coverage Rate] (K-1) to find gap topics that lift deflection.',
  ];
}`,
  },
  generate(inputs) {
    const kbCost = clampNonNegative(Number(inputs.kb_team_monthly_cost) || 0);
    const deflected = clampNonNegative(Number(inputs.deflected_tickets_monthly) || 0);
    const costPer = clampNonNegative(Number(inputs.cost_per_ticket) || 0);
    const articles = clampNonNegative(Number(inputs.articles_total) || 0);
    const target = clampNonNegative(Number(inputs.roi_target_pct) || 0);
    const gross = grossSavings(deflected, costPer);
    const net = gross - kbCost;
    const roiDec = netROI(gross, kbCost);
    const roi = roiDec * 100;
    const costPerArt = costPerArticle(kbCost, articles);
    const gap = target - roi;
    const band = calcHealthBand(roi, costPerArt);
    const bandInfo = HEALTH_BANDS[band];
    const costWarn = (roiDec >= 4.0 && costPerArt > 50) ? ' — ROI excellent but ' + fmtMoney2(costPerArt) + '/article >$50 caps it to Good' : '';
    const roiStr = isFinite(roi) ? roi.toFixed(0) + '%' : 'n/a';
    const costPerArtStr = isFinite(costPerArt) ? fmtMoney2(costPerArt) : 'n/a';
    const netStr = (net >= 0 ? '' : '-') + '$' + Math.abs(Math.round(net)).toLocaleString();
    const excDeflected = costPer > 0 ? (5 * kbCost) / costPer : 0;
    const excGross = excDeflected * costPer;
    const excNet = excGross - kbCost;
    const targetGross = kbCost * (1 + target / 100);
    const targetDeflected = costPer > 0 ? targetGross / costPer : 0;
    const targetDelta = targetDeflected - deflected;
    const kbCostForTarget = target > -100 ? gross / (1 + target / 100) : 0;
    return [
      '🩺 Documentation ROI Health: ' + bandInfo.label + ' (' + roiStr + ' ROI · ' + netStr + '/mo net savings · ' + costPerArtStr + '/article/mo)' + costWarn,
      '📊 Snapshot: ' + fmtInt(deflected) + ' tickets deflected × $' + costPer + '/ticket = ' + fmtMoney(gross) + '/mo gross · minus ' + fmtMoney(kbCost) + '/mo KB cost = ' + netStr + '/mo net · ' + fmtInt(articles) + ' articles · ROI ' + roiStr + ' vs ' + target + '% target (' + gap.toFixed(0) + 'pp gap)',
      '🔄 What-If: if deflection climbs to ' + fmtInt(excDeflected) + '/mo (from ' + fmtInt(deflected) + ', see K-1 Coverage), gross = ' + fmtMoney(excGross) + '/mo, net = ' + fmtMoney(excNet) + '/mo, ROI hits 400% (Excellent)',
      '⚖️ Break-Even: to hit your ' + target + '% ROI target, deflect ' + fmtInt(targetDeflected) + '/mo (' + (targetDelta >= 0 ? '+' : '') + fmtInt(targetDelta) + '/mo) OR cut KB cost below ' + fmtMoney(kbCostForTarget) + '/mo',
      '🎯 Milestone: cost/article = ' + costPerArtStr + '/mo across ' + fmtInt(articles) + ' articles. Keep it ≤$50 as the KB scales — the Excellent band needs ROI ≥400% AND ≤$50/article.',
      '💡 Tip: ROI scales with deflection volume first. Grow coverage before cutting team cost — see [KB Coverage Rate] (K-1) to find gap topics that lift deflection.',
    ];
  },
  staticExamples: [
    '🩺 Documentation ROI Health: Good (180% ROI · $27,000/mo net savings · $30.00/article/mo)\n📊 Snapshot: 1,750 tickets deflected × $24/ticket = $42,000/mo gross · minus $15,000/mo KB cost = $27,000/mo net · 500 articles · ROI 180% vs 500% target (320pp gap)\n🔄 What-If: if deflection climbs to 3,125/mo (from 1,750, see K-1 Coverage), gross = $75,000/mo, net = $60,000/mo, ROI hits 400% (Excellent)\n⚖️ Break-Even: to hit your 500% ROI target, deflect 3,750/mo (+2,000/mo) OR cut KB cost below $7,000/mo\n🎯 Milestone: cost/article = $30.00/mo across 500 articles. Keep it ≤$50 as the KB scales — the Excellent band needs ROI ≥400% AND ≤$50/article.\n💡 Tip: ROI scales with deflection volume first. Grow coverage before cutting team cost — see [KB Coverage Rate] (K-1) to find gap topics that lift deflection.',
  ],
  faq: [
    { q: 'How is Documentation ROI calculated?', a: 'ROI = (net savings / KB team cost) × 100, where net savings = (tickets deflected × cost per ticket) − KB team monthly cost. Example: 1,750 tickets deflected × $24 = $42,000 gross savings − $15,000 KB cost = $27,000 net → ROI 180%. It answers "for every $1 spent on the KB, how many $ of support cost do we avoid?"' },
    { q: 'What counts as a "deflected ticket"?', a: 'A deflected ticket is a support contact that self-service (KB article, in-app search, chatbot) resolved before it became a live agent ticket. Most helpdesks (Zendesk, Intercom, Freshdesk) tag these or log KB clicks preceding session close. Pair with K-1 Coverage and P12-5 Deflection Rate to measure volume.' },
    { q: 'Why does the Excellent band need TWO conditions?', a: 'Excellent requires ROI ≥400% AND cost/article ≤$50/mo. High ROI alone can hide a bloated content operation — a KB with 5,000 rarely-read articles is expensive to maintain even if aggregate deflection is high. The dual-condition rewards lean, high-leverage content. If ROI ≥400% but cost/article >$50, the band caps at Good.' },
    { q: 'What cost per ticket should I use?', a: 'Use your blended fully-loaded cost — agent salary + tooling + overhead ÷ tickets handled. Mid-market B2B SaaS runs $15-$40/ticket (Zendesk 2024 benchmarks; Tier-1 ~$8, Tier-3 ~$70). If unknown, our Cost per Support Ticket calculator derives it from tier mix.' },
    { q: 'How do I improve Documentation ROI?', a: 'Two levers: raise deflection volume (grow coverage — see K-1 — and search effectiveness — see K-3) or lower cost per article (consolidate stale/duplicate content — see K-2 Freshness). Raising deflection is usually higher-leverage than cutting team cost, because deflection savings compound while cost cuts are one-time.' },
    { q: 'Why does P13-5 use 5 inputs when other KB calcs use 3-4?', a: 'ROI is a composite metric — it needs cost inputs (team cost, cost per ticket), a volume input (deflected tickets), a normalizer (articles_total for cost/article), and a target (roi_target_pct) for the Break-Even line. The other K calcs measure single ratios; ROI ties them together into dollars.' },
  ],
  howToUse: [
    'Enter KB team monthly cost — fully-loaded cost of writers, tools (Zendesk Guide, Document360), and overhead attributable to the KB.',
    'Enter tickets deflected per month — self-service resolutions before a live ticket (pull from helpdesk deflection tags or P12-5 Deflection Rate).',
    'Enter cost per ticket — blended fully-loaded agent cost per handled ticket (mid-market: $15-$40).',
    'Enter total KB articles — admin count from your KB platform (drives cost/article).',
    'Enter your ROI target % — internal goal for the Break-Even line (default 500%).',
    'Read the ROI band — 🟢 Excellent ≥400% AND ≤$50/article · 🟡 Good ≥150% · 🟠 Warning ≥50% · 🔴 Critical <50%.',
  ],
  sources: [
    'https://www.tsia.com/blog/knowledge-management-benchmark',
    'https://www.zendesk.com/customer-experience-trends/',
    'https://www.gartner.com/en/customer-service-support',
    'https://www.nngroup.com/articles/help-and-documentation/',
  ],
  engineKey: true,
};
registerEngine(engine);
