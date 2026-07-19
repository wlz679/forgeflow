# P23b Satori Perf Skip-Gate — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `node tests/run.mjs` complete in < 60s locally by gating 5 build-dependent test files behind a new `RUN_BUILD_TESTS=1` env var. CI opts in via `pnpm test:build`. Local dev skips them with a clear summary line.

**Architecture:** Pure test-tooling change. 5 test files get a 1-line skip-guard helper + early-return at each test body. `tests/run.mjs` appends a `[skip-mode]` summary. New `scripts/test-build.mjs` (10 LOC) sets env + delegates to run.mjs. `package.json` gains `test:build` script. No production code touched.

**Tech Stack:** Node `^20.19.0` (no install), `tsx` (already in devDeps). No new deps.

## Baseline + Reference SHAs

- **Baseline:** `9a68423` (P23 OG-Sample Coverage ship)
- **Spec:** `docs/superpowers/specs/2026-07-19-p23b-satori-perf-skip-gate-design.md` (this commit)
- **Plan:** this document

## Global Constraints

1. **No new dependencies** — wrapper uses Node built-ins only.
2. **No new module directories OUTSIDE `scripts/` and `tests/`** — new wrapper in `scripts/`, skip-guards inline in existing test files.
3. **3-way sync required at end** — gitee + github must reflect final commits. Verify `git rev-list --left-right --count origin/master...master && git rev-list --left-right --count github/master...master` both = `0\t0`.
4. **Pre-commit gate** — `SKIP_PRECOMMIT_CHECK=1` available; P23b doesn't change hooks.
5. **raw-key invariant** — N/A (no i18n).
6. **byte-identical invariant** — N/A (no regenerated artifacts).
7. **No production code changes** — `scripts/build-og-images.ts`, `package.json` `prebuild`, `astro.config.*` read-only.
8. **P23 memory amend** — `memory/p23-og-sample-coverage-shipped.md` P23b+ candidates section closes "Satori perf" line in P23b-4.

---

## Task 1: P23b-1 — Spec author commit

**Files:**
- Create: `docs/superpowers/specs/2026-07-19-p23b-satori-perf-skip-gate-design.md`

**Note:** Spec is authored BEFORE plan per brainstorming workflow. Skip to Task 2.

---

## Task 2: P23b-2 — Plan author commit

**Files:**
- Create: `docs/superpowers/plans/2026-07-19-p23b-satori-perf-skip-gate.md`

- [ ] **Step 1: Commit plan**

```bash
cd 'D:/E/独立站/youtube-tools' && git add docs/superpowers/plans/2026-07-19-p23b-satori-perf-skip-gate.md && SKIP_PRECOMMIT_CHECK=1 git commit -m "docs(plan): P23b Satori Perf Skip-Gate implementation plan — 7-file INLINE env-var gating"
```

---

## Task 3: P23b-3 — 5 file skip-guards + run.mjs summary + new wrapper + package.json

**Class:** INTEGRATION (5 test files + run.mjs + new wrapper + package.json — cross-file consistency check).

**Files:**
- Modify: `tests/baselayout-clerk-script.test.ts`
- Modify: `tests/baselayout-sync-script.test.ts`
- Modify: `tests/header-clerk-render.test.ts`
- Modify: `tests/header-sync-ui.test.ts`
- Modify: `tests/privacy-policy-sync.test.ts`
- Modify: `tests/run.mjs` (append summary)
- Create: `scripts/test-build.mjs` (~10 LOC)
- Modify: `package.json` (add `test:build` script entry)

**Consumes:** Approved spec (Task 1).
**Produces:** Local test suite runs < 60s; CI opt-in via `pnpm test:build`.

- [ ] **Step 1: Pre-flight — verify the 5 build-dependent test files haven't been refactored post-P23**

```bash
cd 'D:/E/独立站/youtube-tools' && for f in baselayout-clerk-script baselayout-sync-script header-clerk-render header-sync-ui privacy-policy-sync; do echo "=== $f ==="; head -15 tests/$f.test.ts; done
```

Verify each file's structure matches the spec's skip-guard pattern target. Note any pre-existing `test()` calls or `skipIfNoClerkEnv` style guards — these become insertion points.

- [ ] **Step 2: Add `skipIfNoBuildTests` helper + early-return to `tests/baselayout-clerk-script.test.ts`**

Read full file. Per current content (per P22b baseline): 4 test bodies, helper located at top of file (lines 18-22 is `skipIfNoClerkEnv`).

