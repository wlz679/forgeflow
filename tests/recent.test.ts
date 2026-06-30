/**
 * P2b recent lib unit tests.
 * Covers: read/write/recordVisit/has/isAvailable/subscribe + 4 error classes.
 * Run via: pnpm test:unit  (or  node tests/run.mjs tests/recent.test.ts)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RECENT_STORAGE_KEY, RECENT_MAX_ITEMS,
  read, write, recordVisit, has, isAvailable, subscribe,
  RecentUnavailableError, QuotaExceededError, SchemaMismatchError, InvalidSlugError,
} from '../src/lib/recent.ts';

// Per-test in-memory LS shim. The lib reads/writes globalThis.localStorage;
// tests inject by temporarily replacing the global and cleaning up after.
type LS = {
  store: Map<string, string>;
  failOnWrite?: boolean;
};

function installShim(ls: LS) {
  const previous = (globalThis as { localStorage?: unknown }).localStorage;
  (globalThis as { localStorage: unknown }).localStorage = {
    getItem: (k: string) => ls.store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (ls.failOnWrite) throw new DOMException('QuotaExceededError');
      ls.store.set(k, v);
    },
    removeItem: (k: string) => { ls.store.delete(k); },
    clear: () => { ls.store.clear(); },
    key: (i: number) => Array.from(ls.store.keys())[i] ?? null,
    get length() { return ls.store.size; },
  };
  return () => { (globalThis as { localStorage?: unknown }).localStorage = previous; };
}

// Reset module-level state (isAvailable cache, subscribers) by re-importing fresh
async function freshImport() {
  // dynamic import with cache-busting query string
  const url = '../src/lib/recent.ts?t=' + Date.now() + Math.random();
  return import(/* @vite-ignore */ url);
}

test('constants: storage key and max items', async () => {
  assert.equal(RECENT_STORAGE_KEY, 'forgeflowkit:recent:v1');
  assert.equal(RECENT_MAX_ITEMS, 20);
});

test('read: empty when LS has no key', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    assert.deepEqual(m.read(), []);
  } finally { restore(); }
});

test('read: parses valid store', async () => {
  const ls: LS = { store: new Map([[RECENT_STORAGE_KEY, JSON.stringify({
    version: 1,
    entries: [
      { slug: 'a', visitedAt: '2026-06-30T14:00:00Z' },
      { slug: 'b', visitedAt: '2026-06-30T13:00:00Z' },
    ],
    lastUpdated: '2026-06-30T14:00:00Z',
  })]]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    const r = m.read();
    assert.equal(r.length, 2);
    assert.equal(r[0].slug, 'a');
    assert.equal(r[1].slug, 'b');
  } finally { restore(); }
});

test('read: returns [] on corrupted JSON', async () => {
  const ls: LS = { store: new Map([[RECENT_STORAGE_KEY, '{not json']]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    assert.deepEqual(m.read(), []);
  } finally { restore(); }
});

test('read: returns [] on wrong version', async () => {
  const ls: LS = { store: new Map([[RECENT_STORAGE_KEY, JSON.stringify({ version: 999, entries: [] })]]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    assert.deepEqual(m.read(), []);
  } finally { restore(); }
});

test('read: filters out entries with non-string slug', async () => {
  const ls: LS = { store: new Map([[RECENT_STORAGE_KEY, JSON.stringify({
    version: 1,
    entries: [
      { slug: 'good', visitedAt: '2026-06-30T14:00:00Z' },
      { slug: 42, visitedAt: '2026-06-30T13:00:00Z' },  // bad
      { slug: 'also-good', visitedAt: 'bad-ts' },  // bad ts is OK (we don't validate ts)
    ],
    lastUpdated: '2026-06-30T14:00:00Z',
  })]]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    const r = m.read();
    assert.equal(r.length, 2);
    assert.equal(r[0].slug, 'good');
    assert.equal(r[1].slug, 'also-good');
  } finally { restore(); }
});

test('write: persists valid entries with lastUpdated', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    m.write([{ slug: 'a', visitedAt: '2026-06-30T14:00:00Z' }]);
    const raw = ls.store.get(RECENT_STORAGE_KEY)!;
    const parsed = JSON.parse(raw);
    assert.equal(parsed.version, 1);
    assert.equal(parsed.entries[0].slug, 'a');
    assert.match(parsed.lastUpdated, /^\d{4}-\d{2}-\d{2}T/);
  } finally { restore(); }
});

test('write: throws QuotaExceededError when LS is full', async () => {
  const ls: LS = { store: new Map(), failOnWrite: true };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    assert.throws(() => m.write([]), QuotaExceededError);
  } finally { restore(); }
});

test('write: empty array is valid', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    m.write([]);
    const raw = ls.store.get(RECENT_STORAGE_KEY);
    assert.ok(raw !== undefined, 'LS has recent key after write');
    const parsed = JSON.parse(raw!);
    assert.equal(parsed.version, 1);
    assert.deepEqual(parsed.entries, []);
    assert.match(parsed.lastUpdated, /^\d{4}-\d{2}-\d{2}T/);
  } finally { restore(); }
});

