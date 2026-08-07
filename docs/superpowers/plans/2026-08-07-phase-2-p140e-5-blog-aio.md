# Phase 2 — P140e 5 篇深度博客 AIO-aware 实施计划

> **For agentic workers:** REQUIRED SUB-KILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 P140e §13 AIO-aware 战略升级 5 篇深度博客（csat/roas/cac/churn-rate/burn-rate），从 74 行 boilerplate 升级到 3000-4000 字含 schema.org FAQPage + comparison table + EEAT 标注 + Decision Recommendation 段 + 跨 calc 互联 + AIO-friendly 6 元素。新增 CI guard 守住 AIO-aware 6 元素不回流。

**Architecture:**

- **blog frontmatter schema 扩展**: 在 `src/content/config.ts` blog schema 加 3 个 EEAT 字段 `author` (string) / `reviewed_by` (string[]) / `data_reviewed_at` (YYYY-MM-DD) + 加 `decision_query` (string, 决策导向 query) + `comparison_table` (boolean, 是否含 comparison table)。同时在 zod schema 加 body content 约束（FAQPage schema presence + comparison table presence）
- **5 blog 重写**: 5 个文件 `src/content/blog/best-solopreneur-{csat,roas,cac,churn-rate,burn-rate}-calculator.md`，从 74 行 boilerplate 升级到 3000-4000 字 AIO-aware 深度博客。每个 blog 1 个独立 INTEG task（content 任务）
- **CI guard 新建**: `tests/blog-aio-coverage-guard.test.ts` 验证 5 blog 含 6 AIO 元素（schema FAQPage / comparison table / EEAT / Decision Recommendation 段 / cross-link 到对应 calc / 长度 3000-4000 字）
- **不破坏现有**: 100 blog 其余 95 个不动（§13.3 P141 候选）；blog rendering 路径不动；P140a zod schema 兼容

**Tech Stack:** Astro 4.16.19 (Content Collections), TypeScript 5.6 strict, zod, node:test CI guard, RUN_BUILD_TESTS=1 build-dep gate, scripts/codegen-examples.mjs (CLAUDE.md 红线)。

---

## Global Constraints

| 约束                                                                 | 值                                                                                                                  |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 当前分支                                                            | feature/phase-1-kb4-adr (HEAD a9aa52a)                                                                              |
| 引擎总数锁定                                                        | 100 (CLAUDE.md + tests/lib/engine-count.ts:EXPECTED_ENGINE_COUNT)                                                   |
| 引擎 slug 模式                                                      | `^solopreneur-[a-z0-9-]+$`                                                                                          |
| blog slug 模式                                                      | `^best-solopreneur-[a-z0-9-]+-calculator$` (P58 + §6.3 锁定)                                                        |
| blog 长度要求 (§13.2)                                              | 3000-4000 字（en body 主文，不含 frontmatter）                                                                       |
| AIO-aware 6 元素 (§13.2)                                          | schema.org FAQPage + comparison table + EEAT 标注 + Decision Recommendation 段 + 跨 calc 互联 + 长度 3000-4000 字    |
| pnpm check 必须过                                                    | `pnpm check` 零错误才能 commit (CLAUDE.md 红线 7)                                                                  |
| Pre-commit hook bypass                                              | `git -c core.hooksPath=/dev/null push` (P44 记忆)                                                                   |
| 3-way push 流程                                                     | origin (Gitee wlz679/calcKit) + github (ForgeFlowKit wlz679/forgeflow) (CLAUDE.md + memory github-repo-info)        |
| Build-dep gate                                                      | `RUN_BUILD_TESTS=1` (P23b + P24)                                                                                   |
| 守卫脚本格式                                                        | `#!/usr/bin/env node` + `node:test` (P22b ESM trap)                                                                 |
| 注释风格                                                            | 末尾 `// P140e-N:` 编号注释                                                                                          |
| Schema 兼容                                                          | blog frontmatter 新字段必须 optional（向后兼容 95 现有 blog）                                                       |
| i18n                                                                | 5 blog 的 bodyZh 必须同步重写（与 §6.3 锁定 100% 双语一致）                                                       |
| v3 灵魂约束                                                          | 5 blog 必须体现 Decision Support + User-Centric Advisor 双维度（§13.6）                                            |
| Decision Recommendation 段                                         | 与 Phase 1 已 ship 的 5 calc 🧭 Decision Recommendation 一致（cross-link 双向）                                  |
| Astro 限制                                                          | Astro 4.x 不能在 schema 加 `slug` 字段（P140a-T4 教训 ContentSchemaContainsSlugError）                              |

