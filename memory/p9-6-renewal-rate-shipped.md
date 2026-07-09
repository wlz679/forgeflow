---
name: p9-6-renewal-rate-shipped
description: P9-6 Renewal Rate Calculator 已 ship 2026-07-09 (commit 83c64c0)；67→68 engines；2 inputs + 11 math tests；gross retention 的 renewal 切片
metadata:
  type: project
---

P9-6 Renewal Rate Calculator 已 ship 2026-07-09 (commit 83c64c0)。

**Canonical math:**
- arrUpForRenewal = 1M, arrRenewed = 850K → 85% (🟡 Good, mid-market median)
- 4-band: 🟢 ≥90% (world-class) · 🟡 80-90% (good) · 🟠 70-80% (warning) · 🔴 <70% (critical)

**Files:**
- `src/engines/retention/renewal-rate-calculator.ts` (~150 lines, 2 inputs: arrUpForRenewal + arrRenewed)
- `tests/renewal-rate-calculator.test.ts` (11 tests: 6 math + 5 health bands)
- 6 supporting files: barrel + ToolMeta + OG + codegen + 2 test count bumps

**Tests:**
- 11/11 pass (renewal-rate + ab-split 68 + internal-links 68)
- Full pnpm check: 574/574 pass (was 545 → +29: 11 renewal + 18 cross-cutting)
- CustomFn 975 chars parses OK

**Lessons:**
- **CustomFn string escape** — 用 Node appendFileSync + 显式 escape (`\n`, `\"`, `\\`) 干净；Template literal `${...}` 不需要 escape 因为 outer 单引号不会 conflict
- **Renewal Rate vs GRR** — Renewal rate 只看 contract 是否续约，cleanest gross signal；GRR 折算 downgrades+churn 更全面；互补不是冗余
- **Mid-market benchmark** — 85% mid-market median, 90%+ top-quartile; 70% 以下 critical

**Dual push:**
- gitee: `0a47a52..83c64c0` ✓
- github: `0a47a52..83c64c0` ✓

相关: [[p9-5-customer-health-score-shipped]], [[p9-trilogy-complete]], [[p9-series-shipped]]