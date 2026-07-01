# P3-2 Cross-Device Sync — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:brainstorming (already done) → superpowers:writing-plans (next) → superpowers:subagent-driven-development (execution).
>
> **Status:** V1 design approved 2026-07-01. P3-2 is the second sub-project of the P3 umbrella (auth → sync → migration).

## 1. Background

**ForgeFlowKit** is an Astro 4.16.19 SSG calculator SPA, deployed at `forgeflowkit.com`. 32 tools + blog + content pages, 159 static pages, i18n in en + zh.

**P2 trilogy (shipped 2026-06-30 → 2026-07-01, 11 commits):**
- P2a favorites — `forgeflowkit:favorites:v1` LS, ⭐ toggle, `/favorites/` page
- P2b recent viewed — `forgeflowkit:recent:v1` LS, 👁 auto-record, `/recent/` page
- P2c history snapshots — `forgeflowkit:history:v1` LS, 💾 save + restore-via-URL, `/history/` page

**P3-1 (shipped 2026-07-01, 9 commits):** Clerk BaaS authentication, no backend, no DB. `Header.astro` shows `[Login]` for logged-out users, Clerk UserButton (avatar + dropdown) for logged-in users. `getClerkInstance().user.id` is exposed as the user identity anchor for P3-2.

**P3-2 (this spec):** Bidirectional best-effort sync of P2 LS data (favorites/recent/history) to a Supabase Postgres backend. LS remains source of truth; cloud is a mirror.

**P3-2 deliberately does NOT touch:**
- P2 LS data (favorites/recent/history keys unchanged)
- P2 init scripts (favorites-init / recent-init / history-init 0 lines changed)
- P2 pages (`/favorites/`, `/recent/`, `/history/`)
- engines/ (frozen per CLAUDE.md)
- 32 tool count (frozen per CLAUDE.md)
- P3-1 Clerk wiring (Header mount block, clerk-init.client.ts unchanged)

## 2. Goal

Add cross-device sync of P2 user data. After P3-2 ships:
- A user signed in on phone gets favorites/recent/history that follows them to laptop (and vice versa)
- Sync is best-effort: LS is always complete; cloud is a mirror; field-level merge handles conflicts
- Sync is opt-in via Clerk login: signed out → LS-only (P2 behavior unchanged)
- User can manually trigger "Sync now" and see "Last synced: Xm ago"
- User can export all cloud data as JSON
- User can delete all cloud data (LS data unchanged)

## 3. Non-Goals (V1 explicitly does NOT do)

| Not in V1 | Reason | Deferred to |
|---|---|---|
| Real-time sync (websocket / Supabase Realtime) | V1 polling on trigger events; real-time adds complexity + cost | V2 (if user feedback demands) |
| Conflict resolution UI (per-field) | Field-level merge auto-resolves; UI would add cognitive load | V2 (if data loss complaints) |
| Multi-device session indicator | Showing "signed in on 2 devices" is Clerk feature; out of P3-2 scope | P3-3 or later |
| Selective sync per collection (sync favorites only, skip history) | All-or-nothing is simpler + matches user mental model | V2 |
| Sync quota / rate limiting per user | V1 payload ~23KB per user; well within Supabase free tier | When actual quota issue arises |
| Push notifications on remote change | Requires service worker + push permission; not core | V2 |
| Cross-tab conflict detection (BroadcastChannel) | Each tab debounces independently; eventual convergence acceptable | V2 |
| Custom merge rules per user | One-size-fits-all merge is enough for V1 | V2 |
| Account deletion cascade via Clerk webhook | V1 deletes cloud data on user click; Clerk account deletion leaves cloud data orphaned for 30 days | P3-3 with webhook |
| Sync of blog reading progress / tool preferences | P2 only covers 3 collections; expanding is YAGNI | When new LS data added |
| Sync of session-scoped data (last viewed calculator for "Continue where you left off") | Out of P2 scope; would need new LS key | When feature exists |
| Server-side rendering of personalized content | Project is SSG-only on Tencent CDN | If SSR ever added |

## 4. User Story

> As a ForgeFlowKit user with favorites/recent/history on my phone, I want to sign in on my laptop and see the same data. So I can: (a) continue work seamlessly across devices, (b) trust that my saved calculations and starred tools are safe, (c) export my data if I want to back it up, (d) delete it if I want to start fresh — all without losing local data on the device I'm using right now.

**Note:** P3-2 ships the **sync layer only**. Migration from LS-only → cloud-bound is implicit in the first-login pull (no separate wizard needed). Privacy policy MUST clarify what syncs (see Section 5.5).

## 5. Design

### 5.1 Architecture

**Layer model:**

