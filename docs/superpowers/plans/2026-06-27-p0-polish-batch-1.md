# Plan 4: P0 Polish Batch 1 — 5 项 reviewer 反馈 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 5 reviewer-flagged polish items in single-batch low-risk commits (JSON-LD `@id` reference + Tailwind breakpoint + EEAT threshold + zh copy + category label i18n) to close P0 content-depth work without scope creep.

**Architecture:** Five independent tasks, each a single-file or two-file change with a 1-line semantic shift. No new abstractions, no new files (except 1 new i18n key in Task 5). All tasks ship on the same `v2_20260626` branch as a sequenced commit chain.

**Tech Stack:** Astro 4.16 static SSG · TypeScript 5.6 strict · Tailwind 4 · node:test (tsx runner) · node 20+

## Global Constraints

- **Branch:** `v2_20260626` (do NOT switch to or merge with `master`)
- **Forbiden files:** `src/engines/` · `src/data/blog-posts.ts` · `src/data/tools/*.ts` · `astro.config.mjs` — any of these in a diff = blocker
- **Quality gate:** `pnpm check` must exit 0 before each commit. Use `SKIP_PRECOMMIT_CHECK=1` only if the codegen check spuriously fires on non-engine changes.
- **Build target:** 153 pages must remain (no page count change)
- **No master merge.** Push to `origin` (gitee/calcKit) + `github` (wlz679/forgeflow) only.
- **Style:** 2-space indent, single quotes, trailing commas, match existing file style.
- **Task classification:** All 5 tasks are `[MECHANICAL]` — each gets 1 spec-compliance reviewer only (no separate code-quality reviewer needed; spec is the source of truth).

---

## File Structure

| File | Operation | Purpose |
|---|---|---|
| `src/pages/[lang]/[slug].astro` | Modify (Task 1) | JSON-LD `author` reference shape (line 118) |
| `src/components/EeatTrustBlock.astro` | Modify (Tasks 2 + 3) | 5 `dt` min-width breakpoint + sources threshold (lines 23, 27, 31, 36, 42, 40) |
| `src/i18n/translations.ts` | Modify (Task 4 + 5) | 1 zh value fix + 1 new `header.category_prefix` key |
| `src/components/Header.astro` | Modify (Task 5) | Dropdown item `Category {c.id}` → translated (line 44) |
| `src/components/CategoryHero.astro` | Modify (Task 5) | Hero `Category {categoryId}` → translated (line 16) |
| `src/components/CategoryOtherNav.astro` | Modify (Task 5) | Cross-link `Category {c.id}` → translated (line 20) |

**No new files. No new components. No new lib. 5 commits, 6 files touched, ~+10/-8 lines total.**

---

## Task 1: JSON-LD `author` → `@id` reference

**Files:**
- Modify: `src/pages/[lang]/[slug].astro:118`

- [ ] **Step 1.1: Verify current line**

Run: `sed -n '118p' src/pages/\[lang\]/\[slug\].astro`
Expected: `      author: { '@type': 'Organization', name: toolMeta.author, url: 'https://forgeflowkit.com/' },`

- [ ] **Step 1.2: Apply the 1-line edit**

Replace line 118 with:

```ts
      author: { '@id': 'https://forgeflowkit.com/#org' },
```

This matches the `@id` used on lines 117 (`provider`) and 121 (`publisher`) and on the Organization node defined elsewhere in the `@graph`. Effect: Google's parser sees one canonical `Organization` entity instead of three (previously `author` had no `@id` so it was implicitly a separate node from `provider`/`publisher`).

- [ ] **Step 1.3: tsc verify**

Run: `pnpm exec tsc --noEmit 2>&1 | head -5`
Expected: 0 errors (no type change — `author` shape becomes `{ '@id': string }` which is still a valid JSON object).

- [ ] **Step 1.4: Build spot-check**

Run: `pnpm build 2>&1 | tail -3`
Expected: `Complete! 153 pages generated.`

Run: `grep -c '"@id":"https://forgeflowkit.com/#org"' dist/en/solopreneur-mrr-calculator/index.html`
Expected: `3` (one each for provider, author, publisher — was 2 before this task).

- [ ] **Step 1.5: Run seo-schemas test to confirm 32 tool pages still valid**

