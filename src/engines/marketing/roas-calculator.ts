import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-8：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
//   ⚠️ 章节标题 / 标签用**字面量 token**（code|原文|）；整行结论句用
//      makeToken(code, fallback, params) ⇒ fallback 与 params 取**同一个变量**。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

// =====================================================================
// ROAS Calculator (P6-1) — Business v3 standard (6+ emoji sections)
// =====================================================================
//
// Gross ROAS = revenue / adSpend. Net profit margin-aware ROAS includes
// gross margin to show true profitability after cost of goods / fulfillment.
// Health bands: 🟢 ≥4.0x · 🟡 2.0-4.0x · 🟠 1.0-2.0x · 🔴 <1.0x
//
// attributionWindow kept as input for future extensibility (Meta's default
// is 7d click; Google Ads default 28d click; some teams run 90d for high-AOV).
// It does not currently modify the ROAS ratio but documents the assumption.

// ============== Health band constants (per-file, exported for tests) ==============

export const HEALTH_BANDS = {
  excellent: 4.0,
  good: [2.0, 4.0],
  warning: [1.0, 2.0],
  critical: 0,
} as const;

// ============== Math helpers (exported for tests) ==============

/** Gross ROAS = revenue / adSpend. Returns Infinity when adSpend = 0. */
export function calcROAS(adSpend: number, revenue: number): number {
  if (adSpend <= 0) return Infinity;
  return revenue / adSpend;
}

/** Net ROAS as percent: ((revenue × margin%) − adSpend) / adSpend × 100. */
export function calcNetROAS(adSpend: number, revenue: number, grossMargin: number): number {
  if (adSpend <= 0) return Infinity;
  return ((revenue * (grossMargin / 100)) - adSpend) / adSpend * 100;
}

/** Net profit ($) = revenue × margin% − adSpend. */
export function calcNetProfit(adSpend: number, revenue: number, grossMargin: number): number {
  return revenue * (grossMargin / 100) - adSpend;
}

