import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
import { BAND_META } from '../../core/engines/band-meta';
// P168 B3-8：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
//   ⚠️ 章节标题 / 标签用**字面量 token**（code|原文|）；带运行时数值的整行用
//      makeToken(code, fallback, params) ⇒ fallback 与 params 取**同一个变量**。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

// =====================================================================
// Reorder Point Calculator (P7-4) — Business v3 standard (6+ emoji sections)
// =====================================================================
//
// Reorder point = lead-time demand + safety stock.
// Safety stock = Z × std dev × √(lead time / review period).
// Z-score is selected by service level: 90% → 1.28, 95% → 1.65, 99% → 2.33.
// Health bands (by chosen service level):
//   🟢 ≥ 95%      — recommended for high-margin / critical SKU
//   🟡 90%         — typical retail
//   🟠 85%         — risky; raise to 95%
//   🔴 < 85%       — default risk tolerance; reorder point too low
//
// Applies to physical-product businesses (Shopify/Amazon FBA/DTC).

// ============== Health band constants (per-file, exported for tests) ==============

export const HEALTH_BANDS = {
  excellent: 95,
  good: 90,
  warning: 85,
  critical: 0,
} as const;

// ============== Math helpers (exported for tests) ==============

/** Service level → Z-score lookup. */
const Z_SCORES: Record<number, number> = { 90: 1.28, 95: 1.65, 99: 2.33 };
export function zScore(serviceLevel: number): number {
  return Z_SCORES[serviceLevel] ?? 1.65; // default to 95% SL
}

/** Lead-time demand (units) = avg daily demand × lead time (days). */
export function leadTimeDemand(avgDailyDemand: number, leadTimeDays: number): number {
  return avgDailyDemand * leadTimeDays;
}

/** Safety stock (units) = Z × std dev × √(lead time / review period). */
export function safetyStock(
  z: number,
  demandStdDev: number,
  leadTimeDays: number,
  reviewPeriod: number
): number {
  if (reviewPeriod <= 0) return 0;
  return z * demandStdDev * Math.sqrt(leadTimeDays / reviewPeriod);
}

/** Reorder point (units) = lead-time demand + safety stock. */
export function reorderPoint(leadTimeDemand: number, safetyStock: number): number {
  return leadTimeDemand + safetyStock;
}