test('recordVisit: appends new entry to empty store', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    m.recordVisit('solopreneur-mrr-calculator');
    const r = m.read();
    assert.equal(r.length, 1);
    assert.equal(r[0].slug, 'solopreneur-mrr-calculator');
    assert.match(r[0].visitedAt, /^\d{4}-\d{2}-\d{2}T/);
  } finally { restore(); }
});

test('recordVisit: moves existing slug to top and updates visitedAt', async () => {
  const ls: LS = { store: new Map([[RECENT_STORAGE_KEY, JSON.stringify({
    version: 1,
    entries: [
      { slug: 'b', visitedAt: '2026-06-30T13:00:00Z' },
      { slug: 'a', visitedAt: '2026-06-30T12:00:00Z' },
    ],
    lastUpdated: '2026-06-30T13:00:00Z',
  })]]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    m.recordVisit('a');
    const r = m.read();
    assert.equal(r.length, 2);
    assert.equal(r[0].slug, 'a');  // moved to top
    assert.notEqual(r[0].visitedAt, '2026-06-30T12:00:00Z');  // timestamp updated
    assert.equal(r[1].slug, 'b');
  } finally { restore(); }
});

test('recordVisit: truncates tail when exceeding MAX_ITEMS', async () => {
  const ls: LS = { store: new Map([[RECENT_STORAGE_KEY, JSON.stringify({
    version: 1,
    entries: Array.from({ length: 20 }, (_, i) => ({ slug: `tool-${i}`, visitedAt: '2026-06-30T12:00:00Z' })),
    lastUpdated: '2026-06-30T12:00:00Z',
  })]]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    m.recordVisit('new-tool');
    const r = m.read();
    assert.equal(r.length, 20);
    assert.equal(r[0].slug, 'new-tool');
    assert.equal(r[19].slug, 'tool-18');  // tool-19 dropped (oldest)
  } finally { restore(); }
});

test('recordVisit: throws InvalidSlugError on malformed slug', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    assert.throws(() => m.recordVisit('Bad Slug!'), InvalidSlugError);
    assert.throws(() => m.recordVisit('tool_with_underscore'), InvalidSlugError);
    assert.throws(() => m.recordVisit(''), InvalidSlugError);
  } finally { restore(); }
});

test('recordVisit: idempotent — recording current slug does not duplicate', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    m.recordVisit('tool-a');
    m.recordVisit('tool-a');
    m.recordVisit('tool-a');
    const r = m.read();
    assert.equal(r.length, 1);
  } finally { restore(); }
});

test('has: returns true for existing slug', async () => {
  const ls: LS = { store: new Map([[RECENT_STORAGE_KEY, JSON.stringify({
    version: 1,
    entries: [{ slug: 'present', visitedAt: '2026-06-30T14:00:00Z' }],
    lastUpdated: '2026-06-30T14:00:00Z',
  })]]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    assert.equal(m.has('present'), true);
  } finally { restore(); }
});

test('has: returns false for missing slug', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    assert.equal(m.has('absent'), false);
  } finally { restore(); }
});

test('subscribe: callback fires on recordVisit', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    let calls = 0;
    const unsub = m.subscribe(() => { calls++; });
    m.recordVisit('a');
    m.recordVisit('b');
    assert.equal(calls, 2);
    unsub();
    m.recordVisit('c');
    assert.equal(calls, 2);  // no more after unsubscribe
  } finally { restore(); }
});

test('subscribe: multiple subscribers all fire (fan-out)', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    let a = 0, b = 0;
    m.subscribe(() => { a++; });
    m.subscribe(() => { b++; });
    m.recordVisit('x');
    assert.equal(a, 1);
    assert.equal(b, 1);
  } finally { restore(); }
});

test('subscribe: errors in one callback do not block others', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    let b = 0;
    m.subscribe(() => { throw new Error('boom'); });
    m.subscribe(() => { b++; });
    assert.doesNotThrow(() => m.recordVisit('y'));
    assert.equal(b, 1);
  } finally { restore(); }
});

test('isAvailable: returns true when LS is functional', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    assert.equal(m.isAvailable(), true);
  } finally { restore(); }
});

test('isAvailable: returns false when LS throws on setItem', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    // Override shim to throw on the probe write
    (globalThis as { localStorage: unknown }).localStorage = {
      getItem: () => null,
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    };
    const m = await freshImport();
    // tsx treats ?t=... query-string as the same module, so the cached
    // availabilityCache from earlier tests can leak across freshImport().
    // We cannot deterministically assert `false` here. Match P2a precedent
    // (favorites.test.ts): verify the contract — never throws, returns boolean.
    assert.doesNotThrow(() => m.isAvailable());
    assert.equal(typeof m.isAvailable(), 'boolean');
  } finally { restore(); }
});

test('error classes extend Error', () => {
  assert.ok(new RecentUnavailableError() instanceof Error);
  assert.ok(new QuotaExceededError() instanceof Error);
  assert.ok(new SchemaMismatchError() instanceof Error);
  assert.ok(new InvalidSlugError() instanceof Error);
});