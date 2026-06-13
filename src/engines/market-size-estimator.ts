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
  const samPercent = parseFloat(inputs.samPercent) || 25;
  const marketStage = inputs.marketStage || "Growing";
  const tam = totalCustomers * annualRevPerCustomer;
  const growthFactor = 1 + growthRate / 100;

  // Market stage adjustments
  const stageGrowthAdj: Record<string, number> = { Emerging: 1.5, Growing: 1.0, Mature: 0.7, Declining: 0.4 };
  const stageAdj = stageGrowthAdj[marketStage] || 1.0;

  let tiers: { rate: number; label: string }[];
  if (totalCustomers > 100000) tiers = [{ rate: 0.001, label: "🟢 Solopreneur" }, { rate: 0.005, label: "🟢 Solopreneur" }, { rate: 0.01, label: "🟡 Small team" }, { rate: 0.03, label: "🔴 VC-backed" }];
  else if (totalCustomers > 10000) tiers = [{ rate: 0.002, label: "🟢 Solopreneur" }, { rate: 0.01, label: "🟢 Solopreneur" }, { rate: 0.02, label: "🟡 Small team" }, { rate: 0.05, label: "🔴 VC-backed" }];
  else tiers = [{ rate: 0.005, label: "🟢 Solopreneur" }, { rate: 0.02, label: "🟢 Solopreneur" }, { rate: 0.05, label: "🟡 Small team" }, { rate: 0.1, label: "🔴 VC-backed" }];

  let result = "📊 Market Size: " + targetMarket + "\n\n📋 Market Overview\n";
  if (targetMarket) result += "• Market:            " + targetMarket + "\n";
  result += "• Market Stage:      " + marketStage + "\n";
  result += "• Addressable Customers: " + loc(totalCustomers) + "\n• Avg Revenue / Customer: " + fmt(annualRevPerCustomer) + "/yr\n• TAM (Total Addressable Market): " + fmtM(tam) + "/yr\n";
  // SAM = configurable % of TAM
  if (tam > 0) result += "• SAM (Serviceable): " + fmtM(tam * samPercent / 100) + "/yr  (~" + pct(samPercent) + " of TAM)\n";
  result += "• Annual Growth Rate: " + pct(growthRate) + "\n";
  if (growthRate > 0) {
    const y3 = tam * Math.pow(growthFactor, 3);
    const y5 = tam * Math.pow(growthFactor, 5);
    result += "• Market in 3 Years:  " + fmtM(y3) + "/yr (compounded)\n• Market in 5 Years:  " + fmtM(y5) + "/yr (compounded)\n";
  }

  // Bottom-up revenue potential
  if (totalCustomers > 0 && annualRevPerCustomer > 0) {
    result += "\n💰 Bottom-Up Revenue Potential\n";
    for (const tier of tiers) {
      const cust = Math.round(totalCustomers * tier.rate);
      result += "• " + pct(tier.rate * 100) + " share  →  " + loc(cust) + " customers  →  " + fmtM(cust * annualRevPerCustomer) + "/yr  " + tier.label + "\n";
    }
    // Top-down cross-check
    result += "\n🔄 Top-Down Cross-Check\n";
    const tdRates = [0.001, 0.005, 0.01, 0.03];
    for (const r of tdRates) {
      const rev = tam * r * stageAdj;
      result += "• " + pct(r * 100) + " of TAM  →  " + fmtM(rev) + "/yr";
      if (stageAdj !== 1.0) result += "  (stage-adjusted)";
      result += "\n";
    }
  }

  // 3-year projection
  if (totalCustomers > 0 && annualRevPerCustomer > 0 && growthRate > 0) {
    const startRate = tiers[1].rate;
    const maxPen = totalCustomers > 100000 ? 0.05 : totalCustomers > 10000 ? 0.08 : 0.12;
    result += "\n📈 3-Year Growth Projection\n";
    for (let yr = 1; yr <= 3; yr++) {
      const marketYr = tam * Math.pow(growthFactor, yr);
      const raw = startRate * Math.pow(2, yr - 1);
      const yrRate = Math.min(raw, maxPen);
      result += "• Year " + yr + ": Market " + fmtM(marketYr) + "  →  Your " + pct(yrRate * 100) + "  =  " + fmtM(marketYr * yrRate) + "/yr" + (raw > maxPen ? " (capped)" : "") + "\n";
    }
  }

  // Reality check
  result += "\n🎯 Reality Check\n";
  if (tam >= 1e9) result += "• Huge market — you don't need a large share to build a great business.\n";
  else if (tam >= 100e6) result += "• Solid market size — focus on dominating a specific niche within it.\n";
  else if (tam > 0) result += "• Narrow market — you'll need high pricing or high penetration to thrive.\n";

  if (marketStage === "Emerging") result += "• Emerging market: high risk, high reward. First-mover advantage possible.\n";
  else if (marketStage === "Growing") result += "• Growing market: sweet spot for entry. Ride the tailwind.\n";
  else if (marketStage === "Mature") result += "• Mature market: differentiate or compete on price. Harder to stand out.\n";
  else result += "• Declining market: pivot to a growing adjacent segment or premium niche.\n";

  if (annualRevPerCustomer > 0 && annualRevPerCustomer < 500) result += "• Low price point — consider upselling, annual plans, or raising prices.\n";
  else if (annualRevPerCustomer >= 500 && annualRevPerCustomer < 5000) result += "• Moderate price point — solid. Experiment with premium tiers or annual billing.\n";
  else if (annualRevPerCustomer >= 5000) result += "• Strong price point — high-value customers mean you need fewer of them.\n";

  if (totalCustomers > 0 && annualRevPerCustomer > 0) {
    const c100k = Math.ceil(100000 / annualRevPerCustomer);
    const p100k = totalCustomers > 0 ? (c100k / totalCustomers) * 100 : 0;
    result += "• To reach $100K/yr: Need " + c100k + " customers (" + pct(p100k) + " penetration).";
    if (p100k < 0.5) result += " ✅ Very achievable.\n";
    else if (p100k < 2) result += " 🟡 A solid target.\n";
    else result += " 🔴 Ambitious — validate demand first.\n";
    if (totalCustomers < 5000 && annualRevPerCustomer < 2000) result += "• ⚠️ Small pool + low pricing: reaching meaningful revenue will be hard. Consider a larger market, higher pricing, or a premium niche.\n";
    else if (totalCustomers < 5000 && p100k > 5) result += "• ⚠️ This market has few customers — you'll need to capture " + pct(p100k) + " to hit $100K.\n";
    else if (p100k > 10) result += "• ⚠️ You need over 10% market share to reach $100K. Either the market is very small or your pricing is too low — adjust one of them.\n";
  }
  return [result];
}

