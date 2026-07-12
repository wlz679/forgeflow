---
date: 2026-07-12
commit: aeaf9b2
engine: kb-coverage-rate-calculator
category: K (Knowledge/Documentation)
series: P13
status: shipped
---

# P13-1 KB Coverage Rate Calculator — Shipped

## What shipped

- **Engine:** `src/engines/knowledge/kb-coverage-rate-calculator.ts` (NEW)
- **Tests:** `tests/kb-coverage-rate-calculator.test.ts` (NEW, 12 math tests)
- **ToolMeta:** `src/data/tools/knowledge.ts` first entry (was empty `[]` before)
- **OG sample:** `src/data/og-samples.json` en + zh
- **Codegen:** `scripts/codegen-examples.mjs` ENGINES entry
- **Bumps:** `tests/ab-split.test.ts` 86→87 (engines + tools); `tests/internal-links.test.ts` 86→87
- Engine count: 86 → **87** (final of P13 series will be 92)

## Inputs (4)

| name | label | type |
|---|---|---|
| monthly_tickets | Monthly inbound tickets | number |
| tickets_with_kb_match | Tickets with KB match | number |
| total_articles | Total KB articles | number |
| industry_benchmark | Industry (SaaS/FinTech/HealthTech/eCommerce) | select |

## Math

- `coverage_rate = matched / total` (zero divisor guard → 0)
- `gap_rate = 1 - coverage_rate`
- `gap_tickets = total - matched`
- `lift = max(0, 0.85*total - matched)`
- `needArticles = ceil(max(0, 0.85*total - matched) / max(1, total/articles))`

## HEALTH_BANDS (HIGHER; critical -Infinity)

- 🟢 excellent: ≥ 85%
- 🟡 good: 60% ≤ x < 85%
- 🟠 warning: 40% ≤ x < 60%
- 🔴 critical: < 40%

## Canonical (per spec §3.1)

`monthly_tickets=5000, tickets_with_kb_match=3500, total_articles=500, industry_benchmark='SaaS'`
→ coverage 70% (🟡 Good), gap 30% = 1,500 tickets/mo without KB

## Cross-link to P12-5

K-1 Coverage (upstream) feeds P12-5 Deflection Rate (downstream outcome). Low coverage caps deflection potential — fix K-1 first.

## Lessons

1. **Mid-flight rescue pattern**: previous haiku implementer created 2 of 8 files then stopped. Resuming task = read brief, verify what's done, finish remaining 6 edits in any order. All edits used pre-existing patterns (P12-1 cost-per-support-ticket-calculator.ts) verbatim.
2. **Industry select is informational only** — does not change math (per FAQ). Vertical benchmark context only.
3. **P10-1 lesson applied proactively**: P13-0 scaffold added `./kb-coverage-rate-calculator` to `src/engines/knowledge/index.ts` BEFORE the first calc shipped, so barrel imports were already in place.
4. **codegen-examples drift check passed**: `node scripts/codegen-examples.mjs --check` → "all 87 engines in sync and clean" after regeneration.
5. **Engine file count pre-existing TS warning** about `sources` field tolerated (matches P12-1 L124 pattern).

## Verification

- `node --import tsx tests/kb-coverage-rate-calculator.test.ts` → 12/12 pass
- `node scripts/codegen-examples.mjs --check` → 87/87 PASS exit 0
- Engine imports cleanly via tsx (TS source parses)
- Both `git push origin HEAD` and `git push github HEAD` → both `git rev-list ...HEAD` = 0 ahead

## File paths (absolute)

- Engine: `D:\E\独立站\youtube-tools\src\engines\knowledge\kb-coverage-rate-calculator.ts`
- Tests: `D:\E\独立站\youtube-tools\tests\kb-coverage-rate-calculator.test.ts`
- ToolMeta: `D:\E\独立站\youtube-tools\src\data\tools\knowledge.ts`
- OG: `D:\E\独立站\youtube-tools\src\data\og-samples.json`
- Codegen: `D:\E\独立站\youtube-tools\scripts\codegen-examples.mjs`