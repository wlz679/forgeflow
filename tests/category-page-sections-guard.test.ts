#!/usr/bin/env node
// P167 —— 分类页「三区块齐平」守卫（build-dep）。
//
// 为什么需要这个守卫
// ------------------
// P167 取证：全站 15 个分类页分成两种形态 ——
//   · 6 个「full」页：介绍段 + FAQ + 分类指南
//   · 9 个「lean」页：这三块**都没有**（且 locale 键也不存在）
// ⇒ 全站唯一一处「同一类页面模板不一致」。P167 把 9 页补成同形，
//   本守卫钉死「每个分类页都有这三块、且条数与 locale 定义一致」，
//   防止以后新加分类页又落回 lean 形态。
//
// ⚠️ 与既有 `category-page-schema-guard` 的分工：那个守的是**结构化数据**
//   （CollectionPage + BreadcrumbList + ItemList）；本守卫守的是**页面区块**
//   （介绍段 / FAQ / 分类指南）—— 两者是不同的维度，缺一不可。
//
// ⚠️ 期望值不是「FAQ 恰好 5 条」：**条数本来就随分类变**
//   （实测 A-E 是 5 条、F 是 7 条）⇒ 把 5 写死会误杀 F。
//   ⇒ 正确的判据是「**页面渲染的条数 == locale 里定义的条数**」（派生），
//   再加一条**写死的下限**（FAQ ≥ 5、指南 = 3、介绍段 = 3 段）。
//
// ⚠️ 断言必须**逐页**查：这类缺陷天然是「一部分页有、一部分页没有」
//   —— 查全站平均值会把 9/15 的缺失稀释掉。
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern)

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { categories } from '../src/data/categories.ts';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

/** 独立写死：各块的下限 / 固定值 */
const MIN_FAQ_ITEMS = 5;
const EXPECTED_GUIDE_CARDS = 3;
const EXPECTED_INTRO_PARAGRAPHS = 3;

/** 独立写死：区块标题（en / zh）—— 必须与 i18n 真值一致 */
const FAQ_HEADING = { en: 'Frequently Asked Questions', zh: '\u5e38\u89c1\u95ee\u9898' } as const;
const GUIDES_HEADING = { en: 'Guides & Articles', zh: '\u6307\u5357\u4e0e\u6587\u7ae0' } as const;

const LANGS = ['en', 'zh'] as const;

/** 去掉标签 + 还原实体 + 压空白 */
function textOf(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 取某个 h2 标题开始、到下一个 h2 之前的片段（按 h2 的**精确文本**定位） */
function scopeAfterHeading(html: string, heading: string): string {
  const re = /<h2\b[^>]*>([\s\S]*?)<\/h2>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (textOf(m[1]!) === heading) {
      const next = html.indexOf('<h2', m.index + m[0].length);
      return next < 0 ? html.slice(m.index) : html.slice(m.index, next);
    }
  }
  return '';
}

function h2Texts(html: string): string[] {
  const out: string[] = [];
  const re = /<h2\b[^>]*>([\s\S]*?)<\/h2>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(textOf(m[1]!));
  return out;
}

/** 数某个标签出现了几次（用正则字面量，避免「把正则写成字符串」时转义被吃掉） */
function countDetails(scope: string): number {
  return (scope.match(/<details\b/g) || []).length;
}
function countArticles(scope: string): number {
  return (scope.match(/<article\b/g) || []).length;
}
function countParagraphs(scope: string): number {
  return (scope.match(/<p\b/g) || []).length;
}

/** locale 里为该分类定义的介绍段 h2（真相源 = i18n JSON） */
function localeIntroHeading(lang: string, letter: string): string {
  const o = JSON.parse(readFileSync(resolve(root, 'src/i18n/locales', lang + '.json'), 'utf-8')) as Record<string, string>;
  return o['category.' + letter + '.intro.h2'] ?? '';
}

