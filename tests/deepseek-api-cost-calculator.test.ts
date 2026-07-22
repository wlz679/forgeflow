// P53b Task 17 — Agent D P1 D1: zero-coverage engine gets 3 generate() tests.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/ai-cost/deepseek-api-cost-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';

const SLUG = 'solopreneur-deepseek-api-cost-calculator';

test('deepseek-api-cost: engine registered + generate emits non-empty output', () => {
  const engine = getEngine(SLUG);
  assert.ok(engine, `engine ${SLUG} should be registered`);
  const out = engine!.generate({
    models: 'deepseek-v4-flash',
    inputTokens: '1000',
    outputTokens: '500',
    requestsPerDay: '100',
    cacheReadHitRate: '0',
    growthRate: '0',
    projectionMonths: '3',
  });
  assert.ok(Array.isArray(out));
  assert.ok(out.length > 0, 'generate returns at least one result line');
});

test('deepseek-api-cost: output mentions DeepSeek (provider identifier)', () => {
  const engine = getEngine(SLUG)!;
  const out = engine.generate({
    models: 'deepseek-v4-flash',
    inputTokens: '1000',
    outputTokens: '500',
    requestsPerDay: '100',
    cacheReadHitRate: '0',
    growthRate: '0',
    projectionMonths: '3',
  });
  const all = out.join('\n');
  assert.ok(/DeepSeek/i.test(all), 'output should mention DeepSeek');
});

test('deepseek-api-cost: multi-model compare mentions >=2 models (cheapest surfaced)', () => {
  // Per Agent D P1 D1: cheapest model (V4 Flash) should surface in comparison.
  const engine = getEngine(SLUG)!;
  const out = engine.generate({
    models: 'deepseek-v4-flash,deepseek-v4-pro-promo,deepseek-r1',
    inputTokens: '1000',
    outputTokens: '500',
    requestsPerDay: '100',
    cacheReadHitRate: '0',
    growthRate: '0',
    projectionMonths: '3',
  });
  assert.ok(out.length > 0, 'multi-model compare returns output');
  const all = out.join('\n');
  // Engine strips dots from display names (e.g. "Deepseek V4Flash", "Deepseek R1").
  const mentions = ['Deepseek V4Flash', 'V4 Pro (75% Promo)', 'Deepseek R1']
    .filter(name => all.includes(name));
  assert.ok(mentions.length >= 2, `multi-model compare should mention >=2 models; got: ${mentions.join(', ')}`);
});
