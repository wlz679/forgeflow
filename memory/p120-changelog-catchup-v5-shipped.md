# P120 CHANGELOG catch-up v5 Ship Log

## Summary

P120 closes the documentation gap for 3 P-series batches (P117 + P118 + P119) with a single
M21.0 milestone section in `CHANGELOG.md`. Total commits +6 → 781. Follows the established
P45 → P65 → P84 → P109 → P116 catch-up pattern.

**Date:** 2026-07-27
**Batch ID:** P120
**Files touched:** 1 (CHANGELOG.md only — docs-only batch)
**Commits covered:** 6 (P117 feat + docs · P118 feat + docs · P119 feat + docs)
**CHANGELOG delta:** +81 lines / -5 lines (M21.0 section + header metadata update)
**3-way sync:** `0\t0` at HEAD

## What shipped

### M21.0 section in CHANGELOG.md (after M20.0, before M16.0)

```markdown
## [M21.0] - 2026-07-27 — i18n tier-2 closure (P117-P119)

🌐 Tier-2 i18n closure: 61 more single-engine headers across 3 rounds (P117 + P118 + P119);
post-processor headerKeys 75 → 136; P103 WORKING_KEY_REQUIRED 89 → 150 entries (+61);
1:1 per-engine static tier-2 pattern COMPLETE. 3 batches · 6 commits · 0 production engine
count change.
```

### Engineering metrics table

| Metric | Before (M20.0) | After (M21.0) |
|---|---|---|
| New batches | 6 (P110-P115) | **3** (P117-P119) |
| New commits | 9 | **6** |
| P103 WORKING_KEY_REQUIRED | 89 | **150** (+61) |
| i18n active post-processor keys | 75 | **136** (+61) |
| Total commits | 775 | **781** |

### Tier-2 closure timeline

| Era | Batches | Keys | Cumulative |
|---|---|---|---|
| Tier-1 business section | P111 | 7 | 7 |
| Tier-2 round 1 | P113 | 18 | 25 |
| Tier-2 round 2 | P114 | 12 | 37 |
| Tier-2 round 3 | P115 | 22 | 59 |
| Tier-2 round 4 | P117 | 22 | 81 |
| Tier-2 round 5 | P118 | 28 | 109 |
| **Tier-2 round 6 (CLOSES)** | **P119** | **11** | **120** |

**120 total post-processor keys** (113 tier-2 + 7 business).

### Header metadata update
- "最后更新: P116 → P120 (catch-up v5)"
- "Total commits: 775 → 781"
- "Last CHANGELOG update: P84 (M18.0) → P120 (M21.0)"

### Unreleased candidate updates
- ~~tier-2 single-engine i18n keys (~50+ remaining)~~ → ✅ **P113-P119 closed 113 keys**
- New candidate: "tier-2 round 7 — composite data-driven lines (NEW approach: source-level or customFn-based)"

## Why this batch exists (P45 → P65 → P84 → P109 → P116 → P120 pattern)

The CHANGELOG is the **canonical release timeline** but is hand-edited only when P-series batches
land. Without regular catch-up batches, the file drifts out of sync with reality (multiple P-series
batches shipped since last update → CHANGELOG silently stale → readers can't see recent work).

P45 established the catch-up pattern: every 5-10 P-series batches (or when "Total commits" gap
exceeds ~10), spawn a 1-commit docs-only batch to backfill CHANGELOG.

## Ship drama (carried from P117-P119)

- **[P117] Probe regex false-positive** — CJK-detection matched headers like `🩺 CAC 健康` as
  "still English". Fixed by CJK-character-presence check.
- **[P118] Stale esbuild process** — held port, blocked new build. Killed via `taskkill`.
- **[P118] `&` literal in source** — `Your Traffic & Conversions:` HTML-escapes to `&#38;` in dist
  HTML; post-processor works on raw output before HTML escape (transparent).
- **[P119] Smaller batch by design** — only 11 keys remaining; cleanly closes pattern.

## Verification

| Check | Result |
|---|---|
| Pre-commit hook (codegen-examples --check + pnpm check) | passed ✓ |
| Working tree | clean ✓ |
| 3-way sync | `0\t0` ✓ |
| CHANGELOG.md total lines | 689 → 765 (+76) |

## Related references

- **P45** — first CHANGELOG catch-up (M5.x era)
- **P65** — CHANGELOG catch-up v2 (M17.0)
- **P84** — CHANGELOG catch-up (... )
- **P109** — CHANGELOG catch-up v3 (M19.0, P84-P108)
- **P116** — CHANGELOG catch-up v4 (M20.0, P110-P115)
- **P120** — CHANGELOG catch-up v5 (M21.0, P117-P119, this batch)
- `CHANGELOG.md:35-105` — M20.0 section (previous)
- `CHANGELOG.md:108-189` — M21.0 section (this batch, 81 insertions)

## P121+ candidates

- **Tier-2 round 7** — composite data-driven lines (NEW approach needed):
  - Source-level translation (modify calculate() to emit i18n keys directly)
  - CustomFn-side i18n (emit bilingual output, browser picks)
  - Likely 50-100 candidates across AI cost + business engines
- **Codegen-enforce defense-in-depth matrix** — automate CLAUDE.md snapshot (Codify 29 build-dep suites)
- **Audit script migration** — extract parser logic to shared library
- **Asset lazy-load guard** — above-the-fold resource count
- **CDN cache-control guard** — production-side header check
- **Engine titles i18n audit** — verify 100/100 `tools.${slug}.title` translate