---
date: 2026-07-13
commit: 5496e50
engine: dpa-cost-calculator
category: L (Legal & Compliance)
series: P14
status: shipped
---

# P14-4 DPA Negotiation Cost Calculator — Shipped

## What shipped

- **Engine:** `src/engines/legal-compliance/dpa-cost-calculator.ts` (NEW, ~187 lines)
- **Tests:** `tests/dpa-cost-calculator.test.ts` (NEW, **11 math tests**)
- **ToolMeta:** `src/data/tools/legal-compliance.ts` fourth entry
- **OG sample:** `src/data/og-samples.json` en + zh
- **Codegen:** `scripts/codegen-examples.mjs` ENGINES entry
- **Bumps:** `tests/ab-split.test.ts` 95→96 (engines + tools); `tests/internal-links.test.ts` 95→96
- **Barrel:** `src/engines/legal-compliance/index.ts` +1 line
- Engine count: 95 → **96**

## Inputs (5)

| name | label | type |
|---|---|---|
| dpas_per_quarter | DPAs per quarter | number |
| avg_negotiation_rounds | Average negotiation rounds | number |
| hours_per_round | Legal hours per round | number |
| legal_hourly_rate | Legal hourly rate (€/hr) | number |
| redlines_per_dpa | Redlines per DPA | number |

## Math

- `dpa_base_hours = rounds × hours_per_round`
- `redline_multiplier = 1 + (redlines × 0.05)` — Fieldfisher 2024 benchmark, each redline +5%
- `annual_dpa_cost = dpas × 4 × base_hours × rate × redline_multiplier`
- `cost_per_dpa = base_hours × rate × redline_multiplier`

## HEALTH_BANDS (HIGHER; critical = Infinity)

- 🟢 excellent: < €100K/yr
- 🟡 good: €100K ≤ cost < €300K
- 🟠 warning: €300K ≤ cost < €600K
- 🔴 critical: ≥ €600K

## Canonical (per spec §3.4)

`dpas=40/q · rounds=4 · hours_per_round=1.5 · rate=€250/hr · redlines=8` →
- base_hours = 4 × 1.5 = 6
- redline_multiplier = 1 + (8 × 0.05) = 1.4×
- cost_per_dpa = 6 × 250 × 1.4 = €2,100
- annual_dpa_cost = 40 × 4 × 2,100 = **€336,000/yr**
- Band: €336K ≥ €300K < €600K → **🟠 Warning**

Verified: `{"baseHours":6,"multiplier":1.4,"perDPA":2100,"annual":336000,"band":"warning"}`

## Cross-links

- **P8-1 Pipeline Value** (downstream): DPA rounds delay deal close — extra negotiation days hold weighted pipeline; pair to quantify the revenue waiting behind legal review.
- **L-1 GDPR Fine** (risk context): compliance cost compounds with sales-cycle risk; review savings should not compromise Art. 28 processor safeguards.

## Lessons

1. **First engine with `return run(inputs, pick, fill);` wrapper from start**: P14-1/2/3 missed the wrapper and pages returned undefined silently; P14-4 implementer caught the pattern (mid-task) and used it correctly. P14-7 holistic fix-wave retroactively added wrappers to P14-1/2/3, but P14-4 onward ships clean.
2. **`.ts` suffix in codegen ENGINES entry**: `file: 'dpa-cost-calculator'` (no extension) vs `file: 'gdpr-fine-calculator.ts'` (with extension) — codegen-examples.mjs `path.join` semantics required the suffix. P14-1 commit got this wrong first time; P14-4 onward correct.
3. **Break-Even `targetAnnual = threshold - 1` (P14-5 lesson learned)**: P-series strict-< bands require `target_annual = HEALTH_BANDS.excellent.threshold - 1` (e.g. €99,999) so the displayed "easier path" actually lands in Excellent. Without epsilon, target=€100K leaves gap €1 from threshold.
4. **Three-path Break-Even (redlines vs DPAs vs rounds)**: Path A: reduce redlines to ≤targetRedlines/DPA. Path B: reduce DPA volume to ≤targetDpas/quarter. Path C: reduce rounds to ≤1.2 (template-first, viable only if `rounds > 1.2` AND `newAnnualAt1.2 < targetAnnual`). Sort paths by `% reduction` to pick easiest.
5. **What-If verb guard (P14-7 lesson)**: `altVerb = altAnnual < annual ? 'drops to' : 'is already optimal at'`. Same fix-wave pattern applied to P14-1/4/5 — adopt in all future L-category.
6. **Math.floor for band-sensitive display**: Health line uses `Math.floor(annual)` to ensure displayed cost NEVER equals threshold (e.g. €100,000 displayed would be warning per `<` rule, but rounding could push it to display as "€100K" which would be misread as good). Mid-flight fix.

## Verification

- `node --import tsx tests/dpa-cost-calculator.test.ts` → **11/11 pass**
- `node --import tsx tests/ab-split.test.ts` → 9/9 pass (96 engines + 96 tools)
- `node --import tsx tests/internal-links.test.ts` → 6/6 pass
- `node scripts/codegen-examples.mjs --check` → 96/96 PASS exit 0
- Engine imports cleanly via tsx
- customFn parses cleanly as valid JS (~3400 chars) and returns array correctly via `return run(inputs, pick, fill);` wrapper
- Both `git push origin HEAD` and `git push github HEAD` → 3-way sync 0/0

## File paths (absolute)

- Engine: `D:\E\独立站\youtube-tools\src\engines\legal-compliance\dpa-cost-calculator.ts`
- Tests: `D:\E\独立站\youtube-tools\tests\dpa-cost-calculator.test.ts`
- ToolMeta: `D:\E\独立站\youtube-tools\src\data\tools\legal-compliance.ts`
- OG: `D:\E\独立站\youtube-tools\src\data\og-samples.json`
- Codegen: `D:\E\独立站\youtube-tools\scripts\codegen-examples.mjs`
- Index barrel: `D:\E\独立站\youtube-tools\src\engines\legal-compliance\index.ts`
- Memory: `D:\E\独立站\youtube-tools\memory\p14-4-dpa-cost-shipped.md` (this file)
