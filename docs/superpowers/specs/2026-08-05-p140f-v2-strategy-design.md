# P140f — v2.0 Evolution Strategy Design

> **Status:** APPROVED (user confirmed Path C on 2026-08-05). Pending OS doc fill-in (deferred to v2.0 promotion).
> **Scope:** 10-20 年长期演进路径 + 短期可执行补全。
> **Approach:** Path C 混合策略 — KB4 ADR 模板立即补全 + SEO 短期受益 + v2.0 中期演进 + v2.5 AI Native 长期目标。
> 
> ⚠️ **核心原则（v2.0 灵魂，user 2026-08-05 揭示）**:
> 
> **ForgeFlowKit 不是 Calculator Collection，是 Decision Support System。**
> 
> 每个计算器的目标不是"输出数字"，是 **"帮用户做出正确决策"**。
> 
> 例: 烧钱率计算器不是"还能坚持 X 月"，是 **"这个赛道值不值得做 + 关键不确定性识别 + 决策建议"**。
> 
> 对应 v2.0 12.01 5 类 Topic 中的 **"辅助决策"（Build vs Buy / 行业值不值得做 / Hiring Decision）**—— v2.0 5 类里前 4 类（衡量/计算/优化/预测）是中间产物，第 5 类（辅助决策）才是终极价值。
> 
> 对应 v2.0 4 层 Foundation 的 **Cognition 层**（核心）—— 从数据到认知到决策，不是从数据到数字。

---

## 1. Goal

为 ForgeFlowKit 制定**10-20 年长期演进路径**，明确：

1. **核心原则**: 每个工具从 Calculator 升级为 Decision Support Tool
2. 短期（1-2 周）可执行的 v2.0 兼容补全 + 决策导向内容补全
3. 中期（1-12 月）从 v1 Calculator 演进到 v2.5 Decision Support AI Native
4. 长期（1-2 年）达到 15 Domain / 80 Cluster / 1000 Topic / 10000 Node **Decision Node** 终极目标
5. 栈选择（Astro 保持 vs Next.js 切换）的最终决策

## 2. Background

### 2.1 当前项目状态

- **100 个计算器**（P0-P16 calculator batches） + **100 篇模板博客**（37.3% 关键词覆盖率）+ **120+ commits**（CLAUDE.md 维护）
- **GSC 90 天**：5 clicks / 92 queries / CSAT 28% 集中
- **CLAUDE.md 已 ship P44 ADR Governance** + **P140a-d SEO 系列** + **P138 v3 render**
- **Defense-in-depth**: 51 个 test suites / 8 dimensions
- **栈实际**: Astro 4.16.19 + TypeScript 5.6 + Tailwind 4 + 纯 SSG（无后端无 DB）

### 2.2 v2.0 文档调研完成

调研范围: `https://my.feishu.cn/drive/folder/EL17fs321loWqEdTWuKcddUQnhe`

12 个根 folder × ~10 子 folder = ~120 个 docx，全部读完（Batch 1-5 sub-agent 调研）。调研数据落盘: `docs/superpowers/_research/p140e-blog-strategy/`（注: 后续 v2.0 调研应单独建 `p140f/`）。

## 3. v2.0 体系完整盘点（基于 Batch 1-5 调研）

### 3.0 v2.0 核心: Decision Support System（不是 Calculator Collection）

**user 2026-08-05 揭示** (本 spec 修订触发):

> ForgeFlowKit 不只是 Calculator Collection，而是通过 Calculator 帮用户解决实在问题，做出正确决策。

**v2.0 5 类 Topic 的价值层级**:

```
L1 衡量状态 (Profit Margin / Conversion Rate)    —— 中间产物
L2 计算结果 (ROI / CAC / MRR Calculator)          —— 中间产物
L3 寻找最佳方案 (Pricing / Inventory / Budget)    —— 中间产物
L4 预测未来 (Revenue / Demand / Growth Forecast)  —— 中间产物
L5 辅助决策 (Build vs Buy / 行业值不值得做 / Hiring)  —— ★ 终极价值 ★
```

**当前 100 calc 主要是 L1-L4（中间产物），需升级为 L5（决策支持）。**

**对应 v2.0 4 层 Foundation 的 Cognition 层**:

```
Foundation        = 业务现实（用户输入 + 行业基准 + 竞品数据）
Cognition (核心)  = 从数据到认知到"决策建议"
Knowledge         = 知识图谱 + Industry Benchmark + Topic Score
Specification     = 规格化输出（决策文档 / 推荐路径 / 风险清单）
```