```
┌─ Build time ─────────────────────────────────────────────┐
│  Astro reads VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY   │
│  Header.astro hasClerkEnv() && hasSupabaseEnv() gate      │
│  HTML rendered: <div data-clerk-mount> + sync menu        │
│  BaseLayout injects sync-init.client.ts <script>         │
│  privacy-policy.astro: 3 "never synced" strings updated  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─ Runtime (browser, signed in) ───────────────────────────┐
│  Clerk 登录后 → getClerkInstance().user.id = sync key     │
│                                                             │
│  P2 layer writes LS → notify() → sync-init subscriber    │
│    1. 防抖 5s 内合并 (同 collection 多次写合并为一次)      │
│    2. visibilitychange='hidden' → sendBeacon flush       │
│    3. push → Supabase REST upsert                         │
│                                                             │
│  onAuthResolved (first time per session) → sync-pull:     │
│    1. GET /rest/v1/user_<col>?clerk_user_id=eq.<id>      │
│    2. field-level merge with LS                            │
│    3. write merged back to LS (P2 subscribers fire)       │
│    4. push merged to cloud (ensures cloud has union)      │
│                                                             │
│  Avatar dropdown (signed in only):                         │
│    - "Sync now" → pull+merge+push                         │
│    - "Last synced: 5m ago" → static text from LS          │
│    - "Export JSON" → download 3-collection snapshot       │
│    - "Delete cloud data" → DELETE /rest/v1/user_*         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─ Supabase Postgres + RLS ─────────────────────────────────┐
│  3 tables: user_favorites / user_recent / user_history   │
│  Each row: (clerk_user_id PK, payload jsonb, last_updated)│
│  RLS: clerk_user_id = auth.jwt() ->> 'sub'               │
│  Clerk JWT verified by Supabase via Clerk's JWKS          │
│  Anon key is public; RLS is the security boundary         │
└─────────────────────────────────────────────────────────┘
```

**Why this is the right depth:**
- LS = source of truth, cloud = mirror (P2 UX zero change, P2 data zero risk)
- Supabase anon key + RLS = no server runtime needed (matches SSG project)
- Debounce + sendBeacon = traffic-controlled, tab-close safe
- Field-level merge = no data loss, no conflict UI

### 5.2 Components

#### 5.2.1 `src/lib/supabase-env.ts` (~25 lines, NEW)

Build-time helper: detect if Supabase env is configured. Mirrors `clerk-env.ts` pattern.

```typescript
/**
 * Detect if Supabase URL and anon key are present and valid.
 * Reads from .env / .env.production at build time via Vite/Astro.
 * Required for sync to function; absence degrades gracefully (no menu).
 */
export function hasSupabaseEnv(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(
    url && key &&
    !url.includes('REPLACE_ME') && !key.includes('REPLACE_ME') &&
    url.startsWith('https://') && url.includes('.supabase.co')
  );
}
```

#### 5.2.2 `src/lib/sync.ts` (~200 lines, NEW)

Core sync logic: pure merge functions + I/O wrappers.

**Pure functions (unit-testable, no I/O):**

```typescript
export type FavoritesPayload = { version: 1; slugs: string[]; lastUpdated: string };
export type RecentPayload = { version: 1; entries: Array<{slug: string; visitedAt: string}>; lastUpdated: string };
export type HistoryPayload = { version: 1; entries: Array<{id: string; slug: string; inputs: unknown; result: string; savedAt: string; accessedAt: string}>; lastUpdated: string };

export function mergeFavorites(ls: FavoritesPayload | null, cloud: FavoritesPayload | null): FavoritesPayload;
export function mergeRecent(ls: RecentPayload | null, cloud: RecentPayload | null): RecentPayload;
export function mergeHistory(ls: HistoryPayload | null, cloud: HistoryPayload | null): HistoryPayload;
```

**Merge rules (per collection):**
- `favorites`: set union (dedup by slug), cap at 50 (drop oldest by `lastUpdated` if any tie)
- `recent`: same slug → newer `visitedAt` wins; different slugs → timestamp top-N, cap 20
- `history`: same id → merge (newer `accessedAt` wins, `inputs`/`result` from newer); different ids → union, cap 100 by `accessedAt`

**I/O wrappers (accept `fetch` injection for tests):**

```typescript
export type SyncStatus = 'idle' | 'pushing' | 'pulling' | 'error';

export async function pushCollection(
  userId: string,
  collection: 'favorites' | 'recent' | 'history',
  payload: FavoritesPayload | RecentPayload | HistoryPayload,
  fetchImpl?: typeof fetch
): Promise<void>;

export async function pullCollection(
  userId: string,
  collection: 'favorites' | 'recent' | 'history',
  fetchImpl?: typeof fetch
): Promise<FavoritesPayload | RecentPayload | HistoryPayload | null>;

export async function syncNow(userId: string): Promise<{pushed: number; pulled: number}>;
export async function exportAll(userId: string): Promise<Blob>;
export async function deleteCloudData(userId: string): Promise<void>;
export function getLastSyncedAt(): string | null;
export function onSyncStatus(cb: (s: SyncStatus) => void): () => void;
```

**Supabase REST contract:**

```
POST   /rest/v1/user_favorites?on_conflict=clerk_user_id
       Headers: apikey: <anon>, Authorization: Bearer <clerk-jwt>, Prefer: resolution=merge-duplicates
       Body: {clerk_user_id, payload, last_updated}

GET    /rest/v1/user_favorites?clerk_user_id=eq.<id>
       Headers: apikey, Authorization
       Response: [{clerk_user_id, payload, last_updated}, ...] (0 or 1 row)

DELETE /rest/v1/user_favorites?clerk_user_id=eq.<id>
       Headers: apikey, Authorization
       Response: 204
```

