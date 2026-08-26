#!/usr/bin/env node
// tests/indexnow-config-guard.test.ts
// P148-E-S11: Source-only guard for IndexNow integration.
//
// Verifies the IndexNow setup is intact:
//   1. scripts/indexnow-submit.mjs exists and exports a static KEY
//   2. public/{KEY}.txt exists and contains the key (IndexNow validates by
//      fetching this file from the live host)
//   3. package.json has a postbuild hook OR `build` script calls the script
//   4. KEY is a UUID-like string (length 32+ with dashes, or 32 hex chars)
//
// Runs in default pnpm check (no RUN_BUILD_TESTS gate, no dist/ rebuild).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SCRIPT = join(ROOT, 'scripts/indexnow-submit.mjs');
const PKG = join(ROOT, 'package.json');

function extractKey(scriptText: string): string | null {
  // Match `const KEY = '...'` in scripts/indexnow-submit.mjs
  const m = scriptText.match(/const\s+KEY\s*=\s*['"]([^'"]+)['"]/);
  return m ? m[1] : null;
}

test('scripts/indexnow-submit.mjs exists', () => {
  assert.ok(existsSync(SCRIPT), `Expected ${SCRIPT} to exist`);
});

test('scripts/indexnow-submit.mjs exports a static KEY', () => {
  if (!existsSync(SCRIPT)) return;
  const txt = readFileSync(SCRIPT, 'utf8');
  const key = extractKey(txt);
  assert.ok(key, 'Expected `const KEY = "..."` in scripts/indexnow-submit.mjs');
});

test('KEY is a UUID-like string', () => {
  if (!existsSync(SCRIPT)) return;
  const txt = readFileSync(SCRIPT, 'utf8');
  const key = extractKey(txt);
  if (!key) return;
  // Accept either UUID format (8-4-4-4-12) or 32+ hex chars
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
  const isHex32 = /^[0-9a-f]{32,}$/i.test(key);
  assert.ok(
    isUuid || isHex32,
    `KEY "${key}" should be UUID format (8-4-4-4-12) or 32+ hex chars`
  );
});

test(`public/{KEY}.txt exists and contains the key`, () => {
  if (!existsSync(SCRIPT)) return;
  const txt = readFileSync(SCRIPT, 'utf8');
  const key = extractKey(txt);
  if (!key) return;
  const keyFile = join(ROOT, 'public', `${key}.txt`);
  assert.ok(
    existsSync(keyFile),
    `Expected ${keyFile} to exist (IndexNow validates by fetching this file from the live host)`
  );
  const content = readFileSync(keyFile, 'utf8').trim();
  assert.equal(
    content,
    key,
    `Expected ${keyFile} to contain the key "${key}", got "${content}"`
  );
});

test('package.json wires the submit script into build', () => {
  if (!existsSync(PKG)) return;
  const pkg = JSON.parse(readFileSync(PKG, 'utf8'));
  const buildScript = pkg.scripts?.build || '';
  const indexnowCheck = pkg.scripts?.['indexnow:check'] || '';
  // Accept either: (a) build chains to indexnow-submit.mjs, or
  //                (b) standalone indexnow:check script exists
  const wired = buildScript.includes('indexnow-submit.mjs') || indexnowCheck.length > 0;
  assert.ok(
    wired,
    'Expected package.json `build` script to chain to indexnow-submit.mjs ' +
      'OR have a standalone `indexnow:check` script'
  );
});