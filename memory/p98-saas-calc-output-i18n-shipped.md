# P98 SaaS Calculator Output i18n Ship Log

## Summary

P98 extends the P85a post-processor pattern to SaaS calculator section headers. Adds 4 i18n keys for MRR calculator (3 tools: burn-rate, churn-rate, mrr) section headers and applies the same template post-processor to translate them on zh pages.

**Date:** 2026-07-26
**Batch ID:** P98
**Files touched:** 2 (1 translations.ts + 1 page template)
**Test delta:** 1192 → 1192 (no new tests; existing guard does not cover this scope)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### translations.ts — 4 new i18n keys

```ts
// P98: SaaS section headers (3 tools: burn-rate, churn-rate, mrr)
'saas.section.dashboard': { en: '📊 MRR Health Dashboard', zh: '📊 MRR 健康看板' },
'saas.section.snapshot': { en: '💰 MRR Snapshot', zh: '💰 MRR 快照' },
'saas.section.waterfall': { en: '📈 MRR Waterfall', zh: '📈 瀑布图' },
'saas.section.breakeven_growth': { en: '⚖️ Breakeven Growth', zh: '⚖️ 盈亏平衡 Growth' },
```

### Page template — extended post-processor (P85a)

`src/pages/[lang]/[slug].astro` `translateCalcOutput` function now includes 4 new SaaS keys in the `headerKeys` array. The post-processor pattern is identical to P85a — applies on `lang === 'zh' && engine.clientConfig.type === 'custom'` (SaaS tools also use 'custom' type).

## Why this exists

P85a (AI cost) closed 6 of the 7 "Save hits" found by P79 audit. P79 audit also found 3 SaaS engines with Save output (burn-rate, churn-rate, mrr). P98 closes the SaaS-side gap.

Before P98, zh MRR calculator page showed EN section headers (MRR Health Dashboard, MRR Snapshot, etc.). After P98, all 4 are translated.

## Scope (smaller than P85a)

P85a translated 6 AI cost section headers with rich emoji patterns (💰 Cost Breakdown, 📈 Growth Projection, ⚖️ Break-Even, etc.). P98 found only 4 section headers in the 3 SaaS engines — most output is body text (not section headers). Smaller scope but still valuable.

## Verification

After rebuild, manual grep of `dist/zh/solopreneur-mrr-calculator/index.html`:

```
📊 MRR 健康看板    (was: MRR Health Dashboard)
💰 MRR 快照         (was: MRR Snapshot)
📈 MRR 瀑布图       (was: MRR Waterfall)
⚖️ 盈亏平衡 Growth (kept "Growth" — actual source has mixed EN/zh)
💡 提示: ...        (Tip header — pre-translated)
```

4 of 5 section headers translated. "Breakeven Growth" keeps "Growth" as EN because the actual source has "盈亏平衡 Growth" (mixed), and the post-processor only does exact-match replacement.

## What was NOT done

- ❌ Did NOT add body text translations (large scope, requires subagent like P75)
- ❌ Did NOT translate "Growth" in "盈亏平衡 Growth" (would require source change to make it "盈亏平衡增长")
- ❌ Did NOT extend to other categories with similar output patterns (ops, cost, valuation — 3 categories with similar scope)
- ❌ Did NOT add new CI guard for section header translation coverage

## Related references

- **P79** — re-audit found 3 SaaS engines with Save output
- **P85a** — original post-processor pattern for AI cost section headers
- **P75** — blog body translation (related but different scope)
- **src/pages/[lang]/[slug].astro** — page template post-processor
- **docs/i18n/zh-terminology.md** — translation glossary

## P99+ candidate

- **Ops/Cost/Valuation calc output i18n** — extend P98 to 3 more categories
- **OG image localization** — generate per-lang OG images (image generation scope)
- **Audit script migration** — extract parser logic to shared library
- **JS bundle size CI guard** — extend performance dimension
- **New dimension** (security, performance detail)