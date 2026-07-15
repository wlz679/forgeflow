import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/investment/sponsorship-rate-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';

const engine = getEngine('solopreneur-sponsorship-rate-calculator');

// Test 1: canonical — 10K downloads, 5K subs, 15K followers, newsletter
//   CPM newsletter = 40
//   podcastValue = (10000/1000) * 40 = 400
//   newsletterValue = (5000/1000) * 40 = 200
//   socialValue = (15000/1000) * 40 * 0.5 = 300
//   perPostValue = 400 + 200 + 300 = 900
test('sponsorship-rate: canonical 10K downloads/5K subs/15K followers newsletter', () => {
  assert.ok(engine, 'engine should be registered');
  const r = engine!.generate({
    monthlyDownloads: '10000',
    emailSubscribers: '5000',
    socialFollowers: '15000',
    contentType: 'newsletter',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
  assert.match(r[0], /Per Post Value:\s+\$900/);
  assert.match(r[0], /Annual Revenue:\s+\$43,200/);
});

// Test 2: zero audience
test('sponsorship-rate: zero audience → $0 revenue', () => {
  const r = engine!.generate({
    monthlyDownloads: '0',
    emailSubscribers: '0',
    socialFollowers: '0',
    contentType: 'newsletter',
  });
  assert.ok(Array.isArray(r));
  assert.match(r[0], /Per Post Value:\s+\$0/);
  assert.match(r[0], /Annual Revenue:\s+\$0/);
});

// Test 3: blog content uses $15 CPM
test('sponsorship-rate: blog content uses $15 CPM', () => {
  const r = engine!.generate({
    monthlyDownloads: '0',
    emailSubscribers: '10000',
    socialFollowers: '0',
    contentType: 'blog',
  });
  assert.ok(Array.isArray(r));
  // CPM blog = 15; perPost = (10000/1000)*15 = 150
  assert.match(r[0], /Per Post Value:\s+\$150/);
});

// Defensive test (P16-4 Layer 2): negative audience clamps to 0
test('sponsorship-rate: negative audience clamps to 0 (defensive layer 2)', () => {
  const r = engine!.generate({
    monthlyDownloads: '-10000',
    emailSubscribers: '-5000',
    socialFollowers: '-15000',
    contentType: 'newsletter',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
  for (const line of r) {
    assert.ok(!/NaN|Infinity/.test(line), `output contains NaN/Infinity: ${line}`);
  }
  const hasNegativeMoney = /-\$\d|\$-/.test(r.join('\n'));
  assert.ok(!hasNegativeMoney, 'output contains negative money: ' + r.join('\n').match(/-\$\d|\$-/));
});
