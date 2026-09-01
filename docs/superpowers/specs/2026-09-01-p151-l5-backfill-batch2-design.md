# P151 Dimension 1 Phase 2: L5 Backfill Batch 2 Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Add L5 Decision Recommendation 4-section block to 5 more score-0 engines across 5 fresh categories (not touched by batch1). Validate template reusability + push v2.0 Dimension 1 runtime coverage from ~5.2% → ~9.5%.

**Architecture:** Same as batch1. Each engine's `generate()` runtime output gets an appended ~30-line L5 block. Mirrored in `clientConfig.customFn` + `staticExamples[0]`. Per-engine TDD.

**Tech Stack:** Same as batch1 (TypeScript + Astro 4 + node:test + @astrojs/cloudflare).

**Prior work:**
- Batch 1 (2026-09-01): 5 engines in {cost, marketing, freelance, operations, legal-compliance} — memory/p151-l5-backfill-batch1-2026-09-01.md
- P151 audit (2026-09-01): [spec](2026-09-01-p151-dimension-1-audit-design.md) + [plan](2026-09-01-p151-dimension-1-audit.md)
- Template pioneer: saas-burn-rate-calculator.ts:187-192

---

## 1. Scope

### In Scope

- 5 new engines × ~30-line L5 block in `calculate()` runtime output
- 5 new engines × `customFn` mirror
- 5 new test files (`tests/exp-p151-l5-<engine-slug>.test.ts`)
- `memory/p151-l5-backfill-batch2-2026-09-01.md` ship record

### Out of Scope

- FAQ / HowToUse / description / inputs
- Remaining 71 score-0 engines (deferred to batch 3+)
- Audit heuristic fix (deferred — would inflate count to ~6-10 score-4)

### Branch

`feature/p151-l5-backfill-batch2` (single branch, 5 commits, 1 merge)

---

## 2. Target Engines (5 fresh categories)

| # | Slug | Path | Category | Why picked |
|---|---|---|---|---|
| 1 | ai-cost-gpu-cloud-cost-calculator | src/engines/ai-cost/gpu-cloud-cost-calculator.ts | AI/Infrastructure | GPU vendor selection (Lambda/RunPod/Vast) |
| 2 | customer-support-csat-calculator | src/engines/customer-support/csat-calculator.ts | Support | CSAT-driven intervention decision |
| 3 | hiring-team-comp-banding-calculator | src/engines/hiring-team/comp-banding-calculator.ts | HR | Comp band offer decision |
| 4 | knowledge-kb-coverage-rate-calculator | src/engines/knowledge/kb-coverage-rate-calculator.ts | Knowledge | KB coverage investment priority |
| 5 | real-estate-rent-vs-buy-calculator | src/engines/real-estate/rent-vs-buy-calculator.ts | Real Estate | Rent vs buy life decision |

All 5 are score-0 per P151 audit. All 5 are in fresh categories (not touched by batch1).

---

## 3. L5 Content per Engine

####### 3.1 ai-cost/gpu-cloud-cost-calculator

```typescript
result += "\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
result += "\n• 🧭 Decision Question: 单纯看 GPU hourly rate 是陷阱，**核心问题是"实际 workload cost / 月 + idle time 浪费率 + vendor lock-in 风险"**。最便宜 ≠ 最划算。";
result += "\n• 🧭 Recommendation: (1) **rate < 中位数 30%** → 警惕 hidden cost（data egress / API gateway fee / 抢占 spot 不可靠）；(2) **中位数 ±20%** → 安全选型；(3) **> 中位数 30%** → 仅在 SLA / 合规硬性要求时付溢价；(4) **多 vendor 分散** → 降低 lock-in 但增加 ops 复杂度。";
result += "\n• 🧭 Key Uncertainty: (1) 不同 vendor pricing model 不一样（per-second vs per-hour vs reserved）；(2) GPU 类型差异大（A100 vs H100 vs L40S 不可比）；(3) data egress fee 可能吞掉 savings；(4) spot preempt 频率影响 production workload。";
result += "\n• 🧭 Next Action: (a) 跑 [OpenAI Token Calculator] 看 API vs 自托管 cost 对比；(b) 跑 [AI Training Cost Estimator] 看训练全周期 cost；(c) 跑 [Claude API Cost Calculator] 看主力模型成本曲线；(d) 决策前做 30 天 proof-of-concept 验证 vendor SLA。";
```