Apply Edit:
- After `skipIfNoClerkEnv` function definition (~line 22), add:
```ts
// P23b: skip-guard for build-dependent tests. Wall-clock budget per
// pnpm build invocation is unbounded; CI runs these with
// RUN_BUILD_TESTS=1 (via `pnpm test:build`).
const skipIfNoBuildTests = (): boolean => !process.env.RUN_BUILD_TESTS;
```
- In each of 4 `test()` bodies, at the top of the body (after existing `if (skipIfNoClerkEnv()) return;` if present), add:
```ts
if (skipIfNoBuildTests()) return;
```

- [ ] **Step 3: Apply same pattern to `tests/baselayout-sync-script.test.ts`**

This file uses `buildWithEnv` (not Set/Missing) so no `skipIfNoClerkEnv` precedent. Just add the helper + 1-line `if (skipIfNoBuildTests()) return;` at the top of each `test()` body (expect ~3-4 tests).

- [ ] **Step 4: Apply same pattern to `tests/header-clerk-render.test.ts`**

3 test bodies. Helper at top, `if (skipIfNoBuildTests()) return;` at top of each test body.

- [ ] **Step 5: Apply same pattern to `tests/header-sync-ui.test.ts`**

5-6 test bodies. Same pattern.

- [ ] **Step 6: Apply same pattern to `tests/privacy-policy-sync.test.ts`**

5-6 test bodies. Same pattern.

- [ ] **Step 7: Modify `tests/run.mjs` to print skip-mode summary**

Read full file (small, ~37 lines). Current end:
```js
process.exit(r.status ?? 1);
```

Replace with:
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

- [ ] **Step 8: Create `scripts/test-build.mjs`**

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

- [ ] **Step 9: Modify `package.json` — add `test:build` script entry**

Find the `scripts` block. After `"test:unit": "node tests/run.mjs"`, add:
```json
"test:build": "node scripts/test-build.mjs",
```

- [ ] **Step 10: Verify each edit lands cleanly**

Quick local sanity checks (non-blocking — full verification in Step 11):

```bash
cd 'D:/E/独立站/youtube-tools' && \
  grep -l skipIfNoBuildTests tests/*.test.ts && \
  echo "---expected 5 files---"
```

Expected: 5 files (no more, no less).

```bash
grep -c "skipIfNoBuildTests" tests/baselayout-clerk-script.test.ts
```

Expected: at least 2 (1 helper definition + N test bodies, but minimum 1 helper + 1 test).

- [ ] **Step 11: Run local test suite (without env var) — must exit in < 60s**

```bash
cd 'D:/E/独立站/youtube-tools' && time node tests/run.mjs 2>&1 | tail -15
```

Expected:
- Wall time < 60s
- Output contains `[skip-mode]` summary line
- Last 5 lines include summary
- exit 0

- [ ] **Step 12: Verify `pnpm test:build` correctly sets env (small smoke test)**

```bash
cd 'D:/E/独立站/youtube-tools' && RUN_BUILD_TESTS=1 node scripts/test-build.mjs 2>&1 | head -3 &
PID=$!
sleep 5
kill $PID 2>/dev/null
wait $PID 2>/dev/null
```

Expected: starts running the suite (proves env var is set; the `[skip-mode]` summary should NOT appear in the truncated head).

Alternatively, just verify the file parses:
```bash
node -e "process.env.RUN_BUILD_TESTS='1'; await import('./scripts/test-build.mjs')" --input-type=module
```

If this throws, the wrapper has a parse error. Most important check: verify the wrapper's first action (set env) is reachable.

- [ ] **Step 13: Stage + commit**

```bash
cd 'D:/E/独立站/youtube-tools' && \
  git add tests/baselayout-clerk-script.test.ts \
          tests/baselayout-sync-script.test.ts \
          tests/header-clerk-render.test.ts \
          tests/header-sync-ui.test.ts \
          tests/privacy-policy-sync.test.ts \
          tests/run.mjs \
          scripts/test-build.mjs \
          package.json && \
  git status --short && \
  SKIP_PRECOMMIT_CHECK=1 git commit -m "fix(test): P23b — gate 5 build-dependent test files behind RUN_BUILD_TESTS=1 env var"
```

Commit message body: mention 5 test files get skip-guards + new wrapper + run.mjs summary + package.json entry; local test suite < 60s; CI opt-in via `pnpm test:build`.

---

## Task 4: P23b-4 — Memory (P23 amend + P23b new) + Dual-push + Verify

**Class:** INTEGRATION (memory amend + new + dual-push + amend coordination).

**Files:**
- Modify: `memory/p23-og-sample-coverage-shipped.md` (close P23b+ candidate line)
- Create: `memory/p23b-satori-perf-skip-gate-shipped.md` (~50 lines)
- Modify: `memory/MEMORY.md` (+1 index line)

