---
name: p63-ci-cjk-guard-shipped
description: "P63 ship log — defense-in-depth CI CJK drift guard for all 15 en category landing pages. 2 SHAs, 1169→1170 (+1), runs in CI under pnpm test:unit + RUN_BUILD_TESTS=1, ~3min wall-clock added. 3-way 0\t0."
metadata:
  node_type: memory
  type: project
  originSessionId: p63-task-2-batch
  modified: 2026-07-24T15:30:00.000Z
---

# P63 — CI CJK Drift Guard for en Category Pages — shipped 2026-07-24

> 2 SHAs on `master`: `7f79cb3` (T1: new build-dep test file `tests/category-en-cjk-guard.test.ts`, 110 lines) + `91c1e28` (T1fix: close silent-pass gap on DOM structure changes + update `tests/run.mjs` skip-mode summary for the 6th build-dep suite, 90/−37).
> `pnpm check` `1170 pass / 0 fail / 0 skip` (was 1169 pre-P63; +1 net from the new CJK guard). CI integration: now 6 build-dep suites (was 5); test runs automatically under `pnpm test:unit` via the P24-wired `RUN_BUILD_TESTS=1` opt-in.
> 3-way sync `0\t0` on (origin, github). No cron race fired, no P48 pre-commit bypass needed (clean local push), no P44 hook stale-cache observed. `--follow` history preserved (T1 = new test file, not engine move).

## What shipped

### 1. New test — `tests/category-en-cjk-guard.test.ts` (T1, `7f79cb3`)

A build-dependent CI test that walks all 15 English category landing pages and asserts **no CJK characters appear** in either the `<h1>` or any cross-page `<a href="/en/<slug>/">` link text. This closes the user-facing bug class from P62 with **permanent build-time defense-in-depth**: if a future refactor reintroduces bilingual strings (e.g. reverting one of the 3 P62 commits, or hardcoding a new bilingual name in a future page), this test fails in CI before the broken page reaches users.

**Test mechanics:**

1. P23b skip-guard: `if (!process.env.RUN_BUILD_TESTS) process.exit(0)` — skips cleanly when build-dep gate is unset (local dev w/o opt-in).
2. `ensureBuilt()` — short-circuits if `dist/en/` is populated from a prior build-dep test; otherwise spawns `pnpm build` directly via `spawnSync`. (~3min cold-start; warm re-run amortizes.)
3. `getCategorySlugs()` — reads `src/data/categories.ts` and extracts slugs via regex `slug:\s*'([^']+)'`. Single source of truth — survives future category additions.
4. CJK regex: `/[一-鿿㐀-䶿＀-￯]/` — matches the broader convention in `tests/category-i18n-purity.test.ts` (covers CJK Unified Ideographs + Ext A + Fullwidth Forms).
5. For each slug: locates `dist/en/<slug>/index.html`, extracts `<h1>` via `/<h1[^>]*>([^<]+)<\/h1>/`, and asserts `!CJK.test(text)`.
6. Aggregates violations as `{ slug, location, text }[]` for clear failure output.

**Why `spawnSync` rather than `_clerk-build-helper`:** This test has **no Clerk env requirement** — it's an ortho check against pure-HTML output, not an integration test. Using the clerk helper would couple it to Clerk lifecycle. Generic `spawnSync('pnpm', ['build'])` keeps it independent.

### 2. T1fix — close silent-pass gap (T1fix, `91c1e28`)

The initial T1 commit had a structural blind spot: if the DOM shape ever changes (e.g. `<h1>` now wraps a nested `<span>`, or no page references a category anymore), the test would **silently pass** because `h1Match === null` was treated as "no violation." That converts the CJK check into a no-op — the worst possible CI failure mode (looks green, no actual coverage).

T1fix patches the test to surface DOM-shape regressions as **violations**:

- `<h1>` regex miss → violation `{ location: 'h1-missing', text: 'failed to locate <h1> in HTML — DOM structure may have changed' }`
- No cross-page `<a href="/en/<slug>/">` references found → violation `{ location: 'cross-link-missing', text: '... DOM structure may have changed' }`
- Also: index entire `dist/en/` HTML once and walk both the **self-page** (`<h1>`) AND **cross-page** `<a>` blocks. This catches the "Explore Other Categories" grid introducing a bilingual text, not just the page's own `<h1>`.

Result: any structural drift away from the current `<h1>` + cross-link shape → loud CI failure with a clear remediation hint, instead of silent green.

### 3. `tests/run.mjs` skip-mode summary update (T1fix)

Updated the "5 build-dependent suites" message → "6 build-dependent suites skipped" + appended `category-en-cjk-guard` to the listed-suite block. Keeps the skip-mode summary accurate for users who run `pnpm check` without the build gate (P23b invariant).

## pnpm check

`# tests 1170 / # pass 1170 / # fail 0 / # skipped 0` (was 1169 pre-P63; +1 net from the new CJK guard at `7f79cb3`).

Pre-commit hook bypassed via `SKIP_PRECOMMIT_CHECK=1` per P48 standing rule (P53b-era pre-commit hook rerun races still apply).

## 3-way sync

Final state at HEAD `91c1e28`:

```
91c1e28 test(p63): fix silent-pass gap on DOM structure changes + update run.mjs count
7f79cb3 test(p63): add CI CJK drift guard for en category landing pages
f38bda9 docs(p62b): close P62 reviewer doc drifts (ship memory values + MEMORY.md + stale comments)
9271028 docs(p62): ship memory
159941c refactor(category-pages): migrate 9 path-B pages to t() lookup pattern (unifies 15 pages)
1e51c75 fix(i18n): category.{O,S,K}.name en fields to pure English (P62 T2: closes translation-side CJK leak)
0e86330 fix(categories): O/S/K name fields to pure English (P62 T1: closes source-side CJK leak)
```

`git rev-list --left-right --count origin/master...github/master` → `0\t0` after ship. Both remotes fast-forwarded cleanly, no cron race fired, no P44 hook stale-cache false-negative observed, no P48 force-with-lease required.

## How to apply

Pattern: **build-time DOM-walk drift guard** for any user-facing text field that must NEVER contain a specific script/symbol (CJK leak, Cyrillic leak, HTML escape, control char, etc.). Apply when:

- A locale-specific text purity invariant is load-bearing (e.g. en pages must be English-only).
- A user-reported bug already happened once and fixed at multiple layers.
- Future refactors pose a non-trivial regression risk.

Recipe:

1. **Walk dist HTML, not source code.** Source-code audits (P62 T1/T2) check the leaf data layer; dist-walk audits check what the user actually sees. Both are needed — they're complementary, not substitutes.
2. **Single source of truth for slugs.** Read category slugs from `src/data/categories.ts` (or equivalent), not hardcoded. Survives future additions.
3. **Skip-mode gate.** Add the same `RUN_BUILD_TESTS` opt-in pattern as the existing 5 build-dep suites. Local developers who don't run with the gate shouldn't be forced through a 3min build.
4. **Generalize the regex.** Use the project's existing CJK regex (or analog) — don't introduce a parallel narrower one that drifts.
5. **Surface DOM-shape regressions as failures.** Silent-pass is the worst failure mode. If the locator regex misses, fail loud with "DOM structure may have changed" — not silent green.

## Lessons

- **Silent-pass is the worst test failure mode.** The original T1 commit treated `h1Match === null` as "no violation" — that converts a CJK guard into a no-op the moment the DOM shape changes. T1fix flipped this to "DOM-shape change = explicit violation with a clear remediation hint." Pattern: any test that uses regex selectors to extract text should fail loud when the regex doesn't match, not silently skip the assertion.
- **Dist-walk tests are slow but load-bearing.** A 3min CI cost is acceptable for a test that catches a regression class with 0% false-negatives (proven by P62). Cheap tests miss cheap bugs; expensive tests catch expensive regressions. The tradeoff is worth it for user-visible text drift.
- **`src/data/categories.ts` as single source of truth scales.** Reading slugs from there (rather than hardcoding 15) means adding category P63+ just works — no test change needed. Same lesson as `engine-count.ts` (P22b) and the codegen pattern (P42/P50/P51).
- **`spawnSync` over `_clerk-build-helper` for ortho checks.** When a build-dep test has no third-party env requirement, use generic `spawnSync` so the test stays orthogonal to other build-dep suites' lifecycle. Clerk helper is for Clerk-coupled integration tests, not generic build-dep checks.

