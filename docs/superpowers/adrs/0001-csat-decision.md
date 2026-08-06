---
adr_id: 0001
title: "CSAT Calculator — 从'数字'升级为'客户是否值得留'决策支持"
status: Accepted
date: 2026-08-06
authors: [Phase 1 KB4 ADR scaffold]
related_calc: solopreneur-csat-calculator
---

# ADR-0001: CSAT Calculator Decision Support Upgrade

## Status
Accepted

## Context
v1 CSAT 计算器只输出"CSAT 84%"这个数字 + 95% CI + 健康带（🟢/🟡/🟠/🔴）。用户看到数字后**仍然不知道**：
- "我的客户到底是不是值得长期留？"
- "如果 CSAT 在健康带但收入掉，怎么办？"
- "响应率 18% < 20% 警告 = 我的样本就是有偏的，那 84% 还成立吗？"

## Decision
在 CSAT 计算器 generate() 末尾追加 🧭 **Decision Recommendation** section（4 子段固定标签），把"数字"升级为"决策建议"：

### Decision Recommendation（v2.0 L5）

- **Decision Question**: 客户的真实满意度足够支撑 NRR ≥ 110%（健康扩张）吗？还是表面好看实际是低响应样本假象？
- **Recommendation**: 看 2 个数：(1) **响应率 ≥ 30%** 才信 CSAT 数字；(2) **目标 gap ≤ 0pp** + **过去 3 月趋势 ≤ -2pp** 才算稳定。任一不满足 → 不应基于 CSAT 单独决策，需结合 [NRR Calculator] / [Churn Rate Calculator] 验证。
- **Key Uncertainty**: 响应率 < 20% = 严重有偏样本（只有最满意/最愤怒的人回），84% 实际可能是 70-90% 真值；CSAT 是滞后指标（看上一季度体验），不代表未来留存。
- **Next Action**: 立刻检查 (a) 上月响应率 ≥ 30% 吗？(b) 目标 gap 是多少？(c) 最近 3 月 NRR 趋势是否扩张？任一不通过 → 不扩大 ARR 投入，先做留存。

## Alternatives Considered
- **A**: 不加 Decision Recommendation，保持 v1 数字输出 — 用户继续只看到数字，不解决"是否值得留"的决策痛点
- **B**: 加简单的"建议"段（如"CSAT 不错，继续保持"）— 没回答"用户视角 5 问"中"决策建议 vs 数字"的差异，沦为模板
- **C**: ✅ 加 4 子段 Decision Recommendation —— 强迫每段都对齐 v2.0 灵魂（决策问题/建议/不确定性/下一步）

## Consequences
- ✅ 用户看完 CSAT = 直接得到"该不该留"的判断 + 下一步行动
- ✅ 与 v3 standard 兼容（6+ emoji section → 7+）
- ⚠️ 计算器变长 ~30 行；如用户只想看数字，可折叠（Phase 5 再做）

## Compliance
- [x] 与 P44 ADR Governance 一致
- [x] 含 Decision Recommendation 4 子段
- [x] 编号递增（0001）

---

**Date**: 2026-08-06
**Authors**: [Phase 1 KB4 ADR scaffold]