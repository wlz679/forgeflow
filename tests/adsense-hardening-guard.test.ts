#!/usr/bin/env node
// P168 —— AdSense「低价值内容」整改的**源码级守卫**（source-only，不依赖构建产物）。
//
// 这一批修的是 4 个仍然留在**线上**的硬伤（取证见
// docs/superpowers/specs/2026-10-27-p155-adsense-low-value-content-and-pricing-bot-diagnosis.md）：
//   ① 30 个分类页把「最近审核」写死成一个固定日期（组件里硬编码，4 个多月没变）
//   ② contact 页是空壳（en 157 字符 / zh 76 字符）
//   ③ terms 页太薄（en 719 字符 / zh 229 字符）
//   ④ B 类 FAQ 手写 GPT-4o 单价 + 一个过期日期（价格真值源在 ai-pricing.json）
//
// ⭐ 判定口径：这类日期**只能派生，不能写死**
//   写死的值会随时间变成谎话，而「页面上的日期在骗人」正是审核员判定
//   「低价值内容」时最先看到的东西。
//   ⇒ 断言落在「这个值是不是从真值源派生出来的」，而不是「这个值等于多少」
//      —— 后者一改内容就要改守卫，改的过程中最容易漏。
//
// ⭐ 为什么真值源放在 src/lib/content-review-dates.ts 而不是 tests/ 里
//   页面与守卫必须读**同一个**真值源。否则会出现「体检工具报 0 个问题、
//   守卫却在红」的经典错位：两边各写一份规则 ⇒ 两边必然漂移。

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { stripComments } from './build-dep-suites.mjs';
import { resolveLiveTokens, liveModel, formatPrice, liveDatasetDate } from '../src/lib/live-price.ts';
import { getCategoryReviewDates, getToolReviewDates } from '../src/lib/content-review-dates.ts';
import { categories } from '../src/data/categories.ts';
import { buildReviewDates } from '../scripts/codegen-review-dates.mjs';
import { tools } from '../src/data/tools/index.ts';

const ROOT = process.cwd();

/** 15 个分类页（slug）—— 与 src/data/categories.ts 一一对应 */
const CATEGORY_SLUGS = [
  'ai-cost-tools', 'cost-efficiency', 'customer-support', 'freelance-pricing',
  'hiring-team', 'investment-roi', 'knowledge', 'legal-compliance',
  'marketing-analytics', 'operations-inventory', 'product-analytics',
  'retention', 'saas-metrics', 'sales', 'valuation-exit',
];

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

/** 取 .astro 的 frontmatter（--- ... ---）代码块 */
function frontmatter(rel: string): string {
  const m = read(rel).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(m, rel + ' 缺少 frontmatter');
  return m![1];
}

/** frontmatter 代码（去掉注释）—— 注释里提到日期不算「写死日期」 */
function code(rel: string): string {
  return stripComments(frontmatter(rel));
}

function locale(lang: 'en' | 'zh'): Record<string, string> {
  return JSON.parse(read('src/i18n/locales/' + lang + '.json').replace(/^\uFEFF/, ''));
}

function namespaceText(loc: Record<string, string>, prefix: string): string {
  return Object.keys(loc)
    .filter((k) => k.startsWith(prefix))
    .map((k) => loc[k])
    .join(' ');
}

/**
 * 取 <CategoryHero ... /> 元素的属性块。
 *
 * ⭐ 为什么必须限定在这个元素里：同一份分类页里还有 <CategoryDecisionLayer>、
 *   <CategoryFaq>、<CategoryGuides> 等组件，**它们也写 categoryId={CATEGORY_ID}**。
 *   ⇒ 只问「这个文件里出现过 categoryId={CATEGORY_ID} 吗」会被同页其它组件顶替
 *   ⇒ 变异台子实测：删掉 CategoryHero 的那一行，守卫仍然是绿的（漏检）。
 */
function categoryHeroProps(rel: string): string {
  const m = read(rel).match(/<CategoryHero\b([\s\S]*?)\/>/);
  return m ? m[1] : '';
}

