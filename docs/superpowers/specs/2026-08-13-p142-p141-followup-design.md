# P142 — P141-followup Integration Batch (Design)

> **Status:** READY for `superpowers:writing-plans`. P141 OCR scan followups (5 candidates A-E), E deferred to P143. 4 candidates (A tsc gate + B dead code + C env-via + D a11y SVG) ship via 3 batches.
>
> **Origin:** P141 ship record `memory/p141-ocr-batch-fix-shipped.md` §"Pre-existing 项目 gaps". 2026-08-13.

---

## 1. Goal

Consolidate 4 pre-existing P141 follow-up gaps into a single P142 batch (3 batches × ~1-2 commits), eliminating residual tech debt that P141 explicitly deferred:

| ID | Gap | File(s) |
|---|---|---|
| **A** | `pnpm check` does NOT run `tsc --noEmit` (CLAUDE.md 红线 7 type-level gate missing) | `package.json` |
| **B** | `scripts/codegen-customfn.mjs` has 2 dead code sites | `scripts/codegen-customfn.mjs` |
| **C** | `scripts/sync-supabase-schema.mjs:48` exposes DB password in `psql` cmdline (P141-B3-T6 residual exposure) | `scripts/sync-supabase-schema.mjs` |
| **D** | 6 components have decorative SVG without `aria-hidden="true"` (P141-B2-T2 deferred scope) | 6 `.astro` files |

**Excluded** (deferred to P143):
- **E** — 9 pre-existing build-dep failures (CLAUDE.md invariant + engine FAQ/how-to-use/title rendering). Different problem class (systemic baseline regression, not surgical followup).

**Single outcome:** master HEAD with 0 OCR-flagged P141-followup gaps; type-level CI gate active; env-via security tightened; a11y SVG coverage complete.

---

## 2. Approach — 3 batches (P141 pattern continuation)

```
Branch: feature/p142-p141-followup (off master f4639d1)
  │
  ├── B1 cleanup (1 PR, 2 commits, MECH × 2)
  │   ├── feat(check): tsc --noEmit gate (1 line)
  │   └── refactor(codegen): dead code removal
  │
  ├── B2 security (1 PR, 1 commit, MECH × 1)
  │   └── fix(security): sync-supabase-schema env-via
  │
  └── B3 a11y (1 PR, 1 commit, MECH × 1)
      └── fix(a11y): 6 components SVG aria-hidden
```

**Why 3 batches:**
- Each batch is one PR / one reviewable unit / one rollback point
- B1 (cleanup, lowest risk) → B2 (security, medium risk) → B3 (a11y, low risk) — risk-graded ordering
- Matches P141-B1/B2/B3 pattern that proved effective in the P141 ship

**Subagent calls** (estimated): 6 calls total (2 per batch, MECH class only — no quality reviewer per CLAUDE.md "Mechanical tasks have low bug density per line").

---

## 3. Architecture

### Branch & ship strategy
- Single feature branch `feature/p142-p141-followup` carries all 3 batches' commits (P140f-p3 pattern — no branch-per-batch ceremony overhead)
- Each batch ship:
  ```
  git checkout feature/p142-p141-followup
  # implement B[N] commits
  git push origin feature/p142-p141-followup
  git checkout master && git merge --ff-only feature/p142-p141-followup
  git push origin master
  git push github master --force-with-lease  # only if cron drift detected
  ```
- Pre-push always: `git fetch origin && git fetch github && git rev-list --left-right --count origin/master...master github/master...master` (P43/P44 lesson + hook reminder)
- Pre-commit always: `pnpm check` (hook auto, manual verify too) — now includes tsc gate post-B1

### Why single branch (not per-batch branches)
- 3 batches within one PR-set keeps audit history clean (`git log feature/p142-p141-followup --not master` shows full P142 atomic-commits)
- Less ceremony: 1 branch creation, 1 final cleanup
- P141 ship memory established this pattern as preferred

---

## 4. Components (per-candidate detail)

### A — tsc --noEmit gate
- **File**: `package.json` line 18 (`scripts.check`)
- **Change**: prepend `npx tsc --noEmit && ` to the existing `pnpm check` command
- **Rationale**: Fail-first ordering — type errors block before other checks waste cycles
- **Verified baseline**: `npx tsc --noEmit` → **0 errors** (run 2026-08-13)
- **Risk**: 0 — baseline clean; future pre-existing errors will fail gate per CLAUDE.md 红线 7
- **Subagent class**: MECH (1 file, 1 line, no logic change)

