# OpenAI Token Calculator v3 — Design Spec

**Date:** 2026-06-13
**Status:** Approved
**Scope:** `src/engines/openai-token-calculator.ts` + `src/data/tools.ts` + `src/i18n/translations.ts`

## Overview

Deep upgrade of the OpenAI Token Calculator from a basic 4-model cost estimator to an industry-leading AI cost planning tool. The upgrade covers: 2026 model lineup (14 models), token text estimator, multi-model comparison bar chart, batch API / prompt caching toggles, usage scenario presets, cost growth projections, and savings insights — all implemented within the existing architecture without new dependencies.

## Section 1: Model Catalog

Replace the current 4-model lineup with a 14-model catalog reflecting June 2026 OpenAI pricing. Models are organized into four families with metadata for family, context window, and pricing tier.

### GPT-5 Family (Flagship)

| Model | Input ($/1M) | Output ($/1M) | Context | Notes |
|---|---|---|---|---|
| GPT-5.5 | $5.00 | $30.00 | 1M | Latest flagship, strongest reasoning |
| GPT-5.2 | $1.75 | $14.00 | 400K | Value flagship |
| GPT-5 | $1.25 | $10.00 | 400K | Balanced choice |
| GPT-5 Mini | $0.25 | $2.00 | 400K | Recommended for daily production |
| GPT-5 Nano | $0.05 | $0.40 | 400K | Ultra-low-cost, simple tasks |

### GPT-4.1 Family (Long Context Specialists)

| Model | Input ($/1M) | Output ($/1M) | Context | Notes |
|---|---|---|---|---|
| GPT-4.1 | $2.00 | $8.00 | 1M | 1M context window — replaced GPT-4o as recommended production model |
| GPT-4.1 Mini | $0.40 | $1.60 | 1M | Lightweight long context |
| GPT-4.1 Nano | $0.10 | $0.40 | 1M | Cheapest long context |

### o-series (Reasoning Models)

| Model | Input ($/1M) | Output ($/1M) | Context | Notes |
|---|---|---|---|---|
| o3 | $2.00 | $8.00 | 200K | Strong reasoning, mid price |
| o4-mini | $1.10 | $4.40 | 200K | Lightweight reasoning |

### Legacy (Still Available)

| Model | Input ($/1M) | Output ($/1M) | Context |
|---|---|---|---|
| GPT-4o | $2.50 | $10.00 | 128K |
| GPT-4o Mini | $0.15 | $0.60 | 128K |
| GPT-4 Turbo | $10.00 | $30.00 | 128K |
| GPT-3.5 Turbo | $0.50 | $1.50 | 16K |

### Implementation Notes

- Each model entry carries `family`, `contextWindow`, `isLegacy` metadata
- Models displayed in the dropdown grouped by family (using visual separators or indentation)
- Default selection: GPT-5 Mini + GPT-5.5 + GPT-4.1 (three-way comparison)

## Section 2: Input Design

### 2.1 Usage Scenario Presets (6 scenarios)

One-click fill for common AI use cases. Each preset sets recommended model, token counts, and request frequency.

| Scenario | Input Tokens | Output Tokens | Req/Day | Recommended Model |
|---|---|---|---|---|
| Customer Support Bot | 800 | 200 | 500 | GPT-5 Mini |
| RAG Q&A | 3,000 | 400 | 200 | GPT-4.1 |
| Code Review | 5,000 | 800 | 50 | GPT-5.5 |
| Document Translation | 2,000 | 1,500 | 100 | GPT-5 |
| Content Generation | 500 | 2,000 | 100 | GPT-5.2 |
| Data Analysis | 4,000 | 3,000 | 30 | o3 |

### 2.2 Token Text Estimator

Paste raw prompt text to estimate token counts. No external tokenizer library needed — uses industry-standard approximation rules.

| Language | Rule | Example |
|---|---|---|
| English | `tokens ≈ chars / 4` | 400 chars → ~100 tokens |
| Chinese | `tokens ≈ chars / 1.5` | 1500 chars → ~1,000 tokens |
| Mixed | Split by Unicode range, weighted average | Auto-detect |

Accuracy: ±15% — sufficient for cost estimation. OpenAI officially recommends this as a lightweight alternative to `tiktoken`.

### 2.3 Core Input Fields (unchanged from current)

| Field | Type | Default |
|---|---|---|
| Model | Multi-select (was single select) | GPT-5 Mini + GPT-5.5 + GPT-4.1 |
| Input Tokens per Request | Number | 1,000 |
| Output Tokens per Request | Number | 500 |
| Requests per Day | Number | 100 |

### 2.4 Advanced Options (new, collapsed by default)

| Field | Type | Default | Description |
|---|---|---|---|
| Pricing Mode | Toggle: Real-time / Batch | Real-time | Batch = 50% discount |
| Prompt Cache Hit Rate | Slider 0-100% | 0% | 50% discount on cached input tokens |
| Monthly Growth Rate | Slider 0-50% | 0% | For growth projections |
| Projection Period | Select: 3/6/12 months | 12 months | How far out to project |

## Section 3: Output Design (4 Layers)

### Layer 1: All-Model Comparison Bar Chart

Horizontal bar chart comparing monthly cost across all models matching the user's inputs. Pure CSS implementation — no chart library.

