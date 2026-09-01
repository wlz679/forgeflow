# P151 L5 Backfill Batch 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> to implement this plan task-by-task. Steps use use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add L5 Decision Recommendation 4-section block to 5 more score-0 engines across 5 fresh categories. Push v2.0 Dimension 1 runtime coverage from ~5.2% → ~9.5%.

**Architecture:** Same as batch1. Per-engine TDD: red → implement (calculate/customFn/staticExamples) → green → existing test → typecheck → commit. 1 commit per engine, 1 branch, 1 merge.

**Tech Stack:** TypeScript + Astro 4 + node:test + @astrojs/cloudflare. Engines self-register on file import via `registerEngine(engine)`.

## Global Constraints

- **Branch**: `feature/p151-l5-backfill-batch2` (1 branch, 5 commits, 1 merge to master)
- **PowerShell**: Use `;` not `&&`. Use byte-exact anchors (literal `\u2192` not rendered `→`) for `customFn` lines.
- **Per-engine commit (5 total)**: `feat(l5): <category>/<engine-slug> add Decision Recommendation 4-section block`
- **Per-engine test**: `tests/exp-p151-l5-<engine-slug>.test.ts` (node:test + node --import tsx)
- **Test pattern**: Import engine file (triggers `registerEngine`) + import `getEngine` from `../src/core/engines/registry`. Fetch engine by slug `solopreneur-<engine-name>-calculator`. Call `engine.generate(inputs)`. Assert 4 L5 markers present + ≥50 chars substance + at least ≥ `[Xxx Calculator]` cross-link.
- **L5 template (canonical)**: Append `\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🧭 Decision Question: ...\n• 🧭 Recommendation: ...\n• 🧭 Key Uncertainty: ...\n• 🧭 Next Action: ...` to existing runtime output.
- **3 places to mirror per engine**:
  1. `engine.generate(inputs)` — append to returned array / string
  2. `engine.clientConfig.customFn` — push string element to return array / append to string
  3. `engine.staticExamples[0]` — append `\n\n🧭 Decision Recommendation\n...` block
- **Per-engine verification (before commit)**:
  ```powershell
  node --import tsx --test tests/exp-p151-l5-<engine>.test.ts        # new test
  node --import tsx --test tests/<engine>-calculator.test.ts          # existing test
  npx tsc --noEmit 2>&1 | Select-String "<engine-slug>"                # 0 new errors
  ```
- **Out of scope**: FAQ, HowToUse, description, inputs, audit heuristic fix, remaining 71 score-0 engines.

---

## Task 0: Branch setup

- [ ] **Step 1: Verify on master, create branch**

```powershell
cd d:\E\独立站\ForgeFlowKit
git checkout master
git pull origin master 2>$null
git pull github master 2>$null
git checkout -b feature/p151-l5-backfill-batch2
git branch --show-current
```

Expected: "feature/p151-l5-backfill-batch2"

---

## Task 1: ai-cost/gpu-cloud-cost-calculator L5

**Files:**
- Modify: `src/engines/ai-cost/gpu-cloud-cost-calculator.ts` (3 places)
- Create: `tests/exp-p151-l5-gpu-cloud-cost.test.ts`

**Interfaces:**
- Slug: `solopreneur-gpu-cloud-cost-calculator`
- Inputs: `provider`, `gpuType`, `gpuCount`, `hoursPerDay`, `pricingTier`, `includeStorage`

- [ ] **Step 1: Write failing test**

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import "../src/engines/ai-cost/gpu-cloud-cost-calculator";
import { getEngine } from "../src/core/engines/registry";