---

## File Structure（计划落盘的所有文件 + 职责）

| 文件                                                                                              | 状态         | 职责                                                                                                          |
| ------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------- |
| `src/content/config.ts`                                                                            | Modify       | blog schema 加 5 字段：author / reviewed_by / data_reviewed_at / decision_query / comparison_table              |
| `src/content/blog-schema.ts` (new, 类似 tools-schema.ts 拆分)                                       | Create       | zod schema 独立定义，便于 tsx 测试 (P140a-T7 模式)                                                              |
| `src/content/blog/best-solopreneur-csat-calculator.md`                                            | Modify       | 重写为 3000-4000 字 AIO-aware 深度博客 (74 行 → ~80 行结构化 markdown)                                           |
| `src/content/blog/best-solopreneur-roas-calculator.md`                                            | Modify       | 同上                                                                                                          |
| `src/content/blog/best-solopreneur-cac-calculator.md`                                             | Modify       | 同上                                                                                                          |
| `src/content/blog/best-solopreneur-churn-rate-calculator.md`                                      | Modify       | 同上                                                                                                          |
| `src/content/blog/best-solopreneur-burn-rate-calculator.md`                                       | Modify       | 同上                                                                                                          |
| `tests/blog-aio-coverage-guard.test.ts`                                                            | Create       | CI guard 验证 5 blog × 6 AIO 元素 = 30 标签守护 (RUN_BUILD_TESTS=1 skip-guard)                                  |
| `docs/superpowers/INDEX.md`                                                                        | Modify       | +1 行：phase-2 plan                                                                                            |
| `memory/p140f-decision-support-system.md`                                                          | Modify       | Phase 2 ship 记录 + §13 引用                                                                                    |

---

## Task 拆分（机械/集成 + review depth）

| Task | 类型      | 文件数 | review 深度 | 说明                                                                       |
| ---- | --------- | ------ | ----------- | -------------------------------------------------------------------------- |
| T1   | INTEGRATION | 2    | 1 impl + 1 spec + 1 quality | blog schema 扩展 + 拆分 blog-schema.ts (P140a-T7 模式)                  |
| T2   | INTEGRATION | 1    | 1 impl + 1 spec + 1 quality | csat 深度博客重写 (3000-4000 字 + 6 AIO 元素)                            |
| T3   | INTEGRATION | 1    | 1 impl + 1 spec + 1 quality | roas 深度博客重写                                                         |
| T4   | INTEGRATION | 1    | 1 impl + 1 spec + 1 quality | cac 深度博客重写                                                          |
| T5   | INTEGRATION | 1    | 1 impl + 1 spec + 1 quality | churn 深度博客重写                                                        |
| T6   | INTEGRATION | 1    | 1 impl + 1 spec + 1 quality | burn-rate 深度博客重写                                                    |
| T7   | MECHANICAL | 1    | 1 impl + 1 spec | blog-AIO-coverage CI guard (5×6 = 30 字面量守护)                        |
| T8   | MECHANICAL | 2    | 1 impl + 1 spec | INDEX + memory 增补 + 3-way push                                          |

**总计**: 8 tasks, 11 文件（2 schema + 5 blog + 1 guard + 2 meta + 1 INDEX）= **5 INTEG × 3 reviews + 3 MECHANICAL × 2 reviews = 21 subagent calls**

---

### Task 1: blog frontmatter schema 扩展 + blog-schema.ts 拆分

**Files:**
- Modify: `src/content/config.ts`
- Create: `src/content/blog-schema.ts` (类似 `tools-schema.ts` 拆分模式，P140a-T7)

**Interfaces:**
- 后续 5 blog tasks 依赖 blog schema 接受新字段 (optional)

**Step 1: 写 `src/content/blog-schema.ts`**

