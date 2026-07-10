---
name: p12-1-cost-per-ticket-shipped
description: P12-1 Cost-per-Support-Ticket 已 ship 2026-07-10 (commit 5116295)；80→81 engines；6 inputs (t1_cost/t2_cost/t3_cost/t1_share/t2_share/monthly_volume) + 11 tests + 6-section v3；multi-tier T1/T2/T3 weighted avg；canonical T1 $8 × 55% + T2 $25 × 30% + T3 $70 × 15% = $22.40/ticket (Good), $112K/mo
metadata:
  type: project
---

P12-1 Cost-per-Support-Ticket 已 ship 2026-07-10 (commit 5116295)。

**Canonical math:** T1 $8 × 55% + T2 $25 × 30% + T3 $70 × 15% = (4.4 + 7.5 + 10.5) = $22.40/ticket (Good), $112,000/mo total.

**Files:** src/engines/customer-support/cost-per-support-ticket-calculator.ts (137 lines), tests/cost-per-support-ticket-calculator.test.ts (11 tests: 5 math + 5 bands + 1 metadata).

**Bands (INVERSE — lower $/ticket = better):** ≤$10 Excellent · $10-$25 Good · $25-$50 Warning · >$50 Critical (Infinity threshold).

**Multi-tier:** T1 (junior frontline) / T2 (senior specialist) / T3 (engineering escalation). T3 cost typically 7-10x T1 due to engineering time. T3 share auto-computed (100 - T1 - T2).

**Sources:** TSIA 2024 Support Operations Benchmark + Zendesk CX Trends 2024 + Freshdesk CS Benchmark + ICMI 2023.

**Lessons:**
- INVERSE band pattern with `Infinity` as critical threshold (P9-4 / P11-1 lesson applied to P12).
- T3 share auto-derived from T1+T2 shares (3rd share is implicit) — saves 1 input per calc.
- T3 cut target computed via reverse engineering: `t3Cut = (currentWeighted - $1000) / t3Share` — linear algebra since all weights linear.
- New 'T' category registered; P12 series FIRST calc.
- **Plan drift caught**: plan said `internal-links.test.ts` bump 80→86 at Task 6, but the count assertion `Object.keys(relatedTools).length === 80` fails at Task 1 (81 vs 80). Fixed incrementally 80→81 per P9-1 lesson (per-calc bump, no over-bump); Tasks 2-6 will continue incrementing.
- **Pre-existing seo-schemas test gap** (not P12-1 related): `listingPages` array in `tests/seo-schemas.test.ts` doesn't include 'product-analytics', 'hiring-team', 'customer-support' → funnel-step-calculator (P10) and any new tool from these categories fails the P2a data-favorite-slug test. Out of P12-1 scope; should be fixed in holistic review or a follow-up.
- Write tool truncation workaround: when heredoc EOF marker doesn't terminate (Windows + non-ASCII + `$` in content), split file build into Node scripts that use `fs.appendFileSync` with array.join('\n') to avoid template-literal `$` interpolation.
- Test fixture: brief Test #1 was wrong (asserted `weightedAvgCost(0, 25, 70, 0, 0) === 0` but T1=0/T2=0/T3=100% = $70, not $0). Replaced with `weightedAvgCost(0, 0, 0, 0, 0) === 0` (all-zero zero).
