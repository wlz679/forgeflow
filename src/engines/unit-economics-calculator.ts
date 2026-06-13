import type { ToolEngine } from "../core/engines/types";
import { registerEngine } from "../core/engines/registry";

function calculateUnitEconomics(inputs: Record<string, string>): string[] {
  const fmt = (n: number) => "$" + Math.round(n).toLocaleString();
  const pct = (n: number) => n.toFixed(1) + "%";
  const fmtM = (n: number) => { if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M"; if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K"; return "$" + Math.round(n).toLocaleString(); };

  const revPerCust = parseFloat(inputs.averageRevenuePerCustomer) || 0;
  const expansionRev = parseFloat(inputs.expansionRevenuePerCustomer) || 0;
  const costServe = parseFloat(inputs.costToServePerCustomer) || 0;
  const cac = parseFloat(inputs.customerAcquisitionCost) || 0;
  const churnRate = parseFloat(inputs.monthlyChurnRate) || 0;
  const retentionMonths = parseFloat(inputs.retentionMonths) || 0;
  const monthlyChurn = churnRate / 100;

  const totalRev = revPerCust + expansionRev;
  const netContribution = totalRev - costServe;
  const netMargin = totalRev > 0 ? (netContribution / totalRev) * 100 : 0;
  const avgLifetime = retentionMonths > 0 ? retentionMonths : (monthlyChurn > 0 ? (1 / monthlyChurn) : Infinity);
  const ltv = isFinite(avgLifetime) ? netContribution * avgLifetime : Infinity;
  const paybackMonths = netContribution > 0 ? cac / netContribution : Infinity;
  const annualProfitPerCust = netContribution * 12;

  let result = "📦 Unit Economics\n\n";

  // Module 1: Unit Economics Snapshot
  result += "📋 Per-Customer Snapshot\n";
  result += "• Revenue / Customer:   " + fmt(revPerCust) + "/mo\n";
  if (expansionRev > 0) result += "• Expansion Revenue:    " + fmt(expansionRev) + "/mo\n";
  result += "• Cost to Serve:        " + fmt(costServe) + "/mo\n";
  result += "• Net Contribution:     " + fmt(netContribution) + "/mo  (" + pct(netMargin) + " margin)\n";
  result += "• Monthly Churn:        " + pct(churnRate) + "\n";
  if (isFinite(avgLifetime)) {
    result += "• Avg Customer Lifetime: " + avgLifetime.toFixed(0) + " months";
    if (retentionMonths > 0) result += " (manual)";
    result += "\n";
  } else {
    result += "• Avg Customer Lifetime: ∞  (zero churn — great!)\n";
  }
  if (isFinite(ltv) && ltv > 0) result += "• Customer LTV:         " + fmt(ltv) + "\n";

  // Module 2: CAC Payback
  if (cac > 0 && netContribution > 0) {
    result += "\n⏱️ CAC Payback\n";
    result += "• Cost to Acquire:      " + fmt(cac) + "\n";
    result += "• Monthly Net Contribution: " + fmt(netContribution) + "/mo\n";
    result += "• Payback Period:       " + paybackMonths.toFixed(1) + " months\n";
    result += "• Annual Profit:        " + fmt(annualProfitPerCust) + " per customer\n";
    if (paybackMonths <= 3) result += "• ✅ Excellent — you recover CAC in under 3 months. Invest more in growth!\n";
    else if (paybackMonths <= 6) result += "• 🟢 Good — payback under 6 months. Healthy unit economics.\n";
    else if (paybackMonths <= 12) result += "• 🟡 OK — payback within a year. Room to optimize either CAC or pricing.\n";
    else if (isFinite(paybackMonths)) result += "• 🔴 Slow — over 12 months to recover CAC. Raise prices or reduce acquisition cost.\n";
  } else if (cac === 0 && netContribution > 0) {
    result += "\n⏱️ CAC Payback\n• No acquisition cost — all revenue is pure growth.\n";
  }

  // Module 3: Scaling Economics (1K / 10K / 100K with 10% cost reduction per 10× scale)
  if (netContribution > 0) {
    result += "\n📊 Scaling Economics\n";
    const scales = [1000, 10000, 100000];
    for (let i = 0; i < scales.length; i++) {
      const n = scales[i];
      const costReduction = 1 - (i * 0.1); // 1.0, 0.9, 0.8 — 10% cost reduction per 10× scale
      const scaledCost = costServe * costReduction;
      const scaledNC = totalRev - scaledCost;
      const monthlyProfit = scaledNC * n;
      const churnOffset = Math.round(n * monthlyChurn);
      const totalCAC = cac * (n + churnOffset);
      result += "• " + n.toLocaleString() + " customers: " + fmt(monthlyProfit) + "/mo net  →  " + fmt(monthlyProfit * 12) + "/yr";
      if (i > 0) result += "  (cost -" + (i * 10) + "%)";
      if (cac > 0 && isFinite(totalCAC)) result += "  (acquire: " + fmt(totalCAC) + ")";
      result += "\n";
    }
    result += "  ^ Economies of scale: 10% cost reduction per 10× customers\n";
  }

  // Module 4: Optimization Levers
  if (netContribution > 0) {
    result += "\n🎯 Optimization Levers\n";

    // Reduce churn by 25%
    if (monthlyChurn > 0 && isFinite(ltv) && retentionMonths === 0) {
      const improvedChurn = monthlyChurn * 0.75;
      const improvedLTV = netContribution / improvedChurn;
      result += "• Reduce churn 25%:  LTV " + fmt(ltv) + " → " + fmt(improvedLTV) + "  (+" + fmt(improvedLTV - ltv) + ")\n";
    }

    // Increase price by 20%
    const increasedRev = revPerCust * 1.2;
    const increasedTotal = increasedRev + expansionRev;
    const increasedProfit = increasedTotal - costServe;
    if (increasedProfit > netContribution) {
      result += "• Raise price 20%:   Net " + fmt(netContribution) + "/mo → " + fmt(increasedProfit) + "/mo";
      if (cac > 0 && netContribution > 0) {
        const newPayback = cac / increasedProfit;
        result += "  |  Payback " + paybackMonths.toFixed(0) + " → " + newPayback.toFixed(0) + " mo";
      }
      result += "\n";
    }

    // Reduce CAC by 30%
    if (cac > 0 && netContribution > 0) {
      const reducedCAC = cac * 0.7;
      const newPayback = reducedCAC / netContribution;
      result += "• Reduce CAC 30%:    Payback " + paybackMonths.toFixed(0) + " → " + newPayback.toFixed(0) + " mo  (CAC: " + fmt(cac) + " → " + fmt(reducedCAC) + ")\n";
    }

    // Combined scenario
    if (monthlyChurn > 0 && isFinite(ltv) && retentionMonths === 0) {
      const improvedLTV = netContribution / (monthlyChurn * 0.75);
      const newCAC = cac * 0.7;
      result += "• 🚀 Best case (lower churn + lower CAC):  LTV " + fmt(improvedLTV) + "  |  Payback ";
      if (netContribution > 0) result += (newCAC / netContribution).toFixed(0) + " mo\n";
      else result += "N/A\n";
    }
  }

  // Module 5: Lever Impact Ranking
  if (netContribution > 0 && isFinite(ltv)) {
    result += "\n🏆 Lever Impact Ranking\n";

    let churnImpact = 0;
    let expImpact = 0;

    // Impact of reducing churn by 1% absolute
    if (monthlyChurn > 0.01 && retentionMonths === 0) {
      const improvedChurn = monthlyChurn - 0.01;
      const improvedLifetime = 1 / improvedChurn;
      const improvedLTV = netContribution * improvedLifetime;
      churnImpact = improvedLTV - ltv;
      result += "• Reduce churn 1%:     LTV " + fmt(ltv) + " → " + fmt(improvedLTV) + "  (+" + fmt(churnImpact) + ")\n";
    } else if (retentionMonths > 0) {
      result += "• Reduce churn 1%:     N/A (using manual lifetime override)\n";
    }

    // Impact of increasing expansion by 10%
    if (expansionRev > 0) {
      const improvedExp = expansionRev * 1.1;
      const improvedNC = revPerCust + improvedExp - costServe;
      const improvedLTV = improvedNC * avgLifetime;
      expImpact = improvedLTV - ltv;
      result += "• +10% Expansion:      LTV " + fmt(ltv) + " → " + fmt(improvedLTV) + "  (+" + fmt(expImpact) + ")\n";
    } else {
      result += "• +10% Expansion:      N/A (no expansion revenue set)\n";
    }

    // Ranking verdict
    if (churnImpact > expImpact && churnImpact > 0) {
      result += "\n🥇 Top Lever: Reduce Churn (+" + fmt(churnImpact) + " LTV vs +" + fmt(expImpact) + " from expansion)\n";
    } else if (expImpact > churnImpact && expImpact > 0) {
      result += "\n🥇 Top Lever: Grow Expansion (+" + fmt(expImpact) + " LTV vs +" + fmt(churnImpact) + " from churn)\n";
    } else if (churnImpact > 0 || expImpact > 0) {
      result += "\n🥇 Both levers have equal impact (+" + fmt(churnImpact) + ")\n";
    }
  }

  return [result];
}

