#!/usr/bin/env node
// scripts/codegen-customfn.mjs
// Regenerate the data table section of customFn for each engine from PRICING.
// Each engine has a config that maps JSON field names to customFn field names.
// Run after sync-pricing.mjs to keep client-side data fresh.
//
// Note: this only regenerates the data table. The customFn's logic (the
// part AFTER the data table) is left untouched.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PRICING_PATH = path.join(ROOT, 'src', 'data', 'ai-pricing.json');

const PRICING = JSON.parse(fs.readFileSync(PRICING_PATH, 'utf8'));

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

function replaceComparisonTable(filePath) {
  let c = fs.readFileSync(filePath, 'utf8');

  // Generate new provider data, with `var P={` opening line
  const providerKeys = Object.keys(PRICING.llm);
  const providerLines = ['  "var P={" +'];
  providerKeys.forEach((pk, idx) => {
    const pv = PRICING.llm[pk];
    const sorted = Object.entries(pv.models).sort(([, a], [, b]) => (a.order || 99) - (b.order || 99));
    const modelParts = sorted.map(([mk, mv]) => `{k:'${mk}',n:'${mv.name.replace(/'/g, "\\'")}',i:${fmt(mv.input)},o:${fmt(mv.output)},cw:'${mv.contextWindow}'}`);
    const modelStr = modelParts.join(',');
    const isLast = idx === providerKeys.length - 1;
    const tail = isLast ? ']}};" +' : ']}," +';
    providerLines.push(`  "${pk}:{n:'${pv.name}',m:[${modelStr}${tail}`);
  });
  const newBlock = providerLines.join('\n');

  // Find the first provider line. Two patterns to handle:
  //   1. "var P={openai:{...}}" + (inline, all on one line)
  //   2. "openai:{...}" + (one provider per line)
  const lines = c.split('\n');
  const startIdx = lines.findIndex((l) =>
    /^\s*"(var P=\{openai:|(openai|anthropic|google|deepseek|azure|aws):\{)/.test(l)
  );
  // endIdx must be AFTER startIdx — the file has a `// Provider initials + colors` comment
  // at the top (outside customFn) AND inside customFn. We want the second one.
  const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('Provider initials + colors'));

  if (startIdx < 0 || endIdx < 0) {
    console.log(`  ⚠ ai-api-cost-comparison.ts: markers not found (start=${startIdx}, end=${endIdx})`);
    return false;
  }

  // Replace lines [startIdx, endIdx) with the new block (no trailing blank line —
  // the next string in the customFn concat is on the very next line)
  const newLines = [
    ...lines.slice(0, startIdx),
    newBlock,
    ...lines.slice(endIdx),
  ];
  c = newLines.join('\n');
  fs.writeFileSync(filePath, c);
  return true;
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

  const sorted = entries.sort(([, a], [, b]) => (a.order || 99) - (b.order || 99));

  // Openai format: M['key']={...};
  // Other format: 'key':{...},
  // Only openai needs the declaration prepended (it uses var M={}; inline);
  // Others have separate declaration lines that we preserve.
  if (engine.file === 'openai-token-calculator.ts') {
    const lines = sorted.map(([k, m]) => `  "M['${k}']={${engine.fieldMap(m, k)}};" +`).join('\n');
    return '  "var M={};" +\n' + lines;
  } else {
    // All other engines: just the data lines, no declaration
    const lines = sorted.map(([k, m], i) => {
      const sep = i === sorted.length - 1 ? '' : ',';
      return `  "'${k}':{${engine.fieldMap(m, k)}}${sep}" +`;
    }).join('\n');
    return lines;
  }
}

function replaceTable(filePath, engine) {
  let c = fs.readFileSync(filePath, 'utf8');
  const newTable = generateTable(engine);

  // Find any line that's a model data line OR the declaration line. Replace the
  // entire data block with the new generated content.
  // The block starts at the declaration line (or the first model line if missing)
  // and ends just before the tableEndMarker (or "// Family icons" / "var FL=" / "var FI=").
  const lines = c.split('\n');

  // Find end marker
  let endIdx = lines.findIndex((l) => l.includes(engine.tableEndMarker));
  if (endIdx < 0) {
    console.log(`  ⚠ ${engine.file}: end marker not found (${engine.tableEndMarker})`);
    return false;
  }

  // Find start: the declaration line, or if not found, the first model data line.
  // For LLM engines: lines have 'i:' and 'o:' fields.
  // For image engine: lines have 'pi:' and 'n:'.
  // For gpu engine: lines have 'sm:' and 'rm:'.
  // For training gpu: lines have 'hr:' and 'n:'.
  // For training model: lines have 'h200:' or 'h100:' etc.
  let startIdx;
  if (engine.file === 'openai-token-calculator.ts') {
    startIdx = lines.findIndex((l) => l.includes("M['") && l.includes('i:') && l.includes('o:'));
  } else if (engine.isImage) {
    // 'dalle-4':{n:...,pi:...,is:...,...}
    startIdx = lines.findIndex((l) => /'[\w-]+':\{n:/.test(l) && l.includes('pi:'));
  } else if (engine.isGpu) {
    // 'runpod':{n:...,sm:...,rm:...,...}
    startIdx = lines.findIndex((l) => /'[\w-]+':\{n:/.test(l) && l.includes('sm:'));
  } else if (engine.isTrainingGpu) {
    // 'H200-141GB':{hr:...,n:...,...}
    startIdx = lines.findIndex((l) => /'[\w-]+':\{hr:/.test(l) && l.includes('n:'));
  } else if (engine.isTrainingModel) {
    // '7B':{h200:...,h100:...,...}
    startIdx = lines.findIndex((l) => /'[\w-]+':\{(h200|h100|a100):/.test(l));
  } else {
    // Standard LLM (claude/gemini/deepseek)
    startIdx = lines.findIndex((l) => /'[\w-]+':\{i:/.test(l) && l.includes('o:'));
  }
  if (startIdx < 0) {
    console.log(`  ⚠ ${engine.file}: could not find model data start`);
    return false;
  }

  const newLines = [
    ...lines.slice(0, startIdx),
    newTable,
    '',
    ...lines.slice(endIdx),
  ];
  c = newLines.join('\n');
  fs.writeFileSync(filePath, c);
  return true;
}

console.log('[codegen-customfn] Regenerating customFn data tables from PRICING...');
let totalUpdated = 0;
for (const engine of ENGINES) {
  const fp = path.join(ROOT, 'src', 'engines', engine.file);
  if (engine.custom && engine.file === 'ai-api-cost-comparison.ts') {
    if (replaceComparisonTable(fp)) {
      const totalModels = Object.values(PRICING.llm).reduce((s, p) => s + Object.keys(p.models).length, 0);
      console.log(`  ✓ ${engine.file} (${totalModels} models across ${Object.keys(PRICING.llm).length} providers)`);
      totalUpdated++;
    }
  } else if (replaceTable(fp, engine)) {
    // Count entries based on which data source
    let count;
    if (engine.isImage) count = Object.keys(PRICING.image.providers).length;
    else if (engine.isGpu) count = Object.keys(PRICING.gpu.providers).length;
    else if (engine.isTrainingGpu) count = Object.keys(PRICING.training.gpuTypes).length;
    else if (engine.isTrainingModel) count = Object.keys(PRICING.training.modelSizes).length;
    else count = Object.keys(PRICING.llm[engine.provider].models).length;
    console.log(`  ✓ ${engine.file} (${count} entries)`);
    totalUpdated++;
  }
}
console.log(`[codegen-customfn] Done. ${totalUpdated} engines updated.`);
