# P16 100-Milestone Batch — Design Spec

> **Date:** 2026-07-15
> **Status:** Approved (brainstorming complete)
> **Branch:** master
> **Scope:** Single P16 batch (7 commits, ~3.2 days)
> **Lines added/modified:** ~1200 LOC across 50+ files
> **Outcome:** 98 → 100 engines + full defense layer + zero P15 debt

## 1. Problem Statement

P15 ship (`9681775`) reached 98 engines across 15 categories. P15 deferred P15b (42 old-pattern engine sweep) and 4 polish items. Per user direction: **reach 100 engines + close all known debt BEFORE entering event-driven maintenance mode**.

Specifically:

1. **2 new engines needed** to reach 100 milestone. E-Commerce / Marketing is the chosen vertical (zero existing coverage; solopreneur hot search topic).
2. **42 old-pattern engines** across `freelance/hiring-team/saas/investment/cost/valuation/real-estate` use BIZ_CONFIG form rendering at `[slug].astro:1387-1454` — JS-embedded, NOT the new-pattern branch at line 940. They lack `step="any"` HTML5 defense, `clampNonNegative()` programmatic guard, and `cnn` customFn inlining. **High blast-radius if pattern fails** (deferred from P15 Task 11 due to API 429 pressure).
3. **4 P15 polish items** (env-test skip-marker, 3 test improvements, helpers.test.ts cleanup, LIFT_PERCENT constant). Mechanical small items; total ~80 LOC.
4. **Maintenance mode transition** is contingent on closing all known debt. Cannot enter maintenance with P15 polish items or 42 sweep remaining.

## 2. Decisions (from brainstorming Q&A)

| Decision | Choice | Rationale |
|---|---|---|
| 2 new engines vertical | E-Commerce / Marketing | Zero existing e-commerce coverage; highest search volume gap; solopreneur persona match |
| Engines to ship | `coupon-attribution-calculator` + `cart-abandonment-cost-calculator` | Solopreneur most-asked e-commerce questions (ROI of discounts + lost revenue from abandonment) |
| Category letter | M (Marketing), 6→8 | Marketing has 6 engines; natural fit; coupon/cart are marketing-driven metrics |
| Coupon cannibalization_pct definition | Industry-standard (Option 1): % of coupon orders that would have happened anyway | Shopify/BigCommerce/Klaviyo standard; intuitive input (industry default 30%); aligns with multiplicative Health band logic |
| P15b batching | 3 batches by alphabetical grouping | Matches P14-Followup precedent; valuation isolated as biggest single category; ~half-day per batch |
| Execution order | New engines first → Sweep → Polish → Ship | New engines establish clean v3 templates; if sweep has issues, 100 engines still intact |
| Polish bundling | Bundle into P16 (7th commit) | "P16 = truly debt-free" — maintenance mode starts with zero known debt |
| Review depth | Mechanical = 1 reviewer; integration (sweep batches) = 1 spec-verify + 1 quality reviewer | Per `subagent-driven-overhead.md` |
| Sample-verify before sweep | Yes — sample 1 BIZ_CONFIG engine before Batch 1 | Old-pattern form rendering at line 1387-1454 is different from line 940 |

## 3. Architecture

```
Browser
┌─────────────────────────────────────────────────────────────────────┐
│ New-pattern engines (P6-P14, 48 engines) ─ ALREADY DONE              │
│   <input type="number" step="any" min="0"> + clampNonNegative()      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Old-pattern engines (BIZ_*_*, 24 engines) ─ P16 TASK 3-5             │
│   Same pattern, different form rendering pipeline                   │
│   [slug].astro:1387-1454 (JS-embedded, NOT line 940)                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Pre-P5 solopreneur engines (~18 engines) ─ P16 TASK 3-5 (collapsed) │
│   Same BIZ_*_* pipeline, older engines                               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ 2 New Marketing engines (coupon + cart-abandonment) ─ P16 TASK 1-2    │
│   New-pattern, M category (6→8)                                     │
│   <input type="number" step="any" min="0"> + clampNonNegative() + cnn│
└─────────────────────────────────────────────────────────────────────┘

Tooling layer
┌─────────────────────────────────────────────────────────────────────┐
│ smoke-html5.mjs (P15 Task 4) — validates rendered HTML               │
│ verify-customfn.mjs (P15 Task 8) — handles 4 customFn styles         │
└─────────────────────────────────────────────────────────────────────┘
```

**⚠️ Critical overlap note:** BIZ_CONFIG engines (P15 spec said 24) and pre-P5 solopreneur engines (P15 spec said ~10) MAY overlap. P16 spec treats them as one sweep of 42 engines (the P15-actual count from `ls src/engines/{freelance,hiring-team,saas,investment,cost,valuation,real-estate}/*.ts` excluding `index.ts`). Implementer MUST verify actual count at execution time per P15 Task 11 skip note.

