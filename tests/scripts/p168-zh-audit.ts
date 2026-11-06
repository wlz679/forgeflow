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
// ⇒ 三者交叉 ⇒ **真该删的** = 零展示 ∩ 高重复 ∩ 零点击
//
// ⚠️⚠️ 零展示这一维度**必须**把「GSC 的 URL 集合」和「站点自己的页面清单」取**并集**：
//   GSC 的「网页」导出**只列有数据的页面** ⇒ 每一行的展示数都 ≥ 1 ⇒ 只遍历 GSC 的
//   URL 的话，「零展示」这一维度**永远不可能被观测到**（恒 0 的假结论），而且真正
//   零展示的页在结构上**不可见**。⇒ 站点清单里、但从没出现在任何 GSC 导出里的页，
//   才是真正的零展示人群。
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
//      —— 缺「展示」列 ⇒ 同样降级 + 明确告警（**绝不**把缺列当 0 展示）。
//   ② dist/ 产物：dist/{en,zh}/<path>/index.html
//      —— zh 页或 en 页不存在 ⇒ 与 en 的重叠记 null（表里显示 —）⇒ 判「未评估」，
//         **不得**混进「保留」。

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

type GscLoad =
  | { ok: true; rows: Map<string, GscRow>; source: string; csvRows: number; window: string }
  | { ok: false; reason: 'dir-missing' | 'no-export' | 'no-url-column' | 'no-impressions-column'; message: string };

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

/** GSC 导出的统计窗口（图表.csv 的日期列）—— 「零展示」这个判据只在窗口内有意义 */
function exportWindow(exportDir: string): string {
  const chart = resolve(exportDir, '图表.csv');
  if (!existsSync(chart)) return '未知';
  try {
    const lines = readFileSync(chart, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.length);
    if (lines.length < 2) return '未知';
    const head = parseCsvLine(lines[0]);
    const iDate = head.indexOf('日期');
    if (iDate < 0) return '未知';
    const dates: string[] = [];
    for (const line of lines.slice(1)) {
      const d = (parseCsvLine(line)[iDate] ?? '').trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) dates.push(d);
    }
    if (!dates.length) return '未知';
    dates.sort();
    return dates[0] + ' ~ ' + dates[dates.length - 1];
  } catch {
    return '未知';
  }
}

function readGsc(): GscLoad {
  if (!existsSync(GSC_DIR)) {
    return {
      ok: false,
      reason: 'dir-missing',
      message: '⚠️ 找不到 GSC 导出目录（' + GSC_DIR + '）⇒ 只跑页面侧的比对，不报 GSC 数字。',
    };
  }
  let src = '';
  for (const dir of perfCandidates()) {
    const csv = resolve(dir, '网页.csv');
    if (existsSync(csv)) {
      src = csv;
      break;
    }
  }
  if (!src) {
    return {
      ok: false,
      reason: 'no-export',
      message:
        '⚠️ GSC 导出目录（' + GSC_DIR + '）**存在**，但里面找不到性能导出「网页.csv」' +
        '⇒ 只跑页面侧的比对，不报 GSC 数字。',
    };
  }
  const raw = readFileSync(src, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter((l) => l.length);
  if (!lines.length) {
    return {
      ok: false,
      reason: 'no-export',
      message: '⚠️ GSC 导出（' + src + '）是空文件 ⇒ 只跑页面侧的比对，不报 GSC 数字。',
    };
  }
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
    return {
      ok: false,
      reason: 'no-url-column',
      message: '⚠️ GSC 导出（' + src + '）里找不到 URL 列（表头：' + head.join(' | ') + '）⇒ 跳过 GSC 侧。',
    };
  }
  if (iImpr < 0) {
    return {
      ok: false,
      reason: 'no-impressions-column',
      message:
        '⚠️ GSC 导出（' + src + '）里找不到「展示」列（表头：' + head.join(' | ') + '）' +
        '⇒ 零展示这一半判据无法判定 ⇒ 跳过 GSC 侧（退化为纯页面侧比对）。' +
        '**绝不**把缺列当成 0 展示（那会把有点击的页判成删页候选）。',
    };
  }
  const map = new Map<string, GscRow>();
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const url = (cells[iUrl] ?? '').trim();
    if (!url) continue;
    map.set(url, {
      url,
      clicks: iClicks >= 0 ? num(cells[iClicks]) : 0,
      impr: num(cells[iImpr]),
      pos: iPos >= 0 ? num(cells[iPos]) : 0,
    });
  }
  return {
    ok: true,
    rows: map,
    source: src,
    csvRows: map.size,
    window: exportWindow(resolve(src, '..')),
  };
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

