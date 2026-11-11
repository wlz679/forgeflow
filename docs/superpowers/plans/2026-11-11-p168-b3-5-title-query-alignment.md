# P168 批次 3 · B3-5：title 对齐真实查询词（15 条 GSC 查询 → 8 个工具）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把工具页 `<title>`（`tools.<slug>.seoTitle`）从「品类命名」改成对齐 GSC 实测的**用户查询词**，让「排名已进前 10 却 0 点击」的 15 条查询真正被点到。

**Architecture:** 手工值只写进**一个**真相源 `scripts/seo-title-overrides.json`（生成器的覆盖表），再由 `scripts/generate-seo-titles.mjs` 产出候选并**回写 locale**（保证「生成器 == locale」）。守卫 `tests/title-seo-guard.test.ts` 的 7 条判据继续承重；本批**加一条新守卫**把「查询词 ↔ 标题」的映射钉住（否则映射会悄悄漂移）。

**Tech Stack:** Node 20 · Astro 5 · `node:test` · 本仓库既有 `generate-seo-titles.mjs` / `title-seo-guard.test.ts` / `mutate-p168-title-seo.mjs`。

## Global Constraints

- **宪法（AGENTS.md）**：本批只碰 `tools.<slug>.seoTitle`（locale 文案层）—— **不改引擎、不改计算逻辑、不改阈值**；`src/engines/**` 一律不碰。
- **不改 Roadmap / Phase**：本批是 B3-5（用户 2026-11-10 已拍板），不新增/重排批次。
- **守卫 7 条判据全部必须绿**：② ≤ 60 字符 · ③ 无年份 / 无品牌后缀 · ④ **必须逐字保留原 title 的一组完整词组** · ⑤ en/zh 结构对齐（两侧都有或都没有「 — 」分段）。
- **生成器 == locale**：改完必须 `node scripts/generate-seo-titles.mjs` 的输出与 locale **逐键相等**（en + zh 各 100）。
- **用户规则**：完成改动后**先询问是否 commit/push**；push 前 `git fetch` + 确认 0 behind；禁止 force-push。
- **编码**：文件无 BOM、全 LF；改 locale 必须**文本插入**（不重序列化 ⇒ 不重排 5,700+ 键）。
- **Windows**：PowerShell `>` 写 UTF-16 ⇒ 重定向一律走 `cmd.exe /c`；改文件用 read/edit 工具，不经 `Get-Content` 回写。

---

## Task 0: 取证复核（本计划已完成，结论存档）

**Files:** 只读（`tmp/gsc-new/*.csv` · `tmp/gsc-report.md` · `src/i18n/locales/*.json`）

**实测结论（全部来自 GSC 导出，非推断）:**

| # | 结论 | 依据 |
|---|---|---|
| 1 | 「排名已进前 10 却 0 点击」的查询共 **15** 条 | `tmp/gsc-report.md` ② 段 + 逐条复核（`pos ≤ 12 且 clicks = 0` 全量扫描共 212 条，前 15 条即本批范围） |
| 2 | 其中 **11** 条可映射到**已存在的工具**，落到 **8** 个工具 | 见下表；映射按「页面表里该工具 en/zh 页的真实展示 + 排名」交叉验证 |
| 3 | **4** 条查询指向**不存在的工具** | `多订单收入计算` / `产品替代利润计算` / `每小时学习成本计算` / `内容创作利润核算` ⇒ 对应 slug 在 100 个工具里**查无此页** |
| 4 | 生成器输出与 locale 当前 **0 漂移**（100 slug × 2 语言） | `node scripts/generate-seo-titles.mjs` 输出 vs locale 逐键比对 |

**8 个目标工具（页面表实测）:**

| 工具 | en 页 展示/排名 | zh 页 展示/排名 | 目标查询 |
|---|---|---|---|
| gemini-api-cost | 543 / 25.62 | 4 / 11.25 | google gemini cost (73 · 7.03) |
| logo-churn-rate | — | 102 / 12.12 | 订阅流失率计算 (45 · 4.69) · 会员流失率计算 (25 · 2.84) |
| churn-rate | 27 / 48.15 | 76 / 13.97 | 订阅流失率收入估算 (29 · 6.55) |
| course-pricing | 97 / 27.59 | 93 / 6.61 | 课时费计算 (29 · 5.31) |
| freelance-rate | — | 429 / 15.44 | 独立开发者时薪计算 (27 · 6.37) |
| funnel-step | 42 / 32.36 | 63 / 13.41 | 多阶段转化率计算 (25 · 4.24) |
| hourly-vs-fixed | 73 / 8.18 | 66 / 11.62 | 自由职业者计费方式 (25 · 5.2) |
| saas-pricing-planner | 21 / 16.29 | **无记录** | 混合定价成本计算 (44 · 3) · 套餐收入计算 (27 · 3.11) · 服务套餐收入计算 (25 · 6.16) |

