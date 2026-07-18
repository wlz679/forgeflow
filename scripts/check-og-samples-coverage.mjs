#!/usr/bin/env node
// P23: CI guard. Fails (exit 1) if any tool in src/data/tools/ has no
// matching og-sample entry in src/data/og-samples.json, OR if og-samples.json
// contains an entry with no matching tool (orphan). Run via precommit hook
// (.githooks/pre-commit) and manually via
//   pnpm exec tsx scripts/check-og-samples-coverage.mjs.

import { tools } from '../src/data/tools/index.ts';
import ogSamples from '../src/data/og-samples.json' with { type: 'json' };

const toolSlugs = new Set(tools.map(t => t.slug));
const sampleSlugs = new Set(Object.keys(ogSamples));

const missing = tools.map(t => t.slug).filter(s => !sampleSlugs.has(s));
const orphan = Object.keys(ogSamples).filter(s => !toolSlugs.has(s));

if (missing.length === 0 && orphan.length === 0) {
  console.log(`OK: ${toolSlugs.size}/${toolSlugs.size} og-samples present (zero missing, zero orphan)`);
  process.exit(0);
}

if (missing.length > 0) {
  console.error(`MISSING og-samples for ${missing.length} tools:`);
  for (const s of missing) console.error(`  - ${s}`);
}
if (orphan.length > 0) {
  console.error(`ORPHAN og-samples (no matching tool): ${orphan.length} entries:`);
  for (const s of orphan) console.error(`  - ${s}`);
}
process.exit(1);
