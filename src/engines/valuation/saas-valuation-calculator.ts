import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-7：结果输出 token 化 —— 服务端 makeToken / 客户端 tk 共用同一份实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 两端输出逐字节相同，不可能漂。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

function calculateValuation(inputs: Record<string, string>): string[] {
  const annualRevenue = clampNonNegative(parseFloat(inputs.annualRevenue) || 0);
  // intentionally NOT clamped: semantically can be negative (negative growth / negative margin)
  const growthRate = parseFloat(inputs.growthRate) || 0;
  const profitMargin = parseFloat(inputs.profitMargin) || 0;
  const results: string[] = [];

  const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
  const pct = (n: number) => n.toFixed(1) + '%';

  // Determine multiple range based on growth rate and profit margin
  let lowMultiple = 3;
  let highMultiple = 8;
  let baseMultiple = 5;

  if (growthRate >= 100) { lowMultiple = 8; highMultiple = 15; baseMultiple = 10; }
  else if (growthRate >= 50) { lowMultiple = 6; highMultiple = 12; baseMultiple = 8; }
  else if (growthRate >= 30) { lowMultiple = 5; highMultiple = 10; baseMultiple = 7; }
  else if (growthRate >= 10) { lowMultiple = 4; highMultiple = 8; baseMultiple = 5.5; }

  if (profitMargin >= 30) { lowMultiple += 1; highMultiple += 1; baseMultiple += 0.5; }
  else if (profitMargin < 10 && profitMargin > 0) { lowMultiple = Math.max(2, lowMultiple - 1); highMultiple = Math.max(3, highMultiple - 2); baseMultiple = Math.max(2.5, baseMultiple - 1); }

  const valuationLow = annualRevenue * lowMultiple;
  const valuationHigh = annualRevenue * highMultiple;
  const valuationBase = annualRevenue * baseMultiple;
  const profit = annualRevenue * (profitMargin / 100);
  const exitValue = profit > 0 ? profit * baseMultiple * 1.5 : valuationBase;

  // ---- P168 B3-7：结果输出 token 化（语义码 + 英文兜底）----
  //   英文页输出**逐字不变**（兜底 = 原英文），zh 页由 locale 模板替换。
  let mainResult =
    makeToken('calc_out.section.saas_valuation_estimate', '💰 SaaS Valuation Estimate') + '\n\n' +
    '• ' + makeToken('calc_out.label.annual_revenue', 'Annual Revenue (ARR)') + ': ' + fmt(annualRevenue) + '\n' +
    '• ' + makeToken('calc_out.label.yoy_growth_rate', 'YoY Growth Rate') + ': ' + pct(growthRate) + '\n' +
    '• ' + makeToken('calc_out.label.profit_margin', 'Profit Margin') + ': ' + pct(profitMargin) + '\n' +
    '• ' + makeToken('calc_out.label.annual_profit', 'Annual Profit') + ': ' + fmt(profit) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.valuation_range', '📊 Valuation Range (Revenue Multiple):') + '\n\n' +
    '• ' + makeToken('calc_out.label.conservative', 'Conservative') + ' (' + lowMultiple.toFixed(1) + 'x): ' + fmt(valuationLow) + '\n' +
    '• ' + makeToken('calc_out.label.base_case', 'Base Case') + ' (' + baseMultiple.toFixed(1) + 'x): ' + fmt(valuationBase) + '\n' +
    '• ' + makeToken('calc_out.label.optimistic', 'Optimistic') + ' (' + highMultiple.toFixed(1) + 'x): ' + fmt(valuationHigh) + '\n\n' +
    '• ' + makeToken('calc_out.label.estimated_exit_value', 'Estimated Exit Value') + ': ' + fmt(exitValue) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n';

  if (growthRate >= 50) {
    mainResult += makeToken('calc_out.saas_valuation.row.assessment_high_growth', '🚀 You have high-growth SaaS metrics. Your multiple range reflects the premium that high-growth companies command. Focus on sustaining growth while improving margins.') + '\n\n';
  } else if (growthRate >= 20) {
    mainResult += makeToken('calc_out.saas_valuation.row.assessment_solid_growth', '📈 Solid growth trajectory. Improving your growth rate from ' + pct(growthRate) + ' to 30%+ could increase your valuation multiple by 2-3x.', { growth: pct(growthRate) }) + '\n\n';
  } else {
    mainResult += makeToken('calc_out.saas_valuation.row.assessment_steady', '💪 Steady business. To increase valuation, focus on either accelerating growth or improving profit margins above 20%. Higher margins directly increase your multiple.') + '\n\n';
  }

  // ---- Tip (P168 decision code) ----
  // Bands reuse the existing Break-Even Multiple thresholds (baseMultiple < 5 / < 10 / else),
  // so the advice can never disagree with the break-even band shown further down.
  const valTipParams = {
    multiple: baseMultiple.toFixed(1) + 'x',
    valuation: fmt(valuationBase),
    growth: pct(growthRate),
    margin: pct(profitMargin),
  };
  let valTip: { code: string; params: Record<string, string> };
  if (baseMultiple < 5) {
    valTip = { code: 'saasval_floor', params: valTipParams };
  } else if (baseMultiple < 10) {
    valTip = { code: 'saasval_median', params: valTipParams };
  } else {
    valTip = { code: 'saasval_premium', params: valTipParams };
  }
  mainResult += '💡 Tip: ' + JSON.stringify(valTip);

  // 🔄 What-If Scenarios
  if (annualRevenue > 0) {
    const raisedGrowth = Math.min(150, growthRate + 30);
    const raisedMult = raisedGrowth >= 100 ? 10 : raisedGrowth >= 50 ? 8 : raisedGrowth >= 30 ? 7 : 5.5;
    const raisedVal = annualRevenue * raisedMult;
    const raisedProfit = profitMargin + 10;
    const profitMult = baseMultiple + (raisedProfit >= 30 ? 0.5 : 0);
    const profitVal = annualRevenue * profitMult;
    mainResult += '\n\n' + makeToken('calc_out.section.what_if_growth_margin', '🔄 What-If Scenarios') + '\n';
    mainResult += '• ' + makeToken('calc_out.saas_valuation.row.whatif_growth_raised', 'If growth → ' + raisedGrowth.toFixed(0) + '% YoY:  multiple ' + raisedMult.toFixed(1) + 'x  → $' + Math.round(raisedVal).toLocaleString() + ' (vs $' + Math.round(valuationBase).toLocaleString() + ')', { growth: raisedGrowth.toFixed(0) + '% YoY', mult: raisedMult.toFixed(1) + 'x', val: '$' + Math.round(raisedVal).toLocaleString(), base: '$' + Math.round(valuationBase).toLocaleString() }) + '\n';
    mainResult += '• ' + makeToken('calc_out.saas_valuation.row.whatif_margin_raised', 'If margin → ' + raisedProfit.toFixed(0) + '%:  multiple ' + profitMult.toFixed(1) + 'x  → $' + Math.round(profitVal).toLocaleString(), { margin: raisedProfit.toFixed(0) + '%', mult: profitMult.toFixed(1) + 'x', val: '$' + Math.round(profitVal).toLocaleString() }) + '\n';
    mainResult += '• ' + makeToken('calc_out.label.distress_floor_2x', 'Distress floor (2x)') + ':  $' + Math.round(annualRevenue * 2).toLocaleString() + '  ' + makeToken('calc_out.label.asset_only_sale', '(asset-only sale)') + '\n';
  }

  // 🩺 Valuation Health (v3)
  if (annualRevenue <= 0) {
    mainResult += '\n\n' + makeToken('calc_out.section.valuation_health', '🩺 Valuation Health:') + '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• ' + makeToken('calc_out.saas_valuation.row.health_zero_revenue', '🔴 Revenue is 0 or negative. SaaS valuation requires recurring revenue. Build MRR first before exit planning.');
  } else if (valuationBase <= 0) {
    mainResult += '\n\n' + makeToken('calc_out.section.valuation_health', '🩺 Valuation Health:') + '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• ' + makeToken('calc_out.saas_valuation.row.health_zero_multiple', '🔴 Multiple is 0 or negative. No reasonable valuation can be derived.');
  } else if (annualRevenue < 100000) {
    mainResult += '\n\n' + makeToken('calc_out.section.valuation_health', '🩺 Valuation Health:') + '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• ' + makeToken('calc_out.saas_valuation.row.health_pre_revenue', '🟡 Pre-revenue / seed stage. Most investors won\'t use revenue multiple. Focus on traction, growth, and team before valuation conversations.');
  } else if (annualRevenue < 1000000) {
    mainResult += '\n\n' + makeToken('calc_out.section.valuation_health', '🩺 Valuation Health:') + '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• ' + makeToken('calc_out.saas_valuation.row.health_early_revenue', '🟠 Early revenue ($' + (annualRevenue / 1000).toFixed(0) + 'K ARR). Typical seed-to-Series A range. Multiple: 5-15x depending on growth rate.', { arr_k: '$' + (annualRevenue / 1000).toFixed(0) + 'K' });
  } else if (annualRevenue < 10000000) {
    mainResult += '\n\n' + makeToken('calc_out.section.valuation_health', '🩺 Valuation Health:') + '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• ' + makeToken('calc_out.saas_valuation.row.health_mid_stage', '🟢 Mid-stage ($' + (annualRevenue / 1000000).toFixed(1) + 'M ARR). Series A-B range. Multiple: 8-20x. Growth rate is the #1 multiple driver.', { arr_m: '$' + (annualRevenue / 1000000).toFixed(1) + 'M' });
  } else {
    mainResult += '\n\n' + makeToken('calc_out.section.valuation_health', '🩺 Valuation Health:') + '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• ' + makeToken('calc_out.saas_valuation.row.health_late_stage', '🟢 Late-stage ($' + (annualRevenue / 1000000).toFixed(1) + 'M ARR). Series C+ range. Multiple: 10-30x. Profitability and net dollar retention matter more.', { arr_m: '$' + (annualRevenue / 1000000).toFixed(1) + 'M' });
  }

  // 🔄 What-If Scenarios (v3)
  mainResult += '\n\n' + makeToken('calc_out.section.what_if_growth_margin', '🔄 What-If Scenarios') + ':\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  if (annualRevenue > 0 && baseMultiple > 0) {
    const doubleRev = annualRevenue * 2;
    const valAtDouble = doubleRev * baseMultiple;
    const valAtHigherMult = annualRevenue * (baseMultiple * 1.5);
    const valAtProfitable = annualRevenue * baseMultiple * 1.3;
    mainResult += '\n• ' + makeToken('calc_out.label.double_arr_12m', 'Double ARR (next 12 months at 100% growth)') + ':  $' + fmt(annualRevenue) + ' → $' + fmt(doubleRev) + '  | ' + makeToken('calc_out.label.valuation', 'Valuation') + ' $' + fmt(valAtDouble);
    mainResult += '\n• ' + makeToken('calc_out.label.boost_multiple_50pct', 'Boost multiple 50% (better growth/profitability story)') + ':  ' + makeToken('calc_out.label.valuation', 'Valuation') + ' $' + fmt(valAtHigherMult) + '  ' + makeToken('calc_out.label.no_arr_change', '(no ARR change)');
    mainResult += '\n• ' + makeToken('calc_out.label.reach_profitability', 'Reach profitability (typically +30% multiple)') + ':  ' + makeToken('calc_out.label.valuation', 'Valuation') + ' $' + fmt(valAtProfitable);
    if (growthRate > 0) {
      const t2Growth = annualRevenue * Math.pow(1 + growthRate / 100, 2);
      const valAtT2 = t2Growth * baseMultiple;
      mainResult += '\n• ' + makeToken('calc_out.label.at_current_growth_2y', 'At current growth (' + growthRate + '% YoY) in 2 years', { growth: String(growthRate) + '%' }) + ':  ARR $' + fmt(t2Growth) + '  | ' + makeToken('calc_out.label.valuation', 'Valuation') + ' $' + fmt(valAtT2) + '  (+$' + fmt(valAtT2 - valuationBase) + ')';
    }
  } else {
    mainResult += '\n• ' + makeToken('calc_out.saas_valuation.row.whatif_cannot_model', '⚠️ Cannot model — enter ARR and multiple to see scenarios.');
  }

  // ⚖️ Break-Even Multiple (v3)
  if (annualRevenue > 0) {
    mainResult += '\n\n' + makeToken('calc_out.section.break_even_multiple', '⚖️ Break-Even Multiple') + '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    if (baseMultiple < 3) {
      mainResult += '\n• ' + makeToken('calc_out.saas_valuation.row.breakeven_below_floor', '🔴 Current multiple ' + baseMultiple.toFixed(1) + 'x is below 3x SaaS floor — investors won\'t bite.', { mult: baseMultiple.toFixed(1) });
      mainResult += '\n• ' + makeToken('calc_out.saas_valuation.row.breakeven_to_reach_3x', 'To reach 3x floor:  need growth ' + Math.max(10, growthRate).toFixed(0) + '%+  AND  margin ' + Math.max(20, profitMargin).toFixed(0) + '%+', { growth: Math.max(10, growthRate).toFixed(0), margin: Math.max(20, profitMargin).toFixed(0) });
    } else if (baseMultiple < 5) {
      mainResult += '\n• ' + makeToken('calc_out.saas_valuation.row.breakeven_at_saas_floor', '🟡 Current multiple ' + baseMultiple.toFixed(1) + 'x is at SaaS floor. Below market median (5-8x).', { mult: baseMultiple.toFixed(1) });
      mainResult += '\n• ' + makeToken('calc_out.saas_valuation.row.breakeven_to_reach_5x', 'To reach 5x (median):  grow 30%+ YoY, OR push margin above 20%');
    } else if (baseMultiple < 10) {
      mainResult += '\n• ' + makeToken('calc_out.saas_valuation.row.breakeven_at_market_median', '🟢 Current multiple ' + baseMultiple.toFixed(1) + 'x is at market median. Strong position.', { mult: baseMultiple.toFixed(1) });
      mainResult += '\n• ' + makeToken('calc_out.saas_valuation.row.breakeven_to_reach_10x', 'To reach 10x+ (premium):  sustain 50%+ growth OR reach profitability');
    } else {
      mainResult += '\n• ' + makeToken('calc_out.saas_valuation.row.breakeven_premium', '🟢 Premium multiple ' + baseMultiple.toFixed(1) + 'x. Maintain growth and margin to justify.', { mult: baseMultiple.toFixed(1) });
    }
  }

  // 🎯 Valuation Milestones (v3)
  if (annualRevenue > 0) {
    mainResult += '\n\n' + makeToken('calc_out.section.valuation_milestones', '🎯 Valuation Milestones') + '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    const milestones = [
      { arr: 1e6, label: '$1M ARR' },
      { arr: 1e7, label: '$10M ARR' },
      { arr: 1e8, label: '$100M ARR' },
    ];
    for (const m of milestones) {
      if (annualRevenue >= m.arr) {
        mainResult += '\n• ' + m.label + ':  ' + makeToken('calc_out.saas_valuation.row.milestone_reached', '✅ reached  (current: $' + (annualRevenue / 1e6).toFixed(1) + 'M)', { current: (annualRevenue / 1e6).toFixed(1) + 'M' });
      } else if (growthRate > 0) {
        const yearsToReach = Math.log(m.arr / annualRevenue) / Math.log(1 + growthRate / 100);
        if (isFinite(yearsToReach) && yearsToReach < 20) {
          mainResult += '\n• ' + m.label + ':  ' + makeToken('calc_out.saas_valuation.row.milestone_years', yearsToReach.toFixed(1) + ' years  (at ' + growthRate.toFixed(0) + '% YoY growth)', { years: yearsToReach.toFixed(1), growth: growthRate.toFixed(0) });
        } else {
          mainResult += '\n• ' + m.label + ':  ' + makeToken('calc_out.saas_valuation.row.milestone_unrealistic', 'unrealistic at current growth — accelerate or accept smaller scale');
        }
      } else {
        mainResult += '\n• ' + m.label + ':  ' + makeToken('calc_out.saas_valuation.row.milestone_zero_growth', 'zero growth — not reachable without acceleration');
      }
    }
  }

  results.push(mainResult);

  // 5 comparison scenarios at different multiples
  const multipleScenarios = [
    { multiple: 2, token: makeToken('calc_out.label.scenario_distressed_sale', 'Distressed Sale (2x)') },
    { multiple: 4, token: makeToken('calc_out.label.scenario_flat_growth', 'Flat Growth (4x)') },
    { multiple: 6, token: makeToken('calc_out.label.scenario_steady_growth', 'Steady Growth (6x)') },
    { multiple: 10, token: makeToken('calc_out.label.scenario_high_growth', 'High Growth (10x)') },
    { multiple: 15, token: makeToken('calc_out.label.scenario_hyper_growth', 'Hyper-Growth (15x)') },
  ];

  for (let i = 0; i < multipleScenarios.length; i++) {
    const val = annualRevenue * multipleScenarios[i].multiple;
    results.push(
      multipleScenarios[i].token + ': ' + fmt(annualRevenue) + ' ARR × ' +
      multipleScenarios[i].multiple + 'x = ' + fmt(val) + ' ' + makeToken('calc_out.label.valuation_suffix', 'valuation'),
    );
  }

  return results;
}

