# Engines Index

> **目录索引** — 100 个 calculators across 15 categories, 按 category 子目录分组，按 slug 字母序。
> **总数验证:** `EXPECTED_ENGINE_COUNT = 100` (锁定于 `tests/engine-count.ts`)
> **最后更新:** 2026-07-19 (P39 batch)

---

## 顶层结构

```
src/engines/
├── INDEX.md (本文件)
├── index.ts (root registry barrel — imports 16 barrels below)
└── 15 category subdirs:
    ├── ai-cost/         (8 engines)
    ├── cost/            (5)
    ├── customer-support/ (6)
    ├── freelance/       (6)
    ├── hiring-team/     (6)
    ├── investment/      (5)
    ├── knowledge/       (6)
    ├── legal-compliance/ (6)
    ├── marketing/       (8)
    ├── operations/      (6)
    ├── product-analytics/ (6)
    ├── real-estate/     (6)
    ├── retention/       (6)
    ├── saas/            (5)
    ├── sales/           (6)
    └── valuation/       (9)
```

| Letter | Category | Slug Count | v3 变体 |
|---|---|---|---|
| **B** | (`src/engines/cost/`, `valuation/`, `saas/`, `investment/`, `freelance/`) | 30 | Business |
| **C** | (`src/engines/cost/` cross-mapped) | included above | Business |
| **D** | (cost sub-mapping) | included above | Business |
| **E** | (`freelance/` partial) | included above | Business |
| **F** | (`src/engines/freelance/`) | 3 | Business |
| **H** | (`src/engines/hiring-team/`) | 6 | Business |
| **I** | (`src/engines/investment/`) | 5 | Business |
| **K** | (`src/engines/knowledge/`) | 6 | Business |
| **L** | (`src/engines/legal-compliance/`) | 6 | Business |
| **M** | (`src/engines/marketing/`) | 8 | Business |
| **O** | (`src/engines/operations/`) | 6 | Business |
| **P** | (`src/engines/product-analytics/`) | 6 | Business |
| **R** | (`src/engines/retention/` + `real-estate/`) | 6 + 6 = 12 | Business |
| **S** | (`src/engines/sales/` + `saas/` + `customer-support/`) | 6 + 5 + 6 = 17 | Business |
| **T** | (`src/engines/customer-support/`) | included above | Business |
| **V** | (`src/engines/valuation/`) | 13 | Business |
| **AI** | (`src/engines/ai-cost/`) | 8 | AI Cost |

> **重要:** 字母映射 (B/C/D/E/...) 是 site nav 的逻辑分类；`src/engines/` 的物理子目录未必 1:1 对应 (e.g. `'B'` 在物理目录分散到 cost + valuation + saas + investment + freelance)。CLAUDE.md §Project Overview 是字母级别的 source of truth。

---

## 1 · `ai-cost/` — AI token pricing & inference cost (8 engines)

| Slug | Title |
|---|---|
| `ai-api-cost-comparison` | AI API Cost Comparison |
| `ai-image-generation-cost-calculator` | AI Image Generation Cost Calculator |
| `ai-training-cost-estimator` | AI Training Cost Estimator |
| `claude-api-cost-calculator` | Claude API Cost Calculator |
| `deepseek-api-cost-calculator` | DeepSeek API Cost Calculator |
| `gemini-api-cost-calculator` | Gemini API Cost Calculator |
| `gpu-cloud-cost-calculator` | GPU Cloud Cost Calculator |
| `openai-token-calculator` | OpenAI Token Calculator |

**v3 变体:** AI Cost (per CLAUDE.md §"v3 standard — two variants")
**Data source:** 8 of these read from `src/data/ai-pricing.json` (single source of truth)

---

## 2 · `cost/` — HR / Cost (5 engines)

| Slug | Title |
|---|---|
| `employee-cost-calculator` | Employee Cost Calculator |
| `meeting-cost-calculator` | Meeting Cost Calculator |
| `productivity-score` | Productivity Score Calculator |
| `remote-vs-office-calculator` | Remote vs In-Office Cost Calculator |
| `saas-pricing-planner` | SaaS Pricing Planner |

---

## 3 · `customer-support/` — Customer Support / CS Ops (6 engines)

| Slug | Title |
|---|---|
| `cost-per-support-ticket-calculator` | Cost-per-Support-Ticket |
| `csat-calculator` | CSAT (Customer Satisfaction) Calculator |
| `deflection-rate-calculator` | Self-Service Deflection Rate Calculator |
| `first-response-time-calculator` | First Response Time SLA Calculator |
| `resolution-time-calculator` | Resolution Time Calculator |
| `support-capacity-planning-calculator` | Support Team Capacity Planning Calculator |

