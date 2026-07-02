/**
 * P3-2 sync core: pure merge functions + I/O wrappers.
 *
 * Merge rules (per spec §5.2.2, §5.3.6):
 *   - favorites: set union, cap 50, dedup by slug
 *   - recent: timestamp top-N, cap 20, same slug → newer visitedAt wins
 *   - history: id-based union, cap 100 by accessedAt, same id → newer wins
 *
 * I/O wrappers accept `fetchImpl` for unit testing without real Supabase.
 *
 * Env source: dual-source (import.meta.env primary, process.env fallback).
 * Mirrors `src/lib/supabase-env.ts`'s hasSupabaseEnv() — needed because
 * tsx tests don't see Astro's import.meta.env replacements.
 */

import { FAVORITES_STORAGE_KEY } from './favorites.ts';
import { RECENT_STORAGE_KEY } from './recent.ts';
import { HISTORY_STORAGE_KEY } from './history.ts';

export const FAVORITES_MAX_ITEMS = 50;
export const RECENT_MAX_ITEMS = 20;
export const HISTORY_MAX_ITEMS = 100;
export const SCHEMA_VERSION = 1;

export type Collection = 'favorites' | 'recent' | 'history';

export interface FavoritesPayload {
  version: 1;
  slugs: string[];
  lastUpdated: string;
}

export interface RecentEntry {
  slug: string;
  visitedAt: string;
}
export interface RecentPayload {
  version: 1;
  entries: RecentEntry[];
  lastUpdated: string;
}

export interface HistoryEntry {
  id: string;
  slug: string;
  inputs: Record<string, string>;
  result: string;
  savedAt: string;
  accessedAt: string;
}
export interface HistoryPayload {
  version: 1;
  entries: HistoryEntry[];
  lastUpdated: string;
}

export type SyncPayload = FavoritesPayload | RecentPayload | HistoryPayload;

export type SyncStatus = 'idle' | 'pushing' | 'pulling' | 'error';

// ===== Pure merge functions =====

export function mergeFavorites(ls: FavoritesPayload | null, cloud: FavoritesPayload | null): FavoritesPayload {
  const lsSlugs = ls?.slugs ?? [];
  const cloudSlugs = cloud?.slugs ?? [];
  const lsUnique = Array.from(new Set(lsSlugs));
  const cloudUnique = Array.from(new Set(cloudSlugs));
  const allUnique = Array.from(new Set([...lsUnique, ...cloudUnique]));
  const lastUpdated = maxIso(ls?.lastUpdated, cloud?.lastUpdated);
  if (allUnique.length <= FAVORITES_MAX_ITEMS) {
    return { version: SCHEMA_VERSION, slugs: allUnique, lastUpdated };
  }
  // Cap exceeded: drop from older source. Per spec §5.2.2 — "drop oldest by lastUpdated if any tie".
  // Tie-break: LS wins (preserves local-first intent; matches spec "Cloud stale (LS newer) → LS wins").
  const lsNewer = (ls?.lastUpdated ?? '') >= (cloud?.lastUpdated ?? '');
  const primary = lsNewer ? lsUnique : cloudUnique;
  const secondary = lsNewer ? cloudUnique : lsUnique;
  const primarySet = new Set(primary);
  const result: string[] = [...primary];
  for (const s of secondary) {
    if (result.length >= FAVORITES_MAX_ITEMS) break;
    if (!primarySet.has(s)) result.push(s);
  }
  return { version: SCHEMA_VERSION, slugs: result, lastUpdated };
}

export function mergeRecent(ls: RecentPayload | null, cloud: RecentPayload | null): RecentPayload {
  const map = new Map<string, RecentEntry>();
  for (const e of ls?.entries ?? []) map.set(e.slug, e);
  for (const e of cloud?.entries ?? []) {
    const existing = map.get(e.slug);
    if (!existing || e.visitedAt > existing.visitedAt) map.set(e.slug, e);
  }
  const sorted = Array.from(map.values()).sort((a, b) => b.visitedAt.localeCompare(a.visitedAt));
  return {
    version: SCHEMA_VERSION,
    entries: sorted.slice(0, RECENT_MAX_ITEMS),
    lastUpdated: maxIso(ls?.lastUpdated, cloud?.lastUpdated),
  };
}

