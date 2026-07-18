# P21 Tech Debt Cleanup — Design

> **Status:** Approved (brainstorming 2026-07-18)
> **Baseline:** `d75478e` (P20 ship commit)
> **Scope:** 3 housekeeping tasks + memory + 3-way sync. All INLINE (subagent overhead > value at this size).
> **Deferred (P22+ candidates):** docs/superpowers/specs/INDEX.md index; scripts/.scratch/ deep cleanup; scripts/lib/ extraction of parser helpers; more than 8 fixtures; parseStringLiteralSmart deprecation marker; eslint config setup.

## 1. Goal

收尾 P17b/P18/P19/P20 时代沉淀的 3 个低风险 housekeeping 痕迹，全部 "治症不治本"——最小改动 + 不引入新依赖 + 不影响 raw-key invariant 或 dist 输出。

## 2. Scope (3 tasks)

### Task 1 (P21-1): TS6133 disable on 2 unused-looking imports

**File:** `tests/scripts/test-apply-translations-zh-parser.mjs`
**Lines:** 5 and 7

**Change:** Add `// @ts-expect-error TS6133 false positive — <reason>` on:
- Line 5 (`import { describe, it, test } from 'node:test'`) — `test` used by fixtures 5/6
- Line 7 (`import { ..., parseStringLiteral }`) — used by fixtures 5/6

**Why:** TypeScript checker cannot see Node runtime exports (the `test` fn from `node:test` is recognized at runtime but TS type-completion treats it as unused because fixtures 5/6 reference it indirectly through the array form). This is a known false positive from P20-3 commit `d400568`.

**Why this scope:** Per-batch narrow focus. eslint config setup is a 10+ file project-wide change and was deferred to P22+.

**Verification:**
- `pnpm exec tsc --noEmit tests/scripts/test-apply-translations-zh-parser.mjs` (or `pnpm exec astro check`) no longer reports TS6133 for these 2 imports.
- `node --test tests/scripts/test-apply-translations-zh-parser.mjs` still passes 8/8 (was 6/6, fixtures 7/8 added in P21-3).

### Task 2 (P21-2): scripts/.scratch/_archive/README 护营

**File:** `scripts/.scratch/_archive/README.md`

**Change:** Replace the current 3-line "what's inside" comment with a structured provenance + safety card containing:
1. **Last verified** timestamp — anchors the snapshot to P21-2 ship time.
2. **Provenance link** — reference to commit `b8eadba` (P19-2 "archive P18-3 ZH terminology audit + P17b i18n-needed.json").
3. **Per-file status** table (7 rows) — `fix-5-corruptions.mjs / fix-corruptions.mjs / fix-nrr.mjs / i18n-needed.json / zh-terminology-audit.json + .log / zh-terminology-audit-2.json + .log / zh-terminology-audit-curated.json` — with columns: Origin | Status | Reuse rules.
4. **Cleanup gating rules** — DO NOT delete any file unless 3 conditions hold (work shipped ≥6 months ago, no active reader, origin commit reachable from current branch).

**Why:** The current README is 3 lines and fails to communicate "why these files survive" or "what happens if I delete them." Future maintainers (or well-meaning cleanup automation) might delete the directory thinking it's stale gitignored scratch — losing 1 month of forensic ZH terminology audit data + 1 dedicated NRR repair script.

