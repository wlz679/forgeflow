// P168 —— 决策支持（批次 3）的**验收测量**：工具页两两相似度 +
// 决策区块的组内模板词份额 + 决策区块↔结果卡片的逐字重叠。
//
// ⭐ 为什么入库（不留在 tmp/）
//   规格 §19.22.6 的验收判据 ①② 是「工具页两两相似度不得上升」与
//   「新区块的组内模板词份额 ≤ 上限」⇒ 这两个数字会被写进 CHANGELOG 与规格
//   ⇒ 别人 checkout 后必须能**复算**，否则那些数字只是「作者说过」。
//
// ⚠️ 文件名**不能**带 .test.ts —— tests/build-dep-suites.mjs 的 walkTestSuites
//    只收 *.test.ts / *.test.mjs，带了会让套件计数漂移。
//
// 跑法（必须从仓库根目录跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-decision-support-measure.ts

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { jaccard, shingles } from '../_category-sections-metrics.ts';
import { LANGS, MAX_BLOCK_CARD_OVERLAP, MAX_TOOL_PAGE_SIMILARITY, blockCardOverlap } from '../_decision-support-fixture.ts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const DIST = join(ROOT, 'dist');

/** 工具页的 slug 列表（来自 dist/en 下与 src/data/tools 一致的页面） */
function toolSlugs(): string[] {
  const { tools } = require('../../src/data/tools/index.ts') as typeof import('../../src/data/tools/index.ts');
  return tools.map((t) => t.slug);
}

function mainText(html: string): string {
  const m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  return (m ? m[1] : html).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&');
}

const slugs = toolSlugs();
const problems: string[] = [];

for (const lang of LANGS) {
  // ---- ① 工具页两两相似度 ----
  const pages: { id: string; sh: string[] }[] = [];
  for (const slug of slugs) {
    const f = join(DIST, lang, slug, 'index.html');
    if (!existsSync(f)) continue;
    const html = readFileSync(f, 'utf8');
    pages.push({ id: slug, sh: shingles(mainText(html)) });
  }
  let max = 0;
  let maxPair = '';
  for (let i = 0; i < pages.length; i++) {
    for (let j = i + 1; j < pages.length; j++) {
      const s = jaccard(pages[i].sh, pages[j].sh) * 100;
      if (s > max) { max = s; maxPair = pages[i].id + ' × ' + pages[j].id; }
    }
  }
  console.log(
    '[' + lang + '] 工具页两两相似度：' + pages.length + ' 页 / ' +
    (pages.length * (pages.length - 1) / 2) + ' 对 · max **' + max.toFixed(2) + '%** (' + maxPair + ')',
  );
  if (max > MAX_TOOL_PAGE_SIMILARITY) {
    problems.push(lang + ' 工具页相似度 ' + max.toFixed(2) + '% 超过上限 ' + MAX_TOOL_PAGE_SIMILARITY + '%');
  }

  // ---- ② 决策区块的组内模板词份额 ----
  const blocks: { id: string; sh: string[] }[] = [];
  for (const slug of slugs) {
    const f = join(DIST, lang, slug, 'index.html');
    if (!existsSync(f)) continue;
    const html = readFileSync(f, 'utf8');
    const m = html.match(/<section id="decision-support"[\s\S]*?<\/section>/i);
    if (!m) continue;
    blocks.push({ id: slug, sh: shingles(mainText(m[0])) });
  }
  if (blocks.length === 0) {
    console.log('[' + lang + '] 决策区块：0 个工具已激活 ⇒ 模板词份额不适用');
  } else {
    const counts = new Map<string, number>();
    for (const b of blocks) for (const s of b.sh) counts.set(s, (counts.get(s) ?? 0) + 1);
    let total = 0;
    let shared = 0;
    for (const b of blocks) {
      for (const s of b.sh) {
        total++;
        if ((counts.get(s) ?? 0) > 1) shared++;
      }
    }
    const share = total ? (shared / total) * 100 : 0;
    console.log(
      '[' + lang + '] 决策区块模板词份额：' + blocks.length + ' 个已激活工具 · ' +
      share.toFixed(2) + '%（上限 en 12% / zh 14%）',
    );
  }

  // ---- ③ 决策区块与结果卡片的逐字重叠 ----
  let maxOv = 0;
  let maxOvSlug = '';
  let measured = 0;
  for (const slug of slugs) {
    const f = join(DIST, lang, slug, 'index.html');
    if (!existsSync(f)) continue;
    const html = readFileSync(f, 'utf8');
    if (!html.includes('id="decision-support"')) continue;
    const ov = blockCardOverlap(html);
    if (ov < 0) continue;
    measured++;
    if (ov > maxOv) { maxOv = ov; maxOvSlug = slug; }
  }
  if (measured > 0) {
    console.log(
      '[' + lang + '] 决策区块↔卡片逐字重叠：' + measured + ' 个已激活工具 · max **' +
      maxOv.toFixed(2) + '%** (' + maxOvSlug + ')（上限 ' + MAX_BLOCK_CARD_OVERLAP + '%）',
    );
    if (maxOv > MAX_BLOCK_CARD_OVERLAP) {
      problems.push(lang + ' 决策区块与卡片逐字重叠 ' + maxOv.toFixed(2) + '% 超过上限 ' + MAX_BLOCK_CARD_OVERLAP + '%');
    }
  }
}

if (problems.length) {
  console.log('');
  console.log('✗ 不达标：');
  for (const p of problems) console.log('  - ' + p);
  process.exitCode = 1;
} else {
  console.log('');
  console.log('✓ 达标');
}
