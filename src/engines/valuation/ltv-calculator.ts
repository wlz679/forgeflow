import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

function calculateLTV(inputs: Record<string, string>): string[] {
  const monthlyRevenuePerUser = clampNonNegative(parseFloat(inputs.monthlyRevenuePerUser) || 0);
  const grossMargin = clampNonNegative(parseFloat(inputs.grossMargin) || 80);
  const monthlyChurn = clampNonNegative(parseFloat(inputs.monthlyChurn) || 0);
  const cac = clampNonNegative(parseFloat(inputs.cac) || 0);
  const results: string[] = [];

  const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
  const pct = (n: number) => n.toFixed(1) + '%';

  const churnRate = monthlyChurn / 100;
  const avgLifetimeMonths = churnRate > 0 ? 1 / churnRate : 120; // cap at 10 years if 0 churn
  const grossProfitPerMonth = monthlyRevenuePerUser * (grossMargin / 100);
  const ltv = grossProfitPerMonth * avgLifetimeMonths;
  const ltvCacRatio = cac > 0 ? ltv / cac : 0;
  const annualLtv = ltv;

  let mainResult =
    '💎 Customer Lifetime Value (LTV)\n\n' +
    '• Monthly Revenue per User: ' + fmt(monthlyRevenuePerUser) + '\n' +
    '• Gross Margin: ' + pct(grossMargin) + '\n' +
    '• Monthly Churn Rate: ' + pct(monthlyChurn) + '\n' +
    '• Avg Customer Lifetime: ' + (churnRate > 0 ? avgLifetimeMonths.toFixed(1) + ' months' : '10+ years (very low churn)') + '\n' +
    '• Gross Profit per User/Month: ' + fmt(grossProfitPerMonth) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Key Results:\n\n' +
    '• Lifetime Value (LTV): ' + fmt(ltv) + '\n';

  if (cac > 0) {
    mainResult += '• Customer Acquisition Cost (CAC): ' + fmt(cac) + '\n';
    mainResult += '• LTV:CAC Ratio: ' + ltvCacRatio.toFixed(1) + ':1\n\n';

    if (ltvCacRatio >= 3) {
      mainResult += '🟢 EXCELLENT: LTV:CAC of ' + ltvCacRatio.toFixed(1) + ':1 is above the 3:1 benchmark. You have strong unit economics. Consider investing more in growth.\n';
    } else if (ltvCacRatio >= 1) {
      mainResult += '🟡 OK: LTV:CAC of ' + ltvCacRatio.toFixed(1) + ':1 is positive but below the 3:1 ideal. Work on increasing LTV or reducing CAC.\n';
    } else {
      mainResult += '🔴 PROBLEM: LTV:CAC of ' + ltvCacRatio.toFixed(1) + ':1 is below 1:1. You are losing money on every customer. Fix this immediately.\n';
    }

    const paybackMonths = grossProfitPerMonth > 0 ? cac / grossProfitPerMonth : 0;
    if (paybackMonths > 0) {
      mainResult += '• CAC Payback Period: ' + paybackMonths.toFixed(1) + ' months\n';
    }
  } else {
    mainResult += '\n';
  }

  mainResult += '\n💡 Tip: The 3:1 LTV:CAC ratio is the golden benchmark. If your LTV is $900 and CAC is $300, you are at 3:1. Below 3:1, focus on either increasing LTV (raise prices, reduce churn, upsell) or decreasing CAC (better targeting, organic channels, referrals).';

  // 🔄 What-If Scenarios (actionable levers)
  if (cac > 0 && ltvCacRatio > 0) {
    const raisePriceLtv = grossProfitPerMonth * 1.2 * avgLifetimeMonths;
    const raisePriceRatio = raisePriceLtv / cac;
    const lowerChurnLT = churnRate > 0.5 ? 1 / (churnRate / 2) : 120;
    const lowerChurnLtv = grossProfitPerMonth * lowerChurnLT;
    mainResult += '\n\n🔄 What-If Scenarios\n';
    mainResult += '• If price +20%:  LTV $' + Math.round(raisePriceLtv).toLocaleString() + '  |  LTV:CAC ' + raisePriceRatio.toFixed(1) + ':1\n';
    mainResult += '• If churn halves:  LTV $' + Math.round(lowerChurnLtv).toLocaleString() + '  (lifetime ' + lowerChurnLT.toFixed(1) + ' mo)\n';
    const targetCac = ltv / 3;
    mainResult += '• For 3:1 ratio:  target CAC = $' + Math.round(targetCac).toLocaleString() + '  (current: $' + Math.round(cac).toLocaleString() + ')\n';
  }

  // 🩺 LTV Health (v3)
  if (ltv <= 0) {
    mainResult += '\n\n🩺 LTV Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🔴 LTV is zero or negative. Check inputs: revenue > 0 and churn < 100%.';
  } else if (cac > 0) {
    const ratio = ltv / cac;
    if (ratio >= 3) mainResult += '\n\n🩺 LTV Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 LTV:CAC = ' + ratio.toFixed(1) + ':1 — healthy. Above 3:1 = invest more in growth.\n• Industry benchmark: 3:1 (SaaS), 4:1+ (premium).';
    else if (ratio >= 1) mainResult += '\n\n🩺 LTV Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 LTV:CAC = ' + ratio.toFixed(1) + ':1 — below target. Improve before scaling.\n• Target: 3:1+ (SaaS healthy benchmark). Focus on either raising LTV or cutting CAC.';
    else mainResult += '\n\n🩺 LTV Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🔴 LTV:CAC = ' + ratio.toFixed(1) + ':1 — losing money per customer. Stop scaling spend.\n• Need to either reduce CAC (better targeting, organic, referrals) or raise LTV (pricing, retention).';
  } else {
    mainResult += '\n\n🩺 LTV Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 LTV = $' + Math.round(ltv).toLocaleString() + '. Enter CAC to see LTV:CAC ratio.\n• ℹ️ Industry benchmark: 3:1 LTV:CAC.';
  }

  // 🔄 What-If Scenarios (v3)
  mainResult += '\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  if (monthlyChurn > 0 && ltv > 0) {
    const halfChurnLtv = (monthlyRevenuePerUser * (grossMargin / 100)) / (monthlyChurn / 2 / 100);
    mainResult += '\n• Cut churn in half:  LTV $' + Math.round(ltv).toLocaleString() + ' → $' + Math.round(halfChurnLtv).toLocaleString() + '  (+' + Math.round(halfChurnLtv - ltv).toLocaleString() + ')';
    const incRevLtv = (monthlyRevenuePerUser * 1.2 * (grossMargin / 100)) / (monthlyChurn / 100);
    mainResult += '\n• Raise price 20%:  LTV $' + Math.round(ltv).toLocaleString() + ' → $' + Math.round(incRevLtv).toLocaleString() + '  (+' + Math.round(incRevLtv - ltv).toLocaleString() + ')';
    if (cac > 0) {
      const targetCac = halfChurnLtv / 3;
      mainResult += '\n• Cut churn 50% + target 3:1 ratio:  Max CAC = $' + Math.round(targetCac).toLocaleString() + '  (was $' + Math.round(cac).toLocaleString() + ')';
    }
    const incMarginLtv = (monthlyRevenuePerUser * (grossMargin + 10) / 100) / (monthlyChurn / 100);
    mainResult += '\n• Boost gross margin +10pp:  LTV $' + Math.round(ltv).toLocaleString() + ' → $' + Math.round(incMarginLtv).toLocaleString() + '  (focus on cost-to-serve)';
  } else {
    mainResult += '\n• ⚠️ Cannot model — ensure revenue > 0 and churn > 0.';
  }

  // ⚖️ Break-Even (v3)
  if (ltv > 0) {
    mainResult += '\n\n⚖️ Break-Even\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    const beLtvCac = cac > 0 ? ltv : 0;
    if (cac > 0 && ltvCacRatio >= 3) {
      mainResult += '\n• 🟢 LTV:CAC = ' + ltvCacRatio.toFixed(1) + ':1 — above 3:1 break-even. Scale acquisition.';
    } else if (cac > 0 && ltvCacRatio >= 1) {
      mainResult += '\n• 🟡 LTV:CAC = ' + ltvCacRatio.toFixed(1) + ':1 — above 1:1 (not losing money) but below 3:1 ideal.';
      mainResult += '\n• To reach 3:1:  either raise LTV to $' + Math.round(cac * 3).toLocaleString() + '  (e.g., cut churn or raise price), or cut CAC to $' + Math.round(beLtvCac / 3).toLocaleString();
    } else if (cac > 0) {
      mainResult += '\n• 🔴 LTV:CAC = ' + ltvCacRatio.toFixed(1) + ':1 — losing money per customer. Fix before scaling spend.';
    } else {
      mainResult += '\n• ℹ️ No CAC entered. Industry benchmark: LTV:CAC ≥ 3:1.';
    }
    if (churnRate > 0) {
      const maxChurn = (grossProfitPerMonth / cac) * 100; // churn at which LTV = CAC
      if (cac > 0) {
        mainResult += '\n• Max monthly churn for LTV:CAC ≥ 1:1:  ' + maxChurn.toFixed(1) + '%  (your current: ' + pct(monthlyChurn) + ')';
      }
    }
  }

  // 🎯 LTV Milestones (v3)
  if (ltv > 0 && monthlyChurn > 0) {
    mainResult += '\n\n🎯 LTV Milestones\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    mainResult += '\n• At 1% monthly churn:  LTV = $' + Math.round(grossProfitPerMonth * 100).toLocaleString() + '  (lifetime 100 mo)';
    mainResult += '\n• At 2% monthly churn:  LTV = $' + Math.round(grossProfitPerMonth * 50).toLocaleString() + '  (lifetime 50 mo)';
    mainResult += '\n• At 3% monthly churn:  LTV = $' + Math.round(grossProfitPerMonth / 0.03).toLocaleString() + '  (lifetime 33.3 mo)';
    if (cac > 0) {
      mainResult += '\n• Current LTV / CAC target:  $' + Math.round(cac * 3).toLocaleString() + '  (your current: $' + Math.round(ltv).toLocaleString() + ')';
    }
  }

  results.push(mainResult);

  // 5 comparison scenarios at different churn rates
  const churnScenarios = [
    { label: 'Excellent (1% churn)', churn: 1 },
    { label: 'Good (2% churn)', churn: 2 },
    { label: 'Average (3% churn)', churn: 3 },
    { label: 'Below Avg (5% churn)', churn: 5 },
    { label: 'Poor (8% churn)', churn: 8 },
  ];

  for (let i = 0; i < churnScenarios.length; i++) {
    const cr = churnScenarios[i].churn / 100;
    const lt = cr > 0 ? 1 / cr : 120;
    const ltvScen = grossProfitPerMonth * lt;
    const ratio = cac > 0 ? ltvScen / cac : 0;
    results.push(
      churnScenarios[i].label + ': Lifetime ' + lt.toFixed(1) + ' months, LTV ' + fmt(ltvScen) +
      (cac > 0 ? ', LTV:CAC ' + ratio.toFixed(1) + ':1' : ''),
    );
  }

  return results;
}

