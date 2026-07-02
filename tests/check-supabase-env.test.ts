import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const script = resolve(root, 'scripts', 'check-supabase-env.mjs');
// nodeBin is process.execPath (e.g. C:\Program Files\nodejs\node.exe on Windows).
// We do NOT pass `shell: true` because the path contains a space and cmd.exe
// would tokenize it without quoting. The existing check-clerk-env.test.ts
// uses the same pattern (spawnSync('node', [script], { ...no shell... })).
const nodeBin = process.execPath;

function runScript(env: Record<string, string>): { status: number; stdout: string; stderr: string } {
  const r = spawnSync(nodeBin, [script], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    status: r.status ?? -1,
    stdout: r.stdout?.toString() ?? '',
    stderr: r.stderr?.toString() ?? '',
  };
}

test('exit 0 when both URL and key set with valid shape', () => {
  const r = runScript({
    VITE_SUPABASE_URL: 'https://abc.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'anon123',
    CI: '',
  });
  assert.equal(r.status, 0, `stderr: ${r.stderr}`);
  assert.match(r.stdout, /OK/);
});

test('exit 1 in CI when URL missing', () => {
  const r = runScript({
    VITE_SUPABASE_URL: '',
    VITE_SUPABASE_ANON_KEY: 'anon123',
    CI: 'true',
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /missing|invalid/i);
});

test('exit 0 in local dev when URL missing (warning only)', () => {
  const r = runScript({
    VITE_SUPABASE_URL: '',
    VITE_SUPABASE_ANON_KEY: '',
    CI: '',
  });
  assert.equal(r.status, 0);
  assert.match(r.stderr, /WARNING/);
});

test('exit 1 in CI when URL is REPLACE_ME placeholder', () => {
  const r = runScript({
    VITE_SUPABASE_URL: 'https://REPLACE_ME.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'anon123',
    CI: 'true',
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /missing|invalid/i);
});
