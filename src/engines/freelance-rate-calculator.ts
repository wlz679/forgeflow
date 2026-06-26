import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculateFreelanceRate(inputs: Record<string, string>): string[] {
  const annualIncome = parseFloat(inputs.annualIncome) || 0;
  const expenses = parseFloat(inputs.expenses) || 0;
  const billableHrs = parseFloat(inputs.billableHrs) || 0;
  const profit = parseFloat(inputs.profit) || 0;
  const results: string[] = [];

  const netIncome = annualIncome - expenses;
  const baseRate = billableHrs > 0 ? (netIncome + profit) / billableHrs : 0;
  const marketMultiplier = 1.5;
  const expertMultiplier = 2;
  const skilledMultiplier = 1.25;
  const hourlyRate = Math.ceil(baseRate);
  const dailyRate = hourlyRate * 8;
  const weeklyRate = dailyRate * 5;
  const monthlyRate = weeklyRate * 4.33;
  const yearlyRate = monthlyRate * 12;
  const skilledRate = Math.ceil(baseRate * skilledMultiplier);
  const expertRate = Math.ceil(baseRate * expertMultiplier);
  const breakEvenRate = billableHrs > 0 ? expenses / billableHrs : 0;

  const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
  const fmt2 = (n: number) => '$' + n.toFixed(2);
  const pct = (n: number) => n.toFixed(1) + '%';
  const loc = (n: number) => Math.round(n).toLocaleString();

  const benchmarkTiers = [
    { tier: 'Junior',       pct: 60,  label: 'junior' },
    { tier: 'Mid-Level',    pct: 100, label: 'mid' },
    { tier: 'Senior',       pct: 160, label: 'senior' },
    { tier: 'Expert',       pct: 250, label: 'expert' },
  ];
  const baseMarket = 75;
  const juniorRate = Math.round(baseMarket * 0.6);
  const midRate = Math.round(baseMarket * 1.0);
  const seniorRate = Math.round(baseMarket * 1.6);
  const expertRateMarket = Math.round(baseMarket * 2.5);

  const rateVsMarket = baseRate / midRate;
  const rateHealth =
    rateVsMarket >= 1.5
      ? '🟢 Premium — top 10% of market. You charge what top-tier experts charge.'
      : rateVsMarket >= 1.0
      ? '🟢 Market-rate — competitive for your skill level.'
      : rateVsMarket >= 0.7
      ? '🟡 Below market — clients see you as a bargain. Test raising rates.'
      : '🟠 Entry-level — focus on building portfolio to justify higher rates.';

  const utilization = billableHrs > 1200 ? '🟢' : billableHrs > 900 ? '🟡' : '🟠';
  const expenseRatio = annualIncome > 0 ? (expenses / annualIncome) * 100 : 0;
  const profitMargin = annualIncome > 0 ? (profit / annualIncome) * 100 : 0;

  results.push(
    '💼 Freelance Rate Calculator\n\n' +
    '💰 Target Rate Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Target Annual Net:    ' + fmt(annualIncome) + '/yr\n' +
    '• Business Expenses:   ' + fmt(expenses) + '/yr  (' + pct(expenseRatio) + ' of target)\n' +
    '• Desired Profit:      ' + fmt(profit) + '/yr  (' + pct(profitMargin) + ' margin)\n' +
    '• Billable Hours:      ' + loc(billableHrs) + ' hrs/yr\n' +
    '• Required Hourly Rate: ' + fmt2(baseRate) + '/hr\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Rate Multipliers:\n' +
    '• 1x base rate:        ' + fmt(hourlyRate) + '/hr\n' +
    '• 1.25x skilled:       ' + fmt(skilledRate) + '/hr  (proven track record)\n' +
    '• 1.5x premium:        ' + fmt(Math.ceil(baseRate * marketMultiplier)) + '/hr  (specialized niche)\n' +
    '• 2x expert:           ' + fmt(expertRate) + '/hr  (top-tier authority)\n\n' +
    '• Daily Rate (8 hrs):   ' + fmt(dailyRate) + '/day\n' +
    '• Weekly Rate (5 days): ' + fmt(weeklyRate) + '/wk\n' +
    '• Monthly Rate:         ' + fmt(monthlyRate) + '/mo\n' +
    '• Yearly Rate:          ' + fmt(yearlyRate) + '/yr\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Market Position:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + rateHealth + '\n' +
    '• ' + utilization + ' Billable utilization: ' + loc(billableHrs) + ' hrs/yr  (industry: 900-1,400)\n' +
    (expenseRatio < 15
      ? '• 🟢 Expenses at ' + pct(expenseRatio) + ' of income — lean operation.\n'
      : expenseRatio < 30
      ? '• 🟡 Expenses at ' + pct(expenseRatio) + ' of income — manageable.\n'
      : '• 🟠 Expenses at ' + pct(expenseRatio) + ' of income — trim to lift margin.\n') +
    (profitMargin >= 30
      ? '• 🟢 Profit margin ' + pct(profitMargin) + ' — healthy solopreneur margin.\n'
      : profitMargin >= 15
      ? '• 🟡 Profit margin ' + pct(profitMargin) + ' — workable, room to grow.\n'
      : '• 🔴 Profit margin ' + pct(profitMargin) + ' — too thin; raise rate.\n') +
    '\n🎯 Rate Ladder (market context):\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Junior:       ' + fmt(juniorRate) + '/hr  (entry, building portfolio)\n' +
    '• Mid-Level:    ' + fmt(midRate) + '/hr  (3-5 yrs, market median)\n' +
    '• Senior:       ' + fmt(seniorRate) + '/hr  (6-10 yrs, specialist)\n' +
    '• Expert:       ' + fmt(expertRateMarket) + '/hr  (10+ yrs, top authority)\n' +
    '• Your rate:    ' + fmt(hourlyRate) + '/hr  (' + pct(rateVsMarket * 100) + ' of market median)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even Rate:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Break-even (expenses only): ' + fmt2(breakEvenRate) + '/hr\n' +
    '• Break-even + profit:        ' + fmt2(baseRate) + '/hr  (your required rate)\n' +
    '• At current billable hrs (' + loc(billableHrs) + '), every $10/hr raise adds ' + fmt(10 * billableHrs) + '/yr\n' +
    '• To hit $' + loc(annualIncome * 1.5) + '/yr net: raise to ' + fmt2(billableHrs > 0 ? (annualIncome * 1.5) / billableHrs : 0) + '/hr\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Raise rate 20%:  $' + fmt(Math.ceil(baseRate * 1.2)) + '/hr → ' + fmt(Math.ceil(baseRate * 1.2) * billableHrs) + '/yr gross\n' +
    '• Raise rate 50%:  $' + fmt(Math.ceil(baseRate * 1.5)) + '/hr → ' + fmt(Math.ceil(baseRate * 1.5) * billableHrs) + '/yr gross\n' +
    '• Cut expenses 25%:  Save ' + fmt(expenses * 0.25) + '/yr → break-even drops to ' + fmt2((expenses * 0.75) / Math.max(billableHrs, 1)) + '/hr\n' +
    '• +200 billable hrs/yr:  Same rate → ' + fmt(hourlyRate * (billableHrs + 200)) + '/yr gross (was ' + fmt(hourlyRate * billableHrs) + ')\n' +
    '• Move to expert tier (2x):  $' + fmt(expertRate) + '/hr → ' + fmt(expertRate * billableHrs) + '/yr gross\n\n' +
    '💡 Tip: Most freelancers undercharge by 30-50%. If you win every proposal, your rate is too low — aim to lose 20-30% on price. Doubling your rate and losing half your clients keeps revenue flat but reclaims half your time. Charge by project (outcomes), not hours — clients buy results, not time.',
  );

  const scenarios = [
    { label: 'Junior (60%)', mult: 0.6 },
    { label: 'Mid (100%)', mult: 1.0 },
    { label: 'Skilled (125%)', mult: 1.25 },
    { label: 'Premium (150%)', mult: 1.5 },
    { label: 'Expert (200%)', mult: 2.0 },
  ];
  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    const r = Math.ceil(baseRate * s.mult);
    results.push(
      s.label + ': $' + r + '/hr → $' + (r * 8).toLocaleString() + '/day | $' + Math.round(r * 8 * 5 * 4.33).toLocaleString() + '/mo | $' + Math.round(r * billableHrs).toLocaleString() + '/yr at ' + loc(billableHrs) + ' hrs',
    );
  }

  return results;
}

