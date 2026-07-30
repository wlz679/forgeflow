#!/usr/bin/env node
// P138 — CI guard for v3 Business rendering coverage (source-level invariants).
//
// Why this exists:
//   P138 T1+T2 wired 68 v3 engines into BIZ_CONFIG_MAP across 10 categories
//   (C/F/H/K/L/M/O/P/R/T). Both maps (Astro frontmatter + runtime JS) must
//   stay in sync — drift between them silently breaks page rendering (SSR
//   uses one, hydration uses the other).
//
// Three invariants asserted (source-level — no DOM check):
//   T1 — Dual-map equality: frontmatter BIZ_CONFIG_MAP === runtime JS
//        BIZ_CONFIG_MAP (same keys + same values).
//   T2 — Coverage: all 100 tool slugs from src/data/tools/*.ts must appear
//        as a key in BIZ_CONFIG_MAP (92 business calcs) OR in the AI-cost
//        switch (isOpenAI/isClaude/...) for 8 AI-cost engines.
//   T3 — v3 wiring: all slugs wired to 'BIZ_V3' must have the same value
//        in both maps (regression catch if a P138 T2 wire is reverted).
//
// DOM rendering verification (6-card layout) is deferred to a separate plan.
// `beautifySections()` runs at hydration, not SSR; the dist HTML contains
// un-beautified text blobs, not 6-card layouts. Building a headless-browser
// test (Playwright/Puppeteer) is out of scope for source-level CI guards.
//
// Build dependency: RUN_BUILD_TESTS=1 required (P23b skip-guard pattern).
// Note: this guard reads only source files (no dist/), but follows the
// build-dep gate so it runs alongside the other P96/P106 rendering-layer
// guards and surfaces in the same skip-mode summary.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

// Expected counts (P138 ship state, 2026-07-30):
//   - 100 tool slugs total (5 A + 8 B + 10 C + 6 D + 5 E + 10 F + 6 H +
//     6 K + 6 L + 8 M + 6 O + 6 P + 6 R + 6 S + 6 T)
//   - 92 business calcs in BIZ_CONFIG_MAP (24 non-V3 + 68 V3)
//   - 8 AI-cost engines routed via isOpenAI/isClaude/etc. switch
//   - 68 v3 slugs (P138 T1=6 + T2=62)
const EXPECTED_TOOL_COUNT = 100;
const EXPECTED_BIZ_MAP_SIZE = 92;
const EXPECTED_AI_COST_SIZE = 8;
const EXPECTED_V3_SIZE = 68;

// Parse the two BIZ_CONFIG_MAP definitions from [slug].astro.
// Frontmatter uses TS object literal (formatted across many lines);
// runtime uses minified JS (single line). Both share the same
// key/value shape: 'slug':'value' or 'slug': 'value'.
type MapShape = Map<string, string>;
interface ParsedMaps { frontmatter: MapShape; runtime: MapShape }

