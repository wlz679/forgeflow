/**
 * P2c history-snapshots init layer.
 * Click handler for [data-history-save] reads form dynamically + saves.
 * Click handler for [data-history-restore] navigates with ?prefill=base64.
 * Click handler for [data-history-delete] removes by id.
 * Click handler for [data-history-clear-all] confirms + clears all.
 * URL prefill on mount: decode ?prefill= → fill form → submit.
 * Cross-tab via storage event. Same-tab via lib.subscribe().
 * i18n from window.__i18n_history__ (populated by BaseLayout).
 */
import {
  read, save, restore, remove, clearAll, isAvailable, subscribe,
  encodePrefill, decodePrefill,
  HISTORY_STORAGE_KEY,
  HistoryUnavailableError, QuotaExceededError,
} from '../lib/history';

type Lang = 'en' | 'zh';
interface HistoryEntry {
  id: string; slug: string; inputs: Record<string, string>; result: string;
  savedAt: string; accessedAt: string;
}

let initialized = false;

function getLang(): Lang {
  const m = window.location.pathname.match(/^\/(en|zh)(\/|$)/);
  return (m?.[1] as Lang) ?? 'en';
}

function getCurrentSlug(): string | null {
  const m = window.location.pathname.match(/^\/(?:en|zh)\/([a-z0-9-]+)\/?$/);
  if (!m) return null;
  return m[1];
}

function t(key: string, lang: Lang, vars: Record<string, string | number> = {}): string {
  const dict = (window as { __i18n_history__?: Record<Lang, Record<string, string>> }).__i18n_history__?.[lang] ?? {};
  let s = dict[key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return s;
}

function toolHref(slug: string, lang: Lang): string {
  return `/${lang}/${slug}/`;
}

function historyHref(lang: Lang): string {
  return `/${lang}/history/`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diff = now - date.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + 'm ago';
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + 'h ago';
  return Math.floor(diff / 86_400_000) + 'd ago';
}

function readFormInputs(): Record<string, string> {
  const form = document.getElementById('tool-form') as HTMLFormElement | null;
  if (!form) return {};
  const inputs: Record<string, string> = {};
  form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea').forEach((f) => {
    const name = f.getAttribute('name') ?? f.getAttribute('id') ?? '';
    if (name) inputs[name] = f.value ?? '';
  });
  return inputs;
}

function readResultText(): string {
  // Try to find result text in the result card
  const card = document.getElementById('result-card') ?? document.querySelector('[data-history-save]')?.parentElement;
  if (!card) return '';
  return card.textContent?.trim() ?? '';
}

function handleSave(btn: HTMLElement): void {
  const slug = getCurrentSlug();
  if (!slug) return;
  const inputs = readFormInputs();
  const result = readResultText();
  try {
    save({ slug, inputs, result });
    // Visual feedback: flash saved state
    btn.textContent = t('history.btn.saved', getLang());
    setTimeout(() => {
      btn.textContent = t('history.btn.save', getLang());
    }, 1500);
  } catch (e) {
    if (e instanceof HistoryUnavailableError || e instanceof QuotaExceededError) {
      // Silent fail — error already logged
    }
  }
}

function handleRestore(id: string): void {
  const entry = restore(id);
  if (!entry) return;
  const lang = getLang();
  const encoded = encodePrefill(entry.inputs);
  window.location.href = `${toolHref(entry.slug, lang)}?prefill=${encoded}`;
}

function handleDelete(id: string, btn: HTMLElement): void {
  remove(id);
  // Remove entry card from DOM
  const card = btn.closest('[data-history-entry-id]');
  if (card && card.parentElement) card.parentElement.removeChild(card);
}

function handleClearAll(_btn: HTMLElement): void {
  const lang = getLang();
  const count = read().length;
  // eslint-disable-next-line no-alert
  if (!globalThis.confirm(t('history.clear_all.confirm', lang, { count }))) return;
  clearAll();
  // Re-render
  renderAll();
}

