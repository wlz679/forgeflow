// P165 —— 「加决策层前后」与同类别主题页的相似度对比。
// 目的：把「落地前基线」这个引用**自己验一遍**，而不是照抄规格里的旧数字。
//
// 跑法（必须从仓库根目录跑，且需要先 build）：
//   pnpm build:full
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p165-similarity-before-after.ts
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function mainOf(html: string): string {
  const m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  return m ? m[1] : html;
}
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

function topicPages(lang: string, slug: string): string[] {
  const out: string[] = [];
  const dir = join('dist', lang, slug);
  if (!existsSync(dir)) return out;
  for (const topic of readdirSync(dir)) {
    if (topic.endsWith('-benchmark') || topic.endsWith('-guide') || topic.endsWith('-compare')) {
      const p = join(dir, topic, 'index.html');
      if (existsSync(p)) out.push(p);
    }
  }
  return out;
}

console.log('分类页                          落地前(去掉决策层)  落地后(整页)   差');
const beforeAll: number[] = [];
const afterAll: number[] = [];
for (const lang of ['en', 'zh']) {
  for (const slug of slugs) {
    const file = join('dist', lang, slug, 'index.html');
    const main = mainOf(readFileSync(file, 'utf8'));
    const beforeHtml = main.replace(
      /<section[^>]*data-decision-(?:layer|choices)[^>]*>[\s\S]*?<\/section>/g,
      ' ',
    );
    const beforeSh = shingles(stripTags(beforeHtml));
    const afterSh = shingles(stripTags(main));
    let bMax = 0;
    let aMax = 0;
    for (const tp of topicPages(lang, slug)) {
      const tSh = shingles(stripTags(mainOf(readFileSync(tp, 'utf8'))));
      bMax = Math.max(bMax, jaccard(beforeSh, tSh) * 100);
      aMax = Math.max(aMax, jaccard(afterSh, tSh) * 100);
    }
    beforeAll.push(bMax);
    afterAll.push(aMax);
    console.log(
      `/${lang}/${slug}/`.padEnd(32) +
        `${bMax.toFixed(2)}%`.padStart(12) +
        `${aMax.toFixed(2)}%`.padStart(14) +
        `   ${(aMax - bMax >= 0 ? '+' : '') + (aMax - bMax).toFixed(2)}pp`,
    );
  }
}
const med = (xs: number[]) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
console.log(`\n落地前：min ${Math.min(...beforeAll).toFixed(2)}% / 中位 ${med(beforeAll).toFixed(2)}% / max ${Math.max(...beforeAll).toFixed(2)}%`);
console.log(`落地后：min ${Math.min(...afterAll).toFixed(2)}% / 中位 ${med(afterAll).toFixed(2)}% / max ${Math.max(...afterAll).toFixed(2)}%`);
