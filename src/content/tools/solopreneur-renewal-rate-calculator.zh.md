---
slug: 'solopreneur-renewal-rate-calculator-zh'
engine_ref: 'solopreneur-renewal-rate-calculator'
category_id: 'R'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'OpenView Partners — 2024 SaaS Benchmarks'
    url: 'https://openviewpartners.com/blog/saas-benchmarks/'
  - name: 'ICONIQ Growth — SaaS Retention Metrics'
    url: 'https://iconiqcapital.com/growth/saas-retention-metrics'
  - name: 'SaaS Capital — Retention Benchmark Study'
    url: 'https://www.saascapital.com/insights-private-company-benchmarks'
---

## 这个计算器衡量什么

续约率（Renewal Rate）只抓住留存流程中一个特定瞬间：合约到期时，
到底续不续？这是判断客户投入度的最干净「毛留存」读数，因为它不含
中途降级，也不含任何扩展——这两件事都可能掩盖续约对话本身的真实
健康度。当董事会问「客户在被选择时是否留下？」，问的就是这个。
对采用年度合约的中端市场 B2B SaaS，续约率是 CS 团队按季度的脉搏。
搭配 **GRR 计算器** 可看完整的总留存画面（叠加降级 + 流失）；搭配
**NRR 计算器** 可以看到扩展对净数字的提升。

## 计算方法

我们使用的 v3 标准公式：

```
续约率 (%) = 已续约 ARR ÷ 到期 ARR × 100
```

| 变量          | 含义                                          |
| ------------- | --------------------------------------------- |
| `到期 ARR`    | 当期所有到期合约的总 ARR                      |
| `已续约 ARR`  | 上述 ARR 中实际续约的部分（不含扩展）        |

`到期 ARR = 0` 时返回续约率 = 0（除零保护）。健康带沿用 OpenView /
ICONIQ 年度合约 SaaS 基准：🟢 ≥90%（世界级毛留存）、🟡 80–90%
（中端市场中位数约 85%）、🟠 70–80%（预警——CS 覆盖有缺口）、🔴
<70%（严重——需要重大介入）。所有输入截断为非负。扩展（升档 /
交叉销售）按设计**不计入**续约数字——它属于 NRR 的领域。

## 局限性 / 何时不适用

续约率只对有明确续约瞬间的业务有意义——年付或多年合约是天然契合。
对纯月付订阅（没有合约决策）的业务，「续约」会塌缩成「客户下月
还续不续」，这个指标就和 logo churn 重叠了，请改用**客户流失率
计算器**。对按用量 / 计量计费且自动续约的合约，分母难以定义清楚，
数字很容易误导——续约率应只在你有合约承诺的 ARR 上报，不应在按量
计收的营收上算。续约率按设计**不计入中途降级**：客户第 4 个月降档、
第 12 个月按降低后的金额续约，是否同时计两次取决于你的拆分规则
——保持口径一致。

## 案例走读

一家用年度合约的中端市场 B2B SaaS，本季度有 $1,000,000 的 ARR
到期（覆盖 47 个合约），其中实际续约的 ARR 为 $850,000。计算：

1. `到期 ARR` = $1,000,000
2. `已续约 ARR` = $850,000
3. `续约率` = $850,000 ÷ $1,000,000 × 100 = **85.0%** → 🟡 健康

在这个规模上每提升 5pp 就等于每个季度多拿回 $50,000 ARR。搭配
**GRR 计算器**可以看到完整毛留存视图，搭配 **NRR 计算器**可以
看清这些续约客户身上又带来了多少扩展。
