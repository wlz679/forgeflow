# P140b — Calculator Content Mass-Write + E-E-A-T 深化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 填实 P140a 留下的骨架 — 把 MRR 示范 md 转正，批量写入 100 个 engine × 2 语 = 200 个 calculator prose md 文件；接入 `CalculatorProse` 到 `[slug].astro`；扩充 `engine.faq` 到 12+；升级 `EeatTrustBlock` 显示 Author/Reviewer/Sources；为 `SoftwareApplication` JSON-LD 增加 `author` + `review` 结构化；最终在 P140b-T8 收紧守卫阈值。**本 PR 是 AdSense 「Low-Value Content」整改的内容深耕主力**。P140a 21 commits 已 ship（P140a 守卫已上线）。

**Architecture:**
- T2 用「template + category-grouped subagent」批量生成 200 md 文件；build-dep 守卫（`content-prose-shape-guard` P140a-T7）机械化校验 frontmatter / 4 H2 / 词数阈值；human-eye quality sample = 10 文件（5 engines × 2 langs）
- T3 在 `src/data/tools/types.ts` 的 `ToolMeta` **新增** `authorId` / `reviewerIds[]` / `sourcesRich[]` 字段（保留旧 `reviewedBy: string` / `sources: string[]` 不删 — 删留给 P140d）；data 层 100 条 ToolMeta 同步加 3 个字段，保留旧字段，引擎迁移用 `defaults`
- T4 在 `[slug].astro` 中 `getEntry('tools', <slug>+(zh?'.zh':''))`，插 4 段 `<CalculatorProse section=...>`（intro / methodology / limitations / example）
- T5 扩 `engine.faq` 到 12+（现 5 条）— 改 engine 文件 `faq:` 数组 + 同步 `src/i18n/translations.ts` 双语
- T6 升级 `EeatTrustBlock.astro` 显示 Author 卡 + Reviewer 列表 + Sources 链接（带 `rel=noopener`）；i18n key 复用现有 `eeat.*` 并加 4 个新 key
- T7 扩展 `createSoftwareApplication` 接口：加 `author: Person` + `review: Review[]` 结构化字段；`[slug].astro` 喂 reviewer 数据
- T8 收紧 `content-prose-shape-guard`：把阈值改成 spec §3 最终值；加 zh 缺位 = build warn（保留 P140a/b 容忍策略，P140d-T8 才强制 fail）

**Tech Stack:** Astro 4.16.19、TypeScript 5.6、zod、Astro Content Collections (`astro:content`)、node:test 守卫、`pnpm check` + `pnpm build` 质量门

---

## Global Constraints

| 约束 | 值 |
| ---- | -- |
| 引擎 slug 模式 | `^solopreneur-[a-z0-9-]+$`（来自 `src/data/tools/types.ts` 经 P53a 锁定） |
| 引擎总数锁定 | 100（`tests/engine-count.ts:EXPECTED_ENGINE_COUNT`，P22b） |
| 分类字母 | A/B/C/D/E/F/H/K/L/M/O/P/R/S/T（15 个，`src/data/categories.ts`） |
| 引擎子目录 | `src/engines/{ai-cost,cost,customer-support,freelance,hiring-team,investment,knowledge,legal-compliance,marketing,operations,product-analytics,real-estate,retention,saas,sales,valuation}/<slug>.ts`（16 个目录，9+ 引擎在不同目录） |
| ToolMeta 源 | `src/data/tools/types.ts` 定义；按类别分文件 `src/data/tools/{category}.ts`（16 个）；`src/data/tools/index.ts` 聚合 |
| Prose schema | `src/content/tools-schema.ts:toolsFrontmatterSchema`（P140a-T7 提取的 zod schema；Astro runtime + 测试共享 single source of truth） |
| Prose 文件位置 | `src/content/tools/<slug>.md`（en）+ `<slug>.zh.md`（zh，filename suffix） |
| Prose 4 H2 固定 | `What This Calculator Measures` / `How It Works (Methodology)` / `Limitations & When Not To Use` / `Worked Example` |
| AdSense publisher ID | `ca-pub-3420554170441272`（P140a 不动） |
| Build-dep gate | `RUN_BUILD_TESTS=1`（P23b skip-guard pattern，新守卫沿用） |
| pnpm check | 必过才能 commit（CLAUDE.md 红线） |
| P140d-T8 强约束 | P140b 仅收紧阈值；zh 缺位 fail 留给 P140d-T8（spec §9 P140b T8 + P140d T8） |
| Defensive comment 风格 | 末尾 `// P140b-N: ...` 编号注释 |
| Subagent-driven 配置 | MECHANICAL = 1 implementer + 1 spec verify；INTEGRATION = 1 implementer + 1 spec verify + 1 quality reviewer |
| Holistic review | P140b ship 前跑 1 次（spec §9 中段 holistic 段）；verify 200 md 文件 frontmatter 一致性 / 4 H2 顺序 / sources 链接合法 / 无重复句子 |

---

## File Structure（计划落盘的所有文件 + 职责）

| 文件 / 范围 | 状态 | 职责 |
| ----------- | ---- | ---- |
| `src/content/tools/solopreneur-mrr-calculator.md` | MODIFY | 移除 P140a 占位注释，补 4 H2（已有 → 仅删占位） |
| `src/content/tools/solopreneur-mrr-calculator.zh.md` | MODIFY | 同上（zh） |
| `src/content/tools/solopreneur-*.md`（en 95 个） | CREATE | 95 个新 md（除 MRR 已示范） |
| `src/content/tools/solopreneur-*.zh.md`（zh 100 个） | CREATE | 100 个新 md（zh 全部新建，MRR 已有但要改写） |
| `src/data/tools/types.ts` | MODIFY | `ToolMeta` 新增 `authorId: string` / `reviewerIds: string[]` / `sourcesRich: { name: string; url: string }[]`（保留旧字段不删） |
| `src/data/tools/{16 cat}.ts`（100 records） | MODIFY | 每条 ToolMeta 加 3 个新字段默认值 |
| `src/pages/[lang]/[slug].astro` | MODIFY | `getEntry('tools', ...)` 注入 `<CalculatorProse section="..." />` 4 处 |
| `src/i18n/translations.ts` | MODIFY | 2400 条 FAQ i18n key（100 eng × 12 + 100 zh × 12 = 2400，扣 codegen 已有的 700 ≈ +1700 净增） |
| `src/engines/**/<engine>.ts`（100 个） | MODIFY | `faq:` 数组 5 → 12+ 条 |
| `src/components/EeatTrustBlock.astro` | MODIFY | 新增 Author 卡 + Reviewer 列表（≤2）+ Sources 链接列表；Props 扩展 |
| `src/lib/seo-factory.ts` | MODIFY | `createSoftwareApplication` 加 `author: Person` + `review: Review[]` 结构化字段 |
| `src/content/tools-schema.ts` | MODIFY（可能） | 如 E-E-A-T 字段在 prose frontmatter 也需要扩展，工具侧也需要补字段 |
| `tests/content-prose-shape-guard.test.ts` | MODIFY（P140b-T8） | 收紧阈值到 spec §3 最终值；zh 缺位 build warn（P140d-T8 才 fail） |
| `tests/content-prose-zh-required-guard.test.ts`（新） | CREATE（P140b-T8） | source-only 守卫：遍历 100 en 文件，warn 哪些缺 zh counterpart（仅 console.warn） |

