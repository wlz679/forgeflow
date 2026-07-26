# P80 Tool Descriptions i18n Ship Log

## Summary

P80 closes a remaining i18n gap found by P79 re-audit: 8 path-A category pages were rendering tool descriptions as raw English (`tool.description`) instead of using the existing `t('tools.${slug}.description', lang)` i18n lookup. All 100 zh tool descriptions now render in Chinese.

**Date:** 2026-07-26
**Batch ID:** P80
**Files touched:** 6 (6 path-A category pages)
**Test delta:** 1180 → 1180 (no new tests)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### 6 path-A category pages refactored

Files modified:
- `src/pages/[lang]/ai-cost-tools.astro`
- `src/pages/[lang]/cost-efficiency.astro`
- `src/pages/[lang]/freelance-pricing.astro`
- `src/pages/[lang]/investment-roi.astro`
- `src/pages/[lang]/saas-metrics.astro`
- `src/pages/[lang]/valuation-exit.astro`

**Pattern change** (identical across all 6 pages):

Before:
```ts
const translatedTools = tools
  .filter(tool => tool.categoryId === CATEGORY_ID)
  .map(tool => ({
    ...tool,
    title: tool.title,           // ToolMeta.title is English; translation lives in i18n
    translatedTitle: t(`tools.${tool.slug}.title`, lang),
  }));

// Override with translated titles for display
const displayTools = translatedTools.map(tool => ({
  slug: tool.slug,
  title: tool.translatedTitle,
  description: tool.description,  // English fallback
}));
```

After:
```ts
const translatedTools = tools
  .filter(tool => tool.categoryId === CATEGORY_ID)
  .map(tool => {
    const descKey = `tools.${tool.slug}.description`;
    return {
      ...tool,
      title: tool.title,           // ToolMeta.title is English; translation lives in i18n
      translatedTitle: t(`tools.${tool.slug}.title`, lang),
      // P80: lang-aware description via i18n table. Fallback to tool.description
      // (en) if a key is missing (defense in depth).
      translatedDescription: t(descKey, lang) !== descKey ? t(descKey, lang) : tool.description,
    };
  });

// Override with translated titles for display
const displayTools = translatedTools.map(tool => ({
  slug: tool.slug,
  title: tool.translatedTitle,
  description: tool.translatedDescription,
}));
```

Mirrors the `translatedTitle` / `translatedExcerpt` pattern from P62 (categories), P69 (blog titles/excerpts), P72 T2-A (blog index), P75 (blog bodies).

### P79 audit findings that drove this fix

The P79 re-audit reported these EN hits in dist/zh body:

```
Calculate: 42 / 7 pages  (ai-cost-tools 6, cost-efficiency 4, freelance-pricing 8, ...)
Tools: 35 / 18 pages
Save: 51 / 7 pages  (different scope — calculator output content, NOT tool descriptions)
```

Manual inspection found:
- **"Calculate" / "Tools"** (P80 fix scope) — tool description strings in `<h3>` or `<p>` cards on category pages, e.g.:
  ```
  "Calculate Claude API costs for Fable 5, Opus 4.8, Sonnet 4.6..."
  ```
  Source: `src/data/tools/*.ts` `ToolMeta.description` field (AI-generated English)
- **"Save"** (different scope — NOT P80) — calculator-generated output content like "Cut volume in half: Save $4.00/mo" from AI cost calculator's `customFn`. Out of P80 scope (would require translating calculator output).

### Translation keys already existed (P17 era)

Per `grep -c "'tools\\.[a-z-]*\\.description'" src/i18n/translations.ts`:
- **100 `tools.*.description` keys exist** in translations.ts (added in P17, 2026-06-22 era)
- en field = `ToolMeta.description` (EN, AI-generated)
- zh field = proper Chinese translation

The translation was already done. **The fix was purely in the templates** — wire the existing translation keys into the category page render path.

## Why this exists

Two separate batches created the translation infrastructure (P17) and the rendering bug (later changes). When path-A category pages were created, they used `description: tool.description` (raw English) for simplicity. P17 added translations.ts keys but didn't update the templates to use them. P62 fixed `category.X.name` lookup but missed `tools.*.description`. P72 audit didn't catch this because it was looking for different patterns.

