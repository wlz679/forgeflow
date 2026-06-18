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

  const out: string[] = [];
  out.push("📦 Unit Economics");
  out.push("");

  // Section 1: Per-Customer Snapshot
  out.push("📋 Per-Customer Snapshot");
  out.push("• Revenue / Customer:   " + fmt(revPerCust) + "/mo");
  if (expansionRev > 0) out.push("• Expansion Revenue:    " + fmt(expansionRev) + "/mo");
  out.push("• Cost to Serve:        " + fmt(costServe) + "/mo");
  out.push("• Net Contribution:     " + fmt(netContribution) + "/mo  (" + pct(netMargin) + " margin)");
  out.push("• Monthly Churn:        " + pct(churnRate));
  if (isFinite(avgLifetime)) {
    out.push("• Avg Customer Lifetime: " + avgLifetime.toFixed(0) + " months" + (retentionMonths > 0 ? " (manual)" : ""));
  } else {
    out.push("• Avg Customer Lifetime: ∞  (zero churn — great!)");
  }
  if (isFinite(ltv) && ltv > 0) out.push("• Customer LTV:         " + fmt(ltv));
  out.push("");

  // Section 2: CAC Payback
  if (cac > 0 && netContribution > 0) {
    out.push("⏱️ CAC Payback");
    out.push("• Cost to Acquire:      " + fmt(cac));
    out.push("• Monthly Net Contribution: " + fmt(netContribution) + "/mo");
    out.push("• Payback Period:       " + paybackMonths.toFixed(1) + " months");
    out.push("• Annual Profit:        " + fmt(annualProfitPerCust) + " per customer");
    if (paybackMonths <= 3) out.push("• ✅ Excellent — you recover CAC in under 3 months. Invest more in growth!");
    else if (paybackMonths <= 6) out.push("• 🟢 Good — payback under 6 months. Healthy unit economics.");
    else if (paybackMonths <= 12) out.push("• 🟡 OK — payback within a year. Room to optimize either CAC or pricing.");
    else if (isFinite(paybackMonths)) out.push("• 🔴 Slow — over 12 months to recover CAC. Raise prices or reduce acquisition cost.");
    out.push("");
  } else if (cac === 0 && netContribution > 0) {
    out.push("⏱️ CAC Payback");
    out.push("• No acquisition cost — all revenue is pure growth.");
    out.push("");
  }

  // Section 3: Scaling Economics
  if (netContribution > 0) {
    out.push("📊 Scaling Economics");
    const scales = [1000, 10000, 100000];
    for (let i = 0; i < scales.length; i++) {
      const n = scales[i];
      const costReduction = 1 - (i * 0.1);
      const scaledCost = costServe * costReduction;
      const scaledNC = totalRev - scaledCost;
      const monthlyProfit = scaledNC * n;
      const churnOffset = Math.round(n * monthlyChurn);
      const totalCAC = cac * (n + churnOffset);
      let line = "• " + n.toLocaleString() + " customers: " + fmt(monthlyProfit) + "/mo net  →  " + fmt(monthlyProfit * 12) + "/yr";
      if (i > 0) line += "  (cost -" + (i * 10) + "%)";
      if (cac > 0 && isFinite(totalCAC)) line += "  (acquire: " + fmt(totalCAC) + ")";
      out.push(line);
    }
    out.push("  ^ Economies of scale: 10% cost reduction per 10× customers");
    out.push("");
  }

  // Section 4: Optimization Levers
  if (netContribution > 0) {
    out.push("🎯 Optimization Levers");
    if (monthlyChurn > 0 && isFinite(ltv) && retentionMonths === 0) {
      const improvedChurn = monthlyChurn * 0.75;
      const improvedLTV = netContribution / improvedChurn;
      out.push("• Reduce churn 25%:  LTV " + fmt(ltv) + " → " + fmt(improvedLTV) + "  (+" + fmt(improvedLTV - ltv) + ")");
    }
    const increasedRev = revPerCust * 1.2;
    const increasedTotal = increasedRev + expansionRev;
    const increasedProfit = increasedTotal - costServe;
    if (increasedProfit > netContribution) {
      let line = "• Raise price 20%:   Net " + fmt(netContribution) + "/mo → " + fmt(increasedProfit) + "/mo";
      if (cac > 0 && netContribution > 0) {
        const newPayback = cac / increasedProfit;
        line += "  |  Payback " + paybackMonths.toFixed(0) + " → " + newPayback.toFixed(0) + " mo";
      }
      out.push(line);
    }
    if (cac > 0 && netContribution > 0) {
      const reducedCAC = cac * 0.7;
      const newPayback = reducedCAC / netContribution;
      out.push("• Reduce CAC 30%:    Payback " + paybackMonths.toFixed(0) + " → " + newPayback.toFixed(0) + " mo  (CAC: " + fmt(cac) + " → " + fmt(reducedCAC) + ")");
    }
    if (monthlyChurn > 0 && isFinite(ltv) && retentionMonths === 0) {
      const improvedLTV = netContribution / (monthlyChurn * 0.75);
      const newCAC = cac * 0.7;
      let line = "• 🚀 Best case (lower churn + lower CAC):  LTV " + fmt(improvedLTV) + "  |  Payback ";
      if (netContribution > 0) line += (newCAC / netContribution).toFixed(0) + " mo";
      else line += "N/A";
      out.push(line);
    }
    out.push("");
  }

  // Section 5: Lever Impact Ranking
  if (netContribution > 0 && isFinite(ltv)) {
    out.push("🏆 Lever Impact Ranking");
    let churnImpact = 0;
    let expImpact = 0;
    if (monthlyChurn > 0.01 && retentionMonths === 0) {
      const improvedChurn = monthlyChurn - 0.01;
      const improvedLifetime = 1 / improvedChurn;
      const improvedLTV = netContribution * improvedLifetime;
      churnImpact = improvedLTV - ltv;
      out.push("• Reduce churn 1%:     LTV " + fmt(ltv) + " → " + fmt(improvedLTV) + "  (+" + fmt(churnImpact) + ")");
    } else if (retentionMonths > 0) {
      out.push("• Reduce churn 1%:     N/A (using manual lifetime override)");
    }
    if (expansionRev > 0) {
      const improvedExp = expansionRev * 1.1;
      const improvedNC = revPerCust + improvedExp - costServe;
      const improvedLTV = improvedNC * avgLifetime;
      expImpact = improvedLTV - ltv;
      out.push("• +10% Expansion:      LTV " + fmt(ltv) + " → " + fmt(improvedLTV) + "  (+" + fmt(expImpact) + ")");
    } else {
      out.push("• +10% Expansion:      N/A (no expansion revenue set)");
    }
    if (churnImpact > expImpact && churnImpact > 0) {
      out.push("🥇 Top Lever: Reduce Churn (+" + fmt(churnImpact) + " LTV vs +" + fmt(expImpact) + " from expansion)");
    } else if (expImpact > churnImpact && expImpact > 0) {
      out.push("🥇 Top Lever: Grow Expansion (+" + fmt(expImpact) + " LTV vs +" + fmt(churnImpact) + " from churn)");
    } else if (churnImpact > 0 || expImpact > 0) {
      out.push("🥇 Both levers have equal impact (+" + fmt(churnImpact) + ")");
    }
    out.push("");
  }

  // 🩺 Unit Economics Health (v3)
  out.push("🩺 Unit Economics Health:");
  out.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  if (netContribution <= 0) {
    out.push("• 🔴 Negative net contribution — you're losing money on every customer. Either raise price or cut cost-to-serve.");
  } else if (netMargin < 30) {
    out.push("• 🟡 Net margin " + pct(netMargin) + " is below 30% SaaS benchmark. Aim for 70-80% gross margin.");
  } else if (netMargin < 60) {
    out.push("• 🟢 Healthy margin " + pct(netMargin) + ". Most SaaS targets 70-80% — room to grow.");
  } else {
    out.push("• 🟢 Excellent margin " + pct(netMargin) + ". Top-quartile SaaS efficiency.");
  }
  if (cac > 0) {
    if (isFinite(paybackMonths) && paybackMonths <= 12) {
      out.push("• 🟢 CAC payback " + paybackMonths.toFixed(1) + " months — under 1 year. Efficient growth.");
    } else if (isFinite(paybackMonths)) {
      out.push("• 🔴 CAC payback " + paybackMonths.toFixed(1) + " months — over 1 year. LTV/CAC ratio unhealthy.");
    }
  } else {
    out.push("• ℹ️ No CAC set — assuming organic/word-of-mouth growth.");
  }
  if (monthlyChurn > 0.05) {
    out.push("• 🔴 Monthly churn " + pct(churnRate) + " is high. Industry target: <3% for SMB SaaS, <1% for enterprise.");
  } else if (monthlyChurn > 0.03) {
    out.push("• 🟡 Monthly churn " + pct(churnRate) + " is above target. Aim for 2-3%.");
  } else {
    out.push("• 🟢 Monthly churn " + pct(churnRate) + " is healthy.");
  }
  if (isFinite(ltv) && cac > 0) {
    const ltvCacRatio = ltv / cac;
    if (ltvCacRatio >= 3) out.push("• 🟢 LTV:CAC ratio " + ltvCacRatio.toFixed(1) + ":1 — healthy (target 3:1+).");
    else if (ltvCacRatio >= 1) out.push("• 🟡 LTV:CAC ratio " + ltvCacRatio.toFixed(1) + ":1 — below target (3:1+). Improve before scaling spend.");
    else out.push("• 🔴 LTV:CAC ratio " + ltvCacRatio.toFixed(1) + ":1 — losing money per customer. Stop scaling spend.");
  }
  out.push("");

  // 🔄 What-If Scenarios (v3)
  out.push("🔄 What-If Scenarios:");
  out.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  if (netContribution > 0) {
    if (monthlyChurn > 0.01 && retentionMonths === 0) {
      const halveChurn = monthlyChurn * 0.5;
      const halveLTV = netContribution / halveChurn;
      out.push("• Cut churn in half (" + pct(churnRate) + " → " + pct(churnRate / 2) + "):  LTV " + fmt(ltv) + " → " + fmt(halveLTV) + "  (+" + fmt(halveLTV - ltv) + ")");
    }
    if (cac > 0) {
      const reduceCAC30 = cac * 0.7;
      const newPayback = reduceCAC30 / netContribution;
      out.push("• Reduce CAC by 30%:  Payback " + paybackMonths.toFixed(1) + " → " + newPayback.toFixed(1) + " mo  (CAC: " + fmt(cac) + " → " + fmt(reduceCAC30) + ")");
    }
    const raisePrice = revPerCust * 1.2 + expansionRev - costServe;
    out.push("• Raise price 20%:  Net contribution " + fmt(netContribution) + " → " + fmt(raisePrice) + "  (+" + fmt(raisePrice - netContribution) + "/mo)");
    if (expansionRev > 0) {
      const moreExp = revPerCust + expansionRev * 1.25 - costServe;
      out.push("• Grow expansion 25%:  Net " + fmt(netContribution) + " → " + fmt(moreExp) + "  (focus on upsells)");
    }
    out.push("• Double customers to " + Math.round(revPerCust * 2).toLocaleString() + " in MRR via same funnel: see Scaling Economics above");
  } else {
    out.push("• ⚠️ Cannot model — net contribution is negative. Raise price or cut cost-to-serve first.");
  }
  out.push("");

  return out;
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
    '📦 Unit Economics\n\n📋 Per-Customer Snapshot\n• Revenue / Customer:   $100/mo\n• Expansion Revenue:    $30/mo\n• Cost to Serve:        $30/mo\n• Net Contribution:     $100/mo  (76.9% margin)\n• Monthly Churn:        5.0%\n• Avg Customer Lifetime: 20 months\n• Customer LTV:         $2,000\n\n⏱️ CAC Payback\n• Cost to Acquire:      $300\n• Monthly Net Contribution: $100/mo\n• Payback Period:       3.0 months\n• Annual Profit:        $1,200 per customer\n• ✅ Excellent — you recover CAC in under 3 months. Invest more in growth!\n\n📊 Scaling Economics\n• 1,000 customers: $100,000/mo net  →  $1,200,000/yr  (acquire: $315,000)\n• 10,000 customers: $1,030,000/mo net  →  $12,360,000/yr  (cost -10%)  (acquire: $3,150,000)\n• 100,000 customers: $10,600,000/mo net  →  $127,200,000/yr  (cost -20%)  (acquire: $31,500,000)\n  ^ Economies of scale: 10% cost reduction per 10× customers\n\n🎯 Optimization Levers\n• Reduce churn 25%:  LTV $2,000 → $2,667  (+$667)\n• Raise price 20%:   Net $100/mo → $120/mo  |  Payback 3 → 3 mo\n• Reduce CAC 30%:    Payback 3 → 2 mo  (CAC: $300 → $210)\n• 🚀 Best case (lower churn + lower CAC):  LTV $2,667  |  Payback 2 mo\n\n🏆 Lever Impact Ranking\n• Reduce churn 1%:     LTV $2,000 → $2,500  (+$500)\n• +10% Expansion:      LTV $2,000 → $2,060  (+$60)\n🥇 Top Lever: Reduce Churn (+$500 LTV vs +$60 from expansion)\n\n🩺 Unit Economics Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 Excellent margin 76.9%. Top-quartile SaaS efficiency.\n• 🟢 CAC payback 3.0 months — under 1 year. Efficient growth.\n• 🟡 Monthly churn 5.0% is above target. Aim for 2-3%.\n• 🟢 LTV:CAC ratio 6.7:1 — healthy (target 3:1+).\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Cut churn in half (5.0% → 2.5%):  LTV $2,000 → $4,000  (+$2,000)\n• Reduce CAC by 30%:  Payback 3.0 → 2.1 mo  (CAC: $300 → $210)\n• Raise price 20%:  Net contribution $100 → $120  (+$20/mo)\n• Grow expansion 25%:  Net $100 → $108  (focus on upsells)\n• Double customers to 200 in MRR via same funnel: see Scaling Economics above\n',
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
