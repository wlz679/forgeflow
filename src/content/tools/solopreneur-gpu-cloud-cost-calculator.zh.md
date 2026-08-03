---
engine_ref: 'solopreneur-gpu-cloud-cost-calculator'
category_id: 'B'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'LiteLLM — GPU 云定价参考'
    url: 'https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json'
  - name: 'RunPod GPU 定价'
    url: 'https://www.runpod.io/gpu-instance/pricing'
  - name: 'Vast.ai 市场'
    url: 'https://vast.ai/pricing'
---

## 这个计算器衡量什么

这个计算器对比 6 家云厂商的 GPU 租赁成本（RunPod、Vast.ai、Lambda
Labs、AWS、GCP、Azure）和 6 种 GPU（H200、H100、A100、L40S、RTX
4090、A6000）。它建模每个供应商的三档定价——spot/preemptible
（4-6 折，可中断）、on-demand（无折扣、无承诺）、reserved 1 年
（7.5-8.5 折，保证容量）。加上存储（$0.10/GB/月 SSD）和 egress
（$0.08/GB），得到完整月度账单。

## 计算方法

GPU 算力是大头：`小时/天 × GPU 数 × 小时费率 × 30 天/月`。存储按
每 GB/月固定计费。Egress 估算为典型训练数据下载每月 50 GB。

```
每日 GPU 小时 = 小时/天 × GPU 数
有效费率    = 基础费率 × 档位乘数
月度 GPU 费  = 每日 GPU 小时 × 有效费率 × 30
存储月费    = 存储 GB × $0.10
Egress 月费 = 50 × $0.08（估算）
月度总成本  = GPU 费 + 存储费 + Egress 费
```

| 供应商     | H100/小时 | A100/小时 | L40S/小时 | Spot 折扣 | 预留折扣 |
| ---------- | --------- | --------- | --------- | --------- | -------- |
| RunPod     | $1.99     | $0.79     | $0.69     | 6 折      | 8.5 折   |
| Vast.ai    | $1.69     | $0.69     | $0.59     | 5 折      | 8 折     |
| Lambda Labs| $2.49     | $1.10     | $0.80     | 7 折      | 9 折     |
| AWS        | $4.00     | $3.50     | $1.20     | 4 折      | 7 折     |
| GCP        | $4.20     | $2.80     | $1.00     | 4.5 折    | 7.5 折   |
| Azure      | $3.80     | $3.00     | $1.10     | 5 折      | 8 折     |

Vast.ai 通常最便宜（P2P 市场）；RunPod 是性价比最佳平衡；Lambda
Labs 最适合专业训练；AWS/GCP/Azure 贵 3-5 倍，但提供企业级 SLA。

## 局限性 / 何时不适用

定价基于 **公开 on-demand 费率**和公布的 spot/reserved 折扣。企业
合约（AWS EDP、GCP CUDs）可拿到额外 30-60% 折扣，本计算器未建模。
Spot 实例可能 30 秒通知就被抢占——生产在线推理必须用 on-demand 或
reserved。区域定价各异——欧盟、亚太、美国主权云通常加价 10-30%。
Egress 按 50 GB 平摊估算，多 TB 下载的真实工作负载可能远超此值。
承诺使用前请核对供应商实时定价页面。

## 案例走读

一个训练用机器，4× A100 GPU，24 小时/天，使用 Lambda Labs 1 年预
留档，500 GB SSD 存储：

1. `每日 GPU 小时` = 4 × 24 = **96 GPU 小时/天**
2. `有效费率` = $1.10 × 0.90（Lambda 9 折预留）= **$0.99/小时**
3. `月度 GPU 费` = 96 × $0.99 × 30 = **$2,851.20/月**
4. `存储` = 500 × $0.10 = **$50/月**
5. `Egress` = 50 × $0.08 = **$4/月**
6. `月度总成本` = $2,851.20 + $50 + $4 = **$2,905.20/月**——相当于 3 年摊销下自购 ~$120K A100 硬件