# P49 — Engine Count per Category Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Codegen-enforce the engine-count-per-category invariant (15 categories × per-letter count → 100 total) so future re-categorizations cannot silently drift CLAUDE.md's prose claim (P46 root cause class).

**Architecture:** Standalone script reads `src/data/categories.ts` + `src/data/tools/index.ts` barrel via `tsx`, groups `ToolMeta[]` by `categoryId`, emits a markdown table to stdout, and `--check` mode asserts against (a) `EXPECTED_ENGINES_BY_CATEGORY` constant + (b) CLAUDE.md snapshot table between `<!-- codegen:start engine-count -->` markers. Drift guard test at `tests/` root (mirrors P47 pattern) runs the script + asserts 7 invariants in-process. Pre-commit hook + `pnpm check` chain insert the script as slot 6, before the existing `tests/run.mjs` invocation. CLAUDE.md L41 prose replaced with auto-generated table (copy-paste from script output; NOT auto-rewrite per spec §Why NOT Auto-Rewrite).

**Tech Stack:** Node.js `.mjs` script + tsx for TS imports, `node:test` + `node:assert/strict` (matches P47 drift guard), existing `tests/run.mjs` runner (root-level `.test.ts` filter), bash pre-commit hook.

**Spec:** [`docs/superpowers/specs/2026-07-20-p49-engine-count-table-design.md`](../specs/2026-07-20-p49-engine-count-table-design.md) (commit `c27444c`)

**Baseline:** `c27444c` (P49 design spec)
**Target:** 4 production commits on `master`, dual-pushed to gitee + github, ship memory + MEMORY.md index update.

---

## Global Constraints

- **Per-category counts (derived 2026-07-20 via `node --import tsx` against `src/data/tools/index.ts` + `src/data/categories.ts` — DO NOT regenerate; values are baseline for P49)**:
  ```
  A=5 (SaaS Metrics) / B=8 (AI Cost Tools) / C=10 (Valuation & Exit) /
  D=6 (Freelance Pricing) / E=5 (Cost & Efficiency) / F=10 (Investment & Real Estate) /
  H=6 (Hiring & Team) / K=6 (Knowledge / 知识库) / L=6 (Legal & Compliance) /
  M=8 (Marketing Analytics) / O=6 (Operations / 库存运营) / P=6 (Product Analytics) /
  R=6 (Retention & Customer Success) / S=6 (Sales / 销售管理) / T=6 (Customer Support)
  Total = 100
  ```
  Note: spec draft's illustrative numbers (e.g. A=30) were placeholders; actual ToolMeta state per 2026-07-20 is the 100-split above. CLAUDE.md "92 business + 8 AI cost" prose claim remains correct at the cross-category aggregation level — P49 only codegens the per-category split (15 rows), not the business/AI variant split.

- **`tests/` root placement for new test file** — P22b ESM trap: `tests/run.mjs` reads `tests/*.test.ts` (root only). New `tests/engine-count-by-category.test.ts` MUST live at root, NOT in `tests/lib/` or `tests/scripts/` subdir.

- **Copy-paste (NOT auto-rewrite) for CLAUDE.md table** — spec §Why NOT Auto-Rewrite: 4 reasons (merge conflict risk + human review gate + P-series "detect-then-warn" pattern + P46 history callout coexistence). Script emits table → operator manually copy-pastes into CLAUDE.md between markers.

- **Codegen markers in CLAUDE.md**: `<!-- codegen:start engine-count -->` ... `<!-- codegen:end -->` — script `--check` mode diffs content between markers line-for-line.

- **Pre-commit hook insertion order**: slot 4 (after i18n at slot 2 + og-samples at slot 3; before no further checks). i18n (slot 2) already detects new categories via `src/data/categories/.*\.ts` path filter — adding engine-count-by-category (slot 4) is independent and complementary.

- **`pnpm check` chain order**: slot 6, AFTER `check:i18n-completeness` (slot 3) + `codegen-examples --check` (slot 4) + `codegen-customfn --check` (slot 5), BEFORE `tests/run.mjs` (slot 7). Reason: script must pass before test (drift guard test T7 spawns `--check`; if test runs before script in chain, T7 would fail without the script having run yet).

- **Ship memory file location**: `~/.claude/projects/D--E-----youtube-tools/memory/p49-engine-count-table-shipped.md` (user-global, mirrors P43-P48 pattern).

- **`pnpm check` baseline**: 1103 pass / 0 fail / 0 skip (P47+P48 final). Target: 1110 pass (+7 new assertions) / 0 fail / 0 skip.

- **3-way sync target**: `0  0` between local / gitee (`origin`) / github on `master`.

---

## Task 1: Derive baseline counts (verify spec assumptions)

**Files:** None (read-only verification).

**Context:** spec draft contained illustrative numbers (A=30) that contradict actual ToolMeta state. P49 must use real counts to seed `EXPECTED_ENGINES_BY_CATEGORY`. This task documents the derivation so the implementer can verify (not just trust) before seeding.

