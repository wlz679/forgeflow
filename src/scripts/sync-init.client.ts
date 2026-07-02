/**
 * P3-2 sync browser lifecycle.
 *
 * Wires P2 LS subscribe events to debounced cloud push.
 * Wires Clerk auth resolution to one-time cloud pull.
 * Wires visibilitychange to sendBeacon flush.
 *
 * Wires the Header sync menu UI (data-sync-* elements):
 *   - sync now → syncNow()
 *   - export JSON → exportAll() → blob download
 *   - delete cloud data → deleteCloudData() (after confirm)
 *
 * P3-1 self-call pattern: self-invokes startSync() at EOF (P3-1 Task 4 lesson).
 * Uses P3-1 getClerkInstance() to read user identity without modifying P3-1 code.
 *
 * Polls getClerkInstance() every 1s for first 5s after page load to detect
 * auth resolution (P3-1 has no onAuthResolved event emitter; we don't add one
 * to keep P3-1 0 lines changed). Also re-runs wireSyncMenu() if the user
 * wasn't signed in at initial load and later signs in (page-not-closed case).
 */
import { subscribe as subscribeFavorites } from '../lib/favorites';
import { subscribe as subscribeRecent } from '../lib/recent';
import { subscribe as subscribeHistory } from '../lib/history';
import { getClerkInstance } from './clerk-init.client';
import { maybeMigrate } from './migration.client.ts';
import {
  pushCollection,
  pullCollection,
  syncNow,
  exportAll,
  deleteCloudData,
  mergeFavorites,
  mergeRecent,
  mergeHistory,
  readLSEnvelope,
  writeLSEnvelope,
  setLastSyncedAt,
  getLastSyncedAt,
  type Collection,
  type FavoritesPayload,
  type RecentPayload,
  type HistoryPayload,
} from '../lib/sync';
import { translations, type Lang } from '../i18n/translations';

const DEBOUNCE_MS = 5000;
const POLL_FOR_AUTH_MS = 5000;
const POLL_INTERVAL_MS = 1000;
const LAST_PUSHED_KEY_PREFIX = 'forgeflowkit:sync-last-pushed:';
const SESSION_PULL_KEY = 'sync:did-pull-once';

const pendingPushes: Set<Collection> = new Set();
let debounceTimer: number | null = null;
let authPollTimer: number | null = null;
let visibilityHandlerInstalled = false;
let syncMenuWired = false;
let lastLastSyncedAt: string | null = null;

// ----- i18n helpers (browser-side) -----

function getLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  const m = /^\/(en|zh)(\/|$)/.exec(window.location.pathname);
  return (m?.[1] as Lang) || 'en';
}

function t(key: string, vars?: Record<string, string>): string {
  const entry = translations[key];
  if (!entry) return key;
  let text = entry[getLang()];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}

function formatLastSynced(iso: string | null): string {
  if (!iso) return t('sync.menu.lastSyncedNever');
  // Use a short, locale-agnostic format: YYYY-MM-DD HH:MM (UTC)
  const d = new Date(iso);
  if (isNaN(d.getTime())) return t('sync.menu.lastSyncedNever');
  const pad = (n: number) => String(n).padStart(2, '0');
  const ts = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
  return t('sync.menu.lastSynced', { time: ts });
}

function refreshLastSyncedLabel(): void {
  if (typeof document === 'undefined') return;
  const el = document.querySelector<HTMLElement>('[data-sync-last]');
  if (!el) return;
  const iso = getLastSyncedAt() ?? lastLastSyncedAt;
  el.textContent = formatLastSynced(iso);
}

// ----- Push / pull core -----

function armDebounce(): void {
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    void flushPending();
  }, DEBOUNCE_MS);
}

function queuePush(collection: Collection): void {
  pendingPushes.add(collection);
  armDebounce();
}

async function flushPending(): Promise<void> {
  const userId = getClerkInstance()?.user?.id;
  if (!userId) return;
  if (pendingPushes.size === 0) return;
  const collections = Array.from(pendingPushes);
  pendingPushes.clear();
  debounceTimer = null;
  for (const col of collections) {
    const payload = readLSEnvelope(col);
    if (!payload) continue;
    try {
      await pushCollection(userId, col, payload);
      try { localStorage.setItem(LAST_PUSHED_KEY_PREFIX + col, new Date().toISOString()); } catch { /* ignore */ }
    } catch {
      // Re-queue on failure so next debounce/visibilitychange retries.
      pendingPushes.add(col);
      armDebounce();
    }
  }
  setLastSyncedAt(new Date().toISOString());
  lastLastSyncedAt = new Date().toISOString();
  refreshLastSyncedLabel();
}

async function pullAndMerge(userId: string): Promise<void> {
  const favorites = await pullCollection(userId, 'favorites') as FavoritesPayload | null;
  const recent = await pullCollection(userId, 'recent') as RecentPayload | null;
  const history = await pullCollection(userId, 'history') as HistoryPayload | null;

  const favLS = readLSEnvelope('favorites') as FavoritesPayload | null;
  const recLS = readLSEnvelope('recent') as RecentPayload | null;
  const histLS = readLSEnvelope('history') as HistoryPayload | null;

  const favMerged = mergeFavorites(favLS, favorites);
  const recMerged = mergeRecent(recLS, recent);
  const histMerged = mergeHistory(histLS, history);

  writeLSEnvelope('favorites', favMerged);
  writeLSEnvelope('recent', recMerged);
  writeLSEnvelope('history', histMerged);

  // Push merged back to cloud (ensures cloud has the union).
  await pushCollection(userId, 'favorites', favMerged);
  await pushCollection(userId, 'recent', recMerged);
  await pushCollection(userId, 'history', histMerged);
  setLastSyncedAt(new Date().toISOString());
  lastLastSyncedAt = new Date().toISOString();
  refreshLastSyncedLabel();
}

