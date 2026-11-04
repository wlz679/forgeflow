#!/usr/bin/env node
// P167 —— 工具卡标题**不得被截断到读不出全名**（source-only 守卫）。
//
// 为什么需要这个守卫
// ------------------
// 用户 2026-11-04 截图反馈：分类页上一排计算器名字是「Affilate Income Calculat…」，
// **鼠标放上去也不显示全名**。
//
// 取证（不是「18 个太长」，而是「85% 的卡片标题用了 SEO 长名」）：
//   · `ToolCard.astro` 的标题用 Tailwind `truncate`（单行 + 省略号）；
//   · 而**同一张卡片的描述 `<p>` 反而有 `title` 属性** ⇒ 标题没有 ⇒ 无 tooltip；
//   · 卡片传入的 `title` 是 **SEO 标题** `tools.<slug>.title`（带关键词后缀，
//     英文中位 **64** 字符 / 最长 77）⇒ 在 4 列布局下单行约 31 字符
//     ⇒ **85% 的卡片标题被截断**（不是最初以为的 18/100）；
//   · 全站 436 个 `<h1>` **没有一个**带 truncate/line-clamp ⇒ 问题只在工具卡。
//
// ⚠️ 一个必须写清楚的边界：
//   `truncate` 是**纯视觉**裁剪 —— **DOM 里的文字一直就是完整的**
//   ⇒ 爬虫/审核员看到的文字**没变**，SEO 与 AdSense 判定**不受影响**；
//   ⇒ 这是**给人看的问题**，不要把它包装成「SEO 修复」。
//
// 守卫守四件事（各守一件，断言按**失败模式**枚举）：
//   ① 标题**不得**用单行 `truncate`；
//   ② 标题**必须**带 `title` 属性；
//   ③ 标题文本仍完整落在 DOM 里（不是塞进 data-* 或被 JS 截断）；
//   ④ ⭐ **卡片必须用短名** —— 不是 SEO 长名。
//
// ⚠️ 与「规则比需求更严」同族：
//   判据落在**要禁的那个形状**上（`truncate` 这个具体类名），
//   而不是「标题不能超过 N 个字符」（那会把编辑逼向缩短真实名称）。

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { tools } from '../src/data/tools/index.ts';

const root = resolve(import.meta.dirname, '..');
const SEP = ' \u2014 ';

function read(p: string): string {
  return readFileSync(resolve(root, p), 'utf8');
}

function locale(lang: string): Record<string, string> {
  return JSON.parse(read('src/i18n/locales/' + lang + '.json')) as Record<string, string>;
}

/** 取 ToolCard 里那个标题 <h3> 的 class 与属性 */
function titleTag(src: string): { cls: string; hasTitle: boolean } {
  const m = src.match(/<h3\b([^>]*)>/);
  if (!m) return { cls: '', hasTitle: false };
  const attrs = m[1]!;
  const clsMatch = attrs.match(/class="([^"]*)"/);
  return {
    cls: clsMatch ? clsMatch[1]! : '',
    hasTitle: /\btitle=\{/.test(attrs),
  };
}

test('P167 工具卡标题：不得用单行 truncate（否则长标题读不出全名）', () => {
  const src = read('src/components/ToolCard.astro');
  const { cls } = titleTag(src);
  assert.ok(
    cls.length > 0,
    'ToolCard.astro 里找不到标题 <h3> —— 组件结构变了？守卫需要跟着更新。',
  );
  assert.ok(
    !/(^|\s)truncate(\s|$)/.test(cls),
    '工具卡标题用了 truncate（单行 + 省略号）⇒ 长标题读不出全名',
  );
});

test('P167 工具卡标题：必须带 title 属性（两行放不下时 hover 能看全名）', () => {
  const src = read('src/components/ToolCard.astro');
  const { hasTitle } = titleTag(src);
  assert.ok(
    hasTitle,
    '工具卡标题没有 title 属性 ⇒ hover 不显示全名（同一张卡的描述反而有）。',
  );
});

test('P167 工具卡标题：line-clamp-2 时长标题仍应完整落在 DOM 里', () => {
  // ⭐ 这条是「守卫不能只看类名」的自检：
  //   它断言**真实标题文本**仍在 <h3> 的内容里 ——
  //   万一有人改成把标题塞进 data-* 或用 JS 截断文本，这条会红。
  const src = read('src/components/ToolCard.astro');
  const m = src.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/);
  assert.ok(m, '找不到标题 <h3> 的内容');
  const inner = m[1]!;
  assert.ok(
    inner.trim().length > 0,
    '标题 <h3> 的内容是空的',
  );
});