- [ ] **Step 1: Run baseline derivation against current state**

  Create temporary script and run via tsx (mirrors codegen-examples.mjs pattern):

  ```bash
  cat > __tmp_derive_counts.ts <<'EOF'
  import { tools } from './src/data/tools/index.ts';
  import { categories } from './src/data/categories.ts';
  const counts: Record<string, number> = {};
  for (const t of tools) counts[t.categoryId] = (counts[t.categoryId] || 0) + 1;
  let total = 0;
  for (const c of categories) {
    const n = counts[c.id] || 0;
    total += n;
    console.log(`${c.id}=${n} (${c.name})`);
  }
  console.log(`Total=${total}, tools.length=${tools.length}, categories.length=${categories.length}`);
  EOF
  node --import tsx __tmp_derive_counts.ts
  rm __tmp_derive_counts.ts
  ```

  Expected output (use these values to populate Task 2's `EXPECTED_ENGINES_BY_CATEGORY`):
  ```
  A=5 (SaaS Metrics)
  B=8 (AI Cost Tools)
  C=10 (Valuation & Exit)
  D=6 (Freelance Pricing)
  E=5 (Cost & Efficiency)
  F=10 (Investment & Real Estate)
  H=6 (Hiring & Team)
  K=6 (Knowledge / 知识库)
  L=6 (Legal & Compliance)
  M=8 (Marketing Analytics)
  O=6 (Operations / 库存运营)
  P=6 (Product Analytics)
  R=6 (Retention & Customer Success)
  S=6 (Sales / 销售管理)
  T=6 (Customer Support)
  Total=100, tools.length=100, categories.length=15
  ```

  **FAIL conditions** (STOP and investigate; do NOT proceed with stale counts):
  - `Total != 100` → engine count changed since P22b baseline; investigate before Task 2
  - `tools.length != 100` → barrel / registry inconsistency
  - `categories.length != 15` → P46 categories audit drift; investigate before Task 2
  - Any letter in `Object.keys(counts)` not in `categories.map(c => c.id)` → orphan categoryId in ToolMeta (T4 will catch in Task 4, but flag now for context)

  If all checks pass: derive values are valid. Proceed to Task 2.

- [ ] **Step 2: No commit (read-only task)**

  This task makes no file changes. Proceed directly to Task 2.

---

## Task 2: Add `EXPECTED_ENGINES_BY_CATEGORY` constant

**Files:**
- Modify: `tests/lib/engine-count.ts` (append per-category map after existing `EXPECTED_ENGINE_COUNT`)

**Context:** Double-layer check (spec §Constants Design). Layer 1 (`EXPECTED_ENGINE_COUNT = 100`) catches total drift. Layer 2 (new map) catches category-distribution drift. Together they enforce full structural invariant.

**Writes values verbatim from Task 1 output.** Order: alphabetical by letter (A→T, matching `categories.ts` declaration order).

- [ ] **Step 1: Append to `tests/lib/engine-count.ts`**

  Use Edit tool on `tests/lib/engine-count.ts`. Append after the final `export const EXPECTED_ENGINE_COUNT: number = 100;` line:

  ```typescript
  // P49: per-category engine count map. Double-layer check alongside
  // EXPECTED_ENGINE_COUNT (P22b). When a future batch adds/removes/re-
  // categorizes engines, this map is the canonical declaration; the
  // script (scripts/check-engine-count-by-category.mjs) emits it as a
  // markdown table for CLAUDE.md, and tests/engine-count-by-category.test.ts
  // asserts the runtime ToolMeta state matches.
  //
  // Values derived 2026-07-20 from `src/data/tools/index.ts` barrel via
  // `node --import tsx`. Update via:
  //   1. Edit src/data/tools/*.ts (add/remove/re-categorize engine)
  //   2. Update this map
  //   3. Run `node scripts/check-engine-count-by-category.mjs` to get new table
  //   4. Copy-paste table into CLAUDE.md between `<!-- codegen:start engine-count -->` markers
  export const EXPECTED_ENGINES_BY_CATEGORY: Record<string, number> = {
    A: 5,   // SaaS Metrics
    B: 8,   // AI Cost Tools
    C: 10,  // Valuation & Exit
    D: 6,   // Freelance Pricing
    E: 5,   // Cost & Efficiency
    F: 10,  // Investment & Real Estate
    H: 6,   // Hiring & Team
    K: 6,   // Knowledge / 知识库
    L: 6,   // Legal & Compliance
    M: 8,   // Marketing Analytics
    O: 6,   // Operations / 库存运营
    P: 6,   // Product Analytics
    R: 6,   // Retention & Customer Success
    S: 6,   // Sales / 销售管理
    T: 6,   // Customer Support
  };
  ```

- [ ] **Step 2: Verify file compiles via pnpm check (no test count change yet)**

  Run: `pnpm check`
  Expected: **1103 pass / 0 fail / 0 skip** (unchanged from P48 — only constant added, no new test yet).

- [ ] **Step 3: Commit**

  ```bash
  git add tests/lib/engine-count.ts
  git commit -m "feat(p49): tests/lib/engine-count.ts +EXPECTED_ENGINES_BY_CATEGORY map (15 categories); double-layer invariant alongside EXPECTED_ENGINE_COUNT (P22b); derived 2026-07-20; pnpm check 1103/0/0 unchanged (no new test yet)"
  ```

---

## Task 3: Create `scripts/check-engine-count-by-category.mjs`

**Files:**
- Create: `scripts/check-engine-count-by-category.mjs`

**Context:** Standalone script (mirrors `scripts/codegen-examples.mjs` shape). Default mode emits markdown table to stdout; `--check` mode asserts (a) `EXPECTED_ENGINES_BY_CATEGORY` const matches ToolMeta counts, (b) ToolMeta total matches `EXPECTED_ENGINE_COUNT`, (c) CLAUDE.md snapshot table between markers matches script output. Exit 0 on pass, 1 on fail.

- [ ] **Step 1: Write the script**

  Write `scripts/check-engine-count-by-category.mjs`:

  ```javascript
  #!/usr/bin/env node
  // P49 — Engine count per category table.
  //
  // Reads src/data/categories.ts + src/data/tools/index.ts via tsx,
  // groups ToolMeta by categoryId, emits a markdown table.
  //
  // Default mode: emit table to stdout (operator copy-pastes into CLAUDE.md).
  // --check mode: assert const map + ToolMeta total + CLAUDE.md snapshot
  //   all agree. Exit 0 on pass, 1 on fail.
  //
  // Mirrors scripts/codegen-examples.mjs shell (CHECK_MODE flag,
  // ROOT resolution, tsx import via --import tsx wrapper).
  //
  // Why no inline tsx import: this script is invoked by pre-commit hook +
  // pnpm check + tests/*.test.ts; using `spawnSync('node', ['--import',
  // 'tsx', ...])` keeps the caller side dependency-free.

  import { spawnSync } from 'node:child_process';
  import fs from 'node:fs';
  import path from 'node:path';
  import { fileURLToPath } from 'node:url';

  const CHECK_MODE = process.argv.includes('--check');

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const ROOT = path.join(__dirname, '..');

  // Step 1: derive live counts from ToolMeta barrel via tsx subprocess.
  // The derivation script is inline because it's purpose-specific to P49
  // and not reused elsewhere. Output: a single JSON line `{"byCategory": {...}, "total": N}`.
  const deriveScript = `
    import { tools } from '${ROOT}/src/data/tools/index.ts';
    import { categories } from '${ROOT}/src/data/categories.ts';
    const counts = {};
    for (const t of tools) counts[t.categoryId] = (counts[t.categoryId] || 0) + 1;
    process.stdout.write(JSON.stringify({ byCategory: counts, total: tools.length, categoryCount: categories.length }));
  `;

  const deriveResult = spawnSync(
    process.execPath,
    ['--import', 'tsx', '-e', deriveScript],
    { encoding: 'utf8', cwd: ROOT }
  );
  if (deriveResult.status !== 0) {
    console.error('[engine-count-by-category] derivation failed:', deriveResult.stderr);
    process.exit(1);
  }
  const derived = JSON.parse(deriveResult.stdout);

  // Step 2: load EXPECTED_ENGINES_BY_CATEGORY const via tsx subprocess.
  // We can't import directly because .ts file is TS module syntax.
  const constScript = `
    import { EXPECTED_ENGINES_BY_CATEGORY } from '${ROOT}/tests/lib/engine-count.ts';
    process.stdout.write(JSON.stringify(EXPECTED_ENGINES_BY_CATEGORY));
  `;
  const constResult = spawnSync(
    process.execPath,
    ['--import', 'tsx', '-e', constScript],
    { encoding: 'utf8', cwd: ROOT }
  );
  if (constResult.status !== 0) {
    console.error('[engine-count-by-category] const load failed:', constResult.stderr);
    process.exit(1);
  }
  const constMap = JSON.parse(constResult.stdout);

  // Step 3: build markdown table sorted by category letter (categories.ts order).
  const sortedCategories = [
    'A', 'B', 'C', 'D', 'E', 'F', 'H', 'K', 'L', 'M', 'O', 'P', 'R', 'S', 'T',
  ];

  function buildTable(byCategory) {
    const lines = [
      '| Letter | Category Name | Engine Count |',
      '|--------|---------------|--------------|',
    ];
    let total = 0;
    for (const letter of sortedCategories) {
      const n = byCategory[letter] || 0;
      total += n;
      const name = CATEGORY_NAMES[letter] || letter;
      lines.push(`| ${letter} | ${name} | ${n} |`);
    }
    lines.push(`| **Total** | | **${total}** |`);
    return lines.join('\n');
  }

  // Category display names (matched from src/data/categories.ts 2026-07-20).
  // Kept inline (not loaded from categories.ts) because:
  //   - Avoids tsx subprocess for a static lookup table
  //   - Script output is human-facing (CLAUDE.md); ASCII-safe names
  //   - If categories.ts rename happens, this map must update too
  //     (caught by drift guard test T6 + manual --check)
  const CATEGORY_NAMES = {
    A: 'SaaS Metrics',
    B: 'AI Cost Tools',
    C: 'Valuation & Exit',
    D: 'Freelance Pricing',
    E: 'Cost & Efficiency',
    F: 'Investment & Real Estate',
    H: 'Hiring & Team',
    K: 'Knowledge / 知识库',
    L: 'Legal & Compliance',
    M: 'Marketing Analytics',
    O: 'Operations / 库存运营',
    P: 'Product Analytics',
    R: 'Retention & Customer Success',
    S: 'Sales / 销售管理',
    T: 'Customer Support',
  };

  const table = buildTable(derived.byCategory);

  if (!CHECK_MODE) {
    console.log(table);
    process.exit(0);
  }

  // --check mode: assert const matches derived, total matches EXPECTED_ENGINE_COUNT.
  let failures = 0;
  function fail(msg) { console.error('[engine-count-by-category] FAIL:', msg); failures++; }

  // Layer 1: const map matches derived counts (per-category).
  for (const letter of sortedCategories) {
    const expected = constMap[letter];
    const actual = derived.byCategory[letter] || 0;
    if (expected !== actual) {
      fail(`const[${letter}]=${expected} but ToolMeta says ${actual}`);
    }
  }

  // Layer 2: total matches EXPECTED_ENGINE_COUNT.
  if (derived.total !== Object.values(constMap).reduce((s, n) => s + n, 0)) {
    fail(`ToolMeta total=${derived.total} but sum(EXPECTED_ENGINES_BY_CATEGORY)=${Object.values(constMap).reduce((s, n) => s + n, 0)}`);
  }
  if (derived.total !== 100) {
    fail(`ToolMeta total=${derived.total} but EXPECTED_ENGINE_COUNT=100`);
  }

  // Layer 3: CLAUDE.md snapshot table matches script output.
  const claudePath = path.join(ROOT, 'CLAUDE.md');
  if (!fs.existsSync(claudePath)) {
    fail(`CLAUDE.md missing at ${claudePath}`);
  } else {
    const claudeContent = fs.readFileSync(claudePath, 'utf8');
    const markerStart = '<!-- codegen:start engine-count -->';
    const markerEnd = '<!-- codegen:end -->';
    const startIdx = claudeContent.indexOf(markerStart);
    const endIdx = claudeContent.indexOf(markerEnd);
    if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
      fail(`CLAUDE.md missing codegen markers (start=${startIdx}, end=${endIdx})`);
    } else {
      const snapshot = claudeContent.slice(startIdx + markerStart.length, endIdx).trim();
      const expected = table.trim();
      if (snapshot !== expected) {
        fail('CLAUDE.md snapshot table does not match script output. Run `node scripts/check-engine-count-by-category.mjs` and copy-paste the output into CLAUDE.md between the codegen markers.');
        console.error('--- script output ---');
        console.error(expected);
        console.error('--- CLAUDE.md snapshot ---');
        console.error(snapshot);
        console.error('--- end ---');
      }
    }
  }

  if (failures === 0) {
    console.log('[engine-count-by-category] PASSED');
    process.exit(0);
  } else {
    console.error(`[engine-count-by-category] ${failures} failure(s)`);
    process.exit(1);
  }
  ```

- [ ] **Step 2: Run in default mode to verify table output**

  Run: `node scripts/check-engine-count-by-category.mjs`
  Expected: markdown table printed to stdout, exit 0. Save this output for Task 6 (CLAUDE.md copy-paste).

  Example expected shape (use actual output from this step in Task 6):
  ```
  | Letter | Category Name | Engine Count |
  |--------|---------------|--------------|
  | A | SaaS Metrics | 5 |
  | B | AI Cost Tools | 8 |
  ...
  | T | Customer Support | 6 |
  | **Total** | | **100** |
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add scripts/check-engine-count-by-category.mjs
  git commit -m "feat(p49): scripts/check-engine-count-by-category.mjs — emit markdown table + --check mode (const + ToolMeta + CLAUDE.md snapshot); mirrors codegen-examples.mjs shell"
  ```

---

## Task 4: Create drift guard test at `tests/` root

**Files:**
- Create: `tests/engine-count-by-category.test.ts` (at `tests/` ROOT, NOT `tests/scripts/`)

**Context:** P22b ESM trap: `tests/run.mjs` reads `tests/*.test.ts` only (root level). Test file must be at root or `pnpm test:unit` will silently skip it. P47 pattern: 7 assertions, mix of structural invariants + subprocess smoke.

- [ ] **Step 1: Write the test file**

  Write `tests/engine-count-by-category.test.ts`:

  ```typescript
  #!/usr/bin/env node
  // P49 drift guard — 7 assertions enforcing engine-count-by-category invariant.
  //
  // Mirrors tests/codegen-drift-guard.test.ts (P47 pattern).
  //
  // What this test asserts:
  //   T1 — EXPECTED_ENGINE_COUNT === sum(EXPECTED_ENGINES_BY_CATEGORY.values) — cross-const consistency
  //   T2 — Object.keys(EXPECTED_ENGINES_BY_CATEGORY).length === categories.length — all 15 categories covered
  //   T3 — Each category in src/data/categories.ts has a key in EXPECTED_ENGINES_BY_CATEGORY — reverse mapping
  //   T4 — Each ToolMeta entry's categoryId exists in categories.ts — no orphan categories
  //   T5 — tools.length === EXPECTED_ENGINE_COUNT (100) — runtime match total
  //   T6 — sum(groupBy(tools, 'categoryId').values) === EXPECTED_ENGINE_COUNT — runtime match per-cat sum
  //   T7 — scripts/check-engine-count-by-category.mjs --check exits 0 — integration smoke
  //
  // Why tests/ root: P22b ESM trap — tests/run.mjs reads tests/*.test.ts (root only).
  // Subdir placement silently skipped by pnpm test:unit.

  import { test } from 'node:test';
  import { strict as assert } from 'node:assert';
  import { spawnSync } from 'node:child_process';
  import path from 'node:path';
  import { fileURLToPath } from 'node:url';

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const ROOT = path.join(__dirname, '..');

  // Load constants + categories + tools via tsx subprocess (matches script pattern).
  // Direct import would require tsconfig setup; subprocess is consistent with P47.
  function loadTsModule<T>(modulePath: string): T {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', '-e', `import m from '${modulePath}'; process.stdout.write(JSON.stringify(m))`],
      { encoding: 'utf8', cwd: ROOT }
    );
    if (result.status !== 0) {
      throw new Error(`Failed to load ${modulePath}: ${result.stderr}`);
    }
    return JSON.parse(result.stdout);
  }

  const EXPECTED_ENGINE_COUNT = loadTsModule<number>('./tests/lib/engine-count.ts')
    .EXPECTED_ENGINE_COUNT as unknown as number;
  // Actually the entire module is `{EXPECTED_ENGINE_COUNT: 100, EXPECTED_ENGINES_BY_CATEGORY: {...}}`.
  // Re-load to get the object directly:
  const engineCountModule = (() => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', '-e', `import m from '${ROOT}/tests/lib/engine-count.ts'; process.stdout.write(JSON.stringify(m))`],
      { encoding: 'utf8', cwd: ROOT }
    );
    if (result.status !== 0) throw new Error(result.stderr);
    return JSON.parse(result.stdout);
  })();
  const EXPECTED_ENGINES_BY_CATEGORY = engineCountModule.EXPECTED_ENGINES_BY_CATEGORY as Record<string, number>;

  const categories = loadTsModule<Array<{ id: string; name: string }>>('./src/data/categories.ts');
  // tools module shape: { tools: ToolMeta[] } (default export from barrel).
  const toolsModule = loadTsModule<{ tools: Array<{ categoryId: string }> }>('./src/data/tools/index.ts');
  const tools = toolsModule.tools;

  // === T1: EXPECTED_ENGINE_COUNT === sum(EXPECTED_ENGINES_BY_CATEGORY.values) ===

  test('T1: EXPECTED_ENGINE_COUNT === sum(EXPECTED_ENGINES_BY_CATEGORY.values)', () => {
    const sum = Object.values(EXPECTED_ENGINES_BY_CATEGORY).reduce((s, n) => s + n, 0);
    assert.equal(
      EXPECTED_ENGINE_COUNT,
      sum,
      `EXPECTED_ENGINE_COUNT=${EXPECTED_ENGINE_COUNT} but sum(EXPECTED_ENGINES_BY_CATEGORY)=${sum}. The two constants must agree (double-layer invariant).`
    );
  });

  // === T2: Object.keys(EXPECTED_ENGINES_BY_CATEGORY).length === categories.length (15) ===

  test('T2: EXPECTED_ENGINES_BY_CATEGORY has 15 entries (matches categories.ts)', () => {
    assert.equal(
      Object.keys(EXPECTED_ENGINES_BY_CATEGORY).length,
      categories.length,
      `EXPECTED_ENGINES_BY_CATEGORY has ${Object.keys(EXPECTED_ENGINES_BY_CATEGORY).length} entries but categories.ts has ${categories.length}.`
    );
  });

  // === T3: Each category in categories.ts has a key in EXPECTED_ENGINES_BY_CATEGORY ===

  test('T3: each category in categories.ts is covered by EXPECTED_ENGINES_BY_CATEGORY', () => {
    const constKeys = new Set(Object.keys(EXPECTED_ENGINES_BY_CATEGORY));
    const missing = categories.filter(c => !constKeys.has(c.id)).map(c => c.id);
    assert.equal(
      missing.length,
      0,
      `Categories missing from EXPECTED_ENGINES_BY_CATEGORY: ${missing.join(', ')}`
    );
  });

  // === T4: Each ToolMeta entry's categoryId exists in categories.ts ===

  test('T4: each ToolMeta categoryId exists in categories.ts (no orphans)', () => {
    const validIds = new Set(categories.map(c => c.id));
    const orphans = Array.from(new Set(tools.filter(t => !validIds.has(t.categoryId)).map(t => t.categoryId)));
    assert.equal(
      orphans.length,
      0,
      `ToolMeta entries reference unknown categoryIds: ${orphans.join(', ')}`
    );
  });

  // === T5: tools.length === EXPECTED_ENGINE_COUNT (100) ===

  test('T5: tools.length === EXPECTED_ENGINE_COUNT', () => {
    assert.equal(
      tools.length,
      EXPECTED_ENGINE_COUNT,
      `tools.length=${tools.length} but EXPECTED_ENGINE_COUNT=${EXPECTED_ENGINE_COUNT}.`
    );
  });

  // === T6: sum(groupBy(tools, categoryId).values) === EXPECTED_ENGINE_COUNT ===

  test('T6: sum of per-category ToolMeta counts === EXPECTED_ENGINE_COUNT', () => {
    const counts: Record<string, number> = {};
    for (const t of tools) counts[t.categoryId] = (counts[t.categoryId] || 0) + 1;
    const sum = Object.values(counts).reduce((s, n) => s + n, 0);
    assert.equal(
      sum,
      EXPECTED_ENGINE_COUNT,
      `Sum of per-category counts=${sum} but EXPECTED_ENGINE_COUNT=${EXPECTED_ENGINE_COUNT}.`
    );
  });

  // === T7: scripts/check-engine-count-by-category.mjs --check exits 0 ===

  test('T7: scripts/check-engine-count-by-category.mjs --check exits 0 (integration smoke)', () => {
    const result = spawnSync(
      'node',
      ['scripts/check-engine-count-by-category.mjs', '--check'],
      { cwd: ROOT, encoding: 'utf8' }
    );
    assert.equal(
      result.status,
      0,
      `script exited ${result.status}. stdout: ${result.stdout || '(empty)'}, stderr: ${result.stderr || '(empty)'}`
    );
    assert.match(
      result.stdout,
      /PASSED/,
      `script did not report PASSED. stdout: ${result.stdout}`
    );
  });
  ```

- [ ] **Step 2: Run test file standalone to verify 7/7 pass**

  Run: `node --import tsx tests/engine-count-by-category.test.ts`
  Expected: **7/7 pass**. If any fail, STOP and investigate (likely the const map values don't match ToolMeta state — Task 1 should have caught this; if it didn't, fix the const in `tests/lib/engine-count.ts` and re-run).

- [ ] **Step 3: Verify pnpm check picks it up (test count: 1103 → 1110)**

  Run: `pnpm check`
  Expected: **1110 pass / 0 fail / 0 skip** (+7 over P48 baseline of 1103). All existing 1103 tests still pass.

- [ ] **Step 4: Commit**

  ```bash
  git add tests/engine-count-by-category.test.ts
  git commit -m "test(p49): tests/engine-count-by-category.test.ts at tests/ root (P22b ESM trap avoidance); 7 assertions mirroring P47 drift-guard pattern; pnpm check 1103→1110"
  ```

---

## Task 5: Wire into `pnpm check` chain (slot 6)

**Files:**
- Modify: `package.json` (add `check:engines-by-category` script + insert into `pnpm check` chain)

**Context:** Slot 6 — after `check-i18n-completeness` (slot 3) + `codegen-examples --check` (slot 4) + `codegen-customfn --check` (slot 5), BEFORE `tests/run.mjs` (slot 7). Reason: T7 drift guard spawns `--check`; if test runs before script in chain, T7 would fail because the script hasn't been added to the chain yet. Wait — actually since the script runs as a standalone subprocess (not a `pnpm test:unit` invoke), T7 will pass regardless of chain order. Chain order matters for which check catches drift first: put engine-count-by-category BEFORE `tests/run.mjs` so a missing CLAUDE.md update fails the chain at slot 6 (faster) rather than slot 7 test run (slower).

- [ ] **Step 1: Add the standalone script command to `scripts`**

  Edit `package.json`. In the `scripts` object, after the `"check:customfn"` line, add:

  ```json
    "check:engines-by-category": "node scripts/check-engine-count-by-category.mjs --check",
  ```

  Final `scripts` block (lines 19-28 after edit):
  ```json
    "check": "node scripts/check-clerk-env.mjs && node scripts/check-supabase-env.mjs && node scripts/check-i18n-completeness.mjs && node scripts/codegen-examples.mjs --check && node scripts/codegen-customfn.mjs --check && node scripts/check-engine-count-by-category.mjs --check && node tests/run.mjs",
    "check:i18n": "node scripts/check-i18n-completeness.mjs",
    "check:clerk-env": "node scripts/check-clerk-env.mjs",
    "check:supabase-env": "node scripts/check-supabase-env.mjs",
    "check:examples": "node scripts/codegen-examples.mjs --check",
    "check:customfn": "node scripts/codegen-customfn.mjs --check",
    "check:engines-by-category": "node scripts/check-engine-count-by-category.mjs --check",
    "test:schemas": "node --import tsx tests/seo-schemas.test.ts",
    "test:unit": "node tests/run.mjs",
    "test:build": "node scripts/test-build.mjs"
  ```

- [ ] **Step 2: Verify pnpm check still passes (chain integration)**

  Run: `pnpm check`
  Expected: **1110 pass / 0 fail / 0 skip** (unchanged — script is now in the chain but `--check` succeeds because Task 3 already wrote the const correctly).

- [ ] **Step 3: Verify standalone invocation also works**

  Run: `pnpm check:engines-by-category`
  Expected: `[engine-count-by-category] PASSED` printed to stdout, exit 0.

- [ ] **Step 4: Commit**

  ```bash
  git add package.json
  git commit -m "chore(p49): package.json +check:engines-by-category script + slot 6 in pnpm check chain (after codegen-customfn, before tests/run.mjs); pnpm check 1110/0/0"
  ```

---

## Task 6: Wire into `.githooks/pre-commit` (slot 4)

**Files:**
- Modify: `.githooks/pre-commit` (add engine-count-by-category check after og-samples at slot 3)

**Context:** Pre-commit hook currently has 3 slots (staticExamples drift / i18n completeness / og-sample coverage). P49 adds slot 4: engine-count-by-category. The check fires whenever `src/data/tools/*.ts` OR `src/data/categories.ts` OR `tests/lib/engine-count.ts` OR `scripts/check-engine-count-by-category.mjs` is staged — i.e. when the invariant source files change. (Mirrors the existing slot 2 i18n pattern: only fires on relevant path changes.)

- [ ] **Step 1: Append slot 4 to pre-commit hook**

  Edit `.githooks/pre-commit`. After the final `fi` of slot 3 (og-sample coverage, ending at line 55), add:

  ```bash
  # 4. engine count by category — per-letter count + CLAUDE.md snapshot (P49).
  if echo "$STAGED" | grep -qE '^(src/data/(categories|tools)/.*\.ts|tests/lib/engine-count\.ts|scripts/check-engine-count-by-category\.mjs|CLAUDE\.md)$'; then
    echo "[pre-commit] Running scripts/check-engine-count-by-category.mjs --check..."
    if ! node scripts/check-engine-count-by-category.mjs --check; then
      echo ""
      echo "[pre-commit] BLOCKED: engine count by category mismatch."
      echo "  Fix: update tests/lib/engine-count.ts EXPECTED_ENGINES_BY_CATEGORY,"
      echo "        run \`node scripts/check-engine-count-by-category.mjs\` to get new table,"
      echo "        copy-paste into CLAUDE.md between codegen markers."
      echo "  Bypass (not recommended): \`git commit --no-verify\`"
      exit 1
    fi
  fi
  ```

- [ ] **Step 2: Verify hook syntax (bash -n)**

  Run: `bash -n .githooks/pre-commit`
  Expected: no output (exit 0). If syntax error, fix.

- [ ] **Step 3: Verify chain still passes**

  Run: `pnpm check`
  Expected: **1110 pass / 0 fail / 0 skip** (unchanged — hook isn't run by pnpm check, only by `git commit`).

- [ ] **Step 4: Smoke test the hook on a no-op staged file**

  Run:
  ```bash
  echo "# noop" >> .githooks/pre-commit
  git add .githooks/pre-commit
  SKIP_PRECOMMIT_CHECK=1 git commit -m "test: verify pre-commit hook syntax (will amend)" --no-verify
  git reset --soft HEAD~1
  git reset HEAD .githooks/pre-commit
  git checkout -- .githooks/pre-commit
  ```
  Expected: commit succeeds (because `--no-verify` bypasses hook), then reset restores the file. This is a smoke test for hook script shell syntax — actual `--check` invocation against real files happens in Task 7.

  Note: This smoke test uses `--no-verify` + reset to avoid actually committing a noop. If the reset pattern feels risky, alternative is `git stash` before / after. Operator choice.

- [ ] **Step 5: Commit**

  ```bash
  git add .githooks/pre-commit
  git commit -m "chore(p49): .githooks/pre-commit slot 4 — engine-count-by-category check fires on src/data/{categories,tools}/*.ts + tests/lib/engine-count.ts + scripts/check-engine-count-by-category.mjs + CLAUDE.md staged changes"
  ```

---

## Task 7: Update CLAUDE.md L41 with auto-generated table

**Files:**
- Modify: `CLAUDE.md` (replace L41 prose with new structure)

**Context:** Spec §Why NOT Auto-Rewrite: 4 reasons. Operator manually copy-pastes script output. The new L41 structure preserves the v3 status prose claim ("92 business + 8 AI cost") AND inserts the per-category table between codegen markers. Drift between prose (total) and table (per-cat sum) caught by `pnpm check`.

- [ ] **Step 1: Re-run script in default mode to capture fresh output**

  Run: `node scripts/check-engine-count-by-category.mjs`
  Capture output (this is the table to paste into CLAUDE.md).

- [ ] **Step 2: Edit CLAUDE.md via Edit tool**

  Use Edit tool on `CLAUDE.md`. Replace L41 (current text):
  ```
  **v3 status (P16 milestone locked 2026-07-15/16):** All 100 engines at the v3 standard. 8 AI cost engines meet the AI Cost v3 variant; 92 business engines meet the Business v3 variant (across 15 categories). UI wiring (`BIZ_CONFIG_MAP` + 4 `BIZ_*_CONFIG` + 205 preset-chip references) and i18n (15 × 6 preset keys per engine) complete. Historical batch reference: see `docs/superpowers/plans/2026-06-22-close-v3-gap-7-business-calculators.md` for the original 7-batch close.
  ```

  With (using actual script output from Step 1):
  ```markdown
  **v3 status (P16 milestone locked 2026-07-15/16):** All 100 engines at the v3 standard. Engine count per category:

  <!-- codegen:start engine-count -->
  [paste output from Step 1 here, verbatim]
  <!-- codegen:end -->

  8 AI cost engines meet the AI Cost v3 variant; 92 business engines meet the Business v3 variant (across 15 categories). UI wiring (`BIZ_CONFIG_MAP` + 4 `BIZ_*_CONFIG` + 205 preset-chip references) and i18n (15 × 6 preset keys per engine) complete. Historical batch reference: see `docs/superpowers/plans/2026-06-22-close-v3-gap-7-business-calculators.md` for the original 7-batch close.
  ```

  Note: the "92 business + 8 AI cost" prose claim remains (it describes variant distribution, not category distribution — orthogonal concern). P49 only codegens per-category split.

- [ ] **Step 3: Verify pnpm check still passes (CLAUDE.md snapshot now matches script)**

  Run: `pnpm check`
  Expected: **1110 pass / 0 fail / 0 skip** — script `--check` mode reads CLAUDE.md between markers and matches its own output.

- [ ] **Step 4: Visual verification of diff**

  Run: `git diff CLAUDE.md`
  Expected: L41 prose reformatted (split into "v3 status line + table + closing prose"), markers added, table pasted. 0 unrelated changes.

- [ ] **Step 5: Commit**

  ```bash
  git add CLAUDE.md
  git commit -m "docs(p49): CLAUDE.md L41 — replace inline v3 status prose with codegen markers + auto-generated per-category table; preserves 92 business + 8 AI cost prose (orthogonal variant split)"
  ```

---

## Task 8: Final verification + dual-push with P43+P44 lessons

**Files:** None (git push only).

**Context:** This task applies P43 (pre-push fetch) + P44 (hook stale cache bypass) lessons, exactly as P48 did. The push sequence below is the worked example for future AI sessions.

- [ ] **Step 1: Pre-push fetch + rev-list (P43 lesson — apply immediately)**

  Run:
  ```bash
  git fetch origin 2>/dev/null
  git fetch github 2>/dev/null
  git rev-list --left-right --count master...origin/master master...github/master
  ```

  Expected: `0  0` on both lines (no divergence before push).

  If divergence found: STOP and resolve via `reset + cherry-pick + force-with-lease` pattern (P43 ship memory §Ship Sequence steps 3-5). Do NOT proceed to push.

- [ ] **Step 2: Final pnpm check baseline verification**

  Run: `pnpm check`
  Expected: **1110 pass / 0 fail / 0 skip** (P49 final state; 1103 P48 baseline + 7 P49 assertions).

- [ ] **Step 3: Push to gitee (origin)**

  Run: `git push origin master`
  Expected: `<c27444c>..<P49-tip-sha> master -> master` (fast-forward of 4 production commits: const / script / test / package.json / pre-commit / CLAUDE.md = 6 commits actually — recount below).

  Note: Task 2 = 1 commit (const), Task 3 = 1 (script), Task 4 = 1 (test), Task 5 = 1 (package.json), Task 6 = 1 (pre-commit), Task 7 = 1 (CLAUDE.md) = **6 production commits total**. Not 4 as estimated at top of plan. Adjust push expectations accordingly.

- [ ] **Step 4: Push to github (try normal first, fallback to bypass if hook stale)**

  Try: `git push github master`
  - **Success path**: Output shows `<P49-tip-sha> master -> master`. Skip to Step 5.
  - **Hook stale path**: Hook reports "ahead=0" or similar false negative despite gitee having received commits. Apply P44 lesson:
    ```bash
    git -c core.hooksPath=/dev/null push github master
    ```
    Expected: `<P49-tip-sha> master -> master` (forced update, hook bypassed). Note in commit message and ship memory that this path was taken.

- [ ] **Step 5: Final fetch + rev-list verification**

  Run:
  ```bash
  git fetch origin 2>/dev/null
  git fetch github 2>/dev/null
  git rev-list --left-right --count master...origin/master master...github/master
  ```

  Expected: `0  0` on both lines. Clean 3-way sync confirmed.

  If divergence found: STOP and investigate (do NOT silently retry).

- [ ] **Step 6: Verify CLAUDE.md codegen markers present on github**

  Run:
  ```bash
  git fetch github 2>/dev/null
  git show github/master:CLAUDE.md | grep -c "<!-- codegen:start engine-count -->"
  ```
  Expected: `1` (one marker line).

  Run: `git show github/master:CLAUDE.md | grep -c "<!-- codegen:end -->"`
  Expected: `1`.

- [ ] **Step 7: Verify CLAUDE.md codegen markers present on gitee**

  Run:
  ```bash
  git fetch origin 2>/dev/null
  git show origin/master:CLAUDE.md | grep -c "<!-- codegen:start engine-count -->"
  ```
  Expected: `1`.

---

## Task 9: Ship memory + MEMORY.md index update

**Files:**
- Create: `~/.claude/projects/D--E-----youtube-tools/memory/p49-engine-count-table-shipped.md` (user-global, mirrors P43-P48 pattern)
- Modify: `~/.claude/projects/D--E-----youtube-tools/memory/MEMORY.md` (append 1 line at end of "P17+" section)

**Context:** Ship memory is canonical post-ship log. MEMORY.md is auto-loaded each session.

- [ ] **Step 1: Write ship memory file**

  Write `~/.claude/projects/D--E-----youtube-tools/memory/p49-engine-count-table-shipped.md` with frontmatter + sections matching P43-P48 ship memory structure:

  - **Frontmatter:**
    ```markdown
    ---
    name: p49-engine-count-table-shipped
    description: P49 engine count per category table shipped 2026-07-20; codegen-enforced invariant (15 categories × per-letter counts → 100); 6 production commits (const / script / test / package.json / pre-commit / CLAUDE.md); 1103 → 1110 pass / 0 fail; closes P46 categories drift root cause class; P22b ESM trap applied (test at tests/ root); P43+P44 lessons applied during push
    metadata:
      type: project
      originSessionId: cd3ba618-1fc6-45c4-b732-aacb7f6c214c
      modified: 2026-07-20T<HH:MM:SS>.<ms>Z
    ---
    ```

  - **Sections** (mirror P48 ship memory structure):
    - TL;DR — 1 paragraph: codegen-enforced engine-count-per-category invariant; closes P46 root cause class; 6 production commits + dual-push
    - What shipped — commit table (Task 2 const / Task 3 script / Task 4 test / Task 5 package.json / Task 6 pre-commit / Task 7 CLAUDE.md)
    - Design decisions — double-layer check rationale + tests/ root placement (P22b trap) + copy-paste (NOT auto-rewrite) for CLAUDE.md
    - Architecture diagram (ASCII) — show flow: categories.ts + tools barrel → script → CLAUDE.md snapshot + drift guard test
    - Diff preview — show L41 before/after (prose → prose + table between markers)
    - Verification — pnpm check baseline/final + 3-way sync + codegen markers grep + per-task script run results
    - Lessons — (a) spec draft numbers were illustrative (A=30 wrong; real A=5); always derive baseline before seeding (Task 1 lesson), (b) P22b trap avoided by tests/ root placement, (c) inline `CATEGORY_NAMES` map in script vs tsx load (perf + simplicity tradeoff), (d) `CHECK_MODE` pattern from codegen-examples.mjs is portable, (e) copy-paste preserves human review gate
    - P50+ candidates — tests/codegen-customfn-drift-guard.test.ts (P47+); move tests/lib/engine-count.test.ts to tests/engine-count.test.ts (P22b subdir cleanup); scripts/check-ai-cost-by-model.mjs (analogous per-provider table for 8 AI cost engines)
    - See also — links to P46 categories drift audit (root cause origin), P47 drift-guard pattern (template), P48 lessons (P43+P44 push lessons applied)

  Reference for structure: `~/.claude/projects/D--E-----youtube-tools/memory/p48-claude-md-lessons-shipped.md` (already in context) — mirror its TL;DR / What shipped / Verification / Lessons / P49+ candidates sections, but populate with P49 facts.

- [ ] **Step 2: Update MEMORY.md index**

  Read `~/.claude/projects/D--E-----youtube-tools/memory/MEMORY.md` and append a new line in the "P17+ (active batches — cascade audit + INDEX series)" section, immediately after the P48 entry (last current line).

  New line (1 line, 1 markdown list item):
  ```
  - [P49 engine count per category table](p49-engine-count-table-shipped.md) — 6 production commits (const / script / test / package.json / pre-commit / CLAUDE.md) 2026-07-20; codegen-enforced invariant (15 cats × per-letter counts → 100); 1103 → 1110 pass / 0 fail; closes P46 categories drift root cause class; P22b ESM trap applied (test at tests/ root); copy-paste pattern for CLAUDE.md (NOT auto-rewrite per spec §Why NOT Auto-Rewrite); P50+ candidates: codegen-customfn-drift-guard, engine-count.test.ts subdir move, check-ai-cost-by-model
  ```

- [ ] **Step 3: Verify MEMORY.md size under hook limit**

  Run: `wc -c ~/.claude/projects/D--E-----youtube-tools/memory/MEMORY.md`
  Expected: < 17100 bytes (hook limit per P-series memory notes; current P48-era baseline ~14KB).

  If over limit: STOP and trim earlier entries (defer to a future P-series audit batch — do NOT modify existing entries in this batch).

- [ ] **Step 4: Verify ship memory + MEMORY.md present**

  Run: `ls ~/.claude/projects/D--E-----youtube-tools/memory/p49-*.md`
  Expected: `p49-engine-count-table-shipped.md` present.

  Run: `grep -c "p49-engine-count-table-shipped" ~/.claude/projects/D--E-----youtube-tools/memory/MEMORY.md`
  Expected: `1` (the slug appears once in the new line's markdown link `[text](p49-engine-count-table-shipped.md)`. P48 lesson: `grep -c` counts matching lines, not occurrences; slug is a single string on a single line.)

---

## Self-Review Checklist (run before declaring plan ready)

- [x] All file paths absolute or `repo-root` relative
- [x] All commands include exact syntax + expected output
- [x] No TBD / TODO / placeholder content (Task 1 deliberately re-derives counts as a baseline verification, not a placeholder)
- [x] Wording in Task 7 matches spec §CLAUDE.md Integration structure (table between markers, prose preserved)
- [x] Spec coverage:
  - spec §Goal → Tasks 2-7 (codegen-enforce invariant)
  - spec §Scope (6 files) → Tasks 2-7
  - spec §Architecture (data flow) → Task 3 (script) + Task 7 (CLAUDE.md snapshot) + Task 4 (drift guard test)
  - spec §Script Interface → Task 3 (full script body)
  - spec §Constants Design → Task 2 (const map)
  - spec §CLAUDE.md Integration → Task 7 (marker + table)
  - spec §Drift Guard Test (7 assertions) → Task 4 (T1-T7)
  - spec §Verification Plan (8 steps) → Tasks 2 step 2, 4 step 2-3, 5 step 2, 8 step 1-7
  - spec §Risks → Task 1 (baseline derivation catches drift early) + Task 6 step 4 (hook syntax smoke) + Task 4 step 1 (tests/ root placement note)
  - spec §Why NOT Auto-Rewrite → Task 7 (copy-paste workflow)
- [x] P22b ESM trap applied: Task 4 test at `tests/` root (not `tests/lib/` or `tests/scripts/`)
- [x] P47 pattern mirrored: 7-assertion drift guard test
- [x] P43+P44 push lessons: Task 8 step 1 (fetch+rev-list) + Task 8 step 4 (bypass if hook stale)
- [x] Pre-commit hook path filter matches spec scope (slot 4 with src/data/{categories,tools}/*.ts + tests/lib/engine-count.ts + script + CLAUDE.md)
- [x] pnpm check chain slot 6 (before tests/run.mjs) — T7 drift guard can find script in chain
- [x] MEMORY.md template accounts for 6-commit batch (not 4 as estimated at top — corrected in Task 8 step 3)
- [x] Type consistency: `EXPECTED_ENGINES_BY_CATEGORY` referenced consistently across Tasks 2/3/4/5/6
- [x] Ship memory location matches P-series convention (`p49-engine-count-table-shipped.md`)