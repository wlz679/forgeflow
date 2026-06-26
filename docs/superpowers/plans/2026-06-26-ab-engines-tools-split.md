# A+B Split — engines/ Subdirectories + tools.ts Multi-File — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize `src/engines/` (32 flat files → 6 subdirectories) and split `src/data/tools.ts` (467 lines → 6 category files + index.ts + types.ts), using `import.meta.glob` for zero-maintenance auto-aggregation. Zero public API change, zero consumer migration, zero data drift.

**Architecture:** Mechanical refactor driven by `categoryId` (the single source of truth post-drift-fix). All 32 engines move to one of 6 subdirs (`saas/`, `ai-cost/`, `valuation/`, `freelance/`, `cost/`, `investment/`) preserving filenames and content. `engines/index.ts` collapses 32 hand-written imports to one `import.meta.glob`. `src/data/tools.ts` deletes and is replaced by `src/data/tools/{types,saas,ai-cost,valuation,freelance,cost,investment,index}.ts` (8 files). 4 consumer import paths unchanged — TS resolves `tools.ts` → `tools/index.ts` automatically.

**Tech Stack:** Astro 4 + TypeScript, Vite's `import.meta.glob` (Astro native, no new deps), `git mv` for history preservation, Node.js for any helper scripts.

**Tag summary:** Task 1 [MECHANICAL] (baseline). Task 2 [MECHANICAL] (file moves + 4-line index rewrite). Task 3 [INTEGRATION] (large content split + new aggregator; consumer import paths at risk if mis-categorized). Task 4 [INTEGRATION] (full verification). All tasks use 1 spec-compliance reviewer; Tasks 3 and 4 also use 1 quality reviewer (cross-file consistency check).

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/engines/index.ts` | Modify (32 → 4 lines) | Use `import.meta.glob` to aggregate all engine subdir files |
| `src/engines/*.ts` × 32 | Move (no content change) | Relocate to one of 6 subdirs by `categoryId` |
| `src/engines/{saas,ai-cost,valuation,freelance,cost,investment}/` | Create (dirs) | Hold the 32 moved engine files |
| `src/data/tools.ts` | Delete | Replaced by `src/data/tools/index.ts` |
| `src/data/tools/types.ts` | Create | `ToolMeta` interface (moved from old `tools.ts:1-8`) |
| `src/data/tools/saas.ts` | Create | 5 ToolMeta entries with `categoryId: 'A'` |
| `src/data/tools/ai-cost.ts` | Create | 8 ToolMeta entries with `categoryId: 'B'` |
| `src/data/tools/valuation.ts` | Create | 9 ToolMeta entries with `categoryId: 'C'` |
| `src/data/tools/freelance.ts` | Create | 3 ToolMeta entries with `categoryId: 'D'` |
| `src/data/tools/cost.ts` | Create | 3 ToolMeta entries with `categoryId: 'E'` |
| `src/data/tools/investment.ts` | Create | 4 ToolMeta entries with `categoryId: 'F'` |
| `src/data/tools/index.ts` | Create | Aggregator using `import.meta.glob('./*.ts', { eager: true })` |
| `tests/ab-split.test.ts` | Create | Integration tests verifying 32 engines + 32 tools, file structure intact, consumers resolve |

**Net diff:** +8 new files (types, 6 category, index, test), +6 new subdirs, −1 deleted file (tools.ts), 32 files moved (history preserved via `git mv`).

---

## Task 1: Pre-flight baseline check [MECHANICAL]

**Files:** none modified (read-only).

- [ ] **Step 1: Verify clean working tree**

Run: `git status --short`
Expected: empty output. If non-empty, commit or stash current work before proceeding.

- [ ] **Step 2: Verify baseline build passes**

Run: `pnpm check`
Expected: exit 0, no errors. If failing, STOP and report to user; the existing repo is broken.

- [ ] **Step 3: Verify 32 engines in src/engines/ + 1 index.ts**

Run: `ls src/engines/*.ts | wc -l`
Expected: `33` (32 engines + 1 index.ts).

If count is not 33, list the files (`ls src/engines/*.ts`) and STOP — the spec assumes exactly 32 engine files + 1 index.

- [ ] **Step 4: Verify tools.ts is 467 lines**

Run: `wc -l src/data/tools.ts`
Expected: `467 src/data/tools.ts`.

- [ ] **Step 5: Verify ToolMeta interface location**

Run: `grep -n "export interface ToolMeta" src/data/tools.ts`
Expected: `1:export interface ToolMeta {` (line 1 of file).

- [ ] **Step 6: Verify 4 consumer import paths**

Run: `grep -rn "from.*['\"].*data/tools['\"]" src/ --include="*.ts" --include="*.astro"`
Expected output: 4 lines, all matching `from './tools'` or `from '../../data/tools'`:
- `src/data/blog-posts.ts:1:import { tools } from './tools';`
- `src/data/internal-links.ts:1:import { tools } from './tools';`
- `src/pages/[lang]/index.astro:9:import { tools } from '../../data/tools';`
- `src/pages/[lang]/[slug].astro:13:import { tools } from '../../data/tools';`

If the count or paths differ, STOP and investigate before proceeding.

- [ ] **Step 7: Verify no other files import `ToolMeta` directly**

Run: `grep -rn "import.*ToolMeta" src/ --include="*.ts" --include="*.astro"`
Expected: only matches in `src/data/tools.ts` (its own definition). If any other file imports `ToolMeta`, list them and STOP — moving `ToolMeta` to `src/data/tools/types.ts` would break those imports.

- [ ] **Step 8: No commit (baseline check only)**

This task establishes baseline state. No code changes — nothing to commit.

---

## Task 2: Move 32 engines to 6 subdirectories + rewrite engines/index.ts [MECHANICAL]

**Files:**
- Create: `src/engines/saas/`, `src/engines/ai-cost/`, `src/engines/valuation/`, `src/engines/freelance/`, `src/engines/cost/`, `src/engines/investment/`
- Move: 32 engine files to one of the 6 subdirs (preserving filenames)
- Modify: `src/engines/index.ts` (32 hand imports → 1-line `import.meta.glob`)

- [ ] **Step 1: Create 6 subdirectories**

Run:
```bash
mkdir -p src/engines/saas src/engines/ai-cost src/engines/valuation src/engines/freelance src/engines/cost src/engines/investment
```

Expected: 6 directories created, no error.

- [ ] **Step 2: Move 32 engine files via `git mv` (preserves history)**

Run each `git mv` exactly as listed below. The grouping is by destination subdir:

```bash
# saas/ (5 files, A category)
git mv src/engines/burn-rate-calculator.ts             src/engines/saas/
git mv src/engines/churn-rate-calculator.ts            src/engines/saas/
git mv src/engines/market-size-estimator.ts           src/engines/saas/
git mv src/engines/mrr-calculator.ts                  src/engines/saas/
git mv src/engines/revenue-projector.ts               src/engines/saas/

# ai-cost/ (8 files, B category)
git mv src/engines/ai-api-cost-comparison.ts                 src/engines/ai-cost/
git mv src/engines/ai-image-generation-cost-calculator.ts    src/engines/ai-cost/
git mv src/engines/ai-training-cost-estimator.ts             src/engines/ai-cost/
git mv src/engines/claude-api-cost-calculator.ts             src/engines/ai-cost/
git mv src/engines/deepseek-api-cost-calculator.ts           src/engines/ai-cost/
git mv src/engines/gemini-api-cost-calculator.ts             src/engines/ai-cost/
git mv src/engines/gpu-cloud-cost-calculator.ts              src/engines/ai-cost/
git mv src/engines/openai-token-calculator.ts                src/engines/ai-cost/

# valuation/ (9 files, C category)
git mv src/engines/break-even-calculator.ts                  src/engines/valuation/
git mv src/engines/cac-calculator.ts                         src/engines/valuation/
git mv src/engines/course-pricing-calculator.ts              src/engines/valuation/
git mv src/engines/email-list-revenue-calculator.ts          src/engines/valuation/
git mv src/engines/ltv-calculator.ts                         src/engines/valuation/
git mv src/engines/project-profitability-calculator.ts       src/engines/valuation/
git mv src/engines/saas-pricing-planner.ts                   src/engines/valuation/
git mv src/engines/saas-valuation-calculator.ts             src/engines/valuation/
git mv src/engines/unit-economics-calculator.ts              src/engines/valuation/

# freelance/ (3 files, D category)
git mv src/engines/affiliate-income-calculator.ts            src/engines/freelance/
git mv src/engines/freelance-rate-calculator.ts              src/engines/freelance/
git mv src/engines/hourly-vs-fixed-calculator.ts             src/engines/freelance/

# cost/ (3 files, E category)
git mv src/engines/employee-cost-calculator.ts               src/engines/cost/
git mv src/engines/meeting-cost-calculator.ts                src/engines/cost/
git mv src/engines/productivity-score.ts                     src/engines/cost/

# investment/ (4 files, F category)
git mv src/engines/equity-dilution-calculator.ts             src/engines/investment/
git mv src/engines/freelance-tax-calculator.ts               src/engines/investment/
git mv src/engines/sponsorship-rate-calculator.ts            src/engines/investment/
git mv src/engines/time-value-calculator.ts                  src/engines/investment/
```

Expected: 32 files moved. Run `git status --short | wc -l` to verify it shows 32 renamed entries (status `R`).

- [ ] **Step 3: Verify no engine files remain in src/engines/ root**

Run: `ls src/engines/*.ts 2>/dev/null | grep -v "^src/engines/index.ts$" || echo "OK: no engine files at root (only index.ts)"`
Expected: `OK: no engine files at root (only index.ts)`.

- [ ] **Step 4: Verify each subdir has the right number of files**

Run:
```bash
echo "saas: $(ls src/engines/saas/*.ts | wc -l)"
echo "ai-cost: $(ls src/engines/ai-cost/*.ts | wc -l)"
echo "valuation: $(ls src/engines/valuation/*.ts | wc -l)"
echo "freelance: $(ls src/engines/freelance/*.ts | wc -l)"
echo "cost: $(ls src/engines/cost/*.ts | wc -l)"
echo "investment: $(ls src/engines/investment/*.ts | wc -l)"
```

Expected:
```
saas: 5
ai-cost: 8
valuation: 9
freelance: 3
cost: 3
investment: 4
```

If any number is off, identify the file and `git mv` to the correct subdir. **Do not** create new files or copy — only move.

- [ ] **Step 5: Rewrite `engines/index.ts` using `import.meta.glob`**

Use the Edit tool:
- `file_path`: `src/engines/index.ts`
- `old_string`: the entire current 33-line content (32 imports + trailing newline)
- `new_string`:
```ts
// Auto-aggregate all engines from subdirectories.
// import.meta.glob is Vite/Astro-native: zero maintenance, zero runtime cost.
// Side effects (registerEngine) run on import; the return value is intentionally unused.
import.meta.glob<unknown>('./*/*.ts', { eager: true });
```
- `replace_all`: `false`

- [ ] **Step 6: Verify `engines/index.ts` content**

Run: `cat src/engines/index.ts`
Expected: 4 lines (1 comment block + 1 import.meta.glob call + 1 comment + 1 blank line, or similar — should not contain any `import './X'` lines).

- [ ] **Step 7: Run typecheck**

Run: `pnpm typecheck`
Expected: exit 0, no errors. Each engine's `const engine: ToolEngine = {...}` literal must still satisfy the type interface (engines haven't been modified, just moved).

- [ ] **Step 8: Verify all 32 engines register via runtime import**

Run:
```bash
node -e "
import('./src/engines/index.ts').then(async () => {
  const { getAllEngines } = await import('./src/core/engines/registry.ts');
  const engines = getAllEngines();
  console.log('Registered engines:', engines.length);
  if (engines.length !== 32) {
    console.error('FAIL: expected 32, got', engines.length);
    process.exit(1);
  }
  console.log('OK');
});
"
```

Expected output: `Registered engines: 32` then `OK`. If not 32, one or more engine files were not picked up by the glob — list `getAllEngines().map(e => e.slug)` to see which is missing.

- [ ] **Step 9: Commit the moves + index rewrite**

Run:
```bash
git add -A src/engines/
git -c user.email=dev@local -c user.name=Developer commit -m "chore(engines): move 32 engines to 6 subdirs + rewrite index.ts

