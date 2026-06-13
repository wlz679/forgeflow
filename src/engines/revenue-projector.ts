import type { ToolEngine } from "../core/engines/types";
import { registerEngine } from "../core/engines/registry";

function projectRevenue(inputs: Record<string, string>): string[] {
  const fmt = (n: number) => "$" + Math.round(n).toLocaleString();
  const pct = (n: number) => n.toFixed(1) + "%";
  const fmtM = (n: number) => { if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M"; if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K"; return "$" + Math.round(n).toLocaleString(); };
  const currentMRR = parseFloat(inputs.currentMRR) || 0;
  const growthRate = parseFloat(inputs.monthlyGrowthRate) || 0;
  const months = parseInt(inputs.months) || 12;
  const monthlyRate = growthRate / 100;
  const annualRate = (Math.pow(1 + monthlyRate, 12) - 1) * 100;
  const endMRR = currentMRR * Math.pow(1 + monthlyRate, months);
  let totalRevenue = 0; for (let m = 1; m <= months; m++) totalRevenue += currentMRR * Math.pow(1 + monthlyRate, m);
  const growthMultiple = currentMRR > 0 ? endMRR / currentMRR : 0;
  function monthsToMRR(t: number): number | null { if (currentMRR <= 0 || growthRate <= 0) return null; if (currentMRR >= t) return 0; return Math.ceil(Math.log(t / currentMRR) / Math.log(1 + monthlyRate)); }
  const targets = [10000, 50000, 100000].filter(t => t > currentMRR && t <= endMRR * 2);

  let result = "📈 Revenue Forecast\n\n📊 " + months + "-Month Projection\n";
  result += "• Starting MRR:        " + fmt(currentMRR) + "/mo\n• Projected MRR:       " + fmt(endMRR) + "/mo\n• ARR Equivalent:      " + fmt(endMRR * 12) + "/yr\n";
  result += "• Total Revenue:       " + fmt(totalRevenue) + " over " + months + " months\n• Growth Multiple:     " + growthMultiple.toFixed(1) + "×\n• Monthly Rate:        " + pct(growthRate) + "\n• Annualized Rate:     " + pct(annualRate) + "\n";

  result += "\n🗺️ MRR Milestones\n";
  const maxQ = Math.min(Math.floor(months / 3), 8);
  for (let q = 1; q <= maxQ; q++) { const mo = q * 3; const mrrAtQ = currentMRR * Math.pow(1 + monthlyRate, mo); result += "• Q" + q + " (Month " + mo + "):  " + fmt(mrrAtQ) + "/mo" + (q === maxQ ? " ← target" : "") + "\n"; }
  if (growthRate > 0 && currentMRR > 0) {
    let shown = false;
    for (const t of targets) { const mths = monthsToMRR(t); if (mths !== null && mths > 0 && mths <= months * 2) { shown = true; result += "• To " + (t >= 1e6 ? "$1M" : fmtM(t)) + " MRR:  " + mths + " months" + (mths > months ? " (beyond current projection)" : "") + "\n"; } }
    if (!shown) result += "• At " + pct(growthRate) + "/mo, major milestones are far out — consider boosting growth.\n";
  }

  if (currentMRR > 0) {
    result += "\n🔄 Growth Scenarios\n";
    const halfR = Math.max(1, Math.round(growthRate * 0.5)); const doubleR = Math.min(50, Math.round(growthRate * 2));
    const scs = [{ r: halfR, l: "Conservative" }, { r: growthRate, l: "Current Pace" }, { r: doubleR, l: "Ambitious" }]; const seen = new Set<number>();
    for (const sc of scs) { if (seen.has(sc.r)) continue; seen.add(sc.r); const scEnd = currentMRR * Math.pow(1 + sc.r / 100, months); let to100k: number | null = null; if (currentMRR > 0 && sc.r > 0) to100k = Math.ceil(Math.log(100000 / currentMRR) / Math.log(1 + sc.r / 100)); result += "• " + sc.l.padEnd(16) + "(" + pct(sc.r) + "/mo)  →  " + fmt(scEnd) + "/mo in " + months + " mo"; if (to100k !== null) result += "  |  $100K in " + to100k + " mo"; result += "\n"; }
  }

  result += "\n🎯 Strategy Guide\n";
  if (currentMRR < 1000) { result += "• Stage: Validation — you're pre-revenue or just starting.\n• Focus: Find product-market fit. Talk to customers, not spreadsheets.\n"; }
  else if (currentMRR < 10000) { result += "• Stage: Early traction — you have something people will pay for.\n• Focus: Double down on your top acquisition channel. Nail onboarding.\n"; }
  else if (currentMRR < 100000) { result += "• Stage: Scaling — you have a repeatable growth engine.\n• Focus: Build a team, systemize sales, reduce churn below 3%.\n"; }
  else { result += "• Stage: Growth — you're running a real business.\n• Focus: Expand to adjacent markets, raise prices, build moats.\n"; }
  if (growthRate >= 10) result += "• Pace: 🔥 Exceptional — sustain this by staying close to customers.\n";
  else if (growthRate >= 5) result += "• Pace: 🚀 Strong — compound interest is working hard for you.\n";
  else if (growthRate >= 2) result += "• Pace: 📈 Steady — small conversion gains compound over time.\n";
  else if (currentMRR > 0) result += "• Pace: 🐢 Slow — growth < 2%/mo. Add a second acquisition channel.\n";
  if (currentMRR < 50000 && growthRate > 0) { const m10 = monthsToMRR(10000); if (m10 !== null && m10 > 0) result += "• " + fmtM(10000) + " MRR is the first major milestone — on track in " + m10 + " months.\n"; }
  return [result];
}

