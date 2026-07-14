---
date: 2026-07-12
commit: 243d604
engine: article-helpfulness-calculator
category: K (Knowledge/Documentation)
series: P13
status: shipped
---

# P13-6 Article Helpfulness Score Calculator — Shipped (FINAL P13)

## What shipped

- **Engine:** `src/engines/knowledge/article-helpfulness-calculator.ts` (NEW, 119 lines, 2458-char customFn)
- **Tests:** `tests/article-helpfulness-calculator.test.ts` (NEW, **12 math tests**)
- **ToolMeta:** `src/data/tools/knowledge.ts` sixth entry
- **OG sample:** `src/data/og-samples.json` en + zh (77.4% headline / helpful unit)
- **Codegen:** `scripts/codegen-examples.mjs` ENGINES entry
- **Bumps:** `tests/ab-split.test.ts` 91→92 (engines + tools); `tests/internal-links.test.ts` 91→92
- Engine count: 91 → **92** (P13 series FINAL, 6/6 calcs shipped)
- 12 tests: canonical, helpfulPct math, voteRate math, zero-div guards (×2), 5 band boundaries, HEALTH_BANDS structure

## Inputs (5)

| name | label | type |
|---|---|---|
| total_article_views | Monthly article views | number |
| helpful_votes | Helpful votes (👍) | number |
| unhelpful_votes | Unhelpful votes (👎) | number |
| total_articles | Total KB articles | number |
| target_helpful_pct | Target helpful % (👍 share) | number |

## Math

- `total_votes = helpful + unhelpful`
- `helpful_pct = total_votes > 0 ? helpful / total_votes : 0` (zero-guard returns 0)
- `vote_rate_pct = (total_votes / views) * 100` (zero views → 0)
- `gap_pct = target_helpful_pct - helpful_pct * 100` (negative = above target)
- `lift_helpful_exc = max(0, 0.85 × total_votes − helpful)` (What-If)
- `lift_votes_exc = max(0, 0.15 × views − total_votes)` (Break-Even)
- `bottom_20 = ceil(articles × 0.2)` (audit cohort)

## HEALTH_BANDS (composite AND on helpful + vote_rate, tiered cascade)

- 🟢 excellent: helpful ≥ 85% AND vote_rate ≥ 15%
- 🟡 good:      helpful ≥ 70% AND vote_rate ≥ 8%
- 🟠 warning:   helpful ≥ 55% (vote_rate ignored at this tier)
- 🔴 critical:  helpful < 55% (informational threshold placeholder -Infinity)

HEALTH_BANDS shape irregular — excellent/good have `threshold1`+`threshold2`; warning only `threshold1`; critical only `threshold` (-Infinity). Mirrors P9-5 customer-health-score pattern.

`calcHealthBand(helpful, voteRate)` — 2-arg composite signature (matches K-3 + P9-5).

## Canonical

`views=25000, helpful=2400, unhelp=700, articles=500, target=75%`
→ total_votes=3100 · helpful=77.4% · vote_rate=12.4% → 🟡 **Good** (77.4≥70 AND 12.4≥8) · 235 more 👍 → 650 more votes → 100 bottom-20 articles to audit.

## Lessons