- 32 engines redistributed to subdirs by categoryId (5/8/9/3/3/4):
  saas/ ai-cost/ valuation/ freelance/ cost/ investment/
- engines/index.ts: 32 hand-written imports → 1-line import.meta.glob
- File history preserved via git mv (no content changes to engines)
- All 32 engines still register via side-effect imports

Verifies zero behavior change: pnpm typecheck exit 0, 32 engines
registered, consumer import paths unchanged."
```

Expected: 1 commit, 32 renamed files + 1 modified (index.ts) = 33 entries in `git show --stat HEAD`.

---

## Task 3: Split tools.ts into 6 category files + types.ts + index.ts [INTEGRATION]

**Files:**
- Create: `src/data/tools/types.ts` (ToolMeta interface)
- Create: `src/data/tools/{saas,ai-cost,valuation,freelance,cost,investment}.ts` (6 category files)
- Create: `src/data/tools/index.ts` (aggregator using `import.meta.glob`)
- Delete: `src/data/tools.ts` (replaced by `tools/index.ts`)

- [ ] **Step 1: Create `src/data/tools/` directory**

Run: `mkdir -p src/data/tools`
Expected: directory created.

- [ ] **Step 2: Create `src/data/tools/types.ts` with the `ToolMeta` interface**

Write file `src/data/tools/types.ts` with content:

```ts
export interface ToolMeta {
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  applicationCategory: string;
  inputs: { name: string; label: string; placeholder: string; type: 'text' | 'select' | 'number'; options?: string[] }[];
}
```

This is the same content as the old `src/data/tools.ts:1-8`. Verify with `diff` after.

- [ ] **Step 3: Write one-shot script `scripts/_split-tools-by-category.mjs`**

This script reads the existing `src/data/tools.ts` and writes 6 category files (`saas.ts`, `ai-cost.ts`, etc.) into `src/data/tools/`, preserving the exact `ToolMeta` entry content. The script is deleted after the split completes.

Write file `scripts/_split-tools-by-category.mjs`:

```javascript
// One-shot script: read src/data/tools.ts, split by categoryId into 6 files.
// Safe to delete after this run completes.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = 'src/data/tools.ts';
const OUT_DIR = 'src/data/tools';

