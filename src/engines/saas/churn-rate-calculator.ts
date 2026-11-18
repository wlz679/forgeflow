import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-9：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂。
//   ⚠️ 章节标题 / 标签用**字面量 token**（code|原文|）；带运行时数值的整行用
//      makeToken(code, fallback, params) ⇒ fallback 与 params 取**同一个变量**。
//   ⛔ 「💡 Tip: {"code":...}」是 P168 决策建议 i18n 的既定形态 ⇒ **一个字都不动**
//      （src/lib/decision-support.ts 的 parseDecisionTip 解析它；英文句子在 decision_tip.* 模板里）。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

function calculateChurn(inputs: Record<string, string>): string[] {
  const customersStart = clampNonNegative(parseInt(inputs.customersStart) || 0);
  const customersLost = clampNonNegative(parseInt(inputs.customersLost) || 0);
  const newCustomers = clampNonNegative(parseInt(inputs.newCustomers) || 0);
  const avgRevenue = clampNonNegative(parseFloat(inputs.avgRevenuePerCustomer) || 0);
  const expansionRevenue = clampNonNegative(parseFloat(inputs.expansionRevenue) || 0);
  const results: string[] = [];

  // Logo churn (customer headcount)
  const monthlyLogoChurn = customersStart > 0 ? customersLost / customersStart : 0;
  const annualLogoChurn = 1 - Math.pow(1 - monthlyLogoChurn, 12);

  // Customer growth
  const customersEnd = customersStart - customersLost + newCustomers;
  const netGrowth = customersEnd - customersStart;
  const growthRate = customersStart > 0 ? (netGrowth / customersStart) * 100 : 0;

  // Revenue calculations (only meaningful when avgRevenue > 0)
  const startingRevenue = customersStart * avgRevenue;
  const churnedRevenue = customersLost * avgRevenue;
  const monthlyGrossRevChurn = startingRevenue > 0 ? churnedRevenue / startingRevenue : 0;
  const monthlyNetRevChurn = startingRevenue > 0 ? (churnedRevenue - expansionRevenue) / startingRevenue : 0;

  // GRR / NRR
  const grr = startingRevenue > 0 ? ((startingRevenue - churnedRevenue) / startingRevenue) * 100 : 0;
  const nrr = startingRevenue > 0 ? ((startingRevenue + expansionRevenue - churnedRevenue) / startingRevenue) * 100 : 0;

  const pct = (n: number) => (n * 100).toFixed(1) + '%';
  const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
  const loc = (n: number) => n.toLocaleString();

  // ---- Build main result ----
  let mainResult =
    '$calc_out.section.churn_rate_logo_revenue_churn_analysis|📉 Logo & Revenue Churn Analysis|\n\n' +
    '• $calc_out.label.customers_at_start|Customers at Start|: ' + loc(customersStart) + '\n' +
    '• $calc_out.label.new_customers_added|New Customers Added|: ' + loc(newCustomers) + '\n' +
    '• $calc_out.label.customers_lost|Customers Lost|: ' + loc(customersLost) + '\n' +
    '• $calc_out.label.customers_at_end|Customers at End|: ' + loc(customersEnd) + '\n' +
    '• $calc_out.label.net_growth|Net Growth|: ' + (netGrowth >= 0 ? '+' : '') + loc(netGrowth) + ' (' + growthRate.toFixed(1) + '%)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n';

  // ---- Logo Churn section ----
  mainResult +=
    '$calc_out.section.churn_rate_logo_churn|👥 Logo Churn (Customer Headcount)|\n' +
    '• $calc_out.label.monthly_logo_churn|Monthly Logo Churn|: ' + pct(monthlyLogoChurn) + '\n' +
    '• $calc_out.label.annual_logo_churn|Annual Logo Churn|: ' + pct(annualLogoChurn) + '\n\n';

  // ---- Revenue Churn section (only when avgRevenue > 0) ----
  if (avgRevenue > 0) {
    mainResult +=
      '$calc_out.section.churn_rate_revenue_churn|💰 Revenue Churn|\n' +
      '• $calc_out.label.gross_revenue_churn|Gross Revenue Churn (before expansion)|: ' + pct(monthlyGrossRevChurn) + '\n' +
      '• $calc_out.label.net_revenue_churn|Net Revenue Churn (after expansion)|: ' + pct(monthlyNetRevChurn) + '\n' +
      '• $calc_out.label.monthly_revenue_lost_to_churn|Monthly Revenue Lost to Churn|: ' + fmt(churnedRevenue) + '\n' +
      '• $calc_out.label.annual_revenue_lost_to_churn|Annual Revenue Lost to Churn|: ' + fmt(churnedRevenue * 12) + '\n\n';

    // ---- GRR / NRR section ----
    // NRR status
    let nrrLabel = '';
    if (nrr >= 120) nrrLabel = '🟢 Best-in-class';
    else if (nrr >= 100) nrrLabel = '🟡 Positive';
    else nrrLabel = '🔴 Shrinking';

    // GRR status
    let grrLabel = '';
    if (grr >= 90) grrLabel = '🟢 Healthy';
    else if (grr >= 80) grrLabel = '🟡 Watch';
    else grrLabel = '🔴 At risk';

    // ⭐ 每档**单独写出 code 字面量**（动态拼码 ⇒ 静态扫描器认不出 ⇒ locale 落库后仍红）
    let grrRow: string;
    if (grr >= 90) {
      grrRow = makeToken('calc_out.churn_rate.row.grr_healthy', 'GRR = ' + grr.toFixed(1) + '% — ' + grrLabel, { grr: grr.toFixed(1) });
    } else if (grr >= 80) {
      grrRow = makeToken('calc_out.churn_rate.row.grr_watch', 'GRR = ' + grr.toFixed(1) + '% — ' + grrLabel, { grr: grr.toFixed(1) });
    } else {
      grrRow = makeToken('calc_out.churn_rate.row.grr_at_risk', 'GRR = ' + grr.toFixed(1) + '% — ' + grrLabel, { grr: grr.toFixed(1) });
    }
    let nrrRow: string;
    if (nrr >= 120) {
      nrrRow = makeToken('calc_out.churn_rate.row.nrr_best_in_class', 'NRR = ' + nrr.toFixed(1) + '% — ' + nrrLabel, { nrr: nrr.toFixed(1) });
    } else if (nrr >= 100) {
      nrrRow = makeToken('calc_out.churn_rate.row.nrr_positive', 'NRR = ' + nrr.toFixed(1) + '% — ' + nrrLabel, { nrr: nrr.toFixed(1) });
    } else {
      nrrRow = makeToken('calc_out.churn_rate.row.nrr_shrinking', 'NRR = ' + nrr.toFixed(1) + '% — ' + nrrLabel, { nrr: nrr.toFixed(1) });
    }

    mainResult +=
      '$calc_out.section.churn_rate_grr_nrr|📈 GRR / NRR|\n' +
      '• ' + grrRow + '\n' +
      '• ' + nrrRow + '\n\n';
  }

  mainResult +=
    '━━━━━━━━━━━━━━━━━━━━\n\n';

  // ---- Health assessment (based on monthly logo churn) ----
  if (monthlyLogoChurn <= 0.02) {
    mainResult += makeToken('calc_out.churn_rate.row.health_healthy', '🟢 HEALTHY: Monthly logo churn under 2% is excellent. Keep doing what you are doing.') + '\n';
  } else if (monthlyLogoChurn <= 0.05) {
    mainResult += makeToken('calc_out.churn_rate.row.health_average', '🟡 AVERAGE: 2-5% monthly logo churn is typical for SaaS. There is room for improvement.') + '\n';
  } else {
    mainResult += makeToken('calc_out.churn_rate.row.health_high', '🔴 HIGH: Over 5% monthly logo churn means you are losing ~46%+ of customers annually. Address this urgently.') + '\n';
  }

  mainResult += '\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n';

  // ---- Churn Attribution (when customersLost > 0) ----
  if (customersLost > 0) {
    const voluntaryEst = Math.round(customersLost * 0.6);
    const involuntaryEst = Math.round(customersLost * 0.4);
    mainResult +=
      makeToken('calc_out.churn_rate.row.churn_attribution', '🔍 Churn Attribution (' + loc(customersLost) + ' customers lost)', { lost: loc(customersLost) }) + '\n' +
      '• ' + makeToken('calc_out.churn_rate.row.voluntary_churn', 'Voluntary (~60%): ~' + loc(voluntaryEst) + ' customers — fix with better onboarding', { est: loc(voluntaryEst) }) + '\n' +
      '• ' + makeToken('calc_out.churn_rate.row.involuntary_churn', 'Involuntary (~40%): ~' + loc(involuntaryEst) + ' customers — fix with dunning emails', { est: loc(involuntaryEst) }) + '\n\n';
  }

  // ---- Tip (P168 decision code) ----
  // Bands reuse the existing Health thresholds (monthlyLogoChurn <= 0.02 / <= 0.05),
  // so the advice can never disagree with the health band shown above.
  const churnTipParams = {
    monthly: pct(monthlyLogoChurn),
    annual: pct(annualLogoChurn),
    lost: loc(customersLost),
    base: loc(customersStart),
  };
  let churnTip: { code: string; params: Record<string, string> };
  if (monthlyLogoChurn <= 0.02) {
    churnTip = { code: 'churn_rate_healthy', params: churnTipParams };
  } else if (monthlyLogoChurn <= 0.05) {
    churnTip = { code: 'churn_rate_average', params: churnTipParams };
  } else {
    churnTip = { code: 'churn_rate_high', params: churnTipParams };
  }
  mainResult += '💡 Tip: ' + JSON.stringify(churnTip);

  // 🩺 Churn Health (v3)
  const annualChurnPct = Math.round((1 - Math.pow(1 - monthlyLogoChurn, 12)) * 100);
  if (monthlyLogoChurn <= 0.02) {
    mainResult += '\n\n$calc_out.section.churn_rate_churn_health|🩺 Churn Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• ' +
      makeToken('calc_out.churn_rate.row.health_band_healthy', '🟢 HEALTHY: Monthly logo churn ' + (monthlyLogoChurn * 100).toFixed(1) + '% is excellent. Target: <2% monthly for SMB SaaS, <1% for enterprise.', { rate: (monthlyLogoChurn * 100).toFixed(1) });
  } else if (monthlyLogoChurn <= 0.05) {
    mainResult += '\n\n$calc_out.section.churn_rate_churn_health|🩺 Churn Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• ' +
      makeToken('calc_out.churn_rate.row.health_band_average', '🟡 AVERAGE: Monthly logo churn ' + (monthlyLogoChurn * 100).toFixed(1) + '% is typical for SaaS but has room. Annualized: ~' + annualChurnPct + '% loss/year.', { rate: (monthlyLogoChurn * 100).toFixed(1), annual: String(annualChurnPct) }) + '\n• ' +
      makeToken('calc_out.churn_rate.row.health_common_wins', 'Common wins: better onboarding, customer success calls at day 30/60/90.');
  } else {
    mainResult += '\n\n$calc_out.section.churn_rate_churn_health|🩺 Churn Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• ' +
      makeToken('calc_out.churn_rate.row.health_band_high', '🔴 HIGH: Monthly logo churn ' + (monthlyLogoChurn * 100).toFixed(1) + '% means ~' + annualChurnPct + '% customer loss/year. Address urgently.', { rate: (monthlyLogoChurn * 100).toFixed(1), annual: String(annualChurnPct) }) + '\n• ' +
      makeToken('calc_out.churn_rate.row.health_common_causes', 'Common causes: poor onboarding, weak value prop, pricing issues, support gaps.');
  }

  // 🔄 What-If Scenarios (v3)
  // ⚠️ ' | ' 是维度行分隔符 ⇒ **不得进 fallback**（token 的兜底段以第一个 | 收尾）
  //   ⇒ 整行拆成多个 token，中间用**原样**的分隔字面量连接 ⇒ 英文页逐字不变。
  mainResult += '\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  if (customersStart > 0 && avgRevenue > 0) {
    const halfChurnCust = Math.round(customersStart * (monthlyLogoChurn / 2));
    const halfChurnRev = halfChurnCust * avgRevenue;
    mainResult += '\n• ' + makeToken('calc_out.churn_rate.row.whatif_cut_churn_half', 'Cut churn in half:  Save ' + halfChurnCust + ' cust/mo', { cust: String(halfChurnCust) }) +
      ' | ' + makeToken('calc_out.churn_rate.row.whatif_cut_churn_half_revenue', '$' + Math.round(halfChurnRev).toLocaleString() + '/mo in retained revenue', { rev: '$' + Math.round(halfChurnRev).toLocaleString() });
    const doubledAcq = newCustomers * 2;
    mainResult += '\n• ' + makeToken('calc_out.churn_rate.row.whatif_double_acquisition', 'Double acquisition:  From ' + newCustomers + ' to ' + doubledAcq + ' new/mo (assumes linear growth)', { from: String(newCustomers), to: String(doubledAcq) });
    const savedCust = Math.round(customersStart * (monthlyLogoChurn / 2));
    mainResult += '\n• ' + makeToken('calc_out.churn_rate.row.whatif_combined', 'Combined:  Cut churn 50% + add 50% more:  net +' + savedCust + ' cust/mo', { cust: String(savedCust) });
    const onePctLoss = Math.round(customersStart * 0.01);
    const onePctRev = onePctLoss * avgRevenue;
    mainResult += '\n• ' + makeToken('calc_out.churn_rate.row.whatif_industry_best', 'Industry best (1% monthly):  Lose only ' + onePctLoss + ' cust/mo (vs current ' + Math.round(customersStart * monthlyLogoChurn) + ')', { lost: String(onePctLoss), current: String(Math.round(customersStart * monthlyLogoChurn)) }) +
      '  | ' + makeToken('calc_out.churn_rate.row.whatif_industry_best_revenue', '$' + Math.round(onePctRev).toLocaleString() + '/mo', { rev: '$' + Math.round(onePctRev).toLocaleString() });
  } else {
    mainResult += '\n• ' + makeToken('calc_out.churn_rate.row.whatif_cannot_model', '⚠️ Cannot model — enter start customer count and monthly revenue to see scenarios.');
  }

  // ⚖️ Break-Even (v3)
  if (customersStart > 0) {
    mainResult += '\n\n$calc_out.section.churn_rate_break_even|⚖️ Break-Even|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    const breakEvenNew = Math.round(customersStart * monthlyLogoChurn);
    if (newCustomers >= breakEvenNew) {
      mainResult += '\n• ' + makeToken('calc_out.churn_rate.row.break_even_healthy', '🟢 Break-even new customers/mo:  ' + breakEvenNew + '  — you\'re adding enough to grow (current: ' + newCustomers + ').', { be: String(breakEvenNew), actual: String(newCustomers) });
    } else if (newCustomers > 0) {
      mainResult += '\n• ' + makeToken('calc_out.churn_rate.row.break_even_short', '🟡 Break-even new customers/mo:  ' + breakEvenNew + '  — you\'re adding ' + newCustomers + ', short by ' + (breakEvenNew - newCustomers) + '. Customer base is shrinking.', { be: String(breakEvenNew), actual: String(newCustomers), gap: String(breakEvenNew - newCustomers) });
    } else {
      mainResult += '\n• ' + makeToken('calc_out.churn_rate.row.break_even_eroding', '🔴 Break-even new customers/mo:  ' + breakEvenNew + '  — you\'re adding 0. Base erodes by ' + breakEvenNew + ' customers/mo.', { be: String(breakEvenNew) });
    }
    if (monthlyLogoChurn > 0 && newCustomers > 0) {
      const newCustomerChurnPct = customersStart > 0 ? (newCustomers / customersStart) * 100 : 0;
      mainResult += '\n• ' + makeToken('calc_out.churn_rate.row.acquisition_rate_vs_churn', 'Your acquisition rate:  ' + newCustomerChurnPct.toFixed(1) + '%/mo  vs churn:  ' + (monthlyLogoChurn * 100).toFixed(1) + '%/mo', { acq: newCustomerChurnPct.toFixed(1), churn: (monthlyLogoChurn * 100).toFixed(1) });
    }
  }

  // 🎯 Churn Milestones (v3)
  if (customersStart > 0) {
    mainResult += '\n\n$calc_out.section.churn_rate_churn_milestones|🎯 Churn Milestones|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    const targetChurns = [0.01, 0.02, 0.03, 0.05];
    for (let i = 0; i < targetChurns.length; i++) {
      const annual = 1 - Math.pow(1 - targetChurns[i], 12);
      const monthlyLost = Math.round(customersStart * targetChurns[i]);
      const threeYearRetained = Math.pow(1 - targetChurns[i], 36) * 100;
      // ⭐ 每档**单独写出 code 字面量**（动态拼码 ⇒ 静态扫描器认不出 ⇒ locale 落库后仍红）
      let milestoneRow: string;
      if (i === 0) {
        milestoneRow = makeToken('calc_out.churn_rate.row.milestone_best_in_class', 'Best-in-class (1%) monthly:  lose ' + monthlyLost + ' cust/mo', { lost: String(monthlyLost) });
      } else if (i === 1) {
        milestoneRow = makeToken('calc_out.churn_rate.row.milestone_strong_2pct', 'Strong (2%) monthly:  lose ' + monthlyLost + ' cust/mo', { lost: String(monthlyLost) });
      } else if (i === 2) {
        milestoneRow = makeToken('calc_out.churn_rate.row.milestone_healthy_3pct', 'Healthy (3%) monthly:  lose ' + monthlyLost + ' cust/mo', { lost: String(monthlyLost) });
      } else {
        milestoneRow = makeToken('calc_out.churn_rate.row.milestone_warning_5pct', 'Warning (5%) monthly:  lose ' + monthlyLost + ' cust/mo', { lost: String(monthlyLost) });
      }
      mainResult += '\n• ' + milestoneRow +
        '  |  ' + makeToken('calc_out.churn_rate.row.milestone_annual_churn', 'annual ' + (annual * 100).toFixed(1) + '%', { annual: (annual * 100).toFixed(1) }) +
        '  |  ' + makeToken('calc_out.churn_rate.row.milestone_3yr_retention', '3-yr retention ' + threeYearRetained.toFixed(0) + '%', { ret: threeYearRetained.toFixed(0) });
    }
  }

  results.push(mainResult);

  // ---- 5 comparison scenarios ----
  const churnScenarios = [
    { label: 'Best Case (1% churn)', churnRate: 0.01 },
    { label: 'Good (2% churn)', churnRate: 0.02 },
    { label: 'Average (3% churn)', churnRate: 0.03 },
    { label: 'Warning (5% churn)', churnRate: 0.05 },
    { label: 'Critical (8% churn)', churnRate: 0.08 },
  ];

  for (let i = 0; i < churnScenarios.length; i++) {
    const lost = Math.round(customersStart * churnScenarios[i].churnRate);
    const end = customersStart - lost + newCustomers;
    const annual = 1 - Math.pow(1 - churnScenarios[i].churnRate, 12);
    const revLost = lost * avgRevenue;
    const scenarioGRR = ((1 - churnScenarios[i].churnRate) * 100).toFixed(1);
    // ⭐ 每档**单独写出 code 字面量**（动态拼码 ⇒ 静态扫描器认不出 ⇒ locale 落库后仍红）
    let scenarioLabel: string;
    if (i === 0) scenarioLabel = '$calc_out.label.scenario_best_case_1pct_churn|Best Case (1% churn)|';
    else if (i === 1) scenarioLabel = '$calc_out.label.scenario_good_2pct_churn|Good (2% churn)|';
    else if (i === 2) scenarioLabel = '$calc_out.label.scenario_average_3pct_churn|Average (3% churn)|';
    else if (i === 3) scenarioLabel = '$calc_out.label.scenario_warning_5pct_churn|Warning (5% churn)|';
    else scenarioLabel = '$calc_out.label.scenario_critical_8pct_churn|Critical (8% churn)|';
    let line =
      scenarioLabel + ': ' + makeToken('calc_out.churn_rate.row.scenario_lose_cust', 'Lose ' + lost + ' cust/mo', { lost: String(lost) }) +
      ' | ' + makeToken('calc_out.churn_rate.row.scenario_annual_churn', 'Annual churn ' + pct(annual), { annual: pct(annual) }) +
      ' | ' + makeToken('calc_out.churn_rate.row.scenario_grr', 'GRR ' + scenarioGRR + '%', { grr: scenarioGRR }) +
      ' | ' + makeToken('calc_out.churn_rate.row.scenario_end_customers', 'End with ' + end + ' customers', { end: String(end) });
    if (avgRevenue > 0) {
      line += ' | ' + makeToken('calc_out.churn_rate.row.scenario_revenue_lost', 'Lose ' + fmt(revLost) + '/mo', { rev: fmt(revLost) });
    }
    results.push(line);
  }

  return results;
}

