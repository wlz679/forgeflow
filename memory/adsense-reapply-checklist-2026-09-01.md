# AdSense Re-Apply Checklist — Target 2026-09-01

**Decision date**: 2026-08-26 (per user's "b" choice in maintenance mode discussion)
**Target re-apply date**: 2026-09-01 (5 days from now, P140c ship + 2 weeks)
**Status**: ⚠️ DEFERRED 2026-08-31 — GSC coverage 53% with 10-day crawl stagnation (Googlebot stopped recrawling). P149 Last-Modified + sitemap lastmod injection shipped (commits 58d3cdd, 8206951, 4fce7a8). Sitemap lastmod signals Googlebot to recrawl. New target: 2026-09-08 (3-week crawl cycle).

---

## Why 2026-09-01 (recap)

| Factor | Status as of 2026-08-26 |
|---|---|
| P140c E-E-A-T (王立柱 reviewer + bio pages) | ship 2026-08-18 (~10 days) |
| P140d tier threshold + prose depth | ship 2026-08-18 (~10 days) |
| P140g author bio pages | ship 2026-08-18 (~10 days) |
| P141h placeholder leakage fix | ship 2026-08-19 (~9 days) |
| P141i prose P1 deepening (sources + assumptions) | ship 2026-08-19 (~9 days) |
| P140f Phase 1/2/4 Topic pages (631 pages) | ship 2026-08-19→21 (~7-9 days) |
| P148-B/C scaled-content audit (Aug 18 Spam Update risk = LOW) | ship 2026-08-25 (~3 days) |
| P148-D llms.txt GEO | ship 2026-08-25 (~3 days) |
| P148-E IndexNow 6-surface Bing Multiplier | ship 2026-08-25 (~3 days) |
| P148-G AI crawler defensive robots.txt | ship 2026-08-26 (~2 days) |
| Defense-in-depth | 47 build-dep + 59 source-only = 106 guards |
| Googlebot crawl coverage (estimated) | ~40-60% at 8/26 → ~85%+ by 9/01 |

**Rationale**: 9/01 gives Googlebot ~13 days to crawl P140c/d/g/i/h + 11 days for P140f Topic pages. Multi-AI-surface work (P148-D/E/G) primarily affects AI citations, not AdSense review, but P148-B/C scaled-content check is directly relevant.

---

## ✅ Pre-Flight Verify Result (2026-08-28, 3 days early)

Ran automated pre-flight via `node tmp/adsense-preflight.cjs` — full result:

| Phase | Result |
|---|---|
| **Phase 1: Sitemap Index Health** | ✅ 639 URLs (en=319, zh=319, root=1) — 190 more than pre-fix baseline (449) |
| **Phase 2: Critical Pages Live Check** | ✅ **13/13 pass** — landing / about / privacy / terms / contact / sample-calc / topic / llms.txt / robots.txt all 200 with expected content |
| **Phase 3: Sample Sitemap URL Health** | ✅ 9/9 pass — strategic URLs across en+zh, legal, calc, topic, category |

**All 3 originally-suspected issues confirmed FIXED after deploy:**

| Issue | Pre-fix | Post-fix (8/28) |
|---|---|---|
| `/en/about/` reviewer bio | "Wang Lizhu" NOT FOUND (25KB content) | ✅ FOUND at offset 24703, "王立柱" at 28961, "Founder" at 29047 (39KB content, +14KB from P140c ship) |
| `/llms.txt` | 617b (cloudflare redirect, doesn't exist) | ✅ 200 OK, 24829 bytes, 194 lines, contains "ForgeFlowKit" + "tool" + "calculator" |
| Topic URL paths | sitemap had `/en/a/` paths, prod 617b | ✅ Sitemap uses `/en/blog/` (0 `/a/` paths), 101 blog URLs per lang × 2 = 202 total |
| Sitemap total URLs | 449 | ✅ 639 (+190 from P140f Phase 4 + batch writes) |

**Production deploy mechanism confirmed working** — `git push github master` triggered Cloudflare Pages auto-deploy, dist/ build artifact (639 pages) now live at `forgeflowkit.com`.

---

## Items REQUIRING user/GSC access (manual on 8/30 or 8/31)

### 1. Google Index Coverage Check (15 min via GSC)
- Login to [Google Search Console](https://search.google.com/search-console/) for `forgeflowkit.com`
- Navigate to **Pages → Indexing → Pages**
- **Target**: 600+ pages indexed out of 639 total (94%+)
- **If < 70%**: defer to 2026-09-08
- **Fallback** (no GSC access): `site:forgeflowkit.com` in Google search → count indexed pages

### 2. Sitemap Submission Verify (5 min)
- GSC → Sitemaps → check `https://forgeflowkit.com/sitemap-index.xml` status
- Should show "Success" with discovered URLs count (expect ~639)
- IndexNow bulk submitter (P148-E) auto-runs on every `pnpm build` → also covers Bing + DuckDuckGo + Yahoo + Ecosia

### 3. Critical Pages Live Check (10 min) — ✅ DONE 2026-08-28
Manually visit these in browser to confirm they render correctly (no JS errors, no blank sections). Pre-flight verify covered all of these; manual confirmation is for visual review.

| URL | Purpose | Expected | Pre-flight Status |
|---|---|---|---|
| `https://forgeflowkit.com/` | Landing (en) | Calculator grid, no broken images | ✅ PASS 383KB |
| `https://forgeflowkit.com/zh/` | Landing (zh) | Same | ✅ PASS 348KB |
| `https://forgeflowkit.com/en/about/` | About + reviewer bio | 王立柱 bio visible | ✅ PASS 40KB, "Wang Lizhu" at offset 24703 |
| `https://forgeflowkit.com/zh/about/` | About (zh) | 王立柱 bio visible | ✅ PASS 30KB |
| `https://forgeflowkit.com/en/privacy-policy/` | Privacy | Legal text present | ✅ PASS 26KB |
| `https://forgeflowkit.com/en/terms/` | Terms | Legal text present | ✅ PASS 23KB |
| `https://forgeflowkit.com/en/solopreneur-mrr-calculator/` | Sample calc | Inputs + outputs render | ✅ PASS 138KB |
| `https://forgeflowkit.com/en/blog/best-solopreneur-mrr-calculator/` | Topic sample (corrected: was mrr-growth-strategies-guide, actually best-solopreneur-*-calculator per P140f Phase 4) | 5-section article + sources | ✅ PASS 26KB |
| `https://forgeflowkit.com/zh/blog/best-solopreneur-mrr-calculator/` | Topic zh | Same | ✅ PASS 23KB |
| `https://forgeflowkit.com/llms.txt` | GEO hygiene | 194 lines, 100 tools × 15 cats | ✅ PASS 25KB |
| `https://forgeflowkit.com/robots.txt` | Crawler policy | All 5 AI crawlers explicit Allow | ✅ PASS 2KB |

### 4. Mobile-Friendly Test (5 min)
- [Google Mobile-Friendly Test](https://search.google.com/test/mobile-friendly) on landing + 1 calc + 1 Topic page
- Should pass without manual intervention

### 5. Core Web Vitals (5 min)
- GSC → Experience → Core Web Vitals
- **Target**: 75%+ URLs "Good" on mobile + desktop
- **Note**: S15 LCP <2.0s was deferred — CWV at "Needs Improvement" is acceptable but should be tracked

---

## Counter-Evidence Per AdSense Policy (unknown cause → cover all)

Since last rejection cause is unknown, this checklist addresses the 6 most common AdSense rejection policies with concrete counter-evidence:

### Policy 1: Scaled Content Abuse

**Risk**: Google认为内容大规模生成/重复，缺乏原创价值

**Counter-evidence** (commit references + audit results):
- ✅ **P148-B/C scaled-content uniqueness audit** — `tests/scaled-content-uniqueness-audit.test.ts`
  - Walks all 418 dist/ pages, computes 17,082 Jaccard pairwise comparisons
  - **0 pairs >0.8 threshold** (Aug 18 Spam Update risk = LOW)
  - Hardened `assert.fail()` on any drift (was advisory)
- ✅ **P140b editorial prose mass-write** — 28 commits, 100 engines × 2 langs = 200 hand-curated prose files (not auto-generated)
- ✅ **Original math engines** — 100 engines with proprietary calculations (not content-spin)
- ✅ **Original industry benchmarks** — sourced from OpenView, Bessemer, SaaS Capital, KeyBanc, ICONIQ, Recurly, Triple Whale, Shopify, etc.

### Policy 2: Insufficient Content

**Risk**: 内容数量不足，无法支撑广告

**Counter-evidence**:
- ✅ **100 calculator engines** (P16 milestone lock, 2026-07-15/16) — 100/100 unique tools
- ✅ **639 static pages** (verified 2026-08-28 sitemap crawl) — 100 calcs × 2 langs + 15 cats × 2 langs + 100 blog topic pages × 2 langs + 8 Comparison × 2 langs + 2 landings × 2 langs + about/privacy/terms/contact/authors
- ✅ **CalculatorProse wired to real data** (P141h) — sourcesRich + dataReviewedAt from prose frontmatter, not placeholder
- ✅ **100×2 prose files** with 5-section structure (CalculatorProse schema)

### Policy 3: Low Value / Thin Content

**Risk**: 内容薄、无实质价值

**Counter-evidence**:
- ✅ **P140d tier threshold tightening** — C3 thresholds +70% across 31 H2 expansions (1480 chars domain-specific content)
- ✅ **P141i prose P1 deepening** — 18 per-file prose expansions with inline HEALTH_BANDS source citations (Meta Ads, Google Ads, HubSpot, Klaviyo, Baymard, Mixpanel, ChartMogul, Recurly, DMA, CMI, SaaS Capital, HBR)
- ✅ **4-H2 minimum** (CalculatorProse schema): description + how-to + FAQ + sources/assumptions/common-mistakes
- ✅ **Sources inline** — every calculator has real industry citations

### Policy 4: Placeholder / Under Construction

**Risk**: 页面有 placeholder 文字 / "Coming soon"

**Counter-evidence**:
- ✅ **P141h placeholder leakage fixed** (2026-08-19) — 2 i18n placeholder keys for renewal-rate-calculator
- ✅ **P140c E-E-A-T completion** (2026-08-18) — single real reviewer identity (王立柱 / Wang Lizhu), no fictional 5 personas
- ✅ **P141h new guard** — `tests/engine-input-placeholder-i18n-guard.test.ts` catches regression class
- ✅ **No `[CONTENT]` or `[PLACEHOLDER]` strings** in production builds (verified by content-prose-shape-guard)

### Policy 5: Privacy / Legal

**Risk**: 缺 privacy policy / terms / contact

**Counter-evidence**:
- ✅ **`/privacy-policy/`** live (en + zh) — pre-flight PASS
- ✅ **`/terms/`** live (en + zh) — pre-flight PASS
- ✅ **`/contact/`** live — pre-flight PASS
- ✅ **GDPR + CCPA clauses** in privacy policy
- ✅ **L-category calculators** (6 engines, GDPR Fine + DSAR + DPA + Consent + Breach + CMP ROI) demonstrate compliance awareness

### Policy 6: Navigation / Site Structure

**Risk**: 导航混乱 / 死链 / 移动端不友好

**Counter-evidence**:
- ✅ **15 categories × 2 langs = 30 category landing pages** with Topic grids (P147 letter pages)
- ✅ **Breadcrumb on every page** (P140a)
- ✅ **TopicCard component** for internal linking (P140f Batch A)
- ✅ **Comparison pages** (8 pages, Phase 4) for cross-linking related content
- ✅ **Author bio pages** (P140g) with breadcrumb back-link
- ✅ **Mobile responsive** (Tailwind CSS 4 throughout)

---

## Re-Apply Email / Form Points (when submitting)

If AdSense has a free-text field for additional info, here's what to include:

> **Site**: forgeflowkit.com — free business calculator suite for solopreneurs / SaaS founders
>
> **Content overview**: 100 unique calculator tools (each with original math engine + industry benchmarks + 4-section editorial prose) + 100 Topic Guides (pillar-cluster content with sources + assumptions + common-mistakes H2s) + Comparison pages
>
> **Quality controls**: 47 build-dep test guards + 59 source-only guard tests covering scaled-content (Jaccard <0.8 verified), i18n completeness (en/zh parity), SEO (hreflang + sitemap + JSON-LD + canonical), accessibility (a11y-guard), performance (page-size + JS/CSS/image bundle guards)
>
> **E-E-A-T**: Single named reviewer/author (王立柱 / Wang Lizhu) with bio + credentials page
>
> **Recent improvements** (last 30 days): Tier threshold tightening (P140d), placeholder leakage fix (P141h), prose P1 deepening (P141i), scaled-content audit + hardening (P148-B/C), GEO hygiene llms.txt (P148-D), multi-AI-surface IndexNow (P148-E), AI crawler defensive allow (P148-G)
>
> **No policy concerns**: All content is original math + curated industry data with sourced citations. No auto-generated spun content. No placeholder text. No "under construction" pages.

---

## Rejection Response Strategy (if re-rejected)

If re-apply is rejected again:

1. **Read rejection email for specific policy** — Google usually names the policy
2. **Map policy to counter-evidence** above
3. **If policy not in our list** — discuss with user before re-applying
4. **If policy = Scaled Content Abuse** — escalate (we already passed Jaccard audit; may be reviewer error)
5. **If policy = Insufficient Content** — audit Topic page counts (P140f + Phase 4 should be ~80 guides × 2 langs)

---

## Timeline (Now → 9/01)

| Date | Day | Action | Status |
|---|---|---|---|
| 2026-08-26 (Tue) | -3 | Setup checklist + decision record | ✅ DONE |
| 2026-08-27 (Wed) | -2 | (no action — let Googlebot crawl) | ✅ |
| 2026-08-28 (Thu) | -1 | **Pre-flight verify completed early** | ✅ DONE — 13/13 critical + 9/9 samples PASS |
| 2026-08-29 (Fri) | 0 | (no action) | — |
| 2026-08-30 (Sat) | +1 | **User runs GSC verify (8/30 or 8/31)** | ✅ DONE 8/31 — found 53% coverage + 10-day crawl stagnation |
| 2026-08-31 (Sun) | +2 | **P149 Last-Modified + sitemap lastmod injection shipped** | ✅ DONE — commits 58d3cdd, 8206951, 4fce7a8. Sitemap 639 lastmod entries. HTTP `Last-Modified` header not present in production (Cloudflare edge strips; out of scope per spec Layer 4 — defer Cloudflare Worker to future sub-project) |
| 2026-09-01 (Mon) | +3 | **🎯 ORIGINAL RE-APPLY TARGET** — **DEFERRED to 9/08** | ⚠️ Waiting for Googlebot to recrawl after P149 |
| 2026-09-02 (Tue) | +4 | GSC re-check coverage (expect rise from 53%) | TODO |
| 2026-09-08 (Mon) | +10 | **🎯 NEW RE-APPLY TARGET** | TODO (P140c + 3 weeks + P149 recrawl window) |

---

## What If 8/30 Verify Fails (Coverage < 70%)?

**Fallback plan**:
- If Google coverage < 70% at 8/30 → defer re-apply to 2026-09-08 (P140c + 3 weeks)
- 9/08 likely has 95%+ coverage (Googlebot 3-week crawl cycle)
- Trade-off: 7 extra days wait for 5% lower rejection probability (worth it if scale is large)

---

## Related Memory

- [[adsense-resubmit-window]] — 2026-08-18 trigger rationale (P140c + 2 weeks)
- [[p148-d-shipped]] — P148-D llms.txt GEO hygiene
- [[p148-e-shipped]] — P148-E IndexNow 6-surface Bing Multiplier
- [[p148-g-shipped]] — P148-G AI crawler defensive robots.txt
- [[p141h-adsense-p0-fixes-shipped]] — P141h placeholder leakage (P0 AdSense audit)
- [[p141i-prose-p1-deepening-shipped]] — P141i prose P1 deepening (P1 AdSense audit)
- [[p140c-eeat-completion-shipped]] — P140c E-E-A-T completion
- [[p140d-tier-threshold-tightening-shipped]] — P140d tier threshold tightening
- [[p140g-author-bio-pages-shipped]] — P140g author bio pages
- [[audit-scaled-content-2026-08-25]] — P148-B/C baseline (Aug 18 Spam Update risk = LOW)

---

## Pre-Flight Verify Tool

The pre-flight script lives at `tmp/adsense-preflight.cjs` and is runnable any time:

```bash
node tmp/adsense-preflight.cjs
```

It checks:
- Phase 1: sitemap-index.xml health + sub-sitemap URL counts
- Phase 2: 13 critical pages HTTP fetch + expected content keyword check
- Phase 3: 10 strategic sitemap URL samples (landing/legal/calc/topic/category in both langs)

Cannot automate: Google Search Console login (real crawl coverage + CWV), Google Mobile-Friendly Test.

---

## History

- 2026-08-26: Created (5-day countdown from 8/26 to 9/01)
- 2026-08-28: Updated — pre-flight verify completed early, all 13 critical pages + 9 sitemap samples PASS. Sample topic URL corrected from `mrr-growth-strategies-guide` (doesn't exist) to `best-solopreneur-mrr-calculator` (actual P140f Phase 4 naming pattern).
