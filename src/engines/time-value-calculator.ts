import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculateTimeValue(inputs: Record<string, string>): string[] {
  const annualIncome = parseFloat(inputs.annualIncome) || 0;
  const hoursPerWeek = parseFloat(inputs.hoursPerWeek) || 0;
  const weeksPerYear = parseFloat(inputs.weeksPerYear) || 0;
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

  results.push(
    '⏰ Time Value Calculator\n\n' +
    '💰 Time Wealth Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Annual Income:        ' + money(annualIncome) + '/yr\n' +
    '• Effective $/Hour:      ' + money(hourlyRate) + '/hr\n' +
    '• Effective $/Minute:    ' + money(perMinute) + '/min\n' +
    '• Effective $/Second:    ' + money(perSecond) + '/sec\n' +
    '• Daily Rate (8 hrs):    ' + money(dailyRate) + '/day\n' +
    '• Weekly Value:          ' + money(perWeek) + '/wk\n' +
    '• Monthly Value:         ' + money(monthlyValue) + '/mo\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Time-to-Value Ratios:\n' +
    '• 1 hr of work:        ' + money(hourlyRate) + '\n' +
    '• 1 day of work (8 hrs):  ' + money(dailyRate) + '\n' +
    '• 1 week (40 hrs):     ' + money(perWeek) + '\n' +
    '• 1 month:             ' + money(monthlyValue) + '\n' +
    '• 1 year:              ' + money(annualIncome) + '\n' +
    '• Cost per 15-min interruption:  ' + money(hourlyRate / 4) + '\n' +
    '• Cost per context switch:  ' + money(contextSwitch) + ' (30 min refocus)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Utilization Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (hourlyRate >= 200
      ? '• 🟢 Time wealth $' + Math.round(hourlyRate) + '/hr is top 5%. Every hour compounds — guard focus fiercely.\n'
      : hourlyRate >= 100
      ? '• 🟢 $' + Math.round(hourlyRate) + '/hr is strong. Above-median for skilled knowledge work.\n'
      : hourlyRate >= 50
      ? '• 🟡 $' + Math.round(hourlyRate) + '/hr is average. Solid baseline; raise rate or reduce wasted hours.\n'
      : hourlyRate >= 25
      ? '• 🟠 $' + Math.round(hourlyRate) + '/hr is below median. Skill-up or move upmarket.\n'
      : '• 🔴 $' + Math.round(hourlyRate) + '/hr is entry-level. Focus on higher-leverage activities.\n') +
    (hoursPerWeek <= 35
      ? '• 🟢 ' + hoursPerWeek + ' hrs/wk — sustainable, low burnout risk.\n'
      : hoursPerWeek <= 45
      ? '• 🟡 ' + hoursPerWeek + ' hrs/wk — standard, watch for creep.\n'
      : hoursPerWeek <= 55
      ? '• 🟠 ' + hoursPerWeek + ' hrs/wk — high load, consider trimming.\n'
      : '• 🔴 ' + hoursPerWeek + ' hrs/wk — burnout territory. Reduce or delegate.\n') +
    (weeksPerYear >= 48
      ? '• 🟢 ' + weeksPerYear + ' wks/yr — standard full-time.\n'
      : weeksPerYear >= 44
      ? '• 🟡 ' + weeksPerYear + ' wks/yr — some rest, add more for sustainability.\n'
      : '• 🔴 ' + weeksPerYear + ' wks/yr — overworked. Take vacation.\n') +
    '\n🎯 Time-to-Goal:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Target $200K/yr income:  Need ' + money(rateToReach200K) + '/hr at current hours\n' +
    '• Years to $200K at current pace:  ' + (yearsTo200K > 0 ? yearsTo200K.toFixed(1) + ' yrs (after raises)' : 'Already there!') + '\n' +
    '• To earn $300K/yr:           Need ' + money(totalHours > 0 ? 300000 / totalHours : 0) + '/hr\n' +
    '• To earn $500K/yr:           Need ' + money(totalHours > 0 ? 500000 / totalHours : 0) + '/hr\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Work vs Leisure Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• 1 hr wasted daily costs:     ' + money(yearlyWaste / weeksPerYear) + '/wk in productivity\n' +
    '• Yearly waste @2 hrs/day:  ' + money(yearlyWaste) + '/yr in lost productivity\n' +
    '• Break-even: work 1 hr earns ' + money(hourlyRate) + ' — guard this hour.\n' +
    '• 4-day workweek equivalent: same income in ' + Math.round(weeksPerYear * 4 / 5) + ' wks  (cut 1 day/wk)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Cut 1 hr/day wasted:  Save ' + money(hourlyRate * workingDays) + '/yr in productivity\n' +
    '• Cut all meetings (5/wk @ 1hr):  Save ' + money(hourlyRate * 5 * weeksPerYear) + '/yr\n' +
    '• Raise hourly rate by 25%:  Annual income ' + money(annualIncome) + ' → ' + money(annualIncome * 1.25) + '\n' +
    '• Add $500/mo passive income:  Annual ' + money(annualIncome + 6000) + '/yr  (saves ' + (6000 / Math.max(hourlyRate * totalHours, 1) * 100).toFixed(0) + '% of working time)\n' +
    '• Move to 4-day workweek:  Same ' + money(annualIncome) + '/yr in ' + Math.round(weeksPerYear * 4 / 5) + ' weeks\n\n' +
    '💡 Tip: At ' + money(hourlyRate) + '/hr, every interruption has a price. Block 90-min focus windows, batch email into 2x daily windows, and say no to meetings without agendas. The biggest unlock is rarely working more hours — it is reclaiming the hours you already have.',
  );

  const incomes = [30000, 60000, 100000, 150000, 250000, 500000];
  for (let i = 0; i < incomes.length; i++) {
    const inc = incomes[i];
    const hr = totalHours > 0 ? inc / totalHours : 0;
    const mn = hr / 60;
    const sec = mn / 60;
    const yw = (hr * 2) * workingDays;
    results.push(
      'Comparison: $' + inc.toLocaleString() + '/yr → $' + fmt(hr) + '/hr | $' + fmt(mn) + '/min | $' + fmt(sec) + '/sec | Yearly waste @2hrs/day: ' + money(yw),
    );
  }

  return results;
}