## 4. Components

### 4.1 Tasks 1-2: New Engines (M: 6→8)

#### Task 1: `coupon-attribution-calculator`

**Files:**
- Create: `src/engines/marketing/coupon-attribution-calculator.ts`
- Create: `tests/coupon-attribution-calculator.test.ts`
- Modify: `src/engines/marketing/index.ts` (add import)

**Inputs (5):**

| Name | Type | Default | Range | Description |
|---|---|---|---|---|
| `coupon_value` | $ | 20 | 0-10000 | Single coupon discount amount |
| `redemption_rate` | % | 10 | 0-100 | % of target audience who actually use coupon |
| `avg_order_value` | $ | 80 | 1-10000 | AOV when coupon is used (NOT baseline) |
| `baseline_revenue` | $ | 50000 | 0-10000000 | Period revenue WITHOUT coupon (comparison baseline) |
| `cannibalization_pct` | % | 30 | 0-100 | % of coupon orders that would have happened anyway (industry default 30%) |

**Outputs (6):**

| Name | Formula | Health band |
|---|---|---|
| `total_coupon_revenue` | `(baseline_revenue × redemption_pct) × AOV_with_coupon` | — |
| `incremental_revenue` | `total × (1 - cannibalization_pct)` | — |
| `cannibalization_loss` | `total × cannibalization_pct` | — |
| `coupon_cost` | `baseline_revenue × redemption_pct × coupon_value` | — |
| `net_revenue_gain` | `incremental - coupon_cost` | — |
| **`true_roi`** | `net / coupon_cost` | 🟢 ≥100% · 🟡 0-100% · 🔴 <0% |

**Canonical example:**
```
coupon_value=20, redemption_rate=10%, AOV=80, baseline=50000, cannibalization=30%
→ total_coupon_revenue = 5,000 × 80 = $400,000
→ incremental = 400,000 × 0.7 = $280,000
→ coupon_cost = 5,000 × 20 = $100,000
→ net = 280,000 - 100,000 = $180,000
→ ROI = 180,000 / 100,000 = 180% → 🟢 Good
```

**v3 standard**: Business variant (6+ sections: 🩺 Health · 🔄 What-If · ⚖️ Break-Even · 🎯 Milestone · 💡 Tip + 1 more)

**Health band helper text**: *"Cannibalization: not running A/B tests? Use 30% (industry avg). Shopify/Klaviyo standard definition."*

#### Task 2: `cart-abandonment-cost-calculator`

**Files:**
- Create: `src/engines/marketing/cart-abandonment-cost-calculator.ts`
- Create: `tests/cart-abandonment-cost-calculator.test.ts`
- Modify: `src/engines/marketing/index.ts` (add import)

**Inputs (6):**

| Name | Type | Default | Range | Description |
|---|---|---|---|---|
| `monthly_traffic` | int | 50000 | 0-10000000 | Monthly site visits |
| `cart_add_rate` | % | 20 | 0-100 | Add-to-cart rate (Shopify/Klaviyo default) |
| `cart_abandonment_rate` | % | 70 | 0-99 | % of carts that don't complete checkout |
| `avg_order_value` | $ | 80 | 1-10000 | AOV of completed orders |
| `recovery_rate` | % | 8 | 0-100 | % of abandoned carts recovered (email/SMS default 5-10%) |
| `recovery_cost_per_send` | $ | 0.5 | 0-50 | Cost per recovery outreach attempt |

**Outputs (8):**

| Name | Formula |
|---|---|
| `cart_creations` | `monthly_traffic × cart_add_rate` |
| `completed_orders` | `creations × (1 - abandonment)` |
| `abandoned_carts` | `creations × abandonment` |
| `lost_revenue` | `abandoned × AOV` |
| `recoverable_revenue` | `lost × recovery_rate` |
| `recovery_cost` | `abandoned × recovery_cost_per_send` |
| `recovery_net_gain` | `recoverable - recovery_cost` |
| **`recovery_roi`** | `recoverable / recovery_cost` |

**Health band on `recovery_roi`**: 🟢 ≥300% · 🟡 100-300% · 🔴 <100%

**Canonical example:**
```
50000 traffic · 20% add · 70% abandon · $80 AOV · 8% recovery · $0.5/send
→ cart_creations = 10,000
→ abandoned_carts = 7,000
→ lost_revenue = $560,000
→ recoverable = $44,800
→ recovery_cost = $3,500
→ net_gain = $41,300
→ ROI = 1,280% → 🟢 Good
```

**v3 standard**: Business variant.

### 4.2 Tasks 3-5: Old-Pattern Sweep (42 engines)

