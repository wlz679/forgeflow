import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tools } from '../src/data/tools/index.ts';

const distDir = resolve(process.cwd(), 'dist');

function extractJsonLd(html: string): any[] {
  const blocks: any[] = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try { blocks.push(JSON.parse(m[1])); } catch { /* skip malformed */ }
  }
  return blocks;
}

test('EEAT — every tool page HTML has SoftwareApplication with author/dateModified/reviewedBy', { skip: !existsSync(distDir) }, () => {
  for (const tool of tools) {
    const path = resolve(distDir, 'en', tool.slug, 'index.html');
    assert.ok(existsSync(path), `dist missing: ${path}`);
    const html = readFileSync(path, 'utf-8');
    const blocks = extractJsonLd(html);
    const graph = blocks.flatMap(b => b['@graph'] ?? [b]);
    const sa = graph.find(b => b['@type'] === 'SoftwareApplication');
    assert.ok(sa, `${tool.slug}: no SoftwareApplication schema`);
    assert.ok(sa.author, `${tool.slug}: missing author`);
    assert.equal(sa.author['@id'], 'https://forgeflowkit.com/#org', `${tool.slug}: author should be canonical @id reference`);
    assert.ok(sa.dateModified, `${tool.slug}: missing dateModified`);
    assert.match(sa.dateModified, /^\d{4}-\d{2}-\d{2}$/, `${tool.slug}: dateModified must be YYYY-MM-DD`);
    assert.ok(sa.reviewedBy, `${tool.slug}: missing reviewedBy`);
    assert.equal(sa.reviewedBy['@type'], 'Organization', `${tool.slug}: reviewedBy should be Organization`);
  }
});

test('EEAT — author is uniform ForgeFlowKit across 32 tools', { skip: !existsSync(distDir) }, () => {
  for (const tool of tools) {
    assert.equal(tool.author, 'ForgeFlowKit', `${tool.slug}: author must be ForgeFlowKit`);
    assert.equal(tool.reviewedBy, 'ForgeFlowKit Team', `${tool.slug}: reviewedBy must be ForgeFlowKit Team`);
    assert.match(tool.dataReviewedAt, /^\d{4}-\d{2}-\d{2}$/, `${tool.slug}: dataReviewedAt must be YYYY-MM-DD`);
    assert.ok(Array.isArray(tool.sources) && tool.sources.length >= 2, `${tool.slug}: sources must be array of 2+ items`);
  }
});

test('CATEGORY — all 6 category pages emit CollectionPage with ItemList', { skip: !existsSync(distDir) }, () => {
  const categorySlugs = ['saas-metrics','ai-cost-tools','valuation-exit','freelance-pricing','cost-efficiency','investment-roi'];
  for (const slug of categorySlugs) {
    const path = resolve(distDir, 'en', slug, 'index.html');
    assert.ok(existsSync(path), `dist missing: ${path}`);
    const html = readFileSync(path, 'utf-8');
    const blocks = extractJsonLd(html);
    const graph = blocks.flatMap(b => b['@graph'] ?? [b]);
    const cp = graph.find(b => b['@type'] === 'CollectionPage');
    assert.ok(cp, `${slug}: no CollectionPage schema`);
    assert.ok(cp.hasPart, `${slug}: CollectionPage missing hasPart`);
    assert.equal(cp.hasPart['@type'], 'ItemList', `${slug}: hasPart should be ItemList`);
    assert.ok(Array.isArray(cp.hasPart.itemListElement) && cp.hasPart.itemListElement.length > 0, `${slug}: ItemList should have 1+ items`);
  }
});

test('BREADCRUMB — every tool page breadcrumb has 3 items (Home > Category > Tool)', { skip: !existsSync(distDir) }, () => {
  for (const tool of tools) {
    const path = resolve(distDir, 'en', tool.slug, 'index.html');
    assert.ok(existsSync(path), `dist missing: ${path}`);
    const html = readFileSync(path, 'utf-8');
    const blocks = extractJsonLd(html);
    const graph = blocks.flatMap(b => b['@graph'] ?? [b]);
    const bc = graph.find(b => b['@type'] === 'BreadcrumbList');
    assert.ok(bc, `${tool.slug}: no BreadcrumbList schema`);
    assert.equal(bc.itemListElement.length, 3, `${tool.slug}: breadcrumb should have 3 items, has ${bc.itemListElement.length}`);
    assert.equal(bc.itemListElement[0].position, 1, `${tool.slug}: position 1 should be Home`);
    assert.equal(bc.itemListElement[2].position, 3, `${tool.slug}: position 3 should be Tool`);
  }
});

