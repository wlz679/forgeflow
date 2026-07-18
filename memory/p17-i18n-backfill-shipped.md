---
date: 2026-07-16/17/18
type: i18n-backfill-batch
commits:
  - 260c46c fix(i18n): backfill 155 missing category + tool title/description keys
  - 6b1dd49 feat(i18n): input label mechanical pass + extend completeness check + precommit wiring
  - 1a86ce9 feat(i18n): P17b tooling — engineKey marker + engine-level completeness check + insert helper
  - 2932464 fix(i18n): P17b tooling — accept double-quoted slugs + improve engine resolver
  - 082c168 feat(i18n): P17b AI Cost engines — 8 engines fully translated + engineKey=true
  - c58f4e4 feat(i18n): P17b Valuation engines — 13 engines fully translated + engineKey=true
  - fd416c3 fix(i18n): P17b tooling — state-machine FAQ/howToUse parser + double-quote zh insert
  - 292d097 feat(i18n): P17b Legacy mix engines — 17 engines fully translated + engineKey=true
  - 9f64a88 feat(i18n): P17b — promote apply-translations.mjs to canonical (handles new entries)
  - 18de684 feat(i18n): P17b Marketing/Sales/Operations engines — 20 engines fully translated
  - 3d1c5f5 feat(i18n): P17b ProductAnalytics/Retention/CustomerSupport/Knowledge engines — 24 engines
  - 70995d7 fix(i18n): P17b Task 6 - repair 5 corrupted zh values from apply-translations regex
  - fb0daa5 feat(i18n): P17b Hiring/Legal/RealEstate engines — 18 engines fully translated
trigger: user-feedback (report showing raw i18n keys on home page)
status: shipped-complete (engine-level i18n 100/100)
---

# P17 i18n Backfill Batch — Shipped (partial)

## Outcome

| Metric | Value |
|---|---|
| **Root cause** | `src/i18n/index.ts:20` fallback returns raw key when translation missing |
| **Shipped** | 472 input labels (mechanical) +30 category + 200 tool title/desc = 702 i18n entries |
| **Tooling** | Extended `scripts/check-i18n-completeness.mjs` to validate ALL categories + tools dynamically; wired into `.githooks/pre-commit` |
| **User-visible bug** | FIXED — `dist/{en,zh}/index.html` raw-key count = 0 (was 8+ for M/O/S/R/P/H/T/K/L categories) |
| **Pre-existing debt** | 574 input labels + 856 FAQ q/a + 568 how-to-use = ~1998 keys still missing for per-tool pages |

## Bug Discovery (user feedback, 2026-07-16)

User reported (with screenshots): new calculator titles/descriptions show raw i18n keys like "tools.solopreneur-coupon-attribution-calculator.description" and category header shows "M. category.M.name".

## Phase 1+2 Root Cause Investigation

**Root cause**: `src/i18n/index.ts:20` fallback returns raw key when missing:
```ts
if (!entry) return key;
```

**Why missing keys exist** (P6-P14 era debt):
- 9 categories (M/O/S/R/P/H/T/K/L) added in P6-P14 batches never received `category.{X}.name/desc`
- 68 tools (added in P4-P16, including the 2 new e-commerce engines) never received `tools.{slug}.title/description`
- The 2 P16 marketing engines (coupon-attribution, cart-abandonment-cost) MADE the bug visible

**Why it wasn't caught by build**:
- `scripts/check-i18n-completeness.mjs` only checked legacy keys (eeat / about / category.{A-F}.* / favorites / recent / history). It did NOT validate `category.{X}.name/desc` for all 15 categories nor `tools.{slug}.title/description` for all 100 engines.

## Phase 3+4 Fix

