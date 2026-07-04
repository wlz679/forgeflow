import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const tests = readdirSync(resolve(root, 'tests'))
  .filter(f => f.endsWith('.test.ts'))
  .map(f => resolve(root, 'tests', f));
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
// --test-concurrency=1 is mandatory: 5 test files (baselayout-clerk-script,
// baselayout-sync-script, header-clerk-render, header-sync-ui,
// privacy-policy-sync) each spawn `pnpm build` which calls cleanDist() +
// writes to dist/. Running test files in parallel causes them to clobber
// each other's dist/ state, manifesting as ERR_MODULE_NOT_FOUND for files
// mid-write. Concurrency=1 serializes file execution; the build-helpers'
// in-process caches still amortize the cost within a single file. User
// --test-concurrency=N overrides for ad-hoc local debugging.
const tsxArgs = ['--test'];
if (!process.argv.slice(2).some(a => a.startsWith('--test-concurrency'))) {
  tsxArgs.push('--test-concurrency=1');
}
const r = spawnSync(tsxBin, [...tsxArgs, ...process.argv.slice(2), ...tests], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(r.status ?? 1);