function gramsOf(s: string): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i + 5 <= s.length; i++) out.add(s.slice(i, i + 5));
  return out;
}

function intersect(a: Set<string>, b: Set<string>): Set<string> {
  const small = a.size <= b.size ? a : b;
  const big = small === a ? b : a;
  const out = new Set<string>();
  for (const g of small) if (big.has(g)) out.add(g);
  return out;
}

function overlapOfGrams(ga: Set<string>, gb: Set<string>): number {
  if (!ga.size) return 0;
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
  // 语言前缀按**长度**切（不是按字面量 '/zh/'）⇒ '/ZH/foo' 也切得对
  const rest = p.slice(1 + 'zh'.length);
  return rest === '' ? '' : rest.replace(/^\/+/, '');
}

/** dist/{lang} 下所有页面（递归）的 slug 列表（语言首页的 slug 是 ''） */
function listPages(lang: 'en' | 'zh'): string[] {
  const out: string[] = [];
  const langRoot = resolve(DIST, lang);
  const rootKey = langRoot.replace(/\\/g, '/');
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
        // ⚠️ 路径分隔符必须归一化：Windows 上 resolve() 给的是 '\\'，正则要的是 '/'
        const rel = full.replace(/\\/g, '/').slice(rootKey.length + 1);
        out.push(rel === 'index.html' ? '' : rel.replace(/\/index\.html$/, ''));
      }
    }
  };
  walk(langRoot);
  return out;
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** 分位数（最近秩法：取第 ⌊p·N⌋ 个，0-based） */
function percentile(xs: number[], p: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}

function quantileSummary(xs: number[]): string {
  if (!xs.length) return '—';
  const s = [...xs].sort((a, b) => a - b);
  return (
    'min ' + s[0].toFixed(1) + '% · p25 ' + percentile(s, 0.25).toFixed(1) +
    '% · 中位 ' + percentile(s, 0.5).toFixed(1) +
    '% · p75 ' + percentile(s, 0.75).toFixed(1) +
    '% · max ' + s[s.length - 1].toFixed(1) + '%'
  );
}

// ── 决策表 ────────────────────────────────────────────────────
interface Row {
  slug: string;
  inSite: boolean;
  inGsc: boolean;
  clicks: number;
  impr: number;
  pos: number;
  overlap: number | null;
  // —— 判据（布尔）——**头条数字必须由这些算出来**，展示标签只用于显示 ——
  zeroImpr: boolean;
  highDup: boolean;
  evaluable: boolean;
  isDeleteCandidate: boolean;
  verdict: string;
}

function label(slug: string): string {
  return slug === '' ? '/zh/' : '/zh/' + slug + '/';
}

/** 排序权重：可删候选 → 有点击 → 零展示待定 → 保留 → 未评估 */
function verdictRank(r: Row): number {
  if (r.isDeleteCandidate) return 0;
  if (r.clicks > 0) return 1;
  if (r.zeroImpr) return 2;
  if (r.evaluable) return 3;
  return 4;
}

function sortRows(rows: Row[]): Row[] {
  return rows.sort(
    (a, b) =>
      verdictRank(a) - verdictRank(b) ||
      b.clicks - a.clicks ||
      (b.overlap ?? -1) - (a.overlap ?? -1) ||
      a.slug.localeCompare(b.slug),
  );
}

