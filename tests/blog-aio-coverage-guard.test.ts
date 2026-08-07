#!/usr/bin/env node
// P140e — CI guard for §13.2 AIO-aware 8 elements in 5 deep blogs (Phase 2).
//
// Why this exists:
//   Phase 2 5 blog 必须含 AIO-aware 8 元素 (§13.2):
//   1. schema.org FAQPage     (JSON-LD in code block)
//   2. comparison table       (## Comparison Table ... heading)
//   3. EEAT author            (frontmatter author:)
//   4. EEAT reviewed_by       (frontmatter reviewed_by: array)
//   5. EEAT data_reviewed_at  (frontmatter data_reviewed_at: 'YYYY-MM-DD')
//   6. Decision Recommendation 段 (## Decision Recommendation 或 🧭 Decision Question)
//   7. 跨 calc 互联 (cross-link)   (/en/<slug>-calculator/ path)
//   8. 长度 ≥ 3000 字              (en body, 不计 frontmatter + JSON-LD code block)
//
// 5 blog: csat / roas / cac / churn-rate / burn-rate
// Source-level: read .md file body + frontmatter as text, grep literal strings.
// Cross-link regex uses [\w-]+ to support digit-bearing slugs like
// `burn-multiple-rule-of-40-calculator` (T6 implementer flag — bare `[a-z-]+`
// would miss the `40` segment).
//
// Build dependency: RUN_BUILD_TESTS=1 required (P23b skip-guard pattern).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

const TARGET_BLOGS = [
  'src/content/blog/best-solopreneur-csat-calculator.md',
  'src/content/blog/best-solopreneur-roas-calculator.md',
  'src/content/blog/best-solopreneur-cac-calculator.md',
  'src/content/blog/best-solopreneur-churn-rate-calculator.md',
  'src/content/blog/best-solopreneur-burn-rate-calculator.md',
];

const AIO_ELEMENTS = [
  {
    name: 'schema.org FAQPage',
    check: (src: string) => src.includes('"@type": "FAQPage"'),
  },
  {
    name: 'comparison table',
    check: (src: string) =>
      /^##\s+Comparison Table/m.test(src) || /^##\s+ForgeFlowKit vs/m.test(src),
  },
  {
    name: 'EEAT author',
    check: (src: string) => /^author:\s*\S/m.test(src),
  },
  {
    name: 'EEAT reviewed_by',
    check: (src: string) => /^reviewed_by:/m.test(src),
  },
  {
    name: 'EEAT data_reviewed_at',
    check: (src: string) => /^data_reviewed_at:\s*'\d{4}-\d{2}-\d{2}'/m.test(src),
  },
  {
    name: 'Decision Recommendation 段',
    check: (src: string) =>
      /^##\s+Decision Recommendation/m.test(src) || /🧭\s+Decision Question/m.test(src),
  },
  {
    // [\w-]+ supports digit-bearing slugs like `burn-multiple-rule-of-40-calculator`.
    name: '跨 calc 互联 (cross-link)',
    check: (src: string) => /\[[^\]]*\]\(\/en\/[\w-]+-calculator\/\)/.test(src),
  },
  {
    name: '长度 ≥ 3000 字 (en body)',
    check: (src: string) => {
      // 移除 frontmatter (--- ... ---) 与 代码块 (``` ... ```), 数剩余字符长度.
      const body = src
        .replace(/^---[\s\S]*?---\n/, '')
        .replace(/```[\s\S]*?```/g, '');
      return body.length >= 3000;
    },
  },
];

test('5 blog 全部含 §13.2 AIO-aware 8 元素', () => {
  for (const relPath of TARGET_BLOGS) {
    const src = readFileSync(resolve(root, relPath), 'utf8');
    for (const elem of AIO_ELEMENTS) {
      assert.ok(
        elem.check(src),
        `${relPath} 缺失 AIO 元素: "${elem.name}"`,
      );
    }
  }
});

test('guard 元数据正确 (5 blog × 8 检查项 = 40 守护点)', () => {
  assert.equal(TARGET_BLOGS.length, 5);
  assert.equal(AIO_ELEMENTS.length, 8);
});