function installVisibilityFlush(): void {
  if (visibilityHandlerInstalled) return;
  visibilityHandlerInstalled = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // Use sendBeacon if available (survives page close); fall back to async flush.
      const userId = getClerkInstance()?.user?.id;
      if (userId && pendingPushes.size > 0 && navigator.sendBeacon) {
        // sendBeacon doesn't support custom headers (Supabase needs apikey).
        // Fall back to async flush; the page may close before completion, but LS is already written.
        void flushPending();
      } else {
        void flushPending();
      }
    }
  });
}

// ----- Sync menu UI wiring -----

/**
 * Trigger a Blob download in the browser. Pure browser-side helper.
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so the download commit lands before we free the object URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Bind Header sync menu (data-sync-menu/now/last/export/delete) to sync.ts
 * operations. Idempotent — only wires once per page load. Only meaningful
 * when the user is signed in; safe to call either way (guards on userId).
 */
export function wireSyncMenu(): void {
  if (typeof document === 'undefined') return;
  if (syncMenuWired) return;
  const menu = document.querySelector<HTMLElement>('[data-sync-menu]');
  if (!menu) return;
  // Only keep the menu enabled when Clerk has a signed-in user.
  const clerk = getClerkInstance();
  if (!clerk?.user) return;

  syncMenuWired = true;
  menu.removeAttribute('hidden');
  refreshLastSyncedLabel();

  const nowBtn = document.querySelector<HTMLButtonElement>('[data-sync-now]');
  const exportBtn = document.querySelector<HTMLButtonElement>('[data-sync-export]');
  const deleteBtn = document.querySelector<HTMLButtonElement>('[data-sync-delete]');

  if (nowBtn) {
    nowBtn.addEventListener('click', () => {
      const userId = getClerkInstance()?.user?.id;
      if (!userId) return;
      void (async () => {
        try {
          const result = await syncNow(userId);
          setLastSyncedAt(new Date().toISOString());
          lastLastSyncedAt = new Date().toISOString();
          refreshLastSyncedLabel();
          // Pulled/pushed counts useful for debugging — kept unobtrusive.
          // eslint-disable-next-line no-console
          console.info('[sync] manual syncNow', result);
        } catch (err) {
          console.error('[sync] syncNow failed', err);
        }
      })();
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const userId = getClerkInstance()?.user?.id;
      if (!userId) return;
      void (async () => {
        try {
          const blob = await exportAll(userId);
          downloadBlob(blob, `forgeflowkit-sync-${new Date().toISOString().slice(0, 10)}.json`);
        } catch (err) {
          console.error('[sync] exportAll failed', err);
        }
      })();
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      const userId = getClerkInstance()?.user?.id;
      if (!userId) return;
      const msg = t('sync.menu.confirmDelete');
      if (typeof window.confirm === 'undefined') return;
      if (!window.confirm(msg)) return;
      void (async () => {
        try {
          await deleteCloudData(userId);
          setLastSyncedAt(new Date().toISOString());
          lastLastSyncedAt = new Date().toISOString();
          refreshLastSyncedLabel();
          console.info('[sync] cloud data deleted');
        } catch (err) {
          console.error('[sync] deleteCloudData failed', err);
        }
      })();
    });
  }
}

export function startSync(): void {
  // Wire P2 layer subscribe → queue push.
  subscribeFavorites(() => queuePush('favorites'));
  subscribeRecent(() => queuePush('recent'));
  subscribeHistory(() => queuePush('history'));
  installVisibilityFlush();
}

function pollForAuthAndPull(): void {
  let elapsed = 0;
  const tick = (): void => {
    const clerk = getClerkInstance();
    if (clerk?.user) {
      // Delegate to migration.client.maybeMigrate which checks BOTH the
      // per-tab sessionStorage guard AND the per-device per-user LS flag
      // (forgeflowkit:migration:{userId}). Sets both flags on success.
      void maybeMigrate(clerk.user.id).catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[sync] maybeMigrate failed', err);
      });
      // Wire Header sync menu now that we have a user identity.
      wireSyncMenu();
      if (authPollTimer !== null) { clearInterval(authPollTimer); authPollTimer = null; }
      return;
    }
    elapsed += POLL_INTERVAL_MS;
    if (elapsed >= POLL_FOR_AUTH_MS) {
      if (authPollTimer !== null) { clearInterval(authPollTimer); authPollTimer = null; }
    }
  };
  authPollTimer = window.setInterval(tick, POLL_INTERVAL_MS);
  tick();
}

// P3-1 self-call pattern (P3-1 Task 4 lesson — Vite tree-shakes unused exports).
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      startSync();
      pollForAuthAndPull();
    });
  } else {
    startSync();
    pollForAuthAndPull();
  }
}

export { pullAndMerge, flushPending };
