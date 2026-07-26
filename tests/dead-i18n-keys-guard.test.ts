#!/usr/bin/env node
// P103 — CI guard preventing future re-addition of dead i18n keys.
//
// Why this exists:
//   P99/P100 added 4 i18n keys ('ops_cost.section.savings_insights',
//   'ops_cost.section.usage_scenarios', 'misc.section.savings_insights',
//   'misc.section.usage_scenarios') that reference strings ('💰 Savings Insights',
//   '📊 Usage Scenarios (monthly costs)') that don't appear in any cost/ops/
//   valuation engine staticExamples. P102 deleted those dead keys. This guard
//   prevents future regressions by walking dist/zh pages and asserting the
//   forbidden strings never appear.
//
// Positive coverage (working keys DO translate):
//   - dist/zh/solopreneur-break-even-calculator/ has '📊 盈亏平衡分析'
//   - dist/zh/solopreneur-remote-vs-office-calculator/ has '🎯 盈亏平衡分析:'
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, 26th build-dep suite)

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'en', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p103] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

function getPages(lang: 'en' | 'zh'): string[] {
  const dir = resolve(root, 'dist', lang);
  const pages: string[] = [];
  // Use depth counter to prevent stack overflow from symlink cycles
  function walk(d: string, relBase: string, depth: number = 0): void {
    if (depth > 10) return; // safety: dist/ has at most ~5 levels
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = resolve(d, entry.name);
      const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(full, rel, depth + 1);
      else if (entry.name === 'index.html') pages.push(rel);
    }
  }
  walk(dir, '');
  return pages;
}

// Strip <script>, <style>, JSON-LD blocks — same pattern as zh-hardcoded-english-guard
// (P72 audit filter). Forbidden strings may legitimately appear inside customFn JS
// source code (e.g., `s.indexOf('Savings Insights')` for substring matching) but
// MUST NOT appear in user-visible HTML.
function stripNonBody(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+type="application\/ld\+json"[^>]*>[\s\S]*?<\/[^>]+>/gi, ' ');
}

// P102-deleted dead keys — forbidden ZH translations on zh pages (visible content).
// '💰 节省洞察' was promoted from dead to working in P104 (now
// 'ai_cost.section.savings_insights' for 4 AI cost engines). The remaining
// '📊 使用场景（每月成本）' is still dead — that string never appears in any
// engine output (AI cost engines use '📅 Usage Scenarios — Top 5 Cheapest
// Models at Different Volumes' with a date emoji and longer text).
const DEAD_KEY_FORBIDDEN_STRINGS = [
  '📊 使用场景（每月成本）',
];

// Working i18n keys — required on specific zh pages (visible content).
// If these translations disappear, the post-processor broke.
const WORKING_KEY_REQUIRED = [
  // P102 ops_cost keys
  { path: 'solopreneur-break-even-calculator/index.html', mustContain: '📊 盈亏平衡分析' },
  { path: 'solopreneur-remote-vs-office-calculator/index.html', mustContain: '🎯 盈亏平衡分析:' },
  // P104 ai_cost key (4 LLM API engines)
  { path: 'solopreneur-claude-api-cost-calculator/index.html', mustContain: '💰 节省洞察' },
  { path: 'solopreneur-openai-token-calculator/index.html', mustContain: '💰 节省洞察' },
  { path: 'solopreneur-gemini-api-cost-calculator/index.html', mustContain: '💰 节省洞察' },
  { path: 'solopreneur-deepseek-api-cost-calculator/index.html', mustContain: '💰 节省洞察' },
];

test('forbidden dead-key strings never appear in user-visible zh HTML', () => {
  ensureBuilt();
  const zhPages = getPages('zh');

  const violations: string[] = [];

  for (const rel of zhPages) {
    const rawHtml = readFileSync(resolve(root, 'dist', 'zh', rel), 'utf-8');
    const html = stripNonBody(rawHtml);
    for (const forbidden of DEAD_KEY_FORBIDDEN_STRINGS) {
      if (html.includes(forbidden)) {
        violations.push(`${rel}: contains forbidden string "${forbidden}"`);
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `Dead i18n key violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '') +
      `\n\nThese strings are dead-key residue from P99/P100 appearing in user-visible content. ` +
      `P102 removed the keys because no engine staticExamples contain these exact strings. ` +
      `Check src/i18n/translations.ts and src/pages/[lang]/[slug].astro translateCalcOutput headerKeys.`
  );
});

test('working i18n keys translate on their target pages', () => {
  ensureBuilt();

  const violations: string[] = [];

  for (const { path, mustContain } of WORKING_KEY_REQUIRED) {
    const full = resolve(root, 'dist', 'zh', path);
    if (!existsSync(full)) {
      violations.push(`${path}: file missing`);
      continue;
    }
    const rawHtml = readFileSync(full, 'utf-8');
    // Working keys can appear anywhere — including inside customFn JS source
    // (the literal English string gets translated client-side too in some cases).
    // Use raw HTML to assert presence in the page at all.
    if (!rawHtml.includes(mustContain)) {
      violations.push(`${path}: missing required translated string "${mustContain}"`);
    }
  }

  assert.equal(
    violations.length,
    0,
    `Working i18n key violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '') +
      `\n\nThese translated strings disappeared — the post-processor broke. ` +
      `Check src/pages/[lang]/[slug].astro translateCalcOutput function and the headerKeys array.`
  );
});