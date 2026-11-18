import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
import PRICING from '../../data/ai-pricing.json';
// P168 B3-10：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

interface ProviderInfo {
  name: string;
  spotMult: number;
  reservedMult: number;
  rates: Record<string, number>;
  order: number;
}

const GPU_NAMES: Record<string, string> = {
  'H200': 'H200 141GB',
  'H100': 'H100 80GB',
  'A100': 'A100 80GB',
  'L40S': 'L40S 48GB',
  'RTX4090': 'RTX 4090 24GB',
  'A6000': 'RTX A6000 48GB',
};

const PROVIDERS: Record<string, ProviderInfo> = PRICING.gpu.providers as unknown as Record<string, ProviderInfo>;

// Storage cost per GB per month (attached SSD)
const STORAGE_COST_PER_GB = PRICING.gpu.storagePerGB;

// Networking egress cost per GB
const NETWORK_EGRESS_PER_GB = PRICING.gpu.egressPerGB;

// Storage tiers (GB)
const STORAGE_SIZES = [100, 500, 1000, 5000];

// Pricing tier labels
const TIER_LABELS: Record<string, string> = {
  'on-demand': 'On-Demand',
  'spot': 'Spot/Preemptible',
  'reserved': 'Reserved (1yr)',
};

/**
 * P168 B3-10：定价档位标签的 token —— 三档**各有自己的 code**。
 *
 * ⭐ 为什么不用「一个 code + 三种兜底」：locale 的 en 值只有一个
 *   ⇒ 兜底与 locale 不一致 ⇒ G8（兜底渲染 == locale.en 渲染）会红。
 * ⇒ 每个 code 的兜底**恒定**，三档三键。
 */
function tierLabelToken(tier: string): string {
  if (tier === 'spot') return makeToken('calc_out.gpu_cloud_cost.row.tier_label_spot', TIER_LABELS.spot);
  if (tier === 'reserved') return makeToken('calc_out.gpu_cloud_cost.row.tier_label_reserved', TIER_LABELS.reserved);
  return makeToken('calc_out.gpu_cloud_cost.row.tier_label_on_demand', TIER_LABELS['on-demand']);
}

function fmt(n: number): string { return '$' + n.toFixed(2); }
function lc(n: number): string { return n.toLocaleString(); }
function pad(s: string, len: number): string { return s + ' '.repeat(Math.max(0, len - s.length)); }
const SEP = '─';

