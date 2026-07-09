#!/usr/bin/env node
// scripts/codegen-examples.mjs
// Regenerate staticExamples[0] for the 32 engines (8 AI cost + 24 business)
// by calling their calculate() function with default inputs.
//
// Run after codegen-customfn.mjs (which is run after sync-pricing.mjs).
// The full chain: pnpm sync = sync-pricing → codegen-customfn → codegen-examples → build.
// Manual run for business-engine updates: `node scripts/codegen-examples.mjs` (no prereq).
//
// --check mode: run codegen and compare against existing staticExamples[0].
// Exits 1 if any engine has drift, 0 if all match. Use in CI / pre-commit
// to catch "calculate() changed but staticExamples not regenerated" bugs.
//
// Uses tsx to load TypeScript engines at codegen time.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CHECK_MODE = process.argv.includes('--check');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// Engines + their default inputs (must match what the user sees when they first
// open the page with no interaction). These were chosen to be representative
// of typical use — a single preset worth of data.
const ENGINES = [
  { file: 'openai-token-calculator.ts',         slug: 'solopreneur-openai-token-calculator',
    subdir: 'ai-cost',         defaultInputs: { models: 'gpt-5-mini,gpt-5.5,gpt-4.1', inputTokens: '1000', outputTokens: '500', requestsPerDay: '100', pricingMode: 'realtime', cacheHitRate: '0', growthRate: '0' } },
  { file: 'claude-api-cost-calculator.ts',      slug: 'solopreneur-claude-api-cost-calculator',
    subdir: 'ai-cost',      defaultInputs: { models: 'claude-sonnet-4-6,claude-haiku-4-5,claude-fable-5', inputTokens: '1000', outputTokens: '500', requestsPerDay: '100', pricingMode: 'realtime', cacheHitRate: '0', growthRate: '0' } },
  { file: 'gemini-api-cost-calculator.ts',      slug: 'solopreneur-gemini-api-cost-calculator',
    subdir: 'ai-cost',      defaultInputs: { models: 'gemini-3.5-flash,gemini-3.1-pro', inputTokens: '1000', outputTokens: '500', requestsPerDay: '100', pricingMode: 'realtime', cacheHitRate: '0', growthRate: '0' } },
  { file: 'deepseek-api-cost-calculator.ts',    slug: 'solopreneur-deepseek-api-cost-calculator',
    subdir: 'ai-cost',    defaultInputs: { models: 'deepseek-v4-flash,deepseek-v4-pro-promo', inputTokens: '1000', outputTokens: '500', requestsPerDay: '100', pricingMode: 'realtime', cacheHitRate: '0', growthRate: '0' } },
  { file: 'ai-api-cost-comparison.ts',          slug: 'solopreneur-ai-api-cost-comparison',
    subdir: 'ai-cost',          defaultInputs: { models: 'gpt-5-mini,claude-sonnet-4-6,gemini-3.5-flash,deepseek-v4-flash', inputTokens: '1000', outputTokens: '500', requestsPerDay: '100' } },
  { file: 'ai-image-generation-cost-calculator.ts', slug: 'solopreneur-ai-image-cost-calculator',
    subdir: 'ai-cost', defaultInputs: { provider: 'dalle-3', imagesPerMonth: '100', resolution: '1024×1024', batchSize: '1', advancedMode: 'standard' } },
  { file: 'gpu-cloud-cost-calculator.ts',       slug: 'solopreneur-gpu-cloud-cost-calculator',
    subdir: 'ai-cost',       defaultInputs: { provider: 'runpod', gpuType: 'A100', gpuCount: '1', hoursPerDay: '8', pricingTier: 'on-demand', includeStorage: 'yes' } },
  { file: 'ai-training-cost-estimator.ts',      slug: 'solopreneur-ai-training-cost-estimator',
    subdir: 'ai-cost',      defaultInputs: { gpuType: 'A100-80GB', modelSize: '7B', gpuCount: '8', trainingHours: '24', epochs: '3', cloudStorage: '500', dataProcessCost: '1000' } },
  { file: 'unit-economics-calculator.ts',       slug: 'solopreneur-unit-economics-calculator',
    subdir: 'valuation',       defaultInputs: { averageRevenuePerCustomer: '100', expansionRevenuePerCustomer: '30', costToServePerCustomer: '30', customerAcquisitionCost: '300', monthlyChurnRate: '5', retentionMonths: '0' } },
  { file: 'churn-rate-calculator.ts',          slug: 'solopreneur-churn-rate-calculator',
    subdir: 'saas',          defaultInputs: { startCustomers: '1000', endCustomers: '920', months: '12' } },
  { file: 'ltv-calculator.ts',                 slug: 'solopreneur-ltv-calculator',
    subdir: 'valuation',                 defaultInputs: { monthlyRevenuePerUser: '100', grossMargin: '70', monthlyChurn: '5', customerAcquisitionCost: '300' } },
  { file: 'mortgage-calculator.ts',           slug: 'solopreneur-mortgage-calculator',
    subdir: 'real-estate',           defaultInputs: { homePrice: '500000', downPayment: '100000', loanTermYears: '30', interestRate: '6.5' } },
  { file: 'rent-vs-buy-calculator.ts',       slug: 'solopreneur-rent-vs-buy-calculator',
    subdir: 'real-estate',       defaultInputs: { monthlyRent: '2000', homePrice: '500000', downPayment: '100000', mortgageRate: '6.5', yearsToStay: '7', annualAppreciation: '3', annualRentIncrease: '3' } },
  { file: 'cap-rate-calculator.ts',          slug: 'solopreneur-cap-rate-calculator',
    subdir: 'real-estate',          defaultInputs: { propertyValue: '500000', annualRentIncome: '36000', annualExpenses: '12000', vacancyRate: '5' } },
  { file: 'rental-yield-calculator.ts',      slug: 'solopreneur-rental-yield-calculator',
    subdir: 'real-estate',      defaultInputs: { purchasePrice: '300000', downPayment: '75000', loanAmount: '225000', interestRate: '7', loanTermYears: '30', monthlyRent: '2500', monthlyExpenses: '600', vacancyRate: '5', annualAppreciation: '3' } },
  { file: 'brrrr-calculator.ts',             slug: 'solopreneur-brrrr-calculator',
    subdir: 'real-estate',             defaultInputs: { purchasePrice: '150000', rehabCost: '30000', afterRepairValue: '220000', downPaymentPct: '25', interestRate: '7.5', loanTermYears: '30', monthlyRent: '1800', monthlyExpenses: '400', vacancyRate: '5', holdingMonths: '6', sellingCostsPct: '8' } },
  { file: 'dscr-calculator.ts',             slug: 'solopreneur-dscr-calculator',
    subdir: 'real-estate',             defaultInputs: { monthlyRent: '5000', monthlyExpenses: '1500', loanAmount: '400000', interestRate: '7.5', loanTermYears: '30', vacancyRate: '5' } },
  { file: 'cac-calculator.ts',                 slug: 'solopreneur-cac-calculator',
    subdir: 'valuation',                 defaultInputs: { marketingSpend: '5000', salesSpend: '3000', newCustomers: '100' } },
  { file: 'burn-rate-calculator.ts',           slug: 'solopreneur-burn-rate-calculator',
    subdir: 'saas',           defaultInputs: { currentCash: '500000', monthlyRevenue: '20000', monthlyExpenses: '60000' } },
  { file: 'break-even-calculator.ts',          slug: 'solopreneur-break-even-calculator',
    subdir: 'valuation',          defaultInputs: { fixedCosts: '10000', pricePerUnit: '50', variableCostPerUnit: '20' } },
  { file: 'market-size-estimator.ts',          slug: 'solopreneur-market-size-estimator',
    subdir: 'saas',          defaultInputs: { totalPopulation: '10000000', targetPercentage: '10', penetrationRate: '5', avgRevenuePerCustomer: '100' } },
  { file: 'saas-valuation-calculator.ts',      slug: 'solopreneur-saas-valuation-calculator',
    subdir: 'valuation',      defaultInputs: { arr: '1000000', growthRate: '100', grossMargin: '80', multiple: '10' } },
  { file: 'freelance-tax-calculator.ts',       slug: 'solopreneur-freelance-tax-calculator',
    subdir: 'investment',        defaultInputs: { annualIncome: '100000', businessExpenses: '15000', retirementContribution: '10000', filingStatus: 'single', stateTaxRate: '5', country: 'us' } },
  { file: 'saas-pricing-planner.ts',           slug: 'solopreneur-saas-pricing-planner',
    subdir: 'valuation',            defaultInputs: { productType: 'SaaS', targetCustomer: 'b2b', competitorPrice: '29' } },
  { file: 'employee-cost-calculator.ts',       slug: 'solopreneur-employee-cost-calculator',
    subdir: 'cost',        defaultInputs: { annualSalary: '80000', benefitsPercentage: '30', location: 'us' } },
  { file: 'meeting-cost-calculator.ts',        slug: 'solopreneur-meeting-cost-calculator',
    subdir: 'cost',         defaultInputs: { attendees: '6', avgHourlyRate: '75', meetingMinutes: '30', meetingsPerWeek: '1' } },
  { file: 'time-value-calculator.ts',          slug: 'solopreneur-time-value-calculator',
    subdir: 'investment',           defaultInputs: { annualIncome: '100000', hoursPerWeek: '40', weeksPerYear: '48' } },
  { file: 'freelance-rate-calculator.ts',      slug: 'solopreneur-freelance-rate-calculator',
    subdir: 'freelance',       defaultInputs: { annualIncome: '80000', expenses: '10000', billableHrs: '1200', profit: '20000' } },
  { file: 'sponsorship-rate-calculator.ts',    slug: 'solopreneur-sponsorship-rate-calculator',
    subdir: 'investment',     defaultInputs: { monthlyDownloads: '10000', emailSubscribers: '5000', socialFollowers: '15000', contentType: 'newsletter' } },
  { file: 'course-pricing-calculator.ts',      slug: 'solopreneur-course-pricing-calculator',
    subdir: 'valuation',       defaultInputs: { targetMonthlyIncome: '5000', estimatedBuyersPerMonth: '50', platformFee: '10' } },
  { file: 'equity-dilution-calculator.ts',     slug: 'solopreneur-equity-dilution-calculator',
    subdir: 'investment',      defaultInputs: { companyValuation: '5000000', investmentAmount: '1000000', founderShares: '10000000' } },
  { file: 'compound-interest-calculator.ts',  slug: 'solopreneur-compound-interest-calculator',
    subdir: 'investment',  defaultInputs: { principal: '10000', monthlyContribution: '500', annualRate: '7', compoundFrequency: 'monthly', years: '20' } },
  { file: 'project-profitability-calculator.ts', slug: 'solopreneur-project-profitability-calculator',
    subdir: 'valuation', defaultInputs: { projectRevenue: '5000', hoursEstimated: '40', hourlyCost: '50', materialCost: '200' } },
  { file: 'stripe-fee-calculator.ts', slug: 'solopreneur-stripe-fee-calculator',
    subdir: 'valuation', defaultInputs: { chargeAmount: '100', provider: 'stripe', monthlyTransactions: '100', internationalCards: 'no' } },
  { file: 'safe-convertible-note-calculator.ts', slug: 'solopreneur-safe-convertible-note-calculator',
    subdir: 'valuation', defaultInputs: { investmentAmount: '500000', postMoneyCap: '5000000', discountRate: '0', existingShares: '1000000', nextRoundValuation: '5000000' } },
  { file: 'burn-multiple-rule-of-40-calculator.ts', slug: 'solopreneur-burn-multiple-rule-of-40-calculator',
    subdir: 'valuation', defaultInputs: { revenueGrowth: '100', profitMargin: '-20', netBurn: '2000000', netNewARR: '1500000' } },
  { file: 'arr-multiple-valuation-calculator.ts', slug: 'solopreneur-arr-multiple-valuation-calculator',
    subdir: 'valuation', defaultInputs: { arr: '1000000', valuation: '15000000', growthRate: '50', profitMargin: '0' } },
  { file: 'remote-vs-office-calculator.ts', slug: 'solopreneur-remote-vs-office-calculator',
    subdir: 'cost', defaultInputs: { headcount: '10', avgSalary: '80000', officeOverheadPerPerson: '1500', remoteStipendPerPerson: '500', oneTimeSetupPerPerson: '3000', productivityDelta: '0' } },
  { file: 'affiliate-income-calculator.ts',    slug: 'solopreneur-affiliate-income-calculator',
    subdir: 'freelance',     defaultInputs: { monthlyTraffic: '50000', conversionRate: '2', avgCommission: '50', monthlyCost: '200' } },
  { file: 'email-list-revenue-calculator.ts',  slug: 'solopreneur-email-list-revenue-calculator',
    subdir: 'valuation',   defaultInputs: { subscriberCount: '10000', openRate: '25', clickRate: '5', conversionRate: '2', avgOrderValue: '50', emailsPerMonth: '4', unsubscribeRate: '0.5' } },
  { file: 'hourly-vs-fixed-calculator.ts',     slug: 'solopreneur-hourly-vs-fixed-calculator',
    subdir: 'freelance',      defaultInputs: { annualIncomeGoal: '100000', billableHoursPerWeek: '30', weeksOffPerYear: '4', annualExpenses: '5000' } },
  { file: 'productivity-score.ts',             slug: 'solopreneur-productivity-score',
    subdir: 'cost',              defaultInputs: { weeklyDeepWorkHours: '15', toolsUsed: '5', meetingsPerWeek: '3' } },
  { file: 'mrr-calculator.ts',                  slug: 'solopreneur-mrr-calculator',
    subdir: 'saas',                  defaultInputs: { subscriberCount: '500', monthlyPrice: '29', monthlyChurnRate: '3', expansionMRR: '800', newSubsPerMonth: '100', contractionMRR: '150', reactivationMRR: '100' } },
  { file: 'revenue-projector.ts',              slug: 'solopreneur-revenue-projector',
    subdir: 'saas',              defaultInputs: { currentMRR: '5000', monthlyGrowthRate: '8', monthlyChurnRate: '3', monthlyExpenses: '3000', cashOnHand: '60000', arpu: '25', customGrowthRate: '0', cac: '200', months: '12' } },
  { file: 'roas-calculator.ts',                slug: 'solopreneur-roas-calculator',
    subdir: 'marketing',             defaultInputs: { adSpend: '5000', revenue: '20000', grossMargin: '60', attributionWindow: '28d' } },
  { file: 'ltv-by-channel-calculator.ts',      slug: 'solopreneur-ltv-by-channel-calculator',
    subdir: 'marketing',        defaultInputs: { ch1_spend: '1000', ch1_conv: '50', ch1_ltv: '500', ch2_spend: '1500', ch2_conv: '30', ch2_ltv: '800', ch3_spend: '800', ch3_conv: '20', ch3_ltv: '600', ch4_spend: '1200', ch4_conv: '40', ch4_ltv: '400', ch5_spend: '600', ch5_conv: '15', ch5_ltv: '700' } },
  { file: 'funnel-value-calculator.ts',          slug: 'solopreneur-funnel-value-calculator',
    subdir: 'marketing',          defaultInputs: { impressions: '100000', ctr: '2.5', leadRate: '15', saleRate: '5', aov: '80', grossMargin: '70' } },
  { file: 'cohort-retention-calculator.ts',      slug: 'solopreneur-cohort-retention-calculator',
    subdir: 'marketing',      defaultInputs: { cohortSize: '1000', m1Retention: '80', m2Retention: '60', m3Retention: '45', m6Retention: '30', m12Retention: '20', revenuePerUser: '30' } },
  { file: 'email-campaign-roi-calculator.ts',     slug: 'solopreneur-email-campaign-roi-calculator',
    subdir: 'marketing',     defaultInputs: { listSize: '10000', openRate: '25', ctr: '5', aovPerClick: '25', campaignCost: '500', numEmails: '4' } },
  { file: 'content-marketing-roi-calculator.ts',  slug: 'solopreneur-content-marketing-roi-calculator',
    subdir: 'marketing',  defaultInputs: { monthlyPieces: '8', monthsToRank: '6', peakMonthlyTraffic: '5000', conversionRate: '2', aov: '80', monthlyContentCost: '2000', attributionModel: 'last-touch' } },
  { file: 'inventory-turnover-calculator.ts',    slug: 'solopreneur-inventory-turnover-calculator',
    subdir: 'operations',   defaultInputs: { annualCOGS: '240000', avgInventory: '40000', periodDays: '365', industry: 'general' } },
  { file: 'carrying-cost-calculator.ts',         slug: 'solopreneur-carrying-cost-calculator',
    subdir: 'operations',         defaultInputs: { avgInventoryValue: '50000', storageRate: '8', insuranceRate: '1.5', shrinkageRate: '2', oppCostRate: '8', otherCostsPct: '2' } },
  { file: 'stockout-cost-calculator.ts',         slug: 'solopreneur-stockout-cost-calculator',
    subdir: 'operations',         defaultInputs: { lostSalesPerDay: '1000', avgStockoutDays: '5', lostCustomerRate: '30', customerLTV: '200', annualRevenue: '600000', recoveryRate: '10' } },
  { file: 'reorder-point-calculator.ts',         slug: 'solopreneur-reorder-point-calculator',
    subdir: 'operations',         defaultInputs: { avgDailyDemand: '50', leadTimeDays: '14', serviceLevel: '95', demandStdDev: '10', reviewPeriod: '7' } },
  { file: 'fulfillment-cost-calculator.ts',      slug: 'solopreneur-fulfillment-cost-calculator',
    subdir: 'operations',      defaultInputs: { ordersPerMonth: '500', pickMin: '3', packMin: '2', shippingCost: '5.50', packagingCost: '1.20', laborRate: '18', returnRate: '8' } },
  { file: 'supplier-scorecard-calculator.ts',    slug: 'solopreneur-supplier-scorecard-calculator',
    subdir: 'operations',    defaultInputs: { onTimePct: '88', defectRatePct: '2.5', leadVarianceDays: '3', costVariancePct: '5', weightPreset: 'balanced' } },
  { file: 'pipeline-value-calculator.ts',         slug: 'solopreneur-pipeline-value-calculator',
    subdir: 'sales',         defaultInputs: { discoveryCount: '10', discoverySize: '15000', proposalCount: '5', proposalSize: '25000', negotiationCount: '3', negotiationSize: '35000', closingCount: '2', closingSize: '45000' } },
  { file: 'sales-velocity-calculator.ts',           slug: 'solopreneur-sales-velocity-calculator',
    subdir: 'sales',           defaultInputs: { openOpps: '20', avgDealSize: '25000', winRate: '25', cycleDays: '45' } },
  { file: 'acv-calculator.ts',                      slug: 'solopreneur-acv-calculator',
    subdir: 'sales',                      defaultInputs: { totalContractValue: '300000', contractLength: '12', numCustomers: '12', expansionRate: '10' } },
  { file: 'win-rate-by-stage-calculator.ts',       slug: 'solopreneur-win-rate-by-stage-calculator',
    subdir: 'sales',       defaultInputs: { sqlEntered: '100', sqlAdvanced: '50', oppEntered: '50', oppAdvanced: '30', proposalEntered: '30', proposalAdvanced: '20', negEntered: '20', negAdvanced: '15' } },
  { file: 'quota-attainment-calculator.ts',         slug: 'solopreneur-quota-attainment-calculator',
    subdir: 'sales',         defaultInputs: { annualQuota: '1000000', monthsElapsed: '6', actualRevenue: '400000' } },
  { file: 'pipeline-coverage-calculator.ts',         slug: 'solopreneur-pipeline-coverage-calculator',
    subdir: 'sales',         defaultInputs: { quotaTarget: '1000000', pipelineValue: '1500000', winRate: '25' } },
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
  for (const { file, slug, subdir, defaultInputs } of ENGINES) {
    lines.push(`  // ${file}`);
    lines.push(`  await import('../src/engines/${subdir}/${file.replace(/\.ts$/, '.ts')}');`);
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
const tsxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(tsxBin, ['tsx', runnerPath], {
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
  try { fs.unlinkSync(runnerPath); } catch {}
  process.exit(1);
}

const results = JSON.parse(result.stdout);
console.log(`[codegen-examples] Got results for ${Object.keys(results).length} engines.`);

// Update each engine's staticExamples[0]
let totalUpdated = 0;
const driftedFiles = [];
for (const { file, slug, subdir } of ENGINES) {
  const fp = path.join(ROOT, 'src', 'engines', subdir, file);
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
  const currentStr = c.slice(i + 1, j);

  if (CHECK_MODE) {
    // --check mode: compare current vs. regenerated; report drift, exit 1 if any.
    if (currentStr === newStr) {
      console.log(`  ✓ ${file}: in sync`);
    } else {
      console.error(`  ✗ ${file}: DRIFT detected (${currentStr.length} chars current vs ${newStr.length} chars regenerated)`);
      console.error(`    Run: node scripts/codegen-examples.mjs (without --check) to fix`);
      driftedFiles.push(file);
    }
  } else {
    c = c.slice(0, i) + "'" + newStr + "'" + c.slice(j + 1);
    fs.writeFileSync(fp, c);
    console.log(`  ✓ ${file} (${firstLine.length} chars, ${newExample.length} lines)`);
    totalUpdated++;
  }
}

// --check mode: exit 1 if any drift was detected, so CI / pre-commit can catch it.
if (CHECK_MODE) {
  try { fs.unlinkSync(runnerPath); } catch {} // cleanup before exit
  if (driftedFiles.length > 0) {
    console.error(`\n[codegen-examples] --check FAILED: ${driftedFiles.length} engine(s) have drifted staticExamples[0]:`);
    for (const f of driftedFiles) console.error(`  - ${f}`);
    console.error(`\nFix: run \`node scripts/codegen-examples.mjs\` to regenerate, then commit.`);
    process.exit(1);
  }

  // Sanity check: regenerated output should not contain literal escape sequences
  // that should have been decoded. This catches bugs where generate() emits
  // e.g. "you\\'re" (literal backslash + apostrophe) instead of "you're", or
  // emits \\uXXXX instead of the actual unicode character. Both sides of the
  // drift check could otherwise agree on a broken escape chain.
  const LITERAL_ESCAPE_RE = /\\\\'|\\u[0-9a-fA-F]{4}/;
  const corruptedFiles = [];
  for (const { file, slug } of ENGINES) {
    const out = results[slug] || [];
    const joined = out.join('\n');
    if (LITERAL_ESCAPE_RE.test(joined)) {
      const match = joined.match(LITERAL_ESCAPE_RE);
      corruptedFiles.push({ file, slug, sample: match ? match[0] : '' });
    }
  }
  if (corruptedFiles.length > 0) {
    console.error(`\n[codegen-examples] --check FAILED: ${corruptedFiles.length} engine(s) emit literal escape sequences (likely unescaped apostrophes or unicode):`);
    for (const { file, slug, sample } of corruptedFiles) {
      console.error(`  - ${file} (${slug}): found "${sample}" in output`);
    }
    console.error(`\nFix: in each affected engine, replace literal \\' or \\uXXXX with their decoded characters in generate().`);
    process.exit(1);
  }

  // Sanity check: each engine's customFn must parse as valid JS, because
  // [slug].astro calls `new Function('inputs','pick','fill', config.customFn)`
  // at page-load. If customFn is malformed, the page's custom-mode interaction
  // (fill inputs → Generate) silently fails (page still renders staticExamples[0]
  // server-side but the dynamic result never computes).
  //
  // Extract the customFn body the same way as tests/scripts/test-customFn.mjs,
  // then try to construct the function. Surface any parse failures.
  function extractCustomFnBody(src) {
    const start = src.indexOf('const customFn');
    if (start < 0) return null;
    let i = src.indexOf('"', start);
    if (i < 0) return null;
    const parts = [];
    while (i < src.length && src[i] === '"') {
      let j = i + 1;
      let cur = '';
      while (j < src.length && src[j] !== '"') {
        if (src[j] === '\\' && j + 1 < src.length) {
          const c = src[j + 1];
          if (c === 'u' && j + 5 < src.length) {
            cur += String.fromCharCode(parseInt(src.slice(j + 2, j + 6), 16));
            j += 6;
          } else { cur += c; j += 2; }
        } else { cur += src[j]; j++; }
      }
      parts.push(cur);
      i = j + 1;
      while (i < src.length && /[\s+]/.test(src[i])) i++;
      if (src[i] === ';') break;
    }
    return parts.join('');
  }
  const brokenCustomFn = [];
  for (const { file, subdir } of ENGINES) {
    const fp = path.join(ROOT, 'src', 'engines', subdir, file);
    const src = fs.readFileSync(fp, 'utf8');
    const body = extractCustomFnBody(src);
    if (body === null) continue; // No customFn — e.g. wordpool engines
    try {
      new Function('inputs', 'pick', 'fill', body);
    } catch (e) {
      brokenCustomFn.push({ file, error: e.message });
    }
  }
  if (brokenCustomFn.length > 0) {
    // KNOWN_BROKEN_CUSTOMFN: empty set as of 2026-06-24. All 6 previously-broken
    // engines were fixed by the codegen-customfn.mjs idempotence fix (data-table
    // wrap now adds the required `;` separator between `}` and the next statement).
    // Keep the carve-out mechanism — if a customFn parse regression slips in,
    // list it here temporarily and create a follow-up plan doc.
    const KNOWN_BROKEN_CUSTOMFN = new Set([]);
    const newBroken = brokenCustomFn.filter(({ file }) => !KNOWN_BROKEN_CUSTOMFN.has(file.replace(/\.ts$/, '')));
    const knownBroken = brokenCustomFn.filter(({ file }) => KNOWN_BROKEN_CUSTOMFN.has(file.replace(/\.ts$/, '')));

    if (knownBroken.length > 0) {
      console.warn(`\n[codegen-examples] --check WARN: ${knownBroken.length} engine(s) have known-broken customFn (not blocking CI):`);
      for (const { file, error } of knownBroken) {
        console.warn(`  - ${file}: ${error}`);
      }
    }

    if (newBroken.length > 0) {
      console.error(`\n[codegen-examples] --check FAILED: ${newBroken.length} engine(s) have customFn that fails to parse as valid JS:`);
      for (const { file, error } of newBroken) {
        console.error(`  - ${file}: ${error}`);
      }
      console.error(`\nFix: in each affected engine, the customFn source must be valid JS (parseable by \`new Function\`).`);
      console.error(`Common cause: string-literal labels (e.g. 'model-name':{...}) — JS labels must be identifiers.`);
      console.error(`Wrap data tables in \`var T={...};\` or \`({...})()\` instead.`);
      console.error(`For local debugging: \`node tests/scripts/test-customFn.mjs <slug>\``);
      process.exit(1);
    }
  }

  console.log(`\n[codegen-examples] --check PASSED: all ${ENGINES.length} engines in sync and clean.`);
  process.exit(0);
}

// Clean up runner script
try { fs.unlinkSync(runnerPath); } catch {}

console.log(`[codegen-examples] Done. ${totalUpdated} engines updated.`);
