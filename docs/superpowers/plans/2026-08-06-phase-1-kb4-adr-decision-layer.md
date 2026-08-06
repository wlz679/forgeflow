# Phase 1 — KB4 ADR 模板 + 5 决策工具补"决策支持层" 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地 P140f §4.1 Phase 1 —— 建立 KB4 ADR 模板（与 P44 兼容），给 5 个示范工具（csat / roas / cac / churn-rate / burn-rate）补 🧭 **Decision Recommendation** section（v2.0 L5 辅助决策灵魂 + User-Centric Advisor 第二维度），新增 CI guard 守住 decision layer 不回流。

**Architecture:**

- **KB4 ADR 模板**：6 段（Status / Context / Decision / Decision Recommendation / Alternatives / Consequences）+ Compliance/P44 兼容；首批 5 个 ADR（0001-0005）各对应一个工具决策升级；每个 ADR = 5 calc 的"为什么这样决策"决策档案
- **Decision Recommendation section**（🧭）：插入每个工具 `generate()` 末尾（在 💡 Tip 之后），4 子段固定标签：
  - `🧭 Decision Question` —— 一句话把"用户在纠结什么"摆出来（用户视角）
  - `🧭 Recommendation` —— 2-3 句给出"该不该做"的判断（含数字）
  - `🧭 Key Uncertainty` —— 1-2 个"最可能让判断错"的因素 + 怎么验证
  - `🧭 Next Action` —— 用户**下一步具体做什么**（按钮级）
- **CI guard 新建** `tests/decision-layer-coverage-guard.test.ts`：source-level 检查 5 calc 文件含 "🧭 Decision Question" / "🧭 Recommendation" / "🧭 Key Uncertainty" / "🧭 Next Action" 四个标签字面量；follow P23b `RUN_BUILD_TESTS=1` skip-guard pattern
- **不破坏 v3**：6+ emoji sections（追加 1 段变成 7+），不动现有 P138 BIZ_CONFIG_MAP / P10 v3 standard

**Tech Stack:** Astro 4.16.19 (static)、TypeScript 5.6、node:test CI guard、`RUN_BUILD_TESTS=1` build-dep gate、`scripts/codegen-examples.mjs --check`（CLAUDE.md 红线）。

---

## Global Constraints

| 约束                                                                 | 值                                                                                                                  |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 引擎总数锁定                                                        | 100（CLAUDE.md + `tests/lib/engine-count.ts:EXPECTED_ENGINE_COUNT`，P22b）                                          |
| 引擎 slug 模式                                                      | `^solopreneur-[a-z0-9-]+$`（CLAUDE.md + 5 个示范工具实际：csat/roas/cac/churn-rate/burn-rate 均为 solopreneur 前缀） |
| 分类字母                                                            | 15 个（A/B/C/D/E/F/H/K/L/M/O/P/R/S/T，CLAUDE.md）                                                                   |
| pnpm check 必须过                                                    | `pnpm check`（typecheck + test:run）零错误才能 commit（CLAUDE.md 红线 7）                                           |
| Pre-commit hook                                                     | `codegen-examples.mjs --check` 自动跑，启一次 `git config core.hooksPath .githooks`（CLAUDE.md）                     |
| Pre-push hook bypass                                                | `git -c core.hooksPath=/dev/null push`（P44 记忆——避免 hook false-negative ahead=0）                               |
| 3-way push 流程                                                     | origin (Gitee wlz679/calcKit) + github (ForgeFlowKit wlz679/forgeflow)（CLAUDE.md + memory github-repo-info）        |
| Build-dep gate                                                      | `RUN_BUILD_TESTS=1`（P23b + P24，CI 全跑；本地可选）                                                                 |
| 守卫脚本格式                                                        | `#!/usr/bin/env node` + `node:test`（P22b ESM trap 教训）                                                            |
| 注释风格                                                            | 末尾 `// P140f-N:` 编号注释（参考 P83 / P138 / P55b 风格）                                                            |
| Spec 兼容                                                            | 与 P44 ADR Governance 完全兼容（KB4 模板补全 = P44 进阶版）                                                            |
| v3 standard 不破坏                                                  | 6+ emoji sections 保留；新增 🧭 = 第 7 段；不改 P138 BIZ_CONFIG_MAP                                                   |
| 灵魂约束                                                            | 5 calc 必须能回答 v2.0 双维度：Decision Support（决策支持）+ User-Centric Advisor（用户视角 5 问）                   |
| i18n                                                                | ADR 用英文写；5 calc 输出 en/zh 各一份（codegen-examples 双语言 re-gen）                                             |

