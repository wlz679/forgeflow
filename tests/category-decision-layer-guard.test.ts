#!/usr/bin/env node
// P159 — 2.0 批次 1「分类页决策层」守卫（source-only）。
//
// 为什么存在这个守卫
// ------------------
// 分类页是 D6 拍板的批次 1（19 页，1,789 展示，全站 13.4%，**0 点击**），
// 也是全站唯一带「组内模板词」的一类（12.6%）—— 19 个分类页共用同一副
// 描述骨架，正是 AdSense 最可能采样的那类页面。
//
// 决策层（选型链路 + 工具取舍对照）是要**替换**那副骨架的东西，所以它有
// 两条硬约束，必须由守卫盯住，否则很容易在赶工时被破坏：
//
//   1. **覆盖率**：决策层必须覆盖该类别**每一个**工具。漏掉一个工具，
//      用户在对照表里就找不到自己那个 —— 而对照表是这个区块的价值所在。
//   2. **不重复、不发价格**：
//      · 决策层不得复制主题页基准表的 segment / metric 文本 —— 那等于站内
//        自己制造重复内容，正是 P157 §10.1【C】刚证明要避开的那条线；
//      · 决策层**不得出现任何价格** —— 分类页是路由层，价格由工具页和主题页
//        负责；在这里再写一份价格就会制造**第二个真相源**（P158 修掉的正是
//        这种形状：主题页手写价格 vs 实时定价数据集，16 条基准行漂了 6 条）。
//
// ⚠️ 期望值全部是本文件里**独立写死**的字面量，不是从被测模块导出的常量。
//
// Build dependency: none (source-only).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { CATEGORY_DECISION_LAYERS } from '../src/data/category-decision-layers.ts';
import { categories } from '../src/data/categories.ts';
import { tools } from '../src/data/tools/index.ts';
import { TOPIC_BENCHMARK_CONTENT } from '../src/data/topic-content.ts';

const root = resolve(import.meta.dirname, '..');
const en = JSON.parse(readFileSync(resolve(root, 'src/i18n/locales/en.json'), 'utf-8')) as Record<string, string>;
const zh = JSON.parse(readFileSync(resolve(root, 'src/i18n/locales/zh.json'), 'utf-8')) as Record<string, string>;

/** 决策层用到的 i18n 键 —— 写死的清单，少一个键就会在页面上印出原始键名 */
const DECISION_LAYER_I18N_KEYS = [
  'category.decision_layer.chain.h2',
  'category.decision_layer.step',
  'category.decision_layer.choices.h2',
  'category.decision_layer.choices.intro',
  'category.decision_layer.choices.col.tool',
  'category.decision_layer.choices.col.answers',
  'category.decision_layer.choices.col.use_when',
];

/**
 * 最小正文长度，按「信息量」计：Latin word 记 1，CJK 字符记 0.5。
 *
 * ⚠️ 不要用「字符数」判正文长度：1 个汉字的信息量 ≈ 2 个英文字符，
 *    用字符数直接比会**系统性误伤中文**（实测第一版用 80 字符阈值，
 *    把一段 78 字的合格中文判成「太短」）。阈值按真实产物的最小值
 *    再留 ~25% 余量：purpose 实测最小 zh=29.5 / en=37.0，
 *    answers zh=9.5 / en=13.0，useWhen zh=22.0 / en=27.0。
 */
const MIN_PURPOSE_UNITS = 22;
const MIN_ANSWERS_UNITS = 7;
const MIN_USEWHEN_UNITS = 16;
const MIN_INTRO_UNITS = 21;

/** 信息量：Latin word 记 1，CJK 字符记 0.5 */
function infoUnits(s: string): number {
  let cjk = 0;
  let latin = 0;
  for (const m of s.matchAll(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff]+|[A-Za-z0-9][A-Za-z0-9'’\-]*/g)) {
    if (/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff]/.test(m[0])) cjk += m[0].length;
    else latin += 1;
  }
  return latin + cjk / 2;
}

// ---------------------------------------------------------------------------
// 1. The configured categories exist, and each layer is well-formed
// ---------------------------------------------------------------------------