const customFn =
  "function fmt(n){return '$'+Math.round(n).toLocaleString()}function fmtM(n){if(Math.abs(n)>=1e9)return '$'+(n/1e9).toFixed(2)+'B';if(Math.abs(n)>=1e6)return '$'+(n/1e6).toFixed(1)+'M';return '$'+Math.round(n).toLocaleString()}function pct(n){return n.toFixed(1)+'%'}function loc(n){return n.toLocaleString()}" +
  "var tm=inputs.targetMarket||'your market';var tc=parseInt(inputs.totalAddressableCustomers)||0;var ar=parseFloat(inputs.annualRevenuePerCustomer)||0;var gr=parseFloat(inputs.marketGrowthRate)||0;var sp=parseFloat(inputs.samPercent)||25;var ms=inputs.marketStage||'Growing';var tam=tc*ar;var gf=1+gr/100;" +
  "var sa={};sa['Emerging']=1.5;sa['Growing']=1.0;sa['Mature']=0.7;sa['Declining']=0.4;var sadj=sa[ms]||1.0;" +
  "var tiers=[];if(tc>100000)tiers=[{r:0.001,l:'\\uD83D\\uDFE2 Solopreneur'},{r:0.005,l:'\\uD83D\\uDFE2 Solopreneur'},{r:0.01,l:'\\uD83D\\uDFE1 Small team'},{r:0.03,l:'\\uD83D\\uDD34 VC-backed'}];else if(tc>10000)tiers=[{r:0.002,l:'\\uD83D\\uDFE2 Solopreneur'},{r:0.01,l:'\\uD83D\\uDFE2 Solopreneur'},{r:0.02,l:'\\uD83D\\uDFE1 Small team'},{r:0.05,l:'\\uD83D\\uDD34 VC-backed'}];else tiers=[{r:0.005,l:'\\uD83D\\uDFE2 Solopreneur'},{r:0.02,l:'\\uD83D\\uDFE2 Solopreneur'},{r:0.05,l:'\\uD83D\\uDFE1 Small team'},{r:0.1,l:'\\uD83D\\uDD34 VC-backed'}];" +
  "var r='\\uD83D\\uDCCA Market Size: '+tm+'\\n\\n\\uD83D\\uDCCB Market Overview\\n';if(tm)r+='\\u2022 Market:            '+tm+'\\n';r+='\\u2022 Market Stage:      '+ms+'\\n';r+='\\u2022 Addressable Customers: '+loc(tc)+'\\n\\u2022 Avg Revenue / Customer: '+fmt(ar)+'/yr\\n\\u2022 TAM (Total Addressable Market): '+fmtM(tam)+'/yr\\n';if(tam>0)r+='\\u2022 SAM (Serviceable): '+fmtM(tam*sp/100)+'/yr  (~'+pct(sp)+' of TAM)\\n';r+='\\u2022 Annual Growth Rate: '+pct(gr)+'\\n';" +
  "if(gr>0){var y3=tam*Math.pow(gf,3);var y5=tam*Math.pow(gf,5);r+='\\u2022 Market in 3 Years:  '+fmtM(y3)+'/yr (compounded)\\n\\u2022 Market in 5 Years:  '+fmtM(y5)+'/yr (compounded)\\n';}" +
  "if(tc>0&&ar>0){r+='\\n\\uD83D\\uDCB0 Bottom-Up Revenue Potential\\n';for(var i=0;i<tiers.length;i++){var tr=tiers[i];var cust=Math.round(tc*tr.r);r+='\\u2022 '+pct(tr.r*100)+' share  \\u2192  '+loc(cust)+' customers  \\u2192  '+fmtM(cust*ar)+'/yr  '+tr.l+'\\n';}" +
  "r+='\\n\\uD83D\\uDD04 Top-Down Cross-Check\\n';var tdR=[0.001,0.005,0.01,0.03];for(var ti=0;ti<tdR.length;ti++){var rev=tam*tdR[ti]*sadj;r+='\\u2022 '+pct(tdR[ti]*100)+' of TAM  \\u2192  '+fmtM(rev)+'/yr';if(sadj!==1.0)r+='  (stage-adjusted)';r+='\\n';}}" +
  "if(tc>0&&ar>0&&gr>0){var st=tiers[1].r;var mxP=tc>100000?0.05:tc>10000?0.08:0.12;r+='\\n\\uD83D\\uDCC8 3-Year Growth Projection\\n';for(var yr=1;yr<=3;yr++){var my=tam*Math.pow(gf,yr);var raw=st*Math.pow(2,yr-1);var yrRate=Math.min(raw,mxP);r+='\\u2022 Year '+yr+': Market '+fmtM(my)+'  \\u2192  Your '+pct(yrRate*100)+'  =  '+fmtM(my*yrRate)+'/yr'+(raw>mxP?' (capped)':'')+'\\n';}}" +
  "r+='\\n\\uD83C\\uDFAF Reality Check\\n';if(tam>=1e9)r+='\\u2022 Huge market \\u2014 you don\\'t need a large share to build a great business.\\n';else if(tam>=100e6)r+='\\u2022 Solid market size \\u2014 focus on dominating a specific niche within it.\\n';else if(tam>0)r+='\\u2022 Narrow market \\u2014 you\\'ll need high pricing or high penetration to thrive.\\n';" +
  "if(ms==='Emerging')r+='\\u2022 Emerging market: high risk, high reward. First-mover advantage possible.\\n';else if(ms==='Growing')r+='\\u2022 Growing market: sweet spot for entry. Ride the tailwind.\\n';else if(ms==='Mature')r+='\\u2022 Mature market: differentiate or compete on price. Harder to stand out.\\n';else r+='\\u2022 Declining market: pivot to a growing adjacent segment or premium niche.\\n';" +
  "if(ar>0&&ar<500)r+='\\u2022 Low price point \\u2014 consider upselling, annual plans, or raising prices.\\n';else if(ar>=500&&ar<5000)r+='\\u2022 Moderate price point \\u2014 solid. Experiment with premium tiers or annual billing.\\n';else if(ar>=5000)r+='\\u2022 Strong price point \\u2014 high-value customers mean you need fewer of them.\\n';" +
  "if(tc>0&&ar>0){var c4=Math.ceil(100000/ar);var p4=tc>0?(c4/tc)*100:0;r+='\\u2022 To reach $100K/yr: Need '+c4+' customers ('+pct(p4)+' penetration).';if(p4<0.5)r+=' \\u2705 Very achievable.\\n';else if(p4<2)r+=' \\uD83D\\uDFE1 A solid target.\\n';else r+=' \\uD83D\\uDD34 Ambitious \\u2014 validate demand first.\\n';" +
  "if(tc<5000&&ar<2000)r+='\\u2022 \\u26A0\\uFE0F Small pool + low pricing: reaching meaningful revenue will be hard.\\n';else if(tc<5000&&p4>5)r+='\\u2022 \\u26A0\\uFE0F This market has few customers \\u2014 you\\'ll need to capture '+pct(p4)+' to hit $100K.\\n';else if(p4>10)r+='\\u2022 \\u26A0\\uFE0F You need over 10% market share to reach $100K. Either the market is very small or your pricing is too low.\\n';}return [r];";

