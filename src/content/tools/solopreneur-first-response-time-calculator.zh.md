---
engine_ref: 'solopreneur-first-response-time-calculator'
category_id: 'T'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Zendesk — Customer Experience Trends 2024'
    url: 'https://www.zendesk.com/customer-experience-trends/'
  - name: 'Freshworks — Customer Service Benchmark'
    url: 'https://www.freshworks.com/customer-service-benchmark/'
  - name: 'ICMI — Contact Center Performance Research'
    url: 'https://www.icmi.com/research/contact-center-performance'
  - name: 'TSIA — Support Operations Benchmark 2024'
    url: 'https://www.tsia.com/blog/support-operations-benchmark'
---

## 这个计算器衡量什么

首次响应时间（First Response Time, FRT）的 SLA 达成率，是按时收到第一
次人工回复的工单占比。T1（一线）、T2（专家）、T3（工程师升级）分层
分别度量，再把三层做成等权平均，让支持负责人一眼看到最弱的队列。

## 计算方法

我们使用的 v3 标准公式：

```
整体 SLA    = (T1 达成率 + T2 达成率 + T3 达成率) / 3
层级差距    = max(T1, T2, T3) − min(T1, T2, T3)
到顶缺口    = max(0, 90 − 整体 SLA)
```

| 变量           | 含义                                            |
| -------------- | ----------------------------------------------- |
| `T1 目标分钟`  | T1 工单首次响应目标（分钟）                      |
| `T2 目标小时`  | T2 工单首次响应目标（小时）                      |
| `T3 目标小时`  | T3 升级首次响应目标（小时，常 24h+）             |
| `T1/2/3 达成率` | 报告窗口内各层级按时响应的占比                   |

健康区间（正指标——越高越好）：🟢 ≥90% · 🟡 80–90% · 🟠 60–80% ·
🔴 <60%。T1 <80% 通常意味着队列过载、班次覆盖弱、或低价值工单过多——
先查人头再调 SLA 目标。

## 局限性 / 何时不适用

整体 SLA 是**等权平均**，不是按工单量加权。如果 T3 工单量 <5%，T3 90%
达成率对整体拉动有限。企业级支持团队要看「按工单量加权」的视图，需把
本计算器和工单量数据再叠加一层再读。

## 案例走读

某 B2B SaaS 的目标是 T1 ≤30 分钟、T2 ≤4 小时、T3 ≤24 小时；上月 T1
达成 85%、T2 达成 80%、T3 达成 90%。

1. `整体 SLA` = (85 + 80 + 90) / 3 = **85.0% 达成** → 🟡 Good
2. `层级差距` = 90 − 80 = **10.0pp** ——T2 是短板
3. 把 T1 提升 +5pp 到 90%，整体 = (90 + 80 + 90) / 3 = **86.7%**（仍 🟡 Good，
   但靠近 🟢 Excellent）
4. 想达到 🟢 Excellent（≥90%），需补 **5.0pp** 整体缺口——平均分摊到
   三层约 15.0pp 总分

先把最弱队列（T2）稳住，再去收紧 SLA 目标——给本来就在挣扎的队列加压，
只会让漏单更多。