const customFn =
  // P168 B3-7：⭐ 前置与服务端 makeToken **同一份**实现（CALC_OUTPUT_MAKE_TOKEN_JS）
  //   ⇒ 两端输出逐字节相同，不可能漂；new Function 的签名不变（仍是 3 个参数）。
  // ⚠️ 局部变量名与服务端 calculateValuation **同名** ⇒ params 的表达式两侧同义可求值。
  CALC_OUTPUT_MAKE_TOKEN_JS +
  "function clampNonNegative(x){return Number.isNaN(x)?0:Math.max(0,x)};" +
  "var annualRevenue=clampNonNegative(parseFloat(inputs.annualRevenue)||0);" +
  // intentionally NOT clamped: semantically can be negative (negative growth / negative margin)
  "var growthRate=parseFloat(inputs.growthRate)||0;" +
  "var profitMargin=parseFloat(inputs.profitMargin)||0;" +
  "function fmt(n){return '$'+Math.round(n).toLocaleString()}" +
  "function pct(n){return n.toFixed(1)+'%'}" +
  "var lowMultiple=3;var highMultiple=8;var baseMultiple=5;" +
  "if(growthRate>=100){lowMultiple=8;highMultiple=15;baseMultiple=10;}" +
  "else if(growthRate>=50){lowMultiple=6;highMultiple=12;baseMultiple=8;}" +
  "else if(growthRate>=30){lowMultiple=5;highMultiple=10;baseMultiple=7;}" +
  "else if(growthRate>=10){lowMultiple=4;highMultiple=8;baseMultiple=5.5;}" +
  "if(profitMargin>=30){lowMultiple+=1;highMultiple+=1;baseMultiple+=0.5;}" +
  "else if(profitMargin<10&&profitMargin>0){lowMultiple=Math.max(2,lowMultiple-1);highMultiple=Math.max(3,highMultiple-2);baseMultiple=Math.max(2.5,baseMultiple-1);}" +
  "var valuationLow=annualRevenue*lowMultiple;var valuationHigh=annualRevenue*highMultiple;var valuationBase=annualRevenue*baseMultiple;" +
  "var profit=annualRevenue*(profitMargin/100);" +
  "var exitValue=profit>0?profit*baseMultiple*1.5:valuationBase;" +
  "var mainResult='';" +
  "mainResult+=tk('calc_out.section.saas_valuation_estimate','💰 SaaS Valuation Estimate')+'\\n\\n';" +
  "mainResult+='• '+tk('calc_out.label.annual_revenue','Annual Revenue (ARR)')+': '+fmt(annualRevenue)+'\\n';" +
  "mainResult+='• '+tk('calc_out.label.yoy_growth_rate','YoY Growth Rate')+': '+pct(growthRate)+'\\n';" +
  "mainResult+='• '+tk('calc_out.label.profit_margin','Profit Margin')+': '+pct(profitMargin)+'\\n';" +
  "mainResult+='• '+tk('calc_out.label.annual_profit','Annual Profit')+': '+fmt(profit)+'\\n\\n';" +
  "mainResult+='━━━━━━━━━━━━━━━━━━━━\\n\\n';" +
  "mainResult+=tk('calc_out.section.valuation_range','📊 Valuation Range (Revenue Multiple):')+'\\n\\n';" +
  "mainResult+='• '+tk('calc_out.label.conservative','Conservative')+' ('+lowMultiple.toFixed(1)+'x): '+fmt(valuationLow)+'\\n';" +
  "mainResult+='• '+tk('calc_out.label.base_case','Base Case')+' ('+baseMultiple.toFixed(1)+'x): '+fmt(valuationBase)+'\\n';" +
  "mainResult+='• '+tk('calc_out.label.optimistic','Optimistic')+' ('+highMultiple.toFixed(1)+'x): '+fmt(valuationHigh)+'\\n\\n';" +
  "mainResult+='• '+tk('calc_out.label.estimated_exit_value','Estimated Exit Value')+': '+fmt(exitValue)+'\\n\\n';" +
  "mainResult+='━━━━━━━━━━━━━━━━━━━━\\n\\n';" +
  "if(growthRate>=50){mainResult+=tk('calc_out.saas_valuation.row.assessment_high_growth','🚀 You have high-growth SaaS metrics. Your multiple range reflects the premium that high-growth companies command. Focus on sustaining growth while improving margins.')+'\\n\\n';}" +
  "else if(growthRate>=20){mainResult+=tk('calc_out.saas_valuation.row.assessment_solid_growth','📈 Solid growth trajectory. Improving your growth rate from '+pct(growthRate)+' to 30%+ could increase your valuation multiple by 2-3x.',{growth:pct(growthRate)})+'\\n\\n';}" +
  "else{mainResult+=tk('calc_out.saas_valuation.row.assessment_steady','💪 Steady business. To increase valuation, focus on either accelerating growth or improving profit margins above 20%. Higher margins directly increase your multiple.')+'\\n\\n';}" +
  "var valTipParams={multiple:baseMultiple.toFixed(1)+'x',valuation:fmt(valuationBase),growth:pct(growthRate),margin:pct(profitMargin)};" +
  "var valTip=baseMultiple<5?{code:'saasval_floor',params:valTipParams}:(baseMultiple<10?{code:'saasval_median',params:valTipParams}:{code:'saasval_premium',params:valTipParams});" +
  "mainResult+='💡 Tip: '+JSON.stringify(valTip);" +
  "if(annualRevenue>0){" +
  "var raisedGrowth=Math.min(150,growthRate+30);" +
  "var raisedMult=raisedGrowth>=100?10:raisedGrowth>=50?8:raisedGrowth>=30?7:5.5;" +
  "var raisedVal=annualRevenue*raisedMult;" +
  "var raisedProfit=profitMargin+10;" +
  "var profitMult=baseMultiple+(raisedProfit>=30?0.5:0);" +
  "var profitVal=annualRevenue*profitMult;" +
  "mainResult+='\\n\\n'+tk('calc_out.section.what_if_growth_margin','🔄 What-If Scenarios')+'\\n';" +
  "mainResult+='• '+tk('calc_out.saas_valuation.row.whatif_growth_raised','If growth → '+raisedGrowth.toFixed(0)+'% YoY:  multiple '+raisedMult.toFixed(1)+'x  → $'+Math.round(raisedVal).toLocaleString()+' (vs $'+Math.round(valuationBase).toLocaleString()+')',{growth:raisedGrowth.toFixed(0)+'% YoY',mult:raisedMult.toFixed(1)+'x',val:'$'+Math.round(raisedVal).toLocaleString(),base:'$'+Math.round(valuationBase).toLocaleString()})+'\\n';" +
  "mainResult+='• '+tk('calc_out.saas_valuation.row.whatif_margin_raised','If margin → '+raisedProfit.toFixed(0)+'%:  multiple '+profitMult.toFixed(1)+'x  → $'+Math.round(profitVal).toLocaleString(),{margin:raisedProfit.toFixed(0)+'%',mult:profitMult.toFixed(1)+'x',val:'$'+Math.round(profitVal).toLocaleString()})+'\\n';" +
  "mainResult+='• '+tk('calc_out.label.distress_floor_2x','Distress floor (2x)')+':  $'+Math.round(annualRevenue*2).toLocaleString()+'  '+tk('calc_out.label.asset_only_sale','(asset-only sale)')+'\\n';" +
  "}" +
  "if(annualRevenue<=0){mainResult+='\\n\\n'+tk('calc_out.section.valuation_health','🩺 Valuation Health:')+'\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n• '+tk('calc_out.saas_valuation.row.health_zero_revenue','🔴 Revenue is 0 or negative. SaaS valuation requires recurring revenue. Build MRR first before exit planning.');}" +
  "else if(valuationBase<=0){mainResult+='\\n\\n'+tk('calc_out.section.valuation_health','🩺 Valuation Health:')+'\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n• '+tk('calc_out.saas_valuation.row.health_zero_multiple','🔴 Multiple is 0 or negative. No reasonable valuation can be derived.');}" +
  "else if(annualRevenue<100000){mainResult+='\\n\\n'+tk('calc_out.section.valuation_health','🩺 Valuation Health:')+'\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n• '+tk('calc_out.saas_valuation.row.health_pre_revenue','🟡 Pre-revenue / seed stage. Most investors won\\'t use revenue multiple. Focus on traction, growth, and team before valuation conversations.');}" +
  "else if(annualRevenue<1000000){mainResult+='\\n\\n'+tk('calc_out.section.valuation_health','🩺 Valuation Health:')+'\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n• '+tk('calc_out.saas_valuation.row.health_early_revenue','🟠 Early revenue ($'+(annualRevenue/1000).toFixed(0)+'K ARR). Typical seed-to-Series A range. Multiple: 5-15x depending on growth rate.',{arr_k:'$'+(annualRevenue/1000).toFixed(0)+'K'});}" +
  "else if(annualRevenue<10000000){mainResult+='\\n\\n'+tk('calc_out.section.valuation_health','🩺 Valuation Health:')+'\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n• '+tk('calc_out.saas_valuation.row.health_mid_stage','🟢 Mid-stage ($'+(annualRevenue/1000000).toFixed(1)+'M ARR). Series A-B range. Multiple: 8-20x. Growth rate is the #1 multiple driver.',{arr_m:'$'+(annualRevenue/1000000).toFixed(1)+'M'});}" +
  "else{mainResult+='\\n\\n'+tk('calc_out.section.valuation_health','🩺 Valuation Health:')+'\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n• '+tk('calc_out.saas_valuation.row.health_late_stage','🟢 Late-stage ($'+(annualRevenue/1000000).toFixed(1)+'M ARR). Series C+ range. Multiple: 10-30x. Profitability and net dollar retention matter more.',{arr_m:'$'+(annualRevenue/1000000).toFixed(1)+'M'});}" +
  "mainResult+='\\n\\n'+tk('calc_out.section.what_if_growth_margin','🔄 What-If Scenarios')+':\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';" +
  "if(annualRevenue>0&&baseMultiple>0){" +
  "var doubleRev=annualRevenue*2;" +
  "var valAtDouble=doubleRev*baseMultiple;" +
  "var valAtHigherMult=annualRevenue*(baseMultiple*1.5);" +
  "var valAtProfitable=annualRevenue*baseMultiple*1.3;" +
  "mainResult+='\\n• '+tk('calc_out.label.double_arr_12m','Double ARR (next 12 months at 100% growth)')+':  $'+fmt(annualRevenue)+' → $'+fmt(doubleRev)+'  | '+tk('calc_out.label.valuation','Valuation')+' $'+fmt(valAtDouble);" +
  "mainResult+='\\n• '+tk('calc_out.label.boost_multiple_50pct','Boost multiple 50% (better growth/profitability story)')+':  '+tk('calc_out.label.valuation','Valuation')+' $'+fmt(valAtHigherMult)+'  '+tk('calc_out.label.no_arr_change','(no ARR change)');" +
  "mainResult+='\\n• '+tk('calc_out.label.reach_profitability','Reach profitability (typically +30% multiple)')+':  '+tk('calc_out.label.valuation','Valuation')+' $'+fmt(valAtProfitable);" +
  "if(growthRate>0){" +
  "var t2Growth=annualRevenue*Math.pow(1+growthRate/100,2);" +
  "var valAtT2=t2Growth*baseMultiple;" +
  "mainResult+='\\n• '+tk('calc_out.label.at_current_growth_2y','At current growth ('+growthRate+'% YoY) in 2 years',{growth:String(growthRate)+'%'})+':  ARR $'+fmt(t2Growth)+'  | '+tk('calc_out.label.valuation','Valuation')+' $'+fmt(valAtT2)+'  (+$'+fmt(valAtT2-valuationBase)+')';" +
  "}" +
  "}else{mainResult+='\\n• '+tk('calc_out.saas_valuation.row.whatif_cannot_model','⚠️ Cannot model — enter ARR and multiple to see scenarios.');}" +
  "if(annualRevenue>0){" +
  "mainResult+='\\n\\n'+tk('calc_out.section.break_even_multiple','⚖️ Break-Even Multiple')+'\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';" +
  "if(baseMultiple<3){" +
  "mainResult+='\\n• '+tk('calc_out.saas_valuation.row.breakeven_below_floor','🔴 Current multiple '+baseMultiple.toFixed(1)+'x is below 3x SaaS floor — investors won\\'t bite.',{mult:baseMultiple.toFixed(1)});" +
  "mainResult+='\\n• '+tk('calc_out.saas_valuation.row.breakeven_to_reach_3x','To reach 3x floor:  need growth '+Math.max(10,growthRate).toFixed(0)+'%+  AND  margin '+Math.max(20,profitMargin).toFixed(0)+'%+',{growth:Math.max(10,growthRate).toFixed(0),margin:Math.max(20,profitMargin).toFixed(0)});" +
  "}else if(baseMultiple<5){" +
  "mainResult+='\\n• '+tk('calc_out.saas_valuation.row.breakeven_at_saas_floor','🟡 Current multiple '+baseMultiple.toFixed(1)+'x is at SaaS floor. Below market median (5-8x).',{mult:baseMultiple.toFixed(1)});" +
  "mainResult+='\\n• '+tk('calc_out.saas_valuation.row.breakeven_to_reach_5x','To reach 5x (median):  grow 30%+ YoY, OR push margin above 20%');" +
  "}else if(baseMultiple<10){" +
  "mainResult+='\\n• '+tk('calc_out.saas_valuation.row.breakeven_at_market_median','🟢 Current multiple '+baseMultiple.toFixed(1)+'x is at market median. Strong position.',{mult:baseMultiple.toFixed(1)});" +
  "mainResult+='\\n• '+tk('calc_out.saas_valuation.row.breakeven_to_reach_10x','To reach 10x+ (premium):  sustain 50%+ growth OR reach profitability');" +
  "}else{mainResult+='\\n• '+tk('calc_out.saas_valuation.row.breakeven_premium','🟢 Premium multiple '+baseMultiple.toFixed(1)+'x. Maintain growth and margin to justify.',{mult:baseMultiple.toFixed(1)});}" +
  "}" +
  "if(annualRevenue>0){" +
  "mainResult+='\\n\\n'+tk('calc_out.section.valuation_milestones','🎯 Valuation Milestones')+'\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';" +
  "var milestones=[{arr:1e6,label:'$1M ARR'},{arr:1e7,label:'$10M ARR'},{arr:1e8,label:'$100M ARR'}];" +
  "for(var mi=0;mi<milestones.length;mi++){" +
  "var m=milestones[mi];" +
  "if(annualRevenue>=m.arr){mainResult+='\\n• '+m.label+':  '+tk('calc_out.saas_valuation.row.milestone_reached','✅ reached  (current: $'+(annualRevenue/1e6).toFixed(1)+'M)',{current:(annualRevenue/1e6).toFixed(1)+'M'});}" +
  "else if(growthRate>0){var yearsToReach=Math.log(m.arr/annualRevenue)/Math.log(1+growthRate/100);if(isFinite(yearsToReach)&&yearsToReach<20){mainResult+='\\n• '+m.label+':  '+tk('calc_out.saas_valuation.row.milestone_years',yearsToReach.toFixed(1)+' years  (at '+growthRate.toFixed(0)+'% YoY growth)',{years:yearsToReach.toFixed(1),growth:growthRate.toFixed(0)});}else{mainResult+='\\n• '+m.label+':  '+tk('calc_out.saas_valuation.row.milestone_unrealistic','unrealistic at current growth — accelerate or accept smaller scale');}}" +
  "else{mainResult+='\\n• '+m.label+':  '+tk('calc_out.saas_valuation.row.milestone_zero_growth','zero growth — not reachable without acceleration');}" +
  "}" +
  "}" +
  // ⚠️ results 快照必须在**所有** mainResult 追加之后（Break-Even / Milestones 两段也在内）
  "var results=[mainResult];" +
  "var multipleScenarios=[{multiple:2,token:tk('calc_out.label.scenario_distressed_sale','Distressed Sale (2x)')},{multiple:4,token:tk('calc_out.label.scenario_flat_growth','Flat Growth (4x)')},{multiple:6,token:tk('calc_out.label.scenario_steady_growth','Steady Growth (6x)')},{multiple:10,token:tk('calc_out.label.scenario_high_growth','High Growth (10x)')},{multiple:15,token:tk('calc_out.label.scenario_hyper_growth','Hyper-Growth (15x)')}];" +
  "for(var i=0;i<multipleScenarios.length;i++){var val=annualRevenue*multipleScenarios[i].multiple;results.push(multipleScenarios[i].token+': '+fmt(annualRevenue)+' ARR × '+multipleScenarios[i].multiple+'x = '+fmt(val)+' '+tk('calc_out.label.valuation_suffix','valuation'));}" +
  "return results;";