**Persona:** Mid-market B2B SaaS CS Ops, $10M-$50M ARR

---

## 4 · `freelance/` — Freelance / Pricing (6 engines)

| Slug | Title |
|---|---|
| `affiliate-income-calculator` | Affiliate Income Calculator |
| `course-pricing-calculator` | Course Pricing Calculator |
| `email-list-revenue-calculator` | Email List Revenue Calculator |
| `freelance-rate-calculator` | Freelance Rate Calculator |
| `hourly-vs-fixed-calculator` | Hourly vs Fixed Rate Calculator |
| `project-profitability-calculator` | Project Profitability Calculator |

---

## 5 · `hiring-team/` — Hiring / Team Operations (6 engines)

| Slug | Title |
|---|---|
| `attrition-cost-calculator` | Attrition Cost |
| `comp-banding-calculator` | Compensation Banding |
| `equity-refresh-calculator` | Equity Refresh Grant |
| `fully-loaded-employee-cost-calculator` | Fully-Loaded Employee Cost |
| `productivity-ramp-curve-calculator` | Productivity Ramp Curve |
| `time-to-productivity-calculator` | Time to Productivity (Ramp Time) |

**Persona:** People Ops / Talent, scaling-team context

---

## 6 · `investment/` — Investment / Finance (5 engines)

| Slug | Title |
|---|---|
| `compound-interest-calculator` | Compound Interest Calculator |
| `equity-dilution-calculator` | Equity Dilution Calculator |
| `freelance-tax-calculator` | Freelance Tax Calculator |
| `sponsorship-rate-calculator` | Sponsorship Rate Calculator |
| `time-value-calculator` | Time Value Calculator |

---

## 7 · `knowledge/` — Knowledge / Documentation (6 engines)

| Slug | Title |
|---|---|
| `article-freshness-calculator` | Article Freshness |
| `article-helpfulness-calculator` | Article Helpfulness Score |
| `deflection-quality-calculator` | Deflection Quality |
| `documentation-roi-calculator` | Documentation ROI |
| `kb-coverage-rate-calculator` | KB Coverage Rate |
| `search-effectiveness-calculator` | Search Effectiveness |

**Persona:** DevRel / Tech Writer / Knowledge Manager

---

## 8 · `legal-compliance/` — Legal & Compliance (6 engines)

| Slug | Title |
|---|---|
| `breach-notification-cost-calculator` | Data Breach Notification Cost |
| `cmp-roi-calculator` | CMP ROI |
| `consent-revenue-impact-calculator` | Cookie Consent Revenue Impact |
| `dpa-cost-calculator` | DPA Negotiation Cost |
| `dsar-cost-calculator` | DSAR Processing Cost |
| `gdpr-fine-calculator` | GDPR Fine Risk |

**Persona:** DPO / Privacy Officer, $10M-$50M ARR. Anchors: GDPR Art. 83/15/28/33-34 + ePrivacy Recital 32 + CCPA.

---

## 9 · `marketing/` — Marketing / Analytics (8 engines)

| Slug | Title |
|---|---|
| `cart-abandonment-cost-calculator` | Cart Abandonment Cost Calculator |
| `cohort-retention-calculator` | Cohort Retention Calculator |
| `content-marketing-roi-calculator` | Content Marketing ROI Calculator |
| `coupon-attribution-calculator` | Coupon Attribution Calculator |
| `email-campaign-roi-calculator` | Email Campaign ROI Calculator |
| `funnel-value-calculator` | Funnel Value Calculator |
| `ltv-by-channel-calculator` | LTV by Channel Calculator |
| `roas-calculator` | ROAS Calculator |

---

## 10 · `operations/` — Operations / Inventory (6 engines)

| Slug | Title |
|---|---|
| `carrying-cost-calculator` | Carrying Cost Calculator |
| `fulfillment-cost-calculator` | Order Fulfillment Cost Calculator |
| `inventory-turnover-calculator` | Inventory Turnover Calculator |
| `reorder-point-calculator` | Reorder Point Calculator |
| `stockout-cost-calculator` | Stockout Cost Calculator |
| `supplier-scorecard-calculator` | Supplier Performance Scorecard Calculator |

---

## 11 · `product-analytics/` — Product Analytics (6 engines)

| Slug | Title |
|---|---|
| `activation-rate-calculator` | Activation Rate |
| `feature-adoption-calculator` | Feature Adoption Rate |
| `funnel-step-calculator` | Funnel Step Conversion Analyzer |
| `power-user-curve-calculator` | Power User Pareto Curve |
| `stickiness-calculator` | Stickiness (DAU/MAU) |
| `time-to-value-calculator` | Time-to-Value (TTV) |

