// P53b Task 17 — Agent D P1 D1: zero-coverage engine gets 3 generate() tests.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/ai-cost/gemini-api-cost-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';

const SLUG = 'solopreneur-gemini-api-cost-calculator';

test('gemini-api-cost: engine registered + generate emits non-empty output', () => {
  const engine = getEngine(SLUG);
  assert.ok(engine, `engine ${SLUG} should be registered`);
  const out = engine!.generate({
    models: 'gemini-1.5-flash',
    inputTokens: '1000',
    outputTokens: '500',
    requestsPerDay: '100',
    pricingMode: 'realtime',
    cacheReadHitRate: '0',
    growthRate: '0',
    projectionMonths: '3',
  });
  assert.ok(Array.isArray(out));
  assert.ok(out.length > 0, 'generate returns at least one result line');
});

test('gemini-api-cost: output mentions Gemini/Google (provider identifier)', () => {
  const engine = getEngine(SLUG)!;
  const out = engine.generate({
    models: 'gemini-1.5-flash',
    inputTokens: '1000',
    outputTokens: '500',
    requestsPerDay: '100',
    pricingMode: 'realtime',
    cacheReadHitRate: '0',
    growthRate: '0',
    projectionMonths: '3',
  });
  const all = out.join('\n');
  assert.ok(/Gemini|Google/i.test(all), 'output should mention Gemini or Google');
});

test('gemini-api-cost: multi-model compare mentions >=2 models (cheapest surfaced)', () => {
  // Per Agent D P1 D1: cheapest model (Gemini 1.5 Flash) should surface in comparison.
  const engine = getEngine(SLUG)!;
  const out = engine.generate({
    models: 'gemini-3.5-flash,gemini-3.1-pro,gemini-1.5-flash',
    inputTokens: '1000',
    outputTokens: '500',
    requestsPerDay: '100',
    pricingMode: 'realtime',
    cacheReadHitRate: '0',
    growthRate: '0',
    projectionMonths: '3',
  });
  assert.ok(out.length > 0, 'multi-model compare returns output');
  const all = out.join('\n');
  // Engine strips dots from display names (e.g. "Gemini 3.5Flash", "Gemini 3.1 Pro").
  const mentions = ['Gemini 3.5Flash', 'Gemini 3.1 Pro', 'Gemini 1.5 Flash']
    .filter(name => all.includes(name));
  assert.ok(mentions.length >= 2, `multi-model compare should mention >=2 models; got: ${mentions.join(', ')}`);
});
