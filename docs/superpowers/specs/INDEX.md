# Specs Index

> **目录索引** — 所有 design specs 按类别分组，按日期升序。
> **Plans:** 参见 `../plans/`（106 个 plan 文件，本 INDEX 不覆盖）。
> **Memory:** 参见 `../../../memory/MEMORY.md`（项目级 ship log 索引）。
> **最后更新:** 2026-10-21（P152 INDEX catch-up — 补录 26 个漏登 spec：p42/p48-p53/header-mutex/tier2-r7/last-modified + P140/P140f×4/P140g/P147/Phase-5/P150×2/P151×3/P152 + retro×3。**计数 55 → 81**；同时修正 §7 计数错记为 3（实为 4）、§0-§6 计数与实际行数对齐）

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
| `2026-07-19-p42-date-drift-proof-design.md` | P42 Date Drift-Proof Codegen (mrr/burn-rate) — Design | drift-guard | 2026-07-19 |
| `2026-07-20-p48-claude-md-lessons-design.md` | P48 CLAUDE.md Operational Lessons — Design | process | 2026-07-20 |
| `2026-07-20-p49-engine-count-table-design.md` | P49 Engine Count per Category Table — Design | refactor | 2026-07-20 |
| `2026-07-20-p50-codegen-customfn-drift-guard-design.md` | P50 codegen-customfn drift guard — design | drift-guard | 2026-07-20 |
| `2026-07-21-p51-codegen-examples-mock-apply-design.md` | P51 codegen-examples mock-apply drift guard — design | drift-guard | 2026-07-21 |
| `2026-07-21-p52-test-infra-hardening-design.md` | P52 Test Infrastructure Hardening — Design | test-tooling | 2026-07-21 |
| `2026-07-21-p53-p1-batch-design.md` | P53 P1 Critical Batch — Design | engine-fix | 2026-07-21 |
| `2026-07-22-header-dropdown-mutex-design.md` | Header 下拉互斥脚本 — 设计 spec | ux | 2026-07-22 |
| `2026-07-29-tier2-round7-composite-data-driven-lines-design.md` | Tier-2 Round 7 — Composite Data-Driven Lines (P137 trial) | codegen | 2026-07-29 |
| `2026-08-04-h1-keyword-refresh-design.md` | H1 + metaTitle Keyword Refresh — 65 B+C class rewrite (commit `1d8943c`) | SEO | 2026-08-04 |
| `2026-08-05-p140d-t1-csat-and-friends-design.md` | P140d-T1 H1 Refresh Round 2 (17 misclassified slugs) — DRAFT pre-GSC-data | SEO | 2026-08-05 |
| `2026-08-05-p140e-blog-content-strategy-design.md` | P140e Blog Content Strategy — DRAFT pending user §9 decisions | content | 2026-08-05 |
| `2026-08-13-p142-p141-followup-design.md` | P142 P141-followup Integration (4 candidates: A tsc gate + B dead code + C env-via + D a11y SVG) | build-dep | 2026-08-13 |
| `2026-08-14-p143-build-dep-fixes-design.md` | P143 Build-Dep Fixes (9 → 4 pre-existing failures closed) | build-dep | 2026-08-14 |
| `2026-08-14-p144-p143-followup-design.md` | P144 P143-followup (4 build-dep failures partially closed + 6 doc drift items + run.mjs off-by-one) | build-dep | 2026-08-14 |
| `2026-08-17-p145-comprehensive-build-dep-design.md` | P145 Comprehensive Build-Dep (#249 + #525 261 en-faq mismatches closed) | build-dep | 2026-08-17 |
| `2026-08-17-p146-p145-followup-design.md` | P146 P145-followup (#707 + #249 closed + 1 HTML render guard) | build-dep | 2026-08-17 |
| `2026-08-31-last-modified-header-design.md` | P149 Last-Modified + Sitemap lastmod Injection — Design | SEO | 2026-08-31 |

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
| 6 · P20+ — Tech Debt / Cleanup / Audit | 25 |
| 7 · P140+ — AdSense Compliance + 2.0 | 17 |
| 8 · Retro — 流程复盘 | 3 |
| **总计** | **81** |

---

## 7 · P140+ — AdSense Compliance + 2.0 Strategy

| 文件 | 标题 | 类别 | 日期 | 状态 |
|---|---|---|---|---|
| `2026-07-31-adsense-low-value-content-fix-design.md` | P140 AdSense「Low-Value Content」整改设计 | AdSense compliance | 2026-07-31 | APPROVED |
| `2026-08-05-p140f-v2-strategy-design.md` | P140f v2.0 Evolution Strategy — APPROVED Path C (deferred to v2.0 promotion) | v2-strategy | 2026-08-05 | APPROVED |
| `2026-08-18-p140b-editorial-prose-design.md` | P140b Editorial Prose Mass-Write for AdSense Recovery (SUPERSEDED — already shipped 2026-08-04) | AdSense compliance | 2026-08-18 | SHIPPED |
| `2026-08-18-p140c-eeat-completion-design.md` | P140c E-E-A-T Completion (Real Reviewers + About Sections + Tier/Sources Guards) | AdSense compliance | 2026-08-18 | READY |
| `2026-08-18-p140d-tier-threshold-tightening-design.md` | P140d Tier Threshold Tightening (C3 +70% Thresholds + 31 H2 Domain Expansions) | Content quality | 2026-08-18 | SHIPPED |
| `2026-08-18-p140g-author-bio-pages-design.md` | P140g Author Bio Pages — Design Spec | AdSense compliance | 2026-08-18 | APPROVED |
| `2026-08-19-p140f-v2-topic-authority-design.md` | P140f v2.0 Topic Authority Design Spec | v2-topic-authority | 2026-08-19 | APPROVED |
| `2026-08-20-p140f-phase2-tier1-extension-design.md` | P140f Phase 2 — Tier 1 Anchor Topic Extension Design | v2-topic-authority | 2026-08-20 | — |
| `2026-08-21-p140f-phase4-comparison-pages-design.md` | P140f Phase 4 — Comparison Pages Design | v2-topic-authority | 2026-08-21 | — |
| `2026-08-21-p147-quick-wins-design.md` | P147 Quick Wins — Phase 4 Followup + Cross-Link Coverage Design | v2-topic-authority | 2026-08-21 | — |
| `2026-08-26-phase-5-v2.5-enterprise-design.md` | Phase 5-A v2.5 Enterprise — Design Spec | v2.5-enterprise | 2026-08-26 | APPROVED |
| `2026-08-31-p150-uc-advisor-phase1-design.md` | P150 Dimension 2: User-Centric Advisor — Phase 1 Feedback Widget | v2-dimension-2 | 2026-08-31 | DRAFT |
| `2026-08-31-p150-uc-advisor-phase2-design.md` | P150 User-Centric Advisor — Phase 2: Feedback Backend Implementation Spec | v2-dimension-2 | 2026-08-31 | DRAFT |
| `2026-09-01-p151-dimension-1-audit-design.md` | P151 Dimension 1: Decision Support System Audit | v2-dimension-1 | 2026-09-01 | DRAFT |
| `2026-09-01-p151-l5-backfill-batch1-design.md` | P151 Dimension 1 Phase 2: L5 Backfill Batch 1 Design | v2-dimension-1 | 2026-09-01 | — |
| `2026-09-01-p151-l5-backfill-batch2-design.md` | P151 Dimension 1 Phase 2: L5 Backfill Batch 2 Design | v2-dimension-1 | 2026-09-01 | — |
| `2026-10-21-p152-v2-roadmap-execution-audit-design.md` | P152 v2.0 路线图执行审计与优化建议 | v2-audit | 2026-10-21 | DRAFT |

---

## 8 · Retro — 流程复盘 / Superpowers 合规补文档

| 文件 | 标题 | 类别 | 日期 |
|---|---|---|---|
| `2026-08-28-feat-merge-retro-design.md` | Sub-project D: Retrospective Finishing — feat/preset-chip-cherrypick-p151 → master | retro | 2026-08-28 |
| `2026-08-28-p150-p151-retrospective-design.md` | P150 + P151 Retrospective — Implicit Brainstorming Decisions | retro | 2026-08-28 |
| `2026-08-28-writing-plans-retrospective-design.md` | Sub-project B: Retrospective Plan Docs | retro | 2026-08-28 |

---

## 维护约定

- INDEX 是 navigator，**不**追踪 spec 的 ship status（plans/memory 负责）。
- 新 spec 落盘后必须在本 INDEX 同步加一行 + 更新计数。
- 文件排序：**日期升序**；同日内按字母序。
- 类别调整需谨慎 — INDEX 是新人 / future AI session 找 spec 的第一入口。
