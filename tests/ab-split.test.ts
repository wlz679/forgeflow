import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { EXPECTED_ENGINE_COUNT } from './engine-count.ts';

const ROOT = join(import.meta.dirname, '..');

test('engines/ has 16 subdirectories', () => {
  for (const sub of ['saas', 'ai-cost', 'valuation', 'freelance', 'cost', 'investment', 'real-estate', 'marketing', 'operations', 'sales', 'retention', 'product-analytics', 'hiring-team', 'customer-support', 'knowledge', 'legal-compliance']) {
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

test('data/tools/ has 18 files (types, 16 categories, index)', () => {
  for (const f of ['types.ts', 'saas.ts', 'ai-cost.ts', 'valuation.ts', 'freelance.ts', 'cost.ts', 'investment.ts', 'real-estate.ts', 'marketing.ts', 'operations.ts', 'sales.ts', 'retention.ts', 'product-analytics.ts', 'hiring-team.ts', 'customer-support.ts', 'knowledge.ts', 'legal-compliance.ts', 'index.ts']) {
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

test(`getAllEngines() returns ${EXPECTED_ENGINE_COUNT} engines after import`, async () => {
  await import('../src/engines/index.ts');
  const { getAllEngines } = await import('../src/core/engines/registry.ts');
  assert.equal(getAllEngines().length, EXPECTED_ENGINE_COUNT);
});

test(`aggregated tools array has ${EXPECTED_ENGINE_COUNT} entries`, async () => {
  const { tools } = await import('../src/data/tools/index.ts');
  assert.equal(tools.length, EXPECTED_ENGINE_COUNT);
});

// P153-E2: this used to assert a hand-written list of 4 consumer files.
// The list had rotted — `src/lib/blog.ts` was deleted with the blog
// (32a982e), so the guard died with ENOENT instead of checking anything,
// while the real consumer set had grown to 24 files that nobody was
// checking at all.
//
// New contract: EVERY module under src/ that imports the tools registry
// must import it from the canonical relative path, and it must resolve to
// the registry barrel (src/data/tools/index.ts) — not to a deep path into
// one of the category files. The consumer set is derived from the source
// tree, so it cannot drift and it covers files the old list never knew
// about.
test('tools 注册表的每个消费者都从规范相对路径导入（从源码推导，非手抄清单）', () => {
  const barrelDir = join(ROOT, 'src/data/tools');
  const barrelFile = join(barrelDir, 'index.ts');

  const files: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx|astro|mjs|js)$/.test(e.name)) files.push(p);
    }
  };
  walk(join(ROOT, 'src'));

  const consumers: { file: string; spec: string; canonical: string; resolved: string }[] = [];
  const offenders: string[] = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const specs = [
      ...content.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g),
      ...content.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g),
    ].map((m) => m[1]!);

    for (const spec of specs) {
      if (!spec.startsWith('.')) continue;
      const resolved = resolve(dirname(file), spec);
      const hitsBarrel = resolved === barrelDir || resolved === barrelFile;
      if (!hitsBarrel) continue;

      const rel = relative(dirname(file), barrelDir).replace(/\\/g, '/');
      const canonical = rel.startsWith('.') ? rel : `./${rel}`;
      consumers.push({
        file: relative(ROOT, file).replace(/\\/g, '/'),
        spec,
        canonical,
        resolved: relative(ROOT, resolved).replace(/\\/g, '/'),
      });
      if (spec !== canonical) {
        offenders.push(
          `${relative(ROOT, file).replace(/\\/g, '/')}: 用了 '${spec}'，规范写法是 '${canonical}'`,
        );
      }
    }
  }

  // Non-vacuity: if the walk or the import regex broke, this list would be
  // empty and the assertions above would pass without checking anything.
  assert.ok(
    consumers.length > 0,
    '没有找到任何 tools 注册表的消费者 —— 扫描逻辑已失效（断言会空转通过）',
  );
  assert.deepEqual(
    offenders,
    [],
    `tools 注册表的导入路径不规范:\n  ${offenders.join('\n  ')}`,
  );
});
