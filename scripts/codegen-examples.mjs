#!/usr/bin/env node
// scripts/codegen-examples.mjs
// Regenerate staticExamples[0] for the 16 engines (8 AI cost + 8 business)
// by calling their calculate() function with default inputs.
//
// Run after codegen-customfn.mjs (which is run after sync-pricing.mjs).
// The full chain: pnpm sync = sync-pricing → codegen-customfn → codegen-examples → build.
// Manual run for business-engine updates: `node scripts/codegen-examples.mjs` (no prereq).
//
// Uses tsx to load TypeScript engines at codegen time.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// Engines + their default inputs (must match what the user sees when they first
// open the page with no interaction). These were chosen to be representative
// of typical use — a single preset worth of data.
const ENGINES = [
  { file: 'openai-token-calculator.ts',         slug: 'solopreneur-openai-token-calculator',         defaultInputs: { models: 'gpt-5-mini,gpt-5.5,gpt-4.1', inputTokens: '1000', outputTokens: '500', requestsPerDay: '100', pricingMode: 'realtime', cacheHitRate: '0', growthRate: '0' } },
  { file: 'claude-api-cost-calculator.ts',      slug: 'solopreneur-claude-api-cost-calculator',      defaultInputs: { models: 'claude-sonnet-4-6,claude-haiku-4-5,claude-fable-5', inputTokens: '1000', outputTokens: '500', requestsPerDay: '100', pricingMode: 'realtime', cacheHitRate: '0', growthRate: '0' } },
  { file: 'gemini-api-cost-calculator.ts',      slug: 'solopreneur-gemini-api-cost-calculator',      defaultInputs: { models: 'gemini-3.5-flash,gemini-3.1-pro', inputTokens: '1000', outputTokens: '500', requestsPerDay: '100', pricingMode: 'realtime', cacheHitRate: '0', growthRate: '0' } },
  { file: 'deepseek-api-cost-calculator.ts',    slug: 'solopreneur-deepseek-api-cost-calculator',    defaultInputs: { models: 'deepseek-v4-flash,deepseek-v4-pro-promo', inputTokens: '1000', outputTokens: '500', requestsPerDay: '100', pricingMode: 'realtime', cacheHitRate: '0', growthRate: '0' } },
  { file: 'ai-api-cost-comparison.ts',          slug: 'solopreneur-ai-api-cost-comparison',          defaultInputs: { models: 'gpt-5-mini,claude-sonnet-4-6,gemini-3.5-flash,deepseek-v4-flash', inputTokens: '1000', outputTokens: '500', requestsPerDay: '100' } },
  { file: 'ai-image-generation-cost-calculator.ts', slug: 'solopreneur-ai-image-cost-calculator', defaultInputs: { provider: 'dalle-3', imagesPerMonth: '100', resolution: '1024×1024', batchSize: '1', advancedMode: 'standard' } },
  { file: 'gpu-cloud-cost-calculator.ts',       slug: 'solopreneur-gpu-cloud-cost-calculator',       defaultInputs: { provider: 'runpod', gpuType: 'A100', gpuCount: '1', hoursPerDay: '8', pricingTier: 'on-demand', includeStorage: 'yes' } },
  { file: 'ai-training-cost-estimator.ts',      slug: 'solopreneur-ai-training-cost-estimator',      defaultInputs: { gpuType: 'A100-80GB', modelSize: '7B', gpuCount: '8', trainingHours: '24', epochs: '3', cloudStorage: '500', dataProcessCost: '1000' } },
  { file: 'unit-economics-calculator.ts',       slug: 'solopreneur-unit-economics-calculator',       defaultInputs: { averageRevenuePerCustomer: '100', expansionRevenuePerCustomer: '30', costToServePerCustomer: '30', customerAcquisitionCost: '300', monthlyChurnRate: '5', retentionMonths: '0' } },
  { file: 'churn-rate-calculator.ts',          slug: 'solopreneur-churn-rate-calculator',          defaultInputs: { startCustomers: '1000', endCustomers: '920', months: '12' } },
  { file: 'ltv-calculator.ts',                 slug: 'solopreneur-ltv-calculator',                 defaultInputs: { monthlyRevenuePerUser: '100', grossMargin: '70', monthlyChurn: '5', customerAcquisitionCost: '300' } },
  { file: 'cac-calculator.ts',                 slug: 'solopreneur-cac-calculator',                 defaultInputs: { marketingSpend: '5000', salesSpend: '3000', newCustomers: '100' } },
  { file: 'burn-rate-calculator.ts',           slug: 'solopreneur-burn-rate-calculator',           defaultInputs: { currentCash: '500000', monthlyRevenue: '20000', monthlyExpenses: '60000' } },
  { file: 'break-even-calculator.ts',          slug: 'solopreneur-break-even-calculator',          defaultInputs: { fixedCosts: '10000', pricePerUnit: '50', variableCostPerUnit: '20' } },
  { file: 'market-size-estimator.ts',          slug: 'solopreneur-market-size-estimator',          defaultInputs: { totalPopulation: '10000000', targetPercentage: '10', penetrationRate: '5', avgRevenuePerCustomer: '100' } },
  { file: 'saas-valuation-calculator.ts',      slug: 'solopreneur-saas-valuation-calculator',      defaultInputs: { arr: '1000000', growthRate: '100', grossMargin: '80', multiple: '10' } },
  { file: 'freelance-tax-calculator.ts',       slug: 'solopreneur-freelance-tax-calculator',        defaultInputs: { annualIncome: '100000', businessExpenses: '15000', retirementContribution: '10000', filingStatus: 'single', stateTaxRate: '5', country: 'us' } },
  { file: 'saas-pricing-planner.ts',           slug: 'solopreneur-saas-pricing-planner',            defaultInputs: { productType: 'SaaS', targetCustomer: 'b2b', competitorPrice: '29' } },
  { file: 'employee-cost-calculator.ts',       slug: 'solopreneur-employee-cost-calculator',        defaultInputs: { annualSalary: '80000', benefitsPercentage: '30', location: 'us' } },
  { file: 'meeting-cost-calculator.ts',        slug: 'solopreneur-meeting-cost-calculator',         defaultInputs: { attendees: '6', avgHourlyRate: '75', meetingMinutes: '30', meetingsPerWeek: '1' } },
  { file: 'time-value-calculator.ts',          slug: 'solopreneur-time-value-calculator',           defaultInputs: { annualIncome: '100000', hoursPerWeek: '40', weeksPerYear: '48' } },
  { file: 'freelance-rate-calculator.ts',      slug: 'solopreneur-freelance-rate-calculator',       defaultInputs: { annualIncome: '80000', expenses: '10000', billableHrs: '1200', profit: '20000' } },
];

