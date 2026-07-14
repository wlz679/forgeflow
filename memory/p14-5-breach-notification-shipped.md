---
date: 2026-07-13
commit: c1422ad (rebased from 7f62ea5)
engine: breach-notification-cost-calculator
category: L (Legal & Compliance)
series: P14
status: shipped
---

# P14-5 Data Breach Notification Cost Calculator — Shipped

## What shipped

- **Engine:** `src/engines/legal-compliance/breach-notification-cost-calculator.ts` (NEW, ~175 lines)
- **Tests:** `tests/breach-notification-cost-calculator.test.ts` (NEW, **10 math tests**)
- **ToolMeta:** `src/data/tools/legal-compliance.ts` fifth entry
- **OG sample:** `src/data/og-samples.json` en + zh
- **Codegen:** `scripts/codegen-examples.mjs` ENGINES entry
- **Bumps:** `tests/ab-split.test.ts` 96→97 (engines + tools); `tests/internal-links.test.ts` 96→97
- **Barrel:** `src/engines/legal-compliance/index.ts` +1 line
- Engine count: 96 → **97**

## Inputs (4)

| name | label | type |
|---|---|---|
| breaches_per_year | Breaches per year | number |
| data_subjects_per_breach | Data subjects per breach | number |
| notification_cost_per_subject | Notification cost per subject (€/subject) | number |
| remediation_cost_per_breach | Remediation cost per breach (€) | number |

## Math

- `notification_cost = subjects × cost_per_subject`
- `cost_per_breach = notification_cost + remediation`
- `annual_breach_cost = breaches × cost_per_breach`

## HEALTH_BANDS (HIGHER; critical = Infinity)

- 🟢 excellent: < €50K/yr
- 🟡 good: €50K ≤ cost < €250K
- 🟠 warning: €250K ≤ cost < €1M
- 🔴 critical: ≥ €1M

Critical threshold €1M (EU mid-market breach benchmarks — ENISA Threat Landscape 2024).

## Canonical (per spec §3.5)

`breaches=1/yr · subjects=50K · cost_per_subject=€5 · remediation=€80K` →
- notification_cost = 50K × 5 = €250,000
- cost_per_breach = €250K + €80K = €330,000
- annual_breach_cost = 1 × €330K = **€330,000/yr**
- Band: €330K ≥ €250K < €1M → **🟠 Warning**

Verified: `{"notifCost":250000,"perBreach":330000,"annual":330000,"band":"warning"}`

## Cross-links

- **L-1 GDPR Fine** (upstream risk): a single breach typically triggers both notification cost + GDPR fine + customer churn. Combine L-1 × L-5 to model true single-incident cost.
- **R-1 NRR** (downstream customer impact): breach commonly causes 5-10pp NRR drop in the 12 months after disclosure (IAPP Privacy Enforcement Atlas 2024). CISOs reserve 3-6 months breach-recovery budget to manage retention bleed.

## Lessons

1. **Rebase required (background process)**: P14-5 implementer added `index.ts` barrel import AFTER main commit; meanwhile `chore(pricing)` sync arrived, requiring force-push via rebase to new SHA `c1422ad` (from `7f62ea5`). Lesson: complete barrel import BEFORE commit, not after.
2. **Three-path Break-Even with viability gate**: Path A (reduce breach frequency): `target_breaches = 49,999 / cost_per_breach`. Path B (data minimization — reduce subjects): `target_subjects_raw = (49,999 - remediation) / max(cps, 0.0001)`. For canonical (rem=€80K > targetAnnual=€49,999), Path B is **INFEASIBLE** — UI displays informative message: "Subject reduction alone cannot reach Excellent because remediation (€80,000) alone exceeds the threshold." Always show context when Path B is infeasible.
3. **P14-5 caught `Math.floor` boundary issue**: P14-4 exhibited display "€100,000" for cost exactly at warning threshold (good ≤ €100K < good shown). P14-5 fixed preemptively by always rounding up `Math.round(annual)` for display + `Math.round(notifCost)` etc. — never let display equal threshold.
4. **What-If verb guard (`altText`)**: `altText = altAnnual < annual ? 'drops to' : 'stays at'` — same P14-7 lesson applied: when 0.3 breach/yr produces less annual cost, "drops to €99K"; when 0.3 breach/yr is closer to current, "stays at €99K".
5. **GDPR Art. 33 / Art. 34 in Milestone**: `🩺 notify supervisory authority within 72h; Art. 34: notify data subjects without undue delay if high risk` — the 72h rule is the regulatory anchor even though our calc only models the cost (not the timing).
6. **`ifBetterWinBand` dead code (P8-6 lesson)**: No dead code in P14-5 ship, but the lesson is: any helper that's defined and never called should be removed before commit to avoid P8-6-style holistic catches.

## Verification

- `node --import tsx tests/breach-notification-cost-calculator.test.ts` → **10/10 pass**
- `node --import tsx tests/ab-split.test.ts` → 9/9 pass (97 engines + 97 tools)
- `node --import tsx tests/internal-links.test.ts` → 6/6 pass
- `node scripts/codegen-examples.mjs --check` → 97/97 PASS exit 0
- Engine imports cleanly via tsx
- customFn parses cleanly as valid JS (~3000 chars) and returns array correctly via `return run(inputs, pick, fill);` wrapper
- Both `git push origin HEAD` and `git push github HEAD` → 3-way sync 0/0 (after rebase force-push)

## File paths (absolute)

- Engine: `D:\E\独立站\youtube-tools\src\engines\legal-compliance\breach-notification-cost-calculator.ts`
- Tests: `D:\E\独立站\youtube-tools\tests\breach-notification-cost-calculator.test.ts`
- ToolMeta: `D:\E\独立站\youtube-tools\src\data\tools\legal-compliance.ts`
- OG: `D:\E\独立站\youtube-tools\src\data\og-samples.json`
- Codegen: `D:\E\独立站\youtube-tools\scripts\codegen-examples.mjs`
- Index barrel: `D:\E\独立站\youtube-tools\src\engines\legal-compliance\index.ts`
- Memory: `D:\E\独立站\youtube-tools\memory\p14-5-breach-notification-shipped.md` (this file)
