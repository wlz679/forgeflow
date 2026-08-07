# P140e — Blog Content Strategy Design (DRAFT)

> **Status:** DRAFT. Pending user decision on §9 Open Questions. When approved, the next skill invoked is `superpowers:writing-plans` (per ForgeFlowKit superpowers workflow).

---

## 1. Goal

为 ForgeFlowKit 100 工具的博客内容策略制定**数据驱动的扩量 + 深度升级方案**。基于 90 天 GSC 数据 + 工具关键词分析 + 商业价值排序，决定：

- 是否扩量（每工具 1 篇 → 3-5 篇）
- 哪些工具优先做深度升级
- 现有 100 篇模板博客如何升级

## 2. Background

### 2.1 当前博客状况

- 100 篇博客，每工具 1 篇，5 H2 模板（What is / Why / How / Tips / Get Started）
- 平均 410 字 / 篇
- 工具 keywords 平均覆盖率 **37.3%**（**0 篇达到 100% 覆盖**）
- 90 天 GSC 总展示 = 249 / 92 queries / 总点击 = 5

### 2.2 已有优化层

- **P140d H1 refresh**（shipped `1d8943c`, 2026-08-04）：65 B/C-class 工具 H1 加入 2026 + query intent modifier
- **P140d-T1 17 slugs**（DRAFT, 2026-08-05，今天）：包括 `csat-calculator`（GSC #1: 14 imp @ pos 83.5）

**P140e 是下一层**：内容深度 + 数量策略（H1/标题层之上）。

### 2.3 调研结论

P140e 调研（2026-08-05）跑通 3 表分析：
- **表 1**: 92 GSC query 中 18 COVERED / 40 REWRITE_DEPTH / 34 NEW_SPOKE
- **表 2**: 100 工具 × 博客覆盖，平均 37.3%，最差 0%
- **表 3**: Top 20 商业价值排序（D+C 类占主导，csat/roas GSC 实际带量）

**核心建议**：**先做 5 篇差异化深度博客**，不扩量。同时升级 100 篇模板到 8 H2 + 1500 字 + ≥80% 关键词覆盖。

## 3. Data Sources

| 源 | 路径 | 说明 |
|---|---|---|
| GSC 90 天 | `C:\Users\元始天尊\Downloads\forgeflowkit.com-Performance-on-Search-2026-08-04.xlsx` | 4 sheet: queries / pages / countries / devices |
| 工具 keywords | `D:/E/独立站/youtube-tools/src/data/tools/*.ts`（18 文件） | 100 工具 × 6-8 keywords |
| 博客内容 | `D:/E/独立站/youtube-tools/src/content/blog/*.md`（100 文件） | frontmatter + body |
| 调研脚本 | `D:/E/独立站/youtube-tools/docs/superpowers/_research/p140e-blog-strategy/parse-*.mjs` | 可重跑 |
| 调研数据 | `D:/E/独立站/youtube-tools/docs/superpowers/_research/p140e-blog-strategy/*.json` | 6 个表（92+100+100 行） |

**重跑命令**（更新 GSC 后可重跑）：
```bash
cd D:/E/独立站/youtube-tools
pnpm add -D xlsx  # 临时依赖
node docs/superpowers/_research/p140e-blog-strategy/parse-gsc.mjs
node docs/superpowers/_research/p140e-blog-strategy/parse-tools.mjs
node docs/superpowers/_research/p140e-blog-strategy/parse-blogs.mjs
node docs/superpowers/_research/p140e-blog-strategy/cross-analyze.mjs
```

## 4. Findings

### 4.1 表 1: GSC query × 现有博客覆盖（92 行）

**Action 分布**:

| Action | 数量 | 说明 |
|---|---:|---|
| `COVERED` | 18 | slug 精确命中 |
| `REWRITE_DEPTH` | 40 | 关键词模糊命中，需深化 |
| `NEW_SPOKE` | 34 | 无匹配内容 |

**Top 15 impressions query**:

| # | imp | query | action | matched tool |
|---:|---:|---|---|---|
| 1 | 25 | `forgeflowkit.com` | NEW_SPOKE | — (品牌词) |
| 2 | 17 | `cost growth tool` | NEW_SPOKE | — |
| 3 | 14 | `csat calculator` | COVERED | csat-calculator |
| 4 | 9 | `roas calculator` | COVERED | roas-calculator |
| 5 | 8 | `stripe 手续费` | NEW_SPOKE | — (中文) |
| 6 | 8 | `csat calculator online` | COVERED | csat-calculator |
| 7 | 8 | `csat score calculator` | REWRITE_DEPTH | csat-calculator |
| 8 | 8 | `customer satisfaction metric calculator` | REWRITE_DEPTH | csat-calculator |
| 9 | 7 | `csat percentage calculator` | REWRITE_DEPTH | csat-calculator |
| 10 | 6 | `companies hiring with refresh grants` | NEW_SPOKE | — |
| 11 | 6 | `content marketing roi calculator` | COVERED | (CAC/ROAS/CM-ROI) |
| 12 | 6 | `customer satisfaction calculator` | REWRITE_DEPTH | csat-calculator |
| 13 | 5 | `stripe手续费` | NEW_SPOKE | — (中文) |
| 14 | 5 | `arr valuation calculator` | NEW_SPOKE | — |
| 15 | 5 | `calculate csat score` | REWRITE_DEPTH | csat-calculator |

**关键 gap**:
- 12 个 csat 长尾 query 共 69 imp（占总量 28%），4 个 COVERED，8 个 REWRITE_DEPTH
- 13 imp 中文 query（`stripe 手续费` / `stripe手续费`）无匹配
- 17 imp `cost growth tool` + 6 imp `companies hiring with refresh grants` 无匹配

**Top pages by impressions**:

| imp | landing page | pos |
|---:|---|---:|
| 69 | `/en/` (首页) | 30.71 |
| 57 | `/en/solopreneur-csat-calculator/` | 86.07 |
| 32 | `/en/blog/best-solopreneur-csat-calculator/` | 79.09 |
| 26 | `/zh/solopreneur-stripe-fee-calculator/` | 27.65 |
| 17 | `/en/solopreneur-article-helpfulness-calculator/` | 4.35 |
| 17 | `/zh/blog/best-solopreneur-claude-api-cost-calculator/` | 32.47 |
| 16 | `/en/solopreneur-roas-calculator/` | 82.81 |
| 13 | `/en/customer-support/` | 4.15 |
| 13 | `/en/solopreneur-ai-api-cost-comparison/` | 11.23 |
| 11 | `/en/blog/best-solopreneur-equity-refresh-calculator/` | 27.82 |

完整 92 行：`docs/superpowers/_research/p140e-blog-strategy/table1-gsc-blog-coverage.json`

### 4.2 表 2: tool × keywords × 博客覆盖（100 行）

**Coverage 分布**:

| Coverage % | 工具数 |
|---:|---:|
| 0% | 3 |
| 1-25% | 39 |
| 26-50% | 40 |
| 51-75% | 17 |
| 76-99% | 1 |
| 100% | **0** |

**Worst 10**（覆盖率最低）:

| tool_slug | cat | coverage |
|---|---|---:|
| `remote-vs-office-calculator` | E | 0/8 |
| `fully-loaded-employee-cost-calculator` | H | 0/9 |
| `cost-per-support-ticket-calculator` | T | 0/9 |
| `ltv-by-channel-calculator` | M | 1/10 |
| `coupon-attribution-calculator` | M | 1/10 |
| `breach-notification-cost-calculator` | L | 1/10 |
| `time-to-productivity-calculator` | H | 1/9 |
| `comp-banding-calculator` | H | 1/9 |
| `attrition-cost-calculator` | H | 1/9 |
| `article-helpfulness-calculator` | K | 1/9 |

**根因**: 5 H2 模板只在 "What is X" 一处 swap 工具名。"fully loaded employee cost" / "data breach cost" / "csat percentage formula" 等长尾词根本不出现。

**推荐补强**:
- `CREATE_BLOG`: 0（100 工具都已有 1 篇）
- `DEPTH_REWRITE`: 68（coverage < 50%）
- `EXPAND_BODY_TO_1500W`: 100（全部 < 800 字）
- `ADD_BENCHMARK_USE_CASES_H2`: 100（全部只 5 H2）

完整 100 行：`docs/superpowers/_research/p140e-blog-strategy/table2-tool-blog-coverage.json`

### 4.3 表 3: Top 20 商业价值排序