### 3.1 体系结构（12 root folder + 4 维视图）

### 3.1 体系结构（12 root folder + 4 维视图）

```
00 Overview（4 空 placeholder）
├─ Documentation Guide / Knowledge System Overview / Architecture Overview / OS Introduction

01 Operating System（ForgeFlowKit OS 战略核心）
├─ 0. Mission Control（项目状态 + ForgeFlowKit OS + C1-C4 Constitution）
├─ A. Foundation（**4 层**: Foundation / Cognition / Knowledge / Specification）
├─ B-I 8 system（Product / Design / Content / SEO / Engineering / Growth / Business / Operation）

02 Reference Implementation（J1-J10，10 docx）
├─ **栈假设**: Next.js + Hono + Postgres + Drizzle + shadcn/ui + Cloudflare + Turborepo
└─ **5 阶段进化**: Tool → Product → Platform → Ecosystem → **AI Native Organization**

03 Engineering Standards（S0-S10，11 docx）
└─ 完整 Standard 5 级 + 30 H1 / docx

04 Product System（P1-P10，10 docx）
├─ Strategy / Discovery / Research / Requirement / Feature / Pricing / Subscription / Analytics / Experiment / Evolution

05 RFC System（R1-R10，10 docx，**v2.5 Enterprise AI Native**）
├─ R1-R4 v1.0 → R5 v2.0 → R6-R10 **v2.5 AI Native + AI Readable + Machine Executable**

06 ADR System（A1-A10，10 docx，与 RFC 镜像）
├─ **A9 重复**: 1 有 1 空（待处理）

07 Playbook System（P1-P10，10 docx）
├─ **P6 Agent Design 6 字段**: Goal / Input / Output / Constraint / Tool / Memory
└─ **Machine Executable: true**

08 AI Knowledge System（K1-K9，8 docx + K9 空）
├─ K1 **Layer 4 模型**: Source / Processing / Representation / Consumption
├─ **Knowledge Source 8 类**: ADR / RFC / Playbook 是 Type 1-3
└─ K6 Memory 主动 Forgetting + K8 AI Hallucination 4 道防线

09 Company Knowledge Base（KB1-KB9，9 docx）
└─ **KB4 ADR 模板**（Problem/Options/Decision/Reason）**与现有 P44 ADR Governance 完全兼容**

10 AI Agent System（A1-A30，30 docx）
├─ A1-A10 内核（Architecture / Runtime / Memory / Tools / Workflow / Multi-Agent / Governance / Evaluation / Learning / OS）
├─ A11-A18 生态 / 通信 / 分析
├─ A19-A27 安全 / 信任 / 合规
├─ A20-A29 企业 / 组织 / 经济 / 数字员工 / 奇点管理
└─ A30 **Enterprise Intelligence OS** 终极整合

11 Business Domain（11.01-11.10，10 域）
├─ Finance / Marketing / Sales / Customer / Product / HR / Operation / Strategy / Legal / Supply Chain
└─ 6 章节标准模板 + 与 100 calc 精确对应（详见 §3.3）

12 Business Topic（12.01-12.10，10 docx，**横向方法论**）
├─ 12.01 Topic Architecture（Topic 5 层 + 21 字段 schema）
├─ 12.02-12.06 Topic Discovery/Classification/Modeling/Validation/Factory
├─ 12.07 Knowledge Graph / 12.08 Lifecycle / 12.09 Portfolio
└─ 12.10 Topic Intelligence Engine（5 层 AI + 4 数据源 + 5 Agent）
```

### 3.2 关键设计原则（横切所有 docx）

1. **Rule = Source of Truth / Product = Presentation**（C1 Constitution）
2. **AI Suggests, Human Decides**（R7 + A7 共同原则）
3. **Specification over Documentation**（ForgeFlowKit OS docx）
4. **Architecture Serves Product, Product Validates Architecture**（同上）
5. **Decision First + Context Matters + Trade-off Required**（A1 ADR）

### 3.3 11 业务域 ↔ 100 计算器精确对应表

基于 Batch 5 sub-agent 调研:

