# Add .gitattributes + Renormalize Line Endings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `.gitattributes` to force LF line endings for all text files and renormalize the working tree, eliminating the autocrlf-induced CRLF/LF pollution that causes `codegen-customfn.mjs --check` to false-positive drift on Windows.

**Architecture:** Single-line `.gitattributes` (`* text=auto eol=lf`) is the project-level fix. `git add --renormalize .` then converts all text files in the working tree to LF and stages them. Two commits: (1) `.gitattributes` alone (bisectable), (2) the renormalized files. No business code change.

**Tech Stack:** Git 2.x attributes, `git add --renormalize`, Node.js fs (no code change), pnpm check.

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `.gitattributes` | Create | Force `* text=auto eol=lf` for all text files |
| All `*.ts`, `*.json`, `*.mjs`, `*.js`, `*.md`, `*.astro`, `*.css`, `*.yml` | Renormalize (LF) | Convert CRLF/LF-mixed → LF in index |
| No business code | — | Out of scope |

---

## Task 1: Add .gitattributes with LF-only eol

**Files:**
- Create: `.gitattributes` (at repo root)

- [ ] **Step 1: Write `.gitattributes`**

Create the file at the repo root with this exact content (1 line, comment optional but discouraged — keep it minimal):

```
* text=auto eol=lf
```

Notes on the directive:
- `text=auto` lets git auto-detect text vs binary per file
- `eol=lf` overrides autocrlf: checkout writes LF to working tree (no CRLF conversion), `git add` writes LF to index
- Single `*` pattern covers everything; no per-extension table needed

- [ ] **Step 2: Verify file written**

Run: `cat .gitattributes`
Expected: `* text=auto eol=lf` (single line, no trailing whitespace)

- [ ] **Step 3: Commit `.gitattributes` alone (bisectable)**

Run:
```bash
git add .gitattributes && git commit -m "chore(git): add .gitattributes forcing LF eol for all text

Without this, Windows + core.autocrlf=true (the default on
Git for Windows installs) silently converts every *.ts file
to CRLF on checkout. This produces a cascade of false
positives:

  - codegen-customfn.mjs --check reports drift because
    fs.readFileSync reads CRLF but the regen template writes
    LF (string compare != without normalization)
  - git status shows M for files whose content is byte-for-byte
    identical to HEAD once line endings are normalized
  - git diff stays empty (auto-normalization hides the diff)
    so the false-positive drift is invisible to humans

Adding the .gitattributes directive is the fix. Renormalize
follows in the next commit."
```

Expected: 1 file changed, 1 insertion(+)

---

## Task 2: Dry-run renormalize scope

**Files:**
- Read-only inspection — no file changes

- [ ] **Step 1: Inspect renormalize scope (dry run)**

Run:
```bash
git diff --stat --renormalize
```

Expected: a list of files that will be normalized, all of which are text files. Note the total count. This is a sanity check — we want to confirm the scope is "all text files in the repo" rather than "one specific file got polluted."

- [ ] **Step 2: Sanity check the scope is plausible**

- If the count is 0: `.gitattributes` from Task 1 didn't take effect. Stop and investigate (likely `core.autocrlf` interaction; see "Troubleshooting" at bottom).
- If the count is 1-3: suspicious. Only specific files were polluted, which is unusual. List the files; they should be ones you've edited in this session.
- If the count is 10+ (expected): this confirms the autocrlf hypothesis. Proceed.

The expected case is "10+ files including all `src/engines/*.ts`." Note: this will likely be every text file in the repo.

---

## Task 3: Apply renormalize + verify

**Files:**
- Modifies (in working tree + index): every text file in the repo
- No source-code edits

- [ ] **Step 1: Apply renormalize**

Run:
```bash
git add --renormalize .
```

Expected: no output. This converts all text files to LF in the working tree and stages them in the index.

- [ ] **Step 2: Verify `git status` now shows clean (or only expected churn)**

Run:
```bash
git status --short | head -20
echo "---"
git status --short | wc -l
```

Expected: a long list of `M ` (modified, unstaged-or-staged) entries for text files, then a final blank line. The `wc -l` count should match Task 2 Step 1.

**Important:** every file showing `M ` here had only line-ending drift (CRLF → LF). Content is unchanged.

- [ ] **Step 3: Verify no false-positive drift in codegen**

Run:
```bash
node scripts/codegen-customfn.mjs --check
```

Expected:
```
[codegen-customfn] Checking customFn data tables from PRICING...
  ✓ openai-token-calculator.ts
  ✓ claude-api-cost-calculator.ts
  ✓ gemini-api-cost-calculator.ts
  ✓ deepseek-api-cost-calculator.ts
  ✓ ai-api-cost-comparison.ts
  ✓ ai-image-generation-cost-calculator.ts
  ✓ gpu-cloud-cost-calculator.ts
  ✓ ai-training-cost-estimator.ts
  ✓ ai-training-cost-estimator.ts

[codegen-customfn] ✓ No drift detected.
```