**Per-engine pattern (P14-Followup precedent):**

| Layer | File | Action |
|---|---|---|
| HTML5 (browser) | `[slug].astro:1387-1454` BIZ_CONFIG form | Add `step="any" min="0"` to all `<input type="number">` |
| Programmatic (server) | `src/engines/{cat}/{slug}.ts` `calculate()` / `generate()` | Import `clampNonNegative` from `../../core/engines/helpers`; wrap relevant numeric inputs |
| customFn (browser) | `clientConfig.customFn` string | Prepend `var cnn=function(x){return Math.max(0,x)};`; wrap negative-prone parses with `cnn(...)` |
| Test | `tests/{slug}.test.ts` | Add 1 defensive test: negative input → 0 (not negative, not NaN, not crash) |

**3 batches (alphabetical grouping):**

| Task | Categories | Engines | LOC est |
|---|---|---|---|
| 3 | cost(4) + freelance(3) + hiring-team(6) | 13 | ~130 |
| 4 | investment(5) + real-estate(6) + saas(5) | 16 | ~160 |
| 5 | valuation | 13 | ~130 |

**Sample-verify before Task 3**: Pick 1 BIZ_CONFIG engine (e.g., `freelance-rate-calculator`) and confirm:
- Astro template line 1387-1454 supports `step`/`min` attributes on `<input type="number">`
- customFn currently parses OK via `verify-customfn.mjs`
- Negative input produces negative output (proving guard needed)

If pattern fails, abort sweep + log as P17 deferred.

**Out of scope for sweep**:
- AI Cost customFn (4 engines) — already done in P15 Task 2 with PRICING.json preservation
- New-pattern engines (P6-P14, 48) — already done in P14-Followup
- 2 new engines (Tasks 1-2) — built directly with pattern

### 4.3 Task 6: P15 Polish (4 items, single commit)

| Item | File(s) | Action | LOC |
|---|---|---|---|
| 6a env-test skip-marker | `tests/baselayout-clerk-script.test.ts` | Add `t.skip()` when env missing (1 file, ~5 LOC) | ~5 |
| 6b 3 test improvements | `tests/{acv,funnel-step,article-helpfulness}-calculator.test.ts` | acv: band verdict assertion. funnel-step: replace manual filteredSteps with generate(). article-helpfulness: band cascade assertion. | ~30 |
| 6c helpers.test.ts cleanup | `tests/helpers.test.ts` + `src/core/engines/helpers.ts:72` | Remove no-op `as number` cast; rename Test 5 | ~5 |
| 6d LIFT_PERCENT constant | `src/engines/customer-support/first-response-time-calculator.ts` | Extract `const LIFT_PERCENT = 5;` reference in calculate() + customFn | ~10 |

**Total Task 6**: ~50 LOC, 4-5 files, single atomic commit.

### 4.4 Task 7: Holistic Ship + Memory

- Write `memory/p16-100-milestone-shipped.md` (full batch coverage)
- Update `memory/MEMORY.md` (in-repo + Claude-side mirror)
- 3-way sync verification: `git rev-list --left-right --count origin/master...github/master` → `0	0`

### 4.5 Out of scope (explicitly)

- **CustomFn code-split** — premature abstraction; defer
- **OG image extra missing emojis** — only fix what's reported
- **New category letters** — E-Commerce fits existing M
- **Maintenance mode tooling** — separate event

### 4.6 Files modified summary

| Category | Count | Total LOC est |
|---|---|---|
| New engines | 2 (.ts + 2 .test.ts + 1 index.ts modification) | ~600 |
| Old-pattern sweep | 42 engines × ~10 LOC + 42 tests × ~5 LOC | ~630 |
| P15 polish | 4-5 files | ~50 |
| Memory | 1 (P16 ship memory) | ~200 |
| **TOTAL** | ~95 files | ~1480 LOC |

## 5. Data flow (per engine type)

| Engine type | Build-time | Runtime | Browser |
|---|---|---|---|
| New engine (Tasks 1-2) | Static import + register | `calculate()` / `generate()` uses `clampNonNegative` from helpers | `customFn` inline `cnn(...)`; Astro template renders `step="any" min="0"` |
| Old-pattern sweep (Tasks 3-5) | Imports `clampNonNegative` | `calculate()` / `generate()` uses helper | `customFn` inline `cnn(...)`; BIZ_CONFIG form rendering (line 1387-1454) needs `step`/`min` injection |

## 6. Testing

### 6.1 Per-task test requirements

