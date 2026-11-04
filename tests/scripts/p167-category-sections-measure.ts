// P167 —— 分类页「介绍段 / 分类指南 / FAQ」三区块的体检工具。
//
// 为什么要有这个工具
// ------------------
// 2026-11-04 取证：全站 15 个分类页分成两种形态 ——
//   · 6 个「full」页：有介绍段 + FAQ + 分类指南
//   · 9 个「lean」页：这三块**都没有**（且 locale 键也不存在）
// => 全站唯一一处「同一类页面结构不一致」。P167 把 9 页补成同形。
//
// ⭐ 但「补成同形」只保证**结构**一致，不保证**内容**不变成模板 ——
//   9 份介绍段 + 9 份指南 + 9 份 FAQ，若都写「Our N calculators cover…」
//   => 就是 9 份同一副骨架，而这正是 AdSense 判分类页低价值的那条线
//   （「组内模板词占比 12.6%」）。
//
// => 本工具一次性报出四件事：
//   ① 每个区块（intro / guide / faq）单独的组内模板词份额
//   ② 逐分类的**跨分类**共用 5-gram 数（真模板风险）
//   ③ 逐分类的**分类内**重复 5-gram 数（术语一致性，不是模板 —— 只作对照）
//   ④ 全站 15 个分类页的页面级两两相似度（区块齐平后有没有把页面推得更像）
//
// ⭐ ② 与 ③ 必须分开（P167 第一版的教训）：
//   第一版只报一个「共用 5-gram 最多的分类」，它把分类内重复也算进去
//   => T 分类显示 137，看起来像模板；逐条查下来全是它自己的术语
//      （「工单」「首响」「自助分流率」在三块里反复出现）—— 那是**好事**。
//   一个会误导编辑的体检数字，比没有数字更糟。
//
// 跑法（必须从仓库根目录跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p167-category-sections-measure.ts
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p167-category-sections-measure.ts --strict
//     ↑ --strict：超过上限时返回退出码 1
//
// ⚠️ 文件名**不能**带 .test.ts —— tests/build-dep-suites.mjs 的 walkTestSuites 只收
//    *.test.ts / *.test.mjs，带了会让套件计数漂移。

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { categories } from '../../src/data/categories.ts';
import {
  LANGS,
  MAX_PAGE_SIMILARITY,
  MAX_SHARE,
  MAX_SHARED_GROUP,
  ROOT,
  blocksOf,
  crossCategoryCount,
  jaccard,
  loadLocale,
  sharedGroups,
  shingles,
  templateShare,
} from '../_category-sections-metrics.ts';