test('P159: every configured decision layer belongs to a real category', () => {
  for (const categoryId of Object.keys(CATEGORY_DECISION_LAYERS)) {
    assert.ok(
      categories.some((c) => c.id === categoryId),
      `decision layer is configured for category "${categoryId}" which does not exist in src/data/categories.ts`,
    );
  }
});

test('P159: every decision layer has a chain and a choices table', () => {
  for (const [categoryId, layer] of Object.entries(CATEGORY_DECISION_LAYERS)) {
    assert.ok(layer.chain.length >= 2, `${categoryId}: the chain should have at least 2 steps, got ${layer.chain.length}`);
    assert.ok(layer.choices.length >= 1, `${categoryId}: the choices table should not be empty`);
  }
});

test('P159: every decision layer field is present in both languages', () => {
  for (const [categoryId, layer] of Object.entries(CATEGORY_DECISION_LAYERS)) {
    assert.ok(
      infoUnits(layer.chainIntro.en) >= MIN_INTRO_UNITS,
      `${categoryId}: chainIntro.en is too short (${infoUnits(layer.chainIntro.en)} < ${MIN_INTRO_UNITS} units)`,
    );
    assert.ok(
      infoUnits(layer.chainIntro.zh) >= MIN_INTRO_UNITS,
      `${categoryId}: chainIntro.zh is too short (${infoUnits(layer.chainIntro.zh)} < ${MIN_INTRO_UNITS} units)`,
    );
    for (const [i, step] of layer.chain.entries()) {
      assert.ok(
        infoUnits(step.purpose.en) >= MIN_PURPOSE_UNITS,
        `${categoryId}: chain step ${i + 1} purpose.en is too short (${infoUnits(step.purpose.en)} < ${MIN_PURPOSE_UNITS} units)`,
      );
      assert.ok(
        infoUnits(step.purpose.zh) >= MIN_PURPOSE_UNITS,
        `${categoryId}: chain step ${i + 1} purpose.zh is too short (${infoUnits(step.purpose.zh)} < ${MIN_PURPOSE_UNITS} units)`,
      );
    }
    for (const row of layer.choices) {
      assert.ok(
        infoUnits(row.answers.en) >= MIN_ANSWERS_UNITS,
        `${row.slug}: answers.en is too short (${infoUnits(row.answers.en)} < ${MIN_ANSWERS_UNITS} units)`,
      );
      assert.ok(
        infoUnits(row.answers.zh) >= MIN_ANSWERS_UNITS,
        `${row.slug}: answers.zh is too short (${infoUnits(row.answers.zh)} < ${MIN_ANSWERS_UNITS} units)`,
      );
      assert.ok(
        infoUnits(row.useWhen.en) >= MIN_USEWHEN_UNITS,
        `${row.slug}: useWhen.en is too short (${infoUnits(row.useWhen.en)} < ${MIN_USEWHEN_UNITS} units)`,
      );
      assert.ok(
        infoUnits(row.useWhen.zh) >= MIN_USEWHEN_UNITS,
        `${row.slug}: useWhen.zh is too short (${infoUnits(row.useWhen.zh)} < ${MIN_USEWHEN_UNITS} units)`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// 2. Coverage: every tool of the category is reachable
// ---------------------------------------------------------------------------

test('P159: the choices table covers exactly the tools of the category', () => {
  for (const [categoryId, layer] of Object.entries(CATEGORY_DECISION_LAYERS)) {
    const expected = tools.filter((tool) => tool.categoryId === categoryId).map((tool) => tool.slug).sort();
    const actual = layer.choices.map((row) => row.slug).sort();
    assert.deepEqual(
      actual,
      expected,
      `${categoryId}: the choices table must list every tool of the category exactly once — ` +
        'a missing tool means the user cannot find theirs in the table',
    );
  }
});

test('P159: every chain step points at a real tool of the same category', () => {
  for (const [categoryId, layer] of Object.entries(CATEGORY_DECISION_LAYERS)) {
    for (const [i, step] of layer.chain.entries()) {
      for (const slug of step.slugs) {
        const tool = tools.find((t) => t.slug === slug);
        assert.ok(tool, `${categoryId}: chain step ${i + 1} points at "${slug}" which is not in the tools registry`);
        assert.equal(
          tool!.categoryId,
          categoryId,
          `${categoryId}: chain step ${i + 1} points at "${slug}" which belongs to category ${tool!.categoryId}`,
        );
      }
    }
  }
});

test('P159: the chain reaches every tool of the category', () => {
  for (const [categoryId, layer] of Object.entries(CATEGORY_DECISION_LAYERS)) {
    const inChain = new Set(layer.chain.flatMap((step) => step.slugs));
    const missing = tools
      .filter((tool) => tool.categoryId === categoryId)
      .map((tool) => tool.slug)
      .filter((slug) => !inChain.has(slug));
    assert.deepEqual(
      missing,
      [],
      `${categoryId}: these tools never appear in the decision chain — the chain is the page's main answer, ` +
        'a tool that only shows up in the grid is not reachable from the workflow',
    );
  }
});

// ---------------------------------------------------------------------------
// 3. The two hard constraints: no duplication, no prices
// ---------------------------------------------------------------------------

test('P159: no decision layer text contains a price', () => {
  const price = /\$\s?\d/;
  for (const [categoryId, layer] of Object.entries(CATEGORY_DECISION_LAYERS)) {
    const texts = [
      layer.chainIntro.en, layer.chainIntro.zh,
      ...layer.chain.flatMap((s) => [s.purpose.en, s.purpose.zh]),
      ...layer.choices.flatMap((r) => [r.answers.en, r.answers.zh, r.useWhen.en, r.useWhen.zh]),
    ];
    for (const text of texts) {
      assert.doesNotMatch(
        text,
        price,
        `${categoryId}: the decision layer must not publish prices — the category page routes to ` +
          `the calculators and the topic page owns the benchmark table. A second copy of a price ` +
          `is a second source of truth, which is the defect P158 had to fix. Offending text: ${text.slice(0, 120)}`,
      );
    }
  }
});

test('P159: the decision layer does not copy topic benchmark table text', () => {
  for (const [categoryId, layer] of Object.entries(CATEGORY_DECISION_LAYERS)) {
    const texts = [
      layer.chainIntro.en, layer.chainIntro.zh,
      ...layer.chain.flatMap((s) => [s.purpose.en, s.purpose.zh]),
      ...layer.choices.flatMap((r) => [r.answers.en, r.answers.zh, r.useWhen.en, r.useWhen.zh]),
    ].map((s) => s.toLowerCase());

    for (const content of Object.values(TOPIC_BENCHMARK_CONTENT)) {
      for (const lang of ['en', 'zh'] as const) {
        for (const row of content[lang].rows) {
          for (const fragment of [row.segment, row.metric]) {
            const needle = fragment.toLowerCase();
            // 太短的片段（如单个词）容易误伤，只查有区分度的
            if (needle.length < 12) continue;
            for (const text of texts) {
              assert.ok(
                !text.includes(needle),
                `${categoryId}: the decision layer copies the topic benchmark text "${fragment}" — ` +
                  'the category page must give the decision layer, the topic page keeps the benchmark table',
              );
            }
          }
        }
      }
    }
  }
});

// ---------------------------------------------------------------------------
// 4. The i18n keys the component needs exist in both locales
// ---------------------------------------------------------------------------

test('P159: every decision-layer i18n key exists in en.json', () => {
  for (const key of DECISION_LAYER_I18N_KEYS) {
    assert.ok(key in en, `en.json is missing "${key}"`);
  }
});

test('P159: every decision-layer i18n key exists in zh.json', () => {
  for (const key of DECISION_LAYER_I18N_KEYS) {
    assert.ok(key in zh, `zh.json is missing "${key}"`);
  }
});

test('P159: the step label carries a {n} placeholder in both locales', () => {
  for (const [name, locale] of [['en', en], ['zh', zh]] as const) {
    const tmpl = locale['category.decision_layer.step'] ?? '';
    assert.ok(
      tmpl.includes('{n}'),
      `${name}.json "category.decision_layer.step" must contain the {n} placeholder, got "${tmpl}"`,
    );
  }
});