test("P151 L5: gpu-cloud-cost Decision Recommendation block has 4 sub-sections", () => {
  const engine = getEngine("solopreneur-gpu-cloud-cost-calculator");
  assert.ok(engine, "engine must be registered");

  const out = engine.generate({
    provider: "runpod",
    gpuType: "A100",
    gpuCount: "4",
    hoursPerDay: "8",
    pricingTier: "on-demand",
    includeStorage: "yes",
  }).join("\n");

  assert.match(out, /🧭 Decision Recommendation/);
  assert.match(out, /🧭 Decision Question:/);
  assert.match(out, /🧭 Recommendation:/);
  assert.match(out, /🧭 Key Uncertainty:/);
  assert.match(out, /🧭 Next Action:/);

  for (const marker of ["Decision Question:", "Recommendation:", "Key Uncertainty:", "Next Action:"]) {
    const regex = new RegExp(`🧭 ${marker}([^\\n]{50,})`);
    assert.match(out, regex, `${marker} must have ≥50 chars of substantive content`);
  }

  assert.match(out, /\[[\w\s-]+ Calculator\]/);
});
```

- [ ] **Step 2: Run test (red)**

```powershell
cd d:\E\独立站\ForgeFlowKit
node --import tsx --test tests/exp-p151-l5-gpu-cloud-cost.test.ts
```

Expected: FAIL — no match for L5 markers

- [ ] **Step 3: Add L5 to engine.generate()**

Find `calculate()` or `generate()` in `src/engines/ai-cost/gpu-cloud-cost-calculator.ts`. Add L5 string element/push before `return [...]` or `return [r]`. Use literal `\n` separators and direct emoji `🧭`.

L5 content (4 sub-sections):

```typescript
      '\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '• 🧭 Decision Question: 单纯看 GPU hourly rate 是陷阱，**核心问题是"实际 workload cost / 月 + idle time 浪费率 + vendor lock-in 风险"**。最便宜 ≠ 最划算。\n' +
      '• 🧭 Recommendation: (1) **rate < 中位数 30%** → 警惕 hidden cost（data egress / API gateway fee / 抢占 spot 不可靠）；(2) **中位数 ±20%** → 安全选型；(3) **> 中位数 30%** → 仅在 SLA / 合规硬性要求时付溢价；(4) **多 vendor 分散** → 降低 lock-in 但增加 ops 复杂度。\n' +
      '• 🧭 Key Uncertainty: (1) 不同 vendor pricing model 不一样（per-second vs per-hour vs reserved）；(2) GPU 类型差异大（A100 vs H100 vs L40S 不可比）；(3) data egress fee 可能吞掉 savings；(4) spot preempt 频率影响 production workload。\n' +
      '• 🧭 Next Action: (a) 跑 [OpenAI Token Calculator] 看 API vs 自托管 cost 对比；(b) 跑 [AI Training Cost Estimator] 看训练全周期 cost；(c) 跑 [Claude API Cost Calculator] 看主力模型成本曲线；(d) 决策前做 30 天 proof-of-concept 验证 vendor SLA。'