---

## 12 · `real-estate/` — Real-Estate / Property (6 engines)

| Slug | Title |
|---|---|
| `brrrr-calculator` | BRRRR Calculator |
| `cap-rate-calculator` | Cap Rate Calculator |
| `dscr-calculator` | DSCR Calculator (Debt Service Coverage Ratio) |
| `mortgage-calculator` | Mortgage Calculator |
| `rental-yield-calculator` | Rental Yield / Cash-on-Cash Calculator |
| `rent-vs-buy-calculator` | Rent-vs-Buy Calculator |

---

## 13 · `retention/` — Retention / Customer Success (6 engines)

| Slug | Title |
|---|---|
| `customer-health-score-calculator` | Customer Health Score Calculator |
| `expansion-revenue-calculator` | Expansion Revenue Calculator |
| `grr-calculator` | GRR Calculator |
| `logo-churn-rate-calculator` | Logo Churn Rate Calculator |
| `nrr-calculator` | NRR Calculator |
| `renewal-rate-calculator` | Renewal Rate Calculator |

---

## 14 · `saas/` — SaaS Operations (5 engines)

| Slug | Title |
|---|---|
| `burn-rate-calculator` | Burn Rate Calculator |
| `churn-rate-calculator` | Churn Rate Calculator |
| `market-size-estimator` | Market Size Estimator |
| `mrr-calculator` | MRR Calculator |
| `revenue-projector` | Revenue Projector |

---

## 15 · `sales/` — Sales / CRM (6 engines)

| Slug | Title |
|---|---|
| `acv-calculator` | ACV Calculator |
| `pipeline-coverage-calculator` | Pipeline Coverage Calculator |
| `pipeline-value-calculator` | Pipeline Value Calculator |
| `quota-attainment-calculator` | Quota Attainment Calculator |
| `sales-velocity-calculator` | Sales Velocity Calculator |
| `win-rate-by-stage-calculator` | Win Rate by Stage Calculator |

---

## 16 · `valuation/` — Valuation / Pricing (9 engines)

| Slug | Title |
|---|---|
| `arr-multiple-valuation-calculator` | ARR Multiple / Valuation Multiplier Calculator |
| `break-even-calculator` | Break-Even Calculator |
| `burn-multiple-rule-of-40-calculator` | Burn Multiple / Rule of 40 Calculator |
| `cac-calculator` | CAC Calculator |
| `ltv-calculator` | LTV Calculator |
| `saas-valuation-calculator` | SaaS Valuation Calculator |
| `safe-convertible-note-calculator` | SAFE / Convertible Note Calculator |
| `stripe-fee-calculator` | Stripe Fee Calculator |
| `unit-economics-calculator` | Unit Economics Calculator |

> **注意:** `valuation/` 收窄到 9 engines（Freelance/Pricing 类 engines 已在 P59 搬到 `freelance/`，SaaS Pricing Planner 已搬到 `cost/`）。Course pricing / Email list revenue / Project profitability / SaaS Pricing Planner 不再在此处。

---

## Category 计数 summary

| # | Category (slug) | Engines |
|---|---|---|
| 1 | ai-cost/ | 8 |
| 2 | cost/ | 5 |
| 3 | customer-support/ | 6 |
| 4 | freelance/ | 6 |
| 5 | hiring-team/ | 6 |
| 6 | investment/ | 5 |
| 7 | knowledge/ | 6 |
| 8 | legal-compliance/ | 6 |
| 9 | marketing/ | 8 |
| 10 | operations/ | 6 |
| 11 | product-analytics/ | 6 |
| 12 | real-estate/ | 6 |
| 13 | retention/ | 6 |
| 14 | saas/ | 5 |
| 15 | sales/ | 6 |
| 16 | valuation/ | 9 |
| | **Total** | **100** |

---

## 维护约定

- INDEX 是 navigator，**不**详述每个 engine 的 inputs / math (engines 自身 file + `staticExamples[0]` 是 source of truth)。
- 新 engine 落盘后必须在本 INDEX 同步加一行 + 更新 category 计数 + 总计。
- Engine count drift (任何时候 ≠ 100) 触发 `EXPECTED_ENGINE_COUNT` constant 同步 amend + P-series cascade audit。
- 字母 (B/C/D/...) 级别映射由 CLAUDE.md §"Project Overview" 维护；本 INDEX 仅列物理子目录。
- 物理子目录划分与 site nav 字母不必 1:1 对应——物理按代码组织，字母按业务领域组织。
