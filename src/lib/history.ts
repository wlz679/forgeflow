/**
 * P2c history-snapshots state management.
 * LRU: restore(id) re-visits move to top + update accessedAt.
 * Schema: { version: 1, entries: [{id, slug, inputs, result, savedAt, accessedAt}], lastUpdated }
 * Pure TS, no DOM. Module-level subscribers for same-tab fanout.
 * Base64-encoded URL prefill for cross-page restore.
 */

export const HISTORY_STORAGE_KEY = 'forgeflowkit:history:v1';
export const HISTORY_MAX_ITEMS = 100;

export interface HistoryEntry {
  id: string;
  slug: string;
  inputs: Record<string, string>;
  result: string;
  savedAt: string;
  accessedAt: string;
}

interface HistoryStoreV1 {
  version: 1;
  entries: HistoryEntry[];
  lastUpdated: string;
}

export class HistoryUnavailableError extends Error {
  constructor(m: string = 'localStorage unavailable') { super(m); this.name = 'HistoryUnavailableError'; }
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
export class PrefillDecodeError extends Error {
  constructor(m: string = 'prefill decode failed') { super(m); this.name = 'PrefillDecodeError'; }
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

function generateId(): string {
  // crypto.randomUUID() is available in modern browsers and Node 19+
  try {
    return (globalThis as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  } catch {
    return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function isAvailable(): boolean {
  if (availabilityCache !== null) return availabilityCache;
  const ls = getLS();
  if (!ls) { availabilityCache = false; return false; }
  try {
    const probeKey = '__history_probe__';
    ls.setItem(probeKey, '1');
    ls.removeItem(probeKey);
    availabilityCache = true;
  } catch { availabilityCache = false; }
  return availabilityCache;
}

function notify(): void {
  for (const cb of subscribers) {
    try { cb(); } catch { /* swallow */ }
  }
}

export function read(): HistoryEntry[] {
  const ls = getLS();
  if (!ls) return [];
  const raw = ls.getItem(HISTORY_STORAGE_KEY);
  if (raw === null) return [];
  let parsed: HistoryStoreV1 | { version: number; entries?: unknown };
  try { parsed = JSON.parse(raw); } catch { return []; }
  if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) return [];
  if (!Array.isArray(parsed.entries)) return [];
  return parsed.entries.filter((e): e is HistoryEntry =>
    typeof e === 'object' && e !== null &&
    typeof (e as HistoryEntry).id === 'string' &&
    typeof (e as HistoryEntry).slug === 'string' &&
    typeof (e as HistoryEntry).savedAt === 'string'
  );
}

export function write(entries: HistoryEntry[]): void {
  const ls = getLS();
  if (!ls) throw new HistoryUnavailableError();
  const store: HistoryStoreV1 = {
    version: 1,
    entries: entries.slice(0, HISTORY_MAX_ITEMS),
    lastUpdated: new Date().toISOString(),
  };
  try {
    ls.setItem(HISTORY_STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    const name = (e as { name?: string })?.name;
    const msg = String((e as { message?: string })?.message ?? '');
    if (name === 'QuotaExceededError' || /quota/i.test(msg)) throw new QuotaExceededError();
    throw e;
  }
  notify();
}

export function save(entry: { slug: string; inputs: Record<string, string>; result: string }): HistoryEntry {
  if (typeof entry.slug !== 'string' || !SLUG_RE.test(entry.slug)) {
    throw new InvalidSlugError(`slug must match /^[a-z0-9-]+$/, got: ${JSON.stringify(entry.slug)}`);
  }
  const now = new Date().toISOString();
  const newEntry: HistoryEntry = {
    id: generateId(),
    slug: entry.slug,
    inputs: entry.inputs,
    result: entry.result,
    savedAt: now,
    accessedAt: now,
  };
  const current = read();
  const next: HistoryEntry[] = [newEntry, ...current].slice(0, HISTORY_MAX_ITEMS);
  write(next);
  return newEntry;
}

export function restore(id: string): HistoryEntry | null {
  const current = read();
  const idx = current.findIndex(e => e.id === id);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  const found = { ...current[idx], accessedAt: now };
  const next = [found, ...current.filter((_, i) => i !== idx)].slice(0, HISTORY_MAX_ITEMS);
  write(next);
  return found;
}

export function remove(id: string): void {
  const current = read();
  const next = current.filter(e => e.id !== id);
  if (next.length === current.length) return;  // no-op
  write(next);
}

export function clearAll(): void {
  write([]);
}

export function has(slug: string): boolean {
  return read().some(e => e.slug === slug);
}

export function subscribe(cb: () => void): () => void {
  subscribers.add(cb);
  return () => { subscribers.delete(cb); };
}

export function encodePrefill(inputs: Record<string, string>): string {
  const json = JSON.stringify(inputs);
  // Use unescape(encodeURIComponent(...)) trick to handle Unicode safely —
  // btoa() throws InvalidCharacterError on non-ASCII bytes (e.g. Chinese chars,
  // currency symbols). The trick: encodeURIComponent → UTF-8 byte string (each
  // byte becomes %XX), then unescape → raw UTF-8 bytes, then btoa accepts them.
  return (globalThis as { btoa?: (s: string) => string }).btoa
    ? (globalThis as { btoa: (s: string) => string }).btoa(unescape(encodeURIComponent(json)))
    : Buffer.from(json, 'utf-8').toString('base64');
}

export function decodePrefill(encoded: string): Record<string, string> | null {
  try {
    const json = (globalThis as { atob?: (s: string) => string }).atob
      ? (globalThis as { atob: (s: string) => string }).atob(encoded)
      : Buffer.from(encoded, 'base64').toString('utf-8');
    // Reverse of encodeURIComponent(unescape(...)) trick: decodeURIComponent(escape(...))
    // reinterprets raw UTF-8 bytes as %XX escape sequences.
    const parsed = JSON.parse(decodeURIComponent(escape(json)));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    return parsed as Record<string, string>;
  } catch {
    return null;
  }
}
