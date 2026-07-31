# Calculator Prose — Editor's Guide

每个计算器的 prose 文本活在 `src/content/tools/<slug>.md`（en）和 `<slug>.zh.md`（zh）。
两个文件各自由 `src/components/CalculatorProse.astro`（P140a-T5）渲染到 `src/pages/[lang]/[slug].astro`（P140b-T4）。

## Frontmatter（必填）

注：Astro 4.x 保留 `slug` 字段（用于 entry-id 派生），所以 zod schema 不校验 slug。下面示例中的 `slug:` 是装饰性的；实际强制校验的是 `engine_ref`（pattern 与之一致）。

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
2. 修改 `engine_ref` / `category_id` / `sources`。
3. 4 H2 段必到；按本指南词数阈值写。
4. 跑 `pnpm build` 与 `pnpm test:build`（开启 `RUN_BUILD_TESTS=1`）确认守卫通过。
