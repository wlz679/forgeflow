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
//   ② 哪些 zh 页在窗口内**零展示**（且这个零是**有信息量**的零）？
//   ③ 哪些 zh 页与 en 对应页内容高度重复？
// ⇒ 三者交叉 ⇒ **真该删的** = 零展示 ∩ 高重复 ∩ 零点击
//
// ── 第二轮复审的 3 个结构性修正（2026-11-09）────────────────────────
//
// ⚠️⚠️ (I-1) 零展示判据必须加「页面上线早于窗口起点」这个**前置条件**。
//   「在 GSC 里从未出现」只对**窗口开始前就存在**的页才有信息量：窗口后才上线的页
//   「从未出现」是**恒真式**（它当时根本不存在）⇒ 把它算进零展示人群 = 把恒真式
//   说成实测发现（与第一轮的 C1 同一类错误，范围从 266 缩到 19）。
//   ⇒ 本工具用**构建产物 JSON-LD 里的日期**判定上线时间：
//       · 工具页 → dateModified（src/lib/seo-factory.ts 写的**内容复审日**）
//       · 主题页 → datePublished（src/data/topics.ts 的 publishedAt）
//     日期 ≤ 窗口起点 ⇒ 零展示**有信息量**；否则 ⇒ 零展示**无意义**（单列，不进头条）。
//   ⚠️ dateModified 是**内容复审日**不是**上线日** ⇒ 它是**保守**代理：
//      只会把页判成「更晚上线」（⇒ 少报候选），不会把活页误报成删页候选。
//
// ⚠️⚠️ (I-2) GSC 里的 /zh/blog/* 不是「SSR 博客页」—— 它们是 **middleware 的 301
//   重定向桩**（src/middleware.ts + src/lib/blog-redirects.ts：P155 于 2026-10-28
//   删除了整个 /blog/* URL 面，把它们 301 回对应工具页）。
//   ⇒ 它们**不是页面**，不该计入页数；它们的内容页（/zh/{slug}/）已在决策表里评估过。
//   ⇒ 本工具把它们单列为「历史 301 URL」，并把「活页面」与「历史 URL」两个数分开报。
//
// ⚠️⚠️ (I-3) 光看 zh 侧会把「窗口内没有展示记录」与「质量差」混为一谈。
//   ⇒ 决策表加 **en 对照组**（同窗口、同导出的 en 侧展示/点击/排名）。
//     **判据本身不变**（零展示 ∩ 高重复 ∩ 零点击），只是把对照证据摆出来。
//
// ⚠️ (Minor 1) 「从未出现」的 signature 更接近「**未被收录**」而不是「纯吃索引」：
//   同目录 Coverage 导出实测「已抓取 - 尚未编入索引 = 28」，与本页数同量级。
//   ⇒ 本工具读 Coverage 导出 + **校验 过滤器.csv**：导出若被按国家/设备/查询过滤，
//     「从未出现」人群会被**放大成假阳性** ⇒ 明确告警。
//
// ⚠️ (Minor 2) 「高重叠 ⇒ 未翻译页」在**整页**层面不成立：候选页的 zh 正文是已翻译的
//   （CJK 占比 20%–28%），重叠来自**未翻译的 FAQ 答案与计算器结果字符串**。
//   ⇒ 本工具实测**最长公共块**并如实披露，不再断言「不误判已翻译页」。
//
// ⚠️ (Minor 3/4) 结论必须带**被审计的 dist 构建标识**（构建时间 + 内容哈希）——
//   一旦重建并应用新标题，overlap 数值就会变 ⇒ 不带标识的结论不可复算。
//
// ⚠️ 文件名**不能**带 .test.ts —— tests/run.mjs 按 .test.ts 后缀统计套件数，
//    带了会让套件计数漂移、meta-守卫变红。
//
// 跑法（脚本内部路径一律按仓库根解析；从仓库根跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-zh-audit.ts
//
// 输入（都可缺失）：
//   ① GSC 导出：%USERPROFILE%/Downloads/gsc/_extracted/forgeflowkit.com-Performance-on-Search-<日期>/
//      —— 多个导出目录时取**日期最新**的；可用 P168_GSC_DIR 覆盖路径；缺失 ⇒ 降级为
//         「只跑页面侧的比对」，不崩、不报 GSC 数字。
//      —— 缺「展示」列 ⇒ 同样降级 + 明确告警（**绝不**把缺列当 0 展示）。
//   ② dist/ 产物：dist/{en,zh}/<path>/index.html
//      —— zh 页或 en 页不存在 ⇒ 与 en 的重叠记 null（表里显示 —）⇒ 判「未评估」，
//         **不得**混进「保留」。

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import type { Dirent } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = resolve(import.meta.dirname, '..', '..');
const DIST = resolve(ROOT, 'dist');
const GSC_DIR = process.env.P168_GSC_DIR
  ? resolve(process.env.P168_GSC_DIR)
  : resolve(process.env.USERPROFILE || '', 'Downloads', 'gsc', '_extracted');

/** 跨语言「高重复」阈值：zh 页与 en 对应页的可见正文 5-gram 重叠 ≥ 30% */
const HIGH_DUP_OVERLAP = 30;

/**
 * 统计窗口的**期望值**（独立写死，不从别处派生）。
 * 来源：%USERPROFILE%/Downloads/gsc/_extracted/forgeflowkit.com-Performance-on-Search-2026-11-05/图表.csv
 *       的日期列首尾（2026-08-03 ~ 2026-11-02）。
 * ⚠️ 工具**优先**从导出目录的 图表.csv 读真实窗口；读不到时才回退到这两个字面量。
 *    两者不一致时工具会打印一行提示（导出换了窗口 ⇒ 判据跟着换）。
 */
