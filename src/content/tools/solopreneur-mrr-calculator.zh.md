---
slug: 'solopreneur-mrr-calculator-zh'
engine_ref: 'solopreneur-mrr-calculator'
category_id: 'A'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Stripe Atlas — Recurring Revenue Definition'
    url: 'https://stripe.com/atlas/guides/revenue'
  - name: 'ChartMogul NRR Benchmarks 2026'
    url: 'https://chartmogul.com/'
  - name: 'OpenView SaaS Benchmarks 2026'
    url: 'https://openviewpartners.com/blog/saas-benchmarks/'
---

## 这个计算器衡量什么

月度经常性收入（MRR）是把订阅收入中的可预测部分归一化到一个月的指标。
它剥离了一次性费用、硬件销售、专业服务等非循环收入，呈现你下个月
「真正可以期待」的那部分收入，从而能做现金流预测、设定销售配额、
跨订阅层级比较增长时不被季节性扭曲。

## 计算方法

我们使用的 v3 标准公式：

```
MRR = 活跃订阅用户 × 月单价
    + 扩展 MRR
    + 唤醒 MRR
    − 缩减 MRR
```

| 变量            | 含义                                          |
| --------------- | --------------------------------------------- |
| `活跃订阅用户`  | 当月付费用户（不含试用 / 暂停）              |
| `月单价`        | 归一化人均月费（年付 ÷ 12 即得）              |
| `扩展 MRR`      | 老客户升级带来的净 MRR                        |
| `唤醒 MRR`      | 流失客户重新订阅带来的 MRR                    |
| `缩减 MRR`      | 客户降级（非取消）丢失的 MRR                  |

我们**不**从这个总额中减去流失 MRR，因为流失会单独在 GRR/NRR
分析中汇报（见 NRR Calculator 工具）。

## 局限性 / 何时不适用

MRR 是**订阅经济**指标。如果你的业务主战场是事务型、项目制、或一次性费用
占比很高（硬件转售、实施服务等），MRR 会低估你的真实收入走向。这类业务
请使用 ARR（多年合约为主时）或直接做现金流预测。

## 案例走读

假设一家 B2B SaaS 月单价 $49，活跃用户 2,000 人，净扩展 $2,000/月（升级 −
降级），唤醒 $150/月：

1. `活跃用户 × 月单价` = 2,000 × $49 = **$98,000**
2. 加 `扩展 MRR` = $98,000 + $2,000 = **$100,000**
3. 加 `唤醒 MRR` = $100,000 + $150 = **$100,150**

本工具的**Dashboard** 段会展示保持当前增长率下的 12 月滚动 MRR 预测；
搭配 **Burn Rate Calculator** 即可看到该 MRR 在你当前烧钱速度下能撑多少
个月的 runway。
