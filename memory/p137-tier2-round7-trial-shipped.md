---
name: p137-tier2-round7-trial-shipped
description: P137 T2.7 trial = first batch to translate AI cost composite data-driven lines (static prefix + dynamic data + static suffix) via post-processor regex extension. Ships 4 composite patterns + 9 engine_cost.* keys + 1 build-dep zh-output test. ZERO engine modifications. Trial partial success: 4 of 8 brief patterns deferred to P138+ after pre-implementation grep revealed shape mismatches.
metadata:
  type: project
---

# P137 Tier-2 Round 7 Composite Data-Driven Lines Trial Ship Log

## Summary

P137 closes P119/P132/P133/P134/P135 ship memory's recurring candidate: "Tier-2 round 7 — composite data-driven lines". Trial implementation chose **Route C-extended** (post-processor regex) over Route A (generate() adds lang parameter) and Route B (return {en, zh}) after pre-plan architecture audit revealed `[slug].astro` renders `staticExamples[]` literals (not `generate()` at build).

**Outcome**: 4/8 brief composite patterns shipped + 9 `engine_cost.*` keys + 1 new build-dep test. Trial partial success. P138+ candidate backlog now contains 4 deferred patterns with verified real engine shapes.

**Date:** 2026-07-29 → 2026-07-30 (1-day span)
**Batch ID:** P137
**Files touched:** 5 (translations.ts + [slug].astro + 1 new test + run.mjs + plan file)
**Commits:** 5 (`fcc9a5c`, `f03ec6c`, `ac1aec3`, `7f0e4a2`, `398c080`)
**pnpm check:** 1206/0/0 (T2.7 zh-output 7/7 build-dep; P103 2/2 with 159 entries)
**3-way sync:** `0	0` at HEAD `398c080` (835 commits)

## Architecture final decision (Route C-extended)

Static page rendering flow:
```
[slug].astro (build)
  → engine.staticExamples[0] (codegen-wrapped EN literal)
  → translateCalcOutput(ex, 'zh')  ← ONLY on zh + custom-typed
    → headerKeys[] (whole-string tier-1/2 static headers)
    → compositePatterns[]  ← NEW: regex captures dynamic data
      → localized prefix + captured data + localized suffix
  → <ResultCard text={translated} />
```

`compositePatterns[]` lives inside `translateCalcOutput` BEFORE `return out;`. 4 entries live there now:

| Pattern | Regex | Build |
|---|---|---|
| Cost Comparison `(N reqs/day)` | `/(\u{1F4CA} Cost Comparison )\((\d+ reqs\/day)\)/gu` | prefix + digits + suffix |
| Cost Comparison `(N Models)` (openai) | `/(\u{1F4CA} Cost Comparison )\((\d+ Models)\)/gu` | prefix + literal |
| Cheapest `: X at $Y/mo` (claude/openai) | `/(\u{1F3C6} Cheapest: )([^()]+?)( at )(\$[\d.,]+)(\/mo)/gu` | prefix + name + at-infix + cost + /mo |
| Cheapest overall `: X at $Y/mo (provider)` (ai-api) | `/(\u{1F3C6} Cheapest overall: )([^()]+?)( at )(\$[\d.,]+)(\/mo) \(([a-z]+)\)/gu` | reuses prefix; providers stays EN |

## What shipped

| Commit | Description |
|---|---|
| `fcc9a5c` | 9 `engine_cost.*` keys + WORKING_KEY_REQUIRED +9 plain-string entries (now 159 total) |
| `f03ec6c` | Cost Comparison `(N reqs/day)` pattern + new build-dep test (3 engines: claude/gemini/deepseek) |
| `ac1aec3` | **F1+F2 fix** (Important follow-up from T2 review): openai `(N Models)` variant + comma-formatted `reqPerDay` robustness — `[\\d,]+` regex widening |
| `7f0e4a2` | Cheapest line composite (claude + openai + ai-api via 2 variants; trial loses "overall" nuance for ai-api) |
| `398c080` | Documentation: plan file §P137 Execution Log + T4 audit findings + P138+ candidates |

## T4 audit finding (trial value)

Brief's 4 patterns failed pre-implementation `grep` verification:

