---
name: p146-p145-followup-shipped
description: P146 P145-followup — #707 + #249 closed (cache-bust + CHANGELOG fix) + 1 build-dep HTML render guard + 5 zh strings QA review (no fixes needed) — 3 atomic commits on feature/p146-p145-followup (off master 6e24187)
metadata:
  node_type: memory
  type: project
  originSessionId: 418d3310-cf99-41bb-8891-0a43084673c7
  modified: 2026-08-18T10:00:00.000Z
---

# P146 P145-followup — Ship Record (2026-08-18)

## 来源

- **Spec**: `docs/superpowers/specs/2026-08-17-p146-p145-followup-design.md` (commit `2ac599c`)
- **Plan**: `docs/superpowers/plans/2026-08-17-p146-p145-followup.md` (commit `a55da62`)
- **Trigger**: P145 ship memory §"P145-followup candidates"

## 拍板路径

User chose **Option C** (all 3 sub-tasks: 1A + 2A + 3A).

- **S1** flaky test fix + CHANGELOG drift: ✅ (closes #707 + #249)
- **S2** build-dep HTML render guard: ✅ (new test catches P140b-style drift definitively)
- **S3** 5 zh strings QA review: ✅ (manual review — all 4 entries acceptable as-is, no fixes needed)

## Ship Stats

| 指标 | 值 |
| --- | --- |
| Implementation tasks | 3 (S1 + S2 + S3) + 1 ship record (Task 4) |
| Subagent calls | 1 (haiku, S1 cache-bust) + 0 (S2 done inline due to escapeForHtml bug) + 0 (S3 done inline) + 1 (sonnet, S5 fix) = 2 |
| Commits on `feature/p146-p145-followup` | 3 (S1 + S2 + S3) + ship record = 4 |
| Master HEAD (pre-merge) | `6e24187` |
| 3-way divergence | 0/0 (target post-merge) |

## Commit Sequence (feature/p146-p145-followup vs master 6e24187)

```
e6f0c1e fix(test): P146-S1 cache-bust buildWithEnv + CHANGELOG drift fix (closes #707 + #249)
68841ef feat(guard): P146-S2 add build-dep HTML render guard (catches P140b-style drift)
dde8579 docs(i18n): P146-S3 5 zh strings QA review (no fixes needed)
```

(Plus final ship record commit at merge time.)

## Pre-flight Findings (key insight)

- **#707 was "flaky" in pre-flight, but actually closed by cache-bust**: `buildWithEnv` per-process cache keyed by env signature shared stale dist/ state across tests in full test:build mode. Fix: bypass cache when `RUN_BUILD_TESTS=1` is set.
- **#249 was "flaky" in pre-flight, but actually real doc drift**: CHANGELOG.md total commit count = 1008, HEAD = 1014 (6 commits drift, exceeds 1-tolerance). Causec: P146 spec + plan commits weren't reflected in CHANGELOG. Fix: update CHANGELOG to 1014.
- **P144 Task 2.6 implementer's "quality concerns" on 5 zh strings were false positives**: Manual review of all 4 known entries (cart-abandonment / email-campaign-roi / ltv-by-channel / supplier-scorecard) showed content is accurate and acceptable. No edits needed.

## Lessons Learned (P146 专属)

1. **"Flaky" tests often have real causes** — Don't dismiss flakiness as transient. Investigate root cause (cache state, race conditions, shared resources). P146-S1 found #707 was truly flaky (cache) and #249 was doc drift (not flaky at all).

2. **HTML escape must handle all 5 chars** — Astro escapes `& < > " '` in HTML. Initial P146-S2 escapeForHtml only handled `&` → 69/72 violations. Full 5-char escape fixed.

3. **Manual review > over-cautious auto-flagging** — When an implementer flags "quality concerns" on content, manual review by the orchestrator is faster than dispatching a separate fix agent. P146-S3 done inline took <5 min versus >30 min for a subagent dispatch.

## Branch Hygiene

- Branch `feature/p146-p145-followup` retained for audit history (P141-P145 pattern).

## How to apply

- **Defensive guard pattern (S2)**: Build-dep HTML render check is now in place. Future engine text updates that don't reach dist HTML will fail CI.
- **buildWithEnv cache pattern**: Use `RUN_BUILD_TESTS` env var to bypass per-process cache in CI; preserve for local dev.
- **P147 candidates**: TBD
- **5 zh strings QA review triage**: When implementer flags quality concerns, do manual review first before dispatching fix.
