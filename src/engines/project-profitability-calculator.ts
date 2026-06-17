import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculateProfitability(inputs: Record<string, string>): string[] {
  const projectRevenue = parseFloat(inputs.projectRevenue) || 0;
  const hoursEstimated = parseFloat(inputs.hoursEstimated) || 0;
  const hourlyCost = parseFloat(inputs.hourlyCost) || 0;
  const materialCost = parseFloat(inputs.materialCost) || 0;
  const results: string[] = [];

  const totalLaborCost = hoursEstimated * hourlyCost;
  const totalCost = totalLaborCost + materialCost;
  const profit = projectRevenue - totalCost;
  const effectiveHourly = hoursEstimated > 0 ? projectRevenue / hoursEstimated : 0;
  const profitMargin = projectRevenue > 0 ? (profit / projectRevenue) * 100 : 0;

  const fmt = (n: number) => n.toFixed(2);
  const loc = (n: number) => n.toLocaleString();

  let assessment: string;
  if (profitMargin >= 50) {
    assessment = '🚀 Outstanding! A ' + profitMargin.toFixed(0) + '% margin means this project is highly profitable. You are pricing well above your costs.';
  } else if (profitMargin >= 30) {
    assessment = '✅ Healthy. A ' + profitMargin.toFixed(0) + '% margin is solid. You have good pricing leverage and cost control.';
  } else if (profitMargin >= 15) {
    assessment = '📊 Decent. A ' + profitMargin.toFixed(0) + '% margin is acceptable but leaves little buffer. Look for ways to reduce hours or material costs.';
  } else if (profitMargin >= 0) {
    assessment = '⚠️ Thin. Only ' + profitMargin.toFixed(0) + '% margin. One unexpected delay or expense could wipe out your profit entirely.';
  } else {
    assessment = '🔴 Losing money. You are spending $' + loc(totalCost) + ' to earn $' + loc(projectRevenue) + '. Either raise your price or cut costs.';
  }

  results.push(
    '💰 Project Profitability Report\n\n' +
    '' +
    '📋 Revenue & Costs\n' +
    '\n' +
    '• Project Revenue:       $' + loc(projectRevenue) + '\n' +
    '• Hours Estimated:       ' + hoursEstimated + ' hrs\n' +
    '• Hourly Cost Rate:      $' + loc(hourlyCost) + '/hr\n' +
    '• Total Labor Cost:      $' + loc(totalLaborCost) + '\n' +
    '• Material Cost:           $' + loc(materialCost) + '\n' +
    '• Total Cost:                $' + loc(totalCost) + '\n\n' +
    '' +
    '📈 Key Metrics\n' +
    '\n' +
    '• Net Profit:                  $' + loc(profit) + '\n' +
    '• Profit Margin:            ' + profitMargin.toFixed(1) + '%\n' +
    '• Effective Hourly Rate: $' + fmt(effectiveHourly) + '/hr\n\n' +
    '🩺 Project Health:\n' +
    (profitMargin >= 50
      ? '• 🟢 Outstanding — 50%+ margin means highly profitable pricing.\n'
      : profitMargin >= 30
      ? '• 🟢 Strong — 30-50% is healthy for service work.\n'
      : profitMargin >= 15
      ? '• 🟡 OK — 15-30% margin is workable but tight.\n'
      : profitMargin > 0
      ? '• 🟠 Thin — under 15% leaves no room for scope creep.\n'
      : '• 🔴 Loss — you are losing money on this project.\n') +
    (effectiveHourly >= hourlyCost * 2
      ? '• ✅ You earn ' + (effectiveHourly / hourlyCost).toFixed(1) + 'x your cost rate — sustainable.\n'
      : effectiveHourly >= hourlyCost
      ? '• ⚠️ You earn ' + (effectiveHourly / hourlyCost).toFixed(1) + 'x your cost rate — break-even territory.\n'
      : '• 🔴 You earn less than your cost rate — subsidizing the client.\n') +
    '\n🔄 What-If Scenarios\n' +
    '• If hours grow 20%:  Profit $' + Math.round(profit - (hoursEstimated * 0.2) * hourlyCost).toLocaleString() + '  (margin ' + (((profit - (hoursEstimated * 0.2) * hourlyCost) / projectRevenue) * 100).toFixed(1) + '%)\n' +
    '• If you raise price 15%:  Profit $' + Math.round(profit + projectRevenue * 0.15).toLocaleString() + '  (margin ' + (((profit + projectRevenue * 0.15) / (projectRevenue * 1.15)) * 100).toFixed(1) + '%)\n' +
    '• For 50% margin:  Target price $' + Math.round(totalCost * 2).toLocaleString() + '  (current: $' + Math.round(projectRevenue).toLocaleString() + ')\n\n' +
    assessment + '\n\n' +
    '',
  );

  const rates = [25, 40, 60, 80, 100, 120, 150, 200, 250];
  for (let i = 0; i < 9; i++) {
    const labor = hoursEstimated * rates[i];
    const total = labor + materialCost;
    const prof = projectRevenue - total;
    const margin = projectRevenue > 0 ? (prof / projectRevenue) * 100 : 0;
    const eff = hoursEstimated > 0 ? projectRevenue / hoursEstimated : 0;
    results.push(
      'Comparison: At $' + rates[i] + '/hr cost → Cost: $' + loc(total) +
      ' | Profit: $' + loc(prof) + ' | Margin: ' + margin.toFixed(1) + '% | Effective: $' + fmt(eff) + '/hr',
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
  "var pm=pr>0?(profit/pr)*100:0;" +
  "function fmt(n){return n.toFixed(2)}" +
  "function loc(n){return n.toLocaleString()}" +
  "var assess;" +
  "if(pm>=50)assess='\\uD83D\\uDE80 Outstanding! A '+pm.toFixed(0)+'% margin means this project is highly profitable. You are pricing well above your costs.';" +
  "else if(pm>=30)assess='\\u2705 Healthy. A '+pm.toFixed(0)+'% margin is solid. You have good pricing leverage and cost control.';" +
  "else if(pm>=15)assess='\\uD83D\\uDCCA Decent. A '+pm.toFixed(0)+'% margin is acceptable but leaves little buffer. Look for ways to reduce hours or material costs.';" +
  "else if(pm>=0)assess='\\u26A0\\uFE0F Thin. Only '+pm.toFixed(0)+'% margin. One unexpected delay or expense could wipe out your profit entirely.';" +
  "else assess='\\uD83D\\uDD34 Losing money. You are spending $'+loc(tc)+' to earn $'+loc(pr)+'. Either raise your price or cut costs.';" +
  "var results=[];" +
  "results.push(" +
  "'\\uD83D\\uDCB0 Project Profitability Report\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n" +
  "\\uD83D\\uDCCB Revenue & Costs\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\u2022 Project Revenue:       $'+loc(pr)+'\\n" +
  "\\u2022 Hours Estimated:       '+he+' hrs\\n" +
  "\\u2022 Hourly Cost Rate:      $'+loc(hc)+'/hr\\n" +
  "\\u2022 Total Labor Cost:      $'+loc(tlc)+'\\n" +
  "\\u2022 Material Cost:           $'+loc(mc)+'\\n" +
  "\\u2022 Total Cost:                $'+loc(tc)+'\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n" +
  "\\uD83D\\uDCC8 Key Metrics\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\u2022 Net Profit:                  $'+loc(profit)+'\\n" +
  "\\u2022 Profit Margin:            '+pm.toFixed(1)+'%\\n" +
  "\\u2022 Effective Hourly Rate: $'+fmt(ehr)+'/hr\\n\\n" +
  "'+assess+'\\n\\n" +
  "\\uD83D\\uDCA1 Tip: Track actual hours spent on every project. If you consistently exceed estimates, raise your prices or improve scoping. Your effective hourly rate tells the real story of whether a project was worth it.'" +
  ");" +
  "var rates=[25,40,60,80,100,120,150,200,250];" +
  "for(var i=0;i<9;i++){" +
  "var lab=he*rates[i];" +
  "var tot=lab+mc;" +
  "var prof=pr-tot;" +
  "var mar=pr>0?(prof/pr)*100:0;" +
  "var eff=he>0?pr/he:0;" +
  "results.push('Comparison: At $'+rates[i]+'/hr cost \\u2192 Cost: $'+loc(tot)+' | Profit: $'+loc(prof)+' | Margin: '+mar.toFixed(1)+'% | Effective: $'+fmt(eff)+'/hr');" +
  "}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-project-profitability-calculator',
  title: 'Project Profitability Calculator',
  description: 'Calculate profit, effective hourly rate, and profit margin for any freelance project. Compare outcomes at different cost rates.',
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
    return calculateProfitability(inputs);
  },
  staticExamples: [
    '💰 Project Profitability Report\n\n📋 Revenue & Costs\n\n• Project Revenue:       $5,000\n• Hours Estimated:       40 hrs\n• Hourly Cost Rate:      $50/hr\n• Total Labor Cost:      $2,000\n• Material Cost:           $200\n• Total Cost:                $2,200\n\n📈 Key Metrics\n\n• Net Profit:                  $2,800\n• Profit Margin:            56.0%\n• Effective Hourly Rate: $125.00/hr\n\n🚀 Outstanding! A 56% margin means this project is highly profitable. You are pricing well above your costs.\n',
    'Comparison: At $25/hr cost → Cost: $1,200 | Profit: $3,800 | Margin: 76.0% | Effective: $125.00/hr',
    'Comparison: At $40/hr cost → Cost: $1,800 | Profit: $3,200 | Margin: 64.0% | Effective: $125.00/hr',
    'Comparison: At $100/hr cost → Cost: $4,200 | Profit: $800 | Margin: 16.0% | Effective: $125.00/hr',
    'Comparison: At $200/hr cost → Cost: $8,200 | Profit: -$3,200 | Margin: -64.0% | Effective: $125.00/hr',
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
    'Scroll down to compare profitability across 9 different hourly cost rates.',
  ],
};

registerEngine(engine);