// Generate a tsx script that imports each engine, calls generate(), and prints
// the result as a JSON array. We use tsx to handle TypeScript on-the-fly.
function buildRunnerScript() {
  const lines = [
    "import { getEngine } from '../src/core/engines/registry.ts';",
    "import PRICING from '../src/data/ai-pricing.json';",
    "",
    "async function main() {",
    "  const results: Record<string, string[]> = {};",
    "",
  ];
  for (const { file, slug, defaultInputs } of ENGINES) {
    lines.push(`  // ${file}`);
    lines.push(`  await import('../src/engines/${file.replace(/\.ts$/, '.ts')}');`);
    lines.push(`  {`);
    lines.push(`    const engine = getEngine('${slug}');`);
    lines.push(`    if (!engine) { console.error('No engine registered for ${slug}'); process.exit(1); }`);
    lines.push(`    results['${slug}'] = engine.generate(${JSON.stringify(defaultInputs)});`);
    lines.push(`  }`);
    lines.push("");
  }
  lines.push("  process.stdout.write(JSON.stringify(results));");
  lines.push("}");
  lines.push("main().catch(e => { console.error(e); process.exit(1); });");
  return lines.join("\n");
}

const runnerPath = path.join(ROOT, 'scripts', '_runner-codegen-examples.ts');
fs.writeFileSync(runnerPath, buildRunnerScript(), 'utf8');

