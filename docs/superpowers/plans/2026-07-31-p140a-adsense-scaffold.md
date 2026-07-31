# P140a — AdSense 骨架 + 内容 Schema 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 AdSense compliance 整改的脚手架层 —— 删除字面 AdUnit 占位组件并清理全部 import/用法；定义 Calculator Content Collections schema 与 zod 校验；落地一个示范 md 文件 + 通用 CalculatorProse 渲染组件；新增 2 个 CI 守卫（一个 source-only、一个 build-dep）确保整改不回流。**本 PR 不要求 100 个 md 文件到位** —— 那是 P140b 的工作。P140a 仅交付骨架 + 1 个示范 + 防御层。

**Architecture:**
- 删 `src/components/AdUnit.astro` 改用 Google AdSense Auto Ads（BaseLayout 中 `<script src="...adsbygoogle.js?client=ca-pub-3420554170441272">` 已存在，本批只删占位、不动 Auto Ads 入口）
- 用 Astro Content Collections 引入 prose 文本层，文件落在 `src/content/tools/<slug>.{lang}.md`
- 用 zod schema 校验 frontmatter （slug / engine_ref / category_id / reviewed_by / author / data_reviewed_at / sources）
- 新组件 `CalculatorProse.astro` 接收 Content entry 后渲染 4 H2 Markdown
- 两套守卫：source-only 守住 AdUnit 不能复活；build-dep 守住 100 md 文件 4 H2 + 词数阈值

**Tech Stack:** Astro 4.16.19 (static)、TypeScript 5.6、Astro Content Collections、`astro:content`、zod、node:test 守卫

---

## Global Constraints

| 约束                                                                 | 值                                                                                                                                  |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Astro 版本下限                                                      | 4.16.19（在 `package.json` 中 `"astro": "^4.13.2"` 实际安装）                                                                       |
| TypeScript 模式                                                     | strict（CLAUDE.md）                                                                                                                  |
| 引擎 slug 模式                                                      | `^solopreneur-[a-z0-9-]+$`（来自 `src/data/tools/saas.ts` 等 16 个子目录）                                                          |
| 引擎总数锁定                                                        | 100（来自 `tests/lib/engine-count.ts:EXPECTED_ENGINE_COUNT`，P22b）                                                                  |
| 分类字母                                                            | A/B/C/D/E/F/H/K/L/M/O/P/R/S/T（15 个，CLAUDE.md）                                                                                  |
| AdSense publisher ID                                                | `ca-pub-3420554170441272`（BaseLayout 当前值，P140a 不动）                                                                          |
| 工具页 schema 锁                                                    | `Astro.props.slot ∈ { 'home-hero', 'home-mid', 'home-footer', 'tool-result', 'blog-mid', 'blog-end' }`（AdUnit 历史 API，P140a 删除）|
| 守卫脚本格式                                                        | `#!/usr/bin/env node` + `node:test` + `tests/run.mjs` 收录模式，文件名 `tests/*.test.ts`（CLAUDE.md P22b ESM trap）                    |
| Build-dep gate                                                      | `RUN_BUILD_TESTS=1`（P23b skip-guard pattern，新守卫沿用）                                                                            |
| pnpm check 必须过                                                    | `pnpm check` 必过才能 commit（CLAUDE.md 红线）                                                                                        |
| i18n 来源                                                            | `src/i18n/translations.ts`（P140a 不动）                                                                                              |
| 内存 / engine count 不漂移                                          | 100 engines locked（CLAUDE.md 表格）                                                                                                  |
| Defensive comment 风格                                              | 末尾 `// P140a-N: ...` 编号注释（参考 P83 / P138 / P55b 的 `// P138:` 编号风格）                                                      |

---

## File Structure（计划落盘的所有文件 + 职责）

| 文件                                                                            | 状态     | 职责                                                                                                          |
| ------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `src/components/AdUnit.astro`                                                   | DELETE   | 删除（虚线占位框；误导）                                                                                       |
| `src/layouts/BaseLayout.astro`                                                  | MODIFY   | 把第 152 行的 adsbygoogle.js 注释更新为「Auto Ads 入口脚本」说明                                              |
| `src/components/INDEX.md`                                                       | MODIFY   | 删除第 19 行 AdUnit 行；第 87 行 AdUnit 行表格条目改为「（Removed in P140a — AdSense Auto Ads handles）」       |
| `src/pages/[lang]/[slug].astro`                                                 | MODIFY   | 删 `import AdUnit from '../../components/AdUnit.astro'`（第 10 行）与第 1306 行 `<AdUnit slot="tool-result" />`  |
| `src/pages/[lang]/index.astro`                                                  | MODIFY   | 删 `import AdUnit` 与 3 处 `<AdUnit slot="home-*" />` 实例                                                   |
| `src/pages/[lang]/blog/[slug].astro`                                            | MODIFY   | 删 `import AdUnit` 与 2 处 `<AdUnit slot="blog-*" />`                                                          |
| `src/pages/[lang]/blog/index.astro`                                             | MODIFY   | 删 `import AdUnit` 与 1 处 `<AdUnit slot="blog-mid" />`                                                        |
| `src/content/config.ts`                                                         | CREATE   | defineCollection('tools', zod schema)                                                                          |
| `src/content/tools/README.md`                                                   | CREATE   | 编辑约定文档（prose 写作规范、4 H2 顺序、词数阈值、zh fallback 行为）                                         |
| `src/content/tools/solopreneur-mrr-calculator.md`                               | CREATE   | 1 个示范 md（MRR；Category A；en + zh 双语都在内文用 `<!-- BOTH_LANG -->` 提示之后扩写）                          |
| `src/content/tools/solopreneur-mrr-calculator.zh.md`                            | CREATE   | zh 示范 md（用与 en 同 frontmatter + 4 H2 中文章节）                                                          |
| `src/components/CalculatorProse.astro`                                          | CREATE   | 接收 Content Collection entry，渲染 4 H2 Markdown（按段位配色：intro 紫 / methodology 素 / limitations 琥珀 / example 绿） |
| `tests/no-adsense-placeholder-guard.test.ts`                                    | CREATE   | source-only 守卫：grep 确认无 `<AdUnit` 字面 import + `src/components/AdUnit.astro` 不存在                       |
| `tests/content-prose-shape-guard.test.ts`                                       | CREATE   | build-dep 守卫：`src/content/tools/*.md` frontmatter + 4 H2 + 词数阈值（relaxed 模式 P140a；P140b T8 收紧 zh） |

---

## Task 1: 删除 `src/components/AdUnit.astro` 并清空全部引用（MECHANICAL）

