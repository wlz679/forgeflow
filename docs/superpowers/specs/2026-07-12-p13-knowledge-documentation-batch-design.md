# P13 Knowledge/Documentation Calculator Batch — Design Spec

> **Status**: Draft (P13 series, vertical-depth batch #11)
> **Author**: ForgeFlowKit Team
> **Date**: 2026-07-12
> **Pattern**: P-series vertical-depth batch (P4-P12 shipped, P13 is #11)

---

## 1. Overview

### 1.1 What

**P13 Knowledge/Documentation Calculator Batch** — 6 new calculators in NEW 'K' Knowledge/Documentation category, completing the **content-operations** dimension of the ForgeFlowKit suite. Closes the **KB upstream loop** that P12-5 (Deflection Rate) depends on: every DevRel/Tech Writer decision (KB coverage / freshness / search / deflection quality / ROI / article quality) has a quantitative anchor.

### 1.2 Why

Currently 13 categories live (A B C D E F H M O P R S T), totaling **86 engines**. Vertical-depth pattern has shipped 10 batches (P4-P12), each filling a customer-journey decision-making dimension:

| Batch | Vertical | Persona | Closes loop |
|-------|----------|---------|-------------|
| P4 | Investment/Finance (B/F subset) | Founder | unit economics |
| P5 | Real Estate | Real-estate investor | alternative asset |
| P6 | Marketing Analytics | Growth/CMO | acquisition |
| P7 | Operations/Inventory | Ops manager | inventory cost |
| P8 | Sales/CRM | RevOps | deal closing |
| P9 | Retention/CS | CSM | customer keep |
| P10 | Product Analytics | PM | in-product engagement |
| P11 | Hiring/Team | People-ops | team scaling |
| P12 | Customer Support (NEW) | Head of CS / CS Ops | service ops cost |
| **P13** | **Knowledge/Documentation (NEW)** | **DevRel Lead / Tech Writer** | **KB upstream quality** |

**Gap addressed**: No existing calculator talks about **KB content health** (coverage, freshness, search effectiveness, deflection quality, ROI, helpfulness). KB is the #1 input to P12-5 Deflection Rate — KB content gaps are the #1 deflection killer per Gartner 2024 + Zendesk CX Trends. P13 closes the upstream loop: P13 measures **why** deflection succeeds/fails; P12-5 measures **how much**.

### 1.3 Persona anchor

**Mid-market B2B SaaS, $10M-$50M ARR, 50-200 employees, US-based, Series A-B.** Every description includes this persona string.

**Primary reader**: DevRel Lead · Documentation Manager · Technical Writer. Secondary: Head of CS evaluating KB investment; CFO modeling content ops ROI; PM evaluating product doc gaps.

### 1.4 Funnel closure — explicit cross-links

```
P13 KB upstream          →    P12 service ops downstream
─────────────────────────────────────────────────────────
K-1 Coverage Rate        →    P12-5 Deflection (gap = lost deflection)
K-2 Freshness            →    P12-5 Deflection (stale = inaccurate deflection)
K-3 Search Effectiveness →    P12-2 FRT (no-result → human ticket)
K-4 Deflection Quality   ←→   P12-5 Deflection (volume vs quality dual)
K-5 Doc ROI              ←    P12-1 Cost × P12-5 Deflection
K-6 Helpfulness Score    →    P12-4 CSAT (helpful = better CSAT driver)
```

**Most important pairing**: K-5 Doc ROI = P12-1 × P12-5 — completes the KB ↔ Service financial loop.

---

## 2. Roster — 6 Calculators

Each calc forms a KB content quality funnel:

```
K-1 Coverage → K-2 Freshness → K-3 Search → K-4 Deflection Quality → K-5 ROI → K-6 Helpfulness
   (gap?)        (stale?)       (findable?)   (accurate?)            (worth it?)   (useful?)
```

**Total inputs across 6 calcs: 26** (4 + 4 + 4 + 4 + 5 + 5 = 26).

| # | Calc | Slug | Inputs | Canonical |
|---|------|------|--------|-----------|
| 1 | KB Coverage Rate | `solopreneur-kb-coverage-rate-calculator` | 4 | 70% coverage (Good), 30% gap = ~1,500 tickets without KB article |
| 2 | Article Freshness | `solopreneur-article-freshness-calculator` | 4 | 65% fresh in 12mo, 35% stale (Good) |
| 3 | Search Effectiveness | `solopreneur-search-effectiveness-calculator` | 4 | CTR 75% / no-result 8% (Good) |
| 4 | Deflection Quality | `solopreneur-deflection-quality-calculator` | 4 | 88% quality / 12% reopen (Good) |
| 5 | Documentation ROI | `solopreneur-documentation-roi-calculator` | 5 | 1200% ROI, $40K net, $133/article/mo (Good) |
| 6 | Article Helpfulness Score | `solopreneur-article-helpfulness-calculator` | 5 | 78% helpful + 12% vote rate (Good) |

**Cross-link natural pairs**:
- K-1 ↔ P12-5: coverage gap → lost deflection volume (monthly dollar value of missing articles)
- K-4 ↔ P12-5: deflection volume vs quality — together = complete KB ROI story
- K-5 ↔ P12-1 + P12-5: KB team cost vs (cost-per-ticket × deflection savings) = true ROI
- K-6 ↔ P12-4: article helpfulness drives CSAT — both are quality outcomes

---

## 3. Per-Calc Detail

### 3.1 KB Coverage Rate

**Question**: "What % of common support questions have KB articles?"

**Inputs** (4):
- `monthly_tickets` (number, tickets/mo, e.g. 5000) — total inbound support tickets this month
- `tickets_with_kb_match` (number, tickets/mo, e.g. 3500) — tickets where a matching KB article exists
- `total_articles` (number, e.g. 500) — total articles in KB
- `industry_benchmark` (select: SaaS / FinTech / HealthTech / eCommerce / default SaaS) — for benchmark tooltip only

**Math**:
```
coverage_rate = tickets_with_kb_match / monthly_tickets
gap_rate = 1 - coverage_rate
gap_tickets = monthly_tickets - tickets_with_kb_match
```

**4-band (HIGHER — more coverage = better; critical = -Infinity)**:
- 🟢 Excellent: ≥ 85%
- 🟡 Good: 60% ≤ x < 85%
- 🟠 Warning: 40% ≤ x < 60%
- 🔴 Critical: < 40%

**Canonical**: 3500 / 5000 = **70%** (🟡 Good), 30% gap = ~1,500 tickets/mo without KB article

**6 v3 sections**:
- Health: 70% KB coverage (🟡 Good), 30% gap
- Snapshot: 3,500 of 5,000 tickets matched · 500 articles · 1,500 tickets/mo without KB
- What-If: If coverage climbs to 85% (Excellent), 750 fewer tickets/mo reach humans (at $24/ticket = $18K/mo saved, see K-5)
- Break-Even: To hit ≥85%, need ~750 more article coverage OR ~150 net new articles at current match rate
- Milestone: Re-audit gap quarterly — product launches add 50-100 ticket topics
- Tip: Tickets without KB match = KB candidate list. Run this monthly and feed gaps to writers.

**Sources**: TSIA Knowledge Management Benchmark 2024 · Zendesk CX Trends 2024 · Gartner Customer Service 2024 · Google "pogo-sticking" UX research

### 3.2 Article Freshness

**Question**: "What % of KB articles are fresh (updated in last 12 months)?"

**Inputs** (4):
- `total_articles` (number, e.g. 500) — total articles in KB
- `articles_updated_12mo` (number, e.g. 325) — articles updated in last 12 months
- `articles_updated_6mo` (number, e.g. 200) — articles updated in last 6 months (for cadence sub-metric)
- `target_freshness_pct` (number, %, e.g. 70) — internal freshness target

**Math**:
```
fresh_rate_12mo = articles_updated_12mo / total_articles
fresh_rate_6mo = articles_updated_6mo / total_articles
stale_rate = 1 - fresh_rate_12mo
stale_count = total_articles - articles_updated_12mo
gap_pct = target_freshness_pct - (fresh_rate_12mo * 100)  // positive = below target
```

**4-band (HIGHER — fresher = better; critical = -Infinity)**:
- 🟢 Excellent: ≥ 80%
- 🟡 Good: 55% ≤ x < 80%
- 🟠 Warning: 40% ≤ x < 55%
- 🔴 Critical: < 40%

**Canonical**: 325 / 500 = **65%** (🟡 Good), 35% stale = 175 articles need review

**6 v3 sections**:
- Health: 65% KB freshness (12mo) (🟡 Good), 35% stale = 175 articles
- Snapshot: 325/500 updated 12mo · 200/500 updated 6mo · 175 stale · target 70% (5pp gap)
- What-If: If 12mo freshness climbs to 80% (Excellent), 75 more articles reviewed (~10/mo cadence)
- Break-Even: To hit ≥80% (Excellent), need 75 more articles reviewed; at 10/mo cadence = ~8 months
- Milestone: Audit stale articles quarterly — products that change >2x/year need reviews every 6mo
- Tip: Stale articles are the silent killer — 35% of KB has wrong info customers act on. Tag with last-reviewed date.

**Sources**: NN/g Help & Documentation Guidelines · TSIA Knowledge-Centered Service 2024 · Intercom Help Center Best Practices

### 3.3 Search Effectiveness (composite — CTR + no-result)

**Question**: "Can customers find what they need in KB search?"

**Inputs** (4):
- `total_searches` (number, searches/mo, e.g. 12000) — total KB search queries this month
- `searches_with_click` (number, e.g. 9000) — searches that resulted in at least 1 click on an article
- `searches_no_result` (number, e.g. 960) — searches that returned no matching article
- `industry_benchmark` (select: B2B SaaS / Consumer / default B2B SaaS) — for benchmark tooltip only

**Math**:
```
ctr_pct = (searches_with_click / total_searches) * 100
no_result_pct = (searches_no_result / total_searches) * 100
// Note: searches_with_click + searches_no_result may be < total_searches (some users searched but neither clicked nor got a no-result, e.g. abandoned)
```

**4-band (HIGHER — composite of CTR + no-result; both directions matter)**:
- 🟢 Excellent: CTR ≥ 85% AND no-result ≤ 5%
- 🟡 Good: CTR ≥ 70% AND no-result ≤ 10%
- 🟠 Warning: CTR ≥ 55% AND no-result ≤ 20%
- 🔴 Critical: any of CTR < 55% OR no-result > 20%

**Canonical**: 9000/12000 = CTR **75%** · 960/12000 = no-result **8%** → **🟡 Good** (75% ≥ 70% AND 8% ≤ 10%)

**6 v3 sections**:
- Health: Search Effectiveness 🟡 Good (CTR 75% / no-result 8%)
- Snapshot: 12,000 searches/mo · 9,000 with click · 960 no-result · 2,040 abandoned/dwell
- What-If: If CTR climbs to 85% (Excellent) at same no-result, 1,200 more searches find answers → at ~50% click-to-ticket-prevention rate, ~600 fewer tickets/mo (at P12-1 cost-per-ticket)
- Break-Even: To hit Excellent, need CTR ≥85% (1,200 more clicks) OR no-result ≤5% (360 fewer no-result searches)
- Milestone: Search "pogo-sticking" (search → click → back to search) is the #1 KB UX failure — track per query weekly
- Tip: No-result >15% means content gaps OR bad search synonyms — run K-1 Coverage Rate on top no-result queries

**Sources**: Google "pogo-sticking" UX research · NN/g Search UX guidelines · Algolia Search Benchmarks 2024 · Coveo Enterprise Search 2024

### 3.4 Deflection Quality (deflected-no-reopen)

**Question**: "Of tickets deflected via KB/chatbot, what % did customers actually solve (didn't reopen in 30 days)?"

**Inputs** (4):
- `tickets_deflected_30d` (number, tickets/30d, e.g. 1750) — tickets deflected via KB/chatbot in last 30 days
- `tickets_reopened_30d` (number, tickets/30d, e.g. 210) — of the deflected, those that reopened within 30 days
- `target_quality_pct` (number, %, e.g. 90) — internal quality target
- `deflection_source` (select: KB / Chatbot / Both) — for source-aware tooltip

**Math**:
```
reopen_rate_pct = (tickets_reopened_30d / tickets_deflected_30d) * 100
quality_pct = 100 - reopen_rate_pct
gap_pct = (target_quality_pct - quality_pct)  // positive = below target
```

**4-band (INVERSE on reopen — lower reopen = better quality; critical = Infinity)**:
- 🟢 Excellent: reopen ≤ 8% (quality ≥ 92%)
- 🟡 Good: reopen ≤ 15% (quality ≥ 85%)
- 🟠 Warning: reopen ≤ 25% (quality ≥ 75%)
- 🔴 Critical: reopen > 25%

**Canonical**: 210/1750 = reopen **12%** → quality **88%** (🟡 Good), 5pp gap from 90% target

**6 v3 sections**:
- Health: Deflection Quality 🟡 Good (reopen 12% / quality 88%)
- Snapshot: 1,750 deflected/30d · 210 reopened/30d · 88% quality · 5pp gap from 90% target
- What-If: If reopen drops to 8% (Excellent), ~70 fewer reopened/mo = ~$1,680 saved (P12-1 cost)
- Break-Even: To hit Excellent (≤8% reopen), need 70 fewer reopened/mo — usually = audit top-20 reopened articles + rewrite
- Milestone: Reopened tickets are KB's #1 credibility killer — track weekly, audit top-20 every quarter
- Tip: Deflection volume (P12-5) without quality (K-4) is misleading. >50% deflection with 30% reopen means KB is masking product gaps — fix the gaps, not the KB.

**Sources**: TSIA Knowledge-Centered Service 2024 · Zendesk CX Trends 2024 · ICMI 2023 · Gartner Customer Service 2024

### 3.5 Documentation ROI

**Question**: "Is our KB investment worth it?"

**Inputs** (5):
- `kb_team_monthly_cost` (number, $/mo, e.g. 15000) — total monthly KB team cost (writers + editors + tools)
- `deflected_tickets_monthly` (number, tickets/mo, e.g. 1750) — monthly deflected tickets (from P12-5)
- `cost_per_ticket` (number, $/ticket, e.g. 24) — fully-loaded cost per ticket (from P12-1)
- `articles_total` (number, e.g. 500) — total KB articles
- `roi_target_pct` (number, %, e.g. 500) — internal ROI target

**Math**:
```
gross_savings = deflected_tickets_monthly * cost_per_ticket
net_savings = gross_savings - kb_team_monthly_cost
roi_pct = (net_savings / kb_team_monthly_cost) * 100
cost_per_article_per_month = kb_team_monthly_cost / articles_total
gap_roi_pct = roi_target_pct - roi_pct  // positive = below target
```

**4-band (HIGHER — higher ROI = better; critical = -Infinity)**:
- 🟢 Excellent: ROI ≥ 400% AND cost-per-article ≤ $50/mo
- 🟡 Good: ROI ≥ 150%
- 🟠 Warning: ROI ≥ 50%
- 🔴 Critical: ROI < 50%

**Canonical**: gross = 1750 × $24 = $42,000 · net = $42,000 - $15,000 = $27,000 · ROI = **180%** · cost-per-article = **$30/mo** → **🟡 Good** (≥150%)

**6 v3 sections**:
- Health: Doc ROI 🟡 Good (180% ROI · $27K net/mo · $30/article/mo)
- Snapshot: $15K KB team cost · 1,750 deflected/mo · $24 cost/ticket · $42K gross saved · $27K net
- What-If: If deflection climbs to 2,500/mo (+43%, see K-1 Coverage), gross = $60K, net = $45K, ROI = 300% (Excellent)
- Break-Even: To hit Excellent (≥400% ROI AND ≤$50/article), need either 2.5× deflection OR 33% lower KB cost
- Milestone: KB team cost scales linearly with article count — 1,000 articles needs 2× team or it'll decay. Plan headcount alongside K-2 freshness.
- Tip: Pair with K-1 Coverage Rate — closing coverage gaps is the cheapest ROI win. New article = ~$30/mo ongoing cost.

**Sources**: TSIA Knowledge Management Benchmark 2024 · Content Marketing Institute 2024 · Forrester Content Operations 2024 · HubSpot KB Analytics

### 3.6 Article Helpfulness Score

**Question**: "Do customers find our KB articles useful?"

**Inputs** (5):
- `total_article_views` (number, views/30d, e.g. 25000) — total KB article views in last 30 days
- `helpful_votes` (number, votes/30d, e.g. 2400) — 👍 helpful votes received
- `unhelpful_votes` (number, votes/30d, e.g. 700) — 👎 unhelpful votes received
- `total_articles` (number, e.g. 500) — total KB articles
- `target_helpful_pct` (number, %, e.g. 75) — internal helpfulness target

**Math**:
```
total_votes = helpful_votes + unhelpful_votes
helpful_pct = total_votes > 0 ? (helpful_votes / total_votes) * 100 : null
vote_rate_pct = (total_votes / total_article_views) * 100
gap_pct = target_helpful_pct - helpful_pct  // positive = below target
```

**4-band (HIGHER — more helpful = better; critical = -Infinity)**:
- 🟢 Excellent: helpful ≥ 85% AND vote-rate ≥ 15%
- 🟡 Good: helpful ≥ 70% AND vote-rate ≥ 8%
- 🟠 Warning: helpful ≥ 55%
- 🔴 Critical: helpful < 55% OR vote-rate < 3%

**Canonical**: total_votes = 3,100 · helpful = 2400/3100 = **77%** · vote_rate = 3100/25000 = **12%** → **🟡 Good** (≥70% AND ≥8%)

**6 v3 sections**:
- Health: Helpfulness 🟡 Good (helpful 77% · vote-rate 12%)
- Snapshot: 25,000 views · 2,400 👍 · 700 👎 · 3,100 total votes · 12% participation · 77% helpful
- What-If: If helpful climbs to 85% (Excellent) at same vote-rate, 235 more 👍 votes/mo — usually = rewrite top-20 unhelpful articles
- Break-Even: To hit Excellent, need 235 more helpful votes OR 235 fewer unhelpful (audit bottom-20 articles)
- Milestone: Vote-rate <5% means UI isn't surfacing the prompt OR users don't trust the feedback loop
- Tip: Unhelpful votes = article rewrite list. Sort by unhelpful count, rewrite top-20 quarterly. Pair with K-2 Freshness — 70% of unhelpful votes are on stale articles.

**Sources**: Zendesk Help Center Benchmarks · Intercom Article Rating · HubSpot KB Analytics · TSIA Knowledge-Centered Service 2024

---

## 4. Health Bands — Direction Summary

| Calc | Direction | Critical threshold | Canonical (Good) | Excellent threshold |
|------|-----------|-------------------|------------------|---------------------|
| K-1 Coverage Rate | HIGHER | -Infinity | 70% | ≥85% |
| K-2 Article Freshness | HIGHER | -Infinity | 65% fresh | ≥80% |
| K-3 Search Effectiveness | HIGHER (composite) | -Infinity | CTR 75% / no-result 8% | CTR ≥85% AND no-result ≤5% |
| K-4 Deflection Quality | INVERSE (reopen) | Infinity | reopen 12% / quality 88% | reopen ≤8% (quality ≥92%) |
| K-5 Doc ROI | HIGHER | -Infinity | 180% ROI | ≥400% AND ≤$50/article |
| K-6 Helpfulness Score | HIGHER | -Infinity | helpful 77% / vote-rate 12% | helpful ≥85% AND vote-rate ≥15% |

**Direction mix**: 5 HIGHER · 1 INVERSE (vs P12: 4 HIGHER · 2 INVERSE)

---

## 5. Implementation — 8-File Wiring (per calc)

Each calc requires 8 file edits, all validated:

1. `src/engines/knowledge/<slug>-calculator.ts` — engine + HEALTH_BANDS + math + customFn + generate + faq + howToUse + sources
2. `src/engines/knowledge/index.ts` — barrel (+1 line per calc, all 6 in P13-0)
3. `src/data/tools/knowledge.ts` — ToolMeta entries × 6 (5 fields + 8-9 keywords + 3 sources + reviewedBy/author/dataReviewedAt)
4. `src/data/og-samples.json` — OG card headline (en + zh, ×6 = 12 entries)
5. `scripts/codegen-examples.mjs` — ENGINES registration (+1 entry per calc, subdir: 'knowledge')
6. `tests/ab-split.test.ts` — bump engine count progressive 86→87→88→89→90→91→92
7. `tests/<slug>-calculator.test.ts` — per-calc math tests (10-13 each, total ~67-70)
8. `tests/internal-links.test.ts` — bump per calc 86→87→88→89→90→91→92 (P8-0 over-bump lesson: per-calc, not last-calc only)

**Scaffold files (P13-0 only)**:
- `src/pages/[lang]/knowledge.astro` — listing page (template from customer-support.astro)
- `src/data/categories.ts` — 'K' Knowledge entry appended (14th)
- `src/engines/index.ts` — pre-emptive `import './knowledge';` (P9-1 + P10-1 + P11-1 + P12-0 lesson)
- `src/data/tools/index.ts` — pre-emptive `import { tools as knowledge }` + spread

---

## 6. Scope Boundary — Explicit Out-of-Scope

| Out of Scope | Reason |
|---|---|
| API docs (OpenAPI / reference) | Persona too wide; would split into 2 categories |
| Multi-language / translation coverage | Mid-market SaaS is English-first; splits traffic |
| KB content *writing* quality (NLP scoring) | AI scoring too subjective; overlaps with existing AI cost engines |
| Author collaboration / writer velocity (Set B from brainstorm) | Overlaps with P11 hiring (people-ops); Set A focused on KB health |
| Doc-driven onboarding activation (Set C from brainstorm) | Overlaps with P10 product analytics; Set A focused on KB health |
| Enterprise KB features (versioning, branching) | Beyond mid-market scope; no comparable calc market |
| KB vendor comparisons (Zendesk vs Intercom vs Document360) | Vendor-specific; out of scope for neutral calculator |
| Implementation note: K-3 composite band uses both CTR and no-result as dual thresholds (matches industry dashboards; alternative would be weighted composite which adds implementation complexity without clearer guidance) |

---

## 7. Cross-Calc Cross-Links (validated)

| Pair | Link | User Benefit |
|------|------|--------------|
| K-1 ↔ P12-5 | coverage gap → lost deflection $ | Shows CFO why KB investment pays |
| K-4 ↔ P12-5 | volume × quality = true deflection ROI | Catches "high volume, low quality" KB masking product gaps |
| K-5 ↔ P12-1 + P12-5 | KB ROI = (deflected × cost/ticket) - KB cost | Single calc that proves content ops worth to CFO |
| K-6 ↔ P12-4 | article helpfulness → CSAT driver | Quality outcome metric (different from sentiment survey) |
| K-1 ↔ K-3 | no-result queries = KB coverage gap | Top no-result queries = article backlog |
| K-2 ↔ K-4 | stale articles → reopen spike | Audit stale first when reopen rate climbs |

---

## 8. Risk & Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| K-3 composite band (CTR + no-result) implementation complexity | Medium | Use 2 hard thresholds (both must pass) per band; matches P9-5 customer-health pattern |
| K-4 reopen 30-day window depends on ticket reopen tracking | Medium | Doc clearly: "skip if no reopen tracking"; pair K-3 + K-6 as alternative |
| K-5 cross-calc data reference to P12-1/P12-5 | Low | Canonical input explicitly notes P12-1/P12-5 as reference sources; not enforced linkage |
| K-6 vote-rate <5% cold start (no UI prompt) | Low | Canonical vote-rate 12% with explicit ⚠️ Tip "vote-rate low = feedback loop broken" |
| Article Freshness 6mo sub-metric vs 12mo main metric confusion | Low | 6mo is informational only; 12mo drives health band |
| K-1 industry_benchmark is informational only | Low | Select dropdown exists for UI affordance but doesn't change math; no band coupling |
| 26 inputs × 6 calcs under P12's 31 (slightly fewer) | None | Within P-series range (P9: 20 inputs, P11: ~40 inputs) |
| Float-precision in K-3 CTR + no-result | Low | Math unrounded, display rounds; matches P12 pattern |

---

## 9. Estimated Total

| Metric | Estimate |
|--------|----------|
| Total commits | 8 (scaffold + 6 calcs + 1 holistic fix + 1 docs) |
| Engines | 86 → **92** (+6) |
| Categories | 13 → **14** (NEW 'K' Knowledge/Documentation) |
| Total inputs | 26 (across 6 calcs) |
| Total tests | ~70 (per calc 10-13, range 60-78) |
| Pass / fail target | ≥700 pass / 0 fail |
| dist pages | +6 calc × 2 langs + 2 listing pages × 2 langs = +16 |

---

## 10. Open Questions (resolved during brainstorm)

| Question | Resolution |
|----------|------------|
| Persona scope (product docs vs API docs vs content marketing) | **Product docs only** (DevRel Lead / Tech Writer) |
| Which 6 calcs (Set A/B/C) | **Set A KB Health Baseline** |
| Funnel closure vs product width | **Funnel closure** (K pairs with P12-5) |
| Whether to include 6th calc on localization/translation | **No** — splits traffic, English-first persona |
| Composite band vs single-axis for K-3 | **Composite dual-threshold** (CTR AND no-result) |

---

## 11. Success Criteria

P13 ships successfully when:

1. **All 6 calcs pass** `pnpm check` (codegen-examples + codegen-customfn + 700+ tests)
2. **All 6 calcs have** 4-band HEALTH_BANDS with correct direction
3. **All 6 calcs follow** 6-section v3 template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
4. **Engine count** 86 → 92 verified
5. **Category count** 13 → 14 verified (NEW 'K' Knowledge/Documentation)
6. **3-way sync** (local + github + gitee) at final commit
7. **Holistic review** catches ≥1 cross-cutting issue before push (P10-7 lesson)
8. **0 pre-existing test failures** in 5 build tests (baselayout-* / header-* / privacy-policy-sync)

---

## 12. Lessons to Apply (from P12 series)

1. **ROOT barrel pre-emptive fix in scaffold** (P9-1 + P10-1 + P11-1 + P12-0 lesson) — update `src/engines/index.ts` + `src/data/tools/index.ts` in P13-0
2. **Parse-blocker prevention** — run `node -e "require('./src/engines/knowledge/<slug>-calculator.ts')"` after each engine write
3. **Internal-links per-calc bump** (P12-1 lesson) — bump 86→87→88...92 per calc, NOT at P13-6
4. **INVERSE band with Infinity critical** (P9-4 + P12-1 lesson) — applied to K-4
5. **HIGHER band with -Infinity critical** — applied to K-1/K-2/K-3/K-5/K-6
6. **CustomFn dynamic values** (P12-1 lesson) — all monetary/threshold values from inputs
7. **Float-precision dual-layer** — math unrounded, display rounds
8. **TS warnings tolerated** (P10/P11 lesson) — pnpm check exits 0
9. **TS apostrophe in single quotes** (P12-6 lesson) — use python or sed to fix `agent\'s` → `agent's`
10. **Bash heredoc issues** — use Node appendFileSync for engine files >5000 chars

---

## 13. Reference Files

- P12 series memory: `memory/p12-series-shipped.md`
- P12 spec template: `docs/superpowers/specs/2026-07-10-p12-customer-support-batch-design.md`
- Category list: `src/data/categories.ts`
- Engine pattern: `CLAUDE.md` § Architecture → Engines
- 8-file wiring checklist: P12 spec § 5 (mirrored above)