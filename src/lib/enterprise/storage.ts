/**
 * Enterprise feature localStorage layer (Phase 5-A).
 *
 * Storage envelope shape: { schemaVersion: 1, data: T }
 * All operations are safe — failures return fallback / false, never throw.
 *
 * 3 independent keys per spec §1.2:
 *   - ffk.scenarios.v1   (A1 Saved Scenarios, max 50 items)
 *   - ffk.templates.v1   (A2 Decision Templates, max 20 items)
 *   - ffk.reportConfig.v1 (A3 last-used report config, 1 item)
 *
 * Why safe wrappers: spec §4.1 lists 7 error categories (E1-E7). Any
 * failure (disabled storage / quota / corruption / version drift) must
 * degrade gracefully — never crash the page.
 */

import { migrateEnvelope } from './migration.ts';

export const STORAGE_KEYS = {
  scenarios: 'ffk.scenarios.v1',
  templates: 'ffk.templates.v1',
  reportConfig: 'ffk.reportConfig.v1',
} as const;

export function safeStorageGet<T>(key: string, fallback: T): T {
  try {
    const ls = (globalThis as any).localStorage;
    if (!ls) return fallback;
    const raw = ls.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    const parsed = JSON.parse(raw);
    return migrateEnvelope<T>(parsed, fallback);
  } catch (err) {
    console.warn(`[enterprise/storage] get ${key} failed:`, err);
    return fallback;
  }
}

export function safeStorageSet(key: string, value: unknown): boolean {
  try {
    const ls = (globalThis as any).localStorage;
    if (!ls) return false;
    const envelope = { schemaVersion: 1, data: value };
    ls.setItem(key, JSON.stringify(envelope));
    return true;
  } catch (err) {
    console.error(`[enterprise/storage] set ${key} failed:`, err);
    return false;
  }
}

export function safeStorageDelete(key: string): boolean {
  try {
    const ls = (globalThis as any).localStorage;
    if (!ls) return false;
    ls.removeItem(key);
    return true;
  } catch (err) {
    console.warn(`[enterprise/storage] delete ${key} failed:`, err);
    return false;
  }
}
