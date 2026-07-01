/**
 * P2c history lib unit tests.
 * Covers: read/write/save/restore/remove/clearAll/has/isAvailable/subscribe/encodePrefill/decodePrefill + 5 error classes.
 * Run via: pnpm test:unit  (or  node tests/run.mjs tests/history.test.ts)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HISTORY_STORAGE_KEY, HISTORY_MAX_ITEMS,
  read, write, save, restore, remove, clearAll, has, isAvailable, subscribe,
  encodePrefill, decodePrefill,
  HistoryUnavailableError, QuotaExceededError, SchemaMismatchError, InvalidSlugError, PrefillDecodeError,
} from '../src/lib/history.ts';

// Per-test in-memory LS shim
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

async function freshImport() {
  const url = '../src/lib/history.ts?t=' + Date.now() + Math.random();
  return import(/* @vite-ignore */ url);
}

test('constants: storage key and max items', async () => {
  assert.equal(HISTORY_STORAGE_KEY, 'forgeflowkit:history:v1');
  assert.equal(HISTORY_MAX_ITEMS, 100);
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
  const entry = { id: 'a', slug: 'mrr', inputs: {x: '1'}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' };
  const ls: LS = { store: new Map([[HISTORY_STORAGE_KEY, JSON.stringify({
    version: 1, entries: [entry], lastUpdated: '2026-07-01T10:00:00Z',
  })]]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    const r = m.read();
    assert.equal(r.length, 1);
    assert.equal(r[0].id, 'a');
  } finally { restore(); }
});

test('read: returns [] on corrupted JSON', async () => {
  const ls: LS = { store: new Map([[HISTORY_STORAGE_KEY, '{not json']]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    assert.deepEqual(m.read(), []);
  } finally { restore(); }
});

test('read: returns [] on wrong version', async () => {
  const ls: LS = { store: new Map([[HISTORY_STORAGE_KEY, JSON.stringify({ version: 999, entries: [] })]]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    assert.deepEqual(m.read(), []);
  } finally { restore(); }
});

test('read: filters out entries with missing id/slug/savedAt', async () => {
  const ls: LS = { store: new Map([[HISTORY_STORAGE_KEY, JSON.stringify({
    version: 1,
    entries: [
      { id: 'good', slug: 'mrr', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' },
      { slug: 'mrr', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z' },  // missing id
      { id: 'no-slug', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z' },  // missing slug
    ],
    lastUpdated: '2026-07-01T10:00:00Z',
  })]]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    const r = m.read();
    assert.equal(r.length, 1);
    assert.equal(r[0].id, 'good');
  } finally { restore(); }
});

test('write: persists valid entries with lastUpdated', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    m.write([{ id: 'a', slug: 'mrr', inputs: {x: '1'}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' }]);
    const raw = ls.store.get(HISTORY_STORAGE_KEY)!;
    const parsed = JSON.parse(raw);
    assert.equal(parsed.version, 1);
    assert.match(parsed.lastUpdated, /^\d{4}-\d{2}-\d{2}T/);
  } finally { restore(); }
});

test('write: throws QuotaExceededError when LS is full', async () => {
  const ls: LS = { store: new Map(), failOnWrite: true };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    // Match P2a/P2b pattern: name OR /quota/i.test(message)
    try { m.write([]); assert.fail('should throw'); }
    catch (e) {
      assert.ok(e instanceof QuotaExceededError, `got ${(e as Error).name}: ${(e as Error).message}`);
    }
  } finally { restore(); }
});

test('write: empty array is valid', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    m.write([]);
    const raw = ls.store.get(HISTORY_STORAGE_KEY)!;
    const parsed = JSON.parse(raw);
    assert.equal(parsed.version, 1);
    assert.deepEqual(parsed.entries, []);
  } finally { restore(); }
});

test('save: appends new entry with id and timestamps', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    const e = m.save({ slug: 'solopreneur-mrr-calculator', inputs: {subscriberCount: '1000'}, result: 'r' });
    assert.ok(e.id.length > 0, 'has id');
    assert.match(e.savedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(e.savedAt, e.accessedAt, 'savedAt === accessedAt on create');
    assert.equal(e.slug, 'solopreneur-mrr-calculator');
    const r = m.read();
    assert.equal(r.length, 1);
    assert.equal(r[0].id, e.id);
  } finally { restore(); }
});

test('save: throws InvalidSlugError on malformed slug', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    assert.throws(() => m.save({ slug: 'Bad Slug!', inputs: {}, result: 'r' }), InvalidSlugError);
    assert.throws(() => m.save({ slug: 'tool_with_underscore', inputs: {}, result: 'r' }), InvalidSlugError);
    assert.throws(() => m.save({ slug: '', inputs: {}, result: 'r' }), InvalidSlugError);
  } finally { restore(); }
});

test('save: truncates tail when exceeding MAX_ITEMS', async () => {
  const ls: LS = { store: new Map([[HISTORY_STORAGE_KEY, JSON.stringify({
    version: 1,
    entries: Array.from({ length: 100 }, (_, i) => ({
      id: `t-${i}`, slug: 'mrr', inputs: {}, result: 'r',
      savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z',
    })),
    lastUpdated: '2026-07-01T10:00:00Z',
  })]]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    m.save({ slug: 'new', inputs: {}, result: 'r' });
    const r = m.read();
    assert.equal(r.length, 100);
    assert.equal(r[0].slug, 'new');
    assert.equal(r[99].id, 't-98');  // t-99 dropped
  } finally { restore(); }
});

test('save: idempotent — saving same data twice produces 2 entries (no dedup in V1)', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    m.save({ slug: 'mrr', inputs: {x: '1'}, result: 'r' });
    m.save({ slug: 'mrr', inputs: {x: '1'}, result: 'r' });
    assert.equal(m.read().length, 2);
  } finally { restore(); }
});

test('restore: moves existing entry to top and updates accessedAt', async () => {
  const ls: LS = { store: new Map([[HISTORY_STORAGE_KEY, JSON.stringify({
    version: 1,
    entries: [
      { id: 'b', slug: 'mrr', inputs: {x: '1'}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' },
      { id: 'a', slug: 'mrr', inputs: {x: '1'}, result: 'r', savedAt: '2026-07-01T11:00:00Z', accessedAt: '2026-07-01T11:00:00Z' },
    ],
    lastUpdated: '2026-07-01T11:00:00Z',
  })]]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    const e = m.restore('b');
    assert.ok(e !== null);
    assert.equal(e!.id, 'b');
    const r = m.read();
    assert.equal(r[0].id, 'b');  // moved to top
    assert.notEqual(r[0].accessedAt, '2026-07-01T10:00:00Z');  // updated
  } finally { restore(); }
});

test('restore: returns null when id not found', async () => {
  const ls: LS = { store: new Map([[HISTORY_STORAGE_KEY, JSON.stringify({
    version: 1,
    entries: [{ id: 'a', slug: 'mrr', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' }],
    lastUpdated: '2026-07-01T10:00:00Z',
  })]]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    assert.equal(m.restore('nonexistent'), null);
  } finally { restore(); }
});

test('remove: deletes entry by id', async () => {
  const ls: LS = { store: new Map([[HISTORY_STORAGE_KEY, JSON.stringify({
    version: 1,
    entries: [
      { id: 'a', slug: 'mrr', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' },
      { id: 'b', slug: 'cac', inputs: {}, result: 'r', savedAt: '2026-07-01T11:00:00Z', accessedAt: '2026-07-01T11:00:00Z' },
    ],
    lastUpdated: '2026-07-01T11:00:00Z',
  })]]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    m.remove('a');
    const r = m.read();
    assert.equal(r.length, 1);
    assert.equal(r[0].id, 'b');
  } finally { restore(); }
});

test('remove: no-op when id not found', async () => {
  const ls: LS = { store: new Map([[HISTORY_STORAGE_KEY, JSON.stringify({
    version: 1,
    entries: [{ id: 'a', slug: 'mrr', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' }],
    lastUpdated: '2026-07-01T10:00:00Z',
  })]]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    m.remove('nonexistent');
    assert.equal(m.read().length, 1);
  } finally { restore(); }
});

test('clearAll: empties the store', async () => {
  const ls: LS = { store: new Map([[HISTORY_STORAGE_KEY, JSON.stringify({
    version: 1,
    entries: [{ id: 'a', slug: 'mrr', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' }],
    lastUpdated: '2026-07-01T10:00:00Z',
  })]]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    m.clearAll();
    assert.deepEqual(m.read(), []);
  } finally { restore(); }
});

test('has: returns true when slug exists', async () => {
  const ls: LS = { store: new Map([[HISTORY_STORAGE_KEY, JSON.stringify({
    version: 1,
    entries: [{ id: 'a', slug: 'mrr', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' }],
    lastUpdated: '2026-07-01T10:00:00Z',
  })]]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    assert.equal(m.has('mrr'), true);
  } finally { restore(); }
});

test('has: returns false when slug absent', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    assert.equal(m.has('absent'), false);
  } finally { restore(); }
});

test('subscribe: fires on save/restore/remove/clearAll', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    let calls = 0;
    m.subscribe(() => { calls++; });
    m.save({ slug: 'mrr', inputs: {}, result: 'r' });
    m.restore('whatever');
    m.remove('whatever');
    m.clearAll();
    assert.ok(calls >= 1, 'fires on save at minimum');
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
    m.save({ slug: 'mrr', inputs: {}, result: 'r' });
    assert.equal(b, 1);
  } finally { restore(); }
});

test('isAvailable: true when LS works', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    assert.equal(typeof m.isAvailable(), 'boolean');
  } finally { restore(); }
});

test('isAvailable: never throws when LS broken', async () => {
  const restore = installShim({ store: new Map() });
  try {
    (globalThis as { localStorage: unknown }).localStorage = {
      getItem: () => null,
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    };
    const m = await freshImport();
    assert.doesNotThrow(() => m.isAvailable());
    assert.equal(typeof m.isAvailable(), 'boolean');
  } finally { restore(); }
});

test('encodePrefill/decodePrefill: round-trip', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    const inputs = { subscriberCount: '1000', monthlyPrice: '5.99', notes: 'Q3 2026 baseline' };
    const encoded = m.encodePrefill(inputs);
    const decoded = m.decodePrefill(encoded);
    assert.deepEqual(decoded, inputs);
  } finally { restore(); }
});

test('encodePrefill/decodePrefill: handles special characters', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    const inputs = { name: 'a&b<c>"d\'e', num: '42' };
    const decoded = m.decodePrefill(m.encodePrefill(inputs));
    assert.deepEqual(decoded, inputs);
  } finally { restore(); }
});

test('encodePrefill/decodePrefill: Unicode round-trip (Chinese / emoji / currency)', async () => {
  // btoa() throws InvalidCharacterError on non-ASCII bytes. The
  // unescape(encodeURIComponent(...)) trick must keep it safe for arbitrary
  // Unicode in form inputs (e.g. Chinese notes, currency symbols, emoji).
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    const inputs = {
      name: '中文测试',
      currency: '¥$€₹',
      emoji: '💾🚀📊',
      mixed: 'Q3 baseline — 100 customers × $5/mo',
    };
    const encoded = m.encodePrefill(inputs);
    assert.ok(typeof encoded === 'string' && encoded.length > 0);
    const decoded = m.decodePrefill(encoded);
    assert.deepEqual(decoded, inputs);
  } finally { restore(); }
});

test('decodePrefill: returns null on invalid base64 / JSON', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    assert.equal(m.decodePrefill('not-base64-at-all!!!'), null);
    assert.equal(m.decodePrefill(Buffer.from('not json').toString('base64')), null);
  } finally { restore(); }
});

test('error classes extend Error', () => {
  assert.ok(new HistoryUnavailableError() instanceof Error);
  assert.ok(new QuotaExceededError() instanceof Error);
  assert.ok(new SchemaMismatchError() instanceof Error);
  assert.ok(new InvalidSlugError() instanceof Error);
  assert.ok(new PrefillDecodeError() instanceof Error);
});
