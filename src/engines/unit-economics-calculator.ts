import type { ToolEngine } from "../core/engines/types";
import { registerEngine } from "../core/engines/registry";

function calculateUnitEconomics(inputs: Record<string, string>): string[] {
  const fmt = (n: number) => "$" + Math.round(n).toLocaleString();
  const pct = (n: number) => n.toFixed(1) + "%";
  const fmtM = (n: number) => { if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M"; if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K"; return "$" + Math.round(n).toLocaleString(); };

  const revPerCust = parseFloat(inputs.averageRevenuePerCustomer) || 0;
  const costServe = parseFloat(inputs.costToServePerCustomer) || 0;
  const cac = parseFloat(inputs.customerAcquisitionCost) || 0;
  const churnRate = parseFloat(inputs.monthlyChurnRate) || 0;
  const monthlyChurn = churnRate / 100;

  const grossProfit = revPerCust - costServe;
  const grossMargin = revPerCust > 0 ? (grossProfit / revPerCust) * 100 : 0;
  const avgLifetime = monthlyChurn > 0 ? (1 / monthlyChurn) : Infinity;
  const ltv = monthlyChurn > 0 ? grossProfit / monthlyChurn : Infinity;
  const paybackMonths = grossProfit > 0 ? cac / grossProfit : Infinity;
  const annualProfitPerCust = grossProfit * 12;

  let result = "📦 Unit Economics\n\n";

  // Module 1: Unit Economics Snapshot
  result += "📋 Per-Customer Snapshot\n";
  result += "• Revenue / Customer:   " + fmt(revPerCust) + "/mo\n";
  result += "• Cost to Serve:        " + fmt(costServe) + "/mo\n";
  result += "• Gross Profit:         " + fmt(grossProfit) + "/mo  (" + pct(grossMargin) + " margin)\n";
  result += "• Monthly Churn:        " + pct(churnRate) + "\n";
  if (isFinite(avgLifetime)) result += "• Avg Customer Lifetime: " + avgLifetime.toFixed(0) + " months\n";
  else result += "• Avg Customer Lifetime: ∞  (zero churn — great!)\n";
  if (isFinite(ltv) && ltv > 0) result += "• Customer LTV:         " + fmt(ltv) + "\n";

  // Module 2: CAC Payback
  if (cac > 0 && grossProfit > 0) {
    result += "\n⏱️ CAC Payback\n";
    result += "• Cost to Acquire:      " + fmt(cac) + "\n";
    result += "• Monthly Gross Profit: " + fmt(grossProfit) + "/mo\n";
    result += "• Payback Period:       " + paybackMonths.toFixed(1) + " months\n";
    result += "• Annual Profit:        " + fmt(annualProfitPerCust) + " per customer\n";
    if (paybackMonths <= 3) result += "• ✅ Excellent — you recover CAC in under 3 months. Invest more in growth!\n";
    else if (paybackMonths <= 6) result += "• 🟢 Good — payback under 6 months. Healthy unit economics.\n";
    else if (paybackMonths <= 12) result += "• 🟡 OK — payback within a year. Room to optimize either CAC or pricing.\n";
    else if (isFinite(paybackMonths)) result += "• 🔴 Slow — over 12 months to recover CAC. Raise prices or reduce acquisition cost.\n";
  } else if (cac === 0 && grossProfit > 0) {
    result += "\n⏱️ CAC Payback\n• No acquisition cost — all revenue is pure growth.\n";
  }

  // Module 3: Scaling Economics
  if (grossProfit > 0) {
    result += "\n📊 Scaling Economics\n";
    const scales = [100, 1000, 10000];
    for (const n of scales) {
      const monthlyProfit = grossProfit * n;
      // Rough: cost to acquire N customers with churn offset
      const churnOffset = Math.round(n * monthlyChurn);
      const totalCAC = cac * (n + churnOffset);
      result += "• " + n.toLocaleString() + " customers: " + fmt(monthlyProfit) + "/mo gross  →  " + fmt(monthlyProfit * 12) + "/yr";
      if (cac > 0 && isFinite(totalCAC)) result += "  (acquire cost: " + fmt(totalCAC) + ")";
      result += "\n";
    }
  }

  // Module 4: Optimization Levers
  if (grossProfit > 0) {
    result += "\n🎯 Optimization Levers\n";

    // Reduce churn by 25%
    if (monthlyChurn > 0 && isFinite(ltv)) {
      const improvedChurn = monthlyChurn * 0.75;
      const improvedLTV = grossProfit / improvedChurn;
      result += "• Reduce churn 25%:  LTV " + fmt(ltv) + " → " + fmt(improvedLTV) + "  (+" + fmt(improvedLTV - ltv) + ")\n";
    }

    // Increase price by 20%
    const increasedRev = revPerCust * 1.2;
    const increasedProfit = increasedRev - costServe;
    if (increasedProfit > grossProfit) {
      result += "• Raise price 20%:   Profit " + fmt(grossProfit) + "/mo → " + fmt(increasedProfit) + "/mo";
      if (cac > 0 && grossProfit > 0) {
        const newPayback = cac / increasedProfit;
        result += "  |  Payback " + paybackMonths.toFixed(0) + " → " + newPayback.toFixed(0) + " mo";
      }
      result += "\n";
    }

    // Reduce CAC by 30%
    if (cac > 0 && grossProfit > 0) {
      const reducedCAC = cac * 0.7;
      const newPayback = reducedCAC / grossProfit;
      result += "• Reduce CAC 30%:    Payback " + paybackMonths.toFixed(0) + " → " + newPayback.toFixed(0) + " mo  (CAC: " + fmt(cac) + " → " + fmt(reducedCAC) + ")\n";
    }

    // Combined scenario
    if (monthlyChurn > 0 && isFinite(ltv)) {
      const improvedLTV = grossProfit / (monthlyChurn * 0.75);
      const newCAC = cac * 0.7;
      result += "• 🚀 Best case (lower churn + lower CAC):  LTV " + fmt(improvedLTV) + "  |  Payback ";
      if (grossProfit > 0) result += (newCAC / grossProfit).toFixed(0) + " mo\n";
      else result += "N/A\n";
    }
  }

  return [result];
}

