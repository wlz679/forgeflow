---
engine_ref: 'solopreneur-arr-multiple-valuation-calculator'
category_id: 'C'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'ICONIQ Growth Benchmarks — SaaS Valuation Multiples'
    url: 'https://www.iconiqcapital.com/growth/benchmarks'
  - name: 'Bessemer Venture Partners — SaaS Multiples Atlas'
    url: 'https://www.bvp.com/atlas/saas-multiples'
  - name: 'Meritech Capital — SaaS Valuation Metrics'
    url: 'https://www.meritechcapital.com/blog/saas-metrics'
---

## 这个计算器衡量什么

ARR 倍数（估值 ÷ ARR）是 SaaS 公司估值最常用的指标。一家估值 $1,500 万、ARR $100 万的初创公司是 15× 倍数 —— 处在典型「Fast growth」（50-100% 同比增长）档位。本计算器基于启发式公式和对标分层基准（Slow / Medium / Fast / Hyper 增长档），判断你的实际倍数在给定增长率 + 利润率下是否 **合理**。融资后用它来验证条款，退出前用它来设定谈判锚点。

## 计算方法

预期倍数启发式：

```
预期倍数 = 5x（成熟 SaaS 地板）
         + 增长率 ÷ 10（每 10% 增长加 ~1x）
         + 利润率 ÷ 5（每 5% 利润加 ~1x）

实际倍数   = 估值 ÷ ARR

倍数健康度：
  实际/预期 在 [0.7, 1.3] → 🟢 合理
  在 [0.4, 1.6]            → 🟡 偏离市场
  区间外                   → 🟠 异常
```

| 增长档位     | 倍数区间   |
| ------------ | ---------- |
| Slow（< 20%）| 3-8x       |
| Medium（20-50%）| 8-15x |
| Fast（50-100%）| 15-25x |
| Hyper（> 100%）| 25-40x  |

前瞻估值投影未来 12 个月的 ARR × 前瞻倍数（下一轮 10x、激进目标 20x）。

## 局限性 / 何时不适用

ARR 倍数 **不是非 SaaS 业务** 的合适指标 —— 服务、marketplace、硬件公司用不同倍数（通常 1-3x 收入或 SDE 估值）。本计算器在前瞻投影中假设 **恒定增长**；实际增长从 Series A 的 100%+ 通常衰减到 Series C 的 30-50%。预期倍数启发式是简化 —— 真实倍数取决于净金额留存（NDR > 120% 可拿 2-4x 溢价）、毛利率画像、市场规模、竞争壁垒，本计算器都不建模。对 ARR < $100 万（微型 SaaS），买家通常按年利润 2-4 倍（SDE）付，不是 ARR 倍数 —— 到 Acquire.com / MicroAcquire 看小交易的实际成交数据。

## 案例走读

假设一个 SaaS：$100 万 ARR、按 $1,500 万估值融资、50% 同比增长、0% 利润率。

1. **实际倍数** = $1,500 万 ÷ $100 万 = **15.0x**
2. **预期倍数** = 5 + 50÷10 + 0÷5 = **10.0x**（Fast growth 档，15-25x 区间）
3. **健康度** = 实际/预期 = 1.5 → 🟡 溢价（高于市场 30-60%）
4. **档位** = Fast growth（50-100%），**15-25x** 区间
5. **前瞻 12 个月**：ARR $100 万 × 1.5 = $150 万 → 按 10x = **$1,500 万（无溢价）** → 按 20x = **$3,000 万（2× 溢价）**

What-If 场景：如果增长翻倍到 100%，预期倍数 = 15.0x → 你的 $1,500 万变成 **公允价值**。如果利润率提升 20pp，预期 = 14.0x → 仍在溢价区间。要锁定 10× 倍数（更保守的融资），所需估值 = **$1,000 万**。要 20× 卖出（激进目标），所需估值 = **$2,000 万**。5 ARR 级别对比显示：$500 万 ARR 按 $1,500 万估值 = 3×（困境），而 $50 万 ARR 按 $1,500 万 = 30×（不合理）—— 两端信号都说明 $1,500 万这个数字随规模化不可持续。