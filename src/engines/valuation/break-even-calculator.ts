import type { ToolEngine } from "../../core/engines/types";
import { registerEngine } from "../../core/engines/registry";
import { clampNonNegative } from "../../core/engines/helpers";
// P168 B3-14：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from "../../lib/calc-output-i18n";

function calculateBreakEven(inputs: Record<string, string>): string[] {
  const fmt = (n: number) => "$" + Math.round(n).toLocaleString();
  const pct = (n: number) => n.toFixed(1) + "%";

  const monthlyCosts = clampNonNegative(parseFloat(inputs.monthlyCosts) || 0);
  const monthlyRevenue = clampNonNegative(parseFloat(inputs.monthlyRevenue) || 0);
  const initialInvestment = clampNonNegative(parseFloat(inputs.initialInvestment) || 0);
  // intentionally NOT clamped: semantically can be negative (declining revenue)
  const monthlyGrowthRate = parseFloat(inputs.monthlyGrowthRate) || 0;

  const growthFactor = 1 + monthlyGrowthRate / 100;
  const flatMonthlyProfit = monthlyRevenue - monthlyCosts;
  const flatMonths = flatMonthlyProfit > 0 ? Math.ceil(initialInvestment / flatMonthlyProfit) : null;

  let growthMonths: number | null = null;
  let cumulativeLoss = -initialInvestment;
  for (let m = 1; m <= 60; m++) {
    const rev = monthlyRevenue * Math.pow(growthFactor, m - 1);
    cumulativeLoss += rev - monthlyCosts;
    if (growthMonths === null && cumulativeLoss >= 0) { growthMonths = m; break; }
  }

  // P168 B3-14：结果输出 token 化 —— 英文兜底与改写前**逐字相同**，运行时数值一律进 params
  const invLabel = fmt(initialInvestment);
  const costsLabel = fmt(monthlyCosts);
  const revenueLabel = fmt(monthlyRevenue);
  const growthLabel = pct(monthlyGrowthRate);

  let result =
    makeToken('calc_out.section.break_even_analysis', '📊 Break-Even Analysis') +
    '\n\n' +
    makeToken('calc_out.section.break_even_timeline', '⏱️ Break-Even Timeline') +
    '\n';
  result +=
    makeToken('calc_out.break_even.row.initial_investment', '• Initial Investment:  ' + invLabel, { value: invLabel }) + '\n' +
    makeToken('calc_out.break_even.row.monthly_costs', '• Monthly Costs:       ' + costsLabel + '/mo', { value: costsLabel }) + '\n' +
    makeToken('calc_out.break_even.row.monthly_revenue', '• Monthly Revenue:     ' + revenueLabel + '/mo', { value: revenueLabel }) + '\n';

  if (flatMonths !== null) result += makeToken('calc_out.break_even.row.flat_revenue', '• Flat revenue:        ' + String(flatMonths) + ' months', { months: String(flatMonths) }) + '\n';
  else result += makeToken('calc_out.break_even.row.flat_revenue_never', '• Flat revenue:        Never — monthly costs exceed revenue. You need growth or lower costs.') + '\n';

  if (monthlyGrowthRate > 0 && growthMonths !== null) {
    result += makeToken('calc_out.break_even.row.with_growth', '• With ' + growthLabel + ' growth:  ' + String(growthMonths) + ' months', { growth: growthLabel, months: String(growthMonths) });
    if (flatMonths !== null) result += makeToken('calc_out.break_even.row.growth_faster', '  (' + String(flatMonths - growthMonths) + ' months faster)', { months: String(flatMonths - growthMonths) });
    result += '\n';
  } else if (monthlyGrowthRate > 0 && growthMonths === null) {
    result += makeToken('calc_out.break_even.row.with_growth_never', '• With ' + growthLabel + ' growth:  Not within 60 months — need faster growth or lower costs.', { growth: growthLabel }) + '\n';
  }

  if (growthMonths !== null) {
    if (growthMonths <= 6) result += makeToken('calc_out.break_even.row.verdict_excellent', '🟢 Excellent! Breaking even in under 6 months is a very healthy trajectory.') + '\n';
    else if (growthMonths <= 12) result += makeToken('calc_out.break_even.row.verdict_solid', '🟡 Solid — breaking even within a year. Keep an eye on costs.') + '\n';
    else if (growthMonths <= 24) result += makeToken('calc_out.break_even.row.verdict_manageable', '🟠 Manageable but slow — 1-2 years to break even. Consider boosting growth.') + '\n';
    else result += makeToken('calc_out.break_even.row.verdict_long_road', '🔴 Long road — over 2 years. Review whether this is sustainable.') + '\n';
  }

  if (flatMonthlyProfit > 0 || monthlyGrowthRate > 0) {
    result += '\n' + makeToken('calc_out.section.break_even_cumulative', '📈 Cumulative P&L Outlook') + '\n';
    const checkpoints = [3, 6, 12, 24];
    for (const mo of checkpoints) {
      let cum = -initialInvestment;
      for (let m = 1; m <= mo; m++) {
        const rev = monthlyRevenue * Math.pow(growthFactor, m - 1);
        cum += rev - monthlyCosts;
      }
      result += (cum >= 0
        ? makeToken('calc_out.break_even.row.month_checkpoint_positive', '• Month ' + String(mo) + ': +' + fmt(cum) + ' ✅', { month: String(mo), value: fmt(cum) })
        : makeToken('calc_out.break_even.row.month_checkpoint_negative', '• Month ' + String(mo) + ': ' + fmt(cum), { month: String(mo), value: fmt(cum) })) + '\n';
    }
  }

  // 🔄 What-If Scenarios — cost reduction or price increase impact
  if (monthlyRevenue > 0 && monthlyCosts > 0) {
    result += '\n' + makeToken('calc_out.section.break_even_what_if', '🔄 What-If Scenarios') + '\n';
    // Cut costs 20%
    if (monthlyCosts > 0) {
      const newCosts = monthlyCosts * 0.8;
      const newProfit = monthlyRevenue - newCosts;
      const newMonths = newProfit > 0 ? Math.ceil(initialInvestment / newProfit) : null;
      const profitLabel = '$' + Math.round(monthlyRevenue - monthlyCosts).toLocaleString();
      const newProfitLabel = '$' + Math.round(newProfit).toLocaleString();
      result += makeToken('calc_out.break_even.row.cut_costs_20', '• Cut costs 20%:  Monthly profit ' + profitLabel + ' → ' + newProfitLabel, { profit: profitLabel, newprofit: newProfitLabel });
      if (newMonths !== null && flatMonths !== null) {
        const fromLabel = String(flatMonths);
        const toLabel = String(newMonths);
        const fasterLabel = String(flatMonths - newMonths);
        result += '  |  ' + makeToken('calc_out.break_even.row.cut_costs_20_breakeven', 'Break-even: ' + fromLabel + ' → ' + toLabel + ' mo (' + fasterLabel + ' faster)', { from: fromLabel, to: toLabel, months: fasterLabel }) + '\n';
      } else result += '\n';
    }
    // Raise price 20%
    if (monthlyRevenue > 0) {
      const newRev = monthlyRevenue * 1.2;
      const newProfit2 = newRev - monthlyCosts;
      const newMonths2 = newProfit2 > 0 ? Math.ceil(initialInvestment / newProfit2) : null;
      const revLabel = '$' + Math.round(monthlyRevenue).toLocaleString();
      const newRevLabel = '$' + Math.round(newRev).toLocaleString();
      result += makeToken('calc_out.break_even.row.raise_price_20', '• Raise price 20%:  Revenue ' + revLabel + ' → ' + newRevLabel, { revenue: revLabel, newrevenue: newRevLabel });
      if (newMonths2 !== null && flatMonths !== null) {
        const fromLabel = String(flatMonths);
        const toLabel = String(newMonths2);
        result += '  |  ' + makeToken('calc_out.break_even.row.raise_price_20_breakeven', 'Break-even: ' + fromLabel + ' → ' + toLabel + ' mo', { from: fromLabel, to: toLabel }) + '\n';
      } else if (newMonths2 !== null) {
        const toLabel = String(newMonths2);
        result += '  |  ' + makeToken('calc_out.break_even.row.raise_price_20_breakeven_only', 'Break-even: ' + toLabel + ' mo', { to: toLabel }) + '\n';
      } else result += '\n';
    }
    // Combined
    const comboRev = monthlyRevenue * 1.1;
    const comboCosts = monthlyCosts * 0.9;
    const comboProfit = comboRev - comboCosts;
    if (comboProfit > 0) {
      const comboMonthsLabel = String(Math.ceil(initialInvestment / comboProfit));
      result += makeToken('calc_out.break_even.row.combo_price_costs', '• Combo (+10% price, −10% costs):  Break-even: ' + comboMonthsLabel + ' mo', { months: comboMonthsLabel }) + '\n';
    }
  }

  // 🩺 Break-Even Health (v3)
  if (flatMonthlyProfit <= 0) {
    result += '\n\n' + makeToken('calc_out.section.break_even_health', '🩺 Break-Even Health:') + '\n' + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + '\n' +
      makeToken('calc_out.break_even.row.health_monthly_loss', '• 🔴 Monthly loss — expenses exceed revenue. Cannot break even at current rate. Either raise price or cut costs.');
  } else if (initialInvestment <= 0) {
    result += '\n\n' + makeToken('calc_out.section.break_even_health', '🩺 Break-Even Health:') + '\n' + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + '\n' +
      makeToken('calc_out.break_even.row.health_no_upfront', '• 🟢 No upfront investment. Every month is profit. Focus on scaling.');
  } else if (flatMonths !== null) {
    const flatLabel = String(flatMonths);
    const yearsLabel = (flatMonths / 12).toFixed(1);
    result += '\n\n' + makeToken('calc_out.section.break_even_health', '🩺 Break-Even Health:') + '\n' + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + '\n' +
      (flatMonths < 6
        ? makeToken('calc_out.break_even.row.health_fast_payback', '• 🟢 Fast payback — under 6 months. Healthy.')
        : flatMonths < 12
        ? makeToken('calc_out.break_even.row.health_moderate_payback', '• 🟡 Moderate payback — 6-12 months. Standard for SaaS.')
        : flatMonths < 24
        ? makeToken('calc_out.break_even.row.health_slow_payback', '• 🟠 Slow payback — 1-2 years. Tighten unit economics.')
        : makeToken('calc_out.break_even.row.health_very_slow', '• 🔴 Very slow — over 2 years. Reconsider pricing or costs.')) + '\n' +
      makeToken('calc_out.break_even.row.payback_months', '• Payback: ' + flatLabel + ' months', { months: flatLabel }) + ' | ' +
      makeToken('calc_out.break_even.row.payback_years', '~' + yearsLabel + ' years', { years: yearsLabel });
  } else {
    result += '\n\n' + makeToken('calc_out.section.break_even_health', '🩺 Break-Even Health:') + '\n' + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + '\n' +
      makeToken('calc_out.break_even.row.health_default_alive', '• 🟡 Default alive — no payback needed.');
  }

  // 🔄 What-If Scenarios (v3)
  result += '\n\n' + makeToken('calc_out.section.break_even_what_if_v3', '🔄 What-If Scenarios:') + '\n' + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  if (flatMonthlyProfit > 0 && initialInvestment > 0 && flatMonths !== null) {
    const rev10 = (monthlyRevenue * 1.1) - monthlyCosts;
    const inv10 = Math.ceil(initialInvestment / rev10);
    const cost10 = monthlyRevenue - (monthlyCosts * 0.9);
    const invCost10 = Math.ceil(initialInvestment / cost10);
    const combo = (monthlyRevenue * 1.1) - (monthlyCosts * 0.9);
    const invCombo = Math.ceil(initialInvestment / combo);
    const flatLabel = String(flatMonths);
    const inv10Label = String(inv10);
    const invCost10Label = String(invCost10);
    const invComboLabel = String(invCombo);
    const saveLabel = '$' + Math.round(flatMonthlyProfit * 12).toLocaleString();
    result += '\n' + makeToken('calc_out.break_even.row.whatif_raise_price_10', '• Raise price 10%:  Payback ' + flatLabel + ' → ' + inv10Label + ' mo', { from: flatLabel, to: inv10Label });
    result += '\n' + makeToken('calc_out.break_even.row.whatif_cut_costs_10', '• Cut costs 10%:  Payback ' + flatLabel + ' → ' + invCost10Label + ' mo', { from: flatLabel, to: invCost10Label });
    result += '\n' + makeToken('calc_out.break_even.row.whatif_combo_10_10', '• Combo (+10% price, -10% costs):  Payback ' + flatLabel + ' → ' + invComboLabel + ' mo', { from: flatLabel, to: invComboLabel });
    result += '\n' + makeToken('calc_out.break_even.row.whatif_current_rate', '• At current rate:  Save ' + saveLabel + '/yr after initial investment', { value: saveLabel });
  } else {
    result += '\n' + makeToken('calc_out.break_even.row.whatif_cannot_model', '• ⚠️ Cannot model — ensure revenue > costs and initial investment > 0.');
  }

  // 💡 Tip (v3)
  if (flatMonthlyProfit > 0 && flatMonths !== null && flatMonths <= 12) {
    result += '\n\n' + makeToken('calc_out.break_even.row.tip_fast', '💡 Tip: Sub-12-month break-even is the sweet spot — you have cash to reinvest in growth. Resist the temptation to extract profits early; compound the advantage for 2-3 more months before taking any out.');
  } else if (flatMonthlyProfit <= 0) {
    result += '\n\n' + makeToken('calc_out.break_even.row.tip_negative', "💡 Tip: Negative monthly profit means you're burning cash every month. Either raise prices, cut costs, or accept that you'll need more runway to reach break-even. The longer you delay, the harder it gets.");
  } else {
    result += '\n\n' + makeToken('calc_out.break_even.row.tip_floor', "💡 Tip: Break-even is the floor, not the goal. Aim for a 3-month safety buffer by default — one bad month shouldn't wipe out your margin. Pre-revenue? Cut costs aggressively until you hit $1k MRR, then re-evaluate.");
  }

  return [result];
}

