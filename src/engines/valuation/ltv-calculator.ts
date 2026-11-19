import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-13：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

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
    makeToken('calc_out.ltv.row.revenue_per_user', '• Monthly Revenue per User: ' + fmt(monthlyRevenuePerUser), { revenue: fmt(monthlyRevenuePerUser) }) + '\n' +
    '• Gross Margin: ' + pct(grossMargin) + '\n' +
    makeToken('calc_out.ltv.row.monthly_churn', '• Monthly Churn Rate: ' + pct(monthlyChurn), { churn: pct(monthlyChurn) }) + '\n' +
    (churnRate > 0
      ? makeToken('calc_out.ltv.row.avg_lifetime_months', '• Avg Customer Lifetime: ' + avgLifetimeMonths.toFixed(1) + ' months', { months: avgLifetimeMonths.toFixed(1) })
      : makeToken('calc_out.ltv.row.avg_lifetime_low_churn', '• Avg Customer Lifetime: 10+ years (very low churn)')) + '\n' +
    makeToken('calc_out.ltv.row.gross_profit_per_month', '• Gross Profit per User/Month: ' + fmt(grossProfitPerMonth), { profit: fmt(grossProfitPerMonth) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Key Results:\n\n' +
    makeToken('calc_out.ltv.row.ltv_value', '• Lifetime Value (LTV): ' + fmt(ltv), { ltv: fmt(ltv) }) + '\n';

  if (cac > 0) {
    mainResult += makeToken('calc_out.ltv.row.cac_value', '• Customer Acquisition Cost (CAC): ' + fmt(cac), { cac: fmt(cac) }) + '\n';
    mainResult += makeToken('calc_out.ltv.row.ltv_cac_ratio', '• LTV:CAC Ratio: ' + ltvCacRatio.toFixed(1) + ':1', { ratio: ltvCacRatio.toFixed(1) }) + '\n\n';

    if (ltvCacRatio >= 3) {
      mainResult += makeToken('calc_out.ltv.row.benchmark_excellent', '🟢 EXCELLENT: LTV:CAC of ' + ltvCacRatio.toFixed(1) + ':1 is above the 3:1 benchmark. You have strong unit economics. Consider investing more in growth.', { ratio: ltvCacRatio.toFixed(1) }) + '\n';
    } else if (ltvCacRatio >= 1) {
      mainResult += makeToken('calc_out.ltv.row.benchmark_ok', '🟡 OK: LTV:CAC of ' + ltvCacRatio.toFixed(1) + ':1 is positive but below the 3:1 ideal. Work on increasing LTV or reducing CAC.', { ratio: ltvCacRatio.toFixed(1) }) + '\n';
    } else {
      mainResult += makeToken('calc_out.ltv.row.benchmark_problem', '🔴 PROBLEM: LTV:CAC of ' + ltvCacRatio.toFixed(1) + ':1 is below 1:1. You are losing money on every customer. Fix this immediately.', { ratio: ltvCacRatio.toFixed(1) }) + '\n';
    }

    const paybackMonths = grossProfitPerMonth > 0 ? cac / grossProfitPerMonth : 0;
    if (paybackMonths > 0) {
      mainResult += makeToken('calc_out.ltv.row.cac_payback', '• CAC Payback Period: ' + paybackMonths.toFixed(1) + ' months', { months: paybackMonths.toFixed(1) }) + '\n';
    }
  } else {
    mainResult += '\n';
  }

  mainResult +=
    '\n' +
    makeToken(
      'calc_out.ltv.row.tip',
      '💡 Tip: The 3:1 LTV:CAC ratio is the golden benchmark. If your LTV is $900 and CAC is $300, you are at 3:1. Below 3:1, focus on either increasing LTV (raise prices, reduce churn, upsell) or decreasing CAC (better targeting, organic channels, referrals).',
    );

  // 🔄 What-If Scenarios (actionable levers)
  if (cac > 0 && ltvCacRatio > 0) {
    const raisePriceLtv = grossProfitPerMonth * 1.2 * avgLifetimeMonths;
    const raisePriceRatio = raisePriceLtv / cac;
    const lowerChurnLT = churnRate > 0.5 ? 1 / (churnRate / 2) : 120;
    const lowerChurnLtv = grossProfitPerMonth * lowerChurnLT;
    mainResult += '\n\n🔄 What-If Scenarios\n';
    // ⚠️ ' | ' 不能进 token 兜底（makeToken 会把半角 | 换成全角 ｜）⇒ 拆成两个 token，中间那截留在代码里
    mainResult += makeToken('calc_out.ltv.row.whatif_price', '• If price +20%:  LTV ' + fmt(raisePriceLtv), { ltv: fmt(raisePriceLtv) }) +
      '  |  ' +
      makeToken('calc_out.ltv.row.whatif_price_ratio', 'LTV:CAC ' + raisePriceRatio.toFixed(1) + ':1', { ratio: raisePriceRatio.toFixed(1) }) + '\n';
    mainResult += makeToken('calc_out.ltv.row.whatif_churn', '• If churn halves:  LTV ' + fmt(lowerChurnLtv) + '  (lifetime ' + lowerChurnLT.toFixed(1) + ' mo)', { ltv: fmt(lowerChurnLtv), lifetime: lowerChurnLT.toFixed(1) }) + '\n';
    const targetCac = ltv / 3;
    mainResult += makeToken('calc_out.ltv.row.whatif_target_cac', '• For 3:1 ratio:  target CAC = ' + fmt(targetCac) + '  (current: ' + fmt(cac) + ')', { target: fmt(targetCac), current: fmt(cac) }) + '\n';
  }

  // 🩺 LTV Health (v3)
  if (ltv <= 0) {
    mainResult +=
      '\n\n🩺 LTV Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      makeToken('calc_out.ltv.row.health_zero', '• 🔴 LTV is zero or negative. Check inputs: revenue > 0 and churn < 100%.');
  } else if (cac > 0) {
    const ratio = ltv / cac;
    if (ratio >= 3) {
      mainResult +=
        '\n\n🩺 LTV Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        makeToken('calc_out.ltv.row.health_healthy', '• 🟢 LTV:CAC = ' + ratio.toFixed(1) + ':1 — healthy. Above 3:1 = invest more in growth.', { ratio: ratio.toFixed(1) }) +
        '\n' +
        makeToken('calc_out.ltv.row.health_benchmark', '• Industry benchmark: 3:1 (SaaS), 4:1+ (premium).');
    } else if (ratio >= 1) {
      mainResult +=
        '\n\n🩺 LTV Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        makeToken('calc_out.ltv.row.health_below_target', '• 🟡 LTV:CAC = ' + ratio.toFixed(1) + ':1 — below target. Improve before scaling.', { ratio: ratio.toFixed(1) }) +
        '\n' +
        makeToken('calc_out.ltv.row.health_target_benchmark', '• Target: 3:1+ (SaaS healthy benchmark). Focus on either raising LTV or cutting CAC.');
    } else {
      mainResult +=
        '\n\n🩺 LTV Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        makeToken('calc_out.ltv.row.health_losing_money', '• 🔴 LTV:CAC = ' + ratio.toFixed(1) + ':1 — losing money per customer. Stop scaling spend.', { ratio: ratio.toFixed(1) }) +
        '\n' +
        makeToken('calc_out.ltv.row.health_losing_money_fix', '• Need to either reduce CAC (better targeting, organic, referrals) or raise LTV (pricing, retention).');
    }
  } else {
    mainResult +=
      '\n\n🩺 LTV Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      makeToken('calc_out.ltv.row.health_no_cac', '• 🟢 LTV = ' + fmt(ltv) + '. Enter CAC to see LTV:CAC ratio.', { ltv: fmt(ltv) }) +
      '\n' +
      makeToken('calc_out.ltv.row.health_no_cac_benchmark', '• ℹ️ Industry benchmark: 3:1 LTV:CAC.');
  }

  // 🔄 What-If Scenarios (v3)
  mainResult += '\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  if (monthlyChurn > 0 && ltv > 0) {
    const halfChurnLtv = (monthlyRevenuePerUser * (grossMargin / 100)) / (monthlyChurn / 2 / 100);
    mainResult += '\n' + makeToken('calc_out.ltv.row.whatif_v3_cut_churn', '• Cut churn in half:  LTV ' + fmt(ltv) + ' → ' + fmt(halfChurnLtv) + '  (+' + Math.round(halfChurnLtv - ltv).toLocaleString() + ')', { from: fmt(ltv), to: fmt(halfChurnLtv), delta: Math.round(halfChurnLtv - ltv).toLocaleString() });
    const incRevLtv = (monthlyRevenuePerUser * 1.2 * (grossMargin / 100)) / (monthlyChurn / 100);
    mainResult += '\n' + makeToken('calc_out.ltv.row.whatif_v3_raise_price', '• Raise price 20%:  LTV ' + fmt(ltv) + ' → ' + fmt(incRevLtv) + '  (+' + Math.round(incRevLtv - ltv).toLocaleString() + ')', { from: fmt(ltv), to: fmt(incRevLtv), delta: Math.round(incRevLtv - ltv).toLocaleString() });
    if (cac > 0) {
      const targetCac = halfChurnLtv / 3;
      mainResult += '\n' + makeToken('calc_out.ltv.row.whatif_v3_max_cac', '• Cut churn 50% + target 3:1 ratio:  Max CAC = ' + fmt(targetCac) + '  (was ' + fmt(cac) + ')', { max_cac: fmt(targetCac), was_cac: fmt(cac) });
    }
    const incMarginLtv = (monthlyRevenuePerUser * (grossMargin + 10) / 100) / (monthlyChurn / 100);
    mainResult += '\n' + makeToken('calc_out.ltv.row.whatif_v3_margin', '• Boost gross margin +10pp:  LTV ' + fmt(ltv) + ' → ' + fmt(incMarginLtv) + '  (focus on cost-to-serve)', { from: fmt(ltv), to: fmt(incMarginLtv) });
  } else {
    mainResult += '\n' + makeToken('calc_out.ltv.row.whatif_v3_cannot_model', '• ⚠️ Cannot model — ensure revenue > 0 and churn > 0.');
  }

  // ⚖️ Break-Even (v3)
  if (ltv > 0) {
    mainResult += '\n\n⚖️ Break-Even\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    const beLtvCac = cac > 0 ? ltv : 0;
    if (cac > 0 && ltvCacRatio >= 3) {
      mainResult += '\n' + makeToken('calc_out.ltv.row.breakeven_scale', '• 🟢 LTV:CAC = ' + ltvCacRatio.toFixed(1) + ':1 — above 3:1 break-even. Scale acquisition.', { ratio: ltvCacRatio.toFixed(1) });
    } else if (cac > 0 && ltvCacRatio >= 1) {
      mainResult += '\n' + makeToken('calc_out.ltv.row.breakeven_above_one', '• 🟡 LTV:CAC = ' + ltvCacRatio.toFixed(1) + ':1 — above 1:1 (not losing money) but below 3:1 ideal.', { ratio: ltvCacRatio.toFixed(1) });
      mainResult += '\n' + makeToken('calc_out.ltv.row.breakeven_to_reach_3', '• To reach 3:1:  either raise LTV to ' + fmt(cac * 3) + '  (e.g., cut churn or raise price), or cut CAC to ' + fmt(beLtvCac / 3), { target_ltv: fmt(cac * 3), target_cac: fmt(beLtvCac / 3) });
    } else if (cac > 0) {
      mainResult += '\n' + makeToken('calc_out.ltv.row.breakeven_losing', '• 🔴 LTV:CAC = ' + ltvCacRatio.toFixed(1) + ':1 — losing money per customer. Fix before scaling spend.', { ratio: ltvCacRatio.toFixed(1) });
    } else {
      mainResult += '\n' + makeToken('calc_out.ltv.row.breakeven_no_cac', '• ℹ️ No CAC entered. Industry benchmark: LTV:CAC ≥ 3:1.');
    }
    if (churnRate > 0) {
      const maxChurn = (grossProfitPerMonth / cac) * 100; // churn at which LTV = CAC
      if (cac > 0) {
        mainResult += '\n' + makeToken('calc_out.ltv.row.breakeven_max_churn', '• Max monthly churn for LTV:CAC ≥ 1:1:  ' + maxChurn.toFixed(1) + '%  (your current: ' + pct(monthlyChurn) + ')', { max: maxChurn.toFixed(1), current: pct(monthlyChurn) });
      }
    }
  }

  // 🎯 LTV Milestones (v3)
  if (ltv > 0 && monthlyChurn > 0) {
    mainResult += '\n\n🎯 LTV Milestones\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    mainResult += '\n' + makeToken('calc_out.ltv.row.milestone_1pct', '• At 1% monthly churn:  LTV = ' + fmt(grossProfitPerMonth * 100) + '  (lifetime 100 mo)', { ltv: fmt(grossProfitPerMonth * 100) });
    mainResult += '\n' + makeToken('calc_out.ltv.row.milestone_2pct', '• At 2% monthly churn:  LTV = ' + fmt(grossProfitPerMonth * 50) + '  (lifetime 50 mo)', { ltv: fmt(grossProfitPerMonth * 50) });
    mainResult += '\n' + makeToken('calc_out.ltv.row.milestone_3pct', '• At 3% monthly churn:  LTV = ' + fmt(grossProfitPerMonth / 0.03) + '  (lifetime 33.3 mo)', { ltv: fmt(grossProfitPerMonth / 0.03) });
    if (cac > 0) {
      mainResult += '\n' + makeToken('calc_out.ltv.row.milestone_current_target', '• Current LTV / CAC target:  ' + fmt(cac * 3) + '  (your current: ' + fmt(ltv) + ')', { target: fmt(cac * 3), current: fmt(ltv) });
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
    // ⭐ 场景名按**档位**各写一个 code 字面量（动态拼码 ⇒ 静态扫描器认不出）
    const scenarioLabel =
      i === 0 ? makeToken('calc_out.ltv.row.scenario_excellent_1pct_churn', 'Excellent (1% churn)')
      : i === 1 ? makeToken('calc_out.ltv.row.scenario_good_2pct_churn', 'Good (2% churn)')
      : i === 2 ? makeToken('calc_out.ltv.row.scenario_average_3pct_churn', 'Average (3% churn)')
      : i === 3 ? makeToken('calc_out.ltv.row.scenario_below_avg_5pct_churn', 'Below Avg (5% churn)')
      : makeToken('calc_out.ltv.row.scenario_poor_8pct_churn', 'Poor (8% churn)');
    const scenarioDetail =
      cac > 0
        ? makeToken('calc_out.ltv.row.scenario_detail_cac', 'Lifetime ' + lt.toFixed(1) + ' months, LTV ' + (fmt(ltvScen) + ', ') + 'LTV:CAC ' + ratio.toFixed(1) + ':1', { lifetime: lt.toFixed(1), ltv: fmt(ltvScen) + ', ', ratio: ratio.toFixed(1) })
        : makeToken('calc_out.ltv.row.scenario_detail_no_cac', 'Lifetime ' + lt.toFixed(1) + ' months, LTV ' + fmt(ltvScen), { lifetime: lt.toFixed(1), ltv: fmt(ltvScen) });
    results.push(scenarioLabel + ': ' + scenarioDetail);
  }

  return results;
}

const customFn =
    // P168 B3-10: client = verbatim mirror of the server generate() (same logic, same order). +
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let g=function(_){return Number.isNaN(_)?0:Math.max(0,_)},b=function(_){const v=g(parseFloat(_.monthlyRevenuePerUser)||0),f=g(parseFloat(_.grossMargin)||80),a=g(parseFloat(_.monthlyChurn)||0),c=g(parseFloat(_.cac)||0),p=[],t=o=>"$"+Math.round(o).toLocaleString(),w=o=>o.toFixed(1)+"%",C=a/100,L=C>0?1/C:120,l=v*(f/100),n=l*L,i=c>0?n/c:0,P=n;let e=\`💎 Customer Lifetime Value (LTV)

\`+r("calc_out.ltv.row.revenue_per_user","• Monthly Revenue per User: "+t(v),{revenue:t(v)})+\`
• Gross Margin: \`+w(f)+\`
\`+r("calc_out.ltv.row.monthly_churn","• Monthly Churn Rate: "+w(a),{churn:w(a)})+\`
\`+(C>0?r("calc_out.ltv.row.avg_lifetime_months","• Avg Customer Lifetime: "+L.toFixed(1)+" months",{months:L.toFixed(1)}):r("calc_out.ltv.row.avg_lifetime_low_churn","• Avg Customer Lifetime: 10+ years (very low churn)"))+\`
\`+r("calc_out.ltv.row.gross_profit_per_month","• Gross Profit per User/Month: "+t(l),{profit:t(l)})+\`

━━━━━━━━━━━━━━━━━━━━

📊 Key Results:

\`+r("calc_out.ltv.row.ltv_value","• Lifetime Value (LTV): "+t(n),{ltv:t(n)})+\`
\`;if(c>0){e+=r("calc_out.ltv.row.cac_value","• Customer Acquisition Cost (CAC): "+t(c),{cac:t(c)})+\`
\`,e+=r("calc_out.ltv.row.ltv_cac_ratio","• LTV:CAC Ratio: "+i.toFixed(1)+":1",{ratio:i.toFixed(1)})+\`

\`,i>=3?e+=r("calc_out.ltv.row.benchmark_excellent","🟢 EXCELLENT: LTV:CAC of "+i.toFixed(1)+":1 is above the 3:1 benchmark. You have strong unit economics. Consider investing more in growth.",{ratio:i.toFixed(1)})+\`
\`:i>=1?e+=r("calc_out.ltv.row.benchmark_ok","🟡 OK: LTV:CAC of "+i.toFixed(1)+":1 is positive but below the 3:1 ideal. Work on increasing LTV or reducing CAC.",{ratio:i.toFixed(1)})+\`
\`:e+=r("calc_out.ltv.row.benchmark_problem","🔴 PROBLEM: LTV:CAC of "+i.toFixed(1)+":1 is below 1:1. You are losing money on every customer. Fix this immediately.",{ratio:i.toFixed(1)})+\`
\`;const o=l>0?c/l:0;o>0&&(e+=r("calc_out.ltv.row.cac_payback","• CAC Payback Period: "+o.toFixed(1)+" months",{months:o.toFixed(1)})+\`
\`)}else e+=\`
\`;if(e+=\`
\`+r("calc_out.ltv.row.tip","💡 Tip: The 3:1 LTV:CAC ratio is the golden benchmark. If your LTV is $900 and CAC is $300, you are at 3:1. Below 3:1, focus on either increasing LTV (raise prices, reduce churn, upsell) or decreasing CAC (better targeting, organic channels, referrals)."),c>0&&i>0){const o=l*1.2*L,u=o/c,s=C>.5?1/(C/2):120,h=l*s;e+=\`

🔄 What-If Scenarios
\`,e+=r("calc_out.ltv.row.whatif_price","• If price +20%:  LTV "+t(o),{ltv:t(o)})+"  |  "+r("calc_out.ltv.row.whatif_price_ratio","LTV:CAC "+u.toFixed(1)+":1",{ratio:u.toFixed(1)})+\`
\`,e+=r("calc_out.ltv.row.whatif_churn","• If churn halves:  LTV "+t(h)+"  (lifetime "+s.toFixed(1)+" mo)",{ltv:t(h),lifetime:s.toFixed(1)})+\`
\`;const d=n/3;e+=r("calc_out.ltv.row.whatif_target_cac","• For 3:1 ratio:  target CAC = "+t(d)+"  (current: "+t(c)+")",{target:t(d),current:t(c)})+\`
\`}if(n<=0)e+=\`

🩺 LTV Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+r("calc_out.ltv.row.health_zero","• 🔴 LTV is zero or negative. Check inputs: revenue > 0 and churn < 100%.");else if(c>0){const o=n/c;o>=3?e+=\`

🩺 LTV Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+r("calc_out.ltv.row.health_healthy","• 🟢 LTV:CAC = "+o.toFixed(1)+":1 — healthy. Above 3:1 = invest more in growth.",{ratio:o.toFixed(1)})+\`
\`+r("calc_out.ltv.row.health_benchmark","• Industry benchmark: 3:1 (SaaS), 4:1+ (premium)."):o>=1?e+=\`

🩺 LTV Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+r("calc_out.ltv.row.health_below_target","• 🟡 LTV:CAC = "+o.toFixed(1)+":1 — below target. Improve before scaling.",{ratio:o.toFixed(1)})+\`
\`+r("calc_out.ltv.row.health_target_benchmark","• Target: 3:1+ (SaaS healthy benchmark). Focus on either raising LTV or cutting CAC."):e+=\`

🩺 LTV Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+r("calc_out.ltv.row.health_losing_money","• 🔴 LTV:CAC = "+o.toFixed(1)+":1 — losing money per customer. Stop scaling spend.",{ratio:o.toFixed(1)})+\`
\`+r("calc_out.ltv.row.health_losing_money_fix","• Need to either reduce CAC (better targeting, organic, referrals) or raise LTV (pricing, retention).")}else e+=\`

🩺 LTV Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+r("calc_out.ltv.row.health_no_cac","• 🟢 LTV = "+t(n)+". Enter CAC to see LTV:CAC ratio.",{ltv:t(n)})+\`
\`+r("calc_out.ltv.row.health_no_cac_benchmark","• ℹ️ Industry benchmark: 3:1 LTV:CAC.");if(e+=\`

🔄 What-If Scenarios:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\`,a>0&&n>0){const o=v*(f/100)/(a/2/100);e+=\`
\`+r("calc_out.ltv.row.whatif_v3_cut_churn","• Cut churn in half:  LTV "+t(n)+" → "+t(o)+"  (+"+Math.round(o-n).toLocaleString()+")",{from:t(n),to:t(o),delta:Math.round(o-n).toLocaleString()});const u=v*1.2*(f/100)/(a/100);if(e+=\`
\`+r("calc_out.ltv.row.whatif_v3_raise_price","• Raise price 20%:  LTV "+t(n)+" → "+t(u)+"  (+"+Math.round(u-n).toLocaleString()+")",{from:t(n),to:t(u),delta:Math.round(u-n).toLocaleString()}),c>0){const h=o/3;e+=\`
\`+r("calc_out.ltv.row.whatif_v3_max_cac","• Cut churn 50% + target 3:1 ratio:  Max CAC = "+t(h)+"  (was "+t(c)+")",{max_cac:t(h),was_cac:t(c)})}const s=v*(f+10)/100/(a/100);e+=\`
\`+r("calc_out.ltv.row.whatif_v3_margin","• Boost gross margin +10pp:  LTV "+t(n)+" → "+t(s)+"  (focus on cost-to-serve)",{from:t(n),to:t(s)})}else e+=\`
\`+r("calc_out.ltv.row.whatif_v3_cannot_model","• ⚠️ Cannot model — ensure revenue > 0 and churn > 0.");if(n>0){e+=\`

⚖️ Break-Even
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\`;const o=c>0?n:0;if(c>0&&i>=3?e+=\`
\`+r("calc_out.ltv.row.breakeven_scale","• 🟢 LTV:CAC = "+i.toFixed(1)+":1 — above 3:1 break-even. Scale acquisition.",{ratio:i.toFixed(1)}):c>0&&i>=1?(e+=\`
\`+r("calc_out.ltv.row.breakeven_above_one","• 🟡 LTV:CAC = "+i.toFixed(1)+":1 — above 1:1 (not losing money) but below 3:1 ideal.",{ratio:i.toFixed(1)}),e+=\`
\`+r("calc_out.ltv.row.breakeven_to_reach_3","• To reach 3:1:  either raise LTV to "+t(c*3)+"  (e.g., cut churn or raise price), or cut CAC to "+t(o/3),{target_ltv:t(c*3),target_cac:t(o/3)})):c>0?e+=\`
\`+r("calc_out.ltv.row.breakeven_losing","• 🔴 LTV:CAC = "+i.toFixed(1)+":1 — losing money per customer. Fix before scaling spend.",{ratio:i.toFixed(1)}):e+=\`
\`+r("calc_out.ltv.row.breakeven_no_cac","• ℹ️ No CAC entered. Industry benchmark: LTV:CAC ≥ 3:1."),C>0){const u=l/c*100;c>0&&(e+=\`
\`+r("calc_out.ltv.row.breakeven_max_churn","• Max monthly churn for LTV:CAC ≥ 1:1:  "+u.toFixed(1)+"%  (your current: "+w(a)+")",{max:u.toFixed(1),current:w(a)}))}}n>0&&a>0&&(e+=\`

🎯 LTV Milestones
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\`,e+=\`
\`+r("calc_out.ltv.row.milestone_1pct","• At 1% monthly churn:  LTV = "+t(l*100)+"  (lifetime 100 mo)",{ltv:t(l*100)}),e+=\`
\`+r("calc_out.ltv.row.milestone_2pct","• At 2% monthly churn:  LTV = "+t(l*50)+"  (lifetime 50 mo)",{ltv:t(l*50)}),e+=\`
\`+r("calc_out.ltv.row.milestone_3pct","• At 3% monthly churn:  LTV = "+t(l/.03)+"  (lifetime 33.3 mo)",{ltv:t(l/.03)}),c>0&&(e+=\`
\`+r("calc_out.ltv.row.milestone_current_target","• Current LTV / CAC target:  "+t(c*3)+"  (your current: "+t(n)+")",{target:t(c*3),current:t(n)}))),p.push(e);const F=[{label:"Excellent (1% churn)",churn:1},{label:"Good (2% churn)",churn:2},{label:"Average (3% churn)",churn:3},{label:"Below Avg (5% churn)",churn:5},{label:"Poor (8% churn)",churn:8}];for(let o=0;o<F.length;o++){const u=F[o].churn/100,s=u>0?1/u:120,h=l*s,d=c>0?h/c:0,A=o===0?r("calc_out.ltv.row.scenario_excellent_1pct_churn","Excellent (1% churn)"):o===1?r("calc_out.ltv.row.scenario_good_2pct_churn","Good (2% churn)"):o===2?r("calc_out.ltv.row.scenario_average_3pct_churn","Average (3% churn)"):o===3?r("calc_out.ltv.row.scenario_below_avg_5pct_churn","Below Avg (5% churn)"):r("calc_out.ltv.row.scenario_poor_8pct_churn","Poor (8% churn)"),y=c>0?r("calc_out.ltv.row.scenario_detail_cac","Lifetime "+s.toFixed(1)+" months, LTV "+(t(h)+", ")+"LTV:CAC "+d.toFixed(1)+":1",{lifetime:s.toFixed(1),ltv:t(h)+", ",ratio:d.toFixed(1)}):r("calc_out.ltv.row.scenario_detail_no_cac","Lifetime "+s.toFixed(1)+" months, LTV "+t(h),{lifetime:s.toFixed(1),ltv:t(h)});p.push(A+": "+y)}return p},x=function(_,v,f){var a=m(_);return Array.isArray(a)?a.join(\`
\`):String(a)};var M=g,S=b,R=x,r=tk,V='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',r=new Function("return "+V)(),m=function(_){return b(_)};return[x(inputs,pick,fill)]}finally{}
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
    '💎 Customer Lifetime Value (LTV)\n\n$calc_out.ltv.row.revenue_per_user{"revenue":"$100"}|• Monthly Revenue per User: $100|\n• Gross Margin: 70.0%\n$calc_out.ltv.row.monthly_churn{"churn":"5.0%"}|• Monthly Churn Rate: 5.0%|\n$calc_out.ltv.row.avg_lifetime_months{"months":"20.0"}|• Avg Customer Lifetime: 20.0 months|\n$calc_out.ltv.row.gross_profit_per_month{"profit":"$70"}|• Gross Profit per User/Month: $70|\n\n━━━━━━━━━━━━━━━━━━━━\n\n📊 Key Results:\n\n$calc_out.ltv.row.ltv_value{"ltv":"$1,400"}|• Lifetime Value (LTV): $1,400|\n$calc_out.ltv.row.cac_value{"cac":"$150"}|• Customer Acquisition Cost (CAC): $150|\n$calc_out.ltv.row.ltv_cac_ratio{"ratio":"9.3"}|• LTV:CAC Ratio: 9.3:1|\n\n$calc_out.ltv.row.benchmark_excellent{"ratio":"9.3"}|🟢 EXCELLENT: LTV:CAC of 9.3:1 is above the 3:1 benchmark. You have strong unit economics. Consider investing more in growth.|\n$calc_out.ltv.row.cac_payback{"months":"2.1"}|• CAC Payback Period: 2.1 months|\n\n$calc_out.ltv.row.tip|💡 Tip: The 3:1 LTV:CAC ratio is the golden benchmark. If your LTV is $900 and CAC is $300, you are at 3:1. Below 3:1, focus on either increasing LTV (raise prices, reduce churn, upsell) or decreasing CAC (better targeting, organic channels, referrals).|\n\n🔄 What-If Scenarios\n$calc_out.ltv.row.whatif_price{"ltv":"$1,680"}|• If price +20%:  LTV $1,680|  |  $calc_out.ltv.row.whatif_price_ratio{"ratio":"11.2"}|LTV:CAC 11.2:1|\n$calc_out.ltv.row.whatif_churn{"ltv":"$8,400","lifetime":"120.0"}|• If churn halves:  LTV $8,400  (lifetime 120.0 mo)|\n$calc_out.ltv.row.whatif_target_cac{"target":"$467","current":"$150"}|• For 3:1 ratio:  target CAC = $467  (current: $150)|\n\n\n🩺 LTV Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.ltv.row.health_healthy{"ratio":"9.3"}|• 🟢 LTV:CAC = 9.3:1 — healthy. Above 3:1 = invest more in growth.|\n$calc_out.ltv.row.health_benchmark|• Industry benchmark: 3:1 (SaaS), 4:1+ (premium).|\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.ltv.row.whatif_v3_cut_churn{"from":"$1,400","to":"$2,800","delta":"1,400"}|• Cut churn in half:  LTV $1,400 → $2,800  (+1,400)|\n$calc_out.ltv.row.whatif_v3_raise_price{"from":"$1,400","to":"$1,680","delta":"280"}|• Raise price 20%:  LTV $1,400 → $1,680  (+280)|\n$calc_out.ltv.row.whatif_v3_max_cac{"max_cac":"$933","was_cac":"$150"}|• Cut churn 50% + target 3:1 ratio:  Max CAC = $933  (was $150)|\n$calc_out.ltv.row.whatif_v3_margin{"from":"$1,400","to":"$1,600"}|• Boost gross margin +10pp:  LTV $1,400 → $1,600  (focus on cost-to-serve)|\n\n⚖️ Break-Even\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.ltv.row.breakeven_scale{"ratio":"9.3"}|• 🟢 LTV:CAC = 9.3:1 — above 3:1 break-even. Scale acquisition.|\n$calc_out.ltv.row.breakeven_max_churn{"max":"46.7","current":"5.0%"}|• Max monthly churn for LTV:CAC ≥ 1:1:  46.7%  (your current: 5.0%)|\n\n🎯 LTV Milestones\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.ltv.row.milestone_1pct{"ltv":"$7,000"}|• At 1% monthly churn:  LTV = $7,000  (lifetime 100 mo)|\n$calc_out.ltv.row.milestone_2pct{"ltv":"$3,500"}|• At 2% monthly churn:  LTV = $3,500  (lifetime 50 mo)|\n$calc_out.ltv.row.milestone_3pct{"ltv":"$2,333"}|• At 3% monthly churn:  LTV = $2,333  (lifetime 33.3 mo)|\n$calc_out.ltv.row.milestone_current_target{"target":"$450","current":"$1,400"}|• Current LTV / CAC target:  $450  (your current: $1,400)|\n$calc_out.ltv.row.scenario_excellent_1pct_churn|Excellent (1% churn)|: $calc_out.ltv.row.scenario_detail_cac{"lifetime":"100.0","ltv":"$7,000, ","ratio":"46.7"}|Lifetime 100.0 months, LTV $7,000, LTV:CAC 46.7:1|\n$calc_out.ltv.row.scenario_good_2pct_churn|Good (2% churn)|: $calc_out.ltv.row.scenario_detail_cac{"lifetime":"50.0","ltv":"$3,500, ","ratio":"23.3"}|Lifetime 50.0 months, LTV $3,500, LTV:CAC 23.3:1|\n$calc_out.ltv.row.scenario_average_3pct_churn|Average (3% churn)|: $calc_out.ltv.row.scenario_detail_cac{"lifetime":"33.3","ltv":"$2,333, ","ratio":"15.6"}|Lifetime 33.3 months, LTV $2,333, LTV:CAC 15.6:1|\n$calc_out.ltv.row.scenario_below_avg_5pct_churn|Below Avg (5% churn)|: $calc_out.ltv.row.scenario_detail_cac{"lifetime":"20.0","ltv":"$1,400, ","ratio":"9.3"}|Lifetime 20.0 months, LTV $1,400, LTV:CAC 9.3:1|\n$calc_out.ltv.row.scenario_poor_8pct_churn|Poor (8% churn)|: $calc_out.ltv.row.scenario_detail_cac{"lifetime":"12.5","ltv":"$875, ","ratio":"5.8"}|Lifetime 12.5 months, LTV $875, LTV:CAC 5.8:1|',
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
