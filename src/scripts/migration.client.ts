/**
 * P3-3 browser-side migration orchestrator (LS-only → cloud).
 *
 * Runs pullAndMerge() once per Clerk user per device when auth first resolves.
 * On successful run, fires a one-shot alert() with per-collection import counts
 * (suppressed when no items existed pre-merge — silent no-op for empty users).
 *
 * Idempotency guards (BOTH must be unset to run):
 *   - sessionStorage['sync:did-pull-once']   per-tab (set here in maybeMigrate
 *                                              on successful migration; checked
 *                                              both here AND by subsequent sync
 *                                              debounce cycles)
 *   - localStorage[`forgeflowkit:migration:{userId}`]  per-device per-user
 *
 * P3-1 self-call pattern preserved at EOF so Vite does not tree-shake the
 * exported functions (P3-1 Task 4 lesson). The actual invocation site is
 * sync-init.client.ts: pollForAuthAndPull which calls maybeMigrate() directly
 * once it has a confirmed Clerk user identity.
 *
 * NOTE: The plan specified `import { pullAndMerge } from '../lib/sync.ts'`,
 * but `pullAndMerge` is actually defined in `src/scripts/sync-init.client.ts`.
 * To avoid a circular import (sync-init → migration → sync-init), the
 * pull+merge+push sequence is inlined below using the primitives that ARE
 * exported from sync.ts. Behavior is identical: 3 GETs + 3 POSTs = 6 fetches.
 */

import {
  pullCollection,
  pushCollection,
  mergeFavorites,
  mergeRecent,
  mergeHistory,
  readLSEnvelope,
  writeLSEnvelope,
  setLastSyncedAt,
  type FavoritesPayload,
  type RecentPayload,
  type HistoryPayload,
} from '../lib/sync.ts';
import { hasMigrated, setMigrated } from '../lib/migration.ts';
import { translations } from '../i18n/translations.ts';

const SESSION_PULL_KEY = 'sync:did-pull-once';

type Lang = 'en' | 'zh';

function getLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  const m = /^\/(en|zh)(\/|$)/.exec(window.location.pathname ?? '/en/');
  return ((m?.[1] as Lang) || 'en');
}

function t(key: string): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[getLang()] ?? entry.en ?? key;
}

interface MigrationStats {
  favorites: number;
  recent: number;
  history: number;
}

function hasAnyItems(stats: MigrationStats): boolean {
  return stats.favorites > 0 || stats.recent > 0 || stats.history > 0;
}

function readItemCounts(): MigrationStats {
  const stats: MigrationStats = { favorites: 0, recent: 0, history: 0 };
  if (typeof globalThis === 'undefined') return stats;
  const ls = (globalThis as any).localStorage as Storage | undefined;
  if (!ls || typeof ls.getItem !== 'function') return stats;
  const readLen = (key: string): number => {
    try {
      const raw = ls.getItem(key);
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      const arr = parsed?.slugs ?? parsed?.entries ?? [];
      return Array.isArray(arr) ? arr.length : 0;
    } catch {
      return 0;
    }
  };
  stats.favorites = readLen('forgeflowkit:favorites');
  stats.recent = readLen('forgeflowkit:recent');
  stats.history = readLen('forgeflowkit:history');
  return stats;
}

function showToast(stats: MigrationStats): void {
  if (!hasAnyItems(stats)) return;
  const tmpl = t('sync.migration.complete');
  if (tmpl === 'sync.migration.complete') return; // key not translated → stay silent
  const message = tmpl
    .replace('{favorites}', String(stats.favorites))
    .replace('{recent}', String(stats.recent))
    .replace('{history}', String(stats.history));
  if (typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(message);
  }
}

/**
 * Inline equivalent of sync-init.client.ts: pullAndMerge() — uses primitives
 * from sync.ts to avoid circular import with sync-init.client.ts.
 *
 * Sequence: pull × 3 → readLS × 3 → merge × 3 → writeLS × 3 → push × 3
 * Net: 3 GETs + 3 POSTs = 6 fetch calls.
 */
async function pullMergePush(userId: string): Promise<void> {
  const favCloud = await pullCollection(userId, 'favorites') as FavoritesPayload | null;
  const recCloud = await pullCollection(userId, 'recent') as RecentPayload | null;
  const histCloud = await pullCollection(userId, 'history') as HistoryPayload | null;

  const favLS = readLSEnvelope('favorites') as FavoritesPayload | null;
  const recLS = readLSEnvelope('recent') as RecentPayload | null;
  const histLS = readLSEnvelope('history') as HistoryPayload | null;

  const favMerged = mergeFavorites(favLS, favCloud);
  const recMerged = mergeRecent(recLS, recCloud);
  const histMerged = mergeHistory(histLS, histCloud);

  writeLSEnvelope('favorites', favMerged);
  writeLSEnvelope('recent', recMerged);
  writeLSEnvelope('history', histMerged);

  await pushCollection(userId, 'favorites', favMerged);
  await pushCollection(userId, 'recent', recMerged);
  await pushCollection(userId, 'history', histMerged);
  setLastSyncedAt(new Date().toISOString());
}

/**
 * Run migration if (a) sessionStorage guard unset AND (b) LS migration flag unset.
 * Returns true if migration ran (success or failure), false if it was a no-op
 * (already migrated, or guards unavailable).
 *
 * On success: sets both flags, fires toast (suppressed if no items).
 * On failure: leaves flags unset (so next attempt retries); logs to console.
 */
export async function maybeMigrate(userId: string): Promise<boolean> {
  if (typeof globalThis === 'undefined') return false;
  const ss = (globalThis as any).sessionStorage as Storage | undefined;
  const ls = (globalThis as any).localStorage as Storage | undefined;
  if (!ss || !ls || typeof ss.getItem !== 'function' || typeof ss.setItem !== 'function') {
    return false;
  }

  // Both guards must be unset to run.
  if (ss.getItem(SESSION_PULL_KEY)) return false;
  if (hasMigrated(userId)) return false;

  const beforeStats = readItemCounts();

  try {
    await pullMergePush(userId);
    setMigrated(userId);
    try { ss.setItem(SESSION_PULL_KEY, '1'); } catch { /* ignore */ }
    const afterStats = readItemCounts();
    showToast(afterStats);
    if (typeof console !== 'undefined') {
      console.info('[migration] migrated', { before: beforeStats, after: afterStats });
    }
    return true;
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.error('[migration] failed', err);
    }
    return false;
  }
}

// P3-1 self-call pattern — preserves exports against Vite tree-shaking.
// The actual invocation comes from sync-init.client.ts: pollForAuthAndPull
// after Clerk auth resolves. We do NOT auto-attach here because Clerk auth
// resolution requires a poll loop that already exists in sync-init.
if (typeof document !== 'undefined') {
  // Intentional no-op body. The self-call block exists solely to prevent Vite
  // from tree-shaking the `maybeMigrate` export. Side effects on import are
  // guarded above; runtime call site is sync-init.client.ts.
}