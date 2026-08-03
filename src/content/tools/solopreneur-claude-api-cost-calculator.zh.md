---
engine_ref: 'solopreneur-claude-api-cost-calculator'
category_id: 'B'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'LiteLLM — 统一 LLM 定价参考'
    url: 'https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json'
  - name: 'Anthropic Claude API 定价 — 官方'
    url: 'https://www.anthropic.com/pricing'
  - name: 'Anthropic Prompt Caching 文档'
    url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching'
---

## 这个计算器衡量什么

这个计算器预测 7 个 Anthropic Claude 模型的 API 成本——旗舰 Claude
Fable 5、Claude Opus 4.8（及遗留 4.1）、Claude Sonnet 4.6、Claude
Haiku 4.5，以及遗留的 Haiku 3.5 / Haiku 3。它建模 Anthropic 的
Prompt Caching 经济模型（缓存写入 1.25× / 2×，缓存读取 0.1× 输入
价格）和 Batch 定价（异步模式所有 token 5 折），并与 OpenAI、
DeepSeek、Gemini 做跨厂商对比。

## 计算方法

Anthropic 按模型对输入和输出 token 分别计费。启用 Prompt Caching
后，prompt 被拆分为可缓存前缀（系统指令、长上下文）和变化后缀（用
户查询）。首次写入按 1.25×（5 分钟 TTL）或 2×（1 小时 TTL）标准
输入费率；命中读取按 0.1× 输入费率计费——比标准输入打 9 折。

```
混合输入成本 = 非缓存输入 token × 输入费率
            + 缓存未命中 token × 输入费率 × 写入倍数
            + 缓存命中 token × 输入费率 × 0.1

单次请求成本 = 混合输入成本 + (输出 token / 1M) × 输出费率
月成本      = 单次请求成本 × 每日请求数 × 30
```

| 变量             | 含义                                                |
| ---------------- | --------------------------------------------------- |
| `缓存写入 token` | 可缓存的稳定前缀 token（系统 prompt、few-shot）     |
| `缓存 TTL`       | `5min`（写入 1.25×）或 `1hour`（写入 2×）           |
| `缓存读取命中率` | 复用缓存前缀的请求占比                              |
| `缓存读取倍数`   | 0.1（缓存读取按标准输入的 10% 计费）                |
| `定价模式`       | `realtime` 或 `batch`（所有 token 5 折）            |
| `回本点`         | 5 分钟 TTL 约 2 次缓存读取、1 小时 TTL 约 2 次      |

缓存写入贵，但缓存读取便宜 90%。第二次读取就回本，之后全是净省。

## 局限性 / 何时不适用

本计算器基于 **Anthropic Messages API 定价**。它不建模：Claude.ai
订阅（Pro/Team/Enterprise）、Bedrock/Vertex AI 附加费（通常 5-15%
加价）、企业合约的承诺用量折扣、新的 Claude 视觉 API（图片输入
token 单独计费）。Prompt Caching 在标准层只对 ≥ 1,024 token 的前
缀生效，短 prompt 不会受益。Anthropic 每 6-12 个月发布新层级，价
格普降 10-30%——承诺使用前请重新评估。

## 案例走读

一个 RAG 应用，每次请求 2,000 输入 token + 1,000 输出 token，每天
500 次，使用 Claude Sonnet 4.6，缓存前缀 2,000 token，命中率 60%，
5 分钟 TTL：

1. `输入成本`（无缓存）= (2,000 / 1M) × $3.00 = **$0.006/次**
2. `输出成本` = (1,000 / 1M) × $15.00 = **$0.015/次**
3. `启用缓存`：非缓存 0 token + 未命中 800 × $3 × 1.25 + 命中 1,200 × $3 × 0.1 = **$0.0036/次**
4. `单次请求成本` = $0.0036 + $0.015 = **$0.0186/次**
5. `月成本` = $0.0186 × 500 × 30 = **$279/月**
6. `Batch 定价` 砍到 **$139.50/月**——省下来的钱够买一个 Sonnet 席位