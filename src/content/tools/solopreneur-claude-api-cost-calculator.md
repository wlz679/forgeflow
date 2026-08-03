---
slug: 'solopreneur-claude-api-cost-calculator'
engine_ref: 'solopreneur-claude-api-cost-calculator'
category_id: 'B'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'LiteLLM — Unified LLM Pricing Reference'
    url: 'https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json'
  - name: 'Anthropic Claude API Pricing — Official'
    url: 'https://www.anthropic.com/pricing'
  - name: 'Anthropic Prompt Caching Documentation'
    url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching'
---

## What This Calculator Measures

This calculator projects API costs across 7 Anthropic Claude models —
the flagship Claude Fable 5, Claude Opus 4.8 (and legacy 4.1), Claude
Sonnet 4.6, Claude Haiku 4.5, and legacy Haiku 3.5 / Haiku 3. It
models Anthropic's Prompt Caching economics (cache writes at 1.25× /
2×, cache reads at 0.1× the input price) and Batch pricing (50% off
all token costs in async mode), plus cross-provider comparison against
OpenAI, DeepSeek, and Gemini baselines.

## How It Works (Methodology)

Anthropic charges per input and output token per model. With Prompt
Caching, the prompt is split into a cacheable prefix (system
instructions, long context) and a variable suffix (user query). Cache
writes happen on first hit and are 1.25× (5-min TTL) or 2× (1-hour
TTL) the standard input rate. Cache reads cost 0.1× input — a 90%
discount on subsequent hits.

```
BlendedInput   = NonCachedInputTokens × InputPrice
               + CacheMissTokens × InputPrice × WriteMultiplier
               + CacheHitTokens × InputPrice × 0.1

CostPerReq     = BlendedInput + (OutputTokens / 1M) × OutputPrice
MonthlyCost    = CostPerReq × RequestsPerDay × 30
```

| Variable             | Meaning                                                       |
| -------------------- | ------------------------------------------------------------- |
| `cacheWriteTokens`   | Stable prefix tokens to cache (system prompt, few-shot)       |
| `cacheTtl`           | `5min` (1.25× write) or `1hour` (2× write)                    |
| `cacheReadHitRate`   | % of requests where cached prefix is reused                   |
| `CACHE_READ_MULT`    | 0.1 (cached reads cost 10% of standard input)                 |
| `pricingMode`        | `realtime` or `batch` (50% discount on every token)           |
| `Break-even`         | ~2 cache reads for 5-min TTL, ~2 for 1-hour TTL               |

Cache writes are expensive, but cache reads are 90% off. Break-even
hits the second read — anything beyond is pure savings.

## Limitations & When Not To Use

This calculator assumes **Anthropic Messages API pricing**. It does
not model: Claude.ai subscription plans (Pro/Team/Enterprise),
Bedrock/Vertex AI surcharges (typically 5-15% markup), enterprise
contracts with committed-use discounts, or the new Claude vision API
(image input tokens billed separately). Prompt caching only works on
prefixes ≥ 1,024 tokens in the standard tier, and there's no benefit
for short prompts. Re-run before committing — Anthropic's prices drop
~10-30% every 6-12 months as new tiers release.

## Worked Example

A RAG application at 2,000 input tokens, 1,000 output tokens, 500
requests/day on Claude Sonnet 4.6 with 2,000 cached-prefix tokens at
60% cache hit rate, 5-minute TTL:

1. `Input cost` (no cache) = (2,000 / 1M) × $3.00 = **$0.006/req**
2. `Output cost` = (1,000 / 1M) × $15.00 = **$0.015/req**
3. `With caching`: non-cached 0 token + miss 800 × $3 × 1.25 + hit 1,200 × $3 × 0.1 = **$0.0036/req**
4. `CostPerReq` = $0.0036 + $0.015 = **$0.0186/req**
5. `MonthlyCost` = $0.0186 × 500 × 30 = **$279/mo**
6. `Batch pricing` cuts this to **$139.50/mo** — savings pay for a Sonnet seat