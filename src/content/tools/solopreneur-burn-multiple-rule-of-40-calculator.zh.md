---
engine_ref: 'solopreneur-burn-multiple-rule-of-40-calculator'
category_id: 'C'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Craft Ventures — Burn Multiple (David Sacks)'
    url: 'https://www.craftventures.com/burn-multiple'
  - name: 'Bessemer Venture Partners — Rule of 40'
    url: 'https://www.bvp.com/atlas/rule-of-40'
  - name: 'SaaS Capital — Capital Efficiency Benchmarks'
    url: 'https://www.saas-capital.com/blog/lTV'
---

## 这个计算器衡量什么

两个 VC 最爱的资本效率指标在同一视图里。**Burn Multiple**（由 Craft Ventures 的 David Sacks 提出）是净现金燃烧与净增 ARR 的比值 —— 越低越好，< 1 意味着你增的 ARR 多于烧的现金。**Rule of 40**（由 Bessemer Venture Partners 推广）说 SaaS 健康当且仅当增长率 + 利润率 ≥ 40%。两者一起回答：你是不是在高效增长？融资准备时用它来定位效率故事，董事会更新时用它来跟踪资本效率随时间的走势。

## 计算方法

两个公式，一个计算器：

```
Rule of 40 分数 = 收入增长（%）+ 利润率（%）
Burn Multiple   = 净燃烧 ÷ 净增 ARR
                  （若净增 ARR ≤ 0 则为 ∞）
SaaS 象限       = 2×2 矩阵：高增长（≥ 40%）× 正利润（≥ 0%）
                  → Stars / Growers / Plowhorses / Zombies
```

| 阶段基准       | Burn Multiple 档位                        |
| -------------- | ----------------------------------------- |
| Seed（pre-PMF）| < 2 优秀，2-3 良好，> 3 警戒              |
| Series A       | < 1.5 优秀，1.5-2 良好，> 2 警戒          |
| Series B+      | < 1 优秀，1-1.5 良好，> 1.5 警戒          |

| Rule of 40 分数 | 评级                                 |
| --------------- | ------------------------------------ |
| ≥ 40%           | 🟢 PASS —— 顶级资本效率             |
| 25-40%          | 🟡 临界                              |
| 10-25%          | 🟠 偏低 —— 需改进                    |
| < 10%           | 🔴 不达标 —— 在燃烧却没有增长       |

## 局限性 / 何时不适用

两个指标都依赖你度量的 **周期**。季度 Burn Multiple 可能大幅波动（Q4 一个大客户成交让你倍数看起来很棒）；用 trailing-12-month（TTM）或年化数据更稳定。Rule of 40 包含的利润率可能因一次性费用（重组、计提）而噪声大 —— 用 **EBITDA-based** 利润率，不用 GAAP。2×2 SaaS 象限隐藏第三维度：净金额留存。NDR 90% 的「Stars」公司与 NDR 130% 的「Stars」完全不同。本计算器也不区分 **有机增长**（低 CAC）和 **付费增长**（高 CAC、市场驱动）—— Rule of 40 分数相同的两个公司单位经济可能差异巨大。

## 案例走读

假设一个 Series A SaaS：100% 同比增长、−20% EBITDA 利润率、$200 万季度净燃烧、$150 万季度净增 ARR。

1. **Rule of 40** = 100% + （−20%）= **80.0%** → 🟢 PASS（顶级）
2. **Burn Multiple** = $200 万 ÷ $150 万 = **每 $1 ARR 烧 $1.33** → 🟡 良好（高效）
3. **象限** = 高增长 + 负利润 = **🟡 Growers**
4. **阶段基准（Series A）** = $1.33 < 1.5 → **🟢 对 A 顶级**

What-If 场景：增长翻倍（新 ARR $300 万，同样燃烧）Burn Multiple 降到 **$0.67**（跨阶段顶级）。砍燃烧 50%（到 $100 万）也降到 **$0.67**。加 $500 万 ARR（新 ARR $700 万，同样燃烧）降到 **$0.29** —— 独角兽地带。5 增长/利润组合对比条显示：50% 增长 + −20% 利润 = 30%（临界），而 100% + −20% = 80%（明显 PASS）—— Rule of 40 的强项是允许高增长补偿负利润。