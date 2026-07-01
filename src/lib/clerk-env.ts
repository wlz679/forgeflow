/**
 * Build-time helper: detect if Clerk publishable key is configured.
 *
 * Astro's `import.meta.env.PUBLIC_*` is replaced at build time with values
 * from .env / .env.production. At runtime (in browser), this resolves to
 * the literal value baked into the JS bundle.
 *
 * For Node-only test paths (tsx), `import.meta.env` is undefined — fall back
 * to `process.env` so the helper is testable outside Astro's runtime.
 *
 * Gate logic:
 *   - key exists
 *   - key is non-empty (after trim)
 *   - key is NOT a placeholder (REPLACE_ME)
 *
 * V1 does NOT validate process.env directly — that's `scripts/check-clerk-env.mjs`'s job.
 * This helper is for the Astro-side gate in Header.astro.
 */
export function hasClerkEnv(): boolean {
  const fromMeta = (import.meta as any).env?.PUBLIC_CLERK_PUBLISHABLE_KEY as string | undefined;
  const fromProc = (typeof process !== 'undefined' && process.env?.PUBLIC_CLERK_PUBLISHABLE_KEY) || undefined;
  const key = fromMeta ?? fromProc;
  if (!key) return false;
  const trimmed = key.trim();
  if (trimmed === '') return false;
  if (trimmed.includes('REPLACE_ME')) return false;
  return true;
}