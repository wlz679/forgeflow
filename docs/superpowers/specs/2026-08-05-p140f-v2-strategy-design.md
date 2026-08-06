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

### 3.3 15 业务域 ↔ 100 计算器精确对应表（user 2026-08-06 敲定）

> **v2.0 文档只列 10 域**（11.01-11.10），但**用户基于 100 calc 实际 + 调研**敲定 **15 业务域**（与 v2.0 终极目标 15 Domain 对齐）。
>
> 4 个新增 + 1 个拆分 + 1 个合并 = 13 业务域（11.01-11.14 中间 11.10 合并到 11.07）+ 11.15 预留

#### 15 业务域最终表

| 编号 | 业务域 | ForgeFlowKit 类别 | v1 现状 | Phase 4 缺口 |
|---|---|---|---:|---:|
| 11.01 | Finance | C + F + E（部分）| 8 | 20+（Tax / Personal / Investment variants）|
| 11.02 | Marketing | M | 6 | 14（Attribution / Cohort / Campaign 等）|
| 11.03 | Sales | S | 6 | 14（Win Rate variants / Forecast 等）|
| **11.04** | **Customer Success** | **R** | **6** | **6**（Segment / LTV variants）|
| 11.05 | Product | P + A（部分）| 6 | 6（Funnel variants / Adoption / Cohort）|
| 11.06 | HR | H | 4 | 6（Comp / Benefits / Performance）|
| **11.07** | **Operations & Supply Chain** | **O + 新** | **6** | **30+**（Procurement / Warehouse / Logistics）|
| 11.08 | Strategy | C（部分）+ A（部分）| 10 | 5（Market Sizing / Growth）|
| 11.09 | Legal | L | 6 | 4（Contract / IP）|
| (合并) | — | — | — | 11.10 合并到 11.07 |
| **11.11** | **AI Cost Tools** | **B** | **8** | **AI 辅助 + 人类审核** |
| **11.12** | **Knowledge / KB** | **K** | **6** | **新主题簇** |
| **11.13** | **Customer Support** | **T** | **6** | **新主题簇** |
| **11.14** | **Freelance / Solopreneur** | **D** | **6** | **新主题簇** |
| 11.15 | (预留 v3.0 新增) | — | 0 | — |

**关键调整**（user 2026-08-06 敲定）:
1. **拆分 11.04 Customer**: R + T 拆分为 Customer Success (11.04) + Customer Support (11.13)
2. **合并 11.10 Supply Chain 到 11.07 Operation**: 统一为 Operations & Supply Chain
3. **新增 11.11 AI Cost Tools**: ForgeFlowKit B 类别 8 calc 在 v2.0 文档没单独域
4. **新增 11.12 Knowledge / KB**: ForgeFlowKit K 类别 6 calc 在 v2.0 文档没单独域
5. **新增 11.13 Customer Support**: 拆分自原 11.04
6. **新增 11.14 Freelance / Solopreneur**: ForgeFlowKit D 类别 6 calc 在 v2.0 文档没单独域

**关键观察**:
- v1 现状 100 calc = v2.0 L4 Product 层（已有 ~100 Node）
- 距离 v2.0 终极目标（15 Domain / 80 Cluster / 1000 Topic / 10000 Node）**差 9900 Node**
- **新 5 域 (11.11-11.14) 是 AI 自动 + 人类审核重点**
- 11.07 Operations & Supply Chain **缺口最大**（30+），Phase 4 一年内补完

### 3.3.1 主题簇矩阵（13 业务域 × 5-6 主题簇 ≈ 75 Cluster）

> ⚠️ **AI 自动发现具体 Topic + Calc**，但**主题簇级别（业务方向）必须人预设**（避免 AI 跑偏到宠物年龄计算器等无关领域）。

