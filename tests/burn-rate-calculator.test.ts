import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/saas/burn-rate-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';
// ⭐ P168 B3-8：引擎输出现在是**token 串**（`$calc_out.…|英文原文|`）
//   ⇒ 直接拿它匹配英文正则会失配 ⇒ 断言改为对**英文兜底渲染**后的文本匹配
//   ⇒ 断言意图不变：仍然是「英文页上用户看到的数值正确」。
import { renderCalcOutput } from '../src/lib/calc-output-i18n.ts';

const engine = getEngine('solopreneur-burn-rate-calculator');
const enCard = (lines: string[]): string => renderCalcOutput(lines.join('\n'), {});

// Test 1: canonical — $5K rev, $8K team, $500 infra, $2K marketing, $1.5K ops, $50K cash
test('burn-rate: canonical $5K rev / $12K expenses / $50K cash', () => {
  assert.ok(engine, 'engine should be registered');
  const r = engine!.generate({
    monthlyRevenue: '5000',
    netNewRevenue: '3000',
    teamCost: '8000',
    infraCost: '500',
    marketingCost: '2000',
    opsCost: '1500',
    currentCash: '50000',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
  // Gross Burn = 8000+500+2000+1500 = 12000
  assert.match(enCard(r), /Gross Burn:\s+\$12,000/);
  // Net Burn = 12000 - 5000 = 7000
  assert.match(enCard(r), /Net Burn:\s+\$7,000/);
});

// Test 2: zero revenue
test('burn-rate: zero revenue → gross = net burn', () => {
  const r = engine!.generate({
    monthlyRevenue: '0',
    netNewRevenue: '0',
    teamCost: '8000',
    infraCost: '500',
    marketingCost: '2000',
    opsCost: '1500',
    currentCash: '50000',
  });
  assert.ok(Array.isArray(r));
  // No revenue: Net Burn = Gross Burn = 12000
  assert.match(enCard(r), /Net Burn:\s+\$12,000/);
});

// Test 3: zero cash
test('burn-rate: zero cash → no runway estimate', () => {
  const r = engine!.generate({
    monthlyRevenue: '5000',
    netNewRevenue: '0',
    teamCost: '8000',
    infraCost: '500',
    marketingCost: '2000',
    opsCost: '1500',
    currentCash: '0',
  });
  assert.ok(Array.isArray(r));
  // No cash → "No cash reserve" message
  assert.match(enCard(r), /No cash reserve/);
});

// Defensive test (P16-4 Layer 2): negative inputs clamp to 0
test('burn-rate: negative inputs clamp to 0 (defensive layer 2)', () => {
  const r = engine!.generate({
    monthlyRevenue: '-5000',
    netNewRevenue: '-3000',
    teamCost: '-8000',
    infraCost: '-500',
    marketingCost: '-2000',
    opsCost: '-1500',
    currentCash: '-50000',
  });
  assert.ok(Array.isArray(r), 'engine returns an array');
  assert.ok(r.length > 0, 'engine returns at least one result line');
  // No negative money values
  const hasNegativeMoney = /-\$\d|\$-/.test(r.join('\n'));
  assert.ok(!hasNegativeMoney, 'output contains negative money: ' + (r.join('\n').match(/-\$\d|\$-/) || []).join(','));
});
