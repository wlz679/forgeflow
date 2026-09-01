# P151 L5 Backfill Batch 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add saas-burn-rate-style L5 Decision Recommendation 4-section block to 5 score-0 engines across 5 categories. Validate template reusability + push v2.0 Dimension 1 coverage from ~0% → ~4%.

**Architecture:** Each engine's `generate()` runtime output gets an appended ~30-line L5 block (4 sub-sections: Decision Question / Recommendation / Key Uncertainty / Next Action). Mirrored in `clientConfig.customFn` for client-side live parity. Mirrored in `staticExamples[0]` for first-render parity. New per-engine test asserts block presence + content substance via the engine registry.

**Tech Stack:** TypeScript + Astro 4 + node:test + @astrojs/cloudflare. Existing patterns: P140f-7 (saas-burn-rate ship, 2026-07 era). Engines self-register on file import via `registerEngine(engine)` call at module bottom.

## Global Constraints

- **Branch**: `feature/p151-l5-backfill-batch1` (one branch, 5 commits, 1 merge to master)
- **PowerShell**: Use `;` not `&&` to chain commands. Use `Set-Content -Encoding utf8` or `[System.Text.Encoding]::UTF8::GetBytes(@'...'@ | Out-String)` to write multi-line content with special chars.
- **Per-engine commit (5 total)**: `feat(l5): <engine-slug> add Decision Recommendation 4-section block`
- **Per-engine test**: `tests/exp-p151-l5-<engine-slug>.test.ts` (node:test + node --import tsx)
- **Test pattern**: Import the engine file (triggers `registerEngine`) + import `getEngine` from `../src/core/engines/registry`. Fetch engine by slug `solopreneur-<engine-name>-calculator`. Call `engine.generate(inputs)`. Assert 4 L5 markers present + ≥50 chars substance + at least 1 `[Xxx Calculator]` cross-link.
- **L5 template (canonical, from saas-burn-rate P140f-7)**:
  ```
  \n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  \n• 🧭 Decision Question: ...
  \n• 🧭 Recommendation: ...
  \n• 🧭 Key Uncertainty: ...
  \n• 🧭 Next Action: ...
  ```
- **3 places to mirror per engine**:
  1. `engine.generate(inputs)` — push string to returned array
  2. `engine.clientConfig.customFn` — push string element to the `return [...]` array
  3. `engine.staticExamples[0]` — append `\n\n🧭 Decision Recommendation\n...` block to the literal string
- **Verification per engine (before commit)**:
  ```powershell
  node --import tsx --test tests/exp-p151-l5-<engine>.test.ts        # new test passes
  node --import tsx --test tests/<engine>-calculator.test.ts        # existing test not broken
  pnpm typecheck                                                    # 0 errors
  ```
- **Out of scope**: FAQ, HowToUse, description, inputs, engine.insight/result/uses metadata, LLM reclassification, remaining 76 score-0 engines.

---

## Task 0: Create feature branch

**Files:** (none — git operation)

- [ ] **Step 1: Verify on master, pull latest**

```powershell
cd d:\E\独立站\ForgeFlowKit
git checkout master
git pull origin master 2>$null
git pull github master 2>$null
git status
```

Expected: "On branch master", working tree clean.

- [ ] **Step 2: Create and checkout new branch**

```powershell
git checkout -b feature/p151-l5-backfill-batch1
```

Expected: "Switched to a new branch 'feature/p151-l5-backfill-batch1'"

---

## Task 1: cost/employee-cost-calculator L5 block

**Files:**
- Modify: `src/engines/cost/employee-cost-calculator.ts` (3 places: `generate()`, `customFn`, `staticExamples[0]`)
- Create: `tests/exp-p151-l5-employee-cost.test.ts`

**Interfaces:**
- Consumes: existing engine object with slug `solopreneur-employee-cost-calculator`
- Produces: engine.generate() returns array ending with L5 string; clientConfig.customFn returns array ending with L5 string; staticExamples[0] string ends with L5 block

- [ ] **Step 1: Write the failing test**

Create `tests/exp-p151-l5-employee-cost.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import "../src/engines/cost/employee-cost-calculator";
import { getEngine } from "../src/core/engines/registry";

test("P151 L5: employee-cost Decision Recommendation block has 4 sub-sections", () => {
  const engine = getEngine("solopreneur-employee-cost-calculator");
  assert.ok(engine, "engine must be registered");

  const out = engine.generate({
    annualSalary: "100000",
    benefitsPercentage: "25",
    location: "US",
  }).join("\n");

  // Block header + 4 sub-sections
  assert.match(out, /🧭 Decision Recommendation/);
  assert.match(out, /🧭 Decision Question:/);
  assert.match(out, /🧭 Recommendation:/);
  assert.match(out, /🧭 Key Uncertainty:/);
  assert.match(out, /🧭 Next Action:/);

  // Each section has ≥50 chars of substantive content
  for (const marker of ["Decision Question:", "Recommendation:", "Key Uncertainty:", "Next Action:"]) {
    const rx = new RegExp(`🧭 ${marker}([^\\n]{50,})`);
    assert.match(out, rx, `${marker} must have ≥50 chars of substantive content`);
  }

  // At least one cross-link to another engine
  assert.match(out, /\[[\w\s-]+ Calculator\]/);
});
```

