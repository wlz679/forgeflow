// P167 —— 「复审视角」站点体检：量化**审核员现在看到什么**。
//
// 为什么要有这个工具
// ------------------
// 2026-10-28 11:06 已向 AdSense 提交复审（当时线上 = commit c1b278f），至今仍在审。
// 而此后站上又上线了 13 个 commit（价格单一真相源 / 33 个引擎交互态修复 /
// 分类页决策层 / 45 主题新形态 / 分类页三区块齐平）——
// ⇒ 复审窗口内站点**一直在变**，于是「审核员看到的是哪一版」成了必须量的问题。
//
// ⇒ 本工具一次性报出四组数（**只读 dist/，不碰站点任何字节**）：
//   ① **内容厚度**（按 kind：tool / hub / topic / home / static）—— 政策第 1 条
//      「提供真实高质量的信息工具服务」
//   ② **页面之间有多像**（5-gram Jaccard，两两 + 组内模板词份额）—— 政策第 2 条
//      「持续筛选有价值内容」的实际风险是规模化内容滥用
//   ③ **薄页清单**（< 200 特有词）—— 上一轮被判低价值时的具体形态
//   ④ **页面独有 shingle 率**（该页有多少内容是**这一页独有的**）
//
// ⭐ 量法说明（**与 P155 的历史数字不是同一个口径，别混**）：
//   · 厚度用 CJK 感知计数（中文按字、拉丁按词）—— 与 P155 §10.1【B】一致；
//   · 相似度用 5-gram Jaccard，按语言分组 —— 与 P155 §10.1【C】一致；
//   · 但 P155 的「页面特有内容占比 0.776」**用的是块级口径**（P155 的测量脚本
//     没入库，算法细节无从复核）⇒ 本工具改用**口径透明的 shingle 级**指标，
//     并在输出里显式命名，避免「看起来可比其实不可比」。
//   · ⭐ **本工具的价值在于 A/B 对比**（`--dist` 指向任意一版的产物）——
//     只要两版用同一工具跑，**口径一致，对比就成立**。
//
// 跑法（必须从仓库根目录跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p167-review-perspective-audit.ts
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p167-review-perspective-audit.ts --dist tmp/dist-before
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p167-review-perspective-audit.ts --json
//
// ⚠️ 文件名**不能**带 .test.ts —— tests/build-dep-suites.mjs 的 walkTestSuites 只收
//    *.test.ts / *.test.mjs，带了会让套件计数漂移。
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

import { tools as TOOL_LIST } from '../../src/data/tools/index.ts';
import { categories as CATEGORIES } from '../../src/data/categories.ts';

// ── 页型分类（与 P155 §10.1【B】的 kind 同口径）────────────────────────
//   tool  = 工具页（/{lang}/{tool-slug}/）
//   hub   = 分类页（/{lang}/{category-slug}/）
//   topic = 主题页（/{lang}/{category-slug}/{topic-slug}/）
//   home  = 首页
//   static= 静态合规页（about / contact / privacy-policy / terms）
//
// ⭐ slug 清单**从源码派生**，不手写（手写 100 个 slug 必错 —— P164 教训）：
//   工具页 ← src/data/tools/index.ts 导出的 tools[]
//   分类页 ← src/data/categories.ts 的 categories[]
const TOOL_SLUGS = new Set<string>(TOOL_LIST.map((t) => t.slug));
const HUB_SLUGS = new Set<string>(CATEGORIES.map((c) => c.slug));
const STATIC_SLUGS = new Set<string>(['about', 'contact', 'privacy-policy', 'terms']);

function kindOf(lang: string, relPath: string): string | null {
  // relPath 形如 'en/solopreneur-mrr-calculator/index.html'
  const parts = relPath.split('/').filter(Boolean);
  if (parts.length < 2 || parts[0] !== lang) return null;
  if (parts[parts.length - 1] !== 'index.html') return null;
  const segs = parts.slice(1, -1); // 去掉 lang 与 index.html
  if (segs.length === 0) return 'home';
  if (segs.length === 1) {
    if (STATIC_SLUGS.has(segs[0]!)) return 'static';
    if (HUB_SLUGS.has(segs[0]!)) return 'hub';
    if (TOOL_SLUGS.has(segs[0]!)) return 'tool';
    return 'other';
  }
  // 主题页在分类目录下；作者页在 about 下
  if (segs[0] === 'about') return 'static';
  return 'topic';
}

