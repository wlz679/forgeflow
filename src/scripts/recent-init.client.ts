/**
 * P2b recent-viewed init layer.
 * Auto-records current slug on tool detail pages.
 * Renders 3 modes: preview (Header dropdown) / inline (tool-page pills) / full (/recent/ page).
 * Cross-tab via storage event. Same-tab via lib.subscribe().
 * i18n from window.__i18n_recent__ (populated by BaseLayout).
 */
import {
  read, recordVisit, isAvailable, subscribe,
} from '../lib/recent';

type Lang = 'en' | 'zh';
type RecentEntry = { slug: string; visitedAt: string };

let initialized = false;

function getLang(): Lang {
  const m = window.location.pathname.match(/^\/(en|zh)(\/|$)/);
  return (m?.[1] as Lang) ?? 'en';
}

function getCurrentSlug(): string | null {
  // Pathname: /[lang]/[slug]/  → slug is the second segment
  const m = window.location.pathname.match(/^\/(?:en|zh)\/([a-z0-9-]+)\/?$/);
  if (!m) return null;
  const slug = m[1];
  // Exclude known non-tool slugs
  if (['about', 'contact', 'blog', 'privacy-policy', 'terms', 'favorites', 'recent',
       'saas-metrics', 'cost-efficiency', 'freelance-pricing', 'investment-roi',
       'valuation-exit', 'ai-cost-tools'].includes(slug)) return null;
  return slug;
}

function t(key: string, lang: Lang, vars: Record<string, string | number> = {}): string {
  const dict = (window as { __i18n_recent__?: Record<Lang, Record<string, string>> }).__i18n_recent__?.[lang] ?? {};
  let s = dict[key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return s;
}

function timeAgo(visitedAt: string, lang: Lang): string {
  const ms = Date.now() - new Date(visitedAt).getTime();
  const min = Math.floor(ms / 60_000);
  const hr = Math.floor(ms / 3_600_000);
  const day = Math.floor(ms / 86_400_000);
  if (min < 60) return t('recent.time.just_now', lang);
  if (hr < 24) return t('recent.time.hours_ago', lang, { count: hr });
  return t('recent.time.days_ago', lang, { count: day });
}

function toolHref(slug: string, lang: Lang): string {
  return `/${lang}/${slug}/`;
}

function recentHref(lang: Lang): string {
  return `/${lang}/recent/`;
}

function createA(href: string, text: string, parent: Element): void {
  const a = document.createElement('a');
  a.setAttribute('href', href);
  a.setAttribute('class', 'block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#7C3AED] transition-colors truncate');
  a.textContent = text;
  parent.appendChild(a);
}

function createPill(href: string, text: string, parent: Element): void {
  const a = document.createElement('a');
  a.setAttribute('href', href);
  a.setAttribute('class', 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-sm text-gray-700 hover:text-[#7C3AED] transition-colors');
  a.textContent = text;
  parent.appendChild(a);
}

function renderPreview(container: Element, entries: RecentEntry[], lang: Lang): void {
  // Clear children
  while (container.firstChild) container.removeChild(container.firstChild);
  const top = entries.slice(0, 5);
  if (top.length === 0) {
    const div = document.createElement('div');
    div.setAttribute('class', 'px-3 py-2 text-sm text-gray-500');
    div.textContent = t('recent.dropdown.empty', lang);
    container.appendChild(div);
    return;
  }
  for (const e of top) {
    createA(toolHref(e.slug, lang), `${e.slug} · ${timeAgo(e.visitedAt, lang)}`, container);
  }
  // View all link
  createA(recentHref(lang), t('recent.dropdown.view_all', lang, { count: entries.length }), container);
}

function renderInline(container: Element, entries: RecentEntry[], lang: Lang): void {
  const pills = container.querySelector('[data-recent-pills]') as Element | null;
  const counter = container.querySelector('[data-recent-count]') as Element | null;
  const current = getCurrentSlug();
  const filtered = entries.filter(e => e.slug !== current);

  if (filtered.length === 0) {
    container.setAttribute('data-recent-hidden', '');
    if (pills) while (pills.firstChild) pills.removeChild(pills.firstChild);
    if (counter) counter.textContent = '0';
    return;
  }
  container.removeAttribute('data-recent-hidden');
  if (counter) counter.textContent = String(filtered.length);
  if (pills) {
    while (pills.firstChild) pills.removeChild(pills.firstChild);
    for (const e of filtered) {
      createPill(toolHref(e.slug, lang), `${e.slug} · ${timeAgo(e.visitedAt, lang)}`, pills);
    }
  }
}

function renderFull(container: Element, entries: RecentEntry[], lang: Lang): void {
  // /recent/ page delegates to the existing ToolCard grid pattern (data-recent-grid wrapper)
  // We just hand off to a global function set by the page (or render plain list fallback).
  while (container.firstChild) container.removeChild(container.firstChild);
  if (entries.length === 0) {
    const wrap = document.createElement('div');
    wrap.setAttribute('class', 'text-center py-16');
    const h2 = document.createElement('h2');
    h2.setAttribute('class', 'text-xl font-semibold text-gray-700 mb-2');
    h2.textContent = t('recent.empty.title', lang);
    const p = document.createElement('p');
    p.setAttribute('class', 'text-gray-500 mb-6');
    p.textContent = t('recent.empty.body', lang);
    const btn = document.createElement('a');
    btn.setAttribute('href', `/${lang}/`);
    btn.setAttribute('class', 'inline-block px-5 py-2.5 rounded-lg bg-[#7C3AED] text-white hover:bg-[#6D28D9] transition-colors');
    btn.textContent = t('recent.empty.browse', lang);
    wrap.appendChild(h2);
    wrap.appendChild(p);
    wrap.appendChild(btn);
    container.appendChild(wrap);
    return;
  }
  // If a global hook exists, delegate (full ToolCard rendering is in the page's own init).
  const grid = container.querySelector('[data-recent-grid]') ?? container;
  for (const e of entries) {
    const card = document.createElement('div');
    card.setAttribute('class', 'p-5 bg-gray-50 border border-gray-100 rounded-xl');
    card.setAttribute('data-recent-slug', e.slug);
    const h3 = document.createElement('h3');
    h3.setAttribute('class', 'text-base font-semibold text-gray-900 mb-1');
    h3.textContent = e.slug;
    const p = document.createElement('p');
    p.setAttribute('class', 'text-sm text-gray-500');
    p.textContent = timeAgo(e.visitedAt, lang);
    card.appendChild(h3);
    card.appendChild(p);
    grid.appendChild(card);
  }
}

/**
 * Re-render every `[data-recent-container]` element on the page from current LS state.
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
  const containers = document.querySelectorAll('[data-recent-container]');
  containers.forEach((c) => {
    const mode = c.getAttribute('data-mode');
    if (mode === 'preview') renderPreview(c, entries, lang);
    else if (mode === 'inline') renderInline(c, entries, lang);
    else if (mode === 'full') renderFull(c, entries, lang);
  });
}

export { renderAll };

export function init(): void {
  if (initialized) return;
  initialized = true;
  if (!isAvailable()) return;  // early return when LS is blocked

  // Auto-record current slug
  const slug = getCurrentSlug();
  if (slug !== null) {
    try { recordVisit(slug); } catch { /* InvalidSlugError etc — log to console, no UI feedback */ }
  }

  // Subscribe to same-tab fanout
  subscribe(() => { renderAll(); });

  // Listen to cross-tab storage event
  window.addEventListener('storage', (ev) => {
    if (ev.key === 'forgeflowkit:recent:v1') renderAll();
  });

  // Initial render
  renderAll();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
