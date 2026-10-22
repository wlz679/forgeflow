import { spawnSync } from 'node:child_process';
import { resolve, relative } from 'node:path';
// P153: the build-dep suite list and the suite walk now live in
// tests/build-dep-suites.mjs, shared with the claude-md-invariant-guard.
// The guard used to parse this file's printed skip-mode list to learn the
// build-dep count; when the list became computed (P153-E1) the guard's
// parser found no literal and read 0. One implementation, two callers.
import { computeBuildDepSuites, walkTestSuites } from './build-dep-suites.mjs';

const root = resolve(import.meta.dirname, '..');
// P141-B3-T2: 动态递归扫描替代硬编码白名单 — 自动发现 subdir 里的 tests/
// (e.g. tests/core/) 而不必在 run.mjs 里手动维护清单。原 brief 用
// `node:fs/promises.glob`,但该 API 仅在 Node ≥22.0.0 暴露,而项目 engines
// 允许 ^20.19.0,自写递归以兼容两个 major。P53b T17a 仍生效:传给 spawnSync
// 的是相对 root 的 forward-slash 路径,Windows cmd.exe 的 8191-char cmdline
// 限制靠相对路径绕开,长度基线 ~4400 chars / 190 files。
const suites = walkTestSuites(root);
console.log(`Found ${suites.length} test suites via walk`);
const tests = suites.map(f => relative(root, f).replaceAll('\\', '/'));
if (!tests.length) {
  console.error('No tests found in tests/');
  process.exit(1);
}
const tsxBin = resolve(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
// shell: true on win32: Node refuses direct spawn of .cmd shims (EINVAL),
// so cmd.exe must resolve the batch file.
// Pass user argv BEFORE the test files so node flag-like args (e.g.
// --test-name-pattern) are not mistaken for test file paths by the runner.
//
// --test-concurrency=1 is mandatory: 25 test files (baselayout-clerk-script,
// baselayout-sync-script, header-clerk-render, header-sync-ui,
// privacy-policy-sync, category-en-cjk-guard, category-zh-cjk-preservation,
// tool-zh-cjk-preservation, tool-en-cjk-guard, blog-en-cjk-guard,
// blog-zh-cjk-preservation, tool-cross-link-cjk-guard,
// blog-cross-link-cjk-guard, zh-hardcoded-english-guard,
// sitemap-hreflang-guard, html-hreflang-guard,
// sitemap-url-coverage-guard, canonical-url-guard,
// og-meta-guard, json-ld-guard, json-ld-field-guard,
// json-ld-faqpage-guard, a11y-guard, page-size-guard,
// breadcrumb-list-guard, engine-titles-i18n-guard,
// engine-descriptions-i18n-guard, engine-composite-i18n-guard,
// engine-en-composite-i18n-guard, claude-md-invariant-guard)
// each spawn `pnpm build`
// which calls cleanDist() + writes to dist/. Running test files in
// parallel causes them to clobber each other's dist/ state, manifesting
// as ERR_MODULE_NOT_FOUND for files mid-write. Concurrency=1 serializes
// file execution; the build-helpers' in-process caches still amortize
// the cost within a single file. User --test-concurrency=N overrides
// for ad-hoc local debugging.
const tsxArgs = ['--test'];
if (!process.argv.slice(2).some(a => a.startsWith('--test-concurrency'))) {
  tsxArgs.push('--test-concurrency=1');
}

// P153-G1 (E1): batch the spawn. A single spawn carrying all 236 test paths
// blows past Windows' 8191-character command-line limit, so `pnpm check` could
// never complete on Windows — it died with "The command line is too long."
// before a single assertion ran. Spawning in batches keeps each command line
// short while preserving the original semantics: every suite still runs,
// sequentially (spawnSync is blocking, so batches cannot interleave and
// clobber each other's dist/ state), and the process still exits non-zero if
// ANY batch failed.
const BATCH_SIZE = 30;
const userArgs = process.argv.slice(2);
let exitCode = 0;
let batchNo = 0;
// P153: capture each batch's output so a failure can be reported as a GitHub
// Actions annotation (`::error::`). GitHub does NOT parse TAP output, so a
// failing test used to be invisible in the run list — only "Process completed
// with exit code 1" showed up, and the job log needs a signed-in session to
// read. That invisibility is why 100 consecutive red CI runs went unnoticed
// (P153 §7.9). The annotation carries the failing test names + the assertion
// message, which is readable from the public API without authentication.
function emitErrorAnnotation(message) {
  // Workflow commands must be single-line; escape %, CR and LF.
  const safe = String(message).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, ' ');
  console.log(`::error::${safe}`);
}
function summarizeFailures(output) {
  const lines = output.split('\n');
  const failures = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^not ok \d+ - (.+)$/.exec(lines[i]);
    if (!m) continue;
    const name = m[1].trim();
    // Collect the assertion detail that follows (TAP yaml block: `error: |-`
    // plus indented lines). Skip the yaml keys that add no information.
    const detail = [];
    for (let j = i + 1; j < Math.min(i + 30, lines.length); j++) {
      const l = lines[j];
      if (/^(not ok|ok) \d+ - /.test(l)) break;
      const t = l.trim();
      if (!t) continue;
      if (/^(duration_ms|code|name|operator|expected|actual|stack):/.test(t)) continue;
      if (t === '...') continue;
      detail.push(t);
      if (detail.length >= 8) break;
    }
    failures.push({ name, detail: detail.join(' | ') });
  }
  return failures;
}
for (let i = 0; i < tests.length; i += BATCH_SIZE) {
  const batch = tests.slice(i, i + BATCH_SIZE);
  batchNo += 1;
  console.log(`[run] batch ${batchNo} (${batch.length} suites, ${i + 1}–${i + batch.length} of ${tests.length})`);
  const r = spawnSync(tsxBin, [...tsxArgs, ...userArgs, ...batch], {
    cwd: root,
    // stdout/stderr are piped (not inherited) so the output can be scanned for
    // failures; the captured text is written back out when the batch ends.
    stdio: ['inherit', 'pipe', 'pipe'],
    encoding: 'utf-8',
    maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === 'win32',
  });
  const out = r.stdout ?? '';
  const err = r.stderr ?? '';
  if (out) process.stdout.write(out);
  if (err) process.stderr.write(err);
  const code = r.status ?? 1;
  if (code !== 0) {
    const failures = summarizeFailures(out);
    emitErrorAnnotation(
      `test batch ${batchNo} failed (suites ${i + 1}–${i + batch.length} of ${tests.length}, exit ${code})` +
        (failures.length ? ` — ${failures.length} failing test(s)` : ' — no TAP "not ok" line found (see job log)'),
    );
    for (const f of failures.slice(0, 25)) {
      emitErrorAnnotation(`FAIL ${f.name}${f.detail ? ' :: ' + f.detail : ''}`);
    }
  }
  if (code !== 0 && exitCode === 0) exitCode = code;
}
// P23b: skip-mode summary. When RUN_BUILD_TESTS is unset, the build-dependent
// test files early-return → tests appear to "pass" but coverage is partial.
// Surface this so users know to opt in.
//
// P153-G1: the list is COMPUTED from the test sources, not hardcoded. The
// hardcoded copy had drifted in both directions — it named suites that no
// longer exist (the blog-* guards were deleted) and suites that are no longer
// build-gated (P153-G1 removed the RUN_BUILD_TESTS gate from five
// source-only guards), while omitting suites that really are gated. A
// computed list cannot drift.
//
// P153: the computation itself now lives in tests/build-dep-suites.mjs so
// the claude-md-invariant-guard counts exactly the same set (it used to
// parse the printed list below, which stopped existing when E1 made it
// computed).
const buildGated = computeBuildDepSuites(root);

if (!process.env.RUN_BUILD_TESTS) {
  console.log(`\n[skip-mode] RUN_BUILD_TESTS not set — ${buildGated.length} build-dependent suites skipped.`);
  console.log('[skip-mode] Set RUN_BUILD_TESTS=1 (or run `pnpm test:build`) to enable:');
  let line = '[skip-mode]   ';
  for (const name of buildGated) {
    if (line.length + name.length + 2 > 78) {
      console.log(line);
      line = '[skip-mode]   ';
    }
    line += `${name}, `;
  }
  if (line.trim() !== '[skip-mode]') console.log(line.replace(/,\s*$/, ''));
}
process.exit(exitCode);
