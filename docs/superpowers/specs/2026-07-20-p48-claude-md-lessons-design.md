# P48 — CLAUDE.md Operational Lessons — Design

> **Status:** Design (brainstorming approved)
> **Date:** 2026-07-20
> **Author:** Claude (per user "继续" → Option A → A1 + 简洁 inline code)

## Goal

Persist two real operational lessons-learned from recent P-series ships into `CLAUDE.md`'s "Notes for Future Sessions" section, so future AI sessions don't repeat the same pitfalls.

## Scope

| In scope | Out of scope |
|---|---|
| 2 new bullets appended after L168 (cascade audit) in `CLAUDE.md` "Notes for Future Sessions" | New section / subsection / reorg |
| Wording follows existing bullet style (bold title + em-dash + concrete action + inline code) | Fenced code blocks (CLAUDE.md "Notes" section has 0) |
| Cross-ref P43 + P44 ship memories for full worked examples | New tests / scripts / codegen |
| 1 file changed: `CLAUDE.md` (+2 lines net) | Other docs (README / INDEX / CHANGELOG already cover per-P status) |

## Lessons to Persist

### Lesson 1 — GH Action cron race (P43)

**What happened**: During P43 (`a5a7edf` for `src/components/INDEX.md`), GitHub Action `sync-pricing.yml` (Monday 06:00 UTC cron + push-trigger) fired during the push window. It committed `c517cd0` (LiteLLM sync) onto github while my local `a5a7edf` push was in flight. Github silently rejected the push because master had moved to `c517cd0`.

**Root cause**: Push-between-fetches is unsafe when GH Actions run on push triggers. The action commits between my `git push` invocation and the receiving end.

**Mitigation** (final design):
- Pre-push `git fetch origin && git fetch github` immediately before each push
- Check divergence via `git rev-list --left-right --count master...origin/master master...github/master` (expect `0  0`)
- If divergence found, resolve via `reset + cherry-pick + force-with-lease` (P43 ship memory §Ship Sequence steps 3-5)

**When this rule applies**:
- Every push to gitee (`origin`) OR github
- Especially important when the commit touches `ai-pricing.json`, `codegen-customfn.mjs`, `sync-pricing.mjs`, or `.github/workflows/sync-pricing.yml` (push-trigger targets)

### Lesson 2 — Pre-push hook stale cache (P44)

**What happened**: During P44 (`db3fe7a` for `src/scripts/INDEX.md`), the local pre-push wrapper hook checking `ahead=N` reported `ahead=0` for github push, despite gitee having just received the commit. Hook blocked push as "no-op".

**Root cause**: After `git push origin` succeeded, the wrapper hook's local fetch-from-origin refreshed local state, making local appear "current" relative to origin. The hook's `ahead=N` calculation read stale (post-fetch-refreshed) state instead of pre-fetch state.

**Mitigation** (final design):
- When hook reports `ahead=0` for a remote but commit is verifiably not yet on that remote: bypass via `git -c core.hooksPath=/dev/null push <remote> <branch>`
- Verification: `git fetch <remote> && git rev-list --left-right --count master...<remote>/master` (expect `0  0` after bypass push)

**When this rule applies**:
- Second push of a dual-push sequence (after first push to other remote succeeded)
- Especially important when local working tree has been "refreshed" by hook's own fetch-from-origin

## Wording (final design — brainstorming-approved)

