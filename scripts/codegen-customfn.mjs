#!/usr/bin/env node
// scripts/codegen-customfn.mjs
// Regenerate the data table section of customFn for each engine from PRICING.
// Each engine has a config that maps JSON field names to customFn field names.
// Run after sync-pricing.mjs to keep client-side data fresh.
//
// Note: this only regenerates the data table. The customFn's logic (the
// part AFTER the data table) is left untouched.
//
// --check mode: regenerate in memory and diff against disk. Exit 1 if any drift.
// Useful for CI: catch out-of-sync customFn tables without mutating files.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PRICING_PATH = path.join(ROOT, 'src', 'data', 'ai-pricing.json');

const PRICING = JSON.parse(fs.readFileSync(PRICING_PATH, 'utf8'));
const CHECK_MODE = process.argv.includes('--check');

// ============================================================
// Per-engine config: how to render the data table for customFn
// ============================================================

const FAMILY_SHORT = {
  // openai
  'gpt5': 'g5', 'gpt41': 'g41', 'o-series': 'os', 'legacy': 'lg',
  // claude
  'mythos': 'mythos', 'claude4x': 'claude4x',
  // gemini
  'flash35': 'flash35', 'pro': 'pro', 'flash3': 'flash3',
  // deepseek
  'v4': 'v4',
};

const ICON = {
  'flash35': '●', 'pro': '▲', 'flash3': '◆', 'legacy': '◇',
};

