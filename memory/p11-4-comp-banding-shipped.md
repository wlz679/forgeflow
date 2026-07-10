---
name: p11-4-comp-banding-shipped
description: P11-4 Compensation Banding 已 ship 2026-07-10 (commit c5e4e02)；77→78 engines；5 inputs (role_title/base_salary/market_p25/market_p50/market_p75) + 11 tests + 6-section v3；piecewise-linear P25/P50/P75 percentile；canonical $160K = P54 (Good)
metadata:
  type: project
---

P11-4 Compensation Banding 已 ship 2026-07-10 (commit c5e4e02)。

**Canonical math:** $160K vs P25 $130K / P50 $155K / P75 $185K = 50 + ((160-155)/(185-155))*25 = 50 + 4.17 = **P54** (Good).

**Files:** src/engines/hiring-team/comp-banding-calculator.ts (~140 lines), tests/comp-banding-calculator.test.ts (11 tests: 6 math + 4 band + 1 metadata).

**Bands (HIGHER — paying more competitively is better):**
- ≥P75 Excellent (top-quartile retention signal)
- P50-P75 Good (competitive but not top-quartile)
- P25-P50 Warning (flight risk to competitors)
- <P25 Critical (-Infinity threshold)

**Math (piecewise-linear):**
- base ≤ p25: pct = (base / p25) × 25
- p25 < base ≤ p50: pct = 25 + ((base - p25) / (p50 - p25)) × 25
- p50 < base ≤ p75: pct = 50 + ((base - p50) / (p75 - p50)) × 25
- base > p75: pct = min(100, 75 + ((base - p75) / p75) × 25)

**Sources:** Pave 2024 + Levels.fyi 2024 + Carta comp reports.

**Lessons:**
- P11-4 is the 1st of 2 P11 calcs with HIGHER band direction (P11-5 also). Critical threshold = -Infinity (not Infinity like INVERSE bands).
- p25 === 0 / p50 === p25 / p75 === p50 guards added for safe division.
- role_title is a 'text' input (not 'number') — does not participate in math.
- 5 inputs all required per spec §5.2.