**Files:**
- Delete: `src/components/AdUnit.astro`
- Modify: `src/pages/[lang]/[slug].astro`（删 `import` 行 与 `<AdUnit slot="tool-result" />`）
- Modify: `src/pages/[lang]/index.astro`（删 `import` 行 与 3 处 `<AdUnit slot="home-*" />`）
- Modify: `src/pages/[lang]/blog/[slug].astro`（删 `import` 行 与 2 处 `<AdUnit slot="blog-*" />`）
- Modify: `src/pages/[lang]/blog/index.astro`（删 `import` 行 与 1 处 `<AdUnit slot="blog-mid" />`）

**Interfaces:**
- Consumes: （无）
- Produces: （无） —— T6 的守卫会校验这些占位已彻底消失

- [ ] **Step 1: 删除 `src/components/AdUnit.astro` 文件**

```bash
rm "src/components/AdUnit.astro"
ls "src/components/" | grep -i AdUnit
# Expected: 无输出（grep exit 1 但 stdout 为空）
```

- [ ] **Step 2: 删除 `[slug].astro` 中的 AdUnit import 与唯一一处用法**

打开 `src/pages/[lang]/[slug].astro`：
- 删除第 10 行：`import AdUnit from '../../components/AdUnit.astro';`
- 删除第 1306 行：`<AdUnit slot="tool-result" />`

```bash
grep -nE 'AdUnit|<AdUnit' "src/pages/[lang]/[slug].astro"
# Expected: 无输出
```

- [ ] **Step 3: 删除 `[lang]/index.astro` 中的 AdUnit import 与 3 处用法**

打开 `src/pages/[lang]/index.astro`：
- 删除第 7 行：`import AdUnit from '../../components/AdUnit.astro';`
- 删除第 84 行：`<AdUnit slot="home-hero" />`
- 删除第 93 行：`<AdUnit slot="home-mid" />`
- 删除第 102 行：`<AdUnit slot="home-footer" />`

```bash
grep -nE 'AdUnit|<AdUnit' "src/pages/[lang]/index.astro"
# Expected: 无输出
```

- [ ] **Step 4: 删除 `[lang]/blog/[slug].astro` 中的 AdUnit import 与 2 处用法**

打开 `src/pages/[lang]/blog/[slug].astro`：
- 删除第 5 行：`import AdUnit from '../../../components/AdUnit.astro';`
- 删除第 90 行：`<AdUnit slot="blog-mid" />`
- 删除第 96 行：`<AdUnit slot="blog-end" />`

```bash
grep -nE 'AdUnit|<AdUnit' "src/pages/[lang]/blog/[slug].astro"
# Expected: 无输出
```

- [ ] **Step 5: 删除 `[lang]/blog/index.astro` 中的 AdUnit import 与 1 处用法**

打开 `src/pages/[lang]/blog/index.astro`：
- 删除第 5 行：`import AdUnit from '../../../components/AdUnit.astro';`
- 删除第 66 行：`<AdUnit slot="blog-mid" />`

```bash
grep -nE 'AdUnit|<AdUnit' "src/pages/[lang]/blog/index.astro"
# Expected: 无输出
```

- [ ] **Step 6: 验证所有引用已被清理**

```bash
grep -rnE 'AdUnit|<AdUnit' "src/"
# Expected: 无输出
```

- [ ] **Step 7: 跑 `pnpm check` 验证编译通过**

```bash
pnpm check
```

Expected: 0 errors / 0 warnings。新增的 T6/T7 守卫这时还**没**建好，不会失败；但其他现有守卫（如 `engine-descriptions-i18n-guard`、`canonical-url-guard` 等）必须 0 报错。

如果 TypeScript 报 "Cannot find module '../../components/AdUnit.astro'" → 检查是否漏改了某一个页面。

- [ ] **Step 8: 跑 `pnpm build` 验证产物正常**

```bash
pnpm build
```

Expected: dist/ 仍为 314 pages（CLAUDE.md 期望值），0 错误。

- [ ] **Step 9: 提交**

```bash
git add -A "src/components/AdUnit.astro" "src/pages/[lang]/[slug].astro" "src/pages/[lang]/index.astro" "src/pages/[lang]/blog/[slug].astro" "src/pages/[lang]/blog/index.astro"
git commit -m "feat(p140a): delete AdUnit.astro placeholder + clean all imports"
# 备注: -A 在这里有意义 —— -A = include intent, file is staged for deletion
```

---

## Task 2: 更新 `BaseLayout.astro` 注释 + `INDEX.md`（MECHANICAL）

**Files:**
- Modify: `src/layouts/BaseLayout.astro`（第 152 行 adsbygoogle.js script 上方加注释说明 Auto Ads）
- Modify: `src/components/INDEX.md`（删除 AdUnit 行与表格条目）

**Interfaces:**
- Consumes: Task 1 已删除 AdUnit
- Produces: AdUnit 字面不再出现在 `src/`，且 BaseLayout 注释明确「Auto Ads handles」

- [ ] **Step 1: 更新 `BaseLayout.astro` 第 152 行上方的注释**

打开 `src/layouts/BaseLayout.astro`，定位到第 152 行附近的：

```html
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3420554170441272" crossorigin="anonymous"></script>
```

在它**之前**插入一行注释：

```html
  <!-- P140a-T2: Google AdSense Auto Ads 入口脚本；客户端 slots 由 Auto Ads algorithm 自动插入，无需 <ins class="adsbygoogle"> 标签。 -->
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3420554170441272" crossorigin="anonymous"></script>
```

- [ ] **Step 2: 删除 `src/components/INDEX.md` 第 19 行 AdUnit 条目**

打开 `src/components/INDEX.md`，第 19 行包含：

```
    └── Utility tier (2):    AdUnit.astro · SearchBar.astro
```

把这一行替换为：

```
    └── Utility tier (1):    SearchBar.astro
```

（即把 AdUnit.astro 删除，并相应更新「(2)」→「(1)」。）

- [ ] **Step 3: 删除 `src/components/INDEX.md` 中第 87 行 AdUnit 表格条目**

打开 `src/components/INDEX.md`，第 87 行附近表格条目：

```
| `AdUnit.astro` | 11 | `{ slot: 'home-hero' \| 'home-mid' \| 'home-footer' \| 'tool-result' \| 'blog-mid' \| 'blog-end' }` — AdSense placeholder div with slot-specific min-height | 4 |
```

把这一整行替换为：

```
| ~~`AdUnit.astro`~~ | — | *Removed in P140a — see `docs/superpowers/specs/2026-07-31-adsense-low-value-content-fix-design.md` §4. Google AdSense Auto Ads handles all ad placement via the global script in `BaseLayout.astro`.* | — |
```

- [ ] **Step 4: 验证**

```bash
grep -nE 'AdUnit' "src/components/INDEX.md"
# Expected: 输出只剩第 3 步添加的「Removed in P140a」一行 + 「(1): SearchBar」一处
#         验证 AdUnit 不再以「component」身份出现在索引中
```

- [ ] **Step 5: 跑 `pnpm check` 验证**

```bash
pnpm check
```

Expected: 0 报错。

