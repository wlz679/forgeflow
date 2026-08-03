---
slug: 'solopreneur-pipeline-value-calculator-zh'
engine_ref: 'solopreneur-pipeline-value-calculator'
category_id: 'S'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Salesforce — 如何搭建销售管道'
    url: 'https://www.salesforce.com/resources/articles/sales-pipeline/'
  - name: 'HubSpot — 销售管道管理指南'
    url: 'https://blog.hubspot.com/sales/sales-pipeline'
  - name: 'Pavilion — 2026 B2B 销售基准'
    url: 'https://www.joinpavilion.com/'
---

## 这个计算器衡量什么

销售管道价值（pipeline value）是当前管道里每一笔交易按概率加权后的美元金额。它跟原始管道（nominal，只算 笔数 × 合同金额）不同，会按阶段成功率（Discovery 20%、Proposal 40%、Negotiation 60%、Closing 80%）加权，给创始人和销售负责人一个贴近现实的预测，而不是被严重高估的"上限"。这个数字是季度董事会汇报、销售配额节奏、以及 CRO 跟 CEO 谈"能不能打中目标"时的核心依据。

## 计算方法

我们使用的 v3 标准公式，套用 Salesforce 风格的阶段概率：

```
Discovery    (笔数 × 单笔金额 × 0.20) → 加权值
Proposal     (笔数 × 单笔金额 × 0.40) → 加权值
Negotiation  (笔数 × 单笔金额 × 0.60) → 加权值
Closing      (笔数 × 单笔金额 × 0.80) → 加权值

加权管道      = Σ(各阶段加权值)
名义管道      = Σ(笔数 × 单笔金额)             // 未加权面值
加权预测      = 加权管道 × 0.50               // 50% 信心折扣
加权占名义比  = 加权管道 ÷ 名义管道
```

| 变量                | 含义                                                |
| ------------------- | --------------------------------------------------- |
| `Discovery × 20%`   | 管道顶端，活动多、关单率低                          |
| `Proposal × 40%`    | 主动评估，方案对齐 + 报价阶段                       |
| `Negotiation × 60%` | 后期合同/法务审核，关键支持人已介入                 |
| `Closing × 80%`     | 准备签约，仅剩 red-line 评审或文书流程              |
| `加权预测`          | 加权管道 × 0.50，反映销售预测系统性高估约 2 倍      |

**假设。** 阶段概率用的是行业默认——用你自己的历史转化率替换会更准。50% 折扣对应的是销售预测和实际关单之间普遍存在的 2× 偏差（CSO Insights / Pavilion 2026 数据）。加权占名义比反映你的原始管道里有多少是"真实可期"的（例如 45.7% 意味着 $470K 的名义管道实际值 $215K）。

## 局限性 / 何时不适用

这个计算器适用于**B2B SaaS 和顾问式销售流程**，前提是有清晰的阶段定义（Discovery → Proposal → Negotiation → Closing）。它不适合事务型电商、零售或高速自助型 funnel——这些场景阶段定义没意义，或概率模型无关。它还假设销售会如实更新阶段数据——如果你的 CRM 里塞满"卡在 Closing 80% 三个月"的僵尸交易，加权数会虚高。请在相信结果前先做一次管道卫生清理，并且公式默认同一阶段内合同金额均匀分布（同一 Discovery 阶段的真实合同规模分布差异会被掩盖）。

## 案例走读

一位 B2B SaaS 创始人从 Salesforce 拉出以下管道快照：10 笔 Discovery 平均 $15K，5 笔 Proposal $25K，3 笔 Negotiation $35K，2 笔 Closing $45K：

1. `Discovery`    = 10 × $15,000 × 20% = **$30,000**
2. `Proposal`     = 5 × $25,000 × 40% = **$50,000**
3. `Negotiation`  = 3 × $35,000 × 60% = **$63,000**
4. `Closing`      = 2 × $45,000 × 80% = **$72,000**
5. `加权管道`      = 30,000 + 50,000 + 63,000 + 72,000 = **$215,000**
6. `名义管道`      = 150,000 + 125,000 + 105,000 + 90,000 = **$470,000**
7. `加权预测`      = 215,000 × 50% = **$107,500**（50% 信心、可直接上董事会的预测）

搭配**销售速率计算器**一起看，可识别弱营收到底是管道填充问题（看管道覆盖率）还是转化问题（看赢率分阶段）。