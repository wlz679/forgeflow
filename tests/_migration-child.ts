/**
 * Per-test child harness for migration.client.ts maybeMigrate().
 *
 * Stubs:
 *   - globalThis.localStorage / sessionStorage (Map-backed)
 *   - globalThis.window.alert (captures toast messages)
 *   - globalThis.fetch (records calls, returns empty array for GET, 204 for POST)
 *
 * Test scenarios selected via process.env.__TEST_SCENARIO. Outputs JSON on stdout.
 *
 * Pre-populated state controlled via process.env:
 *   - __TEST_SCENARIO — scenario name
 *   - MIGRATION_LS_FAVORITES / _RECENT / _HISTORY — JSON.stringify of payloads to seed LS
 *   - MIGRATION_PRE_SS_PULL — '1' to set sessionStorage guard before run
 *   - MIGRATION_PRE_LS_MIGRATION — '1' to set LS migration flag before run
 *   - LANG_PREFIX — e.g. '/en/' for locale detection in t()
 */

// ---------- LS / SS stubs ----------
const lsStore = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (lsStore.has(k) ? lsStore.get(k)! : null),
  setItem: (k: string, v: string) => { lsStore.set(k, v); },
  removeItem: (k: string) => { lsStore.delete(k); },
  clear: () => { lsStore.clear(); },
  key: (i: number) => Array.from(lsStore.keys())[i] ?? null,
  get length() { return lsStore.size; },
} as any;

const ssStore = new Map<string, string>();
(globalThis as any).sessionStorage = {
  getItem: (k: string) => (ssStore.has(k) ? ssStore.get(k)! : null),
  setItem: (k: string, v: string) => { ssStore.set(k, v); },
  removeItem: (k: string) => { ssStore.delete(k); },
  clear: () => { ssStore.clear(); },
  key: (i: number) => Array.from(ssStore.keys())[i] ?? null,
  get length() { return ssStore.size; },
} as any;

// Seed pre-state from env
if (process.env.MIGRATION_PRE_SS_PULL === '1') {
  ssStore.set('sync:did-pull-once', '1');
}
if (process.env.MIGRATION_PRE_LS_MIGRATION === '1') {
  lsStore.set('forgeflowkit:migration:test-user', '2026-07-01T00:00:00.000Z');
}
if (process.env.MIGRATION_LS_FAVORITES) {
  lsStore.set('forgeflowkit:favorites', process.env.MIGRATION_LS_FAVORITES);
}
if (process.env.MIGRATION_LS_RECENT) {
  lsStore.set('forgeflowkit:recent', process.env.MIGRATION_LS_RECENT);
}
if (process.env.MIGRATION_LS_HISTORY) {
  lsStore.set('forgeflowkit:history', process.env.MIGRATION_LS_HISTORY);
}

// ---------- Window stub ----------
const alertsShown: string[] = [];
(globalThis as any).window = {
  alert: (msg: string) => { alertsShown.push(msg); },
  location: { pathname: process.env.LANG_PREFIX || '/en/' },
  setInterval: (_cb: any, _ms?: number): any => 0,
  setTimeout: (_cb: any, _ms?: number): any => 0,
  clearInterval: (_id: any) => { /* noop */ },
  clearTimeout: (_id: any) => { /* noop */ },
  addEventListener: (_event: string, _handler: any) => { /* noop */ },
  removeEventListener: (_event: string, _handler: any) => { /* noop */ },
} as any;

(globalThis as any).document = {
  readyState: 'complete',
  addEventListener: (_e: string, _h: any) => { /* noop */ },
} as any;

// ---------- Supabase env (sync.ts needs this to construct URLs) ----------
// Note: migration.client.ts pulls from sync.ts which calls getSupabaseEnv().
// We pre-set process.env values that supabase-env.ts will pick up.
if (!process.env.VITE_SUPABASE_URL) process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
if (!process.env.VITE_SUPABASE_ANON_KEY) process.env.VITE_SUPABASE_ANON_KEY = 'anon-test-key';

