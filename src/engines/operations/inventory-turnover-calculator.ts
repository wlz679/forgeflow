import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
import { BAND_META } from '../../core/engines/band-meta';
// P168 B3-8：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

// =====================================================================
// Inventory Turnover Calculator (P7-1) — Business v3 standard (6+ emoji sections)
// =====================================================================
//
// Inventory turnover = annual COGS / average inventory. Days-to-sell = period / ratio.
// Health bands by turnover ratio:
//   🟢 ≥ 6.0 (general) — healthy cycle, capital not trapped
//   🟡 4.0–6.0         — typical retail; optimize SKU mix
//   🟠 2.0–4.0         — slow movers tying up capital
//   🔴 < 2.0           — critical: SKU rationalization urgent
//
// Industry benchmarks: general 6, apparel 4, electronics 6, grocery 12, furniture 3.
// Applies to physical-product businesses (Shopify, Amazon FBA, DTC) AND service
// businesses that hold inventory (course creators with merch, agencies with hardware).

// ============== Health band constants (per-file, exported for tests) ==============

export const HEALTH_BANDS = {
  excellent: 6.0,
  good: [4.0, 6.0],
  warning: [2.0, 4.0],
  critical: 0,
} as const;

// ============== Math helpers (exported for tests) ==============

/** Inventory turnover ratio = annual COGS / average inventory. */
export function turnoverRatio(annualCOGS: number, avgInventory: number): number {
  if (avgInventory <= 0) return 0;
  return annualCOGS / avgInventory;
}

/** Days to sell one full inventory cycle = period days / turnover ratio. */
export function daysToSell(annualCOGS: number, avgInventory: number, periodDays: number): number {
  const ratio = turnoverRatio(annualCOGS, avgInventory);
  if (ratio <= 0) return 0;
  return periodDays / ratio;
}

/** Industry-specific turnover benchmark lookup. Defaults to 6 (general). */
const BENCHMARKS: Record<string, number> = {
  general: 6,
  apparel: 4,
  electronics: 6,
  grocery: 12,
  furniture: 3,
};
export function industryBenchmark(industry: string): number {
  return BENCHMARKS[industry] ?? 6;
}

