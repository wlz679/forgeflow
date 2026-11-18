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
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let q=function(c){return Number.isNaN(c)?0:Math.max(0,c)},J=function(c){return c==="spot"?o("calc_out.gpu_cloud_cost.row.tier_label_spot",z.spot):c==="reserved"?o("calc_out.gpu_cloud_cost.row.tier_label_reserved",z.reserved):o("calc_out.gpu_cloud_cost.row.tier_label_on_demand",z["on-demand"])},r=function(c){return"$"+c.toFixed(2)},M=function(c){return c.toLocaleString()},h=function(c,D){return c+" ".repeat(Math.max(0,D-c.length))},V=function(c){const D=c.provider||"runpod",e=U[D]||U.runpod,u=c.gpuType||"A100",l=Math.max(1,Math.min(1e3,q(parseInt(c.gpuCount))||1)),p=Math.max(.5,Math.min(24,q(parseInt(c.hoursPerDay))||8)),g=c.pricingTier||"on-demand",m=c.includeStorage!=="no",C=e.rates[u]||1;let H=1;g==="spot"?H=e.spotMult:g==="reserved"&&(H=e.reservedMult);const F=C*H,S=p*l,G=S*F,x=G*30,st=x*12,rt={};if(m)for(const s of K)rt[String(s)]=s*_;const B=m?50*b:0,t=[];if(t.push(""),t.push("🖥️ "+e.name+" "+o("calc_out.label.gpu_cost","GPU Cost")+" — "+J(g)||g.toUpperCase()),t.push(""),t.push(o("calc_out.gpu_cloud_cost.row.gpu_config","GPU: "+l+"× "+n[u],{gpus:String(l),gpu:n[u]})+" | "+o("calc_out.gpu_cloud_cost.row.base_rate","Base Rate: "+r(C)+"/hr",{rate:r(C)})),g!=="on-demand"){const s=Math.round((1-H)*100);t.push(o("calc_out.label.tier","Tier")+": "+J(g)+" "+o("calc_out.gpu_cloud_cost.row.tier_discount","("+s+"% discount) → Effective: "+r(F)+"/hr",{discount:String(s),rate:r(F)}))}if(t.push(o("calc_out.gpu_cloud_cost.row.usage","Usage: "+p+" hrs/day → "+M(S)+" GPU-hrs/day",{hours:String(p),gpuHours:M(S)})),t.push(""),t.push("$calc_out.section.gpu_cloud_cost_breakdown|💰 Cost Breakdown|"),t.push(d.repeat(50)),t.push(o("calc_out.gpu_cloud_cost.row.daily_gpu_cost","Daily GPU Cost ("+M(S)+" hrs)",{hours:M(S)})+":   "+r(G)),t.push(o("calc_out.gpu_cloud_cost.row.monthly_gpu_cost","Monthly GPU Cost (30 days)")+": "+r(x)),t.push(o("calc_out.gpu_cloud_cost.row.annual_gpu_cost","Annual GPU Cost")+":            "+r(st)),m){t.push(""),t.push(o("calc_out.gpu_cloud_cost.row.storage_networking","Storage + Networking:")),t.push("  "+o("calc_out.gpu_cloud_cost.row.storage_500gb","Storage (500GB SSD)")+": "+r(500*_)+"/mo"),t.push("  "+o("calc_out.gpu_cloud_cost.row.egress_50gb","Est. Egress (50GB)")+":   "+r(B)+"/mo");const s=x+500*_+B;t.push("  "+o("calc_out.gpu_cloud_cost.row.total_monthly","Total Monthly")+":        "+r(s))}t.push(""),t.push(o("calc_out.gpu_cloud_cost.row.multi_provider_comparison","📊 Multi-Provider Comparison — "+l+"× "+n[u],{gpus:String(l),gpu:n[u]})),t.push(d.repeat(50));const N=Object.values(U).sort((s,a)=>s.order-a.order),$=[];for(const s of N){const v=(s.rates[u]||1)*H,i=p*l*v*30;$.push({name:s.name,cost:i})}const et=Math.max(...$.map(s=>s.cost),1),A=$.reduce((s,a)=>a.cost<s.cost?a:s),P=35;for(const s of $){const a=s.cost/et,i=s===A?"░":"█",f=Math.max(1,Math.round(a*P));t.push(h(s.name,18)+" "+i.repeat(f)+" ".repeat(Math.max(0,P-f+2))+" "+r(s.cost)+"/mo")}t.push(""),t.push(o("calc_out.gpu_cloud_cost.row.pricing_tier_comparison","📊 Pricing Tier Comparison for "+e.name,{provider:e.name})),t.push(d.repeat(50));const ct=[["Spot (save "+Math.round((1-e.spotMult)*100)+"%)",e.spotMult],["On-Demand",1],["Reserved 1yr (save "+Math.round((1-e.reservedMult)*100)+"%)",e.reservedMult]],ut="Tier".padEnd(22)+" | Monthly".padEnd(14)+" | Annual".padEnd(16)+" | Savings vs On-Demand",at="Tier".padEnd(22),lt=" | Monthly".padEnd(14),nt=" | Annual".padEnd(16);let pt=o("calc_out.label.tier","Tier")+at.slice(4)+" | "+o("calc_out.label.monthly","Monthly")+lt.slice(10)+" | "+o("calc_out.label.annual","Annual")+nt.slice(9)+" | "+o("calc_out.label.savings_vs_on_demand","Savings vs On-Demand");t.push(pt),t.push("─".repeat(ut.length));const W=p*l*C*30;for(const[s,a]of ct){const v=p*l*C*a*30,i=W-v,f=W>0?Math.round(i/W*100):0,j=h(s,22),I=s==="On-Demand"?o("calc_out.gpu_cloud_cost.row.tier_label_on_demand",s):s.startsWith("Spot")?o("calc_out.gpu_cloud_cost.row.tier_spot",s,{pct:String(Math.round((1-e.spotMult)*100))}):o("calc_out.gpu_cloud_cost.row.tier_reserved",s,{pct:String(Math.round((1-e.reservedMult)*100))});t.push(I+j.slice(s.length)+" | "+h(r(v),14)+" | "+h(r(v*12),16)+" | "+(i>0?o("calc_out.gpu_cloud_cost.row.tier_savings","Save "+r(i)+"/mo ("+f+"%)",{saved:r(i),pct:String(f)}):"—"))}t.push(""),t.push(o("calc_out.gpu_cloud_cost.row.multi_gpu_scaling","🔄 Multi-GPU Scaling ("+e.name+", "+n[u]+")",{provider:e.name,gpu:n[u]})),t.push(d.repeat(50));const Y=[1,2,4,8,16,32,64],it="GPUs".padEnd(8);let O=o("calc_out.label.gpus","GPUs")+it.slice(4);for(const s of Y)O+=" | "+h(M(s)+"×",16);t.push(O);let R="".padEnd(8,d);for(const s of Y)R+="─┼─".padEnd(17,d);t.push(R);const dt="Monthly".padEnd(8);let E=o("calc_out.label.monthly","Monthly")+dt.slice(7);for(const s of Y){const a=p*s*F*30;E+=" | "+h(r(a),16)}if(t.push(E),t.push(""),m){t.push("$calc_out.section.gpu_cloud_cost_addons|💾 Storage & Networking Add-Ons|"),t.push(d.repeat(50)),t.push(o("calc_out.gpu_cloud_cost.row.storage_ssd_rate","Storage (SSD): $"+_.toFixed(2)+"/GB/month",{rate:_.toFixed(2)})),t.push(o("calc_out.gpu_cloud_cost.row.network_egress_rate","Network Egress: $"+b.toFixed(2)+"/GB",{rate:b.toFixed(2)})),t.push("");const s="Storage".padEnd(14)+" | Cost/Mo".padEnd(12)+" | With GPU Total/Mo",a="Storage".padEnd(14),v=" | Cost/Mo".padEnd(12);let i=o("calc_out.label.storage","Storage")+a.slice(7)+" | "+o("calc_out.label.cost_per_month","Cost/Mo")+v.slice(10)+" | "+o("calc_out.label.with_gpu_total_month","With GPU Total/Mo");t.push(i),t.push("─".repeat(s.length));for(const f of K){const j=f*_,I=x+j+B;t.push(h(M(f)+" GB",14)+" | "+h(r(j),12)+" | "+r(I))}t.push("")}t.push(o("calc_out.gpu_cloud_cost.row.spot_reserved_tip","💡 "+e.name+" spot instances save "+Math.round((1-e.spotMult)*100)+"% but can be interrupted. Reserved instances save "+Math.round((1-e.reservedMult)*100)+"% with 1-year commitment. Cheapest provider for "+n[u]+": "+A.name+" at "+r(A.cost)+"/mo.",{provider:e.name,gpu:n[u],cheapest:A.name,cost:r(A.cost),spot:String(Math.round((1-e.spotMult)*100)),reserved:String(Math.round((1-e.reservedMult)*100))}));const Q={monthly:r(x),rate:r(F),hours:String(p),gpus:String(l)};let L;g==="spot"?L=JSON.stringify({code:"gpu_cloud_spot",params:Q}):g==="reserved"?L=JSON.stringify({code:"gpu_cloud_reserved",params:Q}):L=JSON.stringify({code:"gpu_cloud_on_demand",params:Q}),t.push("💡 Tip: "+L),t.push(""),t.push("$calc_out.section.gpu_cloud_cost_health|🩺 Cost Health:|"),t.push(d.repeat(60));const w=e.rates[u]||0,y=w*p*30*l+(m?100*_+50*b:0);if(w<1?t.push(o("calc_out.gpu_cloud_cost.row.health_tier_micro","• 🟢 Micro-tier — under $1/hr. Perfect for inference, small training jobs.")):w<3?t.push(o("calc_out.gpu_cloud_cost.row.health_tier_low","• 🟢 Low-tier — $1-3/hr. Most training and inference workloads.")):w<8?t.push(o("calc_out.gpu_cloud_cost.row.health_tier_mid","• 🟡 Mid-tier — $3-8/hr. Larger training jobs, multi-GPU setups.")):t.push(o("calc_out.gpu_cloud_cost.row.health_tier_high","• 🟠 High-tier — $"+w.toFixed(2)+"/hr. Premium GPUs for cutting-edge training.",{rate:w.toFixed(2)})),m){const a=(100*_+50*b)/Math.max(y,.01)*100;a>30?t.push(o("calc_out.gpu_cloud_cost.row.health_storage_high","• ⚠️ Storage + egress is "+Math.round(a)+"% of total — review whether you need all that data online.",{pct:String(Math.round(a))})):t.push(o("calc_out.gpu_cloud_cost.row.health_storage_ok","• 🟢 Storage + egress is only "+Math.round(a)+"% of total — well-optimized.",{pct:String(Math.round(a))}))}l>=8&&t.push(o("calc_out.gpu_cloud_cost.row.health_reserved_hint","• 💡 At "+l+" GPUs, consider reserved instances: save "+Math.round((1-e.reservedMult)*100)+"% with 1-year commitment.",{gpus:String(l),pct:String(Math.round((1-e.reservedMult)*100))})),t.push(""),t.push("$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|"),t.push(d.repeat(60));const X=N[0];if(e!==X){const s=(w-X.rates[u])*p*30*l;s>0&&t.push(o("calc_out.gpu_cloud_cost.row.whatif_switch_cheapest","• Switch to "+X.name+":  save "+r(s)+"/mo  (cheapest for "+n[u]+")",{provider:X.name,saved:r(s),gpu:n[u]}))}else t.push(o("calc_out.gpu_cloud_cost.row.whatif_already_cheapest","• You're already on the cheapest provider for "+n[u]+"!",{gpu:n[u]}));const T=y*(1-e.spotMult);t.push(o("calc_out.gpu_cloud_cost.row.whatif_switch_spot","• Switch to spot instances:  save ~"+r(T)+"/mo  ("+Math.round((1-e.spotMult)*100)+"% off, but interruptible)",{saved:r(T),pct:String(Math.round((1-e.spotMult)*100))}));const k=y*(1-e.reservedMult);return t.push(o("calc_out.gpu_cloud_cost.row.whatif_switch_reserved","• 1-year reserved:  save ~"+r(k)+"/mo  (guaranteed capacity)",{saved:r(k)})),t.push(o("calc_out.gpu_cloud_cost.row.whatif_halve_hours","• Halve hours:  "+r(y/2)+"/mo  (workload at off-peak?)",{cost:r(y/2)})),t.push(o("calc_out.gpu_cloud_cost.row.whatif_double_hours","• Double hours:  "+r(y*2)+"/mo",{cost:r(y*2)})),t.push(""),t},Z=function(c,D,e){var u=ot(c);return Array.isArray(u)?u.join(\`
\`):String(u)};var ht=q,_t=J,gt=r,vt=M,ft=h,Mt=V,wt=Z,o=tk,tt='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',o=new Function("return "+tt)(),n={H200:"H200 141GB",H100:"H100 80GB",A100:"A100 80GB",L40S:"L40S 48GB",RTX4090:"RTX 4090 24GB",A6000:"RTX A6000 48GB"},U={runpod:{name:"RunPod",spotMult:.6,reservedMult:.85,rates:{H200:2.49,H100:1.99,A100:.79,L40S:.69,RTX4090:.49,A6000:.39},order:1},vastai:{name:"Vast.ai",spotMult:.5,reservedMult:.8,rates:{H200:2.2,H100:1.69,A100:.69,L40S:.59,RTX4090:.44,A6000:.35},order:2},lambdalabs:{name:"Lambda Labs",spotMult:.7,reservedMult:.9,rates:{H200:2.8,H100:2.49,A100:1.1,L40S:.8,RTX4090:.55,A6000:.5},order:3},aws:{name:"AWS",spotMult:.4,reservedMult:.7,rates:{H200:5,H100:4,A100:3.5,L40S:1.2,RTX4090:.8,A6000:.65},order:4},gcp:{name:"GCP",spotMult:.45,reservedMult:.75,rates:{H200:4.5,H100:4.2,A100:2.8,L40S:1,RTX4090:.7,A6000:.6},order:5},azure:{name:"Azure",spotMult:.5,reservedMult:.8,rates:{H200:4.8,H100:3.8,A100:3,L40S:1.1,RTX4090:.75,A6000:.62},order:6}},_=.1,b=.08,K=[100,500,1e3,5e3],z={"on-demand":"On-Demand",spot:"Spot/Preemptible",reserved:"Reserved (1yr)"},d="─",ot=function(c){return V(c)};return[Z(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

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
