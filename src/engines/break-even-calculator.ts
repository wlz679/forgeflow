import type { ToolEngine } from "../core/engines/types";
import { registerEngine } from "../core/engines/registry";

function calculateBreakEven(inputs: Record<string, string>): string[] {
  const fmt = (n: number) => "$" + Math.round(n).toLocaleString();
  const pct = (n: number) => n.toFixed(1) + "%";

  const monthlyCosts = parseFloat(inputs.monthlyCosts) || 0;
  const monthlyRevenue = parseFloat(inputs.monthlyRevenue) || 0;
  const initialInvestment = parseFloat(inputs.initialInvestment) || 0;
  const monthlyGrowthRate = parseFloat(inputs.monthlyGrowthRate) || 0;

  const growthFactor = 1 + monthlyGrowthRate / 100;
  const flatMonthlyProfit = monthlyRevenue - monthlyCosts;
  const flatMonths = flatMonthlyProfit > 0 ? Math.ceil(initialInvestment / flatMonthlyProfit) : null;

  let growthMonths: number | null = null;
  let cumulativeLoss = -initialInvestment;
  for (let m = 1; m <= 60; m++) {
    const rev = monthlyRevenue * Math.pow(growthFactor, m - 1);
    cumulativeLoss += rev - monthlyCosts;
    if (growthMonths === null && cumulativeLoss >= 0) { growthMonths = m; break; }
  }

  let result = "📊 Break-Even Analysis\n\n⏱️ Break-Even Timeline\n";
  result += "• Initial Investment:  " + fmt(initialInvestment) + "\n• Monthly Costs:       " + fmt(monthlyCosts) + "/mo\n• Monthly Revenue:     " + fmt(monthlyRevenue) + "/mo\n";

  if (flatMonths !== null) result += "• Flat revenue:        " + flatMonths + " months\n";
  else result += "• Flat revenue:        Never — monthly costs exceed revenue. You need growth or lower costs.\n";

  if (monthlyGrowthRate > 0 && growthMonths !== null) {
    result += "• With " + pct(monthlyGrowthRate) + " growth:  " + growthMonths + " months";
    if (flatMonths !== null) result += "  (" + (flatMonths - growthMonths) + " months faster)";
    result += "\n";
  } else if (monthlyGrowthRate > 0 && growthMonths === null) {
    result += "• With " + pct(monthlyGrowthRate) + " growth:  Not within 60 months — need faster growth or lower costs.\n";
  }

  if (growthMonths !== null) {
    if (growthMonths <= 6) result += "🟢 Excellent! Breaking even in under 6 months is a very healthy trajectory.\n";
    else if (growthMonths <= 12) result += "🟡 Solid — breaking even within a year. Keep an eye on costs.\n";
    else if (growthMonths <= 24) result += "🟠 Manageable but slow — 1-2 years to break even. Consider boosting growth.\n";
    else result += "🔴 Long road — over 2 years. Review whether this is sustainable.\n";
  }

  if (flatMonthlyProfit > 0 || monthlyGrowthRate > 0) {
    result += "\n📈 Cumulative P&L Outlook\n";
    const checkpoints = [3, 6, 12, 24];
    for (const mo of checkpoints) {
      let cum = -initialInvestment;
      for (let m = 1; m <= mo; m++) {
        const rev = monthlyRevenue * Math.pow(growthFactor, m - 1);
        cum += rev - monthlyCosts;
      }
      result += "• Month " + mo + ": " + (cum >= 0 ? "+" : "") + fmt(cum) + (cum >= 0 ? " ✅\n" : "\n");
    }
  }

  // 🔄 What-If Scenarios — cost reduction or price increase impact
  if (monthlyRevenue > 0 && monthlyCosts > 0) {
    result += "\n🔄 What-If Scenarios\n";
    // Cut costs 20%
    if (monthlyCosts > 0) {
      const newCosts = monthlyCosts * 0.8;
      const newProfit = monthlyRevenue - newCosts;
      const newMonths = newProfit > 0 ? Math.ceil(initialInvestment / newProfit) : null;
      result += "• Cut costs 20%:  Monthly profit $"
        + Math.round(monthlyRevenue - monthlyCosts).toLocaleString()
        + " → $" + Math.round(newProfit).toLocaleString();
      if (newMonths !== null && flatMonths !== null) result += "  |  Break-even: " + flatMonths + " → " + newMonths + " mo (" + (flatMonths - newMonths) + " faster)\n";
      else result += "\n";
    }
    // Raise price 20%
    if (monthlyRevenue > 0) {
      const newRev = monthlyRevenue * 1.2;
      const newProfit2 = newRev - monthlyCosts;
      const newMonths2 = newProfit2 > 0 ? Math.ceil(initialInvestment / newProfit2) : null;
      result += "• Raise price 20%:  Revenue $" + Math.round(monthlyRevenue).toLocaleString() + " → $" + Math.round(newRev).toLocaleString();
      if (newMonths2 !== null && flatMonths !== null) result += "  |  Break-even: " + flatMonths + " → " + newMonths2 + " mo\n";
      else if (newMonths2 !== null) result += "  |  Break-even: " + newMonths2 + " mo\n";
      else result += "\n";
    }
    // Combined
    const comboRev = monthlyRevenue * 1.1;
    const comboCosts = monthlyCosts * 0.9;
    const comboProfit = comboRev - comboCosts;
    if (comboProfit > 0) {
      const comboMonths = Math.ceil(initialInvestment / comboProfit);
      result += "• Combo (+10% price, −10% costs):  Break-even: " + comboMonths + " mo\n";
    }
  }

  // 🩺 Break-Even Health (v3)
  if (flatMonthlyProfit <= 0) {
    result += "\n\n🩺 Break-Even Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🔴 Monthly loss — expenses exceed revenue. Cannot break even at current rate. Either raise price or cut costs.";
  } else if (initialInvestment <= 0) {
    result += "\n\n🩺 Break-Even Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 No upfront investment. Every month is profit. Focus on scaling.";
  } else if (flatMonths !== null) {
    const verdict = flatMonths < 6 ? "🟢 Fast payback — under 6 months. Healthy." :
                    flatMonths < 12 ? "🟡 Moderate payback — 6-12 months. Standard for SaaS." :
                    flatMonths < 24 ? "🟠 Slow payback — 1-2 years. Tighten unit economics." :
                    "🔴 Very slow — over 2 years. Reconsider pricing or costs.";
    result += "\n\n🩺 Break-Even Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• " + verdict + "\n• Payback: " + flatMonths + " months | ~" + (flatMonths / 12).toFixed(1) + " years";
  } else {
    result += "\n\n🩺 Break-Even Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 Default alive — no payback needed.";
  }

  // 🔄 What-If Scenarios (v3)
  result += "\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
  if (flatMonthlyProfit > 0 && initialInvestment > 0 && flatMonths !== null) {
    const rev10 = (monthlyRevenue * 1.1) - monthlyCosts;
    const inv10 = Math.ceil(initialInvestment / rev10);
    const cost10 = monthlyRevenue - (monthlyCosts * 0.9);
    const invCost10 = Math.ceil(initialInvestment / cost10);
    const combo = (monthlyRevenue * 1.1) - (monthlyCosts * 0.9);
    const invCombo = Math.ceil(initialInvestment / combo);
    result += "\n• Raise price 10%:  Payback " + flatMonths + " → " + inv10 + " mo";
    result += "\n• Cut costs 10%:  Payback " + flatMonths + " → " + invCost10 + " mo";
    result += "\n• Combo (+10% price, -10% costs):  Payback " + flatMonths + " → " + invCombo + " mo";
    result += "\n• At current rate:  Save $" + Math.round(flatMonthlyProfit * 12).toLocaleString() + "/yr after initial investment";
  } else {
    result += "\n• ⚠️ Cannot model — ensure revenue > costs and initial investment > 0.";
  }

  // 💡 Tip (v3)
  if (flatMonthlyProfit > 0 && flatMonths !== null && flatMonths <= 12) {
    result += "\n\n💡 Tip: Sub-12-month break-even is the sweet spot — you have cash to reinvest in growth. Resist the temptation to extract profits early; compound the advantage for 2-3 more months before taking any out.";
  } else if (flatMonthlyProfit <= 0) {
    result += "\n\n💡 Tip: Negative monthly profit means you're burning cash every month. Either raise prices, cut costs, or accept that you'll need more runway to reach break-even. The longer you delay, the harder it gets.";
  } else {
    result += "\n\n💡 Tip: Break-even is the floor, not the goal. Aim for a 3-month safety buffer by default — one bad month shouldn't wipe out your margin. Pre-revenue? Cut costs aggressively until you hit $1k MRR, then re-evaluate.";
  }

  return [result];
}