const engine: ToolEngine = {
  slug: 'solopreneur-saas-valuation-calculator',
  title: 'SaaS Valuation Calculator',
  description: 'Estimate your SaaS company valuation based on ARR, growth rate, and profit margin. See how different multiples and scenarios affect your exit value.',
  inputs: [
    { name: 'annualRevenue', label: 'Annual Revenue / ARR ($)', placeholder: 'e.g. 200000', type: 'number' },
    { name: 'growthRate', label: 'YoY Growth Rate (%)', placeholder: 'e.g. 50', type: 'number' },
    { name: 'profitMargin', label: 'Profit Margin (%)', placeholder: 'e.g. 25', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  // P140f-p3-T7: minimal Playbook 6 字段 template (Goal=该不该决策)
  // Goal 含"决策"+"该不该"双关键词 → 通过 T1 zod refine 校验
  playbook: {
    goal: '用户该不该按这个估值区间去谈融资，还是先把 ARR 的质量修到能站得住',
    input: 'engine 定义的 inputs 字段',
    output: 'engine 定义的 generate() 返回数组',
    constraint: 'apply 引擎 inputs 时受实际场景约束',
    tool: '页面的「🧭 算完之后」决策区块（决策支持已由区块独占）',
    memory: 'v2.0 11 business domain benchmark + P140f Phase 4 主题簇',
  },
  generate(inputs: Record<string, string>): string[] {
    return calculateValuation(inputs);
  },
  staticExamples: [
    '$calc_out.section.saas_valuation_estimate|💰 SaaS Valuation Estimate|\n\n• $calc_out.label.annual_revenue|Annual Revenue (ARR)|: $1,000,000\n• $calc_out.label.yoy_growth_rate|YoY Growth Rate|: 100.0%\n• $calc_out.label.profit_margin|Profit Margin|: 20.0%\n• $calc_out.label.annual_profit|Annual Profit|: $200,000\n\n━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.valuation_range|📊 Valuation Range (Revenue Multiple):|\n\n• $calc_out.label.conservative|Conservative| (8.0x): $8,000,000\n• $calc_out.label.base_case|Base Case| (10.0x): $10,000,000\n• $calc_out.label.optimistic|Optimistic| (15.0x): $15,000,000\n\n• $calc_out.label.estimated_exit_value|Estimated Exit Value|: $3,000,000\n\n━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.saas_valuation.row.assessment_high_growth|🚀 You have high-growth SaaS metrics. Your multiple range reflects the premium that high-growth companies command. Focus on sustaining growth while improving margins.|\n\n💡 Tip: {"code":"saasval_premium","params":{"multiple":"10.0x","valuation":"$10,000,000","growth":"100.0%","margin":"20.0%"}}\n\n$calc_out.section.what_if_growth_margin|🔄 What-If Scenarios|\n• $calc_out.saas_valuation.row.whatif_growth_raised{"growth":"130% YoY","mult":"10.0x","val":"$10,000,000","base":"$10,000,000"}|If growth → 130% YoY:  multiple 10.0x  → $10,000,000 (vs $10,000,000)|\n• $calc_out.saas_valuation.row.whatif_margin_raised{"margin":"30%","mult":"10.5x","val":"$10,500,000"}|If margin → 30%:  multiple 10.5x  → $10,500,000|\n• $calc_out.label.distress_floor_2x|Distress floor (2x)|:  $2,000,000  $calc_out.label.asset_only_sale|(asset-only sale)|\n\n\n$calc_out.section.valuation_health|🩺 Valuation Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.saas_valuation.row.health_mid_stage{"arr_m":"$1.0M"}|🟢 Mid-stage ($1.0M ARR). Series A-B range. Multiple: 8-20x. Growth rate is the #1 multiple driver.|\n\n$calc_out.section.what_if_growth_margin|🔄 What-If Scenarios|:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.double_arr_12m|Double ARR (next 12 months at 100% growth)|:  $$1,000,000 → $$2,000,000  | $calc_out.label.valuation|Valuation| $$20,000,000\n• $calc_out.label.boost_multiple_50pct|Boost multiple 50% (better growth/profitability story)|:  $calc_out.label.valuation|Valuation| $$15,000,000  $calc_out.label.no_arr_change|(no ARR change)|\n• $calc_out.label.reach_profitability|Reach profitability (typically +30% multiple)|:  $calc_out.label.valuation|Valuation| $$13,000,000\n• $calc_out.label.at_current_growth_2y{"growth":"100%"}|At current growth (100% YoY) in 2 years|:  ARR $$4,000,000  | $calc_out.label.valuation|Valuation| $$40,000,000  (+$$30,000,000)\n\n$calc_out.section.break_even_multiple|⚖️ Break-Even Multiple|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.saas_valuation.row.breakeven_premium{"mult":"10.0"}|🟢 Premium multiple 10.0x. Maintain growth and margin to justify.|\n\n$calc_out.section.valuation_milestones|🎯 Valuation Milestones|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $1M ARR:  $calc_out.saas_valuation.row.milestone_reached{"current":"1.0M"}|✅ reached  (current: $1.0M)|\n• $10M ARR:  $calc_out.saas_valuation.row.milestone_years{"years":"3.3","growth":"100"}|3.3 years  (at 100% YoY growth)|\n• $100M ARR:  $calc_out.saas_valuation.row.milestone_years{"years":"6.6","growth":"100"}|6.6 years  (at 100% YoY growth)|\n$calc_out.label.scenario_distressed_sale|Distressed Sale (2x)|: $1,000,000 ARR × 2x = $2,000,000 $calc_out.label.valuation_suffix|valuation|\n$calc_out.label.scenario_flat_growth|Flat Growth (4x)|: $1,000,000 ARR × 4x = $4,000,000 $calc_out.label.valuation_suffix|valuation|\n$calc_out.label.scenario_steady_growth|Steady Growth (6x)|: $1,000,000 ARR × 6x = $6,000,000 $calc_out.label.valuation_suffix|valuation|\n$calc_out.label.scenario_high_growth|High Growth (10x)|: $1,000,000 ARR × 10x = $10,000,000 $calc_out.label.valuation_suffix|valuation|\n$calc_out.label.scenario_hyper_growth|Hyper-Growth (15x)|: $1,000,000 ARR × 15x = $15,000,000 $calc_out.label.valuation_suffix|valuation|',
    'Distressed Sale (2x): $200,000 ARR × 2x = $400,000 valuation',
    'Flat Growth (4x): $200,000 ARR × 4x = $800,000 valuation',
    'Steady Growth (6x): $200,000 ARR × 6x = $1,200,000 valuation',
    'High Growth (10x): $200,000 ARR × 10x = $2,000,000 valuation',
  ],
  faq: [
    { q: 'How are SaaS companies valued?', a: 'SaaS companies are typically valued on a revenue multiple basis, usually 3-10x ARR. The exact multiple depends primarily on growth rate (the #1 driver), followed by profit margin, market size, churn rate, and competitive moat. Public SaaS companies trade at 5-15x revenue on average.' },
    { q: 'What is the Rule of 40 in SaaS valuation?', a: 'The Rule of 40 states that your growth rate + profit margin should equal 40% or more. If you are growing 60% and have a -20% margin, your score is 40 — you pass. If you are growing 15% with a 30% margin, your score is 45 — you also pass. Companies above 40 command premium multiples.' },
    { q: 'Does profitability matter for SaaS valuation?', a: 'Yes, increasingly so. From 2022 onward, the market shifted from "growth at all costs" to "efficient growth." Profitable SaaS companies now command 1-3x higher revenue multiples than unprofitable ones. Aim for at least 10-20% profit margins to maximize your multiple.' },
    { q: 'What is my SaaS actually worth to a buyer?', a: 'Valuation is theoretical — what matters is what someone will pay. For solopreneur SaaS businesses under $1M ARR, expect 2-4x SDE (Seller Discretionary Earnings), not ARR multiples. Marketplaces like Acquire.com and MicroAcquire show real transaction data. Most micro-SaaS sells for 2.5-3.5x annual profit.' },
    { q: 'How can I increase my SaaS valuation?', a: 'Focus on four levers: (1) Accelerate growth — even 10% improvement in growth rate can add 1-2x to your multiple. (2) Improve profit margins — cut costs, raise prices. (3) Reduce churn — lower churn means more predictable revenue. (4) Diversify revenue — multiple customer segments or products reduce buyer risk and increase multiples.' },
    { q: "How is a SaaS company valued?", a: "SaaS valuation = ARR × multiple. For $10M ARR, 10x: $100M. Multiples vary by: 1) Growth, 2) NRR, 3) Rule of 40, 4) Gross margin, 5) Market. By stage: 1) Seed: 10-15x forward ARR, 2) Series A: 8-12x, 3) Series B: 6-10x, 4) Public: 5-15x. 8-12x for healthy SaaS. Use comparable transactions, public comps, DCF. 100%+ growth + 110% NRR = 15-20x." },
    { q: "What is the difference between public and private SaaS multiples?", a: "Public SaaS: 8-15x ARR (median ~10x). 15-25x. Mature: 4-8x. Private: similar (slight premium for high growth). Benchmarks: Snowflake peak 100x, now 60x. Datadog: 30x. Cloudflare: 25x. Public median: 10x. Private: 8-15x. use public comps + private transactions. Recent rounds: most accurate. Adjust for: growth, retention, margin, market. 10x private round for healthy SaaS." },
    { q: "How do I justify a higher valuation?", a: "1) Growth rate (50%+ = 15-20x, 100%+ = 20-30x), 2) NRR (110%+ = 2-3 multiple lift), 3) Gross margin (80%+ = premium), 4) Rule of 40 (above 40 = premium), 5) Payback (<12 months), 6) Sales efficiency, 7) Market size, 8) Team quality, 9) Product differentiation. 1) + 2) + 3) = 80% of valuation. Aim for top quartile on 3-4 metrics. Strong story: 15-20x multiple." },
    { q: "What is a pre-revenue SaaS valuation?", a: "Pre-revenue: 1) Pre-PMF: $1-5M (founder + idea), 2) PMF validation: $5-15M (early traction), 3) Pre-launch ARR: $15-30M (committed), 4) $100K+ ARR: $10-30M (with traction). Methods: 1) Comparable transactions, 2) Forward multiple (4-5x future ARR), 3) DCF (very speculative), 4) Berkus method, 5) Scorecard valuation. Most: $1-5M for idea, $5-15M for pre-PMF, $15-30M for $100K+ ARR. Be honest: most pre-revenue = $2-5M." },
    { q: "What is the difference between ARR and revenue for valuation?", a: "ARR: annualized subscription revenue. Revenue: total (including one-time, services). For valuation: ARR is more relevant (recurring, predictable). ARR multiple typically 1.5-2x revenue multiple. SaaS pure ARR: 10-15x. Mixed (services + SaaS): 3-6x. Most: pure ARR = premium. Revenue with services: discount. Calculate: ARR multiple if >80% recurring. Revenue multiple if <50% recurring. Be honest: cleanest = best." },
    { q: "How does growth rate affect valuation?", a: "Growth rate = #1 driver of multiple. Below 30%: 3-6x. 30-50%: 5-10x. 50-100%: 8-15x. 100-150%: 12-20x. 150%+: 20-30x. 200%+: 30x+. 100% growth = ~10-15x for healthy SaaS. Top: 200%+ growth = premium. aim for 100%+ YoY in early years. Investors: pay 2-3x multiple for 100% growth. Use TTM (trailing 12 months) + forward (next 12). TTM is more reliable." },
    { q: "What is DCF valuation and when should I use it?", a: "DCF (Discounted Cash Flow): valuation based on future cash flows. Formula: sum of (FCF / (1+r)^n) + terminal value. Use for: mature companies, predictable cash flows. Avoid for: pre-revenue, early-stage. SaaS DCF: 1) 5-year projection, 2) Discount rate 10-15%, 3) Terminal growth 3-4%. DCF understates SaaS value (high growth, low margins early). Use comparable transactions + DCF + multiples. multiples are simpler." },
    { q: "How is enterprise value different from equity value?", a: "Enterprise value (EV): total company value (equity + debt - cash). Equity value: just shares. valuation refers to EV. For $50M EV, $5M cash, $10M debt: equity = $45M. Investors: buy equity, value is EV. Calculate: EV = equity + debt - cash + minority + preferred. For private: typically equity = post-money valuation. Be clear: are you quoting EV or equity? equity (post-money). EV: include net debt. Most tools: equity-based." },
  ],
  howToUse: [
    'Enter your annual recurring revenue (ARR).',
    'Enter your year-over-year growth rate as a percentage.',
    'Enter your profit margin as a percentage.',
    'Review your valuation range: conservative, base case, and optimistic.',
    'Check your estimated exit value based on your profit and growth.',
    'Scroll down to see 5 valuation scenarios at different revenue multiples.',
  ],
  engineKey: true,
};

registerEngine(engine);
