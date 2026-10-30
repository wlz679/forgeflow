---
engine_ref: 'solopreneur-gpu-cloud-cost-calculator'
category_id: 'B'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-10-30'
sources:
  - name: 'LiteLLM — GPU 云定价参考'
    url: 'https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json'
  - name: 'RunPod GPU 定价'
    url: 'https://www.runpod.io/gpu-instance/pricing'
  - name: 'Vast.ai 市场'
    url: 'https://vast.ai/pricing'
---

## 这个计算器衡量什么

这个计算器对比 {{liveGpuProviderCount}} 家云厂商的 GPU 租赁成本（{{liveGpuProviderList}}）和
{{liveGpuTypeCount}} 种 GPU（{{liveGpuTypeList}}）。它建模每个供应商的三档定价——spot/preemptible
（低 {{liveGpuOffSpot}}%，可中断）、on-demand（无折扣、无承诺）、reserved 1 年
（低 {{liveGpuOffReserved}}%，保证容量）。加上存储（$0.10/GB/月 SSD）和 egress
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

| 供应商 | H100/小时 | A100/小时 | L40S/小时 | Spot 折扣 | 预留折扣 |
| ------ | --------- | --------- | --------- | --------- | -------- |
| {{liveGpuProviderName:runpod}} | {{liveGpuRate:runpod|H100}} | {{liveGpuRate:runpod|A100}} | {{liveGpuRate:runpod|L40S}} | 低 {{liveGpuOffSpot:runpod}}% | 低 {{liveGpuOffReserved:runpod}}% |
| {{liveGpuProviderName:vastai}} | {{liveGpuRate:vastai|H100}} | {{liveGpuRate:vastai|A100}} | {{liveGpuRate:vastai|L40S}} | 低 {{liveGpuOffSpot:vastai}}% | 低 {{liveGpuOffReserved:vastai}}% |
| {{liveGpuProviderName:lambdalabs}} | {{liveGpuRate:lambdalabs|H100}} | {{liveGpuRate:lambdalabs|A100}} | {{liveGpuRate:lambdalabs|L40S}} | 低 {{liveGpuOffSpot:lambdalabs}}% | 低 {{liveGpuOffReserved:lambdalabs}}% |
| {{liveGpuProviderName:aws}} | {{liveGpuRate:aws|H100}} | {{liveGpuRate:aws|A100}} | {{liveGpuRate:aws|L40S}} | 低 {{liveGpuOffSpot:aws}}% | 低 {{liveGpuOffReserved:aws}}% |
| {{liveGpuProviderName:gcp}} | {{liveGpuRate:gcp|H100}} | {{liveGpuRate:gcp|A100}} | {{liveGpuRate:gcp|L40S}} | 低 {{liveGpuOffSpot:gcp}}% | 低 {{liveGpuOffReserved:gcp}}% |
| {{liveGpuProviderName:azure}} | {{liveGpuRate:azure|H100}} | {{liveGpuRate:azure|A100}} | {{liveGpuRate:azure|L40S}} | 低 {{liveGpuOffSpot:azure}}% | 低 {{liveGpuOffReserved:azure}}% |

Vast.ai 通常最便宜（P2P 市场）；RunPod 是性价比最佳平衡；Lambda
Labs 最适合专业训练；超大规模云更贵 —— H100 80GB 上最便宜的跟踪供应商
按需价只有最贵的 {{liveGpuShare:min|H100|on|max|H100|on}} —— 但它们提供企业级 SLA。

## 局限性 / 何时不适用

定价基于 **公开 on-demand 费率**和公布的 spot/reserved 折扣。企业
合约（AWS EDP、GCP CUDs）可拿到比上述区间更大的额外折扣，本计算器
未建模。Spot 实例可能 30 秒通知就被抢占——生产在线推理必须用
on-demand 或 reserved。区域定价各异——欧盟、亚太、美国主权云通常
加价。Egress 按 50 GB 平摊估算，多 TB 下载的真实工作负载可能远超
此值。承诺使用前请核对供应商实时定价页面。

## 案例走读

一个训练用机器，4× A100 GPU，24 小时/天，使用 Lambda Labs 1 年预
留档，500 GB SSD 存储：

1. `每日 GPU 小时` = 4 × 24 = **96 GPU 小时/天**
2. `有效费率` = {{liveGpuRate:lambdalabs|A100}} 按需，预留 1 年档低 {{liveGpuOffReserved:lambdalabs}}% = **{{liveGpuReserved:lambdalabs|A100}}/小时**
3. `月度 GPU 费` = 96 × {{liveGpuReserved:lambdalabs|A100}} × 30 = **{{liveGpuMonthly:lambdalabs|A100|reserved|4|24}}/月**
4. `存储` = 500 GB × $0.10/GB = **$50/月**
5. `Egress` = 50 GB × $0.08/GB = **$4/月**
6. `月度总成本` = {{liveGpuMonthly:lambdalabs|A100|reserved|4|24}} + $50 + $4 = **$2,905.20/月**——相当于 3 年摊销下自购 ~$120K A100 硬件
