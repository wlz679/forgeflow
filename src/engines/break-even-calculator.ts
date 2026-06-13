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
  "return [r];";

const engine: ToolEngine = {
  slug: "solopreneur-break-even-calculator",
  title: "Break-Even Calculator",
  description: "Calculate when you will break even — with and without monthly revenue growth. See cumulative P&L at 3, 6, 12, and 24 months.",
  category: "A",
  inputs: [
    { name: "monthlyCosts", label: "Monthly Costs ($)", placeholder: "e.g. 500", type: "number" },
    { name: "monthlyRevenue", label: "Monthly Revenue ($)", placeholder: "e.g. 1000", type: "number" },
    { name: "initialInvestment", label: "Initial Investment ($)", placeholder: "e.g. 5000", type: "number" },
    { name: "monthlyGrowthRate", label: "Monthly Revenue Growth (%)", placeholder: "e.g. 10 (leave 0 for flat)", type: "number" },
  ],
  clientConfig: { type: "custom", wordPools: {}, customFn },
  generate(inputs: Record<string, string>): string[] { return calculateBreakEven(inputs); },
  staticExamples: [
    "📊 Break-Even Analysis\n\n⏱️ Break-Even Timeline\n• Initial Investment:  $5,000\n• Monthly Costs:       $500/mo\n• Monthly Revenue:     $1,000/mo\n• Flat revenue:        10 months\n• With 10.0% growth:  7 months  (3 months faster)\n🟢 Excellent! Breaking even in under 6 months is a very healthy trajectory.\n\n📈 Cumulative P&L Outlook\n• Month 3: −$1,690\n• Month 6: +$2,716 ✅\n• Month 12: +$21,384 ✅\n• Month 24: +$89,497 ✅",
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
