import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/saas/mrr-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';
import { renderCalcOutput } from '../src/lib/calc-output-i18n.ts';
import { calcOutputTemplates } from '../src/lib/calc-output-templates.ts';

const engine = getEngine('solopreneur-mrr-calculator');

// P168 B3-7：引擎输出现在是**语义码 + 值**（token），英文原文在 token 的兜底段里
//   ⇒ 断言「用户看到的英文」必须**先渲染**（locale.en 模板 ⇒ 与英文页逐字一致）。
const TEMPLATES_EN = calcOutputTemplates('en', 'mrr');
function en(r: string[]): string[] {
  return r.map((s) => renderCalcOutput(s, TEMPLATES_EN));
}

// Test 1: canonical — 500 subs, $29/mo, 3% churn, $800 expansion, 100 new/mo
//   startingMRR = 500 * 29 = 14500
//   newMRR = 100 * 29 = 2900
//   churnedMRR = 500 * 0.03 * 29 = 435
test('mrr: canonical 500 subs × $29 → $14.5K starting MRR', () => {
  assert.ok(engine, 'engine should be registered');
  const r = engine!.generate({
    subscriberCount: '500',
    monthlyPrice: '29',
    monthlyChurnRate: '3',
    expansionMrr: '0',
    newSubsPerMonth: '100',
    contractionMrr: '0',
    reactivationMrr: '0',
  });
  const out = en(r);
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
  // Starting MRR = 500 * 29 = 14500
  assert.match(out[0], /Starting MRR:\s+\$14,500\.00/);
  // New MRR = 100 * 29 = 2900
  assert.match(out[0], /\+\$2,900\.00/);
});

// Test 2: zero subs
test('mrr: zero subs → $0 MRR', () => {
  const r = engine!.generate({
    subscriberCount: '0',
    monthlyPrice: '29',
    monthlyChurnRate: '3',
    expansionMrr: '0',
    newSubsPerMonth: '0',
    contractionMrr: '0',
    reactivationMrr: '0',
  });
  const out = en(r);
  assert.ok(Array.isArray(r));
  assert.match(out[0], /Starting MRR:\s+\$0\.00/);
});

// Test 3: zero churn
test('mrr: zero churn → no churn MRR', () => {
  const r = engine!.generate({
    subscriberCount: '500',
    monthlyPrice: '29',
    monthlyChurnRate: '0',
    expansionMrr: '0',
    newSubsPerMonth: '0',
    contractionMrr: '0',
    reactivationMrr: '0',
  });
  const out = en(r);
  assert.ok(Array.isArray(r));
  // 0% churn → no churn row
  assert.match(out[0], /No churn detected/);
});

// Defensive test (P16-4 Layer 2): negative inputs clamp to 0
test('mrr: negative inputs clamp to 0 (defensive layer 2)', () => {
  const r = engine!.generate({
    subscriberCount: '-500',
    monthlyPrice: '-29',
    monthlyChurnRate: '-3',
    expansionMrr: '-800',
    newSubsPerMonth: '-100',
    contractionMrr: '-150',
    reactivationMrr: '-100',
  });
  const out = en(r);
  assert.ok(Array.isArray(r), 'engine returns an array');
  assert.ok(r.length > 0, 'engine returns at least one result line');
  // No negative money values
  const hasNegativeMoney = /-\$\d|\$-/.test(out.join('\n'));
  assert.ok(!hasNegativeMoney, 'output contains negative money: ' + (out.join('\n').match(/-\$\d|\$-/) || []).join(','));
});
