# P151 Dimension 1 Phase 2: L5 Backfill Batch 1 Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Add saas-burn-rate-style L5 Decision Recommendation 4-section block
to 5 score-0 engines across 5 categories (cost / marketing / freelance /
operations / legal-compliance). Validate template reusability + push v2.0
Dimension 1 coverage from ~0% → ~4%.

**Architecture:** Each engine's `calculate()` runtime output gets an
appended ~30-line L5 block (4 sub-sections: Decision Question / Recommendation
/ Key Uncertainty / Next Action). Mirrored in `customFn` for client-side live
parity. New per-engine test asserts block presence + content substance.

**Tech Stack:** TypeScript + Astro 4 + node:test + @astrojs/cloudflare.
Existing patterns: P140f-7 (saas-burn-rate ship, 2026-07 era).

**Prior work:**
- P151 Dimension 1 audit (2026-09-01) — [spec](2026-09-01-p151-dimension-1-audit-design.md) + [plan](2026-09-01-p151-dimension-1-audit.md) + [report](../../../memory/p151-dimension-1-audit-report.md) + [spot-check](../../../memory/p151-dimension-1-spotcheck-2026-09-01.md)
- saas-burn-rate-calculator.ts:187-192 — the L5 template pioneer

---

## 1. Scope

### In Scope

- 5 engines × ~30-line L5 block in `calculate()` runtime output
- 5 engines × `customFn` mirror (client-side live parity)
- 5 new test files (`tests/exp-p151-l5-<engine>.test.ts`)
- Re-run `tmp/audit-decision-support.cjs` post-ship (informational, not gate)
- `memory/p151-l5-backfill-batch1-2026-09-01.md` ship record

### Out of Scope

- FAQ / HowToUse / description / inputs (keep surface minimal)
- LLM-based audit reclassification (deferred to batch 2)
- Bulk fill of remaining 76 score-0 engines (deferred)
- Custom `engine.insight/result/uses` metadata fields (audit
  structural blind spot, not solved here)

### Branch

`feature/p151-l5-backfill-batch1` (single branch, 5 commits, 1 merge)

---

## 2. Target Engines

| # | Slug | Path | Category | Why picked |
|---|---|---|---|---|
| 1 | cost-employee-cost-calculator | src/engines/cost/employee-cost-calculator.ts | HR/Finance | High-frequency (every hire) |
| 2 | marketing-ltv-by-channel-calculator | src/engines/marketing/ltv-by-channel-calculator.ts | Marketing | LTV/CAC headline SaaS metric |
| 3 | freelance-freelance-rate-calculator | src/engines/freelance/freelance-rate-calculator.ts | Freelance | Audience match (独立站) |
| 4 | operations-stockout-cost-calculator | src/engines/operations/stockout-cost-calculator.ts | E-comm/Ops | Inventory tradeoff |
| 5 | legal-compliance-gdpr-fine-calculator | src/engines/legal-compliance/gdpr-fine-calculator.ts | Compliance | Irreversible fine risk |

All 5 are score-0 per P151 audit (no L5 anywhere). All 5 have existing
test files. All 5 are in different categories (cross-category coverage
validation).

---

## 3. L5 Template (canonical, from saas-burn-rate P140f-7)

### Structure

```typescript
// Append BEFORE `return [result];` in calculate()
result += "\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
result += "\n• 🧭 Decision Question: <核心二元决策问题，引用具体变量名>";
result += "\n• 🧭 Recommendation: <2-4 档分桶建议，每档 1 行 + 阈值>";
result += "\n• 🧭 Key Uncertainty: <2-3 个常见误用场景 + caveat>";
result += "\n• 🧭 Next Action: <3-4 个动作 + [cross-link to 其他 engine]>";
```

### customFn mirror (per saas-burn-rate line 217)

Append the SAME block using template literal syntax (escaped newlines
`\n`, emoji as unicode escapes or kept literal):

```javascript
r += `\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🧭 Decision Question: ...`;
```

### staticExample mirror (in engine.staticExamples[0])

Must also include the L5 block for first-render parity. Update the
sample output string to include the new section.

---

## 4. Per-Engine Content

### 4.1 cost/employee-cost-calculator