#### 5.2.3 `src/scripts/sync-init.client.ts` (~120 lines, NEW)

Browser lifecycle: wire P2 LS events → debounced push; wire Clerk auth → pull.

```typescript
import { addSlug as addFavorite } from '../lib/favorites';
import { recordView } from '../lib/recent';
import { saveSnapshot } from '../lib/history';
import { getClerkInstance } from './clerk-init.client';
import { pushCollection, pullCollection, syncNow } from '../lib/sync';

const DEBOUNCE_MS = 5000;
const pendingPushes: Set<'favorites' | 'recent' | 'history'> = new Set();
let debounceTimer: number | null = null;
let didPullThisSession = false;

export function startSync(): void {
  const clerk = getClerkInstance();
  if (!clerk?.user) return;

  // Wire P2 layer (via subscribe pattern from favorites.ts/recent.ts/history.ts)
  // Each subscribe callback adds to pendingPushes and arms debounce
  // ...

  // First-session pull
  if (!sessionStorage.getItem('sync:did-pull-once')) {
    void pullAndMerge(clerk.user.id);
    sessionStorage.setItem('sync:did-pull-once', '1');
  }

  // Tab close flush
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushPending();
  });
}

export async function pullAndMerge(userId: string): Promise<void> { /* ... */ }
export async function flushPending(): Promise<void> { /* ... */ }

// SELF-INVOKE AT EOF (P3-1 Task 4 lesson — Vite tree-shakes unused exports)
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startSync);
  } else {
    startSync();
  }
}
```

#### 5.2.4 `src/components/Header.astro` (MOD, +25 lines)

Add sync menu items to Clerk avatar dropdown. Existing P3-1 block unchanged.

```astro
{showClerk && showSupabase && (
  <div class="sync-menu" data-sync-menu hidden>
    <button type="button" data-sync-now>Sync now</button>
    <span data-sync-last>Last synced: never</span>
    <button type="button" data-sync-export>Export JSON</button>
    <button type="button" data-sync-delete>Delete cloud data</button>
  </div>
)}
```

#### 5.2.5 `src/layouts/BaseLayout.astro` (MOD, +3 lines)

Add sync-init script import after clerk-init.

```astro
<script>
  import '../scripts/sync-init.client.ts';
</script>
```

#### 5.2.6 `src/pages/[lang]/privacy-policy.astro` (MOD, ~3 string updates)

Three existing strings need to change from "never synced" to "synced across your signed-in devices":

1. "Stays on your device only — never sent to our servers, never synced across devices"
2. "Is stored only on your device (not sent to our servers, no cross-device sync)"
3. (third similar string)

Plus new bilingual section:

**English:**
> ## Data Sync (Supabase)
> When you're signed in, your favorites, recently viewed calculators, and saved history snapshots are synced across your signed-in devices via Supabase (supabase.com). You can export all synced data as JSON or delete it at any time from the account menu. We retain your synced data until you delete it or delete your account.

**Chinese:**
> ## 数据同步（Supabase）
> 登录后，你的收藏、最近查看的计算器和保存的历史快照会通过 Supabase (supabase.com) 在你登录的设备之间同步。你可以随时从账户菜单导出所有同步数据为 JSON 格式，或将其删除。我们会保留你的同步数据，直到你删除或注销账户。

#### 5.2.7 `supabase/migrations/0001_user_sync.sql` (NEW)

```sql
-- 0001_user_sync.sql
-- 3 tables: one row per user per collection
-- RLS: clerk_user_id must match auth.jwt() ->> 'sub'

CREATE TABLE user_favorites (
  clerk_user_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_recent (
  clerk_user_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_history (
  clerk_user_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recent ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorites_self" ON user_favorites
  FOR ALL USING (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "recent_self" ON user_recent
  FOR ALL USING (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "history_self" ON user_history
  FOR ALL USING (clerk_user_id = auth.jwt() ->> 'sub');
```

#### 5.2.8 `scripts/check-supabase-env.mjs` (~50 lines, NEW)

CI gate mirror of `check-clerk-env.mjs`. Runs in `pnpm check`.

#### 5.2.9 `scripts/sync-supabase-schema.mjs` (~30 lines, NEW)

One-shot migration runner. Reads `supabase/migrations/0001_user_sync.sql` and applies via Supabase SQL editor API or psql (operational, not run in CI).

#### 5.2.10 `src/i18n/translations.ts` (MOD, +12 keys)

Add bilingual strings for sync UI:
- `sync.menu.syncNow` / `sync.menu.lastSynced` / `sync.menu.export` / `sync.menu.delete` / `sync.menu.never`
- `sync.status.pulling` / `sync.status.pushing` / `sync.status.error`
- `sync.toast.expired` / `sync.toast.unavailable` / `sync.toast.full`
- (en + zh)

### 5.3 Data Flow

#### 5.3.1 Write path (LS → Cloud, debounced)

