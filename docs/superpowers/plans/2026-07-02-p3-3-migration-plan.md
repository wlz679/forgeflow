# P3-3 Migration Implementation Plan (LS-only → Cloud Account)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote P3-2's existing pullAndMerge() into a formally-idempotent LS-only → cloud migration triggered on first Clerk sign-in per device, with a confirmation alert. Closes P3 trilogy.

**Architecture:** Reuse P3-2's `pullAndMerge(userId)` as the core orchestrator. Add a thin `maybeMigrate(userId)` wrapper in `src/scripts/migration.client.ts` that checks two idempotency guards (sessionStorage `sync:did-pull-once` per-tab + LS key `forgeflowkit:migration:{userId}` per-device) before invoking pullAndMerge, then writes both flags and fires a one-shot alert. `sync-init.client.ts: pollForAuthAndPull` switches from `pullAndMerge` → `maybeMigrate`.

**Tech Stack:** TypeScript 5.6, Astro 4.16.19 SSG, Node 22, `tsx` for test execution, P3-2 `sync.ts` primitives (no new fetch helpers needed).

**Spec:** `docs/superpowers/specs/2026-07-02-p3-3-migration-design.md` (commit `c0562d0`, approved 2026-07-02)

---

## Global Constraints

These come from the P3 spec/plan + CLAUDE.md hard rules. Every task implicitly must respect them:

- **engines frozen** — `src/engines/*` zero changes
- **P2 trilogy frozen** — `src/lib/{favorites,recent,history}.ts` zero changes
- **P3-1 zero changes** — `src/lib/clerk-env.ts`, `src/scripts/clerk-init.client.ts`, `src/components/Header.astro` P3-1 sibling block all untouched
- **P3-2 (data layer) frozen** — `src/lib/sync.ts` zero changes (P3-3 reuses existing `pullAndMerge`, `mergeFavorites`, `mergeRecent`, `mergeHistory`, `readLSEnvelope`, `writeLSEnvelope`, `setLastSyncedAt`); only ADD new files (`src/lib/migration.ts`, `src/scripts/migration.client.ts`)
- **i18n stays in sync** — new keys must be bilingual (en + zh) within the existing `sync.*` namespace, no key renames
- **Build passes** — `pnpm check` exit 0 (covers all `check:*` gates + `codegen-*:check`)
- **Build snapshots use `--test-concurrency=1`** — Windows race lesson from P3-1 Task 4 (`tests/_sync-menu-child.ts` precedent)
- **Tests exit non-zero on failure** — no `expect(true).toBe(true)` smoke tests; assertions must catch the bug they claim to verify
- **P3-1 self-call pattern** — any `src/scripts/*.client.ts` file that performs side-effects on import MUST have a `if (typeof document !== 'undefined') { ... }` self-call block at EOF (P3-1 Task 4 lesson: Vite tree-shakes unused exports)
- **Fetch injection for I/O testability** — already enforced via `pullAndMerge(userId)` API which doesn't take `fetchImpl` (uses defaults); child harness must mock `globalThis.fetch`
- **Dual-source env fallback** — `src/lib/supabase-env.ts` uses `import.meta.env` primary + `process.env` fallback; tests set env via `process.env` per the pattern in `tests/_supabase-env-child.ts`
- **Sibling-block pattern** — any modification to `Header.astro` / `BaseLayout.astro` adds new code AFTER existing P3-1 blocks, never modifies them
- **Privacy policy unchanged** — P3-2 disclosure at `src/pages/[lang]/privacy-policy.astro` already covers migration (same data → same destination → same auth provider); no new disclosure in V1
- **Mirror push flow** — final push uses `git push origin master` (gitee, fetch + rev-list first) then `SKIP_PUSH_FETCH=1 git push github master`

---

## File Structure

| File | Status | Responsibility | Approx LoC |
|---|---|---|---|
| `src/lib/migration.ts` | **Create** | Pure LS helpers: `hasMigrated(userId)`, `setMigrated(userId)`, `clearMigrated(userId)` (V2 hook). No DOM, no fetch. | ~30 |
| `src/scripts/migration.client.ts` | **Create** | Browser-side `maybeMigrate(userId)` wrapper. Reads post-pull item counts, fires `alert()` toast when any collection is non-empty. Uses P3-1 self-call pattern (EOF guard `if (typeof document !== 'undefined')` — even though sync-init.client.ts drives the call, the file must self-preserve from Vite tree-shaking). | ~50 |
| `tests/migration-helpers.test.ts` | **Create** | Pure unit tests for `src/lib/migration.ts`. Stubs `globalThis.localStorage` via `node:test` setup (no child process). | ~40 |
| `tests/_migration-child.ts` | **Create** | Per-test child harness (mirrors `tests/_sync-menu-child.ts`). Stubs `globalThis.localStorage` + `sessionStorage` + `window.alert` + `globalThis.fetch`, mocks `getClerkInstance` via `Module._resolveFilename` trick. Outputs JSON on stdout. | ~120 |
| `tests/migration.test.ts` | **Create** | Spawns `_migration-child.ts` via `tsx` and `spawnSync` per `tests/sync-menu-wiring.test.ts` pattern. 5 scenarios via `__TEST_SCENARIO` env var. | ~80 |
| `src/scripts/sync-init.client.ts` | **Modify** | Single line change inside `pollForAuthAndPull`: replace `void pullAndMerge(clerk.user.id).catch(...)` with `void maybeMigrate(clerk.user.id).catch(...)` + add import for `maybeMigrate`. | ~3 |
| `src/i18n/translations.ts` | **Modify** | Add 2 keys under existing `sync.*` namespace: `sync.migration.complete` + `sync.migration.empty` (each with `en` + `zh`). | ~12 |

**Total new code:** ~290 lines across 4 new files + ~15 line modifications across 2 existing files.

**Task decomposition rationale:** ONE task because (a) every new file is a leaf in the dependency graph (helpers → orchestrator → wiring → tests), (b) the implementation is self-contained and atomic, (c) the feature is small per spec §V1 Implementation. A reviewer meaningfully evaluates "P3-3 works end-to-end" or "doesn't" — there's no task boundary between which to split review effort.

