---
name: p11-3-productivity-ramp-shipped
description: P11-3 Productivity Ramp Curve 已 ship 2026-07-10 (commit e30216c)；76→77 engines；4 inputs (months_to_full/starting_pct/curve_shape/monthly_cost) + 13 tests + 6-section v3；3 curve shapes S-Curve/Linear/SlowStart；canonical S-Curve 6mo = P50 month 3 = 50% of months_to_full (Good)
metadata:
  type: project
---

P11-3 Productivity Ramp Curve 已 ship 2026-07-10 (commit e30216c)。

**Canonical math:** S-Curve 6mo, 0% start → P50 at month 3 (50% of months_to_full, Good).

**Files:** src/engines/hiring-team/productivity-ramp-curve-calculator.ts (~140 lines), tests/productivity-ramp-curve-calculator.test.ts (13 tests: 6 math + 6 band + 1 metadata).

**Bands (INVERSE — lower P50% better):** ≤30% Excellent · 30-50% Good · 50-70% Warning · >70% Critical (Infinity).

**Curve formulas:**
- S-Curve: `p(t) = starting + (100-starting) / (1 + e^(-k*(t-t0)))`, k=12/months_to_full, t0=months_to_full/2
- Linear: `p(t) = starting + (100-starting) * (t/months_to_full)`
- SlowStart: `p(t) = starting + (100-starting) * (t/months_to_full)^2`

**Sources:** Bersin by Deloitte + Andrew Chen Cold Start Problem + Reforge.

**Lessons:**
- P50 month found by iterating 0.1mo steps until productivity ≥ 50%.
- Health band calcHealthBand takes p50Pct (0-100), converts to ratio internally. P11-3 is the FIRST P11 calc where the test/function signature is percentage (not decimal) — explicit conversion in function to keep HEALTH_BANDS thresholds as decimals.
- staticExamples[0] auto-synced by codegen: SlowStart P50 at month 4.3 (not 4.2 as spec said) — codegen computes exactly from formulas.
- INVERSE band direction with Infinity critical threshold (P9-4 lesson applied).