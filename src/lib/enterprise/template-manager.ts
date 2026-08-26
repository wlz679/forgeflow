/**
 * A2 Decision Templates manager.
 *
 * Per spec §1.2 / §3.5:
 *   - Key: ffk.templates.v1
 *   - Max 20 items (warn at 15)
 *   - Templates store inputs only (not outputs — outputs are recalculated
 *     when applied, since outputs are deterministic given inputs)
 */

import { safeStorageGet, safeStorageSet, STORAGE_KEYS } from './storage.ts';

export const TEMPLATES_MAX = 20;
export const TEMPLATES_WARN_AT = 15;

export interface StoredTemplate {
  id: string;
  calcSlug: string;
  name: string;
  inputs: Record<string, number | string>;
  schemaVersion: 1;
  createdAt: string;
  updatedAt: string;
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'tmpl-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export type SaveResult =
  | { ok: true; template: StoredTemplate }
  | { ok: false; reason: 'quota' | 'invalid' };

export function saveTemplate(input: {
  calcSlug: string;
  name: string;
  inputs: Record<string, number | string>;
}): SaveResult {
  if (!input.calcSlug || !input.name || input.name.length > 50) {
    return { ok: false, reason: 'invalid' };
  }
  const list = safeStorageGet<StoredTemplate[]>(STORAGE_KEYS.templates, []);
  if (list.length >= TEMPLATES_MAX) {
    return { ok: false, reason: 'quota' };
  }
  const now = new Date().toISOString();
  const template: StoredTemplate = {
    id: uuid(),
    calcSlug: input.calcSlug,
    name: input.name.slice(0, 50),
    inputs: input.inputs,
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
  };
  list.unshift(template);
  const ok = safeStorageSet(STORAGE_KEYS.templates, list);
  if (!ok) return { ok: false, reason: 'quota' };
  if (list.length >= TEMPLATES_WARN_AT) {
    console.warn(`[enterprise/template] ${list.length}/${TEMPLATES_MAX} — nearing quota`);
  }
  return { ok: true, template };
}

export function listTemplates(calcSlug: string): StoredTemplate[] {
  const list = safeStorageGet<StoredTemplate[]>(STORAGE_KEYS.templates, []);
  return list
    .filter(t => t.calcSlug === calcSlug)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function deleteTemplate(id: string): boolean {
  const list = safeStorageGet<StoredTemplate[]>(STORAGE_KEYS.templates, []);
  const next = list.filter(t => t.id !== id);
  if (next.length === list.length) return false;
  return safeStorageSet(STORAGE_KEYS.templates, next);
}