/** Effective cost-per-$1000-revenue: (adSpend / revenue) × 1000. */
export function effectiveCPMPer1000(adSpend: number, revenue: number): number {
  if (revenue <= 0) return Infinity;
  return (adSpend / revenue) * 1000;
}

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const adSpend = clampNonNegative(parseFloat(inputs.adSpend) || 0);
  const revenue = clampNonNegative(parseFloat(inputs.revenue) || 0);
  const grossMargin = clampNonNegative(parseFloat(inputs.grossMargin) || 0);
  const attributionWindow = inputs.attributionWindow || '28d';

  // Edge: ad spend = 0 → prompt to enter value
  if (adSpend === 0) {
    return [
      '$calc_out.section.roas_calculator|⏰ ROAS Calculator|\n\n' +
        makeToken('calc_out.roas.row.enter_inputs_required', '📊 Enter ad spend and revenue to see your return on ad spend ratio (ROAS), net profit margin after ad costs, and projected scaling outcomes.'),
    ];
  }

  const roas = calcROAS(adSpend, revenue);
  const netROAS = calcNetROAS(adSpend, revenue, grossMargin);
  const netProfit = calcNetProfit(adSpend, revenue, grossMargin);
  const cpm = effectiveCPMPer1000(adSpend, revenue);

  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const money2 = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });

  // Health band (gross ROAS)
  let healthEmoji: string;
  let healthLabel: string;
  let healthRow: string;
  if (roas >= HEALTH_BANDS.excellent) {
    healthEmoji = '🟢';
    healthLabel = 'Excellent — ROAS ≥ 4.0x; profitable and scalable';
    healthRow = makeToken('calc_out.roas.row.health_excellent', healthEmoji + ' ' + healthLabel);
  } else if (roas >= HEALTH_BANDS.good[0]) {
    healthEmoji = '🟡';
    healthLabel = 'Good — ROAS 2.0–4.0x; profitable with room to optimize';
    healthRow = makeToken('calc_out.roas.row.health_good', healthEmoji + ' ' + healthLabel);
  } else if (roas >= HEALTH_BANDS.warning[0]) {
    healthEmoji = '🟠';
    healthLabel = 'Warning — ROAS 1.0–2.0x; breaking even on revenue; margin is critical';
    healthRow = makeToken('calc_out.roas.row.health_warning', healthEmoji + ' ' + healthLabel);
  } else {
    healthEmoji = '🔴';
    healthLabel = 'Critical — ROAS < 1.0x; losing money per ad dollar';
    healthRow = makeToken('calc_out.roas.row.health_critical', healthEmoji + ' ' + healthLabel);
  }

  // What-If: +20% revenue · −20% spend · both
  const revUp = revenue * 1.2;
  const spendDown = adSpend * 0.8;
  const roasRevUp = revUp / adSpend;
  const roasSpendDown = revenue / spendDown;
  const roasBoth = revUp / spendDown;
  const netProfitRevUp = revUp * (grossMargin / 100) - adSpend;
  const netProfitSpendDown = revenue * (grossMargin / 100) - spendDown;

  // Break-Even: revenue needed at current margin so net profit = 0
  // revenue * (margin/100) = adSpend  →  revenue = adSpend / (margin/100)
  const breakevenRevenue = grossMargin > 0 ? adSpend / (grossMargin / 100) : adSpend;
  const breakevenROAS = breakevenRevenue / adSpend;
  const revIncreaseNeeded = revenue > 0 ? ((breakevenRevenue - revenue) / revenue) * 100 : 0;

  // Milestone: scaling 2x at same ratio
  const scale2xRevenue = revenue * 2;
  const scale2xSpend = adSpend * 2;
  const scale2xProfit = scale2xRevenue * (grossMargin / 100) - scale2xSpend;
  // 12-month projection
  const annualRevenue = revenue * 12;
  const annualNetProfit = netProfit * 12;

  // Tip: band-driven contextual advice
  // P168 B3-4：Tip 改成**建议码**（语义码 + 参数）—— 英文句子搬进 locale，
  //   zh 页的动态层才会是中文（照 B3-3 已上线的形态 A）。
  //   ⚠️ **分支条件与阈值一个都不改**（只把每支的文案换成对应的码）。
  //   ⚠️ customFn 里必须写**逐字相同**的一份（守卫「两套实现不许漂」守着这条）。
  let tip: string;
  if (roas < 1.0) {
    tip = JSON.stringify({ code: 'roas_critical', params: { roas: roas.toFixed(2) } });
  } else if (roas >= HEALTH_BANDS.excellent) {
    tip = JSON.stringify({ code: 'roas_excellent', params: { roas: roas.toFixed(2) } });
  } else if (roas >= HEALTH_BANDS.good[0]) {
    tip = JSON.stringify({ code: 'roas_good', params: { roas: roas.toFixed(2) } });
  } else {
    // 1.0-2.0 range
    if (grossMargin < 50) {
      tip = JSON.stringify({
        code: 'roas_warning_thin_margin',
        params: { roas: roas.toFixed(2), grossMargin: grossMargin.toFixed(1) },
      });
    } else {
      tip = JSON.stringify({
        code: 'roas_warning_funnel',
        params: { roas: roas.toFixed(2), attributionWindow: attributionWindow },
      });
    }
  }

  const r =
    '$calc_out.section.roas_calculator|⏰ ROAS Calculator|\n\n' +
    '$calc_out.section.roas_health|🩺 Health:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthRow + '\n' +
    '• $calc_out.label.gross_roas|Gross ROAS|: ' + roas.toFixed(2) + 'x  ·  $calc_out.label.net_profit_margin|Net profit margin|: ' + netROAS.toFixed(1) + '%\n' +
    '• $calc_out.label.attribution|Attribution|: ' + attributionWindow + '  ·  $calc_out.label.effective_cost_per_1k_revenue|Effective cost per $1K revenue|: ' + money2(cpm) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.roas_inputs_snapshot|📊 Inputs Snapshot:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• $calc_out.label.ad_spend|Ad spend|:     ' + money(adSpend) + '\n' +
    '• $calc_out.label.revenue|Revenue|:      ' + money(revenue) + '\n' +
    '• $calc_out.label.gross_margin|Gross margin|: ' + grossMargin.toFixed(1) + '%\n' +
    '• ' + makeToken('calc_out.roas.row.net_profit_after_ad_cost', 'Net profit:   ' + money(netProfit) + '  (after ad cost)', { profit: money(netProfit) }) + '\n' +
    '• $calc_out.label.attribution|Attribution|:  ' + attributionWindow + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.roas_what_if|🔄 What-If:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.roas.row.whatif_revenue_up_20', '+20% revenue: ROAS = ' + roasRevUp.toFixed(2) + 'x · net profit = ' + money(netProfitRevUp), { roas: roasRevUp.toFixed(2) + 'x', profit: money(netProfitRevUp) }) + '\n' +
    '• ' + makeToken('calc_out.roas.row.whatif_spend_down_20', '−20% spend:   ROAS = ' + roasSpendDown.toFixed(2) + 'x · net profit = ' + money(netProfitSpendDown), { roas: roasSpendDown.toFixed(2) + 'x', profit: money(netProfitSpendDown) }) + '\n' +
    '• ' + makeToken('calc_out.roas.row.whatif_both', 'Both:         ROAS = ' + roasBoth.toFixed(2) + 'x (compound gain)', { roas: roasBoth.toFixed(2) + 'x' }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.roas_break_even|⚖️ Break-Even:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.roas.row.break_even_revenue', 'Break-even revenue: ' + money(breakevenRevenue) + '  (at ' + grossMargin.toFixed(0) + '% margin → ROAS = ' + breakevenROAS.toFixed(2) + 'x)', { revenue: money(breakevenRevenue), margin: grossMargin.toFixed(0), roas: breakevenROAS.toFixed(2) + 'x' }) + '\n' +
    '• ' + makeToken('calc_out.roas.row.revenue_lift_needed', 'Revenue lift needed: ' + revIncreaseNeeded.toFixed(1) + '% to break even on net profit', { lift: revIncreaseNeeded.toFixed(1) + '%' }) + '\n' +
    '• ' + makeToken('calc_out.roas.row.raise_gross_margin', 'Or raise gross margin to ' + ((adSpend / revenue) * 100).toFixed(1) + '% on current revenue to break even', { margin: ((adSpend / revenue) * 100).toFixed(1) + '%' }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.roas_milestone|🎯 Milestone:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.roas.row.scale_2x', 'Scale 2x at current ratio: revenue = ' + money(scale2xRevenue) + ' · profit = ' + money(scale2xProfit) + '/period', { revenue: money(scale2xRevenue), profit: money(scale2xProfit) }) + '\n' +
    '• ' + makeToken('calc_out.roas.row.projection_12_month', '12-month projection:        revenue = ' + money(annualRevenue) + ' · net profit = ' + money(annualNetProfit), { revenue: money(annualRevenue), profit: money(annualNetProfit) }) + '\n' +
    '• ' + makeToken('calc_out.roas.row.assumes_constant_ratio', '(Assumes constant ratio — actual scaling often degrades 10–30% as audience saturates)') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  // P168 B3-4：**🧭 四段已迁到页面的「🧭 算完之后」区块**
  //   （src/i18n/locales/{en,zh}.json 的 tools.<slug>.decision_goal /
  //     decision_recommendation / decision_constraint / decision_next_tool，双语）
  //   ⇒ 引擎只负责算；**决策支持由区块独占** ⇒ 同页不再有两份决策建议。
  //   ⚠️ 引擎里**不要**再写这段：区块与卡片会同时渲染同一件事。

  // P140f-4: L5 Decision Recommendation (per ADR-0002) — v2.0 灵魂 = Decision Support
  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  // P168 B3-8：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 服务端与客户端输出逐字节相同，不可能漂移；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS +
  "function cROAS(s,r){if(s<=0)return Infinity;return r/s;}" +
  "function cNetROAS(s,r,m){if(s<=0)return Infinity;return((r*(m/100))-s)/s*100;}" +
  "function cNetProf(s,r,m){return r*(m/100)-s;}" +
  "function ecpm(s,r){if(r<=0)return Infinity;return(s/r)*1000;}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var as=cnn(parseFloat(inputs.adSpend)||0);" +
  "var rev=cnn(parseFloat(inputs.revenue)||0);" +
  "var gm=cnn(parseFloat(inputs.grossMargin)||0);" +
  "var aw=inputs.attributionWindow||'28d';" +
  "if(as===0){return['$calc_out.section.roas_calculator|\\u23F0 ROAS Calculator|\\n\\n'+tk('calc_out.roas.row.enter_inputs_required','\\uD83D\\uDCCA Enter ad spend and revenue to see your return on ad spend ratio (ROAS), net profit margin after ad costs, and projected scaling outcomes.')];}" +
  "var roas=cROAS(as,rev);" +
  "var nr=cNetROAS(as,rev,gm);" +
  "var np=cNetProf(as,rev,gm);" +
  "var cpmV=ecpm(as,rev);" +
  "function money(n){return '$'+Math.round(n).toLocaleString('en-US');}" +
  "function money2(n){return '$'+n.toLocaleString('en-US',{maximumFractionDigits:2});}" +
  "var he='',hl='',hr='';" +
  "if(roas>=4){he='\\uD83D\\uDFE2';hl='Excellent \\u2014 ROAS \\u2265 4.0x; profitable and scalable';hr=tk('calc_out.roas.row.health_excellent',he+' '+hl);}" +
  "else if(roas>=2){he='\\uD83D\\uDFE1';hl='Good \\u2014 ROAS 2.0\\u20134.0x; profitable with room to optimize';hr=tk('calc_out.roas.row.health_good',he+' '+hl);}" +
  "else if(roas>=1){he='\\uD83D\\uDFE0';hl='Warning \\u2014 ROAS 1.0\\u20132.0x; breaking even on revenue; margin is critical';hr=tk('calc_out.roas.row.health_warning',he+' '+hl);}" +
  "else{he='\\uD83D\\uDD34';hl='Critical \\u2014 ROAS < 1.0x; losing money per ad dollar';hr=tk('calc_out.roas.row.health_critical',he+' '+hl);}" +
  "var ru=rev*1.2,sd=as*0.8;" +
  "var rU=ru/as,rSD=rev/sd,rB=ru/sd;" +
  "var npRU=ru*(gm/100)-as;var npSD=rev*(gm/100)-sd;" +
  "var beR=gm>0?as/(gm/100):as;var beROAS=beR/as;" +
  "var rinc=rev>0?((beR-rev)/rev)*100:0;" +
  "var s2rev=rev*2;var s2sp=as*2;var s2pf=s2rev*(gm/100)-s2sp;" +
  "var annR=rev*12;var annNP=np*12;" +
  "var tip='';" +
  "if(roas<1){tip=JSON.stringify({code:'roas_critical',params:{roas:roas.toFixed(2)}});}" +
  "else if(roas>=4){tip=JSON.stringify({code:'roas_excellent',params:{roas:roas.toFixed(2)}});}" +
  "else if(roas>=2){tip=JSON.stringify({code:'roas_good',params:{roas:roas.toFixed(2)}});}" +
  "else{if(gm<50){tip=JSON.stringify({code:'roas_warning_thin_margin',params:{roas:roas.toFixed(2),grossMargin:gm.toFixed(1)}});}else{tip=JSON.stringify({code:'roas_warning_funnel',params:{roas:roas.toFixed(2),attributionWindow:aw}});}}" +
  "var r2='';" +
  "r2+='$calc_out.section.roas_calculator|\\u23F0 ROAS Calculator|\\n\\n';" +
  "r2+='$calc_out.section.roas_health|\\uD83E\\uDE7A Health:|\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+hr+'\\n';" +
  "r2+='\\u2022 $calc_out.label.gross_roas|Gross ROAS|: '+roas.toFixed(2)+'x  \\u00B7  $calc_out.label.net_profit_margin|Net profit margin|: '+nr.toFixed(1)+'%\\n';" +
  "r2+='\\u2022 $calc_out.label.attribution|Attribution|: '+aw+'  \\u00B7  $calc_out.label.effective_cost_per_1k_revenue|Effective cost per $1K revenue|: '+money2(cpmV)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='$calc_out.section.roas_inputs_snapshot|\\uD83D\\uDCCA Inputs Snapshot:|\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 $calc_out.label.ad_spend|Ad spend|:     '+money(as)+'\\n';" +
  "r2+='\\u2022 $calc_out.label.revenue|Revenue|:      '+money(rev)+'\\n';" +
  "r2+='\\u2022 $calc_out.label.gross_margin|Gross margin|: '+gm.toFixed(1)+'%\\n';" +
  "r2+='\\u2022 '+tk('calc_out.roas.row.net_profit_after_ad_cost','Net profit:   '+money(np)+'  (after ad cost)',{profit:money(np)})+'\\n';" +
  "r2+='\\u2022 $calc_out.label.attribution|Attribution|:  '+aw+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='$calc_out.section.roas_what_if|\\uD83D\\uDD04 What-If:|\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+tk('calc_out.roas.row.whatif_revenue_up_20','+20% revenue: ROAS = '+rU.toFixed(2)+'x \\u00B7 net profit = '+money(npRU),{roas:rU.toFixed(2)+'x',profit:money(npRU)})+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.roas.row.whatif_spend_down_20','\\u221220% spend:   ROAS = '+rSD.toFixed(2)+'x \\u00B7 net profit = '+money(npSD),{roas:rSD.toFixed(2)+'x',profit:money(npSD)})+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.roas.row.whatif_both','Both:         ROAS = '+rB.toFixed(2)+'x (compound gain)',{roas:rB.toFixed(2)+'x'})+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='$calc_out.section.roas_break_even|\\u2696\\uFE0F Break-Even:|\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+tk('calc_out.roas.row.break_even_revenue','Break-even revenue: '+money(beR)+'  (at '+gm.toFixed(0)+'% margin \\u2192 ROAS = '+beROAS.toFixed(2)+'x)',{revenue:money(beR),margin:gm.toFixed(0),roas:beROAS.toFixed(2)+'x'})+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.roas.row.revenue_lift_needed','Revenue lift needed: '+rinc.toFixed(1)+'% to break even on net profit',{lift:rinc.toFixed(1)+'%'})+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.roas.row.raise_gross_margin','Or raise gross margin to '+((as/rev)*100).toFixed(1)+'% on current revenue to break even',{margin:((as/rev)*100).toFixed(1)+'%'})+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='$calc_out.section.roas_milestone|\\uD83C\\uDFAF Milestone:|\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+tk('calc_out.roas.row.scale_2x','Scale 2x at current ratio: revenue = '+money(s2rev)+' \\u00B7 profit = '+money(s2pf)+'/period',{revenue:money(s2rev),profit:money(s2pf)})+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.roas.row.projection_12_month','12-month projection:        revenue = '+money(annR)+' \\u00B7 net profit = '+money(annNP),{revenue:money(annR),profit:money(annNP)})+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.roas.row.assumes_constant_ratio','(Assumes constant ratio \\u2014 actual scaling often degrades 10\\u201330% as audience saturates)')+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCA1 Tip: '+tip+'\\n';" +
  "return [r2];";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-roas-calculator',
  title: 'ROAS Calculator',
  description:
    'Calculate Return on Ad Spend (ROAS) with margin-aware net profit. See health bands, what-if scenarios (revenue +20% / spend -20%), break-even revenue, and 2x scaling projections. Industry benchmarks: 🟢 ≥4.0x · 🟡 2.0–4.0x · 🟠 1.0–2.0x · 🔴 <1.0x.',
  categoryId: 'M',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'adSpend', label: 'Ad Spend ($)', placeholder: 'e.g. 5000', type: 'number' },
    { name: 'revenue', label: 'Revenue Generated ($)', placeholder: 'e.g. 20000', type: 'number' },
    { name: 'grossMargin', label: 'Gross Margin (%)', placeholder: 'e.g. 60', type: 'number' },
    {
      name: 'attributionWindow',
      label: 'Attribution Window',
      placeholder: '',
      type: 'select',
      options: ['7d', '14d', '28d', '90d'],
    },
  ],
  keywords: [
    'ROAS calculator',
    'return on ad spend',
    'ROAS',
    'ad spend ROI',
    'marketing ROI',
    'ROAS benchmark',
    'gross ROAS',
    'net ROAS',
    'solopreneur marketing',
    'performance marketing',
  ],
  tags: ['marketing', 'roas', 'roi'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-04',
  sources: [
    'https://www.meta.com/business/help/430291176997522/',
    'https://support.google.com/google-ads/answer/14090053',
    'https://blog.hubspot.com/marketing/roas',
    'https://www.shopify.com/blog/roas',
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  calculate,
  generate: calculate,
  staticExamples: [
    '$calc_out.section.roas_calculator|⏰ ROAS Calculator|\n\n$calc_out.section.roas_health|🩺 Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.roas.row.health_excellent|🟢 Excellent — ROAS ≥ 4.0x; profitable and scalable|\n• $calc_out.label.gross_roas|Gross ROAS|: 4.00x  ·  $calc_out.label.net_profit_margin|Net profit margin|: 140.0%\n• $calc_out.label.attribution|Attribution|: 28d  ·  $calc_out.label.effective_cost_per_1k_revenue|Effective cost per $1K revenue|: $250\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.roas_inputs_snapshot|📊 Inputs Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.ad_spend|Ad spend|:     $5,000\n• $calc_out.label.revenue|Revenue|:      $20,000\n• $calc_out.label.gross_margin|Gross margin|: 60.0%\n• $calc_out.roas.row.net_profit_after_ad_cost{"profit":"$7,000"}|Net profit:   $7,000  (after ad cost)|\n• $calc_out.label.attribution|Attribution|:  28d\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.roas_what_if|🔄 What-If:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.roas.row.whatif_revenue_up_20{"roas":"4.80x","profit":"$9,400"}|+20% revenue: ROAS = 4.80x · net profit = $9,400|\n• $calc_out.roas.row.whatif_spend_down_20{"roas":"5.00x","profit":"$8,000"}|−20% spend:   ROAS = 5.00x · net profit = $8,000|\n• $calc_out.roas.row.whatif_both{"roas":"6.00x"}|Both:         ROAS = 6.00x (compound gain)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.roas_break_even|⚖️ Break-Even:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.roas.row.break_even_revenue{"revenue":"$8,333","margin":"60","roas":"1.67x"}|Break-even revenue: $8,333  (at 60% margin → ROAS = 1.67x)|\n• $calc_out.roas.row.revenue_lift_needed{"lift":"-58.3%"}|Revenue lift needed: -58.3% to break even on net profit|\n• $calc_out.roas.row.raise_gross_margin{"margin":"25.0%"}|Or raise gross margin to 25.0% on current revenue to break even|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.roas_milestone|🎯 Milestone:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.roas.row.scale_2x{"revenue":"$40,000","profit":"$14,000"}|Scale 2x at current ratio: revenue = $40,000 · profit = $14,000/period|\n• $calc_out.roas.row.projection_12_month{"revenue":"$240,000","profit":"$84,000"}|12-month projection:        revenue = $240,000 · net profit = $84,000|\n• $calc_out.roas.row.assumes_constant_ratio|(Assumes constant ratio — actual scaling often degrades 10–30% as audience saturates)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: {"code":"roas_excellent","params":{"roas":"4.00"}}\n',
  ],
  faq: [
    { q: 'What is a good ROAS?', a: 'A "good" ROAS depends on your gross margin. At 50% margin, ROAS ≥ 2.0x is break-even; ROAS ≥ 3.0x is comfortably profitable. At 70% margin, ROAS ≥ 1.5x is break-even. Most solopreneurs target 4.0x+ for sustainable scaling.' },
    { q: 'How does gross margin affect ROAS interpretation?', a: 'A 5x gross ROAS at 30% margin (1.5x net) is worse than 3x gross ROAS at 80% margin (2.4x net). Always evaluate ROAS alongside gross margin to know your real profitability per ad dollar.' },
    { q: 'What attribution window should I use?', a: 'Use 7d for impulse purchases, 28d (industry default) for mid-ticket, and 90d for high-AOV considered purchases. Mismatched windows cause ROAS to appear inflated or deflated versus true conversions.' },
    { q: 'Does ROAS include COGS or just ad cost?', a: 'Gross ROAS only factors ad cost. Net ROAS (margin-adjusted, shown here) subtracts both ad cost AND gross margin from revenue to reveal true profit per ad dollar. Always look at both.' },
    { q: "What is a good ROAS (Return on Ad Spend)?", a: "Benchmarks: 4:1 is good (return $4 per $1 spent), 2:1 is break-even (varies by margin), 8:1+ is excellent. By industry: e-commerce 2-3:1, B2B SaaS 3-5:1, high-ticket 5-10:1, low-margin 8-10:1+. Different break-evens based on margin. A 4:1 ROAS with 50% margin = 2x profit. Break-even: 1/margin ratio. Most teams: 3-5x ROAS target." },
    { q: "What is the difference between ROAS and ROI?", a: "ROAS: return on ad spend = revenue / ad cost. ROI: return on investment = (revenue - all costs) / all costs. ROAS: top-line marketing metric. ROI: bottom-line business metric. Use ROAS for: ad performance, channel comparison. Use ROI for: business unit decisions. ROAS 5:1 with high costs can mean ROI is negative. Track both." },
    { q: "How do I calculate break-even ROAS?", a: "Break-even ROAS = 1 / gross_margin. For 50% margin: 2:1. For 25% margin: 4:1. For 75% margin: 1.33:1. Above break-even = profit. Below = loss. SaaS gross margin typically 80%: break-even ROAS 1.25:1. E-commerce 30% margin: 3.33:1. Calculate: profit per sale = price × margin - ad_cost. Aim: 2-3x break-even." },
    { q: "How do I improve ROAS?", a: "1) Better targeting (lookalikes, exclusions), 2) Better creative (testing 3-5 versions), 3) Better landing pages (match ad message), 4) Bid optimization (target CPA, not max clicks), 5) Audience segmentation, 6) Retargeting (high intent), 7) Attribution (last-click vs multi-touch). Most teams 30-50% ROAS improvement in 3-6 months. Test continuously." },
    { q: "What is a good ROAS for Google Ads vs Facebook Ads?", a: "Google: 3-5:1 typical for search, 1-3:1 for display. Facebook: 2-4:1 for conversion, 1-3:1 for retargeting. Google: higher intent, higher CPC. Facebook: lower intent, lower CPC. Top performing channels: Google search + retargeting. Facebook: best for awareness, prospecting. Most teams: $2-4 revenue per $1 ad spend across both." },
    { q: "How do I handle attribution in ROAS?", a: "Issues: 1) Last-click overstates direct, 2) Multi-touch understates assisted. Models: 1) Last-click (default), 2) First-click, 3) Linear, 4) Time-decay, 5) Position-based, 6) Data-driven (best). Use platform ROAS for last-click. Use data-driven for true impact. Most teams: data-driven shows 20-30% better ROAS than last-click. Re-evaluate quarterly." },
    { q: "Should I use target ROAS or target CPA bidding?", a: "Target ROAS: for revenue focus, e-commerce, stable margins. Target CPA: for lead focus, B2B, value per lead varies. Choose based on goal. Most e-commerce: target ROAS (revenue per spend). Most B2B: target CPA (cost per lead). Hybrid: max conversions with target CPA, then optimize to target ROAS once stable. Most teams switch after 30+ conversions per week." },
    { q: "How does creative quality affect ROAS?", a: "Creative quality: 50%+ of ROAS variance. 1) 3-5 creative variants per ad set, 2) Test headlines + visuals, 3) Refresh creative every 2-4 weeks (fatigue), 4) UGC (user-generated content) often beats polished, 5) Video vs image, 6) Personalized copy. Most teams 50-100% ROAS improvement with better creative. Refresh top performers, kill losers." },
  ],
  howToUse: [
    'Enter your total ad spend over the period (e.g., 30 days).',
    'Enter the revenue attributed to that ad spend within your attribution window.',
    'Enter your gross margin % (revenue minus COGS divided by revenue, expressed as %).',
    'Pick an attribution window that matches your product consideration time.',
    'Compare the health band to your target ROAS; use the What-If scenarios to model improvements.',
  ],
  engineKey: true,
  // P140f-p3-T3: 完整 6 字段 playbook (per P140f §4.3 + ADR-0002)
  // Goal 含"该不该"+"投放"双关键词 → 通过 T1 zod refine 校验 (决策/decision/该不该/是否)
  // 内容镜像 Phase 1 roas 🧭 Decision Recommendation 4 子段 + ADR-0002 决策逻辑
  playbook: {
    goal: '用户该不该继续加投这个广告渠道，还是先把落地页与人群修一遍',
    input: 'adSpend (≥0) + revenue (≥0) + grossMargin (0-100) + attributionWindow',
    output: 'ROAS ratio + 健康带 🟢≥4.0x / 🟡2.0-4.0x / 🟠1.0-2.0x / 🔴<1.0x + Net ROAS %',
    constraint: 'adSpend = 0 时 ROAS 无意义 (Infinity); 28d attribution 可能低估 B2B 高客单 ROAS',
    tool: '页面的「🧭 算完之后」决策区块（决策支持已由区块独占）',
    memory: 'Meta 7d click / Google Ads 28d click / B2B 90d attribution 行业基准',
  },
};

registerEngine(engine);