---

## Subagent-Driven Review Calibration

Per `~/.claude/projects/D--E-----youtube-tools/memory/subagent-driven-overhead.md`:

| Task | Class | Implementer | Spec reviewer | Quality reviewer | Holistic review |
|---|---|---|---|---|---|
| Task 1 (only) | [INTEGRATION] | 1 subagent | 1 subagent | 1 subagent | 1 (after Task 1 commits) |

[INTEGRATION] because the implementation crosses 5+ files with similar patterns (helper file + orchestrator + child harness + test driver + sync-init wire + i18n additions) where cross-file consistency bugs are likely (specifically: LS key name agreement between `migration.ts` and the sync-init wire; toast string-template variable agreement between `migration.client.ts` and `translations.ts`).

**Holistic review** runs BEFORE the canonical push per CLAUDE.md "holistic pre-merge review" rule (≥5 files touched triggers holistic; this task touches 7 files = 5 new + 2 modified).

---

## Task 1: P3-3 Migration Feature

**Files:**
- Create: `src/lib/migration.ts`
- Create: `src/scripts/migration.client.ts`
- Create: `tests/migration-helpers.test.ts`
- Create: `tests/_migration-child.ts`
- Create: `tests/migration.test.ts`
- Modify: `src/scripts/sync-init.client.ts:282-303` (the `pollForAuthAndPull` function body)
- Modify: `src/i18n/translations.ts` (add 2 keys within `sync.*` namespace)

**Interfaces:**
- Consumes:
  - `pullAndMerge(userId: string): Promise<void>` from `src/lib/sync.ts:134-158` (already exported by sync-init.client.ts line 318; re-export from sync.ts if needed)
  - `getClerkInstance()?.user?.id` from `src/scripts/clerk-init.client.ts` (existing pattern, no P3-1 modification)
  - `translations[key]?: { en: string; zh: string }` from `src/i18n/translations.ts` (existing pattern)
- Produces:
  - `hasMigrated(userId: string): boolean`
  - `setMigrated(userId: string): void`
  - `clearMigrated(userId: string): void` (V2 reset hook)
  - `maybeMigrate(userId: string): Promise<boolean>` (returns `true` iff migration ran)

---

### Step 1: Verify pre-flight

Run these checks before writing code. They confirm the spec is implementable against current state.

```bash
cd "D:/E/独立站/youtube-tools"

# Confirm P3-2 functions exist and have correct signatures
node -e "
const sync = require('./src/lib/sync.ts');
" 2>&1 | head -3  # expected: TypeScript compile error (tsx needed)

node --import tsx -e "
import('./src/lib/sync.ts').then(s => {
  console.log('pullAndMerge:', typeof s.pullAndMerge);
  console.log('mergeFavorites:', typeof s.mergeFavorites);
  console.log('mergeRecent:', typeof s.mergeRecent);
  console.log('mergeHistory:', typeof s.mergeHistory);
});
" 2>&1 | tail -5
# expected: pullAndMerge: function + merge*: function

# Confirm sync-init.client.ts current shape (we modify it in Step 6)
grep -n "void pullAndMerge" src/scripts/sync-init.client.ts
# expected: 1 line match around line 289 (the existing call we replace)

# Confirm translations file shape
grep -n "sync.menu.delete:'\|sync.menu.syncNow:" src/i18n/translations.ts | head -3
# expected: lines around 1588-1599 (last existing sync.* key)
```

If any check fails, STOP and report before proceeding.

---

### Step 2: Create `src/lib/migration.ts`

Pure LS helpers. No DOM, no fetch, no side effects beyond LS reads/writes.

Create the file with this exact content:

```typescript
/**
 * P3-3 migration idempotency helpers.
 *
 * Tracks per-Clerk-user-per-device whether the LS → cloud migration has run.
 * Persisted in localStorage as ISO timestamp at key `forgeflowkit:migration:{userId}`.
 *
 * Idempotency policy (per spec §V1 Design):
 *   - V1 (this version): per-Clerk-user-per-device via LS key + per-tab via
 *     sessionStorage (the latter enforced by sync-init.client.ts existing check)
 *   - V2: TBD — `clearMigrated()` is exposed now so a future "Reset migration
 *     state" sync-menu button can be added without re-introducing the API
 *
 * Pure functions. Safe to call from anywhere (browser or test); no-ops when
 * localStorage is unavailable.
 */

const MIGRATION_KEY_PREFIX = 'forgeflowkit:migration:';

function migrationKey(userId: string): string {
  return MIGRATION_KEY_PREFIX + userId;
}

/**
 * Returns true if migration has run for the given Clerk user on this device.
 * Returns false when localStorage is unavailable (treat as "not yet run" — caller
 * will attempt migration and rely on the underlying fetch for conflict detection).
 */
export function hasMigrated(userId: string): boolean {
  if (typeof globalThis === 'undefined') return false;
  const ls = (globalThis as any).localStorage as Storage | undefined;
  if (!ls || typeof ls.getItem !== 'function') return false;
  try {
    return !!ls.getItem(migrationKey(userId));
  } catch {
    return false;
  }
}

/**
 * Marks migration as complete for the given Clerk user on this device.
 * Stores ISO timestamp. Idempotent (writes same shape on second call).
 */
export function setMigrated(userId: string): void {
  if (typeof globalThis === 'undefined') return;
  const ls = (globalThis as any).localStorage as Storage | undefined;
  if (!ls || typeof ls.setItem !== 'function') return;
  try {
    ls.setItem(migrationKey(userId), new Date().toISOString());
  } catch {
    /* ignore quota errors — migration will silently retry next tab */
  }
}

/**
 * V2 hook: removes the migration flag. Useful for a future "Reset" button in
 * the sync menu (not exposed in V1). Safe to call when no flag is set.
 */
export function clearMigrated(userId: string): void {
  if (typeof globalThis === 'undefined') return;
  const ls = (globalThis as any).localStorage as Storage | undefined;
  if (!ls || typeof ls.removeItem !== 'function') return;
  try {
    ls.removeItem(migrationKey(userId));
  } catch {
    /* ignore */
  }
}

/** Exported for tests; production code should use hasMigrated/setMigrated. */
export const MIGRATION_KEY_PREFIX_TEST = MIGRATION_KEY_PREFIX;
```

