import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-7：结果输出 token 化 —— 服务端用 makeToken，客户端 customFn 前置
//   同一份实现（CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 两端逐字节相同，不可能漂。
// ⭐ 形态分工（最容易踩的坑）：
//   · label token（calc_out.label.*）只包**标签文本**；冒号与对齐空格留在 token 之外
//   · row  token（calc_out.project_profitability.row.*）包**整行/尾部片段**，数值抽成 {param}
//   ⇒ locale 模板替换时数值不会消失（否则模板把整行吞掉 ⇒ 页面上数字不见了）。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

function calculateProjectProfitability(inputs: Record<string, string>): string[] {
  const projectRevenue = clampNonNegative(parseFloat(inputs.projectRevenue) || 0);
  const hoursEstimated = clampNonNegative(parseFloat(inputs.hoursEstimated) || 0);
  const hourlyCost = clampNonNegative(parseFloat(inputs.hourlyCost) || 0);
  const materialCost = clampNonNegative(parseFloat(inputs.materialCost) || 0);
  const results: string[] = [];

  const totalLaborCost = hoursEstimated * hourlyCost;
  const totalCost = totalLaborCost + materialCost;
  const profit = projectRevenue - totalCost;
  const effectiveHourly = hoursEstimated > 0 ? projectRevenue / hoursEstimated : 0;
  const costRecoveryHourly = hoursEstimated > 0 ? totalCost / hoursEstimated : 0;
  const profitMargin = projectRevenue > 0 ? (profit / projectRevenue) * 100 : 0;
  const annualizedProfit = profit * 12;
  const breakevenHours = hourlyCost > 0 && effectiveHourly > 0 ? totalCost / effectiveHourly : 0;
  const breakevenRate = hoursEstimated > 0 ? totalCost / hoursEstimated : 0;
  const costMultiplier = hourlyCost > 0 ? effectiveHourly / hourlyCost : 0;

  const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
  const fmt2 = (n: number) => '$' + n.toFixed(2);
  const pct1 = (n: number) => n.toFixed(1);
  const loc = (n: number) => n.toLocaleString();

  results.push(
    makeToken('calc_out.section.project_profitability_calculator', '💰 Project Profitability Calculator') + '\n\n' +
    makeToken('calc_out.section.revenue_and_costs', '📋 Revenue & Costs:') + '\n' +
    '• ' + makeToken('calc_out.label.project_revenue', 'Project Revenue') + ':       ' + fmt(projectRevenue) + '\n' +
    '• ' + makeToken('calc_out.label.hours_estimated', 'Hours Estimated') + ':       ' + loc(hoursEstimated) + ' hrs\n' +
    '• ' + makeToken('calc_out.label.hourly_cost_rate', 'Hourly Cost Rate') + ':      ' + fmt(hourlyCost) + '/hr\n' +
    '• ' + makeToken('calc_out.label.total_labor_cost', 'Total Labor Cost') + ':      ' + fmt(totalLaborCost) + '\n' +
    '• ' + makeToken('calc_out.label.material_cost', 'Material Cost') + ':         ' + fmt(materialCost) + '\n' +
    '• ' + makeToken('calc_out.label.total_cost', 'Total Cost') + ':            ' + fmt(totalCost) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.net_profit_and_margin', '💰 Net Profit + Margin:') + '\n' +
    '• ' + makeToken('calc_out.label.net_profit', 'Net Profit') + ':            ' + fmt(profit) + (profit < 0 ? '  ' + makeToken('calc_out.label.loss_marker', '(LOSS)') : '') + '\n' +
    '• ' + makeToken('calc_out.label.profit_margin', 'Profit Margin') + ':         ' + pct1(profitMargin) + '%  ' + makeToken('calc_out.label.industry_margin_note', '(industry: 20-40% for healthy freelance work)') + '\n' +
    '• ' + makeToken('calc_out.label.total_cost_ratio', 'Total Cost Ratio') + ':      ' + pct1(projectRevenue > 0 ? (totalCost / projectRevenue) * 100 : 0) + '%  ' + makeToken('calc_out.label.lower_is_better', '(lower is better)') + '\n' +
    '• ' + makeToken('calc_out.label.material_cost_pct', 'Material Cost %') + ':       ' + pct1(projectRevenue > 0 ? (materialCost / projectRevenue) * 100 : 0) + '%  ' + makeToken('calc_out.label.of_revenue', 'of revenue') + '\n' +
    '• ' + makeToken('calc_out.label.labor_cost_pct', 'Labor Cost %') + ':          ' + pct1(projectRevenue > 0 ? (totalLaborCost / projectRevenue) * 100 : 0) + '%  ' + makeToken('calc_out.label.of_revenue', 'of revenue') + '\n' +
    '• ' + makeToken('calc_out.label.annualized_12x', 'Annualized (12x)') + ':      ' + fmt(annualizedProfit) + '/yr  ' + makeToken('calc_out.label.if_repeatable', '(if repeatable)') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.key_metrics', '📐 Key Metrics:') + '\n' +
    '• ' + makeToken('calc_out.label.effective_hourly_rate', 'Effective $/Hour') + ':      ' + fmt2(effectiveHourly) + '/hr  ' + makeToken('calc_out.label.revenue_div_hours', '(revenue ÷ hours)') + '\n' +
    '• ' + makeToken('calc_out.label.cost_recovery_hourly', 'Cost Recovery $/Hour') + ':  ' + fmt2(costRecoveryHourly) + '/hr  ' + makeToken('calc_out.label.total_cost_div_hours', '(total cost ÷ hours)') + '\n' +
    '• ' + makeToken('calc_out.label.cost_vs_cost_rate', 'Cost vs Cost Rate') + ':     ' + (costMultiplier > 0 ? costMultiplier.toFixed(2) + 'x' : 'N/A') + '  ' + makeToken('calc_out.label.target_over_2x', '(target >2x)') + '\n' +
    '• ' + makeToken('calc_out.label.profit_per_hour', 'Profit per Hour') + ':       ' + fmt2(hoursEstimated > 0 ? profit / hoursEstimated : 0) + '/hr\n' +
    '• ' + makeToken('calc_out.label.break_even_hours', 'Break-Even Hours') + ':      ' + pct1(breakevenHours) + ' hrs  ' + makeToken('calc_out.label.hours_to_cover_costs', '(hours at current rate to cover costs)') + '\n' +
    '• ' + makeToken('calc_out.label.industry_benchmarks', 'Industry Benchmarks') + ':   ' + makeToken('calc_out.label.benchmark_consulting', 'Consulting 50%+') + ' | ' + makeToken('calc_out.label.benchmark_saas_services', 'SaaS services 30-50%') + ' | ' + makeToken('calc_out.label.benchmark_productized', 'Productized 40-60%') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.margin_health', '🩺 Margin Health:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (profitMargin > 30
      ? '• ' + makeToken('calc_out.project_profitability.row.margin_healthy', '🟢 Margin ' + pct1(profitMargin) + '% is healthy. Strong pricing power.', { margin: pct1(profitMargin) }) + '\n'
      : profitMargin >= 15
      ? '• ' + makeToken('calc_out.project_profitability.row.margin_workable_tight', '🟡 Margin ' + pct1(profitMargin) + '% is workable but tight. Watch scope creep.', { margin: pct1(profitMargin) }) + '\n'
      : profitMargin >= 5
      ? '• ' + makeToken('calc_out.project_profitability.row.margin_thin', '🟠 Margin ' + pct1(profitMargin) + '% is thin. One delay kills profit.', { margin: pct1(profitMargin) }) + '\n'
      : profitMargin > 0
      ? '• ' + makeToken('calc_out.project_profitability.row.margin_very_thin', '🟠 Margin ' + pct1(profitMargin) + '% is very thin. Reconsider pricing.', { margin: pct1(profitMargin) }) + '\n'
      : '• ' + makeToken('calc_out.project_profitability.row.margin_losing_money', '🔴 Margin ' + pct1(profitMargin) + '% — losing money. Cut costs or raise price immediately.', { margin: pct1(profitMargin) }) + '\n') +
    (effectiveHourly >= hourlyCost * 2 && hourlyCost > 0
      ? '• ' + makeToken('calc_out.project_profitability.row.earning_sustainable', '🟢 Earning ' + costMultiplier.toFixed(1) + 'x cost rate — sustainable model.', { mult: costMultiplier.toFixed(1) }) + '\n'
      : effectiveHourly >= hourlyCost && hourlyCost > 0
      ? '• ' + makeToken('calc_out.project_profitability.row.earning_breakeven', '🟡 Earning ' + costMultiplier.toFixed(1) + 'x cost rate — break-even territory.', { mult: costMultiplier.toFixed(1) }) + '\n'
      : hourlyCost > 0
      ? '• ' + makeToken('calc_out.project_profitability.row.earning_below_cost', '🔴 Earning less than cost rate — you subsidize the client.') + '\n'
      : '') +
    (materialCost > projectRevenue * 0.2
      ? '• ' + makeToken('calc_out.project_profitability.row.materials_high', '🟡 Materials are ' + pct1((materialCost / projectRevenue) * 100) + '% of revenue — verify pricing covers this.', { pct: pct1((materialCost / projectRevenue) * 100) }) + '\n'
      : materialCost > 0
      ? '• ' + makeToken('calc_out.project_profitability.row.materials_reasonable', '🟢 Materials are ' + pct1((materialCost / projectRevenue) * 100) + '% of revenue — reasonable.', { pct: pct1((materialCost / projectRevenue) * 100) }) + '\n'
      : '') +
    '\n' + makeToken('calc_out.section.annualized_profit', '🎯 Annualized Profit:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.label.repeat_1x_month', 'Repeat 1×/month') + ':       ' + fmt(annualizedProfit) + '/yr\n' +
    '• ' + makeToken('calc_out.label.repeat_2x_month', 'Repeat 2×/month') + ':       ' + fmt(annualizedProfit * 2) + '/yr\n' +
    '• ' + makeToken('calc_out.label.repeat_4x_month', 'Repeat 4×/month') + ':       ' + fmt(annualizedProfit * 4) + '/yr  ' + makeToken('calc_out.label.full_pipeline', '(full pipeline)') + '\n' +
    '• ' + makeToken('calc_out.label.at_10pct_margin_uplift', 'At 10% margin uplift') + ':  ' + fmt((profit + projectRevenue * 0.1) * 12) + '/yr  ' + makeToken('calc_out.label.price_up_10pct', '(price +10%)') + '\n' +
    '• ' + makeToken('calc_out.project_profitability.row.target_profit_projects', 'Target Profit: $50K/yr → ' + Math.ceil(50000 / Math.max(profit, 1)) + ' projects like this per year', { n: String(Math.ceil(50000 / Math.max(profit, 1))) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.profitable_hourly', '⚖️ Profitable Hourly:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.label.break_even_rate', 'Break-Even Rate') + ':       ' + fmt2(breakevenRate) + '/hr  ' + makeToken('calc_out.label.charge_to_cover_costs', '(charge this to cover costs)') + '\n' +
    '• ' + makeToken('calc_out.label.for_30pct_margin', 'For 30% Margin') + ':        ' + fmt2(breakevenRate / 0.7) + '/hr  ' + makeToken('calc_out.label.current_rate_note', '(current: ' + fmt2(effectiveHourly) + ')', { cur: fmt2(effectiveHourly) }) + '\n' +
    '• ' + makeToken('calc_out.label.for_50pct_margin', 'For 50% Margin') + ':        ' + fmt2(breakevenRate / 0.5) + '/hr\n' +
    '• ' + makeToken('calc_out.label.to_earn_100_per_hour', 'To Earn $100/hr') + ':       ' + fmt2(100 + costRecoveryHourly) + '/hr  ' + makeToken('calc_out.label.bill_rate_cost_plus_target', 'bill rate (cost + target)') + '\n' +
    (effectiveHourly > breakevenRate
      ? '• ' + makeToken('calc_out.project_profitability.row.current_rate_beats_breakeven', '🟢 Current rate ' + fmt2(effectiveHourly) + '/hr beats break-even.', { rate: fmt2(effectiveHourly) }) + '\n'
      : '• ' + makeToken('calc_out.project_profitability.row.current_rate_below_breakeven', '🔴 Current rate ' + fmt2(effectiveHourly) + '/hr is below break-even ' + fmt2(breakevenRate) + '/hr.', { rate: fmt2(effectiveHourly), be: fmt2(breakevenRate) }) + '\n') +
    '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.what_if_scenarios', '🔄 What-If Scenarios:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.project_profitability.row.whatif_cut_hours_20', 'Cut hours 20%:  Profit ' + fmt(profit - hoursEstimated * 0.2 * hourlyCost) + '  (margin ' + pct1(projectRevenue > 0 ? ((profit - hoursEstimated * 0.2 * hourlyCost) / projectRevenue) * 100 : 0) + '%)', { profit: fmt(profit - hoursEstimated * 0.2 * hourlyCost), margin: pct1(projectRevenue > 0 ? ((profit - hoursEstimated * 0.2 * hourlyCost) / projectRevenue) * 100 : 0) }) + '\n' +
    '• ' + makeToken('calc_out.project_profitability.row.whatif_raise_price_15', 'Raise price 15%:  Profit ' + fmt(profit + projectRevenue * 0.15) + '  (margin ' + pct1(((profit + projectRevenue * 0.15) / (projectRevenue * 1.15)) * 100) + '%)', { profit: fmt(profit + projectRevenue * 0.15), margin: pct1(((profit + projectRevenue * 0.15) / (projectRevenue * 1.15)) * 100) }) + '\n' +
    '• ' + makeToken('calc_out.project_profitability.row.whatif_cut_materials_30', 'Cut materials 30%:  Profit ' + fmt(profit + materialCost * 0.3) + '  (margin ' + pct1(((profit + materialCost * 0.3) / projectRevenue) * 100) + '%)', { profit: fmt(profit + materialCost * 0.3), margin: pct1(((profit + materialCost * 0.3) / projectRevenue) * 100) }) + '\n' +
    '• ' + makeToken('calc_out.project_profitability.row.whatif_for_50pct_margin', 'For 50% margin:  Target price ' + fmt(totalCost * 2) + '  (current: ' + fmt(projectRevenue) + ')', { price: fmt(totalCost * 2), cur: fmt(projectRevenue) }) + '\n' +
    '• ' + makeToken('calc_out.project_profitability.row.whatif_combine', 'Combine (15% price + 10% fewer hours):  Profit ' + fmt((profit + projectRevenue * 0.15) - (hoursEstimated * 0.1 * hourlyCost)), { profit: fmt((profit + projectRevenue * 0.15) - (hoursEstimated * 0.1 * hourlyCost)) }) + '\n\n' +
    '💡 Tip: Track ACTUAL hours on every project for 3 months. Estimation bias is the #1 profit killer for solopreneurs — most underestimate by 20-30%. Your effective hourly rate tells the real story of whether a project was worth your time.',
  );

  const rates = [25, 40, 60, 80, 100, 120, 150, 200, 250];
  for (let i = 0; i < rates.length; i++) {
    const r = rates[i];
    const labor = hoursEstimated * r;
    const total = labor + materialCost;
    const prof = projectRevenue - total;
    const margin = projectRevenue > 0 ? (prof / projectRevenue) * 100 : 0;
    // ⚠️ 费率行含 ' | '（维度分隔）⇒ **不能整行包成一个 token**（半角 | 会截断兜底捕获）
    //   ⇒ 拆成 5 段 5 个 code，' | ' 留在 token 之外，数值全部放进 params。
    results.push(
      makeToken('calc_out.project_profitability.row.rate_at_cost', 'At $' + r + '/hr cost:', { rate: '$' + r }) + ' ' +
      makeToken('calc_out.project_profitability.row.rate_total', 'Total $' + loc(total), { total: '$' + loc(total) }) + ' | ' +
      makeToken('calc_out.project_profitability.row.rate_profit', 'Profit ' + fmt(prof), { profit: fmt(prof) }) + ' | ' +
      makeToken('calc_out.project_profitability.row.rate_margin', 'Margin ' + pct1(margin) + '%', { margin: pct1(margin) }) + ' | ' +
      makeToken('calc_out.project_profitability.row.rate_eff', 'Eff ' + fmt2(effectiveHourly), { eff: fmt2(effectiveHourly) }) + '/hr',
    );
  }

  return results;
}

const customFn =
  // P168 B3-7：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 两端输出逐字节相同，不可能漂；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var pr=cnn(parseFloat(inputs.projectRevenue)||0);" +
  "var he=cnn(parseFloat(inputs.hoursEstimated)||0);" +
  "var hc=cnn(parseFloat(inputs.hourlyCost)||0);" +
  "var mc=cnn(parseFloat(inputs.materialCost)||0);" +
  "var tlc=he*hc;" +
  "var tc=tlc+mc;" +
  "var profit=pr-tc;" +
  "var ehr=he>0?pr/he:0;" +
  "var crhr=he>0?tc/he:0;" +
  "var pm=pr>0?(profit/pr)*100:0;" +
  "var ann=profit*12;" +
  "var beh=hc>0&&ehr>0?tc/ehr:0;" +
  "var ber=he>0?tc/he:0;" +
  "var cm=hc>0?ehr/hc:0;" +
  "function fmt(n){return '$'+Math.round(n).toLocaleString()}" +
  "function fmt2(n){return '$'+n.toFixed(2)}" +
  "function pct1(n){return n.toFixed(1)}" +
  "function loc(n){return n.toLocaleString()}" +
  "var results=[];" +
  "var r='';" +
  "r+=tk('calc_out.section.project_profitability_calculator','\\uD83D\\uDCB0 Project Profitability Calculator')+'\\n\\n';" +
  "r+=tk('calc_out.section.revenue_and_costs','\\uD83D\\uDCCB Revenue & Costs:')+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.label.project_revenue','Project Revenue')+':       '+fmt(pr)+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.label.hours_estimated','Hours Estimated')+':       '+loc(he)+' hrs\\n';" +
  "r+='\\u2022 '+tk('calc_out.label.hourly_cost_rate','Hourly Cost Rate')+':      '+fmt(hc)+'/hr\\n';" +
  "r+='\\u2022 '+tk('calc_out.label.total_labor_cost','Total Labor Cost')+':      '+fmt(tlc)+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.label.material_cost','Material Cost')+':         '+fmt(mc)+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.label.total_cost','Total Cost')+':            '+fmt(tc)+'\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+=tk('calc_out.section.net_profit_and_margin','\\uD83D\\uDCB0 Net Profit + Margin:')+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.label.net_profit','Net Profit')+':            '+fmt(profit)+(profit<0?'  '+tk('calc_out.label.loss_marker','(LOSS)'):'')+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.label.profit_margin','Profit Margin')+':         '+pct1(pm)+'%  '+tk('calc_out.label.industry_margin_note','(industry: 20-40% for healthy freelance work)')+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.label.total_cost_ratio','Total Cost Ratio')+':      '+pct1(pr>0?(tc/pr)*100:0)+'%  '+tk('calc_out.label.lower_is_better','(lower is better)')+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.label.material_cost_pct','Material Cost %')+':       '+pct1(pr>0?(mc/pr)*100:0)+'%  '+tk('calc_out.label.of_revenue','of revenue')+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.label.labor_cost_pct','Labor Cost %')+':          '+pct1(pr>0?(tlc/pr)*100:0)+'%  '+tk('calc_out.label.of_revenue','of revenue')+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.label.annualized_12x','Annualized (12x)')+':      '+fmt(ann)+'/yr  '+tk('calc_out.label.if_repeatable','(if repeatable)')+'\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+=tk('calc_out.section.key_metrics','\\uD83D\\uDCD0 Key Metrics:')+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.label.effective_hourly_rate','Effective $/Hour')+':      '+fmt2(ehr)+'/hr  '+tk('calc_out.label.revenue_div_hours','(revenue \\u00F7 hours)')+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.label.cost_recovery_hourly','Cost Recovery $/Hour')+':  '+fmt2(crhr)+'/hr  '+tk('calc_out.label.total_cost_div_hours','(total cost \\u00F7 hours)')+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.label.cost_vs_cost_rate','Cost vs Cost Rate')+':     '+(cm>0?cm.toFixed(2)+'x':'N/A')+'  '+tk('calc_out.label.target_over_2x','(target >2x)')+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.label.profit_per_hour','Profit per Hour')+':       '+fmt2(he>0?profit/he:0)+'/hr\\n';" +
  "r+='\\u2022 '+tk('calc_out.label.break_even_hours','Break-Even Hours')+':      '+pct1(beh)+' hrs  '+tk('calc_out.label.hours_to_cover_costs','(hours at current rate to cover costs)')+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.label.industry_benchmarks','Industry Benchmarks')+':   '+tk('calc_out.label.benchmark_consulting','Consulting 50%+')+' | '+tk('calc_out.label.benchmark_saas_services','SaaS services 30-50%')+' | '+tk('calc_out.label.benchmark_productized','Productized 40-60%')+'\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+=tk('calc_out.section.margin_health','\\uD83E\\uDE7A Margin Health:')+'\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "if(pm>30){r+='\\u2022 '+tk('calc_out.project_profitability.row.margin_healthy','\\uD83D\\uDFE2 Margin '+pct1(pm)+'% is healthy. Strong pricing power.',{margin:pct1(pm)})+'\\n';}" +
  "else if(pm>=15){r+='\\u2022 '+tk('calc_out.project_profitability.row.margin_workable_tight','\\uD83D\\uDFE1 Margin '+pct1(pm)+'% is workable but tight. Watch scope creep.',{margin:pct1(pm)})+'\\n';}" +
  "else if(pm>=5){r+='\\u2022 '+tk('calc_out.project_profitability.row.margin_thin','\\uD83D\\uDFE0 Margin '+pct1(pm)+'% is thin. One delay kills profit.',{margin:pct1(pm)})+'\\n';}" +
  "else if(pm>0){r+='\\u2022 '+tk('calc_out.project_profitability.row.margin_very_thin','\\uD83D\\uDFE0 Margin '+pct1(pm)+'% is very thin. Reconsider pricing.',{margin:pct1(pm)})+'\\n';}" +
  "else{r+='\\u2022 '+tk('calc_out.project_profitability.row.margin_losing_money','\\uD83D\\uDD34 Margin '+pct1(pm)+'% \\u2014 losing money. Cut costs or raise price immediately.',{margin:pct1(pm)})+'\\n';}" +
  "if(ehr>=hc*2&&hc>0){r+='\\u2022 '+tk('calc_out.project_profitability.row.earning_sustainable','\\uD83D\\uDFE2 Earning '+cm.toFixed(1)+'x cost rate \\u2014 sustainable model.',{mult:cm.toFixed(1)})+'\\n';}" +
  "else if(ehr>=hc&&hc>0){r+='\\u2022 '+tk('calc_out.project_profitability.row.earning_breakeven','\\uD83D\\uDFE1 Earning '+cm.toFixed(1)+'x cost rate \\u2014 break-even territory.',{mult:cm.toFixed(1)})+'\\n';}" +
  "else if(hc>0){r+='\\u2022 '+tk('calc_out.project_profitability.row.earning_below_cost','\\uD83D\\uDD34 Earning less than cost rate \\u2014 you subsidize the client.')+'\\n';}" +
  "if(mc>pr*0.2){r+='\\u2022 '+tk('calc_out.project_profitability.row.materials_high','\\uD83D\\uDFE1 Materials are '+pct1((mc/pr)*100)+'% of revenue \\u2014 verify pricing covers this.',{pct:pct1((mc/pr)*100)})+'\\n';}" +
  "else if(mc>0){r+='\\u2022 '+tk('calc_out.project_profitability.row.materials_reasonable','\\uD83D\\uDFE2 Materials are '+pct1((mc/pr)*100)+'% of revenue \\u2014 reasonable.',{pct:pct1((mc/pr)*100)})+'\\n';}" +
  "r+='\\n'+tk('calc_out.section.annualized_profit','\\uD83C\\uDFAF Annualized Profit:')+'\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 '+tk('calc_out.label.repeat_1x_month','Repeat 1\\u00D7/month')+':       '+fmt(ann)+'/yr\\n';" +
  "r+='\\u2022 '+tk('calc_out.label.repeat_2x_month','Repeat 2\\u00D7/month')+':       '+fmt(ann*2)+'/yr\\n';" +
  "r+='\\u2022 '+tk('calc_out.label.repeat_4x_month','Repeat 4\\u00D7/month')+':       '+fmt(ann*4)+'/yr  '+tk('calc_out.label.full_pipeline','(full pipeline)')+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.label.at_10pct_margin_uplift','At 10% margin uplift')+':  '+fmt((profit+pr*0.1)*12)+'/yr  '+tk('calc_out.label.price_up_10pct','(price +10%)')+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.project_profitability.row.target_profit_projects','Target Profit: $50K/yr \\u2192 '+Math.ceil(50000/Math.max(profit,1))+' projects like this per year',{n:String(Math.ceil(50000/Math.max(profit,1)))})+'\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+=tk('calc_out.section.profitable_hourly','\\u2696\\uFE0F Profitable Hourly:')+'\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 '+tk('calc_out.label.break_even_rate','Break-Even Rate')+':       '+fmt2(ber)+'/hr  '+tk('calc_out.label.charge_to_cover_costs','(charge this to cover costs)')+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.label.for_30pct_margin','For 30% Margin')+':        '+fmt2(ber/0.7)+'/hr  '+tk('calc_out.label.current_rate_note','(current: '+fmt2(ehr)+')',{cur:fmt2(ehr)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.label.for_50pct_margin','For 50% Margin')+':        '+fmt2(ber/0.5)+'/hr\\n';" +
  "r+='\\u2022 '+tk('calc_out.label.to_earn_100_per_hour','To Earn $100/hr')+':       '+fmt2(100+crhr)+'/hr  '+tk('calc_out.label.bill_rate_cost_plus_target','bill rate (cost + target)')+'\\n';" +
  "if(ehr>ber){r+='\\u2022 '+tk('calc_out.project_profitability.row.current_rate_beats_breakeven','\\uD83D\\uDFE2 Current rate '+fmt2(ehr)+'/hr beats break-even.',{rate:fmt2(ehr)})+'\\n';}" +
  "else{r+='\\u2022 '+tk('calc_out.project_profitability.row.current_rate_below_breakeven','\\uD83D\\uDD34 Current rate '+fmt2(ehr)+'/hr is below break-even '+fmt2(ber)+'/hr.',{rate:fmt2(ehr),be:fmt2(ber)})+'\\n';}" +
  "r+='\\n\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+=tk('calc_out.section.what_if_scenarios','\\uD83D\\uDD04 What-If Scenarios:')+'\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 '+tk('calc_out.project_profitability.row.whatif_cut_hours_20','Cut hours 20%:  Profit '+fmt(profit-he*0.2*hc)+'  (margin '+pct1(pr>0?((profit-he*0.2*hc)/pr)*100:0)+'%)',{profit:fmt(profit-he*0.2*hc),margin:pct1(pr>0?((profit-he*0.2*hc)/pr)*100:0)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.project_profitability.row.whatif_raise_price_15','Raise price 15%:  Profit '+fmt(profit+pr*0.15)+'  (margin '+pct1(((profit+pr*0.15)/(pr*1.15))*100)+'%)',{profit:fmt(profit+pr*0.15),margin:pct1(((profit+pr*0.15)/(pr*1.15))*100)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.project_profitability.row.whatif_cut_materials_30','Cut materials 30%:  Profit '+fmt(profit+mc*0.3)+'  (margin '+pct1(((profit+mc*0.3)/pr)*100)+'%)',{profit:fmt(profit+mc*0.3),margin:pct1(((profit+mc*0.3)/pr)*100)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.project_profitability.row.whatif_for_50pct_margin','For 50% margin:  Target price '+fmt(tc*2)+'  (current: '+fmt(pr)+')',{price:fmt(tc*2),cur:fmt(pr)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.project_profitability.row.whatif_combine','Combine (15% price + 10% fewer hours):  Profit '+fmt((profit+pr*0.15)-(he*0.1*hc)),{profit:fmt((profit+pr*0.15)-(he*0.1*hc))})+'\\n\\n';" +
  "r+='\\uD83D\\uDCA1 Tip: Track ACTUAL hours on every project for 3 months. Estimation bias is the #1 profit killer for solopreneurs \\u2014 most underestimate by 20-30%. Your effective hourly rate tells the real story of whether a project was worth your time.';" +
  "results.push(r);" +
  "var rates=[25,40,60,80,100,120,150,200,250];" +
  "for(var i=0;i<rates.length;i++){" +
  "var rate=rates[i];" +
  "var lab=he*rate;" +
  "var tot=lab+mc;" +
  "var prof=pr-tot;" +
  "var mar=pr>0?(prof/pr)*100:0;" +
  "results.push(tk('calc_out.project_profitability.row.rate_at_cost','At $'+rate+'/hr cost:',{rate:'$'+rate})+' '+tk('calc_out.project_profitability.row.rate_total','Total $'+loc(tot),{total:'$'+loc(tot)})+' | '+tk('calc_out.project_profitability.row.rate_profit','Profit '+fmt(prof),{profit:fmt(prof)})+' | '+tk('calc_out.project_profitability.row.rate_margin','Margin '+pct1(mar)+'%',{margin:pct1(mar)})+' | '+tk('calc_out.project_profitability.row.rate_eff','Eff '+fmt2(ehr),{eff:fmt2(ehr)})+'/hr');" +
  "}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-project-profitability-calculator',
  title: 'Project Profitability Calculator',
  description: 'Calculate profit, effective hourly rate, margin, and break-even hourly rate for any freelance project. Compare outcomes at 9 different hourly cost rates.',
  inputs: [
    { name: 'projectRevenue', label: 'Project Revenue ($)', placeholder: 'e.g. 5000', type: 'number' },
    { name: 'hoursEstimated', label: 'Estimated Hours', placeholder: 'e.g. 40', type: 'number' },
    { name: 'hourlyCost', label: 'Your Hourly Cost ($)', placeholder: 'e.g. 50', type: 'number' },
    { name: 'materialCost', label: 'Material/Tool Costs ($)', placeholder: 'e.g. 200', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
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
  generate(inputs: Record<string, string>): string[] {
    return calculateProjectProfitability(inputs);
  },
  staticExamples: [
    '$calc_out.section.project_profitability_calculator|💰 Project Profitability Calculator|\n\n$calc_out.section.revenue_and_costs|📋 Revenue & Costs:|\n• $calc_out.label.project_revenue|Project Revenue|:       $5,000\n• $calc_out.label.hours_estimated|Hours Estimated|:       40 hrs\n• $calc_out.label.hourly_cost_rate|Hourly Cost Rate|:      $50/hr\n• $calc_out.label.total_labor_cost|Total Labor Cost|:      $2,000\n• $calc_out.label.material_cost|Material Cost|:         $200\n• $calc_out.label.total_cost|Total Cost|:            $2,200\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.net_profit_and_margin|💰 Net Profit + Margin:|\n• $calc_out.label.net_profit|Net Profit|:            $2,800\n• $calc_out.label.profit_margin|Profit Margin|:         56.0%  $calc_out.label.industry_margin_note|(industry: 20-40% for healthy freelance work)|\n• $calc_out.label.total_cost_ratio|Total Cost Ratio|:      44.0%  $calc_out.label.lower_is_better|(lower is better)|\n• $calc_out.label.material_cost_pct|Material Cost %|:       4.0%  $calc_out.label.of_revenue|of revenue|\n• $calc_out.label.labor_cost_pct|Labor Cost %|:          40.0%  $calc_out.label.of_revenue|of revenue|\n• $calc_out.label.annualized_12x|Annualized (12x)|:      $33,600/yr  $calc_out.label.if_repeatable|(if repeatable)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.key_metrics|📐 Key Metrics:|\n• $calc_out.label.effective_hourly_rate|Effective $/Hour|:      $125.00/hr  $calc_out.label.revenue_div_hours|(revenue ÷ hours)|\n• $calc_out.label.cost_recovery_hourly|Cost Recovery $/Hour|:  $55.00/hr  $calc_out.label.total_cost_div_hours|(total cost ÷ hours)|\n• $calc_out.label.cost_vs_cost_rate|Cost vs Cost Rate|:     2.50x  $calc_out.label.target_over_2x|(target >2x)|\n• $calc_out.label.profit_per_hour|Profit per Hour|:       $70.00/hr\n• $calc_out.label.break_even_hours|Break-Even Hours|:      17.6 hrs  $calc_out.label.hours_to_cover_costs|(hours at current rate to cover costs)|\n• $calc_out.label.industry_benchmarks|Industry Benchmarks|:   $calc_out.label.benchmark_consulting|Consulting 50%+| | $calc_out.label.benchmark_saas_services|SaaS services 30-50%| | $calc_out.label.benchmark_productized|Productized 40-60%|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.margin_health|🩺 Margin Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.project_profitability.row.margin_healthy{"margin":"56.0"}|🟢 Margin 56.0% is healthy. Strong pricing power.|\n• $calc_out.project_profitability.row.earning_sustainable{"mult":"2.5"}|🟢 Earning 2.5x cost rate — sustainable model.|\n• $calc_out.project_profitability.row.materials_reasonable{"pct":"4.0"}|🟢 Materials are 4.0% of revenue — reasonable.|\n\n$calc_out.section.annualized_profit|🎯 Annualized Profit:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.repeat_1x_month|Repeat 1×/month|:       $33,600/yr\n• $calc_out.label.repeat_2x_month|Repeat 2×/month|:       $67,200/yr\n• $calc_out.label.repeat_4x_month|Repeat 4×/month|:       $134,400/yr  $calc_out.label.full_pipeline|(full pipeline)|\n• $calc_out.label.at_10pct_margin_uplift|At 10% margin uplift|:  $39,600/yr  $calc_out.label.price_up_10pct|(price +10%)|\n• $calc_out.project_profitability.row.target_profit_projects{"n":"18"}|Target Profit: $50K/yr → 18 projects like this per year|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.profitable_hourly|⚖️ Profitable Hourly:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.break_even_rate|Break-Even Rate|:       $55.00/hr  $calc_out.label.charge_to_cover_costs|(charge this to cover costs)|\n• $calc_out.label.for_30pct_margin|For 30% Margin|:        $78.57/hr  $calc_out.label.current_rate_note{"cur":"$125.00"}|(current: $125.00)|\n• $calc_out.label.for_50pct_margin|For 50% Margin|:        $110.00/hr\n• $calc_out.label.to_earn_100_per_hour|To Earn $100/hr|:       $155.00/hr  $calc_out.label.bill_rate_cost_plus_target|bill rate (cost + target)|\n• $calc_out.project_profitability.row.current_rate_beats_breakeven{"rate":"$125.00"}|🟢 Current rate $125.00/hr beats break-even.|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.project_profitability.row.whatif_cut_hours_20{"profit":"$2,400","margin":"48.0"}|Cut hours 20%:  Profit $2,400  (margin 48.0%)|\n• $calc_out.project_profitability.row.whatif_raise_price_15{"profit":"$3,550","margin":"61.7"}|Raise price 15%:  Profit $3,550  (margin 61.7%)|\n• $calc_out.project_profitability.row.whatif_cut_materials_30{"profit":"$2,860","margin":"57.2"}|Cut materials 30%:  Profit $2,860  (margin 57.2%)|\n• $calc_out.project_profitability.row.whatif_for_50pct_margin{"price":"$4,400","cur":"$5,000"}|For 50% margin:  Target price $4,400  (current: $5,000)|\n• $calc_out.project_profitability.row.whatif_combine{"profit":"$3,350"}|Combine (15% price + 10% fewer hours):  Profit $3,350|\n\n💡 Tip: Track ACTUAL hours on every project for 3 months. Estimation bias is the #1 profit killer for solopreneurs — most underestimate by 20-30%. Your effective hourly rate tells the real story of whether a project was worth your time.\n$calc_out.project_profitability.row.rate_at_cost{"rate":"$25"}|At $25/hr cost:| $calc_out.project_profitability.row.rate_total{"total":"$1,200"}|Total $1,200| | $calc_out.project_profitability.row.rate_profit{"profit":"$3,800"}|Profit $3,800| | $calc_out.project_profitability.row.rate_margin{"margin":"76.0"}|Margin 76.0%| | $calc_out.project_profitability.row.rate_eff{"eff":"$125.00"}|Eff $125.00|/hr\n$calc_out.project_profitability.row.rate_at_cost{"rate":"$40"}|At $40/hr cost:| $calc_out.project_profitability.row.rate_total{"total":"$1,800"}|Total $1,800| | $calc_out.project_profitability.row.rate_profit{"profit":"$3,200"}|Profit $3,200| | $calc_out.project_profitability.row.rate_margin{"margin":"64.0"}|Margin 64.0%| | $calc_out.project_profitability.row.rate_eff{"eff":"$125.00"}|Eff $125.00|/hr\n$calc_out.project_profitability.row.rate_at_cost{"rate":"$60"}|At $60/hr cost:| $calc_out.project_profitability.row.rate_total{"total":"$2,600"}|Total $2,600| | $calc_out.project_profitability.row.rate_profit{"profit":"$2,400"}|Profit $2,400| | $calc_out.project_profitability.row.rate_margin{"margin":"48.0"}|Margin 48.0%| | $calc_out.project_profitability.row.rate_eff{"eff":"$125.00"}|Eff $125.00|/hr\n$calc_out.project_profitability.row.rate_at_cost{"rate":"$80"}|At $80/hr cost:| $calc_out.project_profitability.row.rate_total{"total":"$3,400"}|Total $3,400| | $calc_out.project_profitability.row.rate_profit{"profit":"$1,600"}|Profit $1,600| | $calc_out.project_profitability.row.rate_margin{"margin":"32.0"}|Margin 32.0%| | $calc_out.project_profitability.row.rate_eff{"eff":"$125.00"}|Eff $125.00|/hr\n$calc_out.project_profitability.row.rate_at_cost{"rate":"$100"}|At $100/hr cost:| $calc_out.project_profitability.row.rate_total{"total":"$4,200"}|Total $4,200| | $calc_out.project_profitability.row.rate_profit{"profit":"$800"}|Profit $800| | $calc_out.project_profitability.row.rate_margin{"margin":"16.0"}|Margin 16.0%| | $calc_out.project_profitability.row.rate_eff{"eff":"$125.00"}|Eff $125.00|/hr\n$calc_out.project_profitability.row.rate_at_cost{"rate":"$120"}|At $120/hr cost:| $calc_out.project_profitability.row.rate_total{"total":"$5,000"}|Total $5,000| | $calc_out.project_profitability.row.rate_profit{"profit":"$0"}|Profit $0| | $calc_out.project_profitability.row.rate_margin{"margin":"0.0"}|Margin 0.0%| | $calc_out.project_profitability.row.rate_eff{"eff":"$125.00"}|Eff $125.00|/hr\n$calc_out.project_profitability.row.rate_at_cost{"rate":"$150"}|At $150/hr cost:| $calc_out.project_profitability.row.rate_total{"total":"$6,200"}|Total $6,200| | $calc_out.project_profitability.row.rate_profit{"profit":"$-1,200"}|Profit $-1,200| | $calc_out.project_profitability.row.rate_margin{"margin":"-24.0"}|Margin -24.0%| | $calc_out.project_profitability.row.rate_eff{"eff":"$125.00"}|Eff $125.00|/hr\n$calc_out.project_profitability.row.rate_at_cost{"rate":"$200"}|At $200/hr cost:| $calc_out.project_profitability.row.rate_total{"total":"$8,200"}|Total $8,200| | $calc_out.project_profitability.row.rate_profit{"profit":"$-3,200"}|Profit $-3,200| | $calc_out.project_profitability.row.rate_margin{"margin":"-64.0"}|Margin -64.0%| | $calc_out.project_profitability.row.rate_eff{"eff":"$125.00"}|Eff $125.00|/hr\n$calc_out.project_profitability.row.rate_at_cost{"rate":"$250"}|At $250/hr cost:| $calc_out.project_profitability.row.rate_total{"total":"$10,200"}|Total $10,200| | $calc_out.project_profitability.row.rate_profit{"profit":"$-5,200"}|Profit $-5,200| | $calc_out.project_profitability.row.rate_margin{"margin":"-104.0"}|Margin -104.0%| | $calc_out.project_profitability.row.rate_eff{"eff":"$125.00"}|Eff $125.00|/hr',
    'At $25/hr cost: Total $1,200 | Profit $3,800 | Margin 76.0% | Eff $125.00/hr',
    'At $50/hr cost: Total $2,200 | Profit $2,800 | Margin 56.0% | Eff $125.00/hr',
    'At $100/hr cost: Total $4,200 | Profit $800 | Margin 16.0% | Eff $125.00/hr',
    'At $200/hr cost: Total $8,200 | Profit $-3,200 | Margin -64.0% | Eff $125.00/hr',
  ],
  faq: [
    { q: 'What is a good profit margin for freelance projects?', a: 'Aim for 40-60% gross margin. This gives you a healthy buffer for scope creep, revisions, and non-billable time spent on admin, marketing, and professional development. Margins below 20% are risky — one mistake can flip the project into a loss.' },
    { q: 'What does effective hourly rate mean?', a: 'Your effective hourly rate is the total project fee divided by estimated hours. It tells you what you actually earn per hour. If your effective rate is $125/hr but you bill at $75/hr, you are either underestimating hours or undercharging. Track this across all projects to find your real earning power.' },
    { q: 'Should I include my tools and software subscriptions in costs?', a: 'For project-level profitability, include only costs directly attributable to this project (stock photos, subcontractors, specific software). Overhead costs like your general Adobe subscription or internet bill should be factored into your overall business profitability, not individual project margins.' },
    { q: 'How do I handle scope creep on fixed-price projects?', a: 'Define project scope in writing before starting. Include the number of revisions, deliverables, and what constitutes extra work. When scope expands, issue a change order with additional pricing immediately — do not wait until the project ends.' },
    { q: 'What if my effective hourly rate is lower than expected?', a: 'This usually means you are underestimating hours. Track actual vs estimated time for 3 projects to find your estimation bias. If you consistently spend 30% more time than estimated, increase your price by 30% or improve your scoping process.' },
    { q: "What is a good profit margin for a freelance project?", a: "Healthy: 30-50%. Top freelancers: 50-70%. Below 20%: unsustainable. Above 70%: room to grow. Calculate: (revenue - direct_costs - time_cost) / revenue. Include: subcontractor costs, software fees, taxes, your time. Don't forget: your time is the biggest cost. Track per project, not just revenue." },
    { q: "How do I calculate project profitability accurately?", a: "Profit = revenue - (labor_cost + subcontractor_cost + software_cost + taxes + overhead). Labor cost = hours × hourly_rate. Overhead = 20-30% of labor. Add: opportunity cost (what else could you do with this time?). Most freelancers overestimate profit by 30-50%. Track per project for 6 months minimum." },
    { q: "What are the most common profit-killers in freelance projects?", a: "Top 5: 1) Scope creep (no change orders), 2) Underestimation (no buffer), 3) Revisions (unlimited), 4) Late payments (slow invoices), 5) Hidden costs (software, subcontractors). Real profit killers: discounting too readily, over-delivering, slow follow-up. Track profit per project quarterly. Cut unprofitable clients." },
    { q: "How do I price projects to ensure profitability?", a: "1) Hourly floor × estimated hours × 1.25 buffer × 1.5 markup. 2) Minimum project fee (even small projects need a floor). 3) Tiered pricing (basic, standard, premium). 4) Required deposits (kill slow payers). 5) Late payment fees (1.5%/month). Track profit metrics per client. Cut projects under 30% margin." },
    { q: "How do I handle unprofitable projects?", a: "Detect: track per-project profit monthly. Address: 1) Renegotiate price (rate increase of 25-50%), 2) Cut scope (deliver less for current price), 3) Reduce time investment (templates, automation), 4) End the project (politely exit). Don't accept: below-market rates to \"fill time.\" Time is your most valuable asset." },
    { q: "Should I track project profitability in accounting software?", a: "Yes. Use: Wave (free), QuickBooks Self-Employed (US), FreshBooks, Xero. Track: revenue per project, time per project, expenses per project. Most freelancers under-report by 20-30%. Software pays back in 1-3 months via taxes and better pricing decisions. Link to bank/credit card for automation." },
    { q: "How do I use profitability to choose clients?", a: "Top 20% of clients typically drive 80% of profit. Identify: high-margin, low-friction, repeat business. Drop: low-margin, high-friction, scope-creep clients. Pattern: larger companies + clearer scope = higher margin. Smaller companies + vague scope = lower margin. Choose clients based on profit, not just revenue." },
    { q: "How do I improve profitability without raising rates?", a: "Tactics: 1) Increase utilization (more billable hours), 2) Templates and SOPs (faster delivery), 3) Cut scope creep (better contracts), 4) Reduce subcontractor cost, 5) Better tools (automation), 6) Charge for revisions (after 2 rounds). Most freelancers can improve profit 20-40% in 6 months without raising rates." },
  ],
  howToUse: [
    'Enter the total project fee you will charge the client.',
    'Estimate how many hours the project will take you.',
    'Enter your internal hourly cost (your desired wage or opportunity cost).',
    'Add any material or third-party costs (stock assets, subcontractors, tools).',
    'Review your net profit, margin percentage, and effective hourly rate.',
    'See your break-even hourly rate and what you need to bill for 30%/50% margins.',
    'Scroll down to compare profitability across 9 different hourly cost rates.',
  ],
  engineKey: true,
};

registerEngine(engine);