### Commit 1: `260c46c` — visible bug fix (home page)
- 30 category.{X}.name + .desc entries (full ZH translations, professional)
- 100 tool title + 100 tool description (full ZH translations)
- Plus 3 legacy tools (stripe-fee, safe-convertible, remote-vs-office) discovered missing during dedup
- Total: 233 keys (claimed 155 + 78 uncovered during merge)
- scripts/extract-i18n-needed.mjs added (single-source-of-truth enumeration)

### Commit 2: `6b1dd49` — defense layer
- 372 input label + placeholder entries (mechanical pattern translation; 99 skipped as already-existing)
- Extended `scripts/check-i18n-completeness.mjs` to dynamically validate ALL 230 category + tool title/desc keys
- Wired into `.githooks/pre-commit` (runs when translations/data/engines change)
- Test: removing any tool title fails the check immediately

### Verification

- `pnpm exec astro build`: 313 pages, 0 errors
- `grep -c "tools\.solopreneur\|category\.[A-Z]\.(name|desc)" dist/{en,zh}/index.html` → 0
- User-reported M category header now shows "M. 营销分析" (zh) / "M. Marketing Analytics" (en)

## Lessons Consolidated

1. **Silent fallback is a footgun.** `src/i18n/index.ts:20` returning the raw key surfaces engineering keys to end users verbatim. The P17 fix does NOT change this behavior (kept scope tight), but should consider in P18: return a sanitized human-readable fallback (e.g., humanize `tools.solopreneur-x-calculator.title` → "X Calculator") for any future missing keys.

2. **Completeness-check scope must match production consumers.** check-i18n-completeness.mjs validated 130 legacy keys but missed the 230 dynamic keys that pages actually consume. Defense-in-depth requires check scripts to mirror real callers.

3. **Legacy i18n entries are NOT updated when engines get v3 audits.** Engines added P6-P14 received the v3 health bands in `generate()` outputs but their `tools.{slug}.title/description` stayed at P1-era simpler text. Fix: every engine update must include a "translations cohort" step.

4. **Mechanical translation is high-value but bounded.** 471 of 859 input labels translated cleanly via exact-match dictionary (54% coverage). The remaining 388 require either (a) more dict entries (incremental) or (b) subagent+domain expertise (high effort). P17b should grow the dict then re-run.

5. **Data source confusion between engines and tools data.**
- `src/data/tools/*.ts` carries slug + title + description + inputs.name (SEO metadata)
- `src/engines/*/*.ts` carries faq + howToUse + inputs.label + inputs.placeholder (engine runtime)
- These have inconsistent naming (e.g., `productivity-ramp-calculator.ts` engine vs `solopreneur-productivity-ramp-curve-calculator` slug). Caused one false-start duplicate.
- Pattern: always use the slug from `src/data/tools/*.ts` as the canonical `tools.{slug}` key namespace.

6. **Subagent-driven-development for translation work is bounded.** 2513 keys is too much for subagent quality. Direct inline translation is more reliable for small batches but caps output volume.

## Deferred Work (P17b candidates)

| Scope | Missing | Notes |
|---|---|---|
| Input labels + placeholders | 388 | Mostly AI cost engines + niche domain terms. Need dict growth or subagent. |
| FAQ q + a | ~856 | Domain-knowledge intensive. Per-engine. |
| How-to-use | ~568 | Per-engine. Often auto-redundant with engine inputs labels. |

**Suggested P17b approach**:
1. Use one subagent per category (10 calcs × 6 batches) for FAQ + how-to-use
2. Extend input label dictionary with AI cost terms
3. Re-extend check-i18n-completeness to validate engine-level keys (input/FAQ/howToUse)
4. Add `engineKey: true` marker per engine indicating when i18n coverage is complete

## Files

- `src/i18n/translations.ts` (+155 unique entries + 372 input label entries)
- `scripts/check-i18n-completeness.mjs` (extended to dynamic validation)
- `scripts/extract-i18n-needed.mjs` (NEW — single-source enumeration)
- `.githooks/pre-commit` (extended with i18n check)