const customFn =
  "var ai=parseFloat(inputs.annualIncome)||0;" +
  "var ex=parseFloat(inputs.expenses)||0;" +
  "var bh=parseFloat(inputs.billableHrs)||0;" +
  "var pr=parseFloat(inputs.profit)||0;" +
  "var ni=ai-ex;" +
  "var br=bh>0?(ni+pr)/bh:0;" +
  "var mm=1.5;" +
  "var em=2;" +
  "var sm=1.25;" +
  "var hr=Math.ceil(br);" +
  "var dr=hr*8;" +
  "var wr=dr*5;" +
  "var mr=wr*4.33;" +
  "var yr=mr*12;" +
  "var sr=Math.ceil(br*sm);" +
  "var xr=Math.ceil(br*em);" +
  "var ber=bh>0?ex/bh:0;" +
  "var bm=75;" +
  "var jr=Math.round(bm*0.6);" +
  "var mdr=Math.round(bm*1.0);" +
  "var snr=Math.round(bm*1.6);" +
  "var exm=Math.round(bm*2.5);" +
  "var rvm=br/mdr;" +
  "var rh;" +
  "if(rvm>=1.5)rh='\\uD83D\\uDFE2 Premium \\u2014 top 10% of market. You charge what top-tier experts charge.';" +
  "else if(rvm>=1.0)rh='\\uD83D\\uDFE2 Market-rate \\u2014 competitive for your skill level.';" +
  "else if(rvm>=0.7)rh='\\uD83D\\uDFE1 Below market \\u2014 clients see you as a bargain. Test raising rates.';" +
  "else rh='\\uD83D\\uDFE0 Entry-level \\u2014 focus on building portfolio to justify higher rates.';" +
  "var ut=bh>1200?'\\uD83D\\uDFE2':bh>900?'\\uD83D\\uDFE1':'\\uD83D\\uDFE0';" +
  "var er=ai>0?(ex/ai)*100:0;" +
  "var pm=ai>0?(pr/ai)*100:0;" +
  "function fmt(n){return '$'+Math.round(n).toLocaleString()}" +
  "function fmt2(n){return '$'+n.toFixed(2)}" +
  "function pct(n){return n.toFixed(1)+'%'}" +
  "function loc(n){return Math.round(n).toLocaleString()}" +
  "var results=[];" +
  "var r='';" +
  "r+='\\uD83D\\uDCBC Freelance Rate Calculator\\n\\n';" +
  "r+='\\uD83D\\uDCB0 Target Rate Snapshot:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Target Annual Net:    '+fmt(ai)+'/yr\\n';" +
  "r+='\\u2022 Business Expenses:   '+fmt(ex)+'/yr  ('+pct(er)+' of target)\\n';" +
  "r+='\\u2022 Desired Profit:      '+fmt(pr)+'/yr  ('+pct(pm)+' margin)\\n';" +
  "r+='\\u2022 Billable Hours:      '+loc(bh)+' hrs/yr\\n';" +
  "r+='\\u2022 Required Hourly Rate: '+fmt2(br)+'/hr\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDCD0 Rate Multipliers:\\n';" +
  "r+='\\u2022 1x base rate:        '+fmt(hr)+'/hr\\n';" +
  "r+='\\u2022 1.25x skilled:       '+fmt(sr)+'/hr  (proven track record)\\n';" +
  "r+='\\u2022 1.5x premium:        '+fmt(Math.ceil(br*mm))+'/hr  (specialized niche)\\n';" +
  "r+='\\u2022 2x expert:           '+fmt(xr)+'/hr  (top-tier authority)\\n\\n';" +
  "r+='\\u2022 Daily Rate (8 hrs):   '+fmt(dr)+'/day\\n';" +
  "r+='\\u2022 Weekly Rate (5 days): '+fmt(wr)+'/wk\\n';" +
  "r+='\\u2022 Monthly Rate:         '+fmt(mr)+'/mo\\n';" +
  "r+='\\u2022 Yearly Rate:          '+fmt(yr)+'/yr\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83E\\uDE7A Market Position:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 '+rh+'\\n';" +
  "r+='\\u2022 '+ut+' Billable utilization: '+loc(bh)+' hrs/yr  (industry: 900-1,400)\\n';" +
  "if(er<15){r+='\\u2022 \\uD83D\\uDFE2 Expenses at '+pct(er)+' of income \\u2014 lean operation.\\n';}" +
  "else if(er<30){r+='\\u2022 \\uD83D\\uDFE1 Expenses at '+pct(er)+' of income \\u2014 manageable.\\n';}" +
  "else{r+='\\u2022 \\uD83D\\uDFE0 Expenses at '+pct(er)+' of income \\u2014 trim to lift margin.\\n';}" +
  "if(pm>=30){r+='\\u2022 \\uD83D\\uDFE2 Profit margin '+pct(pm)+' \\u2014 healthy solopreneur margin.\\n';}" +
  "else if(pm>=15){r+='\\u2022 \\uD83D\\uDFE1 Profit margin '+pct(pm)+' \\u2014 workable, room to grow.\\n';}" +
  "else{r+='\\u2022 \\uD83D\\uDD34 Profit margin '+pct(pm)+' \\u2014 too thin; raise rate.\\n';}" +
  "r+='\\n\\uD83C\\uDFAF Rate Ladder (market context):\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Junior:       '+fmt(jr)+'/hr  (entry, building portfolio)\\n';" +
  "r+='\\u2022 Mid-Level:    '+fmt(mdr)+'/hr  (3-5 yrs, market median)\\n';" +
  "r+='\\u2022 Senior:       '+fmt(snr)+'/hr  (6-10 yrs, specialist)\\n';" +
  "r+='\\u2022 Expert:       '+fmt(exm)+'/hr  (10+ yrs, top authority)\\n';" +
  "r+='\\u2022 Your rate:    '+fmt(hr)+'/hr  ('+pct(rvm*100)+' of market median)\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\u2696\\uFE0F Break-Even Rate:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Break-even (expenses only): '+fmt2(ber)+'/hr\\n';" +
  "r+='\\u2022 Break-even + profit:        '+fmt2(br)+'/hr  (your required rate)\\n';" +
  "r+='\\u2022 At current billable hrs ('+loc(bh)+'), every $10/hr raise adds '+fmt(10*bh)+'/yr\\n';" +
  "r+='\\u2022 To hit $'+loc(ai*1.5)+'/yr net: raise to '+fmt2(bh>0?(ai*1.5)/bh:0)+'/hr\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDD04 What-If Scenarios:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Raise rate 20%:  $'+fmt(Math.ceil(br*1.2))+'/hr \\u2192 '+fmt(Math.ceil(br*1.2)*bh)+'/yr gross\\n';" +
  "r+='\\u2022 Raise rate 50%:  $'+fmt(Math.ceil(br*1.5))+'/hr \\u2192 '+fmt(Math.ceil(br*1.5)*bh)+'/yr gross\\n';" +
  "r+='\\u2022 Cut expenses 25%:  Save '+fmt(ex*0.25)+'/yr \\u2192 break-even drops to '+fmt2((ex*0.75)/Math.max(bh,1))+'/hr\\n';" +
  "r+='\\u2022 +200 billable hrs/yr:  Same rate \\u2192 '+fmt(hr*(bh+200))+'/yr gross (was '+fmt(hr*bh)+')\\n';" +
  "r+='\\u2022 Move to expert tier (2x):  $'+fmt(xr)+'/hr \\u2192 '+fmt(xr*bh)+'/yr gross\\n\\n';" +
  "r+='\\uD83D\\uDCA1 Tip: Most freelancers undercharge by 30-50%. If you win every proposal, your rate is too low \\u2014 aim to lose 20-30% on price. Doubling your rate and losing half your clients keeps revenue flat but reclaims half your time. Charge by project (outcomes), not hours \\u2014 clients buy results, not time.';" +
  "results.push(r);" +
  "var scs=[{l:'Junior (60%)',m:0.6},{l:'Mid (100%)',m:1.0},{l:'Skilled (125%)',m:1.25},{l:'Premium (150%)',m:1.5},{l:'Expert (200%)',m:2.0}];" +
  "for(var i=0;i<scs.length;i++){" +
  "var s=scs[i];" +
  "var rt=Math.ceil(br*s.m);" +
  "results.push(s.l+': $'+rt+'/hr \\u2192 $'+(rt*8).toLocaleString()+'/day | $'+Math.round(rt*8*5*4.33).toLocaleString()+'/mo | $'+Math.round(rt*bh).toLocaleString()+'/yr at '+loc(bh)+' hrs');" +
  "}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-freelance-rate-calculator',
  title: 'Freelance Rate Calculator',
  description: 'Calculate the hourly rate you need to hit your income goals. See how market multipliers (skilled, premium, expert) affect what you should charge.',
  inputs: [
    { name: 'annualIncome', label: 'Target Annual Net Income ($)', placeholder: 'e.g. 100000', type: 'number' },
    { name: 'expenses', label: 'Annual Business Expenses ($)', placeholder: 'e.g. 10000', type: 'number' },
    { name: 'billableHrs', label: 'Billable Hours Per Year', placeholder: 'e.g. 1200', type: 'number' },
    { name: 'profit', label: 'Desired Profit Margin ($)', placeholder: 'e.g. 30000', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs: Record<string, string>): string[] {
    return calculateFreelanceRate(inputs);
  },
  staticExamples: [
    '💼 Freelance Rate Calculator\n\n💰 Target Rate Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Target Annual Net:    $80,000/yr\n• Business Expenses:   $10,000/yr  (12.5% of target)\n• Desired Profit:      $20,000/yr  (25.0% margin)\n• Billable Hours:      1,200 hrs/yr\n• Required Hourly Rate: $75.00/hr\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Rate Multipliers:\n• 1x base rate:        $75/hr\n• 1.25x skilled:       $94/hr  (proven track record)\n• 1.5x premium:        $113/hr  (specialized niche)\n• 2x expert:           $150/hr  (top-tier authority)\n\n• Daily Rate (8 hrs):   $600/day\n• Weekly Rate (5 days): $3,000/wk\n• Monthly Rate:         $12,990/mo\n• Yearly Rate:          $155,880/yr\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Market Position:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 Market-rate — competitive for your skill level.\n• 🟡 Billable utilization: 1,200 hrs/yr  (industry: 900-1,400)\n• 🟢 Expenses at 12.5% of income — lean operation.\n• 🟡 Profit margin 25.0% — workable, room to grow.\n\n🎯 Rate Ladder (market context):\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Junior:       $45/hr  (entry, building portfolio)\n• Mid-Level:    $75/hr  (3-5 yrs, market median)\n• Senior:       $120/hr  (6-10 yrs, specialist)\n• Expert:       $188/hr  (10+ yrs, top authority)\n• Your rate:    $75/hr  (100.0% of market median)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even Rate:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Break-even (expenses only): $8.33/hr\n• Break-even + profit:        $75.00/hr  (your required rate)\n• At current billable hrs (1,200), every $10/hr raise adds $12,000/yr\n• To hit $120,000/yr net: raise to $100.00/hr\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Raise rate 20%:  $$90/hr → $108,000/yr gross\n• Raise rate 50%:  $$113/hr → $135,600/yr gross\n• Cut expenses 25%:  Save $2,500/yr → break-even drops to $6.25/hr\n• +200 billable hrs/yr:  Same rate → $105,000/yr gross (was $90,000)\n• Move to expert tier (2x):  $$150/hr → $180,000/yr gross\n\n💡 Tip: Most freelancers undercharge by 30-50%. If you win every proposal, your rate is too low — aim to lose 20-30% on price. Doubling your rate and losing half your clients keeps revenue flat but reclaims half your time. Charge by project (outcomes), not hours — clients buy results, not time.\nJunior (60%): $45/hr → $360/day | $7,794/mo | $54,000/yr at 1,200 hrs\nMid (100%): $75/hr → $600/day | $12,990/mo | $90,000/yr at 1,200 hrs\nSkilled (125%): $94/hr → $752/day | $16,281/mo | $112,800/yr at 1,200 hrs\nPremium (150%): $113/hr → $904/day | $19,572/mo | $135,600/yr at 1,200 hrs\nExpert (200%): $150/hr → $1,200/day | $25,980/mo | $180,000/yr at 1,200 hrs',
    'Junior (60%): $53/hr → $424/day | $9,179/mo | $63,600/yr at 1200 hrs',
    'Mid (100%): $89/hr → $712/day | $15,417/mo | $106,800/yr at 1200 hrs',
    'Skilled (125%): $112/hr → $896/day | $19,395/mo | $134,400/yr at 1200 hrs',
    'Premium (150%): $134/hr → $1,072/day | $23,205/mo | $160,800/yr at 1200 hrs',
    'Expert (200%): $179/hr → $1,432/day | $31,001/mo | $214,800/yr at 1200 hrs',
  ],
  faq: [
    { q: 'How do I know if my rate is too high?', a: 'If you win every proposal, your rate is too low. Aim to lose 20-30% of proposals on price — that means you are charging what you are worth.' },
    { q: 'Should I charge different rates for different clients?', a: 'Yes. Charge startups less (with equity upside), enterprises more. Adjust for project complexity, deadline pressure, and ongoing relationship value.' },
    { q: 'How often should I raise my rates?', a: 'Every 6 months or after every 3 completed projects. Notify existing clients 30 days in advance. New clients get the new rate immediately.' },
    { q: 'What about value-based pricing?', a: 'For projects where you can quantify the client\'s ROI (e.g., "this landing page will generate $50K"), charge 10-20% of the expected value instead of hourly.' },
    { q: 'Are these rates realistic for global markets?', a: 'The calculator adjusts based on your target income and billable hours, not regional averages. If you work remotely for US/EU clients, charge US/EU rates regardless of where you live. The market ladder (junior → expert) gives you anchors regardless of geography.' },
  ],
  howToUse: [
    'Enter your target annual net income (after taxes, before profit).',
    'Enter your annual business expenses (software, equipment, insurance).',
    'Enter realistic billable hours — most freelancers bill 900-1,400/yr.',
    'Enter desired profit (what you want to keep above expenses).',
    'Review your required hourly rate and the skilled/premium/expert multipliers.',
    'See how raising rates 20-50% impacts annual revenue at your billable hours.',
  ],
};

registerEngine(engine);