const customFn =
  "var ai=parseFloat(inputs.annualIncome)||0;" +
  "var hpw=parseFloat(inputs.hoursPerWeek)||0;" +
  "var wpy=parseFloat(inputs.weeksPerYear)||0;" +
  "var th=hpw*wpy;" +
  "var hr=th>0?ai/th:0;" +
  "var dr=hr*8;" +
  "var pm=hr/60;" +
  "var ps=pm/60;" +
  "var mv=ai/12;" +
  "var pw=hr*hpw;" +
  "var wd=wpy*5;" +
  "var m30=hr*0.5;" +
  "var m1h=hr;" +
  "var cs=hr*0.5;" +
  "var tw=hr*2;" +
  "var yw=tw*wd;" +
  "var ig=200000;" +
  "var yt=hr>0&&pw>0?Math.max(0,(ig-ai)/(pw*wpy)):0;" +
  "var rt=th>0?ig/th:0;" +
  "function fmt(n){return n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}" +
  "function money(n){return '$'+fmt(n)}" +
  "function pct(n){return n.toFixed(1)+'%'}" +
  "var results=[];" +
  "var r='';" +
  "r+='\\u23F0 Time Value Calculator\\n\\n';" +
  "r+='\\uD83D\\uDCB0 Time Wealth Snapshot:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Annual Income:        '+money(ai)+'/yr\\n';" +
  "r+='\\u2022 Effective $/Hour:      '+money(hr)+'/hr\\n';" +
  "r+='\\u2022 Effective $/Minute:    '+money(pm)+'/min\\n';" +
  "r+='\\u2022 Effective $/Second:    '+money(ps)+'/sec\\n';" +
  "r+='\\u2022 Daily Rate (8 hrs):    '+money(dr)+'/day\\n';" +
  "r+='\\u2022 Weekly Value:          '+money(pw)+'/wk\\n';" +
  "r+='\\u2022 Monthly Value:         '+money(mv)+'/mo\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDCD0 Time-to-Value Ratios:\\n';" +
  "r+='\\u2022 1 hr of work:        '+money(hr)+'\\n';" +
  "r+='\\u2022 1 day of work (8 hrs):  '+money(dr)+'\\n';" +
  "r+='\\u2022 1 week (40 hrs):     '+money(pw)+'\\n';" +
  "r+='\\u2022 1 month:             '+money(mv)+'\\n';" +
  "r+='\\u2022 1 year:              '+money(ai)+'\\n';" +
  "r+='\\u2022 Cost per 15-min interruption:  '+money(hr/4)+'\\n';" +
  "r+='\\u2022 Cost per context switch:  '+money(cs)+' (30 min refocus)\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83E\\uDE7A Utilization Health:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "if(hr>=200){r+='\\u2022 \\uD83D\\uDFE2 Time wealth $'+Math.round(hr)+'/hr is top 5%. Every hour compounds \\u2014 guard focus fiercely.\\n';}" +
  "else if(hr>=100){r+='\\u2022 \\uD83D\\uDFE2 $'+Math.round(hr)+'/hr is strong. Above-median for skilled knowledge work.\\n';}" +
  "else if(hr>=50){r+='\\u2022 \\uD83D\\uDFE1 $'+Math.round(hr)+'/hr is average. Solid baseline; raise rate or reduce wasted hours.\\n';}" +
  "else if(hr>=25){r+='\\u2022 \\uD83D\\uDFE0 $'+Math.round(hr)+'/hr is below median. Skill-up or move upmarket.\\n';}" +
  "else{r+='\\u2022 \\uD83D\\uDD34 $'+Math.round(hr)+'/hr is entry-level. Focus on higher-leverage activities.\\n';}" +
  "if(hpw<=35){r+='\\u2022 \\uD83D\\uDFE2 '+hpw+' hrs/wk \\u2014 sustainable, low burnout risk.\\n';}" +
  "else if(hpw<=45){r+='\\u2022 \\uD83D\\uDFE1 '+hpw+' hrs/wk \\u2014 standard, watch for creep.\\n';}" +
  "else if(hpw<=55){r+='\\u2022 \\uD83D\\uDFE0 '+hpw+' hrs/wk \\u2014 high load, consider trimming.\\n';}" +
  "else{r+='\\u2022 \\uD83D\\uDD34 '+hpw+' hrs/wk \\u2014 burnout territory. Reduce or delegate.\\n';}" +
  "if(wpy>=48){r+='\\u2022 \\uD83D\\uDFE2 '+wpy+' wks/yr \\u2014 standard full-time.\\n';}" +
  "else if(wpy>=44){r+='\\u2022 \\uD83D\\uDFE1 '+wpy+' wks/yr \\u2014 some rest, add more for sustainability.\\n';}" +
  "else{r+='\\u2022 \\uD83D\\uDD34 '+wpy+' wks/yr \\u2014 overworked. Take vacation.\\n';}" +
  "r+='\\n\\uD83C\\uDFAF Time-to-Goal:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Target $200K/yr income:  Need '+money(rt)+'/hr at current hours\\n';" +
  "r+='\\u2022 Years to $200K at current pace:  '+(yt>0?yt.toFixed(1)+' yrs (after raises)':'Already there!')+'\\n';" +
  "r+='\\u2022 To earn $300K/yr:           Need '+money(th>0?300000/th:0)+'/hr\\n';" +
  "r+='\\u2022 To earn $500K/yr:           Need '+money(th>0?500000/th:0)+'/hr\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\u2696\\uFE0F Work vs Leisure Break-Even:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 1 hr wasted daily costs:     '+money(yw/wpy)+'/wk in productivity\\n';" +
  "r+='\\u2022 Yearly waste @2 hrs/day:  '+money(yw)+'/yr in lost productivity\\n';" +
  "r+='\\u2022 Break-even: work 1 hr earns '+money(hr)+' \\u2014 guard this hour.\\n';" +
  "r+='\\u2022 4-day workweek equivalent: same income in '+Math.round(wpy*4/5)+' wks  (cut 1 day/wk)\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDD04 What-If Scenarios:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Cut 1 hr/day wasted:  Save '+money(hr*wd)+'/yr in productivity\\n';" +
  "r+='\\u2022 Cut all meetings (5/wk @ 1hr):  Save '+money(hr*5*wpy)+'/yr\\n';" +
  "r+='\\u2022 Raise hourly rate by 25%:  Annual income '+money(ai)+' \\u2192 '+money(ai*1.25)+'\\n';" +
  "r+='\\u2022 Add $500/mo passive income:  Annual '+money(ai+6000)+'/yr  (saves '+(6000/Math.max(hr*th,1)*100).toFixed(0)+'% of working time)\\n';" +
  "r+='\\u2022 Move to 4-day workweek:  Same '+money(ai)+'/yr in '+Math.round(wpy*4/5)+' weeks\\n\\n';" +
  "r+='\\uD83D\\uDCA1 Tip: At '+money(hr)+'/hr, every interruption has a price. Block 90-min focus windows, batch email into 2x daily windows, and say no to meetings without agendas. The biggest unlock is rarely working more hours \\u2014 it is reclaiming the hours you already have.';" +
  "results.push(r);" +
  "var incomes=[30000,60000,100000,150000,250000,500000];" +
  "for(var i=0;i<incomes.length;i++){" +
  "var inc=incomes[i];" +
  "var h=th>0?inc/th:0;" +
  "var mn=h/60;" +
  "var sc=mn/60;" +
  "var y=(h*2)*wd;" +
  "results.push('Comparison: $'+inc.toLocaleString()+'/yr \\u2192 $'+fmt(h)+'/hr | $'+fmt(mn)+'/min | $'+fmt(sc)+'/sec | Yearly waste @2hrs/day: '+money(y));" +
  "}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-time-value-calculator',
  title: 'Time Value Calculator',
  description: 'Discover what your time is really worth. Calculate your effective $/hour, $/minute, and $/second — and see the dollar cost of meetings, distractions, and daily time waste.',
  category: 'E',
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
  generate(inputs: Record<string, string>): string[] {
    return calculateTimeValue(inputs);
  },
  staticExamples: [
    '⏰ Time Value Calculator\n\n💰 Time Wealth Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Annual Income:        $100,000.00/yr\n• Effective $/Hour:      $52.08/hr\n• Effective $/Minute:    $0.87/min\n• Effective $/Second:    $0.01/sec\n• Daily Rate (8 hrs):    $416.67/day\n• Weekly Value:          $2,083.33/wk\n• Monthly Value:         $8,333.33/mo\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Time-to-Value Ratios:\n• 1 hr of work:        $52.08\n• 1 day of work (8 hrs):  $416.67\n• 1 week (40 hrs):     $2,083.33\n• 1 month:             $8,333.33\n• 1 year:              $100,000.00\n• Cost per 15-min interruption:  $13.02\n• Cost per context switch:  $26.04 (30 min refocus)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Utilization Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 $52/hr is average. Solid baseline; raise rate or reduce wasted hours.\n• 🟡 40 hrs/wk — standard, watch for creep.\n• 🟢 48 wks/yr — standard full-time.\n\n🎯 Time-to-Goal:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Target $200K/yr income:  Need $104.17/hr at current hours\n• Years to $200K at current pace:  1.0 yrs (after raises)\n• To earn $300K/yr:           Need $156.25/hr\n• To earn $500K/yr:           Need $260.42/hr\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Work vs Leisure Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 1 hr wasted daily costs:     $520.83/wk in productivity\n• Yearly waste @2 hrs/day:  $25,000.00/yr in lost productivity\n• Break-even: work 1 hr earns $52.08 — guard this hour.\n• 4-day workweek equivalent: same income in 38 wks  (cut 1 day/wk)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Cut 1 hr/day wasted:  Save $12,500.00/yr in productivity\n• Cut all meetings (5/wk @ 1hr):  Save $12,500.00/yr\n• Raise hourly rate by 25%:  Annual income $100,000.00 → $125,000.00\n• Add $500/mo passive income:  Annual $106,000.00/yr  (saves 6% of working time)\n• Move to 4-day workweek:  Same $100,000.00/yr in 38 weeks\n\n💡 Tip: At $52.08/hr, every interruption has a price. Block 90-min focus windows, batch email into 2x daily windows, and say no to meetings without agendas. The biggest unlock is rarely working more hours — it is reclaiming the hours you already have.\nComparison: $30,000/yr → $15.63/hr | $0.26/min | $0.00/sec | Yearly waste @2hrs/day: $7,500.00\nComparison: $60,000/yr → $31.25/hr | $0.52/min | $0.01/sec | Yearly waste @2hrs/day: $15,000.00\nComparison: $100,000/yr → $52.08/hr | $0.87/min | $0.01/sec | Yearly waste @2hrs/day: $25,000.00\nComparison: $150,000/yr → $78.13/hr | $1.30/min | $0.02/sec | Yearly waste @2hrs/day: $37,500.00\nComparison: $250,000/yr → $130.21/hr | $2.17/min | $0.04/sec | Yearly waste @2hrs/day: $62,500.00\nComparison: $500,000/yr → $260.42/hr | $4.34/min | $0.07/sec | Yearly waste @2hrs/day: $125,000.00',
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
  ],
  howToUse: [
    'Enter your target or current annual income.',
    'Enter your typical hours worked per week.',
    'Enter how many weeks per year you actually work.',
    'Review your effective $/hour, $/minute, and $/second.',
    'See the dollar cost of meetings, context switches, and daily time waste.',
    'Compare time wealth at 6 different income levels.',
  ],
};

registerEngine(engine);