```typescript
result += "\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
result += "\n• 🧭 Decision Question: 单纯看 base salary 是陷阱，**核心问题是\"完全负荷成本 / 月产出\" 是否低于市场价 + 该不该为 ramp time 买单**。cost ratio (fully-loaded / base) > 3x 说明有 hidden cost 漏算。";
result += "\n• 🧭 Recommendation: (1) **cost ratio > 3x** → 必有 hidden cost 漏算（benefits/PTO/equipment/training），立即重新审 inputs；(2) **2x-3x** → 重新审 ramp time 假设；(3) **< 2x** → 合理区间，立即 hire；**FT 决策**：fully-loaded > $15K/mo 且 ramp > 6 月 → 先试 3-6 月 contractor。";
result += "\n• 🧭 Key Uncertainty: (1) ramp time 真实值 vs 假设值（差异 2-3x）；(2) 隐性 cost (PTO/equipment/培训/管理 overhead) 是否计入；(3) contractor rate 不能按 12 月年化（无 PTO/benefits 但 billable rate 高 1.5-2x）。";
result += "\n• 🧭 Next Action: (a) 跑 [Productivity Ramp Calculator] 看 ramp 曲线；(b) 跑 [Attrition Cost Calculator] 算全生命周期 cost；(c) FT 谈判前先跑 [Freelance Rate Calculator] 看 market reference；(d) 决策前 verify offer 包含 fully-loaded breakdown。";
```

### 4.2 marketing/ltv-by-channel-calculator

```typescript
result += "\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
result += "\n• 🧭 Decision Question: 单纯看 LTV 是陷阱，**核心问题是\"LTV/CAC 是否 ≥ 3x 且 payback < 12 月\"**。LTV/CAC < 1x = 每个客户净亏；3x+ = 健康可加预算。";
result += "\n• 🧭 Recommendation: (1) **LTV/CAC < 1x** → 立刻砍预算（净亏损不可持续）；(2) **1x-3x** → 维持 + 优化 funnel conversion（最常见 改善空间）；(3) **3x+** → 加预算抢市场窗口期；(4) **高 LTV 但低 volume** → 保留作为 brand 投入，不期待 direct ROI。";
result += "\n• 🧭 Key Uncertainty: (1) attribution model 选错会让数字 2-5x 偏离（last-click 高估 direct、undercount brand）；(2) cohort 时间窗太短 (< 6 月) 会高估 churn；(3) discount rate 没折现（特别是 24+ 月 LTV）；(4) high-LTV 客户可能不可复制（outlier 而非 segment）。";
result += "\n• 🧭 Next Action: (a) 跑 [CAC Calculator] 看单渠道 acquisition cost；(b) 跑 [ROAS Calculator] 看短期回报（与 LTV 互补）；(c) 跑 [Cohort Retention Calculator] 验证 cohort 稳定性；(d) 决策前用 6-12 月真实 cohort 数据校准 LTV。";
```

### 4.3 freelance/freelance-rate-calculator

```typescript
result += "\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
result += "\n• 🧭 Decision Question: 单纯看 hourly rate 是陷阱，**核心问题是\"rate 是否匹配 experience + niche + 区域市场价 + 模式选择 (hourly vs project)\"**。Market rate 偏离 25% 以上都要重新审视。";
result += "\n• 🧭 Recommendation: (1) **rate < 市场 25 百分位** → 低于市场价（疑经验不足 或 在低价抢单，长期伤害 brand）；(2) **25-75 百分位** → 合理区间（适合大多数 freelancer）；(3) **> 75 百分位** → 需强 portfolio / niche 支撑（否则 client 会 churn）；(4) **> 95 百分位** → 顶级 expert，需限定 niche + referral-only。";
result += "\n• 🧭 Key Uncertainty: (1) 市场 rate 按地区/行业差异 2-5x（同 title 跨 region 完全不同）；(2) hourly vs project mode 选择（project mode 隐藏 scope creep）；(3) client 议价能力（大客户 vs 长尾小客户）；(4) upsell 加价空间（retainer vs one-off）。";
result += "\n• 🧭 Next Action: (a) 跑 [Project Profitability Calculator] 看项目级 margin；(b) 跑 [Hourly vs Fixed Calculator] 选计费模式（决定 risk 分配）；(c) 跑 [Course Pricing Calculator] 看 IP 化空间（突破 rate 上限）；(d) 决策前 benchmark 3-5 个 peer 的真实接单率。";
```

### 4.4 operations/stockout-cost-calculator

