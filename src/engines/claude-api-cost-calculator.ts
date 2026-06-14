import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

// --- Model definitions ---
interface ModelInfo {
  input: number;
  output: number;
  name: string;
  family: 'mythos' | 'claude4x' | 'legacy';
  contextWindow: string;
  maxOutput: string;
  batchInput: number;
  batchOutput: number;
  order: number;
}

const MODELS: Record<string, ModelInfo> = {
  // Mythos-class
  'claude-fable-5': {
    input: 10.0,
    output: 50.0,
    name: 'Claude Fable 5',
    family: 'mythos',
    contextWindow: '1M',
    maxOutput: '128K',
    batchInput: 5.0,
    batchOutput: 25.0,
    order: 1,
  },
  // Claude 4.x Current
  'claude-opus-4-8': {
    input: 5.0,
    output: 25.0,
    name: 'Claude Opus 4.8',
    family: 'claude4x',
    contextWindow: '1M',
    maxOutput: '128K',
    batchInput: 2.5,
    batchOutput: 12.5,
    order: 2,
  },
  'claude-sonnet-4-6': {
    input: 3.0,
    output: 15.0,
    name: 'Claude Sonnet 4.6',
    family: 'claude4x',
    contextWindow: '1M',
    maxOutput: '64K',
    batchInput: 1.5,
    batchOutput: 7.5,
    order: 3,
  },
  'claude-haiku-4-5': {
    input: 1.0,
    output: 5.0,
    name: 'Claude Haiku 4.5',
    family: 'claude4x',
    contextWindow: '200K',
    maxOutput: '64K',
    batchInput: 0.5,
    batchOutput: 2.5,
    order: 4,
  },
  // Legacy
  'claude-opus-4-1': {
    input: 15.0,
    output: 75.0,
    name: 'Claude Opus 4.1',
    family: 'legacy',
    contextWindow: '200K',
    maxOutput: '32K',
    batchInput: 7.5,
    batchOutput: 37.5,
    order: 5,
  },
  'claude-haiku-3-5': {
    input: 0.80,
    output: 4.0,
    name: 'Claude Haiku 3.5',
    family: 'legacy',
    contextWindow: '200K',
    maxOutput: '8K',
    batchInput: 0.4,
    batchOutput: 2.0,
    order: 6,
  },
  'claude-haiku-3': {
    input: 0.25,
    output: 1.25,
    name: 'Claude Haiku 3',
    family: 'legacy',
    contextWindow: '200K',
    maxOutput: '4K',
    batchInput: 0.125,
    batchOutput: 0.625,
    order: 7,
  },
};

// Family display metadata
const FAMILY_ICONS: Record<string, string> = {
  mythos: '✦',     // ✦
  claude4x: '▲',   // ▲
  legacy: '◆',     // ◆
};
const FAMILY_LABELS: Record<string, string> = {
  mythos: 'Mythos',
  claude4x: 'Claude 4.x',
  legacy: 'Legacy',
};

// Prompt Caching multipliers
const CACHE_WRITE_MULT: Record<string, number> = { '5min': 1.25, '1hour': 2.0 };
const CACHE_READ_MULT = 0.1;

// Default selected models (first 4, newest)
const DEFAULT_SELECTED = [
  'claude-fable-5',
  'claude-opus-4-8',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
];

// Scenario presets
const PRESETS: Record<string, Record<string, string>> = {
  'Small Project': {
    inputTokens: '500', outputTokens: '1000', requestsPerDay: '50',
    pricingMode: 'realtime', cacheWriteTokens: '500', cacheTTL: '5min', cacheReadHitRate: '80',
    growthRate: '0', projectionMonths: '12',
  },
  'Mid-Scale': {
    inputTokens: '2000', outputTokens: '1000', requestsPerDay: '500',
    pricingMode: 'realtime', cacheWriteTokens: '2000', cacheTTL: '5min', cacheReadHitRate: '60',
    growthRate: '0', projectionMonths: '12',
  },
  'High Volume': {
    inputTokens: '5000', outputTokens: '2000', requestsPerDay: '5000',
    pricingMode: 'realtime', cacheWriteTokens: '5000', cacheTTL: '1hour', cacheReadHitRate: '40',
    growthRate: '0', projectionMonths: '12',
  },
  'Batch Processing': {
    inputTokens: '3000', outputTokens: '5000', requestsPerDay: '10000',
    pricingMode: 'batch', cacheWriteTokens: '0', cacheTTL: '5min', cacheReadHitRate: '0',
    growthRate: '0', projectionMonths: '12',
  },
  'Heavy Caching': {
    inputTokens: '2000', outputTokens: '800', requestsPerDay: '2000',
    pricingMode: 'realtime', cacheWriteTokens: '2000', cacheTTL: '1hour', cacheReadHitRate: '90',
    growthRate: '0', projectionMonths: '12',
  },
  Enterprise: {
    inputTokens: '10000', outputTokens: '5000', requestsPerDay: '50000',
    pricingMode: 'batch', cacheWriteTokens: '10000', cacheTTL: '1hour', cacheReadHitRate: '70',
    growthRate: '0', projectionMonths: '12',
  },
};

// Cross-provider reference prices (cheapest from each, per 1M tokens)
const CROSS_PROVIDER: Record<string, { input: number; output: number; name: string }> = {
  openai: { input: 0.05, output: 0.4, name: 'GPT-5 Nano' },
  deepseek: { input: 0.14, output: 0.28, name: 'DeepSeek Chat' },
  gemini: { input: 0.075, output: 0.3, name: 'Gemini 1.5 Flash' },
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

// Token estimator (Claude tokenizer ≈1.3-1.5 tokens/word English, ~0.65 chars/token CJK)
function estimateTokens(text: string): { tokens: number; method: string } {
  if (!text.trim()) return { tokens: 0, method: 'empty' };
  const cjk = (text.match(/[一-鿿㐀-䶿]/g) || []).length;
  const words = text.split(/\s+/).length;
  if (cjk > text.length * 0.3) {
    return { tokens: Math.round(text.length / 0.65), method: 'CJK (0.65 chars/token)' };
  }
  return { tokens: Math.round(words * 1.4), method: 'English (1.4 words/token)' };
}

// SEP and DASH for formatting
const SEP = '─'; // ─
const DASH = '—'; // —