####### 3.2 customer-support/csat-calculator

```typescript
result += "\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
result += "\n• 🧭 Decision Question: 单纯看 CSAT score 是陷阱，**核心问题是"score 是否反映真实问题 + response rate + 客户分群"**。单一 score 误导（顶级客户低分 vs 低价值客户高分）。";
result += "\n• 🧭 Recommendation: (1) **CSAT < 60%** → 系统性问题，立即 audit top 3 痛点（FAQ / 流程 / 产品）；(2) **60-75%** → 优化 contact reason 流程 + agent training；(3) **75-85%** → 维护 + 监控 cohort 漂移；(4) **> 85%** → 扩张投入 brand / referral。";
result += "\n• 🧭 Key Uncertainty: (1) response rate 影响 score 分布（只 10% 客户响应会 bias）；(2) 不同 segment 期望值不同（enterprise > SMB）；(3) 季节性波动（holiday season 自然低）；(4) channel 差异（chat vs email CSAT 不可比）。";
result += "\n• 🧭 Next Action: (a) 跑 [First Response Time Calculator] 看响应延迟影响；(b) 跑 [Resolution Time Calculator] 看解决时长；(c) 跑 [Support Capacity Planning Calculator] 看 staffing 瓶颈；(d) 决策前 segment 客户分群对比 CSAT。";
```

####### 3.3 hiring-team/comp-banding-calculator

```typescript
result += "\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
result += "\n• 🧭 Decision Question: 单纯看 band midpoint 是陷阱，**核心问题是"候选人 market rate + 当前团队 equity + competitor 同岗位 pay + offer 速度 trade-off"**。top of band 可能意味着 hire 太晚。";
result += "\n• 🧭 Recommendation: (1) **offer < band 25 百分位** → 极可能 lose candidate（除非强 equity/使命）；(2) **25-75 百分位** → 合理区间（适合大多数情况）；(3) **> 75 百分位** → 仅在 critical hire / replacement > 6 月时；(4) **> 95 百分位** → 重新评估 role 必要性或拆分。";
result += "\n• 🧭 Key Uncertainty: (1) band 是 annualized base 不含 equity / bonus（total comp 可能 30-50% 高出）；(2) 不同 region 不可比（NYC senior ≠ Bangalore senior）；(3) competitor raise 数据滞后 6-12 月；(4) counter-offer 时机影响 retention。";
result += "\n• 🧭 Next Action: (a) 跑 [Attrition Cost Calculator] 看 replacement 成本；(b) 跑 [Productivity Ramp Curve Calculator] 看 ramp 时间 ROI；(c) 跑 [Fully Loaded Employee Cost Calculator] 看全负荷 cost；(d) 决策前 verify 候选人 other competing offers。";
```

####### 3.4 knowledge/kb-coverage-rate-calculator

```typescript
result += "\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
result += "\n• 🧭 Decision Question: 单纯看 coverage % 是陷阱，**核心问题是"coverage 是否覆盖 top 20% ticket topics + 内容新鲜度 + 搜索可发现性"**。50% coverage 在错误 topic 上 = 0 实际 deflection。";
result += "\n• 🧭 Recommendation: (1) **coverage < 30% + top topics 缺失** → 立即 audit ticket data + 写 top 10 articles；(2) **30-60% + 内容陈旧** → 重写 top 20 articles；(3) **60-80%** → 优化 search + cross-link；(4) **> 80%** → 专注 deflection quality 而非 coverage 数字。";
result += "\n• 🧭 Key Uncertainty: (1) coverage 按 ticket volume vs article count 算差异巨大；(2) 文章发布 ≠ article 可发现（搜索 ranking 也很关键）；(3) 行业更新使旧文章快速过时；(4) 长尾 topics 永远不值得补（专注 top 80%）。";
result += "\n• 🧭 Next Action: (a) 跑 [Search Effectiveness Calculator] 看 findability；(b) 跑 [Article Freshness Calculator] 看文章新鲜度；(c) 跑 [Deflection Quality Calculator] 看实际 deflection 效果；(d) 决策前先 analyze ticket volume 排序 top topics。";
```