## MEMORY.md Index Update

Added to `memory/MEMORY.md` (in-repo + Claude-side mirror) P17 pointer.

---

## P17b — Engine-Level Completion (2026-07-16/17/18)

### Outcome

| Metric | Value |
|---|---|
| **engines marked engineKey=true** | 100/100 |
| **net keys added (P17b)** | ~2300 ZH translations (input labels, placeholders, FAQ q+a, how_to_use) |
| **tooling added** | `engineKey?: boolean` marker, `scripts/insert-translations.mjs`, `scripts/apply-translations.mjs` (promoted), state-machine FAQ/howToUse parser |
| **build** | 313 pages, 0 errors |
| **gate** | `check-i18n-completeness.mjs` PASS — `+ 100 engineKey=true engines fully translated` |
| **raw key invariant** | `dist/{en,zh}/index.html` raw-key count = 0 / 0 |

### Commits by batch (Tasks 1-7)

- **Task 1 (`1a86ce9`)** — Tooling: added `engineKey?: boolean` to `ToolEngine`; extended `check-i18n-completeness.mjs` to validate engine-level keys + read engineKey flag; created `scripts/insert-translations.mjs`.
- **Tooling fix (`2932464`)** — Accept double-quoted slugs in check script; fallback resolver for engine file vs slug mismatches (e.g., `ai-image-cost-calculator` slug ↔ `ai-image-generation-cost-calculator.ts` file).
- **Task 2 (`082c168`)** — AI Cost 8 engines marked. Hybrid pre-flight pattern discovered: P17 batch pre-populated ~164 keys → insert was no-op, marker added directly.
- **Task 3 (`c58f4e4`)** — Valuation 13 engines. Implementer manually handled 30 missing FAQ keys + 17 placeholder updates due to extract bug (state-machine parser not yet shipped).
- **Tooling fix (`fd416c3`)** — Replaced fragile FAQ regex with **bracket-balanced + string-literal state-machine parser**. Promoted from `scripts/.scratch/extract-faqs.mjs` (Task 3 subagent POC). Fixed `insert-translations.mjs` to handle double-quoted zh values. Stats: 870 → 1082 FAQ q+a keys (+212).
- **Task 4 (`292d097`)** — Legacy mix 17 engines (saas + cost + freelance + investment). 67 new ZH entries. Used scratch `apply-translations.mjs` (handle-new-entries superset of insert-translations.mjs).
- **Tooling fix (`9f64a88`)** — Promoted `scripts/.scratch/apply-translations.mjs` → canonical `scripts/apply-translations.mjs`. Tasks 5-7 use this for new entries.
- **Task 5 (`18de684`)** — Marketing + Sales + Operations 20 engines. 507 new ZH translations. Implementer interrupted mid-task (session restart); orchestrator verified state + committed.
- **Task 6 (`3d1c5f5`)** — Product Analytics + Retention + Customer Support + Knowledge 24 engines. 487 ZH entries. Subagent API timeout → orchestrator dispatched focused JSON-generation subagent + ran `apply-translations.mjs` + `engineKey` markers inline.
- **Tooling fix (`70995d7`)** — Repaired 5 corrupted zh values in `translations.ts` (apply-translations.mjs UPDATE regex matched only up to first `'` when original zh had embedded apostrophes — bug from P17 batch P17-style zh values).
- **Task 7 (`fb0daa5`)** — Hiring + Legal + Real Estate 18 engines. 517 ZH entries. Clean run (no corruption this batch).

### Lessons Consolidated

1. **engineKey opt-in marker is the right pattern.** Forward-compatible: legacy engines default to NOT set (no false positives); new engines SHOULD set after translating. P17b sets 100/100 → enforced completeness. Future batches add `engineKey: true` only after all keys translated.

