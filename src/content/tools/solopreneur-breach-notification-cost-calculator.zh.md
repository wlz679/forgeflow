---
engine_ref: 'solopreneur-breach-notification-cost-calculator'
category_id: 'L'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-08-03'
sources:
  - name: 'GDPR Article 33 — Notification of a personal data breach to the supervisory authority'
    url: 'https://gdpr-info.eu/art-33-gdpr/'
  - name: 'GDPR Article 34 — Communication of a personal data breach to the data subject'
    url: 'https://gdpr-info.eu/art-34-gdpr/'
  - name: 'ICO — Personal data breaches: a guide for organisations'
    url: 'https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/personal-data-breaches/'
  - name: 'ENISA Threat Landscape 2024 (mid-market incident benchmarks)'
    url: 'https://www.enisa.europa.eu/publications/enisa-threat-landscape-2024'
---

## 这个计算器衡量什么

依据通用数据保护条例第 33 条，控制者须在意识到个人数据违规后 72 小时内通知监管机构。依据第 34 条，若违规可能对数据主体权利造成高风险，须「毫不迟延」地通知数据主体。本计算器量化违规通知与修复的年度化成本——涵盖每主体通知（信件、电邮、呼叫中心、信用监控）以及每次违规修复（取证、法律顾问、监管对接、系统加固）。它是 DPO、CISO、风险负责人的隐私事件敞口指标，面向中型 B2B SaaS。

## 计算方法

```
notification_cost_per_breach = data_subjects_per_breach × notification_cost_per_subject
cost_per_breach             = notification_cost_per_breach + remediation_cost_per_breach
annual_breach_cost          = breaches_per_year × cost_per_breach
```

| 变量                            | 含义                                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| `breaches_per_year`             | 年度应报告违规次数（GDPR 第 4(12) 条；ENISA 2024：中型 SaaS 0.5-2 次）              |
| `data_subjects_per_breach`      | 单次违规平均受影响数据主体数                                                       |
| `notification_cost_per_subject` | 信件、电邮、呼叫中心、信用监控（ICO 2024：B2C £2-£8/主体；B2B €1-€3）               |
| `remediation_cost_per_breach`   | 取证、法律、监管对接、加固（ENISA 2024：中型市场 €50K-€200K）                       |

阈值：🟢 Excellent <€50K/年 · 🟡 Good €50-250K · 🟠 Warning €250K-1M · 🔴 Critical ≥€1M。

## 局限性 / 何时不适用

通知成本因司法管辖区与受众而异：B2C 邮寄活动 €5-€10/主体，而 B2B 整合企业合同 €1-€3/主体——需根据受影响人群调整输入。修复成本高度尾部驱动：单次勒索软件恢复可超 €500K，因此年度平均值会显著低估最坏情况。模型不包含独立的 GDPR 第 83 条罚款（搭配 L-1 GDPR 罚款风险可得真实单事件成本），也不包括违规发生到察觉之间的检测延迟——72 小时时钟自察觉起算，而非自发生起算。

## 案例走读

一家中型 SaaS：1 次违规/年，50,000 主体受影响，€5/主体通知成本，€80,000/次违规修复：

1. `notification_cost_per_breach` = 50,000 × €5 = **€250,000**
2. `cost_per_breach` = €250,000 + €80,000 = **€330,000**
3. `annual_breach_cost` = 1 × €330,000 = **€330,000 → 🟠 Warning**
4. 若违规频率降至 0.3/年（10 年 3 次），年度成本降至 **€99,000（🟡 Good）**——通过 MFA、EDR、桌面演练等控制投入即可实现 70% 削减。

要达到 🟢 Excellent（<€50K），单靠减少主体数不可行，因为修复成本（€80K）已超过阈值——更可行路径是降低违规频率。搭配 L-1 GDPR 罚款计算器——单次违规可能耗尽全年违规预算；再搭配 R-1 NRR 计算器，因为违规披露通常导致其后 12 个月 NRR 下降 5-10pp。
