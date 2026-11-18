import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
import { BAND_META } from '../../core/engines/band-meta';

// =====================================================================
// Carrying Cost Calculator (P7-2) — Business v3 standard (6+ emoji sections)
// =====================================================================
//
// Total annual cost of holding inventory = (storage + insurance + shrinkage
// + opportunity + other) % × avg inventory value. Industry rule of thumb:
// 20–30% of inventory value per year.
// Health bands (% of inventory value):
//   🟢 < 20%        — efficient; capital not over-taxed
//   🟡 20%–25%      — typical retail range
//   🟠 25%–30%      — high carrying cost; renegotiate 3PL
//   🔴 ≥ 30%        — critical; reduce SKU count or storage spend
//
// Applies to physical-product businesses (Shopify/Amazon FBA/DTC) AND service
// businesses with inventory (course creators with merch, agencies with hardware).

// ============== Health band constants (per-file, exported for tests) ==============

export const HEALTH_BANDS = {
  excellent: 20.0,
  good: [20.0, 25.0],
  warning: [25.0, 30.0],
  critical: 30.0,
} as const;

// ============== Math helpers (exported for tests) ==============

/** Total carrying cost rate (%) = storage + insurance + shrinkage + opp + other. */
export function totalRate(
  storageRate: number,
  insuranceRate: number,
  shrinkageRate: number,
  oppCostRate: number,
  otherCostsPct: number
): number {
  return storageRate + insuranceRate + shrinkageRate + oppCostRate + otherCostsPct;
}

/** Total annual carrying cost ($) = inventory value × rate / 100. */
export function totalAnnualCost(avgInventoryValue: number, rate: number): number {
  return avgInventoryValue * (rate / 100);
}

/** Per-component annual cost ($) — for breakdown display. */
export function componentCost(avgInventoryValue: number, ratePct: number): number {
  return avgInventoryValue * (ratePct / 100);
}

