import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

// ============== Math helpers (exported for tests) ==============

interface CapRateInputs {
  propertyValue: number;
  annualRentIncome: number;
  annualExpenses: number;
  vacancyRate: number;
}

/** Effective gross income after vacancy */
export function effectiveGrossIncome(annualRentIncome: number, vacancyRatePct: number): number {
  return annualRentIncome * (1 - vacancyRatePct / 100);
}

/** Net operating income */
export function noi(inputs: CapRateInputs): number {
  return effectiveGrossIncome(inputs.annualRentIncome, inputs.vacancyRate) - inputs.annualExpenses;
}

/** Cap rate as percent = NOI / value */
export function capRate(inputs: CapRateInputs): number {
  if (inputs.propertyValue <= 0) return 0;
  return (noi(inputs) / inputs.propertyValue) * 100;
}

/** All-cash return on value (NOI/value). Same as capRate when no financing. */
export function cashOnCashAllCash(inputs: CapRateInputs): number {
  return capRate(inputs);
}

/** Reverse: given target cap rate (%), what property value = NOI / (target/100) */
export function impliedValue(annualNOI: number, targetCapRatePct: number): number {
  if (targetCapRatePct <= 0) return 0;
  return annualNOI / (targetCapRatePct / 100);
}

/** Health: 5-9% typical residential; 3-5% (low HCOL) or 9-12% (high distressed) marginal; outside = outlier */
export function capRateHealth(capRatePct: number): { emoji: string; label: string } {
  if (capRatePct >= 5 && capRatePct <= 9) return { emoji: '🟢', label: 'typical residential — cap rate in 5-9% range' };
  if ((capRatePct >= 3 && capRatePct < 5) || (capRatePct > 9 && capRatePct <= 12))
    return { emoji: '🟡', label: 'marginal — outside typical band (low HCOL or high-distressed)' };
  return { emoji: '🟠', label: 'outlier — cap rate outside 3-12% range; verify market assumptions' };
}

// ============== calculate() ==============