function renderPreview(container: Element, entries: HistoryEntry[], lang: Lang): void {
  while (container.firstChild) container.removeChild(container.firstChild);
  const top = entries.slice(0, 5);
  if (top.length === 0) {
    const div = document.createElement('div');
    div.setAttribute('class', 'px-3 py-2 text-sm text-gray-500');
    div.textContent = t('history.dropdown.empty', lang);
    container.appendChild(div);
    return;
  }
  for (const e of top) {
    const wrap = document.createElement('div');
    wrap.setAttribute('class', 'flex items-center justify-between gap-2 px-3 py-2 hover:bg-gray-50');
    const link = document.createElement('a');
    link.setAttribute('href', toolHref(e.slug, lang));
    link.setAttribute('class', 'flex-1 text-sm text-gray-700 hover:text-[#7C3AED] transition-colors truncate');
    link.textContent = `${e.slug} · ${formatDate(e.savedAt)}`;
    wrap.appendChild(link);
    const restoreBtn = document.createElement('button');
    restoreBtn.setAttribute('type', 'button');
    restoreBtn.setAttribute('class', 'text-xs text-[#7C3AED] hover:underline shrink-0');
    restoreBtn.setAttribute('data-history-restore', e.id);
    restoreBtn.textContent = t('history.btn.restore', lang);
    wrap.appendChild(restoreBtn);
    container.appendChild(wrap);
  }
  // View all link
  const viewAll = document.createElement('a');
  viewAll.setAttribute('href', historyHref(lang));
  viewAll.setAttribute('class', 'block px-3 py-2 text-sm text-[#7C3AED] hover:bg-gray-50 font-medium border-t border-gray-100');
  viewAll.textContent = t('history.dropdown.view_all', lang, { count: entries.length });
  container.appendChild(viewAll);
}

function renderEntry(e: HistoryEntry, lang: Lang): HTMLElement {
  const card = document.createElement('div');
  card.setAttribute('class', 'p-4 bg-white border border-gray-100 rounded-xl flex items-start justify-between gap-3');
  card.setAttribute('data-history-entry-id', e.id);
  const content = document.createElement('div');
  content.setAttribute('class', 'flex-1');
  const slug = document.createElement('div');
  slug.setAttribute('class', 'text-sm font-semibold text-gray-900');
  slug.textContent = e.slug;
  const result = document.createElement('div');
  result.setAttribute('class', 'text-xs text-gray-500 font-mono truncate mt-1');
  result.textContent = e.result.split('\n').slice(0, 2).join(' / ');
  const time = document.createElement('div');
  time.setAttribute('class', 'text-xs text-gray-400 mt-1');
  time.textContent = formatDate(e.savedAt);
  content.appendChild(slug);
  content.appendChild(result);
  content.appendChild(time);
  card.appendChild(content);
  const actions = document.createElement('div');
  actions.setAttribute('class', 'flex items-center gap-2 shrink-0');
  const restoreBtn = document.createElement('button');
  restoreBtn.setAttribute('type', 'button');
  restoreBtn.setAttribute('class', 'text-xs text-[#7C3AED] hover:underline');
  restoreBtn.setAttribute('data-history-restore', e.id);
  restoreBtn.textContent = t('history.btn.restore', lang);
  const deleteBtn = document.createElement('button');
  deleteBtn.setAttribute('type', 'button');
  deleteBtn.setAttribute('class', 'text-xs text-gray-400 hover:text-red-600');
  deleteBtn.setAttribute('data-history-delete', e.id);
  deleteBtn.textContent = t('history.btn.delete', lang);
  actions.appendChild(restoreBtn);
  actions.appendChild(deleteBtn);
  card.appendChild(actions);
  return card;
}