```

- [ ] **Step 4: Add L5 to clientConfig.customFn**

Find `customFn` (template literal or string concat). Insert L5 push/append before final `return [...];`. Use `\uD83E\uDDED` for 🧭 inside the JS string, or keep literal emoji if customFn uses backticks.

- [ ] **Step 5: Add L5 to staticExamples[0]**

Append `\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🧭 Decision Question: ...\n• 🧭 Recommendation: ...\n• 🧭 Key Uncertainty: ...\n• 🧭 Next Action: ...` to staticExamples[0] (literal `\n` newlines in JS string).

- [ ] **Step 6: Run test (green)**

```powershell
cd d:\E\独立站\ForgeFlowKit
node --import tsx --test tests/exp-p151-l5-gpu-cloud-cost.test.ts
```

Expected: PASS

- [ ] **Step 7: Existing test**

```powershell
cd d:\E\独立站\ForgeFlowKit
node --import tsx --test tests/gpu-cloud-cost-calculator.test.ts
```

Expected: PASS

- [ ] **Step 8: typecheck (filter)**

```powershell
cd d:\E\独立站\ForgeFlowKit
npx tsc --noEmit 2>&1 | Select-String "gpu-cloud-cost|exp-p151-l5-gpu" | Select-Object -First 5
```

Expected: empty (no new errors)

- [ ] **Step 9: Commit**

```powershell
cd d:\E\独立站\ForgeFlowKit
git add src/engines/ai-cost/gpu-cloud-cost-calculator.ts tests/exp-p151-l5-gpu-cloud-cost.test.ts
git commit -m "feat(l5): ai-cost/gpu-cloud-cost add Decision Recommendation 4-section block"
```

---

## Task 2: customer-support/csat-calculator L5

**Files:**
- Modify: `src/engines/customer-support/csat-calculator.ts` (3 places)
- Create: `tests/exp-p151-l5-csat.test.ts`

**Interfaces:**
- Slug: `solopreneur-csat-calculator`
- Inputs: `csat_pct`, `response_rate`, `sample_size`, `target_csat`

- [ ] **Step 1: Test file**

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import "../src/engines/customer-support/csat-calculator";
import { getEngine } from "../src/core/engines/registry";

test("P151 L5: csat Decision Recommendation block has 4 sub-sections", () => {
  const engine = getEngine("solopreneur-csat-calculator");
  assert.ok(engine, "engine must be registered");

  const out = engine.generate({
    csat_pct: "72",
    response_rate: "40",
    sample_size: "500",
    target_csat: "85",
  }).join("\n");

  assert.match(out, /🧭 Decision Recommendation/);
  assert.match(out, /🧭 Decision Question:/);
  assert.match(out, /🧭 Recommendation:/);
  assert.match(out, /🧭 Key Uncertainty:/);
  assert.match(out, /🧭 Next Action:/);

  for (const marker of ["Decision Question:", "Recommendation:", "Key Uncertainty:", "Next Action:"]) {
    const regex = new RegExp(`🧭 ${marker}([^\\n]{50,})`);
    assert.match(out, regex, `${marker} must have ≥50 chars of substantive content`);
  }

  assert.match(out, /\[[\w\s-]+ Calculator\]/);
});
```

- [ ] **Step 2: Red**

```powershell
cd d:\E\独立站\ForgeFlowKit
node --import tsx --test tests/exp-p151-l5-csat.test.ts
```

Expected: FAIL

- [ ] **Step 3: Add L5 to generate()**

Same pattern as Task 1. L5 content:

```typescript
      '\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '• 🧭 Decision Question: 单纯看 CSAT score 是陷阱，**核心问题是"score 是否反映真实问题 + response rate + 客户分群"**。单一 score 误导（顶级客户低分 vs 低价值客户高分）。\n' +
      '• 🧭 Recommendation: (1) **CSAT < 60%** → 系统性问题，立即 audit top 3 痛点（FAQ / 流程 / 产品）；(2) **60-75%** → 优化 contact reason 流程 + agent training；(3) **75-85%** → 维护 + 监控 cohort 漂移；(4) **> 85%** → 扩张投入 brand / referral。\n' +
      '• 🧭 Key Uncertainty: (1) response rate 影响 score 分布（只 10% 客户响应会 bias）；(2) 不同 segment 期望值不同（enterprise > SMB）；(3) 季节性波动（holiday season 自然低）；(4) channel 差异（chat vs email CSAT 不可比）。\n' +
      '• 🧭 Next Action: (a) 跑 [First Response Time Calculator] 看响应延迟影响；(b) 跑 [Resolution Time Calculator] 看解决时长；(c) 跑 [Support Capacity Planning Calculator] 看 staffing 瓶颈；(d) 决策前 segment 客户分群对比 CSAT。'
```

- [ ] **Step 4: Add L5 to customFn**

Same pattern.

- [ ] **Step 5: Add L5 to staticExamples[0]**

Same pattern.

- [ ] **Step 6: Test (green)**

```powershell
cd d:\E\独立站\ForgeFlowKit
node --import tsx --test tests/exp-p151-l5-csat.test.ts
```

Expected: PASS

- [ ] **Step 7: Existing test**

```powershell
cd d:\E\独立站\ForgeFlowKit
node --import tsx --test tests/csat-calculator.test.ts
```

Expected: PASS

- [ ] **Step 8: typecheck**

```powershell
cd d:\E\独立站\ForgeFlowKit
npx tsc --noEmit 2>&1 | Select-String "csat-calculator|exp-p151-l5-csat" | Select-Object -First 5
```