/** Health band label from turnover ratio. */
export function calcHealthBand(ratio: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (ratio >= HEALTH_BANDS.excellent) return 'excellent';
  if (ratio >= HEALTH_BANDS.good[0]) return 'good';
  if (ratio >= HEALTH_BANDS.warning[0]) return 'warning';
  return 'critical';
}

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const annualCOGS = clampNonNegative(parseFloat(inputs.annualCOGS) || 0);
  const avgInventory = clampNonNegative(parseFloat(inputs.avgInventory) || 0);
  const periodDays = Math.max(1, parseFloat(inputs.periodDays) || 365);
  const industry = inputs.industry || 'general';

  // Edge: missing or zero inputs → prompt to enter values
  if (annualCOGS === 0 || avgInventory === 0) {
    return [
      '$calc_out.section.inventory_turnover_calculator|⏰ Inventory Turnover Calculator|\n\n' +
        makeToken('calc_out.inventory_turnover.row.enter_inputs_required', '📊 Enter your annual COGS and average inventory value to see how many times your inventory cycles per year, how many days to sell, and how you compare to your industry benchmark.'),
    ];
  }

  const ratio = turnoverRatio(annualCOGS, avgInventory);
  const dts = daysToSell(annualCOGS, avgInventory, periodDays);
  const benchmark = industryBenchmark(industry);

  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

  // Health band
  const band = calcHealthBand(ratio);
  const healthEmoji = BAND_META[band];
  const healthLabel =
    band === 'excellent'
      ? 'Excellent — inventory cycles ≥ 6x/year; capital is working efficiently'
      : band === 'good'
      ? 'Good — typical retail range; room to optimize SKU mix'
      : band === 'warning'
      ? 'Warning — slow turn; capital trapped in slow movers'
      : 'Critical — turn < 2x/year; urgent SKU rationalization needed';

  // What-If: COGS -10% (slower sales), +10% (faster sales)
  const cogsDown = annualCOGS * 0.9;
  const cogsUp = annualCOGS * 1.1;
  const ratioDown = cogsDown / avgInventory;
  const ratioUp = cogsUp / avgInventory;
  const dtsDown = periodDays / ratioDown;
  const dtsUp = periodDays / ratioUp;
  const capitalFreedDown = avgInventory - cogsDown / benchmark;
  const capitalFreedUp = avgInventory - cogsUp / benchmark;

  // Break-Even: target inventory for 🟢 (general benchmark 6x)
  const targetInventory = annualCOGS / benchmark;
  const inventoryDelta = avgInventory - targetInventory;
  const inventoryDeltaPct = (inventoryDelta / avgInventory) * 100;

  // Milestone: 12-mo projection if ratio improves by +1
  const ratioPlus1 = ratio + 1;
  const targetInventoryPlus1 = annualCOGS / ratioPlus1;
  const capitalFreedPlus1 = avgInventory - targetInventoryPlus1;

  // Tip: band-driven contextual advice
  let tip: string;
  if (band === 'critical') {
    tip = makeToken('calc_out.inventory_turnover.row.tip_critical', '💡 Tip: Turnover < 2x/year is a red flag. Audit slow-moving SKUs, run clearance promotions on deadstock, and renegotiate supplier minimum order quantities (MOQs). Consider a SKU rationalization pass to cut the bottom 20%.');
  } else if (band === 'warning') {
    tip = makeToken('calc_out.inventory_turnover.row.tip_warning', '💡 Tip: 2–4x turnover means ~90–180 days of stock on hand. Identify your slowest-moving SKUs (top 20% by days-on-hand) and apply markdown ladders. A 10% COGS reduction through better demand forecasting could push you to the healthy band.');
  } else if (band === 'good') {
    tip = makeToken('calc_out.inventory_turnover.row.tip_good', '💡 Tip: 4–6x is solid retail territory. To reach the excellent band, optimize SKU mix by killing bottom-decile performers, tighten reorder points to reduce safety stock, and negotiate faster supplier lead times.');
  } else {
    tip = makeToken('calc_out.inventory_turnover.row.tip_excellent', '💡 Tip: Excellent turnover — capital is working efficiently. Watch for stockout risk as turnover rises; pair this metric with a stockout cost tracker (P7-3) to ensure fast turn is not buying you lost sales.');
  }

  // ── P168 B3-8：分支相关的整行 ⇒ 每档**单独写出 code 字面量** ──
  const healthLabelRow =
    band === 'excellent'
      ? makeToken('calc_out.inventory_turnover.row.band_excellent', healthLabel)
      : band === 'good'
      ? makeToken('calc_out.inventory_turnover.row.band_good', healthLabel)
      : band === 'warning'
      ? makeToken('calc_out.inventory_turnover.row.band_warning', healthLabel)
      : makeToken('calc_out.inventory_turnover.row.band_critical', healthLabel);
  const statusRow =
    ratio >= benchmark
      ? makeToken('calc_out.inventory_turnover.row.status_above_benchmark', 'above benchmark')
      : makeToken('calc_out.inventory_turnover.row.status_below_benchmark', 'below benchmark');
  const actionRow =
    inventoryDelta > 0
      ? makeToken('calc_out.inventory_turnover.row.action_reduce', 'Action: reduce inventory by ' + money(inventoryDelta) + ' to hit 🟢', { delta: money(inventoryDelta) })
      : makeToken('calc_out.inventory_turnover.row.action_already_below', 'Action: inventory is already below 🟢 target');

  const r =
    '$calc_out.section.inventory_turnover_calculator|⏰ Inventory Turnover Calculator|\n\n' +
    '$calc_out.section.health|🩺 Health:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabelRow + '\n' +
    '• $calc_out.label.turnover_ratio|Turnover ratio|: ' + ratio.toFixed(2) + 'x/year  ·  $calc_out.label.days_to_sell|Days to sell|: ' + dts.toFixed(1) + ' days\n' +
    '• $calc_out.label.industry_benchmark|Industry benchmark|: ' + industry + ' = ' + benchmark + 'x/year  ·  $calc_out.label.your_status|Your status|: ' + statusRow + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• $calc_out.label.annual_cogs|Annual COGS|:        ' + money(annualCOGS) + '\n' +
    '• $calc_out.label.average_inventory|Average inventory|:  ' + money(avgInventory) + '\n' +
    '• $calc_out.label.period_days|Period|:             ' + periodDays + ' days\n' +
    '• ' + '$calc_out.label.industry|Industry|:' + '           ' + makeToken('calc_out.inventory_turnover.row.industry_benchmark_value', industry + ' (benchmark ' + benchmark + 'x)', { industry: industry, benchmark: String(benchmark) }) + '\n' +
    '• $calc_out.label.turnover_ratio|Turnover ratio|:     ' + ratio.toFixed(2) + 'x/year\n' +
    '• $calc_out.label.days_to_sell|Days to sell|:       ' + dts.toFixed(1) + ' days\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.what_if|🔄 What-If:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.inventory_turnover.row.whatif_cogs_minus_10', 'COGS −10% (slower sales): turnover = ' + ratioDown.toFixed(2) + 'x · days to sell = ' + dtsDown.toFixed(1), { ratio: ratioDown.toFixed(2), days: dtsDown.toFixed(1) }) + '\n' +
    '• ' + makeToken('calc_out.inventory_turnover.row.whatif_cogs_plus_10', 'COGS +10% (faster sales): turnover = ' + ratioUp.toFixed(2) + 'x · days to sell = ' + dtsUp.toFixed(1), { ratio: ratioUp.toFixed(2), days: dtsUp.toFixed(1) }) + '\n' +
    '• ' + makeToken('calc_out.inventory_turnover.row.capital_freed_vs_benchmark', 'Capital freed (vs benchmark): ' + (capitalFreedDown >= 0 ? '+' : '') + money(capitalFreedDown) + ' at −10%, ' + (capitalFreedUp >= 0 ? '+' : '') + money(capitalFreedUp) + ' at +10%', { down: (capitalFreedDown >= 0 ? '+' : '') + money(capitalFreedDown), up: (capitalFreedUp >= 0 ? '+' : '') + money(capitalFreedUp) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.break_even|⚖️ Break-Even:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.inventory_turnover.row.target_inventory_green', 'Target inventory for 🟢: ' + money(targetInventory) + '  (at ' + benchmark + 'x benchmark)', { target: money(targetInventory), benchmark: String(benchmark) }) + '\n' +
    '• ' + makeToken('calc_out.inventory_turnover.row.current_vs_target', 'Current vs target: ' + (inventoryDelta >= 0 ? '+' : '') + money(inventoryDelta) + ' (' + (inventoryDeltaPct >= 0 ? '+' : '') + inventoryDeltaPct.toFixed(1) + '%)', { delta: (inventoryDelta >= 0 ? '+' : '') + money(inventoryDelta), pct: (inventoryDeltaPct >= 0 ? '+' : '') + inventoryDeltaPct.toFixed(1) + '%' }) + '\n' +
    '• ' + actionRow + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.milestone|🎯 Milestone:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.inventory_turnover.row.milestone_ratio_plus_1', 'Improve ratio by +1: target inventory = ' + money(targetInventoryPlus1), { target: money(targetInventoryPlus1) }) + '\n' +
    '• ' + makeToken('calc_out.inventory_turnover.row.milestone_capital_freed', 'Capital freed if ratio +1: ' + money(capitalFreedPlus1) + ' (one-time working-capital release)', { amount: money(capitalFreedPlus1) }) + '\n' +
    '• ' + makeToken('calc_out.inventory_turnover.row.milestone_12mo_impact', '12-mo operating impact: every $1 of inventory reduction = ~$0.15–0.25 of annual carrying-cost savings (use P7-2 to size)') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  // P168 B3-8：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 服务端与客户端输出逐字节相同，不可能漂；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let w=function(n){return Number.isNaN(n)?0:Math.max(0,n)},h=function(n,o){return o<=0?0:n/o},F=function(n,o,e){const a=h(n,o);return a<=0?0:e/a},$=function(n){return q[n]??6},S=function(n){return n>=p.excellent?"excellent":n>=p.good[0]?"good":n>=p.warning[0]?"warning":"critical"},C=function(n,o,e){var a=z(n);return Array.isArray(a)?a.join(\`
\`):String(a)};var J=w,L=h,Q=F,Y=$,V=S,X=C,t=tk,P={excellent:"🟢",good:"🟡",warning:"🟠",critical:"🔴"},j='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',t=new Function("return "+j)(),p={excellent:6,good:[4,6],warning:[2,4],critical:0},q={general:6,apparel:4,electronics:6,grocery:12,furniture:3},z=function(n){const o=w(parseFloat(n.annualCOGS)||0),e=w(parseFloat(n.avgInventory)||0),a=Math.max(1,parseFloat(n.periodDays)||365),_=n.industry||"general";if(o===0||e===0)return[\`$calc_out.section.inventory_turnover_calculator|⏰ Inventory Turnover Calculator|

\`+t("calc_out.inventory_turnover.row.enter_inputs_required","📊 Enter your annual COGS and average inventory value to see how many times your inventory cycles per year, how many days to sell, and how you compare to your industry benchmark.")];const s=h(o,e),I=F(o,e,a),c=$(_),r=W=>"$"+Math.round(W).toLocaleString("en-US"),i=S(s),E=P[i],y=i==="excellent"?"Excellent — inventory cycles ≥ 6x/year; capital is working efficiently":i==="good"?"Good — typical retail range; room to optimize SKU mix":i==="warning"?"Warning — slow turn; capital trapped in slow movers":"Critical — turn < 2x/year; urgent SKU rationalization needed",O=o*.9,U=o*1.1,f=O/e,b=U/e,D=a/f,G=a/b,v=e-O/c,d=e-U/c,x=o/c,l=e-x,g=l/e*100,M=s+1,m=o/M,K=e-m;let u;i==="critical"?u=t("calc_out.inventory_turnover.row.tip_critical","💡 Tip: Turnover < 2x/year is a red flag. Audit slow-moving SKUs, run clearance promotions on deadstock, and renegotiate supplier minimum order quantities (MOQs). Consider a SKU rationalization pass to cut the bottom 20%."):i==="warning"?u=t("calc_out.inventory_turnover.row.tip_warning","💡 Tip: 2–4x turnover means ~90–180 days of stock on hand. Identify your slowest-moving SKUs (top 20% by days-on-hand) and apply markdown ladders. A 10% COGS reduction through better demand forecasting could push you to the healthy band."):i==="good"?u=t("calc_out.inventory_turnover.row.tip_good","💡 Tip: 4–6x is solid retail territory. To reach the excellent band, optimize SKU mix by killing bottom-decile performers, tighten reorder points to reduce safety stock, and negotiate faster supplier lead times."):u=t("calc_out.inventory_turnover.row.tip_excellent","💡 Tip: Excellent turnover — capital is working efficiently. Watch for stockout risk as turnover rises; pair this metric with a stockout cost tracker (P7-3) to ensure fast turn is not buying you lost sales.");const A=t(i==="excellent"?"calc_out.inventory_turnover.row.band_excellent":i==="good"?"calc_out.inventory_turnover.row.band_good":i==="warning"?"calc_out.inventory_turnover.row.band_warning":"calc_out.inventory_turnover.row.band_critical",y),N=s>=c?t("calc_out.inventory_turnover.row.status_above_benchmark","above benchmark"):t("calc_out.inventory_turnover.row.status_below_benchmark","below benchmark"),R=l>0?t("calc_out.inventory_turnover.row.action_reduce","Action: reduce inventory by "+r(l)+" to hit 🟢",{delta:r(l)}):t("calc_out.inventory_turnover.row.action_already_below","Action: inventory is already below 🟢 target");return[\`$calc_out.section.inventory_turnover_calculator|⏰ Inventory Turnover Calculator|

$calc_out.section.health|🩺 Health:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+E+" "+A+\`
• $calc_out.label.turnover_ratio|Turnover ratio|: \`+s.toFixed(2)+"x/year  ·  $calc_out.label.days_to_sell|Days to sell|: "+I.toFixed(1)+\` days
• $calc_out.label.industry_benchmark|Industry benchmark|: \`+_+" = "+c+"x/year  ·  $calc_out.label.your_status|Your status|: "+N+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• $calc_out.label.annual_cogs|Annual COGS|:        \`+r(o)+\`
• $calc_out.label.average_inventory|Average inventory|:  \`+r(e)+\`
• $calc_out.label.period_days|Period|:             \`+a+\` days
• $calc_out.label.industry|Industry|:           \`+t("calc_out.inventory_turnover.row.industry_benchmark_value",_+" (benchmark "+c+"x)",{industry:_,benchmark:String(c)})+\`
• $calc_out.label.turnover_ratio|Turnover ratio|:     \`+s.toFixed(2)+\`x/year
• $calc_out.label.days_to_sell|Days to sell|:       \`+I.toFixed(1)+\` days

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.what_if|🔄 What-If:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+t("calc_out.inventory_turnover.row.whatif_cogs_minus_10","COGS −10% (slower sales): turnover = "+f.toFixed(2)+"x · days to sell = "+D.toFixed(1),{ratio:f.toFixed(2),days:D.toFixed(1)})+\`
• \`+t("calc_out.inventory_turnover.row.whatif_cogs_plus_10","COGS +10% (faster sales): turnover = "+b.toFixed(2)+"x · days to sell = "+G.toFixed(1),{ratio:b.toFixed(2),days:G.toFixed(1)})+\`
• \`+t("calc_out.inventory_turnover.row.capital_freed_vs_benchmark","Capital freed (vs benchmark): "+(v>=0?"+":"")+r(v)+" at −10%, "+(d>=0?"+":"")+r(d)+" at +10%",{down:(v>=0?"+":"")+r(v),up:(d>=0?"+":"")+r(d)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.break_even|⚖️ Break-Even:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+t("calc_out.inventory_turnover.row.target_inventory_green","Target inventory for 🟢: "+r(x)+"  (at "+c+"x benchmark)",{target:r(x),benchmark:String(c)})+\`
• \`+t("calc_out.inventory_turnover.row.current_vs_target","Current vs target: "+(l>=0?"+":"")+r(l)+" ("+(g>=0?"+":"")+g.toFixed(1)+"%)",{delta:(l>=0?"+":"")+r(l),pct:(g>=0?"+":"")+g.toFixed(1)+"%"})+\`
• \`+R+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.milestone|🎯 Milestone:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+t("calc_out.inventory_turnover.row.milestone_ratio_plus_1","Improve ratio by +1: target inventory = "+r(m),{target:r(m)})+\`
• \`+t("calc_out.inventory_turnover.row.milestone_capital_freed","Capital freed if ratio +1: "+r(K)+" (one-time working-capital release)",{amount:r(K)})+\`
• \`+t("calc_out.inventory_turnover.row.milestone_12mo_impact","12-mo operating impact: every $1 of inventory reduction = ~$0.15–0.25 of annual carrying-cost savings (use P7-2 to size)")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+u+\`
\`]};return[C(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-inventory-turnover-calculator',
  title: 'Inventory Turnover Calculator',
  description:
    'Measure how many times per year your inventory cycles (COGS / avg inventory) and how many days to sell. The fundamental inventory health metric for Shopify, Amazon FBA, and DTC brands. Industry benchmarks: 🟢 ≥6x · 🟡 4–6x · 🟠 2–4x · 🔴 <2x.',
  categoryId: 'O',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'annualCOGS', label: 'Annual Cost of Goods Sold (COGS)', placeholder: 'e.g. 240000', type: 'number' },
    { name: 'avgInventory', label: 'Average Inventory Value', placeholder: 'e.g. 40000', type: 'number' },
    { name: 'periodDays', label: 'Period (days)', placeholder: 'e.g. 365', type: 'number' },
    {
      name: 'industry',
      label: 'Industry benchmark',
      placeholder: '',
      type: 'select',
      options: ['general', 'apparel', 'electronics', 'grocery', 'furniture'],
    },
  ],
  keywords: [
    'inventory turnover calculator',
    'days to sell',
    'COGS ratio',
    'inventory health',
    'stock turn',
    'inventory cycle',
    'Shopify inventory',
    'Amazon FBA metrics',
    'DTC inventory',
    'working capital',
  ],
  tags: ['operations', 'inventory', 'turnover', 'cogs'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-06',
  sources: [
    'https://www.investopedia.com/terms/i/inventory-turnover.asp',
    'https://www.shopify.com/blog/inventory-turnover-ratio',
    'https://corporatefinanceinstitute.com/resources/accounting/inventory-turnover/',
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  calculate,
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
  generate: calculate,
  staticExamples: ['$calc_out.section.inventory_turnover_calculator|⏰ Inventory Turnover Calculator|\n\n$calc_out.section.health|🩺 Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 $calc_out.inventory_turnover.row.band_excellent|Excellent — inventory cycles ≥ 6x/year; capital is working efficiently|\n• $calc_out.label.turnover_ratio|Turnover ratio|: 6.00x/year  ·  $calc_out.label.days_to_sell|Days to sell|: 60.8 days\n• $calc_out.label.industry_benchmark|Industry benchmark|: general = 6x/year  ·  $calc_out.label.your_status|Your status|: $calc_out.inventory_turnover.row.status_above_benchmark|above benchmark|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.annual_cogs|Annual COGS|:        $240,000\n• $calc_out.label.average_inventory|Average inventory|:  $40,000\n• $calc_out.label.period_days|Period|:             365 days\n• $calc_out.label.industry|Industry|:           $calc_out.inventory_turnover.row.industry_benchmark_value{"industry":"general","benchmark":"6"}|general (benchmark 6x)|\n• $calc_out.label.turnover_ratio|Turnover ratio|:     6.00x/year\n• $calc_out.label.days_to_sell|Days to sell|:       60.8 days\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if|🔄 What-If:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.inventory_turnover.row.whatif_cogs_minus_10{"ratio":"5.40","days":"67.6"}|COGS −10% (slower sales): turnover = 5.40x · days to sell = 67.6|\n• $calc_out.inventory_turnover.row.whatif_cogs_plus_10{"ratio":"6.60","days":"55.3"}|COGS +10% (faster sales): turnover = 6.60x · days to sell = 55.3|\n• $calc_out.inventory_turnover.row.capital_freed_vs_benchmark{"down":"+$4,000","up":"$-4,000"}|Capital freed (vs benchmark): +$4,000 at −10%, $-4,000 at +10%|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.break_even|⚖️ Break-Even:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.inventory_turnover.row.target_inventory_green{"target":"$40,000","benchmark":"6"}|Target inventory for 🟢: $40,000  (at 6x benchmark)|\n• $calc_out.inventory_turnover.row.current_vs_target{"delta":"+$0","pct":"+0.0%"}|Current vs target: +$0 (+0.0%)|\n• $calc_out.inventory_turnover.row.action_already_below|Action: inventory is already below 🟢 target|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.milestone|🎯 Milestone:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.inventory_turnover.row.milestone_ratio_plus_1{"target":"$34,286"}|Improve ratio by +1: target inventory = $34,286|\n• $calc_out.inventory_turnover.row.milestone_capital_freed{"amount":"$5,714"}|Capital freed if ratio +1: $5,714 (one-time working-capital release)|\n• $calc_out.inventory_turnover.row.milestone_12mo_impact|12-mo operating impact: every $1 of inventory reduction = ~$0.15–0.25 of annual carrying-cost savings (use P7-2 to size)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.inventory_turnover.row.tip_excellent|💡 Tip: Excellent turnover — capital is working efficiently. Watch for stockout risk as turnover rises; pair this metric with a stockout cost tracker (P7-3) to ensure fast turn is not buying you lost sales.|\n'],
  faq: [
    { q: 'What is a good inventory turnover ratio?', a: 'For general retail, 6x/year is the healthy baseline. Apparel is typically 4x (seasonal), grocery 12x (perishable, fast-moving), and furniture 3x (high-ticket, slow). Anything below 4x signals capital trapped in slow movers; below 2x is critical and demands SKU rationalization.' },
    { q: 'How do I calculate days to sell inventory?', a: 'Days to sell = period days / turnover ratio. With 240k COGS, 40k avg inventory, and 365-day period: 365 / (240k/40k) = 60.8 days. Industry-specific benchmarks vary — grocery may target 30 days, furniture 120 days.' },
    { q: 'Should I optimize for higher turnover?', a: 'Higher turnover is generally better (capital not trapped), but watch for stockout risk as turnover rises. Pair this metric with a stockout cost tracker and reorder point calculator to ensure fast turn is not buying you lost sales.' },
    { q: 'How does this differ for service businesses with inventory?', a: 'Agencies holding hardware SKU, course creators with merch, or SaaS with physical goods use the same math. The "general" benchmark (6x) applies; service-only businesses with no inventory should skip this calculator.' },

    { q: "How do I improve inventory turnover?", a: "1) Better demand forecasting, 2) Reduce safety stock, 3) Markdown slow-movers, 4) Negotiate smaller MOQs with suppliers, 5) Drop ship long-tail, 6) Improve product mix (data-driven), 7) Bundle slow items. Most teams 20-50% improvement in 12 months. Aim for industry average + 50%. Track by category, not just overall." },
    { q: "What is the relationship between turnover and profitability?", a: "Higher turnover generally = more profitable (less capital tied up, less obsolescence, fresher inventory). But: too high = stockouts, lost sales. Sweet spot: industry-specific. For 6x turnover: 60 days of inventory. For 12x: 30 days. Higher turnover with same revenue: lower working capital, higher ROI. Most companies: 5-15% margin improvement from better turnover." },
    { q: "What is the difference between turnover and days on hand?", a: "Turnover: times per year inventory cycles. Days on hand (DOH): average days of inventory. DOH = 365 / turnover. 6x turnover = 60 DOH. 12x = 30 DOH. Both measure efficiency. Turnover: higher better. DOH: lower better. Use whichever is more intuitive for your team. Same insight, different angle. Most teams: <60 DOH is good for ecommerce." },
    { q: "How does seasonality affect turnover ratio?", a: "Seasonal businesses: turnover varies widely by quarter. Use: 1) Annual average (smooths), 2) Same-quarter comparison (year over year), 3) Inventory value + sales by season. Apparel: holiday season 80% of sales, 20% of inventory for rest of year. Calculate turnover by season for accuracy. Most seasonal: 4-8x annual, but 10-20x in peak season." },
    { q: "How do I handle slow-moving inventory?", a: "Tactics: 1) Markdown (20-50% off): sell at lower margin, 2) Bundle: pair with fast-mover, 3) Donation: tax deduction + clear shelf, 4) Liquidation: bulk to liquidator (10-30% of cost), 5) Return to vendor: negotiate, 6) Disposal: last resort. Cut losses: slow inventory = carrying cost + obsolescence. Most: 10-30% of inventory is slow at any time." },
    { q: "What is the right inventory for a new product?", a: "New product: 1) Start with 2-3 months of forecasted demand, 2) Test small, scale if traction, 3) Avoid: 6+ months of inventory upfront. Most: 30-50% of capital on top 20% of SKUs. New product launch: 2-3x expected demand, evaluate at 4-6 weeks. Markdown or reorder based on velocity. Risk-balanced: small initial order, fast reorder if successful." },
    { q: "How do I calculate turnover for multi-product businesses?", a: "Methods: 1) Total: COGS / average inventory (across all products), 2) By category: per category, 3) By SKU: per product, 4) Pareto: top 20% of SKUs = 80% of revenue. Best option: per category. Top 20 SKUs: track closely. Long tail: 80% of SKUs = 20% of revenue. Use identify problem SKUs, optimize portfolio. Most teams monthly review of low-velocity items." },
    { q: 'How does inventory turnover affect my cash conversion cycle?', a: 'Cash conversion cycle = days inventory outstanding (DIO) + days sales outstanding (DSO) - days payable outstanding (DPO). DIO = 365 / turnover: at 6x turnover, DIO is ~61 days; at 12x, it drops to 30. For a business with $500K annual revenue, a 10-day DIO improvement frees roughly $14K of working capital (the daily revenue × days saved). Faster turnover shortens the cycle, reduces external financing needs, and lifts ROIC. Pair this metric with DPO negotiation — extending supplier payment terms by 15 days can offset a 1x reduction in turnover without harming sell-through.' },
  ],
  howToUse: [
    'Enter your annual Cost of Goods Sold (COGS) — total cost to produce or buy what you sold in the year.',
    'Enter your average inventory value (often calculated as (beginning inventory + ending inventory) / 2).',
    'Adjust the period (default 365 days for annual; use 90 for quarterly tracking).',
    'Pick your industry benchmark for context-aware health bands.',
    'Read the turnover ratio and days-to-sell, then use What-If to model +10% sales or -10% slower sales.',
  ],
  engineKey: true,
};
registerEngine(engine);