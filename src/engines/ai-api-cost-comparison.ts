import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';
import PRICING from '../data/ai-pricing.json';

// --- Provider & Model definitions ---
interface ModelInfo {
  key: string;
  name: string;
  input: number;
  output: number;
  contextWindow: string;
  provider: string;
}

// Build PROVIDERS from PRICING.llm (auto-syncs with src/data/ai-pricing.json)
const _buildProviders = (): Record<string, { name: string; models: { key: string; name: string; input: number; output: number; contextWindow: string }[] }> => {
  const out: Record<string, { name: string; models: { key: string; name: string; input: number; output: number; contextWindow: string }[] }> = {};
  for (const [k, v] of Object.entries(PRICING.llm)) {
    out[k] = {
      name: v.name,
      models: Object.entries(v.models)
        .map(([mk, mv]) => ({ key: mk, name: mv.name, input: mv.input, output: mv.output, contextWindow: mv.contextWindow }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }
  return out;
};
const PROVIDERS = _buildProviders();

// Provider initials + colors
const PROVIDER_INITIAL: Record<string, string> = {
  openai: 'O', anthropic: 'A', google: 'G', deepseek: 'D',
};
const PROVIDER_COLOR: Record<string, string> = {
  openai: '#10b981', anthropic: '#7c3aed', google: '#3b82f6', deepseek: '#f59e0b',
};

// Build flat model list with provider reference
const ALL_MODELS: ModelInfo[] = [];
for (const [provKey, prov] of Object.entries(PROVIDERS)) {
  for (const m of prov.models) {
    ALL_MODELS.push({ ...m, provider: provKey });
  }
}

// Presets
const PRESETS: Record<string, Record<string, string>> = {
  'Support Bot': {
    inputTokens: '800', outputTokens: '200', requestsPerDay: '500', pricingMode: 'realtime',
  },
  'RAG Q&A': {
    inputTokens: '3000', outputTokens: '400', requestsPerDay: '200', pricingMode: 'realtime',
  },
  'Code Review': {
    inputTokens: '5000', outputTokens: '800', requestsPerDay: '50', pricingMode: 'realtime',
  },
  'Content Gen': {
    inputTokens: '500', outputTokens: '2000', requestsPerDay: '100', pricingMode: 'realtime',
  },
  'Data Analysis': {
    inputTokens: '4000', outputTokens: '3000', requestsPerDay: '30', pricingMode: 'realtime',
  },
  'Batch Processing': {
    inputTokens: '3000', outputTokens: '5000', requestsPerDay: '10000', pricingMode: 'batch',
  },
};

// Helpers
function fmt(n: number): string {
  if (Math.abs(n) < 0.01 && n !== 0) return '$' + n.toFixed(4);
  return '$' + n.toFixed(2);
}
function lc(n: number): string { return n.toLocaleString(); }
function pad(s: string, len: number): string {
  return s + ' '.repeat(Math.max(0, len - s.length));
}

const SEP = '─'; // ─

function calculate(inputs: Record<string, string>): string[] {
  // --- Parse inputs ---
  const inTokens = Math.max(1, Math.min(10_000_000, parseInt(inputs.inputTokens) || 1000));
  const outTokens = Math.max(1, Math.min(10_000_000, parseInt(inputs.outputTokens) || 500));
  const reqsPerDay = Math.max(0, Math.min(1_000_000, parseInt(inputs.requestsPerDay) || 100));
  const pricingMode = inputs.pricingMode === 'batch' ? 'batch' : 'realtime';
  const batchMult = pricingMode === 'batch' ? 0.5 : 1.0;
  const reqsPerMonth = reqsPerDay * 30;

  // --- Compute cost for every model ---
  interface CostEntry {
    model: ModelInfo;
    costPerReq: number;
    monthlyCost: number;
  }

  const allCosts: CostEntry[] = [];
  for (const m of ALL_MODELS) {
    const costPerReq = (inTokens / 1_000_000) * m.input * batchMult + (outTokens / 1_000_000) * m.output * batchMult;
    allCosts.push({
      model: m,
      costPerReq,
      monthlyCost: costPerReq * reqsPerMonth,
    });
  }

  // Sort by monthly cost ascending
  allCosts.sort((a, b) => a.monthlyCost - b.monthlyCost);
  const cheapest = allCosts[0];
  const mostExpensive = allCosts[allCosts.length - 1];
  const maxCost = mostExpensive.monthlyCost;

  const out: string[] = [];
  out.push('📅 Pricing last updated: ' + (PRICING.lastUpdated || 'unknown') + ' (data synced weekly)');
  out.push('');

  // ================================================================
  // Section 1: Header
  // ================================================================
  const modeEmoji = pricingMode === 'batch' ? '⚡' : '🔴';
  const modeLabel = pricingMode === 'batch' ? 'Batch Pricing (50% off)' : 'Real-time Pricing';
  out.push(modeEmoji + ' ' + modeLabel);
  out.push('');
  out.push(
    'Input: ' + lc(inTokens) + ' tokens/req | ' +
    'Output: ' + lc(outTokens) + ' tokens/req | ' +
    'Volume: ' + lc(reqsPerDay) + ' reqs/day (' + lc(reqsPerMonth) + ' reqs/month)',
  );
  out.push('Comparing ' + ALL_MODELS.length + ' models across ' + Object.keys(PROVIDERS).length + ' providers');
  out.push('');

  // ================================================================
  // Section 2: Cheapest Finder
  // ================================================================
  const cheapestProvName = PROVIDERS[cheapest.model.provider].name;
  const cheapestInitial = PROVIDER_INITIAL[cheapest.model.provider];
  out.push('🏆 Cheapest Model Overall');
  out.push(SEP.repeat(50));
  out.push(
    '  [' + cheapestInitial + '] ' + cheapest.model.name +
    ' (' + cheapestProvName + ')' +
    ' — ' + fmt(cheapest.monthlyCost) + '/month',
  );
  out.push(
    '  Rate: ' + fmt(cheapest.model.input) + '/' + fmt(cheapest.model.output) +
    ' per 1M tokens | Context: ' + cheapest.model.contextWindow,
  );
  out.push(
    '  Per request: ' + fmt(cheapest.costPerReq) +
    ' | Daily: ' + fmt(cheapest.costPerReq * reqsPerDay) +
    ' | Monthly: ' + fmt(cheapest.monthlyCost),
  );
  // Savings vs most expensive
  const savedVsMax = mostExpensive.monthlyCost - cheapest.monthlyCost;
  const pctSaved = mostExpensive.monthlyCost > 0
    ? Math.round((savedVsMax / mostExpensive.monthlyCost) * 100) : 0;
  out.push(
    '  Savings vs ' + mostExpensive.model.name + ': ' +
    fmt(savedVsMax) + '/month (' + pctSaved + '% cheaper)',
  );
  out.push('');

  // ================================================================
  // Section 3: Bar Chart — All models, sorted by cost
  // ================================================================
  out.push('📊 Full Model Comparison (' + lc(reqsPerDay) + ' reqs/day)');
  out.push(SEP.repeat(54));
  const BAR_WIDTH = 36;
  for (const c of allCosts) {
    const initial = PROVIDER_INITIAL[c.model.provider];
    const label = '[' + initial + '] ' + c.model.name;
    const barLen = maxCost > 0 ? Math.max(1, Math.round((c.monthlyCost / maxCost) * BAR_WIDTH)) : 1;
    const barChar = c.model.key === cheapest.model.key ? '░' : '█';
    const bar = barChar.repeat(barLen);
    const isCheapest = c.model.key === cheapest.model.key;
    const badge = isCheapest ? ' 🏆' : '';
    out.push(pad(label, 24) + ' ' + pad(bar, BAR_WIDTH) + ' ' + fmt(c.monthlyCost) + badge);
  }
  out.push('');

  // ================================================================
  // Section 4: Provider Summary
  // ================================================================
  out.push('🔍 Provider Summary');
  out.push(SEP.repeat(50));
  for (const [provKey, prov] of Object.entries(PROVIDERS)) {
    const provCosts = allCosts.filter((c) => c.model.provider === provKey);
    const provCheapest = provCosts[0]; // already sorted by cost
    const provMostExpensive = provCosts[provCosts.length - 1];
    const initial = PROVIDER_INITIAL[provKey];
    out.push(
      '  [' + initial + '] ' + prov.name + ': ' +
      provCheapest.model.name + ' (cheapest) at ' + fmt(provCheapest.monthlyCost) + '/month' +
      ' | Range: ' + fmt(provCheapest.monthlyCost) + ' – ' + fmt(provMostExpensive.monthlyCost) + '/month',
    );
  }
  out.push('');

  // ================================================================
  // Section 5: Usage Scenarios — Top 5 cheapest at 6 volume tiers
  // ================================================================
  out.push('📅 Usage Scenarios — Top 5 Cheapest Models at Different Volumes');
  out.push('');

  const top5 = allCosts.slice(0, 5); // top 5 cheapest at current volume
  const tiers = [50, 100, 500, 1000, 5000, 10000];

  // Build a table: rows = models, columns = tiers
  // Header row: "Model" | "50" | "100" | ...
  let headerRow = 'Model'.padEnd(22);
  for (const t of tiers) {
    headerRow += ' | ' + lc(t) + ' reqs/day'.padEnd(14);
  }
  out.push(headerRow);

  // Separator
  let sepRow = ''.padEnd(22, SEP);
  for (const _ of tiers) sepRow += '-+-'.padEnd(15, SEP);
  out.push(sepRow);

  for (const entry of top5) {
    const initial = PROVIDER_INITIAL[entry.model.provider];
    const label = '[' + initial + '] ' + entry.model.name;
    let row = pad(label, 22);
    for (const t of tiers) {
      const costAtTier = entry.costPerReq * t * 30;
      row += ' | ' + fmt(costAtTier).padEnd(14);
    }
    out.push(row);
  }

  // Legend
  out.push('');
  out.push(
    'Legend: [O]=OpenAI  [A]=Anthropic  [G]=Google  [D]=DeepSeek',
  );

  return out;
}

// --- customFn: exact sync of calculate(), minified JS ---
const customFn =
  // PROVIDERS data
  "var P={" +
  "openai:{n:'OpenAI',m:[{k:'gpt-5.5',n:'GPT 5.5',i:5,o:30,cw:'1M'},{k:'gpt-5.2',n:'GPT 5.2',i:1.75,o:14,cw:'272K'},{k:'gpt-5',n:'GPT 5',i:1.25,o:10,cw:'272K'},{k:'gpt-5-mini',n:'GPT 5Mini',i:0.25,o:2,cw:'272K'},{k:'gpt-5-nano',n:'GPT 5Nano',i:0.05,o:0.4,cw:'272K'},{k:'gpt-4.1',n:'GPT 4.1',i:2,o:8,cw:'1M'},{k:'gpt-4.1-mini',n:'GPT 4.1Mini',i:0.4,o:1.6,cw:'1M'},{k:'gpt-4.1-nano',n:'GPT 4.1Nano',i:0.1,o:0.4,cw:'1M'},{k:'o3',n:'O3',i:2,o:8,cw:'200K'},{k:'o4-mini',n:'O4Mini',i:1.1,o:4.4,cw:'200K'},{k:'gpt-4o',n:'GPT 4o',i:2.5,o:10,cw:'128K'},{k:'gpt-4o-mini',n:'GPT 4o Mini',i:0.15,o:0.6,cw:'128K'},{k:'gpt-4-turbo',n:'GPT 4Turbo',i:10,o:30,cw:'128K'},{k:'gpt-3.5-turbo',n:'GPT 3.5Turbo',i:0.5,o:1.5,cw:'16K'},{k:'gpt-4o-transcribe-diarize',n:'GPT 4o Transcribe Diarize',i:2.5,o:10,cw:'16K'},{k:'gpt-3.5-turbo-0125',n:'GPT 3.5Turbo 0125',i:0.5,o:1.5,cw:'16K'},{k:'gpt-3.5-turbo-1106',n:'GPT 3.5Turbo 1106',i:1,o:2,cw:'16K'},{k:'gpt-3.5-turbo-16k',n:'GPT 3.5Turbo 16k',i:3,o:4,cw:'16K'},{k:'gpt-3.5-turbo-instruct',n:'GPT 3.5Turbo Instruct',i:1.5,o:2,cw:'8K'},{k:'gpt-3.5-turbo-instruct-0914',n:'GPT 3.5Turbo Instruct 0914',i:1.5,o:2,cw:'8K'},{k:'gpt-4',n:'GPT 4',i:30,o:60,cw:'8K'},{k:'gpt-4-0125-preview',n:'GPT 40125Preview',i:10,o:30,cw:'128K'},{k:'gpt-4-0314',n:'GPT 40314',i:30,o:60,cw:'8K'},{k:'gpt-4-0613',n:'GPT 40613',i:30,o:60,cw:'8K'},{k:'gpt-4-1106-preview',n:'GPT 41106Preview',i:10,o:30,cw:'128K'},{k:'gpt-4-turbo-2024-04-09',n:'GPT 4Turbo 20240409',i:10,o:30,cw:'128K'},{k:'gpt-4-turbo-preview',n:'GPT 4Turbo Preview',i:10,o:30,cw:'128K'},{k:'gpt-4.1-2025-04-14',n:'GPT 4.120250414',i:2,o:8,cw:'1M'},{k:'gpt-4.1-mini-2025-04-14',n:'GPT 4.1Mini 20250414',i:0.4,o:1.6,cw:'1M'},{k:'gpt-4.1-nano-2025-04-14',n:'GPT 4.1Nano 20250414',i:0.1,o:0.4,cw:'1M'},{k:'gpt-4o-2024-05-13',n:'GPT 4o 20240513',i:5,o:15,cw:'128K'},{k:'gpt-4o-2024-08-06',n:'GPT 4o 20240806',i:2.5,o:10,cw:'128K'},{k:'gpt-4o-2024-11-20',n:'GPT 4o 20241120',i:2.5,o:10,cw:'128K'},{k:'gpt-4o-audio-preview',n:'GPT 4o Audio Preview',i:2.5,o:10,cw:'128K'},{k:'gpt-4o-audio-preview-2024-12-17',n:'GPT 4o Audio Preview 20241217',i:2.5,o:10,cw:'128K'},{k:'gpt-4o-audio-preview-2025-06-03',n:'GPT 4o Audio Preview 20250603',i:2.5,o:10,cw:'128K'},{k:'gpt-audio',n:'GPT Audio',i:2.5,o:10,cw:'128K'},{k:'gpt-audio-1.5',n:'GPT Audio 1.5',i:2.5,o:10,cw:'128K'},{k:'gpt-audio-2025-08-28',n:'GPT Audio 20250828',i:2.5,o:10,cw:'128K'},{k:'gpt-audio-mini',n:'GPT Audio Mini',i:0.6,o:2.4,cw:'128K'},{k:'gpt-audio-mini-2025-10-06',n:'GPT Audio Mini 20251006',i:0.6,o:2.4,cw:'128K'},{k:'gpt-audio-mini-2025-12-15',n:'GPT Audio Mini 20251215',i:0.6,o:2.4,cw:'128K'},{k:'gpt-4o-mini-2024-07-18',n:'GPT 4o Mini 20240718',i:0.15,o:0.6,cw:'128K'},{k:'gpt-4o-mini-audio-preview',n:'GPT 4o Mini Audio Preview',i:0.15,o:0.6,cw:'128K'},{k:'gpt-4o-mini-audio-preview-2024-12-17',n:'GPT 4o Mini Audio Preview 20241217',i:0.15,o:0.6,cw:'128K'},{k:'gpt-4o-mini-realtime-preview',n:'GPT 4o Mini Realtime Preview',i:0.6,o:2.4,cw:'128K'},{k:'gpt-4o-mini-realtime-preview-2024-12-17',n:'GPT 4o Mini Realtime Preview 20241217',i:0.6,o:2.4,cw:'128K'},{k:'gpt-4o-mini-search-preview',n:'GPT 4o Mini Search Preview',i:0.15,o:0.6,cw:'128K'},{k:'gpt-4o-mini-search-preview-2025-03-11',n:'GPT 4o Mini Search Preview 20250311',i:0.15,o:0.6,cw:'128K'},{k:'gpt-4o-mini-transcribe',n:'GPT 4o Mini Transcribe',i:1.25,o:5,cw:'16K'},{k:'gpt-4o-mini-tts',n:'GPT 4o Mini Tts',i:2.5,o:10,cw:'128K'},{k:'gpt-4o-realtime-preview',n:'GPT 4o Realtime Preview',i:5,o:20,cw:'128K'},{k:'gpt-4o-realtime-preview-2024-12-17',n:'GPT 4o Realtime Preview 20241217',i:5,o:20,cw:'128K'},{k:'gpt-4o-realtime-preview-2025-06-03',n:'GPT 4o Realtime Preview 20250603',i:5,o:20,cw:'128K'},{k:'gpt-4o-search-preview',n:'GPT 4o Search Preview',i:2.5,o:10,cw:'128K'},{k:'gpt-4o-search-preview-2025-03-11',n:'GPT 4o Search Preview 20250311',i:2.5,o:10,cw:'128K'},{k:'gpt-4o-transcribe',n:'GPT 4o Transcribe',i:2.5,o:10,cw:'16K'},{k:'gpt-image-1.5',n:'GPT Image 1.5',i:5,o:10,cw:'128K'},{k:'gpt-image-1.5-2025-12-16',n:'GPT Image 1.520251216',i:5,o:10,cw:'128K'},{k:'gpt-image-2',n:'GPT Image 2',i:5,o:10,cw:'128K'},{k:'gpt-image-2-2026-04-21',n:'GPT Image 220260421',i:5,o:10,cw:'128K'},{k:'gpt-5.1',n:'GPT 5.1',i:1.25,o:10,cw:'272K'},{k:'gpt-5.1-2025-11-13',n:'GPT 5.120251113',i:1.25,o:10,cw:'272K'},{k:'gpt-5.1-chat-latest',n:'GPT 5.1Chat Latest',i:1.25,o:10,cw:'128K'},{k:'gpt-5.2-2025-12-11',n:'GPT 5.220251211',i:1.75,o:14,cw:'272K'},{k:'gpt-5.2-chat-latest',n:'GPT 5.2Chat Latest',i:1.75,o:14,cw:'128K'},{k:'gpt-5.3-chat-latest',n:'GPT 5.3Chat Latest',i:1.75,o:14,cw:'128K'},{k:'gpt-5.2-pro',n:'GPT 5.2Pro',i:21,o:168,cw:'272K'},{k:'gpt-5.2-pro-2025-12-11',n:'GPT 5.2Pro 20251211',i:21,o:168,cw:'272K'},{k:'gpt-5.5-2026-04-23',n:'GPT 5.520260423',i:5,o:30,cw:'1M'},{k:'gpt-5.5-pro',n:'GPT 5.5Pro',i:30,o:180,cw:'1M'},{k:'gpt-5.5-pro-2026-04-23',n:'GPT 5.5Pro 20260423',i:30,o:180,cw:'1M'},{k:'gpt-5.4',n:'GPT 5.4',i:2.5,o:15,cw:'1M'},{k:'gpt-5.4-2026-03-05',n:'GPT 5.420260305',i:2.5,o:15,cw:'1M'},{k:'gpt-5.4-pro',n:'GPT 5.4Pro',i:30,o:180,cw:'1M'},{k:'gpt-5.4-pro-2026-03-05',n:'GPT 5.4Pro 20260305',i:30,o:180,cw:'1M'},{k:'gpt-5.4-mini',n:'GPT 5.4Mini',i:0.75,o:4.5,cw:'272K'},{k:'gpt-5.4-mini-2026-03-17',n:'GPT 5.4Mini 20260317',i:0.75,o:4.5,cw:'272K'},{k:'gpt-5.4-nano',n:'GPT 5.4Nano',i:0.2,o:1.25,cw:'272K'},{k:'gpt-5.4-nano-2026-03-17',n:'GPT 5.4Nano 20260317',i:0.2,o:1.25,cw:'272K'},{k:'gpt-5-pro',n:'GPT 5Pro',i:15,o:120,cw:'128K'},{k:'gpt-5-pro-2025-10-06',n:'GPT 5Pro 20251006',i:15,o:120,cw:'128K'},{k:'gpt-5-2025-08-07',n:'GPT 520250807',i:1.25,o:10,cw:'272K'},{k:'gpt-5-chat',n:'GPT 5Chat',i:1.25,o:10,cw:'128K'},{k:'gpt-5-chat-latest',n:'GPT 5Chat Latest',i:1.25,o:10,cw:'128K'},{k:'gpt-5-codex',n:'GPT 5Codex',i:1.25,o:10,cw:'272K'},{k:'gpt-5.1-codex',n:'GPT 5.1Codex',i:1.25,o:10,cw:'272K'},{k:'gpt-5.1-codex-max',n:'GPT 5.1Codex Max',i:1.25,o:10,cw:'272K'},{k:'gpt-5.1-codex-mini',n:'GPT 5.1Codex Mini',i:0.25,o:2,cw:'272K'},{k:'gpt-5.2-codex',n:'GPT 5.2Codex',i:1.75,o:14,cw:'272K'},{k:'gpt-5.3-codex',n:'GPT 5.3Codex',i:1.75,o:14,cw:'272K'},{k:'gpt-5-mini-2025-08-07',n:'GPT 5Mini 20250807',i:0.25,o:2,cw:'272K'},{k:'gpt-5-nano-2025-08-07',n:'GPT 5Nano 20250807',i:0.05,o:0.4,cw:'272K'},{k:'gpt-realtime',n:'GPT Realtime',i:4,o:16,cw:'32K'},{k:'gpt-realtime-1.5',n:'GPT Realtime 1.5',i:4,o:16,cw:'32K'},{k:'gpt-realtime-2',n:'GPT Realtime 2',i:4,o:16,cw:'32K'},{k:'gpt-realtime-mini',n:'GPT Realtime Mini',i:0.6,o:2.4,cw:'128K'},{k:'gpt-realtime-2025-08-28',n:'GPT Realtime 20250828',i:4,o:16,cw:'32K'},{k:'o1',n:'O1',i:15,o:60,cw:'200K'},{k:'o1-2024-12-17',n:'O120241217',i:15,o:60,cw:'200K'},{k:'o1-pro',n:'O1Pro',i:150,o:600,cw:'200K'},{k:'o1-pro-2025-03-19',n:'O1Pro 20250319',i:150,o:600,cw:'200K'},{k:'o3-2025-04-16',n:'O320250416',i:2,o:8,cw:'200K'},{k:'o3-deep-research',n:'O3Deep Research',i:10,o:40,cw:'200K'},{k:'o3-deep-research-2025-06-26',n:'O3Deep Research 20250626',i:10,o:40,cw:'200K'},{k:'o3-mini',n:'O3Mini',i:1.1,o:4.4,cw:'200K'},{k:'o3-mini-2025-01-31',n:'O3Mini 20250131',i:1.1,o:4.4,cw:'200K'},{k:'o3-pro',n:'O3Pro',i:20,o:80,cw:'200K'},{k:'o3-pro-2025-06-10',n:'O3Pro 20250610',i:20,o:80,cw:'200K'},{k:'o4-mini-2025-04-16',n:'O4Mini 20250416',i:1.1,o:4.4,cw:'200K'},{k:'o4-mini-deep-research',n:'O4Mini Deep Research',i:2,o:8,cw:'200K'},{k:'o4-mini-deep-research-2025-06-26',n:'O4Mini Deep Research 20250626',i:2,o:8,cw:'200K'},{k:'gpt-4o-mini-tts-2025-03-20',n:'GPT 4o Mini Tts 20250320',i:2.5,o:10,cw:'128K'},{k:'gpt-4o-mini-tts-2025-12-15',n:'GPT 4o Mini Tts 20251215',i:2.5,o:10,cw:'128K'},{k:'gpt-4o-mini-transcribe-2025-03-20',n:'GPT 4o Mini Transcribe 20250320',i:1.25,o:5,cw:'16K'},{k:'gpt-4o-mini-transcribe-2025-12-15',n:'GPT 4o Mini Transcribe 20251215',i:1.25,o:5,cw:'16K'},{k:'gpt-5-search-api',n:'GPT 5Search Api',i:1.25,o:10,cw:'272K'},{k:'gpt-5-search-api-2025-10-14',n:'GPT 5Search Api 20251014',i:1.25,o:10,cw:'272K'},{k:'gpt-realtime-mini-2025-10-06',n:'GPT Realtime Mini 20251006',i:0.6,o:2.4,cw:'128K'},{k:'gpt-realtime-mini-2025-12-15',n:'GPT Realtime Mini 20251215',i:0.6,o:2.4,cw:'128K'}]}," +
  "anthropic:{n:'Anthropic',m:[{k:'claude-fable-5',n:'Claude Fable 5',i:10,o:50,cw:'1M'},{k:'claude-opus-4-8',n:'Claude Opus 48',i:5,o:25,cw:'1M'},{k:'claude-sonnet-4-6',n:'Claude Sonnet 46',i:3,o:15,cw:'1M'},{k:'claude-haiku-4-5',n:'Claude Haiku 45',i:1,o:5,cw:'200K'},{k:'claude-opus-4-1',n:'Claude Opus 41',i:15,o:75,cw:'200K'},{k:'claude-haiku-3-5',n:'Claude Haiku 3.5',i:0.8,o:4,cw:'200K'},{k:'claude-haiku-3',n:'Claude Haiku 3',i:0.25,o:1.25,cw:'200K'},{k:'claude-3-7-sonnet',n:'Claude 37 Sonnet',i:3,o:15,cw:'200K'},{k:'claude-3-haiku',n:'Claude 3Haiku',i:0.25,o:1.25,cw:'200K'},{k:'claude-3-opus',n:'Claude 3Opus',i:15,o:75,cw:'200K'},{k:'claude-4-opus',n:'Claude 4Opus',i:15,o:75,cw:'200K'},{k:'claude-4-sonnet',n:'Claude 4Sonnet',i:3,o:15,cw:'1M'},{k:'claude-sonnet-4-5',n:'Claude Sonnet 45',i:3,o:15,cw:'200K'},{k:'claude-sonnet-4-5-20250929-v1:0',n:'Claude Sonnet 45 20250929V1:0',i:3,o:15,cw:'200K'},{k:'claude-opus-4',n:'Claude Opus 4',i:15,o:75,cw:'200K'},{k:'claude-opus-4-5',n:'Claude Opus 45',i:5,o:25,cw:'200K'},{k:'claude-opus-4-6',n:'Claude Opus 46',i:5,o:25,cw:'1M'},{k:'claude-opus-4-7',n:'Claude Opus 47',i:5,o:25,cw:'1M'},{k:'claude-sonnet-4',n:'Claude Sonnet 4',i:3,o:15,cw:'1M'}]}," +
  "google:{n:'Google',m:[{k:'gemini-3.5-flash',n:'Gemini 3.5Flash',i:1.5,o:9,cw:'1M'},{k:'gemini-3.1-pro',n:'Gemini 3.1 Pro',i:2.5,o:15,cw:'1M'},{k:'gemini-3-flash',n:'Gemini 3 Flash',i:0.5,o:3,cw:'1M'},{k:'gemini-2.5-flash',n:'Gemini 2.5Flash',i:0.3,o:2.5,cw:'1M'},{k:'gemini-1.5-pro',n:'Gemini 1.5 Pro',i:3.5,o:10.5,cw:'2M'},{k:'gemini-1.5-flash',n:'Gemini 1.5 Flash',i:0.075,o:0.3,cw:'1M'},{k:'gemini-2.0-flash',n:'Gemini 2.0Flash',i:0.1,o:0.4,cw:'1M'},{k:'gemini-2.0-flash-001',n:'Gemini 2.0Flash 001',i:0.1,o:0.4,cw:'1M'},{k:'gemini-2.0-flash-lite',n:'Gemini 2.0Flash Lite',i:0.075,o:0.3,cw:'1M'},{k:'gemini-2.0-flash-lite-001',n:'Gemini 2.0Flash Lite 001',i:0.075,o:0.3,cw:'1M'},{k:'gemini-2.5-flash-image',n:'Gemini 2.5Flash Image',i:0.3,o:2.5,cw:'33K'},{k:'gemini-3-pro-image-preview',n:'Gemini 3Pro Image Preview',i:2,o:12,cw:'66K'},{k:'gemini-3.1-flash-image-preview',n:'Gemini 3.1Flash Image Preview',i:0.25,o:1.5,cw:'66K'},{k:'gemini-3.1-flash-lite-preview',n:'Gemini 3.1Flash Lite Preview',i:0.25,o:1.5,cw:'1M'},{k:'gemini-3.1-flash-lite',n:'Gemini 3.1Flash Lite',i:0.25,o:1.5,cw:'1M'},{k:'gemini-2.5-flash-lite',n:'Gemini 2.5Flash Lite',i:0.1,o:0.4,cw:'1M'},{k:'gemini-2.5-flash-lite-preview-09-2025',n:'Gemini 2.5Flash Lite Preview 092025',i:0.1,o:0.4,cw:'1M'},{k:'gemini-2.5-flash-preview-09-2025',n:'Gemini 2.5Flash Preview 092025',i:0.3,o:2.5,cw:'1M'},{k:'gemini-live-2.5-flash-preview-native-audio-09-2025',n:'Gemini Live 2.5Flash Preview Native Audio 092025',i:0.3,o:2,cw:'1M'},{k:'gemini-2.5-flash-lite-preview-06-17',n:'Gemini 2.5Flash Lite Preview 0617',i:0.1,o:0.4,cw:'1M'},{k:'gemini-2.5-pro',n:'Gemini 2.5Pro',i:1.25,o:10,cw:'1M'},{k:'gemini-3-pro-preview',n:'Gemini 3Pro Preview',i:2,o:12,cw:'1M'},{k:'gemini-3.1-pro-preview',n:'Gemini 3.1Pro Preview',i:2,o:12,cw:'1M'},{k:'gemini-3.1-pro-preview-customtools',n:'Gemini 3.1Pro Preview Customtools',i:2,o:12,cw:'1M'},{k:'gemini-2.5-pro-preview-tts',n:'Gemini 2.5Pro Preview Tts',i:1.25,o:10,cw:'1M'},{k:'gemini-robotics-er-1.5-preview',n:'Gemini Robotics Er 1.5Preview',i:0.3,o:2.5,cw:'1M'},{k:'gemini-2.5-computer-use-preview-10-2025',n:'Gemini 2.5Computer Use Preview 102025',i:1.25,o:10,cw:'128K'},{k:'deep-research-pro-preview-12-2025',n:'Deep Research Pro Preview 122025',i:2,o:12,cw:'66K'},{k:'gemini-flash-latest',n:'Gemini Flash Latest',i:0.3,o:2.5,cw:'1M'},{k:'gemini-flash-lite-latest',n:'Gemini Flash Lite Latest',i:0.1,o:0.4,cw:'1M'},{k:'gemini-2.5-flash-preview-tts',n:'Gemini 2.5Flash Preview Tts',i:0.3,o:2.5,cw:'128K'},{k:'gemini-3-flash-preview',n:'Gemini 3Flash Preview',i:0.5,o:3,cw:'1M'},{k:'gemini-gemma-2-27b-it',n:'Gemini Gemma 227b It',i:0.35,o:1.05,cw:'8K'},{k:'gemini-gemma-2-9b-it',n:'Gemini Gemma 29b It',i:0.35,o:1.05,cw:'8K'},{k:'gemini-2.5-flash-native-audio-latest',n:'Gemini 2.5Flash Native Audio Latest',i:0.3,o:2.5,cw:'1M'},{k:'gemini-2.5-flash-native-audio-preview-09-2025',n:'Gemini 2.5Flash Native Audio Preview 092025',i:0.3,o:2.5,cw:'1M'},{k:'gemini-2.5-flash-native-audio-preview-12-2025',n:'Gemini 2.5Flash Native Audio Preview 122025',i:0.3,o:2.5,cw:'1M'},{k:'gemini-3.1-flash-live-preview',n:'Gemini 3.1Flash Live Preview',i:0.75,o:4.5,cw:'131K'},{k:'gemini-pro-latest',n:'Gemini Pro Latest',i:1.25,o:10,cw:'1M'},{k:'gemini-exp-1206',n:'Gemini Exp 1206',i:0.3,o:2.5,cw:'1M'}]}," +
  "deepseek:{n:'DeepSeek',m:[{k:'deepseek-v4-flash',n:'DeepSeek V4 Flash',i:0.14,o:0.28,cw:'1M'},{k:'deepseek-v4-pro',n:'DeepSeek V4 Pro',i:1.74,o:3.48,cw:'1M'},{k:'deepseek-v4-pro-promo',n:'V4 Pro (75% Promo)',i:0.435,o:0.87,cw:'1M'},{k:'deepseek-r1',n:'Deepseek R1',i:0.55,o:2.19,cw:'66K'},{k:'deepseek-chat',n:'Deepseek Chat',i:0.28,o:0.42,cw:'131K'},{k:'deepseek-reasoner',n:'Deepseek Reasoner',i:0.28,o:0.42,cw:'131K'},{k:'deepseek-coder',n:'Deepseek Coder',i:0.14,o:0.28,cw:'128K'},{k:'deepseek-v3',n:'Deepseek V3',i:0.27,o:1.1,cw:'66K'},{k:'deepseek-v3.2',n:'Deepseek V3.2',i:0.28,o:0.4,cw:'164K'}]}};" +
  // Provider initials + colors
  "var PI={openai:'O',anthropic:'A',google:'G',deepseek:'D'};" +
  // Build flat list
  "var AM=[];" +
  "for(var pk in P){var pv=P[pk];for(var i=0;i<pv.m.length;i++){var m=pv.m[i];AM.push({k:m.k,n:m.n,i:m.i,o:m.o,cw:m.cw,pr:pk});}}" +
  // Helpers
  "function fm(n){if(Math.abs(n)<0.01&&n!==0)return '$'+n.toFixed(4);return '$'+n.toFixed(2)}" +
  "function lc(n){return n.toLocaleString()}" +
  "function pd(s,l){return s+' '.repeat(Math.max(0,l-s.length))}" +
  "var SEP='\\u2500';" +
  // Parse inputs
  "var iT=Math.max(1,Math.min(1e7,parseInt(inputs.inputTokens)||1000));" +
  "var oT=Math.max(1,Math.min(1e7,parseInt(inputs.outputTokens)||500));" +
  "var rpd=Math.max(0,Math.min(1e6,parseInt(inputs.requestsPerDay)||100));" +
  "var pm=inputs.pricingMode||'realtime';" +
  "var bm=pm==='batch'?0.5:1;var rpm=rpd*30;" +
  // Compute costs
  "var ac=[];" +
  "for(var i=0;i<AM.length;i++){var m=AM[i];var cpr=(iT/1e6)*m.i*bm+(oT/1e6)*m.o*bm;ac.push({m:m,cpr:cpr,mc:cpr*rpm});}" +
  "ac.sort(function(a,b){return a.mc-b.mc;});" +
  "var ch=ac[0];var me=ac[ac.length-1];var mx=me.mc;" +
  // Output
  "var o=[];" +
  // Section 1: Header
  "var mem=pm==='batch'?'\\u26A1':'\\u{1F534}';" +
  "var ml=pm==='batch'?'Batch Pricing (50% off)':'Real-time Pricing';" +
  "o.push(mem+' '+ml);o.push('');" +
  "o.push('Input: '+lc(iT)+' tokens/req | Output: '+lc(oT)+' tokens/req | Volume: '+lc(rpd)+' reqs/day ('+lc(rpm)+' reqs/month)');" +
  "var pkCount=0;for(var k in P)pkCount++;" +
  "o.push('Comparing '+AM.length+' models across '+pkCount+' providers');" +
  "o.push('');" +
  // Section 2: Cheapest Finder
  "var chpn=P[ch.m.pr].n;var chi=PI[ch.m.pr];" +
  "o.push('\\u{1F3C6} Cheapest Model Overall');" +
  "o.push(SEP.repeat(50));" +
  "o.push('  ['+chi+'] '+ch.m.n+' ('+chpn+') \\u2014 '+fm(ch.mc)+'/month');" +
  "o.push('  Rate: '+fm(ch.m.i)+'/'+fm(ch.m.o)+' per 1M tokens | Context: '+ch.m.cw);" +
  "o.push('  Per request: '+fm(ch.cpr)+' | Daily: '+fm(ch.cpr*rpd)+' | Monthly: '+fm(ch.mc));" +
  "var sv=me.mc-ch.mc;var ps=me.mc>0?Math.round((sv/me.mc)*100):0;" +
  "o.push('  Savings vs '+me.m.n+': '+fm(sv)+'/month ('+ps+'% cheaper)');" +
  "o.push('');" +
  // Section 3: Bar Chart
  "o.push('\\u{1F4CA} Full Model Comparison ('+lc(rpd)+' reqs/day)');" +
  "o.push(SEP.repeat(54));" +
  "var BW=36;" +
  "for(var i=0;i<ac.length;i++){" +
  "var c=ac[i];var ini=PI[c.m.pr];var label='['+ini+'] '+c.m.n;" +
  "var bl=mx>0?Math.max(1,Math.round((c.mc/mx)*BW)):1;" +
  "var bc=c.m.k===ch.m.k?'\\u2591':'\\u2588';var bar=bc.repeat(bl);var bd=c.m.k===ch.m.k?' \\u{1F3C6}':'';" +
  "o.push(pd(label,24)+' '+pd(bar,BW)+' '+fm(c.mc)+bd);" +
  "}" +
  "o.push('');" +
  // Section 4: Provider Summary
  "o.push('\\u{1F50D} Provider Summary');" +
  "o.push(SEP.repeat(50));" +
  "for(var pk2 in P){var prov=P[pk2];" +
  "var pcs=ac.filter(function(c){return c.m.pr===pk2;});" +
  "var pcch=pcs[0];var pcme=pcs[pcs.length-1];var ini2=PI[pk2];" +
  "o.push('  ['+ini2+'] '+prov.n+': '+pcch.m.n+' (cheapest) at '+fm(pcch.mc)+'/month | Range: '+fm(pcch.mc)+' \\u2013 '+fm(pcme.mc)+'/month');" +
  "}" +
  "o.push('');" +
  // Section 5: Usage Scenarios
  "o.push('\\u{1F4C5} Usage Scenarios \\u2014 Top 5 Cheapest Models at Different Volumes');" +
  "o.push('');" +
  "var top5=ac.slice(0,5);var tiers=[50,100,500,1000,5000,10000];" +
  "var hr='Model'.padEnd(22);for(var i=0;i<tiers.length;i++)hr+=' | '+lc(tiers[i])+' reqs/day'.padEnd(14);o.push(hr);" +
  "var sr=''.padEnd(22,SEP);for(var i=0;i<tiers.length;i++)sr+='-+-'.padEnd(15,SEP);o.push(sr);" +
  "for(var i=0;i<top5.length;i++){" +
  "var e=top5[i];var ini3=PI[e.m.pr];var lab='['+ini3+'] '+e.m.n;var row=pd(lab,22);" +
  "for(var j=0;j<tiers.length;j++){var cat=e.cpr*tiers[j]*30;row+=' | '+fm(cat).padEnd(14);}" +
  "o.push(row);" +
  "}" +
  "o.push('');" +
  "o.push('Legend: [O]=OpenAI  [A]=Anthropic  [G]=Google  [D]=DeepSeek');" +
  "return o;";

const engine: ToolEngine = {
  slug: 'solopreneur-ai-api-cost-comparison',
  title: 'AI API Cost Comparison',
  description: 'Cross-provider AI API cost comparison across 15 models from OpenAI, Anthropic, Google, and DeepSeek. Find the cheapest model for your usage — with bar chart, provider summary, and volume scenario planning.',
  category: 'B',
  inputs: [
    { name: 'inputTokens', label: 'Input Tokens per Request', placeholder: 'e.g. 1000', type: 'number' },
    { name: 'outputTokens', label: 'Output Tokens per Request', placeholder: 'e.g. 500', type: 'number' },
    { name: 'requestsPerDay', label: 'Requests per Day', placeholder: 'e.g. 100', type: 'number' },
    { name: 'pricingMode', label: 'Pricing Mode', placeholder: '', type: 'select', options: ['realtime', 'batch'] },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs) { return calculate(inputs); },
  staticExamples: [
    '🔴 Real-time Pricing\n' +
    '\n' +
    'Input: 1,000 tokens/req | Output: 500 tokens/req | Volume: 100 reqs/day (3,000 reqs/month)\n' +
    'Comparing 15 models across 4 providers\n' +
    '\n' +
    '🏆 Cheapest Model Overall\n' +
    '──────────────────────────────────────────────────\n' +
    '  [D] V4 Flash (DeepSeek) — $0.37/month\n' +
    '  Rate: $0.14/$0.28 per 1M tokens | Context: 1M\n' +
    '  Per request: $0.00041 | Daily: $0.01 | Monthly: $0.37\n' +
    '  Savings vs Claude Fable 5: $24.63/month (99% cheaper)\n' +
    '\n' +
    '📊 Full Model Comparison (100 reqs/day)\n' +
    '──────────────────────────────────────────────────────\n' +
    '[D] V4 Flash               ░                                       $0.37\n' +
    '[O] GPT-5 Nano             █                                       $0.45\n' +
    '[G] Gemini 1.5 Flash       █                                       $0.45\n' +
    '[D] V4 Pro (Promo)         █                                       $1.12\n' +
    '[A] Claude Haiku 3         █                                       $1.12\n' +
    '[G] Gemini 3 Flash         ██                                      $1.80\n' +
    '[O] GPT-5 Mini             ██                                      $2.25\n' +
    '[D] V4 Pro                 ████                                    $4.54\n' +
    '[A] Claude Haiku 4.5       ████                                    $4.50\n' +
    '[G] Gemini 3.5 Flash       ███████                                 $7.50\n' +
    '[G] Gemini 3.1 Pro         ████████████                             $13.50\n' +
    '[O] GPT-5                  ███████████                              $12.75\n' +
    '[A] Claude Sonnet 4.6      ██████████████                           $15.75\n' +
    '[O] GPT-5.5                ██████████████████████████               $28.50\n' +
    '[A] Claude Fable 5         ████████████████████████████████████████ $25.00\n' +
    '\n' +
    '🔍 Provider Summary\n' +
    '──────────────────────────────────────────────────\n' +
    '  [O] OpenAI: GPT-5 Nano (cheapest) at $0.45/month | Range: $0.45 – $28.50/month\n' +
    '  [A] Anthropic: Claude Haiku 3 (cheapest) at $1.12/month | Range: $1.12 – $25.00/month\n' +
    '  [G] Google: Gemini 1.5 Flash (cheapest) at $0.45/month | Range: $0.45 – $13.50/month\n' +
    '  [D] DeepSeek: V4 Flash (cheapest) at $0.37/month | Range: $0.37 – $4.54/month\n' +
    '\n' +
    '📅 Usage Scenarios — Top 5 Cheapest Models at Different Volumes\n' +
    '\n' +
    'Model                  | 50 reqs/day   | 100 reqs/day  | 500 reqs/day  | 1,000 reqs/day | 5,000 reqs/day | 10,000 reqs/day\n' +
    '──────────────────────-+-──────────────-+-──────────────-+-──────────────-+-───────────────-+-───────────────-+-────────────────\n' +
    '[D] V4 Flash           | $0.18         | $0.37         | $1.84         | $3.68          | $18.45         | $36.90         \n' +
    '[O] GPT-5 Nano         | $0.23         | $0.45         | $2.25         | $4.50          | $22.50         | $45.00         \n' +
    '[G] Gemini 1.5 Flash   | $0.22         | $0.45         | $2.25         | $4.50          | $22.50         | $45.00         \n' +
    '[D] V4 Pro (Promo)     | $0.56         | $1.12         | $5.64         | $11.28         | $56.42         | $112.84        \n' +
    '[A] Claude Haiku 3     | $0.56         | $1.12         | $5.62         | $11.25         | $56.25         | $112.50        \n',
    '[D] V4 Flash: 50→$0.18 · 100→$0.37 · 500→$1.84 · 1,000→$3.68 · 5,000→$18.45 · 10,000→$36.90',
    '[O] GPT-5 Nano: 50→$0.23 · 100→$0.45 · 500→$2.25 · 1,000→$4.50 · 5,000→$22.50 · 10,000→$45.00',
    '[G] Gemini 1.5 Flash: 50→$0.22 · 100→$0.45 · 500→$2.25 · 1,000→$4.50 · 5,000→$22.50 · 10,000→$45.00',
    '[D] V4 Pro (Promo): 50→$0.56 · 100→$1.12 · 500→$5.64 · 1,000→$11.28 · 5,000→$56.42 · 10,000→$112.84',
  ],
  faq: [
    {
      q: 'Which AI API is the absolute cheapest in 2026?',
      a: 'DeepSeek V4 Flash at $0.14/$0.28 per 1M input/output tokens is the cheapest frontier-quality model. OpenAI GPT-5 Nano ($0.05/$0.40) is slightly cheaper on input but more expensive on output. Gemini 1.5 Flash ($0.075/$0.30) is very close. At scale (millions of requests), DeepSeek V4 Flash saves 95-99% vs GPT-5.5 or Claude Fable 5.',
    },
    {
      q: 'Should I always use the cheapest model?',
      a: 'Not necessarily. Match the model to the task: use ultra-cheap models (GPT-5 Nano, V4 Flash, Haiku 3) for classification, routing, simple Q&A. Use mid-tier (GPT-5 Mini, V4 Pro Promo, Gemini 3 Flash) for general-purpose chat and content. Reserve premium models (GPT-5.5, Claude Fable 5, Sonnet 4.6) only for complex reasoning, code generation, and safety-critical applications.',
    },
    {
      q: 'How does batch pricing affect costs?',
      a: 'Batch pricing cuts costs by 50% across all providers with async processing (typically within 24 hours). OpenAI, Anthropic, and Google all offer batch APIs. Use batch for: bulk data processing, overnight analytics, content pipelines, data labeling. Real-time is for: chatbots, interactive apps, code assistants. DeepSeek does not offer batch pricing — but it is already the cheapest option.',
    },
    {
      q: 'What is the cost difference at enterprise scale?',
      a: 'At 10,000 reqs/day with 1K input + 500 output tokens: DeepSeek V4 Flash costs ~$37/month. OpenAI GPT-5 Nano costs ~$45/month. Gemini 1.5 Flash costs ~$45/month. Claude Haiku 3 costs ~$113/month. GPT-5.5 costs ~$2,850/month. Claude Fable 5 costs ~$2,500/month. The 50-75x gap between cheapest and premium models is why enterprise teams use a tiered routing strategy.',
    },
    {
      q: 'How do I switch between AI providers easily?',
      a: 'Use an AI gateway like LiteLLM, Portkey, or OpenRouter that provides a unified OpenAI-compatible API. Deploy with tiered routing: cheapest model first (V4 Flash/GPT-5 Nano), fallback to mid-tier on failure, premium only for flagged high-complexity requests. This "model tiering" strategy typically reduces total costs by 80-90% vs using a single premium model.',
    },
    {
      q: 'Do these providers offer free tiers?',
      a: 'OpenAI: free ChatGPT usage (not API). Google: free tier via AI Studio (1,500 reqs/day on select models). Anthropic: free claude.ai usage only. DeepSeek: pay-as-you-go only but ultra-low prices with generous initial credits. All major providers offer startup credits ($5K-$25K) through partner programs like AWS Activate, Google Cloud for Startups, etc.',
    },
    {
      q: 'Which provider is best for my use case?',
      a: 'Budget + good quality: DeepSeek V4 Flash. Best free tier: Gemini 1.5 Flash (Google AI Studio). Best safety: Anthropic Claude models. Best ecosystem/tools: OpenAI. Best multimodal: Gemini 3.5 Flash. Best for coding: Claude Sonnet 4.6 or GPT-5. For most solopreneurs, using DeepSeek V4 Flash for 90% of tasks + a premium model for the remaining 10% is the optimal cost-quality strategy.',
    },
  ],
  howToUse: [
    'Enter your average input tokens per API request.',
    'Enter your average output tokens per API request.',
    'Set your expected daily request volume.',
    'Choose real-time or batch pricing (batch gives 50% off for async jobs).',
    'Review the bar chart to see all 15 models ranked by monthly cost.',
    'Check the Provider Summary to find the cheapest model from each provider, and use the Usage Scenarios table to plan costs at different volumes.',
  ],
  dataLastUpdated: PRICING.lastUpdated,
};

registerEngine(engine);
