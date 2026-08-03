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
  "var cnn=function(x){return Math.max(0,x)};" +
  "var mru=cnn(parseFloat(inputs.monthlyRevenuePerUser)||0);" +
  "var gm=cnn(parseFloat(inputs.grossMargin)||80);" +
  "var mc=cnn(parseFloat(inputs.monthlyChurn)||0);" +
  "var cacV=cnn(parseFloat(inputs.cac)||0);" +
  "function fmt3(n){return '$'+Math.round(n).toLocaleString()}" +
  "function pct3(n){return n.toFixed(1)+'%'}" +
  "var cr3=mc/100;" +
  "var alt=cr3>0?1/cr3:120;" +
  "var gpm=mru*(gm/100);" +
  "var ltv=gpm*alt;" +
  "var lcr=cacV>0?ltv/cacV:0;" +
  "var mr5='';" +
  "mr5+='\\uD83D\\uDC8E Customer Lifetime Value (LTV)\\n\\n';" +
  "mr5+='\\u2022 Monthly Revenue per User: '+fmt3(mru)+'\\n';" +
  "mr5+='\\u2022 Gross Margin: '+pct3(gm)+'\\n';" +
  "mr5+='\\u2022 Monthly Churn Rate: '+pct3(mc)+'\\n';" +
  "mr5+='\\u2022 Avg Customer Lifetime: '+(cr3>0?alt.toFixed(1)+' months':'10+ years (very low churn)')+'\\n';" +
  "mr5+='\\u2022 Gross Profit per User/Month: '+fmt3(gpm)+'\\n\\n';" +
  "mr5+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "mr5+='\\uD83D\\uDCCA Key Results:\\n\\n';" +
  "mr5+='\\u2022 Lifetime Value (LTV): '+fmt3(ltv)+'\\n';" +
  "if(cacV>0){mr5+='\\u2022 Customer Acquisition Cost (CAC): '+fmt3(cacV)+'\\n';mr5+='\\u2022 LTV:CAC Ratio: '+lcr.toFixed(1)+':1\\n\\n';" +
  "if(lcr>=3)mr5+='\\uD83D\\uDFE2 EXCELLENT: LTV:CAC of '+lcr.toFixed(1)+':1 is above the 3:1 benchmark. You have strong unit economics. Consider investing more in growth.\\n';" +
  "else if(lcr>=1)mr5+='\\uD83D\\uDFE1 OK: LTV:CAC of '+lcr.toFixed(1)+':1 is positive but below the 3:1 ideal. Work on increasing LTV or reducing CAC.\\n';" +
  "else mr5+='\\uD83D\\uDD34 PROBLEM: LTV:CAC of '+lcr.toFixed(1)+':1 is below 1:1. You are losing money on every customer. Fix this immediately.\\n';" +
  "var pm2=gpm>0?cacV/gpm:0;if(pm2>0)mr5+='\\u2022 CAC Payback Period: '+pm2.toFixed(1)+' months\\n';}" +
  "mr5+='\\n\\uD83D\\uDCA1 Tip: The 3:1 LTV:CAC ratio is the golden benchmark. If your LTV is $900 and CAC is $300, you are at 3:1. Below 3:1, focus on either increasing LTV (raise prices, reduce churn, upsell) or decreasing CAC (better targeting, organic channels, referrals).';" +
  "if(cacV>0&&lcr>0){" +
  "var rpLtv=gpm*1.2*alt;var rpRatio=rpLtv/cacV;" +
  "var lcLT=cr3>0.5?1/(cr3/2):120;var lcLtv=gpm*lcLT;" +
  "var tCac=ltv/3;" +
  "mr5+='\\n\\n\\uD83D\\uDD04 What-If Scenarios\\n';" +
  "mr5+='\\u2022 If price +20%:  LTV $'+Math.round(rpLtv).toLocaleString()+'  |  LTV:CAC '+rpRatio.toFixed(1)+':1\\n';" +
  "mr5+='\\u2022 If churn halves:  LTV $'+Math.round(lcLtv).toLocaleString()+'  (lifetime '+lcLT.toFixed(1)+' mo)\\n';" +
  "mr5+='\\u2022 For 3:1 ratio:  target CAC = $'+Math.round(tCac).toLocaleString()+'  (current: $'+Math.round(cacV).toLocaleString()+')\\n';" +
  "}" +
  "// 🩺 LTV Health (v3)\n" +
  "mr5+='\\n\\n\\uD83E\\uDE7A LTV Health:\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n';" +
  "if(ltv<=0){mr5+='• \\uD83D\\uDD34 LTV is zero or negative. Check inputs: revenue > 0 and churn < 100%.';}" +
  "else if(cacV>0){" +
  "if(lcr>=3)mr5+='• \\uD83D\\uDFE2 LTV:CAC = '+lcr.toFixed(1)+':1 \\u2014 healthy. Above 3:1 = invest more in growth.\\n• Industry benchmark: 3:1 (SaaS), 4:1+ (premium).';" +
  "else if(lcr>=1)mr5+='• \\uD83D\\uDFE1 LTV:CAC = '+lcr.toFixed(1)+':1 \\u2014 below target. Improve before scaling.\\n• Target: 3:1+ (SaaS healthy benchmark). Focus on either raising LTV or cutting CAC.';" +
  "else mr5+='• \\uD83D\\uDD34 LTV:CAC = '+lcr.toFixed(1)+':1 \\u2014 losing money per customer. Stop scaling spend.\\n• Need to either reduce CAC (better targeting, organic, referrals) or raise LTV (pricing, retention).';" +
  "}else mr5+='• \\uD83D\\uDFE2 LTV = $'+Math.round(ltv).toLocaleString()+'. Enter CAC to see LTV:CAC ratio.\\n• \\u2139\\uFE0F Industry benchmark: 3:1 LTV:CAC.';" +
  "// 🔄 What-If (v3)\n" +
  "mr5+='\\n\\n\\uD83D\\uDD04 What-If Scenarios:\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n';" +
  "if(mc>0&&ltv>0){" +
  "var hcLtv=gpm/(mc/2/100);mr5+='• Cut churn in half:  LTV $'+Math.round(ltv).toLocaleString()+' \\u2192 $'+Math.round(hcLtv).toLocaleString()+'  (+'+Math.round(hcLtv-ltv).toLocaleString()+')';" +
  "var irLtv=(mru*1.2*(gm/100))/(mc/100);mr5+='\\n• Raise price 20%:  LTV $'+Math.round(ltv).toLocaleString()+' \\u2192 $'+Math.round(irLtv).toLocaleString()+'  (+'+Math.round(irLtv-ltv).toLocaleString()+')';" +
  "var imLtv=(mru*(gm+10)/100)/(mc/100);mr5+='\\n• Boost gross margin +10pp:  LTV $'+Math.round(ltv).toLocaleString()+' \\u2192 $'+Math.round(imLtv).toLocaleString()+'  (focus on cost-to-serve)';" +
  "}else mr5+='\\n• \\u26A0\\uFE0F Cannot model — ensure revenue > 0 and churn > 0.';" +
  "var results=[mr5];" +
  "var cs5=[{l:'Excellent (1% churn)',c:1},{l:'Good (2% churn)',c:2},{l:'Average (3% churn)',c:3},{l:'Below Avg (5% churn)',c:5},{l:'Poor (8% churn)',c:8}];" +
  "for(var i=0;i<cs5.length;i++){var crr=cs5[i].c/100;var ltt=crr>0?1/crr:120;var lts=gpm*ltt;var rt=cacV>0?lts/cacV:0;results.push(cs5[i].l+': Lifetime '+ltt.toFixed(1)+' months, LTV '+fmt3(lts)+(cacV>0?', LTV:CAC '+rt.toFixed(1)+':1':''));}" +
  "if(ltv>0){mr5+='\\n\\n\\u2696\\uFE0F Break-Even\\n\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501';if(cacV>0&&lcr>=3)mr5+='\\n\\u2022 \\uD83D\\uDFE2 LTV:CAC = '+lcr.toFixed(1)+':1 \\u2014 above 3:1 break-even. Scale acquisition.';else if(cacV>0&&lcr>=1){mr5+='\\n\\u2022 \\uD83D\\uDFE1 LTV:CAC = '+lcr.toFixed(1)+':1 \\u2014 above 1:1 (not losing money) but below 3:1 ideal.\\n\\u2022 To reach 3:1:  either raise LTV to $'+Math.round(cacV*3).toLocaleString()+'  (e.g., cut churn or raise price), or cut CAC to $'+Math.round(ltv/3).toLocaleString();}else if(cacV>0)mr5+='\\n\\u2022 \\uD83D\\uDD34 LTV:CAC = '+lcr.toFixed(1)+':1 \\u2014 losing money per customer. Fix before scaling spend.';else mr5+='\\n\\u2022 \\u2139\\uFE0F No CAC entered. Industry benchmark: LTV:CAC \\u2265 3:1.';if(mc>0&&cacV>0){var mc2=(gpm/cacV)*100;mr5+='\\n\\u2022 Max monthly churn for LTV:CAC \\u2265 1:1:  '+mc2.toFixed(1)+'%  (your current: '+pct3(mc)+')';}}" +
  "if(ltv>0&&mc>0){mr5+='\\n\\n\\uD83C\\uDFAF LTV Milestones\\n\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501';mr5+='\\n\\u2022 At 1% monthly churn:  LTV = $'+Math.round(gpm*100).toLocaleString()+'  (lifetime 100 mo)';mr5+='\\n\\u2022 At 2% monthly churn:  LTV = $'+Math.round(gpm*50).toLocaleString()+'  (lifetime 50 mo)';mr5+='\\n\\u2022 At 3% monthly churn:  LTV = $'+Math.round(gpm/0.03).toLocaleString()+'  (lifetime 33.3 mo)';if(cacV>0)mr5+='\\n\\u2022 Current LTV / CAC target:  $'+Math.round(cacV*3).toLocaleString()+'  (your current: $'+Math.round(ltv).toLocaleString()+')';}" +
  "return results;";

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
  generate(inputs: Record<string, string>): string[] {
    return calculateLTV(inputs);
  },
  staticExamples: [
    '💎 Customer Lifetime Value (LTV)\n\n• Monthly Revenue per User: $100\n• Gross Margin: 70.0%\n• Monthly Churn Rate: 5.0%\n• Avg Customer Lifetime: 20.0 months\n• Gross Profit per User/Month: $70\n\n━━━━━━━━━━━━━━━━━━━━\n\n📊 Key Results:\n\n• Lifetime Value (LTV): $1,400\n\n\n💡 Tip: The 3:1 LTV:CAC ratio is the golden benchmark. If your LTV is $900 and CAC is $300, you are at 3:1. Below 3:1, focus on either increasing LTV (raise prices, reduce churn, upsell) or decreasing CAC (better targeting, organic channels, referrals).\n\n🩺 LTV Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 LTV = $1,400. Enter CAC to see LTV:CAC ratio.\n• ℹ️ Industry benchmark: 3:1 LTV:CAC.\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Cut churn in half:  LTV $1,400 → $2,800  (+1,400)\n• Raise price 20%:  LTV $1,400 → $1,680  (+280)\n• Boost gross margin +10pp:  LTV $1,400 → $1,600  (focus on cost-to-serve)\n\n⚖️ Break-Even\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• ℹ️ No CAC entered. Industry benchmark: LTV:CAC ≥ 3:1.\n\n🎯 LTV Milestones\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• At 1% monthly churn:  LTV = $7,000  (lifetime 100 mo)\n• At 2% monthly churn:  LTV = $3,500  (lifetime 50 mo)\n• At 3% monthly churn:  LTV = $2,333  (lifetime 33.3 mo)\nExcellent (1% churn): Lifetime 100.0 months, LTV $7,000\nGood (2% churn): Lifetime 50.0 months, LTV $3,500\nAverage (3% churn): Lifetime 33.3 months, LTV $2,333\nBelow Avg (5% churn): Lifetime 20.0 months, LTV $1,400\nPoor (8% churn): Lifetime 12.5 months, LTV $875',
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
    { q: "What is LTV (Customer Lifetime Value)?", a: "LTV = total revenue from customer over their lifetime. Formula: ARPU × gross_margin / churn. For $100 ARPU, 80% margin, 5% monthly churn: $100 × 0.8 / 0.05 = $1,600 LTV. Use: 1) Unit economics, 2) Marketing ROI, 3) Valuation. Benchmarks: SaaS 3-7x CAC. Most: track by cohort. Tools: ChartMogul, Baremetrics, custom. Most: LTV 12-36 months is healthy. Calculate: gross LTV (revenue) or net LTV (margin)." },
    { q: "What is a good LTV:CAC ratio for SaaS?", a: "Benchmarks: 1) 1:1 = break-even, 2) 3:1 = healthy, 3) 5:1 = under-investing, 4) 10:1 = excellent. By stage: 1) Seed: 2:1+ (acceptable), 2) Series A: 3:1+, 3) Series B+: 4:1+. For investors: 3:1 is the gate. Below 2:1: scaling issues. Above 5:1: under-investing (could grow faster). Most: target 3-4:1. Top: 5:1+. Calculate: (LTV × gross_margin) / CAC. Be honest: use net LTV." },
    { q: "How do I increase LTV?", a: "Top tactics: 1) Reduce churn (biggest lever), 2) Increase ARPU (pricing, upsell), 3) Increase gross margin, 4) Win-back churned customers. Most: 30-50% LTV lift in 12 months. Top tactic: reduce churn (1 pp churn = 10-20% LTV lift). Other tactics: pricing (10% price = 10% LTV), upsell (5-15% expansion). Most: focus on retention first. Best: churn + pricing + upsell combined." },
    { q: "What is the difference between gross and net LTV?", a: "Gross LTV: total revenue per customer. Net LTV: revenue minus cost to serve. For LTV:CAC: use net. Calculate: gross_revenue × gross_margin - support_cost. For $1K gross, 80% margin, $100 support: net $700. Most: net LTV is 50-80% of gross. For unit economics: always use net. For valuation: use gross (revenue-based). Most teams: net LTV is the real number. Calculate: net LTV × 1.5x = gross LTV (rough)." },
    { q: "How do I calculate LTV with different churn rates?", a: "Formula: LTV = ARPU × gross_margin / churn. For 1% monthly: 100x ARPU (long LTV). For 5% monthly: 20x ARPU. For 10% monthly: 10x. Calculate: by cohort. Track: how LTV changes as churn changes. Most: 1 pp monthly churn reduction = 10-25% LTV lift. For 5% to 4% monthly: 25% LTV lift. Use: cohort-based (real customers). Most: predictable LTV after 12 months of data. Tools: cohort analysis." },
    { q: "What is a good LTV for SaaS by stage?", a: "Benchmarks: 1) Seed: $500-2K, 2) Series A: $2-5K, 3) Series B: $5-15K, 4) Series C+: $15K+. By segment: 1) SMB: $500-3K, 2) Mid-market: $3-15K, 3) Enterprise: $15K-100K. By product: 1) Vertical SaaS: 2-3x horizontal, 2) Horizontal SaaS: lower, 3) Usage-based: higher. Most: aim for LTV 3x CAC. Track: by cohort. Top performers: 5-10x CAC. Most: $5K+ LTV by Series A is healthy." },
    { q: "How is LTV used for valuation?", a: "LTV drives SaaS valuation. Multiple of ARR/ARPU based on LTV:CAC. For 4:1 LTV:CAC: 10-15x ARR multiple. For 3:1: 8-10x. For 2:1: 5-8x. Most: 8-12x is healthy SaaS multiple. Use: TTM LTV:CAC for valuation. Investors: prefer 3:1+. Strong LTV:CAC: premium multiple. Most: improve LTV:CAC before raising. Top: 5:1+ for premium valuations. Track: quarterly. Show: improving trend." },
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