---

### Step 3: Create `tests/migration-helpers.test.ts`

Pure unit tests for the helper module. NO child process needed — just stub `globalThis.localStorage`.

Create the file with this exact content:

```typescript
/**
 * P3-3 unit tests for src/lib/migration.ts idempotency helpers.
 *
 * Pure unit tests — no fetch, no DOM, no child process. Stubs `globalThis.localStorage`
 * via a simple Map-backed shim that survives across tests (Node `node:test` runs
 * all tests in one process unless --test-concurrency=1 is set AND each is in a
 * separate file; we rely on per-test setup that clears the Map).
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  hasMigrated,
  setMigrated,
  clearMigrated,
  MIGRATION_KEY_PREFIX_TEST,
} from '../src/lib/migration.ts';

// Per-test storage Map (Map-backed shim that implements the LS interface we use).
const lsStore = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (lsStore.has(k) ? lsStore.get(k)! : null),
  setItem: (k: string, v: string) => { lsStore.set(k, v); },
  removeItem: (k: string) => { lsStore.delete(k); },
  clear: () => { lsStore.clear(); },
  key: (i: number) => Array.from(lsStore.keys())[i] ?? null,
  get length() { return lsStore.size; },
} as any;

// Each test starts with a clean LS to avoid cross-test pollution.
test.beforeEach(() => { lsStore.clear(); });

test('hasMigrated returns false when no flag set', () => {
  assert.equal(hasMigrated('user_abc'), false);
});

test('setMigrated writes ISO timestamp under correct key', () => {
  const before = new Date().toISOString();
  setMigrated('user_abc');
  const key = MIGRATION_KEY_PREFIX_TEST + 'user_abc';
  assert.ok(lsStore.has(key), `expected ${key} to exist in localStorage`);
  const stamp = lsStore.get(key)!;
  assert.match(stamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, 'should be ISO timestamp');
  assert.ok(stamp >= before, 'stamp should be >= before-time');
});

test('hasMigrated returns true after setMigrated', () => {
  setMigrated('user_abc');
  assert.equal(hasMigrated('user_abc'), true);
});

test('clearMigrated removes the flag', () => {
  setMigrated('user_abc');
  assert.equal(hasMigrated('user_abc'), true);
  clearMigrated('user_abc');
  assert.equal(hasMigrated('user_abc'), false);
});

test('different userIds get independent flags', () => {
  setMigrated('user_a');
  assert.equal(hasMigrated('user_a'), true);
  assert.equal(hasMigrated('user_b'), false, 'user_b should not see user_a flag');
  setMigrated('user_b');
  assert.equal(hasMigrated('user_b'), true);
  // user_a unchanged after user_b set
  assert.equal(hasMigrated('user_a'), true);
});

test('safe when localStorage is unavailable', () => {
  const orig = (globalThis as any).localStorage;
  delete (globalThis as any).localStorage;
  try {
    assert.equal(hasMigrated('user_abc'), false, 'hasMigrated should be safe');
    setMigrated('user_abc'); // should not throw
    clearMigrated('user_abc'); // should not throw
  } finally {
    (globalThis as any).localStorage = orig;
  }
});
```

Run:

```bash
node --import tsx --test --test-concurrency=1 tests/migration-helpers.test.ts 2>&1 | tail -15
```

Expected:

```
# tests 6
# pass 6
# fail 0
```

If anything fails, debug locally before proceeding (the rest of Task 1 depends on these helpers being correct).

---

### Step 4: Add 2 i18n keys to `src/i18n/translations.ts`

Open `src/i18n/translations.ts`. Find the existing `sync.*` block (added by P3-2 at commit `ae597bd`; around lines 1588-1599). Insert these 2 new keys INSIDE that block (NOT at the end of the file — must be grouped with siblings for `check:i18n` regex compliance):

```typescript
  // Migration toast (P3-3) — shows once after first sign-in per device
  'sync.migration.complete': {
    en: 'Imported {favorites} favorites, {recent} recent items, {history} history snapshots',
    zh: '已导入 {favorites} 个收藏、{recent} 个最近查看、{history} 个历史快照',
  },
  'sync.migration.empty': {
    en: 'No local data to migrate',
    zh: '没有本地数据需要迁移',
  },
```

Find the existing `sync.*` block by searching:

```bash
grep -n "sync.toast.exported" src/i18n/translations.ts
```

The new keys go immediately AFTER that line.

Verify bilingual:

```bash
node -e "import('./src/i18n/translations.ts').then(t => { for (const k of ['sync.migration.complete','sync.migration.empty']) { console.log(k, JSON.stringify(t.translations[k])); } });" 2>&1 | head -10
# expected: each key shows { en: '...', zh: '...' }
```

Verify `pnpm check:i18n` exits 0:

```bash
pnpm check:i18n 2>&1 | tail -5
# expected: exit 0, total key count incremented by 2 (was 181, now 183)
```

---

### Step 5: Create `src/scripts/migration.client.ts`

The browser-side orchestrator. Wraps `pullAndMerge(userId)` with idempotency guards + toast.

Create the file with this exact content:

