import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

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

const GPU_TYPES: Record<string, GpuInfo> = {
  'H200-141GB': { hourlyRate: 3.50, name: 'H200 141GB', order: 1 },
  'H100-80GB': { hourlyRate: 2.50, name: 'H100 80GB', order: 2 },
  'A100-80GB': { hourlyRate: 1.50, name: 'A100 80GB', order: 3 },
  'L40S-48GB': { hourlyRate: 0.80, name: 'L40S 48GB', order: 4 },
  'RTX-6000': { hourlyRate: 0.50, name: 'RTX 6000 Ada', order: 5 },
};

const MODEL_SIZES: Record<string, ModelInfo> = {
  '7B': { h200: 2, h100: 4, a100: 8, l40s: 16, name: '7B (LoRA fine-tune)', isLoRA: true, order: 1 },
  '13B': { h200: 4, h100: 8, a100: 16, name: '13B (LoRA fine-tune)', isLoRA: true, order: 2 },
  '70B': { h200: 16, h100: 32, a100: 64, name: '70B (full fine-tune)', isLoRA: false, order: 3 },
  '180B': { h200: 64, h100: 128, name: '180B (full fine-tune)', isLoRA: false, order: 4 },
  '405B': { h200: 128, h100: 256, name: '405B (full train)', isLoRA: false, order: 5 },
};

// Storage cost per GB per month
const STORAGE_COST_PER_GB = 0.10;

// Data processing cost per GB
const DATA_PROCESS_COST_PER_GB = 1.50;

// Epoch time multiplier — LoRA is faster per epoch
const LORA_EPOCH_SPEEDUP = 0.35; // LoRA epoch takes 35% of full fine-tune time

const PRESETS: Record<string, Record<string, string>> = {
  'Quick LoRA 7B': {
    modelSize: '7B', gpuType: 'H100-80GB', gpuCount: '2', trainingHours: '8', epochs: '3', cloudStorage: '50', dataProcessCost: '20',
  },
  'Mid-Scale 13B': {
    modelSize: '13B', gpuType: 'A100-80GB', gpuCount: '8', trainingHours: '24', epochs: '5', cloudStorage: '200', dataProcessCost: '100',
  },
  'Full 70B Fine-Tune': {
    modelSize: '70B', gpuType: 'H200-141GB', gpuCount: '16', trainingHours: '48', epochs: '3', cloudStorage: '500', dataProcessCost: '300',
  },
  'Enterprise 180B': {
    modelSize: '180B', gpuType: 'H200-141GB', gpuCount: '64', trainingHours: '168', epochs: '2', cloudStorage: '2000', dataProcessCost: '1000',
  },
  'Budget 7B': {
    modelSize: '7B', gpuType: 'RTX-6000', gpuCount: '4', trainingHours: '12', epochs: '5', cloudStorage: '30', dataProcessCost: '10',
  },
  'Pro 405B Full Train': {
    modelSize: '405B', gpuType: 'H200-141GB', gpuCount: '128', trainingHours: '720', epochs: '1', cloudStorage: '5000', dataProcessCost: '2000',
  },
};

function fmt(n: number): string { return '$' + n.toFixed(2); }
function lc(n: number): string { return n.toLocaleString(); }
function pad(s: string, len: number): string { return s + ' '.repeat(Math.max(0, len - s.length)); }
const SEP = '─';

