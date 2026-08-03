---
slug: 'solopreneur-article-freshness-calculator'
engine_ref: 'solopreneur-article-freshness-calculator'
category_id: 'K'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'NN/g — Help and Documentation Usability'
    url: 'https://www.nngroup.com/articles/help-and-documentation/'
  - name: 'TSIA — Knowledge-Centered Service 2024'
    url: 'https://www.tsia.com/blog/knowledge-centered-service'
  - name: 'Intercom — Help Center Best Practices'
    url: 'https://www.intercom.com/help/articles/what-is-help-center-best-practices'
---

## What This Calculator Measures

Article Freshness measures the percentage of KB articles last updated within
the past 12 months — the "Is this still true?" test every customer implicitly
asks before acting on a doc. Stale articles contain deprecated UI screenshots,
removed feature steps, or pricing that has since changed; NN/g and Intercom
both cite stale content as the #1 cause of low customer trust in self-service
and rising ticket-reopen rates. A 500-article KB where only 60% has been
reviewed in the past year is a ticking liability — most of those 200 stale
articles will silently send customers to dead ends before a single ticket is
filed.

## How It Works (Methodology)

```
fresh12 = articles_updated_12mo / total_articles
fresh6  = articles_updated_6mo  / total_articles
stale   = max(0, total_articles − articles_updated_12mo)
gap_pct = target_freshness_pct − fresh12 × 100
```

| Variable                 | Meaning                                                  |
| ------------------------ | -------------------------------------------------------- |
| `total_articles`         | Live article count in the KB                             |
| `articles_updated_12mo`  | Articles with a content edit in the last 12 months       |
| `articles_updated_6mo`   | Articles with a content edit in the last 6 months        |
| `target_freshness_pct`   | Internal goal (e.g. 70%) — informational, not the band driver |

Health bands (HIGHER = better): 🟢 ≥80% Excellent · 🟡 55-80% Good · 🟠
40-55% Warning · 🔴 <40% Critical. The 12-month window is the band driver
(NN/g standard); 6-month is a secondary cadence signal for fast-moving
products.

## Limitations & When Not To Use

"Last updated" is a poor proxy for editorial review — a typo fix counts the
same as a full rewrite. Pair this calculator with K-6 Article Helpfulness to
distinguish "touched recently" from "actually accurate". Also, mature stable
products (low release cadence) routinely sit at 90%+ freshness without
active review, so use this metric relative to your release cadence: a
bi-weekly deploy schedule should target 80%+; a quarterly release schedule
is fine at 60-70%. The freshness target should be calibrated to the
release tempo, not industry-wide benchmarks.

## Worked Example

Imagine a mid-market B2B SaaS with 500 KB articles, 325 reviewed in the last
12 months, 200 reviewed in the last 6 months, and a 70% internal target:

1. `fresh12` = 325 / 500 = **65.0%** → 🟡 **Good** band
2. `stale` = 500 − 325 = **175 articles** (35% of the KB) carry outdated info
3. `gap_pct` = 70 − 65 = **+5.0pp** to target — close, not yet hitting
4. To reach 🟢 Excellent (≥80%), need ~75 more articles reviewed
5. At a 10-articles/month cadence, that takes **~8 months** of editorial work

Pair this output with **Deflection Quality** (K-4): rising reopen rates are
usually stale-article hotspots first. The Tip line of the calculator
suggests tagging every article with a `Last reviewed: YYYY-MM-DD` footer
to make the per-article audit list sortable.
