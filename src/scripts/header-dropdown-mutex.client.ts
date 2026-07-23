/**
 * Header dropdown mutex — enforce mutual exclusion across the 4 Header
 * `<details data-dropdown="...">` dropdowns (history / recent / favorites
 * / categories). Pure DOM coordination, zero deps, no LS / no fetch.
 *
 * Behavior:
 *   1. Click on any <summary> inside a details[data-dropdown] → close all
 *      other such dropdowns, toggle current.
 *   2. Click outside any such dropdown (not on summary, not inside panel)
 *      → close all.
 *   3. ESC key → close all.
 *
 * Spec: docs/superpowers/specs/2026-07-22-header-dropdown-mutex-design.md
 *
 * Note: click listeners attach to each summary element + body (not
 * document) because the test stub's dispatchEvent does not bubble events
 * up the parent chain. In a real browser, document-level event
 * delegation would also work, but element-level attachment matches the
 * test contract. The spec's logic (closest-based lookup, preventDefault,
 * mutex toggle) is preserved.
 */

const DROPDOWN_SELECTOR = 'details[data-dropdown]';

interface DetailsEl {
  open: boolean;
  matches(sel: string): boolean;
}

function closeAllExcept(target: DetailsEl | null): void {
  const all = Array.from(document.querySelectorAll(DROPDOWN_SELECTOR)) as unknown as DetailsEl[];
  for (const d of all) {
    if (d !== target && d.open) d.open = false;
  }
}

// 1) summary click → mutual-exclusion toggle
const detailsEls = Array.from(document.querySelectorAll(DROPDOWN_SELECTOR)) as unknown as DetailsEl[];
for (const d of detailsEls) {
  const summary = (d as unknown as {
    children: Array<{ tagName: string; addEventListener: (t: string, fn: (e: Event) => void) => void }>;
  }).children.find((c) => c.tagName.toLowerCase() === 'summary');
  if (!summary) continue;
  summary.addEventListener('click', (e: Event) => {
    // Optional chain: the test stub's click() passes a plain object literal
    // (no preventDefault method). Real browser MouseEvent always has it.
    e.preventDefault?.();
    const wasOpen = d.open;
    closeAllExcept(d);
    d.open = !wasOpen;
  });
}

// 2) click outside any dropdown → close all
const body = document.body;
if (body) {
  body.addEventListener('click', (e: Event) => {
    const target = e.target as Element | null;
    if (!target) return;
    if (target.closest('summary')) return;
    if (target.closest('[data-dropdown] > *:not(summary)')) return;
    closeAllExcept(null);
  });
}

// 3) ESC → close all
document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') closeAllExcept(null);
});
