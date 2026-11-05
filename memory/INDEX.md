# Project Memory Index

> **目录索引** — 项目级 ship logs（git-tracked）与 user-global memory 区分。
> **User-global memory:** `~/.claude/projects/D--E-----youtube-tools/memory/MEMORY.md`（跨 session 索引，P22b 起 ship logs）。
> **MEMORY.md (本目录):** 单行详细索引，每条 ship log 1 行 (P12 起的 series-shipping)。
> **本 INDEX.md:** top-level navigator，按 P/系列分组列出所有 41 个 ship log 文件。
> **最后更新:** 2026-07-19（P35 batch）

---

## Section 0 · Pre-P12 batches (历史 ship logs 缺失)

| 系列 | Ship log 状态 | 备注 |
|---|---|---|
| P2 (LocalStorage trilogy) | ❌ 无 ship log | a/b/c 三个 plan 已 ship；memory 仅 user-global P2b/P2c ship logs |
| P3 (Auth/Sync/Migration) | ❌ 无 ship log | trilogy plan 已 ship；memory 仅 user-global P3-1/P3-2/P3-3 ship logs |
| P4 (Compound Interest → ARR Multiple) | ❌ 无 ship log | 6 calc plans ship；memory 仅 user-global P4-1..P4-6 ship logs |
| P5 (Real-Estate) | ❌ 无 ship log | batch plan ship；memory 仅 user-global P5 series |
| P6 (Marketing Analytics) | ❌ 无 ship log | batch plan ship；memory 仅 user-global P6-1 + P6 series |
| P7 (Operations) | ❌ 无 ship log | batch plan ship；memory 仅 user-global P7 series |
| P8 — partial | ✅ 5 of 6 | P8-2/3/4/5/6 有；**P8-1 Pipeline Value 缺** |
| P9 — partial | ✅ 2 of 6 | P9-2 GRR + P9-6 Renewal Rate 有；**P9-1/3/4/5 缺** |
| P10 (Product Analytics) | ⚠️ 仅 holistic fix | `p10-holistic-fix-shipped.md` 是 post-ship fix log；batch ship log 缺 |
| P11 (Hiring/Team) | ✅ 6 + series | P11-1/2/3/4/5/6 + p11-series-shipped.md 完整 |

**Root cause:** P12 起才开始系统写项目级 ship log；P2-P11 仅 user-global memory 有记录。**Future 任务**: 不补 P2-P11 历史 ship log（P32 invariant 教诲：don't fake history）；INDEX 标注 gap，user-global memory 是 source of truth。

---

## Section 1 · P12 — Customer Support (6 calcs + series)

| 文件 | 标题 | 日期 |
|---|---|---|
| `p12-capacity-planning-shipped.md` | P12-1 Capacity Planning | 2026-07-10 |
| `p12-cost-per-ticket-shipped.md` | P12-2 Cost Per Ticket | 2026-07-10 |
| `p12-csat-shipped.md` | P12-3 CSAT | 2026-07-10 |
| `p12-deflection-rate-shipped.md` | P12-4 Deflection Rate | 2026-07-10 |
| `p12-frt-sla-shipped.md` | P12-5 FRT/SLA | 2026-07-10 |
| `p12-resolution-time-shipped.md` | P12-6 Resolution Time | 2026-07-10 |
| `p12-series-shipped.md` | P12 series — Customer Support batch closure | 2026-07-10 |

---

## Section 2 · P13 — Knowledge/Documentation (6 calcs + series)

| 文件 | 标题 | 日期 |
|---|---|---|
| `p13-1-kb-coverage-rate-shipped.md` | P13-1 KB Coverage Rate | 2026-07-12 |
| `p13-2-article-freshness-shipped.md` | P13-2 Article Freshness | 2026-07-12 |
| `p13-3-search-effectiveness-shipped.md` | P13-3 Search Effectiveness | 2026-07-12 |
| `p13-4-deflection-quality-shipped.md` | P13-4 Deflection Quality | 2026-07-12 |
| `p13-5-documentation-roi-shipped.md` | P13-5 Documentation ROI | 2026-07-12 |
| `p13-6-article-helpfulness-shipped.md` | P13-6 Article Helpfulness Score | 2026-07-12 |
| `p13-series-shipped.md` | P13 series — Knowledge batch closure | 2026-07-12 |

