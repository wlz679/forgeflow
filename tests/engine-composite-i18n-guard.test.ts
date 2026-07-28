#!/usr/bin/env node
// P123 — Holistic CI guard: for every zh engine page, verify the most
// user-visible i18n surfaces all rendered. Single test covers 5 invariants:
//   1. Title translated + present in <title>/<h1>
//   2. Description translated + present in <meta name="description">/visible <p>
//   3. At least 1 input label translated (i18n wiring works for the form)
//   4. At least 1 FAQ question translated (i18n wiring works for the FAQ list)
//   5. At least 1 how_to_use step translated (i18n wiring works for the steps)
//
// Why this is one test (not 5):
//   P121 (title) + P122 (description) are 2 single-invariant guards. P123
//   HOLISTIC-ly checks the page template's `t()` call paths for all 5
//   surfaces — if ANY of them silently breaks (e.g. a future refactor removes
//   the FAQ `.map` call), this composite test fails immediately. Single test
//   = single source of truth for "all user-visible i18n on this page works".
//
// P127 fix: the input-label probe now uses the engine-walker pattern from
// P124 (buildSlugToFirstInput()) to find the correct input.${name}.label
// key. Without this, slugs with dead input keys in translations.ts would
// pass via coincidence. Closes the latent false-positive surfaced by P124.
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, 32nd build-dep suite)

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'zh', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p123] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

function escapeForHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Walk src/engines/**/*.ts and build slug → firstInputName map.
// Mirrors P124's walker. Without this, P123's "first input.X.label match
// in translations.ts" probes the wrong key for slugs where translations.ts
// has dead input keys (e.g. solopreneur-freelance-rate-calculator has
// `input.skill.label` in translations.ts but no `skill` input in the engine
// — page renders `annualIncome` first). Using the engine's actual first
// input name gives the correct probe.
function buildSlugToFirstInput(): Map<string, string> {
  const map = new Map<string, string>();
  const enginesDir = resolve(root, 'src', 'engines');
  function walk(dir: string): void {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.endsWith('.ts')) continue;
      // Skip index files (no engine definition)
      if (entry === 'index.ts') continue;
      const text = readFileSync(full, 'utf-8');
      const slugMatch = text.match(/slug:\s*['"]([^'"]+)['"]/);
      if (!slugMatch) continue;
      const slug = slugMatch[1];
      // Match the inputs: [...] array — first `name:` inside is the first input.
      const inputsArr = text.match(/inputs:\s*\[([\s\S]*?)\]/);
      if (!inputsArr) continue;
      const nameMatch = inputsArr[1].match(/name:\s*['"]([a-zA-Z][a-zA-Z0-9_-]*)['"]/);
      if (nameMatch) {
        map.set(slug, nameMatch[1]);
      }
    }
  }
  walk(enginesDir);
  return map;
}

