# P62 Category Page i18n Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate Chinese ("中文乱入") leakage in English category page titles (`Operations / 库存运营`, `Sales / 销售管理`, `Knowledge / 知识库`) by making all 15 category pages route through the i18n translation table, with `categories.ts` source data holding pure English.

**Architecture:** Single source of truth becomes the i18n table (`category.X.name` en/zh). `categories.ts` keeps structural fields only — `name` becomes pure English (matches the 12 already-clean categories). All 15 category pages use `t()` lookup. Drift guards via tests at tests/ root (P22b pattern).

**Tech Stack:** Astro 4.13.2 / TypeScript 5.6 strict / node:test + vitest / pnpm 9

## File Structure

| File | Responsibility |
|---|---|
| `src/data/categories.ts` | Structural category metadata (id, slug, description, name=English only) |
| `src/i18n/translations.ts` | Per-locale strings keyed `category.X.name` / `category.X.desc` |
| `src/i18n/index.ts` | `t()` lookup helper used by all pages (already exists) |
| `src/pages/[lang]/*.astro` (×15) | Category landing pages, all using `t()` for category name |
| `tests/category-i18n-purity.test.ts` (NEW) | Drift guard: no CJK in source data or en-field |

## Global Constraints

- 100 engines must remain locked at `EXPECTED_ENGINE_COUNT` (tests/lib/engine-count.ts)
- i18n en + zh pair required for every category name (no half-states)
- All changes must pass `pnpm check` (typecheck + test:run) — currently 1163 pass / 0 fail
- Pre-commit hook auto-runs `codegen-examples.mjs --check`; bypass only via `SKIP_PRECOMMIT_CHECK=1`
- No regression in any existing test
- Per CALUDE.md trigger rule: pure mechanical changes (no schema/cross-cutting coupling), each task classified `[MECHANICAL]` → 1 implementer + 1 spec verify, no quality reviewer

## Bug Reproduction (verified)

`pnpm exec astro build` produces `dist/en/operations-inventory/index.html` containing:
```
<h1 class="text-3xl font-bold text-gray-900 mb-3">Operations / 库存运营</h1>
```
Same pattern for `dist/en/sales/index.html` and `dist/en/knowledge/index.html`.

## Tasks

### Task 1: Fix source data — categories.ts (O/S/K name fields)

**Files:**
- Modify: `src/data/categories.ts:16,17,22`
- Create: `tests/category-i18n-purity.test.ts`

**Step 1: Write the failing test**

Create `tests/category-i18n-purity.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { categories } from "../src/data/categories";

// imports the i18n translations object; check existing exports:
// `grep -n "^export" src/i18n/translations.ts | head -20`
// If no direct export of `translations`, follow the existing page import path:
//   `import { t } from "../src/i18n"` and call `t('category.X.name', 'en')`.
import * as i18n from "../src/i18n";

const CJK = /[一-鿿㐀-䶿＀-￯]/;

describe("category i18n purity", () => {
  it("categories.ts: every .name has no CJK characters (English source purity)", () => {
    for (const c of categories) {
      expect(c.name, `${c.id} category name has CJK: ${c.name}`).not.toMatch(CJK);
    }
  });

  it("translations.ts: category.{O,S,K}.name en field has no CJK", () => {
    // assumes `translations` is exported from src/i18n/translations.ts;
    // if not, substitute `i18n.t('category.X.name', 'en')` and assert on its return value.
    const tr = (i18n as any).translations ?? null;
    if (tr) {
      expect(tr["category.O.name"].en).not.toMatch(CJK);
      expect(tr["category.S.name"].en).not.toMatch(CJK);
      expect(tr["category.K.name"].en).not.toMatch(CJK);
    } else {
      // fallback: call t() and assert
      expect(i18n.t("category.O.name", "en")).not.toMatch(CJK);
      expect(i18n.t("category.S.name", "en")).not.toMatch(CJK);
      expect(i18n.t("category.K.name", "en")).not.toMatch(CJK);
    }
  });
});
```

**Step 2: Run test, expect FAIL**

```bash
pnpm exec vitest run tests/category-i18n-purity.test.ts
```

Expected: FAIL with 3+ assertion errors pointing at O/S/K names containing CJK.

**Step 3: Edit categories.ts**

In `src/data/categories.ts`:
- L16: `name: 'Operations / 库存运营'` → `name: 'Operations'`
- L17: `name: 'Sales / 销售管理'` → `name: 'Sales'`
- L22: `name: 'Knowledge / 知识库'` → `name: 'Knowledge'`

**Step 4: Run test, expect 1 assertion still FAILING** (the 2nd test for translations.ts en fields)

The first test (categories.ts purity) should now pass. The second test (translations.ts en-field purity) should still fail because Task 2 hasn't run yet.

**Step 5: Commit**

