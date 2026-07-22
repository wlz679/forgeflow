// P53b Task 17 — Agent D P1 D1: zero-coverage engine gets 3 generate() tests.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/ai-cost/openai-token-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';

const SLUG = 'solopreneur-openai-token-calculator';

test('openai-token: engine registered + generate emits non-empty output', () => {
  const engine = getEngine(SLUG);
  assert.ok(engine, `engine ${SLUG} should be registered`);
  const out = engine!.generate({
    models: 'gpt-5-nano',
    inputTokens: '1000',
    outputTokens: '500',
    requestsPerDay: '100',
    pricingMode: 'realtime',
    cacheHitRate: '0',
    growthRate: '0',
    projectionMonths: '3',
  });
  assert.ok(Array.isArray(out));
  assert.ok(out.length > 0, 'generate returns at least one result line');
});

test('openai-token: output mentions OpenAI/GPT (provider identifier)', () => {
  const engine = getEngine(SLUG)!;
  const out = engine.generate({
    models: 'gpt-5-nano',
    inputTokens: '1000',
    outputTokens: '500',
    requestsPerDay: '100',
    pricingMode: 'realtime',
    cacheHitRate: '0',
    growthRate: '0',
    projectionMonths: '3',
  });
  const all = out.join('\n');
  assert.ok(/OpenAI|GPT/i.test(all), 'output should mention OpenAI or GPT');
});

test('openai-token: multi-model compare mentions >=2 models (cheapest surfaced)', () => {
  // Per Agent D P1 D1: cheapest model (GPT 5 Nano) should surface in comparison.
  const engine = getEngine(SLUG)!;
  const out = engine.generate({
    models: 'gpt-5-nano,gpt-5-mini,gpt-4o',
    inputTokens: '1000',
    outputTokens: '500',
    requestsPerDay: '100',
    pricingMode: 'realtime',
    cacheHitRate: '0',
    growthRate: '0',
    projectionMonths: '3',
  });
  assert.ok(out.length > 0, 'multi-model compare returns output');
  const all = out.join('\n');
  // Engine strips dots from display names (e.g. "GPT 5Nano", "GPT 5Mini", "GPT 4o").
  const mentions = ['GPT 5Nano', 'GPT 5Mini', 'GPT 4o']
    .filter(name => all.includes(name));
  assert.ok(mentions.length >= 2, `multi-model compare should mention >=2 models; got: ${mentions.join(', ')}`);
});
