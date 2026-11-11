# P168 批次 3 · B3-6：sitemap lastmod 真实性修复（每次部署都告诉 Google「431 个页面全新」）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> ℹ️ **状态：本计划已于 2026-11-11 执行完毕。** 下文每个步骤都标了 `[x]`（已执行）与实测数字；
> **§8 执行差异记录**记录了实际做法与本计划初稿的出入（7 条），**§9** 是留给后续批次的未解决项。

**Goal:** 让 sitemap 的 `lastmod` 与 HTML 的 `Last-Modified` 反映**内容真正变更的时间**，而不是每次构建的时刻 —— 停止「每次部署都告诉 Google 全站 431 个页面都是新的」这一持续消耗抓取预算的行为。

**Architecture:** 真相源从「文件 mtime」换成「**git 内容变更时间**（`git log -1 --format=%ct`）」；路径寻址从「一张形态固定的映射表」换成「**双向归一化**（`normalizeHtmlKey`）」+「动态路由回退到**内容数据源**（`dynamicSourceTime`）」。判据分三层落地：**产物层**（sitemap 的值必须是某个 `src/` 文件的 git 时间）· **寻址层**（同一页面的 4 种路径形态必须解析到同一时间戳）· **真相源层**（工具页的值必须等于「locale + 工具注册表 + 引擎」中最新的 git 时间）。

**Tech Stack:** Node 20 · Astro 5 · `node:test` · 本仓库既有 `src/integrations/last-modified.mjs` / `astro.config.mjs` / `tests/last-modified-guard.test.ts`。

## Global Constraints

- **宪法（AGENTS.md）**：本批只碰 **SEO 基础设施层**（`src/integrations/**` + `astro.config.mjs` 调用方 + 守卫）—— **不碰任何引擎、不改任何计算逻辑、不改任何阈值**；`src/engines/**` 一律不碰。
- **不改 Roadmap / Phase**：本批是 B3-6（用户 2026-11-11 已拍板），不新增/重排批次。
- **不改 sitemap 的 URL 集合**：本批只改 `lastmod` 的**值**，431 个 URL 的增删是另一件事（未解决项见 §9）。
- **判据落在不变量上**：lastmod 的判据必须是「**等于某个内容源文件的 git 变更时间**」——不能用代理指标（「有几种取值」「在 7 天内」「不等于现在」）。
- **用户规则**：完成改动后**先询问是否 commit/push**；push 前 `git fetch` + 确认 0 behind；禁止 force-push。
- **编码**：文件无 BOM、全 LF。
- **Windows**：PowerShell `>` 写 UTF-16 ⇒ 重定向一律走 `cmd.exe /c`；改文件用 read/edit 工具，不经 `Get-Content` 回写；内联 `node -e` 会被 PowerShell 的引号规则打爆 ⇒ 一律写成脚本文件再跑。
- **守卫纪律**：一个不变量只守一处 ⇒ 新语义必须**独立成文件**；一条变异只许红一条断言 ⇒ 变异台子必须核对**失败断言的名字**。
- **验收数字必须入库**（`tests/scripts/`，文件名**不能**带 `.test.ts`，否则套件计数漂移）。

---

## Task 0: 取证复核（结论存档）

**Files:** 只读（`tmp/gsc-new/**` · `dist/sitemap-0.xml` · `src/integrations/last-modified.mjs`）

**实测结论（全部来自 GSC 导出与本地产物，非推断）:**

| # | 结论 | 依据 |
|---|---|---|
| 1 | **索引率从 65% 跌到 41.8%**，「未编入」85 天只降过 1 次；上升时点对应新页面发布 | `tmp/gsc-new/x_forgeflowkit.com-Coverage-2026-11-10/图表.csv` 逐日序列 |
| 2 | **「204 个 404」不在 GSC 页面表内** —— 页面表 555 页**全部可达**（389 个直接存在 + 166 个经 blog 301 重定向），真 404 = **0** | `tmp/b3-6-real404b.mjs` 逐 URL 分类 |
| 3 | 164 个已删 `/blog/*` URL 仍在吃 **2128 展示 / 2 点击**，但 301 正常（目标从注册表推导） | 页面表 + `src/data/` 重定向注册表 |
| 4 | sitemap **431 个 URL 里 47 个（11%）**在 GSC 页面表无记录（新 guide/benchmark 页 + 新工具页） | `tmp/b3-6-sitemap-vs-gsc2.mjs` |
| 5 | ⭐ **根因**：`getMtimeForHtmlPath` **100% 返回 null** ⇒ 全部回退 `new Date().toISOString()`（构建时刻） | 直接调用 + 解析 `dist/sitemap-0.xml` |
| 6 | ⭐ **mtime 不可信**：`src/i18n/locales/en.json` 的 mtime = 11-11 11:54（构建时刻），而 git 内容变更 = 11-11 13:35（B3-5 提交）⇒ **两者脱钩** | `tmp/b3-6-mtime-noise.mjs` |
| 7 | ⭐ **动态路由源文件每次构建都被触碰**：`src/pages` 下 32 个 `.astro` 中**唯一**被刷新的是 `src/pages/[lang]/[slug].astro` ⇒ 用它当 lastmod ⇒ 100 个工具页每次部署都「全新」 | 同上 |