| 业务域 | 主题簇（5-6 个，预设）|
|---|---|
| **11.01 Finance** | Accounting / Investment / Loan & Debt / Business Finance / Tax / Personal Finance（6 个）|
| **11.02 Marketing** | SEO & Content / Paid Acquisition / Organic Acquisition / Retention Marketing / Brand Marketing / Attribution（6 个）|
| **11.03 Sales** | Pipeline Management / Conversion / Forecasting / Customer Acquisition / Sales Enablement / Pricing Strategy（6 个）|
| **11.04 Customer Success** | Retention / Expansion / Onboarding / Engagement / Lifecycle / Voice of Customer（6 个）|
| **11.05 Product** | Funnel / Adoption / UX / Lifecycle / Analytics / Product Strategy（6 个）|
| **11.06 HR** | Compensation / Talent Acquisition / Talent Retention / Productivity / Culture / Performance Management（6 个）|
| **11.07 Operations & Supply Chain** | Inventory / Logistics / Supplier Management / Quality / Procurement / Warehouse（6 个）|
| **11.08 Strategy** | Unit Economics / Valuation / Equity / Exit / Growth / Market Sizing（6 个）|
| **11.09 Legal** | Privacy / Compliance / Contract / IP / Litigation（5 个）|
| **11.11 AI Cost Tools** | LLM API Cost / Image Gen Cost / GPU Cloud / Training / Cross-Provider Comparison（5 个）|
| **11.12 Knowledge / KB** | KB Coverage / Article Freshness / Search Effectiveness / Documentation ROI / Article Helpfulness（5 个）|
| **11.13 Customer Support** | Cost-per-Ticket / FRT SLA / Resolution Time / CSAT / Deflection Rate / Team Capacity（6 个）|
| **11.14 Freelance / Solopreneur** | Hourly-vs-Fixed / Freelance Rate / Course Pricing / SaaS Pricing / Email List Revenue / Sponsorship Rate（6 个）|

**总计**：13 业务域 × 5-6 主题簇 = **75 主题簇**（接近 v2.0 终极 80 Cluster 目标，差 5 个留 Phase 5 自由探索）

**关键约定**:
- **AI 不允许跨业务域**（如不能在 11.07 里产出宠物相关 calc）
- **AI 不允许跨主题簇**（如 11.02 Marketing 不能产出 Finance 相关 calc）
- **业务域 + 主题簇 = 硬约束**，具体 Topic + Calc = AI 自由
- 每个新 calc 必须归档到对应 业务域 → 主题簇 → Topic → Calc 4 层结构

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

---

## 15. User-Centric Advisor Layer + Technical Advisor Relationship（user 2026-08-06 揭示）

> ⚠️ **v2.0 灵魂第二维度（user 揭示）**:
> 
> ForgeFlowKit 不只是 Decision Support System（帮用户做决策），还是 **User-Centric Advisor**（从用户视角考虑，帮用户成为"长期技术顾问关系"）。
> 
> 例: 用户用 csat calculator 一次 → 满意 → 复访 → 信任 → 长期留存 → 推荐 → 升级为"团队顾问订阅"。
> 
> 这类似"私人医生 / 私人律师"的长期专业关系 —— ForgeFlowKit 是"用户的商业技术顾问"。

### 15.1 v2.0 灵魂 = 双维度

| 维度 | 内容 | 核心问题 |
|---|---|---|
| **维度 1: Decision Support**（user 2026-08-05 揭示）| 帮用户做出正确决策 | 这个工具的输出是"决策建议"还是"数字"？|
| **维度 2: User-Centric Advisor**（user 2026-08-06 揭示）| 用户视角 + 长期技术顾问关系 | 用户愿不愿意把它当成技术顾问？|

**两个维度 = v2.0 完整灵魂**。**缺一不可**。

### 15.2 用户视角 5 问（User View 5 Questions）

每个新 Topic / calc **必须**能回答这 5 个问题：

1. **这个工具能满足用户需求吗？**（功能价值）
2. **功能好不好用？**（UX 易用性）
3. **用户愿不愿意把它当成技术顾问？**（关系建立）
4. **用户愿意长期留存吗？**（Retention）
5. **用户会推荐给别人吗？**（Advocacy）

每个新 calc 必须有 **User Value Score** 字段（含 5 维度评分）：
- User Value Score = (功能价值 × UX 易用性 × Advisor 关系 × Retention × Advocacy) ÷ 5

User Value Score ≥ 0.7 → Topic 进入候选池
User Value Score < 0.7 → Topic 自动拒绝

