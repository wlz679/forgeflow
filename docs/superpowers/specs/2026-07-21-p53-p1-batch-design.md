# P53 — P1 Critical Batch — Design

> **Status:** Design (brainstorming approved)
> **Date:** 2026-07-21
> **Author:** Claude (per user "P1 必修批量（推荐）" → 9-P1 fix sweep from 4-agent audit)

## Goal

One batch sweep over all **9 P1 bugs** surfaced by the 2026-07-21 four-agent global audit. Each P1 is independently observable (production-visible) and has a confirmed root cause. Fixing all 9 in one batch keeps the PR surface area contained and exercises the new `tsc --noEmit` CI gate against a known-clean baseline.

**4-agent audit findings covered:**

| Agent | Finding | P1 # |
|---|---|---|
| A (engines/i18n) | tsc --noEmit 报 134 errors · ToolEngine 类型契约破弃 | 1 |
| A | customer-health-score-calculator customFn 返 `[number]` 而非 `[string]` | 2 |
| A | customer-health-score-calculator options 写成 `{value,label}[]` → 渲染 `[object Object]` | 2 |
| A | ltv-calculator customFn 缺 LTV Health 🩺 + What-If 🔄 两段 + 拼写 `Sae` 应为 `SaaS` | 3 |
| B (client/page) | `/recent/` 页面 JS 初始化清空 inner `[data-recent-grid]`，Tailwind grid 类丢失 | 4 |
| B + C | `[slug].astro` 找不到 engine 时静默 302 redirect（未来加 tool 无 engine 静默失败） | 5 |
| C (build/CI) | `sync-pricing.yml` 缺 `timeout-minutes` + paths 缺 `codegen-examples.mjs` | 6 |
| D (test/quality) | 4 个 AI cost engines 0 测试 + 3 个 test 仅测 `clampNonNegative` helper | 7 |

## Scope

