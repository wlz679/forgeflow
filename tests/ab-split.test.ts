import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');

test('engines/ has 9 subdirectories', () => {
  for (const sub of ['saas', 'ai-cost', 'valuation', 'freelance', 'cost', 'investment', 'real-estate', 'marketing', 'operations']) {
    assert.ok(
      existsSync(join(ROOT, 'src/engines', sub)),
      `engines/${sub}/ should exist`
    );
  }
});

test('engines/index.ts uses import.meta.glob', () => {
  const content = readFileSync(join(ROOT, 'src/engines/index.ts'), 'utf8');
  assert.match(content, /import\.meta\.glob/, 'engines/index.ts should use import.meta.glob');
  assert.ok(!content.includes("import './cac-calculator"), 'engines/index.ts should not have hand-written engine imports');
});

test('engines/ has no engine .ts files at root (only index.ts)', () => {
  const { readdirSync } = require('node:fs') as typeof import('node:fs');
  const entries = readdirSync(join(ROOT, 'src/engines'));
  const rootTs = entries.filter(f => f.endsWith('.ts'));
  assert.deepEqual(rootTs, ['index.ts'], `engines/ root should only have index.ts, found: ${rootTs.join(', ')}`);
});

test('data/tools/ has 11 files (types, 9 categories, index)', () => {
  for (const f of ['types.ts', 'saas.ts', 'ai-cost.ts', 'valuation.ts', 'freelance.ts', 'cost.ts', 'investment.ts', 'real-estate.ts', 'marketing.ts', 'operations.ts', 'index.ts']) {
    assert.ok(
      existsSync(join(ROOT, 'src/data/tools', f)),
      `data/tools/${f} should exist`
    );
  }
});

test('old src/data/tools.ts is deleted', () => {
  assert.ok(
    !existsSync(join(ROOT, 'src/data/tools.ts')),
    'src/data/tools.ts should be deleted'
  );
});

test('tools/index.ts uses import.meta.glob', () => {
  const content = readFileSync(join(ROOT, 'src/data/tools/index.ts'), 'utf8');
  assert.match(content, /import\.meta\.glob/, 'tools/index.ts should use import.meta.glob');
});

test('getAllEngines() returns 50 engines after import', async () => {
  await import('../src/engines/index.ts');
  const { getAllEngines } = await import('../src/core/engines/registry.ts');
  assert.equal(getAllEngines().length, 50);
});

test('aggregated tools array has 50 entries', async () => {
  const { tools } = await import('../src/data/tools/index.ts');
  assert.equal(tools.length, 50);
});

test('4 consumer import paths are unchanged', () => {
  const consumers = [
    ['src/lib/blog.ts', `from '../data/tools'`],
    ['src/data/internal-links.ts', `from './tools'`],
    ['src/pages/[lang]/index.astro', `from '../../data/tools'`],
    ['src/pages/[lang]/[slug].astro', `from '../../data/tools'`],
  ] as const;
  for (const [file, expectedImport] of consumers) {
    const content = readFileSync(join(ROOT, file), 'utf8');
    assert.ok(
      content.includes(expectedImport),
      `${file} should still contain ${expectedImport}`
    );
  }
});
