import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tools } from '../src/data/tools/index.ts';

const ROOT = join(import.meta.dirname, '..');

interface BlogPostFixture {
  slug: string;
  title: string;
  excerpt: string;
  ogImage: string;
  toolSlug: string;
  content: string;
}

const blogDir = resolve(ROOT, 'src/content/blog');
const mdFiles = readdirSync(blogDir).filter(f => f.endsWith('.md'));
const blogPosts: BlogPostFixture[] = mdFiles.map(f => {
  const raw = readFileSync(resolve(blogDir, f), 'utf-8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`bad frontmatter in ${f}`);
  const fm: Record<string, string> = {};
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim().replace(/^'|'$/g, '');
    fm[k] = v;
  }
  return {
    slug: f.replace(/\.md$/, ''),
    title: fm.title ?? '',
    excerpt: fm.excerpt ?? '',
    ogImage: fm.ogImage ?? '',
    toolSlug: fm.toolSlug ?? '',
    content: m[2],
  };
});

test('BlogPost.ogImage field is set to toolSlug for all posts', async () => {
  // P57: dynamic count from tools registry, but allows backlog (P58 candidate: 100/100).
  // As of P57: blogPosts.length === tools.length - 64 (backlog tracked in drift-guard T2).
  // Future P-series that add blog posts will see this number grow; coverage is monitored.
  assert.ok(
    blogPosts.length > 0 && blogPosts.length <= tools.length,
    `blogPosts.length=${blogPosts.length} must be in (0, ${tools.length}]`
  );
  for (const post of blogPosts) {
    assert.equal(
      post.ogImage,
      post.toolSlug,
      `post ${post.slug} should have ogImage === toolSlug (got ${post.ogImage})`
    );
  }
});

test('built blog HTML contains hero <img> referencing OG image', () => {
  const slug = 'best-solopreneur-time-value-calculator';
  const htmlPath = join(ROOT, 'dist', 'en', 'blog', slug, 'index.html');
  if (!existsSync(htmlPath)) {
    console.log(`Skipping: ${htmlPath} not built. Run pnpm build first.`);
    return;
  }
  const html = readFileSync(htmlPath, 'utf8');
  assert.match(
    html,
    /<img[^>]+src="\/og\/solopreneur-time-value-calculator-en\.png"/i,
    'blog HTML should contain hero img with src to OG image'
  );
});
