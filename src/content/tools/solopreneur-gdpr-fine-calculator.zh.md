---
engine_ref: 'solopreneur-gdpr-fine-calculator'
category_id: 'L'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-08-03'
sources:
  - name: 'GDPR Article 83 — Administrative fines (official consolidated text)'
    url: 'https://gdpr-info.eu/art-83-gdpr/'
  - name: 'ICO Guide to GDPR — Fines and penalties'
    url: 'https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/'
  - name: 'IAPP Privacy Enforcement Atlas 2024'
    url: 'https://iapp.org/resources/article/privacy-enforcement-atlas/'
  - name: 'European Data Protection Board (EDPB) — Guidelines 04/2022 on the calculation of administrative fines'
    url: 'https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-042022-calculation-administrative-fines_en'
---

## 这个计算器衡量什么

通用数据保护条例（GDPR）第 83 条规定，行政处罚上限为 2,000 万欧元或全球年营业额 4% 中的较高者（实质性违规，第 83(5) 条），以及 1,000 万欧元 / 2% 营业额（程序性违规，第 83(4) 条）。本计算器基于你的行业风险画像与历史违规率，量化年度化的 GDPR 罚款敞口。它是 DPO / 隐私负责人预算中的尾部风险规划指标——实际罚款金额受案件具体因素影响（ICO 2024 指南、EDPB 04/2022 罚款计算指南），但模型给出可防御的敞口区间，帮助你规划储备金、网络保险额度与整改投入。

## 计算方法

```
max_fine         = annual_revenue_global × (max_fine_pct / 100)
per_violation    = max_fine × industry_risk_multiplier
annual_exposure  = per_violation × violations_per_year
exposure_ratio   = annual_exposure / annual_revenue_global
```

| 变量                       | 含义                                                                       |
| -------------------------- | -------------------------------------------------------------------------- |
| `annual_revenue_global`    | GDPR 相关收入（欧盟 + 面向欧盟的非欧盟公司收入，按第 4(16) 条）           |
| `max_fine_pct`             | 4%（第 83(5) 条 实质性）· 2%（第 83(4) 条 程序性）· 1%（混合）· 0.5%（轻） |
| `violations_per_year`      | 过去 12 个月应报告事件（事件登记册或 IAPP 2024 基准 0.5-2 次）             |
| `industry_risk_multiplier` | SaaS 0.8× · FinTech 1.0× · HealthTech 1.4× · AdTech 1.6×                    |
| `exposure_ratio`           | 年度化敞口占全球收入比                                                     |

阈值：🟢 Excellent <0.25% · 🟡 Good 0.25-1% · 🟠 Warning 1-2% · 🔴 Critical ≥2%。

## 局限性 / 何时不适用

上限是天花板，不是预测——实际罚款受违规严重程度、主观意图、缓解措施与配合度影响（IAPP 2024 强制力地图：中位实际罚款为上限的 0.5-1%，Meta 等极端案例达全球收入的 1-2%）。第 83(4) 条针对程序性违规（DPO 未指定、安全措施不足、违规通知延迟），上限 10M EUR / 2% 收入；第 83(5) 条针对实质性违规（合法性基础缺失、跨境传输违规、数据主体权利受限），上限 20M EUR / 4% 收入——Meta 2023 年 12 亿欧元罚单（DPC 爱尔兰，跨大西洋传输）和 Amazon 2021 年 7.46 亿欧元（CNIL 法国，cookie 广告追踪）均为 83(5) 等级典型（EDPB 罚款追踪记录）。模型以欧盟为锚定；CCPA（按次 $2,500-$7,500，无收入上限）、LGPD、PIPL 敞口画像不同，需分别建模。行业乘数是基于历史案件均值的规划启发式，不是案件特定预测——监管机构依第 83(2) 条保留完全自由裁量权：CNIL 罚款频率最高（年 50+ 起处罚），BfDI 集中大型跨国企业，Garante 偏重未成年保护与生物识别场景。

## 案例走读

一家中型 B2B SaaS 全球收入 €25M，年应报告违规 2 次，适用 4% 第 83(5) 条上限，SaaS 0.8× 风险画像：

1. `max_fine` = €25,000,000 × 4% = **€1,000,000**
2. `per_violation` = €1,000,000 × 0.8 = **€800,000**
3. `annual_exposure` = €800,000 × 2 = **€1,600,000**
4. `exposure_ratio` = €1,600,000 / €25,000,000 = **6.40% → 🔴 Critical**

若违规等级降至 2%（仅程序性违规，第 83(4) 条），年度敞口降至 €800,000（3.20% — 🟠 Warning）。要达到 🟢 Excellent（<0.25%），计算器会显示违规次数减少或等级下调的组合路径。搭配 L-5 数据违规通知计算器——单次违规可能耗尽全年违规预算；再搭配 R-1 NRR 计算器，因为罚款新闻通常与客户流失叠加。
