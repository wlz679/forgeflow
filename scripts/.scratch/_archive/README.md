# scripts/.scratch/_archive — Historical Artifacts

**Last verified:** 2026-07-18 (P21-2 pass)
**Provenance:** commit `b8eadba` (P19-2 "archive P18-3 ZH terminology audit + P17b i18n-needed.json — preserve audit trail")
**Convention:** gitignored; preserved for forensic / audit value, NOT for active use.

## Contents

| File | Origin | Status | Reuse rules |
|---|---|---|---|
| `fix-5-corruptions.mjs` | P17b Task 6 one-off repair (handled 5 distinct zh corruption cases) | APPLIED | DO NOT RE-RUN — would corrupt post-repair state |
| `fix-corruptions.mjs` | P17b earlier draft (multi-case repair, superseded) | SUPERSEDED | DO NOT RUN — `fix-5-corruptions.mjs` is the canonical version |
| `fix-nrr.mjs` | P17b NRR-specific corruption repair | APPLIED | DO NOT RE-RUN |
| `i18n-needed.json` (377668 bytes) | P17b missing-translations report (100 engines × per-tool keys) | REFERENCE ONLY | All gaps filled in P17/P17b. Regenerate with `node scripts/extract-i18n-needed.mjs` if a fresh snapshot is needed |
| `zh-terminology-audit.json` + `.log` | P18-3 raw audit run #1 (pre-curation) | HISTORICAL | Re-run `node scripts/audit-zh-terminology.mjs` for fresh audit |
| `zh-terminology-audit-2.json` + `.log` | P18-3 raw audit run #2 (post-curation re-audit) | HISTORICAL | Same as above |
| `zh-terminology-audit-curated.json` | P18-3 21-applied-edit manifest (curated subset) | HISTORICAL | Reference for what was actually changed by `fix-zh-terminology.mjs` |

## Active consumers of _archive/

These scripts read or write files in this directory (verified 2026-07-18 via `grep -rn "_archive" scripts/`):

- `scripts/extract-i18n-needed.mjs` — writes `i18n-needed.json` here (line 213 constant `archiveDir`)
- `scripts/check-i18n-completeness.mjs` — reads `i18n-needed.json` from here (line 149 constant `extractPath`)

The P20-1 work moved both read and write paths to `_archive/` so this README's `i18n-needed.json` row aligns with what `extract-i18n-needed.mjs` produces and `check-i18n-completeness.mjs` consumes.

## When to clean up

**DO NOT delete any file unless ALL 3 conditions hold:**
1. The corresponding work has shipped ≥6 months ago (check `git log --since="6 months ago" -- <file-or-context>` for commit age), AND
2. No active script reads from the file (verify with `grep -rn "archive/.<archive-filename>" scripts/`), AND
3. The provenance commit (`b8eadba`) is reachable from the current branch (`git merge-base --is-ancestor b8eadba HEAD`).

If any condition fails, leave the file intact. The directory is gitignored precisely so it can survive without cluttering the repo, but its forensic value depends on persistence.