const customFn =
  "function fmt(n){return '$'+Math.round(n).toLocaleString()}function pct(n){return n.toFixed(1)+'%'}function fmtM(n){if(n>=1e6)return '$'+(n/1e6).toFixed(2)+'M';if(n>=1e3)return '$'+(n/1e3).toFixed(1)+'K';return '$'+Math.round(n).toLocaleString()}" +
  "var mr=parseFloat(inputs.currentMRR)||0;var gr=parseFloat(inputs.monthlyGrowthRate)||0;var mo=parseInt(inputs.months)||12;var mrate=gr/100;var annRate=(Math.pow(1+mrate,12)-1)*100;var end=mr*Math.pow(1+mrate,mo);var total=0;for(var i=1;i<=mo;i++)total+=mr*Math.pow(1+mrate,i);var mult=mr>0?end/mr:0;" +
  "function mthsTo(t){if(mr<=0||gr<=0)return null;if(mr>=t)return 0;return Math.ceil(Math.log(t/mr)/Math.log(1+mrate))}" +
  "var r='📈 Revenue Forecast\\n\\n📊 '+mo+'-Month Projection\\n';r+='• Starting MRR:        '+fmt(mr)+'/mo\\n• Projected MRR:       '+fmt(end)+'/mo\\n• ARR Equivalent:      '+fmt(end*12)+'/yr\\n';r+='• Total Revenue:       '+fmt(total)+' over '+mo+' months\\n• Growth Multiple:     '+mult.toFixed(1)+'×\\n• Monthly Rate:        '+pct(gr)+'\\n• Annualized Rate:     '+pct(annRate)+'\\n';" +
  "r+='\\n🗺️ MRR Milestones\\n';var maxQ=Math.min(Math.floor(mo/3),8);for(var q=1;q<=maxQ;q++){var mnth=q*3;var mAt=mr*Math.pow(1+mrate,mnth);r+='• Q'+q+' (Month '+mnth+'):  '+fmt(mAt)+'/mo'+(q===maxQ?' ← target':'')+'\\n';}" +
  "if(gr>0&&mr>0){var tgts=[10000,50000,100000];var shown=false;for(var ti=0;ti<tgts.length;ti++){var tg=tgts[ti];if(tg<=mr||tg>end*2)continue;var mth=mthsTo(tg);if(mth!==null&&mth>0&&mth<=mo*2){shown=true;r+='• To '+(tg>=1e6?'$1M':fmtM(tg))+' MRR:  '+mth+' months'+(mth>mo?' (beyond current projection)':'')+'\\n';}}if(!shown)r+='• At '+pct(gr)+'/mo, major milestones are far out — consider boosting growth.\\n';}" +
  "if(mr>0){var halfR=Math.max(1,Math.round(gr*0.5));var doubleR=Math.min(50,Math.round(gr*2));var scs=[{r:halfR,l:'Conservative'},{r:gr,l:'Current Pace'},{r:doubleR,l:'Ambitious'}];var seen={};r+='\\n🔄 Growth Scenarios\\n';" +
  "for(var si=0;si<scs.length;si++){var sc=scs[si];if(seen[sc.r])continue;seen[sc.r]=true;var scEnd=mr*Math.pow(1+sc.r/100,mo);var to100k=null;if(mr>0&&sc.r>0)to100k=Math.ceil(Math.log(100000/mr)/Math.log(1+sc.r/100));r+='• '+sc.l;for(var pad=sc.l.length;pad<18;pad++)r+=' ';r+='('+pct(sc.r)+'/mo)  →  '+fmt(scEnd)+'/mo in '+mo+' mo';if(to100k!==null)r+='  |  $100K in '+to100k+' mo';r+='\\n';}}" +
  "r+='\\n🎯 Strategy Guide\\n';if(mr<1000){r+='• Stage: Validation — you\\'re pre-revenue or just starting.\\n• Focus: Find product-market fit. Talk to customers, not spreadsheets.\\n';}else if(mr<10000){r+='• Stage: Early traction — you have something people will pay for.\\n• Focus: Double down on your top acquisition channel. Nail onboarding.\\n';}else if(mr<100000){r+='• Stage: Scaling — you have a repeatable growth engine.\\n• Focus: Build a team, systemize sales, reduce churn below 3%.\\n';}else{r+='• Stage: Growth — you\\'re running a real business.\\n• Focus: Expand to adjacent markets, raise prices, build moats.\\n';}" +
  "if(gr>=10)r+='• Pace: 🔥 Exceptional — sustain this by staying close to customers.\\n';else if(gr>=5)r+='• Pace: 🚀 Strong — compound interest is working hard for you.\\n';else if(gr>=2)r+='• Pace: 📈 Steady — small conversion gains compound over time.\\n';else if(mr>0)r+='• Pace: 🐢 Slow — growth < 2%/mo. Add a second acquisition channel.\\n';" +
  "if(mr<50000&&gr>0){var m10=mthsTo(10000);if(m10!==null&&m10>0)r+='• '+fmtM(10000)+' MRR is the first major milestone — on track in '+m10+' months.\\n';}return [r];";