const NL = String.fromCharCode(10);

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function main(): void {
  const strict = process.argv.slice(2).indexOf('--strict') >= 0;
  const out: string[] = [];
  const p = (s: string): void => {
    out.push(s);
  };
  const problems: string[] = [];

  p('='.repeat(78));
  p('P167 —— 分类页三区块（介绍段 / 分类指南 / FAQ）体检');
  p('='.repeat(78));
  p('分类总数：' + categories.length);
  p('');

  for (const lang of LANGS) {
    const locale = loadLocale(lang);
    const blocks = categories
      .map((c) => blocksOf(locale, c.id))
      .filter((b): b is NonNullable<typeof b> => b !== null);

    const missing = categories.map((c) => c.id).filter((id) => blocksOf(locale, id) === null);
    p('-'.repeat(78));
    p('【' + lang + '】有这三块的分类：' + blocks.length + ' / ' + categories.length +
      (missing.length ? '　缺：' + missing.join(', ') : '　（全部齐平 ✓）'));
    if (missing.length) {
      problems.push(lang + '：' + missing.length + ' 个分类缺介绍段/指南/FAQ => ' + missing.join(', '));
    }

    for (const part of ['intro', 'guide', 'faq'] as const) {
      const share = templateShare(blocks.map((b) => b[part]));
      const limit = MAX_SHARE[lang];
      const tag = share > limit ? '[错误]' : '[OK]  ';
      p('  ' + part.padEnd(6) + tag + ' 模板词份额 ' + share.toFixed(2) + '%（上限 ' + limit + '%）');
      if (share > limit) {
        problems.push(lang + '/' + part + '：模板词份额 ' + share.toFixed(2) + '% > 上限 ' + limit + '% => 这三块在复用同一副骨架');
      }
    }

    // —— 跨分类共用（真模板风险） vs 分类内重复（术语一致性，只是对照）——
    const byCategory = new Map<string, string>();
    for (const b of blocks) byCategory.set(b.letter, b.all);
    const groups = sharedGroups(byCategory);

    const crossRows = blocks.map((b) => ({
      letter: b.letter,
      cross: crossCategoryCount(b.letter, groups),
      total: new Set(shingles(b.all)).size,
    }));
    crossRows.sort((x, y) => y.cross - x.cross);
    p('  跨分类共用 5-gram 最多的分类：' + crossRows.slice(0, 5)
      .map((r) => r.letter + '(' + r.cross + '/' + r.total + ')').join('  '));

    const maxGroup = [...groups.values()].reduce((m, s) => Math.max(m, s.size), 0);
    const tag2 = maxGroup > MAX_SHARED_GROUP ? '[错误]' : '[OK]  ';
    p('  ' + tag2 + ' 单个 5-gram 最多被 ' + maxGroup + ' 个分类共用（上限 ' + MAX_SHARED_GROUP + '）');
    if (maxGroup > MAX_SHARED_GROUP) {
      problems.push(
        lang + '：同一个 5-gram 被 ' + maxGroup + ' 个分类共用（> ' + MAX_SHARED_GROUP + '）=> 有一句话被复制到了多页',
      );
    }

    const top = [...groups.entries()]
      .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))
      .slice(0, 6);
    for (const [x, s] of top) {
      p('    ' + s.size + '× ' + [...s].join(',') + '  |  ' + x);
    }

    // 分类内重复（对照用）：同一分类三块之间反复出现的 5-gram 数
    const innerRows = blocks.map((b) => {
      const gs = shingles(b.all);
      const c = new Map<string, number>();
      for (const x of gs) c.set(x, (c.get(x) ?? 0) + 1);
      let inner = 0;
      for (const n of c.values()) if (n > 1) inner++;
      return { letter: b.letter, inner };
    });
    innerRows.sort((x, y) => y.inner - x.inner);
    p('  （对照）分类内重复 5-gram 最多的分类：' + innerRows.slice(0, 5)
      .map((r) => r.letter + '(' + r.inner + ')').join('  ') + '　← 术语一致性，非模板');
    p('');

    // 页面级：15 个分类页的两两相似度（区块齐平后有没有把页面推得更像）
    const langDir = join(ROOT, 'dist', lang);
    if (existsSync(langDir)) {
      const pages: { id: string; sh: string[] }[] = [];
      for (const c of categories) {
        const f = join(langDir, c.slug, 'index.html');
        if (!existsSync(f)) continue;
        const html = readFileSync(f, 'utf-8');
        const m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
        pages.push({ id: c.id, sh: shingles(stripTags(m ? m[1] : html)) });
      }
      if (pages.length >= 2) {
        const pairs: { a: string; b: string; v: number }[] = [];
        for (let i = 0; i < pages.length; i++) {
          for (let j = i + 1; j < pages.length; j++) {
            pairs.push({ a: pages[i]!.id, b: pages[j]!.id, v: jaccard(pages[i]!.sh, pages[j]!.sh) * 100 });
          }
        }
        pairs.sort((x, y) => y.v - x.v);
        const vals = pairs.map((x) => x.v);
        p('  页面级两两相似度（' + pages.length + ' 页，' + pairs.length + ' 对）：min ' +
          Math.min(...vals).toFixed(2) + '% / 中位 ' +
          vals.slice().sort((a, b) => a - b)[Math.floor(vals.length / 2)]!.toFixed(2) + '% / max ' +
          Math.max(...vals).toFixed(2) + '%');
        for (const pr of pairs.slice(0, 5)) p('    ' + pr.v.toFixed(2) + '%  ' + pr.a + ' × ' + pr.b);
        const maxSim = Math.max(...vals);
        if (maxSim > MAX_PAGE_SIMILARITY) {
          problems.push(
            lang + '：分类页之间的最大相似度 ' + maxSim.toFixed(2) + '% > 上限 ' + MAX_PAGE_SIMILARITY +
            '% => 补这三块把分类页推得更像了（P166 实测过同一个失效形态）',
          );
          p('  [错误] 页面级最大相似度超上限');
        } else {
          p('  [OK] 页面级最大相似度在上限内');
        }
      }
    }
    p('');
  }

  p('='.repeat(78));
  p(problems.length === 0 ? '结论：0 个问题' : '结论：' + problems.length + ' 个问题');
  for (const pr of problems) p('  · ' + pr);
  p('='.repeat(78));

  process.stdout.write(out.join(NL) + NL);
  if (strict && problems.length > 0) process.exitCode = 1;
}

main();