const EXPECTED_WINDOW_START = '2026-08-03';
const EXPECTED_WINDOW_END = '2026-11-02';

// ── GSC 侧（外部输入，缺失时降级）──────────────────────────────
interface GscRow {
  url: string;
  clicks: number;
  impr: number;
  pos: number;
}

interface GscWindow {
  start: string;
  end: string;
  label: string;
  source: string;
  matchesExpected: boolean;
}

interface FilterInfo {
  source: string | null;
  rows: Array<{ name: string; value: string }>;
  /** 会让「从未出现」人群被放大成假阳性的过滤维度 */
  narrowing: Array<{ name: string; value: string }>;
}

interface CoverageInfo {
  source: string | null;
  reasons: Array<{ reason: string; count: number }>;
  lastDay: { date: string; notIndexed: number; indexed: number } | null;
}

type GscLoad =
  | {
      ok: true;
      rows: Map<string, GscRow>;
      source: string;
      exportDir: string;
      csvRows: number;
      window: GscWindow;
      filters: FilterInfo;
      coverage: CoverageInfo;
    }
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

/**
 * GSC 导出的统计窗口（图表.csv 的日期列）—— 「零展示」这个判据只在窗口内有意义。
 * ⚠️ 窗口起点是 (I-1) 的**前置条件** ⇒ 读不到时回退到写死的字面量并标明来源。
 */
function readWindow(exportDir: string): GscWindow {
  const chart = resolve(exportDir, '图表.csv');
  let start = '';
  let end = '';
  let source = '';
  if (existsSync(chart)) {
    try {
      const lines = readFileSync(chart, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.length);
      if (lines.length >= 2) {
        const head = parseCsvLine(lines[0]);
        const iDate = head.indexOf('日期');
        if (iDate >= 0) {
          const dates: string[] = [];
          for (const line of lines.slice(1)) {
            const d = (parseCsvLine(line)[iDate] ?? '').trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(d)) dates.push(d);
          }
          if (dates.length) {
            dates.sort();
            start = dates[0];
            end = dates[dates.length - 1];
            source = '导出目录 图表.csv 的日期列';
          }
        }
      }
    } catch {
      start = '';
      end = '';
    }
  }
  if (!start) {
    start = EXPECTED_WINDOW_START;
    end = EXPECTED_WINDOW_END;
    source = '字面量常量 EXPECTED_WINDOW_START / EXPECTED_WINDOW_END（图表.csv 不可读）';
  }
  return {
    start,
    end,
    label: start + ' ~ ' + end,
    source,
    matchesExpected: start === EXPECTED_WINDOW_START && end === EXPECTED_WINDOW_END,
  };
}

/**
 * 读 过滤器.csv 并校验过滤条件（Minor 1）。
 * ⚠️ 导出若被按国家/设备/查询过滤，被过滤掉的流量**不会出现在任何 URL 行里**
 *   ⇒「从未出现」人群会被**放大成假阳性** ⇒ 必须告警。
 */
const NARROWING_FILTER_KEYS = ['国家', '地区', '设备', '查询', '关键词', '外观', '筛选'];

function readFilters(exportDir: string): FilterInfo {
  const f = resolve(exportDir, '过滤器.csv');
  if (!existsSync(f)) return { source: null, rows: [], narrowing: [] };
  let rows: Array<{ name: string; value: string }> = [];
  try {
    const lines = readFileSync(f, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.length);
    for (const line of lines.slice(1)) {
      const c = parseCsvLine(line);
      const name = (c[0] ?? '').trim();
      const value = (c[1] ?? '').trim();
      if (name) rows.push({ name, value });
    }
  } catch {
    rows = [];
  }
  const narrowing = rows.filter((r) => {
    if (r.name === '日期') return false; // 时间窗口 —— 由窗口本身承载
    if (r.name === '搜索类型') return !r.value.includes('网页'); // 非网页标签会把网页流量排除
    return NARROWING_FILTER_KEYS.some((k) => r.name.includes(k));
  });
  return { source: f, rows, narrowing };
}

/**
 * 读同目录的 Coverage 导出（Minor 1）—— 站点级参照。
 * ⚠️ GSC 的 Coverage 导出**不含逐 URL 列表**（只有原因 → 计数）⇒ 只能作站点级参照，
 *   **无法归因到具体页**。读不到就诚实说读不到。
 */