### B — codegen-customfn.mjs dead code removal
- **File**: `scripts/codegen-customfn.mjs`
- **Change 1**: Delete `generateComparisonTable()` function (lines 238-250, 13 lines)
  - **Verified**: `grep -n "generateComparisonTable" scripts/codegen-customfn.mjs` returns only the definition (line 238). Zero callers. Actual implementation lives in `buildComparisonTableContent` (line 256).
- **Change 2**: Drop unused `key` param from `fieldMap: (m, key) => ...` on line 189 (gpu-cloud-cost-calculator)
  - **Verified**: 8 `fieldMap:` declarations (lines 66, 88, 110, 134, 170, 189, 206, 220). Only line 189 has `(m, key)` signature. Inside (lines 191-197), `key` is never referenced — confirmed by reading the closure body.
- **Caller impact**: line 336 passes `engine.fieldMap(m, k)` to all fieldMaps. JS tolerates extra args; signature tightening is backward-compatible.
- **Verification**: `node scripts/codegen-customfn.mjs --check` should still report 0 drift across 8 engines
- **Risk**: 0 — pure dead code removal, runtime output unchanged
- **Subagent class**: MECH (1 file, 2 surgical edits)

### C — sync-supabase-schema.mjs env-via
- **File**: `scripts/sync-supabase-schema.mjs` lines 31-51
- **Change**: Replace `spawnSync('psql', [dbUrl, '-f', sqlPath], ...)` with URL-parsed env vars
- **Implementation sketch**:
  ```js
  // P142-C: env-via PGPASSWORD/PGHOST/PGUSER/PGDATABASE prevents password
  // leak via psql child process /proc/<pid>/cmdline + ps auxf (P141-B3-T6
  // residual exposure; old dbUrl argv exposed password ~ms-seconds during psql
  // startup). URL parse failure falls through to existing r.status check.
  // Known limit: PGPASSWORD still in /proc/<pid>/environ (harder to read —
  // requires same UID + ptrace); this is a psql API limit, not solvable
  // client-side.
  const u = new URL(dbUrl);
  const env = {
    ...process.env,
    PGPASSWORD: decodeURIComponent(u.password ?? ''),
    PGHOST: u.hostname,
    PGPORT: u.port || '5432',
    PGUSER: decodeURIComponent(u.username),
    PGDATABASE: u.pathname.replace(/^\//, '') || 'postgres',
  };
  const r = spawnSync(
    'psql',
    ['-h', env.PGHOST, '-p', env.PGPORT, '-U', env.PGUSER, '-d', env.PGDATABASE, '-f', sqlPath],
    { cwd: root, stdio: 'inherit', env }
  );
  ```
- **Edge cases** (handled by `URL` API):
  - IPv6 host: `u.hostname` strips `[...]` brackets
  - URL-encoded special chars in password: `decodeURIComponent`
  - Empty username / pathname: fallback to `'postgres'`
- **Verification** (manual dry-run, no automated test):
  ```bash
  SUPABASE_DB_URL='postgresql://testuser:secret@localhost:5432/testdb' \
    timeout 3 node scripts/sync-supabase-schema.mjs 2>&1 &
  sleep 1
  ps auxf | grep psql | grep -v grep
  # Expected: only sees -h -p -U -d flags, NO "secret" string
  ```
- **Risk**: Medium — URL parser edge cases (covered above), but no automated regression test (P142-followup candidate: `tests/secret-leak-guard.test.ts` static scanner)
- **Subagent class**: MECH (1 file, ~25 lines including comment)

### D — 6 components SVG aria-hidden="true"
- **Files**: 6 `.astro` components, 14 SVG instances total

| File | SVG count | Line numbers |
|---|---|---|
| `src/components/ToolCard.astro` | 3 | 16, 24, 29 |
| `src/components/ResultCard.astro` | 3 | 26, 31, 47 |
| `src/components/Header.astro` | 5 | 34, 45, 58, 69, 80 (existing `aria-hidden="true"` on emoji spans 42, 55 stays) |
| `src/components/FAQ.astro` | 1 | 17 |
| `src/components/SearchBar.astro` | 1 | 9 |
| `src/components/CopyButton.astro` | 1 | 8 |