function countWords(text: string): number {
  return (text.match(/[A-Za-z0-9][A-Za-z0-9'\$%.,-]*/g) || []).length;
}

function countCjk(text: string): number {
  return (text.match(/[\u4e00-\u9fff]/g) || []).length;
}

test('P168 生成物不许漂移：review-dates.json 与散文 frontmatter 一致', () => {
  const expected = buildReviewDates(ROOT);
  const actual = JSON.parse(read('src/data/review-dates.json').replace(/^\uFEFF/, ''));
  assert.deepEqual(actual.categories, expected.categories, '分类日期与散文 frontmatter 不一致');
  assert.deepEqual(actual.tools, expected.tools, '工具日期与散文 frontmatter 不一致');
  assert.equal(actual.siteDate, expected.siteDate, '全站日期与散文 frontmatter 不一致');
});

test('P168 共享真值源：content-review-dates 模块存在并导出全部派生函数', () => {
  const rel = 'src/lib/content-review-dates.ts';
  assert.ok(existsSync(join(ROOT, rel)), '缺少 ' + rel);
  const src = read(rel);
  const fns = [
    'readProseReviewRecords',
    'getToolReviewDates',
    'getCategoryReviewDates',
    'getCategoryReviewDate',
    'getSiteReviewDate',
  ];
  for (const fn of fns) {
    assert.match(src, new RegExp('export function ' + fn + '\\b'), '缺少导出：' + fn);
  }
});

test('P168 分类页日期：CategoryHero 走共享真值源，且不再自己从 ToolMeta 派生', () => {
  const rel = 'src/components/CategoryHero.astro';
  assert.match(code(rel), /getCategoryReviewDate/, 'CategoryHero 没有调用 getCategoryReviewDate');
  assert.match(code(rel), /from '\.\.\/lib\/content-review-dates'/, 'CategoryHero 没有 import 共享真值源');
  assert.doesNotMatch(code(rel), /dataReviewedAt/, 'CategoryHero 仍在本地从 ToolMeta 派生日期（与工具页两套口径）');
});

test('P168 分类页日期：15 个分类页与 CategoryHero 的 frontmatter 里没有写死的 ISO 日期', () => {
  const files = CATEGORY_SLUGS.map((s) => 'src/pages/[lang]/' + s + '.astro').concat([
    'src/components/CategoryHero.astro',
  ]);
  const problems: string[] = [];
  for (const f of files) {
    const hits = code(f).match(/\b\d{4}-\d{2}-\d{2}\b/g) || [];
    if (hits.length) problems.push(f + ' → ' + hits.join(', '));
  }
  assert.deepEqual(problems, [], '分类页写了死的日期：' + problems.join(' | '));
});

test('P168 分类页日期：15 个分类页都把 categoryId 传给 CategoryHero', () => {
  const missing = CATEGORY_SLUGS.filter(
    (s) => !/categoryId=\{CATEGORY_ID\}/.test(categoryHeroProps('src/pages/[lang]/' + s + '.astro')),
  );
  assert.deepEqual(
    missing,
    [],
    '这些分类页没给 <CategoryHero> 传 categoryId（派生拿不到分类 → 日期渲染不出来）：' + missing.join(', '),
  );
});

test('P168 about/terms：dateModified 必须是派生值，不是写死的字面量', () => {
  for (const f of ['src/pages/[lang]/about.astro', 'src/pages/[lang]/terms.astro']) {
    const c = code(f);
    assert.match(c, /dateModified:\s*getSiteReviewDate\(\)/, f + ' 的 dateModified 不是派生值');
    assert.doesNotMatch(c, /dateModified:\s*['"][^'"]+['"]/, f + ' 的 dateModified 仍是写死的字面量');
  }
});

test('P168 B 类 FAQ：文案里没有手写价格，也没有手写日期', () => {
  for (const lang of ['en', 'zh'] as const) {
    const v = locale(lang)['category.B.faq.q1.a'];
    assert.ok(v, lang + ' 缺少 category.B.faq.q1.a');
    assert.doesNotMatch(v, /\$\s?\d/, lang + ' 的 B 类 FAQ 仍有手写价格');
    assert.doesNotMatch(v, /\b\d{4}-\d{2}-\d{2}\b/, lang + ' 的 B 类 FAQ 仍有手写日期');
  }
});

test('P168 B 类 FAQ：解析后的价格与日期 == 价格数据集真值', () => {
  const model = liveModel('openai', 'gpt-4o');
  const wantIn = '$' + formatPrice(model.inputPerMillion);
  const wantOut = '$' + formatPrice(model.outputPerMillion);
  for (const lang of ['en', 'zh'] as const) {
    const resolved = resolveLiveTokens(locale(lang)['category.B.faq.q1.a']);
    assert.ok(resolved.includes(wantIn), lang + ' 解析后没有输入价 ' + wantIn + '：' + resolved);
    assert.ok(resolved.includes(wantOut), lang + ' 解析后没有输出价 ' + wantOut + '：' + resolved);
    assert.ok(resolved.includes(liveDatasetDate()), lang + ' 解析后没有数据集日期 ' + liveDatasetDate() + '：' + resolved);
    assert.doesNotMatch(resolved, /\{\{/, lang + ' 解析后仍残留未替换的 token');
  }
});

test('P168 旧日期字面量不得复现：src/pages 与 src/components 里不能再出现 2026-06-22', () => {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const rel = dir + '/' + e.name;
      if (e.isDirectory()) walk(rel);
      else if (/\.(astro|ts|tsx|js|mjs)$/.test(e.name)) files.push(rel);
    }
  };
  walk('src/pages');
  walk('src/components');
  const problems = files.filter((f) => stripComments(read(f)).includes('2026-06-22'));
  assert.deepEqual(problems, [], '旧的写死日期又回来了：' + problems.join(', '));
});

test('P168 contact 页：英文文案量达标（不是空壳页）', () => {
  const words = countWords(namespaceText(locale('en'), 'contact.'));
  assert.ok(words >= 400, 'contact en 文案只有 ' + words + ' 词（要求 ≥ 400）');
});

test('P168 contact 页：中文文案量达标（不是空壳页）', () => {
  const chars = countCjk(namespaceText(locale('zh'), 'contact.'));
  assert.ok(chars >= 600, 'contact zh 文案只有 ' + chars + ' 个汉字（要求 ≥ 600）');
});

test('P168 terms 页：英文文案量达标', () => {
  const words = countWords(namespaceText(locale('en'), 'legal.terms.'));
  assert.ok(words >= 350, 'legal.terms en 文案只有 ' + words + ' 词（要求 ≥ 350）');
});

test('P168 terms 页：中文文案量达标', () => {
  const chars = countCjk(namespaceText(locale('zh'), 'legal.terms.'));
  assert.ok(chars >= 550, 'legal.terms zh 文案只有 ' + chars + ' 个汉字（要求 ≥ 550）');
});

test('P168 派生日期：15 个分类都有合法日期，且不早于该分类 ToolMeta 里的最新日期', () => {
  const dates = getCategoryReviewDates();
  const problems: string[] = [];
  for (const c of categories) {
    const d = dates[c.id];
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      problems.push(c.id + ' 缺合法日期');
      continue;
    }
    const metaMax = tools
      .filter((t) => t.categoryId === c.id)
      .reduce((m, t) => (t.dataReviewedAt > m ? t.dataReviewedAt : m), '');
    if (d < metaMax) {
      problems.push(c.id + ' 派生日期 ' + d + ' 早于 ToolMeta 的 ' + metaMax);
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 派生日期：每个工具都有合法日期，且不早于它自己的 ToolMeta 日期', () => {
  const map = getToolReviewDates();
  const problems: string[] = [];
  for (const t of tools) {
    const d = map.get(t.slug);
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      problems.push(t.slug + ' 缺合法日期');
      continue;
    }
    if (d < t.dataReviewedAt) {
      problems.push(t.slug + ' 派生日期 ' + d + ' 早于 ToolMeta 的 ' + t.dataReviewedAt);
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});
