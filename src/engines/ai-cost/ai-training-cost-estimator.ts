import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
import PRICING from '../../data/ai-pricing.json';
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

interface GpuInfo {
  hourlyRate: number;
  name: string;
  order: number;
}

interface ModelInfo {
  h200?: number;
  h100?: number;
  a100?: number;
  l40s?: number;
  name: string;
  isLoRA: boolean;
  order: number;
}

const GPU_TYPES: Record<string, GpuInfo> = PRICING.training.gpuTypes as any;

const MODEL_SIZES: Record<string, ModelInfo> = PRICING.training.modelSizes as any;
/**
 * 模型显示名：把「型号 + 变体说明」拆开 —— 型号（7B / 70B）留在 token 外，
 * 变体说明（LoRA fine-tune / full fine-tune / full train）包成 token。
 *
 * ⭐ 为什么不能整段包 token：型号本身不该译（翻成「7B（LoRA 微调）」会把型号也动到）；
 *   而不拆则 zh 页那一行**整行**是英文（B3-9 产物层守卫实测抓到 2 行）。
 *
 * ⚠️ code 是**字面量**（协议要求 code 必须来自字符串字面量 ⇒ 静态扫描才完备）。
 */
const MODEL_VARIANT_FALLBACK: Record<string, string> = {
  'LoRA fine-tune': 'LoRA fine-tune',
  'full fine-tune': 'full fine-tune',
  'full train': 'full train',
};

function modelLabel(name: string): string {
  const i = name.indexOf(' (');
  if (i < 0) return name;
  const base = name.slice(0, i);
  const variant = name.slice(i + 2, name.lastIndexOf(')'));
  const code =
    variant === 'LoRA fine-tune'
      ? 'calc_out.ai_training_cost_estimator.row.model_variant_lora_fine_tune'
      : variant === 'full fine-tune'
      ? 'calc_out.ai_training_cost_estimator.row.model_variant_full_fine_tune'
      : 'calc_out.ai_training_cost_estimator.row.model_variant_full_train';
  return base + ' (' + makeToken(code, MODEL_VARIANT_FALLBACK[variant] ?? variant) + ')';
}


// Storage cost per GB per month
const STORAGE_COST_PER_GB = PRICING.gpu.storagePerGB;

// Data processing cost per GB
const DATA_PROCESS_COST_PER_GB = PRICING.training.dataProcessPerGB;

// P163 D3：Spot / Reserved 折扣是**带**（跨 6 家云 GPU 供应商），不是单一百分比。
// 真相源：PRICING.gpu.providers[*].spotMult / reservedMult（价格乘数）。
// 实测（2026-10-30）：spotMult ∈ [0.4, 0.7]（= 30-60% off），
// reservedMult ∈ [0.7, 0.9]（= 10-30% off）。
// ⇒ 旧的写死 "40% off"（totalCost * 0.6）既不是现货带也不是预留带的代表值。
const GPU_PROVIDER_MULTS = Object.values(PRICING.gpu.providers as any) as Array<{
  spotMult: number;
  reservedMult: number;
}>;
const SPOT_MULT_MIN = Math.min(...GPU_PROVIDER_MULTS.map((p) => p.spotMult));
const SPOT_MULT_MAX = Math.max(...GPU_PROVIDER_MULTS.map((p) => p.spotMult));
const RESERVED_MULT_MIN = Math.min(...GPU_PROVIDER_MULTS.map((p) => p.reservedMult));
const RESERVED_MULT_MAX = Math.max(...GPU_PROVIDER_MULTS.map((p) => p.reservedMult));

// Epoch time multiplier — LoRA is faster per epoch
const LORA_EPOCH_SPEEDUP = PRICING.training.loraSpeedup; // LoRA epoch takes 35% of full fine-tune time

function fmt(n: number): string { return '$' + n.toFixed(2); }
// P163 D1：fmt() 已带 '$'，调用处再拼一个就成 '$$'。
function fmtNum(n: number): string { return n.toFixed(2); }
function lc(n: number): string { return n.toLocaleString(); }
function pad(s: string, len: number): string { return s + ' '.repeat(Math.max(0, len - s.length)); }
const SEP = '─';

