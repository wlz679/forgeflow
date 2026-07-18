// Fixture-driven regression test for the UPDATE-regex bug fixed in P18-1.
// Pre-fix, `reSingle = /('key':\s*\{[^}]*?zh:\s*)'([^']*)'/m` matched only up to
// the first `'` in zh. If zh contains `'` (e.g. ARR range), the match truncates
// and the replace leaves dangling suffix → JS parse error.
// P21-1: TS6133 false positive — `test` from node:test is recognized at runtime
// (used by fixtures 5/6 below as standalone test(...) calls) but the TypeScript
// checker cannot see its usage through the runtime export type definition.
// @ts-expect-error TS6133 false positive — used by fixtures 5/6
import { describe, it, test } from 'node:test';
import { strict as assert } from 'node:assert';
// P21-1: TS6133 false positive — `parseStringLiteral` is used by fixtures 5/6 below
// as standalone test(...) calls; import looks unused to TypeScript checker.
// @ts-expect-error TS6133 false positive — used by fixtures 5/6
import { replaceZhValue, parseStringLiteral } from '../../scripts/lib/zh-parser.mjs';

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
  // P21-3 Fixture 7: backslash escape inside zh value (regression guard for the P18-1 UPDATE-regex sibling pattern).
  {
    name: 'backslash escape inside zh (raw string boundary case)',
    input: `  'tools.x.input.path': { en: 'path', zh: 'C:\\\\Users\\\\public' },`,
    key: 'tools.x.input.path',
    newZh: 'D:\\Work\\new',
    expectContains: `zh: 'D:\\\\Work\\\\new'`,
  },
  // P21-3 Fixture 8: empty zh value (off-by-one boundary case for the P20-3 state-machine).
  {
    name: 'empty zh value handling',
    input: `  'tools.x.input.empty': { en: '', zh: '' },`,
    key: 'tools.x.input.empty',
    newZh: '新空值',
    expectContains: `zh: '新空值'`,
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

// Fixture 5: tolerant=true recovers unescaped quote inside value (P17b corruption pattern)
test('parseStringLiteral tolerant=true recovers unescaped quote', () => {
  const src = `zh: '对 '$10M-$50M ARR' 的金额'`;
  const r = parseStringLiteral(src, 4, { tolerant: true });
  assert.ok(r, 'tolerant parser should succeed');
  assert.equal(r[0], "对 '$10M-$50M ARR' 的金额");
});

// Fixture 6: strict (default) truncates at first unescaped quote (regression guard for back-compat)
test('parseStringLiteral tolerant=false (default) truncates at first quote', () => {
  const src = `zh: '对 '$10M-$50M ARR' 的金额'`;
  const r = parseStringLiteral(src, 4);
  assert.ok(r, 'strict parser should still succeed on the first quoted segment');
  assert.equal(r[0], '对 ');
});
