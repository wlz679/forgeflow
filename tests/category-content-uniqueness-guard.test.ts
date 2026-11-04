#!/usr/bin/env node
// P167 —— 分类页三区块的**内容唯一性**守卫（source-only）。
//
// 为什么需要这个守卫
// ------------------
// 另一个守卫（category-page-sections-guard）守的是**结构齐平**：
//   「每个分类页都有介绍段 / FAQ / 分类指南，条数与 locale 定义一致」。
// 本守卫守的是**内容不模板化**：
//   「15 个分类页的这三块不能长得太像」——
//   这是 AdSense 判「低价值 / 模板化页面」的那条线
//   （P155 取证时看到的原始判据：「组内模板词占比 12.6%」）。
//
// ⚠️ 两个守卫是**不同的维度**，缺一不可：
//   结构齐平但内容复制 => 15 页同一副骨架（AdSense 判低价值）
//   内容各异但结构不齐 => 页面在结构上自相矛盾（AdSense 判维护不良）
//
// ⭐ 本守卫是 source-only（只读 src/i18n/locales/*.json，不需要 dist/）
//   ⇒ 不构建也能守住「内容不模板化」，不必等一次完整 build。
//
// ⭐ 上限与算法不在本文件里，而在 tests/_category-sections-metrics.ts ——
//   体检工具与本守卫共用同一实现 + 同一组常量 ⇒ 两边不可能对不上。
//
// ⚠️ 与「同族判据」：
//   ① 「检查违规」的断言在没有违规时本来就绿 ⇒ 必须配**检测器自检**（见下）。
//   ② 跨分类断言必须**一次报出全部问题**，不能遇到第一个就退出。

import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import { categories } from '../src/data/categories.ts';
import {
  LANGS,
  MAX_SHARE,
  MAX_SHARED_GROUP,
  blocksOf,
  crossCategoryCount,
  loadLocale,
  sharedGroups,
  shingles,
  templateShare,
} from './_category-sections-metrics.ts';

const BLOCK_PARTS = ['intro', 'guide', 'faq'] as const;

test('P167 内容唯一性：各区块的组内模板词份额在上限内', () => {
  const problems: string[] = [];

  for (const lang of LANGS) {
    const locale = loadLocale(lang);
    const blocks = categories
      .map((c) => blocksOf(locale, c.id))
      .filter((b): b is NonNullable<typeof b> => b !== null);

    for (const part of BLOCK_PARTS) {
      const share = templateShare(blocks.map((b) => b[part]));
      const limit = MAX_SHARE[lang];
      if (share > limit) {
        problems.push(
          lang + '/' + part + '：组内模板词份额 ' + share.toFixed(2) + '% > 上限 ' + limit +
          '% ⇒ 这三块在复用同一副骨架',
        );
      }
    }
  }

  assert.deepEqual(problems, [], '分类页内容模板化：' + problems.join(String.fromCharCode(10)));
});

test('P167 内容唯一性：检测器自检 —— 份额计算真的能认出「复制」和「完全不同」', () => {
  // ⚠️ 没有这一条，上面那条断言可能因为「算法坏了所以永远是 0%」而恒绿。
  //   样本必须**真的产生被检特征**（P166 教训：样本太短 ⇒ 分词后产不出 5-gram）。

  const same = 'six calculators here work on the figures a team already exports every input is local';
  const copy = templateShare([same, same]);
  assert.ok(
    copy > 99.9,
    '检测器自检失败：两段完全相同的文本，模板词份额应接近 100%，实得 ' + copy.toFixed(2) + '%',
  );

  const a = 'gross retention excludes expansion and net retention includes it';
  const b = 'a support queue is only as good as the answers sitting behind it';
  const differ = templateShare([a, b]);
  assert.ok(
    differ < 0.01,
    '检测器自检失败：两段完全不同的文本，模板词份额应接近 0%，实得 ' + differ.toFixed(2) + '%',
  );
});

test('P167 内容唯一性：同一个 5-gram 不会被太多分类共用', () => {
  const problems: string[] = [];

  for (const lang of LANGS) {
    const locale = loadLocale(lang);
    const blocks = categories
      .map((c) => blocksOf(locale, c.id))
      .filter((b): b is NonNullable<typeof b> => b !== null);

    const byCategory = new Map<string, string>();
    for (const b of blocks) byCategory.set(b.letter, b.all);
    const groups = sharedGroups(byCategory);

    for (const [gram, letters] of groups) {
      if (letters.size > MAX_SHARED_GROUP) {
        problems.push(
          lang + '：同一个 5-gram 被 ' + letters.size + ' 个分类共用（> ' + MAX_SHARED_GROUP +
          '）：' + JSON.stringify(gram) + '　[' + [...letters].sort().join(', ') + ']',
        );
      }
    }

    // 逐分类的跨分类共用数（诊断：哪一页最像别人）
    for (const b of blocks) {
      const cross = crossCategoryCount(b.letter, groups);
      const total = new Set(shingles(b.all)).size;
      const ratio = total ? (cross / total) * 100 : 0;
      if (ratio > 5) {
        problems.push(
          lang + '/' + b.letter + '：跨分类共用 5-gram 占本页 ' + ratio.toFixed(1) + '%（> 5%）',
        );
      }
    }
  }

  assert.deepEqual(problems, [], '分类页之间共用同一句话：' + problems.join(String.fromCharCode(10)));
});

test('P167 内容唯一性：15 个分类在两种语言下都定义齐了三块', () => {
  const problems: string[] = [];

  for (const lang of LANGS) {
    const locale = loadLocale(lang);
    for (const c of categories) {
      const b = blocksOf(locale, c.id);
      if (!b) {
        problems.push(lang + '/' + c.id + '：locale 里没有 category.' + c.id + '.intro.h2');
        continue;
      }
      for (const part of BLOCK_PARTS) {
        if (!b[part].trim()) {
          problems.push(lang + '/' + c.id + '：' + part + ' 区块为空');
        }
      }
      // FAQ / 指南的**条数**由 locale 键派生，这里只查「至少各有一条」
      const faqKeys = Object.keys(locale).filter((k) => k.startsWith('category.' + c.id + '.faq.q')).length;
      const guideKeys = Object.keys(locale).filter((k) => k.startsWith('category.' + c.id + '.guide.')).length;
      if (faqKeys < 5) problems.push(lang + '/' + c.id + '：FAQ 只有 ' + faqKeys + ' 条（< 5）');
      if (guideKeys < 6) problems.push(lang + '/' + c.id + '：分类指南只有 ' + guideKeys / 2 + ' 张卡（< 3）');
    }
  }

  assert.deepEqual(problems, [], '分类页三区块未定义齐：' + problems.join(String.fromCharCode(10)));
});
