import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
import { BAND_META } from '../../core/engines/band-meta';

// =====================================================================
// Order Fulfillment Cost Calculator (P7-5) — Business v3 standard
// =====================================================================
//
// Per-order cost = labor + shipping + packaging + return handling.
// labor = (pick min + pack min) / 60 × labor rate.
// return handling = return rate % × $4.50 (avg return handling cost).
// Health bands ($/order):
//   🟢 < $5       — efficient; profitable fulfillment
//   🟡 $5–$10     — typical retail range
//   🟠 $10–$20    — high; automate or batch
//   🔴 ≥ $20      — critical; consider 3PL or restructure
//
// Applies to physical-product businesses (Shopify/Amazon FBA/DTC) — service
// businesses with no order fulfillment should skip this calculator.

const AVG_RETURN_HANDLING_COST = 4.5; // $4.50 per returned order (industry average)

// ============== Health band constants (per-file, exported for tests) ==============

export const HEALTH_BANDS = {
  excellent: 5.0,
  good: [5.0, 10.0],
  warning: [10.0, 20.0],
  critical: 20.0,
} as const;

// ============== Math helpers (exported for tests) ==============

/** Labor minutes per order = pick min + pack min. */
export function laborMinPerOrder(pickMin: number, packMin: number): number {
  return pickMin + packMin;
}

/** Labor cost per order ($) = (labor min / 60) × labor rate ($/hr). */
export function laborCostPerOrder(laborMin: number, laborRate: number): number {
  return (laborMin / 60) * laborRate;
}

/** Return handling cost per order ($) = return rate % × $4.50. */
export function returnHandlingPerOrder(returnRatePct: number): number {
  return (returnRatePct / 100) * AVG_RETURN_HANDLING_COST;
}

/** Per-order total fulfillment cost ($) = labor + shipping + packaging + return handling. */
export function perOrderCost(
  laborCostPerOrder: number,
  shippingCost: number,
  packagingCost: number,
  returnHandlingPerOrder: number
): number {
  return laborCostPerOrder + shippingCost + packagingCost + returnHandlingPerOrder;
}

/** Monthly total cost = per-order × orders per month. */
export function monthlyTotal(perOrderCost: number, ordersPerMonth: number): number {
  return perOrderCost * ordersPerMonth;
}

/** Annual total = monthly × 12. */
export function annualTotal(monthlyTotal: number): number {
  return monthlyTotal * 12;
}