Expected: empty

- [ ] **Step 9: Commit**

```powershell
cd d:\E\独立站\ForgeFlowKit
git add src/engines/customer-support/csat-calculator.ts tests/exp-p151-l5-csat.test.ts
git commit -m "feat(l5): customer-support/csat add Decision Recommendation 4-section block"
```

---

## Task 3: hiring-team/comp-banding-calculator L5

**Files:**
- Modify: `src/engines/hiring-team/comp-banding-calculator.ts` (3 places)
- Create: `tests/exp-p151-l5-comp-banding.test.ts`

**Interfaces:**
- Slug: `solopreneur-comp-banding-calculator`
- Inputs: `role_title`, `base_salary`, `market_p25`, `market_p50`, `market_p75`

- [ ] **Step 1: Test file**

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import "../src/engines/hiring-team/comp-banding-calculator";
import { getEngine } from "../src/core/engines/registry";

test("P151 L5: comp-banding Decision Recommendation block has 4 sub-sections", () => {
  const engine = getEngine("solopreneur-comp-banding-calculator");
  assert.ok(engine, "engine must be registered");

  const out = engine.generate({
    role_title: "Senior Engineer",
    base_salary: "150000",
    market_p25: "120000",
    market_p50: "150000",
    market_p75: "180000",
  }).join("\n");

  assert.match(out, /🧭 Decision Recommendation/);
  assert.match(out, /🧭 Decision Question:/);
  assert.match(out, /🧭 Recommendation:/);
  assert.match(out, /🧭 Key Uncertainty:/);
  assert.match(out, /🧭 Next Action:/);

  for (const marker of ["Decision Question:", "Recommendation:", "Key Uncertainty:", "Next Action:"]) {
    const regex = new RegExp(`🧭 ${marker}([^\\n]{50,})`);
    assert.match(out, regex, `${marker} must have ≥50 chars of substantive content`);
  }

  assert.match(out, /\[[\w\s-]+ Calculator\]/);
});
```

- [ ] **Step 2: Red**

```powershell
cd d:\E\独立站\ForgeFlowKit
node --import tsx --test tests/exp-p151-l5-comp-banding.test.ts
```

Expected: FAIL

- [ ] **Step 3: Add L5 to generate()**

L5 content:

```typescript
      '\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '• 🧭 Decision Question: 单纯看 band midpoint 是陷阱，**核心问题是"候选人 market rate + 当前团队 equity + competitor 同岗位 pay + offer 速度 trade-off"**。top of band 可能意味着 hire 太晚。\n' +
      '• 🧭 Recommendation: (1) **offer < band 25 百分位** → 极可能 lose candidate（除非强 equity/使命）；(2) **25-75 百分位** → 合理区间（适合大多数情况）；(3) **> 75 百分位** → 仅在 critical hire / replacement > 6 月时；(4) **> 95 百分位** → 重新评估 role 必要性或拆分。\n' +
      '• 🧭 Key Uncertainty: (1) band 是 annualized base 不含 equity / bonus（total comp 可能 30-50% 高出）；(2) 不同 region 不可比（NYC senior ≠ Bangalore senior）；(3) competitor raise 数据滞后 6-12 月；(4) counter-offer 时机影响 retention。\n' +
      '• 🧭 Next Action: (a) 跑 [Attrition Cost Calculator] 看 replacement 成本；(b) 跑 [Productivity Ramp Curve Calculator] 看 ramp 时间 ROI；(c) 跑 [Fully Loaded Employee Cost Calculator] 看全负荷 cost；(d) 决策前 verify 候选人 other competing offers。'
