---
engine_ref: 'solopreneur-support-capacity-planning-calculator'
category_id: 'T'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'TSIA — Workforce Optimization Benchmark 2024'
    url: 'https://www.tsia.com/blog/workforce-optimization'
  - name: 'ICMI — Contact Center Performance Research'
    url: 'https://www.icmi.com/research/contact-center-performance'
  - name: 'Zendesk — Customer Experience Trends 2024'
    url: 'https://www.zendesk.com/customer-experience-trends/'
  - name: 'SQM Group — Contact Center Benchmarks'
    url: 'https://www.sqmgroup.com/resources/research/contact-center-benchmarks'
---

## 这个计算器衡量什么

支持团队容量规划回答的是「下个月处理 X 工单、按 Y 服务水平需要多少坐席」
——把平均处理时长、损耗（shrinkage）、目标利用率合成为一个「所需人头」
数字和一个真实利用率区间。支持负责人用它来给下个季度定团队规模、给
招聘申请找证据、或者在流失发生前察觉倦怠风险。

## 计算方法

我们使用的 v3 标准公式：

```
总处理分钟         = 月工单量 × 平均处理时长（分钟）
每人有效分钟       = 工作小时 × 60 × (1 − 损耗%/100) × (利用率%/100)
所需坐席           = ceil(总处理分钟 / 每人有效分钟)
实际利用率         = (总处理分钟 / (所需坐席 × 每人有效分钟)) × 100
```

| 变量          | 含义                                                                |
| ------------- | ------------------------------------------------------------------- |
| `月工单量`    | 预测月度入站量                                                      |
| `平均处理分钟` | 单工单平均处理时长（分钟）                                          |
| `目标利用率`  | 在工单上花的时间占比（vs 等待/空闲）                                 |
| `月工作小时`  | 每坐席月度工作小时（160 = 40h/周 × 4 周，美式标准）                 |
| `损耗%`       | 非生产时间——会议、培训、年假、病假、系统问题（25–35%）              |
| `目标响应分钟` | 目标首次响应时间（参考用，不进入人头计算）                          |

健康区间（反指标——利用率越低、缓冲越大越好）：🟢 ≤85%（15%+ 缓冲）·
🟡 85–100% · 🟠 100–120%（倦怠风险）· 🔴 >120%（即将流失）。

## 局限性 / 何时不适用

这是稳态模型。它抓不住季节性（黑五峰）、产品发布爆量、或排班的边缘
情况。7×24 团队还要在人头之上叠排班模式。最终签批前，叠一层季节性
和排班覆盖。

## 案例走读

某团队预测月工单 5,000，平均处理 18 分钟，目标利用率 70%，损耗 30%，
每坐席月工作 160 小时。

1. `总处理分钟` = 5,000 × 18 = **90,000 分钟/月**
2. `每人有效分钟` = 160 × 60 × 0.70 × 0.70 = **4,704 分钟/坐席**
3. `所需坐席` = ceil(90,000 / 4,704) = **20 人**
4. `实际利用率` = (90,000 / (20 × 4,704)) × 100 = **95.7%** → 🟡 Good

工单量涨 20% 到 6,000/月，所需涨到 **23 人（+3 招聘）**，利用率仍是
95.7%。想把当前状态拉到 🟢 Excellent（≤85% 利用率），再招 1 人 →
利用率 **91.1%**。

把结果跟「单工单成本」计算器一起读，能算出下一轮招聘的财务影响。