function calculate(inputs: Record<string, string>): string[] {
  const modelKey = inputs.modelSize || '7B';
  const model = MODEL_SIZES[modelKey] || MODEL_SIZES['7B'];
  const gpuKey = inputs.gpuType || 'H100-80GB';
  const gpu = GPU_TYPES[gpuKey] || GPU_TYPES['H100-80GB'];
  const gpuCount = Math.max(1, Math.min(10000, clampNonNegative(parseInt(inputs.gpuCount)) || 4));
  const trainingHours = Math.max(1, Math.min(8760, clampNonNegative(parseInt(inputs.trainingHours)) || 24));
  const epochs = Math.max(1, Math.min(1000, clampNonNegative(parseInt(inputs.epochs)) || 3));
  const cloudStorageGB = Math.max(0, Math.min(100000, clampNonNegative(parseInt(inputs.cloudStorage)) || 0));
  const dataProcessCost = Math.max(0, Math.min(100000, clampNonNegative(parseInt(inputs.dataProcessCost)) || 0));

  // Determine if LoRA based on model
  const isLoRA = model.isLoRA;
  const effectiveHoursPerEpoch = isLoRA ? trainingHours * LORA_EPOCH_SPEEDUP : trainingHours;

  // GPU cost
  const totalGpuHours = effectiveHoursPerEpoch * epochs;
  const gpuCost = totalGpuHours * gpuCount * gpu.hourlyRate;

  // Storage cost for the training duration (estimate months)
  const trainingMonths = Math.max(0.1, (totalGpuHours / 24) / 30);
  const storageCost = cloudStorageGB * STORAGE_COST_PER_GB * trainingMonths;

  // Total: GPU + storage + data processing
  const totalCost = gpuCost + storageCost + dataProcessCost;

  const out: string[] = [];
  // P168 B3-9：⭐ **删除**「📅 Pricing last updated: ...」这一行。
  //   理由（与 B3-8 ai-api-cost-comparison 同源）：codegen 写 staticExamples[0] 时**本来就过滤掉它**
  //   （scripts/codegen-examples.mjs:317），页面用**徽章**显示同一日期 ⇒ 保留它只会让
  //   「服务端输出」比「静态卡片」多一行（既有 G6 漂移），令牌化后两端必须逐字一致 ⇒ 删掉。
  //   ⚠️ 英文页可见输出不变：静态卡片本来就没有这一行，客户端也从来没有这一行。
  out.push('');

  // Section 1: Header
  if (isLoRA) {
    out.push(makeToken('calc_out.section.ai_training_cost_estimator_lora', '\u{1F916} AI Training Cost Estimate (LoRA)'));
  } else {
    out.push(makeToken('calc_out.section.ai_training_cost_estimator', '\u{1F916} AI Training Cost Estimate'));
  }
  out.push('');
  out.push(makeToken('calc_out.label.model', 'Model') + ': ' + modelLabel(model.name) + ' | ' + makeToken('calc_out.label.gpu', 'GPU') + ': ' + gpuCount + '× ' + gpu.name);
  out.push(makeToken('calc_out.label.training', 'Training') + ': ' + lc(trainingHours) + makeToken('calc_out.ai_training_cost_estimator.row.unit_hrs_per_epoch', ' hrs/epoch', { hrs: lc(trainingHours) }) + ' × ' + epochs + makeToken('calc_out.ai_training_cost_estimator.row.unit_epochs', ' epochs', { epochs: String(epochs) }) + ' = ' + lc(totalGpuHours) + makeToken('calc_out.ai_training_cost_estimator.row.unit_total_gpu_hours', ' total GPU-hours', { hours: lc(totalGpuHours) }));
  out.push('');

  // Section 2: Cost Breakdown
  out.push(makeToken('calc_out.section.ai_training_cost_breakdown', '\u{1F4B0} Cost Breakdown'));
  out.push(SEP.repeat(50));
  out.push(makeToken('calc_out.label.gpu_compute', 'GPU Compute') + ':  ' + pad(gpuCount + '× ' + gpu.name + ' @ ' + fmt(gpu.hourlyRate) + '/hr × ' + lc(totalGpuHours) + ' hrs', 45) + fmt(gpuCost));
  out.push(makeToken('calc_out.label.cloud_storage', 'Cloud Storage') + ': ' + pad(lc(cloudStorageGB) + ' GB @ $' + STORAGE_COST_PER_GB.toFixed(2) + '/GB/mo × ' + trainingMonths.toFixed(1) + ' mo', 45) + fmt(storageCost));
  out.push(makeToken('calc_out.label.data_processing', 'Data Processing') + ':' + pad(' ' + fmt(dataProcessCost), 45) + fmt(dataProcessCost));
  out.push(SEP.repeat(50));
  out.push(makeToken('calc_out.label.total_estimated_cost', 'Total Estimated Cost') + ': ' + pad('', 23) + fmt(totalCost));
  out.push('');

  // Per-epoch cost breakdown
  out.push(makeToken('calc_out.section.ai_training_per_epoch_tracking', '\u{1F4CA} Per-Epoch Tracking'));
  out.push(SEP.repeat(50));
  const perEpochGpu = effectiveHoursPerEpoch * gpuCount * gpu.hourlyRate;
  const perEpochStorage = cloudStorageGB * STORAGE_COST_PER_GB * (effectiveHoursPerEpoch / 24 / 30);
  out.push(makeToken('calc_out.label.per_epoch_gpu_cost', 'Per Epoch GPU Cost') + ': ' + fmt(perEpochGpu));
  out.push(makeToken('calc_out.label.per_epoch_total', 'Per Epoch Total') + ':    ' + fmt(perEpochGpu + perEpochStorage));
  out.push('');

  // Epoch-by-epoch table
  //   ⭐ 对齐空格**留在 token 之外**（\0.3 配方第 2 条）⇒ 表头单元格的 padEnd 结果单独算好再拼。
  const hdrEpoch = 'Epoch'.padEnd(8);
  const hdrGpu = 'GPU Cost'.padEnd(14);
  const hdrCum = 'Cumulative'.padEnd(16);
  const tblHdr =
    makeToken('calc_out.label.epoch', 'Epoch') + hdrEpoch.slice('Epoch'.length) +
    ' | ' +
    makeToken('calc_out.label.gpu_cost', 'GPU Cost') + hdrGpu.slice('GPU Cost'.length) +
    ' | ' +
    makeToken('calc_out.label.cumulative', 'Cumulative') + hdrCum.slice('Cumulative'.length);
  out.push(tblHdr);
  out.push('─'.repeat(hdrEpoch.length + 3 + hdrGpu.length + 3 + hdrCum.length));
  for (let e = 1; e <= epochs; e++) {
    const cumGpu = perEpochGpu * e;
    const cumStorage = cloudStorageGB * STORAGE_COST_PER_GB * ((effectiveHoursPerEpoch * e) / 24 / 30);
    const cumTotal = cumGpu + cumStorage + dataProcessCost;
    out.push(
      String(e).padEnd(8) + ' | ' +
      fmt(perEpochGpu * e).padEnd(14) + ' | ' +
      fmt(cumTotal).padEnd(16),
    );
  }
  out.push('');

  // Section 3: Total cost summary
  out.push(makeToken('calc_out.section.ai_training_cost_summary', '\u{1F4CB} Cost Summary'));
  out.push(SEP.repeat(50));
  const pctGpu = totalCost > 0 ? Math.round((gpuCost / totalCost) * 100) : 0;
  const pctStorage = totalCost > 0 ? Math.round((storageCost / totalCost) * 100) : 0;
  const pctData = totalCost > 0 ? Math.round((dataProcessCost / totalCost) * 100) : 0;
  out.push(makeToken('calc_out.label.gpu', 'GPU') + ':     ' + fmt(gpuCost).padEnd(14) + ' (' + pctGpu + '%)  ' + '█'.repeat(Math.round(pctGpu / 5)));
  out.push(makeToken('calc_out.label.storage', 'Storage') + ': ' + fmt(storageCost).padEnd(14) + ' (' + pctStorage + '%)  ' + '▓'.repeat(Math.round(pctStorage / 5)));
  if (dataProcessCost > 0) {
    out.push(makeToken('calc_out.label.data', 'Data') + ':    ' + fmt(dataProcessCost).padEnd(14) + ' (' + pctData + '%)  ' + '▒'.repeat(Math.round(pctData / 5)));
  }
  out.push('');

  // Section 4: Optimistic/Pessimistic Range
  out.push(makeToken('calc_out.section.ai_training_cost_range', '\u{1F4C8} Cost Range (Optimistic — Pessimistic)'));
  out.push(SEP.repeat(50));
  const optimistic = totalCost * 0.7;
  const pessimistic = totalCost * 1.5;
  // P163 D3：给出**带**而不是单一百分比 —— 乘数区间来自数据集
  // （spotMult ∈ [0.4,0.7]、reservedMult ∈ [0.7,0.9]）。
  const withSpotLow = totalCost * SPOT_MULT_MIN;
  const withSpotHigh = totalCost * SPOT_MULT_MAX;
  const withReservedLow = totalCost * RESERVED_MULT_MIN;
  const withReservedHigh = totalCost * RESERVED_MULT_MAX;
  const spotOffLow = Math.round((1 - SPOT_MULT_MAX) * 100);
  const spotOffHigh = Math.round((1 - SPOT_MULT_MIN) * 100);
  const reservedOffLow = Math.round((1 - RESERVED_MULT_MAX) * 100);
  const reservedOffHigh = Math.round((1 - RESERVED_MULT_MIN) * 100);
  out.push(makeToken('calc_out.label.optimistic_spot_optimizations', 'Optimistic (spot instances + optimizations)') + ':  ' + fmt(optimistic));
  out.push(makeToken('calc_out.label.expected', 'Expected') + ':' + ' '.repeat(47 - 'Expected:'.length) + fmt(totalCost));
  out.push(makeToken('calc_out.label.pessimistic_ondemand_overhead', 'Pessimistic (on-demand + overhead)') + ':' + ' '.repeat(47 - 'Pessimistic (on-demand + overhead):'.length) + fmt(pessimistic));
  out.push('');
  out.push(makeToken('calc_out.ai_training_cost_estimator.row.with_spot_discount', 'With Spot Discount (' + spotOffLow + '-' + spotOffHigh + '% off)', { low: String(spotOffLow), high: String(spotOffHigh) }) + ':        ' + fmt(withSpotLow) + ' - ' + fmt(withSpotHigh));
  out.push(makeToken('calc_out.ai_training_cost_estimator.row.with_reserved_discount', 'With Reserved Discount (' + reservedOffLow + '-' + reservedOffHigh + '% off)', { low: String(reservedOffLow), high: String(reservedOffHigh) }) + ':     ' + fmt(withReservedLow) + ' - ' + fmt(withReservedHigh));
  out.push('');

  // Section 5: Multi-Run Scaling
  out.push(makeToken('calc_out.section.ai_training_multi_run_scaling', '\u{1F504} Multi-Run Scaling'));
  out.push(SEP.repeat(50));
  const runs = [1, 3, 5, 10, 25, 50];
  const runsCell = 'Runs'.padEnd(8);
  let runHdr = makeToken('calc_out.label.runs', 'Runs') + runsCell.slice('Runs'.length);
  for (const r of runs) runHdr += ' | ' + pad(lc(r), 12);
  out.push(runHdr);
  let runSep = ''.padEnd(8, SEP);
  for (const _ of runs) runSep += '─┼─'.padEnd(13, SEP);
  out.push(runSep);
  const totalCell = 'Total'.padEnd(8);
  let totalRow = makeToken('calc_out.label.total', 'Total') + totalCell.slice('Total'.length);
  for (const r of runs) totalRow += ' | ' + pad(fmt(totalCost * r), 12);
  out.push(totalRow);
  out.push('');

  // CPU-hours equivalent comparison
  const cpuEquiv = totalGpuHours * gpuCount * 100; // rough: 1 GPU-hour ≈ 100 CPU-core-hours
  out.push(makeToken('calc_out.ai_training_cost_estimator.row.gpu_hours_equivalent', '\u{1F4A1} ' + lc(totalGpuHours) + ' GPU-hours ≈ ' + lc(cpuEquiv) + ' CPU-core-hours equivalent.', { hours: lc(totalGpuHours), cpu: lc(cpuEquiv) }));
  out.push(makeToken('calc_out.ai_training_cost_estimator.row.lora_cost_note', '\u{1F4A1} LoRA fine-tuning reduces cost by ~65% vs full fine-tuning. Use checkpointing to protect against spot interruptions.'));

  // 🩺 Cost Health (v3)
  out.push('');
  out.push(makeToken('calc_out.section.ai_training_cost_health', '🩺 Cost Health:'));
  out.push(SEP.repeat(60));
  if (model.isLoRA) {
    out.push(makeToken('calc_out.ai_training_cost_estimator.row.health_lora', '• 🟢 LoRA mode — training only adapter weights, not the full model. ~65% cheaper than full fine-tune.'));
  } else {
    out.push(makeToken('calc_out.ai_training_cost_estimator.row.health_full', '• 🟠 Full fine-tune — training all model weights. Most expensive option. Consider LoRA unless you have a specific need.'));
  }
  if (epochs > 5) {
    out.push(makeToken('calc_out.ai_training_cost_estimator.row.health_epochs_aggressive', '• 🟡 ' + epochs + ' epochs is aggressive — most models converge in 2-4. Diminishing returns past epoch 5 unless you have a specific reason.', { epochs: String(epochs) }));
  }
  if (cloudStorageGB > 1000) {
    out.push(makeToken('calc_out.ai_training_cost_estimator.row.health_storage_significant', '• 💡 ' + lc(cloudStorageGB) + 'GB storage is significant — consider S3 cold storage or dataset compression.', { gb: lc(cloudStorageGB) }));
  }
  out.push('');

  // 🔄 What-If Scenarios (v3)
  out.push(makeToken('calc_out.section.what_if_scenarios', '🔄 What-If Scenarios:'));
  out.push(SEP.repeat(60));
  // P163：full-FT 倍数由数据集派生（loraSpeedup = 0.35 ⇒ 1/0.35 ≈ 2.86 ⇒ 取整 3x），
  // 与 FAQ 的 {{liveTrainingFullFtMult}} 同源 —— 写死的 3 会在数据集变动后与 FAQ 打架。
  const FULL_FT_MULT = Math.round(1 / LORA_EPOCH_SPEEDUP);
  if (model.isLoRA) {
    const fullCost = totalCost * FULL_FT_MULT;
    out.push(makeToken('calc_out.ai_training_cost_estimator.row.whatif_switch_full_finetune', '• Switch to full fine-tune:  ' + fmt(fullCost) + '  (' + FULL_FT_MULT + 'x cost, but better quality)', { cost: fmt(fullCost), mult: String(FULL_FT_MULT) }));
  } else {
    const loraCost = totalCost / FULL_FT_MULT;
    out.push(makeToken('calc_out.ai_training_cost_estimator.row.whatif_switch_lora', '• Switch to LoRA fine-tuning:  ' + fmt(loraCost) + '  (1/' + FULL_FT_MULT + ' cost, similar quality for most tasks)', { cost: fmt(loraCost), mult: String(FULL_FT_MULT) }));
  }
  out.push(makeToken('calc_out.ai_training_cost_estimator.row.whatif_halve_epochs', '• Halve epochs to ' + Math.max(1, Math.floor(epochs / 2)) + ':  ' + fmt(totalCost / 2) + '  (may need more data to compensate)', { epochs: String(Math.max(1, Math.floor(epochs / 2))), cost: fmt(totalCost / 2) }));
  out.push(makeToken('calc_out.ai_training_cost_estimator.row.whatif_double_epochs', '• Double epochs to ' + (epochs * 2) + ':  ' + fmt(totalCost * 2) + '  (diminishing returns past 5)', { epochs: String(epochs * 2), cost: fmt(totalCost * 2) }));
  // P163 D3 同族：旧文案写死「RunPod/Vast.ai for 40-50% savings」。
  // 实测（2026-10-30）：把 gpu.providers 的 A100 现货价与 training.gpuTypes
  // 的 A100-80GB 基准（$1.50/hr）比，runpod = 47.3%、vastai = 54.0%
  // ⇒ 「40-50%」上界被低估。改为按当前 GPU 型号实时算。
  //
  // 映射是**机械推导**的：训练 GPU key 的容量后缀去掉后就是 gpu.providers
  // 的 rate key（A100-80GB → A100、H200-141GB → H200、L40S-48GB → L40S）。
  // RTX-6000 在 providers 里没有对应项 ⇒ 回退到定性表述，不编数字。
  const gpuBaseKey = gpuKey.replace(/-\d+GB$/, '');
  const marketRates = Object.values(PRICING.gpu.providers as any)
    .map((p: any) => p.rates[gpuBaseKey])
    .filter((r): r is number => typeof r === 'number');
  if (marketRates.length > 0) {
    const cheapestMarket = Math.min(...marketRates);
    const marketSavingPct = Math.round((1 - cheapestMarket / gpu.hourlyRate) * 100);
    out.push(
      makeToken(
        'calc_out.ai_training_cost_estimator.row.whatif_cheaper_gpu_market',
        '• Switch to cheaper GPU in same tier:  cheapest market rate for ' + gpu.name +
        ' is $' + fmtNum(cheapestMarket) + '/hr vs $' + fmtNum(gpu.hourlyRate) +
        '/hr baseline — save ~' + marketSavingPct + '%',
        {
          gpu: gpu.name,
          market: '$' + fmtNum(cheapestMarket) + '/hr',
          baseline: '$' + fmtNum(gpu.hourlyRate) + '/hr',
          save: String(marketSavingPct),
        }
      ),
    );
  } else {
    out.push(makeToken('calc_out.ai_training_cost_estimator.row.whatif_cheaper_gpu_compare', '• Switch to cheaper GPU in same tier:  compare per-GPU-hour rates across cloud providers'));
  }
  out.push('');

  return out;
}

