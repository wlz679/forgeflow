# P63 CI CJK Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a build-dependent CI test that walks all 15 English category landing pages in `dist/en/<slug>/index.html` and asserts the `<h1>` + breadcrumb category link contain no CJK characters — closing the user-facing bug class from P62 with permanent build-time defense-in-depth.

**Architecture:** Single test file at `tests/category-en-cjk-guard.test.ts` using `node:test` + `node:assert/strict` (matches P62/purity-test + P47/codegen-drift-guard project convention). Skips cleanly when `RUN_BUILD_TESTS` is unset (P23b pattern, matches the 5 existing build-dep tests). Spawns `pnpm build` directly via `child_process.spawnSync` (no Clerk env requirement, so does NOT use `_clerk-build-helper`). Walks `src/data/categories.ts` to derive the 15 category slugs (single source of truth — survives future category additions).

**Tech Stack:** Astro 4.13.2 / TypeScript 5.6 / node:test + tsx / pnpm 9

## File Structure

| File | Responsibility |
|---|---|
| `tests/category-en-cjk-guard.test.ts` | NEW — build-dep test, walks 15 en category HTML, asserts h1+breadcrumb CJK-free |
| `src/data/categories.ts` | UNCHANGED (already pure English from P62) — test reads slugs from here |
| `memory/p63-ci-cjk-guard-shipped.md` | NEW — ship memory mirroring P59-P62 format |

## Global Constraints

