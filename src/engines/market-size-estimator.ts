import type { ToolEngine } from "../core/engines/types";
import { registerEngine } from "../core/engines/registry";

function calculateMarketSize(inputs: Record<string, string>): string[] {
  const fmt = (n: number) => "$" + Math.round(n).toLocaleString();
  const fmtM = (n: number) => { if (Math.abs(n) >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B"; if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M"; return "$" + Math.round(n).toLocaleString(); };
  const pct = (n: number) => n.toFixed(1) + "%"; const loc = (n: number) => n.toLocaleString();
  const targetMarket = inputs.targetMarket || "your market";
  const totalCustomers = parseInt(inputs.totalAddressableCustomers) || 0;
  const annualRevPerCustomer = parseFloat(inputs.annualRevenuePerCustomer) || 0;
  const growthRate = parseFloat(inputs.marketGrowthRate) || 0;
  const tam = totalCustomers * annualRevPerCustomer; const growthFactor = 1 + growthRate / 100;

  let tiers: { rate: number; label: string }[];
  if (totalCustomers > 100000) tiers = [{ rate: 0.001, label: "🟢 Solopreneur" }, { rate: 0.005, label: "🟢 Solopreneur" }, { rate: 0.01, label: "🟡 Small team" }, { rate: 0.03, label: "🔴 VC-backed" }];
  else if (totalCustomers > 10000) tiers = [{ rate: 0.002, label: "🟢 Solopreneur" }, { rate: 0.01, label: "🟢 Solopreneur" }, { rate: 0.02, label: "🟡 Small team" }, { rate: 0.05, label: "🔴 VC-backed" }];
  else tiers = [{ rate: 0.005, label: "🟢 Solopreneur" }, { rate: 0.02, label: "🟢 Solopreneur" }, { rate: 0.05, label: "🟡 Small team" }, { rate: 0.1, label: "🔴 VC-backed" }];

  let result = "📊 Market Size: " + targetMarket + "\n\n📋 Market Overview\n";
  if (targetMarket) result += "• Market:            " + targetMarket + "\n";
  result += "• Addressable Customers: " + loc(totalCustomers) + "\n• Avg Revenue / Customer: " + fmt(annualRevPerCustomer) + "/yr\n• TAM (Total Addressable Market): " + fmtM(tam) + "/yr\n";
  if (tam > 0) result += "• SAM (Est. Reachable):   " + fmtM(tam * 0.25) + "/yr  (~25% of TAM — your realistic slice)\n";
  result += "• Annual Growth Rate: " + pct(growthRate) + "\n";
  if (growthRate > 0) { const y3 = tam * Math.pow(growthFactor, 3); const y5 = tam * Math.pow(growthFactor, 5); result += "• Market in 3 Years:  " + fmtM(y3) + "/yr (compounded)\n• Market in 5 Years:  " + fmtM(y5) + "/yr (compounded)\n"; }

  if (totalCustomers > 0 && annualRevPerCustomer > 0) { result += "\n💰 Revenue Potential\n"; for (const tier of tiers) { const cust = Math.round(totalCustomers * tier.rate); result += "• " + pct(tier.rate * 100) + " share  →  " + loc(cust) + " customers  →  " + fmtM(cust * annualRevPerCustomer) + "/yr  " + tier.label + "\n"; } }

  if (totalCustomers > 0 && annualRevPerCustomer > 0 && growthRate > 0) {
    const startRate = tiers[1].rate; const maxPen = totalCustomers > 100000 ? 0.05 : totalCustomers > 10000 ? 0.08 : 0.12;
    result += "\n📈 3-Year Growth Projection\n";
    for (let yr = 1; yr <= 3; yr++) { const marketYr = tam * Math.pow(growthFactor, yr); const raw = startRate * Math.pow(2, yr - 1); const yrRate = Math.min(raw, maxPen); result += "• Year " + yr + ": Market " + fmtM(marketYr) + "  →  Your " + pct(yrRate * 100) + "  =  " + fmtM(marketYr * yrRate) + "/yr" + (raw > maxPen ? " (capped)" : "") + "\n"; }
  }

  result += "\n🎯 Reality Check\n";
  if (tam >= 1e9) result += "• Huge market — you don't need a large share to build a great business.\n"; else if (tam >= 100e6) result += "• Solid market size — focus on dominating a specific niche within it.\n"; else if (tam > 0) result += "• Narrow market — you'll need high pricing or high penetration to thrive.\n";
  if (annualRevPerCustomer > 0 && annualRevPerCustomer < 500) result += "• Low price point — consider upselling, annual plans, or raising prices.\n"; else if (annualRevPerCustomer >= 500 && annualRevPerCustomer < 5000) result += "• Moderate price point — solid. Experiment with premium tiers or annual billing to raise ARPU.\n"; else if (annualRevPerCustomer >= 5000) result += "• Strong price point — high-value customers mean you need fewer of them.\n";

  if (totalCustomers > 0 && annualRevPerCustomer > 0) {
    const c100k = Math.ceil(100000 / annualRevPerCustomer); const p100k = totalCustomers > 0 ? (c100k / totalCustomers) * 100 : 0;
    result += "• To reach $100K/yr: Need " + c100k + " customers (" + pct(p100k) + " penetration).";
    if (p100k < 0.5) result += " ✅ Very achievable.\n"; else if (p100k < 2) result += " 🟡 A solid target.\n"; else result += " 🔴 Ambitious — validate demand first.\n";
    if (totalCustomers < 5000 && annualRevPerCustomer < 2000) result += "• ⚠️ Small pool + low pricing: reaching meaningful revenue will be hard. Consider a larger market, higher pricing, or a premium niche.\n";
    else if (totalCustomers < 5000 && p100k > 5) result += "• ⚠️ This market has few customers — you'll need to capture " + pct(p100k) + " to hit $100K. Make sure you can realistically dominate this niche.\n";
    else if (p100k > 10) result += "• ⚠️ You need over 10% market share to reach $100K. Either the market is very small or your pricing is too low — adjust one of them.\n";
  }
  return [result];
}

const customFn =
  "function fmt(n){return '$'+Math.round(n).toLocaleString()}function fmtM(n){if(Math.abs(n)>=1e9)return '$'+(n/1e9).toFixed(2)+'B';if(Math.abs(n)>=1e6)return '$'+(n/1e6).toFixed(1)+'M';return '$'+Math.round(n).toLocaleString()}function pct(n){return n.toFixed(1)+'%'}function loc(n){return n.toLocaleString()}" +
  "var tm=inputs.targetMarket||'your market';var tc=parseInt(inputs.totalAddressableCustomers)||0;var ar=parseFloat(inputs.annualRevenuePerCustomer)||0;var gr=parseFloat(inputs.marketGrowthRate)||0;var tam=tc*ar;var gf=1+gr/100;" +
  "var tiers=[];if(tc>100000)tiers=[{r:0.001,l:'🟢 Solopreneur'},{r:0.005,l:'🟢 Solopreneur'},{r:0.01,l:'🟡 Small team'},{r:0.03,l:'🔴 VC-backed'}];else if(tc>10000)tiers=[{r:0.002,l:'🟢 Solopreneur'},{r:0.01,l:'🟢 Solopreneur'},{r:0.02,l:'🟡 Small team'},{r:0.05,l:'🔴 VC-backed'}];else tiers=[{r:0.005,l:'🟢 Solopreneur'},{r:0.02,l:'🟢 Solopreneur'},{r:0.05,l:'🟡 Small team'},{r:0.1,l:'🔴 VC-backed'}];" +
  "var r='📊 Market Size: '+tm+'\\n\\n📋 Market Overview\\n';if(tm)r+='• Market:            '+tm+'\\n';r+='• Addressable Customers: '+loc(tc)+'\\n• Avg Revenue / Customer: '+fmt(ar)+'/yr\\n• TAM (Total Addressable Market): '+fmtM(tam)+'/yr\\n';if(tam>0)r+='• SAM (Est. Reachable):   '+fmtM(tam*0.25)+'/yr  (~25% of TAM — your realistic slice)\\n';r+='• Annual Growth Rate: '+pct(gr)+'\\n';" +
  "if(gr>0){var y3=tam*Math.pow(gf,3);var y5=tam*Math.pow(gf,5);r+='• Market in 3 Years:  '+fmtM(y3)+'/yr (compounded)\\n• Market in 5 Years:  '+fmtM(y5)+'/yr (compounded)\\n';}" +
  "if(tc>0&&ar>0){r+='\\n💰 Revenue Potential\\n';for(var i=0;i<tiers.length;i++){var tr=tiers[i];var cust=Math.round(tc*tr.r);r+='• '+pct(tr.r*100)+' share  →  '+loc(cust)+' customers  →  '+fmtM(cust*ar)+'/yr  '+tr.l+'\\n';}}" +
  "if(tc>0&&ar>0&&gr>0){var st=tiers[1].r;var mxP=tc>100000?0.05:tc>10000?0.08:0.12;r+='\\n📈 3-Year Growth Projection\\n';for(var yr=1;yr<=3;yr++){var my=tam*Math.pow(gf,yr);var raw=st*Math.pow(2,yr-1);var yrRate=Math.min(raw,mxP);r+='• Year '+yr+': Market '+fmtM(my)+'  →  Your '+pct(yrRate*100)+'  =  '+fmtM(my*yrRate)+'/yr'+(raw>mxP?' (capped)':'')+'\\n';}}" +
  "r+='\\n🎯 Reality Check\\n';if(tam>=1e9)r+='• Huge market — you don\\'t need a large share to build a great business.\\n';else if(tam>=100e6)r+='• Solid market size — focus on dominating a specific niche within it.\\n';else if(tam>0)r+='• Narrow market — you\\'ll need high pricing or high penetration to thrive.\\n';" +
  "if(ar>0&&ar<500)r+='• Low price point — consider upselling, annual plans, or raising prices.\\n';else if(ar>=500&&ar<5000)r+='• Moderate price point — solid. Experiment with premium tiers or annual billing to raise ARPU.\\n';else if(ar>=5000)r+='• Strong price point — high-value customers mean you need fewer of them.\\n';" +
  "if(tc>0&&ar>0){var c4=Math.ceil(100000/ar);var p4=tc>0?(c4/tc)*100:0;r+='• To reach $100K/yr: Need '+c4+' customers ('+pct(p4)+' penetration).';if(p4<0.5)r+=' ✅ Very achievable.\\n';else if(p4<2)r+=' 🟡 A solid target.\\n';else r+=' 🔴 Ambitious — validate demand first.\\n';" +
  "if(tc<5000&&ar<2000)r+='• ⚠️ Small pool + low pricing: reaching meaningful revenue will be hard. Consider a larger market, higher pricing, or a premium niche.\\n';else if(tc<5000&&p4>5)r+='• ⚠️ This market has few customers — you\\'ll need to capture '+pct(p4)+' to hit $100K. Make sure you can realistically dominate this niche.\\n';else if(p4>10)r+='• ⚠️ You need over 10% market share to reach $100K. Either the market is very small or your pricing is too low.\\n';}return [r];";

const engine: ToolEngine = {
  slug: "solopreneur-market-size-estimator", title: "Market Size Estimator",
  description: "Bottom-up market sizing: enter your target customers, pricing, and growth rate to estimate TAM, revenue potential, and what it takes to reach $100K.",
  category: "A",
  inputs: [
    { name: "targetMarket", label: "Target Market", placeholder: "e.g. US dental clinics", type: "text" },
    { name: "totalAddressableCustomers", label: "Total Addressable Customers", placeholder: "e.g. 30000", type: "number" },
    { name: "annualRevenuePerCustomer", label: "Avg Annual Revenue per Customer ($)", placeholder: "e.g. 5000", type: "number" },
    { name: "marketGrowthRate", label: "Market Annual Growth Rate (%)", placeholder: "e.g. 12", type: "number" },
  ],
  clientConfig: { type: "custom", wordPools: {}, customFn },
  generate(inputs: Record<string, string>): string[] { return calculateMarketSize(inputs); },
  staticExamples: [
    "📊 Market Size: US dental clinics\n\n📋 Market Overview\n• Market:            US dental clinics\n• Addressable Customers: 30,000\n• Avg Revenue / Customer: $5,000/yr\n• TAM (Total Addressable Market): $150.0M/yr\n• SAM (Est. Reachable):   $37.5M/yr  (~25% of TAM — your realistic slice)\n• Annual Growth Rate: 12.0%\n• Market in 3 Years:  $210.7M/yr (compounded)\n• Market in 5 Years:  $264.4M/yr (compounded)\n\n💰 Revenue Potential\n• 0.2% share  →  60 customers  →  $300.0K/yr  🟢 Solopreneur\n• 1.0% share  →  300 customers  →  $1.5M/yr  🟢 Solopreneur\n• 2.0% share  →  600 customers  →  $3.0M/yr  🟡 Small team\n• 5.0% share  →  1,500 customers  →  $7.5M/yr  🔴 VC-backed\n\n📈 3-Year Growth Projection\n• Year 1: Market $168.0M  →  Your 1.0%  =  $1.7M/yr\n• Year 2: Market $188.2M  →  Your 2.0%  =  $3.8M/yr\n• Year 3: Market $210.7M  →  Your 4.0%  =  $8.4M/yr\n\n🎯 Reality Check\n• Solid market size — focus on dominating a specific niche within it.\n• Strong price point — high-value customers mean you need fewer of them.\n• To reach $100K/yr: Need 20 customers (0.1% penetration). ✅ Very achievable.",
  ],
  faq: [
    { q: "What methodology does this calculator use?", a: "Bottom-up estimation: Total Addressable Customers × Average Revenue per Customer = TAM. This is the most practical method for solopreneurs because it ties directly to your business model." },
    { q: "What is the difference between TAM, SAM, and SOM?", a: "TAM is total global demand. SAM is the portion you can realistically reach. SOM is what you can capture near-term. The Revenue Potential section shows SOM at different penetration rates." },
    { q: "How do I find my total addressable customers number?", a: "Use Google + industry reports. For B2B: search 'how many [business type] in [country]'. Government census data, Statista, IBISWorld, and Gartner are good sources." },
    { q: "What is a good market size for a solopreneur?", a: "A $100M-$1B TAM with 10%+ growth is excellent. You only need 0.01-0.1% to reach $100K-$1M revenue. Markets under $50M can work with high pricing ($5K+/customer)." },
    { q: "How should I use the 3-year projection?", a: "Treat it as an upside scenario — it assumes your market share doubles each year. If Year 1 revenue doesn't cover expenses, you need a larger market or higher pricing." },
  ],
  howToUse: [
    "Describe your target market (e.g., 'US dental clinics', 'SaaS startups').", "Enter the total number of potential customers in your addressable market.",
    "Enter your expected average annual revenue per customer.", "Enter the industry's annual growth rate (find this from industry reports).",
    "Check the Market Overview for TAM and 3-5 year growth projections.", "Scan the Revenue Potential table to see what different penetration rates yield.",
    "Review the 3-Year Projection to see how compounding growth works in your favor.", "Read the Reality Check for a grounded assessment and your $100K target.",
  ],
};
registerEngine(engine);
