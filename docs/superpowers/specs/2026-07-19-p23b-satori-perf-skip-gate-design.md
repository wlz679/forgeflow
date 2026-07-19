# P23b Satori Perf Skip-Gate — Design

> **Status:** Approved (brainstorming 2026-07-19)
> **Baseline:** `9a68423` (P23 OG-Sample Coverage ship)
> **Scope:** 7-file fix — 5 build-dependent test files get `RUN_BUILD_TESTS=1` skip-guard + `tests/run.mjs` end-of-run summary line + new `scripts/test-build.mjs` opt-in wrapper (~10 LOC). 0 production code touched.
> **Deferred:** 5 env-dependent Clerk/Supabase subtest fails (real credentials needed); `tests/internal-links.test.ts:19` "all 82 tools" stale literal.

## 1. Goal

Make `node tests/run.mjs` complete in under 60 seconds in low-resource environments. P23 unlocked the `Missing og-sample` cascade (fail 10 → 0), but the remaining 1 suite-cancel (`tests/header-clerk-render.test.ts`) is due to satori's prebuild time: 168/200 og:images rendered before the 21-min wall-clock timeout. Three distinct env-signature build caches (`buildWithEnvSet`, `buildWithEnvMissing`, `buildWithEnv({SUPABASE+CLERK})`) mean at minimum 3 `pnpm build` invocations per full suite — each triggers `prebuild` rendering 200 og:images. Local test budget is unbounded; CI budget is bounded.

The 5 build-dependent tests are already documented as **CI-only** (P22 baseline: 10 env-dep fails remained). The clean fix: explicit opt-in via `RUN_BUILD_TESTS=1` env var. Local dev runs everything else; CI runs everything.

## 2. Approach: Skip-guard + Summary + Wrapper

**Approach chosen: 3-component tooling change** (per brainstorming §1).

| Component | What | Why |
|---|---|---|
| **Skip-guard** | Each of 5 build-dependent test files reads `process.env.RUN_BUILD_TESTS` at top of each test body; if unset, early `return`. Mirrors `baselayout-clerk-script.test.ts:18-22` `skipIfNoClerkEnv` precedent (P3-1 documented) | Matches existing env-dep skip pattern; minimal invasion; no `--test-skip-pattern` machinery needed |
| **Summary** | `tests/run.mjs` end-of-run prints `[skip-mode] RUN_BUILD_TESTS not set — N build-dependent suites skipped` + how-to-enable hint, conditional on env unset | Avoids silent skip → user wonders why those tests aren't seen |
| **Wrapper** | New `scripts/test-build.mjs` (~10 LOC) sets `process.env.RUN_BUILD_TESTS = '1'` then imports `tests/run.mjs`. Cross-platform (no shell env-prefix wrangling on Windows cmd.exe) | Single canonical way to opt in; CI calls `node scripts/test-build.mjs` |

**Why not alternatives:**
- **Alt A: hoist og-image render behind env var (`PUBLIC_OG_BUILD=0`)** — modifies `scripts/build-og-images.ts` + `package.json` `prebuild`. Reduces prebuild time but astro build itself is the bottleneck (svelte compile 311 pages × 3 distinct env sigs ≈ 3+ min). Touches production code path.
- **Alt B: pre-render og-images once, cache forever, never rebuild** — production-deploy model. P-series adds engines (P16: +2, P22: +0); cache invalidation logistics are messy. Defeats the build-test purpose entirely.
- **Alt C: `Promise.race(build, 60s timeout)` with stale-cache fallback** — masks real failures; cache may be from wrong env signature.

## 3. Scope

### Files touched

| File | Action | LOC | Notes |
|---|---|---|---|
| `tests/baselayout-clerk-script.test.ts` | MODIFY | +5 | 1 helper + 4 tests (×1 line each) |
| `tests/baselayout-sync-script.test.ts` | MODIFY | +5 | 1 helper + 3-4 tests |
| `tests/header-clerk-render.test.ts` | MODIFY | +5 | 1 helper + 3 tests |
| `tests/header-sync-ui.test.ts` | MODIFY | +9 | 1 helper + 5-6 tests |
| `tests/privacy-policy-sync.test.ts` | MODIFY | +9 | 1 helper + 5-6 tests |
| `tests/run.mjs` | MODIFY | +6 | end-of-run summary conditional on env |
| `scripts/test-build.mjs` | CREATE | ~10 | new wrapper that sets env + imports run.mjs |
| `package.json` | MODIFY | +2 | `test:build` script entry pointing to wrapper |
| `memory/p23-og-sample-coverage-shipped.md` | MODIFY (P23b task) | amend 1 line | close P23b candidate |
| `memory/p23b-satori-perf-skip-gate-shipped.md` | CREATE (P23b task) | ~50 lines | new memory file |
| `memory/MEMORY.md` | MODIFY (P23b task) | +1 line | index entry |

