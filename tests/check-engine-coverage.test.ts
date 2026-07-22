// P53 drift guard — 4 assertions enforcing engine coverage invariant.
//
// What this test asserts:
//   T1 — script exits 0 on current state
//   T2 — stdout reports {"ok":true,...} (no missing/orphans)
//   T3 — stdout includes engines count >= 100 (sanity)
//   T4 — script is idempotent (running twice produces same exit 0 + ok:true)
//
// Why tests/ root: P22b ESM trap — tests/run.mjs reads tests/*.test.ts (root only).
// Subdir placement silently skipped by pnpm test:unit.
//
// Mutation testing (negative path) is deferred — would require temporary
// tool/engine file mutation + restoration, beyond what pre-commit hook
// already guards via the same script.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '..', '..');

function run(args: string[] = []): { status: number; stdout: string; stderr: string } {
  // Windows note: process.execPath contains a space (e.g. "C:\Program Files\nodejs\node.exe").
  // When shell:true, args must be quoted to survive Windows shell parsing.
  // Use `node` (resolves via PATH) to avoid the space issue altogether.
  const cmd = process.platform === 'win32' ? 'node' : process.execPath;
  return spawnSync(
    cmd,
    ['scripts/check-engine-coverage.mjs', ...args],
    { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' },
  ) as any;
}

// === T1: script exits 0 on current state ===

test('T1: check-engine-coverage exits 0 on current state', () => {
  const r = run();
  assert.strictEqual(
    r.status,
    0,
    `script exited ${r.status}. stdout: ${r.stdout || '(empty)'}, stderr: ${r.stderr || '(empty)'}`
  );
});

// === T2: stdout reports ok:true (no missing/orphans) ===

test('T2: stdout reports ok:true (no missing or orphan slugs)', () => {
  const r = run();
  assert.match(
    r.stdout,
    /"ok":true/,
    `stdout did not report ok:true. stdout: ${r.stdout}`
  );
});

// === T3: stdout includes engines count >= 100 ===

test('T3: stdout includes engines count (sanity check)', () => {
  const r = run();
  // Engine count format: "engines":NNN — must be present and >= 100 (P16 milestone).
  const match = r.stdout.match(/"engines":(\d+)/);
  assert.ok(match, `stdout did not include engines count. stdout: ${r.stdout}`);
  const count = parseInt(match[1], 10);
  assert.ok(
    count >= 100,
    `engines count=${count} is below expected 100 (P16 milestone)`
  );
});

// === T4: script is idempotent (running twice produces same result) ===

test('T4: check-engine-coverage is idempotent (safe to run repeatedly)', () => {
  const r1 = run();
  const r2 = run();
  assert.strictEqual(r1.status, 0, `first run exited ${r1.status}. stderr: ${r1.stderr}`);
  assert.strictEqual(r2.status, 0, `second run exited ${r2.status}. stderr: ${r2.stderr}`);
  assert.match(r1.stdout, /"ok":true/);
  assert.match(r2.stdout, /"ok":true/);
  // Both runs should report same counts (no flaky state)
  const count1 = r1.stdout.match(/"engines":(\d+)/)?.[1];
  const count2 = r2.stdout.match(/"engines":(\d+)/)?.[1];
  assert.strictEqual(
    count1,
    count2,
    `engine count drifted between runs: ${count1} vs ${count2}`
  );
});