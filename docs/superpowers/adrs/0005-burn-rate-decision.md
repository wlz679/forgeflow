---
adr_id: 0005
title: "Burn Rate Calculator — 从'8 月 runway'升级为'赛道是否值得做'"
status: Accepted
date: 2026-08-06
authors: [Phase 1 KB4 ADR scaffold]
related_calc: solopreneur-burn-rate-calculator
---

# ADR-0005: Burn Rate Calculator Decision Support Upgrade

## Status
Accepted

## Context
v1 Burn Rate 只输出"还能坚持 8 月 / Net Burn $20k/月"。用户不知道：
- "8 月 runway 够吗？下一轮融资要多久？"
- "烧钱率下降 = 真实信号还是砍未来增长换来的？"
- "Default Alive（cash-flow positive）vs Default Dead 是分水岭"
- "赛道本身值不值得做？8 月 runway 是用在好赛道还是死赛道？"

## Decision
追加 🧭 Decision Recommendation：

### Decision Recommendation（v2.0 L5）

- **Decision Question**: 8 月 runway 不是答案，**核心问题是"赛道值不值得做 + 当前现金消耗速度是否匹配融资节奏"**。Default Alive（cash > 18 月 runway）= 应该扩量抢市场；Default Dead（< 12 月）= 必须立刻做融资决策。
- **Recommendation**: (1) **runway < 6 月** → 立刻融 / 找桥 / 砍预算三选一（融资窗口期 3-6 月，越拖越被动）；(2) **6-12 月** → 启动 Series A / Pre-A 流程 + 控制 burn multiple < 1.5x；(3) **12-18 月** → 优化 burn multiple < 1.0x（资本效率）；(4) **> 18 月 Default Alive** → 加预算抢市场（burn multiple < 0.5x 是 best-in-class）。**赛道判断**：burn multiple > 2x 持续 6 月 = 死赛道，再融也是烧钱。
- **Key Uncertainty**: (1) 现金数字 = 当前银行余额 vs 含承诺但未到账（前者是真值）；(2) Net Burn 是否扣除一次性大额（如设备 / 罚款）；(3) 收入增速是否可持续（v1 没看 growth rate）。
- **Next Action**: (a) 跑 [MRR Growth Rate Calculator] 看趋势；(b) 算 burn multiple（Net Burn / Net New ARR）= 决定赛道；(c) runway < 12 月 → 不优化产品，先做融资材料；(d) runway > 18 月 + burn multiple < 1.0 → 立刻加 30-50% 预算抢市场窗口期。

## Alternatives Considered
- **A**: 不动 — 8 月 = "还行"被误读
- **B**: 加 "Default Alive/Dead" 二元提示 — 不回答赛道问题
- **C**: ✅ 4 子段 + 赛道 vs cash 两条线判断

## Consequences
- ✅ 用户 = 知道"该不该融/该不该砍/该不该加"
- ✅ 与 [MRR Growth Rate] 联动，主题簇方法论 Phase 4 铺垫
- ⚠️ "赛道判断" = 主观但必要（Phase 5 + AI Agent 补全）

## Compliance
- [x] P44 兼容
- [x] 4 子段
- [x] 编号 0005

---

**Date**: 2026-08-06
**Authors**: [Phase 1 KB4 ADR scaffold]