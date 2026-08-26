import { test, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  saveTemplate,
  listTemplates,
  deleteTemplate,
  TEMPLATES_MAX,
} from '../src/lib/enterprise/template-manager.ts';

class MemoryStorage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  key(i: number) { return Array.from(this.store.keys())[i] ?? null; }
  getItem(k: string) { return this.store.get(k) ?? null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
}

const memStore = new MemoryStorage();
(globalThis as any).localStorage = memStore;

// Isolate each test from prior storage state. The brief's verbatim tests
// share calcSlug='calc-a' across both cases, so without isolation the
// quota-filling first test leaves 20 templates that break the second
// test's `list.length === 2` assertion.
beforeEach(() => {
  memStore.clear();
});

test('saveTemplate enforces max20 (returns quota)', () => {
  for (let i = 0; i < TEMPLATES_MAX; i++) {
    saveTemplate({ calcSlug: 'calc-a', name: `T${i}`, inputs: {} });
  }
  const overflow = saveTemplate({ calcSlug: 'calc-a', name: 'OVER', inputs: {} });
  assert.equal(overflow.ok, false);
  if (overflow.ok) return;
  assert.equal(overflow.reason, 'quota');
});

test('listTemplates sorts by updatedAt desc', () => {
  saveTemplate({ calcSlug: 'calc-a', name: 'First', inputs: { x: 1 } });
  // small delay so updatedAt differs
  const later = new Date(Date.now() + 10).toISOString();
  saveTemplate({ calcSlug: 'calc-a', name: 'Second', inputs: { x: 2 } });
  const list = listTemplates('calc-a');
  assert.equal(list.length, 2);
  assert.equal(list[0].name, 'Second');
  assert.equal(list[1].name, 'First');
});