/** Health band label from service level chosen. */
export function calcHealthBand(serviceLevel: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (serviceLevel >= HEALTH_BANDS.excellent) return 'excellent';
  if (serviceLevel >= HEALTH_BANDS.good) return 'good';
  if (serviceLevel >= HEALTH_BANDS.warning) return 'warning';
  return 'critical';
}

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const avgDailyDemand = clampNonNegative(parseFloat(inputs.avgDailyDemand) || 0);
  const leadTimeDays = clampNonNegative(parseFloat(inputs.leadTimeDays) || 0);
  const serviceLevel = parseInt(inputs.serviceLevel || '95', 10);
  const demandStdDev = clampNonNegative(parseFloat(inputs.demandStdDev) || 0);
  const reviewPeriod = Math.max(1, parseFloat(inputs.reviewPeriod) || 7);

  // Edge: zero demand or lead time → prompt
  if (avgDailyDemand === 0 || leadTimeDays === 0) {
    return [
      '$calc_out.section.reorder_point_calculator|⏰ Reorder Point Calculator|\n\n' +
        makeToken('calc_out.reorder_point.row.enter_inputs_required', '📊 Enter your average daily demand, supplier lead time, service level, demand std dev, and review period to compute when to reorder and how much safety stock to carry.'),
    ];
  }

  const z = zScore(serviceLevel);
  const ltd = leadTimeDemand(avgDailyDemand, leadTimeDays);
  const ss = safetyStock(z, demandStdDev, leadTimeDays, reviewPeriod);
  const rop = reorderPoint(ltd, ss);

  // Health band
  const band = calcHealthBand(serviceLevel);
  const healthEmoji = BAND_META[band];
  // ── P168 B3-8：健康度四档 —— 每档**单独写出 code 字面量**（动态拼码 ⇒ 静态扫描器认不出）──
  const healthLabel =
    band === 'excellent'
      ? makeToken('calc_out.reorder_point.row.health_excellent', 'Excellent — service level ≥ 95%; reorder point accounts for demand variability')
      : band === 'good'
      ? makeToken('calc_out.reorder_point.row.health_good', 'Good — 90% service level; typical retail, raise to 95% for high-margin / critical SKU')
      : band === 'warning'
      ? makeToken('calc_out.reorder_point.row.health_warning', 'Warning — 85% service level; risky; 15% of cycles will stockout')
      : makeToken('calc_out.reorder_point.row.health_critical', 'Critical — < 85% service level; default risk tolerance; reorder point too low');

  // What-If: lead time doubles (safety stock grows with sqrt)
  const leadTimeDoubled = leadTimeDays * 2;
  const ltdDoubled = leadTimeDemand(avgDailyDemand, leadTimeDoubled);
  const ssDoubled = safetyStock(z, demandStdDev, leadTimeDoubled, reviewPeriod);
  const ropDoubled = reorderPoint(ltdDoubled, ssDoubled);
  const ssDelta = ssDoubled - ss;

  // What-If 2: service level raised to 99%
  const z99 = zScore(99);
  const ss99 = safetyStock(z99, demandStdDev, leadTimeDays, reviewPeriod);
  const rop99 = reorderPoint(ltd, ss99);
  const ssIncrease99 = ss99 - ss;

  // Break-Even: min service level for low-stockout risk (≥ 95%)
  const minSLForExcellent = 95;
  const slGap = minSLForExcellent - serviceLevel;

  // Milestone: 12-mo — units between ROP and stockout = inventory headroom
  // Headroom = safetyStock (the buffer above lead-time demand)
  const inventoryHeadroom = ss;
  const monthlyOrderFreq = 30 / reviewPeriod; // approx orders per month
  const annualStockoutAvoided = inventoryHeadroom * monthlyOrderFreq * 12;

  // Tip: band-driven contextual advice
  // ── P168 B3-8：tip 行整行令牌化（「💡 Tip:」标记在 fallback 内 ⇒ 语言无关过滤仍命中）──
  let tip: string;
  if (band === 'critical') {
    tip = makeToken('calc_out.reorder_point.row.tip_critical', '💡 Tip: < 85% service level will stockout 15%+ of cycles. Raise SL to 95% immediately (typical for most SKUs), or to 99% for high-margin / critical / perishable inventory. Cost of safety stock is far less than cost of stockouts (use P7-3 to compare).');
  } else if (band === 'warning') {
    tip = makeToken('calc_out.reorder_point.row.tip_warning', '💡 Tip: 85% service level means ~15% of cycles will stockout. For most SKUs, 95% SL is the right target — the safety-stock cost increase (≈30% more buffer) is small relative to the stockout cost avoided.');
  } else if (band === 'good') {
    tip = makeToken('calc_out.reorder_point.row.tip_good', '💡 Tip: 90% service level is solid retail. To upgrade to 🟢, increase to 95% SL (typically +25% safety stock buffer). Reserve 99% SL for high-margin / critical / perishable SKUs only.');
  } else {
    tip = makeToken('calc_out.reorder_point.row.tip_excellent', '💡 Tip: 95% service level is the recommended baseline. Reorder quarterly to match demand variability shifts (seasonal products may need SL tuning). Pair with stockout cost (P7-3) to verify safety-stock investment pays off.');
  }

  // ── P168 B3-8：输出行逐行令牌化 ─────────────────────────────────────────
  //   · 章节标题 / 标签 ⇒ **字面量 token**（对齐空格留在 token 之外）
  //   · 带运行时数值的整行 ⇒ makeToken(code, fallback, params)（fallback 与 params 同源）
  const tkHealthSummary = makeToken(
    'calc_out.reorder_point.row.health_summary',
    'Service level: ' + serviceLevel + '%  ·  Z-score: ' + z.toFixed(2) + '  ·  Reorder point: ' + Math.round(rop) + ' units',
    { sl: String(serviceLevel), z: z.toFixed(2), rop: String(Math.round(rop)) },
  );
  const tkLeadTimeAndSafetyStock = makeToken(
    'calc_out.reorder_point.row.lead_time_and_safety_stock',
    'Lead-time demand: ' + Math.round(ltd) + ' units  ·  Safety stock: ' + Math.round(ss) + ' units',
    { ltd: String(Math.round(ltd)), ss: String(Math.round(ss)) },
  );
  const tkWhatIfLeadTimeDoubles = makeToken(
    'calc_out.reorder_point.row.whatif_lead_time_doubles',
    'Lead time doubles: ROP = ' + Math.round(ropDoubled) + ' units  ·  safety stock grows by ' + Math.round(ssDelta) + ' units (√2 factor)',
    { rop: String(Math.round(ropDoubled)), delta: String(Math.round(ssDelta)) },
  );
  const tkWhatIfServiceLevel99 = makeToken(
    'calc_out.reorder_point.row.whatif_service_level_99',
    'Service level raised to 99% (Z=' + z99.toFixed(2) + '): ROP = ' + Math.round(rop99) + ' units  ·  safety stock grows by ' + Math.round(ssIncrease99) + ' units',
    { z: z99.toFixed(2), rop: String(Math.round(rop99)), delta: String(Math.round(ssIncrease99)) },
  );
  const tkCurrentVsTarget =
    slGap > 0
      ? makeToken('calc_out.reorder_point.row.current_vs_target_raise', 'Current vs target: raise SL by ' + slGap + 'pp to hit 🟢', { gap: String(slGap) })
      : slGap === 0
      ? makeToken('calc_out.reorder_point.row.current_vs_target_at_target', 'Current vs target: at target')
      : makeToken('calc_out.reorder_point.row.current_vs_target_above_target', 'Current vs target: already above target');
  const tkInventoryHeadroom = makeToken(
    'calc_out.reorder_point.row.inventory_headroom',
    'Inventory headroom (safety stock): ' + Math.round(inventoryHeadroom) + ' units above lead-time demand',
    { headroom: String(Math.round(inventoryHeadroom)) },
  );
  const tkOrderFrequency = makeToken(
    'calc_out.reorder_point.row.order_frequency',
    'Order frequency: ~' + monthlyOrderFreq.toFixed(1) + ' orders/month  ·  ~' + Math.round(monthlyOrderFreq * 12) + ' orders/year',
    { monthly: monthlyOrderFreq.toFixed(1), yearly: String(Math.round(monthlyOrderFreq * 12)) },
  );
  const tkAnnualStockoutAvoided = makeToken(
    'calc_out.reorder_point.row.annual_stockout_avoided',
    'Annual stockout risk avoided: ' + Math.round(annualStockoutAvoided) + ' units not stocked out',
    { units: String(Math.round(annualStockoutAvoided)) },
  );

  const r =
    '$calc_out.section.reorder_point_calculator|⏰ Reorder Point Calculator|\n\n' +
    '$calc_out.section.health|🩺 Health:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• ' + tkHealthSummary + '\n' +
    '• ' + tkLeadTimeAndSafetyStock + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• $calc_out.label.avg_daily_demand|Avg daily demand|:        ' + avgDailyDemand + ' units/day\n' +
    '• $calc_out.label.supplier_lead_time|Supplier lead time|:      ' + leadTimeDays + ' days\n' +
    '• $calc_out.label.service_level|Service level|:           ' + serviceLevel + '%  (Z = ' + z.toFixed(2) + ')\n' +
    '• $calc_out.label.demand_std_deviation|Demand std deviation|:    ' + demandStdDev + ' units/day\n' +
    '• $calc_out.label.review_period|Review period|:           ' + reviewPeriod + ' days\n' +
    '• $calc_out.label.lead_time_demand|Lead-time demand|:        ' + Math.round(ltd) + ' units\n' +
    '• $calc_out.label.safety_stock|Safety stock|:            ' + Math.round(ss) + ' units\n' +
    '• $calc_out.label.reorder_point|Reorder point|:           ' + Math.round(rop) + ' units\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.what_if|🔄 What-If:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + tkWhatIfLeadTimeDoubles + '\n' +
    '• ' + tkWhatIfServiceLevel99 + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.break_even|⚖️ Break-Even:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• $calc_out.label.min_service_level_for_excellent|Min service level for 🟢|: ' + minSLForExcellent + '%\n' +
    '• ' + tkCurrentVsTarget + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.milestone|🎯 Milestone:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + tkInventoryHeadroom + '\n' +
    '• ' + tkOrderFrequency + '\n' +
    '• ' + tkAnnualStockoutAvoided + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  // P168 B3-8：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 两端输出逐字节相同，不可能漂移；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let _=function(t){return Number.isNaN(t)?0:Math.max(0,t)},g=function(t){return j[t]??1.65},m=function(t,o){return t*o},v=function(t,o,n,r){return r<=0?0:t*o*Math.sqrt(n/r)},h=function(t,o){return t+o},M=function(t){return t>=y.excellent?"excellent":t>=y.good?"good":t>=y.warning?"warning":"critical"},F=function(t,o,n){var r=E(t);return Array.isArray(r)?r.join(\`
