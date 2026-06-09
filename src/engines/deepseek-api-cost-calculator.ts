import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

const MODELS: Record<string, { input: number; output: number; name: string }> = {
  'deepseek-chat': { input: 0.14, output: 0.28, name: 'DeepSeek Chat (V3)' },
  'deepseek-reasoner': { input: 0.55, output: 2.19, name: 'DeepSeek Reasoner (R1)' },
};

function calculate(inputs: Record<string, string>): string[] {
  const m = MODELS[inputs.model || 'deepseek-chat'] || MODELS['deepseek-chat'];
  const it = parseInt(inputs.inputTokens) || 1000;
  const ot = parseInt(inputs.outputTokens) || 500;
  const rd = parseInt(inputs.requestsPerDay) || 100;
  const cpr = (it / 1e6) * m.input + (ot / 1e6) * m.output;
  const mc = cpr * rd * 30;
  const gptCost = (it / 1e6) * 2.5 + (ot / 1e6) * 10;
  const gptMo = gptCost * rd * 30;
  const savings = gptMo - mc;
  const pct = gptMo > 0 ? (savings / gptMo) * 100 : 0;
  const fmt = (n: number) => '$' + n.toFixed(2);
  const results: string[] = [];
  results.push(
    '🤖 ' + m.name + ' API Cost\n\n' +
    '• Input tokens/req: ' + it.toLocaleString() + ' × ' + rd + ' reqs/day\n' +
    '• Output tokens/req: ' + ot.toLocaleString() + '\n' +
    '• Rate: $' + m.input.toFixed(2) + '/$' + m.output.toFixed(2) + ' per 1M tokens\n' +
    '• Cost per request: ' + fmt(cpr) + '\n' +
    '• Monthly cost: ' + fmt(mc) + '\n\n' +
    '💰 vs GPT-4o: saves ' + fmt(savings) + '/month (' + pct.toFixed(0) + '% cheaper)',
  );
  [50, 200, 1000, 5000, 50000].forEach(s => {
    results.push(s.toLocaleString() + ' reqs/day → ' + fmt(cpr * s * 30) + '/month (saves ' + fmt((gptCost * s * 30) - (cpr * s * 30)) + ' vs GPT-4o)');
  });
  return results;
}

const customFn =
  "var ms={dc:{i:0.14,o:0.28,n:'DeepSeek Chat (V3)'},dr:{i:0.55,o:2.19,n:'DeepSeek Reasoner (R1)'}};" +
  "var m=ms[inputs.model||'deepseek-chat']||ms.dc;var it=parseInt(inputs.inputTokens)||1e3;var ot=parseInt(inputs.outputTokens)||5e2;var rd=parseInt(inputs.requestsPerDay)||1e2;" +
  "var cpr=(it/1e6)*m.i+(ot/1e6)*m.o;var mc=cpr*rd*30;var gc=(it/1e6)*2.5+(ot/1e6)*10;var gm=gc*rd*30;var sv=gm-mc;var p=gm>0?(sv/gm)*100:0;" +
  "function fm(n){return '$'+n.toFixed(2)}function lc(n){return n.toLocaleString()}" +
  "var r=[];" +
  "r.push('\\uD83E\\uDD16 '+m.n+' API Cost\\n\\n\\u2022 Input tokens/req: '+lc(it)+' \\u00d7 '+rd+' reqs/day\\n\\u2022 Output tokens/req: '+lc(ot)+'\\n\\u2022 Rate: $'+m.i.toFixed(2)+'/$'+m.o.toFixed(2)+' per 1M tokens\\n\\u2022 Cost per request: '+fm(cpr)+'\\n\\u2022 Monthly cost: '+fm(mc)+'\\n\\n\\uD83D\\uDCB0 vs GPT-4o: saves '+fm(sv)+'/month ('+p.toFixed(0)+'% cheaper)');" +
  "[50,200,1000,5000,50000].forEach(function(s){var cm=cpr*s*30;var cs=gc*s*30;r.push(lc(s)+' reqs/day \\u2192 '+fm(cm)+'/month (saves '+fm(cs-cm)+' vs GPT-4o)');});" +
  "return r;";

const engine: ToolEngine = {
  slug: 'solopreneur-deepseek-api-cost-calculator',
  title: 'DeepSeek API Cost Calculator',
  description: 'Calculate DeepSeek API costs and see how much you save compared to OpenAI. Covers DeepSeek Chat (V3) and DeepSeek Reasoner (R1).',
  category: 'B',
  inputs: [
    { name: 'model', label: 'Model', placeholder: '', type: 'select', options: ['deepseek-chat', 'deepseek-reasoner'] },
    { name: 'inputTokens', label: 'Input Tokens per Request', placeholder: 'e.g. 1000', type: 'number' },
    { name: 'outputTokens', label: 'Output Tokens per Request', placeholder: 'e.g. 500', type: 'number' },
    { name: 'requestsPerDay', label: 'Requests per Day', placeholder: 'e.g. 100', type: 'number' },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs) { return calculate(inputs); },
  staticExamples: [
    '🤖 DeepSeek Chat (V3) API Cost\n\n• Input tokens/req: 1,000 × 100 reqs/day\n• Output tokens/req: 500\n• Rate: $0.14/$0.28 per 1M tokens\n• Cost per request: $0.00028\n• Monthly cost: $0.84\n\n💰 vs GPT-4o: saves $21.66/month (96% cheaper)',
    '50 reqs/day → $0.42/month (saves $10.83 vs GPT-4o)',
    '200 reqs/day → $1.68/month (saves $43.32 vs GPT-4o)',
    '1,000 reqs/day → $8.40/month (saves $216.60 vs GPT-4o)',
    '5,000 reqs/day → $42.00/month (saves $1,083.00 vs GPT-4o)',
  ],
  faq: [
    { q: 'How much cheaper is DeepSeek than OpenAI?', a: 'DeepSeek Chat (V3) is approximately 95% cheaper than GPT-4o at $0.14/$0.28 vs $2.50/$10.00 per 1M tokens. For a typical 1000-token prompt + 500-token response at 100 requests/day: DeepSeek costs $0.84/month vs $22.50/month for GPT-4o.' },
    { q: 'Is DeepSeek quality comparable to GPT-4o?', a: 'DeepSeek V3 matches or exceeds GPT-4o on many benchmarks including coding and math. For most production use cases, DeepSeek offers excellent quality at a fraction of the cost. DeepSeek R1 provides advanced reasoning capabilities competitive with OpenAI o1.' },
    { q: 'How do I get a DeepSeek API key?', a: 'Register at platform.deepseek.com. New users receive credits. DeepSeek accepts international credit cards and offers pay-as-you-go pricing with no monthly minimum. The API is OpenAI-compatible, making migration trivial.' },
    { q: 'Can I use DeepSeek as a drop-in OpenAI replacement?', a: 'Yes. DeepSeek\'s API is fully compatible with the OpenAI SDK. You can switch by changing the base URL and API key. This makes it easy to test cost savings without rewriting your application code.' },
    { q: 'Are there any usage limits?', a: 'DeepSeek has generous rate limits for pay-as-you-go users. During peak hours, free-tier users may experience longer queue times. Paid users get priority access. Check the latest limits on the DeepSeek platform dashboard.' },
  ],
  howToUse: [
    'Select DeepSeek Chat (V3) or Reasoner (R1).',
    'Enter your average input and output tokens per request.',
    'Enter your expected daily request volume.',
    'Review the cost breakdown and GPT-4o savings comparison.',
    'Use scenarios to see costs at different usage levels.',
  ],
};

registerEngine(engine);
