import type { ToolEngine } from "../../core/engines/types";
import { registerEngine } from "../../core/engines/registry";
import { clampNonNegative } from "../../core/engines/helpers";

function bar(pct: number): string {
  const w = Math.round(pct * 20);
  return "█".repeat(w) + "░".repeat(20 - w);
}

function calculateBurnRate(inputs: Record<string, string>): string[] {
  const fmt = (n: number) => "$" + Math.round(n).toLocaleString();
  const pct = (n: number, total: number) => total > 0 ? ((n / total) * 100).toFixed(1) + "%" : "0.0%";

  const monthlyRevenue = clampNonNegative(parseFloat(inputs.monthlyRevenue) || 0);
  const teamCost = clampNonNegative(parseFloat(inputs.teamCost) || 0);
  const infraCost = clampNonNegative(parseFloat(inputs.infraCost) || 0);
  const marketingCost = clampNonNegative(parseFloat(inputs.marketingCost) || 0);
  const opsCost = clampNonNegative(parseFloat(inputs.opsCost) || 0);
  const currentCash = clampNonNegative(parseFloat(inputs.currentCash) || 0);
  const netNewRevenue = clampNonNegative(parseFloat(inputs.netNewRevenue) || 0);

  const grossBurn = teamCost + infraCost + marketingCost + opsCost;
  const netBurn = grossBurn - monthlyRevenue;

  let result = "🔥 Cash Flow Health Check\n\n";

  result += "💸 Burn Summary\n";
  result += "• Gross Burn:    " + fmt(grossBurn) + "/mo\n• Net Burn:      " + fmt(netBurn) + "/mo";
  if (monthlyRevenue > 0) result += "  (Gross − Revenue)\n"; else result += "  (no revenue yet)\n";
  result += "• Annual Burn:   " + fmt(netBurn * 12) + "/yr\n";
  if (netBurn > 0) result += "• To break even: Need +" + fmt(netBurn) + "/mo more revenue (or cut costs by same amount)\n";

  // runwayMonths is computed here for reuse in Default Alive/Dead section
  let runwayMonths = 0;
  result += "\n⏳ Runway\n";
  result += "• Current Cash:      " + fmt(currentCash) + "\n";
  if (netBurn <= 0) { result += "• Status:            ✅ Cash-flow positive! No burn concern.\n"; }
  else if (currentCash <= 0) { result += "• Status:            ⚠️ No cash reserve — enter your balance to estimate runway.\n"; }
  else {
    runwayMonths = currentCash / netBurn;
    const today = new Date();
    const runOut = new Date(today.getTime() + runwayMonths * 30.44 * 24 * 60 * 60 * 1000);
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const runOutLabel = monthNames[runOut.getMonth()] + " " + runOut.getFullYear();
    result += "• Remaining Runway:  " + runwayMonths.toFixed(1) + " months\n• Est. Cash Run-out:   " + runOutLabel + "\n";
    if (runwayMonths > 12) result += "• Assessment:        🟢 Healthy — over a year of runway.\n";
    else if (runwayMonths > 6) result += "• Assessment:        🟡 Manageable — 6–12 months. Plan ahead.\n";
    else if (runwayMonths > 3) result += "• Assessment:        🟠 Tight — 3–6 months. Cut costs or raise revenue now.\n";
    else result += "• Assessment:        🔴 Critical — under 3 months. Immediate action required.\n";
  }

  // Burn Multiple section — measures how efficiently burn converts to new revenue
  if (netNewRevenue > 0) {
    const burnMultiple = netBurn / netNewRevenue;
    result += "\n📈 Burn Multiple\n";
    result += "• Net New Revenue:  " + fmt(netNewRevenue) + "/mo\n";
    result += "• Burn Multiple:    " + burnMultiple.toFixed(1) + "× ";
    if (burnMultiple < 1.0) {
      result += "🟢\n";
      result += "• Insight:          You're adding more revenue than you're burning. Great trajectory!\n";
    } else if (burnMultiple <= 2.0) {
      result += "🟡\n";
      result += "• Insight:          Moderate efficiency. Aim to bring this below 1.0×.\n";
    } else {
      result += "🔴\n";
      result += "• Insight:          Burning much faster than you're adding revenue. Need to improve efficiency.\n";
    }
  }

  // Default Alive/Dead — overall health verdict based on runway and growth trajectory
  result += "\n💀 Default Alive/Dead Status\n";
  if (netBurn <= 0) {
    result += "• Status:  ✅ Default Alive: cash-flow positive\n";
  } else if (currentCash > 0) {
    if (runwayMonths > 24) {
      result += "• Status:  🟢 Default Alive: 24+ months runway\n";
    } else if (runwayMonths > 12) {
      result += "• Status:  🟡 Default Alive: 12-24 months\n";
    } else {
      result += "• Status:  🔴 Default Dead: under 12 months — need growth or funding to survive\n";
    }
  } else {
    result += "• Status:  🔴 Default Dead: under 12 months — need growth or funding to survive\n";
  }

  if (grossBurn > 0) {
    result += "\n📊 Cost Structure\n";
    const categories: [string, number][] = [["Team", teamCost], ["Marketing", marketingCost], ["Infrastructure", infraCost], ["Operations", opsCost]];
    for (const [label, cost] of categories) {
      if (cost > 0) { const share = cost / grossBurn; result += "• " + label.padEnd(14) + " " + pct(cost, grossBurn).padStart(6) + "  " + bar(share) + "\n"; }
    }
  }

  const originalRunway = (netBurn > 0 && currentCash > 0) ? currentCash / netBurn : Infinity;
  if (netBurn > 0 && currentCash > 0) {
    const cuts = [0.1, 0.2, 0.3];
    result += "\n🔄 Cost-Cut Scenarios\n";
    for (const cut of cuts) {
      const savings = grossBurn * cut;
      const reducedNetBurn = netBurn - savings;
      const pctLabel = Math.round(cut * 100) + "%";
      if (reducedNetBurn <= 0) { result += "• Cut " + pctLabel + ": Save " + fmt(savings) + "/mo — ✅ Cash-flow positive!\n"; }
      else { const newRunway = currentCash / reducedNetBurn; const extra = newRunway - originalRunway; result += "• Cut " + pctLabel + ": Save " + fmt(savings) + "/mo — Net burn " + fmt(reducedNetBurn) + "/mo — Runway " + newRunway.toFixed(1) + " mo (+" + extra.toFixed(1) + " extra)\n"; }
    }
  }

  // 🩺 Burn Health (v3)
  if (netBurn <= 0) {
    result += "\n\n🩺 Burn Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 Default alive — revenue ≥ expenses. No burn. Focus on growth and reinvestment.";
  } else if (currentCash <= 0) {
    result += "\n\n🩺 Burn Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🔴 No cash. Cannot compute runway. Bootstrap, raise, or shut down.";
  } else if (isFinite(originalRunway) && originalRunway < 3) {
    result += "\n\n🩺 Burn Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🔴 Runway " + originalRunway.toFixed(1) + " months — critical. Raise capital NOW or cut burn 50%+ this month.";
  } else if (isFinite(originalRunway) && originalRunway < 6) {
    result += "\n\n🩺 Burn Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟠 Runway " + originalRunway.toFixed(1) + " months — warning zone. Start raising or cut burn in next 2 months.";
  } else if (isFinite(originalRunway) && originalRunway < 12) {
    result += "\n\n🩺 Burn Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 Runway " + originalRunway.toFixed(1) + " months — adequate for now. Plan Series A or accelerate revenue.";
  } else {
    result += "\n\n🩺 Burn Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 Runway " + originalRunway.toFixed(1) + " months — comfortable. Default dead is years away. Focus on growth.";
  }

  // 🔄 What-If Scenarios (v3)
  result += "\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
  if (isFinite(originalRunway) && netBurn > 0) {
    const raiseRev20 = currentCash / (netBurn - monthlyRevenue * 0.2);
    const cutExp20 = currentCash / (netBurn * 0.8);
    const raise1M = currentCash + 1_000_000;
    const newRunwayAfterRaise = raise1M / netBurn;
    result += "\n• Raise revenue 20%:  Runway " + originalRunway.toFixed(1) + " → " + raiseRev20.toFixed(1) + " mo";
    result += "\n• Cut expenses 20%:  Runway " + originalRunway.toFixed(1) + " → " + cutExp20.toFixed(1) + " mo";
    result += "\n• Raise $1M (6-month runway extension at current burn):  " + (newRunwayAfterRaise).toFixed(1) + " mo";
    result += "\n• Hit default alive (revenue = expenses):  ∞ runway (focus on growth)";
    if (monthlyRevenue > 0) {
      const growthNeeded = ((grossBurn - monthlyRevenue) / monthlyRevenue) * 100;
      result += "\n• Growth needed monthly to break even:  +" + growthNeeded.toFixed(1) + "% revenue";
    }
  } else {
    result += "\n• ⚠️ Cannot model — ensure cash > 0 and net burn > 0.";
  }

  // ⚖️ Break-Even (v3)
  if (netBurn > 0 && currentCash > 0) {
    result += "\n\n⚖️ Break-Even\n" + "─".repeat(54);
    const breakEvenRevenue = monthlyRevenue + netBurn; // revenue needed to hit $0 net burn
    const growthPct = monthlyRevenue > 0 ? ((netBurn / monthlyRevenue) * 100) : 0;
    if (growthPct > 0) {
      result += "\n• 🟡 Need +" + fmt(netBurn) + "/mo revenue (" + growthPct.toFixed(0) + "% growth) to hit break-even";
    } else {
      result += "\n• 🟡 Need +" + fmt(netBurn) + "/mo revenue (no revenue baseline)";
    }
    result += "\n• Or cut costs by " + fmt(netBurn) + "/mo (e.g., " + Math.round((netBurn / grossBurn) * 100) + "% of current gross burn)";
    result += "\n• Break-even runway: ∞ (no burn = no runway concern)";
  } else if (netBurn <= 0) {
    result += "\n\n⚖️ Break-Even\n" + "─".repeat(54);
    result += "\n• 🟢 Already at break-even — revenue ≥ expenses. Focus on reinvestment.";
  }

  // 🎯 Burn Milestones (v3)
  if (netBurn > 0 && currentCash > 0) {
    result += "\n\n🎯 Runway Milestones\n" + "─".repeat(54);
    const milestoneMonths = [6, 12, 18, 24];
    for (const mo of milestoneMonths) {
      const cashNeeded = mo * netBurn;
      let status: string;
      if (currentCash >= cashNeeded) {
        status = "🟢";
      } else if (currentCash >= cashNeeded * 0.7) {
        status = "🟡";
      } else if (currentCash >= cashNeeded * 0.4) {
        status = "🟠";
      } else {
        status = "🔴";
      }
      result += "\n• " + mo + "-month runway:  need $" + Math.round(cashNeeded).toLocaleString() + " cash  (you have: " + fmt(currentCash) + ")  " + status;
    }
  }

  // 💡 Tip (v3)
  if (netBurn > 5) {
    result += "\n\n💡 Tip: Team costs are typically 50-70% of gross burn. If you need to extend runway fast, headcount is the biggest lever — but also the slowest to undo. Try cutting SaaS subscriptions and contractor hours first for immediate savings without firing.";
  } else if (netBurn > 0) {
    result += "\n\n💡 Tip: Burn multiple below 1.0× means you're growing revenue faster than you burn. Below 0.5× is best-in-class — investors reward capital efficiency. Track it monthly.";
  } else {
    result += "\n\n💡 Tip: Default alive is just the start. Reinvest excess cash into growth experiments (paid acquisition, content, hiring) to compound the advantage before competitors catch up.";
  }

  return [result];
}

