---
name: p11-6-attrition-cost-shipped
description: P11-6 Attrition Cost 已 ship 2026-07-10 (commit 3e7e446)；79→80 engines (FINAL batch bump)；5 inputs (annual_salary/recruiting_cost/ramp_weeks/lost_productivity_months/role_level) + 11 tests + 6-section v3；3-component formula (recruiting+ramp+lost_prod) + role_multiplier；canonical $120K, $8K, 12w, 6mo, IC = $81,846 / 68.2% (Good)
metadata:
  type: project
---

P11-6 Attrition Cost 已 ship 2026-07-10 (commit 3e7e446)。

**Canonical math:** $120K salary, $8K recruiting, 12w ramp, 6mo lost prod, IC
- recruiting = $8,000
- ramp_cost = ($120,000/52) × 12 × 0.5 = $13,846
- lost_productivity = ($120,000/12) × 6 × 1.0 (IC mult) = $60,000
- total = $81,846 = 68.2% of salary (Good)

**Files:** src/engines/hiring-team/attrition-cost-calculator.ts (~140 lines), tests/attrition-cost-calculator.test.ts (11 tests: 6 math + 4 band + 1 metadata).

**Bands (INVERSE — lower % = better cost control):** ≤50% Excellent · 50-100% Good · 100-200% Warning · >200% Critical (Infinity).

**Role multiplier:** IC=1.0 / Manager=1.5 (Manager lost_prod cost 1.5x IC).

**Sources:** SHRM 2022 Human Capital Benchmarking + Gallup attrition research + Pave turnover cost.

**Lessons:**
- 3-component formula: recruiting + ramp + lost_productivity. Each testable independently.
- ramp_cost = (salary/52) * weeks * 0.5 — assumes 50% productive during ramp.
- role_multiplier (1.5x for Manager) captures team-wide productivity disruption beyond the leaver.
- INVERSE band direction (4th of 4 in P11) with Infinity critical threshold.
- P11 SERIES FINAL calc (80 engines, 13 categories). internal-links test bumped 74→80 here (not progressive — P8-0 over-bump lesson applied).
- Test 3 originally expected total=0 with salary=0; fixed to test pct=0 + ramp=0 + lp=0 (recruiting still real $).