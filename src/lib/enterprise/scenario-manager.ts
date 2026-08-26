/**
 * A1 Saved Scenarios manager.
 *
 * Per spec §1.2 / §3.5:
 *   - Key: ffk.scenarios.v1
 *   - Max 50 items (warn at 40)
 *   - Sorted by updatedAt desc when listed
 *   - Filtered by exact calcSlug (no fuzzy match)
 */

import { safeStorageGet, safeStorageSet, STORAGE_KEYS } from './storage.ts';

export const SCENARIOS_MAX = 50;
export const SCENARIOS_WARN_AT = 40;

export interface StoredScenario {
  id: string;
  calcSlug: string;
  label: string;
  notes?: string;
  inputs: Record<string, number | string>;
  outputs: Record<string, number | string>;
  schemaVersion: 1;
  createdAt: string;
  updatedAt: string;
}

function uuid(): string {
  // crypto.randomUUID available in all modern browsers + Node 19+
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'sc-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export type SaveResult =
  | { ok: true; scenario: StoredScenario }
  | { ok: false; reason: 'quota' | 'invalid' };

export function saveScenario(input: {
  calcSlug: string;
  label: string;
  notes?: string;
  inputs: Record<string, number | string>;
  outputs: Record<string, number | string>;
}): SaveResult {
  if (!input.calcSlug || !input.label || input.label.length > 50) {
    return { ok: false, reason: 'invalid' };
  }
  const list = safeStorageGet<StoredScenario[]>(STORAGE_KEYS.scenarios, []);
  if (list.length >= SCENARIOS_MAX) {
    return { ok: false, reason: 'quota' };
  }
  const now = new Date().toISOString();
  const scenario: StoredScenario = {
    id: uuid(),
    calcSlug: input.calcSlug,
    label: input.label.slice(0, 50),
    notes: input.notes?.slice(0, 200),
    inputs: input.inputs,
    outputs: input.outputs,
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
  };
  list.unshift(scenario);
  const ok = safeStorageSet(STORAGE_KEYS.scenarios, list);
  if (!ok) return { ok: false, reason: 'quota' };
  if (list.length >= SCENARIOS_WARN_AT) {
    console.warn(`[enterprise/scenario] ${list.length}/${SCENARIOS_MAX} — nearing quota`);
  }
  return { ok: true, scenario };
}

export function listScenarios(calcSlug: string): StoredScenario[] {
  const list = safeStorageGet<StoredScenario[]>(STORAGE_KEYS.scenarios, []);
  return list
    .filter(s => s.calcSlug === calcSlug)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function deleteScenario(id: string): boolean {
  const list = safeStorageGet<StoredScenario[]>(STORAGE_KEYS.scenarios, []);
  const next = list.filter(s => s.id !== id);
  if (next.length === list.length) return false;
  return safeStorageSet(STORAGE_KEYS.scenarios, next);
}