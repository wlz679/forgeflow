---
engine_ref: 'solopreneur-ai-api-cost-comparison'
category_id: 'B'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'LiteLLM — 统一 LLM 定价参考'
    url: 'https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json'
  - name: 'OpenAI API 定价'
    url: 'https://openai.com/api/pricing/'
  - name: 'Anthropic Claude API 定价'
    url: 'https://www.anthropic.com/pricing'
---

## 这个计算器衡量什么

这个计算器按月成本排序 OpenAI、Anthropic、Google、DeepSeek 的 15
个代表性 AI 模型——基于你的输入/输出 token 数和每日请求量。它会
给出全网最便宜的模型、各供应商最便宜的模型、以及最便宜和最贵之
间的价差。可切换实时和批量定价（5 折、异步）。用来为新功能选型，
或给超支 App 做成本归因。

## 计算方法

计算器从 LiteLLM 集中式定价 JSON 拉取每个模型的输入和输出费率
（同一份数据源驱动 LiteLLM、Portkey 等生产 LLM 网关）。每个模型
的成本走标准按 token 公式，可选 batch 模式乘数。

```
单次请求成本 = (输入 token / 1M) × 输入费率 × Batch 倍数
            + (输出 token / 1M) × 输出费率 × Batch 倍数

月成本      = 单次请求成本 × 每日请求数 × 30
Batch 倍数  = 0.5（batch 模式）或 1.0
```

| 供应商    | 最便宜模型      | 输入 $/M | 输出 $/M | 备注            |
| --------- | --------------- | -------- | -------- | --------------- |
| OpenAI    | GPT-5 Nano      | $0.05    | $0.40    | 272K 上下文     |
| Anthropic | Claude Haiku 3  | $0.25    | $1.25    | 200K 上下文     |
| Google    | Gemini 1.5 Flash| $0.075   | $0.30    | 1M 上下文       |
| DeepSeek  | V4 Flash        | $0.14    | $0.28    | 1M 上下文，自动缓存|

最大单一成本驱动是 **把简单查询路由到高端模型**。最便宜和最贵之
间 10 倍价差意味着 80% 生产流量通常可以跑在最便宜档次，质量损失
可忽略。

## 局限性 / 何时不适用

这个计算器比较每个供应商 **精选的 15 个模型**——要看完整目录
（200+ OpenAI 模型、60+ Anthropic、50+ Gemini 变体、10+ DeepSeek 别
名），请用各家供应商专用计算器。它不建模：免费层（Gemini AI
Studio 部分模型每日 1,500 次）、企业合约的承诺用量折扣、本地部署
成本、微调 token 费率（比推理贵 3-5 倍）。模型间的质量差异不建模
——最便宜不一定最适合你的任务。承诺前请在前 3 候选上跑 50 个
prompt 的评估。

## 案例走读

客服工作负载：每次请求 1,000 输入 + 500 输出 token，每天 100 次，
对比 4 个最便宜模型：

1. `Gemini 1.5 Flash` = (1,000 × $0.075 + 500 × $0.30) / 1M × 100 × 30 = **$0.67/月** 🏆
2. `GPT-5 Nano` = (1,000 × $0.05 + 500 × $0.40) / 1M × 100 × 30 = **$0.75/月**
3. `DeepSeek V4 Flash` = (1,000 × $0.14 + 500 × $0.28) / 1M × 100 × 30 = **$0.84/月**
4. `Claude Haiku 3` = (1,000 × $0.25 + 500 × $1.25) / 1M × 100 × 30 = **$2.63/月**
5. `最贵（O1 Pro）` = **$1,350/月**——最便宜的 2,000 倍
6. **路由策略**：90% 简单查询走 Gemini 1.5 Flash + 10% 复杂查询走 GPT-5 Mini ≈ **$1.50/月**——成本/质量最佳平衡