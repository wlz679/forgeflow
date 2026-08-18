---
name: p140b-editorial-prose-shipped
description: P140b mass-write 100×2=200 editorial prose files + CalculatorProse wire + EeatTrustBlock placeholder + SoftwareApplication JSON-LD author/review + FAQ 5→12+ expansion. 28 commits master 2026-08-03/04. Catch-up memory created in P140c-T5 (was missing).
metadata:
  type: project
---

# P140b Editorial Prose Mass-Write — Ship Record (2026-08-04, catch-up)

## Origin

P140a ship memory (`memory/p140a-adsense-scaffold-shipped.md`) deferred to P140b/c/d. P140b shipped 28 commits on master during 2026-08-03 → 2026-08-04 but was never recorded in `CHANGELOG.md` or in this memory directory. This catch-up memory was created during P140c-T5 (2026-08-18) to close the documentation drift before P140d (AdSense resubmit).

## What shipped

28 commits `6850a00` (plan) → `75707a5` (holistic dedup) on master at HEAD `75707a5` (before P146 ff-merge at `17606a4`):

### Content (200 prose files)

14 category-batch commits created `src/content/tools/<slug>.md` + `<slug>.zh.md` for 100 engines × 2 langs:

- `a38c4ec` saas (4 engines × 2 lang = 8 files)
- `f8c29ad` retention (6 × 2 = 12)
- `05b71a2` product-analytics (6 × 2 = 12)
- `f2a4dcc` customer-support (6 × 2 = 12)
- `9a3186f` hiring-team (6 × 2 = 12)
- `7705245` legal-compliance (6 × 2 = 12)
- `5c36f2c` cost (5 × 2 = 10)
- `28ba139` valuation (10 × 2 = 20)
- `23c4a5e` real-estate (6 × 2 = 12)
- `233e1ff` marketing (8 × 2 = 16)
- `20d3c28` sales (6 × 2 = 12)
- `76383a9` investment (4 × 2 = 8)
- + freelance-pricing (D) + operations (O) + ai-cost (B) + knowledge (K) = 27 engines × 2 langs = 54 files (commits not shown in truncated `git log --grep=p140b | head -28`)

Total = 100 engines × 2 langs = 200 files. Confirmed via `ls src/content/tools/*.md | wc -l` = 100 + 100 = 200 (+ `_README.md` = 201 total entries in dir).

### Wire + UI

- **`1bf1a9a` CalculatorProse wired into `[lang]/[slug].astro`** — 4-section rendering (intro / methodology / limitations / worked example) with zh fallback
- **`3d887a8` zh lookup fix** — Astro 4.x strips dots from filename-derived entry IDs, so `X.zh.md` → slug `Xzh` (NOT `X.zh`). All 100 zh pages were rendering en prose before this fix
- **`7f0400c` zh fallback console.warn** — fires on missing zh entry (not just both missing)
- **`21a7a4d` -zh suffix strip** — match entry-id pattern
- **`682d602` EeatTrustBlock** — Author card + Reviewer cards + Sources links (placeholder reviewer data; replaced by real persona in P140c-T3)
- **`11f4ac9` SoftwareApplication JSON-LD** — author (Person) + review (Review[]) structured data fields
- **`de4f13c` ToolMeta E-E-A-T fields** — authorId / reviewerIds / sourcesRich (additive, no breaking changes)
- **`679a9dc` bare slug strip** — 6 zh files (avoid `DuplicateContentEntrySlugError`)
- **`f490886` MRR demo md cleanup** — removed P140a placeholder comments

### Content quality

- **`a69e9f6` FAQ 5→12+ expansion** — across 100 engines (en/zh i18n + translatedFaq fallback)
- **`9c9a3ab` FAQ dedup** — 21 questions across 19 engines + LLM-fluff sweep from 147 entries
- **`75707a5` 5-engine FAQ top-up** + saas/revenue-projector dedup (T5 regression fix)

### CI guards

- **`250505d` content-prose-shape-guard threshold tightened** — en perH2 80→100, zh 50→70 + zh counterpart warn guard
- **`744a502` seo-schemas assertion** — updated for new author: Person JSON-LD structure

## Known gaps closed by P140c

| Gap | Closed by |
|---|---|
| Placeholder reviewer data at `[slug].astro:1352-1366` (`P140b-T6` TODO marker) | P140c-T3 |
| About page missing Editorial Standards / Our Reviewers / Methodology sections | P140c-T2 |
| No tier-differentiated length CI guard | P140c-T4a |
| No source URL quality CI guard | P140c-T4b |
| CHANGELOG missing P140b M-section | P140c-T5 (this catch-up) |
| Ship memory file missing | P140c-T5 (this file) |

## AdSense outcome

P140b shipped 2026-08-04 but **AdSense "low-value content" rejection was issued 2026-08-17** (13 days later). The remaining rejection drivers were the P140b gaps listed above (placeholder reviewers + missing About sections) — closed in P140c. P140d (post-P140c) will resubmit via AdSense Console.

## How to apply

- Reference when working on P140c/d — P140b was SCAFFOLD + MASS-WRITE; P140c completes E-E-A-T with real identity; P140d resubmits.
- Reference for FAQ dedup pattern (`9c9a3ab` shows the 21 dedup'd Qs and LLM-fluff phrases stripped).
- Reference for the Xzh-not-X.zh slug derivation rule (Astro 4.x strips dots from filename-derived entry IDs).
- Reference for content-prose-shape-guard thresholds (P140b bumped baseline; P140c-T4 added tier-differentiation).