1. **FINAL P13 batch bump** (89→92 across 6 calcs in single batch). P13 series reaches its planned 92-engine total.
2. **EMOJI_SET gate caught 👍 leak**: first-pass OG sample used "👍" in trend string + headlineLabel. `assertEmojiSet()` in `scripts/build-og-images.ts` raised "Unmapped emoji in og-samples.json: 👍 U+1F44D" — the EMOJI_SET is a closed whitelist of 9 emojis (🎬 ⚠️ ✅ 📊 🤖 💎 💼 ⚡ 📈). No existing entry uses 👍. Either add to whitelist or strip the emoji from text — chose strip (matches all 91 prior entries — text-only, no emoji). Lesson: **og-samples.json fields (headline/en, headline/zh, headlineUnit, headlineLabel, trend) must be emoji-free ASCII/Chinese unless you also expand EMOJI_SET**.
3. **Code vs spec drift** (P13-3 lesson repeated): brief narrative said "voteRate<0.03 triggers critical regardless of helpful" but the literal `calcHealthBand` function given in the brief + implemented here is a **tiered cascade**. With input `(0.70, 0.02)`: excellent fails (0.70<0.85), good fails (0.02<0.08), warning passes (0.70≥0.55) → returns `'warning'`. The "or-voteRate critical" narrative only applies via the helpful<0.55 branch; pure voteRate failure cascades to warning, not critical. Tests must reflect actual function behavior, not narrative. P9-5 customer-health uses the same 2-arg tiered-cascade shape.
4. **Tiered cascade signature verification**: Test #12 includes `assert.equal(calcHealthBand.length, 2)` — locks 2-arg composite. P9-5 customer-health + P13-3 search-effectiveness + P13-6 article-helpfulness all use this pattern. Future refactor that collapses to 1-arg would trip the test.
5. **`tests/scripts/test-customFn.mjs` does NOT support subdirectories** — its hardcoded path is `src/engines/' + slug + '.ts` and only finds top-level engines (not `knowledge/`). The K-series engines have always needed ad-hoc parsing via `bash printf` or inline `_verify-cf.mjs` with a backtick-aware regex. The browser runtime uses `new Function(...)` at runtime; the test script is just a parseability proxy. CustomFn for this engine parses cleanly (2458 chars), confirmed via direct grep + `new Function` round-trip.
6. **`SKIP_PRECOMMIT_CHECK=1 git commit`** required per task brief — the pre-commit hook runs `codegen-examples.mjs --check`, which after this commit's first regen pass matches cleanly (92/92 PASS). Hook not bypassed intentionally — pre-commit was already green by the time I committed.
7. **Internal-links auto-regen**: `src/data/internal-links.ts` (56 lines of pure logic) auto-derives related entries from `tools` array + shared keywords. New ToolMeta entry auto-populates 4 related tools. Only the count assertion in `tests/internal-links.test.ts` needs manual 91→92 bump.
8. **Dual-push verified**: both `git push origin HEAD` (gitee wlz679/calcKit) + `git push github HEAD` (github wlz679/forgeflow) successful; both `git rev-list ...HEAD` = empty (sync confirmed).

## Verification

- `node --import tsx tests/article-helpfulness-calculator.test.ts` → **12/12 pass**
- `node --import tsx tests/ab-split.test.ts` → 92 engines + 92 tools pass
- `node --import tsx tests/internal-links.test.ts` → 92 keys + 4-each related lists pass
- `node scripts/codegen-examples.mjs --check` → **92/92 PASS exit 0**
- Engine imports cleanly via tsx (TS source parses, `HEALTH_BANDS` + `calcHealthBand` + `helpfulPct` + `voteRate` all exported)
- CustomFn body (2458 chars) parses cleanly via `new Function('inputs','pick','fill', body)`
- Both `git push origin HEAD` (gitee) and `git push github HEAD` (github) → both `git rev-list ...HEAD` = 0 ahead
- Memory file `p13-6-article-helpfulness-shipped.md` (this) + MEMORY.md index updated

## File paths (absolute)

- Engine: `D:\E\独立站\youtube-tools\src\engines\knowledge\article-helpfulness-calculator.ts`
- Tests: `D:\E\独立站\youtube-tools\tests\article-helpfulness-calculator.test.ts`
- ToolMeta: `D:\E\独立站\youtube-tools\src\data\tools\knowledge.ts`
- OG: `D:\E\独立站\youtube-tools\src\data\og-samples.json`
- Codegen: `D:\E\独立站\youtube-tools\scripts\codecodegen-examples.mjs`
  - actually: `D:\E\独立站\youtube-tools\scripts\codegen-examples.mjs`
- Index barrel: `D:\E\独立站\youtube-tools\src\engines\knowledge\index.ts`
- Memory: `D:\E\独立站\youtube-tools\memory\p13-6-article-helpfulness-shipped.md` (this file)