const customFn =
  "function fmt(n){return '$'+Math.round(n).toLocaleString()}function pct(n){return n.toFixed(1)+'%'}" +
  "var mc=parseFloat(inputs.monthlyCosts)||0;var mr=parseFloat(inputs.monthlyRevenue)||0;var ii=parseFloat(inputs.initialInvestment)||0;var gr=parseFloat(inputs.monthlyGrowthRate)||0;" +
  "var gf=1+gr/100;var fp=mr-mc;var fm=fp>0?Math.ceil(ii/fp):null;var gm=null;var cl=-ii;" +
  "for(var m=1;m<=60;m++){var rv=mr*Math.pow(gf,m-1);cl+=rv-mc;if(gm===null&&cl>=0){gm=m;break;}}" +
  "var r='📊 Break-Even Analysis\\n\\n⏱️ Break-Even Timeline\\n';r+='• Initial Investment:  '+fmt(ii)+'\\n• Monthly Costs:       '+fmt(mc)+'/mo\\n• Monthly Revenue:     '+fmt(mr)+'/mo\\n';" +
  "if(fm!==null)r+='• Flat revenue:        '+fm+' months\\n';else r+='• Flat revenue:        Never — monthly costs exceed revenue.\\n';" +
  "if(gr>0&&gm!==null)r+='• With '+pct(gr)+' growth:  '+gm+' months'+(fm!==null?'  ('+(fm-gm)+' months faster)':'')+'\\n';else if(gr>0&&gm===null)r+='• With '+pct(gr)+' growth:  Not within 60 months.\\n';" +
  "if(gm!==null){if(gm<=6)r+='🟢 Excellent! Breaking even in under 6 months.\\n';else if(gm<=12)r+='🟡 Solid — breaking even within a year.\\n';else if(gm<=24)r+='🟠 Manageable but slow — 1-2 years.\\n';else r+='🔴 Long road — over 2 years.\\n';}" +
  "if(fp>0||gr>0){r+='\\n📈 Cumulative P&L Outlook\\n';var cps=[3,6,12,24];for(var ci=0;ci<cps.length;ci++){var mo=cps[ci];var cum=-ii;for(var m2=1;m2<=mo;m2++){var rv2=mr*Math.pow(gf,m2-1);cum+=rv2-mc;}r+='• Month '+mo+': '+(cum>=0?'+':'')+fmt(cum)+(cum>=0?' ✅\\n':'\\n');}}" +
  "if(mr>0&&mc>0){" +
  "r+='\\n🔄 What-If Scenarios\\n';" +
  "var nc8=mc*0.8;var np8=mr-nc8;var nm8=np8>0?Math.ceil(ii/np8):null;" +
  "r+='\\u2022 Cut costs 20%:  Monthly profit $'+Math.round(fp).toLocaleString()+' \\u2192 $'+Math.round(np8).toLocaleString();" +
  "if(nm8!==null&&fm!==null)r+='  |  Break-even: '+fm+' \\u2192 '+nm8+' mo ('+(fm-nm8)+' faster)\\n';else r+='\\n';" +
  "var nr9=mr*1.2;var np9=nr9-mc;var nm9=np9>0?Math.ceil(ii/np9):null;" +
  "r+='\\u2022 Raise price 20%:  Revenue $'+Math.round(mr).toLocaleString()+' \\u2192 $'+Math.round(nr9).toLocaleString();" +
  "if(nm9!==null&&fm!==null)r+='  |  Break-even: '+fm+' \\u2192 '+nm9+' mo\\n';else if(nm9!==null)r+='  |  Break-even: '+nm9+' mo\\n';else r+='\\n';" +
  "var cr10=mr*1.1;var cc10=mc*0.9;var cp10=cr10-cc10;" +
  "if(cp10>0){r+='\\u2022 Combo (+10% price, \\u221210% costs):  Break-even: '+Math.ceil(ii/cp10)+' mo\\n';}" +
  "}" +
  "if(fp>0&&gm!==null&&gm<=12)r+='\\n\\n\\uD83D\\uDCA1 Tip: Sub-12-month break-even is the sweet spot \\u2014 you have cash to reinvest in growth. Resist the temptation to extract profits early; compound the advantage for 2-3 more months before taking any out.';else if(fp<=0)r+='\\n\\n\\uD83D\\uDCA1 Tip: Negative monthly profit means you\\'re burning cash every month. Either raise prices, cut costs, or accept that you\\'ll need more runway to reach break-even. The longer you delay, the harder it gets.';else r+='\\n\\n\\uD83D\\uDCA1 Tip: Break-even is the floor, not the goal. Aim for a 3-month safety buffer by default \\u2014 one bad month shouldn\\'t wipe out your margin. Pre-revenue? Cut costs aggressively until you hit $1k MRR, then re-evaluate.';" +
  "return [r];";

