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

## 类别计数

| Section | 描述 | Ship log 文件数 |
|---|---|---|
| 0 | Pre-P12 gaps (历史 ship logs 缺失, 不补) | 0 (gap) |
| 1 | P12 — Customer Support | 7 (6 calcs + series) |
| 2 | P13 — Knowledge/Documentation | 7 (6 calcs + series) |
| 3 | P14 — Legal & Compliance | 8 (6 calcs + followup + series) |
| 4 | P15 / P16 / P17 (cross-cutting + milestone + i18n cluster) | 4 |
| 5 | P8 (5 of 6) + P9 (2 of 6) + P10 (fix only) + P11 (7) | 5 + 2 + 1 + 7 = 15 |
| **Indexed ship logs** | | **41** |
| (本 INDEX.md + MEMORY.md) | | 2 |
| **目录文件总数** | | **43** |

> **核对:** `ls memory/ | wc -l` = 42 (含本 INDEX.md 在 git add 之前) → 当前 42 + INDEX.md (NEW) = **43** files。

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