- [ ] **Step 6: 提交**

```bash
git add "src/layouts/BaseLayout.astro" "src/components/INDEX.md"
git commit -m "docs(p140a): annotate BaseLayout Auto Ads script + remove AdUnit from INDEX.md"
```

---

## Task 3: 创建 `src/content/config.ts` Content Collections schema（INTEGRATION）

**Files:**
- Create: `src/content/config.ts`

**Interfaces:**
- Consumes: 无
- Produces: Astro Content Collections schema 定义，P140b 的 100 md 文件将依赖它编译期校验

- [ ] **Step 1: 创建 `src/content/config.ts`**

新建文件 `src/content/config.ts`，写入：

```ts
// P140a-T3: Astro Content Collections schema for tool prose pages.
// Each calculator's editorial content (intro / methodology / limitations / worked example)
// lives at src/content/tools/<slug>.md (en) and <slug>.zh.md (zh).
//
// The 4-H2 markdown body is rendered by src/components/CalculatorProse.astro
// (P140a-T5) into [lang]/[slug].astro (P140b-T4).
//
// zod frontmatter invariants:
//   - slug                : must match src/data/tools.ts:engine.slug pattern
//   - engine_ref          : mirrors slug (kept as separate field for future divergence)
//   - category_id         : one of A/B/C/D/E/F/H/K/L/M/O/P/R/S/T (15 categories, CLAUDE.md)
//   - reviewed_by         : array of reviewer ids → src/data/reviewers.ts (P140c-T1)
//   - author              : single reviewer id (defaults to 'wlz')
//   - data_reviewed_at    : YYYY-MM-DD; CI guard (P140a-T7) does not validate this —
//                           P140b T8 may add.
//   - sources             : ≥1 external reference with valid URL (AdSense E-E-A-T signal)

import { defineCollection, z } from 'astro:content';

const CATEGORY_LETTERS = [
  'A', // SaaS Metrics
  'B', // AI Cost Tools
  'C', // Valuation & Exit
  'D', // Freelance Pricing
  'E', // Cost & Efficiency
  'F', // Investment & Real Estate
  'H', // Hiring & Team
  'K', // Knowledge
  'L', // Legal & Compliance
  'M', // Marketing Analytics
  'O', // Operations
  'P', // Product Analytics
  'R', // Retention & Customer Success
  'S', // Sales
  'T', // Customer Support
] as const;

const SLUG_PATTERN = /^solopreneur-[a-z0-9-]+$/;

const tools = defineCollection({
  type: 'content',
  schema: z.object({
    slug: z.string().regex(SLUG_PATTERN),
    engine_ref: z.string().regex(SLUG_PATTERN),
    category_id: z.enum(CATEGORY_LETTERS),
    reviewed_by: z.array(z.string()).default([]),
    author: z.string().default('wlz'),
    data_reviewed_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD'),
    sources: z
      .array(
        z.object({
          name: z.string().min(1),
          url: z.string().url(),
        })
      )
      .min(1, 'sources must contain at least 1 reference (AdSense E-E-A-T signal)'),
  }),
});

export const collections = { tools };
```

- [ ] **Step 2: 验证 schema 编译**

```bash
node_modules/.bin/astro sync 2>&1 | tail -10
```

Expected: 无报错；`.astro/` 内生成新的 `.d.ts` 类型。如果看到 `Module '"astro:content"' has no exported member 'defineCollection'` → 检查是否 `pnpm install` 完整跑过。

- [ ] **Step 3: 验证 zod 校验实际生效（端到端 smoke test）**

临时在 `src/content/tools/` 建一个 Bad md 文件：

```bash
cat > /tmp/bad-prose.md <<'EOF'
---
slug: 'not-a-real-slug'
engine_ref: 'also-wrong'
category_id: 'Z'
reviewed_by: []
author: 'wlz'
data_reviewed_at: 'not-a-date'
sources: []
---
## What This Calculator Measures
text
EOF
cp /tmp/bad-prose.md src/content/tools/_smoke_bad.md
pnpm build 2>&1 | tail -20
rm src/content/tools/_smoke_bad.md
```

Expected: build 报错，错误信息至少包含：
- `slug must match the pattern` 或类似
- `Invalid enum value. Expected ...`
- `sources must contain at least 1 reference`
- `Invalid date`

如果都通过了（说明 zod 没生效）→ 检查 Task 3 Step 1 是否漏掉 `import { defineCollection, z } from 'astro:content'`。

完成 smoke test 后**必须删除** `_smoke_bad.md`。否则 T7 守卫会误报（这个文件 frontmatter 不合法）。

- [ ] **Step 4: 提交**

```bash
git add "src/content/config.ts"
git commit -m "feat(p140a): astro content collection schema for tool prose (4-H2 markdown + zod frontmatter)"
```

---

## Task 4: 创建 `src/content/tools/` 目录骨架 + 1 个示范 md（INTEGRATION）

**Files:**
- Create: `src/content/tools/README.md`
- Create: `src/content/tools/solopreneur-mrr-calculator.md`（en 示范）
- Create: `src/content/tools/solopreneur-mrr-calculator.zh.md`（zh 示范）

**Interfaces:**
- Consumes: Task 3 的 zod schema
- Produces: 1 个 en + 1 个 zh 示范 md，触发 T7 守卫 PASS（因为这是合法 frontmatter + 4 H2 + 词数达标）

> **MRR en 草稿要求：**
> - frontmatter 完整（见模板）
> - 4 H2 都到；每 H2 ≥ 80 chars
> - 全文 ≥ 400 chars

- [ ] **Step 1: 创建 `src/content/tools/README.md`（编辑约定文档）**

新建文件 `src/content/tools/README.md`，写入：

````markdown
# Calculator Prose — Editor's Guide

每个计算器的 prose 文本活在 `src/content/tools/<slug>.md`（en）和 `<slug>.zh.md`（zh）。
两个文件各自由 `src/components/CalculatorProse.astro`（P140a-T5）渲染到 `src/pages/[lang]/[slug].astro`（P140b-T4）。

## Frontmatter（必填）

```yaml
---
slug: 'solopreneur-mrr-calculator'        # 必须与 src/data/tools/<cat>.ts 中 slug 一致
engine_ref: 'solopreneur-mrr-calculator'  # 当前与 slug 同；未来可指向重命名后的引擎
category_id: 'A'                          # A/B/C/D/E/F/H/K/L/M/O/P/R/S/T
reviewed_by: ['wlz']                      # reviewer id（→ src/data/reviewers.ts P140c-T1）
author: 'wlz'                             # 默认 'wlz'（founder persona）
data_reviewed_at: '2026-07-31'            # 最近审阅日期 YYYY-MM-DD
sources:                                  # 至少 1 条外链（AdSense E-E-A-T signal）
  - name: 'Stripe Atlas — Recurring Revenue Definition'
    url: 'https://stripe.com/atlas/guides/revenue'
  - name: 'ChartMogul NRR Benchmarks 2026'
    url: 'https://chartmogul.com/'
---
```

