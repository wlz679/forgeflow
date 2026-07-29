# Tier-2 Round 7 — Composite Data-Driven Lines (P137 trial)

**Status:** design (post-brainstorm, pre-writing-plans)
**Date:** 2026-07-29
**Author:** brainstorming session output
**Batch ID:** P137 (T2.7 trial)

## 1. Problem

Tier-2 rounds 1-6 (P113-P119, 113 keys + 7 tier-1 = 120 post-processor keys) covered
**static prefix lines** like `🏆 Cheapest Model Overall`, `📊 Cost Breakdown:`, `🎯 Take-Home Breakdown:`.

**Unaddressed**: **composite data-driven lines** with dynamic data slots injected between
static prefix + suffix. Sample from current engines:

- `📊 Cost Comparison (X reqs/day)` — `Cost Comparison (` + number + ` reqs/day)`
- `🏆 Cheapest: X at $Y/mo` — `Cheapest: ` + model + ` at ` + cost + `/mo`
- `💡 Batch pricing: $X/req ($Y/mo) — save 50%` — three slots
- `📅 Usage Scenarios — Top 5 Cheapest Models at Different Volumes`

These need i18n but the post-processor's whole-word `split(en).join(zh)` approach breaks
when dynamic data is interpolated mid-line.

## 2. Architectural Decision (frozen)

**Route A**: `generate()` accepts an optional `lang` parameter (defaults to `'en'`). Engines
that need it call `t(key, lang, vars)` for each composite segment.

**Why A over B and C**:
- A: signature is additive (`lang?`), 100 engines default to EN; codegen-friendly.
- B (return `{en, zh}`): breaks return type across 100 engines; double-compute.
- C (regex post-processor): works but each new line = a new regex; `t()`-style `{var}`
  interpolation is more maintainable.

**Trade-offs accepted**:
- customFn does NOT change — runtime re-renders on input change stay EN, even on /zh/ pages.
- 8 AI cost engines need codegen signature updates; 92 business engines untouched
  (composite tier-2 work in business engines is deferred to P138+ after trial).

## 3. Scope of P137 (T2.7 trial)

### 3.1 Engines in scope

**All 8 AI cost engines** (`src/engines/ai-cost/*.ts`):
- `solopreneur-openai-token-calculator`
- `solopreneur-claude-api-cost-calculator`
- `solopreneur-gemini-api-cost-calculator`
- `solopreneur-deepseek-api-cost-calculator`
- `solopreneur-ai-api-cost-comparison`
- `solopreneur-ai-image-generation-cost-calculator`
- `solopreneur-gpu-cloud-cost-calculator`
- `solopreneur-ai-training-cost-estimator`

### 3.2 Line types: single-variable only

| Composite pattern | Example |
|---|---|
| `static_prefix (X unit)` | `Cost Comparison (X reqs/day)` |
| `static_prefix X unit` | `Cheapest: X at $Y/mo` (≤2 slots OK) |
| `static_prefix X` | `Total: $X/month` |

**Deferred to P138+** (not in P137 trial):
- Multi-variable complex: `Batch pricing: $X/req ($Y/mo) — save Z%` (3+ slots)
- Bar-chart row layouts: `icon + name + bar + cost` (multi-element, intra-line types)
- Cross-engine comparisons: `Cheapest per family: X at $Y/mo, savings vs next: $Z/mo`

### 3.3 Target: 6-8 new translation keys

| New key | ZH value | Used in engines |
|---|---|---|
| `engine_cost.comparison_title` | `📊 成本对比` | openai/claude/gemini/deepseek/api-comparison |
| `engine_cost.cheapest_line` | `🏆 最便宜: {model}，每月 {cost}` | claude/api-comparison |
| `engine_cost.saving_line` | `💡 比 {other} 省: 每月 {cost}` | openai-token |
| `engine_cost.image_cheapest` | `🎨 最便宜提供商: {model}，每张 {cost}` | image-gen |
| `engine_cost.gpu_total` | `💰 总计: 每月 {cost}` | gpu-cloud |
| `engine_cost.training_total` | `💼 训练总成本: {cost}` | training-cost |

**Cross-engine sharing rule**: Same semantically-meaningful composite line → same key.
Multiple instances of `📊 Cost Comparison (X reqs/day)` across 4 engines share `engine_cost.comparison_title`.

**Single shared comparison title = 1 key**, not 4. **Per-engine detail lines** = separate keys.

> ⚠ `engine_cost.training_total` is **tentative** — verify during implementation that
> `ai-training-cost-estimator` has a single-variable composite line matching this shape.
> If not, drop the key (avoid asserting on absent translations).

## 4. Implementation Outline

### 4.1 Signature change

**`src/core/engines/types.ts`** (1-line edit, additive):
```ts
import type { Lang } from '../../i18n';
// ...
export interface ToolEngine {
  // OLD: generate(inputs: Record<string, string>): string[];
  // NEW (optional param with default):
  generate(inputs: Record<string, string>, lang: Lang = 'en'): string[];
  calculate?: (inputs: Record<string, string>, lang?: Lang) => string[];
}
```

**Why optional + default 'en'**: 92 business engines' existing `calculate(inputs)` signatures
remain type-compatible without modification (a `(a) => string[]` function is assignable to
`(a, b?) => string[]` because extra args are ignored at call site). Only the 8 AI cost engines
need to actively thread `lang` into their `calculate()` body and call `t()`.

