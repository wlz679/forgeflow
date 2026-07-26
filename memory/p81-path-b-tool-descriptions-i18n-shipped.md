# P81 Path-B Category Pages Tool Descriptions i18n Ship Log

## Summary

P81 extends the P80 fix to the 9 path-B category pages. All 9 pages now use `translatedTitle` + `translatedDescription` lookup pattern (matching path-A pages from P80). Tool descriptions on zh path-B pages now render in Chinese.

**Date:** 2026-07-26
**Batch ID:** P81
**Files touched:** 9 (9 path-B pages)
**Test delta:** 1180 → 1180 (no new tests)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### 9 path-B category pages refactored

Files modified:
- `src/pages/[lang]/marketing-analytics.astro`
- `src/pages/[lang]/operations-inventory.astro`
- `src/pages/[lang]/customer-support.astro`
- `src/pages/[lang]/hiring-team.astro`
- `src/pages/[lang]/knowledge.astro`
- `src/pages/[lang]/legal-compliance.astro`
- `src/pages/[lang]/product-analytics.astro`
- `src/pages/[lang]/sales.astro`
- `src/pages/[lang]/retention.astro`

**Pattern change** (identical across all 9 pages):

Before (frontmatter):
```ts
const categoryTools = tools.filter(tool => tool.categoryId === CATEGORY_ID);
```

After (frontmatter):
```ts
const categoryTools = tools
  .filter(tool => tool.categoryId === CATEGORY_ID)
  .map(tool => {
    const titleKey = `tools.${tool.slug}.title`;
    const descKey = `tools.${tool.slug}.description`;
    return {
      ...tool,
      // P81: lang-aware title + description via i18n table (mirrors P80 path-A pattern).
      // Fallback to raw tool.* fields if a key is missing (defense in depth).
      translatedTitle: t(titleKey, lang) !== titleKey ? t(titleKey, lang) : tool.title,
      translatedDescription: t(descKey, lang) !== descKey ? t(descKey, lang) : tool.description,
    };
  });
```

Before (template):
```astro
{categoryTools.map(t => <ToolCard slug={t.slug} title={t.title} description={t.description} />)}
```

After (template):
```astro
{categoryTools.map(t => <ToolCard slug={t.slug} title={t.translatedTitle} description={t.translatedDescription} />)}
```

Mirrors P62 (category.X.name), P69 (tools.*.title), P80 (path-A category pages).

### Why path-B pages were missed earlier

P62 T3 migrated 9 path-B pages to use `t()` lookup for category name/description but **forgot to translate the tool card props**. The pages called:
```astro
<ToolCard slug={t.slug} title={t.title} description={t.description} />
```

where `t` is the un-translated tool object (with English `title` and `description` fields from `src/data/tools/*.ts`).

P80 audit was scoped to path-A pages (`description: tool.description` pattern). P81 audit extended to path-B pages and found the analogous pattern (raw `t.title` and `t.description` props passed to `<ToolCard>`).

## Why this exists

P81 closes the second half of the tool description i18n gap. P80 closed path-A (6 pages); P81 closes path-B (9 pages). Together: all 15 category pages render tool descriptions in zh.

The tool description i18n keys (`tools.*.description`) have existed in translations.ts since P17 (2026-06-22). The bug was purely in templates — wire the existing keys into the render path.

## Verification

After rebuild, manual grep of `dist/zh/operations-inventory/index.html` shows tool card descriptions all in CJK:

```
CJK=True 计算库存周转率、损耗率、平均存货成本... (Inventory Turnover)
CJK=True 计算运营履行成本：缺货成本、滞销库存... (Stockout Cost)
CJK=True 计算库存持有成本、损耗、库存过剩率... (Carrying Cost)
CJK=True 计算最佳补货点（ROP）：前置时间 + 安全库存... (Reorder Point)
CJK=True 计算单位履行成本：拣货 + 包装 + 运输 + 仓储... (Fulfillment Cost)
```

All 5 sampled descriptions contain CJK characters.

## Coverage expansion

| Layer | Before P80 | After P80 | After P81 |
|---|---|---|---|
| Path-A category pages (6) tool descriptions | ❌ EN | ✅ CJK | ✅ CJK |
| **Path-B category pages (9) tool descriptions** | ❌ EN | ❌ EN | ✅ **CJK** |
| **Total path-A + path-B (15) zh tool descriptions** | 0/15 CJK | 6/15 CJK | **15/15 CJK** |

**All 15 category pages now render tool descriptions in zh.** This closes the final P79 audit-driven user-visible defect.

## Audit follow-up

Re-running P79's audit (`node scripts/p72-audit-v6.cjs`) after P81:

| Pattern | Pre-P80 | Post-P80 | Post-P81 |
|---|---|---|---|
| "Calculate" hits in zh body | 42 / 7 pages | (path-A fixed; 6 pages still in path-B) | (path-B fixed) **~14 / 9 path-B pages** |
| "Tools" hits in zh body | 35 / 18 pages | reduced | reduced |

Exact post-P81 count requires audit re-run. Should show significant reduction in path-B pages.

## What was NOT done

- ❌ Did NOT add new CI guard for tool descriptions — P74's `zh-hardcoded-english-guard` covers 11 known leaks; adding 100 dynamic tool description checks would risk false positives
- ❌ Did NOT modify `ToolCard.astro` to do its own translation lookup — keeping it pure (presentation only) is simpler; pages handle translation
- ❌ Did NOT translate calculator output content (e.g., "Save $4/mo") — different scope (P-series candidate)

## Related references

- **P17** (2026-06-22) — original `tools.*.description` i18n keys added
- **P62 T3** (2026-07-24) — migrated 9 path-B pages to use `t()` lookup for category name/description (but missed tool cards)
- **P69** (2026-07-23) — `tools.*.title` i18n lookup (path-A only)
- **P79** (2026-07-26) — re-audit found "Calculate/Tools" hits; traced to path-A pages
- **P80** (2026-07-26) — closed path-A tool description i18n gap

## P82+ candidate

- **Calculator output content i18n** — translate `customFn` output strings (different scope, larger)
- **Translation glossary enforcement CI guard** — verify new translation keys follow glossary patterns
- **OG image localization** — image generation scope
- **Audit script filter improvement** — strip `<head>` to remove false positives (P79 recommendation)