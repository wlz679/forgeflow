import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

let _map = null;
let _repoRoot = null;

// P168 B3-6c —— 「工具专属源集合」的缓存
let _engineMap = null;         // slug → 引擎文件（相对仓库根）
let _localeLineMap = null;     // lang → (slug → 行号数组)
let _registryLineMap = null;   // slug → [{ file, lines }]
const _blameCache = new Map(); // 相对路径 → 逐行时间数组（null = blame 不可用）

/**
 * 把任意形态的 html 路径**归一化**成 `/<lang>/...` 形态。
 *
 * ⭐⭐ P168 B3-6 —— 这里曾经是**整站 lastmod 失效**的根因：
 *   映射表的 key 形态是 `dist/<lang>/.../index.html`，
 *   而调用方（astro.config.mjs 的 sitemap `lastmod`）传的是 `/<lang>/...`
 *   （**没有 dist 前缀、没有 index.html 后缀**）；
 *   两种形态对不上 ⇒ `getMtimeForHtmlPath` **永远返回 null**
 *   ⇒ 全部回退到 `new Date().toISOString()`（构建时刻）
 *   ⇒ **每次部署都告诉 Google「431 个页面全部是新的」**
 *   ⇒ 抓取预算被打散 ⇒ 索引率从 65% 一路跌到 41.8%。
 *
 * @param p 任意形态的路径
 * @param repoRoot 仓库根（用于剥掉绝对路径前缀）
 * @returns 归一化 key（形如 `/en/about`）
 */