- [ ] **Step 2: Run test to verify it fails (red)**

```powershell
cd d:\E\独立站\ForgeFlowKit
node --import tsx --test tests/exp-p151-l5-employee-cost.test.ts
```

Expected: FAIL — "no match match" for the L5 markers (the engine does not yet have L5)

- [ ] **Step 3: Add L5 block to engine.generate()**

In `src/engines/cost/employee-cost-calculator.ts`, find the `generate(inputs)` method's return array (likely ends with `return [...]` containing 6 strings for v3 standard). Add a new array element at the end:

```typescript
      '\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🧭 Decision Question: 单纯看 base salary 是陷阱，**核心问题是"完全负荷成本 / 月产出"是否低于市场价 + 该不该为 ramp time 买单**。cost ratio (fully-loaded / base) > 3x 说明有 hidden cost 漏算。\n• 🧭 Recommendation: (1) **cost ratio > 3x** → 必有 hidden cost 漏算（benefits/PTO/equipment/training），立即重新审 inputs；(2) **2x-3x** → 重新审 ramp time 假设；(3) **< 2x** → 合理区间，立即 hire；**FT 决策**：fully-loaded > $15K/mo 且 ramp > 6 月 → 先试 3-6 月 contractor。\n• 🧭 Key Uncertainty: (1) ramp time 真实值 vs 假设值（差异 2-3x）；(2) 隐性 cost (PTO/equipment/培训/管理 overhead) 是否计入；(3) contractor rate 不能按 12 月年化（无 PTO/benefits 但 billable rate 高 1.5-2x）。\n• 🧭 Next Action: (a) 跑 [Productivity Ramp Calculator] 看 ramp 曲线；(b) 跑 [Attrition Cost Calculator] 算全生命周期 cost；(c) FT 谈判前先跑 [Freelance Rate Calculator] 看 market reference；(d) 决策前 verify offer 包含 fully-loaded breakdown。',
```

- [ ] **Step 4: Add L5 block to clientConfig.customFn**

In the same file, find `clientConfig.customFn` (a template literal that contains a JavaScript function with a `return [...]` array). Inside the `return [...]` array, add a new string element with the SAME L5 content from Step 3 (escape newlines as literal `\n` inside the JS string, use Unicode escapes `\u{1F9ED}` for the 🧭 emoji or keep it literal if the surrounding quotes are backticks):

```javascript
'\n\n\u{1F9ED} Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\u{1F9ED} Decision Question: 单纯看 base salary 是陷阱，**核心问题是"完全负荷成本 / 月产出"是否低于市场价 + 该不该为 ramp time 买单**。cost ratio (fully-loaded / base) > 3x 说明有 hidden cost 漏算。\n\u{1F9ED} Recommendation: (1) **cost ratio > 3x** → 必有 hidden cost 漏算（benefits/PTO/equipment/training），立即重新审 inputs；(2) **2x-3x** → 重新审 ramp time 假设；(3) **< 2x** → 合理区间，立即 hire；**FT 决策**：fully-loaded > $15K/mo 且 ramp > 6 月 → 先试 3-6 月 contractor。\n\u{1F9ED} Key Uncertainty: (1) ramp time 真实值 vs 假设值（差异 2-3x）；(2) 隐性 cost (PTO/equipment/培训/管理 overhead) 是否计入；(3) contractor rate 不能按 12 月年化（无 PTO/benefits 但 billable rate 高 1.5-2x）。\n\u{1F9ED} Next Action: (a) 跑 [Productivity Ramp Calculator] 看 ramp 曲线；(b) 跑 [Attrition Cost Calculator] 算全生命周期 cost；(c) FT 谈判前先跑 [Freelance Rate Calculator] 看 market reference；(d) 决策前 verify offer 包含 fully-loaded breakdown。'
```

- [ ] **Step 5: Add L5 block to staticExamples[0]**

In the same file, find `staticExamples: [...]`. The first element is a literal string with `\n` newlines. Append the L5 block to this string (preceded by `\n\n`):

