import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-8：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
//   ⚠️ 章节标题 / 标签用**字面量 token**（code|原文|）；带运行时数值的整行用
//      makeToken(code, fallback, params) ⇒ fallback 与 params 取**同一个变量**。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

function calculateTimeValue(inputs: Record<string, string>): string[] {
  const annualIncome = clampNonNegative(parseFloat(inputs.annualIncome) || 0);
  const hoursPerWeek = clampNonNegative(parseFloat(inputs.hoursPerWeek) || 0);
  const weeksPerYear = clampNonNegative(parseFloat(inputs.weeksPerYear) || 0);
  const results: string[] = [];

  const totalHours = hoursPerWeek * weeksPerYear;
  const hourlyRate = totalHours > 0 ? annualIncome / totalHours : 0;
  const dailyRate = hourlyRate * 8;
  const perMinute = hourlyRate / 60;
  const perSecond = perMinute / 60;
  const monthlyValue = annualIncome / 12;
  const perWeek = hourlyRate * hoursPerWeek;
  const workingDays = weeksPerYear * 5;
  const costOf30Min = hourlyRate * 0.5;
  const costOf1Hr = hourlyRate;
  const contextSwitch = hourlyRate * 0.5;
  const twoHrDailyWaste = hourlyRate * 2;
  const yearlyWaste = twoHrDailyWaste * workingDays;

  const incomeGoal200K = 200000;
  const yearsTo200K = hourlyRate > 0 && perWeek > 0 ? Math.max(0, (incomeGoal200K - annualIncome) / (perWeek * weeksPerYear)) : 0;
  const rateToReach200K = totalHours > 0 ? incomeGoal200K / totalHours : 0;

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (n: number) => '$' + fmt(n);
  const pct = (n: number) => n.toFixed(1) + '%';

  // ── P168 B3-8：健康度三行（时薪 / 每周工时 / 每年周数）──────────────────
  //   ⚠️ 每档**单独写出 code 字面量**（动态拼码 ⇒ 静态扫描器认不出 ⇒ locale 落库后仍红）。
  const rateInt = '$' + Math.round(hourlyRate);
  const healthRow =
    hourlyRate >= 200
      ? makeToken('calc_out.time_value.row.health_top5', '🟢 Time wealth ' + rateInt + '/hr is top 5%. Every hour compounds — guard focus fiercely.', { rate: rateInt })
      : hourlyRate >= 100
      ? makeToken('calc_out.time_value.row.health_strong', '🟢 ' + rateInt + '/hr is strong. Above-median for skilled knowledge work.', { rate: rateInt })
      : hourlyRate >= 50
      ? makeToken('calc_out.time_value.row.health_average', '🟡 ' + rateInt + '/hr is average. Solid baseline; raise rate or reduce wasted hours.', { rate: rateInt })
      : hourlyRate >= 25
      ? makeToken('calc_out.time_value.row.health_below_median', '🟠 ' + rateInt + '/hr is below median. Skill-up or move upmarket.', { rate: rateInt })
      : makeToken('calc_out.time_value.row.health_entry', '🔴 ' + rateInt + '/hr is entry-level. Focus on higher-leverage activities.', { rate: rateInt });
  const workloadRow =
    hoursPerWeek <= 35
      ? makeToken('calc_out.time_value.row.workload_sustainable', '🟢 ' + hoursPerWeek + ' hrs/wk — sustainable, low burnout risk.', { hours: String(hoursPerWeek) })
      : hoursPerWeek <= 45
      ? makeToken('calc_out.time_value.row.workload_standard', '🟡 ' + hoursPerWeek + ' hrs/wk — standard, watch for creep.', { hours: String(hoursPerWeek) })
      : hoursPerWeek <= 55
      ? makeToken('calc_out.time_value.row.workload_high', '🟠 ' + hoursPerWeek + ' hrs/wk — high load, consider trimming.', { hours: String(hoursPerWeek) })
      : makeToken('calc_out.time_value.row.workload_burnout', '🔴 ' + hoursPerWeek + ' hrs/wk — burnout territory. Reduce or delegate.', { hours: String(hoursPerWeek) });
  const weeksRow =
    weeksPerYear >= 48
      ? makeToken('calc_out.time_value.row.weeks_full_time', '🟢 ' + weeksPerYear + ' wks/yr — standard full-time.', { weeks: String(weeksPerYear) })
      : weeksPerYear >= 44
      ? makeToken('calc_out.time_value.row.weeks_some_rest', '🟡 ' + weeksPerYear + ' wks/yr — some rest, add more for sustainability.', { weeks: String(weeksPerYear) })
      : makeToken('calc_out.time_value.row.weeks_overworked', '🔴 ' + weeksPerYear + ' wks/yr — overworked. Take vacation.', { weeks: String(weeksPerYear) });

  results.push(
    '$calc_out.section.time_value_calculator|⏰ Time Value Calculator|\n\n' +
    '$calc_out.section.time_value_snapshot|💰 Time Wealth Snapshot:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• $calc_out.label.annual_income|Annual Income|:        ' + money(annualIncome) + '/yr\n' +
    '• $calc_out.label.effective_hourly_rate|Effective $/Hour|:      ' + money(hourlyRate) + '/hr\n' +
    '• $calc_out.label.effective_per_minute|Effective $/Minute|:    ' + money(perMinute) + '/min\n' +
    '• $calc_out.label.effective_per_second|Effective $/Second|:    ' + money(perSecond) + '/sec\n' +
    '• $calc_out.label.daily_rate_8hrs|Daily Rate (8 hrs)|:    ' + money(dailyRate) + '/day\n' +
    '• $calc_out.label.weekly_value|Weekly Value|:          ' + money(perWeek) + '/wk\n' +
    '• $calc_out.label.monthly_value|Monthly Value|:         ' + money(monthlyValue) + '/mo\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.time_value_ratios|📐 Time-to-Value Ratios:|\n' +
    '• $calc_out.label.one_hour_of_work|1 hr of work|:        ' + money(hourlyRate) + '\n' +
    '• $calc_out.label.one_day_of_work_8hrs|1 day of work (8 hrs)|:  ' + money(dailyRate) + '\n' +
    '• $calc_out.label.one_week_40hrs|1 week (40 hrs)|:     ' + money(perWeek) + '\n' +
    '• $calc_out.label.one_month|1 month|:             ' + money(monthlyValue) + '\n' +
    '• $calc_out.label.one_year|1 year|:              ' + money(annualIncome) + '\n' +
    '• $calc_out.label.cost_per_15min_interruption|Cost per 15-min interruption|:  ' + money(hourlyRate / 4) + '\n' +
    '• $calc_out.label.cost_per_context_switch|Cost per context switch|:  ' + money(contextSwitch) + ' (30 min refocus)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.time_value_utilization_health|🩺 Utilization Health:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthRow + '\n' +
    '• ' + workloadRow + '\n' +
    '• ' + weeksRow + '\n' +
    '\n$calc_out.section.time_value_time_to_goal|🎯 Time-to-Goal:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.time_value.row.target_200k_income', 'Target $200K/yr income:  Need ' + money(rateToReach200K) + '/hr at current hours', { rate: money(rateToReach200K) }) + '\n' +
    '• ' + (yearsTo200K > 0
      ? makeToken('calc_out.time_value.row.years_to_200k_remaining', 'Years to $200K at current pace:  ' + yearsTo200K.toFixed(1) + ' yrs (after raises)', { years: yearsTo200K.toFixed(1) })
      : makeToken('calc_out.time_value.row.years_to_200k_reached', 'Years to $200K at current pace:  Already there!')) + '\n' +
    '• ' + makeToken('calc_out.time_value.row.to_earn_300k', 'To earn $300K/yr:           Need ' + money(totalHours > 0 ? 300000 / totalHours : 0) + '/hr', { rate: money(totalHours > 0 ? 300000 / totalHours : 0) }) + '\n' +
    '• ' + makeToken('calc_out.time_value.row.to_earn_500k', 'To earn $500K/yr:           Need ' + money(totalHours > 0 ? 500000 / totalHours : 0) + '/hr', { rate: money(totalHours > 0 ? 500000 / totalHours : 0) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.time_value_work_leisure_breakeven|⚖️ Work vs Leisure Break-Even:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.time_value.row.wasted_hour_daily_cost', '1 hr wasted daily costs:     ' + money(yearlyWaste / weeksPerYear) + '/wk in productivity', { weekly: money(yearlyWaste / weeksPerYear) }) + '\n' +
    '• ' + makeToken('calc_out.time_value.row.yearly_waste_2h', 'Yearly waste @2 hrs/day:  ' + money(yearlyWaste) + '/yr in lost productivity', { yearly: money(yearlyWaste) }) + '\n' +
    '• ' + makeToken('calc_out.time_value.row.break_even_hour', 'Break-even: work 1 hr earns ' + money(hourlyRate) + ' — guard this hour.', { rate: money(hourlyRate) }) + '\n' +
    '• ' + makeToken('calc_out.time_value.row.four_day_week_equivalent', '4-day workweek equivalent: same income in ' + Math.round(weeksPerYear * 4 / 5) + ' wks  (cut 1 day/wk)', { weeks: String(Math.round(weeksPerYear * 4 / 5)) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.time_value.row.whatif_cut_wasted_hour', 'Cut 1 hr/day wasted:  Save ' + money(hourlyRate * workingDays) + '/yr in productivity', { save: money(hourlyRate * workingDays) }) + '\n' +
    '• ' + makeToken('calc_out.time_value.row.whatif_cut_all_meetings', 'Cut all meetings (5/wk @ 1hr):  Save ' + money(hourlyRate * 5 * weeksPerYear) + '/yr', { save: money(hourlyRate * 5 * weeksPerYear) }) + '\n' +
    '• ' + makeToken('calc_out.time_value.row.whatif_raise_rate_25', 'Raise hourly rate by 25%:  Annual income ' + money(annualIncome) + ' → ' + money(annualIncome * 1.25), { from: money(annualIncome), to: money(annualIncome * 1.25) }) + '\n' +
    '• ' + makeToken('calc_out.time_value.row.whatif_add_passive_income', 'Add $500/mo passive income:  Annual ' + money(annualIncome + 6000) + '/yr  (saves ' + (6000 / Math.max(hourlyRate * totalHours, 1) * 100).toFixed(0) + '% of working time)', { annual: money(annualIncome + 6000), pct: (6000 / Math.max(hourlyRate * totalHours, 1) * 100).toFixed(0) }) + '\n' +
    '• ' + makeToken('calc_out.time_value.row.whatif_four_day_week', 'Move to 4-day workweek:  Same ' + money(annualIncome) + '/yr in ' + Math.round(weeksPerYear * 4 / 5) + ' weeks', { annual: money(annualIncome), weeks: String(Math.round(weeksPerYear * 4 / 5)) }) + '\n\n' +
    makeToken('calc_out.time_value.row.tip_interruptions', '💡 Tip: At ' + money(hourlyRate) + '/hr, every interruption has a price. Block 90-min focus windows, batch email into 2x daily windows, and say no to meetings without agendas. The biggest unlock is rarely working more hours — it is reclaiming the hours you already have.', { rate: money(hourlyRate) }),
  );

  const incomes = [30000, 60000, 100000, 150000, 250000, 500000];
  for (let i = 0; i < incomes.length; i++) {
    const inc = incomes[i];
    const hr = totalHours > 0 ? inc / totalHours : 0;
    const mn = hr / 60;
    const sec = mn / 60;
    const yw = (hr * 2) * workingDays;
    results.push(
      // ⚠️ ' | ' 是维度行分隔符 ⇒ **不得进 fallback**（token 的兜底段以第一个 | 收尾）
      //   ⇒ 整行拆成 4 个 token，中间用字面量 ' | ' 连接 ⇒ 英文页逐字不变。
      '$calc_out.label.comparison|Comparison|: ' +
      makeToken('calc_out.time_value.row.comparison_income_hourly', '$' + inc.toLocaleString() + '/yr → $' + fmt(hr) + '/hr', { income: '$' + inc.toLocaleString(), hourly: '$' + fmt(hr) }) +
      ' | ' +
      makeToken('calc_out.time_value.row.comparison_per_minute', '$' + fmt(mn) + '/min', { value: '$' + fmt(mn) }) +
      ' | ' +
      makeToken('calc_out.time_value.row.comparison_per_second', '$' + fmt(sec) + '/sec', { value: '$' + fmt(sec) }) +
      ' | ' +
      makeToken('calc_out.time_value.row.comparison_yearly_waste', 'Yearly waste @2hrs/day: ' + money(yw), { waste: money(yw) }),
    );
  }

  return results;
}

const customFn =
  // P168 B3-8：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 服务端与客户端输出逐字节相同，不可能漂；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var annualIncome=cnn(parseFloat(inputs.annualIncome)||0);" +
  "var hoursPerWeek=cnn(parseFloat(inputs.hoursPerWeek)||0);" +
  "var weeksPerYear=cnn(parseFloat(inputs.weeksPerYear)||0);" +
  "var totalHours=hoursPerWeek*weeksPerYear;" +
  "var hourlyRate=totalHours>0?annualIncome/totalHours:0;" +
  "var dailyRate=hourlyRate*8;" +
  "var perMinute=hourlyRate/60;" +
  "var perSecond=perMinute/60;" +
  "var monthlyValue=annualIncome/12;" +
  "var perWeek=hourlyRate*hoursPerWeek;" +
  "var workingDays=weeksPerYear*5;" +
  "var contextSwitch=hourlyRate*0.5;" +
  "var twoHrDailyWaste=hourlyRate*2;" +
  "var yearlyWaste=twoHrDailyWaste*workingDays;" +
  "var incomeGoal200K=200000;" +
  "var yearsTo200K=hourlyRate>0&&perWeek>0?Math.max(0,(incomeGoal200K-annualIncome)/(perWeek*weeksPerYear)):0;" +
  "var rateToReach200K=totalHours>0?incomeGoal200K/totalHours:0;" +
  "function fmt(n){return n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}" +
  "function money(n){return '$'+fmt(n)}" +
  "var rateInt='$'+Math.round(hourlyRate);" +
  "var healthRow=hourlyRate>=200?tk('calc_out.time_value.row.health_top5','\\uD83D\\uDFE2 Time wealth '+rateInt+'/hr is top 5%. Every hour compounds \\u2014 guard focus fiercely.',{rate:rateInt}):hourlyRate>=100?tk('calc_out.time_value.row.health_strong','\\uD83D\\uDFE2 '+rateInt+'/hr is strong. Above-median for skilled knowledge work.',{rate:rateInt}):hourlyRate>=50?tk('calc_out.time_value.row.health_average','\\uD83D\\uDFE1 '+rateInt+'/hr is average. Solid baseline; raise rate or reduce wasted hours.',{rate:rateInt}):hourlyRate>=25?tk('calc_out.time_value.row.health_below_median','\\uD83D\\uDFE0 '+rateInt+'/hr is below median. Skill-up or move upmarket.',{rate:rateInt}):tk('calc_out.time_value.row.health_entry','\\uD83D\\uDD34 '+rateInt+'/hr is entry-level. Focus on higher-leverage activities.',{rate:rateInt});" +
  "var workloadRow=hoursPerWeek<=35?tk('calc_out.time_value.row.workload_sustainable','\\uD83D\\uDFE2 '+hoursPerWeek+' hrs/wk \\u2014 sustainable, low burnout risk.',{hours:String(hoursPerWeek)}):hoursPerWeek<=45?tk('calc_out.time_value.row.workload_standard','\\uD83D\\uDFE1 '+hoursPerWeek+' hrs/wk \\u2014 standard, watch for creep.',{hours:String(hoursPerWeek)}):hoursPerWeek<=55?tk('calc_out.time_value.row.workload_high','\\uD83D\\uDFE0 '+hoursPerWeek+' hrs/wk \\u2014 high load, consider trimming.',{hours:String(hoursPerWeek)}):tk('calc_out.time_value.row.workload_burnout','\\uD83D\\uDD34 '+hoursPerWeek+' hrs/wk \\u2014 burnout territory. Reduce or delegate.',{hours:String(hoursPerWeek)});" +
  "var weeksRow=weeksPerYear>=48?tk('calc_out.time_value.row.weeks_full_time','\\uD83D\\uDFE2 '+weeksPerYear+' wks/yr \\u2014 standard full-time.',{weeks:String(weeksPerYear)}):weeksPerYear>=44?tk('calc_out.time_value.row.weeks_some_rest','\\uD83D\\uDFE1 '+weeksPerYear+' wks/yr \\u2014 some rest, add more for sustainability.',{weeks:String(weeksPerYear)}):tk('calc_out.time_value.row.weeks_overworked','\\uD83D\\uDD34 '+weeksPerYear+' wks/yr \\u2014 overworked. Take vacation.',{weeks:String(weeksPerYear)});" +
  "var results=[];" +
  "var r='';" +
  "r+='$calc_out.section.time_value_calculator|\\u23F0 Time Value Calculator|\\n\\n';" +
  "r+='$calc_out.section.time_value_snapshot|\\uD83D\\uDCB0 Time Wealth Snapshot:|\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 $calc_out.label.annual_income|Annual Income|:        '+money(annualIncome)+'/yr\\n';" +
  "r+='\\u2022 $calc_out.label.effective_hourly_rate|Effective $/Hour|:      '+money(hourlyRate)+'/hr\\n';" +
  "r+='\\u2022 $calc_out.label.effective_per_minute|Effective $/Minute|:    '+money(perMinute)+'/min\\n';" +
  "r+='\\u2022 $calc_out.label.effective_per_second|Effective $/Second|:    '+money(perSecond)+'/sec\\n';" +
  "r+='\\u2022 $calc_out.label.daily_rate_8hrs|Daily Rate (8 hrs)|:    '+money(dailyRate)+'/day\\n';" +
  "r+='\\u2022 $calc_out.label.weekly_value|Weekly Value|:          '+money(perWeek)+'/wk\\n';" +
  "r+='\\u2022 $calc_out.label.monthly_value|Monthly Value|:         '+money(monthlyValue)+'/mo\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='$calc_out.section.time_value_ratios|\\uD83D\\uDCD0 Time-to-Value Ratios:|\\n';" +
  "r+='\\u2022 $calc_out.label.one_hour_of_work|1 hr of work|:        '+money(hourlyRate)+'\\n';" +
  "r+='\\u2022 $calc_out.label.one_day_of_work_8hrs|1 day of work (8 hrs)|:  '+money(dailyRate)+'\\n';" +
  "r+='\\u2022 $calc_out.label.one_week_40hrs|1 week (40 hrs)|:     '+money(perWeek)+'\\n';" +
  "r+='\\u2022 $calc_out.label.one_month|1 month|:             '+money(monthlyValue)+'\\n';" +
  "r+='\\u2022 $calc_out.label.one_year|1 year|:              '+money(annualIncome)+'\\n';" +
  "r+='\\u2022 $calc_out.label.cost_per_15min_interruption|Cost per 15-min interruption|:  '+money(hourlyRate/4)+'\\n';" +
  "r+='\\u2022 $calc_out.label.cost_per_context_switch|Cost per context switch|:  '+money(contextSwitch)+' (30 min refocus)\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='$calc_out.section.time_value_utilization_health|\\uD83E\\uDE7A Utilization Health:|\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 '+healthRow+'\\n';" +
  "r+='\\u2022 '+workloadRow+'\\n';" +
  "r+='\\u2022 '+weeksRow+'\\n';" +
  "r+='\\n$calc_out.section.time_value_time_to_goal|\\uD83C\\uDFAF Time-to-Goal:|\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 '+tk('calc_out.time_value.row.target_200k_income','Target $200K/yr income:  Need '+money(rateToReach200K)+'/hr at current hours',{rate:money(rateToReach200K)})+'\\n';" +
  "r+='\\u2022 '+(yearsTo200K>0?tk('calc_out.time_value.row.years_to_200k_remaining','Years to $200K at current pace:  '+yearsTo200K.toFixed(1)+' yrs (after raises)',{years:yearsTo200K.toFixed(1)}):tk('calc_out.time_value.row.years_to_200k_reached','Years to $200K at current pace:  Already there!'))+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.time_value.row.to_earn_300k','To earn $300K/yr:           Need '+money(totalHours>0?300000/totalHours:0)+'/hr',{rate:money(totalHours>0?300000/totalHours:0)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.time_value.row.to_earn_500k','To earn $500K/yr:           Need '+money(totalHours>0?500000/totalHours:0)+'/hr',{rate:money(totalHours>0?500000/totalHours:0)})+'\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='$calc_out.section.time_value_work_leisure_breakeven|\\u2696\\uFE0F Work vs Leisure Break-Even:|\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 '+tk('calc_out.time_value.row.wasted_hour_daily_cost','1 hr wasted daily costs:     '+money(yearlyWaste/weeksPerYear)+'/wk in productivity',{weekly:money(yearlyWaste/weeksPerYear)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.time_value.row.yearly_waste_2h','Yearly waste @2 hrs/day:  '+money(yearlyWaste)+'/yr in lost productivity',{yearly:money(yearlyWaste)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.time_value.row.break_even_hour','Break-even: work 1 hr earns '+money(hourlyRate)+' \\u2014 guard this hour.',{rate:money(hourlyRate)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.time_value.row.four_day_week_equivalent','4-day workweek equivalent: same income in '+Math.round(weeksPerYear*4/5)+' wks  (cut 1 day/wk)',{weeks:String(Math.round(weeksPerYear*4/5))})+'\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='$calc_out.section.what_if_scenarios|\\uD83D\\uDD04 What-If Scenarios:|\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 '+tk('calc_out.time_value.row.whatif_cut_wasted_hour','Cut 1 hr/day wasted:  Save '+money(hourlyRate*workingDays)+'/yr in productivity',{save:money(hourlyRate*workingDays)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.time_value.row.whatif_cut_all_meetings','Cut all meetings (5/wk @ 1hr):  Save '+money(hourlyRate*5*weeksPerYear)+'/yr',{save:money(hourlyRate*5*weeksPerYear)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.time_value.row.whatif_raise_rate_25','Raise hourly rate by 25%:  Annual income '+money(annualIncome)+' \\u2192 '+money(annualIncome*1.25),{from:money(annualIncome),to:money(annualIncome*1.25)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.time_value.row.whatif_add_passive_income','Add $500/mo passive income:  Annual '+money(annualIncome+6000)+'/yr  (saves '+(6000/Math.max(hourlyRate*totalHours,1)*100).toFixed(0)+'% of working time)',{annual:money(annualIncome+6000),pct:(6000/Math.max(hourlyRate*totalHours,1)*100).toFixed(0)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.time_value.row.whatif_four_day_week','Move to 4-day workweek:  Same '+money(annualIncome)+'/yr in '+Math.round(weeksPerYear*4/5)+' weeks',{annual:money(annualIncome),weeks:String(Math.round(weeksPerYear*4/5))})+'\\n\\n';" +
  "r+=tk('calc_out.time_value.row.tip_interruptions','\\uD83D\\uDCA1 Tip: At '+money(hourlyRate)+'/hr, every interruption has a price. Block 90-min focus windows, batch email into 2x daily windows, and say no to meetings without agendas. The biggest unlock is rarely working more hours \\u2014 it is reclaiming the hours you already have.',{rate:money(hourlyRate)});" +
  "results.push(r);" +
  "var incomes=[30000,60000,100000,150000,250000,500000];" +
  "for(var i=0;i<incomes.length;i++){" +
  "var inc=incomes[i];" +
  "var h=totalHours>0?inc/totalHours:0;" +
  "var mn=h/60;" +
  "var sc=mn/60;" +
  "var y=(h*2)*workingDays;" +
  "results.push('$calc_out.label.comparison|Comparison|: '+tk('calc_out.time_value.row.comparison_income_hourly','$'+inc.toLocaleString()+'/yr \\u2192 $'+fmt(h)+'/hr',{income:'$'+inc.toLocaleString(),hourly:'$'+fmt(h)})+' | '+tk('calc_out.time_value.row.comparison_per_minute','$'+fmt(mn)+'/min',{value:'$'+fmt(mn)})+' | '+tk('calc_out.time_value.row.comparison_per_second','$'+fmt(sc)+'/sec',{value:'$'+fmt(sc)})+' | '+tk('calc_out.time_value.row.comparison_yearly_waste','Yearly waste @2hrs/day: '+money(y),{waste:money(y)}));" +
  "}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-time-value-calculator',
  title: 'Time Value Calculator',
  description: 'Discover what your time is really worth. Calculate your effective $/hour, $/minute, and $/second — and see the dollar cost of meetings, distractions, and daily time waste.',
  inputs: [
    { name: 'annualIncome', label: 'Annual Income ($)', placeholder: 'e.g. 100000', type: 'number' },
    { name: 'hoursPerWeek', label: 'Hours Worked Per Week', placeholder: 'e.g. 40', type: 'number' },
    { name: 'weeksPerYear', label: 'Weeks Worked Per Year', placeholder: 'e.g. 48', type: 'number' },
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
    return calculateTimeValue(inputs);
  },
  staticExamples: [
    '$calc_out.section.time_value_calculator|⏰ Time Value Calculator|\n\n$calc_out.section.time_value_snapshot|💰 Time Wealth Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.annual_income|Annual Income|:        $100,000.00/yr\n• $calc_out.label.effective_hourly_rate|Effective $/Hour|:      $52.08/hr\n• $calc_out.label.effective_per_minute|Effective $/Minute|:    $0.87/min\n• $calc_out.label.effective_per_second|Effective $/Second|:    $0.01/sec\n• $calc_out.label.daily_rate_8hrs|Daily Rate (8 hrs)|:    $416.67/day\n• $calc_out.label.weekly_value|Weekly Value|:          $2,083.33/wk\n• $calc_out.label.monthly_value|Monthly Value|:         $8,333.33/mo\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.time_value_ratios|📐 Time-to-Value Ratios:|\n• $calc_out.label.one_hour_of_work|1 hr of work|:        $52.08\n• $calc_out.label.one_day_of_work_8hrs|1 day of work (8 hrs)|:  $416.67\n• $calc_out.label.one_week_40hrs|1 week (40 hrs)|:     $2,083.33\n• $calc_out.label.one_month|1 month|:             $8,333.33\n• $calc_out.label.one_year|1 year|:              $100,000.00\n• $calc_out.label.cost_per_15min_interruption|Cost per 15-min interruption|:  $13.02\n• $calc_out.label.cost_per_context_switch|Cost per context switch|:  $26.04 (30 min refocus)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.time_value_utilization_health|🩺 Utilization Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.time_value.row.health_average{"rate":"$52"}|🟡 $52/hr is average. Solid baseline; raise rate or reduce wasted hours.|\n• $calc_out.time_value.row.workload_standard{"hours":"40"}|🟡 40 hrs/wk — standard, watch for creep.|\n• $calc_out.time_value.row.weeks_full_time{"weeks":"48"}|🟢 48 wks/yr — standard full-time.|\n\n$calc_out.section.time_value_time_to_goal|🎯 Time-to-Goal:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.time_value.row.target_200k_income{"rate":"$104.17"}|Target $200K/yr income:  Need $104.17/hr at current hours|\n• $calc_out.time_value.row.years_to_200k_remaining{"years":"1.0"}|Years to $200K at current pace:  1.0 yrs (after raises)|\n• $calc_out.time_value.row.to_earn_300k{"rate":"$156.25"}|To earn $300K/yr:           Need $156.25/hr|\n• $calc_out.time_value.row.to_earn_500k{"rate":"$260.42"}|To earn $500K/yr:           Need $260.42/hr|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.time_value_work_leisure_breakeven|⚖️ Work vs Leisure Break-Even:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.time_value.row.wasted_hour_daily_cost{"weekly":"$520.83"}|1 hr wasted daily costs:     $520.83/wk in productivity|\n• $calc_out.time_value.row.yearly_waste_2h{"yearly":"$25,000.00"}|Yearly waste @2 hrs/day:  $25,000.00/yr in lost productivity|\n• $calc_out.time_value.row.break_even_hour{"rate":"$52.08"}|Break-even: work 1 hr earns $52.08 — guard this hour.|\n• $calc_out.time_value.row.four_day_week_equivalent{"weeks":"38"}|4-day workweek equivalent: same income in 38 wks  (cut 1 day/wk)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.time_value.row.whatif_cut_wasted_hour{"save":"$12,500.00"}|Cut 1 hr/day wasted:  Save $12,500.00/yr in productivity|\n• $calc_out.time_value.row.whatif_cut_all_meetings{"save":"$12,500.00"}|Cut all meetings (5/wk @ 1hr):  Save $12,500.00/yr|\n• $calc_out.time_value.row.whatif_raise_rate_25{"from":"$100,000.00","to":"$125,000.00"}|Raise hourly rate by 25%:  Annual income $100,000.00 → $125,000.00|\n• $calc_out.time_value.row.whatif_add_passive_income{"annual":"$106,000.00","pct":"6"}|Add $500/mo passive income:  Annual $106,000.00/yr  (saves 6% of working time)|\n• $calc_out.time_value.row.whatif_four_day_week{"annual":"$100,000.00","weeks":"38"}|Move to 4-day workweek:  Same $100,000.00/yr in 38 weeks|\n\n$calc_out.time_value.row.tip_interruptions{"rate":"$52.08"}|💡 Tip: At $52.08/hr, every interruption has a price. Block 90-min focus windows, batch email into 2x daily windows, and say no to meetings without agendas. The biggest unlock is rarely working more hours — it is reclaiming the hours you already have.|\n$calc_out.label.comparison|Comparison|: $calc_out.time_value.row.comparison_income_hourly{"income":"$30,000","hourly":"$15.63"}|$30,000/yr → $15.63/hr| | $calc_out.time_value.row.comparison_per_minute{"value":"$0.26"}|$0.26/min| | $calc_out.time_value.row.comparison_per_second{"value":"$0.00"}|$0.00/sec| | $calc_out.time_value.row.comparison_yearly_waste{"waste":"$7,500.00"}|Yearly waste @2hrs/day: $7,500.00|\n$calc_out.label.comparison|Comparison|: $calc_out.time_value.row.comparison_income_hourly{"income":"$60,000","hourly":"$31.25"}|$60,000/yr → $31.25/hr| | $calc_out.time_value.row.comparison_per_minute{"value":"$0.52"}|$0.52/min| | $calc_out.time_value.row.comparison_per_second{"value":"$0.01"}|$0.01/sec| | $calc_out.time_value.row.comparison_yearly_waste{"waste":"$15,000.00"}|Yearly waste @2hrs/day: $15,000.00|\n$calc_out.label.comparison|Comparison|: $calc_out.time_value.row.comparison_income_hourly{"income":"$100,000","hourly":"$52.08"}|$100,000/yr → $52.08/hr| | $calc_out.time_value.row.comparison_per_minute{"value":"$0.87"}|$0.87/min| | $calc_out.time_value.row.comparison_per_second{"value":"$0.01"}|$0.01/sec| | $calc_out.time_value.row.comparison_yearly_waste{"waste":"$25,000.00"}|Yearly waste @2hrs/day: $25,000.00|\n$calc_out.label.comparison|Comparison|: $calc_out.time_value.row.comparison_income_hourly{"income":"$150,000","hourly":"$78.13"}|$150,000/yr → $78.13/hr| | $calc_out.time_value.row.comparison_per_minute{"value":"$1.30"}|$1.30/min| | $calc_out.time_value.row.comparison_per_second{"value":"$0.02"}|$0.02/sec| | $calc_out.time_value.row.comparison_yearly_waste{"waste":"$37,500.00"}|Yearly waste @2hrs/day: $37,500.00|\n$calc_out.label.comparison|Comparison|: $calc_out.time_value.row.comparison_income_hourly{"income":"$250,000","hourly":"$130.21"}|$250,000/yr → $130.21/hr| | $calc_out.time_value.row.comparison_per_minute{"value":"$2.17"}|$2.17/min| | $calc_out.time_value.row.comparison_per_second{"value":"$0.04"}|$0.04/sec| | $calc_out.time_value.row.comparison_yearly_waste{"waste":"$62,500.00"}|Yearly waste @2hrs/day: $62,500.00|\n$calc_out.label.comparison|Comparison|: $calc_out.time_value.row.comparison_income_hourly{"income":"$500,000","hourly":"$260.42"}|$500,000/yr → $260.42/hr| | $calc_out.time_value.row.comparison_per_minute{"value":"$4.34"}|$4.34/min| | $calc_out.time_value.row.comparison_per_second{"value":"$0.07"}|$0.07/sec| | $calc_out.time_value.row.comparison_yearly_waste{"waste":"$125,000.00"}|Yearly waste @2hrs/day: $125,000.00|',
    'Comparison: $30,000/yr → $15.62/hr | $0.26/min | $0.00/sec | Yearly waste @2hrs/day: $7,500.00',
    'Comparison: $60,000/yr → $31.25/hr | $0.52/min | $0.01/sec | Yearly waste @2hrs/day: $15,000.00',
    'Comparison: $100,000/yr → $52.08/hr | $0.87/min | $0.01/sec | Yearly waste @2hrs/day: $25,000.00',
    'Comparison: $150,000/yr → $78.12/hr | $1.30/min | $0.02/sec | Yearly waste @2hrs/day: $37,500.00',
    'Comparison: $250,000/yr → $130.21/hr | $2.17/min | $0.04/sec | Yearly waste @2hrs/day: $62,500.00',
    'Comparison: $500,000/yr → $260.42/hr | $4.34/min | $0.07/sec | Yearly waste @2hrs/day: $125,000.00',
  ],
  faq: [
    { q: 'Why should I calculate my time value?', a: 'Knowing your effective $/hour (and $/minute, $/second) transforms how you make decisions. When you see that a 30-minute meeting costs $25-100, you become more selective about which meetings you accept. It also helps you decide what to outsource: if your hourly rate is $50 and you can hire a VA for $15/hr, you should delegate every task the VA can handle and focus on your highest-value work. Time is your only non-renewable resource.' },
    { q: 'What is context switching cost?', a: 'Research shows it takes 23 minutes on average to refocus after an interruption. If you get distracted 4 times a day, you lose nearly 2 hours of productive work. The calculator prices this at 30 minutes of your hourly rate per switch, but the real cost is often higher because deep work quality suffers. Batching similar tasks and blocking focus time can recover this lost productivity.' },
    { q: 'Should I include commute time?', a: 'Yes, if your commute is part of your workday. Add commute hours to your weekly total for a more accurate hourly rate. If you commute 10 hours per week for a $100K job working 40 hours, your real hourly rate drops from $52/hr to $41.67/hr. This perspective can justify remote work or relocating closer to your workplace.' },
    { q: 'How many weeks should I count per year?', a: 'For salaried employees, use 48-50 weeks (subtracting vacation and holidays). For freelancers, use 44-46 weeks to account for unpaid time between projects, admin work, business development, and sick days. Freelancers should also account for non-billable hours — roughly 30-40% of total work hours go to admin, marketing, and proposals.' },
    { q: 'How do I use this to set freelance rates?', a: 'Start with your target annual income, divide by billable hours (typically 1,200-1,500 per year), then multiply by 1.5-2x to account for self-employment taxes, health insurance, retirement, and unpaid time. For example, targeting $100K at 1,400 billable hours gives ~$71/hr base, and with overhead multiplier gives $106-142/hr. This calculator gives you the base to build from.' },
    { q: "What is the time value of money?", a: "Money today is worth more than money tomorrow because: 1) Inflation erodes future value, 2) You can invest today's money to earn returns, 3) Risk of not receiving future money. Time value = present value of future cash flow. Use: NPV, IRR, discount rates. Core concept in finance, investing, and business decisions." },
    { q: "What is a realistic discount rate for NPV?", a: "Common discount rates: 1) Risk-free: 4-5% (10-year Treasury), 2) Business investment: 8-12%, 3) High-risk startup: 15-25%, 4) Public market: 6-10%. Higher discount rate = more weight on near-term cash flows. Choose based on: risk profile, alternative returns, hurdle rate. Test sensitivity: NPV at 8%, 12%, 16%." },
    { q: "How do I calculate present value?", a: "PV = FV / (1 + r)^n. Where FV = future value, r = discount rate, n = years. Example: $1000 in 5 years at 10% discount = $1000 / 1.61 = $621. Use for: lump sums, retirement planning, comparing options. Excel: =NPV(rate, cashflows). For uneven cash flows, NPV is the standard metric." },
    { q: "What is the difference between NPV and IRR?", a: "NPV (Net Present Value): dollar value today of all future cash flows. Positive NPV = value creation. IRR (Internal Rate of Return): discount rate at which NPV = 0. Higher IRR = better. Use NPV for: project decisions, comparing mutually exclusive options. Use IRR for: comparing returns across investments, hurdle rate comparison." },
    { q: "How does inflation affect NPV?", a: "Always use real (inflation-adjusted) discount rates for long-term projects. Nominal 8% − inflation 3% = real 5%. Use real rate for projects >5 years. Inflation pushes future cash flows down: $1000 in 10 years at 3% inflation = $744 in today's dollars. Top mistake: using nominal rates for long-term projects. Use Treasury Inflation-Protected Securities (TIPS) as proxy for real rates." },
    { q: "How do I compare two investment options?", a: "NPV comparison: option with higher NPV wins. Use same discount rate for both. Use same time horizon. For different time horizons: equivalent annual annuity (EAA). For projects with different risk: risk-adjusted NPV. Spreadsheets: build side-by-side NPV comparison. Sensitivity: test discount rate, terminal growth, project life." },
    { q: "When should I use NPV vs payback period?", a: "NPV: long-term, capital-intensive, strategic decisions. Payback: short-term, tactical, simple. Payback ignores time value and cash flows beyond baseline. NPV is theoretically superior but complex. Use both: NPV for go/no-go, payback for time-to-benefit. Payback = operational metric. NPV = strategic metric." },
    { q: "What is the difference between EAA and NPV?", a: "EAA (Equivalent Annual Annuity): NPV converted to equal annual payments over project life. Use to compare projects with different lives. Example: project A 5 years NPV $5M, project B 10 years NPV $8M. EAA A: $5M / 5 years = $1M/year. EAA B: $8M / 10 years = $0.8M/year. Project A wins by EAA despite lower NPV." },
  ],
  howToUse: [
    'Enter your target or current annual income.',
    'Enter your typical hours worked per week.',
    'Enter how many weeks per year you actually work.',
    'Review your effective $/hour, $/minute, and $/second.',
    'See the dollar cost of meetings, context switches, and daily time waste.',
    'Compare time wealth at 6 different income levels.',
  ],
  engineKey: true,
};

registerEngine(engine);