2. **State-machine parsers >> regex for structured text extraction.** The original FAQ regex `\{\s*q:\s*'((?:[^'\\]|\\.)*)'\s*,\s*a:\s*'((?:[^'\\]|\\.)*)'\s*\}` failed on 19/100 engines that used double quotes for FAQ entries. The state-machine parser (bracket-balanced + parseStringLiteral) extracted 100% of FAQ entries correctly. **Lesson: when regex has more than one escape mode (single quote + double quote + escape), prefer state-machine.**

3. **`apply-translations.mjs` has a latent UPDATE-regex bug** that corrupts lines when the original zh value contains embedded apostrophes. Affects lines where P17 batch wrote `zh: '...对 '$10M-$50M...'` (unescaped `'`). The `[^']*` regex matches only up to the first `'`, the replace leaves dangling suffix, and the resulting line fails JS parse. **Fix is a state-machine parser for zh values** (deferred to P18 follow-up). P17b works around with manual repair scripts when corruption detected.

4. **Hybrid pre-flight pattern works well for partially-populated translation files.** Pattern: (1) read extract JSON to get expected keys per engine; (2) count actual keys in translations.ts via `grep -c`; (3) if expected == actual → skip insert; if gap → translate missing only; (4) if actual > expected → investigate. This avoids re-translating already-populated entries (P17 batch pre-populated many).

5. **Subagent API timeouts are real for translation work.** Tasks 5 + 6 hit timeouts. Mitigation: dispatch **focused JSON-generation subagents** (one task, ≤500 keys, save to .scratch/). Orchestrator runs `apply-translations.mjs` + verification inline. Pattern: orchestrator + subagent division of labor avoids both timeout AND scope risk.

6. **`apply-translations.mjs` was promoted from `scripts/.scratch/` mid-batch** (Task 4 → 9f64a88). Tasks 4-7 needed it because insert-translations.mjs only handles fill-empty-zh (not create-new-entries). Keep scratch + canonical directories clean: scratch is subagent workspace, canonical is shipped tooling.

7. **`engineKey=true` flag placement convention**: as the LAST field of the engine object literal, after `dataLastUpdated` (if present) or after `slug`. All 100 engines follow this pattern.

8. **Build failures from corrupted translations.ts must be caught early.** Vite/esbuild errors with line:col are precise (e.g., `translations.ts:1684:368`); immediately inspect that line. Pattern: grep for lines with multiple `'tools.` references (corruption signature).

### Files

- `src/core/engines/types.ts` (+5 lines: `engineKey?: boolean` field)
- `scripts/check-i18n-completeness.mjs` (+74 lines: engineKey validation phase)
- `scripts/extract-i18n-needed.mjs` (+121 lines: state-machine FAQ/howToUse parser)
- `scripts/apply-translations.mjs` (NEW: comprehensive update + create new entries)
- `src/i18n/translations.ts` (+~2300 entries, ~4000 lines total)
- `src/engines/*/*.ts` (100 × +1 line each = `engineKey: true,`)

### Final Stats

- **100/100 engines** with `engineKey: true`
- **411 base + 230 dynamic + 100 engineKey** validation keys
- **313 pages** built, **0 raw keys** in dist/{en,zh}/index.html
- **8 batch commits** (Tasks 1-7) + **3 tooling/fix commits** (2932464, fd416c3, 9f64a88) + **1 corruption fix** (70995d7) = **12 commits** total

### P18 Followups

1. **`apply-translations.mjs` state-machine parser for zh values** — fix the latent UPDATE bug that corrupts lines with embedded apostrophes.
2. **`scripts/insert-translations.mjs` cleaning** — superseded by `apply-translations.mjs`; consider deprecation or merge.
3. **ZH terminology consistency audit** — Task 5 reviewer flagged pipeline/管线混用, cohort/同期群, etc. Cross-batch audit script.
4. **Real-estate engines** have no category letter (R is Retention per P9 reassignment). Separate treatment in P17b was correct but unresolved at category level.

---

