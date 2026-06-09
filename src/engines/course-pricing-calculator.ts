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
  const revenueAtOptimal = optimalPrice * estimatedBuyersPerMonth;
  const platformTake = revenueAtOptimal * (platformFee / 100);
  const netRevenue = revenueAtOptimal - platformTake;

  const fmt = (n: number) => n.toFixed(2);
  const loc = (n: number) => n.toLocaleString();

  let assessment: string;
  if (optimalPrice <= 50) {
    assessment = '✅ Accessible pricing. At $' + fmt(optimalPrice) + ', your course is priced for impulse buys. Great for volume-driven models with high conversion rates.';
  } else if (optimalPrice <= 200) {
    assessment = '📊 Mid-range. $' + fmt(optimalPrice) + ' is the sweet spot for online courses. Buyers expect solid production quality and clear outcomes at this level.';
  } else if (optimalPrice <= 500) {
    assessment = '💎 Premium tier. At $' + fmt(optimalPrice) + ', your course competes with certification programs. You need strong social proof, testimonials, and a clear transformation promise.';
  } else if (optimalPrice <= 1000) {
    assessment = '🏆 High-ticket. $' + fmt(optimalPrice) + ' requires a proven reputation. Consider adding live components, community access, or 1-on-1 coaching to justify this price.';
  } else {
    assessment = '👑 Ultra-premium. $' + fmt(optimalPrice) + '+ puts you in cohort-based course or mastermind territory. You will need a strong personal brand and direct sales approach.';
  }

  results.push(
    '🎓 Course Pricing Calculator\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '🎯 Your Targets\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    '• Target Monthly Income: $' + loc(targetMonthlyIncome) + '\n' +
    '• Est. Buyers Per Month:  ' + loc(estimatedBuyersPerMonth) + '\n' +
    '• Platform Fee:                     ' + platformFee + '%\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '💰 Pricing Results\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    '• Optimal Course Price:   $' + fmt(optimalPrice) + '\n' +
    '• Breakeven Price:          $' + fmt(breakevenPrice) + ' (before fees)\n' +
    '• Gross Revenue:            $' + fmt(revenueAtOptimal) + '/mo\n' +
    '• Platform Takes:            $' + fmt(platformTake) + '/mo\n' +
    '• Net Revenue:                $' + fmt(netRevenue) + '/mo\n\n' +
    assessment + '\n\n' +
    '💡 Tip: Many creators underprice their first course. Test a higher price with a launch discount rather than permanently setting a low price. You can always discount later, but raising prices is harder. Consider offering a payment plan at 2-3x the one-time price for higher total revenue per student.',
  );

  const pricePoints = [29, 49, 97, 147, 197, 297, 497, 697, 997];
  for (let i = 0; i < 9; i++) {
    const p = pricePoints[i];
    const gross = p * estimatedBuyersPerMonth;
    const fee = gross * (platformFee / 100);
    const net = gross - fee;
    const annual = net * 12;
    results.push(
      'Comparison: At $' + p + ' price → Gross: $' + loc(Math.round(gross)) + '/mo | Net: $' + loc(Math.round(net)) + '/mo | Annual: $' + loc(Math.round(annual)) + '/yr',
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
  "var ratop=op*ebm;" +
  "var ptake=ratop*(pf/100);" +
  "var nr=ratop-ptake;" +
  "function fmt(n){return n.toFixed(2)}" +
  "function loc(n){return n.toLocaleString()}" +
  "var assess;" +
  "if(op<=50)assess='\\u2705 Accessible pricing. At $'+fmt(op)+', your course is priced for impulse buys. Great for volume-driven models with high conversion rates.';" +
  "else if(op<=200)assess='\\uD83D\\uDCCA Mid-range. $'+fmt(op)+' is the sweet spot for online courses. Buyers expect solid production quality and clear outcomes at this level.';" +
  "else if(op<=500)assess='\\uD83D\\uDC8E Premium tier. At $'+fmt(op)+', your course competes with certification programs. You need strong social proof, testimonials, and a clear transformation promise.';" +
  "else if(op<=1000)assess='\\uD83C\\uDFC6 High-ticket. $'+fmt(op)+' requires a proven reputation. Consider adding live components, community access, or 1-on-1 coaching to justify this price.';" +
  "else assess='\\uD83D\\uDC51 Ultra-premium. $'+fmt(op)+'+ puts you in cohort-based course or mastermind territory. You will need a strong personal brand and direct sales approach.';" +
  "var results=[];" +
  "results.push(" +
  "'\\uD83C\\uDF93 Course Pricing Calculator\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n" +
  "\\uD83C\\uDFAF Your Targets\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\u2022 Target Monthly Income: $'+loc(tmi)+'\\n" +
  "\\u2022 Est. Buyers Per Month:  '+loc(ebm)+'\\n" +
  "\\u2022 Platform Fee:                     '+pf+'%\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n" +
  "\\uD83D\\uDCB0 Pricing Results\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\u2022 Optimal Course Price:   $'+fmt(op)+'\\n" +
  "\\u2022 Breakeven Price:          $'+fmt(bp)+' (before fees)\\n" +
  "\\u2022 Gross Revenue:            $'+fmt(ratop)+'/mo\\n" +
  "\\u2022 Platform Takes:            $'+fmt(ptake)+'/mo\\n" +
  "\\u2022 Net Revenue:                $'+fmt(nr)+'/mo\\n\\n" +
  "'+assess+'\\n\\n" +
  "\\uD83D\\uDCA1 Tip: Many creators underprice their first course. Test a higher price with a launch discount rather than permanently setting a low price. You can always discount later, but raising prices is harder. Consider offering a payment plan at 2-3x the one-time price for higher total revenue per student.'" +
  ");" +
  "var pp=[29,49,97,147,197,297,497,697,997];" +
  "for(var i=0;i<9;i++){" +
  "var p=pp[i];" +
  "var gr=p*ebm;" +
  "var f=gr*(pf/100);" +
  "var n=gr-f;" +
  "var an=n*12;" +
  "results.push('Comparison: At $'+p+' price \\u2192 Gross: $'+loc(Math.round(gr))+'/mo | Net: $'+loc(Math.round(n))+'/mo | Annual: $'+loc(Math.round(an))+'/yr');" +
  "}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-course-pricing-calculator',
  title: 'Course Pricing Calculator',
  description: 'Find the optimal course price to hit your income goals, factoring in platform fees. Compare revenue at different price points.',
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
    '🎓 Course Pricing Calculator\n\n━━━━━━━━━━━━━━━━━━━━\n🎯 Your Targets\n━━━━━━━━━━━━━━━━━━━━\n\n• Target Monthly Income: $5,000\n• Est. Buyers Per Month:  50\n• Platform Fee:                     10%\n\n━━━━━━━━━━━━━━━━━━━━\n💰 Pricing Results\n━━━━━━━━━━━━━━━━━━━━\n\n• Optimal Course Price:   $111.11\n• Breakeven Price:          $100.00 (before fees)\n• Gross Revenue:            $5,555.56/mo\n• Platform Takes:            $555.56/mo\n• Net Revenue:                $5,000.00/mo\n\n📊 Mid-range. $111.11 is the sweet spot for online courses. Buyers expect solid production quality and clear outcomes at this level.\n\n💡 Tip: Many creators underprice their first course. Test a higher price with a launch discount rather than permanently setting a low price. You can always discount later, but raising prices is harder. Consider offering a payment plan at 2-3x the one-time price for higher total revenue per student.',
    'Comparison: At $29 price → Gross: $1,450/mo | Net: $1,305/mo | Annual: $15,660/yr',
    'Comparison: At $97 price → Gross: $4,850/mo | Net: $4,365/mo | Annual: $52,380/yr',
    'Comparison: At $197 price → Gross: $9,850/mo | Net: $8,865/mo | Annual: $106,380/yr',
    'Comparison: At $497 price → Gross: $24,850/mo | Net: $22,365/mo | Annual: $268,380/yr',
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
    'Check the assessment for pricing tier guidance.',
    'Scroll down to compare revenue outcomes at 9 different price points.',
  ],
};

registerEngine(engine);
