import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const root = resolve(import.meta.dirname, '..');
const script = resolve(root, 'scripts', 'sync-supabase-schema.mjs');
const sqlPath = resolve(root, 'supabase', 'migrations', '0001_user_sync.sql');
// nodeBin is process.execPath (e.g. C:\Program Files\nodejs\node.exe on Windows).
// We do NOT pass `shell: true` because the path contains a space and cmd.exe
// would tokenize it without quoting. Same pattern as check-supabase-env.test.ts.
const nodeBin = process.execPath;

test('SQL migration file exists', () => {
  assert.ok(existsSync(sqlPath), `Expected ${sqlPath} to exist`);
});

test('SQL migration file contains 3 tables', () => {
  const sql = readFileSync(sqlPath, 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS user_favorites/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS user_recent/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS user_history/);
});

test('SQL migration file has RLS enabled and policies', () => {
  const sql = readFileSync(sqlPath, 'utf8');
  assert.match(sql, /ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /CREATE POLICY "favorites_self"/);
  assert.match(sql, /clerk_user_id = auth\.jwt\(\) ->> 'sub'/);
});

test('runner without SUPABASE_DB_URL exits 0 and prints instructions', () => {
  const r = spawnSync(nodeBin, [script], {
    cwd: root,
    env: { ...process.env, SUPABASE_DB_URL: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.equal(r.status, 0);
  assert.match(r.stdout?.toString() ?? '', /Manual setup/);
});
