import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

const MODELS: Record<string, { input: number; output: number; name: string }> = {
  'gemini-2.0-flash': { input: 0.10, output: 0.40, name: 'Gemini 2.0 Flash' },
  'gemini-1.5-pro': { input: 3.50, output: 10.50, name: 'Gemini 1.5 Pro' },
  'gemini-1.5-flash': { input: 0.075, output: 0.30, name: 'Gemini 1.5 Flash' },
};

function calculate(inputs: Record<string, string>): string[] {
  const m = MODELS[inputs.model || 'gemini-2.0-flash'] || MODELS['gemini-2.0-flash'];
  const it = parseInt(inputs.inputTokens) || 1000;
  const ot = parseInt(inputs.outputTokens) || 500;
  const rd = parseInt(inputs.requestsPerDay) || 100;
  const cpr = (it / 1e6) * m.input + (ot / 1e6) * m.output;
  const mc = cpr * rd * 30;
  const fmt = (n: number) => '$' + n.toFixed(2);
  const lc = (n: number) => n.toLocaleString();
  const results: string[] = [];
  results.push(
    '🤖 ' + m.name + ' API Cost\n\n' +
    '• Input: ' + lc(it) + ' tokens/req × ' + rd + ' reqs/day\n' +
    '• Output: ' + lc(ot) + ' tokens/req\n' +
    '• Rate: $' + m.input.toFixed(2) + '/$' + m.output.toFixed(2) + ' per 1M tokens\n' +
    '• Cost per request: ' + fmt(cpr) + '\n' +
    '• Monthly cost: ' + fmt(mc) + '\n' +
    '• Annual cost: ' + fmt(mc * 12),
  );
  [50, 200, 500, 2000, 10000].forEach(s => {
    results.push(lc(s) + ' reqs/day → ' + fmt(cpr * s * 30) + '/month');
  });
  return results;
}

const customFn =
  "var ms={gf:{i:0.1,o:0.4,n:'Gemini 2.0 Flash'},gp:{i:3.5,o:10.5,n:'Gemini 1.5 Pro'},gpf:{i:0.075,o:0.3,n:'Gemini 1.5 Flash'}};" +
  "var m=ms[inputs.model||'gemini-2.0-flash']||ms.gf;var it=parseInt(inputs.inputTokens)||1e3;var ot=parseInt(inputs.outputTokens)||5e2;var rd=parseInt(inputs.requestsPerDay)||1e2;" +
  "var cpr=(it/1e6)*m.i+(ot/1e6)*m.o;var mc=cpr*rd*30;" +
  "function fm(n){return '$'+n.toFixed(2)}function lc(n){return n.toLocaleString()}" +
  "var r=[];" +
  "r.push('\\uD83E\\uDD16 '+m.n+' API Cost\\n\\n\\u2022 Input: '+lc(it)+' tokens/req \\u00d7 '+rd+' reqs/day\\n\\u2022 Output: '+lc(ot)+' tokens/req\\n\\u2022 Rate: $'+m.i.toFixed(2)+'/$'+m.o.toFixed(2)+' per 1M tokens\\n\\u2022 Cost per request: '+fm(cpr)+'\\n\\u2022 Monthly cost: '+fm(mc)+'\\n\\u2022 Annual cost: '+fm(mc*12));" +
  "[50,200,500,2000,10000].forEach(function(s){r.push(lc(s)+' reqs/day \\u2192 '+fm(cpr*s*30)+'/month');});" +
  "return r;";

const engine: ToolEngine = {
  slug: 'solopreneur-gemini-api-cost-calculator',
  title: 'Gemini API Cost Calculator',
  description: 'Calculate Google Gemini API costs for 2.0 Flash, 1.5 Pro, and 1.5 Flash models. Compare pricing across the Gemini family.',
  category: 'B',
  inputs: [
    { name: 'model', label: 'Model', placeholder: '', type: 'select', options: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'] },
    { name: 'inputTokens', label: 'Input Tokens per Request', placeholder: 'e.g. 1000', type: 'number' },
    { name: 'outputTokens', label: 'Output Tokens per Request', placeholder: 'e.g. 500', type: 'number' },
    { name: 'requestsPerDay', label: 'Requests per Day', placeholder: 'e.g. 100', type: 'number' },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs) { return calculate(inputs); },
  staticExamples: [
    '🤖 Gemini 2.0 Flash API Cost\n\n• Input: 1,000 tokens/req × 100 reqs/day\n• Output: 500 tokens/req\n• Rate: $0.10/$0.40 per 1M tokens\n• Cost per request: $0.0003\n• Monthly cost: $0.90\n• Annual cost: $10.80',
    '50 reqs/day → $0.45/month',
    '200 reqs/day → $1.80/month',
    '500 reqs/day → $4.50/month',
    '2,000 reqs/day → $18.00/month',
  ],
  faq: [
    { q: 'Is Gemini cheaper than GPT-4o?', a: 'Gemini 2.0 Flash at $0.10/$0.40 is significantly cheaper than GPT-4o at $2.50/$10.00 — about 96% cheaper for similar quality on many tasks. Gemini 1.5 Pro at $3.50/$10.50 is comparably priced to GPT-4o but offers a 1M+ token context window.' },
    { q: 'What is the Gemini free tier?', a: 'Google offers a free tier through Google AI Studio with rate limits (typically 1,500 requests/day for Flash). The API (paid) has higher limits and is suitable for production. Gemini 1.5 Flash is free for up to 1,500 requests/day via AI Studio.' },
    { q: 'How does Gemini compare to OpenAI in quality?', a: 'Gemini 2.0 Flash is competitive with GPT-4o Mini in quality at a lower price. Gemini 1.5 Pro competes with GPT-4o, especially for long-context tasks. For multimodal tasks (image + text), Gemini often outperforms comparable OpenAI models.' },
    { q: 'Can I use Gemini with existing OpenAI code?', a: 'Yes, Google provides an OpenAI-compatible endpoint. You can switch by changing the base URL and API key while keeping your existing OpenAI SDK code. There may be minor differences in parameter names for advanced features.' },
    { q: 'Does Gemini have usage limits?', a: 'Free tier: 1,500 RPM for Flash. Paid tier: higher limits based on quota. You can request quota increases through Google Cloud Console. Enterprise customers can get dedicated capacity.' },
  ],
  howToUse: [
    'Select a Gemini model from the dropdown.',
    'Enter your average input and output token counts.',
    'Specify your expected daily request volume.',
    'Review per-request, monthly, and annual cost estimates.',
    'Compare scenarios to plan for different usage levels.',
  ],
};

registerEngine(engine);