function calculate(inputs: Record<string, string>): string[] {
  const modelKey = inputs.modelSize || '7B';
  const model = MODEL_SIZES[modelKey] || MODEL_SIZES['7B'];
  const gpuKey = inputs.gpuType || 'H100-80GB';
  const gpu = GPU_TYPES[gpuKey] || GPU_TYPES['H100-80GB'];
  const gpuCount = Math.max(1, Math.min(10000, parseInt(inputs.gpuCount) || 4));
  const trainingHours = Math.max(1, Math.min(8760, parseInt(inputs.trainingHours) || 24));
  const epochs = Math.max(1, Math.min(1000, parseInt(inputs.epochs) || 3));
  const cloudStorageGB = Math.max(0, Math.min(100000, parseInt(inputs.cloudStorage) || 0));
  const dataProcessCost = Math.max(0, Math.min(100000, parseInt(inputs.dataProcessCost) || 0));

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

  // Section 1: Header
  let header = '\u{1F916} AI Training Cost Estimate';
  if (isLoRA) header += ' (LoRA)';
  out.push(header);
  out.push('');
  out.push('Model: ' + model.name + ' | GPU: ' + gpuCount + '× ' + gpu.name);
  out.push('Training: ' + lc(trainingHours) + ' hrs/epoch × ' + epochs + ' epochs = ' + lc(totalGpuHours) + ' total GPU-hours');
  out.push('');

  // Section 2: Cost Breakdown
  out.push('\u{1F4B0} Cost Breakdown');
  out.push(SEP.repeat(50));
  out.push('GPU Compute:  ' + pad(gpuCount + '× ' + gpu.name + ' @ ' + fmt(gpu.hourlyRate) + '/hr × ' + lc(totalGpuHours) + ' hrs', 45) + fmt(gpuCost));
  out.push('Cloud Storage: ' + pad(lc(cloudStorageGB) + ' GB @ $' + STORAGE_COST_PER_GB.toFixed(2) + '/GB/mo × ' + trainingMonths.toFixed(1) + ' mo', 45) + fmt(storageCost));
  out.push('Data Processing:' + pad(' $' + fmt(dataProcessCost), 45) + fmt(dataProcessCost));
  out.push(SEP.repeat(50));
  out.push('Total Estimated Cost: ' + pad('', 23) + fmt(totalCost));
  out.push('');

  // Per-epoch cost breakdown
  out.push('\u{1F4CA} Per-Epoch Tracking');
  out.push(SEP.repeat(50));
  const perEpochGpu = effectiveHoursPerEpoch * gpuCount * gpu.hourlyRate;
  const perEpochStorage = cloudStorageGB * STORAGE_COST_PER_GB * (effectiveHoursPerEpoch / 24 / 30);
  out.push('Per Epoch GPU Cost: ' + fmt(perEpochGpu));
  out.push('Per Epoch Total:    ' + fmt(perEpochGpu + perEpochStorage));
  out.push('');

  // Epoch-by-epoch table
  let tblHdr = 'Epoch'.padEnd(8) + ' | ' + 'GPU Cost'.padEnd(14) + ' | ' + 'Cumulative'.padEnd(16);
  out.push(tblHdr);
  out.push('─'.repeat(tblHdr.length));
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
  out.push('\u{1F4CB} Cost Summary');
  out.push(SEP.repeat(50));
  const pctGpu = totalCost > 0 ? Math.round((gpuCost / totalCost) * 100) : 0;
  const pctStorage = totalCost > 0 ? Math.round((storageCost / totalCost) * 100) : 0;
  const pctData = totalCost > 0 ? Math.round((dataProcessCost / totalCost) * 100) : 0;
  out.push('GPU:     ' + fmt(gpuCost).padEnd(14) + ' (' + pctGpu + '%)  ' + '█'.repeat(Math.round(pctGpu / 5)));
  out.push('Storage: ' + fmt(storageCost).padEnd(14) + ' (' + pctStorage + '%)  ' + '▓'.repeat(Math.round(pctStorage / 5)));
  if (dataProcessCost > 0) {
    out.push('Data:    ' + fmt(dataProcessCost).padEnd(14) + ' (' + pctData + '%)  ' + '▒'.repeat(Math.round(pctData / 5)));
  }
  out.push('');

  // Section 4: Optimistic/Pessimistic Range
  out.push('\u{1F4C8} Cost Range (Optimistic — Pessimistic)');
  out.push(SEP.repeat(50));
  const optimistic = totalCost * 0.7;
  const pessimistic = totalCost * 1.5;
  const withReserved = totalCost * 0.6; // spot instance savings
  out.push('Optimistic (spot instances + optimizations):  ' + fmt(optimistic));
  out.push('Expected:                                      ' + fmt(totalCost));
  out.push('Pessimistic (on-demand + overhead):            ' + fmt(pessimistic));
  out.push('');
  out.push('With Spot/Reserved Discount (40% off):          ' + fmt(withReserved));
  out.push('');

  // Section 5: Multi-Run Scaling
  out.push('\u{1F504} Multi-Run Scaling');
  out.push(SEP.repeat(50));
  const runs = [1, 3, 5, 10, 25, 50];
  let runHdr = 'Runs'.padEnd(8);
  for (const r of runs) runHdr += ' | ' + pad(lc(r), 12);
  out.push(runHdr);
  let runSep = ''.padEnd(8, SEP);
  for (const _ of runs) runSep += '─┼─'.padEnd(13, SEP);
  out.push(runSep);
  let totalRow = 'Total'.padEnd(8);
  for (const r of runs) totalRow += ' | ' + pad(fmt(totalCost * r), 12);
  out.push(totalRow);
  out.push('');

  // CPU-hours equivalent comparison
  const cpuEquiv = totalGpuHours * gpuCount * 100; // rough: 1 GPU-hour ≈ 100 CPU-core-hours
  out.push('\u{1F4A1} ' + lc(totalGpuHours) + ' GPU-hours ≈ ' + lc(cpuEquiv) + ' CPU-core-hours equivalent.');
  out.push('\u{1F4A1} LoRA fine-tuning reduces cost by ~65% vs full fine-tuning. Use checkpointing to protect against spot interruptions.');

  return out;
}