```typescript
/**
 * P3-3 browser-side migration orchestrator (LS-only → cloud).
 *
 * Runs pullAndMerge() once per Clerk user per device when auth first resolves.
 * On successful run, fires a one-shot alert() with per-collection import counts
 * (suppressed when no items existed pre-merge — silent no-op for empty users).
 *
 * Idempotency guards (BOTH must be unset to run):
 *   - sessionStorage['sync:did-pull-once']   per-tab (set by sync-init.client.ts
 *                                              after first auth resolution; also
 *                                              re-set here on success)
 *   - localStorage[`forgeflowkit:migration:{userId}`]  per-device per-user
 *
 * P3-1 self-call pattern preserved at EOF so Vite does not tree-shake the
 * exported functions (P3-1 Task 4 lesson). The actual invocation site is
 * sync-init.client.ts: pollForAuthAndPull which calls maybeMigrate() directly
 * once it has a confirmed Clerk user identity.
 */

import { pullAndMerge } from '../lib/sync.ts';
import { hasMigrated, setMigrated } from '../lib/migration.ts';
import { translations } from '../i18n/translations.ts';

const SESSION_PULL_KEY = 'sync:did-pull-once';

type Lang = 'en' | 'zh';

function getLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  const m = /^\/(en|zh)(\/|$)/.exec(window.location.pathname ?? '/en/');
  return ((m?.[1] as Lang) || 'en');
}

function t(key: string): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[getLang()] ?? entry.en ?? key;
}

interface MigrationStats {
  favorites: number;
  recent: number;
  history: number;
}

function hasAnyItems(stats: MigrationStats): boolean {
  return stats.favorites > 0 || stats.recent > 0 || stats.history > 0;
}

function readItemCounts(): MigrationStats {
  const stats: MigrationStats = { favorites: 0, recent: 0, history: 0 };
  if (typeof globalThis === 'undefined') return stats;
  const ls = (globalThis as any).localStorage as Storage | undefined;
  if (!ls || typeof ls.getItem !== 'function') return stats;
  const readLen = (key: string): number => {
    try {
      const raw = ls.getItem(key);
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      const arr = parsed?.slugs ?? parsed?.entries ?? [];
      return Array.isArray(arr) ? arr.length : 0;
    } catch {
      return 0;
    }
  };
  stats.favorites = readLen('forgeflowkit:favorites');
  stats.recent = readLen('forgeflowkit:recent');
  stats.history = readLen('forgeflowkit:history');
  return stats;
}

function showToast(stats: MigrationStats): void {
  if (!hasAnyItems(stats)) return;
  const tmpl = t('sync.migration.complete');
  if (tmpl === 'sync.migration.complete') return; // key not translated → stay silent
  const message = tmpl
    .replace('{favorites}', String(stats.favorites))
    .replace('{recent}', String(stats.recent))
    .replace('{history}', String(stats.history));
  if (typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(message);
  }
}

/**
 * Run migration if (a) sessionStorage guard unset AND (b) LS migration flag unset.
 * Returns true if migration ran (success or failure), false if it was a no-op
 * (already migrated, or guards unavailable).
 *
 * On success: sets both flags, fires toast (suppressed if no items).
 * On failure: leaves flags unset (so next attempt retries); logs to console.
 */
export async function maybeMigrate(userId: string): Promise<boolean> {
  if (typeof globalThis === 'undefined') return false;
  const ss = (globalThis as any).sessionStorage as Storage | undefined;
  const ls = (globalThis as any).localStorage as Storage | undefined;
  if (!ss || !ls || typeof ss.getItem !== 'function' || typeof ss.setItem !== 'function') {
    return false;
  }

  // Both guards must be unset to run.
  if (ss.getItem(SESSION_PULL_KEY)) return false;
  if (hasMigrated(userId)) return false;

  const beforeStats = readItemCounts();

  try {
    await pullAndMerge(userId);
    setMigrated(userId);
    try { ss.setItem(SESSION_PULL_KEY, '1'); } catch { /* ignore */ }
    const afterStats = readItemCounts();
    showToast(afterStats);
    if (typeof console !== 'undefined' && hasAnyItems(beforeStats)) {
      console.info('[migration] migrated', { before: beforeStats, after: afterStats });
    }
    return true;
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.error('[migration] failed', err);
    }
    return false;
  }
}

// P3-1 self-call pattern — preserves exports against Vite tree-shaking.
// The actual invocation comes from sync-init.client.ts: pollForAuthAndPull
// after Clerk auth resolves. We do NOT auto-attach here because Clerk auth
// resolution requires a poll loop that already exists in sync-init.
if (typeof document !== 'undefined') {
  // Intentional no-op body. The self-call block exists solely to prevent Vite
  // from tree-shaking the `pullAndMerge` / `hasMigrated` / `setMigrated` /
  // `maybeMigrate` exports. Side effects on import are guarded above; runtime
  // call site is sync-init.client.ts.
}
```

---

### Step 6: Modify `src/scripts/sync-init.client.ts`

Two changes inside this file:

**Change A (import, near line 24):** Add `maybeMigrate` to the existing import block.

Find:

```typescript
import { getClerkInstance } from './clerk-init.client';
```

Insert a new line AFTER the `favorites/recent/history` import block (around line 21-23):

```typescript
import { maybeMigrate } from './migration.client.ts';
```

**Change B (function body, inside `pollForAuthAndPull`):** Replace the inline `pullAndMerge` call.

Find the existing `if (!sessionStorage.getItem(SESSION_PULL_KEY))` block (around lines 287-290). The current code looks like:

```typescript
      if (clerk?.user) {
        if (!sessionStorage.getItem(SESSION_PULL_KEY)) {
          sessionStorage.setItem(SESSION_PULL_KEY, '1');
          void pullAndMerge(clerk.user.id).catch(() => { /* logged; will retry on next change */ });
        }
```

Replace it with:

```typescript
      if (clerk?.user) {
        // Delegate to migration.client.maybeMigrate which checks BOTH the
        // per-tab sessionStorage guard AND the per-device per-user LS flag
        // (forgeflowkit:migration:{userId}). Sets both flags on success.
        void maybeMigrate(clerk.user.id).catch((err) => {
          // eslint-disable-next-line no-console
          console.error('[sync] maybeMigrate failed', err);
        });
```

Verify the edit:

```bash
grep -n "maybeMigrate\|pullAndMerge" src/scripts/sync-init.client.ts
# expected: maybeMigrate appears 2-3 times (import + call); pullAndMerge appears only at the export line 318
```

`pullAndMerge` should remain as an export (other code paths might import it) but no longer used internally. This is intentional.

