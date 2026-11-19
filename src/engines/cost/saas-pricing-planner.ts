import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-13：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

function planPricing(inputs: Record<string, string>): string[] {
  const productType = inputs.productType || 'SaaS';
  const targetCustomer = inputs.targetCustomer || 'b2b';
  const competitorPrice = clampNonNegative(parseFloat(inputs.competitorPrice) || 0);

  const basePrice = competitorPrice || 29;
  const targetMargin = 0.70;
  const assumedChurn = 0.03;

  const tiers = [
    { name: 'Starter', low: Math.max(5, Math.round(basePrice * 0.5)), mid: Math.max(9, Math.round(basePrice * 0.6)), high: Math.max(15, Math.round(basePrice * 0.7)), margin: 0.85, customers: 1000 },
    { name: 'Pro', low: Math.max(19, Math.round(basePrice * 1.0)), mid: Math.max(29, Math.round(basePrice * 1.3)), high: Math.max(49, Math.round(basePrice * 1.7)), margin: 0.75, customers: 400 },
    { name: 'Max', low: Math.max(49, Math.round(basePrice * 2.0)), mid: Math.max(79, Math.round(basePrice * 2.5)), high: Math.max(149, Math.round(basePrice * 4.0)), margin: 0.70, customers: 80 },
    { name: 'Enterprise', low: Math.max(199, Math.round(basePrice * 5)), mid: Math.max(499, Math.round(basePrice * 10)), high: Math.max(999, Math.round(basePrice * 20)), margin: 0.65, customers: 12 },
  ];

  const models = [
    {
      name: 'Flat-Rate',
      best: makeToken('calc_out.saas_pricing_planner.row.model_flat_rate_best', 'Simple tools with one clear use case. Best for early-stage products.'),
      low: Math.max(5, Math.round(basePrice * 0.7)),
      mid: basePrice,
      high: Math.round(basePrice * 1.5),
      tip: 'Keep it simple — one price, all features. Add a free trial to reduce friction.',
    },
    {
      name: 'Tiered',
      best: makeToken('calc_out.saas_pricing_planner.row.model_tiered_best', 'Products with power users who will pay more for advanced features.'),
      low: Math.max(9, Math.round(basePrice * 0.5)),
      mid: basePrice,
      high: Math.round(basePrice * 2.5),
      tip: '3 tiers work best: Starter → Pro → Enterprise. The middle tier should be the obvious choice (anchor pricing).',
    },
    {
      name: 'Usage-Based',
      best: makeToken('calc_out.saas_pricing_planner.row.model_usage_based_best', 'API products, AI tools, or any product where value scales with usage.'),
      low: Math.max(5, Math.round(basePrice * 0.4)),
      mid: Math.round(basePrice * 1.2),
      high: Math.round(basePrice * 3),
      tip: 'Charge per unit (API calls, seats, credits). Include a generous free tier to drive adoption.',
    },
    {
      name: 'Freemium',
      best: makeToken('calc_out.saas_pricing_planner.row.model_freemium_best', 'B2C products or tools that benefit from network effects and word-of-mouth.'),
      low: 0,
      mid: Math.round(basePrice * 0.8) || 12,
      high: Math.round(basePrice * 1.8),
      tip: 'Free plan must be genuinely useful but leave room for upgrade. 3-5% free-to-paid conversion is good.',
    },
  ];

  const audienceTips: Record<string, string> = {
    b2b: makeToken('calc_out.saas_pricing_planner.row.audience_b2b', 'B2B buyers expect per-seat pricing and annual contracts. They value ROI calculators and case studies.'),
    b2c: makeToken('calc_out.saas_pricing_planner.row.audience_b2c', 'B2C users prefer monthly subscriptions with easy cancellation. Focus on instant value and social proof.'),
    developers: makeToken('calc_out.saas_pricing_planner.row.audience_developers', 'Developers expect API-first pricing, generous free tiers, and transparent docs. They hate hidden fees.'),
    creators: makeToken('calc_out.saas_pricing_planner.row.audience_creators', 'Creators value revenue-share models or flat fees. Keep pricing predictable so they can forecast their margins.'),
  };

  const productTips: Record<string, string> = {
    SaaS: makeToken('calc_out.saas_pricing_planner.row.product_saas', 'SaaS benchmarks: 50-70% gross margins. Aim for LTV:CAC ratio of 3:1 or higher.'),
    ebook: makeToken('calc_out.saas_pricing_planner.row.product_ebook', 'Ebooks typically sell for $9-$49. Bundle with templates/checklists to increase perceived value.'),
    course: makeToken('calc_out.saas_pricing_planner.row.product_course', 'Online courses range $49-$999. Price based on transformation value, not content length. Cohorts justify premium pricing.'),
    template: makeToken('calc_out.saas_pricing_planner.row.product_template', 'Templates sell for $5-$49. Bundle them into packs to raise AOV. Notion/Gumroad are popular distribution channels.'),
    newsletter: makeToken('calc_out.saas_pricing_planner.row.product_newsletter', 'Newsletters convert 5-15% of free readers to paid. Typical paid tiers: $5-$15/mo or $50-$150/yr.'),
  };

  let primaryRec = 0;
  if (targetCustomer === 'developers') primaryRec = 2;
  else if (targetCustomer === 'b2b') primaryRec = 1;
  else if (productType === 'newsletter') primaryRec = 0;

  const tierOutput = tiers.map((t) => {
    const monthlyMrr = t.mid * t.customers;
    const costPerCustomer = t.mid * (1 - t.margin);
    const ltv = (t.mid - costPerCustomer) / assumedChurn;
    const breakEvenCustomers = Math.ceil(2000 / t.margin / t.mid);
    return { ...t, monthlyMrr, costPerCustomer, ltv, breakEvenCustomers };
  });

  const totalMrr = tierOutput.reduce((s, t) => s + t.monthlyMrr, 0);
  const totalCustomers = tierOutput.reduce((s, t) => s + t.customers, 0);
  const arpu = totalCustomers > 0 ? totalMrr / totalCustomers : 0;
  const weightedMargin = totalMrr > 0
    ? tierOutput.reduce((s, t) => s + t.margin * t.monthlyMrr, 0) / totalMrr
    : 0;

  const results: string[] = [];

  const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
  const pct = (n: number) => n.toFixed(1) + '%';

  let mainResult =
    '🎯 SaaS Pricing Planner\n\n' +
    makeToken('calc_out.saas_pricing_planner.row.product', '📦 Product: ' + productType, { product: productType }) +
    '  |  ' +
    makeToken('calc_out.saas_pricing_planner.row.target', '👤 Target: ' + targetCustomer, { target: targetCustomer }) +
    '  |  ' +
    makeToken('calc_out.saas_pricing_planner.row.competitor', '💰 Competitor: ' + (competitorPrice ? '$' + competitorPrice + '/mo' : 'N/A'), { price: (competitorPrice ? '$' + competitorPrice + '/mo' : 'N/A') }) + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💰 Tier Snapshot:\n' +
    makeToken('calc_out.saas_pricing_planner.row.tier_starter', '• Starter:      ' + fmt(tiers[0].mid) + '/mo  × ' + tiers[0].customers + ' customers = ' + fmt(tierOutput[0].monthlyMrr) + ' MRR', { price: fmt(tiers[0].mid), customers: String(tiers[0].customers), mrr: fmt(tierOutput[0].monthlyMrr) }) + '\n' +
    makeToken('calc_out.saas_pricing_planner.row.tier_pro', '• Pro:            ' + fmt(tiers[1].mid) + '/mo  × ' + tiers[1].customers + ' customers = ' + fmt(tierOutput[1].monthlyMrr) + ' MRR', { price: fmt(tiers[1].mid), customers: String(tiers[1].customers), mrr: fmt(tierOutput[1].monthlyMrr) }) + '\n' +
    makeToken('calc_out.saas_pricing_planner.row.tier_max', '• Max:            ' + fmt(tiers[2].mid) + '/mo  × ' + tiers[2].customers + ' customers = ' + fmt(tierOutput[2].monthlyMrr) + ' MRR', { price: fmt(tiers[2].mid), customers: String(tiers[2].customers), mrr: fmt(tierOutput[2].monthlyMrr) }) + '\n' +
    makeToken('calc_out.saas_pricing_planner.row.tier_enterprise', '• Enterprise: ' + fmt(tiers[3].mid) + '/mo  × ' + tiers[3].customers + ' customers = ' + fmt(tierOutput[3].monthlyMrr) + ' MRR', { price: fmt(tiers[3].mid), customers: String(tiers[3].customers), mrr: fmt(tierOutput[3].monthlyMrr) }) + '\n' +
    makeToken('calc_out.saas_pricing_planner.row.total_mrr', '• Total MRR:                  ' + fmt(totalMrr), { mrr: fmt(totalMrr) }) + '\n' +
    makeToken('calc_out.saas_pricing_planner.row.total_customers', '• Total Customers:       ' + totalCustomers.toLocaleString(), { customers: totalCustomers.toLocaleString() }) + '\n' +
    makeToken('calc_out.saas_pricing_planner.row.arpu', '• ARPU:                            ' + fmt(arpu) + '/mo', { arpu: fmt(arpu) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Key Metrics:\n' +
    makeToken('calc_out.saas_pricing_planner.row.weighted_gross_margin', '• Weighted Gross Margin:    ' + pct(weightedMargin * 100) + '  (blended across tiers)', { margin: pct(weightedMargin * 100) }) + '\n' +
    makeToken('calc_out.saas_pricing_planner.row.target_margin', '• Target Margin:                    ' + pct(targetMargin * 100) + '  (industry benchmark: 70-80%)', { margin: pct(targetMargin * 100) }) + '\n' +
    makeToken('calc_out.saas_pricing_planner.row.arpu_by_tier', '• ARPU by Tier:                     $' + tiers[0].mid + ' / $' + tiers[1].mid + ' / $' + tiers[2].mid + ' / $' + tiers[3].mid, { t0: String(tiers[0].mid), t1: String(tiers[1].mid), t2: String(tiers[2].mid), t3: String(tiers[3].mid) }) + '\n' +
    makeToken('calc_out.saas_pricing_planner.row.margin_by_tier', '• Margin by Tier:                ' + pct(tiers[0].margin * 100) + ' / ' + pct(tiers[1].margin * 100) + ' / ' + pct(tiers[2].margin * 100) + ' / ' + pct(tiers[3].margin * 100), { m0: pct(tiers[0].margin * 100), m1: pct(tiers[1].margin * 100), m2: pct(tiers[2].margin * 100), m3: pct(tiers[3].margin * 100) }) + '\n' +
    makeToken('calc_out.saas_pricing_planner.row.enterprise_mrr_pct', '• Enterprise % of MRR:        ' + pct((tierOutput[3].monthlyMrr / Math.max(totalMrr, 1)) * 100) + '  (high = strong moat)', { pct: pct((tierOutput[3].monthlyMrr / Math.max(totalMrr, 1)) * 100) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Pricing Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  const unhealthyTiers = tiers.filter((t) => t.margin < 0.5);
  if (unhealthyTiers.length === 0) {
    mainResult += makeToken('calc_out.saas_pricing_planner.row.health_all_healthy', '• 🟢 All tiers above 50% margin — healthy pricing structure.') + '\n';
  } else {
    mainResult += '• 🔴 ' + unhealthyTiers.length + ' tier(s) below 50% margin: ' + unhealthyTiers.map((t) => t.name).join(', ') + ' — review feature costs.\n';
  }
  if (tierOutput[3].monthlyMrr / totalMrr > 0.25) {
    mainResult += makeToken('calc_out.saas_pricing_planner.row.health_enterprise_strong', '• 🟢 Enterprise = ' + pct((tierOutput[3].monthlyMrr / totalMrr) * 100) + ' of MRR — strong enterprise traction.', { pct: pct((tierOutput[3].monthlyMrr / totalMrr) * 100) }) + '\n';
  } else if (tierOutput[3].monthlyMrr / totalMrr > 0.10) {
    mainResult += makeToken('calc_out.saas_pricing_planner.row.health_enterprise_healthy', '• 🟡 Enterprise = ' + pct((tierOutput[3].monthlyMrr / totalMrr) * 100) + ' of MRR — healthy mix.', { pct: pct((tierOutput[3].monthlyMrr / totalMrr) * 100) }) + '\n';
  } else {
    mainResult += makeToken('calc_out.saas_pricing_planner.row.health_enterprise_expand', '• 🟠 Enterprise = only ' + pct((tierOutput[3].monthlyMrr / Math.max(totalMrr, 1)) * 100) + ' of MRR — opportunity to expand upmarket.', { pct: pct((tierOutput[3].monthlyMrr / Math.max(totalMrr, 1)) * 100) }) + '\n';
  }
  if (weightedMargin >= targetMargin) {
    mainResult += makeToken('calc_out.saas_pricing_planner.row.health_blended_hits', '• 🟢 Blended margin (' + pct(weightedMargin * 100) + ') hits target.', { margin: pct(weightedMargin * 100) }) + '\n';
  } else {
    mainResult += makeToken('calc_out.saas_pricing_planner.row.health_blended_below', '• 🟡 Blended margin (' + pct(weightedMargin * 100) + ') below target — raise prices or cut costs.', { margin: pct(weightedMargin * 100) }) + '\n';
  }
  if (competitorPrice > 0 && tiers[1].mid < competitorPrice * 0.7) {
    mainResult += '• 🟢 Pro tier well below competitor — could raise 20-30% without losing deals.\n';
  } else if (competitorPrice > 0 && tiers[1].mid > competitorPrice * 1.3) {
    mainResult += makeToken('calc_out.saas_pricing_planner.row.health_pro_above_competitor', '• 🟠 Pro tier 30%+ above competitor — risk of price objection.') + '\n';
  }

  mainResult += '\n🎯 LTV by Tier:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.saas_pricing_planner.row.ltv_starter', '• Starter:           $' + Math.round(tierOutput[0].ltv).toLocaleString() + '  (' + pct(tiers[0].margin * 100) + ' margin, ' + pct(assumedChurn * 100) + ' monthly churn)', { ltv: '$' + Math.round(tierOutput[0].ltv).toLocaleString(), margin: pct(tiers[0].margin * 100), churn: pct(assumedChurn * 100) }) + '\n' +
    makeToken('calc_out.saas_pricing_planner.row.ltv_pro', '• Pro:                  $' + Math.round(tierOutput[1].ltv).toLocaleString() + '  (' + pct(tiers[1].margin * 100) + ' margin)', { ltv: '$' + Math.round(tierOutput[1].ltv).toLocaleString(), margin: pct(tiers[1].margin * 100) }) + '\n' +
    makeToken('calc_out.saas_pricing_planner.row.ltv_max', '• Max:                  $' + Math.round(tierOutput[2].ltv).toLocaleString() + '  (' + pct(tiers[2].margin * 100) + ' margin)', { ltv: '$' + Math.round(tierOutput[2].ltv).toLocaleString(), margin: pct(tiers[2].margin * 100) }) + '\n' +
    makeToken('calc_out.saas_pricing_planner.row.ltv_enterprise', '• Enterprise:    $' + Math.round(tierOutput[3].ltv).toLocaleString() + '  (' + pct(tiers[3].margin * 100) + ' margin)', { ltv: '$' + Math.round(tierOutput[3].ltv).toLocaleString(), margin: pct(tiers[3].margin * 100) }) + '\n' +
    makeToken('calc_out.saas_pricing_planner.row.average_ltv', '• Average LTV:      $' + Math.round(tierOutput.reduce((s, t) => s + t.ltv * t.customers, 0) / Math.max(totalCustomers, 1)).toLocaleString(), { ltv: '$' + Math.round(tierOutput.reduce((s, t) => s + t.ltv * t.customers, 0) / Math.max(totalCustomers, 1)).toLocaleString() }) + '\n' +
    makeToken('calc_out.saas_pricing_planner.row.ltv_formula', '• LTV Formula:      (Price × Margin) / Monthly Churn') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even Customers per Tier:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.saas_pricing_planner.row.breakeven_starter', '• Starter:           ~' + tierOutput[0].breakEvenCustomers + ' customers  to break even on $2K/mo costs', { count: String(tierOutput[0].breakEvenCustomers) }) + '\n' +
    makeToken('calc_out.saas_pricing_planner.row.breakeven_pro', '• Pro:                  ~' + tierOutput[1].breakEvenCustomers + ' customers  to break even on $2K/mo costs', { count: String(tierOutput[1].breakEvenCustomers) }) + '\n' +
    makeToken('calc_out.saas_pricing_planner.row.breakeven_max', '• Max:                  ~' + tierOutput[2].breakEvenCustomers + ' customers  to break even on $2K/mo costs', { count: String(tierOutput[2].breakEvenCustomers) }) + '\n' +
    makeToken('calc_out.saas_pricing_planner.row.breakeven_enterprise', '• Enterprise:    ~' + tierOutput[3].breakEvenCustomers + ' customers  to break even on $2K/mo costs', { count: String(tierOutput[3].breakEvenCustomers) }) + '\n' +
    makeToken('calc_out.saas_pricing_planner.row.breakeven_assumption', '• (Assumes $2K/mo fixed costs per tier — adjust based on actual overhead)') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.saas_pricing_planner.row.whatif_raise_all_20', '• Raise all tiers 20%:   Pro becomes $' + Math.round(tiers[1].mid * 1.2) + '/mo, MRR → ' + fmt(totalMrr * 1.2) + '  (test willingness to pay)', { price: '$' + Math.round(tiers[1].mid * 1.2), mrr: fmt(totalMrr * 1.2) }) + '\n' +
    makeToken('calc_out.saas_pricing_planner.row.whatif_cut_starter_50', '• Cut Starter by 50%:    Convert funnel to Pro — gain $' + Math.round(tiers[1].mid * 0.3 * tiers[0].customers) + '/mo', { gain: '$' + Math.round(tiers[1].mid * 0.3 * tiers[0].customers) }) + '\n' +
    makeToken('calc_out.saas_pricing_planner.row.whatif_annual_discount', '• Add annual discount (15% off):   $' + Math.round(tiers[1].mid * 12 * 0.85) + '/yr  vs $' + (tiers[1].mid * 12) + '/yr monthly', { annual: '$' + Math.round(tiers[1].mid * 12 * 0.85), monthly: '$' + (tiers[1].mid * 12) }) + '\n' +
    makeToken('calc_out.saas_pricing_planner.row.whatif_move_to_max', '• Move 10% of Pro users to Max:   +$' + Math.round((tiers[2].mid - tiers[1].mid) * tiers[1].customers * 0.1).toLocaleString() + '/mo MRR', { gain: '$' + Math.round((tiers[2].mid - tiers[1].mid) * tiers[1].customers * 0.1).toLocaleString() }) + '\n' +
    makeToken('calc_out.saas_pricing_planner.row.whatif_drop_tier', '• Drop lowest-margin tier (' + (unhealthyTiers[0]?.name || 'none') + '):   refocus on profitable tiers', { tier: (unhealthyTiers[0]?.name || 'none') }) + '\n\n' +
    '💡 Tip: ' + models[primaryRec].tip + '\n\n' +
    makeToken('calc_out.saas_pricing_planner.row.recommended_action', '📌 Recommended Action: Launch with Tiered model, Pro at $' + tiers[1].mid + '/mo as the anchor. Use Starter as a low-friction entry point and Max/Enterprise to capture expansion revenue.', { price: String(tiers[1].mid) });

  results.push(mainResult);

  for (let i = 0; i < models.length; i++) {
    const m = models[i];
    const icon = i === primaryRec ? '⭐' : '•';
    results.push(
      icon + ' ' + makeToken('calc_out.saas_pricing_planner.row.model_line', m.name + ': $' + m.low + ' – $' + m.mid + ' – $' + m.high + '/mo', { name: m.name, low: '$' + m.low, mid: '$' + m.mid, high: '$' + m.high }) + '\n' +
      '  ' + m.best,
    );
  }

  results.push(
    '🎯 Audience Insight:\n' + (audienceTips[targetCustomer] || audienceTips.b2b) +
    '\n\n📦 Product Insight:\n' + (productTips[productType] || productTips.SaaS) +
    '\n\n' + makeToken('calc_out.saas_pricing_planner.row.next_step', '🚀 Next step: Pick one model, launch at the Pro tier ($' + tiers[1].mid + '/mo), and adjust pricing after collecting 100+ conversion data points.', { price: String(tiers[1].mid) }),
  );

  return results;
}

const customFn =
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let S=function(p){return Number.isNaN(p)?0:Math.max(0,p)},$=function(p){const d=p.productType||"SaaS",_=p.targetCustomer||"b2b",l=S(parseFloat(p.competitorPrice)||0),i=l||29,b=.7,v=.03,r=[{name:"Starter",low:Math.max(5,Math.round(i*.5)),mid:Math.max(9,Math.round(i*.6)),high:Math.max(15,Math.round(i*.7)),margin:.85,customers:1e3},{name:"Pro",low:Math.max(19,Math.round(i*1)),mid:Math.max(29,Math.round(i*1.3)),high:Math.max(49,Math.round(i*1.7)),margin:.75,customers:400},{name:"Max",low:Math.max(49,Math.round(i*2)),mid:Math.max(79,Math.round(i*2.5)),high:Math.max(149,Math.round(i*4)),margin:.7,customers:80},{name:"Enterprise",low:Math.max(199,Math.round(i*5)),mid:Math.max(499,Math.round(i*10)),high:Math.max(999,Math.round(i*20)),margin:.65,customers:12}],y=[{name:"Flat-Rate",best:t("calc_out.saas_pricing_planner.row.model_flat_rate_best","Simple tools with one clear use case. Best for early-stage products."),low:Math.max(5,Math.round(i*.7)),mid:i,high:Math.round(i*1.5),tip:"Keep it simple — one price, all features. Add a free trial to reduce friction."},{name:"Tiered",best:t("calc_out.saas_pricing_planner.row.model_tiered_best","Products with power users who will pay more for advanced features."),low:Math.max(9,Math.round(i*.5)),mid:i,high:Math.round(i*2.5),tip:"3 tiers work best: Starter → Pro → Enterprise. The middle tier should be the obvious choice (anchor pricing)."},{name:"Usage-Based",best:t("calc_out.saas_pricing_planner.row.model_usage_based_best","API products, AI tools, or any product where value scales with usage."),low:Math.max(5,Math.round(i*.4)),mid:Math.round(i*1.2),high:Math.round(i*3),tip:"Charge per unit (API calls, seats, credits). Include a generous free tier to drive adoption."},{name:"Freemium",best:t("calc_out.saas_pricing_planner.row.model_freemium_best","B2C products or tools that benefit from network effects and word-of-mouth."),low:0,mid:Math.round(i*.8)||12,high:Math.round(i*1.8),tip:"Free plan must be genuinely useful but leave room for upgrade. 3-5% free-to-paid conversion is good."}],P={b2b:t("calc_out.saas_pricing_planner.row.audience_b2b","B2B buyers expect per-seat pricing and annual contracts. They value ROI calculators and case studies."),b2c:t("calc_out.saas_pricing_planner.row.audience_b2c","B2C users prefer monthly subscriptions with easy cancellation. Focus on instant value and social proof."),developers:t("calc_out.saas_pricing_planner.row.audience_developers","Developers expect API-first pricing, generous free tiers, and transparent docs. They hate hidden fees."),creators:t("calc_out.saas_pricing_planner.row.audience_creators","Creators value revenue-share models or flat fees. Keep pricing predictable so they can forecast their margins.")},R={SaaS:t("calc_out.saas_pricing_planner.row.product_saas","SaaS benchmarks: 50-70% gross margins. Aim for LTV:CAC ratio of 3:1 or higher."),ebook:t("calc_out.saas_pricing_planner.row.product_ebook","Ebooks typically sell for $9-$49. Bundle with templates/checklists to increase perceived value."),course:t("calc_out.saas_pricing_planner.row.product_course","Online courses range $49-$999. Price based on transformation value, not content length. Cohorts justify premium pricing."),template:t("calc_out.saas_pricing_planner.row.product_template","Templates sell for $5-$49. Bundle them into packs to raise AOV. Notion/Gumroad are popular distribution channels."),newsletter:t("calc_out.saas_pricing_planner.row.product_newsletter","Newsletters convert 5-15% of free readers to paid. Typical paid tiers: $5-$15/mo or $50-$150/yr.")};let h=0;_==="developers"?h=2:_==="b2b"?h=1:d==="newsletter"&&(h=0);const n=r.map(e=>{const o=e.mid*e.customers,f=e.mid*(1-e.margin),L=(e.mid-f)/v,F=Math.ceil(2e3/e.margin/e.mid);return{...e,monthlyMrr:o,costPerCustomer:f,ltv:L,breakEvenCustomers:F}}),c=n.reduce((e,o)=>e+o.monthlyMrr,0),g=n.reduce((e,o)=>e+o.customers,0),C=g>0?c/g:0,m=c>0?n.reduce((e,o)=>e+o.margin*o.monthlyMrr,0)/c:0,w=[],s=e=>"$"+Math.round(e).toLocaleString(),a=e=>e.toFixed(1)+"%";let u=\`🎯 SaaS Pricing Planner

\`+t("calc_out.saas_pricing_planner.row.product","📦 Product: "+d,{product:d})+"  |  "+t("calc_out.saas_pricing_planner.row.target","👤 Target: "+_,{target:_})+"  |  "+t("calc_out.saas_pricing_planner.row.competitor","💰 Competitor: "+(l?"$"+l+"/mo":"N/A"),{price:l?"$"+l+"/mo":"N/A"})+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 Tier Snapshot:
\`+t("calc_out.saas_pricing_planner.row.tier_starter","• Starter:      "+s(r[0].mid)+"/mo  × "+r[0].customers+" customers = "+s(n[0].monthlyMrr)+" MRR",{price:s(r[0].mid),customers:String(r[0].customers),mrr:s(n[0].monthlyMrr)})+\`
\`+t("calc_out.saas_pricing_planner.row.tier_pro","• Pro:            "+s(r[1].mid)+"/mo  × "+r[1].customers+" customers = "+s(n[1].monthlyMrr)+" MRR",{price:s(r[1].mid),customers:String(r[1].customers),mrr:s(n[1].monthlyMrr)})+\`
\`+t("calc_out.saas_pricing_planner.row.tier_max","• Max:            "+s(r[2].mid)+"/mo  × "+r[2].customers+" customers = "+s(n[2].monthlyMrr)+" MRR",{price:s(r[2].mid),customers:String(r[2].customers),mrr:s(n[2].monthlyMrr)})+\`
\`+t("calc_out.saas_pricing_planner.row.tier_enterprise","• Enterprise: "+s(r[3].mid)+"/mo  × "+r[3].customers+" customers = "+s(n[3].monthlyMrr)+" MRR",{price:s(r[3].mid),customers:String(r[3].customers),mrr:s(n[3].monthlyMrr)})+\`
\`+t("calc_out.saas_pricing_planner.row.total_mrr","• Total MRR:                  "+s(c),{mrr:s(c)})+\`
\`+t("calc_out.saas_pricing_planner.row.total_customers","• Total Customers:       "+g.toLocaleString(),{customers:g.toLocaleString()})+\`
\`+t("calc_out.saas_pricing_planner.row.arpu","• ARPU:                            "+s(C)+"/mo",{arpu:s(C)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📐 Key Metrics:
\`+t("calc_out.saas_pricing_planner.row.weighted_gross_margin","• Weighted Gross Margin:    "+a(m*100)+"  (blended across tiers)",{margin:a(m*100)})+\`
\`+t("calc_out.saas_pricing_planner.row.target_margin","• Target Margin:                    "+a(b*100)+"  (industry benchmark: 70-80%)",{margin:a(b*100)})+\`
\`+t("calc_out.saas_pricing_planner.row.arpu_by_tier","• ARPU by Tier:                     $"+r[0].mid+" / $"+r[1].mid+" / $"+r[2].mid+" / $"+r[3].mid,{t0:String(r[0].mid),t1:String(r[1].mid),t2:String(r[2].mid),t3:String(r[3].mid)})+\`
\`+t("calc_out.saas_pricing_planner.row.margin_by_tier","• Margin by Tier:                "+a(r[0].margin*100)+" / "+a(r[1].margin*100)+" / "+a(r[2].margin*100)+" / "+a(r[3].margin*100),{m0:a(r[0].margin*100),m1:a(r[1].margin*100),m2:a(r[2].margin*100),m3:a(r[3].margin*100)})+\`
\`+t("calc_out.saas_pricing_planner.row.enterprise_mrr_pct","• Enterprise % of MRR:        "+a(n[3].monthlyMrr/Math.max(c,1)*100)+"  (high = strong moat)",{pct:a(n[3].monthlyMrr/Math.max(c,1)*100)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🩺 Pricing Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`;const M=r.filter(e=>e.margin<.5);M.length===0?u+=t("calc_out.saas_pricing_planner.row.health_all_healthy","• 🟢 All tiers above 50% margin — healthy pricing structure.")+\`
\`:u+="• 🔴 "+M.length+" tier(s) below 50% margin: "+M.map(e=>e.name).join(", ")+\` — review feature costs.
\`,n[3].monthlyMrr/c>.25?u+=t("calc_out.saas_pricing_planner.row.health_enterprise_strong","• 🟢 Enterprise = "+a(n[3].monthlyMrr/c*100)+" of MRR — strong enterprise traction.",{pct:a(n[3].monthlyMrr/c*100)})+\`
\`:n[3].monthlyMrr/c>.1?u+=t("calc_out.saas_pricing_planner.row.health_enterprise_healthy","• 🟡 Enterprise = "+a(n[3].monthlyMrr/c*100)+" of MRR — healthy mix.",{pct:a(n[3].monthlyMrr/c*100)})+\`
\`:u+=t("calc_out.saas_pricing_planner.row.health_enterprise_expand","• 🟠 Enterprise = only "+a(n[3].monthlyMrr/Math.max(c,1)*100)+" of MRR — opportunity to expand upmarket.",{pct:a(n[3].monthlyMrr/Math.max(c,1)*100)})+\`
\`,m>=b?u+=t("calc_out.saas_pricing_planner.row.health_blended_hits","• 🟢 Blended margin ("+a(m*100)+") hits target.",{margin:a(m*100)})+\`
\`:u+=t("calc_out.saas_pricing_planner.row.health_blended_below","• 🟡 Blended margin ("+a(m*100)+") below target — raise prices or cut costs.",{margin:a(m*100)})+\`
\`,l>0&&r[1].mid<l*.7?u+=\`• 🟢 Pro tier well below competitor — could raise 20-30% without losing deals.
\`:l>0&&r[1].mid>l*1.3&&(u+=t("calc_out.saas_pricing_planner.row.health_pro_above_competitor","• 🟠 Pro tier 30%+ above competitor — risk of price objection.")+\`
\`),u+=\`
🎯 LTV by Tier:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.saas_pricing_planner.row.ltv_starter","• Starter:           $"+Math.round(n[0].ltv).toLocaleString()+"  ("+a(r[0].margin*100)+" margin, "+a(v*100)+" monthly churn)",{ltv:"$"+Math.round(n[0].ltv).toLocaleString(),margin:a(r[0].margin*100),churn:a(v*100)})+\`
\`+t("calc_out.saas_pricing_planner.row.ltv_pro","• Pro:                  $"+Math.round(n[1].ltv).toLocaleString()+"  ("+a(r[1].margin*100)+" margin)",{ltv:"$"+Math.round(n[1].ltv).toLocaleString(),margin:a(r[1].margin*100)})+\`
\`+t("calc_out.saas_pricing_planner.row.ltv_max","• Max:                  $"+Math.round(n[2].ltv).toLocaleString()+"  ("+a(r[2].margin*100)+" margin)",{ltv:"$"+Math.round(n[2].ltv).toLocaleString(),margin:a(r[2].margin*100)})+\`
\`+t("calc_out.saas_pricing_planner.row.ltv_enterprise","• Enterprise:    $"+Math.round(n[3].ltv).toLocaleString()+"  ("+a(r[3].margin*100)+" margin)",{ltv:"$"+Math.round(n[3].ltv).toLocaleString(),margin:a(r[3].margin*100)})+\`
\`+t("calc_out.saas_pricing_planner.row.average_ltv","• Average LTV:      $"+Math.round(n.reduce((e,o)=>e+o.ltv*o.customers,0)/Math.max(g,1)).toLocaleString(),{ltv:"$"+Math.round(n.reduce((e,o)=>e+o.ltv*o.customers,0)/Math.max(g,1)).toLocaleString()})+\`
\`+t("calc_out.saas_pricing_planner.row.ltv_formula","• LTV Formula:      (Price × Margin) / Monthly Churn")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ Break-Even Customers per Tier:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.saas_pricing_planner.row.breakeven_starter","• Starter:           ~"+n[0].breakEvenCustomers+" customers  to break even on $2K/mo costs",{count:String(n[0].breakEvenCustomers)})+\`
\`+t("calc_out.saas_pricing_planner.row.breakeven_pro","• Pro:                  ~"+n[1].breakEvenCustomers+" customers  to break even on $2K/mo costs",{count:String(n[1].breakEvenCustomers)})+\`
\`+t("calc_out.saas_pricing_planner.row.breakeven_max","• Max:                  ~"+n[2].breakEvenCustomers+" customers  to break even on $2K/mo costs",{count:String(n[2].breakEvenCustomers)})+\`
\`+t("calc_out.saas_pricing_planner.row.breakeven_enterprise","• Enterprise:    ~"+n[3].breakEvenCustomers+" customers  to break even on $2K/mo costs",{count:String(n[3].breakEvenCustomers)})+\`
\`+t("calc_out.saas_pricing_planner.row.breakeven_assumption","• (Assumes $2K/mo fixed costs per tier — adjust based on actual overhead)")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 What-If Scenarios:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.saas_pricing_planner.row.whatif_raise_all_20","• Raise all tiers 20%:   Pro becomes $"+Math.round(r[1].mid*1.2)+"/mo, MRR → "+s(c*1.2)+"  (test willingness to pay)",{price:"$"+Math.round(r[1].mid*1.2),mrr:s(c*1.2)})+\`
\`+t("calc_out.saas_pricing_planner.row.whatif_cut_starter_50","• Cut Starter by 50%:    Convert funnel to Pro — gain $"+Math.round(r[1].mid*.3*r[0].customers)+"/mo",{gain:"$"+Math.round(r[1].mid*.3*r[0].customers)})+\`
\`+t("calc_out.saas_pricing_planner.row.whatif_annual_discount","• Add annual discount (15% off):   $"+Math.round(r[1].mid*12*.85)+"/yr  vs $"+r[1].mid*12+"/yr monthly",{annual:"$"+Math.round(r[1].mid*12*.85),monthly:"$"+r[1].mid*12})+\`
\`+t("calc_out.saas_pricing_planner.row.whatif_move_to_max","• Move 10% of Pro users to Max:   +$"+Math.round((r[2].mid-r[1].mid)*r[1].customers*.1).toLocaleString()+"/mo MRR",{gain:"$"+Math.round((r[2].mid-r[1].mid)*r[1].customers*.1).toLocaleString()})+\`
\`+t("calc_out.saas_pricing_planner.row.whatif_drop_tier","• Drop lowest-margin tier ("+(M[0]?.name||"none")+"):   refocus on profitable tiers",{tier:M[0]?.name||"none"})+\`

💡 Tip: \`+y[h].tip+\`

\`+t("calc_out.saas_pricing_planner.row.recommended_action","📌 Recommended Action: Launch with Tiered model, Pro at $"+r[1].mid+"/mo as the anchor. Use Starter as a low-friction entry point and Max/Enterprise to capture expansion revenue.",{price:String(r[1].mid)}),w.push(u);for(let e=0;e<y.length;e++){const o=y[e],f=e===h?"⭐":"•";w.push(f+" "+t("calc_out.saas_pricing_planner.row.model_line",o.name+": $"+o.low+" – $"+o.mid+" – $"+o.high+"/mo",{name:o.name,low:"$"+o.low,mid:"$"+o.mid,high:"$"+o.high})+\`
  \`+o.best)}return w.push(\`🎯 Audience Insight:
\`+(P[_]||P.b2b)+\`

📦 Product Insight:
\`+(R[d]||R.SaaS)+\`

\`+t("calc_out.saas_pricing_planner.row.next_step","🚀 Next step: Pick one model, launch at the Pro tier ($"+r[1].mid+"/mo), and adjust pricing after collecting 100+ conversion data points.",{price:String(r[1].mid)})),w},x=function(p,d,_){var l=A(p);return Array.isArray(l)?l.join(\`
\`):String(l)};var B=S,j=$,N=x,t=tk,E='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',t=new Function("return "+E)(),A=function(p){return $(p)};return[x(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

const engine: ToolEngine = {
  slug: 'solopreneur-saas-pricing-planner',
  title: 'SaaS Pricing Planner',
  description: 'Plan your SaaS pricing tiers with margin analysis, LTV by tier, break-even customers, and pricing health diagnostics.',
  inputs: [
    { name: 'productType', label: 'Product Type', placeholder: '', type: 'select', options: ['SaaS', 'ebook', 'course', 'template', 'newsletter'] },
    { name: 'targetCustomer', label: 'Target Customer', placeholder: '', type: 'select', options: ['b2b', 'b2c', 'developers', 'creators'] },
    { name: 'competitorPrice', label: 'Competitor Average Price ($)', placeholder: 'e.g. 29', type: 'number' },
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
    return planPricing(inputs);
  },
  staticExamples: [
    '🎯 SaaS Pricing Planner\n\n$calc_out.saas_pricing_planner.row.product{"product":"SaaS"}|📦 Product: SaaS|  |  $calc_out.saas_pricing_planner.row.target{"target":"b2b"}|👤 Target: b2b|  |  $calc_out.saas_pricing_planner.row.competitor{"price":"$29/mo"}|💰 Competitor: $29/mo|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💰 Tier Snapshot:\n$calc_out.saas_pricing_planner.row.tier_starter{"price":"$17","customers":"1000","mrr":"$17,000"}|• Starter:      $17/mo  × 1000 customers = $17,000 MRR|\n$calc_out.saas_pricing_planner.row.tier_pro{"price":"$38","customers":"400","mrr":"$15,200"}|• Pro:            $38/mo  × 400 customers = $15,200 MRR|\n$calc_out.saas_pricing_planner.row.tier_max{"price":"$79","customers":"80","mrr":"$6,320"}|• Max:            $79/mo  × 80 customers = $6,320 MRR|\n$calc_out.saas_pricing_planner.row.tier_enterprise{"price":"$499","customers":"12","mrr":"$5,988"}|• Enterprise: $499/mo  × 12 customers = $5,988 MRR|\n$calc_out.saas_pricing_planner.row.total_mrr{"mrr":"$44,508"}|• Total MRR:                  $44,508|\n$calc_out.saas_pricing_planner.row.total_customers{"customers":"1,492"}|• Total Customers:       1,492|\n$calc_out.saas_pricing_planner.row.arpu{"arpu":"$30"}|• ARPU:                            $30/mo|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Key Metrics:\n$calc_out.saas_pricing_planner.row.weighted_gross_margin{"margin":"76.8%"}|• Weighted Gross Margin:    76.8%  (blended across tiers)|\n$calc_out.saas_pricing_planner.row.target_margin{"margin":"70.0%"}|• Target Margin:                    70.0%  (industry benchmark: 70-80%)|\n$calc_out.saas_pricing_planner.row.arpu_by_tier{"t0":"17","t1":"38","t2":"79","t3":"499"}|• ARPU by Tier:                     $17 / $38 / $79 / $499|\n$calc_out.saas_pricing_planner.row.margin_by_tier{"m0":"85.0%","m1":"75.0%","m2":"70.0%","m3":"65.0%"}|• Margin by Tier:                85.0% / 75.0% / 70.0% / 65.0%|\n$calc_out.saas_pricing_planner.row.enterprise_mrr_pct{"pct":"13.5%"}|• Enterprise % of MRR:        13.5%  (high = strong moat)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Pricing Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.saas_pricing_planner.row.health_all_healthy|• 🟢 All tiers above 50% margin — healthy pricing structure.|\n$calc_out.saas_pricing_planner.row.health_enterprise_healthy{"pct":"13.5%"}|• 🟡 Enterprise = 13.5% of MRR — healthy mix.|\n$calc_out.saas_pricing_planner.row.health_blended_hits{"margin":"76.8%"}|• 🟢 Blended margin (76.8%) hits target.|\n$calc_out.saas_pricing_planner.row.health_pro_above_competitor|• 🟠 Pro tier 30%+ above competitor — risk of price objection.|\n\n🎯 LTV by Tier:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.saas_pricing_planner.row.ltv_starter{"ltv":"$482","margin":"85.0%","churn":"3.0%"}|• Starter:           $482  (85.0% margin, 3.0% monthly churn)|\n$calc_out.saas_pricing_planner.row.ltv_pro{"ltv":"$950","margin":"75.0%"}|• Pro:                  $950  (75.0% margin)|\n$calc_out.saas_pricing_planner.row.ltv_max{"ltv":"$1,843","margin":"70.0%"}|• Max:                  $1,843  (70.0% margin)|\n$calc_out.saas_pricing_planner.row.ltv_enterprise{"ltv":"$10,812","margin":"65.0%"}|• Enterprise:    $10,812  (65.0% margin)|\n$calc_out.saas_pricing_planner.row.average_ltv{"ltv":"$763"}|• Average LTV:      $763|\n$calc_out.saas_pricing_planner.row.ltv_formula|• LTV Formula:      (Price × Margin) / Monthly Churn|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even Customers per Tier:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.saas_pricing_planner.row.breakeven_starter{"count":"139"}|• Starter:           ~139 customers  to break even on $2K/mo costs|\n$calc_out.saas_pricing_planner.row.breakeven_pro{"count":"71"}|• Pro:                  ~71 customers  to break even on $2K/mo costs|\n$calc_out.saas_pricing_planner.row.breakeven_max{"count":"37"}|• Max:                  ~37 customers  to break even on $2K/mo costs|\n$calc_out.saas_pricing_planner.row.breakeven_enterprise{"count":"7"}|• Enterprise:    ~7 customers  to break even on $2K/mo costs|\n$calc_out.saas_pricing_planner.row.breakeven_assumption|• (Assumes $2K/mo fixed costs per tier — adjust based on actual overhead)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.saas_pricing_planner.row.whatif_raise_all_20{"price":"$46","mrr":"$53,410"}|• Raise all tiers 20%:   Pro becomes $46/mo, MRR → $53,410  (test willingness to pay)|\n$calc_out.saas_pricing_planner.row.whatif_cut_starter_50{"gain":"$11400"}|• Cut Starter by 50%:    Convert funnel to Pro — gain $11400/mo|\n$calc_out.saas_pricing_planner.row.whatif_annual_discount{"annual":"$388","monthly":"$456"}|• Add annual discount (15% off):   $388/yr  vs $456/yr monthly|\n$calc_out.saas_pricing_planner.row.whatif_move_to_max{"gain":"$1,640"}|• Move 10% of Pro users to Max:   +$1,640/mo MRR|\n$calc_out.saas_pricing_planner.row.whatif_drop_tier{"tier":"none"}|• Drop lowest-margin tier (none):   refocus on profitable tiers|\n\n💡 Tip: 3 tiers work best: Starter → Pro → Enterprise. The middle tier should be the obvious choice (anchor pricing).\n\n$calc_out.saas_pricing_planner.row.recommended_action{"price":"38"}|📌 Recommended Action: Launch with Tiered model, Pro at $38/mo as the anchor. Use Starter as a low-friction entry point and Max/Enterprise to capture expansion revenue.|\n• $calc_out.saas_pricing_planner.row.model_line{"name":"Flat-Rate","low":"$20","mid":"$29","high":"$44"}|Flat-Rate: $20 – $29 – $44/mo|\n  $calc_out.saas_pricing_planner.row.model_flat_rate_best|Simple tools with one clear use case. Best for early-stage products.|\n⭐ $calc_out.saas_pricing_planner.row.model_line{"name":"Tiered","low":"$15","mid":"$29","high":"$73"}|Tiered: $15 – $29 – $73/mo|\n  $calc_out.saas_pricing_planner.row.model_tiered_best|Products with power users who will pay more for advanced features.|\n• $calc_out.saas_pricing_planner.row.model_line{"name":"Usage-Based","low":"$12","mid":"$35","high":"$87"}|Usage-Based: $12 – $35 – $87/mo|\n  $calc_out.saas_pricing_planner.row.model_usage_based_best|API products, AI tools, or any product where value scales with usage.|\n• $calc_out.saas_pricing_planner.row.model_line{"name":"Freemium","low":"$0","mid":"$23","high":"$52"}|Freemium: $0 – $23 – $52/mo|\n  $calc_out.saas_pricing_planner.row.model_freemium_best|B2C products or tools that benefit from network effects and word-of-mouth.|\n🎯 Audience Insight:\n$calc_out.saas_pricing_planner.row.audience_b2b|B2B buyers expect per-seat pricing and annual contracts. They value ROI calculators and case studies.|\n\n📦 Product Insight:\n$calc_out.saas_pricing_planner.row.product_saas|SaaS benchmarks: 50-70% gross margins. Aim for LTV:CAC ratio of 3:1 or higher.|\n\n$calc_out.saas_pricing_planner.row.next_step{"price":"38"}|🚀 Next step: Pick one model, launch at the Pro tier ($38/mo), and adjust pricing after collecting 100+ conversion data points.|',
    '',
    '',
    '',
    '',
    '',
  ],
  faq: [
    { q: 'Which pricing model is best for a new SaaS?', a: 'Start with flat-rate or two tiers. Validate willingness to pay first, then expand to three tiers once you understand your power users.' },
    { q: 'How much should I charge compared to competitors?', a: 'If you offer more value, charge 20-50% more. If you want fast market entry, charge 20% less. Never compete on price alone — compete on differentiated value.' },
    { q: 'What is anchor pricing?', a: 'Present a high-priced tier to make your mid-tier look like a bargain. The middle tier becomes the obvious choice for most buyers.' },
    { q: 'Should I show pricing on my landing page?', a: 'Yes. Transparent pricing builds trust. If you must hide it (enterprise deals), at least show a starting price or range.' },
    { q: 'When should I raise prices?', a: 'Raise prices when your product has significantly more value than at launch, or when demand outpaces your capacity. Grandfather existing customers to avoid churn.' },
    { q: "How do I price my SaaS product?", a: "Three common approaches: 1) Cost-plus (cost + 30-50% margin) — bottom floor, 2) Value-based (price = % of value delivered) — premium pricing, 3) Competitor-based (price near similar tools) — market norm. Most successful SaaS uses value-based: charge 5-20% of the value you create. Test with 3-5 price points." },
    { q: "What is a good free trial vs freemium strategy?", a: "Free trial: 14-30 days full access, convert 15-25% to paid. Best for: high-touch products, B2B with longer sales cycles. Freemium: 2-5% of users convert, but viral growth. Best for: PLG products, low-touch SaaS. Combine: free tier + 14-day trial of premium features." },
    { q: "How should I structure pricing tiers?", a: "3 tiers is the sweet spot: Starter (entry), Pro (most popular), Enterprise (custom). Anchor pricing with a middle tier 2-3x the starter. Use feature differentiation, not just usage. Add annual pricing (15-20% off) to lock in cash. Enterprise tier typically requires custom quote for compliance/security needs." },
    { q: "What is a good conversion rate from free to paid?", a: "B2B SaaS: 5-15% freemium-to-paid, 15-25% trial-to-paid. B2C: 1-5%. Improving conversion: better onboarding, in-app upgrade prompts, usage limits, email nurture. The biggest lever: time-to-first-value. Cut onboarding to <5 minutes and conversion rates often double." },
    { q: "How should I price for usage vs per-seat?", a: "Per-seat: predictable, scales with team growth, easy to sell. Usage-based: aligns with value, scales with adoption, harder to forecast. Hybrid (per-seat + usage overage) is increasingly common. For API/AI products: usage-based. For collaboration/B2B: per-seat. Match pricing to how customers perceive value." },
    { q: "What is the typical SaaS price increase strategy?", a: "Increase prices: for new customers first (3-6 months before existing), then grandfather existing customers for 12-24 months. Typical annual increase: 10-20%. Communicate value first (new features, ROI proof). Avoid surprises — small, frequent increases > large rare ones. Always test new pricing on new signups first." },
    { q: "How do I handle price objections from customers?", a: "Common objections: too expensive, alternative is cheaper, no ROI proof. Responses: 1) Show ROI (cost savings, revenue generated), 2) Compare total cost of ownership (vs alternatives), 3) Offer annual discount (15-20%), 4) Highlight cheapest tier that meets needs, 5) Negotiate annual contracts with custom pricing for enterprise." },
    { q: "Should I offer a free tier in 2026?", a: "Free tier works if: viral coefficient >1, low marginal cost, easy upgrade path. Skip if: high support cost, low conversion rate (<2%), niche B2B. Free tier users cost $5-50/month in support. Conversion must justify this. Many successful SaaS have no free tier (Linear, Notion originally, Superhuman). Test freemium vs trial." },
  ],
  howToUse: [
    'Select your product type.',
    'Select your target customer segment.',
    'Enter the average competitor price (or skip if unknown).',
    'Review the 4-tier breakdown with margin, MRR, and LTV analysis.',
    'Check pricing health diagnostics for issues.',
    'Use the what-if scenarios to model pricing changes.',
  ],
  engineKey: true,
};

registerEngine(engine);