---

## Section 3 · P14 — Legal & Compliance (6 calcs + followup + series)

| 文件 | 标题 | 日期 |
|---|---|---|
| `p14-1-gdpr-fine-shipped.md` | P14-1 GDPR Fine Risk | 2026-07-13 |
| `p14-2-dsar-cost-shipped.md` | P14-2 DSAR Processing Cost | 2026-07-13 |
| `p14-3-consent-revenue-shipped.md` | P14-3 Cookie Consent Revenue Impact | 2026-07-13 |
| `p14-4-dpa-cost-shipped.md` | P14-4 DPA Negotiation Cost | 2026-07-13 |
| `p14-5-breach-notification-shipped.md` | P14-5 Data Breach Notification Cost | 2026-07-13 |
| `p14-6-cmp-roi-shipped.md` | P14-6 CMP ROI | 2026-07-13 |
| `p14-followup-cross-cutting-audit-shipped.md` | P14-Followup Cross-Cutting Audit | 2026-07-14 |
| `p14-series-shipped.md` | P14 series — Legal & Compliance batch closure | 2026-07-14 |

---

## Section 4 · P15 / P16 / P17 (cross-cutting + milestone + i18n)

| 文件 | 标题 | 日期 |
|---|---|---|
| `p15-cross-cutting-audit-shipped.md` | P15 Cross-Cutting Audit | 2026-07-14 |
| `p16-100-milestone-shipped.md` | P16 100-Milestone Batch | 2026-07-15/16 |
| `p16-task-5-reviewer-findings.md` | P16-5 reviewer pre-existing findings (not maintenance triggers) | 2026-07-16 |
| `p17-i18n-backfill-shipped.md` | P17 + P17b + P18 + P19 + P20 + P21 + P22 i18n & housekeeping cluster | 2026-07-16/17/18 |

> **注意:** `p17-i18n-backfill-shipped.md` 是聚合页 — P17/P17b/P18/P19/P20/P21/P22 用 `#anchor` 内嵌于该文件。

---

## Section 5 · P8 (5 of 6) + P9 (2 of 6) + P10 (holistic fix only) + P11 (6 + series)

### P8 — Sales / CRM

| 文件 | 标题 | 日期 |
|---|---|---|
| `p8-2-sales-velocity-shipped.md` | P8-2 Sales Velocity | 2026-07-07 |
| `p8-3-acv-shipped.md` | P8-3 ACV | 2026-07-07 |
| `p8-4-win-rate-by-stage-shipped.md` | P8-4 Win Rate by Stage | 2026-07-07 |
| `p8-5-quota-attainment-shipped.md` | P8-5 Quota Attainment | 2026-07-07 |
| `p8-6-pipeline-coverage-shipped.md` | P8-6 Pipeline Coverage | 2026-07-07 |
| (P8-1 Pipeline Value — gap) | — | — |

### P9 — Retention

| 文件 | 标题 | 日期 |
|---|---|---|
| `p9-2-grr-shipped.md` | P9-2 GRR | 2026-07-09 |
| `p9-6-renewal-rate-shipped.md` | P9-6 Renewal Rate | 2026-07-09 |
| (P9-1/3/4/5 — gaps) | — | — |

### P10 — Product Analytics

| 文件 | 标题 | 日期 |
|---|---|---|
| `p10-holistic-fix-shipped.md` | P10-7 holistic fix (Funnel Step step5 missing input @ `214c4ac`) | 2026-07-10 |

### P11 — Hiring/Team

| 文件 | 标题 | 日期 |
|---|---|---|
| `p11-1-fully-loaded-shipped.md` | P11-1 Fully-loaded Cost | 2026-07-10 |
| `p11-2-ramp-time-shipped.md` | P11-2 Ramp Time | 2026-07-10 |
| `p11-3-productivity-ramp-shipped.md` | P11-3 Productivity Ramp | 2026-07-10 |
| `p11-4-comp-banding-shipped.md` | P11-4 Comp Banding | 2026-07-10 |
| `p11-5-equity-refresh-shipped.md` | P11-5 Equity Refresh | 2026-07-10 |
| `p11-6-attrition-cost-shipped.md` | P11-6 Attrition Cost | 2026-07-10 |
| `p11-series-shipped.md` | P11 series — Hiring/Team batch closure | 2026-07-10 |

