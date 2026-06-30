/**
 * P2b recent-viewed state management.
 * LRU: recordVisit(slug) re-visits move to top + update timestamp.
 * Schema: { version: 1, entries: [{slug, visitedAt}], lastUpdated }
 * Pure TS, no DOM. Module-level subscribers for same-tab fanout.
 */

export const RECENT_STORAGE_KEY = 'forgeflowkit:recent:v1';
export const RECENT_MAX_ITEMS = 20;

export interface RecentEntry {
  slug: string;
  visitedAt: string;
}

interface RecentStoreV1 {
  version: 1;
  entries: RecentEntry[];
  lastUpdated: string;
}

export class RecentUnavailableError extends Error {
  constructor(m: string = 'localStorage unavailable') { super(m); this.name = 'RecentUnavailableError'; }
}
export class QuotaExceededError extends Error {
  constructor(m: string = 'localStorage quota exceeded') { super(m); this.name = 'QuotaExceededError'; }
}
export class SchemaMismatchError extends Error {
  constructor(m: string = 'schema version mismatch') { super(m); this.name = 'SchemaMismatchError'; }
}
export class InvalidSlugError extends Error {
  constructor(m: string = 'invalid slug') { super(m); this.name = 'InvalidSlugError'; }
}

const SLUG_RE = /^[a-z0-9-]+$/;
const subscribers = new Set<() => void>();
let availabilityCache: boolean | null = null;

function getLS(): Storage | null {
  try {
    if (typeof globalThis !== 'undefined' && (globalThis as { localStorage?: Storage }).localStorage) {
      return (globalThis as { localStorage: Storage }).localStorage;
    }
  } catch { /* noop */ }
  return null;
}

export function isAvailable(): boolean {
  if (availabilityCache !== null) return availabilityCache;
  const ls = getLS();
  if (!ls) { availabilityCache = false; return false; }
  try {
    const probeKey = '__recent_probe__';
    ls.setItem(probeKey, '1');
    ls.removeItem(probeKey);
    availabilityCache = true;
  } catch { availabilityCache = false; }
  return availabilityCache;
}

export function read(): RecentEntry[] {
  const ls = getLS();
  if (!ls) return [];
  const raw = ls.getItem(RECENT_STORAGE_KEY);
  if (raw === null) return [];
  let parsed: RecentStoreV1 | { version: number; entries?: unknown };
  try { parsed = JSON.parse(raw); } catch { return []; }
  if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) return [];
  if (!Array.isArray(parsed.entries)) return [];
  return parsed.entries
    .filter((e): e is RecentEntry =>
      typeof e === 'object' && e !== null &&
      typeof (e as RecentEntry).slug === 'string' &&
      typeof (e as RecentEntry).visitedAt === 'string'
    );
}

export function write(entries: RecentEntry[]): void {
  const ls = getLS();
  if (!ls) throw new RecentUnavailableError();
  const store: RecentStoreV1 = {
    version: 1,
    entries: entries.slice(0, RECENT_MAX_ITEMS),
    lastUpdated: new Date().toISOString(),
  };
  try {
    ls.setItem(RECENT_STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    // Match P2a (favorites.ts) QuotaExceededError detection: browser native
    // throws DOMException with name='QuotaExceededError'; some Node shims
    // surface a plain Error with /quota/i message. Accept both forms.
    const name = (e as { name?: string })?.name;
    const msg = String((e as { message?: string })?.message ?? '');
    if (name === 'QuotaExceededError' || /quota/i.test(msg)) throw new QuotaExceededError();
    throw e;
  }
  for (const cb of subscribers) {
    try { cb(); } catch { /* swallow — don't let one bad listener break fanout */ }
  }
}

export function recordVisit(slug: string): void {
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) {
    throw new InvalidSlugError(`slug must match /^[a-z0-9-]+$/, got: ${JSON.stringify(slug)}`);
  }
  const now = new Date().toISOString();
  const current = read();
  const filtered = current.filter(e => e.slug !== slug);
  const next: RecentEntry[] = [{ slug, visitedAt: now }, ...filtered].slice(0, RECENT_MAX_ITEMS);
  write(next);
}

export function has(slug: string): boolean {
  return read().some(e => e.slug === slug);
}

export function subscribe(cb: () => void): () => void {
  subscribers.add(cb);
  return () => { subscribers.delete(cb); };
}