---

## File Structure（计划落盘的所有文件 + 职责）

| 文件                                                            | 状态         | 职责                                                                                                          |
| --------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------- |
| `docs/superpowers/adrs/0000-template.md`                        | 新建         | KB4 ADR 模板（6 段：Status/Context/Decision/Decision Recommendation/Alternatives/Consequences）                |
| `docs/superpowers/adrs/0001-csat-decision.md`                   | 新建         | CSAT 决策升级 ADR：84% CSAT → "客户是否值得留" 决策档案                                                        |
| `docs/superpowers/adrs/0002-roas-decision.md`                   | 新建         | ROAS 决策升级 ADR：3.2x → "广告是否值得投入"                                                                   |
| `docs/superpowers/adrs/0003-cac-decision.md`                    | 新建         | CAC 决策升级 ADR：$45 → "获客是否值得"                                                                         |
| `docs/superpowers/adrs/0004-churn-rate-decision.md`             | 新建         | Churn 决策升级 ADR：5% → "客户流失是否值得救"                                                                  |
| `docs/superpowers/adrs/0005-burn-rate-decision.md`              | 新建         | Burn 决策升级 ADR：8 月 runway → "赛道是否值得做"                                                              |
| `src/engines/customer-support/csat-calculator.ts`               | Modify       | generate() 末尾追加 🧭 Decision Recommendation 4 子段；customFn 同步；codegen-examples re-gen                  |
| `src/engines/marketing/roas-calculator.ts`                      | Modify       | 同上                                                                                                          |
| `src/engines/valuation/cac-calculator.ts`                       | Modify       | 同上                                                                                                          |
| `src/engines/saas/churn-rate-calculator.ts`                     | Modify       | 同上（**注意：src/engines/retention/logo-churn-rate-calculator.ts 不用动**，本任务指 saas/churn-rate）         |
| `src/engines/saas/burn-rate-calculator.ts`                      | Modify       | 同上                                                                                                          |
| `tests/decision-layer-coverage-guard.test.ts`                  | 新建         | CI guard：5 工具 generate() 产物含 🧭 Decision Question / 🧭 Recommendation / 🧭 Key Uncertainty / 🧭 Next Action 4 标签 |
| `docs/superpowers/INDEX.md`                                     | Modify       | +1 行：phase-1-kb4-adr-decision-layer plan                                                                     |
| `memory/p140f-decision-support-system.md`                       | Modify       | Phase 切换执行历史 + Phase 1 ship 记录；spec 关联                                                              |

---

## Task 拆分（机械 / 集成分类 + review depth）

| Task | 类型     | 文件数 | review 深度 | 说明                                                                       |
| ---- | -------- | ------ | ----------- | -------------------------------------------------------------------------- |
| T1   | MECHANICAL | 1    | 1 impl + 1 spec | ADR 模板：照 spec §4.1 写模板即可，低风险                                     |
| T2   | INTEGRATION | 5  | 1 impl + 1 spec + 1 quality | 5 个 ADR 文档：每个 ADR = 工具决策档案，需跨文件一致性                       |
| T3   | INTEGRATION | 1   | 1 impl + 1 spec + 1 quality | CSAT calc 加 🧭 段：触及 generate/customFn 双链路，codegen 重生成            |
| T4   | INTEGRATION | 1   | 1 impl + 1 spec + 1 quality | ROAS calc 加 🧭 段：同上结构                                                |
| T5   | INTEGRATION | 1   | 1 impl + 1 spec + 1 quality | CAC calc 加 🧭 段：同上结构                                                  |
| T6   | INTEGRATION | 1   | 1 impl + 1 spec + 1 quality | Churn (saas) calc 加 🧭 段                                                  |
| T7   | INTEGRATION | 1   | 1 impl + 1 spec + 1 quality | Burn-rate calc 加 🧭 段                                                     |
| T8   | MECHANICAL | 1    | 1 impl + 1 spec | Decision Layer CI guard：固定 4 标签字面量检测，无逻辑                      |
| T9   | MECHANICAL | 2    | 1 impl + 1 spec | INDEX + memory 增补 + 3-way push                                             |

