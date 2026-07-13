---
date: 2026-07-13
commit: 7af8fe7
engine: dsar-cost-calculator
category: L (Legal & Compliance)
series: P14
status: shipped
---

# P14-2 DSAR Processing Cost Calculator — Shipped

## What shipped

- **Engine:** `src/engines/legal-compliance/dsar-cost-calculator.ts` (NEW)
- **Tests:** `tests/dsar-cost-calculator.test.ts` (NEW, **12 math tests**)
- **ToolMeta:** `src/data/tools/legal-compliance.ts` second entry
- **OG sample:** `src/data/og-samples.json` en + zh
- **Codegen:** `scripts/codegen-examples.mjs` ENGINES entry
- **Bumps:** `tests/ab-split.test.ts` 93→94 (engines + tools); `tests/internal-links.test.ts` 93→94
- **Barrel:** `src/engines/legal-compliance/index.ts` +1 line (P14-0 + P14-1 already done)
- Engine count: 93 → **94** (P14 series on track for 98)

## Inputs (4)

| name | label | type |
|---|---|---|
| dsars_per_month | DSARs per month | number |
| hours_per_dsar | Manual hours per DSAR | number |
| hourly_rate_dpo | DPO hourly rate (€/hr) | number |
| automation_pct | Automation (%) | number |

## Math

- `manual_hours_per_dsar = hours × (1 - automation_pct / 100)` — CLAMPED to [0, 100]
- `annual_cost = dsars × 12 × manual_hours × rate`
- `cost_per_dsar = manual_hours × rate`

## HEALTH_BANDS (HIGHER; critical = Infinity)

- 🟢 excellent: < €25K/yr
- 🟡 good: €25K ≤ cost < €100K
- 🟠 warning: €100K ≤ cost < €300K
- 🔴 critical: ≥ €300K

## Canonical (per spec §3.2)

`dsars=50/mo · hours=2.5 · rate=95 · automation=30%`
→ manual=1.75 hr/DSAR · perDSAR=€166.25 · annual=€99,750/yr (🟡 Good)

Verified: `{"manual":1.75,"annual":99750,"perDSAR":166.25,"band":"good"}`

## Cross-links

- **L-6 CMP ROI** (upstream): CMP reduces DSAR volume via consent logging → L-6 cost savings feed L-2 volume reduction.
- **P12-1 Cost-per-Ticket** (downstream pair): DSAR cost = DSARs × per-DSAR cost; P12-1 cost-per-ticket is the natural pair for non-DSAR support cost.
- **L-1 GDPR Fine** (risk context): L-1 = worst-case regulatory exposure; L-2 = routine ops run-rate. Different budget lines (risk vs ops).

## Lessons

1. **Float precision in assertions**: IEEE 754 produces `0.7500000000000001` from clean inputs (`2.5 × 0.3`). Use `Math.abs(a - b) < 1e-9` not `assert.equal` for non-integer expectations. Tests 11 + 12 needed mid-flight fix from strict equal to approx comparison.
2. **Brief prose ≠ math**: Brief proposed "🟢 Excellent" at 60% automation (€57K) but math says "🟡 Good" (€25K-€100K band). Followed math > prose (P8-5/P7-3 lesson — same as P14-1 10× typo / 3.20% ratio Critical bug). Added educational note: "Push past ~82% automation to reach 🟢 Excellent (<€25K)".
3. **Clamping is defensive**: `automation_pct` clamp to [0, 100] in `manualHoursPerDSAR()` and `costPerDSAR()` (not just in customFn) — even if caller passes invalid input, helper functions return well-defined values. Test 10 verifies -25%/200% inputs.
4. **Break-Even math correctness (lesson learned)**: Brief warned NOT to replicate L-1 `needViolations` tautology. L-2 Break-Even computes a meaningful target: target_manual_hours = 25000 / (dsars × 12 × rate); need_automation = 1 - (target_manual_hours / hours). Clamp to [0, 100]. For canonical (50/2.5/95/30): need_automation ≈ 82% OR cut DSARs to ≤13/mo.
5. **Mid-market €10M-€50M ARR anchor**: All L-category engines use EU pricing (€) and EU regulations (GDPR Art. 15, ICO DSAR code). Different from K-category ($/US/TSIA benchmarks).

## Verification

- `node --import tsx tests/dsar-cost-calculator.test.ts` → **12/12 pass**
- `node --import tsx tests/ab-split.test.ts` → 9/9 pass (94 engines + 94 tools)
- `node --import tsx tests/internal-links.test.ts` → 6/6 pass
- `node scripts/codegen-examples.mjs --check` → 94/94 PASS exit 0
- Engine imports cleanly via tsx (TS source parses, no linter error)
- customFn parses cleanly as valid JS (2608 chars) via `new Function('inputs', 'pick', 'fill', body)`
- Both `git push origin HEAD` and `git push github HEAD` → both `git rev-list ...HEAD` = 0 ahead
- `SKIP_PRECOMMIT_CHECK=1` used per CLAUDE.md authorized escape (4 Header Clerk build-cache flakes NOT my changes)

## File paths (absolute)

- Engine: `D:\E\独立站\youtube-tools\src\engines\legal-compliance\dsar-cost-calculator.ts`
- Tests: `D:\E\独立站\youtube-tools\tests\dsar-cost-calculator.test.ts`
- ToolMeta: `D:\E\独立站\youtube-tools\src\data\tools\legal-compliance.ts`
- OG: `D:\E\独立站\youtube-tools\src\data\og-samples.json`
- Codegen: `D:\E\独立站\youtube-tools\scripts\codegen-examples.mjs`
- Index barrel: `D:\E\独立站\youtube-tools\src\engines\legal-compliance\index.ts`
- Memory: `D:\E\独立站\youtube-tools\memory\p14-2-dsar-cost-shipped.md` (this file)
