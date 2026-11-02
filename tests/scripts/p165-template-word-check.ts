// P165 —— 「组内模板词」体检：15 个分类的决策层文本之间会不会互相雷同？
//
// 为什么必须查这个
// ----------------
// AdSense 给分类页的低价值裁定里，最刺眼的一条是「组内模板词占比 12.6%」
// —— 19 个分类页共用同一副描述骨架。本批给 15 个分类各写了一份决策层，
// 如果这 15 份决策层**自己也**是同一副骨架换皮，那么这一批不但没解决问题，
// 反而在**决策层这个维度上**又造出 15 份模板词。
//
// ⇒ 没有任何守卫覆盖这件事（现有守卫查的是「决策层 vs 主题页」，
//    不是「分类 A 的决策层 vs 分类 B 的决策层」）⇒ 必须自己量。
//
// 跑法（必须从仓库根目录跑，且需要先 build）：
//   pnpm build:full
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p165-template-word-check.ts
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function shingles(text: string, n = 5): Set<string> {
  const tokens = [
    ...text.matchAll(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff]|[A-Za-z0-9][A-Za-z0-9'’\-]*/g),
  ].map((m) => m[0].toLowerCase());
  const out = new Set<string>();
  for (let i = 0; i + n <= tokens.length; i++) out.add(tokens.slice(i, i + n).join(' '));
  return out;
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const g of a) if (b.has(g)) inter++;
  return inter / (a.size + b.size - inter);
}

const slugs = [
  'saas-metrics', 'ai-cost-tools', 'valuation-exit', 'freelance-pricing', 'cost-efficiency',
  'investment-roi', 'hiring-team', 'knowledge', 'legal-compliance', 'marketing-analytics',
  'operations-inventory', 'product-analytics', 'retention', 'sales', 'customer-support',
];

function layerText(lang: string, slug: string): string {
  const file = join('dist', lang, slug, 'index.html');
  if (!existsSync(file)) return '';
  const main = readFileSync(file, 'utf8').match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? '';
  const sections = [
    ...main.matchAll(/<section[^>]*data-decision-layer="[^"]*"[^>]*>([\s\S]*?)<\/section>/g),
    ...main.matchAll(/<section[^>]*data-decision-choices="[^"]*"[^>]*>([\s\S]*?)<\/section>/g),
  ];
  return stripTags(sections.map((m) => m[1] ?? '').join('\n'));
}

for (const lang of ['en', 'zh'] as const) {
  const texts = slugs.map((s) => layerText(lang, s));
  const shs = texts.map((t) => shingles(t));
  console.log(`\n=== ${lang}：决策层文本两两相似度（5-gram Jaccard）===\n`);
  const pairs: { a: string; b: string; v: number }[] = [];
  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      pairs.push({ a: slugs[i]!, b: slugs[j]!, v: jaccard(shs[i]!, shs[j]!) * 100 });
    }
  }
  pairs.sort((x, y) => y.v - x.v);
  console.log('最相似的 10 对：');
  for (const p of pairs.slice(0, 10)) {
    console.log(`  ${p.v.toFixed(2)}%  ${p.a}  ×  ${p.b}`);
  }
  const vals = pairs.map((p) => p.v);
  const med = vals.slice().sort((a, b) => a - b)[Math.floor(vals.length / 2)]!;
  console.log(
    `\n共 ${pairs.length} 对：min ${Math.min(...vals).toFixed(2)}% / 中位 ${med.toFixed(2)}% / max ${Math.max(...vals).toFixed(2)}%`,
  );
  // 组内模板词比例：所有分类的决策层合起来，出现在 >1 个分类里的 5-gram 占比
  const all = new Map<string, number>();
  for (const sh of shs) for (const g of sh) all.set(g, (all.get(g) ?? 0) + 1);
  let total = 0;
  let shared = 0;
  for (const sh of shs) {
    for (const g of sh) {
      total++;
      if ((all.get(g) ?? 0) > 1) shared++;
    }
  }
  console.log(`组内模板词比例（出现在 ≥2 个分类里的 5-gram 占全部 5-gram 的份额）= ${((shared / total) * 100).toFixed(2)}%`);
}
