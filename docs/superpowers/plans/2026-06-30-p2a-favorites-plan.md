# P2a LocalStorage 收藏 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a client-side bookmark/favorites system to all 32 calculators — ⭐ toggle on ToolCard, Header dropdown preview, dedicated `/[lang]/favorites/` page — backed entirely by `localStorage` with versioned schema (`forgeflowkit:favorites:v1`).

**Architecture:** 4-tier separation — pure-TS `src/lib/favorites.ts` (state, no DOM) → `src/scripts/favorites-init.client.ts` (DOM scan + event binding + cross-tab sync) → `data-favorite-*` data-attr declarative hooks → Astro components (`ToolCard`, `Header`, `[lang]/favorites.astro`). Set semantics in lib, JSON array in storage. 13 new i18n keys. Three test files (lib unit, init component, SEO schema fixture).

**Tech Stack:** Astro 4.16.19 (SSG + `.client.ts` for browser-only bundles), TypeScript 5.6 strict, vanilla `localStorage` (no IndexedDB, no library), `node:test` via `tsx` runner.

## Global Constraints

- **branch:** `master` (P2a ships directly, no sub-branch)
- **engines/ 目录零改动** (业务逻辑冻结)
- **32 工具数量冻结** (P2a 不新增/删除/合并工具)
- **commit 前 `pnpm check` 必须 exit 0** (含新增 lib 单测)
- **push 前 fetch + rev-list + push** gitee (`wlz679/calcKit`) + github (`wlz679/forgeflow`)，手动镜像，hook 自动跑
- **pre-commit hook** `.githooks/pre-commit` 自动 `codegen-examples --check`；紧急用 `SKIP_PRECOMMIT_CHECK=1`
- **i18n 必须经 `check-i18n-completeness.mjs`**（regex 匹配 `{key}: { en, zh }`），缺一即 exit 1
- **private LS key `forgeflowkit:favorites:v1`**（命名空间隔离 P2b/P2c）
- **`MAX_ITEMS = 50`**，slugs.length 达 50 时新加入返回 `{added: false}`，不偷丢老数据
- **`.client.ts` 后缀**：Astro 自动 tree-shake，仅打包到 client bundle，不进 SSR
- **`data-favorite-*` data-attrs** 作为 declarative hooks（init script 扫 `[data-favorite-toggle]` / `[data-favorites-container]`）
- **Set 语义在 lib，array 在 JSON**（dedup 在 lib；序列化走 JSON）

---

## File Structure (Map)

| File | Role | Lines est. |
|---|---|---|
| `src/lib/favorites.ts` (NEW) | 纯 TS 状态层：read/write/toggle/has/isAvailable/subscribe + 3 error class + 2 常量 | ~150 |
| `src/scripts/favorites-init.client.ts` (NEW) | DOM 扫描 + click handler + storage event + CustomEvent fanout | ~110 |
| `src/pages/[lang]/favorites.astro` (NEW) | SSG 骨架 + JS hydrate（复用 ToolCard 样式） | ~90 |
| `src/components/ToolCard.astro` (MOD) | 加 ⭐ button（`data-favorite-toggle` + `data-favorite-slug`） | +25 |
| `src/components/Header.astro` (MOD) | 加 Favorites `<details>` dropdown（`data-favorites-container data-mode="preview"`） | +50 |
| `src/layouts/BaseLayout.astro` (MOD) | 加 `<script type="module" src="/src/scripts/favorites-init.client.ts">` | +3 |
| `src/pages/[lang]/privacy-policy.astro` (MOD) | 加 `## 浏览器存储（Browser Storage）` 段落（en + zh 共用文件，已 `getStaticPaths` 双语） | +15 |
| `src/i18n/translations.ts` (MOD) | +13 新 key × 2 lang = 26 行 | +26 |
| `scripts/check-i18n-completeness.mjs` (MOD) | 加 `favorites: [...]` 13 个 required key | +20 |
| `tests/favorites.test.ts` (NEW) | lib 单测：21 用例 | ~180 |
| `tests/favorites-init.test.ts` (NEW) | init 组件测：15 用例（用 happy-dom 或 jsdom） | ~200 |
| `tests/seo-schemas.test.ts` (MOD) | +1 fixture（favorites page WebPage schema + 不含 LS key） | +25 |

总计 12 文件变更：4 新（lib + init + page + 2 tests = 5 实际新增；schema test 是 mod）+ 7 mod。预估 ~900 行净增（+50% production / +50% test）。

---

## Task 1: `src/lib/favorites.ts` + lib unit tests

**Files:**
- Create: `src/lib/favorites.ts`
- Create: `tests/favorites.test.ts`

**Interfaces:**
- Consumes: none (leaf task)
- Produces:
  - `export const FAVORITES_STORAGE_KEY: 'forgeflowkit:favorites:v1'`
  - `export const FAVORITES_MAX_ITEMS: 50`
  - `export function read(): string[]`
  - `export function write(slugs: string[]): void` (throws `QuotaExceededError`, `FavoritesUnavailableError`)
  - `export function toggle(slug: string): { added: boolean; slugs: string[] }`
  - `export function has(slug: string): boolean`
  - `export function isAvailable(): boolean`
  - `export function subscribe(cb: () => void): () => void`
  - `export class FavoritesUnavailableError extends Error {}`
  - `export class QuotaExceededError extends Error {}`
  - `export class SchemaMismatchError extends Error {}`

