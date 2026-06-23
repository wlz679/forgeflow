# i18n Drift Fix — Design Spec

**Date**: 2026-06-23
**Status**: Draft (pending user review)
**Author**: brainstorming session

## Problem

The site's i18n layer has drifted silently:

- 12 of 32 engines have `howToUse[]` items with no matching translation entry
- 1 engine (burn-rate) has a `faq[]` item with no matching translation entry
- The user-facing symptom: pages render raw i18n keys like `tools.solopreneur-burn-rate-calculator.how_to_use.8` instead of localized text

**Root cause**: `src/i18n/index.ts:20` returns the key string itself when a translation is missing. Combined with no build-time enforcement, drift ships to production unnoticed.

**Secondary cause**: All 1600+ translations are hand-maintained in a single `translations.ts` file, with no automated link back to the engine definitions that reference them.

## Goals

1. **Drift becomes impossible to ship**: any missing translation fails the build before `astro build` runs.
2. **Adding a new language becomes a one-file change**: drop a new JSON file, nothing else.
3. **User never sees raw i18n keys**: at minimum, English fallback; at best, the right language.
4. **Zero new runtime dependencies**: keep the bundle small (project is pre-launch, Astro-static).

## Non-Goals

- Adding i18next / FormatJS / runtime i18n libraries (YAGNI for static site)
- Adding a Translation Management System (Crowdin/Phrase) (no external translator yet)
- ICU MessageFormat / plural rules / variable interpolation (no current content needs it)
- Refactoring `howToUse` to use semantic keys instead of array indices (out of scope; tracked separately)

## Design

### 1. File structure

```
src/i18n/
  index.ts                          # t(), getLang(), supportedLangs, Lang type
  locales/
    en.json                         # new — flat { "key": "English value" }
    zh.json                         # new — flat { "key": "中文值" }
    # ja.json, ko.json, ...         # future — drop-in

scripts/
  check-i18n-completeness.mjs       # new — drift detector
  # _migrate-translations.mjs       # one-shot, deleted after run
```

`src/i18n/translations.ts` is **deleted** after migration.

### 2. Locale auto-discovery

```ts
// src/i18n/index.ts
const localeModules = import.meta.glob<{ default: Record<string, string> }>(
  './locales/*.json',
  { eager: true }
);

const locales: Record<string, Record<string, string>> = {};
for (const [path, mod] of Object.entries(localeModules)) {
  const code = path.match(/\/([^/]+)\.json$/)?.[1];
  if (code) locales[code] = mod.default;
}

export const supportedLangs = Object.keys(locales).sort();
export type Lang = typeof supportedLangs[number];
```

Vite's `import.meta.glob` is resolved at build time — adding a JSON file is the only step needed to support a new language. `supportedLangs` and `Lang` type both auto-derive.

### 3. `t()` API stays stable

All 142 call sites across 15 files continue using `t(key, lang, vars?)`. Only the implementation changes.

```ts
export function t(key: string, lang: Lang, vars?: Record<string, string>): string {
  const localized = locales[lang]?.[key];
  if (localized !== undefined) return interpolate(localized, vars);

  const english = locales.en?.[key];
  if (english !== undefined) {
    if (import.meta.env.DEV) {
      console.warn(`[i18n] Missing ${lang} translation for "${key}", falling back to en`);
    }
    return interpolate(english, vars);
  }

  // Even English missing — real bug
  const msg = `[i18n] Missing translation for "${key}" (no fallback)`;
  if (import.meta.env.DEV) {
    console.error(msg);
    return `[[${key}]]`;
  }
  console.error(msg);
  return '';
}

function interpolate(text: string, vars?: Record<string, string>): string {
  if (!vars) return text;
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replace(`{${k}}`, v),
    text
  );
}
```

**Fallback chain**: target-lang → en → `[[key]]` (dev) / `''` (prod). Never the raw key.

### 4. `getLang()` accepts any supported lang

```ts
export function getLang(astro: {
  url: URL;
  params?: Record<string, string | undefined>;
  cookies?: { get(name: string): { value: string } | undefined };
}): Lang {
  const candidate =
    astro.params?.lang ??
    astro.url.searchParams.get('lang') ??
    astro.cookies?.get('lang')?.value ??
    'en';
  return (supportedLangs as readonly string[]).includes(candidate)
    ? (candidate as Lang)
    : 'en';
}
```

URL routing (`/[lang]/[slug].astro`) already auto-generates pages for any `[lang]` value, so `getStaticPaths()` does not need changes.

### 5. Drift detector (`scripts/check-i18n-completeness.mjs`)

#### What it scans

| Source | Pattern | Expected keys per engine |
|---|---|---|
| `src/engines/*.ts` | `slug: "X"` | `tools.X.title` + `tools.X.description` |
| same | `inputs[]` | `tools.X.input.{name}.label` + `.placeholder` per item |
| same | `howToUse[]` indexed `i` | `tools.X.how_to_use.{0..n-1}` |
| same | `faq[]` indexed `i` | `tools.X.faq.{i}.q` + `.faq.{i}.a` |
| `src/pages/[lang]/[slug].astro` | preset blocks paired with `slug === 'X'` | `tools.X.preset.{key}` per preset |

