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
  const costOf30MinMeeting = hourlyRate * 0.5;
  const costOf1HrMeeting = hourlyRate;
  const contextSwitchCost = hourlyRate * 0.5; // 30 min to regain focus
  const dailyTimeWaste2Hrs = hourlyRate * 2;
  const yearlyTimeWaste = dailyTimeWaste2Hrs * (weeksPerYear * 5); // 5 working days per week
  const monthlyValue = annualIncome / 12;

  const loc = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  results.push(
    '⏱️ Time Value Analysis\n\n' +
    '💰 Annual Income: $' + annualIncome.toLocaleString() + '\n' +
    '🕐 Work Schedule: ' + hoursPerWeek + ' hrs/wk × ' + weeksPerYear + ' wks/yr = ' + totalHours + ' hrs/yr\n\n' +
    '\n' +
    '⚡ Your Hourly Rate: ' + loc(hourlyRate) + '/hr\n' +
    '📅 Daily Rate (8 hrs): ' + loc(dailyRate) + '/day\n' +
    '📆 Monthly Value: ' + loc(monthlyValue) + '/mo\n\n' +
    '\n' +
    '💸 The Cost of Lost Time:\n' +
    '• 30-Minute Meeting: ' + loc(costOf30MinMeeting) + '\n' +
    '• 1-Hour Meeting: ' + loc(costOf1HrMeeting) + '\n' +
    '• Context Switch (30 min to refocus): ' + loc(contextSwitchCost) + '\n' +
    '• 2 Hrs/Day Wasted: $' + fmt(dailyTimeWaste2Hrs) + '/day\n' +
    '• Yearly Waste (2 hrs/day): ' + loc(yearlyTimeWaste) + '\n\n' +
    '\n' +
    '💡 At your rate, every 15-minute interruption costs ' + loc(hourlyRate / 4) +
    '. Protect your focus time fiercely.\n\n' +
    '🩺 Time Wealth Health:\n' +
    (hourlyRate >= 100
      ? '• 🟢 Top 10% time value — every hour is worth $' + Math.round(hourlyRate) + '+.\n'
      : hourlyRate >= 50
      ? '• 🟢 Above average — $' + Math.round(hourlyRate) + '/hr is solid for skilled work.\n'
      : hourlyRate >= 25
      ? '• 🟡 Average — $' + Math.round(hourlyRate) + '/hr is the median for full-time work.\n'
      : '• 🟠 Below median — focus on raising rate or productivity per hour.\n') +
    (weeksPerYear >= 48
      ? '• ✅ You work ' + weeksPerYear + ' weeks/yr — standard full-time.\n'
      : weeksPerYear >= 44
      ? '• ⚠️ ' + weeksPerYear + ' weeks/yr — some rest, but not enough for long-term sustainability.\n'
      : '• 🔴 ' + weeksPerYear + ' weeks/yr — burnout risk. Add vacation weeks.\n') +
    '\n🎯 Time Wealth Targets:\n' +
    '• At $100/hr:  Need ' + Math.round(100 * totalHours).toLocaleString() + '/yr income  (currently $' + annualIncome.toLocaleString() + ')\n' +
    '• At $200/hr:  Need $' + (200 * totalHours).toLocaleString() + '/yr\n' +
    '• To earn $200K/yr:  Need $' + Math.round(200000 / totalHours) + '/hr at current hours\n\n' +
    '🔄 What-If Scenarios:\n' +
    '• Cut 1hr/day wasted:  Save $' + Math.round(hourlyRate * weeksPerYear * 5).toLocaleString() + '/yr in productivity\n' +
    '• Cut all meetings (5/wk):  Save $' + Math.round(hourlyRate * 5 * weeksPerYear).toLocaleString() + '/yr\n' +
    '• 4-day work week:  Same income in ' + Math.round(weeksPerYear * 4 / 5) + ' weeks\n\n' +
    '📌 If you cut 1 wasteful hour per day, you save ' + loc(hourlyRate * weeksPerYear * 5) + ' per year in lost productivity.',
  );

  const incomes = [30000, 50000, 75000, 120000, 250000];
  for (let i = 0; i < incomes.length; i++) {
    const inc = incomes[i];
    const hr = totalHours > 0 ? inc / totalHours : 0;
    const yw = (hr * 2) * (weeksPerYear * 5);
    results.push(
      'Comparison: $' + inc.toLocaleString() + '/yr → $' + fmt(hr) + '/hr | 1hr meeting: $' + fmt(hr) + ' | Yearly waste @2hrs/day: ' + loc(yw),
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
  "var m30=hr*0.5;" +
  "var m1h=hr;" +
  "var cs=hr*0.5;" +
  "var dw=hr*2;" +
  "var yw=dw*(wpy*5);" +
  "var mv=ai/12;" +
  "function loc(n){return '$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}" +
  "function fmt(n){return n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}" +
  "var results=[];" +
  "results.push(" +
  "'\\u23F1\\uFE0F Time Value Analysis\\n\\n" +
  "\\uD83D\\uDCB0 Annual Income: $'+ai.toLocaleString()+'\\n" +
  "\\uD83D\\uDD50 Work Schedule: '+hpw+' hrs/wk \\u00d7 '+wpy+' wks/yr = '+th+' hrs/yr\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\u26A1 Your Hourly Rate: '+loc(hr)+'/hr\\n" +
  "\\uD83D\\uDCC5 Daily Rate (8 hrs): '+loc(dr)+'/day\\n" +
  "\\uD83D\\uDCC6 Monthly Value: '+loc(mv)+'/mo\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\uD83D\\uDCB8 The Cost of Lost Time:\\n" +
  "\\u2022 30-Minute Meeting: '+loc(m30)+'\\n" +
  "\\u2022 1-Hour Meeting: '+loc(m1h)+'\\n" +
  "\\u2022 Context Switch (30 min to refocus): '+loc(cs)+'\\n" +
  "\\u2022 2 Hrs/Day Wasted: $'+fmt(dw)+'/day\\n" +
  "\\u2022 Yearly Waste (2 hrs/day): '+loc(yw)+'\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\uD83D\\uDCA1 At your rate, every 15-minute interruption costs '+loc(hr/4)+'. Protect your focus time fiercely.\\n\\n" +
  "\\uD83D\\uDCCC If you cut 1 wasteful hour per day, you save '+loc(hr*wpy*5)+' per year in lost productivity.'" +
  ");" +
  "var incomes=[30000,50000,75000,120000,250000];" +
  "for(var i=0;i<incomes.length;i++){" +
  "var inc=incomes[i];" +
  "var h=th>0?inc/th:0;" +
  "var y=(h*2)*(wpy*5);" +
  "results.push('Comparison: $'+inc.toLocaleString()+'/yr \\u2192 $'+fmt(h)+'/hr | 1hr meeting: $'+fmt(h)+' | Yearly waste @2hrs/day: '+loc(y));" +
  "}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-time-value-calculator',
  title: 'Time Value Calculator',
  description: 'Discover what your time is really worth. Calculate your hourly rate and see the dollar cost of meetings, distractions, and daily time waste.',
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
    '⏱️ Time Value Analysis\n\n💰 Annual Income: $100,000\n🕐 Work Schedule: 40 hrs/wk × 48 wks/yr = 1,920 hrs/yr\n\n⚡ Your Hourly Rate: $52.08/hr\n📅 Daily Rate (8 hrs): $416.67/day\n📆 Monthly Value: $8,333.33/mo\n\n💸 The Cost of Lost Time:\n• 30-Minute Meeting: $26.04\n• 1-Hour Meeting: $52.08\n• Context Switch (30 min to refocus): $26.04\n• 2 Hrs/Day Wasted: $104.17/day\n• Yearly Waste (2 hrs/day): $25,000.00\n\n💡 At your rate, every 15-minute interruption costs $13.02. Protect your focus time fiercely.\n\n📌 If you cut 1 wasteful hour per day, you save $12,500.00 per year in lost productivity.',
    'Comparison: $30,000/yr → $15.62/hr | 1hr meeting: $15.62 | Yearly waste @2hrs/day: $7,500.00',
    'Comparison: $50,000/yr → $26.04/hr | 1hr meeting: $26.04 | Yearly waste @2hrs/day: $12,500.00',
    'Comparison: $75,000/yr → $39.06/hr | 1hr meeting: $39.06 | Yearly waste @2hrs/day: $18,750.00',
    'Comparison: $120,000/yr → $62.50/hr | 1hr meeting: $62.50 | Yearly waste @2hrs/day: $30,000.00',
    'Comparison: $250,000/yr → $130.21/hr | 1hr meeting: $130.21 | Yearly waste @2hrs/day: $62,500.00',
  ],
  faq: [
    { q: 'Why should I calculate my time value?', a: 'Knowing your hourly rate transforms how you make decisions. When you know a 30-minute meeting costs you $25-100, you become more selective about which meetings you accept. It also helps you decide what to outsource: if your hourly rate is $50 and you can hire a VA for $15/hr, you should delegate every task the VA can handle and focus on your highest-value work. Time is your only non-renewable resource.' },
    { q: 'What is context switching cost?', a: 'Research shows it takes 23 minutes on average to refocus after an interruption. If you get distracted 4 times a day, you lose nearly 2 hours of productive work. The calculator prices this at 30 minutes of your hourly rate per switch, but the real cost is often higher because deep work quality suffers. Batching similar tasks and blocking focus time can recover this lost productivity.' },
    { q: 'Should I include commute time?', a: 'Yes, if your commute is part of your workday. Add commute hours to your weekly total for a more accurate hourly rate. If you commute 10 hours per week for a $100K job working 40 hours, your real hourly rate drops from $52/hr to $41.67/hr. This perspective can justify remote work or relocating closer to your workplace.' },
    { q: 'How many weeks should I count per year?', a: 'For salaried employees, use 48-50 weeks (subtracting vacation and holidays). For freelancers, use 44-46 weeks to account for unpaid time between projects, admin work, business development, and sick days. Freelancers should also account for non-billable hours — roughly 30-40% of total work hours go to admin, marketing, and proposals.' },
    { q: 'How do I use this to set freelance rates?', a: 'Start with your target annual income, divide by billable hours (typically 1,200-1,500 per year), then multiply by 1.5-2x to account for self-employment taxes, health insurance, retirement, and unpaid time. For example, targeting $100K at 1,400 billable hours gives ~$71/hr base, and with overhead multiplier gives $106-142/hr. This calculator gives you the base to build from.' },
  ],
  howToUse: [
    'Enter your target or current annual income.',
    'Enter your typical hours worked per week.',
    'Enter how many weeks per year you actually work.',
    'Review your hourly rate and the dollar cost of common time drains.',
    'See how much money you lose annually from just 2 hours of wasted time per day.',
    'Scroll down to compare time value at different income levels.',
  ],
};

registerEngine(engine);