function parseBothMaps(): ParsedMaps {
  const src = readFileSync(resolve(root, 'src/pages/[lang]/[slug].astro'), 'utf8');

  // Extract the inner content between `{` and matching `}` starting from
  // a marker. Brace counting respects nested objects/arrays.
  function extractInner(marker: string, label: string): string {
    const markerIdx = src.indexOf(marker);
    if (markerIdx === -1) {
      throw new Error(`Marker not found: ${marker}`);
    }
    const openBrace = src.indexOf('{', markerIdx);
    if (openBrace === -1) {
      throw new Error(`Open brace not found after marker (${label}): ${marker}`);
    }
    let depth = 1;
    let i = openBrace + 1;
    while (i < src.length && depth > 0) {
      const c = src[i];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      i++;
    }
    if (depth !== 0) {
      throw new Error(`Unbalanced braces for ${label} BIZ_CONFIG_MAP`);
    }
    return src.slice(openBrace + 1, i - 1);
  }

  const fmInner = extractInner('const BIZ_CONFIG_MAP: Record<string, string> =', 'frontmatter');
  const rtInner = extractInner('var BIZ_CONFIG_MAP =', 'runtime');

  // Match 'slug':'value' pairs (handle both formatted and minified forms).
  // The 'slug' must start with 'solopreneur-' to avoid catching other strings.
  const entryRe = /['"](solopreneur-[a-z0-9-]+)['"]\s*:\s*['"]([^'"]+)['"]/g;

  function parseInner(inner: string, label: string): MapShape {
    const out = new Map<string, string>();
    for (const m of inner.matchAll(entryRe)) {
      const slug = m[1];
      const value = m[2];
      if (out.has(slug)) {
        throw new Error(`Duplicate slug in ${label} BIZ_CONFIG_MAP: ${slug}`);
      }
      out.set(slug, value);
    }
    if (out.size === 0) {
      throw new Error(`No entries parsed from ${label} BIZ_CONFIG_MAP`);
    }
    return out;
  }

  return {
    frontmatter: parseInner(fmInner, 'frontmatter'),
    runtime: parseInner(rtInner, 'runtime'),
  };
}

// Parse tool slugs from src/data/tools/*.ts (TS source). Slugs in
// `index.ts` are re-exports (no `slug:` literals); `types.ts` has
// `slug: string;` as a type annotation (no quotes, won't match).
// Both are excluded for safety.
function readToolSlugs(): Set<string> {
  const slugs = new Set<string>();
  const toolsDir = resolve(root, 'src/data/tools');
  for (const entry of readdirSync(toolsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.ts')) continue;
    if (entry.name === 'index.ts' || entry.name === 'types.ts') continue;
    const content = readFileSync(resolve(toolsDir, entry.name), 'utf8');
    for (const m of content.matchAll(/slug:\s*['"]([^'"]+)['"]/g)) {
      slugs.add(m[1]);
    }
  }
  return slugs;
}

// Parse AI-cost slugs from the calcConfig switch in [slug].astro.
// The 8 AI-cost engines use isOpenAI/isClaude/etc. boolean flags instead
// of BIZ_CONFIG_MAP entries. Frontmatter uses `slug === '...'`, runtime
// uses `toolSlug === '...'` — accept both.
function readAiCostSlugs(): Set<string> {
  const src = readFileSync(resolve(root, 'src/pages/[lang]/[slug].astro'), 'utf8');
  const keys = new Set<string>();
  const re = /(?:isOpenAI|isClaude|isDeepSeek|isGemini|isImage|isTraining|isGpu|isAiApiCostComparison)\s*=\s*(?:slug|toolSlug)\s*===\s*['"]([^'"]+)['"]/g;
  for (const m of src.matchAll(re)) {
    keys.add(m[1]);
  }
  return keys;
}

test('P138 T1: dual-map equality — BIZ_CONFIG_MAP frontmatter === runtime JS', () => {
  const { frontmatter, runtime } = parseBothMaps();
  const fmKeys = new Set(frontmatter.keys());
  const rtKeys = new Set(runtime.keys());

  const onlyInFrontmatter = [...fmKeys].filter(k => !rtKeys.has(k)).sort();
  const onlyInRuntime = [...rtKeys].filter(k => !fmKeys.has(k)).sort();

  const valueMismatches: Array<{ slug: string; fm: string; rt: string }> = [];
  for (const slug of fmKeys) {
    if (rtKeys.has(slug) && frontmatter.get(slug) !== runtime.get(slug)) {
      valueMismatches.push({
        slug,
        fm: frontmatter.get(slug)!,
        rt: runtime.get(slug)!,
      });
    }
  }

  const issues: string[] = [];
  if (onlyInFrontmatter.length > 0) {
    issues.push(`Keys only in frontmatter (${onlyInFrontmatter.length}): ${onlyInFrontmatter.join(', ')}`);
  }
  if (onlyInRuntime.length > 0) {
    issues.push(`Keys only in runtime (${onlyInRuntime.length}): ${onlyInRuntime.join(', ')}`);
  }
  if (valueMismatches.length > 0) {
    issues.push(`Value mismatches (${valueMismatches.length}): ${valueMismatches.map(v => `${v.slug}: fm='${v.fm}' rt='${v.rt}'`).join(', ')}`);
  }

  assert.equal(
    issues.length,
    0,
    `BIZ_CONFIG_MAP drift between frontmatter and runtime JS:\n` +
      `  ${issues.join('\n  ')}\n` +
      `Frontmatter: ${fmKeys.size} keys. Runtime: ${rtKeys.size} keys.`,
  );
});

test('P138 T2: coverage — every tool slug is wired into BIZ_CONFIG_MAP or AI-cost switch', () => {
  const { frontmatter, runtime } = parseBothMaps();
  const tools = readToolSlugs();
  const aiCost = readAiCostSlugs();

  // Coverage = BIZ_CONFIG_MAP (92) ∪ AI-cost switch (8) = 100.
  const allWired = new Set<string>([...frontmatter.keys(), ...aiCost]);

  const missingFromWiring: string[] = [];
  for (const slug of tools) {
    if (!allWired.has(slug)) missingFromWiring.push(slug);
  }
  const orphanBizKeys = [...frontmatter.keys()].filter(k => !tools.has(k)).sort();
  const orphanAiKeys = [...aiCost].filter(k => !tools.has(k)).sort();

  // Cross-check: frontmatter and runtime BIZ_CONFIG_MAP must be identical
  // (T1 invariant); if not, this coverage test inherits the drift.
  const fmKeys = new Set(frontmatter.keys());
  const rtKeys = new Set(runtime.keys());
  const onlyRt = [...rtKeys].filter(k => !fmKeys.has(k)).sort();

  // Structural sanity (P16 milestone locks these counts).
  assert.equal(
    tools.size,
    EXPECTED_TOOL_COUNT,
    `Expected ${EXPECTED_TOOL_COUNT} tool slugs from src/data/tools/*.ts, got ${tools.size}`,
  );
  assert.equal(
    frontmatter.size,
    EXPECTED_BIZ_MAP_SIZE,
    `Expected ${EXPECTED_BIZ_MAP_SIZE} entries in frontmatter BIZ_CONFIG_MAP, got ${frontmatter.size}`,
  );
  assert.equal(
    runtime.size,
    EXPECTED_BIZ_MAP_SIZE,
    `Expected ${EXPECTED_BIZ_MAP_SIZE} entries in runtime BIZ_CONFIG_MAP, got ${runtime.size}`,
  );
  assert.equal(
    aiCost.size,
    EXPECTED_AI_COST_SIZE,
    `Expected ${EXPECTED_AI_COST_SIZE} AI-cost switch entries, got ${aiCost.size}`,
  );

  const issues: string[] = [];
  if (missingFromWiring.length > 0) {
    issues.push(`Tools not wired anywhere (${missingFromWiring.length}): ${missingFromWiring.join(', ')}`);
  }
  if (orphanBizKeys.length > 0) {
    issues.push(`BIZ_CONFIG_MAP keys not in tools.ts (${orphanBizKeys.length}): ${orphanBizKeys.join(', ')}`);
  }
  if (orphanAiKeys.length > 0) {
    issues.push(`AI-cost switch keys not in tools.ts (${orphanAiKeys.length}): ${orphanAiKeys.join(', ')}`);
  }
  if (onlyRt.length > 0) {
    issues.push(`Runtime BIZ_CONFIG_MAP keys missing from frontmatter (${onlyRt.length}): ${onlyRt.join(', ')}`);
  }

  assert.equal(
    issues.length,
    0,
    `Coverage gaps in src/pages/[lang]/[slug].astro:\n  ${issues.join('\n  ')}`,
  );
});

test('P138 T3: v3 wiring — every BIZ_V3 slug has matching value in both maps', () => {
  const { frontmatter, runtime } = parseBothMaps();

  const fmV3 = new Set(
    [...frontmatter.entries()].filter(([_, v]) => v === 'BIZ_V3').map(([k]) => k),
  );
  const rtV3 = new Set(
    [...runtime.entries()].filter(([_, v]) => v === 'BIZ_V3').map(([k]) => k),
  );

  const onlyFmV3 = [...fmV3].filter(k => !rtV3.has(k)).sort();
  const onlyRtV3 = [...rtV3].filter(k => !fmV3.has(k)).sort();

  assert.equal(
    fmV3.size,
    EXPECTED_V3_SIZE,
    `Expected ${EXPECTED_V3_SIZE} BIZ_V3 entries in frontmatter, got ${fmV3.size}`,
  );
  assert.equal(
    rtV3.size,
    EXPECTED_V3_SIZE,
    `Expected ${EXPECTED_V3_SIZE} BIZ_V3 entries in runtime, got ${rtV3.size}`,
  );

  const issues: string[] = [];
  if (onlyFmV3.length > 0) {
    issues.push(`Slugs marked BIZ_V3 in frontmatter but not in runtime (${onlyFmV3.length}): ${onlyFmV3.join(', ')}`);
  }
  if (onlyRtV3.length > 0) {
    issues.push(`Slugs marked BIZ_V3 in runtime but not in frontmatter (${onlyRtV3.length}): ${onlyRtV3.join(', ')}`);
  }

  assert.equal(
    issues.length,
    0,
    `v3 wiring drift in [slug].astro BIZ_CONFIG_MAP:\n  ${issues.join('\n  ')}`,
  );
});