| In scope | Out of scope |
|---|---|
| types.ts 扩字段 + customer-health 双 bug | Agents A/B/C/D 列出的 30+ P2 项 (P54+) |
| 19+ engines 添加的 dead fields 复苏（`sources/categoryId/keywords/tags/reviewedBy/author/dataReviewedAt/applicationCategory`） | 9 engines v3 sections 补全 (Agent D P2) |
| ci.yml 加 `tsc --noEmit` step | i18n whitelist 完整化 (Agent B P2) |
| sync-pricing.yml timeout + paths 修复 | emoji drift (Agent A P2 ~107 处) |
| `check-engine-coverage.mjs` 新建（silent 302 guard） | recatp category drift (Agent A P3) |
| 8 个 AI cost engines × 3 tests generate-mode | 38 engines 0 export math (Agent D P2) |
| /recent/ grid bug 修复 | ResultCard export-btn 重复 handler (Agent B P3) |
| ltv-calculator customFn 补段 + 拼写 | Helper extraction (Agent D P2) |

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│              P53 = 9 P1 fixes in 4 layers                     │
├───────────────────────────────────────────────────────────────┤
│ Layer 1 — Type Layer (1 fix covers 2 P1 sub-bugs)              │
│   src/core/engines/types.ts                                    │
│     • ToolInput.options: string[] → {value:string,label:string}[]│
│     • ToolEngine +sources/default/categoryId/applicationCategory│
│     •         +keywords/tags/reviewedBy/author/dataReviewedAt  │
│   Effect: 19+ engines with literal fields now typecheck        │
│           customer-health-score options 渲染 <option>{label}</option>│
│                                                                │
│ Layer 2 — CI Gate (closes Agent A meta-bug)                    │
│   .github/workflows/ci.yml                                     │
│     • 新 step: `pnpm exec tsc --noEmit` (fail-fast, 0 exit)    │
│   .github/workflows/sync-pricing.yml                           │
│     • jobs.sync.timeout-minutes: 30                            │
│     • paths + 'scripts/codegen-examples.mjs'                   │
│                                                                │
│ Layer 3 — Build-time drift guards                              │
│   NEW scripts/check-engine-coverage.mjs                        │
│     • mirrors P49 check-engine-count-by-category.mjs pattern   │
│     • reads data/tools/*.ts, calls getEngine(slug) per slug    │
│     • any mismatch → throw + exit 1                           │
│   接: .githooks/pre-commit (新 slot) + pnpm check + CI         │
│                                                                │
│ Layer 4 — Bug Fixes (3 engines + 1 page + 4 engines tests)    │
│   src/engines/retention/customer-health-score-calculator.ts   │
│     • L163 customFn return [number] → return [formattedString]│
│     • L178 options 已符合 {value,label}（types 扩后自动修）     │
│   src/engines/valuation/ltv-calculator.ts                      │
│     • L74 拼写 Sae → SaaS                                       │
│     • L151-198 customFn 补 LTV Health 🩺 + What-If 🔄 两段    │
│   src/scripts/recent-init.client.ts                            │
│     • L138 改 container.firstChild clear 为 query first child  │
│     • L176 同步 query first child → clear firstChild           │
│     • 镜像 favorites-init.client.ts:181-184 pattern           │
│   tests/ai-cost/ (NEW 4 test files × 3 each)                  │
│     • claude/openai/deepseek/gemini × (canonical/cheapest/cross-provider)│
│   tests/ai-{api-cost-comparison,image-gen,training}-*.test.ts │
│     • 各加 1 个 generate() 数据驱动断言（替换原纯 helper 测试） │
└───────────────────────────────────────────────────────────────┘
```

## Component Changes (9 sub-tasks → 2 PRs, ~9 commits total)

| PR | Sub-tasks | Commits |
|---|---|---|
| **P53a** (TS + engines + page + CI workflow + drift guard) | #1 #2 #3 #4 #5 #6 | ~6 commits (types sweep · customer-health dual fix · ltv fill gaps · /recent/ grid · sync-pricing.yml · check-engine-coverage.mjs · CI tsc step) |
| **P53b** (8 AI cost engines × 3 tests generate-mode) | #7 #8 #9 | ~3 commits (4 NEW tests file · 3 extends · 1 tsx dual-platform polish) |

### Sub-task #1 — types.ts extension + customer-health dual fix
- `src/core/engines/types.ts:1-33`
  - ToolInput.options: `string[]` → `{value: string; label: string}[]`
  - ToolEngine add (all optional, since 27 engines have neither):
    - `sources?: string[]`
    - `default?: Record<string, string>` (already `default: 'balanced'` literal in customer-health)
    - `categoryId?: string`
    - `applicationCategory?: string`
    - `keywords?: string[]`
    - `tags?: string[]`
    - `reviewedBy?: string`
    - `author?: string`
    - `dataReviewedAt?: string`
- `src/engines/retention/customer-health-score-calculator.ts:163`
  - `return [sc];` → `return [v3Report];` where `v3Report` is rebuilt to match `calculate()` output structure (string array)

### Sub-task #2 — ltv-calculator customFn fill gaps
- `src/engines/valuation/ltv-calculator.ts:74` — fix typo `Sae` → `SaaS`
- `src/engines/valuation/ltv-calculator.ts:151-198` customFn
  - Add `// 🩺 LTV Health (v3)` block (mirror calculate() lines 68-78)
  - Add `// 🔄 What-If Scenarios (v3)` block (mirror calculate() lines 80-95)
  - **Verify final output**: `staticExamples[0]` matches new customFn output (1-assertion test)
- `tests/ltv-calculator.test.ts` (NEW file at tests/ root per P22b ESM trap lesson — `find tests -name "ltv-*.test.ts"` 验证当前不存在) — assert both `calculate` and `customFn` produce section header `🩺 LTV Health`

### Sub-task #3 — /recent/ page grid bug
- `src/scripts/recent-init.client.ts:138`
  - Replace `while (container.firstChild) container.removeChild(...)` with:
    ```ts
    const grid = container.querySelector('[data-recent-grid]') ?? container;
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    ```
- `src/scripts/recent-init.client.ts:176` — same pattern (query first, clear children after)
- Reference: `src/scripts/favorites-init.client.ts:181-184` pattern
- **Verify**: empty state + non-empty state render with Tailwind grid classes preserved

### Sub-task #4 — sync-pricing.yml timeout + paths fix
- `.github/workflows/sync-pricing.yml:18-71`
  - Add `timeout-minutes: 30` at job level (mirror ci.yml:20)
  - Update push.paths (line 11-16):
    ```yaml
    paths:
      - 'src/data/ai-pricing.json'
      - 'scripts/sync-pricing.mjs'
      - 'scripts/codegen-customfn.mjs'
      - 'scripts/codegen-examples.mjs'  # NEW
      - '.github/workflows/sync-pricing.yml'
    ```

### Sub-task #5 — NEW scripts/check-engine-coverage.mjs
- Pattern: mirrors `scripts/check-engine-count-by-category.mjs` (P49)
- Logic:
  1. Read all `src/data/tools/*.ts` via tools barrel
  2. For each `tool.slug`, dynamic-import corresponding engine file
  3. Any mismatch throw `Error: tool {slug} has no registered engine`
  4. Exit 0 on success
- Wire-in:
  - `package.json`:
    - `"check:engine-coverage": "node scripts/check-engine-coverage.mjs"`
    - `"check": "... && node scripts/check-engine-coverage.mjs && ..."`
  - `.githooks/pre-commit` — add new slot (e.g., slot 5 path filter)
  - `.github/workflows/ci.yml` — add `pnpm check:engine-coverage` step
- Tests:
  - `tests/check-engine-coverage.test.ts` (NEW at tests/ root per P22b ESM trap lesson)
  - 4-6 assertions: T1 happy path · T2 missing engine throws · T3 extra registered engine warns · T4 --check exit 0 · T5 dynamic-load injection

### Sub-task #6 — CI tsc --noEmit fail-fast gate
- `.github/workflows/ci.yml` — insert step **after Drift check (customFn), before Unit tests**:
  ```yaml
    - name: Type check (fail-fast gate)
      run: pnpm exec tsc --noEmit
  ```
- Rationale: P53 PRs will have 0 tsc errors after sub-task #1 sweep; subsequent PRs caught here.
- Layer 1 must land first (or in same PR) to ensure clean baseline.

### Sub-task #7-9 — 8 AI cost engines × 3 tests
- 4 NEW test files at `tests/ai-cost/` (P22b lesson: at tests/ root, not tests/ai-cost/ subdir):
  - `tests/ai-cost/claude-api-cost-calculator.test.ts`
  - `tests/ai-cost/openai-token-calculator.test.ts`
  - `tests/ai-cost/deepseek-api-cost-calculator.test.ts`
  - `tests/ai-cost/gemini-api-cost-calculator.test.ts`
- Each: 3 tests
  1. **canonical input → monthlyCost in [min, max] range** (with explicit numeric assertion)
  2. **cheapest model selected** (`result.some(r => r.includes('💰 Cheapest'))` + assertion on `cheapest.info.name` from PRICING.json)
  3. **cross-provider comparison output format** (assert output contains expected comparison column headers / cross-provider identifiers, e.g., `OpenAI:` vs `Anthropic:` vs `Google:` vs `DeepSeek:`)
- Extend existing 3:
  - `tests/ai-api-cost-comparison.test.ts` — add 1 generate test
  - `tests/ai-image-generation-cost-calculator.test.ts` — add 1 generate test
  - `tests/ai-training-cost-estimator.test.ts` — add 1 generate test
- Total: 4 × 3 + 3 × 1 = **15 generate-mode assertions** (Agent D P1 D2 closure)

## Error Handling

| Failure mode | Detection | Resolution |
|---|---|---|
| TS field renames break 100 engines | `pnpm exec tsc --noEmit` exit 1 | Sub-task #1 sweep + Layer 1 must land before CI gate activates |
| New tool added with no engine | `pnpm check:engine-coverage` exit 1 | Add engine file or remove tool entry |
| `staticExamples[0]` drifts after customFn change | `pnpm check:examples` exit 1 | Re-run `node scripts/codegen-examples.mjs` |
| customFn parse error | `node tests/scripts/test-customfn.mjs <slug>` exit 1 | Sub-task #2 fix typo + P22 ASI trap check |
| /recent/ page output broken | Manual / Playwright screenshot | Sub-task #3 fix grid first |
| sync-pricing stuck job | GH Action 30-min timeout | Sub-task #4 `timeout-minutes: 30` |

## Testing Strategy

```bash
# Layer 1 first (types + customer-health + ltv fix)
pnpm exec tsc --noEmit                                      # must exit 0

# Layer 2 (CI gate won't be active locally, only after PR merge)
grep -c "tsc --noEmit" .github/workflows/ci.yml             # = 1

# Layer 3 (drift guard)
pnpm check:engine-coverage                                  # must exit 0
node tests/check-engine-coverage.test.ts                    # all pass

# Layer 4 (bug fixes + tests)
pnpm test:unit                                              # all pass (1130 → 1148)
node tests/scripts/test-customfn.mjs solopreneur-customer-health-score-calculator
node tests/scripts/test-customfn.mjs solopreneur-ltv-calculator

# Integration
pnpm check                                                  # ALL slots green (drift + typecheck + tests)
pnpm build                                                  # 100 pages generate no warnings
```

**Acceptance criteria for P53 PR merge:**

- [ ] `tsc --noEmit` exits 0
- [ ] `pnpm check:engine-coverage` exits 0
- [ ] `pnpm check` (full chain) exits 0
- [ ] All 100 engines still register (count check)
- [ ] `pnpm build` succeeds, 313+ pages emit, no warnings
- [ ] Lighthouse / smoke: /en/recent/ empty + non-empty states render with grid
- [ ] All 4 NEW AI cost test files + extended 3 files pass (12+ new assertions)

## Open Questions / Risks

| # | Question | Mitigation |
|---|---|---|
| 1 | 19+ engines 字段扩 + 4 options 类型改 是否真的能让 `tsc --noEmit` 干净？ | Pre-flight: `pnpm exec tsc --noEmit 2>&1 | wc -l` then sweep one-by-one if errors |
| 2 | `scripts/check-engine-coverage.mjs` 需不需要 cross-platform tsx 调用？ | Mirror P52 spawn-tsx helper at `tests/helpers/spawn-tsx.ts` (for tests); for the script use direct `node_modules/.bin/tsx.cmd` (Agent C P1 #4 fix) |
| 3 | customer-health-score customFn 改 string 返需要重新设计 generate() 路径吗？ | Sub-task #1 优先：把 calculate() 的 v3 report 全段复制到 customFn 末尾拼接后 `return [...]`. 不要引入 generate 重构。 |
| 4 | ltv-calculator customFn 补段与 calculate() 输出是否完全镜像？ | Implementer 应 verify byte-for-byte（除了 escape sequence）— 加 1-assertion test 对比 staticExamples[0] vs customFn output 关键 section 存在 |
| 5 | AI cost test 的 PRICING.json 校验假设 model 名 stable | Use `clampNonNegative(parseFloat(inputs.X) || 0)` 模式 + 断言 in range 而非 exact value, 避免 LiteLLM sync 周一改 model 价格后 CI 红 |
| 6 | 9 commits 是否全合并为 1 PR? | P-series 传统 + 跨文件依赖：拆 **P53a (sub-task #1-#6)** 和 **P53b (sub-task #7-#9 tests)** 2 PRs（约 6+3 commits）。P53a holistic review on pre-merge 后 merge → P53b 由 P53a merge 的新 tools-test 模板复用，1 subagent 即可 ship。 |

## Why NOT split into P53a/P53b/...

过去 P-series 已经形成 "single multi-task P-batch = 1 PR with holistic review" 模式（P49 6 commits / P50 2 commits / P52 4 commits 都是此模式）。9 个 P1 同源（一组 audit finding），合并 1 PR 节省 holistic review 成本（full pre-merge 必须 1 次）。P2 项独立 → P54。

## Pre-flight Verification (BEFORE Start Plan)

| Claim | Verification |
|---|---|
| `tsc --noEmit` 当前 134 errors | `pnpm exec tsc --noEmit 2>&1 | head -50` |
| 19+ engines 加 sources/categoryId 等字段 | `grep -rn 'sources:\|categoryId:\|dataReviewedAt:' src/engines/ | wc -l` |
| customer-health options 是 object array | `grep -c "options: \[" src/engines/retention/customer-health-score-calculator.ts` |
| /recent/ 页面 grid 清空点 | `sed -n '135,180p' src/scripts/recent-init.client.ts` |
| sync-pricing.yml timeout + paths | `grep -E "timeout-minutes|codegen-examples.mjs" .github/workflows/sync-pricing.yml` |
| 4 个 AI cost engines 0 test | `find tests -name "claude-api*" -o -name "openai-token*" -o -name "deepseek-api*" -o -name "gemini-api*"` |

(以上 6 命令验证结果将写入 plan §Pre-flight)