**This is the key acceptance gate.** Before `.gitattributes`, the openai + ai-api-comparison rows showed "drift detected." After renormalize, all 9 entries should be ✓.

- [ ] **Step 4: Verify customFn parse for all 8 data-driven engines**

Run:
```bash
node tests/scripts/test-customFn.mjs openai-token-calculator claude-api-cost-calculator gemini-api-cost-calculator deepseek-api-cost-calculator ai-api-cost-comparison ai-image-generation-cost-calculator gpu-cloud-cost-calculator ai-training-cost-estimator
```

Expected: 8 lines, all ending with `OK (N chars)`.

- [ ] **Step 5: Verify `pnpm check` passes (typecheck + test gate)**

Run:
```bash
pnpm check
```

Expected: exit 0, no type errors, all tests pass.

- [ ] **Step 6: Verify codegen-examples --check still passes (regression guard for PR #2 work)**

Run:
```bash
node scripts/codegen-examples.mjs --check
```

Expected: exit 0, no drift, "✓ In sync" or similar.

- [ ] **Step 7: Commit renormalize**

Run:
```bash
git add -A && git commit -m "chore(git): renormalize text files to LF

Apply \`git add --renormalize\` after the .gitattributes
addition to convert CRLF/LF-mixed text files to LF in the
index. No business content changed — the diff is entirely
line-ending bytes.

After this commit:
  - git status no longer reports phantom M for text files
    on Windows checkouts
  - codegen-customfn.mjs --check no longer false-positives
    drift on the openai + ai-api-comparison tables
  - All 8 data-driven engines' customFn still parses
  - pnpm check still passes"
```

Expected: N files changed (N matches Task 2 Step 1 count), all changes are line-ending-only.

---

## Task 4: Final post-commit sanity

- [ ] **Step 1: Confirm working tree clean (no CRLF noise)**

Run:
```bash
git status
```

Expected: "nothing to commit, working tree clean"

- [ ] **Step 2: Confirm no .ts file has CRLF in the index**

Run:
```bash
git ls-files | grep -E '\.(ts|tsx|js|mjs|json|astro|css|md|yml)$' | head -5 | xargs -I {} sh -c 'echo "=== {} ==="; git show :{} | head -c 200 | od -c | head -3'
```

Expected: every shown file has no `\r` (CR) bytes in the index. Only `\n` (LF).

- [ ] **Step 3: Final summary report to user**

Report:
- File count renormalized
- codegen --check now reports 0 drift (was 2 false-positive)
- test-customFn: 8/8 OK
- pnpm check: passed
- Working tree clean

---

## Troubleshooting

**`git diff --stat --renormalize` shows 0 files in Task 2 Step 1:**

The `.gitattributes` is being ignored. Check:
- File is at repo root (not in `src/`)
- No `.gitignore` shadowing it
- Run `git check-attr -a -- src/engines/openai-token-calculator.ts` — should show `text: auto` and `eol: lf`
- If both attributes are missing, the file is not being read by git. Verify with `git ls-files --error-unmatch .gitattributes`

**Renormalize scope is suspiciously small (1-3 files):**

This means the line-ending pollution is limited to files you touched recently. That's actually fine — proceed. But also document which files were affected in the commit message for traceability.

**`codegen-customfn.mjs --check` still reports drift after renormalize:**

- This would mean the drift is real, not a line-ending false positive
- Stop and re-investigate. Run `git diff src/engines/openai-token-calculator.ts --ignore-cr-at-eol` to see the real business content diff
- If business content truly differs from PRICING.json, run `node scripts/codegen-customfn.mjs` (no --check) to regenerate, then amend the renormalize commit

**`pnpm check` fails after renormalize:**

- This should not happen for line-ending-only changes
- Investigate the failure. If it's a snapshot/format test that compares literal bytes, the fix is to update the snapshot, not to revert

---

## Out of Scope

- Changing `core.autocrlf` setting (user-local config; not project policy)
- Modifying any engine logic or customFn data
- Touching PRICING.json
- Adding CI enforcement of `.gitattributes` (a future improvement)

## Lessons From This Work

Documented in `docs/superpowers/plans/2026-06-24-audit-polish.md` PR body: "Eight data-driven engines have customFn source that fails `new Function()` parse" was the residual finding of PR #2. That finding became stale within the same day when `ddd23a1` + `a07bea9` fixed the underlying codegen `};` separator bug. This plan addresses the second-order effect of that fix: line-ending noise masked by autocrlf.