console.log('[codegen-examples] Running calculate() for 8 engines via tsx...');
const result = spawnSync('npx.cmd', ['tsx', runnerPath], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 50 * 1024 * 1024, // 50MB — output can be large
  shell: true,
});

if (result.status !== 0) {
  console.error('[codegen-examples] tsx failed:');
  console.error('stdout:', result.stdout);
  console.error('stderr:', result.stderr);
  console.error('error:', result.error);
  process.exit(1);
}

const results = JSON.parse(result.stdout);
console.log(`[codegen-examples] Got results for ${Object.keys(results).length} engines.`);

// Update each engine's staticExamples[0]
let totalUpdated = 0;
for (const { file, slug } of ENGINES) {
  const fp = path.join(ROOT, 'src', 'engines', file);
  let c = fs.readFileSync(fp, 'utf8');
  const newExample = results[slug];
  if (!newExample || newExample.length === 0) {
    console.log(`  ⚠ ${file}: no output from generate()`);
    continue;
  }

  // Build the first staticExample as a single multi-line string.
  // Strip the leading "📅 Pricing last updated:" + empty line (UI badge covers it).
  const lines = newExample.filter((l) => !l.startsWith('📅 Pricing last updated:'));
  const firstLine = lines.join('\n');

  // Find staticExamples: [ ... ] and replace its first element.
  // Handle both single-quoted strings and backtick template strings.
  const marker = 'staticExamples: [';
  const startIdx = c.indexOf(marker);
  if (startIdx < 0) {
    console.log(`  ⚠ ${file}: staticExamples marker not found`);
    continue;
  }

  // Find the opening quote of the first element, skipping whitespace AND comments
  let i = startIdx + marker.length;
  while (i < c.length) {
    // Skip whitespace
    while (i < c.length && /\s/.test(c[i])) i++;
    // Skip line comments
    if (c[i] === '/' && c[i + 1] === '/') {
      while (i < c.length && c[i] !== '\n') i++;
      continue;
    }
    break;
  }
  const openQuote = c[i];
  if (openQuote !== "'" && openQuote !== '`' && openQuote !== '"') {
    console.log(`  ⚠ ${file}: first element not a string (found '${openQuote}')`);
    continue;
  }
  const closeQuote = openQuote;
  // Find the end of the first string (unescaped closing quote)
  let j = i + 1;
  while (j < c.length) {
    if (c[j] === '\\') { j += 2; continue; } // skip escaped char
    if (c[j] === closeQuote) break;
    j++;
  }
  if (c[j] !== closeQuote) {
    console.log(`  ⚠ ${file}: could not find end of first staticExample string`);
    continue;
  }

  // If the first string is followed by `+` (string concatenation for multi-line
  // elements), keep scanning past additional '...' + segments until we hit the
  // comma that ends the element. This handles both single-line strings and
  // multi-line template literals.
  let k = j + 1;
  while (k < c.length) {
    while (k < c.length && /\s/.test(c[k])) k++;
    if (c[k] === '+') {
      // Skip the `+` and any whitespace, then expect another string
      k++;
      while (k < c.length && /\s/.test(c[k])) k++;
      if (c[k] !== openQuote) {
        console.log(`  ⚠ ${file}: expected string after + in element`);
        k = j;
        break;
      }
      // Find end of this concatenated string
      j = k + 1;
      while (j < c.length) {
        if (c[j] === '\\') { j += 2; continue; }
        if (c[j] === closeQuote) break;
        j++;
      }
      k = j + 1;
    } else {
      break;
    }
  }

  // Serialize the new first example as a JS string literal
  const newStr = firstLine.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  c = c.slice(0, i) + "'" + newStr + "'" + c.slice(j + 1);
  fs.writeFileSync(fp, c);
  console.log(`  ✓ ${file} (${firstLine.length} chars, ${newExample.length} lines)`);
  totalUpdated++;
}

// Clean up runner script
try { fs.unlinkSync(runnerPath); } catch {}

console.log(`[codegen-examples] Done. ${totalUpdated} engines updated.`);
