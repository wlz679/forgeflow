#!/usr/bin/env node
// tests/scripts/check-i18n-completeness.test.mjs
//
// Guards the LIVE i18n drift detector: scripts/check-i18n-completeness.mjs,
// which runs as the `prebuild` gate of every `pnpm build`.
//
// WHY THIS GUARD EXISTS
// ---------------------
// 1. The gate is a BUILD gate: nothing runs it except `pnpm build`. When it
//    was wrong, the failure surfaced as "the build broke", hours later, with
//    no test pointing at the gate itself.
//      - P153 §7.8: the gate's REQUIRED_KEYS list had drifted into a SECOND,
//        contradictory contract. It still demanded five keys that nothing
//        renders (eeat.reviewed_by / eeat.team / eeat.author_label /
//        eeat.publisher_label / favorites.saved_count). Deleting them broke
//        `pnpm build` — whose prebuild step runs this check — which wiped
//        dist/ mid-suite and cascaded into a dozen unrelated dist/-reading
//        failures. The pruning of those five keys was INTENTIONAL and must
//        not be undone; the test below pins that.
//      - P150: the translations.ts → per-locale JSON migration dropped nine
//        engine_cost.* keys. The gate did not notice; the Chinese AI-cost
//        pages shipped raw key names ("engine_cost.comparison_title") to
//        production.
// 2. The gate had NO test at all. The two suites that guarded it were written
//    on the never-merged branch feat/i18n-drift-fix (2026-06-23) and stayed
//    there for three months while the gate itself was squash-merged.
//
// HOW THE GATE IS EXERCISED HERE
// ------------------------------
// The gate has NO CLI: it takes no --root and no --strict, and it resolves
// its root from its own location (`resolve(__dirname, '..')`). It also has no
// orphan-key detection any more — that moved to tests/translation-glossary-
// guard.test.ts ("no orphan translation keys"), which the gate's own comment
// points at. So the original branch's `--strict` / orphan assertions have no
// counterpart to test and were dropped (see the porting notes in the PR
// description); what is tested here is the behaviour the gate DOES have.
//
// Because there is no --root, the fixture is exercised by COPYING the real
// gate into the fixture tree: the copy's __dirname/.. IS the fixture root.
// The code under test is therefore the real script, byte for byte — not a
// re-implementation of it.
//
// Build dependency: NONE (source-only). The gate is a plain node script; the
// fixture lives in tests/scripts/fixtures/clean.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const GATE = path.join(REPO_ROOT, 'scripts/check-i18n-completeness.mjs');
const FIXTURE = path.join(__dirname, 'fixtures/clean');

/**
 * The extract output the gate reads for engine-level keys
 * (scripts/.scratch/_archive/i18n-needed.json). The engine check runs FIRST
 * and exits before the static key list is checked, so it needs its own pass.
 */
const EXTRACT = {
  tools: [
    {
      slug: 'test-engine',
      inputLabels: { amount: 'Amount' },
      inputPlaceholders: { amount: 'e.g. 1000' },
      faq: [{ q: 'What is this?', a: 'A fixture question.' }],
      howToUse: ['First step.', 'Second step.'],
    },
  ],
};

/**
 * Stage a throwaway copy of the clean fixture with the REAL gate inside it,
 * so the gate's `resolve(__dirname, '..')` points at the fixture root.
 * Returns the path; the caller must remove it.
 */
function stageTree(mutate) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ffk-i18n-gate-'));
  fs.cpSync(FIXTURE, dir, { recursive: true });
  fs.mkdirSync(path.join(dir, 'scripts/.scratch/_archive'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'scripts/.scratch/_archive/i18n-needed.json'),
    JSON.stringify(EXTRACT, null, 2),
  );
  // The code under test: the real script, unmodified.
  fs.copyFileSync(GATE, path.join(dir, 'scripts/check-i18n-completeness.mjs'));
  if (mutate) mutate(dir);
  return dir;
}

/** Run the staged gate. Returns { status, output } — output is stdout+stderr. */
function runGate(dir) {
  const r = spawnSync('node', [path.join(dir, 'scripts/check-i18n-completeness.mjs')], {
    encoding: 'utf8',
  });
  return { status: r.status, output: `${r.stdout ?? ''}\n${r.stderr ?? ''}` };
}

