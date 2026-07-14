// P14-4 Data Processing Agreement (DPA) Negotiation Cost
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS DPO/Privacy Officer persona (€10M-€50M ARR).
// Benchmark anchor: Fieldfisher 2024 DPA negotiation survey.
// HIGHER on annual_dpa_cost: more cost = worse legal-ops scaling. Bands: <€100K / €100-300K / €300-600K / ≥€600K.
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

export const HEALTH_BANDS = {
  excellent: { threshold: 100_000,  label: 'Excellent', message: 'Lean legal ops.' },
  good:      { threshold: 300_000,  label: 'Good',      message: 'Manageable DPA cost.' },
  warning:   { threshold: 600_000,  label: 'Warning',   message: 'Legal ops DPA-bound.' },
  critical:  { threshold: Infinity, label: 'Critical',  message: 'Disproportionate DPA drag.' },
};

export function dpaBaseHours(rounds: number, hoursPerRound: number): number {
  return rounds * hoursPerRound;
}

export function redlineMultiplier(redlines: number): number {
  // Fieldfisher 2024 benchmark: each redline adds 5% to the base negotiation effort.
  return 1 + redlines * 0.05;
}

export function annualDPACost(dpas: number, baseHours: number, rate: number, redlines: number): number {
  return dpas * 4 * baseHours * rate * redlineMultiplier(redlines);
}

