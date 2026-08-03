---
slug: 'solopreneur-deepseek-api-cost-calculator'
engine_ref: 'solopreneur-deepseek-api-cost-calculator'
category_id: 'B'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'LiteLLM — Unified LLM Pricing Reference'
    url: 'https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json'
  - name: 'DeepSeek API Pricing — Official'
    url: 'https://api-docs.deepseek.com/quick_start/pricing/'
  - name: 'DeepSeek Automatic Caching Announcement'
    url: 'https://api-docs.deepseek.com/news/news0802/'
---

## What This Calculator Measures

This calculator prices out DeepSeek's API across 4 models — V4 Flash
($0.14 input / $0.28 output per 1M tokens), V4 Pro and its 75% promo
($0.435 / $0.87), and the legacy R1 reasoning model ($0.55 / $2.19).
DeepSeek's standout feature is automatic prefix caching — every repeated
prefix in the conversation is auto-cached at 0.02× input price (98%
discount) with zero code changes. Use this calculator to model
high-volume workloads where DeepSeek's caching and aggressive pricing
beat OpenAI/Claude by 10-100×.

## How It Works (Methodology)

DeepSeek's API mirrors OpenAI's per-token pricing. The killer feature
is Automatic Caching — the server detects repeated prompt prefixes
(system instructions, tool schemas) and bills them at 0.02× the
standard input rate on cache hits.

```
CostPerReq   = (InputTokens × (1 − CacheHitRate) / 1M) × InputPrice
             + (InputTokens × CacheHitRate / 1M) × InputPrice × 0.02
             + (OutputTokens / 1M) × OutputPrice

MonthlyCost  = CostPerReq × RequestsPerDay × 30
```

| Variable          | Meaning                                                       |
| ----------------- | ------------------------------------------------------------- |
| `V4 Flash`        | $0.14 / $0.28 — general chat, RAG, code completion            |
| `V4 Pro`          | $0.435 / $0.87 — multi-step reasoning, complex code           |
| `V4 Pro Promo`    | 75% off V4 Pro (limited-time promotion)                        |
| `DeepSeek R1`     | $0.55 / $2.19 — legacy reasoning model                        |
| `CacheReadMult`   | 0.02 — automatic prefix cache reads cost 2% of input price    |
| `No batch API`    | DeepSeek does not offer a batch pricing tier                   |

DeepSeek is OpenAI-compatible — the API endpoint, request format, and
streaming all match. Migration is a one-line change to the base URL.

## Limitations & When Not To Use

DeepSeek does not offer Batch API (no async discount), so 100% of your
workload pays real-time rates. There's no multimodal tier — vision,
audio, and image generation are not available. The 75% V4 Pro promo
is time-limited and may end without notice. Enterprise contracts with
committed-use discounts are not modeled. If your workload needs
vision, image generation, or sub-second latency for voice agents,
DeepSeek alone is not enough — pair it with OpenAI/Claude for those
specific calls. Always check the latest pricing before committing.

## Worked Example

A RAG app at 2,000 input tokens, 1,000 output tokens, 500 reqs/day on
DeepSeek V4 Flash with 60% cache hit rate:

1. `Input cost` (no cache) = (2,000 / 1M) × $0.14 = **$0.00028/req**
2. `With caching`: uncached 800 × $0.14 + cached 1,200 × $0.14 × 0.02 = **$0.000115/req** input
3. `Output cost` = (1,000 / 1M) × $0.28 = **$0.00028/req**
4. `CostPerReq` = $0.000115 + $0.00028 = **$0.000395/req**
5. `MonthlyCost` = $0.000395 × 500 × 30 = **$5.93/mo**
6. `Same workload on GPT-5 Mini` = $13.13/mo — DeepSeek is **2.2× cheaper**