test('P2a — favorites page is WebPage without user data', { skip: !existsSync(distDir) }, () => {
  for (const lang of ['en', 'zh']) {
    const path = resolve(distDir, lang, 'favorites', 'index.html');
    assert.ok(existsSync(path), `dist missing: ${path}`);
    const html = readFileSync(path, 'utf-8');
    const blocks = extractJsonLd(html);
    const graph = blocks.flatMap(b => b['@graph'] ?? [b]);
    const wp = graph.find(b => b['@type'] === 'WebPage');
    assert.ok(wp, `${lang}/favorites: no WebPage schema`);
    assert.match(wp.name, /Favorites|收藏/);
    // User data must NOT leak into SSG
    assert.ok(!html.includes('forgeflowkit:favorites:v1'), `${lang}/favorites: LS key leaked into SSG`);
    assert.ok(!html.includes('data-favorite-toggle'), `${lang}/favorites: no per-tool toggle should be present (page is the favorites list itself)`);
    // Must contain hydration hook — data-favorites-grid is an empty placeholder populated by JS at runtime, NOT user data
    assert.ok(html.includes('data-favorites-container'), `${lang}/favorites: missing data-favorites-container hook`);
    assert.ok(html.includes('data-favorites-grid'), `${lang}/favorites: missing data-favorites-grid placeholder`);
  }
});

test('P2a — privacy policy discloses browser storage', { skip: !existsSync(distDir) }, () => {
  for (const lang of ['en', 'zh']) {
    const path = resolve(distDir, lang, 'privacy-policy', 'index.html');
    assert.ok(existsSync(path), `dist missing: ${path}`);
    const html = readFileSync(path, 'utf-8');
    const headingRe = lang === 'zh' ? /浏览器存储/ : /Browser Storage/;
    assert.ok(headingRe.test(html), `${lang}/privacy-policy: missing Browser Storage heading`);
    assert.ok(html.includes('localStorage'), `${lang}/privacy-policy: missing localStorage mention`);
  }
});

test('P2a — every ToolCard on listing pages has data-favorite-toggle with correct slug', { skip: !existsSync(distDir) }, () => {
  // ToolCard (with data-favorite-toggle) renders on listing pages: 6 category pages + 2 landing pages.
  // Individual tool detail pages use RelatedTools (pills without toggle), so they are excluded.
  const listingPages = ['saas-metrics', 'freelance-pricing', 'cost-efficiency', 'investment-roi', 'valuation-exit', 'ai-cost-tools'];
  for (const lang of ['en', 'zh']) {
    for (const slug of listingPages) {
      const path = resolve(distDir, lang, slug, 'index.html');
      assert.ok(existsSync(path), `dist missing: ${path}`);
      const html = readFileSync(path, 'utf-8');
      assert.ok(html.includes('data-favorite-toggle'), `${lang}/${slug}: missing data-favorite-toggle on listing page`);
      assert.ok(html.includes('data-favorite-slug='), `${lang}/${slug}: missing data-favorite-slug attribute`);
    }
  }
  // Every tool slug must appear as data-favorite-slug on at least one listing page (i.e. every tool has a favorite toggle rendered somewhere in the site)
  for (const tool of tools) {
    let found = false;
    for (const lang of ['en', 'zh']) {
      for (const slug of listingPages) {
        const path = resolve(distDir, lang, slug, 'index.html');
        if (existsSync(path) && readFileSync(path, 'utf-8').includes(`data-favorite-slug="${tool.slug}"`)) {
          found = true;
          break;
        }
      }
      if (found) break;
    }
    assert.ok(found, `${tool.slug}: no listing page renders its data-favorite-slug`);
  }
});