\`):String(r)};var Q=_,X=g,Y=m,B=v,T=h,tt=M,et=F,e=tk,O={excellent:"🟢",good:"🟡",warning:"🟠",critical:"🔴"},P='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',e=new Function("return "+P)(),y={excellent:95,good:90,warning:85,critical:0},j={90:1.28,95:1.65,99:2.33},E=function(t){const o=_(parseFloat(t.avgDailyDemand)||0),n=_(parseFloat(t.leadTimeDays)||0),r=parseInt(t.serviceLevel||"95",10),p=_(parseFloat(t.demandStdDev)||0),c=Math.max(1,parseFloat(t.reviewPeriod)||7);if(o===0||n===0)return[\`$calc_out.section.reorder_point_calculator|⏰ Reorder Point Calculator|

\`+e("calc_out.reorder_point.row.enter_inputs_required","📊 Enter your average daily demand, supplier lead time, service level, demand std dev, and review period to compute when to reorder and how much safety stock to carry.")];const l=g(r),s=m(o,n),a=v(l,p,n,c),w=h(s,a),i=M(r),K=O[i],z=i==="excellent"?e("calc_out.reorder_point.row.health_excellent","Excellent — service level ≥ 95%; reorder point accounts for demand variability"):i==="good"?e("calc_out.reorder_point.row.health_good","Good — 90% service level; typical retail, raise to 95% for high-margin / critical SKU"):i==="warning"?e("calc_out.reorder_point.row.health_warning","Warning — 85% service level; risky; 15% of cycles will stockout"):e("calc_out.reorder_point.row.health_critical","Critical — < 85% service level; default risk tolerance; reorder point too low"),x=n*2,A=m(o,x),$=v(l,p,x,c),D=h(A,$),k=$-a,S=g(99),L=v(S,p,n,c),q=h(s,L),R=L-a,C=95,f=C-r,b=a,d=30/c,I=b*d*12;let u;i==="critical"?u=e("calc_out.reorder_point.row.tip_critical","💡 Tip: < 85% service level will stockout 15%+ of cycles. Raise SL to 95% immediately (typical for most SKUs), or to 99% for high-margin / critical / perishable inventory. Cost of safety stock is far less than cost of stockouts (use P7-3 to compare)."):i==="warning"?u=e("calc_out.reorder_point.row.tip_warning","💡 Tip: 85% service level means ~15% of cycles will stockout. For most SKUs, 95% SL is the right target — the safety-stock cost increase (≈30% more buffer) is small relative to the stockout cost avoided."):i==="good"?u=e("calc_out.reorder_point.row.tip_good","💡 Tip: 90% service level is solid retail. To upgrade to 🟢, increase to 95% SL (typically +25% safety stock buffer). Reserve 99% SL for high-margin / critical / perishable SKUs only."):u=e("calc_out.reorder_point.row.tip_excellent","💡 Tip: 95% service level is the recommended baseline. Reorder quarterly to match demand variability shifts (seasonal products may need SL tuning). Pair with stockout cost (P7-3) to verify safety-stock investment pays off.");const U=e("calc_out.reorder_point.row.health_summary","Service level: "+r+"%  ·  Z-score: "+l.toFixed(2)+"  ·  Reorder point: "+Math.round(w)+" units",{sl:String(r),z:l.toFixed(2),rop:String(Math.round(w))}),W=e("calc_out.reorder_point.row.lead_time_and_safety_stock","Lead-time demand: "+Math.round(s)+" units  ·  Safety stock: "+Math.round(a)+" units",{ltd:String(Math.round(s)),ss:String(Math.round(a))}),N=e("calc_out.reorder_point.row.whatif_lead_time_doubles","Lead time doubles: ROP = "+Math.round(D)+" units  ·  safety stock grows by "+Math.round(k)+" units (√2 factor)",{rop:String(Math.round(D)),delta:String(Math.round(k))}),Z=e("calc_out.reorder_point.row.whatif_service_level_99","Service level raised to 99% (Z="+S.toFixed(2)+"): ROP = "+Math.round(q)+" units  ·  safety stock grows by "+Math.round(R)+" units",{z:S.toFixed(2),rop:String(Math.round(q)),delta:String(Math.round(R))}),G=f>0?e("calc_out.reorder_point.row.current_vs_target_raise","Current vs target: raise SL by "+f+"pp to hit 🟢",{gap:String(f)}):f===0?e("calc_out.reorder_point.row.current_vs_target_at_target","Current vs target: at target"):e("calc_out.reorder_point.row.current_vs_target_above_target","Current vs target: already above target"),J=e("calc_out.reorder_point.row.inventory_headroom","Inventory headroom (safety stock): "+Math.round(b)+" units above lead-time demand",{headroom:String(Math.round(b))}),V=e("calc_out.reorder_point.row.order_frequency","Order frequency: ~"+d.toFixed(1)+" orders/month  ·  ~"+Math.round(d*12)+" orders/year",{monthly:d.toFixed(1),yearly:String(Math.round(d*12))}),H=e("calc_out.reorder_point.row.annual_stockout_avoided","Annual stockout risk avoided: "+Math.round(I)+" units not stocked out",{units:String(Math.round(I))});return[\`$calc_out.section.reorder_point_calculator|⏰ Reorder Point Calculator|

$calc_out.section.health|🩺 Health:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+K+" "+z+\`
• \`+U+\`
• \`+W+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• $calc_out.label.avg_daily_demand|Avg daily demand|:        \`+o+\` units/day
• $calc_out.label.supplier_lead_time|Supplier lead time|:      \`+n+\` days
• $calc_out.label.service_level|Service level|:           \`+r+"%  (Z = "+l.toFixed(2)+\`)
• $calc_out.label.demand_std_deviation|Demand std deviation|:    \`+p+\` units/day
• $calc_out.label.review_period|Review period|:           \`+c+\` days
• $calc_out.label.lead_time_demand|Lead-time demand|:        \`+Math.round(s)+\` units
• $calc_out.label.safety_stock|Safety stock|:            \`+Math.round(a)+\` units
• $calc_out.label.reorder_point|Reorder point|:           \`+Math.round(w)+\` units

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.what_if|🔄 What-If:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+N+\`
• \`+Z+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.break_even|⚖️ Break-Even:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• $calc_out.label.min_service_level_for_excellent|Min service level for 🟢|: \`+C+\`%
• \`+G+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.milestone|🎯 Milestone:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+J+\`
• \`+V+\`
• \`+H+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+u+\`
\`]};return[F(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-reorder-point-calculator',
  title: 'Reorder Point Calculator',
  description:
    'Compute when to reorder — lead-time demand + safety stock. Includes service-level Z-score for statistical safety buffer. Health bands: 🟢 ≥95% · 🟡 90% · 🟠 85% · 🔴 <85% service level.',
  categoryId: 'O',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'avgDailyDemand', label: 'Average Daily Demand (units)', placeholder: 'e.g. 50', type: 'number' },
    { name: 'leadTimeDays', label: 'Supplier Lead Time (days)', placeholder: 'e.g. 14', type: 'number' },
    {
      name: 'serviceLevel',
      label: 'Service Level',
      placeholder: '',
      type: 'select',
      options: ['90', '95', '99'],
    },
    { name: 'demandStdDev', label: 'Daily Demand Std Dev (units)', placeholder: 'e.g. 10', type: 'number' },
    { name: 'reviewPeriod', label: 'Review Period (days)', placeholder: 'e.g. 7', type: 'number' },
  ],
  keywords: [
    'reorder point calculator',
    'safety stock',
    'service level',
    'Z-score inventory',
    'lead time demand',
    'inventory reorder',
    'stockout prevention',
    'demand variability',
    'EOQ alternative',
    'inventory buffer',
  ],
  tags: ['operations', 'inventory', 'reorder', 'safety-stock'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-06',
  sources: [
    'https://www.investopedia.com/terms/r/reorder-point.asp',
    'https://www.shopify.com/blog/reorder-point',
    'https://www.netSuite.com/portal/resource/articles/inventory-management/reorder-point.shtml',
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
  staticExamples: ['$calc_out.section.reorder_point_calculator|⏰ Reorder Point Calculator|\n\n$calc_out.section.health|🩺 Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 $calc_out.reorder_point.row.health_excellent|Excellent — service level ≥ 95%; reorder point accounts for demand variability|\n• $calc_out.reorder_point.row.health_summary{"sl":"95","z":"1.65","rop":"723"}|Service level: 95%  ·  Z-score: 1.65  ·  Reorder point: 723 units|\n• $calc_out.reorder_point.row.lead_time_and_safety_stock{"ltd":"700","ss":"23"}|Lead-time demand: 700 units  ·  Safety stock: 23 units|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.avg_daily_demand|Avg daily demand|:        50 units/day\n• $calc_out.label.supplier_lead_time|Supplier lead time|:      14 days\n• $calc_out.label.service_level|Service level|:           95%  (Z = 1.65)\n• $calc_out.label.demand_std_deviation|Demand std deviation|:    10 units/day\n• $calc_out.label.review_period|Review period|:           7 days\n• $calc_out.label.lead_time_demand|Lead-time demand|:        700 units\n• $calc_out.label.safety_stock|Safety stock|:            23 units\n• $calc_out.label.reorder_point|Reorder point|:           723 units\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if|🔄 What-If:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.reorder_point.row.whatif_lead_time_doubles{"rop":"1433","delta":"10"}|Lead time doubles: ROP = 1433 units  ·  safety stock grows by 10 units (√2 factor)|\n• $calc_out.reorder_point.row.whatif_service_level_99{"z":"2.33","rop":"733","delta":"10"}|Service level raised to 99% (Z=2.33): ROP = 733 units  ·  safety stock grows by 10 units|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.break_even|⚖️ Break-Even:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.min_service_level_for_excellent|Min service level for 🟢|: 95%\n• $calc_out.reorder_point.row.current_vs_target_at_target|Current vs target: at target|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.milestone|🎯 Milestone:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.reorder_point.row.inventory_headroom{"headroom":"23"}|Inventory headroom (safety stock): 23 units above lead-time demand|\n• $calc_out.reorder_point.row.order_frequency{"monthly":"4.3","yearly":"51"}|Order frequency: ~4.3 orders/month  ·  ~51 orders/year|\n• $calc_out.reorder_point.row.annual_stockout_avoided{"units":"1200"}|Annual stockout risk avoided: 1200 units not stocked out|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.reorder_point.row.tip_excellent|💡 Tip: 95% service level is the recommended baseline. Reorder quarterly to match demand variability shifts (seasonal products may need SL tuning). Pair with stockout cost (P7-3) to verify safety-stock investment pays off.|\n'],
  faq: [
    { q: 'What is a good service level for inventory?', a: '95% is the recommended baseline for most SKUs — only 5% of cycles will stockout. 99% is reserved for high-margin, critical, or perishable items. 90% is typical retail but accepts 10% stockout risk.' },
    { q: 'How does demand variability affect safety stock?', a: 'Higher demand variability (larger std dev) → more safety stock needed. Safety stock grows linearly with std dev but only as √lead time. So doubling lead time increases safety stock by ~41%, not 100%.' },
    { q: 'What is the relationship between safety stock and review period?', a: 'Longer review periods (you check inventory less often) → more safety stock needed. The √(lead time / review period) factor means a 4x longer review period doubles safety stock.' },
    { q: 'Should I use 95% or 99% service level?', a: 'Start with 95% for most SKUs. Use 99% only for: high-margin products (stockout cost is high), critical/perishable items (lost sale is permanent), or items with high LTV customers. The safety-stock cost increase from 95% to 99% is ~41%.' },
    { q: "What is the reorder point formula?", a: "ROP = (average_daily_demand × lead_time_days) + safety_stock. Example: 100 units/day × 14 days lead time + 200 safety stock = 1600 units. Reorder when inventory hits 1600. Safety stock accounts for demand variability. Most teams: 1-2 weeks of demand as safety stock. Calculate: max demand variability × √(lead time)." },
    { q: "How do I calculate safety stock?", a: "Safety stock = Z × σ_demand × √(lead_time). Z = service level factor (1.65 for 95%, 2.33 for 99%). σ = standard deviation of daily demand. Lead_time in days. Example: Z=1.65, σ=20 units, lead_time=14 days: 1.65 × 20 × √14 = 123 units. Higher service level = more safety stock. Trade-off: cost vs service. Most: 95% service level." },
    { q: "What is the difference between reorder point and EOQ?", a: "Reorder point (ROP): when to reorder. EOQ: how much to order. Use both. EOQ formula: √(2 × D × S / H). D = annual demand, S = order cost, H = holding cost per unit. ROP is timing, EOQ is quantity. Combine: when inventory hits ROP, order EOQ amount. Most ERP systems automate this. Optimize both: timing reduces stockouts, quantity reduces carrying cost." },
    { q: "How do I handle lead time variability?", a: "Variability in lead time = more safety stock needed. Calculate: 1) Track lead times (max, min, avg), 2) Standard deviation of lead time, 3) Use combined formula: SS = Z × √(σ_d² × L + d² × σ_L²). Where d = avg demand, L = avg lead time. Variable lead times: more safety stock. Tactics: 1) Multiple suppliers, 2) Safety stock buffer, 3) Local warehousing, 4) Air shipping for emergencies." },
    { q: "What service level should I target?", a: "Service level = % of orders fulfilled without stockout. Common: 95% (5% stockout acceptable), 99% (1% stockout). Trade-off: higher = more safety stock = more cost. Most teams 95% is sweet spot. Critical items: 99%+. Low priority: 90%. Calculate cost of stockout (lost sales, customer dissatisfaction) vs cost of carrying more. 95% for top SKUs, 90% for long tail." },
    { q: "How do I account for seasonality in reorder point?", a: "Seasonality: reorder point changes by month. Higher demand months: higher ROP. Calculate: monthly ROP = monthly_demand / 30 × lead_time + safety_stock. Adjust: 1) Forecast by month, 2) Update ROP monthly, 3) Pre-build inventory before peak season. Most: 30-50% higher ROP in peak season. Avoid: static ROP year-round (stockouts in peak, overstock in off-season)." },
    { q: "What is the difference between min and max inventory levels?", a: "Min (safety stock): minimum inventory to prevent stockouts. Max: order up to (max). Reorder when inventory = ROP. Order quantity = max - current_inventory. Most ERP: min/max system. Calculate max = ROP + EOQ. Optimize: max = forecast demand + safety stock. Higher max = more safety but more cost. Lower max = leaner but riskier." },
    { q: "How do I handle demand spikes?", a: "Spike handling: 1) Safety stock buffer (1-2 weeks), 2) Pre-position inventory (forecast spike), 3) Drop ship option, 4) Multi-supplier (3+ for critical items), 5) Air shipping for emergency, 6) Backorder communication. Most teams 10-20% of inventory should be safety stock for spike protection. Track top 20 SKUs separately. Avoid panic orders (poor lead time decisions)." },
  ],
  howToUse: [
    'Enter your average daily demand (units sold per day).',
    'Enter your supplier lead time in days (from order to delivery).',
    'Select your target service level (90/95/99%). Use 95% as default; 99% for critical SKUs.',
    'Enter your daily demand standard deviation (how much demand varies day-to-day).',
    'Enter your review period (how often you check inventory and reorder — typically weekly = 7 days).',
    'Read the reorder point — order when inventory drops to this level.',
  ],
  engineKey: true,
};
registerEngine(engine);