const ENGINES = [
  {
    file: 'openai-token-calculator.ts',
    provider: 'openai',
    // Only include these models in customFn (default-selected + first preset).
    // Full list (120+ models) stays in PRICING.json but isn't bundled.
    // When user selects an unlisted model, customFn returns 0/no data (graceful degrade).
    popularKeys: ['gpt-5.5', 'gpt-5.2', 'gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'o3', 'o4-mini', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    tableStart: '"var M={};" +',
    tableEndMarker: 'Family icons',
    fieldMap: (m) => {
      const parts = [
        `i:${fmt(m.input)}`,
        `o:${fmt(m.output)}`,
        `f:'${FAMILY_SHORT[m.family] || 'lg'}'`,
        `c:'${m.contextWindow}'`,
      ];
      if (m.batchInput != null) parts.push(`bi:${fmt(m.batchInput)}`);
      if (m.batchOutput != null) parts.push(`bo:${fmt(m.batchOutput)}`);
      parts.push(`n:'${m.name.replace(/'/g, "\\'")}'`);
      if (m.reasoningMultiplier) parts.push(`rm:${m.reasoningMultiplier}`);
      parts.push(`od:${m.order}`);
      return parts.join(',');
    },
  },
  {
    file: 'claude-api-cost-calculator.ts',
    provider: 'anthropic',
    popularKeys: ['claude-fable-5', 'claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5', 'claude-opus-4-1', 'claude-haiku-3-5', 'claude-haiku-3'],
    tableStart: '"var M={" +',
    tableEndMarker: 'Family icons',
    fieldMap: (m) => {
      const parts = [
        `i:${fmt(m.input)}`,
        `o:${fmt(m.output)}`,
        `n:'${m.name.replace(/'/g, "\\'")}'`,
        `f:'${FAMILY_SHORT[m.family] || 'legacy'}'`,
        `cw:'${m.contextWindow}'`,
        `mo:'${m.maxOutput || '64K'}'`,
      ];
      if (m.batchInput != null) parts.push(`bi:${fmt(m.batchInput)}`);
      if (m.batchOutput != null) parts.push(`bo:${fmt(m.batchOutput)}`);
      parts.push(`od:${m.order}`);
      return parts.join(',');
    },
  },
  {
    file: 'gemini-api-cost-calculator.ts',
    provider: 'google',
    popularKeys: ['gemini-3.5-flash', 'gemini-3.1-pro', 'gemini-3-flash', 'gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    tableStart: '"var M={" +',
    tableEndMarker: 'var FL=',
    fieldMap: (m) => {
      const parts = [
        `i:${fmt(m.input)}`,
        `o:${fmt(m.output)}`,
        `bi:${fmt(m.batchInput || 0)}`,
        `bo:${fmt(m.batchOutput || 0)}`,
        `n:'${m.name.replace(/'/g, "\\'")}'`,
        `f:'${m.family}'`,
        `ic:'${ICON[m.family] || '◇'}'`,
        `cw:'${m.contextWindow}'`,
        `od:${m.order}`,
        `sc:${m.supportsCache ? 'true' : 'false'}`,
        `sb:${m.supportsBatch ? 'true' : 'false'}`,
      ];
      return parts.join(',');
    },
  },
  {
    file: 'deepseek-api-cost-calculator.ts',
    provider: 'deepseek',
    popularKeys: ['deepseek-v4-flash', 'deepseek-v4-pro', 'deepseek-v4-pro-promo', 'deepseek-r1'],
    tableStart: '"var M={" +',
    tableEndMarker: 'var FI=',
    fieldMap: (m) => {
      return [
        `i:${fmt(m.input)}`,
        `o:${fmt(m.output)}`,
        `n:'${m.name.replace(/'/g, "\\'")}'`,
        `f:'${m.family}'`,
        `cw:'${m.contextWindow}'`,
        `od:${m.order}`,
      ].join(',');
    },
  },
  // Special: ai-api-cost-comparison has nested P = { provider: {n, m: [...] } }
  {
    file: 'ai-api-cost-comparison.ts',
    tableStart: '"var P={',
    tableEndMarker: 'Provider initials + colors',
    custom: true, // skip generic generator
    provider: 'all', // use all providers
    // Bundle filter: 1 model per provider (cheapest flagship) keeps cross-provider
    // comparison useful without bundling all 188 models. The 4 flagship models are
    // the canonical "cheapest in each family" — users comparing providers usually
    // want to see this side-by-side.
    popularKeys: {
      openai: ['gpt-5-mini'],
      anthropic: ['claude-haiku-3'],
      google: ['gemini-1.5-flash'],
      deepseek: ['deepseek-v4-flash'],
    },
  },
  // Non-LLM engines
  {
    file: 'ai-image-generation-cost-calculator.ts',
    tableStart: '"var PS={" +',
    tableEndMarker: 'var ST=',
    fieldMap: (m) => {
      const parts = [
        `n:'${m.name.replace(/'/g, "\\'")}'`,
        `pi:${fmt(m.perImage)}`,
        `is:${m.isSubscription ? 'true' : 'false'}`,
        `sr:'${(m.subRange || '').replace(/'/g, "\\'")}'`,
        `q:'${m.quality.replace(/'/g, "\\'")}'`,
        `rs:[${m.resolutions.map((r) => `'${r}'`).join(',')}]`,
        `od:${m.order}`,
      ];
      return parts.join(',');
    },
    isImage: true,
  },
  {
    file: 'gpu-cloud-cost-calculator.ts',
    tableStart: '"var PS2={" +',
    tableEndMarker: 'var SCPG2=',
    fieldMap: (m, key) => {
      const rates = Object.entries(m.rates).map(([g, r]) => `${g}:${fmt(r)}`).join(',');
      return [
        `n:'${m.name.replace(/'/g, "\\'")}'`,
        `sm:${fmt(m.spotMult)}`,
        `rm:${fmt(m.reservedMult)}`,
        `r:{${rates}}`,
        `od:${m.order}`,
      ].join(',');
    },
    isGpu: true,
  },
  {
    file: 'ai-training-cost-estimator.ts',
    tableStart: '"var GT={" +',
    tableEndMarker: '"var MS={" +',
    fieldMap: (m) => {
      return [
        `hr:${fmt(m.hourlyRate)}`,
        `n:'${m.name.replace(/'/g, "\\'")}'`,
        `od:${m.order}`,
      ].join(',');
    },
    isTrainingGpu: true,
  },
  {
    file: 'ai-training-cost-estimator.ts',
    tableStart: '"var MS={" +',
    tableEndMarker: 'var SCG=',
    fieldMap: (m) => {
      const parts = [];
      if (m.h200 != null) parts.push(`h200:${m.h200}`);
      if (m.h100 != null) parts.push(`h100:${m.h100}`);
      if (m.a100 != null) parts.push(`a100:${m.a100}`);
      if (m.l40s != null) parts.push(`l40s:${m.l40s}`);
      parts.push(`n:'${m.name.replace(/'/g, "\\'")}'`);
      parts.push(`isL:${m.isLoRA ? 'true' : 'false'}`);
      parts.push(`od:${m.order}`);
      return parts.join(',');
    },
    isTrainingModel: true,
  },
];

// ============================================================
// Custom generator for ai-api-cost-comparison (nested structure)
// ============================================================
function generateComparisonTable() {
  // For each provider, sort models by order, render m:[{...},{...},...]
  const providerLines = [];
  for (const [pk, pv] of Object.entries(PRICING.llm)) {
    const sorted = Object.entries(pv.models).sort(([, a], [, b]) => (a.order || 99) - (b.order || 99));
    const modelLines = sorted.map(([mk, mv], i) => {
      const sep = i === sorted.length - 1 ? '' : ',';
      return `  "{k:'${mk}',n:'${mv.name.replace(/'/g, "\\'")}',i:${fmt(mv.input)},o:${fmt(mv.output)},cw:'${mv.contextWindow}'}${sep}" +`;
    }).join('\n');
    providerLines.push(`  "${pk}:{n:'${pv.name}',m:[${modelLines.includes('\n') ? '\\n' + modelLines : modelLines}]}," +`);
  }
  return providerLines.join('\n');
}

/**
 * Returns the new full file content with the comparison table replaced.
 * Returns null if markers are not found.
 */
function buildComparisonTableContent(filePath) {
  const c = fs.readFileSync(filePath, 'utf8');

  // Find the comparison engine config (has popularKeys per-provider)
  const compEngine = ENGINES.find((e) => e.file === 'ai-api-cost-comparison.ts');
  const popularKeys = compEngine?.popularKeys;

  // Generate new provider data, with `var P={` opening line
  const providerKeys = Object.keys(PRICING.llm);
  const providerLines = ['  "var P={" +'];
  providerKeys.forEach((pk, idx) => {
    const pv = PRICING.llm[pk];
    let modelEntries = Object.entries(pv.models);
    // Apply popularKeys filter for the comparison engine
    if (popularKeys && popularKeys[pk]) {
      const keep = new Set(popularKeys[pk]);
      modelEntries = modelEntries.filter(([k]) => keep.has(k));
    }
    const sorted = modelEntries.sort(([, a], [, b]) => (a.order || 99) - (b.order || 99));
    const modelParts = sorted.map(([mk, mv]) => `{k:'${mk}',n:'${mv.name.replace(/'/g, "\\'")}',i:${fmt(mv.input)},o:${fmt(mv.output)},cw:'${mv.contextWindow}'}`);
    const modelStr = modelParts.join(',');
    const isLast = idx === providerKeys.length - 1;
    const tail = isLast ? ']}};" +' : ']}," +';
    providerLines.push(`  "${pk}:{n:'${pv.name}',m:[${modelStr}${tail}`);
  });
  const newBlock = providerLines.join('\n');

  // Find the first provider line OR the "var P={" opening line (idempotent).
  // The original has `"var P={" +` on its own line; earlier codegen runs may
  // have added duplicates, so we look for the EARLIEST match and ensure we
  // only emit ONE "var P={" + in the output.
  const lines = c.split('\n');
  const startIdx = lines.findIndex((l) =>
    /^\s*"(var P=\{|(openai|anthropic|google|deepseek|azure|aws):\{)/.test(l)
  );
  const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('Provider initials + colors'));

  if (startIdx < 0 || endIdx < 0) return null;

  // Replace lines [startIdx, endIdx) with the new block (no trailing blank line —
  // the next string in the customFn concat is on the very next line)
  const newLines = [
    ...lines.slice(0, startIdx),
    newBlock,
    ...lines.slice(endIdx),
  ];
  return newLines.join('\n');
}

function fmt(n) {
  if (n == null) return '0';
  // Round to 4 decimal places to avoid 0.09999999
  return Number(n.toFixed(4)).toString();
}

function generateTable(engine) {
  // Determine the data source
  let entries;
  if (engine.isImage) entries = Object.entries(PRICING.image.providers);
  else if (engine.isGpu) entries = Object.entries(PRICING.gpu.providers);
  else if (engine.isTrainingGpu) entries = Object.entries(PRICING.training.gpuTypes);
  else if (engine.isTrainingModel) entries = Object.entries(PRICING.training.modelSizes);
  else entries = Object.entries(PRICING.llm[engine.provider].models);

  // Apply popularKeys filter (bundle-size optimization)
  if (engine.popularKeys && Array.isArray(engine.popularKeys)) {
    const keep = new Set(engine.popularKeys);
    entries = entries.filter(([k]) => keep.has(k));
  }

  const sorted = entries.sort(([, a], [, b]) => (a.order || 99) - (b.order || 99));

  // Openai format: M['key']={...};
  // Other format: 'key':{...},
  // Each engine has a tableStart (the declaration line emitted by the codegen,
  // e.g. "var M={" +). The previous version only prepended the declaration
  // for openai-token-calculator and relied on the existing declaration line
  // being preserved for other engines — but that's fragile: any future edit
  // that moves/regenerates the table without preserving the wrapping line
  // (e.g. a stale GitHub Action sync-pricing run after a manual fix) would
  // silently drop the declaration. Always prepend the wrapping AND close
  // the last entry with `};` for idempotence.
  if (engine.file === 'openai-token-calculator.ts') {
    const lines = sorted.map(([k, m]) => `  "M['${k}']={${engine.fieldMap(m, k)}};" +`).join('\n');
    return (engine.tableStart ? `  ${engine.tableStart}\n` : '  "var M={};" +\n') + lines;
  } else {
    const lines = sorted.map(([k, m], i) => {
      // Last entry closes the object literal: drop trailing comma, add '};'
      // so the resulting runtime is `var M={...}};var FI=...;` (semicolon
      // between `}` and next statement is required by ASI).
      const isLast = i === sorted.length - 1;
      const sep = isLast ? '};' : ',';
      return `  "'${k}':{${engine.fieldMap(m, k)}}${sep}" +`;
    }).join('\n');
    // Prepend tableStart (e.g. "var M={" +). If tableStart already ends with
    // "{" we don't add another; if it ends with "{...}" (like openai's
    // "var M={};" +), we use it as-is.
    return (engine.tableStart ? `  ${engine.tableStart}\n` : '') + lines;
  }
}

/**
 * Returns the new full file content with the data table replaced.
 * Returns null if markers are not found.
 */
function buildTableContent(filePath, engine) {
  const c = fs.readFileSync(filePath, 'utf8');
  const newTable = generateTable(engine);

  const lines = c.split('\n');

  // Find end marker
  const endIdx = lines.findIndex((l) => l.includes(engine.tableEndMarker));
  if (endIdx < 0) return null;

  // Find start: prefer the tableStart marker (the declaration line emitted
  // by the codegen, e.g. `"var M={" +`). Falling back to first data line
  // makes regen non-idempotent when the marker exists but the data block
  // has additional lines before it (legacy content from older regen runs).
  let startIdx = -1;
  if (engine.tableStart) {
    startIdx = lines.findIndex((l) => l.includes(engine.tableStart));
  }
  if (startIdx < 0) {
    // No tableStart marker found (or engine without one). Fall back to
    // first data line matching the engine's data shape.
    // Note: model names can contain `.` (e.g. gemini-3.5-flash), so the
    // key char class is [\w.-]+ not just [\w-]+.
    if (engine.file === 'openai-token-calculator.ts') {
      startIdx = lines.findIndex((l) => l.includes("M['") && l.includes('i:') && l.includes('o:'));
    } else if (engine.isImage) {
      startIdx = lines.findIndex((l) => /'[\w.-]+':\{n:/.test(l) && l.includes('pi:'));
    } else if (engine.isGpu) {
      startIdx = lines.findIndex((l) => /'[\w.-]+':\{n:/.test(l) && l.includes('sm:'));
    } else if (engine.isTrainingGpu) {
      startIdx = lines.findIndex((l) => /'[\w.-]+':\{hr:/.test(l) && l.includes('n:'));
    } else if (engine.isTrainingModel) {
      startIdx = lines.findIndex((l) => /'[\w.-]+':\{(h200|h100|a100):/.test(l));
    } else {
      // Standard LLM (claude/gemini/deepseek)
      startIdx = lines.findIndex((l) => /'[\w.-]+':\{i:/.test(l) && l.includes('o:'));
    }
  }
  if (startIdx < 0) return null;

  const newLines = [
    ...lines.slice(0, startIdx),
    newTable,
    '',
    ...lines.slice(endIdx),
  ];
  return newLines.join('\n');
}

// ============================================================
// Main
// ============================================================
console.log('[codegen-customfn] ' + (CHECK_MODE ? 'Checking' : 'Regenerating') + ' customFn data tables from PRICING...');

let driftCount = 0;
let writeCount = 0;

for (const engine of ENGINES) {
  const fp = path.join(ROOT, 'src', 'engines', engine.file);
  const newContent = engine.custom
    ? buildComparisonTableContent(fp)
    : buildTableContent(fp, engine);

  if (newContent == null) {
    console.log(`  ⚠ ${engine.file}: markers not found (skipped)`);
    continue;
  }

  const current = fs.readFileSync(fp, 'utf8');
  const hasDrift = current !== newContent;

  if (CHECK_MODE) {
    if (hasDrift) {
      console.error(`  ✗ ${engine.file}: drift detected`);
      driftCount++;
    } else {
      console.log(`  ✓ ${engine.file}`);
    }
  } else {
    if (hasDrift) {
      fs.writeFileSync(fp, newContent);
      writeCount++;
    }
    // Count for the tag
    let count;
    if (engine.isImage) count = Object.keys(PRICING.image.providers).length;
    else if (engine.isGpu) count = Object.keys(PRICING.gpu.providers).length;
    else if (engine.isTrainingGpu) count = Object.keys(PRICING.training.gpuTypes).length;
    else if (engine.isTrainingModel) count = Object.keys(PRICING.training.modelSizes).length;
    else if (engine.custom) {
      const totalModels = Object.values(PRICING.llm).reduce((s, p) => s + Object.keys(p.models).length, 0);
      const filtered = engine.popularKeys
        ? Object.values(engine.popularKeys).reduce((s, arr) => s + arr.length, 0)
        : totalModels;
      console.log(`  ✓ ${engine.file} (${filtered}/${totalModels} popular)`);
      continue;
    } else count = Object.keys(PRICING.llm[engine.provider].models).length;
    const filtered = engine.popularKeys && Array.isArray(engine.popularKeys)
      ? engine.popularKeys.length
      : count;
    const tag = engine.popularKeys ? ` (${filtered}/${count} popular)` : ` (${count})`;
    console.log(`  ${hasDrift ? '✓' : ' '} ${engine.file}${tag}`);
  }
}

if (CHECK_MODE) {
  if (driftCount > 0) {
    console.error(`\n[codegen-customfn] ✗ ${driftCount} engine(s) have drift. Re-run without --check to update.`);
    process.exit(1);
  } else {
    console.log(`\n[codegen-customfn] ✓ No drift detected.`);
    process.exit(0);
  }
} else {
  console.log(`\n[codegen-customfn] Done. ${writeCount} engine(s) updated.`);
  process.exit(0);
}
