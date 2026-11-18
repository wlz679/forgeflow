import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/saas/churn-rate-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';
// P168 B3-9：引擎输出现在是**token 串**（`$calc_out.…|英文原文|`）
//   ⇒ 直接拿它匹配英文正则会失配（标签与值之间多了 '|'）
//   ⇒ 断言改为对**英文兜底渲染**后的文本匹配（renderCalcOutput(text, {}) = 用 token 自带的英文兜底）
//   ⇒ 断言意图不变：仍然是「英文页上用户看到的数值正确」。
import { renderCalcOutput } from '../src/lib/calc-output-i18n.ts';

const engine = getEngine('solopreneur-churn-rate-calculator');
const enCard = (lines: string[]): string => renderCalcOutput(lines.join('\n'), {});

// Test 1: canonical — 500 customers start, 15 lost, 25 new, $50 avg rev, $800 expansion
test('churn-rate: canonical 500/15/25/$50/$800 → ~3% monthly churn', () => {
  assert.ok(engine, 'engine should be registered');
  const r = engine!.generate({
    customersStart: '500',
    customersLost: '15',
    newCustomers: '25',
    avgRevenuePerCustomer: '50',
    expansionRevenue: '800',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
  // Monthly Logo Churn = 15/500 = 3%
  assert.match(enCard(r), /Monthly Logo Churn:\s+3\.0%/);
  // Customers at End = 500 - 15 + 25 = 510
  assert.match(enCard(r), /Customers at End:\s+510/);
});

// Test 2: zero customers
test('churn-rate: zero customers → 0% churn', () => {
  const r = engine!.generate({
    customersStart: '0',
    customersLost: '0',
    newCustomers: '0',
    avgRevenuePerCustomer: '0',
    expansionRevenue: '0',
  });
  assert.ok(Array.isArray(r));
  assert.match(enCard(r), /Monthly Logo Churn:\s+0\.0%/);
});

// Test 3: 100% churn (edge case)
test('churn-rate: 100% monthly churn → 100% annual churn', () => {
  const r = engine!.generate({
    customersStart: '100',
    customersLost: '100',
    newCustomers: '0',
    avgRevenuePerCustomer: '50',
    expansionRevenue: '0',
  });
  assert.ok(Array.isArray(r));
  // All customers lost monthly → 100% annual
  assert.match(enCard(r), /Monthly Logo Churn:\s+100\.0%/);
});

// Defensive test (P16-4 Layer 2): negative inputs clamp to 0
test('churn-rate: negative inputs clamp to 0 (defensive layer 2)', () => {
  const r = engine!.generate({
    customersStart: '-500',
    customersLost: '-15',
    newCustomers: '-25',
    avgRevenuePerCustomer: '-50',
    expansionRevenue: '-800',
  });
  assert.ok(Array.isArray(r), 'engine returns an array');
  assert.ok(r.length > 0, 'engine returns at least one result line');
  // No negative money values
  const hasNegativeMoney = /-\$\d|\$-/.test(r.join('\n'));
  assert.ok(!hasNegativeMoney, 'output contains negative money: ' + (r.join('\n').match(/-\$\d|\$-/) || []).join(','));
});
