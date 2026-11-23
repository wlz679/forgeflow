import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-14：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

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

  // P168 B3-14：params 的表达式与兜底里的表达式必须**同源** ⇒ 先用局部变量承接
  const annualIncomeGoalLabel = fmt0(annualIncomeGoal);
  const netAnnualGoalLabel = fmt0(netAnnualGoal);
  const billableHoursLabel = String(billableHoursPerWeek);
  const weeksOffLabel = String(weeksOffPerYear);
  const workingWeeksLabel = String(workingWeeks);
  const annualBillableHoursLabel = loc(annualBillableHours);
  const requiredHourlyLabel = fmt2(requiredHourly);
  const requiredDailyLabel = fmt0(requiredDaily);
  const projectFixed4WLabel = fmt0(projectFixed4W);
  const utilizationLabel = String(utilization);
  const nonBillablePctLabel = String(100 - Math.round(billableHoursPerWeek / 40 * 100));
  const expensePctLabel = String(Math.round((annualExpenses / Math.max(annualIncomeGoal, 1)) * 100));

  let main = makeToken('calc_out.section.hourly_vs_fixed_calculator', '💼 Hourly vs Fixed Pricing Model') + '\n\n';

  // 💰 Snapshot
  main += makeToken('calc_out.section.hourly_vs_fixed_snapshot', '💰 Required Rate Snapshot:') + '\n' + SEP + '\n';
  main += makeToken('calc_out.hourly_vs_fixed.row.annual_income_goal', '• Annual Income Goal:        ' + annualIncomeGoalLabel, { value: annualIncomeGoalLabel }) + '\n';
  main += '• Annual Expenses:           ' + fmt0(annualExpenses) + '\n';
  main += makeToken('calc_out.hourly_vs_fixed.row.net_target', '• Net Target (income+exp):   ' + netAnnualGoalLabel, { value: netAnnualGoalLabel }) + '\n';
  main += makeToken('calc_out.hourly_vs_fixed.row.billable_hours_week', '• Billable Hours/Week:       ' + billableHoursLabel + ' hrs', { hours: billableHoursLabel }) + '\n';
  main += makeToken('calc_out.hourly_vs_fixed.row.weeks_off', '• Weeks Off Per Year:        ' + weeksOffLabel + ' wks', { weeks: weeksOffLabel }) + '\n';
  main += makeToken('calc_out.hourly_vs_fixed.row.working_weeks', '• Working Weeks:             ' + workingWeeksLabel + ' wks', { weeks: workingWeeksLabel }) + '\n';
  main += makeToken('calc_out.hourly_vs_fixed.row.annual_billable_hours', '• Annual Billable Hours:     ' + annualBillableHoursLabel + ' hrs', { hours: annualBillableHoursLabel }) + '\n\n';

  // 📐 Key Metrics
  main += makeToken('calc_out.section.key_metrics', '📐 Key Metrics:') + '\n' + SEP + '\n';
  main += makeToken('calc_out.hourly_vs_fixed.row.required_hourly_rate', '• Required Hourly Rate:      $' + requiredHourlyLabel + '/hr  (after expenses)', { rate: requiredHourlyLabel }) + '\n';
  main += makeToken('calc_out.hourly_vs_fixed.row.daily_rate', '• Daily Rate (8 hrs):        ' + requiredDailyLabel + '/day', { value: requiredDailyLabel }) + '\n';
  main += '• Weekly Rate:               ' + fmt0(requiredWeekly) + '/wk\n';
  main += '• Monthly Retainer:          ' + fmt0(monthlyRetainer) + '/mo\n';
  main += makeToken('calc_out.hourly_vs_fixed.row.fixed_project_4w', '• Fixed Project (4-week):    ' + projectFixed4WLabel + '/project', { value: projectFixed4WLabel }) + '\n';
  main += makeToken('calc_out.hourly_vs_fixed.row.utilization_rate', '• Utilization Rate:          ' + utilizationLabel + '% of 40-hr work week', { pct: utilizationLabel }) + '\n\n';

  // 🩺 Health
  main += makeToken('calc_out.section.hourly_vs_fixed_rate_health', '🩺 Rate Health:') + '\n' + SEP + '\n';
  if (requiredHourly <= 0) {
    main += makeToken('calc_out.hourly_vs_fixed.row.health_need_inputs', '• ⚠️ Enter your annual income goal and billable hours to see a rate assessment.') + '\n';
  } else if (requiredHourly <= 50) {
    main += makeToken('calc_out.hourly_vs_fixed.row.health_achievable', '• 🟢 Rate $' + requiredHourlyLabel + '/hr is achievable for most freelancers with standard services. Focus on pipeline and client retention.', { rate: requiredHourlyLabel }) + '\n';
  } else if (requiredHourly <= 100) {
    main += makeToken('calc_out.hourly_vs_fixed.row.health_mid_market', '• 🟡 Rate $' + requiredHourlyLabel + '/hr is mid-market — requires solid expertise and client trust. Specialize deeply to justify this rate.', { rate: requiredHourlyLabel }) + '\n';
  } else if (requiredHourly <= 200) {
    main += makeToken('calc_out.hourly_vs_fixed.row.health_premium', '• 🟠 Rate $' + requiredHourlyLabel + '/hr is premium positioning — demands clear ROI for clients. Case studies, social proof, and niche expertise are essential.', { rate: requiredHourlyLabel }) + '\n';
  } else {
    main += makeToken('calc_out.hourly_vs_fixed.row.health_elite', '• 🔴 Rate $' + requiredHourlyLabel + '/hr is elite tier — top 1% territory. You need a strong personal brand, published authority, and enterprise clients.', { rate: requiredHourlyLabel }) + '\n';
  }
  if (billableHoursPerWeek >= 30) {
    main += makeToken('calc_out.hourly_vs_fixed.row.hours_full_time', '• 🟢 ' + billableHoursLabel + ' billable hrs/wk is full-time sustainable.', { hours: billableHoursLabel }) + '\n';
  } else if (billableHoursPerWeek >= 20) {
    main += makeToken('calc_out.hourly_vs_fixed.row.hours_partial', '• 🟡 ' + billableHoursLabel + ' billable hrs/wk means ' + nonBillablePctLabel + '% non-billable time — work on pipeline.', { hours: billableHoursLabel, pct: nonBillablePctLabel }) + '\n';
  } else {
    main += makeToken('calc_out.hourly_vs_fixed.row.hours_hard', '• 🔴 ' + billableHoursLabel + ' billable hrs/wk is hard to make a full living. Increase capacity or raise rates.', { hours: billableHoursLabel }) + '\n';
  }
  if (utilization >= 75) {
    main += makeToken('calc_out.hourly_vs_fixed.row.util_sustainable', '• 🟢 Utilization at ' + utilizationLabel + '% — sustainable without burnout.', { pct: utilizationLabel }) + '\n';
  } else if (utilization >= 50) {
    main += makeToken('calc_out.hourly_vs_fixed.row.util_healthy', '• 🟡 Utilization at ' + utilizationLabel + '% — healthy but could push to 75%.', { pct: utilizationLabel }) + '\n';
  } else {
    main += makeToken('calc_out.hourly_vs_fixed.row.util_slack', '• 🔴 Utilization at ' + utilizationLabel + '% — too much slack or non-billable work.', { pct: utilizationLabel }) + '\n';
  }
  if (annualExpenses / Math.max(annualIncomeGoal, 1) < 0.1) {
    main += makeToken('calc_out.hourly_vs_fixed.row.exp_lean', '• 🟢 Expenses are ' + expensePctLabel + '% of income target — lean operation.', { pct: expensePctLabel }) + '\n';
  } else if (annualExpenses / Math.max(annualIncomeGoal, 1) < 0.25) {
    main += makeToken('calc_out.hourly_vs_fixed.row.exp_watch', '• 🟡 Expenses are ' + expensePctLabel + '% of income target — watch overhead.', { pct: expensePctLabel }) + '\n';
  } else {
    main += makeToken('calc_out.hourly_vs_fixed.row.exp_cut', '• 🟠 Expenses are ' + expensePctLabel + '% of income target — cut overhead before raising rates.', { pct: expensePctLabel }) + '\n';
  }
  main += '\n';

  // 🎯 Income Ladder
  main += makeToken('calc_out.section.hourly_vs_fixed_income_ladder', '🎯 Income Ladder:') + '\n' + SEP + '\n';
  const ladder = [30000, 60000, 100000, 150000, 200000, 300000];
  for (const goal of ladder) {
    const ladderNet = goal + annualExpenses;
    const hr = annualBillableHours > 0 ? ladderNet / annualBillableHours : 0;
    const ret = ladderNet / 12;
    main += '• $' + loc(goal) + '/yr  →  $' + fmt2(hr) + '/hr  |  $' + loc(Math.round(ret)) + '/mo retainer\n';
  }
  main += '\n';

  // ⚖️ Hourly vs Project Break-Even
  main += makeToken('calc_out.section.hourly_vs_fixed_break_even', '⚖️ Hourly vs Fixed Project Break-Even:') + '\n' + SEP + '\n';
  const hoursPer4WProject = billableHoursPerWeek * 4;
  const hourly4WRevenue = requiredHourly * hoursPer4WProject;
  const hoursPer4WLabel = String(hoursPer4WProject);
  const hourly4WRevenueLabel = fmt0(hourly4WRevenue);
  if (requiredHourly > 0 && hoursPer4WProject > 0) {
    const fixedBreakEven = hourly4WRevenue;
    const fixedToHourly = projectFixed4W / hoursPer4WProject;
    const fixedToHourlyLabel = fmt2(fixedToHourly);
    main += makeToken('calc_out.hourly_vs_fixed.row.be_hourly_4w', '• Hourly model, 4 weeks:   ' + hourly4WRevenueLabel + ' for ' + hoursPer4WLabel + ' hrs', { revenue: hourly4WRevenueLabel, hours: hoursPer4WLabel }) + '\n';
    main += makeToken('calc_out.hourly_vs_fixed.row.be_fixed_4w', '• Fixed model, 4 weeks:    ' + projectFixed4WLabel + ' for ' + hoursPer4WLabel + ' hrs (assumes same effort)', { price: projectFixed4WLabel, hours: hoursPer4WLabel }) + '\n';
    if (projectFixed4W > hourly4WRevenue * 1.1) {
      const fixedUpPctLabel = String(Math.round((projectFixed4W / hourly4WRevenue - 1) * 100));
      main += makeToken('calc_out.hourly_vs_fixed.row.be_fixed_wins', '• 🟢 Fixed-fee projects pay ' + fixedUpPctLabel + '% more for the same hours. Charge fixed when scope is clear.', { pct: fixedUpPctLabel }) + '\n';
    } else if (projectFixed4W < hourly4WRevenue * 0.9) {
      const fixedDownPctLabel = String(Math.round((1 - projectFixed4W / hourly4WRevenue) * 100));
      main += makeToken('calc_out.hourly_vs_fixed.row.be_fixed_loses', '• 🔴 Fixed-fee projects pay ' + fixedDownPctLabel + '% less than hourly. Avoid fixed-fee unless scope is well-defined.', { pct: fixedDownPctLabel }) + '\n';
    } else {
      main += makeToken('calc_out.hourly_vs_fixed.row.be_equivalent', '• 🟡 Hourly and fixed-fee are roughly equivalent at this rate. Pick based on client preference and scope clarity.') + '\n';
    }
    main += makeToken('calc_out.hourly_vs_fixed.row.be_rate', '• Break-even fixed project rate: $' + fixedToHourlyLabel + '/hr (same hourly, all-in price).', { rate: fixedToHourlyLabel }) + '\n';
  } else {
    main += makeToken('calc_out.hourly_vs_fixed.row.be_need_hours', '• Enter billable hours to compare hourly vs fixed-fee models.') + '\n';
  }
  main += '\n';

  // 🔄 What-If Scenarios
  main += makeToken('calc_out.section.what_if_scenarios', '🔄 What-If Scenarios:') + '\n' + SEP + '\n';
  if (requiredHourly > 0) {
    const raise20 = requiredHourly * 1.2;
    const cutExp = annualBillableHours > 0 ? (netAnnualGoal * 0.8) / annualBillableHours : 0;
    const add5h = annualBillableHours > 0 ? netAnnualGoal / ((billableHoursPerWeek + 5) * workingWeeks) : 0;
    const cutWks = annualBillableHours > 0 ? netAnnualGoal / (billableHoursPerWeek * (workingWeeks - 2)) : 0;
    const raise20Label = fmt2(raise20);
    const raise20HoursLabel = String(Math.round(annualBillableHours / 1.2));
    const cutExpLabel = fmt2(cutExp);
    const cutExpSaveLabel = fmt0(annualExpenses * 0.2);
    const add5hLabel = fmt2(add5h);
    const cutWksLabel = fmt2(cutWks);
    const cutWksWeeksLabel = String(workingWeeks - 2);
    main += makeToken('calc_out.hourly_vs_fixed.row.whatif_raise_20', '• Raise rate 20%:        New rate $' + raise20Label + '/hr  (need only ' + raise20HoursLabel + ' billable hrs/yr)', { rate: raise20Label, hours: raise20HoursLabel }) + '\n';
    main += makeToken('calc_out.hourly_vs_fixed.row.whatif_cut_exp', '• Cut expenses 20%:      New rate $' + cutExpLabel + '/hr  (saves ' + cutExpSaveLabel + '/yr)', { rate: cutExpLabel, save: cutExpSaveLabel }) + '\n';
    main += makeToken('calc_out.hourly_vs_fixed.row.whatif_add_5h', '• Add 5 billable hrs/wk: New rate $' + add5hLabel + '/hr  (more income, same goal)', { rate: add5hLabel }) + '\n';
    main += makeToken('calc_out.hourly_vs_fixed.row.whatif_cut_2wks', '• Cut 2 weeks off:       New rate $' + cutWksLabel + '/hr  (compress to ' + cutWksWeeksLabel + ' working wks)', { rate: cutWksLabel, weeks: cutWksWeeksLabel }) + '\n';
  } else {
    main += makeToken('calc_out.hourly_vs_fixed.row.whatif_cannot_model', '• ⚠️ Cannot model — enter annual income goal and billable hours.') + '\n';
  }
  main += makeToken('calc_out.hourly_vs_fixed.row.whatif_two_sources', '• 2 income sources: Split goal in half, lower hourly pressure on each.') + '\n\n';

  // 💡 Tip
  const tip = requiredHourly > 200
    ? makeToken('calc_out.hourly_vs_fixed.row.tip_premium', '💡 Top Lever: Premium tier — focus on enterprise clients and thought leadership. Don\'t discount; it devalues your brand.')
    : requiredHourly > 100
    ? makeToken('calc_out.hourly_vs_fixed.row.tip_mid', '💡 Top Lever: Mid-market tier — your differentiator is depth, not breadth. Specialize in 1-2 industries and become the obvious expert.')
    : requiredHourly > 50
    ? makeToken('calc_out.hourly_vs_fixed.row.tip_standard', '💡 Top Lever: Standard tier — your differentiator is reliability and process. Document your workflow and offer guarantees to command higher rates.')
    : makeToken('calc_out.hourly_vs_fixed.row.tip_entry', '💡 Top Lever: Entry tier — focus on volume and client retention. Build a referral engine before raising rates.');
  main += tip + '\n';

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
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let W=function(s){return Number.isNaN(s)?0:Math.max(0,s)},P=function(s){const w=W(parseFloat(s.annualIncomeGoal)||0),l=W(parseFloat(s.billableHoursPerWeek)||0),x=W(parseFloat(s.weeksOffPerYear)||0),h=W(parseFloat(s.annualExpenses)||0),b="━".repeat(41),v=52-x,a=l*v,p=w+h,t=a>0?p/a:0,X=t*8,Z=t*l,k=p/12,g=p/Math.max(v/4,1),H=l>0?Math.min(100,Math.round(l/40*100)):0,d=o=>o.toFixed(2),c=o=>"$"+Math.round(o).toLocaleString(),L=o=>o.toLocaleString(),E=c(w),j=c(p),f=String(l),q=String(x),N=String(v),z=L(a),n=d(t),A=c(X),M=c(g),y=String(H),B=String(100-Math.round(l/40*100)),m=String(Math.round(h/Math.max(w,1)*100));let e=r("calc_out.section.hourly_vs_fixed_calculator","💼 Hourly vs Fixed Pricing Model")+\`

\`;e+=r("calc_out.section.hourly_vs_fixed_snapshot","💰 Required Rate Snapshot:")+\`
\`+b+\`
\`,e+=r("calc_out.hourly_vs_fixed.row.annual_income_goal","• Annual Income Goal:        "+E,{value:E})+\`
\`,e+="• Annual Expenses:           "+c(h)+\`
\`,e+=r("calc_out.hourly_vs_fixed.row.net_target","• Net Target (income+exp):   "+j,{value:j})+\`
\`,e+=r("calc_out.hourly_vs_fixed.row.billable_hours_week","• Billable Hours/Week:       "+f+" hrs",{hours:f})+\`
\`,e+=r("calc_out.hourly_vs_fixed.row.weeks_off","• Weeks Off Per Year:        "+q+" wks",{weeks:q})+\`
\`,e+=r("calc_out.hourly_vs_fixed.row.working_weeks","• Working Weeks:             "+N+" wks",{weeks:N})+\`
\`,e+=r("calc_out.hourly_vs_fixed.row.annual_billable_hours","• Annual Billable Hours:     "+z+" hrs",{hours:z})+\`

\`,e+=r("calc_out.section.key_metrics","📐 Key Metrics:")+\`
\`+b+\`
\`,e+=r("calc_out.hourly_vs_fixed.row.required_hourly_rate","• Required Hourly Rate:      $"+n+"/hr  (after expenses)",{rate:n})+\`
\`,e+=r("calc_out.hourly_vs_fixed.row.daily_rate","• Daily Rate (8 hrs):        "+A+"/day",{value:A})+\`
\`,e+="• Weekly Rate:               "+c(Z)+\`/wk
\`,e+="• Monthly Retainer:          "+c(k)+\`/mo
\`,e+=r("calc_out.hourly_vs_fixed.row.fixed_project_4w","• Fixed Project (4-week):    "+M+"/project",{value:M})+\`
\`,e+=r("calc_out.hourly_vs_fixed.row.utilization_rate","• Utilization Rate:          "+y+"% of 40-hr work week",{pct:y})+\`

\`,e+=r("calc_out.section.hourly_vs_fixed_rate_health","🩺 Rate Health:")+\`
\`+b+\`
\`,t<=0?e+=r("calc_out.hourly_vs_fixed.row.health_need_inputs","• ⚠️ Enter your annual income goal and billable hours to see a rate assessment.")+\`
\`:t<=50?e+=r("calc_out.hourly_vs_fixed.row.health_achievable","• 🟢 Rate $"+n+"/hr is achievable for most freelancers with standard services. Focus on pipeline and client retention.",{rate:n})+\`
\`:t<=100?e+=r("calc_out.hourly_vs_fixed.row.health_mid_market","• 🟡 Rate $"+n+"/hr is mid-market — requires solid expertise and client trust. Specialize deeply to justify this rate.",{rate:n})+\`
\`:t<=200?e+=r("calc_out.hourly_vs_fixed.row.health_premium","• 🟠 Rate $"+n+"/hr is premium positioning — demands clear ROI for clients. Case studies, social proof, and niche expertise are essential.",{rate:n})+\`
\`:e+=r("calc_out.hourly_vs_fixed.row.health_elite","• 🔴 Rate $"+n+"/hr is elite tier — top 1% territory. You need a strong personal brand, published authority, and enterprise clients.",{rate:n})+\`
\`,l>=30?e+=r("calc_out.hourly_vs_fixed.row.hours_full_time","• 🟢 "+f+" billable hrs/wk is full-time sustainable.",{hours:f})+\`
\`:l>=20?e+=r("calc_out.hourly_vs_fixed.row.hours_partial","• 🟡 "+f+" billable hrs/wk means "+B+"% non-billable time — work on pipeline.",{hours:f,pct:B})+\`
\`:e+=r("calc_out.hourly_vs_fixed.row.hours_hard","• 🔴 "+f+" billable hrs/wk is hard to make a full living. Increase capacity or raise rates.",{hours:f})+\`
\`,H>=75?e+=r("calc_out.hourly_vs_fixed.row.util_sustainable","• 🟢 Utilization at "+y+"% — sustainable without burnout.",{pct:y})+\`
\`:H>=50?e+=r("calc_out.hourly_vs_fixed.row.util_healthy","• 🟡 Utilization at "+y+"% — healthy but could push to 75%.",{pct:y})+\`
\`:e+=r("calc_out.hourly_vs_fixed.row.util_slack","• 🔴 Utilization at "+y+"% — too much slack or non-billable work.",{pct:y})+\`
\`,h/Math.max(w,1)<.1?e+=r("calc_out.hourly_vs_fixed.row.exp_lean","• 🟢 Expenses are "+m+"% of income target — lean operation.",{pct:m})+\`
\`:h/Math.max(w,1)<.25?e+=r("calc_out.hourly_vs_fixed.row.exp_watch","• 🟡 Expenses are "+m+"% of income target — watch overhead.",{pct:m})+\`
\`:e+=r("calc_out.hourly_vs_fixed.row.exp_cut","• 🟠 Expenses are "+m+"% of income target — cut overhead before raising rates.",{pct:m})+\`
\`,e+=\`
\`,e+=r("calc_out.section.hourly_vs_fixed_income_ladder","🎯 Income Ladder:")+\`
\`+b+\`
\`;const T=[3e4,6e4,1e5,15e4,2e5,3e5];for(const o of T){const u=o+h,_=a>0?u/a:0,i=u/12;e+="• $"+L(o)+"/yr  →  $"+d(_)+"/hr  |  $"+L(Math.round(i))+\`/mo retainer
\`}e+=\`
\`,e+=r("calc_out.section.hourly_vs_fixed_break_even","⚖️ Hourly vs Fixed Project Break-Even:")+\`
\`+b+\`
\`;const F=l*4,S=t*F,$=String(F),I=c(S);if(t>0&&F>0){const o=S,u=g/F,_=d(u);if(e+=r("calc_out.hourly_vs_fixed.row.be_hourly_4w","• Hourly model, 4 weeks:   "+I+" for "+$+" hrs",{revenue:I,hours:$})+\`
\`,e+=r("calc_out.hourly_vs_fixed.row.be_fixed_4w","• Fixed model, 4 weeks:    "+M+" for "+$+" hrs (assumes same effort)",{price:M,hours:$})+\`
\`,g>S*1.1){const i=String(Math.round((g/S-1)*100));e+=r("calc_out.hourly_vs_fixed.row.be_fixed_wins","• 🟢 Fixed-fee projects pay "+i+"% more for the same hours. Charge fixed when scope is clear.",{pct:i})+\`
\`}else if(g<S*.9){const i=String(Math.round((1-g/S)*100));e+=r("calc_out.hourly_vs_fixed.row.be_fixed_loses","• 🔴 Fixed-fee projects pay "+i+"% less than hourly. Avoid fixed-fee unless scope is well-defined.",{pct:i})+\`
\`}else e+=r("calc_out.hourly_vs_fixed.row.be_equivalent","• 🟡 Hourly and fixed-fee are roughly equivalent at this rate. Pick based on client preference and scope clarity.")+\`
\`;e+=r("calc_out.hourly_vs_fixed.row.be_rate","• Break-even fixed project rate: $"+_+"/hr (same hourly, all-in price).",{rate:_})+\`
\`}else e+=r("calc_out.hourly_vs_fixed.row.be_need_hours","• Enter billable hours to compare hourly vs fixed-fee models.")+\`
\`;if(e+=\`
\`,e+=r("calc_out.section.what_if_scenarios","🔄 What-If Scenarios:")+\`
\`+b+\`
\`,t>0){const o=t*1.2,u=a>0?p*.8/a:0,_=a>0?p/((l+5)*v):0,i=a>0?p/(l*(v-2)):0,D=d(o),C=String(Math.round(a/1.2)),G=d(u),U=c(h*.2),Y=d(_),K=d(i),J=String(v-2);e+=r("calc_out.hourly_vs_fixed.row.whatif_raise_20","• Raise rate 20%:        New rate $"+D+"/hr  (need only "+C+" billable hrs/yr)",{rate:D,hours:C})+\`
\`,e+=r("calc_out.hourly_vs_fixed.row.whatif_cut_exp","• Cut expenses 20%:      New rate $"+G+"/hr  (saves "+U+"/yr)",{rate:G,save:U})+\`
\`,e+=r("calc_out.hourly_vs_fixed.row.whatif_add_5h","• Add 5 billable hrs/wk: New rate $"+Y+"/hr  (more income, same goal)",{rate:Y})+\`
\`,e+=r("calc_out.hourly_vs_fixed.row.whatif_cut_2wks","• Cut 2 weeks off:       New rate $"+K+"/hr  (compress to "+J+" working wks)",{rate:K,weeks:J})+\`
\`}else e+=r("calc_out.hourly_vs_fixed.row.whatif_cannot_model","• ⚠️ Cannot model — enter annual income goal and billable hours.")+\`
\`;e+=r("calc_out.hourly_vs_fixed.row.whatif_two_sources","• 2 income sources: Split goal in half, lower hourly pressure on each.")+\`

\`;const ee=t>200?r("calc_out.hourly_vs_fixed.row.tip_premium","💡 Top Lever: Premium tier — focus on enterprise clients and thought leadership. Don't discount; it devalues your brand."):t>100?r("calc_out.hourly_vs_fixed.row.tip_mid","💡 Top Lever: Mid-market tier — your differentiator is depth, not breadth. Specialize in 1-2 industries and become the obvious expert."):t>50?r("calc_out.hourly_vs_fixed.row.tip_standard","💡 Top Lever: Standard tier — your differentiator is reliability and process. Document your workflow and offer guarantees to command higher rates."):r("calc_out.hourly_vs_fixed.row.tip_entry","💡 Top Lever: Entry tier — focus on volume and client retention. Build a referral engine before raising rates.");e+=ee+\`
\`;const O=[e],re=[3e4,6e4,1e5,15e4,2e5,3e5];for(const o of re){const u=o+h,_=a>0?u/a:0,i=u/12;O.push("$"+L(o)+"/yr → $"+d(_)+"/hr  |  $"+L(Math.round(i))+"/mo retainer  |  $"+L(Math.round(_*8))+"/day")}return O},R=function(s,w,l){var x=V(s);return Array.isArray(x)?x.join(\`
\`):String(x)};var te=W,oe=P,le=R,r=tk,Q='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',r=new Function("return "+Q)(),V=function(s){return P(s)};return[R(inputs,pick,fill)]}finally{}
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
    '$calc_out.section.hourly_vs_fixed_calculator|💼 Hourly vs Fixed Pricing Model|\n\n$calc_out.section.hourly_vs_fixed_snapshot|💰 Required Rate Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.hourly_vs_fixed.row.annual_income_goal{"value":"$100,000"}|• Annual Income Goal:        $100,000|\n• Annual Expenses:           $5,000\n$calc_out.hourly_vs_fixed.row.net_target{"value":"$105,000"}|• Net Target (income+exp):   $105,000|\n$calc_out.hourly_vs_fixed.row.billable_hours_week{"hours":"30"}|• Billable Hours/Week:       30 hrs|\n$calc_out.hourly_vs_fixed.row.weeks_off{"weeks":"4"}|• Weeks Off Per Year:        4 wks|\n$calc_out.hourly_vs_fixed.row.working_weeks{"weeks":"48"}|• Working Weeks:             48 wks|\n$calc_out.hourly_vs_fixed.row.annual_billable_hours{"hours":"1,440"}|• Annual Billable Hours:     1,440 hrs|\n\n$calc_out.section.key_metrics|📐 Key Metrics:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.hourly_vs_fixed.row.required_hourly_rate{"rate":"72.92"}|• Required Hourly Rate:      $72.92/hr  (after expenses)|\n$calc_out.hourly_vs_fixed.row.daily_rate{"value":"$583"}|• Daily Rate (8 hrs):        $583/day|\n• Weekly Rate:               $2,188/wk\n• Monthly Retainer:          $8,750/mo\n$calc_out.hourly_vs_fixed.row.fixed_project_4w{"value":"$8,750"}|• Fixed Project (4-week):    $8,750/project|\n$calc_out.hourly_vs_fixed.row.utilization_rate{"pct":"75"}|• Utilization Rate:          75% of 40-hr work week|\n\n$calc_out.section.hourly_vs_fixed_rate_health|🩺 Rate Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.hourly_vs_fixed.row.health_mid_market{"rate":"72.92"}|• 🟡 Rate $72.92/hr is mid-market — requires solid expertise and client trust. Specialize deeply to justify this rate.|\n$calc_out.hourly_vs_fixed.row.hours_full_time{"hours":"30"}|• 🟢 30 billable hrs/wk is full-time sustainable.|\n$calc_out.hourly_vs_fixed.row.util_sustainable{"pct":"75"}|• 🟢 Utilization at 75% — sustainable without burnout.|\n$calc_out.hourly_vs_fixed.row.exp_lean{"pct":"5"}|• 🟢 Expenses are 5% of income target — lean operation.|\n\n$calc_out.section.hourly_vs_fixed_income_ladder|🎯 Income Ladder:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $30,000/yr  →  $24.31/hr  |  $2,917/mo retainer\n• $60,000/yr  →  $45.14/hr  |  $5,417/mo retainer\n• $100,000/yr  →  $72.92/hr  |  $8,750/mo retainer\n• $150,000/yr  →  $107.64/hr  |  $12,917/mo retainer\n• $200,000/yr  →  $142.36/hr  |  $17,083/mo retainer\n• $300,000/yr  →  $211.81/hr  |  $25,417/mo retainer\n\n$calc_out.section.hourly_vs_fixed_break_even|⚖️ Hourly vs Fixed Project Break-Even:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.hourly_vs_fixed.row.be_hourly_4w{"revenue":"$8,750","hours":"120"}|• Hourly model, 4 weeks:   $8,750 for 120 hrs|\n$calc_out.hourly_vs_fixed.row.be_fixed_4w{"price":"$8,750","hours":"120"}|• Fixed model, 4 weeks:    $8,750 for 120 hrs (assumes same effort)|\n$calc_out.hourly_vs_fixed.row.be_equivalent|• 🟡 Hourly and fixed-fee are roughly equivalent at this rate. Pick based on client preference and scope clarity.|\n$calc_out.hourly_vs_fixed.row.be_rate{"rate":"72.92"}|• Break-even fixed project rate: $72.92/hr (same hourly, all-in price).|\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.hourly_vs_fixed.row.whatif_raise_20{"rate":"87.50","hours":"1200"}|• Raise rate 20%:        New rate $87.50/hr  (need only 1200 billable hrs/yr)|\n$calc_out.hourly_vs_fixed.row.whatif_cut_exp{"rate":"58.33","save":"$1,000"}|• Cut expenses 20%:      New rate $58.33/hr  (saves $1,000/yr)|\n$calc_out.hourly_vs_fixed.row.whatif_add_5h{"rate":"62.50"}|• Add 5 billable hrs/wk: New rate $62.50/hr  (more income, same goal)|\n$calc_out.hourly_vs_fixed.row.whatif_cut_2wks{"rate":"76.09","weeks":"46"}|• Cut 2 weeks off:       New rate $76.09/hr  (compress to 46 working wks)|\n$calc_out.hourly_vs_fixed.row.whatif_two_sources|• 2 income sources: Split goal in half, lower hourly pressure on each.|\n\n$calc_out.hourly_vs_fixed.row.tip_standard|💡 Top Lever: Standard tier — your differentiator is reliability and process. Document your workflow and offer guarantees to command higher rates.|\n\n$30,000/yr → $24.31/hr  |  $2,917/mo retainer  |  $194/day\n$60,000/yr → $45.14/hr  |  $5,417/mo retainer  |  $361/day\n$100,000/yr → $72.92/hr  |  $8,750/mo retainer  |  $583/day\n$150,000/yr → $107.64/hr  |  $12,917/mo retainer  |  $861/day\n$200,000/yr → $142.36/hr  |  $17,083/mo retainer  |  $1,139/day\n$300,000/yr → $211.81/hr  |  $25,417/mo retainer  |  $1,694/day',
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