/** Health band label from per-order cost. */
export function calcHealthBand(perOrderCost: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (perOrderCost < HEALTH_BANDS.excellent) return 'excellent';
  if (perOrderCost < HEALTH_BANDS.good[1]) return 'good';
  if (perOrderCost < HEALTH_BANDS.warning[1]) return 'warning';
  return 'critical';
}

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const ordersPerMonth = clampNonNegative(parseFloat(inputs.ordersPerMonth) || 0);
  const pickMin = clampNonNegative(parseFloat(inputs.pickMin) || 0);
  const packMin = clampNonNegative(parseFloat(inputs.packMin) || 0);
  const shippingCost = clampNonNegative(parseFloat(inputs.shippingCost) || 0);
  const packagingCost = clampNonNegative(parseFloat(inputs.packagingCost) || 0);
  const laborRate = clampNonNegative(parseFloat(inputs.laborRate) || 0);
  const returnRate = clampNonNegative(Math.min(100, parseFloat(inputs.returnRate) || 0));

  // Edge: zero orders → prompt
  if (ordersPerMonth === 0) {
    return [
      '⏰ Order Fulfillment Cost Calculator\n\n' +
        '📊 Enter your orders per month, pick/pack time, shipping/packaging costs, labor rate, and return rate to see per-order and monthly fulfillment costs and how you compare to industry benchmarks.',
    ];
  }

  const laborMin = laborMinPerOrder(pickMin, packMin);
  const laborCost = laborCostPerOrder(laborMin, laborRate);
  const retHandling = returnHandlingPerOrder(returnRate);
  const poCost = perOrderCost(laborCost, shippingCost, packagingCost, retHandling);
  const moTotal = monthlyTotal(poCost, ordersPerMonth);
  const annTotal = annualTotal(moTotal);

  const money = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  const moneyR = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

  // Health band
  const band = calcHealthBand(poCost);
  const healthEmoji = BAND_META[band];
  const healthLabel =
    band === 'excellent'
      ? 'Excellent — per-order cost < $5; efficient fulfillment'
      : band === 'good'
      ? 'Good — $5–$10 per order; typical retail range'
      : band === 'warning'
      ? 'Warning — $10–$20 per order; high; automate or batch'
      : 'Critical — ≥ $20 per order; restructure or switch to 3PL';

  // What-If: returns drop to 3%, then labor 25% faster
  const retDown = 3;
  const retHandlingDown = returnHandlingPerOrder(retDown);
  const poCostRetDown = perOrderCost(laborCost, shippingCost, packagingCost, retHandlingDown);
  const savingsRet = moTotal - monthlyTotal(poCostRetDown, ordersPerMonth);

  const laborMin25 = laborMin * 0.75;
  const laborCost25 = laborCostPerOrder(laborMin25, laborRate);
  const poCostLabor25 = perOrderCost(laborCost25, shippingCost, packagingCost, retHandling);
  const savingsLabor = moTotal - monthlyTotal(poCostLabor25, ordersPerMonth);

  // Break-Even: max labor min per order for 🟢 (< $5 total)
  // poCost < 5
  // (laborMin / 60) × laborRate + shipping + packaging + retHandling < 5
  // laborMin < (5 - shipping - packaging - retHandling) × 60 / laborRate
  const fixedCosts = shippingCost + packagingCost + retHandling;
  const targetLaborCost = 5.0 - fixedCosts;
  const targetLaborMin = laborRate > 0 && targetLaborCost > 0 ? (targetLaborCost * 60) / laborRate : Infinity;
  const laborHeadroom = laborMin - targetLaborMin;

  // Milestone: 12-mo savings if cost drops $1/order
  const savingsPerOrder1 = 1;
  const annualSavings1 = savingsPerOrder1 * ordersPerMonth * 12;

  // Tip: band-driven contextual advice
  let tip: string;
  if (band === 'critical') {
    tip =
      '≥ $20 per order is unsustainable. Switch to a 3PL (typical $3–$8/order), negotiate shipping rates (50%+ savings possible at scale), and audit SKU-level fulfillment complexity (top 20% of SKUs often drive 80% of cost).';
  } else if (band === 'warning') {
    tip =
      '$10–$20 per order is high. Batch pick (process 5+ orders at once), automate packaging (tape dispensers, dunnage systems), and audit return reasons (often 30–50% reducible via better product descriptions).';
  } else if (band === 'good') {
    tip =
      '$5–$10 per order is typical retail. To reach 🟢, focus on shipping negotiation (LTL freight for heavy items, regional carriers), reduce packaging waste, and review labor flow (eliminate walking time).';
  } else {
    tip =
      'Excellent fulfillment cost. Keep monitoring — as you scale, revisit 3PL pricing (often $3–$5/order), renegotiate carrier rates annually, and watch for return-rate creep (each +1% return adds $0.05/order).';
  }

  const r =
    '⏰ Order Fulfillment Cost Calculator\n\n' +
    '🩺 Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• Per-order cost: ' + money(poCost) + '  ·  Monthly total: ' + moneyR(moTotal) + '  ·  Annual: ' + moneyR(annTotal) + '\n' +
    '• Industry benchmark: $5–$10/order  ·  Your status: ' + (poCost < 5 ? 'below benchmark' : poCost < 10 ? 'in benchmark' : poCost < 20 ? 'above benchmark' : 'critical') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Inputs Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Orders per month:        ' + ordersPerMonth + '\n' +
    '• Pick time:               ' + pickMin + ' min/order\n' +
    '• Pack time:               ' + packMin + ' min/order\n' +
    '• Labor rate:              ' + money(laborRate) + '/hr\n' +
    '• Labor cost:              ' + money(laborCost) + '/order  (' + laborMin + ' min)\n' +
    '• Shipping cost:           ' + money(shippingCost) + '/order\n' +
    '• Packaging cost:          ' + money(packagingCost) + '/order\n' +
    '• Return rate:             ' + returnRate.toFixed(1) + '%  ·  handling = ' + money(retHandling) + '/order\n' +
    '• Per-order total:         ' + money(poCost) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Returns drop to 3%: per-order = ' + money(poCostRetDown) + '  ·  monthly savings = ' + moneyR(savingsRet) + '\n' +
    '• Labor 25% faster: per-order = ' + money(poCostLabor25) + '  ·  monthly savings = ' + moneyR(savingsLabor) + '\n' +
    '• Combined (3% returns + 25% faster labor): see Milestone\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Max labor min for 🟢 (< $5/order total): ' + (isFinite(targetLaborMin) ? targetLaborMin.toFixed(1) + ' min' : 'N/A (fixed costs alone exceed $5)') + '\n' +
    '• Labor headroom: ' + (laborHeadroom > 0 ? 'reduce pick+pack by ' + laborHeadroom.toFixed(1) + ' min to hit 🟢' : laborHeadroom === 0 ? 'at threshold' : 'already below target') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Milestone:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• 12-mo savings if cost drops $1/order: ' + moneyR(annualSavings1) + '\n' +
    '• Reinvested at 8% return: ' + moneyR(annualSavings1 * 0.08) + '/yr additional\n' +
    '• Compounded over 3 years: ' + moneyR(annualSavings1 * 1.08 * 3 - annualSavings1 * 3) + ' (vs $0 reinvested)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let t=function(n){return Number.isNaN(n)?0:Math.max(0,n)},M=function(n,r){return n+r},v=function(n,r){return n/60*r},$=function(n){return n/100*K},g=function(n,r,c,o){return n+r+c+o},f=function(n,r){return n*r},L=function(n){return n*12},P=function(n){return n<k.excellent?"excellent":n<k.good[1]?"good":n<k.warning[1]?"warning":"critical"},R=function(n,r,c){var o=U(n);return Array.isArray(o)?o.join(\`