```
User toggles favorite X in Tab A
  ↓
P2a favorites.ts: addSlug(X)
  ↓
LS: forgeflowkit:favorites:v1 = {version:1, slugs:[...prev, X], lastUpdated: T1}
  ↓
favorites.subscribe() fires → sync-init subscriber
  ↓
pendingPushes.add('favorites'); arm debounce timer (5s)
  ↓
[5s elapse, no more writes OR visibilitychange=hidden]
  ↓
flushPending():
  for collection in pendingPushes:
    read LS → pushCollection(userId, collection, payload)
  pendingPushes.clear()
  ↓
POST /rest/v1/user_favorites?on_conflict=clerk_user_id
  Body: {clerk_user_id, payload: <full envelope>, last_updated: T1+5s}
  ↓
Supabase upsert (RLS verifies Clerk JWT → user can only write own row)
  ↓
LS: forgeflowkit:sync-last-pushed:favorites = T1+5s
  ↓
Header avatar: "Last synced: just now" (via onSyncStatus callback)
```

#### 5.3.2 Login pull path (Cloud → LS, once per session)

```
User signs in via Clerk SignIn modal
  ↓
Clerk.user becomes truthy
  ↓
clerk-init.client.ts auto-mounts UserButton
  ↓
onAuthResolved(user) → sync-init.startSync() (NEW: P3-1 hook)
  ↓
sessionStorage.getItem('sync:did-pull-once') === null (first time this session)
  ↓
pullAndMerge(user.id):
  parallel: pull × 3 collections
    GET /rest/v1/user_favorites?clerk_user_id=eq.<id>
    GET /rest/v1/user_recent?clerk_user_id=eq.<id>
    GET /rest/v1/user_history?clerk_user_id=eq.<id>
  ↓
3 responses (each 0 or 1 row)
  ↓
mergeFavorites(LS, cloud), mergeRecent(LS, cloud), mergeHistory(LS, cloud)
  ↓
writeMergedToLS (uses P2 layer setters → fires P2 subscribers → UI updates)
  ↓
push merged to cloud (ensures cloud has the union, in case LS was ahead)
  ↓
sessionStorage.setItem('sync:did-pull-once', '1')  ← prevent re-pull on tab focus
```

**LS-only → cloud migration (implicit):** If user signs in for the first time with existing LS data, cloud returns 3 null rows → merge(LS, null) = LS → push LS to cloud. No separate migration wizard needed (per Q6 brainstorm decision).

#### 5.3.3 Manual sync path (avatar "Sync now")

```
Click "Sync now" in avatar dropdown
  ↓
syncNow(userId) — same as login pull path, minus the sessionStorage guard
  ↓
emit('pulling') → Header shows spinner (replaces "Last synced: Xm ago")
  ↓
parallel: pull + merge + push × 3 collections
  ↓
emit('pushed: 3, pulled: 3') → "Last synced: just now"
  (errors → emit('error') → toast "Sync failed, will retry on next change")
```

#### 5.3.4 Export path (avatar "Export JSON")

```
Click "Export JSON"
  ↓
exportAll(userId):
  parallel: GET × 3 collections
  ↓
JSON.stringify({
  exportedAt: new Date().toISOString(),
  userId,
  favorites: <payload>,
  recent: <payload>,
  history: <payload>
}, null, 2)
  ↓
new Blob([json], {type: 'application/json'})
  ↓
URL.createObjectURL(blob) → <a download="forgeflowkit-sync-<date>.json">
  ↓
Trigger click → download starts
```

**Note:** Export reads from **cloud**, not LS. Cloud has the union (post-merge), so it's the authoritative snapshot for "what's synced". LS may have data not yet pushed (e.g., last 0-5s).

#### 5.3.5 Delete path (avatar "Delete cloud data")

```
Click "Delete cloud data" → confirm("Delete all synced data from Supabase?")
  ↓
deleteCloudData(userId):
  parallel: DELETE × 3 tables
  ↓
LS data UNCHANGED (per Q8: keep LS, delete cloud)
  ↓
Header avatar: "Last synced: never" (until next push)
  ↓
Next push will recreate rows (upsert)
```

#### 5.3.6 Conflict resolution (per collection)

| Scenario | favorites (set union) | recent (timestamp top-N) | history (id union) |
|---|---|---|---|
| Cloud has A,B; LS has C,D | Result: A,B,C,D | Whichever has later `visitedAt` per slug wins | Both kept, cap 100 by `accessedAt` |
| Same slug in both | Dedup, `lastUpdated` = max(LS, cloud) | Same | Same id = same entry, merge `inputs`/`result` from newer |
| Both empty | Empty | Empty | Empty |
| Cloud stale (LS newer) | LS wins, then push overwrites cloud | LS wins, push overwrites | LS wins, push overwrites |
| Cloud null (no row) | LS wins, push creates row | LS wins, push creates row | LS wins, push creates row |
| LS null (fresh install) | Cloud wins, write to LS | Cloud wins, write to LS | Cloud wins, write to LS |
| Version mismatch (cloud has v0, LS has v1) | Cloud wins, LS bumped to v1 | Cloud wins | Cloud wins |

**Rationale:** Set union for favorites preserves user intent (star is forever). Timestamp top-N for recent respects the "most recent visit" semantic. ID-based union for history preserves all saved snapshots (user might want to restore an old one).

### 5.4 Error Handling

