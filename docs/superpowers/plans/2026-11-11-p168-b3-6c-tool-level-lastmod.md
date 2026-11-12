# P168 批次 3 · B3-6c：工具页 lastmod 降到「单工具级」（+ B3-2 收尾两个 Minor）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> ℹ️ **本计划 2026-11-11 起草 · 待执行。** B3-6c 与 B3-6 同属一批（用户已拍板），
> 与 B3-6b 一样**共用一份计划文档**，但**分 2 个 commit**（用户 2026-11-11 拍板）。

**Goal:** 把工具页（200 个 = 100 工具 × en/zh）的 sitemap `lastmod` 从「页面族级」降到「单工具级」—— 改一个引擎只有**那个**工具的 lastmod 变，不再 200 个工具页一起刷新。顺带收掉 B3-2 的两个遗留 Minor（`seoTitle` 键归位 + 生成器 `--check` 漂移闸门）。

**Architecture:** 真相源从「族级源集合」换成「**工具专属源集合**」：`max(该工具引擎文件, 该工具 prose, 该工具注册表条目块, 该工具在 locale 里的专属键块)`。前两个是**独占文件** ⇒ 现有文件级 `git log -1 --format=%ct` 即可；后两个是**多工具共用文件** ⇒ 必须**按行切块**（`git blame --line-porcelain` 取每行最后改动时间，取该工具的行集合的最大值）。**行集合 ≠ min..max 区间**（locale 本来就是多段式布局，实测 100/100 工具的键都跨几百行散布 ⇒ 区间语义会把邻居的键算进来）。

**Tech Stack:** Node 20 · Astro 5 · `node:test` · 本仓库既有 `src/integrations/last-modified.mjs` / `astro.config.mjs` / `tests/sitemap-lastmod-accuracy-guard.test.ts` / `tests/scripts/mutate-p168-lastmod.mjs`。

## Global Constraints

- **宪法（AGENTS.md）**：本批只碰 **SEO 基础设施层 + locale 键位置 + 脚本闸门** —— **不碰任何引擎、不改任何计算逻辑、不改任何阈值**；`src/engines/**` 一律不碰（只**读**，用于建 slug→引擎文件的映射）。
- **不改 Roadmap / Phase**：本批是 B3-6c（B3-6 规格 §19.33.9 自己记录的未解决项）+ B3-2 收尾，不新增/重排批次。
- **不改 sitemap 的 URL 集合**：只改 `lastmod` 的**值**。
- **判据落在不变量上**：lastmod 的判据必须是「**等于该工具专属源集合里最新的 git 内容变更时间**」—— 不能用代理指标（「有几种取值」「在 7 天内」「不等于现在」「比别早」）。
- **一条变异只许红一条断言**：变异台子必须核对**失败断言的名字**；守卫的判据分层要正交（产物层 / 寻址层 / 真相源层 / 源集纯净层 / 构建环境层）。
- **一个不变量只守一处**：旧的「族级真相源」断言必须**删掉**（不留两处），新的逐工具断言落在独立文件。
- **验收数字必须入库**（`tests/scripts/`，文件名**不能**带 `.test.ts`，否则套件计数漂移）。
- **用户规则**：完成改动后**先询问是否 commit/push**；push 前 `git fetch` + 确认 0 behind；禁止 force-push。
- **编码**：文件无 BOM、全 LF。
- **Windows**：PowerShell `>` 写 UTF-16 ⇒ 重定向一律走 `cmd.exe /c`；改文件用 read/edit 工具；内联 `node -e` 会被引号规则打爆 ⇒ 一律写成 `tmp/*.mjs` 再跑；`git` 远端操作要在**同一条命令**里设 `$env:GIT_SSH_COMMAND='C:/Windows/System32/OpenSSH/ssh.exe'; $env:GIT_SSH_VARIANT='external'`。
- **维度 3 scan**：本计划末尾必须有「维度 3 scan: 基于信号 X / Y / Z」声明（规格 §19.34.10 + CHANGELOG）。

---

## Task 0: 取证复核（结论存档，已完成）

**Files:** 只读（`dist/sitemap-0.xml` · `src/i18n/locales/{en,zh}.json` · `src/engines/**` · `src/data/tools/**`）

