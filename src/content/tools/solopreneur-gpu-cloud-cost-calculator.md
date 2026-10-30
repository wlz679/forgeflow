---
slug: 'solopreneur-gpu-cloud-cost-calculator'
engine_ref: 'solopreneur-gpu-cloud-cost-calculator'
category_id: 'B'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-10-30'
sources:
  - name: 'LiteLLM — GPU Cloud Pricing Reference'
    url: 'https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json'
  - name: 'RunPod GPU Pricing'
    url: 'https://www.runpod.io/gpu-instance/pricing'
  - name: 'Vast.ai Marketplace'
    url: 'https://vast.ai/pricing'
---

## What This Calculator Measures

This calculator compares GPU rental costs across {{liveGpuProviderCount}} cloud providers
({{liveGpuProviderList}}) for {{liveGpuTypeCount}} GPU types ({{liveGpuTypeList}}). It models three pricing tiers per
provider — spot/preemptible ({{liveGpuOffSpot}}% off, interruptible), on-demand
(full price, no commitment), and reserved 1-year ({{liveGpuOffReserved}}% off, capacity
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

| Provider | H100/hr | A100/hr | L40S/hr | Spot Discount | Reserved Discount |
| -------- | ------- | ------- | ------- | ------------- | ----------------- |
| {{liveGpuProviderName:runpod}} | {{liveGpuRate:runpod|H100}} | {{liveGpuRate:runpod|A100}} | {{liveGpuRate:runpod|L40S}} | {{liveGpuOffSpot:runpod}}% off | {{liveGpuOffReserved:runpod}}% off |
| {{liveGpuProviderName:vastai}} | {{liveGpuRate:vastai|H100}} | {{liveGpuRate:vastai|A100}} | {{liveGpuRate:vastai|L40S}} | {{liveGpuOffSpot:vastai}}% off | {{liveGpuOffReserved:vastai}}% off |
| {{liveGpuProviderName:lambdalabs}} | {{liveGpuRate:lambdalabs|H100}} | {{liveGpuRate:lambdalabs|A100}} | {{liveGpuRate:lambdalabs|L40S}} | {{liveGpuOffSpot:lambdalabs}}% off | {{liveGpuOffReserved:lambdalabs}}% off |
| {{liveGpuProviderName:aws}} | {{liveGpuRate:aws|H100}} | {{liveGpuRate:aws|A100}} | {{liveGpuRate:aws|L40S}} | {{liveGpuOffSpot:aws}}% off | {{liveGpuOffReserved:aws}}% off |
| {{liveGpuProviderName:gcp}} | {{liveGpuRate:gcp|H100}} | {{liveGpuRate:gcp|A100}} | {{liveGpuRate:gcp|L40S}} | {{liveGpuOffSpot:gcp}}% off | {{liveGpuOffReserved:gcp}}% off |
| {{liveGpuProviderName:azure}} | {{liveGpuRate:azure|H100}} | {{liveGpuRate:azure|A100}} | {{liveGpuRate:azure|L40S}} | {{liveGpuOffSpot:azure}}% off | {{liveGpuOffReserved:azure}}% off |

Vast.ai is consistently cheapest (P2P marketplace); RunPod is the best
balance of cost and reliability; Lambda Labs is best for professional
training; the hyperscalers are dearer — on an H100 80GB the cheapest
tracked provider prices at {{liveGpuShare:min|H100|on|max|H100|on}} of the
most expensive one’s on-demand rate — but they offer enterprise SLAs.

## Limitations & When Not To Use

Pricing reflects **public on-demand rates** and published spot/reserved
discounts. Enterprise contracts (AWS EDP, GCP CUDs) can unlock additional
discounts beyond those bands — not modeled here. Spot instances can be
preempted with 30 seconds notice — production serving workloads need
on-demand or reserved. Region-specific pricing varies — EU, APAC, and US
sovereign clouds often charge a premium. Data egress is estimated at a
flat 50 GB; real workloads with multi-terabyte downloads can blow past
this. Always verify with the provider’s live pricing page before committing.

## Worked Example

A training rig running 4× A100 GPUs, 24 hours/day, on Lambda Labs
reserved 1-year tier, with 500 GB SSD storage:

1. `Daily GPU hours` = 4 × 24 = **96 GPU-hrs/day**
2. `Effective rate` = {{liveGpuRate:lambdalabs|A100}} on-demand, {{liveGpuOffReserved:lambdalabs}}% off on the reserved 1-year tier = **{{liveGpuReserved:lambdalabs|A100}}/hr**
3. `Monthly GPU cost` = 96 × {{liveGpuReserved:lambdalabs|A100}} × 30 = **{{liveGpuMonthly:lambdalabs|A100|reserved|4|24}}/mo**
4. `Storage` = 500 GB × $0.10/GB = **$50/mo**
5. `Egress` = 50 GB × $0.08/GB = **$4/mo**
6. `Total monthly` = {{liveGpuMonthly:lambdalabs|A100|reserved|4|24}} + $50 + $4 = **$2,905.20/mo** — equivalent to owning ~$120K of A100 hardware amortized over 3 years
