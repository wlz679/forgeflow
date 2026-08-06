---
adr_id: 0003
title: "CAC Calculator — 从'$45'升级为'获客是否值得'"
status: Accepted
date: 2026-08-06
authors: [Phase 1 KB4 ADR scaffold]
related_calc: solopreneur-cac-calculator
---

# ADR-0003: CAC Calculator Decision Support Upgrade

## Status
Accepted

## Context
v1 CAC 只输出"$45 / 🟢 健康"。用户不知道：
- "$45 vs 什么算值得？我的客单价 $50，留 3 个月就回本？"
- "$45 是 mix CAC，可能 LinkedIn $500 / SEO $50 — 加预算前先看渠道"
- "LTV:CAC < 3 还在投 = 烧钱；LTV:CAC > 5 = 应该加预算"

## Decision
追加 🧭 Decision Recommendation：

### Decision Recommendation（v2.0 L5）

- **Decision Question**: $45 CAC 单独看意义不大；**LTV:CAC 比例 + 渠道 breakdown** 才是决定"获客是否值得"的依据。
- **Recommendation**: 必须满足 (1) **LTV:CAC ≥ 3.0**（回本周期 ≤ 12 月）+ (2) **Payback ≤ 12 月**；(3) 拆分后最差渠道 LTV:CAC ≥ 2.0 才算"值得"。LTV:CAC < 2 = 烧钱停投；2-3 = 谨慎优化；3-5 = 健康扩量；> 5 = 抢占窗口期大幅加预算。
- **Key Uncertainty**: (1) CAC 是 mix 还是单一渠道？mix 算的 $45 掩盖了 LinkedIn $500 这种坏渠道；(2) LTV 用的是历史 12 月还是预测 24 月？历史 < 预测 = 高估健康度。
- **Next Action**: (a) 算 LTV:CAC 真实比例（用 [LTV Calculator]）；(b) 按 channel 拆 CAC；(c) 砍掉 LTV:CAC < 2 的渠道，把预算移到 ≥ 5 的渠道。

## Alternatives Considered
- **A**: 不动 — 用户看 $45 误以为健康
- **B**: 让用户自己填 LTV 才能算 LTV:CAC — 增加输入门槛
- **C**: ✅ Decision Recommendation 给判断阈值 + Next Action 引导用户跳 [LTV Calculator]

## Consequences
- ✅ 用户 = "该投/该砍"清楚
- ⚠️ 必须依赖 [LTV Calculator] 联动 — Phase 4 主题簇方法论实现 cross-link

## Compliance
- [x] P44 兼容
- [x] 4 子段
- [x] 编号 0003