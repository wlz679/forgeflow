/**
 * Build-time helper: detect if Supabase URL and anon key are configured.
 *
 * Astro's `import.meta.env.VITE_*` is replaced at build time with values
 * from .env / .env.production. At runtime (in browser), this resolves to
 * the literal value baked into the JS bundle.
 *
 * For Node-only test paths (tsx), `import.meta.env` is undefined — fall back
 * to `process.env` so the helper is testable outside Astro's runtime.
 *
 * Gate logic:
 *   - URL exists and is non-empty
 *   - URL is NOT a placeholder (REPLACE_ME)
 *   - URL has https:// scheme
 *   - URL is a *.supabase.co domain
 *   - Key exists and is non-empty
 *   - Key is NOT a placeholder (REPLACE_ME)
 *
 * V1 does NOT validate process.env directly — that's `scripts/check-supabase-env.mjs`'s job.
 * This helper is for the Astro-side gate in Header.astro.
 */
export function hasSupabaseEnv(): boolean {
  const fromUrlMeta = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
  const fromKeyMeta = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;
  const fromUrlProc = (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || undefined;
  const fromKeyProc = (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || undefined;
  const url = fromUrlMeta ?? fromUrlProc;
  const key = fromKeyMeta ?? fromKeyProc;
  if (!url || !key) return false;
  const urlTrim = url.trim();
  const keyTrim = key.trim();
  if (urlTrim === '' || keyTrim === '') return false;
  if (urlTrim.includes('REPLACE_ME') || keyTrim.includes('REPLACE_ME')) return false;
  if (!urlTrim.startsWith('https://')) return false;
  if (!urlTrim.includes('.supabase.co')) return false;
  return true;
}