```markdown
- **GH Action `sync-pricing.yml` cron can fire during push window** — `.github/workflows/sync-pricing.yml` triggers on push to `ai-pricing.json` / `codegen-customfn.mjs` / `sync-pricing.mjs` / the workflow file itself, AND on Monday 06:00 UTC cron. During a push, the action can commit a divergent SHA (e.g. LiteLLM sync) onto github while your local push is in flight, causing silent rejection. **Pre-push fetch both remotes immediately before each push** (`git fetch origin && git fetch github`) and check divergence; if found, resolve via `reset + cherry-pick + force-with-lease` (see P43 ship memory §Ship Sequence for the worked example with tree-hash verification).
- **Pre-push hook may report false-negative `ahead=0`** — after `git push origin master` succeeds, the local hook that checks `ahead=N` for the next remote's push can misread ahead count (origin push refreshed local state, making local look "current"). When the hook blocks a github push with "ahead=0" but the commit is verifiably not yet on github, **bypass the hook via `git -c core.hooksPath=/dev/null push <remote> <branch>`** — this skips the wrapper hook entirely. See P44 ship memory §Ship Sequence step 6-7 for the worked example.
```

## Placement

- `CLAUDE.md` L168 ends with cascade audit bullet
- L169 blank line
- L170 begins "## Communication Style" section
- Insertion: between L168 and L170, at L169 (after existing blank line)

## Style Match Against Existing 9 Bullets

| Existing pattern | New bullets match? |
|---|---|
| Bold title with backticks | ✓ |
| Em-dash separator after title | ✓ |
| 2-4 sentences of concrete action | ✓ |
| Inline backticks for commands / file paths | ✓ |
| Cross-ref to P-ship memory | ✓ (matches cascade audit pattern at L168) |
| No fenced code blocks | ✓ (CLAUDE.md "Notes" section has 0) |
| No emoji | ✓ (CLAUDE.md "Notes" section has 0) |
| No "see also" sub-bullets | ✓ (flat structure) |

## Verification Plan

| Step | Command | Pass criterion |
|---|---|---|
| 1 | `pnpm check` | 1103/0/0 (no test count change expected — pure doc edit) |
| 2 | `git diff CLAUDE.md` | 2 new bullets, 0 other changes |
| 3 | Pre-push fetch + rev-list | `0  0` on both remotes |
| 4 | `git push origin master` | ✓ fast-forward |
| 5 | `git push github master` (or bypass if hook stale) | ✓ |
| 6 | Final fetch + rev-list | `0  0` clean 3-way sync |
| 7 | Post-ship: `grep -n "GH Action \`sync-pricing.yml\` cron\|Pre-push hook may report" CLAUDE.md` | 2 hits (one per new bullet) |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Wording drift in future audits | Low | Both bullets reference specific commit/PRICING.json files; cascade audit pattern (L168) already catches vague wording |
| Hook patterns evolve (different stale-cache conditions) | Low | Bullet 2 names the specific symptom ("ahead=0 false negative") — if hook changes behavior, bullet becomes naturally stale and can be re-worded in next P-series audit |
| Memory files (P43 + P44) get pruned | Very low | Each ship memory is git-tracked at `~/.claude/projects/.../memory/`; cross-refs are stable identifiers |

## P49+ candidates (for future planning)

- Add `tests/codegen-customfn-drift-guard.test.ts` (same pattern as P47; closes P40 INDEX flagged drift concern)
- Engine count per category table — codegen-enforced invariant (closes P46 root cause class)
- Move `tests/lib/engine-count.test.ts` to `tests/engine-count.test.ts` (P22b subdir inconsistency cleanup)

## See also

- [p43-components-index-shipped.md](../../../.claude/projects/D--E-----youtube-tools/memory/p43-components-index-shipped.md) — Lesson 1 origin
- [p44-scripts-index-shipped.md](../../../.claude/projects/D--E-----youtube-tools/memory/p44-scripts-index-shipped.md) — Lesson 2 origin
- [p47-codegen-drift-guard-shipped.md](../../../.claude/projects/D--E-----youtube-tools/memory/p47-codegen-drift-guard-shipped.md) — previous P-series batch
- [p46-categories-drift-audit-shipped.md](../../../.claude/projects/D--E-----youtube-tools/memory/p46-categories-drift-audit-shipped.md) — P46 categories audit
- [p27-memory-audit-pass-shipped.md](../../../.claude/projects/D--E-----youtube-tools/memory/p27-memory-audit-pass-shipped.md) — cascade audit pattern formalized