| Failure mode | Detection | User impact | Recovery | Cloud impact |
|---|---|---|---|---|
| Network down (push) | `fetch` throws / `TypeError: Failed to fetch` | None (LS already wrote); "Last synced" stays stale | Next debounce retry (5s after next LS write) + manual "Sync now" | No data loss (LS = source of truth) |
| Network down (pull on login) | `fetch` throws | None (LS data still works) | Next manual "Sync now" | Stale cloud data unchanged |
| 401 from Supabase (RLS / JWT expired) | Response status 401 | Toast: "Session expired, please sign in again" | Trigger Clerk sign-in flow | No write occurred (RLS blocked) |
| 403 from Supabase | Response status 403 | Toast: "Sync disabled for this account" | Logout from sync, revert to LS-only | No write occurred |
| 409 conflict (PostgREST upsert missing) | Response status 409 | Retry once with explicit upsert | Use `on_conflict=clerk_user_id` from start (prevents 409) | Idempotent upsert |
| 5xx from Supabase | Response status 5xx | Toast: "Sync temporarily unavailable" | Next debounce/manual sync retries | No data loss |
| Supabase env missing (build/runtime) | `hasSupabaseEnv() === false` | Header avatar shows no sync menu (logged in but no sync capability) | Add env vars in `.env` → rebuild | Sync disabled, LS-only mode |
| Clerk env missing (P3-1 status) | `hasClerkEnv() === false` | No login button, sync unreachable | (orthogonal — handled by P3-1) | N/A |
| LS quota exceeded (5MB+ in history) | `localStorage.setItem` throws `QuotaExceededError` | Toast: "Storage full, sync paused" | User clears via Settings; sync resumes | Cloud has stale data, LS doesn't update |
| Schema mismatch (old LS envelope `{version: 0}` vs new `v1`) | `payload.version !== 1` in merge | Drop old version, use cloud as authoritative | Bump `EXPECTED_VERSION` constant | Old payloads discarded |
| Corrupt JSON in cloud | `JSON.parse` throws | Treat as missing data, use LS | Push LS overwrites corrupt row | Repaired on next push |
| Concurrent tabs (3 tabs push different favorites) | Last-write-wins on `last_updated` | All 3 tabs eventually converge to union | Acceptable V1 trade-off; debounce + small jitter | Minor: brief divergence between tabs |
| Tab close during debounce window | `visibilitychange === 'hidden'` fires | None if `sendBeacon` flushes in time | `sendBeacon` survives page close (no async race) | All data preserved |
| Tab close WITHOUT flush (browser crash) | N/A | Last 0-5s of changes lost | Acceptable V1 trade-off (P2 LS is source of truth) | Cloud slightly behind LS until next login |
| Schema migration failed (DDL error) | `sync-supabase-schema.mjs` exits non-zero | Build error; no runtime impact | Fix SQL and re-run | Tables not created; sync would fail at runtime with clear error |

**Specific mitigations built into design:**

1. **No data loss:** LS writes happen first, sync is best-effort. LS is always complete.
2. **Push uses `navigator.sendBeacon` on visibilitychange** — survives page close.
3. **Pull is one-shot per session** — `sessionStorage` guard prevents repeated pulls on every `onAuthResolved` (Clerk fires this on tab focus too).
4. **Sync is gracefully degraded:** missing env → no menu, no error. User just doesn't see sync.
5. **Toast notifications** (via existing toast utility if present, else `console.warn` for V1) for user-visible failures.
6. **LS env gate is independent of Clerk env gate:** if Clerk env present but Supabase env missing → "Login" works but no sync menu. If both missing → "Login" hidden too.
7. **All I/O functions accept `fetch` injection** — enables unit tests with mock fetch (no real Supabase needed).

### 5.5 Privacy / GDPR

Privacy policy has 3 changes:

1. **3 existing "never synced" strings updated** to reflect P3-2 sync reality
2. **New bilingual Supabase section** (Section 5.2.6 above)
3. **i18n consistency:** sync UI strings (12 keys) added to `src/i18n/translations.ts`

**Other privacy decisions:**
- No cookie consent banner V1 (sync is opt-in via Clerk login; Supabase auth header is essential)
- **Cloud data retention:** kept until user clicks "Delete cloud data" or deletes Clerk account
- **Clerk account deletion:** cloud rows orphaned for ~30 days (no webhook cascade in V1). Resolved by P3-3.
- **Export right (GDPR Art. 20):** "Export JSON" button enables data portability
- **Erasure right (GDPR Art. 17):** "Delete cloud data" button enables erasure (cloud-only; LS unaffected)
- **Data minimization:** we store 3 P2 envelopes per user (~23KB total). No telemetry, no usage analytics.

## 6. Testing Strategy

### 6.1 Test Matrix

