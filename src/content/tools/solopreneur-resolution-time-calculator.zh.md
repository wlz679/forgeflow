---
engine_ref: 'solopreneur-resolution-time-calculator'
category_id: 'T'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'TSIA — Support Operations Benchmark 2024'
    url: 'https://www.tsia.com/blog/support-operations-benchmark'
  - name: 'ICMI — Contact Center Performance Research'
    url: 'https://www.icmi.com/research/contact-center-performance'
  - name: 'SQM Group — Contact Center Benchmarks'
    url: 'https://www.sqmgroup.com/resources/research/contact-center-benchmarks'
  - name: 'Gainsight — Customer Success Benchmarks'
    url: 'https://www.gainsight.com/blog/customer-success-benchmarks/'
---

## 这个计算器衡量什么

解决时间（Resolution Time）的健康度，由两个信号组成：在 SLA 内关单的
工单占比 + 最慢 10% 工单的**长尾比**（p90 ÷ 中位数）。它把「典型解决
速度」（中位数）和「拖了好几天的长尾」（p90）分开，让支持运营负责人
看清 SLA 达成率是不是在掩盖长尾问题。

## 计算方法

我们使用的 v3 标准公式：

```
SLA 达成率   = 在承诺窗口内关单的工单占比
中位数       = 端到端解决时间中位数（小时）
p90          = 第 90 百分位解决时间（小时）
长尾比       = p90 / 中位数
漏单量       = 月度关单 × (1 − SLA 达成率 / 100)
```

| 变量           | 含义                                              |
| -------------- | ------------------------------------------------- |
| `SLA 达成率`   | 在承诺窗口内关单的工单占比                         |
| `中位小时`     | 端到端解决时间的中位数                             |
| `p90 小时`     | 第 90 百分位解决时间——最慢的 10%                  |
| `月度关单量`   | 报告期内关单总数                                   |

健康区间（正指标——越高越好）：🟢 ≥85% · 🟡 70–85% · 🟠 50–70% · 🔴 <50%。
长尾比参考：≤1.5 均匀 · 1.5–3.0 中等 · >3.0 重 · >5.0 系统性问题（升级、
知识库缺口、产品缺陷）。中位数是粉饰，p90 才是真相。

## 局限性 / 何时不适用

这个工具把所有工单视为同等权重。一次 30 分钟的密码重置和一次 5 天的
生产故障排查都算一张单。如果支持组织里事故占比高，先按问题等级
（Sev1/2/3）切片再读健康区间。CSAT 与首响时长（FRT）独立于解决时间，
需另用满意度与响应类计算器配合。

## 案例走读

某团队月度关单 4,800，SLA 达成率 75%，中位解决 8 小时，p90 36 小时。

1. `长尾比` = 36 / 8 = **4.5x** → 重长尾
2. `漏单量` = 4,800 × 0.25 = **1,200 张漏单**
3. 想达到 🟢 Excellent（≥85%），需 **+10.0pp** 达成率
4. 达成率升到 85%（+10pp）后，区间变成 🟢 Excellent，但仍有约 720 张
   长尾漏单——要查到底

长尾 4.5x 通常指向知识库内容缺口或 T3 工程师队列瓶颈。手动抽检最慢
的 10% 工单，给根因打标。