```bash
git add src/data/categories.ts tests/category-i18n-purity.test.ts
git commit -m "fix(categories): O/S/K name fields to pure English (closes source-side CJK leak)"
```

---

### Task 2: Fix i18n translations table — category.{O,S,K}.name en fields

**Files:**
- Modify: `src/i18n/translations.ts:232,234,244`

**Step 1: Verify test currently fails on translations.ts side**

```bash
pnpm exec vitest run tests/category-i18n-purity.test.ts
```

Expected: only the 2nd `it()` block fails (categories.ts side already passes from Task 1).

**Step 2: Edit translations.ts**

In `src/i18n/translations.ts`:
- L232: `'category.O.name': { en: 'Operations / 库存运营', zh: '运营 / 库存运营' }` → `'category.O.name': { en: 'Operations', zh: '运营 / 库存运营' }`
- L234: `'category.S.name': { en: 'Sales / 销售管理', zh: '销售管理' }` → `'category.S.name': { en: 'Sales', zh: '销售管理' }`
- L244: `'category.K.name': { en: 'Knowledge / 知识库', zh: '知识库' }` → `'category.K.name': { en: 'Knowledge', zh: '知识库' }`

zh fields keep their current Chinese values (they are already valid Chinese).

**Step 3: Run test, expect PASS**

```bash
pnpm exec vitest run tests/category-i18n-purity.test.ts
```

Expected: PASS for both assertions.

**Step 4: Commit**

```bash
git add src/i18n/translations.ts
git commit -m "fix(i18n): category.{O,S,K}.name en fields to pure English (closes translation-side CJK leak)"
```

---

### Task 3: Migrate 9 path-B pages to path-A t() pattern

**Files:** (9 modifies, all `[MECHANICAL]` — same shape)
- Modify: `src/pages/[lang]/customer-support.astro:23-25`
- Modify: `src/pages/[lang]/hiring-team.astro:23-25`
- Modify: `src/pages/[lang]/knowledge.astro:23-25`
- Modify: `src/pages/[lang]/operations-inventory.astro:23-25`
- Modify: `src/pages/[lang]/marketing-analytics.astro:23-25`
- Modify: `src/pages/[lang]/legal-compliance.astro:23-25`
- Modify: `src/pages/[lang]/product-analytics.astro:23-25`
- Modify: `src/pages/[lang]/sales.astro:23-25`
- Modify: `src/pages/[lang]/retention.astro:23-25`

**Step 1: Read path-A reference**

Read `src/pages/[lang]/valuation-exit.astro:14,24,27-28` to confirm the import + pattern:
```ts
import { t, getLang } from '../../i18n';
// ...
const lang = getLang(Astro);
const CATEGORY_ID = 'C';
const translatedName = t(`category.${CATEGORY_ID}.name`, lang);
const translatedDesc = t(`category.${CATEGORY_ID}.desc`, lang);
```

**Step 2: For each of the 9 path-B pages, apply the same transformation**

For each page (the pattern is identical; only `CATEGORY_ID` and the fallback string differ):

Before:
```astro
import { categories } from '../../data/categories';
// ...
const categoryMeta = categories.find(c => c.id === CATEGORY_ID);
const categoryName = categoryMeta?.name ?? 'CUSTOMER SUPPORT FALLBACK';  // raw name w/ CJK
const categoryDesc = categoryMeta?.description ?? 'CUSTOMER SUPPORT FALLBACK DESC';
```

After:
```astro
import { t, getLang } from '../../i18n';
// (delete the `import { categories } from '../../data/categories';` ONLY IF no other use in the file;
//  some pages like customer-support.astro still pass `categories` array to <CategoryOtherNav> — keep the import there.)
// ...
const translatedName = t(`category.${CATEGORY_ID}.name`, lang);
const translatedDesc = t(`category.${CATEGORY_ID}.desc`, lang);
```

Then rename references throughout the file:
- `categoryName` → `translatedName`
- `categoryDesc` → `translatedDesc`

(Implementer: ensure these are consistent — grep each file for all references.)

**Per-page fallback strings** (used in `??` operator before this change, kept as comment per file header pattern):

| File | CATEGORY_ID | Old fallback |
|---|---|---|
| customer-support.astro | T | 'Customer Support' |
| hiring-team.astro | H | 'Hiring & Team' |
| knowledge.astro | K | 'Knowledge' |
| operations-inventory.astro | O | 'Operations' |
| marketing-analytics.astro | M | 'Marketing Analytics' |
| legal-compliance.astro | L | 'Legal & Compliance' |
| product-analytics.astro | P | 'Product Analytics' |
| sales.astro | S | 'Sales' |
| retention.astro | R | 'Retention & Customer Success' |