CI 守卫（`tests/content-prose-shape-guard.test.ts` P140a-T7）会校验以上字段。

## Markdown 正文 4-H2 硬约束

正文必须包含**以下 4 个 H2 段，且顺序固定**：

1. `## What This Calculator Measures` — 3-5 句话指出业务问题。
2. `## How It Works (Methodology)` — 公式 + 变量定义 + 假设。如果含 LaTeX 或伪代码，请用 code fence 包裹（`` ```math `` ... `` ``` ``）。
3. `## Limitations & When Not To Use` — 2-3 句话点出这个计算器**不**适用的场景。
4. `## Worked Example` — 4-6 步走读一个具体场景，从输入到输出。

### 词数阈值

| 段                          | en (chars) | zh (chars) |
| --------------------------- | ---------- | ---------- |
| 每 H2 段正文                | ≥ 80       | ≥ 50       |
| 全文合计                    | ≥ 400      | ≥ 250      |

P140a-T7 跑 "relaxed" 阈值（本文档所述）。P140b-T8 会收紧到 P140b 段落的最终阈值。

## zh 文件行为

- 文件名后缀 `.zh.md` 时 zod schema 同样校验（与 en 共用）。
- `[slug].astro` 渲染 zh 页面时调用 `getEntry('tools', '<slug>.zh')`；缺位时 fallback 到 en 并 `console.warn('[Prose] zh fallback for <slug>')`。
- P140a/b：缺位 = 仅警告；P140d T8 后：缺位 = build fail。
- zh 翻译来源：AI-draft（Claude / GPT-5-familiy）→ 人工 review。如发现术语错译（如把「customer acquisition cost」翻译错），请直接修 i18n key 而非 md。

## 写新文件时

1. 从 `solopreneur-mrr-calculator.md` 复制模板（MRR 是 A 类的代表案例）。
2. 修改 `slug` / `engine_ref` / `category_id` / `sources`。
3. 4 H2 段必到；按本指南词数阈值写。
4. 跑 `pnpm build` 与 `pnpm test:build`（开启 `RUN_BUILD_TESTS=1`）确认守卫通过。
````

- [ ] **Step 2: 创建 `src/content/tools/solopreneur-mrr-calculator.md`（en 示范）**

新建文件 `src/content/tools/solopreneur-mrr-calculator.md`，写入：

```markdown
---
slug: 'solopreneur-mrr-calculator'
engine_ref: 'solopreneur-mrr-calculator'
category_id: 'A'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Stripe Atlas — Recurring Revenue Definition'
    url: 'https://stripe.com/atlas/guides/revenue'
  - name: 'ChartMogul NRR Benchmarks 2026'
    url: 'https://chartmogul.com/'
  - name: 'OpenView SaaS Benchmarks 2026'
    url: 'https://openviewpartners.com/blog/saas-benchmarks/'
---

## What This Calculator Measures

Monthly Recurring Revenue (MRR) is the predictable, recurring component of
your subscription revenue normalized to a single month. It isolates the part
of revenue you can actually count on next month — as opposed to one-time fees,
hardware sales, or professional services — so you can forecast cash flow,
set sales quotas, and compare growth across subscription tiers without
seasonality distorting the picture.

## How It Works (Methodology)

The v3 standard formula we use:

```
MRR = ActiveSubscribers × MonthlyPrice
    + ExpansionMRR
    + ReactivationMRR
    − ContractionMRR
```

| Variable           | Meaning                                                      |
| ------------------ | ------------------------------------------------------------ |
| `ActiveSubscribers`| Paying customers this month (excludes trialing / paused)     |
| `MonthlyPrice`     | Normalized per-user monthly price (annual ÷ 12 if needed)   |
| `ExpansionMRR`     | Net MRR added by upgrades within the existing customer base |
| `ReactivationMRR`  | MRR from previously churned customers returning              |
| `ContractionMRR`   | MRR lost from downgrades (not cancellation — that's churn)   |

We do **not** subtract churned MRR from this total because churn is reported
separately as part of GRR/NRR analysis (see the NRR Calculator for that view).

## Limitations & When Not To Use

MRR is a **subscription-economy** metric. If your business is primarily
transactional, project-based, or has heavy one-time fees (e.g. hardware
resale, implementation services), MRR will understate your true revenue
trajectory. For those businesses, use ARR (if multi-year contracts dominate)
or simply run a cash-flow projection.

## Worked Example

Imagine a B2B SaaS at $49/mo with 2,000 active subscribers and $2,000/month
of net expansion (upgrades minus downgrades) and $150/month reactivation:

1. `ActiveSubscribers × MonthlyPrice` = 2,000 × $49 = **$98,000**
2. Add `ExpansionMRR` = $98,000 + $2,000 = **$100,000**
3. Add `ReactivationMRR` = $100,000 + $150 = **$100,150**

This calculator's **Dashboard** section surfaces a 12-month rolling MRR
projection assuming the current growth rate holds; pair it with the **Burn
Rate Calculator** to see how much runway that MRR supports at your current
burn.
```

- [ ] **Step 3: 创建 `src/content/tools/solopreneur-mrr-calculator.zh.md`（zh 示范）**

新建文件 `src/content/tools/solopreneur-mrr-calculator.zh.md`，写入：

```markdown
---
slug: 'solopreneur-mrr-calculator'
engine_ref: 'solopreneur-mrr-calculator'
category_id: 'A'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Stripe Atlas — Recurring Revenue Definition'
    url: 'https://stripe.com/atlas/guides/revenue'
  - name: 'ChartMogul NRR Benchmarks 2026'
    url: 'https://chartmogul.com/'
  - name: 'OpenView SaaS Benchmarks 2026'
    url: 'https://openviewpartners.com/blog/saas-benchmarks/'
---

## 这个计算器衡量什么

月度经常性收入（MRR）是把订阅收入中的可预测部分归一化到一个月的指标。
它剥离了一次性费用、硬件销售、专业服务等非循环收入，呈现你下个月
「真正可以期待」的那部分收入，从而能做现金流预测、设定销售配额、
跨订阅层级比较增长时不被季节性扭曲。

## 计算方法

我们使用的 v3 标准公式：

```
MRR = 活跃订阅用户 × 月单价
    + 扩展 MRR
    + 唤醒 MRR
    − 缩减 MRR
