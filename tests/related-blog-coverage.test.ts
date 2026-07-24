import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tools } from '../src/data/tools/index.ts';
import { EXPECTED_ENGINE_COUNT } from './engine-count.ts';

// Resolve at test time; Astro's getCollection isn't available outside Astro,
// so we mirror its behavior by reading frontmatter directly.
function readBlogFrontmatter(file: string): { toolSlug: string } | null {
  const text = readFileSync(file, 'utf8');
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const tm = m[1].match(/toolSlug:\s*'([^']+)'/);
  return tm ? { toolSlug: tm[1] } : null;
}

const blogDir = join(process.cwd(), 'src/content/blog');
const blogFiles = readdirSync(blogDir).filter(f => f.endsWith('.md'));
const blogTools = new Set(
  blogFiles
    .map(f => readBlogFrontmatter(join(blogDir, f))?.toolSlug)
    .filter((s): s is string => Boolean(s))
);

test(`every tool (${EXPECTED_ENGINE_COUNT}) has exactly 1 matching blog`, () => {
  const missing: string[] = [];
  for (const t of tools) {
    if (!blogTools.has(t.slug)) missing.push(t.slug);
  }
  assert.equal(missing.length, 0, `tools missing blog: ${missing.join(', ')}`);
});

test('no orphan blog files (every blog references a real tool)', () => {
  const toolSlugs = new Set(tools.map(t => t.slug));
  const orphan: string[] = [];
  for (const file of blogFiles) {
    const fm = readBlogFrontmatter(join(blogDir, file));
    if (!fm || !toolSlugs.has(fm.toolSlug)) orphan.push(file);
  }
  assert.equal(orphan.length, 0, `orphan blogs: ${orphan.join(', ')}`);
});

test('blog file name matches toolSlug (best-solopreneur-<toolSlug>.md convention)', () => {
  for (const file of blogFiles) {
    const fm = readBlogFrontmatter(join(blogDir, file));
    assert.ok(fm, `${file} has no parseable frontmatter`);
    const expected = `best-solopreneur-${fm!.toolSlug.replace(/^solopreneur-/, '')}.md`;
    assert.equal(file, expected, `${file} should be named ${expected}`);
  }
});