**全量影响面**：T2 影响 ~200 个 md 文件（一次性），T3 改 17 个 ts 文件（1 types + 16 cat），T4 改 1 个 astro 文件（但渲染 100×2=200 个 page），T5 改 100 个 ts 文件 + 1 个 translations.ts，T6 改 1 个 astro 组件 + 1 个 translations.ts，T7 改 1 个 lib ts + 1 个 page astro。**P140b 总文件数 ~322 个修改 + ~200 个新建**。

---

## Task 1: 清理 MRR 示范 md 的 P140a 占位注释（MECHANICAL）

**Files:**
- Modify: `src/content/tools/solopreneur-mrr-calculator.md`
- Modify: `src/content/tools/solopreneur-mrr-calculator.zh.md`

**Interfaces:**
- Consumes: P140a 留下的 MRR 示范 md（已有完整 frontmatter + 4 H2）
- Produces: 干净的"模板" md — 删占位注释，保留作为 T2 模板参考

> **P140a 留下的占位注释（写在 frontmatter 之前的 `<!-- BOTH_LANG -->` 之类）**需清掉。MRR 文件已具备完整 4 H2，本任务仅做减法。

- [ ] **Step 1: 读两个 MRR 文件，确认占位注释位置**

```bash
grep -nE 'P140a|placeholder|TODO|<!-- BOTH' "src/content/tools/solopreneur-mrr-calculator.md" "src/content/tools/solopreneur-mrr-calculator.zh.md"
```

Expected: 找到 0-2 处占位注释（如果有）。如果完全没有 → 跳过本 task 全部 step。

- [ ] **Step 2: 删除所有占位注释行**

如果 Step 1 有命中，用 Edit 工具删对应行。

- [ ] **Step 3: 验证**

```bash
grep -nE 'P140a|placeholder|TODO|<!-- BOTH' "src/content/tools/solopreneur-mrr-calculator.md" "src/content/tools/solopreneur-mrr-calculator.zh.md"
# Expected: 无输出
```

- [ ] **Step 4: 跑 build-dep 守卫确认仍 PASS**

```bash
RUN_BUILD_TESTS=1 node_modules/.bin/tsx --test tests/content-prose-shape-guard.test.ts 2>&1 | tail -10
# Expected: 6 tests pass
```

- [ ] **Step 5: 提交**

```bash
git add "src/content/tools/solopreneur-mrr-calculator.md" "src/content/tools/solopreneur-mrr-calculator.zh.md"
git commit -m "chore(p140b): cleanup MRR demo md P140a placeholder comments"
```

> **如果 Step 1 输出为空**（即 MRR md 干净），跳过本 task 直接 T2。

---

## Task 2: 批量写入 100 × 2 = 200 个 calculator prose md 文件（MECHANICAL）

**Files:**
- Create: `src/content/tools/solopreneur-<slug>.md` × 95（en，新文件；MRR 已在）
- Create: `src/content/tools/solopreneur-<slug>.zh.md` × 100（zh，新文件）
- Modify: `src/content/tools/solopreneur-mrr-calculator.zh.md`（如 zh 需对齐 P140b 模板措辞）

**Interfaces:**
- Consumes: T1 清理后的 MRR en/zh 文件作为「模板样本」
- Produces: 200 md 文件 — 全部通过 `content-prose-shape-guard`（frontmatter zod + 4 H2 + 词数阈值 relaxed + zh 缺位仅 warn）

> **核心策略：template + 抽样验证**
> - 模板：MRR en/zh 是 P140a 示范，4 H2 结构 + 词数 400+ chars en / 250+ chars zh
> - 批量写：用 subagent-driven-development，每个 subagent 拿到模板 + 一组 category engines（4-8 engines/group），按模板写 md；subagent 直接 commit per category group
> - 守卫验收：build-dep 守卫机械化校验 frontmatter / 4 H2 / 词数；human-eye 抽 5 engines × 2 langs = 10 文件读质量
> - Spec 中 P140b T2 = 30-50 commits；预估本 task 16 个 group commit（16 categories / 100 engines）

- [ ] **Step 1: 列出全部 100 个 engine slug + categoryId**

写一个临时脚本（**不提交**）：

```bash
cat > /tmp/list-slugs.mjs <<'EOF'
import { tools } from './src/data/tools/index.ts';
for (const t of tools) console.log(`${t.categoryId}\t${t.slug}\t${t.title}`);
EOF
node_modules/.bin/tsx /tmp/list-slugs.mjs > /tmp/slugs.tsv
wc -l /tmp/slugs.tsv
# Expected: 100 lines
```

读 `/tmp/slugs.tsv`，分类成 16 个 group（按 `src/engines/` 子目录）：
- A saas, B ai-cost, C valuation, D freelance, E cost, F investment, F real-estate, H hiring-team, K knowledge, L legal-compliance, M marketing, O operations, P product-analytics, R retention, S sales, T customer-support

- [ ] **Step 2: 派 16 个 subagent（按 category group），每个负责 1 组的 md 写入**

每个 subagent 收到：
1. 模板路径：`src/content/tools/solopreneur-mrr-calculator.md` + `.zh.md`（MRR 示范）
2. 该组的 slug + title 列表（从 Step 1 抽出）
3. 编辑约定：`src/content/tools/_README.md`（P140a 已建）
4. 报告路径：`docs/superpowers/.sdd/task-2-cat-<X>-report.md`
5. 输出契约：每 subagent **必须** 跑 `RUN_BUILD_TESTS=1 pnpm exec tsx --test tests/content-prose-shape-guard.test.ts` 验证自己 group 的文件全部通过守卫；report 包含 (a) created files list, (b) build-dep guard 输出, (c) sample 1 file raw prose, (d) 任何 concerns

每个 subagent 在自己的工作目录独立工作（`isolation: worktree`）。所有 subagent 并行 dispatch（16 个 Agent tool call in one message）。

- [ ] **Step 3: 收集所有 subagent report**

读每个 `task-2-cat-<X>-report.md`，确认：
- 每个 subagent 报 `BUILD TESTS PASS`
- 创建文件数 = 期望数（每个 group 4-8 engines × 2 langs = 8-16 md）
- 至少 1 个 sample 抽检 prose 通顺

如果某 subagent 报告 `BUILD TESTS FAIL` → 重派该 subagent 修复至 PASS。

- [ ] **Step 4: 在主分支 merge 所有 subagent worktree**

```bash
for cat in saas ai-cost valuation freelance cost investment real-estate hiring-team knowledge legal-compliance marketing operations product-analytics retention sales customer-support; do
  echo "=== merging $cat ==="
  git merge --no-ff "agent/p140b-t2-${cat}" -m "merge(p140b): ${cat} prose md files"
done
```