⭐ **`saas-pricing-planner` 的 zh 页在页面表里查无记录** —— 它的 3 条查询（合计 96 展示、排名 3~6）落点**不在该页** ⇒ 本批对它的 zh 侧**只做最小改动**（加用户词、不动结构），并在报告里标注「落点待逐 URL 查询数据确认」。

---

## Task 1: 写「查询词 ↔ 标题」守卫（先红）

**Files:**
- Create: `tests/title-query-alignment-guard.test.ts`
- Modify: `docs/superpowers/plans/INDEX.md`（登记本计划）

**Interfaces:**
- Consumes: `src/i18n/locales/en.json` / `zh.json` 的 `tools.<slug>.seoTitle`；`src/i18n/locales/en.json` 的 `tools.<slug>.title`（原标题，判据 ④ 的词组来源）。
- Produces: 一条**独立**断言（不与 `title-seo-guard.test.ts` 的 7 条重叠）：「每个被本批点名的工具，其 seoTitle 必须包含该工具目标查询的**实词**」。

**为什么必须是独立文件而不是塞进 `title-seo-guard.test.ts`:** 现有 7 条判据守的是**结构**（长度/年份/词组/对齐），新判据守的是**语义**（标题有没有命中真实查询词）—— 职责不同 ⇒ 必须分开，否则一条变异会同时红两条 ⇒ 违反「一条变异只红一条断言」。

- [ ] **Step 1: 写失败测试**

```ts
// tests/title-query-alignment-guard.test.ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

function locale(lang: string): Record<string, string> {
  return JSON.parse(
    readFileSync(resolve(root, 'src/i18n/locales/' + lang + '.json'), 'utf8').replace(/^\uFEFF/, ''),
  ) as Record<string, string>;
}

/**
 * 本批点名的工具 → 目标查询词（来自 GSC 实测的「排名进前 10 却 0 点击」查询）。
 * 期望值**独立写死字面量**（不从 locale 派生 ⇒ 守卫不是同义反复）。
 *
 * `words` = 该查询里**必须出现在 seoTitle 中**的实词（口语化功能描述的关键词）；
 * `lang` = 该查询发生在哪个语言侧（中文查询 ⇒ zh 页；英文查询 ⇒ en 页）。
 */
const TARGETS: { slug: string; lang: 'en' | 'zh'; query: string; words: string[] }[] = [
  // 填 Task 2 定的映射
];

test('P168 B3-5：⭐ 被点名的工具标题必须命中真实查询词（查询 ↔ 标题的映射不许漂移）', () => {
  const en = locale('en');
  const zh = locale('zh');
  const problems: string[] = [];
  for (const t of TARGETS) {
    const seo = (t.lang === 'en' ? en : zh)['tools.' + t.slug + '.seoTitle'] ?? '';
    for (const w of t.words) {
      if (!seo.includes(w)) {
        problems.push(`${t.lang}/${t.slug} 的 seoTitle 不含查询词「${w}」（查询：${t.query}）`);
      }
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});
```

- [ ] **Step 2: 跑测试确认它红**（此时标题还没改）

```bash
node node_modules/tsx/dist/cli.mjs --test --test-concurrency=1 tests/title-query-alignment-guard.test.ts
```
Expected: FAIL —— 报出每个工具缺哪些查询词。

- [ ] **Step 3: 登记计划到 `docs/superpowers/plans/INDEX.md`**

在 Section 9 表格加一行，并在头部把「最后更新」改成 2026-11-11（Section 9 计数 42→43、目录文件总数 113→114 —— 具体数字以 `doc-freshness-guard` 的实测为准，**不要手填**）。

---

## Task 2: 定稿 15 条查询 → 8 个工具的映射与新标题值

**Files:**
- Modify: `scripts/seo-title-overrides.json`（新增 8 条覆盖）
- Modify: `src/i18n/locales/en.json` / `zh.json`（回写 15 个 seoTitle 键）

**Interfaces:**
- Consumes: GSC 实测（见 Task 0）；`title-seo-guard.test.ts` 的 7 条判据。
- Produces: 8 个 slug 的 `{ en, zh }` 覆盖值 + locale 里对应的 16 个 seoTitle 键（其中 gemini 只改 en ⇒ 15 个键）。

⚠️⭐ **计数核对**：8 个工具 × 2 语言 = 16 个键，但**本批只改 15 个** ——
**`gemini-api-cost` 只改 en**（它的目标查询「google gemini cost」是英文的；zh 侧那 4 展示 / 2 点击
已经在转化 ⇒ 不动 zh，避免动一个正在赚钱的键）。

- [ ] **Step 1: 逐工具定稿（en + zh）**