```typescript
result += "\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
result += "\n• 🧭 Decision Question: 单纯看 stockout cost 是陷阱，**核心问题是\"stockout cost / carrying cost 比值 + 频次\"是否支持加 safety stock**。比值 < 1 = 多备货不划算；> 2 = 必须加。";
result += "\n• 🧭 Recommendation: (1) **stockout cost > 2x carrying cost** → 加 safety stock（保守 20-30% buffer）；(2) **1x-2x** → 维持现状 + 监控 lead time；(3) **< 1x** → 砍库存释放 working capital；(4) **高频发生 (> 3 次/季)** → 重新审 supplier lead time + 找 backup；(5) **高 stockout + 高 carrying** → 库存策略全面 audit（多半是 SKU mix 问题）。";
result += "\n• 🧭 Key Uncertainty: (1) lost sale ≠ lost customer（LTV 视角，长期客户可能再来）；(2) recovery rate 取决于品类（必需品 80%+、非必需 30-50%）；(3) supplier lead time 在 peak season 实际延长 2-3x；(4) 季节性波动未折现会让 stockout cost 偏离 2x。";
result += "\n• 🧭 Next Action: (a) 跑 [Inventory Turnover Calculator] 看 turn 健康度；(b) 跑 [Reorder Point Calculator] 设自动化 reorder trigger；(c) 跑 [Supplier Scorecard Calculator] 优化 lead time + reliability；(d) 决策前用上 6 月真实 data 校准 lost sale assumption。";
```

### 4.5 legal-compliance/gdpr-fine-calculator

```typescript
result += "\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
result += "\n• 🧭 Decision Question: 单纯看 fine % 是陷阱，**核心问题是\"annual turnover + 数据规模 + prior violations + mitigation efforts\"决定实际罚款 + 是否值得立刻全面合规**。4% 全球营收是上限，实际常在 1-3% 区间。";
result += "\n• 🧭 Recommendation: (1) **fine > 4% 全球营收** → 必须立刻全面合规（C-level 推动 + 法务介入）；(2) **2-4%** → 高 ROI 投入（合规预算 < fine 期望值）；(3) **< 2%** → minimum viable 合规（DPA + privacy policy + consent banner）；(4) **数据 < 500 人/无跨境** → 标准化模板方案（avoid over-engineering）。";
result += "\n• 🧭 Key Uncertainty: (1) turnover 阈值是滑动值（不是 4% 上限就罚 4%，看违规严重性 + 配合度）；(2) mitigation efforts 可降 30-50% 罚款（主动报告 vs 被发现差异巨大）；(4) prior violations 会加重（首次 vs 重复）；(3) 跨境数据传输额外风险（Schrems II 单独处罚）。";
result += "\n• 🧭 Next Action: (a) 跑 [DPA Cost Calculator] 看 supplier 链合规 ROI；(b) 跑 [Consent Revenue Calculator] 看合规 vs 转化率 trade-off；(c) 跑 [DSAR Cost Calculator] 算运营 SOP 成本；(d) 决策前法务 review + 数据流 audit (不只是算法数字)。";
```

---

## 5. Test Strategy (TDD per engine)

### Test file naming

`tests/exp-p151-l5-<engine-slug>.test.ts` (5 new files)

`exp-` prefix = expectation test (P150-era naming).

### Test pattern

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import "../src/engines/<category>/<engine-file>"; // triggers registerEngine
import { getEngine } from "../src/core/engines/registry";

test("P151 L5: <engine-name> Decision Recommendation block has 4 sub-sections", () => {
  const engine = getEngine("solopreneur-<engine-name>-calculator");
  assert.ok(engine, "engine must be registered");

  const out = engine.generate({
    // minimal valid input subset (see table above)
  }).join("\n");

  // Block header present
  assert.match(out, /🧭 Decision Recommendation/);

  // All 4 sub-sections present
  assert.match(out, /🧭 Decision Question:/);
  assert.match(out, /🧭 Recommendation:/);
  assert.match(out, /🧭 Key Uncertainty:/);
  assert.match(out, /🧭 Next Action:/);

  // Each section has substantive content (≥50 chars after marker)
  for (const marker of ["Decision Question:", "Recommendation:", "Key Uncertainty:", "Next Action:"]) {
    const rx = new RegExp(`🧭 ${marker}([^\\n]{50,})`);
    assert.match(out, rx, `${marker} must have ≥50 chars of substantive content`);
  }

  // At least one cross-link to another engine (Next Action contains [...])
  assert.match(out, /\[[\w\s-]+ Calculator\]/);
});
```

### Per-engine minimal input (validated against engine `inputs` arrays)

| Engine | Inputs (literal names from engine file) |
|---|---|
| cost/employee-cost | `annualSalary`, `benefitsPercentage`, `location` |
| marketing/ltv-by-channel | `ch1_spend`, `ch1_conv`, `ch1_ltv` (ch1 only; others optional) |
| freelance/freelance-rate | `annualIncome`, `expenses`, `billableHrs`, `profit` |
| operations/stockout-cost | `lostSalesPerDay`, `avgStockoutDays`, `lostCustomerRate`, `customerLTV`, `annualRevenue`, `recoveryRate` |
| legal-compliance/gdpr-fine | `annual_revenue_global`, `max_fine_pct` |

### Test access pattern (engine is registered, not exported)

Engines self-register on `import "src/engines/<category>/<engine-file>"`. Tests
use the registry to fetch the engine, then call `engine.generate(inputs)`:

```typescript
import "../src/engines/cost/employee-cost-calculator"; // triggers registerEngine
import { getEngine } from "../src/core/engines/registry";