---

## Section 6 · P35+ — 后续批次 ship logs（P35 → P167）

> ⚠️ **本节由 P167 一次性补登记**（此前 138 个文件未登记）。
> 维护约定见文末；新增 ship log 时请同步登记到对应批次段。

### P5

| 文件 | 标题 | 日期 |
|---|---|---|
| `p5a-v2.5-enterprise-shipped.md` | Phase 5-A v2.5 Enterprise — Shipped 2026-08-26 | 2026-08-26 |

### P60

| 文件 | 标题 | 日期 |
|---|---|---|
| `p60-engines-cost-subdir-fix-shipped.md` | P60 — Engine subdir fix (Cost E-category, saas-pricing-planner) — shipped 2026-07-23 | 2026-07-23 |

### P61

| 文件 | 标题 | 日期 |
|---|---|---|
| `p61-m-category-fixes-shipped.md` | P61 M-Category Audit Fixes — Shipped 2026-07-24 | 2026-07-24 |

### P62

| 文件 | 标题 | 日期 |
|---|---|---|
| `p62-category-page-i18n-fix-shipped.md` | P62 — Category Page i18n Fix (English-purity close) — shipped 2026-07-24 | 2026-07-24 |

### P63

| 文件 | 标题 | 日期 |
|---|---|---|
| `p63-ci-cjk-guard-shipped.md` | P63 — CI CJK Drift Guard for en Category Pages — shipped 2026-07-24 | 2026-07-24 |

### P65

| 文件 | 标题 | 日期 |
|---|---|---|
| `p65-changelog-catchup-shipped.md` | P65 CHANGELOG Catch-up Ship Log |  |

### P66

| 文件 | 标题 | 日期 |
|---|---|---|
| `p66b-zh-cjk-preservation-shipped.md` | P66b zh CJK Preservation Ship Log |  |

### P67

| 文件 | 标题 | 日期 |
|---|---|---|
| `p67a-working-tree-cleanup-shipped.md` | P67a Working Tree Cleanup Ship Log |  |
| `p67b-tool-zh-cjk-preservation-shipped.md` | P67b Tool-page zh CJK Preservation Ship Log |  |

### P68

| 文件 | 标题 | 日期 |
|---|---|---|
| `p68-tool-en-cjk-guard-shipped.md` | P68 Tool-page en CJK Guard Ship Log |  |

### P69

| 文件 | 标题 | 日期 |
|---|---|---|
| `p69-blog-i18n-fix-shipped.md` | P69 Blog i18n Fix + CJK Guard Ship Log |  |
| `p69-zh-blog-english-discovery.md` | P69 Discovery — zh Blog Pages Show English (Pre-Test Discovery) |  |

### P70

| 文件 | 标题 | 日期 |
|---|---|---|
| `p70-superpowers-gitignore-fix-shipped.md` | P70 .superpowers/ Gitignore Root-Cause Fix Ship Log |  |

### P71

| 文件 | 标题 | 日期 |
|---|---|---|
| `p71-cross-link-cjk-guard-shipped.md` | P71 Cross-link CJK Guard Ship Log |  |

### P72

| 文件 | 标题 | 日期 |
|---|---|---|
| `p72-audit-findings.md` | P72 i18n Completeness Audit — Findings Report |  |
| `p72-i18n-fix-d1-d2-d3-shipped.md` | P72 T2-A i18n Render Layer Fix (D1 + D2 + D3) Ship Log |  |

### P73

| 文件 | 标题 | 日期 |
|---|---|---|
| `p73-legal-pages-i18n-shipped.md` | P73 Legal Pages i18n Fix (D4 + D5) Ship Log |  |

### P74

| 文件 | 标题 | 日期 |
|---|---|---|
| `p74-audit-ci-guard-shipped.md` | P74 Audit Script CI Guard Ship Log |  |

### P75

