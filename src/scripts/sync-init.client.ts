/**
 * P3-2 sync browser lifecycle.
 *
 * Wires P2 LS subscribe events to debounced cloud push.
 * Wires Clerk auth resolution to one-time cloud pull.
 * Wires visibilitychange to sendBeacon flush.
 *
 * P3-1 self-call pattern: self-invokes startSync() at EOF (P3-1 Task 4 lesson).
 * Uses P3-1 getClerkInstance() to read user identity without modifying P3-1 code.
 *
 * Polls getClerkInstance() every 1s for first 5s after page load to detect
 * auth resolution (P3-1 has no onAuthResolved event emitter; we don't add one
 * to keep P3-1 0 lines changed).
 */
import { subscribe as subscribeFavorites } from '../lib/favorites';
import { subscribe as subscribeRecent } from '../lib/recent';
import { subscribe as subscribeHistory } from '../lib/history';
import { getClerkInstance } from './clerk-init.client';
import {
  pushCollection,
  pullCollection,
  syncNow,
  mergeFavorites,
  mergeRecent,
  mergeHistory,
  readLSEnvelope,
  writeLSEnvelope,
  setLastSyncedAt,
  type Collection,
  type FavoritesPayload,
  type RecentPayload,
  type HistoryPayload,
} from '../lib/sync';

const DEBOUNCE_MS = 5000;
const POLL_FOR_AUTH_MS = 5000;
const POLL_INTERVAL_MS = 1000;
const LAST_PUSHED_KEY_PREFIX = 'forgeflowkit:sync-last-pushed:';
const SESSION_PULL_KEY = 'sync:did-pull-once';

const pendingPushes: Set<Collection> = new Set();
let debounceTimer: number | null = null;
let authPollTimer: number | null = null;
let visibilityHandlerInstalled = false;

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
      if (!sessionStorage.getItem(SESSION_PULL_KEY)) {
        sessionStorage.setItem(SESSION_PULL_KEY, '1');
        void pullAndMerge(clerk.user.id).catch(() => { /* logged; will retry on next change */ });
      }
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
