# P140d-T1 — H1 Refresh Round 2: 17 Misclassified Slugs (DRAFT — pre-GSC-data)

> **Status:** DRAFT. Subject to revision after 7-14 day GSC data on P140d H1 refresh ships. Treat this document as input for `superpowers:writing-plans` after data lands, not as a frozen spec.

---

## 1. Goal

Apply the same H1 + metaTitle refresh (spec §6 hard constraints, §7 P1-P5 patterns) to the **17 slugs that P140d Task 1's A/B/C classifier incorrectly excluded as "A-class"**. Most critically:

- `solopreneur-csat-calculator` — **GSC #1 priority** (14 impressions @ average position 83.5 in 90-day window — the highest-impression slug in the entire dataset)

Outcome: same ranking lift target as P140d H1 refresh (pos 30-90 → 20-30 within 14 days post-deploy, if the pattern holds).

Single deliverable: 17 line edits in `src/i18n/translations.ts`. Identical file as P140d H1 refresh.

---

## 2. Why these 17 were missed

The P140d Task 1 subagent's classification heuristic treated **parenthetical acronym expansions** (e.g., "CSAT (Customer Satisfaction)", "Net Revenue Retention (NRR)") as intent modifiers. They're not — they're just clarifications. The 17 titles all follow this pattern:

```
'tools.{slug}.title': { en: '<ACRONYM> (<Full Term>) Calculator', zh: '... 计算器' }
```

These are bare with respect to spec §6.4 (no `Free` / `Online` / `By` / `+` / ` \d{4}` modifier) — but the parenthetical text fooled the heuristic.

---

## 3. The 17 slugs + proposed new titles

Strategy: same 5 patterns (P1 SaaS core / P2 unit-economics / P3 marketing / P4 ops / P5 compliance) from P140d spec §7, applied via judgment to each.

| # | Slug | Pattern | Proposed en | Proposed zh |
|---|---|---|---|---|
| 1 | `csat-calculator` | P5 | `CSAT Calculator — Sample Size + Confidence Interval (2026)` | `CSAT 计算器 — 含样本量与置信区间（2026）` |
| 2 | `nrr-calculator` | P1 | `NRR Calculator — Free Cohort Net Revenue Retention (2026)` | `NRR 计算器 — 按队列免费测算净收入留存（2026）` |
| 3 | `grr-calculator` | P1 | `GRR Calculator — Free Cohort Gross Revenue Retention (2026)` | `GRR 计算器 — 按队列免费测算毛收入留存（2026）` |
| 4 | `acv-calculator` | P1 | `ACV Calculator — Free Annual Contract Value + Discount Impact (2026)` | `ACV 计算器 — 免费测算 ACV 与折扣影响（2026）` |
| 5 | `arr-multiple-valuation-calculator` | P2 | `ARR Multiple Valuation Calculator — SaaS Public Comps + Growth (2026)` | `ARR 倍数估值计算器 — SaaS 同业对比与增长（2026）` |
| 6 | `safe-convertible-note-calculator` | P2 | `SAFE / Convertible Note Calculator — Valuation Cap + Discount (2026)` | `SAFE / 可转债计算器 — 估值上限与折扣（2026）` |
| 7 | `customer-health-score-calculator` | P1 | `Customer Health Score Calculator — CSAT + Usage + Support Mix (2026)` | `客户健康度计算器 — CSAT + 使用 + 支持（2026）` |
| 8 | `funnel-step-calculator` | P3 | `Funnel Step Calculator — Stage Drop-Off + Conversion Lift (2026)` | `漏斗步骤计算器 — 阶段流失与转化提升（2026）` |
| 9 | `first-response-time-calculator` | P1 | `First Response Time SLA Calculator — Free P50 + P95 Targets (2026)` | `首次响应 SLA 计算器 — 免费测算 P50 + P95（2026）` |
| 10 | `stickiness-calculator` | P3 | `DAU/MAU Stickiness Calculator — Free Ratio + Trend (2026)` | `DAU/MAU 粘性计算器 — 免费测算比率与趋势（2026）` |
| 11 | `power-user-curve-calculator` | P3 | `Power User Curve Calculator — Top Decile LTV + Adoption (2026)` | `重度用户曲线计算器 — 头部 10% LTV 与采用率（2026）` |
| 12 | `productivity-ramp-curve-calculator` | P1 | `Productivity Ramp Calculator — Free Time-to-Full + TTD (2026)` | `生产力爬坡计算器 — 满产时间与达到时间（2026）` |
| 13 | `search-effectiveness-calculator` | P5 | `KB Search Effectiveness Calculator — CTR + Zero-Result + Latency (2026)` | `搜索有效性计算器 — 点击率 + 无结果率 + 延迟（2026）` |
| 14 | `deflection-quality-calculator` | P5 | `Deflection Quality Calculator — Recontact Rate + CSAT Lift (2026)` | `自助分流质量计算器 — 再联系率 + CSAT 提升（2026）` |
| 15 | `cost-per-support-ticket-calculator` | P1 | `Support Cost per Ticket Calculator — Free Labor + Overhead (2026)` | `单次工单成本计算器 — 免费测算人工 + 间接（2026）` |
| 16 | `support-capacity-planning-calculator` | P1 | `Support Capacity Planner — Free Volume + Staffing Forecast (2026)` | `支持容量规划计算器 — 免费工单量与人力预测（2026）` |
| 17 | `article-helpfulness-calculator` | P5 | `Article Helpfulness Calculator — Helpful Rate + Bounce Lift (2026)` | `文章有用性计算器 — 有用率 + 跳出率（2026）` |