**公式**（composite max = 30）:

```
composite = 0.50 × category_weight + 0.25 × gsc_weight + 0.25 × commercial_keyword_density
```

| 维度 | 权重 | 计分 |
|---|---|---|
| 类别 | 50% (×15 max) | S/C/D = 10 · B/A = 8 · R/M/F/P/H/T = 6 · O/K/L = 5 |
| GSC impressions | 25% (×10 max) | 0 → 0 · 1-5 → 5 · 6-20 → 10 · 21+ → 20 |
| 商业关键词密度 | 25% (×5 max) | keywords 含 {pricing, cost, revenue, roi, churn, conversion, valuation, fee, rate, salary, price, pay, expense, margin, ltv, cac, mrr, arr} 比例 |

**Top 10**:

| # | tool_slug | cat | score | 备注 |
|---:|---|---|---:|---|
| 1 | `project-profitability-calculator` | D | 23.3 | 类别满分 + 商业词密度高 |
| 2 | `cac-calculator` | C | 22.5 | |
| 3 | `course-pricing-calculator` | D | 22.5 | |
| 4 | `freelance-rate-calculator` | D | 22.5 | |
| 5 | `hourly-vs-fixed-calculator` | D | 22.5 | |
| 6 | `ltv-calculator` | C | 21.7 | |
| 7 | `win-rate-by-stage-calculator` | S | 20.5 | |
| 8 | `csat-calculator` | T | 20.3 | GSC 69 imp（28% total） |
| 9 | `roas-calculator` | M | 20.0 | GSC 28 imp |
| 10 | `churn-rate-calculator` | A | 19.5 | |

**Bottom 5**（低优先投资，仅 SEO meta 优化）:

| tool_slug | cat | score |
|---|---|---:|
| `deflection-quality-calculator` | K | 8.1 |
| `productivity-score` | E | 7.5 |
| `inventory-turnover-calculator` | O | 7.5 |
| `article-freshness-calculator` | K | 7.5 |
| `gdpr-fine-calculator` | L | 7.5 |

完整 100 排序：`docs/superpowers/_research/p140e-blog-strategy/top20-business-value.json`

## 5. Business Value Scoring Rubric

排序准则（用户已批准商业价值权重）。要点:

- **类别权重最大（50%）** — D+C 类（freelance + valuation）即使零 GSC 也能进 Top 20。这是用户指令"按商业价值"的直接体现。
- **GSC 是校准（25%）** — 识别实际有搜索量的工具（csat/roas 借此压过 D 类低 GSC 工具）
- **商业关键词密度（25%）** — 关键词里"价格/成本/收益"类词多的工具优先

**Threshold 映射**:

| Composite | 推荐博客数 |
|---:|---|
| ≥ 25 | 5 |
| 18-25 | 3 |
| < 18 | 1 |

**Top 20 内所有工具** ≥ 18，因此推荐 3 篇博客（1 deep + 2 spoke）。

## 6. Recommended Strategy

### 6.1 短期（≤ 1 个月）: 5 篇差异化深度博客

**理由**: CSAT 一家独大（69 imp / 28% total），是立即可做的最高 ROI 升级。同时验证"深度博客"模式是否 work。

| # | tool_slug | 目标 query | 期望效果 |
|---:|---|---|---|
| 1 | `csat-calculator` | 12 个 csat 长尾 query | 28% 总展示覆盖；pos 86 → 30-50 |
| 2 | `roas-calculator` | 5 个 ROAS 长尾 query | 28 imp → 5-10 点击 |
| 3 | `project-profitability-calculator` | Top 20 #1 | 0 imp → 3-5 imp + 1-2 点击 |
| 4 | `cac-calculator` | Top 20 #2 | 0 imp → 3-5 imp |
| 5 | `churn-rate-calculator` | Top 20 #10 | 0 imp → 3-5 imp |

**每篇目标**:
- 1500-2000 字（zh: ≥ 1000 字）
- 8 H2（5 现有 + 3 新: Formula sheet + Benchmarks + Worked examples）
- 关键词覆盖 ≥ 80%（vs 当前 37.3% 平均）

### 6.2 中期（2-3 个月）: 剩余 Top 15 + 中文导向