const customFn =
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let S=function(u){return Number.isNaN(u)?0:Math.max(0,u)},M=function(u){const w=r=>"$"+Math.round(r).toLocaleString(),F=r=>r.toFixed(1)+"%",o=S(parseFloat(u.monthlyCosts)||0),a=S(parseFloat(u.monthlyRevenue)||0),s=S(parseFloat(u.initialInvestment)||0),m=parseFloat(u.monthlyGrowthRate)||0,R=1+m/100,g=a-o,n=g>0?Math.ceil(s/g):null;let i=null,B=-s;for(let r=1;r<=60;r++){const c=a*Math.pow(R,r-1);if(B+=c-o,i===null&&B>=0){i=r;break}}const E=w(s),P=w(o),N=w(a),L=F(m);let t=e("calc_out.section.break_even_analysis","📊 Break-Even Analysis")+\`

\`+e("calc_out.section.break_even_timeline","⏱️ Break-Even Timeline")+\`
\`;if(t+=e("calc_out.break_even.row.initial_investment","• Initial Investment:  "+E,{value:E})+\`
\`+e("calc_out.break_even.row.monthly_costs","• Monthly Costs:       "+P+"/mo",{value:P})+\`
\`+e("calc_out.break_even.row.monthly_revenue","• Monthly Revenue:     "+N+"/mo",{value:N})+\`
\`,n!==null?t+=e("calc_out.break_even.row.flat_revenue","• Flat revenue:        "+String(n)+" months",{months:String(n)})+\`
\`:t+=e("calc_out.break_even.row.flat_revenue_never","• Flat revenue:        Never — monthly costs exceed revenue. You need growth or lower costs.")+\`
\`,m>0&&i!==null?(t+=e("calc_out.break_even.row.with_growth","• With "+L+" growth:  "+String(i)+" months",{growth:L,months:String(i)}),n!==null&&(t+=e("calc_out.break_even.row.growth_faster","  ("+String(n-i)+" months faster)",{months:String(n-i)})),t+=\`
\`):m>0&&i===null&&(t+=e("calc_out.break_even.row.with_growth_never","• With "+L+" growth:  Not within 60 months — need faster growth or lower costs.",{growth:L})+\`
\`),i!==null&&(i<=6?t+=e("calc_out.break_even.row.verdict_excellent","🟢 Excellent! Breaking even in under 6 months is a very healthy trajectory.")+\`
\`:i<=12?t+=e("calc_out.break_even.row.verdict_solid","🟡 Solid — breaking even within a year. Keep an eye on costs.")+\`
\`:i<=24?t+=e("calc_out.break_even.row.verdict_manageable","🟠 Manageable but slow — 1-2 years to break even. Consider boosting growth.")+\`
\`:t+=e("calc_out.break_even.row.verdict_long_road","🔴 Long road — over 2 years. Review whether this is sustainable.")+\`
\`),g>0||m>0){t+=\`
\`+e("calc_out.section.break_even_cumulative","📈 Cumulative P&L Outlook")+\`
\`;const r=[3,6,12,24];for(const c of r){let h=-s;for(let l=1;l<=c;l++){const b=a*Math.pow(R,l-1);h+=b-o}t+=(h>=0?e("calc_out.break_even.row.month_checkpoint_positive","• Month "+String(c)+": +"+w(h)+" ✅",{month:String(c),value:w(h)}):e("calc_out.break_even.row.month_checkpoint_negative","• Month "+String(c)+": "+w(h),{month:String(c),value:w(h)}))+\`
\`}}if(a>0&&o>0){if(t+=\`
\`+e("calc_out.section.break_even_what_if","🔄 What-If Scenarios")+\`
\`,o>0){const l=o*.8,b=a-l,f=b>0?Math.ceil(s/b):null,_="$"+Math.round(a-o).toLocaleString(),y="$"+Math.round(b).toLocaleString();if(t+=e("calc_out.break_even.row.cut_costs_20","• Cut costs 20%:  Monthly profit "+_+" → "+y,{profit:_,newprofit:y}),f!==null&&n!==null){const v=String(n),p=String(f),d=String(n-f);t+="  |  "+e("calc_out.break_even.row.cut_costs_20_breakeven","Break-even: "+v+" → "+p+" mo ("+d+" faster)",{from:v,to:p,months:d})+\`
\`}else t+=\`
\`}if(a>0){const l=a*1.2,b=l-o,f=b>0?Math.ceil(s/b):null,_="$"+Math.round(a).toLocaleString(),y="$"+Math.round(l).toLocaleString();if(t+=e("calc_out.break_even.row.raise_price_20","• Raise price 20%:  Revenue "+_+" → "+y,{revenue:_,newrevenue:y}),f!==null&&n!==null){const v=String(n),p=String(f);t+="  |  "+e("calc_out.break_even.row.raise_price_20_breakeven","Break-even: "+v+" → "+p+" mo",{from:v,to:p})+\`
\`}else if(f!==null){const v=String(f);t+="  |  "+e("calc_out.break_even.row.raise_price_20_breakeven_only","Break-even: "+v+" mo",{to:v})+\`
\`}else t+=\`
\`}const r=a*1.1,c=o*.9,h=r-c;if(h>0){const l=String(Math.ceil(s/h));t+=e("calc_out.break_even.row.combo_price_costs","• Combo (+10% price, −10% costs):  Break-even: "+l+" mo",{months:l})+\`
\`}}if(g<=0)t+=\`

\`+e("calc_out.section.break_even_health","🩺 Break-Even Health:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+e("calc_out.break_even.row.health_monthly_loss","• 🔴 Monthly loss — expenses exceed revenue. Cannot break even at current rate. Either raise price or cut costs.");else if(s<=0)t+=\`

\`+e("calc_out.section.break_even_health","🩺 Break-Even Health:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+e("calc_out.break_even.row.health_no_upfront","• 🟢 No upfront investment. Every month is profit. Focus on scaling.");else if(n!==null){const r=String(n),c=(n/12).toFixed(1);t+=\`

\`+e("calc_out.section.break_even_health","🩺 Break-Even Health:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(n<6?e("calc_out.break_even.row.health_fast_payback","• 🟢 Fast payback — under 6 months. Healthy."):n<12?e("calc_out.break_even.row.health_moderate_payback","• 🟡 Moderate payback — 6-12 months. Standard for SaaS."):n<24?e("calc_out.break_even.row.health_slow_payback","• 🟠 Slow payback — 1-2 years. Tighten unit economics."):e("calc_out.break_even.row.health_very_slow","• 🔴 Very slow — over 2 years. Reconsider pricing or costs."))+\`
\`+e("calc_out.break_even.row.payback_months","• Payback: "+r+" months",{months:r})+" | "+e("calc_out.break_even.row.payback_years","~"+c+" years",{years:c})}else t+=\`

\`+e("calc_out.section.break_even_health","🩺 Break-Even Health:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+e("calc_out.break_even.row.health_default_alive","• 🟡 Default alive — no payback needed.");if(t+=\`

\`+e("calc_out.section.break_even_what_if_v3","🔄 What-If Scenarios:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\`,g>0&&s>0&&n!==null){const r=a*1.1-o,c=Math.ceil(s/r),h=a-o*.9,l=Math.ceil(s/h),b=a*1.1-o*.9,f=Math.ceil(s/b),_=String(n),y=String(c),v=String(l),p=String(f),d="$"+Math.round(g*12).toLocaleString();t+=\`
\`+e("calc_out.break_even.row.whatif_raise_price_10","• Raise price 10%:  Payback "+_+" → "+y+" mo",{from:_,to:y}),t+=\`
\`+e("calc_out.break_even.row.whatif_cut_costs_10","• Cut costs 10%:  Payback "+_+" → "+v+" mo",{from:_,to:v}),t+=\`
\`+e("calc_out.break_even.row.whatif_combo_10_10","• Combo (+10% price, -10% costs):  Payback "+_+" → "+p+" mo",{from:_,to:p}),t+=\`
\`+e("calc_out.break_even.row.whatif_current_rate","• At current rate:  Save "+d+"/yr after initial investment",{value:d})}else t+=\`
\`+e("calc_out.break_even.row.whatif_cannot_model","• ⚠️ Cannot model — ensure revenue > costs and initial investment > 0.");return g>0&&n!==null&&n<=12?t+=\`

\`+e("calc_out.break_even.row.tip_fast","💡 Tip: Sub-12-month break-even is the sweet spot — you have cash to reinvest in growth. Resist the temptation to extract profits early; compound the advantage for 2-3 more months before taking any out."):g<=0?t+=\`

\`+e("calc_out.break_even.row.tip_negative","💡 Tip: Negative monthly profit means you're burning cash every month. Either raise prices, cut costs, or accept that you'll need more runway to reach break-even. The longer you delay, the harder it gets."):t+=\`

\`+e("calc_out.break_even.row.tip_floor","💡 Tip: Break-even is the floor, not the goal. Aim for a 3-month safety buffer by default — one bad month shouldn't wipe out your margin. Pre-revenue? Cut costs aggressively until you hit $1k MRR, then re-evaluate."),[t]},C=function(u,w,F){var o=$(u);return Array.isArray(o)?o.join(\`
\`):String(o)};var k=S,j=M,I=C,e=tk,x='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',e=new Function("return "+x)(),$=function(u){return M(u)};return[C(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

const engine: ToolEngine = {
  slug: "solopreneur-break-even-calculator",
  title: "Break-Even Calculator",
  description: "Calculate when you will break even — with and without monthly revenue growth. See cumulative P&L at 3, 6, 12, and 24 months.",
  inputs: [
    { name: "monthlyCosts", label: "Monthly Costs ($)", placeholder: "e.g. 500", type: "number" },
    { name: "monthlyRevenue", label: "Monthly Revenue ($)", placeholder: "e.g. 1000", type: "number" },
    { name: "initialInvestment", label: "Initial Investment ($)", placeholder: "e.g. 5000", type: "number" },
    { name: "monthlyGrowthRate", label: "Monthly Revenue Growth (%)", placeholder: "e.g. 10 (leave 0 for flat)", type: "number" },
  ],
  clientConfig: { type: "custom", wordPools: {}, customFn },
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
  generate(inputs: Record<string, string>): string[] { return calculateBreakEven(inputs); },
  staticExamples: [
    '$calc_out.section.break_even_analysis|📊 Break-Even Analysis|\n\n$calc_out.section.break_even_timeline|⏱️ Break-Even Timeline|\n$calc_out.break_even.row.initial_investment{"value":"$5,000"}|• Initial Investment:  $5,000|\n$calc_out.break_even.row.monthly_costs{"value":"$500"}|• Monthly Costs:       $500/mo|\n$calc_out.break_even.row.monthly_revenue{"value":"$1,000"}|• Monthly Revenue:     $1,000/mo|\n$calc_out.break_even.row.flat_revenue{"months":"10"}|• Flat revenue:        10 months|\n$calc_out.break_even.row.with_growth{"growth":"10.0%","months":"7"}|• With 10.0% growth:  7 months|$calc_out.break_even.row.growth_faster{"months":"3"}|  (3 months faster)|\n$calc_out.break_even.row.verdict_solid|🟡 Solid — breaking even within a year. Keep an eye on costs.|\n\n$calc_out.section.break_even_cumulative|📈 Cumulative P&L Outlook|\n$calc_out.break_even.row.month_checkpoint_negative{"month":"3","value":"$-3,190"}|• Month 3: $-3,190|\n$calc_out.break_even.row.month_checkpoint_negative{"month":"6","value":"$-284"}|• Month 6: $-284|\n$calc_out.break_even.row.month_checkpoint_positive{"month":"12","value":"$10,384"}|• Month 12: +$10,384 ✅|\n$calc_out.break_even.row.month_checkpoint_positive{"month":"24","value":"$71,497"}|• Month 24: +$71,497 ✅|\n\n$calc_out.section.break_even_what_if|🔄 What-If Scenarios|\n$calc_out.break_even.row.cut_costs_20{"profit":"$500","newprofit":"$600"}|• Cut costs 20%:  Monthly profit $500 → $600|  |  $calc_out.break_even.row.cut_costs_20_breakeven{"from":"10","to":"9","months":"1"}|Break-even: 10 → 9 mo (1 faster)|\n$calc_out.break_even.row.raise_price_20{"revenue":"$1,000","newrevenue":"$1,200"}|• Raise price 20%:  Revenue $1,000 → $1,200|  |  $calc_out.break_even.row.raise_price_20_breakeven{"from":"10","to":"8"}|Break-even: 10 → 8 mo|\n$calc_out.break_even.row.combo_price_costs{"months":"8"}|• Combo (+10% price, −10% costs):  Break-even: 8 mo|\n\n\n$calc_out.section.break_even_health|🩺 Break-Even Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.break_even.row.health_moderate_payback|• 🟡 Moderate payback — 6-12 months. Standard for SaaS.|\n$calc_out.break_even.row.payback_months{"months":"10"}|• Payback: 10 months| | $calc_out.break_even.row.payback_years{"years":"0.8"}|~0.8 years|\n\n$calc_out.section.break_even_what_if_v3|🔄 What-If Scenarios:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.break_even.row.whatif_raise_price_10{"from":"10","to":"9"}|• Raise price 10%:  Payback 10 → 9 mo|\n$calc_out.break_even.row.whatif_cut_costs_10{"from":"10","to":"10"}|• Cut costs 10%:  Payback 10 → 10 mo|\n$calc_out.break_even.row.whatif_combo_10_10{"from":"10","to":"8"}|• Combo (+10% price, -10% costs):  Payback 10 → 8 mo|\n$calc_out.break_even.row.whatif_current_rate{"value":"$6,000"}|• At current rate:  Save $6,000/yr after initial investment|\n\n$calc_out.break_even.row.tip_fast|💡 Tip: Sub-12-month break-even is the sweet spot — you have cash to reinvest in growth. Resist the temptation to extract profits early; compound the advantage for 2-3 more months before taking any out.|',
  ],
  faq: [
    { q: "What is a break-even point?", a: "The break-even point is when your cumulative revenue equals your total costs (including initial investment). After this point, every dollar of revenue becomes profit. For solopreneurs, break-even is the first major validation milestone." },
    { q: "How do I speed up my break-even?", a: "Three ways: (1) Increase monthly revenue — raise prices or add more customers. (2) Decrease monthly costs — cut unnecessary subscriptions, automate manual work. (3) Reduce initial investment — start leaner, use free tiers of tools until you have revenue." },
    { q: "What is a good break-even timeline?", a: "For a solopreneur product, 6-12 months is excellent. For service businesses, 1-3 months is normal since costs are low. If your break-even is over 2 years, the model may need rethinking." },
    { q: "Should I project with or without growth?", a: "Always check both. The flat projection is your worst case — if you can break even without growth, you have a very resilient business. The growth projection shows what is possible." },
    { q: "What if I never break even?", a: "Then your unit economics are upside down — each month costs more than it brings in. You need to either raise prices, cut costs, or pivot to a different model." },
    { q: "What is break-even analysis?", a: "Break-even = revenue = costs (no profit, no loss). Calculate: 1) Fixed costs, 2) Variable costs per unit, 3) Price per unit, 4) Break-even units = fixed / (price - variable). For $10K fixed, $5 variable, $25 price: 500 units to break even. Use: pricing, capacity planning, fundraising. Most: 6-18 months to break-even is typical. SaaS: 12-24 months. E-commerce: 3-6 months." },
    { q: "How do I reduce break-even?", a: "1) Increase price (10% = 20-30% break-even cut), 2) Reduce fixed costs, 3) Reduce variable costs (COGS), 4) Mix shift (sell more profitable products). 20-40% break-even reduction in 6-12 months. increase price. Most teams 10% price increase = 25% break-even reduction. Avoid only cutting costs (limits growth). Best option: pricing + costs." },
    { q: "What is the difference between break-even and profitability?", a: "Break-even: revenue = costs. Profitability: revenue > costs. Time to break-even: months until first profit. Time to profitability: months until consistent profit. For 18-month break-even + 24-month profitability: cash flow negative for 24 months. target 6-12 months to break-even, 12-18 months to profitability. Use cash flow forecast + runway. Most investors: prefer faster path to profitability." },
    { q: "Should I include opportunity cost in break-even?", a: "Optional. Opportunity cost: what else could you do with the time/money. For founder: $100-300K/year. For investor: 7-10% return expected. For break-even decision: include if comparing to alternatives. For internal decision: optional. Most: include for founder salary (otherwise break-even understates true cost). Use: full economic break-even = all opportunity costs. Show both: cash break-even + economic break-even." },
    { q: "How does contribution margin affect break-even?", a: "Contribution margin = (price - variable cost) / price. For $25 price, $5 variable: 80% CM. Break-even = fixed costs / (price × CM). For $10K fixed, 80% CM, $25: 500 units. Higher CM = lower break-even. Most: aim for 70-80% CM. For SaaS: 70-85% (high CM). For e-commerce: 30-50% (lower). Increase CM: 1) Raise price, 2) Lower COGS, 3) Better mix. Most: 1) Price + 2) COGS = 5-10 pp CM lift." },
    { q: "What is a healthy break-even for SaaS?", a: "Benchmarks: 1) T2D3 (Triple, Triple, Double, Double, Double): 6-12 months to break-even, 2) Average: 12-18 months, 3) Slow: 18-24 months, 4) Concerning: >24 months. By stage: 1) Pre-PMF: not measured, 2) PMF: 12-18 months, 3) Growth: 6-12 months, 4) Scale: already profitable. Most: target 12-18 months. Path: 1) Reduce fixed, 2) Grow revenue. Most: 6-month reduction per year." },
    { q: "How do I use break-even for fundraising?", a: "For fundraise: 1) Calculate current break-even, 2) Project to next round, 3) Show: cash on hand + next round covers path to break-even. Most: 18-24 month runway post-fund. Show: 1) Burn, 2) Cash, 3) Runway, 4) Path to break-even. Investors: care about path. Avoid: \"we'll figure it out.\" Use: 3 scenarios (base, up, down). Most: show clear path. Best: clear path to break-even within 18 months." },
    { q: "What is the difference between cash break-even and gross margin break-even?", a: "Cash break-even: revenue = cash costs (excludes depreciation, amortization). Gross margin break-even: revenue = cost of goods sold only. For SaaS: gross margin break-even = hosting/support covered (low bar). Cash break-even = all costs covered (high bar). Operating break-even = operating income = 0 (between). For decisions: cash break-even (true). For targets: operating break-even (investor-friendly). Most: 2 are different by 20-30%." },
  ],
  howToUse: [
    "Enter your total monthly operating costs.",
    "Enter your current monthly revenue.",
    "Enter your initial investment (what you spent to start).",
    "Enter your expected monthly revenue growth rate (leave 0 for flat projection).",
    "Compare the flat vs growth break-even timelines.",
    "Check the cumulative P&L at 3, 6, 12, and 24 months.",
    "Use the gap between flat and growth to understand how much growth impacts your timeline.",
  ],
  engineKey: true,
};
registerEngine(engine);