/** Stage → run → clean up. The gate never runs against the repo itself. */
function withGate(mutate) {
  const dir = stageTree(mutate);
  try {
    return runGate(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Remove a key from one of the staged locale files. */
function dropKey(dir, locale, key) {
  const file = path.join(dir, 'src/i18n/locales', `${locale}.json`);
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.ok(key in json, `fixture key ${key} not found in ${locale}.json — regenerate the fixture`);
  delete json[key];
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
}

// ---------------------------------------------------------------------------
// 1. The live gate, on the live repo.
// ---------------------------------------------------------------------------

test('the live prebuild gate passes on the real repo', () => {
  const r = spawnSync('node', [GATE], { encoding: 'utf8', cwd: REPO_ROOT });
  const output = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
  assert.equal(
    r.status,
    0,
    `scripts/check-i18n-completeness.mjs FAILED on the real repo (exit ${r.status}). ` +
      `This is the 'prebuild' gate — \`pnpm build\` is broken until it is fixed.\n${output}`,
  );
  assert.match(output, /i18n completeness check passed/);
});

// ---------------------------------------------------------------------------
// 2. The clean fixture.
// ---------------------------------------------------------------------------

test('clean fixture passes (exit 0)', () => {
  const r = withGate(null);
  assert.equal(r.status, 0, `expected exit 0 on a clean tree, got ${r.status}\n${r.output}`);
  assert.match(r.output, /i18n completeness check passed/);
});

test('the five keys P153 §7.8 pruned are NOT required by the gate', () => {
  // eeat.reviewed_by / eeat.team / eeat.author_label / eeat.publisher_label /
  // favorites.saved_count were proven unreferenced and deleted. The gate's
  // REQUIRED_KEYS list was pruned to match. If anyone re-adds them to the
  // gate, the clean fixture (which omits them) stops passing — that is the
  // point of this test.
  const pruned = [
    'eeat.reviewed_by',
    'eeat.team',
    'eeat.author_label',
    'eeat.publisher_label',
    'favorites.saved_count',
  ];
  const en = JSON.parse(fs.readFileSync(path.join(FIXTURE, 'src/i18n/locales/en.json'), 'utf8'));
  for (const key of pruned) {
    assert.ok(!(key in en), `fixture unexpectedly contains ${key} — the fixture no longer pins the pruning`);
  }
  const r = withGate(null);
  assert.equal(r.status, 0, `gate demands a pruned key again (exit ${r.status})\n${r.output}`);
});

// ---------------------------------------------------------------------------
// 3. Drift detection.
// ---------------------------------------------------------------------------

test('a missing key fails the gate and is named in the output', () => {
  const r = withGate((dir) => dropKey(dir, 'en', 'eeat.title'));
  assert.equal(r.status, 1, `expected exit 1 on drift, got ${r.status}\n${r.output}`);
  assert.match(r.output, /eeat\.title/, `key name missing from output:\n${r.output}`);
  assert.match(r.output, /missing in en\.json/, `locale missing from output:\n${r.output}`);
});

test('missing keys are reported PER LOCALE (en and zh named separately)', () => {
  const en = withGate((dir) => dropKey(dir, 'en', 'eeat.title'));
  assert.equal(en.status, 1);
  assert.match(en.output, /eeat\.title \(missing in en\.json\)/, `en output wrong:\n${en.output}`);

  const zh = withGate((dir) => dropKey(dir, 'zh', 'favorites.title'));
  assert.equal(zh.status, 1);
  assert.match(zh.output, /favorites\.title \(missing in zh\.json\)/, `zh output wrong:\n${zh.output}`);
  // The zh-only drift must NOT be reported as an en drift.
  assert.doesNotMatch(zh.output, /favorites\.title \(missing in en\.json\)/, `locale misattributed:\n${zh.output}`);
});

test('every missing key is reported, not just the first', () => {
  const r = withGate((dir) => {
    dropKey(dir, 'en', 'eeat.title');
    dropKey(dir, 'en', 'about.mission.h1');
  });
  assert.equal(r.status, 1);
  assert.match(r.output, /eeat\.title/);
  assert.match(r.output, /about\.mission\.h1/);
});

test('engine-level how_to_use drift is detected and names the key', () => {
  // This is the assertion the original branch test made (it looked for
  // `how_to_use.1`); the current gate reports engine keys through the
  // extract output, with the engine slug in the prefix.
  const r = withGate((dir) => dropKey(dir, 'en', 'tools.test-engine.how_to_use.1'));
  assert.equal(r.status, 1, `expected exit 1 on engine drift, got ${r.status}\n${r.output}`);
  assert.match(
    r.output,
    /\[engine:test-engine\] tools\.test-engine\.how_to_use\.1 \(missing in en\.json\)/,
    `engine key not reported as expected:\n${r.output}`,
  );
});

test('engine-level drift is reported per locale too', () => {
  const r = withGate((dir) => dropKey(dir, 'zh', 'tools.test-engine.faq.0.q'));
  assert.equal(r.status, 1, `expected exit 1 on engine drift, got ${r.status}\n${r.output}`);
  assert.match(
    r.output,
    /\[engine:test-engine\] tools\.test-engine\.faq\.0\.q \(missing in zh\.json\)/,
    `engine key not reported as expected:\n${r.output}`,
  );
});

test('a missing tool key is not attributed to an adjacent tool (no cross-slug bleed)', () => {
  // The original branch test guarded a preset-key bleed: one slug's keys were
  // attributed to the neighbouring slug. The current gate derives
  // tools.{slug}.title / .description per slug from src/data/tools/*.ts, so
  // the same class of bug is a cross-slug attribution. engine-a and engine-b
  // are adjacent in the fixture's tool file for exactly this reason.
  const r = withGate((dir) => dropKey(dir, 'en', 'tools.engine-a.title'));
  assert.equal(r.status, 1, `expected exit 1 on drift, got ${r.status}\n${r.output}`);
  assert.match(r.output, /tools\.engine-a\.title/, `offending slug not named:\n${r.output}`);
  assert.doesNotMatch(r.output, /tools\.engine-b\.title/, `key bled into the adjacent slug:\n${r.output}`);
});

test('a missing dynamic tool key is reported (new tools cannot ship untranslated)', () => {
  // The gate derives tools.{slug}.title / .description from src/data/tools —
  // a tool added without locale keys must fail the build.
  const r = withGate((dir) => dropKey(dir, 'en', 'tools.engine-b.description'));
  assert.equal(r.status, 1, `expected exit 1 on drift, got ${r.status}\n${r.output}`);
  assert.match(r.output, /tools\.engine-b\.description \(missing in en\.json\)/, `output wrong:\n${r.output}`);
});