```


🧭 Decision Recommendation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 🧭 Decision Question: 单纯看 base salary 是陷阱，**核心问题是"完全负荷成本 / 月产出"是否低于市场价 + 该不该为 ramp time 买单**。cost ratio (fully-loaded / base) > 3x 说明有 hidden cost 漏算。
• 🧭 Recommendation: (1) **cost ratio > 3x** → 必有 hidden cost 漏算（benefits/PTO/equipment/training），立即重新审 inputs；(2) **2x-3x** → 重新审 ramp time 假设；(3) **< 2x** → 合理区间，立即 hire；**FT 决策**：fully-loaded > $15K/mo 且 ramp > 6 月 → 先试 3-6 月 contractor。
• 🧭 Key Uncertainty: (1) ramp time 真实值 vs 假设值（差异 2-3x）；(2) 隐性 cost (PTO/equipment/培训/管理 overhead) 是否计入；(3) contractor rate 不能按 12 月年化（无 PTO/benefits 但 billable rate 高 1.5-2x）。
• 🧭 Next Action: (a) 跑 [Productivity Ramp Calculator] 看 ramp 曲线；(b) 跑 [Attrition Cost Calculator] 算全生命周期 cost；(c) FT 谈判前先跑 [Freelance Rate Calculator] 看 market reference；(d) 决策前 verify offer 包含 fully-loaded breakdown。
```

- [ ] **Step 6: Run test to verify it passes (green)**

```powershell
cd d:\E\独立站\ForgeFlowKit
node --import tsx --test tests/exp-p151-l5-employee-cost.test.ts
```

Expected: PASS (1 test passes, 0 fail)

- [ ] **Step 7: Run existing engine test to verify no regression**

```powershell
cd d:\E\独立站\ForgeFlowKit
node --import tsx --test tests/employee-cost-calculator.test.ts
```

Expected: PASS (existing tests not broken)

- [ ] **Step 8: Run typecheck**

```powershell
cd d:\E\独立站\ForgeFlowKit
pnpm typecheck
```

Expected: 0 errors

- [ ] **Step 9: Commit**

```powershell
cd d:\E\独立站\ForgeFlowKit
git add src/engines/cost/employee-cost-calculator.ts tests/exp-p151-l5-employee-cost.test.ts
git commit -m "feat(l5): cost/employee-cost add Decision Recommendation 4-section block"
```

Expected: 1 commit created on feature/p151-l5-backfill-batch1

---

## Task 2: marketing/ltv-by-channel-calculator L5 block

**Files:**
- Modify: `src/engines/marketing/ltv-by-channel-calculator.ts` (3 places: `generate()`, `customFn`, `staticExamples[0]`)
- Create: `tests/exp-p151-l5-ltv-by-channel.test.ts`

**Interfaces:**
- Consumes: existing engine object with slug `solopreneur-ltv-by-channel-calculator`
- Produces: same 3-place L5 mirror as Task 1

- [ ] **Step 1: Write the failing test**

Create `tests/exp-p151-l5-ltv-by-channel.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import "../src/engines/marketing/ltv-by-channel-calculator";
import { getEngine } from "../src/core/engines/registry";

test("P151 L5: ltv-by-channel Decision Recommendation block has 4 sub-sections", () => {
  const engine = getEngine("solopreneur-ltv-by-channel-calculator");
  assert.ok(engine, "engine must be registered");

  const out = engine.generate({
    ch1_spend: "10000",
    ch1_conv: "100",
    ch1_ltv: "500",
    ch2_spend: "5000",
    ch2_conv: "50",
    ch2_ltv: "600",
    ch3_spend: "8000",
    ch3_conv: "40",
    ch3_ltv: "400",
    ch4_spend: "3000",
    ch4_conv: "20",
    ch4_ltv: "300",
    ch5_spend: "2000",
    ch5_conv: "10",
    ch5_ltv: "200",
  }).join("\n");

  assert.match(out, /🧭 Decision Recommendation/);
  assert.match(out, /🧭 Decision Question:/);
  assert.match(out, /🧭 Recommendation:/);
  assert.match(out, /🧭 Key Uncertainty:/);
  assert.match(out, /🧭 Next Action:/);

  for (const marker of ["Decision Question:", "Recommendation:", "Key Uncertainty:", "Next Action:"]) {
    const rx = new RegExp(`🧭 ${marker}([^\\n]{50,})`);
    assert.match(out, rx, `${marker} must have ≥50 chars of substantive content`);
  }

  assert.match(out, /\[[\w\s-]+ Calculator\]/);
});
```

- [ ] **Step 2: Run test to verify it fails (red)**

```powershell
cd d:\E\独立站\ForgeFlowKit
node --import tsx --test tests/exp-p151-l5-ltv-by-channel.test.ts
```

Expected: FAIL — L5 markers not found

- [ ] **Step 3: Add L5 block to engine.generate()**

In `src/engines/marketing/ltv-by-channel-calculator.ts`, find `generate(inputs)` return array and add new element:

```typescript
      '\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🧭 Decision Question: 单纯看 LTV 是陷阱，**核心问题是"LTV/CAC 是否 ≥ 3x 且 payback < 12 月"**。LTV/CAC < 1x = 每个客户净亏；3x+ = 健康可加预算。\n• 🧭 Recommendation: (1) **LTV/CAC < 1x** → 立刻砍预算（净亏损不可持续）；(2) **1x-3x** → 维持 + 优化 funnel conversion（最常见改善空间）；(3) **3x+** → 加预算抢市场窗口期；(4) **高 LTV 但低 volume** → 保留作为 brand 投入，不期待 direct ROI。\n• 🧭 Key Uncertainty: (1) attribution model 选错会让数字 2-5x 偏离（last-click 高估 direct、undercount brand）；(2) cohort 时间窗太短 (< 6 月) 会高估 churn；(3) discount rate 没折现（特别是 24+ 月 LTV）；(4) high-LTV 客户可能不可复制（outlier 而非 segment）。\n• 🧭 Next Action: (a) 跑 [CAC Calculator] 看单渠道 acquisition cost；(b) 跑 [ROAS Calculator] 看短期回报（与 LTV 互补）；(c) 跑 [Cohort Retention Calculator] 验证 cohort 稳定性；(d) 决策前用 6-12 月真实 cohort 数据校准 LTV。',
```

- [ ] **Step 4: Add L5 block to clientConfig.customFn**

Append L5 string to customFn's `return [...]` array. Use literal `\n` and `\u{1F9ED}` for 🧭 inside the JS string, OR keep 🧭 literal if the surrounding customFn template uses backticks. The new element contains the same 4-section content from Step 3.

- [ ] **Step 5: Add L5 block to staticExamples[0]**

Append `\n\n🧭 Decision Recommendation\n...` (with literal `\n` newlines in the JS string) to the existing static example string. The new content is the same 4-section block from Step 3.

- [ ] **Step 6: Run test to verify it passes (green)**

```powershell
cd d:\E\独立站\ForgeFlowKit
node --import tsx --test tests/exp-p151-l5-ltv-by-channel.test.ts
```

Expected: PASS

- [ ] **Step 7: Run existing engine test**

```powershell
cd d:\E\独立站\ForgeFlowKit
node --import tsx --test tests/ltv-by-channel-calculator.test.ts
```

Expected: PASS

- [ ] **Step 8: Run typecheck**

```powershell
cd d:\E\独立站\ForgeFlowKit
pnpm typecheck
```

Expected: 0 errors

- [ ] **Step 9: Commit**

```powershell
cd d:\E\独立站\ForgeFlowKit
git add src/engines/marketing/ltv-by-channel-calculator.ts tests/exp-p151-l5-ltv-by-channel.test.ts
git commit -m "feat(l5): marketing/ltv-by-channel add Decision Recommendation 4-section block"
```

---

## Task 3: freelance/freelance-rate-calculator L5 block

**Files:**
- Modify: `src/engines/freelance/freelance-rate-calculator.ts` (3 places)
- Create: `tests/exp-p151-l5-freelance-rate.test.ts`

**Interfaces:**
- Consumes: slug `solopreneur-freelance-rate-calculator`

- [ ] **Step 1: Write the failing test**

Create `tests/exp-p151-l5-freelance-rate.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import "../src/engines/freelance/freelance-rate-calculator";
import { getEngine } from "../src/core/engines/registry";

test("P151 L5: freelance-rate Decision Recommendation block has 4 sub-sections", () => {
  const engine = getEngine("solopreneur-freelance-rate-calculator");
  assert.ok(engine, "engine must be registered");

  const out = engine.generate({
    annualIncome: "80000",
    expenses: "5000",
    billableHrs: "1200",
    profit: "75000",
  }).join("\n");

  assert.match(out, /🧭 Decision Recommendation/);
  assert.match(out, /🧭 Decision Question:/);
  assert.match(out, /🧭 Recommendation:/);
  assert.match(out, /🧭 Key Uncertainty:/);
  assert.match(out, /🧭 Next Action:/);

  for (const marker of ["Decision Question:", "Recommendation:", "Key Uncertainty:", "Next Action:"]) {
    const rx = new RegExp(`🧭 ${marker}([^\\n]{50,})`);
    assert.match(out, rx, `${marker} must have ≥50 chars of substantive content`);
  }

  assert.match(out, /\[[\w\s-]+ Calculator\]/);
});
```

- [ ] **Step 2: Run test to verify it fails (red)**

```powershell
cd d:\E\独立站\ForgeFlowKit
node --import tsx --test tests/exp-p151-l5-freelance-rate.test.ts
```

Expected: FAIL

- [ ] **Step 3: Add L5 block to engine.generate()**

