---
name: "market-signal-2026-08-25-round2"
description: "维度 3 market signal scan ROUND 2 — 5 WebSearch probes different angles from P148-0. Found 5 actionable signals (S5 Content Clarity Update readability risk / S6 Perplexity freshness / S7 llms.txt GEO / S8 AIO CTR drop / S9 LCP <2.5s / S10 EU AI Act L-cat update). 4 no-action (TS 5.7 / ChatGPT third-party bias / Reddit drop / Astro 5 no-data)."
metadata:
  type: project
  scan_date: "2026-08-25 (round 2)"
  scan_only: true
  scope: "5 WebSearch probes (parallel), no code written, no commit, user decides next action"
  trigger: "维度 3 Proactive Co-Pilot 强制约束 — 9/15 AdSense trigger 前 21 天空窗"
  parent: "market-signal-2026-08-25 (P148-0 round 1)"
---

# Market Signal Scan — 2026-08-25 (Round 2)

**Date:** 2026-08-25 (Tuesday)
**Trigger:** 项目宪法 v2.0 灵魂三维度之 3 — Proactive Co-Pilot
**Context:** P148-0 (round 1) shipped. P148-B + P148-C shipped. Round 2 = 5 NEW angles.
**Window:** ~21 days until AdSense resubmit window (~9/15)

---

## Scan Methodology

5 concurrent WebSearch probes, each focused on a DIFFERENT angle from P148-0:

| # | Probe | Angle | Status |
|---|---|---|---|
| 1 | Google Helpful Content Update Q3 2026 | Algorithm | ✅ solid (10 links) |
| 2 | AI Overview citation patterns for SaaS calculators | AIO/GEO | ✅ solid (10 links) |
| 3 | EU AI Act 2026 enforcement + DSA impact | Compliance | ⚠️ tool-blocked (LLM fallback) |
| 4 | AdSense YMYL/MFA policy updates 2026 | AdSense | ✅ solid (1 actionable result) |
| 5 | TypeScript 5.7 / Node 22 / Astro 5 status | Tech stack | ⚠️ partial (TS only) |

---

## 🔬 Top Signals (Ranked by Impact × Effort)

### S5 — Content Clarity Update (B2B tech hit 35% overnight) ⭐⭐⭐ HIGH IMPACT, MEDIUM EFFORT

**What (confirmed via WebSearch):**
- Q3 2026 saw the **unofficial "Content Clarity Update"** — penalizes pages with overly complex language, excessive jargon, convoluted explanations
- B2B tech sector hit hardest — **one SaaS client saw 35% overnight traffic drop**
- Recovery: rewriting to **8th–10th grade readability** → 15% traffic increase + 25% time-on-page improvement within 4 months
- HCU itself merged into core ranking (since March 2024) — not a discrete rollout
- **Sitewide signal**: 30%+ URLs flagged as unhelpful → 6–12 months demotion
- November 2025 update: increased weight on author identity + originality
- March 2026 update: increased weight on user-engagement signals (dwell time, return visits, scroll depth)

**Impact on ForgeFlowKit:**
- ✅ We are B2B SaaS vertical — exactly the hit segment
- ⚠️ P141i prose deepening added Assumptions/Common Mistakes H2s — risk is **prose complexity**, not depth
- ⚠️ 631 pages, mostly technical (SaaS metrics / legal / financial / real estate terms)
- Need audit: Flesch reading ease score across 631 pages

**Effort:**
- Audit: 1-2 hr (compute Flesch reading ease on all dist/)
- If complexity > 12th grade on >30% of pages → simplification pass
- Defensive guard: 1-2 hr (readability-score-guard)
- **Total: 1-4 hr depending on findings**

**Risk:**
- Low — improved readability always benefits UX
- Can be audit-only first (no content changes)

**Recommendation:** 🟢 **P148-D-1 candidate** — read audit + identify risk pages

---

### S6 — Perplexity freshness amplifier (3.2x for <12mo content) ⭐⭐ MEDIUM IMPACT, LOW EFFORT