**实测结论（全部来自本仓库当前 git 历史与产物，非推断）:**

| # | 结论 | 依据 |
|---|---|---|
| 1 | ⭐ **现状是族级**：200 个工具页（100 工具 × en/zh）的 lastmod **只有 1 种取值** = `2026-11-11T05:35:19Z`（= locale 文件的 git 时间） | `tmp/b3-6c-analyze.mjs` 读 `dist/sitemap-0.xml` |
| 2 | ⭐ **locale 是族级的根源**：候选 A（含 locale 文件级时间）算出来仍是 **100 个工具 1 种取值** ⇒ locale 主导 100/100 | `tmp/b3-6c-analyze.mjs`「候选 A 里每类工具的 lastmod 主导来源」 |
| 3 | ⭐ **引擎文件可按 slug 反查**：`src/engines/**` 共 100 个引擎文件，每个都带 `slug: '...'` 字面量（单引号 93 / 双引号 7 ⇒ 解析要同时认两种） | `tmp/b3-6c-analyze.mjs`「解析出 slug 数: 100」 |
| 4 | ⭐ **文件名 ≠ slug**：`ai-image-generation-cost-calculator.ts` 的 slug 是 `solopreneur-ai-image-cost-calculator` ⇒ 不能靠文件名反推 | 引擎文件字面量 |
| 5 | ⭐ **prose 是每工具独占的**：`src/content/tools/<slug>.md` + `<slug>.zh.md` 各 100 个（zh 版是 Astro 内容集合的 `Xzh` 命名） | `tmp/b3-6c-probe2.mjs` |
| 6 | ⭐ **locale 是多段式布局**：100/100 工具的 `tools.<slug>.*` 行都跨几百行散布（如 market-size-estimator 行 735~5364，只有 53 行）⇒ **必须用行集合，不能用 min..max 区间** | `tmp/b3-2-drift-check.mjs`「不连续的块: 100」 |
| 7 | ⭐ **`git blame` 完全够用**：两个 locale 文件的 blame 共 **0.81 秒**；16 个注册表文件 **2.25 秒**；合计 **2.84 秒** | `tmp/b3-6c-candidate-d.mjs` |
| 8 | ⭐ **行集合语义下的真实效果**：200 个工具页从 **1 种取值 → 4 种**；改一批引擎 ⇒ 受影响工具页从 **200 → 26**（这 26 个是真的变了） | `tmp/b3-6c-candidate-d.mjs` |
| 9 | ⭐ **B3-2 的 seoTitle 漂移不变量今天成立**：locale 的 100 个 `seoTitle` 与生成器输出 **0 处不一致**（覆盖表 24 条）⇒ `--check` 闸门开箱即绿 | `tmp/b3-2-drift-check.mjs` |
| 10 | ⭐ **claude 的 seoTitle 键落在别的工具块里**：`en.json` 1536 行是 claude 的 seoTitle，而 claude 自己的 title 在 1563 行 ⇒ 键被放进了 openai 的块；约定是 `seoTitle → title → shortTitle` 相邻（deepseek 1565/1566/1567 佐证） | `src/i18n/locales/en.json` |

**⭐ 自我纠错（必须留在文档里）**：本批第一版探针用「min..max 区间」切块，算出「候选 C 只有 3 种取值 / 41 页受影响」，**该结论已作废** —— 区间语义会把邻居工具的键算进自己的块。改用行集合后真实数字是「4 种取值 / 26 页受影响」。**教训：locale 这类多段式文件里，「块」是行集合，不是区间。**

---

## Task 1: 核心实现 —— 工具专属源集合

**Files:**
- Modify: `src/integrations/last-modified.mjs`

**Interfaces:**
- Consumes: 仓库根、`src/engines/**`、`src/data/tools/*.ts`、`src/i18n/locales/{en,zh}.json`、`src/content/tools/**`。
- Produces:
  - `getToolSourceRefs(slug: string, lang: string): ToolSourceRef[]` —— **新导出**，工具页的专属源集合。
  - `getToolContentTime(slug: string, lang: string): Date | null` —— **新导出**，该工具源集合里最新的 git 内容时间。
  - `ToolSourceRef = { file: string; kind: 'file' | 'lines'; lines?: number[] }`（`kind:'file'` ⇒ 整文件时间；`kind:'lines'` ⇒ 该行集合的最大行时间）。
  - `_resetMap()` 扩展：同时清 `_engineMap` / `_localeLineMap` / `_registryLineMap` / `_blameCache`。

