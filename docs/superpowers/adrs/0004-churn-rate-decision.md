---
adr_id: 0004
title: "Churn Rate Calculator (SaaS) — 从'5%'升级为'流失是否值得救'"
status: Accepted
date: 2026-08-06
authors: [Phase 1 KB4 ADR scaffold]
related_calc: solopreneur-churn-rate-calculator
---

# ADR-0004: Churn Rate Calculator Decision Support Upgrade

## Status
Accepted

## Context
v1 Churn 只输出"月流失 5% / 年化 46% / 🟠"。用户不知道：
- "5% 月流失看起来还行，但年化 46% = 一年掉一半用户 = 不可持续"
- "救 1 个流失客户成本 vs 获新客户成本哪个高？"
- "Logo Churn vs Revenue Churn 哪个更严重？"

## Decision
追加 🧭 Decision Recommendation：

### Decision Recommendation（v2.0 L5）

- **Decision Question**: 月流失 5% 表面"健康"，但年化 46% = **2 年后用户清零**，必须立即判断"救老客"vs"获新客"哪个 ROI 更高。
- **Recommendation**: (1) **月流失 ≤ 3%** 才算健康（月年化 < 30%）；5% 已经在烧底；(2) 救流失客户成本 ≤ 3 × CAC 才值得救（否则让流失）；(3) Logo Churn + Revenue Churn **同时**下降才有效，单一改善是 "low-value 用户流失"。
- **Key Uncertainty**: (1) 5% 是 cohort 还是 aggregate？cohort 月流失 vs aggregate 流量混合 = 不同故事；(2) 是否区分主动流失（cancel）和被动流失（payment fail）？payment fail 大概率能救，cancel 大概率救不了。
- **Next Action**: (a) 拆 logo churn + revenue churn 两条线；(b) 算 cohort 月流失；(c) 区分主动 vs 被动流失，**先打 payment fail 自动 retry**（低投入高回收）；(d) 月流失 > 5% → 暂停所有获客预算，把预算移到 [Customer Success] 留存。

## Alternatives Considered
- **A**: 不动 — 5% 月流失被误读为"健康"
- **B**: 只算 logo churn — 漏掉 revenue churn 严重的高客单流失
- **C**: ✅ 4 子段 + 救 vs 获的 ROI 对比

## Consequences
- ✅ 用户 = "该不该救/该不该暂停获客"清楚
- ⚠️ "cohort vs aggregate" 需 UX 提示（Phase 2）

## Compliance
- [x] P44 兼容
- [x] 4 子段
- [x] 编号 0004