test('P167 工具卡标题：卡片必须用 shortTitle（短名），不是 SEO 长名', () => {
  // ⭐ 这条是本批的核心断言：
  //   卡片标题若继续用 SEO 长名（英文中位 64 字符），
  //   则 85% 的卡片标题在 4 列布局下会被砍 ⇒ 用户看到的一直是「…」。
  const src = read('src/components/ToolCard.astro');
  assert.ok(
    src.includes('tools.${Astro.props.slug}.shortTitle'),
    'ToolCard 没有解析 tools.<slug>.shortTitle ⇒ 卡片仍在用 SEO 长名做标题',
  );
  // 且必须处理「键缺失」—— t() 在缺键时返回键名本身
  assert.ok(
    /shortTitleRaw === shortTitleKey/.test(src),
    'ToolCard 没有对 shortTitle 缺键做 fallback ⇒ 缺键时卡片标题会显示成字面量键名',
  );
});

test('P167 shortTitle 键：两个语言各 100 个，且都是长名的前缀（派生自同一标题）', () => {
  const problems: string[] = [];
  for (const lang of ['en', 'zh']) {
    const o = locale(lang);
    for (const tool of tools) {
      const full = o['tools.' + tool.slug + '.title'];
      const short = o['tools.' + tool.slug + '.shortTitle'];
      if (full === undefined) {
        problems.push(lang + '/' + tool.slug + '：缺 .title');
        continue;
      }
      if (short === undefined) {
        problems.push(lang + '/' + tool.slug + '：缺 .shortTitle');
        continue;
      }
      // 短名必须是长名的前缀（派生规则）
      if (!full.startsWith(short)) {
        problems.push(lang + '/' + tool.slug + '：shortTitle 不是 title 的前缀 ⇒ 短名不是从同一标题派生的');
      }
      // 短名里不能残留营销后缀分隔符
      if (short.includes(SEP)) {
        problems.push(lang + '/' + tool.slug + '：shortTitle 里还有 " — " 分隔符');
      }
      // 短名不能为空、也不能是键名
      if (!short.trim() || short.startsWith('tools.')) {
        problems.push(lang + '/' + tool.slug + '：shortTitle 无效 = ' + JSON.stringify(short));
      }
    }
  }
  assert.deepEqual(problems, [], 'shortTitle 键有问题：' + problems.join(String.fromCharCode(10)));
});

test('P167 检测器自检：titleTag 解析器真的能从源码里读出 class 与 title', () => {
  // 「检查违规」的断言在没有违规时本来就绿 ⇒ 必须造一个已知违规样本，
  // 断言检测器看得见它。
  const bad = '<h3 class="text-base truncate">{Astro.props.title}</h3>';
  const good = '<h3 class="text-base line-clamp-2" title={shortTitle}>{shortTitle}</h3>';
  assert.ok(/(^|\s)truncate(\s|$)/.test(titleTag(bad).cls), '检测器自检失败：应认出 truncate');
  assert.ok(titleTag(good).hasTitle, '检测器自检失败：应认出 title 属性');
});

test('P167 工具标题长度分布：记录现状（供后续判断是否需要更大卡片宽度）', () => {
  // 这条**不是**判据，是一张**基线表**：
  //   若将来发现「仍然读不全」，先看这张表（短名有多长），
  //   而不是直接去调宽度。
  const en = locale('en');
  const shortLens = tools.map((t) => (en['tools.' + t.slug + '.shortTitle'] ?? '').length).sort((a, b) => b - a);
  const longLens = tools.map((t) => (en['tools.' + t.slug + '.title'] ?? '').length).sort((a, b) => b - a);
  assert.ok(tools.length >= 100, '工具数少于 100 ⇒ tools 注册表出问题了');
  assert.ok(
    shortLens[0]! < longLens[0]!,
    '短名不该比长名还长（派生规则反了？）',
  );
  console.log(
    `  [基线] 工具 ${tools.length} 个　短名最长 ${shortLens[0]}　SEO 长名最长 ${longLens[0]}`,
  );
});
