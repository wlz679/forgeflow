# Specs Index

> **目录索引** — 所有 design specs 按类别分组，按日期升序。
> **Plans:** 参见 `../plans/`（52 个 plan 文件，本 INDEX 不覆盖）。
> **Memory:** 参见 `../../../memory/MEMORY.md`（项目级 ship log 索引）。
> **最后更新:** 2026-07-19（P33 batch）

---

## 0 · Foundational & Schema（pre-P / 早期单点修复）

| 文件 | 标题 | 日期 |
|---|---|---|
| `2026-06-23-i18n-drift-fix-design.md` | i18n Drift Fix — Design Spec | 2026-06-23 |
| `2026-06-24-ai-cost-preset-chip-unification-design.md` | AI Cost v3 — Preset Chip 统一化设计 | 2026-06-24 |
| `2026-06-25-seo-overhaul-design.md` | SEO Overhaul — Schema 全套 + 自动化 og:image | 2026-06-25 |
| `2026-06-26-ab-engines-tools-split-design.md` | A+B Split — engines/ Subdirectories + tools.ts Multi-File | 2026-06-26 |
| `2026-06-26-ai-cost-preset-chip-position-alignment-design.md` | AI Cost v3 — Preset Chip 位置与样式对齐设计 | 2026-06-26 |
| `2026-06-26-c-internal-links-multi-dim-design.md` | C Spec: Internal-Links Multi-Dimensional Recommendation | 2026-06-26 |
| `2026-06-26-drift-fix-engines-category-design.md` | Engines Category Field Drift Fix — Design Spec | 2026-06-26 |

---

## 1 · P0 — Content Pages

| 文件 | 标题 | 日期 |
|---|---|---|
| `2026-06-27-content-depth-pages-design.md` | P0 Content Pages Overhaul — EEAT + About + Category 落地页 | 2026-06-27 |

---

## 2 · P1 — Schema Factory / Blog Markdown / Engine Factory 决策

| 文件 | 标题 | 日期 |
|---|---|---|
| `2026-06-27-p1-schema-factory-design.md` | Spec 1/3: JSON-LD Schema Factory Unification | 2026-06-27 |
| `2026-06-29-p1-3-engine-factory-decision.md` | P1-3 Engine Factory 抽象 — 决策 spec（不实施） | 2026-06-29 |
| `2026-06-29-p1-blog-markdown-design.md` | Spec 2/3: Blog Markdown 迁移（存储层） | 2026-06-29 |

---

## 3 · P2 — LocalStorage 三件套（收藏 / 最近浏览 / 历史快照）

| 文件 | 标题 | 日期 |
|---|---|---|
| `2026-06-30-p2-localstorage-favorites-design.md` | P2a LocalStorage 收藏 — 设计 spec | 2026-06-30 |
| `2026-06-30-p2b-recent-viewed-design.md` | P2b LocalStorage 最近浏览 — 设计 spec | 2026-06-30 |
| `2026-07-01-p2c-history-snapshots-design.md` | P2c LocalStorage 历史快照 — 设计 spec | 2026-07-01 |

---

## 4 · P3 — Auth / Sync / Migration trilogy

| 文件 | 标题 | 日期 |
|---|---|---|
| `2026-07-01-p3-1-account-design.md` | P3-1 Account Authentication — Design Spec | 2026-07-01 |
| `2026-07-01-p3-2-sync-design.md` | P3-2 Cross-Device Sync — Design Spec | 2026-07-01 |
| `2026-07-02-p3-3-migration-design.md` | P3-3 Migration Design (LS-only → Cloud Account) | 2026-07-02 |

---

## 5 · P4-P16 — Calculator 批次（100 个 engines 的 vertical 扩展）

