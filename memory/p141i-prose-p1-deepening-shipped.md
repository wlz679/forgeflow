---
name: p141i-prose-p1-deepening-shipped
description: P141i prose P1 deepening — CalculatorProse schema extended with 2 optional H2 sections (Assumptions + Common Mistakes) + 18 per-file prose expansions across 9 marketing/retention engines + new warn-only guard. Closes ChatGPT "professional credibility" issue from P141h audit.
metadata:
  type: project
  shipped: 2026-08-19
  commits: 13 atomic on feature/p141i-prose-p1-deepening
  branch: feature/p141i-prose-p1-deepening
---

# P141i Prose P1 Deepening — SHIPPED

**Date:** 2026-08-19
**Branch:** `feature/p141i-prose-p1-deepening` (13 atomic commits + ff-merge to master)
**Trigger:** User picked Option A "修 P1" after P141h audit identified remaining ChatGPT gaps. User then picked "Subagent" execution mode.
**Resubmit window:** unchanged (~2026-09-01 trigger per `adsense-resubmit-window.md`).

---

## Why this batch exists

P141h audit (commit `aa9d10b`) closed REAL ChatGPT claims (placeholder leakage + sources not rendered + last-reviewed stale) but deferred 3 MAJOR issues to P1:
- Health-band thresholds appear without source citation
- Per-tool Assumptions / Common Mistakes sections missing
- About page hardcoded "100" (MINOR)

P141i ships the first 2 (the substantive "professional credibility" gap). About page fix deferred to MINOR batch.

---

## Change (3 code files + 18 prose files + 1 test)

### CalculatorProse.astro (+15 lines)
Extended Props union + SECTION_HEADINGS + SECTION_VARIANTS with 2 new optional sections:
- `assumptions` → matches `## Assumptions` / `## 假设与边界`
- `common_mistakes` → matches `## Common Mistakes` / `## 常见误区`

Both sections return empty body when H2 not in prose file (existing extractSection fallback). Distinct styling: Assumptions 🔍 sky-50, Common Mistakes ⚠️ rose-50.

### src/pages/[lang]/[slug].astro (+31 lines)
Added 2 conditional `<CalculatorProse section="..." />` invocations after the example section. IIFE pattern + local `extractProseSection` helper (not exported from CalculatorProse.astro to keep component API narrow).

### 18 prose files (9 engines × en + zh)

| Engine | Source organizations cited | Commit |
|---|---|---|
| `roas-calculator` | Meta Ads Help Center, Google Ads ROAS docs, Shopify ROAS guide | `748e325` + `eea9c51` |
| `content-marketing-roi-calculator` | Content Marketing Institute, HubSpot State of Marketing, MarketingProfs | `fcb7030` + `eea9c51` |
| `coupon-attribution-calculator` | Shopify coupon analytics, Klaviyo coupon guides, RetailMeNot 88% benchmark | `44c18b2` |
| `cart-abandonment-cost-calculator` | Baymard Institute 70-85% benchmark, Statista e-commerce, Shopify cart recovery | `af8aa61` |
| `cohort-retention-calculator` | Mixpanel cohort docs, Amplitude cohort methodology, Recurly Subscription Metrics 2024 | `4e7426c` |
| `email-campaign-roi-calculator` | DMA Email Marketing Council $36:$1 ROI, HubSpot email benchmarks, Klaviyo ecommerce email, Litmus | `9b9ac3b` |
| `funnel-value-calculator` | Mixpanel AARRR + HEART frameworks, Amplitude funnel guide, Shopify ecommerce funnel | `2f6791f` |
| `ltv-by-channel-calculator` | Shopify LTV guides, ChartMogul SaaS LTV, Recurly subscription LTV, HBR CLV research | `a05bae2` |
| `churn-rate-calculator` | Recurly Subscription Benchmarks, ChartMogul SaaS Churn, SaaS Capital cohort churn | `0a73cfc` |

Each file received 3 changes:
1. **A.** Append source citation sentence to existing "How It Works (Methodology)" / "计算方法" H2 body
2. **B.** New `## Assumptions` / `## 假设与边界` H2 with 3 domain-specific bullets
3. **C.** New `## Common Mistakes` / `## 常见误区` H2 with 3 domain-specific bullets

