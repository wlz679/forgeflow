---
slug: 'solopreneur-email-campaign-roi-calculator-zh'
engine_ref: 'solopreneur-email-campaign-roi-calculator'
category_id: 'M'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'HubSpot — 邮件营销 ROI'
    url: 'https://blog.hubspot.com/marketing/email-marketing-roi'
  - name: 'Campaign Monitor — 邮件营销 ROI 指南'
    url: 'https://www.campaignmonitor.com/resources/guides/email-marketing-roi/'
  - name: 'Mailchimp — 邮件营销基准'
    url: 'https://mailchimp.com/resources/email-marketing-benchmarks/'
  - name: 'Salesforce — 邮件营销统计'
    url: 'https://www.salesforce.com/resources/articles/email-marketing-stats/'
---

## 这个计算器衡量什么

Email Campaign ROI（邮件活动 ROI）计算器按邮件自身的经济性打分：
产生的毛收入、扣除活动成本后的净收入、每次打开/点击成本、ROI 百分
比。同时它输出扩量预测："如果把这封活动发到 2 倍的列表上会怎样？"
在邮件预算评审会上需要为邮件投入辩护、或在两组主题行测试里二选一
时使用。行业基准开信率 21%（Mailchimp / Klaviyo 2024 平均值）已
写入健康分带作合理性检查。

## 计算方法

我们使用的 v3 标准公式：

```
送达数        = 列表规模 × 邮件条数
打开数        = 送达数 × (开信率 / 100)
点击数        = 打开数 × (CTR / 100)
毛收入       = 点击数 × 单次点击收入
净收入       = 毛收入 − 活动成本
ROI %       = (净收入 / 活动成本) × 100
单次打开成本 = 活动成本 / 打开数
单次点击成本 = 活动成本 / 点击数
```

| 变量           | 含义                                                              |
| -------------- | ----------------------------------------------------------------- |
| `列表规模`     | 邮件分组内的活跃订阅者数                                          |
| `开信率`       | 送达邮件中打开的百分比（行业平均约 21%）                          |
| `CTR`          | 打开者中点击的百分比（行业平均约 2.6%）                           |
| `单次点击收入` | 每次点击带来的平均收入（不是按打开算——打开不转化，点击才转化）   |
| `活动成本`     | 总成本：文案 + 设计 + 平台或租用列表费用                          |
| `邮件条数`     | 活动序列里的邮件条数（1 = 单次群发）                              |

健康分带（ROI %）：🟢 ≥ 300% · 🟡 100–300% · 🟠 0–100% · 🔴 < 0%。

## 局限性 / 何时不适用

本计算器假设**最后点击归因**——每次点击带来的购买都归到这封活动上。
Apple Mail Privacy Protection（MPP）会在 iOS 客户端把开信率虚高
10–30 pp，所以"开信率"现在最多算个方向性信号；真正看表现要靠
CTR 和单次点击收入。模型也忽略了**列表流失**——如果你的列表每月衰
减 0.5%，一个 6 封的邮件序列到第 6 封时触达会比第 1 封少约 3%。

## 案例走读

某 SaaS 周报有 10,000 订阅，跑一个 4 封的新品发布序列：开信率 25%，
CTR 5%，单次点击收入 25 元，活动总成本 500 元（设计 + ESP 平台费）：

1. `送达数` = 10,000 × 4 = **40,000**
2. `打开数` = 40,000 × 0.25 = **10,000**
3. ` 点击数` = 10,000 × 0.05 = **500**
4. `毛收入` = 500 × 25 = **12,500 元**
5. `净收入` = 12,500 − 500 = **12,000 元**
6. `ROI %` = (12,000 / 500) × 100 = **2,400%**（🟢 优秀）
7. `单次点击成本` = 500 / 500 = **1.00 元**

Dashboard 的 What-If 建模："如果列表涨到 20,000（互动率不变），
净收入会涨到 24,000 元，ROI 持平——这个毛利下邮件几乎纯增量。"
和 **Content Marketing ROI（内容营销 ROI）** 工具对比，可在
"投 SEO 还是投列表增长"之间做选择。