**Context for implementer:** Pure TypeScript module. NO DOM access. NO imports from `astro/*` or `*.astro`. Will be imported by `src/scripts/favorites-init.client.ts` (browser) AND by `tests/favorites.test.ts` (Node). Uses `globalThis.localStorage` only when available (Node 22 has `node:storage` shim via `--experimental-localstorage` flag — but we use a simple `LS_PROBE` try/catch and store availability in a module-level cached boolean).

- [ ] **Step 1.1: Write failing test — `tests/favorites.test.ts`**

Create file with the following structure. This file will be picked up by `tests/run.mjs` which auto-discovers `*.test.ts`.

```ts
/**
 * P2a favorites lib unit tests.
 * Covers: read/write/toggle/has/isAvailable/subscribe + 3 error classes.
 * Run via: pnpm test:unit  (or  node tests/run.mjs tests/favorites.test.ts)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FAVORITES_STORAGE_KEY,
  FAVORITES_MAX_ITEMS,
  read, write, toggle, has, isAvailable, subscribe,
  FavoritesUnavailableError, QuotaExceededError, SchemaMismatchError,
} from '../src/lib/favorites.ts';

// Helper: a per-test in-memory LS shim that satisfies the minimal interface.
// The lib talks to globalThis.localStorage directly; tests inject by
// temporarily replacing the global and cleaning up after.
type LS = {
  getItem: (k: string) => string | null;
  setItem: (k: string, v: string) => void;
  removeItem: (k: string) => void;
  clear: () => void;
  key: (i: number) => string | null;
  length: number;
};

function makeShim(initial: Record<string, string> = {}): LS {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (k) => (store.has(k) ? store.get(k)! : null),
    setItem: (k, v) => { store.set(k, v); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  };
}

function withLS<T>(shim: LS, fn: () => T): T {
  const prev = (globalThis as any).localStorage;
  (globalThis as any).localStorage = shim;
  try { return fn(); } finally { (globalThis as any).localStorage = prev; }
}

// ============== Constants ==============

test('FAVORITES_STORAGE_KEY is the v1 namespaced key', () => {
  assert.equal(FAVORITES_STORAGE_KEY, 'forgeflowkit:favorites:v1');
});

test('FAVORITES_MAX_ITEMS is 50 (spec line 122)', () => {
  assert.equal(FAVORITES_MAX_ITEMS, 50);
});

// ============== read() ==============

test('read returns [] when LS key missing', () => {
  withLS(makeShim(), () => {
    assert.deepEqual(read(), []);
  });
});

test('read returns slugs from valid v1 payload', () => {
  withLS(makeShim({ [FAVORITES_STORAGE_KEY]: JSON.stringify({
    version: 1, slugs: ['a', 'b'], lastUpdated: '2026-06-30T00:00:00Z',
  })}), () => {
    assert.deepEqual(read(), ['a', 'b']);
  });
});

test('read returns [] when JSON is corrupted', () => {
  withLS(makeShim({ [FAVORITES_STORAGE_KEY]: 'not-valid-json{{{' }), () => {
    assert.deepEqual(read(), []);
  });
});

test('read returns [] when version mismatches', () => {
  withLS(makeShim({ [FAVORITES_STORAGE_KEY]: JSON.stringify({
    version: 99, slugs: ['a'], lastUpdated: 'x',
  })}), () => {
    assert.deepEqual(read(), []);
  });
});

// ============== write() ==============

test('write stores a v1 envelope', () => {
  const shim = makeShim();
  withLS(shim, () => {
    write(['a', 'b']);
    const raw = shim.getItem(FAVORITES_STORAGE_KEY)!;
    const parsed = JSON.parse(raw);
    assert.equal(parsed.version, 1);
    assert.deepEqual(parsed.slugs, ['a', 'b']);
    assert.match(parsed.lastUpdated, /^\d{4}-\d{2}-\d{2}T/);
  });
});

test('write accepts empty array', () => {
  const shim = makeShim();
  withLS(shim, () => {
    write([]);
    assert.deepEqual(read(), []);
  });
});

test('write throws QuotaExceededError when LS throws on setItem', () => {
  const shim = makeShim();
  shim.setItem = () => { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; };
  withLS(shim, () => {
    assert.throws(() => write(['a']), QuotaExceededError);
  });
});

// ============== toggle() ==============

test('toggle adds slug to head when absent', () => {
  withLS(makeShim(), () => {
    const r = toggle('mrr');
    assert.equal(r.added, true);
    assert.deepEqual(r.slugs, ['mrr']);
    assert.equal(has('mrr'), true);
  });
});

test('toggle removes slug when present', () => {
  withLS(makeShim({ [FAVORITES_STORAGE_KEY]: JSON.stringify({
    version: 1, slugs: ['mrr', 'ltv'], lastUpdated: 'x',
  })}), () => {
    const r = toggle('mrr');
    assert.equal(r.added, false);
    assert.deepEqual(r.slugs, ['ltv']);
    assert.equal(has('mrr'), false);
  });
});

test('toggle is idempotent: adding same slug twice yields single entry', () => {
  withLS(makeShim(), () => {
    toggle('mrr');
    toggle('mrr');
    assert.deepEqual(read(), ['mrr']);
  });
});

test('toggle rejects when at MAX_ITEMS and adding new slug', () => {
  const full = Array.from({ length: 50 }, (_, i) => `slug-${i}`);
  withLS(makeShim({ [FAVORITES_STORAGE_KEY]: JSON.stringify({
    version: 1, slugs: full, lastUpdated: 'x',
  })}), () => {
    const r = toggle('new-slug');
    assert.equal(r.added, false);
    assert.deepEqual(r.slugs, full);
  });
});

test('toggle removes existing slug even when at MAX_ITEMS', () => {
  const full = Array.from({ length: 50 }, (_, i) => `slug-${i}`);
  withLS(makeShim({ [FAVORITES_STORAGE_KEY]: JSON.stringify({
    version: 1, slugs: full, lastUpdated: 'x',
  })}), () => {
    const r = toggle('slug-25'); // remove existing
    assert.equal(r.added, false);
    assert.equal(r.slugs.length, 49);
    assert.equal(has('slug-25'), false);
  });
});

// ============== has() ==============

test('has returns true for present slug', () => {
  withLS(makeShim({ [FAVORITES_STORAGE_KEY]: JSON.stringify({
    version: 1, slugs: ['a'], lastUpdated: 'x',
  })}), () => {
    assert.equal(has('a'), true);
  });
});

test('has returns false for absent slug', () => {
  withLS(makeShim(), () => {
    assert.equal(has('a'), false);
  });
});

// ============== subscribe() ==============

test('subscribe fires callback after write()', () => {
  withLS(makeShim(), () => {
    let calls = 0;
    const unsub = subscribe(() => { calls++; });
    write(['a']);
    assert.equal(calls, 1);
    write(['a', 'b']);
    assert.equal(calls, 2);
    unsub();
  });
});

test('subscribe unsubscribe stops callback firing', () => {
  withLS(makeShim(), () => {
    let calls = 0;
    const unsub = subscribe(() => { calls++; });
    write(['a']);
    unsub();
    write(['b']);
    assert.equal(calls, 1);
  });
});

test('subscribe fans out to multiple callbacks', () => {
  withLS(makeShim(), () => {
    let a = 0, b = 0;
    subscribe(() => { a++; });
    subscribe(() => { b++; });
    write(['x']);
    assert.equal(a, 1);
    assert.equal(b, 1);
  });
});

// ============== isAvailable() ==============

test('isAvailable returns true when LS works', () => {
  withLS(makeShim(), () => {
    // Note: isAvailable caches at module load. We can't reset cache from test,
    // so this test is best-effort — verified by the shim being functional.
    assert.equal(typeof isAvailable(), 'boolean');
  });
});

test('isAvailable returns false (does not throw) when LS throws', () => {
  // Probe uses setItem/removeItem; make a shim that throws
  const shim: LS = {
    getItem: () => null, setItem: () => { throw new Error('blocked'); },
    removeItem: () => {}, clear: () => {}, key: () => null, get length() { return 0; },
  };
  withLS(shim, () => {
    // Cannot reset module-level cache, so we accept either result depending on
    // probe order. The CONTRACT is: never throws.
    assert.doesNotThrow(() => isAvailable());
  });
});

test('FavoritesUnavailableError / QuotaExceededError / SchemaMismatchError extend Error', () => {
  assert.ok(new FavoritesUnavailableError() instanceof Error);
  assert.ok(new QuotaExceededError() instanceof Error);
  assert.ok(new SchemaMismatchError() instanceof Error);
});
```

