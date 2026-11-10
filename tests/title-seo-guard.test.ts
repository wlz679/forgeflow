#!/usr/bin/env node
// P168 B3-2 —— 工具页 <title> 瘦身的守卫（source-only，不读 dist/）。
//
// 背景
// ----
// P168 B3-2 把 100 个工具页的 <title> 从 SEO 长名换成了短版 seoTitle
//（≤ 60 字符、无年份、无品牌后缀），但 og:title / twitter:title **仍是长名**
//（分享卡片不截断 ⇒ 长名的检索面更完整）。
//
// 这个守卫守的是**不变量**。每条断言只守一件事 ⇒「一条变异只红一条断言」：
//
//   ① 键齐全：每个工具在 en / zh 两侧都有**非空**的 tools.<slug>.seoTitle
//      （缺键 ⇒ 页面回落长名 ⇒ 静默失去瘦身效果，且没有任何报错）
//   ② 长度：seoTitle ≤ 60 字符（SERP 桌面展示上限）
//   ③ 无年份 / 无品牌后缀（年份 97% 进不了 SERP；品牌词 Google 自己替换）
//   ④ ⭐ 词组完整：原 title 有关键词段的 ⇒ seoTitle 必须含**一组原样词组**
//      （判据落在**词组完整性**上，不是「长度 ≥ N」——
//        「把 Time to Breakeven 砍成 Time to」必须被判失败，
//        而「Free Blended + Paid CAC」砍成「Paid CAC」必须判通过）
//   ⑤ en / zh 结构对齐（两侧都有或都没有「 — 」分段）
//   ⑥ 边界：og:title / twitter:title 仍是**长名**（只改 <title>）——
//      防将来有人「顺手把 og:title 也改了」而无声破坏「只改 <title>」的边界
//
// ⚠️ 为什么 ④⑤ 要加**前置条件**（本文件最关键的设计）
// ------------------------------------------------------
// 若 ④ 在「seoTitle 缺键」时也判失败、⑤ 在「任一侧缺键」时也判失败，
// 那么「删掉一个 seoTitle 键」这条变异会同时红 ①④⑤ ⇒
//   · 一次变异污染三条断言 ⇒ 看到红灯时分不清是**哪条规则**被破坏；
//   · 「一条变异只红一条断言」这个硬约束被破坏，证伪实验失去区分度。
// ⇒ 按**职责**切分：
//   · ① 独占「键存在且非空」（en + zh 各 100 条，一个都不能缺、不能是空串）；
//   · ④ 只在**该语言的 seoTitle 存在且非空**时才生效；
//   · ⑤ 只在**两侧 seoTitle 都存在且非空**时才生效。
//
// ⚠️ 期望值一律**写死字面量**（60 / 'ForgeFlowKit' / 分隔符），
//    绝不从同一份真值派生 ⇒ 否则守卫就是同义反复（自己证明自己）。

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { tools } from '../src/data/tools/index.ts';

const root = resolve(import.meta.dirname, '..');
// ⭐ 真值源（locale + 模板）都在 src/ 下。集中成一个常量 ⇒ 变异测试可以只把
//   这一行指向 tmp/ 沙箱目录，断言逻辑一个字都不用改（证明见 task-4-report.md）。
const SRC = resolve(root, 'src');
const SEP = ' \u2014 ';
const MAX_LEN = 60;
const LANGS = ['en', 'zh'] as const;

function locale(lang: string): Record<string, string> {
  return JSON.parse(
    readFileSync(resolve(SRC, 'i18n/locales/' + lang + '.json'), 'utf8').replace(/^\uFEFF/, ''),
  ) as Record<string, string>;
}

const locales = Object.fromEntries(
  LANGS.map((l) => [l, locale(l)]),
) as Record<(typeof LANGS)[number], Record<string, string>>;

/**
 * 原 title 的关键词段拆成词组。
 *
 * - 「 — 」之后的全部内容才是**关键词段**；前面的是工具名。
 * - 只剥**结尾的 4 位数字**（年份）：/\s*[（(]\d{4}[）)]\s*$/。
 *   ⚠️ 术语括号必须保留 —— （NRR）（GRR）（DAU/MAU）（CSAT）（ACV）
 *   （买翻新租再融重复）（偿债覆盖率）都不是 4 位数字 ⇒ 不会被剥掉。
 * - 词组之间用「 + 」连接 ⇒ 「Free Blended + Paid CAC」是**两组**。
 */
