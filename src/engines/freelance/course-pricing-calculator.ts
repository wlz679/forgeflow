import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-13：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

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
    makeToken('calc_out.course_pricing.row.target_monthly_income', '• Target Monthly Income:    ' + fmt(targetMonthlyIncome), { income: fmt(targetMonthlyIncome) }) + '\n' +
    makeToken('calc_out.course_pricing.row.est_buyers_per_month', '• Est. Buyers/Month:        ' + loc(estimatedBuyersPerMonth), { buyers: loc(estimatedBuyersPerMonth) }) + '\n' +
    makeToken('calc_out.course_pricing.row.platform_fee', '• Platform Fee:             ' + pct(platformFee), { fee: pct(platformFee) }) + '\n' +
    makeToken('calc_out.course_pricing.row.optimal_price', '• Optimal Price:           ' + fmt2(optimalPrice) + '/student', { price: fmt2(optimalPrice) }) + '\n' +
    makeToken('calc_out.course_pricing.row.breakeven_price', '• Breakeven Price:         ' + fmt2(breakevenPrice) + '/student  (before fees)', { price: fmt2(breakevenPrice) }) + '\n' +
    makeToken('calc_out.course_pricing.row.gross_revenue', '• Gross Revenue:           ' + fmt(grossRevenue) + '/mo', { revenue: fmt(grossRevenue) }) + '\n' +
    makeToken('calc_out.course_pricing.row.platform_takes', '• Platform Takes:          ' + fmt(platformTake) + '/mo', { revenue: fmt(platformTake) }) + '\n' +
    makeToken('calc_out.course_pricing.row.net_revenue', '• Net Revenue:             ' + fmt(netRevenue) + '/mo', { revenue: fmt(netRevenue) }) + '\n' +
    makeToken('calc_out.course_pricing.row.annual_net_revenue', '• Annual Net Revenue:      ' + fmt(annualRevenue) + '/yr', { revenue: fmt(annualRevenue) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Pricing Metrics:\n' +
    makeToken('calc_out.course_pricing.row.price_per_student', '• Price per Student:         ' + fmt2(pricePerStudent), { price: fmt2(pricePerStudent) }) + '\n' +
    makeToken('calc_out.course_pricing.row.hour_of_creation', '• $/Hour of Creation:      ' + fmt(pricePerHourOfEffort) + '/hr  (' + fmt2(annualRevenue / Math.max(effortHours * 12, 1)) + ' earned per hour invested)', { perhour: fmt(pricePerHourOfEffort), earned: fmt2(annualRevenue / Math.max(effortHours * 12, 1)) }) + '\n' +
    makeToken('calc_out.course_pricing.row.estimated_ltv', '• Estimated LTV (with upsell):  ' + fmt2(ltv) + '  (1.5x base price)', { ltv: fmt2(ltv) }) + '\n' +
    makeToken('calc_out.course_pricing.row.gross_margin', '• Gross Margin:            ' + pct(100 - platformFee) + '  (after platform fee)', { margin: pct(100 - platformFee) }) + '\n' +
    makeToken('calc_out.course_pricing.row.annual_course_earnings', '• Annual Course Earnings:  ' + fmt(annualRevenue) + '/yr  (at this monthly run rate)', { revenue: fmt(annualRevenue) }) + '\n' +
    makeToken('calc_out.course_pricing.row.payback_months', '• Payback to course creator:  ~' + Math.round(effortHours * 12 / Math.max(netRevenue, 1) * 100) / 100 + ' months to recoup creation effort', { months: String(Math.round(effortHours * 12 / Math.max(netRevenue, 1) * 100) / 100) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Pricing Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (pricePerHourOfEffort >= 1000
      ? makeToken('calc_out.course_pricing.row.health_effort_excellent', '• 🟢 $' + Math.round(pricePerHourOfEffort) + '/hr-of-effort is excellent — course pays back creation time many times over.', { rate: String(Math.round(pricePerHourOfEffort)) }) + '\n'
      : pricePerHourOfEffort >= 500
      ? makeToken('calc_out.course_pricing.row.health_effort_strong', '• 🟢 $' + Math.round(pricePerHourOfEffort) + '/hr-of-effort is strong — solid creator economics.', { rate: String(Math.round(pricePerHourOfEffort)) }) + '\n'
      : pricePerHourOfEffort >= 200
      ? makeToken('calc_out.course_pricing.row.health_effort_workable', '• 🟡 $' + Math.round(pricePerHourOfEffort) + '/hr-of-effort is workable — could price higher for premium tier.', { rate: String(Math.round(pricePerHourOfEffort)) }) + '\n'
      : pricePerHourOfEffort >= 50
      ? makeToken('calc_out.course_pricing.row.health_effort_low', '• 🟠 $' + Math.round(pricePerHourOfEffort) + '/hr-of-effort is low — underpriced or under-selling.', { rate: String(Math.round(pricePerHourOfEffort)) }) + '\n'
      : makeToken('calc_out.course_pricing.row.health_effort_too_low', '• 🔴 $' + Math.round(pricePerHourOfEffort) + '/hr-of-effort is too low — raise price or grow audience.', { rate: String(Math.round(pricePerHourOfEffort)) }) + '\n') +
    (optimalPrice >= 200
      ? makeToken('calc_out.course_pricing.row.health_price_premium', '• 🟢 Price point ' + fmt2(optimalPrice) + ' is in the premium tier — high-quality courses command this.', { price: fmt2(optimalPrice) }) + '\n'
      : optimalPrice >= 50
      ? makeToken('calc_out.course_pricing.row.health_price_mid', '• 🟡 Price point ' + fmt2(optimalPrice) + ' is mid-market — sweet spot for volume.', { price: fmt2(optimalPrice) }) + '\n'
      : makeToken('calc_out.course_pricing.row.health_price_budget', '• 🟠 Price point ' + fmt2(optimalPrice) + ' is budget — need high conversion to hit income goal.', { price: fmt2(optimalPrice) }) + '\n') +
    (estimatedBuyersPerMonth >= 50
      ? makeToken('calc_out.course_pricing.row.health_buyers_solid', '• 🟢 ' + loc(estimatedBuyersPerMonth) + ' buyers/mo is a solid funnel size.', { buyers: loc(estimatedBuyersPerMonth) }) + '\n'
      : estimatedBuyersPerMonth >= 20
      ? makeToken('calc_out.course_pricing.row.health_buyers_workable', '• 🟡 ' + loc(estimatedBuyersPerMonth) + ' buyers/mo is workable but tight.', { buyers: loc(estimatedBuyersPerMonth) }) + '\n'
      : makeToken('calc_out.course_pricing.row.health_buyers_under_20', '• 🔴 Under 20 buyers/mo — review channel strategy.') + '\n') +
    (platformFee <= 5
      ? makeToken('calc_out.course_pricing.row.health_fee_low', '• 🟢 Platform fee ' + pct(platformFee) + ' is low (self-hosted or Podia).', { fee: pct(platformFee) }) + '\n'
      : platformFee <= 15
      ? makeToken('calc_out.course_pricing.row.health_fee_standard', '• 🟡 Platform fee ' + pct(platformFee) + ' is standard (Teachable, Thinkific).', { fee: pct(platformFee) }) + '\n'
      : makeToken('calc_out.course_pricing.row.health_fee_high', '• 🟠 Platform fee ' + pct(platformFee) + ' is high — consider self-hosted.', { fee: pct(platformFee) }) + '\n') +
    '\n🎯 Launch Revenue:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.course_pricing.row.email_list_needed', '• Email list needed:        ~' + loc(estimatedEmailSize) + '  (at 2% conversion)', { list: loc(estimatedEmailSize) }) + '\n' +
    makeToken('calc_out.course_pricing.row.launch_revenue', '• Launch revenue (30% off):  ' + fmt(launchRevenue), { revenue: fmt(launchRevenue) }) + '\n' +
    makeToken('calc_out.course_pricing.row.sustained_monthly', '• Sustained monthly:        ' + fmt(netRevenue) + '/mo', { revenue: fmt(netRevenue) }) + '\n' +
    makeToken('calc_out.course_pricing.row.projection_12m', '• 12-month projection:      ' + fmt(annualRevenue) + '/yr', { revenue: fmt(annualRevenue) }) + '\n' +
    makeToken('calc_out.course_pricing.row.with_upsell_cohort', '• With upsell to cohort:    ' + fmt(cohortNet * 12 + annualRevenue) + '/yr potential', { revenue: fmt(cohortNet * 12 + annualRevenue) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.course_pricing.row.self_study_vs_cohort_breakeven', '⚖️ Self-Study vs Cohort Break-Even:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.course_pricing.row.self_study_annual', '• Self-study annual:      ' + fmt(selfStudyAnnual) + '/yr', { revenue: fmt(selfStudyAnnual) }) + '\n' +
    makeToken('calc_out.course_pricing.row.cohort_premium', '• Cohort premium:          ' + fmt2(cohortPrice) + '/student  (3.5x self-study)', { price: fmt2(cohortPrice) }) + '\n' +
    makeToken('calc_out.course_pricing.row.cohort_annual', '• Cohort annual (30% take): ' + fmt(cohortAnnual) + '/yr', { revenue: fmt(cohortAnnual) }) + '\n' +
    makeToken('calc_out.course_pricing.row.cohort_takes_more_time', '• Cohort takes more time:  +10-15 hrs/wk of your time') + '\n' +
    makeToken('calc_out.course_pricing.row.break_even_cohort', '• Break-even: cohort needs 30% take rate to beat self-study') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.course_pricing.row.whatif_raise_price_30', '• Raise price 30%:        ' + fmt2(optimalPrice * 1.3) + '/student  (' + fmt(optimalPrice * 1.3 * estimatedBuyersPerMonth * (1 - platformFee / 100)) + '/mo net)', { price: fmt2(optimalPrice * 1.3), net: fmt(optimalPrice * 1.3 * estimatedBuyersPerMonth * (1 - platformFee / 100)) }) + '\n' +
    makeToken('calc_out.course_pricing.row.whatif_double_buyers', '• Double buyers (2x reach): ' + fmt(netRevenue * 2) + '/mo  (' + fmt(netRevenue * 24) + '/yr)', { monthly: fmt(netRevenue * 2), annual: fmt(netRevenue * 24) }) + '\n' +
    makeToken('calc_out.course_pricing.row.whatif_self_host', '• Self-host (0% fee):     ' + fmt(optimalPrice * estimatedBuyersPerMonth) + '/mo gross (saves ' + fmt(platformTake) + '/mo)', { gross: fmt(optimalPrice * estimatedBuyersPerMonth), saves: fmt(platformTake) }) + '\n' +
    makeToken('calc_out.course_pricing.row.whatif_add_cohort_tier', '• Add cohort tier (30% take):  +' + fmt(cohortNet * 12) + '/yr', { revenue: fmt(cohortNet * 12) }) + '\n' +
    makeToken('calc_out.course_pricing.row.whatif_bundle_coaching', '• Bundle w/ coaching:     +' + fmt(optimalPrice * 0.5 * estimatedBuyersPerMonth * 0.2 * 12) + '/yr  (20% take coaching upsell)', { revenue: fmt(optimalPrice * 0.5 * estimatedBuyersPerMonth * 0.2 * 12) }) + '\n\n' +
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
      makeToken('calc_out.course_pricing.row.price_point', 'At $' + p + ' price: ' + loc(Math.round(net)) + '/mo net  (' + loc(Math.round(annual)) + '/yr) at ' + loc(estimatedBuyersPerMonth) + ' buyers/mo', { price: String(p), net: loc(Math.round(net)), annual: loc(Math.round(annual)), buyers: loc(estimatedBuyersPerMonth) }),
    );
  }

  return results;
}

const customFn =
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let y=function(_){return Number.isNaN(_)?0:Math.max(0,_)},F=function(_){const f=y(parseFloat(_.targetMonthlyIncome)||0),t=y(parseFloat(_.estimatedBuyersPerMonth)||0),o=y(parseFloat(_.platformFee)||0),m=[],D=1/(1-o/100),n=t>0?f/t*D:0,$=t>0?f/t:0,v=n*t,g=v*(o/100),s=v-g,d=n,a=s*12,C=d*1.5,p=40,i=p>0?a/(p*12):0,R=.02,b=t>0?Math.round(t/R):0,A=b*R*d*.7,M=d*3.5,w=M*t*.3,E=s*12,j=w*12,e=l=>"$"+l.toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0}),c=l=>"$"+l.toFixed(2),h=l=>l.toFixed(1)+"%",u=l=>Math.round(l).toLocaleString();m.push(\`🎓 Course Pricing Calculator

💰 Revenue Projection:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+r("calc_out.course_pricing.row.target_monthly_income","• Target Monthly Income:    "+e(f),{income:e(f)})+\`
\`+r("calc_out.course_pricing.row.est_buyers_per_month","• Est. Buyers/Month:        "+u(t),{buyers:u(t)})+\`
\`+r("calc_out.course_pricing.row.platform_fee","• Platform Fee:             "+h(o),{fee:h(o)})+\`
\`+r("calc_out.course_pricing.row.optimal_price","• Optimal Price:           "+c(n)+"/student",{price:c(n)})+\`
\`+r("calc_out.course_pricing.row.breakeven_price","• Breakeven Price:         "+c($)+"/student  (before fees)",{price:c($)})+\`
\`+r("calc_out.course_pricing.row.gross_revenue","• Gross Revenue:           "+e(v)+"/mo",{revenue:e(v)})+\`
\`+r("calc_out.course_pricing.row.platform_takes","• Platform Takes:          "+e(g)+"/mo",{revenue:e(g)})+\`
\`+r("calc_out.course_pricing.row.net_revenue","• Net Revenue:             "+e(s)+"/mo",{revenue:e(s)})+\`
\`+r("calc_out.course_pricing.row.annual_net_revenue","• Annual Net Revenue:      "+e(a)+"/yr",{revenue:e(a)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📐 Pricing Metrics:
\`+r("calc_out.course_pricing.row.price_per_student","• Price per Student:         "+c(d),{price:c(d)})+\`
\`+r("calc_out.course_pricing.row.hour_of_creation","• $/Hour of Creation:      "+e(i)+"/hr  ("+c(a/Math.max(p*12,1))+" earned per hour invested)",{perhour:e(i),earned:c(a/Math.max(p*12,1))})+\`
\`+r("calc_out.course_pricing.row.estimated_ltv","• Estimated LTV (with upsell):  "+c(C)+"  (1.5x base price)",{ltv:c(C)})+\`
\`+r("calc_out.course_pricing.row.gross_margin","• Gross Margin:            "+h(100-o)+"  (after platform fee)",{margin:h(100-o)})+\`
\`+r("calc_out.course_pricing.row.annual_course_earnings","• Annual Course Earnings:  "+e(a)+"/yr  (at this monthly run rate)",{revenue:e(a)})+\`
\`+r("calc_out.course_pricing.row.payback_months","• Payback to course creator:  ~"+Math.round(p*12/Math.max(s,1)*100)/100+" months to recoup creation effort",{months:String(Math.round(p*12/Math.max(s,1)*100)/100)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🩺 Pricing Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(i>=1e3?r("calc_out.course_pricing.row.health_effort_excellent","• 🟢 $"+Math.round(i)+"/hr-of-effort is excellent — course pays back creation time many times over.",{rate:String(Math.round(i))})+\`
\`:i>=500?r("calc_out.course_pricing.row.health_effort_strong","• 🟢 $"+Math.round(i)+"/hr-of-effort is strong — solid creator economics.",{rate:String(Math.round(i))})+\`
\`:i>=200?r("calc_out.course_pricing.row.health_effort_workable","• 🟡 $"+Math.round(i)+"/hr-of-effort is workable — could price higher for premium tier.",{rate:String(Math.round(i))})+\`
\`:i>=50?r("calc_out.course_pricing.row.health_effort_low","• 🟠 $"+Math.round(i)+"/hr-of-effort is low — underpriced or under-selling.",{rate:String(Math.round(i))})+\`
\`:r("calc_out.course_pricing.row.health_effort_too_low","• 🔴 $"+Math.round(i)+"/hr-of-effort is too low — raise price or grow audience.",{rate:String(Math.round(i))})+\`
\`)+(n>=200?r("calc_out.course_pricing.row.health_price_premium","• 🟢 Price point "+c(n)+" is in the premium tier — high-quality courses command this.",{price:c(n)})+\`
\`:n>=50?r("calc_out.course_pricing.row.health_price_mid","• 🟡 Price point "+c(n)+" is mid-market — sweet spot for volume.",{price:c(n)})+\`
\`:r("calc_out.course_pricing.row.health_price_budget","• 🟠 Price point "+c(n)+" is budget — need high conversion to hit income goal.",{price:c(n)})+\`
\`)+(t>=50?r("calc_out.course_pricing.row.health_buyers_solid","• 🟢 "+u(t)+" buyers/mo is a solid funnel size.",{buyers:u(t)})+\`
\`:t>=20?r("calc_out.course_pricing.row.health_buyers_workable","• 🟡 "+u(t)+" buyers/mo is workable but tight.",{buyers:u(t)})+\`
\`:r("calc_out.course_pricing.row.health_buyers_under_20","• 🔴 Under 20 buyers/mo — review channel strategy.")+\`
\`)+(o<=5?r("calc_out.course_pricing.row.health_fee_low","• 🟢 Platform fee "+h(o)+" is low (self-hosted or Podia).",{fee:h(o)})+\`
\`:o<=15?r("calc_out.course_pricing.row.health_fee_standard","• 🟡 Platform fee "+h(o)+" is standard (Teachable, Thinkific).",{fee:h(o)})+\`
\`:r("calc_out.course_pricing.row.health_fee_high","• 🟠 Platform fee "+h(o)+" is high — consider self-hosted.",{fee:h(o)})+\`
\`)+\`
🎯 Launch Revenue:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+r("calc_out.course_pricing.row.email_list_needed","• Email list needed:        ~"+u(b)+"  (at 2% conversion)",{list:u(b)})+\`
\`+r("calc_out.course_pricing.row.launch_revenue","• Launch revenue (30% off):  "+e(A),{revenue:e(A)})+\`
\`+r("calc_out.course_pricing.row.sustained_monthly","• Sustained monthly:        "+e(s)+"/mo",{revenue:e(s)})+\`
\`+r("calc_out.course_pricing.row.projection_12m","• 12-month projection:      "+e(a)+"/yr",{revenue:e(a)})+\`
\`+r("calc_out.course_pricing.row.with_upsell_cohort","• With upsell to cohort:    "+e(w*12+a)+"/yr potential",{revenue:e(w*12+a)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+r("calc_out.course_pricing.row.self_study_vs_cohort_breakeven","⚖️ Self-Study vs Cohort Break-Even:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+r("calc_out.course_pricing.row.self_study_annual","• Self-study annual:      "+e(E)+"/yr",{revenue:e(E)})+\`
\`+r("calc_out.course_pricing.row.cohort_premium","• Cohort premium:          "+c(M)+"/student  (3.5x self-study)",{price:c(M)})+\`
\`+r("calc_out.course_pricing.row.cohort_annual","• Cohort annual (30% take): "+e(j)+"/yr",{revenue:e(j)})+\`
\`+r("calc_out.course_pricing.row.cohort_takes_more_time","• Cohort takes more time:  +10-15 hrs/wk of your time")+\`
\`+r("calc_out.course_pricing.row.break_even_cohort","• Break-even: cohort needs 30% take rate to beat self-study")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 What-If Scenarios:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+r("calc_out.course_pricing.row.whatif_raise_price_30","• Raise price 30%:        "+c(n*1.3)+"/student  ("+e(n*1.3*t*(1-o/100))+"/mo net)",{price:c(n*1.3),net:e(n*1.3*t*(1-o/100))})+\`
\`+r("calc_out.course_pricing.row.whatif_double_buyers","• Double buyers (2x reach): "+e(s*2)+"/mo  ("+e(s*24)+"/yr)",{monthly:e(s*2),annual:e(s*24)})+\`
\`+r("calc_out.course_pricing.row.whatif_self_host","• Self-host (0% fee):     "+e(n*t)+"/mo gross (saves "+e(g)+"/mo)",{gross:e(n*t),saves:e(g)})+\`
\`+r("calc_out.course_pricing.row.whatif_add_cohort_tier","• Add cohort tier (30% take):  +"+e(w*12)+"/yr",{revenue:e(w*12)})+\`
\`+r("calc_out.course_pricing.row.whatif_bundle_coaching","• Bundle w/ coaching:     +"+e(n*.5*t*.2*12)+"/yr  (20% take coaching upsell)",{revenue:e(n*.5*t*.2*12)})+\`

💡 Tip: Most creators underprice their first course. Test a higher launch price with a 30% early-bird discount rather than setting a permanent low price. Adding a payment plan (3 x monthly) at 1.5-2x the one-time price often increases total revenue per student by 20-40% — buyers who can't afford $497 upfront will pay $199 × 3 = $597.\`);const N=[29,49,97,147,197,297,497,697,997];for(let l=0;l<N.length;l++){const P=N[l],B=P*t,H=B*(o/100),S=B-H,q=S*12;m.push(r("calc_out.course_pricing.row.price_point","At $"+P+" price: "+u(Math.round(S))+"/mo net  ("+u(Math.round(q))+"/yr) at "+u(t)+" buyers/mo",{price:String(P),net:u(Math.round(S)),annual:u(Math.round(q)),buyers:u(t)}))}return m},x=function(_,f,t){var o=O(_);return Array.isArray(o)?o.join(\`
\`):String(o)};var I=y,z=F,G=x,r=tk,L='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',r=new Function("return "+L)(),O=function(_){return F(_)};return[x(inputs,pick,fill)]}finally{}
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
    '🎓 Course Pricing Calculator\n\n💰 Revenue Projection:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.course_pricing.row.target_monthly_income{"income":"$5,000"}|• Target Monthly Income:    $5,000|\n$calc_out.course_pricing.row.est_buyers_per_month{"buyers":"50"}|• Est. Buyers/Month:        50|\n$calc_out.course_pricing.row.platform_fee{"fee":"10.0%"}|• Platform Fee:             10.0%|\n$calc_out.course_pricing.row.optimal_price{"price":"$111.11"}|• Optimal Price:           $111.11/student|\n$calc_out.course_pricing.row.breakeven_price{"price":"$100.00"}|• Breakeven Price:         $100.00/student  (before fees)|\n$calc_out.course_pricing.row.gross_revenue{"revenue":"$5,556"}|• Gross Revenue:           $5,556/mo|\n$calc_out.course_pricing.row.platform_takes{"revenue":"$556"}|• Platform Takes:          $556/mo|\n$calc_out.course_pricing.row.net_revenue{"revenue":"$5,000"}|• Net Revenue:             $5,000/mo|\n$calc_out.course_pricing.row.annual_net_revenue{"revenue":"$60,000"}|• Annual Net Revenue:      $60,000/yr|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Pricing Metrics:\n$calc_out.course_pricing.row.price_per_student{"price":"$111.11"}|• Price per Student:         $111.11|\n$calc_out.course_pricing.row.hour_of_creation{"perhour":"$125","earned":"$125.00"}|• $/Hour of Creation:      $125/hr  ($125.00 earned per hour invested)|\n$calc_out.course_pricing.row.estimated_ltv{"ltv":"$166.67"}|• Estimated LTV (with upsell):  $166.67  (1.5x base price)|\n$calc_out.course_pricing.row.gross_margin{"margin":"90.0%"}|• Gross Margin:            90.0%  (after platform fee)|\n$calc_out.course_pricing.row.annual_course_earnings{"revenue":"$60,000"}|• Annual Course Earnings:  $60,000/yr  (at this monthly run rate)|\n$calc_out.course_pricing.row.payback_months{"months":"0.1"}|• Payback to course creator:  ~0.1 months to recoup creation effort|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Pricing Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.course_pricing.row.health_effort_low{"rate":"125"}|• 🟠 $125/hr-of-effort is low — underpriced or under-selling.|\n$calc_out.course_pricing.row.health_price_mid{"price":"$111.11"}|• 🟡 Price point $111.11 is mid-market — sweet spot for volume.|\n$calc_out.course_pricing.row.health_buyers_solid{"buyers":"50"}|• 🟢 50 buyers/mo is a solid funnel size.|\n$calc_out.course_pricing.row.health_fee_standard{"fee":"10.0%"}|• 🟡 Platform fee 10.0% is standard (Teachable, Thinkific).|\n\n🎯 Launch Revenue:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.course_pricing.row.email_list_needed{"list":"2,500"}|• Email list needed:        ~2,500  (at 2% conversion)|\n$calc_out.course_pricing.row.launch_revenue{"revenue":"$3,889"}|• Launch revenue (30% off):  $3,889|\n$calc_out.course_pricing.row.sustained_monthly{"revenue":"$5,000"}|• Sustained monthly:        $5,000/mo|\n$calc_out.course_pricing.row.projection_12m{"revenue":"$60,000"}|• 12-month projection:      $60,000/yr|\n$calc_out.course_pricing.row.with_upsell_cohort{"revenue":"$130,000"}|• With upsell to cohort:    $130,000/yr potential|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.course_pricing.row.self_study_vs_cohort_breakeven|⚖️ Self-Study vs Cohort Break-Even:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.course_pricing.row.self_study_annual{"revenue":"$60,000"}|• Self-study annual:      $60,000/yr|\n$calc_out.course_pricing.row.cohort_premium{"price":"$388.89"}|• Cohort premium:          $388.89/student  (3.5x self-study)|\n$calc_out.course_pricing.row.cohort_annual{"revenue":"$70,000"}|• Cohort annual (30% take): $70,000/yr|\n$calc_out.course_pricing.row.cohort_takes_more_time|• Cohort takes more time:  +10-15 hrs/wk of your time|\n$calc_out.course_pricing.row.break_even_cohort|• Break-even: cohort needs 30% take rate to beat self-study|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.course_pricing.row.whatif_raise_price_30{"price":"$144.44","net":"$6,500"}|• Raise price 30%:        $144.44/student  ($6,500/mo net)|\n$calc_out.course_pricing.row.whatif_double_buyers{"monthly":"$10,000","annual":"$120,000"}|• Double buyers (2x reach): $10,000/mo  ($120,000/yr)|\n$calc_out.course_pricing.row.whatif_self_host{"gross":"$5,556","saves":"$556"}|• Self-host (0% fee):     $5,556/mo gross (saves $556/mo)|\n$calc_out.course_pricing.row.whatif_add_cohort_tier{"revenue":"$70,000"}|• Add cohort tier (30% take):  +$70,000/yr|\n$calc_out.course_pricing.row.whatif_bundle_coaching{"revenue":"$6,667"}|• Bundle w/ coaching:     +$6,667/yr  (20% take coaching upsell)|\n\n💡 Tip: Most creators underprice their first course. Test a higher launch price with a 30% early-bird discount rather than setting a permanent low price. Adding a payment plan (3 x monthly) at 1.5-2x the one-time price often increases total revenue per student by 20-40% — buyers who can\'t afford $497 upfront will pay $199 × 3 = $597.\n$calc_out.course_pricing.row.price_point{"price":"29","net":"1,305","annual":"15,660","buyers":"50"}|At $29 price: 1,305/mo net  (15,660/yr) at 50 buyers/mo|\n$calc_out.course_pricing.row.price_point{"price":"49","net":"2,205","annual":"26,460","buyers":"50"}|At $49 price: 2,205/mo net  (26,460/yr) at 50 buyers/mo|\n$calc_out.course_pricing.row.price_point{"price":"97","net":"4,365","annual":"52,380","buyers":"50"}|At $97 price: 4,365/mo net  (52,380/yr) at 50 buyers/mo|\n$calc_out.course_pricing.row.price_point{"price":"147","net":"6,615","annual":"79,380","buyers":"50"}|At $147 price: 6,615/mo net  (79,380/yr) at 50 buyers/mo|\n$calc_out.course_pricing.row.price_point{"price":"197","net":"8,865","annual":"106,380","buyers":"50"}|At $197 price: 8,865/mo net  (106,380/yr) at 50 buyers/mo|\n$calc_out.course_pricing.row.price_point{"price":"297","net":"13,365","annual":"160,380","buyers":"50"}|At $297 price: 13,365/mo net  (160,380/yr) at 50 buyers/mo|\n$calc_out.course_pricing.row.price_point{"price":"497","net":"22,365","annual":"268,380","buyers":"50"}|At $497 price: 22,365/mo net  (268,380/yr) at 50 buyers/mo|\n$calc_out.course_pricing.row.price_point{"price":"697","net":"31,365","annual":"376,380","buyers":"50"}|At $697 price: 31,365/mo net  (376,380/yr) at 50 buyers/mo|\n$calc_out.course_pricing.row.price_point{"price":"997","net":"44,865","annual":"538,380","buyers":"50"}|At $997 price: 44,865/mo net  (538,380/yr) at 50 buyers/mo|',
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