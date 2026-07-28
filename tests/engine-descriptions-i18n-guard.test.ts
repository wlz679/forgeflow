#!/usr/bin/env node
// P122 — CI guard verifying all 100 engines have tools.${slug}.description
// translation AND that translation appears in the corresponding dist page.
//
// Why this exists:
//   P121 added a similar guard for tools.${slug}.title (30th build-dep suite).
//   Description is the next-most user-visible string — used in <meta name="description">,
//   og:description, twitter:description, and visible page <p> tag. This guard
//   makes the 100/100 description translation invariant regression-proof.
//   Same triple failure mode as P121:
//     1. New engine added without description key → caught
//     2. description key removed → caught
//     3. Page template (src/pages/[lang]/[slug].astro) stops wiring
//        t(`tools.${slug}.description`, lang) → caught
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, 31st build-dep suite)

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'en', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p122] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

// Extract all 100 engine slugs from src/engines/**/*.ts (both quote styles).
function getEngineSlugs(): string[] {
  const { readdirSync } = require('node:fs') as typeof import('node:fs');
  const enginesDir = resolve(root, 'src', 'engines');
  const slugs = new Set<string>();
  function walk(d: string): void {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = resolve(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.ts')) {
        const text = readFileSync(full, 'utf-8');
        for (const m of text.matchAll(/^\s*slug:\s*['"](solopreneur-[a-z0-9-]+)['"]/gm)) {
          slugs.add(m[1]);
        }
      }
    }
  }
  walk(enginesDir);
  return [...slugs].sort();
}

// Extract tools.${slug}.description { en, zh } map from src/i18n/translations.ts.
// Descriptions can contain apostrophes (') in the value — use a balanced-brace
// matcher instead of a literal '...' capture. (P121 title matcher worked because
// titles are short and never contain unescaped apostrophes; descriptions can.)
function getDescriptionMap(): Record<string, { en: string; zh: string }> {
  const text = readFileSync(resolve(root, 'src', 'i18n', 'translations.ts'), 'utf-8');
  const map: Record<string, { en: string; zh: string }> = {};
  // Match: 'tools.<slug>.description': { en: '<...>', zh: '<...>' }
  // The value extends until the next "' }" close (single-quote then space then brace).
  // Use a non-greedy match that allows internal apostrophes by requiring the
  // closing pattern to be "' }" (quote, space, closing brace).
  const re = /'tools\.(solopreneur-[a-z0-9-]+)\.description':\s*\{\s*en:\s*'((?:[^'\\]|\\.)*?)',\s*zh:\s*'((?:[^'\\]|\\.)*?)'\s*\}/g;
  for (const m of text.matchAll(re)) {
    map[m[1]] = { en: m[2], zh: m[3] };
  }
  return map;
}

// Strip <script>, <style>, JSON-LD blocks — matches P121 / P103 pattern.
function stripNonBody(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+type="application\/ld\+json"[^>]*>[\s\S]*?<\/[^>]+>/gi, ' ');
}

// Astro HTML-escapes ' & ' to '&amp;', '<' to '&lt;', '>' to '&gt;' on render.
// Normalize the translation value to its escaped form before substring match.
function escapeForHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

test('every engine slug has tools.${slug}.description in translations.ts (en + zh)', () => {
  const slugs = getEngineSlugs();
  assert.equal(
    slugs.length,
    100,
    `Expected 100 engine slugs (EXPECTED_ENGINE_COUNT), found ${slugs.length}. ` +
      `P22b locked engine count at 100 — investigate before continuing.`
  );

  const descs = getDescriptionMap();
  const missing: string[] = [];
  const emptyEn: string[] = [];
  const emptyZh: string[] = [];

  for (const slug of slugs) {
    if (!descs[slug]) {
      missing.push(slug);
      continue;
    }
    if (!descs[slug].en) emptyEn.push(slug);
    if (!descs[slug].zh) emptyZh.push(slug);
  }

  const violations = [
    ...missing.map(s => `${s}: missing tools.${s}.description entry in translations.ts`),
    ...emptyEn.map(s => `${s}: tools.${s}.description has empty en translation`),
    ...emptyZh.map(s => `${s}: tools.${s}.description has empty zh translation`),
  ];

  assert.equal(
    violations.length,
    0,
    `Engine description i18n violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '') +
      `\n\nAdd tools.${slugs.find(s => !descs[s]) ?? '???'}.description to ` +
      `src/i18n/translations.ts and wire it through page template if missing.`
  );
});

test('every engine description appears in corresponding dist page (en + zh, 200 page checks)', () => {
  ensureBuilt();

  const slugs = getEngineSlugs();
  const descs = getDescriptionMap();

  const violations: string[] = [];

  for (const slug of slugs) {
    const d = descs[slug];
    if (!d) {
      violations.push(`${slug}: description entry missing (should be caught by first test)`);
      continue;
    }
    // EN page must contain the en description (HTML-escaped for &/</>).
    const enPath = resolve(root, 'dist', 'en', slug, 'index.html');
    if (!existsSync(enPath)) {
      violations.push(`${slug}: dist/en/${slug}/index.html missing (build incomplete?)`);
      continue;
    }
    const enHtml = stripNonBody(readFileSync(enPath, 'utf-8'));
    if (!enHtml.includes(escapeForHtml(d.en))) {
      violations.push(`en/${slug}: missing translated description (length ${d.en.length})`);
    }
    // ZH page must contain the zh description
    const zhPath = resolve(root, 'dist', 'zh', slug, 'index.html');
    if (!existsSync(zhPath)) {
      violations.push(`${slug}: dist/zh/${slug}/index.html missing (build incomplete?)`);
      continue;
    }
    const zhHtml = stripNonBody(readFileSync(zhPath, 'utf-8'));
    if (!zhHtml.includes(escapeForHtml(d.zh))) {
      violations.push(`zh/${slug}: missing translated description (length ${d.zh.length})`);
    }
  }

  assert.equal(
    violations.length,
    0,
    `Engine description page wiring violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '') +
      `\n\nThe page template (src/pages/[lang]/[slug].astro) likely stopped wiring ` +
      `t(\`tools.\${slug}.description\`, lang). Re-check the toolDescription variable.`
  );
});