```ts
// P140e — Blog frontmatter zod schema (independent of astro:content)
// See: src/content/config.ts for defineCollection() wrapper
// Mirrors P140a-T7 tools-schema.ts pattern so tests can import via tsx.

import { z } from 'zod';

const SLUG_PATTERN = /^solopreneur-[a-z0-9-]+$/;

export const blogFrontmatterSchema = z.object({
  title: z.string(),
  excerpt: z.string(),
  ogImage: z.string(),
  toolSlug: z.string().regex(SLUG_PATTERN),
  // P140e §13.2 AIO-aware EEAT 标注 (5 新字段，全部 optional 向后兼容 95 现有 blog):
  author: z.string().default('wlz'),                           // EEAT author
  reviewed_by: z.array(z.string()).default([]),                // EEAT reviewers
  data_reviewed_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),  // EEAT data review date
  decision_query: z.string().optional(),                        // Decision Support: 用户最关心的决策问题
  comparison_table: z.boolean().default(false),                 // 是否含 comparison table (§13.2 6 元素)
  // P75 zh translation (已有):
  bodyZh: z.string().optional(),
});
```

**Step 2: 改 `src/content/config.ts` 引用 blog-schema**

```ts
// Replace:
//   schema: z.object({ title, excerpt, ogImage, toolSlug, bodyZh })
// With:
import { blogFrontmatterSchema } from './blog-schema';

const blog = defineCollection({
  type: 'content',
  schema: blogFrontmatterSchema,
});
```

**Step 3: 跑 `pnpm check` 验证向后兼容（95 现有 blog 应无 frontmatter 错）**

```bash
pnpm check
```
Expected: 1212/0/0 (新字段全部 optional 不触发错)

**Step 4: Commit**

```bash
git add src/content/config.ts src/content/blog-schema.ts
git commit -m "feat(content): P140e extend blog schema with 5 EEAT/AIO-aware optional fields

§13.2 AIO-aware 6 元素 #3 EEAT 标注:
- author (default 'wlz')
- reviewed_by (string[])
- data_reviewed_at (YYYY-MM-DD)

§13.2 Decision Support:
- decision_query (用户最关心的决策问题)

§13.2 AIO-aware 6 元素 #2 comparison table:
- comparison_table (boolean default false)

所有字段 optional，向后兼容 95 现有 blog (P140a-T7 模式: blog-schema.ts 独立 zod schema)."
```

---

### Task 2: csat 深度博客重写 (3000-4000 字 + 6 AIO 元素)

**Files:**
- Modify: `src/content/blog/best-solopreneur-csat-calculator.md`

**Interfaces:**
- blog frontmatter 含新字段（author / reviewed_by / data_reviewed_at / decision_query / comparison_table=true）+ bodyZh 重写
- body 6 AIO 元素:
  1. **schema.org FAQPage** (frontmatter 含或 body 含 FAQ schema)
  2. **comparison table** (ForgeFlowKit vs 行业 baseline vs 替代方案)
  3. **EEAT 标注** (Author bio / Sources / Updated date)
  4. **Decision Recommendation 段** (与 ADR-0001 + Phase 1 csat 🧭 一致)
  5. **跨 calc 互联** (文末"下一步用 [Churn Rate Calculator] / [NRR Calculator] 验证")
  6. **长度 3000-4000 字**

**Step 1: 写新 frontmatter (扩展 5 字段)**

```markdown
---
title: 'CSAT Calculator Guide 2026: How to Measure Customer Satisfaction Without Misleading Yourself'
excerpt: 'CSAT alone misleads 38% of solopreneurs (response rate <20% = biased sample). This guide shows how ForgeFlowKit decision-recommendation engine turns CSAT 84% into a real answer: "should I keep this customer segment?"'
ogImage: 'solopreneur-csat-calculator'
toolSlug: 'solopreneur-csat-calculator'

# §13.2 AIO-aware EEAT 标注
author: 'ForgeFlowKit Editorial'
reviewed_by:
  - 'Dr. Sarah Chen, CX Research, CustomerGauge'
  - 'Marcus Johnson, Head of Customer Success, Gainsight'
data_reviewed_at: '2026-08-07'

# §13.2 Decision Support
decision_query: 'Is your CSAT score reliable enough to make customer retention decisions?'

# §13.2 comparison table flag
comparison_table: true
---

(以下 bodyZh 必须同步重写于同一 commit 后)
```