In `src/engines/freelance/freelance-rate-calculator.ts`, append to `generate(inputs)` return array:

```typescript
      '\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🧭 Decision Question: 单纯看 hourly rate 是陷阱，**核心问题是"rate 是否匹配 experience + niche + 区域市场价 + 模式选择 (hourly vs project)"**。Market rate 偏离 25% 以上都要重新审视。\n• 🧭 Recommendation: (1) **rate < 市场 25 百分位** → 低于市场价（疑经验不足 或 在低价抢单，长期伤害 brand）；(2) **25-75 百分位** → 合理区间（适合大多数 freelancer）；(3) **> 75 百分位** → 需强 portfolio / niche 支撑（否则 client 会 churn）；(4) **> 95 百分位** → 顶级 expert，需限定 niche + referral-only。\n• 🧭 Key Uncertainty: (1) 市场 rate 按地区/行业差异 2-5x（同 title 跨 region 完全不同）；(2) hourly vs project mode 选择（project mode 隐藏 scope creep）；(3) client 议价能力（大客户 vs 长尾小客户）；(4) upsell 加价空间（retainer vs one-off）。\n• 🧭 Next Action: (a) 跑 [Project Profitability Calculator] 看项目级 margin；(b) 跑 [Hourly vs Fixed Calculator] 选计费模式（决定 risk 分配）；(c) 跑 [Course Pricing Calculator] 看 IP 化空间（突破 rate 上限）；(d) 决策前 benchmark 3-5 个 peer 的真实接单率。',
```

- [ ] **Step 4: Add L5 block to clientConfig.customFn**

Append L5 string to customFn's `return [...]` array. Use literal `\n` and `\u{1F9ED}` for 🧭 inside the JS string, OR keep 🧭 literal if the surrounding customFn template uses backticks. The new element contains the same 4-section content from Step 3.

- [ ] **Step 5: Add L5 block to staticExamples[0]**

Append `\n\n🧭 Decision Recommendation\n...` (with literal `\n` newlines in the JS string) to the existing static example string. The new content is the same 4-section block from Step 3.

- [ ] **Step 6: Run test (green)**

```powershell
cd d:\E\独立站\ForgeFlowKit
node --import tsx --test tests/exp-p151-l5-freelance-rate.test.ts
```

Expected: PASS

- [ ] **Step 7: Run existing engine test**

```powershell
cd d:\E\独立站\ForgeFlowKit
node --import tsx --test tests/freelance-rate-calculator.test.ts
```

Expected: PASS

- [ ] **Step 8: Run typecheck**

```powershell
cd d:\E\独立站\ForgeFlowKit
pnpm typecheck
```

Expected: 0 errors

- [ ] **Step 9: Commit**

```powershell
cd d:\E\独立站\ForgeFlowKit
git add src/engines/freelance/freelance-rate-calculator.ts tests/exp-p151-l5-freelance-rate.test.ts
git commit -m "feat(l5): freelance/freelance-rate add Decision Recommendation 4-section block"
```

---

## Task 4: operations/stockout-cost-calculator L5 block

**Files:**
- Modify: `src/engines/operations/stockout-cost-calculator.ts` (3 places)
- Create: `tests/exp-p151-l5-stockout-cost.test.ts`

**Interfaces:**
- Consumes: slug `solopreneur-stockout-cost-calculator`

- [ ] **Step 1: Write the failing test**

Create `tests/exp-p151-l5-stockout-cost.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import "../src/engines/operations/stockout-cost-calculator";
import { getEngine } from "../src/core/engines/registry";

test("P151 L5: stockout-cost Decision Recommendation block has 4 sub-sections", () => {
  const engine = getEngine("solopreneur-stockout-cost-calculator");
  assert.ok(engine, "engine must be registered");

  const out = engine.generate({
    lostSalesPerDay: "1000",
    avgStockoutDays: "5",
    lostCustomerRate: "30",
    customerLTV: "200",
    annualRevenue: "500000",
    recoveryRate: "90",
  }).join("\n");

  assert.match(out, /🧭 Decision Recommendation/);
  assert.match(out, /🧭 Decision Question:/);
  assert.match(out, /🧭 Recommendation:/);
  assert.match(out, /🧭 Key Uncertainty:/);
  assert.match(out, /🧭 Next Action:/);

  for (const marker of ["Decision Question:", "Recommendation:", "Key Uncertainty:", "Next Action:"]) {
    const rx = new RegExp(`🧭 ${marker}([^\\n]{50,})`);
    assert.match(out, rx, `${marker} must have ≥50 chars of substantive content`);
  }

  assert.match(out, /\[[\w\s-]+ Calculator\]/);
});
```

- [ ] **Step 2: Run test (red)**

```powershell
cd d:\E\独立站\ForgeFlowKit
node --import tsx --test tests/exp-p151-l5-stockout-cost.test.ts
```