### 15.3 Technical Advisor Relationship（长期技术顾问关系）

ForgeFlowKit v2.0+ 不只是"工具集合"——是**用户的商业技术顾问**。

#### Relationship 演进路径（按 v2.0 文档相关章节）

```
v1: 单次访问（流量思维）—— 100 calc 用 1 次就走
v2: 决策支持（订阅思维）—— 决策报告订阅，每周/每月复访
v3: Autonomous Decision（服务思维）—— AI 主动监控 + 决策执行
v3.5+: Technical Advisor Relationship（关系思维）
  ↓
  用户与 ForgeFlowKit 建立"长期专业关系"
  类似"私人医生" / "私人律师" / "私人财务顾问"
```

#### 4 个 Relationship 维度

1. **Trust**（信任）：AI 决策建议准确率 > 85%（每季度 review）
2. **Stickiness**（粘性）：User Value Score 高 → 复访率提升
3. **Trust → Advocacy**（倡导）：用户主动推荐 → 新用户获取成本降低
4. **Long-term LTV**（长期价值）：用户 5+ 年留存 → CLV（Customer Lifetime Value）持续增长

### 15.4 6 阶段变现路径升级

| 阶段 | v1 (Calc) | v2 (Decision Support) | v3 (Autonomous) | v3.5+ (Technical Advisor) |
|---|---|---|---|---|
| 免费工具 | ✓ | ✓ | ✓ | ✓ |
| 广告 | ✓ | ✓ | ✓ | ✓ |
| 高级 | ✗ | ✓ 决策报告 | ✓ 自动决策 | ✓ Advisor 咨询 |
| 团队 | ✗ | ✓ | ✓ | ✓ Advisor 团队 |
| API | ✗ | ✗ | ✓ | ✓ Advisor API |
| 企业 | ✗ | ✓ 咨询 | ✓ OS + SLA | ✓ **长期顾问关系** |

**v3.5+ 把"卖工具"升级为"卖长期专业关系"** —— 商业价值数倍增长。

### 15.5 用户视角工作流（Topic 全生命周期）

按 v2.0 文档 12.08 Lifecycle Management + 用户视角 5 问：

```
Discovery → Validation → Modeling → Productization → Growth → Optimization
     ↓          ↓           ↓            ↓             ↓            ↓
   5 问       5 问        5 问        5 问           5 问         5 问
  评估       评估         评估        评估           评估          评估
```

每个生命周期阶段**必须**回答 5 问：
- Discovery: 这个 Topic 用户需求是什么？5 问初评
- Validation: 用户愿不愿意用？5 问验证
- Modeling: 数据/UX/关系建模，5 问细化
- Productization: 发布，5 问上线检查
- Growth: 用户复访/推荐？5 问增长指标
- Optimization: 长期留存？5 问优化

### 15.6 v2.0 文档对应章节

| 维度 1 / 维度 2 | v2.0 文档章节 |
|---|---|
| **Decision Support**（维度 1）| 12.01 Topic Architecture 5 类 Topic（L5 辅助决策）/ Cognition 层 / 12.10 Intelligence Engine |
| **User-Centric Advisor**（维度 2）| 04 P3 User Research（27 节）/ 04 P5 Feature Management / 04 P8 Analytics AARRR + Retention / 04 P9 Experiment Long Term Optimization / 12.08 Lifecycle Management / 10.AI Agent System Governance |

### 15.7 用户视角维度 = Decision Support 不可分割的一部分

按 CLAUDE.md §"Every P-series proposal must answer" 原则：
- 任何 P-series **必须先回答**: "这个改动让工具更接近 Decision Support + User-Centric Advisor，还是只优化 Calculator？"
- 任何新工具开发**必须**: (a) 决策导向 L5 Topic + (b) 用户视角 5 问评分 ≥ 0.7

**Decision Support + User-Centric Advisor = v2.0 完整灵魂**。

---

## 16. Updated Acceptance Criteria（含用户视角 5 问）

