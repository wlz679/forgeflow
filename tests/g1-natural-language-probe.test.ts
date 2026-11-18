#!/usr/bin/env node
// P168 B3-9 —— G1「含自然语言」判据的探针自检（source-only）。
// 守卫文件是 build-dep（顶部 skip-guard）⇒ 自检放那里会永远被跳过 ⇒ 真空绿。
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { hasNaturalLanguage, CALC_OUT_ABBREVIATIONS } from './_decision-support-fixture.ts';

test('G1 探针自检：纯数值/公式/缩写片段必须被判定为不含自然语言', () => {
  const exempt = ['{rev}/mo', '{from}% → {to}%', '{annual}', '  = LTV ÷ CAC', 'AOV', 'GPU', 'ROI', '📈 GRR / NRR', 'GRR {grr}%'];
  for (const v of exempt) {
    assert.equal(hasNaturalLanguage(v), false, '应豁免却没豁免：' + v);
  }
});

test('G1 探针自检：含自然语言的值不得被误豁免', () => {
  const must = ['Epoch', 'Annual Growth Rate', 'Gross Profit per Customer', 'Cash on Hand', 'Rule of 40', 'Net profit margin', 'Expected win rate', 'Avg Revenue / Customer', 'Annual Revenue Lost to Churn', 'Monthly Revenue Lost to Churn'];
  for (const v of must) {
    assert.equal(hasNaturalLanguage(v), true, '被误豁免（含自然语言却判成不含）：' + v);
  }
});

test('G1 探针自检：缩写表必须显式枚举（不得把全大写当缩写）', () => {
  assert.equal(CALC_OUT_ABBREVIATIONS.has('EPOCH'), false, 'EPOCH 不得进缩写表');
  assert.equal(CALC_OUT_ABBREVIATIONS.has('AOV'), true, 'AOV 应在缩写表');
});
