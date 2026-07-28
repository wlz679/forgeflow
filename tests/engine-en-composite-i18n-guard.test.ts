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
// P128 extension: en-side mirror of P128 changes. Probes now cover ALL FAQ q/a
// entries and ALL how_to_use steps (not just [0]). Walks src/engines/**/*.ts
// to get the per-slug counts. Mirrors P127's buildSlugToFirstInput() walker
// pattern. Symmetric to P123 (which was zh-side); closes the second-half
// probe gap on the en side.
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

// Walk src/engines/**/*.ts and build slug → faqCount map.
// Counts `q: '...'` lines inside `faq: [...]` array. Each FAQ entry has exactly
// one `q:`, so the count gives the number of entries. Mirrors P127's
// buildSlugToFirstInput walker pattern.
function buildSlugToFaqCount(): Map<string, number> {
  const map = new Map<string, number>();
  const enginesDir = resolve(root, 'src', 'engines');
  function walk(dir: string): void {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) { walk(full); continue; }
      if (!entry.endsWith('.ts')) continue;
      if (entry === 'index.ts') continue;
      const text = readFileSync(full, 'utf-8');
      const slugMatch = text.match(/slug:\s*['"]([^'"]+)['"]/);
      if (!slugMatch) continue;
      const slug = slugMatch[1];
      // Match faq: [...] array (greedy enough to span the whole array).
      const faqArr = text.match(/faq:\s*\[([\s\S]*?)\n\s*\],/);
      if (faqArr) {
        // Count `q: '...'` or `q: "..."` lines (one per FAQ entry).
        // Match `q:` preceded by `{` or `,` (with optional whitespace) so both
        // single-line `{ q: "...", a: "..." },` and multi-line formats are counted.
        const qCount = (faqArr[1].match(/[{,]\s*q:\s*['"]/g) || []).length;
        map.set(slug, qCount);
      }
    }
  }
  walk(enginesDir);
  return map;
}

// Walk src/engines/**/*.ts and build slug → howToUseCount map.
// Counts top-level quoted strings inside `howToUse: [...]` array.
// Each entry is a quoted string on its own line.
function buildSlugToHowToCount(): Map<string, number> {
  const map = new Map<string, number>();
  const enginesDir = resolve(root, 'src', 'engines');
  function walk(dir: string): void {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) { walk(full); continue; }
      if (!entry.endsWith('.ts')) continue;
      if (entry === 'index.ts') continue;
      const text = readFileSync(full, 'utf-8');
      const slugMatch = text.match(/slug:\s*['"]([^'"]+)['"]/);
      if (!slugMatch) continue;
      const slug = slugMatch[1];
      // Match howToUse: [...] array.
      const howArr = text.match(/howToUse:\s*\[([\s\S]*?)\n\s*\],/);
      if (howArr) {
        // Count top-level string lines (each howTo entry is "..." on its own line).
        const sCount = (howArr[1].match(/^\s*['"]/gm) || []).length;
        map.set(slug, sCount);
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

  // P128: walker-driven counts for FAQ + how_to_use coverage (en side).
  const slugToFaqCount = buildSlugToFaqCount();
  const slugToHowToCount = buildSlugToHowToCount();

  // Per-slug expected strings (subset of all translation keys we use as probes).
  // P124 differs from P123 in two ways:
  //   1. Walks dist/en/ instead of dist/zh/
  //   2. Uses the en value (group[1]) instead of zh value (group[2]) as the probe
  interface Probes {
    titleEn: string;
    descEn: string;
    inputLabelEn: string | null;  // may be null if engine has no i18n'd input
    faqEn: string[];              // en values for every faq.${i}.q AND faq.${i}.a
    howToEn: string[];            // en values for every how_to_use.${i}
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
    // P128: build arrays of all FAQ q/a + how_to_use probes for this slug.
    // Note: the regex captures the JS source literal (e.g. `\'` stays as `\'`),
    // but the rendered HTML has the unescaped form (e.g. `&#39;`). For en probes
    // specifically, strip the JS source escape sequences so the captured value
    // matches what the HTML actually renders. (For zh this is a no-op since
    // Chinese text doesn't use apostrophes — see P123's symmetric probe loop.)
    const faqCount = slugToFaqCount.get(slug) ?? 0;
    const howToCount = slugToHowToCount.get(slug) ?? 0;
    const faqEn: string[] = [];
    for (let i = 0; i < faqCount; i++) {
      const qMatch = translationsText.match(
        new RegExp(`'tools\\.${slug}\\.faq\\.${i}\\.q':\\s*\\{\\s*en:\\s*'((?:[^'\\\\]|\\\\.)*?)',\\s*zh:\\s*'((?:[^'\\\\]|\\\\.)*?)'`)
      );
      const aMatch = translationsText.match(
        new RegExp(`'tools\\.${slug}\\.faq\\.${i}\\.a':\\s*\\{\\s*en:\\s*'((?:[^'\\\\]|\\\\.)*?)',\\s*zh:\\s*'((?:[^'\\\\]|\\\\.)*?)'`)
      );
      if (qMatch) faqEn.push(escapeForHtml(qMatch[1].replace(/\\(.)/g, '$1')));
      if (aMatch) faqEn.push(escapeForHtml(aMatch[1].replace(/\\(.)/g, '$1')));
    }
    const howToEn: string[] = [];
    for (let i = 0; i < howToCount; i++) {
      const m = translationsText.match(
        new RegExp(`'tools\\.${slug}\\.how_to_use\\.${i}':\\s*\\{\\s*en:\\s*'((?:[^'\\\\]|\\\\.)*?)',\\s*zh:\\s*'((?:[^'\\\\]|\\\\.)*?)'`)
      );
      if (m) howToEn.push(escapeForHtml(m[1].replace(/\\(.)/g, '$1')));
    }
    if (!titleMatch || !descMatch) {
      // P121/P122 already catch this — skip with a flag.
      continue;
    }
    probesBySlug.set(slug, {
      titleEn: titleMatch[1],   // P124: en value, not zh
      descEn: descMatch[1],
      inputLabelEn: inputMatch ? inputMatch[1] : null,
      faqEn,
      howToEn,
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
    for (let i = 0; i < probes.faqEn.length; i++) {
      if (!rawHtml.includes(probes.faqEn[i])) {
        violations.push(`${slug}: missing FAQ entry ${i} (en length ${probes.faqEn[i].length})`);
      }
    }
    for (let i = 0; i < probes.howToEn.length; i++) {
      if (!rawHtml.includes(probes.howToEn[i])) {
        violations.push(`${slug}: missing how_to_use step ${i} (en length ${probes.howToEn[i].length})`);
      }
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