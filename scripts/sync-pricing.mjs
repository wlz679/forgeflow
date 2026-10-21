#!/usr/bin/env node
// scripts/sync-pricing.mjs
// Fetch latest AI pricing from LiteLLM (community-maintained) and update src/data/ai-pricing.json
// Run weekly via GitHub Actions (.github/workflows/sync-pricing.yml)
//
// Currently syncs LLM data only (OpenAI, Anthropic, Google, DeepSeek).
// Image-gen and GPU data is hand-curated in ai-pricing.json — manual edits welcome.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JSON_PATH = path.join(__dirname, '..', 'src', 'data', 'ai-pricing.json');
const LITELLM_URL = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';

const log = (msg) => console.log(`[sync-pricing] ${msg}`);

async function fetchLiteLLM() {
  log(`Fetching from ${LITELLM_URL}...`);
  const res = await fetch(LITELLM_URL, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

// Map LiteLLM model key → our JSON provider + key
// LiteLLM keys are like "gpt-5", "claude-3-5-sonnet-20241022", "gemini/gemini-1.5-pro", etc.
const PROVIDER_MATCHERS = [
  { provider: 'openai', test: (k) => k.startsWith('gpt-') || k.startsWith('o1') || k.startsWith('o3') || k.startsWith('o4') },
  { provider: 'anthropic', test: (k) => k.startsWith('claude-') || k.startsWith('claude_') },
  { provider: 'google', test: (k) => k.startsWith('gemini/') || k.startsWith('gemini-') },
  { provider: 'deepseek', test: (k) => k.startsWith('deepseek/') || k.startsWith('deepseek-') },
];

function detectProvider(litellmKey) {
  for (const m of PROVIDER_MATCHERS) if (m.test(litellmKey)) return m.provider;
  return null;
}

function extractPrice(modelEntry) {
  // LiteLLM uses input_cost_per_token and output_cost_per_token (per token, not per 1M)
  const inputPer1M = modelEntry.input_cost_per_token ? modelEntry.input_cost_per_token * 1_000_000 : null;
  const outputPer1M = modelEntry.output_cost_per_token ? modelEntry.output_cost_per_token * 1_000_000 : null;
  return { input: inputPer1M, output: outputPer1M };
}

function deriveFamily(modelName) {
  const n = modelName.toLowerCase();
  if (n.includes('gpt-6')) return 'gpt6';
  if (n.includes('gpt-5')) return 'gpt5';
  if (n.includes('gpt-4.1')) return 'gpt41';
  if (n.startsWith('o1') || n.startsWith('o3') || n.startsWith('o4')) return 'o-series';
  if (n.includes('claude-fable') || n.includes('claude-mythos')) return 'mythos';
  if (n.includes('claude-opus-5') || n.includes('claude-sonnet-5') || n.includes('claude-haiku-5')) return 'claude5x';
  if (n.includes('claude-opus') || n.includes('claude-sonnet') || n.includes('claude-haiku-4')) return 'claude4x';
  if (n.includes('claude-3') || n.includes('claude-2')) return 'legacy';
  if (n.includes('gemini-4')) return 'gem4';
  if (n.includes('gemini-3.5')) return 'flash35';
  if (n.includes('gemini-3.1-pro') || n.includes('gemini-2.0-pro')) return 'pro';
  if (n.includes('gemini-3')) return 'flash3';
  if (n.includes('deepseek-v4')) return 'v4';
  return 'legacy';
}

// ============================================================
// Curated flagship models (P153-A)
// ------------------------------------------------------------
// `lead` — display order, newest first. The engines sort their tables by
//          `order`, so the curated block always leads the chart.
// `meta` — hand-curated extras LiteLLM does not carry:
//            batchFactor      — batch price as a fraction of realtime (0.5 = 50% off)
//            maxOutput        — max output tokens label (Anthropic)
//            icon             — family glyph (Gemini)
//            supportsCache / supportsBatch — capability flags (Gemini)
// Models absent from `meta` keep upstream-only data (no batch pricing, no icon).
// Keeping this in the sync script (rather than hand-editing the JSON) means the
// curated table is reproducible: `pnpm sync` always rebuilds it from scratch.
// ============================================================
const CURATED = {
  openai: {
    lead: [
      'gpt-6.1-sol', 'gpt-6-astra', 'gpt-6-sol', 'gpt-6-luna',
      'gpt-5.5', 'gpt-5.2', 'gpt-5', 'gpt-5-mini', 'gpt-5-nano',
      'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano',
      'o3', 'o4-mini', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo',
    ],
    meta: {
      'gpt-6.1-sol': { batchFactor: 0.5 },
      'gpt-6-astra': { batchFactor: 0.5 },
      'gpt-6-sol': { batchFactor: 0.5 },
      'gpt-6-luna': { batchFactor: 0.5 },
      'gpt-5.5': { batchFactor: 0.5 },
      'gpt-5.2': { batchFactor: 0.5 },
      'gpt-5': { batchFactor: 0.5 },
      'gpt-5-mini': { batchFactor: 0.5 },
      'gpt-5-nano': { batchFactor: 0.5 },
      'gpt-4.1': { batchFactor: 0.5 },
      'gpt-4.1-mini': { batchFactor: 0.5 },
      'gpt-4.1-nano': { batchFactor: 0.5 },
      'o3': { batchFactor: 0.5, reasoningMultiplier: 4 },
      'o4-mini': { batchFactor: 0.5, reasoningMultiplier: 4 },
      'gpt-4o': { batchFactor: 0.5 },
      'gpt-4o-mini': { batchFactor: 0.5 },
      'gpt-4-turbo': { batchFactor: 0.5 },
      'gpt-3.5-turbo': { batchFactor: 0.5 },
    },
  },
  anthropic: {
    lead: [
      'claude-fable-5', 'claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5',
      'claude-opus-5', 'claude-sonnet-5', 'claude-mythos-5',
      'claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5',
      'claude-opus-4-1', 'claude-haiku-3-5', 'claude-haiku-3',
    ],
    meta: {
      'claude-fable-5': { batchFactor: 0.5, maxOutput: '128K' },
      'claude-opus-5-5': { batchFactor: 0.5, maxOutput: '128K' },
      'claude-sonnet-5-5': { batchFactor: 0.5, maxOutput: '128K' },
      'claude-haiku-5-5': { batchFactor: 0.5, maxOutput: '128K' },
      'claude-opus-5': { batchFactor: 0.5, maxOutput: '128K' },
      'claude-sonnet-5': { batchFactor: 0.5, maxOutput: '128K' },
      'claude-mythos-5': { batchFactor: 0.5, maxOutput: '128K' },
      'claude-opus-4-8': { batchFactor: 0.5, maxOutput: '128K' },
      'claude-sonnet-4-6': { batchFactor: 0.5, maxOutput: '64K' },
      'claude-haiku-4-5': { batchFactor: 0.5, maxOutput: '64K' },
      'claude-opus-4-1': { batchFactor: 0.5, maxOutput: '32K' },
      'claude-haiku-3-5': { batchFactor: 0.5, maxOutput: '8K' },
      'claude-haiku-3': { batchFactor: 0.5, maxOutput: '4K' },
    },
  },
  google: {
    lead: [
      'gemini-4-argon', 'gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.1-pro',
      'gemini-3-flash', 'gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash',
    ],
    meta: {
      'gemini-4-argon': { batchFactor: 0.5, icon: '★', supportsCache: true, supportsBatch: true },
      'gemini-3.8-flash': { batchFactor: 0.5, icon: '◆', supportsCache: true, supportsBatch: true },
      'gemini-3.5-flash': { batchFactor: 0.25, icon: '●', supportsCache: true, supportsBatch: true },
      'gemini-3.1-pro': { batchFactor: 0.5, icon: '▲', supportsCache: true, supportsBatch: true, longContextDoubling: '>200K' },
      'gemini-3-flash': { batchFactor: 0.5, icon: '◆', supportsCache: true, supportsBatch: true },
      'gemini-2.5-flash': { batchFactor: 0, icon: '◇', supportsCache: false, supportsBatch: false },
      'gemini-1.5-pro': { batchFactor: 0, icon: '◇', supportsCache: false, supportsBatch: false },
      'gemini-1.5-flash': { batchFactor: 0, icon: '◇', supportsCache: false, supportsBatch: false },
    },
  },
  deepseek: {
    // DeepSeek has no batch tier — the deepseek engine emits no batch fields.
    lead: [
      'deepseek-v4-flash', 'deepseek-v4-pro', 'deepseek-v4-pro-promo',
      'deepseek-r1', 'deepseek-chat', 'deepseek-reasoner', 'deepseek-coder',
      'deepseek-v3', 'deepseek-v3.2',
    ],
    meta: {},
  },
};

const round8 = (n) => Math.round(n * 1e8) / 1e8;

function applyCuration(data) {
  for (const [provider, cfg] of Object.entries(CURATED)) {
    const models = data.llm?.[provider]?.models;
    if (!models) continue;

    for (const [key, meta] of Object.entries(cfg.meta)) {
      const m = models[key];
      if (!m) continue;
      for (const [field, value] of Object.entries(meta)) {
        if (field === 'batchFactor') continue;
        m[field] = value;
      }
      if (meta.batchFactor != null) {
        m.batchInput = round8(m.input * meta.batchFactor);
        m.batchOutput = round8(m.output * meta.batchFactor);
      }
    }

    // Curated block leads; everything else keeps its relative order behind it.
    const lead = cfg.lead.filter((k) => models[k]);
    const rest = Object.entries(models)
      .filter(([k]) => !lead.includes(k))
      .sort((a, b) => (a[1].order || 9999) - (b[1].order || 9999));
    let order = 1;
    for (const k of lead) models[k].order = order++;
    for (const [, m] of rest) m.order = order++;
  }
}

function contextWindowLabel(tokens) {
  if (!tokens) return '128K';
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(0)}M`;
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}K`;
  return String(tokens);
}

function shortKey(litellmKey, provider) {
  // Strip provider prefix (gemini/, deepseek/) and dates (claude-3-5-sonnet-20241022 → claude-3-5-sonnet)
  let k = litellmKey.replace(/^(gemini|deepseek|claude|openai)\//, '');
  k = k.replace(/-\d{8}$/, ''); // strip dates
  return k;
}

function displayName(litellmKey) {
  // Convert "claude-3-5-sonnet" → "Claude 3.5 Sonnet", "gpt-5" → "GPT-5"
  const k = litellmKey.replace(/^(gemini|deepseek|claude|openai)\//, '').replace(/-\d{8}$/, '');
  return k
    .split('-')
    .map((p) => {
      if (/^gpt|^o\d/.test(p)) return p.toUpperCase();
      if (/^\d+$/.test(p)) return p;
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(' ')
    .replace(/(\d+) (\w)/g, '$1$2') // "3 5" → "3.5"? No, just keep space. We'll let humans read it.
    .replace(/^Gpt/, 'GPT');
}

async function main() {
  const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  let litellm;
  try {
    litellm = await fetchLiteLLM();
  } catch (err) {
    log(`ERROR: Failed to fetch LiteLLM data: ${err.message}`);
    log(`Keeping existing data. lastUpdated stays as ${data.lastUpdated}.`);
    process.exit(1);
  }

  const litellmCount = Object.keys(litellm).length;
  log(`Got ${litellmCount} models from LiteLLM.`);

  let updated = 0;
  let added = 0;
  let skipped = 0;

  for (const [litellmKey, entry] of Object.entries(litellm)) {
    if (!entry || typeof entry !== 'object') continue;
    const provider = detectProvider(litellmKey);
    if (!provider) { skipped++; continue; }

    const { input, output } = extractPrice(entry);
    if (input == null || output == null) { skipped++; continue; }

    const key = shortKey(litellmKey, provider);
    const providerData = data.llm[provider];
    if (!providerData) { skipped++; continue; }

    const family = deriveFamily(litellmKey);
    const name = displayName(litellmKey);
    const contextWindow = contextWindowLabel(entry.max_input_tokens || entry.max_tokens);

    if (providerData.models[key]) {
      const before = JSON.stringify(providerData.models[key]);
      providerData.models[key].input = input;
      providerData.models[key].output = output;
      providerData.models[key].family = family;
      providerData.models[key].name = name;
      providerData.models[key].contextWindow = contextWindow;
      if (before !== JSON.stringify(providerData.models[key])) updated++;
    } else {
      providerData.models[key] = {
        input, output, name, family, contextWindow,
        order: Object.keys(providerData.models).length + 1,
      };
      added++;
      log(`  + NEW ${provider}/${key}`);
    }
  }

  data.version = 1;
  data.lastUpdated = new Date().toISOString().slice(0, 10);
  data.source = 'litellm+manual';

  // Curated flagship block: display order + hand-curated extras.
  applyCuration(data);

  // Round numeric artifacts to 8 decimals to avoid IEEE-754 display cruft
  // (e.g. LiteLLM sometimes returns 0.049999999999999996 instead of 0.05).
  function roundDeep(obj) {
    if (typeof obj === 'number') return Math.round(obj * 1e8) / 1e8;
    if (Array.isArray(obj)) return obj.map(roundDeep);
    if (obj && typeof obj === 'object') {
      const out = {};
      for (const k of Object.keys(obj)) out[k] = roundDeep(obj[k]);
      return out;
    }
    return obj;
  }
  const cleaned = roundDeep(data);

  // Write back, preserving 2-space indent
  fs.writeFileSync(JSON_PATH, JSON.stringify(cleaned, null, 2) + '\n', 'utf8');
  log(`Updated: ${updated}, Added: ${added}, Skipped: ${skipped}`);
  log(`New lastUpdated: ${data.lastUpdated}`);
  log(`Wrote ${JSON_PATH}`);
}

main().catch((err) => {
  console.error('[sync-pricing] FATAL:', err);
  process.exit(2);
});
