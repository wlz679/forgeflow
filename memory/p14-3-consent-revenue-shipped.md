---
date: 2026-07-13
commit: b6d45a7 (+ baac5cc amend)
engine: consent-revenue-impact-calculator
category: L (Legal & Compliance)
series: P14
status: shipped
---

# P14-3 Cookie Consent Revenue Impact Calculator — Shipped

## What shipped

- **Engine:** `src/engines/legal-compliance/consent-revenue-impact-calculator.ts` (NEW, 187 lines)
- **Tests:** `tests/consent-revenue-impact-calculator.test.ts` (NEW, **15 math tests**)
- **ToolMeta:** `src/data/tools/legal-compliance.ts` third entry
- **OG sample:** `src/data/og-samples.json` en + zh
- **Codegen:** `scripts/codegen-examples.mjs` ENGINES entry
- **Bumps:** `tests/ab-split.test.ts` 94→95 (engines + tools); `tests/internal-links.test.ts` 94→95
- **Barrel:** `src/engines/legal-compliance/index.ts` +1 line (P14-0 + P14-1/2 already done)
- Engine count: 94 → **95**

## Inputs (4) — AOV hardcoded per spec gap

| name | label | type |
|---|---|---|
| monthly_visitors | Monthly visitors | number |
| current_consent_rate_pct | Current consent rate (%) | number |
| target_consent_rate_pct | Target consent rate (%) | number |
| conversion_rate_pct | Conversion rate (%) | number |

> **SPEC GAP ACKNOWLEDGED**: spec §3.3 lists 4 inputs but the math requires AOV to recover revenue. Per plan decision, **AOV_EUR = 80** hardcoded in BOTH `generate()` and `customFn` (mid-market B2B SaaS ARPU benchmark). FAQ explains — user can rescale in mind (multiply by ARPU/€80).

## Math

- `consent_gap_pp = max(0, target - current)` — CLAMPED to [0, 100] for current/target
- `monthly_recoverable_visitors = visitors × (gap / 100)`
- `monthly_recovered_revenue = recoverable_visitors × (conv / 100) × AOV_EUR`
- `annual_recovered_revenue = monthly × 12`

## HEALTH_BANDS (INVERSE; critical = Infinity)

- 🟢 excellent: gap < 5 pp
- 🟡 good: 5 pp ≤ gap < 15 pp
- 🟠 warning: 15 pp ≤ gap < 30 pp
- 🔴 critical: gap ≥ 30 pp

INVERSE direction: smaller gap = better. Larger gap = worse revenue exposure.

## Canonical (per spec §3.3)

`visitors=200K · current=55% · target=75% · conv=2% · AOV=€80` →
- gap = 20 pp
- monthly_recoverable = 200K × 0.20 = 40K visitors
- monthly_recovered = 40K × 0.02 × €80 = **€64,000/mo**
- annual_recovered = **€768,000/yr**
- Band: 20 pp ≥ 15 pp → **🟠 Warning**

Verified: `{"gap":20,"monthly":64000,"annual":768000,"band":"warning"}`

## Cross-links

- **L-6 CMP ROI** (upstream pair): premium CMP vendors lift consent 10-15pp within 4-6 weeks; L-3 quantifies the recoverable revenue that uplift unlocks.
- **P-1 Funnel Step** (downstream pair): consent wall is the top step-leak for EU traffic.

## Lessons

1. **Spec gap (AOV)**: Spec §3.3 lists 4 inputs but revenue math requires an AOV anchor. Plan decision: hardcode €80 (B2B SaaS ARPU) + FAQ explanation. NOT adding 5th input — would change plan input count from 4 to 5 retroactively.
2. **Break-Even 4.9 epsilon (mid-flight fix)**: Initial formula `target - 5` yielded exactly 5pp gap (technically warning, band boundary). Replaced with `target - 4.9` so the displayed "70.1%" → produces gap=4.9pp which IS excellent under strict-< band. Amend commit `baac5cc`.
3. **Brief math ≠ math** (catch pattern): Brief proposed "70% lift to Excellent" but math says 5pp gap (Good, not Excellent) — same P8-5/P7-3/P14-1 lesson continues.
4. **Clamping defensively in both helpers AND customFn**: `consentGap()` clamps [0,100] in helper; customFn also clamps `if (current < 0) current = 0; if (current > 100) current = 100;` — defense-in-depth.
5. **INVERSE band direction (P9-4 precedent)**: `calcHealthBand` has same structure as P9-4 logo-churn-rate — gap larger = worse. Same pattern: thresholds in ascending order, `<` comparator in branches.
6. **Mid-market €10M-€50M ARR anchor**: All L-category engines use EU pricing (€) + GDPR/ePrivacy regulatory anchors. Different from K-category ($/US/TSIA) and P10 ($/B2B SaaS).

## Verification

- `node --import tsx tests/consent-revenue-impact-calculator.test.ts` → **15/15 pass**
- `node --import tsx tests/ab-split.test.ts` → 9/9 pass (95 engines + 95 tools)
- `node --import tsx tests/internal-links.test.ts` → 6/6 pass
- `node scripts/codegen-examples.mjs --check` → 95/95 PASS exit 0
- Engine imports cleanly via tsx (TS source parses, no linter error)
- customFn parses cleanly as valid JS via `new Function('inputs', 'pick', 'fill', body)` — though `return run(...)` wrapper added in P14-7 holistic fix-wave to ensure runtime return
- Both `git push origin HEAD` and `git push github HEAD` → both `git rev-list ...HEAD` = 0 ahead

## File paths (absolute)

- Engine: `D:\E\独立站\youtube-tools\src\engines\legal-compliance\consent-revenue-impact-calculator.ts`
- Tests: `D:\E\独立站\youtube-tools\tests\consent-revenue-impact-calculator.test.ts`
- ToolMeta: `D:\E\独立站\youtube-tools\src\data\tools\legal-compliance.ts`
- OG: `D:\E\独立站\youtube-tools\src\data\og-samples.json`
- Codegen: `D:\E\独立站\youtube-tools\scripts\codegen-examples.mjs`
- Index barrel: `D:\E\独立站\youtube-tools\src\engines\legal-compliance\index.ts`
- Memory: `D:\E\独立站\youtube-tools\memory\p14-3-consent-revenue-shipped.md` (this file)
