import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { relatedTools } from '../src/data/internal-links.ts';
import { tools } from '../src/data/tools/index.ts';

test('SMOKE: relatedTools has 32 entries', () => {
  assert.equal(Object.keys(relatedTools).length, 32);
});