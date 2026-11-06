// P168 B3-2 —— 中文页质量审计（入库 —— 验收数字必须可复算）。
//
// ⭐ 为什么入库（不留在 tmp/）
//   站主问过「网站是给外国人看的，要不要把中文内容全删掉？」⇒ 拍板「保留全部中文，
//   先做审计再决定删哪部分」。本工具就是那「再决定」的依据 ⇒ 结论必须**可复算**，
//   不能只活在作者的 tmp/ 里。
//
// ⚠️ 判据不能只看 zh 页自己 —— 「重复」的判据是**跨语言重复**
//   （zh 页与 en 对应页内容雷同），不是单页质量。
// ⇒ 工具**成对比较**：每个 zh 页 ↔ en 对应页。
//
// 回答三个问题：
//   ① zh 侧哪些页真在带来点击/排名？
//   ② 哪些 zh 页零展示（纯吃索引）？
//   ③ 哪些 zh 页与 en 对应页内容高度重复？
// ⇒ 三者交叉 ⇒ **真该删的** = 零展示 ∩ 高重复
//
// ⚠️ 文件名**不能**带 .test.ts —— tests/run.mjs 按 .test.ts 后缀统计套件数，
//    带了会让套件计数漂移、meta-守卫变红。
//
// 跑法（脚本内部路径一律按仓库根解析；从仓库根跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-zh-audit.ts
//
// 输入（都可缺失）：
//   ① GSC 导出：%USERPROFILE%/Downloads/gsc/_extracted/forgeflowkit.com-Performance-on-Search-<日期>/网页.csv
//      —— 多个导出目录时取**日期最新**的；可用 P168_GSC_DIR 覆盖路径；缺失 ⇒ 降级为
//         「只跑页面侧的比对」，不崩、不报 GSC 数字。
//   ② dist/ 产物：dist/{en,zh}/<path>/index.html
//      —— zh 页或 en 页不存在 ⇒ 与 en 的重叠记 null（表里显示 —），不是 0。

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import type { Dirent } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const DIST = resolve(ROOT, 'dist');
const GSC_DIR = process.env.P168_GSC_DIR
  ? resolve(process.env.P168_GSC_DIR)
  : resolve(process.env.USERPROFILE || '', 'Downloads', 'gsc', '_extracted');

/** 跨语言「高重复」阈值：zh 页与 en 对应页的可见正文 5-gram 重叠 ≥ 30% */
const HIGH_DUP_OVERLAP = 30;

// ── GSC 侧（外部输入，缺失时降级）──────────────────────────────
interface GscRow {
  url: string;
  clicks: number;
  impr: number;
  pos: number;
}

/** 导出目录名里的日期（目录名尾部是 YYYY-MM-DD） */
function perfDate(name: string): string {
  const m = /^forgeflowkit\.com-Performance-on-Search-(\d{4}-\d{2}-\d{2})/.exec(name);
  return m ? m[1] : '';
}

/** 同日期的重复下载副本（目录名尾部是 " (1)"）排在原始导出之后 */
function isCopy(name: string): boolean {
  return / \(\d+\)$/.test(name);
}

/** 候选导出目录：日期最新优先；同日取非副本 */
function perfCandidates(): string[] {
  let entries: string[] = [];
  try {
    entries = readdirSync(GSC_DIR);
  } catch {
    return [];
  }
  return entries
    .filter((e) => perfDate(e) !== '')
    .sort((a, b) => {
      const d = perfDate(b).localeCompare(perfDate(a));
      if (d !== 0) return d;
      const c = Number(isCopy(a)) - Number(isCopy(b));
      if (c !== 0) return c;
      return a.localeCompare(b);
    })
    .map((e) => resolve(GSC_DIR, e));
}

/** 手写 CSV 行解析（brief 指定；GSC 导出可能带引号） */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          q = false;
        }
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function num(cell: string | undefined): number {
  return Number(String(cell ?? '').replace(/[,%\s]/g, '')) || 0;
}