| 文件 | 标题 | 日期 |
|---|---|---|
| `p75-md-body-translation-shipped.md` | P75 MD Blog Body Translation Ship Log |  |

### P76

| 文件 | 标题 | 日期 |
|---|---|---|
| `p76-blog-body-review-shipped.md` | P76 Blog Body Review Pass Ship Log |  |

### P77

| 文件 | 标题 | 日期 |
|---|---|---|
| `p77-claude-md-standing-rule-shipped.md` | P77 CLAUDE.md Standing Rule (.superpowers/ gitignore) Ship Log |  |

### P78

| 文件 | 标题 | 日期 |
|---|---|---|
| `p78-glossary-extension-shipped.md` | P78 Translation Glossary Extension Ship Log |  |

### P79

| 文件 | 标题 | 日期 |
|---|---|---|
| `p79-footer-breadcrumb-reaudit-shipped.md` | P79 Footer/Breadcrumb i18n Re-Audit Ship Log |  |

### P80

| 文件 | 标题 | 日期 |
|---|---|---|
| `p80-tool-descriptions-i18n-shipped.md` | P80 Tool Descriptions i18n Ship Log |  |

### P81

| 文件 | 标题 | 日期 |
|---|---|---|
| `p81-path-b-tool-descriptions-i18n-shipped.md` | P81 Path-B Category Pages Tool Descriptions i18n Ship Log |  |

### P82

| 文件 | 标题 | 日期 |
|---|---|---|
| `p82-audit-filter-glossary-guard-shipped.md` | P82 Audit Filter + Glossary Guard Ship Log |  |

### P83

| 文件 | 标题 | 日期 |
|---|---|---|
| `p83-audit-sync-orphan-guard-shipped.md` | P83 Audit Script Sync + Orphan-Key Detection Ship Log |  |

### P84

| 文件 | 标题 | 日期 |
|---|---|---|
| `p84-changelog-catchup-v2-shipped.md` | P84 CHANGELOG Catch-up v2 Ship Log |  |

### P85

| 文件 | 标题 | 日期 |
|---|---|---|
| `p85a-ai-cost-section-headers-i18n-shipped.md` | P85a AI Cost Calculator Section Headers i18n Ship Log |  |

### P86

| 文件 | 标题 | 日期 |
|---|---|---|
| `p86-sitemap-hreflang-shipped.md` | P86 Sitemap hreflang Annotations Ship Log |  |

### P87

| 文件 | 标题 | 日期 |
|---|---|---|
| `p87-sitemap-hreflang-ci-guard-shipped.md` | P87 Sitemap hreflang CI Guard Ship Log |  |

### P88

| 文件 | 标题 | 日期 |
|---|---|---|
| `p88-html-hreflang-ci-guard-shipped.md` | P88 HTML hreflang CI Guard Ship Log |  |

### P89

| 文件 | 标题 | 日期 |
|---|---|---|
| `p89-sitemap-url-coverage-guard-shipped.md` | P89 Sitemap URL Coverage Guard Ship Log |  |

### P90

| 文件 | 标题 | 日期 |
|---|---|---|
| `p90-canonical-url-ci-guard-shipped.md` | P90 HTML Canonical URL CI Guard Ship Log |  |

### P91

| 文件 | 标题 | 日期 |
|---|---|---|
| `p91-og-meta-guard-shipped.md` | P91 OG Meta Tags CI Guard + og:locale Fix Ship Log |  |

### P92

| 文件 | 标题 | 日期 |
|---|---|---|
| `p92-json-ld-guard-shipped.md` | P92 JSON-LD / Structured Data CI Guard Ship Log |  |

### P93

| 文件 | 标题 | 日期 |
|---|---|---|
| `p93-json-ld-field-validation-shipped.md` | P93 JSON-LD Field Validation CI Guard + Real Defects Ship Log |  |

### P94

| 文件 | 标题 | 日期 |
|---|---|---|
| `p94-faqpage-deep-validation-shipped.md` | P94 JSON-LD FAQPage Deep Validation CI Guard Ship Log |  |

### P95

| 文件 | 标题 | 日期 |
|---|---|---|
| `p95-a11y-ci-guard-shipped.md` | P95 a11y CI Guard Ship Log |  |