/** locale 里为该分类定义的 FAQ / 指南 条数（真相源 = i18n JSON） */
function localeCounts(lang: string, letter: string): { faq: number; guide: number } {
  const o = JSON.parse(readFileSync(resolve(root, 'src/i18n/locales', lang + '.json'), 'utf-8')) as Record<string, string>;
  const faq = new Set<string>();
  const guide = new Set<string>();
  for (const k of Object.keys(o)) {
    if (k.startsWith('category.' + letter + '.faq.q')) faq.add(k.split('.')[3]!);
    if (k.startsWith('category.' + letter + '.guide.')) guide.add(k.split('.')[3]!);
  }
  return { faq: faq.size, guide: guide.size };
}

test('P167: 每个分类页都有介绍段 / FAQ / 分类指南，且条数与 locale 定义一致', () => {
  const problems: string[] = [];

  for (const lang of LANGS) {
    for (const cat of categories) {
      const file = resolve(root, 'dist', lang, cat.slug, 'index.html');
      if (!existsSync(file)) {
        problems.push(lang + '/' + cat.slug + '：产物缺失');
        continue;
      }
      const html = readFileSync(file, 'utf-8');
      const heads = h2Texts(html);
      const want = localeCounts(lang, cat.id);

      // —— 介绍段：按 locale 定义的 h2 精确定位（不靠「第几个 h2」这种位置假设）——
      const introHeading = localeIntroHeading(lang, cat.id);
      if (!introHeading) {
        problems.push(lang + '/' + cat.slug + '：locale 里没有 category.' + cat.id + '.intro.h2');
      }
      const introScope = introHeading ? scopeAfterHeading(html, introHeading) : '';
      if (introHeading && !introScope) {
        problems.push(lang + '/' + cat.slug + '：找不到介绍段（locale 标题 = ' + JSON.stringify(introHeading) + '）');
      } else if (introScope) {
        const paras = countParagraphs(introScope);
        if (paras !== EXPECTED_INTRO_PARAGRAPHS) {
          problems.push(lang + '/' + cat.slug + '：介绍段有 ' + paras + ' 段（应为 ' + EXPECTED_INTRO_PARAGRAPHS + '）');
        }
      }

      // —— FAQ：条数必须等于 locale 定义的条数，且不低于下限 ——
      const faqScope = scopeAfterHeading(html, FAQ_HEADING[lang]);
      if (!faqScope) {
        problems.push(lang + '/' + cat.slug + '：找不到 FAQ 区块（locale 定义了 ' + want.faq + ' 条）');
      } else {
        const items = countDetails(faqScope);
        if (items !== want.faq) {
          problems.push(lang + '/' + cat.slug + '：FAQ 渲染 ' + items + ' 条，locale 定义 ' + want.faq + ' 条');
        }
        if (items < MIN_FAQ_ITEMS) {
          problems.push(lang + '/' + cat.slug + '：FAQ 只有 ' + items + ' 条（< 下限 ' + MIN_FAQ_ITEMS + '）');
        }
      }

      // —— 分类指南 ——
      const guidesScope = scopeAfterHeading(html, GUIDES_HEADING[lang]);
      if (!guidesScope) {
        problems.push(lang + '/' + cat.slug + '：找不到分类指南区块（locale 定义了 ' + want.guide + ' 张卡）');
      } else {
        const cards = countArticles(guidesScope);
        if (cards !== want.guide) {
          problems.push(lang + '/' + cat.slug + '：分类指南渲染 ' + cards + ' 张卡，locale 定义 ' + want.guide + ' 张');
        }
        if (cards !== EXPECTED_GUIDE_CARDS) {
          problems.push(lang + '/' + cat.slug + '：分类指南有 ' + cards + ' 张卡（应为 ' + EXPECTED_GUIDE_CARDS + '）');
        }
      }
    }
  }

  assert.deepEqual(problems, [], '分类页三区块不齐平：' + problems.join(String.fromCharCode(10)));
});