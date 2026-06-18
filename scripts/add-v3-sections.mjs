#!/usr/bin/env node
// scripts/add-v3-sections.mjs
// Add 🩺 Cost Health + 🔄 What-If Scenarios sections to AI cost engines.
// Idempotent: if sections already exist, skip.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function v3Block(engineName, varNames) {
  const v = varNames;
  return `  // 🩺 Cost Health (v3)
  out.push('');
  out.push('🩺 Cost Health:');
  out.push(${v.sep}.repeat(60));
  const totalSelectedMonthly = ${v.selectedCosts}.reduce((s, c) => s + c.monthlyCost, 0);
  const cheapestSelected = ${v.selectedCosts}.reduce((min, c) => c.monthlyCost < min.monthlyCost ? c : min);
  const expensiveSelected = ${v.selectedCosts}.reduce((max, c) => c.monthlyCost > max.monthlyCost ? c : max);
  if (${v.selectedCosts}.length >= 2) {
    const ratio = expensiveSelected.monthlyCost / Math.max(cheapestSelected.monthlyCost, 0.01);
    if (ratio >= 50) out.push('• 🔴 Your most expensive selection costs ' + ratio.toFixed(0) + 'x your cheapest — consider mixing tiers.');
    else if (ratio >= 10) out.push('• 🟠 ' + ratio.toFixed(0) + 'x cost spread across selected models — review if every model needs to be premium.');
    else out.push('• 🟢 Healthy cost spread (' + ratio.toFixed(1) + 'x) across selected models.');
  }
  if (cheapestSelected) {
    const tier = cheapestSelected.monthlyCost < 5 ? '🟢 Micro-tier (under $5/mo)' : cheapestSelected.monthlyCost < 50 ? '🟢 Low-volume tier' : cheapestSelected.monthlyCost < 500 ? '🟡 Mid-volume tier' : '🟠 High-volume tier';
    out.push('• ' + tier + ' — ' + cheapestSelected.info.name + ' at ' + ${v.fmt}(cheapestSelected.monthlyCost) + '/mo.');
  }
${v.hasCache ? `  if (${v.cacheHitRate} === 0) {
    out.push('• ⚠️ Cache hit rate is 0% — enabling prompt caching on repeated prefixes can cut cost 40-90%.');
  } else if (${v.cacheHitRate} < 30) {
    out.push('• 🟡 Low cache hit rate (' + ${v.cacheHitRate} + '%) — review if your prompt has stable system instructions.');
  } else {
    out.push('• 🟢 Healthy cache rate (' + ${v.cacheHitRate} + '%) — keep an eye on cache TTL vs your traffic pattern.');
  }` : `  out.push('• ℹ️ This provider does not offer prompt caching — consider switching to Anthropic/OpenAI for cache savings.');`}
  if (${v.pricingMode || "'realtime'"} === 'realtime') {
    const batchSavings = totalSelectedMonthly * 0.5;
    out.push('• 💡 Switch to batch pricing: save ~' + ${v.fmt}(batchSavings) + '/mo (50% discount) if latency is not critical.');
  }
  out.push('');

  // 🔄 What-If Scenarios (v3)
  out.push('🔄 What-If Scenarios:');
  out.push(${v.sep}.repeat(60));
  const popularCheapest = ${v.allCosts}
    .reduce((min, c) => (c.info.input + c.info.output) < (min.info.input + min.info.output) ? c : min, ${v.allCosts}[0]);
  if (popularCheapest && popularCheapest.key !== cheapestSelected?.info.key) {
    const cpr = (${v.inTokens} / 1e6) * popularCheapest.info.input + (${v.outTokens} / 1e6) * popularCheapest.info.output;
    const newMonthly = cpr * ${v.reqPerDay} * 30;
    const savings = (cheapestSelected?.monthlyCost ?? 0) - newMonthly;
    if (savings > 0) out.push('• Switch cheapest to ' + popularCheapest.info.name + ':  save ' + ${v.fmt}(savings) + '/mo  (similar quality, much cheaper)');
  }
  out.push('• Double volume to ' + ${v.lc}(${v.reqPerDay} * 2) + ' reqs/day:  ' + ${v.fmt}(totalSelectedMonthly * 2) + '/mo');
  out.push('• Halve volume to ' + ${v.lc}(Math.max(1, Math.floor(${v.reqPerDay} / 2))) + ' reqs/day:  ' + ${v.fmt}(totalSelectedMonthly / 2) + '/mo');
${v.hasCache ? `  if (${v.cacheHitRate} < 50) {
    const cacheFactor = 0.5 + 0.5 * (1 - 0.5 * 0.9);
    const cachedMonthly = totalSelectedMonthly * cacheFactor;
    const cacheSavings = totalSelectedMonthly - cachedMonthly;
    out.push('• Boost cache hit rate to 50%:  save ~' + ${v.fmt}(cacheSavings) + '/mo  (' + ${v.fmt}(totalSelectedMonthly) + ' → ' + ${v.fmt}(cachedMonthly) + ')');
  }` : ''}
  out.push('');
`;
}

const ENGINES = [
  {
    file: 'gemini-api-cost-calculator.ts',
    varNames: { sep: 'SEP', selectedCosts: 'selectedCosts', allCosts: 'allCosts', inTokens: 'inTokens', outTokens: 'outTokens', reqPerDay: 'reqPerDay', fmt: 'fmt', lc: 'lc', pricingMode: 'pricingMode', hasCache: true, cacheHitRate: 'cacheHitRate' },
  },
  {
    file: 'deepseek-api-cost-calculator.ts',
    varNames: { sep: 'SEP', selectedCosts: 'selectedCosts', allCosts: 'allCosts', inTokens: 'inTokens', outTokens: 'outTokens', reqPerDay: 'reqPerDay', fmt: 'fmt', lc: 'lc', pricingMode: 'pricingMode', hasCache: false, cacheHitRate: null },
  },
];

for (const { file, varNames: v } of ENGINES) {
  const fp = path.join(ROOT, 'src', 'engines', file);
  let c = fs.readFileSync(fp, 'utf8');
  if (c.includes('🩺 Cost Health (v3)')) {
    console.log(`  ⊘ ${file}: v3 already present, skipping`);
    continue;
  }
  // Find `return out;` (last return in calculate) and insert v3 before it
  const idx = c.lastIndexOf('  return out;');
  if (idx < 0) {
    console.log(`  ⚠ ${file}: could not find 'return out;'`);
    continue;
  }
  const v3 = v3Block(file, v);
  c = c.slice(0, idx) + v3 + c.slice(idx);
  fs.writeFileSync(fp, c);
  console.log(`  ✓ ${file}`);
}
console.log('Done.');
