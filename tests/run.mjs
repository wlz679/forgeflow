import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';

const root = resolve(import.meta.dirname, '..');
// P141-B3-T2: 动态递归扫描替代硬编码白名单 — 自动发现 subdir 里的 tests/
// (e.g. tests/core/) 而不必在 run.mjs 里手动维护清单。原 brief 用
// `node:fs/promises.glob`,但该 API 仅在 Node ≥22.0.0 暴露,而项目 engines
// 允许 ^20.19.0,自写递归以兼容两个 major。P53b T17a 仍生效:传给 spawnSync
// 的是相对 root 的 forward-slash 路径,Windows cmd.exe 的 8191-char cmdline
// 限制靠相对路径绕开,长度基线 ~4400 chars / 190 files。
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist']);
function walkTests(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkTests(full));
    } else if (entry.isFile() && /\.test\.(ts|mjs)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}
const suites = walkTests(resolve(root, 'tests'));
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
const r = spawnSync(tsxBin, [...tsxArgs, ...process.argv.slice(2), ...tests], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
// P23b: skip-mode summary. When RUN_BUILD_TESTS is unset, the build-dependent
// test files early-return → tests appear to "pass" but coverage is partial.
// Surface this so users know to opt in.
const exitCode = r.status ?? 1;
if (!process.env.RUN_BUILD_TESTS) {
  console.log('\n[skip-mode] RUN_BUILD_TESTS not set — 47 build-dependent suites skipped.');
  console.log('[skip-mode] Set RUN_BUILD_TESTS=1 (or run `pnpm test:build`) to enable:');
  console.log('[skip-mode]   baselayout-clerk-script, baselayout-sync-script,');
  console.log('[skip-mode]   header-clerk-render, header-sync-ui, privacy-policy-sync,');
  console.log('[skip-mode]   category-en-cjk-guard, category-zh-cjk-preservation,');
  console.log('[skip-mode]   tool-zh-cjk-preservation, tool-en-cjk-guard,');
  console.log('[skip-mode]   blog-en-cjk-guard, blog-zh-cjk-preservation,');
  console.log('[skip-mode]   tool-cross-link-cjk-guard, blog-cross-link-cjk-guard,');
  console.log('[skip-mode]   zh-hardcoded-english-guard, sitemap-hreflang-guard,');
  console.log('[skip-mode]   html-hreflang-guard, sitemap-url-coverage-guard,');
  console.log('[skip-mode]   canonical-url-guard, og-meta-guard, json-ld-guard,');
  console.log('[skip-mode]   json-ld-field-guard, json-ld-faqpage-guard, a11y-guard,');
  console.log('[skip-mode]   page-size-guard, breadcrumb-list-guard,');
  console.log('[skip-mode]   dead-i18n-keys-guard, js-bundle-size-guard,');
  console.log('[skip-mode]   css-bundle-size-guard, image-size-guard,');
  console.log('[skip-mode]   engine-titles-i18n-guard,');
  console.log('[skip-mode]   engine-descriptions-i18n-guard,');
  console.log('[skip-mode]   engine-en-faq-i18n-guard, engine-en-howto-i18n-guard,');
  console.log('[skip-mode]   engine-en-input-i18n-guard, engine-zh-faq-i18n-guard,');
  console.log('[skip-mode]   engine-zh-howto-i18n-guard, engine-zh-input-i18n-guard,');
  console.log('[skip-mode]   input-labels-i18n-audit, claude-md-invariant-guard,');
  console.log('[skip-mode]   ai-cost-t2-7-zh-output, v3-render-coverage-guard,');
  console.log('[skip-mode]   content-prose-shape-guard, content-prose-zh-counterpart-warn,');
  console.log('[skip-mode]   blog-aio-coverage-guard, decision-layer-coverage-guard,');
  console.log('[skip-mode]   playbook-6-fields-coverage-guard,');
  console.log('[skip-mode]   p141-b3-engineering-cleanup');
}
process.exit(exitCode);
