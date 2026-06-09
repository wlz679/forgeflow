import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

const PROVIDERS: Record<string, { name: string; rates: Record<string, number> }> = {
  'aws': { name: 'AWS', rates: { A100: 3.50, H100: 5.00, L40S: 1.20, RTX4090: 0.80 } },
  'gcp': { name: 'GCP', rates: { A100: 2.80, H100: 4.20, L40S: 1.00, RTX4090: 0.70 } },
  'lambda': { name: 'Lambda Labs', rates: { A100: 1.10, H100: 2.49, L40S: 0.80, RTX4090: 0.55 } },
  'runpod': { name: 'RunPod', rates: { A100: 0.79, H100: 1.99, L40S: 0.69, RTX4090: 0.49 } },
};

function calculate(inputs: Record<string, string>): string[] {
  const prov = PROVIDERS[inputs.provider || 'lambda'] || PROVIDERS['lambda'];
  const gpu = inputs.gpuType || 'A100';
  const count = parseInt(inputs.gpuCount) || 1;
  const hrs = parseInt(inputs.hoursPerDay) || 8;
  const rate = prov.rates[gpu] || 1.00;
  const daily = count * hrs * rate;
  const monthly = daily * 30;
  const fmt = (n: number) => '$' + n.toFixed(2);
  const results: string[] = [];
  results.push(
    '🖥️ ' + prov.name + ' GPU Cost Breakdown\n\n' +
    '• GPU: ' + count + '× ' + gpu + ' @ ' + fmt(rate) + '/hr each\n' +
    '• Usage: ' + hrs + ' hours/day\n' +
    '• Daily cost: ' + fmt(daily) + '\n' +
    '• Monthly cost (30 days): ' + fmt(monthly) + '\n' +
    '• Annual cost: ' + fmt(monthly * 12) + '\n\n' +
    '💡 ' + prov.name + ' per-GPU-hour rate: ' + fmt(rate) + '. Spot/preemptible instances can save 50-70%.',
  );
  [2, 4, 8, 16, 24].forEach(h => {
    results.push(h + ' hrs/day → ' + fmt(count * h * rate * 30) + '/month');
  });
  return results;
}

const customFn =
  "var ps={aw:{n:'AWS',r:{A100:3.5,H100:5,L40S:1.2,RTX4090:0.8}},gc:{n:'GCP',r:{A100:2.8,H100:4.2,L40S:1,RTX4090:0.7}},la:{n:'Lambda Labs',r:{A100:1.1,H100:2.49,L40S:0.8,RTX4090:0.55}},ru:{n:'RunPod',r:{A100:0.79,H100:1.99,L40S:0.69,RTX4090:0.49}}};" +
  "var p=ps[inputs.provider||'lambda']||ps.la;var g=inputs.gpuType||'A100';var c=parseInt(inputs.gpuCount)||1;var h=parseInt(inputs.hoursPerDay)||8;" +
  "var rt=p.r[g]||1;var d=c*h*rt;var m=d*30;" +
  "function fm(n){return '$'+n.toFixed(2)}" +
  "var r=[];" +
  "r.push('\\uD83D\\uDDA5\\uFE0F '+p.n+' GPU Cost Breakdown\\n\\n\\u2022 GPU: '+c+'\\u00d7 '+g+' @ '+fm(rt)+'/hr each\\n\\u2022 Usage: '+h+' hours/day\\n\\u2022 Daily cost: '+fm(d)+'\\n\\u2022 Monthly cost (30 days): '+fm(m)+'\\n\\u2022 Annual cost: '+fm(m*12)+'\\n\\n\\uD83D\\uDCA1 '+p.n+' rate: '+fm(rt)+'/GPU-hr. Spot/preemptible instances can save 50-70%.');" +
  "[2,4,8,16,24].forEach(function(s){r.push(s+' hrs/day \\u2192 '+fm(c*s*rt*30)+'/month');});" +
  "return r;";

const engine: ToolEngine = {
  slug: 'solopreneur-gpu-cloud-cost-calculator',
  title: 'GPU Cloud Cost Calculator',
  description: 'Compare GPU rental costs across AWS, GCP, Lambda Labs, and RunPod. Estimate daily, monthly, and annual GPU expenses.',
  category: 'B',
  inputs: [
    { name: 'provider', label: 'Cloud Provider', placeholder: '', type: 'select', options: ['aws', 'gcp', 'lambda', 'runpod'] },
    { name: 'gpuType', label: 'GPU Type', placeholder: '', type: 'select', options: ['A100', 'H100', 'L40S', 'RTX4090'] },
    { name: 'gpuCount', label: 'GPU Count', placeholder: 'e.g. 1', type: 'number' },
    { name: 'hoursPerDay', label: 'Hours per Day', placeholder: 'e.g. 8', type: 'number' },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs) { return calculate(inputs); },
  staticExamples: [
    '🖥️ Lambda Labs GPU Cost Breakdown\n\n• GPU: 1× A100 @ $1.10/hr each\n• Usage: 8 hours/day\n• Daily cost: $8.80\n• Monthly cost (30 days): $264.00\n• Annual cost: $3,168.00\n\n💡 Lambda Labs rate: $1.10/GPU-hr. Spot instances can save 50-70%.',
    '2 hrs/day → $66.00/month',
    '4 hrs/day → $132.00/month',
    '8 hrs/day → $264.00/month',
    '16 hrs/day → $528.00/month',
  ],
  faq: [
    { q: 'Which cloud provider is cheapest for GPUs?', a: 'RunPod and Vast.ai typically offer the lowest prices ($0.49-0.79/hr for A100). Lambda Labs is competitive at $1.10/hr with better reliability. AWS/GCP are 3-5x more expensive but offer enterprise support, better networking, and reserved instance discounts.' },
    { q: 'Should I rent or buy GPUs?', a: 'Rent if: your usage is under 500 hrs/month, you need flexibility, or you are experimenting. Buy if: you run 24/7 for 12+ months. An A100 costs ~$10,000 — at $1/hr rental, break-even is ~10,000 hours (about 14 months of 24/7 use).' },
    { q: 'What about spot/preemptible instances?', a: 'Spot instances are 50-70% cheaper but can be terminated at any time with short notice. Great for fault-tolerant training jobs that can resume from checkpoints. Not suitable for inference or real-time applications. Use checkpointing to protect against interruptions.' },
    { q: 'Which GPU should I choose for my workload?', a: 'A100 80GB: best all-around for LLM training and inference. H100: 2-4x faster for transformer models but costs more — often net cheaper for large training jobs. L40S: good for inference and fine-tuning at lower cost. RTX 4090: cheapest option, suitable for small model fine-tuning.' },
    { q: 'How do I optimize GPU utilization to save money?', a: 'Use mixed precision training (FP16/BF16), gradient checkpointing, efficient data loading, and batch size optimization. For inference: use model quantization (INT8/INT4), batching, and continuous batching techniques. These can reduce GPU-hours by 50-80%.' },
  ],
  howToUse: [
    'Select a cloud GPU provider.',
    'Choose your GPU type and enter the count.',
    'Enter your expected daily usage in hours.',
    'Review daily, monthly, and annual cost estimates.',
    'Compare scenarios at different usage levels.',
  ],
};

registerEngine(engine);