**总计**：9 tasks / 14 文件（5 calc + 6 ADR + 1 guard + 2 meta），**5 INTEGRATION × 3 reviews + 4 MECHANICAL × 2 reviews = 23 subagent calls**。

---

### Task 1: KB4 ADR 模板（0000-template.md）

**Files:**
- Create: `docs/superpowers/adrs/0000-template.md`

**Interfaces:**
- 5 个 ADR 文件（Task 2）会用本模板的 6 段结构

**Step 1: 写模板**

```markdown
---
adr_id: 0000
title: "ADR Template — KB4 Decision Support Architecture"
status: Template
date: 2026-08-06
authors: [Phase 1 KB4 ADR scaffold]
---

# ADR-XXXX: <Title>

> **KB4 ADR 模板** — 与 P44 ADR Governance 兼容，补全 v2.0 §4.1 Phase 1 决策治理。

## Status

<Proposed | Accepted | Deprecated | Superseded by ADR-YYYY>

## Context

<什么场景/问题需要做这个决策？背景+约束>

## Decision

<**核心决策**：选择 X 而不是 Y（不超过 5 句话）。包含 v2.0 灵魂对齐说明。

### Decision Recommendation（v2.0 L5 决策支持）

按 v2.0 §0（Decision Support System）灵魂，本决策必须回答用户的"决策问题"，不只是"数据"。

- **Decision Question**: <用户在纠结什么？1 句话>
- **Recommendation**: <该决策意味着用户应该怎么做？2-3 句>
- **Key Uncertainty**: <1-2 个最可能让决策错的关键不确定性 + 怎么验证>
- **Next Action**: <下一步具体做什么 — 按钮级操作>

## Alternatives Considered

<2-3 个备选方案 + 为什么没选>

## Consequences

<选这个决策会带来什么？（正负两面）>

## Compliance

- [ ] 与 P44 ADR Governance 一致（命名/Status 字段）
- [ ] 含 Decision Recommendation 4 子段（v2.0 灵魂约束）
- [ ] 编号递增（0001, 0002, ...）

---

**Date**: YYYY-MM-DD
**Authors**: [name(s)]
```

**Step 2: Commit**

```bash
git add docs/superpowers/adrs/0000-template.md
git commit -m "docs(adr): P140f add KB4 ADR template (0000) - v2.0 §4.1 Phase 1 scaffold"
```

---

### Task 2: 5 个 ADR 文档（0001-0005）

**Files:**
- Create: `docs/superpowers/adrs/0001-csat-decision.md`
- Create: `docs/superpowers/adrs/0002-roas-decision.md`
- Create: `docs/superpowers/adrs/0003-cac-decision.md`
- Create: `docs/superpowers/adrs/0004-churn-rate-decision.md`
- Create: `docs/superpowers/adrs/0005-burn-rate-decision.md`

**Interfaces:**
- 每个 ADR 用 Task 1 的模板结构

**Step 1: 写 0001-csat-decision.md**

```markdown
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
```

**Step 2: 写 0002-roas-decision.md**

```markdown
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
```

**Step 3: 写 0003-cac-decision.md**

```markdown
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
```

**Step 4: 写 0004-churn-rate-decision.md**

```markdown
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
```

**Step 5: 写 0005-burn-rate-decision.md**

```markdown
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
```

**Step 6: Commit**

```bash
git add docs/superpowers/adrs/0001-csat-decision.md \
        docs/superpowers/adrs/0002-roas-decision.md \
        docs/superpowers/adrs/0003-cac-decision.md \
        docs/superpowers/adrs/0004-churn-rate-decision.md \
        docs/superpowers/adrs/0005-burn-rate-decision.md
git commit -m "docs(adr): P140f add 5 KB4 ADRs (0001-0005) - 5 calc decision upgrade archives"
```

