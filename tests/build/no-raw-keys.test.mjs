#!/usr/bin/env node
// tests/build/no-raw-keys.test.mjs
//
// Guards the BUILT site: no raw i18n key may reach a rendered page.
//
// WHY THIS GUARD EXISTS
// ---------------------
// translate() falls back to `locales[lang]?.[key] ?? locales.en?.[key] ?? key`
// — a MISSING key does not crash, it silently prints the key name. That is
// exactly what happened in production: the P150 migration (c16322b) moved
// translations.ts to per-locale JSON and dropped nine engine_cost.* keys on
// the way. The Chinese AI-cost pages then served
//
//     engine_cost.comparison_title (100engine_cost.reqs_per_day)
//
// live on forgeflowkit.com. The keys had NO trailing number, so the original
// pattern this suite carried (/tools\.[a-z0-9-]+\.[a-z_.]+\.\d+/g) would not
// have matched them, and it was additionally scoped to the `tools.` namespace
// only — while the site renders engine_cost.*, enterprise.*, topic.*, eeat.*
// and 30+ other namespaces.
//
// WHAT IT CHECKS
// --------------
// Every HTML file under dist/ is scanned for a dotted token that looks like
// one of this project's i18n keys, in the two places a key can leak into a
// user-visible surface:
//
//   1. TEXT NODES — the key was printed instead of its translation.
//   2. CONTENT ATTRIBUTES — placeholder / title / alt / aria-label / …
//
// Three exclusions, each with a reason:
//   - <script> and <style> blocks are skipped: the client bundles ship the
//     i18n dictionary itself (window.__i18n_recent__ = {"recent.title": …}),
//     where the raw key is the OBJECT KEY, by design.
//   - data-i18n="…" is skipped: it is the deliberate client-side translation
//     hook. The element's text is already translated server-side.
//   - Tokens that are domain names (….com, ….org) are skipped: research
//     citations in prose look like "business.facebook.com".
//
// A token is flagged when it is EXACTLY a key of the locale dictionaries, or
// when its first segment is a known i18n namespace (derived from the locale
// files AND from the t()/translate() call sites in src/ — the latter matters
// because a namespace missing from the dictionary is exactly the case a
// dictionary-only scan would miss).
//
// RELATIONSHIP TO THE EXISTING GUARDS (no duplication)
// ----------------------------------------------------
//   - tests/i18n-key-existence-guard.test.ts — SOURCE-only: every t('…')
//     call site resolves in en.json AND zh.json. Different concern (key
//     existence), and it cannot see a key that was never referenced at all.
//   - tests/engine-input-placeholder-i18n-guard.test.ts — checks the
//     placeholder attribute of tool pages only, and only the `tools.`
//     namespace. This suite is the general case (any namespace, any content
//     attribute, and the rendered text).
//
// Build dependency: YES — it reads dist/. It follows the repo's established
// pattern (P23b / P153 §7.8): skip unless RUN_BUILD_TESTS=1, and build
// dist/ itself when it is missing, so the suite never depends on whichever
// earlier suite happened to leave a dist/ behind.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..', '..');