- 剩余 15 个 Top 20 工具（按商业价值序贯）
- ~~中文试水 1-2 篇~~（**不做** — user 客户全在海外，zh 站点仅内部使用，参见 §9.2）
- `companies hiring with refresh grants` 信息型内容（H 类，6 imp）

### 6.3 长期（≥ 3 个月）: 100 篇统一升级 + CI guard

- 100 篇模板升级到 8 H2 + 1500 字 + ≥80% 关键词覆盖
- 加 3 个 CI guard（防御性）:
  - `tests/blog-coverage-guard.test.ts`: assert blog keyword 覆盖 ≥ 50%
  - `tests/blog-tool-slug-guard.test.ts`: assert `frontmatter.toolSlug` 引用真实 tool
  - `tests/blog-h2-guard.test.ts`: assert 至少 8 H2

### 6.4 关键 Risk

| Risk | 缓解 |
|---|---|
| AI 生成内容被 Google 判为 low-quality | 严格 8 H2 + 1500 字 + 真实数据/案例（不空话） |
| 中英文博客标准差异 | zh 强制 ≥ 1000 字（中文密度高） |
| 短时间大量扩量被视作 link scheme | 5 篇/批，间隔 2-4 周 |
| 模板博客升级翻车（P58 模板被改） | 走 codegen 重写全部 100 篇（一次性），不逐个手工改 |

## 7. Top 20 Candidates

| # | tool_slug | cat | score | 推荐博客数 |
|---:|---|---:|---:|---:|
| 1 | project-profitability-calculator | D | 23.3 | 3 |
| 2 | cac-calculator | C | 22.5 | 3 |
| 3 | course-pricing-calculator | D | 22.5 | 3 |
| 4 | freelance-rate-calculator | D | 22.5 | 3 |
| 5 | hourly-vs-fixed-calculator | D | 22.5 | 3 |
| 6 | ltv-calculator | C | 21.7 | 3 |
| 7 | win-rate-by-stage-calculator | S | 20.5 | 3 |
| 8 | csat-calculator | T | 20.3 | 3 |
| 9 | roas-calculator | M | 20.0 | 3 |
| 10 | churn-rate-calculator | A | 19.5 | 3 |
| 11 | arr-multiple-valuation-calculator | C | 19.4 | 3 |
| 12 | stripe-fee-calculator | C | 18.8 | 3 |
| 13 | safe-convertible-note-calculator | C | 18.8 | 3 |
| 14 | deepseek-api-cost-calculator | B | 18.5 | 3 |
| 15 | sales-velocity-calculator | S | 18.5 | 3 |
| 16 | saas-valuation-calculator | C | 18.0 | 3 |
| 17 | pipeline-value-calculator | S | 18.0 | 3 |
| 18 | quota-attainment-calculator | S | 18.0 | 3 |
| 19 | pipeline-coverage-calculator | S | 18.0 | 3 |
| 20 | openai-token-calculator | B | 17.8 | 1 |

## 8. Ship Path

1. **Day 0（今天）**: spec 批准，调研产出归档
2. **Day 1-3**: 写 5 篇深度博客（csat-calculator 优先）
3. **Day 7-14**: 观察 GSC 数据变化（csat pos 是否提升）
4. **Day 14-21**: 写剩余 Top 15 - 5 = 10 篇博客
5. **Day 21-30**: 写中文试水 1-2 篇 + GSC 复盘
6. **Day 30+**: 100 篇统一升级 + CI guard（中期任务）

## 9. Open Questions (待 user 决定)

### 9.1 总博客扩量？ 关闭（已决策: 先深化 5 篇）

- **决策**: 先深化 5 篇深度博客（csat/roas/project-profitability/cac/churn），其他 95 篇保持现状
- **理由**: 100 篇模板都在 37% 覆盖度，先深化再扩新类目；先用 5 篇验证"深度博客"模式是否 work
- **关联**: §6.1 短期方案直接对应此决策

### 9.2 ~~中文博客是否投入？~~ 关闭（已决策: 不做）

- **决策**: 不做中文博客
- **理由**: user 客户全在海外，zh 站点仅用于内部参考（user 自己看）
- **影响**:
  - §6.2 中期方案：删除"中文试水 1-2 篇"（已更新）
  - §9.4 关于 13 imp 中文 `stripe 手续费` query：跳过（不投入 SEO 资源）
  - 调研脚本 `_research/p140e-blog-strategy/` 保留 13 imp 中文数据作为 reference（不作为行动项）