> **如果 subagent-driven-development 已经合并到主分支，则跳过本 step**（按 subagent 配置）。

- [ ] **Step 5: 全局验证 200 md 文件**

```bash
ls src/content/tools/ | grep -E '\.md$' | grep -v '_README.md' | wc -l
# Expected: 200（en 100 + zh 100）
RUN_BUILD_TESTS=1 node_modules/.bin/tsx --test tests/content-prose-shape-guard.test.ts 2>&1 | tail -20
# Expected: 6 tests pass
```

如果守卫 FAIL → 修至 PASS（hotfix）。

- [ ] **Step 6: 跑 pnpm build 验证 dist 仍 200 calc 页**

```bash
pnpm build 2>&1 | tail -10
ls dist/ | grep -E '^(en|zh)$' -A 200 | wc -l
# Expected: dist/en/<slug>/ + dist/zh/<slug>/ 各 100 = 200 calc 目录（page 数 449 不变）
```

- [ ] **Step 7: 提交（如 step 4 未自动 commit）**

```bash
git add -A src/content/tools/
git commit -m "feat(p140b): 200 calculator prose md files (100 en + 100 zh)"
```

> **Acceptance criteria for this task**（reviewer 验证项）：
> - 200 md 文件存在，frontmatter 通过 zod schema
> - 4 H2 段全部存在
> - per-H2 + full-doc 词数达 P140a relaxed 阈值（en: per-H2 ≥ 80, full ≥ 400；zh: per-H2 ≥ 50, full ≥ 250）
> - 抽样 10 文件（5 en + 5 zh，跨 5 categories）人工读 prose 通顺无拼写错
> - sources 链接全是真实 https URL（非 example.com）

---

## Task 3: `src/data/tools/types.ts` ToolMeta 新增 E-E-A-T 字段（INTEGRATION）

**Files:**
- Modify: `src/data/tools/types.ts`
- Modify: `src/data/tools/{16 category}.ts`（100 条 ToolMeta record 各加 3 字段默认值）

**Interfaces:**
- Consumes: 现有 `ToolMeta`（`reviewedBy: string` / `author: string` / `dataReviewedAt: string` / `sources: string[]`）
- Produces:
  - 类型扩展：`authorId: string` / `reviewerIds: string[]` / `sourcesRich: { name: string; url: string }[]`
  - 旧字段**保留不删**（P140d-T8 才删）
  - 100 条 record 自动获得默认（`authorId = 'wlz'`，`reviewerIds = []`，`sourcesRich = []`）

- [ ] **Step 1: 在 `src/data/tools/types.ts` 加新字段**

打开 `src/data/tools/types.ts`，在现有 `sources: string[];` 行**之后**加：

```ts
  // P140b-T3: AdSense E-E-A-T structured fields (additive — old fields kept
  // for backward compat; P140d-T8 removes `reviewedBy` + `sources` legacy
  // fields after migration is complete). Reviewer ids reference
  // src/data/reviewers.ts:reviewers[].id (P140c-T1).
  authorId: string;            // → reviewers[].id (default 'wlz' founder)
  reviewerIds: string[];       // → reviewers[].id[] (max 2 displayed per P140b-T6)
  sourcesRich: { name: string; url: string }[];  // superset of sources[], with URLs for link display
}
```

> 字段**末尾**的 `}` 是当前 interface 闭合符。确认 edit 不破坏闭合。

- [ ] **Step 2: 验证 tsc 立即报错（100 records 缺新字段 → 全红）**

```bash
pnpm exec tsc --noEmit 2>&1 | tail -30
# Expected: 100 errors "Property 'authorId' is missing in type ..."
```

- [ ] **Step 3: 给 16 个 category 文件的每条 ToolMeta 加默认值**

用 sed 在每条 record 的 `reviewedBy: '...'` 行**之前**插入 3 行：

```bash
# Dry-run first to inspect
for f in src/data/tools/{saas,ai-cost,valuation,freelance,cost,investment,real-estate,marketing,operations,sales,retention,product-analytics,hiring-team,customer-support,knowledge,legal-compliance}.ts; do
  echo "=== $f ==="
  grep -c "authorId:" "$f"
  # Expected: 0 (no record has authorId yet)
done
```

实际插入：每个 category 文件 pattern = 在每个 record 的 `reviewedBy:` 行之前插入 `    authorId: 'wlz',\n    reviewerIds: [],\n    sourcesRich: [],`

由于每 record 形态不同（部分可能字段顺序不同），建议**手 Edit**每个文件 — 或用 `scripts/p140b-add-eeat-fields.mjs` 一次性 codegen（**NOTE**: 这只是 helpers 工具，可以临时用，**不** commit 进 src/，只作为本 task 一次性脚本）。

实际写法（一次性 codegen 脚本，**用后删**）：

```js
// /tmp/p140b-add-eeat.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const cats = ['saas', 'ai-cost', 'valuation', /* ... */ ];
for (const cat of cats) {
  const path = `src/data/tools/${cat}.ts`;
  let src = readFileSync(path, 'utf8');
  // Insert before each `reviewedBy:` line that's preceded by 4 spaces of indent
  src = src.replace(
    /^(\s+)reviewedBy:/gm,
    '$1authorId: \'wlz\',\n$1reviewerIds: [],\n$1sourcesRich: [],\n$1reviewedBy:'
  );
  writeFileSync(path, src);
}
```

跑完后**删** `/tmp/p140b-add-eeat.mjs`。

- [ ] **Step 4: 验证 tsc 0 错**

```bash
pnpm exec tsc --noEmit 2>&1 | tail -10
# Expected: 0 errors
```

- [ ] **Step 5: 验证 ESLint + pnpm check**

```bash
pnpm check 2>&1 | tail -10
# Expected: 0 errors
```

- [ ] **Step 6: 提交**

```bash
git add "src/data/tools/types.ts" "src/data/tools/"*.ts
git commit -m "feat(p140b): ToolMeta E-E-A-T fields (authorId/reviewerIds/sourcesRich, additive)"
```

---

## Task 4: 接入 `CalculatorProse` 到 `[slug].astro`（INTEGRATION）

**Files:**
- Modify: `src/pages/[lang]/[slug].astro`

**Interfaces:**
- Consumes: P140a 的 `CalculatorProse.astro` 组件（接受 `{ entry, section }` props）
- Produces: 在 `[slug].astro` 中插入 4 段 `<CalculatorProse section="intro|methodology|limitations|example" />`，对应位置按 spec §4 拓扑：
  - intro：表单之前
  - methodology：result cards 之后
  - limitations：methodology 之后
  - example：limitations 之后、FAQ 之前

- [ ] **Step 1: 在 `[slug].astro` 顶部 import `CalculatorProse` + `getEntry`**

打开 `src/pages/[lang]/[slug].astro`，在 line 19 (`import { createSoftwareApplication, ... }`) 之后加：