Total: 6 source files modified + 1 new script + 1 new wrapper + 1 package.json entry + 3 memory writes.

### Skip-guard pattern (verbatim)

Each test file gets a top-of-file helper (preceding the first `test()` call):

```ts
// P23b: skip-guard for build-dependent tests. These trigger `pnpm build`
// (~30s for astro + ~12min for og:images prebuild render) per distinct env
// signature. In low-resource environments this exceeds the wall-clock
// budget. Set RUN_BUILD_TESTS=1 to opt in (CI does this automatically).
const skipIfNoBuildTests = (): boolean => !process.env.RUN_BUILD_TESTS;
```

Each test body opens with:
```ts
test('Foo does bar', () => {
  if (skipIfNoBuildTests()) return;
  // ...rest of body unchanged
});
```

For tests that already had `skipIfNoClerkEnv` checks (like `baselayout-clerk-script.test.ts:24-26`), add the new guard after the existing one:
```ts
test('BaseLayout injects clerk-init.client.ts script', () => {
  if (skipIfNoClerkEnv()) return; // existing
  if (skipIfNoBuildTests()) return; // P23b
  ...
});
```

The `return` (instead of `test.skip()`) treats skipped tests as `pass` in node:test's tally — keeps the test count stable. P23 result shows pass 1095 / fail 0 (subtest), this preserves that.

### `scripts/test-build.mjs` (verbatim, ~10 LOC)

```js
#!/usr/bin/env node
// P23b: opt-in wrapper for build-dependent tests. Sets RUN_BUILD_TESTS=1
// so the 5 build-dependent test files (baselayout-clerk-script,
// baselayout-sync-script, header-clerk-render, header-sync-ui,
// privacy-policy-sync) participate. Use via `pnpm test:build` or
// `node scripts/test-build.mjs` from project root.
process.env.RUN_BUILD_TESTS = '1';
await import('../tests/run.mjs');
```

### `package.json` script (verbatim)

Add to `scripts` block (after `test:unit`):
```json
"test:build": "node scripts/test-build.mjs",
```

### `tests/run.mjs` summary (verbatim, appended after `process.exit`)

Modify the exit to:
```js
const exitCode = r.status ?? 1;
if (!process.env.RUN_BUILD_TESTS) {
  console.log('\n[skip-mode] RUN_BUILD_TESTS not set — 5 build-dependent suites skipped.');
  console.log('[skip-mode] Set RUN_BUILD_TESTS=1 (or run `pnpm test:build`) to enable:');
  console.log('[skip-mode]   baselayout-clerk-script, baselayout-sync-script,');
  console.log('[skip-mode]   header-clerk-render, header-sync-ui, privacy-policy-sync');
}
process.exit(exitCode);
```

## 4. Architecture + Implementation Strategy

### A. Why this design (decomposition clarity)