### 9.3 `recommended_blog_count=3-5` 入 spec？ 关闭（已决策: Top 20 各 3 篇）

- **决策**: Top 20 工具每工具 3 篇（1 deep + 2 spoke），其他 80 工具保持 1 篇
- **理由**: 破 P58 锁定 1 篇/工具上限，差异化升级
- **影响**:
  - Top 20 工具 = 20 × 3 = 60 篇博客（5 篇短期 + 15 篇中期）
  - 其他 80 工具 = 80 × 1 = 80 篇（保持现状）
  - 合计 140 篇博客（vs 100 篇当前）
  - 商业价值 < 18 的 80 工具：仅做 SEO meta 优化，不写额外博客
- **关联**: §6.1 + §6.2 短期 + 中期方案对应此决策

### 9.4 `NEW_SPOKE` 34 个怎么处理？ 关闭（已决策: 1 篇深度博客接住 csat 8 个长尾）

- 34 个无匹配 query 中:
  - csat 长尾 8 个 → csat 1 篇深度博客可接住（**Q4 决策**）
  - 中文 13 imp → **跳过**（参见 §9.2）
  - 信息型 13 个（`cost growth tool` / `companies hiring with refresh grants` 等）→ **暂不处理**
- **决策**: 1 篇深度博客接住 csat 8 个长尾；其他 26 个 NEW_SPOKE 暂不接
- **关联**: Q1 短期方案中的 csat 深度博客承担此任务

## 10. Acceptance Criteria (执行时)

1. 5 篇深度博客（csat/roas/project-profitability/cac/churn）已 ship
2. 每篇 ≥ 1500 字 + 8 H2 + 关键词覆盖 ≥ 80%
3. pnpm check 0 错误
4. 调研临时脚本已归档到 `_research/`（保留 — 可重跑）
5. `xlsx` 临时依赖已清理（`pnpm remove xlsx`）
6. 单 commit (或按 §6.1 拆 5 commit)

## 11. References

- P140d H1 refresh spec: `docs/superpowers/specs/2026-08-04-h1-keyword-refresh-design.md`
- P140d-T1 (csat + 17 misclassified slugs): `docs/superpowers/specs/2026-08-05-p140d-t1-csat-and-friends-design.md`
- P140d H1 refresh commit: `1d8943c`
- 调研数据: `docs/superpowers/_research/p140e-blog-strategy/`
- GSC export: `C:\Users\元始天尊\Downloads\forgeflowkit.com-Performance-on-Search-2026-08-04.xlsx`
- P58 blog coverage baseline: `p58-blog-coverage-complete-shipped.md`

---

## 12. Cleanup note (non-spec)

- 调研 `cross-analyze.mjs` 留有 sub-agent 修过公式 bug 后的 JS 语法残留（tsc 警告但不影响 build，因为不在 src/ + tests/）。
- `xlsx` 是 sub-agent 临时装的依赖，spec 批准后 `pnpm remove xlsx` 清理。
- 调研脚本 + JSON 数据保留在 `_research/` 作为研究证据，可重跑。

## 13. AIO-Aware Amendment (维度 3 §12.6 Action C — user 拍板 2026-08-07)

> ⚠️ **本节是 P140e spec 的关键升级**——基于维度 3 §12.6 web-scan 发现的 Google AI Overview 默认化危机（2026-07-10）。

### 13.1 关键市场信号（来自维度 3 scan）

| 信号 | 日期 | 影响 |
|---|---|---|
| Google AI Overview 成为 default | 2026-07-10 | 传统结果 CTR ↓58%；68% 搜索无点击 |
| 仅 1% 点击 AI answer 内源链接 | 2026-07 | 传统 SEO 价值 ↓ |
| Human-edited 内容排名 8x 优势 | Semrush 42000 文章研究 | 验证"深度博客"策略 |
| Common Sense Media: AI Mode "biggest upgrade in 25 years" | 2026-05 | 市场转折点确认 |

**结论**: P140e 原 §6.1-6.3"5 篇深度博客 + Top 15 + 中文试水"策略**方向正确但需调整**——从"高排名 → 高 traffic"转向"AI Overview 引用率 → trust → 转化"。