| Layer | File | Type | Count | Covers |
|---|---|---|---|---|
| `supabase-env.ts` | `tests/supabase-env.test.ts` | unit | 6 | env present/missing/empty/REPLACE_ME/malformed-scheme/dual-source-fallback |
| `check-supabase-env.mjs` | `tests/check-supabase-env.test.ts` | spawn node | 4 | exit 0 (valid)/exit 1 (CI no env)/exit 0 (local no env)/exit 1 (REPLACE_ME) |
| `sync.ts` merge fns | `tests/sync-merge.test.ts` | unit | 8 | favorites (4) + recent (2) + history (2) — union/dedup/cap/version-mismatch |
| `sync.ts` I/O wrappers | `tests/sync-supabase-io.test.ts` | unit (mock fetch) | 4 | push/pull/syncNow/401-error |
| `sync-init.client.ts` | `tests/sync-init.test.ts` | per-test child proc | 4 | debounce timer/visibility-flush/pull-once-guard/Clerk-null-skip |
| Header sync menu | `tests/header-sync-ui.test.ts` | build snapshot | 3 | both envs → menu rendered/only Clerk → no menu/only Supabase → no menu |
| BaseLayout sync script | `tests/baselayout-sync-script.test.ts` | build snapshot | 2 | sync-init import exists/no duplicate |
| privacy-policy sync clause | `tests/privacy-policy-sync.test.ts` | assertion | 2 | en + zh Supabase section present |