mkdirSync(OUT_DIR, { recursive: true });

// Read source. The file uses ES module syntax with export const tools: ToolMeta[] = [...].
const src = readFileSync(SOURCE, 'utf8');

// Extract the array literal by locating `export const tools: ToolMeta[] = [` and the matching `];`.
// (Single, top-level array; no nested `];` inside entries.)
const start = src.indexOf('export const tools: ToolMeta[] = [');
if (start === -1) throw new Error('Could not find tools array start in source');
const bodyStart = start + 'export const tools: ToolMeta[] = ['.length;
const end = src.lastIndexOf('];');
if (end === -1 || end <= bodyStart) throw new Error('Could not find tools array end in source');
const arrayBody = src.slice(bodyStart, end);

// Split by top-level object boundaries: each entry begins with `\n  {\n` and ends with `\n  },` or `\n  }\n]`. We can do a simple regex pass.
const entryRegex = /\{\s*slug:\s*'([^']+)',[\s\S]*?categoryId:\s*'([A-F])',[\s\S]*?inputs:\s*\[[\s\S]*?\]\s*,?\s*\}/g;
const entries = [];
let match;
while ((match = entryRegex.exec(arrayBody)) !== null) {
  entries.push({ slug: match[1], categoryId: match[2], raw: match[0] });
}

