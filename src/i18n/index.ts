import { translations } from './translations';

export type Lang = 'en' | 'zh';

export function getLang(astro: { url: URL; cookies: { get(name: string): { value: string } | undefined } }): Lang {
  const q = astro.url.searchParams.get('lang');
  if (q === 'zh' || q === 'en') return q;
  const c = astro.cookies.get('yt-lang');
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
