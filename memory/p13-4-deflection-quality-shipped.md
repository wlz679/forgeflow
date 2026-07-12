---
date: 2026-07-12
commit: 69ff23f
engine: deflection-quality-calculator
category: K (Knowledge/Documentation)
series: P13
status: shipped
---

# P13-4 Deflection Quality Calculator — Shipped

## What shipped

- **Engine:** `src/engines/knowledge/deflection-quality-calculator.ts` (NEW, 134 lines)
- **Tests:** `tests/deflection-quality-calculator.test.ts` (NEW, **10 math tests**)
- **ToolMeta:** `src/data/tools/knowledge.ts` fourth entry (4 inputs, 9 keywords, KB/Chatbot/Both options)
- **OG sample:** `src/data/og-samples.json` en + zh
- **Codegen:** `scripts/codegen-examples.mjs` ENGINES entry (canonical 1750/210/90/Both)
- **Bumps:** `tests/ab-split.test.ts` 89→90 (engines + tools); `tests/internal-links.test.ts` 89→90
- Engine count: 89 → **90** (P13 series on track for 92 final)

## Inputs (4)

| name | label | type |
|---|---|---|
| tickets_deflected_30d | Tickets deflected (30d) | number |
| tickets_reopened_30d | Tickets reopened (30d) | number |
| target_quality_pct | Target quality % (no reopen) | number |
| deflection_source | Deflection source (KB / Chatbot / Both) | select |

## Math

- `reopen_rate = reopened / deflected` (zero divisor guard → 0)
- `quality_pct = max(0, 100 - reopen * 100)`
- `gap_pct = target - quality_pct`
- `lift_to_excellent = max(0, reopened - 0.08 * deflected)` (What-If)

## HEALTH_BANDS (INVERSE direction, Infinity critical)

- 🟢 excellent: reopen ≤ 8% (quality ≥ 92%)
- 🟡 good:      reopen ≤ 15% (quality ≥ 85%)
- 🟠 warning:   reopen ≤ 25% (quality ≥ 75%)
- 🔴 critical:  reopen > 25% (Infinity threshold)

`calcHealthBand(reopen)` — **1-arg signature** (NOT 2-arg like K-3 composite).

## Canonical (per spec §3.4)

`deflected=1750, reopened=210, target=90%, source='Both'`
→ reopen 12% (0.12) → 🟡 **Good** (≤15% threshold) · quality 88% · +2pp gap to 90% target · 70 fewer reopens/mo at excellent.

## Lessons

1. **INVERSE band with Infinity critical**: K-4 is the 3rd INVERSE-direction engine (after P9-4 Logo Churn + P12-1 Cost-per-Ticket). Critical threshold MUST be `Infinity` so any value > 0.25 falls through. Using `-Infinity` (like K-1/K-2 NORMAL-direction bands) would make EVERY value fail since `0.08 <= -Infinity` is always false but `0.10 <= -Infinity` is also false. The cascade relies on Infinity correctly capturing "everything above warning".

2. **Boundary test discipline**: K-4 has 5 explicit boundary tests (0.08, 0.081, 0.15, 0.25, 1.0) — the brief specified them as critical for catching off-by-one errors in the ≤ cascade. Test "0.081 → good" is the most subtle: 0.081 is barely above 0.08, but ≤ 0.15 → good, NOT excellent. This is what protects against the "near-boundary" footgun.

3. **1-arg calcHealthBand signature lock**: K-3 uses 2-arg (composite dual-metric). K-4 uses 1-arg (single reopen metric). Test #10 asserts `calcHealthBand.length === 1` to lock the signature. Without this, a future refactor could accidentally make K-4 accept 2 args and break the call sites (customFn uses `reopen <= 0.08 ? ...` cascade, doesn't pass the band function).

4. **Single-direction band vs composite band**: K-3 (composite) required AND-band logic — both thresholds must hold for tier match. K-4 (single) is simple ≤ cascade. The structural difference is `HEALTH_BANDS.critical.threshold`: K-3 uses dual fields (`{ ctr: -Infinity, noResult: Infinity }`), K-4 uses single field (`{ threshold: Infinity }`). The pattern tracks the metric dimensionality.

5. **`deflection_source` informational select**: K-4 adds a 4th input (vs K-2's 3 numeric + 1 select, K-3's 3 numeric + 1 select). The select is informational — it shows up in the Snapshot line but doesn't change math. This matches K-3's `industry_benchmark` (informational select) pattern. Both are useful for niche introspection without complicating the calc.

6. **Canonical inputs match spec exactly**: 1750/210/90/Both — reopened 210/1750 = 0.12 exactly (no float drift). Test 1+2 use `assert.equal(reopen, 0.12)` (strict equality, not `Math.abs < 1e-9`). The 210/1750 ratio is a clean fraction — verifies IEEE 754 doesn't surprise us in the canonical case.

## Verification

- `node --import tsx tests/deflection-quality-calculator.test.ts` → **10/10 pass**
- `node --import tsx tests/ab-split.test.ts tests/internal-links.test.ts` → 15/15 pass (engines=90, tools=90, all related-lists 4-each)
- `node scripts/codegen-examples.mjs --check` → **90/90 PASS exit 0**
- Engine imports cleanly via tsx (TS source parses, `HEALTH_BANDS` + `calcHealthBand` + `reopenRate` + `qualityPct` + `gapToTarget` all exported)
- Both `git push origin HEAD` (gitee) and `git push github HEAD` → both `git rev-list ...HEAD` = 0 ahead
- Memory file `p13-4-deflection-quality-shipped.md` (this) + MEMORY.md index updated

## File paths (absolute)

- Engine: `D:\E\独立站\youtube-tools\src\engines\knowledge\deflection-quality-calculator.ts`
- Tests: `D:\E\独立站\youtube-tools\tests\deflection-quality-calculator.test.ts`
- ToolMeta: `D:\E\独立站\youtube-tools\src\data\tools\knowledge.ts`
- OG: `D:\E\独立站\youtube-tools\src\data\og-samples.json`
- Codegen: `D:\E\独立站\youtube-tools\scripts\codegen-examples.mjs`
- Index barrel: `D:\E\独立站\youtube-tools\src\engines\knowledge\index.ts`
- Memory: `D:\E\独立站\youtube-tools\memory\p13-4-deflection-quality-shipped.md` (this file)
