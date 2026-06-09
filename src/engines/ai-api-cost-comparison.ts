import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

const PROVIDERS = [
  { name: 'GPT-4o', input: 2.50, output: 10.00 },
  { name: 'Claude Sonnet', input: 3.00, output: 15.00 },
  { name: 'Gemini 2.0 Flash', input: 0.10, output: 0.40 },
  { name: 'DeepSeek Chat', input: 0.14, output: 0.28 },
];

function calculate(inputs: Record<string, string>): string[] {
  const inTokens = parseInt(inputs.monthlyInputTokens) || 1000000;
  const outTokens = parseInt(inputs.monthlyOutputTokens) || 500000;
  const fmt = (n: number) => '$' + n.toFixed(2);
  const results: string[] = [];
  const costs = PROVIDERS.map(p => ({
    name: p.name,
    cost: (inTokens / 1e6) * p.input + (outTokens / 1e6) * p.output,
  }));
  costs.sort((a, b) => a.cost - b.cost);
  const cheapest = costs[0];
  const mostExp = costs[costs.length - 1];
  results.push(
    '📊 AI API Cost Comparison\n\n' +
    '• Monthly input tokens: ' + inTokens.toLocaleString() + '\n' +
    '• Monthly output tokens: ' + outTokens.toLocaleString() + '\n\n' +
    costs.map(c => '  ' + c.name + ': ' + fmt(c.cost) + '/month').join('\n') + '\n\n' +
    '🏆 Cheapest: ' + cheapest.name + ' at ' + fmt(cheapest.cost) + '/month\n' +
    '💰 Savings vs ' + mostExp.name + ': ' + fmt(mostExp.cost - cheapest.cost) + '/month (' + (mostExp.cost > 0 ? ((mostExp.cost - cheapest.cost) / mostExp.cost * 100).toFixed(0) : 0) + '% cheaper)',
  );
  const scales = [10e3, 100e3, 1e6, 10e6, 100e6];
  scales.forEach(s => {
    const inT = s * 0.6;
    const outT = s * 0.4;
    const best = Math.min(...PROVIDERS.map(p => (inT / 1e6) * p.input + (outT / 1e6) * p.output));
    results.push((s / 1000).toLocaleString() + 'K total tokens → from ' + fmt(best) + '/month (cheapest provider)');
  });
  return results;
}

const customFn =
  "var ps=[{n:'GPT-4o',i:2.5,o:10},{n:'Claude Sonnet',i:3,o:15},{n:'Gemini 2.0 Flash',i:0.1,o:0.4},{n:'DeepSeek Chat',i:0.14,o:0.28}];" +
  "var it=parseInt(inputs.monthlyInputTokens)||1e6;var ot=parseInt(inputs.monthlyOutputTokens)||5e5;" +
  "function fm(n){return '$'+n.toFixed(2)}function lc(n){return n.toLocaleString()}" +
  "var cs=ps.map(function(p){return{n:p.n,c:(it/1e6)*p.i+(ot/1e6)*p.o};});" +
  "cs.sort(function(a,b){return a.c-b.c;});" +
  "var ch=cs[0];var me=cs[cs.length-1];var sv=me.c-ch.c;var pct=me.c>0?((sv)/me.c*100).toFixed(0):0;" +
  "var r=[];" +
  "r.push('\\uD83D\\uDCCA AI API Cost Comparison\\n\\n\\u2022 Monthly input tokens: '+lc(it)+'\\n\\u2022 Monthly output tokens: '+lc(ot)+'\\n\\n'+cs.map(function(c){return '  '+c.n+': '+fm(c.c)+'/month';}).join('\\n')+'\\n\\n\\uD83C\\uDFC6 Cheapest: '+ch.n+' at '+fm(ch.c)+'/month\\n\\uD83D\\uDCB0 Savings vs '+me.n+': '+fm(sv)+'/month ('+pct+'% cheaper)');" +
  "var sc=[1e4,1e5,1e6,1e7,1e8];sc.forEach(function(s){var i2=s*0.6,o2=s*0.4;var b=Math.min.apply(null,ps.map(function(p){return(i2/1e6)*p.i+(o2/1e6)*p.o;}));r.push(lc(s/1e3)+'K total tokens \\u2192 from '+fm(b)+'/month');});" +
  "return r;";

const engine: ToolEngine = {
  slug: 'solopreneur-ai-api-cost-comparison',
  title: 'AI API Cost Comparison',
  description: 'Compare AI API costs across GPT-4o, Claude Sonnet, Gemini Flash, and DeepSeek side by side. Find the cheapest provider for your usage.',
  category: 'B',
  inputs: [
    { name: 'monthlyInputTokens', label: 'Monthly Input Tokens', placeholder: 'e.g. 1000000', type: 'number' },
    { name: 'monthlyOutputTokens', label: 'Monthly Output Tokens', placeholder: 'e.g. 500000', type: 'number' },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs) { return calculate(inputs); },
  staticExamples: [
    '📊 AI API Cost Comparison\n\n• Monthly input tokens: 1,000,000\n• Monthly output tokens: 500,000\n\n  GPT-4o: $7.50/month\n  Claude Sonnet: $10.50/month\n  Gemini 2.0 Flash: $0.30/month\n  DeepSeek Chat: $0.28/month\n\n🏆 Cheapest: DeepSeek Chat at $0.28/month\n💰 Savings vs Claude Sonnet: $10.22/month (97% cheaper)',
    '10K total tokens → from $0.00/month',
    '100K total tokens → from $0.03/month',
    '1M total tokens → from $0.28/month',
    '10M total tokens → from $2.80/month',
  ],
  faq: [
    { q: 'Which AI API is the absolute cheapest?', a: 'DeepSeek Chat (V3) is currently the cheapest at $0.14/$0.28 per 1M input/output tokens. Gemini 1.5 Flash is close at $0.075/$0.30. Both are 90-98% cheaper than GPT-4o for comparable quality on most tasks.' },
    { q: 'Should I always use the cheapest API?', a: 'Not necessarily. Consider: quality requirements (GPT-4o/Claude Opus for critical tasks), latency needs, context window size, multimodal capabilities, data privacy policies, and API reliability. Many teams use different models for different task tiers.' },
    { q: 'How do I switch between AI providers easily?', a: 'Use an AI gateway like LiteLLM, Portkey, or OpenRouter. These provide a unified API that routes to multiple providers. You can switch models with a single parameter change and even implement automatic fallback if one provider is down.' },
    { q: 'What is the cost difference at scale?', a: 'At 1M input + 0.5M output tokens/month: DeepSeek $0.28, Gemini Flash $0.30, GPT-4o $7.50, Claude Sonnet $10.50. At 100M tokens/month: DeepSeek $28, Gemini Flash $30, GPT-4o $750, Claude Sonnet $1,050. The gap widens dramatically with volume.' },
    { q: 'Do these providers offer free tiers?', a: 'Yes. OpenAI: free ChatGPT usage (not API). Google: free tier through AI Studio (1,500 req/day). Anthropic: free claude.ai usage. DeepSeek: competitive pay-as-you-go with no free API tier but extremely low pricing. All offer credits for new users.' },
  ],
  howToUse: [
    'Enter your estimated monthly input token volume.',
    'Enter your estimated monthly output token volume.',
    'See side-by-side cost comparisons for all major providers.',
    'Identify the cheapest provider for your usage level.',
    'Use scaling scenarios to see costs at different volumes.',
  ],
};

registerEngine(engine);
