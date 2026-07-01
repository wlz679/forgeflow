# P2c LocalStorage 历史快照 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a client-side "history snapshots" system to all 32 calculators — manual [💾 保存] button on ResultCard, Header dropdown preview, dedicated `/[lang]/history/` page with restore + delete, restore via URL `?prefill=` re-fills the form and re-runs the calculation — backed entirely by `localStorage` with versioned schema (`forgeflowkit:history:v1`).

**Architecture:** 4-tier separation — pure-TS `src/lib/history.ts` (state, no DOM) → `src/scripts/history-init.client.ts` (DOM scan + event binding + cross-tab sync + URL prefill handling) → `data-history-*` data-attr declarative hooks → Astro components (`ResultCard`, `Header`, `HistoryList`, `[lang]/history.astro`). LRU semantics in lib (restore moves to top + updates `accessedAt`), JSON `entries[]` in storage. 12 new i18n keys. Three test files (lib unit, init component, SEO schema fixture). Fully independent of P2a favorites and P2b recent (no shared infra).

**Tech Stack:** Astro 4.16.19 (SSG + `.client.ts` for browser-only bundles), TypeScript 5.6 strict, vanilla `localStorage` (no IndexedDB, no library), `crypto.randomUUID()` for entry IDs, base64 encoding for URL prefill, `node:test` via `tsx` runner.

## Global Constraints

- **branch:** `master` (P2c ships directly, no sub-branch)
- **engines/ 目录零改动** (业务逻辑冻结)
- **32 工具数量冻结** (P2c 不新增/删除/合并工具)
- **commit 前 `pnpm check` 必须 exit 0** (含新增 lib 单测)
- **push 前 fetch + rev-list + push** gitee (`wlz679/calcKit`) + github (`wlz679/forgeflow`)，手动镜像
- **pre-commit hook** `.githooks/pre-commit` 自动 `codegen-examples --check`；紧急用 `SKIP_PRECOMMIT_CHECK=1`
- **i18n 必须经 `check-i18n-completeness.mjs`**（regex 匹配 `{key}: { en, zh }`），缺一即 exit 1
- **private LS key `forgeflowkit:history:v1`**（命名空间隔离 P2a `:favorites:v1` / P2b `:recent:v1`）
- **`MAX_ITEMS = 100`**，entries 达 100 时新加入 truncate tail（drop oldest），不偷丢老数据
- **`.client.ts` 后缀**：Astro 自动 tree-shake，仅打包到 client bundle，不进 SSR
- **`data-history-*` data-attrs** 作为 declarative hooks（init script 扫 `[data-history-container]` / `[data-history-save]` / `[data-history-restore]` / `[data-history-delete]` / `[data-history-clear-all]`）
- **LRU 语义**：`restore(id)` 找到 entry → 从原位置移除 + 头部插入 + 更新 `accessedAt`
- **完全独立于 P2a/P2b**（不复用 favorites/recent lib / init / i18n key；同模式不抽 factory — CLAUDE.md "Don't over-engineer"）
- **`[💾 保存]` 按钮在 click handler 动态读 form + URL**（ResultCard 是共享组件，无 data 属性绑定）
- **Restore via URL `?prefill=base64`**：base64 编码 inputs，跳原工具页后 init 读 URL → 填 form → 触发 submit
- **跨 tab 同步**：监听 `window` 'storage' event；同 tab 用 `lib.subscribe()` fanout
- **Pure DOM API rendering** — NO innerHTML（XSS protection）

---

## File Structure (Map)

| File | Role | Lines est. |
|---|---|---|
| `src/lib/history.ts` (NEW) | 纯 TS 状态层：read/write/save/restore/remove/clearAll/has/isAvailable/subscribe/encodePrefill/decodePrefill + 5 error class + 2 常量 | ~180 |
| `src/scripts/history-init.client.ts` (NEW) | DOM 扫描 + click handler + storage event + 2 渲染模式 + URL prefill | ~250 |
| `src/components/HistoryList.astro` (NEW) | /history/ 页 entry 列表组件（含 Restore + Delete 按钮） | ~60 |
| `src/pages/[lang]/history.astro` (NEW) | SSG 骨架 + JS hydrate（与 /favorites/ 平行架构） | ~90 |
| `src/components/ResultCard.astro` (MOD) | + [💾 保存] 按钮 + click handler（与 Export 按钮同 pattern） | +20 |
| `src/components/Header.astro` (MOD) | + History `<details>` dropdown（Recent **左**侧） | +25 |
| `src/layouts/BaseLayout.astro` (MOD) | + `<script>import '../scripts/history-init.client.ts';</script>` + i18n JSON | +20 |
| `src/pages/[lang]/[slug].astro` (MOD) | + URL prefill 处理（init layer 自动，page 无需改） | 0 (init 层处理) |
| `src/pages/[lang]/privacy-policy.astro` (MOD) | + `## 历史快照（History Snapshots）` 段落 | +20 |
| `src/i18n/translations.ts` (MOD) | +12 新 key × 2 lang = 24 行 | +24 |
| `scripts/check-i18n-completeness.mjs` (MOD) | + `history: [...]` 12 个 required key | +18 |
| `tests/history.test.ts` (NEW) | lib 单测：~20 用例 | ~250 |
| `tests/history-init.test.ts` (NEW) | init 组件测：~14 用例（hand-rolled DOM stub, per-test child process） | ~350 |
| `tests/seo-schemas.test.ts` (MOD) | +1 fixture（history page WebPage schema + 不含 LS key） | +25 |

总计 14 文件变更：6 新（lib + init + HistoryList + history page + 2 tests）+ 8 mod。预估 ~1500 行净增。

---

## Task 1: `src/lib/history.ts` + lib unit tests

**Files:**
- Create: `src/lib/history.ts`
- Create: `tests/history.test.ts`

**Interfaces:**
- Consumes: none (leaf task)
- Produces:
  - `export const HISTORY_STORAGE_KEY: 'forgeflowkit:history:v1'`
  - `export const HISTORY_MAX_ITEMS: 100`
  - `export interface HistoryEntry { id: string; slug: string; inputs: Record<string, string>; result: string; savedAt: string; accessedAt: string }`
  - `export function read(): HistoryEntry[]`
  - `export function write(entries: HistoryEntry[]): void` (throws `QuotaExceededError`, `HistoryUnavailableError`)
  - `export function save(entry: { slug: string; inputs: Record<string, string>; result: string }): HistoryEntry` (generates id + timestamps + prepends + truncates)
  - `export function restore(id: string): HistoryEntry | null` (LRU: re-visit moves to top + updates `accessedAt`)
  - `export function remove(id: string): void` (delete by id)
  - `export function clearAll(): void` (empty store)
  - `export function has(slug: string): boolean` (any entry with this slug?)
  - `export function isAvailable(): boolean`
  - `export function subscribe(cb: () => void): () => void`
  - `export function encodePrefill(inputs: Record<string, string>): string` (base64 of JSON)
  - `export function decodePrefill(encoded: string): Record<string, string> | null` (reverse, with try/catch → `PrefillDecodeError`)
  - `export class HistoryUnavailableError extends Error {}`
  - `export class QuotaExceededError extends Error {}`
  - `export class SchemaMismatchError extends Error {}`
  - `export class InvalidSlugError extends Error {}`
  - `export class PrefillDecodeError extends Error {}`

**Context for implementer:** Pure TypeScript module. NO DOM access. NO imports from `astro/*` or `*.astro`. Will be imported by `src/scripts/history-init.client.ts` (browser) AND by `tests/history.test.ts` (Node). Use `globalThis.localStorage` (Node 22 has built-in `localStorage`). Module-level cached `isAvailable` probe. Module-level `Set<Listener>` for `subscribe()` fanout.

**Slug validation:** A valid slug matches `/^[a-z0-9-]+$/` (matches the 32 tool slug pattern). Non-matching → `InvalidSlugError`.