| Domain | Cluster 数 | Topic 数 | ForgeFlowKit 计算器（v1 现状） | 缺口 |
|---|---|---|---|---|
| **11.01 Finance** | 6（Accounting/Investment/Loan/Business Finance/Tax/Personal）| 16+ | ROI/CAGR/Compound Interest/Break Even/Mortgage/Loan/Cash Flow/DCF（8 个）| 8+ topic 缺口（Tax/Personal Finance 等）|
| **11.02 Marketing** | 5+ | 6 | ROAS/LTV by Channel/Funnel Value/Cohort Retention/Email ROI/Content ROI（6 个）| 集群广度需扩展 |
| **11.03 Sales** | 5+ | 6 | Pipeline Value/Sales Velocity/ACV/Win Rate/Quota/Pipeline Coverage（6 个）| 集群广度需扩展 |
| **11.04 Customer** | 5+ | 6 | NRR/GRR/Expansion/Logo Churn/Customer Health/Renewal（6 个）| 同上 |
| **11.05 Product** | 5+ | 6 | Funnel/Feature Adoption/Activation/Stickiness/Power User（6 个）| 同上 |
| **11.06 HR** | 5+ | 6 | Fully-Loaded Cost/Ramp/Refresh/Attrition（4 个）| 2 个 topic 缺口 |
| **11.07 Operation** | 5+ | 6 | Inventory Turnover/Carrying Cost/Stockout/Reorder/Fulfillment/Supplier（6 个）| 集群广度 |
| **11.08 Strategy** | 5+ | 10 | Unit Economics/Valuation/LTV/CAC/...（10 个）| 最完整 |
| **11.09 Legal** | 5+ | 6 | GDPR/DSAR/Consent/DPA/Breach/CMP ROI（6 个）| 集群广度 |
| **11.10 Supply Chain** | 5+ | 0 | 0（与 O-cat 重叠）| **完全缺口** |

**关键观察**:
- v1 现状 100 calc = v2.0 L4 Product 层（已有 ~100 Node）
- 距离 v2.0 终极目标（15 Domain / 80 Cluster / 1000 Topic / 10000 Node）**差 9900 Node**
- 11.10 Supply Chain 完全缺口
- 其他 9 域每域缺 2-8 个 topic

### 3.4 v2.0 vs 现状 Gap（4 大维度）

| Gap | 严重度 | 关键差异 |
|---|---|---|
| **栈脱节** | 中 | v2.0 假设 Next.js + 后端 + DB；现状 Astro 4 + 纯 SSG。**决策: 保持 Astro**（downport v2.0 假设）|
| **AI Native** | 高 | v2.0 R/A v2.5 + 12.10 Intelligence Engine；现状无 AI gateway。**决策: 长期目标**（不激进）|
| **决策治理** | 低 | v2.0 RFC/ADR v2.5；现状 `docs/superpowers/plans/` + `memory/`。**决策: KB4 ADR 模板**补全（与 P44 兼容，最低成本）|
| **主题方法论** | 中 | v2.0 12.04 Topic Modeling + 12.05 Validation；现状无 topic score 公式。**决策: 长期补全** |

## 4. Path C 混合策略（5 Phase）

> ⚠️ **每个 Phase 都强调"决策支持"导向**（不只关注架构/SEO/元数据）

### Phase 1（1 周）: KB4 ADR 模板 + 决策支持层补全

| 项 | 详情 |
|---|---|
| **目标** | v2.0 标准 ADR 模板 + 每个工具补"决策支持层"（L5 Topic）|
| **来源** | v2.0 09 KB4 ADR 模板 docx + v2.0 12.01 5 类 Topic（辅助决策 L5）|
| **集成** | 与 `docs/superpowers/plans/2026-*.md` 流程对齐；与 P44 ADR Governance 兼容 |
| **产出** | (a) `docs/superpowers/adrs/0001-*.md` 首批 ADR；(b) **5 个示范工具补"决策支持层"**（如烧钱率 → "赛道是否值得做"建议）|
| **价值** | **最近可执行、低成本、与 P44 兼容 + 立即体现 v2.0 灵魂**（决策支持）|

### Phase 2（1-2 周）: P140e SEO + 决策导向博客内容

| 项 | 详情 |
|---|---|
| **目标** | 5 篇深度博客（csat/roas/project-profitability/cac/churn）—— **每篇输出"决策建议"，不是"数字"** |
| **来源** | P140e spec（已 ship）`docs/superpowers/specs/2026-08-05-p140e-blog-content-strategy-design.md` |
| **集成** | 现有 `src/content/blog/*.md` + 100 工具页 cross-link + **每个工具页补"决策建议"段** |
| **产出** | 5 篇 ≥ 1500 字博客（含**决策建议章节**）+ 8 H2 + ≥80% 关键词覆盖 |
| **价值** | 短期 SEO 受益 + **立即体现 v2.0 决策支持灵魂**（每篇博客 = 决策指南）|