const customFn =
  "function fmt(n){return '$'+Math.round(n).toLocaleString()}function pct(n){return n.toFixed(1)+'%'}" +
  "var rc=parseFloat(inputs.averageRevenuePerCustomer)||0;var er=parseFloat(inputs.expansionRevenuePerCustomer)||0;var cs=parseFloat(inputs.costToServePerCustomer)||0;var cac=parseFloat(inputs.customerAcquisitionCost)||0;var cr=parseFloat(inputs.monthlyChurnRate)||0;var rm=parseFloat(inputs.retentionMonths)||0;" +
  "var mc=cr/100;var tr=rc+er;var nc=tr-cs;var nm=tr>0?(nc/tr)*100:0;var al=rm>0?rm:(mc>0?(1/mc):Infinity);var ltv=isFinite(al)?nc*al:Infinity;var pm=nc>0?cac/nc:Infinity;var ap=nc*12;" +
  "var r='\\ud83d\\udce6 Unit Economics\\n\\n';" +
  "r+='\\ud83d\\udccb Per-Customer Snapshot\\n';" +
  "r+='\\u2022 Revenue / Customer:   '+fmt(rc)+'/mo\\n';if(er>0)r+='\\u2022 Expansion Revenue:    '+fmt(er)+'/mo\\n';" +
  "r+='\\u2022 Cost to Serve:        '+fmt(cs)+'/mo\\n';r+='\\u2022 Net Contribution:     '+fmt(nc)+'/mo  ('+pct(nm)+' margin)\\n';r+='\\u2022 Monthly Churn:        '+pct(cr)+'\\n';" +
  "if(isFinite(al)){r+='\\u2022 Avg Customer Lifetime: '+al.toFixed(0)+' months';if(rm>0)r+=' (manual)';r+='\\n';}else{r+='\\u2022 Avg Customer Lifetime: \\u221e  (zero churn \\u2014 great!)\\n';}" +
  "if(isFinite(ltv)&&ltv>0)r+='\\u2022 Customer LTV:         '+fmt(ltv)+'\\n';" +
  "if(cac>0&&nc>0){r+='\\n\\u23f1\\ufe0f CAC Payback\\n';r+='\\u2022 Cost to Acquire:      '+fmt(cac)+'\\n';r+='\\u2022 Monthly Net Contribution: '+fmt(nc)+'/mo\\n';r+='\\u2022 Payback Period:       '+pm.toFixed(1)+' months\\n';r+='\\u2022 Annual Profit:        '+fmt(ap)+' per customer\\n';" +
  "if(pm<=3)r+='\\u2022 \\u2705 Excellent \\u2014 recover CAC in under 3 months. Invest more in growth!\\n';else if(pm<=6)r+='\\u2022 \\ud83d\\udfe2 Good \\u2014 payback under 6 months. Healthy unit economics.\\n';else if(pm<=12)r+='\\u2022 \\ud83d\\udfe1 OK \\u2014 payback within a year. Room to optimize.\\n';else if(isFinite(pm))r+='\\u2022 \\ud83d\\udd34 Slow \\u2014 over 12 months to recover CAC. Raise prices or reduce acquisition cost.\\n';}" +
  "else if(cac===0&&nc>0){r+='\\n\\u23f1\\ufe0f CAC Payback\\n\\u2022 No acquisition cost \\u2014 all revenue is pure growth.\\n';}" +
  "if(nc>0){r+='\\n\\ud83d\\udcca Scaling Economics\\n';var sc=[1000,10000,100000];for(var i=0;i<sc.length;i++){var n=sc[i];var crf=1-(i*0.1);var sc2=cs*crf;var snc=tr-sc2;var mpr=snc*n;var ch=Math.round(n*mc);var tc=cac*(n+ch);r+='\\u2022 '+n.toLocaleString()+' customers: '+fmt(mpr)+'/mo net  \\u2192  '+fmt(mpr*12)+'/yr';if(i>0)r+='  (cost -'+(i*10)+'%)';if(cac>0&&isFinite(tc))r+='  (acquire: '+fmt(tc)+')';r+='\\n';}" +
  "r+='  ^ Economies of scale: 10% cost reduction per 10\\u00d7 customers\\n';}" +
  "if(nc>0){r+='\\n\\ud83c\\udfaf Optimization Levers\\n';" +
  "if(mc>0&&isFinite(ltv)&&rm===0){var ic=mc*0.75;var il=nc/ic;r+='\\u2022 Reduce churn 25%:  LTV '+fmt(ltv)+' \\u2192 '+fmt(il)+'  (+'+fmt(il-ltv)+')\\n';}" +
  "var ir=rc*1.2;var it=ir+er;var ip=it-cs;if(ip>nc){r+='\\u2022 Raise price 20%:   Net '+fmt(nc)+'/mo \\u2192 '+fmt(ip)+'/mo';if(cac>0&&nc>0){var np2=cac/ip;r+='  |  Payback '+pm.toFixed(0)+' \\u2192 '+np2.toFixed(0)+' mo';}r+='\\n';}" +
  "if(cac>0&&nc>0){var rcac=cac*0.7;var np3=rcac/nc;r+='\\u2022 Reduce CAC 30%:    Payback '+pm.toFixed(0)+' \\u2192 '+np3.toFixed(0)+' mo  (CAC: '+fmt(cac)+' \\u2192 '+fmt(rcac)+')\\n';}" +
  "if(mc>0&&isFinite(ltv)&&rm===0){var il2=nc/(mc*0.75);var nc2=cac*0.7;r+='\\u2022 \\ud83d\\ude80 Best case (lower churn + lower CAC):  LTV '+fmt(il2)+'  |  Payback ';if(nc>0)r+=(nc2/nc).toFixed(0)+' mo\\n';}}" +
  "if(nc>0&&isFinite(ltv)){r+='\\n\\ud83c\\udfc6 Lever Impact Ranking\\n';var ci=0;var ei=0;" +
  "if(mc>0.01&&rm===0){var ic2=mc-0.01;var il3=nc/ic2;ci=il3-ltv;r+='\\u2022 Reduce churn 1%:     LTV '+fmt(ltv)+' \\u2192 '+fmt(il3)+'  (+'+fmt(ci)+')\\n';}else if(rm>0){r+='\\u2022 Reduce churn 1%:     N/A (using manual lifetime)\\n';}" +
  "if(er>0){var ie=er*1.1;var inc2=rc+ie-cs;var il4=inc2*al;ei=il4-ltv;r+='\\u2022 +10% Expansion:      LTV '+fmt(ltv)+' \\u2192 '+fmt(il4)+'  (+'+fmt(ei)+')\\n';}else{r+='\\u2022 +10% Expansion:      N/A (no expansion revenue set)\\n';}" +
  "if(ci>ei&&ci>0){r+='\\n\\ud83e\\udd47 Top Lever: Reduce Churn (+'+fmt(ci)+' LTV vs +'+fmt(ei)+' from expansion)\\n';}else if(ei>ci&&ei>0){r+='\\n\\ud83e\\udd47 Top Lever: Grow Expansion (+'+fmt(ei)+' LTV vs +'+fmt(ci)+' from churn)\\n';}else if(ci>0||ei>0){r+='\\n\\ud83e\\udd47 Both levers have equal impact (+'+fmt(ci)+')\\n';}}" +
  "return [r];";

