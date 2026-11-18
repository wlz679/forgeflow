import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
import PRICING from '../../data/ai-pricing.json';
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

interface ProviderInfo {
  name: string;
  perImage: number;
  isSubscription: boolean;
  subRange: string;
  quality: string;
  resolutions: string[];
  order: number;
}

const PROVIDERS: Record<string, ProviderInfo> = PRICING.image.providers as any;

const SUB_TIERS: Record<string, number[]> = PRICING.image.subTiers as any;

const ADVANCED_MULT: Record<string, number> = PRICING.image.advancedMult as any;

function fmt(n: number): string { return '$' + n.toFixed(2); }
// P163 D1：fmt() 已带 '$'，调用处再拼一个就成 '$$'。
// ⇒ 需要「不带 $ 的数字」时用 fmtNum()，需要 $ 时显式拼 '$' + fmtNum(...)。
function fmtNum(n: number): string { return n.toFixed(2); }
// P163：按张计价的单价需要 3 位小数（SD 4 是 $0.003），但要去掉尾随零
// （$0.080 → $0.08，$0.003 保持 3 位）。数据集拥有这些单价 ⇒ 必须派生。
function fmtPrice3(n: number): string {
  const s = n.toFixed(3);
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
}
function lc(n: number): string { return n.toLocaleString(); }
function pad(s: string, len: number): string { return s + ' '.repeat(Math.max(0, len - s.length)); }
const SEP = '─';

