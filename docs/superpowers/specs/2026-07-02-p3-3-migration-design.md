# P3-3 Migration Design (LS-only → Cloud Account)

**Date:** 2026-07-02
**Status:** DRAFT (brainstorming)
**Author:** Claude (subagent-driven-development orchestrator)
**Context:** P3 trilogy closer — handle users who used the app pre-sign-in and now want to bring LS data into their cloud account.

---

## Executive Summary

P3-3 is **largely already shipped as part of P3-2**. The `pullAndMerge()` function in `src/scripts/sync-init.client.ts:134-158` IS the migration orchestrator: it pulls cloud state, reads LS envelopes, LWW-merges via `mergeFavorites/mergeRecent/mergeHistory`, writes merged back to LS, and pushes to cloud. It's already triggered on first Clerk auth resolution per tab (gated by sessionStorage flag `sync:did-pull-once`).

This spec therefore is **a close-out**: it documents what P3-2 already provides, codifies the missing UX polish, and gives an explicit definition for "P3-3 shipped" so future sessions have a clear target.

**V1 scope (the only plan + execute this doc generates):**
1. Promote idempotency from sessionStorage (per-tab) to LS (per-device per Clerk user)
2. Add a one-shot toast confirming migration (with collection counts)
3. Add 1 isolation test for migration (independent of existing sync tests)

**V2 deferred (out of P3-3):**
- Modal/confirmation UI before migration
- Conflict preview ("you have 12 local + 8 cloud, we merged to 20")
- Explicit "Import from cloud" button for LS-empty users

---

## Background

### What P3-2 already provides (no work needed)

P3-2's `src/lib/sync.ts` exports:
- `mergeFavorites(ls, cloud)` — set union, cap 50, drop oldest by `lastUpdated` on overflow (§5.2.2 of P3-2 spec)
- `mergeRecent(ls, cloud)` — timestamp top-N, cap 20, same slug → newer `visitedAt` wins
- `mergeHistory(ls, cloud)` — id-based union, cap 100, same id → newer `accessedAt` wins

P3-2's `src/scripts/sync-init.client.ts:134-158` `pullAndMerge()` function:
1. `pullCollection(userId, 'favorites')` etc. × 3 (parallel-ish, sequential in current code)
2. `readLSEnvelope('favorites')` etc. × 3
3. `mergeFavorites(favLS, favCloud)` etc. × 3
4. `writeLSEnvelope('favorites', favMerged)` etc. × 3 — LS now has union
5. `pushCollection(userId, 'favorites', favMerged)` etc. × 3 — cloud now has union

Triggered in `pollForAuthAndPull()` at line 282-303 with `sessionStorage.getItem(SESSION_PULL_KEY)` guard (once per tab per page life).

### What V1 still adds (P3-3 scope)

| Concern | Today | V1 (this spec) | Why |
|---|---|---|---|
| Idempotency | sessionStorage = per-tab | LS key = per-device per Clerk user | User who keeps browser data longer than a tab doesn't re-pull. Reduces wasted Supabase calls. |
| Migration UX feedback | Silent | Transient toast: "Imported X favorites, Y recent items" | User understands what just happened. Otherwise silent background feels confusing. |
| Migration isolation test | Covered as a side-effect of sync tests | 1 dedicated test that LS-only data with empty cloud → cloud ends up with LS data after migration | Currently tests verify pull/merge/push separately. No end-to-end "LS → migration → cloud" test exists. |
| Privacy disclosure | "Data syncs to Supabase when signed in" (P3-2 added) | No new disclosure | Same data → same destination → existing disclosure covers it. |

### V2 deferred

| Feature | Why deferred |
|---|---|
| Migration confirmation modal | Requires explicit user choice; unnecessary friction for the implicit "I just signed in, sync my data" expectation |
| Conflict preview UI | LWW is automatic and predictable; explicit previews add complexity without clear user value |
| Explicit "Import from cloud" button | Already covered by `data-sync-export` (download) + the existing pull on sign-in |
| Cross-device coordinator | Out of scope — LS is per-device; cloud is per-Account; reconciliation handled by LWW |

---

## V1 Design

### Idempotency key

**Name:** `forgeflowkit:migration:{clerkUserId}`
**Type:** ISO timestamp string of last successful migration
**Location:** LS (not sessionStorage — see rationale above)
**Lifecycle:** Per Clerk user identity, persists across tab closes, only resets if user manually clears site data