function calculateCapRate(inputs: Record<string, string>): string[] {
  const propertyValue = clampNonNegative(parseFloat(inputs.propertyValue) || 0);
  const annualRentIncome = clampNonNegative(parseFloat(inputs.annualRentIncome) || 0);
  const annualExpenses = clampNonNegative(parseFloat(inputs.annualExpenses) || 0);
  const vacancyRate = parseFloat(inputs.vacancyRate) || 0;

  if (propertyValue <= 0) {
    return ['⏰ Cap Rate Calculator\n\n💰 Enter property value, annual rent, expenses, and vacancy rate to see your cap rate, NOI, and stage benchmarks.'];
  }
  if (vacancyRate >= 100) {
    return ['⏰ Cap Rate Calculator\n\n💰 Vacancy ≥ 100% would yield zero effective income. Cap rate math does not apply at this vacancy level.'];
  }

  const args = { propertyValue, annualRentIncome, annualExpenses, vacancyRate };
  const effGI = effectiveGrossIncome(annualRentIncome, vacancyRate);
  const NOI = noi(args);
  const cap = capRate(args);
  const coc = cashOnCashAllCash(args);
  const implied = impliedValue(NOI, 7);
  const health = capRateHealth(cap);

  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const money = (n: number) => '$' + fmt(n);

  // What-If inputs
  const effGIplus = effectiveGrossIncome(annualRentIncome + 3600, vacancyRate);  // +$300/mo
  const NOIplus = effGIplus - annualExpenses;
  const capPlus = (NOIplus / propertyValue) * 100;
  const NOIlessExp = effGI - annualExpenses * 0.9;
  const capLessExp = (NOIlessExp / propertyValue) * 100;
  const effGIvac5 = effectiveGrossIncome(annualRentIncome, vacancyRate + 5);
  const NOIvac5 = effGIvac5 - annualExpenses;
  const capVac5 = (NOIvac5 / propertyValue) * 100;
  const implied8 = impliedValue(NOI, 8);
  const implied10 = impliedValue(NOI, 10);

  // Tip selection
  let tip: string;
  if (cap > 12) {
    tip = '💡 Tip: Cap rate above 12% signals higher risk — distressed area, deferred maintenance, or soft rental market. Verify the rent and expense assumptions before investing.';
  } else if (cap < 3) {
    tip = '💡 Tip: Cap rate below 3% (low HCOL/coastal markets like SF/NYC) compresses cash flow. Verify appreciation potential — these deals work on capital gains, not yield.';
  } else {
    tip = '💡 Tip: Cap rate excludes financing. For leveraged ROI, use a Cash-on-Cash calculator instead — same NOI, divided by your actual cash invested (down payment + closing costs).';
  }

  const r =
    '⏰ Cap Rate Calculator\n\n' +
    '💰 Property Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Property value:        ' + money(propertyValue) + '\n' +
    '• Gross rental income:   ' + money(annualRentIncome) + '  (annual)\n' +
    '• Vacancy rate:          ' + vacancyRate + '%\n' +
    '• Effective gross income:' + money(effGI) + '\n' +
    '• Operating expenses:    ' + money(annualExpenses) + '  (annual)\n' +
    '• Net Operating Income:  ' + money(NOI) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Cap Rate Math:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Cap rate:    ' + cap.toFixed(2) + '%  (NOI / value × 100)\n' +
    '• All-cash return: ' + coc.toFixed(2) + '%  (same as cap when no financing)\n' +
    '• Implied value at 7% target: ' + money(implied) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Cap Rate Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + health.emoji + ' ' + health.label + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Market Benchmarks (Class A/B/C by city tier):\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Class A urban (NYC/SF):  3-5%   cap rate\n' +
    '• Class B mid-tier cities: 5-8%   cap rate\n' +
    '• Class C value-add:       8-12%  cap rate\n' +
    '• Distressed:              >12%   cap rate (verify assumptions)\n' +
    '• Rural / low-tier:        10-15% cap rate (often appreciation-limited)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Implied Value (Reverse Calc):\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Target cap rate 5%:  value = ' + money(impliedValue(NOI, 5)) + '\n' +
    '• Target cap rate 7%:  value = ' + money(implied) + '  ← current\n' +
    '• Target cap rate 8%:  value = ' + money(implied8) + '\n' +
    '• Target cap rate 10%: value = ' + money(implied10) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Vacancy +5pp (' + (vacancyRate + 5) + '%):    cap → ' + capVac5.toFixed(2) + '%\n' +
    '• Expenses −10%:               cap → ' + capLessExp.toFixed(2) + '%\n' +
    '• Rent +$300/mo (extra):       cap → ' + capPlus.toFixed(2) + '%\n' +
    '• Target 8% cap (better yield): value = ' + money(implied8) + '\n' +
    '• Target 10% cap:               value = ' + money(implied10) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip;

  const results: string[] = [r];

  // SEO comparison rows at 6 cap rates
  const targetCaps = [3, 5, 7, 9, 11, 13];
  for (const t of targetCaps) {
    const v = impliedValue(NOI, t);
    results.push(
      'Comparison: target ' + t + '% cap on NOI ' + money(NOI) + ' → implied value ' + money(v) +
        (t === 7 ? '  ← current heuristic' : ''),
    );
  }
  return results;
}

// ============== customFn (live = static parity) ==============