```

- [ ] **Steps 4-9**: Same pattern (customFn mirror, staticExamples mirror, test green, existing test, typecheck, commit)

```powershell
cd d:\E\独立站\ForgeFlowKit
git add src/engines/hiring-team/comp-banding-calculator.ts tests/exp-p151-l5-comp-banding.test.ts
git commit -m "feat(l5): hiring-team/comp-banding add Decision Recommendation 4-section block"
```

---

## Task 4: knowledge/kb-coverage-rate-calculator L5

**Files:**
- Modify: `src/engines/knowledge/kb-coverage-rate-calculator.ts` (3 places)
- Create: `tests/exp-p151-l5-kb-coverage-rate.test.ts`

**Interfaces:**
- Slug: `solopreneur-kb-coverage-rate-calculator`
- Inputs: `monthly_tickets`, `tickets_with_kb_match`, `total_articles`, `industry_benchmark`

- [ ] **Step 1: Test file**

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import "../src/engines/knowledge/kb-coverage-rate-calculator";
import { getEngine } from "../src/core/engines/registry";

test("P151 L5: kb-coverage-rate Decision Recommendation block has 4 sub-sections", () => {
  const engine = getEngine("solopreneur-kb-coverage-rate-calculator");
  assert.ok(engine, "engine must be registered");

  const out = engine.generate({
    monthly_tickets: "1000",
    tickets_with_kb_match: "450",
    total_articles: "100",
    industry_benchmark: "60",
  }).join("\n");

  assert.match(out, /🧭 Decision Recommendation/);
  assert.match(out, /🧭 Decision Question:/);
  assert.match(out, /🧭 Recommendation:/);
  assert.match(out, /🧭 Key Uncertainty:/);
  assert.match(out, /🧭 Next Action:/);

  for (const marker of ["Decision Question:", "Recommendation:", "Key Uncertainty:", "Next Action:"]) {
    const regex = new RegExp(`🧭 ${marker}([^\\n]{50,})`);
    assert.match(out, regex, `${marker} must have ≥50 chars of substantive content`);
  }

  assert.match(out, /\[[\w\s-]+ Calculator\]/);
});
```

- [ ] **Step 2: Red**

```powershell
cd d:\E\独立站\ForgeFlowKit
node --import tsx --test tests/exp-p151-l5-kb-coverage-rate.test.ts
```

Expected: FAIL

- [ ] **Step 3: Add L5 to generate()**

L5 content:

```typescript
      '\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '• 🧭 Decision Question: 单纯看 coverage % 是陷阱，**核心问题是"coverage 是否覆盖 top 20% ticket topics + 内容新鲜度 + 搜索可发现性"**。50% coverage 在错误 topic 上 = 0 实际 deflection。\n' +
      '• 🧭 Recommendation: (1) **coverage < 30% + top topics 缺失** → 立即 audit ticket data + 写 top 10 articles；(2) **30-60% + 内容陈旧** → 重写 top 20 articles；(3) **60-80%** → 优化 search + cross-link；(4) **> 80%** → 专注 deflection quality 而非 coverage 数字。\n' +
      '• 🧭 Key Uncertainty: (1) coverage 按 ticket volume vs article count 算差异巨大；(2) 文章发布 ≠ article 可发现（搜索 ranking 也很关键）；(3) 行业更新使旧文章快速过时；(4) 长尾 topics 永远不值得补（专注 top 80%）。\n' +
      '• 🧭 Next Action: (a) 跑 [Search Effectiveness Calculator] 看 findability；(b) 跑 [Article Freshness Calculator] 看文章新鲜度；(c) 跑 [Deflection Quality Calculator] 看实际 deflection 效果；(d) 决策前先 analyze ticket volume 排序 top topics。'
```

- [ ] **Steps 4-9**: Same pattern.

```powershell
cd d:\E\独立站\ForgeFlowKit
git add src/engines/knowledge/kb-coverage-rate-calculator.ts tests/exp-p151-l5-kb-coverage-rate.test.ts
git commit -m "feat(l5): knowledge/kb-coverage-rate add Decision Recommendation 4-section block"
```

---

## Task 5: real-estate/rent-vs-buy-calculator L5

**Files:**
- Modify: `src/engines/real-estate/rent-vs-buy-calculator.ts` (3 places)
- Create: `tests/exp-p151-l5-rent-vs-buy.test.ts`

