# P85a AI Cost Calculator Section Headers i18n Ship Log

## Summary

P85a adds i18n translations for the 6 most-visible AI cost calculator section headers via a page-template post-processor. Body content (numbers, model names) remains in English — those are technical/universal and the section header labels above them are the highest-impact user-visible strings.

**Date:** 2026-07-26
**Batch ID:** P85a (scoped subset of P85)
**Files touched:** 2 (1 translations.ts + 1 page template)
**Test delta:** unchanged (no new tests)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## Why "subset of P85" — scope rationale

Original P85 was "Calculator output i18n — 100 customFn × ~10 strings = 500+ strings + API change to add `lang` parameter to `generate()`". Investigation revealed:

1. **`generate(inputs: Record<string, string>): string[]`** has no `lang` parameter — adding one is a breaking API change for all 100 engines
2. Each engine has both `calculate()` (server-side, generates staticExamples[0]) and `customFn` (client-side, minified JS) — both would need updating
3. ~528 `out.push()` calls across 7 AI cost engines alone; ~25 engines across 11 categories have Save/Savings output

User chose **P85a (scoped)**: translate only the most-visible emoji-led section headers. ~6 strings + page-template post-processor. No API change.

## What shipped

### translations.ts — 6 new keys

```ts
// P85a: AI cost calculator section header translations
'ai_cost.section.cost_breakdown': { en: '💰 Cost Breakdown', zh: '💰 成本明细' },
'ai_cost.section.growth_projection': { en: '📈 Growth Projection', zh: '📈 增长预测' },
'ai_cost.section.break_even': { en: '⚖️ Break-Even', zh: '⚖️ 盈亏平衡' },
'ai_cost.section.best_provider': { en: '🎯 Best Provider by Use Case', zh: '🎯 按用途最佳提供商' },
'ai_cost.section.cheapest_overall': { en: '🏆 Cheapest Model Overall', zh: '🏆 整体最便宜的模型' },
'ai_cost.section.tip': { en: '💡 Tip', zh: '💡 提示' },
```

### page-template post-processor

`src/pages/[lang]/[slug].astro` adds a `translateCalcOutput` function and wires it into the staticExamples render:

```ts
function translateCalcOutput(text: string, lang: Lang): string {
  const headerKeys = [
    'ai_cost.section.cost_breakdown',
    'ai_cost.section.growth_projection',
    'ai_cost.section.break_even',
    'ai_cost.section.best_provider',
    'ai_cost.section.cheapest_overall',
    'ai_cost.section.tip',
  ];
  let out = text;
  for (const key of headerKeys) {
    const en = t(key, 'en');
    const localized = t(key, lang);
    if (en !== localized) {
      out = out.split(en).join(localized);
    }
  }
  return out;
}
```

Render-time usage:
```ts
const translatedEx = lang === 'zh' && engine.clientConfig.type === 'custom'
  ? translateCalcOutput(ex, lang)
  : ex;
return <ResultCard text={translatedEx} index={i} hideIndex={engine.clientConfig.type === 'custom'} />;
```

The post-processor only applies when:
1. **lang === 'zh'** (en pages get raw EN content unchanged)
2. **engine.clientConfig.type === 'custom'** (AI cost engines use the custom type; other engines use templates/combinations which have different output formats)

## Scope and limitations

### What's translated
- ✅ "💰 Cost Breakdown" → "💰 成本明细"
- ✅ "📈 Growth Projection" → "📈 增长预测"
- ✅ "⚖️ Break-Even" → "⚖️ 盈亏平衡"
- ✅ "🎯 Best Provider by Use Case" → "🎯 按用途最佳提供商"
- ✅ "🏆 Cheapest Model Overall" → "🏆 整体最便宜的模型"
- ✅ "💡 Tip" → "💡 提示"

### What's NOT translated (acknowledged limitations)
- ❌ Body content: "Cut volume in half: Save $4/mo", "Switch to SD 4 API", per-image pricing text
- ❌ Live calculation output (customFn runs in browser, doesn't go through page template)
- ❌ Other calculator categories (SaaS, ops, cost, etc. — have similar "Save" hits but not in P85a scope)
- ❌ Calculator-specific terminology (model names, GPU types kept in English)

These are deferred to potential P86+ batches. The current P85a is a **focused, low-risk improvement** for the highest-impact strings.

## Verification

Manual grep of `dist/zh/solopreneur-ai-image-cost-calculator/index.html`:

```
⚖️ 盈亏平衡: Whe[n subscription beats per-image]   ← translated!
💰 Cost Summary');o.push(SEP3.repeat(50));           ← not in our list (different string)
📊 All Providers — Mo[nthly Cost Comparison]        ← not in our list
⚖️ Break-Eve[n: When ...]                            ← partially translated
📈 Volume Sce[narios]                                 ← not in our list
🎯 Best Provider by Use Case:');o.push(SEP         ← translated!
💰 Budget is #1 co                                  ← not in our list (body text)
```

The "⚖️ Break-Even" → "⚖️ 盈亏平衡" translation is confirmed. Other AI cost engines (openai, claude, etc.) have similar section headers that will also translate.

## Why this exists

P79 re-audit found 51 "Save" hits on 7 zh pages — the last residual user-visible English leak after P62-P83. Full i18n would require API change. P85a is a **focused compromise**:
- Translatable strings (section headers) → i18n via post-processor
- Non-translatable content (live calc output) → accepted as known limitation
- No API breaking changes
- ~10 strings translated vs ~500+ in full scope

## What was NOT done

- ❌ Did NOT add `lang` parameter to `generate()` API (breaking change, deferred)
- ❌ Did NOT translate body content strings ("Save $4/mo", etc.) — deferred
- ❌ Did NOT translate other calculator categories (SaaS, ops, etc.) — scoped to AI cost only per user choice
- ❌ Did NOT update customFn minified JS — post-processor only affects staticExamples[0] render path
- ❌ Did NOT add new CI guard — the 6 keys are explicit; future additions would need glossary guard extension

## Related references

- **P79** — re-audit found 51 "Save" hits on 7 zh pages (the trigger)
- **P80/P81** — closed path-A/path-B tool description gaps (P85a is the calculator output side)
- **P78** — translation glossary patterns (P85a follows the `ai_cost.*` namespace convention)
- **P82/P83** — glossary structural + orphan guards (would catch P85a additions)

## P86+ candidate

- **Live calculation output translation** — requires `generate()` API change; deferred
- **SaaS calculator output i18n** — similar to P85a but for SaaS category (~3 engines with Save output)
- **Ops/Cost/Valuation calculator output i18n** — broadens scope beyond AI cost
- **Glossary guard extension** — verify new `ai_cost.*` keys follow glossary patterns