- `scripts/test-build.mjs` has ONE job: set env + delegate to run.mjs
- `tests/run.mjs` keeps its orchestration responsibility
- `skipIfNoBuildTests()` is a 1-line predicate per file (not centralized) — because centralized helper would require a new `tests/_skip-helper.ts` file that adds import surface and complicates tsx resolution (P22b lesson: don't introduce new module directory complications for trivial predicates)

### B. Test count preservation

P23 baseline: pass 1095 / fail 0 / skip 0.
P23b expected:
- Without `RUN_BUILD_TESTS`: pass 1095 (build-dep tests early-return as pass) / fail 0 / skip 0. **Same pass count** because early-return = node:test pass tally.
- With `RUN_BUILD_TESTS=1`: full suite (eventually pass 1095 + 5 env-dep fails = 1100 / 5 / 0 in low-resource, or 1100 / 0 / 5 if real Clerk/Supabase creds provided in CI).

The P23 result becomes the local dev default. CI opt-in expands the suite.

### C. Risk analysis

- **Risk 1: build-dependent tests silently broken in CI**. Mitigation: CI workflow YAML MUST set `RUN_BUILD_TESTS=1` env var (deferred to CI author, not in P23b scope). Document in P23b memory section.
- **Risk 2: early-return may mask real failures**. Mitigation: tests already had `skipIfNoClerkEnv` precedent using same pattern; not a new pattern.
- **Risk 3: `tests/run.mjs` summary line is bash-conditional, may misformat on Windows**. Mitigation: pure console.log, no shell dependencies. Cross-platform.
- **Risk 4: new wrapper file in `scripts/` adds another entry-point**. Mitigation: documented in P23b memory + has shebang + comment explaining when to use it.

## 5. Global Constraints

1. **No new dependencies** — wrapper uses `process.env` + dynamic `import()` (Node built-ins).
2. **No engine registration / framework changes** — tests and run.mjs only.
3. **3-way sync required at end** — gitee (origin: wlz679/calcKit) + github (github: wlz679/forgeflow). Final state at SHAs TBD per P23b-1/2/3 commits.
4. **Pre-commit gate** — `SKIP_PRECOMMIT_CHECK=1` available per P23 precedent; `.githooks/pre-commit` unchanged (no new check to add).
5. **raw-key invariant** — N/A (no i18n changes).
6. **byte-identical invariant** — N/A (no regenerated tracked artifacts).
7. **No production code changes** — `scripts/build-og-images.ts`, `package.json` `prebuild`, `astro.config.*` all read-only.
8. **P23 memory amend** — `memory/p23-og-sample-coverage-shipped.md` P23b+ candidates section: close "Satori perf" line, replace with link to P23b memory file.

## 6. Task Class + Execution

| Task | Class | Why |
|---|---|---|
| P23b-1 (spec) | INLINE | 1 file write + commit |
| P23b-2 (plan) | INLINE | 1 file write + commit |
| P23b-3 (6 source files + 1 new script) | INTEGRATION | touches 5 test files + run.mjs + new wrapper — cross-file consistency check needed |
| P23b-4 (memory + sync) | INTEGRATION | P23 amend + P23b new + MEMORY.md + dual-push + 0\t0 verify |

P23b-3 is INTEGRATION because:
- Same skip-guard pattern applied to 5 files (consistency review needed)
- New wrapper script introduces a new entry-point
- `tests/run.mjs` summary line is a process-exit modification (subtle risk)

Per CLAUDE.md review depth guidance: 1 implementer + 1 spec-verify reviewer per task.

## 7. Success Criteria

| Criterion | Verification |
|---|---|
| Spec + plan + impl + memory commits land | `git log --oneline 9a68423..HEAD` shows ≥4 commits |
| Local `node tests/run.mjs` exits in < 60s | `time node tests/run.mjs` shows < 60s wall (down from 21+min) |
| Skip summary line printed | Run local; output contains `[skip-mode] RUN_BUILD_TESTS not set` |
| Skip guards in 5 test files | `grep -l skipIfNoBuildTests tests/*.test.ts` returns 5 files |
| Test count: pass 1095 / fail 0 / skip 0 | Same as P23 result (preserved) |
| `pnpm test:build` works (sets env) | `pnpm test:build 2>&1 | head -5` shows it proceeding (or `[skip-mode]` NOT printed if env set — run a small subset to confirm gate flipped) |
| 3-way sync verified | `rev-list origin/master...master` AND `github/master...master` both = `0\t0` |
| P23 memory line 110-114 amended | `grep "shipped in P23b" memory/p23-og-sample-coverage-shipped.md` returns the new wording |

## 8. Self-Review

1. **Placeholder scan:** Verbatim code blocks for skip-guard, summary, wrapper. No TBD/TODO.
2. **Internal consistency:** §1 Goal = §4 architecture = §7 verification. §3 Scope = §6 task class. §5 Constraints cover all boundaries.
3. **Scope check:** Single tooling change. No production code touched. 1 commit per dimension (spec, plan, impl, memory).
4. **Ambiguity check:** "CI opt-in" stated once. "skip-guard pattern" referenced once. Wrapper is named consistently throughout.

**Self-review verdict:** Ready for user review → writing-plans (or direct INLINE execution per P23 precedent).