**两层根因（缺一不可）:**

1. **路径形态不匹配**：映射表的 key 是 `dist/<lang>/…/index.html`，调用方（`astro.config.mjs` 的 sitemap `lastmod`）传的是 `/<lang>/…`（无 `dist` 前缀、无 `index.html` 后缀）⇒ 对不上 ⇒ 永远 `null`。
2. **动态路由无法枚举**：`[lang]/[slug].astro`（工具页）、`[lang]/[letter]/[topic]-*.astro`（指南页）的产物 URL **无法反推**源文件 ⇒ 光修形态也不够。

---

## Task 1: 写「lastmod 真实性」守卫（先红）

**Files:**
- Create: `tests/sitemap-lastmod-accuracy-guard.test.ts`

**Interfaces:**
- Consumes: `dist/sitemap-0.xml`（build-dep）· `src/integrations/last-modified.mjs` 的 `getMtimeForHtmlPath(p)`（source-only）· `git log --format=%ct --name-only -- src/`。
- Produces: **3 条分层断言**（产物层 / 寻址层 / 真相源层）。

**⭐ 为什么必须独立成文件（不塞进 `last-modified-guard`）:** 既有守卫只查「meta tag 在不在」⇒ 一个**全站同一时刻**的 lastmod 照样通过 ⇒ 那是个恒真式盲区。新守卫查的是**值**。

**⭐ 判据为什么不能用「时间窗」:** 「内容今天真的变了」与「lastmod = 构建时刻」在时间上**无法区分** ⇒ 唯一可判定的口径是「**lastmod 必须等于某个源文件的 git 内容变更时间**」。

- [x] **Step 1: 写断言 1（产物层 · build-dep）** —— 读 `dist/sitemap-0.xml`，逐条比对 `lastmod` 是否落在「`src/` 全部文件的 git 变更时间集合」里；集合由**一次** `git log --format=%ct --name-only -- src/` 建出（实测 **141 KB / < 1 秒**；用「每文件一次 git log」要 1000+ 次 spawn ⇒ 单条断言实测 **61 秒**）。

- [x] **Step 2: 写断言 2（寻址层 · source-only）** —— 同一页面的 **4 种路径形态**（`/en/x` · `/en/x/` · `/en/x/index.html` · `dist/en/x/index.html`）必须**全部解析成功且解析到完全相同的时间戳**；另一个语言页必须能解析。

  ⭐ **判据为什么是「相同的时间戳」而不是「都非 null」**: 去掉「去 `/index.html` 后缀」这一半归一化后，`/en/x/index.html` 会落到**别的**回退分支并**返回一个非 null 的时间** ⇒ 「都非 null」照样绿 ⇒ 承重为零。

- [x] **Step 3: 写断言 3（真相源层 · source-only）** —— 工具页的解析结果必须**等于**「`src/i18n/locales/en.json` + `src/data/tools/index.ts` + `src/engines/**`」中最新的 git 变更时间。期望值由守卫**独立枚举 + 独立调 git**得出，不复用实现的取数逻辑 ⇒ 实现换了源文件集合 / 退回 mtime / 退回构建时刻，本条都会红。

- [x] **Step 4: build-dep 门禁** —— 断言 1 读 `dist/` ⇒ 无 `RUN_BUILD_TESTS` 时**整体跳过**（而不是失败）；源码里提到 `process.env.RUN_BUILD_TESTS` 即被 `tests/build-dep-suites.mjs` 判为 build-dep。

