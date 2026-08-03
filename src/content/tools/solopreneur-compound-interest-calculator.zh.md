---
slug: 'solopreneur-compound-interest-calculator-zh'
engine_ref: 'solopreneur-compound-interest-calculator'
category_id: 'F'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-08-03'
sources:
  - name: 'Investor.gov — Compound Interest Calculator (SEC investor education)'
    url: 'https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator'
  - name: 'Investopedia — Compound Interest'
    url: 'https://www.investopedia.com/terms/c/compoundinterest.asp'
  - name: 'Bogleheads — Expected Real Returns Wiki'
    url: 'https://www.bogleheads.org/wiki/Expected_returns'
---

## 这个计算器衡量什么

复利是把小额、规律供款在 20-40 年时间窗内放大成改变生活量级的财富
引擎。这个计算器对「本金 + 月供」在年复利和月复利下都建模，外推
最终余额，并显示本金 vs 利息比例（即最终数字里多少来自你的存款、
多少来自市场）。它走 5 个里程碑节点（5、10、15、20、最终年），跑
3 个目标时间投影（$100K、$500K、$1M），并把复利 vs 单利的临界点摆
出来 —— 让曲线背后的数学可见、不是黑箱。用于退休规划、应急金
增长、储蓄目标和任何「时间就是乘数」的储蓄场景。

## 计算方法

我们使用的 v3 标准公式：

```
月复利：
  r_m      = 年利率 / 12
  n        = 年数 × 12
  FV_PV    = 本金 × (1 + r_m)^n
  FV_PMT   = 月供 × ((1 + r_m)^n − 1) / r_m
  FV       = FV_PV + FV_PMT

年复利（PMT 视为年末供款）：
  FV_PV    = 本金 × (1 + r)^年数
  FV_PMT   = 月供 × 12 × ((1 + r)^年数 − 1) / r
  FV       = FV_PV + FV_PMT

总供款      = 本金 + 月供 × 12 × 年数
总利息      = FV − 总供款
乘数        = FV / 总供款
复利优势    = FV − 单利终值(...)
```

| 变量         | 含义                                                              |
| ------------ | ----------------------------------------------------------------- |
| `本金`       | 初始存款（从零起步填 0）                                          |
| `月供`       | 每月末追加的存款                                                  |
| `年利率`     | 预期年化收益率百分比（S&P 500 长期实际收益用 7）                  |
| `复利频率`   | `annually`（债券 / CD）或 `monthly`（储蓄 / 券商账户）           |
| `年数`       | 投资时间窗年数（引擎上限 50）                                     |

利率健康度分档（🟢 ≥7% S&P 500 长期实际收益、🟡 ≥4% HYSA / CD、🟠
≥1% 基础储蓄、🔴 <1% 跑不赢通胀）来自 Investopedia 和 Bogleheads。
月复利 vs 年复利在 7% 下差约 0.229% APY —— 任意单年差距小，但
30 年下来在 $10K 底上多出约 $5K。目标时间节点用 0.5 年为步长线性
搜索，上限 50 年。复利 vs 单利临界点是最有诊断价值的一行：它告诉你
最终余额里多少是「利息的利息」而不是「本金的利息」。

## 局限性 / 何时不适用

这个计算器假设年化利率恒定 —— 这是简化：实际 S&P 500 年度收益在
-37% 到 +29% 之间波动（1928-2024）。它不显式建模通胀；7% 默认值
已经是 Bogleheads 口径的实际收益（扣通胀后），所以外推余额是今天的
美元，而不是未来名义美元。它也不建模应税账户中分红 / 利息的税损、
强制最低提取（RMD）、早期退休的回报序列风险。退休前投影用于粗算
已经够准；做退休日期决策时，叠加通胀假设（3%）和税率（15-25%）
再看真实购买力。过往业绩也不保证未来 —— 保守用 4%，中等用 7%。

## 案例走读

30 岁起每月存 $500，初始 $10,000，瞄准 30 年 S&P 500 长期均值 7%
（月复利）：

1. `r_m` = 7% / 12 = 每月 0.583%
2. `n` = 30 × 12 = 360 个月
3. `FV_PV` = $10,000 × (1.00583)^360 = **$81,134**
4. `FV_PMT` = $500 × ((1.00583)^360 − 1) / 0.00583 ≈ **$610,000**
5. `FV` ≈ **$691,000**（按今天的实际美元）
6. `总供款` = $10,000 + $500 × 12 × 30 = **$190,000**
7. `乘数` = $691,000 / $190,000 = **3.64×** —— 每 1 美元供款长成 3.64 美元

该时间窗下复利 vs 单利临界点显示：单利只产出约 $409,000 —— 复利
多出 **$282,000** 的「利息的利息」。Invest.gov 公开案例中 S&P 500
历史 $10K → $76K（30 年）也印证这条曲线。计算器 What-If 区还显示：
每月加 $100 在第 20 年多出约 $52K；时间窗加 5 年多出约 $161K；从
月复利切回年复利在第 20 年少约 $16K。搭配 **Freelance Tax
Calculator** 看你到手能往 SEP-IRA / Solo 401k 投多少，搭配 **Time
Value Calculator** 把工时换算成月供能力。
