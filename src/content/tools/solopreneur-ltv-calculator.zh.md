---
engine_ref: 'solopreneur-ltv-calculator'
category_id: 'C'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'SaaS Capital — LTV / Churn Benchmarks'
    url: 'https://www.saas-capital.com/blog/lTV'
  - name: 'OpenView SaaS Benchmarks 2026 — NRR / LTV'
    url: 'https://openviewpartners.com/blog/saas-benchmarks/'
  - name: 'ICONIQ Growth Benchmarks — LTV:CAC'
    url: 'https://www.iconiqcapital.com/growth/benchmarks'
---

## 这个计算器衡量什么

客户终身价值（LTV）是单个客户在与你共处的整个关系里产生的总毛利。它是「单位经济比率」的分母，决定了你的 SaaS 是生意还是慈善：LTV:CAC。3:1 LTV:CAC 是业界长期共识的基准 —— 低于 3:1 说明获客花费相对客户价值过高；高于 5:1 说明你在增长上投入不足。把本计算器和 **CAC 计算器** 配合使用即可算出比率。

## 计算方法

LTV 闭式公式（恒定流失假设）：

```
平均生命周期 = 1 ÷ 月流失率（流失 ≈ 0 时封顶 120 个月）
毛利        = 月收入 × （毛利率 ÷ 100）
LTV         = 毛利 × 平均生命周期
LTV:CAC     = LTV ÷ 获客成本
```

| 变量        | 含义                                          |
| ----------- | --------------------------------------------- |
| `月收入`    | ARPU —— 每用户每月平均收入                    |
| `毛利率`    | 扣除 COGS、支持、支付处理后的收入百分比       |
| `月流失`    | 每月流失的客户百分比（logo churn）            |
| `CAC`       | 获客成本（销售 + 市场费用 ÷ 新增）            |

5 档流失率情景条（1%、2%、3%、5%、8%）展示微小的流失下降如何复利 —— 月流失从 5% 砍到 3% 几乎让 LTV 翻倍，因为生命周期 = 1÷流失是倒数函数。

## 局限性 / 何时不适用

LTV 假设 **流失恒定** —— 现实中几乎不会发生。实际上，流失在前 90 天较高（onboarding 失败），稳定后再下降，到第 12 个月时小幅回升（年度续约）。对 < 6 个月 cohort 数据的早期初创，LTV 估计误差棒很大。该公式还假设每客户收入不变 —— 但健康 SaaS 的扩展收入（upsell、座位增长）通常每年涨 10-30%。要做更精准的建模，用计费系统里的 **cohort 留存曲线**。**3:1 LTV:CAC** 基准适用于毛利率 > 70% 的 SaaS；服务型业务毛利率 30-50%，门槛降到 2:1。

## 案例走读

假设一个 B2B SaaS：ARPU $50/月、毛利率 80%、月流失 3%、CAC $150。

1. **平均生命周期** = 1 ÷ 3% = **33.3 个月**
2. **月毛利** = $50 × 80% = **$40**
3. **LTV** = $40 × 33.3 = **$1,333**
4. **LTV:CAC** = $1,333 ÷ $150 = **8.9:1** —— 顶级
5. **回收期** = $150 ÷ $40 = **3.75 个月** —— 远低于 12 个月目标

如果流失降到 2%（更好的 onboarding）：生命周期 = 50 个月，LTV = $2,000，LTV:CAC = 13.3:1。计算器在 **What-If** 段揭示：因倒数关系，流失降低几乎总是比获客优化更有杠杆。