// customFn — exact sync with calculate()
const customFn =
  "var GT={" +
  "'H200-141GB':{hr:3.5,n:'H200 141GB',od:1}," +
  "'H100-80GB':{hr:2.5,n:'H100 80GB',od:2}," +
  "'A100-80GB':{hr:1.5,n:'A100 80GB',od:3}," +
  "'L40S-48GB':{hr:0.8,n:'L40S 48GB',od:4}," +
  "'RTX-6000':{hr:0.5,n:'RTX 6000 Ada',od:5}" +
  "};" +
  "var MS={" +
  "'7B':{h200:2,h100:4,a100:8,l40s:16,n:'7B (LoRA fine-tune)',isL:true,od:1}," +
  "'13B':{h200:4,h100:8,a100:16,n:'13B (LoRA fine-tune)',isL:true,od:2}," +
  "'70B':{h200:16,h100:32,a100:64,n:'70B (full fine-tune)',isL:false,od:3}," +
  "'180B':{h200:64,h100:128,n:'180B (full fine-tune)',isL:false,od:4}," +
  "'405B':{h200:128,h100:256,n:'405B (full train)',isL:false,od:5}" +
  "};" +
  "var SCG=0.1;var DPCG=1.5;var LES=0.35;" +
  "function fm2(n){return '$'+n.toFixed(2)}function lc2(n){return n.toLocaleString()}function pd2(s,l){return s+' '.repeat(Math.max(0,l-s.length))}" +
  "var SEP4='\\u2500';" +
  "var mk=inputs.modelSize||'7B';var m=MS[mk]||MS['7B'];" +
  "var gk=inputs.gpuType||'H100-80GB';var g=GT[gk]||GT['H100-80GB'];" +
  "var gc2=Math.max(1,Math.min(1e4,parseInt(inputs.gpuCount)||4));" +
  "var th=Math.max(1,Math.min(8760,parseInt(inputs.trainingHours)||24));" +
  "var ep=Math.max(1,Math.min(1e3,parseInt(inputs.epochs)||3));" +
  "var csg=Math.max(0,Math.min(1e5,parseInt(inputs.cloudStorage)||0));" +
  "var dpc=Math.max(0,Math.min(1e5,parseInt(inputs.dataProcessCost)||0));" +
  "var isL=m.isL;var ehp=isL?th*LES:th;" +
  "var tgh=ehp*ep;var gpc=tgh*gc2*g.hr;" +
  "var tm=Math.max(0.1,(tgh/24)/30);var sc=csg*SCG*tm;" +
  "var tc=gpc+sc+dpc;" +
  "var o=[];" +
  "var hdr2='\\u{1F916} AI Training Cost Estimate';if(isL)hdr2+=' (LoRA)';" +
  "o.push(hdr2);o.push('');" +
  "o.push('Model: '+m.n+' | GPU: '+gc2+'\\u00D7 '+g.n);" +
  "o.push('Training: '+lc2(th)+' hrs/epoch \\u00D7 '+ep+' epochs = '+lc2(tgh)+' total GPU-hours');o.push('');" +
  "o.push('\\u{1F4B0} Cost Breakdown');o.push(SEP4.repeat(50));" +
  "o.push('GPU Compute:  '+pd2(gc2+'\\u00D7 '+g.n+' @ '+fm2(g.hr)+'/hr \\u00D7 '+lc2(tgh)+' hrs',45)+fm2(gpc));" +
  "o.push('Cloud Storage: '+pd2(lc2(csg)+' GB @ $'+SCG.toFixed(2)+'/GB/mo \\u00D7 '+tm.toFixed(1)+' mo',45)+fm2(sc));" +
  "o.push('Data Processing:'+pd2(' $'+fm2(dpc),45)+fm2(dpc));" +
  "o.push(SEP4.repeat(50));" +
  "o.push('Total Estimated Cost: '+pd2('',23)+fm2(tc));o.push('');" +
  "o.push('\\u{1F4CA} Per-Epoch Tracking');o.push(SEP4.repeat(50));" +
  "var peg=ehp*gc2*g.hr;var pes=csg*SCG*(ehp/24/30);" +
  "o.push('Per Epoch GPU Cost: '+fm2(peg));" +
  "o.push('Per Epoch Total:    '+fm2(peg+pes));o.push('');" +
  "var th2='Epoch'.padEnd(8)+' | '+'GPU Cost'.padEnd(14)+' | '+'Cumulative'.padEnd(16);o.push(th2);" +
  "o.push('\\u2500'.repeat(th2.length));" +
  "for(var e=1;e<=ep;e++){" +
  "var cg2=peg*e;var cs2=csg*SCG*((ehp*e)/24/30);var ct2=cg2+cs2+dpc;" +
  "o.push(String(e).padEnd(8)+' | '+fm2(peg*e).padEnd(14)+' | '+fm2(ct2).padEnd(16));}" +
  "o.push('');" +
  "o.push('\\u{1F4CB} Cost Summary');o.push(SEP4.repeat(50));" +
  "var pg=tc>0?Math.round((gpc/tc)*100):0;var ps2=tc>0?Math.round((sc/tc)*100):0;var pd3=tc>0?Math.round((dpc/tc)*100):0;" +
  "o.push('GPU:     '+fm2(gpc).padEnd(14)+' ('+pg+'%)  '+Array(Math.round(pg/5)+1).join('\\u2588'));" +
  "o.push('Storage: '+fm2(sc).padEnd(14)+' ('+ps2+'%)  '+Array(Math.round(ps2/5)+1).join('\\u2593'));" +
  "if(dpc>0){o.push('Data:    '+fm2(dpc).padEnd(14)+' ('+pd3+'%)  '+Array(Math.round(pd3/5)+1).join('\\u2592'));}" +
  "o.push('');" +
  "o.push('\\u{1F4C8} Cost Range (Optimistic \\u2014 Pessimistic)');o.push(SEP4.repeat(50));" +
  "o.push('Optimistic (spot instances + optimizations):  '+fm2(tc*0.7));" +
  "o.push('Expected:                                      '+fm2(tc));" +
  "o.push('Pessimistic (on-demand + overhead):            '+fm2(tc*1.5));" +
  "o.push('');o.push('With Spot/Reserved Discount (40% off):          '+fm2(tc*0.6));o.push('');" +
  "o.push('\\u{1F504} Multi-Run Scaling');o.push(SEP4.repeat(50));" +
  "var rns=[1,3,5,10,25,50];" +
  "var rh='Runs'.padEnd(8);for(var ri=0;ri<rns.length;ri++)rh+=' | '+pd2(lc2(rns[ri]),12);o.push(rh);" +
  "var rs=''.padEnd(8,SEP4);for(var ri2=0;ri2<rns.length;ri2++)rs+='\\u2500\\u253C\\u2500'.padEnd(13,SEP4);o.push(rs);" +
  "var tr2='Total'.padEnd(8);for(var ri3=0;ri3<rns.length;ri3++)tr2+=' | '+pd2(fm2(tc*rns[ri3]),12);o.push(tr2);" +
  "o.push('');" +
  "var ce=tgh*gc2*100;o.push('\\u{1F4A1} '+lc2(tgh)+' GPU-hours \\u2248 '+lc2(ce)+' CPU-core-hours equivalent.');" +
  "o.push('\\u{1F4A1} LoRA fine-tuning reduces cost by ~65% vs full fine-tuning. Use checkpointing to protect against spot interruptions.');" +
  "return o;";

