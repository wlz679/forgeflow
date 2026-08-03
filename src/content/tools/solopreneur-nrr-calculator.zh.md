---
engine_ref: 'solopreneur-nrr-calculator'
category_id: 'R'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'SaaS Capital — SaaS Retention Metrics'
    url: 'https://www.saas-capital.com/blog-posts/saas-retention-metrics/'
  - name: 'OpenView Partners — The Real Story Behind Net Dollar Retention'
    url: 'https://openviewpartners.com/blog/the-real-story-behind-net-dollar-retention/'
  - name: 'ICONIQ Growth — Net Dollar Retention'
    url: 'https://www.iconiqcapital.com/growth/tte-net-dollar-retention'
---

## 这个计算器衡量什么

净收入留存（NRR）衡量你在已有客户身上「保住了多少、还长出了多少」
经常性收入——这是 SaaS 公司董事会上几乎每个周期都会盘点的头号指标。
NRR 高于 100% 表示老客户净增长（覆盖了流失和缩减），低于 100% 表示
老客基础在缩，即便有新增 logo 也救不回来。NRR 是融资尽调和上市公司
SaaS 年报里出现频率最高的留存指标，原因很简单：它把新签的噪声剥离
出去，只看你已到手的那块收入健不健康。

## 计算方法

我们使用的 v3 标准公式：

```
净留存 MRR = 期初 MRR + 扩展 MRR − 缩减 MRR − 流失 MRR
NRR (%)    = 净留存 MRR ÷ 期初 MRR × 100
```

| 变量         | 含义                                          |
| ------------ | --------------------------------------------- |
| `期初 MRR`   | 期初所有老客户的总 MRR                        |
| `扩展 MRR`   | 同客户群内部升档 + 交叉销售带来的净增 MRR     |
| `缩减 MRR`   | 客户降档（不算取消，取消算流失）丢失的 MRR    |
| `流失 MRR`   | 当期完全取消的 MRR                            |

`期初 MRR = 0` 时返回 NRR = 0（除零保护）。健康带沿用 OpenView /
ICONIQ 口径：🟢 ≥120%（顶四分位）、🟡 110–120%（健康扩展）、🟠 100–110%
（脆弱，扩展刚刚覆盖流失）、🔴 <100%（净收缩）。所有输入都会被截断为
非负——如果你的计费系统报了负的流失调整，请先剥离再喂进来。

## 局限性 / 何时不适用

NRR 是 **B2B 中端市场 SaaS** 指标。它不能直接套到自服务型 C 端订阅产品
（cohort 太小、几乎没有扩展），也不适用于纯交易型或服务型业务。这个指标
还会把截然不同的增长动作混在一起：靠激进涨价的 110% NRR 和靠有机席位
扩张的 110% NRR 在数字上看起来一样，但本质不同。另外 NRR 是时点指标且
依赖 cohort——单一季度的扩展高峰需要大约 12 个月才能完全复利，所以跟
投资人沟通时务必同步看 trailing 12-month NRR。

## 案例走读

假设一家 B2B SaaS 进入 Q2 时 `期初 MRR = $1,000,000`，本季度发生如下
流动：`扩展 MRR = $200,000`（升档 + 交叉销售）、`缩减 MRR = $80,000`、
`流失 MRR = $20,000`。走一遍：

1. `期初 MRR` = $1,000,000
2. `扩展 MRR` = +$200,000
3. `缩减 MRR` = −$80,000
4. `流失 MRR` = −$20,000
5. `净留存 MRR` = $1,000,000 + $200,000 − $80,000 − $20,000 = **$1,100,000**
6. `NRR` = $1,100,000 ÷ $1,000,000 × 100 = **110%** → 🟡 健康

搭配 **GRR 计算器**可以看到不靠扩展的纯留存，搭配 **扩展收入计算器**
可以量化那 +20pp 的提升到底来自哪条增长动作。
