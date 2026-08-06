---
adr_id: 0002
title: "ROAS Calculator — 从'3.2x'升级为'广告是否值得投入'"
status: Accepted
date: 2026-08-06
authors: [Phase 1 KB4 ADR scaffold]
related_calc: solopreneur-roas-calculator
---

# ADR-0002: ROAS Calculator Decision Support Upgrade

## Status
Accepted

## Context
v1 ROAS 只输出"ROAS 3.2x / 健康带 🟡"。用户看到 3.2x 仍然不知道：
- "我的 Gross Margin 多少？扣掉成本后还赚吗？"
- "3.2x 是行业基准，但我的 CAC $45 + LTV $80 才决定能不能扩量"
- "广告停了，收入归零的风险 vs 持续亏损的风险哪个大？"

## Decision
追加 🧭 Decision Recommendation：

### Decision Recommendation（v2.0 L5）

- **Decision Question**: 3.2x ROAS 看起来"还行"，但扣除 Gross Margin + CAC + 退货率后**真正值不值得继续投放**？
- **Recommendation**: 必须满足 3 个条件才算"值得投"：(1) **Net ROAS ≥ 1.0x**（扣毛利后不亏）；(2) **CAC ≤ LTV × 0.33**；(3) **90 天 cohort LTV/CAC ≥ 3.0**。任一不满足 → 不扩量，先优化 ROAS 到 4.0x 再投；3 个都满足 → 加预算 25-50% 抢占市场窗口期。
- **Key Uncertainty**: 3.2x 是 28d click attribution，但高客单产品 90d 才回本（lead gen / B2B SaaS 90d attribution 默认）；28d 测出 3.2x ≠ 真值；attribution window 选错 = 决策错。
- **Next Action**: 立刻检查 (a) Gross Margin 是多少？(b) 切到 90d attribution 后 ROAS 多少？(c) 90d cohort LTV/CAC 是多少？任一不达标 → 不加预算。

## Alternatives Considered
- **A**: 不动 — 用户继续看 3.2x 不知道是否值得投
- **B**: 加"Net ROAS"工具而不动现有 — 双工具用户混淆，违背 v3 standard 单一 calc 升级原则
- **C**: ✅ 加 Decision Recommendation 4 子段，把 3 个判断条件塞进 Recommendation

## Consequences
- ✅ 用户看完 = 知道该不该加预算
- ✅ 与 v3 兼容
- ⚠️ "3 个条件"逻辑复杂 → Recommendation 句长 ~30 字，UX 需注意（Phase 2 UI polish）

## Compliance
- [x] P44 兼容
- [x] 4 子段
- [x] 编号 0002