**Read on pollForAuthAndPull tick:**
```typescript
function hasMigrated(userId: string): boolean {
  if (typeof globalThis === 'undefined' || !(globalThis as any).localStorage) return false;
  const key = `forgeflowkit:migration:${userId}`;
  return !!(globalThis as any).localStorage.getItem(key);
}
```

**Write after successful pullAndMerge:**
```typescript
function setMigrated(userId: string): void {
  if (typeof globalThis === 'undefined' || !(globalThis as any).localStorage) return;
  const key = `forgeflowkit:migration:${userId}`;
  (globalThis as any).localStorage.setItem(key, new Date().toISOString());
}
```

**Decision: clear old sessionStorage flag?** Keep sessionStorage flag too. Both are belt-and-suspenders: sessionStorage wins for "this tab has already migrated" check; LS wins for "this device has already migrated" (cross-tab). Code does both checks, both must be unset to run migration.

### Migration toast

**Trigger:** Immediately after successful pullAndMerge
**Message:** Bilingual string `"sync.migration.complete"` = `"Imported {favorites} favorites, {recent} recent items, {history} history entries"` (en) / `"已导入 {favorites} 个收藏、{recent} 个最近项、{history} 个历史记录"` (zh)
**Counts:** Read from final merged payload lengths (post-merge, so new items brought in are highlighted)
**Empty case:** If LS was empty AND cloud was empty → don't show toast (nothing happened; pointless)
**i18n keys added:** 2 (`sync.migration.complete`, `sync.migration.empty`)
**Display:** Browser toast via `alert()` for V1 (sufficient; P3-3 not building a toast component). V2 may upgrade to in-page toast.

### Edge cases

| Scenario | Behavior | Why |
|---|---|---|
| Empty LS + empty cloud | No-op (no toast, no request) | Nothing to do; don't waste Supabase round-trip |
| LS has data + empty cloud | Straight push via merge → toast shows counts | Normal "first sign-in" case |
| Empty LS + cloud has data | Straight pull (LS gets cloud data, cloud stays) → toast shows counts | User joined from another device |
| LS + cloud both have data | LWW merge → toast shows counts with new-item highlights | Multi-device case |
| User signs out + signs in on same device | `forgeflowkit:migration:{userId}` exists → skip migration; normal sync continues | Idempotency per Clerk user per device |
| User signs out + signs in as DIFFERENT user | Different `forgeflowkit:migration:{newUserId}` → migration runs for new user | Per-User isolation |
| User clears LS (manual) then signs in | `forgeflowkit:migration:{userId}` still set → skip migration; cloud data pulled via existing sync | Idempotent + correct |
| User clears cloud (via "Delete cloud data" button) then refreshes | `forgeflowkit:migration:{userId}` still set → skip migration; LS untouched | Idempotent + correct |
| Migration of 1 collection fails (e.g. network blip on history) | Favorites + recent already merged + pushed; history retries via existing `flushPending` on next change OR user clicking "Sync now" | Per-collection independence from P3-2 design |

### Migration trigger sequence

```
Page load
  ↓
sync-init.client.ts: pollForAuthAndPull runs (every 1s for up to 5s)
  ↓
First tick where clerk.user is defined
  ↓
Check BOTH guards:
  - sessionStorage[SESSION_PULL_KEY] absent
  - localStorage[`forgeflowkit:migration:{clerkUserId}`] absent
  ↓
Both unset → run pullAndMerge → setMigrated(clerkUserId) → sessionStorage[SESSION_PULL_KEY] = '1'
  ↓
Either set → skip pullAndMerge (normal sync continues via debounce)
```

**Note:** Existing pollForAuthAndPull already runs `pullAndMerge` once per tab via sessionStorage guard. The change is: the guard adds an additional LS-level check before calling pullAndMerge, AND after success writes to BOTH sessionStorage AND LS.

### Privacy disclosure

**No new section needed.** P3-2 added "Data Sync (Supabase)" bilingual section to `src/pages/[lang]/privacy-policy.astro` (commit a641e13) covering:
- Collection names (favorites / recent / history)
- Field set (~23KB total)
- Auth via Clerk
- Export / delete affordance

Migration is the same data going to the same destination via the same auth provider. Existing language covers it. No new consent flow required.