const engine: ToolEngine = {
  slug: "solopreneur-market-size-estimator", title: "Market Size Estimator",
  description: "Bottom-up and top-down market sizing with configurable SAM, market stage, and 3-year revenue projection. Industry-standard TAM/SAM/SOM framework.",
  category: "A",
  inputs: [
    { name: "targetMarket", label: "Target Market", placeholder: "e.g. US dental clinics", type: "text" },
    { name: "totalAddressableCustomers", label: "Total Addressable Customers", placeholder: "e.g. 30000", type: "number" },
    { name: "annualRevenuePerCustomer", label: "Avg Annual Revenue per Customer ($)", placeholder: "e.g. 5000", type: "number" },
    { name: "marketGrowthRate", label: "Market Annual Growth Rate (%)", placeholder: "e.g. 12", type: "number" },
    { name: "samPercent", label: "SAM — % of TAM You Can Reach", placeholder: "e.g. 25", type: "number" },
    { name: "marketStage", label: "Market Stage", placeholder: "", type: "select", options: ["Emerging", "Growing", "Mature", "Declining"] },
  ],
  clientConfig: { type: "custom", wordPools: {}, customFn },
  generate(inputs: Record<string, string>): string[] { return calculateMarketSize(inputs); },
  staticExamples: [
    "📊 Market Size: US dental clinics\n\n📋 Market Overview\n• Market:            US dental clinics\n• Market Stage:      Growing\n• Addressable Customers: 30,000\n• Avg Revenue / Customer: $5,000/yr\n• TAM (Total Addressable Market): $150.0M/yr\n• SAM (Serviceable): $37.5M/yr  (~25.0% of TAM)\n• Annual Growth Rate: 12.0%\n• Market in 3 Years:  $210.7M/yr (compounded)\n• Market in 5 Years:  $264.4M/yr (compounded)\n\n💰 Bottom-Up Revenue Potential\n• 0.2% share  →  60 customers  →  $300.0K/yr  🟢 Solopreneur\n• 1.0% share  →  300 customers  →  $1.5M/yr  🟢 Solopreneur\n• 2.0% share  →  600 customers  →  $3.0M/yr  🟡 Small team\n• 5.0% share  →  1,500 customers  →  $7.5M/yr  🔴 VC-backed\n\n🔄 Top-Down Cross-Check\n• 0.1% of TAM  →  $150.0K/yr\n• 0.5% of TAM  →  $750.0K/yr\n• 1.0% of TAM  →  $1.5M/yr\n• 3.0% of TAM  →  $4.5M/yr\n\n📈 3-Year Growth Projection\n• Year 1: Market $168.0M  →  Your 1.0%  =  $1.7M/yr\n• Year 2: Market $188.2M  →  Your 2.0%  =  $3.8M/yr\n• Year 3: Market $210.7M  →  Your 4.0%  =  $8.4M/yr\n\n🎯 Reality Check\n• Solid market size — focus on dominating a specific niche within it.\n• Growing market: sweet spot for entry. Ride the tailwind.\n• Strong price point — high-value customers mean you need fewer of them.\n• To reach $100K/yr: Need 20 customers (0.1% penetration). ✅ Very achievable.",
  ],
  faq: [
    { q: "What methodology does this calculator use?", a: "Both bottom-up (customers × revenue per customer) and top-down (market share of TAM). Industry best practice is to use both methods and see if they converge — if they don't, one of your assumptions is off." },
    { q: "What is the difference between TAM, SAM, and SOM?", a: "TAM = total global demand. SAM = the portion you can realistically reach (configurable in this calculator). SOM = what you can capture near-term (shown in the penetration tiers). Together they form the standard market sizing framework." },
    { q: "How do I find my total addressable customers number?", a: "For B2B: search 'how many [business type] in [country]'. Government census data, Statista, IBISWorld, and Gartner are good sources. For B2C: use population demographics × your target %. When in doubt, use the lower end." },
    { q: "What market stage should I select?", a: "Emerging = new, high-growth, few competitors (AI tools, VR). Growing = expanding rapidly, competitors entering (SaaS, EVs). Mature = stable, well-defined (dental clinics, accounting software). Declining = shrinking demand (physical media, legacy software). This affects the reality check advice." },
    { q: "What is a good market size for a solopreneur?", a: "A $100M-$1B TAM with 10%+ growth in a growing market is excellent. You only need 0.01-0.1% to reach $100K-$1M revenue. Markets under $50M can work with high pricing ($5K+/customer). The top-down cross-check helps validate your bottom-up numbers." },
  ],
  howToUse: [
    "Describe your target market (e.g., 'US dental clinics', 'SaaS startups').",
    "Enter the total number of potential customers in your addressable market.",
    "Enter your expected average annual revenue per customer.",
    "Enter the industry's annual growth rate (find from industry reports).",
    "Set your SAM % — what portion of TAM you can realistically reach.",
    "Select the market stage (Emerging/Growing/Mature/Declining).",
    "Compare bottom-up revenue potential vs top-down cross-check.",
    "Review the 3-year projection and reality check for your $100K target.",
  ],
};
registerEngine(engine);
