---
name: p140a-adsense-scaffold-shipped
description: P140a scaffold closes the AdSense "low-value content" rejection — deletes the misleading AdUnit.astro placeholder (Google was rejecting the literal "AdSense — home hero" dashed boxes), wires the global adsbygoogle.js script for Auto Ads, and ships a Content Collections schema + CalculatorProse renderer + 2 CI guards. 100×2 prose mass-write is P140b.
metadata:
  type: project
---

# P140a — AdSense compliance scaffold (shipped 2026-07-31)

## What

Deleted the literal-placeholder `AdUnit.astro` (which AdSense reviewers flagged as misleading — it rendered "AdSense — home hero" text inside dashed boxes but never requested real ads) and replaced with the global `pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3420554170441272` Auto Ads script (already in `BaseLayout.astro`). Established the editorial-prose foundation: Astro Content Collections schema (`src/content/tools/<slug>.{lang}.md`), zod-validated frontmatter (`engine_ref`, `category_id` enum of 15 letters, `reviewed_by`, `author`, `data_reviewed_at` YYYY-MM-DD, `sources` ≥ 1), 4-H2 markdown body (intro / methodology / limitations / worked example), and the section-extracting `CalculatorProse.astro` renderer. Shipped 2 CI guards: `tests/no-adsense-placeholder-guard.test.ts` (source-only, prevents AdUnit resurrection) and `tests/content-prose-shape-guard.test.ts` (build-dep, eagerly validates prose files via imported zod schema).

## How to apply

- Reference when working on P140b/c/d — this batch is the SCAFFOLD ONLY.
- Reference when adding new editorial-prose schema fields (extend `src/content/tools-schema.ts`, NOT `src/content/config.ts` — config.ts wraps the schema for Astro runtime; tools-schema.ts is the Astro-agnostic source of truth that the test can import).
- Reference when Astro throws `ContentSchemaContainsSlugError` — Astro 4.x reserves `slug` for entry-id generation. The zod schema must omit it; frontmatter `slug:` text is decorative.
- Reference when `entry.body` needs section-by-section extraction on Astro 4 — use line-split (`body.split(/\n(?=## )/)`), not a JS regex with PCRE-style `\Z` (which doesn't exist; `(?!\s\S)` is too permissive and matches almost anywhere).
- Reference when adding new prose files — they need `_README.md` style underscore-prefix for editor guides (T4 lesson), `<slug>.md` for en, `<slug>.zh.md` for zh, with `-zh` suffix in frontmatter slug field to disambiguate from Astro's duplicate-slug protection.

## Deferred to P140b/c/d

- P140b (next): mass-write 100×2 = 200 markdown files; wire `CalculatorProse` into `[lang]/[slug].astro`; expand FAQ from 3-5 to 12+; upgrade `EeatTrustBlock` with author/reviewer/sources cards; add `seo-factory.ts` author/review structured data.
- P140c: deepen `about` (Editorial Standards / Our Reviewers sections); new `src/data/reviewers.ts`; author bio page at `/about/authors/`.
- P140d: enable Google AdSense Auto Ads console toggle (manual step); resubmit AdSense; tighten `content-prose-shape-guard.test.ts` zh 缺位=build fail; CLAUDE.md defense-in-depth count update; CHANGELOG M23.3; 4 ship memory files.
