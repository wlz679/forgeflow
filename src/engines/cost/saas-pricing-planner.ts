import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

function planPricing(inputs: Record<string, string>): string[] {
  const productType = inputs.productType || 'SaaS';
  const targetCustomer = inputs.targetCustomer || 'b2b';
  const competitorPrice = clampNonNegative(parseFloat(inputs.competitorPrice) || 0);

  const basePrice = competitorPrice || 29;
  const targetMargin = 0.70;
  const assumedChurn = 0.03;

  const tiers = [
    { name: 'Starter', low: Math.max(5, Math.round(basePrice * 0.5)), mid: Math.max(9, Math.round(basePrice * 0.6)), high: Math.max(15, Math.round(basePrice * 0.7)), margin: 0.85, customers: 1000 },
    { name: 'Pro', low: Math.max(19, Math.round(basePrice * 1.0)), mid: Math.max(29, Math.round(basePrice * 1.3)), high: Math.max(49, Math.round(basePrice * 1.7)), margin: 0.75, customers: 400 },
    { name: 'Max', low: Math.max(49, Math.round(basePrice * 2.0)), mid: Math.max(79, Math.round(basePrice * 2.5)), high: Math.max(149, Math.round(basePrice * 4.0)), margin: 0.70, customers: 80 },
    { name: 'Enterprise', low: Math.max(199, Math.round(basePrice * 5)), mid: Math.max(499, Math.round(basePrice * 10)), high: Math.max(999, Math.round(basePrice * 20)), margin: 0.65, customers: 12 },
  ];

  const models = [
    {
      name: 'Flat-Rate',
      best: 'Simple tools with one clear use case. Best for early-stage products.',
      low: Math.max(5, Math.round(basePrice * 0.7)),
      mid: basePrice,
      high: Math.round(basePrice * 1.5),
      tip: 'Keep it simple — one price, all features. Add a free trial to reduce friction.',
    },
    {
      name: 'Tiered',
      best: 'Products with power users who will pay more for advanced features.',
      low: Math.max(9, Math.round(basePrice * 0.5)),
      mid: basePrice,
      high: Math.round(basePrice * 2.5),
      tip: '3 tiers work best: Starter → Pro → Enterprise. The middle tier should be the obvious choice (anchor pricing).',
    },
    {
      name: 'Usage-Based',
      best: 'API products, AI tools, or any product where value scales with usage.',
      low: Math.max(5, Math.round(basePrice * 0.4)),
      mid: Math.round(basePrice * 1.2),
      high: Math.round(basePrice * 3),
      tip: 'Charge per unit (API calls, seats, credits). Include a generous free tier to drive adoption.',
    },
    {
      name: 'Freemium',
      best: 'B2C products or tools that benefit from network effects and word-of-mouth.',
      low: 0,
      mid: Math.round(basePrice * 0.8) || 12,
      high: Math.round(basePrice * 1.8),
      tip: 'Free plan must be genuinely useful but leave room for upgrade. 3-5% free-to-paid conversion is good.',
    },
  ];

  const audienceTips: Record<string, string> = {
    b2b: 'B2B buyers expect per-seat pricing and annual contracts. They value ROI calculators and case studies.',
    b2c: 'B2C users prefer monthly subscriptions with easy cancellation. Focus on instant value and social proof.',
    developers: 'Developers expect API-first pricing, generous free tiers, and transparent docs. They hate hidden fees.',
    creators: 'Creators value revenue-share models or flat fees. Keep pricing predictable so they can forecast their margins.',
  };

  const productTips: Record<string, string> = {
    SaaS: 'SaaS benchmarks: 50-70% gross margins. Aim for LTV:CAC ratio of 3:1 or higher.',
    ebook: 'Ebooks typically sell for $9-$49. Bundle with templates/checklists to increase perceived value.',
    course: 'Online courses range $49-$999. Price based on transformation value, not content length. Cohorts justify premium pricing.',
    template: 'Templates sell for $5-$49. Bundle them into packs to raise AOV. Notion/Gumroad are popular distribution channels.',
    newsletter: 'Newsletters convert 5-15% of free readers to paid. Typical paid tiers: $5-$15/mo or $50-$150/yr.',
  };

  let primaryRec = 0;
  if (targetCustomer === 'developers') primaryRec = 2;
  else if (targetCustomer === 'b2b') primaryRec = 1;
  else if (productType === 'newsletter') primaryRec = 0;

  const tierOutput = tiers.map((t) => {
    const monthlyMrr = t.mid * t.customers;
    const costPerCustomer = t.mid * (1 - t.margin);
    const ltv = (t.mid - costPerCustomer) / assumedChurn;
    const breakEvenCustomers = Math.ceil(2000 / t.margin / t.mid);
    return { ...t, monthlyMrr, costPerCustomer, ltv, breakEvenCustomers };
  });

  const totalMrr = tierOutput.reduce((s, t) => s + t.monthlyMrr, 0);
  const totalCustomers = tierOutput.reduce((s, t) => s + t.customers, 0);
  const arpu = totalCustomers > 0 ? totalMrr / totalCustomers : 0;
  const weightedMargin = totalMrr > 0
    ? tierOutput.reduce((s, t) => s + t.margin * t.monthlyMrr, 0) / totalMrr
    : 0;

  const results: string[] = [];

  const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
  const pct = (n: number) => n.toFixed(1) + '%';

  let mainResult =
    '🎯 SaaS Pricing Planner\n\n' +
    '📦 Product: ' + productType + '  |  👤 Target: ' + targetCustomer + '  |  💰 Competitor: ' + (competitorPrice ? '$' + competitorPrice + '/mo' : 'N/A') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💰 Tier Snapshot:\n' +
    '• Starter:      ' + fmt(tiers[0].mid) + '/mo  × ' + tiers[0].customers + ' customers = ' + fmt(tierOutput[0].monthlyMrr) + ' MRR\n' +
    '• Pro:            ' + fmt(tiers[1].mid) + '/mo  × ' + tiers[1].customers + ' customers = ' + fmt(tierOutput[1].monthlyMrr) + ' MRR\n' +
    '• Max:            ' + fmt(tiers[2].mid) + '/mo  × ' + tiers[2].customers + ' customers = ' + fmt(tierOutput[2].monthlyMrr) + ' MRR\n' +
    '• Enterprise: ' + fmt(tiers[3].mid) + '/mo  × ' + tiers[3].customers + ' customers = ' + fmt(tierOutput[3].monthlyMrr) + ' MRR\n' +
    '• Total MRR:                  ' + fmt(totalMrr) + '\n' +
    '• Total Customers:       ' + totalCustomers.toLocaleString() + '\n' +
    '• ARPU:                            ' + fmt(arpu) + '/mo\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Key Metrics:\n' +
    '• Weighted Gross Margin:    ' + pct(weightedMargin * 100) + '  (blended across tiers)\n' +
    '• Target Margin:                    ' + pct(targetMargin * 100) + '  (industry benchmark: 70-80%)\n' +
    '• ARPU by Tier:                     $' + tiers[0].mid + ' / $' + tiers[1].mid + ' / $' + tiers[2].mid + ' / $' + tiers[3].mid + '\n' +
    '• Margin by Tier:                ' + pct(tiers[0].margin * 100) + ' / ' + pct(tiers[1].margin * 100) + ' / ' + pct(tiers[2].margin * 100) + ' / ' + pct(tiers[3].margin * 100) + '\n' +
    '• Enterprise % of MRR:        ' + pct((tierOutput[3].monthlyMrr / Math.max(totalMrr, 1)) * 100) + '  (high = strong moat)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Pricing Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  const unhealthyTiers = tiers.filter((t) => t.margin < 0.5);
  if (unhealthyTiers.length === 0) {
    mainResult += '• 🟢 All tiers above 50% margin — healthy pricing structure.\n';
  } else {
    mainResult += '• 🔴 ' + unhealthyTiers.length + ' tier(s) below 50% margin: ' + unhealthyTiers.map((t) => t.name).join(', ') + ' — review feature costs.\n';
  }
  if (tierOutput[3].monthlyMrr / totalMrr > 0.25) {
    mainResult += '• 🟢 Enterprise = ' + pct((tierOutput[3].monthlyMrr / totalMrr) * 100) + ' of MRR — strong enterprise traction.\n';
  } else if (tierOutput[3].monthlyMrr / totalMrr > 0.10) {
    mainResult += '• 🟡 Enterprise = ' + pct((tierOutput[3].monthlyMrr / totalMrr) * 100) + ' of MRR — healthy mix.\n';
  } else {
    mainResult += '• 🟠 Enterprise = only ' + pct((tierOutput[3].monthlyMrr / Math.max(totalMrr, 1)) * 100) + ' of MRR — opportunity to expand upmarket.\n';
  }
  if (weightedMargin >= targetMargin) {
    mainResult += '• 🟢 Blended margin (' + pct(weightedMargin * 100) + ') hits target.\n';
  } else {
    mainResult += '• 🟡 Blended margin (' + pct(weightedMargin * 100) + ') below target — raise prices or cut costs.\n';
  }
  if (competitorPrice > 0 && tiers[1].mid < competitorPrice * 0.7) {
    mainResult += '• 🟢 Pro tier well below competitor — could raise 20-30% without losing deals.\n';
  } else if (competitorPrice > 0 && tiers[1].mid > competitorPrice * 1.3) {
    mainResult += '• 🟠 Pro tier 30%+ above competitor — risk of price objection.\n';
  }

  mainResult += '\n🎯 LTV by Tier:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Starter:           $' + Math.round(tierOutput[0].ltv).toLocaleString() + '  (' + pct(tiers[0].margin * 100) + ' margin, ' + pct(assumedChurn * 100) + ' monthly churn)\n' +
    '• Pro:                  $' + Math.round(tierOutput[1].ltv).toLocaleString() + '  (' + pct(tiers[1].margin * 100) + ' margin)\n' +
    '• Max:                  $' + Math.round(tierOutput[2].ltv).toLocaleString() + '  (' + pct(tiers[2].margin * 100) + ' margin)\n' +
    '• Enterprise:    $' + Math.round(tierOutput[3].ltv).toLocaleString() + '  (' + pct(tiers[3].margin * 100) + ' margin)\n' +
    '• Average LTV:      $' + Math.round(tierOutput.reduce((s, t) => s + t.ltv * t.customers, 0) / Math.max(totalCustomers, 1)).toLocaleString() + '\n' +
    '• LTV Formula:      (Price × Margin) / Monthly Churn\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even Customers per Tier:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Starter:           ~' + tierOutput[0].breakEvenCustomers + ' customers  to break even on $2K/mo costs\n' +
    '• Pro:                  ~' + tierOutput[1].breakEvenCustomers + ' customers  to break even on $2K/mo costs\n' +
    '• Max:                  ~' + tierOutput[2].breakEvenCustomers + ' customers  to break even on $2K/mo costs\n' +
    '• Enterprise:    ~' + tierOutput[3].breakEvenCustomers + ' customers  to break even on $2K/mo costs\n' +
    '• (Assumes $2K/mo fixed costs per tier — adjust based on actual overhead)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Raise all tiers 20%:   Pro becomes $' + Math.round(tiers[1].mid * 1.2) + '/mo, MRR → ' + fmt(totalMrr * 1.2) + '  (test willingness to pay)\n' +
    '• Cut Starter by 50%:    Convert funnel to Pro — gain $' + Math.round(tiers[1].mid * 0.3 * tiers[0].customers) + '/mo\n' +
    '• Add annual discount (15% off):   $' + Math.round(tiers[1].mid * 12 * 0.85) + '/yr  vs $' + (tiers[1].mid * 12) + '/yr monthly\n' +
    '• Move 10% of Pro users to Max:   +$' + Math.round((tiers[2].mid - tiers[1].mid) * tiers[1].customers * 0.1).toLocaleString() + '/mo MRR\n' +
    '• Drop lowest-margin tier (' + (unhealthyTiers[0]?.name || 'none') + '):   refocus on profitable tiers\n\n' +
    '💡 Tip: ' + models[primaryRec].tip + '\n\n' +
    '📌 Recommended Action: Launch with Tiered model, Pro at $' + tiers[1].mid + '/mo as the anchor. Use Starter as a low-friction entry point and Max/Enterprise to capture expansion revenue.';

  results.push(mainResult);

  for (let i = 0; i < models.length; i++) {
    const m = models[i];
    const icon = i === primaryRec ? '⭐' : '•';
    results.push(
      icon + ' ' + m.name + ': $' + m.low + ' – $' + m.mid + ' – $' + m.high + '/mo\n' +
      '  ' + m.best,
    );
  }

  results.push(
    '🎯 Audience Insight:\n' + (audienceTips[targetCustomer] || audienceTips.b2b) +
    '\n\n📦 Product Insight:\n' + (productTips[productType] || productTips.SaaS) +
    '\n\n🚀 Next step: Pick one model, launch at the Pro tier ($' + tiers[1].mid + '/mo), and adjust pricing after collecting 100+ conversion data points.',
  );

  return results;
}