const customFn =
  "function bar(p){var w=Math.round(p*20);var r='';for(var i=0;i<20;i++)r+=i<w?'█':'░';return r}" +
  "function fmt(n){return '$'+Math.round(n).toLocaleString()}function pct(n,t){return t>0?((n/t)*100).toFixed(1)+'%':'0.0%'}" +
  "var cnn=function(x){return Math.max(0,x)};var mr=cnn(parseFloat(inputs.monthlyRevenue)||0);var tc=cnn(parseFloat(inputs.teamCost)||0);var ic=cnn(parseFloat(inputs.infraCost)||0);var mc=cnn(parseFloat(inputs.marketingCost)||0);var oc=cnn(parseFloat(inputs.opsCost)||0);var cc=cnn(parseFloat(inputs.currentCash)||0);var nnr=cnn(parseFloat(inputs.netNewRevenue)||0);" +
  "var gb=tc+ic+mc+oc;var nb=gb-mr;var rm=0;" +
  "var r='\\uD83D\\uDD25 Cash Flow Health Check\n\n';" +
  "r+='\\uD83D\\uDCB8 Burn Summary\n• Gross Burn:    '+fmt(gb)+'/mo\n• Net Burn:      '+fmt(nb)+'/mo'+(mr>0?'  (Gross \\u2212 Revenue)\n':'  (no revenue yet)\n')+'• Annual Burn:   '+fmt(nb*12)+'/yr\n';" +
  "if(nb>0)r+='• To break even: Need +'+fmt(nb)+'/mo more revenue (or cut costs by same amount)\n';" +
  "r+='\n\\u23F3 Runway\n• Current Cash:      '+fmt(cc)+'\n';" +
  "if(nb<=0){r+='• Status:            \\u2705 Cash-flow positive! No burn concern.\n';}" +
  "else if(cc<=0){r+='• Status:            \\u26A0\\uFE0F No cash reserve — enter your balance to estimate runway.\n';}" +
  "else{rm=cc/nb;var now=new Date();var ro=new Date(now.getTime()+rm*30.44*86400000);var mn=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];var rol=mn[ro.getMonth()]+' '+ro.getFullYear();r+='• Remaining Runway:  '+rm.toFixed(1)+' months\n• Est. Cash Run-out:   '+rol+'\n';" +
  "if(rm>12)r+='• Assessment:        \\uD83D\\uDFE2 Healthy — over a year of runway.\n';else if(rm>6)r+='• Assessment:        \\uD83D\\uDFE1 Manageable — 6–12 months. Plan ahead.\n';else if(rm>3)r+='• Assessment:        \\uD83D\\uDFE0 Tight — 3–6 months. Cut costs or raise revenue now.\n';else r+='• Assessment:        \\uD83D\\uDD34 Critical — under 3 months. Immediate action required.\n';}" +
  "if(nnr>0){var bm=nb/nnr;var bml=bm<1?'\\uD83D\\uDFE2':bm<=2?'\\uD83D\\uDFE1':'\\uD83D\\uDD34';r+='\n\\uD83D\\uDCC8 Burn Multiple\n• Net New Revenue:  '+fmt(nnr)+'/mo\n• Burn Multiple:    '+bm.toFixed(1)+'\\u00D7 '+bml+'\n';if(bm<1)r+='• Insight:          Adding more revenue than you are burning. Great trajectory!\n';else if(bm<=2)r+='• Insight:          Moderate efficiency. Aim to bring this below 1.0\\u00D7.\n';else r+='• Insight:          Burning much faster than you are adding revenue. Need to improve efficiency.\n';}" +
  "r+='\n\\uD83D\\uDC80 Default Alive/Dead Status\n';if(nb<=0){r+='• Status:  \\u2705 Default Alive: cash-flow positive\n';}else if(cc>0){if(rm>24)r+='• Status:  \\uD83D\\uDFE2 Default Alive: 24+ months runway\n';else if(rm>12)r+='• Status:  \\uD83D\\uDFE1 Default Alive: 12-24 months\n';else r+='• Status:  \\uD83D\\uDD34 Default Dead: under 12 months — need growth or funding to survive\n';}else{r+='• Status:  \\uD83D\\uDD34 Default Dead: under 12 months — need growth or funding to survive\n';}" +
  "if(gb>0){r+='\n\\uD83D\\uDCCA Cost Structure\n';var cats=[['Team',tc],['Marketing',mc],['Infrastructure',ic],['Operations',oc]];for(var i=0;i<cats.length;i++){var lb=cats[i][0];var ct=cats[i][1];if(ct>0){var sh=ct/gb;r+='• '+lb;for(var j=lb.length;j<16;j++)r+=' ';r+=' '+pct(ct,gb)+'  '+bar(sh)+'\n';}}}" +
  "if(nb>0&&cc>0){var cuts=[0.1,0.2,0.3];var orw=cc/nb;r+='\n\\uD83D\\uDD04 Cost-Cut Scenarios\n';for(var ci=0;ci<cuts.length;ci++){var cut=cuts[ci];var sv=gb*cut;var rnb=nb-sv;var pl=Math.round(cut*100)+'%';if(rnb<=0){r+='• Cut '+pl+': Save '+fmt(sv)+'/mo — \\u2705 Cash-flow positive!\n';}else{var nrw=cc/rnb;var ext=nrw-orw;r+='• Cut '+pl+': Save '+fmt(sv)+'/mo — Net burn '+fmt(rnb)+'/mo — Runway '+nrw.toFixed(1)+' mo (+'+ext.toFixed(1)+' extra)\n';}}}" +
  "if(nb>0&&cc>0){r+='\n\n\\u2696\\uFE0F Break-Even\n──────────────────────────────────────────────────────';var ber=mr+nb;var gp=mr>0?((nb/mr)*100):0;if(gp>0)r+='\n• \\uD83D\\uDFE1 Need +'+fmt(nb)+'/mo revenue ('+gp.toFixed(0)+'% growth) to hit break-even';else r+='\n• \\uD83D\\uDFE1 Need +'+fmt(nb)+'/mo revenue (no revenue baseline)';r+='\n• Or cut costs by '+fmt(nb)+'/mo (e.g., '+Math.round((nb/gb)*100)+'% of current gross burn)';r+='\n• Break-even runway: \\u221E (no burn = no runway concern)';}else if(nb<=0){r+='\n\n\\u2696\\uFE0F Break-Even\n──────────────────────────────────────────────────────';r+='\n• \\uD83D\\uDFE2 Already at break-even — revenue ≥ expenses. Focus on reinvestment.';}" +
  "if(nb>0&&cc>0){r+='\n\n\\uD83C\\uDFAF Runway Milestones\n──────────────────────────────────────────────────────';var mms=[6,12,18,24];for(var mi=0;mi<mms.length;mi++){var cn=mms[mi]*nb;var st;if(cc>=cn)st='\\uD83D\\uDFE2';else if(cc>=cn*0.7)st='\\uD83D\\uDFE1';else if(cc>=cn*0.4)st='\\uD83D\\uDFE0';else st='\\uD83D\\uDD34';r+='\n• '+mms[mi]+'-month runway:  need $'+Math.round(cn).toLocaleString()+' cash  (you have: '+fmt(cc)+')  '+st;}}" +
  "if(nb>5)r+='\n\n\\uD83D\\uDCA1 Tip: Team costs are typically 50-70% of gross burn. If you need to extend runway fast, headcount is the biggest lever — but also the slowest to undo. Try cutting SaaS subscriptions and contractor hours first for immediate savings without firing.';else if(nb>0)r+='\n\n\\uD83D\\uDCA1 Tip: Burn multiple below 1.0\\u00D7 means you\\'re growing revenue faster than you burn. Below 0.5\\u00D7 is best-in-class — investors reward capital efficiency. Track it monthly.';else r+='\n\n\\uD83D\\uDCA1 Tip: Default alive is just the start. Reinvest excess cash into growth experiments (paid acquisition, content, hiring) to compound the advantage before competitors catch up.';" +
  "return [r];";

