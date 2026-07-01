#!/usr/bin/env node
/**
 * Build-time CI gate: verify PUBLIC_CLERK_PUBLISHABLE_KEY is configured.
 *
 * Behavior:
 *   - CI=true + missing/placeholder key → exit 1
 *   - Local dev + missing key → exit 0 with warning
 *   - Any env + valid key → exit 0
 *
 * Sources checked (priority order):
 *   1. process.env.PUBLIC_CLERK_PUBLISHABLE_KEY (CI injects directly)
 *   2. .env file in repo root
 *   3. .env.production file in repo root
 *
 * Validation: key must be non-empty and not contain "REPLACE_ME".
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function readEnvFile(filename) {
  const path = resolve(root, filename);
  if (!existsSync(path)) return '';
  const content = readFileSync(path, 'utf8');
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*PUBLIC_CLERK_PUBLISHABLE_KEY\s*=\s*(.+?)\s*$/);
    if (match) return match[1];
  }
  return '';
}

function isValidKey(key) {
  if (!key) return false;
  const trimmed = key.trim();
  if (trimmed === '') return false;
  if (trimmed.includes('REPLACE_ME')) return false;
  return true;
}

// Priority: process.env > .env > .env.production
const key =
  process.env.PUBLIC_CLERK_PUBLISHABLE_KEY ||
  readEnvFile('.env') ||
  readEnvFile('.env.production');

const isCI = process.env.CI === 'true';

if (isValidKey(key)) {
  console.log('[check-clerk-env] OK');
  process.exit(0);
}

if (isCI) {
  const reason = key.trim() === '' ? 'missing' : 'invalid';
  console.error(`[check-clerk-env] FAIL: CI build has ${reason} PUBLIC_CLERK_PUBLISHABLE_KEY`);
  console.error('[check-clerk-env] Add to .env or CI secrets before merge to master');
  process.exit(1);
}

// Local dev: warning only
console.warn('[check-clerk-env] WARNING: no PUBLIC_CLERK_PUBLISHABLE_KEY set');
console.warn('[check-clerk-env] Header login block will not render in local dev');
console.log('[check-clerk-env] OK (local dev)');
process.exit(0);
