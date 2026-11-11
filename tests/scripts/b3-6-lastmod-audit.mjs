#!/usr/bin/env node
// P168 B3-6 —— sitemap lastmod 真实性体检（**入库**，验收数字必须可复算）
//
// 为什么需要它
// ------------
// B3-6 的根因是：`getMtimeForHtmlPath` 100% 返回 null ⇒ 全部回退到构建时刻
// ⇒ **每次部署都告诉 Google「431 个页面全部是新的」** ⇒ 抓取预算被打散
// ⇒ 索引率从 65% 一路跌到 41.8%。
//
// ⚠️ 本工具的判据**不看代理指标**（例如「有几种 lastmod 取值」），
//   只看**不变量**：lastmod 必须等于某个 `src/` 内容源文件的 **git 内容变更时间**。
//   因为「内容今天真变了」与「lastmod = 构建时刻」在时间上无法区分 ⇒
//   唯一可判定的口径就是「是不是某个真实提交的时间」。
//
// 跑法（**必须从仓库根跑**）：
//   node tests/scripts/b3-6-lastmod-audit.mjs
//   node tests/scripts/b3-6-lastmod-audit.mjs --json

import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join, relative } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const AS_JSON = process.argv.includes('--json');

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

/**
 * 用**一次** git 调用建「文件 → 最后一次内容变更时间」的表。
 *
 * `git log --format=%ct --name-only -- src/` 的输出形如：
 *   <ct>\n\n<file1>\n<file2>\n<ct>\n\n<file3>...
 * git log 是**新 → 旧** ⇒ 文件**第一次**出现的那次提交就是它的最后变更时间。
 *
 * ⚠️ 为什么用一次调用而不是「每个文件一次 git log」：
 *   实测前者 141 KB / < 1 秒，后者需要 1000+ 次进程 spawn（实测单条断言就要 61 秒）。
 */
function buildGitTimeTable() {
  const out = git(['log', '--format=%ct', '--name-only', '--', 'src/']);
  const map = new Map();
  let cur = null;
  for (const raw of out.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (/^\d+$/.test(line)) { cur = Number(line) * 1000; continue; }
    if (cur !== null && !map.has(line)) map.set(line, cur);
  }
  return map;
}

const gitTimes = buildGitTimeTable();
const allowed = new Set(gitTimes.values());

const sitemapPath = join(ROOT, 'dist/sitemap-0.xml');
if (!existsSync(sitemapPath)) {
  console.error('dist/sitemap-0.xml 不存在 ⇒ 先跑 pnpm build');
  process.exit(1);
}
const xml = readFileSync(sitemapPath, 'utf8');
const entries = [...xml.matchAll(/<url><loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)].map((m) => ({
  loc: m[1], lastmod: m[2], t: Date.parse(m[2]),
}));

const buildTime = statSync(sitemapPath).mtimeMs;
const bad = entries.filter((e) => !Number.isFinite(e.t) || !allowed.has(e.t));
const buildTimeHits = entries.filter((e) => Math.abs(e.t - buildTime) < 2000);

const byValue = new Map();
for (const e of entries) {
  if (!byValue.has(e.lastmod)) byValue.set(e.lastmod, []);
  byValue.get(e.lastmod).push(e.loc);
}
const sorted = [...byValue.entries()].sort((a, b) => b[1].length - a[1].length);

const shape = (u) => {
  if (/\/blog\//.test(u)) return 'blog';
  if (/\/about\/authors\//.test(u)) return 'author';
  if (/\/(guide|benchmark|compare)$/.test(u)) return 'topic';
  if (/^\/[a-z]{2}\/[a-z0-9-]+$/.test(u)) return 'tool';
  if (/^\/[a-z]{2}$/.test(u) || u === '/') return 'home';
  return 'other';
};
const shapes = {};
for (const e of entries) { const s = shape(e.loc); shapes[s] = (shapes[s] || 0) + 1; }

// ---- meta 通道体检（**只测量，不做 CI 闸门**） ----
//
// ⭐ 为什么不把 meta 通道也做成守卫断言：
//   meta 标签与 sitemap lastmod 来自**同一个函数调用**
//   ⇒ 把它也做成守卫断言，只会让**同一条变异红两条断言** ⇒ 违反隔离纪律。
//   ⇒ 值层判据只守一处（sitemap 通道，新守卫断言 1）；
//   ⇒ meta 通道放在**体检工具**里量，不红。
function walkHtml(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) walkHtml(full, out);
    else if (e.name.endsWith('.html')) out.push(full);
  }
  return out;
}
const htmlFiles = walkHtml(join(ROOT, 'dist'));
const metaBad = [];
let metaMissing = 0;
for (const f of htmlFiles) {
  const html = readFileSync(f, 'utf8');
  const m = /<meta\s+http-equiv=["']last-modified["']\s+content=["']([^"']+)["']/i.exec(html);
  if (!m) { metaMissing++; continue; }
  const t = Date.parse(m[1]);
  if (!Number.isFinite(t) || !allowed.has(t)) {
    metaBad.push(relative(ROOT, f).replace(/\\/g, '/') + ' → ' + m[1]);
  }
}

const report = {
  urlCount: entries.length,
  distinctLastmod: byValue.size,
  notAGitContentTime: bad.length,
  buildTimeHits: buildTimeHits.length,
  metaPages: htmlFiles.length,
  metaMissing,
  metaBadCount: metaBad.length,
  metaBadSample: metaBad.slice(0, 5),
  shapes,
  values: sorted.map(([v, l]) => ({ lastmod: v, count: l.length, sample: l.slice(0, 3) })),
  badSample: bad.slice(0, 5).map((e) => e.loc + ' → ' + e.lastmod),
};

if (AS_JSON) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('sitemap URL 数: ' + report.urlCount + '（不同 lastmod 取值 ' + report.distinctLastmod + ' 种）');
  console.log('页面形态分布: ' + JSON.stringify(report.shapes));
  console.log('⛔ lastmod 不是任何 src 文件的 git 变更时间: ' + report.notAGitContentTime + ' / ' + report.urlCount);
  console.log('⛔ lastmod ≈ 构建时刻: ' + report.buildTimeHits + ' / ' + report.urlCount);
  console.log('meta 通道: ' + report.metaPages + ' 个 HTML，缺标签 ' + report.metaMissing + '，值不合格 ' + report.metaBadCount);
  console.log('--- 取值分布 ---');
  for (const v of report.values) {
    console.log('  ' + String(v.count).padStart(4) + ' 个  ' + v.lastmod + '   例: ' + v.sample.join(', '));
  }
  if (report.badSample.length) { console.log('--- 不合格样例 ---'); for (const s of report.badSample) console.log('  ' + s); }
}

if (report.notAGitContentTime > 0 || report.buildTimeHits > 0 || report.metaBadCount > 0 || report.metaMissing > 0) process.exit(1);