- Test must NOT require Clerk env (it's not a Clerk-related check) → use generic `spawnSync('pnpm', ['build'])`
- Skip-guard MUST be `if (!process.env.RUN_BUILD_TESTS) return;` (P23b pattern)
- CJK regex MUST match the existing convention: `/[一-鿿㐀-䶿＀-￯]/` (broader than `/[一-鿿]/` — covers CJK Ext A + fullwidth forms; used by `tests/category-i18n-purity.test.ts`)
- Build invocation adds ~3min to CI; current 30min timeout accommodates (P24)
- 6 build-dep tests now (5 existing + 1 new); `--test-concurrency=1` already wired by `tests/run.mjs` — no new infrastructure needed
- Test file lives at `tests/` root per P22b ESM-trap convention
- Must coexist with `pnpm test:unit` + `pnpm test:build` (both already exist; CI uses `RUN_BUILD_TESTS=1 pnpm test:unit`)

---

### Task 1: Add CI CJK guard test (TDD: defense-in-depth)

**Files:**
- Create: `tests/category-en-cjk-guard.test.ts`

**Step 1: Write the test**

```ts
#!/usr/bin/env node
// P63 — CI CJK drift guard for English category landing pages.
//
// Why this exists:
//   P62 closed a user-reported bug where en pages for O/S/K showed
//   bilingual strings ("Operations / 库存运营", "Sales / 销售管理",
//   "Knowledge / 知识库"). P62 fixed the bug at 3 layers: categories.ts
//   source, translations.ts en field, and 9 path-B page migrations.
//   This test provides build-time defense-in-depth: walks the 15 en
//   category landing pages and asserts the <h1> and breadcrumb
//   category-link text contain no CJK characters. If a future refactor
//   reintroduces the bug (e.g. reverting one of the 3 P62 commits, or
//   hardcoding a new bilingual name), this test fails in CI before
//   the broken page reaches users.
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, matches
//     the 5 existing build-dep tests in this project)
//   - Spawns `pnpm build` directly via spawnSync. Does NOT use
//     _clerk-build-helper because this test has no Clerk env requirement.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set (local dev w/o RUN_BUILD_TESTS)
// Match existing build-dep test pattern (baselayout-clerk-script.test.ts et al.)
if (!process.env.RUN_BUILD_TESTS) {
  // silent skip — no test() registered
  process.exit(0);
}

// Run `pnpm build` if dist/en/ missing or empty. ~3min cost; CI budget accommodates.
function ensureBuilt(): void {
  const distEn = resolve(root, 'dist', 'en');
  if (existsSync(distEn) && readdirSync(distEn).length > 0) {
    return; // already built (test runner's prior build-dep test left dist/ populated)
  }
  console.log('[p63] dist/en missing or empty — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

// Read category slugs from categories.ts (single source of truth)
function getCategorySlugs(): string[] {
  const src = readFileSync(resolve(root, 'src/data/categories.ts'), 'utf8');
  // matches `slug: 'value',` lines inside the categories[] array
  const matches = src.matchAll(/slug:\s*'([^']+)'/g);
  return Array.from(matches, m => m[1]!);
}

// Broader CJK regex (covers Unified Ideographs + Ext A + Fullwidth Forms)
// Matches the regex in tests/category-i18n-purity.test.ts for consistency.
const CJK = /[一-鿿㐀-䶿＀-￯]/;

test('en category landing pages contain no CJK in <h1> or breadcrumb', () => {
  ensureBuilt();
  const slugs = getCategorySlugs();
  assert.equal(slugs.length, 15, `expected 15 category slugs in src/data/categories.ts, got ${slugs.length}`);

  const violations: Array<{ slug: string; location: string; text: string }> = [];

  for (const slug of slugs) {
    const htmlPath = resolve(root, 'dist', 'en', slug, 'index.html');
    if (!existsSync(htmlPath)) {
      violations.push({ slug, location: '<missing dist file>', text: htmlPath });
      continue;
    }
    const html = readFileSync(htmlPath, 'utf8');

    // 1. <h1> text (the main page title)
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    if (h1Match) {
      const text = h1Match[1]!;
      if (CJK.test(text)) {
        violations.push({ slug, location: 'h1', text: text.slice(0, 80) });
      }
    }

    // 2. Breadcrumb category link text — <a> wrapping short category-name text
    //    (heuristic: skip long nav strings; the breadcrumb uses <a href="/en/<slug>/">)
    const breadcrumbLinkRe = new RegExp(
      `<a[^>]*href="/en/${slug}/"[^>]*>\\s*([^<]+?)\\s*</a>`,
      'g'
    );
    for (const m of html.matchAll(breadcrumbLinkRe)) {
      const text = m[1]!.trim();
      if (CJK.test(text)) {
        violations.push({ slug, location: 'breadcrumb', text: text.slice(0, 80) });
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `CJK found in ${violations.length} en category page(s):\n` +
      violations.map(v => `  - ${v.slug} [${v.location}]: ${v.text}`).join('\n') +
      `\n\nThis indicates a regression of the P62 fix. Check src/data/categories.ts ` +
      `and src/i18n/translations.ts en fields.`
  );
});
```

**Step 2: Verify test PASSES on current (P62-fixed) state**

```bash
RUN_BUILD_TESTS=1 pnpm exec tsx tests/category-en-cjk-guard.test.ts
```

Expected: PASS (1 test, 0 failures). `dist/en/` already exists from P62 build; `ensureBuilt()` short-circuits. h1 + breadcrumb for all 15 categories are pure English.

If FAIL: investigate which slug has CJK — would mean a P62 fix regressed (unlikely) or the test regex is wrong.

**Step 3: Verify test CATCHES the bug (defense-in-depth sanity check)**

Stash the P62 fixes to simulate the original bug:

```bash
git stash push \
  src/data/categories.ts \
  src/i18n/translations.ts \
  'src/pages/[lang]/customer-support.astro' \
  'src/pages/[lang]/hiring-team.astro' \
  'src/pages/[lang]/knowledge.astro' \
  'src/pages/[lang]/operations-inventory.astro' \
  'src/pages/[lang]/marketing-analytics.astro' \
  'src/pages/[lang]/legal-compliance.astro' \
  'src/pages/[lang]/product-analytics.astro' \
  'src/pages/[lang]/sales.astro' \
  'src/pages/[lang]/retention.astro' \
  -m "p63-temp-revert"
rm -rf dist/   # force rebuild to pick up reverted source
RUN_BUILD_TESTS=1 pnpm exec tsx tests/category-en-cjk-guard.test.ts
```

Expected: FAIL with violations listing O/S/K categories (h1 = "Operations / 库存运营", etc.). The test proves it actually catches the bug.

Restore the P62 fixes:
```bash
git stash pop
rm -rf dist/   # rebuild with fixed source
RUN_BUILD_TESTS=1 pnpm exec tsx tests/category-en-cjk-guard.test.ts
```

Expected: PASS again.

**Step 4: Run full pnpm check (build-dep gate)**

```bash
SKIP_PRECOMMIT_CHECK=1 RUN_BUILD_TESTS=1 pnpm check
```

Expected: 1170 pass / 0 fail (was 1169; +1 from this new test). `--test-concurrency=1` auto-set by `tests/run.mjs` serializes the 6 build-dep tests.

If any of the 5 existing build-dep tests start failing, investigate — likely a dist/ clobber race. Pre-existing concurrency=1 setting should prevent this.

**Step 5: Commit**

```bash
git add tests/category-en-cjk-guard.test.ts
git commit -m "test(p63): add CI CJK drift guard for en category landing pages"
```

---

### Task 2: Build verification + ship memory + 3-way push

**Files:**
- Create: `memory/p63-ci-cjk-guard-shipped.md`

**Step 1: Final pnpm check (sanity)**

```bash
SKIP_PRECOMMIT_CHECK=1 RUN_BUILD_TESTS=1 pnpm check
```

Expected: 1170 pass / 0 fail. Sanity check before push.

**Step 2: Write ship memory**

Create `memory/p63-ci-cjk-guard-shipped.md`. Mirror the structure of `memory/p59-engines-freelance-subdir-merge-shipped.md` and `memory/p62-category-page-i18n-fix-shipped.md`. Include:

- **Batch ID**: P63
- **Date**: 2026-07-24
- **Files touched**: 2 (1 new test + 1 new ship memory)
- **Test delta**: 1169 → 1170 (+1 net from new CJK guard)
- **CI integration**: Test now runs in CI under `pnpm test:unit` with `RUN_BUILD_TESTS=1` (already wired by P24). Adds ~3min to CI wall-clock; current 30min timeout accommodates.
- **Coverage**: 15 en category landing pages, both `<h1>` and breadcrumb category link.
- **P63+ candidate**: extend guard to assert zh category h1 DOES have Chinese (preservation check, not just en-leak check).

**Step 3: 3-way sync verify + push (production commits)**

```bash
git fetch origin && git fetch github && git rev-list --left-right --count origin/master...github/master
```

If clean (0\t0):

```bash
git push origin master
git push github master   # may hit P48 stale-cache false-negative on ahead=0; bypass with: git -c core.hooksPath=/dev/null push github master
```

If divergent (cron race): follow P48 protocol (reset + cherry-pick + force-with-lease with refspec `master:master`).

**Step 4: Final 3-way sync verify**

```bash
git fetch origin && git fetch github && git rev-list --left-right --count origin/master...github/master
```

Expected: `0\t0`.

**Step 5: Commit + push ship memory**

```bash
git add memory/p63-ci-cjk-guard-shipped.md
git commit -m "docs(p63): ship memory"
git push origin master && git push github master   # bypass if P48 fires
```

---

## Self-Review

**1. Spec coverage:**
- (a) Test walks all 15 en category pages → ✅ covered by `getCategorySlugs()` (single source of truth: `src/data/categories.ts`)
- (b) Test checks `<h1>` for CJK → ✅ regex match
- (c) Test checks breadcrumb for CJK → ✅ regex match with slug-scoped href
- (d) Test skips when `RUN_BUILD_TESTS` unset → ✅ P23b pattern
- (e) Test catches the original bug → ✅ Step 3 (defense check)
- (f) Test runs in CI automatically → ✅ `pnpm test:unit` already wires `RUN_BUILD_TESTS=1`

**2. Placeholder scan:** No "TBD" / "implement later" / "fill in details". Every step has concrete code or commands. Test file is complete and self-contained.

**3. Type consistency:**
- `getCategorySlugs()` returns `string[]` → consumed by `for (const slug of slugs)` loop
- `CJK` regex matches the one in `tests/category-i18n-purity.test.ts` (consistent within project)
- `violations` array shape `{ slug, location, text }` consistent in all 3 push sites
- `ensureBuilt()` early-return vs full-build paths consistent

**4. Risk assessment:**
- Build invocation cost (~3min/test × 6 build-dep tests ≈ 18min total build-dep wall-clock) — within P24 30min CI budget
- `rm -rf dist/` in Step 3 forces rebuild — acceptable since the test regenerates it
- `spawnSync('pnpm', ['build'])` requires `pnpm` on PATH — standard in this project (matches `tests/run.mjs` pattern)
- Test does NOT depend on Clerk or any env vars beyond `RUN_BUILD_TESTS` — keeps it orthogonal to the existing Clerk-related build-dep tests

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-24-p63-ci-cjk-guard.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?