**Distribution**: P1 = 7 / P2 = 2 / P3 = 3 / P4 = 0 / P5 = 5. P4 is empty because the misclassified set is heavily weighted toward SaaS/knowledge/engagement metrics, not operations.

---

## 4. Revised A/B/C criterion (for future PRs)

The classification heuristic must distinguish **parenthetical acronym expansion** from **intent modifier**. Replacement rule for any future PR:

```
A-class (out of scope, no H1 rewrite needed):
  - Title contains an intent-modifying phrase that includes:
    - "vs" comparison (e.g., "Hourly vs Fixed")
    - "By / Per / Per Order" (e.g., "Per Order")
    - "+" plus a formula output (e.g., "+ Sample Size")
    - Year tag (e.g., "(2026)")
    - "Free" / "Online" / "Instant" / "Pro" / "Premium"
    - "(<full term> / <full term>)" slash expansion (e.g., "(Buy Rehab Rent Refinance Repeat)")
  - Title has 4+ tokens beyond "Calculator"

B-class (rewrite):
  - "X Calculator" bare — single concept + Calculator
  - "X (Full Term) Calculator" — acronym expansion (treated as bare)

C-class (rewrite — same as B):
  - "SaaS Pricing Planner" / "Market Size Estimator" — descriptive but not intent-specific
  - All 3-token titles without modifier
```

**Critical correction**: parenthesis with text inside is NOT an intent modifier — it's just clarification. Distinguish by intent: "(Free Online)" would be a modifier; "(Customer Satisfaction)" is just expansion.

---

## 5. Hard constraints (inherited verbatim from P140d spec §6)

| Constraint | Value |
|---|---|
| Length | en ≤ 80 chars / zh ≤ 35 chars |
| Year | `2026` present in every new title |
| Head-term preservation | Original head-term (`csat`, `nrr`, `grr`, `acv`, etc.) preserved in new title |
| ≥ 1 modifier | Each title contains Free/Online/By/+/\d{4} |
| zh natural | zh has CJK chars, not a literal en translation |
| Word order | Head-term appears within first 30 chars of en title |

---

## 6. csat-calculator is special (GSC #1 priority)

**Why csat-calculator gets an explicit, longer treatment:**

- 14 impressions in 90 days (highest in dataset) — Google actively shows it for ~7-8 different query variants: `csat calculator`, `csat calculator online`, `csat score calculator`, `customer satisfaction metric calculator`, `csat percentage calculator`, etc.
- Position 83.5 — far too deep for users to find organically
- 4 of the 5 csat-query variants also rank >79 (csat, csat score, csat online, csat percentage, customer satisfaction metric) — collectively ~38 impressions but only 0 clicks