export function normalizeHtmlKey(p, repoRoot) {
  if (!p) return null;
  let n = String(p).replace(/\\/g, '/');
  const root = (repoRoot || '').replace(/\\/g, '/').replace(/\/+$/, '');
  if (root && n.startsWith(root)) n = n.slice(root.length);
  n = n.replace(/^\/?dist\//, '/');
  n = n.replace(/\/index\.html$/, '');
  n = n.replace(/\.html$/, '');
  n = n.replace(/\/+$/, '');
  if (!n.startsWith('/')) n = '/' + n;
  return n.toLowerCase();
}

/**
 * ⭐⭐ lastmod 的**真相源 = git 的内容变更时间**，不是文件 mtime。
 *
 * 为什么不能用 mtime（实测，2026-11-11）：
 *   ① `git checkout` / `git stash` / 构建工具都会**刷新 mtime**，但内容可能没变；
 *      实测 `src/i18n/locales/en.json` 的 mtime = 11-11 11:54（构建时刻），
 *      而它最后的内容变更是 11-11 13:35（B3-5 提交）⇒ **mtime 与内容变更完全脱钩**。
 *   ② 动态路由（`[lang]/[slug].astro`）的源文件**每次构建都被触碰**；
 *      实测 src/pages 下 32 个 .astro，只有它被刷新 ⇒ 用它当 lastmod
 *      ⇒ 100 个工具页每次部署都「全新」。
 *   ⇒ git 的 `log -1 --format=%ct` 记录的是**内容真正变更**的时间
 *   ⇒ 只有内容真变了，lastmod 才变 ⇒ 不会误导 Google。
 *
 * ⚠️ 代价：每个源文件一次 `git log` 调用（构建期，单次）+ 缓存
 *   （同一源文件只查一次）。实测 431 个 URL ⇒ 约 200 次去重后的调用。
 *
 * ⚠️ 非 git 环境（CI 浅克隆 / 打包产物）⇒ git 不可用 ⇒ 退回 mtime；
 *   此时宁可保守（用 mtime）也不要回退到「构建时刻」。
 *
 * @param relPath 仓库相对路径
 * @returns Date | null
 */
const _gitTimeCache = new Map();

/**
 * 「文件 → 最后一次**内容**变更时间」的表（**一次** git 调用）。
 *
 * ⭐⭐ 为什么不能「每文件一次 git log」（B3-6 的教训，B3-6c 直接踩了一次）：
 *   B3-6c 之后工具页要查 **~320 个文件**（100 引擎 + 200 prose + 16 注册表 + 2 locale）
 *   ⇒ 实测每文件一次 spawn 要 **36.27 秒**（318 × ~113ms）⇒ 构建被拖垮。
 *   一次 git log --format=%ct --name-only -- src/ 只需 **< 1 秒 / 141 KB**。
 *   ⚠️ git log 是**新 → 旧** ⇒ 文件**第一次**出现的那次提交就是它的最后变更时间。
 *
 * ⚠️ 表只覆盖 src/ 子树（工具页的源全在 src/ 下）⇒ 表里没有的文件走单文件回退。
 */
let _gitTimeTable = null;
function gitTimeTable() {
  if (_gitTimeTable) return _gitTimeTable;
  const map = new Map();
  try {
    const out = execFileSync('git', ['log', '--format=%ct', '--name-only', '--', 'src/'], {
      cwd: ensureRepo(),
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    let cur = null;
    for (const raw of out.split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      if (/^\d+$/.test(line)) { cur = Number(line) * 1000; continue; }
      if (cur !== null && !map.has(line)) map.set(line, cur);
    }
  } catch {
    // git 不可用（无 .git / 产物环境）⇒ 空表 ⇒ 下面走单文件回退
  }
  _gitTimeTable = map;
  return map;
}

function gitContentTime(relPath) {
  if (_gitTimeCache.has(relPath)) return _gitTimeCache.get(relPath);
  const repo = ensureRepo();
  const tableVal = gitTimeTable().get(relPath);
  let result = tableVal ? new Date(tableVal) : null;
  if (!result) {
    // 表里没有（不在 src/ 下 / 未提交 / git 不可用）⇒ 单文件回退，再退 mtime
    try {
      const out = execFileSync('git', ['log', '-1', '--format=%ct', '--', relPath], {
        cwd: repo,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (out) {
        const sec = Number(out);
        if (Number.isFinite(sec) && sec > 0) result = new Date(sec * 1000);
      }
    } catch {
      // git 不可用（浅克隆 / 无 .git / 产物环境）⇒ 退回 mtime
      try {
        result = fs.statSync(path.join(repo, relPath)).mtime;
      } catch { /* 文件不存在 */ }
    }
  }
  _gitTimeCache.set(relPath, result);
  return result;
}

/** 递归列出目录下的文件（相对仓库根） */
function listFilesRel(dirAbs) {
  const out = [];
  if (!fs.existsSync(dirAbs)) return out;
  function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else out.push(path.relative(_repoRoot, full).replace(/\\/g, '/'));
    }
  }
  walk(dirAbs);
  return out;
}

/** 取若干候选里**最新的**内容变更时间 */
function newestContentTime(relPaths) {
  let best = null;
  for (const rel of relPaths) {
    const t = gitContentTime(rel);
    if (t && (!best || t > best)) best = t;
  }
  return best;
}

/**
 * 仓库根（惰式解析，收敛到一处）。
 * ⭐ B3-6c 之前 getMtimeForHtmlPath / _mapSize / _mapKeys 各复制了一份解析代码；
 *   再加 3 份缓存就会漏清 ⇒ 必须收敛。
 */
function ensureRepo() {
  if (!_repoRoot) {
    const here = path.dirname(fileURLToPath(import.meta.url));
    _repoRoot = path.resolve(here, '..', '..');
  }
  return _repoRoot;
}

/**
 * slug → 引擎文件（相对仓库根）。
 * ⭐ 靠解析引擎文件里的 slug 字面量，**不能靠文件名**：
 *   ai-image-generation-cost-calculator.ts 的 slug 是 solopreneur-ai-image-cost-calculator。
 * ⭐ 字面量有单引号（93 个）和双引号（7 个）两种 ⇒ 正则要同时认。
 */
function buildEngineMap(repoRoot) {
  const map = new Map();
  const dir = path.join(repoRoot, 'src', 'engines');
  if (!fs.existsSync(dir)) return map;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (!e.name.endsWith('.ts') || e.name === 'index.ts') continue;
      const src = fs.readFileSync(full, 'utf8');
      const m = /slug:\s*(?:'([^']+)'|"([^"]+)")/.exec(src);
      if (m) map.set(m[1] || m[2], path.relative(repoRoot, full).replace(/\\/g, '/'));
    }
  };
  walk(dir);
  return map;
}

/**
 * locale 文件里每个 slug 的**行集合**（1-based 行号）。
 * ⭐⭐ 必须是**行集合**，不能是 min..max 区间：
 *   locale 是多段式布局 —— 实测 100/100 工具的 tools.<slug>.* 行都跨几百行散布
 *   （例：market-size-estimator 的行在 735~5364 之间，只有 53 行）
 *   ⇒ 区间语义会把**邻居工具的键**算进自己的块 ⇒ 污染 lastmod。
 */