const customFn =
  "function effGI(ari,vrp){return ari*(1-vrp/100);}" +
  "function noi(pv,ari,ae,vr){return effGI(ari,vr)-ae;}" +
  "function capR(pv,ari,ae,vr){if(pv<=0)return 0;return(noi(pv,ari,ae,vr)/pv)*100;}" +
  "function cocAC(pv,ari,ae,vr){return capR(pv,ari,ae,vr);}" +
  "function implV(noi,tcr){if(tcr<=0)return 0;return noi/(tcr/100);}" +
  "function cRH(c){if(c>=5&&c<=9)return{e:'\\uD83D\\uDFE2',l:'typical residential \\u2014 cap rate in 5-9% range'};if((c>=3&&c<5)||(c>9&&c<=12))return{e:'\\uD83D\\uDCA1',l:'marginal \\u2014 outside typical band (low HCOL or high-distressed)'};return{e:'\\uD83D\\uDFE0',l:'outlier \\u2014 cap rate outside 3-12% range; verify market assumptions'};}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var pv=cnn(parseFloat(inputs.propertyValue)||0);" +
  "var ari=cnn(parseFloat(inputs.annualRentIncome)||0);" +
  "var ae=cnn(parseFloat(inputs.annualExpenses)||0);" +
  "var vr=parseFloat(inputs.vacancyRate)||0;" +
  "if(pv<=0){return['\\u23F0 Cap Rate Calculator\\n\\n\\uD83D\\uDCB0 Enter property value, annual rent, expenses, and vacancy rate to see your cap rate, NOI, and stage benchmarks.'];}" +
  "if(vr>=100){return['\\u23F0 Cap Rate Calculator\\n\\n\\uD83D\\uDCB0 Vacancy \\u2265 100% would yield zero effective income. Cap rate math does not apply at this vacancy level.'];}" +
  "var egi=effGI(ari,vr);var NOI=noi(pv,ari,ae,vr);var cap=capR(pv,ari,ae,vr);var coc=cocAC(pv,ari,ae,vr);var impl7=implV(NOI,7);var hl=cRH(cap);" +
  "function fmt(n){return n.toLocaleString('en-US',{maximumFractionDigits:0});}" +
  "function money(n){return '$'+fmt(n);}" +
  "var egiP=effGI(ari+3600,vr);var NOIp=egiP-ae;var capP=(NOIp/pv)*100;" +
  "var NOIl=egi-ae*0.9;var capL=(NOIl/pv)*100;" +
  "var egiV=effGI(ari,vr+5);var NOIv=egiV-ae;var capV=(NOIv/pv)*100;" +
  "var impl8=implV(NOI,8);var impl10=implV(NOI,10);" +
  "var tip='';" +
  "if(cap>12){tip='\\uD83D\\uDCA1 Tip: Cap rate above 12% signals higher risk \\u2014 distressed area, deferred maintenance, or soft rental market. Verify the rent and expense assumptions before investing.';}" +
  "else if(cap<3){tip='\\uD83D\\uDCA1 Tip: Cap rate below 3% (low HCOL/coastal markets like SF/NYC) compresses cash flow. Verify appreciation potential \\u2014 these deals work on capital gains, not yield.';}" +
  "else{tip='\\uD83D\\uDCA1 Tip: Cap rate excludes financing. For leveraged ROI, use a Cash-on-Cash calculator instead \\u2014 same NOI, divided by your actual cash invested (down payment + closing costs).';}" +
  "var r2='';" +
  "r2+='\\u23F0 Cap Rate Calculator\\n\\n';" +
  "r2+='\\uD83D\\uDCB0 Property Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Property value:        '+money(pv)+'\\n';" +
  "r2+='\\u2022 Gross rental income:   '+money(ari)+'  (annual)\\n';" +
  "r2+='\\u2022 Vacancy rate:          '+vr+'%\\n';" +
  "r2+='\\u2022 Effective gross income:'+money(egi)+'\\n';" +
  "r2+='\\u2022 Operating expenses:    '+money(ae)+'  (annual)\\n';" +
  "r2+='\\u2022 Net Operating Income:  '+money(NOI)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCD0 Cap Rate Math:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Cap rate:    '+cap.toFixed(2)+'%  (NOI / value \\u00D7 100)\\n';" +
  "r2+='\\u2022 All-cash return: '+coc.toFixed(2)+'%  (same as cap when no financing)\\n';" +
  "r2+='\\u2022 Implied value at 7% target: '+money(impl7)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Cap Rate Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+hl.e+' '+hl.l+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Market Benchmarks (Class A/B/C by city tier):\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Class A urban (NYC/SF):  3-5%   cap rate\\n';" +
  "r2+='\\u2022 Class B mid-tier cities: 5-8%   cap rate\\n';" +
  "r2+='\\u2022 Class C value-add:       8-12%  cap rate\\n';" +
  "r2+='\\u2022 Distressed:              >12%   cap rate (verify assumptions)\\n';" +
  "r2+='\\u2022 Rural / low-tier:        10-15% cap rate (often appreciation-limited)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Implied Value (Reverse Calc):\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Target cap rate 5%:  value = '+money(implV(NOI,5))+'\\n';" +
  "r2+='\\u2022 Target cap rate 7%:  value = '+money(impl7)+'  \\u2190 current\\n';" +
  "r2+='\\u2022 Target cap rate 8%:  value = '+money(impl8)+'\\n';" +
  "r2+='\\u2022 Target cap rate 10%: value = '+money(impl10)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If Scenarios:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Vacancy +5pp ('+(vr+5).toFixed(1)+'%):    cap \\u2192 '+capV.toFixed(2)+'%\\n';" +
  "r2+='\\u2022 Expenses \\u221210%:               cap \\u2192 '+capL.toFixed(2)+'%\\n';" +
  "r2+='\\u2022 Rent +$300/mo (extra):       cap \\u2192 '+capP.toFixed(2)+'%\\n';" +
  "r2+='\\u2022 Target 8% cap (better yield): value = '+money(impl8)+'\\n';" +
  "r2+='\\u2022 Target 10% cap:               value = '+money(impl10)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=tip;" +
  "var results=[r2];" +
  "var tcs=[3,5,7,9,11,13];" +
  "for(var ti=0;ti<tcs.length;ti++){var t=tcs[ti];var v=implV(NOI,t);results.push('Comparison: target '+t+'% cap on NOI '+money(NOI)+' \\u2192 implied value '+money(v)+(t===7?'  \\u2190 current heuristic':''));}" +
  "return results;";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-cap-rate-calculator',
  title: 'Cap Rate Calculator',
  description:
    'Calculate property cap rate (NOI / value) and compare to market benchmarks (Class A/B/C urban, value-add, distressed). Includes reverse implied-value calc at user-chosen target cap rates.',
  inputs: [
    { name: 'propertyValue', label: 'Property Value ($)', placeholder: 'e.g. 500000', type: 'number' },
    { name: 'annualRentIncome', label: 'Annual Gross Rental Income ($)', placeholder: 'e.g. 36000', type: 'number' },
    { name: 'annualExpenses', label: 'Annual Operating Expenses ($)', placeholder: 'e.g. 12000', type: 'number' },
    { name: 'vacancyRate', label: 'Vacancy Rate (%)', placeholder: 'e.g. 5', type: 'number' },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs: Record<string, string>): string[] {
    return calculateCapRate(inputs);
  },
  staticExamples: ['⏰ Cap Rate Calculator\n\n💰 Property Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Property value:        $500,000\n• Gross rental income:   $36,000  (annual)\n• Vacancy rate:          5%\n• Effective gross income:$34,200\n• Operating expenses:    $12,000  (annual)\n• Net Operating Income:  $22,200\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Cap Rate Math:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Cap rate:    4.44%  (NOI / value × 100)\n• All-cash return: 4.44%  (same as cap when no financing)\n• Implied value at 7% target: $317,143\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Cap Rate Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 marginal — outside typical band (low HCOL or high-distressed)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Market Benchmarks (Class A/B/C by city tier):\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Class A urban (NYC/SF):  3-5%   cap rate\n• Class B mid-tier cities: 5-8%   cap rate\n• Class C value-add:       8-12%  cap rate\n• Distressed:              >12%   cap rate (verify assumptions)\n• Rural / low-tier:        10-15% cap rate (often appreciation-limited)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Implied Value (Reverse Calc):\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Target cap rate 5%:  value = $444,000\n• Target cap rate 7%:  value = $317,143  ← current\n• Target cap rate 8%:  value = $277,500\n• Target cap rate 10%: value = $222,000\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Vacancy +5pp (10%):    cap → 4.08%\n• Expenses −10%:               cap → 4.68%\n• Rent +$300/mo (extra):       cap → 5.12%\n• Target 8% cap (better yield): value = $277,500\n• Target 10% cap:               value = $222,000\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: Cap rate excludes financing. For leveraged ROI, use a Cash-on-Cash calculator instead — same NOI, divided by your actual cash invested (down payment + closing costs).\nComparison: target 3% cap on NOI $22,200 → implied value $740,000\nComparison: target 5% cap on NOI $22,200 → implied value $444,000\nComparison: target 7% cap on NOI $22,200 → implied value $317,143  ← current heuristic\nComparison: target 9% cap on NOI $22,200 → implied value $246,667\nComparison: target 11% cap on NOI $22,200 → implied value $201,818\nComparison: target 13% cap on NOI $22,200 → implied value $170,769'],
  faq: [
    {
      q: 'What is a cap rate?',
      a: 'Cap rate (capitalization rate) is the ratio of a property\'s Net Operating Income (NOI) to its value, expressed as a percent. Formula: (NOI / Property Value) × 100. For a $500K property with $22K annual NOI, cap rate = 4.4%. Cap rate is the most fundamental metric for comparing real estate investments independent of financing.',
    },
    {
      q: 'What is a good cap rate?',
      a: 'It depends on asset class and market. Residential urban Class A (NYC, SF): 3-5%. Class B mid-tier cities: 5-8%. Class C value-add: 8-12%. Distressed: >12%. Rural / lower-tier markets: 10-15% (often appreciation-limited). Within each market, lower cap = lower risk + lower yield, higher cap = higher risk + higher yield. Choose based on your risk tolerance and holding period.',
    },
    {
      q: 'How is NOI different from cash flow?',
      a: 'NOI (Net Operating Income) is income minus operating expenses (property tax, insurance, maintenance, management fees) BEFORE debt service. Cash flow is NOI MINUS mortgage payments (P&I). Cap rate uses NOI, so it\'s a pure property metric — independent of financing. Cash-on-cash return uses cash flow divided by actual cash invested (down payment + closing), which is financing-dependent.',
    },
    {
      q: 'What if vacancy is high?',
      a: 'Vacancy directly reduces effective gross income. At 100% vacancy, NOI = -expenses (negative). Most markets average 5-10% vacancy; Class A urban often <5%, Class C often 8-15%. Use realistic vacancy assumptions — landlords often under-estimate. Run the "Vacancy +5pp" what-if to see impact.',
    },
    {
      q: 'Is a higher cap rate always better?',
      a: 'No. Higher cap = higher yield BUT higher risk. The discount reflects market expectation of: (1) lower rent growth, (2) higher expense volatility, (3) lower appreciation, (4) thinner tenant pool. A 12% cap in a Class B midwestern city is normal; a 12% cap in Manhattan signals a problem. Compare in same market, similar asset class.',
    },
  ],
  howToUse: [
    'Enter the property value (or purchase price for new acquisitions).',
    'Enter your expected annual gross rental income (sum of 12 months of rent).',
    'Enter annual operating expenses (property tax + insurance + maintenance + management).',
    'Enter expected vacancy rate (5-10% typical residential; 8-15% Class C).',
    'Review your cap rate (NOI / value) and health band (🟢 typical / 🟡 marginal / 🟠 outlier).',
    'Compare to Class A/B/C market benchmarks to gauge relative pricing.',
    'Use reverse calc to find implied value at target cap rates (5%, 7%, 8%, 10%).',
    'Apply what-ifs (vacancy +5pp, expenses -10%, rent +$300/mo) for sensitivity.',
  ],
  engineKey: true,
};

registerEngine(engine);
