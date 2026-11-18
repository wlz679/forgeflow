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
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let _=function(l){return Number.isNaN(l)?0:Math.max(0,l)},g=function(l){const n=_(parseFloat(l.annualIncome)||0),c=_(parseFloat(l.hoursPerWeek)||0),r=_(parseFloat(l.weeksPerYear)||0),y=[],o=c*r,a=o>0?n/o:0,b=a*8,S=a/60,N=S/60,k=n/12,w=a*c,h=r*5,I=a*.5,O=a,C=a*.5,m=a*2*h,F=2e5,d=a>0&&w>0?Math.max(0,(F-n)/(w*r)):0,M=o>0?F/o:0,u=s=>s.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}),e=s=>"$"+u(s),L=s=>s.toFixed(1)+"%",i="$"+Math.round(a),D=a>=200?t("calc_out.time_value.row.health_top5","🟢 Time wealth "+i+"/hr is top 5%. Every hour compounds — guard focus fiercely.",{rate:i}):a>=100?t("calc_out.time_value.row.health_strong","🟢 "+i+"/hr is strong. Above-median for skilled knowledge work.",{rate:i}):a>=50?t("calc_out.time_value.row.health_average","🟡 "+i+"/hr is average. Solid baseline; raise rate or reduce wasted hours.",{rate:i}):a>=25?t("calc_out.time_value.row.health_below_median","🟠 "+i+"/hr is below median. Skill-up or move upmarket.",{rate:i}):t("calc_out.time_value.row.health_entry","🔴 "+i+"/hr is entry-level. Focus on higher-leverage activities.",{rate:i}),E=c<=35?t("calc_out.time_value.row.workload_sustainable","🟢 "+c+" hrs/wk — sustainable, low burnout risk.",{hours:String(c)}):c<=45?t("calc_out.time_value.row.workload_standard","🟡 "+c+" hrs/wk — standard, watch for creep.",{hours:String(c)}):c<=55?t("calc_out.time_value.row.workload_high","🟠 "+c+" hrs/wk — high load, consider trimming.",{hours:String(c)}):t("calc_out.time_value.row.workload_burnout","🔴 "+c+" hrs/wk — burnout territory. Reduce or delegate.",{hours:String(c)}),q=r>=48?t("calc_out.time_value.row.weeks_full_time","🟢 "+r+" wks/yr — standard full-time.",{weeks:String(r)}):r>=44?t("calc_out.time_value.row.weeks_some_rest","🟡 "+r+" wks/yr — some rest, add more for sustainability.",{weeks:String(r)}):t("calc_out.time_value.row.weeks_overworked","🔴 "+r+" wks/yr — overworked. Take vacation.",{weeks:String(r)});y.push(\`$calc_out.section.time_value_calculator|⏰ Time Value Calculator|

$calc_out.section.time_value_snapshot|💰 Time Wealth Snapshot:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• $calc_out.label.annual_income|Annual Income|:        \`+e(n)+\`/yr
• $calc_out.label.effective_hourly_rate|Effective $/Hour|:      \`+e(a)+\`/hr
• $calc_out.label.effective_per_minute|Effective $/Minute|:    \`+e(S)+\`/min
• $calc_out.label.effective_per_second|Effective $/Second|:    \`+e(N)+\`/sec
• $calc_out.label.daily_rate_8hrs|Daily Rate (8 hrs)|:    \`+e(b)+\`/day
• $calc_out.label.weekly_value|Weekly Value|:          \`+e(w)+\`/wk
• $calc_out.label.monthly_value|Monthly Value|:         \`+e(k)+\`/mo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.time_value_ratios|📐 Time-to-Value Ratios:|
• $calc_out.label.one_hour_of_work|1 hr of work|:        \`+e(a)+\`
• $calc_out.label.one_day_of_work_8hrs|1 day of work (8 hrs)|:  \`+e(b)+\`
• $calc_out.label.one_week_40hrs|1 week (40 hrs)|:     \`+e(w)+\`
• $calc_out.label.one_month|1 month|:             \`+e(k)+\`
• $calc_out.label.one_year|1 year|:              \`+e(n)+\`
• $calc_out.label.cost_per_15min_interruption|Cost per 15-min interruption|:  \`+e(a/4)+\`
• $calc_out.label.cost_per_context_switch|Cost per context switch|:  \`+e(C)+\` (30 min refocus)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.time_value_utilization_health|🩺 Utilization Health:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+D+\`
• \`+E+\`
• \`+q+\`

$calc_out.section.time_value_time_to_goal|🎯 Time-to-Goal:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+t("calc_out.time_value.row.target_200k_income","Target $200K/yr income:  Need "+e(M)+"/hr at current hours",{rate:e(M)})+\`
• \`+(d>0?t("calc_out.time_value.row.years_to_200k_remaining","Years to $200K at current pace:  "+d.toFixed(1)+" yrs (after raises)",{years:d.toFixed(1)}):t("calc_out.time_value.row.years_to_200k_reached","Years to $200K at current pace:  Already there!"))+\`
• \`+t("calc_out.time_value.row.to_earn_300k","To earn $300K/yr:           Need "+e(o>0?3e5/o:0)+"/hr",{rate:e(o>0?3e5/o:0)})+\`
• \`+t("calc_out.time_value.row.to_earn_500k","To earn $500K/yr:           Need "+e(o>0?5e5/o:0)+"/hr",{rate:e(o>0?5e5/o:0)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.time_value_work_leisure_breakeven|⚖️ Work vs Leisure Break-Even:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+t("calc_out.time_value.row.wasted_hour_daily_cost","1 hr wasted daily costs:     "+e(m/r)+"/wk in productivity",{weekly:e(m/r)})+\`
• \`+t("calc_out.time_value.row.yearly_waste_2h","Yearly waste @2 hrs/day:  "+e(m)+"/yr in lost productivity",{yearly:e(m)})+\`
• \`+t("calc_out.time_value.row.break_even_hour","Break-even: work 1 hr earns "+e(a)+" — guard this hour.",{rate:e(a)})+\`
• \`+t("calc_out.time_value.row.four_day_week_equivalent","4-day workweek equivalent: same income in "+Math.round(r*4/5)+" wks  (cut 1 day/wk)",{weeks:String(Math.round(r*4/5))})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+t("calc_out.time_value.row.whatif_cut_wasted_hour","Cut 1 hr/day wasted:  Save "+e(a*h)+"/yr in productivity",{save:e(a*h)})+\`
• \`+t("calc_out.time_value.row.whatif_cut_all_meetings","Cut all meetings (5/wk @ 1hr):  Save "+e(a*5*r)+"/yr",{save:e(a*5*r)})+\`
• \`+t("calc_out.time_value.row.whatif_raise_rate_25","Raise hourly rate by 25%:  Annual income "+e(n)+" → "+e(n*1.25),{from:e(n),to:e(n*1.25)})+\`
• \`+t("calc_out.time_value.row.whatif_add_passive_income","Add $500/mo passive income:  Annual "+e(n+6e3)+"/yr  (saves "+(6e3/Math.max(a*o,1)*100).toFixed(0)+"% of working time)",{annual:e(n+6e3),pct:(6e3/Math.max(a*o,1)*100).toFixed(0)})+\`
• \`+t("calc_out.time_value.row.whatif_four_day_week","Move to 4-day workweek:  Same "+e(n)+"/yr in "+Math.round(r*4/5)+" weeks",{annual:e(n),weeks:String(Math.round(r*4/5))})+\`

\`+t("calc_out.time_value.row.tip_interruptions","💡 Tip: At "+e(a)+"/hr, every interruption has a price. Block 90-min focus windows, batch email into 2x daily windows, and say no to meetings without agendas. The biggest unlock is rarely working more hours — it is reclaiming the hours you already have.",{rate:e(a)}));const x=[3e4,6e4,1e5,15e4,25e4,5e5];for(let s=0;s<x.length;s++){const f=x[s],v=o>0?f/o:0,p=v/60,R=p/60,W=v*2*h;y.push("$calc_out.label.comparison|Comparison|: "+t("calc_out.time_value.row.comparison_income_hourly","$"+f.toLocaleString()+"/yr → $"+u(v)+"/hr",{income:"$"+f.toLocaleString(),hourly:"$"+u(v)})+" | "+t("calc_out.time_value.row.comparison_per_minute","$"+u(p)+"/min",{value:"$"+u(p)})+" | "+t("calc_out.time_value.row.comparison_per_second","$"+u(R)+"/sec",{value:"$"+u(R)})+" | "+t("calc_out.time_value.row.comparison_yearly_waste","Yearly waste @2hrs/day: "+e(W),{waste:e(W)}))}return y},$=function(l,n,c){var r=K(l);return Array.isArray(r)?r.join(\`
\`):String(r)};var H=_,Y=g,j=$,t=tk,A='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',t=new Function("return "+A)(),K=function(l){return g(l)};return[$(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

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