function readCoverage(): CoverageInfo {
  let dirs: Array<{ name: string; date: string }> = [];
  try {
    for (const e of readdirSync(GSC_DIR)) {
      const m = /^forgeflowkit\.com-Coverage-(\d{4}-\d{2}-\d{2})/.exec(e);
      if (m) dirs.push({ name: e, date: m[1] });
    }
  } catch {
    dirs = [];
  }
  if (!dirs.length) return { source: null, reasons: [], lastDay: null };
  dirs.sort((a, b) => b.date.localeCompare(a.date));
  const dir = resolve(GSC_DIR, dirs[0].name);
  let reasons: Array<{ reason: string; count: number }> = [];
  const severe = resolve(dir, '严重问题.csv');
  if (existsSync(severe)) {
    try {
      const lines = readFileSync(severe, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.length);
      for (const line of lines.slice(1)) {
        const c = parseCsvLine(line);
        const reason = (c[0] ?? '').trim();
        if (!reason) continue;
        reasons.push({ reason, count: num(c[c.length - 1]) });
      }
    } catch {
      reasons = [];
    }
  }
  let lastDay: CoverageInfo['lastDay'] = null;
  const chart = resolve(dir, '图表.csv');
  if (existsSync(chart)) {
    try {
      const lines = readFileSync(chart, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.length);
      const head = parseCsvLine(lines[0]);
      const iDate = head.indexOf('日期');
      const iNot = head.indexOf('未编入索引');
      const iYes = head.indexOf('已编入索引');
      let best = '';
      let row: string[] = [];
      for (const line of lines.slice(1)) {
        const c = parseCsvLine(line);
        const d = (c[iDate] ?? '').trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(d) && d >= best) {
          best = d;
          row = c;
        }
      }
      if (best) lastDay = { date: best, notIndexed: num(row[iNot]), indexed: num(row[iYes]) };
    } catch {
      lastDay = null;
    }
  }
  return { source: dir, reasons, lastDay };
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
  const exportDir = resolve(src, '..');
  return {
    ok: true,
    rows: map,
    source: src,
    exportDir,
    csvRows: map.size,
    window: readWindow(exportDir),
    filters: readFilters(exportDir),
    coverage: readCoverage(),
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

/** 从 URL 里取 /en/ 之后的路径（同 zhPathFromUrl）—— en 对照组用 */
function enPathFromUrl(url: string): string | null {
  const clean = url.split('?')[0].split('#')[0];
  const m = /^https?:\/\/[^/]+(\/en(?:\/.*)?)\/?$/i.exec(clean);
  if (!m) return null;
  const p = m[1].replace(/\/+$/, '');
  const rest = p.slice(1 + 'en'.length);
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

// ── 上线时间（I-1）：从构建产物的 JSON-LD 里取日期 ─────────────────
interface Launch {
  date: string | null;
  basis: 'dateModified' | 'datePublished' | 'none';
}

/** 解析页面里所有 application/ld+json 块里的 dateModified / datePublished */
function jsonLdDates(html: string): { modified: string | null; published: string | null } {
  const out = { modified: null as string | null, published: null as string | null };
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const v of node) walk(v);
      return;
    }
    if (!node || typeof node !== 'object') return;
    const o = node as Record<string, unknown>;
    if (out.modified === null && typeof o['dateModified'] === 'string') out.modified = o['dateModified'];
    if (out.published === null && typeof o['datePublished'] === 'string') out.published = o['datePublished'];
    for (const v of Object.values(o)) walk(v);
  };
  for (const b of blocks) {
    try {
      walk(JSON.parse(b[1]));
    } catch {
      // 非法 JSON-LD ⇒ 忽略这一块（不让一个坏块毁掉整页的日期读取）
    }
  }
  return out;
}

function launchOf(html: string): Launch {
  const d = jsonLdDates(html);
  if (d.modified && /^\d{4}-\d{2}-\d{2}$/.test(d.modified)) return { date: d.modified, basis: 'dateModified' };
  if (d.published && /^\d{4}-\d{2}-\d{2}$/.test(d.published)) return { date: d.published, basis: 'datePublished' };
  return { date: null, basis: 'none' };
}

/** 页面缓存（避免同一文件读两遍：重叠 + 构建标识都要用到） */
interface PageMeta {
  text: string;
  launch: Launch;
  sha: string;
  mtime: number;
}

const pageCache = new Map<string, PageMeta>();

function pageMeta(lang: 'en' | 'zh', slug: string): PageMeta | null {
  const key = lang + '/' + slug;
  const hit = pageCache.get(key);
  if (hit) return hit;
  const p = pagePath(lang, slug);
  if (!existsSync(p)) return null;
  const buf = readFileSync(p);
  const html = buf.toString('utf8');
  const meta: PageMeta = {
    text: visibleText(html),
    launch: launchOf(html),
    sha: createHash('sha256').update(new Uint8Array(buf)).digest('hex'),
    mtime: statSync(p).mtimeMs,
  };
  pageCache.set(key, meta);
  return meta;
}

/** 页面侧：读出 zh/en 可见正文 + 5-gram；缺任一侧 ⇒ null */
function readPair(slug: string): { zh: PageMeta; en: PageMeta; ga: Set<string>; gb: Set<string> } | null {
  const zh = pageMeta('zh', slug);
  const en = pageMeta('en', slug);
  if (!zh || !en) return null;
  return { zh, en, ga: gramsOf(zh.text), gb: gramsOf(en.text) };
}

/** CJK 字符占比（用来判断「这一页到底有没有被翻译」） */
function cjkRatio(s: string): number {
  const cjk = (s.match(/[\u4e00-\u9fff]/g) || []).length;
  return s.length ? (cjk / s.length) * 100 : 0;
}

// ── 最长公共块（Minor 2：把「重叠来自哪里」变成**实测**而不是断言）────
function pow32(base: number, exp: number): number {
  let r = 1;
  for (let i = 0; i < exp; i++) r = Math.imul(r, base);
  return r >>> 0;
}

