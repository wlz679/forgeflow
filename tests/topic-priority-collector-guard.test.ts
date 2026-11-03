#!/usr/bin/env node
// P166 —— **收集器能力自检**（source-only）。
//
// 为什么单独一个套件
// ------------------
// 「守卫全绿」≠「守卫真的在测」。P165 实测过一个只扫一层的 @type 收集器：它把
// **30/30 页**判成「缺 ItemList」（ItemList 嵌在 CollectionPage.hasPart 里）⇒
// 那个守卫当时其实是**恒红**，只是没人跑。而这一批的收集器（取页面里的新形态
// 表格）如果只认自己写的形态，同样会恒红或恒绿。
//
// ⇒ **收集器的能力本身就是被测对象**：这里造合成样本，断言它看得见。
// 这个套件是 source-only（纯逻辑、不需要 build）⇒ 每次 pnpm check 都会跑它。
//
// Build dependency: none (source-only).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import { scopeAfterHeading, extractTable, stepNumberOf, stripTags } from './_topic-priority-collector.ts';

const SAMPLE =
  '<section class="mb-8">' +
  '<h2 class="text-xl font-bold text-gray-900 mb-3">What to fix first</h2>' +
  '<p class="text-sm text-gray-700">Intro text.</p>' +
  '<div class="overflow-x-auto">' +
  '<table class="w-full text-sm border-collapse">' +
  '<thead class="bg-gray-100"><tr>' +
  '<th class="border border-gray-300 px-3 py-2">Order</th>' +
  '<th class="border border-gray-300 px-3 py-2">Metric</th>' +
  '<th class="border border-gray-300 px-3 py-2">Fix this first</th>' +
  '<th class="border border-gray-300 px-3 py-2">Also moves</th>' +
  '<th class="border border-gray-300 px-3 py-2">Watch out</th>' +
  '</tr></thead>' +
  '<tbody><tr class="bg-white">' +
  '<td class="border border-gray-300 px-3 py-2">1</td>' +
  '<td class="border border-gray-300 px-3 py-2">Blended CAC</td>' +
  '<td class="border border-gray-300 px-3 py-2">Cut blended CAC</td>' +
  '<td class="border border-gray-300 px-3 py-2">Payback months</td>' +
  '<td class="border border-gray-300 px-3 py-2">Mix shift worsens the average</td>' +
  '</tr></tbody></table></div></section>';

test('P166: 收集器看得见「带属性的标题 + 嵌套表格」的样本', () => {
  const scope = scopeAfterHeading(SAMPLE, 'What to fix first');
  assert.ok(scope.length > 0, '收集器连标题都没找到 —— 它只认自己写的形态？');

  const table = extractTable(scope);
  assert.equal(table.head.length, 1, '样本里有 1 行表头，实际 ' + table.head.length);
  assert.equal(table.body.length, 1, '样本里有 1 行数据行，实际 ' + table.body.length);
  assert.equal(table.body[0].length, 5, '数据行应有 5 列，实际 ' + table.body[0].length);
  assert.equal(table.body[0][1], 'Blended CAC', '单元格文本应被正确抽出');
  assert.equal(table.head[0][0], 'Order', '表头文本应被正确抽出');
});

test('P166: 收集器的作用域止于下一个 h2（不会把下一段算进来）', () => {
  const two =
    '<h2 class="x">What to fix first</h2><table><tbody><tr><td>a</td></tr></tbody></table>' +
    '<h2 class="x">Sources &amp; methodology</h2><p>later</p>';
  const scope = scopeAfterHeading(two, 'What to fix first');
  assert.equal(scope.indexOf('<h2', 1), -1, '作用域里不该出现第二个 h2');
  assert.ok(scope.indexOf('later') === -1, '作用域不该包含下一段的内容');
  assert.equal(extractTable(scope).body.length, 1, '作用域里的表仍应可见');
});

test('P166: 标题定位是 h2 精确匹配（正文里出现同样几个字不算命中）', () => {
  const html =
    '<p class="prose">Ask yourself what to fix first in your funnel.</p>' +
    '<h2 class="x">How to use these numbers</h2><p>body</p>';
  assert.equal(scopeAfterHeading(html, 'What to fix first'), '', '正文里的同名字串不该被当成区块标题');
  assert.ok(scopeAfterHeading(html, 'How to use these numbers').length > 0, '真正的 h2 标题应能定位');
});

test('P166: 步骤编号解析同时认 en 的 "Step N" 与 zh 的 "第 N 步"', () => {
  assert.equal(stepNumberOf('Step 3'), 3);
  assert.equal(stepNumberOf('第 3 步'), 3);
  assert.equal(stepNumberOf('Step 12'), 12);
  assert.equal(stepNumberOf('第 12 步'), 12);
  assert.equal(stepNumberOf('Blended CAC'), null, '不是步骤标签时必须返回 null');
});

test('P166: stripTags 会把标签去掉并把实体还原', () => {
  assert.equal(stripTags('<td class="x">Cost &amp; margin</td>'), 'Cost & margin');
  assert.equal(stripTags('<p>a</p><p>b</p>'), 'a b');
});