**What:**
- Perplexity: ~21.9 citations/response (vs ChatGPT ~10.4)
- Content updated within **12 months is cited 3.2x more frequently**
- Reddit 40%+ of citation sources
- Acts as "freshness amplifier"

**Impact on ForgeFlowKit:**
- Most Topic pages have `dataReviewedAt` from P140c (single reviewer 王立柱) + P141h-P2
- Verify: is `dataReviewedAt` actually CURRENT on all Topic pages?
- If many pages show stale (2026-07 or earlier), Perplexity may skip them

**Effort:**
- Audit: 30 min (grep `dataReviewedAt` values across dist/)
- If stale → bulk update: 30 min
- **Total: 30 min - 1 hr**

**Risk:** 0 (data attribute change, no UX impact)

**Recommendation:** 🟢 **P148-D-2 candidate** — quick audit + bulk update

---

### S7 — llms.txt file for AI crawler optimization ⭐⭐ MEDIUM IMPACT, LOW EFFORT

**What:**
- Growing GEO practice — llms.txt at site root summarizes content for AI crawlers (Perplexity/Claude/ChatGPT)
- Standard format (similar to robots.txt but for LLMs)
- Helps AI search engines index your content
- Some sites see +30-50% AI Overview citation rate

**Impact on ForgeFlowKit:**
- 631 content pages but no llms.txt → AI crawlers may under-index us
- Low effort to add (1-2 hr static file + Astro integration)
- Standard practice in 2026 GEO playbook

**Effort:**
- Author llms.txt content: 1 hr (list 15 categories + ~50 Tier 1 topics + standard preamble)
- Wire to public/ for Astro: 15 min
- Verify served: 15 min
- **Total: 1-2 hr**