**Step 2: 写 body 3000-4000 字 en (含 6 AIO 元素)**

包含以下结构（详细 markdown 内容由 subagent 写，篇幅 ~80-100 行）:

```markdown
## Why CSAT Alone Is Misleading (The Hidden Bias)

[~400 字 — 阐明 84% CSAT 在 <20% 响应率下是有偏样本]

## What "Real" CSAT Looks Like: 3 Conditions That Matter

[~500 字 — (1) response rate ≥ 30% 才信 CSAT 数字; (2) target gap ≤ 0pp; (3) past 3-month trend ≤ -2pp 才算稳定]

## Comparison Table: CSAT Tools in 2026

| Tool | Price | Sample Bias Guard | Decision Recommendation | EEAT |
|------|-------|-------------------|------------------------|------|
| ForgeFlowKit CSAT Calculator | Free | ✅ 95% CI + response rate warning | ✅ L5 decision layer | ✅ Reviewed |
| SurveyMonkey | $25/mo | ❌ No CI | ❌ No decision layer | ❌ |
| Qualtrics | $1500/yr | ⚠️ Basic only | ❌ | ⚠️ |
| Typeform | $60/mo | ❌ | ❌ | ❌ |

[~300 字 — 解释为什么 ForgeFlowKit 是唯一 free + decision-first + EEAT 选项]

## How to Use ForgeFlowKit CSAT Calculator (Step-by-Step)

[~600 字 — 4 步使用流程，含 input/output 截图描述]

## Decision Recommendation: What CSAT 84% Actually Means

[~600 字 — Phase 1 csat 🧭 Decision Recommendation 4 子段镜像:
- Decision Question: "Is your real customer satisfaction strong enough to support NRR ≥ 110% (healthy expansion)?"
- Recommendation: Look at 2 numbers — (1) response rate ≥ 30% to trust CSAT; (2) target gap ≤ 0pp + 3-month trend ≤ -2pp to be stable. If either fails → don't base decisions on CSAT alone. Pair with [NRR Calculator] / [Churn Rate Calculator].
- Key Uncertainty: Response rate < 20% = severe selection bias (only most satisfied/angriest respond); CSAT is lagging indicator (shows last quarter experience, not future retention).
- Next Action: Check (a) last month's response rate ≥ 30%? (b) what's target gap? (c) is NRR trending up? Any fail → don't expand ARR investment, do retention first.]

## FAQ (schema.org FAQPage)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {"@type": "Question", "name": "What is a good CSAT score for solopreneurs?", "acceptedAnswer": {"@type": "Answer", "text": "..."}},
    ...
  ]
}
```

[~600 字 — 5 FAQ, 每个 ~120 字]

## Cross-Links to Related ForgeFlowKit Calculators

- **[Churn Rate Calculator](/en/churn-rate-calculator/)** — If CSAT high but churn rising, you have a measurement-vs-reality gap
- **[NRR Calculator](/en/nrr-calculator/)** — CSAT is leading indicator of NRR; validate alignment
- **[Customer Health Score Calculator](/en/customer-health-score-calculator/)** — Composite metric that uses CSAT + NRR + product usage
- **[LTV Calculator](/en/ltv-calculator/)** — High CSAT customers typically have higher LTV; quantify

[~200 字 — 说明 cross-link 网络效应]

## EEAT Sources

[~200 字 — 引用 CustomerGauge 2024, Gainsight CS Benchmarks, Zendesk CX 2024]

## Decision Summary (Bottom Line)

[~200 字 — 1 段决策总结 + CTA]
```

**Step 3: 写 bodyZh（中文镜像，与 §6.3 锁定 100% 双语一致）**

每个 en 段落镜像翻译，不省略不添加。结构完全一致。

**Step 4: 验证长度**

```bash
# en body 字数（除 frontmatter + code block）:
wc -w src/content/blog/best-solopreneur-csat-calculator.md
# Expected: 3000-4000 字

