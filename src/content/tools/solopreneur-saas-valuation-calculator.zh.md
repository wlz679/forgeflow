---
engine_ref: 'solopreneur-saas-valuation-calculator'
category_id: 'C'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'ICONIQ Growth Benchmarks — SaaS Valuation Multiples'
    url: 'https://www.iconiqcapital.com/growth/benchmarks'
  - name: 'Bessemer Venture Partners — State of the Cloud'
    url: 'https://www.bvp.com/atlas/saas-multiples'
  - name: 'Meritech Capital — SaaS Valuation Metrics'
    url: 'https://www.meritechcapital.com/blog/saas-metrics'
---

## 这个计算器衡量什么

SaaS 估值依据 **年度经常性收入（ARR）**、**增长率**、**利润率** 估算你的订阅业务值多少。输出是一个区间（保守 / 基准 / 乐观收入倍数），锚定公开市场 SaaS 可比公司。在融资前用它来核对 term sheet 的合理性，退出前用它来设定谈判锚点。注意：这是 **收入倍数** 估值 —— 对 ARR < $100 万的 solopreneur SaaS，买家通常按年利润 2-4 倍（SDE）付，不是 ARR 倍数，所以请到 Acquire.com / MicroAcquire 看小交易的真实成交数据。

## 计算方法

分层收入倍数框架：

```
基准倍数 = 5x（成熟 SaaS 地板）
         + 增长贡献 = 增长率 ÷ 10（每 10% 增长加 ~1x）
         + 利润贡献 = 利润率 ÷ 5（若利润率 ≥ 30%）（每 5% 利润加 ~1x）
估值     = ARR × 基准倍数（或低端倍数 / 高端倍数）
```

| 层级  | 增长率   | 基准倍数 | 区间     |
| ----- | -------- | -------- | -------- |
| Slow  | 10-30%   | 5x       | 4-8x     |
| Medium| 30-50%   | 7x       | 5-10x    |
| Fast  | 50-100%  | 8-10x    | 6-12x    |
| Hyper | 100%+    | 10x      | 8-15x    |

盈利性叠加 **+0.5x 到 +1x** 溢价（按 ICONIQ / Bessemer 基准，盈利 SaaS 比不盈利的对等公司多 1-3x）。利润率 < 10% 但有正增长时从基准扣 1-2x。

## 局限性 / 何时不适用

收入倍数估值假设你有 **经常性收入** 可以估值。如果 ARR < $10 万，或你的收入大部分是事务性 / 一次性收费，这个模型会高估 —— 投资者对 sub-$1M ARR 交易用不同的框架（Berkus 法、计分卡、可比交易）。模型也忽略：（1）净金额留存 —— NDR > 120% 可拿 2-4x 溢价；（2）毛利率画像 —— 低于 60% 毛利率会显著压低倍数；（3）市场规模和竞争壁垒 —— 大 TAM 和可防御 IP 支持向上空间；（4）资本密集度 —— 资本密集型业务（基础设施、硬件）倍数更低。对 pre-revenue 创业公司，用计分卡法或风险因素汇总法。

## 案例走读

假设一个 SaaS：$200 万 ARR、60% 同比增长、25% 利润率。

1. **层级** = Fast growth（50-100%）：基准 8x，区间 6-12x
2. **利润加成** = 25% 低于 30% 阈值 → 不加 +0.5x
3. **保守** = $200 万 × 6x = **$1,200 万**
4. **基准** = $200 万 × 8x = **$1,600 万**
5. **乐观** = $200 万 × 12x = **$2,400 万**

如果利润率到 30%：+0.5x → 基准变 8.5x → $1,700 万基准。如果增长加速到 100%：层级跃到 Hyper，基准 10x → $2,000 万基准。计算器 **里程碑** 段投影以当前增长达到 $1,000 万 ARR 需几年：`log(10M / 2M) / log(1.6) = 4.3 年`。配合 **ARR 倍数计算器** 反向看（倍数是增长 + 利润的函数）。