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

function calculateCAC(inputs: Record<string, string>): string[] {
  const marketingSpend = clampNonNegative(parseFloat(inputs.marketingSpend) || 0);
  const salesSpend = clampNonNegative(parseFloat(inputs.salesSpend) || 0);
  const newCustomers = clampNonNegative(parseInt(inputs.newCustomers) || 0);
  const avgRevenuePerCustomer = clampNonNegative(parseFloat(inputs.avgRevenuePerCustomer) || 0);
  const grossMargin = clampNonNegative(parseFloat(inputs.grossMargin) || 80);
  const results: string[] = [];

  const totalSpend = marketingSpend + salesSpend;
  const cac = newCustomers > 0 ? totalSpend / newCustomers : 0;
  const grossProfitPerCustomer = avgRevenuePerCustomer * (grossMargin / 100);
  const paybackMonths = grossProfitPerCustomer > 0 ? cac / grossProfitPerCustomer : 0;
  const marketingPct = totalSpend > 0 ? (marketingSpend / totalSpend) * 100 : 0;
  const salesPct = totalSpend > 0 ? (salesSpend / totalSpend) * 100 : 0;

  const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
  const pct = (n: number) => n.toFixed(1) + '%';
  const loc = (n: number) => n.toLocaleString();

  let mainResult =
    '$calc_out.section.cac_calculator|🎯 Customer Acquisition Cost (CAC)|\n\n' +
    '• ' + makeToken('calc_out.cac.row.marketing_spend', 'Marketing Spend: ' + fmt(marketingSpend) + ' (' + pct(marketingPct) + ' of total)', { amount: fmt(marketingSpend), pct: pct(marketingPct) }) + '\n' +
    '• ' + makeToken('calc_out.cac.row.sales_spend', 'Sales Spend: ' + fmt(salesSpend) + ' (' + pct(salesPct) + ' of total)', { amount: fmt(salesSpend), pct: pct(salesPct) }) + '\n' +
    '• $calc_out.label.total_acquisition_spend|Total Acquisition Spend|: ' + fmt(totalSpend) + '\n' +
    '• $calc_out.label.new_customers_acquired|New Customers Acquired|: ' + loc(newCustomers) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.cac_key_results|📊 Key Results:|\n\n' +
    '• ' + makeToken('calc_out.cac.row.customer_acquisition_cost', 'Customer Acquisition Cost (CAC): ' + fmt(cac) + ' per customer', { cac: fmt(cac) }) + '\n';

  if (avgRevenuePerCustomer > 0) {
    mainResult += '• $calc_out.label.avg_revenue_per_customer_mo|Avg Revenue per Customer|: ' + fmt(avgRevenuePerCustomer) + '/mo\n';
    mainResult += '• $calc_out.label.gross_profit_per_customer|Gross Profit per Customer|: ' + fmt(grossProfitPerCustomer) + '/mo\n';
    mainResult += '• ' + makeToken('calc_out.cac.row.cac_payback_period', 'CAC Payback Period: ' + paybackMonths.toFixed(1) + ' months', { months: paybackMonths.toFixed(1) }) + '\n';
  }

  mainResult += '\n';

  if (avgRevenuePerCustomer > 0) {
    const firstYearValue = avgRevenuePerCustomer * 12 * (grossMargin / 100);
    const ltvEstimate = paybackMonths > 0 ? cac * 3 : 0; // assume 3:1 LTV:CAC target
    mainResult += '• $calc_out.label.est_first_year_customer_value|Est. First-Year Customer Value|: ' + fmt(firstYearValue) + '\n';
    if (ltvEstimate > 0) {
      mainResult += '• $calc_out.label.target_ltv_3to1|Target LTV (at 3:1 ratio)|: ' + fmt(ltvEstimate) + '\n';
    }
    mainResult += '\n';

    if (paybackMonths <= 6) {
      mainResult += makeToken('calc_out.cac.row.payback_strong', '🟢 STRONG: CAC payback in ' + paybackMonths.toFixed(1) + ' months is excellent. You recover acquisition costs quickly and can reinvest faster.', { months: paybackMonths.toFixed(1) }) + '\n';
    } else if (paybackMonths <= 12) {
      mainResult += makeToken('calc_out.cac.row.payback_good', '🟡 GOOD: CAC payback in ' + paybackMonths.toFixed(1) + ' months is within the 12-month benchmark. Keep optimizing channel mix.', { months: paybackMonths.toFixed(1) }) + '\n';
    } else if (paybackMonths <= 18) {
      mainResult += makeToken('calc_out.cac.row.payback_warning', '🟡 WARNING: ' + paybackMonths.toFixed(1) + ' months payback is above the 12-month ideal. Review your acquisition channels for efficiency.', { months: paybackMonths.toFixed(1) }) + '\n';
    } else {
      mainResult += makeToken('calc_out.cac.row.payback_critical', '🔴 CRITICAL: ' + paybackMonths.toFixed(1) + ' months payback is too long. Your cash flow is strained. Cut underperforming channels immediately.', { months: paybackMonths.toFixed(1) }) + '\n';
    }
  }

  // P168 B3-1：💡 Tip 改成**真动态**（按回本周期分 4 档 + 缺输入兜底）
  //   —— 原先是一条写死的常量建议，对任何输入都只说同一句话 ⇒ 动态层名不副实。
  //   ⚠️ customFn 里必须写**逐字相同**的一份（守卫「两套实现不许漂」守着这条）。
  let cacTip: string;
  if (avgRevenuePerCustomer <= 0) {
    cacTip = JSON.stringify({ code: 'cac_no_revenue', params: { cac: fmt(cac) } });
  } else if (paybackMonths <= 6) {
    cacTip = JSON.stringify({ code: 'cac_payback_fast', params: { paybackMonths: paybackMonths.toFixed(1) } });
  } else if (paybackMonths <= 12) {
    cacTip = JSON.stringify({ code: 'cac_payback_within_12', params: { paybackMonths: paybackMonths.toFixed(1) } });
  } else if (paybackMonths <= 18) {
    cacTip = JSON.stringify({ code: 'cac_payback_past_12', params: { paybackMonths: paybackMonths.toFixed(1) } });
  } else {
    cacTip = JSON.stringify({ code: 'cac_payback_slow', params: { paybackMonths: paybackMonths.toFixed(1) } });
  }
  mainResult += '\n💡 Tip: ' + cacTip;

  // 🩺 CAC Health (v3)
  if (cac <= 0) {
    mainResult += '\n\n$calc_out.section.cac_health|🩺 CAC Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• ' + makeToken('calc_out.cac.row.health_zero', '🟢 $0 CAC — organic/word-of-mouth growth. Don\'t get complacent; track how you scale.');
  } else if (cac < 200) {
    mainResult += '\n\n$calc_out.section.cac_health|🩺 CAC Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• ' + makeToken('calc_out.cac.row.health_low', '🟢 CAC $' + Math.round(cac) + ' is low. Healthy for SMB SaaS. Pair with LTV to confirm LTV:CAC > 3.', { cac: '$' + Math.round(cac) });
  } else if (cac < 500) {
    mainResult += '\n\n$calc_out.section.cac_health|🩺 CAC Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• ' + makeToken('calc_out.cac.row.health_mid', '🟡 CAC $' + Math.round(cac) + ' is mid-range. Verify LTV:CAC ratio is at least 3:1 before scaling spend.', { cac: '$' + Math.round(cac) });
  } else {
    mainResult += '\n\n$calc_out.section.cac_health|🩺 CAC Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• ' + makeToken('calc_out.cac.row.health_high', '🔴 CAC $' + Math.round(cac) + ' is high. Each new customer takes months/years to pay back. Cut CAC or raise LTV.', { cac: '$' + Math.round(cac) });
  }

  // 🔄 What-If Scenarios (v3)
  mainResult += '\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  if (newCustomers > 0) {
    const halfCac = cac / 2;
    const doubledCust = newCustomers * 2;
    const newCacAtDoubled = (marketingSpend + salesSpend) / doubledCust;
    mainResult += '\n• ' + makeToken('calc_out.cac.row.whatif_cut_cac_half', 'Cut CAC in half:  $' + Math.round(halfCac) + '  (assumes same spend, better conversion)', { cac: '$' + Math.round(halfCac) });
    mainResult += '\n• ' + makeToken('calc_out.cac.row.whatif_double_acquisition', 'Double acquisition:  ' + newCustomers + ' → ' + doubledCust + ' customers at $' + Math.round(newCacAtDoubled) + '/customer', { from: String(newCustomers), to: String(doubledCust), cac: '$' + Math.round(newCacAtDoubled) });
    mainResult += '\n• ' + makeToken('calc_out.cac.row.whatif_industry_benchmark', 'Industry benchmark CAC:  SMB SaaS $100-300, mid-market $300-700, enterprise $700+');
    mainResult += '\n• ' + makeToken('calc_out.cac.row.whatif_reduce_spend_20', 'Reduce spend 20%:  Same customers → $' + Math.round(cac * 0.8) + ' CAC (if conversion maintained)', { cac: '$' + Math.round(cac * 0.8) });
  } else {
    mainResult += '\n• ' + makeToken('calc_out.cac.row.whatif_cannot_model', '⚠️ Cannot model — enter marketing spend, sales spend, and new customers to see scenarios.');
  }

  // ⚖️ Break-Even (v3)
  if (avgRevenuePerCustomer > 0 && cac > 0) {
    const targetLtv = cac * 3; // 3:1 LTV:CAC benchmark
    const ltvNow = grossProfitPerCustomer * 12; // conservative 12-month LTV at current GR
    const ltvCacNow = ltvNow / cac;
    let beLine = '\n\n$calc_out.section.cac_break_even|⚖️ Break-Even|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    if (ltvCacNow >= 3) {
      beLine += '\n• ' + makeToken('calc_out.cac.row.break_even_healthy', '🟢 LTV:CAC = ' + ltvCacNow.toFixed(1) + ':1 — already above the 3:1 break-even. Healthy to scale spend.', { ratio: ltvCacNow.toFixed(1) });
    } else if (ltvCacNow >= 1) {
      beLine += '\n• ' + makeToken('calc_out.cac.row.break_even_ok', '🟡 LTV:CAC = ' + ltvCacNow.toFixed(1) + ':1 — above 1:1 (not losing money) but below 3:1 ideal.', { ratio: ltvCacNow.toFixed(1) });
      beLine += '\n• ' + makeToken('calc_out.cac.row.break_even_target_3to1', 'To reach 3:1 at current 12-mo LTV ($' + Math.round(ltvNow).toLocaleString() + '):  target CAC = $' + Math.round(targetLtv).toLocaleString(), { ltv: '$' + Math.round(ltvNow).toLocaleString(), cac: '$' + Math.round(targetLtv).toLocaleString() });
    } else {
      beLine += '\n• ' + makeToken('calc_out.cac.row.break_even_losing', '🔴 LTV:CAC = ' + ltvCacNow.toFixed(1) + ':1 — losing money per customer. Stop scaling spend until ratio ≥ 1:1.', { ratio: ltvCacNow.toFixed(1) });
    }
    if (paybackMonths > 0) {
      beLine += '\n• ' + makeToken('calc_out.cac.row.break_even_payback', 'Payback break-even:  ≤ 12 months. Your payback = ' + paybackMonths.toFixed(1) + ' mo.', { months: paybackMonths.toFixed(1) });
    }
    mainResult += beLine;
  }

  // 🎯 CAC Milestones (v3)
  if (cac > 0 && grossProfitPerCustomer > 0) {
    mainResult += '\n\n$calc_out.section.cac_milestones|🎯 CAC Milestones|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    mainResult += '\n• ' + makeToken('calc_out.cac.row.milestone_6mo', '≤ 6 months payback:  CAC ≤ $' + Math.round(grossProfitPerCustomer * 6).toLocaleString(), { cac: '$' + Math.round(grossProfitPerCustomer * 6).toLocaleString() });
    mainResult += '\n• ' + makeToken('calc_out.cac.row.milestone_12mo', '≤ 12 months payback:  CAC ≤ $' + Math.round(grossProfitPerCustomer * 12).toLocaleString(), { cac: '$' + Math.round(grossProfitPerCustomer * 12).toLocaleString() });
    mainResult += '\n• ' + makeToken('calc_out.cac.row.milestone_18mo', '≤ 18 months payback:  CAC ≤ $' + Math.round(grossProfitPerCustomer * 18).toLocaleString(), { cac: '$' + Math.round(grossProfitPerCustomer * 18).toLocaleString() });
    if (newCustomers > 0 && totalSpend > 0) {
      const targetCac = grossProfitPerCustomer * 12;
      const budgetFor100 = Math.round(targetCac * 100); // 100 customers at 12-mo payback
      mainResult += '\n• ' + makeToken('calc_out.cac.row.milestone_100_customers', 'To acquire 100 customers at 12-mo payback:  budget $' + budgetFor100.toLocaleString(), { budget: '$' + budgetFor100.toLocaleString() });
    }
  }

  // P168 B3-1：**🧭 四段已迁到页面的「🧭 算完之后」区块**
  //   （src/i18n/locales/{en,zh}.json 的 tools.<slug>.decision_goal /
  //     decision_recommendation / decision_constraint / decision_next_tool，双语）
  //   ⇒ 引擎只负责算；**决策支持由区块独占** ⇒ 同页不再有两份决策建议。
  //   ⚠️ 引擎里**不要**再写这段：区块与卡片会同时渲染同一件事。

  results.push(mainResult);

  // 5 comparison scenarios at different spend levels
  const spendScenarios = [
    { label: 'Cut spend 50%', marketing: marketingSpend * 0.5, sales: salesSpend * 0.5 },
    { label: 'Cut spend 25%', marketing: marketingSpend * 0.75, sales: salesSpend * 0.75 },
    { label: 'Current', marketing: marketingSpend, sales: salesSpend },
    { label: 'Increase spend 25%', marketing: marketingSpend * 1.25, sales: salesSpend * 1.25 },
    { label: 'Double spend', marketing: marketingSpend * 2, sales: salesSpend * 2 },
  ];

  for (let i = 0; i < spendScenarios.length; i++) {
    const s = spendScenarios[i];
    const total = s.marketing + s.sales;
    // Assume customers acquired scales proportionally
    const scaledCustomers = newCustomers > 0 && totalSpend > 0
      ? Math.round(newCustomers * (total / totalSpend))
      : newCustomers;
    const cacScen = scaledCustomers > 0 ? total / scaledCustomers : 0;
    const paybackScen = grossProfitPerCustomer > 0 ? cacScen / grossProfitPerCustomer : 0;
    // ⭐ 每档**单独写出 code 字面量**（动态拼码 ⇒ 静态扫描器认不出 ⇒ locale 落库后仍红）
    let scenarioLabel: string;
    if (i === 0) scenarioLabel = '$calc_out.label.scenario_cut_spend_50|Cut spend 50%|';
    else if (i === 1) scenarioLabel = '$calc_out.label.scenario_cut_spend_25|Cut spend 25%|';
    else if (i === 2) scenarioLabel = '$calc_out.label.scenario_current|Current|';
    else if (i === 3) scenarioLabel = '$calc_out.label.scenario_increase_spend_25|Increase spend 25%|';
    else scenarioLabel = '$calc_out.label.scenario_double_spend|Double spend|';
    let line =
      scenarioLabel + ': ' + makeToken('calc_out.cac.row.scenario_spend', '$' + Math.round(total).toLocaleString() + ' total spend, ' + scaledCustomers + ' customers, CAC ' + fmt(cacScen), { total: '$' + Math.round(total).toLocaleString(), customers: String(scaledCustomers), cac: fmt(cacScen) });
    if (avgRevenuePerCustomer > 0) {
      line += makeToken('calc_out.cac.row.scenario_payback', ', Payback ' + paybackScen.toFixed(1) + ' mo', { months: paybackScen.toFixed(1) });
    }
    results.push(line);
  }

  return results;
}

