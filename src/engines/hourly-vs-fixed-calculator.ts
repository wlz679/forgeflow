import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculatePricingModel(inputs: Record<string, string>): string[] {
  const annualIncomeGoal = parseFloat(inputs.annualIncomeGoal) || 0;
  const billableHoursPerWeek = parseFloat(inputs.billableHoursPerWeek) || 0;
  const weeksOffPerYear = parseFloat(inputs.weeksOffPerYear) || 0;
  const annualExpenses = parseFloat(inputs.annualExpenses) || 0;

  const SEP = '━'.repeat(41);

  const workingWeeks = 52 - weeksOffPerYear;
  const annualBillableHours = billableHoursPerWeek * workingWeeks;
  const netAnnualGoal = annualIncomeGoal + annualExpenses;
  const requiredHourly = annualBillableHours > 0 ? netAnnualGoal / annualBillableHours : 0;
  const requiredDaily = requiredHourly * 8;
  const requiredWeekly = requiredHourly * billableHoursPerWeek;
  const monthlyRetainer = netAnnualGoal / 12;
  const projectFixed4W = netAnnualGoal / Math.max(workingWeeks / 4, 1);
  const utilization = billableHoursPerWeek > 0 ? Math.min(100, Math.round((billableHoursPerWeek / 40) * 100)) : 0;

  const fmt2 = (n: number) => n.toFixed(2);
  const fmt0 = (n: number) => '$' + Math.round(n).toLocaleString();
  const loc = (n: number) => n.toLocaleString();

  let main = '💼 Hourly vs Fixed Pricing Model\n\n';

  // 💰 Snapshot
  main += '💰 Required Rate Snapshot:\n' + SEP + '\n';
  main += '• Annual Income Goal:        ' + fmt0(annualIncomeGoal) + '\n';
  main += '• Annual Expenses:           ' + fmt0(annualExpenses) + '\n';
  main += '• Net Target (income+exp):   ' + fmt0(netAnnualGoal) + '\n';
  main += '• Billable Hours/Week:       ' + billableHoursPerWeek + ' hrs\n';
  main += '• Weeks Off Per Year:        ' + weeksOffPerYear + ' wks\n';
  main += '• Working Weeks:             ' + workingWeeks + ' wks\n';
  main += '• Annual Billable Hours:     ' + loc(annualBillableHours) + ' hrs\n\n';

  // 📐 Key Metrics
  main += '📐 Key Metrics:\n' + SEP + '\n';
  main += '• Required Hourly Rate:      $' + fmt2(requiredHourly) + '/hr  (after expenses)\n';
  main += '• Daily Rate (8 hrs):        ' + fmt0(requiredDaily) + '/day\n';
  main += '• Weekly Rate:               ' + fmt0(requiredWeekly) + '/wk\n';
  main += '• Monthly Retainer:          ' + fmt0(monthlyRetainer) + '/mo\n';
  main += '• Fixed Project (4-week):    ' + fmt0(projectFixed4W) + '/project\n';
  main += '• Utilization Rate:          ' + utilization + '% of 40-hr work week\n\n';

  // 🩺 Health
  main += '🩺 Rate Health:\n' + SEP + '\n';
  if (requiredHourly <= 0) {
    main += '• ⚠️ Enter your annual income goal and billable hours to see a rate assessment.\n';
  } else if (requiredHourly <= 50) {
    main += '• 🟢 Rate $' + fmt2(requiredHourly) + '/hr is achievable for most freelancers with standard services. Focus on pipeline and client retention.\n';
  } else if (requiredHourly <= 100) {
    main += '• 🟡 Rate $' + fmt2(requiredHourly) + '/hr is mid-market — requires solid expertise and client trust. Specialize deeply to justify this rate.\n';
  } else if (requiredHourly <= 200) {
    main += '• 🟠 Rate $' + fmt2(requiredHourly) + '/hr is premium positioning — demands clear ROI for clients. Case studies, social proof, and niche expertise are essential.\n';
  } else {
    main += '• 🔴 Rate $' + fmt2(requiredHourly) + '/hr is elite tier — top 1% territory. You need a strong personal brand, published authority, and enterprise clients.\n';
  }
  if (billableHoursPerWeek >= 30) {
    main += '• 🟢 ' + billableHoursPerWeek + ' billable hrs/wk is full-time sustainable.\n';
  } else if (billableHoursPerWeek >= 20) {
    main += '• 🟡 ' + billableHoursPerWeek + ' billable hrs/wk means ' + (100 - Math.round(billableHoursPerWeek/40*100)) + '% non-billable time — work on pipeline.\n';
  } else {
    main += '• 🔴 ' + billableHoursPerWeek + ' billable hrs/wk is hard to make a full living. Increase capacity or raise rates.\n';
  }
  if (utilization >= 75) {
    main += '• 🟢 Utilization at ' + utilization + '% — sustainable without burnout.\n';
  } else if (utilization >= 50) {
    main += '• 🟡 Utilization at ' + utilization + '% — healthy but could push to 75%.\n';
  } else {
    main += '• 🔴 Utilization at ' + utilization + '% — too much slack or non-billable work.\n';
  }
  if (annualExpenses / Math.max(annualIncomeGoal, 1) < 0.1) {
    main += '• 🟢 Expenses are ' + Math.round((annualExpenses / Math.max(annualIncomeGoal, 1)) * 100) + '% of income target — lean operation.\n';
  } else if (annualExpenses / Math.max(annualIncomeGoal, 1) < 0.25) {
    main += '• 🟡 Expenses are ' + Math.round((annualExpenses / Math.max(annualIncomeGoal, 1)) * 100) + '% of income target — watch overhead.\n';
  } else {
    main += '• 🟠 Expenses are ' + Math.round((annualExpenses / Math.max(annualIncomeGoal, 1)) * 100) + '% of income target — cut overhead before raising rates.\n';
  }
  main += '\n';

  // 🎯 Income Ladder
  main += '🎯 Income Ladder:\n' + SEP + '\n';
  const ladder = [30000, 60000, 100000, 150000, 200000, 300000];
  for (const goal of ladder) {
    const ladderNet = goal + annualExpenses;
    const hr = annualBillableHours > 0 ? ladderNet / annualBillableHours : 0;
    const ret = ladderNet / 12;
    main += '• $' + loc(goal) + '/yr  →  $' + fmt2(hr) + '/hr  |  $' + loc(Math.round(ret)) + '/mo retainer\n';
  }
  main += '\n';

  // ⚖️ Hourly vs Project Break-Even
  main += '⚖️ Hourly vs Fixed Project Break-Even:\n' + SEP + '\n';
  const hoursPer4WProject = billableHoursPerWeek * 4;
  const hourly4WRevenue = requiredHourly * hoursPer4WProject;
  if (requiredHourly > 0 && hoursPer4WProject > 0) {
    const fixedBreakEven = hourly4WRevenue;
    const fixedToHourly = projectFixed4W / hoursPer4WProject;
    main += '• Hourly model, 4 weeks:   ' + fmt0(hourly4WRevenue) + ' for ' + hoursPer4WProject + ' hrs\n';
    main += '• Fixed model, 4 weeks:    ' + fmt0(projectFixed4W) + ' for ' + hoursPer4WProject + ' hrs (assumes same effort)\n';
    if (projectFixed4W > hourly4WRevenue * 1.1) {
      main += '• 🟢 Fixed-fee projects pay ' + Math.round((projectFixed4W / hourly4WRevenue - 1) * 100) + '% more for the same hours. Charge fixed when scope is clear.\n';
    } else if (projectFixed4W < hourly4WRevenue * 0.9) {
      main += '• 🔴 Fixed-fee projects pay ' + Math.round((1 - projectFixed4W / hourly4WRevenue) * 100) + '% less than hourly. Avoid fixed-fee unless scope is well-defined.\n';
    } else {
      main += '• 🟡 Hourly and fixed-fee are roughly equivalent at this rate. Pick based on client preference and scope clarity.\n';
    }
    main += '• Break-even fixed project rate: $' + fmt2(fixedToHourly) + '/hr (same hourly, all-in price).\n';
  } else {
    main += '• Enter billable hours to compare hourly vs fixed-fee models.\n';
  }
  main += '\n';

  // 🔄 What-If Scenarios
  main += '🔄 What-If Scenarios:\n' + SEP + '\n';
  if (requiredHourly > 0) {
    const raise20 = requiredHourly * 1.2;
    const cutExp = annualBillableHours > 0 ? (netAnnualGoal * 0.8) / annualBillableHours : 0;
    const add5h = annualBillableHours > 0 ? netAnnualGoal / ((billableHoursPerWeek + 5) * workingWeeks) : 0;
    const cutWks = annualBillableHours > 0 ? netAnnualGoal / (billableHoursPerWeek * (workingWeeks - 2)) : 0;
    main += '• Raise rate 20%:        New rate $' + fmt2(raise20) + '/hr  (need only ' + Math.round(annualBillableHours / 1.2) + ' billable hrs/yr)\n';
    main += '• Cut expenses 20%:      New rate $' + fmt2(cutExp) + '/hr  (saves $' + fmt0(annualExpenses * 0.2) + '/yr)\n';
    main += '• Add 5 billable hrs/wk: New rate $' + fmt2(add5h) + '/hr  (more income, same goal)\n';
    main += '• Cut 2 weeks off:       New rate $' + fmt2(cutWks) + '/hr  (compress to ' + (workingWeeks - 2) + ' working wks)\n';
  } else {
    main += '• ⚠️ Cannot model — enter annual income goal and billable hours.\n';
  }
  main += '• 2 income sources: Split goal in half, lower hourly pressure on each.\n\n';

  // 💡 Tip
  const tip = requiredHourly > 200
    ? 'Premium tier — focus on enterprise clients and thought leadership. Don\'t discount; it devalues your brand.'
    : requiredHourly > 100
    ? 'Mid-market tier — your differentiator is depth, not breadth. Specialize in 1-2 industries and become the obvious expert.'
    : requiredHourly > 50
    ? 'Standard tier — your differentiator is reliability and process. Document your workflow and offer guarantees to command higher rates.'
    : 'Entry tier — focus on volume and client retention. Build a referral engine before raising rates.';
  main += '💡 Top Lever: ' + tip + '\n';

  const results: string[] = [main];

  // Comparison rows
  const goals = [30000, 60000, 100000, 150000, 200000, 300000];
  for (const goal of goals) {
    const net = goal + annualExpenses;
    const hr = annualBillableHours > 0 ? net / annualBillableHours : 0;
    const ret = net / 12;
    results.push('$' + loc(goal) + '/yr → $' + fmt2(hr) + '/hr  |  $' + loc(Math.round(ret)) + '/mo retainer  |  $' + loc(Math.round(hr * 8)) + '/day');
  }

  return results;
}

