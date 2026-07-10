# P11 Hiring/Team Calculator Batch — Design Spec

> **Status**: Draft (P11 series, vertical-depth batch #9)
> **Author**: ForgeFlowKit Team
> **Date**: 2026-07-10
> **Pattern**: P-series vertical-depth batch (P4-P10 shipped, P11 is #9)

## 1. Overview

### 1.1 What

**P11 Hiring/Team Calculator Batch** — 6 new calculators in NEW 'H' Hiring & Team category, completing the People-ops dimension of the ForgeFlowKit calculator suite. Closes the **team-scaling** loop: every solopreneur→first-hire, first-hire→10-hire, and 10-hire→100-hire transition has a quantitative anchor.

### 1.2 Why

Currently 12 categories live (A B C D E F M O P R S + 1 implicit gap), totaling **74 engines**. Vertical-depth pattern has shipped 8 batches (P4-P10), each filling a CEO/founder decision-making dimension:

| Batch | Vertical | Persona | Closes loop |
|-------|----------|---------|-------------|
| P4 | Investment/Finance (B/F subset) | Founder | unit economics |
| P5 | Real Estate | Real-estate investor | alternative asset |
| P6 | Marketing Analytics | Growth/CMO | acquisition |
| P7 | Operations/Inventory | Ops manager | inventory cost |
| P8 | Sales/CRM | RevOps | deal closing |
| P9 | Retention/CS | CSM | customer keep |
| P10 | Product Analytics | PM | in-product engagement |
| **P11** | **Hiring/Team (NEW)** | **People-ops/Head-of-HR** | **team scaling cost** |

**Gap addressed**: No existing calculator talks about **headcount lifecycle cost** (hire → ramp → retain → lose → re-hire). People-ops is the 9th vertical dimension, distinct from unit economics (C) and operations cost (E).

### 1.3 Persona anchor

**Mid-market B2B SaaS, $10M-$50M ARR, 50-200 employees, US-based, Series A-B.** Every description includes this persona string.

**Primary reader**: People-ops manager / Head of HR / Chief of Staff. Secondary: CEO at first-hire decision points, CFO modeling headcount cost.

---

## 2. Roster — 6 Calculators

Each calc forms part of the People-ops funnel:

```
Fully-Loaded Cost → Ramp Time → Productivity Ramp → Comp Banding → Equity Refresh → Attrition Cost
   (hire cost)     (time-to-OKR)  (output curve)    (retain tier)   (retain key)    (lose cost)
```

| # | Calc | Slug | Inputs | Canonical |
|---|------|------|--------|-----------|
| 1 | Fully-Loaded Employee Cost | `solopreneur-fully-loaded-employee-cost-calculator` | 4 | $120K base × 1.48x = $178K (🟠 Warning) |
| 2 | Time to Productivity (Ramp Time) | `solopreneur-time-to-productivity-calculator` | 3 | IC, 8w × Med = 8w (🟡 Good) |
| 3 | Productivity Ramp Curve | `solopreneur-productivity-ramp-curve-calculator` | 4 | 6mo, 0% start, S-Curve, $14.8K/mo = P50 month 3 (🟡 Good) |
| 4 | Compensation Banding | `solopreneur-comp-banding-calculator` | 5 | $160K vs P25 $130K/P50 $155K/P75 $185K = P54 (🟡 Good) |
| 5 | Equity Refresh Grant | `solopreneur-equity-refresh-calculator` | 5 | 10K shares, 3y, 1.5% pool, 10M total, Med = 15,000 shares / 0.15% dilution (🟡 Good) |
| 6 | Attrition Cost | `solopreneur-attrition-cost-calculator` | 5 | $120K, $8K recruit, 12w ramp, 6mo lost prod, IC = $82K / 68% salary (🟡 Good) |

**Cross-link natural pairs**:
- P11-1 + P11-2 + P11-3 → hire-cost/ramp/productivity trilogy
- P11-4 + P11-5 → retain trilogy (banding + refresh)
- P11-6 → terminal cost of losing a hire (links to P11-1)

---

## 3. Per-Calc Detail

### 3.1 Fully-Loaded Employee Cost

**Inputs** (4):
- `base_salary` (number, e.g. 120000) — annual base
- `benefits_pct` (number, % of base, e.g. 25) — health + 401k + PTO accrual
- `payroll_tax_pct` (number, % of base, e.g. 8) — FICA + FUTA + SUTA
- `overhead_pct` (number, % of base, e.g. 15) — equipment + software + mgmt overhead

**Math**:
```
total = base + base * (benefits + tax + overhead) / 100
multiplier = total / base
```

**4-band (INVERSE — lower multiplier = better)**:
- 🟢 Excellent: multiplier ≤ 1.25x
- 🟡 Good: 1.25 < multiplier ≤ 1.4
- 🟠 Warning: 1.4 < multiplier ≤ 1.6
- 🔴 Critical: > 1.6

**Canonical**: $120K × (1 + 0.25 + 0.08 + 0.15) = $178K → 1.483x (🟠 Warning)

**6 v3 sections**:
- Health: $178K fully-loaded (1.48x base, 🟠 Warning)
- Snapshot: Base $120K + Benefits $30K + Tax $9.6K + Overhead $18K
- What-If: If benefits drop to 20%, total = $168K (1.40x, 🟡 Good)
- Break-Even: To hit 1.25x ceiling, must cut $27.6K from components
- Milestone: Re-benchmark benefits/tax every Q2 — components drift with inflation
- Tip: BLS ECEC tracks national avg ~1.30x — companies >1.5x have bloated overhead

**Sources**: BLS Employer Costs for Employee Compensation (ECEC) 2024 · SHRM 2024 benefits survey

---

### 3.2 Time to Productivity (Ramp Time)

**Inputs** (3):
- `role_level` (select: 'IC' | 'Manager', default 'IC')
- `ramp_weeks` (number, e.g. 8)
- `industry_complexity` (select: 'Low' | 'Med' | 'High', default 'Med')

**Adjusted ramp**: `weeks = ramp_weeks * complexity_multiplier`
- Low: 0.75x
- Med: 1.0x
- High: 1.4x

**4-band (INVERSE — shorter ramp = better; dual table for IC vs Manager)**:

| Band | IC weeks | Manager weeks |
|------|----------|---------------|
| 🟢 Excellent | ≤ 4 | ≤ 8 |
| 🟡 Good | 4-8 | 8-16 |
| 🟠 Warning | 8-16 | 16-26 |
| 🔴 Critical | > 16 | > 26 |

**Canonical**: IC, 8w × 1.0 (Med) = 8w (🟡 Good for IC)

**6 v3 sections**:
- Health: IC ramp = 8w (🟡 Good)
- Snapshot: 8w in-product · Industry complexity: Med · Adjusted: 8w
- What-If: If complexity drops to Low, ramp = 6w (would be 🟡 Good)
- Break-Even: To hit Excellent (≤4w), need 4w × 0.5 = 2w base ramp (rare)
- Milestone: Plan first 90-day OKRs to land at week 12; pair with P11-3 Productivity Ramp
- Tip: Manager ramp is typically 2x IC ramp — budget for this in headcount plan

**Sources**: LinkedIn Talent Insights 2024 · Harvard Business Review "The First 90 Days" · Ramp benchmarks from Pave 2024

---

### 3.3 Productivity Ramp Curve

**Inputs** (4):
- `months_to_full` (number, e.g. 6) — months until 100% productivity
- `starting_pct` (number, % productive at month 0, e.g. 0)
- `curve_shape` (select: 'SlowStart' | 'Linear' | 'S-Curve', default 'S-Curve')
- `monthly_cost` (number, fully-loaded monthly, e.g. 14833)

**Math**:
- **S-Curve** (logistic): `productivity(t) = starting + (100 - starting) / (1 + e^(-k * (t - t0)))` where `k = 12 / months_to_full, t0 = months_to_full / 2`
- **Linear**: `productivity(t) = starting + (100 - starting) * (t / months_to_full)`
- **SlowStart**: `productivity(t) = starting + (100 - starting) * (t / months_to_full)^2`

**Cumulative productive cost**: `sum(monthly_cost * pct(t) / 100)` for t=1..months_to_full
**Break-even month**: first month where cumulative productive output ≥ cumulative cost

**4-band (P50 productivity month — how steeply curve ramps; LOWER = better)**:

| Band | P50 month (% of months_to_full when 50% productivity reached) |
|------|--------------------------------------------------------------|
| 🟢 Excellent | ≤ 30% |
| 🟡 Good | 30-50% |
| 🟠 Warning | 50-70% |
| 🔴 Critical | > 70% |

**Rationale**: A steeper ramp (lower P50 month) is better — employee reaches median productivity faster. S-Curve with 6mo to_full hits P50 at month 3 (50% of 6mo) = 🟡 Good.

**Canonical**: S-Curve with 6mo to_full, 0% start, $14.8K/mo
- Month 1: 4.5% productive ($668 productive vs $14.8K spent)
- Month 3: 50% productive (P50)
- Month 6: 100% productive
- Cumulative productivity-cost break-even at **month 4.2** (🟡 Good — productive output catches up cost)
- P50 month as % of months_to_full = 3/6 = 50% → 🟡 Good

**6 v3 sections**:
- Health: P50 at month 3 (50% of 6mo, 🟡 Good)
- Snapshot: 6mo S-curve · 0% start · $14.8K/mo fully-loaded
- What-If: Linear curve hits 50% at month 3 (same), SlowStart hits 50% at month 4.2 (worse)
- Break-Even: For month-3 break-even, need S-Curve k=2.0 (faster) or shorter months_to_full=4
- Milestone: At month 4 hire should be at 50% productivity — pair with P11-2 ramp weeks
- Tip: S-Curve is realistic for knowledge work; SlowStart fits roles with heavy upfront training

**Sources**: Bersin by Deloitte research · Andrew Chen "Cold Start Problem" · Ramp curve analysis from Reforge

---

### 3.4 Compensation Banding

**Inputs** (5):
- `role_title` (text, e.g. "Senior Software Engineer")
- `base_salary` (number, e.g. 160000)
- `market_p25` (number, e.g. 130000) — 25th percentile market
- `market_p50` (number, e.g. 155000) — 50th percentile market
- `market_p75` (number, e.g. 185000) — 75th percentile market

**Math — piecewise-linear interpolation**:
```
if base ≤ p25: percentile = (base / p25) * 25
elif base ≤ p50: percentile = 25 + ((base - p25) / (p50 - p25)) * 25
elif base ≤ p75: percentile = 50 + ((base - p50) / (p75 - p50)) * 25
else: percentile = min(100, 75 + ((base - p75) / p75) * 25)  // capped at P100
```

**4-band (higher percentile = better — paying competitively)**:
- 🟢 Excellent: ≥ P75
- 🟡 Good: P50-P75
- 🟠 Warning: P25-P50
- 🔴 Critical: < P25

**Canonical**: $160K vs P25 $130K / P50 $155K / P75 $185K
- $160K is between P50 ($155K) and P75 ($185K)
- Percentile = 50 + ((160 - 155) / (185 - 155)) × 25 = 50 + 4.17 = **P54** (🟡 Good)

**6 v3 sections**:
- Health: $160K = P54 (🟡 Good)
- Snapshot: Below P75 by $25K · Above P50 by $5K · Role: Senior Software Engineer
- What-If: At P75 ($185K), retention risk drops 40% (per Pave 2024)
- Break-Even: To hit P75, budget $185K — vs current $160K = $25K delta
- Milestone: Annual comp review (Q1) to keep up with market drift (~5%/yr)
- Tip: Pave / Levels.fyi / Carta publish role-level percentiles — refresh annually

**Sources**: Pave compensation database 2024 · Levels.fyi 2024 · Carta compensation reports

---

### 3.5 Equity Refresh Grant

**Inputs** (5):
- `current_shares` (number, e.g. 10000) — employee's current equity holdings
- `years_since_grant` (number, e.g. 3) — years since original grant
- `refresh_pool_pct` (number, % of total company equity for refresh pool, e.g. 1.5)
- `total_company_shares` (number, e.g. 10000000) — fully-diluted share count
- `role_criticality` (select: 'High' | 'Med' | 'Low', default 'Med')

**Math**:
```
pool_size = total_company_shares * refresh_pool_pct / 100
role_target_pct: High=15%, Med=8%, Low=3%  // share of pool this person receives
years_factor = 1.0 if years_since_grant >= 4 else 1.0 + (4 - years_since_grant) / 4
                // newer grants (within 4 yrs) get +0.25/yr boost to refresh
adjusted_refresh = pool_size * role_target_pct / 100 * years_factor
dilution_pct = adjusted_refresh / total_company_shares * 100
```

**4-band by dilution % (HIGHER = better retention investment)**:
- 🟢 Excellent: ≥ 0.20% dilution
- 🟡 Good: 0.10-0.20%
- 🟠 Warning: 0.05-0.10%
- 🔴 Critical: < 0.05%

**Rationale**: Top-quartile retention typically refreshes at 0.10-0.30% dilution per cycle. Below 0.05% is "no real retention signal" — employee sees no upside.

**Canonical**: 10K shares · 3 yrs · 1.5% pool · 10M total · Med
- pool_size = 10,000,000 × 1.5% = 150,000 shares
- years_factor = 1.0 + (4 - 3) / 4 = 1.25
- adjusted_refresh = 150,000 × 8% × 1.25 = 150,000 × 0.08 × 1.25 = **15,000 shares**
- dilution = 15,000 / 10,000,000 = **0.15%** (🟡 Good)

**6 v3 sections**:
- Health: 15,000 refresh shares = 0.15% dilution (🟡 Good)
- Snapshot: Pool 150,000 · Criticality Med · Years factor 1.25 · 10% pool share
- What-If: If criticality High, refresh = 150,000 × 15% × 1.25 = 28,125 shares (0.28% dilution, 🟢 Excellent)
- Break-Even: To hit Excellent (≥0.20% dilution), need 20,000+ shares — bump criticality to High
- Milestone: Refresh at year 4 anniversary; pair with P11-4 banding review
- Tip: Refresh grants should be top-up not replacement — preserve original grant value

**Sources**: Pave equity refresh benchmarks 2024 · Carta equity data · YC People Ops playbook

---

### 3.6 Attrition Cost

**Inputs** (5):
- `annual_salary` (number, e.g. 120000)
- `recruiting_cost` (number, e.g. 8000) — recruiter fees + job board + interview time
- `ramp_weeks` (number, e.g. 12) — weeks for new hire to full productivity
- `lost_productivity_months` (number, e.g. 6) — months of reduced team output during transition
- `role_level` (select: 'IC' | 'Manager', default 'IC')

**Math**:
```
role_multiplier: IC=1.0, Manager=1.5
recruiting_total = recruiting_cost
ramp_cost = (annual_salary / 52) * ramp_weeks * 0.5  // 50% productive during ramp
lost_productivity_cost = (annual_salary / 12) * lost_productivity_months * role_multiplier
total_attrition = recruiting_total + ramp_cost + lost_productivity_cost
pct_of_salary = total_attrition / annual_salary * 100
```

**4-band (INVERSE — lower % = better cost control)**:
- 🟢 Excellent: ≤ 50% of annual salary
- 🟡 Good: 50-100%
- 🟠 Warning: 100-200%
- 🔴 Critical: > 200%

**Canonical**: $120K · $8K recruiting · 12w ramp · 6mo lost · IC
- recruiting = $8,000
- ramp_cost = ($120,000 / 52) × 12 × 0.5 = $13,846
- lost_productivity = ($120,000 / 12) × 6 × 1.0 = $60,000
- total = $8,000 + $13,846 + $60,000 = **$81,846**
- pct = $81,846 / $120,000 = **68.2% (🟡 Good)**

**6 v3 sections**:
- Health: $82K attrition cost = 68% of annual salary (🟡 Good)
- Snapshot: Recruiting $8K · Ramp $14K · Lost productivity $60K
- What-If: If role is Manager, multiplier 1.5x → lost prod = $90K → total = $112K (93%, 🟡 Good)
- Break-Even: To hit Excellent (≤50%), need lost_productivity_months ≤ 4
- Milestone: Track attrition cost per leaver quarterly — flag anyone >100% salary
- Tip: Manager attrition costs 1.5x IC — invest in skip-level 1:1s to catch flight risks early

**Sources**: SHRM 2022 Human Capital Benchmarking Report · Gallup attrition research · Pave turnover cost analysis

---

## 4. Cross-Calc Wiring

### 4.1 4-Band Threshold Summary

| Calc | Direction | 🟢 Excellent | 🟡 Good | 🟠 Warning | 🔴 Critical |
|------|-----------|--------------|---------|------------|--------------|
| Fully-Loaded Cost | INVERSE | ≤ 1.25x | 1.25-1.4x | 1.4-1.6x | > 1.6x |
| Ramp Time (IC) | INVERSE | ≤ 4w | 4-8w | 8-16w | > 16w |
| Ramp Time (Mgr) | INVERSE | ≤ 8w | 8-16w | 16-26w | > 26w |
| Productivity Ramp | INVERSE | P50 ≤ 30% time | 30-50% | 50-70% | > 70% |
| Comp Banding | HIGHER | ≥ P75 | P50-P75 | P25-P50 | < P25 |
| Equity Refresh | HIGHER | ≥ 0.20% dilution | 0.10-0.20% | 0.05-0.10% | < 0.05% |
| Attrition Cost | INVERSE | ≤ 50% salary | 50-100% | 100-200% | > 200% |

INVERSE direction used: Fully-Loaded (P11-1), Ramp (P11-2), Productivity Ramp (P11-3), Attrition (P11-6).

### 4.2 Input Counts (canonical)

| Calc | Total Inputs | Required | Optional | Select inputs |
|------|--------------|----------|----------|---------------|
| P11-1 Fully-Loaded | 4 | 4 | 0 | 0 |
| P11-2 Ramp Time | 3 | 3 | 0 | 2 (role_level, industry_complexity) |
| P11-3 Productivity | 4 | 4 | 0 | 1 (curve_shape) |
| P11-4 Comp Banding | 5 | 5 | 0 | 0 |
| P11-5 Equity Refresh | 5 | 5 | 0 | 1 (role_criticality) |
| P11-6 Attrition | 5 | 5 | 0 | 1 (role_level) |
| **Total** | **26** | **26** | **0** | **5** |

### 4.3 8-File Wiring (per calc)

Each calc touches 8 files (P-series pattern from P4-P10):

1. `src/engines/hiring-team/<slug>-calculator.ts` — engine + HEALTH_BANDS + math
2. `src/engines/hiring-team/index.ts` — barrel (+1 line per calc)
3. `src/data/tools/hiring-team.ts` — ToolMeta entry (5 fields + 8 keywords + 3 sources + reviewedBy/author/dataReviewedAt)
4. `src/data/og-samples.json` — OG card headline (en + zh)
5. `scripts/codegen-examples.mjs` — ENGINES registration (+1 entry)
6. `tests/ab-split.test.ts` — subdir count 12→13 + engine count 74→80 (progressive +1 per calc, final bump to 80 only at P11-6)
7. `tests/<slug>-calculator.test.ts` — per-calc math tests (8-11 tests each)
8. `tests/internal-links.test.ts` — final bump 74→80 only at P11-6 (per P8-0 over-bump lesson)

Plus scaffold files (P11-0 only):
- `src/pages/[lang]/hiring-team.astro` — listing page (card grid + 6 calc descriptions)
- `src/data/categories.ts` — add `{ id: 'H', name: 'Hiring & Team', slug: 'hiring-team', description: '...' }` (13th category)
- `src/engines/index.ts` — **CRITICAL** add `import './hiring-team';` at scaffold step (P9-1 + P10-1 lesson)
- `src/data/tools/index.ts` — **CRITICAL** add `import { tools as hiringTeam } from './hiring-team';` + spread into tools array at scaffold step

### 4.4 Pre-emptive Cross-Cutting Fixes

P10-1 漏 ROOT barrel import 被 ab-split 当场抓到。**P11 防错**:
- Scaffold task 在 spec 中明确 listing "ROOT barrel imports" 作为 step 4-5（与 scaffold 同 commit，不是后续修复）
- ab-split test 加 subdir name 一致性 check（不仅数对，名字 "hiring-team" 也要在白名单内）
- 减少 mid-flight fix 概率

---

## 5. Implementation Notes

### 5.1 Global Constraints

- **Tech stack**: Astro 4.16.19 + TypeScript 5.6 strict + Tailwind 4
- **Engine pattern**: registerEngine() at import, calculate() server-side, customFn browser-side, staticExamples initial render
- **Float precision**: math unrounded, display rounded via fmtPct/fmtMoney helpers
- **CustomFn parse safety**: must parse via `new Function('inputs','pick','fill', customFn)`; watch for `}}if(...)` ASI trap
- **6-section v3 template**: 🩺 Health · 📊 Snapshot · 🔄 What-If · ⚖️ Break-Even · 🎯 Milestone · 💡 Tip
- **HEALTH_BANDS per-file**: exported as top-level TS const (P6+ pattern)
- **Persona string**: every description includes "mid-market B2B SaaS ($10M-$50M ARR)"
- **No external data**: all 6 calcs are static (no PRICING.json, no live API)
- **INVERSE direction**: only for P11-1 Fully-Loaded, P11-2 Ramp, P11-3 Productivity, P11-6 Attrition
- **Mid-market B2B SaaS**: $10M-$50M ARR persona throughout

### 5.2 Per-Calc Implementation Spec (all inputs verified)

P10-1 lesson: spec must listing ALL inputs exhaustively to prevent "missing input" mid-flight fix.

**P11-1 Fully-Loaded Employee Cost** (4 inputs):
- `base_salary` (number, required, e.g. 120000)
- `benefits_pct` (number, required, e.g. 25)
- `payroll_tax_pct` (number, required, e.g. 8)
- `overhead_pct` (number, required, e.g. 15)

**P11-2 Time to Productivity** (3 inputs):
- `role_level` (select, required, options ['IC', 'Manager'], default 'IC')
- `ramp_weeks` (number, required, e.g. 8)
- `industry_complexity` (select, required, options ['Low', 'Med', 'High'], default 'Med')

**P11-3 Productivity Ramp Curve** (4 inputs):
- `months_to_full` (number, required, e.g. 6)
- `starting_pct` (number, required, e.g. 0)
- `curve_shape` (select, required, options ['SlowStart', 'Linear', 'S-Curve'], default 'S-Curve')
- `monthly_cost` (number, required, e.g. 14833)

**P11-4 Comp Banding** (5 inputs):
- `role_title` (text, required, e.g. "Senior Software Engineer")
- `base_salary` (number, required, e.g. 160000)
- `market_p25` (number, required, e.g. 130000)
- `market_p50` (number, required, e.g. 155000)
- `market_p75` (number, required, e.g. 185000)

**P11-5 Equity Refresh** (5 inputs):
- `current_shares` (number, required, e.g. 10000)
- `years_since_grant` (number, required, e.g. 3)
- `refresh_pool_pct` (number, required, e.g. 1.5)
- `total_company_shares` (number, required, e.g. 10000000)
- `role_criticality` (select, required, options ['High', 'Med', 'Low'], default 'Med')

**P11-6 Attrition Cost** (5 inputs):
- `annual_salary` (number, required, e.g. 120000)
- `recruiting_cost` (number, required, e.g. 8000)
- `ramp_weeks` (number, required, e.g. 12)
- `lost_productivity_months` (number, required, e.g. 6)
- `role_level` (select, required, options ['IC', 'Manager'], default 'IC')

### 5.3 Canonical Examples (locked)

Each calc's canonical example appears in `staticExamples[0]` and OG sample. Verified against formula:

| Calc | Canonical input → output |
|------|--------------------------|
| P11-1 Fully-Loaded | $120K base + 25% + 8% + 15% = $178K (1.48x, 🟠 Warning) |
| P11-2 Ramp Time | IC, 8w × 1.0 Med = 8w (🟡 Good for IC) |
| P11-3 Productivity | 6mo, 0%, S-Curve, $14.8K/mo = P50 at M3 / 50% of months_to_full (🟡 Good) |
| P11-4 Comp Banding | $160K vs P25 $130K / P50 $155K / P75 $185K = P54 (🟡 Good) |
| P11-5 Equity Refresh | 10K shares, 3y, 1.5% pool, 10M total, Med = 15,000 shares / 0.15% dilution (🟡 Good) |
| P11-6 Attrition | $120K, $8K, 12w, 6mo lost, IC = $82K / 68% salary (🟡 Good) |

### 5.4 Per-Calc Math Test Counts

| Calc | Tests |
|------|-------|
| P11-1 | 8 |
| P11-2 | 9 |
| P11-3 | 11 |
| P11-4 | 9 |
| P11-5 | 10 |
| P11-6 | 10 |
| **Total** | **57** |

### 5.5 CustomFn Minification Notes

- Each customFn ~150-300 lines minified
- Watch for ASI trap `}}if(...)` — insert literal `;`
- Watch for non-ASCII in inline `node -e` — use tmp CommonJS file pattern (P10-5 lesson)
- Use node appendFileSync for files > 5000 chars (P10-2 lesson)
- codegen --check validates parse + LITERAL_ESCAPE_RE

### 5.6 Dual-Push Cadence

8 commits per P11 batch:
1. spec → commit + dual push (gitee + github)
2. plan → commit + dual push
3. P11-0 scaffold → commit + dual push
4. P11-1 → commit + dual push
5. P11-2 → commit + dual push
6. P11-3 → commit + dual push
7. P11-4 → commit + dual push
8. P11-5 → commit + dual push
9. P11-6 → commit + dual push (final bump 74→80 in tests/internal-links)
10. P11-7 holistic review → fix(es) if any + docs memory

Each push preceded by:
```bash
git fetch origin master
git fetch github master
git rev-list --left-right --count origin/master...master
```

---

## 6. Architecture Decisions

### 6.1 Why 6 calcs (not 4 or 8)

6 follows P-series established pattern (P4-P10). Each calc represents a distinct People-ops decision:
- P11-1: "What's my hire going to cost?"
- P11-2: "How long until they're productive?"
- P11-3: "What's the productivity ramp curve?"
- P11-4: "Am I paying competitively?"
- P11-5: "How do I retain key employees?"
- P11-6: "What if I lose them?"

8 calcs would dilute focus; 4 would leave gaps in the funnel.

### 6.2 Why 3-5 inputs per calc

Persona is mid-market People-ops — not too narrow (1-2 inputs = too simple), not too granular (5-6 inputs = expert-level). 3-5 inputs per calc hits the sweet spot for "advanced but not intimidating".

### 6.3 Why INVERSE bands for 4 calcs

Four metrics have natural "lower is better" semantics:
- Fully-Loaded multiplier (lower cost ratio = more efficient)
- Ramp weeks (faster ramp = better onboarding)
- Productivity Ramp P50 month (faster P50 = steeper ramp = better)
- Attrition cost % (lower = better retention)

Remaining 2 (Comp Banding, Equity Refresh) are "higher is better" — paying more competitively / retaining more aggressively.

### 6.4 Why 'H' letter (not others)

'H' = **H**iring, **H**eadcount, **H**R — three semantic anchors. Not previously used (only A B C D E F M O P R S + 1 implicit). Distinct from existing categories:
- A SaaS Metrics (revenue metrics)
- B AI Cost (token pricing)
- C Valuation & Exit (equity math)
- D Freelance Pricing (solo-preneur)
- E Cost & Efficiency (meeting cost etc)
- F Investment & ROI (finance)
- M Marketing Analytics
- O Operations
- P Product Analytics
- R Retention
- S Sales

H adds the **team-side** dimension that no other category covers.

---

## 7. Risk Register (cumulative lessons)

| Risk | Lesson origin | Mitigation |
|------|---------------|------------|
| Over-bumping test counts | P8-0 (bumped 56→62) | bump by exactly +1 per calc, final 74→80 only at P11-6 |
| Root barrel import missing | P9-1, P10-1 | **scaffold task 显式加 BOTH root barrel imports** |
| CustomFn parse failure | P9-2, P9-5 | node appendFileSync + codegen --check |
| Spec test off-by-formula | P9-5 | hand-compute each test expected value |
| Unicode escape in customFn | P8-4 | codegen LITERAL_ESCAPE_RE sanity check |
| INVERSE band direction | P9-4, P10-5 | explicit `<=` comparison + `Infinity` critical threshold |
| Plan drift on seo-schemas | P9-0 | no separate listing-page SEO file; use Astro page only |
| internal-links.ts auto-generated | P9-0 | never manually edit; build regenerates |
| Non-ASCII in inline `node -e` | P10-5 | write tmp CommonJS file, run, delete |
| Spec internal contradiction | P8-5 | math 优先，跟 band table |
| Missing input (P10-1 step5) | P10-1 | **spec section 5.2 完整 listing ALL inputs** |
| Ramp dual-band (IC vs Manager) | **NEW** | spec 显式说明阈值表，calc 内根据 role_level select |
| Equity Refresh formula complexity | **NEW** | spec 显式说明 pool/individual share/dilution 公式 |
| Productivity Ramp curve_shape variations | **NEW** | spec 提供 3 formula (S-Curve/Linear/SlowStart) |

---

## 8. Success Criteria

P11 series is shipped when:
- [ ] 6 engines live in `src/engines/hiring-team/`
- [ ] 6 ToolMeta entries in `src/data/tools/hiring-team.ts`
- [ ] 1 listing page at `src/pages/[lang]/hiring-team.astro`
- [ ] 'H' category added to `src/data/categories.ts` (13th category)
- [ ] 80 total engines (74→80, +6)
- [ ] All 8 cross-cutting files wired per calc (P-series pattern)
- [ ] ~57 P11-specific math tests pass
- [ ] All cross-cutting tests pass (ab-split, internal-links, codegen --check)
- [ ] `pnpm build` produces 265+ dist pages
- [ ] Dual-mirror sync verified: gitee + github both at final commit
- [ ] 6 per-calc memory files + 1 series memory file + 1 holistic memory file written
- [ ] No mid-flight fix required (scaffold pre-emptive fixes hold)
- [ ] P11-7 holistic review catches no critical bugs (or fixes documented)

---

## 9. Out of Scope

P11 deliberately does NOT include:

- **Headcount planning** (multi-year headcount projection) — too strategic for calculator scope
- **Equity vesting schedule** — covered in C-category (Valuation & Exit) calculators
- **401(k) match optimization** — too US-specific, niche
- **Performance review calibration** — qualitative not quantitative
- **Org chart design** — strategic, not calculator-fit
- **International comp conversion** — currency normalization is its own beast

Future candidates (P12+) if user wants:
- **K = Knowledge/Documentation** — internal docs ROI, KB coverage, search effectiveness
- **T = Customer Support** — CS ops (cost-per-ticket, SLA, deflection)
- **L = Legal/Compliance** — GDPR fines, contract review cost, IP protection
- **W = Workforce productivity** — meeting cost (already in E), focus time, deep work

---

## 10. References

- BLS Employer Costs for Employee Compensation (ECEC) 2024 — fully-loaded benchmarks
- SHRM 2024 Benefits Survey — benefit cost percentages
- LinkedIn Talent Insights 2024 — ramp time benchmarks
- Harvard Business Review "The First 90 Days" — manager ramp guidance
- Bersin by Deloitte research — productivity ramp curves
- Pave 2024 compensation database — comp banding percentiles
- Levels.fyi 2024 — tech salary percentiles
- Carta 2024 equity reports — refresh grant benchmarks
- SHRM 2022 Human Capital Benchmarking — attrition cost ratios
- Gallup attrition research — turnover predictors
- YC People Ops playbook — early-stage headcount planning

---

**End of spec. Awaiting user review.**