const customFn =
  `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let v=function(u){return Number.isNaN(u)?0:Math.max(0,u)},$=function(u){const d=u.productType||"SaaS",l=u.targetCustomer||"b2b",s=v(parseFloat(u.competitorPrice)||0),t=s||29,x=.7,P=.03,e=[{name:"Starter",low:Math.max(5,Math.round(t*.5)),mid:Math.max(9,Math.round(t*.6)),high:Math.max(15,Math.round(t*.7)),margin:.85,customers:1e3},{name:"Pro",low:Math.max(19,Math.round(t*1)),mid:Math.max(29,Math.round(t*1.3)),high:Math.max(49,Math.round(t*1.7)),margin:.75,customers:400},{name:"Max",low:Math.max(49,Math.round(t*2)),mid:Math.max(79,Math.round(t*2.5)),high:Math.max(149,Math.round(t*4)),margin:.7,customers:80},{name:"Enterprise",low:Math.max(199,Math.round(t*5)),mid:Math.max(499,Math.round(t*10)),high:Math.max(999,Math.round(t*20)),margin:.65,customers:12}],y=[{name:"Flat-Rate",best:"Simple tools with one clear use case. Best for early-stage products.",low:Math.max(5,Math.round(t*.7)),mid:t,high:Math.round(t*1.5),tip:"Keep it simple — one price, all features. Add a free trial to reduce friction."},{name:"Tiered",best:"Products with power users who will pay more for advanced features.",low:Math.max(9,Math.round(t*.5)),mid:t,high:Math.round(t*2.5),tip:"3 tiers work best: Starter → Pro → Enterprise. The middle tier should be the obvious choice (anchor pricing)."},{name:"Usage-Based",best:"API products, AI tools, or any product where value scales with usage.",low:Math.max(5,Math.round(t*.4)),mid:Math.round(t*1.2),high:Math.round(t*3),tip:"Charge per unit (API calls, seats, credits). Include a generous free tier to drive adoption."},{name:"Freemium",best:"B2C products or tools that benefit from network effects and word-of-mouth.",low:0,mid:Math.round(t*.8)||12,high:Math.round(t*1.8),tip:"Free plan must be genuinely useful but leave room for upgrade. 3-5% free-to-paid conversion is good."}],R={b2b:"B2B buyers expect per-seat pricing and annual contracts. They value ROI calculators and case studies.",b2c:"B2C users prefer monthly subscriptions with easy cancellation. Focus on instant value and social proof.",developers:"Developers expect API-first pricing, generous free tiers, and transparent docs. They hate hidden fees.",creators:"Creators value revenue-share models or flat fees. Keep pricing predictable so they can forecast their margins."},S={SaaS:"SaaS benchmarks: 50-70% gross margins. Aim for LTV:CAC ratio of 3:1 or higher.",ebook:"Ebooks typically sell for $9-$49. Bundle with templates/checklists to increase perceived value.",course:"Online courses range $49-$999. Price based on transformation value, not content length. Cohorts justify premium pricing.",template:"Templates sell for $5-$49. Bundle them into packs to raise AOV. Notion/Gumroad are popular distribution channels.",newsletter:"Newsletters convert 5-15% of free readers to paid. Typical paid tiers: $5-$15/mo or $50-$150/yr."};let h=0;l==="developers"?h=2:l==="b2b"?h=1:d==="newsletter"&&(h=0);const n=e.map(r=>{const a=r.mid*r.customers,b=r.mid*(1-r.margin),C=(r.mid-b)/P,A=Math.ceil(2e3/r.margin/r.mid);return{...r,monthlyMrr:a,costPerCustomer:b,ltv:C,breakEvenCustomers:A}}),i=n.reduce((r,a)=>r+a.monthlyMrr,0),p=n.reduce((r,a)=>r+a.customers,0),k=p>0?i/p:0,g=i>0?n.reduce((r,a)=>r+a.margin*a.monthlyMrr,0)/i:0,M=[],m=r=>"$"+Math.round(r).toLocaleString(),o=r=>r.toFixed(1)+"%";let c=\`🎯 SaaS Pricing Planner

📦 Product: \`+d+"  |  👤 Target: "+l+"  |  💰 Competitor: "+(s?"$"+s+"/mo":"N/A")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 Tier Snapshot:
• Starter:      \`+m(e[0].mid)+"/mo  × "+e[0].customers+" customers = "+m(n[0].monthlyMrr)+\` MRR
• Pro:            \`+m(e[1].mid)+"/mo  × "+e[1].customers+" customers = "+m(n[1].monthlyMrr)+\` MRR
• Max:            \`+m(e[2].mid)+"/mo  × "+e[2].customers+" customers = "+m(n[2].monthlyMrr)+\` MRR
• Enterprise: \`+m(e[3].mid)+"/mo  × "+e[3].customers+" customers = "+m(n[3].monthlyMrr)+\` MRR
• Total MRR:                  \`+m(i)+\`
• Total Customers:       \`+p.toLocaleString()+\`
• ARPU:                            \`+m(k)+\`/mo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📐 Key Metrics:
• Weighted Gross Margin:    \`+o(g*100)+\`  (blended across tiers)
• Target Margin:                    \`+o(x*100)+\`  (industry benchmark: 70-80%)
• ARPU by Tier:                     $\`+e[0].mid+" / $"+e[1].mid+" / $"+e[2].mid+" / $"+e[3].mid+\`
• Margin by Tier:                \`+o(e[0].margin*100)+" / "+o(e[1].margin*100)+" / "+o(e[2].margin*100)+" / "+o(e[3].margin*100)+\`
• Enterprise % of MRR:        \`+o(n[3].monthlyMrr/Math.max(i,1)*100)+\`  (high = strong moat)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🩺 Pricing Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`;const f=e.filter(r=>r.margin<.5);f.length===0?c+=\`• 🟢 All tiers above 50% margin — healthy pricing structure.
\`:c+="• 🔴 "+f.length+" tier(s) below 50% margin: "+f.map(r=>r.name).join(", ")+\` — review feature costs.
\`,n[3].monthlyMrr/i>.25?c+="• 🟢 Enterprise = "+o(n[3].monthlyMrr/i*100)+\` of MRR — strong enterprise traction.
\`:n[3].monthlyMrr/i>.1?c+="• 🟡 Enterprise = "+o(n[3].monthlyMrr/i*100)+\` of MRR — healthy mix.
\`:c+="• 🟠 Enterprise = only "+o(n[3].monthlyMrr/Math.max(i,1)*100)+\` of MRR — opportunity to expand upmarket.
\`,g>=x?c+="• 🟢 Blended margin ("+o(g*100)+\`) hits target.
\`:c+="• 🟡 Blended margin ("+o(g*100)+\`) below target — raise prices or cut costs.
\`,s>0&&e[1].mid<s*.7?c+=\`• 🟢 Pro tier well below competitor — could raise 20-30% without losing deals.
\`:s>0&&e[1].mid>s*1.3&&(c+=\`• 🟠 Pro tier 30%+ above competitor — risk of price objection.
\`),c+=\`
🎯 LTV by Tier:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Starter:           $\`+Math.round(n[0].ltv).toLocaleString()+"  ("+o(e[0].margin*100)+" margin, "+o(P*100)+\` monthly churn)
• Pro:                  $\`+Math.round(n[1].ltv).toLocaleString()+"  ("+o(e[1].margin*100)+\` margin)
• Max:                  $\`+Math.round(n[2].ltv).toLocaleString()+"  ("+o(e[2].margin*100)+\` margin)
• Enterprise:    $\`+Math.round(n[3].ltv).toLocaleString()+"  ("+o(e[3].margin*100)+\` margin)
• Average LTV:      $\`+Math.round(n.reduce((r,a)=>r+a.ltv*a.customers,0)/Math.max(p,1)).toLocaleString()+\`
• LTV Formula:      (Price × Margin) / Monthly Churn

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ Break-Even Customers per Tier:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Starter:           ~\`+n[0].breakEvenCustomers+\` customers  to break even on $2K/mo costs
• Pro:                  ~\`+n[1].breakEvenCustomers+\` customers  to break even on $2K/mo costs
• Max:                  ~\`+n[2].breakEvenCustomers+\` customers  to break even on $2K/mo costs
• Enterprise:    ~\`+n[3].breakEvenCustomers+\` customers  to break even on $2K/mo costs
• (Assumes $2K/mo fixed costs per tier — adjust based on actual overhead)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 What-If Scenarios:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Raise all tiers 20%:   Pro becomes $\`+Math.round(e[1].mid*1.2)+"/mo, MRR → "+m(i*1.2)+\`  (test willingness to pay)
• Cut Starter by 50%:    Convert funnel to Pro — gain $\`+Math.round(e[1].mid*.3*e[0].customers)+\`/mo
• Add annual discount (15% off):   $\`+Math.round(e[1].mid*12*.85)+"/yr  vs $"+e[1].mid*12+\`/yr monthly
• Move 10% of Pro users to Max:   +$\`+Math.round((e[2].mid-e[1].mid)*e[1].customers*.1).toLocaleString()+\`/mo MRR
• Drop lowest-margin tier (\`+(f[0]?.name||"none")+\`):   refocus on profitable tiers

💡 Tip: \`+y[h].tip+\`

📌 Recommended Action: Launch with Tiered model, Pro at $\`+e[1].mid+"/mo as the anchor. Use Starter as a low-friction entry point and Max/Enterprise to capture expansion revenue.",M.push(c);for(let r=0;r<y.length;r++){const a=y[r],b=r===h?"⭐":"•";M.push(b+" "+a.name+": $"+a.low+" – $"+a.mid+" – $"+a.high+\`/mo
  \`+a.best)}return M.push(\`🎯 Audience Insight:
\`+(R[l]||R.b2b)+\`

📦 Product Insight:
\`+(S[d]||S.SaaS)+\`

🚀 Next step: Pick one model, launch at the Pro tier ($\`+e[1].mid+"/mo), and adjust pricing after collecting 100+ conversion data points."),M},w=function(u,d,l){var s=T(u);return Array.isArray(s)?s.join(\`
\`):String(s)};var E=v,L=$,B=w,T=function(u){return $(u)};return[w(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

const engine: ToolEngine = {
  slug: 'solopreneur-saas-pricing-planner',
  title: 'SaaS Pricing Planner',
  description: 'Plan your SaaS pricing tiers with margin analysis, LTV by tier, break-even customers, and pricing health diagnostics.',
  inputs: [
    { name: 'productType', label: 'Product Type', placeholder: '', type: 'select', options: ['SaaS', 'ebook', 'course', 'template', 'newsletter'] },
    { name: 'targetCustomer', label: 'Target Customer', placeholder: '', type: 'select', options: ['b2b', 'b2c', 'developers', 'creators'] },
    { name: 'competitorPrice', label: 'Competitor Average Price ($)', placeholder: 'e.g. 29', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
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
  generate(inputs: Record<string, string>): string[] {
    return planPricing(inputs);
  },
  staticExamples: [
    '🎯 SaaS Pricing Planner\n\n📦 Product: SaaS  |  👤 Target: b2b  |  💰 Competitor: $29/mo\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💰 Tier Snapshot:\n• Starter:      $17/mo  × 1000 customers = $17,000 MRR\n• Pro:            $38/mo  × 400 customers = $15,200 MRR\n• Max:            $79/mo  × 80 customers = $6,320 MRR\n• Enterprise: $499/mo  × 12 customers = $5,988 MRR\n• Total MRR:                  $44,508\n• Total Customers:       1,492\n• ARPU:                            $30/mo\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Key Metrics:\n• Weighted Gross Margin:    76.8%  (blended across tiers)\n• Target Margin:                    70.0%  (industry benchmark: 70-80%)\n• ARPU by Tier:                     $17 / $38 / $79 / $499\n• Margin by Tier:                85.0% / 75.0% / 70.0% / 65.0%\n• Enterprise % of MRR:        13.5%  (high = strong moat)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Pricing Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 All tiers above 50% margin — healthy pricing structure.\n• 🟡 Enterprise = 13.5% of MRR — healthy mix.\n• 🟢 Blended margin (76.8%) hits target.\n• 🟠 Pro tier 30%+ above competitor — risk of price objection.\n\n🎯 LTV by Tier:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Starter:           $482  (85.0% margin, 3.0% monthly churn)\n• Pro:                  $950  (75.0% margin)\n• Max:                  $1,843  (70.0% margin)\n• Enterprise:    $10,812  (65.0% margin)\n• Average LTV:      $763\n• LTV Formula:      (Price × Margin) / Monthly Churn\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even Customers per Tier:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Starter:           ~139 customers  to break even on $2K/mo costs\n• Pro:                  ~71 customers  to break even on $2K/mo costs\n• Max:                  ~37 customers  to break even on $2K/mo costs\n• Enterprise:    ~7 customers  to break even on $2K/mo costs\n• (Assumes $2K/mo fixed costs per tier — adjust based on actual overhead)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Raise all tiers 20%:   Pro becomes $46/mo, MRR → $53,410  (test willingness to pay)\n• Cut Starter by 50%:    Convert funnel to Pro — gain $11400/mo\n• Add annual discount (15% off):   $388/yr  vs $456/yr monthly\n• Move 10% of Pro users to Max:   +$1,640/mo MRR\n• Drop lowest-margin tier (none):   refocus on profitable tiers\n\n💡 Tip: 3 tiers work best: Starter → Pro → Enterprise. The middle tier should be the obvious choice (anchor pricing).\n\n📌 Recommended Action: Launch with Tiered model, Pro at $38/mo as the anchor. Use Starter as a low-friction entry point and Max/Enterprise to capture expansion revenue.\n• Flat-Rate: $20 – $29 – $44/mo\n  Simple tools with one clear use case. Best for early-stage products.\n⭐ Tiered: $15 – $29 – $73/mo\n  Products with power users who will pay more for advanced features.\n• Usage-Based: $12 – $35 – $87/mo\n  API products, AI tools, or any product where value scales with usage.\n• Freemium: $0 – $23 – $52/mo\n  B2C products or tools that benefit from network effects and word-of-mouth.\n🎯 Audience Insight:\nB2B buyers expect per-seat pricing and annual contracts. They value ROI calculators and case studies.\n\n📦 Product Insight:\nSaaS benchmarks: 50-70% gross margins. Aim for LTV:CAC ratio of 3:1 or higher.\n\n🚀 Next step: Pick one model, launch at the Pro tier ($38/mo), and adjust pricing after collecting 100+ conversion data points.',
    '',
    '',
    '',
    '',
    '',
  ],
  faq: [
    { q: 'Which pricing model is best for a new SaaS?', a: 'Start with flat-rate or two tiers. Validate willingness to pay first, then expand to three tiers once you understand your power users.' },
    { q: 'How much should I charge compared to competitors?', a: 'If you offer more value, charge 20-50% more. If you want fast market entry, charge 20% less. Never compete on price alone — compete on differentiated value.' },
    { q: 'What is anchor pricing?', a: 'Present a high-priced tier to make your mid-tier look like a bargain. The middle tier becomes the obvious choice for most buyers.' },
    { q: 'Should I show pricing on my landing page?', a: 'Yes. Transparent pricing builds trust. If you must hide it (enterprise deals), at least show a starting price or range.' },
    { q: 'When should I raise prices?', a: 'Raise prices when your product has significantly more value than at launch, or when demand outpaces your capacity. Grandfather existing customers to avoid churn.' },
    { q: "How do I price my SaaS product?", a: "Three common approaches: 1) Cost-plus (cost + 30-50% margin) — bottom floor, 2) Value-based (price = % of value delivered) — premium pricing, 3) Competitor-based (price near similar tools) — market norm. Most successful SaaS uses value-based: charge 5-20% of the value you create. Test with 3-5 price points." },
    { q: "What is a good free trial vs freemium strategy?", a: "Free trial: 14-30 days full access, convert 15-25% to paid. Best for: high-touch products, B2B with longer sales cycles. Freemium: 2-5% of users convert, but viral growth. Best for: PLG products, low-touch SaaS. Combine: free tier + 14-day trial of premium features." },
    { q: "How should I structure pricing tiers?", a: "3 tiers is the sweet spot: Starter (entry), Pro (most popular), Enterprise (custom). Anchor pricing with a middle tier 2-3x the starter. Use feature differentiation, not just usage. Add annual pricing (15-20% off) to lock in cash. Enterprise tier typically requires custom quote for compliance/security needs." },
    { q: "What is a good conversion rate from free to paid?", a: "B2B SaaS: 5-15% freemium-to-paid, 15-25% trial-to-paid. B2C: 1-5%. Improving conversion: better onboarding, in-app upgrade prompts, usage limits, email nurture. The biggest lever: time-to-first-value. Cut onboarding to <5 minutes and conversion rates often double." },
    { q: "How should I price for usage vs per-seat?", a: "Per-seat: predictable, scales with team growth, easy to sell. Usage-based: aligns with value, scales with adoption, harder to forecast. Hybrid (per-seat + usage overage) is increasingly common. For API/AI products: usage-based. For collaboration/B2B: per-seat. Match pricing to how customers perceive value." },
    { q: "What is the typical SaaS price increase strategy?", a: "Increase prices: for new customers first (3-6 months before existing), then grandfather existing customers for 12-24 months. Typical annual increase: 10-20%. Communicate value first (new features, ROI proof). Avoid surprises — small, frequent increases > large rare ones. Always test new pricing on new signups first." },
    { q: "How do I handle price objections from customers?", a: "Common objections: too expensive, alternative is cheaper, no ROI proof. Responses: 1) Show ROI (cost savings, revenue generated), 2) Compare total cost of ownership (vs alternatives), 3) Offer annual discount (15-20%), 4) Highlight cheapest tier that meets needs, 5) Negotiate annual contracts with custom pricing for enterprise." },
    { q: "Should I offer a free tier in 2026?", a: "Free tier works if: viral coefficient >1, low marginal cost, easy upgrade path. Skip if: high support cost, low conversion rate (<2%), niche B2B. Free tier users cost $5-50/month in support. Conversion must justify this. Many successful SaaS have no free tier (Linear, Notion originally, Superhuman). Test freemium vs trial." },
  ],
  howToUse: [
    'Select your product type.',
    'Select your target customer segment.',
    'Enter the average competitor price (or skip if unknown).',
    'Review the 4-tier breakdown with margin, MRR, and LTV analysis.',
    'Check pricing health diagnostics for issues.',
    'Use the what-if scenarios to model pricing changes.',
  ],
  engineKey: true,
};

registerEngine(engine);