Note: After migration, the `??` fallback becomes unreachable (since `t()` always returns the en field even if missing — see i18n implementation). **Implementation may drop the `??` operator entirely** for cleaner code, OR keep it as defensive coding per CLAUDE.md style. Recommend keeping it (defense-in-depth, matches existing pattern).

**Step 3: Verify all 9 pages typecheck**

```bash
pnpm exec astro check
```

Expected: 0 errors. Warnings about unused imports of `categories` are OK if the file still uses `categories` for `CategoryOtherNav` — fix those warnings only if the implementer is sure no other usage.

**Step 4: Commit**

```bash
git add src/pages/[lang]/{customer-support,hiring-team,knowledge,operations-inventory,marketing-analytics,legal-compliance,product-analytics,sales,retention}.astro
git commit -m "refactor(category-pages): migrate 9 path-B pages to t() lookup pattern (unifies 15 pages)"
```

---

### Task 4: Build + dist HTML verification + ship memory

**Files:** (none production; create memory file)
- Create: `memory/p62-category-page-i18n-fix-shipped.md`

**Step 1: pnpm check — full suite**

```bash
pnpm check
```

Expected: 1163+ pass / 0 fail. (Adds 2 tests from Task 1+2.)

**Step 2: pnpm build**

```bash
pnpm build
```

Expected: 313 pages built, exit 0.

**Step 3: dist HTML grep verification**

```bash
grep -rE 'Operations / 库存运营|Sales / 销售管理|Knowledge / 知识库' dist/en/ 2>&1 | tee /tmp/p62-grep.txt
```

Expected: 0 matches.

Also sanity-check zh pages still show Chinese:
```bash
grep -E '运营 / 库存运营|销售管理|知识库' dist/zh/operations-inventory/index.html dist/zh/sales/index.html dist/zh/knowledge/index.html
```

Expected: matches present (zh pages unaffected by en-purity fix; the i18n table's zh fields are unchanged).

**Step 4: Write ship memory**

Create `memory/p62-category-page-i18n-fix-shipped.md` (mirror structure of P59 memory file at `memory/p59-engines-freelance-subdir-merge-shipped.md`). Include:

- Batch ID: P62
- Date: 2026-07-24
- Files touched: 12 (1 categories.ts + 1 translations.ts + 9 pages + 1 test)
- Test count delta: 1163 → 1165 (Task 1+2 added 2 tests)
- Build pages: 313 unchanged
- 3-way sync verification: `git fetch origin && git fetch github && git rev-list --left-right --count origin/master...github/master` → `0\t0` after push
- P62 follow-up candidate: scan all 100 engines for similar `path-B` patterns (i.e. hardcoded name fields that bypass i18n)

**Step 5: Pre-commit hook check**

```bash
node scripts/codegen-examples.mjs --check
```

Expected: exit 0.

**Step 6: Push to origin + github**

```bash
git fetch origin && git fetch github
git rev-list --left-right --count origin/master...github/master
```

If divergent or stale, follow P48 lesson (force-with-lease escape hatch).

```bash
git push origin master
git push github master
```

If pre-push hook fires false-negative `ahead=0`, bypass per P48:
```bash
git -c core.hooksPath=/dev/null push github master
```

**Step 7: 3-way sync verify**

```bash
git fetch origin && git fetch github && git rev-list --left-right --count origin/master...github/master
```

Expected: `0\t0`.

**Step 8: Commit ship memory**

```bash
git add memory/p62-category-page-i18n-fix-shipped.md
git commit -m "docs(p62): ship memory"
git push origin master && git push github master
```

---

## Self-Review

**1. Spec coverage:** Every requirement maps to a task:
- (1) English page title = pure English → Task 1 (categories.ts) + Task 2 (translations.ts en field) + Task 3 (path-B pages route through i18n)
- (2) 15 pages unified to t() pattern → Task 3 (all 9 path-B pages migrated; 6 path-A pages already conform)
- (3) Fallback strings pure English → Task 1 (categories.ts name is the canonical fallback for paths that still use it, but post-Task 3 the ?? is mostly unreachable; defensive fallbacks use Task 1's values)
- (4) i18n translation table fixed → Task 2

**2. Placeholder scan:** No "TBD" / "implement later" / "fill in details" — every step has concrete code or commands.

**3. Type consistency:** `translatedName` / `translatedDesc` (Task 3) match path-A convention from valuation-exit.astro L27-28. `CJK` regex is consistent across both tests in Task 1. `t()` function signature consistent across all 15 pages (already exists in src/i18n/index.ts).

**4. Risk:** Task 3 is the largest (9 files). All 9 are mechanically identical (same shape, same transformation). One implementer + one spec verify reviewer is sufficient per CLAUDE.md `[MECHANICAL]` classification. The risk of cross-file drift is low because the test in Task 1+2 catches source-side regressions, and dist grep in Task 4 catches any page that bypasses i18n.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-24-p62-category-page-i18n-fix.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?