Run: `node --import tsx tests/seo-schemas.test.ts 2>&1 | tail -10`
Expected: `# pass 4 / fail 0` (the existing 4 tests should still pass; the 2 Plan 1 tests verify author/dateModified/reviewedBy, the new task only changes author's shape, not its presence).

- [ ] **Step 1.6: Commit**

```bash
git add src/pages/\[lang\]/\[slug].astro
git commit -m "fix(seo): JSON-LD author uses @id reference (canonical Organization node)"
```

---

## Task 2: `min-w-[110px]` → `sm:min-w-[110px]` on 5 EeatTrustBlock `<dt>` elements

**Files:**
- Modify: `src/components/EeatTrustBlock.astro:23, 27, 31, 36, 42`

- [ ] **Step 2.1: Verify all 5 occurrences are in the same file**

Run: `grep -nE "min-w-\[110px\]" src/components/EeatTrustBlock.astro`
Expected: 5 matches at lines 23, 27, 31, 36, 42.

- [ ] **Step 2.2: Apply 5 in-place edits (use replace_all with care)**

The string `font-semibold min-w-[110px]` appears 5 times. Use Edit with `replace_all: true`:

```
old_string: font-semibold min-w-[110px]
new_string: font-semibold sm:min-w-[110px]
```

This is a global in-file substitution. Verify by re-running Step 2.1: now `grep -nE "min-w-\[110px\]" src/components/EeatTrustBlock.astro` should return **0 matches**, and `grep -nE "sm:min-w-\[110px\]" src/components/EeatTrustBlock.astro` should return **5 matches**.

- [ ] **Step 2.3: tsc verify**

Run: `pnpm exec tsc --noEmit 2>&1 | head -5`
Expected: 0 errors (Tailwind class change, no TS impact).

- [ ] **Step 2.4: Build spot-check**

Run: `pnpm build 2>&1 | tail -3`
Expected: 153 pages.

Run: `grep -c "sm:min-w-\[110px\]" dist/en/solopreneur-mrr-calculator/index.html`
Expected: `5` (one per `<dt>` element).

- [ ] **Step 2.5: Commit**

```bash
git add src/components/EeatTrustBlock.astro
git commit -m "fix(ui): sm: breakpoint on EeatTrustBlock dt min-width (mobile overflow)"
```

---

## Task 3: `EeatTrustBlock` sources threshold `> 0` → `>= 3`

**Files:**
- Modify: `src/components/EeatTrustBlock.astro:40`

- [ ] **Step 3.1: Verify current condition**

Run: `sed -n '40p' src/components/EeatTrustBlock.astro`
Expected: `    {sources.length > 0 && (`

- [ ] **Step 3.2: Apply the 1-line edit**

Replace line 40 with:

```astro
    {sources.length >= 3 && (
```

**Rationale:** EEAT signals are stronger when a page cites 3+ sources (Google's quality rater guidelines treat 3+ as "established authority"). Below 3, the `<dt>Data sources</dt>` line is suppressed — better to hide it than to display a weak signal.

- [ ] **Step 3.3: Check tool data — how many tools have 3+ sources already**

Run: `grep -cE "^\s*sources:" src/data/tools/*.ts | sort -t: -k2 -n -r | head -10`
Expected: most tools have 3+ sources (Plan 1 EEAT fill was thorough). If a few tools have <3, they will silently lose their "Data sources" line — that's intentional. If **> 5 tools have <3 sources**, **stop and report to user** — the threshold is too aggressive and may need adjustment.

- [ ] **Step 3.4: tsc + build verify**

Run: `pnpm exec tsc --noEmit 2>&1 | head -5 && pnpm build 2>&1 | tail -3`
Expected: tsc 0 errors, build 153 pages.

- [ ] **Step 3.5: Spot-check a tool with 3+ sources still shows the sources line**

Pick a tool you know has 3+ sources (e.g. `solopreneur-mrr-calculator`). Run:
```bash
grep -c "Data sources" dist/en/solopreneur-mrr-calculator/index.html
```
Expected: `>= 1` (the `<dt>Data sources</dt>` line is in the rendered HTML).

- [ ] **Step 3.6: Commit**

```bash
git add src/components/EeatTrustBlock.astro
git commit -m "fix(eeat): show Data sources only when 3+ sources (stronger authority signal)"
```

---

## Task 4: `eeat.last_reviewed` zh 值 "最后审核" → "最近审核"

**Files:**
- Modify: `src/i18n/translations.ts:65`

- [ ] **Step 4.1: Verify current zh value**

Run: `grep -n "'eeat\.last_reviewed':" src/i18n/translations.ts`
Expected: line 65 with `zh: '最后审核'`.

- [ ] **Step 4.2: Apply the 1-line edit**

Replace the zh value on line 65 from `'最后审核'` to `'最近审核'`. The en value `'Last reviewed'` is correct, leave it.

**Rationale:** "最后" in Chinese literally means "the last/final", which connotes "no more updates planned". "最近" means "most recent", which is more accurate — pages are reviewed periodically and the date shown is the most recent review.

- [ ] **Step 4.3: tsc + build verify**

Run: `pnpm exec tsc --noEmit 2>&1 | head -5 && pnpm build 2>&1 | tail -3`
Expected: tsc 0, build 153 pages.

- [ ] **Step 4.4: Spot-check zh output**

Run: `grep -c "最近审核" dist/zh/solopreneur-mrr-calculator/index.html`
Expected: `>= 1` (the new value renders).

Run: `grep -c "最后审核" dist/zh/solopreneur-mrr-calculator/index.html`
Expected: `0` (old value gone).

- [ ] **Step 4.5: Commit**

```bash
git add src/i18n/translations.ts
git commit -m "fix(i18n): eeat.last_reviewed zh '最后审核' → '最近审核' (more accurate)"
```

---

## Task 5: `Category ${id}` label → `header.category_prefix` i18n key (3 files)

**Files:**
- Modify: `src/i18n/translations.ts` (add 1 new key, 2 lang entries)
- Modify: `src/components/Header.astro:44`
- Modify: `src/components/CategoryHero.astro:16`
- Modify: `src/components/CategoryOtherNav.astro:20`

- [ ] **Step 5.1: Add new i18n key to translations.ts**

Open `src/i18n/translations.ts`. Find the existing `header.categories` key. **Insert** the new key directly **after** it (or in the most sensible alphabetical position for `header.*` keys — your call, just be consistent):

```ts
  'header.category_prefix': { en: 'Category', zh: '分类' },
```

Verify by running: `grep -nE "'header\.(categories|category_prefix)':" src/i18n/translations.ts`
Expected: 2 matches.

- [ ] **Step 5.2: Edit Header.astro line 44**

Current: `                <div class="text-xs font-semibold text-[#7C3AED]">Category {c.id}</div>`

Replace with: `                <div class="text-xs font-semibold text-[#7C3AED]">{t('header.category_prefix', lang)} {c.id}</div>`

- [ ] **Step 5.3: Edit CategoryHero.astro line 16**

Current: `  <div class="text-xs font-semibold text-[#7C3AED] mb-2">Category {categoryId}</div>`

Replace with: `  <div class="text-xs font-semibold text-[#7C3AED] mb-2">{t('header.category_prefix', lang)} {categoryId}</div>`

- [ ] **Step 5.4: Edit CategoryOtherNav.astro line 20**

Current: `        <div class="text-xs font-semibold text-[#7C3AED] mb-1">Category {c.id}</div>`

Replace with: `        <div class="text-xs font-semibold text-[#7C3AED] mb-1">{t('header.category_prefix', lang)} {c.id}</div>`

- [ ] **Step 5.5: tsc + build + i18n completeness check**

Run:
```bash
pnpm exec tsc --noEmit 2>&1 | head -5
pnpm build 2>&1 | tail -3
node scripts/check-i18n-completeness.mjs
```
Expected: tsc 0, build 153 pages, check-i18n exits 0 (or shows the new key in its count — if check-i18n doesn't include the new `header.category_prefix` in its REQUIRED_KEYS, that's fine, the script only validates presence, not specific keys).

- [ ] **Step 5.6: Spot-check en + zh category pages**

Run:
```bash
grep -c "Category A" dist/en/saas-metrics/index.html
grep -c "分类 A" dist/zh/saas-metrics/index.html
grep -c "Category A" dist/en/solopreneur-mrr-calculator/index.html
```
Expected: en pages show "Category A" (3+ matches in dropdown, hero, other-nav), zh pages show "分类 A" (3+ matches).

- [ ] **Step 5.7: Commit**

```bash
git add src/i18n/translations.ts src/components/Header.astro src/components/CategoryHero.astro src/components/CategoryOtherNav.astro
git commit -m "fix(i18n): 'Category ${id}' label → header.category_prefix (zh 分类)"
```

---

## Final Acceptance Checklist

- [ ] All 5 commits on `v2_20260626` branch
- [ ] `pnpm check` exit 0 after all 5 tasks
- [ ] `pnpm build` 153 pages (no regression)
- [ ] `tests/seo-schemas.test.ts` 4/4 pass
- [ ] `tests/classify-url.test.ts` 12/12 pass
- [ ] No diff in `src/engines/`, `src/data/blog-posts.ts`, `src/data/tools/`, `astro.config.mjs`
- [ ] All 3 places "Category ${id}" hardcoded text replaced (Header:44, CategoryHero:16, CategoryOtherNav:20)
- [ ] zh pages show "分类 A/B/..." not "Category A/B/..."
- [ ] Pushed to `origin` (gitee/calcKit) and `github` (wlz679/forgeflow)
- [ ] `master` branch NOT touched

## Rollback

```bash
git revert <plan4-first-sha>..<plan4-last-sha>  # 5 commits
```

Restores:
- `author` JSON-LD back to `{name, url}` shape
- `dt` back to `min-w-[110px]` (no sm: prefix)
- sources threshold back to `> 0`
- zh value back to "最后审核"
- "Category" hardcoded text restored in 3 files, `header.category_prefix` key removed

## Notes for Implementer

- **All 5 tasks are independent** — order doesn't matter for correctness. The plan lists them in spec review order (Task 1 = most critical, Task 5 = largest scope). If you want to ship smallest-first for review cadence, Tasks 4 and 1 are the cheapest (1-line edits).
- **Task 2 uses `replace_all: true`** — verify before/after grep counts to confirm the substitution was clean (5 before, 0 after for the old pattern; 0 before, 5 after for the new).
- **Task 3 has a "stop and report" condition** — if > 5 tools have <3 sources, that's data feedback to the user, not a code bug.
- **Task 5 is the only multi-file task** — bundle all 4 files (translations.ts + 3 components) in one commit.
- **No new tests required** — the existing 4 seo-schemas tests + 12 classify-url tests still pass after these changes. The changes are visual / copy-level, not schema-structure-level.
- **Bundle 5 commits into 1 PR** for the user to review as a unit.
- **Don't push to master** — only to `v2_20260626` on both remotes, per user explicit constraint.