function calculate(inputs: Record<string, string>): string[] {
  const provKey = inputs.provider || 'runpod';
  const prov = PROVIDERS[provKey] || PROVIDERS['runpod'];
  const gpuKey = inputs.gpuType || 'A100';
  const gpuCount = Math.max(1, Math.min(1000, clampNonNegative(parseInt(inputs.gpuCount)) || 1));
  const hoursPerDay = Math.max(0.5, Math.min(24, clampNonNegative(parseInt(inputs.hoursPerDay)) || 8));
  const pricingTier = inputs.pricingTier || 'on-demand';
  const includeStorage = inputs.includeStorage !== 'no';

  // Base hourly rate
  const baseRate = prov.rates[gpuKey] || 1.00;

  // Apply pricing tier multiplier
  let tierMult = 1;
  if (pricingTier === 'spot') tierMult = prov.spotMult;
  else if (pricingTier === 'reserved') tierMult = prov.reservedMult;
  const effectiveRate = baseRate * tierMult;

  // GPU costs
  const dailyGpuHours = hoursPerDay * gpuCount;
  const dailyCost = dailyGpuHours * effectiveRate;
  const monthlyCost = dailyCost * 30;
  const annualCost = monthlyCost * 12;

  // Storage costs (monthly)
  const storageCosts: Record<string, number> = {};
  if (includeStorage) {
    for (const size of STORAGE_SIZES) {
      storageCosts[String(size)] = size * STORAGE_COST_PER_GB;
    }
  }

  // Networking (estimated egress: 10% of storage per month)
  const estimatedEgress = includeStorage ? 50 * NETWORK_EGRESS_PER_GB : 0;

  const out: string[] = [];
  // P168 B3-10：⭐「📅 Pricing last updated」这一行**从卡片正文里去掉** ——
  //   · 页面用**徽章**显示同一个日期（dataLastUpdated → 「📅 Data updated」）
  //   · codegen 写 staticExamples[0] 时也会过滤掉它（"UI badge covers it"）
  //   ⇒ 留在正文里只会与徽章重复（同一形态 ai-api-cost-comparison / ai-training 已处理）。
  //   ⚠️ 这里**保留空元素**⇒ out 数组与 staticExamples[0] 开头的 '\n' 逐字一致 ⇒ 英文页零变化。
  out.push('');

  // Section 1: Header
  out.push(('\u{1F5A5}️ ' + prov.name + ' ' + makeToken('calc_out.label.gpu_cost', 'GPU Cost') + ' — ' + tierLabelToken(pricingTier)) || pricingTier.toUpperCase());
  out.push('');
  out.push(
    makeToken('calc_out.gpu_cloud_cost.row.gpu_config', 'GPU: ' + gpuCount + '× ' + GPU_NAMES[gpuKey], { gpus: String(gpuCount), gpu: GPU_NAMES[gpuKey] }) + ' | ' +
    makeToken('calc_out.gpu_cloud_cost.row.base_rate', 'Base Rate: ' + fmt(baseRate) + '/hr', { rate: fmt(baseRate) }),
  );
  if (pricingTier !== 'on-demand') {
    const discount = Math.round((1 - tierMult) * 100);
    out.push(
      makeToken('calc_out.label.tier', 'Tier') + ': ' + tierLabelToken(pricingTier) + ' ' +
      makeToken('calc_out.gpu_cloud_cost.row.tier_discount', '(' + discount + '% discount) → Effective: ' + fmt(effectiveRate) + '/hr', { discount: String(discount), rate: fmt(effectiveRate) }),
    );
  }
  out.push(makeToken('calc_out.gpu_cloud_cost.row.usage', 'Usage: ' + hoursPerDay + ' hrs/day → ' + lc(dailyGpuHours) + ' GPU-hrs/day', { hours: String(hoursPerDay), gpuHours: lc(dailyGpuHours) }));
  out.push('');

  // Section 2: Cost Summary
  out.push('$calc_out.section.gpu_cloud_cost_breakdown|\u{1F4B0} Cost Breakdown|');
  out.push(SEP.repeat(50));
  out.push(makeToken('calc_out.gpu_cloud_cost.row.daily_gpu_cost', 'Daily GPU Cost (' + lc(dailyGpuHours) + ' hrs)', { hours: lc(dailyGpuHours) }) + ':   ' + fmt(dailyCost));
  out.push(makeToken('calc_out.gpu_cloud_cost.row.monthly_gpu_cost', 'Monthly GPU Cost (30 days)') + ': ' + fmt(monthlyCost));
  out.push(makeToken('calc_out.gpu_cloud_cost.row.annual_gpu_cost', 'Annual GPU Cost') + ':            ' + fmt(annualCost));
  if (includeStorage) {
    out.push('');
    out.push(makeToken('calc_out.gpu_cloud_cost.row.storage_networking', 'Storage + Networking:'));
    out.push('  ' + makeToken('calc_out.gpu_cloud_cost.row.storage_500gb', 'Storage (500GB SSD)') + ': ' + fmt(500 * STORAGE_COST_PER_GB) + '/mo');
    out.push('  ' + makeToken('calc_out.gpu_cloud_cost.row.egress_50gb', 'Est. Egress (50GB)') + ':   ' + fmt(estimatedEgress) + '/mo');
    const totalMonthly = monthlyCost + 500 * STORAGE_COST_PER_GB + estimatedEgress;
    out.push('  ' + makeToken('calc_out.gpu_cloud_cost.row.total_monthly', 'Total Monthly') + ':        ' + fmt(totalMonthly));
  }
  out.push('');

  // Section 3: Bar Chart — all providers at this GPU + config
  out.push(makeToken('calc_out.gpu_cloud_cost.row.multi_provider_comparison', '\u{1F4CA} Multi-Provider Comparison — ' + gpuCount + '× ' + GPU_NAMES[gpuKey], { gpus: String(gpuCount), gpu: GPU_NAMES[gpuKey] }));
  out.push(SEP.repeat(50));
  const sortedProviders = Object.values(PROVIDERS).sort((a, b) => a.order - b.order);
  const allCosts: { name: string; cost: number }[] = [];

  for (const sp of sortedProviders) {
    const spRate = sp.rates[gpuKey] || 1.00;
    const spEffRate = spRate * tierMult;
    const spMonthly = hoursPerDay * gpuCount * spEffRate * 30;
    allCosts.push({ name: sp.name, cost: spMonthly });
  }

  const maxCost = Math.max(...allCosts.map(c => c.cost), 1);
  const cheapest = allCosts.reduce((min, c) => c.cost < min.cost ? c : min);
  const BAR_WIDTH = 35;

  for (const c of allCosts) {
    const ratio = c.cost / maxCost;
    const isCheapest = c === cheapest;
    const barChar = isCheapest ? '░' : '█';
    const barLen = Math.max(1, Math.round(ratio * BAR_WIDTH));
    out.push(
      pad(c.name, 18) + ' ' +
      barChar.repeat(barLen) + ' '.repeat(Math.max(0, BAR_WIDTH - barLen + 2)) +
      ' ' + fmt(c.cost) + '/mo',
    );
  }
  out.push('');

  // Section 4: Pricing Tier Comparison (spot vs on-demand vs reserved)
  out.push(makeToken('calc_out.gpu_cloud_cost.row.pricing_tier_comparison', '\u{1F4CA} Pricing Tier Comparison for ' + prov.name, { provider: prov.name }));
  out.push(SEP.repeat(50));
  const tiers: [string, number][] = [
    ['Spot (save ' + Math.round((1 - prov.spotMult) * 100) + '%)', prov.spotMult],
    ['On-Demand', 1],
    ['Reserved 1yr (save ' + Math.round((1 - prov.reservedMult) * 100) + '%)', prov.reservedMult],
  ];

  // ⭐ 对齐空格留在 token 之外（先按原英文 pad，再把标签那一截换掉）
  // ⚠️ 原码是 ' | Monthly'.padEnd(14) ⇒ pad 覆盖了**分隔符**⇒ slice 的起点也必须是 ' | Monthly'
  // ⚠️ 分隔线长度必须按**原英文表头**算（token 串长度 ≠ 渲染后长度）⇒ 另存一份英文表头
  const tierHdrEn = 'Tier'.padEnd(22) + ' | Monthly'.padEnd(14) + ' | Annual'.padEnd(16) + ' | Savings vs On-Demand';
  const tierCell = 'Tier'.padEnd(22);
  const monthlyCell = ' | Monthly'.padEnd(14);
  const annualCell = ' | Annual'.padEnd(16);
  let tierHdr = makeToken('calc_out.label.tier', 'Tier') + tierCell.slice('Tier'.length)
    + ' | ' + makeToken('calc_out.label.monthly', 'Monthly') + monthlyCell.slice(' | Monthly'.length)
    + ' | ' + makeToken('calc_out.label.annual', 'Annual') + annualCell.slice(' | Annual'.length)
    + ' | ' + makeToken('calc_out.label.savings_vs_on_demand', 'Savings vs On-Demand');
  out.push(tierHdr);
  out.push('─'.repeat(tierHdrEn.length));

  const onDemandMonthly = hoursPerDay * gpuCount * baseRate * 30;
  for (const [label, mult] of tiers) {
    const tm = hoursPerDay * gpuCount * baseRate * mult * 30;
    const savings = onDemandMonthly - tm;
    const pctSaved = onDemandMonthly > 0 ? Math.round((savings / onDemandMonthly) * 100) : 0;
    // ⚠️ 档位名带运行时折扣（Spot (save 40%)）⇒ 整段令牌化，pad 留在 token 之外
    const labelCell = pad(label, 22);
    const labelToken = label === 'On-Demand'
      ? makeToken('calc_out.gpu_cloud_cost.row.tier_label_on_demand', label)
      : label.startsWith('Spot')
      ? makeToken('calc_out.gpu_cloud_cost.row.tier_spot', label, { pct: String(Math.round((1 - prov.spotMult) * 100)) })
      : makeToken('calc_out.gpu_cloud_cost.row.tier_reserved', label, { pct: String(Math.round((1 - prov.reservedMult) * 100)) });
    out.push(
      labelToken + labelCell.slice(label.length) + ' | ' +
      pad(fmt(tm), 14) + ' | ' +
      pad(fmt(tm * 12), 16) + ' | ' +
      (savings > 0 ? makeToken('calc_out.gpu_cloud_cost.row.tier_savings', 'Save ' + fmt(savings) + '/mo (' + pctSaved + '%)', { saved: fmt(savings), pct: String(pctSaved) }) : '—'),
    );
  }
  out.push('');

  // Section 5: Multi-GPU Scaling
  out.push(makeToken('calc_out.gpu_cloud_cost.row.multi_gpu_scaling', '\u{1F504} Multi-GPU Scaling (' + prov.name + ', ' + GPU_NAMES[gpuKey] + ')', { provider: prov.name, gpu: GPU_NAMES[gpuKey] }));
  out.push(SEP.repeat(50));
  const gpuCounts = [1, 2, 4, 8, 16, 32, 64];
  const gpuCell = 'GPUs'.padEnd(8);
  let scaleHdr = makeToken('calc_out.label.gpus', 'GPUs') + gpuCell.slice('GPUs'.length);
  for (const gc of gpuCounts) scaleHdr += ' | ' + pad(lc(gc) + '×', 16);
  out.push(scaleHdr);
  let scaleSep = ''.padEnd(8, SEP);
  for (const _ of gpuCounts) scaleSep += '─┼─'.padEnd(17, SEP);
  out.push(scaleSep);
  const scaleMonthlyCell = 'Monthly'.padEnd(8);
  let monthlyRow = makeToken('calc_out.label.monthly', 'Monthly') + scaleMonthlyCell.slice('Monthly'.length);
  for (const gc of gpuCounts) {
    const cost = hoursPerDay * gc * effectiveRate * 30;
    monthlyRow += ' | ' + pad(fmt(cost), 16);
  }
  out.push(monthlyRow);
  out.push('');

  // Section 6: Storage + Networking Costs
  if (includeStorage) {
    out.push('$calc_out.section.gpu_cloud_cost_addons|\u{1F4BE} Storage & Networking Add-Ons|');
    out.push(SEP.repeat(50));
    out.push(makeToken('calc_out.gpu_cloud_cost.row.storage_ssd_rate', 'Storage (SSD): $' + STORAGE_COST_PER_GB.toFixed(2) + '/GB/month', { rate: STORAGE_COST_PER_GB.toFixed(2) }));
    out.push(makeToken('calc_out.gpu_cloud_cost.row.network_egress_rate', 'Network Egress: $' + NETWORK_EGRESS_PER_GB.toFixed(2) + '/GB', { rate: NETWORK_EGRESS_PER_GB.toFixed(2) }));
    out.push('');
    // ⚠️ 同上：原码是 ' | Cost/Mo'.padEnd(12) ⇒ slice 起点必须是 ' | Cost/Mo'
    // ⚠️ 同上：分隔线长度按**原英文表头**算
    const storeHdrEn = 'Storage'.padEnd(14) + ' | Cost/Mo'.padEnd(12) + ' | With GPU Total/Mo';
    const storeCell = 'Storage'.padEnd(14);
    const costMoCell = ' | Cost/Mo'.padEnd(12);
    let storeHdr = makeToken('calc_out.label.storage', 'Storage') + storeCell.slice('Storage'.length)
      + ' | ' + makeToken('calc_out.label.cost_per_month', 'Cost/Mo') + costMoCell.slice(' | Cost/Mo'.length)
      + ' | ' + makeToken('calc_out.label.with_gpu_total_month', 'With GPU Total/Mo');
    out.push(storeHdr);
    out.push('─'.repeat(storeHdrEn.length));
    for (const size of STORAGE_SIZES) {
      const sc = size * STORAGE_COST_PER_GB;
      const total = monthlyCost + sc + estimatedEgress;
      out.push(pad(lc(size) + ' GB', 14) + ' | ' + pad(fmt(sc), 12) + ' | ' + fmt(total));
    }
    out.push('');
  }

  // Tip
  out.push(makeToken('calc_out.gpu_cloud_cost.row.spot_reserved_tip', '\u{1F4A1} ' + prov.name + ' spot instances save ' + Math.round((1 - prov.spotMult) * 100) + '% but can be interrupted. Reserved instances save ' + Math.round((1 - prov.reservedMult) * 100) + '% with 1-year commitment. Cheapest provider for ' + GPU_NAMES[gpuKey] + ': ' + cheapest.name + ' at ' + fmt(cheapest.cost) + '/mo.', { provider: prov.name, gpu: GPU_NAMES[gpuKey], cheapest: cheapest.name, cost: fmt(cheapest.cost), spot: String(Math.round((1 - prov.spotMult) * 100)), reserved: String(Math.round((1 - prov.reservedMult) * 100)) }));
  // P168 B3-4：💡 Tip 改成**建议码**（语义码 + 参数）—— 英文句子搬进 locale，
  //   zh 页的动态层才会是中文。⚠️ 分支用**已有的 pricingTier**，不引入第二套阈值。
  //   ⚠️ customFn 里必须写**逐字相同**的一份（守卫「两套实现不许漂」守着这条）。
  const tipParams = { monthly: fmt(monthlyCost), rate: fmt(effectiveRate), hours: String(hoursPerDay), gpus: String(gpuCount) };
  let tip: string;
  if (pricingTier === 'spot') {
    tip = JSON.stringify({ code: 'gpu_cloud_spot', params: tipParams });
  } else if (pricingTier === 'reserved') {
    tip = JSON.stringify({ code: 'gpu_cloud_reserved', params: tipParams });
  } else {
    tip = JSON.stringify({ code: 'gpu_cloud_on_demand', params: tipParams });
  }
  out.push('💡 Tip: ' + tip);

  // 🩺 Cost Health (v3)
  out.push('');
  out.push('$calc_out.section.gpu_cloud_cost_health|🩺 Cost Health:|');
  out.push(SEP.repeat(60));
  const totalHourly = prov.rates[gpuKey] || 0;
  const totalMonthlyGpu = totalHourly * hoursPerDay * 30 * gpuCount;
  const totalMonthlyAll = totalMonthlyGpu + (includeStorage ? (100 * STORAGE_COST_PER_GB + 50 * NETWORK_EGRESS_PER_GB) : 0);
  if (totalHourly < 1) out.push(makeToken('calc_out.gpu_cloud_cost.row.health_tier_micro', '• 🟢 Micro-tier — under $1/hr. Perfect for inference, small training jobs.'));
  else if (totalHourly < 3) out.push(makeToken('calc_out.gpu_cloud_cost.row.health_tier_low', '• 🟢 Low-tier — $1-3/hr. Most training and inference workloads.'));
  else if (totalHourly < 8) out.push(makeToken('calc_out.gpu_cloud_cost.row.health_tier_mid', '• 🟡 Mid-tier — $3-8/hr. Larger training jobs, multi-GPU setups.'));
  else out.push(makeToken('calc_out.gpu_cloud_cost.row.health_tier_high', '• 🟠 High-tier — $' + totalHourly.toFixed(2) + '/hr. Premium GPUs for cutting-edge training.', { rate: totalHourly.toFixed(2) }));
  if (includeStorage) {
    const storageTotal = (100 * STORAGE_COST_PER_GB + 50 * NETWORK_EGRESS_PER_GB);
    const storagePct = storageTotal / Math.max(totalMonthlyAll, 0.01) * 100;
    if (storagePct > 30) out.push(makeToken('calc_out.gpu_cloud_cost.row.health_storage_high', '• ⚠️ Storage + egress is ' + Math.round(storagePct) + '% of total — review whether you need all that data online.', { pct: String(Math.round(storagePct)) }));
    else out.push(makeToken('calc_out.gpu_cloud_cost.row.health_storage_ok', '• 🟢 Storage + egress is only ' + Math.round(storagePct) + '% of total — well-optimized.', { pct: String(Math.round(storagePct)) }));
  }
  if (gpuCount >= 8) {
    out.push(makeToken('calc_out.gpu_cloud_cost.row.health_reserved_hint', '• 💡 At ' + gpuCount + ' GPUs, consider reserved instances: save ' + Math.round((1 - prov.reservedMult) * 100) + '% with 1-year commitment.', { gpus: String(gpuCount), pct: String(Math.round((1 - prov.reservedMult) * 100)) }));
  }
  out.push('');

  // 🔄 What-If Scenarios (v3)
  out.push('$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|');
  out.push(SEP.repeat(60));
  const cheapestProv = sortedProviders[0];
  if (prov !== cheapestProv) {
    const savings = (totalHourly - cheapestProv.rates[gpuKey]) * hoursPerDay * 30 * gpuCount;
    if (savings > 0) out.push(makeToken('calc_out.gpu_cloud_cost.row.whatif_switch_cheapest', '• Switch to ' + cheapestProv.name + ':  save ' + fmt(savings) + '/mo  (cheapest for ' + GPU_NAMES[gpuKey] + ')', { provider: cheapestProv.name, saved: fmt(savings), gpu: GPU_NAMES[gpuKey] }));
  } else {
    out.push(makeToken('calc_out.gpu_cloud_cost.row.whatif_already_cheapest', "• You're already on the cheapest provider for " + GPU_NAMES[gpuKey] + '!', { gpu: GPU_NAMES[gpuKey] }));
  }
  const spotSavings = totalMonthlyAll * (1 - prov.spotMult);
  out.push(makeToken('calc_out.gpu_cloud_cost.row.whatif_switch_spot', '• Switch to spot instances:  save ~' + fmt(spotSavings) + '/mo  (' + Math.round((1 - prov.spotMult) * 100) + '% off, but interruptible)', { saved: fmt(spotSavings), pct: String(Math.round((1 - prov.spotMult) * 100)) }));
  const reservedSavings = totalMonthlyAll * (1 - prov.reservedMult);
  out.push(makeToken('calc_out.gpu_cloud_cost.row.whatif_switch_reserved', '• 1-year reserved:  save ~' + fmt(reservedSavings) + '/mo  (guaranteed capacity)', { saved: fmt(reservedSavings) }));
  out.push(makeToken('calc_out.gpu_cloud_cost.row.whatif_halve_hours', '• Halve hours:  ' + fmt(totalMonthlyAll / 2) + '/mo  (workload at off-peak?)', { cost: fmt(totalMonthlyAll / 2) }));
  out.push(makeToken('calc_out.gpu_cloud_cost.row.whatif_double_hours', '• Double hours:  ' + fmt(totalMonthlyAll * 2) + '/mo', { cost: fmt(totalMonthlyAll * 2) }));
  out.push('');

  // P151 L5: Decision Recommendation 4-section block

  return out;
}