console.log(`Found ${entries.length} entries by categoryId:`);
const byCategory = {};
for (const e of entries) {
  byCategory[e.categoryId] = (byCategory[e.categoryId] ?? 0) + 1;
}
console.log('  ', byCategory);

// Verify total = 32
if (entries.length !== 32) {
  console.error(`!! Expected 32 entries, found ${entries.length}. Aborting.`);
  process.exit(1);
}

// Write 6 category files
const categoryToFile = {
  A: 'saas',
  B: 'ai-cost',
  C: 'valuation',
  D: 'freelance',
  E: 'cost',
  F: 'investment',
};
for (const [catId, fileBase] of Object.entries(categoryToFile)) {
  const fileEntries = entries.filter(e => e.categoryId === catId);
  if (fileEntries.length === 0) {
    console.error(`!! No entries for category ${catId}. Aborting.`);
    process.exit(1);
  }
  const out = [
    "import type { ToolMeta } from './types';",
    '',
    'export const tools: ToolMeta[] = [',
    ...fileEntries.flatMap((e, i) => {
      // Trim trailing comma if present, re-add consistent comma
      const trimmed = e.raw.trim().replace(/,\s*$/, '');
      const sep = i < fileEntries.length - 1 ? ',' : '';
      return [`  ${trimmed}${sep}`];
    }),
    '];',
    '',
  ].join('\n');
  writeFileSync(join(OUT_DIR, `${fileBase}.ts`), out);
  console.log(`  wrote ${fileBase}.ts (${fileEntries.length} entries)`);
}

console.log(`\nDone. Wrote 6 category files into ${OUT_DIR}/.`);
```

- [ ] **Step 4: Run the split script**

Run: `node scripts/_split-tools-by-category.mjs`
Expected output:
```
Found 32 entries by categoryId:
  { A: 5, B: 8, C: 9, D: 3, E: 3, F: 4 }
  wrote saas.ts (5 entries)
  wrote ai-cost.ts (8 entries)
  wrote valuation.ts (9 entries)
  wrote freelance.ts (3 entries)
  wrote cost.ts (3 entries)
  wrote investment.ts (4 entries)

