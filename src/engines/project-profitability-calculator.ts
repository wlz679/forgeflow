import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculateProjectProfitability(inputs: Record<string, string>): string[] {
  const projectRevenue = parseFloat(inputs.projectRevenue) || 0;
  const hoursEstimated = parseFloat(inputs.hoursEstimated) || 0;
  const hourlyCost = parseFloat(inputs.hourlyCost) || 0;
  const materialCost = parseFloat(inputs.materialCost) || 0;
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
    '💰 Project Profitability Calculator\n\n' +
    '📋 Revenue & Costs:\n' +
    '• Project Revenue:       ' + fmt(projectRevenue) + '\n' +
    '• Hours Estimated:       ' + loc(hoursEstimated) + ' hrs\n' +
    '• Hourly Cost Rate:      ' + fmt(hourlyCost) + '/hr\n' +
    '• Total Labor Cost:      ' + fmt(totalLaborCost) + '\n' +
    '• Material Cost:         ' + fmt(materialCost) + '\n' +
    '• Total Cost:            ' + fmt(totalCost) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💰 Net Profit + Margin:\n' +
    '• Net Profit:            ' + fmt(profit) + (profit < 0 ? '  (LOSS)' : '') + '\n' +
    '• Profit Margin:         ' + pct1(profitMargin) + '%  (industry: 20-40% for healthy freelance work)\n' +
    '• Total Cost Ratio:      ' + pct1(projectRevenue > 0 ? (totalCost / projectRevenue) * 100 : 0) + '%  (lower is better)\n' +
    '• Material Cost %:       ' + pct1(projectRevenue > 0 ? (materialCost / projectRevenue) * 100 : 0) + '%  of revenue\n' +
    '• Labor Cost %:          ' + pct1(projectRevenue > 0 ? (totalLaborCost / projectRevenue) * 100 : 0) + '%  of revenue\n' +
    '• Annualized (12x):      ' + fmt(annualizedProfit) + '/yr  (if repeatable)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Key Metrics:\n' +
    '• Effective $/Hour:      ' + fmt2(effectiveHourly) + '/hr  (revenue ÷ hours)\n' +
    '• Cost Recovery $/Hour:  ' + fmt2(costRecoveryHourly) + '/hr  (total cost ÷ hours)\n' +
    '• Cost vs Cost Rate:     ' + (costMultiplier > 0 ? costMultiplier.toFixed(2) + 'x' : 'N/A') + '  (target >2x)\n' +
    '• Profit per Hour:       ' + fmt2(hoursEstimated > 0 ? profit / hoursEstimated : 0) + '/hr\n' +
    '• Break-Even Hours:      ' + pct1(breakevenHours) + ' hrs  (hours at current rate to cover costs)\n' +
    '• Industry Benchmarks:   Consulting 50%+ | SaaS services 30-50% | Productized 40-60%\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Margin Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (profitMargin > 30
      ? '• 🟢 Margin ' + pct1(profitMargin) + '% is healthy. Strong pricing power.\n'
      : profitMargin >= 15
      ? '• 🟡 Margin ' + pct1(profitMargin) + '% is workable but tight. Watch scope creep.\n'
      : profitMargin >= 5
      ? '• 🟠 Margin ' + pct1(profitMargin) + '% is thin. One delay kills profit.\n'
      : profitMargin > 0
      ? '• 🟠 Margin ' + pct1(profitMargin) + '% is very thin. Reconsider pricing.\n'
      : '• 🔴 Margin ' + pct1(profitMargin) + '% — losing money. Cut costs or raise price immediately.\n') +
    (effectiveHourly >= hourlyCost * 2 && hourlyCost > 0
      ? '• 🟢 Earning ' + costMultiplier.toFixed(1) + 'x cost rate — sustainable model.\n'
      : effectiveHourly >= hourlyCost && hourlyCost > 0
      ? '• 🟡 Earning ' + costMultiplier.toFixed(1) + 'x cost rate — break-even territory.\n'
      : hourlyCost > 0
      ? '• 🔴 Earning less than cost rate — you subsidize the client.\n'
      : '') +
    (materialCost > projectRevenue * 0.2
      ? '• 🟡 Materials are ' + pct1((materialCost / projectRevenue) * 100) + '% of revenue — verify pricing covers this.\n'
      : materialCost > 0
      ? '• 🟢 Materials are ' + pct1((materialCost / projectRevenue) * 100) + '% of revenue — reasonable.\n'
      : '') +
    '\n🎯 Annualized Profit:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Repeat 1×/month:       ' + fmt(annualizedProfit) + '/yr\n' +
    '• Repeat 2×/month:       ' + fmt(annualizedProfit * 2) + '/yr\n' +
    '• Repeat 4×/month:       ' + fmt(annualizedProfit * 4) + '/yr  (full pipeline)\n' +
    '• At 10% margin uplift:  ' + fmt((profit + projectRevenue * 0.1) * 12) + '/yr  (price +10%)\n' +
    '• Target Profit: $50K/yr → ' + Math.ceil(50000 / Math.max(profit, 1)) + ' projects like this per year\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Profitable Hourly:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Break-Even Rate:       ' + fmt2(breakevenRate) + '/hr  (charge this to cover costs)\n' +
    '• For 30% Margin:        ' + fmt2(breakevenRate / 0.7) + '/hr  (current: ' + fmt2(effectiveHourly) + ')\n' +
    '• For 50% Margin:        ' + fmt2(breakevenRate / 0.5) + '/hr\n' +
    '• To Earn $100/hr:       ' + fmt2(100 + costRecoveryHourly) + '/hr  bill rate (cost + target)\n' +
    (effectiveHourly > breakevenRate
      ? '• 🟢 Current rate ' + fmt2(effectiveHourly) + '/hr beats break-even.\n'
      : '• 🔴 Current rate ' + fmt2(effectiveHourly) + '/hr is below break-even ' + fmt2(breakevenRate) + '/hr.\n') +
    '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Cut hours 20%:  Profit ' + fmt(profit - hoursEstimated * 0.2 * hourlyCost) + '  (margin ' + pct1(projectRevenue > 0 ? ((profit - hoursEstimated * 0.2 * hourlyCost) / projectRevenue) * 100 : 0) + '%)\n' +
    '• Raise price 15%:  Profit ' + fmt(profit + projectRevenue * 0.15) + '  (margin ' + pct1(((profit + projectRevenue * 0.15) / (projectRevenue * 1.15)) * 100) + '%)\n' +
    '• Cut materials 30%:  Profit ' + fmt(profit + materialCost * 0.3) + '  (margin ' + pct1(((profit + materialCost * 0.3) / projectRevenue) * 100) + '%)\n' +
    '• For 50% margin:  Target price ' + fmt(totalCost * 2) + '  (current: ' + fmt(projectRevenue) + ')\n' +
    '• Combine (15% price + 10% fewer hours):  Profit ' + fmt((profit + projectRevenue * 0.15) - (hoursEstimated * 0.1 * hourlyCost)) + '\n\n' +
    '💡 Tip: Track ACTUAL hours on every project for 3 months. Estimation bias is the #1 profit killer for solopreneurs — most underestimate by 20-30%. Your effective hourly rate tells the real story of whether a project was worth your time.',
  );

  const rates = [25, 40, 60, 80, 100, 120, 150, 200, 250];
  for (let i = 0; i < rates.length; i++) {
    const r = rates[i];
    const labor = hoursEstimated * r;
    const total = labor + materialCost;
    const prof = projectRevenue - total;
    const margin = projectRevenue > 0 ? (prof / projectRevenue) * 100 : 0;
    results.push(
      'At $' + r + '/hr cost: Total $' + loc(total) + ' | Profit ' + fmt(prof) + ' | Margin ' + pct1(margin) + '% | Eff ' + fmt2(effectiveHourly) + '/hr',
    );
  }

  return results;
}

