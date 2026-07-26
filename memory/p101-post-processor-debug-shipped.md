# P101 Post-Processor Debug Ship Log

## Summary

P101 investigates why P99/P100 i18n keys don't translate. **Root cause found**: section header strings (e.g., "💰 Savings Insights") are not in `staticExamples[0]` for the 8 affected engines — they're in later examples or in customFn output. Post-processor only modifies `staticExamples[0]`, so the keys don't apply.

**Date:** 2026-07-26
**Batch ID:** P101
**Files touched:** 0 (docs-only)
**Test delta:** unchanged
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## Investigation findings

Inspected `staticExamples[0]` source content for 3 affected engines:

**carrying-cost-calculator.ts [0]:**
```
⏰ Carrying Cost Calculator
🩺 Health:
━━━━━...
• 🟡 Good — typical retail...
```

**employee-cost-calculator.ts [0]:**
```
💼 Employee Cost Calculator
📍 Location: United States
━━━━━...
```

**break-even-calculator.ts [0]:**
```
📊 Break-Even Analysis  ← this one HAS the key
⏱️ Break-Even Timeline
• Initial Investment: $0
```

The "💰 Savings Insights" string is **NOT in staticExamples[0]** for most engines. It's in later examples or in the customFn-rendered preview.

## Why P85a worked but P99/P100 didn't

P85a (AI cost) worked because AI cost engines' `staticExamples[0]` includes section headers directly (e.g., "💰 Cost Summary" → "💰 成本明细").

P99/P100 (ops/cost/valuation) didn't work because those engines' `staticExamples[0]` is a HEALTH/SUMMARY section, not a SAVINGS section. The SAVINGS section is in a later example or in the customFn output that the post-processor doesn't touch.

The P98 break-even exception: that one DID work because its [0] happens to start with "📊 Break-Even Analysis" → "📊 Break-Even Timeline" (the savings header is in a later line).

## Why the keys still exist

The P99/P100 keys are still valuable for **future engines** that use this pattern. They're a foundation for future i18n work, not actively translating current pages.

## Scope of fix (deferred)

A proper fix would require:
1. **Option A**: Move all section headers into `staticExamples[0]` for affected engines (modify each engine's staticExamples)
2. **Option B**: Apply post-processor to ALL staticExamples (not just [0])
3. **Option C**: Apply post-processor to customFn output (client-side JS modification)

Each option has tradeoffs:
- A: requires touching all 8 engines (medium scope, affects engine content)
- B: changes page template (low scope, may show more content)
- C: requires post-processor migration to client-side (complex)

These fixes are deferred to future P-series (P101a/P101b/P101c if user requests).

## What was NOT done

- ❌ Did NOT fix the post-processor (debug-only batch)
- ❌ Did NOT modify engine content
- ❌ Did NOT change page template logic
- ❌ Did NOT remove the P99/P100 keys (they remain valid for future use)

## Related references

- **P85a** — original post-processor pattern (worked for AI cost)
- **P98** — first extension (SaaS, some worked)
- **P99** — second extension (Ops/Cost/Valuation, didn't work)
- **P100** — third extension (Misc, didn't work)
- **P101** — this batch (debug, found root cause)
- **src/pages/[lang]/[slug].astro** — page template post-processor

## P102+ candidate

- **P101a: Option A fix** — move section headers into staticExamples[0] for 8 engines
- **P101b: Option B fix** — change page template to translate all staticExamples
- **OG image localization** — generate per-lang OG images (image generation scope)
- **JS bundle size CI guard** — extend performance dimension
- **Audit script migration** — extract parser logic to shared library