Done. Wrote 6 category files into src/data/tools/.
```

If the count is not 32, or a category has 0 entries, the script exits 1 — investigate which entries were mis-classified and edit the script or the source before re-running.

- [ ] **Step 5: Verify the 6 category files are syntactically valid**

Run: `pnpm typecheck 2>&1 | head -20`
Expected: TS errors ONLY in the new files (because they import `ToolMeta` from `./types` which doesn't exist yet). If the errors reference other files, STOP — the regex extracted malformed data.

- [ ] **Step 6: Create `src/data/tools/types.ts` with the `ToolMeta` interface**

Write file `src/data/tools/types.ts`:

```ts
export interface ToolMeta {
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  applicationCategory: string;
  inputs: { name: string; label: string; placeholder: string; type: 'text' | 'select' | 'number'; options?: string[] }[];
}
```

This is the same content as the old `src/data/tools.ts:1-8`. The category files (created in Step 4) import from this file.

- [ ] **Step 7: Re-run typecheck — expect 0 errors**

Run: `pnpm typecheck`
Expected: exit 0. All 6 category files now resolve `ToolMeta` via `./types`.

- [ ] **Step 8: Create `src/data/tools/index.ts` aggregator**

Write file `src/data/tools/index.ts`:

```ts
import type { ToolMeta } from './types';

// Auto-aggregate all ToolMeta entries from sibling category files.
// import.meta.glob is Vite/Astro-native: zero maintenance, zero runtime cost.
// Side effect of each sibling file is a top-level `export const tools: ToolMeta[] = [...]`.
// `index.ts` itself doesn't export `tools` named, so it is naturally filtered out.
const modules = import.meta.glob<{ tools?: ToolMeta[] }>('./*.ts', { eager: true });

export const tools: ToolMeta[] = Object.values(modules)
  .filter((m): m is { tools: ToolMeta[] } => Array.isArray(m.tools))
  .flatMap(m => m.tools);

export type { ToolMeta };
```

- [ ] **Step 9: Delete the old `src/data/tools.ts` and the one-shot script**

Run:
```bash
rm src/data/tools.ts scripts/_split-tools-by-category.mjs
```

Expected: both files removed.

- [ ] **Step 10: Run final typecheck**

Run: `pnpm typecheck`
Expected: exit 0. The 4 consumers (`blog-posts.ts`, `internal-links.ts`, `[lang]/index.astro`, `[slug].astro`) must still resolve `from './tools'` → `tools/index.ts` cleanly via TS module resolution.

- [ ] **Step 11: Verify aggregated `tools` array has 32 entries**

Run:
```bash
node -e "
import('./src/data/tools/index.ts').then(m => {
  console.log('Total tools:', m.tools.length);
  if (m.tools.length !== 32) {
    console.error('FAIL: expected 32, got', m.tools.length);
    process.exit(1);
  }
  console.log('OK');
});
"
```

Expected: `Total tools: 32` then `OK`. If not 32, one or more category files were not picked up by the glob — list `m.tools.map(t => t.slug)` to see what's missing.

- [ ] **Step 12: Commit the tools split**

Run:
```bash
git add -A src/data/tools/ src/data/tools.ts
git -c user.email=dev@local -c user.name=Developer commit -m "refactor(tools): split tools.ts into 6 category files + index.ts

- src/data/tools.ts (467 lines) deleted
- src/data/tools/types.ts: ToolMeta interface
- src/data/tools/{saas,ai-cost,valuation,freelance,cost,investment}.ts:
  32 ToolMeta entries redistributed by categoryId (5/8/9/3/3/4)
- src/data/tools/index.ts: aggregator using import.meta.glob

Consumer import paths unchanged: TS resolves './tools' to
'tools/index.ts' automatically. 4 consumers (blog-posts,
internal-links, [lang]/index.astro, [slug].astro) work
without any edits.

