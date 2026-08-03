---
slug: 'solopreneur-gemini-api-cost-calculator-zh'
engine_ref: 'solopreneur-gemini-api-cost-calculator'
category_id: 'B'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'LiteLLM — 统一 LLM 定价参考'
    url: 'https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json'
  - name: 'Google Gemini API 定价 — 官方'
    url: 'https://ai.google.dev/pricing'
  - name: 'Gemini Context Caching 文档'
    url: 'https://ai.google.dev/gemini-api/docs/caching'
---

## 这个计算器衡量什么

这个计算器预测 6 个 Google Gemini 模型的 API 成本——Gemini 3.5 Flash
（$1.50 / $9.00）、Gemini 3.1 Pro（$2.50 / $15.00）、Gemini 3 Flash
（$0.50 / $3.00），以及遗留的 Gemini 2.5 Flash / 1.5 Pro / 1.5
Flash。它建模 Gemini 的 Context Caching（系统 prompt 缓存读取 9
折）和 Batch 模式（异步、24 小时内交付，全 token 5 折）。与
OpenAI、Anthropic、DeepSeek 基线对比，找到工作负载形状下最便宜的
供应商。

## 计算方法

Gemini 按每百万输入和输出 token 计费。启用 Context Caching 后，
输入中被缓存的部分按标准输入价的 0.1× 计费。Batch 模式把异步作业
的所有 token 费率减半，24 小时内交付。

```
单次请求成本 = (输入 token × (1 − 缓存命中率) / 1M) × 输入费率
            + (输入 token × 缓存命中率 / 1M) × 输入费率 × 0.1
            + (输出 token / 1M) × 输出费率

月成本      = 单次请求成本 × 每日请求数 × 30
```

| 变量          | 含义                                                |
| ------------- | --------------------------------------------------- |
| `Gemini 3.5 Flash`| $1.50 / $9.00——前沿多模态，1M 上下文           |
| `Gemini 3.1 Pro`| $2.50 / $15.00——最强推理，1M 上下文              |
| `Gemini 3 Flash`| $0.50 / $3.00——预算级前沿质量，1M 上下文         |
| `缓存读取倍数`| 0.1——缓存读取按标准输入的 10% 计费                 |
| `Batch 折扣`  | 全费率 5 折（实时 → 批量）；24 小时 SLA             |
| `缓存支持`    | 仅 3.5 Flash / 3.1 Pro / 3 Flash——遗留 1.5/2.5 不支持|

Context Caching 和 Batch 互斥——二选一。Batch 全 token 直接 5 折；
缓存命中率可变（通常 >60%）。

## 局限性 / 何时不适用

Context Caching 和 Batch 模式互斥——本计算器按顺序应用它们，在生产
中组合使用需要核对模型的实际费率表。遗留模型（1.5 Pro、1.5 Flash、
2.5 Flash）不支持缓存和批量——只按标准费率计费。区域附加费（欧盟
主权云、通过 Vertex AI 的本地部署）不在建模范围内。Gemini 通过
AI Studio 的免费层有独立的限速（部分模型 1,500 次/天），此处不覆
盖。Google 每隔几个月会调整价格，使用前务必重新核对。

## 案例走读

一个长上下文 RAG 应用，每次请求 5,000 输入 token + 1,000 输出
token，每天 1,000 次，使用 Gemini 3 Flash，缓存命中率 80%：

1. `输入成本`（无缓存）= (5,000 / 1M) × $0.50 = **$0.0025/次**
2. `启用缓存`：未缓存 1,000 × $0.50 + 命中 4,000 × $0.50 × 0.1 = **$0.0007/次**输入
3. `输出成本` = (1,000 / 1M) × $3.00 = **$0.003/次**
4. `单次请求成本` = $0.0007 + $0.003 = **$0.0037/次**
5. `月成本` = $0.0037 × 1,000 × 30 = **$111/月**
6. `Batch 模式`（无缓存）= $0.00125 + $0.0015 = $0.00275/次 = **$82.50/月**——高命中率时缓存胜出