**Treatment differences vs other 16:**

1. **Pattern P5** (compliance / niche / measurement) — not P1 (saas metrics) despite being a SaaS-support metric, because the modifier theme is "statistical rigor" not "business process"
2. **Specific modifiers**: `Sample Size + Confidence Interval` — addresses the actual search intent (users want to know if their sample size is meaningful, not just the score formula)
3. **Longer title** (~63 chars en) — adds more matchable terms for Google's long-tail queries

If GSC data after P140d shows the simple `X Calculator — Free Online (2026)` pattern works for pos-30+ pages, then csat's longer treatment may be overengineered. Verify with data before locking.

---

## 7. Open questions (to be answered by 7-14 day GSC data)

1. **Did P140d's modifier choices lift ranking?** — Compare GSC position distribution on the 65 changed pages before/after. If average moved from pos 50 to pos 25, pattern works → apply same to P140d-T1. If no movement → reconsider modifier strategy entirely.
2. **Did any P140d titles get over-optimized?** — Specifically check for any of the 65 that may have keyword-stuffed (e.g., "Cohort Retention Calculator — Retention Decay + 12-Month LTV" is dense). If Google penalizes dense titles, soften P140d-T1.
3. **Is `2026` tag helping or hurting?** — Some SEO wisdom says year tags age poorly. Check if 65 pages with `(2026)` get higher or lower CTR vs the 35 A-class titles without it. If `(2026)` hurts, drop from P140d-T1 (and maybe refresh P140d later).
4. **What about the alternative P3 patterns?** — 3 of the 17 (stickiness, power-user, funnel-step) have alternative intents (engagement metric vs cohort metric). If GSC shows "Cohort" outperforms "Free Online" as a modifier, switch stickiness to "Cohort Engagement" framing.
5. **Should the 17 use exactly the same patterns as P140d's 65, or evolve?** — If P140d's pattern lifts ranking, copy it. If pattern is flat, redesign P140d-T1 with whatever the data shows works.

---

## 8. Out of scope (deferred)

| Item | Why |
|---|---|
| 35 A-class titles (BRRRR, DSCR, AI Cost Comparison, etc.) | Out of scope — they already have intent modifiers |
| Blog `[slug].astro` titles (`best-{slug} — ForgeFlowKit Blog`) | Different file / different problem class |
| Blog synthetic `datePublished` audit | Different problem |
| Adding new tools | P16 lock, 100/100 |
| Backlink acquisition | Off-platform work |

---

## 9. Ship path (after GSC data)

1. **Day 0 (today, 2026-08-05)**: P140d H1 refresh shipped (`1d8943c`); push complete.
2. **Day 7-14**: Read fresh GSC export. Update this spec's §7 with data-driven answers.
3. **Day 14+**: Update §3 with revised titles if needed. Convert this design into a plan via `superpowers:writing-plans`. Execute via `superpowers:subagent-driven-development` (subagent-driven for the same data-layer reasons).
4. **Day 14-21**: Ship P140d-T1.

---

## 10. Acceptance criteria (when executed)

1. 17/17 line edits in `src/i18n/translations.ts`
2. No edits to any other src/ file
3. `pnpm check` returns 0 errors (same guards as P140d, no new test files)
4. `pnpm build` succeeds + dist still 449 pages (same page count — no new pages)
5. Title-shape lint PASS on 17 in-scope titles
6. Spot-check 5 dist H1 render correctly (incl. csat-calculator)
7. Single commit on master

---

## 11. References

- P140d H1 refresh spec: `docs/superpowers/specs/2026-08-04-h1-keyword-refresh-design.md` (commit 9f9826a)
- P140d H1 refresh plan: `docs/superpowers/plans/2026-08-04-h1-keyword-refresh.md`
- P140d H1 refresh commit: `1d8943c`
- GSC export 2026-08-04: `C:\Users\元始天尊\Downloads\forgeflowkit.com-Performance-on-Search-2026-08-04.xlsx`