- **Change**: Add `aria-hidden="true"` attribute to each `<svg ...>` (no other changes)
- **Rationale**: All 14 SVGs are decorative (visible text label is the meaningful content for screen readers)
- **Pattern consistency**: Header.astro already has `aria-hidden="true"` on emoji spans (lines 42, 55) — D extends the same pattern to SVGs
- **Test guard**: Extend `tests/a11y-scattered.test.ts` (P141-B2-T5 ship) with regex covering decorative SVG without `aria-hidden` in 6 target components
- **Out of scope** (deferred): `Footer.astro` / `RelatedBlog.astro` / `RelatedTools.astro` have SVGs that may also benefit; review separately if P142 ship proves pattern
- **Risk**: Low — pure a11y attribute additions, zero visual / behavioral change
- **Subagent class**: MECH (6 files + 1 test extension, all mechanical)

---

## 5. Data flow

P142 has **no runtime data flow changes**. The static changes affect:

### A — tsc gate data flow
```
src/**/*.ts → tsc --noEmit → CI gate (pnpm check chain head) → ship/pass
```

### C — env-via data flow (the only runtime change)
```
SUPABASE_DB_URL env var
  ↓ Node URL parser
  ↓ decoded username/password + hostname/port/pathname
  ↓ env: { PGPASSWORD, PGHOST, PGPORT, PGUSER, PGDATABASE }
  ↓ spawnSync('psql', ['-h', '-p', '-U', '-d', '-f'], { env })
psql child process
  ↳ password readable only via /proc/<pid>/environ (same UID + ptrace required)
  ↳ NOT in /proc/<pid>/cmdline (vs old dbUrl argv form)
```

### D — a11y SVG data flow
- Assistive technology (NVDA / JAWS / VoiceOver) reads `<svg>` content unless `aria-hidden="true"`
- Decorative SVGs without `aria-hidden` cause SR to announce them as meaningless noise
- Adding `aria-hidden="true"` → SR skips SVG → reads only the text label

---

## 6. Error handling

### A — tsc gate failure
- tsc exit non-zero → `pnpm check` exit 1 → blocks commit per pre-commit hook (CLAUDE.md 红线 7)
- Error output: native tsc format (no custom formatter needed)
- Recovery: implementer fixes error before commit (no `--skip` escape hatch)

### B — dead code removal failure
- `--check` mode drift → hidden caller exists (CLAUDE.md 红线 9: pause + investigate)
- Expected: 0 drift (verified pre-flight via grep)

### C — env-via edge case handling
| Scenario | Behavior |
|---|---|
| Invalid URL string | `new URL()` throws → falls through to existing r.status check (line 53-56) |
| IPv6 host `[::1]:5432` | `u.hostname` returns `::1` (brackets stripped); psql `-h` accepts |
| URL-encoded password `p%40ss%3Aw0rd` | `decodeURIComponent` → `p@ss:w0rd` |
| Empty username / pathname | Falls back to `'postgres'` |
| `SUPABASE_DB_URL` not set | Existing early-return (line 33-44) unchanged — manual SQL Editor fallback message preserved |

### D — a11y test guard failure
- Extended `tests/a11y-scattered.test.ts` fails if any of 6 target components has decorative SVG without `aria-hidden`
- Error message includes `file:line` for each missing instance
- Scope: only the 6 target files (not all `.astro` with `<svg>`, to avoid false positives on Footer/RelatedBlog/RelatedTools)

---

## 7. Testing

### Per-batch verification

| Batch | Verification | Pass criterion |
|---|---|---|
| **B1** | `pnpm check` (includes tsc gate) | exit 0, 0 tsc errors |
| **B1** | `node scripts/codegen-customfn.mjs --check` | 0 drift across 8 engines |
| **B2** | `pnpm check` | exit 0 |
| **B2** | Manual dry-run with test `SUPABASE_DB_URL` | `ps auxf` shows only `-h -p -U -d` flags, no plaintext password |
| **B3** | `pnpm check` (with `RUN_BUILD_TESTS=1`) | exit 0 |
| **B3** | `node tests/a11y-scattered.test.ts` (extended) | all 6 components pass aria-hidden check |
| **B3** | Manual browser spot-check 1-2 tool pages with SVG icons | aria-hidden does not affect visual rendering |

### Per-PR cross-cutting (before ff-merge)
```bash
pnpm test:build  # RUN_BUILD_TESTS=1 — runs 46 build-dep suites including a11y-scattered
git fetch origin && git fetch github
git rev-list --left-right --count origin/master...master github/master...master
```
Manual spot-check: 1-2 tools with visible SVG icons (chevron, copy button, header dropdown) → confirm no visual regression.

### New / modified test files
| File | Change |
|---|---|
| `tests/a11y-scattered.test.ts` | **Extend** regex coverage for decorative SVG `aria-hidden` check (6 target files only) |
| (no new test files in P142) | — |