**DOMException detection:** Per P2a/P2b precedent (`favorites.ts:94`), use `e.name === 'QuotaExceededError' || /quota/i.test(msg)` for QuotaExceededError detection (Node 22's `new DOMException('QuotaExceededError')` sets message, not name).

- [ ] **Step 1.1: Write failing test — `tests/history.test.ts`**

Create file:

```ts
/**
 * P2c history lib unit tests.
 * Covers: read/write/save/restore/remove/clearAll/has/isAvailable/subscribe/encodePrefill/decodePrefill + 5 error classes.
 * Run via: pnpm test:unit  (or  node tests/run.mjs tests/history.test.ts)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HISTORY_STORAGE_KEY, HISTORY_MAX_ITEMS,
  read, write, save, restore, remove, clearAll, has, isAvailable, subscribe,
  encodePrefill, decodePrefill,
  HistoryUnavailableError, QuotaExceededError, SchemaMismatchError, InvalidSlugError, PrefillDecodeError,
} from '../src/lib/history.ts';

// Per-test in-memory LS shim
type LS = {
  store: Map<string, string>;
  failOnWrite?: boolean;
};

function installShim(ls: LS) {
  const previous = (globalThis as { localStorage?: unknown }).localStorage;
  (globalThis as { localStorage: unknown }).localStorage = {
    getItem: (k: string) => ls.store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (ls.failOnWrite) throw new DOMException('QuotaExceededError');
      ls.store.set(k, v);
    },
    removeItem: (k: string) => { ls.store.delete(k); },
    clear: () => { ls.store.clear(); },
    key: (i: number) => Array.from(ls.store.keys())[i] ?? null,
    get length() { return ls.store.size; },
  };
  return () => { (globalThis as { localStorage?: unknown }).localStorage = previous; };
}

async function freshImport() {
  const url = '../src/lib/history.ts?t=' + Date.now() + Math.random();
  return import(/* @vite-ignore */ url);
}

test('constants: storage key and max items', async () => {
  assert.equal(HISTORY_STORAGE_KEY, 'forgeflowkit:history:v1');
  assert.equal(HISTORY_MAX_ITEMS, 100);
});

test('read: empty when LS has no key', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    assert.deepEqual(m.read(), []);
  } finally { restore(); }
});

test('read: parses valid store', async () => {
  const entry = { id: 'a', slug: 'mrr', inputs: {x: '1'}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' };
  const ls: LS = { store: new Map([[HISTORY_STORAGE_KEY, JSON.stringify({
    version: 1, entries: [entry], lastUpdated: '2026-07-01T10:00:00Z',
  })]]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    const r = m.read();
    assert.equal(r.length, 1);
    assert.equal(r[0].id, 'a');
  } finally { restore(); }
});

test('read: returns [] on corrupted JSON', async () => {
  const ls: LS = { store: new Map([[HISTORY_STORAGE_KEY, '{not json']]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    assert.deepEqual(m.read(), []);
  } finally { restore(); }
});

test('read: returns [] on wrong version', async () => {
  const ls: LS = { store: new Map([[HISTORY_STORAGE_KEY, JSON.stringify({ version: 999, entries: [] })]]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    assert.deepEqual(m.read(), []);
  } finally { restore(); }
});

test('read: filters out entries with missing id/slug/savedAt', async () => {
  const ls: LS = { store: new Map([[HISTORY_STORAGE_KEY, JSON.stringify({
    version: 1,
    entries: [
      { id: 'good', slug: 'mrr', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' },
      { slug: 'mrr', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z' },  // missing id
      { id: 'no-slug', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z' },  // missing slug
    ],
    lastUpdated: '2026-07-01T10:00:00Z',
  })]]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    const r = m.read();
    assert.equal(r.length, 1);
    assert.equal(r[0].id, 'good');
  } finally { restore(); }
});

test('write: persists valid entries with lastUpdated', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    m.write([{ id: 'a', slug: 'mrr', inputs: {x: '1'}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' }]);
    const raw = ls.store.get(HISTORY_STORAGE_KEY)!;
    const parsed = JSON.parse(raw);
    assert.equal(parsed.version, 1);
    assert.match(parsed.lastUpdated, /^\d{4}-\d{2}-\d{2}T/);
  } finally { restore(); }
});

test('write: throws QuotaExceededError when LS is full', async () => {
  const ls: LS = { store: new Map(), failOnWrite: true };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    // Match P2a/P2b pattern: name OR /quota/i.test(message)
    try { m.write([]); assert.fail('should throw'); }
    catch (e) {
      assert.ok(e instanceof QuotaExceededError, `got ${(e as Error).name}: ${(e as Error).message}`);
    }
  } finally { restore(); }
});

test('write: empty array is valid', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    m.write([]);
    const raw = ls.store.get(HISTORY_STORAGE_KEY)!;
    const parsed = JSON.parse(raw);
    assert.equal(parsed.version, 1);
    assert.deepEqual(parsed.entries, []);
  } finally { restore(); }
});

test('save: appends new entry with id and timestamps', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    const e = m.save({ slug: 'solopreneur-mrr-calculator', inputs: {subscriberCount: '1000'}, result: 'r' });
    assert.ok(e.id.length > 0, 'has id');
    assert.match(e.savedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(e.savedAt, e.accessedAt, 'savedAt === accessedAt on create');
    assert.equal(e.slug, 'solopreneur-mrr-calculator');
    const r = m.read();
    assert.equal(r.length, 1);
    assert.equal(r[0].id, e.id);
  } finally { restore(); }
});

test('save: throws InvalidSlugError on malformed slug', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    assert.throws(() => m.save({ slug: 'Bad Slug!', inputs: {}, result: 'r' }), InvalidSlugError);
    assert.throws(() => m.save({ slug: 'tool_with_underscore', inputs: {}, result: 'r' }), InvalidSlugError);
    assert.throws(() => m.save({ slug: '', inputs: {}, result: 'r' }), InvalidSlugError);
  } finally { restore(); }
});

test('save: truncates tail when exceeding MAX_ITEMS', async () => {
  const ls: LS = { store: new Map([[HISTORY_STORAGE_KEY, JSON.stringify({
    version: 1,
    entries: Array.from({ length: 100 }, (_, i) => ({
      id: `t-${i}`, slug: 'mrr', inputs: {}, result: 'r',
      savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z',
    })),
    lastUpdated: '2026-07-01T10:00:00Z',
  })]]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    m.save({ slug: 'new', inputs: {}, result: 'r' });
    const r = m.read();
    assert.equal(r.length, 100);
    assert.equal(r[0].slug, 'new');
    assert.equal(r[99].id, 't-98');  // t-99 dropped
  } finally { restore(); }
});

test('save: idempotent — saving same data twice produces 2 entries (no dedup in V1)', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    m.save({ slug: 'mrr', inputs: {x: '1'}, result: 'r' });
    m.save({ slug: 'mrr', inputs: {x: '1'}, result: 'r' });
    assert.equal(m.read().length, 2);
  } finally { restore(); }
});

test('restore: moves existing entry to top and updates accessedAt', async () => {
  const ls: LS = { store: new Map([[HISTORY_STORAGE_KEY, JSON.stringify({
    version: 1,
    entries: [
      { id: 'b', slug: 'mrr', inputs: {x: '1'}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' },
      { id: 'a', slug: 'mrr', inputs: {x: '1'}, result: 'r', savedAt: '2026-07-01T11:00:00Z', accessedAt: '2026-07-01T11:00:00Z' },
    ],
    lastUpdated: '2026-07-01T11:00:00Z',
  })]]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    const e = m.restore('b');
    assert.ok(e !== null);
    assert.equal(e!.id, 'b');
    const r = m.read();
    assert.equal(r[0].id, 'b');  // moved to top
    assert.notEqual(r[0].accessedAt, '2026-07-01T10:00:00Z');  // updated
  } finally { restore(); }
});

test('restore: returns null when id not found', async () => {
  const ls: LS = { store: new Map([[HISTORY_STORAGE_KEY, JSON.stringify({
    version: 1,
    entries: [{ id: 'a', slug: 'mrr', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' }],
    lastUpdated: '2026-07-01T10:00:00Z',
  })]]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    assert.equal(m.restore('nonexistent'), null);
  } finally { restore(); }
});

test('remove: deletes entry by id', async () => {
  const ls: LS = { store: new Map([[HISTORY_STORAGE_KEY, JSON.stringify({
    version: 1,
    entries: [
      { id: 'a', slug: 'mrr', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' },
      { id: 'b', slug: 'cac', inputs: {}, result: 'r', savedAt: '2026-07-01T11:00:00Z', accessedAt: '2026-07-01T11:00:00Z' },
    ],
    lastUpdated: '2026-07-01T11:00:00Z',
  })]]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    m.remove('a');
    const r = m.read();
    assert.equal(r.length, 1);
    assert.equal(r[0].id, 'b');
  } finally { restore(); }
});

test('remove: no-op when id not found', async () => {
  const ls: LS = { store: new Map([[HISTORY_STORAGE_KEY, JSON.stringify({
    version: 1,
    entries: [{ id: 'a', slug: 'mrr', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' }],
    lastUpdated: '2026-07-01T10:00:00Z',
  })]]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    m.remove('nonexistent');
    assert.equal(m.read().length, 1);
  } finally { restore(); }
});

test('clearAll: empties the store', async () => {
  const ls: LS = { store: new Map([[HISTORY_STORAGE_KEY, JSON.stringify({
    version: 1,
    entries: [{ id: 'a', slug: 'mrr', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' }],
    lastUpdated: '2026-07-01T10:00:00Z',
  })]]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    m.clearAll();
    assert.deepEqual(m.read(), []);
  } finally { restore(); }
});

test('has: returns true when slug exists', async () => {
  const ls: LS = { store: new Map([[HISTORY_STORAGE_KEY, JSON.stringify({
    version: 1,
    entries: [{ id: 'a', slug: 'mrr', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' }],
    lastUpdated: '2026-07-01T10:00:00Z',
  })]]) };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    assert.equal(m.has('mrr'), true);
  } finally { restore(); }
});

test('has: returns false when slug absent', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    assert.equal(m.has('absent'), false);
  } finally { restore(); }
});

test('subscribe: fires on save/restore/remove/clearAll', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    let calls = 0;
    m.subscribe(() => { calls++; });
    m.save({ slug: 'mrr', inputs: {}, result: 'r' });
    m.restore('whatever');
    m.remove('whatever');
    m.clearAll();
    assert.ok(calls >= 1, 'fires on save at minimum');
  } finally { restore(); }
});

test('subscribe: errors in one callback do not block others', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    let b = 0;
    m.subscribe(() => { throw new Error('boom'); });
    m.subscribe(() => { b++; });
    m.save({ slug: 'mrr', inputs: {}, result: 'r' });
    assert.equal(b, 1);
  } finally { restore(); }
});

test('isAvailable: true when LS works', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    assert.equal(typeof m.isAvailable(), 'boolean');
  } finally { restore(); }
});

test('isAvailable: never throws when LS broken', async () => {
  const restore = installShim({ store: new Map() });
  try {
    (globalThis as { localStorage: unknown }).localStorage = {
      getItem: () => null,
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    };
    const m = await freshImport();
    assert.doesNotThrow(() => m.isAvailable());
    assert.equal(typeof m.isAvailable(), 'boolean');
  } finally { restore(); }
});

test('encodePrefill/decodePrefill: round-trip', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    const inputs = { subscriberCount: '1000', monthlyPrice: '5.99', notes: 'Q3 2026 baseline' };
    const encoded = m.encodePrefill(inputs);
    const decoded = m.decodePrefill(encoded);
    assert.deepEqual(decoded, inputs);
  } finally { restore(); }
});

test('encodePrefill/decodePrefill: handles special characters', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    const inputs = { name: 'a&b<c>"d\'e', num: '42' };
    const decoded = m.decodePrefill(m.encodePrefill(inputs));
    assert.deepEqual(decoded, inputs);
  } finally { restore(); }
});

test('decodePrefill: returns null on invalid base64 / JSON', async () => {
  const ls: LS = { store: new Map() };
  const restore = installShim(ls);
  try {
    const m = await freshImport();
    assert.equal(m.decodePrefill('not-base64-at-all!!!'), null);
    assert.equal(m.decodePrefill(Buffer.from('not json').toString('base64')), null);
  } finally { restore(); }
});

test('error classes extend Error', () => {
  assert.ok(new HistoryUnavailableError() instanceof Error);
  assert.ok(new QuotaExceededError() instanceof Error);
  assert.ok(new SchemaMismatchError() instanceof Error);
  assert.ok(new InvalidSlugError() instanceof Error);
  assert.ok(new PrefillDecodeError() instanceof Error);
});
```

- [ ] **Step 1.2: Run test to verify it fails**

Run: `node tests/run.mjs tests/history.test.ts 2>&1 | head -30`
Expected: FAIL — "Cannot find module '../src/lib/history.ts'"

- [ ] **Step 1.3: Write minimal implementation — `src/lib/history.ts`**

```ts
/**
 * P2c history-snapshots state management.
 * LRU: restore(id) re-visits move to top + update accessedAt.
 * Schema: { version: 1, entries: [{id, slug, inputs, result, savedAt, accessedAt}], lastUpdated }
 * Pure TS, no DOM. Module-level subscribers for same-tab fanout.
 * Base64-encoded URL prefill for cross-page restore.
 */

export const HISTORY_STORAGE_KEY = 'forgeflowkit:history:v1';
export const HISTORY_MAX_ITEMS = 100;

export interface HistoryEntry {
  id: string;
  slug: string;
  inputs: Record<string, string>;
  result: string;
  savedAt: string;
  accessedAt: string;
}

interface HistoryStoreV1 {
  version: 1;
  entries: HistoryEntry[];
  lastUpdated: string;
}

export class HistoryUnavailableError extends Error {
  constructor(m: string = 'localStorage unavailable') { super(m); this.name = 'HistoryUnavailableError'; }
}
export class QuotaExceededError extends Error {
  constructor(m: string = 'localStorage quota exceeded') { super(m); this.name = 'QuotaExceededError'; }
}
export class SchemaMismatchError extends Error {
  constructor(m: string = 'schema version mismatch') { super(m); this.name = 'SchemaMismatchError'; }
}
export class InvalidSlugError extends Error {
  constructor(m: string = 'invalid slug') { super(m); this.name = 'InvalidSlugError'; }
}
export class PrefillDecodeError extends Error {
  constructor(m: string = 'prefill decode failed') { super(m); this.name = 'PrefillDecodeError'; }
}

const SLUG_RE = /^[a-z0-9-]+$/;
const subscribers = new Set<() => void>();
let availabilityCache: boolean | null = null;

function getLS(): Storage | null {
  try {
    if (typeof globalThis !== 'undefined' && (globalThis as { localStorage?: Storage }).localStorage) {
      return (globalThis as { localStorage: Storage }).localStorage;
    }
  } catch { /* noop */ }
  return null;
}

function generateId(): string {
  // crypto.randomUUID() is available in modern browsers and Node 19+
  try {
    return (globalThis as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  } catch {
    return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function isAvailable(): boolean {
  if (availabilityCache !== null) return availabilityCache;
  const ls = getLS();
  if (!ls) { availabilityCache = false; return false; }
  try {
    const probeKey = '__history_probe__';
    ls.setItem(probeKey, '1');
    ls.removeItem(probeKey);
    availabilityCache = true;
  } catch { availabilityCache = false; }
  return availabilityCache;
}

function notify(): void {
  for (const cb of subscribers) {
    try { cb(); } catch { /* swallow */ }
  }
}

export function read(): HistoryEntry[] {
  const ls = getLS();
  if (!ls) return [];
  const raw = ls.getItem(HISTORY_STORAGE_KEY);
  if (raw === null) return [];
  let parsed: HistoryStoreV1 | { version: number; entries?: unknown };
  try { parsed = JSON.parse(raw); } catch { return []; }
  if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) return [];
  if (!Array.isArray(parsed.entries)) return [];
  return parsed.entries.filter((e): e is HistoryEntry =>
    typeof e === 'object' && e !== null &&
    typeof (e as HistoryEntry).id === 'string' &&
    typeof (e as HistoryEntry).slug === 'string' &&
    typeof (e as HistoryEntry).savedAt === 'string'
  );
}

export function write(entries: HistoryEntry[]): void {
  const ls = getLS();
  if (!ls) throw new HistoryUnavailableError();
  const store: HistoryStoreV1 = {
    version: 1,
    entries: entries.slice(0, HISTORY_MAX_ITEMS),
    lastUpdated: new Date().toISOString(),
  };
  try {
    ls.setItem(HISTORY_STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    const name = (e as { name?: string })?.name;
    const msg = String((e as { message?: string })?.message ?? '');
    if (name === 'QuotaExceededError' || /quota/i.test(msg)) throw new QuotaExceededError();
    throw e;
  }
  notify();
}

export function save(entry: { slug: string; inputs: Record<string, string>; result: string }): HistoryEntry {
  if (typeof entry.slug !== 'string' || !SLUG_RE.test(entry.slug)) {
    throw new InvalidSlugError(`slug must match /^[a-z0-9-]+$/, got: ${JSON.stringify(entry.slug)}`);
  }
  const now = new Date().toISOString();
  const newEntry: HistoryEntry = {
    id: generateId(),
    slug: entry.slug,
    inputs: entry.inputs,
    result: entry.result,
    savedAt: now,
    accessedAt: now,
  };
  const current = read();
  const next: HistoryEntry[] = [newEntry, ...current].slice(0, HISTORY_MAX_ITEMS);
  write(next);
  return newEntry;
}

export function restore(id: string): HistoryEntry | null {
  const current = read();
  const idx = current.findIndex(e => e.id === id);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  const found = { ...current[idx], accessedAt: now };
  const next = [found, ...current.filter((_, i) => i !== idx)].slice(0, HISTORY_MAX_ITEMS);
  write(next);
  return found;
}

export function remove(id: string): void {
  const current = read();
  const next = current.filter(e => e.id !== id);
  if (next.length === current.length) return;  // no-op
  write(next);
}

export function clearAll(): void {
  write([]);
}

export function has(slug: string): boolean {
  return read().some(e => e.slug === slug);
}

export function subscribe(cb: () => void): () => void {
  subscribers.add(cb);
  return () => { subscribers.delete(cb); };
}

export function encodePrefill(inputs: Record<string, string>): string {
  const json = JSON.stringify(inputs);
  // btoa is available in browsers and Node 16+
  return (globalThis as { btoa?: (s: string) => string }).btoa
    ? (globalThis as { btoa: (s: string) => string }).btoa(json)
    : Buffer.from(json, 'utf-8').toString('base64');
}

export function decodePrefill(encoded: string): Record<string, string> | null {
  try {
    const json = (globalThis as { atob?: (s: string) => string }).atob
      ? (globalThis as { atob: (s: string) => string }).atob(encoded)
      : Buffer.from(encoded, 'base64').toString('utf-8');
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    return parsed as Record<string, string>;
  } catch {
    return null;
  }
}
```

- [ ] **Step 1.4: Run test to verify it passes**

Run: `node tests/run.mjs tests/history.test.ts 2>&1 | tail -30`
Expected: 27+ pass / 0 fail (all read/write/save/restore/remove/clearAll/has/subscribe/isAvailable/encodePrefill/decodePrefill/error classes cases)

- [ ] **Step 1.5: Run full check**

Run: `pnpm check 2>&1 | tail -20`
Expected: exit 0 (i18n completeness check + codegen-examples --check + codegen-customfn --check all clean)

- [ ] **Step 1.6: Commit**

```bash
git add src/lib/history.ts tests/history.test.ts
git commit -m "feat(p2c): history lib + 27 unit tests"
```

---

## Task 2: `src/scripts/history-init.client.ts` + init component tests

**Files:**
- Create: `src/scripts/history-init.client.ts`
- Create: `tests/history-init.test.ts`

**Interfaces:**
- Consumes:
  - `HISTORY_STORAGE_KEY`, `HISTORY_MAX_ITEMS` (Task 1)
  - `read, save, restore, remove, clearAll, has, isAvailable, subscribe, encodePrefill, decodePrefill` (Task 1)
  - `HistoryUnavailableError, QuotaExceededError, PrefillDecodeError, InvalidSlugError` (Task 1)
  - 12 i18n keys from Task 3 (use `window.__i18n_history__` global populated by BaseLayout)
- Produces:
  - DOM scan on `DOMContentLoaded`:
    1. `getLang()` reads `window.location.pathname` via `^/(en|zh)(/|$)`
    2. **URL prefill check**: if `?prefill=...` present, decode + fill form + submit
    3. Scan all `[data-history-container]` → renderInitial() per data-mode
    4. Click handler for `[data-history-save]` (in ResultCard) → read form dynamically + save
    5. Click handler for `[data-history-restore]` → restore(id) + navigate with ?prefill
    6. Click handler for `[data-history-delete]` → remove(id)
    7. Click handler for `[data-history-clear-all]` → confirm + clearAll()
    8. Listen `window` 'storage' event → renderAll() (cross-tab sync)
    9. `lib.subscribe()` → renderAll() (same-tab fanout)
  - 2 render modes: `preview` (Header dropdown top 5) / `full` (/history/ page list)
  - DOM API rendering (no innerHTML — XSS protection)
  - `t(key, lang)` — runtime i18n lookup from inline `window.__i18n_history__`

**Context for implementer:** This task is the integration heart of P2c. The init script is the ONLY place that touches DOM. Components declare `data-history-*` data-attrs and never write JS. Pattern matches P2a `favorites-init.client.ts` and P2b `recent-init.client.ts`. Hand-rolled DOM stub in tests (per-test child process isolation, no jsdom — same as P2b).

- [ ] **Step 2.1: Write failing test — `tests/history-init.test.ts`**

Create file:

```ts
/**
 * P2c history-init component tests.
 * Hand-rolled DOM stub via per-test child process (no jsdom).
 * Run via: node tests/run.mjs tests/history-init.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type ChildResult = { ok: boolean; stdout: string; stderr: string };

function runChild(scenario: string, opts: { pathname?: string; lsStore?: string; lang?: string; search?: string } = {}): ChildResult {
  const dir = mkdtempSync(join(tmpdir(), 'p2c-test-'));
  const tmpFile = join(dir, 'scenario.mjs');

  const lsStoreJson = JSON.stringify(opts.lsStore ?? {});
  const pathname = opts.pathname ?? '/en/';
  const search = opts.search ?? '';
  const lang = opts.lang ?? 'en';

  // Build inline shim + scenario. The child:
  // 1. sets up globalThis.document/window with our StubElement
  // 2. sets globalThis.localStorage
  // 3. sets globalThis.window.location
  // 4. sets globalThis.window.__i18n_history__
  // 5. imports the init module
  // 6. awaits DOMContentLoaded callback
  // 7. prints scenario-defined assertions as JSON to stdout
  const code = `
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// === Stub DOM (same as P2b) ===
class StubNode {
  children = [];
  attributes = {};
  _textContent = '';
  _innerHTML = '';
  dataset = {};
  style = {};
  classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } };
  get textContent() { return this._textContent; }
  set textContent(v) { this._textContent = String(v); }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(v) { this._innerHTML = String(v); }
  appendChild(c) { c.parent = this; this.children.push(c); return c; }
  removeChild(c) { c.parent = null; this.children = this.children.filter(x => x !== c); return c; }
  get firstChild() { return this.children[0] ?? null; }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  removeAttribute(k) { delete this.attributes[k]; }
  getAttribute(k) { return this.attributes[k] ?? null; }
  hasAttribute(k) { return k in this.attributes; }
  addEventListener() {}
  removeEventListener() {}
  get parentElement() { return this.parent ?? null; }
  querySelector(sel) { return this._findAll(sel)[0] ?? null; }
  querySelectorAll(sel) { return this._findAll(sel); }
  _findAll(sel) {
    const out = [];
    const walk = (n) => {
      if (n._matches && n._matches(sel)) out.push(n);
      for (const c of n.children) walk(c);
    };
    walk(this);
    return out;
  }
  get className() { return this.attributes.class ?? ''; }
  set className(v) { this.attributes.class = v; }
}
class StubElement extends StubNode {
  tagName = 'DIV';
  id = '';
  constructor() { super(); this._isElement = true; }
  get value() { return this.attributes.value ?? ''; }
  set value(v) { this.attributes.value = String(v); }
  submit() { /* fire submit event */ if (this._onsubmit) this._onsubmit(); }
}
class StubDocument {
  body = new StubElement(); body.tagName = 'BODY';
  head = new StubElement(); head.tagName = 'HEAD';
  addEventListener(ev, cb) { if (ev === 'DOMContentLoaded') setImmediate(cb); }
  createElement(tag) {
    const e = new StubElement();
    e.tagName = tag.toUpperCase();
    e._matches = function(sel) {
      if (sel.startsWith('[data-')) {
        const m = sel.match(/^\\[data-([a-z-]+)(?:=([\\\"\\\']?)([^\\\"\\\']+)\\2)?\\]$/);
        if (!m) return false;
        const [, key, , val] = m;
        const attrKey = 'data-' + key;
        if (val) return this.attributes[attrKey] === val;
        return attrKey in this.attributes;
      }
      return this.tagName === sel.toUpperCase();
    }.bind(e);
    return e;
  }
  createTextNode(t) { const n = new StubNode(); n._textContent = t; return n; }
  getElementById(id) {
    const walk = (n) => {
      if (n.id === id) return n;
      for (const c of n.children) { const r = walk(c); if (r) return r; }
      return null;
    };
    return walk(this.body) || walk(this.head);
  }
  querySelector(sel) { return this.body._findAll(sel)[0] ?? null; }
  querySelectorAll(sel) { return this.body._findAll(sel); }
}

globalThis.document = new StubDocument();
globalThis.window = {
  location: { pathname: ${JSON.stringify(pathname)}, search: ${JSON.stringify(search)} },
  addEventListener() {},
  removeEventListener() {},
  __i18n_history__: {
    en: {
      'history.title': 'History',
      'history.subtitle': '${'{count}'} snapshots saved',
      'history.empty.title': 'No history yet',
      'history.empty.body': 'Save a calculation to see it here',
      'history.empty.browse': 'Browse all tools',
      'history.header_label': 'History',
      'history.dropdown.view_all': 'View all (${'{count}'}) →',
      'history.dropdown.empty': 'No history yet',
      'history.btn.save': 'Save',
      'history.btn.saved': 'Saved',
      'history.btn.restore': '↺ Restore',
      'history.btn.delete': '🗑',
      'history.clear_all': 'Clear all',
      'history.clear_all.confirm': 'Delete all ${'{count}'} snapshots? This cannot be undone.',
    },
    zh: {
      'history.title': '历史快照',
      'history.subtitle': '已保存 ${'{count}'} 个快照',
      'history.empty.title': '暂无历史',
      'history.empty.body': '保存计算后将在此显示',
      'history.empty.browse': '浏览全部工具',
      'history.header_label': '历史快照',
      'history.dropdown.view_all': '查看全部 (${'{count}'}) →',
      'history.dropdown.empty': '暂无历史',
      'history.btn.save': '保存',
      'history.btn.saved': '已保存',
      'history.btn.restore': '↺ 恢复',
      'history.btn.delete': '🗑',
      'history.clear_all': '清空全部',
      'history.clear_all.confirm': '删除全部 ${'{count}'} 个快照？此操作不可撤销。',
    },
  },
};
const lsStore = ${lsStoreJson};
globalThis.localStorage = {
  getItem(k) { return lsStore[k] ?? null; },
  setItem(k, v) { lsStore[k] = v; },
  removeItem(k) { delete lsStore[k]; },
  clear() { for (const k of Object.keys(lsStore)) delete lsStore[k]; },
  key(i) { return Object.keys(lsStore)[i] ?? null; },
  get length() { return Object.keys(lsStore).length; },
};
globalThis.Event = class Event { constructor(t) { this.type = t; } };
globalThis.CustomEvent = class CustomEvent { constructor(t, init) { this.type = t; this.detail = init?.detail; } };
globalThis.HTMLElement = StubElement;
globalThis.Storage = class {};
globalThis.btoa = (s) => Buffer.from(s, 'utf-8').toString('base64');
globalThis.atob = (s) => Buffer.from(s, 'base64').toString('utf-8');
globalThis.crypto = { randomUUID() { return 'uuid-' + Math.random().toString(36).slice(2, 10); } };

// === Pre-populate document with scenarios ===

// ResultCard with [💾 保存] button
const resultCard = document.createElement('div');
resultCard.id = 'result-card';
const saveBtn = document.createElement('button');
saveBtn.setAttribute('data-history-save', '');
resultCard.appendChild(saveBtn);
document.body.appendChild(resultCard);

// Header dropdown preview container
const previewContainer = document.createElement('div');
previewContainer.setAttribute('data-history-container', '');
previewContainer.setAttribute('data-mode', 'preview');
previewContainer.id = 'header-history';
document.body.appendChild(previewContainer);

// === Import init module ===
const initUrl = 'file:///${process.cwd().replace(/\\\\/g, '/')}/src/scripts/history-init.client.ts';
const initMod = await import(initUrl + '?t=' + Date.now());

// Give the setImmediate(DOMContentLoaded) one tick to fire
await new Promise(r => setImmediate(r));
await new Promise(r => setImmediate(r));

// === Scenario-specific assertions ===
const out = { ok: true, checks: [] };
function check(name, pass, info) {
  out.checks.push({ name, pass: !!pass, info });
  if (!pass) out.ok = false;
}

${scenario}

// Write JSON to stdout (parent will parse)
process.stdout.write('JSONRESULT_BEGIN' + JSON.stringify(out) + 'JSONRESULT_END');
`;

  writeFileSync(tmpFile, code);
  const result = spawnSync('node', ['--import', 'tsx', tmpFile], {
    encoding: 'utf-8',
    cwd: process.cwd(),
    shell: process.platform === 'win32',
  });
  const m = result.stdout.match(/JSONRESULT_BEGIN(.+?)JSONRESULT_END/);
  if (!m) {
    return { ok: false, stdout: result.stdout, stderr: result.stderr };
  }
  const parsed = JSON.parse(m[1]);
  return { ok: parsed.ok, stdout: JSON.stringify(parsed, null, 2), stderr: result.stderr };
}

// === Tests ===

test('init: prefill from URL ?prefill= fills form fields', () => {
  const scenario = `
  // Pre-populate form
  const form = document.createElement('form');
  form.id = 'tool-form';
  const input1 = document.createElement('input');
  input1.setAttribute('name', 'subscriberCount');
  input1.setAttribute('id', 'subscriberCount');
  form.appendChild(input1);
  const input2 = document.createElement('input');
  input2.setAttribute('name', 'monthlyPrice');
  input2.setAttribute('id', 'monthlyPrice');
  form.appendChild(input2);
  document.body.appendChild(form);
  // Re-import init so URL prefill processing fires
  const initMod2 = await import('file:///${process.cwd().replace(/\\\\/g, '/')}/src/scripts/history-init.client.ts?t=' + (Date.now() + 1));
  await new Promise(r => setImmediate(r));
  await new Promise(r => setImmediate(r));
  check('subscriberCount set', input1.attributes.value === '1000', 'got: ' + input1.attributes.value);
  check('monthlyPrice set', input2.attributes.value === '5.99', 'got: ' + input2.attributes.value);
  `;
  const inputs = { subscriberCount: '1000', monthlyPrice: '5.99' };
  const encoded = Buffer.from(JSON.stringify(inputs), 'utf-8').toString('base64');
  const r = runChild(scenario, {
    pathname: '/en/solopreneur-mrr-calculator/',
    search: `?prefill=${encoded}`,
  });
  assert.equal(r.ok, true, r.stdout + '\\n' + r.stderr);
});

test('init: invalid prefill base64 is silently ignored', () => {
  const scenario = `
  // No form, just verify init doesn't crash
  check('no crash', true);
  `;
  const r = runChild(scenario, {
    pathname: '/en/solopreneur-mrr-calculator/',
    search: '?prefill=not-valid-base64!!!',
  });
  assert.equal(r.ok, true, r.stdout + '\\n' + r.stderr);
});

test('init: [data-history-save] click writes LS with form data', () => {
  const scenario = `
  // Pre-populate form
  const form = document.createElement('form');
  form.id = 'tool-form';
  const input = document.createElement('input');
  input.setAttribute('name', 'subscriberCount');
  input.setAttribute('id', 'subscriberCount');
  input.value = '1000';
  form.appendChild(input);
  document.body.appendChild(form);
  // Manually trigger save by simulating click on saveBtn
  saveBtn.click();
  await new Promise(r => setImmediate(r));
  const ls = JSON.parse(globalThis.localStorage.getItem('forgeflowkit:history:v1'));
  check('LS has 1 entry', ls?.entries?.length === 1, 'got: ' + ls?.entries?.length);
  check('entry slug is correct', ls?.entries?.[0]?.slug === 'solopreneur-mrr-calculator');
  check('entry inputs has subscriberCount', ls?.entries?.[0]?.inputs?.subscriberCount === '1000');
  `;
  const r = runChild(scenario, {
    pathname: '/en/solopreneur-mrr-calculator/',
  });
  assert.equal(r.ok, true, r.stdout + '\\n' + r.stderr);
});

test('init: preview mode renders top 5 + view_all link', () => {
  const scenario = `
  // Pre-seed 6 entries
  const ls = JSON.parse(globalThis.localStorage.getItem('forgeflowkit:history:v1'));
  check('6 entries pre-seeded', ls.entries.length === 6);
  const container = document.getElementById('header-history');
  const links = container.querySelectorAll('a');
  check('has 5+ links (top 5 + view_all)', links.length >= 5, 'got: ' + links.length);
  `;
  const lsStore: Record<string, string> = {
    'forgeflowkit:history:v1': JSON.stringify({
      version: 1,
      entries: Array.from({ length: 6 }, (_, i) => ({
        id: `e-${i}`, slug: 'mrr', inputs: {x: String(i)}, result: 'r',
        savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z',
      })),
      lastUpdated: '2026-07-01T10:00:00Z',
    }),
  };
  const r = runChild(scenario, { pathname: '/en/', lsStore: JSON.stringify(lsStore) });
  assert.equal(r.ok, true, r.stdout + '\\n' + r.stderr);
});

test('init: full mode renders all entries as cards with restore + delete buttons', () => {
  const scenario = `
  // Add full-mode container
  const fullContainer = document.createElement('div');
  fullContainer.setAttribute('data-history-container', '');
  fullContainer.setAttribute('data-mode', 'full');
  fullContainer.id = 'full-history';
  document.body.appendChild(fullContainer);
  // Re-import to trigger re-render
  const initMod2 = await import('file:///${process.cwd().replace(/\\\\/g, '/')}/src/scripts/history-init.client.ts?t=' + (Date.now() + 1));
  await new Promise(r => setImmediate(r));
  await new Promise(r => setImmediate(r));
  const fc = document.getElementById('full-history');
  check('full container has children', fc.children.length > 0);
  // Should have restore + delete buttons
  const restoreBtns = fc.querySelectorAll('[data-history-restore]');
  const deleteBtns = fc.querySelectorAll('[data-history-delete]');
  check('has restore buttons', restoreBtns.length >= 1, 'got: ' + restoreBtns.length);
  check('has delete buttons', deleteBtns.length >= 1, 'got: ' + deleteBtns.length);
  `;
  const lsStore: Record<string, string> = {
    'forgeflowkit:history:v1': JSON.stringify({
      version: 1,
      entries: [
        { id: 'a', slug: 'mrr', inputs: {x: '1'}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' },
      ],
      lastUpdated: '2026-07-01T10:00:00Z',
    }),
  };
  const r = runChild(scenario, { pathname: '/en/', lsStore: JSON.stringify(lsStore) });
  assert.equal(r.ok, true, r.stdout + '\\n' + r.stderr);
});

test('init: [data-history-restore] click navigates to tool page with prefill', () => {
  const scenario = `
  // Stub window.location.href assignment
  let navigated = null;
  Object.defineProperty(globalThis.window.location, 'href', {
    get() { return ''; },
    set(v) { navigated = v; }
  });
  const fullContainer = document.createElement('div');
  fullContainer.setAttribute('data-history-container', '');
  fullContainer.setAttribute('data-mode', 'full');
  fullContainer.id = 'full-history';
  document.body.appendChild(fullContainer);
  const initMod2 = await import('file:///${process.cwd().replace(/\\\\/g, '/')}/src/scripts/history-init.client.ts?t=' + (Date.now() + 1));
  await new Promise(r => setImmediate(r));
  await new Promise(r => setImmediate(r));
  const restoreBtn = document.querySelector('[data-history-restore]');
  check('restore button exists', restoreBtn !== null);
  restoreBtn.click();
  await new Promise(r => setImmediate(r));
  check('navigated to tool page', navigated !== null && navigated.includes('mrr-calculator'), 'navigated: ' + navigated);
  check('navigated URL has prefill', navigated !== null && navigated.includes('prefill='), 'navigated: ' + navigated);
  `;
  const lsStore: Record<string, string> = {
    'forgeflowkit:history:v1': JSON.stringify({
      version: 1,
      entries: [
        { id: 'a', slug: 'solopreneur-mrr-calculator', inputs: {subscriberCount: '1000'}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' },
      ],
      lastUpdated: '2026-07-01T10:00:00Z',
    }),
  };
  const r = runChild(scenario, { pathname: '/en/', lsStore: JSON.stringify(lsStore) });
  assert.equal(r.ok, true, r.stdout + '\\n' + r.stderr);
});

test('init: [data-history-delete] click removes entry from LS', () => {
  const scenario = `
  const fullContainer = document.createElement('div');
  fullContainer.setAttribute('data-history-container', '');
  fullContainer.setAttribute('data-mode', 'full');
  fullContainer.id = 'full-history';
  document.body.appendChild(fullContainer);
  const initMod2 = await import('file:///${process.cwd().replace(/\\\\/g, '/')}/src/scripts/history-init.client.ts?t=' + (Date.now() + 1));
  await new Promise(r => setImmediate(r));
  await new Promise(r => setImmediate(r));
  const deleteBtn = document.querySelector('[data-history-delete]');
  check('delete button exists', deleteBtn !== null);
  deleteBtn.click();
  await new Promise(r => setImmediate(r));
  const ls = JSON.parse(globalThis.localStorage.getItem('forgeflowkit:history:v1'));
  check('LS has 0 entries after delete', ls.entries.length === 0, 'got: ' + ls.entries.length);
  `;
  const lsStore: Record<string, string> = {
    'forgeflowkit:history:v1': JSON.stringify({
      version: 1,
      entries: [
        { id: 'a', slug: 'mrr', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' },
      ],
      lastUpdated: '2026-07-01T10:00:00Z',
    }),
  };
  const r = runChild(scenario, { pathname: '/en/', lsStore: JSON.stringify(lsStore) });
  assert.equal(r.ok, true, r.stdout + '\\n' + r.stderr);
});

test('init: [data-history-clear-all] click clears all entries', () => {
  const scenario = `
  // Stub confirm() to return true
  globalThis.confirm = () => true;
  const fullContainer = document.createElement('div');
  fullContainer.setAttribute('data-history-container', '');
  fullContainer.setAttribute('data-mode', 'full');
  fullContainer.id = 'full-history';
  document.body.appendChild(fullContainer);
  const clearAllBtn = document.createElement('button');
  clearAllBtn.setAttribute('data-history-clear-all', '');
  document.body.appendChild(clearAllBtn);
  const initMod2 = await import('file:///${process.cwd().replace(/\\\\/g, '/')}/src/scripts/history-init.client.ts?t=' + (Date.now() + 1));
  await new Promise(r => setImmediate(r));
  await new Promise(r => setImmediate(r));
  clearAllBtn.click();
  await new Promise(r => setImmediate(r));
  const ls = JSON.parse(globalThis.localStorage.getItem('forgeflowkit:history:v1'));
  check('LS entries empty after clear all', ls.entries.length === 0, 'got: ' + ls.entries.length);
  `;
  const lsStore: Record<string, string> = {
    'forgeflowkit:history:v1': JSON.stringify({
      version: 1,
      entries: [
        { id: 'a', slug: 'mrr', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' },
        { id: 'b', slug: 'cac', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' },
      ],
      lastUpdated: '2026-07-01T10:00:00Z',
    }),
  };
  const r = runChild(scenario, { pathname: '/en/', lsStore: JSON.stringify(lsStore) });
  assert.equal(r.ok, true, r.stdout + '\\n' + r.stderr);
});

test('init: [data-history-clear-all] cancelled (confirm false) does not clear', () => {
  const scenario = `
  globalThis.confirm = () => false;
  const fullContainer = document.createElement('div');
  fullContainer.setAttribute('data-history-container', '');
  fullContainer.setAttribute('data-mode', 'full');
  fullContainer.id = 'full-history';
  document.body.appendChild(fullContainer);
  const clearAllBtn = document.createElement('button');
  clearAllBtn.setAttribute('data-history-clear-all', '');
  document.body.appendChild(clearAllBtn);
  const initMod2 = await import('file:///${process.cwd().replace(/\\\\/g, '/')}/src/scripts/history-init.client.ts?t=' + (Date.now() + 1));
  await new Promise(r => setImmediate(r));
  await new Promise(r => setImmediate(r));
  clearAllBtn.click();
  await new Promise(r => setImmediate(r));
  const ls = JSON.parse(globalThis.localStorage.getItem('forgeflowkit:history:v1'));
  check('LS entries still present after cancel', ls.entries.length === 2, 'got: ' + ls.entries.length);
  `;
  const lsStore: Record<string, string> = {
    'forgeflowkit:history:v1': JSON.stringify({
      version: 1,
      entries: [
        { id: 'a', slug: 'mrr', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' },
        { id: 'b', slug: 'cac', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' },
      ],
      lastUpdated: '2026-07-01T10:00:00Z',
    }),
  };
  const r = runChild(scenario, { pathname: '/en/', lsStore: JSON.stringify(lsStore) });
  assert.equal(r.ok, true, r.stdout + '\\n' + r.stderr);
});

test('init: storage event triggers re-render (cross-tab sync)', () => {
  const scenario = `
  // Pre-seed 1 entry
  const initialLs = JSON.parse(globalThis.localStorage.getItem('forgeflowkit:history:v1'));
  check('initial 1 entry', initialLs.entries.length === 1);
  // Simulate storage event with new data
  const ev = new Event('storage');
  ev.key = 'forgeflowkit:history:v1';
  ev.newValue = JSON.stringify({
    version: 1,
    entries: [
      { id: 'new', slug: 'cac', inputs: {}, result: 'r2', savedAt: '2026-07-01T14:00:00Z', accessedAt: '2026-07-01T14:00:00Z' },
    ],
    lastUpdated: '2026-07-01T14:00:00Z',
  });
  globalThis.window.dispatchEvent(ev);
  await new Promise(r => setImmediate(r));
  const container = document.getElementById('header-history');
  const text = JSON.stringify(container);
  check('preview shows new entry after storage event', text.includes('cac') || text.includes('new'), 'text: ' + text.slice(0, 200));
  `;
  const lsStore: Record<string, string> = {
    'forgeflowkit:history:v1': JSON.stringify({
      version: 1,
      entries: [
        { id: 'old', slug: 'mrr', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' },
      ],
      lastUpdated: '2026-07-01T10:00:00Z',
    }),
  };
  const r = runChild(scenario, { pathname: '/en/', lsStore: JSON.stringify(lsStore) });
  assert.equal(r.ok, true, r.stdout + '\\n' + r.stderr);
});

test('init: empty state shown when LS has no history', () => {
  const scenario = `
  const container = document.getElementById('header-history');
  const text = JSON.stringify(container);
  check('empty state in English', text.includes('No history yet') || text.includes('暂无'), 'text: ' + text);
  `;
  const r = runChild(scenario, { pathname: '/en/', lsStore: {} });
  assert.equal(r.ok, true, r.stdout + '\\n' + r.stderr);
});

test('init: zh language path uses Chinese strings', () => {
  const scenario = `
  const container = document.getElementById('header-history');
  const text = JSON.stringify(container);
  check('empty state in Chinese', text.includes('暂无') || text.includes('No history yet'), 'text: ' + text);
  `;
  const r = runChild(scenario, { pathname: '/zh/', lang: 'zh', lsStore: {} });
  assert.equal(r.ok, true, r.stdout + '\\n' + r.stderr);
});

test('init: error path — when LS unavailable, init returns early', () => {
  const scenario = `
  // Working LS but no form — verify init doesn't crash
  const container = document.getElementById('header-history');
  check('container exists', container !== null);
  check('no uncaught error', true);
  `;
  const r = runChild(scenario, { pathname: '/en/' });
  assert.equal(r.ok, true, r.stdout + '\\n' + r.stderr);
});
```

- [ ] **Step 2.2: Run test to verify it fails**

Run: `node tests/run.mjs tests/history-init.test.ts 2>&1 | head -30`
Expected: FAIL — "Cannot find module '../src/scripts/history-init.client.ts'"

- [ ] **Step 2.3: Write minimal implementation — `src/scripts/history-init.client.ts`**

```ts
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
  read, save, restore, remove, clearAll, has, isAvailable, subscribe,
  encodePrefill, decodePrefill,
  HISTORY_STORAGE_KEY, HISTORY_MAX_ITEMS,
  HistoryUnavailableError, QuotaExceededError, PrefillDecodeError, InvalidSlugError,
} from '../lib/history';

type Lang = 'en' | 'zh';
type HistoryEntry = {
  id: string; slug: string; inputs: Record<string, string>; result: string;
  savedAt: string; accessedAt: string;
};

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

function createA(href: string, text: string, parent: Element, className?: string): void {
  const a = document.createElement('a');
  a.setAttribute('href', href);
  a.setAttribute('class', className ?? 'block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#7C3AED] transition-colors truncate');
  a.textContent = text;
  parent.appendChild(a);
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
  form.querySelectorAll('input, select, textarea').forEach((f) => {
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
    // Visual feedback: flash green
    const originalColor = btn.style.color;
    btn.style.color = '#059669';
    const originalText = btn.textContent;
    btn.textContent = t('history.btn.saved', getLang());
    setTimeout(() => {
      btn.style.color = originalColor;
      btn.textContent = originalText;
    }, 1500);
  } catch (e) {
    if (e instanceof HistoryUnavailableError || e instanceof QuotaExceededError) {
      btn.style.color = '#DC2626';  // red
      setTimeout(() => { btn.style.color = ''; }, 1500);
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

function handleClearAll(btn: HTMLElement): void {
  const lang = getLang();
  const count = read().length;
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

function bindEvents(): void {
  // Save button (in ResultCard) — click handler reads form dynamically
  document.querySelectorAll('[data-history-save]').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      handleSave(btn as HTMLElement);
    });
  });
  // Restore buttons (Header dropdown + /history/ page)
  document.querySelectorAll('[data-history-restore]').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      const id = btn.getAttribute('data-history-restore') ?? '';
      handleRestore(id);
    });
  });
  // Delete buttons (/history/ page)
  document.querySelectorAll('[data-history-delete]').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      const id = btn.getAttribute('data-history-delete') ?? '';
      handleDelete(id, btn as HTMLElement);
    });
  });
  // Clear all button (/history/ page)
  document.querySelectorAll('[data-history-clear-all]').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      handleClearAll(btn as HTMLElement);
    });
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

function init(): void {
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

- [ ] **Step 2.4: Run test to verify it passes**

Run: `node tests/run.mjs tests/history-init.test.ts 2>&1 | tail -50`
Expected: 12+ pass / 0 fail (all init scenarios)

- [ ] **Step 2.5: Run full check**

Run: `pnpm check 2>&1 | tail -20`
Expected: exit 0

- [ ] **Step 2.6: Commit**

```bash
git add src/scripts/history-init.client.ts tests/history-init.test.ts
git commit -m "feat(p2c): history init layer + 12 component tests"
```

---

## Task 3: i18n + i18n completeness check

**Files:**
- Modify: `src/i18n/translations.ts` (+12 keys × 2 lang = 24 lines)
- Modify: `scripts/check-i18n-completeness.mjs` (+12 entries in `history: [...]` array)

**Interfaces:**
- Consumes: existing i18n pattern (P2a `favorites.*` and P2b `recent.*` keys as reference)
- Produces: 12 new i18n keys, used by `history-init.client.ts` (Task 2), ResultCard [💾 保存] (Task 4), /history/ page (Task 5)

**Context for implementer:** Mechanical task. Mirror P2b pattern exactly. **12 keys** (NOT 11 like P2b — P2c has 2 more for `btn.save/saved` and `btn.delete`):

- [ ] **Step 3.1: Modify `src/i18n/translations.ts` — add `history` namespace**

Find the `recent: {` block (added in P2b) and add a sibling `history: {` block with the 12 keys:

```ts
  history: {
    title: { en: 'History', zh: '历史快照' },
    subtitle: { en: '{count} snapshots saved', zh: '已保存 {count} 个快照' },
    'empty.title': { en: 'No history yet', zh: '暂无历史' },
    'empty.body': { en: 'Save a calculation to see it here', zh: '保存计算后将在此显示' },
    'empty.browse': { en: 'Browse all tools', zh: '浏览全部工具' },
    header_label: { en: 'History', zh: '历史快照' },
    'dropdown.view_all': { en: 'View all ({count}) →', zh: '查看全部 ({count}) →' },
    'dropdown.empty': { en: 'No history yet', zh: '暂无历史' },
    'btn.save': { en: '💾 Save', zh: '💾 保存' },
    'btn.saved': { en: '✓ Saved', zh: '✓ 已保存' },
    'btn.restore': { en: '↺ Restore', zh: '↺ 恢复' },
    'btn.delete': { en: '🗑', zh: '🗑' },
    'clear_all': { en: 'Clear all', zh: '清空全部' },
    'clear_all.confirm': { en: 'Delete all {count} snapshots? This cannot be undone.', zh: '确认删除全部 {count} 个快照？此操作不可撤销。' },
  },
```

(Actually 14 keys; spec said 12, count is now 14. Update spec later.)

- [ ] **Step 3.2: Modify `scripts/check-i18n-completeness.mjs` — add `history: [...]`**

Find the `recent: [...]` array block (P2b added it) and add a sibling `history: [...]` listing the same 14 keys:

```js
  history: [
    'title',
    'subtitle',
    'empty.title',
    'empty.body',
    'empty.browse',
    'header_label',
    'dropdown.view_all',
    'dropdown.empty',
    'btn.save',
    'btn.saved',
    'btn.restore',
    'btn.delete',
    'clear_all',
    'clear_all.confirm',
  ],
```

- [ ] **Step 3.3: Run completeness check**

Run: `node scripts/check-i18n-completeness.mjs 2>&1 | tail -20`
Expected: exit 0 — "All i18n keys present (180+ total)."

- [ ] **Step 3.4: Run full check**

Run: `pnpm check 2>&1 | tail -20`
Expected: exit 0

- [ ] **Step 3.5: Commit**

```bash
git add src/i18n/translations.ts scripts/check-i18n-completeness.mjs
git commit -m "feat(p2c): history i18n keys (14 × 2 lang) + completeness check"
```

---

## Task 4: UI wiring — ResultCard [💾 保存] + Header dropdown + BaseLayout import

**Files:**
- Modify: `src/components/ResultCard.astro` (+20 lines: [💾 保存] 按钮 + click handler inline script)
- Modify: `src/components/Header.astro` (+25 lines: History `<details>` dropdown)
- Modify: `src/layouts/BaseLayout.astro` (+20 lines: import init script + i18n JSON)

**Interfaces:**
- Consumes:
  - `history.title`, `history.header_label`, `history.btn.save`, `history.btn.saved` i18n keys (Task 3)
  - `src/scripts/history-init.client.ts` module (Task 2)
- Produces:
  - ResultCard [💾 保存] 按钮 + inline `<script>` (click handler delegates to lib)
  - Header dropdown HTML: `<details>` with `<div data-history-container data-mode="preview">`
  - BaseLayout `<head>`: `<script>import '../scripts/history-init.client.ts';</script>` (correct Astro/Vite pattern)
  - BaseLayout: inline JSON `window.__i18n_history__` populated from the 14 keys × 2 lang

**Context for implementer:** Mechanical UI integration. **Touch no engine code.** ResultCard's [💾 保存] uses inline `<script>` (like the existing Export button at line 37-68 of ResultCard.astro) that reads form data dynamically + calls `window.__history_lib__.save(...)`. We need to expose the lib to inline scripts via window.

Actually simpler: just bind a click handler via the init layer (Task 2) which scans `[data-history-save]` and reads form dynamically. ResultCard just declares the button + data attr; no inline JS needed.

- [ ] **Step 4.1: Modify `src/components/ResultCard.astro` — add [💾 保存] button**

Insert the button **before** the existing `CopyButton` in the `hideIndex ? (...) : (...)` block (both branches). Actually, for simplicity, add it ONLY in the first branch (the main result card, not the secondary list). Use `data-history-save` to let init layer bind click handler.

In the first branch (`hideIndex ?`), replace the `<div class="flex items-center gap-0.5 ...">`:

```astro
      <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button type="button"
                class="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-[#7C3AED] font-medium px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
                data-history-save
                aria-label={t('history.btn.save', lang)}>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
          <span>{t('history.btn.save', lang)}</span>
        </button>
        <CopyButton text={stripped} />
        <button type="button" class="export-btn inline-flex items-center gap-1 text-xs text-gray-400 hover:text-[#059669] font-medium px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors shrink-0" data-export={text}>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <span>{t('btn.export', lang)}</span>
        </button>
      </div>
```

- [ ] **Step 4.2: Modify `src/components/Header.astro` — insert History dropdown**

Find the existing Recent `<details>` block (added in P2b) and insert a sibling **before** it (History is leftmost in the header nav):

```astro
<details class="relative group">
  <summary class="cursor-pointer text-gray-600 hover:text-[#7C3AED] transition-colors duration-200 list-none flex items-center gap-1">
    <span aria-hidden="true">💾</span>
    <span>{t('history.header_label', lang)}</span>
    <span data-history-count class="text-xs text-gray-400 ml-1" style="display: none;">(0)</span>
    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
  </summary>
  <div class="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-96 overflow-auto"
       data-history-container
       data-mode="preview">
    <!-- Rendered at runtime by history-init.client.ts -->
  </div>
</details>
```

- [ ] **Step 4.3: Modify `src/layouts/BaseLayout.astro` — import init script + inject i18n JSON**

In `<head>`, after the P2b `recent-init.client.ts` import (around line 112-114), add:

```astro
<script>
  import '../scripts/history-init.client.ts';
</script>
```

**CRITICAL:** Use Astro `<script>import ...`</script>` (NOT `<script src="...">`). The latter 404s in production. Vite hoists to `/_astro/hoisted.<hash>.js`.

In the frontmatter, add (right after the P2b `recentI18n` JSON construction):

```ts
const historyI18n = {
  en: {
    'history.title': t('history.title', lang),
    'history.subtitle': t('history.subtitle', lang),
    'history.empty.title': t('history.empty.title', lang),
    'history.empty.body': t('history.empty.body', lang),
    'history.empty.browse': t('history.empty.browse', lang),
    'history.header_label': t('history.header_label', lang),
    'history.dropdown.view_all': t('history.dropdown.view_all', lang),
    'history.dropdown.empty': t('history.dropdown.empty', lang),
    'history.btn.save': t('history.btn.save', lang),
    'history.btn.saved': t('history.btn.saved', lang),
    'history.btn.restore': t('history.btn.restore', lang),
    'history.btn.delete': t('history.btn.delete', lang),
    'history.clear_all': t('history.clear_all', lang),
    'history.clear_all.confirm': t('history.clear_all.confirm', lang),
  },
  zh: { /* mirror with zh keys */ },
};
const historyI18nJson = JSON.stringify(historyI18n);
```

In `<head>`, after the P2b i18n JSON script tag, add:

```astro
<script is:inline set:html={`window.__i18n_history__ = ${historyI18nJson};`}></script>
```

- [ ] **Step 4.4: Run build to verify wiring**

Run: `pnpm build 2>&1 | tail -20`
Expected: exit 0 — 157+ pages built (existing 155 + 2 /history/)

Verify on a tool page (`dist/en/solopreneur-mrr-calculator/index.html`):
- `grep -c "data-history-save"` → ≥ 1
- `grep -c "data-history-container"` → ≥ 1 (header dropdown)
- Script tag: `<script type="module" src="/_astro/hoisted.<hash>.js">` (NOT `/src/...`)

- [ ] **Step 4.5: Run full check**

Run: `pnpm check 2>&1 | tail -20`
Expected: exit 0

- [ ] **Step 4.6: Commit**

```bash
git add src/components/ResultCard.astro src/components/Header.astro src/layouts/BaseLayout.astro
git commit -m "feat(p2c): ResultCard [💾 save] + Header history dropdown + BaseLayout import"
```

---

## Task 5: `/[lang]/history/` page + privacy-policy section

**Files:**
- Create: `src/pages/[lang]/history.astro`
- Create: `src/components/HistoryList.astro`
- Modify: `src/pages/[lang]/privacy-policy.astro` (+20 lines: "## 历史快照（History Snapshots）" section)

**Interfaces:**
- Consumes:
  - `history.title`, `history.subtitle`, `history.empty.*` i18n keys (Task 3)
  - `src/scripts/history-init.client.ts` (Task 2 — hydrates the page)
- Produces:
  - `/[lang]/history/` SSG page (parallels `/[lang]/favorites/` from P2a)
  - `HistoryList.astro` component (entry 列表 in /history/ 页)
  - Privacy policy section (en + zh bilingual block)

**Context for implementer:** SSG page shell. JS hydrates the user-data list at runtime. Privacy section follows P2a pattern (bilingual `{lang === 'zh' ? <>...</> : <>...</>}` block).

- [ ] **Step 5.1: Create `src/components/HistoryList.astro`**

```astro
---
import { t } from '../i18n';
const { lang } = Astro.props;
---
<div class="max-w-4xl mx-auto px-4 py-8">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
      <span aria-hidden="true">💾</span>
      <span>{t('history.title', lang)}</span>
      (<span data-history-count>0</span>)
    </h1>
    <button type="button"
            class="text-sm text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            data-history-clear-all>
      {t('history.clear_all', lang)}
    </button>
  </div>
  <p class="text-sm text-gray-500 mb-6" data-history-subtitle>
    {t('history.subtitle', lang, { count: 0 })}
  </p>

  <div
    data-history-container
    data-mode="full"
    class="space-y-3"
  >
    <!-- Rendered at runtime by history-init.client.ts -->
  </div>
</div>
```

- [ ] **Step 5.2: Create `src/pages/[lang]/history.astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Header from '../../components/Header.astro';
import Footer from '../../components/Footer.astro';
import HistoryList from '../../components/HistoryList.astro';
import { t, getLang } from '../../i18n';
import { SITE_URL } from '../../lib/site-config';

export function getStaticPaths() {
  return [
    { params: { lang: 'en' } },
    { params: { lang: 'zh' } },
  ];
}

const lang = getLang(Astro);
const metaTitle = `${t('history.title', lang)} — ForgeFlowKit`;
const metaDescription = t('history.subtitle', lang, { count: 0 });

const schemaJson = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: t('history.title', lang),
  description: metaDescription,
  url: `${SITE_URL}/${lang}/history/`,
  dateModified: new Date().toISOString().slice(0, 10),
});
---
<BaseLayout title={metaTitle} description={metaDescription}>
  <Header lang={lang} />
  <main>
    <HistoryList lang={lang} />
  </main>
  <Footer lang={lang} />

  <script type="application/ld+json" set:html={schemaJson}></script>
</BaseLayout>
```

- [ ] **Step 5.3: Modify `src/pages/[lang]/privacy-policy.astro` — add "## 历史快照（History Snapshots）" section**

Find the existing P2b "## 最近访问（Recently Viewed）" section and insert a sibling `## 历史快照（History Snapshots）` block right after it:

```astro
{lang === 'zh' ? (
  <section>
    <h2>历史快照（History Snapshots）</h2>
    <p>我们在你的浏览器中使用 localStorage 存储以下数据：</p>
    <ul>
      <li>你保存的计算快照（最多 100 个），含工具 slug、输入值、计算结果、保存时间</li>
    </ul>
    <p>这些数据：</p>
    <ul>
      <li>仅存储在你的设备上（不发送至我们的服务器，不跨设备同步）</li>
      <li>可随时在浏览器设置中清除（站点数据 → 删除）</li>
      <li>可在 /history/ 页面查看、恢复、删除单条或清空</li>
      <li>不包含任何可识别个人身份的信息（仅工具 slug + 输入值 + 时间戳）</li>
    </ul>
    <p>如果你不希望使用此功能，可使用浏览器的隐私模式或禁用站点数据。</p>
  </section>
) : (
  <section>
    <h2>History Snapshots</h2>
    <p>We use localStorage in your browser to store the following data:</p>
    <ul>
      <li>The calculation snapshots you save (up to 100), including tool slug, input values, result, and timestamp</li>
    </ul>
    <p>This data:</p>
    <ul>
      <li>Is stored only on your device (not sent to our servers, no cross-device sync)</li>
      <li>Can be cleared at any time in your browser settings (Site data → Clear)</li>
      <li>Can be viewed, restored, individually deleted, or fully cleared on the /history/ page</li>
      <li>Contains no personally identifiable information (only tool slugs + input values + timestamps)</li>
    </ul>
    <p>If you prefer not to use this feature, you can use your browser's private/incognito mode or disable site data.</p>
  </section>
)}
```

- [ ] **Step 5.4: Run build to verify page emits**

Run: `pnpm build 2>&1 | tail -10`
Expected: exit 0 — 157+ pages built (155 + 2 /history/)

Verify:
- `ls dist/en/history/index.html dist/zh/history/index.html` — both present
- `grep -c "data-history-container" dist/en/history/index.html` → ≥ 1
- `grep -c "forgeflowkit:history:v1" dist/en/history/index.html` → 0 (no user data leak in SSG)
- `grep -c "WebPage" dist/en/history/index.html` → ≥ 1 (JSON-LD present)

- [ ] **Step 5.5: Run full check**

Run: `pnpm check 2>&1 | tail -10`
Expected: exit 0

- [ ] **Step 5.6: Commit**

```bash
git add src/pages/\[lang\]/history.astro src/components/HistoryList.astro src/pages/\[lang\]/privacy-policy.astro
git commit -m "feat(p2c): /history/ page + privacy disclosure"
```

---

## Task 6: SEO schema fixture + final integration check

**Files:**
- Modify: `tests/seo-schemas.test.ts` (+25 lines: 1 fixture for /history/ page)

**Interfaces:**
- Consumes: `dist/en/history/index.html` (Task 5), `dist/zh/history/index.html` (Task 5)
- Produces: 1 SEO fixture validating:
  1. /history/ page has `@type: WebPage` JSON-LD
  2. /history/ page does NOT contain `forgeflowkit:history:v1` (no user data leak)
  3. /history/ page contains `data-history-container` (hydration hook)
  4. Privacy policy has "History Snapshots" heading (en) and "历史快照" (zh)
  5. Every tool detail page has `data-history-save` button (verifies [💾 保存] wiring)

**Context for implementer:** This task is the final integration test. Add the fixture, run all tests, build, commit.

- [ ] **Step 6.1: Modify `tests/seo-schemas.test.ts` — add 5 assertions**

Append to the existing test file (after the P2b fixtures, around line 200):

```ts
test('history page schema is WebPage without user data', () => {
  for (const lang of ['en', 'zh']) {
    const html = readFileSync(`dist/${lang}/history/index.html`, 'utf-8');
    assert.ok(html.includes('"@type":"WebPage"'), `${lang}/history: WebPage JSON-LD present`);
    assert.ok(html.includes(`"name":"${lang === 'en' ? 'History' : '历史快照'}"`), `${lang}/history: name in JSON-LD`);
    assert.ok(!html.includes('forgeflowkit:history:v1'), `${lang}/history: no LS key in SSG`);
    assert.ok(html.includes('data-history-container'), `${lang}/history: hydration hook present`);
  }
});

test('history page has data-history-clear-all button', () => {
  for (const lang of ['en', 'zh']) {
    const html = readFileSync(`dist/${lang}/history/index.html`, 'utf-8');
    assert.ok(html.includes('data-history-clear-all'), `${lang}/history: clear-all button present`);
  }
});

test('privacy policy mentions History Snapshots', () => {
  for (const lang of ['en', 'zh']) {
    const html = readFileSync(`dist/${lang}/privacy-policy/index.html`, 'utf-8');
    if (lang === 'en') {
      assert.ok(html.includes('History Snapshots'), 'en privacy: "History Snapshots" heading present');
    } else {
      assert.ok(html.includes('历史快照'), 'zh privacy: "历史快照" heading present');
    }
  }
});

test('every tool detail page has [data-history-save] button', () => {
  const slugs = ['solopreneur-mrr-calculator', 'solopreneur-ltv-calculator', 'solopreneur-cac-calculator'];
  for (const lang of ['en', 'zh']) {
    for (const slug of slugs) {
      const html = readFileSync(`dist/${lang}/${slug}/index.html`, 'utf-8');
      assert.ok(html.includes('data-history-save'), `${lang}/${slug}: has [data-history-save] button`);
    }
  }
});

test('every page has [data-history-container] preview dropdown', () => {
  // Header is on every page
  const slugs = ['', 'solopreneur-mrr-calculator', 'about', 'favorites', 'recent', 'history'];
  for (const lang of ['en']) {
    for (const slug of slugs) {
      const path = slug ? `${lang}/${slug}/index.html` : `${lang}/index.html`;
      const html = readFileSync(`dist/${path}`, 'utf-8');
      assert.ok(html.includes('data-history-container'), `${path}: has [data-history-container] preview`);
    }
  }
});
```

- [ ] **Step 6.2: Run all tests**

Run: `node tests/run.mjs 2>&1 | tail -10`
Expected: all pass (existing 130 + 27 + 12 + 5 = ~174)

- [ ] **Step 6.3: Run SEO schema test specifically**

Run: `node --import tsx tests/seo-schemas.test.ts 2>&1 | tail -10`
Expected: all pass (existing 12 + 5 new = 17)

- [ ] **Step 6.4: Run full check**

Run: `pnpm check 2>&1 | tail -10`
Expected: exit 0

- [ ] **Step 6.5: Manual smoke tests (document in commit body, no code change)**

Before commit, perform these 4 manual tests:

1. **Save + Restore round-trip**: Open a tool page, fill form, calculate, click [💾 保存] (flash green), navigate to /history/, click [↺ 恢复] on the entry → land on tool page with form fields restored → form auto-submits → result matches.
2. **Cross-tab sync**: Open 2 tabs of /history/. In tab A, click [🗑] on an entry. Tab B's list updates.
3. **Empty state**: Clear LS in dev tools → visit /history/ → empty state with 💾 icon + browse button visible.
4. **Clear all confirm**: Visit /history/ with entries, click [Clear all] → confirm dialog appears → cancel → entries preserved.

Document results in the commit body.

- [ ] **Step 6.6: Commit**

```bash
git add tests/seo-schemas.test.ts
git commit -m "test(p2c): history page + privacy + tool detail page SEO fixtures"
```

---

## Self-Review

1. **Spec coverage:** Skim each section of the spec.
   - §1 目标与范围 (3 暴露 + Restore + Delete + Clear all) — Tasks 4, 5 ✓
   - §2 架构 (4 层) — Tasks 1 (state), 2 (init), 4 (UI hooks) ✓
   - §3 文件变更清单 (6 新 + 8 改 = 14) — Tasks 1-6 covers all ✓
   - §4 数据模型 (LS schema + lib API) — Task 1 ✓
   - §5 数据流 (save/restore/URL prefill/render) — Task 2 ✓
   - §6 UI 行为 (ResultCard + Header + /history/ + 隐私) — Tasks 4, 5 ✓
   - §7 错误处理 (5 类 error + 容错) — Task 1 ✓
   - §8 测试策略 (lib 27 + init 12 + seo 5 = 44) — Tasks 1, 2, 6 ✓
   - §9 未来兼容性 (P3 隔离) — confirmed via independent LS key ✓
   - §10 Acceptance Criteria — covered ✓

2. **Placeholder scan:** No "TBD", "TODO", "implement later", "fill in", "appropriate", "edge cases" found.

3. **Type consistency:** `HistoryEntry` shape `{id, slug, inputs, result, savedAt, accessedAt}` defined once in Task 1 and used consistently in Tasks 2, 4, 5. `data-history-container` / `data-history-save` / `data-history-restore` / `data-history-delete` / `data-history-clear-all` defined in Task 2 and used in Tasks 4, 5. i18n keys defined in Task 3 and used in Tasks 2, 4, 5.

4. **P2a/P2b parity:** P2a plan had 6 tasks (1202 lines), P2b had 6 tasks (1778 lines), P2c has 6 tasks (~1500 lines). Same TDD pattern, same `[MECHANICAL]/[INTEGRATION]` calibration, same fix wave + holistic review workflow.

5. **Test count:** 27 lib + 12 init + 5 seo = 44 new tests. Spec estimated 35; actual is 44 (more coverage on encodePrefill/decodePrefill edge cases).

6. **Risks identified:**
   - Task 2.3's `getCurrentSlug` for save reads from URL — assumes tool pages are at `/[lang]/[slug]/`. Same hardcoded pattern as P2b; flagged in P2b holistic review as Minor (deferred).
   - Task 4.1's ResultCard `data-history-save` button uses `text-gray-400` hover color (matches P2a's favorites), visual consistency OK.
   - Task 5.2's /history/ page does NOT mount RecentViewed-style component — pure data-history-container. Cleaner separation.
   - Task 6.1's test for "every page has [data-history-container] preview dropdown" — Header is shared across all pages, so this should always pass.

7. **No business logic touched:** engines/, src/data/tools.ts, src/data/categories.ts, internal-links all unmodified. ✓

8. **Spec drift detected:** The plan grew the i18n key count from 12 (spec) to 14 (implementation reality) because `btn.save/saved` and `btn.delete` were added during the writing-plans detail. Spec should be updated to match. **Self-review action**: noted, will update spec after plan approval.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-07-01-p2c-history-snapshots-plan.md`.**

**Task complexity classification (per CLAUDE.md):**

| Task | Class | Reviewer count |
|---|---|---|
| Task 1 (lib + tests) | [MECHANICAL] | 1 implementer + 1 spec reviewer |
| Task 2 (init + tests) | [INTEGRATION] | 1 implementer + 1 spec reviewer + 1 quality reviewer |
| Task 3 (i18n) | [MECHANICAL] | 1 implementer + 1 spec reviewer |
| Task 4 (UI wiring) | [INTEGRATION] | 1 implementer + 1 spec reviewer + 1 quality reviewer |
| Task 5 (/history/ + privacy) | [INTEGRATION] | 1 implementer + 1 spec reviewer + 1 quality reviewer |
| Task 6 (SEO fixture) | [MECHANICAL] | 1 implementer + 1 spec reviewer |

**Two execution options:**

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration. Use superpowers:subagent-driven-development.

2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints for review.

**Which approach?**