function printRow(r: Row): void {
  const impr = !r.inGsc ? '0*' : String(r.impr);
  const pos = !r.inGsc ? '—' : String(r.pos);
  console.log(
    '| ' + label(r.slug) + ' | ' + impr + ' | ' + r.clicks + ' | ' + pos + ' | ' +
      (r.overlap === null ? '—' : r.overlap.toFixed(1) + '%') + ' | ' + r.verdict + ' |',
  );
}

/** 页面侧：读出 zh/en 可见正文 + 5-gram；缺任一侧 ⇒ null */
function readPair(slug: string): { zh: string; en: string; ga: Set<string>; gb: Set<string> } | null {
  const zhPage = pagePath('zh', slug);
  const enPage = pagePath('en', slug);
  if (!existsSync(zhPage) || !existsSync(enPage)) return null;
  const zh = visibleText(readFileSync(zhPage, 'utf8'));
  const en = visibleText(readFileSync(enPage, 'utf8'));
  return { zh, en, ga: gramsOf(zh), gb: gramsOf(en) };
}

/**
 * 外壳地板值：visibleText 保留了布局外壳（面包屑/品牌名/计数）与 <title> 文本
 * ⇒ 每个重叠率都带一个非零地板。地板 = **跨语言共有外壳**（所有 zh 页共有的 5-gram
 * ∩ 所有 en 页共有的 5-gram）占该页 5-gram 的比例 —— 把它算出来并披露，
 * 才能证明 30% 阈值不会把「已翻译页」误判成高重复。
 */
function shellFloor(slugs: string[]): { grams: number; median: number } {
  const texts: Array<{ slug: string; zh: string; en: string }> = [];
  let zhShell: Set<string> | null = null;
  let enShell: Set<string> | null = null;
  for (const slug of slugs) {
    const pair = readPair(slug);
    if (!pair) continue;
    texts.push({ slug, zh: pair.zh, en: pair.en });
    const gz = gramsOf(pair.zh);
    const ge = gramsOf(pair.en);
    zhShell = zhShell === null ? gz : intersect(zhShell, gz);
    enShell = enShell === null ? ge : intersect(enShell, ge);
  }
  const cross = zhShell && enShell ? intersect(zhShell, enShell) : new Set<string>();
  const floors: number[] = [];
  for (const t of texts) {
    const gz = gramsOf(t.zh);
    let hit = 0;
    for (const g of cross) if (gz.has(g)) hit++;
    floors.push(gz.size ? (hit / gz.size) * 100 : 0);
  }
  return { grams: cross.size, median: median(floors) };
}

