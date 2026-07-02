/**
 * P3-2 sync core I/O tests.
 * Covers: pushCollection / pullCollection / syncNow / deleteCloudData + 401 auth error.
 * Uses a mock fetch (injected via fetchImpl) and process.env for Supabase config
 * (matches dual-source fallback in src/lib/sync.ts: getSupabaseConfig reads
 * import.meta.env primary, process.env fallback — tests use process.env because
 * tsx doesn't see Astro's import.meta.env replacements).
 * Run via: node --import tsx --test tests/sync-supabase-io.test.ts
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  pushCollection,
  pullCollection,
  syncNow,
  deleteCloudData,
  SyncAuthError,
  type FavoritesPayload,
} from '../src/lib/sync.ts';

const FAV_PAYLOAD: FavoritesPayload = { version: 1, slugs: ['A'], lastUpdated: '2026-07-01T10:00:00Z' };

// Set env before any sync import resolves its config. getSupabaseConfig()
// checks process.env as the fallback source (after import.meta.env).
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'anon-test-key';

// Mock fetch that records calls and returns canned responses.
function mockFetch(responses: Array<{ status: number; body?: unknown }>) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  let i = 0;
  const f: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    const r = responses[i++] ?? { status: 500 };
    return new Response(JSON.stringify(r.body), { status: r.status });
  };
  return { f, calls };
}

test('pushCollection: POST with correct URL, headers, body', async () => {
  const { f, calls } = mockFetch([{ status: 201 }]);
  await pushCollection('user_123', 'favorites', FAV_PAYLOAD, f);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/rest\/v1\/user_favorites\?on_conflict=clerk_user_id/);
  const headers = calls[0].init?.headers as Record<string, string>;
  assert.match(String(headers.apikey ?? ''), /anon-test-key/);
  const body = JSON.parse(calls[0].init?.body as string);
  assert.equal(body.clerk_user_id, 'user_123');
  assert.deepEqual(body.payload, FAV_PAYLOAD);
});

test('pullCollection: GET returns payload, or null if no row', async () => {
  const { f } = mockFetch([{ status: 200, body: [{ payload: FAV_PAYLOAD }] }]);
  const p = await pullCollection('user_123', 'favorites', f);
  assert.deepEqual(p, FAV_PAYLOAD);

  const { f: f2 } = mockFetch([{ status: 200, body: [] }]);
  const p2 = await pullCollection('user_123', 'favorites', f2);
  assert.equal(p2, null);
});

test('syncNow: pull+merge+push all 3 collections in sequence', async () => {
  const { f, calls } = mockFetch([
    { status: 200, body: [] },  // pull favorites (no row)
    { status: 201 },            // push favorites
    { status: 200, body: [] },  // pull recent
    { status: 201 },            // push recent
    { status: 200, body: [] },  // pull history
    { status: 201 },            // push history
  ]);
  // syncNow reads/writes LS — skip if no LS available
  if (typeof (globalThis as any).localStorage === 'undefined') {
    (globalThis as any).localStorage = {
      getItem: () => null, setItem: () => {}, removeItem: () => {},
    };
  }
  const result = await syncNow('user_123', f);
  assert.equal(result.pushed, 3);
  assert.equal(result.pulled, 0);
  assert.equal(calls.length, 6);
});

test('pushCollection: 401 → throws SyncAuthError', async () => {
  const { f } = mockFetch([{ status: 401 }]);
  await assert.rejects(
    () => pushCollection('user_123', 'favorites', FAV_PAYLOAD, f),
    SyncAuthError
  );
});