const engine: ToolEngine = {
  slug: "solopreneur-unit-economics-calculator",
  title: "Unit Economics Calculator",
  description: "Analyze per-customer profitability: net contribution, CAC payback, LTV, scaling economics, and optimization lever ranking.",
  category: "C",
  inputs: [
    { name: "averageRevenuePerCustomer", label: "Avg Monthly Revenue per Customer ($)", placeholder: "e.g. 50", type: "number" },
    { name: "costToServePerCustomer", label: "Monthly Cost to Serve per Customer ($)", placeholder: "e.g. 10", type: "number" },
    { name: "customerAcquisitionCost", label: "Customer Acquisition Cost ($)", placeholder: "e.g. 200", type: "number" },
    { name: "monthlyChurnRate", label: "Monthly Churn Rate (%)", placeholder: "e.g. 3", type: "number" },
    { name: "expansionRevenuePerCustomer", label: "Expansion Revenue / Customer ($)", placeholder: "e.g. 15", type: "number" },
    { name: "retentionMonths", label: "Avg Customer Lifetime (months)", placeholder: "e.g. 36 (optional, leave 0 to use churn-based)", type: "number" },
  ],
  clientConfig: { type: "custom", wordPools: {}, customFn },
  generate(inputs: Record<string, string>): string[] { return calculateUnitEconomics(inputs); },
  staticExamples: [
    "📦 Unit Economics\n\n📋 Per-Customer Snapshot\n• Revenue / Customer:   $50/mo\n• Expansion Revenue:    $15/mo\n• Cost to Serve:        $10/mo\n• Net Contribution:     $55/mo  (84.6% margin)\n• Monthly Churn:        3.0%\n• Avg Customer Lifetime: 33 months\n• Customer LTV:         $1,833\n\n⏱️ CAC Payback\n• Cost to Acquire:      $200\n• Monthly Net Contribution: $55/mo\n• Payback Period:       3.6 months\n• Annual Profit:        $660 per customer\n• 🟢 Good — payback under 6 months. Healthy unit economics.\n\n📊 Scaling Economics\n• 1,000 customers: $55,000/mo net  →  $660,000/yr  (acquire: $206,000)\n• 10,000 customers: $560,000/mo net  →  $6,720,000/yr  (cost -10%)  (acquire: $2,060,000)\n• 100,000 customers: $5,700,000/mo net  →  $68,400,000/yr  (cost -20%)  (acquire: $20,600,000)\n  ^ Economies of scale: 10% cost reduction per 10× customers\n\n🎯 Optimization Levers\n• Reduce churn 25%:  LTV $1,833 → $2,444  (+$611)\n• Raise price 20%:   Net $55/mo → $65/mo  |  Payback 4 → 3 mo\n• Reduce CAC 30%:    Payback 4 → 3 mo  (CAC: $200 → $140)\n• 🚀 Best case (lower churn + lower CAC):  LTV $2,444  |  Payback 3 mo\n\n🏆 Lever Impact Ranking\n• Reduce churn 1%:     LTV $1,833 → $2,750  (+$917)\n• +10% Expansion:      LTV $1,833 → $1,883  (+$50)\n\n🥇 Top Lever: Reduce Churn (+$917 LTV vs +$50 from expansion)",
  ],
  faq: [
    { q: "What is unit economics?", a: "Unit economics breaks down your business to the per-customer level: how much revenue each customer generates (including expansion upsells), what it costs to serve them, and how much you spend to acquire them. Positive unit economics means each customer is profitable on their own — the foundation of a sustainable business." },
    { q: "What counts as expansion revenue?", a: "Expansion revenue is the additional monthly revenue you generate from existing customers beyond their base subscription — upsells, add-ons, usage-based charges, seat upgrades. It compounds per-customer LTV and often has zero acquisition cost. Enter your average monthly expansion per customer here." },
    { q: "When should I use the manual lifetime override?", a: "If your business is new and you do not have enough churn data yet, leave it at 0 to calculate lifetime from churn rate (1 ÷ monthly churn). If you know your actual average customer lifetime from cohort analysis — e.g. 36 months — enter it directly. The manual value overrides the churn-based calculation." },
    { q: "What is a good net margin?", a: "Net contribution margin = (revenue + expansion − cost to serve) ÷ (revenue + expansion). For SaaS with expansion, 80-100%+ is excellent. For e-commerce, 40-60% is common. For services/agencies, 20-40%. If net margin is under 50%, look for ways to automate support, reduce hosting costs, or grow expansion revenue." },
    { q: "What is a good CAC payback period?", a: "Under 6 months is healthy, under 3 months is excellent. Over 12 months means you need a lot of capital to grow — and you are betting on customers sticking around long enough to become profitable. Most SaaS investors want to see payback under 12 months." },
    { q: "How do economies of scale affect unit economics?", a: "As you grow, your cost to serve per customer typically drops (bulk infrastructure pricing, automation, support efficiency). This calculator models a 10% cost reduction every time your customer count grows 10×. See the Scaling Economics section for the impact at 1K, 10K, and 100K customers." },
    { q: "Which optimization lever should I focus on?", a: "The Lever Impact Ranking at the bottom compares the LTV impact of reducing churn by 1% versus increasing expansion revenue by 10%. The larger impact wins. In most SaaS businesses, reducing churn has the highest leverage — but if your churn is already low and expansion is strong, growing expansion may win." },
  ],
  howToUse: [
    "Enter your average monthly revenue per customer (base subscription or purchase).",
    "(Optional) Enter your average monthly expansion revenue per customer — upsells, add-ons, usage fees.",
    "Enter your monthly cost to serve one customer (hosting, support, payment processing, API costs).",
    "Enter your Customer Acquisition Cost (total sales & marketing spend ÷ new customers acquired).",
    "Enter your monthly churn rate as a percentage (customers lost per month ÷ total customers).",
    "(Optional) Set a manual average customer lifetime in months if you know it from data. Leave at 0 to auto-calculate from churn.",
    "Check the Per-Customer Snapshot for net contribution, margin, and LTV.",
    "Review CAC Payback to see how quickly you recover acquisition costs.",
    "Scan Scaling Economics to see how unit profit scales at 1K, 10K, and 100K customers with economies of scale.",
    "Read Optimization Levers to see how churn reduction, pricing, and CAC improvements compound.",
    "Compare the Lever Impact Ranking to decide whether to invest in churn reduction or expansion growth.",
  ],
};
registerEngine(engine);