function renderFull(container: Element, entries: HistoryEntry[], lang: Lang): void {
  while (container.firstChild) container.removeChild(container.firstChild);
  if (entries.length === 0) {
    const wrap = document.createElement('div');
    wrap.setAttribute('class', 'text-center py-16');
    const h2 = document.createElement('h2');
    h2.setAttribute('class', 'text-xl font-semibold text-gray-700 mb-2');
    h2.textContent = t('history.empty.title', lang);
    const p = document.createElement('p');
    p.setAttribute('class', 'text-gray-500 mb-6');
    p.textContent = t('history.empty.body', lang);
    const btn = document.createElement('a');
    btn.setAttribute('href', `/${lang}/`);
    btn.setAttribute('class', 'inline-block px-5 py-2.5 rounded-lg bg-[#7C3AED] text-white hover:bg-[#6D28D9] transition-colors');
    btn.textContent = t('history.empty.browse', lang);
    wrap.appendChild(h2);
    wrap.appendChild(p);
    wrap.appendChild(btn);
    container.appendChild(wrap);
    return;
  }
  for (const e of entries) {
    container.appendChild(renderEntry(e, lang));
  }
}

/**
 * Re-render every `[data-history-container]` element on the page from current LS state.
 * Called by `init()` at startup, by the same-tab `subscribe()` fanout, and by the
 * cross-tab `storage` event listener.
 *
 * @internal Test seam only — not for production consumers.
 * The brief does not expose `renderAll` as public API; it is exported solely so the
 * component tests (which run under tsx, where module caching breaks the brief's
 * `?t=` cache-buster re-import approach) can force a re-render in a single import.
 * Do not call this from production code — `init()` already wires storage events
 * and the same-tab subscriber to it.
 */
function renderAll(): void {
  const lang = getLang();
  const entries = read();
  const containers = document.querySelectorAll('[data-history-container]');
  containers.forEach((c) => {
    const mode = c.getAttribute('data-mode');
    if (mode === 'preview') renderPreview(c, entries, lang);
    else if (mode === 'full') renderFull(c, entries, lang);
  });
}

export { renderAll };

function bindEvents(): void {
  // Use event delegation: a single click handler on document fires for all
  // data-history-* buttons. This avoids the need to re-bind on every renderAll
  // (which produces fresh DOM nodes). The handler walks up from the click target
  // to find the closest element with a data-history-* attribute.
  document.addEventListener('click', (ev) => {
    const target = ev.target as Element | null;
    if (!target || !target.closest) return;
    const saveEl = target.closest('[data-history-save]');
    if (saveEl) {
      ev.preventDefault();
      ev.stopPropagation();
      handleSave(saveEl as HTMLElement);
      return;
    }
    const restoreEl = target.closest('[data-history-restore]');
    if (restoreEl) {
      ev.preventDefault();
      const id = restoreEl.getAttribute('data-history-restore') ?? '';
      handleRestore(id);
      return;
    }
    const deleteEl = target.closest('[data-history-delete]');
    if (deleteEl) {
      ev.preventDefault();
      const id = deleteEl.getAttribute('data-history-delete') ?? '';
      handleDelete(id, deleteEl as HTMLElement);
      return;
    }
    const clearEl = target.closest('[data-history-clear-all]');
    if (clearEl) {
      ev.preventDefault();
      handleClearAll(clearEl as HTMLElement);
      return;
    }
  });
}

function handlePrefillFromURL(): void {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('prefill');
  if (!encoded) return;
  const inputs = decodePrefill(encoded);
  if (!inputs) return;
  // Fill form fields
  Object.entries(inputs).forEach(([name, value]) => {
    const field = document.getElementById(name) ?? document.querySelector(`[name="${name}"]`);
    if (field) (field as HTMLInputElement).value = value;
  });
  // Clear prefill from URL
  const url = new URL(window.location.href);
  url.searchParams.delete('prefill');
  window.history.replaceState({}, '', url.toString());
  // Trigger form submit to re-run calculate
  const form = document.getElementById('tool-form') as HTMLFormElement | null;
  if (form) {
    setTimeout(() => form.submit(), 100);
  }
}

export function init(): void {
  if (initialized) return;
  initialized = true;
  if (!isAvailable()) return;

  // Handle URL prefill on tool pages
  const slug = getCurrentSlug();
  if (slug) handlePrefillFromURL();

  // Subscribe to same-tab fanout
  subscribe(() => { renderAll(); });

  // Listen to cross-tab storage event
  window.addEventListener('storage', (ev) => {
    if (ev.key === HISTORY_STORAGE_KEY) renderAll();
  });

  // Bind events and initial render
  bindEvents();
  renderAll();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