Verifies zero behavior change: pnpm typecheck exit 0, 32 tools
aggregated, all 32 slugs preserved."
```

Expected: 1 commit. `git show --stat HEAD` should show:
- 1 deleted file: `src/data/tools.ts`
- 7 created files: `src/data/tools/{types,saas,ai-cost,valuation,freelance,cost,investment,index}.ts` (8 actually — types + 6 categories + index)

Note: `index.ts` re-exports `ToolMeta` via `export type`, so consumers can still import `{ ToolMeta }` from `./tools` if needed (though grep shows no such consumer — they only use the `tools` value).

- [ ] **Step 11: Delete the old `src/data/tools.ts`**

Run: `rm src/data/tools.ts`
Expected: file deleted, `ls src/data/tools.ts` returns "No such file".

- [ ] **Step 12: Run typecheck**

Run: `pnpm typecheck`
Expected: exit 0, no errors. The 4 consumers (`blog-posts.ts`, `internal-links.ts`, `[lang]/index.astro`, `[lang]/[slug].astro`) must still resolve `from './tools'` → `tools/index.ts` cleanly.

- [ ] **Step 13: Verify aggregated `tools` array has 32 entries**

Run:
```bash
node -e "
import('./src/data/tools/index.ts').then(m => {
  console.log('Total tools:', m.tools.length);
  if (m.tools.length !== 32) {
    console.error('FAIL: expected 32, got', m.tools.length);
    process.exit(1);
  }
  console.log('OK');
});
"
```

Expected: `Total tools: 32` then `OK`.

- [ ] **Step 14: Commit the tools split**

Run:
```bash
git add -A src/data/tools/ src/data/tools.ts
git -c user.email=dev@local -c user.name=Developer commit -m "refactor(tools): split tools.ts into 6 category files + index.ts

- src/data/tools.ts (467 lines) deleted
- src/data/tools/types.ts: ToolMeta interface
- src/data/tools/{saas,ai-cost,valuation,freelance,cost,investment}.ts:
  32 ToolMeta entries redistributed by categoryId (5/8/9/3/3/4)
- src/data/tools/index.ts: aggregator using import.meta.glob

Consumer import paths unchanged: TS resolves './tools' to
'tools/index.ts' automatically. 4 consumers (blog-posts,
internal-links, [lang]/index.astro, [lang]/[slug].astro) work
without any edits.

Verifies zero behavior change: pnpm typecheck exit 0, 32 tools
aggregated, all 32 slugs preserved."
```

Expected: 1 commit. `git show --stat HEAD` should show:
- 1 deleted file: `src/data/tools.ts`
- 8 created files: `src/data/tools/{types,saas,ai-cost,valuation,freelance,cost,investment,index}.ts`

---

## Task 4: Write integration test + full verification [INTEGRATION]

**Files:**
- Create: `tests/ab-split.test.ts`
- Read: `dist/en/solopreneur-cac-calculator/index.html` (built output)
- Read: `dist/en/solopreneur-openai-token-calculator/index.html` (built output)
- Read: `dist/en/blog/best-solopreneur-time-value-calculator/index.html` (built output)

- [ ] **Step 1: Create `tests/ab-split.test.ts`**

Write file `tests/ab-split.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');

test('engines/ has 6 subdirectories', () => {
  for (const sub of ['saas', 'ai-cost', 'valuation', 'freelance', 'cost', 'investment']) {
    assert.ok(
      existsSync(join(ROOT, 'src/engines', sub)),
      `engines/${sub}/ should exist`
    );
  }
});

test('engines/index.ts uses import.meta.glob', () => {
  const content = readFileSync(join(ROOT, 'src/engines/index.ts'), 'utf8');
  assert.match(content, /import\.meta\.glob/, 'engines/index.ts should use import.meta.glob');
  assert.ok(!content.includes("import './cac-calculator"), 'engines/index.ts should not have hand-written engine imports');
});

test('engines/ has no engine .ts files at root (only index.ts)', () => {
  // Read directory contents and assert no .ts files at the engines/ root
  // except index.ts. (Existence of the 6 subdirs is verified above.)
  const { readdirSync } = require('node:fs') as typeof import('node:fs');
  const entries = readdirSync(join(ROOT, 'src/engines'));
  const rootTs = entries.filter(f => f.endsWith('.ts'));
  assert.deepEqual(rootTs, ['index.ts'], `engines/ root should only have index.ts, found: ${rootTs.join(', ')}`);
});

test('data/tools/ has 8 files (types, 6 categories, index)', () => {
  for (const f of ['types.ts', 'saas.ts', 'ai-cost.ts', 'valuation.ts', 'freelance.ts', 'cost.ts', 'investment.ts', 'index.ts']) {
    assert.ok(
      existsSync(join(ROOT, 'src/data/tools', f)),
      `data/tools/${f} should exist`
    );
  }
});