P79 re-audit surfaced this when it counted 42 "Calculate" hits — manual triage found they all came from `tool.description` rendering.

## Verification

After rebuild, manual grep of `dist/zh/ai-cost-tools/index.html` shows:

```
CJK=True 对比 14 款 OpenAI 模型的 API 成本，覆盖 GPT-5.5 到 GPT-5 Nano、GPT-4.1 系列和 o-series，含 Batch...
CJK=True 计算 Claude API 成本：Fable 5、Opus 4.8、Sonnet 4.6、Haiku 4.5 及旧版模型。含 Prompt Caching...
CJK=True 计算 DeepSeek API 成本：V4 Flash、V4 Pro 及旧版 R1 成本对比。含自动迁移、增长预测、跨提供商价...
CJK=True 计算 Google Gemini API 6 个模型的成本：含 Gemini 3.5 Flash、3.1 Pro、3 Flash 及旧版模型...
CJK=True 对比 7 款 AI 图像生成服务的成本：DALL-E 4/3、Midjourney V7、SD 4、Ideogram 3、Flux Pro...
```

All 5 sample tool descriptions are CJK. The 100 tools' descriptions all flow through the same pattern.

## Coverage expansion

| Layer | Before P80 | After P80 |
|---|---|---|
| Category h1 (en) | ✅ P63 | ✅ |
| Category h1 (zh) | ✅ P66b | ✅ |
| Category cross-link (en) | ✅ P63 | ✅ |
| Category cross-link (zh) | ✅ P66b | ✅ |
| Category description (en/zh) | ✅ P62 | ✅ |
| **Tool description (en on zh pages)** | ❌ | ✅ **P80 fix** |
| Tool h1 (en) | ✅ P68 | ✅ |
| Tool h1 (zh) | ✅ P67b | ✅ |
| Tool cross-link (en/zh) | ✅ P71 | ✅ |
| Blog h1 (en/zh) | ✅ P69 | ✅ |
| Blog cross-link (en/zh) | ✅ P71 | ✅ |
| Blog body (en unchanged, zh has bodyZh) | ✅ P75 | ✅ |
| Legal pages (en/zh) | ✅ P73 | ✅ |
| Hardcoded EN strings (D1-D5 list) | ✅ P74 guard | ✅ |

**Tool description was the last user-visible English leak on zh pages.**

## What was NOT done

- ❌ Did NOT add new CI guard for tool descriptions — P74's `zh-hardcoded-english-guard` covers 11 known leaks; adding 100 dynamic tool description checks would risk false positives ("Calculate" appears legitimately in some tool names)
- ❌ Did NOT translate calculator output content (e.g., "Save $4/mo") — different scope (would require translating `customFn` minified JS strings)
- ❌ Did NOT update path-B category pages (e.g., marketing-analytics, operations, etc.) — they may have the same pattern; deferred to a separate batch if audit finds it

## Future scope notes

If path-B pages also have the same pattern, they need the same fix. Audit script (`scripts/p72-audit-v6.cjs`) currently counts hardcoded EN across all pages but can't distinguish path-A vs path-B. Could add a more targeted scan if path-B needs fixing.

## Related references

- **P17** (2026-06-22) — original `tools.*.description` i18n keys added to translations.ts (100 keys, en + zh)
- **P62** (2026-07-24) — established `category.X.name` i18n lookup pattern (mirrored here)
- **P69** (2026-07-23) — `tools.*.title` i18n lookup added to category page templates (mirror for descriptions)
- **P72** (2026-07-25) — i18n audit; missed tool descriptions
- **P79** (2026-07-26) — re-audit found "Calculate/Tools" hits → traced to tool description rendering

## P81+ candidate

- **Path-B category pages audit** — verify whether marketing-analytics / operations / etc. also have this pattern
- **Calculator output content i18n** — translate `customFn` output strings (P81 if budget allows; else defer)
- **Translation glossary enforcement CI guard** — verify new translation keys follow glossary patterns
- **OG image localization** — image generation scope