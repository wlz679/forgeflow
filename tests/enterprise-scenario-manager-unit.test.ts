import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  saveScenario,
  listScenarios,
  deleteScenario,
  SCENARIOS_MAX,
} from '../src/lib/enterprise/scenario-manager.ts';

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

test('saveScenario adds a scenario with id + timestamps', () => {
  const r = saveScenario({
    calcSlug: 'solopreneur-mrr-calculator',
    label: 'Test scenario',
    inputs: { mrr: 1000 },
    outputs: { arr: 12000 },
  });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.ok(r.scenario.id.length > 0);
  assert.equal(r.scenario.calcSlug, 'solopreneur-mrr-calculator');
  assert.equal(r.scenario.label, 'Test scenario');
  assert.ok(r.scenario.createdAt);
  assert.ok(r.scenario.updatedAt);
  assert.equal(r.scenario.schemaVersion, 1);
});

test('listScenarios filters by exact calcSlug', () => {
  saveScenario({ calcSlug: 'calc-a', label: 'A1', inputs: {}, outputs: {} });
  saveScenario({ calcSlug: 'calc-b', label: 'B1', inputs: {}, outputs: {} });
  saveScenario({ calcSlug: 'calc-a', label: 'A2', inputs: {}, outputs: {} });
  const listA = listScenarios('calc-a');
  assert.equal(listA.length, 2);
  assert.ok(listA.every(s => s.calcSlug === 'calc-a'));
});

test('deleteScenario removes by id, returns false on missing id', () => {
  const r = saveScenario({ calcSlug: 'calc-x', label: 'X', inputs: {}, outputs: {} });
  if (!r.ok) throw new Error('setup failed');
  const ok = deleteScenario(r.scenario.id);
  assert.equal(ok, true);
  const missing = deleteScenario('nonexistent-id');
  assert.equal(missing, false);
});