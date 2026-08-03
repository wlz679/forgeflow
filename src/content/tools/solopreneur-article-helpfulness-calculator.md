---
slug: 'solopreneur-article-helpfulness-calculator'
engine_ref: 'solopreneur-article-helpfulness-calculator'
category_id: 'K'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'NN/g — Help and Documentation Usability'
    url: 'https://www.nngroup.com/articles/help-and-documentation/'
  - name: 'TSIA — Knowledge-Centered Service 2024'
    url: 'https://www.tsia.com/blog/knowledge-centered-service'
  - name: 'Zendesk — Search Analytics for Self-Service'
    url: 'https://www.zendesk.com/blog/search-analytics-self-service/'
---

## What This Calculator Measures

Article Helpfulness measures KB content quality through a composite of two
metrics — helpful vote share (👍 ÷ total votes) and vote rate (total votes
÷ article views). A KB can be fully covered and search-tunable yet still
ship unhelpful content: customers reach the article, read it, close the tab,
and file a ticket anyway. The 👍/👎 vote loop is the only signal that
captures that silent failure at scale; the TSIA Knowledge-Centered Service
framework treats per-article helpfulness as the closest downstream proxy
for "did the doc solve the problem?" Helpful share alone over-weights engaged
voters (small-sample bias), so pairing it with vote rate catches both
content quality issues AND UI-prompt design issues.

## How It Works (Methodology)

```
helpful_pct = helpful_votes / (helpful_votes + unhelpful_votes)
vote_rate   = (helpful_votes + unhelpful_votes) / total_article_views
gap         = target_helpful_pct − helpful_pct × 100
```

| Variable             | Meaning                                              |
| -------------------- | ---------------------------------------------------- |
| `total_article_views`| Monthly unique article-page views across the KB      |
| `helpful_votes`      | 👍-thumbs across all articles that month             |
| `unhelpful_votes`    | 👎-thumbs across all articles that month             |
| `total_articles`     | Live article count (drives the bottom-20 audit size) |
| `target_helpful_pct` | Internal 👍-share goal — informational               |

Health bands (composite AND-logic — both conditions must hold):
🟢 Excellent (helpful ≥85% AND vote-rate ≥15%) · 🟡 Good (helpful ≥70%
AND vote-rate ≥8%) · 🟠 Warning (helpful ≥55%) · 🔴 Critical (helpful
<55% OR vote-rate <3%).

## Limitations & When Not To Use

The "Was this helpful?" widget must be visible AND non-intrusive — bottom-
of-page prompts sit at <5% engagement; mid-article prompts (after the
actionable step) sit at 15-25% engagement. If your widget vote rate is
structurally low (<8%), the metric is measuring UI placement, not content
quality. Also, helpful share with very few votes is statistically noisy —
under 200 total votes a month, single-digit vote swings shift the helpful
share by 2-3pp; treat the band as directional until volume crosses that
threshold. Product complexity heavily skews this metric: a 10-step API
auth article will reliably sit at 60-70% helpful even when perfectly
written, because step 9 has 4 possible branches.

## Worked Example

Imagine a mid-market B2B SaaS with 25,000 monthly article views, 2,400
👍-votes, 700 👎-votes (3,100 total), 500 articles in the KB, and a 75%
internal 👍-share target:

1. `helpful_pct` = 2,400 / 3,100 = **77.4%** · `vote_rate` = 3,100 / 25,000 = **12.4%**
2. Both Good-band conditions met (≥70% AND ≥8%) → 🟡 **Good**
3. `gap` = 75 − 77.4 = **−2.4pp** (negative = above target, going well)
4. To reach 🟢 Excellent (helpful ≥85% AND vote-rate ≥15%): need **235
   more 👍** OR **650 more total votes** — the latter means moving the
   vote widget to mid-article
5. Audit bottom ~**100 articles** (≈ 20% of KB) — sort by 👎 desc, group
   similar titles, rewrite the cohort

Pair with **Search Effectiveness** (K-3) — high CTR but low helpful share
is a content problem (refresh top-20 unhelpful); low CTR but high helpful
share is a taxonomy problem (search needs synonym expansion).