```ts
import CalculatorProse from '../../components/CalculatorProse.astro';
import { getEntry } from 'astro:content';
```

- [ ] **Step 2: 在 frontmatter 段 `const toolTitle = t(...)` 之后加 prose 解析**

```ts
// P140b-T4: Resolve Calculator Content Collection entry (en + zh fallback).
// Each tool page renders 4 prose sections before/after the calculator form,
// per spec §4 topology. Missing zh → fallback to en with console.warn.
const proseEntry = await getEntry('tools', slug! + (lang === 'zh' ? '.zh' : ''))
  ?? await getEntry('tools', slug!);
if (!proseEntry && lang === 'zh') {
  console.warn(`[Prose] zh fallback for ${slug}`);
}
```

- [ ] **Step 3: 在模板里插入 4 段 CalculatorProse**

打开 `[slug].astro` 模板段（line 1248 附近），找到 form / result 之间的位置：

- **intro section**：在 form 之前（`<form ...` 之前一行）：
  ```astro
  {proseEntry && <CalculatorProse entry={proseEntry} section="intro" />}
  ```

- **methodology + limitations + example**：在 `</div>` 关闭 results section 之后（line ~1270 附近）、`<FAQ items=... />` 之前：
  ```astro
  {proseEntry && (
    <>
      <CalculatorProse entry={proseEntry} section="methodology" />
      <CalculatorProse entry={proseEntry} section="limitations" />
      <CalculatorProse entry={proseEntry} section="example" />
    </>
  )}
  ```

具体行号需读 `[slug].astro` 实际位置（line ~1273 是 `<FAQ items={translatedFaq} />`）。

- [ ] **Step 4: 验证 pnpm build 通过 + dist 含 prose 容器**

```bash
pnpm build 2>&1 | tail -10
# Expected: 0 errors

# Verify dist HTML has 4 prose containers per page
grep -c 'aria-label="intro"' dist/en/solopreneur-mrr-calculator/index.html
# Expected: 1
grep -c 'aria-label="methodology"' dist/en/solopreneur-mrr-calculator/index.html
# Expected: 1
grep -c 'aria-label="limitations"' dist/en/solopreneur-mrr-calculator/index.html
# Expected: 1
grep -c 'aria-label="example"' dist/en/solopreneur-mrr-calculator/index.html
# Expected: 1
```

- [ ] **Step 5: 验证 zh fallback 行为**

故意删 zh 文件，跑 build 应 warn（不 fail）：

```bash
mv src/content/tools/solopreneur-mrr-calculator.zh.md /tmp/
pnpm build 2>&1 | grep -E 'Prose.*zh fallback' | head -3
# Expected: 1 行 [Prose] zh fallback for solopreneur-mrr-calculator
mv /tmp/solopreneur-mrr-calculator.zh.md src/content/tools/
```

- [ ] **Step 6: 跑 pnpm check**

```bash
pnpm check 2>&1 | tail -10
# Expected: 0 errors
```

- [ ] **Step 7: 提交**

```bash
git add "src/pages/[lang]/[slug].astro"
git commit -m "feat(p140b): wire CalculatorProse into [slug].astro (4 sections, zh fallback)"
```

---

## Task 5: 扩充 100 个 engine 的 faq 到 12+ 条（INTEGRATION）

**Files:**
- Modify: `src/engines/**/<slug>.ts`（100 个，每个加 7-8 条新 FAQ）
- Modify: `src/i18n/translations.ts`（en + zh 各 +700~800 FAQ key）

**Interfaces:**
- Consumes: 现有 `engine.faq: { q, a }[]`（5 条/引擎）
- Produces:
  - `engine.faq` 12+ 条（人工 + AI-draft review 添加 7-8 条）
  - `src/i18n/translations.ts` 加 2400 条 `tools.${slug}.faq[N].q` + `.a`（en + zh × 12 × 100 = 2400）

> **核心策略：AI-draft + 人工 review**
> - 用模板 per engine 类别生成 7-8 条新 FAQ（针对该 engine 的真实业务场景，避免通用废话）
> - FAQ 必须涉及：(a) 输入参数解释；(b) 输出含义解释；(c) 与其他工具的关系；(d) 常见误用警告；(e) 与行业基准的对比；(f) 集成到决策流程的建议；(g) 限制条件 + 何时不用；(h) 进阶问题（如「按月累计还是按年累计」）
> - 翻译流程：英文版生成 → 走 zh i18n key 直接存（不走 translations.ts 的"反查"模式）

- [ ] **Step 1: 编写一次性 codegen 脚本（**用后删**）**

```js
// /tmp/p140b-extend-faq.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ENGINE_DIRS = [
  'src/engines/ai-cost', 'src/engines/cost', 'src/engines/customer-support',
  'src/engines/freelance', 'src/engines/hiring-team', 'src/engines/investment',
  'src/engines/knowledge', 'src/engines/legal-compliance', 'src/engines/marketing',
  'src/engines/operations', 'src/engines/product-analytics', 'src/engines/real-estate',
  'src/engines/retention', 'src/engines/saas', 'src/engines/sales', 'src/engines/valuation',
];

for (const dir of ENGINE_DIRS) {
  for (const file of readdirSync(dir).filter(f => f.endsWith('.ts') && f !== 'index.ts')) {
    const path = join(dir, file);
    let src = readFileSync(path, 'utf8');
    // Insert 7 placeholder FAQ items before the closing `],` of the faq array.
    // The faq array ends with `  ],\n};` in most engines. Use a regex to find
    // the last entry in the faq array and append after it.
    //
    // For now, just print the file's last 5 lines so the implementer can
    // identify the pattern. (Per category batch, hand-edit for now.)
    console.log(`=== ${path} ===`);
    console.log(src.split('\n').slice(-8).join('\n'));
  }
}
```

`node_modules/.bin/tsx /tmp/p140b-extend-faq.mjs | head -50`

**实现路径选择**：先看每个 engine 的 faq array 末尾形态：
- 如果全部统一 pattern → codegen 自动插入 7 条新 FAQ 占位（`{ q: 'PLACEHOLDER', a: 'PLACEHOLDER' }`）→ 然后**人工**或**AI-draft subagent** 逐个 fill
- 如果 pattern 不统一 → 改用 per-file subagent（每个 engine 一个 subagent）

- [ ] **Step 2: AI-draft + 人工 review（核心工作量）**

派 8-16 个 subagent，每个负责一个 category 的 6 个 engines（每个 engine 加 7-8 条 FAQ）。

每个 subagent 收到：
1. 该 category 的 6 个 engine 文件路径
2. FAQ 模板（每条 FAQ 必涉及 8 类话题中的 ≥5 类）
3. **强制** 每条 FAQ 的 `q` 是具体问题（不要 "What is X?" 通用疑问），`a` 是 2-4 句具体回答（不要 "Yes" / "No" / "It depends"）
4. 报告路径：`docs/superpowers/.sdd/task-5-cat-<X>-report.md`
5. 输出契约：(a) 列出 6 个 engine 各加几条 + 总数；(b) sample 5 条 FAQ（q + a 完整）；(c) 任何 concerns

