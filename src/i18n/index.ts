// P141-B1-T3: t() now delegates to the unified translate() helper (OCR Quick
// Win #2). The helper adds two behaviors the old implementation lacked:
//   - zh→en fallback when the requested language is missing
//   - replaceAll placeholder substitution (old code used .replace which
//     only swapped the first occurrence and silently left `{var}` literals
//     behind in strings like home.subtitle that use the same var twice)
//
// P150: Data source moved to per-locale JSON (see translate-helper.ts).
//       `Lang` type stays exported here so client scripts can import it
//       without reaching into translate-helper internals.
import { translate } from './translate-helper';

export type Lang = 'en' | 'zh';

export function getLang(astro: { url: URL; params?: Record<string, string | undefined>; cookies?: { get(name: string): { value: string } | undefined } }): Lang {
  // 1. Path param: /zh/ or /en/
  const p = astro.params?.lang;
  if (p === 'zh' || p === 'en') return p;
  // 2. Query param fallback: ?lang=zh
  const q = astro.url.searchParams.get('lang');
  if (q === 'zh' || q === 'en') return q;
  // 3. Cookie fallback
  const c = astro.cookies?.get('lang');
  if (c && (c.value === 'zh' || c.value === 'en')) return c.value;
  return 'en';
}

export const t = translate;
