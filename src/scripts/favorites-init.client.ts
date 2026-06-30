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
 *
 * Cross-tab sync: window 'storage' event (browser fires when another tab
 *   writes the same key).
 * Same-tab sync: CustomEvent('favorites:change') dispatched by lib.write().
 */

import {
  FAVORITES_STORAGE_KEY, FAVORITES_MAX_ITEMS,
  read, write, toggle, has, isAvailable, subscribe,
  FavoritesUnavailableError, QuotaExceededError,
} from '../lib/favorites';

type Mode = 'preview' | 'full' | 'count';
const PREVIEW_LIMIT = 3;

let initialized = false;

function setPressed(btn: HTMLElement, pressed: boolean): void {
  btn.setAttribute('aria-pressed', String(pressed));
  btn.dataset.favoriteActive = pressed ? 'true' : 'false';
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
        btn.title = `Storage limit reached (${FAVORITES_MAX_ITEMS} max). Remove some favorites and try again.`;
      } else if (err instanceof FavoritesUnavailableError) {
        btn.title = 'Favorites unavailable in this browser context.';
      } else {
        btn.title = 'Favorites error — see console.';
        console.error('[favorites] toggle failed', err);
      }
    }
  });
}

function renderPreview(container: HTMLElement, slugs: string[]): void {
  const top = slugs.slice(0, PREVIEW_LIMIT);
  // Render uses existing ToolCard markup via a small template.
  // For preview mode we render a compact list (text-only); the full
  // /favorites/ page uses the proper ToolCard grid.
  const items = top.map(s => `<li><a href="./${s}/" class="block px-4 py-2 hover:bg-gray-50 text-sm text-gray-700">${s}</a></li>`).join('');
  const allCount = slugs.length;
  const footer = allCount > PREVIEW_LIMIT
    ? `<li class="border-t border-gray-100"><a href="./favorites/" class="block px-4 py-2 text-xs font-semibold text-[#7C3AED] hover:bg-gray-50">View all (${allCount}) →</a></li>`
    : '';
  const empty = allCount === 0 ? `<li class="px-4 py-3 text-xs text-gray-500">No favorites yet</li>` : '';
  const list = `<ul class="py-1">${empty}${items}${footer}</ul>`;
  container.innerHTML = list;
}

function renderFull(container: HTMLElement, slugs: string[]): void {
  // Hydration target — the page SSGs an empty grid; we populate it here.
  // The page-level wrapper provides a hidden empty-state element to swap in.
  // (See Task 4 favorites.astro for the empty-state skeleton.)
  const grid = container.querySelector('[data-favorites-grid]') as HTMLElement | null;
  const empty = container.querySelector('[data-favorites-empty]') as HTMLElement | null;
  if (!grid || !empty) return;
  if (slugs.length === 0) {
    grid.style.display = 'none';
    empty.style.display = '';
  } else {
    grid.style.display = '';
    empty.style.display = 'none';
    grid.innerHTML = slugs.map(s =>
      `<a href="./${s}/" class="fav-card group relative flex flex-col p-5 bg-gray-50 border border-gray-100 rounded-xl hover:border-[#7C3AED]/30 hover:bg-white hover:shadow-lg hover:shadow-[#7C3AED]/5 transition-all duration-300 hover:-translate-y-1"><span class="text-sm font-semibold text-gray-900 group-hover:text-[#7C3AED]">${s}</span></a>`
    ).join('');
  }
}

function renderCount(container: HTMLElement, slugs: string[]): void {
  container.textContent = String(slugs.length);
}

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
  if (!isAvailable()) {
    console.warn('[favorites] localStorage unavailable; feature disabled.');
    document.querySelectorAll<HTMLElement>('[data-favorite-toggle]').forEach(b => {
      b.title = 'Favorites unavailable in this browser context.';
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
