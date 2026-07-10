---
name: p11-1-fully-loaded-shipped
description: P11-1 Fully-Loaded Employee Cost 已 ship 2026-07-10 (commit 9a1d9e4)；74→75 engines；4 inputs (base_salary/benefits_pct/payroll_tax_pct/overhead_pct) + 11 math tests + 6-section v3；canonical $120K + 25%+8%+15% = $177,600 / 1.48x (Warning, display rounds to $178K)
metadata:
  type: project
---

P11-1 Fully-Loaded Employee Cost 已 ship 2026-07-10 (commit 9a1d9e4)。

**Canonical math:** $120K × (1 + 25% + 8% + 15%) = $120K × 1.48 = **$177,600** (math exact) → display rounds to **$178K** (1.48x multiplier, Warning).

**Files:** src/engines/hiring-team/fully-loaded-employee-cost-calculator.ts (~120 lines), tests/fully-loaded-employee-cost-calculator.test.ts (11 tests: 5 math + 5 bands + 1 metadata).

**Bands (INVERSE — lower better):** ≤1.25 Excellent · 1.25-1.40 Good · 1.40-1.60 Warning · >1.60 Critical (Infinity threshold).

**Sources:** BLS ECEC 2024 + SHRM 2024 Benefits Survey + Pave comp benchmarks.

**Lessons:**
- Canonical "$178K" was display-rounded; actual math is $177,600. Updated test + staticExamples to math-exact value, kept display as $178K (rounded).
- New 'H' category registered; both ROOT barrel pre-emptive fixes (engines/index.ts + tools/index.ts) verified working from P11-0 scaffold — no mid-flight fix needed.
- 6/6 of 6-section v3 (Health · Snapshot · What-If · Break-Even · Milestone · Tip) with emoji prefixes.
- faq 6 entries + howToUse 5 steps + sources 3 URLs — all match P10 template.
- 4 INVERSE band direction (P9-4 lesson applied with Infinity critical threshold).