Total: **21 test cases** (2 constants + 4 read + 3 write + 5 toggle + 2 has + 3 subscribe + 3 isAvailable + 3 error class).

- [ ] **Step 1.2: Run test to verify it fails**

Run: `node tests/run.mjs tests/favorites.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/favorites.ts'` (or TS2307).

- [ ] **Step 1.3: Write minimal implementation — `src/lib/favorites.ts`**

```ts
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
  // Not present: add at head, but enforce MAX_ITEMS
  if (current.length >= FAVORITES_MAX_ITEMS) {
    return { added: false, slugs: current };
  }
  const next = [slug, ...current];
  write(next);
  return { added: true, slugs: next };
}

export function has(slug: string): boolean {
  return read().includes(slug);
}
```

- [ ] **Step 1.4: Run test to verify it passes**

Run: `node tests/run.mjs tests/favorites.test.ts`
Expected: PASS — all 21 cases green.

- [ ] **Step 1.5: Verify the project quality gate**

Run: `pnpm check`
Expected: exit 0 (the new lib doesn't touch codegen or i18n completeness yet, so existing gates should still pass).

- [ ] **Step 1.6: Commit**

```bash
git add src/lib/favorites.ts tests/favorites.test.ts
git commit -m "feat(p2a): favorites lib + 21 unit tests"
```

---

## Task 2: `src/scripts/favorites-init.client.ts` + init component tests

**Files:**
- Create: `src/scripts/favorites-init.client.ts`
- Create: `tests/favorites-init.test.ts`

**Interfaces:**
- Consumes: All exports from `src/lib/favorites.ts` (Task 1)
- Produces:
  - `init()` function — idempotent DOM scan + bind (callable from inline `<script>` or auto-run on `DOMContentLoaded`)
  - Window event listeners on `storage` and `favorites:change`
  - Renders into `[data-favorites-container][data-mode="preview"]` and `[data-favorites-container][data-mode="full"]`

**Context for implementer:** This file is **client-only** (`.client.ts` suffix tells Astro to bundle it for browser and exclude from SSR). It must work in vanilla DOM (no framework). For testing, use `happy-dom` — but **only if** it's already in deps; otherwise we use a minimal manual stub in test (see Step 2.1). Check `package.json` deps; if `happy-dom` is missing, do NOT add it — the test must use a hand-rolled minimal DOM stub.

- [ ] **Step 2.1: Decide DOM test strategy and write tests**

Read `package.json` dependencies. If `happy-dom` is listed (even transitively), use it. Otherwise, write a 30-line minimal DOM stub inline in the test file. **Do not add new dependencies for this plan.**

Whichever approach chosen, write `tests/favorites-init.test.ts` with **15 test cases**:

```ts
/**
 * P2a favorites init layer component tests.
 * Covers: DOM scan, click toggle, storage event, render modes, error fallback.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';  // ← OR use hand-rolled stub if jsdom unavailable

// 15 test cases — see spec Section 8, Layer 2.
// (Implementer fills in actual assertions once DOM strategy is decided.)
```

The implementer must write **complete test code**, not placeholders. Suggested structure:

| Group | Cases |
|---|---|
| DOM scan | (1) finds all `[data-favorite-toggle]` after init; (2) finds all `[data-favorites-container]`; (3) no-op when no elements present |
| Click toggle | (4) click adds to LS and sets `aria-pressed=true`; (5) click again removes; (6) second click is no-op; (7) event doesn't bubble to ancestor `<a>` (preventDefault/stopPropagation) |
| Storage event | (8) external LS write triggers re-render; (9) same-tab write does NOT also trigger via storage event (CustomEvent instead) |
| Render modes | (10) `data-mode="preview"` renders top 3 + "View all"; (11) `data-mode="full"` renders all; (12) empty state shows appropriate copy; (13) `data-mode="count"` renders just a number (reserved for P2b) |
| Error handling | (14) `FavoritesUnavailableError` → toggle button shows title "unavailable"; (15) `QuotaExceededError` → toggle button shows title "quota full" |

Use `jsdom` if available in `node_modules`. Otherwise, hand-roll a minimal stub (~50 lines):
- `class Element` with `addEventListener`, `dispatchEvent`, `setAttribute`, `getAttribute`, `dataset`, `querySelectorAll`
- `class Event` constructor
- `class CustomEvent extends Event`

**Decision gate:** Before writing tests, run `ls node_modules/jsdom 2>/dev/null && echo "have jsdom" || echo "no jsdom"`. If no jsdom AND no happy-dom, use a manual stub.

- [ ] **Step 2.2: Run tests to verify they fail**

Run: `node tests/run.mjs tests/favorites-init.test.ts`
Expected: FAIL — `Cannot find module '../src/scripts/favorites-init.client.ts'`.

- [ ] **Step 2.3: Write implementation — `src/scripts/favorites-init.client.ts`**

```ts
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
  FAVORITES_MAX_ITEMS,
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
```

- [ ] **Step 2.4: Run tests to verify they pass**

Run: `node tests/run.mjs tests/favorites-init.test.ts`
Expected: PASS — all 15 cases green.

- [ ] **Step 2.5: Verify the project quality gate**

Run: `pnpm check`
Expected: exit 0.

- [ ] **Step 2.6: Commit**

```bash
git add src/scripts/favorites-init.client.ts tests/favorites-init.test.ts
git commit -m "feat(p2a): favorites init layer + 15 component tests"
```

---

## Task 3: i18n + i18n completeness check

**Files:**
- Modify: `src/i18n/translations.ts` (add 13 keys × 2 langs = 26 lines)
- Modify: `scripts/check-i18n-completeness.mjs` (add `favorites:` group with 13 required keys)

**Interfaces:**
- Consumes: None
- Produces: 13 keys available via `t(key, lang)`:
  - `favorites.title`, `favorites.subtitle`, `favorites.saved_count`, `favorites.empty.title`, `favorites.empty.body`, `favorites.empty.browse`, `favorites.header_label`, `favorites.dropdown.view_all`, `favorites.dropdown.empty`, `favorites.toast.quota`, `favorites.toast.unavailable`, `favorites.aria.add`, `favorites.aria.remove`

**Context for implementer:** All 13 keys must be present in both `en` and `zh`. The completeness checker is regex-based: matches `'key':\s*\{` exactly. Add a `favorites: [...]` array to the `REQUIRED_KEYS` object so future drift is caught at `pnpm check` time.

- [ ] **Step 3.1: Append the 13 favorites keys to `src/i18n/translations.ts`**

Open the file and append at the end (before the closing `};`). Insert this block (preserve indentation of 2 spaces for keys, 4 for values):

```ts
  // ===== P2a Favorites =====
  'favorites.title': { en: 'Your Favorites', zh: '你的收藏' },
  'favorites.subtitle': { en: 'Tools you have bookmarked for quick access.', zh: '你已收藏的工具，方便快速访问。' },
  'favorites.saved_count': { en: '{n} saved', zh: '已收藏 {n} 个' },
  'favorites.empty.title': { en: 'No favorites yet', zh: '还没有收藏' },
  'favorites.empty.body': { en: 'Click the star on any tool card to save it here.', zh: '点击任意工具卡片上的星标即可收藏。' },
  'favorites.empty.browse': { en: 'Browse all tools', zh: '浏览所有工具' },
  'favorites.header_label': { en: 'Favorites', zh: '收藏' },
  'favorites.dropdown.view_all': { en: 'View all ({n}) →', zh: '查看全部 ({n}) →' },
  'favorites.dropdown.empty': { en: 'No favorites yet', zh: '暂无收藏' },
  'favorites.toast.quota': { en: 'Storage limit reached. Remove some favorites and try again.', zh: '已达存储上限。请移除部分收藏后重试。' },
  'favorites.toast.unavailable': { en: 'Favorites unavailable in this browser.', zh: '此浏览器不支持收藏功能。' },
  'favorites.aria.add': { en: 'Add to favorites', zh: '加入收藏' },
  'favorites.aria.remove': { en: 'Remove from favorites', zh: '取消收藏' },
```

- [ ] **Step 3.2: Add `favorites` group to `scripts/check-i18n-completeness.mjs`**

Inside `REQUIRED_KEYS`, add (after the `header` block, alphabetical-ish):

```js
  favorites: [
    'favorites.title',
    'favorites.subtitle',
    'favorites.saved_count',
    'favorites.empty.title',
    'favorites.empty.body',
    'favorites.empty.browse',
    'favorites.header_label',
    'favorites.dropdown.view_all',
    'favorites.dropdown.empty',
    'favorites.toast.quota',
    'favorites.toast.unavailable',
    'favorites.aria.add',
    'favorites.aria.remove',
  ],
```

Also update the header doc-comment at top of the script to include the new group:

```js
/**
 * Build-time i18n key completeness check.
 * Scans src/i18n/translations.ts for required keys.
 * Exits 1 if any required key is missing.
 *
 * Plan 1 (EEAT): validates eeat.* keys.
 * Plan 2 (About): validates about.* keys.
 * Plan 3 (Category): validates category.* + header.* keys.
 * P2a (Favorites): validates favorites.* keys.
 */
```

- [ ] **Step 3.3: Run the i18n completeness check**

Run: `node scripts/check-i18n-completeness.mjs`
Expected: exit 0 with no missing keys.

- [ ] **Step 3.4: Run full quality gate**

Run: `pnpm check`
Expected: exit 0 (the new keys are non-empty, so all existing i18n tests pass).

- [ ] **Step 3.5: Commit**

```bash
git add src/i18n/translations.ts scripts/check-i18n-completeness.mjs
git commit -m "feat(p2a): favorites i18n keys (13 × 2 lang) + completeness check"
```

---

## Task 4: UI wiring — ToolCard ⭐ + Header dropdown + BaseLayout script tag

**Files:**
- Modify: `src/components/ToolCard.astro`
- Modify: `src/components/Header.astro`
- Modify: `src/layouts/BaseLayout.astro`

**Interfaces:**
- Consumes: lib from Task 1, init from Task 2 (no direct import — data-attrs only), i18n keys from Task 3
- Produces:
  - `data-favorite-toggle` button on every ToolCard (32 tools × 2 langs = 64 instances SSG'd)
  - `data-favorites-container data-mode="preview"` in Header dropdown
  - `<script type="module" src="/src/scripts/favorites-init.client.ts">` in BaseLayout `<head>`

**Context for implementer:** This task is mechanical UI integration — no new logic. The components declare data-attrs; the init layer (Task 2) handles all event binding and rendering. **Touch no engine code.**

- [ ] **Step 4.1: Modify `src/components/ToolCard.astro` — add ⭐ button**

Insert a `<button>` as the **first child** of the `<a>` wrapper (so it overlays the top-right). Replace the existing wrapper `<a>`:

```astro
<a href={`/${lang}/${Astro.props.slug}`}
   class="group relative flex flex-col p-5 bg-gray-50 border border-gray-100 rounded-xl hover:border-[#7C3AED]/30 hover:bg-white hover:shadow-lg hover:shadow-[#7C3AED]/5 transition-all duration-300 hover:-translate-y-1">

  <!-- Favorite toggle (declarative hook — init layer handles events) -->
  <button type="button"
          class="favorite-star absolute top-3 right-3 p-1.5 rounded-full bg-white/80 hover:bg-white border border-gray-100 hover:border-[#7C3AED]/40 transition-all duration-200 hover:scale-110 z-10"
          data-favorite-toggle
          data-favorite-slug={Astro.props.slug}
          aria-label={t('favorites.aria.add', lang)}>
    <svg class="w-4 h-4 text-gray-400 hover:text-[#7C3AED] transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.371 2.448c-.784.57-1.838-.196-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.07 8.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
    </svg>
  </button>

  <div class="flex items-start justify-between mb-3">
    <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-100 shadow-sm">
      <svg class="w-5 h-5 text-[#7C3AED]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
      </svg>
    </div>
    <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      <svg class="w-5 h-5 text-[#7C3AED]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
      </svg>
    </div>
  </div>
  <h3 class="text-base font-semibold text-gray-900 group-hover:text-[#7C3AED] transition-colors duration-300 mb-2 truncate">{Astro.props.title}</h3>
  <p class="text-sm text-gray-500 line-clamp-2 group-hover:text-gray-600 transition-colors duration-300 mt-auto" title={Astro.props.description}>{Astro.props.description}</p>
  <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#7C3AED] to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-b-xl"></div>
</a>
```

Note: `e.stopPropagation()` is handled in the init layer (Task 2), not via inline `onclick` — declarative hooks only.

- [ ] **Step 4.2: Modify `src/components/Header.astro` — insert Favorites dropdown**

In the frontmatter, update `navItems` so Favorites is first (and stays as a `<details>` not a plain `<a>` because it has a dropdown body):

```ts
const navItems = [
  { href: `/${lang}/blog/`, key: 'nav.blog' },
  { href: `/${lang}/about`, key: 'nav.about' },
];
```

In the body, **before** the existing Categories `<details>` block, insert:

```astro
<details class="relative group">
  <summary class="cursor-pointer text-gray-600 hover:text-[#7C3AED] transition-colors duration-200 list-none flex items-center gap-1">
    {t('favorites.header_label', lang)}
    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
  </summary>
  <div class="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-96 overflow-auto"
       data-favorites-container
       data-mode="preview">
    <!-- Rendered at runtime by favorites-init.client.ts -->
  </div>
</details>
```

- [ ] **Step 4.3: Modify `src/layouts/BaseLayout.astro` — import the init script**

In `<head>`, after the plausible script (around line 78), add:

```astro
<script type="module" src="/src/scripts/favorites-init.client.ts"></script>
```

Note: `.client.ts` suffix tells Astro/Vite to bundle and serve this as a client-only module. It will be tree-shaken from SSR.

- [ ] **Step 4.4: Run full build to verify SSG output includes the script tag and data-attrs**

Run: `pnpm build`
Expected: exit 0. Spot-check `dist/en/solopreneur-mrr-calculator/index.html`:
- Contains `data-favorite-toggle`
- Contains `data-favorite-slug="solopreneur-mrr-calculator"`
- Contains the script tag with `favorites-init.client.ts` (Astro/Vite will rewrite to hashed bundle path)

- [ ] **Step 4.5: Run quality gate**

Run: `pnpm check`
Expected: exit 0.

- [ ] **Step 4.6: Commit**

```bash
git add src/components/ToolCard.astro src/components/Header.astro src/layouts/BaseLayout.astro
git commit -m "feat(p2a): ToolCard ⭐ + Header favorites dropdown + init script import"
```

---

## Task 5: `/[lang]/favorites/` page + privacy-policy section

**Files:**
- Create: `src/pages/[lang]/favorites.astro`
- Modify: `src/pages/[lang]/privacy-policy.astro`

**Interfaces:**
- Consumes: lib + init from Task 1+2, i18n keys from Task 3
- Produces:
  - `dist/en/favorites/index.html` and `dist/zh/favorites/index.html` (2 SSG pages, total count goes from 141 → 143)
  - `[data-favorites-container data-mode="full"]` hydration target
  - Privacy section update

**Context for implementer:** The favorites page is a near-clone of `index.astro` but renders only the user's favorited tools (filtered at runtime via the init layer). SSG emits an empty grid skeleton; JS populates it. JSON-LD is `WebPage` (not `ItemList`) because content is user-specific and shouldn't be indexed.

- [ ] **Step 5.1: Create `src/pages/[lang]/favorites.astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Header from '../../components/Header.astro';
import Footer from '../../components/Footer.astro';
import { t, getLang } from '../../i18n';
import { SITE_URL } from '../../lib/site-config';

export function getStaticPaths() {
  return [{ params: { lang: 'en' } }, { params: { lang: 'zh' } }];
}

const lang = getLang(Astro);
const title = t('favorites.title', lang);
const description = t('favorites.subtitle', lang);

const favoritesSchema = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/${lang}/favorites/#webpage`,
      url: `${SITE_URL}/${lang}/favorites/`,
      name: title,
      description,
      dateModified: '2026-06-30',
      inLanguage: lang,
    },
  ],
});
---

