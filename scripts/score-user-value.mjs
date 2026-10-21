#!/usr/bin/env node
// scripts/score-user-value.mjs
// Derive the User Value Score (p140f §15.2) for every engine from mechanical
// signals in the engine source, and write src/data/user-value-scores.json.
//
//   node scripts/score-user-value.mjs          # regenerate the JSON
//   node scripts/score-user-value.mjs --check  # assert the JSON is up to date
//
// Why mechanical signals instead of free-form judgement:
//   - Reproducible: re-running gives the same numbers, so a diff in the JSON
//     always means a signal changed, not that someone re-judged it.
//   - Auditable: every score can be traced to a literal in the engine source.
//   - The result is reviewed by a human spot-check (see P153 §4.3) — the
//     rubric is the contract, this script is the mechanical transcription.
//
// Formula (p140f §15.2, arithmetic mean — see the 2026-10-21 correction in
// that spec: the original product form could never reach the 0.7 threshold):
//
//   User Value Score = (功能价值 + UX + Advisor + Retention + Advocacy) / 5
//
// Each dimension is scored 0 / 0.5 / 1. Threshold: 0.7 (sum of the five
// dimensions must be >= 3.5).
//
// This score is an INTERNAL admission gate. It is never rendered on a page —
// a self-assessed "our tool scores 0.9" block on a page would be exactly the
// kind of low-value self-congratulatory content that got the site rejected.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ENGINES_DIR = path.join(ROOT, 'src', 'engines');
const OUT_PATH = path.join(ROOT, 'src', 'data', 'user-value-scores.json');

const THRESHOLD = 0.7;
const REVIEWED_AT = '2026-10-21';
const CHECK_MODE = process.argv.includes('--check');

const log = (m) => console.log(`[score-user-value] ${m}`);

// 6 non-calculator engine files (Phase 1 naming exceptions) — same list the
// playbook-6-fields guard uses, so both see exactly the same 100 engines.
const NON_CALCULATOR_ENGINE_FILES = new Set([
  'ai-api-cost-comparison.ts',
  'ai-training-cost-estimator.ts',
  'productivity-score.ts',
  'saas-pricing-planner.ts',
  'market-size-estimator.ts',
  'revenue-projector.ts',
]);

const EMOJI = {
  decision: '\u{1F9ED}', // 🧭
  health: '\u{1FA7A}', // 🩺
  whatIf: '\u{1F504}', // 🔄
  breakEven: '\u{2696}', // ⚖️
  milestone: '\u{1F3AF}', // 🎯
  tip: '\u{1F4A1}', // 💡
};

const L5_TAGS = [
  `${EMOJI.decision} Decision Question`,
  `${EMOJI.decision} Recommendation`,
  `${EMOJI.decision} Key Uncertainty`,
  `${EMOJI.decision} Next Action`,
];

// Boundary / warning wording — evidence the tool tells the user when NOT to
// use it, i.e. it behaves like an advisor rather than a number printer.
//
// The marker set is deliberately strict: a loose set (adding 不是 / 而非)
// matches every engine's boilerplate and produces a dimension where all 100
// engines score 1.0 — i.e. no discrimination at all.
const BOUNDARY_MARKERS = [
  '不该用',
  '陷阱',
  '局限',
  '不建议',
  '⚠️',
  '不要用',
  '慎用',
  'caveat',
];

// Cross-tool links — evidence the output is worth following / sharing.
const CROSS_TOOL_RE = /\[[^\]]*Calculator\]/g;

