---
engine_ref: 'solopreneur-grr-calculator'
category_id: 'R'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'SaaS Capital — SaaS Retention Metrics'
    url: 'https://www.saas-capital.com/blog-posts/saas-retention-metrics/'
  - name: 'OpenView Partners — The Real Story Behind Net Dollar Retention'
    url: 'https://openviewpartners.com/blog/the-real-story-behind-net-dollar-retention/'
  - name: 'ICONIQ Growth — Gross Retention Definitions'
    url: 'https://www.iconiqcapital.com/growth/tte-net-dollar-retention'
---

## 这个计算器衡量什么

总收入留存（GRR）衡量你在老客户身上「保住了多少」经常性收入，**完全
不包含扩展**——所以按定义它永远小于等于 100%。GRR 是投资人用来确认你
留存引擎真实的「桶漏不漏」信号，在把任何扩展增长计入功劳之前必须
先看这一项。GRR 低于 80% 说明你的老客收入基础在快速收缩，无论新签
多少 logo 或做出多少扩展都补不回来；它也是判断客户成功团队是否真的
在赢留存的最佳视角，与销售做出扩展是分开的两件事。

## 计算方法

我们使用的 v3 标准公式：

```
留存 MRR = 期初 MRR − 缩减 MRR − 流失 MRR
GRR (%)  = 留存 MRR ÷ 期初 MRR × 100
```

| 变量        | 含义                                          |
| ----------- | --------------------------------------------- |
| `期初 MRR`  | 期初所有老客户的总 MRR                        |
| `缩减 MRR`  | 客户降档（不是取消）丢失的 MRR                |
| `流失 MRR`  | 当期完全取消的 MRR                            |

`期初 MRR = 0` 时返回 GRR = 0（除零保护）。健康带：🟢 ≥95%（顶四分位
留存）、🟡 90–95%（SaaS Capital 中位数）、🟠 80–90%（中端市场
中位数——需要介入）、🔴 <80%（严重、不可持续的流失）。GRR 揭示留存
引擎的绝对底线——如果 GRR 中等，NRR 还能维持 100% 以上就完全靠扩展
拉动了。

## 局限性 / 何时不适用

GRR 适用于**订阅型**业务、可预测的经常性收入。如果你卖多年合约且按
lump-sum 入账，GRR 会在过账节点剧烈抖动，失去意义。GRR 还依赖
cohort——季度内单一大合约的流失会让比例剧烈摆动，即便底层基础盘稳定。
对**早期**阶段（客户数少于 30）公司而言，GRR 噪声很大，单一账户就能
扭曲结果；建议等到基础盘够大（任何单个 logo 不超过 MRR 的 5%）再
看 GRR。如果你希望把扩展计入，请用 NRR 而非 GRR。

## 案例走读

一家 B2B 中端市场 SaaS，期初 MRR $1,000,000，Q2 期间缩减 MRR
$80,000、流失 MRR $20,000。计算过程：

1. `期初 MRR` = $1,000,000
2. `缩减 MRR` = −$80,000
3. `流失 MRR` = −$20,000
4. `留存 MRR` = $1,000,000 − $80,000 − $20,000 = **$900,000**
5. `GRR` = $900,000 ÷ $1,000,000 × 100 = **90%** → 🟡 健康

如果同季度内这家还有 $200,000 的升档 + 交叉销售，**NRR 会落在
110%**——这正好说明 GRR 隔离纯留存，而 NRR 允许扩展推高头条数字。
搭配 **NRR 计算器**可以把「留存 vs 留存 + 增长」两个视角并列对比。