const engine: ToolEngine = {
  slug: "solopreneur-burn-rate-calculator",
  title: "Burn Rate Calculator",
  description: "Analyze your monthly cash flow: break down costs by category, calculate runway, and see how cost-cutting extends your survival time.",
  inputs: [
    { name: "monthlyRevenue", label: "Monthly Revenue ($)", placeholder: "e.g. 5000", type: "number" },
    { name: "netNewRevenue", label: "Net New Revenue Added ($/mo)", placeholder: "e.g. 3000 (optional)", type: "number" },
    { name: "teamCost", label: "Team Cost ($/mo)", placeholder: "e.g. 8000", type: "number" },
    { name: "infraCost", label: "Infrastructure & SaaS ($/mo)", placeholder: "e.g. 500", type: "number" },
    { name: "marketingCost", label: "Marketing & Ads ($/mo)", placeholder: "e.g. 2000", type: "number" },
    { name: "opsCost", label: "Operations & Misc ($/mo)", placeholder: "e.g. 1500", type: "number" },
    { name: "currentCash", label: "Current Cash Balance ($)", placeholder: "e.g. 50000", type: "number" },
  ],
  clientConfig: { type: "custom", wordPools: {}, customFn },
  generate(inputs: Record<string, string>): string[] { return calculateBurnRate(inputs); },
  staticExamples: [
    '🔥 Cash Flow Health Check\n\n💸 Burn Summary\n• Gross Burn:    $0/mo\n• Net Burn:      $-20,000/mo  (Gross − Revenue)\n• Annual Burn:   $-240,000/yr\n\n⏳ Runway\n• Current Cash:      $500,000\n• Status:            ✅ Cash-flow positive! No burn concern.\n\n💀 Default Alive/Dead Status\n• Status:  ✅ Default Alive: cash-flow positive\n\n\n🩺 Burn Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 Default alive — revenue ≥ expenses. No burn. Focus on growth and reinvestment.\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• ⚠️ Cannot model — ensure cash > 0 and net burn > 0.\n\n⚖️ Break-Even\n──────────────────────────────────────────────────────\n• 🟢 Already at break-even — revenue ≥ expenses. Focus on reinvestment.\n\n💡 Tip: Default alive is just the start. Reinvest excess cash into growth experiments (paid acquisition, content, hiring) to compound the advantage before competitors catch up.',
  ],
  faq: [
    { q: "What is the difference between gross burn and net burn?", a: "Gross burn is total monthly operating expenses before revenue. Net burn = gross burn − monthly revenue. For example, if you spend $12K/month and earn $5K/month, gross burn is $12K, net burn is $7K. Track both — gross burn shows spending discipline, net burn shows how fast your bank account actually shrinks." },
    { q: "What is Burn Multiple and what's a good number?", a: "Burn Multiple = Net Burn / Net New Revenue Added. It measures how efficiently you're converting burn into revenue growth. <1.0x is great (revenue growing faster than burn), 1.0–2.0x is moderate, >2.0x means you're burning much faster than you're growing — time to improve unit economics or cut costs. Leave net new revenue blank if you don't track it yet." },
    { q: "What is a healthy runway for an early-stage business?", a: "18-24 months is the gold standard after a fundraise. For bootstrapped entrepreneurs, 6-12 months is healthy. Under 3 months is critical — you need to act immediately on either cost-cutting or revenue generation." },
    { q: "Which cost category typically matters most?", a: "Team/personnel costs are almost always the largest expense (50-70% of burn). If you need to cut quickly, headcount is the biggest lever. For SaaS tools, audit subscriptions quarterly — most people are paying for tools they stopped using months ago." },
    { q: "How often should I recalculate my burn rate?", a: "Monthly, when you close your books. Set up a simple spreadsheet or use accounting software. If your net burn is trending up month-over-month, investigate immediately — cost creep is easy to miss." },
    { q: "What if I have irregular revenue?", a: "Use the average of the last 3-6 months for the monthly revenue field. If you are pre-revenue, leave it at 0 to see your worst-case burn. Run a second scenario with your conservative revenue estimate to compare." },

    { q: "How do I calculate runway from burn rate?", a: "Runway (months) = cash_on_hand / monthly_net_burn. For $1M cash, $100K net burn: 10 months runway. Track: 1) Cash on hand (last bank statement), 2) Net burn (last 3-6 month average), 3) Adjust for new revenue/costs. Most: 18+ months runway is healthy. <6 months: critical. 6-12: cautious. 12-18: healthy. 18+: great. Update monthly. Plan: fundraising, cost cuts, or revenue acceleration." },
    { q: "What is a healthy burn multiple?", a: "Burn multiple = net burn / net new ARR. Measures capital efficiency. Benchmarks: 1) <0.5x: capital efficient, 2) 0.5-1x: healthy, 3) 1-2x: average, 4) 2-3x: concerning, 5) >3x: inefficient. Best option: <1x. For $100K net burn, $200K new ARR: 0.5x. 0.3-0.5x. Investors: key efficiency metric. Most teams 0.7-1.5x. Target: <1x." },
    { q: "How do I extend my runway without raising?", a: "1) Cut non-essential costs (audit subscriptions, freeze hiring), 2) Renegotiate vendor contracts, 3) Convert fixed to variable (3PL vs in-house), 4) Slow growth (target profitability), 5) Pre-sell annual contracts, 6) Issue invoices early. 20-50% cost reduction possible. Time: 1-3 months. Use 18-month runway = default to profitability. Avoid 1 round away from zero." },
    { q: "What is a good burn rate for an early-stage startup?", a: "Depends on stage: 1) Pre-seed: $20-50K/month, 2) Seed: $50-150K, 3) Series A: $150-500K, 4) Series B: $500K-2M. stage-appropriate. For $5M raised: burn $200-300K/month, 18-24 month runway. Track burn/capital ratio. Aim for 60-70% of capital on people, 10-20% on product/engineering, 10-20% on sales/marketing, 5-10% G&A. Optimize: highest-ROI spend." },
    { q: "Should I optimize for growth or profitability?", a: "Depends on stage + capital. 1) Pre-PMF: optimize for learning, 2) Post-PMF, pre-scale: optimize for growth, 3) Series B+: optimize for efficiency, 4) Pre-IPO: optimize for profitability. Trade-off: growth = more revenue, more burn, more dilution. Profitability = less growth, less dilution. Most VC-backed: growth > profitability. Bootstrapped: profitability > growth. Choose: by stage, capital, market." },
    { q: "How do I forecast burn rate accurately?", a: "Forecast: 1) Fixed costs (salaries, rent, SaaS), 2) Variable costs (sales, marketing, support), 3) Revenue (deals, churn, expansion). For 12-month model: monthly build. Most: bottom-up (per line item). Top-down: market benchmarks (e.g., $X per employee). Tools: Carta, Fathom, custom. Update monthly. Compare actual vs forecast. Improve accuracy: track variance, adjust assumptions." },
    { q: "What is the difference between cash burn and accounting burn?", a: "Cash burn: actual cash going out. Accounting burn: net loss (P&L basis). Difference: 1) Timing (accounts receivable, payable), 2) Depreciation/amortization (non-cash), 3) Stock-based compensation. For runway: use cash burn. For valuation: use accounting burn. Most: cash burn is the true number. For SaaS: difference is 5-15% typically. Use cash burn for runway calculation." },
  ],
  howToUse: [
    "Enter your average monthly revenue (leave at 0 if pre-revenue).",
    "Optionally enter Net New Revenue Added — the month-over-month revenue growth you're achieving — to see your Burn Multiple.",
    "Fill in your team costs — salaries, contractors, benefits.",
    "Add up all SaaS subscriptions and cloud hosting as Infrastructure.",
    "Include ad spend, content marketing, and tool subscriptions as Marketing.",
    "Enter remaining costs (rent, legal, insurance, travel) as Operations.",
    "Enter your current cash balance to calculate runway and run-out date.",
    "Review the Burn Multiple to see how efficiently you're converting spend into growth.",
    "Check the Default Alive/Dead verdict to understand your overall survival outlook.",
    "Review the cost structure chart to see which category is eating the most cash.",
    "Check the what-if scenario to see how cost-cutting extends your runway.",
  ],
  engineKey: true,
};
registerEngine(engine);
