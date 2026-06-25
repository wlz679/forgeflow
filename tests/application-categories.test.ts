import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { categoryIdToApplicationCategory, CATEGORY_TO_APPLICATION } from '../src/data/application-categories.ts';

test('all 6 categories mapped', () => {
  assert.equal(Object.keys(CATEGORY_TO_APPLICATION).length, 6);
});

test('A SaaS Metrics → BusinessApplication', () => {
  assert.equal(categoryIdToApplicationCategory('A'), 'BusinessApplication');
});

test('B AI Cost Tools → DeveloperApplication', () => {
  assert.equal(categoryIdToApplicationCategory('B'), 'DeveloperApplication');
});

test('C Valuation & Exit → FinanceApplication', () => {
  assert.equal(categoryIdToApplicationCategory('C'), 'FinanceApplication');
});

test('D Freelance Pricing → BusinessApplication', () => {
  assert.equal(categoryIdToApplicationCategory('D'), 'BusinessApplication');
});

test('E Cost & Efficiency → BusinessApplication', () => {
  assert.equal(categoryIdToApplicationCategory('E'), 'BusinessApplication');
});

test('F Investment & ROI → FinanceApplication', () => {
  assert.equal(categoryIdToApplicationCategory('F'), 'FinanceApplication');
});

test('unknown categoryId falls back to BusinessApplication', () => {
  assert.equal(categoryIdToApplicationCategory('Z'), 'BusinessApplication');
});