### Phase 3（1-2 月）: Playbook 6 字段 + 决策导向标准化

| 项 | 详情 |
|---|---|
| **目标** | 100 calc 引擎标准化为 6 字段: **Goal = "用户能做什么决策"** + Input / Output / Constraint / Tool / Memory |
| **来源** | v2.0 07 P6 Agent Design 6 字段 |
| **集成** | 现有 `src/engines/*.ts` 的 `ToolEngine` interface（`src/core/engines/types.ts`）|
| **产出** | 100 engine 文件统一 metadata（Goal 字段强调决策）+ 6 字段注释 + CI guard |
| **价值** | **标准化引擎注册 + 可 AI 化**（Phase 4/5 基础）—— **Goal 字段让"决策支持"成为 first-class** |

### Phase 4（3-12 月）: 主题簇方法论 + 决策价值评分

| 项 | 详情 |
|---|---|
| **目标** | 12.x 主题簇方法论从设计骨架→实现 + 加 **Decision Value Score** |
| **范围** | 12.04 Topic Modeling（21 字段补全）+ 12.05 Validation（**Topic Score 加 Decision Value 维度**）+ 12.10 Intelligence Engine（5 Agent）|
| **集成** | Phase 3 标准化引擎 + P140e SEO + CLAUDE.md P-series 集成 |
| **产出** | 1-2 个示范 topic → 完整建模 + 验证 + 智能引擎演示 + **Decision Value Score 公式** |
| **价值** | **真正向 10000 Decision Node 演进**（从计算器 → 决策支持）|

### Phase 5（1-2 年）: v2.5 Decision Support AI Native 实施

| 项 | 详情 |
|---|---|
| **目标** | **Decision Support OS 视角全面落地**（RFC v2.5 + ADR v2.5 + AI Agent 集成 + Cognition 层核心）|
| **范围** | R6-R10 RFC v2.5 + A1-A10 ADR v2.5 + A1-A30 Agent System + A30 Enterprise Intelligence OS + **Cognitive Layer** |
| **集成** | 全栈整合（Phase 1-4 全部产出 + v2.0 OS 文档微调）|
| **产出** | Enterprise Intelligence OS 演示 + 6 阶段变现（**升级为 Decision Support 变现：免费工具→建议报告→深度决策咨询→团队决策 API→企业决策平台**）|
| **价值** | **商业平台愿景 + 长期可持续性**（10-20 年）—— 每个工具 = 决策支持系统 |

## 5. 关键决策（已 close）

### 5.1 栈选择 ✅ Astro 保持

- **决策**: 保持 Astro 4.16.19 + TypeScript 5.6 + Tailwind 4 + 纯 SSG
- **理由**: 
  - Astro 4 是 2026 年最稳定的静态站框架
  - 100 calc + 100 博客全部用 Astro 构建，迁移成本高
  - v2.0 Next.js 假设是 02 Reference docx 的"参考实现"，**不强制切换**
  - downport v2.0 假设到 Astro（标准能 downport，stack 选择保留现状）

### 5.2 KB4 ADR 模板补全 ✅ Phase 1 立即

- **决策**: Phase 1 立即补全 KB4 ADR 模板（1 周）
- **理由**:
  - **最低成本、最近价值**（v2.0 标准 + P44 兼容）
  - 双赢：v2.0 标准融入 + 现状 ADR 流程升级
  - 给后续 Phase 3/4/5 留架构决策记录基础设施

### 5.3 12 主题簇方法论补全 ✅ Phase 4 长期

- **决策**: Phase 4（3-12 月）长期补全
- **理由**:
  - 12 主题簇是**设计骨架**（公式/Agent 占位符、21 字段只列 11）
  - 需要 Phase 3 标准化引擎作为基础
  - 不在 Phase 1-2 抢占 SEO 资源

### 5.4 100 calc 的 v2.0 主题映射 ✅ 渐进迁移

- **决策**: 渐进迁移（每年 20 个）
- **理由**:
  - 100 calc 全量重塑工作量太大
  - 渐进式: 每年 20 个主题 → 5 年完成主题层
  - Phase 1 KB4 ADR + Phase 3 Playbook 6 字段作为渐进工具

### 5.5 v2.0 OS 文档微调 ✅ deferred to v2.0 promotion

- **决策**: 等推进到 v2.0 时让 Claude 帮忙微调 OS 文档 + 补全没写完的内容
- **理由**:
  - v2.0 OS 文档（00 Overview / 12.04-12.09 等）仍是设计骨架
  - 现在补全是浪费（Phase 1-4 还没开始，OS 文档依赖实际产出）
  - deferred to v2.0 promotion（Phase 5 触发）

