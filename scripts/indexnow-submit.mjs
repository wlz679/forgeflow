#!/usr/bin/env node
// scripts/indexnow-submit.mjs
// P148-E-S11: IndexNow bulk URL submission (Bing Multiplier — unlocks 6 AI
// surfaces: Copilot, ChatGPT Search, DuckDuckGo, Yahoo, Ecosia, Windows 11).
//
// IndexNow is a Microsoft-co-created protocol that pushes new/updated URLs
// instantly to participating search engines. Submission makes URLs appear
// in Copilot citations 4-7× faster than traditional crawl.
//
// References:
//   https://www.indexnow.org/
//   https://learn.microsoft.com/bingmasters/index-now
//
// Run via `postbuild` after `astro build` regenerates dist/sitemap-0.xml.
// Pre-condition: dist/sitemap-index.xml must exist (Astro sitemap integration
// auto-generates during `pnpm build`).
//
// How it works:
//   1. Read dist/sitemap-index.xml → find referenced sitemap files
//   2. Read each sitemap → extract <loc> URLs
//   3. Filter URLs to only those on our SITE_HOST
//   4. POST to https://api.indexnow.org/indexnow with key + URL list
//   5. Print response status + payload
//
// IndexNow key:
//   - Static UUID, committed to repo (not a secret — it's an identifier only)
//   - The same key must appear at https://{SITE_HOST}/{key}.txt as a file
//     containing the key string. We commit public/{key}.txt for verification.
//   - To rotate, change KEY here, recreate public/{key}.txt, re-run.
//
// Notes:
//   - Batch size limit: 10,000 URLs per submission (we have ~639)
//   - 200 OK = accepted; 4xx = error (key missing, URL host mismatch)
//   - 429 = rate limited (rare; IndexNow has no hard rate limits)
//   - Status codes: https://learn.microsoft.com/bingmasters/index-now

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const KEY = '0f4e3a7b-9c5d-4e8a-b2f1-6a3c8d2e7f9b';
const SITE_HOST = 'forgeflowkit.com';
const SITE_URL = 'https://' + SITE_HOST;
const KEY_FILE_URL = `${SITE_URL}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const DIST = 'dist';

function readSitemapUrls() {
  const idxPath = join(DIST, 'sitemap-index.xml');
  if (!existsSync(idxPath)) {
    throw new Error(`${idxPath} not found — run \`pnpm build\` first`);
  }
  const idx = readFileSync(idxPath, 'utf8');
  // sitemap-index.xml references child sitemaps via <sitemap><loc>...</loc>
  const childSitemaps = [
    ...new Set([...idx.matchAll(/<sitemap>\s*<loc>([^<]+)<\/loc>/g)].map(m => m[1])),
  ];
  if (childSitemaps.length === 0) {
    // No child sitemaps — might be a single sitemap (sitemap.xml)
    return extractLocsFromSitemap(idx);
  }
  // Filter to local sitemaps (only those that match SITE_URL)
  const localSitemaps = childSitemaps.filter((u) => u.startsWith(SITE_URL));
  if (localSitemaps.length === 0) {
    throw new Error(
      `No local child sitemaps found in ${idxPath} (looked for ${SITE_URL} prefix)`
    );
  }
  const allUrls = new Set();
  for (const sitemapUrl of localSitemaps) {
    // sitemapUrl is e.g. https://forgeflowkit.com/sitemap-0.xml — strip host
    const localPath = join(DIST, sitemapUrl.replace(SITE_URL, ''));
    if (!existsSync(localPath)) {
      console.warn(`⚠ sitemap file missing: ${localPath}`);
      continue;
    }
    const xml = readFileSync(localPath, 'utf8');
    const urls = extractLocsFromSitemap(xml);
    for (const u of urls) {
      if (u.startsWith(SITE_URL)) allUrls.add(u);
    }
  }
  return [...allUrls];
}

function extractLocsFromSitemap(xml) {
  return [
    ...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])),
  ];
}

async function submit(urls) {
  const payload = {
    host: SITE_HOST,
    key: KEY,
    keyLocation: KEY_FILE_URL,
    urlList: urls,
  };
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  return { status: response.status, body: text };
}

async function main() {
  // --check mode: print URL count and exit without submitting
  if (process.argv.includes('--check')) {
    const urls = readSitemapUrls();
    console.log(`[indexnow:check] would submit ${urls.length} URL(s) to ${ENDPOINT}`);
    console.log(`[indexnow:check] key: ${KEY}`);
    console.log(`[indexnow:check] keyLocation: ${KEY_FILE_URL}`);
    return;
  }

  // Skip postbuild IndexNow when SKIP_INDEXNOW=1 (set by test runners that
  // spawn `pnpm build` internally — see tests/_supabase-build-helper.ts and
  // tests/_clerk-build-helper.ts). External network call should never fail
  // a build.
  if (process.env.SKIP_INDEXNOW === '1') {
    console.log('[indexnow] SKIP_INDEXNOW=1 — skipping submission');
    return;
  }

  const urls = readSitemapUrls();
  console.log(`[indexnow] submitting ${urls.length} URL(s) from ${DIST}/sitemap-*.xml`);
  if (urls.length === 0) {
    console.log('[indexnow] no URLs to submit — exiting');
    return;
  }

  try {
    const { status, body } = await submit(urls);
    // IndexNow returns plain text: "OK" or error message
    if (status === 200) {
      console.log(`[indexnow] ✓ accepted (200): ${body}`);
    } else if (status === 202) {
      console.log(`[indexnow] ✓ accepted (202 — keys will be validated): ${body}`);
    } else if (status === 403) {
      // 403 = SiteVerificationNotCompleted. Common during first 24-48h
      // after key file is published (IndexNow fetches /{key}.txt to verify
      // ownership, and DNS/CDN propagation takes time). Non-fatal.
      console.warn(`[indexnow] ⚠ HTTP 403 (key not yet verified by IndexNow — ` +
        `propagation can take 24-48h after key file publish): ${body}`);
    } else {
      console.warn(`[indexnow] ⚠ HTTP ${status} (non-fatal, build continues): ${body}`);
    }
  } catch (err) {
    // Network errors / DNS failures / etc. should NEVER fail the build.
    console.warn(`[indexnow] ⚠ submission failed (non-fatal, build continues): ${err.message}`);
  }
}

main().catch((err) => {
  // Top-level safety net: even on unexpected errors, never fail the build.
  console.warn(`[indexnow] ⚠ unexpected error (non-fatal): ${err.message}`);
});