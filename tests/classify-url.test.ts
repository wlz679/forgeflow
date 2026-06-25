import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { classifyUrl } from '../scripts/classify-url.ts';

const SITE = 'https://forgeflowkit.com';

test('home page (en) gets priority 1.0 daily', () => {
  const c = classifyUrl(`${SITE}/en/`);
  assert.equal(c.kind, 'home');
  assert.equal(c.priority, 1.0);
  assert.equal(c.changefreq, 'daily');
});

test('home page (zh) gets priority 1.0 daily', () => {
  const c = classifyUrl(`${SITE}/zh/`);
  assert.equal(c.kind, 'home');
  assert.equal(c.priority, 1.0);
});

test('tool page gets priority 0.9 monthly', () => {
  const c = classifyUrl(`${SITE}/en/mrr-calculator/`);
  assert.equal(c.kind, 'tool');
  assert.equal(c.priority, 0.9);
  assert.equal(c.changefreq, 'monthly');
});

test('blog post gets priority 0.7 weekly', () => {
  const c = classifyUrl(`${SITE}/en/blog/best-mrr-calculator/`);
  assert.equal(c.kind, 'blog');
  assert.equal(c.priority, 0.7);
  assert.equal(c.changefreq, 'weekly');
});

test('blog index gets priority 0.7 weekly', () => {
  const c = classifyUrl(`${SITE}/en/blog/`);
  assert.equal(c.kind, 'blog');
  assert.equal(c.priority, 0.7);
});

test('about page gets priority 0.5 monthly', () => {
  const c = classifyUrl(`${SITE}/en/about/`);
  assert.equal(c.kind, 'static');
  assert.equal(c.priority, 0.5);
  assert.equal(c.changefreq, 'monthly');
});

test('contact page gets priority 0.5 monthly', () => {
  const c = classifyUrl(`${SITE}/en/contact/`);
  assert.equal(c.kind, 'static');
  assert.equal(c.priority, 0.5);
});

test('privacy-policy is static', () => {
  const c = classifyUrl(`${SITE}/en/privacy-policy/`);
  assert.equal(c.kind, 'static');
});

test('terms is static', () => {
  const c = classifyUrl(`${SITE}/en/terms/`);
  assert.equal(c.kind, 'static');
});
