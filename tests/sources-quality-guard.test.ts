#!/usr/bin/env node
// P140c-T4: Build-dep CI guard verifying every prose file in
// src/content/tools/ has valid source URLs in its frontmatter sources[].
//
// Validation:
//   - sources array has ≥ 1 entry (zod schema enforces min(1))
//   - each source.url matches ^https?://[^\s]+$ (HTTPS or HTTP)
//   - each source.url is non-empty
//   - each source.name is non-empty
//
// Catches: P140b-era source URL typos, missing protocols, broken schemas.
// Build dependency: RUN_BUILD_TESTS=1 required (P23b skip-guard pattern).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

// P23b skip-guard
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

const PROSE_DIR = resolve(root, 'src/content/tools');

function listProseFiles(): string[] {
  if (!existsSync(PROSE_DIR)) return [];
  return readdirSync(PROSE_DIR).filter(n => n.endsWith('.md') && n !== '_README.md');
}

function parseSourcesBlock(text: string): Array<{ name: string; url: string }> {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return [];
  const lines = m[1].split('\n');
  const sources: Array<{ name: string; url: string }> = [];
  let inSources = false;
  let cur: { name?: string; url?: string } = {};
  for (const line of lines) {
    if (/^sources:\s*$/.test(line)) { inSources = true; cur = {}; continue; }
    if (inSources) {
      if (/^[a-z_]+:\s/.test(line) && !line.startsWith('  ')) {
        // New top-level key → flush current
        if (cur.name && cur.url) sources.push({ name: cur.name, url: cur.url });
        inSources = false; cur = {}; continue;
      }
      const nameMatch = line.match(/^\s+-\s+name:\s*['"]?([^'"]+?)['"]?\s*$/);
      if (nameMatch) cur.name = nameMatch[1];
      const urlMatch = line.match(/^\s+url:\s*['"]?([^'"]+?)['"]?\s*$/);
      if (urlMatch) cur.url = urlMatch[1];
    }
  }
  if (cur.name && cur.url) sources.push({ name: cur.name, url: cur.url });
  return sources;
}

test('every prose file sources[] has valid URLs (HTTPS format + non-empty name)', () => {
  const files = listProseFiles();
  const failures: string[] = [];
  for (const filename of files) {
    const text = readFileSync(resolve(PROSE_DIR, filename), 'utf8');
    const sources = parseSourcesBlock(text);
    if (sources.length === 0) {
      failures.push(`${filename}: no sources[] in frontmatter`);
      continue;
    }
    for (let i = 0; i < sources.length; i++) {
      const s = sources[i];
      if (!s.name || s.name.trim() === '') {
        failures.push(`${filename}:sources[${i}].name is empty`);
      }
      if (!s.url || s.url.trim() === '') {
        failures.push(`${filename}:sources[${i}].url is empty`);
      } else if (!/^https?:\/\/[^\s]+$/.test(s.url)) {
        failures.push(`${filename}:sources[${i}].url '${s.url}' not valid HTTPS/HTTP URL`);
      }
    }
  }
  assert.equal(
    failures.length,
    0,
    `Sources quality violations (${failures.length}):\n` +
      failures.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (failures.length > 20 ? `\n  ... and ${failures.length - 20} more` : '')
  );
});
