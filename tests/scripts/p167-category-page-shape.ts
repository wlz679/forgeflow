// P167 —— 分类页**模板同形**体检工具。
//
// 为什么要有这个工具
// ------------------
// P167 的核心结论是「9 个 lean 分类页补成了与另外 6 个 full 页**逐段同形**」。
// ⇒ 这个结论必须有**可复算的出处** —— 否则它只是「作者说过」。
//   （凡产出验收数字的脚本都要入库，不能只留在 gitignore 的 tmp/ 里。）
//
// 它查两件事：
//   ① **每个分类页都调用了同样三个组件**（CategoryHero / CategoryFaq / CategoryGuides）
//      并读同样三族 locale 键（.intro.h2 / .intro.N / .faq.qN / .guide.N）
//      —— 缺任何一个，就是 P167 要消灭的那种「同类页面结构不一致」；
//   ② **每个分类页的 FAQ / 指南序号数组 == locale 里实际定义的条数**
//      —— 实测 **F 分类有 7 条 FAQ**、其余 14 个是 5 条 ⇒ 写死 [1..5] 会漏渲染。
//
// ⭐ 与守卫的分工：
//   · category-page-sections-guard（build-dep）看**产物**：页面真的渲染出三块吗
//   · **本工具**（source-only）看**源码**：15 个页面的写法还是同一种吗
//   · category-content-uniqueness-guard（source-only）看**内容**：三块有没有变成模板
//
// 跑法（必须从仓库根目录跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p167-category-page-shape.ts
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p167-category-page-shape.ts --strict
//     ↑ --strict：有问题时返回退出码 1
//
// ⚠️ 文件名**不能**带 .test.ts —— tests/build-dep-suites.mjs 的 walkTestSuites 只收
//    *.test.ts / *.test.mjs，带了会让套件计数漂移。
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { categories } from '../../src/data/categories.ts';
import { LANGS, ROOT, loadLocale } from '../_category-sections-metrics.ts';

const NL = String.fromCharCode(10);

/** 每个分类页必须调用的三个组件 */
const REQUIRED_COMPONENTS = ['CategoryHero', 'CategoryFaq', 'CategoryGuides'];

/** 每个分类页必须读的 locale 键族（用正则取，因为源码里是模板变量） */
const REQUIRED_KEY_PATTERNS = [
  { label: 'intro.h2', re: /\.intro\.h2/ },
  { label: 'intro.N', re: /\.intro\.\d/ },
  { label: 'faq.qN', re: /\.faq\.q\$\{?n\}?/ },
  { label: 'guide.N', re: /\.guide\.\$\{?n\}?/ },
];

function arrayOf(src: string, name: string): number[] {
  const m = src.match(new RegExp(name + ' = \\[([0-9,\\s]+)\\]'));
  if (!m || !m[1]) return [];
  return m[1]
    .split(',')
    .map((x) => parseInt(x.trim(), 10))
    .filter((x) => !Number.isNaN(x));
}

function main(): void {
  const strict = process.argv.slice(2).indexOf('--strict') >= 0;
  const out: string[] = [];
  const p = (s: string): void => {
    out.push(s);
  };
  const problems: string[] = [];

  p('='.repeat(78));
  p('P167 —— 分类页模板同形体检');
  p('='.repeat(78));
  p('分类总数：' + categories.length);
  p('');

  const locales = Object.fromEntries(LANGS.map((l) => [l, loadLocale(l)]));
  const rows: string[] = [];

  for (const c of categories) {
    const file = join(ROOT, 'src', 'pages', '[lang]', c.slug + '.astro');
    let src: string;
    try {
      src = readFileSync(file, 'utf8');
    } catch {
      problems.push(c.id + '：找不到页面文件 ' + c.slug + '.astro');
      continue;
    }

    const missComponents = REQUIRED_COMPONENTS.filter((k) => !src.includes('<' + k));
    const missKeys = REQUIRED_KEY_PATTERNS.filter((k) => !k.re.test(src)).map((k) => k.label);

    if (missComponents.length) {
      problems.push(c.id + '（' + c.slug + '）：缺组件 ' + missComponents.join(', '));
    }
    if (missKeys.length) {
      problems.push(c.id + '（' + c.slug + '）：缺 locale 键族 ' + missKeys.join(', '));
    }

    // —— FAQ / 指南的序号数组 vs locale 实际定义的条数 ——
    const faqArr = arrayOf(src, 'faqItems');
    const guideArr = arrayOf(src, 'manualGuides');
    const perLang: string[] = [];
    for (const lang of LANGS) {
      const locale = locales[lang]!;
      const faqIdx = new Set<string>();
      const guideIdx = new Set<string>();
      for (const k of Object.keys(locale)) {
        if (k.startsWith('category.' + c.id + '.faq.q')) faqIdx.add(k.split('.')[3]!);
        if (k.startsWith('category.' + c.id + '.guide.')) guideIdx.add(k.split('.')[3]!);
      }
      const wantFaq = faqIdx.size;
      const wantGuide = guideIdx.size;
      if (faqArr.length !== wantFaq) {
        problems.push(
          lang + '/' + c.id + '：页面渲染 FAQ ' + faqArr.length + ' 条，locale 定义 ' + wantFaq + ' 条',
        );
      }
      if (guideArr.length !== wantGuide) {
        problems.push(
          lang + '/' + c.id + '：页面渲染指南 ' + guideArr.length + ' 张卡，locale 定义 ' + wantGuide + ' 张',
        );
      }
      perLang.push(lang + ' faq' + wantFaq + '/guide' + wantGuide);
    }

    rows.push(
      '  ' + (missComponents.length || missKeys.length ? '[错误]' : '[OK]  ') +
      c.id.padEnd(3) + c.slug.padEnd(24) +
      'faq=[' + faqArr.join(',') + '] guide=[' + guideArr.join(',') + ']  ' +
      perLang.join('  '),
    );
  }

  for (const r of rows) p(r);
  p('');
  p('同形的分类数：' + rows.filter((r) => r.includes('[OK]')).length + ' / ' + categories.length);
  p('');
  p('='.repeat(78));
  p(problems.length === 0 ? '结论：0 个问题' : '结论：' + problems.length + ' 个问题');
  for (const pr of problems) p('  · ' + pr);
  p('='.repeat(78));

  process.stdout.write(out.join(NL) + NL);
  if (strict && problems.length > 0) process.exitCode = 1;
}

main();