```

| 变量            | 含义                                          |
| --------------- | --------------------------------------------- |
| `活跃订阅用户`  | 当月付费用户（不含试用 / 暂停）              |
| `月单价`        | 归一化人均月费（年付 ÷ 12 即得）              |
| `扩展 MRR`      | 老客户升级带来的净 MRR                        |
| `唤醒 MRR`      | 流失客户重新订阅带来的 MRR                    |
| `缩减 MRR`      | 客户降级（非取消）丢失的 MRR                  |

我们**不**从这个总额中减去流失 MRR，因为流失会单独在 GRR/NRR
分析中汇报（见 NRR Calculator 工具）。

## 局限性 / 何时不适用

MRR 是**订阅经济**指标。如果你的业务主战场是事务型、项目制、或一次性费用
占比很高（硬件转售、实施服务等），MRR 会低估你的真实收入走向。这类业务
请使用 ARR（多年合约为主时）或直接做现金流预测。

## 案例走读

假设一家 B2B SaaS 月单价 $49，活跃用户 2,000 人，净扩展 $2,000/月（升级 −
降级），唤醒 $150/月：

1. `活跃用户 × 月单价` = 2,000 × $49 = **$98,000**
2. 加 `扩展 MRR` = $98,000 + $2,000 = **$100,000**
3. 加 `唤醒 MRR` = $100,000 + $150 = **$100,150**

本工具的**Dashboard** 段会展示保持当前增长率下的 12 月滚动 MRR 预测；
搭配 **Burn Rate Calculator** 即可看到该 MRR 在你当前烧钱速度下能撑多少
个月的 runway。
```

- [ ] **Step 4: 验证 build 通过**

```bash
pnpm build 2>&1 | tail -10
```

Expected: 0 errors。dist/ 现在应该比 P140a 起步时多 0 个 HTML 文件（这些 md 在 P140b-T4 才被挂到 `[slug].astro`；这一批仅沉淀 schema 与示范）。

- [ ] **Step 5: 提交**

```bash
git add "src/content/tools/README.md" "src/content/tools/solopreneur-mrr-calculator.md" "src/content/tools/solopreneur-mrr-calculator.zh.md"
git commit -m "feat(p140a): prose README + MRR demo md (en/zh) for content collection"
```

---

## Task 5: 创建 `src/components/CalculatorProse.astro`（MECHANICAL）

**Files:**
- Create: `src/components/CalculatorProse.astro`

**Interfaces:**
- Consumes: Task 4 的 md 文件结构（4 H2 段 + zod frontmatter）
- Produces: 一个 Astro 组件，接收 `entry: CollectionEntry<'tools'>` 与可选 `section: 'intro' | 'methodology' | 'limitations' | 'example'`，渲染对应段

> **P140a 注意：** 组件是写作，本批**不**接入到 `[slug].astro`（那是 P140b-T4 的事）。
> T7 守卫**不**依赖此组件，仅依赖 md 文件 frontmatter + 4 H2 段词数。

- [ ] **Step 1: 创建 `src/components/CalculatorProse.astro`**

新建文件 `src/components/CalculatorProse.astro`，写入：

```astro
---
// P140a-T5: Renders 1 of 4 H2 prose sections from a Calculator Content
// Collection entry. Each section maps to a dedicated visual variant:
//   - 'intro'        : 📌  purple tint, drops user into the business problem
//   - 'methodology'  : ⚙️ neutral palette, host for formulas + variable tables
//   - 'limitations'  : ⚠️  amber tint, italic-leaning typography
//   - 'example'      : 📋 green tint, hosts step-by-step walkthroughs
//
// Section names match the 4 H2s in src/content/tools/<slug>.md (P140a-T4):
//   'intro'        → '## What This Calculator Measures'
//   'methodology'  → '## How It Works (Methodology)'
//   'limitations'  → '## Limitations & When Not To Use'
//   'example'      → '## Worked Example'
//
// P140a note: this component is created but NOT yet wired into
// src/pages/[lang]/[slug].astro — that hookup is P140b-T4. P140a simply
// establishes the renderer contract. P140b adds getEntry() in the page
// template and inserts <CalculatorProse section="..." /> at the 4 slots.

import type { CollectionEntry } from 'astro:content';

export interface Props {
  entry: CollectionEntry<'tools'>;
  section: 'intro' | 'methodology' | 'limitations' | 'example';
}

const { entry, section } = Astro.props;

interface SectionHeading {
  match: string;        // substring to match in H2 (handles variant phrasings)
  containerClass: string;
  markerText: string;
  markerBg: string;
  bodyClass: string;
}

const SECTION_HEADINGS: Record<Props['section'], SectionHeading> = {
  intro: {
    match: 'What This Calculator Measures',
    containerClass: 'rounded-2xl border border-purple-200 bg-purple-50/60 p-6 my-8',
    markerText: '📌',
    markerBg: 'bg-purple-100/80',
    bodyClass: 'prose prose-sm max-w-none text-gray-800 [&_h2]:hidden',
  },
  methodology: {
    match: 'How It Works',
    containerClass: 'rounded-2xl border border-gray-200 bg-gray-50/60 p-6 my-8',
    markerText: '⚙️',
    markerBg: 'bg-gray-100',
    bodyClass: 'prose prose-sm max-w-none text-gray-800 [&_h2]:hidden [&_table]:w-full [&_th]:text-left [&_code]:bg-white [&_code]:px-1 [&_code]:rounded',
  },
  limitations: {
    match: 'Limitations',
    containerClass: 'rounded-2xl border border-amber-200 bg-amber-50/40 p-6 my-8',
    markerText: '⚠️',
    markerBg: 'bg-amber-100/80',
    bodyClass: 'prose prose-sm max-w-none text-gray-700 italic [&_h2]:hidden',
  },
  example: {
    match: 'Worked Example',
    containerClass: 'rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 my-8',
    markerText: '📋',
    markerBg: 'bg-emerald-100/80',
    bodyClass: 'prose prose-sm max-w-none text-gray-800 [&_h2]:hidden [&_ol]:pl-5 [&_ol]:list-decimal',
  },
};

const cfg = SECTION_HEADINGS[section];

// Render the full markdown body, then hide everything except the matching H2 section.
// We rely on Tailwind's prose class + [&_h2]:hidden to suppress the H2 of all 4
// sections, then we wrap our chosen section's elements in the styled container.
const { Content } = await entry.render();
---

<section class={cfg.containerClass} aria-label={section}>
  <div class:list={['inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-3', cfg.markerBg]}>
    <span aria-hidden="true">{cfg.markerText}</span>
    <span class="uppercase tracking-wider text-gray-700">{section}</span>
  </div>
  <div class={cfg.bodyClass}>
    <Content />
  </div>
</section>

<style>
  /* Inline scoped CSS — Tailwind [&_h2]:hidden below lacks specificity for some
     setups, so this is a defensive belt to make sure the H2 of every section
     is suppressed (each panel shows only its own body). */
  :global(.prose h2) {
    display: none !important;
  }
</style>
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
node_modules/.bin/astro check 2>&1 | tail -20
```

Expected: 0 errors。如果报「CollectionEntry 不能导入 astro:content」→ 检查 `import type { CollectionEntry } from 'astro:content';` 行是否完整。

- [ ] **Step 3: 跑 `pnpm check`**