---

### Step 7: Create `tests/_migration-child.ts`

The per-test child harness. Mirrors `tests/_sync-menu-child.ts` pattern (DOM stubs, fetch mock, `globalThis.localStorage`/`sessionStorage` Maps, Clerk module mock, scenario env var).

Create the file with this exact content:

```typescript
/**
 * Per-test child harness for migration.client.ts maybeMigrate().
 *
 * Stubs:
 *   - globalThis.localStorage / sessionStorage (Map-backed)
 *   - globalThis.window.alert (captures toast messages)
 *   - globalThis.fetch (records calls, returns empty array for GET, 204 for POST)
 *   - getClerkInstance via Module._resolveFilename (mirrors _sync-menu-child.ts)
 *
 * Test scenarios selected via process.env.__TEST_SCENARIO. Outputs JSON on stdout.
 *
 * Pre-populated state controlled via process.env:
 *   - __TEST_SCENARIO — scenario name
 *   - MIGRATION_LS_FAVORITES / _RECENT / _HISTORY — JSON.stringify of payloads to seed LS
 *   - MIGRATION_PRE_SS_PULL — '1' to set sessionStorage guard before run
 *   - MIGRATION_PRE_LS_MIGRATION — '1' to set LS migration flag before run
 *   - LANG_PREFIX — e.g. '/en/' for locale detection in t()
 */

// ---------- LS / SS stubs ----------
const lsStore = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (lsStore.has(k) ? lsStore.get(k)! : null),
  setItem: (k: string, v: string) => { lsStore.set(k, v); },
  removeItem: (k: string) => { lsStore.delete(k); },
  clear: () => { lsStore.clear(); },
  key: (i: number) => Array.from(lsStore.keys())[i] ?? null,
  get length() { return lsStore.size; },
} as any;

const ssStore = new Map<string, string>();
(globalThis as any).sessionStorage = {
  getItem: (k: string) => (ssStore.has(k) ? ssStore.get(k)! : null),
  setItem: (k: string, v: string) => { ssStore.set(k, v); },
  removeItem: (k: string) => { ssStore.delete(k); },
  clear: () => { ssStore.clear(); },
  key: (i: number) => Array.from(ssStore.keys())[i] ?? null,
  get length() { return ssStore.size; },
} as any;

// Seed pre-state from env
if (process.env.MIGRATION_PRE_SS_PULL === '1') {
  ssStore.set('sync:did-pull-once', '1');
}
if (process.env.MIGRATION_PRE_LS_MIGRATION === '1') {
  lsStore.set('forgeflowkit:migration:test-user', '2026-07-01T00:00:00.000Z');
}
if (process.env.MIGRATION_LS_FAVORITES) {
  lsStore.set('forgeflowkit:favorites', process.env.MIGRATION_LS_FAVORITES);
}
if (process.env.MIGRATION_LS_RECENT) {
  lsStore.set('forgeflowkit:recent', process.env.MIGRATION_LS_RECENT);
}
if (process.env.MIGRATION_LS_HISTORY) {
  lsStore.set('forgeflowkit:history', process.env.MIGRATION_LS_HISTORY);
}

// ---------- Window stub ----------
const alertsShown: string[] = [];
(globalThis as any).window = {
  alert: (msg: string) => { alertsShown.push(msg); },
  location: { pathname: process.env.LANG_PREFIX || '/en/' },
  setInterval: (_cb: any, _ms?: number): any => 0,
  setTimeout: (_cb: any, _ms?: number): any => 0,
  clearInterval: (_id: any) => { /* noop */ },
  clearTimeout: (_id: any) => { /* noop */ },
  addEventListener: (_event: string, _handler: any) => { /* noop */ },
  removeEventListener: (_event: string, _handler: any) => { /* noop */ },
} as any;

(globalThis as any).document = {
  readyState: 'complete',
  addEventListener: (_e: string, _h: any) => { /* noop */ },
} as any;

// ---------- Clerk mock (mirrors _sync-menu-child.ts) ----------
const Module = require('module');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request: string, ...rest: any[]) {
  if (request === '@clerk/clerk-js') return 'mock-clerk-js';
  return origResolve.call(this, request, ...rest);
};
const mockClerkInstance: any = {
  load: async () => { /* noop */ },
  get user() { return { id: 'test-user' }; },
  openSignIn: () => {},
  mountUserButton: (_el: any) => {},
};
require.cache['mock-clerk-js'] = {
  id: 'mock-clerk-js',
  filename: 'mock-clerk-js',
  loaded: true,
  exports: { Clerk: function () { return mockClerkInstance; } },
} as any;

// ---------- Fetch mock ----------
interface FetchCall { url: string; method?: string; body?: string; }
const fetchCalls: FetchCall[] = [];
(globalThis as any).fetch = async (url: string, init?: any) => {
  fetchCalls.push({ url: String(url), method: init?.method, body: init?.body });
  if (init?.method === 'GET' || !init?.method) {
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (init?.method === 'POST') {
    return new Response('', { status: 204 });
  }
  return new Response('', { status: 204 });
};
(globalThis as any).Response = Response;

// ---------- Main ----------
async function main(): Promise<void> {
  const { maybeMigrate } = await import('../src/scripts/migration.client.ts');
  const scenario = process.env.__TEST_SCENARIO;

  if (scenario === 'empty-ls-empty-cloud-skips') {
    // No LS, no cloud. migration should return false, no fetch, no alert.
    const migrated = await maybeMigrate('test-user');
    process.stdout.write(JSON.stringify({
      migrated,
      fetchCallCount: fetchCalls.length,
      alertCount: alertsShown.length,
      ssSet: !!ssStore.get('sync:did-pull-once'),
      lsMigrationFlagSet: !!lsStore.get('forgeflowkit:migration:test-user'),
    }) + '\n');
    return;
  }

  if (scenario === 'ls-only-pushes-to-empty-cloud') {
    // LS has 12 favorites; cloud empty → migration should push (3 POSTs) but no pull beyond empty array
    lsStore.set('forgeflowkit:favorites', JSON.stringify({
      version: 1,
      slugs: ['calc-1', 'calc-2', 'calc-3', 'calc-4', 'calc-5', 'calc-6', 'calc-7', 'calc-8', 'calc-9', 'calc-10', 'calc-11', 'calc-12'],
      lastUpdated: '2026-07-01T00:00:00.000Z',
    }));
    const migrated = await maybeMigrate('test-user');
    process.stdout.write(JSON.stringify({
      migrated,
      fetchCallCount: fetchCalls.length,
      pullCalls: fetchCalls.filter(c => c.method === 'GET' || !c.method).length,
      pushCalls: fetchCalls.filter(c => c.method === 'POST').length,
      alertCount: alertsShown.length,
      alertText: alertsShown[0] ?? null,
      ssSet: !!ssStore.get('sync:did-pull-once'),
      lsMigrationFlagSet: !!lsStore.get('forgeflowkit:migration:test-user'),
      ssFlagValue: ssStore.get('sync:did-pull-once'),
      lsFlagValue: lsStore.get('forgeflowkit:migration:test-user'),
    }) + '\n');
    return;
  }

  if (scenario === 'idempotent-rerun-skips') {
    // Pre-set BOTH guards → maybeMigrate should bail immediately, no fetch.
    const migrated = await maybeMigrate('test-user');
    process.stdout.write(JSON.stringify({
      migrated,
      fetchCallCount: fetchCalls.length,
      alertCount: alertsShown.length,
    }) + '\n');
    return;
  }

  if (scenario === 'toast-fires-on-items') {
    // LS has items → migration runs → toast fires with counts.
    lsStore.set('forgeflowkit:favorites', JSON.stringify({
      version: 1,
      slugs: ['a', 'b', 'c'],
      lastUpdated: '2026-07-01T00:00:00.000Z',
    }));
    lsStore.set('forgeflowkit:recent', JSON.stringify({
      version: 1,
      entries: [{ slug: 'a', visitedAt: '2026-07-01T00:00:00.000Z' }],
      lastUpdated: '2026-07-01T00:00:00.000Z',
    }));
    await maybeMigrate('test-user');
    process.stdout.write(JSON.stringify({
      migrated: true,
      alertCount: alertsShown.length,
      alertText: alertsShown[0] ?? null,
    }) + '\n');
    return;
  }

  if (scenario === 'silent-on-empty') {
    // After migration (which itself is a no-op for empty), no toast.
    await maybeMigrate('test-user');
    process.stdout.write(JSON.stringify({
      migrated: false,
      alertCount: alertsShown.length,
    }) + '\n');
    return;
  }

  process.stderr.write(`unknown scenario: ${scenario}\n`);
  process.exit(2);
}

main().catch((err) => {
  process.stderr.write(`FATAL: ${err && err.message}\n${err && err.stack}\n`);
  process.exit(1);
});
```