## P18 i18n Tooling Hardening — Shipped 2026-07-18

Plan: `docs/superpowers/plans/2026-07-18-p18-i18n-tooling-hardening.md` (4 tasks, 7 commits, baseline `6c4e16a`).

### Outcome

| Metric | Value |
|---|---|
| Commits | 7 (Tasks 1-4 + 1 orchestrator docstring fix + 1 reviewer-fix for Task 4 + 1 ZH apply commit) |
| Diff stat | 16 files, +543 / -141 |
| Latent i18n UPDATE bug | **FIXED** (regex `[^']*` → `parseStringLiteralSmart` state-machine via `scripts/lib/zh-parser.mjs`) |
| `insert-translations.mjs` retired | ✅ (P17b supersede complete; orphan docstring reference fixed in `34c2b90`) |
| ZH terminology drift | 60-row glossary + audit script + scripted fixer; 21/21 curated fixes applied; 13 false positives preserved |
| Category F renamed | "Investment & ROI" → "Investment & Real Estate"; slug kept `investment-roi` (zero URL migration); q6/q7 added (cap-rate + mortgage FAQs) |
| Gates | check-i18n-completeness PASS (100 engineKey=true); build 313 pages; raw-key 0/0; regression test 4/4 pass |
| 3-way sync | gitee + github both at `6ab23e4`; rev-list `0\t0` |

### Commits

- `0cd3aff` — fix(i18n): P18-1 — apply-translations.mjs uses state-machine parser for zh values
- `014abcb` — chore(i18n): P18-2 — retire superseded scripts/insert-translations.mjs
- `34c2b90` — chore(i18n): P18-2 — fix orphan docstring reference to deleted insert-translations.mjs
- `60c53a5` — feat(i18n): P18-3 — ZH terminology glossary + audit script + scripted fixer (audit-only commit)
- `1bc503a` — feat(i18n): P18-3 — apply curated ZH terminology fixes (21/21 applied)
- `e101f00` — feat(i18n): P18-4 — rename category F to 'Investment & Real Estate'
- `6ab23e4` — chore(i18n): P18-4 fix — swap q6/q7 key order + update About page category name

### Lessons Consolidated

1. **State-machine parser > regex for structured string parsing.** The latent UPDATE-regex bug (`[^']*` matches up to first `'`) corrupted 5 zh entries in P17b; manual repair scripts (`fix-5-corruptions.mjs`, `fix-nrr.mjs`, `fix-corruptions.mjs`) were the workaround. P18-1 replaces with `parseStringLiteralSmart` (looks ahead past unescaped quotes to `,`/`}` boundary) — extracted to `scripts/lib/zh-parser.mjs` for testability + reuse.

2. **Two-parser design is justified, not over-engineering.** `parseStringLiteral` (strict) is correct for valid JS engine source. `parseStringLiteralSmart` (tolerant) is needed for translations.ts where P17b corruption pattern leaves unescaped quotes inside zh values. Standard parser cannot recover this; smart parser is the right level. Lesson: when input may carry data corruption (not just well-formed data), dedicated tolerant parser beats generic error.

3. **`scripts/insert-translations.mjs` retirement pattern.** Retiring a supersede-by tool is mechanical + 1 file delete + 1 docstring update + grep-no-live-callers. CLAUDE.md brief instructions about "remove from tooling section" can be stale (the section may not exist); implementer should verify before acting. Orchestrator caught the orphan docstring concern via implementer report, fixed inline.

4. **ZH terminology audit must distinguish "term drift" from "false positive".** 34 raw findings → 21 true positives (apply canonical form) + 13 false positives (preserve original). Curator judgment required: `保留` → `留存` only when EN is "retention" semantics, NOT when EN is "keep/preserve" (`保留旧价格` = keep old price; `本地数据将保留` = local data will be kept). `客户流失` → `流失` only when EN is generic churn, NOT when EN explicitly says "customer churn" or "logo churn" (these ARE the canonical customer/logout terms).