// customFn — exact sync with calculate()
const customFn =
  // P168 B3-10：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 两端输出逐字节相同，不可能漂移；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS +
  // P15 defensive clamp (preserved across codegen-customfn.mjs regen — sits before data-table markers)
  "var cnn=function(x){return Math.max(0,x)};" +
  "var GN={H200:'H200 141GB',H100:'H100 80GB',A100:'A100 80GB',L40S:'L40S 48GB',RTX4090:'RTX 4090 24GB',A6000:'RTX A6000 48GB'};" +
  "var PS2={" +
  "'runpod':{n:'RunPod',sm:0.6,rm:0.85,r:{H200:2.49,H100:1.99,A100:0.79,L40S:0.69,RTX4090:0.49,A6000:0.39},od:1}," +
  "'vastai':{n:'Vast.ai',sm:0.5,rm:0.8,r:{H200:2.2,H100:1.69,A100:0.69,L40S:0.59,RTX4090:0.44,A6000:0.35},od:2}," +
  "'lambdalabs':{n:'Lambda Labs',sm:0.7,rm:0.9,r:{H200:2.8,H100:2.49,A100:1.1,L40S:0.8,RTX4090:0.55,A6000:0.5},od:3}," +
  "'aws':{n:'AWS',sm:0.4,rm:0.7,r:{H200:5,H100:4,A100:3.5,L40S:1.2,RTX4090:0.8,A6000:0.65},od:4}," +
  "'gcp':{n:'GCP',sm:0.45,rm:0.75,r:{H200:4.5,H100:4.2,A100:2.8,L40S:1,RTX4090:0.7,A6000:0.6},od:5}," +
  "'azure':{n:'Azure',sm:0.5,rm:0.8,r:{H200:4.8,H100:3.8,A100:3,L40S:1.1,RTX4090:0.75,A6000:0.62},od:6}};" +

  "var SCPG2=0.1;var NEG2=0.08;var SS2=[100,500,1000,5000];" +
  "function fm3(n){return '$'+n.toFixed(2)}function lc3(n){return n.toLocaleString()}function pd3(s,l){return s+' '.repeat(Math.max(0,l-s.length))}" +
  "var SEP5='\\u2500';" +
  // P168 B3-10：定价档位标签的 token（三档三码，与服务端 tierLabelToken 一一对应）
  "function tt3(t){if(t==='spot')return tk('calc_out.gpu_cloud_cost.row.tier_label_spot','Spot/Preemptible');if(t==='reserved')return tk('calc_out.gpu_cloud_cost.row.tier_label_reserved','Reserved (1yr)');return tk('calc_out.gpu_cloud_cost.row.tier_label_on_demand','On-Demand');}" +
  "var pk2=inputs.provider||'runpod';var p2=PS2[pk2]||PS2['runpod'];" +
  "var gk2=inputs.gpuType||'A100';var gc3=Math.max(1,Math.min(1000,cnn(parseInt(inputs.gpuCount))||1));" +
  "var hpd2=Math.max(0.5,Math.min(24,cnn(parseInt(inputs.hoursPerDay))||8));" +
  "var pt=inputs.pricingTier||'on-demand';var iSt=inputs.includeStorage!=='no';" +
  "var bR=p2.r[gk2]||1;var tm2=1;" +
  "if(pt==='spot')tm2=p2.sm;else if(pt==='reserved')tm2=p2.rm;" +
  "var eR=bR*tm2;var dgh=hpd2*gc3;var dc2=dgh*eR;var mc2=dc2*30;var ac2=mc2*12;" +
  "var scs2={};if(iSt){for(var si2=0;si2<SS2.length;si2++){scs2[String(SS2[si2])]=SS2[si2]*SCPG2;}}" +
  "var eE2=iSt?50*NEG2:0;" +
  "var o=[];" +
  "o.push('');" +
  "o.push('\\u{1F5A5}\\uFE0F '+p2.n+' '+tk('calc_out.label.gpu_cost','GPU Cost')+' — '+tt3(pt));" +
  "o.push('');o.push(tk('calc_out.gpu_cloud_cost.row.gpu_config','GPU: '+gc3+'\\u00D7 '+GN[gk2],{gpus:String(gc3),gpu:GN[gk2]})+' | '+tk('calc_out.gpu_cloud_cost.row.base_rate','Base Rate: '+fm3(bR)+'/hr',{rate:fm3(bR)}));" +
  "if(pt!=='on-demand'){o.push(tk('calc_out.label.tier','Tier')+': '+tt3(pt)+' '+tk('calc_out.gpu_cloud_cost.row.tier_discount','('+Math.round((1-tm2)*100)+'% discount) \\u2192 Effective: '+fm3(eR)+'/hr',{discount:String(Math.round((1-tm2)*100)),rate:fm3(eR)}));}" +
  "o.push(tk('calc_out.gpu_cloud_cost.row.usage','Usage: '+hpd2+' hrs/day \\u2192 '+lc3(dgh)+' GPU-hrs/day',{hours:String(hpd2),gpuHours:lc3(dgh)}));o.push('');" +
  "o.push('$calc_out.section.gpu_cloud_cost_breakdown|\\u{1F4B0} Cost Breakdown|');o.push(SEP5.repeat(50));" +
  "o.push(tk('calc_out.gpu_cloud_cost.row.daily_gpu_cost','Daily GPU Cost ('+lc3(dgh)+' hrs)',{hours:lc3(dgh)})+':   '+fm3(dc2));" +
  "o.push(tk('calc_out.gpu_cloud_cost.row.monthly_gpu_cost','Monthly GPU Cost (30 days)')+': '+fm3(mc2));" +
  "o.push(tk('calc_out.gpu_cloud_cost.row.annual_gpu_cost','Annual GPU Cost')+':            '+fm3(ac2));" +
  "if(iSt){o.push('');o.push(tk('calc_out.gpu_cloud_cost.row.storage_networking','Storage + Networking:'));" +
  "o.push('  '+tk('calc_out.gpu_cloud_cost.row.storage_500gb','Storage (500GB SSD)')+': '+fm3(500*SCPG2)+'/mo');" +
  "o.push('  '+tk('calc_out.gpu_cloud_cost.row.egress_50gb','Est. Egress (50GB)')+':   '+fm3(eE2)+'/mo');" +
  "o.push('  '+tk('calc_out.gpu_cloud_cost.row.total_monthly','Total Monthly')+':        '+fm3(mc2+500*SCPG2+eE2));}" +
  "o.push('');" +
  "o.push(tk('calc_out.gpu_cloud_cost.row.multi_provider_comparison','\\u{1F4CA} Multi-Provider Comparison — '+gc3+'\\u00D7 '+GN[gk2],{gpus:String(gc3),gpu:GN[gk2]}));o.push(SEP5.repeat(50));" +
  "var sp2=[];for(var k3 in PS2)sp2.push(PS2[k3]);sp2.sort(function(a,b){return a.od-b.od;});" +
  "var acv=[];for(var i=0;i<sp2.length;i++){var spv=sp2[i];var sr=spv.r[gk2]||1;var se=sr*tm2;var sm2=hpd2*gc3*se*30;acv.push({n:spv.n,c:sm2});}" +
  "var mx2=Math.max.apply(Math,acv.map(function(c){return c.c;}));mx2=Math.max(mx2,1);" +
  "var ch2=acv.reduce(function(min,c){return c.c<min.c?c:min;});" +
  "var BW2=35;" +
  "for(var i=0;i<acv.length;i++){var cav=acv[i];var rt2=cav.c/mx2;var isCh2=cav===ch2;var bch2=isCh2?'\\u2591':'\\u2588';var bl2=Math.max(1,Math.round(rt2*BW2));" +
  "o.push(pd3(cav.n,18)+' '+bch2.repeat(bl2)+' '.repeat(Math.max(0,BW2-bl2+2))+' '+fm3(cav.c)+'/mo');}" +
  "o.push('');" +
  "o.push(tk('calc_out.gpu_cloud_cost.row.pricing_tier_comparison','\\u{1F4CA} Pricing Tier Comparison for '+p2.n,{provider:p2.n}));o.push(SEP5.repeat(50));" +
  "var ts=[['Spot (save '+Math.round((1-p2.sm)*100)+'%)',p2.sm],['On-Demand',1],['Reserved 1yr (save '+Math.round((1-p2.rm)*100)+'%)',p2.rm]];" +
  // ⚠️ 表头/分隔线按**服务端**口径（服务端是准的）⇒ ' | Monthly' 连分隔符一起 pad
  "var thEn='Tier'.padEnd(22)+' | Monthly'.padEnd(14)+' | Annual'.padEnd(16)+' | Savings vs On-Demand';" +
  "var tCell='Tier'.padEnd(22);var mCell=' | Monthly'.padEnd(14);var aCell=' | Annual'.padEnd(16);" +
  "var th3=tk('calc_out.label.tier','Tier')+tCell.slice('Tier'.length)+' | '+tk('calc_out.label.monthly','Monthly')+mCell.slice(' | Monthly'.length)+' | '+tk('calc_out.label.annual','Annual')+aCell.slice(' | Annual'.length)+' | '+tk('calc_out.label.savings_vs_on_demand','Savings vs On-Demand');o.push(th3);" +
  "o.push('\\u2500'.repeat(thEn.length));var odm2=hpd2*gc3*bR*30;" +
  "for(var ti=0;ti<ts.length;ti++){var tl=ts[ti];var tm3=hpd2*gc3*bR*tl[1]*30;var sv2=odm2-tm3;var ps3=odm2>0?Math.round((sv2/odm2)*100):0;" +
  "var lCell=pd3(tl[0],22);" +
  "var lTok=tl[0]==='On-Demand'?tk('calc_out.gpu_cloud_cost.row.tier_label_on_demand',tl[0]):tl[0].indexOf('Spot')===0?tk('calc_out.gpu_cloud_cost.row.tier_spot',tl[0],{pct:String(Math.round((1-p2.sm)*100))}):tk('calc_out.gpu_cloud_cost.row.tier_reserved',tl[0],{pct:String(Math.round((1-p2.rm)*100))});" +
  "o.push(lTok+lCell.slice(tl[0].length)+' | '+pd3(fm3(tm3),14)+' | '+pd3(fm3(tm3*12),16)+' | '+(sv2>0?tk('calc_out.gpu_cloud_cost.row.tier_savings','Save '+fm3(sv2)+'/mo ('+ps3+'%)',{saved:fm3(sv2),pct:String(ps3)}):'\\u2014'));}" +
  "o.push('');" +
  "o.push(tk('calc_out.gpu_cloud_cost.row.multi_gpu_scaling','\\u{1F504} Multi-GPU Scaling ('+p2.n+', '+GN[gk2]+')',{provider:p2.n,gpu:GN[gk2]}));o.push(SEP5.repeat(50));" +
  "var gcs2=[1,2,4,8,16,32,64];var gCell='GPUs'.padEnd(8);var sh2=tk('calc_out.label.gpus','GPUs')+gCell.slice(4);for(var gi=0;gi<gcs2.length;gi++)sh2+=' | '+pd3(lc3(gcs2[gi])+'\\u00D7',16);o.push(sh2);" +
  "var ss2=''.padEnd(8,SEP5);for(var gi2=0;gi2<gcs2.length;gi2++)ss2+='\\u2500\\u253C\\u2500'.padEnd(17,SEP5);o.push(ss2);" +
  "var mCell2='Monthly'.padEnd(8);var mrw=tk('calc_out.label.monthly','Monthly')+mCell2.slice(7);for(var gi3=0;gi3<gcs2.length;gi3++){var cst4=hpd2*gcs2[gi3]*eR*30;mrw+=' | '+pd3(fm3(cst4),16);}o.push(mrw);" +
  "o.push('');" +
  "if(iSt){" +
  "o.push('$calc_out.section.gpu_cloud_cost_addons|\\u{1F4BE} Storage & Networking Add-Ons|');o.push(SEP5.repeat(50));" +
  "o.push(tk('calc_out.gpu_cloud_cost.row.storage_ssd_rate','Storage (SSD): $'+SCPG2.toFixed(2)+'/GB/month',{rate:SCPG2.toFixed(2)}));o.push(tk('calc_out.gpu_cloud_cost.row.network_egress_rate','Network Egress: $'+NEG2.toFixed(2)+'/GB',{rate:NEG2.toFixed(2)}));o.push('');" +
  "var soEn='Storage'.padEnd(14)+' | Cost/Mo'.padEnd(12)+' | With GPU Total/Mo';" +
  "var sCell='Storage'.padEnd(14);var cCell=' | Cost/Mo'.padEnd(12);" +
  "var soh=tk('calc_out.label.storage','Storage')+sCell.slice('Storage'.length)+' | '+tk('calc_out.label.cost_per_month','Cost/Mo')+cCell.slice(' | Cost/Mo'.length)+' | '+tk('calc_out.label.with_gpu_total_month','With GPU Total/Mo');o.push(soh);" +
  "o.push('\\u2500'.repeat(soEn.length));" +
  "for(var si3=0;si3<SS2.length;si3++){var sz=SS2[si3];var sc3=sz*SCPG2;var tt=mc2+sc3+eE2;o.push(pd3(lc3(sz)+' GB',14)+' | '+pd3(fm3(sc3),12)+' | '+fm3(tt));}" +
  "o.push('');}" +
  "o.push(tk('calc_out.gpu_cloud_cost.row.spot_reserved_tip','\\u{1F4A1} '+p2.n+' spot instances save '+Math.round((1-p2.sm)*100)+'% but can be interrupted. Reserved instances save '+Math.round((1-p2.rm)*100)+'% with 1-year commitment. Cheapest provider for '+GN[gk2]+': '+ch2.n+' at '+fm3(ch2.c)+'/mo.',{provider:p2.n,gpu:GN[gk2],cheapest:ch2.n,cost:fm3(ch2.c),spot:String(Math.round((1-p2.sm)*100)),reserved:String(Math.round((1-p2.rm)*100))}));" +
  "var tipP={monthly:fm3(mc2),rate:fm3(eR),hours:String(hpd2),gpus:String(gc3)};" +
  "var tip='';" +
  "if(pt==='spot'){tip=JSON.stringify({code:'gpu_cloud_spot',params:tipP});}" +
  "else if(pt==='reserved'){tip=JSON.stringify({code:'gpu_cloud_reserved',params:tipP});}" +
  "else{tip=JSON.stringify({code:'gpu_cloud_on_demand',params:tipP});}" +
  "o.push('💡 Tip: ' + tip);" +
  // P168 B3-10：🩺 Cost Health + 🔄 What-If 两段**客户端原本缺失**（服务端有）
  //   ⇒ 与服务端逐字补齐（同一批 B3-8 §0.5 对 burn-rate 的裁定：客户端补齐缺失段）。
  //   ⚠️ 「💡 Tip: {json}」是**决策建议码**（B3-8 已确立的既有机制）⇒ **不令牌化**。
  "o.push('');" +
  "o.push('$calc_out.section.gpu_cloud_cost_health|\\uD83E\\uDE7A Cost Health:|');o.push(SEP5.repeat(60));" +
  "var th3h=p2.r[gk2]||0;var tmg=th3h*hpd2*30*gc3;var tma=tmg+(iSt?(100*SCPG2+50*NEG2):0);" +
  "if(th3h<1)o.push(tk('calc_out.gpu_cloud_cost.row.health_tier_micro','\\u2022 \\uD83D\\uDFE2 Micro-tier — under $1/hr. Perfect for inference, small training jobs.'));" +
  "else if(th3h<3)o.push(tk('calc_out.gpu_cloud_cost.row.health_tier_low','\\u2022 \\uD83D\\uDFE2 Low-tier — $1-3/hr. Most training and inference workloads.'));" +
  "else if(th3h<8)o.push(tk('calc_out.gpu_cloud_cost.row.health_tier_mid','\\u2022 \\uD83D\\uDFE1 Mid-tier — $3-8/hr. Larger training jobs, multi-GPU setups.'));" +
  "else o.push(tk('calc_out.gpu_cloud_cost.row.health_tier_high','\\u2022 \\uD83D\\uDFE0 High-tier — $'+th3h.toFixed(2)+'/hr. Premium GPUs for cutting-edge training.',{rate:th3h.toFixed(2)}));" +
  "if(iSt){var st2=(100*SCPG2+50*NEG2);var sp2b=st2/Math.max(tma,0.01)*100;" +
  "if(sp2b>30)o.push(tk('calc_out.gpu_cloud_cost.row.health_storage_high','\\u2022 \\u26A0\\uFE0F Storage + egress is '+Math.round(sp2b)+'% of total — review whether you need all that data online.',{pct:String(Math.round(sp2b))}));" +
  "else o.push(tk('calc_out.gpu_cloud_cost.row.health_storage_ok','\\u2022 \\uD83D\\uDFE2 Storage + egress is only '+Math.round(sp2b)+'% of total — well-optimized.',{pct:String(Math.round(sp2b))}));}" +
  "if(gc3>=8){o.push(tk('calc_out.gpu_cloud_cost.row.health_reserved_hint','\\u2022 \\uD83D\\uDCA1 At '+gc3+' GPUs, consider reserved instances: save '+Math.round((1-p2.rm)*100)+'% with 1-year commitment.',{gpus:String(gc3),pct:String(Math.round((1-p2.rm)*100))}));}" +
  "o.push('');" +
  "o.push('$calc_out.section.what_if_scenarios|\\uD83D\\uDD04 What-If Scenarios:|');o.push(SEP5.repeat(60));" +
  "var cp2=sp2[0];" +
  "if(p2!==cp2){var sv3=(th3h-cp2.r[gk2])*hpd2*30*gc3;if(sv3>0)o.push(tk('calc_out.gpu_cloud_cost.row.whatif_switch_cheapest','\\u2022 Switch to '+cp2.n+':  save '+fm3(sv3)+'/mo  (cheapest for '+GN[gk2]+')',{provider:cp2.n,saved:fm3(sv3),gpu:GN[gk2]}));}" +
  "else{o.push(tk('calc_out.gpu_cloud_cost.row.whatif_already_cheapest','\\u2022 You\\'re already on the cheapest provider for '+GN[gk2]+'!',{gpu:GN[gk2]}));}" +
  "var spSav=tma*(1-p2.sm);" +
  "o.push(tk('calc_out.gpu_cloud_cost.row.whatif_switch_spot','\\u2022 Switch to spot instances:  save ~'+fm3(spSav)+'/mo  ('+Math.round((1-p2.sm)*100)+'% off, but interruptible)',{saved:fm3(spSav),pct:String(Math.round((1-p2.sm)*100))}));" +
  "var rsSav=tma*(1-p2.rm);" +
  "o.push(tk('calc_out.gpu_cloud_cost.row.whatif_switch_reserved','\\u2022 1-year reserved:  save ~'+fm3(rsSav)+'/mo  (guaranteed capacity)',{saved:fm3(rsSav)}));" +
  "o.push(tk('calc_out.gpu_cloud_cost.row.whatif_halve_hours','\\u2022 Halve hours:  '+fm3(tma/2)+'/mo  (workload at off-peak?)',{cost:fm3(tma/2)}));" +
  "o.push(tk('calc_out.gpu_cloud_cost.row.whatif_double_hours','\\u2022 Double hours:  '+fm3(tma*2)+'/mo',{cost:fm3(tma*2)}));" +
  "o.push('');" +
  // P168 B3-9：⭐ 返回**整份输出**的单元素数组 —— 页面（src/pages/[lang]/[slug].astro:2186）对 custom 型**只渲染 results[0]**
  //   ⇒ 多元素数组会让动态卡片只剩第一行（同一形态 B3-8 已在 ai-api-cost-comparison 修复并验证）。
  "return [o.join('\\n')];";

