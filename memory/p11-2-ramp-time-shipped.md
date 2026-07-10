---
name: p11-2-ramp-time-shipped
description: P11-2 Time to Productivity (Ramp Time) 已 ship 2026-07-10 (commit 86b29f2)；75→76 engines；3 inputs (role_level/ramp_weeks/industry_complexity) + 10 tests + 6-section v3；DUAL-BAND (IC vs Manager) — IC 4/8/16/Inf, Manager 8/16/26/Inf；canonical IC 8w × Med 1.0 = 8w (Good)
metadata:
  type: project
---

P11-2 Time to Productivity (Ramp Time) 已 ship 2026-07-10 (commit 86b29f2)。

**Canonical math:** IC, 8w × 1.0 (Med complexity) = 8w adjusted (Good for IC).

**Files:** src/engines/hiring-team/time-to-productivity-calculator.ts (~110 lines), tests/time-to-productivity-calculator.test.ts (10 tests: 4 math + 5 band + 1 metadata).

**Bands (DUAL-TABLE — INVERSE, lower better):**
- IC: ≤4w Excellent · 4-8w Good · 8-16w Warning · >16w Critical (Inf)
- Manager: ≤8w Excellent · 8-16w Good · 16-26w Warning · >26w Critical (Inf)

**Sources:** LinkedIn Talent Insights 2024 + HBR First 90 Days + Pave 2024.

**Lessons:**
- Dual-band pattern via HEALTH_BANDS.IC / HEALTH_BANDS.Manager nested objects; calcHealthBand(weeks, role) routes to correct sub-table.
- Complexity multiplier: Low=0.75 / Med=1.0 / High=1.4 (industry domain context).
- INVERSE band direction with Infinity critical threshold (P9-4 lesson applied to BOTH sub-tables).
- Static-examples[0] Break-Even label auto-synced by codegen (matched band label not target band).