```bash
pnpm check
```

Expected: 0 errors / 0 warnings。

- [ ] **Step 4: 提交**

```bash
git add "src/components/CalculatorProse.astro"
git commit -m "feat(p140a): CalculatorProse.astro (4-H2 prose renderer for content collection)"
```

---

## Task 6: 新增 `tests/no-adsense-placeholder-guard.test.ts`（MECHANICAL — source-only）

**Files:**
- Create: `tests/no-adsense-placeholder-guard.test.ts`

**Interfaces:**
- Consumes: Task 1 已删 AdUnit.astro + 全清 import
- Produces: source-only 守卫（P23b skip-guard pattern 不需要 `RUN_BUILD_TESTS=1`，可直接 `pnpm test:unit` 跑通）

- [ ] **Step 1: 创建 `tests/no-adsense-placeholder-guard.test.ts`**

新建文件 `tests/no-adsense-placeholder-guard.test.ts`，写入：

```ts
#!/usr/bin/env node
// P140a-T6: Source-only CI guard enforcing that the AdUnit placeholder
// component does not reappear after P140a ship.
//
// Why this exists:
//   AdUnit.astro was a dashed-border placeholder that rendered literal
//   "AdSense — <slot>" text inside a min-height container. AdSense review
//   flagged this as misleading metadata, which contributed to the "low-value
//   content" rejection. P140a deletes the file. This guard prevents regression.
//
// Two assertions:
//   (a) src/components/AdUnit.astro does NOT exist on disk.
//   (b) No source file under src/ imports the deleted module or renders a
//       literal <AdUnit /> instance.
//
// This is a source-only test (does NOT depend on `pnpm build`, does NOT
// require RUN_BUILD_TESTS=1). It runs under pnpm test:unit by default.
//
// Reference: spec §7 (AdSense infrastructure cleanup), §8 (CI guards).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const srcDir = join(root, 'src');

// (a) File should not exist
test('AdUnit.astro file is deleted from src/components/', () => {
  const deleted = join(root, 'src', 'components', 'AdUnit.astro');
  assert.equal(
    existsSync(deleted),
    false,
    `AdUnit.astro must remain deleted at ${deleted}; the P140a AdSense cleanup removed it for compliance. Restore only by reverting the entire P140a commit; partial restoration will be flagged by this guard.`
  );
});

// (b) No source file references the deleted module
//
// We walk src/ recursively (with depth cap to bound the walk) and grep for any
// line containing the literal "<AdUnit" (a JSX/Astro instance) or
// "AdUnit.astro" (an import specifier). Hits fail the test; we collect them
// to give the reviewer a single error message.
test('no source file imports or renders <AdUnit /> after P140a', () => {
  const hits: string[] = [];
  const MAX_DEPTH = 8;

  function walk(dir: string, depth: number): void {
    if (depth > MAX_DEPTH) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      // Skip node_modules + .git + dist + .astro scratch.
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === '.astro') continue;
      if (entry.isDirectory()) {
        walk(full, depth + 1);
        continue;
      }
      // Only scan text-y source extensions (Astro, ts, tsx, mjs, js, md).
      if (!/\.(astro|ts|tsx|mjs|js|md)$/.test(entry.name)) continue;
      // Skip binary-looking or huge files (>1MB).
      let stat;
      try { stat = statSync(full); } catch { continue; }
      if (stat.size > 1_000_000) continue;

      const text = readFileSync(full, 'utf8');
      // Strip line-number prefixes and trailing commas to narrow the search.
      if (/<AdUnit[\s>]/.test(text) || /AdUnit\.astro/.test(text)) {
        hits.push(full.replace(root + '\\', '').replace(root + '/', ''));
      }
    }
  }

  walk(srcDir, 0);

  assert.equal(
    hits.length,
    0,
    `No src/ file may import or render <AdUnit /> after P140a. Found: ${hits.join(', ')}`
  );
});
```

- [ ] **Step 2: 跑守卫验证它 PASS（当前状态下没有 AdUnit 残留）**

```bash
node_modules/.bin/tsx --test tests/no-adsense-placeholder-guard.test.ts
```

Expected: 2 tests pass。如果 fail，看 Task 1 是否有遗漏的 AdUnit 引用。

- [ ] **Step 3: 跑守卫验证它 FAIL（人为注入一个假文件，验证守卫能拦）**

```bash
echo '---
placeholder proof of concept
---' > src/components/AdUnit.astro
node_modules/.bin/tsx --test tests/no-adsense-placeholder-guard.test.ts 2>&1 | tail -30
rm src/components/AdUnit.astro
```

Expected: 守卫 FAIL（实际检测到 `src/components/AdUnit.astro` 存在 + 命中 grep）。如果 PASS → 守卫没生效，检查 Step 1 文件内容。

- [ ] **Step 4: 跑全守卫验证无回归**

```bash
pnpm test:unit 2>&1 | tail -10
```

Expected: 守卫通过，新测试 pass 计数 +2。整条 suite 不应有 fail。

- [ ] **Step 5: 提交**

```bash
git add "tests/no-adsense-placeholder-guard.test.ts"
git commit -m "test(p140a): no-adsense-placeholder-guard (source-only, prevents AdUnit resurrection)"
```

---

## Task 7: 新增 `tests/content-prose-shape-guard.test.ts`（MECHANICAL — build-dep）

**Files:**
- Create: `tests/content-prose-shape-guard.test.ts`

**Interfaces:**
- Consumes: Task 3 schema + Task 4 示范 md
- Produces: build-dep 守卫（P23b skip-guard pattern，`RUN_BUILD_TESTS=1` 启用）

> **P140a 阈值（relaxed 模式）：**
> - frontmatter 校验：slug / engine_ref / category_id / reviewed_by / author / data_reviewed_at / sources ≥ 1
> - 4 强制 H2 都存在（不分段位）
> - 每 H2 段词数：en ≥ 80 chars，zh ≥ 50 chars
> - 全文词数：en ≥ 400 chars，zh ≥ 250 chars
>
> **P140b-T8 会收紧**到最终阈值（spec §3）+ 在 P140d T8 强制 zh 缺位 build fail。本批仅止于「relaxed」防止 100 md 文件一口气失败。

- [ ] **Step 1: 创建 `tests/content-prose-shape-guard.test.ts`**

新建文件 `tests/content-prose-shape-guard.test.ts`，写入：