**Total: 33 new tests** (matches P3-1's 33-test count)

### 6.2 What V1 does NOT test (manual verification only)

These scenarios require real Clerk + Supabase credentials. Listed in plan as "manual verification steps" for the implementer to run via curl + browser DevTools.

**M1. End-to-end happy path:**
- Sign in Tab A, favorite X
- Wait 5s, refresh
- Sign in Tab B (same account)
- Verify X appears in favorites (pull worked)
- Unfavorite X in Tab B
- Wait 5s in Tab A, refresh
- Verify X removed in Tab A (push from B worked)

**M2. Conflict resolution:**
- Tab A: favorite X offline (LS writes, push fails)
- Tab B: favorite X online (push succeeds)
- Tab A: come back online
- Trigger "Sync now"
- Verify: X remains favorited in both (set union, no loss)

**M3. Schema version mismatch:**
- Manually set LS `forgeflowkit:favorites:v1 = {version: 0, slugs: ['A']}`
- Cloud has `{version: 1, slugs: ['B']}`
- Sign in → pull → merge
- Verify: LS = `{version: 1, slugs: ['A', 'B']}`, cloud = `{version: 1, slugs: ['A', 'B']}`

**M4. Tab close during debounce:**
- Favorite X
- Within 5s, close tab
- Reopen, sign in
- Verify: cloud has X (`sendBeacon` flushed)

**M5. Delete cloud data:**
- Sign in, verify cloud has data (after push)
- Click "Delete cloud data" → confirm
- Verify: cloud rows gone (GET returns []), LS data unchanged
- Trigger one more push → cloud rows reappear (upsert)

**M6. Export JSON:**
- Sign in with data in 3 collections
- Click "Export JSON"
- Verify: downloaded file has all 3 collections + timestamps + valid JSON

### 6.3 Per-test isolation pattern (P3-1 precedent)

- `sync-init` tests run in fresh child processes (P2/P3-1 pattern) to avoid module-cache pollution
- Build tests use `--test-concurrency=1` on Windows to avoid stale dist/ races
- Build helper caches by env variant (`tests/_supabase-build-helper.ts` mirrors `_clerk-build-helper.ts`)
- LS mocks via `node-localstorage` polyfill in sync-merge tests (no real browser needed)

### 6.4 E2E tests (NOT in V1)

No Playwright/Cypress. Project has no E2E framework per CLAUDE.md. Manual M1-M6 cover critical paths.

## 7. Global Constraints (binding)

**CLAUDE.md invariants — must NOT appear in diff:**
1. ❌ `src/engines/` zero changes (32 engines frozen)
2. ❌ 32 tool count frozen
3. ❌ `blog-posts.ts` still deleted (P1-2)
4. ✅ i18n completeness check passes (143 keys + 12 new = 155 keys)
5. ✅ 3 mirrors in sync: gitee (origin=wlz679/calcKit) + github (wlz679/forgeflow)
6. ✅ github push uses `SKIP_PUSH_FETCH=1`
7. ✅ `pnpm check` exit 0 before commit (now includes `check-clerk-env` AND `check-supabase-env`)
8. ✅ Pre-commit hook (`.githooks/pre-commit`) runs codegen check — P3-2 unaffected

**P2 trilogy invariants — must NOT change:**
- `forgeflowkit:favorites:v1` / `:recent:v1` / `:history:v1` LS keys
- `src/lib/{favorites,recent,history}.ts` (0 lines changed)
- `src/scripts/{favorites,recent,history}-init.client.ts` (0 lines changed)
- P2 dropdowns in Header (3 blocks, untouched)
- `/favorites/`, `/recent/`, `/history/` pages (0 lines changed)

**P3-1 invariants — must NOT change:**
- `src/lib/clerk-env.ts` (0 lines changed)
- `src/scripts/clerk-init.client.ts` (0 lines changed; P3-2 only CONSUMES `getClerkInstance()`)
- `Header.astro` Clerk mount block (P3-2 adds SIBLING menu block, not modify existing)
- `BaseLayout.astro` Clerk script tag (P3-2 adds SIBLING script tag)
- `privacy-policy.astro` Clerk section (P3-2 adds SIBLING Supabase section)

**New constraints introduced by P3-2:**
- `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` required in CI env (build fails without via `check-supabase-env`)
- `@supabase/supabase-js ^2.x` added to dependencies (latest at install time, spec drift allowed per P3-1 lesson)
- `.env` and `.env.local` already in `.gitignore` (P3-1)
- `.env.example` extended with 2 new placeholders
- 1 new file: `supabase/migrations/0001_user_sync.sql` (operational, not bundled in dist/)
- 1 new SQL migration must be applied to Supabase project before first use (operational, not in build)

## 8. Implementation Plan (preview — formal plan in next step)

7 tasks following P3-1 subagent-driven pattern (3 mechanical + 4 integration):

| # | Task | Class | Files | Reviewers |
|---|---|---|---|---|
| T1 | `src/lib/supabase-env.ts` + 6 unit tests | [MECHANICAL] | +1 lib, +1 test | 1 impl + 1 spec |
| T2 | `scripts/check-supabase-env.mjs` + 4 tests | [MECHANICAL] | +1 script, +1 test | 1 impl + 1 spec |
| T3 | `supabase/migrations/0001_user_sync.sql` + `scripts/sync-supabase-schema.mjs` | [MECHANICAL] | +1 SQL, +1 script | 1 impl + 1 spec |
| T4 | `src/lib/sync.ts` (merge + I/O) + 12 tests | [INTEGRATION] | +1 lib, +2 tests | 1 impl + 1 spec + 1 quality |
| T5 | `src/scripts/sync-init.client.ts` + 4 component tests | [INTEGRATION] | +1 init, +1 test | 1 impl + 1 spec + 1 quality |
| T6 | Header.astro + BaseLayout.astro + .env.example + 5 snapshot tests + 12 i18n keys | [INTEGRATION] | +3 source, +2 tests, +1 i18n | 1 impl + 1 spec + 1 quality |
| T7 | privacy-policy.astro (3 string updates + Supabase section) + 2 tests + holistic review | [INTEGRATION] | +1 page, +1 test | 1 impl + 1 spec + holistic 8 angles |

**Estimated commits: 10-12** (1+1+1+2+2+3+1-2, matches P3-1's 9-commit scope plus 1 extra for the SQL file and possibly 1 extra for the i18n)

**Per-task review calibration** (per CLAUDE.md):
- Mechanical tasks (T1, T2, T3): 1 implementer + 1 spec reviewer
- Integration tasks (T4, T5, T6, T7): 1 implementer + 1 spec reviewer + 1 quality reviewer
- Holistic review (part of T7): 8-angle cross-file review per `superpowers:code-review`

## 9. V1 Limitations (explicit)

| Limit | Reason | Resolved by |
|---|---|---|
| No real-time sync (push notifications on remote change) | Polling on trigger events; real-time adds websocket complexity | V2 if user feedback demands |
| No cross-tab BroadcastChannel | Each tab debounces independently; eventual convergence acceptable | V2 |
| No custom merge rules per user | One-size-fits-all merge | V2 |
| No orphan cloud cleanup (Clerk account deletion leaves cloud rows) | V1 deletes cloud data on user click only | P3-3 with Clerk webhook |
| Tab close without visibilitychange = up to 5s data loss in cloud | `sendBeacon` covers visibilitychange; browser crash doesn't fire it | V2 with periodic push |
| Concurrent tabs may have brief divergence | Last-write-wins on `last_updated` | V2 with BroadcastChannel |
| No sync of new P2 keys (when added) | Pattern is generic, new keys need a one-line addition | Per future P2 key (YAGNI now) |
| "Last synced: 5m ago" string in English only | V1 hardcode English (i18n string exists but Header doesn't render it from i18n) | V1.1 quick i18n fix |
| Export reads from cloud (not LS) | Cloud has union; LS may have un-pushed data | Documented in export tooltip |
| One-time Supabase schema migration required before first use | Operational step; runs `scripts/sync-supabase-schema.mjs` once on Supabase project | One-time setup (documented in README) |
| Bundle size: +Supabase client SDK ~30KB gzipped | Similar to P3-1 Clerk SDK; not blocking | V2 with dynamic import on sync menu click |

## 10. Rollback Strategy

Single-commit rollback feasible (V1 ships as ~10-12 commits but each is independently revertible):

```bash
git revert <last-p3-2-commit>     # reverts all P3-2 changes
# OR surgically:
rm src/lib/supabase-env.ts
rm src/lib/sync.ts
rm src/scripts/sync-init.client.ts
rm scripts/check-supabase-env.mjs
rm scripts/sync-supabase-schema.mjs
# Edit src/components/Header.astro → remove {showClerk && showSupabase && ...} block
# Edit src/layouts/BaseLayout.astro → remove <script>import sync-init</script>
# Edit src/pages/[lang]/privacy-policy.astro → revert 3 strings + remove Supabase section
# Edit src/i18n/translations.ts → remove 12 sync keys
# Edit package.json → remove @supabase/supabase-js dep
# Edit .env.example → remove 2 new placeholders
# Edit pnpm check script → remove check-supabase-env call
# SQL: drop 3 tables in Supabase (operational, manual)
```

**P2 + P3-1 data unaffected** by rollback (P3-2 doesn't touch P2 LS keys, P2 init scripts, P3-1 Clerk wiring).

## 11. Decision Log (P3-3 reservation points)

When P3-3 ships, these points are reserved for the migration layer to integrate:

| Reservation point | Location | What P3-3 needs to add |
|---|---|---|
| Clerk account deletion webhook | NEW endpoint (P3-3 introduces) | Listen for `user.deleted`, cascade delete all 3 Supabase tables |
| First-login detection | `src/scripts/sync-init.client.ts` `startSync()` | Detect LS data on first auth, prompt migration wizard if data > 0 |
| Migration wizard route | `src/pages/[lang]/migrate.astro` (P3-3) | One-time UI with "Keep LS / Discard LS / Merge" options |
| Migration API | `/api/migrate` (P3-3) | Bulk LS → cloud transfer (or wait — P3-2 already handles this via first-login pull) |
| Stripe / billing integration | N/A (P3-2 has no payments) | Future (post-P3) |
| Multi-account / switch account | Clerk feature | Use Clerk's built-in `setActive({sessionId})` |
| Cross-device session indicator | `src/components/Header.astro` avatar menu | "Active on 2 devices" badge from Clerk's session list |
| Data retention policy enforcement | NEW cron job (P3-3) | Auto-delete cloud rows > 90 days inactive |

**Note on P3-3 scope reduction:** P3-2's first-login pull already handles LS-only → cloud-bound migration implicitly (Q6 brainstorm decision). P3-3 becomes primarily:
1. Clerk webhook for account deletion cascade
2. Optional: explicit migration UI for users who want to confirm/curate before first sync
3. Optional: cron job for inactive data cleanup

This is significantly smaller than originally planned. P3-3 is now ~1-2 tasks instead of ~3-4.

---

**Spec complete.** Self-review follows.

---

## Appendix A: Self-Review (run 2026-07-01)

**1. Placeholder scan:** No "TBD" / "TODO" / "later" present. All deferred items marked as V1 limitations with V2 / P3-3 attribution.

**2. Internal consistency:** "P3-2 = sync only, P3-1 = auth only" stated in 5 places (Background, Goal, Non-Goals, Constraints, Limitations) — consistent. "LS = source of truth" stated in 4 places (Architecture, Data Flow 5.3.1, Error Handling 5.4, Rollback) — consistent. "Field-level merge" specified in 3 places (Architecture, Components 5.2.2, Data Flow 5.3.6) — consistent.

**3. Scope check:** Single sub-project. ~1-2 weeks of work. Testable: 33 unit/snapshot tests + 6 manual M1-M6 cover all layers. Rollback-able: surgical rm or single commit revert. ✅

**4. Ambiguity check:**
- "Sync trigger" → §5.3.1 specifies LS subscribe + debounce + visibilitychange
- "Merge behavior per collection" → §5.2.2 (mergeFavorites/Recent/History) + §5.3.6 (conflict matrix)
- "Auth identity" → §5.2.3 `getClerkInstance().user.id` (P3-1 contract)
- "Cloud data retention" → §5.5 (kept until user clicks delete or Clerk account deleted; 30-day orphan window noted)
- "Bundle size" → §9 explicit limitation; not blocking
- "Schema migration" → §5.2.9 (one-shot operational script, not in build)

**5. CLAUDE.md alignment:**
- ✅ engines/ frozen (§7)
- ✅ 32 tools frozen (§7)
- ✅ P2 trilogy 0 lines changed (§7)
- ✅ P3-1 Clerk 0 lines changed (§7)
- ✅ Mirror push flow (§7)
- ✅ pnpm check exit 0 (§7)
- ✅ Subagent-driven execution pattern (§8)
- ✅ Per-task review calibration (§8 — 3 mechanical + 4 integration)

**6. P3-1 lessons applied:**
- ✅ Self-call pattern at EOF of `sync-init.client.ts` (§5.2.3 explicit code block, P3-1 Task 4 lesson)
- ✅ `fetch` injection for testability (§5.2.2, P3-1 spec compliance review lesson)
- ✅ `--test-concurrency=1` for build tests (§6.3, P3-1 Task 4 Windows race lesson)
- ✅ Build helper caches by env variant (§6.3, P3-1 `_clerk-build-helper.ts` precedent)
- ✅ Spec drift allowed on dep versions (§7, P3-1 Task 3 ^5→^6 lesson — use "latest" / "x")

**7. Risks identified (not blockers):**
- **R1:** Supabase anon key is public. RLS is the only security boundary. SQL policy must be exactly `clerk_user_id = auth.jwt() ->> 'sub'`. Verified by Task 3 (SQL migration) reviewer.
- **R2:** Clerk JWT must be configured in Supabase. Operational step, not in code. Documented in `scripts/sync-supabase-schema.mjs` comments + Section 7 "New constraints".
- **R3:** Schema migration is one-shot and operational (not in build). If forgotten, runtime errors are clear (table not found). M5 manual test covers this.
- **R4:** P3-1 `clerk-init.client.ts` does NOT emit an `onAuthResolved` event — P3-2 `sync-init.client.ts` will poll `getClerkInstance().user` periodically (every 1s for first 5s after page load, then stop). If Clerk.user becomes truthy → trigger pull. This avoids modifying P3-1 code.

**No critical issues found. Spec approved by self-review.**