### P96

| 文件 | 标题 | 日期 |
|---|---|---|
| `p96-page-size-guard-shipped.md` | P96 Page Size CI Guard Ship Log |  |

### P97

| 文件 | 标题 | 日期 |
|---|---|---|
| `p97-breadcrumb-list-guard-shipped.md` | P97 BreadcrumbList Position Validation CI Guard Ship Log |  |

### P98

| 文件 | 标题 | 日期 |
|---|---|---|
| `p98-saas-calc-output-i18n-shipped.md` | P98 SaaS Calculator Output i18n Ship Log |  |

### P99

| 文件 | 标题 | 日期 |
|---|---|---|
| `p99-ops-cost-valuation-calc-i18n-shipped.md` | P99 Ops/Cost/Valuation Calc Output i18n Ship Log |  |

### P100–P109

| 文件 | 标题 | 日期 |
|---|---|---|
| `p100-remaining-5-categories-calc-i18n-shipped.md` | P100 Remaining 5 Categories Calc Output i18n Ship Log |  |
| `p101-post-processor-debug-shipped.md` | P101 Post-Processor Debug Ship Log |  |
| `p102-dead-i18n-keys-cleanup-shipped.md` | P102 Dead i18n Keys Cleanup Ship Log |  |
| `p103-dead-i18n-keys-guard-shipped.md` | P103 Dead i18n Keys CI Guard Ship Log |  |
| `p104-ai-cost-savings-insights-translation-shipped.md` | P104 AI Cost '💰 Savings Insights' Translation Ship Log |  |
| `p105-ai-cost-usage-scenarios-translation-shipped.md` | P105 AI Cost 'Usage Scenarios' Translation Ship Log |  |
| `p106-js-bundle-size-guard-shipped.md` | P106 JS Bundle Size CI Guard Ship Log |  |
| `p107-css-bundle-size-guard-shipped.md` | P107 CSS Bundle Size CI Guard Ship Log |  |
| `p108-image-size-guard-shipped.md` | P108 Image Size CI Guard Ship Log |  |
| `p109-changelog-catchup-v3-shipped.md` | P109 CHANGELOG Catch-up v3 Ship Log |  |

### P110–P119

| 文件 | 标题 | 日期 |
|---|---|---|
| `p110-claude-md-defense-in-depth-matrix-shipped.md` | P110 CLAUDE.md Defense-in-Depth Matrix Ship Log |  |
| `p111-business-section-headers-i18n-shipped.md` | P111 Business Section Headers i18n Ship Log |  |
| `p112-extend-dead-keys-guard-p111-assertions-shipped.md` | P112 Extend P103 Guard with P111 Assertions Ship Log |  |
| `p113-tier2-single-engine-headers-i18n-shipped.md` | P113 Tier-2 Single-Engine Headers i18n Ship Log |  |
| `p114-tier2-round2-headers-i18n-shipped.md` | P114 Tier-2 Round 2 Headers i18n Ship Log |  |
| `p115-tier2-round3-headers-i18n-shipped.md` | P115 Tier-2 Round 3 Headers i18n Ship Log |  |
| `p116-changelog-catchup-v4-shipped.md` | P116 CHANGELOG Catch-up v4 Ship Log |  |
| `p117-tier2-round4-headers-i18n-shipped.md` | P117 Tier-2 Round 4 Headers i18n Ship Log |  |
| `p118-tier2-round5-headers-i18n-shipped.md` | P118 Tier-2 Round 5 Headers i18n Ship Log |  |
| `p119-tier2-round6-headers-i18n-shipped.md` | P119 Tier-2 Round 6 Headers i18n Ship Log |  |

### P120–P129