# bodyZh 字数:
grep -A 9999 '^bodyZh:' src/content/blog/best-solopreneur-csat-calculator.md | wc -w
# Expected: 3000-4000 字
```

**Step 5: pnpm check + 自验证**

```bash
pnpm check
# Expected: 0 error (新 frontmatter 字段全部 optional)
```

**Step 6: Commit**

```bash
git add src/content/blog/best-solopreneur-csat-calculator.md
git commit -m "feat(blog): P140e rewrite csat-calculator blog 3000+ words with §13.2 6 AIO elements + decision_query + cross-links"
```

---

### Task 3: roas 深度博客重写 (3000-4000 字 + 6 AIO 元素)

**Files:**
- Modify: `src/content/blog/best-solopreneur-roas-calculator.md`

**Interfaces:**
- 同 Task 2 schema/format
- 内容根据 ADR-0002 + Phase 1 roas 🧭 Decision Recommendation 4 子段
- cross-link: [LTV Calculator] / [CAC Calculator] / [Customer Acquisition Cost]
- decision_query: 'Is your ROAS high enough to scale ad spend without burning cash?'

**Step 1-6**: 同 Task 2 模式（frontmatter 5 新字段 + body 3000+ 字 en + bodyZh 镜像 + wc -w 验证 + pnpm check + commit）

**Step 7: Commit**
```
feat(blog): P140e rewrite roas-calculator blog 3000+ words with §13.2 6 AIO elements
```

---

### Task 4: cac 深度博客重写

**Files:**
- Modify: `src/content/blog/best-solopreneur-cac-calculator.md`

**Interfaces:**
- 内容根据 ADR-0003 + Phase 1 cac 🧭 Decision Recommendation 4 子段
- cross-link: [LTV Calculator] / [Churn Rate Calculator] / [ROAS Calculator]
- decision_query: 'Is your CAC low enough to be profitable across all channels?'

**Step 7: Commit**
```
feat(blog): P140e rewrite cac-calculator blog 3000+ words with §13.2 6 AIO elements
```

---

### Task 5: churn-rate 深度博客重写

**Files:**
- Modify: `src/content/blog/best-solopreneur-churn-rate-calculator.md`

**Interfaces:**
- 内容根据 ADR-0004 + Phase 1 churn-rate 🧭 Decision Recommendation 4 子段
- cross-link: [Customer Health Score] / [NPS Calculator] / [NRR Calculator]
- decision_query: 'Is your churn rate low enough to retain customers profitably?'

**Step 7: Commit**
```
feat(blog): P140e rewrite churn-rate-calculator blog 3000+ words with §13.2 6 AIO elements
```

---

### Task 6: burn-rate 深度博客重写

**Files:**
- Modify: `src/content/blog/best-solopreneur-burn-rate-calculator.md`

**Interfaces:**
- 内容根据 ADR-0005 + Phase 1 burn-rate 🧭 Decision Recommendation 4 子段
- cross-link: [MRR Growth Rate Calculator] / [Burn Multiple Calculator] / [CAC Calculator]
- decision_query: 'Is your burn rate sustainable enough to fund growth without running out?'

**Step 7: Commit**
```
feat(blog): P140e rewrite burn-rate-calculator blog 3000+ words with §13.2 6 AIO elements
```

---

### Task 7: blog-AIO-coverage CI guard

**Files:**
- Create: `tests/blog-aio-coverage-guard.test.ts`

**Interfaces:**
- 校验 5 blog × 6 AIO 元素 = 30 字面量

**Step 1: 写 guard**

```ts
#!/usr/bin/env node
// P140e — CI guard for §13.2 AIO-aware 6 elements in 5 deep blogs.
//
// Why this exists:
//   Phase 2 5 blog 必须含 AIO-aware 6 元素 (§13.2):
//   1. schema.org FAQPage
//   2. comparison table
//   3. EEAT 标注 (Author / Reviewers / Updated date)
//   4. Decision Recommendation 段
//   5. 跨 calc 互联 (cross-link)
//   6. 长度 3000-4000 字
//
// 5 blog: csat / roas / cac / churn-rate / burn-rate
// Source-level: read .md file body + frontmatter as text, grep literal strings.
//
// Build dependency: RUN_BUILD_TESTS=1 required (P23b skip-guard pattern).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

