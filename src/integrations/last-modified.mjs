import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

let _map = null;
let _repoRoot = null;

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
function gitContentTime(relPath) {
  if (_gitTimeCache.has(relPath)) return _gitTimeCache.get(relPath);
  let result = null;
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%ct', '--', relPath], {
      cwd: _repoRoot,
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
      result = fs.statSync(path.join(_repoRoot, relPath)).mtime;
    } catch { /* 文件不存在 */ }
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
    return newestContentTime([
      'src/i18n/locales/' + lang + '.json',
      'src/data/tools/index.ts',
      ...listFilesRel(path.join(repo, 'src', 'engines')),
    ]);
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
    const here = path.dirname(fileURLToPath(import.meta.url));
    _repoRoot = path.resolve(here, '..', '..');
    _map = buildMap(_repoRoot);
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
}

export function _mapSize() {
  if (!_map) {
    const here = path.dirname(fileURLToPath(import.meta.url));
    _repoRoot = path.resolve(here, '..', '..');
    _map = buildMap(_repoRoot);
  }
  return _map.size;
}

/** 调试用：列出映射表的 key 样例 */
export function _mapKeys(n = 8) {
  if (!_map) {
    const here = path.dirname(fileURLToPath(import.meta.url));
    _repoRoot = path.resolve(here, '..', '..');
    _map = buildMap(_repoRoot);
  }
  return [..._map.keys()].slice(0, n);
}