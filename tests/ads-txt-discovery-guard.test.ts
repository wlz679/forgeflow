#!/usr/bin/env node
// P153-B: ads.txt presence + discovery guard.
//
// Why this exists
// ---------------
// The AdSense site list shows "Ads.txt status: Not found" for
// forgeflowkit.com even though the file is present and correct — measured
// 2026-10-26:
//
//   GET https://forgeflowkit.com/ads.txt  -> 200, text/plain, 59 bytes
//   GET https://www.forgeflowkit.com/ads.txt -> 200
//   body: google.com, pub-3420554170441272, DIRECT, f08c47fec0942fa0
//
// The dashboard row's own "last updated" column reads 2026-10-19 09:40 CST
// — the exact moment the site was submitted for review — so that column is
// a SNAPSHOT from submission time, not a live check. Google's documented
// remedy for "we cannot find your ads.txt" is the IAB discovery link, a
// `rel="advertising"` tag in the head pointing at the file. That tag was
// missing.
//
// What this guard protects (source-only — no build needed, so it runs in
// every `pnpm check`):
//
//   1. public/ads.txt exists, is non-empty, and is a syntactically valid
//      ads.txt line (domain, publisher id, either DIRECT or a cert id).
//   2. The publisher id in ads.txt is the SAME id the AdSense script tag
//      uses (`client=ca-pub-...`). If these two ever drift, ads.txt
//      authorises a different account than the one serving the site —
//      which silently breaks authorised-seller verification.
//   3. ads.txt is TRACKED by git. A gitignored ads.txt would exist on the
//      developer's machine and 404 in production — the exact class of
//      failure the brand-card work hit (public/og/ is gitignored, so 200
//      per-tool social cards 404ed in production while local builds were
//      fine).
//   4. The `rel="advertising"` discovery tag is present in the layout
//      head (and in the root language-redirect stub).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');

const ADS_TXT = resolve(root, 'public', 'ads.txt');
const LAYOUT = resolve(root, 'src', 'layouts', 'BaseLayout.astro');
const ROOT_INDEX = resolve(root, 'src', 'pages', 'index.astro');

function readOrFail(p: string): string {
  assert.ok(existsSync(p), `${relative(root, p)} does not exist`);
  return readFileSync(p, 'utf8');
}

/**
 * The AdSense script's publisher id.
 *
 * The script is loaded as
 *   <script async src=".../adsbygoogle.js?client=ca-pub-XXXX" ...>
 * — the id is a URL query parameter, NOT a `client="..."` attribute. (The
 * first draft of this helper looked for the attribute form and reported
 * "no AdSense script found" on a layout that has had the script since
 * 2026-06-26 — a reminder that a guard must match the real shape.)
 */
function adsensePublisherId(src: string): string | null {
  const all = [...src.matchAll(/ca-pub-(\d+)/g)].map((m) => m[1]);
  if (all.length === 0) return null;
  assert.equal(
    all.length,
    1,
    `expected exactly one ca-pub-<id> in BaseLayout.astro, found ${all.length}: ${all.join(', ')}`,
  );
  return all[0];
}

test('ads.txt exists and is a valid ads.txt record', () => {
  const body = readOrFail(ADS_TXT).trim();
  assert.ok(body.length > 0, 'public/ads.txt is empty');

  const lines = body.split(/\r?\n/).filter((l) => l.trim() !== '');
  assert.equal(lines.length, 1, `ads.txt should hold exactly one record, got ${lines.length}`);

  // ads.txt record shape: <domain>, <publisher id>, DIRECT|RESELLER [, <cert id>]
  const parts = lines[0].split(',').map((p) => p.trim());
  assert.ok(parts.length >= 3, `ads.txt record needs at least 3 fields, got: ${lines[0]}`);
  assert.equal(parts[0], 'google.com', `ads.txt domain must be google.com, got: ${parts[0]}`);
  assert.ok(
    /^pub-\d+$/.test(parts[1]),
    `ads.txt publisher id must look like pub-<digits>, got: ${parts[1]}`,
  );
  assert.ok(
    parts[2] === 'DIRECT' || parts[2] === 'RESELLER',
    `ads.txt third field must be DIRECT or RESELLER, got: ${parts[2]}`,
  );
});

test('ads.txt publisher id matches the AdSense script in the layout', () => {
  const layout = readOrFail(LAYOUT);
  const scriptId = adsensePublisherId(layout);
  assert.ok(scriptId, 'no AdSense script (client="ca-pub-...") found in BaseLayout.astro');

  const adsId = readOrFail(ADS_TXT).trim().split(',')[1].trim();
  assert.equal(
    adsId,
    `pub-${scriptId}`,
    `ads.txt authorises ${adsId} but the page loads AdSense for ca-pub-${scriptId}. ` +
      `If these drift, authorised-seller verification silently checks the wrong account.`,
  );
});

test('ads.txt is tracked by git (not a local-only file)', () => {
  const r = spawnSync('git', ['ls-files', '--error-unmatch', 'public/ads.txt'], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  assert.equal(
    r.status,
    0,
    'public/ads.txt is not tracked by git. A gitignored ads.txt exists on the developer ' +
      'machine and 404s in production — the same failure shape as the 200 per-tool ' +
      'social cards in public/og/ (P153 §7.15).',
  );
});

test('the head carries the ads.txt discovery link', () => {
  const layout = readOrFail(LAYOUT);
  assert.ok(
    /<link\s+rel=["']advertising["']\s+href=["']\/ads\.txt["']\s*\/?>/.test(layout),
    'BaseLayout.astro must emit <link rel="advertising" href="/ads.txt" /> — this is ' +
      'how Google is told where the file is, and its absence is why AdSense reported ' +
      '"Ads.txt status: Not found" for a site that serves the file correctly.',
  );

  // The root path is a language-redirect stub with its own <head>, so it
  // needs the tag too — it is the most-crawled entry point.
  const rootIndex = readOrFail(ROOT_INDEX);
  assert.ok(
    /<link\s+rel=["']advertising["']\s+href=["']\/ads\.txt["']\s*\/?>/.test(rootIndex),
    'src/pages/index.astro (the root language-redirect stub) must carry the same tag.',
  );
});