(If regulatory review later flags "first sign-in should require explicit consent", we add a modal in V2.)

---

## Components & Files

### New code (~80 lines)

| File | Action | Approx LoC | Purpose |
|---|---|---|---|
| `src/lib/migration.ts` | Create | ~30 | `hasMigrated(userId)`, `setMigrated(userId)`, `clearMigrated(userId)` (V2 reset hook) — pure functions, no fetch |
| `src/scripts/migration.client.ts` | Create | ~50 | Browser-side orchestrator: `maybeMigrate(userId)` — checks guards, runs pullAndMerge, writes idempotency, shows toast. Self-call EOF. |
| `tests/migration.test.ts` | Create | ~30 | 1 test: empty LS + empty cloud → migration skipped (no fetch). 1 test: LS-only + empty cloud → after migration, fetch POST observed. |
| `src/i18n/translations.ts` | Modify | +10 | Add 2 new keys (en + zh) for `sync.migration.complete`, `sync.migration.empty` |

### Modified code

| File | Action | Approx LoC | Purpose |
|---|---|---|---|
| `src/scripts/sync-init.client.ts` | Modify | ~10 | Replace existing `sessionStorage.getItem(SESSION_PULL_KEY)` guard with `maybeMigrate(userId)` call (which checks both guards + writes both on success) |

### Unchanged (already provides migration)

- `src/lib/sync.ts` — `mergeFavorites/Recent/History`, `readLSEnvelope`, `writeLSEnvelope`, `pullCollection`, `pushCollection`, `pullAndMerge` (already exposed via `pullAndMerge` export)
- `src/components/Header.astro` — no new UI; existing `data-sync-last` label gets updated by existing `refreshLastSyncedLabel()`
- `src/pages/[lang]/privacy-policy.astro` — no new disclosure (P3-2 covers)
- `scripts/check-supabase-env.mjs`, `supabase/migrations/0001_user_sync.sql` — no schema change

### Total: ~120 lines new + ~10 modified = ~130 lines total

---

## Data Flow

```
                 ┌─────────────────────┐
                 │  Page load          │
                 │  (any page)         │
                 └──────────┬──────────┘
                            │
                            ▼
              ┌────────────────────────────┐
              │ pollForAuthAndPull() tick  │
              │ (every 1s for ≤5s)         │
              └─────────────┬──────────────┘
                            │
              ┌─────────────▼─────────────┐
              │ clerk.user exists?        │
              │   No  → keep polling     │
              │   Yes → check guards      │
              └─────────────┬─────────────┘
                            │
       ┌────────────────────▼─────────────────────┐
       │ maybeMigrate(userId)                     │
       │  guard1: sessionStorage[sync:did-pull-  │
       │          once]?                         │
       │  guard2: localStorage[migration:{uid}]? │
       │  Either set → skip (return false)       │
       │  Both unset → run pullAndMerge,        │
       │                  write both flags       │
       │                  return true            │
       └────────────────────┬─────────────────────┘
                            │
       ┌────────────────────▼─────────────────────┐
       │ pullAndMerge(userId)  (P3-2 reuse)       │
       │  pullCollection × 3 (parallel)          │
       │  readLSEnvelope × 3                     │
       │  mergeFavorites/Recent/History × 3      │
       │  writeLSEnvelope × 3  (LS now merged)   │
       │  pushCollection × 3 (cloud now merged)  │
       └────────────────────┬─────────────────────┘
                            │
       ┌────────────────────▼─────────────────────┐
       │ Toast (only if any collection had items)│
       │ "Imported X favorites, Y recent, Z hist"│
       └──────────────────────────────────────────┘
```

---

## Error Handling

### Per-collection failure (existing P3-2 behavior, V1 inherits)

If `pullCollection('history')` 500s but `'favorites'` + `'recent'` succeed:
- Favorites + recent merged + written + pushed
- History fails → next debounce / sync-now button click retries history
- Toast shows "Imported F fav, R recent; History failed, will retry"

### Migration guard race

If `maybeMigrate` is invoked twice in flight (e.g. multiple tabs initial load):
- BOTH guards are checked at function entry
- Second invocation sees guard1 (sessionStorage) set → bails out
- First invocation completes its writes

### Auth resolves late