// customFn — exact sync with calculate()
const customFn =
  // P15 defensive clamp (preserved across codegen-customfn.mjs regen — sits before data-table markers)
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let m=function(a){return Number.isNaN(a)?0:Math.max(0,a)},z=function(a){const h=a.indexOf(" (");if(h<0)return a;const d=a.slice(0,h),c=a.slice(h+2,a.lastIndexOf(")")),n=c==="LoRA fine-tune"?"calc_out.ai_training_cost_estimator.row.model_variant_lora_fine_tune":c==="full fine-tune"?"calc_out.ai_training_cost_estimator.row.model_variant_full_fine_tune":"calc_out.ai_training_cost_estimator.row.model_variant_full_train";return d+" ("+o(n,rt[c]??c)+")"},e=function(a){return"$"+a.toFixed(2)},M=function(a){return a.toFixed(2)},i=function(a){return a.toLocaleString()},_=function(a,h){return a+" ".repeat(Math.max(0,h-a.length))},P=function(a){const h=a.modelSize||"7B",d=x[h]||x["7B"],c=a.gpuType||"H100-80GB",n=G[c]||G["H100-80GB"],w=Math.max(1,Math.min(1e4,m(parseInt(a.gpuCount))||4)),H=Math.max(1,Math.min(8760,m(parseInt(a.trainingHours))||24)),u=Math.max(1,Math.min(1e3,m(parseInt(a.epochs))||3)),g=Math.max(0,Math.min(1e5,m(parseInt(a.cloudStorage))||0)),f=Math.max(0,Math.min(1e5,m(parseInt(a.dataProcessCost))||0)),K=d.isLoRA,R=K?H*j:H,p=R*u,L=p*w*n.hourlyRate,U=Math.max(.1,p/24/30),y=g*A*U,r=L+y+f,t=[];t.push(""),K?t.push(o("calc_out.section.ai_training_cost_estimator_lora","🤖 AI Training Cost Estimate (LoRA)")):t.push(o("calc_out.section.ai_training_cost_estimator","🤖 AI Training Cost Estimate")),t.push(""),t.push(o("calc_out.label.model","Model")+": "+z(d.name)+" | "+o("calc_out.label.gpu","GPU")+": "+w+"× "+n.name),t.push(o("calc_out.label.training","Training")+": "+i(H)+o("calc_out.ai_training_cost_estimator.row.unit_hrs_per_epoch"," hrs/epoch",{hrs:i(H)})+" × "+u+o("calc_out.ai_training_cost_estimator.row.unit_epochs"," epochs",{epochs:String(u)})+" = "+i(p)+o("calc_out.ai_training_cost_estimator.row.unit_total_gpu_hours"," total GPU-hours",{hours:i(p)})),t.push(""),t.push(o("calc_out.section.ai_training_cost_breakdown","💰 Cost Breakdown")),t.push(l.repeat(50)),t.push(o("calc_out.label.gpu_compute","GPU Compute")+":  "+_(w+"× "+n.name+" @ "+e(n.hourlyRate)+"/hr × "+i(p)+" hrs",45)+e(L)),t.push(o("calc_out.label.cloud_storage","Cloud Storage")+": "+_(i(g)+" GB @ $"+A.toFixed(2)+"/GB/mo × "+U.toFixed(1)+" mo",45)+e(y)),t.push(o("calc_out.label.data_processing","Data Processing")+":"+_(" "+e(f),45)+e(f)),t.push(l.repeat(50)),t.push(o("calc_out.label.total_estimated_cost","Total Estimated Cost")+": "+_("",23)+e(r)),t.push(""),t.push(o("calc_out.section.ai_training_per_epoch_tracking","📊 Per-Epoch Tracking")),t.push(l.repeat(50));const C=R*w*n.hourlyRate,nt=g*A*(R/24/30);t.push(o("calc_out.label.per_epoch_gpu_cost","Per Epoch GPU Cost")+": "+e(C)),t.push(o("calc_out.label.per_epoch_total","Per Epoch Total")+":    "+e(C+nt)),t.push("");const I="Epoch".padEnd(8),N="GPU Cost".padEnd(14),D="Cumulative".padEnd(16),ct=o("calc_out.label.epoch","Epoch")+I.slice(5)+" | "+o("calc_out.label.gpu_cost","GPU Cost")+N.slice(8)+" | "+o("calc_out.label.cumulative","Cumulative")+D.slice(10);t.push(ct),t.push("─".repeat(I.length+3+N.length+3+D.length));for(let s=1;s<=u;s++){const B=C*s,vt=g*A*(R*s/24/30),Mt=B+vt+f;t.push(String(s).padEnd(8)+" | "+e(C*s).padEnd(14)+" | "+e(Mt).padEnd(16))}t.push(""),t.push(o("calc_out.section.ai_training_cost_summary","📋 Cost Summary")),t.push(l.repeat(50));const E=r>0?Math.round(L/r*100):0,J=r>0?Math.round(y/r*100):0,Q=r>0?Math.round(f/r*100):0;t.push(o("calc_out.label.gpu","GPU")+":     "+e(L).padEnd(14)+" ("+E+"%)  "+"█".repeat(Math.round(E/5))),t.push(o("calc_out.label.storage","Storage")+": "+e(y).padEnd(14)+" ("+J+"%)  "+"▓".repeat(Math.round(J/5))),f>0&&t.push(o("calc_out.label.data","Data")+":    "+e(f).padEnd(14)+" ("+Q+"%)  "+"▒".repeat(Math.round(Q/5))),t.push(""),t.push(o("calc_out.section.ai_training_cost_range","📈 Cost Range (Optimistic — Pessimistic)")),t.push(l.repeat(50));const ut=r*.7,lt=r*1.5,ht=r*F,pt=r*X,_t=r*q,dt=r*$,Y=Math.round((1-X)*100),Z=Math.round((1-F)*100),O=Math.round((1-$)*100),V=Math.round((1-q)*100);t.push(o("calc_out.label.optimistic_spot_optimizations","Optimistic (spot instances + optimizations)")+":  "+e(ut)),t.push(o("calc_out.label.expected","Expected")+":"+" ".repeat(38)+e(r)),t.push(o("calc_out.label.pessimistic_ondemand_overhead","Pessimistic (on-demand + overhead)")+":"+" ".repeat(12)+e(lt)),t.push(""),t.push(o("calc_out.ai_training_cost_estimator.row.with_spot_discount","With Spot Discount ("+Y+"-"+Z+"% off)",{low:String(Y),high:String(Z)})+":        "+e(ht)+" - "+e(pt)),t.push(o("calc_out.ai_training_cost_estimator.row.with_reserved_discount","With Reserved Discount ("+O+"-"+V+"% off)",{low:String(O),high:String(V)})+":     "+e(_t)+" - "+e(dt)),t.push(""),t.push(o("calc_out.section.ai_training_multi_run_scaling","🔄 Multi-Run Scaling")),t.push(l.repeat(50));const S=[1,3,5,10,25,50],gt="Runs".padEnd(8);let T=o("calc_out.label.runs","Runs")+gt.slice(4);for(const s of S)T+=" | "+_(i(s),12);t.push(T);let k="".padEnd(8,l);for(const s of S)k+="─┼─".padEnd(13,l);t.push(k);const ft="Total".padEnd(8);let tt=o("calc_out.label.total","Total")+ft.slice(5);for(const s of S)tt+=" | "+_(e(r*s),12);t.push(tt),t.push("");const ot=p*w*100;t.push(o("calc_out.ai_training_cost_estimator.row.gpu_hours_equivalent","💡 "+i(p)+" GPU-hours ≈ "+i(ot)+" CPU-core-hours equivalent.",{hours:i(p),cpu:i(ot)})),t.push(o("calc_out.ai_training_cost_estimator.row.lora_cost_note","💡 LoRA fine-tuning reduces cost by ~65% vs full fine-tuning. Use checkpointing to protect against spot interruptions.")),t.push(""),t.push(o("calc_out.section.ai_training_cost_health","🩺 Cost Health:")),t.push(l.repeat(60)),d.isLoRA?t.push(o("calc_out.ai_training_cost_estimator.row.health_lora","• 🟢 LoRA mode — training only adapter weights, not the full model. ~65% cheaper than full fine-tune.")):t.push(o("calc_out.ai_training_cost_estimator.row.health_full","• 🟠 Full fine-tune — training all model weights. Most expensive option. Consider LoRA unless you have a specific need.")),u>5&&t.push(o("calc_out.ai_training_cost_estimator.row.health_epochs_aggressive","• 🟡 "+u+" epochs is aggressive — most models converge in 2-4. Diminishing returns past epoch 5 unless you have a specific reason.",{epochs:String(u)})),g>1e3&&t.push(o("calc_out.ai_training_cost_estimator.row.health_storage_significant","• 💡 "+i(g)+"GB storage is significant — consider S3 cold storage or dataset compression.",{gb:i(g)})),t.push(""),t.push(o("calc_out.section.what_if_scenarios","🔄 What-If Scenarios:")),t.push(l.repeat(60));const v=Math.round(1/j);if(d.isLoRA){const s=r*v;t.push(o("calc_out.ai_training_cost_estimator.row.whatif_switch_full_finetune","• Switch to full fine-tune:  "+e(s)+"  ("+v+"x cost, but better quality)",{cost:e(s),mult:String(v)}))}else{const s=r/v;t.push(o("calc_out.ai_training_cost_estimator.row.whatif_switch_lora","• Switch to LoRA fine-tuning:  "+e(s)+"  (1/"+v+" cost, similar quality for most tasks)",{cost:e(s),mult:String(v)}))}t.push(o("calc_out.ai_training_cost_estimator.row.whatif_halve_epochs","• Halve epochs to "+Math.max(1,Math.floor(u/2))+":  "+e(r/2)+"  (may need more data to compensate)",{epochs:String(Math.max(1,Math.floor(u/2))),cost:e(r/2)})),t.push(o("calc_out.ai_training_cost_estimator.row.whatif_double_epochs","• Double epochs to "+u*2+":  "+e(r*2)+"  (diminishing returns past 5)",{epochs:String(u*2),cost:e(r*2)}));const mt=c.replace(/-\\d+GB$/,""),at=Object.values(et.gpu.providers).map(s=>s.rates[mt]).filter(s=>typeof s=="number");if(at.length>0){const s=Math.min(...at),B=Math.round((1-s/n.hourlyRate)*100);t.push(o("calc_out.ai_training_cost_estimator.row.whatif_cheaper_gpu_market","• Switch to cheaper GPU in same tier:  cheapest market rate for "+n.name+" is $"+M(s)+"/hr vs $"+M(n.hourlyRate)+"/hr baseline — save ~"+B+"%",{gpu:n.name,market:"$"+M(s)+"/hr",baseline:"$"+M(n.hourlyRate)+"/hr",save:String(B)}))}else t.push(o("calc_out.ai_training_cost_estimator.row.whatif_cheaper_gpu_compare","• Switch to cheaper GPU in same tier:  compare per-GPU-hour rates across cloud providers"));return t.push(""),t},W=function(a,h,d){var c=it(a);return Array.isArray(c)?c.join(\`
\`):String(c)};var wt=m,At=z,bt=e,Ht=M,Rt=i,Lt=_,yt=P,Ct=W,et={gpu:{providers:{runpod:{name:"RunPod",spotMult:.6,reservedMult:.85,rates:{H200:2.49,H100:1.99,A100:.79,L40S:.69,RTX4090:.49,A6000:.39},order:1},vastai:{name:"Vast.ai",spotMult:.5,reservedMult:.8,rates:{H200:2.2,H100:1.69,A100:.69,L40S:.59,RTX4090:.44,A6000:.35},order:2},lambdalabs:{name:"Lambda Labs",spotMult:.7,reservedMult:.9,rates:{H200:2.8,H100:2.49,A100:1.1,L40S:.8,RTX4090:.55,A6000:.5},order:3},aws:{name:"AWS",spotMult:.4,reservedMult:.7,rates:{H200:5,H100:4,A100:3.5,L40S:1.2,RTX4090:.8,A6000:.65},order:4},gcp:{name:"GCP",spotMult:.45,reservedMult:.75,rates:{H200:4.5,H100:4.2,A100:2.8,L40S:1,RTX4090:.7,A6000:.6},order:5},azure:{name:"Azure",spotMult:.5,reservedMult:.8,rates:{H200:4.8,H100:3.8,A100:3,L40S:1.1,RTX4090:.75,A6000:.62},order:6}},storagePerGB:.1,egressPerGB:.08}},o=tk,st='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',o=new Function("return "+st)(),G={"H200-141GB":{hourlyRate:3.5,name:"H200 141GB",order:1},"H100-80GB":{hourlyRate:2.5,name:"H100 80GB",order:2},"A100-80GB":{hourlyRate:1.5,name:"A100 80GB",order:3},"L40S-48GB":{hourlyRate:.8,name:"L40S 48GB",order:4},"RTX-6000":{hourlyRate:.5,name:"RTX 6000 Ada",order:5}},x={"7B":{h200:2,h100:4,a100:8,l40s:16,name:"7B (LoRA fine-tune)",isLoRA:!0,order:1},"13B":{h200:4,h100:8,a100:16,name:"13B (LoRA fine-tune)",isLoRA:!0,order:2},"70B":{h200:16,h100:32,a100:64,name:"70B (full fine-tune)",isLoRA:!1,order:3},"180B":{h200:64,h100:128,name:"180B (full fine-tune)",isLoRA:!1,order:4},"405B":{h200:128,h100:256,name:"405B (full train)",isLoRA:!1,order:5}},rt={"LoRA fine-tune":"LoRA fine-tune","full fine-tune":"full fine-tune","full train":"full train"},A=.1,b=[{name:"RunPod",spotMult:.6,reservedMult:.85,rates:{H200:2.49,H100:1.99,A100:.79,L40S:.69,RTX4090:.49,A6000:.39},order:1},{name:"Vast.ai",spotMult:.5,reservedMult:.8,rates:{H200:2.2,H100:1.69,A100:.69,L40S:.59,RTX4090:.44,A6000:.35},order:2},{name:"Lambda Labs",spotMult:.7,reservedMult:.9,rates:{H200:2.8,H100:2.49,A100:1.1,L40S:.8,RTX4090:.55,A6000:.5},order:3},{name:"AWS",spotMult:.4,reservedMult:.7,rates:{H200:5,H100:4,A100:3.5,L40S:1.2,RTX4090:.8,A6000:.65},order:4},{name:"GCP",spotMult:.45,reservedMult:.75,rates:{H200:4.5,H100:4.2,A100:2.8,L40S:1,RTX4090:.7,A6000:.6},order:5},{name:"Azure",spotMult:.5,reservedMult:.8,rates:{H200:4.8,H100:3.8,A100:3,L40S:1.1,RTX4090:.75,A6000:.62},order:6}],F=Math.min(...b.map(a=>a.spotMult)),X=Math.max(...b.map(a=>a.spotMult)),q=Math.min(...b.map(a=>a.reservedMult)),$=Math.max(...b.map(a=>a.reservedMult)),j=.35,l="─",it=function(a){return P(a)};return[W(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

const engine: ToolEngine = {
  slug: 'solopreneur-ai-training-cost-estimator',
  title: 'AI Training Cost Estimator',
  description: 'Estimate AI model training costs from 7B to 405B parameters. LoRA/full fine-tuning modes, 5 GPU types (H200, H100, A100, L40S, RTX 6000), cloud storage + data processing costs, per-epoch tracking, and multi-run scaling.',
  inputs: [
    { name: 'modelSize', label: 'Model Size', placeholder: '', type: 'select', options: ['7B', '13B', '70B', '180B', '405B'] },
    { name: 'gpuType', label: 'GPU Type', placeholder: '', type: 'select', options: ['H200-141GB', 'H100-80GB', 'A100-80GB', 'L40S-48GB', 'RTX-6000'] },
    { name: 'gpuCount', label: 'GPU Count', placeholder: 'e.g. 4', type: 'number' },
    { name: 'trainingHours', label: 'Hours per Epoch', placeholder: 'e.g. 24', type: 'number' },
    { name: 'epochs', label: 'Number of Epochs', placeholder: 'e.g. 3', type: 'number' },
    { name: 'cloudStorage', label: 'Cloud Storage (GB)', placeholder: 'e.g. 200', type: 'number' },
    { name: 'dataProcessCost', label: 'Data Processing Cost ($)', placeholder: 'e.g. 100', type: 'number' },
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
    { key: 'quick-lora',  emoji: '⚡', fields: { modelSize: '7B',   gpuType: 'H100-80GB',  gpuCount: '2',   trainingHours: '8',   epochs: '3', cloudStorage: '50',  dataProcessCost: '20'  } },
    { key: 'mid-13b',  emoji: '🔧', fields: { modelSize: '13B',  gpuType: 'A100-80GB',  gpuCount: '8',   trainingHours: '24',  epochs: '5', cloudStorage: '200', dataProcessCost: '100' } },
    { key: 'full-70b', emoji: '🚀', fields: { modelSize: '70B',  gpuType: 'H200-141GB', gpuCount: '16',  trainingHours: '48',  epochs: '3', cloudStorage: '500', dataProcessCost: '300' } },
    { key: 'enterprise-180b', emoji: '🏢', fields: { modelSize: '180B', gpuType: 'H200-141GB', gpuCount: '64',  trainingHours: '168', epochs: '2', cloudStorage: '2000', dataProcessCost: '1000' } },
    { key: 'budget-7b', emoji: '💰', fields: { modelSize: '7B',   gpuType: 'RTX-6000',   gpuCount: '4',   trainingHours: '12',  epochs: '5', cloudStorage: '30',  dataProcessCost: '10'  } },
    { key: 'pro-405b', emoji: '👑', fields: { modelSize: '405B', gpuType: 'H200-141GB', gpuCount: '128', trainingHours: '720', epochs: '1', cloudStorage: '5000', dataProcessCost: '2000' } },
  ],
  staticExamples: [
    '\n$calc_out.section.ai_training_cost_estimator_lora|🤖 AI Training Cost Estimate (LoRA)|\n\n$calc_out.label.model|Model|: 7B ($calc_out.ai_training_cost_estimator.row.model_variant_lora_fine_tune|LoRA fine-tune|) | $calc_out.label.gpu|GPU|: 8× A100 80GB\n$calc_out.label.training|Training|: 24$calc_out.ai_training_cost_estimator.row.unit_hrs_per_epoch{"hrs":"24"}| hrs/epoch| × 3$calc_out.ai_training_cost_estimator.row.unit_epochs{"epochs":"3"}| epochs| = 25.2$calc_out.ai_training_cost_estimator.row.unit_total_gpu_hours{"hours":"25.2"}| total GPU-hours|\n\n$calc_out.section.ai_training_cost_breakdown|💰 Cost Breakdown|\n──────────────────────────────────────────────────\n$calc_out.label.gpu_compute|GPU Compute|:  8× A100 80GB @ $1.50/hr × 25.2 hrs           $302.40\n$calc_out.label.cloud_storage|Cloud Storage|: 500 GB @ $0.10/GB/mo × 0.1 mo                $5.00\n$calc_out.label.data_processing|Data Processing|: $1000.00                                    $1000.00\n──────────────────────────────────────────────────\n$calc_out.label.total_estimated_cost|Total Estimated Cost|:                        $1307.40\n\n$calc_out.section.ai_training_per_epoch_tracking|📊 Per-Epoch Tracking|\n──────────────────────────────────────────────────\n$calc_out.label.per_epoch_gpu_cost|Per Epoch GPU Cost|: $100.80\n$calc_out.label.per_epoch_total|Per Epoch Total|:    $101.38\n\n$calc_out.label.epoch|Epoch|    | $calc_out.label.gpu_cost|GPU Cost|       | $calc_out.label.cumulative|Cumulative|      \n────────────────────────────────────────────\n1        | $100.80        | $1101.38        \n2        | $201.60        | $1202.77        \n3        | $302.40        | $1304.15        \n\n$calc_out.section.ai_training_cost_summary|📋 Cost Summary|\n──────────────────────────────────────────────────\n$calc_out.label.gpu|GPU|:     $302.40        (23%)  █████\n$calc_out.label.storage|Storage|: $5.00          (0%)  \n$calc_out.label.data|Data|:    $1000.00       (76%)  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒\n\n$calc_out.section.ai_training_cost_range|📈 Cost Range (Optimistic — Pessimistic)|\n──────────────────────────────────────────────────\n$calc_out.label.optimistic_spot_optimizations|Optimistic (spot instances + optimizations)|:  $915.18\n$calc_out.label.expected|Expected|:                                      $1307.40\n$calc_out.label.pessimistic_ondemand_overhead|Pessimistic (on-demand + overhead)|:            $1961.10\n\n$calc_out.ai_training_cost_estimator.row.with_spot_discount{"low":"30","high":"60"}|With Spot Discount (30-60% off)|:        $522.96 - $915.18\n$calc_out.ai_training_cost_estimator.row.with_reserved_discount{"low":"10","high":"30"}|With Reserved Discount (10-30% off)|:     $915.18 - $1176.66\n\n$calc_out.section.ai_training_multi_run_scaling|🔄 Multi-Run Scaling|\n──────────────────────────────────────────────────\n$calc_out.label.runs|Runs|     | 1            | 3            | 5            | 10           | 25           | 50          \n─────────┼────────────┼────────────┼────────────┼────────────┼────────────┼───────────\n$calc_out.label.total|Total|    | $1307.40     | $3922.20     | $6537.00     | $13074.00    | $32685.00    | $65370.00   \n\n$calc_out.ai_training_cost_estimator.row.gpu_hours_equivalent{"hours":"25.2","cpu":"20,160"}|💡 25.2 GPU-hours ≈ 20,160 CPU-core-hours equivalent.|\n$calc_out.ai_training_cost_estimator.row.lora_cost_note|💡 LoRA fine-tuning reduces cost by ~65% vs full fine-tuning. Use checkpointing to protect against spot interruptions.|\n\n$calc_out.section.ai_training_cost_health|🩺 Cost Health:|\n────────────────────────────────────────────────────────────\n$calc_out.ai_training_cost_estimator.row.health_lora|• 🟢 LoRA mode — training only adapter weights, not the full model. ~65% cheaper than full fine-tune.|\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n────────────────────────────────────────────────────────────\n$calc_out.ai_training_cost_estimator.row.whatif_switch_full_finetune{"cost":"$3922.20","mult":"3"}|• Switch to full fine-tune:  $3922.20  (3x cost, but better quality)|\n$calc_out.ai_training_cost_estimator.row.whatif_halve_epochs{"epochs":"1","cost":"$653.70"}|• Halve epochs to 1:  $653.70  (may need more data to compensate)|\n$calc_out.ai_training_cost_estimator.row.whatif_double_epochs{"epochs":"6","cost":"$2614.80"}|• Double epochs to 6:  $2614.80  (diminishing returns past 5)|\n$calc_out.ai_training_cost_estimator.row.whatif_cheaper_gpu_market{"gpu":"A100 80GB","market":"$0.69/hr","baseline":"$1.50/hr","save":"54"}|• Switch to cheaper GPU in same tier:  cheapest market rate for A100 80GB is $0.69/hr vs $1.50/hr baseline — save ~54%|\n',
  ],
  faq: [
    { q: 'How much does it cost to train a 7B model in 2026?', a: 'LoRA fine-tuning a 7B model: {{liveTrainingGpuCost:H100-80GB|4|4}}-{{liveTrainingGpuCost:H100-80GB|24|4}} on 4 H100 GPUs (4-24 hrs). Full fine-tuning: roughly {{liveTrainingFullFtMult}}x that. Pre-training from scratch: orders of magnitude more. With H200 GPUs, a 7B LoRA can complete in 2-4 hours at {{liveTrainingGpuRate:H200-141GB}}/hr/GPU — under {{liveTrainingGpuCost:H200-141GB|4|2}} for a quick fine-tune on 2 GPUs. Budget GPU (RTX 6000 at {{liveTrainingGpuRate:RTX-6000}}/hr) can do a 7B LoRA for under {{liveTrainingGpuCost:RTX-6000|24|4}}.' },
    { q: 'LoRA vs Full Fine-Tuning — which should I choose?', a: 'LoRA (Low-Rank Adaptation) fine-tunes only ~1% of parameters, reducing GPU memory and cost by 60-80%. Best for: domain adaptation, style transfer, instruction following — most solopreneur use cases. Full fine-tuning updates all parameters and is needed for: teaching entirely new knowledge, major capability changes, or when LoRA underperforms. For 7B-13B models, LoRA is almost always the right first choice.' },
    { q: 'Which GPU should I use for training?', a: '{{liveTrainingGpuName:H200-141GB}} (latest): best for 70B+ models, {{liveTrainingGpuRate:H200-141GB}}/hr. {{liveTrainingGpuName:H100-80GB}}: 2-3x faster than A100 for LLMs, {{liveTrainingGpuRate:H100-80GB}}/hr. {{liveTrainingGpuName:A100-80GB}}: standard choice, {{liveTrainingGpuRate:A100-80GB}}/hr — good availability. {{liveTrainingGpuName:L40S-48GB}}: good for 7B-13B LoRA, {{liveTrainingGpuRate:L40S-48GB}}/hr. {{liveTrainingGpuName:RTX-6000}}: budget option for 7B LoRA, {{liveTrainingGpuRate:RTX-6000}}/hr. For most solopreneurs: {{liveTrainingGpuName:A100-80GB}} for anything serious, {{liveTrainingGpuName:H100-80GB}} for speed, {{liveTrainingGpuName:RTX-6000}} for budget experiments.' },
    { q: 'How much does cloud storage add to training costs?', a: 'At {{liveTrainingStorage}}/GB/month, storage is usually a minor cost. Dataset storage: 100GB of training data = {{liveTrainingStorageFor:100}}/month. Model checkpoints: ~10-100GB per checkpoint. For short training runs (under 1 week), storage is negligible. For long-running experiments, factor in model checkpointing costs. Total storage for most training jobs: {{liveTrainingStorageFor:50}}-{{liveTrainingStorageFor:500}}.' },
    { q: 'Should I train my own model or use an API?', a: 'For 99% of solopreneurs: use an API (DeepSeek V4 Flash, GPT-5 Mini, Claude Haiku). Only train if you need: specialized domain knowledge not in base models, data privacy/air-gap requirements, lower inference costs at high volume (100K+ requests/day), or a unique capability not offered by APIs. Start with prompt engineering + RAG before considering training.' },
    { q: 'How do I reduce training costs?', a: 'Six proven techniques: (1) LoRA instead of full fine-tuning saves 65%+. (2) Spot/preemptible instances save {{liveTrainingSpotOff}}%; reserved instances save {{liveTrainingReservedOff}}%. (3) Gradient checkpointing saves 30-50% GPU memory. (4) Mixed precision (FP16/BF16) doubles throughput. (5) FlashAttention reduces memory by 2-8x. (6) Efficient data loading prevents GPU idle time. Combined, these can reduce costs by 80-90% vs naive full fine-tuning.' },
    { q: 'What is the cost to train a 405B model?', a: 'Training a 405B model (e.g., Llama 4 scale) requires 128+ H200 GPUs running for weeks/months. Ballpark: 128 H200 GPUs × 720 hrs × {{liveTrainingGpuRate:H200-141GB}}/hr = ~{{liveTrainingGpuCost:H200-141GB|720|128}} in GPU costs alone. With data processing at {{liveTrainingDataProcess}}/GB, storage, and engineering overhead, the total is a multiple of that GPU figure. This is enterprise-only territory. Most solopreneurs should fine-tune existing 7B-70B open models instead.' },
    { q: "How much does it cost to train a custom LLM?", a: "LLaMA-7B from scratch: a six-figure sum on 8x A100 for 2-4 weeks. Fine-tuning 7B with LoRA: {{liveTrainingGpuCost:H100-80GB|4|4}}-{{liveTrainingGpuCost:H100-80GB|24|4}}. Fine-tuning with full parameters: roughly {{liveTrainingFullFtMult}}x that. RLHF: 5-10x base cost. OpenAI fine-tuning: metered per training token, plus 2x inference. Most production use cases only need LoRA fine-tuning." },
    { q: "What is the difference between LoRA and full fine-tuning?", a: "LoRA (Low-Rank Adaptation): trains small adapter layers, ~1% of parameters, 35% of compute, {{liveTrainingGpuCost:H100-80GB|4|4}}-{{liveTrainingGpuCost:H100-80GB|24|4}} for 7B. Full fine-tuning: updates all weights, 100% compute, roughly {{liveTrainingFullFtMult}}x that. LoRA quality is 90-95% of full FT for most tasks. Use LoRA unless you have a specific reason." },

    { q: "How long does fine-tuning take?", a: "LoRA on 7B with 100K examples: 4-8 hours on A100. Full fine-tuning 7B: 1-3 days. RLHF on 7B: 1-2 weeks. RLHF on 70B: 1-3 months. Use smaller models (1B-3B) for fast iteration: 1-3 hours. Always validate on a held-out set before scaling compute." },
    { q: "How do I estimate training cost from dataset size?", a: "Tokens = dataset_examples × avg_tokens_per_example. Training cost = tokens × token_cost + GPU_hours × GPU_rate. For 100K examples × 1000 tokens = 100M tokens. LoRA cost: 100M tokens × the A100 effective token rate + setup overhead. Full FT: 5-10x more." },
    { q: "Should I use managed services or self-host?", a: "Managed (OpenAI, Anthropic, AWS Bedrock): metered per training token, no infra, fast to start. Self-host: a low single-digit hourly GPU rate, cheaper at scale, full control. Use managed for: prototypes, <1M tokens, no custom infra team. Self-host for: production scale, data privacy, model customization." },
    { q: "What is RLHF and when do I need it?", a: "RLHF (Reinforcement Learning from Human Feedback) trains models to be helpful/harmless via human preferences. Cost: 5-10x base fine-tuning. Use for: instruction-following, safety, alignment. Skip for: domain-specific tasks (extract, classify, summarize) — supervised fine-tuning is sufficient." },
    { q: "How do I optimize training cost?", a: "Use LoRA instead of full FT. Use gradient checkpointing (saves 30% memory, +20% time). Use mixed precision (bf16/fp16). Use flash attention 2 (2-4x faster). Use smaller batch sizes with gradient accumulation. Use early stopping. Use cheaper GPU tiers when you can." },
  ],
  howToUse: [
    'Select your target model size (7B to 405B) — LoRA for 7B/13B, full fine-tune for larger models.',
    'Choose your GPU type — H200 for bleeding-edge speed, A100 for best availability, RTX 6000 for budget.',
    'Enter the number of GPUs — more GPUs = faster but higher hourly cost.',
    'Set training hours per epoch and total epochs — longer training captures more patterns but costs more.',
    'Add cloud storage (dataset + checkpoints in GB) and data processing costs for a complete estimate.',
    'Review per-epoch costs, optimistic/pessimistic ranges, and multi-run scaling to plan your total training budget.',
  ],
  dataLastUpdated: PRICING.lastUpdated,
  engineKey: true,
};

registerEngine(engine);