- [x] **Step 5: 跑测试确认它红**（此时实现还没改）—— 实测：断言 1 精确报出 **431 / 431** 条不合格，断言 2 红（5 种形态里 3 种解析不到）。

---

## Task 2: 重写 `last-modified.mjs`（真相源 = git 内容变更时间）

**Files:**
- Modify: `src/integrations/last-modified.mjs`

**Interfaces:**
- Produces: `normalizeHtmlKey(p, repoRoot)` → `/<lang>/…` 归一化 key；`getMtimeForHtmlPath(htmlPath)` → `Date | null`（调用方签名不变）。

- [x] **Step 1: 加 `normalizeHtmlKey()`** —— 双向归一：去仓库根前缀 → 去 `dist/` 前缀 → 去 `/index.html` 后缀 → 去剩余 `.html` 后缀 → 去尾斜杠 → 小写。**建表时归一 + 查表时归一**（两边同一把尺子才是修根因）。

- [x] **Step 2: 加 `gitContentTime(relPath)`** —— `git log -1 --format=%ct -- <path>`，带 `_gitTimeCache` 去重；git 不可用（浅克隆 / 无 `.git` / 产物环境）时**退回 mtime**（宁可保守，也不要回退到「构建时刻」）。

  ⚠️ **CI 可用性已核**：`actions/checkout` 用 `fetch-depth: 0` ⇒ 全历史可用 ⇒ git 真相源在 CI 里成立。

- [x] **Step 3: 加 `dynamicSourceTime(key)`** —— 动态路由页**取内容数据源**，不取被构建触碰的路由源文件：

| 页面形态 | lastmod 取自 |
|---|---|
| 工具页 `/en/<slug>` | `src/i18n/locales/<lang>.json` + `src/data/tools/index.ts` + `src/engines/**` |
| 首页 `/` `/en` `/zh` | `src/pages/index.astro` + `src/pages/[lang]/index.astro` + 两份 locale + 工具注册表 |
| 指南页 `/en/<letter>/<topic>-*` | `src/pages/[lang]/[letter]/**` |
| 作者页 `/en/about/authors/<slug>` | `src/pages/[lang]/about/authors/[slug].astro` |
| 博客页 `/en/blog/<slug>` | `src/content/blog/<slug>.md` |
| 根级页 `/404` | `src/pages/404.astro` |

  ⚠️ **粒度是「页面族级」而不是「单页级」** —— 某个引擎改动会刷新全部工具页。**这远好于「每次部署刷新全部」**：Google 看到的是「工具页这一族最近变了」，而不是「整个站点每一页都全新」。

- [x] **Step 4: 保留 `buildMap()` 但在建表时归一** —— key 用 `normalizeHtmlKey()` 生成 ⇒ 建表与查表同一把尺子。

---

## Task 3: 拆掉旧守卫里那条**给 bug 背书**的断言

**Files:**
- Modify: `tests/last-modified-guard.test.ts`

**Interfaces:**
- Consumes: `dist/**/*.html` 与 `dist/sitemap-0.xml`。
- Produces: 该文件只守**结构层**（meta tag 在不在 · sitemap 每条 URL 有没有 lastmod）；**值层**移交 Task 1 的新守卫。

- [x] **Step 1: 删掉 `lastmod values are valid ISO timestamps within 7 days of now`** —— 并在原地留下完整的删除理由（不是「改松了」，是**这条断言本身与「如实报告内容变更时间」互斥**）。

  ⭐⭐ **它当年正是在给 bug 背书**: 它要求「lastmod ≈ 现在」⇒ **只有「每次部署刷新全部 lastmod」才能满足** ⇒ 它不是那个 bug 的防线，而是那个 bug 的守卫。

  ⭐ 实测数据：修好之后 **431 个 URL 里 192 个**的真实内容时间在 7 天之外（最老的一个 **2026-07-25**）⇒ **内容没变的页面如实报旧时间**才是正确行为，这条断言会把「说实话」判成失败。

  ⭐ **覆盖没有丢失**: 值层判据整体移交新守卫且更强 —— **全部 431 条**逐条检查（不是抽 20 条），且判据从「在 7 天内」换成「等于某个内容源文件的 git 变更时间」（ISO 合法性由「能被 `Date.parse` 且落在 git 时间集合里」一并保证）。

---

## Task 4: 变异台子 + 体检工具入库