## 6. Ship Path

```
Day 0 (2026-08-05): 本 spec ship
Day 1-7: Phase 1 — KB4 ADR 模板补全（v2.0 标准 + P44 集成）
Day 7-21: Phase 2 — P140e SEO 5 篇深度博客
Day 21-90: Phase 3 — Playbook 6 字段标准化（100 calc）
Day 90-365: Phase 4 — 主题簇方法论补全（Phase 1-3 完成）
Day 365-730: Phase 5 — v2.5 Enterprise AI Native（触发 v2.0 OS 文档微调）
```

## 7. Acceptance Criteria

> ⚠️ **每个 Phase 的核心验收标准 = "决策支持"灵魂落地**（不是单纯的元数据/SEO/架构）

### Phase 1 完成
- [ ] KB4 ADR 模板在 `docs/superpowers/adrs/` 落地
- [ ] 首批 ADR（≥ 3 个）已写
- [ ] **5 个示范工具补"决策支持层"**：如烧钱率 → "赛道是否值得做"建议（csat → "是否流失"、roas → "广告是否值得投入"、cac → "获客是否值得"、churn → "客户是否值得留"）
- [ ] CI guard（验证 ADR 格式 + 决策支持层）
- [ ] pnpm check 0 错误
- [ ] 与 P44 ADR Governance 集成（CLAUDE.md §Notes 更新）

### Phase 2 完成
- [ ] 5 篇深度博客 ship（含**决策建议章节**）
- [ ] 每篇 ≥ 1500 字 + 8 H2 + 关键词覆盖 ≥ 80%
- [ ] 100 工具页 cross-link 完整 + **每个工具页补"决策建议"段**
- [ ] pnpm check 0 错误

### Phase 3 完成
- [ ] 100 engine 文件统一 Playbook 6 字段 metadata（**Goal 字段 = "用户能做什么决策"**）
- [ ] CI guard（验证 6 字段完整性 + Goal 字段含"决策"关键词）
- [ ] pnpm check 0 错误

### Phase 4 完成
- [ ] 1-2 个示范 topic 完整建模
- [ ] Topic Score 公式实现 + **Decision Value Score 维度**
- [ ] 12.10 Intelligence Engine 演示

### Phase 5 完成
- [ ] v2.5 RFC v2.5 + ADR v2.5 实施
- [ ] A1-A30 Agent System 集成
- [ ] **Cognitive Layer 核心落地**（从数据到决策的认知模型）
- [ ] 6 阶段变现升级为 Decision Support 变现
- [ ] v2.0 OS 文档微调（user 触发）

## 8. References

### 飞书 v2.0 文档

- **根 folder**: `https://my.feishu.cn/drive/folder/EL17fs321loWqEdTWuKcddUQnhe`
- **调研数据**（未来落盘）: `docs/superpowers/_research/p140f-v2-system/`（待建）

### ForgeFlowKit 已 ship

- `CLAUDE.md` — 项目主文档（P44 ADR Governance 已 ship）
- `docs/superpowers/specs/2026-08-05-p140e-blog-content-strategy-design.md` — P140e SEO spec（已 ship）
- `docs/superpowers/plans/2026-07-23-p61-m-category-fixes.md` 等历史 P-series 计划
- `src/engines/` — 100 个计算器引擎
- `src/core/engines/types.ts` — `ToolEngine` interface

### Memory

- `memory/MEMORY.md` — 项目 memory 索引
- `memory/feishu-v2-system-design.md` — v2 体系调研（已 ship 2026-08-04）
- `memory/p140e-blog-coverage-complete-shipped.md` — P140e 调研
- `memory/p44-...md` — P44 ADR Governance 历史

### 外部参考

- Astro 4 文档: https://docs.astro.build/
- Tailwind 4 文档: https://tailwindcss.com/docs
- TypeScript 5.6 文档: https://www.typescriptlang.org/docs/

---

## 9. Open Questions（已 close）

### 9.1 总博客扩量 ✅ 不扩量，先深化 5 篇
- **决策**: Phase 2 5 篇深度博客，不扩量
- **理由**: 100 篇模板都在 37% 覆盖度，先深化

### 9.2 中文博客 ✅ 不做
- **决策**: 不做中文博客
- **理由**: 客户全海外，zh 站点仅内部使用