### Step 1: 写「slug → 引擎文件」映射

```js
/**
 * slug → 引擎文件（相对仓库根）。
 * ⭐ 靠解析引擎文件里的 `slug: '...'` 字面量，**不能靠文件名**：
 *   `ai-image-generation-cost-calculator.ts` 的 slug 是 `solopreneur-ai-image-cost-calculator`。
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
```

### Step 2: 写「locale 行集合」映射（**行集合，不是区间**）

```js
/**
 * locale 文件里每个 slug 的**行集合**（1-based 行号）。
 * ⭐⭐ 必须是**行集合**：locale 是多段式布局（实测 100/100 工具的键都跨几百行散布）
 *   ⇒ 用 min..max 区间会把**邻居工具的键**算进来 ⇒ 污染 lastmod。
 */
function buildLocaleLineMap(repoRoot, lang) {
  const rel = 'src/i18n/locales/' + lang + '.json';
  const abs = path.join(repoRoot, rel);
  const map = new Map();
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
```

### Step 3: 写「注册表行集合」映射

```js
/**
 * 注册表文件里每个 slug 的**行集合**。
 * 一个工具 = 从它的 `slug:` 行到**下一个** `slug:` 行之前。
 * ⭐ `index.ts`（纯聚合器）**不是**内容源 ⇒ 必须排除。
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
```

### Step 4: 写行级 git 时间（`git blame --line-porcelain` + 缓存）

```js
/**
 * 逐行 git 时间（一次 blame ⇒ 整个文件的逐行时间数组）。
 * ⭐ `--line-porcelain`（不是 `--porcelain`）：前者**每行**都带完整 header + 元数据，
 *   后者按组输出 ⇒ 解析要处理组内计数，容易错位。
 * ⭐ 未提交的改动（hash 全 0）时间记 0 ⇒ 不让本地脏工作区污染 lastmod。
 * ⚠️ 失败开放：blame 不可用（非 git 目录 / 历史不完整 / 命令失败）⇒ 返回 null，
 *   调用方退回**文件级** git 时间（即 B3-6 的族级行为）⇒ 构建不挂。
 */
const _blameCache = new Map();
function gitLineTimes(relPath) {
  if (_blameCache.has(relPath)) return _blameCache.get(relPath);
  let times = null;
  try {
    const out = execFileSync('git', ['blame', '--line-porcelain', '--', relPath], {
      cwd: _repoRoot, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024,
    });
    times = [];
    let cur = 0;
    for (const line of out.split(/\r?\n/)) {
      const h = /^([0-9a-f]{40}) \d+ \d+/.exec(line);
      if (h) { if (/^0+$/.test(h[1])) cur = 0; continue; }
      if (line.startsWith('committer-time ')) {
        const v = parseInt(line.slice('committer-time '.length).trim(), 10);
        if (Number.isFinite(v) && v > 0) cur = v;
        continue;
      }
      if (line.startsWith('\t')) times.push(cur);
    }
  } catch { times = null; }
  _blameCache.set(relPath, times);
  return times;
}

/** 行集合里最新的时间；blame 不可用 ⇒ 退回文件级 git 时间 */
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
```

### Step 5: 写「工具专属源集合」与「工具内容时间」