const engine = getEngine("solopreneur-employee-cost-calculator");
const out = engine.generate({ annualSalary: "100000", benefitsPercentage: "25", location: "US" }).join("\n");
```

Slugs follow pattern `solopreneur-<engine-name>-calculator`.

---

## 6. Verification (per engine, per commit)

```powershell
# Run new L5 test for this engine
node --import tsx --test tests/exp-p151-l5-<engine>.test.ts

# Run existing engine test (no regression)
node --import tsx --test tests/<engine>-calculator.test.ts

# Typecheck
pnpm typecheck
```

### Post-ship (after all 5 commits)

```powershell
# Full test suite
node --import tsx --test tests/*.test.ts

# typecheck (all)
pnpm typecheck

# Re-run heuristic audit (informational only — won't reflect changes
# because audit only scans engine.insight/result/uses metadata fields,
# not runtime output. New scoring infra deferred to batch 2.)
node tmp/audit-decision-support.cjs
```

---

## 7. Ship Flow

1. `git checkout -b feature/p151-l5-backfill-batch1` from master
2. T1: employee-cost — test (red) → implement → test (green) → commit
3. T2: ltv-by-channel — same flow
4. T3: freelance-rate — same flow
5. T4: stockout-cost — same flow
6. T5: gdpr-fine — same flow
7. Full typecheck + full test suite (post all 5 commits)
8. `git checkout master` + `git merge --no-ff feature/p151-l5-backfill-batch1`
9. Push to gitee + github
10. `git branch -d feature/p151-l5-backfill-batch1`
11. Write `memory/p151-l5-backfill-batch1-2026-09-01.md` ship record

### Commit message pattern

```
feat(l5): <engine-slug> add Decision Recommendation 4-section block

- Decision Question / Recommendation / Key Uncertainty / Next Action
- Cross-link to: <3-4 related engines>
- Mirrored in client-side customFn for live computation parity
- Test: tests/exp-p151-l5-<engine>.test.ts

Part of P151 Dimension 1 Phase 2 backfill (batch 1, 5/86).
```

---

## 8. Acceptance Criteria

| Criterion | Verification |
|---|---|
| 5 engines ship with L5 block in `calculate()` output | tests/exp-p151-l5-*.test.ts pass (5 files) |
| Existing engine tests don't regress | tests/*-calculator.test.ts pass (5 engines) |
| typecheck clean | pnpm typecheck = 0 errors |
| All 5 commits landed + merged to master | git log shows 5 feat(l5) commits |
| Memory record written | memory/p151-l5-backfill-batch1-2026-09-01.md exists |
| Branch deleted | git branch shows no feature/p151-l5-backfill-batch1 |

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| L5 template doesn't fit engine's domain | per-engine content is bespoke; spot-check during T1 |
| customFn mirror breaks client-side live compute | run existing engine test (which exercises client logic) before commit |
| 5-commit scope creeps into "more polish" | hard stop after 5 engines; defer all else to batch 2 |
| Sandbox instability during multi-step work | per-engine commits are atomic + revertible |

---

## 10. Out-of-Band Follow-ups (Post AdSense 9/08)

- Batch 2: extend to next 5-10 score-0 engines (template proven)
- Improve audit heuristic: scan `calculate()` runtime output, not just metadata fields
- LLM-based reclassification of audit scores for the 30 score-1 engines
- Bulk fill remaining 76 score-0 engines once L5 template is battle-tested
- Cross-link engine metadata infrastructure (track which engines link to which)