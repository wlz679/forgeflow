---
slug: 'solopreneur-openai-token-calculator-zh'
engine_ref: 'solopreneur-openai-token-calculator'
category_id: 'B'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'LiteLLM — 统一 LLM 定价参考'
    url: 'https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json'
  - name: 'OpenAI API 定价 — 官方'
    url: 'https://openai.com/api/pricing/'
  - name: 'OpenAI Prompt Caching 文档'
    url: 'https://platform.openai.com/docs/guides/prompt-caching'
---

## 这个计算器衡量什么

这个计算器横向对比 14 个 OpenAI 模型的每 token API 成本——GPT-5.5、
GPT-5.2、GPT-5、GPT-5 Mini、GPT-5 Nano、GPT-4.1 全家（4.1、4.1 Mini、
4.1 Nano）、o-series（o3、o4 Mini）以及 GPT-4o / GPT-4 Turbo / GPT-3.5
Turbo 等遗留模型。它基于你的输入/输出 token 数和请求量预测每日、每
月、每年的开销，并给出省钱的杠杆：批量定价（5 折）、Prompt Caching
（缓存命中输入 5 折）、模型分层。适用于上线前做预算评估，或给生产
环境的烧钱 App 做成本归因。

## 计算方法

OpenAI 对输入 token 和输出 token 分别计价，按每百万 token 计费。每
个模型都有自己的一对费率——输出通常比输入贵 4-10 倍，因为生成比读
取贵。

```
单次请求成本 = (输入 token / 1,000,000) × 输入费率
            + (输出 token / 1,000,000) × 输出费率

月成本     = 单次请求成本 × 每日请求数 × 30
```

| 变量             | 含义                                                |
| ---------------- | --------------------------------------------------- |
| `输入 token`     | 每次请求的 prompt token                            |
| `输出 token`     | 每次请求生成的 completion token                     |
| `输入费率`       | 美元 / 每百万输入 token（实时或批量）              |
| `输出费率`       | 美元 / 每百万输出 token（实时或批量）              |
| `缓存命中率`     | 从 OpenAI prompt cache 命中的输入 token 占比（5 折）|
| `定价模式`       | `realtime`（同步）或 `batch`（异步，5 折）          |
| `o-series 隐藏推理`| o3/o4 Mini 的隐藏思维链按输出费率计费（约 4 倍可见 token）|

Prompt Caching 把缓存命中的输入 token 砍掉一半费用，但只缓存超过
1024 token 的前缀。o-series 的推理 token 按输出费率计费——500 个可
见输出 token 可能产生约 2000 个计费输出 token。

## 局限性 / 何时不适用

本计算器基于 **OpenAI 公开 API 的按 token 计费**。它不建模：ChatGPT
订阅（Plus/Team/Enterprise）、Azure OpenAI 附加费、自定义企业合约、
图片生成（DALL-E 按张计费——见 AI Image Cost Calculator）、微调训练
成本（见 AI Training Cost Estimator）。OpenAI 每季度调价一次——为多
月项目锁定模型前请重新评估。区域差价（欧盟数据驻留、主权云）也不
在覆盖范围内。

## 案例走读

一个客服聊天机器人，每次请求 1,000 输入 token + 500 输出 token，每
天 100 次，使用 GPT-5：

1. `输入成本` = (1,000 / 1,000,000) × $1.25 = **$0.00125/次**
2. `输出成本` = (500 / 1,000,000) × $10.00 = **$0.005/次**
3. `单次请求成本` = $0.00125 + $0.005 = **$0.0063/次**
4. `月成本` = $0.0063 × 100 × 30 = **$18.75/月**（$225/年）
5. `批量定价` 减半至 **$9.38/月**（异步，5 折）
6. `切换到 GPT-5 Mini`（$0.25 输入 / $2.00 输出）成本降至 **$3.75/月**——常规查询便宜 5 倍