---

### Task 3: CSAT calc 加 🧭 Decision Recommendation

**Files:**
- Modify: `src/engines/customer-support/csat-calculator.ts:78-90`（generate 末尾追加 + customFn 同步）

**Interfaces:**
- customFn: 5 段字符串数组最后一段为 🧭 Decision Question / 🧭 Recommendation / 🧭 Key Uncertainty / 🧭 Next Action
- generate(): string[] 同 customFn（按 P138 v3 invariant 对齐）

**Step 1: 读现状**

定位 csat-calculator.ts 现有 generate() 返回数组最后一段（💡 Tip 那段）。

**Step 2: 在 generate() 末尾追加 4 子段**

```ts
// 追加到 return [...] 末尾（在 💡 Tip 行之后）
'\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🧭 Decision Question: 客户真实满意度足够支撑 NRR ≥ 110%（健康扩张）吗？还是表面好看实际是低响应样本假象？\n• 🧭 Recommendation: 看 2 个数：(1) **响应率 ≥ 30%** 才信 CSAT 数字；(2) **目标 gap ≤ 0pp** + **过去 3 月趋势 ≤ -2pp** 才算稳定。任一不满足 → 不应基于 CSAT 单独决策，需结合 NRR / Churn 验证。\n• 🧭 Key Uncertainty: 响应率 < 20% = 严重有偏样本（只有最满意/最愤怒的人回），CSAT 实际可能是 ±10pp 真值；CSAT 是滞后指标（看上一季度体验），不代表未来留存。\n• 🧭 Next Action: 立刻检查 (a) 上月响应率 ≥ 30% 吗？(b) 目标 gap 是多少？(c) 最近 3 月 NRR 趋势是否扩张？任一不通过 → 不扩大 ARR 投入，先做留存。',
```

**Step 3: 同步 customFn**

定位 customFn 字符串末尾（在 `'💡 Tip: Response rate <20%...'` 之后），追加同样的 4 行（注意 customFn 用单引号嵌套 + 字符串拼接）。

**Step 4: 重新生成 staticExamples[0]**

```bash
node scripts/codegen-examples.mjs --slug solopreneur-csat-calculator
```

**Step 5: pnpm check**

```bash
pnpm check
```
Expected: 0 error

**Step 6: Commit**

```bash
git add src/engines/customer-support/csat-calculator.ts
git commit -m "feat(engine): P140f csat-calculator add 🧭 Decision Recommendation (L5 decision support)"
```

---

### Task 4: ROAS calc 加 🧭 Decision Recommendation

**Files:**
- Modify: `src/engines/marketing/roas-calculator.ts`

**Step 1-2: 同样模式追加 4 子段**

内容来自 ADR-0002（Net ROAS ≥ 1.0x / CAC ≤ LTV × 0.33 / cohort LTV/CAC ≥ 3.0）。

**Step 3: customFn 同步**

**Step 4: codegen**

```bash
node scripts/codegen-examples.mjs --slug solopreneur-roas-calculator
```

**Step 5-6: pnpm check + commit**

---

### Task 5: CAC calc 加 🧭 Decision Recommendation

**Files:**
- Modify: `src/engines/valuation/cac-calculator.ts`

**Step 1-2: 追加 4 子段（LTV:CAC ≥ 3.0 / Payback ≤ 12 月 / 渠道拆分）**

**Step 3-6: 同 Task 4**

---

### Task 6: Churn (saas) calc 加 🧭 Decision Recommendation

**Files:**
- Modify: `src/engines/saas/churn-rate-calculator.ts`

> ⚠️ **不要动** `src/engines/retention/logo-churn-rate-calculator.ts`（本任务仅指 saas/churn-rate）

**Step 1-2: 追加 4 子段（月流失 ≤ 3% / 救流失 ≤ 3×CAC / Logo+Revenue 同步下降）**

**Step 3-6: 同 Task 4**

---

### Task 7: Burn-rate calc 加 🧭 Decision Recommendation

**Files:**
- Modify: `src/engines/saas/burn-rate-calculator.ts`

