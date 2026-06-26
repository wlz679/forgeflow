import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');

test('BlogPost.ogImage field is set to toolSlug for all 32 posts', async () => {
  const { blogPosts } = await import('../src/data/blog-posts.ts');
  assert.ok(blogPosts.length === 32, `expected 32 blog posts, got ${blogPosts.length}`);
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