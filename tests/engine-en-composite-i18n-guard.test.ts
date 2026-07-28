#!/usr/bin/env node
// P124 — EN-side sibling of P123. Holistic CI guard: for every en engine page,
// verify the most user-visible i18n surfaces all rendered. Single test covers
// 5 invariants:
//   1. Title translated + present in <title>/<h1>
//   2. Description translated + present in <meta name="description">/visible <p>
//   3. At least 1 input label translated (i18n wiring works for the form)
//   4. At least 1 FAQ question translated (i18n wiring works for the FAQ list)
//   5. At least 1 how_to_use step translated (i18n wiring works for the steps)
//
// Why this is one test (not 5):
//   P123 covers zh pages. P124 covers en pages with identical structure but
//   probes the en value of each translation key. Together P123+P124 = 1000
//   page checks (500 en + 500 zh) on the same 5 surfaces. If the page template's
//   `t()` call paths for any of the 5 surfaces silently break for EN, P124 fails
//   immediately. Symmetric guard — defends against regressions specific to the
//   English rendering path (e.g. t() default lang drift).
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, 33rd build-dep suite)

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
  const probe = resolve(root, 'dist', 'en', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p124] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

// Walk src/engines/**/*.ts and build slug → firstInputName map.
// Why this is needed: P123's first attempt probed the FIRST input.label match
// in translations.ts, but for solopreneur-freelance-rate-calculator the
// first match is `input.skill.label` — a dead key (the engine has no `skill`
// input). The page actually renders `annualIncome` first. Using the engine's
// first input name gives the correct probe.
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

function escapeForHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

test('every en engine page renders all 5 user-visible i18n surfaces (holistic guard)', () => {
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

  // P124 fix: walk engine files to map slug → first input name. The naive
  // "first input.X.label match in translations.ts" approach probes the wrong
  // key for slugs where translations.ts has dead input keys (e.g.
  // solopreneur-freelance-rate-calculator has `input.skill.label` in
  // translations.ts but no `skill` input in the engine — page renders
  // `annualIncome` first). Use the engine's actual first input.
  const slugToFirstInput = buildSlugToFirstInput();

  // Per-slug expected strings (subset of all translation keys we use as probes).
  // P124 differs from P123 in two ways:
  //   1. Walks dist/en/ instead of dist/zh/
  //   2. Uses the en value (group[1]) instead of zh value (group[2]) as the probe
  interface Probes {
    titleEn: string;
    descEn: string;
    inputLabelEn: string | null;  // may be null if engine has no i18n'd input
    faqQEn: string | null;         // may be null if engine has no FAQ
    howToEn: string | null;        // may be null if engine has no how_to_use i18n
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
      titleEn: titleMatch[1],   // P124: en value, not zh
      descEn: descMatch[1],
      inputLabelEn: inputMatch ? inputMatch[1] : null,
      faqQEn: faqMatch ? faqMatch[1] : null,
      howToEn: howToMatch ? howToMatch[1] : null,
    });
  }

  const violations: string[] = [];

  for (const slug of allSlugs) {
    const probes = probesBySlug.get(slug);
    if (!probes) {
      violations.push(`${slug}: probes missing (P121/P122 should have caught)`);
      continue;
    }
    const enPath = resolve(root, 'dist', 'en', slug, 'index.html');
    if (!existsSync(enPath)) {
      violations.push(`${slug}: dist/en/${slug}/index.html missing (build incomplete?)`);
      continue;
    }
    const rawHtml = readFileSync(enPath, 'utf-8');
    // Don't strip <script> — FAQ and how_to_use content may be embedded in
    // page-template state for client-side hydration; we want to catch BOTH
    // server-rendered AND client-hydrated surfaces.
    // Use escapeForHtml since '<' '>' '&' get HTML-escaped by Astro.
    if (!rawHtml.includes(escapeForHtml(probes.titleEn))) {
      violations.push(`${slug}: missing title "${probes.titleEn}"`);
    }
    if (!rawHtml.includes(escapeForHtml(probes.descEn))) {
      violations.push(`${slug}: missing description (en length ${probes.descEn.length})`);
    }
    if (probes.inputLabelEn && !rawHtml.includes(escapeForHtml(probes.inputLabelEn))) {
      violations.push(`${slug}: missing first input label "${probes.inputLabelEn}"`);
    }
    if (probes.faqQEn && !rawHtml.includes(escapeForHtml(probes.faqQEn))) {
      violations.push(`${slug}: missing first FAQ question (en length ${probes.faqQEn.length})`);
    }
    if (probes.howToEn && !rawHtml.includes(escapeForHtml(probes.howToEn))) {
      violations.push(`${slug}: missing first how_to_use step (en length ${probes.howToEn.length})`);
    }
  }

  assert.equal(
    violations.length,
    0,
    `Composite i18n violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '') +
      `\n\nThe page template (src/pages/[lang]/[slug].astro) likely stopped wiring ` +
      `one of the t() calls for title/description/input/FAQ/how_to_use on EN pages. ` +
      `Re-check the corresponding variable binding in the .astro frontmatter + body.`
  );
});