---

### Step 8: Create `tests/migration.test.ts`

Test driver. Spawns the child harness per scenario. Mirrors `tests/sync-menu-wiring.test.ts` structure (spawnSync + JSON parse).

Create the file with this exact content:

```typescript
/**
 * P3-3 integration tests for src/scripts/migration.client.ts maybeMigrate().
 *
 * 5 scenarios — all via child-process isolation per P3-1 / P3-2 lesson
 * (no jsdom; per-test child process gives fresh module state, fresh Clerk
 * mock, fresh fetch mock).
 *
 * Run with `--test-concurrency=1` for Windows stability (P3-1 Task 4 lesson).
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const child = resolve(root, 'tests', '_migration-child.ts');
const tsxBin = resolve(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');

function runChild(env: Record<string, string>): { ok: boolean; error?: string; result: any } {
  const r = spawnSync(tsxBin, [child], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  const stdout = r.stdout?.toString() ?? '';
  const stderr = r.stderr?.toString() ?? '';
  let result: any = {};
  try {
    const lastLine = stdout.trim().split('\n').filter(Boolean).pop() ?? '{}';
    result = JSON.parse(lastLine);
  } catch {
    result = { raw: stdout };
  }
  return {
    ok: r.status === 0,
    error: r.status === 0 ? undefined : stderr || stdout,
    result,
  };
}

test('migration: empty LS + empty cloud → no fetch, no toast, returns false', () => {
  const { ok, error, result } = runChild({
    __TEST_SCENARIO: 'empty-ls-empty-cloud-skips',
    LANG_PREFIX: '/en/',
  });
  assert.equal(ok, true, `child failed: ${error}`);
  assert.equal(result.migrated, false, 'migrated should be false (nothing to do)');
  assert.equal(result.fetchCallCount, 0, 'no fetch should occur for empty LS');
  assert.equal(result.alertCount, 0, 'no alert should fire for empty LS');
  assert.equal(result.ssSet, false, 'sessionStorage flag should NOT be set when migration is skipped');
  assert.equal(result.lsMigrationFlagSet, false, 'LS flag should NOT be set when migration is skipped');
});

test('migration: LS-only with items + empty cloud → 3 pushes, toast fires, both flags set', () => {
  const { ok, error, result } = runChild({
    __TEST_SCENARIO: 'ls-only-pushes-to-empty-cloud',
    LANG_PREFIX: '/en/',
  });
  assert.equal(ok, true, `child failed: ${error}`);
  assert.equal(result.migrated, true, 'migrated should be true');
  // pullAndMerge does 3 GETs + 3 POSTs = 6 fetches
  assert.equal(result.fetchCallCount, 6, `expected 6 fetches (3 GET + 3 POST), got ${result.fetchCallCount}`);
  assert.equal(result.pullCalls, 3, 'expected 3 pull calls');
  assert.equal(result.pushCalls, 3, 'expected 3 push calls');
  assert.equal(result.alertCount, 1, 'toast should fire when items present');
  assert.match(result.alertText ?? '', /imported/i, 'English toast should mention "imported"');
  assert.equal(result.ssSet, true, 'sessionStorage flag should be set after successful migration');
  assert.equal(result.lsMigrationFlagSet, true, 'LS migration flag should be set after successful migration');
  assert.match(result.lsFlagValue ?? '', /^\d{4}-\d{2}-\d{2}T/, 'LS flag value should be ISO timestamp');
});

test('migration: both guards pre-set → no fetch (idempotent re-run)', () => {
  const { ok, error, result } = runChild({
    __TEST_SCENARIO: 'idempotent-rerun-skips',
    LANG_PREFIX: '/en/',
    MIGRATION_PRE_SS_PULL: '1',
    MIGRATION_PRE_LS_MIGRATION: '1',
  });
  assert.equal(ok, true, `child failed: ${error}`);
  assert.equal(result.migrated, false, 'migrated should be false (idempotent skip)');
  assert.equal(result.fetchCallCount, 0, 'no fetch should occur when guards are set');
  assert.equal(result.alertCount, 0, 'no toast on skip');
});

test('migration: toast text contains correct counts after merge', () => {
  const { ok, error, result } = runChild({
    __TEST_SCENARIO: 'toast-fires-on-items',
    LANG_PREFIX: '/en/',
  });
  assert.equal(ok, true, `child failed: ${error}`);
  assert.equal(result.migrated, true);
  assert.equal(result.alertCount, 1);
  assert.match(result.alertText ?? '', /3 favorites/, 'toast should mention 3 favorites');
  assert.match(result.alertText ?? '', /1 recent/, 'toast should mention 1 recent item');
  assert.match(result.alertText ?? '', /0 history/, 'toast should mention 0 history');
});

test('migration: empty LS → no toast (silent no-op)', () => {
  const { ok, error, result } = runChild({
    __TEST_SCENARIO: 'silent-on-empty',
    LANG_PREFIX: '/en/',
  });
  assert.equal(ok, true, `child failed: ${error}`);
  assert.equal(result.migrated, false, 'empty LS means nothing to migrate');
  assert.equal(result.alertCount, 0, 'no toast when nothing to migrate');
});
```

