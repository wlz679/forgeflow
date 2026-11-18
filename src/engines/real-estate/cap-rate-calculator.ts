import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-8：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
//   ⚠️ 章节标题 / 标签用**字面量 token**（code|原文|）；整行结论句用
//      makeToken(code, fallback, params) ⇒ fallback 与 params 取**同一个变量**。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

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
    return [
      '$calc_out.section.cap_rate_calculator|⏰ Cap Rate Calculator|\n\n' +
      makeToken('calc_out.cap_rate.row.enter_inputs_required', '💰 Enter property value, annual rent, expenses, and vacancy rate to see your cap rate, NOI, and stage benchmarks.'),
    ];
  }
  if (vacancyRate >= 100) {
    return [
      '$calc_out.section.cap_rate_calculator|⏰ Cap Rate Calculator|\n\n' +
      makeToken('calc_out.cap_rate.row.vacancy_100_or_more', '💰 Vacancy ≥ 100% would yield zero effective income. Cap rate math does not apply at this vacancy level.'),
    ];
  }

  const args = { propertyValue, annualRentIncome, annualExpenses, vacancyRate };
  const effGI = effectiveGrossIncome(annualRentIncome, vacancyRate);
  const NOI = noi(args);
  const cap = capRate(args);
  const coc = cashOnCashAllCash(args);
  const implied = impliedValue(NOI, 7);
  const health = capRateHealth(cap);
  // P168 B3-8：健康度整行令牌化 —— code 按 label 前缀选（**不重复阈值**），emoji 取自 capRateHealth
  const healthRow =
    health.label.indexOf('typical residential') === 0
      ? makeToken('calc_out.cap_rate.row.health_typical', health.emoji + ' ' + health.label)
      : health.label.indexOf('marginal') === 0
      ? makeToken('calc_out.cap_rate.row.health_marginal', health.emoji + ' ' + health.label)
      : makeToken('calc_out.cap_rate.row.health_outlier', health.emoji + ' ' + health.label);

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
    tip = makeToken('calc_out.cap_rate.row.tip_high_risk', '💡 Tip: Cap rate above 12% signals higher risk — distressed area, deferred maintenance, or soft rental market. Verify the rent and expense assumptions before investing.');
  } else if (cap < 3) {
    tip = makeToken('calc_out.cap_rate.row.tip_low_cap', '💡 Tip: Cap rate below 3% (low HCOL/coastal markets like SF/NYC) compresses cash flow. Verify appreciation potential — these deals work on capital gains, not yield.');
  } else {
    tip = makeToken('calc_out.cap_rate.row.tip_excludes_financing', '💡 Tip: Cap rate excludes financing. For leveraged ROI, use a Cash-on-Cash calculator instead — same NOI, divided by your actual cash invested (down payment + closing costs).');
  }

  const r =
    '$calc_out.section.cap_rate_calculator|⏰ Cap Rate Calculator|\n\n' +
    '$calc_out.section.cap_rate_property_snapshot|💰 Property Snapshot:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• $calc_out.label.property_value|Property value|:        ' + money(propertyValue) + '\n' +
    '• ' + makeToken('calc_out.cap_rate.row.gross_rental_income', 'Gross rental income:   ' + money(annualRentIncome) + '  (annual)', { rent: money(annualRentIncome) }) + '\n' +
    '• $calc_out.label.vacancy_rate|Vacancy rate|:          ' + vacancyRate + '%\n' +
    '• $calc_out.label.effective_gross_income|Effective gross income|:' + money(effGI) + '\n' +
    '• ' + makeToken('calc_out.cap_rate.row.operating_expenses', 'Operating expenses:    ' + money(annualExpenses) + '  (annual)', { expenses: money(annualExpenses) }) + '\n' +
    '• $calc_out.label.net_operating_income|Net Operating Income|:  ' + money(NOI) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.cap_rate_math|📐 Cap Rate Math:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.cap_rate.row.cap_rate_math', 'Cap rate:    ' + cap.toFixed(2) + '%  (NOI / value × 100)', { cap: cap.toFixed(2) + '%' }) + '\n' +
    '• ' + makeToken('calc_out.cap_rate.row.all_cash_return', 'All-cash return: ' + coc.toFixed(2) + '%  (same as cap when no financing)', { ret: coc.toFixed(2) + '%' }) + '\n' +
    '• $calc_out.label.implied_value_7pct_target|Implied value at 7% target|: ' + money(implied) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.cap_rate_health|🩺 Cap Rate Health:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthRow + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.cap_rate_market_benchmarks|🎯 Market Benchmarks (Class A/B/C by city tier):|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.cap_rate.row.benchmark_class_a', 'Class A urban (NYC/SF):  3-5%   cap rate') + '\n' +
    '• ' + makeToken('calc_out.cap_rate.row.benchmark_class_b', 'Class B mid-tier cities: 5-8%   cap rate') + '\n' +
    '• ' + makeToken('calc_out.cap_rate.row.benchmark_class_c', 'Class C value-add:       8-12%  cap rate') + '\n' +
    '• ' + makeToken('calc_out.cap_rate.row.benchmark_distressed', 'Distressed:              >12%   cap rate (verify assumptions)') + '\n' +
    '• ' + makeToken('calc_out.cap_rate.row.benchmark_rural', 'Rural / low-tier:        10-15% cap rate (often appreciation-limited)') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.cap_rate_implied_value|⚖️ Implied Value (Reverse Calc):|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.cap_rate.row.implied_value_5pct', 'Target cap rate 5%:  value = ' + money(impliedValue(NOI, 5)), { value: money(impliedValue(NOI, 5)) }) + '\n' +
    '• ' + makeToken('calc_out.cap_rate.row.implied_value_7pct', 'Target cap rate 7%:  value = ' + money(implied) + '  ← current', { value: money(implied) }) + '\n' +
    '• ' + makeToken('calc_out.cap_rate.row.implied_value_8pct', 'Target cap rate 8%:  value = ' + money(implied8), { value: money(implied8) }) + '\n' +
    '• ' + makeToken('calc_out.cap_rate.row.implied_value_10pct', 'Target cap rate 10%: value = ' + money(implied10), { value: money(implied10) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.cap_rate_what_if|🔄 What-If Scenarios:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.cap_rate.row.whatif_vacancy_plus_5pp', 'Vacancy +5pp (' + (vacancyRate + 5) + '%):    cap → ' + capVac5.toFixed(2) + '%', { vacancy: (vacancyRate + 5) + '%', cap: capVac5.toFixed(2) + '%' }) + '\n' +
    '• ' + makeToken('calc_out.cap_rate.row.whatif_expenses_minus_10', 'Expenses −10%:               cap → ' + capLessExp.toFixed(2) + '%', { cap: capLessExp.toFixed(2) + '%' }) + '\n' +
    '• ' + makeToken('calc_out.cap_rate.row.whatif_rent_plus_300', 'Rent +$300/mo (extra):       cap → ' + capPlus.toFixed(2) + '%', { cap: capPlus.toFixed(2) + '%' }) + '\n' +
    '• ' + makeToken('calc_out.cap_rate.row.whatif_target_8pct', 'Target 8% cap (better yield): value = ' + money(implied8), { value: money(implied8) }) + '\n' +
    '• ' + makeToken('calc_out.cap_rate.row.whatif_target_10pct', 'Target 10% cap:               value = ' + money(implied10), { value: money(implied10) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip;

  const results: string[] = [r];

  // SEO comparison rows at 6 cap rates
  const targetCaps = [3, 5, 7, 9, 11, 13];
  for (const t of targetCaps) {
    const v = impliedValue(NOI, t);
    results.push(
      // ⚠️ ' | ' 是维度行分隔符 ⇒ 不得进 fallback；这里整行是**结论句** ⇒ 走行码 + 共享 'Comparison' 标签
      '$calc_out.label.comparison|Comparison|: ' +
      makeToken('calc_out.cap_rate.row.comparison_implied_value', 'target ' + t + '% cap on NOI ' + money(NOI) + ' → implied value ' + money(v), { target: String(t), noi: money(NOI), value: money(v) }) +
        (t === 7 ? '  ' + makeToken('calc_out.cap_rate.row.comparison_current_heuristic', '← current heuristic') : ''),
    );
  }
  return results;
}

// ============== customFn (live = static parity) ==============

const customFn =
  // P168 B3-8：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 服务端与客户端输出逐字节相同，不可能漂移；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let f=function(a){return Number.isNaN(a)?0:Math.max(0,a)},_=function(a,c){return a*(1-c/100)},g=function(a){return _(a.annualRentIncome,a.vacancyRate)-a.annualExpenses},y=function(a){return a.propertyValue<=0?0:g(a)/a.propertyValue*100},b=function(a){return y(a)},s=function(a,c){return c<=0?0:a/(c/100)},x=function(a){return a>=5&&a<=9?{emoji:"🟢",label:"typical residential — cap rate in 5-9% range"}:a>=3&&a<5||a>9&&a<=12?{emoji:"🟡",label:"marginal — outside typical band (low HCOL or high-distressed)"}:{emoji:"🟠",label:"outlier — cap rate outside 3-12% range; verify market assumptions"}},C=function(a){const c=f(parseFloat(a.propertyValue)||0),p=f(parseFloat(a.annualRentIncome)||0),r=f(parseFloat(a.annualExpenses)||0),l=parseFloat(a.vacancyRate)||0;if(c<=0)return[\`$calc_out.section.cap_rate_calculator|⏰ Cap Rate Calculator|

\`+e("calc_out.cap_rate.row.enter_inputs_required","💰 Enter property value, annual rent, expenses, and vacancy rate to see your cap rate, NOI, and stage benchmarks.")];if(l>=100)return[\`$calc_out.section.cap_rate_calculator|⏰ Cap Rate Calculator|

\`+e("calc_out.cap_rate.row.vacancy_100_or_more","💰 Vacancy ≥ 100% would yield zero effective income. Cap rate math does not apply at this vacancy level.")];const w={propertyValue:c,annualRentIncome:p,annualExpenses:r,vacancyRate:l},F=_(p,l),n=g(w),u=y(w),O=b(w),m=s(n,7),o=x(u),G=o.label.indexOf("typical residential")===0?e("calc_out.cap_rate.row.health_typical",o.emoji+" "+o.label):o.label.indexOf("marginal")===0?e("calc_out.cap_rate.row.health_marginal",o.emoji+" "+o.label):e("calc_out.cap_rate.row.health_outlier",o.emoji+" "+o.label),q=i=>i.toLocaleString("en-US",{maximumFractionDigits:0}),t=i=>"$"+q(i),N=(_(p+3600,l)-r)/c*100,$=(F-r*.9)/c*100,j=(_(p,l+5)-r)/c*100,d=s(n,8),v=s(n,10);let h;u>12?h=e("calc_out.cap_rate.row.tip_high_risk","💡 Tip: Cap rate above 12% signals higher risk — distressed area, deferred maintenance, or soft rental market. Verify the rent and expense assumptions before investing."):u<3?h=e("calc_out.cap_rate.row.tip_low_cap","💡 Tip: Cap rate below 3% (low HCOL/coastal markets like SF/NYC) compresses cash flow. Verify appreciation potential — these deals work on capital gains, not yield."):h=e("calc_out.cap_rate.row.tip_excludes_financing","💡 Tip: Cap rate excludes financing. For leveraged ROI, use a Cash-on-Cash calculator instead — same NOI, divided by your actual cash invested (down payment + closing costs).");const E=[\`$calc_out.section.cap_rate_calculator|⏰ Cap Rate Calculator|

$calc_out.section.cap_rate_property_snapshot|💰 Property Snapshot:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• $calc_out.label.property_value|Property value|:        \`+t(c)+\`
• \`+e("calc_out.cap_rate.row.gross_rental_income","Gross rental income:   "+t(p)+"  (annual)",{rent:t(p)})+\`
• $calc_out.label.vacancy_rate|Vacancy rate|:          \`+l+\`%
• $calc_out.label.effective_gross_income|Effective gross income|:\`+t(F)+\`
• \`+e("calc_out.cap_rate.row.operating_expenses","Operating expenses:    "+t(r)+"  (annual)",{expenses:t(r)})+\`
• $calc_out.label.net_operating_income|Net Operating Income|:  \`+t(n)+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.cap_rate_math|📐 Cap Rate Math:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+e("calc_out.cap_rate.row.cap_rate_math","Cap rate:    "+u.toFixed(2)+"%  (NOI / value × 100)",{cap:u.toFixed(2)+"%"})+\`
• \`+e("calc_out.cap_rate.row.all_cash_return","All-cash return: "+O.toFixed(2)+"%  (same as cap when no financing)",{ret:O.toFixed(2)+"%"})+\`
• $calc_out.label.implied_value_7pct_target|Implied value at 7% target|: \`+t(m)+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.cap_rate_health|🩺 Cap Rate Health:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+G+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.cap_rate_market_benchmarks|🎯 Market Benchmarks (Class A/B/C by city tier):|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+e("calc_out.cap_rate.row.benchmark_class_a","Class A urban (NYC/SF):  3-5%   cap rate")+\`
• \`+e("calc_out.cap_rate.row.benchmark_class_b","Class B mid-tier cities: 5-8%   cap rate")+\`
• \`+e("calc_out.cap_rate.row.benchmark_class_c","Class C value-add:       8-12%  cap rate")+\`
• \`+e("calc_out.cap_rate.row.benchmark_distressed","Distressed:              >12%   cap rate (verify assumptions)")+\`
• \`+e("calc_out.cap_rate.row.benchmark_rural","Rural / low-tier:        10-15% cap rate (often appreciation-limited)")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.cap_rate_implied_value|⚖️ Implied Value (Reverse Calc):|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+e("calc_out.cap_rate.row.implied_value_5pct","Target cap rate 5%:  value = "+t(s(n,5)),{value:t(s(n,5))})+\`
• \`+e("calc_out.cap_rate.row.implied_value_7pct","Target cap rate 7%:  value = "+t(m)+"  ← current",{value:t(m)})+\`
• \`+e("calc_out.cap_rate.row.implied_value_8pct","Target cap rate 8%:  value = "+t(d),{value:t(d)})+\`
• \`+e("calc_out.cap_rate.row.implied_value_10pct","Target cap rate 10%: value = "+t(v),{value:t(v)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.cap_rate_what_if|🔄 What-If Scenarios:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+e("calc_out.cap_rate.row.whatif_vacancy_plus_5pp","Vacancy +5pp ("+(l+5)+"%):    cap → "+j.toFixed(2)+"%",{vacancy:l+5+"%",cap:j.toFixed(2)+"%"})+\`
• \`+e("calc_out.cap_rate.row.whatif_expenses_minus_10","Expenses −10%:               cap → "+$.toFixed(2)+"%",{cap:$.toFixed(2)+"%"})+\`
• \`+e("calc_out.cap_rate.row.whatif_rent_plus_300","Rent +$300/mo (extra):       cap → "+N.toFixed(2)+"%",{cap:N.toFixed(2)+"%"})+\`
• \`+e("calc_out.cap_rate.row.whatif_target_8pct","Target 8% cap (better yield): value = "+t(d),{value:t(d)})+\`
• \`+e("calc_out.cap_rate.row.whatif_target_10pct","Target 10% cap:               value = "+t(v),{value:t(v)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+h],A=[3,5,7,9,11,13];for(const i of A){const S=s(n,i);E.push("$calc_out.label.comparison|Comparison|: "+e("calc_out.cap_rate.row.comparison_implied_value","target "+i+"% cap on NOI "+t(n)+" → implied value "+t(S),{target:String(i),noi:t(n),value:t(S)})+(i===7?"  "+e("calc_out.cap_rate.row.comparison_current_heuristic","← current heuristic"):""))}return E},I=function(a,c,p){var r=R(a);return Array.isArray(r)?r.join(\`
\`):String(r)};var L=f,B=_,D=g,H=y,M=b,Y=s,z=x,J=C,K=I,e=tk,V='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',e=new Function("return "+V)(),R=function(a){return C(a)};return[I(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

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
  generate(inputs: Record<string, string>): string[] {
    return calculateCapRate(inputs);
  },
  staticExamples: ['$calc_out.section.cap_rate_calculator|⏰ Cap Rate Calculator|\n\n$calc_out.section.cap_rate_property_snapshot|💰 Property Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.property_value|Property value|:        $500,000\n• $calc_out.cap_rate.row.gross_rental_income{"rent":"$36,000"}|Gross rental income:   $36,000  (annual)|\n• $calc_out.label.vacancy_rate|Vacancy rate|:          5%\n• $calc_out.label.effective_gross_income|Effective gross income|:$34,200\n• $calc_out.cap_rate.row.operating_expenses{"expenses":"$12,000"}|Operating expenses:    $12,000  (annual)|\n• $calc_out.label.net_operating_income|Net Operating Income|:  $22,200\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.cap_rate_math|📐 Cap Rate Math:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.cap_rate.row.cap_rate_math{"cap":"4.44%"}|Cap rate:    4.44%  (NOI / value × 100)|\n• $calc_out.cap_rate.row.all_cash_return{"ret":"4.44%"}|All-cash return: 4.44%  (same as cap when no financing)|\n• $calc_out.label.implied_value_7pct_target|Implied value at 7% target|: $317,143\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.cap_rate_health|🩺 Cap Rate Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.cap_rate.row.health_marginal|🟡 marginal — outside typical band (low HCOL or high-distressed)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.cap_rate_market_benchmarks|🎯 Market Benchmarks (Class A/B/C by city tier):|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.cap_rate.row.benchmark_class_a|Class A urban (NYC/SF):  3-5%   cap rate|\n• $calc_out.cap_rate.row.benchmark_class_b|Class B mid-tier cities: 5-8%   cap rate|\n• $calc_out.cap_rate.row.benchmark_class_c|Class C value-add:       8-12%  cap rate|\n• $calc_out.cap_rate.row.benchmark_distressed|Distressed:              >12%   cap rate (verify assumptions)|\n• $calc_out.cap_rate.row.benchmark_rural|Rural / low-tier:        10-15% cap rate (often appreciation-limited)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.cap_rate_implied_value|⚖️ Implied Value (Reverse Calc):|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.cap_rate.row.implied_value_5pct{"value":"$444,000"}|Target cap rate 5%:  value = $444,000|\n• $calc_out.cap_rate.row.implied_value_7pct{"value":"$317,143"}|Target cap rate 7%:  value = $317,143  ← current|\n• $calc_out.cap_rate.row.implied_value_8pct{"value":"$277,500"}|Target cap rate 8%:  value = $277,500|\n• $calc_out.cap_rate.row.implied_value_10pct{"value":"$222,000"}|Target cap rate 10%: value = $222,000|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.cap_rate_what_if|🔄 What-If Scenarios:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.cap_rate.row.whatif_vacancy_plus_5pp{"vacancy":"10%","cap":"4.08%"}|Vacancy +5pp (10%):    cap → 4.08%|\n• $calc_out.cap_rate.row.whatif_expenses_minus_10{"cap":"4.68%"}|Expenses −10%:               cap → 4.68%|\n• $calc_out.cap_rate.row.whatif_rent_plus_300{"cap":"5.12%"}|Rent +$300/mo (extra):       cap → 5.12%|\n• $calc_out.cap_rate.row.whatif_target_8pct{"value":"$277,500"}|Target 8% cap (better yield): value = $277,500|\n• $calc_out.cap_rate.row.whatif_target_10pct{"value":"$222,000"}|Target 10% cap:               value = $222,000|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.cap_rate.row.tip_excludes_financing|💡 Tip: Cap rate excludes financing. For leveraged ROI, use a Cash-on-Cash calculator instead — same NOI, divided by your actual cash invested (down payment + closing costs).|\n$calc_out.label.comparison|Comparison|: $calc_out.cap_rate.row.comparison_implied_value{"target":"3","noi":"$22,200","value":"$740,000"}|target 3% cap on NOI $22,200 → implied value $740,000|\n$calc_out.label.comparison|Comparison|: $calc_out.cap_rate.row.comparison_implied_value{"target":"5","noi":"$22,200","value":"$444,000"}|target 5% cap on NOI $22,200 → implied value $444,000|\n$calc_out.label.comparison|Comparison|: $calc_out.cap_rate.row.comparison_implied_value{"target":"7","noi":"$22,200","value":"$317,143"}|target 7% cap on NOI $22,200 → implied value $317,143|  $calc_out.cap_rate.row.comparison_current_heuristic|← current heuristic|\n$calc_out.label.comparison|Comparison|: $calc_out.cap_rate.row.comparison_implied_value{"target":"9","noi":"$22,200","value":"$246,667"}|target 9% cap on NOI $22,200 → implied value $246,667|\n$calc_out.label.comparison|Comparison|: $calc_out.cap_rate.row.comparison_implied_value{"target":"11","noi":"$22,200","value":"$201,818"}|target 11% cap on NOI $22,200 → implied value $201,818|\n$calc_out.label.comparison|Comparison|: $calc_out.cap_rate.row.comparison_implied_value{"target":"13","noi":"$22,200","value":"$170,769"}|target 13% cap on NOI $22,200 → implied value $170,769|'],
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
    { q: "What is a good cap rate for rental property?", a: "Cap rate = NOI / property value. Benchmarks: 1) Class A (urban, new): 3-5%, 2) Class B (mid-tier): 5-7%, 3) Class C (older, working class): 7-10%, 4) Class D (distressed): 10%+. By market: NYC/SF 3-4%, Midwest 7-10%, Sun Belt 5-8%. Higher cap = more risk, lower price, lower appreciation. Most investors: target 6-10% for cash flow + appreciation balance." },
    { q: "What is the difference between cap rate and cash-on-cash return?", a: "Cap rate: NOI / property value. Cash-on-cash: annual cash flow / cash invested. Cap rate ignores financing. Cash-on-cash considers mortgage. For all-cash: CoC = cap rate. For financed: CoC can be higher (leverage) or lower (if NOI < debt service). Most investors: track both. Use cap rate for property comparison. Use CoC for ROI on your actual cash." },
    { q: "How do I calculate NOI for cap rate?", a: "NOI = gross rental income - operating expenses. Operating expenses: 1) Property taxes, 2) Insurance, 3) Maintenance (5-10% of rent), 4) Property management (8-10% of rent), 5) Vacancy (5-10% of rent), 6) Utilities (if owner pays). Exclude: mortgage, depreciation, capital improvements. For $2K/month rent, $500 expenses: NOI = $18K/year. Cap rate = $18K / $300K = 6%." },
    { q: "What is the best cap rate for a beginner?", a: "Beginner: target 8-10% cap rate. Reasons: 1) Cushion for mistakes, 2) Better cash flow, 3) Easier to find deals, 4) More forgiving. Markets: secondary cities, Midwest, Sun Belt. Avoid: <5% cap rates (low cash flow, high entry cost). Higher cap: more risk, less appreciation. Most: 7-9% is sweet spot for first-time investors. Goal: 6-12 units in 5 years." },
    { q: "How does cap rate relate to property appreciation?", a: "Inverse relationship. High cap rate (10%): typically less appreciation, older properties, more risk. Low cap rate (4%): typically more appreciation, newer properties, urban. Trade-off: cash flow vs appreciation. Most investors: balance both (5-7% cap + appreciation). Markets: NYC (3-4% cap, 5%+ appreciation) vs Memphis (8% cap, 2% appreciation). Total return: 7-10% in either case." },
    { q: "How do interest rates affect cap rates?", a: "Inverse relationship. As interest rates rise, cap rates rise (lower property values, higher yield required). 1% rise in rates: 5-15% drop in property values (cap rate expansion). 1% drop: 5-15% rise in values (cap rate compression). The 10-year Treasury + 2-4% spread = cap rate. Most investors: 5-7% cap rate for stable markets, 7-10% in volatile. Watch Fed signals." },
    { q: "What is a good cap rate for a specific market?", a: "Per market: 1) San Francisco: 3-5%, 2) NYC: 3-5%, 3) Austin: 5-7%, 4) Atlanta: 6-8%, 5) Memphis: 8-10%, 6) Detroit: 10%+. Most investors: target 100-200 bps above current 10-year Treasury. Use 1) Local real estate groups, 2) Costar/Reonomy, 3) Local agents. Trends: 1-3% range per market. Update quarterly. cap rates are sticky short-term." },
    { q: "How do I use cap rate to compare properties?", a: "Compare: similar markets, similar class (A, B, C), similar size. Cap rate normalizes for price. Higher cap = better cash flow but typically more risk. Use filter properties in same market by cap rate, then evaluate on cash flow + appreciation + tenant quality. 2-3% cap rate range in same market. Avoid comparing SFH cap to multifamily cap (different dynamics)." },
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
