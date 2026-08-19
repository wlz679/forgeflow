---
name: p140f-batch-a-followup-tier1-content-fill-shipped
description: P140f Batch A quick follow-up — T5 letter page Topics grid (15 files) + ROAS Optimization Tier 1 anchor content fill (en + zh).
metadata:
  type: project
  shipped: 2026-08-19
  commits: 3 atomic on master (T5 + T6)
---

# P140f Batch A Quick Follow-up — SHIPPED

**Date:** 2026-08-19
**Branch:** master (direct commit — small targeted follow-up)
**Trigger:** User picked Option 1 ("Quick follow-up: T5 + 1-2 Tier 1 anchor content fills").

---

## Change (3 atomic commits)

### T5: Letter page Topics grid (15 files)

For each of 15 letter pages (saas-metrics, ai-cost-tools, valuation-exit, freelance-pricing, cost-efficiency, investment-roi, marketing-analytics, operations-inventory, sales, retention, product-analytics, hiring-team, customer-support, knowledge, legal-compliance), added:
- Import: `getTopicsByLetter` + `TopicCard` from data layer + components
- Frontmatter: `const letterTopics = getTopicsByLetter(CATEGORY_ID)`
- Body section: Topics grid below calculator list (with 8 line intro + Topic cards)

**Implementation note**: Used Node.js script `tmp/apply_t5.js` (Python unavailable in sandbox) with two-pass fix-up for files using `translatedTools` pattern (vs `categoryTools`). 7 files needed CRLF/LF anchor fix.

### T6: ROAS Optimization Topic content fill (en + zh)

Created `src/data/topic-content.ts`:
- `TOPIC_GUIDE_CONTENT['roas-optimization']` — 5-section content (What is / Why matters / Key concepts / How to apply / Common pitfalls) × 2 langs (~1500 字 en + ~1200 字 zh)
- `TOPIC_BENCHMARK_CONTENT['roas-optimization']` — 4-section content + 8-row data table × 2 langs (~600 字 + benchmarks like DTC 2.5-4.0x gross ROAS, B2B SaaS 1.5-2.5x, etc.)

Modified `src/pages/[lang]/[letter]/[topic]-guide.astro` + `[topic]-benchmark.astro` templates to:
- Look up content from `TOPIC_GUIDE_CONTENT` / `TOPIC_BENCHMARK_CONTENT`
- Render content with `whitespace-pre-line` for paragraph preservation
- Fall back to `[CONTENT]` placeholder for Topics without editorial fill

**Content domain coverage**: ROAS benchmarks sourced from Meta Ads Help Center, Google Ads ROAS docs, Shopify ROAS Guide, Triple Whale DTC benchmarks 2024, OpenView SaaS Benchmarks 2024, HubSpot State of Marketing 2024, LinkedIn Marketing Solutions, TikTok for Business benchmarks 2024.

---

## Verification

| Check | Result |
|---|---|
| `tsc --noEmit` | clean |
| `pnpm build` | 511 pages (unchanged) |
| `dist/en/marketing-analytics/roas-optimization-guide/index.html` | contains "Triple Whale" / "ROAS Calculator" ✓ |
| `dist/zh/marketing-analytics/roas-optimization-guide/index.html` | contains "Meta Ads 帮助" / "净 ROAS" ✓ |
| `dist/en/marketing-analytics/roas-optimization-benchmark/index.html` | contains "Triple Whale DTC" ✓ (8-row data table) |
| `RUN_BUILD_TESTS=1 tsx --test tests/topic-guide-shape-guard.test.ts` | 1/1 pass (54s) |
| `RUN_BUILD_TESTS=1 tsx --test tests/topic-benchmark-shape-guard.test.ts` | 1/1 pass (55s) |

---

## What was deliberately NOT done (still deferred)

- **Other 14 Tier 1 anchor Topic content fills** — Content registry is in place; adding new Topics is incremental (~5 min each — just add to TOPIC_GUIDE_CONTENT map).
- **Per-Topic content fills for Tier 2/3 Topics** — Phase 2/4 deferred per spec §11.

---

## Files touched

| File | Change | Commit |
|---|---|---|
| 15 letter pages in `src/pages/[lang]/` | +285 lines total | `22f562c` |
| `src/data/topic-content.ts` | NEW (+117) | `1bb576b` |
| `src/pages/[lang]/[letter]/[topic]-guide.astro` | MODIFY (+10) - read from TOPIC_GUIDE_CONTENT | `1bb576b` |
| `src/pages/[lang]/[letter]/[topic]-benchmark.astro` | MODIFY (+10) - read from TOPIC_BENCHMARK_CONTENT | `1bb576b` |

Total: 3 atomic commits on master.

---

## Related

- [[p140f-batch-a-tier1-anchors-shipped]] — preceding batch (T1-T7 Batch A infrastructure)
- P140f v2.0 Topic Authority spec (`docs/superpowers/specs/2026-08-19-p140f-v2-topic-authority-design.md`, commit 7520675)
- Content registry pattern enables per-Topic editorial fills without per-Topic file maintenance.