// P141-B1-T3: i18n fallback helper (OCR Quick Win #2).
//
// Unified fallback + placeholder replacement, eliminating 25+ duplicated
// implementations across pages/components. Replaces the local `t()` helpers
// in src/scripts/*.client.ts and the central t() in src/i18n/index.ts.
//
// Contract:
//   translate(key, lang, params?) -> string
//     1. Lookup: entry = translations[key]
//     2. Fallback chain: entry?.[lang] ?? entry?.en ?? key
//        (zh missing → en → raw key as last resort)
//     3. Placeholder substitution: {param} → String(value), all occurrences
//        (matches existing convention used by 6000+ lines in translations.ts
//         and call sites like `t('home.title', lang, { count: toolsCount })`)
//
// Why `{param}` (not `$param` as the plan-spec shorthand suggested):
//   All 5300+ existing translation entries use `{varname}` placeholders.
//   All 25+ call sites pass `{ key: value }` records. Switching to `$param`
//   would require editing every entry + every call site. Keeping the
//   existing convention is a no-cost drop-in.
//
// Why `replaceAll` (not `.replace` like the old t()):
//   The old t() used `text.replace(\`{${k}}\`, v)` which only replaces the
//   FIRST occurrence. Translations like home.subtitle (`{count} tools ...
//   {count} free`) silently kept one {count} literal. replaceAll fixes that.

import { translations } from './translations';

export type TranslateLang = 'en' | 'zh';

export function translate(
  key: string,
  lang: TranslateLang,
  params?: Record<string, string | number>,
): string {
  const entry = translations[key];
  const tmpl = entry?.[lang] ?? entry?.en ?? key;
  if (!params) return tmpl;
  return Object.entries(params).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
    tmpl,
  );
}