function buildLocaleLineMap(repoRoot, lang) {
  const map = new Map();
  const abs = path.join(repoRoot, 'src', 'i18n', 'locales', lang + '.json');
  if (!fs.existsSync(abs)) return map;
  const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = /^\s*"tools\.([^."]+)\./.exec(lines[i]);
    if (!m) continue;
    if (!map.has(m[1])) map.set(m[1], []);
    map.get(m[1]).push(i + 1);
  }
  return map;
}

/**
 * 注册表文件里每个 slug 的**行集合**。
 * 一个工具 = 从它的 slug: 行到**下一个** slug: 行之前。
 * ⭐ index.ts 只是聚合器，**不是内容源** ⇒ 必须排除。
 */
function buildRegistryLineMap(repoRoot) {
  const map = new Map();
  const dir = path.join(repoRoot, 'src', 'data', 'tools');
  if (!fs.existsSync(dir)) return map;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isFile() || !e.name.endsWith('.ts')) continue;
    if (e.name === 'types.ts' || e.name === 'index.ts') continue;
    const rel = 'src/data/tools/' + e.name;
    const lines = fs.readFileSync(path.join(dir, e.name), 'utf8').split(/\r?\n/);
    const marks = [];
    for (let i = 0; i < lines.length; i++) {
      const m = /slug:\s*(?:'([^']+)'|"([^"]+)")/.exec(lines[i]);
      if (m) marks.push({ line: i, slug: m[1] || m[2] });
    }
    for (let i = 0; i < marks.length; i++) {
      const start = marks[i].line + 1;
      const end = i + 1 < marks.length ? marks[i + 1].line : lines.length;
      const ls = [];
      for (let j = start; j <= end; j++) ls.push(j);
      if (!map.has(marks[i].slug)) map.set(marks[i].slug, []);
      map.get(marks[i].slug).push({ file: rel, lines: ls });
    }
  }
  return map;
}

/**
 * 逐行 git 时间（一次 blame ⇒ 整个文件的逐行时间数组）。
 * ⭐ --line-porcelain（不是 --porcelain）：前者**每行**都带完整 header + 元数据；
 *   后者按组输出 ⇒ 解析要处理组内计数，容易错位。
 * ⭐ 未提交的改动（hash 全 0）时间记 0 ⇒ 不让本地脏工作区污染 lastmod。
 * ⚠️ 失败开放：blame 不可用（非 git 目录 / 历史不完整 / 命令失败）⇒ 返回 null，
 *   调用方退回**文件级** git 时间（即 B3-6 的族级行为）⇒ 构建不挂。
 */
function gitLineTimes(relPath) {
  if (_blameCache.has(relPath)) return _blameCache.get(relPath);
  let times = null;
  try {
    const out = execFileSync('git', ['blame', '--line-porcelain', '--', relPath], {
      cwd: ensureRepo(), encoding: 'utf8', maxBuffer: 128 * 1024 * 1024,
    });
    times = [];
    let cur = 0;
  let uncommitted = false;
    for (const line of out.split(/\r?\n/)) {
      const h = /^([0-9a-f]{40}) \d+ \d+/.exec(line);
      if (h) { uncommitted = /^0+$/.test(h[1]); if (uncommitted) cur = 0; continue; }
      if (line.startsWith('committer-time ')) {
        const v = parseInt(line.slice('committer-time '.length).trim(), 10);
        if (!uncommitted && Number.isFinite(v) && v > 0) cur = v;
        continue;
      }
      if (line.startsWith('\t')) times.push(cur);
    }
  } catch { times = null; }
  _blameCache.set(relPath, times);
  return times;
}

/** 行集合里最新的时间；blame 不可用 ⇒ 退回文件级 git 时间（失败开放）。 */
function gitLineMaxTime(relPath, lines) {
  const times = gitLineTimes(relPath);
  if (!times) return gitContentTime(relPath);
  let best = null;
  for (const ln of lines) {
    const sec = times[ln - 1];
    if (!sec) continue;
    const t = new Date(sec * 1000);
    if (!best || t > best) best = t;
  }
  return best || gitContentTime(relPath);
}

function engineMap() {
  if (!_engineMap) _engineMap = buildEngineMap(ensureRepo());
  return _engineMap;
}

