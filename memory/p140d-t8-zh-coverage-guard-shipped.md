---
name: p140d-t8-zh-coverage-guard-shipped
description: P140d-T8 zh 缺位 warn → build-fail upgrade — content-prose-shape-guard Test 6 tightened; closes P140c ship record "Out of scope (P140d candidates)" line 527; 1 atomic commit on master
metadata:
  type: project
  shipped: 2026-08-18
  commit: 63be890
  branch: master
---

# P140d-T8 zh 缺位 warn → build-fail upgrade — SHIPPED

**Date:** 2026-08-18
**Commit:** `63be890` (1 atomic commit on master)
**Branch:** master (no separate feature branch — single trivial change)
**Trigger:** User choice "下一步推荐哪个" → Option A (zh 缺位 warn → build fail)
**Closes:** P140c ship record "Out of scope (P140d candidates)" line 527 (`memory/p140c-eeat-completion-shipped.md` §Out of scope)

---

## Why this batch exists

P140a-T7 originally shipped content-prose-shape-guard with Test 6 in "encouraged but not required" mode — `assert.ok(true)` always-passed with only a `console.warn` listing missing zh counterparts. The deferred tightening (P140d-T8) was tracked in P140c ship record as "Out of scope (P140d candidates)" line 527.

P140b mass-write shipped 100/100 zh parity, so the upgrade is **safe and zero-failure** — any future engine shipping en-only will now get caught at CI time instead of silently passing.

## Audit before upgrade

```
src/content/tools/:
  en files: 100
  zh files: 100
  en missing zh: 0
  zh with no en: 0
```

100/100 perfect parity. Upgrade path is clear.

## Change (1 file, +14 / -13 lines)

**File:** `tests/content-prose-shape-guard.test.ts`

1. **Header comment lines 30-34** — updated from "P140a/b: missing zh file only emits console.warn (not fail) / P140d-T8 will tighten this to build-fail when zh is missing." to "P140a/b: missing zh file only emitted console.warn (not fail) / P140d-T8: tightened to build-fail when zh is missing (shipped) / As of ship: 100 en + 100 zh = perfect parity (0 missing)."

2. **Test 6 (lines 297-318)** — replaced:

```typescript
test('zh counterparts are encouraged but not required yet (P140a phase)', () => {
  ...
  if (pairs.length > 0) {
    console.warn(`[p140a-T7] Missing zh counterparts (P140a tolerated): ${pairs.join(', ')}`);
  }
  assert.ok(true);
});
```

with:

```typescript
test('every en file has a zh counterpart (P140d-T8 build-fail)', () => {
  const files = listProseFiles();
  const missing: string[] = [];
  for (const filename of files) {
    if (filename.endsWith('.zh.md')) continue;
    const slug = filename.replace(/\.md$/, '');
    const zhName = `${slug}.zh.md`;
    if (!files.includes(zhName)) {
      missing.push(zhName);
    }
  }
  assert.equal(
    missing.length, 0,
    `${missing.length} en file(s) missing zh counterpart: ${missing.join(', ')}`,
  );
});
```

## Verification

| Check | Result |
|---|---|
| `tsc --noEmit` | clean (no type errors) |
| `tsx --test tests/content-prose-shape-guard.test.ts` (no env) | exits 0 (process.exit skip-guard preserved) |
| `RUN_BUILD_TESTS=1 tsx --test tests/content-prose-shape-guard.test.ts` | **6/6 pass** (5 original + upgraded Test 6) |
| `pnpm check` | skip-guard preserved — does not run build-dep unless `RUN_BUILD_TESTS=1` set |

## What was deliberately left out

- **No new build-dep suite** — Test 6 already exists; just tightened. No need for a new `tests/zh-coverage-guard.test.ts`.
- **No auto-backfill script** — coverage is already 100/100; backfill would be redundant.
- **No threshold re-tuning** — Test 6 only checks existence, not length (length is covered by separate `tier-prose-completeness-guard.test.ts`).

## Out of scope (still)

- AdSense Console Auto Ads toggle + resubmit (manual step; blocked on ~2026-09-01 trigger)
- Per-tier length tightening (already at C3 +70% from P140d-T2/T3/T4; further tightening has diminishing returns)
- Author bio pages at `/about/authors/<slug>.astro` (optional)

## Files touched

| File | Change |
|---|---|
| `tests/content-prose-shape-guard.test.ts` | +14 / -13 (Test 6 + comment update) |
| `CHANGELOG.md` | +M24.4 section + header last-update line (lines 5 + 637-661) |
| `memory/MEMORY.md` | +1 index line (this file pointer) |

## Related

- [[p140c-eeat-completion-shipped]] — closed-out scope list (line 527 now resolved)
- [[p140d-tier-threshold-tightening-shipped]] — sister batch (P140d-T2/T3/T4 C3 +70%)
- [[p140e-index-changelog-catchup-shipped]] — immediately preceding