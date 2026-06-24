import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculateCoursePricing(inputs: Record<string, string>): string[] {
  const targetMonthlyIncome = parseFloat(inputs.targetMonthlyIncome) || 0;
  const estimatedBuyersPerMonth = parseFloat(inputs.estimatedBuyersPerMonth) || 0;
  const platformFee = parseFloat(inputs.platformFee) || 0;
  const results: string[] = [];

  const feeMultiplier = 1 / (1 - platformFee / 100);
  const optimalPrice = estimatedBuyersPerMonth > 0 ? (targetMonthlyIncome / estimatedBuyersPerMonth) * feeMultiplier : 0;
  const breakevenPrice = estimatedBuyersPerMonth > 0 ? targetMonthlyIncome / estimatedBuyersPerMonth : 0;
  const grossRevenue = optimalPrice * estimatedBuyersPerMonth;
  const platformTake = grossRevenue * (platformFee / 100);
  const netRevenue = grossRevenue - platformTake;
  const pricePerStudent = optimalPrice;
  const annualRevenue = netRevenue * 12;
  const ltv = pricePerStudent * 1.5; // assume 50% take rate on upsell/cohort

  const effortHours = 40; // typical creator input (4-12 weeks to produce)
  const pricePerHourOfEffort = effortHours > 0 ? annualRevenue / (effortHours * 12) : 0;
  const launchConversion = 0.02; // 2% launch conversion from email
  const estimatedEmailSize = estimatedBuyersPerMonth > 0 ? Math.round(estimatedBuyersPerMonth / launchConversion) : 0;
  const launchRevenue = estimatedEmailSize * launchConversion * pricePerStudent * 0.7; // 30% launch discount

  const cohortPrice = pricePerStudent * 3.5; // cohort commands 3-4x premium
  const cohortNet = cohortPrice * estimatedBuyersPerMonth * 0.3; // 30% take rate on cohort
  const selfStudyAnnual = netRevenue * 12;
  const cohortAnnual = cohortNet * 12;

  const fmt = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmt2 = (n: number) => '$' + n.toFixed(2);
  const pct = (n: number) => n.toFixed(1) + '%';
  const loc = (n: number) => Math.round(n).toLocaleString();

  results.push(
    '🎓 Course Pricing Calculator\n\n' +
    '💰 Revenue Projection:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Target Monthly Income:    ' + fmt(targetMonthlyIncome) + '\n' +
    '• Est. Buyers/Month:        ' + loc(estimatedBuyersPerMonth) + '\n' +
    '• Platform Fee:             ' + pct(platformFee) + '\n' +
    '• Optimal Price:           ' + fmt2(optimalPrice) + '/student\n' +
    '• Breakeven Price:         ' + fmt2(breakevenPrice) + '/student  (before fees)\n' +
    '• Gross Revenue:           ' + fmt(grossRevenue) + '/mo\n' +
    '• Platform Takes:          ' + fmt(platformTake) + '/mo\n' +
    '• Net Revenue:             ' + fmt(netRevenue) + '/mo\n' +
    '• Annual Net Revenue:      ' + fmt(annualRevenue) + '/yr\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Pricing Metrics:\n' +
    '• Price per Student:         ' + fmt2(pricePerStudent) + '\n' +
    '• $/Hour of Creation:      ' + fmt(pricePerHourOfEffort) + '/hr  (' + fmt2(annualRevenue / Math.max(effortHours * 12, 1)) + ' earned per hour invested)\n' +
    '• Estimated LTV (with upsell):  ' + fmt2(ltv) + '  (1.5x base price)\n' +
    '• Gross Margin:            ' + pct(100 - platformFee) + '  (after platform fee)\n' +
    '• Annual Course Earnings:  ' + fmt(annualRevenue) + '/yr  (at this monthly run rate)\n' +
    '• Payback to course creator:  ~' + Math.round(effortHours * 12 / Math.max(netRevenue, 1) * 100) / 100 + ' months to recoup creation effort\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Pricing Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (pricePerHourOfEffort >= 1000
      ? '• 🟢 $' + Math.round(pricePerHourOfEffort) + '/hr-of-effort is excellent — course pays back creation time many times over.\n'
      : pricePerHourOfEffort >= 500
      ? '• 🟢 $' + Math.round(pricePerHourOfEffort) + '/hr-of-effort is strong — solid creator economics.\n'
      : pricePerHourOfEffort >= 200
      ? '• 🟡 $' + Math.round(pricePerHourOfEffort) + '/hr-of-effort is workable — could price higher for premium tier.\n'
      : pricePerHourOfEffort >= 50
      ? '• 🟠 $' + Math.round(pricePerHourOfEffort) + '/hr-of-effort is low — underpriced or under-selling.\n'
      : '• 🔴 $' + Math.round(pricePerHourOfEffort) + '/hr-of-effort is too low — raise price or grow audience.\n') +
    (optimalPrice >= 200
      ? '• 🟢 Price point $' + fmt2(optimalPrice) + ' is in the premium tier — high-quality courses command this.\n'
      : optimalPrice >= 50
      ? '• 🟡 Price point $' + fmt2(optimalPrice) + ' is mid-market — sweet spot for volume.\n'
      : '• 🟠 Price point $' + fmt2(optimalPrice) + ' is budget — need high conversion to hit income goal.\n') +
    (estimatedBuyersPerMonth >= 50
      ? '• 🟢 ' + loc(estimatedBuyersPerMonth) + ' buyers/mo is a solid funnel size.\n'
      : estimatedBuyersPerMonth >= 20
      ? '• 🟡 ' + loc(estimatedBuyersPerMonth) + ' buyers/mo is workable but tight.\n'
      : '• 🔴 Under 20 buyers/mo — review channel strategy.\n') +
    (platformFee <= 5
      ? '• 🟢 Platform fee ' + pct(platformFee) + ' is low (self-hosted or Podia).\n'
      : platformFee <= 15
      ? '• 🟡 Platform fee ' + pct(platformFee) + ' is standard (Teachable, Thinkific).\n'
      : '• 🟠 Platform fee ' + pct(platformFee) + ' is high — consider self-hosted.\n') +
    '\n🎯 Launch Revenue:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Email list needed:        ~' + loc(estimatedEmailSize) + '  (at 2% conversion)\n' +
    '• Launch revenue (30% off):  ' + fmt(launchRevenue) + '\n' +
    '• Sustained monthly:        ' + fmt(netRevenue) + '/mo\n' +
    '• 12-month projection:      ' + fmt(annualRevenue) + '/yr\n' +
    '• With upsell to cohort:    ' + fmt(cohortNet * 12 + annualRevenue) + '/yr potential\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Self-Study vs Cohort Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Self-study annual:      ' + fmt(selfStudyAnnual) + '/yr\n' +
    '• Cohort premium:          ' + fmt2(cohortPrice) + '/student  (3.5x self-study)\n' +
    '• Cohort annual (30% take): ' + fmt(cohortAnnual) + '/yr\n' +
    '• Cohort takes more time:  +10-15 hrs/wk of your time\n' +
    '• Break-even: cohort needs 30% take rate to beat self-study\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Raise price 30%:        ' + fmt2(optimalPrice * 1.3) + '/student  (' + fmt(optimalPrice * 1.3 * estimatedBuyersPerMonth * (1 - platformFee / 100)) + '/mo net)\n' +
    '• Double buyers (2x reach): ' + fmt(netRevenue * 2) + '/mo  (' + fmt(netRevenue * 24) + '/yr)\n' +
    '• Self-host (0% fee):     ' + fmt(optimalPrice * estimatedBuyersPerMonth) + '/mo gross (saves ' + fmt(platformTake) + '/mo)\n' +
    '• Add cohort tier (30% take):  +' + fmt(cohortNet * 12) + '/yr\n' +
    '• Bundle w/ coaching:     +' + fmt(optimalPrice * 0.5 * estimatedBuyersPerMonth * 0.2 * 12) + '/yr  (20% take coaching upsell)\n\n' +
    '💡 Tip: Most creators underprice their first course. Test a higher launch price with a 30% early-bird discount rather than setting a permanent low price. Adding a payment plan (3 x monthly) at 1.5-2x the one-time price often increases total revenue per student by 20-40% — buyers who can\'t afford $497 upfront will pay $199 × 3 = $597.',
  );

  const pricePoints = [29, 49, 97, 147, 197, 297, 497, 697, 997];
  for (let i = 0; i < pricePoints.length; i++) {
    const p = pricePoints[i];
    const gross = p * estimatedBuyersPerMonth;
    const fee = gross * (platformFee / 100);
    const net = gross - fee;
    const annual = net * 12;
    results.push(
      'At $' + p + ' price: ' + loc(Math.round(net)) + '/mo net  (' + loc(Math.round(annual)) + '/yr) at ' + loc(estimatedBuyersPerMonth) + ' buyers/mo',
    );
  }

  return results;
}

