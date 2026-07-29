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

## 2. Architectural Decision (frozen, revised)

> **Revision**: Initial brainwrite assumed Route A (`generate()` accepts `lang`). Pre-plan
> architecture audit discovered Astro `[slug].astro` does NOT call `generate()` at build —
> it renders `engine.staticExamples[0]` (codegen-wrapped EN literal), then post-processes
> via `translateCalcOutput` on zh pages. **True architecture = Route C-extended.**

**Route C-extended**: Extend `translateCalcOutput` to handle composite data-driven lines.
Each composite line = a regex matcher that captures dynamic data + a replacement
function that emits localized prefix + preserved dynamic + localized suffix.

**Why C-extended over A**:
- A (lang in `generate()`) requires building whole new server-side call path; `staticExamples`
  pipeline is the real renderer. Big-bang rewrite of static-page rendering = riskier.
- C-extended follows existing tier-1/2 pattern exactly (`translateCalcOutput` already maps
  → `translations.ts` keys). Adds 6 regex patterns to a function that already runs on every
  zh page with 120 keys active.

**Trade-offs accepted**:
- customFn does NOT change — runtime re-renders on input change stay EN.
- Engines (`src/engines/ai-cost/*.ts`) NOT modified — `staticExamples[]` literals untouched.
- 92 business engines NOT affected — composite tier-2 work in business engines deferred
  to P138+ after trial feedback.
- Regex per composite line (~6-8); pragmatic for trial scope, may need re-architecture if
  P138+ expands beyond ~20 lines.

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

### 3.3 Target: 6-10 new translation keys (prefix/suffix segments)

Unlike tier-1/2 which stores whole static prefixes, T2.7 stores **prefix + suffix pairs** because
the dynamic data slots aren't known at translation time. Implementation in §4.1.a.

| New key | EN value | ZH value | Composite line it transforms |
|---|---|---|---|
| `engine_cost.comparison_title` | `📊 Cost Comparison` | `📊 成本对比` | `📊 Cost Comparison (X reqs/day)` |
| `engine_cost.reqs_per_day`     | ` reqs/day` | ` 请求/天` | (suffix of above) |
| `engine_cost.cheapest_prefix`  | `🏆 Cheapest: ` | `🏆 最便宜: ` | `🏆 Cheapest: GPT-4 at $0.05/mo` |
| `engine_cost.at_per_month`     | ` at ` | `，每月 ` | (infix between model + cost) |
| `engine_cost.saving_prefix`    | `💡 Saving vs ` | `💡 比 ` | `💡 Saving vs X: $Y/month` |
| `engine_cost.saving_suffix`    | `: ` | ` 省: ` | (separator) |
| `engine_cost.image_cheapest`   | `🎨 Cheapest provider: ` | `🎨 最便宜提供商: ` | `🎨 Cheapest provider: X at $Y/img` |
| `engine_cost.gpu_total`        | `💰 Total: ` | `💰 总计: 每月 ` | `💰 Total: $X/month` |
| `engine_cost.training_total` ⚠ | `💼 Training total: ` | `💼 训练总成本: ` | `💼 Training total: $X` |

**Cross-engine sharing**: Same composite line shape = same set of keys. e.g., the
`(X reqs/day)` format appears in 4 engines → all use `comparison_title` + `reqs_per_day`.

> ⚠ `engine_cost.training_total` is **tentative** — verify during implementation that
> `ai-training-cost-estimator` has a single-variable composite line matching this shape.
> If not, drop the key.

## 4. Implementation Outline

### 4.1 Component changes

#### 4.1.a `src/i18n/translations.ts`

Add 6 entries under new namespace `engine_cost.*`. Note: key values are the **static prefix**
portions of composite lines (entire `Cost Comparison (X reqs/day)` line is NOT stored as a key —
the dynamic part is captured by regex in 4.1.c).

```ts
'engine_cost.comparison_title': { en: '📊 Cost Comparison', zh: '📊 成本对比' },
'engine_cost.reqs_per_day':     { en: ' reqs/day',         zh: ' 请求/天' },
'engine_cost.cheapest_prefix':  { en: '🏆 Cheapest: ',     zh: '🏆 最便宜: ' },
'engine_cost.at_per_month':     { en: ' at ',              zh: '，每月 ' },
'engine_cost.saving_prefix':    { en: '💡 Saving vs ',     zh: '💡 比 ' },
'engine_cost.saving_suffix':    { en: '/month',            zh: ' 省: 每月 ' },
'engine_cost.image_cheapest':   { en: '🎨 Cheapest provider: ',
                                  zh: '🎨 最便宜提供商: ' },
'engine_cost.gpu_total':        { en: '💰 Total: ',        zh: '💰 总计: 每月 ' },
'engine_cost.training_total':   { en: '💼 Training total: ', zh: '💼 训练总成本: ' },
```

(Working count: ~10 keys, possibly fewer after implementation. `⚠ engine_cost.training_total`
tentative — drop if no matching composite line found in ai-training-cost-estimator.)

#### 4.1.b `src/pages/[lang]/[slug].astro` — extend `translateCalcOutput`

Add a new `compositePatterns` array alongside the existing `headerKeys`. After the existing
`headerKeys` whole-word replacement loop, run a regex pass:

```ts
const compositePatterns: Array<{
  regex: RegExp;
  build: (m: RegExpExecArray, t: (k: string, l: Lang) => string) => string;
}> = [
  // Example: 📊 Cost Comparison (X reqs/day)
  {
    regex: /(📊 Cost Comparison \()(\d+)(\s*reqs\/day\))/g,
    build: (m) => `${t('engine_cost.comparison_title', lang).replace(/ \(.*$/, '')} (${m[2]}${t('engine_cost.reqs_per_day', lang)})`,
  },
  // Example: 🏆 Cheapest: GPT-4 at $0.05/mo
  {
    regex: /(🏆 Cheapest:\s)(.+?)(\s+at\s+)(\$[\d.]+)(\/mo)/g,
    build: (m) => `${t('engine_cost.cheapest_prefix', lang)}${m[2]}${t('engine_cost.at_per_month', lang)}${m[4]}/mo`,
  },
  // ... 4-6 more entries
];

for (const { regex, build } of compositePatterns) {
  out = out.replace(regex, (...args) => build(args as RegExpExecArray));
}
```

#### 4.1.c Engines — ZERO modifications

8 AI cost engines + 92 business engines — **untouched**. Existing `staticExamples[]` literals
remain EN; only the post-processor transforms them for /zh/ pages.

### 4.2 Astro rendering pipeline (unchanged)

`[slug].astro:1145-1158` already does:
```ts
const translatedEx = lang === 'zh' && engine.clientConfig.type === 'custom'
  ? translateCalcOutput(ex, lang)
  : ex;
```

T2.7 trial = expand `translateCalcOutput` body. No page-level signature changes.

## 5. Testing

| Test | Action |
|---|---|
| `tests/dead-i18n-keys-guard.test.ts` | Add 6-10 entries to `WORKING_KEY_REQUIRED` |
| **NEW** `tests/ai-cost-t2-7-zh-output.test.ts` (build-dep, `RUN_BUILD_TESTS=1`) | Read `dist/zh/.../{8 engines}/index.html`; assert ≥1 CJK in section near each composite line (e.g., grep for `📊 成本对比` after the `result` block). Read `dist/en/.../index.html`; assert NO CJK in same location. |
| `scripts/codegen-examples.mjs --check` | Unchanged — `staticExamples[0]` still EN |
| P131 6 i18n guards | Unchanged — operate on input/faq/howTo strings, not tier-2 composite lines |

## 6. Acceptance Criteria (P137)

| Check | Expected |
|---|---|
| `pnpm build` | 449+ pages, no new pages (content-level change only) |
| `pnpm check` | 1204 + 1 (T2.7 zh-output) = 1205 tests pass |
| New test `ai-cost-t2-7-zh-output.test.ts` | pass (build-dep, RUN_BUILD_TESTS=1) |
| P103 WORKING_KEY_REQUIRED total | 150 → ~158 (6-10 new keys) |
| `/zh/[slug]` pages in browser | CJK characters present in tier-2 composite lines (8 engines, spot-check) |
| `/en/[slug]` pages in browser | No CJK in tier-2 composite lines (spot-check) |
| 3-way sync | `0	0` |
| `pnpm exec tsc --noEmit` | 0 errors |

## 7. Out of Scope (deferred to P138+ gates)

| Item | Reason |
|---|---|
| Multi-variable composite lines (3+ slots) | Trial-only; if P137 succeeds, expand |
| Business engine tier-2 work (92 engines) | Trial-only; depends on P137 feedback |
| customFn localization | User explicitly opted out (cost > benefit) |
| Bar chart label localization | Multi-element intra-line, deferred |
| Codegen-extract tier | No longer needed — Route C requires zero codegen; engines untouched |

## 8. Risk Register

| Risk | Mitigation |
|---|---|
| Regex false-match across line boundaries | Anchor regexes with `^` (with `m` flag) or escape suffix `(.+)` greedily |
| Number formatting changes during translation (e.g., `1,234` vs `1234`) | Regex captures numeric portion as opaque string; only prefix/suffix translated |
| Tier-1/2 static keys already translated → composite layers on top, no conflict | New keys use new namespace `engine_cost.*`; existing keys unchanged |
| `pnpm build` produces trailing whitespace or escape sequence bugs in regex | zh-output test reads actual `dist/` HTML; catches drift |
| Engine `staticExamples[]` content changes per code update break regex match | `codegen-examples.mjs --check` regenerates `staticExamples[0]`; if composite line moved, regex pattern must follow |
| compositePatterns array grows unbounded if P138+ expands | T2.7 trial = 6-10 entries; revisit naming/refactor pattern if >20 |

## 9. Open Decisions (P137 ship memory will close)

1. **Business engine coverage** (P138+)? — depends on trial feedback
2. **Translation key naming convention** — `engine_cost.*` is domain-specific; broader
   `engine_t2_composite.*` may generalize better. Ship memory will document which was chosen.
3. **compositePatterns refactor** — at 6-10 entries, an inlined array is fine. At >20, extract
   to `src/i18n/composite-patterns.ts` as a registry. P138+ decision.

## 10. References

- **P113-P119**: tier-2 rounds 1-6 (113 keys, 1:1 per-engine static pattern)
- **P119 ship memory §P120+ candidates**: first listed T2.7 as needing new architecture
- **P131 ship memory**: walker extraction (unrelated but reshaped composite i18n test infra)
- **src/i18n/index.ts:18**: `t(key, lang, vars)` already supports `{var}` interpolation
- **`docs/superpowers/specs/`**: 51 prior specs (REUSE: 2026-06-25-seo-overhaul-design for the codebase-readiness checklist pattern)