// ── 降级路径：没有 GSC 数据，只跑页面侧 ────────────────────────
function runPageSideOnly(siteSlugs: string[]): void {
  const rows: Row[] = [];
  for (const slug of siteSlugs) {
    const pair = readPair(slug);
    const overlap = pair ? overlapOfGrams(pair.ga, pair.gb) : null;
    const evaluable = overlap !== null;
    const highDup = evaluable && overlap >= HIGH_DUP_OVERLAP;
    const verdict = !evaluable
      ? (existsSync(pagePath('zh', slug)) ? '未评估（缺 en 对应页）' : '未评估（无静态产物）')
      : highDup
        ? '**重叠高（待 GSC 判据）**'
        : '保留';
    rows.push({
      slug, inSite: true, inGsc: false, clicks: 0, impr: 0, pos: 0, overlap,
      zeroImpr: false, highDup, evaluable, isDeleteCandidate: false, verdict,
    });
  }
  rows.sort((a, b) => (b.overlap ?? -1) - (a.overlap ?? -1) || a.slug.localeCompare(b.slug));

  console.log('\n| zh 页 | 与 en 重叠 | 建议 |');
  console.log('|---|---|---|');
  for (const r of rows) {
    console.log('| ' + label(r.slug) + ' | ' + (r.overlap === null ? '—' : r.overlap.toFixed(1) + '%') + ' | ' + r.verdict + ' |');
  }

  const overlaps = rows.map((r) => r.overlap).filter((x): x is number => x !== null);
  const dup = overlaps.filter((o) => o >= HIGH_DUP_OVERLAP);
  const floor = shellFloor(rows.filter((r) => r.evaluable).map((r) => r.slug));

  console.log('\n=== 汇总结论（无 GSC 数据）===');
  console.log('GSC 侧页数：0（GSC 导出缺失 ⇒ 无 GSC 数据）');
  console.log('站点清单页数（dist/zh）：' + siteSlugs.length);
  console.log('与 en 重叠可算的：' + overlaps.length + ' 页（口径与 GSC 模式**同一套页面侧** ⇒ 数量应一致）');
  console.log('未评估：' + (rows.length - overlaps.length) + ' 页（缺 en 对应页 ⇒ 记 —）');
  console.log('有点击的：未知（GSC 导出缺失）');
  console.log('零展示的：未知（GSC 导出缺失 ⇒ 零展示这一半判据不可判定）');
  console.log('**可删候选**（零展示 ∩ 高重复 ∩ 零点击）：无法判定（缺「零展示」这一半判据）');
  console.log('跨语言高重复（重叠 ≥ ' + HIGH_DUP_OVERLAP + '%）：' + dup.length + ' 页');
  console.log('重叠率分布：' + quantileSummary(overlaps));
  console.log('外壳地板值：布局外壳（面包屑/品牌名/计数）+ <title> 贡献的中位占比 ' + floor.median.toFixed(1) +
    '%（跨语言共有外壳 ' + floor.grams + ' 个 5-gram）· 实测最低分 ' +
    (overlaps.length ? Math.min(...overlaps).toFixed(1) : '—') + '% ⇒ ' + HIGH_DUP_OVERLAP +
    '% 阈值远高于地板值');
  console.log('\n💡 拿到 GSC 导出后重跑本工具，才能得出「该不该删某几页」的结论。');
}