#### Phase 4 完成（Day 365）
- [ ] 1-2 个示范 topic 完整建模
- [ ] Topic Score 公式 + Decision Value Score 公式实现
- [ ] 12.10 Intelligence Engine 演示
- [ ] **100 新 calc 已 ship**（按 §13.2 AI 自动 + 人类审核 + **每个 calc 通过用户视角 5 问**）
- [ ] **每个新 calc 的 User Value Score ≥ 0.7**

#### Phase 5 完成（Day 730）
- [ ] v2.5 RFC v2.5 + ADR v2.5 实施
- [ ] A1-A30 Agent System 集成
- [ ] **Cognitive Layer 核心落地**
- [ ] **200+ 新 calc 已 ship**（按 §13.3 AI 自动 + **每个 calc 通过用户视角 5 问 + User Value Score ≥ 0.7**）
- [ ] 6 阶段变现升级为 Decision Support + Technical Advisor Relationship
- [ ] v2.0 OS 文档微调（user 触发）

---

## 12. Branch Strategy（user 2026-08-06 敲定）

### 12.1 分支命名约定

| 分支 | 用途 | 创建时机 | 合并时机 |
|---|---|---|---|
| `master` | 稳定已 ship | 已有 | Phase ship + pnpm check 0 |
| `feature/phase-1-kb4-adr` | Phase 1 开发 | Phase 1 开始 | Phase 1 ship |
| `feature/phase-2-p140e-seo` | Phase 2 开发 | Phase 2 开始 | Phase 2 ship |
| `feature/phase-3-playbook-6-fields` | Phase 3 开发 | Phase 3 开始 | Phase 3 ship |
| `feature/phase-4-topic-cluster` | Phase 4 开发 | Phase 4 开始 | Phase 4 ship |
| `feature/phase-5-v25-ai-native` | Phase 5 开发 | Phase 5 开始 | Phase 5 ship |

### 12.2 大更新 / 小更新约定

- **Phase 内 commit**（小更新）: 直接 commit in `feature/phase-N-*`
- **Phase 内 sub-branch**（大更新/破坏性重构）: `feature/phase-N-p150-xxx`
- **PR 流程**: feature branch → master（squash merge or rebase）
- **3-way push**（按 memory `github-repo-info.md`）:
  - origin = Gitee = `wlz679/calcKit`
  - github = `wlz679/forgeflow`
  - Phase ship 后手动 `git push origin master && git push github master`
- **Pre-push hook**: 已配置；按 memory `p44-scripts-index-shipped` 指引可能误报 ahead=0，按 `git -c core.hooksPath=/dev/null push` bypass

### 12.3 CI/CD 配合

- **`master` 分支 CI**: 全测试（pnpm check + pnpm test:build）
- **`feature/phase-N-*` 分支 CI**: 轻量级（pnpm check + codegen checks）
- **GH Action sync-pricing.yml cron**: 按 memory `p43-components-index-shipped` + `p48-claude-md-lessons-shipped` 提示 — push 前先 `git fetch origin && git fetch github && git rev-list`，避免 cron race

### 12.4 用户切换分支时机

| 阶段 | 切换到 | 备注 |
|---|---|---|
| Phase 1 开始 | `feature/phase-1-kb4-adr` | 从 master 新建 |
| Phase 2 开始 | `feature/phase-2-p140e-seo` | Phase 1 merge 后从 master 新建 |
| ... | ... | 顺序推进 |
| Phase 5 ship | master | 最终合并 |

### 12.5 自问机制（Phase 切换时主 agent 主动自问 + 问 user）

> ⚠️ **user 2026-08-06 敲定**：当任务推进到新阶段时，主 agent **必须主动自问**清单，然后**主动问 user**是否需要进入新分支开发。

#### 主 agent 主动自问清单（5 问）

进入新阶段时，主 agent **自动**问自己：

1. **Phase 进度**：当前 Phase 任务全部完成？pnpm check 0？
2. **分支切换**：需要进入新分支吗？按 §12.1 命名约定
3. **大更新 sub-branch**：当前 Phase 内有破坏性重构吗？需要 sub-branch？
4. **跨 Phase 切换**：是否从 `feature/phase-N` → `feature/phase-(N+1)-xxx`？
5. **3-way push 准备**：master ship 后准备好 origin + github push 吗？

