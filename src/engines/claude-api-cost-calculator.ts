import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

const MODELS: Record<string, { input: number; output: number; name: string }> = {
  'claude-opus': { input: 15.00, output: 75.00, name: 'Claude Opus' },
  'claude-sonnet': { input: 3.00, output: 15.00, name: 'Claude Sonnet' },
  'claude-haiku': { input: 0.25, output: 1.25, name: 'Claude Haiku' },
};

const GPT4O = { input: 2.50, output: 10.00 };

function calculate(inputs: Record<string, string>): string[] {
  const model = inputs.model || 'claude-sonnet';
  const inTokens = parseInt(inputs.inputTokens) || 1000;
  const outTokens = parseInt(inputs.outputTokens) || 500;
  const reqPerDay = parseInt(inputs.requestsPerDay) || 100;
  const m = MODELS[model] || MODELS['claude-sonnet'];
  const costPerReq = (inTokens / 1_000_000) * m.input + (outTokens / 1_000_000) * m.output;
  const monthlyCost = costPerReq * reqPerDay * 30;
  const gptCost = (inTokens / 1_000_000) * GPT4O.input + (outTokens / 1_000_000) * GPT4O.output;
  const gptMonthly = gptCost * reqPerDay * 30;
  const diff = monthlyCost - gptMonthly;
  const pctDiff = gptMonthly > 0 ? Math.abs(diff) / gptMonthly * 100 : 0;
  const fmt = (n: number) => '$' + n.toFixed(2);
  const results: string[] = [];
  results.push(
    '🤖 ' + m.name + ' API Cost Breakdown\n\n' +
    '• Input: ' + inTokens.toLocaleString() + ' tokens/req × ' + reqPerDay + ' reqs/day\n' +
    '• Output: ' + outTokens.toLocaleString() + ' tokens/req\n' +
    '• Rate: $' + m.input.toFixed(2) + '/$' + m.output.toFixed(2) + ' per 1M tokens\n' +
    '• Cost per request: ' + fmt(costPerReq) + '\n' +
    '• Monthly cost: ' + fmt(monthlyCost) + '\n\n' +
    '📊 vs GPT-4o: ' + (diff > 0 ? 'Claude costs ' + fmt(diff) + ' more/month (' + pctDiff.toFixed(0) + '% premium)' : 'Claude saves ' + fmt(Math.abs(diff)) + '/month (' + pctDiff.toFixed(0) + '% cheaper)'),
  );
  const scenarios = [100, 500, 2000, 5000, 20000];
  for (const s of scenarios) {
    const c = costPerReq * s * 30;
    results.push(s.toLocaleString() + ' reqs/day → ' + fmt(c) + '/month (' + m.name + ')');
  }
  return results;
}

const customFn =
  "var ms={op:{i:15,o:75,n:'Claude Opus'},sn:{i:3,o:15,n:'Claude Sonnet'},hk:{i:0.25,o:1.25,n:'Claude Haiku'}};" +
  "var gp={i:2.5,o:10};" +
  "var k=inputs.model||'claude-sonnet';var m=ms[k]||ms.sn;" +
  "var it=parseInt(inputs.inputTokens)||1000;var ot=parseInt(inputs.outputTokens)||500;var rd=parseInt(inputs.requestsPerDay)||100;" +
  "var cpr=(it/1e6)*m.i+(ot/1e6)*m.o;var mc=cpr*rd*30;" +
  "var gc=(it/1e6)*gp.i+(ot/1e6)*gp.o;var gm=gc*rd*30;var d=mc-gm;var p=gm>0?Math.abs(d)/gm*100:0;" +
  "function fm(n){return '$'+n.toFixed(2)}function lc(n){return n.toLocaleString()}" +
  "var r=[];" +
  "r.push('\\uD83E\\uDD16 '+m.n+' API Cost Breakdown\\n\\n\\u2022 Input: '+lc(it)+' tokens/req \\u00d7 '+rd+' reqs/day\\n\\u2022 Output: '+lc(ot)+' tokens/req\\n\\u2022 Rate: $'+m.i.toFixed(2)+'/$'+m.o.toFixed(2)+' per 1M tokens\\n\\u2022 Cost per request: '+fm(cpr)+'\\n\\u2022 Monthly cost: '+fm(mc)+'\\n\\n\\uD83D\\uDCCA vs GPT-4o: '+(d>0?'Claude costs '+fm(d)+' more/month ('+p.toFixed(0)+'% premium)':'Claude saves '+fm(Math.abs(d))+'/month ('+p.toFixed(0)+'% cheaper)'));" +
  "[100,500,2000,5000,20000].forEach(function(s){var c=cpr*s*30;r.push(lc(s)+' reqs/day \\u2192 '+fm(c)+'/month ('+m.n+')');});" +
  "return r;";

