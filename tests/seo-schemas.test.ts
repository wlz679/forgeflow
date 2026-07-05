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

// =============================================================================
// P2b — Recent Viewed fixtures (Task 6, branch master, 2026-06-30)
// =============================================================================

test('P2b — recent page schema is WebPage without user data', { skip: !existsSync(distDir) }, () => {
  for (const lang of ['en', 'zh']) {
    const path = resolve(distDir, lang, 'recent', 'index.html');
    assert.ok(existsSync(path), `dist missing: ${path}`);
    const html = readFileSync(path, 'utf-8');
    const blocks = extractJsonLd(html);
    const graph = blocks.flatMap(b => b['@graph'] ?? [b]);
    const wp = graph.find(b => b['@type'] === 'WebPage');
    assert.ok(wp, `${lang}/recent: no WebPage schema`);
    assert.match(wp.name, /Recently Viewed|最近浏览/);
    // User data must NOT leak into SSG — the LS key name must not appear anywhere on disk
    assert.ok(!html.includes('forgeflowkit:recent:v1'), `${lang}/recent: LS key leaked into SSG`);
    // Hydration hook must be present so the client-side init layer can populate at runtime
    assert.ok(html.includes('data-recent-container'), `${lang}/recent: missing data-recent-container hook`);
  }
});

test('P2b — recent header dropdown + tool detail page inline container coexist on every tool page', { skip: !existsSync(distDir) }, () => {
  // Pick one tool page (MRR is a representative tool detail page) and verify:
  // (1) the page body has an inline-mode recent container (RecentViewed.astro rendered into [slug].astro)
  // (2) the header has a preview-mode recent container (Header.astro dropdown)
  const path = resolve(distDir, 'en', 'solopreneur-mrr-calculator', 'index.html');
  assert.ok(existsSync(path), `dist missing: ${path}`);
  const html = readFileSync(path, 'utf-8');
  assert.ok(html.includes('data-recent-container'), 'tool page: data-recent-container hook present');
  assert.ok(/data-recent-container[^>]*data-mode="inline"/.test(html), 'tool page: inline-mode recent container present');
  assert.ok(/data-recent-container[^>]*data-mode="preview"/.test(html), 'tool page: header preview-mode recent container present');
});

test('P2b — privacy policy mentions Recently Viewed', { skip: !existsSync(distDir) }, () => {
  for (const lang of ['en', 'zh']) {
    const path = resolve(distDir, lang, 'privacy-policy', 'index.html');
    assert.ok(existsSync(path), `dist missing: ${path}`);
    const html = readFileSync(path, 'utf-8');
    if (lang === 'en') {
      assert.ok(html.includes('Recently Viewed'), 'en privacy: "Recently Viewed" heading present');
    } else {
      assert.ok(html.includes('最近访问'), 'zh privacy: "最近访问" heading present');
    }
  }
});

test('P2b — every tool detail page mounts RecentViewed inline container', { skip: !existsSync(distDir) }, () => {
  // Sample 3 representative tool slugs from the 32-tool registry. These are also the
  // most-linked MRR/LTV/CAC trio — if any of them drifts, the homepage internal-links
  // surface will look broken. Inline container is required on every tool detail page
  // so a returning user lands on a page that already shows their recent activity.
  const slugs = ['solopreneur-mrr-calculator', 'solopreneur-ltv-calculator', 'solopreneur-cac-calculator'];
  for (const lang of ['en', 'zh']) {
    for (const slug of slugs) {
      const path = resolve(distDir, lang, slug, 'index.html');
      assert.ok(existsSync(path), `dist missing: ${path}`);
      const html = readFileSync(path, 'utf-8');
      assert.ok(html.includes('data-recent-container'), `${lang}/${slug}: recent container missing`);
      assert.ok(/data-recent-container[^>]*data-mode="inline"/.test(html), `${lang}/${slug}: inline mode missing`);
    }
  }
});

test('P2b — no /recent/ page contains raw user data', { skip: !existsSync(distDir) }, () => {
  // Belt-and-braces: even if a tool slug sneaks into SSG via partial render or a future
  // build pipeline change, the LS key name must NEVER appear on disk. The /recent/ page
  // shell is statically generated; the actual list is rendered at runtime from LS.
  for (const lang of ['en', 'zh']) {
    const path = resolve(distDir, lang, 'recent', 'index.html');
    assert.ok(existsSync(path), `dist missing: ${path}`);
    const html = readFileSync(path, 'utf-8');
    assert.ok(!html.includes('forgeflowkit:recent:v1'), `${lang}/recent: LS key leaked into SSG`);
  }
});