### 4.2 Codegen script (P137 implementation)

A new helper `scripts/codegen-add-lang-param.mjs` walks all engine files and rewrites:
- `function calculate(inputs: Record<string, string>): string[]`
- → `function calculate(inputs: Record<string, string>, lang: Lang = 'en'): string[]`

For each of the 8 AI cost engines:
- Add `import { t } from '../../i18n'` (path adjusted per file location)
- Rewrite composite-line `out.push('static_prefix' + X + 'static_suffix')` →
  `out.push(t('engine_cost.X', lang, { var1, var2 }))`

### 4.3 Translation keys

**`src/i18n/translations.ts`** — add 6 entries:
```ts
'engine_cost.comparison_title': { en: '📊 Cost Comparison', zh: '📊 成本对比' },
'engine_cost.cheapest_line': {
  en: '🏆 Cheapest: {model} at {cost}/mo',
  zh: '🏆 最便宜: {model}，每月 {cost}',
},
'engine_cost.saving_line': {
  en: '💡 Saving vs {other}: {cost}/month',
  zh: '💡 比 {other} 省: 每月 {cost}',
},
'engine_cost.image_cheapest': {
  en: '🎨 Cheapest provider: {model} at {cost}/img',
  zh: '🎨 最便宜提供商: {model}，每张 {cost}',
},
'engine_cost.gpu_total': {
  en: '💰 Total: {cost}/month',
  zh: '💰 总计: 每月 {cost}',
},
'engine_cost.training_total': {
  en: '💼 Training total: {cost}',
  zh: '💼 训练总成本: {cost}',
},
```

### 4.4 Astro rendering

**`src/pages/[lang]/[slug].astro`**:
```ts
// OLD: const initial = engine.generate(staticInputs);
// NEW:
const initial = engine.generate(staticInputs, lang);
```

8 AI cost engines will produce localized output at build time. 92 business engines
still go through `translateCalcOutput` post-processor for tier-1/2 static keys.

## 5. Testing

| Test | Action |
|---|---|
| `tests/dead-i18n-keys-guard.test.ts` | Add 6 entries to `WORKING_KEY_REQUIRED` |
| **NEW** `tests/ai-cost-t2-7-zh-output.test.ts` | 8 engines × `generate(staticInputs, 'zh')` must contain ≥1 CJK char; `generate(staticInputs, 'en')` must NOT contain CJK |
| `scripts/codegen-examples.mjs --check` | Unchanged — `staticExamples[0]` is always EN |
| P131 6 i18n guards | Unchanged — operate on input/faq/howTo strings, not tier-2 composite lines |

## 6. Acceptance Criteria (P137)

| Check | Expected |
|---|---|
| `pnpm build` | 449+ pages, no new pages (content-level change only) |
| `pnpm check` | 1204 + 1 (T2.7 zh-output) = 1205 tests pass |
| New test `ai-cost-t2-7-zh-output.test.ts` | pass |
| P103 WORKING_KEY_REQUIRED total | 150 → ~156 |
| `/zh/[slug]` pages in browser | CJK characters present in tier-2 lines (8 engines) |
| `/en/[slug]` pages in browser | No CJK in tier-2 lines |
| 3-way sync | `0	0` |

## 7. Out of Scope (deferred to P138+ gates)

| Item | Reason |
|---|---|
| Multi-variable composite lines (3+ slots) | Trial-only; if P137 succeeds, expand |
| Business engine tier-2 work (92 engines) | Trial-only; depends on P137 feedback |
| customFn localization | User explicitly opted out (cost > benefit) |
| Bar chart label localization | Multi-element intra-line, deferred |
| Codegen-extract tier | If P137 codegen works, generalize to a `codegen-engine-params` library |

## 8. Risk Register

| Risk | Mitigation |
|---|---|
| Codegen breaks 8 engines | Run `pnpm check` + `pnpm build` after each engine; diff vs git HEAD |
| `t()` not called for some line | T2.7 zh-output test catches per-engine |
| `lang` mandatory change breaks 92 business engines | All 92 still typecheck (signature accepts lang, ignored) |
| `{model}` interpolation visible in en page | Standard practice (already in use by `t()` for other keys) |
| customFn drift: en vs zh on live re-render | Documented in CLAUDE.md, accepted |

## 9. Open Decisions (P137 ship memory will close)

1. **Business engine coverage** (P138+)? — depends on trial feedback
2. **Codegen library extraction** (P139+)? — depends on whether codegen script becomes reusable
3. **Translation key naming convention** — `engine_cost.*` is domain-specific; broader `engine_t2_composite.*` may generalize better. Ship memory will document which was chosen.

## 10. References

- **P113-P119**: tier-2 rounds 1-6 (113 keys, 1:1 per-engine static pattern)
- **P119 ship memory §P120+ candidates**: first listed T2.7 as needing new architecture
- **P131 ship memory**: walker extraction (unrelated but reshaped composite i18n test infra)
- **src/i18n/index.ts:18**: `t(key, lang, vars)` already supports `{var}` interpolation
- **`docs/superpowers/specs/`**: 51 prior specs (REUSE: 2026-06-25-seo-overhaul-design for the codebase-readiness checklist pattern)
