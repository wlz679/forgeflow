// Regenerates tests/scripts/fixtures/clean/ — the contract fixture for
// tests/scripts/check-i18n-completeness.test.mjs.
//
// WHY THIS FILE EXISTS
// --------------------
// The gate (scripts/check-i18n-completeness.mjs) demands a hardcoded list of
// required keys (eeat.*, about.*, category.{A-F}.*, header.*, favorites.*,
// recent.*, history.*) PLUS keys derived from src/data/categories.ts and
// src/data/tools/*.ts. A fixture that hand-maintains that list would rot the
// moment the gate's list changes.
//
// So the fixture is GENERATED: this script boots the real gate against a
// throwaway tree whose locale files are empty, harvests every key the gate
// asks for (from the gate's own failure output), and writes those keys into
// the fixture's en.json / zh.json. The result is a tree the gate accepts,
// by construction — while the TEST still exercises real drift by deleting
// keys from a copy of it.
//
// Run after changing the gate's REQUIRED_KEYS or after adding a category /
// tool to the fixture:
//
//     node tests/scripts/fixtures/regen-fixture.mjs
//
// The output is deterministic: keys are sorted, values are placeholders.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const GATE = path.join(REPO_ROOT, 'scripts/check-i18n-completeness.mjs');
const OUT_DIR = path.join(__dirname, 'clean');

/** The extract output the gate reads for engine-level keys. */
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

const CATEGORIES_TS = `// Fixture data — the gate derives category.{X}.name / .desc from here.
export const categories = [
  { id: 'A', name: 'SaaS Metrics', desc: 'SaaS metric calculators.' },
  { id: 'B', name: 'AI Cost Tools', desc: 'AI cost calculators.' },
];
`;

const TOOLS_TS = `// Fixture data — the gate derives tools.{slug}.title / .description from here.
export const tools = [
  { slug: 'engine-a', title: 'Engine A', description: 'Engine A computes A.' },
  { slug: 'engine-b', title: 'Engine B', description: 'Engine B computes B.' },
];
`;

const ENGINE_TS = `// Fixture engine — engineKey: true makes the gate check its
// input / faq / how_to_use keys against the locale files.
export const engine = {
  slug: 'test-engine',
  engineKey: true,
  title: 'Test Engine',
  description: 'A fixture engine.',
  inputs: [{ name: 'amount', label: 'Amount', placeholder: 'e.g. 1000' }],
  faq: [{ q: 'What is this?', a: 'A fixture question.' }],
  howToUse: ['First step.', 'Second step.'],
};
`;

/** Build a throwaway tree and return its path. */
function scaffold(dir) {
  fs.mkdirSync(path.join(dir, 'src/data/tools'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'src/engines'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'src/i18n/locales'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'scripts/.scratch/_archive'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src/data/categories.ts'), CATEGORIES_TS);
  fs.writeFileSync(path.join(dir, 'src/data/tools/test-tools.ts'), TOOLS_TS);
  fs.writeFileSync(path.join(dir, 'src/engines/test-engine.ts'), ENGINE_TS);
  fs.writeFileSync(path.join(dir, 'src/i18n/locales/en.json'), '{}');
  fs.writeFileSync(path.join(dir, 'src/i18n/locales/zh.json'), '{}');
  fs.copyFileSync(GATE, path.join(dir, 'scripts/check-i18n-completeness.mjs'));
  return dir;
}

/** Run the gate inside `dir`; returns { status, output }. */
function runGate(dir) {
  const r = spawnSync('node', [path.join(dir, 'scripts/check-i18n-completeness.mjs')], {
    encoding: 'utf8',
  });
  return { status: r.status, output: `${r.stdout ?? ''}\n${r.stderr ?? ''}` };
}

/** Harvest `key` from the gate's "missing" lines. */
function harvest(output) {
  const keys = new Set();
  for (const line of output.split('\n')) {
    const m = line.match(/^\s+\[[^\]]+\]\s+(\S+)\s+\(missing in (?:en|zh)\.json\)\s*$/);
    if (m) keys.add(m[1]);
  }
  return keys;
}

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'ffk-i18n-regen-'));
try {
  scaffold(scratch);

  // Pass 1 — engine-level keys. The engine check runs FIRST and exits before
  // the static list is checked, so it has to be harvested on its own.
  fs.writeFileSync(
    path.join(scratch, 'scripts/.scratch/_archive/i18n-needed.json'),
    JSON.stringify(EXTRACT, null, 2),
  );
  const engineRun = runGate(scratch);
  if (engineRun.status !== 1) {
    throw new Error(`expected the engine-level pass to fail (exit 1), got ${engineRun.status}\n${engineRun.output}`);
  }
  const engineKeys = harvest(engineRun.output);

  // Pass 2 — static + dynamic keys (no extract file → engine check skipped).
  fs.rmSync(path.join(scratch, 'scripts/.scratch/_archive/i18n-needed.json'));
  const staticRun = runGate(scratch);
  if (staticRun.status !== 1) {
    throw new Error(`expected the static pass to fail (exit 1), got ${staticRun.status}\n${staticRun.output}`);
  }
  const staticKeys = harvest(staticRun.output);

  const all = [...new Set([...engineKeys, ...staticKeys])].sort();
  if (all.length < 100) {
    throw new Error(`harvested only ${all.length} keys — the gate's output format probably changed:\n${staticRun.output}`);
  }

  const en = {};
  const zh = {};
  for (const key of all) {
    en[key] = `<${key}>`;
    zh[key] = `<${key}>`;
  }
  fs.writeFileSync(path.join(scratch, 'src/i18n/locales/en.json'), JSON.stringify(en, null, 2) + '\n');
  fs.writeFileSync(path.join(scratch, 'src/i18n/locales/zh.json'), JSON.stringify(zh, null, 2) + '\n');

  // Verify: the completed tree must now pass the gate.
  const verify = runGate(scratch);
  if (verify.status !== 0) {
    throw new Error(`regenerated fixture does not pass the gate (exit ${verify.status})\n${verify.output}`);
  }

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.cpSync(path.join(scratch, 'src'), path.join(OUT_DIR, 'src'), { recursive: true });

  console.log(`regenerated ${OUT_DIR}`);
  console.log(`  engine-level keys: ${engineKeys.size}`);
  console.log(`  static/dynamic keys: ${staticKeys.size}`);
  console.log(`  total keys per locale: ${all.length}`);
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
