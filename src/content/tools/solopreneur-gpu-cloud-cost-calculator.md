---
slug: 'solopreneur-gpu-cloud-cost-calculator'
engine_ref: 'solopreneur-gpu-cloud-cost-calculator'
category_id: 'B'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'LiteLLM — GPU Cloud Pricing Reference'
    url: 'https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json'
  - name: 'RunPod GPU Pricing'
    url: 'https://www.runpod.io/gpu-instance/pricing'
  - name: 'Vast.ai Marketplace'
    url: 'https://vast.ai/pricing'
---

## What This Calculator Measures

This calculator compares GPU rental costs across 6 cloud providers
(RunPod, Vast.ai, Lambda Labs, AWS, GCP, Azure) for 6 GPU types (H200,
H100, A100, L40S, RTX 4090, A6000). It models three pricing tiers per
provider — spot/preemptible (40-60% off, interruptible), on-demand
(full price, no commitment), and reserved 1-year (15-30% off, capacity
guaranteed). Add storage ($0.10/GB/month SSD) and egress ($0.08/GB)
to get a complete monthly bill.

## How It Works (Methodology)

GPU compute is the dominant cost: `hours/day × GPU count × hourly rate
× 30 days/month`. Storage is a flat per-GB-month charge. Egress is
estimated at 50 GB/month for typical training-data downloads.

```
DailyGpuHours    = HoursPerDay × GpuCount
EffectiveRate    = BaseRate × TierMultiplier
MonthlyGpuCost   = DailyGpuHours × EffectiveRate × 30
StorageMonthly   = StorageGB × $0.10
EgressMonthly    = 50 × $0.08 (estimated)
TotalMonthly     = MonthlyGpuCost + StorageMonthly + EgressMonthly
```

| Provider     | H100/hr | A100/hr | L40S/hr | Spot Discount | Reserved Discount |
| ------------ | ------- | ------- | ------- | ------------- | ----------------- |
| RunPod       | $1.99   | $0.79   | $0.69   | 40% off       | 15% off           |
| Vast.ai      | $1.69   | $0.69   | $0.59   | 50% off       | 20% off           |
| Lambda Labs  | $2.49   | $1.10   | $0.80   | 30% off       | 10% off           |
| AWS          | $4.00   | $3.50   | $1.20   | 60% off       | 30% off           |
| GCP          | $4.20   | $2.80   | $1.00   | 55% off       | 25% off           |
| Azure        | $3.80   | $3.00   | $1.10   | 50% off       | 20% off           |

Vast.ai is consistently cheapest (P2P marketplace); RunPod is the best
balance of cost and reliability; Lambda Labs is best for professional
training; AWS/GCP/Azure are 3-5× more expensive but offer enterprise
SLAs.

## Limitations & When Not To Use

Pricing reflects **public on-demand rates** and published spot/reserved
discounts. Enterprise contracts (AWS EDP, GCP CUDs) can unlock 30-60%
additional discounts not modeled here. Spot instances can be preempted
with 30 seconds notice — production serving workloads need on-demand
or reserved. Region-specific pricing varies — EU, APAC, and US
sovereign clouds often charge 10-30% premiums. Data egress is
estimated at a flat 50 GB; real workloads with multi-terabyte
downloads can blow past this. Always verify with the provider's live
pricing page before committing.

## Worked Example

A training rig running 4× A100 GPUs, 24 hours/day, on Lambda Labs
reserved 1-year tier, with 500 GB SSD storage:

1. `Daily GPU hours` = 4 × 24 = **96 GPU-hrs/day**
2. `Effective rate` = $1.10 × 0.90 (Lambda 10% reserved discount) = **$0.99/hr**
3. `Monthly GPU cost` = 96 × $0.99 × 30 = **$2,851.20/mo**
4. `Storage` = 500 × $0.10 = **$50/mo**
5. `Egress` = 50 × $0.08 = **$4/mo**
6. `Total monthly` = $2,851.20 + $50 + $4 = **$2,905.20/mo** — equivalent to owning ~$120K of A100 hardware amortized over 3 years