// P23b skip-guard: only run when explicitly opted-in.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function ensureBuilt() {
  const probe = resolve(root, 'dist', 'en', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[no-raw-keys] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

// ---------------------------------------------------------------------------
// What counts as an i18n key
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set(['node_modules', '.git', '.astro']);

/** Every key of both locale dictionaries. */
const knownKeys = new Set();
for (const locale of ['en', 'zh']) {
  const json = JSON.parse(readFileSync(resolve(root, `src/i18n/locales/${locale}.json`), 'utf8'));
  for (const key of Object.keys(json)) knownKeys.add(key);
}

/** First segments of every dictionary key — the i18n namespaces. */
const namespaces = new Set();
for (const key of knownKeys) namespaces.add(key.split('.')[0]);

// Namespaces the CODE asks for, even if the dictionary no longer has them.
// This is the safety net for the P150 failure: engine_cost.* was dropped
// from both locale files, so a dictionary-only namespace list would have
// missed the leak entirely. Comments are NOT stripped on purpose — the
// block-comment stripper eats 20 KB+ of src/pages/[lang]/[slug].astro, and a
// stale namespace name costs nothing (it only widens the candidate set).
for (const file of walkSources(resolve(root, 'src'))) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/\b(?:t|translate)\(\s*(['"])([A-Za-z0-9_.-]+)\1/g)) {
    const ns = m[2].split('.')[0];
    // 3+ chars only: a 2-char "namespace" is prose, not a key prefix
    // (e.g. the 'e' of 'e.g').
    if (ns.length >= 3) namespaces.add(ns);
  }
  for (const m of src.matchAll(/\b(?:t|translate)\(\s*`([A-Za-z_][A-Za-z0-9_]*)\.\$\{/g)) {
    if (m[1].length >= 3) namespaces.add(m[1]);
  }
}

/**
 * Domain-name endings. A token ending in one of these is a citation URL
 * ("business.facebook.com"), not an i18n key — UNLESS it is literally a
 * dictionary key, which rule 1 below catches first.
 */
const PUBLIC_SUFFIXES = new Set([
  'com', 'org', 'net', 'io', 'ai', 'co', 'dev', 'app', 'info', 'me', 'biz', 'us', 'uk',
  'cn', 'jp', 'de', 'fr', 'ca', 'au', 'edu', 'gov', 'xyz', 'tech', 'site', 'online',
  'page', 'html', 'htm', 'php', 'aspx', 'jsp', 'md', 'txt', 'xml', 'json', 'png',
  'jpg', 'jpeg', 'svg', 'css', 'js', 'woff', 'woff2', 'ttf', 'it', 'tv', 'cc', 'sh',
]);

/** A dotted token: `tools.foo.title`, `engine_cost.comparison_title`. */
const DOTTED_TOKEN = /[A-Za-z_][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)+/g;

/** Attributes whose value is shown to a user or a crawler. */
const CONTENT_ATTRIBUTES = new Set([
  'placeholder', 'title', 'alt', 'aria-label', 'aria-placeholder', 'aria-valuetext',
  'value', 'content', 'label',
]);

function walkSources(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkSources(full, out);
    else if (/\.(astro|ts|tsx|js|jsx|mjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function walkHtml(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function isOffender(token) {
  // Rule 1 — the token IS a dictionary key, so it can only have leaked.
  if (knownKeys.has(token)) return true;
  // Rule 2 — it looks like one of our keys: known namespace, not a domain.
  const segments = token.split('.');
  if (!namespaces.has(segments[0])) return false;
  if (PUBLIC_SUFFIXES.has(segments[segments.length - 1].toLowerCase())) return false;
  return true;
}

/** Scan one HTML document. Returns [{ token, where }]. */
function scanHtml(html) {
  const hits = [];
  const markup = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  // 1. text nodes
  const text = markup.replace(/<[^>]*>/g, ' ');
  for (const m of text.matchAll(DOTTED_TOKEN)) {
    if (isOffender(m[0])) hits.push({ token: m[0], where: 'text' });
  }

  // 2. content attributes (data-i18n is not one of them — see the header)
  for (const m of markup.matchAll(/([A-Za-z_][A-Za-z0-9_:-]*)\s*=\s*"([^"]*)"/g)) {
    const [, name, value] = m;
    if (!CONTENT_ATTRIBUTES.has(name.toLowerCase())) continue;
    for (const t of value.matchAll(DOTTED_TOKEN)) {
      if (isOffender(t[0])) hits.push({ token: t[0], where: `@${name}` });
    }
  }
  return hits;
}

// ---------------------------------------------------------------------------
// The suite
// ---------------------------------------------------------------------------

test('the detector itself works (a synthetic leak is caught)', () => {
  // Non-vacuity: proves the scanner fires even if dist/ is empty or stale.
  const html = '<html><body><p>engine_cost.comparison_title</p>'
    + '<img alt="tools.solopreneur-mrr-calculator.how_to_use.5"></body></html>';
  const hits = scanHtml(html);
  const tokens = hits.map((h) => h.token);
  assert.ok(
    tokens.includes('engine_cost.comparison_title'),
    `the scan missed a raw key in a text node: ${JSON.stringify(hits)}`,
  );
  assert.ok(
    tokens.includes('tools.solopreneur-mrr-calculator.how_to_use.5'),
    `the scan missed a raw key in an attribute: ${JSON.stringify(hits)}`,
  );
});

test('legitimate markup is not flagged', () => {
  // data-i18n is the client-side translation hook; the element text is
  // already translated. A citation URL in prose is not a key.
  const html = '<html><body>'
    + '<span data-i18n="enterprise.toolbar.save">Save scenario</span>'
    + '<p>ROAS at gross level only (business.facebook.com, Q4 2024).</p>'
    + '<p>See e.g. the SaaS metrics guide.</p>'
    + '</body></html>';
  const hits = scanHtml(html);
  assert.deepEqual(hits, [], `false positives: ${JSON.stringify(hits)}`);
});

test('no raw i18n key in any built page', () => {
  ensureBuilt();
  const distDir = resolve(root, 'dist');
  const htmlFiles = walkHtml(distDir);
  // Non-vacuity: a half-finished build would leave this empty and the scan
  // below would pass without checking anything.
  assert.ok(
    htmlFiles.length >= 50,
    `dist/ has only ${htmlFiles.length} HTML files — the build is probably incomplete`,
  );

  const offenders = [];
  for (const file of htmlFiles) {
    const hits = scanHtml(readFileSync(file, 'utf8'));
    if (hits.length === 0) continue;
    const rel = file.slice(distDir.length + 1).replace(/\\/g, '/');
    for (const hit of new Set(hits.map((h) => `${h.where}:${h.token}`))) {
      offenders.push(`${rel}  ${hit}`);
    }
  }

  assert.equal(
    offenders.length,
    0,
    `Raw i18n keys in the built site (${offenders.length}):\n` +
      offenders.slice(0, 25).map((o) => `  - ${o}`).join('\n') +
      (offenders.length > 25 ? `\n  ... and ${offenders.length - 25} more` : '') +
      `\n\nA raw key means translate() fell back to the key name — the key is ` +
      `missing from src/i18n/locales/{en,zh}.json (or the page renders the key ` +
      `instead of its translation). See the P150 engine_cost.* incident.`,
  );
});