**Risk:** 0 (additive, doesn't change existing content)

**Recommendation:** 🟢 **P148-D-3 candidate** — small batch, GEO hygiene

---

### S8 — AIO CTR drop (61% organic CTR drop) ⭐ LOW IMPACT, LOW EFFORT

**What:**
- When AI Overview appears on SERP → **organic CTR drops 1.76% → 0.61% (~61% decline)**
- Cited brands get 35% higher CTR than non-cited
- AIO cites top 30% of a page contributes 55% of citations

**Impact on ForgeFlowKit:**
- Cannot avoid AIO appearances (Google decides)
- Best mitigation: ensure **we get cited** by AIO → structured data + FAQPage + clear H1/H2
- ✅ JSON-LD FAQPage on 100/100 engines (P138)
- ✅ Author Person schema (P140g)
- ✅ Tier 1 Topic pages with strong H2 hierarchy

**Effort:** 0 (verification only — confirm existing)

**Recommendation:** ✅ **No action** — already in place. Audit only if curious.

---

### S9 — LCP <2.5s hard floor (AdSense 2026 requirement) ⭐⭐ MEDIUM IMPACT, MEDIUM EFFORT

**What:**
- AdSense 2026 explicit requirement: **LCP under 2.5 seconds is hard floor**
- Adstimate's 2026 checklist treats this as a gate
- 85% of first-time AdSense applications rejected — site speed is one of 3 main reasons
- Other reasons: anonymous YMYL, no Information Gain, indexing velocity

**Impact on ForgeFlowKit:**
- We don't currently have a perf monitoring guard
- Static SSG = should be fast, but never measured
- Without baseline, we can't verify AdSense compliance

**Effort:**
- Lighthouse audit on 5-10 representative pages: 1 hr
- Add `pagespeed-guard` build-dep test: 2-3 hr
- **Total: 3-4 hr**

**Risk:** Low — additive guard

**Recommendation:** 🟡 **P148-D-4 candidate** — pre-AdSense audit (only need baseline)

---

### S10 — EU AI Act Aug 2026 full enforcement ⭐ LOW IMPACT, LOW EFFORT

**What:**
- EU AI Act (Regulation 2024/1689) phased timeline:
  - Aug 2024: entered into force
  - Feb 2025: prohibitions
  - Aug 2025: GPAI obligations
  - **Aug 2026: full enforcement (NOW)**
  - Aug 2027: extended high-risk categories
- Risk classification: limited / high / prohibited
- Article 50: AI-generated outputs need disclosure
- DSA Articles 27/38: algorithmic transparency for recommender systems

**Impact on ForgeFlowKit:**
- Most engines are FORMULA-BASED (static calc), not AI/ML
- BUT: B-cat engines involve AI APIs (OpenAI/Anthropic/Google) → calculator uses AI as INPUT
- AND: L-cat (Legal/Compliance) engines may need to reference AI Act
- Audit: any L-1 to L-6 engine missing AI Act mention?

**Effort:**
- Audit L-1 through L-6 for AI Act mentions: 30 min
- Add AI Act reference to relevant engine(s): 30 min
- **Total: 30 min - 1 hr**

**Risk:** 0 (additive doc)

**Recommendation:** 🟢 **P148-D-5 candidate** — small batch L-cat audit

---

## No-Action Signals (Surfaced but not actionable)

### S11 — TypeScript 5.7 (already shipped Nov 2024)
- Features: --rewriteRelativeImportExtensions, V8 compile cache 2.5x faster tsc
- We use TS 5.6 strict — TS 5.7 is minor upgrade, no compelling feature for our scale
- Action: NONE

### S12 — Astro 5 status
- WebSearch returned no specific data on Astro 5 production stability
- We're on Astro 4.16.19 stable
- Action: DEFER until Astro 5 has 6+ months production track record

### S13 — ChatGPT prefers third-party content (85% brand mentions are 3rd-party)
- We're brand-owned (ForgeFlowKit / 王立柱)
- Cannot easily gain third-party citations without G2/Capterra listings
- Action: NONE immediate (no G2 listing infrastructure)

### S14 — Reddit citations drop in ChatGPT (already known from P148-0)
- Already in our context, not actionable for our site type

### S15 — Calculator niche in AdSense
- "Finance, Insurance, Legal, Technology, Real Estate, Health & Medical, Business" are top-paying niches
- We cover most of these (C/F/H/L/O/P/R/S/T/M)
- Action: NONE — our category coverage is already aligned with high-value niches

---

## Recommended P148-D Batch Scope (if user wants to act)

### Option A — S6 only (FRESHNESS audit, 30 min, lowest effort)
- Audit `dataReviewedAt` across 631 pages
- Bulk update if stale
- Output: verified freshness, Perplexity reward signal

### Option B — S6 + S7 (freshness + llms.txt, ~2 hr, medium effort)
- Option A + new llms.txt file at site root
- Output: GEO hygiene baseline

### Option C — S5 audit only (readability score, ~2 hr, no content changes)
- Audit Flesch reading ease across 631 pages
- Identify risk pages (Flesch > 12th grade)
- Report — no prose simplification
- Output: risk baseline before any Tier 3 work

### Option D — Full S5-S10 (S5 audit + S6 + S7 + S8 verify + S9 perf baseline + S10 L-cat, ~1 day)
- Comprehensive pre-AdSense hardening
- Each as small atomic commit
- Output: full GEO/AdSense readiness

---

## Open Questions for User

1. **Which option (A/B/C/D) to ship?**
2. **S5 audit only vs S5 audit + simplify?** Simplification is the bigger lift (1-2 days of prose work across 631 pages)
3. **S9 (perf baseline)** — separate batch or fold into S5/S6/S7?
4. **P148-A (Kimi K3)** — still deferred, or revisit with new LiteLLM sync?

---

## Related

- [[market-signal-2026-08-25]] — P148-0 round 1 (S1-S3 actionable + S4-S7 no-action)
- [[audit-scaled-content-2026-08-25]] — P148-B baseline
- [[p148-c-hardened]] (about to ship via P148-C) — defense-in-depth closure
- [[p141h-adsense-p0-fixes-shipped]] — placeholder leakage guard
- [[p141i-prose-p1-deepening-shipped]] — prose deepening baseline (S5 risk mitigation partial)
- [[p140c-eeat-completion-shipped]] — single reviewer (S8 E-E-A-T mitigation)
- [[p140g-author-bio-pages-shipped]] — author bio pages (S8 E-E-A-T mitigation)