const engine: ToolEngine = {
  slug: "solopreneur-revenue-projector", title: "Revenue Projector",
  description: "Project your MRR growth with quarterly milestones, compare growth scenarios, and see how long until your next revenue target.",
  category: "C",
  inputs: [
    { name: "currentMRR", label: "Current MRR ($)", placeholder: "e.g. 2000", type: "number" },
    { name: "monthlyGrowthRate", label: "Monthly Growth Rate (%)", placeholder: "e.g. 5", type: "number" },
    { name: "months", label: "Projection Period", placeholder: "", type: "select", options: ["6", "12", "24"] },
  ],
  clientConfig: { type: "custom", wordPools: {}, customFn },
  generate(inputs: Record<string, string>): string[] { return projectRevenue(inputs); },
  staticExamples: [
    "📈 Revenue Forecast\n\n📊 12-Month Projection\n• Starting MRR:        $2,000/mo\n• Projected MRR:       $3,592/mo\n• ARR Equivalent:      $43,100/yr\n• Total Revenue:       $30,397 over 12 months\n• Growth Multiple:     1.8×\n• Monthly Rate:        5.0%\n• Annualized Rate:     79.6%\n\n🗺️ MRR Milestones\n• Q1 (Month 3):  $2,315/mo\n• Q2 (Month 6):  $2,680/mo\n• Q3 (Month 9):  $3,103/mo\n• Q4 (Month 12):  $3,592/mo ← target\n• To $10K MRR:  34 months (beyond current projection)\n\n🔄 Growth Scenarios\n• Conservative     (3.0%/mo)  →  $2,852/mo in 12 mo  |  $100K in 136 mo\n• Current Pace     (5.0%/mo)  →  $3,592/mo in 12 mo  |  $100K in 81 mo\n• Ambitious        (10.0%/mo)  →  $6,277/mo in 12 mo  |  $100K in 42 mo\n\n🎯 Strategy Guide\n• Stage: Early traction — you have something people will pay for.\n• Focus: Double down on your top acquisition channel. Nail onboarding.\n• Pace: 🚀 Strong — compound interest is working hard for you.\n• $10K MRR is the first major milestone — on track in 34 months.",
  ],
  faq: [
    { q: "What is a good monthly growth rate for a SaaS?", a: "For early-stage SaaS (under $10K MRR), 5-10% monthly is good. At $10K-$100K MRR, 3-5% is healthy. Above $100K MRR, 2-3% is normal." },
    { q: "How do I increase my monthly growth rate?", a: "Three levers: (1) More traffic — SEO, content marketing, paid ads. (2) Better conversion — improve your landing page, offer a free trial. (3) Less churn — nail onboarding, implement dunning for failed payments." },
    { q: "How accurate are long-term revenue projections?", a: "The farther out, the less accurate. 6-month projections are fairly reliable. 12-month projections are directional. 24-month projections are aspirational — use them for goal-setting, not budgeting." },
    { q: "What if my MRR fluctuates month to month?", a: "Use your 3-month average growth rate. Always plan with the conservative end of your range. If your growth is highly variable, focus first on making it predictable." },
    { q: "When should I shift focus from growth to profitability?", a: "When you have 6+ months of runway and predictable growth, start optimizing unit economics. If growth is under 3%/mo with a solid customer base, profitability-first often beats growth-at-all-costs." },
  ],
  howToUse: [
    "Enter your current Monthly Recurring Revenue (MRR).", "Enter your average monthly growth rate as a percentage.",
    "Select your projection period (6, 12, or 24 months).", "Check the Revenue Forecast for your end MRR and annualized rate.",
    "Review quarterly milestones to track your progress checkpoints.", "Compare the three growth scenarios — conservative, current, and ambitious.",
    "Read the Strategy Guide for stage-appropriate advice on what to focus on next.",
  ],
};
registerEngine(engine);