**Files:**
- Create: `tests/scripts/mutate-p168-lastmod.mjs`
- Create: `tests/scripts/b3-6-lastmod-audit.mjs`

**Interfaces:**
- 台子读 `tests/sitemap-lastmod-accuracy-guard.test.ts` 的**断言名**（从源码解析，不手抄）⇒ 守卫改名时台子不会误判。
- 台子临时改写 `src/integrations/last-modified.mjs` 与 `dist/sitemap-0.xml`，收尾**无条件还原 + sha256 逐字节校验**。

- [x] **Step 1: 写台子的 4 条变异**

| ID | 层 | 变异 | 期望只红 |
|---|---|---|---|
| M1 | 产物 | 把 sitemap 里所有 `lastmod` 改成构建时刻（= 复现线上症状） | 产物层 |
| M2 | 源码 | 去掉「去 `/index.html` 后缀」的归一化（形态不匹配的半边） | 寻址层 |
| M3 | 源码 | 去掉「去 `dist/` 前缀」的归一化（形态不匹配的另一半） | 寻址层 |
| M4 | 源码 | 真相源从 git 内容时间退回文件 mtime | 真相源层 |

  ⚠️ **台子故意不重建产物** —— 「重建后再看哪条断言红」会把源码层与产物层两条判据混在一起 ⇒ 一条变异红两条 ⇒ 失去隔离意义。

- [x] **Step 2: 写负对照模式 `--negative-control`** —— 同时施加 M2 + M4 ⇒ 两条断言必须同时红 ⇒ 台子必须报 `RED-BUT-NOT-ISOLATED` ⇒ **该模式自身 exit 0 = 证明成立**；exit 1 = 隔离判定不可信。

- [x] **Step 3: 写体检工具 `b3-6-lastmod-audit.mjs`** —— 输出 URL 数 / 取值分布 / 「不是 git 内容时间」的条数 / 「≈ 构建时刻」的条数 / **meta 通道**（438 个 HTML 的 `Last-Modified` 值是否合格）/ 页面形态分布。验收数字必须**可复算**，不能留在 `tmp/`。

  ⭐ **meta 通道只测量、不做 CI 闸门** —— meta 标签与 sitemap lastmod 来自**同一个函数调用** ⇒ 把它也做成守卫断言只会让**同一条变异红两条** ⇒ 违反隔离纪律。

- [x] **Step 4: 跑台子** —— 实测 **4/4 KILLED**（每条精确红 1 条）+ 负对照成立 + 还原 sha256 逐字节一致。

---

## Task 5: 验收

- [x] **Step 1: 类型检查** —— `npx tsc --noEmit` ⇒ exit **0**。

- [x] **Step 2: 构建** —— `pnpm build` ⇒ exit 0；`[last-modified-injection] injected=438 skipped=0 failed=0`（438 页全部注入成功）。

- [x] **Step 3: 产物级核验** —— 体检工具：431 个 URL / 5 种取值 / 「不是 git 内容时间」**0** / 「≈ 构建时刻」**0** / meta 通道 438 页**缺标签 0、值不合格 0**。

- [x] **Step 4: ⭐ 跨构建不变性验证（本批最强的直接证据）** —— 完整重建**两次**，比对 `lastmod` 取值集合 ⇒ **逐字节相同**（431 个 URL、5 种取值全部不变）⇒ lastmod 已与构建时刻彻底解耦。

  ⚠️ **修好之前这一项必然失败**：每次重建都会把 431 个 `lastmod` 全部刷新成新的构建时刻。

- [x] **Step 5: 守卫双环境复跑** —— 无 `RUN_BUILD_TESTS`：断言 1 打印 `SKIP` 并通过（断言 2/3 实跑）；有 `RUN_BUILD_TESTS=1`：3/3 绿；旧守卫 `last-modified-guard` 2/2 绿。

- [x] **Step 6: 全量套件** —— `RUN_BUILD_TESTS=1 node tests/run.mjs` ⇒ 实测表见规格 §19.33.6（**284** 套件 / 10 批 / 全部 `# fail 0`）。

---

## Task 6: 收尾文档 + 询问 commit/push