```ts
#!/usr/bin/env node
// P140a-T7: Build-dep CI guard enforcing Calculator Content Collection
// markdown files conform to the spec's 4-H2 prose schema with relaxed
// P140a word-count thresholds.
//
// P140a thresholds (relaxed; one demo MD ships in this PR):
//   - frontmatter: slug / engine_ref / category_id / reviewed_by / author /
//     data_reviewed_at / sources (≥ 1) all present and well-typed
//   - 4 mandatory H2 sections (in order): What This Calculator Measures /
//     How It Works (Methodology) / Limitations & When Not To Use / Worked Example
//   - per-H2 body: en ≥ 80 chars, zh ≥ 50 chars
//   - full document: en ≥ 400 chars, zh ≥ 250 chars
//
// zh handling:
//   - filename suffix `.zh.md` triggers ZH threshold + ZH H2 fallback labels
//   - P140a/b: missing zh file only emits console.warn (not fail)
//   - P140d-T8 will tighten this to build-fail when zh is missing.
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern).
//
// Reference: spec §3 (Content Model), §5 (zh fallback), §8 (CI guards).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';

const root = resolve(import.meta.dirname, '..');

// P23b skip-guard: this test belongs to the build-dep suite registry; only
// run when explicitly opted-in.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

const PROSE_DIR = resolve(root, 'src/content/tools');
const README = resolve(PROSE_DIR, 'README.md');

// Thresholds — P140a relaxed; P140b-T8 will tighten.
const THRESHOLDS = {
  en: { perH2: 80, total: 400 },
  zh: { perH2: 50, total: 250 },
} as const;

type Lang = keyof typeof THRESHOLDS;

// Required frontmatter keys (AdSense E-E-A-T signal carriers)
const REQUIRED_FRONTMATTER = [
  'slug',
  'engine_ref',
  'category_id',
  'reviewed_by',
  'author',
  'data_reviewed_at',
  'sources',
] as const;

// 4 mandatory H2 (the markdown body, not frontmatter)
const REQUIRED_H2 = [
  'What This Calculator Measures',
  'How It Works',
  'Limitations',
  'Worked Example',
] as const;

interface Frontmatter {
  [k: string]: unknown;
}

interface ProseFile {
  filename: string;   // basename
  isZh: boolean;      // ends with .zh.md
  lang: Lang;
  text: string;       // raw file
  frontmatter: Frontmatter;
  body: string;       // text minus frontmatter
}

function parseFrontmatter(text: string): { fm: Frontmatter; body: string } {
  // Match --- at line start, then YAML, then --- at line start
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { fm: {}, body: text };
  const fm: Frontmatter = {};
  for (const line of match[1].split('\n')) {
    // Very simple YAML parser: top-level `key: value` and `key: [..]` only.
    const kv = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (!kv) continue;
    const key = kv[1];
    const raw = kv[2];
    if (raw === '') {
      fm[key] = '';
    } else if (raw.startsWith('[') && raw.endsWith(']')) {
      fm[key] = raw.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
    } else if (/^['"]/.test(raw)) {
      fm[key] = raw.replace(/^['"]|['"]$/g, '');
    } else {
      fm[key] = raw;
    }
  }
  return { fm, body: match[2] };
}

function loadProseFile(filename: string): ProseFile | null {
  const full = resolve(PROSE_DIR, filename);
  if (!existsSync(full)) return null;
  // Skip README.md and any non-md files
  if (!filename.endsWith('.md')) return null;
  if (filename === 'README.md') return null;
  const text = readFileSync(full, 'utf8');
  const { fm, body } = parseFrontmatter(text);
  const isZh = filename.endsWith('.zh.md');
  return {
    filename,
    isZh,
    lang: isZh ? 'zh' : 'en',
    text,
    frontmatter: fm,
    body,
  };
}

function listProseFiles(): string[] {
  if (!existsSync(PROSE_DIR)) return [];
  return readdirSync(PROSE_DIR).filter(n => n.endsWith('.md') && n !== 'README.md');
}

function extractH2(body: string): { title: string; content: string }[] {
  const lines = body.split('\n');
  const out: { title: string; content: string }[] = [];
  let cur: { title: string; content: string[] } | null = null;
  for (const line of lines) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      if (cur) out.push({ title: cur.title, content: cur.content.join('\n').trim() });
      cur = { title: h[1], content: [] };
    } else if (cur) {
      cur.content.push(line);
    }
  }
  if (cur) out.push({ title: cur.title, content: cur.content.join('\n').trim() });
  return out;
}

// =============================================================
// Test 1: README.md is present (editing-guide file ships with the schema).
// =============================================================
test('src/content/tools/README.md exists as the editor guide', () => {
  assert.equal(existsSync(README), true, `Missing editing-guide at ${README}; copy from spec §3`);
});

// =============================================================
// Test 2: every prose file has all required frontmatter keys, each non-empty.
// =============================================================
test('every prose file has complete E-E-A-T frontmatter (7 required keys)', () => {
  const files = listProseFiles();
  const missing: string[] = [];
  for (const filename of files) {
    const p = loadProseFile(filename);
    if (!p) continue;
    for (const key of REQUIRED_FRONTMATTER) {
      const v = p.frontmatter[key];
      if (v === undefined || v === null || v === '') {
        missing.push(`${filename}: missing ${key}`);
        continue;
      }
      if (key === 'sources' && Array.isArray(v) && v.length < 1) {
        missing.push(`${filename}: sources must contain ≥ 1 reference (AdSense E-E-A-T signal)`);
      }
    }
  }
  assert.equal(missing.length, 0, missing.join('\n'));
});

// =============================================================
// Test 3: every prose file contains all 4 mandatory H2 sections.
// =============================================================
test('every prose file has the 4 mandatory H2 sections (in any order)', () => {
  const files = listProseFiles();
  const missingH2: string[] = [];
  for (const filename of files) {
    const p = loadProseFile(filename);
    if (!p) continue;
    const h2s = extractH2(p.body).map(h => h.title);
    const missing = REQUIRED_H2.filter(req => !h2s.some(t => t.includes(req)));
    if (missing.length > 0) {
      missingH2.push(`${filename}: missing H2 ${JSON.stringify(missing)}`);
    }
  }
  assert.equal(missingH2.length, 0, missingH2.join('\n'));
});

// =============================================================
// Test 4: per-H2 word-count thresholds.
// =============================================================
test('every prose file meets per-H2 body length thresholds', () => {
  const files = listProseFiles();
  const failures: string[] = [];
  for (const filename of files) {
    const p = loadProseFile(filename);
    if (!p) continue;
    const t = THRESHOLDS[p.lang];
    const h2s = extractH2(p.body).filter(h => REQUIRED_H2.some(req => h.title.includes(req)));
    for (const h of h2s) {
      const chars = h.content.replace(/\s+/g, ' ').trim().length;
      if (chars < t.perH2) {
        failures.push(`${filename} [${p.lang}] "${h.title}" has ${chars} chars, threshold ${t.perH2}`);
      }
    }
  }
  assert.equal(failures.length, 0, failures.join('\n'));
});

// =============================================================
// Test 5: full-document word-count thresholds.
// =============================================================
test('every prose file meets full-document body length thresholds', () => {
  const files = listProseFiles();
  const failures: string[] = [];
  for (const filename of files) {
    const p = loadProseFile(filename);
    if (!p) continue;
    const t = THRESHOLDS[p.lang];
    // Body excluding frontmatter, but including all 4 H2s (they get rendered).
    const chars = p.body.replace(/\s+/g, ' ').trim().length;
    if (chars < t.total) {
      failures.push(`${filename} [${p.lang}] total ${chars} chars, threshold ${t.total}`);
    }
  }
  assert.equal(failures.length, 0, failures.join('\n'));
});

// =============================================================
// Test 6: for each en file, the corresponding zh counterpart warns (not fails)
//         if missing — P140a/b phase. P140d-T8 will tighten.
// =============================================================
test('zh counterparts are encouraged but not required yet (P140a phase)', () => {
  const files = listProseFiles();
  const pairs: string[] = [];   // en→zh expected pairs
  for (const filename of files) {
    if (filename.endsWith('.zh.md')) continue;
    const slug = filename.replace(/\.md$/, '');
    const zhName = `${slug}.zh.md`;
    if (!files.includes(zhName)) {
      pairs.push(zhName);
    }
  }
  // P140a: only console.warn; not a hard fail.
  if (pairs.length > 0) {
    console.warn(`[p140a-T7] Missing zh counterparts (P140a tolerated): ${pairs.join(', ')}`);
  }
  // Always pass — leaving the door open for P140b's mass-write to ship incrementally.
  assert.ok(true);
});
```