| Brief shape | Actual engine code | Why |
|---|---|---|
| `💡 Saving vs X: $Y/month` (openai) | `out.push('• Switch cheapest to ' + name + ':  save ' + fmt(savings) + '/mo')` | different prefix style |
| `🎨 Cheapest provider: X at $Y/img` (image-gen) | **no equivalent line** | only `✅ ` prefix in loops |
| `💰 Total: $X/month` (gpu-cloud) | `out.push('  Total Monthly:        ' + fmt(totalMonthly))` | no emoji prefix |
| `💼 Training total: $X` (training-cost) | `out.push('Total Estimated Cost: ' + pad('', 23) + fmt(totalCost))` | different label |

**Lesson**: P138+ brief should REQUIRE `grep -n` confirmation against actual engine source for every pattern. Trial round maximized ROI by catching this BEFORE implementation.

## Verification

| Gate | Result |
|---|---|
| `pnpm exec tsc --noEmit` | 0 errors |
| `node scripts/codegen-examples.mjs --check` | PASS (100 engines in sync) |
| `RUN_BUILD_TESTS=1 node --import tsx tests/ai-cost-t2-7-zh-output.test.ts` | 7/7 pass (21ms) |
| `RUN_BUILD_TESTS=1 node --import tsx tests/dead-i18n-keys-guard.test.ts` | 2/2 pass (159 entries) |
| Spot-check zh claude page | `📊 成本对比` × 5 · `🏆 最便宜:` × 3 ✓ |
| Spot-check zh openai page | `📊 成本对比` × 4 · `🏆 最便宜:` × 7 ✓ |
| Spot-check zh ai-api page | `📊 成本对比` × 13 · `🏆 最便宜:` × 24 ✓ |
| 100 engines untouched | ✓ (verified `git diff` audit) |
| 0 customFn changes | ✓ |
| 3-way sync | `0	0` at `398c080` ✓ |

## Process lessons learned (P137 execution)

1. **Pre-plan architecture audit saved the spec** — pre-plan grep of `[slug].astro:1145-1158` revealed the renderer uses `staticExamples[]` literals (not `generate()`). Without this audit, the spec would have assumed Route A and required engine modifications.
2. **TDD inline + recoverable subagent stalls** — 2 of 3 dispatched subagents stalled or blocked (T2 600s watchdog, T3 10s no-work). Pattern: re-dispatch not productive; inline-finish the partial work + write report + commit + proceed worked better.
3. **Brief shapes must be grep-verified BEFORE implementation** — T4 caught 4 brief/actual shape mismatches at zero implementation cost (already partial docs-only planned). P138+ should adopt grep-verified brief template.
4. **In-code documentation comments matter for fragile regex** — implementer at T2 left a 9-line in-code comment explaining the `u` flag requirement and the brief-vs-reality regex shape deviation. That comment travels with the code; P138+ won't have to re-derive.
5. **Trial partial-success is acceptable when documented** — T4 dropping 4 patterns felt like failure but is actually the most useful outcome (concrete P138+ shapes documented). Trial rounds exist precisely to surface this kind of thing.

## P138+ candidates (carryover from P137)

- **4 deferred composite patterns with real shapes** (Priority order, all single-regex):
  1. openai `Switch to batch pricing: save ~$X/mo (50% discount)` (line 598) — has 💡 prefix, dynamic
  2. openai `Switch cheapest to <name>: save $X/mo` (line 620) — different prefix style; 2-segment dynamic
  3. gpu-cloud `Total Monthly: $X.XX` (line 129) — single occurrence, simple form
  4. training-cost `Total Estimated Cost: $X.XX` (line 107) — single occurrence, simple form
- **1 new translation key** `engine_cost.cheapest_overall_prefix` to close the "overall" nuance loss in ai-api's cheapest variant
- **compositePatterns refactor** at >20 entries (currently 4; premature now)
- **business engine tier-2 coverage** (92 engines × composite lines) — only relevant if P138+ shape audit expands successful pattern base

## Architecture structural meta-lesson

> When briefs read as-if-they-could-be-Route-A but the renderer can't do Route A: spec must reflect renderer reality. Audit before planning. This applies to ALL post-processor extensions on existing static renderers — the engine `generate()` is never called at build, only `staticExamples[]` is.