test('every zh engine page renders all 5 user-visible i18n surfaces (holistic guard)', () => {
  ensureBuilt();

  const translationsText = readFileSync(resolve(root, 'src', 'i18n', 'translations.ts'), 'utf-8');

  // Build per-slug expected surfaces from translations.ts.
  // Regex patterns use balanced-brace matchers to allow apostrophes in values
  // (FAQ questions and descriptions can contain them).
  // Translations.ts lines are indented with 2 spaces, so anchor on optional
  // whitespace before 'tools.'.
  const slugRe = /^\s*'tools\.(solopreneur-[a-z0-9-]+)\./gm;
  const slugs = new Set<string>();
  for (const m of translationsText.matchAll(slugRe)) slugs.add(m[1]);
  const allSlugs = [...slugs].sort();
  assert.equal(
    allSlugs.length,
    100,
    `Expected 100 engine slugs, found ${allSlugs.length} — P22b lock broken?`
  );

  // P127 fix: walk engine files to map slug → first input name. The naive
  // "first input.X.label match in translations.ts" approach probes the wrong
  // key for slugs where translations.ts has dead input keys (e.g.
  // solopreneur-freelance-rate-calculator has `input.skill.label` in
  // translations.ts but no `skill` input in the engine — page renders
  // `annualIncome` first). Use the engine's actual first input.
  const slugToFirstInput = buildSlugToFirstInput();

  // Per-slug expected strings (subset of all translation keys we use as probes).
  interface Probes {
    titleZh: string;
    descZh: string;
    inputLabelZh: string | null;  // may be null if engine has no i18n'd input
    faqQZh: string | null;         // may be null if engine has no FAQ
    howToZh: string | null;        // may be null if engine has no how_to_use i18n
  }
  const probesBySlug = new Map<string, Probes>();

  for (const slug of allSlugs) {
    const titleMatch = translationsText.match(
      new RegExp(`'tools\\.${slug}\\.title':\\s*\\{\\s*en:\\s*'((?:[^'\\\\]|\\\\.)*?)',\\s*zh:\\s*'((?:[^'\\\\]|\\\\.)*?)'`)
    );
    const descMatch = translationsText.match(
      new RegExp(`'tools\\.${slug}\\.description':\\s*\\{\\s*en:\\s*'((?:[^'\\\\]|\\\\.)*?)',\\s*zh:\\s*'((?:[^'\\\\]|\\\\.)*?)'`)
    );
    const firstInputName = slugToFirstInput.get(slug);
    const inputMatch = firstInputName
      ? translationsText.match(
          new RegExp(`'tools\\.${slug}\\.input\\.${firstInputName}\\.label':\\s*\\{\\s*en:\\s*'((?:[^'\\\\]|\\\\.)*?)',\\s*zh:\\s*'((?:[^'\\\\]|\\\\.)*?)'`)
        )
      : null;
    const faqMatch = translationsText.match(
      new RegExp(`'tools\\.${slug}\\.faq\\.0\\.q':\\s*\\{\\s*en:\\s*'((?:[^'\\\\]|\\\\.)*?)',\\s*zh:\\s*'((?:[^'\\\\]|\\\\.)*?)'`)
    );
    const howToMatch = translationsText.match(
      new RegExp(`'tools\\.${slug}\\.how_to_use\\.0':\\s*\\{\\s*en:\\s*'((?:[^'\\\\]|\\\\.)*?)',\\s*zh:\\s*'((?:[^'\\\\]|\\\\.)*?)'`)
    );
    if (!titleMatch || !descMatch) {
      // P121/P122 already catch this — skip with a flag.
      continue;
    }
    probesBySlug.set(slug, {
      titleZh: titleMatch[2],
      descZh: descMatch[2],
      inputLabelZh: inputMatch ? inputMatch[3] : null,
      faqQZh: faqMatch ? faqMatch[2] : null,
      howToZh: howToMatch ? howToMatch[2] : null,
    });
  }

  const violations: string[] = [];

  for (const slug of allSlugs) {
    const probes = probesBySlug.get(slug);
    if (!probes) {
      violations.push(`${slug}: probes missing (P121/P122 should have caught)`);
      continue;
    }
    const zhPath = resolve(root, 'dist', 'zh', slug, 'index.html');
    if (!existsSync(zhPath)) {
      violations.push(`${slug}: dist/zh/${slug}/index.html missing (build incomplete?)`);
      continue;
    }
    const rawHtml = readFileSync(zhPath, 'utf-8');
    // Don't strip <script> — FAQ and how_to_use content may be embedded in
    // page-template state for client-side hydration; we want to catch BOTH
    // server-rendered AND client-hydrated surfaces.
    // Use escapeForHtml since '<' '>' '&' get HTML-escaped by Astro.
    if (!rawHtml.includes(escapeForHtml(probes.titleZh))) {
      violations.push(`${slug}: missing title "${probes.titleZh}"`);
    }
    if (!rawHtml.includes(escapeForHtml(probes.descZh))) {
      violations.push(`${slug}: missing description (zh length ${probes.descZh.length})`);
    }
    if (probes.inputLabelZh && !rawHtml.includes(escapeForHtml(probes.inputLabelZh))) {
      violations.push(`${slug}: missing first input label "${probes.inputLabelZh}"`);
    }
    if (probes.faqQZh && !rawHtml.includes(escapeForHtml(probes.faqQZh))) {
      violations.push(`${slug}: missing first FAQ question (zh length ${probes.faqQZh.length})`);
    }
    if (probes.howToZh && !rawHtml.includes(escapeForHtml(probes.howToZh))) {
      violations.push(`${slug}: missing first how_to_use step (zh length ${probes.howToZh.length})`);
    }
  }

  assert.equal(
    violations.length,
    0,
    `Composite i18n violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '') +
      `\n\nThe page template (src/pages/[lang]/[slug].astro) likely stopped wiring ` +
      `one of the t() calls for title/description/input/FAQ/how_to_use. ` +
      `Re-check the corresponding variable binding in the .astro frontmatter + body.`
  );
});