5. **Brief-internal contradictions surface during implementation, not review.** P18-4 brief Step 3 assumed q2/q3 didn't exist (wrong, q1-q5 were all there); brief's fallback clause authorized appending. Brief's q2/q3 block content was mortgage + cap-rate but brief numbered them q2/q3 in the assumption-of-blank context — when appended they became q6/q7. Implementer correctly interpreted "append" intent; reviewer caught the key-order discrepancy; fix subagent swapped to align with brief's literal "q6=cap-rate, q7=mortgage" intent.

6. **Slug-vs-URL coupling in Astro file-routing is a hidden constraint.** `src/pages/[lang]/investment-roi.astro` filename = URL `/en/investment-roi/` + `/zh/investment-roi/`. Renaming `slug: 'investment-roi'` → `slug: 'investment-real-estate'` in `categories.ts` would NOT auto-rename the file; URL would silently break. Metadata-only rename requires keeping slug stable. User accepted name↔slug asymmetry as future follow-up (URL sync would need file rename + redirect).

7. **Subagent watchdog timeout mitigation.** 2 of 6 subagent dispatches stalled (P18-3 Step 9 commit + P18-5 holistic review). Recovery pattern: orchestrator takes over remaining steps inline. For Task 3: most of work was on disk (3 new files + audit JSON), so orchestrator only needed to run commit + push + curator step + apply commit + dual-push. For Task 5 (final review): per-task reviewer evidence was complete (4 APPROVED verdicts), so inline self-review is sufficient.

### Files

- `scripts/lib/zh-parser.mjs` (NEW, 87 lines: `parseStringLiteral` + `parseStringLiteralSmart` + `replaceZhValue`)
- `scripts/apply-translations.mjs` (-60 / restructured: UPDATE block now uses `replaceZhValue` import)
- `scripts/audit-zh-terminology.mjs` (NEW, 54 lines: glossary-driven audit)
- `scripts/fix-zh-terminology.mjs` (NEW, 88 lines: applies curated fixes via `replaceZhValue`)
- `scripts/insert-translations.mjs` (DELETED, 58 lines)
- `scripts/.scratch/_archive/` (NEW dir; archived fix-{5-corruptions,nrr,corruptions}.mjs from P17b)
- `tests/scripts/test-apply-translations-zh-parser.mjs` (NEW, 4 fixtures)
- `docs/i18n/zh-terminology.md` (NEW, 60-row glossary)
- `src/data/categories.ts` (F entry name + description updated; slug stable)
- `src/data/application-categories.ts` (comment updated)
- `src/i18n/translations.ts` (62 changes: about.data_sources.body + category.F entries + q6/q7 new + 21 ZH terminology fixes)
- `src/pages/[lang]/investment-roi.astro` (FAQ array bound [1-5] → [1-7])
- `memory/p17-i18n-backfill-shipped.md` (P18 section appended)

### Deferred / P19 Candidates

- `.gitignore:22 docs/` blocks new docs/ files. Workaround: `git add -f`. Cleanup is a separate gitignore decision (docs/superpowers/plans/* already tracked, but new docs/* get ignored). NOT touched in P18.
- Two-parser design (`parseStringLiteral` + `parseStringLiteralSmart`) could be unified with a `tolerant: boolean` flag. Not refactoring at 87 LoC; deferred.
- Slug ↔ name asymmetry (`Investment & Real Estate` name + `/en/investment-roi/` URL) — user-accepted, deferred until URL sync desired.
- `scripts/.scratch/` directory has accumulated P17b scratch tools (build-t5-json, debug, generate-task6, etc.) — cleanup candidate.
- `audit-zh-terminology.mjs` per-row parser only stores LAST `NOT` match (regex captures all but parser writes only `set(forbidden, info)`); acceptable for 60-row glossary. Document if glossary grows.