function localeLineMap(lang) {
  if (!_localeLineMap) {
    _localeLineMap = {
      en: buildLocaleLineMap(ensureRepo(), 'en'),
      zh: buildLocaleLineMap(ensureRepo(), 'zh'),
    };
  }
  return _localeLineMap[lang] || new Map();
}

function registryLineMap() {
  if (!_registryLineMap) _registryLineMap = buildRegistryLineMap(ensureRepo());
  return _registryLineMap;
}

/**
 * 工具页的**专属内容源**集合（P168 B3-6c）。
 * ⭐ 不含：其它引擎、src/data/tools/index.ts、**非工具的 locale 键**（导航/页脚/全局文案）。
 *   理由：共享文案一改就会把 200 个工具页一起刷新 ⇒ 恰好是本批要消灭的行为。
 * @param slug 工具 slug
 * @param lang en | zh
 * @returns {Array<{file: string, kind: 'file'|'lines', lines?: number[]}>}
 */
export function getToolSourceRefs(slug, lang) {
  const repo = ensureRepo();
  const refs = [];
  const eng = engineMap().get(slug);
  if (eng) refs.push({ file: eng, kind: 'file' });
  const prose = 'src/content/tools/' + slug + (lang === 'zh' ? '.zh.md' : '.md');
  if (fs.existsSync(path.join(repo, prose))) refs.push({ file: prose, kind: 'file' });
  for (const r of registryLineMap().get(slug) || []) {
    refs.push({ file: r.file, kind: 'lines', lines: r.lines });
  }
  const loc = localeLineMap(lang).get(slug);
  if (loc) refs.push({ file: 'src/i18n/locales/' + lang + '.json', kind: 'lines', lines: loc });
  return refs;
}

/** 工具页专属源集合里最新的 git 内容变更时间。 */
export function getToolContentTime(slug, lang) {
  const refs = getToolSourceRefs(slug, lang);
  let best = null;
  for (const r of refs) {
    const t = r.kind === 'file' ? gitContentTime(r.file) : gitLineMaxTime(r.file, r.lines);
    if (t && (!best || t > best)) best = t;
  }
  return best;
}

/** B3-6 的族级口径 —— 只作为「不认识这个 slug」时的兜底。 */
function familyToolTime(lang) {
  const repo = ensureRepo();
  return newestContentTime([
    'src/i18n/locales/' + lang + '.json',
    'src/data/tools/index.ts',
    ...listFilesRel(path.join(repo, 'src', 'engines')),
  ]);
}

/**
 * 动态路由的**回退源**：取「内容数据源」，而不是被构建触碰的路由源文件。
 *
 * ⭐ 为什么不能直接用 `[slug].astro` 的 mtime：
 *   实测（2026-11-11）**Astro 构建会触碰动态路由的源文件** ⇒
 *   `src/pages/[lang]/[slug].astro` 的 mtime 每次构建都变成「现在」
 *   （实测 src/pages 下 32 个 .astro，只有它被刷新）
 *   ⇒ 用它当 lastmod ⇒ 100 个工具页的 lastmod 每次部署都刷新。
 *
 * ⇒ 工具页改取**内容数据源**：
 *   · `src/i18n/locales/<lang>.json`（标题 / 描述 / 决策文案）
 *   · `src/data/tools/index.ts`（工具注册表：名称 / 分类 / 简介）
 *   · `src/engines/**`（引擎逻辑变了 ⇒ 该工具页内容变了）
 *
 * ⚠️ 粒度是「工具族级」而不是「单页级」⇒ 某个引擎改动会刷新全部工具页。
 *   这**远好于**「每次部署刷新全部」：Google 看到的是「工具页这一族最近变了」，
 *   而不是「整个站点每一页都全新」。
 *
 * @param key 归一化后的 html key（形如 `/en/solopreneur-acv-calculator`）
 * @returns Date | null
 */