### 9.3 推荐博客数 ✅ Top 20 各 3 篇（远期）
- **决策**: Phase 4 长期补全时考虑
- **理由**: 当前 100 calc = 1 blog/calc，渐进迁移

### 9.4 NEW_SPOKE 34 个 ✅ 1 折博客接住 csat 8 长尾
- **决策**: Phase 2 csat 深度博客接 8 长尾
- **理由**: csat 是 GSC #1 优先

### 9.5 v2.0 路径 ✅ Path C 混合（user 决策 2026-08-05）
- **决策**: Path C 5-Phase 混合策略
- **理由**: 最低风险 + 渐进 v2.5 AI Native

---

## 10. Ship 承诺

当 Phase 1 完成时，本 spec 状态从 APPROVED → EXECUTING Phase 1。后续每个 Phase 完成时更新 spec 状态。

未来 v2.0 OS 文档微调（Phase 5 触发）由 Claude 协助：
1. 微调 00 Overview 4 个空 folder
2. 补全 12.x 主题簇方法论公式 / Agent 占位符
3. 补全 A.04-A.06 等 v2 体系骨架空 folder

**user 触发时机**: Phase 5 开始前 1-2 周告知 Claude。

---

## 11. Long-term Vision: v3.0 = Autonomous Decision Platform

> **user 2026-08-06 决策**: v2.0 完成后不停留在 Decision Support，**直接演进到 v3.0 = Autonomous Decision Platform**。

### 11.1 v2.0 → v3.0 演进

| 版本 | 核心 | 用户角色 | 商业价值 |
|---|---|---|---|
| **v1** (当前) | Calculator Collection | 用户用工具 | 低（流量）|
| **v2.0** (Phase 1-5) | Decision Support System | 用户决策 | 中（订阅）|
| **v3.0** (Phase 5 后期触发) | **Autonomous Decision Platform** | **AI 决策 + 用户审批** | **高（API + 企业）** |

### 11.2 v3.0 关键能力

1. **Autonomous Decision Loop**: AI 主动监控 + 主动建议 + 用户一键执行
2. **Decision Execution**: AI 直接执行（如自动调整 ad budget / 暂停亏损业务）
3. **Decision Memory**: AI 记住所有决策历史 + 学习用户决策偏好
4. **Decision Marketplace**: 用户分享自己的"决策模板"（如同 Notion Template）
5. **Enterprise Decision OS**: 多用户协同决策 + 角色权限 + 决策审计

### 11.3 v3.0 商业变现升级

```
v1: 免费工具 → 广告
v2.0: → 高级（决策报告）→ 团队（决策 API）→ 企业（决策平台）
v3.0: → 自主决策服务（AI 主动建议 + 一键执行）
       → 决策结果订阅（月度决策报告 + 自动执行）
       → 企业决策 OS（多团队协同 + SLA）
```

**v3.0 把"卖建议"升级为"卖执行"**——商业价值数倍增长。

### 11.4 v3.0 依赖 v2.0 的基础

- 没有 v2.0 100 个 Decision Tool → v3.0 没有决策输入数据
- 没有 v2.0 Playbook 6 字段标准化 → v3.0 AI 无法执行决策
- 没有 v2.5 RFC/ADR AI Native → v3.0 决策无法治理
- 没有 v2.0 12.10 Intelligence Engine → v3.0 缺少数据源

**v3.0 必须建立在 v2.0 Phase 1-5 全部完成之上**。

### 11.5 v3.0 触发条件

按 v2.0 演进路径:
- **Day 0-90** (Phase 1-3): 决策支持基础设施（KB4 ADR / SEO / Playbook 6 字段）
- **Day 90-365** (Phase 4): 主题簇方法论 + AI 决策辅助
- **Day 365-730** (Phase 5): v2.5 Enterprise AI Native + A1-A30 Agent System 集成
- **Day 730+** (Phase 5 后期): **评估 v3.0 跃迁** — 写 v3.0 spec (Autonomous Decision Platform)

**v3.0 跃迁决策点** = Phase 5 完成时（Day 730+），不是现在。

### 11.6 短期保持定力

虽然 v3.0 是长期愿景，**v2.0 落地是 v3.0 的前置依赖**。**不能跳级**：

- ❌ 现在直接写 v3.0 spec（v2.0 还没落地，跳级风险大）
- ✅ 严格执行 v2.0 Phase 1-5
- ✅ Phase 5 完成时主动评估 v3.0 跃迁

**v3.0 不是"替代"v2.0，是 v2.0 的"自然演进"**。