| 文件 | 标题 | 日期 |
|---|---|---|
| `p120-changelog-catchup-v5-shipped.md` | P120 CHANGELOG catch-up v5 Ship Log |  |
| `p121-engine-titles-i18n-guard-shipped.md` | P121 Engine Titles i18n Guard Ship Log |  |
| `p122-engine-descriptions-i18n-guard-shipped.md` | P122 Engine Descriptions i18n Guard Ship Log |  |
| `p123-composite-engine-i18n-guard-shipped.md` | P123 Composite Engine i18n Guard Ship Log |  |
| `p124-en-composite-i18n-guard-shipped.md` | P124 Engine EN-Page Composite i18n Guard Ship Log |  |
| `p125-claude-md-invariant-matrix-guard-shipped.md` | P125 CLAUDE.md Invariant Matrix Guard Ship Log |  |
| `p126-changelog-catchup-v6-shipped.md` | P126 CHANGELOG catch-up v6 Ship Log |  |
| `p127-p123-latent-false-positive-fix-shipped.md` | P127 P123 Latent False-Positive Fix Ship Log |  |
| `p128-faq-howtouse-coverage-extension-shipped.md` | P128 FAQ + how_to_use Coverage Extension Ship Log |  |
| `p129-missing-translation-assertion-shipped.md` | P129 Missing-Translation Assertion + Probe-Regex Fix Ship Log |  |

### P130–P139

| 文件 | 标题 | 日期 |
|---|---|---|
| `p130-changelog-catchup-v7-shipped.md` | P130 CHANGELOG catch-up v7 Ship Log |  |
| `p131-catchup-changelog-v8-shipped.md` | P131 catch-up CHANGELOG v8 Ship Log |  |
| `p131-single-test-split-shipped.md` | P131 Single-Test Split Ship Log |  |
| `p132-claude-md-invariants-extension-shipped.md` | P132 CLAUDE.md Invariants Extension Ship Log |  |
| `p133-input-labels-i18n-audit-shipped.md` | P133 Input Labels i18n Audit Ship Log |  |
| `p134-meta-guard-self-loop-fix-shipped.md` | P134 Meta-Guard Self-Loop Fix Ship Log |  |
| `p135-plan-file-cleanup-shipped.md` | P135 Plan-File Cleanup Ship Log |  |
| `p136-walker-defensive-audit-shipped.md` | P136 Walker Defensive Audit Ship Log |  |
| `p137-tier2-round7-trial-shipped.md` | P137 Tier-2 Round 7 Composite Data-Driven Lines Trial Ship Log |  |
| `p138-v3-render-batch-fix-shipped.md` | P138 — V3 rendering layer 66 engines batch fix (shipped 2026-07-30) | 2026-07-30 |

### P140–P149