**Step 1-2: 追加 4 子段（runway 6/12/18 月阈值 + burn multiple + 赛道判断）**

**Step 3-6: 同 Task 4**

---

### Task 8: Decision Layer CI Guard

**Files:**
- Create: `tests/decision-layer-coverage-guard.test.ts`

**Interfaces:**
- 校验 5 calc generate() + customFn 都含 4 个 🧭 标签字面量

**Step 1: 写 guard**

```ts
#!/usr/bin/env node
// P140f — CI guard for Decision Layer coverage (source-level invariant).
//
// Why this exists:
//   Phase 1 5 calc 必须含 🧭 Decision Recommendation 4 子段（v2.0 L5 决策支持灵魂）。
//   这是 v2.0 灵魂 first-class 化，任何 calc 回退到只有数字（无决策）必须被检出。
//
// 5 工具：csat / roas / cac / churn-rate (saas) / burn-rate
// 4 标签：Decision Question / Recommendation / Key Uncertainty / Next Action
// Source-level：直接 grep .ts 文件字符串字面量（与 P138 v3-render-coverage-guard 同模式）。
//
// Build dependency: RUN_BUILD_TESTS=1 required (P23b skip-guard pattern).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

const TARGET_CALCS = [
  'src/engines/customer-support/csat-calculator.ts',
  'src/engines/marketing/roas-calculator.ts',
  'src/engines/valuation/cac-calculator.ts',
  'src/engines/saas/churn-rate-calculator.ts',
  'src/engines/saas/burn-rate-calculator.ts',
];

const REQUIRED_TAGS = [
  '🧭 Decision Question',
  '🧭 Recommendation',
  '🧭 Key Uncertainty',
  '🧭 Next Action',
];

test('5 calc 全部含 🧭 Decision Recommendation 4 子段', () => {
  for (const relPath of TARGET_CALCS) {
    const src = readFileSync(resolve(root, relPath), 'utf8');
    for (const tag of REQUIRED_TAGS) {
      assert.ok(
        src.includes(tag),
        `${relPath} 缺失决策标签: "${tag}"`
      );
    }
  }
});

test('guard 元数据正确（5 calc × 4 标签）', () => {
  assert.equal(TARGET_CALCS.length, 5);
  assert.equal(REQUIRED_TAGS.length, 4);
});
```

**Step 2: 跑测试**

```bash
RUN_BUILD_TESTS=1 node_modules/.bin/tsx --test tests/decision-layer-coverage-guard.test.ts
```
Expected: 2 passing

**Step 3: 跑全 pnpm check**

```bash
pnpm check
```
Expected: 0 error (含 1 个新 guard)

**Step 4: Commit**

```bash
git add tests/decision-layer-coverage-guard.test.ts
git commit -m "test(guard): P140f decision-layer-coverage-guard - 5 calc 🧭 Decision Recommendation 4 子段守护"
```

---

### Task 9: INDEX + memory 增补 + 3-way push

**Files:**
- Modify: `docs/superpowers/INDEX.md`（+1 行）
- Modify: `memory/p140f-decision-support-system.md`（Phase 1 ship 记录）

**Step 1: INDEX 增补**

```markdown
- [2026-08-06 Phase 1 KB4 ADR + 决策支持层](plans/2026-08-06-phase-1-kb4-adr-decision-layer.md) — KB4 模板 + 5 ADR + 5 calc 🧭 Decision Recommendation + 新 guard
```

**Step 2: memory 增补**

在 `memory/p140f-decision-support-system.md` Phase 切换执行历史表格追加：

```markdown
| 2026-08-06 | Phase 1 KB4 ADR 模板（0000） + 5 决策升级 ADR（0001-0005）ship | ✅ |
| 2026-08-06 | 5 calc 加 🧭 Decision Recommendation（csat/roas/cac/churn/burn）ship | ✅ |
| 2026-08-06 | tests/decision-layer-coverage-guard.test.ts 新增强（5×4 标签守护）ship | ✅ |
| 2026-08-06 | pnpm check 0 + 3-way push → feature/phase-1-kb4-adr ship | ✅ |
| 2026-08-06+ | Phase 2 P140e SEO 5 篇博客（含决策建议章节） | **待启动** |
```