ⓘ **规则（每条都必须同时满足）:**
1. 保留原 title 的**一组完整词组**（逐字）⇒ 守卫 ④ 绿；
2. ≤ 60 字符、无年份、无品牌后缀 ⇒ 守卫 ②③ 绿；
3. en/zh **结构对齐**（两侧都有或都没有「 — 」分段）⇒ 守卫 ⑤ 绿；
4. 标题里要**含有该工具目标查询的实词**（这是 Task 1 新守卫的判据）；
5. **不承诺工具做不到的事**（标题只描述引擎真实能力，见 Task 0 的 desc 实测）。

ⓘ **已核对的引擎真实能力（禁止超出）:**

- `gemini-api-cost`：Google Gemini API 6 款模型成本 ⇒ en 加「Google」即命中「google gemini cost」；
- `logo-churn-rate`：客户 Logo 流失（流失账户/起始账户）⇒ zh 加「会员流失率」即命中「会员流失率计算」；
- `churn-rate`：客户流失 + 收入影响 ⇒ zh 加「订阅」即命中「订阅流失率收入估算」；
- `course-pricing`：课程定价 / 招生量 ⇒ zh 加「课时费」即命中「课时费计算」；
- `freelance-rate`：时薪 / 日薪 / 月收入 ⇒ zh 加「独立开发者」即命中「独立开发者时薪计算」；
- `funnel-step`：5 个漏斗阶段逐步转化率 ⇒ zh 加「多阶段」即命中「多阶段转化率计算」；
- `hourly-vs-fixed`：时薪 / 月顾问费 / 项目等价报价 ⇒ zh 加「自由职业者计费方式」；
- `saas-pricing-planner`：套餐 / 毛利 / 收入 ⇒ zh 加「混合定价」「套餐收入」；

- [ ] **Step 2: 写进 `scripts/seo-title-overrides.json`**（这是唯一的真相源）

ⓘ **该表只放 en 侧有结构性改动、或 zh 侧需要脱离自动稿的条目** ——
**已实测**：生成器对 `saas-pricing-planner` 等 slug 的 slug 名是 `solopreneur-saas-pricing-planner`（**无 `-calculator` 后缀**）⇒ 覆盖表的 key 必须用真实 slug。

- [ ] **Step 3: 跑生成器，把输出回写 locale**

```bash
cmd.exe /c "node scripts\generate-seo-titles.mjs > tmp\b3-5-gen.json"
```

ⓘ 回写**只改本批的 15 个键**（其余 185 个键必须**逐字节不变** ⇒ 文本插入，不重序列化）。

- [ ] **Step 4: 验证「生成器 == locale」**（15 个键之外的 185 个键必须完全相等）

---

## Task 3: 验收（守卫 + 台子 + 全量）

- [ ] **Step 1: 源码级守卫全绿**

```bash
node node_modules/tsx/dist/cli.mjs --test --test-concurrency=1 tests/title-seo-guard.test.ts tests/title-query-alignment-guard.test.ts
```

- [ ] **Step 2: 类型检查 + 构建**

```bash
npx tsc --noEmit
cmd.exe /c "set RUN_BUILD_TESTS=1&&pnpm build>tmp\b3-5-build.log 2>&1"
```

- [ ] **Step 3: 变异台子（M1~M7 必须仍全绿；新增一条覆盖新守卫）**

```bash
$env:P168_ALLOW_RECOVER='1'; node tests/scripts/mutate-p168-title-seo.mjs
```

ⓘ **必须先清空 `tmp/title-seo-harness-backup.json` 的旧快照**（否则自愈会回滚本批改动）。

- [ ] **Step 4: 全量套件**

```bash
cmd.exe /c "set RUN_BUILD_TESTS=1&&node tests\run.mjs>tmp\full-run-b3-5.log 2>&1"
```

- [ ] **Step 5: 产物级核验（可选但推荐）** —— 抽 1~2 个工具页，确认 `<title>` 真的变成了新文案。

---

## Task 4: 收尾文档 + 询问 commit/push

- [ ] **Step 1: 规格 §19.32**（B3-5 的实测数字）
- [ ] **Step 2: `AGENTS.md`** —— Dimension 计数 28→29（若新增维度）+ P168 note
- [ ] **Step 3: `CHANGELOG.md`** —— 头部「最后更新」+ `[Unreleased]` 段
- [ ] **Step 4: ⭐ 询问用户是否 commit / push**（带选项问卷 + 推荐项）

---


---

## 8. 执行差异记录

> 执行时填（实际与本计划的出入）。