#### 主 agent 主动问 user 的固定话术

主 agent 在切换前**必须**主动问 user：

> "Phase N ship 完毕。当前完成：<清单>。要进入 Phase N+1 feature/phase-(N+1)-xxx 吗？"

User 拍板（"确认"/"调整"/"延后"）后，主 agent 才创建新分支 + 切分支 + 继续下一 Phase。

#### 触发时机（5 个）

| 触发时机 | 主 agent 动作 |
|---|---|
| 当前 Phase ship 完成 | 自问 + 问 user（"进入下一 Phase？"）|
| 大更新（破坏性重构）开始 | 自问 + 问 user（"sub-branch 命名？"）|
| Phase 中需要切换 feature/phase-N | 自问 + 问 user（"是否切回 master 或新分支？"）|
| master ship 后 3-way push 前 | 自问 + 问 user（"3-way push 顺序？"）|
| Phase 5 ship 后 v3.0 启动前 | 自问 + 问 user（"启动 v3.0 Autonomous spec？"）|

#### 强制约束

- 主 agent **不允许**自动切分支（必须 user 拍板）
- 主 agent **不允许**跳过自问清单（即使任务很紧急）
- User 拍板后主 agent 才执行分支操作

### 12.6 维度 3: Proactive Co-Pilot（项目合作伙伴机制）

> ⚠️ **user 2026-08-06 敲定宪法级原则**：Claude 不是任务执行者，是**项目合作伙伴**。本节是 §12.5 自问机制的**升级**——从"阶段切换自问"扩展到"全维度主动洞察"。

#### v2.0 灵魂三维度（决策模型升级）

| 维度 | 含义 | 来源 |
|---|---|---|
| 1. Decision Support System | calc = 帮用户决策 | user 2026-08-05 |
| 2. User-Centric Advisor | 用户视角 5 问 | user 2026-08-06 |
| **3. Proactive Co-Pilot** | **Claude 主动洞察 + 提议 + 共建** | **user 2026-08-06** |

#### 三层主动机制

**层 1: 周期性 scan**

| 时机 | 触发 | Claude 必做 |
|---|---|---|
| session 开幕 | 每个新 session 开场 | scan 项目状态 + 市场信号 + 未来 1-2 月趋势 → 主动反问 |
| session 中期 | Phase 中每完成 ~3-5 task | 主动找未覆盖场景，反问 user "还有什么？"|
| session 收尾 | 每次 ship 完成 | scan 下一阶段 / 外部信号 → 询问是否启动新 spec |

**层 2: 外部信号触发（market signal aware）**

Claude 必须主动监听:
- **AI 模型 release**（OpenAI 5.5→5.6 / Claude 4.5→4.6 / Gemini 升级）→ 影响 B 类别 8 AI cost 引擎
- **搜索引擎算法变**（Google helpful content / Core Update）→ 影响 SEO Phase
- **行业法规变**（GDPR / CCPA / 中国《数据安全法》）→ 影响 L 类别
- **关键开源库 release**（Astro 5.x / Tailwind 4.x major）→ 影响 stack
- **竞品变化**（Calculator.net / Omni Calculator 重大更新）→ 影响 Roadmap

发现信号 → **立即提议**（不是等 user 提）。

**层 3: 主动提议机制（co-creation 协议）**

```
Claude 发现"应该改的点"
    ↓
Claude 主动写：提议 + 背景 + 三选项 (A/B/C with 风险分析) + 推荐
    ↓
Claude 主动问 user "要不要做？"
    ↓
user 拍板 (拍 A/B/C 或"改 D")
    ↓
Claude 执行 (不擅自修改路线 / calc / Roadmap / Phase)
```

#### 强制约束

- Claude **必须**主动跑 3 层 scan，不能等 user 提（user 已明确"不要让我一个人决策系统"）
- Claude **不允许**擅自修改 calc / Roadmap / Phase（必须 user 拍板）
- Claude **不允许**跳过提议（"暂时没看到" = 视为未跑 scan）
- Claude 提议须含:**触发信号** + **影响范围** + **三选项** (含推荐) + **风险/收益分析**

#### 维度 3 scan 必显式声明

