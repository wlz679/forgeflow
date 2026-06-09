import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

const GPU_COSTS: Record<string, number> = { 'A100-80GB': 2.50, 'H100-80GB': 4.00, 'A6000': 0.80 };
const MODEL_GPU_MULT: Record<string, number> = { '7B': 8, '13B': 16, '70B': 64, '180B': 256 };

function calculate(inputs: Record<string, string>): string[] {
  const params = inputs.modelParams || '7B';
  const gpu = inputs.gpuType || 'A100-80GB';
  const gpuCount = parseInt(inputs.gpuCount) || 8;
  const hours = parseInt(inputs.hoursPerRun) || 24;
  const mult = MODEL_GPU_MULT[params] || 8;
  const gpuCost = GPU_COSTS[gpu] || 2.50;
  const estHours = Math.ceil((mult / gpuCount) * (params === '7B' ? 1 : params === '13B' ? 2 : params === '70B' ? 4 : 12)) * hours;
  const totalCost = estHours * gpuCount * gpuCost;
  const fmt = (n: number) => '$' + n.toFixed(2);
  const results: string[] = [];
  results.push(
    '🔬 AI Training Cost Estimate\n\n' +
    '• Model: ' + params + ' parameters\n' +
    '• GPU: ' + gpuCount + '× ' + gpu + ' @ ' + fmt(gpuCost) + '/hr each\n' +
    '• Estimated GPU-hours: ' + estHours.toLocaleString() + '\n' +
    '• Estimated cost per run: ' + fmt(totalCost) + '\n' +
    '• Cost range (optimistic-pessimistic): ' + fmt(totalCost * 0.7) + ' — ' + fmt(totalCost * 1.5) + '\n\n' +
    '💡 Actual costs vary based on optimization, data preprocessing, and cloud provider discounts.',
  );
  [1, 4, 10, 25, 50].forEach(runs => {
    results.push(runs + ' training runs → ' + fmt(totalCost * runs) + ' total');
  });
  return results;
}

const customFn =
  "var gc={a100:2.5,h100:4,a6000:0.8};var mm={7:8,13:16,70:64,180:256};" +
  "var p=inputs.modelParams||'7B';var g=inputs.gpuType||'A100-80GB';var gc2=parseInt(inputs.gpuCount)||8;var h=parseInt(inputs.hoursPerRun)||24;" +
  "var m=mm[p]||8;var gh=gc[g]||2.5;var eh=Math.ceil((m/gc2)*(p=='7B'?1:p=='13B'?2:p=='70B'?4:12))*h;" +
  "var tc=eh*gc2*gh;function fm(n){return '$'+n.toFixed(2)}function lc(n){return n.toLocaleString()}" +
  "var r=[];" +
  "r.push('\\uD83D\\uDD2C AI Training Cost Estimate\\n\\n\\u2022 Model: '+p+' parameters\\n\\u2022 GPU: '+gc2+'\\u00d7 '+g+' @ '+fm(gh)+'/hr each\\n\\u2022 Estimated GPU-hours: '+lc(eh)+'\\n\\u2022 Estimated cost per run: '+fm(tc)+'\\n\\u2022 Cost range: '+fm(tc*0.7)+' \\u2014 '+fm(tc*1.5)+'\\n\\n\\uD83D\\uDCA1 Actual costs vary based on optimization and discounts.');" +
  "[1,4,10,25,50].forEach(function(s){r.push(s+' training runs \\u2192 '+fm(tc*s)+' total');});" +
  "return r;";

const engine: ToolEngine = {
  slug: 'solopreneur-ai-training-cost-estimator',
  title: 'AI Training Cost Estimator',
  description: 'Estimate the cost of training AI models from 7B to 180B parameters. Calculate GPU-hours, cost per run, and total training budget.',
  category: 'B',
  inputs: [
    { name: 'modelParams', label: 'Model Size', placeholder: '', type: 'select', options: ['7B', '13B', '70B', '180B'] },
    { name: 'gpuType', label: 'GPU Type', placeholder: '', type: 'select', options: ['A100-80GB', 'H100-80GB', 'A6000'] },
    { name: 'gpuCount', label: 'GPU Count', placeholder: 'e.g. 8', type: 'number' },
    { name: 'hoursPerRun', label: 'Hours per Run', placeholder: 'e.g. 24', type: 'number' },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs) { return calculate(inputs); },
  staticExamples: [
    '🔬 AI Training Cost Estimate\n\n• Model: 7B parameters\n• GPU: 8× A100-80GB @ $2.50/hr each\n• Estimated GPU-hours: 24\n• Estimated cost per run: $480.00\n• Cost range: $336.00 — $720.00\n\n💡 Actual costs vary based on optimization and discounts.',
    '1 training runs → $480.00 total',
    '4 training runs → $1,920.00 total',
    '10 training runs → $4,800.00 total',
    '25 training runs → $12,000.00 total',
  ],
  faq: [
    { q: 'How much does it cost to train a 7B model?', a: 'On 8× A100 GPUs: approximately $500-2,000 for a full fine-tuning run (24-72 hours). LoRA fine-tuning can reduce this to $50-200. Pre-training from scratch: $5,000-50,000 depending on data size and optimization level.' },
    { q: 'Should I train my own model or use an API?', a: 'For most solopreneurs, using an API (OpenAI, Claude, DeepSeek) is far more cost-effective than training. Only consider training if you need: specialized domain knowledge, data privacy, lower inference costs at high volume, or a unique model capability not offered by APIs.' },
    { q: 'What GPU should I use for training?', a: 'A100 (80GB) is the standard for 7B-70B models. H100 is 2-4x faster for LLM training but costs more per hour — often net cheaper due to speed. RTX 4090/A6000 work well for smaller models (under 13B) and fine-tuning.' },
    { q: 'How long does model training take?', a: 'Fine-tuning 7B: 4-24 hours on 8× A100. Full training 7B: 3-7 days. Training 70B: 2-4 weeks on 64+ GPUs. Training 180B+: months on hundreds of GPUs (typically only large companies do this).' },
    { q: 'Where can I rent GPUs for training?', a: 'Lambda Labs, RunPod, and Vast.ai offer the cheapest GPU rentals ($0.50-3/hr). AWS/GCP/Azure are more expensive but offer better reliability and support. For large training runs, reserved instances can save 30-50%.' },
  ],
  howToUse: [
    'Select your target model size in parameters.',
    'Choose your GPU type and enter the number of GPUs.',
    'Enter estimated training hours per run.',
    'Review the cost estimate and optimistic/pessimistic range.',
    'Multiply by number of expected training runs for total budget.',
  ],
};

registerEngine(engine);
