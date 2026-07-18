# P23 OG-Sample Coverage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the `Missing og-sample` build cascade by backfilling 2 missing `src/data/og-samples.json` entries, upgrading `scripts/build-og-images.ts` to report ALL missing slugs (not just the first), and adding a precommit guard that prevents future drift.

**Architecture:** 4-file change — 1 JSON backfill + 1 build script improvement + 1 new coverage check script + 1 precommit hook line. Total ~50 LOC. No framework change, no engine registration change, no `Sample` interface change. Pre-existing 5 build-dependent test failures (`tests/_clerk-build-helper.ts` cascade) resolve as side effect.

**Tech Stack:** Node `^20.19.0` (no install), `tsx` (already in devDeps), `pnpm` 9.x. No new dependencies.

## Baseline + Reference SHAs

- **Baseline:** `ace65f1` (P22b Engine Count Constant ship)
- **Spec:** `docs/superpowers/specs/2026-07-18-p23-og-sample-coverage-design.md` (this commit)
- **Plan:** this document

## Global Constraints

1. **No new dependencies** — only use Node built-ins + `tsx` (already installed for codegen scripts).
2. **No new module directories OUTSIDE `scripts/`** — new file `scripts/check-og-samples-coverage.mjs` lives with other build scripts.
3. **3-way sync required at end** — both `origin` (gitee: wlz679/calcKit) and `github` (github: wlz679/forgeflow) must reflect final commits. Run `git fetch origin github && git rev-list --left-right --count origin/master...master && git rev-list --left-right --count github/master...master` and verify both are `0\t0`.
4. **Pre-commit gate** — `SKIP_PRECOMMIT_CHECK=1` available per P22b precedent; P23 DOES use precommit (new check added) so local `git config core.hooksPath .githooks` will run it on commit.
5. **raw-key invariant** — N/A (P23 doesn't touch `src/i18n/`).
6. **byte-identical invariant** — N/A (P23 doesn't regenerate any tracked artifacts).
7. **No engine registration changes** — `src/core/engines/registry.ts` and `src/engines/index.ts` are read-only for P23.
8. **P22b memory amend** — `memory/p22b-engine-count-constant-shipped.md` has stale line claiming "only cart-abandonment got og-sample" — both are missing, amend in P23-4.

---

## Task 1: P23-1 — Spec author commit

**Files:**
- Create: `docs/superpowers/specs/2026-07-18-p23-og-sample-coverage-design.md`

**Consumes:** — (entry task)
**Produces:** — spec file at canonical path. Subsequent tasks reference Goal/Approach/Scope sections.

- [ ] **Step 1: Write the failing assertion first** — write spec to `/dev/null` mentally; spec commits only after Task 3 verification confirms design matched reality.

**Note:** Spec is authored BEFORE plan per the brainstorming workflow; this task is a marker for `git log` lineage. Skip to Task 2.

---

## Task 2: P23-2 — Plan author commit

**Files:**
- Create: `docs/superpowers/plans/2026-07-18-p23-og-sample-coverage.md`

**Consumes:** Approved spec (Task 1).
**Produces:** This plan document.

- [ ] **Step 1: Commit plan** — `git add docs/superpowers/plans/2026-07-18-p23-og-sample-coverage.md && git commit -m "docs(plan): P23 OG-Sample Coverage implementation plan — 4-file INLINE fix + precommit guard"`

---

## Task 3: P23-3 — Backfill + Improve + Guard + Hook

**Class:** INTEGRATION (1 spec-verify reviewer per CLAUDE.md review depth guidance).

**Files:**
- Modify: `src/data/og-samples.json` (add 2 entries, +24 lines JSON)
- Modify: `scripts/build-og-images.ts` (~12 lines around line 149-150 + add collect helper)
- Create: `scripts/check-og-samples-coverage.mjs` (~35 lines)
- Modify: `.githooks/pre-commit` (+1 line)

**Consumes:** Plan + Spec from Tasks 1/2.
**Produces:** 4 changed files + 1 new script + cascading unlock of 5 build-dependent tests + precommit guard.

- [ ] **Step 1: Verify current missing list before edit** (pre-flight per plan spec validation rule)

Run:
```bash
pnpm exec tsx scripts/.scratch/find-missing-og.ts 2>&1 | tail -10
```
Expected output:
```
og-samples entries: 99
tools total: 100
--- MISSING (2) ---
  - solopreneur-coupon-attribution-calculator [M]
  - solopreneur-cart-abandonment-cost-calculator [M]
```
**Why pre-flight:** the scratch script from before-compaction confirmation may have stale output; re-running against current HEAD ensures spec lines up with reality.

- [ ] **Step 2: Read og-samples.json structure (last 20 lines) to match existing indentation**

```bash
tail -25 src/data/og-samples.json
```

Note the indentation (2 spaces, no trailing comma on last entry, JSON file ends with `}`). Match it exactly.

- [ ] **Step 3: Append 2 entries to `src/data/og-samples.json`**

The JSON file is sorted alphabetically. Both new entries go BEFORE the closing `}` of the existing `solopreneur-cmp-roi-calculator` entry (alphabetical predecessor to `coupon` / `cart` doesn't exist — they slot in close to existing `coupon`-prefixed if any, otherwise before `mrr` etc.).

Exact entries to add (use these values verbatim — they match the engine titles from `src/data/tools/marketing.ts`):

```json
,
"solopreneur-coupon-attribution-calculator": {
  "headline": { "en": "Coupon Attribution Calculator", "zh": "优惠券归因计算器" },
  "headlineUnit": { "en": "attributed revenue / mo", "zh": "月度归因营收" },
  "headlineLabel": { "en": "from $X spend", "zh": "$X 投入" }
},
"solopreneur-cart-abandonment-cost-calculator": {
  "headline": { "en": "Cart Abandonment Cost Calculator", "zh": "购物车放弃成本计算器" },
  "headlineUnit": { "en": "lost revenue / mo", "zh": "月度流失营收" },
  "headlineLabel": { "en": "from X% abandonment", "zh": "X% 放弃率" }
}
```

**Risk:** if the file does NOT end with a trailing comma + newline, the patch fails. Verify with Read before/after.

- [ ] **Step 4: Verify JSON is parseable**

```bash
node -e "console.log(Object.keys(require('./src/data/og-samples.json')).length)"
```
Expected: `101` (100 original minus stale if any + 2 new; verify actual count).

**Alternative if require fails:** use `node -e "import('./src/data/og-samples.json', {with:{type:'json'}}).then(m=>console.log(Object.keys(m.default).length))"`.

- [ ] **Step 5: Modify `scripts/build-og-images.ts` to collect-all-then-throw**

Find lines 149-150 of `scripts/build-og-images.ts` (currently):
```ts
  const sample = ogSamples[slug];
  if (!sample) throw new Error(`Missing og-sample for ${slug}`);
```

Insert a NEW upfront check in `main()` function (after `assertEmojiSet()` at line 222 + before `mkdirSync` at line 223 — that way the check runs before any satori work):

```ts
  // Check all targets have og-samples BEFORE doing any satori work, so
  // a missing entry fails fast with the FULL list of missing slugs (not
  // just the first). P23 lesson: the old per-render check short-circuited
  // at the first missing slug, hiding subsequent ones.
  const targets = buildTargets();
  const missingOgSamples = [...new Set(targets.map(t => t.slug).filter(s => !ogSamples[s]))];
  if (missingOgSamples.length > 0) {
    throw new Error(
      `Missing ${missingOgSamples.length} og-sample entries in src/data/og-samples.json:\n` +
      missingOgSamples.map(s => `  - ${s}`).join('\n') +
      `\nAdd entries to src/data/og-samples.json.`
    );
  }
```

**Plus** replace the existing per-render line 149-150 with the same pattern but referencing the upfront check:
```ts
  const sample = ogSamples[slug];
  if (!sample) throw new Error(`Internal: og-sample for ${slug} vanished after upfront check`);
```

(Defensive layer 2 — if `ogSamples` were mutated between upfront check and render, this catches it. Unlikely but mirrors P14-Followup defense-in-depth pattern.)

- [ ] **Step 6: Verify build-og-images.ts compiles + renders**

```bash
pnpm exec tsx scripts/build-og-images.ts --slug=solopreneur-coupon-attribution-calculator --slug=solopreneur-cart-abandonment-cost-calculator 2>&1 | tail -15
```
Expected: 4 PNGs written (2 slugs × 2 langs), exit 0.

**Alternative if slow:** skip PNG render verification and rely on coverage script in Step 7 + full test run in Step 10.

- [ ] **Step 7: Create `scripts/check-og-samples-coverage.mjs`**

```js
#!/usr/bin/env node
// P23: CI guard that fails if any tool in src/data/tools/ is missing an
// og-sample entry in src/data/og-samples.json (or vice versa).
// Run via precommit hook (.githooks/pre-commit) and manually via
// `node scripts/check-og-samples-coverage.mjs`.

import { tools } from '../src/data/tools/index.ts';
import ogSamples from '../src/data/og-samples.json' with { type: 'json' };

const toolSlugs = new Set(tools.map(t => t.slug));
const sampleSlugs = new Set(Object.keys(ogSamples));

const missing = tools.map(t => t.slug).filter(s => !sampleSlugs.has(s));
const orphan = Object.keys(ogSamples).filter(s => !toolSlugs.has(s));

if (missing.length === 0 && orphan.length === 0) {
  console.log(`OK: ${toolSlugs.size}/${toolSlugs.size} og-samples present (zero missing, zero orphan)`);
  process.exit(0);
}

if (missing.length > 0) {
  console.error(`MISSING og-samples for ${missing.length} tools:`);
  for (const s of missing) console.error(`  - ${s}`);
}
if (orphan.length > 0) {
  console.error(`ORPHAN og-samples (no matching tool): ${orphan.length} entries:`);
  for (const s of orphan) console.error(`  - ${s}`);
}
process.exit(1);
```

The `.ts` import of `tools/index.ts` requires tsx-style resolution; if `node` is invoked directly without tsx, this fails. **Two options:**
- (a) Run via `pnpm exec tsx scripts/check-og-samples-coverage.mjs` in precommit + standalone
- (b) Drop the `tools.ts` import, read `src/data/tools/types.ts` schema directly via JSON.parse

**Choose (a)** for simplicity. Precommit hook will call `pnpm exec tsx` instead of `node`.

- [ ] **Step 8: Verify coverage script passes**

```bash
pnpm exec tsx scripts/check-og-samples-coverage.mjs
```
Expected output:
```
OK: 100/100 og-samples present (zero missing, zero orphan)
```
Exit code 0.

- [ ] **Step 9: Modify `.githooks/pre-commit` to add og-samples check**

Find the existing line that runs `codegen-examples.mjs --check`. After it, add:

```bash
pnpm exec tsx scripts/check-og-samples-coverage.mjs || { echo "og-samples coverage check failed"; exit 1; }
```

(Insert before the final `pnpm check` line if present, or before the final `exit 0`.)

- [ ] **Step 10: Run full test suite, verify 5 build-dependent tests now pass**

```bash
SKIP_PRECOMMIT_CHECK=1 node tests/run.mjs 2>&1 | tail -15
```
Expected: pass count rises from 1067 → 1072 (5 build-dependent tests now resolve cleanly). fail count drops from 10 → 5 (5 Clerk/Supabase env-dep remains as baseline).

- [ ] **Step 11: Stage + commit**

```bash
git add src/data/og-samples.json scripts/build-og-images.ts scripts/check-og-samples-coverage.mjs .githooks/pre-commit
git status --short  # verify 4 file list, no extras
git commit -m "fix(build): P23 — backfill 2 missing og-samples + collect-all-then-throw + CI guard"
```

Commit message body should mention: 2 entries added (coupon-attribution + cart-abandonment), build-og-images.ts now reports ALL missing not just first, new check-og-samples-coverage.mjs + precommit hook, unlocks 5 build-dependent tests.

---

## Task 4: P23-4 — Memory (P22b amend + P23 new) + Dual-push + Verify

**Class:** INTEGRATION (cross-cutting: memory amend + new file + dual-push + amend coordination).

**Files:**
- Modify: `memory/p22b-engine-count-constant-shipped.md` (2 lines amended — line 87 + 91 ish)
- Create: `memory/p23-og-sample-coverage-shipped.md` (~70 lines)
- Modify: `memory/MEMORY.md` (+1 index line)

**Consumes:** Shipped code from Task 3.
**Produces:** Durable memory + verified 3-way sync.

- [ ] **Step 1: Amend P22b memory line 87**

Current line 87:
> "P16-era engine that never got an og-sample"

This is wrong (both P16 marketing engines are missing, not one). Replace with:
> "P16-era engines that never got og-samples (both P16 marketing engines missing — verified by P23 pre-flight grep of 100 tools / 99 samples)."

- [ ] **Step 2: Amend P22b memory line 91 (P23+ candidates section)**

Current:
> "- Investigate `Missing og-sample for solopreneur-coupon-attribution-calculator` (and any other engines missing og samples)"

Replace with:
> "- ~~Investigate `Missing og-sample for solopreneur-coupon-attribution-calculator`~~ — shipped in P23, see [p23-og-sample-coverage-shipped.md](p23-og-sample-coverage-shipped.md)"

- [ ] **Step 3: Write `memory/p23-og-sample-coverage-shipped.md`**

Section headers (use the P22b memory format as template):
- `# P23 OG-Sample Coverage — Shipped`
- Status + Baseline + Scope (3 commits: spec + plan + impl at SHAs to fill at end)
- TL;DR (3-line summary)
- What shipped table (commits + files)
- Root cause (P16 batch漏加 + build cascade diagnosis path)
- Files (the 4 changes with code snippets)
- Verification (test count delta: 1067→1072 / 10→5)
- Lessons (3 items: collect-all-then-throw > fail-fast on first; precommit hook pattern for JSON-data invariants; P22b memory错的 amend 是 in-memory 真理的进程一部分)
- P23b+ candidates (anything discovered as side effect during verification)

- [ ] **Step 4: Append P23 index line to `memory/MEMORY.md`**

Locate last line (P22b index entry added at session commit). Append:

```markdown
- [P23 OG-Sample Coverage shipped](p23-og-sample-coverage-shipped.md) — 2026-07-18 4-file fix; 2 missing og-samples backfilled (coupon-attribution + cart-abandonment, both P16 marketing); build-og-images.ts:149 collect-all-then-throw 升级; new scripts/check-og-samples-coverage.mjs CI guard + precommit hook 接入; 5 build-dependent tests 解锁 (1067→1072 pass / 10→5 fail); P22b memory "only cart-abandonment" 错记 amend; 0\t0 三路 sync
```

(Use P16 memory style: tight 1-line descriptive summary, specifics in body file.)

- [ ] **Step 5: Dual-push**

```bash
cd 'D:/E/独立站/youtube-tools' && git add memory/p22b-engine-count-constant-shipped.md memory/p23-og-sample-coverage-shipped.md memory/MEMORY.md
git commit -m "docs(memory): P23 ship + amend P22b 'both missing' (was 'only cart-abandonment')"
git push origin master 2>&1 | tail -5
git push github master 2>&1 | tail -5
```

- [ ] **Step 6: Verify 3-way sync**

```bash
git fetch origin github 2>&1 | tail -3
git rev-list --left-right --count origin/master...master
git rev-list --left-right --count github/master...master
```
Both expected: `0\t0`.

If divergence > 0, do NOT force-push. Stop and ask.

- [ ] **Step 7: Clean up scratch file**

`scripts/.scratch/find-missing-og.ts` was used for pre-flight discovery. Move it to `scripts/.scratch/2026-07-18-p23-find-missing-og.ts` (rename with date prefix) OR delete if untracked.

Verify with `git status` — if untracked, just delete.

```bash
rm scripts/.scratch/find-missing-og.ts
```

- [ ] **Step 8: Amend P22b spec SHA backfill (if needed)**

The P22b spec at `docs/superpowers/specs/2026-07-18-p22b-engine-count-constant-design.md` references `Basline: 089798c (P22 ship commit)`. If that's still accurate, no amend. Verify:
```bash
grep -n "Baseline" docs/superpowers/specs/2026-07-18-p22b-engine-count-constant-design.md
```

---

## Self-Review

1. **Spec coverage:** §1 Goal = Plan Goal. §2 Files = Task 3 table + Step 3 + Step 5 + Step 7 + Step 9. §3 Error upgrade = Plan Step 5. §4 Guard + hook = Plan Step 7 + 9. §5 Verification = Plan Step 10. §6 Task class = Task 3 + Task 4 markers. §7 Out-of-scope = plan Global Constraints 7/8/9.
2. **Placeholder scan:** No TBD/TODO. Exact JSON entry values provided. Exact build-script edit provided. Exact new script provided.
3. **Type consistency:** Sample interface from spec (§1) matches `build-og-images.ts:45-50` verbatim. Coverage script imports mirror `buildTargets()` + `tools` + `ogSamples` from same module.
4. **Ambiguity check:** "Both P16 marketing engines are missing" stated once at Step 1 verification + Step 1 amend clear. No room for misinterpretation.

**Self-review verdict:** Ready for execution. Awaiting user approval before invoking `superpowers:executing-plans`.