### Known test gap (P142-followup candidates, NOT in scope)
1. **C env-via has no automated regression test** — relies on manual dry-run. Future P142+ batch could add `tests/secret-leak-guard.test.ts` (static scanner for spawnSync dbUrl patterns).
2. **Header.astro SVGs inside `<button>` may have different SR behavior** than purely decorative SVGs — needs user testing in actual assistive tech (out of scope for P142).

---

## 8. Out of scope (deferred)

| Item | Why deferred | Suggested next batch |
|---|---|---|
| **E** — 9 pre-existing build-dep failures (CLAUDE.md invariant + engine FAQ/how-to-use/title rendering) | Different problem class (systemic baseline regression); deserves dedicated batch with full audit | P143 |
| C's automated regression test (`secret-leak-guard.test.ts`) | Manual dry-run sufficient for now; CI guard is incremental value | P142+ |
| Footer.astro / RelatedBlog.astro / RelatedTools.astro SVG aria-hidden | Out of D's initial scope; review separately if pattern proves valuable | P142+ or P144 |
| tsc gate for `.astro` files (currently only `.ts`) | Astro has its own TS handling; complex to add without false positives | P142+ |
| `tsc --noEmit --watch` mode for local dev | Out of scope; CI gate sufficient | P145+ |

---

## 9. Ship path

### Day 0 (today, 2026-08-13)
1. `git checkout -b feature/p142-p141-followup`
2. (Future) `superpowers:writing-plans` creates plan from this spec
3. (Future) `superpowers:executing-plans` executes B1 → B2 → B3 with subagent-driven development

### Per-batch (B1 / B2 / B3)
1. `git checkout feature/p142-p141-followup`
2. Dispatch implementer subagent (MECH class, single review depth)
3. Dispatch spec-verifier subagent
4. Apply fix if any
5. `pnpm check` (now includes tsc post-B1)
6. Commit with conventional message (`feat(check):` / `refactor(codegen):` / `fix(security):` / `fix(a11y):`)
7. `git push origin feature/p142-p141-followup`
8. `git checkout master && git merge --ff-only feature/p142-p141-followup`
9. `git push origin master`
10. `git push github master --force-with-lease` (only if cron drift detected per P43/P44)

### Day N (after B3 ship)
- Update `memory/p142-p141-followup-shipped.md` (P141 ship memory pattern)
- Update `MEMORY.md` index line
- Update `docs/superpowers/plans/INDEX.md` last-update line
- Mark P142 branch as `keep` (audit history, P140f-p3 pattern)

---

## 10. Acceptance criteria

1. **A**: `package.json` `check` script contains `tsc --noEmit`; `pnpm check` exit 0 with 0 type errors
2. **B**: `scripts/codegen-customfn.mjs` does NOT contain `generateComparisonTable` function or `(m, key)` fieldMap signature; `codegen-customfn.mjs --check` reports 0 drift across 8 engines
3. **C**: `scripts/sync-supabase-schema.mjs` `spawnSync` call uses `env` object (PGPASSWORD/PGHOST/PGUSER/PGDATABASE), no `dbUrl` in argv array
4. **D**: All 14 SVGs in 6 target components have `aria-hidden="true"`; `tests/a11y-scattered.test.ts` extended regex covers all 6 files
5. 3-way push: local = origin = github at single SHA, 0 divergence
6. `pnpm check` exit 0 across all 1240 tests + 46 build-dep suites (`RUN_BUILD_TESTS=1`)
7. 4-5 atomic commits on `feature/p142-p141-followup` branch
8. Master HEAD increments by ≤4-5 commits from `f4639d1`

---

## 11. References

- P141 ship memory: `memory/p141-ocr-batch-fix-shipped.md` §"Pre-existing 项目 gaps"
- P141 plan: `docs/superpowers/plans/2026-08-10-p141-ocr-batch-fix.md`
- CLAUDE.md 红线 7: "提交前过质量门禁" (`pnpm check`)
- CLAUDE.md 红线 11: comments on non-obvious logic + known limits
- P43/P44 lesson: sync-pricing cron 3-way divergence handling
- P55b lesson: test doubles must never be more permissive than runtime (applies to D's a11y test guard stub)
- B1-T1 reviewer Important #1: `tsc --noEmit` missing from `pnpm check` (origin of candidate A)
- B3-T6 residual exposure: spawnSync dbUrl password in cmdline (origin of candidate C)
- B2-T2 out-of-scope SVG aria-hidden candidates: 6 components (origin of candidate D)