const engine: ToolEngine = {
  slug: 'solopreneur-ai-training-cost-estimator',
  title: 'AI Training Cost Estimator',
  description: 'Estimate AI model training costs from 7B to 405B parameters. LoRA/full fine-tuning modes, 5 GPU types (H200, H100, A100, L40S, RTX 6000), cloud storage + data processing costs, per-epoch tracking, and multi-run scaling.',
  category: 'B',
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
  generate(inputs) { return calculate(inputs); },
  staticExamples: [
    '\u{1F916} AI Training Cost Estimate (LoRA)\n\nModel: 7B (LoRA fine-tune) | GPU: 2× H100 80GB\nTraining: 8 hrs/epoch × 3 epochs = 9 total GPU-hours\n\n\u{1F4B0} Cost Breakdown\n──────────────────────────────────────────────────\nGPU Compute:  2× H100 80GB @ $2.50/hr × 9 hrs      $45.00\nCloud Storage: 50 GB @ $0.10/GB/mo × 0.0 mo        $0.06\nData Processing: $20.00                              $20.00\n──────────────────────────────────────────────────\nTotal Estimated Cost:                       $65.06\n\n\u{1F4CA} Per-Epoch Tracking\n──────────────────────────────────────────────────\nPer Epoch GPU Cost: $15.00\nPer Epoch Total:    $15.02\n\nEpoch    | GPU Cost       | Cumulative\n───────────────────────────────────────────\n1        | $15.00         | $35.02\n2        | $30.00         | $50.04\n3        | $45.00         | $65.06\n\n\u{1F4CB} Cost Summary\n──────────────────────────────────────────────────\nGPU:     $45.00          (69%)\nStorage: $0.06           (0%)\nData:    $20.00          (31%)\n\n\u{1F4C8} Cost Range (Optimistic — Pessimistic)\n──────────────────────────────────────────────────\nOptimistic (spot instances + optimizations):  $45.54\nExpected:                                      $65.06\nPessimistic (on-demand + overhead):            $97.59\n\nWith Spot/Reserved Discount (40% off):          $39.04\n\n\u{1F504} Multi-Run Scaling\n──────────────────────────────────────────────────\nRuns     | 1            | 3            | 5            | 10           | 25           | 50\n─────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────\nTotal    | $65.06       | $195.18      | $325.30      | $650.60      | $1,626.50    | $3,253.00\n\n\u{1F4A1} 9 GPU-hours ≈ 800 CPU-core-hours equivalent.\n\u{1F4A1} LoRA fine-tuning reduces cost by ~65% vs full fine-tuning. Use checkpointing to protect against spot interruptions.',
  ],
  faq: [
    { q: 'How much does it cost to train a 7B model in 2026?', a: 'LoRA fine-tuning a 7B model: $50-500 on 2-4 H100 GPUs (4-24 hrs). Full fine-tuning: $500-5,000. Pre-training from scratch: $5,000-50,000+. With H200 GPUs, a 7B LoRA can complete in 2-4 hours at $3.50/hr/GPU — under $30 for a quick fine-tune. Budget GPU (RTX 6000 at $0.50/hr) can do a 7B LoRA for under $10.' },
    { q: 'LoRA vs Full Fine-Tuning — which should I choose?', a: 'LoRA (Low-Rank Adaptation) fine-tunes only ~1% of parameters, reducing GPU memory and cost by 60-80%. Best for: domain adaptation, style transfer, instruction following — most solopreneur use cases. Full fine-tuning updates all parameters and is needed for: teaching entirely new knowledge, major capability changes, or when LoRA underperforms. For 7B-13B models, LoRA is almost always the right first choice.' },
    { q: 'Which GPU should I use for training?', a: 'H200 141GB (latest): best for 70B+ models, $3.50/hr. H100 80GB: 2-3x faster than A100 for LLMs, $2.50/hr. A100 80GB: standard choice, $1.50/hr — good availability. L40S 48GB: good for 7B-13B LoRA, $0.80/hr. RTX 6000 Ada: budget option for 7B LoRA, $0.50/hr. For most solopreneurs: A100 for anything serious, H100 for speed, RTX 6000 for budget experiments.' },
    { q: 'How much does cloud storage add to training costs?', a: 'At $0.10/GB/month, storage is usually a minor cost. Dataset storage: 100GB of training data = ~$10/month. Model checkpoints: ~10-100GB per checkpoint. For short training runs (under 1 week), storage is negligible. For long-running experiments, factor in model checkpointing costs. Total storage for most training jobs: $5-50.' },
    { q: 'Should I train my own model or use an API?', a: 'For 99% of solopreneurs: use an API (DeepSeek V4 Flash, GPT-5 Mini, Claude Haiku). Only train if you need: specialized domain knowledge not in base models, data privacy/air-gap requirements, lower inference costs at high volume (100K+ requests/day), or a unique capability not offered by APIs. Start with prompt engineering + RAG before considering training.' },
    { q: 'How do I reduce training costs?', a: 'Six proven techniques: (1) LoRA instead of full fine-tuning saves 65%+. (2) Spot/preemptible instances save 40-60%. (3) Gradient checkpointing saves 30-50% GPU memory. (4) Mixed precision (FP16/BF16) doubles throughput. (5) FlashAttention reduces memory by 2-8x. (6) Efficient data loading prevents GPU idle time. Combined, these can reduce costs by 80-90% vs naive full fine-tuning.' },
    { q: 'What is the cost to train a 405B model?', a: 'Training a 405B model (e.g., Llama 4 scale) requires 128+ H200 GPUs running for weeks/months. Ballpark: 128 H200 GPUs × 720 hrs × $3.50/hr = ~$322K in GPU costs alone. With data processing, storage, and engineering overhead: $500K-$2M total. This is enterprise-only territory. Most solopreneurs should fine-tune existing 7B-70B open models instead.' },
  ],
  howToUse: [
    'Select your target model size (7B to 405B) — LoRA for 7B/13B, full fine-tune for larger models.',
    'Choose your GPU type — H200 for bleeding-edge speed, A100 for best availability, RTX 6000 for budget.',
    'Enter the number of GPUs — more GPUs = faster but higher hourly cost.',
    'Set training hours per epoch and total epochs — longer training captures more patterns but costs more.',
    'Add cloud storage (dataset + checkpoints in GB) and data processing costs for a complete estimate.',
    'Review per-epoch costs, optimistic/pessimistic ranges, and multi-run scaling to plan your total training budget.',
  ],
};

registerEngine(engine);