#### Preset extraction

Each preset block follows the pattern:

```astro
{slug === 'solopreneur-burn-rate-calculator' && (
  ...[
    { emoji:'🌱', key:'pre-seed', ... },
    { emoji:'⚠️', key:'bloated', ... },
  ].map(p => (
    <button ...>{t(`tools.solopreneur-burn-rate-calculator.preset.${p.key}`, lang)}</button>
  ))
)}
```

The extractor walks the file, pairs each `slug === 'X'` guard with the closest subsequent `{ key: '...' }` literal array, and emits expected keys `tools.X.preset.{key}`.

#### Output

```
Scanning 32 engines + 1 page template...

✓ solopreneur-mrr-calculator       (en: 50, zh: 50)
❌ solopreneur-unit-economics-calculator
   en missing: how_to_use.8, how_to_use.9, how_to_use.10
   zh missing: how_to_use.8, how_to_use.9, how_to_use.10
⚠ solopreneur-affiliate-income-calculator
   orphan in en.json: tools.affiliate-income-calculator.deprecated_preset
   (no engine/page references this key)

─── 12 engines with drift, 1 with orphans. Build aborted. ───
```

Exits 0 when clean, 1 when drift detected. `--strict` flag also fails on orphans.

### 6. Build pipeline integration

```jsonc
// package.json scripts
{
  "prebuild":   "pnpm check:i18n",          // new — pnpm auto-runs before build
  "check:i18n": "node scripts/check-i18n-completeness.mjs",
  "check":      "pnpm check:i18n && pnpm typecheck && pnpm test:run"  // expanded
}
```

```bash
# .githooks/pre-commit — append after existing codegen-examples check
node scripts/check-i18n-completeness.mjs --strict || {
  echo "❌ i18n drift detected. Run 'pnpm check:i18n' to see details."
  exit 1
}
```

Three enforcement points: pre-commit (dev local), prebuild (CI + manual build), `pnpm check` (CLAUDE.md mandate before commit).

### 7. Migration steps (one-time)

1. Write `scripts/check-i18n-completeness.mjs` (fully functional).
2. Run a one-shot `_migrate-translations.mjs` script that reads `src/i18n/translations.ts` and emits `src/i18n/locales/en.json` + `zh.json`. Delete the one-shot script after run.
3. Update `src/i18n/index.ts` to use `import.meta.glob` (per section 2-4 above).
4. Run `pnpm check:i18n` — expect drift detected in the 13 known places.
5. Fix all 13 drift entries in the JSON files (translation content informed by sibling engines).
6. Delete `src/i18n/translations.ts`.
7. Verify: `pnpm check`, `pnpm build` (141 pages, no raw keys), `pnpm dev` (spot-check 3 pages × 2 langs).

Steps 1-7 belong in a single PR titled "i18n drift fix" with both commit messages calling out: (a) infrastructure change, (b) historical drift repaired.

### 8. Testing

Use **`node:test`** (built-in, Node ≥20.19; zero new deps per project requirement).

#### `tests/i18n/t.test.ts`

- `t()` returns localized value when target-lang key exists
- `t()` falls back to English when target-lang missing (logs warn in dev)
- `t()` returns `[[key]]` in dev when even English missing
- `t()` returns `''` in production when even English missing
- `t()` interpolates `{var}` placeholders correctly
- `t()` handles missing `vars` parameter (no crash)

#### `tests/scripts/check-i18n-completeness.test.ts`

- Exits 0 on clean repo
- Exits 1 with key name in output when an `en.json` key is removed (use a fixture / temp copy)
- `--strict` mode also fails on orphan keys

#### `tests/build/no-raw-keys.test.ts`

- `dist/en/**/*.html` contains no `tools.X.Y.N`-style raw keys
- `dist/zh/**/*.html` contains no `tools.X.Y.N`-style raw keys

These tests require a built `dist/`; the build runs in CI before tests.

### 9. Cleanup of debugging artifacts

The following scripts were created during the debugging session and **must be deleted** before commit:

- `scripts/_audit-howTouse.cjs`
- `scripts/_verify-counts.cjs`

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Preset regex misses a non-standard block | Medium | Manual smoke test of all 24 engines after migration; check output line count vs expected |
| `import.meta.glob` doesn't include new JSON file in time | Low | Vite's glob is statically resolved; only fails if file watcher misses — verify by adding a `ja.json` fixture in tests |
| Existing dev tooling reads `translations.ts` directly | Low | Grep before deletion; the only consumer is `src/i18n/index.ts` |
| Pre-commit hook slows down local commits | Low | Check is sub-second; comparable to existing `codegen-examples` check |

## Open questions

None. All design decisions confirmed during brainstorming session 2026-06-23.