// ---------- Fetch mock ----------
interface FetchCall { url: string; method?: string; body?: string; }
const fetchCalls: FetchCall[] = [];
(globalThis as any).fetch = async (url: string, init?: any) => {
  fetchCalls.push({ url: String(url), method: init?.method, body: init?.body });
  if (init?.method === 'GET' || !init?.method) {
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (init?.method === 'POST') {
    // 204 No Content must not have a body — Node Response constructor rejects
    // `new Response('', { status: 204 })` (use null body).
    return new Response(null, { status: 204 });
  }
  return new Response(null, { status: 204 });
};
(globalThis as any).Response = Response;

// ---------- Main ----------
async function main(): Promise<void> {
  const { maybeMigrate } = await import('../src/scripts/migration.client.ts');
  const scenario = process.env.__TEST_SCENARIO;

  if (scenario === 'empty-ls-empty-cloud-skips') {
    // No LS, no cloud. migration should return false, no fetch, no alert.
    const migrated = await maybeMigrate('test-user');
    process.stdout.write(JSON.stringify({
      migrated,
      fetchCallCount: fetchCalls.length,
      alertCount: alertsShown.length,
      ssSet: !!ssStore.get('sync:did-pull-once'),
      lsMigrationFlagSet: !!lsStore.get('forgeflowkit:migration:test-user'),
    }) + '\n');
    return;
  }

  if (scenario === 'ls-only-pushes-to-empty-cloud') {
    // LS has 12 favorites; cloud empty → migration should push (3 POSTs) but no pull beyond empty array
    lsStore.set('forgeflowkit:favorites', JSON.stringify({
      version: 1,
      slugs: ['calc-1', 'calc-2', 'calc-3', 'calc-4', 'calc-5', 'calc-6', 'calc-7', 'calc-8', 'calc-9', 'calc-10', 'calc-11', 'calc-12'],
      lastUpdated: '2026-07-01T00:00:00.000Z',
    }));
    const migrated = await maybeMigrate('test-user');
    process.stdout.write(JSON.stringify({
      migrated,
      fetchCallCount: fetchCalls.length,
      pullCalls: fetchCalls.filter(c => c.method === 'GET' || !c.method).length,
      pushCalls: fetchCalls.filter(c => c.method === 'POST').length,
      alertCount: alertsShown.length,
      alertText: alertsShown[0] ?? null,
      ssSet: !!ssStore.get('sync:did-pull-once'),
      lsMigrationFlagSet: !!lsStore.get('forgeflowkit:migration:test-user'),
      ssFlagValue: ssStore.get('sync:did-pull-once'),
      lsFlagValue: lsStore.get('forgeflowkit:migration:test-user'),
    }) + '\n');
    return;
  }

  if (scenario === 'idempotent-rerun-skips') {
    // Pre-set BOTH guards → maybeMigrate should bail immediately, no fetch.
    const migrated = await maybeMigrate('test-user');
    process.stdout.write(JSON.stringify({
      migrated,
      fetchCallCount: fetchCalls.length,
      alertCount: alertsShown.length,
    }) + '\n');
    return;
  }

  if (scenario === 'toast-fires-on-items') {
    // LS has items → migration runs → toast fires with counts.
    lsStore.set('forgeflowkit:favorites', JSON.stringify({
      version: 1,
      slugs: ['a', 'b', 'c'],
      lastUpdated: '2026-07-01T00:00:00.000Z',
    }));
    lsStore.set('forgeflowkit:recent', JSON.stringify({
      version: 1,
      entries: [{ slug: 'a', visitedAt: '2026-07-01T00:00:00.000Z' }],
      lastUpdated: '2026-07-01T00:00:00.000Z',
    }));
    await maybeMigrate('test-user');
    process.stdout.write(JSON.stringify({
      migrated: true,
      alertCount: alertsShown.length,
      alertText: alertsShown[0] ?? null,
    }) + '\n');
    return;
  }

  if (scenario === 'silent-on-empty') {
    // After migration (which itself is a no-op for empty), no toast.
    await maybeMigrate('test-user');
    process.stdout.write(JSON.stringify({
      migrated: false,
      alertCount: alertsShown.length,
    }) + '\n');
    return;
  }

  process.stderr.write(`unknown scenario: ${scenario}\n`);
  process.exit(2);
}

main().catch((err) => {
  process.stderr.write(`FATAL: ${err && err.message}\n${err && err.stack}\n`);
  process.exit(1);
});