test('old src/data/tools.ts is deleted', () => {
  assert.ok(
    !existsSync(join(ROOT, 'src/data/tools.ts')),
    'src/data/tools.ts should be deleted'
  );
});

test('tools/index.ts uses import.meta.glob', () => {
  const content = readFileSync(join(ROOT, 'src/data/tools/index.ts'), 'utf8');
  assert.match(content, /import\.meta\.glob/, 'tools/index.ts should use import.meta.glob');
});

test('getAllEngines() returns 32 engines after import', async () => {
  await import('../src/engines/index.ts');
  const { getAllEngines } = await import('../src/core/engines/registry.ts');
  assert.equal(getAllEngines().length, 32);
});

test('aggregated tools array has 32 entries', async () => {
  const { tools } = await import('../src/data/tools/index.ts');
  assert.equal(tools.length, 32);
});

test('4 consumer import paths are unchanged', () => {
  const consumers = [
    ['src/data/blog-posts.ts', `from './tools'`],
    ['src/data/internal-links.ts', `from './tools'`],
    ['src/pages/[lang]/index.astro', `from '../../data/tools'`],
    ['src/pages/[lang]/[slug].astro', `from '../../data/tools'`],
  ] as const;
  for (const [file, expectedImport] of consumers) {
    const content = readFileSync(join(ROOT, file), 'utf8');
    assert.ok(
      content.includes(expectedImport),
      `${file} should still contain ${expectedImport}`
    );
  }
});
```

- [ ] **Step 2: Run the new test alone**

Run: `pnpm test:unit --test-name-pattern="ab-split|engines|tools/" 2>&1 | tail -20`
Expected: all 9 new tests pass. If any fail, identify and fix the regression.

- [ ] **Step 3: Run the full test suite**

Run: `pnpm test:unit`
Expected: 30/30 pass (21 prior + 9 new). If any fail, fix before proceeding.

- [ ] **Step 4: Run `pnpm check` (codegen + tests)**

Run: `pnpm check`
Expected: exit 0. Confirms codegen-examples and codegen-customfn scripts still pass against the moved engine files (they reference `src/engines/*.ts` which now matches the subdir files via glob — verify if codegen scripts use literal paths or globs).

If codegen fails, check `scripts/codegen-examples.mjs` and `scripts/codegen-customfn.mjs` for hard-coded `src/engines/*.ts` paths that don't recurse into subdirs. Update to use `src/engines/**/*.ts` if needed.

- [ ] **Step 5: Run production build**

Run: `pnpm build`
Expected: 141 static pages built in <10s, no errors.

If page count differs from 141, identify which page is missing/extra and STOP — investigate before reporting completion.

- [ ] **Step 6: Spot check cac-calculator page**

Run:
```bash
grep -o 'applicationCategory[^,]*' dist/en/solopreneur-cac-calculator/index.html | head -3
grep -oE 'solopreneur-(ltv|unit-economics|saas-valuation|break-even|project-profitability)-calculator' dist/en/solopreneur-cac-calculator/index.html | sort -u
```

Expected:
- `applicationCategory`: contains `FinanceApplication` (CAC's categoryId C maps to FinanceApplication per `application-categories.ts`)
- RelatedTools: lists ltv, unit-economics, saas-valuation, break-even (other C-category tools)

- [ ] **Step 7: Spot check openai-token-calculator page**

Run:
```bash
grep -o 'applicationCategory[^,]*' dist/en/solopreneur-openai-token-calculator/index.html | head -3
grep -oE 'solopreneur-(claude-api-cost|deepseek-api-cost|gemini-api-cost|ai-image-generation|ai-training|gpu-cloud)-calculator' dist/en/solopreneur-openai-token-calculator/index.html | sort -u
```

Expected:
- `applicationCategory`: contains `DeveloperApplication` (B maps to DeveloperApplication)
- RelatedTools: lists other AI Cost tools

- [ ] **Step 8: Spot check time-value blog page**

Run:
```bash
grep -oE '<img[^>]+src="/og/solopreneur-time-value-calculator-en\.png"' dist/en/blog/best-solopreneur-time-value-calculator/index.html | head -1
```

Expected: one match showing the hero `<img>` with the correct OG image src.

- [ ] **Step 9: Review total diff stat**

Run:
```bash
git diff --stat <previous-stable-commit-sha> HEAD
```

(Use `git log --oneline -5` to find the commit before this work began — likely the most recent commit before Task 2's first commit, which is `1152e0d` or `6f2f242`.)

Expected: shows 32 renames (`src/engines/X.ts → src/engines/sub/X.ts`), 1 modified (`src/engines/index.ts`), 1 deleted (`src/data/tools.ts`), 8 created (`src/data/tools/*.ts` × 8), 1 new test (`tests/ab-split.test.ts`). Approximately:
- 33 renamed (32 engines + 0)
- 2 modified (engines/index.ts, possibly data/tools/types.ts if not classed as new)
- 1 deleted (src/data/tools.ts)
- 9 created (8 in data/tools/ + 1 test)

- [ ] **Step 10: No commit (verification only)**

All code changes were already committed in Tasks 2 and 3. This task is verification-only.

- [ ] **Step 11: Report completion to user**

Report to user:
- Both commits (Task 2 SHA, Task 3 SHA)
- `pnpm check` + `pnpm test:unit` + `pnpm build` results
- All 3 spot checks pass
- Total diff stat
- Task #3 (A+B spec) is now ready to mark complete; subsequent specs (C internal-links auto, E content upgrade) become unblocked

---

## Self-Review Checklist

- [x] **Spec coverage**:
  - 6 subdirs created → Task 2 Steps 1, 4 ✓
  - 32 engines correctly classified → Task 2 Step 2 (explicit `git mv` list) + Step 9 verification ✓
  - `engines/index.ts` uses glob → Task 2 Steps 5-6 ✓
  - `src/data/tools.ts` deleted → Task 3 Step 11 ✓
  - 6 category files created → Task 3 Steps 3-8 ✓
  - `tools/index.ts` aggregator → Task 3 Step 10 ✓
  - `tools/types.ts` → Task 3 Step 2 ✓
  - `pnpm typecheck` passes → Task 2 Step 7 + Task 3 Step 12 ✓
  - 21 unit tests pass → Task 4 Step 3 (covers new + old) ✓
  - `pnpm build` 141 pages → Task 4 Step 5 ✓
  - 4 consumer import paths unchanged → Task 4 Step 1 (test) + Task 1 Step 6 (baseline) ✓
  - 32 engines register + 32 tools aggregate → Task 2 Step 8 + Task 3 Step 13 + Task 4 Step 2 ✓
  - 3 spot checks → Task 4 Steps 6-8 ✓
- [x] **Placeholder scan**: no TBD / "implement later" / "similar to X" / vague requirements
- [x] **Type consistency**: `ToolMeta` referenced consistently in `tools/types.ts` and imported in all 6 category files
- [x] **Bite-sized**: each step is one action (mkdir, git mv, write file, run command, commit)
- [x] **No assumptions**: every command has explicit text; every file content is given (except Steps 4-8 in Task 3, which explicitly direct the implementer to copy verbatim from the source — the source file is named and the entry list is given)
- [x] **Frequent commits**: 2 implementation commits (Task 2, Task 3), 0 verification commits (Task 4 has no code changes)

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `git mv` fails because file already moved in a prior run | Step 2 `git mv` lines are idempotent only on a clean tree; if re-run, git errors will be visible |
| 32 hand-written `git mv` commands prone to typo | Grouped by destination subdir with clear comments; Step 4 verifies counts per subdir |
| Subdir file counts don't match expected | Step 4 lists expected counts (5/8/9/3/3/4); mismatch triggers STOP |
| `engines/index.ts` glob not triggering side effects | Task 2 Step 8 explicitly verifies `getAllEngines().length === 32` |
| `tools/index.ts` includes itself in the aggregation (circular) | Step 10 filter `Array.isArray(m.tools)` excludes self (its own export is undefined at evaluation time) |
| Task 3 Steps 4-8: large content copy from tools.ts may lose data | Verification: Task 3 Step 9 lists expected counts per file; Task 4 Step 2 verifies final aggregation = 32 |
| Codegen scripts reference `src/engenes/*.ts` without subdir recursion | Task 4 Step 4 checks `pnpm check` (which runs codegen); if failing, the plan notes to update scripts to use `src/engines/**/*.ts` |
| Page count drops below 141 in build | Task 4 Step 5 stops on mismatch and requires investigation |
| Consumer imports fail because of `tools.ts` deletion | `tsc` checks all 4 consumers in Task 3 Step 12; build also catches in Task 4 Step 5 |
| Plan-execution forgets to mark some `categoryId` correctly | Task 3 Step 9 cross-checks counts; Task 4 Step 7 spot-check verifies openai-token (B → DeveloperApplication) |