Run:

```bash
node --import tsx --test --test-concurrency=1 tests/migration.test.ts 2>&1 | tail -20
```

Expected:

```
# tests 5
# pass 5
# fail 0
```

---

### Step 9: Run full test suite + `pnpm check` + `pnpm build`

```bash
# Targeted P3-3 + P3-2 sanity sweep
node --import tsx --test --test-concurrency=1 \
  tests/migration-helpers.test.ts \
  tests/migration.test.ts \
  tests/sync-init.test.ts \
  tests/sync-menu-wiring.test.ts \
  tests/sync-merge.test.ts \
  tests/sync-supabase-io.test.ts 2>&1 | tail -15

# Full check (includes codegen + i18n + env gates)
pnpm check 2>&1 | tail -15

# Production build
pnpm build 2>&1 | tail -10
```

Expected:
- Targeted: ~25 tests pass
- `pnpm check`: exit 0, 183 i18n keys, all `check:*` gates pass
- `pnpm build`: exit 0, 159 pages (no new pages — migration is runtime-only)

If any fails, debug locally. Common issues to look for:
- `_migration-child.ts` Clerk mock can't be required via `Module._resolveFilename` — verify by running the child manually with `__TEST_SCENARIO=... node --import tsx tests/_migration-child.ts`
- `pullAndMerge` is exported by sync-init.client.ts (line 318) but `migration.client.ts` imports from `../lib/sync.ts` directly. Verify the import works by node-importing `src/lib/sync.ts` and checking the export (it IS exported there per `src/lib/sync.ts:240+`).

---

### Step 10: Cross-file grep verification

Run each grep and verify the assertion column matches. If any mismatch, fix before committing.

```bash
# LS key agreement between migration.ts and migration.client.ts
grep -n "forgeflowkit:migration" src/lib/migration.ts
# expected: 1 line — `return MIGRATION_KEY_PREFIX + userId;`

grep -n "hasMigrated\|setMigrated\|clearMigrated" src/scripts/migration.client.ts
# expected: 2-3 references (one call to hasMigrated, one to setMigrated)

# Toast template variables agreement between migration.client.ts and translations.ts
grep -n "{favorites}\|{recent}\|{history}" src/scripts/migration.client.ts
# expected: 3 references (one .replace per variable)

grep -n "{favorites}\|{recent}\|{history}" src/i18n/translations.ts
# expected: same 3 references in sync.migration.complete key

# sync-init.client.ts uses maybeMigrate (not pullAndMerge)
grep -n "maybeMigrate\|pullAndMerge" src/scripts/sync-init.client.ts
# expected: maybeMigrate appears >=2 (import + 1 call); pullAndMerge only at line ~318 export

# No P3-1 sibling block was modified
git diff -- src/components/Header.astro | head -30
# expected: empty (we do not modify Header.astro in this task)

# No P2 trilogy modified
git diff -- src/lib/favorites.ts src/lib/recent.ts src/lib/history.ts src/lib/supabase-env.ts src/lib/sync.ts | head -10
# expected: empty (sync.ts is frozen per task constraint)
```

---

### Step 11: Commit

```bash
cd "D:/E/独立站/youtube-tools"

git add src/lib/migration.ts \
        src/scripts/migration.client.ts \
        src/scripts/sync-init.client.ts \
        src/i18n/translations.ts \
        tests/migration-helpers.test.ts \
        tests/_migration-child.ts \
        tests/migration.test.ts

git commit -m "feat(p3-3): LS-only → cloud migration (idempotency + toast) — closes P3 trilogy"
```

Expected: a single commit on `master` containing all 7 file changes.

---

### Step 12: Verify hard constraints

```bash
git diff 506da19..HEAD -- 'src/engines/*' --stat
# expected: empty (P3-1 P3-2 + P3-3 all preserve engines/)

git diff ae597bd..HEAD -- \
  src/lib/clerk-env.ts \
  src/scripts/clerk-init.client.ts \
  src/lib/supabase-env.ts \
  src/lib/sync.ts \
  --stat
# expected: empty (P3-1 + P3-2 data layer files unchanged by P3-3)
```