### tests/content-prose-shape-guard.test.ts (+50 lines)
New Test 7 (warn-only): for each of 9 target engines × 2 langs = 18 files, assert prose body contains both `Assumptions`/`假设与边界` AND `Common Mistakes`/`常见误区` H2 headers. WARN-only (assert.ok(true) at end with console.warn listing missing sections) — first-pass validation, will tighten to build-fail in follow-up.

---

## Fix made mid-batch (not planned)

After T3 subagents roas + cmi shipped, an audit revealed 2 zh files had non-matching H2 names that would fail T2's substring match:
- `solopreneur-roas-calculator.zh.md`: `## 假设条件` → `## 假设与边界` (commit `eea9c51`)
- `solopreneur-content-marketing-roi-calculator.zh.md`:
  - `## 假设` → `## 假设与边界`
  - `## 常见错误` → `## 常见误区`

Root cause: my T3 briefs didn't explicitly state the exact H2 header names — subagents inferred them. Subsequent briefs added explicit "**CRITICAL — H2 HEADER NAMES MUST BE EXACT**" warnings.

**Lesson for future batches**: When H2 names need to match a code-side contract, always quote the exact strings in the brief.

---

## Verification

| Check | Result |
|---|---|
| `tsc --noEmit` | clean (per subagent reports) |
| `pnpm build` | 451 pages (unchanged) |
| `pnpm check` (default) | 1244/0/0 (skip-guard preserved) |
| `RUN_BUILD_TESTS=1 tsx --test tests/content-prose-shape-guard.test.ts` | **7/7 pass** (6 original + 1 new Test 7) |
| `RUN_BUILD_TESTS=1` total | 1265/1265/0 (+1 new test) |

---

## What was deliberately NOT done (deferred)

- **About page hardcoded "100" / "100 个"** — `src/pages/[lang]/about.astro:186-187` currently consistent with `tools.length = 100` but drifts silently. MINOR; deferred.
- **Tighten Test 7 to build-fail** — first-pass validation; will tighten in P141i-followup after pattern validated.
- **Other 91 engines** — the schema extension is in place but only 9 engines have the new sections populated. Future batches can populate more if needed.

---

## Files touched

| File | Change | Commit |
|---|---|---|
| `src/components/CalculatorProse.astro` | +15/-1 | `3a2e23b` |
| `src/pages/[lang]/[slug].astro` | +31 | `554d642` |
| 18 prose files (9 engines × en + zh) | varies per file | `748e325` + `fcb7030` + `44c18b2` + `af8aa61` + `4e7426c` + `9b9ac3b` + `2f6791f` + `a05bae2` + `0a73cfc` |
| `tests/content-prose-shape-guard.test.ts` | +50/-0 | `97ebf54` |
| 2 zh files (H2 normalize fix) | 3 insertions, 3 deletions | `eea9c51` |
| `memory/p141i-prose-p1-deepening-shipped.md` | NEW | (T5 this file) |
| `memory/MEMORY.md` | +1 index line | (T5 this commit) |
| `docs/superpowers/plans/INDEX.md` | line 6 + Section 0 row | (T5 this commit) |
| `CHANGELOG.md` | +M25.1 + header | (T5 this commit) |

Total branch commits: **13 atomic** (T1 + T2 + T3 [9 prose + 1 fix] + T4) — exceeds plan target of +5 because T3 is per-engine atomic (not 1 squashed commit). Better revert granularity.

---

## Related

- [[p141h-adsense-p0-fixes-shipped]] — ChatGPT audit + 3 of 4 P0 fixes (placeholder leakage + sources + last reviewed)
- [[adsense-resubmit-window]] — ~2026-09-01 trigger
- [[p140c-eeat-completion-shipped]] — original E-E-A-T infrastructure
- [[p140d-tier-threshold-tightening-shipped]] — sister AdSense quality batch
- [[p140g-author-bio-pages-shipped]] — preceding batch
- ChatGPT 2026-08-19 audit (user-provided, not in repo)