export function mergeHistory(ls: HistoryPayload | null, cloud: HistoryPayload | null): HistoryPayload {
  const map = new Map<string, HistoryEntry>();
  for (const e of ls?.entries ?? []) map.set(e.id, e);
  for (const e of cloud?.entries ?? []) {
    const existing = map.get(e.id);
    if (!existing || e.accessedAt > existing.accessedAt) map.set(e.id, e);
  }
  const sorted = Array.from(map.values()).sort((a, b) => b.accessedAt.localeCompare(a.accessedAt));
  return {
    version: SCHEMA_VERSION,
    entries: sorted.slice(0, HISTORY_MAX_ITEMS),
    lastUpdated: maxIso(ls?.lastUpdated, cloud?.lastUpdated),
  };
}

function maxIso(a: string | undefined, b: string | undefined): string {
  if (!a) return b ?? new Date().toISOString();
  if (!b) return a;
  return a > b ? a : b;
}

// ===== LS envelope readers (P2 layer is frozen — duplicate minimal parse logic here) =====

export function readLSEnvelope(collection: Collection): SyncPayload | null {
  if (typeof globalThis === 'undefined' || !(globalThis as any).localStorage) return null;
  const ls = (globalThis as any).localStorage;
  const key = collection === 'favorites' ? FAVORITES_STORAGE_KEY :
              collection === 'recent' ? RECENT_STORAGE_KEY :
              HISTORY_STORAGE_KEY;
  const raw = ls.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLSEnvelope(collection: Collection, payload: SyncPayload): void {
  if (typeof globalThis === 'undefined' || !(globalThis as any).localStorage) return;
  const ls = (globalThis as any).localStorage;
  const key = collection === 'favorites' ? FAVORITES_STORAGE_KEY :
              collection === 'recent' ? RECENT_STORAGE_KEY :
              HISTORY_STORAGE_KEY;
  ls.setItem(key, JSON.stringify(payload));
}

// ===== Supabase config (dual-source: import.meta.env primary, process.env fallback) =====

function getSupabaseConfig(): { url: string; key: string } | null {
  const fromUrlMeta = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
  const fromKeyMeta = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;
  const fromUrlProc = (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || undefined;
  const fromKeyProc = (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || undefined;
  const url = fromUrlMeta ?? fromUrlProc;
  const key = fromKeyMeta ?? fromKeyProc;
  if (!url || !key) return null;
  if (url.includes('REPLACE_ME') || key.includes('REPLACE_ME')) return null;
  return { url, key };
}

function tableName(collection: Collection): string {
  return collection === 'favorites' ? 'user_favorites' :
         collection === 'recent' ? 'user_recent' :
         'user_history';
}

// ===== I/O wrappers =====

export async function pushCollection(
  userId: string,
  collection: Collection,
  payload: SyncPayload,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  const config = getSupabaseConfig();
  if (!config) throw new Error('Supabase env not configured');
  const table = tableName(collection);
  const url = `${config.url}/rest/v1/${table}?on_conflict=clerk_user_id`;
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: {
      'apikey': config.key,
      'Authorization': `Bearer ${config.key}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      clerk_user_id: userId,
      payload,
      last_updated: new Date().toISOString(),
    }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new SyncAuthError('Supabase returned 401');
    if (res.status === 403) throw new SyncForbiddenError('Supabase returned 403');
    throw new Error(`Supabase push failed: ${res.status}`);
  }
}

export async function pullCollection(
  userId: string,
  collection: Collection,
  fetchImpl: typeof fetch = fetch
): Promise<SyncPayload | null> {
  const config = getSupabaseConfig();
  if (!config) throw new Error('Supabase env not configured');
  const table = tableName(collection);
  const url = `${config.url}/rest/v1/${table}?clerk_user_id=eq.${encodeURIComponent(userId)}`;
  const res = await fetchImpl(url, {
    method: 'GET',
    headers: {
      'apikey': config.key,
      'Authorization': `Bearer ${config.key}`,
    },
  });
  if (!res.ok) {
    if (res.status === 401) throw new SyncAuthError('Supabase returned 401');
    throw new Error(`Supabase pull failed: ${res.status}`);
  }
  const rows = await res.json() as Array<{ payload: SyncPayload }>;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0].payload;
}

export class SyncAuthError extends Error { constructor(m: string) { super(m); this.name = 'SyncAuthError'; } }
export class SyncForbiddenError extends Error { constructor(m: string) { super(m); this.name = 'SyncForbiddenError'; } }

// ===== Status pub/sub =====

const statusListeners = new Set<(s: SyncStatus) => void>();
let currentStatus: SyncStatus = 'idle';
export function getSyncStatus(): SyncStatus { return currentStatus; }
export function onSyncStatus(cb: (s: SyncStatus) => void): () => void {
  statusListeners.add(cb);
  return () => { statusListeners.delete(cb); };
}
function emitStatus(s: SyncStatus): void {
  currentStatus = s;
  for (const cb of statusListeners) { try { cb(s); } catch { /* isolate */ } }
}

// ===== High-level operations =====

export async function syncNow(userId: string, fetchImpl?: typeof fetch): Promise<{pushed: number; pulled: number}> {
  emitStatus('pulling');
  const collections: Collection[] = ['favorites', 'recent', 'history'];
  let pushed = 0;
  let pulled = 0;
  try {
    for (const col of collections) {
      const cloud = await pullCollection(userId, col, fetchImpl);
      if (cloud !== null) pulled++;
      const ls = readLSEnvelope(col);
      const merged = col === 'favorites' ? mergeFavorites(ls as FavoritesPayload | null, cloud as FavoritesPayload | null) :
                     col === 'recent' ? mergeRecent(ls as RecentPayload | null, cloud as RecentPayload | null) :
                     mergeHistory(ls as HistoryPayload | null, cloud as HistoryPayload | null);
      writeLSEnvelope(col, merged);
      await pushCollection(userId, col, merged, fetchImpl);
      pushed++;
    }
    emitStatus('idle');
    return { pushed, pulled };
  } catch (e) {
    emitStatus('error');
    throw e;
  }
}

export async function exportAll(userId: string, fetchImpl?: typeof fetch): Promise<Blob> {
  const favorites = await pullCollection(userId, 'favorites', fetchImpl);
  const recent = await pullCollection(userId, 'recent', fetchImpl);
  const history = await pullCollection(userId, 'history', fetchImpl);
  const json = JSON.stringify({
    exportedAt: new Date().toISOString(),
    userId,
    favorites,
    recent,
    history,
  }, null, 2);
  return new Blob([json], { type: 'application/json' });
}

export async function deleteCloudData(userId: string, fetchImpl: typeof fetch = fetch): Promise<void> {
  const config = getSupabaseConfig();
  if (!config) throw new Error('Supabase env not configured');
  const collections: Collection[] = ['favorites', 'recent', 'history'];
  await Promise.all(collections.map(async col => {
    const table = tableName(col);
    const url = `${config.url}/rest/v1/${table}?clerk_user_id=eq.${encodeURIComponent(userId)}`;
    const res = await fetchImpl(url, {
      method: 'DELETE',
      headers: {
        'apikey': config.key,
        'Authorization': `Bearer ${config.key}`,
      },
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`Supabase delete failed for ${col}: ${res.status}`);
    }
  }));
}

const LAST_SYNCED_KEY = 'forgeflowkit:sync-last-synced';
export function getLastSyncedAt(): string | null {
  if (typeof globalThis === 'undefined' || !(globalThis as any).localStorage) return null;
  return (globalThis as any).localStorage.getItem(LAST_SYNCED_KEY);
}
export function setLastSyncedAt(iso: string): void {
  if (typeof globalThis === 'undefined' || !(globalThis as any).localStorage) return;
  (globalThis as any).localStorage.setItem(LAST_SYNCED_KEY, iso);
}