const customFn =
  // P168 B3-9：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 服务端与客户端输出逐字节相同，不可能漂；new Function 的签名不变（仍是 3 个参数）。
  //   ⚠️ 客户端原先少 4 段（Churn Health / What-If / Break-Even / Churn Milestones）
  //      ⇒ 本次补齐（与服务端逐字相同、同样令牌化）—— 否则同一页静态卡片与动态卡片不同。
  //   ⚠️ 页面只渲染 results[0] ⇒ 返回**单元素数组**（整份输出拼成一段）。
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let y=function(_){return Number.isNaN(_)?0:Math.max(0,_)},L=function(_){const o=y(parseInt(_.customersStart)||0),h=y(parseInt(_.customersLost)||0),a=y(parseInt(_.newCustomers)||0),v=y(parseFloat(_.avgRevenuePerCustomer)||0),G=y(parseFloat(_.expansionRevenue)||0),F=[],c=o>0?h/o:0,E=1-Math.pow(1-c,12),N=o-h+a,$=N-o,I=o>0?$/o*100:0,g=o*v,b=h*v,P=g>0?b/g:0,j=g>0?(b-G)/g:0,d=g>0?(g-b)/g*100:0,w=g>0?(g+G-b)/g*100:0,m=t=>(t*100).toFixed(1)+"%",p=t=>"$"+Math.round(t).toLocaleString(),s=t=>t.toLocaleString();let e=\`$calc_out.section.churn_rate_logo_revenue_churn_analysis|📉 Logo & Revenue Churn Analysis|

• $calc_out.label.customers_at_start|Customers at Start|: \`+s(o)+\`
• $calc_out.label.new_customers_added|New Customers Added|: \`+s(a)+\`
• $calc_out.label.customers_lost|Customers Lost|: \`+s(h)+\`
• $calc_out.label.customers_at_end|Customers at End|: \`+s(N)+\`
• $calc_out.label.net_growth|Net Growth|: \`+($>=0?"+":"")+s($)+" ("+I.toFixed(1)+\`%)

━━━━━━━━━━━━━━━━━━━━

\`;if(e+=\`$calc_out.section.churn_rate_logo_churn|👥 Logo Churn (Customer Headcount)|
• $calc_out.label.monthly_logo_churn|Monthly Logo Churn|: \`+m(c)+\`
• $calc_out.label.annual_logo_churn|Annual Logo Churn|: \`+m(E)+\`

\`,v>0){e+=\`$calc_out.section.churn_rate_revenue_churn|💰 Revenue Churn|
• $calc_out.label.gross_revenue_churn|Gross Revenue Churn (before expansion)|: \`+m(P)+\`
• $calc_out.label.net_revenue_churn|Net Revenue Churn (after expansion)|: \`+m(j)+\`
• $calc_out.label.monthly_revenue_lost_to_churn|Monthly Revenue Lost to Churn|: \`+p(b)+\`
• $calc_out.label.annual_revenue_lost_to_churn|Annual Revenue Lost to Churn|: \`+p(b*12)+\`

\`;let t="";w>=120?t="🟢 Best-in-class":w>=100?t="🟡 Positive":t="🔴 Shrinking";let r="";d>=90?r="🟢 Healthy":d>=80?r="🟡 Watch":r="🔴 At risk";let l;d>=90?l=n("calc_out.churn_rate.row.grr_healthy","GRR = "+d.toFixed(1)+"% — "+r,{grr:d.toFixed(1)}):d>=80?l=n("calc_out.churn_rate.row.grr_watch","GRR = "+d.toFixed(1)+"% — "+r,{grr:d.toFixed(1)}):l=n("calc_out.churn_rate.row.grr_at_risk","GRR = "+d.toFixed(1)+"% — "+r,{grr:d.toFixed(1)});let u;w>=120?u=n("calc_out.churn_rate.row.nrr_best_in_class","NRR = "+w.toFixed(1)+"% — "+t,{nrr:w.toFixed(1)}):w>=100?u=n("calc_out.churn_rate.row.nrr_positive","NRR = "+w.toFixed(1)+"% — "+t,{nrr:w.toFixed(1)}):u=n("calc_out.churn_rate.row.nrr_shrinking","NRR = "+w.toFixed(1)+"% — "+t,{nrr:w.toFixed(1)}),e+=\`$calc_out.section.churn_rate_grr_nrr|📈 GRR / NRR|
• \`+l+\`
• \`+u+\`

\`}if(e+=\`━━━━━━━━━━━━━━━━━━━━

\`,c<=.02?e+=n("calc_out.churn_rate.row.health_healthy","🟢 HEALTHY: Monthly logo churn under 2% is excellent. Keep doing what you are doing.")+\`
\`:c<=.05?e+=n("calc_out.churn_rate.row.health_average","🟡 AVERAGE: 2-5% monthly logo churn is typical for SaaS. There is room for improvement.")+\`
\`:e+=n("calc_out.churn_rate.row.health_high","🔴 HIGH: Over 5% monthly logo churn means you are losing ~46%+ of customers annually. Address this urgently.")+\`
\`,e+=\`
━━━━━━━━━━━━━━━━━━━━

\`,h>0){const t=Math.round(h*.6),r=Math.round(h*.4);e+=n("calc_out.churn_rate.row.churn_attribution","🔍 Churn Attribution ("+s(h)+" customers lost)",{lost:s(h)})+\`
• \`+n("calc_out.churn_rate.row.voluntary_churn","Voluntary (~60%): ~"+s(t)+" customers — fix with better onboarding",{est:s(t)})+\`
• \`+n("calc_out.churn_rate.row.involuntary_churn","Involuntary (~40%): ~"+s(r)+" customers — fix with dunning emails",{est:s(r)})+\`

\`}const M={monthly:m(c),annual:m(E),lost:s(h),base:s(o)};let C;c<=.02?C={code:"churn_rate_healthy",params:M}:c<=.05?C={code:"churn_rate_average",params:M}:C={code:"churn_rate_high",params:M},e+="💡 Tip: "+JSON.stringify(C);const S=Math.round((1-Math.pow(1-c,12))*100);if(c<=.02?e+=\`

$calc_out.section.churn_rate_churn_health|🩺 Churn Health:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+n("calc_out.churn_rate.row.health_band_healthy","🟢 HEALTHY: Monthly logo churn "+(c*100).toFixed(1)+"% is excellent. Target: <2% monthly for SMB SaaS, <1% for enterprise.",{rate:(c*100).toFixed(1)}):c<=.05?e+=\`

$calc_out.section.churn_rate_churn_health|🩺 Churn Health:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+n("calc_out.churn_rate.row.health_band_average","🟡 AVERAGE: Monthly logo churn "+(c*100).toFixed(1)+"% is typical for SaaS but has room. Annualized: ~"+S+"% loss/year.",{rate:(c*100).toFixed(1),annual:String(S)})+\`
• \`+n("calc_out.churn_rate.row.health_common_wins","Common wins: better onboarding, customer success calls at day 30/60/90."):e+=\`

$calc_out.section.churn_rate_churn_health|🩺 Churn Health:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+n("calc_out.churn_rate.row.health_band_high","🔴 HIGH: Monthly logo churn "+(c*100).toFixed(1)+"% means ~"+S+"% customer loss/year. Address urgently.",{rate:(c*100).toFixed(1),annual:String(S)})+\`
• \`+n("calc_out.churn_rate.row.health_common_causes","Common causes: poor onboarding, weak value prop, pricing issues, support gaps."),e+=\`

$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\`,o>0&&v>0){const t=Math.round(o*(c/2)),r=t*v;e+=\`
• \`+n("calc_out.churn_rate.row.whatif_cut_churn_half","Cut churn in half:  Save "+t+" cust/mo",{cust:String(t)})+" | "+n("calc_out.churn_rate.row.whatif_cut_churn_half_revenue","$"+Math.round(r).toLocaleString()+"/mo in retained revenue",{rev:"$"+Math.round(r).toLocaleString()});const l=a*2;e+=\`
• \`+n("calc_out.churn_rate.row.whatif_double_acquisition","Double acquisition:  From "+a+" to "+l+" new/mo (assumes linear growth)",{from:String(a),to:String(l)});const u=Math.round(o*(c/2));e+=\`
• \`+n("calc_out.churn_rate.row.whatif_combined","Combined:  Cut churn 50% + add 50% more:  net +"+u+" cust/mo",{cust:String(u)});const f=Math.round(o*.01),i=f*v;e+=\`
• \`+n("calc_out.churn_rate.row.whatif_industry_best","Industry best (1% monthly):  Lose only "+f+" cust/mo (vs current "+Math.round(o*c)+")",{lost:String(f),current:String(Math.round(o*c))})+"  | "+n("calc_out.churn_rate.row.whatif_industry_best_revenue","$"+Math.round(i).toLocaleString()+"/mo",{rev:"$"+Math.round(i).toLocaleString()})}else e+=\`
• \`+n("calc_out.churn_rate.row.whatif_cannot_model","⚠️ Cannot model — enter start customer count and monthly revenue to see scenarios.");if(o>0){e+=\`

$calc_out.section.churn_rate_break_even|⚖️ Break-Even|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\`;const t=Math.round(o*c);if(a>=t?e+=\`
• \`+n("calc_out.churn_rate.row.break_even_healthy","🟢 Break-even new customers/mo:  "+t+"  — you're adding enough to grow (current: "+a+").",{be:String(t),actual:String(a)}):a>0?e+=\`
• \`+n("calc_out.churn_rate.row.break_even_short","🟡 Break-even new customers/mo:  "+t+"  — you're adding "+a+", short by "+(t-a)+". Customer base is shrinking.",{be:String(t),actual:String(a),gap:String(t-a)}):e+=\`
• \`+n("calc_out.churn_rate.row.break_even_eroding","🔴 Break-even new customers/mo:  "+t+"  — you're adding 0. Base erodes by "+t+" customers/mo.",{be:String(t)}),c>0&&a>0){const r=o>0?a/o*100:0;e+=\`
• \`+n("calc_out.churn_rate.row.acquisition_rate_vs_churn","Your acquisition rate:  "+r.toFixed(1)+"%/mo  vs churn:  "+(c*100).toFixed(1)+"%/mo",{acq:r.toFixed(1),churn:(c*100).toFixed(1)})}}if(o>0){e+=\`

$calc_out.section.churn_rate_churn_milestones|🎯 Churn Milestones|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\`;const t=[.01,.02,.03,.05];for(let r=0;r<t.length;r++){const l=1-Math.pow(1-t[r],12),u=Math.round(o*t[r]),f=Math.pow(1-t[r],36)*100;let i;r===0?i=n("calc_out.churn_rate.row.milestone_best_in_class","Best-in-class (1%) monthly:  lose "+u+" cust/mo",{lost:String(u)}):r===1?i=n("calc_out.churn_rate.row.milestone_strong_2pct","Strong (2%) monthly:  lose "+u+" cust/mo",{lost:String(u)}):r===2?i=n("calc_out.churn_rate.row.milestone_healthy_3pct","Healthy (3%) monthly:  lose "+u+" cust/mo",{lost:String(u)}):i=n("calc_out.churn_rate.row.milestone_warning_5pct","Warning (5%) monthly:  lose "+u+" cust/mo",{lost:String(u)}),e+=\`
• \`+i+"  |  "+n("calc_out.churn_rate.row.milestone_annual_churn","annual "+(l*100).toFixed(1)+"%",{annual:(l*100).toFixed(1)})+"  |  "+n("calc_out.churn_rate.row.milestone_3yr_retention","3-yr retention "+f.toFixed(0)+"%",{ret:f.toFixed(0)})}}F.push(e);const x=[{label:"Best Case (1% churn)",churnRate:.01},{label:"Good (2% churn)",churnRate:.02},{label:"Average (3% churn)",churnRate:.03},{label:"Warning (5% churn)",churnRate:.05},{label:"Critical (8% churn)",churnRate:.08}];for(let t=0;t<x.length;t++){const r=Math.round(o*x[t].churnRate),l=o-r+a,u=1-Math.pow(1-x[t].churnRate,12),f=r*v,i=((1-x[t].churnRate)*100).toFixed(1);let R;t===0?R="$calc_out.label.scenario_best_case_1pct_churn|Best Case (1% churn)|":t===1?R="$calc_out.label.scenario_good_2pct_churn|Good (2% churn)|":t===2?R="$calc_out.label.scenario_average_3pct_churn|Average (3% churn)|":t===3?R="$calc_out.label.scenario_warning_5pct_churn|Warning (5% churn)|":R="$calc_out.label.scenario_critical_8pct_churn|Critical (8% churn)|";let H=R+": "+n("calc_out.churn_rate.row.scenario_lose_cust","Lose "+r+" cust/mo",{lost:String(r)})+" | "+n("calc_out.churn_rate.row.scenario_annual_churn","Annual churn "+m(u),{annual:m(u)})+" | "+n("calc_out.churn_rate.row.scenario_grr","GRR "+i+"%",{grr:i})+" | "+n("calc_out.churn_rate.row.scenario_end_customers","End with "+l+" customers",{end:String(l)});v>0&&(H+=" | "+n("calc_out.churn_rate.row.scenario_revenue_lost","Lose "+p(f)+"/mo",{rev:p(f)})),F.push(H)}return F},A=function(_,o,h){var a=B(_);return Array.isArray(a)?a.join(\`
\`):String(a)};var O=y,W=L,Y=A,n=tk,q='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',n=new Function("return "+q)(),B=function(_){return L(_)};return[A(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

const engine: ToolEngine = {
  slug: 'solopreneur-churn-rate-calculator',
  title: 'Churn Rate Calculator',
  description: 'Calculate logo churn, revenue churn, GRR/NRR retention metrics, and churn attribution. Compare churn scenarios and see revenue impact.',
  inputs: [
    { name: 'customersStart', label: 'Customers at Start of Month', placeholder: 'e.g. 500', type: 'number' },
    { name: 'customersLost', label: 'Customers Lost This Month', placeholder: 'e.g. 15', type: 'number' },
    { name: 'newCustomers', label: 'New Customers This Month', placeholder: 'e.g. 25', type: 'number' },
    { name: 'avgRevenuePerCustomer', label: 'Avg Revenue per Customer ($)', placeholder: 'e.g. 50', type: 'number' },
    { name: 'expansionRevenue', label: 'Expansion Revenue ($)', placeholder: 'e.g. 800', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs: Record<string, string>): string[] {
    return calculateChurn(inputs);
  },
  staticExamples: [
    '$calc_out.section.churn_rate_logo_revenue_churn_analysis|📉 Logo & Revenue Churn Analysis|\n\n• $calc_out.label.customers_at_start|Customers at Start|: 1,000\n• $calc_out.label.new_customers_added|New Customers Added|: 25\n• $calc_out.label.customers_lost|Customers Lost|: 15\n• $calc_out.label.customers_at_end|Customers at End|: 1,010\n• $calc_out.label.net_growth|Net Growth|: +10 (1.0%)\n\n━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.churn_rate_logo_churn|👥 Logo Churn (Customer Headcount)|\n• $calc_out.label.monthly_logo_churn|Monthly Logo Churn|: 1.5%\n• $calc_out.label.annual_logo_churn|Annual Logo Churn|: 16.6%\n\n$calc_out.section.churn_rate_revenue_churn|💰 Revenue Churn|\n• $calc_out.label.gross_revenue_churn|Gross Revenue Churn (before expansion)|: 1.5%\n• $calc_out.label.net_revenue_churn|Net Revenue Churn (after expansion)|: -0.1%\n• $calc_out.label.monthly_revenue_lost_to_churn|Monthly Revenue Lost to Churn|: $750\n• $calc_out.label.annual_revenue_lost_to_churn|Annual Revenue Lost to Churn|: $9,000\n\n$calc_out.section.churn_rate_grr_nrr|📈 GRR / NRR|\n• $calc_out.churn_rate.row.grr_healthy{"grr":"98.5"}|GRR = 98.5% — 🟢 Healthy|\n• $calc_out.churn_rate.row.nrr_positive{"nrr":"100.1"}|NRR = 100.1% — 🟡 Positive|\n\n━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.churn_rate.row.health_healthy|🟢 HEALTHY: Monthly logo churn under 2% is excellent. Keep doing what you are doing.|\n\n━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.churn_rate.row.churn_attribution{"lost":"15"}|🔍 Churn Attribution (15 customers lost)|\n• $calc_out.churn_rate.row.voluntary_churn{"est":"9"}|Voluntary (~60%): ~9 customers — fix with better onboarding|\n• $calc_out.churn_rate.row.involuntary_churn{"est":"6"}|Involuntary (~40%): ~6 customers — fix with dunning emails|\n\n💡 Tip: {"code":"churn_rate_healthy","params":{"monthly":"1.5%","annual":"16.6%","lost":"15","base":"1,000"}}\n\n$calc_out.section.churn_rate_churn_health|🩺 Churn Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.churn_rate.row.health_band_healthy{"rate":"1.5"}|🟢 HEALTHY: Monthly logo churn 1.5% is excellent. Target: <2% monthly for SMB SaaS, <1% for enterprise.|\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.churn_rate.row.whatif_cut_churn_half{"cust":"8"}|Cut churn in half:  Save 8 cust/mo| | $calc_out.churn_rate.row.whatif_cut_churn_half_revenue{"rev":"$400"}|$400/mo in retained revenue|\n• $calc_out.churn_rate.row.whatif_double_acquisition{"from":"25","to":"50"}|Double acquisition:  From 25 to 50 new/mo (assumes linear growth)|\n• $calc_out.churn_rate.row.whatif_combined{"cust":"8"}|Combined:  Cut churn 50% + add 50% more:  net +8 cust/mo|\n• $calc_out.churn_rate.row.whatif_industry_best{"lost":"10","current":"15"}|Industry best (1% monthly):  Lose only 10 cust/mo (vs current 15)|  | $calc_out.churn_rate.row.whatif_industry_best_revenue{"rev":"$500"}|$500/mo|\n\n$calc_out.section.churn_rate_break_even|⚖️ Break-Even|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.churn_rate.row.break_even_healthy{"be":"15","actual":"25"}|🟢 Break-even new customers/mo:  15  — you\'re adding enough to grow (current: 25).|\n• $calc_out.churn_rate.row.acquisition_rate_vs_churn{"acq":"2.5","churn":"1.5"}|Your acquisition rate:  2.5%/mo  vs churn:  1.5%/mo|\n\n$calc_out.section.churn_rate_churn_milestones|🎯 Churn Milestones|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.churn_rate.row.milestone_best_in_class{"lost":"10"}|Best-in-class (1%) monthly:  lose 10 cust/mo|  |  $calc_out.churn_rate.row.milestone_annual_churn{"annual":"11.4"}|annual 11.4%|  |  $calc_out.churn_rate.row.milestone_3yr_retention{"ret":"70"}|3-yr retention 70%|\n• $calc_out.churn_rate.row.milestone_strong_2pct{"lost":"20"}|Strong (2%) monthly:  lose 20 cust/mo|  |  $calc_out.churn_rate.row.milestone_annual_churn{"annual":"21.5"}|annual 21.5%|  |  $calc_out.churn_rate.row.milestone_3yr_retention{"ret":"48"}|3-yr retention 48%|\n• $calc_out.churn_rate.row.milestone_healthy_3pct{"lost":"30"}|Healthy (3%) monthly:  lose 30 cust/mo|  |  $calc_out.churn_rate.row.milestone_annual_churn{"annual":"30.6"}|annual 30.6%|  |  $calc_out.churn_rate.row.milestone_3yr_retention{"ret":"33"}|3-yr retention 33%|\n• $calc_out.churn_rate.row.milestone_warning_5pct{"lost":"50"}|Warning (5%) monthly:  lose 50 cust/mo|  |  $calc_out.churn_rate.row.milestone_annual_churn{"annual":"46.0"}|annual 46.0%|  |  $calc_out.churn_rate.row.milestone_3yr_retention{"ret":"16"}|3-yr retention 16%|\n$calc_out.label.scenario_best_case_1pct_churn|Best Case (1% churn)|: $calc_out.churn_rate.row.scenario_lose_cust{"lost":"10"}|Lose 10 cust/mo| | $calc_out.churn_rate.row.scenario_annual_churn{"annual":"11.4%"}|Annual churn 11.4%| | $calc_out.churn_rate.row.scenario_grr{"grr":"99.0"}|GRR 99.0%| | $calc_out.churn_rate.row.scenario_end_customers{"end":"1015"}|End with 1015 customers| | $calc_out.churn_rate.row.scenario_revenue_lost{"rev":"$500"}|Lose $500/mo|\n$calc_out.label.scenario_good_2pct_churn|Good (2% churn)|: $calc_out.churn_rate.row.scenario_lose_cust{"lost":"20"}|Lose 20 cust/mo| | $calc_out.churn_rate.row.scenario_annual_churn{"annual":"21.5%"}|Annual churn 21.5%| | $calc_out.churn_rate.row.scenario_grr{"grr":"98.0"}|GRR 98.0%| | $calc_out.churn_rate.row.scenario_end_customers{"end":"1005"}|End with 1005 customers| | $calc_out.churn_rate.row.scenario_revenue_lost{"rev":"$1,000"}|Lose $1,000/mo|\n$calc_out.label.scenario_average_3pct_churn|Average (3% churn)|: $calc_out.churn_rate.row.scenario_lose_cust{"lost":"30"}|Lose 30 cust/mo| | $calc_out.churn_rate.row.scenario_annual_churn{"annual":"30.6%"}|Annual churn 30.6%| | $calc_out.churn_rate.row.scenario_grr{"grr":"97.0"}|GRR 97.0%| | $calc_out.churn_rate.row.scenario_end_customers{"end":"995"}|End with 995 customers| | $calc_out.churn_rate.row.scenario_revenue_lost{"rev":"$1,500"}|Lose $1,500/mo|\n$calc_out.label.scenario_warning_5pct_churn|Warning (5% churn)|: $calc_out.churn_rate.row.scenario_lose_cust{"lost":"50"}|Lose 50 cust/mo| | $calc_out.churn_rate.row.scenario_annual_churn{"annual":"46.0%"}|Annual churn 46.0%| | $calc_out.churn_rate.row.scenario_grr{"grr":"95.0"}|GRR 95.0%| | $calc_out.churn_rate.row.scenario_end_customers{"end":"975"}|End with 975 customers| | $calc_out.churn_rate.row.scenario_revenue_lost{"rev":"$2,500"}|Lose $2,500/mo|\n$calc_out.label.scenario_critical_8pct_churn|Critical (8% churn)|: $calc_out.churn_rate.row.scenario_lose_cust{"lost":"80"}|Lose 80 cust/mo| | $calc_out.churn_rate.row.scenario_annual_churn{"annual":"63.2%"}|Annual churn 63.2%| | $calc_out.churn_rate.row.scenario_grr{"grr":"92.0"}|GRR 92.0%| | $calc_out.churn_rate.row.scenario_end_customers{"end":"945"}|End with 945 customers| | $calc_out.churn_rate.row.scenario_revenue_lost{"rev":"$4,000"}|Lose $4,000/mo|',
    'Best Case (1% churn): Lose 5 cust/mo | Annual churn 11.4% | GRR 99.0% | End with 520 customers | Lose $250/mo',
    'Good (2% churn): Lose 10 cust/mo | Annual churn 21.5% | GRR 98.0% | End with 515 customers | Lose $500/mo',
    'Average (3% churn): Lose 15 cust/mo | Annual churn 30.6% | GRR 97.0% | End with 510 customers | Lose $750/mo',
    'Warning (5% churn): Lose 25 cust/mo | Annual churn 46.0% | GRR 95.0% | End with 500 customers | Lose $1,250/mo',
  ],
  faq: [
    { q: 'What is a good monthly churn rate for SaaS?', a: 'For SMB SaaS, 3-5% monthly logo churn is typical. For enterprise SaaS, aim for under 2% monthly. The best companies like Salesforce have monthly churn under 1%. A 3% monthly churn compounds to ~31% annual — meaning you lose a third of your customers every year if you do not replace them. Focus on reducing churn before scaling acquisition.' },
    { q: 'What is the difference between logo churn and revenue churn?', a: 'Logo churn measures the percentage of customers (headcount) who leave. Revenue churn measures the percentage of revenue lost. They differ when customers pay different amounts — if your highest-paying customers churn, revenue churn exceeds logo churn. Gross Revenue Churn is churned revenue before accounting for expansion; Net Revenue Churn subtracts expansion revenue (upsells, add-ons) that offset losses.' },
    { q: 'What are GRR and NRR, and why do they matter?', a: 'GRR (Gross Revenue Retention) measures how much revenue you retain from existing customers, ignoring expansion. NRR (Net Revenue Retention) includes expansion revenue — NRR above 100% means existing customers are growing despite churn. Best-in-class SaaS companies have NRR above 120%. Investors value NRR highly because it proves product-market fit without relying on new acquisition.' },
    { q: 'How should I think about voluntary vs involuntary churn?', a: 'Voluntary churn (~60% of losses) happens when customers actively cancel — they are not getting enough value. Fix it with better onboarding, proactive customer success, and feature adoption. Involuntary churn (~40%) is passive — failed credit card payments or expired cards. Fix it with dunning emails, retry logic, and payment method updates before expiration.' },
    { q: 'How do I reduce churn effectively?', a: 'Start with onboarding: most churn happens in the first 60 days. Add a guided setup flow, track time-to-value, and trigger outreach when users stall. Then implement proactive customer success — monitor usage signals and reach out before customers go silent. Finally, offer annual contracts with a discount — they lock in customers and eliminate monthly involuntary churn from payment failures.' },
    { q: 'Why does a 3% monthly churn become 31% annual?', a: 'Churn compounds: each month you lose 3% of the remaining customers, not 3% of the original total. The formula is 1 - (1 - 0.03)^12 = 30.6%. This compounding effect is why small monthly improvements have outsized annual impact. Reducing from 5% to 3% monthly takes annual churn from 46% to 31% — a 15-point swing from a 2-point monthly change.' },
    { q: 'When should I track logo churn vs revenue churn?', a: 'Track both from day one. Logo churn tells you if your product is sticky; revenue churn tells you if your business is healthy. A startup with 5% logo churn but 120% NRR (from expansion) may still be growing revenue. Conversely, 2% logo churn with 95% NRR means you are slowly shrinking despite loyal customers. Use both metrics together for a complete picture.' },
    { q: "What is a good churn rate for SaaS?", a: "Benchmarks: 1) Annual logo churn: <10% is excellent, 10-20% healthy, 2) Monthly: 0.5-1% is good, 1-2% average. By segment: SMB 3-5%/month, mid-market 1-2%, enterprise 0.5-1%. By stage: pre-PMF 10%+, growth 1-2%, scale <1%. For B2B SaaS: 1-2% monthly is healthy. <1% excellent. Top performers: 0.5-0.7% monthly. Most aim: 1-1.5%." },
    { q: "What is the difference between churn and retention?", a: "Churn: % of customers/revenue lost. Retention: % of customers/revenue kept. Churn = 1 - retention. Always: churn + retention = 100%. Track both. Retention: positive framing. Churn: clear loss. Investors: focus on both. Most: retention 90%+ = healthy. <80% = critical. Track: monthly cohort, by segment. Both metrics tell the same story." },
    { q: "How do I calculate gross MRR churn?", a: "Gross MRR churn = (churned MRR + contraction MRR) / starting MRR. Excludes expansion. Components: 1) Churn (full customer loss), 2) Contraction (downgrade). Example: $100K starting MRR, $5K lost to churn, $2K lost to contraction: gross churn 7%. Most: 3-7% monthly gross. Top: 2-3%. Track: monthly, by cohort. Net churn: same + expansion. Gross is harder to game." },
    { q: "What is net negative churn?", a: "Net negative churn: expansion > churn + contraction. NRR > 100%. Rare but valuable. Examples: Snowflake 168%, Datadog 130%. Means: revenue grows even without new customers. Drivers: 1) Usage-based pricing, 2) Strong onboarding, 3) Tier upgrades, 4) Cross-sell. Most: 100-110% NRR. Top: 110-120%. World-class: 120%+. Net negative: holy grail. Few achieve." },
    { q: "How do I reduce churn?", a: "1) Better onboarding (cut time-to-value), 2) Customer success for top accounts, 3) Health scoring, 4) Reduce support friction, 5) Better qualification, 6) Product stickiness. 1-2 pp reduction per year. Best option: combine 1+2+3. CSM: 1 FTE per $1-2M ARR. Most teams 30-50% reduction in voluntary churn with proactive CS. Top: 70%+ reduction." },
    { q: "What is the relationship between churn and LTV?", a: "LTV = ARPU × gross_margin / churn. For $100 ARPU, 80% margin, 5% monthly churn: LTV = $80/0.05 = $1,600. Lower churn = higher LTV. 1% monthly: $8,000 LTV. 0.5%: $16,000. Most: 2-3 pp churn reduction = 30-50% LTV lift. Aim: 1% monthly or less. LTV:CAC = 3:1+ is healthy. Strong retention = strong LTV. Track cohort, not aggregate." },
    { q: "Should I use annual or monthly churn?", a: "Both. Monthly: tactical, faster signal. Annual: strategic, smoother. For 1% monthly: 12% annual (compounding). Most SaaS: 5-10% annual is the target. Top: <5%. For LTV calculations: use monthly (more granular). For board updates: annual (clearer). For fundraising: trailing 12 months (TTM). Tools: Stripe, ChartMogul, Baremetrics. Most: monthly tracking, quarterly analysis." },
    { q: "What is the difference between voluntary and involuntary churn?", a: "Voluntary: customer chose to leave. Involuntary: payment failure. Voluntary: 70-90% of churn. Involuntary: 10-30%. Address: 1) Voluntary: better product, support, CS, 2) Involuntary: smart dunning, card updater, retry logic, email reminders. dunning software: 5-15% revenue recovery. Most: optimize both. Involuntary is easier to fix (3-6 month project, 20-40% recovery)." },
  ],
  howToUse: [
    'Enter your total customer count at the beginning of the month.',
    'Enter how many customers cancelled or failed to renew this month.',
    'Enter how many new customers you acquired this month.',
    'Enter your average revenue per customer to unlock revenue churn and GRR/NRR metrics.',
    'Enter expansion revenue (upsells, add-ons, upgrades) from existing customers to see your NRR.',
    'Review the Logo Churn section for your customer headcount churn rate (monthly and annual).',
    'Check the Revenue Churn section for Gross (before expansion) and Net (after expansion) revenue churn.',
    'Evaluate your GRR and NRR scores: NRR above 120% is best-in-class, GRR above 90% is healthy.',
    'Read the Churn Attribution breakdown to identify whether voluntary or involuntary churn is your biggest opportunity, then scroll to the scenario comparisons to see how improving churn rates changes your trajectory.',
  ],
  engineKey: true,
  // P140f-p3-T5: 完整 6 字段 playbook (per P140f §4.3 + ADR-0004)
  // Goal 含"决策"+"该不该"+"救"三关键词 → 通过 T1 zod refine 校验 (决策/decision/该不该/是否)
  // 内容镜像 Phase 1 churn-rate 🧭 Decision Recommendation 4 子段 + ADR-0004 决策逻辑
  playbook: {
    goal: '用户该不该按当前流失率干预留存，还是先接受这个水平把现金花在增长上',
    input: 'customersStart (≥0) + newCustomers (≥0) + customersLost (≥0) + monthlyRevenue (≥0)',
    output: '月流失 % + 年化 % + 健康带 🟢<2% / 🟡2-3% / 🟠3-5% / 🔴>5% + Logo vs Revenue Churn 双轨',
    constraint: 'customersStart = 0 时无法算; cohort vs aggregate 影响真值; 主动 vs 被动流失 (payment fail) 区别',
    tool: '页面的「🧭 算完之后」决策区块（决策支持已由区块独占）',
    memory: 'Recurly 20-40% 被动流失 baseline + ChartMogul cohort benchmark + Stripe SaaS 流失分布',
  },
};

registerEngine(engine);
