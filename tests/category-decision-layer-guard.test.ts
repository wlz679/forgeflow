#!/usr/bin/env node
// P159 — 2.0 批次 1「分类页决策层」守卫（source-only）。
//
// 为什么需要这个守卫
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
// ⚠️ P165：所有跨分类的断言改成「**收集全部问题 → 一次报出**」。
//    原来的写法（每个分类一个 assert.deepEqual）在第一个失败的分类就抛 ⇒
//    **后面的 14 个分类的失败全部不可见** —— 实测 P165 的 worker 为了确认
//    自己的 3 个分类干净，只能另写一份等价脚本绕过去。
//    ⇒ 「一个失败遮住其余全部」本身就是一种盲区；守卫必须一次把所有问题摊开。
//
// Build dependency: none (source-only).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { CATEGORY_DECISION_LAYERS } from '../src/data/category-decision-layers/index.ts';
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

/** 决策层里所有会被检查的文本（按分类分组，便于报出问题时定位） */
function layerTexts(layer: (typeof CATEGORY_DECISION_LAYERS)[string]): string[] {
  return [
    layer.chainIntro.en, layer.chainIntro.zh,
    ...layer.chain.flatMap((s) => [s.purpose.en, s.purpose.zh]),
    ...layer.choices.flatMap((r) => [r.answers.en, r.answers.zh, r.useWhen.en, r.useWhen.zh]),
  ];
}

// ---------------------------------------------------------------------------
// 1. The configured categories exist, and each layer is well-formed
// ---------------------------------------------------------------------------

