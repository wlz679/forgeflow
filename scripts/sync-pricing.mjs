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
  if (n.includes('gpt-5')) return 'gpt5';
  if (n.includes('gpt-4.1')) return 'gpt41';
  if (n.startsWith('o1') || n.startsWith('o3') || n.startsWith('o4')) return 'o-series';
  if (n.includes('claude-fable') || n.includes('claude-mythos')) return 'mythos';
  if (n.includes('claude-opus') || n.includes('claude-sonnet') || n.includes('claude-haiku-4') || n.includes('claude-haiku-5')) return 'claude4x';
  if (n.includes('claude-3') || n.includes('claude-2')) return 'legacy';
  if (n.includes('gemini-3.5')) return 'flash35';
  if (n.includes('gemini-3.1-pro') || n.includes('gemini-2.0-pro')) return 'pro';
  if (n.includes('gemini-3')) return 'flash3';
  if (n.includes('deepseek-v4')) return 'v4';
  return 'legacy';
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

  // Write back, preserving 2-space indent
  fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
  log(`Updated: ${updated}, Added: ${added}, Skipped: ${skipped}`);
  log(`New lastUpdated: ${data.lastUpdated}`);
  log(`Wrote ${JSON_PATH}`);
}

main().catch((err) => {
  console.error('[sync-pricing] FATAL:', err);
  process.exit(2);
});
