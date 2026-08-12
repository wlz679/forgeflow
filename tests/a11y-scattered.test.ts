#!/usr/bin/env node
// P141-B2-T5: a11y-scattered CI guard
//
// Why this exists:
//   P141 OCR batch audit identified 7 组件-level a11y 散点 bugs across
//   B2-T1 through B2-T4. Each was fixed at source; this guard codifies
//   the fixes so future regressions trip the build.
//
// Scattered fixes defended:
//   - ToolCard.astro (B2-T1): `<a>` no longer wraps `<button>` (invalid HTML)
//   - RelatedTools.astro + RelatedBlog.astro + Footer.astro (B2-T2): decorative
//     `<svg>` carry `aria-hidden="true"` (svgCount ≤ ariaHiddenCount parity)
//   - RecentViewed.astro + HistoryList.astro (B2-T3): dynamic status region
//     declares `aria-live="polite"`
//   - HowToUse.astro (B2-T4): steps use semantic `<ol>` (not `<div>`s)
//   - SearchBar.astro (B2-T4): search landmark uses `<search>` element
//
// Build dependency: NONE — this is a source-only static check (regex on
// un-built src/components/*.astro). Runs in the default `pnpm test:unit`
// unit suite; no `RUN_BUILD_TESTS=1` gate required.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const componentsDir = path.resolve('src/components');
const read = (p: string) =>
  fs.readFileSync(path.join(componentsDir, p), 'utf8');

test('ToolCard: <a> 不嵌套 <button>', () => {
  const src = read('ToolCard.astro');
  // 简单 regex: 不允许 <a ...> ... <button ...> 出现在 <a> 内部
  // Strip HTML comments first — the B2-T1 fix added a markup-explanation
  // comment that contains the literal text "<a> 嵌套 <button>". The
  // regex is meant to catch nested ELEMENTS, not narrative comments.
  const stripped = src.replace(/<!--[\s\S]*?-->/g, '');
  assert.equal(/<a[^>]*>[^<]*<button/.test(stripped), false);
});

test('装饰 SVG: aria-hidden × 3', () => {
  for (const f of ['RelatedTools.astro', 'RelatedBlog.astro', 'Footer.astro']) {
    const src = read(f);
    const svgCount = (src.match(/<svg/g) || []).length;
    const ariaCount = (src.match(/aria-hidden="true"/g) || []).length;
    assert.ok(
      svgCount <= ariaCount,
      `${f}: ${svgCount} SVGs but only ${ariaCount} aria-hidden`
    );
  }
});

test('aria-live: RecentViewed + HistoryList', () => {
  for (const f of ['RecentViewed.astro', 'HistoryList.astro']) {
    const src = read(f);
    assert.ok(src.includes('aria-live="polite"'), `${f} missing aria-live`);
  }
});

test('HowToUse: <ol> 而非 <div>', () => {
  const src = read('HowToUse.astro');
  assert.ok(src.includes('<ol'), 'HowToUse must use <ol>');
});

test('SearchBar: <search> 元素', () => {
  const src = read('SearchBar.astro');
  assert.ok(src.includes('<search'), 'SearchBar must use <search>');
});
