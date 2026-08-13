#!/usr/bin/env node
/**
 * One-shot operational script: apply Supabase schema migration.
 *
 * USAGE:
 *   SUPABASE_DB_URL=postgresql://... node scripts/sync-supabase-schema.mjs
 *
 * OR via Supabase SQL editor (recommended for first-time setup):
 *   1. Open Supabase dashboard → SQL Editor
 *   2. Copy/paste contents of supabase/migrations/0001_user_sync.sql
 *   3. Click "Run"
 *
 * The script reads the SQL file and pipes it to psql if SUPABASE_DB_URL is set.
 * Does NOT run in CI — this is an operational task performed once per project.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const sqlPath = resolve(root, 'supabase', 'migrations', '0001_user_sync.sql');

if (!existsSync(sqlPath)) {
  console.error(`[sync-supabase-schema] FAIL: SQL file not found at ${sqlPath}`);
  process.exit(1);
}

const sql = readFileSync(sqlPath, 'utf8');
const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.log('[sync-supabase-schema] No SUPABASE_DB_URL set. Manual setup:');
  console.log('  1. Open Supabase dashboard → SQL Editor');
  console.log('  2. Copy/paste contents of:');
  console.log(`     ${sqlPath}`);
  console.log('  3. Click "Run"');
  console.log('');
  console.log('Or set SUPABASE_DB_URL and re-run this script to apply via psql.');
  console.log('');
  console.log(`[sync-supabase-schema] SQL preview (first 500 chars):`);
  console.log(sql.slice(0, 500));
  process.exit(0);
}

console.log(`[sync-supabase-schema] Applying ${sqlPath} to ${dbUrl.replace(/:[^:@]+@/, ':***@')}...`);
// P142-B2-C: env-via PGPASSWORD/PGHOST/PGUSER/PGDATABASE prevents password
// leak via psql child process /proc/<pid>/cmdline + ps auxf (P141-B3-T6
// residual exposure; old dbUrl argv exposed password ~ms-seconds during psql
// startup). URL parse failure falls through to existing r.status check.
// Known limit: PGPASSWORD still in /proc/<pid>/environ (harder to read —
// requires same UID + ptrace); this is a psql API limit, not solvable
// client-side.
const u = new URL(dbUrl);
const env = {
  ...process.env,
  PGPASSWORD: decodeURIComponent(u.password ?? ''),
  PGHOST: u.hostname,
  PGPORT: u.port || '5432',
  PGUSER: decodeURIComponent(u.username),
  PGDATABASE: u.pathname.replace(/^\//, '') || 'postgres',
};
const r = spawnSync(
  'psql',
  ['-h', env.PGHOST, '-p', env.PGPORT, '-U', env.PGUSER, '-d', env.PGDATABASE, '-f', sqlPath],
  { cwd: root, stdio: 'inherit', env }
);

if (r.status !== 0) {
  console.error(`[sync-supabase-schema] FAIL: psql exited with status ${r.status}`);
  process.exit(1);
}

console.log('[sync-supabase-schema] OK: schema applied');
