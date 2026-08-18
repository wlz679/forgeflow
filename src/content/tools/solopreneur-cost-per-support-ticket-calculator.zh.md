---
engine_ref: 'solopreneur-cost-per-support-ticket-calculator'
category_id: 'T'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'TSIA — Support Operations Benchmark 2024'
    url: 'https://www.tsia.com/blog/support-operations-benchmark'
  - name: 'Zendesk — Customer Experience Trends 2024'
    url: 'https://www.zendesk.com/customer-experience-trends/'
  - name: 'Freshworks — Customer Service Benchmark'
    url: 'https://www.freshworks.com/customer-service-benchmark/'
  - name: 'ICMI — Contact Center Performance Research'
    url: 'https://www.icmi.com/research/contact-center-performance'
---

## 这个计算器衡量什么

单工单成本（Cost-per-Support-Ticket）是把多层级（T1/T2/T3）客服队列里
一张工单的全成本做加权平均后的指标。它把一线初级坐席、专家升级、工程师
深度介入的成本混成一个数，让中型 B2B SaaS 客户成功运营负责人看清
「每张工单到底花多少钱」，从而把工单量和支持预算真正挂钩。

## 计算方法

我们使用的 v3 标准公式：

```
加权平均成本 = (T1 成本 × T1 占比 + T2 成本 × T2 占比 + T3 成本 × T3 占比) / 100
T3 占比       = max(0, 100 − T1 占比 − T2 占比)
月度总成本    = 加权平均成本 × 月度工单量
```

| 变量          | 含义                                                |
| ------------- | --------------------------------------------------- |
| `T1 成本`     | 一线初级坐席的单工单全成本（处理时长 + 间接成本）   |
| `T2 成本`     | 高级专家的单工单全成本                              |
| `T3 成本`     | 工程师介入的单工单成本（典型 $80–$150/小时）         |
| `T1/T2 占比`  | 月度工单在各层级的占比（T3 自动计算）               |
| `月度工单量`  | 报告窗口内入站工单总数                              |

健康区间（反指标——越低越好）：🟢 ≤$10 · 🟡 $10–$25 · 🟠 $25–$50 ·
🔴 >$50。TSIA 2024 中型市场基准是 $15–$25/工单；<$10 说明自助分流成熟，
>$50 通常是升级过多或产品问题在持续生成工单。

## 局限性 / 何时不适用

这只覆盖**入站工单客服**，不包含客户成功管理（QBR、入门、续约）成本——
那块请使用留存类（R 系列）计算器。渠道结构影响很大：在线聊天便宜、电话
贵（大约 3 倍全成本）。如果你的团队重度依赖电话或现场驻场支持，先叠加
一层渠道加权再读健康区间。一次性项目成本（系统迁移、紧急增援、节假日
轮班补贴）也不在内——这些通常走专项预算，不应摊到工单均值上。

## 案例走读

一家中型 B2B SaaS 的 T1 单工单成本 $8、T2 $25、T3 $70；结构是 55% T1、
30% T2、15% T3；月工单量 5,000。

1. `T3 占比` = 100 − 55 − 30 = **15%**
2. 加权 = (8×55 + 25×30 + 70×15) / 100 = **$22.40/工单**
3. 月度总成本 = $22.40 × 5,000 = **$112,000/月**
4. 想拉到 🟢 Excellent（≤$10），要么把 T3 成本压到 ≤$83，要么把 T3
   占比压到 ≤5%（通常通过知识库补齐——见 [自助分流计算器]）

把这个结果跟解决时间计算器一起读，能看出加权成本高是来自 T3 长尾，
还是 T1 整体积压。
