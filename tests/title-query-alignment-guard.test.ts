#!/usr/bin/env node
// P168 B3-5 —— 「查询词 ↔ 标题」的映射守卫（source-only，不读 dist/）。
//
// 为什么需要它
// ------------
// B3-2 的 title-seo-guard 守的是**结构**：键齐全 / ≤60 字符 / 无年份品牌 /
// 保留原词组 / en-zh 结构对齐 / og-twitter 边界 / <title> 绑定。
// ⭐ 但它**守不到「标题有没有命中真实查询词」** ——
//   「Churn Rate Calculator — Revenue Churn Tracker」完全满足全部结构判据，
//   可用户搜的是「订阅流失率收入估算」⇒ 词不匹配 ⇒ 已经在第一页也不点。
// ⇒ 本守卫把 GSC 实测的「排名已进前 10 却 0 点击」查询与标题的对应关系**写死**，
//   任何一方漂移都红。
//
// ⚠️ 为什么必须**独立文件**而不是塞进 title-seo-guard：
//   那 7 条判据守「结构」，本条守「语义」⇒ 职责不同。
//   混在一起 ⇒ 一条变异会同时红两条 ⇒ 违反「一条变异只红一条断言」的隔离纪律。
//
// 期望值**独立写死字面量**（不��� locale 派生 ⇒ 守卫不是同义反复）：
//   每个条目 = { slug, lang, query, words }
//   · lang  = 该查询发生在哪个语言侧（中文查询 ⇒ zh 页；英文查询 ⇒ en 页）
//   · words = 该查询里**必须出现在 seoTitle 中**的实词
//
// 覆盖范围：15 条「排名已进前 10 却 0 点击」的查询里，**11 条**能映射到
// 已存在的工具（另 4 条指向不存在的工具 ⇒ 不是改标题能解决的，见规格 §19.32）。
//
// 数据来源：GSC 导出（过去 3 个月：731 条查询 / 592 个页面 / 26 点击 /
// 12,558 展示 / CTR 0.207%）⇒ 站点第一个**站外真实检索意图**信号。
// 分析工具（入库，可复算）：tests/scripts/p168-gsc-prioritize.mjs

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

function locale(lang: string): Record<string, string> {
  return JSON.parse(
    readFileSync(resolve(root, 'src/i18n/locales/' + lang + '.json'), 'utf8').replace(/^\uFEFF/, ''),
  ) as Record<string, string>;
}

interface Target {
  slug: string;
  lang: 'en' | 'zh';
  /** GSC 实测查询原文（含展示数与排名，便于日后核对） */
  query: string;
  /** 该查询里必须出现在 seoTitle 中的实词 */
  words: string[];
}

/**
 * ⭐ 期望值写死字面量 —— 每条都带 GSC 的展示数与排名。
 * ⚠️ 「展示数 / 排名」只是**注释用的证据**，判据只读 words
 *    （否则把排名写进判据 ⇒ 排名一变就假红）。
 */
const TARGETS: Target[] = [
  // —— en 侧（1 条）——
  {
    slug: 'solopreneur-gemini-api-cost-calculator',
    lang: 'en',
    query: 'google gemini cost（73 展示 · 排名 7.03）',
    words: ['google', 'gemini', 'cost'],
  },
  // —— zh 侧（10 条）——
  {
    slug: 'solopreneur-logo-churn-rate-calculator',
    lang: 'zh',
    query: '订阅流失率计算（45 展示 · 排名 4.69）',
    words: ['订阅流失率'],
  },
  {
    slug: 'solopreneur-logo-churn-rate-calculator',
    lang: 'zh',
    query: '会员流失率计算（25 展示 · 排名 2.84）',
    words: ['会员流失率'],
  },
  {
    slug: 'solopreneur-saas-pricing-planner',
    lang: 'zh',
    query: '混合定价成本计算（44 展示 · 排名 3）',
    words: ['混合定价', '成本'],
  },
  {
    slug: 'solopreneur-saas-pricing-planner',
    lang: 'zh',
    query: '服务套餐收入计算（25 展示 · 排名 6.16）',
    words: ['服务', '套餐', '收入'],
  },
  {
    slug: 'solopreneur-course-pricing-calculator',
    lang: 'zh',
    query: '课时费计算（29 展示 · 排名 5.31）',
    words: ['课时费'],
  },
  {
    slug: 'solopreneur-churn-rate-calculator',
    lang: 'zh',
    query: '订阅流失率收入估算（29 展示 · 排名 6.55）',
    words: ['订阅流失率', '收入'],
  },
  {
    slug: 'solopreneur-freelance-rate-calculator',
    lang: 'zh',
    query: '独立开发者时薪计算（27 展示 · 排名 6.37）',
    words: ['独立开发者', '时薪'],
  },
  {
    slug: 'solopreneur-funnel-step-calculator',
    lang: 'zh',
    query: '多阶段转化率计算（25 展示 · 排名 4.24）',
    words: ['多阶段', '转化率'],
  },
  {
    slug: 'solopreneur-hourly-vs-fixed-calculator',
    lang: 'zh',
    query: '自由职业者计费方式（25 展示 · 排名 5.2）',
    words: ['自由职业者', '计费方式'],
  },
];

test('P168 B3-5：⭐ 被点名的工具标题必须命中真实查询词（查询 ↔ 标题的映射不许漂移）', () => {
  const en = locale('en');
  const zh = locale('zh');
  const problems: string[] = [];
  for (const t of TARGETS) {
    const seo = (t.lang === 'en' ? en : zh)['tools.' + t.slug + '.seoTitle'];
    if (typeof seo !== 'string' || !seo.trim()) {
      problems.push(`${t.lang}/${t.slug} 缺 seoTitle 键（查询：${t.query}）`);
      continue;
    }
    const lower = seo.toLowerCase();
    for (const w of t.words) {
      if (!lower.includes(w.toLowerCase())) {
        problems.push(
          `${t.lang}/${t.slug} 的 seoTitle 不含查询词「${w}」（查询：${t.query}）· 现值：${seo}`,
        );
      }
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});