| 文件 | 标题 | 类别 | 日期 |
|---|---|---|---|
| `2026-07-03-p4-1-compound-interest-design.md` | P4-1 Compound Interest Calculator Design | B (财务) | 2026-07-03 |
| `2026-07-03-p4-2-stripe-fee-design.md` | P4-2 Stripe Fee Calculator Design | B (财务) | 2026-07-03 |
| `2026-07-03-p4-3-safe-convertible-note-design.md` | P4-3 SAFE / Convertible Note Calculator Design | B (融资) | 2026-07-03 |
| `2026-07-03-p4-4-burn-multiple-rule-of-40-design.md` | P4-4 Burn Multiple / Rule of 40 Calculator Design | B (融资) | 2026-07-03 |
| `2026-07-03-p4-5-remote-vs-office-design.md` | P4-5 Remote vs In-Office Cost Calculator Design | D (HR/Cost) | 2026-07-03 |
| `2026-07-03-p4-6-arr-multiple-valuation-design.md` | P4-6 ARR Multiple / Valuation Multiplier Calculator Design | V (估值) | 2026-07-03 |
| `2026-07-04-p5-real-estate-batch-design.md` | P5 Real-Estate Calculator Batch Design | R (新房) | 2026-07-04 |
| `2026-07-04-p6-marketing-analytics-batch-design.md` | P6 Marketing Analytics Calculator Batch Design | M (营销) | 2026-07-04 |
| `2026-07-06-p7-operations-batch-design.md` | P7 Operations / Inventory Calculator Batch Design | O (运营) | 2026-07-06 |
| `2026-07-07-p8-sales-batch-design.md` | P8 Sales / CRM Calculator Batch Design | S (销售) | 2026-07-07 |
| `2026-07-09-p9-retention-batch-design.md` | P9 Retention & Customer Success Calculator Batch Design | R (留存) | 2026-07-09 |
| `2026-07-09-p10-product-analytics-batch-design.md` | P10 Product Analytics Calculator Batch — Design Spec | P (产品分析) | 2026-07-09 |
| `2026-07-10-p11-hiring-team-batch-design.md` | P11 Hiring/Team Calculator Batch — Design Spec | H (招聘) | 2026-07-10 |
| `2026-07-10-p12-customer-support-batch-design.md` | P12 Customer Support Calculator Batch — Design Spec | T (客服) | 2026-07-10 |
| `2026-07-12-p13-knowledge-documentation-batch-design.md` | P13 Knowledge/Documentation Calculator Batch — Design Spec | K (知识) | 2026-07-12 |
| `2026-07-13-p14-legal-compliance-batch-design.md` | P14 Legal & Compliance Calculator Batch — Design Spec | L (合规) | 2026-07-13 |
| `2026-07-14-p14-followup-cross-cutting-audit-design.md` | P14-Followup: Cross-Cutting Input UX + Defensive Clamp | (跨切) | 2026-07-14 |
| `2026-07-14-p15-cross-cutting-audit-design.md` | P15 Cross-Cutting Audit — Design Spec | (跨切) | 2026-07-14 |
| `2026-07-15-p16-100-milestone-design.md` | P16 100-Milestone Batch — Design Spec | (里程碑) | 2026-07-15 |

---

## 6 · P20+ — Tech Debt / Cleanup / Cascade Audit

| 文件 | 标题 | 类别 | 日期 |
|---|---|---|---|
| `2026-07-18-p20-i18n-tooling-polish-design.md` | P20 i18n Tooling Polish — Design Spec | i18n | 2026-07-18 |
| `2026-07-18-p21-tech-debt-cleanup-design.md` | P21 Tech Debt Cleanup — Design | tech-debt | 2026-07-18 |
| `2026-07-18-p22-stale-count-cleanup-design.md` | P22 Stale Count Cleanup — Design | cleanup | 2026-07-18 |
| `2026-07-18-p22b-engine-count-constant-design.md` | P22b Engine Count Constant — Design | refactor | 2026-07-18 |
| `2026-07-18-p23-og-sample-coverage-design.md` | P23 OG-Sample Coverage — Design | build-fix | 2026-07-18 |
| `2026-07-19-p23b-satori-perf-skip-gate-design.md` | P23b Satori Perf Skip-Gate — Design | test-tooling | 2026-07-19 |
| `2026-07-19-p27-memory-audit-pass-design.md` | P27 Memory Audit Pass — Design | audit | 2026-07-19 |

---

## 类别计数

| 类别 | 数量 |
|---|---|
| 0 · Foundational & Schema | 7 |
| 1 · P0 — Content Pages | 1 |
| 2 · P1 — Schema Factory / Blog Markdown | 3 |
| 3 · P2 — LocalStorage trilogy | 3 |
| 4 · P3 — Auth / Sync / Migration | 3 |
| 5 · P4-P16 — Calculator batches | 19 |
| 6 · P20+ — Tech Debt / Cleanup / Audit | 7 |
| **总计** | **44** |

---

## 维护约定

- INDEX 是 navigator，**不**追踪 spec 的 ship status（plans/memory 负责）。
- 新 spec 落盘后必须在本 INDEX 同步加一行 + 更新计数。
- 文件排序：**日期升序**；同日内按字母序。
- 类别调整需谨慎 — INDEX 是新人 / future AI session 找 spec 的第一入口。
