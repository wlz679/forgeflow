#!/usr/bin/env node
// scripts/generate-llms-txt.mjs
// P148-D-S7: Generate public/llms.txt from dist/en (one-time per build).
//
// Reads each category index page's <a href="/en/solopreneur-..."> links to map
// every calculator to its category, then extracts each calculator's title
// from its own <title> tag. Writes public/llms.txt in standard llms.txt
// format (per Jeremy Howard / answer.ai late-2024 spec):
//
//   # Title
//   > Summary
//   ## Section
//   - [Link](url): description
//
// Run: `node scripts/generate-llms-txt.mjs`
// Or:  `pnpm llms:gen` (after wiring the script in package.json)
//
// Pre-condition: dist/ must already exist (run `pnpm build` first if not).
// Post-condition: public/llms.txt is updated; Astro copies it to dist/llms.txt
// on next `pnpm build`.

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST_EN = 'dist/en';
const OUTPUT = 'public/llms.txt';

// 15 categories with one-line descriptions — keep in sync with src/data/categories.ts
const CATS = [
  { slug: 'saas-metrics', name: 'SaaS Metrics', desc: 'MRR, burn rate, churn, revenue projections, break-even, market sizing' },
  { slug: 'ai-cost-tools', name: 'AI Cost Tools', desc: 'OpenAI / Claude / Gemini / DeepSeek token pricing, AI image gen, GPU cloud, training cost' },
  { slug: 'valuation-exit', name: 'Valuation & Exit', desc: 'Unit economics, SaaS valuation, LTV, CAC, equity dilution, revenue projections' },
  { slug: 'freelance-pricing', name: 'Freelance Pricing', desc: 'Hourly-vs-fixed, freelance rate, sponsorship rate, course pricing, SaaS pricing, email list revenue' },
  { slug: 'cost-efficiency', name: 'Cost & Efficiency', desc: 'Employee cost, meeting cost, productivity score, market size, SaaS pricing' },
  { slug: 'investment-roi', name: 'Investment & Real Estate', desc: 'Compound interest, mortgage, cap rates, BRRR returns, rent-vs-buy, DSCR, time value' },
  { slug: 'marketing-analytics', name: 'Marketing Analytics', desc: 'ROAS, LTV by channel, funnel value, cohort retention, email & content marketing ROI, coupon attribution, cart abandonment' },
  { slug: 'operations-inventory', name: 'Operations & Inventory', desc: 'Inventory turnover, carrying cost, stockout cost, reorder point, fulfillment cost, supplier scorecards' },
  { slug: 'sales', name: 'Sales Management', desc: 'Pipeline value, sales velocity, ACV, win rate by stage, quota attainment, pipeline coverage' },
  { slug: 'retention', name: 'Retention & Customer Success', desc: 'NRR, GRR, expansion revenue, logo churn, customer health, renewal rate' },
  { slug: 'product-analytics', name: 'Product Analytics', desc: 'Funnel conversion, feature adoption, activation rate, stickiness (DAU/MAU), time-to-value, power user curves' },
  { slug: 'hiring-team', name: 'Hiring & Team', desc: 'Fully-loaded employee cost, ramp time, productivity ramp, comp banding, equity refresh, attrition cost' },
  { slug: 'customer-support', name: 'Customer Support', desc: 'Cost-per-ticket, first response time SLA, resolution time, CSAT, self-service deflection, team capacity' },
  { slug: 'knowledge', name: 'Knowledge Base', desc: 'KB coverage, article freshness, search effectiveness, deflection quality, documentation ROI, article helpfulness' },
  { slug: 'legal-compliance', name: 'Legal & Compliance', desc: 'GDPR fine risk, DSAR cost, cookie consent revenue impact, DPA cost, breach notification, CMP ROI' },
];

const SITE = 'https://forgeflowkit.com';

if (!existsSync(DIST_EN)) {
  console.error(`✗ ${DIST_EN}/ not found — run \`pnpm build\` first`);
  process.exit(1);
}

// 1. Extract all 100 calculator slugs + titles from dist/en
const slugs = {};
for (const d of readdirSync(DIST_EN)) {
  if (!d.startsWith('solopreneur-')) continue;
  const idxPath = join(DIST_EN, d, 'index.html');
  if (!existsSync(idxPath)) continue;
  const html = readFileSync(idxPath, 'utf8');
  const m = html.match(/<title>([^<]+)<\/title>/);
  const raw = m ? m[1].replace(/\s*[—|]\s*ForgeFlowKit\s*$/, '').trim() : d;
  // Unescape common HTML entities from <title> tags
  const title = raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  slugs[d] = title;
}

