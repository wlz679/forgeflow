/**
 * P2a favorites init layer (browser-only).
 *
 * Astro `.client.ts` suffix ensures this module is tree-shaken out of SSR
 * and bundled into the client. It is imported once via a <script> tag in
 * BaseLayout; init() runs on DOMContentLoaded.
 *
 * Data-attr contract (declarative hooks — components don't import this file):
 *   - [data-favorite-toggle][data-favorite-slug="..."]: clickable star button
 *   - [data-favorites-container][data-mode="preview|full|count"]: render target
 *   - #tools-data: optional <script type="application/json"> embedded by
 *     /favorites/ page; contains { [slug]: { title, description, categoryId } }
 *     for proper card rendering. Falls back gracefully if absent.
 *
 * Cross-tab sync: window 'storage' event (browser fires when another tab
 *   writes the same key).
 * Same-tab sync: subscribe() in lib/favorites.ts (fanout via notify()).
 *
 * Language detection: read window.location.pathname at init time. Pattern
 *   /^\/(en|zh)(\/|$)/. Default to 'en'. Used for:
 *     1. i18n string lookup (favorites.dropdown.*, favorites.toast.*, favorites.aria.*)
 *     2. absolute URL building in preview/full mode (avoids 404s on non-root pages)
 */

import {
  FAVORITES_STORAGE_KEY, FAVORITES_MAX_ITEMS,
  read, write, toggle, has, isAvailable, subscribe,
  FavoritesUnavailableError, QuotaExceededError,
} from '../lib/favorites';
import { translations, type Lang } from '../i18n/translations';

type Mode = 'preview' | 'full' | 'count';
const PREVIEW_LIMIT = 3;

let initialized = false;
let currentLang: Lang = 'en';

// ----- i18n helpers (browser-side) -----

function getLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  const m = /^\/(en|zh)(\/|$)/.exec(window.location.pathname);
  return (m?.[1] as Lang) || 'en';
}

function t(key: string, vars?: Record<string, string>): string {
  const entry = translations[key];
  if (!entry) return key;
  let text = entry[currentLang];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}

// ----- DOM helpers -----

/**
 * Build a URL absolute to the site root with the current lang prefix.
 * Avoids the 404 we get from relative hrefs when the dropdown opens from
 * a non-root page (tool detail, /favorites/, category pages).
 */
function toolHref(slug: string): string {
  return `/${currentLang}/${slug}/`;
}

function favoritesHref(): string {
  return `/${currentLang}/favorites/`;
}

type ToolInfo = { title: string; description: string; categoryId?: string };

/**
 * Read the inline tools-data JSON embedded by the /favorites/ page.
 * Returns {} if absent — caller is expected to fall back to slug display.
 */
function readToolsData(): Record<string, ToolInfo> {
  if (typeof document === 'undefined') return {};
  const el = document.getElementById('tools-data');
  if (!el || !el.textContent) return {};
  try {
    const parsed = JSON.parse(el.textContent);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch {
    return {};
  }
}

// ----- Star button state -----

function setPressed(btn: HTMLElement, pressed: boolean): void {
  btn.setAttribute('aria-pressed', String(pressed));
  btn.dataset.favoriteActive = pressed ? 'true' : 'false';
  // Finding #5: aria-label must flip between add/remove so screen readers
  // announce the correct action.
  const labelKey = pressed ? 'favorites.aria.remove' : 'favorites.aria.add';
  btn.setAttribute('aria-label', t(labelKey));
}

function bindToggle(btn: HTMLElement): void {
  const slug = btn.dataset.favoriteSlug;
  if (!slug) return;
  setPressed(btn, has(slug));
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      toggle(slug);
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        // Finding #4: use translated tooltip instead of hardcoded English.
        btn.title = t('favorites.toast.quota', { max: String(FAVORITES_MAX_ITEMS) });
      } else if (err instanceof FavoritesUnavailableError) {
        btn.title = t('favorites.toast.unavailable');
      } else {
        btn.title = t('favorites.toast.quota'); // generic fallback
        console.error('[favorites] toggle failed', err);
      }
    }
  });
}

// ----- Render: preview (Header dropdown) -----

/**
 * Build a compact list for the Header dropdown. Uses DOM API only — no
 * innerHTML — to avoid XSS from a corrupted localStorage payload.
 */
