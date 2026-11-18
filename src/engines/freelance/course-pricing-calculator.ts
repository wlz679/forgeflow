import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

function calculateCoursePricing(inputs: Record<string, string>): string[] {
  const targetMonthlyIncome = clampNonNegative(parseFloat(inputs.targetMonthlyIncome) || 0);
  const estimatedBuyersPerMonth = clampNonNegative(parseFloat(inputs.estimatedBuyersPerMonth) || 0);
  const platformFee = clampNonNegative(parseFloat(inputs.platformFee) || 0);
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
      ? '• 🟢 Price point ' + fmt2(optimalPrice) + ' is in the premium tier — high-quality courses command this.\n'
      : optimalPrice >= 50
      ? '• 🟡 Price point ' + fmt2(optimalPrice) + ' is mid-market — sweet spot for volume.\n'
      : '• 🟠 Price point ' + fmt2(optimalPrice) + ' is budget — need high conversion to hit income goal.\n') +
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
  `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let f=function(i){return Number.isNaN(i)?0:Math.max(0,i)},M=function(i){const m=f(parseFloat(i.targetMonthlyIncome)||0),n=f(parseFloat(i.estimatedBuyersPerMonth)||0),t=f(parseFloat(i.platformFee)||0),y=[],A=1/(1-t/100),o=n>0?m/n*A:0,C=n>0?m/n:0,g=o*n,v=g*(t/100),c=g-v,d=o,l=c*12,E=d*1.5,p=40,s=p>0?l/(p*12):0,k=.02,w=n>0?Math.round(n/k):0,T=w*k*d*.7,S=d*3.5,P=S*n*.3,B=c*12,N=P*12,e=r=>"$"+r.toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0}),a=r=>"$"+r.toFixed(2),h=r=>r.toFixed(1)+"%",u=r=>Math.round(r).toLocaleString();y.push(\`🎓 Course Pricing Calculator

💰 Revenue Projection:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Target Monthly Income:    \`+e(m)+\`
• Est. Buyers/Month:        \`+u(n)+\`
• Platform Fee:             \`+h(t)+\`
• Optimal Price:           \`+a(o)+\`/student
• Breakeven Price:         \`+a(C)+\`/student  (before fees)
• Gross Revenue:           \`+e(g)+\`/mo
• Platform Takes:          \`+e(v)+\`/mo
• Net Revenue:             \`+e(c)+\`/mo
• Annual Net Revenue:      \`+e(l)+\`/yr

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📐 Pricing Metrics:
• Price per Student:         \`+a(d)+\`
• $/Hour of Creation:      \`+e(s)+"/hr  ("+a(l/Math.max(p*12,1))+\` earned per hour invested)
• Estimated LTV (with upsell):  \`+a(E)+\`  (1.5x base price)
• Gross Margin:            \`+h(100-t)+\`  (after platform fee)
• Annual Course Earnings:  \`+e(l)+\`/yr  (at this monthly run rate)
• Payback to course creator:  ~\`+Math.round(p*12/Math.max(c,1)*100)/100+\` months to recoup creation effort

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🩺 Pricing Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(s>=1e3?"• 🟢 $"+Math.round(s)+\`/hr-of-effort is excellent — course pays back creation time many times over.
\`:s>=500?"• 🟢 $"+Math.round(s)+\`/hr-of-effort is strong — solid creator economics.
\`:s>=200?"• 🟡 $"+Math.round(s)+\`/hr-of-effort is workable — could price higher for premium tier.
\`:s>=50?"• 🟠 $"+Math.round(s)+\`/hr-of-effort is low — underpriced or under-selling.
\`:"• 🔴 $"+Math.round(s)+\`/hr-of-effort is too low — raise price or grow audience.
\`)+(o>=200?"• 🟢 Price point "+a(o)+\` is in the premium tier — high-quality courses command this.
\`:o>=50?"• 🟡 Price point "+a(o)+\` is mid-market — sweet spot for volume.
\`:"• 🟠 Price point "+a(o)+\` is budget — need high conversion to hit income goal.
\`)+(n>=50?"• 🟢 "+u(n)+\` buyers/mo is a solid funnel size.
\`:n>=20?"• 🟡 "+u(n)+\` buyers/mo is workable but tight.
\`:\`• 🔴 Under 20 buyers/mo — review channel strategy.
\`)+(t<=5?"• 🟢 Platform fee "+h(t)+\` is low (self-hosted or Podia).
\`:t<=15?"• 🟡 Platform fee "+h(t)+\` is standard (Teachable, Thinkific).
\`:"• 🟠 Platform fee "+h(t)+\` is high — consider self-hosted.
\`)+\`
🎯 Launch Revenue:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Email list needed:        ~\`+u(w)+\`  (at 2% conversion)
• Launch revenue (30% off):  \`+e(T)+\`
• Sustained monthly:        \`+e(c)+\`/mo
• 12-month projection:      \`+e(l)+\`/yr
• With upsell to cohort:    \`+e(P*12+l)+\`/yr potential

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ Self-Study vs Cohort Break-Even:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Self-study annual:      \`+e(B)+\`/yr
• Cohort premium:          \`+a(S)+\`/student  (3.5x self-study)
• Cohort annual (30% take): \`+e(N)+\`/yr
• Cohort takes more time:  +10-15 hrs/wk of your time
• Break-even: cohort needs 30% take rate to beat self-study

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 What-If Scenarios:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Raise price 30%:        \`+a(o*1.3)+"/student  ("+e(o*1.3*n*(1-t/100))+\`/mo net)
• Double buyers (2x reach): \`+e(c*2)+"/mo  ("+e(c*24)+\`/yr)
• Self-host (0% fee):     \`+e(o*n)+"/mo gross (saves "+e(v)+\`/mo)
• Add cohort tier (30% take):  +\`+e(P*12)+\`/yr
• Bundle w/ coaching:     +\`+e(o*.5*n*.2*12)+\`/yr  (20% take coaching upsell)

💡 Tip: Most creators underprice their first course. Test a higher launch price with a 30% early-bird discount rather than setting a permanent low price. Adding a payment plan (3 x monthly) at 1.5-2x the one-time price often increases total revenue per student by 20-40% — buyers who can't afford $497 upfront will pay $199 × 3 = $597.\`);const F=[29,49,97,147,197,297,497,697,997];for(let r=0;r<F.length;r++){const $=F[r],x=$*n,L=x*(t/100),_=x-L,D=_*12;y.push("At $"+$+" price: "+u(Math.round(_))+"/mo net  ("+u(Math.round(D))+"/yr) at "+u(n)+" buyers/mo")}return y},b=function(i,m,n){var t=R(i);return Array.isArray(t)?t.join(\`
\`):String(t)};var H=f,I=M,j=b,R=function(i){return M(i)};return[b(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

const engine: ToolEngine = {
  slug: 'solopreneur-course-pricing-calculator',
  title: 'Course Pricing Calculator',
  description: 'Find the optimal course price to hit your income goals, factoring in platform fees and creation effort. Includes $/hour-of-effort analysis and self-study vs cohort break-even.',
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
    { q: "How do I price an online course?", a: "Course pricing tiers: intro/short course ($50-200), mid-tier ($200-500), comprehensive ($500-2000), premium/coaching ($2000-10000). Price based on: 1) Outcome delivered (job, certification, transformation), 2) Audience purchasing power, 3) Competitive positioning. Premium pricing signals quality; cheap signals low value." },
    { q: "What is the right price for a course in 2026?", a: "Industry average: $200-500 for self-paced, $500-2000 for cohort-based, $2000-10000 for premium with coaching. Most successful courses: $300-1000. Under $100 is hard to be profitable. Over $2000 needs strong brand and proven outcomes. Test price: 3-5 price points, measure conversion rate × price for revenue." },
    { q: "How do I justify a high course price?", a: "High prices need: 1) Clear transformation/outcome (e.g., \"Get a $100K job\"), 2) Case studies and testimonials, 3) Strong instructor credibility, 4) Comprehensive materials (1-on-1 coaching, live calls, community), 5) Risk reversal (money-back guarantee). Premium pricing signals value. Test $500-2000 range with strong copy." },
    { q: "Should I offer payment plans?", a: "Yes: payment plans increase conversion 30-100%. Common: 3-6 monthly installments. Example: $500 course = $167 × 3 months. Use Stripe or Thinkific. Plans reduce sticker shock but add admin. Verify: total payment > course price to cover fees. Plans require reliable recurring billing (use Stripe)." },
    { q: "How do I calculate course profitability?", a: "Revenue = students × price. Costs: platform fees (Teachable/Thinkific: $1-99/month + 5-10% transaction), content creation time (1-3 months), marketing (typical 30-50% of revenue), refunds (5-15%). Margin: 50-70% is good, 30%+ is sustainable. Track per-course ROI: (revenue - costs) / costs." },
    { q: "What is the average conversion rate for course sales pages?", a: "Benchmarks: 1-3% for cold traffic. 5-10% for warm email lists. 10-20% for pre-launch sequences. Above 30% = exceptional. Free webinars: 5-15% conversion. Pricing page: 2-5%. Test: headline, social proof, price anchor, guarantee. Most course revenue lift comes from email sequence + price testing." },
    { q: "How do I scale course revenue?", a: "Three levers: 1) More students (paid ads, SEO, partnerships), 2) Higher price (raise every 6-12 months), 3) Backend offers (coaching, mastermind, certification). Top instructors: $200K-2M/year from courses. Key: work backwards from revenue goal. $500K/year = 1000 students at $500 or 250 at $2000." },
    { q: "Should I create a cohort-based or self-paced course?", a: "Cohort-based: higher engagement, accountability, 2-5x higher price, more time-intensive. Self-paced: scalable, no instructor time per student, lower price, higher refund risk. Hybrid: self-paced content + periodic cohort calls. New instructors: start cohort (build relationships). Scaled: self-paced (passive income)." },
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
  engineKey: true,
};

registerEngine(engine);