#!/usr/bin/env node
// tests/llms-txt-coverage-guard.test.ts
// P148-D-S7: Source-only guard for public/llms.txt coverage.
//
// llms.txt is a static file that summarizes site content for AI crawlers
// (Perplexity, ChatGPT, Claude). Without it, AI search engines may under-
// index the site. This guard verifies public/llms.txt exists and lists
// every calculator slug (canonical reference set = the 100 dist/en
// directories whose names start with `solopreneur-`).
//
// This guard runs in DEFAULT pnpm check (no RUN_BUILD_TESTS gate, no
// dist/ rebuild) — it reads public/llms.txt + dist/en/* source-of-truth
// directories. Catches:
//   - Missing public/llms.txt file
//   - File does not list every calculator slug
//   - File does not list every category

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const LLMS_PATH = join(ROOT, 'public/llms.txt');
const DIST_EN = join(ROOT, 'dist/en');

// 15 expected categories — must match src/data/categories.ts and the
// `## Categories` section in public/llms.txt. If you add a category,
// update both this list and the generator.
const EXPECTED_CATEGORIES = [
  'saas-metrics',
  'ai-cost-tools',
  'valuation-exit',
  'freelance-pricing',
  'cost-efficiency',
  'investment-roi',
  'marketing-analytics',
  'operations-inventory',
  'sales',
  'retention',
  'product-analytics',
  'hiring-team',
  'customer-support',
  'knowledge',
  'legal-compliance',
];

function getCanonicalSlugs(): string[] {
  if (!existsSync(DIST_EN)) {
    // Build hasn't run yet — guard runs in default mode so this is OK;
    // the test will skip the coverage assertion with a console.warn.
    return [];
  }
  return readdirSync(DIST_EN).filter((d) => {
    if (!d.startsWith('solopreneur-')) return false;
    try {
      return statSync(join(DIST_EN, d)).isDirectory();
    } catch {
      return false;
    }
  });
}

test('public/llms.txt exists', () => {
  assert.ok(
    existsSync(LLMS_PATH),
    `Expected ${LLMS_PATH} to exist — run \`node scripts/generate-llms-txt.mjs\` to generate it`
  );
});

test('public/llms.txt has standard structure', () => {
  if (!existsSync(LLMS_PATH)) return;
  const content = readFileSync(LLMS_PATH, 'utf8');
  // Standard llms.txt starts with `# Title` heading
  assert.ok(/^# [^\n]+/m.test(content), 'Expected `# Title` heading on line 1');
  // Has at least one `> Summary` blockquote
  assert.ok(/^> [^\n]+/m.test(content), 'Expected `> Summary` blockquote');
  // Has at least one `## Section` heading
  assert.ok(/^## [^\n]+/m.test(content), 'Expected `## Section` heading');
});

test('public/llms.txt lists every category', () => {
  if (!existsSync(LLMS_PATH)) return;
  const content = readFileSync(LLMS_PATH, 'utf8');
  for (const cat of EXPECTED_CATEGORIES) {
    const categoryUrl = `/en/${cat}/`;
    assert.ok(
      content.includes(categoryUrl),
      `Expected public/llms.txt to reference category URL ${categoryUrl}`
    );
  }
});

test('public/llms.txt references every calculator slug', () => {
  if (!existsSync(LLMS_PATH)) return;
  const slugs = getCanonicalSlugs();
  if (slugs.length === 0) {
    console.warn(
      '[llms-txt-coverage] dist/en not built yet — skipping slug coverage check (run pnpm build first)'
    );
    return;
  }
  const content = readFileSync(LLMS_PATH, 'utf8');
  const missing: string[] = [];
  for (const s of slugs) {
    const url = `/en/${s}/`;
    if (!content.includes(url)) missing.push(s);
  }
  assert.equal(
    missing.length,
    0,
    `public/llms.txt is missing ${missing.length} calculator(s):\n  ` +
      missing.slice(0, 10).join('\n  ') +
      (missing.length > 10 ? `\n  ... and ${missing.length - 10} more` : '')
  );
});

test('public/llms.txt has the expected tool count (~100)', () => {
  if (!existsSync(LLMS_PATH)) return;
  const content = readFileSync(LLMS_PATH, 'utf8');
  const slugs = getCanonicalSlugs();
  if (slugs.length === 0) return; // skip
  // Count `(/en/solopreneur-XYZ/)` link occurrences
  const linkMatches = content.match(/\/en\/solopreneur-[a-z0-9-]+\//g) || [];
  // Should be ≥ slugs.length (some may appear more than once for cross-references)
  assert.ok(
    linkMatches.length >= slugs.length,
    `Expected at least ${slugs.length} tool links in public/llms.txt, found ${linkMatches.length}`
  );
});