**Interfaces:**
- Slug: `solopreneur-rent-vs-buy-calculator`
- Inputs: `monthlyRent`, `homePrice`, `downPayment`, `mortgageRate`, `yearsToStay`, `annualAppreciation`, `annualRentIncrease`

- [ ] **Step 1: Test file**

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import "../src/engines/real-estate/rent-vs-buy-calculator";
import { getEngine } from "../src/core/engines/registry";

test("P151 L5: rent-vs-buy Decision Recommendation block has 4 sub-sections", () => {
  const engine = getEngine("solopreneur-rent-vs-buy-calculator");
  assert.ok(engine, "engine must be registered");

  const out = engine.generate({
    monthlyRent: "2000",
    homePrice: "400000",
    downPayment: "80000",
    mortgageRate: "7",
    yearsToStay: "10",
    annualAppreciation: "3",
    annualRentIncrease: "2",
  }).join("\n");

  assert.match(out, /🧭 Decision Recommendation/);
  assert.match(out, /🧭 Decision Question:/);
  assert.match(out, /🧭 Recommendation:/);
  assert.match(out, /🧭 Key Uncertainty:/);
  assert.match(out, /🧭 Next Action:/);

  for (const marker of ["Decision Question:", "Recommendation:", "Key Uncertainty:", "Next Action:"]) {
    const regex = new RegExp(`🧭 ${marker}([^\\n]{50,})`);
    assert.match(out, regex, `${marker} must have ≥50 chars of substantive content`);
  }

  assert.match(out, /\[[\w\s-]+ Calculator\]/);
});
```

- [ ] **Step 2: Red**

```powershell
cd d:\E\独立站\ForgeFlowKit
node --import tsx --test tests/exp-p151-l5-rent-vs-buy.test.ts
```

Expected: FAIL

- [ ] **Step 3: Add L5 to generate()**

L5 content:

```typescript
      '\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '• 🧭 Decision Question: 单纯看 monthly payment 是陷阱，**核心问题是"持有期 horizon + 市场 appreciation 预期 + 流动性需求 + 隐性成本（维修 / tax / insurance / opportunity）"**。租 vs 买在不同 horizon 下答案完全不同。\n' +
      '• 🧭 Recommendation: (1) **horizon < 3 年** → 租（closing cost + 市场风险吞掉所有 upside）；(2) **3-7 年** → 看市场 appreciation rate vs rent inflation；(3) **7-15 年** → 多数情况买更划算（principal paydown + appreciation）；(4) **> 15 年** → 买 + leverage 是 wealth 工具（前提 stable market）。\n' +
      '• 🧭 Key Uncertainty: (1) appreciation 是平均数 ≠ 你的房子（neighborhood / school / job market）；(2) 维护 + tax + insurance = 房价 1-3% / 年隐性成本；(3) leverage 是双刃剑（2008 教训）；(4) 流动性差（6-12 月卖出）。\n' +
      '• 🧭 Next Action: (a) 跑 [Mortgage Calculator] 看真实月供；(b) 跑 [Cap Rate Calculator] 看 cap rate 对比 rent yield；(c) 跑 [DSCR Calculator] 看 rental 现金流（如果 buy-to-rent）；(d) 决策前 stress test "如果价格跌 30% 我能 hold 吗？"。'