```js
/**
 * 工具页的**专属内容源**集合。
 * ⭐ 不含：其它引擎、`src/data/tools/index.ts`、**非工具的 locale 键**（导航/页脚/全局文案）。
 *   理由见规格 §19.34.3：共享文案一改就会把 200 个工具页一起刷新 ⇒ 恰好是本批要消灭的行为。
 */
export function getToolSourceRefs(slug, lang) {
  ensureRepo();
  const refs = [];
  const eng = _engineMap.get(slug);
  if (eng) refs.push({ file: eng, kind: 'file' });
  const prose = 'src/content/tools/' + slug + (lang === 'zh' ? '.zh.md' : '.md');
  if (fs.existsSync(path.join(_repoRoot, prose))) refs.push({ file: prose, kind: 'file' });
  for (const r of (_registryLineMap.get(slug) || [])) {
    refs.push({ file: r.file, kind: 'lines', lines: r.lines });
  }
  const loc = (_localeLineMap.get(lang) || new Map()).get(slug);
  if (loc) refs.push({ file: 'src/i18n/locales/' + lang + '.json', kind: 'lines', lines: loc });
  return refs;
}

export function getToolContentTime(slug, lang) {
  const refs = getToolSourceRefs(slug, lang);
  let best = null;
  for (const r of refs) {
    const t = r.kind === 'file' ? gitContentTime(r.file) : gitLineMaxTime(r.file, r.lines);
    if (t && (!best || t > best)) best = t;
  }
  return best;
}
```

### Step 6: 把 `dynamicSourceTime` 的工具分支换成逐工具口径

```js
  // 形态 1：工具页 /en/solopreneur-acv-calculator
  const toolMatch = /^\/(en|zh)\/([^/]+)$/.exec(key);
  if (toolMatch) {
    const lang = toolMatch[1];
    const slug = toolMatch[2];
    if (_engineMap.has(slug)) {
      const t = getToolContentTime(slug, lang);
      if (t) return t;
    }
    // 不是工具（如 /en/about 走不到这里，但保底）⇒ 退回族级口径
    return familyToolTime(lang);
  }
```

其中 `familyToolTime(lang)` = B3-6 的老口径（locale 文件 + `src/data/tools/index.ts` + 全部引擎），**保留**作为未知 slug 的兜底。

### Step 7: 扩展 `_resetMap()`

```js
export function _resetMap() {
  _map = null;
  _repoRoot = null;
  _gitTimeCache.clear();
  _blameCache.clear();
  _engineMap = null;
  _localeLineMap = null;
  _registryLineMap = null;
}
```

---

## Task 2: 守卫 —— 源集纯净层 + 真相源层改写

**Files:**
- Create: `tests/sitemap-lastmod-granularity-guard.test.ts`（**source-only**：不读 `dist/`，**不出现** `process.env.RUN_BUILD_TESTS`）
- Modify: `tests/sitemap-lastmod-accuracy-guard.test.ts`

### Step 1: 新守卫（1 个测试，3 段检查）

**⭐ 为什么必须是 1 个测试而不是 3 个**：本批的判据是「源集合 + 时间」一件事。
拆成 3 个测试会让「源集退回族级」这一条变异**同时红 2~3 个测试** ⇒ 违反「一条变异只红一条断言」。

守卫要**独立**重算（不复用实现的取数逻辑）：自己扫 `src/engines/**` 解析 slug、自己解析 locale / 注册表的行、自己调 `git blame`。

三段检查：

1. **源集合逐条比对**：`mod.getToolSourceRefs(slug, lang)` 的**文件列表**与**每个行集合的行号**必须与守卫独立算出的完全相同（顺序无关，集合相等）。
2. **源集合纯净性**：locale / 注册表的每一条行，按守卫自己的键解析，必须**属于该 slug**；`kind:'file'` 且路径在 `src/engines/` 的引用**有且仅有 1 个**且就是该 slug 的引擎文件；源集合**不含** `src/data/tools/index.ts`。
3. **逐工具时间**：`mod.getMtimeForHtmlPath('/' + lang + '/' + slug)` 必须等于守卫独立算出的源集合最大值。

覆盖：全部 100 个 slug × 2 语言 = 200 个页面。

**⭐ 为什么「源集合逐条比对」不能省**：只比时间的话，「把注册表源删掉」这一变异**不会改变任何工具的时间**（实测注册表的时间从来不是最大值）⇒ 守卫全绿 ⇒ 变异测不到东西。有了 refs 比对，删源立刻被抓。

### Step 2: 改 accuracy-guard 的断言 1（产物层）

**判据必须扩展**：行级 blame 的时间**不等于**任何文件的 `git log -1` 时间 ⇒ 原来的 allowed 集合（文件级时间）会把正确实现判红。