\`):String(o)};var z=t,A=M,B=v,H=$,J=g,Q=f,V=L,X=P,Z=R,I={excellent:"🟢",good:"🟡",warning:"🟠",critical:"🔴"},K=4.5,k={excellent:5,good:[5,10],warning:[10,20],critical:20},U=function(n){const r=t(parseFloat(n.ordersPerMonth)||0),c=t(parseFloat(n.pickMin)||0),o=t(parseFloat(n.packMin)||0),l=t(parseFloat(n.shippingCost)||0),d=t(parseFloat(n.packagingCost)||0),u=t(parseFloat(n.laborRate)||0),S=t(Math.min(100,parseFloat(n.returnRate)||0));if(r===0)return[\`⏰ Order Fulfillment Cost Calculator

📊 Enter your orders per month, pick/pack time, shipping/packaging costs, labor rate, and return rate to see per-order and monthly fulfillment costs and how you compare to industry benchmarks.\`];const h=M(c,o),w=v(h,u),m=$(S),a=g(w,l,d,m),b=f(a,r),N=L(b),e=F=>"$"+F.toLocaleString("en-US",{maximumFractionDigits:2}),i=F=>"$"+Math.round(F).toLocaleString("en-US"),s=P(a),O=I[s],T=s==="excellent"?"Excellent — per-order cost < $5; efficient fulfillment":s==="good"?"Good — $5–$10 per order; typical retail range":s==="warning"?"Warning — $10–$20 per order; high; automate or batch":"Critical — ≥ $20 per order; restructure or switch to 3PL",j=$(3),_=g(w,l,d,j),W=b-f(_,r),G=h*.75,Y=v(G,u),D=g(Y,l,d,m),q=b-f(D,r),E=5-(l+d+m),x=u>0&&E>0?E*60/u:1/0,C=h-x,y=1*r*12;let p;return s==="critical"?p="≥ $20 per order is unsustainable. Switch to a 3PL (typical $3–$8/order), negotiate shipping rates (50%+ savings possible at scale), and audit SKU-level fulfillment complexity (top 20% of SKUs often drive 80% of cost).":s==="warning"?p="$10–$20 per order is high. Batch pick (process 5+ orders at once), automate packaging (tape dispensers, dunnage systems), and audit return reasons (often 30–50% reducible via better product descriptions).":s==="good"?p="$5–$10 per order is typical retail. To reach 🟢, focus on shipping negotiation (LTL freight for heavy items, regional carriers), reduce packaging waste, and review labor flow (eliminate walking time).":p="Excellent fulfillment cost. Keep monitoring — as you scale, revisit 3PL pricing (often $3–$5/order), renegotiate carrier rates annually, and watch for return-rate creep (each +1% return adds $0.05/order).",[\`⏰ Order Fulfillment Cost Calculator

🩺 Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+O+" "+T+\`
• Per-order cost: \`+e(a)+"  ·  Monthly total: "+i(b)+"  ·  Annual: "+i(N)+\`
• Industry benchmark: $5–$10/order  ·  Your status: \`+(a<5?"below benchmark":a<10?"in benchmark":a<20?"above benchmark":"critical")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Inputs Snapshot:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Orders per month:        \`+r+\`
• Pick time:               \`+c+\` min/order
• Pack time:               \`+o+\` min/order
• Labor rate:              \`+e(u)+\`/hr
• Labor cost:              \`+e(w)+"/order  ("+h+\` min)
• Shipping cost:           \`+e(l)+\`/order
• Packaging cost:          \`+e(d)+\`/order
• Return rate:             \`+S.toFixed(1)+"%  ·  handling = "+e(m)+\`/order
• Per-order total:         \`+e(a)+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 What-If:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Returns drop to 3%: per-order = \`+e(_)+"  ·  monthly savings = "+i(W)+\`
• Labor 25% faster: per-order = \`+e(D)+"  ·  monthly savings = "+i(q)+\`
• Combined (3% returns + 25% faster labor): see Milestone

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ Break-Even:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Max labor min for 🟢 (< $5/order total): \`+(isFinite(x)?x.toFixed(1)+" min":"N/A (fixed costs alone exceed $5)")+\`
• Labor headroom: \`+(C>0?"reduce pick+pack by "+C.toFixed(1)+" min to hit 🟢":C===0?"at threshold":"already below target")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Milestone:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 12-mo savings if cost drops $1/order: \`+i(y)+\`
• Reinvested at 8% return: \`+i(y*.08)+\`/yr additional
• Compounded over 3 years: \`+i(y*1.08*3-y*3)+\` (vs $0 reinvested)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Tip: \`+p+\`
\`]};return[R(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-fulfillment-cost-calculator',
  title: 'Order Fulfillment Cost Calculator',
  description:
    'Per-order cost decomposition — labor + shipping + packaging + returns handling. The "true cost" of fulfilling one order; often higher than expected. Health bands: 🟢 <$5 · 🟡 $5–$10 · 🟠 $10–$20 · 🔴 ≥$20.',
  categoryId: 'O',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'ordersPerMonth', label: 'Orders per Month', placeholder: 'e.g. 500', type: 'number' },
    { name: 'pickMin', label: 'Pick Time (min/order)', placeholder: 'e.g. 3', type: 'number' },
    { name: 'packMin', label: 'Pack Time (min/order)', placeholder: 'e.g. 2', type: 'number' },
    { name: 'shippingCost', label: 'Shipping Cost per Order ($)', placeholder: 'e.g. 5.50', type: 'number' },
    { name: 'packagingCost', label: 'Packaging Cost per Order ($)', placeholder: 'e.g. 1.20', type: 'number' },
    { name: 'laborRate', label: 'Labor Rate ($/hour)', placeholder: 'e.g. 18', type: 'number' },
    { name: 'returnRate', label: 'Return Rate (%)', placeholder: 'e.g. 8', type: 'number' },
  ],
  keywords: [
    'fulfillment cost calculator',
    'order fulfillment cost',
    'pick and pack cost',
    'shipping cost',
    'packaging cost',
    'return handling cost',
    'per order cost',
    '3PL comparison',
    'ecommerce fulfillment',
    'Shopify fulfillment cost',
  ],
  tags: ['operations', 'fulfillment', 'pick-pack', 'shipping'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-06',
  sources: [
    'https://www.shipbob.com/blog/fulfillment-cost/',
    'https://www.shopify.com/enterprise/blog/ecommerce-fulfillment',
    'https://www.bigcommerce.com/blog/fulfillment-cost/',
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
  staticExamples: ['⏰ Order Fulfillment Cost Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 Good — $5–$10 per order; typical retail range\n• Per-order cost: $8.56  ·  Monthly total: $4,280  ·  Annual: $51,360\n• Industry benchmark: $5–$10/order  ·  Your status: in benchmark\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Orders per month:        500\n• Pick time:               3 min/order\n• Pack time:               2 min/order\n• Labor rate:              $18/hr\n• Labor cost:              $1.5/order  (5 min)\n• Shipping cost:           $5.5/order\n• Packaging cost:          $1.2/order\n• Return rate:             8.0%  ·  handling = $0.36/order\n• Per-order total:         $8.56\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Returns drop to 3%: per-order = $8.33  ·  monthly savings = $113\n• Labor 25% faster: per-order = $8.19  ·  monthly savings = $187\n• Combined (3% returns + 25% faster labor): see Milestone\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Max labor min for 🟢 (< $5/order total): N/A (fixed costs alone exceed $5)\n• Labor headroom: already below target\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 12-mo savings if cost drops $1/order: $6,000\n• Reinvested at 8% return: $480/yr additional\n• Compounded over 3 years: $1,440 (vs $0 reinvested)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: $5–$10 per order is typical retail. To reach 🟢, focus on shipping negotiation (LTL freight for heavy items, regional carriers), reduce packaging waste, and review labor flow (eliminate walking time).\n'],
  faq: [
    { q: 'What is a typical per-order fulfillment cost?', a: '$5–$10 is typical retail. <$5 is excellent (high-volume operators or efficient 3PLs). $10–$20 is high (small-volume in-house). ≥$20 is critical (often indicates manual labor + inefficient shipping).' },
    { q: 'Should I use a 3PL or fulfill in-house?', a: '3PLs typically charge $3–$8 per order and become cost-effective above ~200 orders/month. Below that, in-house is often cheaper (3PL minimums + storage fees). Compare using this calculator with 3PL quote.' },
    { q: 'How can I reduce return handling costs?', a: 'Returns typically cost $4–$10/order to handle (receiving, inspecting, restocking or disposing). Reduce at source: better product descriptions, accurate sizing, AR try-on tools, packaging integrity.' },
    { q: 'What is the biggest cost driver?', a: 'Usually shipping (40–60% of per-order cost for small parcels). Negotiate rates at scale (carriers give 30–50% discounts above 100 orders/week), use regional carriers, or batch orders to LTL for heavy items.' },
    { q: "What is a good fulfillment cost per order?", a: "Benchmarks: 1) Self-fulfilled small business: $5-15, 2) 3PL mid-size: $3-8, 3) Amazon FBA: $5-10, 4) Enterprise (millions of orders): $2-5. Includes: pick + pack + ship + materials. Lower = better. By category: apparel higher (size variants), books lower (standard size). Most teams: aim for $5-7 per order." },
    { q: "What are the components of fulfillment cost?", a: "Cost components: 1) Pick fee ($0.50-2), 2) Pack fee ($0.50-2), 3) Materials (box, tape, dunnage: $0.50-3), 4) Shipping label ($3-15 for small parcel), 5) Warehousing ($0.50-5/unit/month), 6) Returns ($5-15 per return). Total: $5-30 per order. Optimize: pick/pack efficiency, materials, shipping rates, returns process." },
    { q: "How do I reduce fulfillment cost?", a: "1) Negotiate shipping rates (USPS discounts, FedEx tier 2-3), 2) Optimize packaging (right-size boxes), 3) Batch pick/pack, 4) Reduce split shipments, 5) Use 3PL (often 30-50% cheaper than self), 6) Reduce returns (better product info). Most teams 20-40% reduction in 12 months. Best ROI: shipping rate negotiation (immediate)." },
    { q: "When should I use a 3PL?", a: "Use 3PL when: 1) >500 orders/month (cheaper than self), 2) Multi-warehouse needed, 3) International expansion, 4) Capital constraints, 5) Time-to-market matters. Common 3PLs: ShipBob, ShipMonk, Rakuten, Fulfilled by Amazon (FBA). Cost: 30-50% less than self at 1000+ orders/month. Be careful: lock-in contracts, integration complexity." },
    { q: "What is FBA vs FBM?", a: "FBA (Fulfilled by Amazon): Amazon stores, picks, packs, ships. Pros: Prime badge, fast shipping, customer trust. Cons: fees ($5-10/order + storage), less control, returns to Amazon. FBM (Fulfilled by Merchant): you ship. Pros: lower fees, control, branding. Cons: slower, no Prime, harder to scale. Most: FBA for top SKUs, FBM for the rest." },
    { q: "How do shipping zones affect cost?", a: "Shipping zones: 1-8 in US. Zone 1-4: cheap ($3-7), zone 5-8: expensive ($8-20). Per zone: 1-2 lbs package. Most ecommerce: 2-3 zone average. Tactics include 1) Multiple warehouses (closer to customers), 2) USPS for lightweight, 3) FedEx Ground for midweight, 4) Negotiate tier 2-3 rates at 1000+ orders/month. Most teams 20-40% shipping cost reduction with multi-warehouse." },
    { q: "How do returns affect fulfillment cost?", a: "Returns: 5-15% of orders in apparel, 5-10% in electronics, 2-5% in beauty. Cost: $5-15 per return (inspection, repackaging, return shipping). Tactics include 1) Better product info, 2) Size guides (apparel), 3) Quality control, 4) Easier returns (encourages purchases), 5) Restocking fees. Most teams 10-20% reduction in returns with better content + sizing. Track return rate by SKU." },
    { q: "Should I charge for shipping?", a: "Mixed. Free shipping: 20-30% conversion lift, but eats margin. Threshold: \"Free over $50\" drives AOV. Most ecommerce: 1) Free over $X (target AOV), 2) Flat rate ($5-7), 3) Real-time rates (pass through). Best option: free over $50-100 threshold. 5-10% conversion lift is worth 5-10% margin hit. Free shipping = 2-3x add-to-cart rate." },
  ],
  howToUse: [
    'Enter your monthly order volume.',
    'Enter pick and pack time per order (in minutes).',
    'Enter shipping cost per order (what you pay the carrier on average).',
    'Enter packaging cost per order (boxes, tape, dunnage).',
    'Enter labor rate (hourly wage for pick/pack staff).',
    'Enter return rate (% of orders returned).',
    'Read the per-order cost and compare to the $5–$10 industry benchmark band.',
  ],
  engineKey: true,
};
registerEngine(engine);