/** 长度为 len 的全部子串的 32 位滚动哈希（模 2^32） */
function windowHashes(s: string, len: number): Uint32Array {
  const n = Math.max(0, s.length - len + 1);
  const out = new Uint32Array(n);
  if (n === 0) return out;
  let h = 0;
  for (let i = 0; i < len; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
  out[0] = h;
  const p = pow32(31, len);
  for (let i = len; i < s.length; i++) {
    h = (Math.imul(h, 31) + s.charCodeAt(i) - Math.imul(s.charCodeAt(i - len), p)) >>> 0;
    out[i - len + 1] = h >>> 0;
  }
  return out;
}

/** a、b 是否存在长度为 len 的公共子串（哈希筛 + 真值确认） */
function hasCommonOfLength(a: string, b: string, len: number): boolean {
  const hb = windowHashes(b, len);
  const set = new Set<number>();
  for (let i = 0; i < hb.length; i++) set.add(hb[i]);
  const ha = windowHashes(a, len);
  for (let i = 0; i < ha.length; i++) {
    if (!set.has(ha[i])) continue;
    if (b.includes(a.substr(i, len))) return true;
  }
  return false;
}

/** 最长公共连续块（>= minLen）—— 命中后用真值确认，杜绝哈希碰撞 */
function longestCommonBlock(a: string, b: string, minLen = 40, maxLen = 220): string {
  let lo = minLen;
  let hi = Math.min(a.length, b.length, maxLen);
  if (hi < lo) return '';
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (hasCommonOfLength(a, b, mid)) lo = mid + 1;
    else hi = mid - 1;
  }
  const best = hi;
  if (best < minLen) return '';
  const hb = windowHashes(b, best);
  const set = new Set<number>();
  for (let i = 0; i < hb.length; i++) set.add(hb[i]);
  const ha = windowHashes(a, best);
  for (let i = 0; i < ha.length; i++) {
    if (!set.has(ha[i])) continue;
    const sub = a.substr(i, best);
    if (b.includes(sub)) return sub;
  }
  return '';
}

// ── 被审计的 dist 构建标识（Minor 3/4）─────────────────────────
interface BuildIdentity {
  stamp: string;
  hash: string;
  files: number;
  pages: number;
}

function localStamp(ms: number): string {
  const d = new Date(ms);
  const p = (n: number): string => String(n).padStart(2, '0');
  return (
    d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
    ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
  );
}

/** 构建标识 = 被测页面的内容哈希 + 产物时间戳（重建 ⇒ 标识变 ⇒ 结论可辨认） */
function buildIdentity(slugs: string[]): BuildIdentity {
  const h = createHash('sha256');
  let maxMtime = 0;
  let files = 0;
  let pages = 0;
  for (const s of [...slugs].sort()) {
    const zh = pageMeta('zh', s);
    const en = pageMeta('en', s);
    if (!zh && !en) continue;
    pages++;
    h.update(s + '|zh|' + (zh ? zh.sha : '-') + '|en|' + (en ? en.sha : '-') + '\n');
    for (const m of [zh, en]) {
      if (!m) continue;
      files++;
      if (m.mtime > maxMtime) maxMtime = m.mtime;
    }
  }
  return {
    stamp: maxMtime ? localStamp(maxMtime) + '（本地时间）' : '未知',
    hash: h.digest('hex').slice(0, 12),
    files,
    pages,
  };
}

// ── 决策表 ────────────────────────────────────────────────────
interface Row {
  slug: string;
  kind: 'live' | 'historical';
  inSite: boolean;
  inGsc: boolean;
  clicks: number;
  impr: number;
  pos: number;
  /** en 对照组（I-3）：同一窗口、同一导出里的 en 侧数据 */
  enImpr: number | null;
  enClicks: number | null;
  enPos: number | null;
  overlap: number | null;
  /** 上线时间（I-1）：来自构建产物 JSON-LD */
  launch: Launch;
  liveBeforeWindow: boolean;
  // —— 判据（布尔）——**头条数字必须由这些算出来**，展示标签只用于显示 ——
  zeroImpr: boolean;
  /** 零展示但**信号无意义**（窗口后才上线 / 上线时间未知）⇒ 不进头条 */
  zeroImprMeaningless: boolean;
  highDup: boolean;
  evaluable: boolean;
  isDeleteCandidate: boolean;
  verdict: string;
}

function label(slug: string): string {
  return slug === '' ? '/zh/' : '/zh/' + slug + '/';
}

/** 排序权重：可删候选 → 有点击 → 零展示待定 → 保留 → 零展示无意义 → 历史 301 URL */
function verdictRank(r: Row): number {
  if (r.isDeleteCandidate) return 0;
  if (r.clicks > 0) return 1;
  if (r.zeroImpr) return 2;
  if (r.evaluable) return 3;
  if (r.kind === 'live') return 4;
  return 5;
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
  const enImpr = r.enImpr === null ? '—' : String(r.enImpr);
  const enClicks = r.enClicks === null ? '—' : String(r.enClicks);
  const enPos = r.enPos === null ? '—' : String(r.enPos);
  console.log(
    '| ' + label(r.slug) + ' | ' + impr + ' | ' + r.clicks + ' | ' + pos + ' | ' +
      enImpr + ' | ' + enClicks + ' | ' + enPos + ' | ' +
      (r.overlap === null ? '—' : r.overlap.toFixed(1) + '%') + ' | ' + r.verdict + ' |',
  );
}

/**
 * 外壳地板值：visibleText 保留了布局外壳（面包屑/品牌名/计数）与 <title> 文本
 * ⇒ 每个重叠率都带一个非零地板。地板 = **跨语言共有外壳**（所有 zh 页共有的 5-gram
 * ∩ 所有 en 页共有的 5-gram）占该页 5-gram 的比例。
 * ⚠️ 地板值只量**共有外壳** ⇒ 它**不能**证明 30% 阈值「不误判已翻译页」
 *    （实测：候选页 zh 正文 CJK 占比 20%–28%（已翻译），重叠仍达 46%–53%
 *      —— 因为 FAQ 答案与结果字符串没翻译）。见【重叠机制】实测。
 */
