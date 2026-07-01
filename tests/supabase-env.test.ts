import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const child = resolve(root, 'tests', '_supabase-env-child.ts');
const tsxBin = resolve(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');

function runChild(env: Record<string, string>): boolean {
  const r = spawnSync(tsxBin, [child], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) {
    console.error('[test] child stderr:', r.stderr?.toString());
    throw new Error(`child exited ${r.status}`);
  }
  return JSON.parse(r.stdout.toString().trim()).result;
}

test('hasSupabaseEnv returns true when both URL and key set with valid shape', () => {
  assert.equal(
    runChild({
      VITE_SUPABASE_URL: 'https://abcdefghij.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.zzz',
    }),
    true
  );
});

test('hasSupabaseEnv returns false when URL missing', () => {
  assert.equal(
    runChild({ VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: 'anon123' }),
    false
  );
});

test('hasSupabaseEnv returns false when key missing', () => {
  assert.equal(
    runChild({ VITE_SUPABASE_URL: 'https://xyz.supabase.co', VITE_SUPABASE_ANON_KEY: '' }),
    false
  );
});

test('hasSupabaseEnv returns false when URL is REPLACE_ME placeholder', () => {
  assert.equal(
    runChild({
      VITE_SUPABASE_URL: 'https://REPLACE_ME.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon123',
    }),
    false
  );
});

test('hasSupabaseEnv returns false when URL has invalid scheme', () => {
  assert.equal(
    runChild({
      VITE_SUPABASE_URL: 'http://not-secure.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon123',
    }),
    false
  );
});

test('hasSupabaseEnv returns false when URL is not a supabase.co domain', () => {
  assert.equal(
    runChild({
      VITE_SUPABASE_URL: 'https://example.com',
      VITE_SUPABASE_ANON_KEY: 'anon123',
    }),
    false
  );
});
