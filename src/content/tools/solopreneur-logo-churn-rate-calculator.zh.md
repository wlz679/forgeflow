---
slug: 'solopreneur-logo-churn-rate-calculator-zh'
engine_ref: 'solopreneur-logo-churn-rate-calculator'
category_id: 'R'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'SaaS Capital — SaaS Retention Metrics'
    url: 'https://www.saas-capital.com/blog-posts/saas-retention-metrics/'
  - name: 'OpenView Partners — Logo Churn vs Revenue Churn'
    url: 'https://openviewpartners.com/blog/the-real-story-behind-net-dollar-retention/'
---

## 这个计算器衡量什么

客户流失率（Logo Churn Rate）是 GRR 的「按客户数」对照版本。它不按
收入加权，而是按客户数量的百分比统计当期流失的客户。两个指标看起来
类似，但衡量的是不同的事：GRR 衡量按美元加权的流失（一个 $500K 的
大客户离开比一个 $50 的小客户离开更重），而 logo churn 对每个客户一
视同仁。两者会在「不同价位客户的流失率不同时」分叉——中端市场
B2B SaaS 里的常见模式是大客户更黏、小客户更易走。Logo churn 也是
最干净的早期预警信号，因为客户数这一统计指标不受计费周期边界效应
影响，而这种边界效应常把收入留存的数字扭曲掉。

## 计算方法

我们使用的 v3 标准公式：

```
留存客户数   = 期初客户数 − 流失客户数
客户流失 (%) = 流失客户数 ÷ 期初客户数 × 100
```

| 变量          | 含义                                          |
| ------------- | --------------------------------------------- |
| `期初客户数`  | 期初所有活跃客户数                            |
| `流失客户数`  | 当期完全取消的客户数                          |

`期初客户数 = 0` 时返回客户流失 = 0（除零保护）。健康带沿用 OpenView /
SaaS Capital 中端市场基准，方向**反向**（越低越好）：🟢 <5%（顶四分位）、
🟡 5–10%（中端市场前 25%）、🟠 10–20%（偏高，需要介入）、🔴 ≥20%
（严重，商业模式风险）。输入截断为非负。

## 局限性 / 何时不适用

Logo churn 在客户基础**大到单个 logo 不会驱动超过 1–2pp** 时最有意义
——通常需要 50+ 客户。早期阶段（少于 30 个 logo）的公司，单一取消
看起来像危机，这个指标噪声太大，不适合做决策依据。Logo churn 还会
**掩盖 mix-shift 效应**：如果你最大的一批客户都走了，logo 数只掉 1，
但 GRR 远跌更多。最后「客户」本身的定义必须前后一致——一个母公司下
挂五个子公司算 1 个 logo 还是 5 个？这一选择会主导比例。如果你关心
纯粹的财务冲击，请用 **GRR 计算器**。

## 案例走读

假设一家中端市场 B2B SaaS 年初有 100 个活跃客户，全年流失 8 个完全
取消的客户。逐步算：

1. `期初客户数` = 100
2. `流失客户数` = 8
3. `留存客户数` = 100 − 8 = **92**
4. `客户流失 %` = 8 ÷ 100 × 100 = **8%** → 🟡 健康

搭配 **GRR 计算器**：若这 8 个流失客户平均 $10K MRR、留下的 92 个平均
$15K MRR，则公司 GRR 大约落在 92%——正好说明流失的客户比平均水平小，
所以按客户看的流失反而比按收入看的更凶。