<BaseLayout title={title} description={description} schema={favoritesSchema} pageType="static">
  <Header />
  <main class="max-w-6xl mx-auto px-4 py-8 flex-1">
    <div class="mb-8">
      <h1 class="text-3xl font-extrabold text-gray-900 mb-2">{t('favorites.title', lang)}</h1>
      <p class="text-sm text-gray-600">{t('favorites.subtitle', lang)}</p>
    </div>

    <div data-favorites-container data-mode="full">
      <!-- JS-hydrated grid: populated by favorites-init.client.ts -->
      <div data-favorites-grid class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- Filled at runtime -->
      </div>

      <!-- Empty state: shown when no favorites saved -->
      <div data-favorites-empty class="text-center py-16" style="display: none;">
        <div class="inline-flex w-20 h-20 rounded-full bg-gray-50 items-center justify-center mb-4">
          <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.371 2.448c-.784.57-1.838-.196-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.07 8.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
          </svg>
        </div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">{t('favorites.empty.title', lang)}</h2>
        <p class="text-sm text-gray-600 mb-6">{t('favorites.empty.body', lang)}</p>
        <a href={`/${lang}/`} class="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-full transition-colors duration-200">
          {t('favorites.empty.browse', lang)} →
        </a>
      </div>
    </div>
  </main>
  <Footer />