- [x] **Step 1: 规格 §19.33**（B3-6 的实测数字与根因）
- [x] **Step 2: `AGENTS.md`** —— 新增维度行「Lastmod Truthfulness」+ 维度计数 29→30 + build-dep 64→65 + 总数 283→284 + Defense-in-Depth 抬头补一句
- [x] **Step 3: `CHANGELOG.md`** —— 头部「最后更新」+ B3-6 段
- [x] **Step 4: `docs/superpowers/plans/INDEX.md`** —— 登记本计划 + Section 9 计数 43→44 + 目录文件总数 114→115
- [ ] **Step 5: ⭐ 询问用户是否 commit / push**（带选项问卷 + 推荐项；**不得自动提交**）

---

## 7. 验收结果（实测，非推算）

| 项 | 结果 |
|---|---|
| 类型检查 | `npx tsc --noEmit` ⇒ exit **0** |
| 构建 | exit 0 · **438** 页 · `[last-modified-injection] injected=438 skipped=0 failed=0` |
| 产物级 · sitemap | **431** 个 URL · **5** 种取值 · 「不是任何 src 文件的 git 变更时间」**0** · 「≈ 构建时刻」**0** |
| 产物级 · meta 通道 | **438** 个 HTML · 缺标签 **0** · 值不合格 **0** |
| ⭐ **跨构建不变性** | 完整重建**两次**，`lastmod` 取值集合**逐字节相同**（2026-11-11 ×203 / 2026-11-03 ×188 / 2026-11-05 ×36 / 2026-09-29 ×2 / 2026-07-25 ×2）⇒ lastmod 已与构建时刻彻底解耦 |
| 守卫（双环境） | 无 `RUN_BUILD_TESTS`：断言 1 `SKIP` + 断言 2/3 实跑 ⇒ **3/3**；有 `RUN_BUILD_TESTS=1` ⇒ **3/3** |
| 旧守卫 | `tests/last-modified-guard.test.ts` **2/2** 绿（结构层） |
| 变异台子 | `tests/scripts/mutate-p168-lastmod.mjs` **4/4 KILLED**（每条精确红 1 条）+ **负对照成立**（`--negative-control` ⇒ 报 RED-BUT-NOT-ISOLATED 且该模式自身 exit 0）+ 还原 sha256 逐字节一致 |
| 体检工具 | `tests/scripts/b3-6-lastmod-audit.mjs` ⇒ **0** 不合格（sitemap + meta 两个通道） |
| 文档守卫 | `doc-freshness-guard` + `claude-md-invariant-guard` **8/8** 绿 |
| 全量套件 | **284** 套件 · **10** 批 · 全部 `# fail 0`（0 `not ok` / 0 `::error::` / exit **0**） |

⚠️ **一次「假红」要记住**：首跑全量时批次 4 红了 2 条 —— 原因是**文档守卫在批次 4 执行，而我还没落盘 INDEX 的登记**
⇒ 那是**时序假象**（守卫读到的是半成品文档树），不是缺陷 ⇒ 补齐登记后复跑 ⇒ 10 批全绿。
⚠️ **本批的验收指标本地测不出来** —— 索引率与 CTR 的恢复要**上线后 2~4 周**的 GSC 窗口才能看。

---

## 8. 执行差异记录

> 执行时填（实际与本计划的出入）。

