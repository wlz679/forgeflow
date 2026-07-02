#!/usr/bin/env node
/**
 * Build-time CI gate: verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured.
 *
 * Behavior:
 *   - CI=true + missing/invalid → exit 1
 *   - Local dev + missing → exit 0 with warning
 *   - Any env + valid → exit 0
 *
 * Sources checked (priority order):
 *   1. process.env.VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (CI injects directly)
 *   2. .env file in repo root
 *   3. .env.production file in repo root
 *
 * Validation:
 *   - URL: non-empty, not "REPLACE_ME", starts with "https://", contains ".supabase.co"
 *   - Key: non-empty, not "REPLACE_ME"
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function readEnvFile(filename, key) {
  const path = resolve(root, filename);
  if (!existsSync(path)) return '';
  const content = readFileSync(path, 'utf8');
  for (const line of content.split('\n')) {
    const match = line.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+?)\\s*$`));
    if (match) return match[1];
  }
  return '';
}

function isValidUrl(url) {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed === '') return false;
  if (trimmed.includes('REPLACE_ME')) return false;
  if (!trimmed.startsWith('https://')) return false;
  if (!trimmed.includes('.supabase.co')) return false;
  return true;
}

function isValidKey(key) {
  if (!key) return false;
  const trimmed = key.trim();
  if (trimmed === '') return false;
  if (trimmed.includes('REPLACE_ME')) return false;
  return true;
}

// Priority: process.env > .env > .env.production
const url =
  process.env.VITE_SUPABASE_URL ||
  readEnvFile('.env', 'VITE_SUPABASE_URL') ||
  readEnvFile('.env.production', 'VITE_SUPABASE_URL');

const key =
  process.env.VITE_SUPABASE_ANON_KEY ||
  readEnvFile('.env', 'VITE_SUPABASE_ANON_KEY') ||
  readEnvFile('.env.production', 'VITE_SUPABASE_ANON_KEY');

const isCI = process.env.CI === 'true';

if (isValidUrl(url) && isValidKey(key)) {
  console.log('[check-supabase-env] OK');
  process.exit(0);
}

if (isCI) {
  const urlInvalid = !isValidUrl(url);
  const keyInvalid = !isValidKey(key);
  const reason = urlInvalid ? (url.trim() === '' ? 'missing' : 'invalid') :
                  keyInvalid ? (key.trim() === '' ? 'missing' : 'invalid') : 'invalid';
  console.error(`[check-supabase-env] FAIL: CI build has ${reason} VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY`);
  console.error('[check-supabase-env] Add to .env or CI secrets before merge to master');
  process.exit(1);
}

// Local dev: warning only
console.warn('[check-supabase-env] WARNING: no VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY set');
console.warn('[check-supabase-env] Sync menu will not render in local dev');
console.log('[check-supabase-env] OK (local dev)');
process.exit(0);