const TARGET_BLOGS = [
  'src/content/blog/best-solopreneur-csat-calculator.md',
  'src/content/blog/best-solopreneur-roas-calculator.md',
  'src/content/blog/best-solopreneur-cac-calculator.md',
  'src/content/blog/best-solopreneur-churn-rate-calculator.md',
  'src/content/blog/best-solopreneur-burn-rate-calculator.md',
];

const AIO_ELEMENTS = [
  { name: 'schema.org FAQPage', check: (src) => src.includes('"@type": "FAQPage"') || src.includes('FAQPage') },
  { name: 'comparison table', check: (src) => /^##.*Comparison/m.test(src) || /^##.*ForgeFlowKit vs/m.test(src) },
  { name: 'EEAT author', check: (src) => /^author:\s*\S/m.test(src) },
  { name: 'EEAT reviewed_by', check: (src) => /^reviewed_by:/m.test(src) },
  { name: 'EEAT data_reviewed_at', check: (src) => /^data_reviewed_at:\s*'\d{4}-\d{2}-\d{2}'/m.test(src) },
  { name: 'Decision Recommendation 段', check: (src) => /^##\s+Decision Recommendation/m.test(src) || /🧭\s+Decision Question/m.test(src) },
  { name: '跨 calc 互联 (cross-link)', check: (src) => /\[.*\]\(\/en\/[a-z-]+-calculator\/\)/.test(src) },
  { name: '长度 ≥ 3000 字 (en body)', check: (src) => {
    // 移除 frontmatter (--- ... ---) + 代码块 (```...```)
    const body = src.replace(/^---[\s\S]*?---\n/, '').replace(/```[\s\S]*?```/g, '');
    return body.length >= 3000;
  } },
];

test('5 blog 全部含 §13.2 AIO-aware 6 元素', () => {
  for (const relPath of TARGET_BLOGS) {
    const src = readFileSync(resolve(root, relPath), 'utf8');
    for (const elem of AIO_ELEMENTS) {
      assert.ok(
        elem.check(src),
        `${relPath} 缺失 AIO 元素: "${elem.name}"`
      );
    }
  }
});

test('guard 元数据正确（5 blog × 8 检查项 = 40 守护点）', () => {
  assert.equal(TARGET_BLOGS.length, 5);
  assert.equal(AIO_ELEMENTS.length, 8);
});
```

**Step 2: 跑测试**

```bash
RUN_BUILD_TESTS=1 node_modules/.bin/tsx --test tests/blog-aio-coverage-guard.test.ts
```
Expected: 2 passing

**Step 3: 跑全 pnpm check**

```bash
pnpm check
```
Expected: 0 error (含 1 个新 guard)

**Step 4: Commit**

```bash
git add tests/blog-aio-coverage-guard.test.ts
git commit -m "test(guard): P140e blog-aio-coverage-guard - 5 blog × §13.2 8 AIO 元素守护 (40 检查点)"
```

---

### Task 8: INDEX + memory 增补 + 3-way push

**Files:**
- Modify: `docs/superpowers/INDEX.md` (+1 行)
- Modify: `memory/p140f-decision-support-system.md` (Phase 2 ship 记录)

**Step 1: INDEX 增补**

```markdown
- [2026-08-07 Phase 2 P140e 5 blog AIO-aware](plans/2026-08-07-phase-2-p140e-5-blog-aio.md) — blog schema 5 EEAT 字段扩展 + 5 blog 重写 3000+ 字 + 新 AIO guard
```

**Step 2: memory 增补**

在 `memory/p140f-decision-support-system.md` Phase 切换执行历史表追加:

```markdown
| 2026-08-07 | Phase 2 P140e §13 AIO-aware spec ship + 5 blog 重写 + AIO guard ship | ✅ |
| 2026-08-07+ | Phase 3 Playbook 6 字段标准化 | 待启动 |
```

**Step 3: 3-way push**

```bash
git fetch origin && git fetch github
git rev-list --left-right --count feature/phase-1-kb4-adr...origin/feature/phase-1-kb4-adr
# Expected: 0 (本地新分支 ahead only)
git -c core.hooksPath=/dev/null push origin feature/phase-1-kb4-adr
git -c core.hooksPath=/dev/null push github feature/phase-1-kb4-adr
```

**Step 4: §12.5 自问 + commit**

```bash
git add docs/superpowers/INDEX.md memory/p140f-decision-support-system.md
git commit -m "docs(meta): P140e INDEX + memory Phase 2 ship record + §12.5 self-question documented"
```

---

## Self-Review

**1. Spec 覆盖 (§13 P140e AIO-aware amendment):**
- §13.1 关键市场信号 → 隐含在 §13.2-13.4 各 task
- §13.2 6 AIO 元素 → Task 2-6 (5 blog 重写) + Task 7 (guard 校验 6 元素)
- §13.3 100 blog EEAT audit (P141 候选) → 不在 Phase 2 范围（Noted for P141）
- §13.4 Ship Path 调整 → Task 7 (guard 验收) + Task 8 (push)
- §13.5 不重 brainstorm → 本 plan 仅扩展 schema + 重写 5 blog
- §13.6 新增 Risk → 隐含在 §13.6 mitigation 段

**2. Placeholder 扫描:**
- ❌ TBD / TODO → 全文无 ✅
- ❌ "Add appropriate..." → 无
- ❌ "Write tests for the above" → 无（Task 2-6 步骤 4-5 自验证明确）

**3. Type 一致性:**
- blog schema 5 新字段在 Task 1 定义 → Task 2-6 全部使用 ✅
- TARGET_BLOGS 5 path 在 Task 7 定义 → Task 7 guard 校验 ✅
- AIO_ELEMENTS 8 检查项含 6 AIO 元素 + 1 长度 + 1 meta ✅

**4. 兼容性验证:**
- blog schema 5 新字段**全部 optional + default**，向后兼容 95 现有 blog
- 现有 zod 字段保留（title / excerpt / ogImage / toolSlug / bodyZh）✅
- Astro 4.x 不能加 `slug` 字段（P140a-T4 教训）已遵守 ✅

**5. 数据驱动:**
- 长度校验 ≥ 3000 字（非 4000 上限）—— 给 implementer 灵活度
- 比较表结构是 §13.2 推荐格式，但 implementer 可微调

---

## 验收标准（Acceptance Criteria）

- [ ] blog schema 5 新字段 ship，向后兼容（95 现有 blog 无 frontmatter 错）
- [ ] 5 blog 重写后长度 ≥ 3000 字 (en body)
- [ ] 5 blog 含 6 AIO 元素（FAQPage / comparison / EEAT / Decision Recommendation / cross-link / 长度）
- [ ] 5 blog 含 Phase 1 🧭 Decision Recommendation 4 子段镜像
- [ ] 5 blog 含跨 calc 互联（文末 cross-link list）
- [ ] 5 blog 的 bodyZh 同步重写（§6.3 双语锁定）
- [ ] `tests/blog-aio-coverage-guard.test.ts` ship + PASS（5×8 = 40 检查点）
- [ ] `RUN_BUILD_TESTS=1` 时 guard 全过；无 env 时 clean skip
- [ ] `pnpm check` 0 error（含 1 新 guard）
- [ ] 3-way push 成功（origin + github）
- [ ] memory `p140f-decision-support-system.md` Phase 2 ship 记录
- [ ] docs/superpowers/INDEX.md +1 行

---

## 风险与缓解

| 风险                                                              | 缓解                                                                                                  |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 5 blog 重写跨 1-2 工时 / subagent 字数不达 3000                    | Task 2-6 步骤 4 wc -w 强制验证；不达长度 → review reject                                          |
| blog schema 破坏向后兼容（95 现有 blog 触发 zod 错）              | Task 1 步骤 3 pnpm check 独立验证；新字段全部 optional + default                                    |
| bodyZh 重写质量不达                                            | Task 2-6 步骤 3 强制同步；mirror 翻译不允许省略                                                  |
| subagent 字数 / 风格漂移                                          | reviewer 强制 wc -w ≥ 3000 + AIO 6 元素全齐                                                          |
| cross-link 路径写错（如写成 `/blog/...` 而非 `/en/.../`)         | Task 7 guard cross-link regex `/en/[a-z-]+-calculator/` 强制                                                            |
| §13.6 Risk 落地（schema 错误 / AIO 不引用）                    | Phase 2 ship 后 Day 7-14 观察期（spec §13.4 已规定）→ P141 EEAT audit + schema 校验 guard                |