const customFn =
  "var tmi=parseFloat(inputs.targetMonthlyIncome)||0;" +
  "var ebm=parseFloat(inputs.estimatedBuyersPerMonth)||0;" +
  "var pf=parseFloat(inputs.platformFee)||0;" +
  "var fm=1/(1-pf/100);" +
  "var op=ebm>0?(tmi/ebm)*fm:0;" +
  "var bp=ebm>0?tmi/ebm:0;" +
  "var gr=op*ebm;" +
  "var pt=gr*(pf/100);" +
  "var nr=gr-pt;" +
  "var pps=op;" +
  "var ar=nr*12;" +
  "var ltv=pps*1.5;" +
  "var eh=40;" +
  "var pphoe=eh>0?ar/(eh*12):0;" +
  "var lc=0.02;" +
  "var es=ebm>0?Math.round(ebm/lc):0;" +
  "var lr=es*lc*pps*0.7;" +
  "var cp=pps*3.5;" +
  "var cn=cp*ebm*0.3;" +
  "var ssa=nr*12;" +
  "var ca=cn*12;" +
  "function fmt(n){return '$'+n.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0})}" +
  "function fmt2(n){return '$'+n.toFixed(2)}" +
  "function pct(n){return n.toFixed(1)+'%'}" +
  "function loc(n){return Math.round(n).toLocaleString()}" +
  "var results=[];" +
  "var r='';" +
  "r+='\\uD83C\\uDF93 Course Pricing Calculator\\n\\n';" +
  "r+='\\uD83D\\uDCB0 Revenue Projection:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Target Monthly Income:    '+fmt(tmi)+'\\n';" +
  "r+='\\u2022 Est. Buyers/Month:        '+loc(ebm)+'\\n';" +
  "r+='\\u2022 Platform Fee:             '+pct(pf)+'\\n';" +
  "r+='\\u2022 Optimal Price:           '+fmt2(op)+'/student\\n';" +
  "r+='\\u2022 Breakeven Price:         '+fmt2(bp)+'/student  (before fees)\\n';" +
  "r+='\\u2022 Gross Revenue:           '+fmt(gr)+'/mo\\n';" +
  "r+='\\u2022 Platform Takes:          '+fmt(pt)+'/mo\\n';" +
  "r+='\\u2022 Net Revenue:             '+fmt(nr)+'/mo\\n';" +
  "r+='\\u2022 Annual Net Revenue:      '+fmt(ar)+'/yr\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDCD0 Pricing Metrics:\\n';" +
  "r+='\\u2022 Price per Student:         '+fmt2(pps)+'\\n';" +
  "r+='\\u2022 $/Hour of Creation:      '+fmt(pphoe)+'/hr  ('+fmt2(ar/Math.max(eh*12,1))+' earned per hour invested)\\n';" +
  "r+='\\u2022 Estimated LTV (with upsell):  '+fmt2(ltv)+'  (1.5x base price)\\n';" +
  "r+='\\u2022 Gross Margin:            '+pct(100-pf)+'  (after platform fee)\\n';" +
  "r+='\\u2022 Annual Course Earnings:  '+fmt(ar)+'/yr  (at this monthly run rate)\\n';" +
  "r+='\\u2022 Payback to course creator:  ~'+Math.round(eh*12/Math.max(nr,1)*100)/100+' months to recoup creation effort\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83E\\uDE7A Pricing Health:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "if(pphoe>=1000){r+='\\u2022 \\uD83D\\uDFE2 $'+Math.round(pphoe)+'/hr-of-effort is excellent \\u2014 course pays back creation time many times over.\\n';}" +
  "else if(pphoe>=500){r+='\\u2022 \\uD83D\\uDFE2 $'+Math.round(pphoe)+'/hr-of-effort is strong \\u2014 solid creator economics.\\n';}" +
  "else if(pphoe>=200){r+='\\u2022 \\uD83D\\uDFE1 $'+Math.round(pphoe)+'/hr-of-effort is workable \\u2014 could price higher for premium tier.\\n';}" +
  "else if(pphoe>=50){r+='\\u2022 \\uD83D\\uDFE0 $'+Math.round(pphoe)+'/hr-of-effort is low \\u2014 underpriced or under-selling.\\n';}" +
  "else{r+='\\u2022 \\uD83D\\uDD34 $'+Math.round(pphoe)+'/hr-of-effort is too low \\u2014 raise price or grow audience.\\n';}" +
  "if(op>=200){r+='\\u2022 \\uD83D\\uDFE2 Price point $'+fmt2(op)+' is in the premium tier \\u2014 high-quality courses command this.\\n';}" +
  "else if(op>=50){r+='\\u2022 \\uD83D\\uDFE1 Price point $'+fmt2(op)+' is mid-market \\u2014 sweet spot for volume.\\n';}" +
  "else{r+='\\u2022 \\uD83D\\uDFE0 Price point $'+fmt2(op)+' is budget \\u2014 need high conversion to hit income goal.\\n';}" +
  "if(ebm>=50){r+='\\u2022 \\uD83D\\uDFE2 '+loc(ebm)+' buyers/mo is a solid funnel size.\\n';}" +
  "else if(ebm>=20){r+='\\u2022 \\uD83D\\uDFE1 '+loc(ebm)+' buyers/mo is workable but tight.\\n';}" +
  "else{r+='\\u2022 \\uD83D\\uDD34 Under 20 buyers/mo \\u2014 review channel strategy.\\n';}" +
  "if(pf<=5){r+='\\u2022 \\uD83D\\uDFE2 Platform fee '+pct(pf)+' is low (self-hosted or Podia).\\n';}" +
  "else if(pf<=15){r+='\\u2022 \\uD83D\\uDFE1 Platform fee '+pct(pf)+' is standard (Teachable, Thinkific).\\n';}" +
  "else{r+='\\u2022 \\uD83D\\uDFE0 Platform fee '+pct(pf)+' is high \\u2014 consider self-hosted.\\n';}" +
  "r+='\\n\\uD83C\\uDFAF Launch Revenue:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Email list needed:        ~'+loc(es)+'  (at 2% conversion)\\n';" +
  "r+='\\u2022 Launch revenue (30% off):  '+fmt(lr)+'\\n';" +
  "r+='\\u2022 Sustained monthly:        '+fmt(nr)+'/mo\\n';" +
  "r+='\\u2022 12-month projection:      '+fmt(ar)+'/yr\\n';" +
  "r+='\\u2022 With upsell to cohort:    '+fmt(cn*12+ar)+'/yr potential\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\u2696\\uFE0F Self-Study vs Cohort Break-Even:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Self-study annual:      '+fmt(ssa)+'/yr\\n';" +
  "r+='\\u2022 Cohort premium:          '+fmt2(cp)+'/student  (3.5x self-study)\\n';" +
  "r+='\\u2022 Cohort annual (30% take): '+fmt(ca)+'/yr\\n';" +
  "r+='\\u2022 Cohort takes more time:  +10-15 hrs/wk of your time\\n';" +
  "r+='\\u2022 Break-even: cohort needs 30% take rate to beat self-study\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDD04 What-If Scenarios:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Raise price 30%:        '+fmt2(op*1.3)+'/student  ('+fmt(op*1.3*ebm*(1-pf/100))+'/mo net)\\n';" +
  "r+='\\u2022 Double buyers (2x reach): '+fmt(nr*2)+'/mo  ('+fmt(nr*24)+'/yr)\\n';" +
  "r+='\\u2022 Self-host (0% fee):     '+fmt(op*ebm)+'/mo gross (saves '+fmt(pt)+'/mo)\\n';" +
  "r+='\\u2022 Add cohort tier (30% take):  +'+fmt(cn*12)+'/yr\\n';" +
  "r+='\\u2022 Bundle w/ coaching:     +'+fmt(op*0.5*ebm*0.2*12)+'/yr  (20% take coaching upsell)\\n\\n';" +
  "r+='\\uD83D\\uDCA1 Tip: Most creators underprice their first course. Test a higher launch price with a 30% early-bird discount rather than setting a permanent low price. Adding a payment plan (3 x monthly) at 1.5-2x the one-time price often increases total revenue per student by 20-40% \\u2014 buyers who can\\'t afford $497 upfront will pay $199 \\u00d7 3 = $597.';" +
  "results.push(r);" +
  "var pp=[29,49,97,147,197,297,497,697,997];" +
  "for(var i=0;i<pp.length;i++){" +
  "var p=pp[i];" +
  "var gr2=p*ebm;" +
  "var f=gr2*(pf/100);" +
  "var n=gr2-f;" +
  "var an=n*12;" +
  "results.push('At $'+p+' price: '+loc(Math.round(n))+'/mo net  ('+loc(Math.round(an))+'/yr) at '+loc(ebm)+' buyers/mo');" +
  "}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-course-pricing-calculator',
  title: 'Course Pricing Calculator',
  description: 'Find the optimal course price to hit your income goals, factoring in platform fees and creation effort. Includes $/hour-of-effort analysis and self-study vs cohort break-even.',
  category: 'C',
  inputs: [
    { name: 'targetMonthlyIncome', label: 'Target Monthly Income ($)', placeholder: 'e.g. 5000', type: 'number' },
    { name: 'estimatedBuyersPerMonth', label: 'Est. Buyers Per Month', placeholder: 'e.g. 50', type: 'number' },
    { name: 'platformFee', label: 'Platform Fee (%)', placeholder: 'e.g. 10', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs: Record<string, string>): string[] {
    return calculateCoursePricing(inputs);
  },
  staticExamples: [
    '🎓 Course Pricing Calculator\n\n💰 Revenue Projection:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Target Monthly Income:    $5,000\n• Est. Buyers/Month:        50\n• Platform Fee:             10.0%\n• Optimal Price:           $111.11/student\n• Breakeven Price:         $100.00/student  (before fees)\n• Gross Revenue:           $5,556/mo\n• Platform Takes:          $556/mo\n• Net Revenue:             $5,000/mo\n• Annual Net Revenue:      $60,000/yr\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Pricing Metrics:\n• Price per Student:         $111.11\n• $/Hour of Creation:      $125/hr  ($125.00 earned per hour invested)\n• Estimated LTV (with upsell):  $166.67  (1.5x base price)\n• Gross Margin:            90.0%  (after platform fee)\n• Annual Course Earnings:  $60,000/yr  (at this monthly run rate)\n• Payback to course creator:  ~0.1 months to recoup creation effort\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Pricing Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟠 $125/hr-of-effort is low — underpriced or under-selling.\n• 🟡 Price point $111.11 is mid-market — sweet spot for volume.\n• 🟢 50 buyers/mo is a solid funnel size.\n• 🟡 Platform fee 10.0% is standard (Teachable, Thinkific).\n\n🎯 Launch Revenue:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Email list needed:        ~2,500  (at 2% conversion)\n• Launch revenue (30% off):  $3,889\n• Sustained monthly:        $5,000/mo\n• 12-month projection:      $60,000/yr\n• With upsell to cohort:    $130,000/yr potential\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Self-Study vs Cohort Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Self-study annual:      $60,000/yr\n• Cohort premium:          $388.89/student  (3.5x self-study)\n• Cohort annual (30% take): $70,000/yr\n• Cohort takes more time:  +10-15 hrs/wk of your time\n• Break-even: cohort needs 30% take rate to beat self-study\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Raise price 30%:        $144.44/student  ($6,500/mo net)\n• Double buyers (2x reach): $10,000/mo  ($120,000/yr)\n• Self-host (0% fee):     $5,556/mo gross (saves $556/mo)\n• Add cohort tier (30% take):  +$70,000/yr\n• Bundle w/ coaching:     +$6,667/yr  (20% take coaching upsell)\n\n💡 Tip: Most creators underprice their first course. Test a higher launch price with a 30% early-bird discount rather than setting a permanent low price. Adding a payment plan (3 x monthly) at 1.5-2x the one-time price often increases total revenue per student by 20-40% — buyers who can\'t afford $497 upfront will pay $199 × 3 = $597.\nAt $29 price: 1,305/mo net  (15,660/yr) at 50 buyers/mo\nAt $49 price: 2,205/mo net  (26,460/yr) at 50 buyers/mo\nAt $97 price: 4,365/mo net  (52,380/yr) at 50 buyers/mo\nAt $147 price: 6,615/mo net  (79,380/yr) at 50 buyers/mo\nAt $197 price: 8,865/mo net  (106,380/yr) at 50 buyers/mo\nAt $297 price: 13,365/mo net  (160,380/yr) at 50 buyers/mo\nAt $497 price: 22,365/mo net  (268,380/yr) at 50 buyers/mo\nAt $697 price: 31,365/mo net  (376,380/yr) at 50 buyers/mo\nAt $997 price: 44,865/mo net  (538,380/yr) at 50 buyers/mo',
    'At $29 price: 1,305/mo net  (15,660/yr) at 50 buyers/mo',
    'At $49 price: 2,205/mo net  (26,460/yr) at 50 buyers/mo',
    'At $97 price: 4,365/mo net  (52,380/yr) at 50 buyers/mo',
    'At $147 price: 6,615/mo net  (79,380/yr) at 50 buyers/mo',
    'At $197 price: 8,865/mo net  (106,380/yr) at 50 buyers/mo',
    'At $297 price: 13,365/mo net  (160,380/yr) at 50 buyers/mo',
    'At $497 price: 22,365/mo net  (268,380/yr) at 50 buyers/mo',
    'At $697 price: 31,365/mo net  (376,380/yr) at 50 buyers/mo',
    'At $997 price: 44,865/mo net  (538,380/yr) at 50 buyers/mo',
  ],
  faq: [
    { q: 'What platform fee should I expect?', a: 'Udemy takes 3-63% depending on how the student found your course. Teachable and Podia charge 5-10% on paid plans. Gumroad charges 10%. Self-hosted solutions like WordPress with WooCommerce have 0% platform fees but require payment processing fees of 2.9% + $0.30 per transaction.' },
    { q: 'How many buyers per month is realistic for a course?', a: 'A course with a modest email list (2,000-5,000 subscribers) and some organic traffic can expect 20-50 sales per month at launch, tapering to 10-30 monthly thereafter. Courses with large audiences (50K+ subscribers or high-traffic blogs) can sustain 100-500 monthly buyers.' },
    { q: 'Should I offer a payment plan?', a: 'Yes. Offering a 3-month payment plan at a higher total price (e.g., $149 one-time or 3 x $69 = $207) can increase conversion rates by 20-40% and boost total revenue per student. Payment plans also attract buyers who cannot afford the upfront cost.' },
    { q: 'How do I know if my course price is too high?', a: 'If your sales page conversion rate is below 0.5%, your price may be too high for your audience, or your sales page needs improvement. If conversion is above 3%, you might be undercharging. Split-test at different price points to find the sweet spot.' },
    { q: 'What is the best way to launch a course?', a: 'Use a launch sequence: build anticipation with free content, open enrollment for a limited window (7-14 days), and offer an early-bird discount. Close enrollment after the launch to create urgency. Many creators make 50-70% of their annual course revenue during launch weeks.' },
  ],
  howToUse: [
    'Enter how much monthly income you want to earn from your course.',
    'Estimate how many students will purchase your course each month.',
    'Enter your platform fee percentage (Teachable, Gumroad, Udemy, etc.).',
    'Review the optimal price you need to charge after platform fees.',
    'Check the $/hour-of-creation and pricing tier health indicators.',
    'See the self-study vs cohort break-even to plan your offering tier.',
    'Compare revenue outcomes at 9 different price points.',
  ],
};

registerEngine(engine);