### 13.2 P140e 5 篇深度博客调整（保持 §6.1 范围，加 C2 元素）

| 调整 | 原 spec | AIO-aware 升级 |
|---|---|---|
| **schema.org FAQPage** | ❌ | ✅ **必填**（AI Overview 偏好结构化 FAQ） |
| **comparison table** | ❌ | ✅ **必填**（ForgeFlowKit vs 行业 baseline vs 替代方案） |
| **EEAT 标注**（Author bio / Source / Updated date） | ❌ | ✅ **必填**（Human-edited 8x 优势需显式证明） |
| **Decision Recommendation 段** | 部分 | ✅ **必填**（与 v2.0 灵魂对齐 — 决策支持而非单纯解释） |
| **跨 calc 互联** | 弱 | ✅ **强**（每个 blog 文末"下一步用 [X Calculator] 验证"按钮） |
| **长度** | 当前 ~1500 字 | **3000-4000 字**（AI Overview 偏好 comprehensive sources） |

### 13.3 100 blog 内容审计 + EEAT 标注层（P141 候选，user 拍板启动）

- 100 现有 blog（`src/content/blog/<slug>.md`）需 audit:
  - 是否有人类编辑痕迹（Author bio / Sources / Decision 段）
  - 是否含 schema.org FAQPage
  - 是否含 comparison table
- 不达标的 blog：P141 单独 plan 重写（C3 渐进）
- **触发条件**: Phase 2 (5 篇深度) ship 后 + 流量监测数据出炉（Day 14-21 GSC 数据）

### 13.4 P140e §8 Ship Path 调整

**原 §8** (Day 0-30):
- Day 1-3: 5 篇深度博客
- Day 7-14: 观察 GSC
- Day 14-21: 写 Top 15 - 5 = 10 篇
- Day 21-30: 中文试水 + 复盘
- Day 30+: 100 篇统一升级

**AIO-aware §13.4** (Day 0-30):
- Day 1-3: **5 篇深度博客（按 §13.2 AIO-aware 格式 — FAQPage schema + comparison table + EEAT + Decision Recommendation + 跨 calc 互联）**
- Day 7-14: 观察 GSC **+ AIO 引用率**（Ahrefs/Search Console 是否有 AI Overview 引用）
- Day 14-21: 写 Top 15 - 5 = 10 篇（AIO-aware 格式）
- Day 21-30: 删中文试水（§9.2 已关闭），加 **100 blog EEAT audit**（P141 候选）
- Day 30+: 100 篇统一升级（按 P141 渐进）

### 13.5 不重 brainstorm 理由（user 拍板 2026-08-07）

P140e spec **不重写**，只在原 spec 加 §13 章节：
- 原 §6.1-6.3 短期/中期/长期 范围**不变**
- §6.4 Risk 已隐含 AIO 影响，新增 §13.4 显式化
- §9 Open Questions 已关闭（不引入新问题）
- §8 Ship Path 微调（非重排）

**唯一新增决策**: 5 篇深度 blog 加 §13.2 6 项 AIO-aware 元素（schema / table / EEAT / Decision / cross-link / 3000-4000 字）。

**这一变更不需要重新 brainstorm**——属于"市场信号触发的 spec 扩展"，按 CLAUDE.md 红线维度 3 §12.6 主动提议 + user 拍板执行。

### 13.6 与 §6.4 Risk 关联

§6.4 原 Risk:
- 5 篇博客投入不达预期
- Top 20 商业价值排序有偏差
- 中文投入回报低

§13.6 新增 Risk:
- **AIO 引用率不达预期**: 即使 5 篇质量高，AI Overview 不引用 → 流量仍 ↓
- **Schema 错误**: FAQPage 结构化数据错误可能被 Google 忽略
- **EEAT 审核延迟**: Google 重新审核 EEAT 信号可能滞后 1-2 月

**缓解**:
- Day 7-14 观察 GSC **+ AIO 引用率**双指标
- Schema 验证: P141 加入 schema.org 校验 guard
- EEAT: 显式标注 + 来源引用（每个数据点都标）

---

**Date**: 2026-08-07
**Authors**: [Phase 1 KB4 ADR scaffold + 维度 3 §12.6 Action C amendment]
**Related**: §6.1 短期方案 + §8 Ship Path + §12.6 维度 3 强制约束