// 2. Map each slug to its category by scanning KNOWN category index pages.
//    We match `<a href="/en/solopreneur-...">` (not bare slug strings) because
//    category pages also contain cross-link references, sitemap JSON, and
//    structured-data slugs that would otherwise flood the category set.
const catMap = {};
for (const cat of CATS) {
  const idxPath = join(DIST_EN, cat.slug, 'index.html');
  if (!existsSync(idxPath)) {
    console.warn(`⚠ category page missing: ${idxPath}`);
    continue;
  }
  const html = readFileSync(idxPath, 'utf8');
  const matches = [
    ...new Set([
      ...html.matchAll(/href="\/en\/solopreneur-[a-z0-9-]+/g),
    ].map((m) => m[0].replace(/^href="\/en\//, ''))),
  ];
  for (const s of matches) {
    if (slugs[s] && !catMap[s]) catMap[s] = cat.slug;
  }
}

// Group slugs by category
const byCat = {};
for (const [slug, catSlug] of Object.entries(catMap)) {
  if (!byCat[catSlug]) byCat[catSlug] = [];
  byCat[catSlug].push(slug);
}

// 3. Build llms.txt content
let out = '';
out += '# ForgeFlowKit — Free Business Calculators for Solopreneurs & SaaS Founders\n';
out += '\n';
out += '> 100 free calculator tools across 15 categories (SaaS metrics, AI cost, valuation, freelance pricing, cost & efficiency, investment, marketing analytics, operations, sales, retention, product analytics, hiring, customer support, knowledge base, legal & compliance). All tools support English and Chinese. Each tool ships with decision-support context: assumptions, what-if scenarios, break-even analysis, common mistakes, and per-tool guidance.\n';
out += '\n';
out += '## About\n';
out += '\n';
out += `- [ForgeFlowKit Landing](${SITE}/): Main landing page (EN + ZH).\n`;
out += `- [About / Methodology](${SITE}/en/about/): Who built this, what we cover, how we maintain accuracy.\n`;
out += `- [Contact](${SITE}/en/contact/): Reach the team.\n`;
out += '\n';
out += '## Categories\n';
out += '\n';

for (const c of CATS) {
  out += `### ${c.name}\n`;
  out += '\n';
  out += `- [Category: ${c.name}](${SITE}/en/${c.slug}/): ${c.desc}.\n`;
  const tools = (byCat[c.slug] || []).sort();
  for (const s of tools) {
    const title = slugs[s];
    out += `- [${title}](${SITE}/en/${s}/): Free calculator with decision support (assumptions, what-if, break-even).\n`;
  }
  out += '\n';
}

out += '## Editorial & Blog\n';
out += '\n';
out += `- [ForgeFlowKit Blog](${SITE}/en/blog/): In-depth guides, benchmarks, and comparisons for SaaS founders and solopreneurs.\n`;
out += '\n';
out += '## Languages\n';
out += '\n';
out += `- English: ${SITE}/en/\n`;
out += `- 中文 (Simplified Chinese): ${SITE}/zh/\n`;
out += '\n';
out += '## Sitemap & Feeds\n';
out += '\n';
out += `- XML Sitemap: ${SITE}/sitemap-index.xml\n`;
out += '\n';
out += '## Last Updated\n';
out += '\n';
out += 'Reviewed 2026-08-25. Pricing data refreshed weekly via LiteLLM sync (Monday 06:00 UTC). Each calculator page shows a per-page dataReviewedAt badge via the EEAT trust block.\n';
out += '\n';
out += '## Reviewer\n';
out += '\n';
out += '- 王立柱 (ForgeFlowKit founder). All 100 calculators reviewed by a single accountable reviewer; see [About / Methodology](' + SITE + '/en/about/) for details and citation policy.\n';
out += '\n';

writeFileSync(OUTPUT, out, 'utf8');

console.log(`✓ Written ${OUTPUT}`);
console.log(`  Lines: ${out.split('\n').length}`);
console.log(`  Bytes: ${Buffer.byteLength(out, 'utf8')}`);
console.log(`  Total slugs: ${Object.keys(slugs).length}`);
console.log('  Per-category counts:');
for (const c of CATS) {
  console.log(`    ${c.slug}: ${(byCat[c.slug] || []).length} tools`);
}