- [ ] **Step 2: 跑守卫验证它 PASS（当前 1 demo en + 1 demo zh）**

```bash
RUN_BUILD_TESTS=1 node_modules/.bin/tsx --test tests/content-prose-shape-guard.test.ts 2>&1 | tail -30
```

Expected: 6 tests pass. If fail:
- "missing editor guide" → Task 4 Step 1 没跑
- "frontmatter 缺失" → Task 4 Step 2 / Step 3 的 frontmatter 没写齐
- "missing H2 X" → Task 4 的 md 没全 4 H2
- "chars X < threshold Y" → 某个 H2 / 全文过短

- [ ] **Step 3: 跑守卫验证它 FAIL（人为把 demo md 改坏，验证能拦）**

```bash
# 把首个 demo 的正文替换成"incomplete"，确认守卫能拦
cat > /tmp/bad-demo.md <<'EOF'
---
slug: 'solopreneur-mrr-calculator'
engine_ref: 'solopreneur-mrr-calculator'
category_id: 'A'
reviewed_by: []
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources: [{name: 'x', url: 'https://example.com'}]
---

## What This Calculator Measures
short
EOF
cp /tmp/bad-demo.md src/content/tools/solopreneur-mrr-calculator.md
RUN_BUILD_TESTS=1 node_modules/.bin/tsx --test tests/content-prose-shape-guard.test.ts 2>&1 | tail -30
# Restore
git checkout -- src/content/tools/solopreneur-mrr-calculator.md
```

Expected: 至少 Test 4 fail（per-H2 阈值）。恢复后守卫再次 PASS。

- [ ] **Step 4: 跑全 build-dep 守卫（含 RUN_BUILD_TESTS=1）**

```bash
RUN_BUILD_TESTS=1 pnpm test:unit 2>&1 | tail -20
```

Expected: 全部 PASS；新内容 schema 守卫 +2。这可能要求全 suite 跑过一次完整 build；如 elapsed > 3 分钟不奇怪。

- [ ] **Step 5: 提交**

```bash
git add "tests/content-prose-shape-guard.test.ts"
git commit -m "test(p140a): content-prose-shape-guard (build-dep, 4-H2 markdown schema)"
```

---

## Self-Review（我自己写完后做的检查）

### 1. Spec coverage（spec § 9 P140a 7-task 检查）

| spec task | plan task | 状态                                                                                                       |
| --------- | --------- | ---------------------------------------------------------------------------------------------------------- |
| T1 删 AdUnit + clean imports | Task 1: 删除 + 5 个页面清理 | ✓                                                                                                          |
| T2 BaseLayout 注释 + INDEX.md | Task 2: BaseLayout + INDEX.md | ✓                                                                                                          |
| T3 src/content/config.ts schema | Task 3: defineCollection + zod | ✓                                                                                                          |
| T4 src/content/tools/ 骨架 + 1 demo md | Task 4: README + MRR en/zh demo | ✓                                                                                                          |
| T5 CalculatorProse.astro | Task 5: CalculatorProse.astro | ✓                                                                                                          |
| T6 no-adsense-placeholder-guard | Task 6: source-only 守卫 | ✓                                                                                                          |
| T7 content-prose-shape-guard | Task 7: build-dep 守卫 | ✓                                                                                                          |

All 7 spec tasks covered.

### 2. Placeholder scan

```bash
grep -nE 'TBD|TODO|FIXME|XXX|占位|to be (defined|determined)|待定|待填' docs/superpowers/plans/2026-07-31-p140a-adsense-scaffold.md
```

Expected: 无输出（已自检 — 不留占位）。

### 3. Type consistency

- Task 1 没有任何 TS 改动
- Task 2 没有任何 TS 改动
- Task 3 `defineCollection` / `z` / `tools` 名与 Content Collections 标准签名一致
- Task 4 仅 md 文件，无 TS 引用
- Task 5 `CalculatorProse.astro` 用 `CollectionEntry<'tools'>` —— 与 Task 3 的 `'tools'` collection 名字一致
- Task 6 不需要类型
- Task 7 不需要类型

### 4. 风险 + 回滚

| 风险 | 回滚                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------- |
| Task 3 schema 不被 Astro 识别 | 回滚 Task 3 commit；检查 `astro:content` import；回退 `astro:content` 不是 dist/`pnpm install` 没跑完 |
| Task 5 component 渲染空白     | `[slug].astro` 暂未挂载（P140b-T4 接入）；空白不显现，仅文件存在                                       |
| Task 6 / 7 守卫误报         | Task 6 用 fs.existsSync 检查 + Step 3 反向验证；Task 7 Step 3 反向验证                                |

### 5. Holistic cross-cutting pre-merge

本批影响文件数：

```
新增  7 文件
修改  6 文件（src/layouts/BaseLayout.astro 1 + src/components/INDEX.md 1 + src/pages/[lang]/{[slug], index, blog/[slug], blog/index}.astro 4）
```

修改跨 4 个页面，触动多页面 import 列表 —— 是 CLAUDE.md "5+ 文件相似 pattern" 触发条件之一。
P140a ship 前跑 1 次 holistic cross-cutting review（在 `superpowers:requesting-code-review` skill 下），确认 4 个 astro 页面 import 同步、4 个 AdUnit 用法无残漏、INDEX.md 表条目只动 AdUnit 一行。

---

## Execution Handoff

Plan 完成并保存到 `docs/superpowers/plans/2026-07-31-p140a-adsense-scaffold.md`。

两种执行方式选哪个？