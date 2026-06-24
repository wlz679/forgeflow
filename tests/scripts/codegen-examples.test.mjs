#!/usr/bin/env node
// Smoke test: invoke --check and verify it returns 0 with expected output.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const result = spawnSync('node', ['scripts/codegen-examples.mjs', '--check'], {
  cwd: path.join(__dirname, '..', '..'),
  encoding: 'utf8',
});

if (result.status !== 0) {
  console.error('FAIL: --check returned non-zero:');
  console.error('stdout:', result.stdout);
  console.error('stderr:', result.stderr);
  process.exit(1);
}
if (!result.stdout.includes('PASSED')) {
  console.error('FAIL: --check did not report PASSED');
  console.error(result.stdout);
  process.exit(1);
}
console.log('PASS: codegen-examples --check smoke test');