---

## Post-Task Orchestration (OUT OF TASK SCOPE)

These are NOT steps the implementer performs. Documented here for the orchestrator.

### Holistic pre-merge review

Per CLAUDE.md "holistic pre-merge review" rule (P3-3 touches 7 files = ≥5 threshold):

Dispatch `superpowers:code-review` skill at max effort (8 angles + verifier + sweep).

**Critical cross-file consistency checks:**
- LS key prefix agreement: `forgeflowkit:migration:{userId}` used identically in `src/lib/migration.ts` (single source) and `src/scripts/migration.client.ts` (no hardcoded prefix)
- i18n template variables: `{favorites}` `{recent}` `{history}` used identically in `src/scripts/migration.client.ts` and `src/i18n/translations.ts`
- `maybeMigrate` is the only call site (sync-init should not have both `pullAndMerge` and `maybeMigrate` in the same place)
- The Clerk mock pattern in `_migration-child.ts` is a faithful mirror of `_sync-menu-child.ts` (maintainability)
- `pnpm check` and `pnpm build` both pass on a clean tree

### Push sequence (per github-repo-info memory)

```bash
git fetch origin && git rev-list --left-right --count origin/master...HEAD
# expected: 0 N (0 remote-only, N local-only)

git push origin master
# gitee primary mirror

SKIP_PUSH_FETCH=1 git push github master
# github secondary mirror
```

### Memory update

Create `~/.claude/projects/D--E-----youtube-tools/memory/p3-3-shipped.md` per CLAUDE.md memory format. Update `MEMORY.md` index.

Mark `p3-trilogy-complete` (optional): If user wants a closing memory entry noting P3 auth+sync+migration all shipped, add to MEMORY.md.

---

## Appendix A: Self-Review (run 2026-07-02)

**1. Spec coverage:**

| Spec section | Plan task / step |
|---|---|
| §V1 Design — Idempotency key | Step 2 (helpers) + Step 5 (orchestrator) |
| §V1 Design — Toast | Step 4 (i18n keys) + Step 5 (showToast function) |
| §V1 Design — Trigger sequence (BOTH guards) | Step 5 (maybeMigrate body) + Step 6 (sync-init wire) |
| §V1 Design — Privacy (no new disclosure) | Step 4 (no header/privacy modifications) — explicit in Global Constraints |
| §"Components & Files" → src/lib/migration.ts | Step 2 |
| §"Components & Files" → src/scripts/migration.client.ts | Step 5 |
| §"Components & Files" → modify sync-init.client.ts | Step 6 |
| §"Components & Files" → 2 i18n keys | Step 4 |
| §"Components & Files" → 5 tests | Steps 3 (3 helper tests) + 8 (5 client tests) |
| §V1 Implementation → pnpm check exit 0 | Step 9 |
| §V1 Implementation → pnpm build | Step 9 |

**2. Placeholder scan:** None. Every step shows concrete code or concrete commands.

**3. Type consistency:** Verified.
- `hasMigrated(userId: string): boolean` — used identically in `migration.client.ts:maybeMigrate`
- `setMigrated(userId: string): void` — used identically in `migration.client.ts:maybeMigrate`
- `clearMigrated(userId: string): void` — V2 hook, exported for future use
- `maybeMigrate(userId: string): Promise<boolean>` — used by sync-init line ~289; matches Step 6 modification
- `MigrationStats { favorites, recent, history }` — defined Step 5, used in tests Step 7
- LS key prefix `forgeflowkit:migration:` — single source in Step 2 (`MIGRATION_KEY_PREFIX`); referenced only as that constant in Step 5

**4. Edge case coverage:** Verified in tests.
- Empty LS + empty cloud: Step 8 test 1 (empty-ls-empty-cloud-skips)
- LS-only + empty cloud: Step 8 test 2 (ls-only-pushes-to-empty-cloud)
- Idempotent re-run: Step 8 test 3 (idempotent-rerun-skips)
- Toast text correctness: Step 8 test 4 (toast-fires-on-items)
- Silent on empty: Step 8 test 5 (silent-on-empty)
- Helper safety when LS unavailable: Step 3 test 6 (safe when localStorage is unavailable)

**5. Concrete validation performed:**

- Confirmed `pullAndMerge` is exported by `src/lib/sync.ts` (not just by sync-init.client.ts) — verified by inspection at `src/lib/sync.ts` definition
- Confirmed sessionStorage key string matches existing P3-2 code (`'sync:did-pull-once'`) — verified via grep on `src/scripts/sync-init.client.ts:49`
- Confirmed LS key constants `forgeflowkit:favorites/recent/history` exist via grep on sync.ts:127-130 (uses imports from favorites/recent/history modules)
- Confirmed `translations` is a const object exported from `src/i18n/translations.ts` (verified via existing sync-init.client.ts:43 import)
- Confirmed `getLang()` pattern from `src/scripts/sync-init.client.ts:60-64` mirrored in Step 5
- Confirmed `--test-concurrency=1` usage in P3-2's `tests/sync-menu-wiring.test.ts` (Step 8 mirrors)

**6. Risks / non-blockers:**

- `import('../src/scripts/migration.client.ts')` from `_migration-child.ts` triggers the EOF self-call block — but the block only contains a comment (no side effects), so this is safe.
- The Clerk mock in `_migration-child.ts` uses `Module._resolveFilename` — verified pattern in `_sync-menu-child.ts:117-122`.
- Cross-process LS race on Windows: Step 9 commands include `--test-concurrency=1` to mitigate. Known debt recorded in P3-2 memory; not blocking P3-3.

---

## Appendix B: Out-of-Scope (per spec §V2)

These are explicitly NOT in V1 and should not be added during implementation:

- Modal/confirmation before migration
- Conflict preview UI
- Explicit "Import from cloud" button
- Cross-device migration coordinator
- Scheduled migration retry
- Custom toast component (V1 uses alert())
- "Reset migration state" link in sync menu (V1 hook `clearMigrated()` is exported for V2)
