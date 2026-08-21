---
name: p140f-b2-letter-m-extension-shipped
description: P140f-B2 Wave M — Letter M Tier 1 extension. 2 Topics (ltv-by-channel-optimization + email-campaign-roi-optimization) × 2 templates = 4 new pages.
metadata:
  type: project
  shipped: 2026-08-21
  commit: b0d8b83
---

# P140f-B2 Letter M Marketing Analytics Extension — SHIPPED

**Date:** 2026-08-21
**Commit:** `b0d8b83` (master, direct)
**Branch:** master (direct-to-master cadence)
**Parent:** [[p140f-b2-letter-l-extension-shipped]] (Wave L, commit 4fb5977)

---

## Change

| Letter | Tier 1 Topic ID | en Title | zh Title | Calculator |
|---|---|---|---|---|
| M | `ltv-by-channel-optimization` | LTV by Channel Optimization | 分渠道 LTV 优化 | `solopreneur-ltv-by-channel-calculator` |
| M | `email-campaign-roi-optimization` | Email Campaign ROI Optimization | 邮件营销 ROI 优化 | `solopreneur-email-campaign-roi-calculator` |

**Total**: 2 new Tier 1 Topics × 2 templates × 2 langs = **8 new pages** (583 → 591).

## Content highlights

**ltv-by-channel-optimization** (DIFFERENT LENS from anchor ROAS — channel-economic view):
- Channel cohort LTV by source (24mo unless noted):
  - Organic SEO (non-brand): $1.8-3.6K
  - Content marketing: $2.4-5K (mid-market)
  - Paid search (Google brand + non-brand): $0.8-1.8K (12mo)
  - Paid social (Meta + LinkedIn): $0.4-1.2K (12mo)
  - Affiliate/partner referral: $1.5-3K
  - Customer referral (word-of-mouth): $2-4K
  - Outbound SDR/BDR: $3.5-8K (mid-market 24mo)
  - Partner co-marketing: $2-4.5K (18mo)
- Methodology: 6-24mo cohort LTV by UTM source → Calculator ranking → What-If reallocation
- Sources: ChartMogul SaaS Benchmark Report 2024, OpenView Partners SaaS Benchmarks 2024, Triple Whale DTC Benchmarks 2024, SaaS Capital SaaS Financial Performance Index, Recurly State of Subscriptions 2024, ICONIQ Growth State of SaaS 2024, HubSpot State of Marketing 2024, PartnerStack Partner Ecosystem Benchmarks 2024, Google Ads Help Center attribution guide, Content Marketing Institute B2B benchmarks (10 distinct)

**email-campaign-roi-optimization** (DIFFERENT LENS from anchor ROAS — owned channel focus):
- Open rate bands: 🟢 >25% / 🟡 18-25% / 🟠 12-18% / 🔴 <12%
- CTR bands: 🟢 >3% / 🟡 2-3% / 🟠 1-2% / 🔴 <1%
- Segmented vs broadcast: 6x revenue lift
- Deliverability bands: 🟢 >95% / 🟡 85-95% / 🟠 70-85% / 🔴 <70%
- List churn: <5%/mo healthy
- Unsubscribe rate: <0.5%
- Industry shift: Apple MPP post-2024 — open rate deprecation, CTR becomes primary metric
- Sources: Litmus State of Email 2024, Mailchimp Email Marketing Benchmarks 2024, Campaign Monitor 2024, Klaviyo SaaS + Ecommerce, Omnisend Ecommerce 2024, HubSpot State of Marketing 2024, DMA Marketer Email Tracker 2023, Salesforce Marketing Cloud, Iterable 2024, Validity Inbox Placement Insights (10 distinct)

Both Topics: ~5-9k chars en + ~1.7-4.4k chars zh Guide; ~600-1000 chars + 8-row Benchmark data table × 2 langs.

## Data layer updates

- `src/data/topics.ts`: +2 entries (tier=1, letterId='M', domain='marketing')
- `src/data/topic-content.ts`: +4 entries
- `src/data/prose-tiers.ts`: TIER_2_SLUGS M reduced from 2 to 0 (17 → 15; M category fully extended)

## Verification

| Check | Result |
|---|---|
| tsc --noEmit | clean |
| topic-guide-shape-guard (build-dep) | 1/1 pass (51s) |
| topic-benchmark-shape-guard (build-dep) | 1/1 pass (34s) |
| topic-content-coverage-guard (build-dep) | 1/1 pass (0.6s) |
| pnpm build | 583 → 591 pages (+8) |
| 3-way divergence | 0/0 after commit |

## Related

- [[p140f-b2-letter-l-extension-shipped]] — Wave L (Letter L Legal)
- P140f Phase 2 plan (`docs/superpowers/plans/2026-08-20-p140f-phase2-tier1-extension.md`)