function calculate(inputs: Record<string, string>): string[] {
  const providerKey = inputs.provider || 'dalle-3';
  const p = PROVIDERS[providerKey] || PROVIDERS['dalle-3'];
  const imgs = Math.max(1, Math.min(1000000, clampNonNegative(parseInt(inputs.imagesPerMonth)) || 100));
  const resolution = inputs.resolution || p.resolutions[0];
  const batchSize = Math.max(1, Math.min(64, clampNonNegative(parseInt(inputs.batchSize)) || 1));
  const advancedMode = inputs.advancedMode || 'standard';
  const advMult = ADVANCED_MULT[advancedMode] || 1;

  const out: string[] = [];
  // P168 B3-9：⭐ **删除**「📅 Pricing last updated: ...」这一行（与 ai-training-cost-estimator 同源）。
  //   codegen 写 staticExamples[0] 时**本来就过滤掉它**（scripts/codegen-examples.mjs:317），
  //   页面用**徽章**显示同一日期 ⇒ 保留它只会让「服务端输出」比「静态卡片」多一行
  //   ⇒ 令牌化后两端必须逐字一致（英文页零变化 + G6 守恒）⇒ 删掉。
  //   ⚠️ 英文页可见输出不变：静态卡片本来就没有这一行，客户端也从来没有这一行。
  out.push('');

  // Section 1: Header
  let header = makeToken('calc_out.ai_image_cost.row.header_estimate', '🎨 ' + p.name + ' Cost Estimate', { name: p.name });
  if (advancedMode !== 'standard') {
    header = makeToken('calc_out.ai_image_cost.row.header_estimate_advanced', '🎨 ' + p.name + ' Cost Estimate (' + advancedMode.toUpperCase() + ' mode, ' + advMult + 'x cost)', { name: p.name, mode: advancedMode.toUpperCase(), mult: String(advMult) });
  }
  out.push(header);
  out.push('');
  out.push(makeToken('calc_out.label.quality', 'Quality') + ': ' + p.quality + ' | ' + makeToken('calc_out.label.resolution', 'Resolution') + ': ' + resolution + ' | ' + makeToken('calc_out.label.batch', 'Batch') + ': ' + batchSize + makeToken('calc_out.ai_image_cost.row.unit_per_generation', '/gen'));
  out.push(makeToken('calc_out.label.pricing', 'Pricing') + ': ' + (p.isSubscription ? makeToken('calc_out.label.subscription', 'Subscription') + ' ' + p.subRange : makeToken('calc_out.ai_image_cost.row.pricing_model_per_image', 'Per-Image') + ' $' + p.perImage.toFixed(3)));
  out.push('');

  // Section 2: Cost Summary
  out.push(makeToken('calc_out.section.ai_image_cost_summary', '💰 Cost Summary'));
  out.push(SEP.repeat(50));
  let bestTier = 0;
  let perImageCost = 0;
  let monthlyCost = 0;
  if (p.isSubscription) {
    const tiers = SUB_TIERS[providerKey] || [10, 30, 60];
    out.push(makeToken('calc_out.label.pricing_model', 'Pricing Model') + ': ' + makeToken('calc_out.label.subscription', 'Subscription'));
    out.push(makeToken('calc_out.label.monthly_sub_cost', 'Monthly Sub Cost') + ': ' + p.subRange);
    out.push('');

    bestTier = tiers[0];
    for (const tier of tiers) {
      const tierImgs = providerKey === 'midjourney-v7'
        ? (tier <= 30 ? 200 : tier <= 60 ? 1000 : 5000)
        : providerKey === 'leonardo'
          ? (tier <= 12 ? 200 : tier <= 29 ? 1000 : 999999)
          : 200;
      if (imgs <= tierImgs || tier === tiers[tiers.length - 1]) {
        bestTier = tier;
        break;
      }
    }
    out.push(makeToken('calc_out.ai_image_cost.row.best_tier', 'Best Tier for ' + lc(imgs) + ' images/mo: $' + bestTier + '/mo', { imgs: lc(imgs), tier: String(bestTier) }));
    out.push(makeToken('calc_out.label.annual', 'Annual') + ': ' + fmt(bestTier * 12));
  } else {
    perImageCost = p.perImage * advMult;
    monthlyCost = imgs * perImageCost;
    out.push(makeToken('calc_out.label.per_image', 'Per Image') + ': ' + fmt(perImageCost));
    out.push(makeToken('calc_out.label.monthly_cost', 'Monthly Cost') + ' (' + lc(imgs) + makeToken('calc_out.ai_image_cost.row.unit_images', ' images') + '): ' + fmt(monthlyCost));
    out.push(makeToken('calc_out.label.annual_cost', 'Annual Cost') + ': ' + fmt(monthlyCost * 12));
    out.push('');

    const daily = monthlyCost / 30;
    out.push(makeToken('calc_out.label.daily_avg', 'Daily Avg') + ': ' + fmt(daily) + ' (' + lc(Math.round(imgs / 30)) + makeToken('calc_out.ai_image_cost.row.unit_images_per_day', ' images/day') + ')');
  }
  out.push('');

  // Section 3: Bar Chart
  out.push(makeToken('calc_out.ai_image_cost.row.section_all_providers', '📊 All Providers — Monthly Cost at ' + lc(imgs) + ' images/mo', { imgs: lc(imgs) }));
  out.push(SEP.repeat(50));
  const sortedProviders = Object.values(PROVIDERS).sort((a, b) => a.order - b.order);
  const allCosts: { name: string; cost: number; isSub: boolean }[] = [];

  for (const prov of sortedProviders) {
    let cost = 0;
    if (prov.isSubscription) {
      const st = SUB_TIERS[
        Object.keys(PROVIDERS).find(k => PROVIDERS[k] === prov) || ''
      ];
      if (st) {
        cost = imgs <= 200 ? st[0] : imgs <= 1000 ? st[1] || st[0] : st[st.length - 1] || st[0];
      } else {
        cost = 20;
      }
    } else {
      cost = imgs * prov.perImage;
    }
    allCosts.push({ name: prov.name, cost, isSub: prov.isSubscription });
  }

  const maxCost = Math.max(...allCosts.map(c => c.cost), 1);
  const BAR_WIDTH = 35;
  const cheapest = allCosts.reduce((min, c) => c.cost < min.cost ? c : min);

  for (const c of allCosts) {
    const ratio = c.cost / maxCost;
    const isCheapest = c === cheapest;
    const prefix = isCheapest ? '✅ ' : '   ';
    // ⭐ 对齐宽度按**英文**标签算（padding 留在 token 之外）⇒ 英文页逐字不变
    const labelEn = c.isSub ? c.name + ' (sub)' : c.name;
    const labelCell = pad(labelEn, 21);
    const label = c.isSub ? c.name + makeToken('calc_out.ai_image_cost.row.unit_subscription_tag', ' (sub)') + labelCell.slice(labelEn.length) : labelCell;
    const barLen = Math.max(1, Math.round(ratio * BAR_WIDTH));
    const barStr = '█'.repeat(barLen) + ' '.repeat(Math.max(0, BAR_WIDTH - barLen + 2));
    out.push(prefix + label + ' ' + barStr + ' ' + fmt(c.cost) + (c.isSub ? '/mo' : ''));
  }
  out.push('');

  // Section 3b: Health (NEW)
  out.push(makeToken('calc_out.section.ai_image_cost_health', '🩺 Cost Health:'));
  out.push(SEP.repeat(50));
  const effectivePerImg = p.isSubscription ? (bestTier / Math.max(1, imgs)) : perImageCost;
  if (effectivePerImg < 0.01) {
    out.push(makeToken('calc_out.ai_image_cost.row.health_exceptional', '• 🟢 Exceptional — ' + fmt(effectivePerImg) + '/image is 5x+ below market.', { price: fmt(effectivePerImg) }));
  } else if (effectivePerImg < 0.05) {
    out.push(makeToken('calc_out.ai_image_cost.row.health_competitive', '• 🟢 Competitive — ' + fmt(effectivePerImg) + '/image is at/below market avg ($0.05).', { price: fmt(effectivePerImg) }));
  } else if (effectivePerImg < 0.10) {
    out.push(makeToken('calc_out.ai_image_cost.row.health_mid_market', '• 🟡 Mid-market — ' + fmt(effectivePerImg) + '/image is around the average.', { price: fmt(effectivePerImg) }));
  } else {
    out.push(makeToken('calc_out.ai_image_cost.row.health_premium', '• 🟠 Premium pricing — ' + fmt(effectivePerImg) + '/image is 2x+ market rate.', { price: fmt(effectivePerImg) }));
  }
  if (p.isSubscription) {
    if (imgs >= 500) {
      out.push(makeToken('calc_out.ai_image_cost.row.health_sub_well_utilized', '• ✅ Subscription well-utilized at ' + lc(imgs) + ' images/mo.', { imgs: lc(imgs) }));
    } else if (imgs >= 200) {
      out.push(makeToken('calc_out.ai_image_cost.row.health_sub_moderately_used', '• ⚠️ Subscription moderately used. Break-even met but not maximized.'));
    } else {
      out.push(makeToken('calc_out.ai_image_cost.row.health_sub_underutilized', '• 🔴 Subscription underutilized at ' + lc(imgs) + ' images/mo. Per-image may be cheaper.', { imgs: lc(imgs) }));
    }
  } else {
    const subAlt = sortedProviders.find(prov => prov.isSubscription);
    if (subAlt) {
      const subKey = Object.keys(PROVIDERS).find(k => PROVIDERS[k] === subAlt);
      const subLowest = subKey && SUB_TIERS[subKey] ? SUB_TIERS[subKey][0] : 10;
      const breakEven = Math.ceil(subLowest / p.perImage);
      if (imgs >= breakEven) {
        out.push(makeToken('calc_out.ai_image_cost.row.health_alt_would_save', '• ⚠️ At ' + lc(imgs) + ' imgs/mo, ' + subAlt.name + ' ($' + subLowest + '/mo) would save money.', { imgs: lc(imgs), sub: subAlt.name, price: '$' + subLowest + '/mo' }));
      } else {
        out.push(makeToken('calc_out.ai_image_cost.row.health_alt_per_image_correct', '• ✅ Per-image is correct for ' + lc(imgs) + ' imgs/mo. Break-even: ' + lc(breakEven) + ' imgs.', { imgs: lc(imgs), be: lc(breakEven) }));
      }
    }
  }
  out.push('');

  // Section 4: Subscription vs API comparison table
  out.push(makeToken('calc_out.section.ai_image_cost_provider_comparison', '📋 Subscription vs API — Price Comparison'));
  out.push(SEP.repeat(50));
  const volumes = [50, 200, 500, 1000, 5000];

  // ⚠️ 表头**长度**按英文算（分隔线长度不能跟着 token 变长）
  let tblHeaderEn = 'Volume'.padEnd(10);
  for (const prov of sortedProviders) tblHeaderEn += ' | ' + pad(prov.name, 14);
  let tblHeader = makeToken('calc_out.label.volume', 'Volume') + tblHeaderEn.slice('Volume'.length);
  out.push(tblHeader);
  out.push('─'.repeat(tblHeaderEn.length));

  for (const vol of volumes) {
    let row = lc(vol).padEnd(10);
    for (const prov of sortedProviders) {
      let cost = 0;
      if (prov.isSubscription) {
        const st = SUB_TIERS[
          Object.keys(PROVIDERS).find(k => PROVIDERS[k] === prov) || ''
        ];
        if (st) {
          cost = vol <= 200 ? st[0] : vol <= 1000 ? st[1] || st[0] : st[st.length - 1] || st[0];
        } else {
          cost = 20;
        }
      } else {
        cost = vol * prov.perImage;
      }
      row += ' | ' + pad(fmt(cost), 14);
    }
    out.push(row);
  }
  out.push('');

  // Section 4b: Break-even analysis (NEW)
  out.push(makeToken('calc_out.section.ai_image_cost_break_even', '⚖️ Break-Even: When Subscription Beats Per-Image'));
  out.push(SEP.repeat(50));
  const perImgProvs = sortedProviders.filter(prov => !prov.isSubscription);
  const subProvs = sortedProviders.filter(prov => prov.isSubscription);
  for (const sub of subProvs) {
    const subKey = Object.keys(PROVIDERS).find(k => PROVIDERS[k] === sub);
    if (!subKey || !SUB_TIERS[subKey]) continue;
    const subBasic = SUB_TIERS[subKey][0];
    for (const api of perImgProvs) {
      const be = Math.ceil(subBasic / api.perImage);
      if (be > 0 && be < 100000) {
        out.push(makeToken('calc_out.ai_image_cost.row.break_even_line', '  ' + api.name + ' → ' + sub.name + ' ($' + subBasic + '/mo): ' + lc(be) + ' imgs/mo break-even', { api: api.name, sub: sub.name, price: '$' + subBasic + '/mo', be: lc(be) }));
      }
    }
  }
  out.push('');

  // Section 5: Volume scenarios at different batch sizes
  out.push(makeToken('calc_out.section.ai_image_cost_volume_scenarios', '📈 Volume Scenarios at Different Batch Sizes'));
  out.push(SEP.repeat(50));
  const batchScenarios = [1, 4, 8, 16, 32];
  out.push(makeToken('calc_out.label.batch_size', 'Batch Size') + ' | ' + makeToken('calc_out.label.images_per_month', 'Images/Mo') + ' | ' + makeToken('calc_out.label.cost_per_month', 'Cost/Mo') + '    | ' + makeToken('calc_out.label.generations_needed', 'Generations Needed'));
  out.push('──────────┼───────────┼────────────┼───────────────────');
  for (const bs of batchScenarios) {
    const perImgForBs = p.isSubscription ? 0 : p.perImage * advMult;
    const cost = p.isSubscription
      ? (() => {
          const st = SUB_TIERS[providerKey];
          if (st) {
            return imgs <= 200 ? st[0] : imgs <= 1000 ? st[1] || st[0] : st[st.length - 1] || st[0];
          }
          return 20;
        })()
      : imgs * perImgForBs;
    const gems = Math.ceil(imgs / bs);
    out.push(
      pad(String(bs), 10) + '│ ' +
      pad(lc(imgs), 10) + '│ ' +
      pad(fmt(cost), 11) + '│ ' +
      lc(gems) + makeToken('calc_out.ai_image_cost.row.batch_runs', ' runs of ' + bs + ' imgs each', { runs: String(bs) }),
    );
  }
  out.push('');
  out.push(makeToken('calc_out.ai_image_cost.row.tip_batch_sizes', '💡 Larger batch sizes = fewer API calls. Some providers limit batch to 4-10 images per generation.'));

  // Section 5b: What-If Scenarios (NEW)
  out.push('');
  out.push(makeToken('calc_out.section.what_if_scenarios', '🔄 What-If Scenarios:'));
  out.push(SEP.repeat(50));
  if (p.isSubscription) {
    out.push(makeToken('calc_out.ai_image_cost.row.whatif_cut_to_half', '• Cut volume to 50% (' + lc(Math.round(imgs/2)) + ' imgs/mo): Save $0/mo (subscription is fixed)', { imgs: lc(Math.round(imgs/2)) }));
  } else {
    const halfImgs = Math.max(1, Math.round(imgs / 2));
    const halfCost = halfImgs * perImageCost;
    out.push(makeToken('calc_out.ai_image_cost.row.whatif_cut_in_half', '• Cut volume in half: Save $' + fmtNum(monthlyCost - halfCost) + '/mo ($' + fmtNum(monthlyCost) + ' → $' + fmtNum(halfCost) + ')', { save: fmtNum(monthlyCost - halfCost), cur: fmtNum(monthlyCost), half: fmtNum(halfCost) }));
  }
  const sd4 = PROVIDERS['stable-diffusion-4'];
  // P163：SD 4 / Ideogram 3 / DALL-E 3 的单价全部由数据集派生 ——
  // 写死会在 bot 刷新价格后失真（实测：写死的 "13x" 只在 Ideogram 3 上恰好正确，
  // Flux Pro 实为 16.7x；SD 4 的 $0.003 若变动，除数也要跟着变）。
  const ideogram = PROVIDERS['ideogram-3'];
  const dalle3 = PROVIDERS['dalle-3'];
  const sd4Cost = imgs * sd4.perImage;
  const currentCost = p.isSubscription ? bestTier : monthlyCost;
  const sd4Savings = currentCost - sd4Cost;
  if (sd4Savings > 0) {
    out.push(makeToken('calc_out.ai_image_cost.row.whatif_sd4_saves', '• Switch to SD 4 API ($' + fmtPrice3(sd4.perImage) + '/img): $' + fmtNum(sd4Cost) + '/mo  (saves $' + fmtNum(sd4Savings) + '/mo)', { price: '$' + fmtPrice3(sd4.perImage) + '/img', cost: '$' + fmtNum(sd4Cost) + '/mo', save: '$' + fmtNum(sd4Savings) + '/mo' }));
  } else {
    out.push(makeToken('calc_out.ai_image_cost.row.whatif_sd4_already_cheaper', '• Switch to SD 4 API: $' + fmtNum(sd4Cost) + '/mo  (already cheaper)', { cost: '$' + fmtNum(sd4Cost) + '/mo' }));
  }
  if (!p.isSubscription) {
    const subAlt = sortedProviders.find(prov => prov.isSubscription);
    if (subAlt) {
      const subKey = Object.keys(PROVIDERS).find(k => PROVIDERS[k] === subAlt);
      const subBasic = subKey && SUB_TIERS[subKey] ? SUB_TIERS[subKey][0] : 10;
      if (subBasic < monthlyCost) {
        out.push(makeToken('calc_out.ai_image_cost.row.whatif_switch_sub_saves', '• Switch to ' + subAlt.name + ' ($' + subBasic + '/mo): saves $' + fmtNum(monthlyCost - subBasic) + '/mo', { sub: subAlt.name, price: '$' + subBasic + '/mo', save: '$' + fmtNum(monthlyCost - subBasic) + '/mo' }));
      } else {
        out.push(makeToken('calc_out.ai_image_cost.row.whatif_switch_sub_costs_more', '• Switch to ' + subAlt.name + ' ($' + subBasic + '/mo): +$' + fmtNum(subBasic - monthlyCost) + '/mo vs pay-per-image', { sub: subAlt.name, price: '$' + subBasic + '/mo', diff: '$' + fmtNum(subBasic - monthlyCost) + '/mo' }));
      }
    }
  } else {
    const cheapestApi = sortedProviders.filter(prov => !prov.isSubscription).sort((a, b) => a.perImage - b.perImage)[0];
    if (cheapestApi) {
      const altCost = imgs * cheapestApi.perImage;
      out.push(makeToken('calc_out.ai_image_cost.row.whatif_drop_subscription', '• Drop subscription, go per-image (' + cheapestApi.name + '): $' + fmtNum(altCost) + '/mo  (vs $' + bestTier + '/mo)', { api: cheapestApi.name, cost: '$' + fmtNum(altCost) + '/mo', cur: '$' + bestTier + '/mo' }));
    }
  }
  if (p.isSubscription) {
    out.push(makeToken('calc_out.ai_image_cost.row.whatif_double_volume_sub', '• Double volume to ' + lc(imgs * 2) + ' imgs/mo: $0 extra (sub is fixed)', { imgs: lc(imgs * 2) }));
  } else {
    out.push(makeToken('calc_out.ai_image_cost.row.whatif_double_volume', '• Double volume to ' + lc(imgs * 2) + ' imgs/mo: $' + fmtNum(imgs * 2 * perImageCost) + '/mo', { imgs: lc(imgs * 2), cost: '$' + fmtNum(imgs * 2 * perImageCost) + '/mo' }));
  }

  // Section 6: Use-case recommendation (NEW)
  out.push('');
  out.push(makeToken('calc_out.section.ai_image_cost_best_provider', '🎯 Best Provider by Use Case:'));
  out.push(SEP.repeat(50));
  out.push(makeToken('calc_out.ai_image_cost.row.use_case_text', '• 📝 Text in images (logos, signs, UI):  → Ideogram 3 (best text rendering)'));
  out.push(makeToken('calc_out.ai_image_cost.row.use_case_artistic', '• 🎨 Artistic / creative work:           → Midjourney V7 (aesthetic quality)'));
  out.push(makeToken('calc_out.ai_image_cost.row.use_case_budget', '• 💰 Budget is #1 concern:              → Stable Diffusion 4 ($' + fmtPrice3(sd4.perImage) + '/image)', { price: '$' + fmtPrice3(sd4.perImage) + '/image' }));
  out.push(makeToken('calc_out.ai_image_cost.row.use_case_complex', '• 🧩 Complex multi-object prompts:      → DALL-E 4 (instruction following)'));
  out.push(makeToken('calc_out.ai_image_cost.row.use_case_volume', '• 📦 Maximum volume (5000+ imgs/mo):    → Midjourney V7 Mega ($60-120/mo)'));
  out.push('');
  out.push(makeToken('calc_out.ai_image_cost.row.for_your_case', '💡 For your case (' + lc(imgs) + ' imgs/mo via ' + p.name + '):', { imgs: lc(imgs), name: p.name }));
  if (p.perImage >= dalle3.perImage && imgs < 500) {
    const altCost = imgs * ideogram.perImage;
    out.push(makeToken('calc_out.ai_image_cost.row.final_switch_ideogram', '   Switch to Ideogram 3 ($' + fmtPrice3(ideogram.perImage) + '/img) to save $' + fmtNum(monthlyCost - altCost) + '/mo with similar quality.', { price: '$' + fmtPrice3(ideogram.perImage) + '/img', save: '$' + fmtNum(monthlyCost - altCost) + '/mo' }));
  } else if (p.perImage >= ideogram.perImage && imgs < 100) {
    const altCost = imgs * sd4.perImage;
    // P163 D2：倍数必须由当前单价算出 —— 写死的 "13x" 只在 Ideogram 3
    // ($0.04) 上恰好正确，Flux Pro ($0.05) 实为 16.7x。
    // 除数也必须是数据集单价（sd4.perImage），不是字面量 0.003。
    const sd4Ratio = Math.round(perImageCost / sd4.perImage);
    out.push(makeToken('calc_out.ai_image_cost.row.final_sd4_cheaper', '   At <100 imgs/mo, SD 4 API is ' + sd4Ratio + 'x cheaper ($' + fmtNum(altCost) + ' vs $' + fmtNum(monthlyCost) + '/mo).', { mult: String(sd4Ratio), alt: '$' + fmtNum(altCost), cur: '$' + fmtNum(monthlyCost) + '/mo' }));
  } else if (p.isSubscription && imgs < 100) {
    const altCost = imgs * ideogram.perImage;
    out.push(makeToken('calc_out.ai_image_cost.row.final_sub_underutilized', '   Subscription is underutilized. Per-image (Ideogram 3) would be ~$' + fmtNum(altCost) + '/mo.', { cost: '$' + fmtNum(altCost) + '/mo' }));
  } else {
    out.push(makeToken('calc_out.ai_image_cost.row.final_well_matched', '   Your current choice is well-matched to your volume and quality needs.'));
  }

  return out;
}

