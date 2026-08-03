---
slug: 'solopreneur-deflection-rate-calculator'
engine_ref: 'solopreneur-deflection-rate-calculator'
category_id: 'T'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'TSIA — Self-Service Benchmark 2024'
    url: 'https://www.tsia.com/blog/self-service-benchmark'
  - name: 'Zendesk — Customer Experience Trends 2024'
    url: 'https://www.zendesk.com/customer-experience-trends/'
  - name: 'Freshworks — Customer Service Benchmark'
    url: 'https://www.freshworks.com/customer-service-benchmark/'
  - name: 'Gartner — Customer Service & Support Research'
    url: 'https://www.gartner.com/en/customer-service-support'
---

## 这个计算器衡量什么

自助分流（Self-Service Deflection）率，是入站工单里**完全**由知识库、
产品内帮助或聊天机器人在到达 T1 坐席之前就解决掉的占比。本计算器同时
输出分流率、节省毛额、扣减自助工具成本后的净节省、和 ROI，让客户成功
负责人能给「知识库平台 + 聊天机器人订阅」这笔预算找到 ROI 证据。

## 计算方法

我们使用的 v3 标准公式：

```
分流工单量   = 月度工单 × (分流率% / 100)
毛节省       = 分流工单量 × 单工单成本
净节省       = 毛节省 − 工具月成本
ROI%         = (净节省 / 工具月成本) × 100
```

| 变量           | 含义                                            |
| -------------- | ----------------------------------------------- |
| `月度工单量`   | 本月预期入站工单总量                             |
| `分流率%`      | 由 KB / 聊天机器人在无人介入情况下解决的占比     |
| `单工单成本`   | 全成本单工单成本（用「单工单成本」计算器结果）   |
| `工具月成本`   | KB 平台 + 聊天机器人订阅合计                     |
| `目标分流率`   | 公司内部「好分流」的基准                         |

健康区间（正指标——越高越好）：🟢 ≥40% · 🟡 25–40% · 🟠 10–25% · 🔴 <10%。
分流率 >50% 可能说明 KB 在掩盖产品问题——每季度抽检被分流的热门工单，
确认自助服务是真健康，不是给真问题糊墙纸。

## 局限性 / 何时不适用

本工具默认每张被分流的工单都**完全**没让人介入。聊天机器人尝试后升级
到 T1 的工单算负向（不算分流）。另外，分流 ≠ 客户满意度——客户看了错误
KB 答案再来开单，是双倍成本。

## 案例走读

团队预期月度入站 5,000 单工单，分流率 35%，单工单成本 $24。KB 平台
+ 聊天机器人每月 $1,500。

1. `分流工单量` = 5,000 × 0.35 = **1,750 单/月**
2. `毛节省` = 1,750 × $24 = **$42,000/月**
3. `净节省` = $42,000 − $1,500 = **$40,500/月**
4. `ROI` = $40,500 / $1,500 = **2,700%**

想达到 🟢 Excellent（≥40%），需 **+5.0pp** 分流率。本计算器要跟
「单工单成本」计算器搭配读，能完整算出自助投资的全口径成本下降。