const customFn =
  "var pr=parseFloat(inputs.projectRevenue)||0;" +
  "var he=parseFloat(inputs.hoursEstimated)||0;" +
  "var hc=parseFloat(inputs.hourlyCost)||0;" +
  "var mc=parseFloat(inputs.materialCost)||0;" +
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
  "r+='\\uD83D\\uDCB0 Project Profitability Calculator\\n\\n';" +
  "r+='\\uD83D\\uDCCB Revenue & Costs:\\n';" +
  "r+='\\u2022 Project Revenue:       '+fmt(pr)+'\\n';" +
  "r+='\\u2022 Hours Estimated:       '+loc(he)+' hrs\\n';" +
  "r+='\\u2022 Hourly Cost Rate:      '+fmt(hc)+'/hr\\n';" +
  "r+='\\u2022 Total Labor Cost:      '+fmt(tlc)+'\\n';" +
  "r+='\\u2022 Material Cost:         '+fmt(mc)+'\\n';" +
  "r+='\\u2022 Total Cost:            '+fmt(tc)+'\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDCB0 Net Profit + Margin:\\n';" +
  "r+='\\u2022 Net Profit:            '+fmt(profit)+(profit<0?'  (LOSS)':'')+'\\n';" +
  "r+='\\u2022 Profit Margin:         '+pct1(pm)+'%  (industry: 20-40% for healthy freelance work)\\n';" +
  "r+='\\u2022 Total Cost Ratio:      '+pct1(pr>0?(tc/pr)*100:0)+'%  (lower is better)\\n';" +
  "r+='\\u2022 Material Cost %:       '+pct1(pr>0?(mc/pr)*100:0)+'%  of revenue\\n';" +
  "r+='\\u2022 Labor Cost %:          '+pct1(pr>0?(tlc/pr)*100:0)+'%  of revenue\\n';" +
  "r+='\\u2022 Annualized (12x):      '+fmt(ann)+'/yr  (if repeatable)\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDCD0 Key Metrics:\\n';" +
  "r+='\\u2022 Effective $/Hour:      '+fmt2(ehr)+'/hr  (revenue \\u00F7 hours)\\n';" +
  "r+='\\u2022 Cost Recovery $/Hour:  '+fmt2(crhr)+'/hr  (total cost \\u00F7 hours)\\n';" +
  "r+='\\u2022 Cost vs Cost Rate:     '+(cm>0?cm.toFixed(2)+'x':'N/A')+'  (target >2x)\\n';" +
  "r+='\\u2022 Profit per Hour:       '+fmt2(he>0?profit/he:0)+'/hr\\n';" +
  "r+='\\u2022 Break-Even Hours:      '+pct1(beh)+' hrs  (hours at current rate to cover costs)\\n';" +
  "r+='\\u2022 Industry Benchmarks:   Consulting 50%+ | SaaS services 30-50% | Productized 40-60%\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83E\\uDE7A Margin Health:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "if(pm>30){r+='\\u2022 \\uD83D\\uDFE2 Margin '+pct1(pm)+'% is healthy. Strong pricing power.\\n';}" +
  "else if(pm>=15){r+='\\u2022 \\uD83D\\uDFE1 Margin '+pct1(pm)+'% is workable but tight. Watch scope creep.\\n';}" +
  "else if(pm>=5){r+='\\u2022 \\uD83D\\uDFE0 Margin '+pct1(pm)+'% is thin. One delay kills profit.\\n';}" +
  "else if(pm>0){r+='\\u2022 \\uD83D\\uDFE0 Margin '+pct1(pm)+'% is very thin. Reconsider pricing.\\n';}" +
  "else{r+='\\u2022 \\uD83D\\uDD34 Margin '+pct1(pm)+'% \\u2014 losing money. Cut costs or raise price immediately.\\n';}" +
  "if(ehr>=hc*2&&hc>0){r+='\\u2022 \\uD83D\\uDFE2 Earning '+cm.toFixed(1)+'x cost rate \\u2014 sustainable model.\\n';}" +
  "else if(ehr>=hc&&hc>0){r+='\\u2022 \\uD83D\\uDFE1 Earning '+cm.toFixed(1)+'x cost rate \\u2014 break-even territory.\\n';}" +
  "else if(hc>0){r+='\\u2022 \\uD83D\\uDD34 Earning less than cost rate \\u2014 you subsidize the client.\\n';}" +
  "if(mc>pr*0.2){r+='\\u2022 \\uD83D\\uDFE1 Materials are '+pct1((mc/pr)*100)+'% of revenue \\u2014 verify pricing covers this.\\n';}" +
  "else if(mc>0){r+='\\u2022 \\uD83D\\uDFE2 Materials are '+pct1((mc/pr)*100)+'% of revenue \\u2014 reasonable.\\n';}" +
  "r+='\\n\\uD83C\\uDFAF Annualized Profit:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Repeat 1\\u00D7/month:       '+fmt(ann)+'/yr\\n';" +
  "r+='\\u2022 Repeat 2\\u00D7/month:       '+fmt(ann*2)+'/yr\\n';" +
  "r+='\\u2022 Repeat 4\\u00D7/month:       '+fmt(ann*4)+'/yr  (full pipeline)\\n';" +
  "r+='\\u2022 At 10% margin uplift:  '+fmt((profit+pr*0.1)*12)+'/yr  (price +10%)\\n';" +
  "r+='\\u2022 Target Profit: $50K/yr \\u2192 '+Math.ceil(50000/Math.max(profit,1))+' projects like this per year\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\u2696\\uFE0F Profitable Hourly:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Break-Even Rate:       '+fmt2(ber)+'/hr  (charge this to cover costs)\\n';" +
  "r+='\\u2022 For 30% Margin:        '+fmt2(ber/0.7)+'/hr  (current: '+fmt2(ehr)+')\\n';" +
  "r+='\\u2022 For 50% Margin:        '+fmt2(ber/0.5)+'/hr\\n';" +
  "r+='\\u2022 To Earn $100/hr:       '+fmt2(100+crhr)+'/hr  bill rate (cost + target)\\n';" +
  "if(ehr>ber){r+='\\u2022 \\uD83D\\uDFE2 Current rate '+fmt2(ehr)+'/hr beats break-even.\\n';}" +
  "else{r+='\\u2022 \\uD83D\\uDD34 Current rate '+fmt2(ehr)+'/hr is below break-even '+fmt2(ber)+'/hr.\\n';}" +
  "r+='\\n\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDD04 What-If Scenarios:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Cut hours 20%:  Profit '+fmt(profit-he*0.2*hc)+'  (margin '+pct1(pr>0?((profit-he*0.2*hc)/pr)*100:0)+'%)\\n';" +
  "r+='\\u2022 Raise price 15%:  Profit '+fmt(profit+pr*0.15)+'  (margin '+pct1(((profit+pr*0.15)/(pr*1.15))*100)+'%)\\n';" +
  "r+='\\u2022 Cut materials 30%:  Profit '+fmt(profit+mc*0.3)+'  (margin '+pct1(((profit+mc*0.3)/pr)*100)+'%)\\n';" +
  "r+='\\u2022 For 50% margin:  Target price '+fmt(tc*2)+'  (current: '+fmt(pr)+')\\n';" +
  "r+='\\u2022 Combine (15% price + 10% fewer hours):  Profit '+fmt((profit+pr*0.15)-(he*0.1*hc))+'\\n\\n';" +
  "r+='\\uD83D\\uDCA1 Tip: Track ACTUAL hours on every project for 3 months. Estimation bias is the #1 profit killer for solopreneurs \\u2014 most underestimate by 20-30%. Your effective hourly rate tells the real story of whether a project was worth your time.';" +
  "results.push(r);" +
  "var rates=[25,40,60,80,100,120,150,200,250];" +
  "for(var i=0;i<rates.length;i++){" +
  "var rate=rates[i];" +
  "var lab=he*rate;" +
  "var tot=lab+mc;" +
  "var prof=pr-tot;" +
  "var mar=pr>0?(prof/pr)*100:0;" +
  "results.push('At $'+rate+'/hr cost: Total $'+loc(tot)+' | Profit '+fmt(prof)+' | Margin '+pct1(mar)+'% | Eff '+fmt2(ehr)+'/hr');" +
  "}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-project-profitability-calculator',
  title: 'Project Profitability Calculator',
  description: 'Calculate profit, effective hourly rate, margin, and break-even hourly rate for any freelance project. Compare outcomes at 9 different hourly cost rates.',
  category: 'C',
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
  generate(inputs: Record<string, string>): string[] {
    return calculateProjectProfitability(inputs);
  },
  staticExamples: [
    '💰 Project Profitability Calculator\n\n📋 Revenue & Costs:\n• Project Revenue:       $5,000\n• Hours Estimated:       40 hrs\n• Hourly Cost Rate:      $50/hr\n• Total Labor Cost:      $2,000\n• Material Cost:         $200\n• Total Cost:            $2,200\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💰 Net Profit + Margin:\n• Net Profit:            $2,800\n• Profit Margin:         56.0%  (industry: 20-40% for healthy freelance work)\n• Total Cost Ratio:      44.0%  (lower is better)\n• Material Cost %:       4.0%  of revenue\n• Labor Cost %:          40.0%  of revenue\n• Annualized (12x):      $33,600/yr  (if repeatable)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Key Metrics:\n• Effective $/Hour:      $125.00/hr  (revenue ÷ hours)\n• Cost Recovery $/Hour:  $55.00/hr  (total cost ÷ hours)\n• Cost vs Cost Rate:     2.50x  (target >2x)\n• Profit per Hour:       $70.00/hr\n• Break-Even Hours:      17.6 hrs  (hours at current rate to cover costs)\n• Industry Benchmarks:   Consulting 50%+ | SaaS services 30-50% | Productized 40-60%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Margin Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 Margin 56.0% is healthy. Strong pricing power.\n• 🟢 Earning 2.5x cost rate — sustainable model.\n• 🟢 Materials are 4.0% of revenue — reasonable.\n\n🎯 Annualized Profit:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Repeat 1×/month:       $33,600/yr\n• Repeat 2×/month:       $67,200/yr\n• Repeat 4×/month:       $134,400/yr  (full pipeline)\n• At 10% margin uplift:  $39,600/yr  (price +10%)\n• Target Profit: $50K/yr → 18 projects like this per year\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Profitable Hourly:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Break-Even Rate:       $55.00/hr  (charge this to cover costs)\n• For 30% Margin:        $78.57/hr  (current: $125.00)\n• For 50% Margin:        $110.00/hr\n• To Earn $100/hr:       $155.00/hr  bill rate (cost + target)\n• 🟢 Current rate $125.00/hr beats break-even.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Cut hours 20%:  Profit $2,400  (margin 48.0%)\n• Raise price 15%:  Profit $3,550  (margin 61.7%)\n• Cut materials 30%:  Profit $2,860  (margin 57.2%)\n• For 50% margin:  Target price $4,400  (current: $5,000)\n• Combine (15% price + 10% fewer hours):  Profit $3,350\n\n💡 Tip: Track ACTUAL hours on every project for 3 months. Estimation bias is the #1 profit killer for solopreneurs — most underestimate by 20-30%. Your effective hourly rate tells the real story of whether a project was worth your time.\nAt $25/hr cost: Total $1,200 | Profit $3,800 | Margin 76.0% | Eff $125.00/hr\nAt $40/hr cost: Total $1,800 | Profit $3,200 | Margin 64.0% | Eff $125.00/hr\nAt $60/hr cost: Total $2,600 | Profit $2,400 | Margin 48.0% | Eff $125.00/hr\nAt $80/hr cost: Total $3,400 | Profit $1,600 | Margin 32.0% | Eff $125.00/hr\nAt $100/hr cost: Total $4,200 | Profit $800 | Margin 16.0% | Eff $125.00/hr\nAt $120/hr cost: Total $5,000 | Profit $0 | Margin 0.0% | Eff $125.00/hr\nAt $150/hr cost: Total $6,200 | Profit $-1,200 | Margin -24.0% | Eff $125.00/hr\nAt $200/hr cost: Total $8,200 | Profit $-3,200 | Margin -64.0% | Eff $125.00/hr\nAt $250/hr cost: Total $10,200 | Profit $-5,200 | Margin -104.0% | Eff $125.00/hr',
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
};

registerEngine(engine);