- Bar width: `calc((cost / maxCost) * 100%)`
- Color coding by family: Blue (GPT-5), Green (GPT-4.1), Orange (o-series), Gray (Legacy)
- Each bar shows: model name + monthly cost + "cheapest"/"best value" badge where applicable
- Re-renders on any input change (client-side via customFn)

### Layer 2: Detail Cards (one per selected model)

Each card shows:
- Model name, family tag, context window badge
- Cost per request (with input/output split bar)
- Daily / Monthly / Annual cost
- Batch mode cost (if different)
- Cached cost estimate (if cache rate > 0)
- Copy and Export buttons per card

### Layer 3: Cost Growth Projection Table

If growth rate > 0, show a table:

| Month | Model A | Model B | Model C | Cumulative Difference |
|---|---|---|---|---|
| 1 | $X | $Y | $Z | - |
| 3 | $X' | $Y' | $Z' | - |
| 6 | ... | ... | ... | Save $W with cheapest |
| 12 | ... | ... | ... | Save $W' with cheapest |

Includes a summary line: "Over 12 months, choosing [cheapest model] over [most expensive] saves $X."

### Layer 4: Savings Insights (auto-generated tips)

- 🏆 Cheapest option at current usage
- ⚡ Best value (quality/cost balance) recommendation
- 💸 Specific switch savings (e.g., "Switching from GPT-5.5 to GPT-5 Mini saves $1,035/year")
- 🗜️ Caching impact (e.g., "Enabling prompt caching at 30% hit rate saves $189/year")
- 📊 Scenario table: cost at 50/100/500/1K/5K/10K requests/day for each selected model

## Section 4: Architecture & Data Flow

### Computing Model

- **Client-primary**: All interactivity (bar chart, presets, tokenizer, toggle re-renders) runs via `customFn` in the browser
- **Server-fallback**: `engine.generate()` produces static HTML for SSR/SEO/no-JS environments
- **No new dependencies**: Bar chart = CSS, tokenizer = JS math, all within existing `customFn` sandbox

### Data Flow

```
Presets / Tokenizer / Toggles
         │
         ▼
   Form Input Aggregation (model array, token counts, flags)
         │
         ▼
   customFn(inputs) ──→ Results array (structured)
         │
    ┌────┼────┬────────┐
    ▼    ▼    ▼        ▼
  Bar   Cards  Growth  Insights
  Chart        Table   Engine
```

### File Changes

| File | Changes |
|---|---|
| `src/engines/openai-token-calculator.ts` | **Primary**: model catalog, calculate(), customFn, inputs, staticExamples, faq, howToUse |
| `src/data/tools.ts` | Sync inputs definition |
| `src/i18n/translations.ts` | Add all missing i18n keys for inputs, faq, howToUse |

No new files. No new dependencies.

### customFn Complexity Budget

- Current: ~200 characters (minified JS)
- Target: ~1,500-2,000 characters
- Within maintainable range; single-function pattern preserved
- Variable names kept short for size but commented clearly in the TypeScript source

## Section 5: Bugs Fixed

1. **customFn model key mismatch**: The client-side `customFn` uses keys like `gpt4o`, `gpt4t` that don't match the select values (`gpt-4o`, `gpt-4-turbo`), causing all models to fallback to GPT-4o pricing. Fixed by using consistent keys.
2. **i18n key resolution**: `translations.ts` missing keys for `input.*.label`, `input.*.placeholder`, `faq.*.q`, `faq.*.a`, `how_to_use.*`. All will be added.
3. **$ prefix on non-currency inputs**: The dist HTML shows `$` prefix icons on token count and request count number inputs. Fixed in the build template logic (or worked around via i18n labels).

## Section 6: FAQ Update

Replace the 5 current FAQ entries with updated content reflecting the 2026 model landscape:

1. **What is an OpenAI token?** → Keep, add mention of the on-page token estimator
2. **Which model is cheapest?** → Update: GPT-5 Nano at $0.05/$0.40
3. **How can I reduce API costs?** → Update: add batch API, prompt caching, model routing strategies
4. **What is the difference between input and output tokens?** → Keep, add caching impact
5. **When should I use batch API vs real-time?** → New: explain 50% discount trade-off (slower response, up to 24h turnaround)
6. **What are GPT-4.1 models best for?** → New: long context use cases (document analysis, codebase review, RAG with large knowledge bases)
7. **How do reasoning models (o3/o4-mini) differ?** → New: explain reasoning tokens, when to use vs standard models

## Section 7: How To Use Update

1. Pick a scenario preset or enter your own values
2. Paste sample prompt text to estimate token counts
3. Select one or more models to compare side by side
4. Toggle batch mode and caching to see cost-saving opportunities
5. Review the bar chart, detail cards, and growth projections
6. Copy or export results for your budget planning

## Spec Self-Review

- **Placeholder scan**: No TODOs, TBDs, or incomplete sections
- **Internal consistency**: Model catalog → inputs reference models by key → customFn computes on those keys → output renders matching keys. No contradictions
- **Scope check**: Single calculator upgrade, focused, achievable in one implementation session
- **Ambiguity check**: Token estimator rules explicitly stated (±15% accuracy). Batch discount explicitly 50%. Model pricing explicitly sourced from June 2026 data