// ── 量法 ───────────────────────────────────────────────────────────────
function mainOf(html: string): string {
  const m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  return m ? m[1]! : html;
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

/** CJK 感知计数：中文按字、拉丁按词 */
function words(text: string): number {
  const cjk = (text.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g) || []).length;
  const latin = (text.match(/[A-Za-z0-9][A-Za-z0-9'\u2019\-]*/g) || []).length;
  return cjk + latin;
}

function tokens(text: string): string[] {
  return [
    ...text.matchAll(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]|[A-Za-z0-9][A-Za-z0-9'\u2019\-]*/g),
  ].map((m) => m[0]!.toLowerCase());
}

function shingles(text: string, n = 5): Set<string> {
  const tk = tokens(text);
  const out = new Set<string>();
  for (let i = 0; i + n <= tk.length; i++) out.add(tk.slice(i, i + n).join(' '));
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const g of a) if (b.has(g)) inter++;
  return inter / (a.size + b.size - inter);
}

/** 组内模板词份额：出现在 >=2 页里的 5-gram 占全部 5-gram 的份额 */
function templateShare(pages: { sh: Set<string> }[]): number {
  const counts = new Map<string, number>();
  for (const p of pages) for (const g of p.sh) counts.set(g, (counts.get(g) ?? 0) + 1);
  let total = 0;
  let shared = 0;
  for (const p of pages) {
    for (const g of p.sh) {
      total++;
      if ((counts.get(g) ?? 0) > 1) shared++;
    }
  }
  return total ? (shared / total) * 100 : 0;
}

interface PageRec {
  lang: string;
  kind: string;
  rel: string;
  words: number;
  sh: Set<string>;
  /** 该页是否被 robots 排除索引 —— 薄页里最需要区分的一类 */
  noindex: boolean;
}

function collect(distRoot: string): PageRec[] {
  const out: PageRec[] = [];
  for (const lang of ['en', 'zh']) {
    const langDir = join(distRoot, lang);
    if (!existsSync(langDir)) continue;
    const walk = (dir: string): void => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, e.name);
        if (e.isDirectory()) {
          walk(full);
          continue;
        }
        if (e.name !== 'index.html') continue;
        const rel = relative(distRoot, full).split(/[\\/]/).join('/');
        const kind = kindOf(lang, rel);
        if (!kind) continue;
        const html = readFileSync(full, 'utf8');
        const main = stripTags(mainOf(html));
        // ⭐ robots: noindex 的页**不参与索引**，因此不算「低价值内容风险」。
        //   把它们和可索引的薄页混在一张清单里 ⇒ 会误导编辑去「补厚」一个
        //   本来就不该被索引的壳页（P155 已修过 favorites/history/recent）。
        const noindex = /<meta[^>]*name=['"]robots['"][^>]*content=['"][^'"]*noindex/i.test(html);
        out.push({ lang, kind, rel, words: words(main), sh: shingles(main), noindex });
      }
    };
    walk(langDir);
  }
  return out;
}

function median(xs: number[]): number {
  const s = xs.slice().sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)]! : 0;
}

