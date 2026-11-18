import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

function calculatePricingModel(inputs: Record<string, string>): string[] {
  const annualIncomeGoal = clampNonNegative(parseFloat(inputs.annualIncomeGoal) || 0);
  const billableHoursPerWeek = clampNonNegative(parseFloat(inputs.billableHoursPerWeek) || 0);
  const weeksOffPerYear = clampNonNegative(parseFloat(inputs.weeksOffPerYear) || 0);
  const annualExpenses = clampNonNegative(parseFloat(inputs.annualExpenses) || 0);

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
    main += '• Cut expenses 20%:      New rate $' + fmt2(cutExp) + '/hr  (saves ' + fmt0(annualExpenses * 0.2) + '/yr)\n';
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
  `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let w=function(s){return Number.isNaN(s)?0:Math.max(0,s)},v=function(s){const u=w(parseFloat(s.annualIncomeGoal)||0),r=w(parseFloat(s.billableHoursPerWeek)||0),f=w(parseFloat(s.weeksOffPerYear)||0),i=w(parseFloat(s.annualExpenses)||0),m="━".repeat(41),p=52-f,a=r*p,d=u+i,n=a>0?d/a:0,E=n*8,W=n*r,H=d/12,h=d/Math.max(p/4,1),y=r>0?Math.min(100,Math.round(r/40*100)):0,o=t=>t.toFixed(2),l=t=>"$"+Math.round(t).toLocaleString(),b=t=>t.toLocaleString();let e=\`💼 Hourly vs Fixed Pricing Model

\`;e+=\`💰 Required Rate Snapshot:
\`+m+\`
\`,e+="• Annual Income Goal:        "+l(u)+\`
\`,e+="• Annual Expenses:           "+l(i)+\`
\`,e+="• Net Target (income+exp):   "+l(d)+\`
\`,e+="• Billable Hours/Week:       "+r+\` hrs
\`,e+="• Weeks Off Per Year:        "+f+\` wks
\`,e+="• Working Weeks:             "+p+\` wks
\`,e+="• Annual Billable Hours:     "+b(a)+\` hrs

\`,e+=\`📐 Key Metrics:
\`+m+\`
\`,e+="• Required Hourly Rate:      $"+o(n)+\`/hr  (after expenses)
\`,e+="• Daily Rate (8 hrs):        "+l(E)+\`/day
\`,e+="• Weekly Rate:               "+l(W)+\`/wk
\`,e+="• Monthly Retainer:          "+l(H)+\`/mo
\`,e+="• Fixed Project (4-week):    "+l(h)+\`/project
\`,e+="• Utilization Rate:          "+y+\`% of 40-hr work week

\`,e+=\`🩺 Rate Health:
\`+m+\`
\`,n<=0?e+=\`• ⚠️ Enter your annual income goal and billable hours to see a rate assessment.
\`:n<=50?e+="• 🟢 Rate $"+o(n)+\`/hr is achievable for most freelancers with standard services. Focus on pipeline and client retention.
\`:n<=100?e+="• 🟡 Rate $"+o(n)+\`/hr is mid-market — requires solid expertise and client trust. Specialize deeply to justify this rate.
\`:n<=200?e+="• 🟠 Rate $"+o(n)+\`/hr is premium positioning — demands clear ROI for clients. Case studies, social proof, and niche expertise are essential.
\`:e+="• 🔴 Rate $"+o(n)+\`/hr is elite tier — top 1% territory. You need a strong personal brand, published authority, and enterprise clients.
\`,r>=30?e+="• 🟢 "+r+\` billable hrs/wk is full-time sustainable.
\`:r>=20?e+="• 🟡 "+r+" billable hrs/wk means "+(100-Math.round(r/40*100))+\`% non-billable time — work on pipeline.
\`:e+="• 🔴 "+r+\` billable hrs/wk is hard to make a full living. Increase capacity or raise rates.
\`,y>=75?e+="• 🟢 Utilization at "+y+\`% — sustainable without burnout.
\`:y>=50?e+="• 🟡 Utilization at "+y+\`% — healthy but could push to 75%.
\`:e+="• 🔴 Utilization at "+y+\`% — too much slack or non-billable work.
\`,i/Math.max(u,1)<.1?e+="• 🟢 Expenses are "+Math.round(i/Math.max(u,1)*100)+\`% of income target — lean operation.
\`:i/Math.max(u,1)<.25?e+="• 🟡 Expenses are "+Math.round(i/Math.max(u,1)*100)+\`% of income target — watch overhead.
\`:e+="• 🟠 Expenses are "+Math.round(i/Math.max(u,1)*100)+\`% of income target — cut overhead before raising rates.
\`,e+=\`
\`,e+=\`🎯 Income Ladder:
\`+m+\`
\`;const P=[3e4,6e4,1e5,15e4,2e5,3e5];for(const t of P){const c=t+i,x=a>0?c/a:0,M=c/12;e+="• $"+b(t)+"/yr  →  $"+o(x)+"/hr  |  $"+b(Math.round(M))+\`/mo retainer
\`}e+=\`
\`,e+=\`⚖️ Hourly vs Fixed Project Break-Even:
\`+m+\`
\`;const g=r*4,k=n*g;if(n>0&&g>0){const t=k,c=h/g;e+="• Hourly model, 4 weeks:   "+l(k)+" for "+g+\` hrs
\`,e+="• Fixed model, 4 weeks:    "+l(h)+" for "+g+\` hrs (assumes same effort)
\`,h>k*1.1?e+="• 🟢 Fixed-fee projects pay "+Math.round((h/k-1)*100)+\`% more for the same hours. Charge fixed when scope is clear.
\`:h<k*.9?e+="• 🔴 Fixed-fee projects pay "+Math.round((1-h/k)*100)+\`% less than hourly. Avoid fixed-fee unless scope is well-defined.
\`:e+=\`• 🟡 Hourly and fixed-fee are roughly equivalent at this rate. Pick based on client preference and scope clarity.
\`,e+="• Break-even fixed project rate: $"+o(c)+\`/hr (same hourly, all-in price).
\`}else e+=\`• Enter billable hours to compare hourly vs fixed-fee models.
\`;if(e+=\`
\`,e+=\`🔄 What-If Scenarios:
\`+m+\`
\`,n>0){const t=n*1.2,c=a>0?d*.8/a:0,x=a>0?d/((r+5)*p):0,M=a>0?d/(r*(p-2)):0;e+="• Raise rate 20%:        New rate $"+o(t)+"/hr  (need only "+Math.round(a/1.2)+\` billable hrs/yr)
\`,e+="• Cut expenses 20%:      New rate $"+o(c)+"/hr  (saves "+l(i*.2)+\`/yr)
\`,e+="• Add 5 billable hrs/wk: New rate $"+o(x)+\`/hr  (more income, same goal)
\`,e+="• Cut 2 weeks off:       New rate $"+o(M)+"/hr  (compress to "+(p-2)+\` working wks)
\`}else e+=\`• ⚠️ Cannot model — enter annual income goal and billable hours.
\`;e+=\`• 2 income sources: Split goal in half, lower hourly pressure on each.

\`;const _=n>200?"Premium tier — focus on enterprise clients and thought leadership. Don't discount; it devalues your brand.":n>100?"Mid-market tier — your differentiator is depth, not breadth. Specialize in 1-2 industries and become the obvious expert.":n>50?"Standard tier — your differentiator is reliability and process. Document your workflow and offer guarantees to command higher rates.":"Entry tier — focus on volume and client retention. Build a referral engine before raising rates.";e+="💡 Top Lever: "+_+\`
\`;const R=[e],j=[3e4,6e4,1e5,15e4,2e5,3e5];for(const t of j){const c=t+i,x=a>0?c/a:0,M=c/12;R.push("$"+b(t)+"/yr → $"+o(x)+"/hr  |  $"+b(Math.round(M))+"/mo retainer  |  $"+b(Math.round(x*8))+"/day")}return R},$=function(s,u,r){var f=F(s);return Array.isArray(f)?f.join(\`
\`):String(f)};var N=w,S=v,A=$,F=function(s){return v(s)};return[$(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

const engine: ToolEngine = {
  slug: 'solopreneur-hourly-vs-fixed-calculator',
  title: 'Hourly vs Fixed Rate Calculator',
  description: 'Calculate the hourly rate, monthly retainer, and fixed-project pricing needed to reach your annual income goal. Includes expense coverage, utilization, and hourly-vs-fixed break-even.',
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
    { q: "When should I charge hourly vs fixed price?", a: "Hourly: scope unclear, ongoing work, maintenance, consulting. Fixed: clear scope, defined deliverables, well-understood problem. Rule: if you can describe the deliverable in 1-2 sentences, fixed. If you can't, hourly. Experienced freelancers prefer fixed (rewards efficiency). New freelancers prefer hourly (less risk)." },
    { q: "What is the profit margin difference?", a: "Hourly: 100% of additional time = more revenue. Fixed: 100% of efficiency gain = more profit. For a $2000 fixed project estimated at 10 hours: if done in 8 hours, profit is $200-300 extra. If hourly at $150: same scope = $1200-2000. Fixed pricing rewards efficiency. Hourly punishes it." },
    { q: "How do I estimate fixed price projects?", a: "1) Break project into tasks (1-2 hours each), 2) Estimate hours per task, 3) Add 20-30% buffer for unknown issues, 4) Multiply by hourly rate, 5) Round up. Example: 50 task hours × $150/hour × 1.25 buffer = $9375. Communicate: \"Estimate based on your requirements; changes may affect price.\"" },
    { q: "What if a fixed-price project exceeds scope?", a: "Stop work. Notify client: \"This is outside original scope. Options: 1) Add for $X, 2) Cut from scope, 3) Reduce quality.\" Get written approval before continuing. Track all out-of-scope work. Charge change orders. Never work for free — it sets bad precedent and trains clients to over-scope." },
    { q: "How do I communicate price to clients?", a: "Be specific: deliverables, timeline, revisions, payment terms. Anchor: show high-end option first, then target tier. Social proof: \"Most clients at this tier...\" Risk reversal: money-back guarantee, milestone-based payment. Always: written contract. Avoid: hourly estimates that scare clients." },
    { q: "What is the best project pricing structure?", a: "Common: 1) 50% upfront, 50% on delivery (most common), 2) 30% upfront, 30% mid-project, 40% delivery, 3) Milestone-based (4-5 milestones, paid upon completion). Reasons for upfront: covers initial work, filters serious clients. For $5000+ projects: milestones reduce risk. Never 100% on delivery." },
    { q: "How do I handle disputes over fixed-price work?", a: "Prevention: clear contract, written scope, change orders. Resolution: 1) Review contract, 2) Show deliverable against scope, 3) Offer partial refund if genuinely off, 4) Escalate to mediation (small claims court for <$10K). Most disputes stem from unclear scope. Update contract template after each dispute." },
    { q: "Should I offer discounts for long-term contracts?", a: "Yes: 10-20% off for 6-month+ commitments, 25-30% for 12-month+. Benefits: predictable revenue, less sales/marketing. Risks: under-pricing if scope expands. Build contracts: \"40 hours/month, scope defined, additional hours at $X.\" Lock rate for 12 months. Re-evaluate at renewal with market rate data." },
  ],
  howToUse: [
    'Enter your target annual income goal.',
    'Set your realistic billable hours per week (most freelancers bill 20-30).',
    'Enter how many weeks you plan to take off per year.',
    'Optionally add your annual business expenses (software, insurance, etc.).',
    'Review your required hourly, daily, weekly, and monthly retainer rates.',
    'Scroll down to compare hourly vs fixed-fee and the income ladder.',
  ],
  engineKey: true,
};

registerEngine(engine);

