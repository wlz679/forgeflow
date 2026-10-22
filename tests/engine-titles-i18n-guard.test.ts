#!/usr/bin/env node
// P121 — CI guard verifying all 100 engines have tools.${slug}.title translation
// AND that translation appears in the corresponding dist page.
//
// Why this exists:
//   P121 audited all 100 engine slugs vs the i18n locale JSON and confirmed
//   100/100 are translated (en + zh). This guard makes that 100/100 invariant
//   regression-proof:
//     1. If a new engine is added without a tools.${slug}.title key → caught
//     2. If a tools.${slug}.title key is removed → caught
//     3. If the page template (src/pages/[lang]/[slug].astro) stops wiring
//        t(`tools.${slug}.title`, lang) into <title> → caught
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, 30th build-dep suite)

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
// P153: translations moved from the deleted src/i18n/translations.ts to the
// per-locale JSON files (P150, commit c16322b). This guard used to scrape
// the TS module with a regex and died with ENOENT once it was deleted.
import { getTranslation, getEngineSlugsFromEnginesDir } from './_locale-json';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'en', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p121] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

// Extract all 100 engine slugs from src/engines/**/*.ts (both quote styles).
function getEngineSlugs(): string[] {
  return getEngineSlugsFromEnginesDir();
}

// Extract tools.${slug}.title { en, zh } map from the per-locale JSON files.
// A title entry needs BOTH languages — the pre-P150 regex
// (`'tools.X.title': { en: '...', zh: '...' }`) required both fields, so a
// one-language entry counted as "missing" then and counts as missing now.
function getTitleMap(): Record<string, { en: string; zh: string }> {
  const map: Record<string, { en: string; zh: string }> = {};
  for (const slug of getEngineSlugs()) {
    const en = getTranslation('en', `tools.${slug}.title`);
    const zh = getTranslation('zh', `tools.${slug}.title`);
    if (en === undefined || zh === undefined) continue;
    map[slug] = { en, zh };
  }
  return map;
}

// Strip <script>, <style>, JSON-LD blocks — title is in <title> so safe to keep
// in raw HTML, but stripNonBody matches P103 for cross-guard consistency.
function stripNonBody(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+type="application\/ld\+json"[^>]*>[\s\S]*?<\/[^>]+>/gi, ' ');
}

// Astro HTML-escapes ' & ' to '&amp;' on render. Normalize the translation
// value to the escaped form before substring match. (P118 ship drama noted the
// same `&` literal: post-processor works on raw output before HTML escape.)
function escapeForHtml(s: string): string {
  return s.replace(/&/g, '&amp;');
}

test('every engine slug has tools.${slug}.title in the locale JSON (en + zh)', () => {
  const slugs = getEngineSlugs();
  assert.equal(
    slugs.length,
    100,
    `Expected 100 engine slugs (EXPECTED_ENGINE_COUNT), found ${slugs.length}. ` +
      `P22b locked engine count at 100 — investigate before continuing.`
  );

  const titles = getTitleMap();
  const missing: string[] = [];
  const noZh: string[] = [];

  for (const slug of slugs) {
    if (!titles[slug]) {
      missing.push(slug);
      continue;
    }
    if (!titles[slug].zh) {
      noZh.push(slug);
    }
  }

  const violations = [
    ...missing.map(s => `${s}: missing tools.${s}.title entry in en.json/zh.json`),
    ...noZh.map(s => `${s}: tools.${s}.title has empty zh translation`),
  ];

  assert.equal(
    violations.length,
    0,
    `Engine title i18n violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '') +
      `\n\nAdd tools.${slugs.find(s => !titles[s]) ?? '???'}.title to ` +
      `src/i18n/locales/en.json + zh.json and wire it through page template if missing.`
  );
});

test('every engine title appears in corresponding dist page (en + zh, 200 page checks)', () => {
  ensureBuilt();

  const slugs = getEngineSlugs();
  const titles = getTitleMap();

  const violations: string[] = [];

  for (const slug of slugs) {
    const t = titles[slug];
    if (!t) {
      violations.push(`${slug}: translation entry missing (should be caught by first test)`);
      continue;
    }
    // EN page must contain the en title (stripped of script/style to avoid
    // false-negatives from customFn JS that may include the slug or other tokens).
    const enPath = resolve(root, 'dist', 'en', slug, 'index.html');
    if (!existsSync(enPath)) {
      violations.push(`${slug}: dist/en/${slug}/index.html missing (build incomplete?)`);
      continue;
    }
    const enHtml = stripNonBody(readFileSync(enPath, 'utf-8'));
    if (!enHtml.includes(escapeForHtml(t.en))) {
      violations.push(`en/${slug}: missing translated title "${t.en}"`);
    }
    // ZH page must contain the zh title
    const zhPath = resolve(root, 'dist', 'zh', slug, 'index.html');
    if (!existsSync(zhPath)) {
      violations.push(`${slug}: dist/zh/${slug}/index.html missing (build incomplete?)`);
      continue;
    }
    const zhHtml = stripNonBody(readFileSync(zhPath, 'utf-8'));
    if (!zhHtml.includes(escapeForHtml(t.zh))) {
      violations.push(`zh/${slug}: missing translated title "${t.zh}"`);
    }
  }

  assert.equal(
    violations.length,
    0,
    `Engine title page wiring violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '') +
      `\n\nThe page template (src/pages/[lang]/[slug].astro) likely stopped wiring ` +
      `t(\`tools.\${slug}.title\`, lang) into <title>. Re-check the metaTitle variable.`
  );
});
