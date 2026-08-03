---
slug: 'solopreneur-ai-training-cost-estimator-zh'
engine_ref: 'solopreneur-ai-training-cost-estimator'
category_id: 'B'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'LiteLLM — 训练算力定价'
    url: 'https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json'
  - name: 'RunPod GPU 定价'
    url: 'https://www.runpod.io/gpu-instance/pricing'
  - name: 'HuggingFace PEFT/LoRA 文档'
    url: 'https://huggingface.co/docs/peft'
---

## 这个计算器衡量什么

这个计算器估算端到端的 AI 模型训练成本，覆盖 5 个模型规模（7B、
13B、70B、180B、405B 参数）和 5 种 GPU（H200 141GB $3.50/小时、
H100 80GB $2.50/小时、A100 80GB $1.50/小时、L40S 48GB $0.80/小时、
RTX 6000 Ada $0.50/小时）。加上云存储（$0.10/GB/月）和数据处理成本。
标记为 LoRA 微调的模型（7B、13B）相比全量微调获得 35% epoch 时
间加速，对应典型 LoRA 效率增益。

## 计算方法

总训练成本 = GPU 算力 + 云存储 + 数据处理。GPU 算力是绝对大头——
短跑任务通常占总账单的 95%+。LoRA 只更新适配器权重，每个 epoch
的 GPU 小时数比全量微调少约 65%。

```
每 epoch 有效小时 = 每 epoch 小时 × (LoRA? 0.35 : 1.0)
总 GPU 小时      = 每 epoch 有效小时 × epoch 数
GPU 成本         = 总 GPU 小时 × GPU 数 × 小时费率
训练月数         = (总 GPU 小时 / 24) / 30
存储成本         = 云存储 GB × 0.10 × 训练月数
总成本           = GPU 成本 + 存储成本 + 数据处理成本
```

| 模型规模 | 类型     | GPU 小时（24h × 3 epoch，8× A100） | 约成本 |
| -------- | -------- | ---------------------------------- | ------ |
| 7B       | LoRA     | 25.2                               | ~$300  |
| 13B      | LoRA     | 50.4                               | ~$600  |
| 70B      | 全量微调 | 1,152                              | ~$17K  |
| 180B     | 全量微调 | 4,608                              | ~$69K  |
| 405B     | 全量微调 | 92,160（128× H200，720 小时）     | ~$322K |

Spot/预留实例可砍 GPU 成本 40-60%。悲观区间假设 50% 开销；乐观区间
假设完全优化（gradient checkpointing、混合精度、FlashAttention）。

## 局限性 / 何时不适用

本计算器基于 **公有云 GPU 租赁费率**，不建模：硬件摊销（自购
H100 用 18 个月以上）、自托管的电费与散热开销、专属集群合约
（Lambda SkyPilot、AWS Capacity Blocks）、数据标注人力成本。从零开
始预训练（而非微调）需要 100 倍算力——本工具假设你从基座模型起步。
训练时长估算假设线性扩展；实际上多卡训练有 5-15% 通信开销。承诺
多周任务前，请先跑 5% 短跑试点做校准。

## 案例走读

用 LoRA 微调 7B 模型：2× H100 GPU，每 epoch 8 小时，共 3 epoch，
50 GB 云存储，$20 数据处理：

1. `每 epoch 有效小时` = 8 × 0.35 = **2.8 小时**（LoRA 加速）
2. `总 GPU 小时` = 2.8 × 3 = **8.4 GPU 小时**
3. `GPU 成本` = 8.4 × 2 × $2.50 = **$42**
4. `训练月数` ≈ (8.4 × 2 / 24) / 30 ≈ 0.023 月
5. `存储成本` = 50 × $0.10 × 0.023 ≈ **$0.12**
6. `总成本` = $42 + $0.12 + $20 = **$62.12**——一次完整的 LoRA 微调不到 $65