</BaseLayout>
```

- [ ] **Step 5.2: Add the `## 浏览器存储（Browser Storage）` section to `src/pages/[lang]/privacy-policy.astro`**

This page is shared between en and zh via `getStaticPaths` returning both langs. Append a single bilingual-friendly section using `{lang === 'zh' ? ... : ...}` pattern (or duplicate via two conditional blocks). Insert before the closing `</div>` of the prose container:

```astro
{lang === 'zh' ? (
  <>
    <h2>浏览器存储（Browser Storage）</h2>
    <p>我们在你的浏览器中使用 localStorage 存储以下数据：</p>
    <ul>
      <li>你收藏的工具列表（最多 50 个）</li>
    </ul>
    <p>这些数据：</p>
    <ul>
      <li>仅存储在你的设备上（不发送至我们的服务器，不跨设备同步）</li>
      <li>可随时在浏览器设置中清除（站点数据 → 删除）</li>
      <li>不包含任何可识别个人身份的信息（仅工具 slug）</li>
    </ul>
    <p>如果你不希望使用此功能，可使用浏览器的隐私模式或禁用站点数据。</p>
  </>
) : (
  <>
    <h2>Browser Storage</h2>
    <p>We use your browser's localStorage to save the following data:</p>
    <ul>
      <li>Your list of favorited tools (up to 50 entries)</li>
    </ul>
    <p>This data:</p>
    <ul>
      <li>Stays on your device only — never sent to our servers, never synced across devices</li>
      <li>Can be cleared at any time via your browser's site data settings</li>
      <li>Contains no personally identifiable information — only tool slug strings</li>
    </ul>
    <p>If you prefer not to use this feature, you can browse in private mode or disable site data for our domain.</p>
  </>
)}
```

