---
slug: 'solopreneur-remote-vs-office-calculator-zh'
engine_ref: 'solopreneur-remote-vs-office-calculator'
category_id: 'E'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-08-03'
sources:
  - name: 'Stanford Study on Remote Work — Bloom (2015, updated 2023)'
    url: 'https://wfhresearch.com/research/'
  - name: 'BLS Employer Costs for Employee Compensation (ECEC) 2026'
    url: 'https://www.bls.gov/news.release/ecec.toc.htm'
  - name: 'Harvard Business Review — The Future of Hybrid Work'
    url: 'https://hbr.org/topic/subject/hybrid-work'
---

## 这个计算器衡量什么

办公租金随不动产线性增长，远程津贴随 headcount 线性增长 —— 拐点
落在 20 到 50 人之间。本工具把**纯远程 / 纯办公室 / 50/50 混合**的
真实年度成本拆开，纳入一次性 setup、叠加**生产力调整系数**，呈现
真实单位工作成本。可在续租谈判、起草回办公室政策、为 headcount
扩张建模时使用。

## 计算方法

我们使用的 v3 标准公式集：

```
officeCost(headcount, salary, officeOH, setup) =
    headcount × (salary + 12 × officeOH) + headcount × setup

remoteCost(headcount, salary, stip, setup) =
    headcount × (salary + 12 × stip) + headcount × setup

hybridCost(...) =
    headcount × (salary + 12 × (0.5×officeOH + 0.5×stip)) + headcount × setup

productivityAdjusted = remoteCost / (1 + productivityDelta / 100)
perPersonSavings    = 12 × (officeOH − stip)
```

| 变量                | 含义                                              |
| ------------------- | ------------------------------------------------- |
| `headcount`         | 团队总人数（FTE 等价）                            |
| `avgSalary`         | loaded 年度基础工资，fully-loaded 口径            |
| `officeOH`          | 租金 + 水电 + 保洁，按人每月                      |
| `stip`              | 远程津贴：网络 + 联合办公 + 话费                  |
| `setup`             | 一次性：笔电 + 显示器 + 外设（第 1 年）           |
| `productivityDelta` | 远程 vs 办公室产出变化百分比（±20%）              |
| `perPersonSavings`  | 12 × (office overhead − stipend) — 单人盈亏平衡   |

办公 overhead 因城市差异巨大：中小城市 $500-$1,000/mo（塔尔萨、印
第安娜波利斯），中等城市 $1,500-$2,500（奥斯汀、丹佛），一线城市
$2,500-$4,000（旧金山、纽约）。Atlassian State of Teams 2024 的
1.5× 上下文切换惩罚**未直接嵌入**；改由 productivity delta 输入
捕获，便于按具体场景取数。

## 局限性 / 何时不适用

模型**未计入**租约解约费（通常剩余 3-6 个月租金）、办公家具清仓损失、
跨境转 EOR 合约的合规与税务成本 —— 这些一次性转型开销通常 50 人团队
$100K-$500K，应单独预算。productivity delta 是单一全局数字；实际
上按角色差异很大（初级 -10%、资深 +5%）、按 tenure、按协作强度变化。
<5 人团队节省金额太小可忽略；>100 人团队文化和招聘数学压倒不动产数学，
本工具决策价值下降。

## 案例走读

假设 10 人团队、平均年薪 $80K、办公 overhead $1,500/人/月、远程
津贴 $500/人/月、一次性 setup $3,000：

1. `officeCost` = 10 × ($80K + 12 × $1,500) + 10 × $3,000
   = **$1,010,000/年**（人均 $101K）。
2. `remoteCost` = 10 × ($80K + 12 × $500) + 10 × $3,000
   = **$890,000/年**（人均 $89K）。
3. `hybridCost` = **$950,000/年**（50/50 混合）。
4. 转远程**年节省** = **$120,000/年**（人均 $12K × 10）。
5. **3 年 TCO** = 办公 $3,030,000 vs 远程 $2,670,000
   （**省 $360K**）。
6. productivity delta 0% 下，决策健康 = **STRONG** —— 远程省钱
   且产出中性。

工具 What-If 段模拟：hot-desking 减 30% 办公面积（省 $54K）、津贴
上调至 $1,000（+ $60K）、每周 2 天回办公室混合（+ $48K vs 全远程）、
再多招 5 人（每 5 人省 $60K）。搭配 **Meeting Cost Calculator**
建模混合排班对会议 overhead 的影响。