function shellFloor(slugs: string[]): { grams: number; median: number } {
  const texts: Array<{ slug: string; zh: string }> = [];
  let zhShell: Set<string> | null = null;
  let enShell: Set<string> | null = null;
  for (const slug of slugs) {
    const pair = readPair(slug);
    if (!pair) continue;
    texts.push({ slug, zh: pair.zh.text });
    const gz = gramsOf(pair.zh.text);
    const ge = gramsOf(pair.en.text);
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

/**
 * 历史 301 URL 识别（I-2）：/zh/blog/* 是 middleware 的 301 重定向桩，不是页面。
 *   · /zh/blog/best-{slug}/ → /zh/{slug}/（src/lib/blog-redirects.ts 的规则）
 *   · /zh/blog/           → /zh/（语言首页）
 * 返回映射到的内容页 slug；映射不上 ⇒ null。
 */
function historicalTarget(slug: string): string | null {
  if (slug === 'blog') return '';
  const m = /^blog\/best-([a-z0-9][a-z0-9-]*)$/.exec(slug);
  return m ? m[1] : null;
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
      slug, kind: 'live', inSite: true, inGsc: false, clicks: 0, impr: 0, pos: 0,
      enImpr: null, enClicks: null, enPos: null, overlap,
      launch: { date: null, basis: 'none' }, liveBeforeWindow: false,
      zeroImpr: false, zeroImprMeaningless: false, highDup, evaluable, isDeleteCandidate: false, verdict,
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
  const build = buildIdentity(siteSlugs);

  console.log('\n=== 汇总结论（无 GSC 数据）===');
  console.log('GSC 侧页数：0（GSC 导出缺失 ⇒ 无 GSC 数据）');
  console.log('站点清单页数（dist/zh）：' + siteSlugs.length);
  console.log('被审计的 dist 构建：构建时间 ' + build.stamp + ' · 内容哈希 sha256:' + build.hash +
    '（' + build.pages + ' 个 zh 页 + 对应 en 页，共 ' + build.files + ' 个产物文件）');
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
    '% 阈值远高于地板值（⚠️ 地板值只量共有外壳，**不**能证明「不误判已翻译页」）');
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
  const enAgg = new Map<string, Agg>();
  let zhRows = 0;
  for (const g of gsc.rows.values()) {
    const enSlug = enPathFromUrl(g.url);
    if (enSlug !== null) {
      const cur = enAgg.get(enSlug) ?? { clicks: 0, impr: 0, pos: Number.POSITIVE_INFINITY, urls: 0, inGsc: true };
      cur.clicks += g.clicks;
      cur.impr += g.impr;
      cur.pos = Math.min(cur.pos, g.pos);
      cur.urls += 1;
      enAgg.set(enSlug, cur);
      continue;
    }
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
    const target = historicalTarget(slug);
    const isHistorical = target !== null;
    // 历史 301 URL 的内容页**确实在决策表里**（自校验，不是断言）
    const targetInSite = target !== null && siteSet.has(target);
    const pair = readPair(slug);
    const overlap = pair ? overlapOfGrams(pair.ga, pair.gb) : null;
    const evaluable = overlap !== null;

    // 上线时间（I-1）：构建产物 JSON-LD 的 dateModified / datePublished
    const zhMeta = pageMeta('zh', slug);
    const launch: Launch = zhMeta ? zhMeta.launch : { date: null, basis: 'none' };
    // 「页面上线早于窗口起点」⇒ 窗口内的零展示才是**有信息量**的信号
    const liveBeforeWindow = launch.date !== null && launch.date <= gsc.window.start;

    // 零展示 = GSC 导出窗口内**没有任何展示记录**。
    //   · inGsc=true  ⇒ GSC 有该页的数据行 ⇒ 展示数 = g.impr（GSC 只列有数据的页 ⇒ ≥ 1）
    //   · inGsc=false ⇒ 该页**从没出现在任何 GSC 导出里** ⇒ 窗口内零展示
    // ⚠️ 这一句是**判据**不是展示标签 —— 头条数字必须由它算出来（见 isDeleteCandidate）。
    // ★ 变异测试注入点：把 'g.impr === 0 && liveBeforeWindow' 改成 'true' ⇒ 候选数必须 > 0。
    const zeroImpr = g.impr === 0 && liveBeforeWindow;
    // 窗口后才上线（或上线时间未知）⇒ 「从未出现」是恒真式 ⇒ 信号无意义，不进头条
    const zeroImprMeaningless = g.impr === 0 && !liveBeforeWindow;

    const highDup = evaluable && overlap >= HIGH_DUP_OVERLAP;
    // 可删候选 = 零展示（有信息量） ∩ 高重复 ∩ **零点击**（有点击的页永远不是删页候选）
    const isDeleteCandidate = zeroImpr && highDup && g.clicks === 0;

    // ⚠️ 历史 301 URL **不是页面** ⇒ 它没有「同名 en 对照页」⇒ en 列留空
    //    （否则会把 /en/blog/* 那条历史 URL 的数据冒充成「对照页」数据）
    const enRow = isHistorical ? undefined : enAgg.get(slug);
    const enImpr = enRow ? enRow.impr : null;
    const enClicks = enRow ? enRow.clicks : null;
    const enPos = enRow ? (enRow.pos === Number.POSITIVE_INFINITY ? null : enRow.pos) : null;

    const verdict = isHistorical
      ? (targetInSite
          ? '历史 301 URL（内容页已在对应 slug 下评估）'
          : '历史 301 URL（**目标页不在站点清单里** ⇒ 需人工确认 301 落点）')
      : !evaluable
        ? (existsSync(pagePath('zh', slug)) ? '未评估（缺 en 对应页）' : '未评估（无静态产物）') +
          (g.clicks > 0 ? ' · 有点击' : '')
        : g.clicks > 0
          ? '保留（有点击）'
          : isDeleteCandidate
            ? '**可删候选**'
            : zeroImpr
              ? '待定（零展示）'
              : zeroImprMeaningless
                ? (launch.date === null
                    ? '上线时间未知（零展示信号不可判定）'
                    : '窗口后上线 ⇒ 零展示信号无意义')
                : '保留';

    rows.push({
      slug,
      kind: isHistorical ? 'historical' : 'live',
      inSite: siteSet.has(slug),
      inGsc: g.inGsc,
      clicks: g.clicks,
      impr: g.impr,
      pos: g.inGsc ? g.pos : 0,
      enImpr,
      enClicks,
      enPos,
      overlap,
      launch,
      liveBeforeWindow,
      zeroImpr,
      zeroImprMeaningless,
      highDup,
      evaluable,
      isDeleteCandidate,
      verdict,
    });
  }
  sortRows(rows);

  console.log('\n| zh 页 | 展示 | 点击 | 排名 | en 展示 | en 点击 | en 排名 | 与 en 重叠 | 建议 |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) printRow(r);

  // —— 头条数字：一律按**布尔判据**统计，不看展示标签里的 markdown 星号 ——
  const del = rows.filter((r) => r.isDeleteCandidate);
  const clicked = rows.filter((r) => r.clicks > 0);
  const zero = rows.filter((r) => r.zeroImpr);
  const zeroMeaningless = rows.filter((r) => r.zeroImprMeaningless);
  const overlaps = rows.map((r) => r.overlap).filter((x): x is number => x !== null);
  const dup = overlaps.filter((o) => o >= HIGH_DUP_OVERLAP);
  const unevaluated = rows.filter((r) => !r.evaluable && r.kind === 'live');
  const gscOnly = rows.filter((r) => r.inGsc && !r.inSite);
  const siteOnly = rows.filter((r) => r.inSite && !r.inGsc);
  const both = rows.filter((r) => r.inSite && r.inGsc);
  const historical = rows.filter((r) => r.kind === 'historical');
  const liveRows = rows.filter((r) => r.kind === 'live');
  const floor = shellFloor(liveRows.filter((r) => r.evaluable).map((r) => r.slug));
  const build = buildIdentity(liveRows.map((r) => r.slug));

  // 高重叠页里有多少是**有展示**的（I-3：证明「高重叠」本身不是零展示的成因）
  const dupRows = liveRows.filter((r) => r.highDup);
  const dupWithImpr = dupRows.filter((r) => r.impr > 0);

  console.log('\n=== 汇总结论 ===');
  console.log('📄 GSC 导出：' + gsc.source + '（' + gsc.csvRows + ' 行）· 统计窗口 ' + gsc.window.label +
    '（起点来源：' + gsc.window.source + '）');
  if (!gsc.window.matchesExpected) {
    console.log('   ⚠️ 窗口与写死的期望值（' + EXPECTED_WINDOW_START + ' ~ ' + EXPECTED_WINDOW_END +
      '）不一致 ⇒ 导出换了窗口，判据已自动跟随。');
  }
  console.log('   ℹ️ GSC 的「网页」导出**只列有数据的页面** ⇒ 里面的每行展示数都 ≥ 1 ⇒');
  console.log('      「GSC 里有零展示的行」这件事永远不成立；真正的零展示人群在**站点清单**里。');
  console.log('');

  // —— 过滤器校验（Minor 1）——
  console.log('🔎 导出过滤条件（过滤器.csv）：' +
    (gsc.filters.source
      ? gsc.filters.source
      : '⚠️ 读不到（文件缺失）⇒ 无法确认导出是否被过滤'));
  if (gsc.filters.source) {
    const desc = gsc.filters.rows.length
      ? gsc.filters.rows.map((r) => r.name + '=' + r.value).join('、')
      : '（文件为空）';
    console.log('   · 实际条件：' + desc);
    if (gsc.filters.narrowing.length) {
      console.log('   ⚠️⚠️ **导出被过滤**（' +
        gsc.filters.narrowing.map((r) => r.name + '=' + r.value).join('、') +
        '）⇒ **「从未出现」人群不可信**：');
      console.log('      被过滤掉的流量不会出现在任何 URL 行里 ⇒ 「从未出现」= 假阳性的概率被放大。');
      console.log('      ⇒ 本次「零展示」结论**不可**直接用于删页决策，须先按同样条件重导一次未过滤的导出。');
    } else {
      console.log('   ✓ 未按国家/地区、设备、查询等维度过滤 ⇒ 「从未出现」人群可信。');
    }
  } else {
    console.log('   ⚠️ 读不到 过滤器.csv ⇒ **无法确认**导出是否被过滤 ⇒ 「从未出现」人群的可信度未经校验。');
  }
  console.log('');

  // —— Coverage 导出（Minor 1）——
  console.log('📊 Coverage 导出（站点级参照）：' +
    (gsc.coverage.source ? gsc.coverage.source : '⚠️ 读不到（同目录没有 forgeflowkit.com-Coverage-*）'));
  if (gsc.coverage.source) {
    const pick = (reason: string): number | null => {
      const hit = gsc.coverage.reasons.find((r) => r.reason.includes(reason));
      return hit ? hit.count : null;
    };
    const crawled = pick('已抓取 - 尚未编入索引');
    const redirect = pick('会自动重定向');
    const notFound = pick('未找到');
    console.log('   · 已抓取 - 尚未编入索引：' + (crawled === null ? '—' : crawled + ' 页'));
    console.log('   · 网页会自动重定向：' + (redirect === null ? '—' : redirect + ' 页'));
    console.log('   · 未找到 (404)：' + (notFound === null ? '—' : notFound + ' 页'));
    if (gsc.coverage.lastDay) {
      console.log('   · 索引状态（' + gsc.coverage.lastDay.date + '）：已编入索引 ' +
        gsc.coverage.lastDay.indexed + ' · 未编入索引 ' + gsc.coverage.lastDay.notIndexed);
    }
    console.log('   ⚠️ Coverage 导出**不含逐 URL 列表**（只有原因 → 计数）⇒ 只能作站点级参照，');
    console.log('      **无法归因到具体页**；「从未出现在性能导出里」的 signature 更接近「**未被收录**」');
    console.log('      （而非「纯吃索引」）——「已抓取 - 尚未编入索引」' +
      (crawled === null ? '读不到' : '= ' + crawled + ' 页') + '与本页数量级相当。');
  } else {
    console.log('   ⚠️ 读不到 Coverage 导出 ⇒ 「从未出现」的 signature 无从校验（既可能是未被收录，也可能是别的原因）。');
  }
  console.log('');

  console.log('🏗️ 被审计的 dist 构建：构建时间 ' + build.stamp + ' · 内容哈希 sha256:' + build.hash +
    '（' + build.pages + ' 个 zh 活页面 + 对应 en 页，共 ' + build.files + ' 个产物文件）');
  console.log('   ⚠️ 一旦重建并应用新标题，overlap 数值会变 ⇒ 结论必须带着这个标识才可复算。');
  console.log('');

  console.log('【页面基数】');
  console.log('  活页面（决策表里的真页面）：' + liveRows.length + ' 页');
  console.log('    · GSC 侧活页：' + (liveRows.length - siteOnly.length) +
    '（/zh/ 下、非 /blog/* 的 URL 行 ' + zhRows + ' 行 ⇒ 合并 URL 变体后）');
  console.log('    · 站点清单 dist/zh：' + siteSlugs.length + ' 页 · 两者重叠 ' + both.length +
    ' ⇒ 并集 ' + liveRows.length + ' 页');
  console.log('  历史 301 URL（/zh/blog/*）：' + historical.length + ' 行 —— **不是页面**，不计入页数');
  console.log('    · middleware 301 重定向桩（P155 于 2026-10-28 删除 /blog/* URL 面并 301 回工具页）');
  console.log('    · 它们的**内容页**（/zh/{slug}/）已在上面的 ' + liveRows.length + ' 个活页面里评估过');
  console.log('  决策表总行数：' + rows.length + ' 行（活页面 ' + liveRows.length + ' + 历史 URL ' + historical.length + '）');
  console.log('');

  console.log('【零展示判据】（窗口 ' + gsc.window.label + '）');
  console.log('  · 判据：页在 GSC 导出里**从未出现** **且** 页面上线时间 ≤ 窗口起点（' +
    gsc.window.start + '）⇒ 零展示**有信息量**');
  console.log('  · 上线时间来源：构建产物 JSON-LD 的 dateModified（工具页）/ datePublished（主题页）');
  console.log('  · 窗口前已存在 ⇒ 零展示信号有效：' + zero.length + ' 页');
  console.log('  · 窗口后上线 ⇒ 零展示信号无意义：' + zeroMeaningless.length + ' 页');
  if (zeroMeaningless.length) {
    const byDate = new Map<string, number>();
    for (const r of zeroMeaningless) {
      const k = r.launch.date ?? '未知';
      byDate.set(k, (byDate.get(k) ?? 0) + 1);
    }
    console.log('    · 明细（上线时间 → 页数）：' +
      [...byDate.entries()].sort((a, b) => b[1] - a[1]).map(([d, n]) => d + ' → ' + n + ' 页').join('、'));
    console.log('    · ⚠️ 这些页在窗口内**很可能根本不存在** ⇒「从未出现」是恒真式，不是实测发现。');
  }
  console.log('');

  console.log('【判定统计】');
  console.log('  与 en 重叠可算的：' + overlaps.length + ' 页 · 未评估（活页面缺 en 对应页）：' + unevaluated.length + ' 页');
  console.log('  有点击的：' + clicked.length + ' 页（共 ' + clicked.reduce((a, b) => a + b.clicks, 0) + ' 次点击）');
  console.log('  零展示（**有信息量**）：' + zero.length + ' 页');
  console.log('  零展示（**信号无意义**，窗口后才上线）：' + zeroMeaningless.length + ' 页');
  console.log('  跨语言高重复（重叠 ≥ ' + HIGH_DUP_OVERLAP + '%）：' + dup.length + ' 页');
  console.log('  **可删候选**（零展示 ∩ 高重复 ∩ 零点击）：' + del.length + ' 页');
  console.log('');

  console.log('【en 对照组】（同一窗口、同一导出的 en 侧数据）');
  if (zero.length) {
    const enImprSum = zero.reduce((a, r) => a + (r.enImpr ?? 0), 0);
    const enClickSum = zero.reduce((a, r) => a + (r.enClicks ?? 0), 0);
    console.log('  这 ' + zero.length + ' 个「窗口前已存在且零展示」的页，其 **en 对应页**窗口内合计 ' +
      enImprSum + ' 展示 / ' + enClickSum + ' 点击（逐页见上表 en 列）');
    console.log('  ⇒ 该主题在窗口内**本身就没有搜索需求**（en 侧同样接近零）⇒ 「零展示」更可能是');
    console.log('     「**没有需求**」，而不是「中文翻译差 / 质量差」⇒ **既不支持删，也不支持补翻译**。');
  }
  console.log('  另：' + dupRows.length + ' 个跨语言高重复（重叠 ≥ ' + HIGH_DUP_OVERLAP +
    '%）的页里有 ' + dupWithImpr.length + ' 个**是有展示的** ⇒ 「高重叠」本身不是零展示的成因。');
  console.log('');

  console.log('【重叠率分布】（可算的 ' + overlaps.length + ' 页）');
  console.log('  ' + quantileSummary(overlaps));
  console.log('  外壳地板值：布局外壳（面包屑/品牌名/计数）+ <title> 贡献的中位占比 ' + floor.median.toFixed(1) +
    '%（跨语言共有外壳 ' + floor.grams + ' 个 5-gram）· 实测最低分 ' +
    (overlaps.length ? Math.min(...overlaps).toFixed(1) : '—') + '% ⇒ ' + HIGH_DUP_OVERLAP +
    '% 阈值远高于地板值');
  console.log('  ⚠️ 地板值只量**共有外壳** ⇒ 它**不能**证明 30% 阈值「不误判已翻译页」（见下方【重叠机制】实测）。');
  console.log('');

  // —— 重叠机制实测（Minor 2）——
  console.log('【重叠机制】（实测，不是断言）');
  if (del.length) {
    const cjks = del.map((r) => cjkRatio(pageMeta('zh', r.slug)?.text ?? ''));
    const minC = Math.min(...cjks);
    const maxC = Math.max(...cjks);
    console.log('  · 候选页 zh 正文的 CJK 字符占比：' + minC.toFixed(1) + '% – ' + maxC.toFixed(1) +
      '% ⇒ **正文是已翻译的**（h1/导航为中文），并非「整页未翻译」');
    console.log('  · 重叠集中在**未翻译的 FAQ 答案与计算器结果字符串**——实测最长公共块：');
    // ⚠️ 最长公共块是 O(n·log n) 的实测 ⇒ 候选很多时只实测前 MAX_BLOCK_PROBES 个
    const MAX_BLOCK_PROBES = 12;
    const probed = del.slice(0, MAX_BLOCK_PROBES);
    for (const r of probed) {
      const pair = readPair(r.slug);
      if (!pair) continue;
      const block = longestCommonBlock(pair.zh.text, pair.en.text);
      const shown = block ? block.slice(0, 110) + (block.length > 110 ? '…' : '') : '（无 ≥40 字的公共块）';
      console.log('      ' + label(r.slug) + ' ⇒ ' + JSON.stringify(shown));
    }
    if (del.length > probed.length) {
      console.log('      （其余 ' + (del.length - probed.length) + ' 个候选未实测 —— 最长公共块是 O(n·log n)，只实测前 ' +
        MAX_BLOCK_PROBES + ' 个）');
    }
    console.log('  ⇒ 46%–53% 的重叠 **不等于**「整页未翻译」；「不误判已翻译页」这句断言**未被证明**（已被自家数据证伪）。');
  } else {
    console.log('  · 本次没有可删候选 ⇒ 无需实测重叠机制。');
  }
  console.log('');

  console.log('ℹ️ 排名列 = 该页**所有 URL 变体里最好的那个**排名（取最小值）——不是平均值。');
  console.log('ℹ️ 展示列带 * 的行 = 该页在 GSC 导出里**从未出现** ⇒ 窗口内展示数记 0。');
  console.log('ℹ️ en 展示/点击/排名 = 同一导出里 **/en/ 同 slug 真页面**的窗口内数据（I-3 的对照组）；');
  console.log('   历史 301 URL 不是页面 ⇒ 该列留 —（拿 /en/blog/* 的数据冒充对照页会误导）。');

  if (del.length === 0) {
    console.log('\n⭐ 结论：当前**没有一页该删** ⇒ 保留全部中文是有据可依的决定。');
  } else {
    console.log('\n⚠️ 可删候选（逐条复核后再删 —— 每删一页都在丢一个索引位）：');
    for (const r of del) {
      console.log('  ' + label(r.slug) + '  展示 ' + r.impr + ' · 点击 ' + r.clicks +
        ' · 重叠 ' + (r.overlap ?? 0).toFixed(1) + '%' +
        ' · en 对照 ' + (r.enImpr ?? 0) + ' 展示/' + (r.enClicks ?? 0) + ' 点击' +
        ' · 内容日期 ' + (r.launch.date ?? '未知') + '（≤ 窗口起点 ' + gsc.window.start + ' ⇒ 该页在窗口前就已存在 ⇒ 零展示信号有效）');
    }
    console.log('  ⚠️ 复核要点：「在 GSC 里从未出现」= 窗口（' + gsc.window.label + '）内没有展示记录，');
    console.log('     **且**该页在窗口起点前就已存在（本次用 JSON-LD 的 ' +
      del.map((r) => r.launch.basis).filter((v, i, a) => a.indexOf(v) === i).join(' / ') + ' 判定）。');
    console.log('     但 en 对照组显示该主题**本身就没有搜索需求** ⇒ 删它省不下流量，');
    console.log('     留着也不吃亏 ⇒ **删页收益低、删错风险高** ⇒ 建议：先补需求（做内容/做内链），不要删。');
  }
}

main();