// customFn — minified JS port of calculate(). Variables: bt=bestTier, pic=perImageCost, mc=monthlyCost.
const customFn =
  // P15 defensive clamp (preserved across codegen-customfn.mjs regen — sits before data-table markers)
  // P168 B3-9：⭐ 前置**共享的** token 构造器（与服务端 makeToken 同一份实现 ⇒ 两端不会漂）
  CALC_OUTPUT_MAKE_TOKEN_JS +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var PS={" +
  "'dalle-4':{n:'DALL-E 4',pi:0.12,is:false,sr:'',q:'Highest',rs:['1024×1024','1792×1024','1024×1792'],od:1}," +
  "'dalle-3':{n:'DALL-E 3',pi:0.08,is:false,sr:'',q:'Very High',rs:['1024×1024','1792×1024','1024×1792'],od:2}," +
  "'midjourney-v7':{n:'Midjourney V7',pi:0,is:true,sr:'$10-$120/mo',q:'Best Artistic',rs:['1024×1024','2048×2048'],od:3}," +
  "'stable-diffusion-4':{n:'SD 4 (API)',pi:0.003,is:false,sr:'',q:'Good+',rs:['512×512','1024×1024','2048×2048'],od:4}," +
  "'ideogram-3':{n:'Ideogram 3',pi:0.04,is:false,sr:'',q:'Best Text',rs:['1024×1024','1280×720'],od:5}," +
  "'flux-pro':{n:'Flux Pro',pi:0.05,is:false,sr:'',q:'Excellent',rs:['1024×1024','2048×2048'],od:6}," +
  "'leonardo':{n:'Leonardo AI',pi:0,is:true,sr:'$12-$49/mo',q:'Very Good',rs:['1024×1024','1536×1536'],od:7}};" +

  "var ST={mj:[10,30,60,120],leo:[12,29,49]};" +
  "var AM={standard:1,hd:1.3,ultra:1.8};" +
  "function fm(n){return '$'+n.toFixed(2)}function fn(n){return n.toFixed(2)}function fp3(n){var s=n.toFixed(3);return s.indexOf('.')>0?s.replace(/0+$/,'').replace(/[.]$/,''):s}function lc(n){return n.toLocaleString()}function pd(s,l){return s+' '.repeat(Math.max(0,l-s.length))}" +
  "var SEP3='\u2500';" +
  "var pk=inputs.provider||'dalle-3';var p=PS[pk]||PS['dalle-3'];" +
  "var im=Math.max(1,Math.min(1e6,cnn(parseInt(inputs.imagesPerMonth))||100));" +
  "var res=inputs.resolution||p.rs[0];var bs=Math.max(1,Math.min(64,cnn(parseInt(inputs.batchSize))||1));" +
  "var advm=inputs.advancedMode||'standard';var amv=AM[advm]||1;" +
  "var o=[];" +
  "var bt=0,pic=0,mc=0;" +
  "o.push('');" +
  "var hdr=tk('calc_out.ai_image_cost.row.header_estimate','\uD83C\uDFA8 '+p.n+' Cost Estimate',{name:p.n});if(advm!=='standard')hdr=tk('calc_out.ai_image_cost.row.header_estimate_advanced','\uD83C\uDFA8 '+p.n+' Cost Estimate ('+advm.toUpperCase()+' mode, '+amv+'x cost)',{name:p.n,mode:advm.toUpperCase(),mult:String(amv)});" +
  "o.push(hdr);o.push('');" +
  "o.push(tk('calc_out.label.quality','Quality')+': '+p.q+' | '+tk('calc_out.label.resolution','Resolution')+': '+res+' | '+tk('calc_out.label.batch','Batch')+': '+bs+tk('calc_out.ai_image_cost.row.unit_per_generation','/gen'));" +
  "o.push(tk('calc_out.label.pricing','Pricing')+': '+(p.is?tk('calc_out.label.subscription','Subscription')+' '+p.sr:tk('calc_out.ai_image_cost.row.pricing_model_per_image','Per-Image')+' $'+p.pi.toFixed(3)));o.push('');" +
  "o.push(tk('calc_out.section.ai_image_cost_summary','\uD83D\uDCB0 Cost Summary'));o.push(SEP3.repeat(50));" +
  "if(p.is){" +
  "var ts=pk.indexOf('midjourney')>=0?ST.mj:ST.leo;" +
  "o.push(tk('calc_out.label.pricing_model','Pricing Model')+': '+tk('calc_out.label.subscription','Subscription'));o.push(tk('calc_out.label.monthly_sub_cost','Monthly Sub Cost')+': '+p.sr);o.push('');" +
  "bt=ts[0];for(var ti=0;ti<ts.length;ti++){var t=ts[ti];" +
  "var lim=pk.indexOf('midjourney')>=0?(t<=30?200:t<=60?1000:5000):pk.indexOf('leo')>=0?(t<=12?200:t<=29?1000:999999):200;" +
  "if(im<=lim||ti===ts.length-1){bt=t;break;}}" +
  "o.push(tk('calc_out.ai_image_cost.row.best_tier','Best Tier for '+lc(im)+' images/mo: $'+bt+'/mo',{imgs:lc(im),tier:String(bt)}));o.push(tk('calc_out.label.annual','Annual')+': '+fm(bt*12));" +
  "}else{" +
  "pic=p.pi*amv;mc=im*pic;" +
  "o.push(tk('calc_out.label.per_image','Per Image')+': '+fm(pic));o.push(tk('calc_out.label.monthly_cost','Monthly Cost')+' ('+lc(im)+tk('calc_out.ai_image_cost.row.unit_images',' images')+'): '+fm(mc));" +
  "o.push(tk('calc_out.label.annual_cost','Annual Cost')+': '+fm(mc*12));o.push('');" +
  "o.push(tk('calc_out.label.daily_avg','Daily Avg')+': '+fm(mc/30)+' ('+lc(Math.round(im/30))+tk('calc_out.ai_image_cost.row.unit_images_per_day',' images/day')+')');" +
  "}" +
  "o.push('');" +
  "o.push(tk('calc_out.ai_image_cost.row.section_all_providers','\uD83D\uDCCA All Providers \u2014 Monthly Cost at '+lc(im)+' images/mo',{imgs:lc(im)}));o.push(SEP3.repeat(50));" +
  "var sp=[];for(var k2 in PS)sp.push(PS[k2]);sp.sort(function(a,b){return a.od-b.od;});" +
  "var ac=[];for(var i=0;i<sp.length;i++){" +
  "var pr=sp[i];var cst=0;var pk2=Object.keys(PS).find(function(kk){return PS[kk]===pr;})||'';" +
  "if(pr.is){var st2=pk2.indexOf('midjourney')>=0?ST.mj:pk2.indexOf('leo')>=0?ST.leo:null;" +
  "if(st2){cst=im<=200?st2[0]:im<=1000?(st2[1]||st2[0]):st2[st2.length-1]||st2[0];}else{cst=20;}" +
  "}else{cst=im*pr.pi;}" +
  "ac.push({n:pr.n,c:cst,is:pr.is});}" +
  "var mx=ac.reduce(function(max,c){return c.c>max.c?c:max;}).c;mx=Math.max(mx,1);" +
  "var BW=35;var ch=ac.reduce(function(min,c){return c.c<min.c?c:min;});" +
  "for(var i=0;i<ac.length;i++){var c=ac[i];var rt=c.c/mx;var isCh=c===ch;var pf=isCh?'\u2705 ':'   ';" +
  "var lbEn=c.is?c.n+' (sub)':c.n;var lbCell=pd(lbEn,21);var lb=c.is?c.n+tk('calc_out.ai_image_cost.row.unit_subscription_tag',' (sub)')+lbCell.slice(lbEn.length):lbCell;" +
  "var bl=Math.max(1,Math.round(rt*BW));" +
  "o.push(pf+lb+' '+'\u2588'.repeat(bl)+' '.repeat(Math.max(0,BW-bl+2))+' '+fm(c.c)+(c.is?'/mo':''));" +
  "}" +
  "o.push('');" +
  "o.push(tk('calc_out.section.ai_image_cost_health','\uD83E\uDE7A Cost Health:'));o.push(SEP3.repeat(50));" +
  "var epi=p.is?(bt/Math.max(1,im)):pic;" +
  "if(epi<0.01){o.push(tk('calc_out.ai_image_cost.row.health_exceptional','\u2022 \uD83D\uDFE2 Exceptional \u2014 '+fm(epi)+'/image is 5x+ below market.',{price:fm(epi)}));}" +
  "else if(epi<0.05){o.push(tk('calc_out.ai_image_cost.row.health_competitive','\u2022 \uD83D\uDFE2 Competitive \u2014 '+fm(epi)+'/image is at/below market avg ($0.05).',{price:fm(epi)}));}" +
  "else if(epi<0.10){o.push(tk('calc_out.ai_image_cost.row.health_mid_market','\u2022 \uD83D\uDFE1 Mid-market \u2014 '+fm(epi)+'/image is around the average.',{price:fm(epi)}));}" +
  "else{o.push(tk('calc_out.ai_image_cost.row.health_premium','\u2022 \uD83D\uDFE0 Premium pricing \u2014 '+fm(epi)+'/image is 2x+ market rate.',{price:fm(epi)}));}" +
  "if(p.is){" +
  "if(im>=500){o.push(tk('calc_out.ai_image_cost.row.health_sub_well_utilized','\u2022 \u2705 Subscription well-utilized at '+lc(im)+' images/mo.',{imgs:lc(im)}));}" +
  "else if(im>=200){o.push(tk('calc_out.ai_image_cost.row.health_sub_moderately_used','\u2022 \u26A0\uFE0F Subscription moderately used. Break-even met but not maximized.'));}" +
  "else{o.push(tk('calc_out.ai_image_cost.row.health_sub_underutilized','\u2022 \uD83D\uDD34 Subscription underutilized at '+lc(im)+' images/mo. Per-image may be cheaper.',{imgs:lc(im)}));}" +
  "}else{" +
  "var sa=sp.filter(function(x){return x.is;})[0];" +
  "if(sa){var sak=Object.keys(PS).find(function(kk){return PS[kk]===sa;})||'';" +
  "var ismj=sak.indexOf('midjourney')>=0;var sl=ismj?ST.mj[0]:ST.leo[0];" +
  "var be2=Math.ceil(sl/p.pi);" +
  "if(im>=be2){o.push(tk('calc_out.ai_image_cost.row.health_alt_would_save','\u2022 \u26A0\uFE0F At '+lc(im)+' imgs/mo, '+sa.n+' ($'+sl+'/mo) would save money.',{imgs:lc(im),sub:sa.n,price:'$'+sl+'/mo'}));}" +
  "else{o.push(tk('calc_out.ai_image_cost.row.health_alt_per_image_correct','\u2022 \u2705 Per-image is correct for '+lc(im)+' imgs/mo. Break-even: '+lc(be2)+' imgs.',{imgs:lc(im),be:lc(be2)}));}}" +
  "}" +
  "o.push('');" +
  "o.push(tk('calc_out.section.ai_image_cost_provider_comparison','\uD83D\uDCCB Subscription vs API \u2014 Price Comparison'));o.push(SEP3.repeat(50));" +
  "var vols2=[50,200,500,1000,5000];" +
  "var thEn='Volume'.padEnd(10);for(var i=0;i<sp.length;i++)thEn+=' | '+pd(sp[i].n,14);" +
  "var th=tk('calc_out.label.volume','Volume')+thEn.slice(6);o.push(th);" +
  "o.push('\u2500'.repeat(thEn.length));" +
  "for(var vi=0;vi<vols2.length;vi++){var vl=vols2[vi];var row=lc(vl).padEnd(10);" +
  "for(var pi2=0;pi2<sp.length;pi2++){var pr2=sp[pi2];var cst2=0;" +
  "if(pr2.is){var st3=(Object.keys(PS).find(function(kk){return PS[kk]===pr2;})||'').indexOf('midjourney')>=0?ST.mj:ST.leo;" +
  "if(st3){cst2=vl<=200?st3[0]:vl<=1000?(st3[1]||st3[0]):st3[st3.length-1]||st3[0];}else{cst2=20;}}" +
  "else{cst2=vl*pr2.pi;}" +
  "row+=' | '+pd(fm(cst2),14);}" +
  "o.push(row);}" +
  "o.push('');" +
  "o.push(tk('calc_out.section.ai_image_cost_break_even','\u2696\uFE0F Break-Even: When Subscription Beats Per-Image'));o.push(SEP3.repeat(50));" +
  "var pap=sp.filter(function(x){return !x.is;});" +
  "var sbp=sp.filter(function(x){return x.is;});" +
  "for(var si=0;si<sbp.length;si++){var sub=sbp[si];" +
  "var sk=Object.keys(PS).find(function(kk){return PS[kk]===sub;})||'';" +
  "if(!sk)continue;var ismj2=sk.indexOf('midjourney')>=0;var sb=ismj2?ST.mj[0]:ST.leo[0];" +
  "for(var ai=0;ai<pap.length;ai++){var api=pap[ai];" +
  "var be3=Math.ceil(sb/api.pi);if(be3>0&&be3<100000){" +
  "o.push(tk('calc_out.ai_image_cost.row.break_even_line','  '+api.n+' \u2192 '+sub.n+' ($'+sb+'/mo): '+lc(be3)+' imgs/mo break-even',{api:api.n,sub:sub.n,price:'$'+sb+'/mo',be:lc(be3)}));" +
  "}}" +
  "}" +
  "o.push('');" +
  "o.push(tk('calc_out.section.ai_image_cost_volume_scenarios','\uD83D\uDCC8 Volume Scenarios at Different Batch Sizes'));o.push(SEP3.repeat(50));" +
  "var bss=[1,4,8,16,32];" +
  "o.push(tk('calc_out.label.batch_size','Batch Size')+' | '+tk('calc_out.label.images_per_month','Images/Mo')+' | '+tk('calc_out.label.cost_per_month','Cost/Mo')+'    | '+tk('calc_out.label.generations_needed','Generations Needed'));" +
  "o.push('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');" +
  "for(var bi=0;bi<bss.length;bi++){var bs2=bss[bi];var pic2=p.is?0:p.pi*amv;" +
  "var cst3=p.is?bt:im*pic2;var rns=Math.ceil(im/bs2);" +
  "o.push(pd(String(bs2),10)+'\u2502 '+pd(lc(im),10)+'\u2502 '+pd(fm(cst3),11)+'\u2502 '+lc(rns)+tk('calc_out.ai_image_cost.row.batch_runs',' runs of '+bs2+' imgs each',{runs:String(bs2)}));}" +
  "o.push('');o.push(tk('calc_out.ai_image_cost.row.tip_batch_sizes','\uD83D\uDCA1 Larger batch sizes = fewer API calls. Some providers limit batch to 4-10 images per generation.'));" +
  "o.push('');" +
  "o.push(tk('calc_out.section.what_if_scenarios','\uD83D\uDD04 What-If Scenarios:'));o.push(SEP3.repeat(50));" +
  "if(p.is){o.push(tk('calc_out.ai_image_cost.row.whatif_cut_to_half','\u2022 Cut volume to 50% ('+lc(Math.round(im/2))+' imgs/mo): Save $0/mo (subscription is fixed)',{imgs:lc(Math.round(im/2))}));}" +
  "else{var hi=Math.max(1,Math.round(im/2));var hc=hi*pic;o.push(tk('calc_out.ai_image_cost.row.whatif_cut_in_half','\u2022 Cut volume in half: Save $'+fn(mc-hc)+'/mo ($'+fn(mc)+' \u2192 $'+fn(hc)+')',{save:fn(mc-hc),cur:fn(mc),half:fn(hc)}));}" +
  "var sdc=im*PS['stable-diffusion-4'].pi;var cur=p.is?bt:mc;var sav=cur-sdc;" +
  "if(sav>0){o.push(tk('calc_out.ai_image_cost.row.whatif_sd4_saves','\u2022 Switch to SD 4 API ($'+fp3(PS['stable-diffusion-4'].pi)+'/img): $'+fn(sdc)+'/mo  (saves $'+fn(sav)+'/mo)',{price:'$'+fp3(PS['stable-diffusion-4'].pi)+'/img',cost:'$'+fn(sdc)+'/mo',save:'$'+fn(sav)+'/mo'}));}" +
  "else{o.push(tk('calc_out.ai_image_cost.row.whatif_sd4_already_cheaper','\u2022 Switch to SD 4 API: $'+fn(sdc)+'/mo  (already cheaper)',{cost:'$'+fn(sdc)+'/mo'}));}" +
  "if(!p.is){" +
  "var sa2=sp.filter(function(x){return x.is;})[0];" +
  "if(sa2){var sak2=Object.keys(PS).find(function(kk){return PS[kk]===sa2;})||'';" +
  "var ismj3=sak2.indexOf('midjourney')>=0;var sb2=ismj3?ST.mj[0]:ST.leo[0];" +
  "if(sb2<mc){o.push(tk('calc_out.ai_image_cost.row.whatif_switch_sub_saves','\u2022 Switch to '+sa2.n+' ($'+sb2+'/mo): saves $'+fn(mc-sb2)+'/mo',{sub:sa2.n,price:'$'+sb2+'/mo',save:'$'+fn(mc-sb2)+'/mo'}));}" +
  "else{o.push(tk('calc_out.ai_image_cost.row.whatif_switch_sub_costs_more','\u2022 Switch to '+sa2.n+' ($'+sb2+'/mo): +$'+fn(sb2-mc)+'/mo vs pay-per-image',{sub:sa2.n,price:'$'+sb2+'/mo',diff:'$'+fn(sb2-mc)+'/mo'}));}" +
  "}else{" +
  "var cap=sp.filter(function(x){return !x.is;}).sort(function(a,b){return a.pi-b.pi;})[0];" +
  "if(cap){var ac2=im*cap.pi;o.push(tk('calc_out.ai_image_cost.row.whatif_drop_subscription','\u2022 Drop subscription, go per-image ('+cap.n+'): $'+fn(ac2)+'/mo  (vs $'+bt+'/mo)',{api:cap.n,cost:'$'+fn(ac2)+'/mo',cur:'$'+bt+'/mo'}));}}" +
  "}" +
  "if(p.is){o.push(tk('calc_out.ai_image_cost.row.whatif_double_volume_sub','\u2022 Double volume to '+lc(im*2)+' imgs/mo: $0 extra (sub is fixed)',{imgs:lc(im*2)}));}" +
  "else{o.push(tk('calc_out.ai_image_cost.row.whatif_double_volume','\u2022 Double volume to '+lc(im*2)+' imgs/mo: $'+fn(im*2*pic)+'/mo',{imgs:lc(im*2),cost:'$'+fn(im*2*pic)+'/mo'}));}" +
  "o.push('');" +
  "o.push(tk('calc_out.section.ai_image_cost_best_provider','\uD83C\uDFAF Best Provider by Use Case:'));o.push(SEP3.repeat(50));" +
  "o.push(tk('calc_out.ai_image_cost.row.use_case_text','\u2022 \uD83D\uDCDD Text in images (logos, signs, UI):  \u2192 Ideogram 3 (best text rendering)'));" +
  "o.push(tk('calc_out.ai_image_cost.row.use_case_artistic','\u2022 \uD83C\uDFA8 Artistic / creative work:           \u2192 Midjourney V7 (aesthetic quality)'));" +
  "o.push(tk('calc_out.ai_image_cost.row.use_case_budget','\u2022 \uD83D\uDCB0 Budget is #1 concern:              \u2192 Stable Diffusion 4 ($'+fp3(PS['stable-diffusion-4'].pi)+'/image)',{price:'$'+fp3(PS['stable-diffusion-4'].pi)+'/image'}));" +
  "o.push(tk('calc_out.ai_image_cost.row.use_case_complex','\u2022 \uD83E\uDDE9 Complex multi-object prompts:      \u2192 DALL-E 4 (instruction following)'));" +
  "o.push(tk('calc_out.ai_image_cost.row.use_case_volume','\u2022 \uD83D\uDCE6 Maximum volume (5000+ imgs/mo):    \u2192 Midjourney V7 Mega ($60-120/mo)'));" +
  "o.push('');" +
  "o.push(tk('calc_out.ai_image_cost.row.for_your_case','\uD83D\uDCA1 For your case ('+lc(im)+' imgs/mo via '+p.n+'):',{imgs:lc(im),name:p.n}));" +
  "if(p.pi>=PS['dalle-3'].pi&&im<500){var ac3=im*PS['ideogram-3'].pi;o.push(tk('calc_out.ai_image_cost.row.final_switch_ideogram','   Switch to Ideogram 3 ($'+fp3(PS['ideogram-3'].pi)+'/img) to save $'+fn(mc-ac3)+'/mo with similar quality.',{price:'$'+fp3(PS['ideogram-3'].pi)+'/img',save:'$'+fn(mc-ac3)+'/mo'}));}" +
  "else if(p.pi>=PS['ideogram-3'].pi&&im<100){var ac3=im*PS['stable-diffusion-4'].pi;o.push(tk('calc_out.ai_image_cost.row.final_sd4_cheaper','   At <100 imgs/mo, SD 4 API is '+Math.round(pic/PS['stable-diffusion-4'].pi)+'x cheaper ($'+fn(ac3)+' vs $'+fn(mc)+'/mo).',{mult:String(Math.round(pic/PS['stable-diffusion-4'].pi)),alt:'$'+fn(ac3),cur:'$'+fn(mc)+'/mo'}));}" +
  "else if(p.is&&im<100){var ac3=im*PS['ideogram-3'].pi;o.push(tk('calc_out.ai_image_cost.row.final_sub_underutilized','   Subscription is underutilized. Per-image (Ideogram 3) would be ~$'+fn(ac3)+'/mo.',{cost:'$'+fn(ac3)+'/mo'}));}" +
  "else{o.push(tk('calc_out.ai_image_cost.row.final_well_matched','   Your current choice is well-matched to your volume and quality needs.'));}" +
  // P168 B3-9：⭐ 返回**整份输出**的单元素数组 —— 页面（src/pages/[lang]/[slug].astro:2186）对 custom 型**只渲染 results[0]**
  //   ⇒ 多元素数组会让动态卡片只剩第一行（同一形态 B3-8 已在 ai-api-cost-comparison 修复并验证）。
  "return [o.join('\\n')];"

const engine: ToolEngine = {
  slug: 'solopreneur-ai-image-cost-calculator',
  title: 'AI Image Generation Cost Calculator',
  description: 'Compare costs across 7 AI image providers (DALL-E 4/3, Midjourney V7, SD 4, Ideogram 3, Flux Pro, Leonardo AI). Subscription vs API pricing, break-even analysis, what-if scenarios, and use-case recommendations.',
  inputs: [
    { name: 'provider', label: 'Provider', placeholder: '', type: 'select', options: ['dalle-4', 'dalle-3', 'midjourney-v7', 'stable-diffusion-4', 'ideogram-3', 'flux-pro', 'leonardo'] },
    { name: 'imagesPerMonth', label: 'Images per Month', placeholder: 'e.g. 100', type: 'number' },
    { name: 'resolution', label: 'Resolution', placeholder: '', type: 'select', options: ['1024×1024', '1792×1024', '1024×1792', '2048×2048', '512×512', '1280×720', '1536×1536'] },
    { name: 'batchSize', label: 'Batch Size (Images per Call)', placeholder: 'e.g. 1', type: 'number' },
    { name: 'advancedMode', label: 'Quality Mode', placeholder: '', type: 'select', options: ['standard', 'hd', 'ultra'] },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
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
  generate(inputs) { return calculate(inputs); },
  // P151: preset chips — replaces dead PRESETS const. Each preset fills
  // the form inputs from preset.fields; the page renders one button per entry.
  presets: [
    { key: 'solopreneur', emoji: '💼', fields: { provider: 'dalle-3',                imagesPerMonth: '100',  resolution: '1024×1024', batchSize: '1', advancedMode: 'standard' } },
    { key: 'creator',     emoji: '🎨', fields: { provider: 'midjourney-v7',         imagesPerMonth: '500',  resolution: '2048×2048', batchSize: '4', advancedMode: 'standard' } },
    { key: 'agency',      emoji: '🏢', fields: { provider: 'dalle-4',                imagesPerMonth: '1000', resolution: '1024×1024', batchSize: '4', advancedMode: 'hd'       } },
    { key: 'budget',      emoji: '💰', fields: { provider: 'stable-diffusion-4',    imagesPerMonth: '5000', resolution: '512×512',  batchSize: '8', advancedMode: 'standard' } },
    { key: 'logos',       emoji: '🔤', fields: { provider: 'ideogram-3',             imagesPerMonth: '300',  resolution: '1024×1024', batchSize: '2', advancedMode: 'standard' } },
    { key: 'artistic',    emoji: '🖼️', fields: { provider: 'flux-pro',               imagesPerMonth: '800',  resolution: '2048×2048', batchSize: '2', advancedMode: 'hd'       } },
  ],
  staticExamples: [
    '\n$calc_out.ai_image_cost.row.header_estimate{"name":"DALL-E 3"}|🎨 DALL-E 3 Cost Estimate|\n\n$calc_out.label.quality|Quality|: Very High | $calc_out.label.resolution|Resolution|: 1024×1024 | $calc_out.label.batch|Batch|: 1$calc_out.ai_image_cost.row.unit_per_generation|/gen|\n$calc_out.label.pricing|Pricing|: $calc_out.ai_image_cost.row.pricing_model_per_image|Per-Image| $0.080\n\n$calc_out.section.ai_image_cost_summary|💰 Cost Summary|\n──────────────────────────────────────────────────\n$calc_out.label.per_image|Per Image|: $0.08\n$calc_out.label.monthly_cost|Monthly Cost| (100$calc_out.ai_image_cost.row.unit_images| images|): $8.00\n$calc_out.label.annual_cost|Annual Cost|: $96.00\n\n$calc_out.label.daily_avg|Daily Avg|: $0.27 (3$calc_out.ai_image_cost.row.unit_images_per_day| images/day|)\n\n$calc_out.ai_image_cost.row.section_all_providers{"imgs":"100"}|📊 All Providers — Monthly Cost at 100 images/mo|\n──────────────────────────────────────────────────\n   DALL-E 4              ███████████████████████████████████   $12.00\n   DALL-E 3              ███████████████████████               $8.00\n   Midjourney V7$calc_out.ai_image_cost.row.unit_subscription_tag| (sub)|   █████████████████████████████         $10.00/mo\n✅ SD 4 (API)            █                                     $0.30\n   Ideogram 3            ████████████                          $4.00\n   Flux Pro              ███████████████                       $5.00\n   Leonardo AI$calc_out.ai_image_cost.row.unit_subscription_tag| (sub)|     ███████████████████████████████████   $12.00/mo\n\n$calc_out.section.ai_image_cost_health|🩺 Cost Health:|\n──────────────────────────────────────────────────\n$calc_out.ai_image_cost.row.health_mid_market{"price":"$0.08"}|• 🟡 Mid-market — $0.08/image is around the average.|\n$calc_out.ai_image_cost.row.health_alt_per_image_correct{"imgs":"100","be":"125"}|• ✅ Per-image is correct for 100 imgs/mo. Break-even: 125 imgs.|\n\n$calc_out.section.ai_image_cost_provider_comparison|📋 Subscription vs API — Price Comparison|\n──────────────────────────────────────────────────\n$calc_out.label.volume|Volume|     | DALL-E 4       | DALL-E 3       | Midjourney V7  | SD 4 (API)     | Ideogram 3     | Flux Pro       | Leonardo AI   \n─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────\n50         | $6.00          | $4.00          | $10.00         | $0.15          | $2.00          | $2.50          | $12.00        \n200        | $24.00         | $16.00         | $10.00         | $0.60          | $8.00          | $10.00         | $12.00        \n500        | $60.00         | $40.00         | $30.00         | $1.50          | $20.00         | $25.00         | $29.00        \n1,000      | $120.00        | $80.00         | $30.00         | $3.00          | $40.00         | $50.00         | $29.00        \n5,000      | $600.00        | $400.00        | $120.00        | $15.00         | $200.00        | $250.00        | $49.00        \n\n$calc_out.section.ai_image_cost_break_even|⚖️ Break-Even: When Subscription Beats Per-Image|\n──────────────────────────────────────────────────\n$calc_out.ai_image_cost.row.break_even_line{"api":"DALL-E 4","sub":"Midjourney V7","price":"$10/mo","be":"84"}|  DALL-E 4 → Midjourney V7 ($10/mo): 84 imgs/mo break-even|\n$calc_out.ai_image_cost.row.break_even_line{"api":"DALL-E 3","sub":"Midjourney V7","price":"$10/mo","be":"125"}|  DALL-E 3 → Midjourney V7 ($10/mo): 125 imgs/mo break-even|\n$calc_out.ai_image_cost.row.break_even_line{"api":"SD 4 (API)","sub":"Midjourney V7","price":"$10/mo","be":"3,334"}|  SD 4 (API) → Midjourney V7 ($10/mo): 3,334 imgs/mo break-even|\n$calc_out.ai_image_cost.row.break_even_line{"api":"Ideogram 3","sub":"Midjourney V7","price":"$10/mo","be":"250"}|  Ideogram 3 → Midjourney V7 ($10/mo): 250 imgs/mo break-even|\n$calc_out.ai_image_cost.row.break_even_line{"api":"Flux Pro","sub":"Midjourney V7","price":"$10/mo","be":"200"}|  Flux Pro → Midjourney V7 ($10/mo): 200 imgs/mo break-even|\n$calc_out.ai_image_cost.row.break_even_line{"api":"DALL-E 4","sub":"Leonardo AI","price":"$12/mo","be":"100"}|  DALL-E 4 → Leonardo AI ($12/mo): 100 imgs/mo break-even|\n$calc_out.ai_image_cost.row.break_even_line{"api":"DALL-E 3","sub":"Leonardo AI","price":"$12/mo","be":"150"}|  DALL-E 3 → Leonardo AI ($12/mo): 150 imgs/mo break-even|\n$calc_out.ai_image_cost.row.break_even_line{"api":"SD 4 (API)","sub":"Leonardo AI","price":"$12/mo","be":"4,000"}|  SD 4 (API) → Leonardo AI ($12/mo): 4,000 imgs/mo break-even|\n$calc_out.ai_image_cost.row.break_even_line{"api":"Ideogram 3","sub":"Leonardo AI","price":"$12/mo","be":"300"}|  Ideogram 3 → Leonardo AI ($12/mo): 300 imgs/mo break-even|\n$calc_out.ai_image_cost.row.break_even_line{"api":"Flux Pro","sub":"Leonardo AI","price":"$12/mo","be":"240"}|  Flux Pro → Leonardo AI ($12/mo): 240 imgs/mo break-even|\n\n$calc_out.section.ai_image_cost_volume_scenarios|📈 Volume Scenarios at Different Batch Sizes|\n──────────────────────────────────────────────────\n$calc_out.label.batch_size|Batch Size| | $calc_out.label.images_per_month|Images/Mo| | $calc_out.label.cost_per_month|Cost/Mo|    | $calc_out.label.generations_needed|Generations Needed|\n──────────┼───────────┼────────────┼───────────────────\n1         │ 100       │ $8.00      │ 100$calc_out.ai_image_cost.row.batch_runs{"runs":"1"}| runs of 1 imgs each|\n4         │ 100       │ $8.00      │ 25$calc_out.ai_image_cost.row.batch_runs{"runs":"4"}| runs of 4 imgs each|\n8         │ 100       │ $8.00      │ 13$calc_out.ai_image_cost.row.batch_runs{"runs":"8"}| runs of 8 imgs each|\n16        │ 100       │ $8.00      │ 7$calc_out.ai_image_cost.row.batch_runs{"runs":"16"}| runs of 16 imgs each|\n32        │ 100       │ $8.00      │ 4$calc_out.ai_image_cost.row.batch_runs{"runs":"32"}| runs of 32 imgs each|\n\n$calc_out.ai_image_cost.row.tip_batch_sizes|💡 Larger batch sizes = fewer API calls. Some providers limit batch to 4-10 images per generation.|\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n──────────────────────────────────────────────────\n$calc_out.ai_image_cost.row.whatif_cut_in_half{"save":"4.00","cur":"8.00","half":"4.00"}|• Cut volume in half: Save $4.00/mo ($8.00 → $4.00)|\n$calc_out.ai_image_cost.row.whatif_sd4_saves{"price":"$0.003/img","cost":"$0.30/mo","save":"$7.70/mo"}|• Switch to SD 4 API ($0.003/img): $0.30/mo  (saves $7.70/mo)|\n$calc_out.ai_image_cost.row.whatif_switch_sub_costs_more{"sub":"Midjourney V7","price":"$10/mo","diff":"$2.00/mo"}|• Switch to Midjourney V7 ($10/mo): +$2.00/mo vs pay-per-image|\n$calc_out.ai_image_cost.row.whatif_double_volume{"imgs":"200","cost":"$16.00/mo"}|• Double volume to 200 imgs/mo: $16.00/mo|\n\n$calc_out.section.ai_image_cost_best_provider|🎯 Best Provider by Use Case:|\n──────────────────────────────────────────────────\n$calc_out.ai_image_cost.row.use_case_text|• 📝 Text in images (logos, signs, UI):  → Ideogram 3 (best text rendering)|\n$calc_out.ai_image_cost.row.use_case_artistic|• 🎨 Artistic / creative work:           → Midjourney V7 (aesthetic quality)|\n$calc_out.ai_image_cost.row.use_case_budget{"price":"$0.003/image"}|• 💰 Budget is #1 concern:              → Stable Diffusion 4 ($0.003/image)|\n$calc_out.ai_image_cost.row.use_case_complex|• 🧩 Complex multi-object prompts:      → DALL-E 4 (instruction following)|\n$calc_out.ai_image_cost.row.use_case_volume|• 📦 Maximum volume (5000+ imgs/mo):    → Midjourney V7 Mega ($60-120/mo)|\n\n$calc_out.ai_image_cost.row.for_your_case{"imgs":"100","name":"DALL-E 3"}|💡 For your case (100 imgs/mo via DALL-E 3):|\n$calc_out.ai_image_cost.row.final_switch_ideogram{"price":"$0.04/img","save":"$4.00/mo"}|   Switch to Ideogram 3 ($0.04/img) to save $4.00/mo with similar quality.|',
  ],
  faq: [
    { q: 'Which AI image generator is cheapest in 2026?', a: '{{liveImageCheapest:stable-diffusion-4}} at {{liveImagePerImage:stable-diffusion-4}}/image is by far the cheapest — {{liveImageMonthly:stable-diffusion-4|1000}}/mo for 1000 images. For subscription-based, Midjourney V7 at {{liveImageSubRange:midjourney-v7}} and Leonardo AI at {{liveImageSubRange:leonardo}} become the cheapest at higher volumes (200+ images/month). DALL-E 3 ({{liveImagePerImageTrim:dalle-3}}) and Ideogram 3 ({{liveImagePerImageTrim:ideogram-3}}) are the mid-range per-image options.' },
    { q: 'Should I pay per image or use a subscription?', a: 'For under 100 images/month: pay-per-image (DALL-E 3 or SD 4) is cheapest. For 100-500/month: Midjourney Basic ({{liveImageSubTier:midjourney-v7|0}}/mo) or Ideogram 3. For 500-2000/month: Midjourney Pro ({{liveImageSubTier:midjourney-v7|1}}/mo) or Leonardo ({{liveImageSubTier:leonardo|1}}/mo). For 5,000+/month: Midjourney Mega ({{liveImageSubTier:midjourney-v7|2}}-{{liveImageSubTier:midjourney-v7|3}}/mo) or self-hosted SD 4. Subscriptions offer unlimited or high-volume relaxed generation.' },
    { q: 'Which provider is best for text in images?', a: 'Ideogram 3 is the undisputed leader for text rendering in images (logos, signs, UI mockups). Flux Pro is excellent for text. DALL-E 4 has significantly improved text accuracy. Midjourney V7 still struggles with longer text strings. For any image requiring readable text, choose Ideogram 3 first.' },
    { q: 'Can I use AI-generated images commercially?', a: 'Yes, for all major platforms. DALL-E (OpenAI) and Midjourney grant full commercial rights to generated images. Stable Diffusion models vary by license — check the specific model. Leonardo AI grants commercial rights on paid plans. Always review the latest terms of service, especially for trademark use.' },
    { q: 'What resolution should I choose for my use case, and is HD quality mode worth it?', a: 'For web/social media: 1024x1024 is sufficient. For print/magazines: 2048x2048 or higher. For widescreen/banners: 1792x1024 (DALL-E). For mobile stories: 1024x1792 (DALL-E). DALL-E 3/4 charge the same for all resolutions, so resolution itself is free — but quality mode is not: HD costs {{liveImageAdvMult:hd}}x the standard per-image price and ultra {{liveImageAdvMult:ultra}}x, which pays off only when the extra detail is visible (print, large format).' },
    { q: 'How does Midjourney V7 compare to DALL-E 4?', a: 'Midjourney V7 produces more aesthetically pleasing, artistic images with superior lighting and composition — preferred by designers and artists. DALL-E 4 excels at following complex, multi-object prompts and renders text more accurately. For creative/artistic work, Midjourney wins. For precise, instruction-following commercial work, DALL-E 4 is better.' },
    { q: 'What is the best provider for solopreneurs on a budget?', a: 'For absolute minimum cost: Stable Diffusion 4 API at {{liveImagePerImageTrim:stable-diffusion-4}}/image (5000 images = {{liveImageMonthly:stable-diffusion-4|5000}}/mo). For best quality/cost balance: Ideogram 3 at {{liveImagePerImageTrim:ideogram-3}}/image (500 images = {{liveImageMonthly:ideogram-3|500}}/mo). For unlimited creative freedom: Midjourney V7 Basic at {{liveImageSubTier:midjourney-v7|0}}/mo. Most solopreneurs benefit from a combo: Midjourney for creative + Ideogram for text-heavy images.' },
    { q: "What is the cheapest image generation API in 2026?", a: "Together AI ($0.0008/image for SDXL) and Stability AI direct ($0.003-$0.02) are the cheapest at SDXL quality. For premium DALL-E 3 quality: {{liveImagePerImageTrim:dalle-3}}-{{liveImagePerImageTrim:dalle-4}}/image. For Flux Pro: {{liveImagePerImageTrim:flux-pro}}/image. Cost varies by an order of magnitude between providers at the same quality tier." },
    { q: "How do I choose between SDXL, DALL-E, and Flux?", a: "SDXL: open-source, cheap, a fraction of a cent per image, good for high-volume. DALL-E 3: best instruction following, {{liveImagePerImageTrim:dalle-3}}-{{liveImagePerImageTrim:dalle-4}}/image, premium quality. Flux Pro: best aesthetic + prompt adherence, {{liveImagePerImageTrim:flux-pro}}/image. Pick based on volume + quality needs. SDXL for 1000s/day, DALL-E for premium creative." },
    { q: "How do I reduce image generation costs?", a: "Batch jobs, use cheaper models for drafts, cache common prompts, downgrade to lower resolution when possible, use LoRA fine-tuning to specialize rather than re-prompting, use Black Forest Labs FLUX schnell for fast drafts." },
    { q: "What is the resolution-pricing tradeoff?", a: "Higher resolution = more compute = higher cost. 1024x1024 vs 512x512 is typically 4x the cost. For thumbnails and social previews, 512x512 is sufficient. For product photos and hero images, 1024x1024+ is required. Use 1024x1024 only when display demands it." },
    { q: "Should I use image gen or stock photos?", a: "Stock photos: $0.10-5/image, predictable, often legally safer. Image gen: a fraction of a cent per image, customized, unique. For high-volume marketing visuals, image gen wins. For one-off hero images, brand-specific needs, or product photography, stock + Photoshop hybrid is often better." },
    { q: "How do I estimate cost for a content pipeline?", a: "Sum (images_pipeline × cost_per_image). For 1000 blog posts/month at 1 hero + 3 inline images each = 4000 images. At a mid-tier per-image price: {{liveImageMonthly:stable-diffusion-4|4000}}/month for 4000 images. At a premium per-image price: {{liveImageMonthly:dalle-4|4000}}/month for the same 4000 images. Track images per article, optimize prompts to reduce retries." },
    { q: "What is the difference between real-time and batch image gen?", a: "Real-time: 1-5s per image, for interactive UIs. Batch: 50-70% off, 1-24h turnaround, for bulk generation. Use batch for: product catalogs, content libraries, marketing assets. Reserve real-time for: user-facing apps, on-demand generation." },
    { q: "How do I handle image gen failures and retries?", a: "Most APIs have 5-10% failure rate (content filters, model errors, timeouts). Implement retry with exponential backoff (3-5 attempts). Track failure rate by prompt. For high-value outputs, generate 2-3 variants and pick the best. Budget +10-20% for retries." },
  ],
  howToUse: [
    'Select your preferred AI image generation provider from the 7 options.',
    'Enter your estimated monthly image generation volume.',
    'Choose your target resolution — higher resolutions may use more credits on some platforms.',
    'Set the batch size (images per API call) to optimize generation throughput.',
    'Pick standard, HD, or ultra quality mode — higher quality multiplies cost by 1.3x-1.8x.',
    'Review the bar chart, break-even analysis, and use-case recommendations to find the best deal for your needs.',
  ],
  dataLastUpdated: PRICING.lastUpdated,
  engineKey: true,
};

registerEngine(engine);