const engine: ToolEngine = {
  slug: 'solopreneur-claude-api-cost-calculator',
  title: 'Claude API Cost Calculator',
  description: 'Calculate Claude API costs for Opus, Sonnet, and Haiku models. Compare pricing against GPT-4o to find the best value.',
  category: 'B',
  inputs: [
    { name: 'model', label: 'Model', placeholder: '', type: 'select', options: ['claude-opus', 'claude-sonnet', 'claude-haiku'] },
    { name: 'inputTokens', label: 'Input Tokens per Request', placeholder: 'e.g. 1000', type: 'number' },
    { name: 'outputTokens', label: 'Output Tokens per Request', placeholder: 'e.g. 500', type: 'number' },
    { name: 'requestsPerDay', label: 'Requests per Day', placeholder: 'e.g. 100', type: 'number' },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs) { return calculate(inputs); },
  staticExamples: [
    '🤖 Claude Sonnet API Cost Breakdown\n\n• Input: 1,000 tokens/req × 100 reqs/day\n• Output: 500 tokens/req\n• Rate: $3.00/$15.00 per 1M tokens\n• Cost per request: $0.0105\n• Monthly cost: $31.50\n\n📊 vs GPT-4o: Claude costs $9.00 more/month (40% premium)',
    '100 reqs/day → $31.50/month (Claude Sonnet)',
    '500 reqs/day → $157.50/month (Claude Sonnet)',
    '2,000 reqs/day → $630.00/month (Claude Sonnet)',
    '5,000 reqs/day → $1,575.00/month (Claude Sonnet)',
  ],
  faq: [
    { q: 'How does Claude pricing compare to GPT-4o?', a: 'Claude Sonnet at $3/$15 per 1M tokens is slightly more expensive than GPT-4o at $2.50/$10 for similar quality. Claude Haiku at $0.25/$1.25 is competitive with GPT-4o Mini. Claude Opus at $15/$75 is the premium option for complex reasoning.' },
    { q: 'When should I use Claude over OpenAI?', a: 'Claude excels at long-context tasks (200K token window), code generation, and nuanced analysis. Many developers prefer Claude for creative writing and safety-critical applications. Use both APIs and route tasks to the best model for each use case.' },
    { q: 'Does Anthropic offer a free tier?', a: 'Yes, Claude offers a free tier through claude.ai with usage limits. The API (console.anthropic.com) is pay-as-you-go with no monthly minimum. New users often receive $5 in free credits to test the API.' },
    { q: 'How do I estimate token counts for Claude?', a: 'Claude uses a similar tokenizer to GPT models. As a rule of thumb, 1 token = 0.75 words. A typical 500-word prompt uses about 650-750 tokens. Use Anthropic\'s token counting tool for precise estimates.' },
    { q: 'Can I switch between Claude models easily?', a: 'Yes, all Claude models share the same Messages API format. You can switch between Haiku, Sonnet, and Opus by changing a single parameter. Start with Sonnet for quality, use Haiku for cost-sensitive tasks, and Opus for complex analysis.' },
  ],
  howToUse: [
    'Select your Claude model (Haiku, Sonnet, or Opus).',
    'Enter average input and output tokens per API call.',
    'Enter your expected daily request volume.',
    'Review the cost breakdown and GPT-4o comparison.',
    'Use scenario comparisons to plan for growth.',
  ],
};

registerEngine(engine);