function main(): void {
  const gsc = readGsc();
  if (!gsc.ok) {
    console.log(gsc.message);
    if (!existsSync(resolve(DIST, 'zh'))) {
      console.log('⚠️ dist/zh 不存在 ⇒ 没有站点清单可比对（先跑一次构建）。');
      return;
    }
    runPageSideOnly(listPages('zh').sort());
    return;
  }

  // ── GSC 侧：同一页可能有多个 URL 变体（www / 无尾斜杠）⇒ 按 /zh/ 路径合并 ──
  interface Agg {
    clicks: number;
    impr: number;
    pos: number;
    urls: number;
    inGsc: boolean;
  }
  const agg = new Map<string, Agg>();
  let zhRows = 0;
  for (const g of gsc.rows.values()) {
    const slug = zhPathFromUrl(g.url);
    if (slug === null) continue;
    zhRows++;
    const cur = agg.get(slug) ?? { clicks: 0, impr: 0, pos: Number.POSITIVE_INFINITY, urls: 0, inGsc: true };
    cur.clicks += g.clicks;
    cur.impr += g.impr;
    cur.pos = Math.min(cur.pos, g.pos);
    cur.urls += 1;
    agg.set(slug, cur);
  }

  // ── 站点侧：dist/zh 的页面清单（零展示人群的另一半来源）──────────
  const siteSlugs = listPages('zh').sort();
  const siteSet = new Set(siteSlugs);

  // ── 并集：GSC 的 URL 集合 ∪ 站点自己的页面清单 ──────────────────
  for (const slug of siteSlugs) {
    if (!agg.has(slug)) agg.set(slug, { clicks: 0, impr: 0, pos: 0, urls: 0, inGsc: false });
  }

  const rows: Row[] = [];
  for (const [slug, g] of agg) {
    const pair = readPair(slug);
    const overlap = pair ? overlapOfGrams(pair.ga, pair.gb) : null;
    const evaluable = overlap !== null;

    // 零展示 = GSC 导出窗口内**没有任何展示记录**。
    //   · inGsc=true  ⇒ GSC 有该页的数据行 ⇒ 展示数 = g.impr（GSC 只列有数据的页 ⇒ ≥ 1）
    //   · inGsc=false ⇒ 该页**从没出现在任何 GSC 导出里** ⇒ 窗口内零展示（这才是真人群）
    // ⚠️ 这一句是**判据**不是展示标签 —— 头条数字必须由它算出来（见 isDeleteCandidate）。
    const zeroImpr = g.impr === 0;

    const highDup = evaluable && overlap >= HIGH_DUP_OVERLAP;
    // 可删候选 = 零展示 ∩ 高重复 ∩ **零点击**（有点击的页永远不是删页候选）
    const isDeleteCandidate = zeroImpr && highDup && g.clicks === 0;
    const verdict = !evaluable
      ? (existsSync(pagePath('zh', slug)) ? '未评估（缺 en 对应页）' : '未评估（无静态产物）') +
        (g.clicks > 0 ? ' · 有点击' : '')
      : g.clicks > 0
        ? '保留（有点击）'
        : isDeleteCandidate
          ? '**可删候选**'
          : zeroImpr
            ? '待定（零展示）'
            : '保留';
    rows.push({
      slug,
      inSite: siteSet.has(slug),
      inGsc: g.inGsc,
      clicks: g.clicks,
      impr: g.impr,
      pos: g.inGsc ? g.pos : 0,
      overlap,
      zeroImpr,
      highDup,
      evaluable,
      isDeleteCandidate,
      verdict,
    });
  }
  sortRows(rows);

  console.log('\n| zh 页 | 展示 | 点击 | 排名 | 与 en 重叠 | 建议 |');
  console.log('|---|---|---|---|---|---|');
  for (const r of rows) printRow(r);

  // —— 头条数字：一律按**布尔判据**统计，不看展示标签里的 markdown 星号 ——
  const del = rows.filter((r) => r.isDeleteCandidate);
  const clicked = rows.filter((r) => r.clicks > 0);
  const zero = rows.filter((r) => r.zeroImpr);
  const zeroInGsc = zero.filter((r) => r.inGsc);
  const zeroNotInGsc = zero.filter((r) => !r.inGsc);
  const overlaps = rows.map((r) => r.overlap).filter((x): x is number => x !== null);
  const dup = overlaps.filter((o) => o >= HIGH_DUP_OVERLAP);
  const unevaluated = rows.filter((r) => !r.evaluable);
  const gscOnly = rows.filter((r) => r.inGsc && !r.inSite);
  const siteOnly = rows.filter((r) => r.inSite && !r.inGsc);
  const both = rows.filter((r) => r.inSite && r.inGsc);
  const floor = shellFloor(rows.filter((r) => r.evaluable).map((r) => r.slug));

  console.log('\n=== 汇总结论 ===');
  console.log('📄 GSC 导出：' + gsc.source + '（' + gsc.csvRows + ' 行）· 统计窗口 ' + gsc.window);
  console.log('   ℹ️ GSC 的「网页」导出**只列有数据的页面** ⇒ 里面的每行展示数都 ≥ 1 ⇒');
  console.log('      「GSC 里有零展示的行」这件事永远不成立；真正的零展示人群在**站点清单**里。');
  console.log('');
  console.log('【页面基数】');
  console.log('  GSC 侧页数：' + (rows.length - siteOnly.length) + ' 页（GSC 里的 zh URL 行 ' + zhRows + ' 行 ⇒ 合并 URL 变体后）');
  console.log('  站点清单页数（dist/zh）：' + siteSlugs.length + ' 页');
  console.log('  决策表并集：' + rows.length + ' 页（GSC 侧 ' + (rows.length - siteOnly.length) +
    ' + 站点清单 ' + siteSlugs.length + ' - 重叠 ' + both.length + '）');
  console.log('  ⚠️ 差异说明：');
  console.log('     · GSC 侧 ' + gscOnly.length + ' 页在 dist 里**没有静态产物**（SSR 博客页，prerender=false）⇒ 无法比对 en ⇒ 判「未评估」；');
  console.log('     · 站点清单 ' + siteOnly.length + ' 页在 GSC 导出（窗口 ' + gsc.window + '）里**从未出现** ⇒ 这才是真正的零展示人群。');
  console.log('');
  console.log('【判定统计】');
  console.log('  与 en 重叠可算的：' + overlaps.length + ' 页 · 未评估：' + unevaluated.length + ' 页');
  console.log('  有点击的：' + clicked.length + ' 页（共 ' + clicked.reduce((a, b) => a + b.clicks, 0) + ' 次点击）');
  console.log('  零展示的：' + zero.length + ' 页 = GSC 有记录的 ' + zeroInGsc.length +
    ' 页 + GSC 里**从未出现**的 ' + zeroNotInGsc.length + ' 页');
  console.log('  跨语言高重复（重叠 ≥ ' + HIGH_DUP_OVERLAP + '%）：' + dup.length + ' 页');
  console.log('  **可删候选**（零展示 ∩ 高重复 ∩ 零点击）：' + del.length + ' 页');
  console.log('');
  console.log('【重叠率分布】（可算的 ' + overlaps.length + ' 页）');
  console.log('  ' + quantileSummary(overlaps));
  console.log('  ⇒ 双峰：低峰 = 已翻译页（与 en 只共享外壳），高峰 = 未翻译/雷同页。');
  console.log('  外壳地板值：布局外壳（面包屑/品牌名/计数）+ <title> 贡献的中位占比 ' + floor.median.toFixed(1) +
    '%（跨语言共有外壳 ' + floor.grams + ' 个 5-gram）· 实测最低分 ' +
    (overlaps.length ? Math.min(...overlaps).toFixed(1) : '—') + '% ⇒ ' + HIGH_DUP_OVERLAP +
    '% 阈值远高于地板值，不误判已翻译页');
  console.log('');
  console.log('ℹ️ 排名列 = 该页**所有 URL 变体里最好的那个**排名（取最小值）——不是平均值。');
  console.log('ℹ️ 展示列带 * 的行 = 该页在 GSC 导出里**从未出现** ⇒ 窗口内展示数记 0。');

  if (del.length === 0) {
    console.log('\n⭐ 结论：当前**没有一页该删** ⇒ 保留全部中文是有据可依的决定。');
  } else {
    console.log('\n⚠️ 可删候选（逐条复核后再删 —— 每删一页都在丢一个索引位）：');
    for (const r of del) {
      console.log('  ' + label(r.slug) + '  展示 ' + r.impr + ' · 重叠 ' + r.overlap?.toFixed(1) +
        '% · GSC 中从未出现');
    }
    console.log('  ⚠️ 复核要点：「在 GSC 里从未出现」= 窗口（' + gsc.window + '）内没有展示记录。');
    console.log('     这既可能是页面质量/收录问题，也可能是上线太晚 ⇒ 逐条确认上线时间与线上可访问性后再决定。');
  }
  if (zeroInGsc.length === 0) {
    console.log('\n📌 注意：GSC 有记录的 ' + (rows.length - siteOnly.length) + ' 页里零展示 = 0 页 —— 这是**导出格式的必然**');
    console.log('   （GSC 只列有数据的页），**不是**实测发现；真正的零展示人群在站点清单的 ' +
      zeroNotInGsc.length + ' 页里 ⇒ 这 ' + zeroNotInGsc.length + ' 页才是本次审计的删页候选来源。');
  }
}

main();