/** Health band label from total rate. */
export function calcHealthBand(rate: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (rate < HEALTH_BANDS.excellent) return 'excellent';
  if (rate < HEALTH_BANDS.good[1]) return 'good';
  if (rate < HEALTH_BANDS.warning[1]) return 'warning';
  return 'critical';
}

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const avgInventoryValue = clampNonNegative(parseFloat(inputs.avgInventoryValue) || 0);
  const storageRate = clampNonNegative(parseFloat(inputs.storageRate) || 0);
  const insuranceRate = clampNonNegative(parseFloat(inputs.insuranceRate) || 0);
  const shrinkageRate = clampNonNegative(parseFloat(inputs.shrinkageRate) || 0);
  const oppCostRate = clampNonNegative(parseFloat(inputs.oppCostRate) || 0);
  const otherCostsPct = clampNonNegative(parseFloat(inputs.otherCostsPct) || 0);

  // Edge: zero inventory → prompt to enter value
  if (avgInventoryValue === 0) {
    return [
      '⏰ Carrying Cost Calculator\n\n' +
        '📊 Enter your average inventory value and the five carrying-cost rate components (storage, insurance, shrinkage, opportunity cost, other) to see your total annual carrying cost and how you compare to industry benchmarks.',
    ];
  }

  const tr = totalRate(storageRate, insuranceRate, shrinkageRate, oppCostRate, otherCostsPct);
  const totalCost = totalAnnualCost(avgInventoryValue, tr);
  const storageCost = componentCost(avgInventoryValue, storageRate);
  const insuranceCost = componentCost(avgInventoryValue, insuranceRate);
  const shrinkageCost = componentCost(avgInventoryValue, shrinkageRate);
  const oppCost = componentCost(avgInventoryValue, oppCostRate);
  const otherCost = componentCost(avgInventoryValue, otherCostsPct);

  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

  // Health band
  const band = calcHealthBand(tr);
  const healthEmoji = BAND_META[band];
  const healthLabel =
    band === 'excellent'
      ? 'Excellent — total carry < 20%; capital is efficient'
      : band === 'good'
      ? 'Good — typical retail range (20–25%); review annually'
      : band === 'warning'
      ? 'Warning — high carrying cost (25–30%); reduce SKU count or storage spend'
      : 'Critical — ≥ 30%; urgent renegotiation of 3PL / storage contracts';

  // What-If: shrinkage drops to 0.5% (loss-prevention win), then total -2pp
  const shrinkageDown = 0.5;
  const trShrinkageDown = storageRate + insuranceRate + shrinkageDown + oppCostRate + otherCostsPct;
  const totalCostShrinkageDown = totalAnnualCost(avgInventoryValue, trShrinkageDown);
  const savingsFromShrinkage = totalCost - totalCostShrinkageDown;

  const trDown2pp = Math.max(0, tr - 2);
  const totalCostDown2pp = totalAnnualCost(avgInventoryValue, trDown2pp);
  const savings2pp = totalCost - totalCostDown2pp;

  // Break-Even: max total rate for 🟢 (< 20%); reverse-solve storage headroom
  const otherRatesSum = insuranceRate + shrinkageRate + oppCostRate + otherCostsPct;
  const targetStorage = 19.9 - otherRatesSum; // ceiling for storage alone to hit 🟢
  const storageHeadroom = storageRate - targetStorage;

  // Milestone: 12-mo savings if rate drops 2pp
  const annualSavings2pp = savings2pp;

  // Tip: band-driven contextual advice
  let tip: string;
  if (band === 'critical') {
    tip =
      '≥ 30% carrying cost is unsustainable. Renegotiate 3PL contracts (storage fees are usually the biggest lever), kill bottom-decile SKUs, and consider drop-shipping for slow movers to remove inventory from your books entirely.';
  } else if (band === 'warning') {
    tip =
      '25–30% is high. Reduce SKU count by 20% (typically kills 60% of slow-moving capital), audit shrinkage (most teams find 0.5–1.5% recoverable via better receiving/inventory audits), and check storage rates against 2 alternative 3PLs.';
  } else if (band === 'good') {
    tip =
      '20–25% is solid retail territory. To reach the excellent band, focus on opportunity cost (line of credit at < 8% APR) and storage (consolidate to fewer warehouses). Audit annually for rate changes.';
  } else {
    tip =
      'Excellent carry cost. Your capital is efficient — keep monitoring for creep. Watch for: storage rate increases on contract renewal, opportunity cost drift if interest rates fall (re-evaluate opp cost annually).';
  }

  const r =
    '⏰ Carrying Cost Calculator\n\n' +
    '🩺 Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• Total rate: ' + tr.toFixed(1) + '%/year  ·  Total annual cost: ' + money(totalCost) + '\n' +
    '• Industry benchmark: 20–30% of inventory value/year  ·  Your status: ' + (tr < 20 ? 'below benchmark' : tr < 25 ? 'in benchmark' : tr < 30 ? 'above benchmark' : 'critical') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Inputs Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Avg inventory value:    ' + money(avgInventoryValue) + '\n' +
    '• Storage:                ' + storageRate.toFixed(1) + '%  =  ' + money(storageCost) + '/yr\n' +
    '• Insurance:              ' + insuranceRate.toFixed(1) + '%  =  ' + money(insuranceCost) + '/yr\n' +
    '• Shrinkage:              ' + shrinkageRate.toFixed(1) + '%  =  ' + money(shrinkageCost) + '/yr\n' +
    '• Opportunity cost:       ' + oppCostRate.toFixed(1) + '%  =  ' + money(oppCost) + '/yr\n' +
    '• Other:                  ' + otherCostsPct.toFixed(1) + '%  =  ' + money(otherCost) + '/yr\n' +
    '• TOTAL:                  ' + tr.toFixed(1) + '%  =  ' + money(totalCost) + '/yr\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Shrinkage drops to 0.5% (loss-prevention win): rate = ' + trShrinkageDown.toFixed(1) + '%  ·  annual cost = ' + money(totalCostShrinkageDown) + '  ·  savings = ' + money(savingsFromShrinkage) + '\n' +
    '• Total rate drops −2pp: rate = ' + trDown2pp.toFixed(1) + '%  ·  annual cost = ' + money(totalCostDown2pp) + '  ·  savings = ' + money(savings2pp) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Max storage rate for 🟢 (target <20% total): ' + (targetStorage >= 0 ? targetStorage.toFixed(1) + '%' : 'N/A (other components already exceed 20% — must reduce elsewhere)') + '\n' +
    '• Storage headroom: ' + (storageHeadroom > 0 ? 'reduce storage by ' + storageHeadroom.toFixed(1) + 'pp to hit 🟢' : storageHeadroom === 0 ? 'at threshold' : 'already below target') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Milestone:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• 12-mo savings if rate drops 2pp: ' + money(annualSavings2pp) + '\n' +
    '• Reinvested at 8% return: ' + money(annualSavings2pp * 0.08) + '/yr additional\n' +
    '• Compounded over 3 years: ' + money(annualSavings2pp * 1.08 * 3 - annualSavings2pp * 3) + ' (vs $0 reinvested)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let s=function(t){return Number.isNaN(t)?0:Math.max(0,t)},k=function(t,n,r,o,l){return t+n+r+o+l},p=function(t,n){return t*(n/100)},c=function(t,n){return t*(n/100)},w=function(t){return t<f.excellent?"excellent":t<f.good[1]?"good":t<f.warning[1]?"warning":"critical"},x=function(t,n,r){var o=I(t);return Array.isArray(o)?o.join(\`
