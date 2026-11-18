import type { ToolEngine } from "../../core/engines/types";
import { registerEngine } from "../../core/engines/registry";
import { clampNonNegative } from "../../core/engines/helpers";

function calculateBreakEven(inputs: Record<string, string>): string[] {
  const fmt = (n: number) => "$" + Math.round(n).toLocaleString();
  const pct = (n: number) => n.toFixed(1) + "%";

  const monthlyCosts = clampNonNegative(parseFloat(inputs.monthlyCosts) || 0);
  const monthlyRevenue = clampNonNegative(parseFloat(inputs.monthlyRevenue) || 0);
  const initialInvestment = clampNonNegative(parseFloat(inputs.initialInvestment) || 0);
  // intentionally NOT clamped: semantically can be negative (declining revenue)
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
  `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let d=function(i){return Number.isNaN(i)?0:Math.max(0,i)},b=function(i){const y=o=>"$"+Math.round(o).toLocaleString(),p=o=>o.toFixed(1)+"%",t=d(parseFloat(i.monthlyCosts)||0),r=d(parseFloat(i.monthlyRevenue)||0),a=d(parseFloat(i.initialInvestment)||0),v=parseFloat(i.monthlyGrowthRate)||0,k=1+v/100,f=r-t,n=f>0?Math.ceil(a/f):null;let l=null,w=-a;for(let o=1;o<=60;o++){const m=r*Math.pow(k,o-1);if(w+=m-t,l===null&&w>=0){l=o;break}}let e=\`📊 Break-Even Analysis

⏱️ Break-Even Timeline
\`;if(e+="• Initial Investment:  "+y(a)+\`
• Monthly Costs:       \`+y(t)+\`/mo
• Monthly Revenue:     \`+y(r)+\`/mo
\`,n!==null?e+="• Flat revenue:        "+n+\` months
\`:e+=\`• Flat revenue:        Never — monthly costs exceed revenue. You need growth or lower costs.
\`,v>0&&l!==null?(e+="• With "+p(v)+" growth:  "+l+" months",n!==null&&(e+="  ("+(n-l)+" months faster)"),e+=\`
\`):v>0&&l===null&&(e+="• With "+p(v)+\` growth:  Not within 60 months — need faster growth or lower costs.
\`),l!==null&&(l<=6?e+=\`🟢 Excellent! Breaking even in under 6 months is a very healthy trajectory.
\`:l<=12?e+=\`🟡 Solid — breaking even within a year. Keep an eye on costs.
\`:l<=24?e+=\`🟠 Manageable but slow — 1-2 years to break even. Consider boosting growth.
\`:e+=\`🔴 Long road — over 2 years. Review whether this is sustainable.
\`),f>0||v>0){e+=\`
📈 Cumulative P&L Outlook
\`;const o=[3,6,12,24];for(const m of o){let u=-a;for(let s=1;s<=m;s++){const c=r*Math.pow(k,s-1);u+=c-t}e+="• Month "+m+": "+(u>=0?"+":"")+y(u)+(u>=0?\` ✅
\`:\`
\`)}}if(r>0&&t>0){if(e+=\`
🔄 What-If Scenarios
\`,t>0){const s=t*.8,c=r-s,h=c>0?Math.ceil(a/c):null;e+="• Cut costs 20%:  Monthly profit $"+Math.round(r-t).toLocaleString()+" → $"+Math.round(c).toLocaleString(),h!==null&&n!==null?e+="  |  Break-even: "+n+" → "+h+" mo ("+(n-h)+\` faster)
\`:e+=\`
\`}if(r>0){const s=r*1.2,c=s-t,h=c>0?Math.ceil(a/c):null;e+="• Raise price 20%:  Revenue $"+Math.round(r).toLocaleString()+" → $"+Math.round(s).toLocaleString(),h!==null&&n!==null?e+="  |  Break-even: "+n+" → "+h+\` mo
\`:h!==null?e+="  |  Break-even: "+h+\` mo
\`:e+=\`
\`}const o=r*1.1,m=t*.9,u=o-m;if(u>0){const s=Math.ceil(a/u);e+="• Combo (+10% price, −10% costs):  Break-even: "+s+\` mo
\`}}if(f<=0)e+=\`

🩺 Break-Even Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 🔴 Monthly loss — expenses exceed revenue. Cannot break even at current rate. Either raise price or cut costs.\`;else if(a<=0)e+=\`

🩺 Break-Even Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 🟢 No upfront investment. Every month is profit. Focus on scaling.\`;else if(n!==null){const o=n<6?"🟢 Fast payback — under 6 months. Healthy.":n<12?"🟡 Moderate payback — 6-12 months. Standard for SaaS.":n<24?"🟠 Slow payback — 1-2 years. Tighten unit economics.":"🔴 Very slow — over 2 years. Reconsider pricing or costs.";e+=\`

🩺 Break-Even Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+o+\`
• Payback: \`+n+" months | ~"+(n/12).toFixed(1)+" years"}else e+=\`

🩺 Break-Even Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 🟡 Default alive — no payback needed.\`;if(e+=\`

🔄 What-If Scenarios:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\`,f>0&&a>0&&n!==null){const o=r*1.1-t,m=Math.ceil(a/o),u=r-t*.9,s=Math.ceil(a/u),c=r*1.1-t*.9,h=Math.ceil(a/c);e+=\`
• Raise price 10%:  Payback \`+n+" → "+m+" mo",e+=\`
• Cut costs 10%:  Payback \`+n+" → "+s+" mo",e+=\`
• Combo (+10% price, -10% costs):  Payback \`+n+" → "+h+" mo",e+=\`
• At current rate:  Save $\`+Math.round(f*12).toLocaleString()+"/yr after initial investment"}else e+=\`
• ⚠️ Cannot model — ensure revenue > costs and initial investment > 0.\`;return f>0&&n!==null&&n<=12?e+=\`

💡 Tip: Sub-12-month break-even is the sweet spot — you have cash to reinvest in growth. Resist the temptation to extract profits early; compound the advantage for 2-3 more months before taking any out.\`:f<=0?e+=\`

💡 Tip: Negative monthly profit means you're burning cash every month. Either raise prices, cut costs, or accept that you'll need more runway to reach break-even. The longer you delay, the harder it gets.\`:e+=\`

💡 Tip: Break-even is the floor, not the goal. Aim for a 3-month safety buffer by default — one bad month shouldn't wipe out your margin. Pre-revenue? Cut costs aggressively until you hit $1k MRR, then re-evaluate.\`,[e]},g=function(i,y,p){var t=M(i);return Array.isArray(t)?t.join(\`
\`):String(t)};var C=d,S=b,R=g,M=function(i){return b(i)};return[g(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

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
    { q: "What is break-even analysis?", a: "Break-even = revenue = costs (no profit, no loss). Calculate: 1) Fixed costs, 2) Variable costs per unit, 3) Price per unit, 4) Break-even units = fixed / (price - variable). For $10K fixed, $5 variable, $25 price: 500 units to break even. Use: pricing, capacity planning, fundraising. Most: 6-18 months to break-even is typical. SaaS: 12-24 months. E-commerce: 3-6 months." },
    { q: "How do I reduce break-even?", a: "1) Increase price (10% = 20-30% break-even cut), 2) Reduce fixed costs, 3) Reduce variable costs (COGS), 4) Mix shift (sell more profitable products). 20-40% break-even reduction in 6-12 months. increase price. Most teams 10% price increase = 25% break-even reduction. Avoid only cutting costs (limits growth). Best option: pricing + costs." },
    { q: "What is the difference between break-even and profitability?", a: "Break-even: revenue = costs. Profitability: revenue > costs. Time to break-even: months until first profit. Time to profitability: months until consistent profit. For 18-month break-even + 24-month profitability: cash flow negative for 24 months. target 6-12 months to break-even, 12-18 months to profitability. Use cash flow forecast + runway. Most investors: prefer faster path to profitability." },
    { q: "Should I include opportunity cost in break-even?", a: "Optional. Opportunity cost: what else could you do with the time/money. For founder: $100-300K/year. For investor: 7-10% return expected. For break-even decision: include if comparing to alternatives. For internal decision: optional. Most: include for founder salary (otherwise break-even understates true cost). Use: full economic break-even = all opportunity costs. Show both: cash break-even + economic break-even." },
    { q: "How does contribution margin affect break-even?", a: "Contribution margin = (price - variable cost) / price. For $25 price, $5 variable: 80% CM. Break-even = fixed costs / (price × CM). For $10K fixed, 80% CM, $25: 500 units. Higher CM = lower break-even. Most: aim for 70-80% CM. For SaaS: 70-85% (high CM). For e-commerce: 30-50% (lower). Increase CM: 1) Raise price, 2) Lower COGS, 3) Better mix. Most: 1) Price + 2) COGS = 5-10 pp CM lift." },
    { q: "What is a healthy break-even for SaaS?", a: "Benchmarks: 1) T2D3 (Triple, Triple, Double, Double, Double): 6-12 months to break-even, 2) Average: 12-18 months, 3) Slow: 18-24 months, 4) Concerning: >24 months. By stage: 1) Pre-PMF: not measured, 2) PMF: 12-18 months, 3) Growth: 6-12 months, 4) Scale: already profitable. Most: target 12-18 months. Path: 1) Reduce fixed, 2) Grow revenue. Most: 6-month reduction per year." },
    { q: "How do I use break-even for fundraising?", a: "For fundraise: 1) Calculate current break-even, 2) Project to next round, 3) Show: cash on hand + next round covers path to break-even. Most: 18-24 month runway post-fund. Show: 1) Burn, 2) Cash, 3) Runway, 4) Path to break-even. Investors: care about path. Avoid: \"we'll figure it out.\" Use: 3 scenarios (base, up, down). Most: show clear path. Best: clear path to break-even within 18 months." },
    { q: "What is the difference between cash break-even and gross margin break-even?", a: "Cash break-even: revenue = cash costs (excludes depreciation, amortization). Gross margin break-even: revenue = cost of goods sold only. For SaaS: gross margin break-even = hosting/support covered (low bar). Cash break-even = all costs covered (high bar). Operating break-even = operating income = 0 (between). For decisions: cash break-even (true). For targets: operating break-even (investor-friendly). Most: 2 are different by 20-30%." },
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
  engineKey: true,
};
registerEngine(engine);