const customFn =
  "var aig=parseFloat(inputs.annualIncomeGoal)||0;" +
  "var bhw=parseFloat(inputs.billableHoursPerWeek)||0;" +
  "var woy=parseFloat(inputs.weeksOffPerYear)||0;" +
  "var axe=parseFloat(inputs.annualExpenses)||0;" +
  "var SEP='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501';" +
  "var ww=52-woy;" +
  "var abh=bhw*ww;" +
  "var nag=aig+axe;" +
  "var rh=abh>0?nag/abh:0;" +
  "var rd=rh*8;" +
  "var rw=rh*bhw;" +
  "var mr=nag/12;" +
  "var pf4=nag/Math.max(ww/4,1);" +
  "var util=bhw>0?Math.min(100,Math.round((bhw/40)*100)):0;" +
  "function fmt2(n){return n.toFixed(2);}" +
  "function fmt0(n){return '$'+Math.round(n).toLocaleString();}" +
  "function loc(n){return n.toLocaleString();}" +
  "var main='\\uD83D\\uDCBC Hourly vs Fixed Pricing Model\\n\\n';" +
  "main+='\\uD83D\\uDCB0 Required Rate Snapshot:\\n'+SEP+'\\n';" +
  "main+='\\u2022 Annual Income Goal:        '+fmt0(aig)+'\\n';" +
  "main+='\\u2022 Annual Expenses:           '+fmt0(axe)+'\\n';" +
  "main+='\\u2022 Net Target (income+exp):   '+fmt0(nag)+'\\n';" +
  "main+='\\u2022 Billable Hours/Week:       '+bhw+' hrs\\n';" +
  "main+='\\u2022 Weeks Off Per Year:        '+woy+' wks\\n';" +
  "main+='\\u2022 Working Weeks:             '+ww+' wks\\n';" +
  "main+='\\u2022 Annual Billable Hours:     '+loc(abh)+' hrs\\n\\n';" +
  "main+='\\uD83D\\uDCD0 Key Metrics:\\n'+SEP+'\\n';" +
  "main+='\\u2022 Required Hourly Rate:      $'+fmt2(rh)+'/hr  (after expenses)\\n';" +
  "main+='\\u2022 Daily Rate (8 hrs):        '+fmt0(rd)+'/day\\n';" +
  "main+='\\u2022 Weekly Rate:               '+fmt0(rw)+'/wk\\n';" +
  "main+='\\u2022 Monthly Retainer:          '+fmt0(mr)+'/mo\\n';" +
  "main+='\\u2022 Fixed Project (4-week):    '+fmt0(pf4)+'/project\\n';" +
  "main+='\\u2022 Utilization Rate:          '+util+'% of 40-hr work week\\n\\n';" +
  "main+='\\uD83E\\uDE7A Rate Health:\\n'+SEP+'\\n';" +
  "if(rh<=0){main+='\\u2022 \\u26A0\\uFE0F Enter your annual income goal and billable hours to see a rate assessment.\\n';}" +
  "else if(rh<=50){main+='\\u2022 \\uD83D\\uDFE2 Rate $'+fmt2(rh)+'/hr is achievable for most freelancers with standard services. Focus on pipeline and client retention.\\n';}" +
  "else if(rh<=100){main+='\\u2022 \\uD83D\\uDFE1 Rate $'+fmt2(rh)+'/hr is mid-market \\u2014 requires solid expertise and client trust. Specialize deeply to justify this rate.\\n';}" +
  "else if(rh<=200){main+='\\u2022 \\uD83D\\uDFE0 Rate $'+fmt2(rh)+'/hr is premium positioning \\u2014 demands clear ROI for clients. Case studies, social proof, and niche expertise are essential.\\n';}" +
  "else{main+='\\u2022 \\uD83D\\uDD34 Rate $'+fmt2(rh)+'/hr is elite tier \\u2014 top 1% territory. You need a strong personal brand, published authority, and enterprise clients.\\n';}" +
  "if(bhw>=30){main+='\\u2022 \\uD83D\\uDFE2 '+bhw+' billable hrs/wk is full-time sustainable.\\n';}" +
  "else if(bhw>=20){main+='\\u2022 \\uD83D\\uDFE1 '+bhw+' billable hrs/wk means '+(100-Math.round(bhw/40*100))+'% non-billable time \\u2014 work on pipeline.\\n';}" +
  "else{main+='\\u2022 \\uD83D\\uDD34 '+bhw+' billable hrs/wk is hard to make a full living. Increase capacity or raise rates.\\n';}" +
  "if(util>=75){main+='\\u2022 \\uD83D\\uDFE2 Utilization at '+util+'% \\u2014 sustainable without burnout.\\n';}" +
  "else if(util>=50){main+='\\u2022 \\uD83D\\uDFE1 Utilization at '+util+'% \\u2014 healthy but could push to 75%.\\n';}" +
  "else{main+='\\u2022 \\uD83D\\uDD34 Utilization at '+util+'% \\u2014 too much slack or non-billable work.\\n';}" +
  "var expRatio=axe/Math.max(aig,1);" +
  "if(expRatio<0.1){main+='\\u2022 \\uD83D\\uDFE2 Expenses are '+Math.round(expRatio*100)+'% of income target \\u2014 lean operation.\\n';}" +
  "else if(expRatio<0.25){main+='\\u2022 \\uD83D\\uDFE1 Expenses are '+Math.round(expRatio*100)+'% of income target \\u2014 watch overhead.\\n';}" +
  "else{main+='\\u2022 \\uD83D\\uDFE0 Expenses are '+Math.round(expRatio*100)+'% of income target \\u2014 cut overhead before raising rates.\\n';}" +
  "main+='\\n';" +
  "main+='\\uD83C\\uDFAF Income Ladder:\\n'+SEP+'\\n';" +
  "var ladder=[30000,60000,100000,150000,200000,300000];" +
  "for(var li=0;li<ladder.length;li++){var g=ladder[li];var net=g+axe;var hr2=abh>0?net/abh:0;var ret=net/12;main+='\\u2022 $'+loc(g)+'/yr  \\u2192  $'+fmt2(hr2)+'/hr  |  $'+loc(Math.round(ret))+'/mo retainer\\n';}" +
  "main+='\\n';" +
  "main+='\\u2696\\uFE0F Hourly vs Fixed Project Break-Even:\\n'+SEP+'\\n';" +
  "var h4w=bhw*4;" +
  "var h4wRev=rh*h4w;" +
  "if(rh>0&&h4w>0){" +
  "var fth=pf4/h4w;" +
  "main+='\\u2022 Hourly model, 4 weeks:   '+fmt0(h4wRev)+' for '+h4w+' hrs\\n';" +
  "main+='\\u2022 Fixed model, 4 weeks:    '+fmt0(pf4)+' for '+h4w+' hrs (assumes same effort)\\n';" +
  "if(pf4>h4wRev*1.1){main+='\\u2022 \\uD83D\\uDFE2 Fixed-fee projects pay '+Math.round((pf4/h4wRev-1)*100)+'% more for the same hours. Charge fixed when scope is clear.\\n';}" +
  "else if(pf4<h4wRev*0.9){main+='\\u2022 \\uD83D\\uDD34 Fixed-fee projects pay '+Math.round((1-pf4/h4wRev)*100)+'% less than hourly. Avoid fixed-fee unless scope is well-defined.\\n';}" +
  "else{main+='\\u2022 \\uD83D\\uDFE1 Hourly and fixed-fee are roughly equivalent at this rate. Pick based on client preference and scope clarity.\\n';}" +
  "main+='\\u2022 Break-even fixed project rate: $'+fmt2(fth)+'/hr (same hourly, all-in price).\\n';" +
  "}else{main+='\\u2022 Enter billable hours to compare hourly vs fixed-fee models.\\n';}" +
  "main+='\\n';" +
  "main+='\\uD83D\\uDD04 What-If Scenarios:\\n'+SEP+'\\n';" +
  "if(rh>0){" +
  "var raise20=rh*1.2;" +
  "var cutExp=abh>0?(nag*0.8)/abh:0;" +
  "var add5h=abh>0?nag/((bhw+5)*ww):0;" +
  "var cutWks=abh>0?nag/(bhw*(ww-2)):0;" +
  "main+='\\u2022 Raise rate 20%:        New rate $'+fmt2(raise20)+'/hr  (need only '+Math.round(abh/1.2)+' billable hrs/yr)\\n';" +
  "main+='\\u2022 Cut expenses 20%:      New rate $'+fmt2(cutExp)+'/hr  (saves $'+fmt0(axe*0.2)+'/yr)\\n';" +
  "main+='\\u2022 Add 5 billable hrs/wk: New rate $'+fmt2(add5h)+'/hr  (more income, same goal)\\n';" +
  "main+='\\u2022 Cut 2 weeks off:       New rate $'+fmt2(cutWks)+'/hr  (compress to '+(ww-2)+' working wks)\\n';" +
  "}else{main+='\\u2022 \\u26A0\\uFE0F Cannot model \\u2014 enter annual income goal and billable hours.\\n';}" +
  "main+='\\u2022 2 income sources: Split goal in half, lower hourly pressure on each.\\n\\n';" +
  "var tip=rh>200?'Premium tier \\u2014 focus on enterprise clients and thought leadership. Don\\'t discount; it devalues your brand.':rh>100?'Mid-market tier \\u2014 your differentiator is depth, not breadth. Specialize in 1-2 industries and become the obvious expert.':rh>50?'Standard tier \\u2014 your differentiator is reliability and process. Document your workflow and offer guarantees to command higher rates.':'Entry tier \\u2014 focus on volume and client retention. Build a referral engine before raising rates.';" +
  "main+='\\uD83D\\uDCA1 Top Lever: '+tip+'\\n';" +
  "var results=[main];" +
  "var goals=[30000,60000,100000,150000,200000,300000];" +
  "for(var gi=0;gi<goals.length;gi++){var g=goals[gi];var net=g+axe;var hr=abh>0?net/abh:0;var ret=net/12;results.push('$'+loc(g)+'/yr \\u2192 $'+fmt2(hr)+'/hr  |  $'+loc(Math.round(ret))+'/mo retainer  |  $'+loc(Math.round(hr*8))+'/day');}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-hourly-vs-fixed-calculator',
  title: 'Hourly vs Fixed Rate Calculator',
  description: 'Calculate the hourly rate, monthly retainer, and fixed-project pricing needed to reach your annual income goal. Includes expense coverage, utilization, and hourly-vs-fixed break-even.',
  category: 'C',
  inputs: [
    { name: 'annualIncomeGoal', label: 'Annual Income Goal ($)', placeholder: 'e.g. 100000', type: 'number' },
    { name: 'billableHoursPerWeek', label: 'Billable Hours Per Week', placeholder: 'e.g. 30', type: 'number' },
    { name: 'weeksOffPerYear', label: 'Weeks Off Per Year', placeholder: 'e.g. 4', type: 'number' },
    { name: 'annualExpenses', label: 'Annual Business Expenses ($)', placeholder: 'e.g. 5000', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs: Record<string, string>): string[] {
    return calculatePricingModel(inputs);
  },
  staticExamples: [
    '💼 Hourly vs Fixed Pricing Model\n\n💰 Required Rate Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Annual Income Goal:        $100,000\n• Annual Expenses:           $5,000\n• Net Target (income+exp):   $105,000\n• Billable Hours/Week:       30 hrs\n• Weeks Off Per Year:        4 wks\n• Working Weeks:             48 wks\n• Annual Billable Hours:     1,440 hrs\n\n📐 Key Metrics:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Required Hourly Rate:      $72.92/hr  (after expenses)\n• Daily Rate (8 hrs):        $583/day\n• Weekly Rate:               $2,188/wk\n• Monthly Retainer:          $8,750/mo\n• Fixed Project (4-week):    $8,750/project\n• Utilization Rate:          75% of 40-hr work week\n\n🩺 Rate Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 Rate $72.92/hr is mid-market — requires solid expertise and client trust. Specialize deeply to justify this rate.\n• 🟢 30 billable hrs/wk is full-time sustainable.\n• 🟢 Utilization at 75% — sustainable without burnout.\n• 🟢 Expenses are 5% of income target — lean operation.\n\n🎯 Income Ladder:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $30,000/yr  →  $24.31/hr  |  $2,917/mo retainer\n• $60,000/yr  →  $45.14/hr  |  $5,417/mo retainer\n• $100,000/yr  →  $72.92/hr  |  $8,750/mo retainer\n• $150,000/yr  →  $107.64/hr  |  $12,917/mo retainer\n• $200,000/yr  →  $142.36/hr  |  $17,083/mo retainer\n• $300,000/yr  →  $211.81/hr  |  $25,417/mo retainer\n\n⚖️ Hourly vs Fixed Project Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Hourly model, 4 weeks:   $8,750 for 120 hrs\n• Fixed model, 4 weeks:    $8,750 for 120 hrs (assumes same effort)\n• 🟡 Hourly and fixed-fee are roughly equivalent at this rate. Pick based on client preference and scope clarity.\n• Break-even fixed project rate: $72.92/hr (same hourly, all-in price).\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Raise rate 20%:        New rate $87.50/hr  (need only 1200 billable hrs/yr)\n• Cut expenses 20%:      New rate $58.33/hr  (saves $1,000/yr)\n• Add 5 billable hrs/wk: New rate $62.50/hr  (more income, same goal)\n• Cut 2 weeks off:       New rate $76.09/hr  (compress to 46 working wks)\n• 2 income sources: Split goal in half, lower hourly pressure on each.\n\n💡 Top Lever: Standard tier — your differentiator is reliability and process. Document your workflow and offer guarantees to command higher rates.\n\n$30,000/yr → $24.31/hr  |  $2,917/mo retainer  |  $194/day\n$60,000/yr → $45.14/hr  |  $5,417/mo retainer  |  $361/day\n$100,000/yr → $72.92/hr  |  $8,750/mo retainer  |  $583/day\n$150,000/yr → $107.64/hr  |  $12,917/mo retainer  |  $861/day\n$200,000/yr → $142.36/hr  |  $17,083/mo retainer  |  $1,139/day\n$300,000/yr → $211.81/hr  |  $25,417/mo retainer  |  $1,694/day',
    '$30,000/yr → $24.31/hr  |  $2,917/mo retainer  |  $194/day',
    '$60,000/yr → $45.14/hr  |  $5,417/mo retainer  |  $361/day',
    '$100,000/yr → $72.92/hr  |  $8,750/mo retainer  |  $583/day',
    '$200,000/yr → $142.36/hr  |  $17,083/mo retainer  |  $1,139/day',
  ],
  faq: [
    { q: 'How many billable hours per week is realistic?', a: 'Most full-time freelancers bill 20-30 hours per week. The remaining time goes to admin, marketing, proposals, learning, and breaks. If you are billing 40 hours every week, you are likely burning out. Plan for 25 billable hours as a sustainable target.' },
    { q: 'Should I charge hourly or fixed-price?', a: 'Fixed-price is generally better for experienced freelancers. Clients prefer predictable costs, and you earn more when you work efficiently. Use hourly for unclear scopes or ongoing retainer work. Start with hourly, then transition to fixed as you learn to estimate accurately.' },
    { q: 'What if my target hourly rate is too high?', a: 'You have three levers: increase billable hours, lower your income goal, or specialize in a higher-paying niche. Working with US/EU clients while living in a lower-cost region is a proven strategy to make a high effective rate achievable.' },
    { q: 'Should I charge different rates to different clients?', a: 'Yes. Early clients might get a lower rate for testimonials. Enterprise clients should pay premium rates. Long-term retainer clients can receive a 10-20% discount. The key is to never disclose your rate variance — each client gets a custom quote based on project scope.' },
    { q: 'How do I factor in taxes and business expenses?', a: 'Multiply your desired take-home income by 1.3-1.5 to cover self-employment taxes (15.3% in the US), health insurance, software, hardware, and professional development. If you want $100K take-home, target $130K-$150K in gross revenue.' },
  ],
  howToUse: [
    'Enter your target annual income goal.',
    'Set your realistic billable hours per week (most freelancers bill 20-30).',
    'Enter how many weeks you plan to take off per year.',
    'Optionally add your annual business expenses (software, insurance, etc.).',
    'Review your required hourly, daily, weekly, and monthly retainer rates.',
    'Scroll down to compare hourly vs fixed-fee and the income ladder.',
  ],
};

registerEngine(engine);
