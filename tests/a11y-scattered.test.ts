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
//   - RelatedTools.astro + Footer.astro (B2-T2): decorative
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
const allComponents = () =>
  fs.readdirSync(componentsDir).filter((f) => f.endsWith('.astro'));

test('ToolCard: <a> 不嵌套 <button>', () => {
  const src = read('ToolCard.astro');
  // 简单 regex: 不允许 <a ...> ... <button ...> 出现在 <a> 内部
  // Strip HTML comments first — the B2-T1 fix added a markup-explanation
  // comment that contains the literal text "<a> 嵌套 <button>". The
  // regex is meant to catch nested ELEMENTS, not narrative comments.
  const stripped = src.replace(/<!--[\s\S]*?-->/g, '');
  assert.equal(/<a[^>]*>[^<]*<button/.test(stripped), false);
});

// P153-E2: this used to assert a hand-written list of 9 component files.
// The list had already rotted — `RelatedBlog.astro` was deleted with the
// blog (32a982e), so the guard crashed with ENOENT instead of checking
// anything. A transcribed list needs a manual edit every time a component
// is added or removed, and the day nobody does that, the guard is either
// broken (ENOENT) or silently checking less than it claims.
//
// New contract: EVERY component under src/components that renders an <svg>
// must carry aria-hidden="true" on it. The component set is derived from
// the directory, so a new component is covered the moment it lands and a
// deleted one drops out on its own.
test('装饰 SVG: 每个含 <svg> 的组件都带 aria-hidden（全量扫描，非手抄清单）', () => {
  const files = allComponents();
  assert.ok(files.length > 0, 'src/components 下没有找到任何 .astro —— 扫描路径失效');

  const offenders: string[] = [];
  const withSvg: string[] = [];

  for (const f of files) {
    const src = read(f);
    const svgCount = (src.match(/<svg/g) || []).length;
    if (svgCount === 0) continue;
    withSvg.push(f);
    const ariaCount = (src.match(/aria-hidden="true"/g) || []).length;
    if (svgCount > ariaCount) {
      offenders.push(`${f}: ${svgCount} SVGs but only ${ariaCount} aria-hidden`);
    }
  }

  // Non-vacuity: a broken path or a broken regex would leave this empty and
  // the assertion above would pass without having checked anything.
  assert.ok(
    withSvg.length > 0,
    '没有任何组件含 <svg> —— 正则或扫描逻辑已失效（断言会空转通过）',
  );
  assert.deepEqual(offenders, [], `装饰 SVG 缺少 aria-hidden:\n  ${offenders.join('\n  ')}`);
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
