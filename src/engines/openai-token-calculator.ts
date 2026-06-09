import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

const MODELS: Record<string, { input: number; output: number; name: string }> = {
  'gpt-4o': { input: 2.50, output: 10.00, name: 'GPT-4o' },
  'gpt-4-turbo': { input: 10.00, output: 30.00, name: 'GPT-4 Turbo' },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50, name: 'GPT-3.5 Turbo' },
  'gpt-4o-mini': { input: 0.15, output: 0.60, name: 'GPT-4o Mini' },
};

function calculate(inputs: Record<string, string>): string[] {
  const model = inputs.model || 'gpt-4o';
  const inTokens = parseInt(inputs.inputTokens) || 1000;
  const outTokens = parseInt(inputs.outputTokens) || 500;
  const reqPerDay = parseInt(inputs.requestsPerDay) || 100;
  const m = MODELS[model] || MODELS['gpt-4o'];
  const costPerReq = (inTokens / 1_000_000) * m.input + (outTokens / 1_000_000) * m.output;
  const dailyCost = costPerReq * reqPerDay;
  const monthlyCost = dailyCost * 30;
  const annualCost = monthlyCost * 12;
  const fmt = (n: number) => '$' + n.toFixed(2);
  const results: string[] = [];
  results.push(
    '🤖 ' + m.name + ' API Cost Breakdown\n\n' +
    '• Input tokens/req: ' + inTokens.toLocaleString() + ' × ' + reqPerDay + ' reqs/day\n' +
    '• Output tokens/req: ' + outTokens.toLocaleString() + '\n' +
    '• Cost per request: ' + fmt(costPerReq) + '\n' +
    '• Daily cost: ' + fmt(dailyCost) + '\n' +
    '• Monthly cost (30 days): ' + fmt(monthlyCost) + '\n' +
    '• Annual cost: ' + fmt(annualCost) + '\n\n' +
    '💡 Token cost at $' + m.input.toFixed(2) + '/$' + m.output.toFixed(2) + ' per 1M tokens (input/output)',
  );
  const scenarios = [100, 500, 1000, 5000, 10000];
  for (const s of scenarios) {
    const c = ((inTokens / 1_000_000) * m.input + (outTokens / 1_000_000) * m.output) * s * 30;
    results.push(s.toLocaleString() + ' reqs/day → ' + fmt(c) + '/month');
  }
  return results;
}

const customFn =
  "var models={gpt4o:{i:2.5,o:10,n:'GPT-4o'},gpt4t:{i:10,o:30,n:'GPT-4 Turbo'},gpt35:{i:0.5,o:1.5,n:'GPT-3.5 Turbo'},gpt4m:{i:0.15,o:0.6,n:'GPT-4o Mini'}};" +
  "var k=inputs.model||'gpt-4o';var m=models[k]||models.gpt4o;" +
  "var it=parseInt(inputs.inputTokens)||1000;var ot=parseInt(inputs.outputTokens)||500;var rd=parseInt(inputs.requestsPerDay)||100;" +
  "var cpr=(it/1e6)*m.i+(ot/1e6)*m.o;var dc=cpr*rd;var mc=dc*30;var ac=mc*12;" +
  "function fm(n){return '$'+n.toFixed(2)}function lc(n){return n.toLocaleString()}" +
  "var r=[];" +
  "r.push('\\uD83E\\uDD16 '+m.n+' API Cost Breakdown\\n\\n\\u2022 Input tokens/req: '+lc(it)+' \\u00d7 '+rd+' reqs/day\\n\\u2022 Output tokens/req: '+lc(ot)+'\\n\\u2022 Cost per request: '+fm(cpr)+'\\n\\u2022 Daily cost: '+fm(dc)+'\\n\\u2022 Monthly cost (30 days): '+fm(mc)+'\\n\\u2022 Annual cost: '+fm(ac)+'\\n\\n\\uD83D\\uDCA1 Token cost at $'+m.i.toFixed(2)+'/$'+m.o.toFixed(2)+' per 1M tokens');" +
  "[100,500,1000,5000,10000].forEach(function(s){var c=((it/1e6)*m.i+(ot/1e6)*m.o)*s*30;r.push(lc(s)+' reqs/day \\u2192 '+fm(c)+'/month');});" +
  "return r;";

const engine: ToolEngine = {
  slug: 'solopreneur-openai-token-calculator',
  title: 'OpenAI Token Calculator',
  description: 'Estimate your OpenAI API costs based on model, token usage, and request volume. Compare GPT-4o, GPT-4 Turbo, GPT-3.5, and GPT-4o Mini pricing.',
  category: 'B',
  inputs: [
    { name: 'model', label: 'Model', placeholder: '', type: 'select', options: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o-mini'] },
    { name: 'inputTokens', label: 'Input Tokens per Request', placeholder: 'e.g. 1000', type: 'number' },
    { name: 'outputTokens', label: 'Output Tokens per Request', placeholder: 'e.g. 500', type: 'number' },
    { name: 'requestsPerDay', label: 'Requests per Day', placeholder: 'e.g. 100', type: 'number' },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs) { return calculate(inputs); },
  staticExamples: [
    '🤖 GPT-4o API Cost Breakdown\n\n• Input tokens/req: 1,000 × 100 reqs/day\n• Output tokens/req: 500\n• Cost per request: $0.0075\n• Daily cost: $0.75\n• Monthly cost (30 days): $22.50\n• Annual cost: $270.00\n\n💡 Token cost at $2.50/$10.00 per 1M tokens (input/output)',
    '100 reqs/day → $22.50/month',
    '500 reqs/day → $112.50/month',
    '1,000 reqs/day → $225.00/month',
    '5,000 reqs/day → $1,125.00/month',
  ],
  faq: [
    { q: 'What is an OpenAI token?', a: 'A token is a chunk of text that the model reads or generates. Roughly 1 token = 0.75 English words. A 1000-word article uses about 1,300 tokens. Pricing is per 1 million tokens.' },
    { q: 'Which model is cheapest?', a: 'GPT-4o Mini is the cheapest at $0.15/$0.60 per 1M input/output tokens. For high-volume production, it can be 10-50x cheaper than GPT-4o. Use it for classification, summarization, and simple Q&A where reasoning depth is less critical.' },
    { q: 'How can I reduce my API costs?', a: 'Use shorter prompts, limit output tokens with max_tokens, cache common responses, batch requests, use cheaper models for simple tasks, and implement prompt compression techniques. Switching from GPT-4o to GPT-4o Mini can cut costs 90%+ for suitable tasks.' },
    { q: 'What is the difference between input and output tokens?', a: 'Input tokens are what you send (your prompt + conversation history). Output tokens are what the model generates. Output tokens cost 3-4x more than input tokens. Long conversation histories with many turns can make input costs dominate.' },
    { q: 'Does OpenAI charge for unsuccessful requests?', a: 'No. You are only charged for tokens that are actually processed. If a request fails or times out, you are not billed. However, streaming responses that are cancelled mid-stream still bill for tokens already generated.' },
  ],
  howToUse: [
    'Select your OpenAI model from the dropdown.',
    'Enter your average input and output tokens per request.',
    'Enter your estimated daily request volume.',
    'Review the cost breakdown (per request, daily, monthly, annual).',
    'Check the comparison scenarios to see how costs scale with usage.',
  ],
};

registerEngine(engine);
