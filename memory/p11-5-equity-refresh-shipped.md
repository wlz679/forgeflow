---
name: p11-5-equity-refresh-shipped
description: P11-5 Equity Refresh Grant 已 ship 2026-07-10 (commit 14e5969)；78→79 engines；5 inputs (current_shares/years_since_grant/refresh_pool_pct/total_company_shares/role_criticality) + 11 tests + 6-section v3；3-step formula (pool/role/dilution) + years_factor boost；canonical 15,000 shares / 0.15% (Good)
metadata:
  type: project
---

P11-5 Equity Refresh Grant 已 ship 2026-07-10 (commit 14e5969)。

**Canonical math:** 10K shares · 3y · 1.5% pool · 10M total · Med
- pool_size = 10M × 1.5% = 150,000 shares
- years_factor = 1.0 + (4-3)/4 = 1.25
- adjusted_refresh = 150,000 × 8% × 1.25 = **15,000 shares**
- dilution = 15,000 / 10M = **0.15%** (Good)

**Files:** src/engines/hiring-team/equity-refresh-calculator.ts (~150 lines), tests/equity-refresh-calculator.test.ts (11 tests: 6 math + 4 band + 1 metadata).

**Bands (HIGHER — more dilution = better retention):** ≥0.20% Excellent · 0.10-0.20% Good · 0.05-0.10% Warning · <0.05% Critical (-Infinity).

**Role target %:** High=15% / Med=8% / Low=3% (share of pool this person receives).

**Sources:** Pave 2024 equity + Carta equity data + YC People Ops playbook.

**Lessons:**
- 3-step formula: pool_size → role_target × years_factor → dilution.
- years_factor boost: <4y grants get +0.25/yr (capped at +1.0). 4y+ = 1.0 (no boost).
- current_shares parameter is informational only — does not affect math. Fixed test to match (test 6 was testing wrong assumption).
- HIGHER band direction (2nd of 2 in P11) — critical threshold = -Infinity.
- Test count is 11 (P10 pattern: 6 math + 4 bands + 1 metadata).