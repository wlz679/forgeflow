// P149: regression test for Last-Modified header + sitemap <lastmod> injection.
// Catches both removal of meta tag AND removal of sitemap serialize lastmod field.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const root = resolve(import.meta.dirname, "..");

test("dist/ HTML files have Last-Modified meta tag", () => {
  const distDir = resolve(root, "dist");
  if (!existsSync(distDir)) {
    assert.fail("dist/ missing — run pnpm build first");
    return;
  }
  // Spot-check 5 strategic pages
  const samples = [
    "dist/en/about/index.html",
    "dist/en/solopreneur-mrr-calculator/index.html",
    "dist/zh/solopreneur-mrr-calculator/index.html",
    "dist/en/blog/best-solopreneur-mrr-calculator/index.html",
    "dist/zh/blog/best-solopreneur-mrr-calculator/index.html",
  ];
  for (const sample of samples) {
    const content = readFileSync(resolve(root, sample), "utf8");
    assert.match(content, /<meta\s+http-equiv=["']last-modified["']/i,
      `${sample} missing last-modified meta tag`);
  }
});

test("sitemap-0.xml has lastmod for every url", () => {
  const sitemapPath = resolve(root, "dist/sitemap-0.xml");
  if (!existsSync(sitemapPath)) {
    assert.fail("dist/sitemap-0.xml missing — run pnpm build first");
    return;
  }
  const content = readFileSync(sitemapPath, "utf8");
  const urlMatches = content.match(/<url>/g) || [];
  const lastmodMatches = content.match(/<lastmod>/g) || [];
  assert.equal(lastmodMatches.length, urlMatches.length,
    `Mismatch: ${urlMatches.length} <url> but ${lastmodMatches.length} <lastmod>`);
});

test("lastmod values are valid ISO timestamps within 7 days of now", () => {
  const sitemapPath = resolve(root, "dist/sitemap-0.xml");
  const content = readFileSync(sitemapPath, "utf8");
  const lastmods = [...content.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(m => m[1]);
  assert.ok(lastmods.length > 0, "no lastmod entries found");
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  for (const lm of lastmods.slice(0, 20)) {
    const ts = Date.parse(lm);
    assert.ok(!isNaN(ts), `invalid lastmod: ${lm}`);
    assert.ok(Math.abs(now - ts) < sevenDaysMs, `lastmod ${lm} not within 7 days of now`);
  }
});