test('P2a — every ToolCard on listing pages has data-favorite-toggle with correct slug', { skip: !existsSync(distDir) }, () => {
  // ToolCard (with data-favorite-toggle) renders on listing pages: 6 category pages + 2 landing pages.
  // Individual tool detail pages use RelatedTools (pills without toggle), so they are excluded.
  const listingPages = ['saas-metrics', 'freelance-pricing', 'cost-efficiency', 'investment-roi', 'valuation-exit', 'ai-cost-tools', 'marketing-analytics'];
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

// =============================================================================
// P2c — History Snapshots fixtures (Task 6, branch master, 2026-07-01)
// =============================================================================

test('P2c — history page schema is WebPage without user data', { skip: !existsSync(distDir) }, () => {
  for (const lang of ['en', 'zh']) {
    const path = resolve(distDir, lang, 'history', 'index.html');
    assert.ok(existsSync(path), `dist missing: ${path}`);
    const html = readFileSync(path, 'utf-8');
    const blocks = extractJsonLd(html);
    const graph = blocks.flatMap(b => b['@graph'] ?? [b]);
    const wp = graph.find(b => b['@type'] === 'WebPage');
    assert.ok(wp, `${lang}/history: no WebPage schema`);
    assert.match(wp.name, /History|历史快照/);
    // User data must NOT leak into SSG — the LS key name must not appear anywhere on disk
    assert.ok(!html.includes('forgeflowkit:history:v1'), `${lang}/history: LS key leaked into SSG`);
    // Hydration hook must be present so the client-side init layer can populate at runtime
    assert.ok(html.includes('data-history-container'), `${lang}/history: missing data-history-container hook`);
  }
});

test('P2c — history page has data-history-clear-all button', { skip: !existsSync(distDir) }, () => {
  for (const lang of ['en', 'zh']) {
    const path = resolve(distDir, lang, 'history', 'index.html');
    assert.ok(existsSync(path), `dist missing: ${path}`);
    const html = readFileSync(path, 'utf-8');
    assert.ok(html.includes('data-history-clear-all'), `${lang}/history: clear-all button present`);
  }
});

test('P2c — privacy policy mentions History Snapshots', { skip: !existsSync(distDir) }, () => {
  for (const lang of ['en', 'zh']) {
    const path = resolve(distDir, lang, 'privacy-policy', 'index.html');
    assert.ok(existsSync(path), `dist missing: ${path}`);
    const html = readFileSync(path, 'utf-8');
    if (lang === 'en') {
      assert.ok(html.includes('History Snapshots'), 'en privacy: "History Snapshots" heading present');
    } else {
      assert.ok(html.includes('历史快照'), 'zh privacy: "历史快照" heading present');
    }
  }
});

test('P2c — every tool detail page has [data-history-save] button', { skip: !existsSync(distDir) }, () => {
  // Sample 3 representative tool slugs from the 32-tool registry (MRR/LTV/CAC trio).
  // The [💾 保存] button is wired in ResultCard.astro and is the user-facing entry point
  // to save a calculation snapshot — if it's missing, save flow is broken on that page.
  const slugs = ['solopreneur-mrr-calculator', 'solopreneur-ltv-calculator', 'solopreneur-cac-calculator'];
  for (const lang of ['en', 'zh']) {
    for (const slug of slugs) {
      const path = resolve(distDir, lang, slug, 'index.html');
      assert.ok(existsSync(path), `dist missing: ${path}`);
      const html = readFileSync(path, 'utf-8');
      assert.ok(html.includes('data-history-save'), `${lang}/${slug}: [data-history-save] button missing`);
    }
  }
});

test('P2c — every page has [data-history-container] preview dropdown', { skip: !existsSync(distDir) }, () => {
  // The header is shared across every page (BaseLayout wraps all routes), so the history
  // preview-mode container must appear on the landing page, listing pages, tool pages,
  // favorites, recent, history, and about. If any of these pages miss the hook, the
  // header dropdown cannot render that page's history state.
  const slugs = ['', 'solopreneur-mrr-calculator', 'about', 'favorites', 'recent', 'history'];
  for (const lang of ['en']) {
    for (const slug of slugs) {
      const path = resolve(distDir, slug ? `${lang}/${slug}/index.html` : `${lang}/index.html`);
      assert.ok(existsSync(path), `dist missing: ${path}`);
      const html = readFileSync(path, 'utf-8');
      assert.ok(html.includes('data-history-container'), `${path}: [data-history-container] preview missing`);
    }
  }
});

// =============================================================================
// P3-1 — Account Authentication (Clerk) privacy disclosure (Task 5, 2026-07-01)
// =============================================================================

test('P3-1 — privacy policy discloses Account Authentication (Clerk)', { skip: !existsSync(distDir) }, () => {
  // P3-1 wires Clerk into Header + BaseLayout (Task 4). The privacy page must disclose
  // that authentication data (email, IP, browser fingerprint) is collected by Clerk
  // on their servers — we don't store any of it. The Clerk privacy policy URL must
  // be linked so users can audit the third-party processor.
  for (const lang of ['en', 'zh']) {
    const path = resolve(distDir, lang, 'privacy-policy', 'index.html');
    assert.ok(existsSync(path), `dist missing: ${path}`);
    const html = readFileSync(path, 'utf-8');
    if (lang === 'en') {
      assert.ok(html.includes('Account Authentication (Clerk)'), 'en privacy: "Account Authentication (Clerk)" heading present');
      assert.ok(html.includes('We use'), 'en privacy: "We use" intro present');
      assert.ok(html.includes('https://clerk.com/privacy'), 'en privacy: Clerk privacy policy URL present');
      assert.ok(html.includes('not store any of this data'), 'en privacy: "not store any of this data" disclaimer present');
    } else {
      assert.ok(html.includes('账户认证'), 'zh privacy: "账户认证" heading present');
      assert.ok(html.includes('我们使用'), 'zh privacy: "我们使用" intro present');
      assert.ok(html.includes('https://clerk.com/privacy'), 'zh privacy: Clerk privacy policy URL present');
      assert.ok(html.includes('我们不存储任何这些数据'), 'zh privacy: "我们不存储任何这些数据" disclaimer present');
    }
  }
});

// =============================================================================
// P3-2 — Data Sync (Supabase) privacy disclosure (Task 7, 2026-07-02)
// =============================================================================

test('P3-2 — privacy policy discloses Data Sync (Supabase)', { skip: !existsSync(distDir) }, () => {
  // P3-2 wires cross-device sync (favorites / recent / history) via Supabase,
  // keyed by Clerk user ID. The privacy page must disclose that synced data
  // is sent to Supabase, that export/delete is available from the account
  // menu, and that the data size is bounded (~23KB across 3 collections).
  // The existing favorites / recently-viewed / history sections must be
  // updated to reflect the new "sync across signed-in devices" wording.
  for (const lang of ['en', 'zh']) {
    const path = resolve(distDir, lang, 'privacy-policy', 'index.html');
    assert.ok(existsSync(path), `dist missing: ${path}`);
    const html = readFileSync(path, 'utf-8');
    if (lang === 'en') {
      assert.ok(html.includes('Data Sync (Supabase)'), 'en privacy: "Data Sync (Supabase)" heading present');
      assert.ok(html.includes('synced across your signed-in devices'), 'en privacy: "synced across your signed-in devices" wording present');
      assert.ok(html.includes('https://supabase.com'), 'en privacy: Supabase link present');
      assert.ok(html.includes('export all synced data as JSON'), 'en privacy: export-as-JSON disclaimer present');
      assert.ok(html.includes('~23KB total'), 'en privacy: data size bound present');
      // Updated existing sections must no longer claim "never synced" / "no cross-device sync"
      assert.ok(!html.includes('never synced across devices'), 'en privacy: stale "never synced" wording still present');
      assert.ok(!html.includes('no cross-device sync'), 'en privacy: stale "no cross-device sync" wording still present');
    } else {
      assert.ok(html.includes('数据同步（Supabase）'), 'zh privacy: "数据同步（Supabase）" heading present');
      assert.ok(html.includes('在你登录的设备之间同步'), 'zh privacy: "在你登录的设备之间同步" wording present');
      assert.ok(html.includes('https://supabase.com'), 'zh privacy: Supabase link present');
      assert.ok(html.includes('导出所有同步数据为 JSON'), 'zh privacy: export-as-JSON disclaimer present');
      assert.ok(html.includes('约 23KB'), 'zh privacy: data size bound present');
      // Updated existing sections must no longer claim "不跨设备同步"
      assert.ok(!html.includes('不跨设备同步'), 'zh privacy: stale "不跨设备同步" wording still present');
    }
  }
});