function renderPreview(container: HTMLElement, slugs: string[]): void {
  // Clear previous children
  while (container.firstChild) container.removeChild(container.firstChild);

  const ul = document.createElement('ul');
  ul.className = 'py-1';

  const top = slugs.slice(0, PREVIEW_LIMIT);
  for (const s of top) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.setAttribute('href', toolHref(s));
    a.className = 'block px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 truncate';
    a.textContent = s; // textContent escapes any HTML in s
    li.appendChild(a);
    ul.appendChild(li);
  }

  // Finding #3: "View all (N) →" + "No favorites yet" are i18n keys.
  if (slugs.length === 0) {
    const li = document.createElement('li');
    li.className = 'px-4 py-3 text-xs text-gray-500';
    li.textContent = t('favorites.dropdown.empty');
    ul.appendChild(li);
  } else if (slugs.length > PREVIEW_LIMIT) {
    const li = document.createElement('li');
    li.className = 'border-t border-gray-100';
    const a = document.createElement('a');
    a.setAttribute('href', favoritesHref());
    a.className = 'block px-4 py-2 text-xs font-semibold text-[#7C3AED] hover:bg-gray-50';
    a.textContent = t('favorites.dropdown.view_all', { n: String(slugs.length) });
    li.appendChild(a);
    ul.appendChild(li);
  }

  container.appendChild(ul);
}

// ----- Render: full (/favorites/ page) -----

/**
 * Build full ToolCard markup for each favorited slug. Uses tools-data JSON
 * embedded by the page; falls back to slug-only display if data missing.
 * No innerHTML — every attribute/text set via DOM API to prevent XSS.
 */
function renderFull(container: HTMLElement, slugs: string[]): void {
  const grid = container.querySelector<HTMLElement>('[data-favorites-grid]');
  const empty = container.querySelector<HTMLElement>('[data-favorites-empty]');
  if (!grid || !empty) return;

  // Clear grid
  while (grid.firstChild) grid.removeChild(grid.firstChild);

  if (slugs.length === 0) {
    grid.style.display = 'none';
    empty.style.display = '';
    return;
  }
  grid.style.display = '';
  empty.style.display = 'none';

  const toolsData = readToolsData();
  for (const s of slugs) {
    const a = document.createElement('a');
    a.setAttribute('href', toolHref(s));
    a.className = 'group relative flex flex-col p-5 bg-gray-50 border border-gray-100 rounded-xl hover:border-[#7C3AED]/30 hover:bg-white hover:shadow-lg hover:shadow-[#7C3AED]/5 transition-all duration-300 hover:-translate-y-1';

    const info = toolsData[s];
    if (info?.title) {
      // Rich card: title + description, matches ToolCard visual hierarchy
      const h3 = document.createElement('h3');
      h3.className = 'text-base font-semibold text-gray-900 group-hover:text-[#7C3AED] transition-colors duration-300 mb-2 truncate';
      h3.textContent = info.title;
      a.appendChild(h3);
      if (info.description) {
        const p = document.createElement('p');
        p.className = 'text-sm text-gray-500 line-clamp-2 group-hover:text-gray-600 transition-colors duration-300 mt-auto';
        p.setAttribute('title', info.description);
        p.textContent = info.description;
        a.appendChild(p);
      }
    } else {
      // Fallback: slug-only display (defensive — page must embed tools data)
      const span = document.createElement('span');
      span.className = 'text-sm font-semibold text-gray-900 group-hover:text-[#7C3AED]';
      span.textContent = s;
      a.appendChild(span);
    }
    grid.appendChild(a);
  }
}

// ----- Render: count (reserved) -----

function renderCount(container: HTMLElement, slugs: string[]): void {
  container.textContent = String(slugs.length);
}

// ----- Orchestrator -----

function renderAll(): void {
  const slugs = read();
  for (const el of document.querySelectorAll<HTMLElement>('[data-favorites-container]')) {
    const mode = (el.dataset.mode || 'full') as Mode;
    if (mode === 'preview') renderPreview(el, slugs);
    else if (mode === 'count') renderCount(el, slugs);
    else renderFull(el, slugs);
  }
  // Sync star button states
  for (const btn of document.querySelectorAll<HTMLElement>('[data-favorite-toggle]')) {
    const slug = btn.dataset.favoriteSlug;
    if (slug) setPressed(btn, has(slug));
  }
}

export function init(): void {
  if (initialized) return;
  initialized = true;
  currentLang = getLang();
  if (!isAvailable()) {
    console.warn('[favorites] localStorage unavailable; feature disabled.');
    const unavailableTitle = t('favorites.toast.unavailable');
    document.querySelectorAll<HTMLElement>('[data-favorite-toggle]').forEach(b => {
      b.title = unavailableTitle;
      b.setAttribute('aria-disabled', 'true');
    });
    return;
  }
  for (const btn of document.querySelectorAll<HTMLElement>('[data-favorite-toggle]')) {
    bindToggle(btn);
  }
  renderAll();
  // Same-tab fanout
  subscribe(() => { renderAll(); });
  // Cross-tab sync (uses imported constant — single source of truth)
  window.addEventListener('storage', (e) => {
    if (e.key === FAVORITES_STORAGE_KEY) renderAll();
  });
}

// Auto-run on DOMContentLoaded (Astro bundles this script with `defer`)
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