test('P159: every configured decision layer belongs to a real category', () => {
  const problems = Object.keys(CATEGORY_DECISION_LAYERS)
    .filter((id) => !categories.some((c) => c.id === id))
    .map((id) => `"${id}" 不在 src/data/categories.ts 里`);
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('P165: 每一个分类都必须有决策层（决策层必须覆盖全部分类，不是抽样）', () => {
  // 为什么这条要单独钉死
  // ----------------------
  // P159 只做成了 1 个类别（AI Cost Tools）做样板，规格 §11 写的是
  // 「第一版只做 1 个类别做样板，跑通形态与验收判据后再铺其余 11 个类别」——
  // 而**铺开从未发生**。实测：15 个分类里当时只有 1 个有决策层，
  // 19 个有展示的分类页里 18 页是「一段描述 + 一张工具网格」。
  //
  // ⇒ 下面那些断言都是**遍历已配置的分类**（`Object.entries(CATEGORY_DECISION_LAYERS)`）
  // ⇒ 没配的分类**根本不会被检查** ⇒ 「只配了 1 个」和「配全了」在这套断言下长得一模一样。
  // 这正是「存在性断言只能证明它守的那一条」的另一个实例：
  // 要证明「全覆盖」，断言必须拿**全集**（categories.ts）去比，而不是拿子集自我循环。
  const configured = Object.keys(CATEGORY_DECISION_LAYERS).sort();
  const all = categories.map((c) => c.id).sort();
  assert.deepEqual(
    configured,
    all,
    `决策层只覆盖了 ${configured.length}/${all.length} 个分类。` +
      `缺：${all.filter((id) => !configured.includes(id)).join(', ')}`,
  );
});

test('P159: every decision layer has a chain and a choices table', () => {
  const problems: string[] = [];
  for (const [categoryId, layer] of Object.entries(CATEGORY_DECISION_LAYERS)) {
    if (layer.chain.length < 2) problems.push(`${categoryId}: chain 只有 ${layer.chain.length} 步（至少 2 步）`);
    if (layer.choices.length < 1) problems.push(`${categoryId}: choices 表是空的`);
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('P159: every decision layer field is present in both languages', () => {
  const problems: string[] = [];
  for (const [categoryId, layer] of Object.entries(CATEGORY_DECISION_LAYERS)) {
    if (infoUnits(layer.chainIntro.en) < MIN_INTRO_UNITS) {
      problems.push(`${categoryId}: chainIntro.en 太短（${infoUnits(layer.chainIntro.en)} < ${MIN_INTRO_UNITS}）`);
    }
    if (infoUnits(layer.chainIntro.zh) < MIN_INTRO_UNITS) {
      problems.push(`${categoryId}: chainIntro.zh 太短（${infoUnits(layer.chainIntro.zh)} < ${MIN_INTRO_UNITS}）`);
    }
    for (const [i, step] of layer.chain.entries()) {
      if (infoUnits(step.purpose.en) < MIN_PURPOSE_UNITS) {
        problems.push(`${categoryId}: chain 第 ${i + 1} 步 purpose.en 太短（${infoUnits(step.purpose.en)} < ${MIN_PURPOSE_UNITS}）`);
      }
      if (infoUnits(step.purpose.zh) < MIN_PURPOSE_UNITS) {
        problems.push(`${categoryId}: chain 第 ${i + 1} 步 purpose.zh 太短（${infoUnits(step.purpose.zh)} < ${MIN_PURPOSE_UNITS}）`);
      }
    }
    for (const row of layer.choices) {
      if (infoUnits(row.answers.en) < MIN_ANSWERS_UNITS) {
        problems.push(`${row.slug}: answers.en 太短（${infoUnits(row.answers.en)} < ${MIN_ANSWERS_UNITS}）`);
      }
      if (infoUnits(row.answers.zh) < MIN_ANSWERS_UNITS) {
        problems.push(`${row.slug}: answers.zh 太短（${infoUnits(row.answers.zh)} < ${MIN_ANSWERS_UNITS}）`);
      }
      if (infoUnits(row.useWhen.en) < MIN_USEWHEN_UNITS) {
        problems.push(`${row.slug}: useWhen.en 太短（${infoUnits(row.useWhen.en)} < ${MIN_USEWHEN_UNITS}）`);
      }
      if (infoUnits(row.useWhen.zh) < MIN_USEWHEN_UNITS) {
        problems.push(`${row.slug}: useWhen.zh 太短（${infoUnits(row.useWhen.zh)} < ${MIN_USEWHEN_UNITS}）`);
      }
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

// ---------------------------------------------------------------------------
// 2. Coverage: every tool of the category is reachable
// ---------------------------------------------------------------------------

test('P159: the choices table covers exactly the tools of the category', () => {
  const problems: string[] = [];
  for (const [categoryId, layer] of Object.entries(CATEGORY_DECISION_LAYERS)) {
    const expected = tools.filter((tool) => tool.categoryId === categoryId).map((tool) => tool.slug).sort();
    const actual = layer.choices.map((row) => row.slug).sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      const missing = expected.filter((s) => !actual.includes(s));
      const extra = actual.filter((s) => !expected.includes(s));
      problems.push(
        `${categoryId}: 对照表必须恰好列出本分类的每一个工具一次 —— ` +
          (missing.length ? `缺 ${missing.join(', ')}` : '') +
          (extra.length ? `；多 ${extra.join(', ')}` : '') +
          `（期望 ${expected.length} 行，实际 ${actual.length} 行）`,
      );
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('P159: every chain step points at a real tool of the same category', () => {
  const problems: string[] = [];
  for (const [categoryId, layer] of Object.entries(CATEGORY_DECISION_LAYERS)) {
    for (const [i, step] of layer.chain.entries()) {
      for (const slug of step.slugs) {
        const tool = tools.find((t) => t.slug === slug);
        if (!tool) {
          problems.push(`${categoryId}: chain 第 ${i + 1} 步指向 "${slug}"，它不在工具注册表里`);
          continue;
        }
        if (tool.categoryId !== categoryId) {
          problems.push(`${categoryId}: chain 第 ${i + 1} 步指向 "${slug}"，但它属于分类 ${tool.categoryId}`);
        }
      }
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('P159: the chain reaches every tool of the category', () => {
  const problems: string[] = [];
  for (const [categoryId, layer] of Object.entries(CATEGORY_DECISION_LAYERS)) {
    const inChain = new Set(layer.chain.flatMap((step) => step.slugs));
    const missing = tools
      .filter((tool) => tool.categoryId === categoryId)
      .map((tool) => tool.slug)
      .filter((slug) => !inChain.has(slug));
    if (missing.length) {
      problems.push(
        `${categoryId}: 这些工具从未出现在选型链里 —— ${missing.join(', ')}。` +
          '链是这一页的主答案，只出现在网格里的工具在流程里够不着',
      );
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

// ---------------------------------------------------------------------------
// 3. The two hard constraints: no duplication, no prices
// ---------------------------------------------------------------------------

test('P159: no decision layer text contains a price', () => {
  const problems: string[] = [];
  for (const [categoryId, layer] of Object.entries(CATEGORY_DECISION_LAYERS)) {
    for (const text of layerTexts(layer)) {
      if (/\$\s?\d/.test(text)) {
        problems.push(`${categoryId}: 决策层里出现了价格 —— "${text.slice(0, 100)}"`);
      }
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('P159: the decision layer does not copy topic benchmark table text', () => {
  const problems: string[] = [];
  for (const [categoryId, layer] of Object.entries(CATEGORY_DECISION_LAYERS)) {
    const texts = layerTexts(layer).map((s) => s.toLowerCase());
    for (const content of Object.values(TOPIC_BENCHMARK_CONTENT)) {
      for (const lang of ['en', 'zh'] as const) {
        for (const row of content[lang].rows) {
          for (const fragment of [row.segment, row.metric]) {
            const needle = fragment.toLowerCase();
            // 太短的片段（如单个词）容易误伤，只查有区分度的
            if (needle.length < 12) continue;
            for (const text of texts) {
              if (text.includes(needle)) {
                problems.push(`${categoryId}: 决策层抄了主题页基准表文本 "${fragment}"`);
              }
            }
          }
        }
      }
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

// ---------------------------------------------------------------------------
// 4. The i18n keys the component needs exist in both locales
// ---------------------------------------------------------------------------

test('P159: every decision-layer i18n key exists in en.json', () => {
  const missing = DECISION_LAYER_I18N_KEYS.filter((key) => !(key in en));
  assert.deepEqual(missing, [], `en.json 缺少：${missing.join(', ')}`);
});

test('P159: every decision-layer i18n key exists in zh.json', () => {
  const missing = DECISION_LAYER_I18N_KEYS.filter((key) => !(key in zh));
  assert.deepEqual(missing, [], `zh.json 缺少：${missing.join(', ')}`);
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
