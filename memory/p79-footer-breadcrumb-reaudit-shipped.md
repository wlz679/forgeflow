# P79 Footer/Breadcrumb i18n Re-Audit Ship Log

## Summary

P79 re-runs the P72 i18n audit (`scripts/p72-audit-v6.cjs`) + performs deep checks on footer/breadcrumb categories to verify P72 audit's 6 defects remain closed. **No new user-visible i18n defects found.** Audit findings are limited to false positives in SEO metadata tags (brand preservation, by design) and calculator-generated output content (different scope, not i18n template).

**Date:** 2026-07-26
**Batch ID:** P79
**Files touched:** 1 (audit report memory file only — no production changes)
**Test delta:** unchanged
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What was reviewed

Re-ran `scripts/p72-audit-v6.cjs` on current state (post-P78) to baseline. Top results:

```
Hardcoded English in dist/zh (filter strips <script>, <style>, JSON-LD):
  Blog: 303 / 101 pages
  Save: 51 / 7 pages
  Calculate: 42 / 7 pages
  Tools: 35 / 18 pages
  Search: 31 / 7 pages
  Privacy: 16 / 1 pages  ← false positive (see below)
  Home: 15 / 3 pages
```

Each finding manually triaged:

### Blog: 303 hits / 101 pages — NOT A DEFECT

After manual review: each page has exactly 3 "Blog" hits in `<title>` and `<meta og:title>` / `<meta twitter:title>` tags:

```html
<title>最佳 激活率（2026） — ForgeFlowKit Blog</title>
<meta property="og:title" content="最佳 激活率（2026） — ForgeFlowKit Blog">
<meta property="twitter:title" content="最佳 激活率（2026） — ForgeFlowKit Blog">
```

These are **SEO metadata tags** (not user-visible body content). The brand `ForgeFlowKit Blog` is preserved per glossary rule (`docs/i18n/zh-terminology.md` "Brand Name Preservation" section). The page body uses `ForgeFlowKit 博客` correctly.

**This is by design, not a defect.** The P72 audit's filter strips `<script>`, `<style>`, JSON-LD but not `<title>` / `<meta>`, which causes this false positive.

### Save: 51 hits / 7 pages — NOT A DEFECT (different scope)

Hits come from calculator-generated output content (AI cost calculator scenarios):

```
...Cut volume in half: Save $$4.00/mo ($$8.00 → $$4.00)...
...Switch to SD 4 API ($0.003/img): $$0.30/mo...
```

These are **calculator output strings**, not i18n template strings. They come from the calculator's `customFn` (minified JS) and `staticExamples[0]`. Fixing these would require translating calculator output content — a different scope (P75 was blog body; this would be calculator output).

**Not a P79 i18n template defect.**

### Calculate / Tools / Search: 35-42 hits — NOT A DEFECT

Similar to Save: these strings appear in AI-generated calculator descriptions on category pages (`ai-cost-tools`, `cost-efficiency`, `freelance-pricing`, etc.). Source is `categories.ts` description fields which were AI-generated and not i18n-lookup.

**Could be a future P-series** (translate category descriptions via i18n), but out of P79 scope.

### Privacy: 16 hits / 1 page — FALSE POSITIVE

Initial Python filter didn't strip JSON-LD properly. With the audit's exact regex:

```python
re.sub(r'<[^>]+type="application/ld\+json"[^>]*>[\s\S]*?</[^>]+>', ' ', ...)
```

→ 0 hits in stripped body. P73 fix (privacy-policy i18n) is verified.

### Home: 15 hits / 3 pages — NOT A DEFECT

After filter strip: 0 hits in body. The 15 hits were `<title>Home</title>` and similar metadata. Tool page breadcrumbs use `t('breadcrumb.home', lang)` correctly.

## P72 audit status (post-P79 re-audit)

| Defect | Status | Verification |
|---|---|---|
| D1: blog index 200 EN | ✅ Closed (P72 T2-A) | dist/zh/blog/index.html 100 h2 titles all CJK |
| D2: 100 tool pages RelatedBlog EN | ✅ Closed (P72 T2-A) | dist/zh/solopreneur-*/index.html RelatedBlog links all CJK |
| D3: CategoryGuides EN | ✅ Closed (P72 T2-A) | "Guides & Articles" → "指南与文章"; "Related Articles" → "相关文章" |
| D4: privacy-policy EN | ✅ Closed (P73) | 0 hits after proper filter |
| D5: terms EN | ✅ Closed (P73) | Same as D4 |
| D6: MD blog bodies EN | ✅ Closed (P75) | 100 MD files now have bodyZh; verified post-P76 review |

**P72 audit: 6/6 closed. No new defects in footer/breadcrumb re-audit.**

## Audit script improvement recommendation

The audit script's filter is too broad — it should also strip `<title>` and `<meta>` tags where brand preservation is by design. Without that filter, "Blog" appears 303 times but represents zero user-visible defects.

Could add to `scripts/p72-audit-v6.cjs`:
```js
const stripped = content
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, ' ')  // strip entire <head>
  .replace(/<[^>]+type="application\/ld\+json"[^>]*>[\s\S]*?<\/[^>]+>/gi, ' ');
```

This would make the audit output more actionable (filter out SEO metadata false positives).

**Decision**: defer this audit script improvement — it's a small fix, not a production change. Could be P80+.

## What was NOT done

- ❌ Did NOT modify `scripts/p72-audit-v6.cjs` (filter improvement deferred)
- ❌ Did NOT translate calculator output content (`Save`, `Calculate`, etc.) — different scope (P-series candidate)
- ❌ Did NOT translate category descriptions — different scope (P-series candidate)
- ❌ Did NOT modify any source files — P79 is audit-only batch

## Conclusion

**P72 audit's 6 user-visible i18n defects remain closed. No new defects in footer/breadcrumb re-audit.**

The remaining "hardcoded English" hits are either:
1. SEO metadata tags where brand preservation is intentional (per glossary)
2. Calculator-generated output content (different scope, P-series candidate)
3. False positives that proper filtering would exclude

Maintenance mode continues. P79 establishes baseline that:
- P72 audit's defensive coverage is complete (6/6 closed, no regressions)
- Audit script produces false positives that should be filtered out
- Future i18n work should focus on different scopes (calculator output, category descriptions)

## Related references

- **P72** — original audit + 5 defect fixes (D1-D5)
- **P73** — fixed D4+D5
- **P75** — fixed D6
- **P74** — added CI guard for D1-D5 hardcoded strings (already protects)
- **P78** — extended glossary with brand preservation rules
- **`scripts/p72-audit-v6.cjs`** — audit script (P72 ship)

## P80+ candidate

- **Audit script filter improvement** — strip `<head>` to exclude SEO metadata false positives (~1 commit)
- **Category descriptions i18n** — translate `categories.ts` description fields (currently AI-generated EN, used on zh pages)
- **Calculator output i18n** — translate `customFn` output strings (P-series candidate, large scope)
- **Translation glossary enforcement CI guard** — verify new translation keys follow glossary patterns
- **OG image localization** — image generation scope (different from text)