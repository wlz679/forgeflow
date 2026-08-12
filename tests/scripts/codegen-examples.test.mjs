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
// P141-B3-T7a: regex 替代子串断言 — 防止 "NO PASSED" / "WAS PASSED" 这类
// 任意子串巧合命中。匹配实际输出 "PASSED: all <N> engines ..." 中 <N> 部分。
const passMatch = result.stdout.match(/\bPASSED\b\s*:\s*all\s+(\d+)\s+engines\b/);
const passedCount = passMatch ? parseInt(passMatch[1], 10) : 0;
if (!passMatch || passedCount < 100) {
  console.error('FAIL: --check did not report a sufficient PASSED count.');
  console.error(`  matched: ${passMatch ? passMatch[0] : '(none)'}, passedCount=${passedCount}`);
  console.error(result.stdout);
  process.exit(1);
}
console.log(`PASS: codegen-examples --check (passedCount=${passedCount})`);