Expected: FAIL

- [ ] **Step 3: Add L5 block to engine.generate()**

In `src/engines/operations/stockout-cost-calculator.ts`, append to `generate(inputs)` return array:

```typescript
      '\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🧭 Decision Question: 单纯看 stockout cost 是陷阱，**核心问题是"stockout cost / carrying cost 比值 + 频次"是否支持加 safety stock**。比值 < 1 = 多备货不划算；> 2 = 必须加。\n• 🧭 Recommendation: (1) **stockout cost > 2x carrying cost** → 加 safety stock（保守 20-30% buffer）；(2) **1x-2x** → 维持现状 + 监控 lead time；(3) **< 1x** → 砍库存释放 working capital；(4) **高频发生 (> 3 次/季)** → 重新审 supplier lead time + 找 backup；(5) **高 stockout + 高 carrying** → 库存策略全面 audit（多半是 SKU mix 问题）。\n• 🧭 Key Uncertainty: (1) lost sale ≠ lost customer（LTV 视角，长期客户可能再来）；(2) recovery rate 取决于品类（必需品 80%+、非必需 30-50%）；(3) supplier lead time 在 peak season 实际延长 2-3x；(4) 季节性波动未折现会让 stockout cost 偏离 2x。\n• 🧭 Next Action: (a) 跑 [Inventory Turnover Calculator] 看 turn 健康度；(b) 跑 [Reorder Point Calculator] 设自动化 reorder trigger；(c) 跑 [Supplier Scorecard Calculator] 优化 lead time + reliability；(d) 决策前用上 6 月真实 data 校准 lost sale assumption。',
```

- [ ] **Step 4: Add L5 block to clientConfig.customFn**

Same pattern.

- [ ] **Step 5: Add L5 block to staticExamples[0]**

Append L5 block to existing static example string.

- [ ] **Step 6: Run test (green)**

```powershell
cd d:\E\独立站\ForgeFlowKit
node --import tsx --test tests/exp-p151-l5-stockout-cost.test.ts
```

Expected: PASS

- [ ] **Step 7: Run existing engine test**

```powershell
cd d:\E\独立站\ForgeFlowKit
node --import tsx --test tests/stockout-cost-calculator.test.ts
```

Expected: PASS

- [ ] **Step 8: Run typecheck**

```powershell
cd d:\E\独立站\ForgeFlowKit
pnpm typecheck
```

Expected: 0 errors

- [ ] **Step 9: Commit**

```powershell
cd d:\E\独立站\ForgeFlowKit
git add src/engines/operations/stockout-cost-calculator.ts tests/exp-p151-l5-stockout-cost.test.ts
git commit -m "feat(l5): operations/stockout-cost add Decision Recommendation 4-section block"
```

---

## Task 5: legal-compliance/gdpr-fine-calculator L5 block

**Files:**
- Modify: `src/engines/legal-compliance/gdpr-fine-calculator.ts` (3 places)
- Create: `tests/exp-p151-l5-gdpr-fine.test.ts`

**Interfaces:**
- Consumes: slug `solopreneur-gdpr-fine-calculator`

- [ ] **Step 1: Write the failing test**

Create `tests/exp-p151-l5-gdpr-fine.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import "../src/engines/legal-compliance/gdpr-fine-calculator";
import { getEngine } from "../src/core/engines/registry";

test("P151 L5: gdpr-fine Decision Recommendation block has 4 sub-sections", () => {
  const engine = getEngine("solopreneur-gdpr-fine-calculator");
  assert.ok(engine, "engine must be registered");

  const out = engine.generate({
    annual_revenue_global: "25000000",
    max_fine_pct: "4%",
    violations_per_year: "2",
    industry_risk_multiplier: "SaaS (0.8×)",
  }).join("\n");

  assert.match(out, /🧭 Decision Recommendation/);
  assert.match(out, /🧭 Decision Question:/);
  assert.match(out, /🧭 Recommendation:/);
  assert.match(out, /🧭 Key Uncertainty:/);
  assert.match(out, /🧭 Next Action:/);

  for (const marker of ["Decision Question:", "Recommendation:", "Key Uncertainty:", "Next Action:"]) {
    const rx = new RegExp(`🧭 ${marker}([^\\n]{50,})`);
    assert.match(out, rx, `${marker} must have ≥50 chars of substantive content`);
  }

  assert.match(out, /\[[\w\s-]+ Calculator\]/);
});
```

- [ ] **Step 2: Run test (red)**

```powershell
cd d:\E\独立站\ForgeFlowKit
node --import tsx --test tests/exp-p151-l5-gdpr-fine.test.ts
```

Expected: FAIL

- [ ] **Step 3: Add L5 block to engine.generate()**