新的 allowed 集合 = **碰过 `src/` 的全部提交时间戳**（实测 734 个）：`git log --format=%ct -- src/`（**一次**调用）。

```ts
function srcCommitTimes(): Set<number> {
  const out = execFileSync('git', ['log', '--format=%ct', '--', 'src/'], {
    cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  return new Set(out.split('\n').map((l) => l.trim()).filter((l) => /^\d+$/.test(l)).map((l) => Number(l) * 1000));
}
```

**⭐ 为什么仍然能挡住「构建时刻」**：构建时刻不是任何提交的时间戳；`git log` 的 734 个时间戳全部是历史提交时间 ⇒ 构建时刻（= 现在）几乎不可能落进去。

**⭐ 为什么不能改成「产物 == 实现」**：那样会让**任何源码层变异**都把产物层断言染红（产物是陈旧的）⇒ 破坏「一条变异只红一条断言」。产物↔实现的衔接改由**体检脚本**核验（Task 3），不进 CI 断言。

### Step 3: 删掉旧的「族级真相源」断言（断言 3）

旧的断言 3 断言的是「locale + `src/data/tools/index.ts` + 全部引擎」的最大值 —— B3-6c 之后这个口径**不再成立** ⇒ 必须删（**不是改松**），原地留 3 行说明它被谁接管了。

---

## Task 3: 变异台子 + 体检脚本

**Files:**
- Modify: `tests/scripts/mutate-p168-lastmod.mjs`
- Create: `tests/scripts/b3-6c-granularity-audit.mjs`

### 变异（每条只红 1 个断言）

| ID | 变异 | 应红的断言 |
|---|---|---|
| M6 | 工具页源集合退回族级（引擎引用换成全部引擎 + locale 换文件级） | granularity-guard |
| M7 | locale 行集合改用 **min..max 区间**（吞邻居的键） | granularity-guard |
| M8 | 从源集合里删掉**注册表**来源 | granularity-guard（refs 不匹配） |
| M9 | 从源集合里删掉**locale 键块**来源 | granularity-guard（refs 不匹配） |

⚠️ M6~M9 是**源码层**变异 ⇒ 台子对它们**只跑 source-only 的 granularity-guard**，不跑 build-dep 断言（产物是陈旧的，跑了会染红产物层断言）。
⚠️ M7 是本批**最关键**的一条：它把「行集合」换成「区间」⇒ 正是本批取证阶段自己踩过的坑 ⇒ 必须能被抓到。

### 体检脚本 `b3-6c-granularity-audit.mjs`

输出（可复算的数字，入库）：
- 200 个工具页的 lastmod 取值分布（**期望：> 1 种**；现状族级是 1 种）
- 「改动一个引擎 ⇒ 多少工具页的 lastmod 会变」的模拟（**期望：远小于 200**）
- 产物层双通道核验：`dist/sitemap-0.xml` 的 200 条 lastmod **逐条**等于 `getMtimeForHtmlPath` 的解析值（= 产物↔实现衔接）
- 源集合纯净性体检（引擎引用数、非工具键泄漏数）

---