function dynamicSourceTime(key) {
  const repo = _repoRoot;
  // 形态 1：工具页 /en/solopreneur-acv-calculator
  const toolMatch = /^\/(en|zh)\/([^/]+)$/.exec(key);
  if (toolMatch) {
    const lang = toolMatch[1];
    const slug = toolMatch[2];
    // P168 B3-6c —— 逐工具口径：只有**这个**工具的专属源参与
    if (engineMap().has(slug)) {
      const t = getToolContentTime(slug, lang);
      if (t) return t;
    }
    // 不认识的 slug（保底）⇒ 退回族级口径
    return familyToolTime(lang);
  }
  // 形态 1b：首页 / · /en · /zh ⇒ src/pages/index.astro 或 src/pages/[lang]/index.astro
  const homeMatch = /^\/?(en|zh)?\/?$/.exec(key);
  if (homeMatch) {
    return newestContentTime([
      'src/pages/index.astro',
      'src/pages/[lang]/index.astro',
      'src/i18n/locales/en.json',
      'src/i18n/locales/zh.json',
      'src/data/tools/index.ts',
    ]);
  }
  // 形态 2：指南页 /en/saas-metrics/xxx-guide
  const topicMatch = /^\/(en|zh)\/[^/]+\/[^/]+$/.exec(key);
  if (topicMatch) {
    return newestContentTime(listFilesRel(path.join(repo, 'src', 'pages', '[lang]', '[letter]')));
  }
  // 形态 3：/en/about/authors/reviewer-founder ⇒ src/pages/[lang]/about/authors/[slug].astro
  const authorMatch = /^\/(en|zh)\/about\/authors\//.exec(key);
  if (authorMatch) {
    return newestContentTime(['src/pages/[lang]/about/authors/[slug].astro']);
  }
  // 形态 4：/en/blog/xxx
  const blogMatch = /^\/(en|zh)\/blog\/([^/]+)$/.exec(key);
  if (blogMatch) {
    return newestContentTime(['src/content/blog/' + blogMatch[2] + '.md']);
  }
  // 形态 5：根级页面（/404）
  //   ⚠️ 这类页面**不在** buildMap 的映射表里（映射表只收 `src/pages/<lang>/…` 子树）
  //   ⇒ 没有这一支的话，dist/404.html 的 Last-Modified 会回退到构建时刻
  //   ⇒ 那是 B3-6 要消灭的同一个 bug 的最后一个漏网点（实测体检抓到了它）。
  const rootMatch = /^\/([a-z0-9_-]+)$/.exec(key);
  if (rootMatch) {
    return newestContentTime(['src/pages/' + rootMatch[1] + '.astro']);
  }
  return null;
}

function buildMap(repoRoot) {
  const map = new Map();
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else {
        const ext = path.extname(e.name);
        if (full.includes(`${path.sep}src${path.sep}pages${path.sep}`) && ext === '.astro') {
          const rel = path.relative(path.join(repoRoot, 'src', 'pages'), full);
          const parts = rel.split(path.sep);
          if (parts.length >= 2 && (parts[0] === 'en' || parts[0] === 'zh' || parts[0] === '[lang]')) {
            const fileStem = parts[parts.length - 1].replace('.astro', '');
            const subDirs = parts.slice(1, -1);
            const langs = (parts[0] === '[lang]') ? ['en', 'zh'] : [parts[0]];
            for (const lang of langs) {
              const key = normalizeHtmlKey('/' + lang + '/' + [...subDirs, fileStem].join('/'), repoRoot);
              if (key) map.set(key, path.relative(repoRoot, full).replace(/\\/g, '/'));
            }
          }
        } else if (full.includes(`${path.sep}src${path.sep}content${path.sep}blog${path.sep}`) && ext === '.md') {
          const slug = path.basename(full, '.md');
          for (const lang of ['en', 'zh']) {
            const key = normalizeHtmlKey('/' + lang + '/blog/' + slug, repoRoot);
            if (key) map.set(key, 'src/content/blog/' + slug + '.md');
          }
        }
      }
    }
  }
  walk(path.join(repoRoot, 'src'));
  return map;
}

export function getMtimeForHtmlPath(htmlPath) {
  if (!_map) {
    _map = buildMap(ensureRepo());
  }
  const key = normalizeHtmlKey(htmlPath, _repoRoot);
  if (!key) return null;
  const rel = _map.get(key);
  if (rel) return gitContentTime(rel);
  return dynamicSourceTime(key);
}

export function _resetMap() {
  _map = null;
  _repoRoot = null;
  _gitTimeCache.clear();
  _blameCache.clear();
  _engineMap = null;
  _localeLineMap = null;
  _registryLineMap = null;
}

export function _mapSize() {
  if (!_map) {
    _map = buildMap(ensureRepo());
  }
  return _map.size;
}

/** 调试用：列出映射表的 key 样例 */
export function _mapKeys(n = 8) {
  if (!_map) {
    _map = buildMap(ensureRepo());
  }
  return [..._map.keys()].slice(0, n);
}