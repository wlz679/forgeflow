---
engine_ref: 'solopreneur-deepseek-api-cost-calculator'
category_id: 'B'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'LiteLLM — 统一 LLM 定价参考'
    url: 'https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json'
  - name: 'DeepSeek API 定价 — 官方'
    url: 'https://api-docs.deepseek.com/quick_start/pricing/'
  - name: 'DeepSeek 自动缓存公告'
    url: 'https://api-docs.deepseek.com/news/news0802/'
---

## 这个计算器衡量什么

这个计算器核算 DeepSeek 的 API 价格，覆盖 4 个模型——V4 Flash
（$0.14 输入 / $0.28 输出每百万 token）、V4 Pro 及其 75 折促销
（$0.435 / $0.87）、遗留的 R1 推理模型（$0.55 / $2.19）。DeepSeek
的杀手锏是自动前缀缓存——对话中每次重复的前缀都会自动按输入价
0.02×（98 折）计费，零代码改动。用这个计算器建模高吞吐量工作负
载，DeepSeek 的缓存和激进定价比 OpenAI/Claude 便宜 10-100 倍。

## 计算方法

DeepSeek 的 API 沿用 OpenAI 的按 token 计费模型。杀手锏是自动缓
存——服务端自动识别 prompt 中的重复前缀（系统指令、工具 schema），
缓存命中按标准输入价格的 0.02× 计费。

```
单次请求成本 = (输入 token × (1 − 缓存命中率) / 1M) × 输入费率
            + (输入 token × 缓存命中率 / 1M) × 输入费率 × 0.02
            + (输出 token / 1M) × 输出费率

月成本      = 单次请求成本 × 每日请求数 × 30
```

| 变量          | 含义                                                |
| ------------- | --------------------------------------------------- |
| `V4 Flash`    | $0.14 / $0.28——通用聊天、RAG、代码补全              |
| `V4 Pro`      | $0.435 / $0.87——多步推理、复杂代码                  |
| `V4 Pro 促销` | V4 Pro 75 折（限时促销）                             |
| `DeepSeek R1` | $0.55 / $2.19——遗留推理模型                         |
| `缓存读取倍数`| 0.02——自动前缀缓存读取按输入价的 2% 计费            |
| `无 Batch API`| DeepSeek 不提供批量定价层级                          |

DeepSeek 兼容 OpenAI 协议——API endpoint、请求格式、流式响应全部
对齐。迁移只需改一行 base URL。

## 局限性 / 何时不适用

DeepSeek 不提供 Batch API（无异步折扣），100% 工作负载按实时费率
计费。没有多模态层——视觉、音频、图片生成一律不支持。V4 Pro 75 折
是限时促销，可能随时结束。企业合约的承诺用量折扣不在建模范围内。
如果你的工作负载需要视觉、图片生成、或语音 agent 的亚秒级延迟，
单靠 DeepSeek 不够——把那部分调用搭配 OpenAI/Claude 处理。承诺使
用前务必核对最新定价。

## 案例走读

一个 RAG 应用，每次请求 2,000 输入 token + 1,000 输出 token，每天
500 次，使用 DeepSeek V4 Flash，缓存命中率 60%：

1. `输入成本`（无缓存）= (2,000 / 1M) × $0.14 = **$0.00028/次**
2. `启用缓存`：未缓存 800 × $0.14 + 命中 1,200 × $0.14 × 0.02 = **$0.000115/次**输入
3. `输出成本` = (1,000 / 1M) × $0.28 = **$0.00028/次**
4. `单次请求成本` = $0.000115 + $0.00028 = **$0.000395/次**
5. `月成本` = $0.000395 × 500 × 30 = **$5.93/月**
6. `同负载用 GPT-5 Mini` = $13.13/月——DeepSeek **便宜 2.2 倍**