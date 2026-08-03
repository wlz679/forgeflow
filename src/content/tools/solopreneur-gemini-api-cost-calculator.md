---
slug: 'solopreneur-gemini-api-cost-calculator'
engine_ref: 'solopreneur-gemini-api-cost-calculator'
category_id: 'B'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'LiteLLM — Unified LLM Pricing Reference'
    url: 'https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json'
  - name: 'Google Gemini API Pricing — Official'
    url: 'https://ai.google.dev/pricing'
  - name: 'Gemini Context Caching Documentation'
    url: 'https://ai.google.dev/gemini-api/docs/caching'
---

## What This Calculator Measures

This calculator projects API costs for 6 Google Gemini models — Gemini
3.5 Flash ($1.50 / $9.00), Gemini 3.1 Pro ($2.50 / $15.00), Gemini
3 Flash ($0.50 / $3.00), and the legacy Gemini 2.5 Flash / 1.5 Pro /
1.5 Flash. It models Gemini's Context Caching (90% discount on cached
reads of system prompts) and Batch Mode (50% discount, async, 24-hour
turnaround). Compare against OpenAI, Anthropic, and DeepSeek baselines
to find the cheapest provider for your workload shape.

## How It Works (Methodology)

Gemini charges per million input and output tokens. With Context
Caching enabled, the cached portion of the input is billed at 0.1×
the standard input price. Batch Mode halves all token rates for async
jobs delivered within 24 hours.

```
CostPerReq    = (InputTokens × (1 − CacheHitRate) / 1M) × InputPrice
              + (InputTokens × CacheHitRate / 1M) × InputPrice × 0.1
              + (OutputTokens / 1M) × OutputPrice

MonthlyCost   = CostPerReq × RequestsPerDay × 30
```

| Variable          | Meaning                                                       |
| ----------------- | ------------------------------------------------------------- |
| `Gemini 3.5 Flash`| $1.50 / $9.00 — frontier multimodal, 1M context                |
| `Gemini 3.1 Pro`  | $2.50 / $15.00 — strongest reasoning, 1M context               |
| `Gemini 3 Flash`  | $0.50 / $3.00 — budget frontier-quality, 1M context            |
| `CACHE_READ_MULT` | 0.1 — cached reads cost 10% of standard input                  |
| `Batch discount`  | 50% off all rates (realtime → batch); 24-hour SLA              |
| `Cache support`   | 3.5 Flash / 3.1 Pro / 3 Flash only — legacy 1.5/2.5 do not     |

Context Caching and Batch are mutually exclusive — pick one. Batch
gives a flat 50% off everything; caching is variable depending on
your hit rate (often >60%).

## Limitations & When Not To Use

Context Caching and Batch Mode are mutually exclusive — this calculator
applies them sequentially, so combining them in production requires
double-checking the model's actual rate sheet. Legacy models (1.5 Pro,
1.5 Flash, 2.5 Flash) do not support caching or batch — they're
priced at standard rates only. Region-specific surcharges (EU sovereign
clouds, on-prem via Vertex AI) are not modeled. Gemini's free tier
via AI Studio has separate rate limits (1,500 reqs/day on select
models) not captured here. Always re-verify pricing — Google adjusts
rates every few months.

## Worked Example

A long-context RAG app at 5,000 input tokens, 1,000 output tokens,
1,000 reqs/day on Gemini 3 Flash with 80% cache hit rate:

1. `Input cost` (no cache) = (5,000 / 1M) × $0.50 = **$0.0025/req**
2. `With caching`: uncached 1,000 × $0.50 + cached 4,000 × $0.50 × 0.1 = **$0.0007/req** input
3. `Output cost` = (1,000 / 1M) × $3.00 = **$0.003/req**
4. `CostPerReq` = $0.0007 + $0.003 = **$0.0037/req**
5. `MonthlyCost` = $0.0037 × 1,000 × 30 = **$111/mo**
6. `Batch mode` (no cache) = $0.00125 + $0.0015 = $0.00275/req = **$82.50/mo** — caching wins at high hit rates