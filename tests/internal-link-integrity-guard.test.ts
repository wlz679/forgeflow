// P153: internal link integrity — every internal href in the built site must
// resolve to a path that actually exists.
//
// WHY THIS GUARD EXISTS
// ---------------------
// It was missing, and its absence hid a real defect. Measured 2026-10-23 by
// crawling dist/:
//   · 98 distinct broken link targets
//   · ~586 broken link instances, spread over 437 pages
//   · every one of them had the same cause: `TopicCard.astro` built its href
//     as `/${lang}/${cat.slug}/${topic.id}/` while the topic routes are
//     `[topic]-guide.astro` / `[topic]-benchmark.astro` / `[topic]-compare.astro`
//     — so the bare topic id was never a URL, it 404'd.
//
// The guards that SHOULD have caught it did not, because they all stopped one
// step short of the thing that matters:
//   · comparison-cross-link-guard: checks that `relatedTopicIds` resolve to
//     existing TOPICS *entries* (data level) and that pages have >=1 related
//     link (count level) — it never checks that the link's href opens.
//   · sitemap-url-coverage-guard: checks sitemap -> dist, not page -> dist.
//   · canonical-url-guard / html-hreflang-guard: check the head, not the body.
// A link can be perfectly "correct" in every one of those senses and still
// point at a 404.
//
// WHY IT MATTERS HERE
// -------------------
// Broken internal links are exactly what a human reviewer (or a quality
// crawler) clicks. 586 of them, each topic 8-14 times, across the letter
// pages' Topics grid and every page's Related Topics section.
//
// Build dependency: dist/ is required. The suite follows the repo's
// established build-dep pattern: skip unless RUN_BUILD_TESTS=1, and build
// dist/ itself if it is missing.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'en', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p153] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

/** Every file under dist/, as a repo-relative path. */
function collectFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

/**
 * The set of URL paths the site can actually serve, derived from the build
 * output. `index.html` is the directory index, so `dist/en/x/index.html`
 * serves BOTH `/en/x/` and `/en/x`.
 */
function buildValidPaths(distDir: string): Set<string> {
  const valid = new Set<string>();
  for (const file of collectFiles(distDir)) {
    let p = '/' + relative(distDir, file).replaceAll('\\', '/');
    if (p.endsWith('/index.html')) {
      const dir = p.slice(0, -'index.html'.length); // keeps the trailing slash
      valid.add(dir);
      valid.add(dir.slice(0, -1)); // without the trailing slash
    } else {
      valid.add(p);
    }
  }
  return valid;
}

/** Internal links only: same-site absolute paths. External, mailto, tel, pure-fragment and query-only links are not our problem. */
function internalHrefs(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/href="([^"]*)"/g)) {
    const href = m[1];
    if (!href.startsWith('/')) continue;      // external, mailto:, tel:, relative
    if (href.startsWith('//')) continue;      // protocol-relative
    const path = href.split('#')[0].split('?')[0];
    if (path === '') continue;                // pure fragment
    out.push(path);
  }
  return out;
}

test('every internal link in the built site resolves to a real path', () => {
  ensureBuilt();
  const distDir = resolve(root, 'dist');
  const htmlFiles = collectFiles(distDir).filter((f) => f.endsWith('.html'));

  // Non-vacuity: a broken scan (or a half-finished build) would leave this
  // empty and the loop below would pass without checking anything.
  assert.ok(htmlFiles.length >= 50, `dist/ 只有 ${htmlFiles.length} 个 HTML 文件 —— 构建可能未完成`);

  const valid = buildValidPaths(distDir);
  const broken = new Map<string, { count: number; from: Set<string> }>();

  for (const file of htmlFiles) {
    const html = readFileSync(file, 'utf8');
    const from = '/' + relative(distDir, file).replaceAll('\\', '/');
    for (const href of new Set(internalHrefs(html))) {
      if (valid.has(href)) continue;
      if (!broken.has(href)) broken.set(href, { count: 0, from: new Set() });
      const b = broken.get(href)!;
      b.count++;
      if (b.from.size < 3) b.from.add(from);
    }
  }

  const report = [...broken.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([href, b]) => `  ${String(b.count).padStart(4)}x  ${href}   (e.g. ${[...b.from][0]})`)
    .join('\n');

  assert.equal(
    broken.size,
    0,
    `${broken.size} 个内部链接指向不存在的路径（共 ${[...broken.values()].reduce((a, b) => a + b.count, 0)} 处）:\n${report}\n\n` +
      `链接必须指向构建产物里真实存在的路径。Topic 的路由文件是 [topic]-guide.astro /\n` +
      `[topic]-benchmark.astro / [topic]-compare.astro,所以裸 topic id 不是 URL(会 404)——\n` +
      `见 src/components/TopicCard.astro 的 variantSuffix。`,
  );
});

test('the site has internal links to check (non-vacuity)', () => {
  ensureBuilt();
  const distDir = resolve(root, 'dist');
  const htmlFiles = collectFiles(distDir).filter((f) => f.endsWith('.html'));
  let links = 0;
  for (const file of htmlFiles) {
    links += internalHrefs(readFileSync(file, 'utf8')).length;
  }
  assert.ok(links > 1000, `只扫到 ${links} 条内部链接 —— 扫描器可能坏了`);
});
