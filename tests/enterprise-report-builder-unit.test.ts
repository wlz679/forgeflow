import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  generateReport,
  saveReportConfig,
  getReportConfig,
} from '../src/lib/enterprise/report-builder.ts';

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

test('generateReport produces HTML string with required sections', async () => {
  const r = await generateReport(
    {
      calcSlug: 'solopreneur-mrr-calculator',
      title: 'Test Report',
      inputs: { mrr: 1000 },
      outputs: { arr: 12000 },
    },
    'html'
  );
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.ok(r.html);
  assert.ok(r.html.includes('Test Report'));
  assert.ok(r.html.includes('solopreneur-mrr-calculator'));
  assert.ok(r.html.includes('mrr'));
  assert.ok(r.html.includes('12000'));
});

test('generateReport handles missing healthBand gracefully', async () => {
  const r = await generateReport(
    {
      calcSlug: 'test-calc',
      title: 'No Band',
      inputs: { x: 1 },
      outputs: { y: 2 },
      // healthBand omitted
    },
    'html'
  );
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.ok(r.html);
  // Should not contain "🟢🟡🟠🔴" sequence since band omitted
  assert.ok(!r.html.includes('🟢🟡🟠🔴'));
});

test('saveReportConfig + getReportConfig round-trip', () => {
  const ok = saveReportConfig({ titleTemplate: 'My Report', format: 'pdf' });
  assert.equal(ok, true);
  const cfg = getReportConfig();
  assert.equal(cfg.titleTemplate, 'My Report');
  assert.equal(cfg.format, 'pdf');
});
