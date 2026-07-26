# P83 Audit Script Sync + Orphan-Key Detection Ship Log

## Summary

P83 ships 2 improvements to the translation glossary tooling:
1. **`scripts/p72-audit-v6.cjs`** — parser now strips `//` line comments (mirror P82 glossary guard)
2. **`tests/translation-glossary-guard.test.ts`** — extended with 2nd test block that detects orphan translation keys (keys in translations.ts not referenced by any t() call)

**Date:** 2026-07-26
**Batch ID:** P83
**Files touched:** 2 (1 audit script + 1 extended test)
**Test delta:** 1181 → 1181 (added 1 test, net 0 — was 1 test, now 2)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### T1: Audit script parser sync

`scripts/p72-audit-v6.cjs` now strips `//` line comments before parsing, mirroring P82 glossary guard's parser robustness:

```js
// P83: strip `//` line comments before parsing (mirror P82 glossary guard).
// Without this, a commented-out key would still be detected as present.
const lines = rawContent.split('\n');
const maskedLines = lines.map(line => {
  const idx = line.indexOf('//');
  return idx === -1 ? line : line.slice(0, idx);
});
const tcontent = maskedLines.join('\n');
```

Audit output unchanged for normal state (no commented keys). Robustness matches P82 glossary guard so both tools see the same translation keys.

### T2: Orphan-key detection

Extended `tests/translation-glossary-guard.test.ts` with 2nd test block that detects translation keys present in `translations.ts` but never referenced.

**Reference detection** (improved over initial implementation):
1. **Exact string**: `t('exact.key', ...)` — direct match
2. **Exact double-quoted**: `t("exact.key", ...)` — direct match
3. **Template literal**: `t(\`prefix.${var}.suffix\`, ...)` — adds static prefix; any key starting with that prefix is treated as referenced
4. **Variable key references**: `key: 'exact.key'` — string literal matching translation-key shape (e.g., `footer.privacy`); components like `Footer.astro` use a map of `{href, key}` pairs and call `t(key, lang)` with the key as a variable

Initial implementation missed pattern #4 (variable key references), causing 16 false positives like `footer.privacy` (used in `Footer.astro` via `key: 'footer.privacy'`). After adding pattern #4, false positives dropped to 0.

## Initial orphan detection false positive triage

First run reported **16 orphans**:
- `nav.blog` / `nav.about` — Footer.astro `key: 'nav.blog'`
- `footer.privacy` / `footer.terms` / `footer.contact` / `footer.about` — Footer.astro `key: 'footer.privacy'`
- `adsense.placeholder` — AdUnit.astro
- `favorites.saved_count` / `favorites.aria.remove` — Header.astro favorites menu
- `sync.status.pulling` / `sync.toast.*` — sync-init.client.ts (in `src/scripts/`)
- `sync.migration.empty` — migration.client.ts (in `src/scripts/`)

All 16 were **false positives**: the keys ARE used, just via variable references (`key: 'footer.privacy'`) or in `src/scripts/` client-side files. Adding pattern #4 (variable key references) eliminated all 16 false positives.

**Final result**: 0 real orphans, 0 false positives.

## Why this exists

P82 added glossary structural invariants (every tool/blog/category has expected keys). P83 adds the **complementary check**: no orphan keys in translations.ts.

Orphan keys are common drift in i18n systems:
- Key added but template never wired (dead code)
- Key renamed/refactored but old entry left behind
- Copy-pasted from another project

Without orphan detection, translations.ts bloats over time with dead entries. The file grows but page rendering doesn't change. Each new orphan is a small bloat, but compounds over years.

P83 catch makes orphan keys surface in CI before they accumulate.

## TDD verification

1. **Baseline PASS**: Both tests pass on current state → 2 pass / 0 fail
2. **Orphan detection works**: Initial false positives (16) confirmed real-world value; pattern #4 fix eliminated them
3. **Comment-out robustness**: P82 already verified comment-stripping works (regression test in glossary guard)

## Coverage matrix (post-P83)

| Defense layer | Test file | Status |
|---|---|---|
| en cat page h1 + cross-link | `category-en-cjk-guard` | ✅ |
| zh cat page h1 + cross-link | `category-zh-cjk-preservation` | ✅ |
| en/zh tool page h1 | `tool-en-cjk-guard`, `tool-zh-cjk-preservation` | ✅ |
| en/zh blog page h1 | `blog-en-cjk-guard`, `blog-zh-cjk-preservation` | ✅ |
| en/zh tool/blog cross-link | `tool-cross-link-cjk-guard`, `blog-cross-link-cjk-guard` | ✅ |
| 11 known hardcoded EN | `zh-hardcoded-english-guard` | ✅ |
| Structural i18n keys (every tool/blog/category has keys) | `translation-glossary-guard` test 1 | ✅ |
| **No orphan translation keys** | `translation-glossary-guard` test 2 | ✅ NEW |

**Total: 12 tests** (11 build-dep + 1 source-only with 2 assertions).

## What was NOT done

- ❌ Did NOT add CI guard for orphaned key **patterns** (e.g., keys that match regex but aren't real translations) — would need human curation
- ❌ Did NOT add auto-fix for orphan detection (deleting unused keys) — manual deletion is safer for future maintainability
- ❌ Did NOT add CI guard for `t()` calls referencing MISSING keys — covered by audit script's `missingKeys` check
- ❌ Did NOT extend audit script to also walk `src/scripts/` client files — separate concern, audit script's dist/zh scan is sufficient

## Related references

- **P82** — added structural drift guard + comment-stripping parser
- **P78** — translation glossary structural patterns (P82/P83 enforces these)
- **P72** — original audit script + 6 user-visible defects
- **P17** — original `tools.*.description` keys added
- **P69** — `blog.*.title/excerpt` keys added (also has template literal usage `t(\`blog.${post.slug}.title\`, lang)`)

## P84+ candidate

- **Translator-friendly diff** — `scripts/translation-glossary-guard.ts` extracted to share logic between audit + CI guard
- **CHANGELOG catch-up v2** — document P66-P83 in CHANGELOG (P65 only covered P46-P64)
- **Calculator output content i18n** — translate `customFn` output strings (different scope)
- **OG image localization** — image generation scope