function findEngines(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findEngines(full));
    else if (entry.name.endsWith('-calculator.ts') || NON_CALCULATOR_ENGINE_FILES.has(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** 维度 1 — 功能价值:输出的是「决策建议」还是「数字」? */
function scoreFunctionalValue(src) {
  const l5 = L5_TAGS.filter((t) => src.includes(t)).length;
  if (l5 === 4) return { value: 1, signals: { l5Tags: 4 } };
  if (/playbook\s*:/.test(src)) return { value: 0.5, signals: { l5Tags: l5 } };
  return { value: 0, signals: { l5Tags: l5 } };
}

/** 维度 2 — UX:输入有标签/边界,输出有解读段。 */
function scoreUx(src) {
  const inputEntries = src.match(/\{ name: [^\n]*/g) || [];
  const labeled = inputEntries.filter((e) => e.includes('label:')).length;
  const inputRatio = inputEntries.length ? labeled / inputEntries.length : 0;

  const sections = [EMOJI.health, EMOJI.whatIf, EMOJI.breakEven, EMOJI.milestone, EMOJI.tip]
    .filter((e) => src.includes(e)).length;

  if (inputRatio >= 0.99 && sections >= 4) return { value: 1, signals: { inputRatio, sections } };
  if (inputRatio >= 0.5 || sections >= 3) return { value: 0.5, signals: { inputRatio, sections } };
  return { value: 0, signals: { inputRatio, sections } };
}

/** 维度 3 — Advisor:有没有告诉用户「什么时候不该用它」。 */
function scoreAdvisor(src) {
  const hits = BOUNDARY_MARKERS.reduce((n, m) => n + (src.split(m).length - 1), 0);
  if (hits >= 2) return { value: 1, signals: { boundaryMarkers: hits } };
  if (hits >= 1) return { value: 0.5, signals: { boundaryMarkers: hits } };
  return { value: 0, signals: { boundaryMarkers: hits } };
}

/** 维度 4 — Retention:有没有复访理由(可保存的快照 / 投影 / 里程碑)。 */
function scoreRetention(src) {
  const snapshot = /snapshot|Saved Scenario|saved scenario/i.test(src);
  const milestone = src.includes(EMOJI.milestone);
  const projection = /projectionMonths|Projection/i.test(src);
  if (snapshot) return { value: 1, signals: { snapshot, milestone, projection } };
  if (milestone || projection) return { value: 0.5, signals: { snapshot, milestone, projection } };
  return { value: 0, signals: { snapshot, milestone, projection } };
}

/** 维度 5 — Advocacy:输出能不能被分享 / 带到别的工具。 */
function scoreAdvocacy(src) {
  const links = (src.match(CROSS_TOOL_RE) || []).length;
  if (links >= 1) return { value: 1, signals: { crossToolLinks: links } };
  if (/Decision Report|decision report|report-builder|Report/i.test(src)) {
    return { value: 0.5, signals: { crossToolLinks: links } };
  }
  return { value: 0, signals: { crossToolLinks: links } };
}

function scoreEngine(file) {
  const src = fs.readFileSync(file, 'utf8');
  // The registered slug is the authoritative key (it matches src/data/tools/*.ts
  // and the engine registry). Both quote styles are in use across the 100
  // engines (7 of them use double quotes), so match either.
  // Fall back to the filename if the field is missing.
  const slugMatch = src.match(/\bslug\s*:\s*['"]([^'"]+)['"]/);
  const slug = slugMatch
    ? slugMatch[1]
    : path.basename(file).replace(/-calculator\.ts$/, '').replace(/\.ts$/, '');

  const functional = scoreFunctionalValue(src);
  const ux = scoreUx(src);
  const advisor = scoreAdvisor(src);
  const retention = scoreRetention(src);
  const advocacy = scoreAdvocacy(src);

  const dims = {
    functionalValue: functional.value,
    ux: ux.value,
    advisor: advisor.value,
    retention: retention.value,
    advocacy: advocacy.value,
  };
  const sum = Object.values(dims).reduce((a, b) => a + b, 0);
  const score = Math.round((sum / 5) * 100) / 100;

  return {
    slug,
    dims,
    score,
    signals: {
      functionalValue: functional.signals,
      ux: ux.signals,
      advisor: advisor.signals,
      retention: retention.signals,
      advocacy: advocacy.signals,
    },
  };
}

const engines = findEngines(ENGINES_DIR).sort();
log(`Found ${engines.length} engines.`);

const scores = {};
for (const file of engines) {
  const { slug, dims, score, signals } = scoreEngine(file);
  // `admitted` is the gate decision itself, stored so that CI can check the
  // decision against the threshold independently. Without a stored decision,
  // "低于阈值的引擎被拒绝" would be a tautology (the test would recompute the
  // same predicate it is supposed to verify).
  scores[slug] = { ...dims, score, admitted: score >= THRESHOLD, signals, reviewedAt: REVIEWED_AT };
}

const payload = {
  version: 1,
  threshold: THRESHOLD,
  formula: '(functionalValue + ux + advisor + retention + advocacy) / 5',
  generatedBy: 'scripts/score-user-value.mjs',
  note: 'Internal admission gate only — never rendered on a page.',
  scores,
};

const serialized = JSON.stringify(payload, null, 2) + '\n';

if (CHECK_MODE) {
  if (!fs.existsSync(OUT_PATH)) {
    console.error(`[score-user-value] FAIL: ${path.relative(ROOT, OUT_PATH)} does not exist.`);
    process.exit(1);
  }
  const current = fs.readFileSync(OUT_PATH, 'utf8');
  if (current !== serialized) {
    console.error('[score-user-value] FAIL: user-value-scores.json is stale.');
    console.error('  Fix: run `node scripts/score-user-value.mjs` and commit the result.');
    process.exit(1);
  }
  log('PASSED: user-value-scores.json is up to date.');
  process.exit(0);
}

fs.writeFileSync(OUT_PATH, serialized, 'utf8');

const values = Object.values(scores);
const atOrAbove = values.filter((v) => v.score >= THRESHOLD).length;
const below = values.filter((v) => v.score < THRESHOLD).length;
log(`Wrote ${path.relative(ROOT, OUT_PATH)} (${values.length} engines).`);
log(`Score >= ${THRESHOLD}: ${atOrAbove}   below: ${below}`);
for (const key of ['functionalValue', 'ux', 'advisor', 'retention', 'advocacy']) {
  const dist = {};
  for (const v of values) dist[v[key]] = (dist[v[key]] || 0) + 1;
  const parts = Object.keys(dist)
    .sort()
    .map((k) => `${k}:${dist[k]}`)
    .join(' ');
  log(`  ${key.padEnd(16)} ${parts}`);
}