```

- [ ] **Steps 4-9**: Same pattern.

```powershell
cd d:\E\独立站\ForgeFlowKit
git add src/engines/real-estate/rent-vs-buy-calculator.ts tests/exp-p151-l5-rent-vs-buy.test.ts
git commit -m "feat(l5): real-estate/rent-vs-buy add Decision Recommendation 4-section block"
```

---

## Task 6: Final verification + merge + ship + memory

- [ ] **Step 1: Full test suite (filter)**

```powershell
cd d:\E\独立站\ForgeFlowKit
$files = Get-ChildItem tests/exp-p151-l5-*.test.ts | Select-Object -ExpandProperty FullName
node --import tsx --test $files 2>&1 | Select-String -Pattern "^# (tests|pass|fail)"
```

Expected: 10 tests pass (5 from batch1 + 5 from batch2), 0 fail

- [ ] **Step 2: typecheck filtered**

```powershell
cd d:\E\独立站\ForgeFlowKit
npx tsc --noEmit 2>&1 | Select-String -Pattern "src/engines/(ai-cost/gpu-cloud|customer-support/csat|hiring-team/comp-banding|knowledge/kb-coverage-rate|real-estate/rent-vs-buy)|exp-p151-l5-(gpu|csat|comp-banding|kb-coverage|rent-vs-buy)" | Select-Object -First 5
```

Expected: empty

- [ ] **Step 3: Commit log**

```powershell
cd d:\E\独立站\ForgeFlowKit
git log master..HEAD --oneline
```

Expected: 5 commits with `feat(l5):` messages

- [ ] **Step 4: Merge to master with --no-ff**

```powershell
cd d:\E\独立站\ForgeFlowKit
git checkout master
git merge --no-ff feature/p151-l5-backfill-batch2 -m "Merge P151 L5 backfill batch 2 (5 fresh-category engines)"
```

- [ ] **Step 5: Push to both remotes**

```powershell
cd d:\E\独立站\ForgeFlowKit
git push origin master
git push github master
```

- [ ] **Step 6: Delete feature branch**

```powershell
cd d:\E\独立站\ForgeFlowKit
git branch -d feature/p151-l5-backfill-batch2
```

- [ ] **Step 7: Write memory ship record**

Create `memory/p151-l5-backfill-batch2-2026-09-01.md`:

```markdown
# P151 L5 Backfill Batch 2 — Shipped

**Date**: 2026-09-01
**Branch**: feature/p151-l5-backfill-batch2 (merged to master, deleted)
**Scope**: 5 engines × L5 Decision Recommendation 4-section block (5 fresh categories)
**Method**: TDD per engine, saas-burn-rate P140f-7 template (proven in batch 1)

## Engines Shipped

| # | Engine | Category | Commit |
|---|---|---|---|
| 1 | ai-cost/gpu-cloud-cost-calculator | AI/Infra | (TBD) |
| 2 | customer-support/csat-calculator | Support | (TBD) |
| 3 | hiring-team/comp-banding-calculator | HR | (TBD) |
| 4 | knowledge/kb-coverage-rate-calculator | Knowledge | (TBD) |
| 5 | real-estate/rent-vs-buy-calculator | Real Estate | (TBD) |

## Coverage

- Pre-batch1: 1 engine at 4/4 (saas-burn-rate) = 0.86% of 116
- Post-batch1: 6 engines = 5.2%
- Post-batch2: 11 engines = 9.5%

## Follow-ups (deferred)

- Fix audit heuristic to scan runtime output (batch 2 audit count still shows 0/4)
- Apply L5 template to next 5-10 score-0 engines (batch 3)
- LLM-based reclassification of 30 score-1 engines
- Bulk fill remaining 65 score-0 engines
```

- [ ] **Step 8: Commit memory doc**

```powershell
cd d:\E\独立站\ForgeFlowKit
git add memory/p151-l5-backfill-batch2-2026-09-01.md
git commit -m "docs(memory): P151 L5 backfill batch 2 ship record"
git push origin master
git push github master
```

---

## Acceptance Criteria

| Criterion | How verified |
|---|---|
| 5 engines ship with L5 | 5 exp-p151-l5-*.test.ts pass |
| Existing tests no regression | tests/*-calculator.test.ts pass (5 engines) |
| typecheck clean | npx tsc --noEmit = 0 new errors |
| 5 commits merged | git log shows 5 feat(l2) commits |
| Memory committed | memory/p151-l5-backfill-batch2-2026-09-01.md exists |
| Branch deleted | git branch shows no feature/p151-l5-backfill-batch2 |
| Both remotes pushed | git log origin/master and github/master match |

## Risks

- Sandbox file-locking: `taskkill /F /IM node.exe` if needed
- PowerShell multi-line content with special chars: use byte-exact anchors
- Engine variations: `let r` vs `results.push` — observe during T1 and replicate pattern