In `src/engines/legal-compliance/gdpr-fine-calculator.ts`, append to `generate(inputs)` return array:

```typescript
      '\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🧭 Decision Question: 单纯看 fine % 是陷阱，**核心问题是"annual turnover + 数据规模 + prior violations + mitigation efforts"决定实际罚款 + 是否值得立刻全面合规**。4% 全球营收是上限，实际常在 1-3% 区间。\n• 🧭 Recommendation: (1) **fine > 4% 全球营收** → 必须立刻全面合规（C-level 推动 + 法务介入）；(2) **2-4%** → 高 ROI 投入（合规预算 < fine 期望值）；(3) **< 2%** → minimum viable 合规（DPA + privacy policy + consent banner）；(4) **数据 < 500 人/无跨境** → 标准化模板方案（avoid over-engineering）。\n• 🧭 Key Uncertainty: (1) turnover 阈值是滑动值（不是 4% 上限就罚 4%，看违规严重性 + 配合度）；(2) mitigation efforts 可降 30-50% 罚款（主动报告 vs 被发现差异巨大）；(3) prior violations 会加重（首次 vs 重复）；(4) 跨境数据传输额外风险（Schrems II 单独处罚）。\n• 🧭 Next Action: (a) 跑 [DPA Cost Calculator] 看 supplier 链合规 ROI；(b) 跑 [Consent Revenue Calculator] 看合规 vs 转化率 trade-off；(c) 跑 [DSAR Cost Calculator] 算运营 SOP 成本；(d) 决策前法务 review + 数据流 audit (不只是算法数字)。',
```

- [ ] **Step 4: Add L5 block to clientConfig.customFn**

Same pattern as Tasks 1-4.

- [ ] **Step 5: Add L5 block to staticExamples[0]**

Append L5 block to existing static example string.

- [ ] **Step 6: Run test (green)**

```powershell
cd d:\E\独立站\ForgeFlowKit
node --import tsx --test tests/exp-p151-l5-gdpr-fine.test.ts
```

Expected: PASS

- [ ] **Step 7: Run existing engine test**

```powershell
cd d:\E\独立站\ForgeFlowKit
node --import tsx --test tests/gdpr-fine-calculator.test.ts
```

Expected: PASS

- [ ] **Step 8: Run typecheck**

```powershell
cd d:\E\独立站\ForgeFlowKit
pnpm typecheck
```

Expected: 0 errors

- [ ] **Step 9: Commit**

```powershell
cd d:\E\独立站\ForgeFlowKit
git add src/engines/legal-compliance/gdpr-fine-calculator.ts tests/exp-p151-l5-gdpr-fine.test.ts
git commit -m "feat(l5): legal-compliance/gdpr-fine add Decision Recommendation 4-section block"
```

---

## Task 6: Final verification + merge + ship + memory

**Files:**
- Create: `memory/p151-l5-backfill-batch1-2026-09-01.md`

- [ ] **Step 1: Run full test suite**

```powershell
cd d:\E\独立站\ForgeFlowKit
node --import tsx --test tests/*.test.ts 2>&1 | Select-String -Pattern "^# (tests|pass|fail|skip)|✖|✔" | Select-Object -Last 30
```

Expected: 0 failures across all tests (existing + 5 new exp-p151-l5-*.test.ts files)

- [ ] **Step 2: Run final typecheck**

```powershell
cd d:\E\独立站\ForgeFlowKit
pnpm typecheck
```

Expected: 0 errors

- [ ] **Step 3: View commit log on feature branch**

```powershell
cd d:\E\独立站\ForgeFlowKit
git log master..HEAD --oneline
```

Expected: 5 commits showing 5 `feat(l5):` messages

- [ ] **Step 4: Merge to master with --no-ff**

```powershell
cd d:\E\独立站\ForgeFlowKit
git checkout master
git merge --no-ff feature/p151-l5-backfill-batch1 -m "Merge P151 L5 backfill batch 1 (5 engines, saas-burn-rate template)"
```

Expected: Merge commit created with all 5 feat(l5) commits as parents

- [ ] **Step 5: Push to both remotes**

```powershell
cd d:\E\独立站\ForgeFlowKit
git push origin master
git push github master
```

Expected: Both pushes succeed

- [ ] **Step 6: Delete feature branch**

```powershell
cd d:\E\独立站\ForgeFlowKit
git branch -d feature/p151-l5-backfill-batch1
```

Expected: Branch deleted (warning if not merged is OK since we just merged)

- [ ] **Step 7: Re-run heuristic audit (informational, not gate)**

```powershell
cd d:\E\独立站\ForgeFlowKit
node tmp/audit-decision-support.cjs
```

Note: This audit only scans `engine.insight/result/uses` metadata fields, NOT runtime output. Therefore the 5 engines' audit scores will NOT change. This is the structural blind spot identified in the spot-check report. Batch 2 (deferred) will fix this.

