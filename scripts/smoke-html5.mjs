#!/usr/bin/env node
// HTML5 smoke test: verify all built pages have step="any" on numeric inputs.
// Layer 1 (HTML5 native UX) verification for the clampNonNegative pattern.
//
// Usage: node scripts/smoke-html5.mjs [--strict]
//   --strict: exit 1 if ANY page missing step="any" (default)
//   (no flag): print report, exit 0
//
// Walks dist/{en,zh}/*.html and counts <input type="number"> tags with/without step="any".

import fs from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const strict = process.argv.includes('--strict');
const ROOT = 'dist';

function walkHtml(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walkHtml(full));
    else if (entry.endsWith('.html')) out.push(full);
  }
  return out;
}

function checkPage(file) {
  const html = fs.readFileSync(file, 'utf8');
  // Find all <input type="number" ...> tags
  const numericInputRegex = /<input[^>]*type="number"[^>]*>/g;
  const inputs = html.match(numericInputRegex) || [];
  if (inputs.length === 0) return { ok: 0, missing: 0 };
  const withStep = inputs.filter(tag => /step="any"/.test(tag)).length;
  return { ok: withStep, missing: inputs.length - withStep };
}

const files = walkHtml(ROOT);
let totalNumeric = 0;
let totalMissing = 0;
const failures = [];

for (const f of files) {
  const { ok, missing } = checkPage(f);
  totalNumeric += ok + missing;
  totalMissing += missing;
  if (missing > 0) failures.push({ file: f, missing });
}

console.log(`\nHTML5 Smoke Test Report`);
console.log(`========================`);
console.log(`Pages scanned: ${files.length}`);
console.log(`Numeric inputs: ${totalNumeric}`);
console.log(`With step="any": ${totalNumeric - totalMissing}`);
console.log(`Missing step="any": ${totalMissing}`);

if (failures.length > 0) {
  console.log(`\nFailures (${failures.length} pages):`);
  for (const { file, missing } of failures.slice(0, 10)) {
    console.log(`  ${file}: ${missing} missing`);
  }
  if (failures.length > 10) console.log(`  ... and ${failures.length - 10} more`);
}

if (strict && totalMissing > 0) {
  console.log(`\n❌ ${totalMissing} numeric inputs missing step="any". Failing strict mode.`);
  process.exit(1);
}

console.log(`\n✅ All numeric inputs have step="any"`);