function readGsc(): Map<string, GscRow> | null {
  if (!existsSync(GSC_DIR)) return null;
  let raw = '';
  let src = '';
  for (const dir of perfCandidates()) {
    const csv = resolve(dir, '网页.csv');
    if (existsSync(csv)) {
      raw = readFileSync(csv, 'utf8').replace(/^\uFEFF/, '');
      src = csv;
      break;
    }
  }
  if (!src) return null;
  const lines = raw.split(/\r?\n/).filter((l) => l.length);
  if (!lines.length) return null;
  const head = parseCsvLine(lines[0]);
  const idx = (aliases: string[]): number => {
    for (const a of aliases) {
      const i = head.indexOf(a);
      if (i >= 0) return i;
    }
    return -1;
  };
  const iUrl = idx(['排名靠前的网页', '排名靠前的网址', '网页', 'Top pages']);
  const iClicks = idx(['点击次数', 'Clicks']);
  const iImpr = idx(['展示', '展示次数', 'Impressions']);
  const iPos = idx(['排名', '平均排名', 'Position']);
  if (iUrl < 0) {
    console.log('⚠️ GSC 导出（' + src + '）里找不到 URL 列（表头：' + head.join(' | ') + '）⇒ 跳过 GSC 侧。');
    return null;
  }
  const map = new Map<string, GscRow>();
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const url = (cells[iUrl] ?? '').trim();
    if (!url) continue;
    map.set(url, {
      url,
      clicks: iClicks >= 0 ? num(cells[iClicks]) : 0,
      impr: iImpr >= 0 ? num(cells[iImpr]) : 0,
      pos: iPos >= 0 ? num(cells[iPos]) : 0,
    });
  }
  console.log('📄 GSC 导出：' + src + '（' + map.size + ' 行）');
  return map;
}

// ── 页面侧：zh 页 ↔ en 对应页的可见正文 5-gram 重叠 ──────────────
function visibleText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function overlapRatio(a: string, b: string): number {
  const grams = (s: string) => {
    const out = new Set<string>();
    for (let i = 0; i + 5 <= s.length; i++) out.add(s.slice(i, i + 5));
    return out;
  };
  const ga = grams(a);
  if (!ga.size) return 0;
  const gb = grams(b);
  let hit = 0;
  for (const g of ga) if (gb.has(g)) hit++;
  return (hit / ga.size) * 100;
}

/** dist/{lang}/{slug}/index.html（slug 为 '' ⇒ 语言首页） */
function pagePath(lang: 'en' | 'zh', slug: string): string {
  return slug === '' ? resolve(DIST, lang, 'index.html') : resolve(DIST, lang, ...slug.split('/'), 'index.html');
}

/** 从 URL 里取 /zh/ 之后的路径（去掉尾部 '/'；'/zh' ⇒ '' 即语言首页） */
function zhPathFromUrl(url: string): string | null {
  const clean = url.split('?')[0].split('#')[0];
  const m = /^https?:\/\/[^/]+(\/zh(?:\/.*)?)\/?$/i.exec(clean);
  if (!m) return null;
  const p = m[1].replace(/\/+$/, '');
  return p === '/zh' ? '' : p.slice('/zh/'.length);
}

/** dist/zh 下所有页面（递归）的 slug 列表 */
function listPages(lang: 'en' | 'zh'): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    let entries: Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = resolve(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name === 'index.html') {
        const rel = resolve(dir, '..').replace(/\\/g, '/');
        const relLang = resolve(DIST, lang).replace(/\\/g, '/');
        out.push(full.slice(relLang.length + 1).replace(/\/index\.html$/, ''));
      }
    }
  };
  walk(resolve(DIST, lang));
  return out;
}

// ── 决策表 ────────────────────────────────────────────────────
interface Row {
  slug: string;
  clicks: number;
  impr: number;
  pos: number;
  overlap: number | null;
  verdict: string;
}

function label(slug: string): string {
  return slug === '' ? '/zh/' : '/zh/' + slug + '/';
}