**Acceptance**：每 engine 12+ FAQ，词汇避免通用废话（"depends on", "various factors"），每条 a ≥ 60 chars（en）/ 30 chars（zh）。

- [ ] **Step 3: 同步 i18n translations**

T2 完成后，每个 engine 的 `engine.faq` 是数组，**en 侧**在 `staticExamples[0]` 时直接用；**zh 侧**翻译需要落 `translations.ts`。

但当前架构：`[slug].astro` line 1273 是 `<FAQ items={translatedFaq} />`。`translatedFaq` 是 `t(`tools.${slug}.faq[N].q`, lang)` + `t(`tools.${slug}.faq[N].a`, lang)`。

读 `[slug].astro` 实际 `translatedFaq` 构造段（在 line 200-300 之间的某处 — 视实际代码）。

**实现方案**：
- 在 `translations.ts` 给每个 engine 加 `tools.${slug}.faq[0..11].q` + `.a` × en + zh
- 共 2400 keys 净增
- codegen 脚本从 engine 文件提取 q + a 列表，写到 translations.ts

**或**：简化路径 — 修改 `[slug].astro` 让 `translatedFaq` 直接从 `engine.faq` 拿 en 文案，zh 用 `t()` 反查。这样新增 FAQ 不需要 codegen translations。

**推荐第二种**：修改 `[slug].astro` 的 `translatedFaq` 逻辑：

```ts
const translatedFaq = engine.faq.map((item, i) => ({
  q: lang === 'en' ? item.q : (t(`tools.${slug}.faq[${i}].q`, lang) || item.q),
  a: lang === 'en' ? item.a : (t(`tools.${slug}.faq[${i}].a`, lang) || item.a),
}));
```

这样新增 FAQ 只用改 engine 文件，translations.ts 只在 zh 翻译覆盖时填。

> **决策**：在 T5 subagent brief 中说明这个逻辑，让 subagent 视情况决定 zh 翻译覆盖率（可以 P140b ship 时只 en 完整 + zh 部分覆盖，P140d-T8 强制 zh 100%）。

- [ ] **Step 4: 验证 100 engines × 12 FAQ = 1200 条**

```bash
grep -cE "q: '" src/engines/**/*.ts | awk -F: '{sum += $2} END {print sum}'
# Expected: 至少 1200（100 engines × 12 FAQ）
```

- [ ] **Step 5: 跑 build + check**

```bash
pnpm build 2>&1 | tail -10
pnpm check 2>&1 | tail -10
# Expected: 0 errors
```

- [ ] **Step 6: 提交**

```bash
git add src/engines/ "src/i18n/translations.ts" "src/pages/[lang]/[slug].astro"
git commit -m "feat(p140b): 100 engines FAQ 5 → 12+ each (with en + zh i18n)"
```

---

## Task 6: 升级 `EeatTrustBlock.astro` 显示 Author/Reviewer/Sources（INTEGRATION）

**Files:**
- Modify: `src/components/EeatTrustBlock.astro`
- Modify: `src/i18n/translations.ts`（加 4 个新 eeat key）
- Modify: `src/pages/[lang]/[slug].astro`（喂新的 props）

**Interfaces:**
- Consumes: 当前 `Props { reviewedBy, dataReviewedAt, sources, author }`（字符串简单显示）
- Produces:
  - 新 Props：`{ author: { id, name, role, bio }, reviewers: { id, name, role, expertise[] }[], sourcesRich: { name, url }[], dataReviewedAt }`
  - 渲染升级：Author 卡（avatar placeholder + name + role + bio 第一句）+ Reviewer 卡（≤2 个，role + expertise tags）+ Sources 列表（每个 link rel=noopener）+ Last reviewed 相对时间 + 绝对日期 + Suggest improvement 邮件链接
  - i18n 加 4 key：`eeat.author_role.founder` / `eeat.author_role.analyst` / `eeat.author_role.expert` / `eeat.author_role.engineer`

> **注意**：T3 加了 `authorId` / `reviewerIds` / `sourcesRich` 到 ToolMeta。但 P140c-T1 才建 `src/data/reviewers.ts`。所以 T6 当前**不**实际渲染 reviewer 数据，只**展示 Props 接口**（数据结构准备 OK）。等 P140c-T1 ship 后，[slug].astro 才会真正喂 reviewer 解析后的数据。
>
> 即 T6 是**接口 + UI 占位**；具体数据流向 P140c 补完。
>
> **本 task 实际工作**：
> 1. EeatTrustBlock.astro 新 Props 定义 + UI 模板（Author 卡 + Reviewer 卡 + Sources 列表）
> 2. [slug].astro 把 ToolMeta 的新字段喂进去（即便 reviewer 数据是空也走通；reviewer 名字将来从 reviewers.ts 解析）
> 3. 加 4 个 i18n key

- [ ] **Step 1: 加 4 个 i18n key 到 `translations.ts`**

```ts
// P140b-T6: AdSense E-E-A-T author/reviewer role labels
eeat: {
  // ... existing keys
  author_role: {
    founder: 'Founder',
    analyst: 'Analyst',
    expert: 'Industry Expert',
    engineer: 'Software Engineer',
  },
  reviewer_role: {
    founder: 'Founder',
    analyst: 'Analyst',
    expert: 'Industry Expert',
    engineer: 'Software Engineer',
  },
  reviewer_expertise_label: 'Expertise',
  sources_count: '{count} sources',
  // zh
  // (mirror above in zh block)
}
```

具体 line 需要看 translations.ts 当前 `eeat:` block 位置。

- [ ] **Step 2: 重写 `src/components/EeatTrustBlock.astro`**

```astro
---
import { t, getLang } from '../i18n';

export interface AuthorInfo {
  id: string;
  name: string;
  role: 'founder' | 'analyst' | 'expert' | 'engineer';
  bio: string;          // 1 sentence preview (en or zh based on lang)
}

export interface ReviewerInfo {
  id: string;
  name: string;
  role: 'founder' | 'analyst' | 'expert' | 'engineer';
  expertise: string[];
}

export interface SourceRich {
  name: string;
  url: string;
}

export interface Props {
  author: AuthorInfo;
  reviewers: ReviewerInfo[];        // max 2 displayed
  sourcesRich: SourceRich[];        // ≥ 1
  dataReviewedAt: string;           // YYYY-MM-DD
}

const { author, reviewers, sourcesRich, dataReviewedAt } = Astro.props;
const lang = getLang(Astro);
const contactEmail = t('eeat.contact_email', lang);

// P140b-T6: Last reviewed relative time (e.g. "5 days ago") + absolute date.
const reviewedDate = new Date(dataReviewedAt);
const today = new Date();
const diffDays = Math.floor((today.getTime() - reviewedDate.getTime()) / 86400000);
const relativeTime =
  diffDays < 1 ? 'today'
  : diffDays < 30 ? `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  : diffDays < 365 ? `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) === 1 ? '' : 's'} ago`
  : `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) === 1 ? '' : 's'} ago`;