If Clerk takes >5s to load (rare; P3-1 default Clerk JS load is fast):
- Existing `pollForAuthAndPull` already times out after 5s
- Migration does NOT run on this visit
- Next page load OR any signed-in event re-attempts (existing sync via debounce still works)
- V1 does NOT extend poll window

### No Supabase env

If `showSupabase` is false (Supabase env not configured):
- `wireSyncMenu` returns early without `removeAttribute('hidden')` (existing behavior)
- Migration is not reachable because `pollForAuthAndPull` doesn't surface any UI
- Same as P3-2; no change

### Privacy / RLS

If Supabase RLS blocks the push (no `clerk_user_id` match — should never happen if Clerk JWT is correctly verified):
- POST returns 403 → existing `SyncForbiddenError` thrown
- `pullAndMerge` re-queues push on next iteration via P3-2 logic
- Toast NOT shown (failure path; logged via existing console.error)
- Migration marker not set → will retry on next tab open (V1 acceptable; V2 may want "irrecoverable failure" marker)

---

## Test Plan (~30 lines)

`tests/migration.test.ts` (new file, child-process isolation per P3-1 lesson):

| Test | Scenario | Expected |
|---|---|---|
| 1. Empty LS + empty cloud | LS has 0 items, cloud returns null for all 3 collections | `maybeMigrate` returns false, no fetch POST observed, no toast |
| 2. LS-only + empty cloud | LS has 12 favorites, cloud returns null | `maybeMigrate` returns true, 3 fetch POST observed (1 per collection), LS unchanged after merge (cloud was empty → LS wins via LWW), idempotency flag set in BOTH sessionStorage AND LS |
| 3. LS + cloud both have data | LS has 12 favs, cloud has 8 different favs | `maybeMigrate` returns true, 3 fetch POST observed, LS ends with union (20), cloud ends with union (20), toast fires |
| 4. Idempotency | Run test 3 scenario twice in same tab | First run sets flags, second `maybeMigrate` returns false (LS flag set), no fetch observed |
| 5. Toast fires on items, silent on empty | Empty LS + empty cloud | No toast (no items, no point) |

**Total: 5 new tests** (consistent with P3-2's per-feature test budget)

---

## V1 Implementation (1 task, ~half-day)

Task 8 (P3-3) [MECHANICAL/INTEGRATION]:

1. Create `src/lib/migration.ts` (helpers)
2. Create `src/scripts/migration.client.ts` (orchestrator with EOF self-call)
3. Modify `src/scripts/sync-init.client.ts` (replace existing `sessionStorage` guard with `maybeMigrate` call)
4. Add 2 i18n keys (en + zh)
5. Add 5 tests in `tests/migration.test.ts`
6. Run `pnpm check` + `pnpm build`

**Constraints (P3 trilogy hard rules):**
- `src/engines/` zero changes
- `src/lib/{favorites,recent,history,clerk-env,supabase-env,sync}.ts` zero changes (already provides migration via pullAndMerge)
- `src/scripts/clerk-init.client.ts` zero changes (P3-1 frozen)
- `src/components/Header.astro` zero changes (existing UI reused)
- `src/i18n/translations.ts` 2-line addition (within existing P3-2 namespace `sync.*`)

---

## V2 (out of scope, record for future)

| Feature | Notes |
|---|---|
| Modal confirmation before migration | "We found 12 favorites, 5 recent items on this device. Sync them to your new account?" Yes / Not now / Never |
| Conflict preview with diff | Show per-collection: "Local: 12 items. Cloud: 8 items. After merge: 20 items." |
| Explicit "Import from cloud" button | Could be useful for users with empty LS; existing `data-sync-now` covers this via `syncNow()` |
| Cross-device migration coordinator | For cases where user uses same Clerk account on 2 browsers simultaneously (LS-only device + cloud-only device); LWW merge eventually converges, no coordinator needed |
| Schedule migration retry | Currently retries via P3-2 debounce; V2 may want explicit "scheduled retry every 1h for first 24h after sign-up" |

---

## Open Questions for User Review

1. **Toast vs no toast** — V1 default uses `alert()` (sufficient, simple). Do you want a real toast component instead?
2. **Manual reset link** — Should `forgeflowkit:migration:{userId}` have a "Reset migration state" link in sync menu for testing? (V1: no. V2: optional.)
3. **Privacy** — Confirm existing P3-2 disclosure covers migration? (Default yes per above; flag if you want explicit language.)