| # | 计划写的 | 实际做的 | 为什么 |
|---|---|---|---|
| 1 | 守卫 2 条断言（产物层 + 寻址层） | ⭐ **改成 3 条**（加了「真相源层」） | 原计划的「寻址层」判据是「都解析得到」⇒ **承重为零**：去掉半边归一化后 `/en/x/index.html` 会落到别的回退分支并**返回非 null** ⇒ 照样绿。必须把判据改成「**解析到完全相同的时间戳**」，再加一条独立的「真相源 = git 内容时间」才能杀掉 M4。 |
| 2 | 用「每个文件一次 `git log`」建时间表 | ⭐ **改成一次 `git log --format=%ct --name-only -- src/`** | 前者要 1000+ 次进程 spawn ⇒ 单条产物级断言实测 **61 秒**；后者 **141 KB / < 1 秒** ⇒ 断言 1 从 61s 降到 **0.19s**。 |
| 3 | 映射表 + 动态路由回退（5 种形态） | ⭐ **多了一种形态：根级页 `/404`** | 体检工具实测抓到 **438 个 HTML 里唯 1 个**不合格：`dist/404.html` 的 `Last-Modified` 仍是构建时刻 ⇒ 根级页既不在映射表（映射表只收 `src/pages/<lang>/…` 子树）、也没有回退分支。**同一个 bug 的最后一个漏网点**，本批一并修掉。 |
| 4 | 守卫独立成文件 | ✅ 维持独立 | `last-modified-guard` 守**结构**（meta 在不在 · 每 URL 有没有 lastmod），新守卫守**值** ⇒ 一个不变量只守一处。 |
| 5 | 旧守卫的「7 天内」断言保留 | ⭐ **删掉**（并留下完整理由） | 它要求「lastmod ≈ 现在」⇒ **只有「每次部署刷新全部」才能满足** ⇒ 它是那个 bug 的守卫而不是防线；修好之后 431 个 URL 里 **192 个**的真实内容时间在 7 天之外（最老 2026-07-25）⇒ 留着就等于**禁止如实报告**。覆盖没丢：值层判据移交新守卫且更强（全部 431 条 vs 抽 20 条）。 |
| 6 | meta 通道也做成守卫断言 | ⭐ **只做成体检工具里的测量** | meta 标签与 sitemap lastmod 来自**同一个函数调用** ⇒ 做成守卫断言只会让**同一条变异红两条** ⇒ 违反隔离纪律。 |
| 7 | 变异台子跑「重建后再看哪条断言红」 | ⭐ **改成不重建** | 重建会把源码层与产物层两条判据混在一起 ⇒ 一条变异红两条 ⇒ 失去隔离意义。⇒ 产物层变异（M1）直接改 `dist/sitemap-0.xml`，源码层变异（M2~M4）不重建。 |

---

## 9. 未解决项（留给后续批次，不在本批范围）

| # | 问题 | 本批为什么不动 |
|---|---|---|
| 1 | GSC 覆盖率报告里那 **204 个 404** 的具体 URL 清单 | 已用离线方法证明它们**不在** GSC 页面表内（页面表 555 页全部可达，真 404 = 0）⇒ 覆盖率报告只有聚合计数、无 URL 明细 ⇒ 需要用户补导 URL 级明细才能逐个验活 |
| 2 | **47 个 sitemap URL 在 GSC 页面表无记录**（新 guide/benchmark 页 + 新工具页） | 属「提交/索引」问题，不是 lastmod 问题 ⇒ 需要 Search Console URL 检查或 API 侧动作 |
| 3 | sitemap **431 个 URL** 的集合本身（哪些该进、哪些该出） | 本批只改 `lastmod` 的**值**，不动 URL 集合 ⇒ 集合治理是独立决策 |
| 4 | **工具页 lastmod 的粒度是「页面族级」**（改一个引擎 ⇒ 全部工具页刷新） | 更细的粒度需要「每个工具页 ↔ 它的引擎文件」一一映射 ⇒ 100 个工具 × 各自引擎的映射表是独立工作量 |
| 5 | **B3-5 / B3-6 的真正验收指标本地测不出来** | 索引率与 CTR 的恢复要**上线后 2~4 周**的 GSC 窗口才能看 |

---

## 10. 维度 3 scan 声明

> **维度 3 scan: 基于信号 X / Y / Z** —— 本批由三条**站内实测信号**驱动，均来自 GSC 导出与本地产物，**不是**外部趋势猜测：
>
> - **信号 X（索引率时间序列）**：`图表.csv` 逐日「未编入 / 已编入 / 索引率」⇒ 索引率 65% → **41.8%**，且「未编入」85 天只降过 1 次 ⇒ 指向「**持续把已收录页面重新推成新页面**」而不是「页面质量被降级」。
> - **信号 Y（sitemap 产物实测）**：解析 `dist/sitemap-0.xml` ⇒ `getMtimeForHtmlPath` **100% 返回 null** ⇒ 431 个 `lastmod` **全部**等于构建时刻 ⇒ 「每次部署都是 431 个新页面」。
> - **信号 Z（mtime vs git 时间漂移）**：`src/i18n/locales/en.json` 的 mtime = 构建时刻、git 内容变更 = 13:35 ⇒ **mtime 与内容变更脱钩** ⇒ 真相源必须是 git，不是 mtime。
>
> ⇒ 三条信号**共同**指向「lastmod 的真相源选错了」，因此本批的修法是**换真相源 + 换寻址**，而不是调阈值或加页面。
>
> ⚠️ **AI 不擅自改 Roadmap / Phase**：本批不新增/重排批次，不新建工具，不改引擎；范围严格限于 SEO 基础设施层。