export function costPerDPA(baseHours: number, rate: number, redlines: number): number {
  return baseHours * rate * redlineMultiplier(redlines);
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
  slug: 'solopreneur-dpa-cost-calculator',
  title: 'DPA Negotiation Cost',
  description:
    'Quantify annual Data Processing Agreement negotiation cost from DPA volume, negotiation rounds, legal hours, hourly rate, and redline complexity. HIGHER health bands — more cost = worse legal-ops scaling: 🟢 <€100K/yr · 🟡 €100-300K · 🟠 €300-600K · 🔴 ≥€600K. For mid-market B2B SaaS (€10M-€50M ARR) DPOs, Privacy Officers, Legal Ops, and Sales leaders.',
  inputs: [
    { name: 'dpas_per_quarter',        label: 'DPAs per quarter',             placeholder: 'e.g. 40',  type: 'number' },
    { name: 'avg_negotiation_rounds',  label: 'Average negotiation rounds',  placeholder: 'e.g. 4',   type: 'number' },
    { name: 'hours_per_round',         label: 'Legal hours per round',       placeholder: 'e.g. 1.5', type: 'number' },
    { name: 'legal_hourly_rate',       label: 'Legal hourly rate (€/hr)',    placeholder: 'e.g. 250', type: 'number' },
    { name: 'redlines_per_dpa',        label: 'Redlines per DPA',            placeholder: 'e.g. 8',   type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `function run(inputs, pick, fill) {
  var dpas = Number(inputs.dpas_per_quarter) || 0;
  var rounds = Number(inputs.avg_negotiation_rounds) || 0;
  var hoursPerRound = Number(inputs.hours_per_round) || 0;
  var rate = Number(inputs.legal_hourly_rate) || 0;
  var redlines = Number(inputs.redlines_per_dpa) || 0;
  var baseHours = rounds * hoursPerRound;
  var multiplier = 1 + redlines * 0.05;
  var perDPA = baseHours * rate * multiplier;
  var annual = dpas * 4 * perDPA;
  var band = annual < 100000 ? 'Excellent' : annual < 300000 ? 'Good' : annual < 600000 ? 'Warning' : 'Critical';
  var emoji = annual < 100000 ? '🟢' : annual < 300000 ? '🟡' : annual < 600000 ? '🟠' : '🔴';
  var altRounds = 2;
  var altBaseHours = altRounds * hoursPerRound;
  var altAnnual = dpas * 4 * altBaseHours * rate * multiplier;
  var altBand = altAnnual < 100000 ? 'Excellent' : altAnnual < 300000 ? 'Good' : altAnnual < 600000 ? 'Warning' : 'Critical';
  var altEmoji = altAnnual < 100000 ? '🟢' : altAnnual < 300000 ? '🟡' : altAnnual < 600000 ? '🟠' : '🔴';
  var targetAnnual = 99999;
  var targetDpas = (4 * baseHours * rate * multiplier) > 0 ? targetAnnual / (4 * baseHours * rate * multiplier) : dpas;
  var dpaReductionPct = dpas > 0 ? Math.min(100, Math.max(0, (dpas - targetDpas) / dpas * 100)) : 0;
  var targetMultiplier = (dpas * 4 * baseHours * rate) > 0 ? targetAnnual / (dpas * 4 * baseHours * rate) : multiplier;
  var targetRedlines = (targetMultiplier - 1) / 0.05;
  var redlineReductionPct = redlines > 0 && targetRedlines >= 0 ? Math.min(100, Math.max(0, (redlines - targetRedlines) / redlines * 100)) : Infinity;
  var newAnnualAt1_2 = dpas * 4 * (1.2 * hoursPerRound) * rate * multiplier;
  var roundsViable = rounds > 1.2 && newAnnualAt1_2 < 100000;
  var roundsReductionPct = roundsViable ? Math.min(100, Math.max(0, (rounds - 1.2) / rounds * 100)) : Infinity;
  var alreadyExcellent = annual < 100000;
  var paths = [
    { pct: redlineReductionPct, label: 'reduce average redlines to ≤' + targetRedlines.toFixed(1) + '/DPA (' + redlineReductionPct.toFixed(1) + '% fewer)' },
    { pct: dpaReductionPct, label: 'reduce DPA volume to ≤' + targetDpas.toFixed(1) + '/quarter (' + dpaReductionPct.toFixed(1) + '% fewer)' }
  ];
  if (roundsViable) paths.push({ pct: roundsReductionPct, label: 'reduce average rounds to ≤1.2 (template-first, ' + roundsReductionPct.toFixed(1) + '% fewer)' });
  paths.sort(function(a, b) { return a.pct - b.pct; });
  var easierPath = alreadyExcellent ? 'already below €100K — no reduction needed' : paths[0].label;
  var altVerb = altAnnual < annual ? 'drops to' : 'is already optimal at';
  var altDisplayed = altAnnual < annual ? altAnnual : annual;
  return [
    '🩺 DPA Cost: ' + emoji + ' ' + band + ' (annual cost €' + Math.floor(annual).toLocaleString() + ' · ' + Math.round(perDPA).toLocaleString() + ' €/DPA · ' + baseHours.toFixed(2) + ' base hr/DPA)',
    '📊 Snapshot: ' + dpas.toLocaleString() + ' DPAs/q × 4 = ' + (dpas * 4).toLocaleString() + '/yr · ' + rounds.toFixed(1) + ' rounds × ' + hoursPerRound.toFixed(2) + ' hr = ' + baseHours.toFixed(2) + ' base hr · ' + redlines.toFixed(1) + ' redlines × 5% → ' + multiplier.toFixed(2) + '× · ' + Math.round(rate).toLocaleString() + ' €/hr',
    '🔄 What-If: if average rounds drop to 2 (template-first approach), annual cost ' + altVerb + ' ' + Math.round(altDisplayed).toLocaleString() + ' € (' + altEmoji + ' ' + altBand + ').',
    '⚖️ Break-Even: easiest path to 🟢 Excellent (<€100K): ' + easierPath + '.',
    '🎯 Milestone: re-baseline quarterly and track DPA turnaround alongside sales-cycle days; template-first playbooks should cut the median negotiation to 2 rounds within two quarters.',
    '💡 Tip: pair with our [Pipeline Value Calculator] (P8-1) because DPA rounds delay deal close. Also pair with [GDPR Fine Calculator] (L-1) because compliance cost compounds with sales-cycle risk.',
  ];
}
return run(inputs, pick, fill);`,
  },
  generate(inputs) {
    const dpas = Number(inputs.dpas_per_quarter) || 0;
    const rounds = Number(inputs.avg_negotiation_rounds) || 0;
    const hoursPerRound = Number(inputs.hours_per_round) || 0;
    const rate = Number(inputs.legal_hourly_rate) || 0;
    const redlines = Number(inputs.redlines_per_dpa) || 0;
    const baseHours = dpaBaseHours(rounds, hoursPerRound);
    const multiplier = redlineMultiplier(redlines);
    const perDPA = costPerDPA(baseHours, rate, redlines);
    const annual = annualDPACost(dpas, baseHours, rate, redlines);
    const band = calcHealthBand(annual);
    const bandInfo = HEALTH_BANDS[band];
    const emoji = annual < 100_000 ? '🟢' : annual < 300_000 ? '🟡' : annual < 600_000 ? '🟠' : '🔴';
    const altRounds = 2;
    const altBaseHours = dpaBaseHours(altRounds, hoursPerRound);
    const altAnnual = annualDPACost(dpas, altBaseHours, rate, redlines);
    const altBand = calcHealthBand(altAnnual);
    const altEmoji = altAnnual < 100_000 ? '🟢' : altAnnual < 300_000 ? '🟡' : altAnnual < 600_000 ? '🟠' : '🔴';

    // Strict-< band: use €99,999 so the displayed easier path actually lands in Excellent.
    // Compare proportional change in quarterly DPA volume vs average redlines; a negative
    // redline target means redline reduction alone cannot reach the threshold.
    const targetAnnual = HEALTH_BANDS.excellent.threshold - 1;
    const targetDpas = (4 * baseHours * rate * multiplier) > 0
      ? targetAnnual / (4 * baseHours * rate * multiplier)
      : dpas;
    const dpaReductionPct = dpas > 0
      ? Math.min(100, Math.max(0, ((dpas - targetDpas) / dpas) * 100))
      : 0;
    const targetMultiplier = (dpas * 4 * baseHours * rate) > 0
      ? targetAnnual / (dpas * 4 * baseHours * rate)
      : multiplier;
    const targetRedlines = (targetMultiplier - 1) / 0.05;
    const redlineReductionPct = redlines > 0 && targetRedlines >= 0
      ? Math.min(100, Math.max(0, ((redlines - targetRedlines) / redlines) * 100))
      : Infinity;
    // Third path: reduce avg rounds to ≤1.2 (template-first). Viable only if newAnnual < targetAnnual.
    const newAnnualAt1_2 = dpas * 4 * (1.2 * hoursPerRound) * rate * multiplier;
    const roundsViable = rounds > 1.2 && newAnnualAt1_2 < targetAnnual;
    const roundsReductionPct = roundsViable
      ? Math.min(100, Math.max(0, ((rounds - 1.2) / rounds) * 100))
      : Infinity;
    const easierPath = annual < HEALTH_BANDS.excellent.threshold
      ? 'already below €100K — no reduction needed'
      : (() => {
          type Path = { pct: number; label: string };
          const paths: Path[] = [
            { pct: redlineReductionPct, label: 'reduce average redlines to ≤' + fmtNum(targetRedlines, 1) + '/DPA (' + fmtNum(redlineReductionPct, 1) + '% fewer)' },
            { pct: dpaReductionPct,     label: 'reduce DPA volume to ≤' + fmtNum(targetDpas, 1) + '/quarter (' + fmtNum(dpaReductionPct, 1) + '% fewer)' },
          ];
          if (roundsViable) {
            paths.push({ pct: roundsReductionPct, label: 'reduce average rounds to ≤1.2 (template-first, ' + fmtNum(roundsReductionPct, 1) + '% fewer)' });
          }
          paths.sort((a, b) => a.pct - b.pct);
          return paths[0].label;
        })();
    // What-If verb guard: "drops to" is only true when altAnnual < annual.
    const altVerb = altAnnual < annual ? 'drops to' : 'is already optimal at';
    const altDisplayed = altAnnual < annual ? altAnnual : annual;

    return [
      '🩺 DPA Cost: ' + emoji + ' ' + bandInfo.label + ' (annual cost €' + Math.floor(annual).toLocaleString() + ' · ' + fmtMoney(perDPA) + '/DPA · ' + fmtNum(baseHours, 2) + ' base hr/DPA)',
      '📊 Snapshot: ' + dpas.toLocaleString() + ' DPAs/q × 4 = ' + (dpas * 4).toLocaleString() + '/yr · ' + fmtNum(rounds, 1) + ' rounds × ' + fmtNum(hoursPerRound, 2) + ' hr = ' + fmtNum(baseHours, 2) + ' base hr · ' + fmtNum(redlines, 1) + ' redlines × 5% → ' + fmtNum(multiplier, 2) + '× · ' + fmtMoney(rate) + '/hr',
      '🔄 What-If: if average rounds drop to ' + altRounds + ' (template-first approach), annual cost ' + altVerb + ' ' + fmtMoney(altDisplayed) + ' (' + altEmoji + ' ' + HEALTH_BANDS[altBand].label + ').',
      '⚖️ Break-Even: easiest path to 🟢 Excellent (<€100K): ' + easierPath + '.',
      '🎯 Milestone: re-baseline quarterly and track DPA turnaround alongside sales-cycle days; template-first playbooks should cut the median negotiation to 2 rounds within two quarters.',
      '💡 Tip: pair with our [Pipeline Value Calculator] (P8-1) because DPA rounds delay deal close. Also pair with [GDPR Fine Calculator] (L-1) because compliance cost compounds with sales-cycle risk.',
    ];
  },
  staticExamples: ['🩺 DPA Cost: 🟠 Warning (annual cost €336,000 · €2,100/DPA · 6.00 base hr/DPA)\n📊 Snapshot: 40 DPAs/q × 4 = 160/yr · 4.0 rounds × 1.50 hr = 6.00 base hr · 8.0 redlines × 5% → 1.40× · €250/hr\n🔄 What-If: if average rounds drop to 2 (template-first approach), annual cost drops to €168,000 (🟡 Good).\n⚖️ Break-Even: easiest path to 🟢 Excellent (<€100K): reduce DPA volume to ≤11.9/quarter (70.2% fewer).\n🎯 Milestone: re-baseline quarterly and track DPA turnaround alongside sales-cycle days; template-first playbooks should cut the median negotiation to 2 rounds within two quarters.\n💡 Tip: pair with our [Pipeline Value Calculator] (P8-1) because DPA rounds delay deal close. Also pair with [GDPR Fine Calculator] (L-1) because compliance cost compounds with sales-cycle risk.'],
  faq: [
    { q: 'What is DPA negotiation cost?', a: 'DPA negotiation cost is the annual legal labor spent reviewing and redlining Data Processing Agreements: quarterly DPA volume × 4 × negotiation rounds × hours per round × legal hourly rate × redline complexity multiplier.' },
    { q: 'Why does each redline add 5%?', a: 'The calculator uses a Fieldfisher 2024 DPA negotiation survey benchmark: each substantive redline adds about 5% to base negotiation effort through review, counter-drafting, stakeholder approval, and version control. The multiplier is 1 + (redlines × 0.05), so 8 redlines produce 1.40× effort.' },
    { q: 'How should I count negotiation rounds?', a: 'Count one round each time a DPA draft crosses company boundaries and returns with substantive edits. Internal legal review alone is not a new round. Use a rolling quarterly average across signed deals rather than one unusually difficult enterprise contract.' },
    { q: 'What is a template-first DPA approach?', a: 'Template-first means offering a pre-approved DPA with fallback clauses, jurisdiction-specific annexes, and a redline playbook before bespoke drafting begins. Mature legal-ops teams often reduce four rounds to two, cutting the canonical annual cost from €336K to €168K.' },
    { q: 'How do DPA rounds affect sales?', a: 'DPA review commonly sits between security approval and signature. Extra rounds hold weighted pipeline in the negotiation stage, delay close dates, and increase forecast slippage. Pair this calculator with P8-1 Pipeline Value to quantify the revenue waiting behind legal review.' },
    { q: 'How does this pair with GDPR fine risk?', a: 'L-4 measures recurring legal-operations cost; L-1 GDPR Fine measures regulatory tail risk. Reducing negotiation effort must not remove processor safeguards required by GDPR Art. 28, so review savings and fine exposure should be assessed together.' },
  ],
  howToUse: [
    'Enter the average number of DPAs reviewed each quarter.',
    'Enter average negotiation rounds per DPA, counted as external draft exchanges.',
    'Enter legal hours spent in each round across counsel and privacy stakeholders.',
    'Enter the fully loaded internal or external legal hourly rate in euros.',
    'Enter average substantive redlines per DPA; each adds 5% to base effort.',
    'Review annual cost, the 2-round template-first scenario, and the easiest path below €100K/year.',
  ],
  sources: [
    'https://www.fieldfisher.com/en/insights/data-processing-agreements',
    'https://gdpr-info.eu/art-28-gdpr/',
    'https://iapp.org/resources/article/data-processing-agreements/',
  ],
};
registerEngine(engine);