| # | 计划写的 | 实际做的 | 为什么 |
|---|---|---|---|
| 1 | 「改 8 个工具的 15 个 en/zh 标题键」 | ⚠️ **实际改 10 个键**（en **3** + zh **7**） | 逐条复核 GSC 后发现：**8 个工具 × 2 语言 = 16 个候选键里，有 6 个原本就命中了查询词、不需要改** —— e.g. `saas-pricing-planner` 的 en 侧「套餐收入计算」已被现标题完全覆盖（`套餐` + `收入` 都在），`logo-churn-rate` 的 en 侧同理。⭐ **改多了会引入无依据的措辞改动**（标题不是越长越好，超出会挤掉 SERP 里的工具名）。⇒ 只改**真正缺词**的 10 个 |
| 2 | 「15 条查询 → 8 个工具」 | ✅ **11 条查询 → 8 个工具**；另 **4 条无对应工具** | 逐条核对 100 个 slug：`多订单收入计算` / `产品替代利润计算` / `每小时学习成本计算` / `内容创作利润核算` 的目标 slug **在 100 个工具里不存在** ⇒ 这 4 条**不是改标题能解决的**（要么新建工具，要么承认意图已被现有工具覆盖）⇒ 已列进规格 §19.32 的未解决项，**不擅自新建工具**（超出本批范围） |
| 3 | 「`saas-pricing-planner` 的 zh 页也在目标里」 | ⚠️ **该页在 GSC 页面表里查无记录** | 实测：593 行页面表里**没有** `/zh/solopreneur-saas-pricing-planner`（只有 en 页 21 展示 / 排名 16.29）⇒ 它的 3 条查询（合计 96 展示、排名 3~6）落点**很可能不在该页** ⇒ 本批对它**只做最小改动**（加「混合定价成本」「服务套餐收入」），并标注「落点待逐 URL 查询数据确认」 |
| 4 | （计划外） | ⭐ **`logo-churn-rate` 的 en 侧最终没改** | 先拟了「— Customer Loss + Retention」（加 `Customer Loss` 组），但**生成器会拒绝** —— 覆盖值的每个组必须**逐字沿用原 title 的组**（原组是 `Free Customer Loss` / `Retention`）⇒ 「改写词组」正是 B3-2 明确禁止的（会产出悬垂修饰语）⇒ 且该 en 侧**本就无缺口** ⇒ 回退为原值 |
| 5 | （计划外） | ⭐ **新守卫独立成文件**（`tests/title-query-alignment-guard.test.ts`），并给台子加了 **T8** | 新判据守的是**语义**（标题有没有命中真实查询词），与 title-seo-guard 的 7 条**结构**判据职责不同 ⇒ 混在一起会让一条变异红两条 ⇒ 违反隔离纪律。⇒ 台子必须**同时**跑两个守卫文件（否则 T8 看不见任何断言）⇒ 已改 `runGuard` + `guardAssertionNames` |
| 6 | （计划外） | ⭐ **新守卫的承重能力用变异证明** | 只跑一次绿不能证明它不是恒真式 ⇒ 实测把 zh churn-rate 的「订阅流失率」改掉 ⇒ **精确红 1 条**且报错带查询原文 + 展示数 + 排名 ⇒ 判据确实承重 |
| 7 | （计划外） | ⚠️ **`execFileSync` 读 `git show` 会 ENOBUFS** | locale 有 1MB，`execFileSync` 默认缓冲区溢出 ⇒ 改用 `git diff` 读差异 |

## Self-Review

**1. 规格覆盖** —— §19.30.5 的 B3-5 全部要求：① 覆盖表 + 同步 locale ✓（Task 2）② 守卫 ②③④⑤ 全绿 ✓（Task 3 Step 1）③ 生成器 == locale ✓（Task 2 Step 4）④ 验收指标「GSC 展示/点击/排名不能变差」⇒ **本地测不出来，需 2~4 周窗口** ⇒ 本批只能保证「不引入退化」，实测需上线后复查 ✓（Task 4 报告里写明）。

**2. 无占位** —— Task 2 Step 1 的规则列是可执行的判据；具体标题值在执行时按规则定稿（不是 TBD）。

**3. 类型一致** —— 新守卫只读 locale 两个键，无跨任务接口。

## 未解决（不在本批范围，需用户拍板）

1. **4 条查询没有对应工具**（`多订单收入计算` / `产品替代利润计算` / `每小时学习成本计算` / `内容创作利润核算`）⇒ 要么**新建工具**，要么承认这 4 条查询的意图已被现有工具覆盖。**这不是改标题能解决的。**
2. **`saas-pricing-planner` 的 zh 页在 GSC 页面表里无记录** ⇒ 它的 3 条查询落点未确认 ⇒ 需逐 URL 查询数据（§19.30.6 未解决项 2）。
3. **上线后 2~4 周**复查 GSC 的「展示 / 点击 / 平均排名」是否改善（§19.21.5 的 ⑤ 判据）。