function keywordGroups(title: string): string[] {
  const i = title.indexOf(SEP);
  if (i < 0) return [];
  const kw = title.slice(i + SEP.length).replace(/\s*[（(]\d{4}[）)]\s*$/, '');
  return kw.split(/\s*\+\s*/).map((s) => s.trim()).filter(Boolean);
}

test('P168 B3-2 ①：每个工具在 en / zh 两侧都有非空 seoTitle（缺键 ⇒ 静默回落长名）', () => {
  const problems: string[] = [];
  for (const lang of LANGS) {
    for (const tool of tools) {
      const key = 'tools.' + tool.slug + '.seoTitle';
      const v = locales[lang][key];
      if (typeof v !== 'string') {
        problems.push(lang + '/' + tool.slug + ' 缺 seoTitle 键');
        continue;
      }
      if (!v.trim()) {
        problems.push(lang + '/' + tool.slug + ' 的 seoTitle 是空串');
        continue;
      }
      // 值等于自己的键名 ⇒ 页面会把它当成「缺键」回落长名 ⇒ 同样没有瘦身效果
      if (v === key) {
        problems.push(lang + '/' + tool.slug + ' 的 seoTitle 就是键名本身（会被页面当成缺键）');
      }
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 B3-2 ②：seoTitle ≤ 60 字符（SERP 桌面展示上限）', () => {
  const problems: string[] = [];
  for (const lang of LANGS) {
    for (const tool of tools) {
      const v = locales[lang]['tools.' + tool.slug + '.seoTitle'] ?? '';
      if (v.length > MAX_LEN) {
        problems.push(lang + '/' + tool.slug + ' = ' + v.length + ' 字符：' + v);
      }
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 B3-2 ③：seoTitle 不得含年份或品牌后缀', () => {
  // 年份：括号内的 4 位年份（(2026) / （2026））+ 裸年份（"CAC Calculator 2026"）
  // ⚠️ 只认 19xx / 20xx ⇒ 术语括号（NRR）（GRR）（CSAT）不会被误伤，
  //    金额（"2000 USD"）也不会被当成年份（裸年份要求两侧是空白/边界）。
  const YEAR_PAREN = /[（(]\s*(?:19|20)\d{2}\s*[）)]/;
  const YEAR_BARE = /(?:^|\s)(?:19|20)\d{2}(?=\s|$)/;
  const problems: string[] = [];
  for (const lang of LANGS) {
    for (const tool of tools) {
      const v = locales[lang]['tools.' + tool.slug + '.seoTitle'] ?? '';
      if (YEAR_PAREN.test(v)) problems.push(lang + '/' + tool.slug + ' 含年份：' + v);
      if (YEAR_BARE.test(v)) problems.push(lang + '/' + tool.slug + ' 含裸年份：' + v);
      if (v.includes('ForgeFlowKit')) problems.push(lang + '/' + tool.slug + ' 含品牌后缀：' + v);
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 B3-2 ④：⭐ seoTitle 必须保留原 title 的一组完整词组（不退化成只剩工具名）', () => {
  const problems: string[] = [];
  for (const lang of LANGS) {
    for (const tool of tools) {
      const seo = locales[lang]['tools.' + tool.slug + '.seoTitle'];
      // ⭐ 前置条件：seoTitle 存在且非空 ——「缺键」是 ① 的地盘，不是 ④ 的
      if (typeof seo !== 'string' || !seo.trim()) continue;

      const full = locales[lang]['tools.' + tool.slug + '.title'] ?? '';
      const groups = keywordGroups(full);
      // 原 title 本来就没有关键词段（B 类等）⇒ 不强求
      if (!groups.length) continue;

      const seoGroups = keywordGroups(seo);
      if (!seoGroups.length) {
        problems.push(lang + '/' + tool.slug + ' 的 seoTitle 丢掉了整个关键词段：' + seo);
        continue;
      }
      // ⭐ 判据落在**词组完整性**：至少一组**原样**保留（不许部分匹配）
      const kept = groups.some((g) => seoGroups.includes(g));
      if (!kept) {
        problems.push(
          lang + '/' + tool.slug + ' 的 seoTitle 没有保留任何一组完整词组\n' +
            '        原: ' + groups.join(' | ') + '\n' +
            '        新: ' + seoGroups.join(' | '),
        );
      }
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('P168 B3-2 ⑤：en / zh 结构对齐（两侧都有或都没有「 — 」分段）', () => {
  const problems: string[] = [];
  for (const tool of tools) {
    const en = locales.en['tools.' + tool.slug + '.seoTitle'];
    const zh = locales.zh['tools.' + tool.slug + '.seoTitle'];
    // ⭐ 前置条件：两侧都存在且非空 ——「缺键/空值」是 ① 的地盘，不是 ⑤ 的
    if (typeof en !== 'string' || !en.trim()) continue;
    if (typeof zh !== 'string' || !zh.trim()) continue;
    if (en.includes(SEP) !== zh.includes(SEP)) {
      problems.push(tool.slug + ' 结构不对齐：en=' + JSON.stringify(en) + ' zh=' + JSON.stringify(zh));
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 B3-2 ⑥：⭐ 边界 —— og:title / twitter:title 仍是长名（只改 <title>）', () => {
  const layout = readFileSync(resolve(SRC, 'layouts/BaseLayout.astro'), 'utf8');
  assert.ok(
    /og:title" content=\{ogTitle \?\? title\}/.test(layout),
    'BaseLayout 的 og:title 没有独立字段（ogTitle ?? title）⇒ og:title 会跟着 <title> 变短 ⇒ 破坏「只改 <title>」的边界',
  );
  assert.ok(
    /twitter:title" content=\{ogTitle \?\? title\}/.test(layout),
    'BaseLayout 的 twitter:title 没有独立字段（ogTitle ?? title）⇒ 分享卡片标题会跟着 <title> 变短',
  );

  const page = readFileSync(resolve(SRC, 'pages/[lang]/[slug].astro'), 'utf8');
  // \x60 = 反引号（源码里 ogTitle 是模板字符串）
  assert.ok(
    /const ogTitle = \x60\$\{toolTitle\} \u2014 ForgeFlowKit\x60/.test(page),
    '[slug].astro 的 ogTitle 不再是长名（toolTitle — ForgeFlowKit）⇒ og:title 会跟着 <title> 变短',
  );
  // ⚠️ 还要守住**传参**：ogTitle 只是算出来没用传下去 ⇒ BaseLayout 收到的
  //   ogTitle 是 undefined ⇒ og:title 仍然回落到 <title> ⇒ 边界悄悄破掉。
  assert.ok(
    /ogTitle=\{ogTitle\}/.test(page),
    '[slug].astro 没有把 ogTitle 传给 BaseLayout（ogTitle={ogTitle}）⇒ BaseLayout 会回落到 <title>（短版）',
  );
});

test('P168 B3-2 ⑦：⭐ <title> 必须用 seoTitle（绑定 + 缺键/空串回落长名）', () => {
  const page = readFileSync(resolve(SRC, 'pages/[lang]/[slug].astro'), 'utf8');
  // ⚠️⭐ 为什么要有 ⑦：⑥ 只守 **og/twitter 边界** ⇒ **守不到 <title> 本身**。
  //   整枝 review 实测：把 title={seoTitle} 改回 title={toolTitle} ⇒
  //   ⑥ 的 4 条子断言**全绿** ⇒ 整个瘦身效果静默丢失，CI 零信号。
  //   ⇒ 本批的**主交付物**（<title> 变短）必须有一条断言直接钉住。
  assert.ok(
    /<BaseLayout\b[^>]*\btitle=\{seoTitle\}/.test(page),
    '[slug].astro 没有把 title={seoTitle} 传给 BaseLayout ⇒ <title> 回落成长名 ⇒ 整个瘦身效果丢失（⑥ 只守 og/twitter 边界，守不到这一条）',
  );
  // 回落：t() 缺键时返回**键名本身** ⇒ 必须判等；空串/纯空白同样回落。
  assert.ok(
    /seoTitleRaw\s*===\s*seoTitleKey\s*\|\|\s*!\s*seoTitleRaw\.trim\(\)\s*\?\s*toolTitle\s*:\s*seoTitleRaw/.test(page),
    '[slug].astro 的 seoTitle 缺键/空串回落被去掉了 ⇒ 缺一个键就会让页面标题变成字面量 "tools.xxx.seoTitle"（或空标题）',
  );
});
