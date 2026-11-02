// P165 —— 决策层铺开的实测验收（直接量 dist/ 产物，方法与 B1 守卫同一把尺子）。
// 1) 15 个分类 × 2 语言 = 30 页：决策层区块是否渲染
// 2) 加厚量（info units，门槛 400）
// 3) 与同类别主题页的 5-gram Jaccard 相似度（上限 12%）
// 4) 决策层区块里有没有价格（必须 0）
// 5) 决策层区块里的工具链接是否都指向真实页面
//
// 跑法（必须从仓库根目录跑 —— 下面的路径是仓库根相对路径；且需要先 build）：
//   pnpm build:full
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p165-decision-layer-verify.ts
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { categories } from '../../src/data/categories.ts';

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
function infoUnits(s: string): number {
  let cjk = 0;
  let latin = 0;
  for (const m of s.matchAll(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff]+|[A-Za-z0-9][A-Za-z0-9'’\-]*/g)) {
    if (/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff]/.test(m[0])) cjk += m[0].length;
    else latin += 1;
  }
  return latin + cjk / 2;
}

/** 该类别下的全部主题页路径 */
function topicPagePaths(categorySlug: string): string[] {
  const out: string[] = [];
  const dir = join('dist', 'en', categorySlug);
  if (!existsSync(dir)) return out;
  for (const lang of ['en', 'zh']) {
    for (const cat of categories) {
      if (cat.slug !== categorySlug) continue;
      for (const kind of ['benchmark', 'compare', 'guide']) {
        const base = join('dist', lang, cat.slug);
        if (!existsSync(base)) continue;
        for (const topic of readdirSync(base)) {
          // ⚠️ 必须用 POSIX 风格存相对路径：Windows 的 join() 产生 `\`
          //    ⇒ 下面的 `tp.startsWith(`${lang}/`)` 恒为 false ⇒ 主题页被整体跳过
          //    ⇒ 相似度检查静默失效（测出来永远是 0%）。
          if (topic.endsWith(`-${kind}`)) out.push(`${lang}/${cat.slug}/${topic}`);
        }
      }
    }
  }
  return out;
}

const MIN_ADDED = 400;
const MAX_SIM = 12;

console.log('=== P165 决策层铺开实测 ===\n');
const rows: any[] = [];
let fail = 0;

for (const cat of categories) {
  for (const lang of ['en', 'zh'] as const) {
    const file = join('dist', lang, cat.slug, 'index.html');
    if (!existsSync(file)) {
      console.log(`  ✗ /${lang}/${cat.slug}/ 没有产物`);
      fail++;
      continue;
    }
    const html = readFileSync(file, 'utf8');
    const main = mainOf(html);

    const sections = [
      ...main.matchAll(/<section[^>]*data-decision-layer="[^"]*"[^>]*>([\s\S]*?)<\/section>/g),
      ...main.matchAll(/<section[^>]*data-decision-choices="[^"]*"[^>]*>([\s\S]*?)<\/section>/g),
    ];
    const layerHtml = sections.map((m) => m[1] ?? '').join('\n');
    const rendered = sections.length >= 2;

    const before = stripTags(
      main.replace(/<section[^>]*data-decision-(?:layer|choices)[^>]*>[\s\S]*?<\/section>/g, ' '),
    );
    const after = stripTags(main);
    const added = infoUnits(after) - infoUnits(before);

    const money = [...new Set([...stripTags(layerHtml).matchAll(/\$\s?\d[\d.,]*/g)].map((m) => m[0]))];

    const hrefs = [...new Set([...layerHtml.matchAll(/href="(\/[^"]+)"/g)].map((m) => m[1]!))];
    const deadLinks = hrefs.filter((h) => !existsSync(join('dist', h.replace(/^\//, ''), 'index.html')));

    let maxSim = 0;
    let worst = '';
    let compared = 0;
    const hubShingles = shingles(after);
    for (const tp of topicPagePaths(cat.slug)) {
      if (!tp.startsWith(`${lang}/`)) continue;
      const p = join('dist', ...tp.split('/'), 'index.html');
      if (!existsSync(p)) continue;
      compared++;
      const sim = jaccard(hubShingles, shingles(stripTags(mainOf(readFileSync(p, 'utf8'))))) * 100;
      if (sim > maxSim) {
        maxSim = sim;
        worst = tp;
      }
    }
    // ⚠️ 防空转：如果一个分类页一条主题页都没比对，相似度检查等于没跑。
    if (compared === 0) {
      fail++;
      console.log(`  ✗ /${lang}/${cat.slug}/ 没有可比对的主题页 —— 相似度检查没跑`);
      rows.push({ path: `/${lang}/${cat.slug}/`, rendered, added, maxSim, compared, bad: ['无主题页可比对'] });
      continue;
    }

    const bad: string[] = [];
    if (!rendered) bad.push('未渲染');
    if (added < MIN_ADDED) bad.push(`加厚 ${added.toFixed(0)} < ${MIN_ADDED}`);
    if (money.length) bad.push(`含价格 ${money.join(' ')}`);
    if (deadLinks.length) bad.push(`死链 ${deadLinks.join(' ')}`);
    if (maxSim > MAX_SIM) bad.push(`相似度 ${maxSim.toFixed(2)}% > ${MAX_SIM}% (${worst})`);

    if (bad.length) fail++;
    rows.push({
      path: `/${lang}/${cat.slug}/`,
      rendered,
      added,
      maxSim,
      compared,
      bad,
    });
    console.log(
      `  ${bad.length ? '✗' : '✓'} /${lang}/${cat.slug}/`.padEnd(42) +
        `区块=${rendered ? '有' : '无'}  加厚=${added.toFixed(0).padStart(5)}  最高相似度=${maxSim.toFixed(2).padStart(5)}%  比对主题页=${compared}` +
        (bad.length ? `  ⛔ ${bad.join(' | ')}` : ''),
    );
  }
}

console.log(`\n失败项 = ${fail} / ${rows.length}`);
const adds = rows.map((r) => r.added).sort((a, b) => a - b);
const sims = rows.map((r) => r.maxSim).sort((a, b) => a - b);
console.log(`加厚量：min ${adds[0]!.toFixed(0)} / 中位 ${adds[Math.floor(adds.length / 2)]!.toFixed(0)} / max ${adds[adds.length - 1]!.toFixed(0)}`);
console.log(`最高相似度：min ${sims[0]!.toFixed(2)}% / 中位 ${sims[Math.floor(sims.length / 2)]!.toFixed(2)}% / max ${sims[sims.length - 1]!.toFixed(2)}%`);
process.exitCode = fail > 0 ? 1 : 0;
