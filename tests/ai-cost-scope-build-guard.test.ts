#!/usr/bin/env node
// P156 — AI cost 页「静态文案 == 交互态」守卫（build-dep）。
//
// 为什么需要 build-dep 版本
// -------------------------
// `tests/ai-cost-scope-guard.test.ts` 盯的是源码里的文案数字。但真正的
// 不一致发生在**产物**上：页面里同时存在
//
//   - 预渲染的 #static-results（"Cost Comparison (138 Models)"）
//   - 内联的客户端数据表 `M{...}` / `P{...}`（18 / 4 个模型）
//
// 而这两个数字之间的差，只有把产物摊开才能看到。本守卫直接读 dist/ 的
// HTML，断言：
//
//   1. 静态正文里的模型数 == 内联客户端表里的模型数
//   2. 两者都 == 交互态白名单的写死字面量（18 / 13 / 8 / 5 / 4）
//
// 这样「文案说 138、只能选 18」这种不一致一旦回归，CI 会直接红 —— 而
// 它不会在构建阶段红（构建只管把内容写进去，不管写对没有）。
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern)

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

const OPENAI_PAGE = resolve(root, 'dist', 'en', 'solopreneur-openai-token-calculator', 'index.html');
const COMPARISON_PAGE = resolve(root, 'dist', 'en', 'solopreneur-ai-api-cost-comparison', 'index.html');

/** Run `pnpm build` if dist/ is missing. */
function ensureBuilt(): void {
  if (existsSync(OPENAI_PAGE)) return;
  console.log('[p156] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

function pageHtml(file: string): string {
  ensureBuilt();
  assert.ok(existsSync(file), `${file} does not exist — the build did not produce this page`);
  return readFileSync(file, 'utf-8');
}

/**
 * Read the inlined client model table `var M={...}` and count its models.
 *
 * TWO shapes exist in the wild, and a naive `M['key']=` regex measures the
 * wrong thing on three of the four provider pages:
 *
 *   - openai:  var M={};M['gpt-6.1-sol']={...};M['gpt-6-astra']={...}
 *   - others:  var M={'claude-fable-5':{...},'claude-opus-5-5':{...}}
 *
 * (A regex for the first shape finds "2 unique" on the claude page — it
 * matches an unrelated `M['5min']` duration map instead of the model table.
 * Measure the table, not a string that looks like it.)
 */
function clientTableSize(html: string): number {
  const start = html.indexOf('var M={');
  if (start < 0) return 0;
  const literal = scanObjectLiteral(html, start + 'var M='.length);
  if (!literal) return 0;

  // Assignment form: `var M={};` — the models follow as M['key']={...}.
  if (literal.body.trim() === '') {
    const rest = html.slice(literal.end);
    const stop = rest.search(/var [A-Za-z_$][\w$]*=/);
    const body = stop > 0 ? rest.slice(0, stop) : rest;
    return new Set([...body.matchAll(/M\['([^']+)'\]=/g)].map((m) => m[1]!)).size;
  }

  // Object-literal form: count the top-level `'key':` entries.
  return topLevelKeys(literal.body).length;
}

/** Scan a balanced `{...}` literal starting at `openIdx` (which points at '{'). */
function scanObjectLiteral(
  text: string,
  openIdx: number,
): { body: string; end: number } | null {
  let depth = 0;
  let quote: string | null = null;
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i]!;
    if (quote) {
      if (ch === '\\') { i++; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '{' || ch === '[') { depth++; continue; }
    if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) return { body: text.slice(openIdx + 1, i), end: i };
    }
  }
  return null;
}

/** Collect the quoted keys at depth 0 of an object-literal body. */
function topLevelKeys(body: string): string[] {
  const keys: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let keyStart = -1;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]!;
    if (quote) {
      if (ch === '\\') { i++; continue; }
      if (ch === quote) {
        // Depth 0 ⇒ this quoted string is a KEY (the values live inside
        // braces, so they are at depth >= 1).
        if (depth === 0) keys.push(body.slice(keyStart + 1, i));
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; keyStart = i; continue; }
    if (ch === '{' || ch === '[') { depth++; continue; }
    if (ch === '}' || ch === ']') { depth--; continue; }
  }
  return keys;
}

/** Count models in the inlined comparison table `var P={ provider:{m:[...]} }`. */
function comparisonTableSize(html: string): number {
  const table = html.match(/var P=\{[\s\S]*?\};/);
  if (!table) return 0;
  const perProvider = [...table[0].matchAll(/m:\[([^\]]*)\]/g)].map((m) => m[1]!);
  return perProvider.reduce((n, chunk) => n + (chunk.match(/\{/g)?.length ?? 0), 0);
}

test('P156: the openai page static copy matches its client table (18)', () => {
  const html = pageHtml(OPENAI_PAGE);
  const tableSize = clientTableSize(html);
  assert.equal(tableSize, 18, `the inlined openai client table should carry 18 models, found ${tableSize}`);

  const claims = [...html.matchAll(/Cost Comparison \((\d+) Models\)/g)].map((m) => Number(m[1]));
  assert.ok(
    claims.length > 0,
    'the openai page does not state a model count at all — the static copy lost its heading',
  );
  for (const claim of claims) {
    assert.equal(
      claim,
      tableSize,
      `the openai page claims "${claim} Models" but the interactive table only carries ` +
        `${tableSize} — the visitor is promised a scope the tool cannot deliver`,
    );
  }
});

test('P156: the comparison page static copy matches its client table (4)', () => {
  const html = pageHtml(COMPARISON_PAGE);
  const tableSize = comparisonTableSize(html);
  assert.equal(tableSize, 4, `the inlined comparison client table should carry 4 models, found ${tableSize}`);

  const claims = [...html.matchAll(/Comparing (\d+) models across (\d+) providers/g)];
  assert.ok(claims.length > 0, 'the comparison page does not state a model count at all');
  for (const claim of claims) {
    assert.equal(
      Number(claim[1]),
      tableSize,
      `the comparison page claims "${claim[1]} models" but the interactive table only ` +
        `carries ${tableSize} — the visitor is promised a scope the tool cannot deliver`,
    );
    assert.equal(Number(claim[2]), 4, 'the comparison page must still cover all four providers');
  }
});

test('P156: the other three provider pages carry their interactive model counts', () => {
  const pages: Array<[string, number]> = [
    ['solopreneur-claude-api-cost-calculator', 13],
    ['solopreneur-gemini-api-cost-calculator', 8],
    ['solopreneur-deepseek-api-cost-calculator', 5],
  ];
  for (const [slug, expected] of pages) {
    const html = pageHtml(resolve(root, 'dist', 'en', slug, 'index.html'));
    const tableSize = clientTableSize(html);
    assert.equal(
      tableSize,
      expected,
      `${slug} should carry ${expected} models in its client table, found ${tableSize}`,
    );
  }
});