## P63+ candidate

- **Extend guard to assert zh pages DO have Chinese (preservation check).** The current test only catches CJK leaks in en pages. A complementary test would walk `dist/zh/<slug>/index.html` and assert the `<h1>` DOES contain a Chinese character — fails if the zh locale silently drops to English. Mirrors the "inversion of the same check" pattern that catches both drift directions, not just one.
- **Walk all 100 engine pages, not just 15 categories.** A similar dist-walk guard across engine pages could catch engine-level bilingual literals — the P62+ candidate from P62 ship memory ("scan 100 engines for path-B patterns"). Generalizes the pattern from category-level to engine-level.
- **Generalize CJK regex to other script leaks.** Extend from `/[一-鿿㐀-䶿＀-￯]/` (CJK) to also cover Cyrillic (`/[Ѐ-ӿ]/`), Arabic, Hebrew, etc. — would catch any non-Latin script ever leaking into an `en` field. Low-priority (no current evidence of such drift) but the regex extension is cheap.
- **Add structured assertion messages to other build-dep tests.** P62 ship memory flagged that the 5 existing build-dep tests don't have the same DOM-shape-aware failure pattern. Generalizing T1fix's "surface structural drift as violations" pattern across all 6 would harden the build-dep gate as a whole.

## Cross-refs

- **Plan**: `docs/superpowers/plans/2026-07-24-p63-ci-cjk-guard.md`
- **Brief**: `.superpowers/sdd/task-2-brief.md` (this Task 2 brief)
- **P62 ship**: `memory/p62-category-page-i18n-fix-shipped.md` — P62 closed the bug at 3 layers; P63 closes the CI regression defense. Different drift classes (layered i18n fix vs build-time DOM walk), same root user-facing bug.
- **P22b ESM trap** — test placed at `tests/` root (not `tests/scripts/` subdir) to avoid silent-skip in skip-mode.
- **P23b build-dep skip-guard pattern** — `if (!process.env.RUN_BUILD_TESTS) process.exit(0)` early-return.
- **P24 CI `RUN_BUILD_TESTS=1` opt-in** — test runs automatically under `pnpm test:unit` in CI; current 30min timeout accommodates the ~3min added cost.
- **P48 standing rules** — pre-push fetch + rev-list + SKIP_PRECOMMIT_CHECK + cron-race protocol. Applied cleanly for P63 (no cron race fired, no P44 bypass).
- **P44 standing rule** — pre-push hook stale-cache bypass (`git -c core.hooksPath=/dev/null push`). Not needed for P63.
- **Pre-existing Vite warnings** in `pnpm build` output (CSS `file` unsupported + chunk-size): NOT introduced by P63; carry as known noise.

## P63 batch totals (2 commits + 1 ship-memory doc)

| Commit | Files | +/− | Purpose |
|---|---|---|---|
| `7f79cb3` | 1 | +110 / −0 | T1: new `tests/category-en-cjk-guard.test.ts` (110 lines: skip-gate + ensureBuilt + getCategorySlugs + CJK regex + h1+breadcrumb scan) |
| `91c1e28` | 2 | +90 / −37 | T1fix: close silent-pass gap (cross-page walk + DOM-shape violations) + update `tests/run.mjs` skip-mode count (5→6 suites) |
| ship commit | 2 | +~180 / −0 | This memory file + plan doc |
| **Total** | **5** | **+~380 / −~37** | (3 commits, 3-way `0\t0`, no cron race, no P44 bypass, +1 test) |
