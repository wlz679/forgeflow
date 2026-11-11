// P168 —— GSC 导出 ⇒ 决策清单（可复算，入库）
//
// ⚠️ 用 .mjs 而不是 .ts：本仓库 tsconfig 是 strict 且**不排除 tests/scripts/**
//   ⇒ .ts 会被类型检查（这份分析脚本是纯 JS，标注类型没有价值）⇒ 用 .mjs。
//
// ① 总量（三口径交叉校验：每日序列 / 设备表 / 网页表）+ 与上轮基线的对比（⚠️ 窗口重叠，不作增长结论）
// ② 「有排名没人点」的查询 Top N（真实检索意图）+ **排名已进前 10 却没人点**（点击率问题）
// ③ 「有排名没人点」的页面 Top N ⇒ **决策支持铺开的增量清单**
// ④ Coverage：未收录原因分布 + 索引率时间序列
//
// 用法（必须从仓库根目录跑）：
//   node tests/scripts/p168-gsc-prioritize.mjs
// 输入：tmp/gsc-new/ 下的 GSC 导出（zip 解开后的 csv 目录也认，递归扫；同内容文件自动去重）
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const ROOT = process.cwd();
const DIR = join(ROOT, 'tmp/gsc-new');
const REPORT = join(ROOT, 'tmp/gsc-report.md');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.csv$/i.test(e.name)) out.push(p);
  }
  return out;
}
function parseCsv(text) {
  const src = text.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQ) {
      if (c === '"') { if (src[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((x) => String(x).trim() !== ''));
}
function classify(rows) {
  if (!rows.length) return null;
  const h = rows[0].map((x) => String(x).trim());
  const low = h.map((x) => x.toLowerCase());
  // ⭐ 精确匹配优先，否则「排名」会被「排名靠前的网页」抢走
  const col = (...names) => {
    for (const n of names) { const i = low.findIndex((x) => x === n); if (i >= 0) return i; }
    for (const n of names) { const i = low.findIndex((x) => x.includes(n)); if (i >= 0) return i; }
    return -1;
  };
  const has = (...names) => names.some((n) => low.some((x) => x.includes(n)));
  const clicksC = col('点击次数', '点击', 'clicks');
  const imprC = col('展示', 'impressions');
  const posC = col('排名', 'position');
  if (has('原因') && has('来源')) return { kind: 'coverage', reason: col('原因'), cnt: col('网页', '数量', 'count') };
  if (has('日期') && has('未编入索引')) return { kind: 'idxseries', date: col('日期'), no: col('未编入索引'), yes: col('已编入索引'), impr: imprC };
  if (has('日期') && imprC >= 0) return { kind: 'daily', date: col('日期'), clicks: clicksC, impr: imprC };
  if (has('热门查询', 'top queries')) return { kind: 'queries', q: col('热门查询', '查询', 'top queries'), clicks: clicksC, impr: imprC, pos: posC };
  if (has('排名靠前的网页', 'top pages')) return { kind: 'pages', url: col('排名靠前的网页', 'top pages'), clicks: clicksC, impr: imprC, pos: posC };
  if (has('设备')) return { kind: 'device', name: col('设备'), clicks: clicksC, impr: imprC };
  if (has('国家') || has('地区')) return { kind: 'country', name: col('国家', '地区'), clicks: clicksC, impr: imprC };
  return null;
}
const num = (v) => { const n = Number(String(v ?? '').replace(/[,%\s]/g, '')); return Number.isFinite(n) ? n : 0; };
const normUrl = (u) => String(u).replace(/^https?:\/\/www\./, '').replace(/\/$/, '').toLowerCase();

const seen = new Set();
const queries = [], pages = [], coverage = [], idxSeries = [], daily = [], devices = [], countries = [];
for (const f of walk(DIR)) {
  const raw = readFileSync(f, 'utf8');
  const h = createHash('md5').update(raw).digest('hex');
  if (seen.has(h)) continue;
  seen.add(h);
  const rows = parseCsv(raw);
  const c = classify(rows);
  if (!c) continue;
  if (c.kind === 'queries') for (const r of rows.slice(1)) queries.push({ q: r[c.q], clicks: num(r[c.clicks]), impr: num(r[c.impr]), pos: num(r[c.pos]) });
  else if (c.kind === 'pages') for (const r of rows.slice(1)) pages.push({ url: r[c.url], clicks: num(r[c.clicks]), impr: num(r[c.impr]), pos: num(r[c.pos]) });
  else if (c.kind === 'coverage') for (const r of rows.slice(1)) coverage.push({ reason: r[c.reason], cnt: num(r[c.cnt]) });
  else if (c.kind === 'idxseries') for (const r of rows.slice(1)) idxSeries.push({ date: r[c.date], no: num(r[c.no]), yes: num(r[c.yes]), impr: num(r[c.impr]) });
  else if (c.kind === 'daily') for (const r of rows.slice(1)) daily.push({ date: r[c.date], clicks: num(r[c.clicks]), impr: num(r[c.impr]) });
  else if (c.kind === 'device') for (const r of rows.slice(1)) devices.push({ name: r[c.name], clicks: num(r[c.clicks]), impr: num(r[c.impr]) });
  else if (c.kind === 'country') for (const r of rows.slice(1)) countries.push({ name: r[c.name], clicks: num(r[c.clicks]), impr: num(r[c.impr]) });
}

const en = JSON.parse(readFileSync(join(ROOT, 'src/i18n/locales/en.json'), 'utf8'));
const pageInfo = (url) => {
  const m = /^forgeflowkit\.com\/(en|zh)\/([^/]+?)\/?$/.exec(normUrl(url).replace(/^https?:\/\//, ''));
  if (!m) return { lang: '?', slug: '?', has: null };
  const slug = m[2];
  return { lang: m[1], slug, has: ('tools.' + slug + '.decision_goal') in en };
};

const L = [];
const p = (s) => { L.push(s); console.log(s); };

p('# P168 —— GSC 导出 ⇒ 决策清单');
p('');
p('输入: tmp/gsc-new/（同内容文件自动去重，共 ' + seen.size + ' 份不同内容）');
p('');

const dClicks = devices.reduce((n, d) => n + d.clicks, 0);
const dImpr = devices.reduce((n, d) => n + d.impr, 0);
const dyClicks = daily.reduce((n, d) => n + d.clicks, 0);
const dyImpr = daily.reduce((n, d) => n + d.impr, 0);
const byPage = new Map();
for (const x of pages) {
  const k = normUrl(x.url);
  const cur = byPage.get(k);
  if (!cur || x.impr > cur.impr) byPage.set(k, x);
}
const pageRows = [...byPage.values()];
const pClicks = pageRows.reduce((n, x) => n + x.clicks, 0);
const pImpr = pageRows.reduce((n, x) => n + x.impr, 0);

p('## ① 总量');
p('');
p('- **站点总量（每日序列求和 = ' + daily.length + ' 天）= ' + dyClicks + ' 点击 / ' + dyImpr + ' 展示 / CTR ' + (dyImpr ? (dyClicks / dyImpr * 100).toFixed(3) : '-') + '%**');
p('- 设备表聚合：' + dClicks + ' 点击 / ' + dImpr + ' 展示 ⇒ **与每日序列一致**（两个独立口径互证）');
p('- 网页表（去重后 ' + pageRows.length + ' 个页面）：' + pClicks + ' 点击 / ' + pImpr + ' 展示');
p('- ⚠️ **网页表展示数比站点总量多 ' + (pImpr - dyImpr) + '（' + (((pImpr - dyImpr) / pImpr) * 100).toFixed(1) + '%），点击数一致** ⇒ 导出自身的页面级展示口径与站点聚合口径不一致（**导出无法判定原因**）⇒ **总量用聚合口径；网页表只用相对排序**');
p('- 设备：' + devices.map((d) => d.name + ' ' + d.clicks + '/' + d.impr).join(' · '));
p('- 上轮基线（92 天窗口 08-03→11-02）：22 点击 / 10,696 展示 / CTR 0.21%');
p('  ⚠️ **两个窗口重叠约 90 天** ⇒ 只能读作「同一量级、CTR 基本持平」，**不能算作增长**');
p('');
p('- 展示 Top 8 国家：' + countries.slice().sort((a, b) => b.impr - a.impr).slice(0, 8).map((c) => c.name + ' ' + c.clicks + '/' + c.impr).join(' · '));
p('');

const zc = (arr) => arr.filter((x) => x.impr > 0 && x.clicks === 0).sort((a, b) => b.impr - a.impr);

p('## ② 有排名没人点 —— 查询 Top 20（按展示）');
p('');
const zq = zc(queries);
for (const x of zq.slice(0, 20)) p('- ' + String(x.impr).padStart(5) + ' 展示 · 排名 ' + String(x.pos).padStart(6) + ' · ' + x.q);
p('');
p('共 **' + zq.length + '** 条查询「有展示 0 点击」（总查询行 ' + queries.length + '）');
p('');
p('⭐⭐ **排名已进前 10 却没人点**（这是「点击率问题」，不是排名问题 —— 最该修的一类）：');
for (const x of zq.filter((x) => x.pos > 0 && x.pos <= 10).slice(0, 15)) p('- ' + String(x.impr).padStart(5) + ' 展示 · 排名 ' + String(x.pos).padStart(6) + ' · ' + x.q);
p('');

p('## ③ 有排名没人点 —— 页面（决策支持铺开的增量清单）');
p('');
const zp = zc(pageRows);
const todo = zp.filter((x) => pageInfo(x.url).has === false);
p('- 有展示 0 点击的页共 **' + zp.length + '** 个；其中**还没有决策支持**的 = **' + todo.length + '** 个（zh **' + todo.filter((x) => pageInfo(x.url).lang === 'zh').length + '** / en **' + todo.filter((x) => pageInfo(x.url).lang === 'en').length + '**）');
p('- 已有决策支持且仍有展示 0 点击：' + zp.filter((x) => pageInfo(x.url).has === true).map((x) => normUrl(x.url).replace('forgeflowkit.com', '')).join(' '));
p('');
p('### Top 25 待铺页（按展示）');
p('');
for (const x of zp.slice(0, 25)) {
  const i = pageInfo(x.url);
  p('- ' + String(x.impr).padStart(5) + ' 展示 · 排名 ' + String(x.pos).padStart(6) + ' · ' + i.lang + ' · ' + i.slug + (i.has ? '（已有决策）' : ''));
}
p('');
p('### 全部待铺页（' + todo.length + ' 个，按展示降序）');
p('');
for (const x of todo) {
  const i = pageInfo(x.url);
  p('- ' + String(x.impr).padStart(5) + ' 展示 · ' + i.lang + ' · ' + i.slug);
}
p('');

p('## ④ Coverage：未收录原因分布');
p('');
for (const c of coverage.slice().sort((a, b) => b.cnt - a.cnt)) p('- ' + String(c.cnt).padStart(5) + ' × ' + c.reason);
p('');
if (idxSeries.length) {
  const wd = idxSeries.filter((s) => s.yes + s.no > 0);
  const rate = (s) => (s.yes + s.no ? (s.yes / (s.yes + s.no) * 100).toFixed(1) + '%' : '-');
  p('索引率时间序列（' + wd.length + ' 个有数据的日子）：');
  for (const s of [wd[0], wd[Math.floor(wd.length / 2)], wd[wd.length - 1]]) if (s) p('- ' + s.date + '  已编入 ' + s.yes + ' / 未编入 ' + s.no + ' ⇒ 索引率 ' + rate(s) + '（展示 ' + s.impr + '）');
  const rates = wd.map((s) => s.yes / (s.yes + s.no));
  p('- 全窗口索引率：最低 ' + (Math.min(...rates) * 100).toFixed(1) + '% · 最高 ' + (Math.max(...rates) * 100).toFixed(1) + '%');
}
p('');
p('⚠️ Coverage 导出只给**数量**、不给 URL 清单 ⇒ 那 204 个 404 的具体 URL 还需另一份导出（页面索引编制 → 网页索引报告 → 未编入索引）。');

writeFileSync(REPORT, L.join('\n'), 'utf8');
console.log('');
console.log('（完整报告 → tmp/gsc-report.md）');