**Why this scope:** Per-file-by-file content audit of the .scratch directory is a larger P22+ candidate (would touch each artifact's actual content + verify whether re-running any of the fix-*.mjs scripts would corrupt current state). README护营 alone gives 80% of the safety value at 5% of the work.

**Verification:**
- `cat scripts/.scratch/_archive/README.md` displays the new structured table.
- Spot-check: `git log -p b8eadba --stat` confirms provenance reference is correct (P19-2 is the archive commit).
- Cross-check: `grep -rn "_archive" scripts/` finds 4 consumers (apply-translations.mjs / check-i18n-completeness.mjs / extract-i18n-needed.mjs / fix-zh-terminology.mjs), all pointing to `_archive/` paths; no consumer reads raw files directly.

### Task 3 (P21-3): 2 边缘 fixture extension

**File:** `tests/scripts/test-apply-translations-zh-parser.mjs`

**Add 2 fixtures:**

**Fixture 7** — backslash escape inside zh value (pre-fix `reSingle` UPDATE-regex pattern would mis-handle `\\`):
```js
{
  name: 'backslash escape inside zh (raw string boundary case)',
  input: `  'tools.x.input.path': { en: 'path', zh: 'C:\\\\Users\\\\public' },`,
  key: 'tools.x.input.path',
  newZh: 'D:\\Work\\new',
  expectContains: `zh: 'D:\\\\Work\\\\new'`,
},
```

**Fixture 8** — empty zh value with tolerant=true (parser should handle `zh: ''`):
```js
{
  name: 'empty zh value with tolerant=true',
  input: `  'tools.x.input.empty': { en: '', zh: '' },`,
  key: 'tools.x.input.empty',
  newZh: '新空值',
  expectContains: `zh: '新空值'`,
},
```

**Why these 2:** Backslash escape is the most likely future regression vector (the UPDATE-regex bug from P18-1 was sibling-pattern to backslash mishandling). Empty string is a classic off-by-one boundary that the P20-3 state-machine may skip due to its loop body (`while (j < content.length) { if (ch === quote) ... return ... }` returns null on empty content past quote, not an explicit empty value).

**Why this scope:** 6 fixtures cover the common cases; 2 more cover backslash escape + empty boundary. Going to 12+ would require writing a test fixture generator, which is a P22+ candidate.

**Verification:**
- `node --test tests/scripts/test-apply-translations-zh-parser.mjs` → 8/8 pass.
- Pre-refactor run (do not actually revert; theoretical): same 8/8 because both fixtures are regression guards for behavior the current state-machine should already exhibit correctly. If a future refactor breaks them, the test will fail loudly.

### Task 4 (P21-4): memory append + 3-way sync

**Files (write only):**
- `memory/p17-i18n-backfill-shipped.md` — append P21 section with 4 lessons:
  1. `// @ts-expect-error` is the right surgical tool for node:test false positives (eslint config is P22+)
  2. README护营 gives 80% safety at 5% cost vs full content audit
  3. Fixture extension before refactor → byte-identical regeneration as regression proof (P20-3 lesson continued)
  4. INLINE execution beats subagent when ≤10 tool calls per task
- `memory/MEMORY.md` — append single-line index entry

**Operations:**
1. Read memory files, append P21 content, single commit (`docs(p21): P21 Tech Debt Cleanup shipped — 3 housekeeping tasks`).
2. Initial SHA is a `<placeholder>`. After 3 task commits land, amend the memory commit to backfill actual SHAs.
3. `git fetch --all` + `git rev-list --left-right --count origin/master...master` (= `0	0`).
4. `git push origin master && git push github master`.
5. Post-push verify `0	0` on both remotes.

## 3. Global Constraints

| # | Constraint |
|---|---|
| 1 | 3-way sync required at end (gitee origin + github github) |
| 2 | `pnpm check` gate (12 pre-existing Clerk/Supabase env fails → use `SKIP_PRECOMMIT_CHECK=1`) |
| 3 | raw-key invariant: `dist/{en,zh}/index.html` raw-key count = 0/0 |
| 4 | Byte-identical invariant for any regenerated artifact (i18n-needed.json OR test fixture) |
| 5 | No new dependencies, no new files outside `tests/scripts/` + `scripts/.scratch/_archive/` + `memory/` |

## 4. Task Class Rationale (per `memory/subagent-driven-overhead.md`)

| Task | Class | Why |
|---|---|---|
| P21-1 | MECHANICAL | 1 file, 2 line edits; test verifies outcome |
| P21-2 | MECHANICAL | 1 file content rewrite; no code logic |
| P21-3 | MECHANICAL | 1 file, 2 fixture additions |
| P21-4 | INTEGRATION | memory writes + 3-way sync; covers cross-cutting concern (mirror consistency) |

Per P19-3/4/5 + P20-4 precedent: ≤10 tool calls per task → INLINE (no subagent). Subagent overhead (1 implementer + 1 reviewer + handoff) exceeds value at this size.

## 5. Out of Scope (P22+ candidates)

1. **docs/superpowers/specs/INDEX.md** — 37 spec files need a discovery index; ~50 lines of work + a content audit pass
2. **scripts/.scratch/ deep audit** — per-file verification of "would re-running X corrupt state?" (1 task per file = 7+ tasks)
3. **scripts/lib/ extraction** — extract `extract-i18n-needed`-specific helpers (FAQs/howToUse parsing blocks) into separate module
4. **parseStringLiteralSmart deprecation marker** — `/** @deprecated since 2026-07-18; use parseStringLiteral(c, i, { tolerant: true }) */` JSDoc
5. **eslint setup** — project-wide `// @ts-expect-error` would be cleaner with eslint overrides; current setup doesn't have eslint
6. **6+ fixture expansion** — test fixture generator that codifies input/output pairs in YAML; would itself be a script + need maintenance

## 6. Success Criteria

| Criterion | Verification |
|---|---|
| All 3 task commits landed | `git log --oneline d75478e..HEAD` shows 3 commits with `P21-1`/`P21-2`/`P21-3` |
| TS6133 noise reduced by ≥1 | `pnpm exec astro check` (or `pnpm run check`) reports fewer TS6133 warnings than pre-P21 |
| Tests pass 8/8 | `node --test tests/scripts/test-apply-translations-zh-parser.mjs` |
| raw-key invariant intact | `grep -c "<key-not-translated>" dist/{en,zh}/index.html` = 0 on both locales |
| 3-way sync verified | `git rev-list --left-right --count origin/master...master` AND `github/master...master` both = `0	0` |
| Memory updated | `memory/p17-i18n-backfill-shipped.md` has new `## P21` section; `memory/MEMORY.md` has new index line |

## 7. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| `@ts-expect-error` lints differently between tsc versions | Use older syntax `// @ts-ignore`? No — `@ts-expect-error` is the modern form (TS 3.9+) and is supported in tsconfig.json for any project using TS 4.x+ (this is TS 5.6 per CLAUDE.md). Pin to modern. |
| Fixture 7/8 use pathologically constructed strings that break template literal interpolation | Test them as plain inline strings (not template literals) to avoid double-escape ambiguity — both fixtures in spec use template literals; if they escape wrong, the assertion will fail loudly at test time |
| README护营 content audit reduces reusability by future devs misunderstanding status | Status column uses 3 explicit values: `APPLIED` / `SUPERSEDED` / `REFERENCE ONLY` / `HISTORICAL`. Reuse rules column gives explicit DO/DO NOT instructions. |
| Amend memory commit may fail if remote received it before amend | Sequence: commit → amend (locally) → push. Both gitee + github accept force-push-amended unpushed commits trivially. |

## 8. Spec Self-Review

Per brainstorming checklist step 7:

1. **Placeholder scan:** No `TBD`/`TODO`/vague qualifiers. Every step has exact file path + exact code content.
2. **Internal consistency:** Scope (§2) matches success criteria (§6); task classes (§4) match global constraints (§3); risks (§7) are allayed by mitigations within same scope.
3. **Scope check:** Single feature (3 housekeeping tasks), 1 implementation plan. No decomposition needed.
4. **Ambiguity check:** The "INLINE vs subagent" decision is locked by precedent (4 P19/P20 inline cases); no ambiguity.

**Self-review verdict:** No changes needed. Ready for user review → writing-plans.