## Task 4: B3-2 Minor 2 —— `solopreneur-claude-api-cost-calculator.seoTitle` 键归位（**在 commit 2 执行**）

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/zh.json`

**动作**：把 `tools.solopreneur-claude-api-cost-calculator.seoTitle` 那一行从**别的工具的块里**挪到该工具自己的块里，位置遵循仓库约定 `seoTitle → title → shortTitle` 相邻（deepseek 1565/1566/1567 佐证）。

**验收判据**：
- en.json / zh.json 各只有 1 处改动（`git diff --stat` 显示 2 文件各 1 行移动）。
- 移动后：该 slug 的 `seoTitle` 行**紧邻**其 `title` 行（前后 1 行内）⇒ 写成守卫断言。
- JSON 仍可解析、键集合不变（`JSON.parse` 前后 `Object.keys` 相同）。

⚠️ **预期副作用（要在文档里写明）**：移动一行 = 一次内容变更 ⇒ 该行的 blame 时间变成新提交时间 ⇒ **claude 工具页的 lastmod 会变新**。这是**如实反映**（locale 文件确实动了），不是 bug。
其它 99 个工具的行归属不变 ⇒ 它们的 lastmod **不受影响**（行级 blame 按内容追踪）。

---

## Task 5: B3-2 Minor 1 —— `generate-seo-titles.mjs` 加 `--check` 漂移闸门（**在 commit 2 执行**）

**Files:**
- Modify: `scripts/generate-seo-titles.mjs`
- Modify: `package.json`
- Create: `tests/seo-title-generator-gate-guard.test.ts`

### Step 1: 脚本加 `--check` 与 `--root`

- `--check`：**不输出 JSON**，改为核验「locale 的 `tools.<slug>.seoTitle` == 生成结果（规则稿 + 覆盖表）」；有漂移 ⇒ 打印漂移明细并 `exit 1`；无漂移 ⇒ 打印含 `PASSED` 的一行并 `exit 0`。
- `--root <dir>`：把「读 locale / 覆盖表的根目录」参数化（默认仓库根）⇒ 守卫可以在 `tmp/` 里造夹具测漂移，**不碰真实 locale**。
- 仓库惯例（`codegen-examples.mjs --check` / `codegen-customfn.mjs --check`）：`--check` 拥有**漂移不变量**，独立守卫文件只守「闸门存在 / 可跑 / 非空转」。

### Step 2: 接进 `pnpm check`

`package.json` 的 `check` 链加 `node scripts/generate-seo-titles.mjs --check`，并加别名 `check:seo-titles`（与 `check:examples` 等同风格）。

### Step 3: 守卫 `tests/seo-title-generator-gate-guard.test.ts`（3 个测试）

| 测试 | 判据 | 变异 |
|---|---|---|
| T1 闸门存在 | `package.json` 的 `check` 链里含 `generate-seo-titles.mjs --check`，且脚本文件存在 | 从 package.json 摘掉 |
| T2 闸门可跑 | 跑 `node scripts/generate-seo-titles.mjs --check` ⇒ exit 0 且 stdout 含 `PASSED` | 改坏生成器 |
| T3 非空转 | 在 `tmp/` 夹具里改坏一个 `seoTitle` ⇒ `--check --root <夹具>` 必须 **exit 1** | 删掉漂移检查 |

T3 的夹具：`tmp/` 下复制 `src/i18n/locales/{en,zh}.json` + `scripts/seo-title-overrides.json`，改坏一个值 ⇒ 跑 `--check --root tmp/<夹具>`。**不碰真实 locale**（崩了也不会留下污染）。

---

## Task 6: 文档同步

**Files:**
- Modify: `AGENTS.md` —— ① 新维度行「Lastmod Granularity（lastmod 逐工具粒度）」；② 规格新增 **§19.34**；③ 套件计数 **284 → 285**（build-dep 65 不变，source-only **219 → 220**；commit 2 再到 **286** / source-only **221**）。
- Modify: `docs/superpowers/specs/**` —— 按仓库惯例，规格正文写在 AGENTS.md §19.34。
- Modify: `CHANGELOG.md` —— B3-6c 段 + B3-2 收尾段（含实测数字）。
- Modify: `docs/superpowers/plans/INDEX.md` —— 登记本计划文档（文件总数 +1）。

⚠️ 套件计数变了 ⇒ `tests/claude-md-invariant-guard.test.ts` 的算术不变量要跟着核（总数 = build-dep + source-only）。

---

## Task 7: 验收（数字必须实测，不许推断）

```
cmd.exe /c "npx tsc --noEmit"
cmd.exe /c "set RUN_BUILD_TESTS=1&&pnpm build"
node tests/scripts/b3-6c-granularity-audit.mjs
node node_modules/tsx/dist/cli.mjs --test --test-concurrency=1 tests/sitemap-lastmod-granularity-guard.test.ts
cmd.exe /c "set RUN_BUILD_TESTS=1&& node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\sitemap-lastmod-accuracy-guard.test.ts tests\last-modified-guard.test.ts"
node tests/scripts/mutate-p168-lastmod.mjs
node tests/scripts/mutate-p168-lastmod.mjs --negative-control
cmd.exe /c "set RUN_BUILD_TESTS=1&&node tests\run.mjs"
```

**必须同时满足**:
- tsc 0 error
- 构建 438 页（`injected=438 skipped=0 failed=0`）
- 体检：200 个工具页的 lastmod **> 1 种取值**；「改一个引擎」的影响面 **< 200**；产物层 200 条**逐条**等于实现解析值
- granularity-guard 全绿；accuracy-guard 全绿；last-modified-guard 2/2
- 台子 M1~M9 **全部 KILLED**，每条**恰好红 1 个断言**（台子要打印失败断言名）
- 负对照成立（不改任何东西时台子必须报 INVALID/全绿）
- 全量套件 **0 fail**

---

## Task 8: 提交与推送（**必须先问用户**）

- 两个 commit：① `feat(seo): P168 B3-6c —— 工具页 lastmod 降到单工具级`；② `fix(i18n): P168 B3-2 收尾 —— seoTitle 键归位 + 生成器 --check 漂移闸门`。
- commit 信息格式：`type(scope): 中文标题` + 正文含**实测数字**；**绝不能**含 `[CI Skip]` / `[Skip CI]` / `[CF-Pages-Skip]`。
- 用 `git commit -F <utf8file>`（避免 PowerShell 写 UTF-16）；文件无 BOM、全 LF。
- push 前：`git fetch` + `git rev-list --left-right --count origin/master...HEAD` 确认 **0 behind**；**禁止 force-push**。
- 两端 remote：GitHub `ssh://git@ssh.github.com:443/wlz679/forgeflow.git`（推 master = **上线**）+ Gitee `origin`（`git@gitee.com:wlz679/calcKit.git`）。
- 推完用 `git ls-remote` 复核两端 HEAD 一致；**推 GitHub master 后等 CF 部署完成**再抓线上 sitemap 核验（lastmod 取值数应 > 1）。

---

## 维度 3 scan

- **信号 1**：Google 官方文档对 `lastmod` 的定位是「页面内容最后**实质**变更时间」，并明确指出「应与内容变更保持一致，不应每次抓取都更新」。本批把族级时间降到单工具级，正是把字段对齐到官方语义。
- **信号 2**：本仓库实测（2026-11-11）索引率从 65% 跌到 41.8%，且 sitemap 长期把 431 个 URL 报成同一时刻 ⇒ 与「lastmod 不可信导致抓取预算被摊薄」的假设一致。本批不改 URL 集合，只改时间真值。
- **信号 3**：`@astrojs/sitemap` 与 `git blame` 的组合在业界（Quartz 的 `CreatedModifiedDate` transformer）已被验证可作 lastmod 真相源；本批沿用同一思路，但**比 Quartz 更进一步**（按 key 块切到单工具级）。


---

## 执行结果（2026-11-11 实测）

### 验收数字

| 项 | 实测 |
|---|---|
| tsc | exit 0 |
| 构建 | **438** 页（`injected=438 skipped=0 failed=0`）· 431 个 URL 提交 indexnow 成功（200） |
| 体检 ① 取值分布 | 200 个工具页 **4 种**取值（156 / 26 / 10 / 8）—— 族级是 **1 种**；⚠️ B3-2 收尾的 `seoTitle` 键归位**提交后**会变 5 种（154 / 26 / 10 / 8 / 2）—— 归位那一行被 blame 归属到**归位那次提交** ⇒ claude 的 2 页独立成一桶 |
| 体检 ② 引擎爆炸半径 | **改一个引擎 ⇒ 受影响 2 个页面**（该工具自己的 en+zh）—— 族级是 **200** |
| 体检 ③ 产物层双通道 | 工具页 **200/200** + 全站 **431/431** 条与实现**逐条一致**，**0 不一致** |
| 体检 ④ 源集合纯净性 | 引擎引用数 ≠ 1 **0** · 混入 `index.ts` **0** · locale 行归属错 **0** |
| 体检 ⑤ 主导来源（en 页） | 引擎 **93** · prose **7** |
| 守卫 | 粒度 **1/1** · accuracy **3/3** · 结构 **2/2** · 文档不变量 **1/1** |
| 变异台子 | **9/9 KILLED**（M1~M9，每条精确红 1 条）+ 负对照成立 + 还原 sha256 一致 |
| 全量套件 | **285**（build-dep **65** + source-only **220**），10 批全部 `# fail 0` |

### ⚠️ 执行差异（与本计划初稿的出入）

1. **性能事故**：计划里没算「每文件一次 `git log`」的开销 ⇒ 首版实现解析 200 个工具页要 **36.27 秒** ⇒ 改成一次调用建时间表后降到 **2.90 秒**。
2. **守卫断言 1 的 allowed 集合必须扩**：行级 blame 时间不在「文件级 git 时间」集合里 ⇒ 换成「碰过 `src/` 的提交时间戳」（强度没塌：构建时刻不是任何提交的时间戳）。
3. **「产物 == 实现」不能进 CI 断言**：那会让**任何源码层变异**都把产物层断言染红（产物是陈旧的）⇒ 产物↔实现的衔接改由**体检脚本**核验。
4. **台子要跑两个守卫文件**：合并成一次 `tsx` 调用时 node 会缩进子测试输出 ⇒ `failedAssertions` 的行首匹配失效 ⇒ 改为**逐文件跑、拼接输出**。
5. **变异 needle 的缩进要跟实现一致**：`getToolContentTime` 的函数体是 **2 空格**缩进 ⇒ M6 首跑 INVALID。
6. ⭐⭐ **守卫抓到一个真 bug：未提交的行被记成「当前时间」** —— `git blame` 对脏工作区的未提交行给出的 hash 是全 0，但 `committer-time` **仍然是 now** ⇒ 首版解析器把 `cur = 0` 之后又被 `committer-time` 覆盖 ⇒ **未提交的行拿到了构建时刻** ⇒ 那等于把 B3-6 刚修掉的 bug（lastmod = 构建时刻）又请回来，而且**只在工作区脏时出现**。症状：locale 键归位后 claude 工具的 lastmod 与守卫独立算出的期望值差 **1 秒**（两次 blame 调用相隔 1 秒）。⇒ 修法：解析器加 `uncommitted` 标志，`committer-time` **不得覆盖**它 ⇒ 未提交的行时间记 **0**（不参与取 max）。**实现与守卫两边都要改**，否则它们会对「now」产生分歧。
7. **locale 键归位会改变该工具的 lastmod**：移动一行 = 一次内容变更 ⇒ 提交后该行的 blame 时间变成提交时间 ⇒ claude 工具页的 lastmod 会变新 —— 这是**如实反映**（locale 文件确实动了），不是 bug；其它 99 个工具的行归属不变 ⇒ 不受影响。**⇒ 体检数字在提交前后会不一样，报告时要说明是哪一态。**

### 未解决

1. ⏳ **GSC 2~4 周观察窗口**（2026-11-11 起算）：索引率 / 展示 / 点击 / 平均排名 —— 本批的真正验收指标本地测不出来。
2. ⏳ **共享键欠报**（§19.34.2）：改导航/页脚文案时工具页 lastmod 不动 —— 刻意取舍。
3. ⏳ **注册表仍是分类文件**（16 个文件）：已用行级 blame 降到单工具级；若将来拆成 100 个文件，这段逻辑可简化。
4. ⏳ **B3-2 的 4 条孤儿查询**仍待用户拍板。

### 维度 3 scan

> **维度 3 scan: 基于信号 ① Google 官方对 `lastmod` 的定位**（页面内容最后实质变更时间，不应每次抓取都更新）—— 本批把族级时间降到单工具级，正是把字段对齐到官方语义。
> **② 本仓库实测**（2026-11-11）：索引率 65% → 41.8%，且 sitemap 长期把 431 个 URL 报成同一时刻 ⇒ 与「lastmod 不可信导致抓取预算被摊薄」一致；本批不改 URL 集合，只改时间真值。
> **③ 业界同证**：Quartz 的 `CreatedModifiedDate` transformer 踩过同一个 CF Pages 浅克隆坑、解法也相同；本批沿用同一思路，但**比 Quartz 更进一步**（按 key 块切到单工具级）。
> ⇒ 三条信号共同指向「lastmod 的**粒度**与真相源一样重要」。
> ⚠️ **AI 不擅自改 Roadmap / Phase**：本批不新增/重排批次，不新建工具，不改任何引擎。