**Consumes:** Shipped code from Task 3.
**Produces:** Durable memory + verified 3-way sync.

- [ ] **Step 1: Amend P23 memory P23b+ candidates section**

Current `memory/p23-og-sample-coverage-shipped.md` P23b+ candidates list contains:
```
- **Satori perf**: pre-existing build resource ceiling. 168/200 og:images rendered in 21 min. Options: lazy-render (only generate OG on demand), reduce image size, skip OG generation in test env (`PUBLIC_TEST_MODE=1` env var → skip prebuild), or accept CI-only coverage. **Decision needed**: does local test suite need to validate build script at all? Maybe gate build-dependent tests behind an env var (`RUN_BUILD_TESTS=1`) so they only run in CI.
```

Replace this bullet with:
```
- ~~Satori perf~~ — shipped in P23b via `RUN_BUILD_TESTS=1` env-var gating on 5 build-dependent test files. See [p23b-satori-perf-skip-gate-shipped.md](p23b-satori-perf-skip-gate-shipped.md)
```

- [ ] **Step 2: Write `memory/p23b-satori-perf-skip-gate-shipped.md`**

Section headers (use P22b + P23 memory format):
- `# P23b Satori Perf Skip-Gate — Shipped`
- Status + Baseline + Scope (4 commits: spec + plan + impl + memory at SHAs TBD at end)
- TL;DR (3-line summary)
- What shipped table
- Why this design (skip-guard pattern + summary + wrapper, alternatives considered)
- Files (the 7 changes with code snippets for the wrapper + skip-guard)
- Verification (local < 60s vs previous 21+min; CI opt-in works)
- Lessons (3 items: env-var gating > build perf tuning for test gates; mirrors existing `skipIfNoClerkEnv` precedent; CI author responsibility for opt-in)
- P23c+ candidates (5 env-dep Clerk/Supabase subtests need real credentials; build-dep tests deferred to CI per env-var mechanism)

- [ ] **Step 3: Append P23b index line to `memory/MEMORY.md`**

Locate P23 index entry. Append:
```markdown
- [P23b Satori Perf Skip-Gate shipped](p23b-satori-perf-skip-gate-shipped.md) — 2026-07-19 env-var gating fix for 5 build-dependent test files; RUN_BUILD_TESTS=1 默认 skip, `pnpm test:build` opt-in; local test suite 21+min → < 60s; 7 files changed (5 skip-guards + run.mjs summary + scripts/test-build.mjs new wrapper + package.json entry); CI author responsibility: set RUN_BUILD_TESTS=1 in workflow
```

- [ ] **Step 4: Dual-push**

```bash
cd 'D:/E/独立站/youtube-tools' && \
  git fetch origin github 2>&1 | tail -3 && \
  echo "---PRE-PUSH-DIVERGENCE---" && \
  git rev-list --left-right --count origin/master...master && \
  git rev-list --left-right --count github/master...master && \
  git push origin master 2>&1 | tail -5 && \
  git push github master 2>&1 | tail -5
```

- [ ] **Step 5: Verify 3-way sync**

```bash
git rev-list --left-right --count origin/master...master
git rev-list --left-right --count github/master...master
```

Both expected: `0\t0`. If divergence > 0, do NOT force-push. Stop and ask.

- [ ] **Step 6: Final summary report**

Print commit SHAs (post-push):
```bash
cd 'D:/E/独立站/youtube-tools' && git log --oneline 9a68423..HEAD
```

Expected: ≥3 commits (spec already landed; plan + impl + memory = 3 minimum).

---

## Self-Review

1. **Spec coverage:** §1 Goal = Plan Goal. §2 Approach = Plan Step 7-9. §3 Scope = Task 3 Files + Task 4 Files. §4 Architecture = Plan Step 12 + Task 4. §5 Constraints = Plan Global Constraints. §6 Task class = Task 3 + Task 4 markers. §7 Success = Task 3 Step 11-13 + Task 4 Steps 4-5.
2. **Placeholder scan:** No TBD/TODO. Skip-guard pattern verbatim. Wrapper verbatim. Run.mjs summary verbatim. Package.json entry verbatim.
3. **Type consistency:** `skipIfNoBuildTests: () => boolean` used consistently. `process.env.RUN_BUILD_TESTS` referenced in 7 places (5 test files + wrapper + run.mjs). Wrapper uses `await import()` matching `tests/run.mjs` ESM pattern.
4. **Ambiguity check:** "5 build-dependent test files" listed once at Step 1. "early-return = node:test pass tally" stated once at Step 2.

**Self-review verdict:** Ready for execution. Awaiting user-approved entry to INLINE execution (already approved above).