Expected: Audit runs, but the 5 engines remain at score 0/1 in the CSV (informational only).

- [ ] **Step 8: Write memory ship record**

Create `memory/p151-l5-backfill-batch1-2026-09-01.md`:

```markdown
# P151 L5 Backfill Batch 1 — Shipped

**Date**: 2026-09-01
**Branch**: feature/p151-l5-backfill-batch1 (merged to master, deleted)
**Scope**: 5 engines × L5 Decision Recommendation 4-section block
**Method**: TDD per engine (red-green-commit), saas-burn-rate P140f-7 template

## Engines Shipped

| # | Engine | Category | Lines added | Test added |
|---|---|---|---|---|
| 1 | cost/employee-cost-calculator | HR/Finance | ~30 | exp-p151-l5-employee-cost.test.ts |
| 2 | marketing/ltv-by-channel-calculator | Marketing | ~30 | exp-p151-l5-ltv-by-channel.test.ts |
| 3 | freelance/freelance-rate-calculator | Freelance | ~30 | exp-p151-l5-freelance-rate.test.ts |
| 4 | operations/stockout-cost-calculator | E-comm/Ops | ~30 | exp-p151-l5-stockout-cost.test.ts |
| 5 | legal-compliance/gdpr-fine-calculator | Compliance | ~30 | exp-p151-l5-gdpr-fine.test.ts |

All 5 commits on master. Test count: 5 new tests pass. Existing tests: 0
regressions. typecheck: 0 errors.

## Template (canonical, reusable for batch 2)

Each engine's `generate()` runtime output now ends with:

```
\n\n🧭 Decision Recommendation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 🧭 Decision Question: <核心二元决策问题>
• 🧭 Recommendation: <2-4 档分桶建议>
• 🧭 Key Uncertainty: <2-3 个 caveat>
• 🧭 Next Action: <3-4 个动作 + [cross-link to engine]>
```

Mirrored in `clientConfig.customFn` (client-side live parity) and
`staticExamples[0]` (first-render parity).

## Audit status (informational)

`tmp/audit-decision-support.cjs` audit unchanged — the audit scans
`engine.insight/result/uses` metadata fields (which all 5 engines still
don't have) rather than runtime output. This is the structural blind spot
identified in the spot-check report. The 5 engines now have full L5 in
runtime output, but the audit cannot see it. **Real L5 coverage post-batch1:
~9 engines / 116 = ~8%** (saas-burn-rate + 5 new = 6 score-4 if audit
were runtime-aware).

## Constitutional impact

`AGENTS.md` Dimension 1: "每个 calc = 帮用户决策，不是输出数字"
Pre-batch1: 0 engines at 4/4 (full L5) per audit = 0%
Post-batch1 (runtime reality): 6 engines (saas-burn-rate + 5 new) = 5.2%
of 116

## Follow-ups (deferred to batch 2)

- Fix audit heuristic to scan runtime output (not just metadata fields)
- Apply L5 template to next 5-10 score-0 engines
- LLM-based reclassification of 30 score-1 engines
- Bulk fill remaining 76 score-0 engines
```

- [ ] **Step 9: Commit memory doc + final verify**

```powershell
cd d:\E\独立站\ForgeFlowKit
git add memory/p151-l5-backfill-batch1-2026-09-01.md
git commit -m "docs(memory): P151 L5 backfill batch 1 ship record"
git log --oneline -10
```

Expected: Memory doc committed. Last 10 commits show: 5× feat(l5), merge commit, memory doc.

---

## Acceptance Criteria

| Criterion | How verified |
|---|---|
| 5 engines ship with L5 in `generate()` runtime | 5 exp-p151-l5-*.test.ts pass |
| 5 engines mirror L5 in customFn | existing engine tests pass (exercises client logic) |
| 5 engines mirror L5 in staticExamples | static render visual parity (manual) |
| typecheck clean | pnpm typecheck = 0 errors |
| All 5 commits on master | git log shows 5 feat(l5) commits |
| Memory record committed | memory/p151-l5-backfill-batch1-2026-09-01.md exists |
| Branch deleted | git branch shows no feature/p151-l5-backfill-batch1 |
| Both remotes pushed | git log origin/master and github/master match |

## Risks

- **Sandbox file-locking during multi-engine writes**: if a previous engine's
  write fails, kill node.exe (`taskkill /F /IM node.exe`) and retry
- **customFn JavaScript syntax errors**: if the multi-line string breaks,
  run `node --import tsx --test tests/<engine>-calculator.test.ts` to catch
- **PowerShell multi-line content**: use `[System.Text.Encoding]::UTF8::GetBytes(@'...'@)` for any multi-line string with special chars