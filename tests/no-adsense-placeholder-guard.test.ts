#!/usr/bin/env node
// P140a-T6: Source-only CI guard enforcing that the AdUnit placeholder
// component does not reappear after P140a ship.
//
// Why this exists:
//   AdUnit.astro was a dashed-border placeholder that rendered literal
//   "AdSense — <slot>" text inside a min-height container. AdSense review
//   flagged this as misleading metadata, which contributed to the "low-value
//   content" rejection. P140a deletes the file. This guard prevents regression.
//
// Two assertions:
//   (a) src/components/AdUnit.astro does NOT exist on disk.
//   (b) No source file under src/ imports the deleted module or renders a
//       literal <AdUnit /> instance.
//
// This is a source-only test (does NOT depend on `pnpm build`, does NOT
// require RUN_BUILD_TESTS=1). It runs under pnpm test:unit by default.
//
// Reference: spec §7 (AdSense infrastructure cleanup), §8 (CI guards).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const srcDir = join(root, 'src');

// (a) File should not exist
test('AdUnit.astro file is deleted from src/components/', () => {
  const deleted = join(root, 'src', 'components', 'AdUnit.astro');
  assert.equal(
    existsSync(deleted),
    false,
    `AdUnit.astro must remain deleted at ${deleted}; the P140a AdSense cleanup removed it for compliance. Restore only by reverting the entire P140a commit; partial restoration will be flagged by this guard.`
  );
});

// (b) No source file references the deleted module
//
// We walk src/ recursively (with depth cap to bound the walk) and grep for any
// line containing the literal "<AdUnit" (a JSX/Astro instance) or
// "AdUnit.astro" (an import specifier). Hits fail the test; we collect them
// to give the reviewer a single error message.
test('no source file imports or renders <AdUnit /> after P140a', () => {
  const hits: string[] = [];
  const MAX_DEPTH = 8;

  function walk(dir: string, depth: number): void {
    if (depth > MAX_DEPTH) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      // Skip node_modules + .git + dist + .astro scratch.
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === '.astro') continue;
      if (entry.isDirectory()) {
        walk(full, depth + 1);
        continue;
      }
      // Only scan text-y CODE extensions. Markdown files (.md) are intentionally
      // excluded: docs may legitimately mention `AdUnit.astro` for historical
      // context (e.g. INDEX.md, plan/spec retrospectives) without implying a
      // resurrection. If a markdown file gets a literal <AdUnit /> import
      // block, that's a docs bug — but the CI guard isn't the right place to
      // catch it (would generate noisy false positives on every retrospective).
      if (!/\.(astro|ts|tsx|mjs|js)$/.test(entry.name)) continue;
      // Skip binary-looking or huge files (>1MB).
      let stat;
      try { stat = statSync(full); } catch { continue; }
      if (stat.size > 1_000_000) continue;

      const text = readFileSync(full, 'utf8');
      // Match either a JSX/Astro `<AdUnit …/>` instance (literal "<AdUnit"
      // followed by space or `>`) OR a `AdUnit.astro` import specifier.
      // Code-files only (.md excluded by extension filter above).
      if (/<AdUnit[\s>]/.test(text) || /AdUnit\.astro/.test(text)) {
        hits.push(full.replace(root + '\\', '').replace(root + '/', ''));
      }
    }
  }

  walk(srcDir, 0);

  assert.equal(
    hits.length,
    0,
    `No src/ file may import or render <AdUnit /> after P140a. Found: ${hits.join(', ')}`
  );
});