function main(): void {
  const argv = process.argv.slice(2);
  const jsonMode = argv.indexOf('--json') >= 0;
  const di = argv.indexOf('--dist');
  const distRoot = di >= 0 ? argv[di + 1]! : 'dist';
  if (!existsSync(distRoot)) {
    console.error('产物目录不存在: ' + distRoot + '（先跑 pnpm build）');
    process.exit(1);
  }

  const pages = collect(distRoot);
  if (!pages.length) {
    console.error('产物里没找到页面: ' + distRoot);
    process.exit(1);
  }

  const report: Record<string, unknown> = { distRoot, pageCount: pages.length, langs: {} };
  const lines: string[] = [];
  const p = (s: string): void => {
    lines.push(s);
  };

  p('='.repeat(78));
  p('P167 —— 复审视角站点体检');
  p('='.repeat(78));
  p('产物目录：' + distRoot);
  p('页面总数：' + pages.length);
  p('');

  for (const lang of ['en', 'zh']) {
    const lp = pages.filter((x) => x.lang === lang);
    if (!lp.length) continue;
    p('-'.repeat(78));
    p('【' + lang + '】' + lp.length + ' 页');
    p('');

    // ① 内容厚度（按 kind）
    p('  ① 内容厚度（政策第 1 条「提供真实高质量的信息工具服务」）');
    const kinds = ['tool', 'hub', 'topic', 'home', 'static', 'other'];
    const kindStats: Record<string, unknown> = {};
    for (const k of kinds) {
      const kp = lp.filter((x) => x.kind === k);
      if (!kp.length) continue;
      const ws = kp.map((x) => x.words);
      kindStats[k] = {
        pages: kp.length,
        min: Math.min(...ws),
        median: median(ws),
        max: Math.max(...ws),
      };
      p('    ' + k.padEnd(7) + String(kp.length).padStart(3) + ' 页　min ' + Math.min(...ws) + ' / 中位 ' + median(ws) + ' / max ' + Math.max(...ws));
    }
    p('');

    // ② 页面之间有多像
    p('  ② 页面之间有多像（5-gram Jaccard，按语言分组）');
    const simStats: Record<string, unknown> = {};
    for (const k of kinds) {
      const kp = lp.filter((x) => x.kind === k);
      if (kp.length < 2) continue;
      const pairs: { a: string; b: string; v: number }[] = [];
      for (let i = 0; i < kp.length; i++) {
        for (let j = i + 1; j < kp.length; j++) {
          pairs.push({ a: kp[i]!.rel, b: kp[j]!.rel, v: jaccard(kp[i]!.sh, kp[j]!.sh) * 100 });
        }
      }
      pairs.sort((x, y) => y.v - x.v);
      const vals = pairs.map((x) => x.v);
      const ts = templateShare(kp);
      simStats[k] = {
        pairs: pairs.length,
        templateShare: Number(ts.toFixed(2)),
        median: Number(median(vals).toFixed(2)),
        max: Number(Math.max(...vals).toFixed(2)),
        top: pairs.slice(0, 3).map((x) => ({ a: x.a, b: x.b, v: Number(x.v.toFixed(2)) })),
      };
      p('    ' + k.padEnd(7) + '组内模板词 ' + ts.toFixed(2) + '%　两两相似度 中位 ' + median(vals).toFixed(2) + '% / max ' + Math.max(...vals).toFixed(2) + '%');
      for (const x of pairs.slice(0, 3)) p('        ' + x.v.toFixed(2) + '%  ' + x.a + ' × ' + x.b);
    }
    p('');

    // ③ 页面独有 shingle 率（这页有多少内容是它自己的）
    p('  ③ 页面独有 shingle 率（该页 5-gram 中不出现在其它任何页的份额）');
    const globalCounts = new Map<string, number>();
    for (const pg of lp) {
      const c = new Map<string, number>();
      for (const g of pg.sh) c.set(g, (c.get(g) ?? 0) + 1);
      for (const [g, n] of c) globalCounts.set(g, (globalCounts.get(g) ?? 0) + n);
    }
    const uniqueRatios: number[] = [];
    const thin: { rel: string; kind: string; words: number; unique: number; noindex: boolean }[] = [];
    for (const pg of lp) {
      let unique = 0;
      for (const g of pg.sh) {
        if ((globalCounts.get(g) ?? 0) === 1) unique++;
      }
      const ratio = pg.sh.size ? unique / pg.sh.size : 0;
      uniqueRatios.push(ratio);
      if (unique < 200) thin.push({ rel: pg.rel, kind: pg.kind, words: pg.words, unique, noindex: pg.noindex });
    }
    p('    中位 ' + (median(uniqueRatios) * 100).toFixed(1) + '%　最小 ' + (Math.min(...uniqueRatios) * 100).toFixed(1) + '%');
    p('');

    // ④ 薄页清单（独有 shingle < 200）—— 区分「可索引」与「已 noindex」
    p('  ④ 薄页（独有 shingle < 200）—— 上一轮被判低价值时的具体形态');
    const indexable = thin.filter((t) => !t.noindex);
    const excluded = thin.filter((t) => t.noindex);
    p('    可索引的薄页：' + indexable.length + ' 页　　已 noindex（不参与索引，不构成风险）：' + excluded.length + ' 页');
    indexable.sort((a, b) => a.unique - b.unique);
    for (const t of indexable.slice(0, 12)) {
      p('      [可索引] ' + t.rel.padEnd(52) + ' 独有 ' + t.unique + ' / 正文 ' + t.words + ' 词');
    }
    if (indexable.length > 12) p('      … 还有 ' + (indexable.length - 12) + ' 页');
    for (const t of excluded) {
      p('      [noindex] ' + t.rel.padEnd(52) + ' 独有 ' + t.unique + ' / 正文 ' + t.words + ' 词');
    }
    p('');

    (report.langs as Record<string, unknown>)[lang] = {
      pages: lp.length, kindStats, simStats,
      uniqueShingleRateMedian: Number((median(uniqueRatios) * 100).toFixed(1)),
      thinPages: thin.length,
      thinIndexable: thin.filter((t) => !t.noindex).length,
      thinNoindex: thin.filter((t) => t.noindex).length,
      thinList: thin.map((t) => ({ rel: t.rel, kind: t.kind, unique: t.unique, words: t.words, noindex: t.noindex })),
    };
  }

  p('='.repeat(78));
  p('对照基线（P155 2026-10-26 构建，同口径项）：英文 hub 中位 655 / tool 中位 2,195');
  p('　　　　　　　hub 组内模板词 12.6%　　⭐ 本工具的价值在 --dist 的 A/B 对比');
  p('='.repeat(78));

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(lines.join(String.fromCharCode(10)));
  }
}

main();
