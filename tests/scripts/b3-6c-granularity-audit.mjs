#!/usr/bin/env node
/**
 * P168 B3-6c —— 工具页 lastmod 粒度体检（验收数字的**可复算**工具）
 *
 * 跑法（从仓库根跑）：
 *   node tests/scripts/b3-6c-granularity-audit.mjs
 *
 * 输出 5 组数字：
 *   ① 200 个工具页的 lastmod 取值分布（族级实现只有 **1 种** ⇒ 任何改动都刷新全部）
 *   ② 引擎爆炸半径：改一个引擎 ⇒ 哪些工具页的 lastmod 会变（源集合归属直接算）
 *   ③ 产物层双通道核验：dist/sitemap-0.xml 的 lastmod **逐条**等于实现的解析值
 *   ④ 源集合纯净性：引擎引用数 / index.ts 泄漏 / locale 行归属
 *   ⑤ 文件级来源的主导次数
 *
 * ⚠️ 这个脚本**只读**，不修改任何仓库文件。
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const mod = await import(pathToFileURL(path.join(ROOT, 'src', 'integrations', 'last-modified.mjs')).href);

// ---- 工具清单（从 en locale 的 title 键派生，与实现无关） ----
const enLocale = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/i18n/locales/en.json'), 'utf8').replace(/^\uFEFF/, ''));
const slugs = Object.keys(enLocale)
  .filter((k) => /^tools\.[^.]+\.title$/.test(k))
  .map((k) => k.split('.')[1])
  .sort();

// ---- ① 取值分布 ----
const pages = [];
for (const slug of slugs) {
  for (const lang of ['en', 'zh']) {
    const t = mod.getMtimeForHtmlPath('/' + lang + '/' + slug);
    pages.push({
      slug, lang,
      iso: t ? t.toISOString() : null,
      ms: t ? t.getTime() : 0,
      refs: mod.getToolSourceRefs(slug, lang),
    });
  }
}
const dist = new Map();
for (const p of pages) dist.set(p.iso, (dist.get(p.iso) || 0) + 1);
console.log('=== ① 工具页 lastmod 取值分布 ===');
console.log('  工具页总数:', pages.length, '· 不同取值:', dist.size);
for (const [v, n] of [...dist.entries()].sort((a, b) => b[1] - a[1])) console.log('   ', v, '=>', n, '页');
console.log('  （族级实现只有 1 种取值 ⇒ 任何改动都会刷新全部 200 页）');

// ---- ② 引擎爆炸半径 ----
console.log('\n=== ② 引擎爆炸半径（源集合归属直接算） ===');
const engineOwners = new Map();
for (const p of pages) {
  for (const r of p.refs) {
    if (!r.file.startsWith('src/engines/')) continue;
    if (!engineOwners.has(r.file)) engineOwners.set(r.file, new Set());
    engineOwners.get(r.file).add(p.slug + '/' + p.lang);
  }
}
let crossTool = 0;
for (const [file, owners] of engineOwners) {
  const involved = new Set([...owners].map((o) => o.split('/')[0]));
  if (involved.size > 1) { crossTool++; console.log('  ⛔ 引擎被多个工具共享:', file, [...owners].join(', ')); }
}
const perEnginePages = [...engineOwners.values()].map((s) => s.size);
console.log('  引擎文件数:', engineOwners.size, '· 被多个工具共享的引擎:', crossTool);
console.log('  改一个引擎 ⇒ 受影响的工具页数: 最小', Math.min(...perEnginePages), '· 最大', Math.max(...perEnginePages),
  '（= 该工具自己的 en + zh 两页；族级实现是 200）');

// ---- ③ 产物层双通道 ----
console.log('\n=== ③ 产物层：dist/sitemap-0.xml vs 实现解析值 ===');
const sitemapPath = path.join(ROOT, 'dist/sitemap-0.xml');
if (!fs.existsSync(sitemapPath)) {
  console.log('  ⚠️ dist/sitemap-0.xml 不存在 ⇒ 跳过（先跑 pnpm build）');
} else {
  const xml = fs.readFileSync(sitemapPath, 'utf8');
  const entries = new Map();
  for (const m of xml.matchAll(/<url><loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)) {
    entries.set(new URL(m[1]).pathname, m[2]);
  }
  let mismatch = 0;
  let missing = 0;
  const bad = [];
  for (const p of pages) {
    const key = '/' + p.lang + '/' + p.slug + '/';
    const got = entries.get(key);
    if (got === undefined) { missing++; continue; }
    if (new Date(got).getTime() !== p.ms) { mismatch++; if (bad.length < 5) bad.push(key + ' sitemap=' + got + ' impl=' + p.iso); }
  }
  console.log('  工具页 URL 在 sitemap 里的:', pages.length - missing, '/', pages.length, '· 取值不一致:', mismatch);
  if (bad.length) console.log('  例:', bad.join(' | '));
  let allMismatch = 0;
  const allBad = [];
  for (const [key, got] of entries) {
    const t = mod.getMtimeForHtmlPath(key);
    if (!t) continue;
    if (t.toISOString() !== got) { allMismatch++; if (allBad.length < 5) allBad.push(key + ' sitemap=' + got + ' impl=' + t.toISOString()); }
  }
  console.log('  全站 URL 总数:', entries.size, '· 与实现不一致:', allMismatch);
  if (allBad.length) console.log('  例:', allBad.join(' | '));
}

// ---- ④ 源集合纯净性 ----
console.log('\n=== ④ 源集合纯净性 ===');
const localeLineOwner = new Map();
for (const lf of ['src/i18n/locales/en.json', 'src/i18n/locales/zh.json']) {
  const lines = fs.readFileSync(path.join(ROOT, lf), 'utf8').split(/\r?\n/);
  const m = new Map();
  lines.forEach((t, i) => {
    const mm = /^\s*"tools\.([^."]+)\./.exec(t);
    if (mm) m.set(i + 1, mm[1]);
  });
  localeLineOwner.set(lf, m);
}
let badEngineCount = 0;
let indexLeak = 0;
let otherSlugLine = 0;
for (const p of pages) {
  const engines = p.refs.filter((r) => r.file.startsWith('src/engines/'));
  if (engines.length !== 1) badEngineCount++;
  if (p.refs.some((r) => r.file === 'src/data/tools/index.ts')) indexLeak++;
  for (const r of p.refs) {
    if (r.kind !== 'lines' || !r.file.endsWith('.json')) continue;
    const owner = localeLineOwner.get(r.file);
    for (const ln of r.lines || []) {
      if (owner && owner.get(ln) && owner.get(ln) !== p.slug) { otherSlugLine++; break; }
    }
  }
}
console.log('  引擎引用数 ≠ 1 的页:', badEngineCount, '· 混入 index.ts 的页:', indexLeak, '· locale 行归属错的页:', otherSlugLine);

// ---- ⑤ 文件级来源的主导次数 ----
console.log('\n=== ⑤ 文件级来源的主导次数（en 页） ===');
const srcTable = new Map();
{
  const out = execFileSync('git', ['log', '--format=%ct', '--name-only', '--', 'src/'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  let cur = null;
  for (const raw of out.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (/^\d+$/.test(line)) { cur = Number(line) * 1000; continue; }
    if (cur !== null && !srcTable.has(line)) srcTable.set(line, cur);
  }
}
const counts = new Map();
for (const p of pages.filter((x) => x.lang === 'en')) {
  let bestFile = null;
  let best = 0;
  for (const r of p.refs) {
    if (r.kind !== 'file') continue;
    const t = srcTable.get(r.file) || 0;
    if (t > best) { best = t; bestFile = r.file; }
  }
  if (bestFile) {
    const kind = bestFile.startsWith('src/engines/') ? '引擎'
      : bestFile.startsWith('src/content/tools/') ? 'prose'
      : bestFile.startsWith('src/data/tools/') ? '注册表' : '其它';
    counts.set(kind, (counts.get(kind) || 0) + 1);
  }
}
for (const [k, v] of counts) console.log('  ', k, ':', v, '页');
