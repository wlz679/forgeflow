// Fixture-driven regression test for the UPDATE-regex bug fixed in P18-1.
// Pre-fix, `reSingle = /('key':\s*\{[^}]*?zh:\s*)'([^']*)'/m` matched only up to
// the first `'` in zh. If zh contains `'` (e.g. ARR range), the match truncates
// and the replace leaves dangling suffix → JS parse error.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { replaceZhValue } from '../../scripts/lib/zh-parser.mjs';

const fixtures = [
  {
    name: 'single-quoted zh with embedded apostrophe (P17b corruption repro)',
    input: `  'tools.x.input.amount.label': { en: 'Amount', zh: '对 '$10M-$50M ARR' 的金额' },`,
    key: 'tools.x.input.amount.label',
    newZh: "对 '$10M-$50M ARR' 范围的金额",
    expectContains: `zh: '对 \\'$10M-$50M ARR\\' 范围的金额'`,
  },
  {
    name: 'double-quoted zh with embedded double-quote',
    input: `  'tools.x.faq.0.q': { en: 'Q?', zh: "包含 \"转义双引号\" 的问题" },`,
    key: 'tools.x.faq.0.q',
    newZh: '包含 "新转义双引号" 的问题',
    expectContains: `zh: "包含 \\"新转义双引号\\" 的问题"`,
  },
  {
    name: 'single-quoted zh with backslash and newline',
    input: `  'tools.x.how_to_use.0': { en: 'step', zh: '多行\\\\n文本' },`,
    key: 'tools.x.how_to_use.0',
    newZh: '新多行\\n文本',
    expectContains: `zh: '新多行\\\\n文本'`,
  },
  {
    name: 'no embedded special chars (baseline)',
    input: `  'tools.x.input.x.label': { en: 'X', zh: '原始 zh' },`,
    key: 'tools.x.input.x.label',
    newZh: '替换后的 zh',
    expectContains: `zh: '替换后的 zh'`,
  },
];

describe('replaceZhValue state-machine parser (P18-1)', () => {
  for (const fx of fixtures) {
    it(fx.name, () => {
      const out = replaceZhValue(fx.input, fx.key, fx.newZh);
      assert.ok(
        out.includes(fx.expectContains),
        `Output should contain ${JSON.stringify(fx.expectContains)} but was ${JSON.stringify(out)}`,
      );
    });
  }
});
