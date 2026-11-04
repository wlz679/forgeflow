#!/usr/bin/env node
// P167 —— 分类页「页面级相似度」守卫（build-dep）。
//
// 为什么需要这个守卫
// ------------------
// P166 踩过的坑：主题页加了一个新区块后，**与同类别其它页的相似度上升了**
//   （实测 44/45 页上升，平均 +1.16 个百分点）——
//   单看「这个区块自己写得对不对」永远发现不了这件事。
//
// ⇒ 分类页补这三块**同样可能**把 9 个页面推得更像。
//   本守卫量的是**平台真正看到的数**：整页正文的两两 Jaccard 相似度。
//
// ⚠️ 与另两个守卫的分工：
//   · category-page-sections-guard    → 结构齐平（有没有这三块、条数对不对）
//   · category-content-uniqueness-guard → 区块内容不模板化（只读 locale，source-only）
//   · **本守卫**                        → 整页之间没有变得更像（要读产物）
//
// 基线（P167-1 取证，15 页 / 105 对）：en max **8.27%** / zh max **8.69%**；
//   补完 9 页后实测 en max 8.16% / zh max 8.22%（**反而略降**）。
// ⇒ 上限 10%，留约 1.3 个百分点的余量。
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern)

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { categories } from '../src/data/categories.ts';
import { LANGS, MAX_PAGE_SIMILARITY, ROOT, jaccard, shingles } from './_category-sections-metrics.ts';

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

test('P167 页面相似度：15 个分类页两两之间的最大相似度在上限内', () => {
  const problems: string[] = [];

  for (const lang of LANGS) {
    const langDir = join(ROOT, 'dist', lang);
    if (!existsSync(langDir)) {
      problems.push(lang + '：产物目录不存在（先跑 pnpm build）');
      continue;
    }

    const pages: { id: string; sh: string[] }[] = [];
    for (const c of categories) {
      const f = join(langDir, c.slug, 'index.html');
      if (!existsSync(f)) {
        problems.push(lang + '/' + c.slug + '：产物缺失');
        continue;
      }
      const html = readFileSync(f, 'utf-8');
      const m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
      pages.push({ id: c.id, sh: shingles(stripTags(m ? m[1] : html)) });
    }

    if (pages.length < 2) continue;

    const pairs: { a: string; b: string; v: number }[] = [];
    for (let i = 0; i < pages.length; i++) {
      for (let j = i + 1; j < pages.length; j++) {
        pairs.push({ a: pages[i]!.id, b: pages[j]!.id, v: jaccard(pages[i]!.sh, pages[j]!.sh) * 100 });
      }
    }
    pairs.sort((x, y) => y.v - x.v);
    const vals = pairs.map((x) => x.v);
    const maxSim = Math.max(...vals);

    if (maxSim > MAX_PAGE_SIMILARITY) {
      const top = pairs.slice(0, 5).map((pr) => pr.a + '×' + pr.b + '=' + pr.v.toFixed(2) + '%').join('  ');
      problems.push(
        lang + '：分类页最大相似度 ' + maxSim.toFixed(2) + '% > 上限 ' + MAX_PAGE_SIMILARITY +
        '% ⇒ 这几页被推得更像了　最像的几对：' + top,
      );
    }
  }

  assert.deepEqual(problems, [], '分类页之间太像：' + problems.join(String.fromCharCode(10)));
});
