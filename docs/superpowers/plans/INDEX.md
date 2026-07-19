# Plans Index

> **目录索引** — 所有 implementation plans 按类别分组，按日期升序。
> **Specs:** 参见 `../specs/INDEX.md`（44 个 spec 文件索引）。
> **Excluded:** `pr-body-2026-06-24-audit-polish.md` 是 PR description 模板（非 plan），不在本 INDEX。
> **最后更新:** 2026-07-19（P34 batch）

---

## 0 · Foundational / Schema / i18n / SEO / Deploy / Audit (pre-P)

| 文件 | 标题 | 日期 |
|---|---|---|
| `2026-06-23-deploy-forgeflowkit-tencent-dns.md` | Deploy ForgeFlowKit to forgeflowkit.com (Tencent Registrar + Cloudflare DNS-only + Pages) | 2026-06-23 |
| `2026-06-23-i18n-drift-fix.md` | i18n Drift Fix — Implementation Plan | 2026-06-23 |
| `2026-06-24-ai-cost-preset-chip-unification.md` | AI Cost v3 — Preset Chip 统一化 实施计划 | 2026-06-24 |
| `2026-06-24-audit-fix-batch.md` | Audit-Driven Fix Batch Implementation Plan | 2026-06-24 |
| `2026-06-24-audit-polish.md` | ForgeFlowKit Audit Polish — 2026-06-24 Implementation Plan | 2026-06-24 |
| `2026-06-25-add-gitattributes-normalize-line-endings.md` | Add .gitattributes + Renormalize Line Endings | 2026-06-25 |
| `2026-06-25-seo-og-image-automation.md` | og:image Automation Implementation Plan | 2026-06-25 |
| `2026-06-25-seo-schema-sitemap.md` | SEO Schema & Sitemap Implementation Plan | 2026-06-25 |
| `2026-06-26-ab-engines-tools-split.md` | A+B Split — engines/ Subdirectories + tools.ts Multi-File | 2026-06-26 |
| `2026-06-26-ai-cost-preset-chip-position-alignment.md` | AI Cost Preset Chip 位置+样式对齐 + 32 Chip Handler 统一 | 2026-06-26 |
| `2026-06-26-c-internal-links-multi-dim.md` | C Spec: Internal-Links Multi-Dimensional Recommendation | 2026-06-26 |
| `2026-06-26-drift-fix-engines-category.md` | Engines Category Field Drift Fix | 2026-06-26 |
| `2026-06-30-v2-cleanup-site-url-de-dup.md` | v2 Cleanup — Consolidate SITE_URL into `src/lib/site-config.ts` | 2026-06-30 |

---

## 1 · P0 — Content Pages (EEAT / About / Category / Polish)

| 文件 | 标题 | 日期 |
|---|---|---|
| `2026-06-27-content-pages-plan-about.md` | Plan 2: About 深度 Implementation Plan | 2026-06-27 |
| `2026-06-27-content-pages-plan-category.md` | Plan 3: Category 落地页 + Header + Breadcrumb | 2026-06-27 |
| `2026-06-27-content-pages-plan-eeat.md` | Plan 1: EEAT 全站 Implementation Plan | 2026-06-27 |
| `2026-06-27-p0-polish-batch-1.md` | Plan 4: P0 Polish Batch 1 — 5 项 reviewer 反馈 | 2026-06-27 |

---

## 2 · P1 — Schema Factory / Blog Markdown

| 文件 | 标题 | 日期 |
|---|---|---|
| `2026-06-27-p1-schema-factory-plan.md` | Plan 1/3: JSON-LD Schema Factory Unification | 2026-06-27 |
| `2026-06-29-p1-blog-markdown-plan.md` | Plan 2/3: Blog Markdown 迁移 | 2026-06-29 |

---

## 3 · P2 — LocalStorage trilogy (favorites / recent / history)

| 文件 | 标题 | 日期 |
|---|---|---|
| `2026-06-30-p2a-favorites-plan.md` | P2a LocalStorage 收藏 — Implementation Plan | 2026-06-30 |
| `2026-06-30-p2b-recent-viewed-plan.md` | P2b LocalStorage 最近浏览 — Implementation Plan | 2026-06-30 |
| `2026-07-01-p2c-history-snapshots-plan.md` | P2c LocalStorage 历史快照 — Implementation Plan | 2026-07-01 |

---

## 4 · P3 — Auth / Sync / Migration trilogy

| 文件 | 标题 | 日期 |
|---|---|---|
| `2026-07-01-p3-1-account-plan.md` | P3-1 Account Authentication Implementation Plan | 2026-07-01 |
| `2026-07-01-p3-2-sync-plan.md` | P3-2 Cross-Device Sync Implementation Plan | 2026-07-01 |
| `2026-07-02-p3-3-migration-plan.md` | P3-3 Migration Implementation Plan (LS-only → Cloud Account) | 2026-07-02 |

---

## 5 · P4-P16 — Calculator batches (vertical 扩展)