任何 P-series 提案 / spec / plan **必须**包含:
```
维度 3 scan: 基于信号 X / Y / Z
- AI 模型: ...
- 搜索算法: ...
- 法规变化: ...
- 关键库: ...
- 竞品: ...
```

缺这一段 = spec 不完整，必须补才能 ship。

#### 与 §12.5 关系

- §12.5 = **Phase 切换时** 主动自问（5 问）
- §12.6 = **全维度** 主动洞察（3 层 scan）+ 提议协议

§12.6 是 §12.5 的**超集**——Phase 切换自问是 §12.6 中"session 收尾"的一个触发时机，但不是全部。
- 自问结果作为 commit message 的一部分记录（便于 audit）

---

## 13. Theme-Calculator Roadmap（user 2026-08-06 敲定）

### 13.1 总体节奏（user 修正：从 20/年 → 200/年）

| 阶段 | 时长 | 新 calc | 累计 | AI 辅助 |
|---|---|---:|---:|---|
| **Phase 1** (KB4 ADR) | Day 1-7 | 0（升级 5 决策工具）| 100 | 低 |
| **Phase 2** (P140e SEO) | Day 7-21 | 0（5 篇博客）| 100 | 低 |
| **Phase 3** (Playbook 6 字段) | Day 21-90 | 0（标准化 100 calc）| 100 | 低 |
| **Phase 4** (主题簇方法论) | Day 90-365 | **100 新**（1 年）| 200 | 中（12.10 Intelligence Engine 辅助）|
| **Phase 5** (v2.5 Enterprise AI Native) | Day 365-730 | **200+ 新**（1 年）| 400+ | 高（10.AI Agent 全自动 + 人类审核）|
| **v3.0 启动** | Day 730+ | **500-1000/年**（Autonomous AI）| 5000-10000+ | 全自动（人类仅审核关键决策）|

### 13.2 Phase 4 主题预分配（100 新 calc，**AI 自动 + 人类审核**）

> ⚠️ user 2026-08-06 修正：v2.0 Phase 4 起 AI 自动扩展主题和工具，**不用现在人为指定具体 calc 名**。
> 
> 保留业务方向约束，删除具体 calc 列表，AI 自动发现。

#### AI 自动部分（80%）

按 v2.0 12.10 Topic Intelligence Engine + 12.04 Modeling + 12.06 Factory：

| 步骤 | AI Agent | 产出 |
|---|---|---|
| 1. 4 数据源采集 | Search/Market/Competitor/User Problem | 候选 Topic 池 |
| 2. Topic 自动发现 | Discovery Agent | 候选 Topic 列表 |
| 3. Topic 自动建模 | Modeling Agent | 21 字段 + 5 决策字段 |
| 4. engine 自动生成 | Factory Agent | Playbook 6 字段代码 |
| 5. 候选池 | Portfolio Agent | 每周 ~25 新 Topic |

#### 人类审核部分（20%）

每周 1 次 review（1-2 名人类，~2 小时/周）：

**业务方向约束**（保留 11 业务域缺口作为引导，**不指定具体 calc**）：

| 业务域 | 当前缺口 | AI 探索方向 |
|---|---:|---|
| **11.10 Supply Chain**（完全空白）| 0 | Procurement / Logistics / Vendor / Inbound / Outbound / Reverse（AI 自由发现具体 calc）|
| **11.06 HR** | 4 | Comp / Benefits / Ramp / Culture / Performance / Retention（AI 自由）|
| **11.01 Finance** | 8+ | Tax / Personal / Investment / Credit / Loan（AI 自由）|
| **11.02-05** | 30+ | Marketing/Sales/Customer/Product（AI 自由）|
| **11.09 Legal** | 4 | Compliance / Privacy / Contract / IP（AI 自由）|

**决策导向约束**（必须满足 v2.0 灵魂）：

- 21 字段 schema（含 `decision_output` / `decision_inputs` / `decision_risks` / `decision_alternatives` 5 个新决策字段）
- AI Confidence Score ≥ 0.85
- Topic Score 公式: `(Search × Biz × Intent × Expansion) ÷ Competition ≥ 阈值`

