#!/usr/bin/env node
// P52 marker-presence drift guard — 7 assertions enforcing the integrity
// of the 3 codegen scripts' literal marker strings.
//
// Why this test exists:
//   Each codegen script locates specific sections via literal marker
//   substrings (HTML comments for check-engine-count-by-category,
//   tableEndMarker for codegen-customfn, 'staticExamples: [' for
//   codegen-examples). When a marker is missing, the script has a silent-
//   skip fallback that still returns PASS for --check. P52 closes this
//   drift class by cross-checking all 3 scripts.
//
// Class taxonomy:
//   Class A (T1-T2): HTML comment markers in check-engine-count-by-category.mjs
//   Class B (T3): 「重生成不能漏掉引擎」（P168 B3-10 起：codegen 不再按 marker 定位表区）
//   Class C (T6-T7): 'staticExamples: [' marker + --check integration smoke
//
// Why tests/ root: P22b ESM trap — tests/run.mjs reads tests/*.test.ts only.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// === Source files under test ===
const ENGINE_COUNT_CHECK_SCRIPT = path.join(ROOT, 'scripts/check-engine-count-by-category.mjs');
const EXAMPLES_SCRIPT = path.join(ROOT, 'scripts/codegen-examples.mjs');
const ENGINE_DIR = path.join(ROOT, 'src', 'engines');

/** 递归列出目录下的 .ts 文件 */
function walk(dir: string, acc: string[]): string[] {
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (fs.statSync(p).isDirectory()) walk(p, acc);
    else if (entry.endsWith('.ts')) acc.push(p);
  }
  return acc;
}

// === Load all 3 sources once ===
const ENGINE_COUNT_CHECK_SOURCE = fs.readFileSync(ENGINE_COUNT_CHECK_SCRIPT, 'utf8');
const EXAMPLES_SOURCE = fs.readFileSync(EXAMPLES_SCRIPT, 'utf8');


// === Class A: HTML comment markers ===
const HTML_MARKER_START = '<!-- codegen:start engine-count -->';
const HTML_MARKER_END = '<!-- codegen:end -->';

// === Class C: codegen-examples marker ===
const EXAMPLES_MARKER = 'staticExamples: [';

// ===== Class A: HTML comment markers (T1 + T2) =====

// T1: both markers present in check-engine-count-by-category.mjs source
test('T1: scripts/check-engine-count-by-category.mjs has both HTML codegen markers', () => {
  assert.match(
    ENGINE_COUNT_CHECK_SOURCE,
    new RegExp(HTML_MARKER_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Missing start marker: ${HTML_MARKER_START}`
  );
  assert.match(
    ENGINE_COUNT_CHECK_SOURCE,
    new RegExp(HTML_MARKER_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Missing end marker: ${HTML_MARKER_END}`
  );
});

// T2: the 2 HTML markers are unique strings (defense against accidental duplication)
test('T2: HTML markers are unique (no accidental duplication)', () => {
  assert.notEqual(
    HTML_MARKER_START,
    HTML_MARKER_END,
    'Start and end markers must be distinct strings'
  );
  // Also verify no duplicate occurrence within the script source
  const startCount = (ENGINE_COUNT_CHECK_SOURCE.match(new RegExp(HTML_MARKER_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  const endCount = (ENGINE_COUNT_CHECK_SOURCE.match(new RegExp(HTML_MARKER_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  assert.equal(startCount, 1, `Expected 1 occurrence of start marker, found ${startCount}`);
  assert.equal(endCount, 1, `Expected 1 occurrence of end marker, found ${endCount}`);
});

// ===== Class B: 「重生成不能漏掉引擎」（P168 B3-10 起） =====
//
// 旧架构：codegen 用**字面 marker** 去定位 customFn 里的表区 ⇒ marker 改名 ⇒
//   静默跳过 ⇒ --check 仍 PASS ⇒ 那张表从此不再与数据集同步。
// 新架构：codegen **不再定位表区**（整段由 scripts/customfn-port.ts 用 AST 重新派生）⇒
//   「静默跳过」的新形态是：**某个引擎压根没进重生成清单** ⇒
//   它的客户端 customFn 永远停在手抄镜像 ⇒ 照样会漂。
// ⇒ 判据：**声明了自定义客户端**（clientConfig.type === 'custom'）的引擎，
//   **必须**都进重生成清单（= 文件里带 customFn）。
test('T3: every engine that declares a custom client config is covered by the regeneration', () => {
  const declared: string[] = [];
  const uncovered: string[] = [];
  for (const f of walk(ENGINE_DIR, [])) {
    const src = fs.readFileSync(f, 'utf8');
    if (!/type:\s*'custom'/.test(src)) continue;
    const rel = path.relative(ROOT, f);
    declared.push(rel);
    if (!src.includes('customFn')) uncovered.push(rel);
  }
  assert.ok(declared.length > 0, 'no engine declares a custom client config — the scan is broken');
  assert.deepEqual(
    uncovered,
    [],
    `these engine(s) declare a custom client config but carry NO customFn: ${uncovered.join(', ')}` +
      ' — the regeneration would silently skip them ⇒ their client customFn stays a' +
      ' hand-written mirror ⇒ the drift this batch closed would come straight back',
  );
});

// ===== Class C: codegen-examples (T6 + T7) =====

// T6: scripts/codegen-examples.mjs has 'staticExamples: [' marker (line 314)
test('T6: scripts/codegen-examples.mjs has "staticExamples: [" marker', () => {
  assert.match(
    EXAMPLES_SOURCE,
    new RegExp(`const marker = '${EXAMPLES_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`),
    `Missing marker declaration. Source should contain: const marker = '${EXAMPLES_MARKER}'`
  );
});

// T7: integration smoke — codegen-examples --check exits 0 + "PASSED"
test('T7: codegen-examples.mjs --check exits 0 with "PASSED"', () => {
  const result = spawnSync('node', ['scripts/codegen-examples.mjs', '--check'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(
    result.status,
    0,
    `codegen-examples --check exited ${result.status}. stderr: ${result.stderr || '(empty)'}`
  );
  assert.match(
    result.stdout,
    /PASSED/,
    `Expected "PASSED" in stdout. Got: ${result.stdout}`
  );
});