| 文件 | 标题 | 类别 | 日期 |
|---|---|---|---|
| `2026-07-03-p4-1-compound-interest-plan.md` | P4-1 Compound Interest Calculator | B (财务) | 2026-07-03 |
| `2026-07-03-p4-2-stripe-fee-plan.md` | P4-2 Stripe Fee Calculator | B (财务) | 2026-07-03 |
| `2026-07-03-p4-3-safe-convertible-note-plan.md` | P4-3 SAFE / Convertible Note Calculator | B (融资) | 2026-07-03 |
| `2026-07-04-p5-real-estate-batch.md` | P5 Real-Estate Calculator Batch | R (新房) | 2026-07-04 |
| `2026-07-06-p7-operations-batch.md` | P7 Operations / Inventory Calculator Batch | O (运营) | 2026-07-06 |
| `2026-07-07-p8-sales-batch.md` | P8 Sales / CRM Calculator Batch | S (销售) | 2026-07-07 |
| `2026-07-09-p9-retention-batch.md` | P9 Retention & Customer Success Calculator Batch | R (留存) | 2026-07-09 |
| `2026-07-09-p10-product-analytics-batch.md` | P10 Product Analytics Calculator Batch | P (产品分析) | 2026-07-09 |
| `2026-07-10-p11-hiring-team-batch.md` | P11 Hiring/Team Calculator Batch | H (招聘) | 2026-07-10 |
| `2026-07-10-p12-customer-support-batch.md` | P12 Customer Support Calculator Batch | T (客服) | 2026-07-10 |
| `2026-07-12-p13-knowledge-documentation-batch.md` | P13 Knowledge/Documentation Calculator Batch | K (知识) | 2026-07-12 |
| `2026-07-13-p14-legal-compliance-batch.md` | P14 Legal & Compliance Calculator Batch | L (合规) | 2026-07-13 |
| `2026-07-14-p14-followup-cross-cutting-audit.md` | P14-Followup: Cross-Cutting Input UX + Defensive Clamp | (跨切) | 2026-07-14 |
| `2026-07-14-p15-cross-cutting-audit.md` | P15 Cross-Cutting Audit | (跨切) | 2026-07-14 |
| `2026-07-15-p16-100-milestone.md` | P16 100-Milestone Batch | (里程碑) | 2026-07-15 |

**注意**: P4-4/5/6 + P6 无独立 plan（specs 有）；这些 calc 在 P4-P6 期间的 review/audit batches 中执行（P4-4/5/6 reviews 在 P5/P6 batch plans 内 inline）。

---

## 6 · P17b+ — Tech Debt / Cleanup / Cascade Audit

| 文件 | 标题 | 类别 | 日期 |
|---|---|---|---|
| `2026-07-16-p17b-i18n-completion.md` | P17b i18n Completion | i18n | 2026-07-16 |
| `2026-07-18-p18-i18n-tooling-hardening.md` | P18 i18n Tooling Hardening | i18n | 2026-07-18 |
| `2026-07-18-p19-tech-debt-cleanup.md` | P19 Tech Debt Cleanup | tech-debt | 2026-07-18 |
| `2026-07-18-p20-i18n-tooling-polish.md` | P20 i18n Tooling Polish | i18n | 2026-07-18 |
| `2026-07-18-p21-tech-debt-cleanup.md` | P21 Tech Debt Cleanup | tech-debt | 2026-07-18 |
| `2026-07-18-p22-stale-count-cleanup.md` | P22 Stale Count Cleanup | cleanup | 2026-07-18 |
| `2026-07-18-p22b-engine-count-constant.md` | P22b Engine Count Constant | refactor | 2026-07-18 |
| `2026-07-18-p23-og-sample-coverage.md` | P23 OG-Sample Coverage | build-fix | 2026-07-18 |
| `2026-07-19-p23b-satori-perf-skip-gate.md` | P23b Satori Perf Skip-Gate | test-tooling | 2026-07-19 |
| `2026-07-19-p27-memory-audit-pass.md` | P27 Memory Audit Pass | audit | 2026-07-19 |

---

## 7 · Multi-language mirrors

| 文件 | 标题 | 镜像 | 日期 |
|---|---|---|---|
| `2026-06-23-deploy-forgeflowkit-tencent-dns.zh.md` | ForgeFlowKit 上线 forgeflowkit.com（腾讯注册 + Cloudflare 仅 DNS + Pages）实施计划 | (Section 0 deploy 的中文版) | 2026-06-23 |

---

## 8 · Excluded (非 plan 文件)

| 文件 | 原因 |
|---|---|
| `pr-body-2026-06-24-audit-polish.md` | PR description 模板（H1 = `## Summary`），不属于 plan。Audit Polish 的真正 plan 在 `2026-06-24-audit-polish.md`。 |

---

## 类别计数

| 类别 | 数量 |
|---|---|
| 0 · Foundational / Schema / i18n / SEO / Deploy / Audit (pre-P) | 13 |
| 1 · P0 — Content Pages | 4 |
| 2 · P1 — Schema / Blog Markdown | 2 |
| 3 · P2 — LocalStorage trilogy | 3 |
| 4 · P3 — Auth / Sync / Migration | 3 |
| 5 · P4-P16 — Calculator batches | 15 |
| 6 · P17b+ — Tech Debt / Cleanup / Audit | 10 |
| 7 · Multi-language mirrors | 1 |
| **索引 plan 文件总数** | **51** |
| 8 · Excluded (pr-body) | 1 |
| **目录文件总数** | **52** |

---

## 维护约定

- INDEX 是 navigator，**不**追踪 plan 的 ship status（memory 文件负责）。
- 新 plan 落盘后必须在本 INDEX 同步加一行 + 更新计数。
- 文件排序：**日期升序**；同日内按字母序。
- PR body 模板不收入本 INDEX（保留在目录但单独列 Section 8）。
- P4-P16 calculator batches 中如有 review-only plans（无独立 plan 文件），在 Section 5 注释行说明。
