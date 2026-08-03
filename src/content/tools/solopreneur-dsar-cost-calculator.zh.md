---
engine_ref: 'solopreneur-dsar-cost-calculator'
category_id: 'L'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-08-03'
sources:
  - name: 'GDPR Article 15 — Right of access by the data subject (official consolidated text)'
    url: 'https://gdpr-info.eu/art-15-gdpr/'
  - name: 'ICO — Right of access (detailed guidance for organisations)'
    url: 'https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/individual-rights/right-of-access/'
  - name: 'IAPP 2024 Privacy Operations Survey'
    url: 'https://iapp.org/news/a/2024-privacy-operations-survey/'
  - name: 'OneTrust — DSAR Automation product page (uplift benchmarks)'
    url: 'https://www.onetrust.com/products/dsar-automation/'
---

## 这个计算器衡量什么

依据通用数据保护条例第 15 条，数据主体访问请求（DSAR）是固定的运营成本：每个欧盟数据主体都可要求查阅其个人数据、获取副本、要求更正或删除。本计算器基于月请求量、每单人工小时、DPO 小时费率、当前自动化水平，量化 DSAR 履行的年度化人力成本。它是 DPO 与隐私负责人的运行率预算指标，面向中型 B2B SaaS——IAPP 2024 隐私运营调查显示典型请求量为每月 30-100 件。

## 计算方法

```
manual_hours_per_dsar = hours_per_dsar × (1 - automation_pct / 100)
cost_per_dsar         = manual_hours_per_dsar × hourly_rate_dpo
annual_cost           = dsars_per_month × 12 × manual_hours_per_dsar × hourly_rate_dpo
```

| 变量                  | 含义                                                                        |
| --------------------- | --------------------------------------------------------------------------- |
| `dsars_per_month`     | 月均 DSAR 数量（隐私工单系统；IAPP 2024：中型市场 30-100）                  |
| `hours_per_dsar`      | 每单平均人工小时——搜索 + 脱敏 + 回复（ICO：基线 2-4 小时）                  |
| `hourly_rate_dpo`     | 全成本 DPO 费率（欧盟中型市场：€80-€150/小时，含福利与开销）                |
| `automation_pct`      | 工具处理的工单比例（OneTrust 2024：30-60% 现实区间；0% = 纯人工）            |

阈值：🟢 Excellent <€25K/年 · 🟡 Good €25-100K · 🟠 Warning €100-300K · 🔴 Critical ≥€300K。

## 局限性 / 何时不适用

模型不含非人力成本：脱敏工具订阅、安全文件传输基础设施、培训开销均未计入。DSAR 量可能急剧波动——CMP 上线后、违规事件披露后、监管行动后，季度内月请求量可能翻倍或三倍，因此实际年度成本可能显著高于稳态估计。自动化百分比由企业自报，往往偏乐观：纸面 30% 在实践中常等于 10-15%，将节省额写入预算前建议打 0.7-0.8× 折扣。

## 案例走读

一家中型 B2B SaaS：50 件 DSAR/月，2.5 小时/件，€95/小时 DPO 费率，30% 自动化：

1. `manual_hours_per_dsar` = 2.5 × (1 - 0.30) = **1.75 小时**
2. `cost_per_dsar` = 1.75 × €95 = **€166**
3. `annual_cost` = 50 × 12 × 1.75 × €95 = **€99,750 → 🟡 Good**
4. 若自动化提升至 60%（模板回复 + 自动发现），人工小时降至 1.00，年度成本降至 **€57,000（🟡 Good，下档）**
5. 要达到 🟢 Excellent（<€25K），自动化需达到约 82%，或 DSAR 量降至 ≤13 件/月。

搭配 L-6 CMP ROI 计算器——CMP 通过同意日志将 DSAR 量降低 30-50%；再搭配 Cost-per-Ticket 计算器以规划整体隐私运营预算。
