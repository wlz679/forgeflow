#!/usr/bin/env node
// P168 —— 「最近审核」与「文案厚度」的**产物级**守卫（build-dep）。
//
// 为什么源码级守卫不够
// --------------------
// 源码级守卫（adsense-hardening-guard）能证明「日期是派生的」「文案够厚」，
// 但证明不了**页面真的把派生值渲染出来了** —— 比如忘了给 <CategoryHero>
// 传 categoryId（源码级断言查的是传参，渲染层仍可能什么都不显示）。
// ⇒ 本守卫读构建产物，量的是「审核员打开页面看到的东西」。
//
// 它守的 4 件事
// ------------
//   ① 30 个分类页显示的「最近审核」== 派生出来的分类日期（en + zh）
//   ② contact / terms 的成文厚度达标（en 词数 / zh 汉字数）
//   ③ about / terms 的 JSON-LD dateModified == 派生的全站日期
//   ④ 本批页面里没有未解析的 live token（价格必须是数据集真值）
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern)

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { categories } from '../src/data/categories.ts';
import { getCategoryReviewDate, getSiteReviewDate } from '../src/lib/content-review-dates.ts';
import { liveModel, formatPrice, liveDatasetDate } from '../src/lib/live-price.ts';

const ROOT = process.cwd();
const LANGS = ['en', 'zh'];

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function page(rel: string): string {
  const f = join(ROOT, 'dist', rel);
  assert.ok(existsSync(f), '产物缺失（先跑 pnpm build）：' + rel);
  return readFileSync(f, 'utf8');
}

function mainText(html: string): string {
  const m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  return (m ? m[1] : html).replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');
}

function wordCount(html: string): number {
  return (mainText(html).match(/[A-Za-z0-9][A-Za-z0-9'\$%.,-]*/g) || []).length;
}

function cjkCount(html: string): number {
  return (mainText(html).match(/[\u4e00-\u9fff]/g) || []).length;
}

test('P168 产物：30 个分类页显示的「最近审核」== 派生出来的分类日期', () => {
  const problems: string[] = [];
  for (const lang of LANGS) {
    for (const c of categories) {
      const rel = lang + '/' + c.slug + '/index.html';
      const f = join(ROOT, 'dist', rel);
      if (!existsSync(f)) {
        problems.push(rel + ' 产物缺失');
        continue;
      }
      const html = readFileSync(f, 'utf8');
      const label = lang === 'zh' ? '最近审核' : 'Last reviewed';
      const found = [
        ...html.matchAll(new RegExp(label + '[^0-9]{0,60}(\\d{4}-\\d{2}-\\d{2})', 'g')),
      ].map((m) => m[1]);
      const want = getCategoryReviewDate(c.id);
      if (found.length === 0) problems.push(rel + ' 页面上找不到「最近审核」日期');
      else if (!found.includes(want)) {
        problems.push(rel + ' 显示 ' + found.join('/') + '，派生值是 ' + want);
      }
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 产物：contact 页英文成文厚度达标', () => {
  const n = wordCount(page('en/contact/index.html'));
  assert.ok(n >= 450, 'contact en 产物只有 ' + n + ' 词（要求 ≥ 450）');
});

test('P168 产物：contact 页中文成文厚度达标', () => {
  const n = cjkCount(page('zh/contact/index.html'));
  assert.ok(n >= 700, 'contact zh 产物只有 ' + n + ' 个汉字（要求 ≥ 700）');
});

test('P168 产物：terms 页英文成文厚度达标', () => {
  const n = wordCount(page('en/terms/index.html'));
  assert.ok(n >= 350, 'terms en 产物只有 ' + n + ' 词（要求 ≥ 350）');
});

test('P168 产物：terms 页中文成文厚度达标', () => {
  const n = cjkCount(page('zh/terms/index.html'));
  assert.ok(n >= 550, 'terms zh 产物只有 ' + n + ' 个汉字（要求 ≥ 550）');
});

test('P168 产物：about / terms 的 JSON-LD dateModified == 派生的全站日期', () => {
  const want = getSiteReviewDate();
  const problems: string[] = [];
  for (const lang of LANGS) {
    for (const p of ['about', 'terms']) {
      const rel = lang + '/' + p + '/index.html';
      const html = page(rel);
      const m = html.match(/"dateModified":"([0-9-]+)"/);
      if (!m) problems.push(rel + ' 没有 dateModified');
      else if (m[1] !== want) problems.push(rel + ' 是 ' + m[1] + '，派生值是 ' + want);
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 产物：本批页面里没有未解析的 live token', () => {
  const problems: string[] = [];
  for (const lang of LANGS) {
    for (const p of [...categories.map((c) => c.slug), 'contact', 'terms', 'about']) {
      const rel = lang + '/' + p + '/index.html';
      if (!existsSync(join(ROOT, 'dist', rel))) continue;
      const html = readFileSync(join(ROOT, 'dist', rel), 'utf8');
      if (html.includes('{{live')) problems.push(rel);
    }
  }
  assert.deepEqual(problems, [], '这些页面把 token 原样发到了线上：' + problems.join(', '));
});

test('P168 产物：B 类 FAQ 显示的是价格数据集真值', () => {
  const model = liveModel('openai', 'gpt-4o');
  const wantIn = '$' + formatPrice(model.inputPerMillion);
  const wantOut = '$' + formatPrice(model.outputPerMillion);
  for (const lang of LANGS) {
    const rel = lang + '/ai-cost-tools/index.html';
    const html = page(rel);
    assert.ok(html.includes(wantIn), rel + ' 没有输入价 ' + wantIn);
    assert.ok(html.includes(wantOut), rel + ' 没有输出价 ' + wantOut);
    assert.ok(html.includes(liveDatasetDate()), rel + ' 没有数据集日期 ' + liveDatasetDate());
  }
});