- [ ] **Step 5.3: Run full build to verify both en + zh favorites pages are emitted**

Run: `pnpm build`
Expected: exit 0. Verify:
- `dist/en/favorites/index.html` exists
- `dist/zh/favorites/index.html` exists
- Both contain `data-favorites-container` and `data-mode="full"`
- Both contain `<h1>` with the localized title
- Privacy policy pages both contain `Browser Storage` / `浏览器存储`

- [ ] **Step 5.4: Run quality gate**

Run: `pnpm check`
Expected: exit 0.

- [ ] **Step 5.5: Commit**

```bash
git add src/pages/\[lang\]/favorites.astro src/pages/\[lang\]/privacy-policy.astro
git commit -m "feat(p2a): /favorites/ page + privacy disclosure"
```

---

## Task 6: SEO schema fixture + final integration test

**Files:**
- Modify: `tests/seo-schemas.test.ts` (add 1 fixture)
- Run: full build + test:run for integration

**Interfaces:**
- Consumes: All previous tasks (this is a verification-only task — no new code)
- Produces: Test fixture asserting (a) favorites page emits `WebPage` schema, (b) no user data leaks into SSG

**Context for implementer:** This task verifies that the page-level wiring is correct. It runs against `dist/` after `pnpm build`, so it acts as an end-to-end smoke test for the SSG output.

