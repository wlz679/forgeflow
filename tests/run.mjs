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
const r = spawnSync(tsxBin, ['--test', ...process.argv.slice(2), ...tests], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(r.status ?? 1);
