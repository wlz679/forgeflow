import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  safeStorageGet,
  safeStorageSet,
  safeStorageDelete,
  STORAGE_KEYS,
} from '../src/lib/enterprise/storage.ts';

// In-memory localStorage mock (per CLAUDE.md: test doubles must mirror
// the real runtime's limitations; grant only what localStorage grants).
class MemoryStorage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  key(i: number) { return Array.from(this.store.keys())[i] ?? null; }
  getItem(k: string) { return this.store.get(k) ?? null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
}

(globalThis as any).localStorage = new MemoryStorage();

test('STORAGE_KEYS has the 3 expected keys', () => {
  assert.equal(STORAGE_KEYS.scenarios, 'ffk.scenarios.v1');
  assert.equal(STORAGE_KEYS.templates, 'ffk.templates.v1');
  assert.equal(STORAGE_KEYS.reportConfig, 'ffk.reportConfig.v1');
});

test('safeStorageGet returns fallback when key missing', () => {
  const result = safeStorageGet<number[]>('missing.key', []);
  assert.deepEqual(result, []);
});

test('safeStorageGet parses valid JSON envelope', () => {
  (globalThis as any).localStorage.setItem(
    'test.list.v1',
    JSON.stringify({ schemaVersion: 1, data: [1, 2, 3] })
  );
  const result = safeStorageGet<number[]>('test.list.v1', []);
  assert.deepEqual(result, [1, 2, 3]);
});

test('safeStorageGet returns fallback on JSON parse error', () => {
  (globalThis as any).localStorage.setItem('test.corrupt.v1', '{not valid json');
  const result = safeStorageGet<number[]>('test.corrupt.v1', [42]);
  assert.deepEqual(result, [42]);
});

test('safeStorageGet returns fallback on schemaVersion mismatch', () => {
  (globalThis as any).localStorage.setItem(
    'test.v99.v1',
    JSON.stringify({ schemaVersion: 99, data: [1, 2, 3] })
  );
  const result = safeStorageGet<number[]>('test.v99.v1', []);
  assert.deepEqual(result, []);
});

test('safeStorageSet writes JSON envelope with schemaVersion 1', () => {
  const ok = safeStorageSet('test.write.v1', [10, 20]);
  assert.equal(ok, true);
  const raw = (globalThis as any).localStorage.getItem('test.write.v1');
  assert.ok(raw);
  const parsed = JSON.parse(raw);
  assert.equal(parsed.schemaVersion, 1);
  assert.deepEqual(parsed.data, [10, 20]);
});

test('safeStorageSet returns false when localStorage throws', () => {
  const throwing = {
    getItem: () => { throw new Error('QuotaExceeded'); },
    setItem: () => { throw new Error('QuotaExceeded'); },
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    get length() { return 0; },
  };
  const prev = (globalThis as any).localStorage;
  (globalThis as any).localStorage = throwing;
  const result = safeStorageSet('test.quota.v1', [1]);
  assert.equal(result, false);
  (globalThis as any).localStorage = prev;
});

test('safeStorageDelete removes key', () => {
  (globalThis as any).localStorage.setItem('test.del.v1', '{"schemaVersion":1,"data":[]}');
  const ok = safeStorageDelete('test.del.v1');
  assert.equal(ok, true);
  assert.equal((globalThis as any).localStorage.getItem('test.del.v1'), null);
});