####### 3.5 real-estate/rent-vs-buy-calculator

```typescript
result += "\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
result += "\n• 🧭 Decision Question: 单纯看 monthly payment 是陷阱，**核心问题是"持有期 horizon + 市场 appreciation 预期 + 流动性需求 + 隐性成本（维修 / tax / insurance / opportunity）"**。租 vs 买在不同 horizon 下答案完全不同。";
result += "\n• 🧭 Recommendation: (1) **horizon < 3 年** → 租（closing cost + 市场风险吞掉所有 upside）；(2) **3-7 年** → 看市场 appreciation rate vs rent inflation；(3) **7-15 年** → 多数情况买更划算（principal paydown + appreciation）；(4) **> 15 年** → 买 + leverage 是 wealth 工具（前提 stable market）。";
result += "\n• 🧭 Key Uncertainty: (1) appreciation 是平均数 ≠ 你的房子（neighborhood / school / job market）；(2) 维护 + tax + insurance = 房价 1-3% / 年隐性成本；(3) leverage 是双刃剑（2008 教训）；(4) 流动性差（6-12 月卖出）。";
result += "\n• 🧭 Next Action: (a) 跑 [Mortgage Calculator] 看真实月供；(b) 跑 [Cap Rate Calculator] 看 cap rate 对比 rent yield；(c) 跑 [DSCR Calculator] 看 rental 现金流（如果 buy-to-rent）；(d) 决策前 stress test "如果价格跌 30% 我能 hold 吗？"。";
```

---

## 4. Test Strategy (TDD per engine)

5 new test files using same pattern as batch1. Tests import the engine file (triggers `registerEngine`) + import `getEngine`. Fetch engine by slug `solopreneur-<engine-name>-calculator`. Call `engine.generate(inputs)`. Assert 4 L5 markers present + ≥50 chars substance + at least ≥ `[Xxx Calculator]` cross-link.

Per-engine minimal inputs (will be validated in plan step):
- gpu-cloud-cost: `gpu_type`, `hours_per_month`, `provider`
- csat: `responses`, `positive`, `segment`
- comp-banding: `role`, `level`, `experience`, `region`
- kb-coverage-rate: `total_articles`, `covered_topics`, `topic_count`
- rent-vs-buy: `monthly_rent`, `purchase_price`, `horizon_years`

---

## 5. Verification

```powershell
# Per engine (before commit)
node --import tsx --test tests/exp-p151-l5-<engine>.test.ts        # new test
node --import tsx --test tests/<engine>-calculator.test.ts          # existing test
pnpm check                                                              # full pipeline (optional)
```

Post-ship: full test suite (expect 5 new tests pass, 11 pre-existing failures unchanged).

---

## 6. Ship Flow

1. `git checkout -b feature/p151-l5-backfill-batch2` from master
2. T1: gpu-cloud-cost → 1 commit
3. T2: csat → 1 commit
4. T3: comp-banding → 1 commit
5. T4: kb-coverage-rate → 1 commit
6. T5: rent-vs-buy → 1 commit
7. Full test + typecheck
8. `git merge --no-ff feature/p151-l5-backfill-batch2` to master
9. Push to gitee + github
10. `git branch -d feature/p151-l5-backfill-batch2`
11. Write `memory/p151-l5-backfill-batch2-2026-09-01.md` ship record

---

## 7. Acceptance Criteria

| Criterion | How verified |
|---|---|
| 5 engines ship with L5 in `generate()` | 5 exp-p151-l5-*.test.ts pass |
| Existing engine tests don't regress | tests/*-calculator.test.ts pass (5 engines) |
| typecheck clean | pnpm check = 0 new errors |
| All 5 commits landed + merged | git log shows 5 feat(l5) commits |
| Memory record written | memory/p151-l5-backfill-batch2-2026-09-01.md exists |
| Branch deleted | git branch shows no feature/p151-l5-backfill-batch2 |

---

## 8. Risks

- Sandbox instability during multi-engine writes — kill node.exe if file lock
- PowerShell multi-line content — use byte-exact anchors
- Pattern variations per engine — `let r` vs `results.push` — observe during T1 and replicate