---

<aside class="mt-12 p-6 bg-gray-50 border border-gray-200 rounded-2xl" aria-label={t('eeat.title', lang)}>
  <div class="flex items-center gap-2 mb-4">
    <span class="text-green-600 text-lg">✓</span>
    <h3 class="text-sm font-bold text-gray-900 uppercase tracking-wide">{t('eeat.title', lang)}</h3>
  </div>

  <!-- Author 卡 -->
  <div class="flex items-start gap-3 mb-4 pb-4 border-b border-gray-200">
    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] flex items-center justify-center text-white font-bold text-lg flex-shrink-0" aria-hidden="true">
      {author.name.charAt(0).toUpperCase()}
    </div>
    <div class="flex-1">
      <div class="text-sm font-semibold text-gray-900">{author.name}</div>
      <div class="text-xs text-gray-500 uppercase tracking-wide mt-0.5">{t(`eeat.author_role.${author.role}`, lang)}</div>
      <p class="text-sm text-gray-700 mt-2">{author.bio}</p>
    </div>
  </div>

  <!-- Reviewer 卡 -->
  {reviewers.length > 0 && (
    <div class="mb-4 pb-4 border-b border-gray-200">
      <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('eeat.reviewers', lang)}</div>
      <div class="space-y-3">
        {reviewers.slice(0, 2).map(r => (
          <div class="flex items-start gap-2">
            <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-semibold text-xs flex-shrink-0" aria-hidden="true">
              {r.name.charAt(0).toUpperCase()}
            </div>
            <div class="flex-1">
              <div class="text-sm font-medium text-gray-900">{r.name} · <span class="text-xs text-gray-500">{t(`eeat.reviewer_role.${r.role}`, lang)}</span></div>
              {r.expertise.length > 0 && (
                <div class="flex flex-wrap gap-1 mt-1">
                  {r.expertise.slice(0, 4).map(e => (
                    <span class="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">{e}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )}

  <!-- Sources 链接列表 -->
  {sourcesRich.length >= 1 && (
    <div class="mb-4 pb-4 border-b border-gray-200">
      <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('eeat.sources', lang)} · {sourcesRich.length}</div>
      <ul class="space-y-1">
        {sourcesRich.map(s => (
          <li class="text-sm text-gray-700">
            <a href={s.url} rel="noopener noreferrer" target="_blank" class="text-[#7C3AED] hover:underline">{s.name}</a>
          </li>
        ))}
      </ul>
    </div>
  )}

  <!-- Last reviewed -->
  <div class="text-xs text-gray-500 mb-3">
    {t('eeat.last_reviewed', lang)}: <span class="font-medium text-gray-700">{relativeTime}</span> ({dataReviewedAt})
  </div>

  <!-- Suggest improvement -->
  <p class="pt-3 border-t border-gray-200 text-sm text-gray-600">
    📧 <a href={`mailto:${contactEmail}`} class="text-[#7C3AED] hover:underline font-medium">{t('eeat.suggest_improvement', lang)}</a>
    <span class="block mt-1 text-xs text-gray-500">{t('eeat.suggest_body', lang)}</span>
  </p>
</aside>
```

- [ ] **Step 3: 改 `[slug].astro` 喂新 props**

找到 `[slug].astro` 当前 `<EeatTrustBlock ... />` 的调用处（line ~1300 附近），改：

```astro
<EeatTrustBlock
  author={{
    id: tool.authorId,
    name: tool.authorId === 'wlz' ? 'ForgeFlowKit Editorial' : tool.authorId,
    role: 'founder',  // P140c-T1 will resolve from reviewers.ts
    bio: '...'  // P140c-T1 will resolve
  }}
  reviewers={tool.reviewerIds.map(id => ({
    id,
    name: id,
    role: 'analyst' as const,
    expertise: []
  }))}
  sourcesRich={tool.sourcesRich}
  dataReviewedAt={tool.dataReviewedAt}
/>
```

具体位置 + 真实数据 flow 在 P140c-T1 后会精确化。当前先用 `tool.authorId` 直接作为 name（reviewer 真实数据待 P140c）。

- [ ] **Step 4: 验证 build + dist EeatTrustBlock 渲染**

```bash
pnpm build 2>&1 | tail -10
# Expected: 0 errors

grep -c 'aria-label.*E-E-A-T\|aria-label.*eeat' dist/en/solopreneur-mrr-calculator/index.html
# Expected: 1（aside 元素）
grep -c 'ForgeFlowKit Editorial' dist/en/solopreneur-mrr-calculator/index.html
# Expected: 1
```

- [ ] **Step 5: 跑 pnpm check**

```bash
pnpm check 2>&1 | tail -10
# Expected: 0 errors
```

- [ ] **Step 6: 提交**

```bash
git add "src/components/EeatTrustBlock.astro" "src/i18n/translations.ts" "src/pages/[lang]/[slug].astro"
git commit -m "feat(p140b): EeatTrustBlock with Author card + Reviewer cards + Sources links"
```

---

## Task 7: `createSoftwareApplication` 加 `author` + `review` 结构化字段（INTEGRATION）

**Files:**
- Modify: `src/lib/seo-factory.ts`
- Modify: `src/pages/[lang]/[slug].astro`（喂 `createSoftwareApplication` 的新参数）

**Interfaces:**
- Consumes: 当前 `SoftwareApplicationInput { ..., author: string, reviewedBy: string, dataReviewedAt }`
- Produces:
  - `SoftwareApplicationInput` 加 `author: { name: string; url?: string }` + `review: { author: { name: string; url?: string } }[]`
  - JSON-LD 输出加 `author: { '@type': 'Person', name, url? }` + `review: [{ '@type': 'Review', author: { '@type': 'Person', name, url? } }]`
  - 旧 `reviewedBy: { '@type': 'Organization', name }` **保留不删**（迁移期）

> **Schema.org 语义**：
> - `author` (Person): 谁**写**了这个计算器
> - `review` (Review[]): 谁**审核**了这个计算器（结构化审核信号，AdSense E-E-A-T 关键）
> - 旧 `reviewedBy` (Organization): 已存在的组织级 review 信号，保留作兼容

- [ ] **Step 1: 扩展 `SoftwareApplicationInput` 接口**

打开 `src/lib/seo-factory.ts`，找到 `export interface SoftwareApplicationInput`（line 101-111）：

```ts
export interface SoftwareApplicationInput {
  lang: 'en' | 'zh';
  toolTitle: string;
  toolDescription: string;
  toolSlug: string;
  applicationCategory: string;
  featureList: string[];
  author: string;                              // legacy: org-level string
  reviewedBy: string;                          // legacy: org-level string
  dataReviewedAt: string;
  // P140b-T7: Structured E-E-A-T fields (additive). Author is the writer;
  // review[] is the structured list of human reviewers. Schema.org prefers
  // Person objects over plain strings for E-E-A-T signals.
  authorInfo?: { name: string; url?: string };                       // → JSON-LD `author`
  reviewInfo?: { author: { name: string; url?: string } }[];          // → JSON-LD `review[]`
}
```

- [ ] **Step 2: 修改 `createSoftwareApplication` 实现**

```ts
export function createSoftwareApplication(input: SoftwareApplicationInput) {
  const { lang, toolTitle, toolDescription, toolSlug, applicationCategory, featureList, author, reviewedBy, dataReviewedAt, authorInfo, reviewInfo } = input;
  const url = `${SITE_URL}/${lang}/${toolSlug}/`;
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${url}#app`,
    name: toolTitle,
    applicationCategory,
    operatingSystem: 'Web',
    description: toolDescription,
    url,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    featureList,
    isAccessibleForFree: true,
    inLanguage: lang,
    provider: { '@id': `${SITE_URL}/#org` },
    // P140b-T7: structured author (Person object preferred over string for E-E-A-T)
    author: authorInfo
      ? { '@type': 'Person', name: authorInfo.name, ...(authorInfo.url ? { url: authorInfo.url } : {}) }
      : { '@id': `${SITE_URL}/#org` },     // fallback to org
    dateModified: dataReviewedAt,
    // Legacy reviewedBy (Organization): kept for backward compat
    reviewedBy: { '@type': 'Organization', name: reviewedBy },
    // P140b-T7: structured review[] (array of Review objects)
    ...(reviewInfo && reviewInfo.length > 0
      ? {
          review: reviewInfo.map(r => ({
            '@type': 'Review',
            author: { '@type': 'Person', name: r.author.name, ...(r.author.url ? { url: r.author.url } : {}) },
          })),
        }
      : {}),
    publisher: { '@id': `${SITE_URL}/#org` },
  };
}
```

- [ ] **Step 3: 改 `[slug].astro` 喂新参数**

找到 `[slug].astro` 当前调用 `createSoftwareApplication(...)` 处，**新参数**：

```ts
const softwareAppLd = createSoftwareApplication({
  // ... existing fields
  authorInfo: { name: 'ForgeFlowKit Editorial', url: `${SITE_URL}/about/authors/` },
  reviewInfo: tool.reviewerIds.length > 0
    ? tool.reviewerIds.slice(0, 2).map(id => ({
        author: { name: id, url: `${SITE_URL}/about/authors/#${id}` },
      }))
    : [],
});
```

> 实际行号 / 调用 context 需读 `[slug].astro` 第 200-300 行附近的 JSON-LD 构造段。

- [ ] **Step 4: 验证 dist JSON-LD 含新字段**

```bash
pnpm build 2>&1 | tail -10
grep -o '"author":{"@type":"Person","name":"ForgeFlowKit Editorial"' dist/en/solopreneur-mrr-calculator/index.html | head -1
# Expected: 命中 1 次
grep -o '"review":\[{"@type":"Review"' dist/en/solopreneur-mrr-calculator/index.html | head -1
# Expected: 命中 1 次（如果 reviewerIds 非空）
```

- [ ] **Step 5: 跑现有 json-ld-guard 验证未引入 schema 缺陷**

```bash
RUN_BUILD_TESTS=1 node_modules/.bin/tsx --test tests/json-ld-field-guard.test.ts 2>&1 | tail -10
# Expected: pass (新字段已扩展 schema 而非破坏)
```

- [ ] **Step 6: 跑 pnpm check**

```bash
pnpm check 2>&1 | tail -10
# Expected: 0 errors
```

- [ ] **Step 7: 提交**

```bash
git add "src/lib/seo-factory.ts" "src/pages/[lang]/[slug].astro"
git commit -m "feat(p140b): SoftwareApplication JSON-LD author + review structured fields"
```

---

## Task 8: 收紧 `content-prose-shape-guard` + 加 zh counterpart warn 守卫（MECHANICAL）

**Files:**
- Modify: `tests/content-prose-shape-guard.test.ts`（收紧阈值 + zh warn）
- Create: `tests/content-prose-zh-counterpart-warn.test.ts`（source-only）

**Interfaces:**
- Consumes: P140a-T7 的 6-test guard（relaxed 阈值：en perH2=80 / total=400；zh perH2=50 / total=250）
- Produces:
  - 阈值收紧到 spec §3 最终值（en perH2=80 / total=400 — 与 P140a 相同，但加严 perH2 至少 100 chars；zh perH2=50 / total=250 — 加严 perH2 至少 70 chars）
  - **新增** zh counterpart warn test（P140b 阶段仍仅 warn；P140d-T8 升级为 fail）

> **Spec §3 阈值（最终）**：
> - en：每 H2 ≥ 80 chars，全文 ≥ 400 chars
> - zh：每 H2 ≥ 50 chars，全文 ≥ 250 chars
>
> **P140a 阈值（relaxed）** = spec §3 最终值（即 P140a 已直接用最终阈值，本 task 无变化）
>
> 实际收紧：
> - perH2 阈值：en 80 → 100；zh 50 → 70（更严格）
> - 全文字数阈值不变
> - 加 **zh counterpart warn test** — 100 en 文件，缺 zh 的仅 console.warn

- [ ] **Step 1: 修改 `tests/content-prose-shape-guard.test.ts` 阈值**

找到 `THRESHOLDS` const（line ~967）：

```ts
const THRESHOLDS = {
  en: { perH2: 100, total: 400 },  // P140b-T8: perH2 80 → 100
  zh: { perH2: 70, total: 250 },   // P140b-T8: perH2 50 → 70
} as const;
```

- [ ] **Step 2: 验证守卫仍 PASS（200 文件满足收紧阈值）**

```bash
RUN_BUILD_TESTS=1 node_modules/.bin/tsx --test tests/content-prose-shape-guard.test.ts 2>&1 | tail -20
# Expected: 6 tests pass
```

如果 FAIL → 找出 threshold-violating 文件，hint 给 subagent 补 prose 至阈值（**不**降阈值）。

- [ ] **Step 3: 创建 `tests/content-prose-zh-counterpart-warn.test.ts`**

```ts
#!/usr/bin/env node
// P140b-T8: Source-only CI guard that emits console.warn for each en prose
// file that lacks a zh counterpart. P140b/c phase tolerates missing zh (we're
// shipping en-first); P140d-T8 will tighten this to console.error → build fail.
//
// Why this exists:
//   The 100 en prose files shipped in P140b-T2. zh counterparts are added
//   incrementally. We want CI to surface the zh-gap so reviewers see it in
//   the test output, without blocking P140b/c ship.
//
// References:
//   - spec §3 zh fallback strategy (P140a/b tolerated, P140d strict)
//   - spec §9 P140b T8 ("warn only — zh 缺位 fail 留给 P140d-T8")

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const PROSE_DIR = resolve(root, 'src/content/tools');

test('zh counterparts are encouraged but not required yet (P140b phase)', () => {
  if (!existsSync(PROSE_DIR)) {
    console.warn(`[p140b-T8] ${PROSE_DIR} does not exist — skipping zh counterpart check`);
    assert.ok(true);
    return;
  }
  const files = readdirSync(PROSE_DIR).filter(n => n.endsWith('.md') && n !== '_README.md');
  const missing: string[] = [];
  for (const filename of files) {
    if (filename.endsWith('.zh.md')) continue;
    const slug = filename.replace(/\.md$/, '');
    const zhName = `${slug}.zh.md`;
    if (!files.includes(zhName)) missing.push(zhName);
  }
  if (missing.length > 0) {
    console.warn(`[p140b-T8] ${missing.length} en files lack zh counterparts (P140b tolerated):`);
    for (const m of missing.slice(0, 20)) console.warn(`  - ${m}`);
    if (missing.length > 20) console.warn(`  ... and ${missing.length - 20} more`);
  }
  // Always pass (P140b: warn only)
  assert.ok(true, 'zh counterpart check is warn-only at P140b ship');
});
```

- [ ] **Step 4: 验证两个守卫都通过**

```bash
node_modules/.bin/tsx --test tests/content-prose-zh-counterpart-warn.test.ts 2>&1 | tail -10
# Expected: 1 test pass, console.warn 行（如有缺失）

RUN_BUILD_TESTS=1 node_modules/.bin/tsx --test tests/content-prose-shape-guard.test.ts 2>&1 | tail -10
# Expected: 6 tests pass
```

- [ ] **Step 5: 把新守卫注册到 `tests/run.mjs` skip-mode listing**

打开 `tests/run.mjs` line 82 附近，在末尾加：

```js
console.log('[skip-mode]   content-prose-shape-guard, content-prose-zh-counterpart-warn');
```

或新加一行（按当前格式）。

- [ ] **Step 6: 跑全 suite**

```bash
pnpm test:unit 2>&1 | tail -20
RUN_BUILD_TESTS=1 pnpm test:unit 2>&1 | tail -20
# Expected: 全部 pass
```

- [ ] **Step 7: 提交**

```bash
git add "tests/content-prose-shape-guard.test.ts" "tests/content-prose-zh-counterpart-warn.test.ts" "tests/run.mjs"
git commit -m "test(p140b): tighten content-prose-shape thresholds (en perH2 80→100, zh 50→70) + zh counterpart warn guard"
```

---

## Self-Review（写完计划后自检）

### 1. Spec coverage（spec §9 P140b 8-task 检查）

| spec task | plan task | 状态 |
| --------- | --------- | ---- |
| T1 MRR demo md 转正式 | Task 1: 清 P140a 占位注释 | ✓ |
| T2 200 md 文件批量写入 | Task 2: 16 subagent 并行写入 + 守卫自检 | ✓ |
| T3 tools.ts 升级：author_id / reviewers / sources | Task 3: ToolMeta 新增 3 字段（additive） | ✓ |
| T4 [slug].astro 注入 CalculatorProse | Task 4: 4 段 prose wire + zh fallback | ✓ |
| T5 FAQ 12 条加密 | Task 5: 16 subagent AI-draft + 人工 review | ✓ |
| T6 EeatTrustBlock 升级 | Task 6: Author/Reviewer/Sources UI | ✓ |
| T7 seo-factory structured data | Task 7: author + review[] JSON-LD | ✓ |
| T8 收紧 content-prose-shape-guard | Task 8: 阈值 + zh warn 守卫 | ✓ |

All 8 spec tasks covered.

### 2. Placeholder scan

```bash
grep -nE 'TBD|TODO|FIXME|XXX|占位|to be (defined|determined)|待定|待填' docs/superpowers/plans/2026-07-31-p140b-content-mass-write.md
```

Expected: 无输出（仅出现"占位"在 step 内"占位注释"上下文，非真占位）。

### 3. Type consistency

- T1: 仅 md 文件清理
- T2: 200 md 文件，frontmatter 字段集与 P140a `toolsFrontmatterSchema` 一致（engine_ref, category_id, reviewed_by, author, data_reviewed_at, sources）
- T3: `ToolMeta` 新增 `authorId: string` / `reviewerIds: string[]` / `sourcesRich: { name: string; url: string }[]` — 旧 `reviewedBy: string` / `sources: string[]` 保留
- T4: `CalculatorProse` props `entry` + `section` 不变（P140a 已定义）
- T5: `engine.faq: { q, a }[]` 形态不变，仅扩长度
- T6: `EeatTrustBlock` 新 Props：AuthorInfo / ReviewerInfo / SourceRich — 全新 interface（与旧 Props 不兼容，但旧 Props 调用方在 T6 Step 3 同步改）
- T7: `SoftwareApplicationInput` 新增 2 字段（authorInfo + reviewInfo）— additive
- T8: `THRESHOLDS` 常量收紧；新 zh counterpart warn test 独立文件

### 4. 风险 + 回滚

| 风险 | 回滚 |
| ---- | ---- |
| T2 200 md 文件 subagent 质量不达标 | 重派该 subagent；极端情况删文件回滚 |
| T3 ToolMeta 字段名与 spec 不一致 | 改回（spec 用 `author_id` 而 TS 用 `authorId` — 这是约定差异，**保留** camelCase） |
| T4 zh fallback console.warn 风暴 | 控制台 grep 过滤；不影响 build |
| T5 FAQ AI-draft 废话多 | 人工 review；硬卡词数 + 内容话题覆盖 |
| T6 EeatTrustBlock 新 Props 缺数据 | reviewer 数据空时 UI 优雅退化（不显示 Reviewer 卡） |
| T7 JSON-LD `review` 字段空时 schema 不合法 | 已在 Step 2 spread 守空数组（不输出 review key） |
| T8 zh warn 守卫把所有 zh 缺位都报 | 设计如此；warn 不 fail |

### 5. Holistic cross-cutting pre-merge

**P140b 总文件影响面**：
```
新增  ~200 文件 (md)
修改  17 ts 文件 (tools/types + 16 cat) + 1 i18n file + 1 [slug].astro + 1 EeatTrustBlock.astro + 1 seo-factory.ts + 2 test files
```

CLAUDE.md "5+ 文件相似 pattern" 触发条件完全命中。**P140b ship 前跑 1 次 holistic cross-cutting review**（spec §9 中段 holistic 段触发）：

1. 200 md 文件 frontmatter schema 一致性（schema 守卫已能机械化覆盖）
2. 200 md 文件 4 H2 顺序一致性（守卫已覆盖）
3. sources 链接全部 https 且能打开（人工抽 20 个）
4. 没有重复/抄袭句子（per-category 抽检）
5. [slug].astro 4 段 CalculatorProse 插入位置正确（dist 人工 5 页面抽检）
6. EeatTrustBlock 新 UI 在所有 100 页面渲染（dist grep）
7. JSON-LD author + review 字段在所有 100 页面渲染（dist grep）

---

## Execution Handoff

Plan 完成并保存到 `docs/superpowers/plans/2026-07-31-p140b-content-mass-write.md`。

两种执行方式选哪个？
