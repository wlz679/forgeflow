# P12 Customer Support Calculator Batch — Design Spec

> **Status**: Draft (P12 series, vertical-depth batch #10)
> **Author**: ForgeFlowKit Team
> **Date**: 2026-07-10
> **Pattern**: P-series vertical-depth batch (P4-P11 shipped, P12 is #10)

---

## 1. Overview

### 1.1 What

**P12 Customer Support Calculator Batch** — 6 new calculators in NEW 'T' Customer Support category, completing the **service-operations** dimension of the ForgeFlowKit calculator suite. Closes the **customer service loop**: every CS Ops Manager decision (cost / quality / efficiency / planning) has a quantitative anchor.

### 1.2 Why

Currently 12 categories live (A B C D E F H M O P R S), totaling **80 engines**. Vertical-depth pattern has shipped 9 batches (P4-P11), each filling a CEO/founder decision-making dimension:

| Batch | Vertical | Persona | Closes loop |
|-------|----------|---------|-------------|
| P4 | Investment/Finance (B/F subset) | Founder | unit economics |
| P5 | Real Estate | Real-estate investor | alternative asset |
| P6 | Marketing Analytics | Growth/CMO | acquisition |
| P7 | Operations/Inventory | Ops manager | inventory cost |
| P8 | Sales/CRM | RevOps | deal closing |
| P9 | Retention/CS | CSM | customer keep |
| P10 | Product Analytics | PM | in-product engagement |
| P11 | Hiring/Team | People-ops | team scaling |
| **P12** | **Customer Support (NEW)** | **Head of CS / CS Ops** | **service ops cost** |

**Gap addressed**: No existing calculator talks about **service-operations cost** (cost-per-ticket, SLA attainment, CSAT, deflection, capacity planning). Customer Support is the 10th vertical dimension, distinct from retention (R — customer health) and operations (O — inventory).

### 1.3 Persona anchor

**Mid-market B2B SaaS, $10M-$50M ARR, 50-200 employees, US-based, Series A-B.** Every description includes this persona string.

**Primary reader**: Head of CS / VP Support / CS Ops Manager. Secondary: CFO modeling support cost; CEO at "should we hire more support?" decision points; CSM evaluating vendor performance (P12-4 CSAT).

---

## 2. Roster — 6 Calculators

Each calc forms part of the CS Ops funnel:

```
Cost-per-Ticket → FRT SLA → Resolution Time → CSAT → Deflection Rate → Capacity Planning
   ($/ticket)      (response)  (full cycle)    (sentiment)  (efficiency)      (headcount)
```

**Total inputs across 6 calcs: 31** (6 + 6 + 4 + 4 + 5 + 6 = 31).

| # | Calc | Slug | Inputs | Canonical |
|---|------|------|--------|-----------|
| 1 | Cost-per-Support-Ticket | `solopreneur-cost-per-support-ticket-calculator` | 6 | T1 $8 / T2 $25 / T3 $70 × 55/30/15% = **$22.40/ticket** (Good) |
| 2 | First Response Time SLA | `solopreneur-first-response-time-calculator` | 6 | T1 85% / T2 80% / T3 90% = **85.0%** (Good) |
| 3 | Resolution Time | `solopreneur-resolution-time-calculator` | 4 | 75% in-SLA, median 8hr, p90 36hr (ratio 4.5) (Good) |
| 4 | CSAT | `solopreneur-csat-calculator` | 4 | 87% × 35% response × 200 responses, target 90% (Good) |
| 5 | Self-Service Deflection Rate | `solopreneur-deflection-rate-calculator` | 5 | 5000 × 35% × $24 - $1500 = **$40,500/mo net** (Good) |
| 6 | Support Team Capacity Planning | `solopreneur-support-capacity-planning-calculator` | 6 | 5000/mo × 18min × 70% occ × 30% shrink = **20 agents @ 95.7% util** (Good) |

**Cross-link natural pairs**:
- P12-1 + P12-5: cost-per-ticket × deflection = cost saved
- P12-2 + P12-3: FRT × Resolution Time = full service time
- P12-6 → P12-1: capacity × cost/ticket = monthly support cost
- P12-4 → P9 retention: CSAT contributes to customer health
- P12-6 → P11 hiring: capacity drives hiring plan

---

## 3. Per-Calc Detail

### 3.1 Cost-per-Support-Ticket

**Inputs** (6):
- `t1_cost` (number, $/ticket, e.g. 8) — Tier-1 fully-loaded cost per ticket (junior agent time + overhead)
- `t2_cost` (number, $/ticket, e.g. 25) — Tier-2 cost (senior specialist time)
- `t3_cost` (number, $/ticket, e.g. 70) — Tier-3 cost (engineering escalation, dev involvement)
- `t1_share` (number, % of total tickets, e.g. 55) — Tier-1 share
- `t2_share` (number, %, e.g. 30) — Tier-2 share
- `monthly_volume` (number, tickets/month, e.g. 5000) — total monthly ticket volume

**Math**:
```
t3_share = 100 - t1_share - t2_share  // implicit
weighted_avg = (t1_cost * t1_share + t2_cost * t2_share + t3_cost * t3_share) / 100
monthly_total = weighted_avg * monthly_volume
```

**4-band (INVERSE — lower $/ticket = better cost control)**:
- 🟢 Excellent: ≤ $10/ticket
- 🟡 Good: $10 < avg ≤ $25
- 🟠 Warning: $25 < avg ≤ $50
- 🔴 Critical: > $50

**Canonical**: T1 $8 × 55% + T2 $25 × 30% + T3 $70 × 15% = (4.4 + 7.5 + 10.5) = **$22.40/ticket** (🟡 Good)
- monthly_total = $22.40 × 5000 = **$112,000/mo**

**6 v3 sections**:
- Health: $22.40/ticket weighted avg (🟡 Good), $112K/mo total
- Snapshot: T1 55% × $8 + T2 30% × $25 + T3 15% × $70 → $22.40 weighted
- What-If: If T3 share drops to 10% (better deflection), avg = $19.30 (still Good)
- Break-Even: To hit Excellent ≤$10, must cut T3 cost to ≤$30 OR push T3 share ≤5%
- Milestone: Re-benchmark tier rates quarterly — agent comp inflation ~3-5%/yr
- Tip: TSIA 2024 mid-market benchmark is $15-$25/ticket; >$50 indicates over-escalation

**Sources**: TSIA 2024 Support Operations Benchmark · Zendesk CX Trends 2024 · Freshdesk CS Benchmark · ICMI 2023

### 3.2 First Response Time SLA

**Inputs** (6):
- `t1_target_min` (number, minutes, e.g. 30) — Tier-1 FRT target (minutes)
- `t2_target_hr` (number, hours, e.g. 4) — Tier-2 FRT target (hours)
- `t3_target_hr` (number, hours, e.g. 24) — Tier-3 FRT target (hours)
- `t1_attainment` (number, %, e.g. 85) — % of T1 tickets meeting SLA
- `t2_attainment` (number, %, e.g. 80) — % of T2 tickets meeting SLA
- `t3_attainment` (number, %, e.g. 90) — % of T3 tickets meeting SLA

**Math** (equal-weighted average — see implementation note):
```
overall_attainment = (t1_attainment + t2_attainment + t3_attainment) / 3
```

**Implementation note**: Equal-weighted avg assumes roughly balanced tier distribution. For skewed distributions (e.g. 80% T1), input tier-specific attainments matching actual share. Documented as a known limitation; matches industry rule-of-thumb where FRT reporting is usually per-tier.

**4-band (HIGHER — higher attainment = better)**:
- 🟢 Excellent: ≥ 90%
- 🟡 Good: 80% ≤ x < 90%
- 🟠 Warning: 60% ≤ x < 80%
- 🔴 Critical: < 60%

**Canonical**: 85% / 80% / 90% = (85+80+90)/3 = **85.0%** (🟡 Good)

**6 v3 sections**:
- Health: 85.0% overall FRT SLA attainment (🟡 Good)
- Snapshot: T1 85% (target 30min) · T2 80% (target 4hr) · T3 90% (target 24hr)
- What-If: If T1 attainment hits 90%, overall = 86.7% (still Good; need ≥90% on all 3 for Excellent)
- Break-Even: To hit ≥90%, all 3 tiers must hit 90% (equal-weighted constraint)
- Milestone: FRT is the #1 driver of CSAT — track weekly, target 95% attainment
- Tip: T1 attainment <80% usually signals queue overflow OR shift coverage gap; check T1 headcount

**Sources**: Zendesk CX Trends 2024 · TSIA Support Operations Benchmark · ICMI 2023

### 3.3 Resolution Time

**Inputs** (4):
- `sla_attainment_pct` (number, %, e.g. 75) — overall % of tickets resolved within SLA
- `median_resolution_hr` (number, hours, e.g. 8) — median time-to-resolution across all tiers
- `p90_resolution_hr` (number, hours, e.g. 36) — 90th percentile (tail) resolution time
- `monthly_resolved` (number, tickets/mo, e.g. 4800) — total tickets resolved this month

**Math**:
```
tail_ratio = p90_resolution_hr / median_resolution_hr
// tail_ratio = 1.0 means uniform distribution; >3.0 means heavy tail (some tickets drag on)
// Note: tail_ratio is informational; SLA attainment is the band driver
```

**4-band (HIGHER — higher % in-SLA = better)**:
- 🟢 Excellent: ≥ 85%
- 🟡 Good: 70% ≤ x < 85%
- 🟠 Warning: 50% ≤ x < 70%
- 🔴 Critical: < 50%

**Canonical**: 75% in-SLA, median 8hr, p90 36hr (tail ratio 4.5) = **75%** (🟡 Good)

**6 v3 sections**:
- Health: 75% in-SLA (🟡 Good), tail ratio 4.5x (heavy tail — investigate)
- Snapshot: 4800 resolved/mo · median 8hr · p90 36hr · tail ratio 4.5
- What-If: If p90 drops to 24hr (tail ratio 3.0), same SLA% but better customer experience
- Break-Even: To hit ≥85% SLA, identify tier with lowest attainment and fix first
- Milestone: Tail ratio >5x signals systemic issue — escalations, missing knowledge base
- Tip: Median is vanity; p90 is the truth. Track p90 weekly and dig into outliers

**Sources**: TSIA 2024 Support Operations Benchmark · ICMI 2023 · Gainsight Customer Success Benchmarks

### 3.4 CSAT

**Inputs** (4):
- `csat_pct` (number, %, e.g. 87) — current CSAT score (% positive ratings out of 5)
- `response_rate` (number, %, e.g. 35) — % of tickets that received a rating
- `sample_size` (number, e.g. 200) — total ratings collected this period
- `target_csat` (number, %, e.g. 90) — internal CSAT target

**Math**:
```
margin_of_error_pct = 1.96 * sqrt((csat_pct/100 * (1 - csat_pct/100)) / sample_size) * 100
ci_low = csat_pct - margin_of_error_pct
ci_high = csat_pct + margin_of_error_pct
gap = target_csat - csat_pct  // positive = below target
```

**4-band (HIGHER — higher CSAT = better)**:
- 🟢 Excellent: ≥ 90%
- 🟡 Good: 80% ≤ x < 90%
- 🟠 Warning: 70% ≤ x < 80%
- 🔴 Critical: < 70%

**Canonical**: 87% × 35% response × 200 responses, target 90% → **87%** (🟡 Good), margin of error ±4.7pp (95% CI: 82.3-91.7%), gap = -3pp (below target)

**6 v3 sections**:
- Health: 87% CSAT (🟡 Good, 3pp below 90% target)
- Snapshot: 200 responses · 35% response rate · ±4.7pp margin of error (95% CI)
- What-If: If response rate doubles to 70%, margin shrinks to ±3.3pp (more confidence)
- Break-Even: To hit ≥90% Excellent, need 90%+ score OR adjust target
- Milestone: CSAT is the leading indicator of NRR — track weekly; >5pp drop = escalate
- Tip: Response rate <20% = biased sample (only happy/angry respond); incentivize responses

**Sources**: CustomerGauge 2024 CSAT Benchmarks · Gainsight CS Benchmarks · Zendesk CX Trends 2024

### 3.5 Self-Service Deflection Rate

**Inputs** (5):
- `monthly_tickets` (number, e.g. 5000) — total monthly inbound tickets
- `deflection_rate` (number, %, e.g. 35) — % deflected via KB/chatbot (pre-T1)
- `cost_per_ticket` (number, $, e.g. 24) — pulled from P12-1 (Cost-per-Ticket)
- `tool_monthly_cost` (number, $, e.g. 1500) — KB platform + chatbot subscription
- `target_deflection` (number, %, e.g. 40) — internal target for deflection rate

**Math**:
```
deflected_volume = monthly_tickets * (deflection_rate / 100)
saved_cost = deflected_volume * cost_per_ticket
net_savings = saved_cost - tool_monthly_cost
roi_pct = (net_savings / tool_monthly_cost) * 100
gap_to_target = target_deflection - deflection_rate
```

**4-band (HIGHER — higher deflection rate = better self-service effectiveness)**:
- 🟢 Excellent: ≥ 40%
- 🟡 Good: 25% ≤ x < 40%
- 🟠 Warning: 10% ≤ x < 25%
- 🔴 Critical: < 10%

**Canonical**: 5000 × 35% × $24 - $1500 = $42000 - $1500 = **$40,500/mo net savings**, ROI = $40500/$1500 = 2700%, deflection gap = -5pp (5pp below target) → **35%** (🟡 Good)

**6 v3 sections**:
- Health: 35% deflection (🟡 Good, 5pp below 40% target)
- Snapshot: 1750 tickets deflected/mo · $42K saved gross · $40.5K net · 2700% ROI
- What-If: If deflection hits 45%, savings = $54K - $1.5K = $52.5K/mo (+$12K)
- Break-Even: To hit ≥40% Excellent, identify top-10 deflectable tickets and improve KB coverage
- Milestone: KB content gap is #1 deflection killer — re-audit top 50 articles quarterly
- Tip: Deflection >50% often means KB is masking product gaps — validate top-deflected tickets

**Sources**: TSIA 2024 Self-Service Benchmark · Zendesk CX Trends 2024 · Freshdesk CS Benchmark · Gartner 2024

### 3.6 Support Team Capacity Planning

**Inputs** (6):
- `monthly_tickets` (number, e.g. 5000) — total tickets expected this month
- `avg_handle_time_min` (number, minutes, e.g. 18) — average handle time per ticket
- `target_occupancy_pct` (number, %, e.g. 70) — target agent utilization (industry standard 70-85%)
- `work_hours_per_month` (number, hours, e.g. 160) — productive hours per agent per month (40hr/wk × 4wk)
- `shrinkage_pct` (number, %, e.g. 30) — non-productive time (meetings, training, sick, PTO)
- `target_response_time_min` (number, minutes, e.g. 60) — service-level target for inbound tickets

**Math**:
```
total_handle_min = monthly_tickets * avg_handle_time_min
productive_min_per_agent = work_hours_per_month * 60 * (1 - shrinkage_pct/100) * (target_occupancy_pct/100)
required_agents_raw = total_handle_min / productive_min_per_agent
required_agents = Math.ceil(required_agents_raw)
utilization_actual = (total_handle_min / (required_agents * productive_min_per_agent)) * 100
// utilization_actual may be <target_occupancy if we rounded up (headcount buffer)
```

**4-band (INVERSE — utilization should be ≤100%; over 110% = overworked)**:
- 🟢 Excellent: ≤ 85% utilization (15%+ buffer)
- 🟡 Good: 85% < util ≤ 100% (healthy)
- 🟠 Warning: 100% < util ≤ 120% (no buffer, burnout risk)
- 🔴 Critical: > 120% (overworked, attrition imminent)

**Canonical**: 5000 × 18 = 90,000 handle min. 160 × 60 × 0.7 × 0.7 = 4,704 min/agent. Required = ceil(90000/4704) = **20 agents**. Utilization = 90000 / (20 × 4704) × 100 = **95.7%** (🟡 Good).

**6 v3 sections**:
- Health: 20 agents required at 95.7% utilization (🟡 Good, healthy buffer)
- Snapshot: 5000 tickets/mo × 18min AHT = 90K handle min; 4704 productive min/agent; 30% shrinkage
- What-If: If volume grows 20% (6000/mo), required = ceil(108000/4704) = 23 agents (+3 hires)
- Break-Even: To hit ≤85% Excellent buffer, hire 1 more agent (22 total, 88% util)
- Milestone: Capacity plan must refresh monthly; spikes >20% require temporary contractors
- Tip: 70% occupancy target accounts for after-call work; 85%+ means agents are drowning

**Sources**: TSIA 2024 Workforce Optimization · ICMI 2023 · Zendesk CX Trends 2024 · SQM Group 2024

---

## 4. Cross-Calc Wiring

### 4.1 4-Band Threshold Summary

| Calc | Direction | Excellent | Good | Warning | Critical |
|------|-----------|-----------|------|---------|----------|
| P12-1 Cost/Ticket | INVERSE | ≤ $10 | $10-$25 | $25-$50 | > $50 |
| P12-2 FRT SLA | HIGHER | ≥ 90% | 80-90% | 60-80% | < 60% |
| P12-3 Resolution Time | HIGHER | ≥ 85% | 70-85% | 50-70% | < 50% |
| P12-4 CSAT | HIGHER | ≥ 90% | 80-90% | 70-80% | < 70% |
| P12-5 Deflection Rate | HIGHER | ≥ 40% | 25-40% | 10-25% | < 10% |
| P12-6 Capacity Plan | INVERSE | ≤ 85% util | 85-100% | 100-120% | > 120% |

**Direction mix**: 2 INVERSE (P12-1 cost, P12-6 utilization), 4 HIGHER (P12-2 SLA, P12-3 resolution, P12-4 CSAT, P12-5 deflection).

### 4.2 Input Counts

| Calc | Numeric | Select | Total |
|------|---------|--------|-------|
| P12-1 Cost/Ticket | 6 | 0 | **6** |
| P12-2 FRT SLA | 6 | 0 | **6** |
| P12-3 Resolution Time | 4 | 0 | **4** |
| P12-4 CSAT | 4 | 0 | **4** |
| P12-5 Deflection Rate | 5 | 0 | **5** |
| P12-6 Capacity Plan | 6 | 0 | **6** |
| **TOTAL** | **31** | **0** | **31** |

### 4.3 8-File Wiring (per calc)

For each calc, 8 files must be touched:

1. `src/engines/customer-support/<slug>-calculator.ts` — engine + HEALTH_BANDS + math
2. `src/engines/customer-support/index.ts` — barrel (+1 line per calc)
3. `src/data/tools/customer-support.ts` — ToolMeta (5 fields + 8-9 keywords + 3 sources + reviewedBy/author/dataReviewedAt)
4. `src/data/og-samples.json` — OG card headline (en + zh)
5. `scripts/codegen-examples.mjs` — ENGINES registration (+1 entry, subdir: 'customer-support')
6. `tests/ab-split.test.ts` — bump engine count progressive (80→81→82→83→84→85→86)
7. `tests/<slug>-calculator.test.ts` — per-calc math tests (8-13 each)
8. `tests/internal-links.test.ts` — FINAL bump 80→86 only at P12-6 (P8-0 over-bump lesson)

Plus scaffold files (P12-0 only):
- `src/pages/[lang]/customer-support.astro` — listing page (template from hiring-team.astro)
- `src/data/categories.ts` — 'T' category entry (13th)
- `src/engines/index.ts` — `import './customer-support';` (P9-1 + P10-1 pre-emptive)
- `src/data/tools/index.ts` — `import { tools as customerSupport }` + spread (pre-emptive)

### 4.4 Pre-emptive Cross-Cutting Fixes

Lessons from P9-1, P10-1, P11-1: scaffold MUST update both root barrels in P12-0 to avoid mid-flight fix:
- `src/engines/index.ts` line ~18 — `import './customer-support';`
- `src/data/tools/index.ts` — `import { tools as customerSupport }` + `...customerSupport,` spread

Also: tests/ab-split.test.ts engine count array 80→86 progressive per calc (final at P12-6 only for internal-links).

---

## 5. Implementation Notes

### 5.1 Global Constraints

- **Persona string**: every calc description includes "mid-market B2B SaaS ($10M-$50M ARR)"
- **6-section v3 template**: 🩺 Health · 📊 Snapshot · 🔄 What-If · ⚖️ Break-Even · 🎯 Milestone · 💡 Tip
- **HEALTH_BANDS** exported as top-level TS const per file (P11 pattern)
- **Float precision**: math unrounded, display rounds to 2 decimals or whole dollars
- **pre-commit hook** runs `codegen-examples.mjs --check`; regenerate staticExamples[0] after generate() changes
- **customFn JS parse safety**: avoid `}}if(...)` ASI trap; verify with `node tests/scripts/test-customfn.mjs`

### 5.2 Per-Calc Implementation Spec (all inputs verified)

**P12-1 Cost-per-Ticket (6 inputs)**
- All numeric, no selects
- Math: `weighted_avg = (t1_cost * t1_share + t2_cost * t2_share + t3_cost * (100 - t1_share - t2_share)) / 100`
- Bands: $10/$25/$50
- Canonical: T1 $8, T2 $25, T3 $70, T1 55%, T2 30%, volume 5000 → $22.40

**P12-2 FRT SLA (6 inputs)**
- All numeric, no selects
- Math: `overall = (t1 + t2 + t3) / 3` (equal-weighted; limitation noted)
- Bands: 60/80/90 (%)
- Canonical: T1 85, T2 80, T3 90, targets 30/4/24 → 85.0%

**P12-3 Resolution Time (4 inputs)**
- All numeric, no selects
- Math: `tail_ratio = p90 / median`
- Bands: 50/70/85 (%)
- Canonical: 75%, 8hr, 36hr, 4800 → 75% Good, tail 4.5

**P12-4 CSAT (4 inputs)**
- All numeric, no selects
- Math: `margin_of_error = 1.96 * sqrt(p*(1-p)/n) * 100`
- Bands: 70/80/90 (%)
- Canonical: 87%, 35%, 200, target 90 → 87% Good, margin ±4.7pp

**P12-5 Deflection Rate (5 inputs)**
- All numeric, no selects
- Math: `saved = volume * rate% * cost; net = saved - tool_cost; roi = net/tool_cost * 100`
- Bands: 10/25/40 (%)
- Canonical: 5000, 35%, $24, $1500, target 40 → 35% Good, $40.5K net

**P12-6 Capacity Plan (6 inputs)**
- All numeric, no selects
- Math: `productive_min = hours * 60 * (1-shrink) * (occ/100); agents = ceil(tickets * aht / productive_min); util = ...`
- Bands: 85/100/120 (% util)
- Canonical: 5000, 18min, 70% occ, 160hr, 30% shrink, 60min target → 20 agents, 95.7%

### 5.3 Canonical Examples (locked)

All canonical examples are pre-computed in §3 per-calc detail. Math is anchored; display rounds to friendly numbers.

### 5.4 Per-Calc Math Test Counts

| Calc | Spec tests | Band tests | Metadata | Total |
|------|-----------|------------|----------|-------|
| P12-1 Cost/Ticket | 6 | 3 | 1 | **10** |
| P12-2 FRT SLA | 6 | 3 | 1 | **10** |
| P12-3 Resolution Time | 6 | 3 | 1 | **10** |
| P12-4 CSAT | 6 | 3 | 1 | **10** |
| P12-5 Deflection Rate | 6 | 3 | 1 | **10** |
| P12-6 Capacity Plan | 7 | 3 | 1 | **11** |
| **TOTAL** | **37** | **18** | **6** | **61** |

Total P12 tests: **61** (with cross-cutting ab-split + internal-links tests, total ≈ 75-80).

### 5.5 CustomFn Minification Notes

- All customFn JS strings MUST parse as valid JS (no ASI traps)
- Avoid `}}if(...)` — insert literal `;` between `}` and `if`
- Use `node tests/scripts/test-customfn.mjs <slug>` to verify each
- Patterns from P11 carry: `Math.round(x*10)/10` for one-decimal, `.toFixed(2)` for two-decimal

### 5.6 Dual-Push Cadence

Per-calc push cadence:
1. Implement engine + test
2. Run pnpm check (with `SKIP_PRECOMMIT_CHECK=1` if env warnings)
3. Commit + push to gitee + github
4. Verify with `git rev-list --left-right --count gitee/master..github/master` (and reverse)

Holistic review at P12-7 (after all 6 calcs shipped) catches cross-file breakage.

---

## 6. Architecture Decisions

### 6.1 Why 6 calcs (not 4 or 8)

- **Quality dimension needs 3** (FRT, Resolution, CSAT) to capture response + full cycle + sentiment trio
- **Cost/Efficiency/Planning** each need at least 1 to cover the CS Ops decision space
- 4 calcs would force dropping one quality dimension (response OR sentiment)
- 8 calcs would duplicate: NPS vs CSAT, Agent Utilization vs Capacity Plan, Ticket Forecast vs Capacity Plan

### 6.2 Why multi-tier T1/T2/T3

- **Reality**: mid-market SaaS CS teams are almost universally multi-tier (TSIA 2024: 87% of teams have ≥2 tiers)
- **Single-tier cost-per-ticket** loses 30-50% accuracy when T3 (engineering escalation) is 10x cost of T1
- **Single-tier SLA** masks the truth: T1 SLA miss is far less damaging than T3 SLA miss
- Trade-off: 1 extra input per tier-distribution calc, but proportional accuracy gain

### 6.3 Why INVERSE bands for 2/6 (P12-1, P12-6)

- **Cost-per-Ticket**: lower $/ticket = better cost control (standard cost-metric inversion)
- **Capacity Plan**: lower utilization = more buffer (but not <70% — underutilization = waste)
- **HIGHER bands** for the other 4: SLA attainment, resolution %, CSAT, deflection rate — all "more is better" metrics

### 6.4 Why 'T' letter (not others)

- T = Customer Support, intuitive (T = Tickets, T = Tech support, T = Tech CS)
- Available letters: K (Knowledge), L (Legal), W (Workforce) — T was free and most intuitive
- Alphabet order: H (P11) → T (P12) → future K/L/W after T

### 6.5 No NPS (only CSAT)

- NPS is a relationship metric (how likely to recommend), not a service metric
- CSAT is per-interaction (how was THIS support experience)
- CS Ops Manager cares about per-interaction quality (CSAT), not relationship (NPS — owned by CSM/account mgmt)
- Adding NPS would also require survey design (relational vs transactional), adding complexity

### 6.6 Deflection includes KB + chatbot

- Both are pre-T1 channels (customer self-serves before opening ticket)
- Industry treats them together in deflection-rate reporting (TSIA 2024, Zendesk 2024)
- Tool cost combines both: KB platform + chatbot subscription

---

## 7. Risk Register (cumulative lessons)

1. **ROOT barrel pre-emptive fix** (P9-1 + P10-1 + P11-1 lesson) — MUST be in P12-0 scaffold. Don't defer.
2. **Float-precision dual-layer** — math unrounded, display rounds. P11-1 caught $177,600 vs $178,000.
3. **Test boundary band direction** — INVERSE bands use Infinity critical threshold; HIGHER use -Infinity.
4. **Test/unit convention drift** (P11-3 lesson) — HEALTH_BANDS uses ratio thresholds (0-1) but tests use percentages (0-100); document in JSDoc.
5. **Band label dynamic vs target** (P11-2 lesson) — in Break-Even, hardcode target band (Excellent), not current band.
6. **CustomFn ASI trap** — `}}if(...)` is parse error. Insert `;` between `}` and `if`.
7. **internal-links progressive bump** (P8-0 over-bump lesson) — only at P12-6 final, not per-calc.
8. **Equal-weighted tier avg limitation** (P12-2) — math assumes equal tier distribution. Document limitation in staticExamples / FAQ.
9. **CSAT margin of error interpretation** (P12-4) — 35% response rate at 200 sample = ±4.7pp margin. Below 20% response rate = biased.
10. **Capacity utilization "good" band is 85-100%** (P12-6) — 100% means no buffer; >120% means overworked. Standard ICMI guidance.
11. **No tier-distribution inputs in FRT calc** (P12-2 trade-off) — to keep input count at 6, equal-weighted avg used. Document as known limitation.

---

## 8. Success Criteria

P12 ships successfully when ALL of:

- [ ] P12-0 scaffold merges: 'T' category added, listing page, ROOT barrels pre-fixed
- [ ] All 6 calcs shipped with `feat(p12-N): <title>` commits, per-calc push cadence
- [ ] All 6 calcs match canonical examples in §3 (math-exact)
- [ ] All 6 calcs follow 6-section v3 template
- [ ] All 6 calcs have per-calc test files with ≥10 tests each (61 total)
- [ ] `pnpm check` passes (with `SKIP_PRECOMMIT_CHECK=1` if env warnings)
- [ ] Holistic review (P12-7) catches and fixes all real cross-file bugs
- [ ] 3-way mirror sync verified (local + gitee + github at same SHA)
- [ ] 7 memory files written: p12-0 through p12-6 + p12-series-shipped
- [ ] 80 engines → 86 engines (+6); 12 categories → 13 categories (NEW 'T')

---

## 9. Out of Scope

P12 deliberately does NOT include:

- **NPS** — owned by CSM/relationship side, not CS Ops
- **Agent-level productivity** — covered in E (Cost & Efficiency)
- **Multi-channel routing** (chat vs email vs phone) — too complex for calc scope
- **Workforce scheduling** (shift optimization) — too operational, requires WFM tool
- **Knowledge Base content gap analysis** — qualitative, requires content audit
- **Customer health score (composite)** — P9 customer-health-score already covers this
- **AI/automation deflection** (LLM-powered agents) — emerging tech, no benchmark yet
- **International support (24/7 follow-the-sun)** — staffing model too company-specific

Future candidates (P13+) if user wants:
- **K = Knowledge/Documentation** — KB coverage, search effectiveness
- **L = Legal/Compliance** — GDPR fines, contract review cost, IP protection
- **W = Workforce productivity** — focus time, deep work, energy management

---

## 10. References

- TSIA 2024 Support Operations Benchmark — tier cost, SLA attainment, deflection rates
- Zendesk CX Trends 2024 — FRT, CSAT, channel preferences
- ICMI 2023 Global Contact Center Performance — capacity planning, occupancy
- Freshdesk Customer Service Benchmark 2024 — multi-tier support, KB deflection
- Gainsight Customer Success Benchmarks 2024 — CSAT, NRR linkage
- CustomerGauge 2024 CSAT Benchmarks — industry CSAT distributions
- Gartner 2024 Customer Service Magic Quadrant — deflection / self-service trends
- SQM Group 2024 — resolution time, FCR benchmarks
- Harvard Business Review "The First 90 Days" — linked from P11 (manager ramp)
- ICMI / SWPP workforce optimization guidance — occupancy 70-85%

---

**End of spec. Awaiting user review.**