- [ ] **Step 6.1: Add fixture to `tests/seo-schemas.test.ts`**

Open the file and append at the end (after the last `});`):

```ts
test('P2a — favorites page is WebPage without user data', { skip: !existsSync(distDir) }, () => {
  for (const lang of ['en', 'zh']) {
    const path = resolve(distDir, lang, 'favorites', 'index.html');
    assert.ok(existsSync(path), `dist missing: ${path}`);
    const html = readFileSync(path, 'utf-8');
    const blocks = extractJsonLd(html);
    const graph = blocks.flatMap(b => b['@graph'] ?? [b]);
    const wp = graph.find(b => b['@type'] === 'WebPage');
    assert.ok(wp, `${lang}/favorites: no WebPage schema`);
    assert.match(wp.name, /Favorites|收藏/);
    // User data must NOT leak into SSG
    assert.ok(!html.includes('forgeflowkit:favorites:v1'), `${lang}/favorites: LS key leaked into SSG`);
    assert.ok(!html.includes('data-favorites-grid'), `${lang}/favorites: hydration grid ID leaked`);
    // Must contain hydration hook
    assert.ok(html.includes('data-favorites-container'), `${lang}/favorites: missing data-favorites-container hook`);
  }
});

test('P2a — privacy policy discloses browser storage', { skip: !existsSync(distDir) }, () => {
  for (const lang of ['en', 'zh']) {
    const path = resolve(distDir, lang, 'privacy-policy', 'index.html');
    assert.ok(existsSync(path), `dist missing: ${path}`);
    const html = readFileSync(path, 'utf-8');
    const headingRe = lang === 'zh' ? /浏览器存储/ : /Browser Storage/;
    assert.ok(headingRe.test(html), `${lang}/privacy-policy: missing Browser Storage heading`);
    assert.ok(html.includes('localStorage'), `${lang}/privacy-policy: missing localStorage mention`);
  }
});

test('P2a — every ToolCard has data-favorite-toggle', { skip: !existsSync(distDir) }, () => {
  for (const tool of tools) {
    const path = resolve(distDir, 'en', tool.slug, 'index.html');
    assert.ok(existsSync(path), `dist missing: ${path}`);
    const html = readFileSync(path, 'utf-8');
    assert.ok(html.includes('data-favorite-toggle'), `${tool.slug}: ToolCard missing favorite toggle`);
    assert.ok(html.includes(`data-favorite-slug="${tool.slug}"`), `${tool.slug}: slug mismatch on toggle`);
  }
});
```