const customFn =
  "function fmt(n){return '$'+Math.round(n).toLocaleString()}function pct(n){return n.toFixed(1)+'%'}function fmtM(n){if(n>=1e6)return '$'+(n/1e6).toFixed(2)+'M';if(n>=1e3)return '$'+(n/1e3).toFixed(1)+'K';return '$'+Math.round(n).toLocaleString()}" +
  "var rc=parseFloat(inputs.averageRevenuePerCustomer)||0;var cs=parseFloat(inputs.costToServePerCustomer)||0;var cac=parseFloat(inputs.customerAcquisitionCost)||0;var cr=parseFloat(inputs.monthlyChurnRate)||0;" +
  "var mc=cr/100;var gp=rc-cs;var gm=rc>0?(gp/rc)*100:0;var al=mc>0?(1/mc):Infinity;var ltv=mc>0?gp/mc:Infinity;var pm=gp>0?cac/gp:Infinity;var ap=gp*12;" +
  "var r='📦 Unit Economics\\n\\n📋 Per-Customer Snapshot\\n';r+='• Revenue / Customer:   '+fmt(rc)+'/mo\\n• Cost to Serve:        '+fmt(cs)+'/mo\\n• Gross Profit:         '+fmt(gp)+'/mo  ('+pct(gm)+' margin)\\n• Monthly Churn:        '+pct(cr)+'\\n';" +
  "if(isFinite(al))r+='• Avg Customer Lifetime: '+al.toFixed(0)+' months\\n';else r+='• Avg Customer Lifetime: ∞  (zero churn — great!)\\n';" +
  "if(isFinite(ltv)&&ltv>0)r+='• Customer LTV:         '+fmt(ltv)+'\\n';" +
  "if(cac>0&&gp>0){r+='\\n⏱️ CAC Payback\\n• Cost to Acquire:      '+fmt(cac)+'\\n• Monthly Gross Profit: '+fmt(gp)+'/mo\\n• Payback Period:       '+pm.toFixed(1)+' months\\n• Annual Profit:        '+fmt(ap)+' per customer\\n';" +
  "if(pm<=3)r+='• ✅ Excellent — recover CAC in under 3 months.\\n';else if(pm<=6)r+='• 🟢 Good — payback under 6 months.\\n';else if(pm<=12)r+='• 🟡 OK — payback within a year.\\n';else if(isFinite(pm))r+='• 🔴 Slow — over 12 months to recover CAC.\\n';}" +
  "else if(cac===0&&gp>0){r+='\\n⏱️ CAC Payback\\n• No acquisition cost — all revenue is pure growth.\\n';}" +
  "if(gp>0){r+='\\n📊 Scaling Economics\\n';var sc=[100,1000,10000];for(var i=0;i<sc.length;i++){var n=sc[i];var mpr=gp*n;var ch=Math.round(n*mc);var tc=cac*(n+ch);r+='• '+n.toLocaleString()+' customers: '+fmt(mpr)+'/mo gross  →  '+fmt(mpr*12)+'/yr';if(cac>0&&isFinite(tc))r+='  (acquire cost: '+fmt(tc)+')';r+='\\n';}}" +
  "if(gp>0){r+='\\n🎯 Optimization Levers\\n';" +
  "if(mc>0&&isFinite(ltv)){var ic=mc*0.75;var il=gp/ic;r+='• Reduce churn 25%:  LTV '+fmt(ltv)+' → '+fmt(il)+'  (+'+fmt(il-ltv)+')\\n';}" +
  "var ir=rc*1.2;var ip=ir-cs;if(ip>gp){r+='• Raise price 20%:   Profit '+fmt(gp)+'/mo → '+fmt(ip)+'/mo';if(cac>0&&gp>0){var np2=cac/ip;r+='  |  Payback '+pm.toFixed(0)+' → '+np2.toFixed(0)+' mo';}r+='\\n';}" +
  "if(cac>0&&gp>0){var rcac=cac*0.7;var np3=rcac/gp;r+='• Reduce CAC 30%:    Payback '+pm.toFixed(0)+' → '+np3.toFixed(0)+' mo  (CAC: '+fmt(cac)+' → '+fmt(rcac)+')\\n';}" +
  "if(mc>0&&isFinite(ltv)){var il2=gp/(mc*0.75);var nc2=cac*0.7;r+='• 🚀 Best case (lower churn + lower CAC):  LTV '+fmt(il2)+'  |  Payback ';if(gp>0)r+=(nc2/gp).toFixed(0)+' mo\\n';}}" +
  "return [r];";