| Task | Test requirement |
|---|---|
| 1 (coupon-attribution) | 1 canonical example test + 1 health band test (each band) + 1 defensive clamp test + 1 edge case (zero inputs) = 5 tests min |
| 2 (cart-abandonment) | 1 canonical example + 3 health band tests + 1 defensive clamp + 1 edge = 6 tests min |
| 3-5 (sweep batches) | N defensive tests per batch (where N = engines in batch) + all existing old-pattern tests pass |
| 6 (polish) | All modified test files pass cleanly |
| 7 (holistic) | Full suite passes |

### 6.2 Cross-cutting verification

- `node scripts/codegen-examples.mjs --check` → 100/100 PASS
- `node scripts/codegen-customfn.mjs --check` → PASS (no drift)
- `pnpm exec astro build` → 311 static pages built (309 + 2 new)
- `node scripts/smoke-html5.mjs --strict` → exit 0 (all pages have `step="any"` on numeric inputs)
- `node tests/scripts/verify-customfn.mjs` → 100/100 engines parse OK

### 6.3 Acceptance criteria

1. All P16 per-task tests pass with zero new regressions
2. `pnpm exec astro build` succeeds
3. HTML5 smoke test exits 0
4. verify-customfn.mjs parses 100/100 engines
5. Engine count: 98 → 100 confirmed via `ls src/engines/**/*.ts | grep -v index.ts | wc -l` = 100
6. Old-pattern sweep: 42/42 engines have `clampNonNegative` + `cnn` + `step="any"` (verified via grep + smoke-html5)
7. Memory file `memory/p16-100-milestone-shipped.md` covers full batch
8. 3-way sync verified `0 0`
9. **Ready for maintenance mode transition** after P16 ship

## 7. Out of scope (deferred to maintenance-mode events)

- **New business vertical** (event-driven when user feedback signals)
- **Major tech stack upgrade** (e.g., Astro 5 migration)
- **Security patch** (e.g., Clerk/Supabase auth refresh)
- **CustomFn code-split** (premature abstraction)
- **OG image emoji additions beyond reported** (only fix what's reported)
- **Smoke test pre-commit hook wiring** (manual invocation OK)

## 8. Rollout plan

1. Land P16 in 7 sequential commits per subagent-driven-development
2. **Sample-verify pattern** before Task 3 (1 BIZ_CONFIG engine)
3. Per-task review gates:
   - Tasks 1-2 (new engines): 1 implementer + 1 spec-verify
   - Tasks 3-5 (sweep): 1 implementer + 1 spec-verify + 1 quality reviewer (cross-file pattern verification)
   - Task 6 (polish): 1 implementer + 1 spec-verify
   - Task 7 (holistic): 1 spec-verify + final whole-branch review (fable-5)
4. Dual-push to gitee + github; verify 3-way sync
5. Update `memory/p16-100-milestone-shipped.md` + `MEMORY.md` index
6. Update Claude-side memory index mirror
7. **Maintenance mode handoff** — user may now treat project as event-driven

## 9. Risk assessment

**Low risk:**
- 2 new engines (Tasks 1-2) — established v3 pattern from P14-P15
- Polish items (Task 6) — single file each, well-tested patterns
- Helpers test cleanup (Task 6c) — already tested

**Medium risk:**
- Old-pattern sweep (Tasks 3-5) — 42 engines × 3 batches is the highest-risk block. **Mitigations**:
  - Sample-verify 1 BIZ_CONFIG engine before Task 3
  - 3 atomic batches (worst-case failure isolates to 1 batch)
  - Per-batch review gates (spec + quality)
  - Abort if pattern doesn't apply → defer to P17

**High risk:**
- None (no architectural changes; only pattern extension + 2 new engines)

**Abort criteria (any of):**
- BIZ_CONFIG form rendering pattern incompatible with `step`/`min` attributes (line 1387-1454 doesn't expose injection points)
- customFn pattern from P14-Followup fails to apply to old-pattern engines (cnn prepend breaks something)
- Any single task exceeds 2h wall-clock → escalate to human
- Engine count doesn't reach 100 → debug before ship

**Mitigations:**
- Sample-verify pattern on 1 BIZ_CONFIG engine before sweep
- Per-batch review gates catch cross-file breakage
- Per-task escalation if 2× time budget exceeded
- Plan for ~30-40% subagent API 429 retry rate (P15 precedent)

## 10. Maintenance mode transition

After P16 ships:
- **Engine count**: 100 (locked until event-driven new engine)
- **Defense layer**: 100% coverage (HTML5 + programmatic + customFn)
- **Known debt**: Zero (all P15 polish + P15b sweep complete)
- **Trigger events for P17+**:
  - User feedback signals (e.g., "add X calculator")
  - New business vertical (e.g., Health/Fitness, Crypto, Travel)
  - Major tech stack upgrade (Astro 5, Tailwind 5)
  - Security patch (auth refresh)
  - Performance regression signals
  - SEO/a11y audit findings