const engine: ToolEngine = {
  slug: "solopreneur-break-even-calculator",
  title: "Break-Even Calculator",
  description: "Calculate when you will break even — with and without monthly revenue growth. See cumulative P&L at 3, 6, 12, and 24 months.",
  inputs: [
    { name: "monthlyCosts", label: "Monthly Costs ($)", placeholder: "e.g. 500", type: "number" },
    { name: "monthlyRevenue", label: "Monthly Revenue ($)", placeholder: "e.g. 1000", type: "number" },
    { name: "initialInvestment", label: "Initial Investment ($)", placeholder: "e.g. 5000", type: "number" },
    { name: "monthlyGrowthRate", label: "Monthly Revenue Growth (%)", placeholder: "e.g. 10 (leave 0 for flat)", type: "number" },
  ],
  clientConfig: { type: "custom", wordPools: {}, customFn },
  generate(inputs: Record<string, string>): string[] { return calculateBreakEven(inputs); },
  staticExamples: [
    '📊 Break-Even Analysis\n\n⏱️ Break-Even Timeline\n• Initial Investment:  $0\n• Monthly Costs:       $0/mo\n• Monthly Revenue:     $0/mo\n• Flat revenue:        Never — monthly costs exceed revenue. You need growth or lower costs.\n🟢 Excellent! Breaking even in under 6 months is a very healthy trajectory.\n\n\n🩺 Break-Even Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🔴 Monthly loss — expenses exceed revenue. Cannot break even at current rate. Either raise price or cut costs.\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• ⚠️ Cannot model — ensure revenue > costs and initial investment > 0.\n\n💡 Tip: Negative monthly profit means you\'re burning cash every month. Either raise prices, cut costs, or accept that you\'ll need more runway to reach break-even. The longer you delay, the harder it gets.',
  ],
  faq: [
    { q: "What is a break-even point?", a: "The break-even point is when your cumulative revenue equals your total costs (including initial investment). After this point, every dollar of revenue becomes profit. For solopreneurs, break-even is the first major validation milestone." },
    { q: "How do I speed up my break-even?", a: "Three ways: (1) Increase monthly revenue — raise prices or add more customers. (2) Decrease monthly costs — cut unnecessary subscriptions, automate manual work. (3) Reduce initial investment — start leaner, use free tiers of tools until you have revenue." },
    { q: "What is a good break-even timeline?", a: "For a solopreneur product, 6-12 months is excellent. For service businesses, 1-3 months is normal since costs are low. If your break-even is over 2 years, the model may need rethinking." },
    { q: "Should I project with or without growth?", a: "Always check both. The flat projection is your worst case — if you can break even without growth, you have a very resilient business. The growth projection shows what is possible." },
    { q: "What if I never break even?", a: "Then your unit economics are upside down — each month costs more than it brings in. You need to either raise prices, cut costs, or pivot to a different model." },
  ],
  howToUse: [
    "Enter your total monthly operating costs.",
    "Enter your current monthly revenue.",
    "Enter your initial investment (what you spent to start).",
    "Enter your expected monthly revenue growth rate (leave 0 for flat projection).",
    "Compare the flat vs growth break-even timelines.",
    "Check the cumulative P&L at 3, 6, 12, and 24 months.",
    "Use the gap between flat and growth to understand how much growth impacts your timeline.",
  ],
};
registerEngine(engine);
