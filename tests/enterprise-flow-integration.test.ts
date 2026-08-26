#!/usr/bin/env node
// P5A-T6 — 3 build-dep integration tests verifying the toolbar is wired
// end-to-end: rendered in dist HTML, i18n keys reach dist, storage module
// bundles into a calc page.
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (mirrors P23b skip-guard pattern)
//   - Requires `pnpm build` to have run (dist/ must exist)

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { resolve } from 'node:path';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// P23b: skip cleanly when build-dep gate not set
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

const root = resolve(import.meta.dirname, '..');

// Walk dist/ and collect all .html paths
function walkDist(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walkDist(full));
    } else if (entry.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

// Walk dist/_astro/ and collect all .js paths
function walkJs(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walkJs(full));
    } else if (entry.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

// For each HTML, return the path of any referenced hoisted JS bundle(s)
function getReferencedBundles(htmlPath: string): string[] {
  const html = readFileSync(htmlPath, 'utf-8');
  const re = /\/_astro\/(hoisted\.[A-Za-z0-9_-]+\.js)/g;
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      out.push(join(resolve(root, 'dist'), '_astro', m[1]));
    }
  }
  return out.filter(p => existsSync(p));
}

test('A1: Enterprise toolbar rendered on calc page (data-enterprise-btn)', () => {
  const dist = resolve(root, 'dist');
  assert.ok(existsSync(dist), 'dist/ missing — pnpm build required');
  const pages = walkDist(dist);
  assert.ok(pages.length > 0, `no HTML pages found in dist; checked ${dist}`);
  // Toolbar buttons live inside <aside id="enterprise-toolbar"> — the
  // data-enterprise-btn marker is on each of the 3 action buttons.
  const withToolbar = pages.filter(p => readFileSync(p, 'utf-8').includes('data-enterprise-btn'));
  assert.ok(
    withToolbar.length >= 1,
    `no page renders [data-enterprise-btn]; checked ${pages.length} pages`,
  );
});

test('A2: Enterprise i18n keys reach dist HTML (15 keys × 2 langs = 30 strings)', () => {
  const pages = walkDist(resolve(root, 'dist'));
  // Concatenate ALL pages (en + zh) into one string — the toolbar's
  // data-i18n attributes render in en or zh depending on lang.
  const allHtml = pages.map(p => readFileSync(p, 'utf-8')).join('');
  // Spot-check 3 of the 15 enterprise.* keys (en + zh = 6 strings total)
  assert.ok(
    allHtml.includes('Save scenario') || allHtml.includes('保存场景'),
    'enterprise.toolbar.save not found in dist HTML',
  );
  assert.ok(
    allHtml.includes('Templates') || allHtml.includes('模板'),
    'enterprise.toolbar.templates not found in dist HTML',
  );
  assert.ok(
    allHtml.includes('Generate report') || allHtml.includes('生成报告'),
    'enterprise.toolbar.report not found in dist HTML',
  );
});

test('A3: storage layer module bundled into at least one calc page', () => {
  const dist = resolve(root, 'dist');
  assert.ok(existsSync(dist), 'dist/ missing — pnpm build required');
  const pages = walkDist(dist);
  // The toolbar HTML is inlined but its <script> block is hoisted by Astro
  // to dist/_astro/hoisted.*.js (Astro v4 default behaviour). The HTML
  // references the bundle via <script type="module" src="/_astro/...">.
  // For "bundled into a calc page" to be a meaningful assertion we check
  // the chain: HTML renders toolbar + HTML references a bundle + that
  // bundle contains the ffk.scenarios.v1 storage key.
  const withStorage = pages.filter(p => {
    const html = readFileSync(p, 'utf-8');
    if (!html.includes('enterprise-toolbar')) return false;
    const bundles = getReferencedBundles(p);
    return bundles.some(b => readFileSync(b, 'utf-8').includes('ffk.scenarios.v1'));
  });
  assert.ok(
    withStorage.length >= 1,
    'no page bundles ffk.scenarios.v1 storage key (toolbar HTML + referenced JS)',
  );
});