const engine: ToolEngine = {
  slug: "solopreneur-unit-economics-calculator",
  title: "Unit Economics Calculator",
  description: "Analyze per-customer profitability: gross margin, CAC payback, LTV, and how to optimize your unit economics.",
  category: "C",
  inputs: [
    { name: "averageRevenuePerCustomer", label: "Avg Monthly Revenue per Customer ($)", placeholder: "e.g. 50", type: "number" },
    { name: "costToServePerCustomer", label: "Monthly Cost to Serve per Customer ($)", placeholder: "e.g. 10", type: "number" },
    { name: "customerAcquisitionCost", label: "Customer Acquisition Cost ($)", placeholder: "e.g. 200", type: "number" },
    { name: "monthlyChurnRate", label: "Monthly Churn Rate (%)", placeholder: "e.g. 3", type: "number" },
  ],
  clientConfig: { type: "custom", wordPools: {}, customFn },
  generate(inputs: Record<string, string>): string[] { return calculateUnitEconomics(inputs); },
  staticExamples: [
    "📦 Unit Economics\n\n📋 Per-Customer Snapshot\n• Revenue / Customer:   $50/mo\n• Cost to Serve:        $10/mo\n• Gross Profit:         $40/mo  (80.0% margin)\n• Monthly Churn:        3.0%\n• Avg Customer Lifetime: 33 months\n• Customer LTV:         $1,333\n\n⏱️ CAC Payback\n• Cost to Acquire:      $200\n• Monthly Gross Profit: $40/mo\n• Payback Period:       5.0 months\n• Annual Profit:        $480 per customer\n• 🟢 Good — payback under 6 months. Healthy unit economics.\n\n📊 Scaling Economics\n• 100 customers: $4,000/mo gross  →  $48,000/yr  (acquire cost: $20,600)\n• 1,000 customers: $40,000/mo gross  →  $480,000/yr  (acquire cost: $206,000)\n• 10,000 customers: $400,000/mo gross  →  $4,800,000/yr  (acquire cost: $2,060,000)\n\n🎯 Optimization Levers\n• Reduce churn 25%:  LTV $1,333 → $1,778  (+$444)\n• Raise price 20%:   Profit $40/mo → $50/mo  |  Payback 5 → 4 mo\n• Reduce CAC 30%:    Payback 5 → 4 mo  (CAC: $200 → $140)\n• 🚀 Best case (lower churn + lower CAC):  LTV $1,778  |  Payback 4 mo",
  ],
  faq: [
    { q: "What is unit economics?", a: "Unit economics breaks down your business to the per-customer level: how much revenue each customer generates, what it costs to serve them, and how much you spend to acquire them. Positive unit economics means each customer is profitable on their own — the foundation of a sustainable business." },
    { q: "What is a good gross margin?", a: "For SaaS, 70-90% gross margin is typical (low cost to serve). For e-commerce, 40-60% is common. For services/agencies, 20-40%. If your gross margin is under 50%, look for ways to automate support, reduce hosting costs, or raise prices." },
    { q: "What is a good CAC payback period?", a: "Under 6 months is healthy, under 3 months is excellent. Over 12 months means you need a lot of capital to grow — and you are betting on customers sticking around long enough to become profitable. Most SaaS investors want to see payback under 12 months." },
    { q: "How does churn affect unit economics?", a: "Churn caps your LTV. Even with great margins, if customers leave after 5 months and it takes 6 months to recover CAC, you lose money on every customer. This calculator shows exactly how much extra LTV you gain by reducing churn by just 25%." },
    { q: "Should I raise prices or reduce costs?", a: "Raising prices has the biggest leverage. A 20% price increase flows directly to gross profit with zero extra work. But it only works if your value supports it. Reducing cost-to-serve (automation, better infra) compounds with scale. Doing both is ideal — see the Optimization Levers section." },
  ],
  howToUse: [
    "Enter your average monthly revenue per customer.",
    "Enter your monthly cost to serve one customer (hosting, support, API costs).",
    "Enter your Customer Acquisition Cost (total sales & marketing spend ÷ new customers).",
    "Enter your monthly churn rate as a percentage.",
    "Check the Per-Customer Snapshot for gross profit, margin, and LTV.",
    "Review CAC Payback to see how quickly you recover acquisition costs.",
    "Scan Scaling Economics to see how unit profit scales with customer count.",
    "Read Optimization Levers to see how small improvements compound.",
  ],
};
registerEngine(engine);
