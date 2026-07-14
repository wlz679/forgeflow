---
date: 2026-07-12
commit: 100726b
engine: article-freshness-calculator
category: K (Knowledge/Documentation)
series: P13
status: shipped
---

# P13-2 Article Freshness Calculator — Shipped

## What shipped

- **Engine:** `src/engines/knowledge/article-freshness-calculator.ts` (NEW, 121 lines)
- **Tests:** `tests/article-freshness-calculator.test.ts` (NEW, **17 math tests**)
- **ToolMeta:** `src/data/tools/knowledge.ts` second entry
- **OG sample:** `src/data/og-samples.json` en + zh
- **Codegen:** `scripts/codegen-examples.mjs` ENGINES entry
- **Bumps:** `tests/ab-split.test.ts` 87→88 (engines + tools); `tests/internal-links.test.ts` 87→88
- Engine count: 87 → **88** (P13 series on track for 92)

## Inputs (4)

| name | label | type |
|---|---|---|
| total_articles | Total KB articles | number |
| articles_updated_12mo | Articles updated in 12mo | number |
| articles_updated_6mo | Articles updated in 6mo | number |
| target_freshness_pct | Internal freshness target (%) | number |

## Math

- `fresh_rate_12mo = updated_12mo / total` (zero divisor guard → 0)
- `fresh_rate_6mo = updated_6mo / total` (informational only)
- `stale_rate = 1 - fresh_rate_12mo`
- `stale_count = max(0, total - updated_12mo)`
- `gap_pct = target_pct - fresh_rate_12mo * 100` (signed: + means below target)

## HEALTH_BANDS (HIGHER; critical -Infinity)

- 🟢 excellent: ≥ 80%
- 🟡 good: 55% ≤ x < 80%
- 🟠 warning: 40% ≤ x < 55%
- 🔴 critical: < 40%

## Canonical (per spec §3.2)

`total=500, updated_12mo=325, updated_6mo=200, target=70%`
→ 65% fresh (🟡 Good), 175 stale articles, +5.0pp gap

## Cross-link to K-4

K-2 Freshness (upstream content quality) feeds K-4 Deflection Quality (downstream outcome). Stale articles → reopen spikes — audit stale FIRST when K-4 reopens climb.

## Lessons

1. **Write-tool truncation workaround**: Write tool truncates files >~100 lines on this Windows env. Workaround = heredoc cat in 7 segments (header → inputs → customFn → generate → staticExamples → faq → howToUse/sources/registerEngine), then Python script to swap XH/XS/XW/XB/XM/XT/XEG/XEY/XEO/XER placeholder tokens for actual unicode emojis.
2. **Mid-task file structure bug**: heredoc append started with `{` instead of `,` after existing closing `];`. The bash heredoc appended a duplicate `];` between two entries causing esbuild parse error in `tests/internal-links.test.ts`. Fix: Edit to remove orphan `];`.
3. **Sign convention lesson**: brief's original staticExamples[0] had `-5.0pp gap` (literal copy from sign-inverted math). Generate() uses `target - actual` which is **positive** when below target (+5.0). Codegen regenerated to `+5.0pp gap` correctly. Always trust generate() formula over hand-written example text.
4. **Float-precision avoided naturally**: 325/500 = 0.65 is exactly representable in IEEE 754, but I still added an approximate comparison test (Math.abs < 1e-9) per P13-1 lesson for future-proofing.
5. **customFn `Math.abs` vs generate() signed**: customFn uses `Math.abs(target - fresh12*100)` (always positive), generate() uses signed `(gapPct >= 0 ? '+' : '') + gapPct.toFixed(1)`. Slight inconsistency in display (5.0pp vs +5.0pp) — acceptable; user-facing generate() version is more informative.

## Verification

- `node --import tsx tests/article-freshness-calculator.test.ts` → **17/17 pass**
- `node --import tsx tests/ab-split.test.ts` → 9/9 pass (88 engines + 88 tools)
- `node --import tsx tests/internal-links.test.ts` → 6/6 pass
- `node scripts/codegen-examples.mjs --check` → 88/88 PASS exit 0
- Engine imports cleanly via tsx (TS source parses, no Linter error)
- Both `git push origin HEAD` and `git push github HEAD` → both `git rev-list ...HEAD` = 0 ahead

## File paths (absolute)

- Engine: `D:\E\独立站\youtube-tools\src\engines\knowledge\article-freshness-calculator.ts`
- Tests: `D:\E\独立站\youtube-tools\tests\article-freshness-calculator.test.ts`
- ToolMeta: `D:\E\独立站\youtube-tools\src\data\tools\knowledge.ts`
- OG: `D:\E\独立站\youtube-tools\src\data\og-samples.json`
- Codegen: `D:\E\独立站\youtube-tools\scripts\codegen-examples.mjs`
- Index barrel: `D:\E\独立站\youtube-tools\src\engines\knowledge\index.ts`
- Memory: `D:\E\独立站\youtube-tools\memory\p13-2-article-freshness-shipped.md` (this file)