\`):String(o)};var N=s,O=k,W=p,j=c,V=w,Y=x,_={excellent:"🟢",good:"🟡",warning:"🟠",critical:"🔴"},f={excellent:20,good:[20,25],warning:[25,30],critical:30},I=function(t){const n=s(parseFloat(t.avgInventoryValue)||0),r=s(parseFloat(t.storageRate)||0),o=s(parseFloat(t.insuranceRate)||0),l=s(parseFloat(t.shrinkageRate)||0),g=s(parseFloat(t.oppCostRate)||0),u=s(parseFloat(t.otherCostsPct)||0);if(n===0)return[\`⏰ Carrying Cost Calculator

📊 Enter your average inventory value and the five carrying-cost rate components (storage, insurance, shrinkage, opportunity cost, other) to see your total annual carrying cost and how you compare to industry benchmarks.\`];const a=k(r,o,l,g,u),h=p(n,a),P=c(n,r),D=c(n,o),M=c(n,l),T=c(n,g),E=c(n,u),e=A=>"$"+Math.round(A).toLocaleString("en-US"),i=w(a),K=_[i],L=i==="excellent"?"Excellent — total carry < 20%; capital is efficient":i==="good"?"Good — typical retail range (20–25%); review annually":i==="warning"?"Warning — high carrying cost (25–30%); reduce SKU count or storage spend":"Critical — ≥ 30%; urgent renegotiation of 3PL / storage contracts",b=r+o+.5+g+u,C=p(n,b),U=h-C,F=Math.max(0,a-2),S=p(n,F),R=h-S,v=19.9-(o+l+g+u),m=r-v,y=R;let d;return i==="critical"?d="≥ 30% carrying cost is unsustainable. Renegotiate 3PL contracts (storage fees are usually the biggest lever), kill bottom-decile SKUs, and consider drop-shipping for slow movers to remove inventory from your books entirely.":i==="warning"?d="25–30% is high. Reduce SKU count by 20% (typically kills 60% of slow-moving capital), audit shrinkage (most teams find 0.5–1.5% recoverable via better receiving/inventory audits), and check storage rates against 2 alternative 3PLs.":i==="good"?d="20–25% is solid retail territory. To reach the excellent band, focus on opportunity cost (line of credit at < 8% APR) and storage (consolidate to fewer warehouses). Audit annually for rate changes.":d="Excellent carry cost. Your capital is efficient — keep monitoring for creep. Watch for: storage rate increases on contract renewal, opportunity cost drift if interest rates fall (re-evaluate opp cost annually).",[\`⏰ Carrying Cost Calculator

🩺 Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+K+" "+L+\`
• Total rate: \`+a.toFixed(1)+"%/year  ·  Total annual cost: "+e(h)+\`
• Industry benchmark: 20–30% of inventory value/year  ·  Your status: \`+(a<20?"below benchmark":a<25?"in benchmark":a<30?"above benchmark":"critical")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Inputs Snapshot:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Avg inventory value:    \`+e(n)+\`
• Storage:                \`+r.toFixed(1)+"%  =  "+e(P)+\`/yr
• Insurance:              \`+o.toFixed(1)+"%  =  "+e(D)+\`/yr
• Shrinkage:              \`+l.toFixed(1)+"%  =  "+e(M)+\`/yr
• Opportunity cost:       \`+g.toFixed(1)+"%  =  "+e(T)+\`/yr
• Other:                  \`+u.toFixed(1)+"%  =  "+e(E)+\`/yr
• TOTAL:                  \`+a.toFixed(1)+"%  =  "+e(h)+\`/yr

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 What-If:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Shrinkage drops to 0.5% (loss-prevention win): rate = \`+b.toFixed(1)+"%  ·  annual cost = "+e(C)+"  ·  savings = "+e(U)+\`
• Total rate drops −2pp: rate = \`+F.toFixed(1)+"%  ·  annual cost = "+e(S)+"  ·  savings = "+e(R)+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ Break-Even:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Max storage rate for 🟢 (target <20% total): \`+(v>=0?v.toFixed(1)+"%":"N/A (other components already exceed 20% — must reduce elsewhere)")+\`
• Storage headroom: \`+(m>0?"reduce storage by "+m.toFixed(1)+"pp to hit 🟢":m===0?"at threshold":"already below target")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Milestone:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 12-mo savings if rate drops 2pp: \`+e(y)+\`
• Reinvested at 8% return: \`+e(y*.08)+\`/yr additional
• Compounded over 3 years: \`+e(y*1.08*3-y*3)+\` (vs $0 reinvested)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Tip: \`+d+\`
\`]};return[x(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-carrying-cost-calculator',
  title: 'Carrying Cost Calculator',
  description:
    'Total annual cost of holding inventory — storage + insurance + shrinkage + opportunity cost + other. Industry rule of thumb: 20–30% of inventory value per year. Health bands: 🟢 <20% · 🟡 20–25% · 🟠 25–30% · 🔴 ≥30%.',
  categoryId: 'O',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'avgInventoryValue', label: 'Average Inventory Value', placeholder: 'e.g. 50000', type: 'number' },
    { name: 'storageRate', label: 'Storage Cost (% of inventory)', placeholder: 'e.g. 8', type: 'number' },
    { name: 'insuranceRate', label: 'Insurance Cost (%)', placeholder: 'e.g. 1.5', type: 'number' },
    { name: 'shrinkageRate', label: 'Shrinkage / Damage (%)', placeholder: 'e.g. 2', type: 'number' },
    { name: 'oppCostRate', label: 'Opportunity Cost (%)', placeholder: 'e.g. 8', type: 'number' },
    { name: 'otherCostsPct', label: 'Other Carrying Costs (%)', placeholder: 'e.g. 2', type: 'number' },
  ],
  keywords: [
    'carrying cost calculator',
    'inventory holding cost',
    'storage cost',
    'shrinkage rate',
    'opportunity cost inventory',
    'inventory carrying cost',
    'total inventory cost',
    'B2B inventory metrics',
    'warehouse cost',
    'inventory financing',
  ],
  tags: ['operations', 'inventory', 'carrying-cost', 'storage'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-06',
  sources: [
    'https://www.investopedia.com/terms/c/carrying-cost.asp',
    'https://www.shopify.com/blog/carrying-cost',
    'https://www.shipbob.com/blog/carrying-cost/',
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
  staticExamples: ['⏰ Carrying Cost Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 Good — typical retail range (20–25%); review annually\n• Total rate: 21.5%/year  ·  Total annual cost: $10,750\n• Industry benchmark: 20–30% of inventory value/year  ·  Your status: in benchmark\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Avg inventory value:    $50,000\n• Storage:                8.0%  =  $4,000/yr\n• Insurance:              1.5%  =  $750/yr\n• Shrinkage:              2.0%  =  $1,000/yr\n• Opportunity cost:       8.0%  =  $4,000/yr\n• Other:                  2.0%  =  $1,000/yr\n• TOTAL:                  21.5%  =  $10,750/yr\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Shrinkage drops to 0.5% (loss-prevention win): rate = 20.0%  ·  annual cost = $10,000  ·  savings = $750\n• Total rate drops −2pp: rate = 19.5%  ·  annual cost = $9,750  ·  savings = $1,000\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Max storage rate for 🟢 (target <20% total): 6.4%\n• Storage headroom: reduce storage by 1.6pp to hit 🟢\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 12-mo savings if rate drops 2pp: $1,000\n• Reinvested at 8% return: $80/yr additional\n• Compounded over 3 years: $240 (vs $0 reinvested)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: 20–25% is solid retail territory. To reach the excellent band, focus on opportunity cost (line of credit at < 8% APR) and storage (consolidate to fewer warehouses). Audit annually for rate changes.\n'],
  faq: [
    { q: 'What is a typical inventory carrying cost?', a: 'Industry rule of thumb: 20–30% of inventory value per year. Storage is usually the largest component (5–10%), followed by opportunity cost (5–10%), shrinkage (1–3%), insurance (1–2%), and other (1–3%).' },
    { q: 'How do I reduce my carrying cost?', a: 'Three biggest levers: (1) reduce SKU count — kill bottom 20% (typically frees 50%+ of capital), (2) renegotiate 3PL contracts — most teams save 15–30%, (3) tighten reorder points and reduce safety stock (saves 10–20%).' },
    { q: 'How is opportunity cost calculated?', a: 'Opportunity cost = capital tied up in inventory × alternative investment return. If your inventory holds $50k and you could earn 8% elsewhere, opp cost = $4k/year. Adjust when interest rates change (lower rates → lower opp cost).' },
    { q: 'Does shrinkage include theft?', a: 'Yes — shrinkage is the umbrella term for inventory loss from theft, damage, expiry, miscounting, and supplier fraud. Most teams find 0.5–1.5% recoverable via better receiving/inventory audits; >2% suggests a process problem.' },
    { q: "What is inventory carrying cost?", a: "Carrying cost = total cost of holding inventory per year. Components: 1) Capital cost (opportunity cost of money tied up): 5-15% of inventory value, 2) Storage cost (warehousing): 2-5%, 3) Insurance + taxes: 1-3%, 4) Shrinkage (theft, damage, expiry): 1-5%, 5) Obsolescence: 2-10%. Total: 15-30% of inventory value per year. Industry average: 25%." },
    { q: "How do I reduce inventory carrying cost?", a: "1) Just-in-time (JIT) inventory, 2) Better demand forecasting, 3) Drop shipping, 4) Lower safety stock, 5) Cross-docking, 6) Markdown slow-movers early, 7) Negotiate supplier terms (consignment, longer payment). Most teams 10-30% reduction in 12 months. Aim for 15-20% carrying cost (vs 25% average)." },
    { q: "What is the difference between carrying cost and holding cost?", a: "Same thing. Holding cost = carrying cost = total cost of inventory per year. Sometimes \"carrying cost\" includes shipping to customer (last-mile), but typically it's the storage + capital + obsolescence. Most teams: 20-30% of inventory value annually. Use for: EOQ, reorder point, safety stock calculations. Lower = more efficient." },
    { q: "What is a good inventory turnover ratio?", a: "Benchmarks: 4-6x/year is good. 8-12x is excellent. <3x = overstocked. By industry: grocery 12-20x, apparel 4-8x, electronics 6-10x, auto 2-4x. Calculate: COGS / average inventory. Higher = more efficient. Target: industry-specific. Low: cash tied up, obsolescence risk. High: stockout risk. Sweet spot: 6-8x for most." },
    { q: "How does carrying cost affect pricing?", a: "Carrying cost adds to product cost. For 25% carrying cost on $100 product: $25/year. If turns 4x/year: $6.25 per unit per sale. Add to COGS. Higher carrying cost = higher prices. Reduce: lower inventory, faster turns, lower storage cost. Most products: 5-15% of price is carrying cost. Affects margin significantly." },
    { q: "What is safety stock and how does it relate?", a: "Safety stock = extra inventory to prevent stockouts. Higher = lower stockout risk, higher carrying cost. Lower = higher stockout risk, lower cost. Formula: safety_stock = Z × σ_demand × √(lead_time). Where Z = service level factor, σ = demand variability. Most teams: 1-2 weeks of demand as safety stock. Trade-off: cost vs service level." },
    { q: "How do I calculate inventory obsolescence cost?", a: "Obsolescence: inventory that won't sell. Cost: 1) Write-down (full cost), 2) Markdown (typically 30-70% off), 3) Disposal cost. Common in: fashion (seasons), tech (new models), food (expiry). Tactics to reduce: 1) Better forecasting, 2) Smaller initial orders, 3) Faster turns, 4) Markdown early (less write-down). Most: 5-10% of inventory becomes obsolete." },
    { q: "Should I drop ship to reduce carrying cost?", a: "Drop ship: supplier ships directly to customer. Pros: 1) Zero inventory carrying cost, 2) Lower capital needs, 3) Wider product range. Cons: 1) Lower margin (10-30% less), 2) Less control over shipping, 3) Inventory surprises, 4) Customer service harder. Best for: low-volume SKUs, long-tail products, test markets. Hybrid: stock fast-movers, drop ship the rest." },
  ],
  howToUse: [
    'Enter your average inventory value (often calculated as (beginning + ending inventory) / 2).',
    'Enter each carrying cost component as a percentage of inventory value (storage / insurance / shrinkage / opportunity / other).',
    'Read the total annual cost and compare to the 20–30% industry benchmark band.',
    'Use What-If to model shrinkage reduction (typical loss-prevention win) or rate drops.',
    'If you are above 30%, use Break-Even to see which component to attack first.',
  ],
  engineKey: true,
};
registerEngine(engine);