const customFn =
    // P168 B3-10: client = verbatim mirror of the server generate() (same logic, same order). +
  `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let g=function(a){return Number.isNaN(a)?0:Math.max(0,a)},v=function(a){const u=g(parseFloat(a.monthlyRevenuePerUser)||0),h=g(parseFloat(a.grossMargin)||80),r=g(parseFloat(a.monthlyChurn)||0),t=g(parseFloat(a.cac)||0),f=[],d=e=>"$"+Math.round(e).toLocaleString(),m=e=>e.toFixed(1)+"%",C=r/100,T=C>0?1/C:120,c=u*(h/100),o=c*T,i=t>0?o/t:0,F=o;let n=\`💎 Customer Lifetime Value (LTV)

• Monthly Revenue per User: \`+d(u)+\`
• Gross Margin: \`+m(h)+\`
• Monthly Churn Rate: \`+m(r)+\`
• Avg Customer Lifetime: \`+(C>0?T.toFixed(1)+" months":"10+ years (very low churn)")+\`
• Gross Profit per User/Month: \`+d(c)+\`

━━━━━━━━━━━━━━━━━━━━

📊 Key Results:

• Lifetime Value (LTV): \`+d(o)+\`
\`;if(t>0){n+="• Customer Acquisition Cost (CAC): "+d(t)+\`
\`,n+="• LTV:CAC Ratio: "+i.toFixed(1)+\`:1

\`,i>=3?n+="🟢 EXCELLENT: LTV:CAC of "+i.toFixed(1)+\`:1 is above the 3:1 benchmark. You have strong unit economics. Consider investing more in growth.
\`:i>=1?n+="🟡 OK: LTV:CAC of "+i.toFixed(1)+\`:1 is positive but below the 3:1 ideal. Work on increasing LTV or reducing CAC.
\`:n+="🔴 PROBLEM: LTV:CAC of "+i.toFixed(1)+\`:1 is below 1:1. You are losing money on every customer. Fix this immediately.
\`;const e=c>0?t/c:0;e>0&&(n+="• CAC Payback Period: "+e.toFixed(1)+\` months
\`)}else n+=\`
\`;if(n+=\`
💡 Tip: The 3:1 LTV:CAC ratio is the golden benchmark. If your LTV is $900 and CAC is $300, you are at 3:1. Below 3:1, focus on either increasing LTV (raise prices, reduce churn, upsell) or decreasing CAC (better targeting, organic channels, referrals).\`,t>0&&i>0){const e=c*1.2*T,s=e/t,l=C>.5?1/(C/2):120,L=c*l;n+=\`

🔄 What-If Scenarios
\`,n+="• If price +20%:  LTV $"+Math.round(e).toLocaleString()+"  |  LTV:CAC "+s.toFixed(1)+\`:1
\`,n+="• If churn halves:  LTV $"+Math.round(L).toLocaleString()+"  (lifetime "+l.toFixed(1)+\` mo)
\`;const A=o/3;n+="• For 3:1 ratio:  target CAC = $"+Math.round(A).toLocaleString()+"  (current: $"+Math.round(t).toLocaleString()+\`)
\`}if(o<=0)n+=\`

🩺 LTV Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 🔴 LTV is zero or negative. Check inputs: revenue > 0 and churn < 100%.\`;else if(t>0){const e=o/t;e>=3?n+=\`

🩺 LTV Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 🟢 LTV:CAC = \`+e.toFixed(1)+\`:1 — healthy. Above 3:1 = invest more in growth.
• Industry benchmark: 3:1 (SaaS), 4:1+ (premium).\`:e>=1?n+=\`

🩺 LTV Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 🟡 LTV:CAC = \`+e.toFixed(1)+\`:1 — below target. Improve before scaling.
• Target: 3:1+ (SaaS healthy benchmark). Focus on either raising LTV or cutting CAC.\`:n+=\`

🩺 LTV Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 🔴 LTV:CAC = \`+e.toFixed(1)+\`:1 — losing money per customer. Stop scaling spend.
• Need to either reduce CAC (better targeting, organic, referrals) or raise LTV (pricing, retention).\`}else n+=\`

🩺 LTV Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 🟢 LTV = $\`+Math.round(o).toLocaleString()+\`. Enter CAC to see LTV:CAC ratio.
• ℹ️ Industry benchmark: 3:1 LTV:CAC.\`;if(n+=\`

🔄 What-If Scenarios:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\`,r>0&&o>0){const e=u*(h/100)/(r/2/100);n+=\`
• Cut churn in half:  LTV $\`+Math.round(o).toLocaleString()+" → $"+Math.round(e).toLocaleString()+"  (+"+Math.round(e-o).toLocaleString()+")";const s=u*1.2*(h/100)/(r/100);if(n+=\`
• Raise price 20%:  LTV $\`+Math.round(o).toLocaleString()+" → $"+Math.round(s).toLocaleString()+"  (+"+Math.round(s-o).toLocaleString()+")",t>0){const L=e/3;n+=\`
• Cut churn 50% + target 3:1 ratio:  Max CAC = $\`+Math.round(L).toLocaleString()+"  (was $"+Math.round(t).toLocaleString()+")"}const l=u*(h+10)/100/(r/100);n+=\`
• Boost gross margin +10pp:  LTV $\`+Math.round(o).toLocaleString()+" → $"+Math.round(l).toLocaleString()+"  (focus on cost-to-serve)"}else n+=\`
• ⚠️ Cannot model — ensure revenue > 0 and churn > 0.\`;if(o>0){n+=\`

⚖️ Break-Even
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\`;const e=t>0?o:0;if(t>0&&i>=3?n+=\`
• 🟢 LTV:CAC = \`+i.toFixed(1)+":1 — above 3:1 break-even. Scale acquisition.":t>0&&i>=1?(n+=\`
• 🟡 LTV:CAC = \`+i.toFixed(1)+":1 — above 1:1 (not losing money) but below 3:1 ideal.",n+=\`
• To reach 3:1:  either raise LTV to $\`+Math.round(t*3).toLocaleString()+"  (e.g., cut churn or raise price), or cut CAC to $"+Math.round(e/3).toLocaleString()):t>0?n+=\`
• 🔴 LTV:CAC = \`+i.toFixed(1)+":1 — losing money per customer. Fix before scaling spend.":n+=\`
• ℹ️ No CAC entered. Industry benchmark: LTV:CAC ≥ 3:1.\`,C>0){const s=c/t*100;t>0&&(n+=\`
• Max monthly churn for LTV:CAC ≥ 1:1:  \`+s.toFixed(1)+"%  (your current: "+m(r)+")")}}o>0&&r>0&&(n+=\`

🎯 LTV Milestones
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\`,n+=\`
• At 1% monthly churn:  LTV = $\`+Math.round(c*100).toLocaleString()+"  (lifetime 100 mo)",n+=\`
• At 2% monthly churn:  LTV = $\`+Math.round(c*50).toLocaleString()+"  (lifetime 50 mo)",n+=\`
• At 3% monthly churn:  LTV = $\`+Math.round(c/.03).toLocaleString()+"  (lifetime 33.3 mo)",t>0&&(n+=\`
• Current LTV / CAC target:  $\`+Math.round(t*3).toLocaleString()+"  (your current: $"+Math.round(o).toLocaleString()+")")),f.push(n);const V=[{label:"Excellent (1% churn)",churn:1},{label:"Good (2% churn)",churn:2},{label:"Average (3% churn)",churn:3},{label:"Below Avg (5% churn)",churn:5},{label:"Poor (8% churn)",churn:8}];for(let e=0;e<V.length;e++){const s=V[e].churn/100,l=s>0?1/s:120,L=c*l,A=t>0?L/t:0;f.push(V[e].label+": Lifetime "+l.toFixed(1)+" months, LTV "+d(L)+(t>0?", LTV:CAC "+A.toFixed(1)+":1":""))}return f},M=function(a,u,h){var r=y(a);return Array.isArray(r)?r.join(\`
\`):String(r)};var S=g,b=v,p=M,y=function(a){return v(a)};return[M(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

const engine: ToolEngine = {
  slug: 'solopreneur-ltv-calculator',
  title: 'LTV Calculator',
  description: 'Calculate Customer Lifetime Value (LTV) and LTV:CAC ratio. Compare how different churn rates impact customer value and unit economics.',
  inputs: [
    { name: 'monthlyRevenuePerUser', label: 'Monthly Revenue per User ($)', placeholder: 'e.g. 50', type: 'number' },
    { name: 'grossMargin', label: 'Gross Margin (%)', placeholder: 'e.g. 80', type: 'number' },
    { name: 'monthlyChurn', label: 'Monthly Churn Rate (%)', placeholder: 'e.g. 3', type: 'number' },
    { name: 'cac', label: 'Customer Acquisition Cost ($)', placeholder: 'e.g. 150', type: 'number' },
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
    return calculateLTV(inputs);
  },
  staticExamples: [
    '💎 Customer Lifetime Value (LTV)\n\n• Monthly Revenue per User: $100\n• Gross Margin: 70.0%\n• Monthly Churn Rate: 5.0%\n• Avg Customer Lifetime: 20.0 months\n• Gross Profit per User/Month: $70\n\n━━━━━━━━━━━━━━━━━━━━\n\n📊 Key Results:\n\n• Lifetime Value (LTV): $1,400\n• Customer Acquisition Cost (CAC): $150\n• LTV:CAC Ratio: 9.3:1\n\n🟢 EXCELLENT: LTV:CAC of 9.3:1 is above the 3:1 benchmark. You have strong unit economics. Consider investing more in growth.\n• CAC Payback Period: 2.1 months\n\n💡 Tip: The 3:1 LTV:CAC ratio is the golden benchmark. If your LTV is $900 and CAC is $300, you are at 3:1. Below 3:1, focus on either increasing LTV (raise prices, reduce churn, upsell) or decreasing CAC (better targeting, organic channels, referrals).\n\n🔄 What-If Scenarios\n• If price +20%:  LTV $1,680  |  LTV:CAC 11.2:1\n• If churn halves:  LTV $8,400  (lifetime 120.0 mo)\n• For 3:1 ratio:  target CAC = $467  (current: $150)\n\n\n🩺 LTV Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 LTV:CAC = 9.3:1 — healthy. Above 3:1 = invest more in growth.\n• Industry benchmark: 3:1 (SaaS), 4:1+ (premium).\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Cut churn in half:  LTV $1,400 → $2,800  (+1,400)\n• Raise price 20%:  LTV $1,400 → $1,680  (+280)\n• Cut churn 50% + target 3:1 ratio:  Max CAC = $933  (was $150)\n• Boost gross margin +10pp:  LTV $1,400 → $1,600  (focus on cost-to-serve)\n\n⚖️ Break-Even\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 LTV:CAC = 9.3:1 — above 3:1 break-even. Scale acquisition.\n• Max monthly churn for LTV:CAC ≥ 1:1:  46.7%  (your current: 5.0%)\n\n🎯 LTV Milestones\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• At 1% monthly churn:  LTV = $7,000  (lifetime 100 mo)\n• At 2% monthly churn:  LTV = $3,500  (lifetime 50 mo)\n• At 3% monthly churn:  LTV = $2,333  (lifetime 33.3 mo)\n• Current LTV / CAC target:  $450  (your current: $1,400)\nExcellent (1% churn): Lifetime 100.0 months, LTV $7,000, LTV:CAC 46.7:1\nGood (2% churn): Lifetime 50.0 months, LTV $3,500, LTV:CAC 23.3:1\nAverage (3% churn): Lifetime 33.3 months, LTV $2,333, LTV:CAC 15.6:1\nBelow Avg (5% churn): Lifetime 20.0 months, LTV $1,400, LTV:CAC 9.3:1\nPoor (8% churn): Lifetime 12.5 months, LTV $875, LTV:CAC 5.8:1',
    'Excellent (1% churn): Lifetime 100.0 months, LTV $4,000, LTV:CAC 26.7:1',
    'Good (2% churn): Lifetime 50.0 months, LTV $2,000, LTV:CAC 13.3:1',
    'Average (3% churn): Lifetime 33.3 months, LTV $1,333, LTV:CAC 8.9:1',
    'Below Avg (5% churn): Lifetime 20.0 months, LTV $800, LTV:CAC 5.3:1',
  ],
  faq: [
    { q: 'What is a good LTV:CAC ratio?', a: 'A 3:1 LTV:CAC ratio is the industry benchmark — meaning your customer lifetime value should be at least 3 times your acquisition cost. Below 3:1, you are spending too much to acquire customers relative to their value. Above 5:1, you may be under-investing in growth. The sweet spot is 3:1 to 5:1.' },
    { q: 'How do I calculate LTV accurately?', a: 'LTV = (Average Monthly Revenue per User × Gross Margin %) / Monthly Churn Rate. For example: $50/month × 80% margin / 3% monthly churn = $1,333. Use actual data, not estimates. Segment by customer cohort (by acquisition month or channel) for the most accurate picture.' },
    { q: 'What is a good payback period for CAC?', a: 'Aim for 12 months or less. The best SaaS companies recover CAC in 5-7 months. If your payback period exceeds 12 months, you are tying up too much cash in customer acquisition. This strains cash flow and slows your ability to reinvest in growth.' },
    { q: 'Should I include support costs in gross margin?', a: 'Yes. Gross margin should account for all costs directly tied to serving the customer: hosting, support, third-party APIs, and payment processing fees. Many founders make the mistake of using 100% margin, which dramatically overstates LTV. 70-85% is typical for SaaS.' },
    { q: 'How does churn affect LTV?', a: 'Churn is the denominator in the LTV formula, so small changes have huge impacts. Reducing monthly churn from 5% to 3% nearly doubles your LTV (from $800 to $1,333 in the example above). This is why churn reduction is almost always a better investment than acquisition optimization.' },
    { q: "What is LTV (Customer Lifetime Value)?", a: "LTV = total revenue from customer over their lifetime. Formula: ARPU × gross_margin / churn. For $100 ARPU, 80% margin, 5% monthly churn: $100 × 0.8 / 0.05 = $1,600 LTV. Use 1) Unit economics, 2) Marketing ROI, 3) Valuation. Benchmarks: SaaS 3-7x CAC. track by cohort. Tools: ChartMogul, Baremetrics, custom. LTV 12-36 months is healthy. Calculate: gross LTV (revenue) or net LTV (margin)." },
    { q: "What is a good LTV:CAC ratio for SaaS?", a: "Benchmarks: 1) 1:1 = break-even, 2) 3:1 = healthy, 3) 5:1 = under-investing, 4) 10:1 = excellent. By stage: 1) Seed: 2:1+ (acceptable), 2) Series A: 3:1+, 3) Series B+: 4:1+. For investors: 3:1 is the gate. Below 2:1: scaling issues. Above 5:1: under-investing (could grow faster). Most: target 3-4:1. Top: 5:1+. Calculate: (LTV × gross_margin) / CAC. Be honest: use net LTV." },
    { q: "How do I increase LTV?", a: "1) Reduce churn (biggest lever), 2) Increase ARPU (pricing, upsell), 3) Increase gross margin, 4) Win-back churned customers. 30-50% LTV lift in 12 months. reduce churn (1 pp churn = 10-20% LTV lift). Other tactics: pricing (10% price = 10% LTV), upsell (5-15% expansion). focus on retention first. Best option: churn + pricing + upsell combined." },
    { q: "What is the difference between gross and net LTV?", a: "Gross LTV: total revenue per customer. Net LTV: revenue minus cost to serve. For LTV:CAC: use net. Calculate: gross_revenue × gross_margin - support_cost. For $1K gross, 80% margin, $100 support: net $700. net LTV is 50-80% of gross. For unit economics: always use net. For valuation: use gross (revenue-based). Most teams net LTV is the real number. Calculate: net LTV × 1.5x = gross LTV (rough)." },
    { q: "How do I calculate LTV with different churn rates?", a: "Formula: LTV = ARPU × gross_margin / churn. For 1% monthly: 100x ARPU (long LTV). For 5% monthly: 20x ARPU. For 10% monthly: 10x. Calculate: by cohort. Track how LTV changes as churn changes. 1 pp monthly churn reduction = 10-25% LTV lift. For 5% to 4% monthly: 25% LTV lift. Use cohort-based (real customers). predictable LTV after 12 months of data. Tools: cohort analysis." },
    { q: "What is a good LTV for SaaS by stage?", a: "Benchmarks: 1) Seed: $500-2K, 2) Series A: $2-5K, 3) Series B: $5-15K, 4) Series C+: $15K+. By segment: 1) SMB: $500-3K, 2) Mid-market: $3-15K, 3) Enterprise: $15K-100K. By product: 1) Vertical SaaS: 2-3x horizontal, 2) Horizontal SaaS: lower, 3) Usage-based: higher. aim for LTV 3x CAC. Track by cohort. 5-10x CAC. $5K+ LTV by Series A is healthy." },
    { q: "How is LTV used for valuation?", a: "LTV drives SaaS valuation. Multiple of ARR/ARPU based on LTV:CAC. For 4:1 LTV:CAC: 10-15x ARR multiple. For 3:1: 8-10x. For 2:1: 5-8x. 8-12x is healthy SaaS multiple. Use TTM LTV:CAC for valuation. Investors: prefer 3:1+. Strong LTV:CAC: premium multiple. improve LTV:CAC before raising. Top: 5:1+ for premium valuations. Track quarterly. Show: improving trend." },
    { q: "What is the difference between LTV and customer lifetime?", a: "Customer lifetime: years (or months) before churn. LTV: total revenue/value. For 36-month lifetime at $100/mo: LTV $3,600. For 60-month at $100/mo: LTV $6,000. Lifetime: time. LTV: value. Most: use both. Lifetime for: support planning, retention focus. LTV for: valuation, unit economics. Calculate: lifetime = 1/churn (months). For 2% monthly: 50 months. For 5%: 20 months. Use: lifetime × ARPU = LTV (before margin)." },
  ],
  howToUse: [
    'Enter your average monthly revenue per user.',
    'Enter your gross margin percentage (typically 70-85% for SaaS).',
    'Enter your monthly churn rate as a percentage.',
    'Optionally enter your CAC to see LTV:CAC ratio and payback period.',
    'Review your LTV, customer lifetime, and unit economics health indicator.',
    'Scroll down to compare 5 LTV scenarios at different churn rates.',
  ],
  engineKey: true,
};

registerEngine(engine);
