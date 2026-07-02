/**
 * P3-3 migration idempotency helpers.
 *
 * Tracks per-Clerk-user-per-device whether the LS → cloud migration has run.
 * Persisted in localStorage as ISO timestamp at key `forgeflowkit:migration:{userId}`.
 *
 * Idempotency policy (per spec §V1 Design):
 *   - V1 (this version): per-Clerk-user-per-device via LS key + per-tab via
 *     sessionStorage (the latter enforced by sync-init.client.ts existing check)
 *   - V2: TBD — `clearMigrated()` is exposed now so a future "Reset migration
 *     state" sync-menu button can be added without re-introducing the API
 *
 * Pure functions. Safe to call from anywhere (browser or test); no-ops when
 * localStorage is unavailable.
 */

const MIGRATION_KEY_PREFIX = 'forgeflowkit:migration:';

function migrationKey(userId: string): string {
  return MIGRATION_KEY_PREFIX + userId;
}

/**
 * Returns true if migration has run for the given Clerk user on this device.
 * Returns false when localStorage is unavailable (treat as "not yet run" — caller
 * will attempt migration and rely on the underlying fetch for conflict detection).
 */
export function hasMigrated(userId: string): boolean {
  if (typeof globalThis === 'undefined') return false;
  const ls = (globalThis as any).localStorage as Storage | undefined;
  if (!ls || typeof ls.getItem !== 'function') return false;
  try {
    return !!ls.getItem(migrationKey(userId));
  } catch {
    return false;
  }
}

/**
 * Marks migration as complete for the given Clerk user on this device.
 * Stores ISO timestamp. Idempotent (writes same shape on second call).
 */
export function setMigrated(userId: string): void {
  if (typeof globalThis === 'undefined') return;
  const ls = (globalThis as any).localStorage as Storage | undefined;
  if (!ls || typeof ls.setItem !== 'function') return;
  try {
    ls.setItem(migrationKey(userId), new Date().toISOString());
  } catch {
    /* ignore quota errors — migration will silently retry next tab */
  }
}

/**
 * V2 hook: removes the migration flag. Useful for a future "Reset" button in
 * the sync menu (not exposed in V1). Safe to call when no flag is set.
 */
export function clearMigrated(userId: string): void {
  if (typeof globalThis === 'undefined') return;
  const ls = (globalThis as any).localStorage as Storage | undefined;
  if (!ls || typeof ls.removeItem !== 'function') return;
  try {
    ls.removeItem(migrationKey(userId));
  } catch {
    /* ignore */
  }
}

/** Exported for tests; production code should use hasMigrated/setMigrated. */
export const MIGRATION_KEY_PREFIX_TEST = MIGRATION_KEY_PREFIX;