const customFn =
  // P168 B3-9：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 服务端与客户端输出逐字节相同，不可能漂；new Function 的签名不变（仍是 3 个参数）。
  //   ⚠️ 客户端原先少 4 段（CAC Health / What-If / Break-Even / CAC Milestones）
  //      ⇒ 本次补齐（与服务端逐字相同、同样令牌化）—— 否则同一页静态卡片与动态卡片不同。
  //   ⚠️ 页面只渲染 results[0] ⇒ 返回**单元素数组**（整份输出拼成一段）。
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let m=function(u){return Number.isNaN(u)?0:Math.max(0,u)},$=function(u){const _=m(parseFloat(u.marketingSpend)||0),d=m(parseFloat(u.salesSpend)||0),r=m(parseInt(u.newCustomers)||0),C=m(parseFloat(u.avgRevenuePerCustomer)||0),v=m(parseFloat(u.grossMargin)||80),y=[],p=_+d,o=r>0?p/r:0,i=C*(v/100),a=i>0?o/i:0,M=p>0?_/p*100:0,A=p>0?d/p*100:0,l=e=>"$"+Math.round(e).toLocaleString(),f=e=>e.toFixed(1)+"%",N=e=>e.toLocaleString();let c=\`$calc_out.section.cac_calculator|🎯 Customer Acquisition Cost (CAC)|

• \`+t("calc_out.cac.row.marketing_spend","Marketing Spend: "+l(_)+" ("+f(M)+" of total)",{amount:l(_),pct:f(M)})+\`
• \`+t("calc_out.cac.row.sales_spend","Sales Spend: "+l(d)+" ("+f(A)+" of total)",{amount:l(d),pct:f(A)})+\`
• $calc_out.label.total_acquisition_spend|Total Acquisition Spend|: \`+l(p)+\`
• $calc_out.label.new_customers_acquired|New Customers Acquired|: \`+N(r)+\`

━━━━━━━━━━━━━━━━━━━━

$calc_out.section.cac_key_results|📊 Key Results:|

• \`+t("calc_out.cac.row.customer_acquisition_cost","Customer Acquisition Cost (CAC): "+l(o)+" per customer",{cac:l(o)})+\`
\`;if(C>0&&(c+="• $calc_out.label.avg_revenue_per_customer_mo|Avg Revenue per Customer|: "+l(C)+\`/mo
\`,c+="• $calc_out.label.gross_profit_per_customer|Gross Profit per Customer|: "+l(i)+\`/mo
\`,c+="• "+t("calc_out.cac.row.cac_payback_period","CAC Payback Period: "+a.toFixed(1)+" months",{months:a.toFixed(1)})+\`
\`),c+=\`
\`,C>0){const e=C*12*(v/100),n=a>0?o*3:0;c+="• $calc_out.label.est_first_year_customer_value|Est. First-Year Customer Value|: "+l(e)+\`
\`,n>0&&(c+="• $calc_out.label.target_ltv_3to1|Target LTV (at 3:1 ratio)|: "+l(n)+\`
\`),c+=\`
\`,a<=6?c+=t("calc_out.cac.row.payback_strong","🟢 STRONG: CAC payback in "+a.toFixed(1)+" months is excellent. You recover acquisition costs quickly and can reinvest faster.",{months:a.toFixed(1)})+\`
\`:a<=12?c+=t("calc_out.cac.row.payback_good","🟡 GOOD: CAC payback in "+a.toFixed(1)+" months is within the 12-month benchmark. Keep optimizing channel mix.",{months:a.toFixed(1)})+\`
\`:a<=18?c+=t("calc_out.cac.row.payback_warning","🟡 WARNING: "+a.toFixed(1)+" months payback is above the 12-month ideal. Review your acquisition channels for efficiency.",{months:a.toFixed(1)})+\`
\`:c+=t("calc_out.cac.row.payback_critical","🔴 CRITICAL: "+a.toFixed(1)+" months payback is too long. Your cash flow is strained. Cut underperforming channels immediately.",{months:a.toFixed(1)})+\`
\`}let g;if(C<=0?g=JSON.stringify({code:"cac_no_revenue",params:{cac:l(o)}}):a<=6?g=JSON.stringify({code:"cac_payback_fast",params:{paybackMonths:a.toFixed(1)}}):a<=12?g=JSON.stringify({code:"cac_payback_within_12",params:{paybackMonths:a.toFixed(1)}}):a<=18?g=JSON.stringify({code:"cac_payback_past_12",params:{paybackMonths:a.toFixed(1)}}):g=JSON.stringify({code:"cac_payback_slow",params:{paybackMonths:a.toFixed(1)}}),c+=\`
💡 Tip: \`+g,o<=0?c+=\`

$calc_out.section.cac_health|🩺 CAC Health:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+t("calc_out.cac.row.health_zero","🟢 $0 CAC — organic/word-of-mouth growth. Don't get complacent; track how you scale."):o<200?c+=\`

$calc_out.section.cac_health|🩺 CAC Health:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+t("calc_out.cac.row.health_low","🟢 CAC $"+Math.round(o)+" is low. Healthy for SMB SaaS. Pair with LTV to confirm LTV:CAC > 3.",{cac:"$"+Math.round(o)}):o<500?c+=\`

$calc_out.section.cac_health|🩺 CAC Health:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+t("calc_out.cac.row.health_mid","🟡 CAC $"+Math.round(o)+" is mid-range. Verify LTV:CAC ratio is at least 3:1 before scaling spend.",{cac:"$"+Math.round(o)}):c+=\`

$calc_out.section.cac_health|🩺 CAC Health:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+t("calc_out.cac.row.health_high","🔴 CAC $"+Math.round(o)+" is high. Each new customer takes months/years to pay back. Cut CAC or raise LTV.",{cac:"$"+Math.round(o)}),c+=\`

$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\`,r>0){const e=o/2,n=r*2,s=(_+d)/n;c+=\`
• \`+t("calc_out.cac.row.whatif_cut_cac_half","Cut CAC in half:  $"+Math.round(e)+"  (assumes same spend, better conversion)",{cac:"$"+Math.round(e)}),c+=\`
• \`+t("calc_out.cac.row.whatif_double_acquisition","Double acquisition:  "+r+" → "+n+" customers at $"+Math.round(s)+"/customer",{from:String(r),to:String(n),cac:"$"+Math.round(s)}),c+=\`
• \`+t("calc_out.cac.row.whatif_industry_benchmark","Industry benchmark CAC:  SMB SaaS $100-300, mid-market $300-700, enterprise $700+"),c+=\`
• \`+t("calc_out.cac.row.whatif_reduce_spend_20","Reduce spend 20%:  Same customers → $"+Math.round(o*.8)+" CAC (if conversion maintained)",{cac:"$"+Math.round(o*.8)})}else c+=\`
• \`+t("calc_out.cac.row.whatif_cannot_model","⚠️ Cannot model — enter marketing spend, sales spend, and new customers to see scenarios.");if(C>0&&o>0){const e=o*3,n=i*12,s=n/o;let h=\`

$calc_out.section.cac_break_even|⚖️ Break-Even|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\`;s>=3?h+=\`
• \`+t("calc_out.cac.row.break_even_healthy","🟢 LTV:CAC = "+s.toFixed(1)+":1 — already above the 3:1 break-even. Healthy to scale spend.",{ratio:s.toFixed(1)}):s>=1?(h+=\`
• \`+t("calc_out.cac.row.break_even_ok","🟡 LTV:CAC = "+s.toFixed(1)+":1 — above 1:1 (not losing money) but below 3:1 ideal.",{ratio:s.toFixed(1)}),h+=\`
• \`+t("calc_out.cac.row.break_even_target_3to1","To reach 3:1 at current 12-mo LTV ($"+Math.round(n).toLocaleString()+"):  target CAC = $"+Math.round(e).toLocaleString(),{ltv:"$"+Math.round(n).toLocaleString(),cac:"$"+Math.round(e).toLocaleString()})):h+=\`
• \`+t("calc_out.cac.row.break_even_losing","🔴 LTV:CAC = "+s.toFixed(1)+":1 — losing money per customer. Stop scaling spend until ratio ≥ 1:1.",{ratio:s.toFixed(1)}),a>0&&(h+=\`
• \`+t("calc_out.cac.row.break_even_payback","Payback break-even:  ≤ 12 months. Your payback = "+a.toFixed(1)+" mo.",{months:a.toFixed(1)})),c+=h}if(o>0&&i>0&&(c+=\`

$calc_out.section.cac_milestones|🎯 CAC Milestones|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\`,c+=\`
• \`+t("calc_out.cac.row.milestone_6mo","≤ 6 months payback:  CAC ≤ $"+Math.round(i*6).toLocaleString(),{cac:"$"+Math.round(i*6).toLocaleString()}),c+=\`
• \`+t("calc_out.cac.row.milestone_12mo","≤ 12 months payback:  CAC ≤ $"+Math.round(i*12).toLocaleString(),{cac:"$"+Math.round(i*12).toLocaleString()}),c+=\`
• \`+t("calc_out.cac.row.milestone_18mo","≤ 18 months payback:  CAC ≤ $"+Math.round(i*18).toLocaleString(),{cac:"$"+Math.round(i*18).toLocaleString()}),r>0&&p>0)){const e=i*12,n=Math.round(e*100);c+=\`
• \`+t("calc_out.cac.row.milestone_100_customers","To acquire 100 customers at 12-mo payback:  budget $"+n.toLocaleString(),{budget:"$"+n.toLocaleString()})}y.push(c);const F=[{label:"Cut spend 50%",marketing:_*.5,sales:d*.5},{label:"Cut spend 25%",marketing:_*.75,sales:d*.75},{label:"Current",marketing:_,sales:d},{label:"Increase spend 25%",marketing:_*1.25,sales:d*1.25},{label:"Double spend",marketing:_*2,sales:d*2}];for(let e=0;e<F.length;e++){const n=F[e],s=n.marketing+n.sales,h=r>0&&p>0?Math.round(r*(s/p)):r,w=h>0?s/h:0,L=i>0?w/i:0;let b;e===0?b="$calc_out.label.scenario_cut_spend_50|Cut spend 50%|":e===1?b="$calc_out.label.scenario_cut_spend_25|Cut spend 25%|":e===2?b="$calc_out.label.scenario_current|Current|":e===3?b="$calc_out.label.scenario_increase_spend_25|Increase spend 25%|":b="$calc_out.label.scenario_double_spend|Double spend|";let x=b+": "+t("calc_out.cac.row.scenario_spend","$"+Math.round(s).toLocaleString()+" total spend, "+h+" customers, CAC "+l(w),{total:"$"+Math.round(s).toLocaleString(),customers:String(h),cac:l(w)});C>0&&(x+=t("calc_out.cac.row.scenario_payback",", Payback "+L.toFixed(1)+" mo",{months:L.toFixed(1)})),y.push(x)}return y},S=function(u,_,d){var r=q(u);return Array.isArray(r)?r.join(\`
\`):String(r)};var P=m,V=$,O=S,t=tk,k='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',t=new Function("return "+k)(),q=function(u){return $(u)};return[S(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

const engine: ToolEngine = {
  slug: 'solopreneur-cac-calculator',
  title: 'CAC Calculator',
  description: 'Calculate your Customer Acquisition Cost and payback period. Compare different spend scenarios to find your most efficient acquisition budget.',
  inputs: [
    { name: 'marketingSpend', label: 'Marketing Spend ($)', placeholder: 'e.g. 5000', type: 'number' },
    { name: 'salesSpend', label: 'Sales Spend ($)', placeholder: 'e.g. 3000', type: 'number' },
    { name: 'newCustomers', label: 'New Customers Acquired', placeholder: 'e.g. 40', type: 'number' },
    { name: 'avgRevenuePerCustomer', label: 'Avg Monthly Revenue per Customer ($)', placeholder: 'e.g. 50', type: 'number' },
    { name: 'grossMargin', label: 'Gross Margin (%)', placeholder: 'e.g. 80', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs: Record<string, string>): string[] {
    return calculateCAC(inputs);
  },
  staticExamples: [
    '$calc_out.section.cac_calculator|🎯 Customer Acquisition Cost (CAC)|\n\n• $calc_out.cac.row.marketing_spend{"amount":"$5,000","pct":"62.5%"}|Marketing Spend: $5,000 (62.5% of total)|\n• $calc_out.cac.row.sales_spend{"amount":"$3,000","pct":"37.5%"}|Sales Spend: $3,000 (37.5% of total)|\n• $calc_out.label.total_acquisition_spend|Total Acquisition Spend|: $8,000\n• $calc_out.label.new_customers_acquired|New Customers Acquired|: 100\n\n━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.cac_key_results|📊 Key Results:|\n\n• $calc_out.cac.row.customer_acquisition_cost{"cac":"$80"}|Customer Acquisition Cost (CAC): $80 per customer|\n• $calc_out.label.avg_revenue_per_customer_mo|Avg Revenue per Customer|: $50/mo\n• $calc_out.label.gross_profit_per_customer|Gross Profit per Customer|: $40/mo\n• $calc_out.cac.row.cac_payback_period{"months":"2.0"}|CAC Payback Period: 2.0 months|\n\n• $calc_out.label.est_first_year_customer_value|Est. First-Year Customer Value|: $480\n• $calc_out.label.target_ltv_3to1|Target LTV (at 3:1 ratio)|: $240\n\n$calc_out.cac.row.payback_strong{"months":"2.0"}|🟢 STRONG: CAC payback in 2.0 months is excellent. You recover acquisition costs quickly and can reinvest faster.|\n\n💡 Tip: {"code":"cac_payback_fast","params":{"paybackMonths":"2.0"}}\n\n$calc_out.section.cac_health|🩺 CAC Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.cac.row.health_low{"cac":"$80"}|🟢 CAC $80 is low. Healthy for SMB SaaS. Pair with LTV to confirm LTV:CAC > 3.|\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.cac.row.whatif_cut_cac_half{"cac":"$40"}|Cut CAC in half:  $40  (assumes same spend, better conversion)|\n• $calc_out.cac.row.whatif_double_acquisition{"from":"100","to":"200","cac":"$40"}|Double acquisition:  100 → 200 customers at $40/customer|\n• $calc_out.cac.row.whatif_industry_benchmark|Industry benchmark CAC:  SMB SaaS $100-300, mid-market $300-700, enterprise $700+|\n• $calc_out.cac.row.whatif_reduce_spend_20{"cac":"$64"}|Reduce spend 20%:  Same customers → $64 CAC (if conversion maintained)|\n\n$calc_out.section.cac_break_even|⚖️ Break-Even|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.cac.row.break_even_healthy{"ratio":"6.0"}|🟢 LTV:CAC = 6.0:1 — already above the 3:1 break-even. Healthy to scale spend.|\n• $calc_out.cac.row.break_even_payback{"months":"2.0"}|Payback break-even:  ≤ 12 months. Your payback = 2.0 mo.|\n\n$calc_out.section.cac_milestones|🎯 CAC Milestones|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.cac.row.milestone_6mo{"cac":"$240"}|≤ 6 months payback:  CAC ≤ $240|\n• $calc_out.cac.row.milestone_12mo{"cac":"$480"}|≤ 12 months payback:  CAC ≤ $480|\n• $calc_out.cac.row.milestone_18mo{"cac":"$720"}|≤ 18 months payback:  CAC ≤ $720|\n• $calc_out.cac.row.milestone_100_customers{"budget":"$48,000"}|To acquire 100 customers at 12-mo payback:  budget $48,000|\n$calc_out.label.scenario_cut_spend_50|Cut spend 50%|: $calc_out.cac.row.scenario_spend{"total":"$4,000","customers":"50","cac":"$80"}|$4,000 total spend, 50 customers, CAC $80|$calc_out.cac.row.scenario_payback{"months":"2.0"}|, Payback 2.0 mo|\n$calc_out.label.scenario_cut_spend_25|Cut spend 25%|: $calc_out.cac.row.scenario_spend{"total":"$6,000","customers":"75","cac":"$80"}|$6,000 total spend, 75 customers, CAC $80|$calc_out.cac.row.scenario_payback{"months":"2.0"}|, Payback 2.0 mo|\n$calc_out.label.scenario_current|Current|: $calc_out.cac.row.scenario_spend{"total":"$8,000","customers":"100","cac":"$80"}|$8,000 total spend, 100 customers, CAC $80|$calc_out.cac.row.scenario_payback{"months":"2.0"}|, Payback 2.0 mo|\n$calc_out.label.scenario_increase_spend_25|Increase spend 25%|: $calc_out.cac.row.scenario_spend{"total":"$10,000","customers":"125","cac":"$80"}|$10,000 total spend, 125 customers, CAC $80|$calc_out.cac.row.scenario_payback{"months":"2.0"}|, Payback 2.0 mo|\n$calc_out.label.scenario_double_spend|Double spend|: $calc_out.cac.row.scenario_spend{"total":"$16,000","customers":"200","cac":"$80"}|$16,000 total spend, 200 customers, CAC $80|$calc_out.cac.row.scenario_payback{"months":"2.0"}|, Payback 2.0 mo|',
    'Cut spend 50%: $4,000 total spend, 20 customers, CAC $200, Payback 5.0 mo',
    'Cut spend 25%: $6,000 total spend, 30 customers, CAC $200, Payback 5.0 mo',
    'Current: $8,000 total spend, 40 customers, CAC $200, Payback 5.0 mo',
    'Double spend: $16,000 total spend, 80 customers, CAC $200, Payback 5.0 mo',
  ],
  faq: [
    { q: 'What is a good CAC for SaaS?', a: 'There is no universal "good" CAC — it depends on your LTV. What matters is the LTV:CAC ratio, which should be 3:1 or higher. If your LTV is $900, a CAC of $300 is great. If your LTV is $150, a CAC of $200 is disastrous. Always calculate CAC alongside LTV.' },
    { q: 'How do I calculate CAC by channel?', a: 'Track UTM parameters and lead sources in your CRM. For each channel (Google Ads, LinkedIn, SEO, referrals), divide the channel spend by the number of customers acquired from that channel. You will often find that 1-2 channels drive 80% of efficient acquisitions while others waste money.' },
    { q: 'What is the difference between CAC and CPA (Cost Per Acquisition)?', a: 'CAC measures cost per paying customer. CPA is broader and may include free trial signups, leads, or any "acquisition" event. When reporting, always use CAC (paying customers only) for unit economics. CPA for individual funnel stages (e.g., cost per trial signup) helps diagnose funnel issues.' },
    { q: 'Should I include founder time in CAC?', a: 'For early-stage solopreneurs, include an imputed salary for your sales time. If you spend 20 hours/month on sales and value your time at $100/hr, add $2,000 to your sales spend. This gives you a realistic CAC that accounts for the opportunity cost of your time.' },
    { q: 'How can I lower my CAC?', a: 'Five proven ways: (1) Improve targeting — narrow your ideal customer profile to reduce wasted ad spend. (2) Build organic channels — SEO and content marketing have zero marginal CAC after initial investment. (3) Optimize conversion rates — small CVR improvements compound. (4) Leverage referrals — referred customers have near-zero CAC. (5) Test different channels — you may find a cheaper channel you have not tried yet.' },
    { q: "What is CAC (Customer Acquisition Cost)?", a: "CAC = total sales + marketing spend / new customers acquired. For $50K S&M, 100 new customers: $500 CAC. Components: 1) Sales salaries, 2) Marketing spend, 3) Tools, 4) Overhead. Track: monthly, by channel, by segment. Benchmarks: 1) B2B SaaS: $300-1500, 2) Enterprise: $5K-50K, 3) E-commerce: $50-200, 4) Mobile apps: $1-10. Most: lower is better. CAC payback <12 months is healthy." },
    { q: "What is a good CAC payback period?", a: "Benchmarks: 1) <6 months: world-class, 2) 6-12 months: healthy, 3) 12-18 months: acceptable, 4) 18-24 months: concerning, 5) >24 months: critical. Most SaaS: 12-18 months. By segment: SMB 6-12, mid-market 12-18, enterprise 18-24. target 12-month payback. For $1K CAC, $100/mo ARPU, 80% margin: 12.5-month payback. Aim for <12. Top: <6." },
    { q: "What is the difference between CAC and CPA?", a: "CAC (Customer Acquisition Cost): full cost to acquire a paying customer. CPA (Cost Per Acquisition): cost per action (signup, lead, install). For SaaS: CAC includes all sales + marketing. CPA is per conversion event. For e-commerce: CPA often refers to cost per purchase. Most: CAC is broader (full picture). CPA: tactical (channel-specific). Track: CAC for unit economics, CPA for channel optimization." },
    { q: "How do I reduce CAC?", a: "1) Better targeting (right audience), 2) Better creative (test 3-5 versions), 3) Better landing pages, 4) SEO (organic, lower CAC over time), 5) Referral programs (5-10x LTV), 6) Partnerships, 7) PLG (product-led growth). 20-50% CAC reduction in 12 months. SEO + referrals. Most teams 2-3x ROI on content. Be patient: organic takes 6-12 months." },
    { q: "What is the difference between blended and paid CAC?", a: "Blended CAC: total S&M / total customers. Includes organic, paid, referral. Paid CAC: paid S&M / paid customers. Blended: lower (organic drags down). Paid: higher (just paid). Track both. For benchmarking: paid CAC (cleaner). For unit economics: blended (all revenue). paid 2-3x blended. Aim for 1.5-2x. Most teams organic 30-50% of customers. Track by channel, monthly." },
    { q: "How does CAC relate to LTV?", a: "LTV:CAC = key unit economics. Benchmarks: 1) 1:1 = break-even, 2) 3:1 = healthy, 3) 5:1 = under-investing, 4) 10:1 = excellent. For LTV $3K, CAC $1K: 3:1. For LTV $5K, CAC $1K: 5:1. target 3:1+. Investors: minimum 3:1 for investable. Calculate: (LTV × gross_margin) / CAC. Aim for improving LTV:CAC over time. Most teams 3-4x target. Top: 5x+." },
    { q: "Should I include sales team salary in CAC?", a: "Yes. CAC = all S&M costs / new customers. Includes: 1) Sales salaries, 2) Commissions, 3) Marketing spend, 4) Tools, 5) Overhead (allocated). For 4 reps at $80K base + $40K variable = $480K. 100 customers: $4,800 CAC (sales only). Add marketing $200K: total $6,800 CAC. Most: full CAC. Exclude: customer success (post-sale). Include: pre-sale. Be consistent." },
    { q: "How do I benchmark CAC by industry?", a: "Benchmarks: 1) B2B SaaS SMB: $300-1500, 2) B2B SaaS mid-market: $1-5K, 3) Enterprise SaaS: $5-50K, 4) E-commerce: $50-200, 5) Mobile apps: $1-10, 6) Fintech: $100-500, 7) Healthcare: $500-3000. By vertical: 1) Martech: $500-2K, 2) HR: $1-3K, 3) Sales: $1-3K, 4) Engineering: $1-5K. industry-specific. Use SaaS Capital, OpenView, KeyBanc. Track by segment." },
  ],
  howToUse: [
    'Enter your total marketing spend for the period.',
    'Enter your total sales spend (salaries, tools, commissions).',
    'Enter the number of new paying customers acquired in the period.',
    'Optionally enter average monthly revenue per customer and gross margin.',
    'Review your CAC, payback period, and unit economics health indicator.',
    'Scroll down to see 5 comparison scenarios at different total spend levels.',
  ],
  engineKey: true,
  // P140f-p3-T4: 完整 6 字段 playbook (per P140f §4.3 + ADR-0003)
  // Goal 含"该不该"+"继续"+"获取"三关键词 → 通过 T1 zod refine 校验 (决策/decision/该不该/是否)
  // P168 B3-1：🧭 四段已迁到页面的「🧭 算完之后」区块（这里只留 ADR-0003 的决策逻辑要点）
  playbook: {
    goal: '用户该不该继续从当前渠道获取客户',
    input: 'marketingSpend (≥0) + salesSpend (≥0) + newCustomers (≥0) + avgRevenuePerCustomer (≥0) + grossMargin (0-100)',
    output: 'CAC ($/客户) + 健康带 🟢$80 / 🟡$80-300 / 🟠$300-700 / 🔴$700+ + LTV:CAC 比例 + 渠道拆分建议',
    constraint: 'newCustomers = 0 时 CAC 无意义 (Infinity); mix CAC vs single-channel 差异大; LTV 历史 vs 预测需区分',
    tool: '页面的「🧭 算完之后」决策区块（决策支持已由区块独占）',
    memory: 'SaaS Capital 2024 + ChartMogul 2024 + OpenView 2024 (SMB/mid-market/enterprise CAC 区间)',
  },
};

registerEngine(engine);