const engine: ToolEngine = {
  slug: 'solopreneur-gpu-cloud-cost-calculator',
  title: 'GPU Cloud Cost Calculator',
  description: 'Compare GPU rental costs across 6 cloud providers (RunPod, Vast.ai, Lambda Labs, AWS, GCP, Azure). Spot vs on-demand vs reserved pricing, multi-GPU scaling, storage/networking add-ons, and bar chart comparison.',
  inputs: [
    { name: 'provider', label: 'Cloud Provider', placeholder: '', type: 'select', options: ['runpod', 'vastai', 'lambdalabs', 'aws', 'gcp', 'azure'] },
    { name: 'gpuType', label: 'GPU Type', placeholder: '', type: 'select', options: ['H200', 'H100', 'A100', 'L40S', 'RTX4090', 'A6000'] },
    { name: 'gpuCount', label: 'GPU Count', placeholder: 'e.g. 1', type: 'number' },
    { name: 'hoursPerDay', label: 'Hours per Day', placeholder: 'e.g. 8', type: 'number' },
    { name: 'pricingTier', label: 'Pricing Tier', placeholder: '', type: 'select', options: ['spot', 'on-demand', 'reserved'] },
    { name: 'includeStorage', label: 'Include Storage/Network', placeholder: '', type: 'select', options: ['yes', 'no'] },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  // P140f-p3-T7: minimal Playbook 6 字段 template (Goal=该不该决策)
  // Goal 含"决策"+"该不该"双关键词 → 通过 T1 zod refine 校验
  playbook: {
    goal: '用户该不该继续按当前 GPU 规格付费，还是先换成更便宜但够用的配置',
    input: 'engine 定义的 inputs 字段',
    output: 'engine 定义的 generate() 返回数组',
    constraint: 'apply 引擎 inputs 时受实际场景约束',
    tool: '页面的「🧭 算完之后」决策区块（决策支持已由区块独占）',
    memory: 'v2.0 11 business domain benchmark + P140f Phase 4 主题簇',
  },
  generate(inputs) { return calculate(inputs); },
  // P151: preset chips — replaces dead PRESETS const. Each preset fills
  // the form inputs from preset.fields; the page renders one button per entry.
  presets: [
    { key: 'budget-single',   emoji: '💰', fields: { provider: 'vastai',     gpuType: 'RTX4090', gpuCount: '1', hoursPerDay: '12', pricingTier: 'spot',      includeStorage: 'yes' } },
    { key: 'dev-box',    emoji: '🛠️', fields: { provider: 'runpod',     gpuType: 'A100',    gpuCount: '1', hoursPerDay: '8',  pricingTier: 'on-demand', includeStorage: 'yes' } },
    { key: 'training-rig', emoji: '🏋️', fields: { provider: 'lambdalabs', gpuType: 'A100',    gpuCount: '4', hoursPerDay: '24', pricingTier: 'reserved',  includeStorage: 'yes' } },
    { key: 'enterprise-h100',     emoji: '🏢', fields: { provider: 'aws',        gpuType: 'H100',    gpuCount: '8', hoursPerDay: '24', pricingTier: 'reserved',  includeStorage: 'yes' } },
    { key: 'cheapest-h200',       emoji: '🔬', fields: { provider: 'vastai',     gpuType: 'H200',    gpuCount: '1', hoursPerDay: '4',  pricingTier: 'spot',      includeStorage: 'no'  } },
    { key: 'pro-8h100',          emoji: '👑', fields: { provider: 'runpod',     gpuType: 'H100',    gpuCount: '8', hoursPerDay: '24', pricingTier: 'on-demand', includeStorage: 'yes' } },
  ],
  staticExamples: [
    '\n🖥️ RunPod $calc_out.label.gpu_cost|GPU Cost| — $calc_out.gpu_cloud_cost.row.tier_label_on_demand|On-Demand|\n\n$calc_out.gpu_cloud_cost.row.gpu_config{"gpus":"1","gpu":"A100 80GB"}|GPU: 1× A100 80GB| | $calc_out.gpu_cloud_cost.row.base_rate{"rate":"$0.79"}|Base Rate: $0.79/hr|\n$calc_out.gpu_cloud_cost.row.usage{"hours":"8","gpuHours":"8"}|Usage: 8 hrs/day → 8 GPU-hrs/day|\n\n$calc_out.section.gpu_cloud_cost_breakdown|💰 Cost Breakdown|\n──────────────────────────────────────────────────\n$calc_out.gpu_cloud_cost.row.daily_gpu_cost{"hours":"8"}|Daily GPU Cost (8 hrs)|:   $6.32\n$calc_out.gpu_cloud_cost.row.monthly_gpu_cost|Monthly GPU Cost (30 days)|: $189.60\n$calc_out.gpu_cloud_cost.row.annual_gpu_cost|Annual GPU Cost|:            $2275.20\n\n$calc_out.gpu_cloud_cost.row.storage_networking|Storage + Networking:|\n  $calc_out.gpu_cloud_cost.row.storage_500gb|Storage (500GB SSD)|: $50.00/mo\n  $calc_out.gpu_cloud_cost.row.egress_50gb|Est. Egress (50GB)|:   $4.00/mo\n  $calc_out.gpu_cloud_cost.row.total_monthly|Total Monthly|:        $243.60\n\n$calc_out.gpu_cloud_cost.row.multi_provider_comparison{"gpus":"1","gpu":"A100 80GB"}|📊 Multi-Provider Comparison — 1× A100 80GB|\n──────────────────────────────────────────────────\nRunPod             ████████                              $189.60/mo\nVast.ai            ░░░░░░░                               $165.60/mo\nLambda Labs        ███████████                           $264.00/mo\nAWS                ███████████████████████████████████   $840.00/mo\nGCP                ████████████████████████████          $672.00/mo\nAzure              ██████████████████████████████        $720.00/mo\n\n$calc_out.gpu_cloud_cost.row.pricing_tier_comparison{"provider":"RunPod"}|📊 Pricing Tier Comparison for RunPod|\n──────────────────────────────────────────────────\n$calc_out.label.tier|Tier|                   | $calc_out.label.monthly|Monthly|     | $calc_out.label.annual|Annual|        | $calc_out.label.savings_vs_on_demand|Savings vs On-Demand|\n───────────────────────────────────────────────────────────────────────────\n$calc_out.gpu_cloud_cost.row.tier_spot{"pct":"40"}|Spot (save 40%)|        | $113.76        | $1365.12         | $calc_out.gpu_cloud_cost.row.tier_savings{"saved":"$75.84","pct":"40"}|Save $75.84/mo (40%)|\n$calc_out.gpu_cloud_cost.row.tier_label_on_demand|On-Demand|              | $189.60        | $2275.20         | —\n$calc_out.gpu_cloud_cost.row.tier_reserved{"pct":"15"}|Reserved 1yr (save 15%)| | $161.16        | $1933.92         | $calc_out.gpu_cloud_cost.row.tier_savings{"saved":"$28.44","pct":"15"}|Save $28.44/mo (15%)|\n\n$calc_out.gpu_cloud_cost.row.multi_gpu_scaling{"provider":"RunPod","gpu":"A100 80GB"}|🔄 Multi-GPU Scaling (RunPod, A100 80GB)|\n──────────────────────────────────────────────────\n$calc_out.label.gpus|GPUs|     | 1×               | 2×               | 4×               | 8×               | 16×              | 32×              | 64×             \n─────────┼────────────────┼────────────────┼────────────────┼────────────────┼────────────────┼────────────────┼───────────────\n$calc_out.label.monthly|Monthly|  | $189.60          | $379.20          | $758.40          | $1516.80         | $3033.60         | $6067.20         | $12134.40       \n\n$calc_out.section.gpu_cloud_cost_addons|💾 Storage & Networking Add-Ons|\n──────────────────────────────────────────────────\n$calc_out.gpu_cloud_cost.row.storage_ssd_rate{"rate":"0.10"}|Storage (SSD): $0.10/GB/month|\n$calc_out.gpu_cloud_cost.row.network_egress_rate{"rate":"0.08"}|Network Egress: $0.08/GB|\n\n$calc_out.label.storage|Storage|        | $calc_out.label.cost_per_month|Cost/Mo|   | $calc_out.label.with_gpu_total_month|With GPU Total/Mo|\n──────────────────────────────────────────────\n100 GB         | $10.00       | $203.60\n500 GB         | $50.00       | $243.60\n1,000 GB       | $100.00      | $293.60\n5,000 GB       | $500.00      | $693.60\n\n$calc_out.gpu_cloud_cost.row.spot_reserved_tip{"provider":"RunPod","gpu":"A100 80GB","cheapest":"Vast.ai","cost":"$165.60","spot":"40","reserved":"15"}|💡 RunPod spot instances save 40% but can be interrupted. Reserved instances save 15% with 1-year commitment. Cheapest provider for A100 80GB: Vast.ai at $165.60/mo.|\n💡 Tip: {"code":"gpu_cloud_on_demand","params":{"monthly":"$189.60","rate":"$0.79","hours":"8","gpus":"1"}}\n\n$calc_out.section.gpu_cloud_cost_health|🩺 Cost Health:|\n────────────────────────────────────────────────────────────\n$calc_out.gpu_cloud_cost.row.health_tier_micro|• 🟢 Micro-tier — under $1/hr. Perfect for inference, small training jobs.|\n$calc_out.gpu_cloud_cost.row.health_storage_ok{"pct":"7"}|• 🟢 Storage + egress is only 7% of total — well-optimized.|\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n────────────────────────────────────────────────────────────\n$calc_out.gpu_cloud_cost.row.whatif_already_cheapest{"gpu":"A100 80GB"}|• You\'re already on the cheapest provider for A100 80GB!|\n$calc_out.gpu_cloud_cost.row.whatif_switch_spot{"saved":"$81.44","pct":"40"}|• Switch to spot instances:  save ~$81.44/mo  (40% off, but interruptible)|\n$calc_out.gpu_cloud_cost.row.whatif_switch_reserved{"saved":"$30.54"}|• 1-year reserved:  save ~$30.54/mo  (guaranteed capacity)|\n$calc_out.gpu_cloud_cost.row.whatif_halve_hours{"cost":"$101.80"}|• Halve hours:  $101.80/mo  (workload at off-peak?)|\n$calc_out.gpu_cloud_cost.row.whatif_double_hours{"cost":"$407.20"}|• Double hours:  $407.20/mo|\n',
  ],
  faq: [
    { q: 'Which cloud provider is cheapest for GPUs in 2026?', a: '{{liveGpuProviderName:vastai}} offers the lowest prices ({{liveGpuProviderRange:vastai}}/hr) through a peer-to-peer marketplace, followed by {{liveGpuProviderName:runpod}} ({{liveGpuProviderRange:runpod}}/hr) and {{liveGpuProviderName:lambdalabs}} ({{liveGpuProviderRange:lambdalabs}}/hr). The enterprise clouds charge more for the same GPU: for an A100, {{liveGpuProviderName:aws}} is {{liveGpuRatio:vastai|A100|on|aws|A100|on}}x {{liveGpuProviderName:vastai}}, {{liveGpuProviderName:gcp}} is {{liveGpuRatio:vastai|A100|on|gcp|A100|on}}x and {{liveGpuProviderName:azure}} is {{liveGpuRatio:vastai|A100|on|azure|A100|on}}x — in exchange they add enterprise SLAs, global networking, and reserved/committed-use discounts worth {{liveGpuOffReserved}}%.' },
    { q: 'Spot vs On-Demand vs Reserved — how do I choose?', a: 'Spot/Preemptible: {{liveGpuOffSpot}}% cheaper but can be terminated anytime. Best for: fault-tolerant training jobs with checkpointing, batch processing, experimentation. On-Demand: full price, no commitment. Best for: inference serving, interactive workloads, short jobs. Reserved (1yr): {{liveGpuOffReserved}}% discount with commitment. Best for: 24/7 production workloads, predictable usage. Use spot for training, reserved for serving.' },
    { q: 'Should I rent or buy GPUs?', a: 'Rent if: usage under 500 hrs/month, need flexibility, experimenting with different GPUs. Buy if: 24/7 usage for 12+ months. An H100 server is a five-figure purchase, so renting an H100 at {{liveGpuRange:H100}}/hr only pays back after thousands of hours of 24/7 use. For most solopreneurs, renting is the right answer — you can switch providers and GPU types as technology evolves.' },
    { q: 'How much does storage and networking add to the bill?', a: 'Storage: Typically {{liveGpuStoragePerGB}}/GB/month for attached SSD. 100GB = $10/mo, 1TB = $100/mo. For training datasets, 500GB-1TB is common ($50-100/mo). Network egress: $0.05-0.12/GB across hyperscalers, which this calculator models at {{liveGpuEgressPerGB}}/GB. Downloading a 100GB dataset once = $5-12. Most solopreneur setups: storage $20-100/mo, networking $5-25/mo. These are usually dwarfed by GPU costs.' },
    { q: 'Which GPU should I choose for my workload?', a: 'H200: latest, best for 70B+ models and large training jobs. H100: 2-4x faster than A100 for transformers, sweet spot for serious LLM work. A100 80GB: versatile workhorse, best availability across providers. L40S: good for inference and fine-tuning at lower cost. RTX 4090: cheapest option, good for small model fine-tuning and prototyping. A6000: 48GB VRAM at budget price — excellent for 7B-13B models.' },
    { q: 'How do I optimize GPU utilization to save money?', a: '1) Use spot instances for training with checkpointing. 2) Right-size your GPU — don\'t use H100 for a 7B model that fits on RTX 4090. 3) Use mixed precision (FP16/BF16) to double effective throughput. 4) Batch inference requests instead of one-at-a-time. 5) Shut down idle instances — set up auto-shutdown after inactivity. 6) Use model quantization (INT8/INT4) for inference to use cheaper GPUs. Combined: 70-90% cost reduction.' },
    { q: 'RunPod vs Vast.ai vs Lambda Labs — which is best?', a: '{{liveGpuProviderName:vastai}}: cheapest overall (P2P marketplace), most GPU variety, less reliable for long-running jobs. {{liveGpuProviderName:runpod}}: slightly more expensive but more reliable, great serverless GPU option, good API. {{liveGpuProviderName:lambdalabs}}: best reliability and support among budget providers, simplest onboarding, ideal for professional training jobs. For 24/7 production: {{liveGpuProviderName:lambdalabs}}. For lowest cost experiments: {{liveGpuProviderName:vastai}}. For best balance: {{liveGpuProviderName:runpod}}.' },
    { q: "Which GPU is most cost-effective for AI workloads?", a: "For inference (production): L40S ({{liveGpuRange:L40S}}/hr) — best perf/watt. For training (small models): A100 80GB ({{liveGpuRange:A100}}/hr) — sweet spot. For training (large models): H100 80GB ({{liveGpuRange:H100}}/hr) — fastest. For serving: RTX 4090 ({{liveGpuRange:RTX4090}}/hr) — cheapest for low-throughput workloads." },
    { q: "How do I compare AWS vs GCP vs Azure GPU pricing?", a: "{{liveGpuProviderName:aws}} p4d.24xlarge (8x A100), {{liveGpuProviderName:gcp}} a2-ultragpu-8g (8x A100) and {{liveGpuProviderName:azure}} NDv5 (8x A100) all sell the same A100 GPUs, so compare per-GPU-hour instead of per-instance: A100 on-demand spans {{liveGpuRange:A100}}/hr across the six providers, and {{liveGpuProviderName:aws}} alone charges {{liveGpuRatio:vastai|A100|on|aws|A100|on}}x {{liveGpuProviderName:vastai}}. The specialist clouds ({{liveGpuProviderName:lambdalabs}}, {{liveGpuProviderName:runpod}}) sit in between. Spot/preemptible: {{liveGpuOffSpot}}% off but can be killed. Use spot for training, on-demand for serving." },
    { q: "What is reserved vs spot vs on-demand pricing?", a: "On-demand: pay per hour, fully available. Reserved: {{liveGpuOffReserved}}% off, 1-3 year commit. Spot: {{liveGpuOffSpot}}% off, can be killed anytime. Use spot for: training (can checkpoint resume), batch jobs. Use reserved for: predictable production workloads. Use on-demand for: dev environments, burst capacity." },
    { q: "How do I estimate GPU cost for inference serving?", a: "Throughput-based: tokens/sec × hours × GPU_count. For high-volume serving on L40S, 20 GPUs at {{liveGpuRate:min|L40S}}/hour running 24 hours a day for 30 days comes to {{liveGpuMonthly:min|L40S|on|20|24}}/month. Use autoscaling (scale to zero when idle). Use multi-GPU for high-throughput, single-GPU for low-latency." },
    { q: "What is the difference between H100 and A100?", a: "H100: 3x faster training, 4x faster inference vs A100, transformer engine, FP8 support. A100: 80GB HBM2e, mature ecosystem, 1.5-3 PFLOPs. For new training jobs: H100 is faster. For serving: A100 is cheaper except for compute-bound workloads. H100 is the best, A100 is the workhorse." },
    { q: "How do I optimize GPU utilization?", a: "Use batching (process 8-32 requests per batch). Use vLLM, TGI, TensorRT for high-throughput inference. Use dynamic batching for variable load. Use smaller models when possible (7B vs 70B = 10x throughput). Use quantization (INT8 = 2x throughput, 4x less memory). Monitor GPU utilization — aim for 70%+." },
    { q: "What are hidden costs in GPU cloud pricing?", a: "Storage (about {{liveGpuStoragePerGB}}/GB/month; premium tiers cost more). Egress ($0.05-0.12/GB after first free tier). Idle time (paid even if unused). Backup snapshots. Data transfer between regions. IP addresses. Load balancers. Always estimate total cost including storage + egress, not just hourly GPU rate." },
    { q: "How do I choose between self-hosting and APIs?", a: "Self-host: <$2K/month compute — prefer APIs. $2K-50K/month — gray zone, evaluate. >$50K/month — self-host often wins. Add: eng time for setup, monitoring, scaling. APIs: $0 cost upfront, elastic scaling, no infra. For prototype-to-low-scale, APIs win. For high-scale or data privacy, self-host." },
  ],
  howToUse: [
    'Select a cloud GPU provider from the 6 options (RunPod, Vast.ai, Lambda Labs, AWS, GCP, Azure).',
    'Choose your GPU type — from budget RTX 4090 to enterprise H200.',
    'Enter the number of GPUs and expected daily usage hours.',
    'Pick your pricing tier: spot (cheapest, interruptible), on-demand (flexible), or reserved (committed discount).',
    'Toggle storage/networking to see add-on costs for SSD storage and data egress.',
    'Review the multi-provider bar chart, tier savings comparison, and multi-GPU scaling table to find the optimal configuration.',
  ],
  dataLastUpdated: PRICING.lastUpdated,
  engineKey: true,
};

registerEngine(engine);