| 文件 | 标题 | 日期 |
|---|---|---|
| `p140a-adsense-scaffold-shipped.md` | P140a — AdSense compliance scaffold (shipped 2026-07-31) | 2026-07-31 |
| `p140b-editorial-prose-shipped.md` | P140b Editorial Prose Mass-Write — Ship Record (2026-08-04, catch-up) | 2026-08-04 |
| `p140c-eeat-completion-shipped.md` | P140c E-E-A-T Completion — Ship Record (2026-08-18) | 2026-08-18 |
| `p140d-t8-zh-coverage-guard-shipped.md` | P140d-T8 zh 缺位 warn → build-fail upgrade — SHIPPED |  |
| `p140d-tier-threshold-tightening-shipped.md` | P140d Tier Threshold Tightening — Ship Record (2026-08-18) | 2026-08-18 |
| `p140f-b2-letter-a-extension-shipped.md` | P140f-B2 Letter A SaaS Metrics Extension — SHIPPED |  |
| `p140f-b2-letter-b-extension-shipped.md` | P140f-B2 Letter B AI Cost Extension — SHIPPED |  |
| `p140f-b2-letter-c-extension-shipped.md` | P140f-B2 Letter C Valuation Extension — SHIPPED |  |
| `p140f-b2-letter-d-extension-shipped.md` | P140f-B2 Letter D Freelance Extension — SHIPPED |  |
| `p140f-b2-letter-e-extension-shipped.md` | P140f-B2 Letter E Cost & Efficiency Extension — SHIPPED |  |
| `p140f-b2-letter-f-extension-shipped.md` | P140f-B2 Letter F Investment & Real Estate Extension — SHIPPED |  |
| `p140f-b2-letter-h-extension-shipped.md` | P140f-B2 Letter H Hiring & Team Extension — SHIPPED |  |
| `p140f-b2-letter-k-extension-shipped.md` | P140f-B2 Letter K Knowledge Extension — SHIPPED |  |
| `p140f-b2-letter-l-extension-shipped.md` | P140f-B2 Letter L Legal & Compliance Extension — SHIPPED |  |
| `p140f-b2-letter-m-extension-shipped.md` | P140f-B2 Letter M Marketing Analytics Extension — SHIPPED |  |
| `p140f-b2-letter-o-extension-shipped.md` | P140f-B2 Letter O Operations / Inventory Extension — SHIPPED |  |
| `p140f-b2-letter-p-extension-shipped.md` | P140f-B2 Letter P Product Analytics Extension — SHIPPED |  |
| `p140f-b2-letter-r-extension-shipped.md` | P140f-B2 Letter R Retention & Customer Success Extension — SHIPPED |  |
| `p140f-b2-letter-s-extension-shipped.md` | P140f-B2 Letter S Sales / Pipeline Management Extension — SHIPPED |  |
| `p140f-b2-letter-t-extension-shipped.md` | P140f-B2 Letter T Customer Support Extension — SHIPPED |  |
| `p140f-batch-a-followup-tier1-content-fill-shipped.md` | P140f Batch A Quick Follow-up — SHIPPED |  |
| `p140f-batch-a-tier1-anchors-shipped.md` | P140f Batch A Tier 1 Anchor Topics — SHIPPED |  |
| `p140f-batch-a-tier1-content-fill-shipped.md` | P140f Batch A Tier 1 Anchor Topic Content Fill — SHIPPED |  |
| `p140f-phase2-tier1-extension-shipped.md` | P140f Phase 2 — Tier 1 Anchor Topic Extension — PHASE SHIPPED |  |
| `p140f-phase4-comparison-pages-shipped.md` | P140f Phase 4 — Comparison Pages — PHASE SHIPPED |  |
| `p140g-author-bio-pages-shipped.md` | P140g Author Bio Pages — SHIPPED |  |
| `p141h-adsense-p0-fixes-shipped.md` | P141h AdSense P0 Audit Fixes — SHIPPED |  |
| `p141i-prose-p1-deepening-shipped.md` | P141i Prose P1 Deepening — SHIPPED |  |
| `p142-p141-followup-shipped.md` | P142 P141-followup Integration Batch — Ship Record (2026-08-13) | 2026-08-13 |
| `p143-build-dep-fixes-shipped.md` | P143 Pre-existing Build-Dep Failures Fix — Ship Record (2026-08-14) | 2026-08-14 |
| `p144-p143-followup-shipped.md` | P144 P143-followup — Ship Record (2026-08-17) | 2026-08-17 |
| `p145-comprehensive-build-dep-shipped.md` | P145 Comprehensive Build-Dep Failures Closure — Ship Record (2026-08-17) | 2026-08-17 |
| `p146-p145-followup-shipped.md` | P146 P145-followup — Ship Record (2026-08-18) | 2026-08-18 |
| `p147-followup-shipped.md` | P147 Followup — Test Design Quality — SHIPPED |  |
| `p147-quick-wins-shipped.md` | P147 Quick Wins — Phase 4 Followup — SHIPPED |  |
| `p148-d-shipped.md` | P148-D Shipped — S6 Freshness Audit + S7 llms.txt |  |
| `p148-e-shipped.md` | P148-E Shipped — S13+S14 Audits + S11 IndexNow Integration |  |

### P150–P159

| 文件 | 标题 | 日期 |
|---|---|---|
| `p150-uc-advisor-phase1-shipped.md` | P150 User-Centric Advisor - Phase 1 Shipped |  |
| `p150-uc-advisor-phase2-shipped.md` | P150 UC-advisor Phase 2 - Shipped |  |
| `p151-dimension-1-audit-report.md` | P151 Dimension 1 Audit Report |  |
| `p151-dimension-1-spotcheck-2026-09-01.md` | P151 Dimension 1 Spot-Check Report |  |
| `p151-l5-backfill-batch1-2026-09-01.md` | P151 L5 Backfill Batch 1 — Shipped |  |
| `p151-l5-backfill-batch2-2026-09-01.md` | P151 L5 Backfill Batch 2 — Shipped |  |
| `p151-l5-backfill-batch3-2026-09-02.md` | P151 L5 Backfill Batch 3 — Shipped |  |
| `p151-preset-chip-unification-shipped.md` | P151 — AI Cost Preset Chip Unification — SHIPPED |  |

