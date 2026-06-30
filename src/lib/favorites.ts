/**
 * P2a favorites state layer (pure TS, no DOM).
 *
 * Storage layout (LS key `forgeflowkit:favorites:v1`):
 *   { version: 1, slugs: string[], lastUpdated: ISO-8601 }
 *
 * Semantics:
 *   - Set semantics in-memory; JSON array on disk.
 *   - Most-recently-added at head.
 *   - Hard cap at FAVORITES_MAX_ITEMS (50); quota-full add returns
 *     { added: false } without mutating storage.
 *   - Cross-tab sync handled by `storage` event in init layer; same-tab
 *     sync handled by CustomEvent fanout from this module's subscribe().
 *
 * See spec: docs/superpowers/specs/2026-06-30-p2-localstorage-favorites-design.md
 */

export const FAVORITES_STORAGE_KEY = 'forgeflowkit:favorites:v1';
export const FAVORITES_MAX_ITEMS = 50;

export class FavoritesUnavailableError extends Error {
  constructor(msg = 'localStorage is not available') { super(msg); this.name = 'FavoritesUnavailableError'; }
}
export class QuotaExceededError extends Error {
  constructor(msg = 'localStorage quota exceeded') { super(msg); this.name = 'QuotaExceededError'; }
}
export class SchemaMismatchError extends Error {
  constructor(msg = 'Favorites schema version mismatch') { super(msg); this.name = 'SchemaMismatchError'; }
}

// ----- Availability probe (cached at module load) -----

let _available: boolean | null = null;

function probe(): boolean {
  try {
    if (typeof globalThis === 'undefined' || !(globalThis as any).localStorage) return false;
    const ls = (globalThis as any).localStorage;
    const k = '__fav_probe__';
    ls.setItem(k, '1');
    ls.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function isAvailable(): boolean {
  if (_available === null) _available = probe();
  return _available;
}

// ----- Subscribe (same-tab fanout) -----

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function notify(): void {
  for (const cb of listeners) {
    try { cb(); } catch { /* isolate listener failures */ }
  }
}

// ----- Core read / write -----

interface EnvelopeV1 { version: 1; slugs: string[]; lastUpdated: string; }

function nowIso(): string { return new Date().toISOString(); }

export function read(): string[] {
  if (!isAvailable()) return [];
  let raw: string | null;
  try { raw = (globalThis as any).localStorage.getItem(FAVORITES_STORAGE_KEY); }
  catch { return []; }
  if (!raw) return [];
  let parsed: any;
  try { parsed = JSON.parse(raw); } catch { return []; }
  if (!parsed || parsed.version !== 1) return [];
  if (!Array.isArray(parsed.slugs)) return [];
  return parsed.slugs.filter((s: unknown): s is string => typeof s === 'string');
}

export function write(slugs: string[]): void {
  if (!isAvailable()) throw new FavoritesUnavailableError();
  const envelope: EnvelopeV1 = { version: 1, slugs, lastUpdated: nowIso() };
  try {
    (globalThis as any).localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(envelope));
  } catch (e: any) {
    if (e && (e.name === 'QuotaExceededError' || /quota/i.test(String(e.message)))) {
      throw new QuotaExceededError();
    }
    throw e;
  }
  notify();
}

// ----- Toggle / has -----

export function toggle(slug: string): { added: boolean; slugs: string[] } {
  const current = read();
  const idx = current.indexOf(slug);
  if (idx >= 0) {
    const next = [...current.slice(0, idx), ...current.slice(idx + 1)];
    write(next);
    return { added: false, slugs: next };
  }
  // Not present: add at head, but enforce MAX_ITEMS.
  // Throwing QuotaExceededError (vs silently returning {added:false}) lets the
  // init layer show a translated tooltip + visual feedback to the user.
  if (current.length >= FAVORITES_MAX_ITEMS) {
    throw new QuotaExceededError(`Maximum of ${FAVORITES_MAX_ITEMS} favorites reached`);
  }
  const next = [slug, ...current];
  write(next);
  return { added: true, slugs: next };
}

export function has(slug: string): boolean {
  return read().includes(slug);
}
