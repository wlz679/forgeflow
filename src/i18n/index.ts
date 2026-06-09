import { translations } from './translations';

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

export function t(key: string, lang: Lang, vars?: Record<string, string>): string {
  const entry = translations[key];
  if (!entry) return key;
  let text = entry[lang];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}