### ZZ · 其它（市场信号 / 审计 / 清单）

| 文件 | 标题 | 日期 |
|---|---|---|
| `adsense-reapply-checklist-2026-09-01.md` | AdSense Re-Apply Checklist — Target 2026-09-01 | 2026-09-01 |
| `adsense-resubmit-window.md` | AdSense Resubmit Window — 2-Week Wait |  |
| `audit-gemini-extractability-2026-08-26.md` | Gemini Deep Research Extractability Audit |  |
| `audit-scaled-content-2026-08-25.md` | Scaled-Content Uniqueness Audit — 2026-08-25 | 2026-08-25 |
| `market-signal-2026-08-25-round2.md` | Market Signal Scan — 2026-08-25 (Round 2) | 2026-08-25 |
| `market-signal-2026-08-25-round3.md` | Market Signal Scan — 2026-08-25 (Round 3) | 2026-08-25 |
| `market-signal-2026-08-25.md` | Market Signal Scan — 2026-08-25 | 2026-08-25 |
| `market-signal-2026-08-26-round4.md` | Market Signal Scan — Round 4 (2026-08-26) | 2026-08-26 |
| `market-signal-2026-08-26-round5.md` | Market Signal Scan — Round 5 (2026-08-26) | 2026-08-26 |
| `market-signal-2026-08-26-round6.md` | Market Signal Scan — Round 6 (2026-08-26) | 2026-08-26 |

## 类别计数

| Section | 描述 | Ship log 文件数 |
|---|---|---|
| 0 | Pre-P12 gaps (历史 ship logs 缺失, 不补) | 0 (gap) |
| 1 | P12 — Customer Support | 7 (6 calcs + series) |
| 2 | P13 — Knowledge/Documentation | 7 (6 calcs + series) |
| 3 | P14 — Legal & Compliance | 8 (6 calcs + followup + series) |
| 4 | P15 / P16 / P17 (cross-cutting + milestone + i18n cluster) | 4 |
| 5 | P8 (5 of 6) + P9 (2 of 6) + P10 (fix only) + P11 (7) | 5 + 2 + 1 + 7 = 15 |
| 6 | P35+ — 后续批次 ship logs（P35 → P167） | 138 |
| **Indexed ship logs** | | **179** |
| (目录内另有两个非 ship log 文件：INDEX.md + MEMORY.md) | | 2 |
| **目录文件总数** | | **181** |

> **核对:** 各段登记数之和 = **179** 个 ship log；目录内另有 INDEX.md + MEMORY.md 两个非 ship log 文件 ⇒ 目录 .md 总数 = **181**。
> ⭐ 这张表由 `tests/doc-freshness-guard` 的「类别计数表 == 实际登记数」断言盯着 —— 加了文件却没改表 ⇒ CI 会红。

---

## 与 user-global memory 的关系

| Surface | 位置 | 内容 | 起始 |
|---|---|---|---|
| **项目级 memory/** (本目录) | `D:/E/独立站/youtube-tools/memory/` (git-tracked) | P12 起的 ship logs + 系列 summary + fix logs | 2026-07-10 |
| **User-global memory/** | `~/.claude/projects/D--E-----youtube-tools/memory/` (gitignored) | P22b 起的 ship logs + MEMORY.md 跨 session 索引 + cascade audit memory | 2026-07-18 |

**Single source of truth:** 项目级 memory 是 canonical（git history）；user-global memory 是 navigation layer + cross-session continuity。

---

## 维护约定

- INDEX.md 是 navigator，**不**详述每条 ship log（`MEMORY.md` 是单行详细索引）。
- 新 ship log 落盘后必须在本 INDEX 同步加一行 + 更新计数。
- Pre-P12 gaps 不补（per P32 invariant: don't fake history）。
- P17 cluster 单一聚合页用 `#anchor` 引用，**不**为每个 P17 sub-batch 单列。
- 系列 ship log (`*-series-shipped.md`) 单列；per-calc ship logs 跟随对应 series section。