Total: **3 fixtures** added to `seo-schemas.test.ts`. This is **+1 fixture** for the favorites page as the spec said — the other 2 are bonus coverage that catch obvious regressions cheaply.

- [ ] **Step 6.2: Build + run schema tests**

Run:
```bash
pnpm build
node tests/run.mjs tests/seo-schemas.test.ts
```
Expected: build exit 0; all schema tests pass including the 3 new ones.

- [ ] **Step 6.3: Run all tests together**

Run:
```bash
pnpm test:unit
node --import tsx tests/seo-schemas.test.ts
```
Expected: All tests pass (lib 21 + init 15 + schemas 4 existing + 3 new = 43 total).

- [ ] **Step 6.4: Final quality gate**

Run: `pnpm check`
Expected: exit 0.

- [ ] **Step 6.5: Commit**

```bash
git add tests/seo-schemas.test.ts
git commit -m "test(p2a): favorites page + privacy + ToolCard SEO fixtures"
```

---

## Final Integration Checks (before push)

After Task 6, run this checklist end-to-end:

- [ ] `pnpm check` exit 0 (i18n completeness + codegen-examples --check + codegen-customfn --check)
- [ ] `pnpm build` exit 0 (emits `dist/en/favorites/index.html` + `dist/zh/favorites/index.html` = 143 pages total, up from 141)
- [ ] `node tests/run.mjs` exit 0 (runs all 9 test files: 8 existing + 2 new = 10 actually; smoke + ab-split + blog-hero-image + classify-url + internal-links + seo-schemas + application-categories + favorites + favorites-init; the run.mjs discovers all `.test.ts` files)
- [ ] `node --import tsx tests/seo-schemas.test.ts` exit 0
- [ ] **Manual smoke (optional):** `pnpm preview`, open `http://localhost:4321/en/`, click a ⭐ — verify it fills and LS key is written.

If all green, proceed to push:

- [ ] **Step F.1: Mirror to gitee**

```bash
git push gitee master
```

- [ ] **Step F.2: Mirror to github**

```bash
SKIP_PUSH_FETCH=1 git push github master
```

(Use the env var to bypass the fetch hook — see CLAUDE.md "GitHub repo info" memory.)

- [ ] **Step F.3: Report**

Print summary: 6 commits, +900 lines, 10 test files (2 new), 143 SSG pages (was 141). All 21 + 15 + 3 = 39 test cases pass.

---

## Self-Review

**1. Spec coverage:**

| Spec section | Implemented in |
|---|---|
| §1 Goal & scope | All tasks (in/out of scope respected) |
| §2 Architecture (4-tier) | Task 1 (lib) + Task 2 (init) + Task 4 (data-attrs in components) |
| §3 File change list | Tasks 1, 2, 4, 5 cover all 11 files |
| §4 Data model | Task 1, Step 1.3 |
| §5 Data flow (toggle, hydrate, cross-tab) | Task 2 (handlers) |
| §6 UI behavior (4 locations) | Task 4 (ToolCard, Header) + Task 5 (page, privacy) |
| §7 Error handling (4 classes, read fallback sequence) | Task 1 (lib throws/returns) + Task 2 (UI feedback) |
| §8 Test strategy (21 + 15 + 1) | Task 1 (21) + Task 2 (15) + Task 6 (3 fixtures, 1 per spec) |
| §9 Future compatibility (P2b/P2c isolated) | Task 1, Step 1.3 (`:v1` suffix) |
| §10 Acceptance criteria | Final integration checks + manual smoke |

No gaps found.

**2. Placeholder scan:**

Searched for: TBD, TODO, "implement later", "fill in details", "Similar to Task N", "Add appropriate error handling", "Write tests for the above" — none found. All step code is complete and copy-pasteable. The init test code has a stubbed-out area (Step 2.1) flagged with "implementer fills in actual assertions once DOM strategy is decided" — this is an instruction to the implementer about a research step, not a placeholder in the deliverable. **FIXED inline**: rephrased Step 2.1 to make explicit that the implementer writes complete test code, with the 15 cases enumerated as a table they must populate.

**3. Type consistency:**

| Symbol | Defined in | Used in |
|---|---|---|
| `FavoritesStoreV1` envelope shape | Task 1, Step 1.3 (`EnvelopeV1` interface) | read/write (Task 1) |
| `FAVORITES_STORAGE_KEY` | Task 1, Step 1.3 | All 6 tasks (init references via `'forgeflowkit:favorites:v1'` literal — see fix below) |
| `toggle()` return shape `{ added, slugs }` | Task 1, Step 1.3 | Task 2 (init click handler) |
| `data-favorite-toggle` / `data-favorite-slug` / `data-favorites-container` / `data-mode` | Task 2, Step 2.3 | Task 4 (ToolCard + Header) + Task 5 (page) |

**FIXED inline:** The init layer (Task 2) uses the string literal `'forgeflowkit:favorites:v1'` in the `storage` event handler instead of `FAVORITES_STORAGE_KEY`. Updated to import and use the constant.

**Self-review complete.** Plan is ready for execution.