**用户视角约束**（v2.0 灵魂第二维度，见 §15）：

- **用户视角 5 问** 每个新 Topic 必须能回答
- 见 §15.2

**合规边界**：GDPR / 隐私 / 财务合规 / 不产出赌博类工具等

**1-click 批准 / 拒绝 / 修订** —— 每周 ~20 新 calc ship（每月 ~80-100）

### 13.3 Phase 5 新增节奏（200+/年，AI Agent 全自动）

v2.5 Enterprise AI Native 完整落地后：
- **AI Agent 全自动**：A1-A30 Agent System + 12.10 Intelligence Engine 自动发现 + 10.A2 Runtime 生成代码
- **人类审核**：每个新 calc 由 1-2 名人类审核（决策支持灵魂 + 用户视角 5 问 + 业务正确性）
- **每周 ~4 新 calc**：每月 ~17，1 年 200+
- **主题层自动填充**：每个新 calc 自动归档到对应 业务域/主题簇/主题
- **User-Centric Advisor 工作流**：每个新 calc 必须填"用户视角 5 问"评分

### 13.4 主题层预设（避免方向偏离）

按 v2.0 12.01 Topic Architecture 21 字段 schema + 5 决策字段（用户视角 5 问另算），每个新 calc **必须先建模**：
1. **id** / **slug** / **domain** / **theme_cluster** / **topic** / **business_question** / **formula** / **seo_keyword** / **commercial_intent** / **related_topics**（10 个核心字段）+ 11 个扩展字段
2. **decision_output**（v2.0 灵魂字段 1）: 这个工具帮用户做什么决策？
3. **decision_inputs**（灵魂字段 2）: 需要什么数据才能做决策？
4. **decision_risks**（灵魂字段 3）: 用户可能错过的风险点
5. **decision_alternatives**（灵魂字段 4）: 决策不同时的其他选择
6. **用户视角 5 问评分**（v2.0 灵魂第二维度）: 见 §15.2

**这 6 维度**是 v2.0 Decision Support System + User-Centric Advisor 的完整 schema——每个新 calc 必须填写。

### 13.5 v3.0 终极节奏（500-1000/年，Autonomous + Long-term Advisor）

Autonomous Decision Platform 完整落地后：
- AI 主动监控 + 主动建议 + 用户一键执行
- 每周 ~10-20 新 calc（每月 ~40-80）
- 1 年 500-1000+
- 人类角色从"开发者"转为"决策审核者 + User-Centric Advisor 治理者"
- **Technical Advisor Relationship**（§15.3）：每个用户都有"私人商业技术顾问"长期关系

---

## 14. Updated Ship Path（基于 200/年新基线）

```
Day 0 (2026-08-05): 本 spec ship
Day 1-7 (Phase 1): feature/phase-1-kb4-adr — KB4 ADR + 5 决策工具
Day 7-21 (Phase 2): feature/phase-2-p140e-seo — 5 篇决策博客
Day 21-90 (Phase 3): feature/phase-3-playbook-6-fields — 100 calc Playbook 6 字段
Day 90-365 (Phase 4): feature/phase-4-topic-cluster — 主题簇 + 100 新 calc（1 年）
Day 365-730 (Phase 5): feature/phase-5-v25-ai-native — v2.5 + 200+ 新 calc（1 年）
Day 730+ (v3.0): Autonomous Decision Platform — 500-1000 新 calc/年
```

### Acceptance Criteria 修订

#### Phase 4 完成（Day 365）
- [ ] 1-2 个示范 topic 完整建模
- [ ] Topic Score 公式 + Decision Value Score 公式实现
- [ ] 12.10 Intelligence Engine 演示
- [ ] **100 新 calc 已 ship**（按 §13.2 主题预分配）

#### Phase 5 完成（Day 730）
- [ ] v2.5 RFC v2.5 + ADR v2.5 实施
- [ ] A1-A30 Agent System 集成
- [ ] **Cognitive Layer 核心落地**
- [ ] **200+ 新 calc 已 ship**（按 §13.3 AI 自动生产）
- [ ] 6 阶段变现升级为 Decision Support 变现
- [ ] v2.0 OS 文档微调（user 触发）