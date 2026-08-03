---
slug: 'solopreneur-csat-calculator'
engine_ref: 'solopreneur-csat-calculator'
category_id: 'T'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'CustomerGauge — CSAT Benchmarks'
    url: 'https://www.customergauge.com/blog/csat-benchmarks'
  - name: 'Gainsight — Customer Success Benchmarks'
    url: 'https://www.gainsight.com/blog/customer-success-benchmarks/'
  - name: 'Zendesk — Customer Experience Trends 2024'
    url: 'https://www.zendesk.com/customer-experience-trends/'
  - name: 'ICMI — Contact Center Performance Research'
    url: 'https://www.icmi.com/research/contact-center-performance'
---

## 这个计算器衡量什么

CSAT（Customer Satisfaction，客户满意度）是给本次客服互动打「满意」
的占比（通常是 5 分制里的 4 或 5）。本计算器把单一 CSAT 数字变成
**95% 置信区间** + 与目标的差距，让客户支持运营负责人看出这个结果是
真有统计意义，还是样本噪声；以及团队在内部目标上赢了还是输了。

## 计算方法

我们使用的 v3 标准公式：

```
p                = CSAT% / 100
误差边际         = 1.96 × √(p × (1 − p) / n) × 100
置信区间         = [CSAT% − 误差边际, CSAT% + 误差边际]
目标差距         = CSAT% − 内部目标%
```

| 变量       | 含义                                              |
| ---------- | ------------------------------------------------- |
| `CSAT%`    | 4–5 分评级的占比                                   |
| `回收率`   | 实际打分客户占被调研客户的比                       |
| `样本量`   | 收集到的总评分数                                   |
| `目标 CSAT`| 公司内部「好 CSAT」的基准                          |

健康区间（正指标——越高越好）：🟢 ≥90% · 🟡 80–90% · 🟠 70–80% · 🔴 <70%。
CustomerGauge 2024 报告 B2B SaaS 中位数约 82%。回收率 <20% = 样本偏差
（只有最满意或最愤怒的会回）；目标 ≥30% 才有代表性。

## 局限性 / 何时不适用

CSAT 是单次互动指标，不是关系指标。CSAT 高但 NRR 跌，说明支持体验
没问题但客户业务结果没达标。CSAT 要搭配 NPS 或 NRR 才能说「CS 健康」。
另外，回收率偏差是致命的：10% 回收率下出现的 90% CSAT 不是真信号。

## 案例走读

团队收集了 200 份评分，CSAT 87%，回收率 35%，内部目标 90%。

1. `误差边际` = 1.96 × √(0.87 × 0.13 / 200) × 100 = **4.7pp**
2. `置信区间` = [87 − 4.7, 87 + 4.7] = **[82.3%, 91.7%]**，95% 置信
3. `目标差距` = 87 − 90 = **−3.0pp**（低于目标）
4. 想达到 🟢 Excellent（≥90%），需 **3.0pp** 提升——置信区间已经擦边
   90%，CS 项目小幅推动即可关上缺口

CSAT 是 NRR 的领先指标。周环比下跌 >5pp 就要升级到客户成功负责人，
等 NRR 动就晚了。
