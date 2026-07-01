/**
 * Clerk browser lifecycle: load SDK, mount UserButton or bind SignIn fallback.
 *
 * Mount element contract:
 *   - Header.astro renders <div data-clerk-mount>Login</div> if env is set.
 *   - This module replaces that with Clerk's UserButton (if logged in)
 *     or binds a click handler to open the SignIn modal (if logged out).
 *
 * Failure mode: on any init error, mount element is cleared silently.
 * P2 features continue working (P3-1 doesn't touch LS data).
 *
 * Env fallback: Astro/Vite injects `import.meta.env.PUBLIC_*` at build time,
 * but tsx tests have no such runtime — fall back to `process.env` so the
 * dual-source pattern lets tests inject the key (matches src/lib/clerk-env.ts).
 */
import { Clerk } from '@clerk/clerk-js';

const fromMeta = (import.meta as any).env?.PUBLIC_CLERK_PUBLISHABLE_KEY as string | undefined;
const fromProc = (typeof process !== 'undefined' && process.env?.PUBLIC_CLERK_PUBLISHABLE_KEY) || undefined;
const PUBLISHABLE_KEY: string | undefined = fromMeta ?? fromProc;
let clerkInstance: Clerk | null = null;

export async function initClerk(): Promise<void> {
  if (!PUBLISHABLE_KEY) return;
  const mountEl = document.querySelector<HTMLDivElement>('[data-clerk-mount]');
  if (!mountEl) return;

  try {
    clerkInstance = new Clerk(PUBLISHABLE_KEY);
    await clerkInstance.load();

    if (clerkInstance.user) {
      clerkInstance.mountUserButton(mountEl);
    } else {
      mountEl.addEventListener('click', handleLoginClick);
    }
  } catch (err) {
    console.error('[clerk] init failed:', err);
    clerkInstance = null;
    mountEl.innerHTML = '';
  }
}

function handleLoginClick(e: Event): void {
  e.preventDefault();
  if (clerkInstance) clerkInstance.openSignIn();
}

/**
 * @internal exported for tests. Not part of the public API.
 * Returns the Clerk instance if initialized, null otherwise.
 */
export function getClerkInstance(): Clerk | null {
  return clerkInstance;
}