**Step 3: 3-way push**

```bash
git fetch origin && git fetch github
git rev-list --left-right --count feature/phase-1-kb4-adr...origin/master
# Expected: 0 (本地新分支 ahead only)
git -c core.hooksPath=/dev/null push origin feature/phase-1-kb4-adr
git -c core.hooksPath=/dev/null push github feature/phase-1-kb4-adr
```

**Step 4: §12.5 自问 + commit**

```bash
git add docs/superpowers/INDEX.md memory/p140f-decision-support-system.md
git commit -m "docs(meta): P140f INDEX + memory Phase 1 ship record + §12.5 self-question documented"
```

**Step 5: 推 Phase 1 分支**

```bash
git -c core.hooksPath=/dev/null push origin feature/phase-1-kb4-adr
git -c core.hooksPath=/dev/null push github feature/phase-1-kb4-adr
```

---

## Self-Review

**1. Spec 覆盖：**
- P140f §4.1 Phase 1 = "KB4 ADR 模板 + 决策支持层补全" → Task 1 (模板) + Task 2 (5 ADR) + Task 3-7 (5 calc) + Task 8 (guard) + Task 9 (meta+push) ✅
- "产出 (a) docs/superpowers/adrs/0001-*.md 首批 ADR" → Task 2 ✅
- "产出 (b) 5 个示范工具补决策支持层" → Task 3-7 ✅
- "与 P44 兼容" → Task 1 ADR 模板 Status 字段 + ADR-XXXX 编号格式 ✅

**2. Placeholder 扫描：**
- ❌ TBD / TODO / "implement later" → 全文无 ✅
- ❌ "Similar to Task N"（避免冗余）→ Task 3-7 复用结构但内容独立 ✅

**3. 类型一致性：**
- 5 calc generate() 都是 string[] → ✅
- customFn 都是 string（minified JS）→ ✅
- guard 文件路径常量 TARGET_CALCS 与 Task 3-7 修改路径一一对应 → ✅

**4. v3 standard 不破坏：**
- 5 calc 修改前 6+ emoji sections → 修改后 7+（+1 🧭）→ 仍 6+ ✅

---

## 验收标准（Acceptance Criteria）

- [ ] `docs/superpowers/adrs/0000-template.md` + 0001-0005 共 6 个 ADR 文件存在
- [ ] 5 calc `generate()` 输出含 🧭 Decision Recommendation + 4 子段（Decision Question / Recommendation / Key Uncertainty / Next Action）
- [ ] 5 calc `customFn` 字符串同步含 4 子段
- [ ] `staticExamples[0]` 经 `codegen-examples.mjs` 重新生成
- [ ] `pnpm check` 0 error
- [ ] `RUN_BUILD_TESTS=1 node_modules/.bin/tsx --test tests/decision-layer-coverage-guard.test.ts` 2 passing
- [ ] 3-way push 成功（origin + github）
- [ ] memory `p140f-decision-support-system.md` Phase 1 ship 记录
- [ ] docs/superpowers/INDEX.md +1 行

---

## 风险与缓解

| 风险                                                | 缓解                                                                                            |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `customFn` 手改 ASI trap（`}if` 触发 parse error）   | Task 3-7 步骤 3 强制检查 `}}if` → 插入 `;`；CLAUDE.md 红线已有                               |
| `staticExamples[0]` drift（`calculate()` 改了忘 re-gen） | Task 3-7 步骤 4 强制跑 `codegen-examples.mjs`；pre-commit hook 自动跑 `--check`                  |
| 决策建议与工具语义错位（如 burn-rate 写成 csat）    | Task 2 ADR + Task 3-7 Decision Recommendation 内容来自 ADR，强制一致                             |
| 5 calc 改动跨文件（csat 是 customer-support / roas 是 marketing 等）→ cross-file breakage | Task 8 guard 5 文件全覆盖；review depth = 5 INTEGRATION × 3 reviews                             |
| §12.5 自问清单遗漏                                  | Task 9 步骤 4 在 commit message 含 "§12.5 self-question documented"；5 问对齐 memory            |