function overlapOf(slug: string): number | null {
  const zhPage = pagePath('zh', slug);
  const enPage = pagePath('en', slug);
  if (!existsSync(zhPage) || !existsSync(enPage)) return null;
  return overlapRatio(visibleText(readFileSync(zhPage, 'utf8')), visibleText(readFileSync(enPage, 'utf8')));
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function runPageSideOnly(): void {
  const slugs = listPages('zh').sort();
  const rows = slugs
    .map((slug) => ({ slug, overlap: overlapOf(slug) }))
    .filter((r) => r.overlap !== null) as Array<{ slug: string; overlap: number }>;
  rows.sort((a, b) => b.overlap - a.overlap || a.slug.localeCompare(b.slug));

  console.log('\n| zh 页 | 与 en 重叠 |');
  console.log('|---|---|');
  for (const r of rows) {
    console.log('| ' + label(r.slug) + ' | ' + r.overlap.toFixed(1) + '% |');
  }

  const dup = rows.filter((r) => r.overlap >= HIGH_DUP_OVERLAP);
  console.log('\n=== 汇总结论（无 GSC 数据）===');
  console.log('zh 页总数（有 GSC 数据）：0（GSC 导出缺失 ⇒ 无 GSC 数据）');
  console.log('有点击的：未知（GSC 导出缺失）');
  console.log('零展示的：未知（GSC 导出缺失）');
  console.log('**可删候选**（零展示 ∩ 与 en 高重复）：无法判定（缺「零展示」这一半判据）');
  console.log('dist/zh 下可比对的页面：' + rows.length + '（其中与 en 重叠 ≥ ' + HIGH_DUP_OVERLAP + '% 的有 ' + dup.length + ' 页）');
  console.log('最高重叠：' + (rows.length ? rows[0].overlap.toFixed(1) + '%（' + label(rows[0].slug) + '）' : '—'));
  console.log('\n💡 拿到 GSC 导出后重跑本工具，才能得出「该不该删某几页」的结论。');
}

function main(): void {
  const gsc = readGsc();
  if (!gsc) {
    console.log('⚠️ 找不到 GSC 导出目录（' + GSC_DIR + '）⇒ 只跑页面侧的比对，不报 GSC 数字。');
    runPageSideOnly();
    return;
  }

  // 同一页可能有多个 URL 变体（www / 无尾斜杠）⇒ 按 /zh/ 路径合并
  interface Agg {
    clicks: number;
    impr: number;
    pos: number;
    urls: number;
  }
  const agg = new Map<string, Agg>();
  let zhRows = 0;
  for (const g of gsc.values()) {
    const slug = zhPathFromUrl(g.url);
    if (slug === null) continue;
    zhRows++;
    const cur = agg.get(slug) ?? { clicks: 0, impr: 0, pos: Number.POSITIVE_INFINITY, urls: 0 };
    cur.clicks += g.clicks;
    cur.impr += g.impr;
    cur.pos = Math.min(cur.pos, g.pos);
    cur.urls += 1;
    agg.set(slug, cur);
  }

  const rows: Row[] = [];
  for (const [slug, g] of agg) {
    const overlap = overlapOf(slug);
    const zeroImpr = g.impr === 0;
    const highDup = overlap !== null && overlap >= HIGH_DUP_OVERLAP;
    const verdict =
      zeroImpr && highDup
        ? '**可删候选**'
        : g.clicks > 0
          ? '保留（有点击）'
          : zeroImpr
            ? '待定（零展示）'
            : '保留';
    rows.push({ slug, clicks: g.clicks, impr: g.impr, pos: g.pos, overlap, verdict });
  }

  rows.sort((a, b) => b.clicks - a.clicks || a.slug.localeCompare(b.slug));

  console.log('\n| zh 页 | 展示 | 点击 | 排名 | 与 en 重叠 | 建议 |');
  console.log('|---|---|---|---|---|---|');
  for (const r of rows) {
    console.log(
      '| ' + label(r.slug) + ' | ' + r.impr + ' | ' + r.clicks + ' | ' + r.pos + ' | ' +
        (r.overlap === null ? '—' : r.overlap.toFixed(1) + '%') + ' | ' + r.verdict + ' |',
    );
  }

  const del = rows.filter((r) => r.verdict.startsWith('**'));
  const clicked = rows.filter((r) => r.clicks > 0);
  const zero = rows.filter((r) => r.impr === 0);
  const overlaps = rows.map((r) => r.overlap).filter((x): x is number => x !== null);
  const dup = overlaps.filter((o) => o >= HIGH_DUP_OVERLAP);

  console.log('\n=== 汇总结论 ===');
  console.log('zh 页总数（有 GSC 数据）：' + rows.length + '（GSC 里的 zh URL 行 ' + zhRows + ' 行 ⇒ 合并 URL 变体后 ' + rows.length + ' 页）');
  console.log('有点击的：' + clicked.length + '（共 ' + clicked.reduce((a, b) => a + b.clicks, 0) + ' 次点击）');
  console.log('零展示的：' + zero.length);
  console.log('**可删候选**（零展示 ∩ 与 en 高重复）：' + del.length);
  console.log(
    '与 en 重叠可算的：' + overlaps.length + ' 页（其余 ' + (rows.length - overlaps.length) +
      ' 页 dist 里缺 zh/en 对应页 ⇒ 记 —）· 中位重叠 ' + median(overlaps).toFixed(1) + '% · 最高 ' +
      (overlaps.length ? Math.max(...overlaps).toFixed(1) : '0') + '%',
  );
  console.log('跨语言高重复（重叠 ≥ ' + HIGH_DUP_OVERLAP + '%）：' + dup.length + ' 页');
  console.log('💡 「重叠高」＝ zh 页里大量正文仍是英文（未翻译 / 与 en 雷同）⇒ 是**翻译完整度**信号；');
  console.log('   删页判据仍是「零展示 ∩ 高重复」两条件同时成立，单看重叠不构成删页依据。');

  if (del.length === 0) {
    console.log('\n⭐ 结论：当前**没有一页该删** ⇒ 保留全部中文是有据可依的决定。');
  } else {
    console.log('\n⚠️ 可删候选（逐条复核后再删 —— 每删一页都在丢一个索引位）：');
    for (const r of del) console.log('  ' + label(r.slug) + '  展示 ' + r.impr + ' · 重叠 ' + r.overlap?.toFixed(1) + '%');
  }
}

main();
