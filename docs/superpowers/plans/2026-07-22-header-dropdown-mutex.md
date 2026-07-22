# Header Dropdown Mutex — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Header dropdown overlap bug by adding a single-responsibility mutex script that enforces mutual exclusion across the 4 native `<details>` dropdowns (history / recent / favorites / categories). Closes the user-reported visual bug + standardizes click-outside and ESC-to-close behavior across all 4 dropdowns.

**Architecture:** 1 NEW script file (`src/scripts/header-dropdown-mutex.client.ts` ~50 lines, pure DOM coordination) + 1 NEW test file (`tests/header-dropdown-mutex.test.ts` ~200 lines, `node:test` + hand-rolled DOM stub + `spawnSync` per-test with 5 core assertions) + 1 line added to `src/layouts/BaseLayout.astro` (import) + 4 attrs added to `src/components/Header.astro` (`data-dropdown="..."`). Zero changes to existing init scripts (`history-init` / `recent-init` / `favorites-init` / `clerk-init` / `sync-init`).

**Tech Stack:** Vanilla TypeScript (browser DOM APIs); `node:test` + `tsx` for unit tests (project convention — see `tests/run.mjs`); hand-rolled DOM stub + `spawnSync` per-test pattern for module-state isolation (see `tests/favorites-init.test.ts` pattern); Astro 4.16.19 static site generator; `*.client.ts` suffix for Astro client-only bundling.

**Spec:** [`docs/superpowers/specs/2026-07-22-header-dropdown-mutex-design.md`](../specs/2026-07-22-header-dropdown-mutex-design.md) @ commit `15be97e`.

## Global Constraints

These constraints apply to every task. Each task's requirements implicitly include this section.

1. **Test location MUST be `tests/` root** — P22b ESM trap: `tests/run.mjs` reads `tests/*.test.ts` only. Subdir placement is silently skipped by `pnpm test:unit`.
2. **Zero changes to existing init scripts** — `history-init.client.ts` / `recent-init.client.ts` / `favorites-init.client.ts` / `clerk-init.client.ts` / `sync-init.client.ts` must not be touched (spec §1 Out-of-Scope).
3. **Header.astro modification is attr-only** — 4 `<details>` elements get `data-dropdown="..."` attribute; do NOT modify class / summary / panel content / nested `<span>` / `<svg>`.
4. **BaseLayout import order matters** — mutex script MUST be imported BEFORE favorites-init (current BaseLayout:162) so mutual-exclusion listeners register before any init script's content rendering (defensive; not strictly required for correctness since listeners are idempotent).
5. **Mutex script uses pure DOM APIs only** — no `localStorage` / no fetch / no third-party deps / no imports from `src/lib/`. Pure browser DOM coordination.
6. **TypeScript strict mode** — project uses `tsconfig.json` strict; mutex script must compile under strict (no `any` leaks, explicit return types on exported functions, defensive null checks).
7. **5 `node:test` assertions must cover the spec's 5 behaviors** — see spec §3. Use `node:test` + `node:assert/strict` (NOT vitest — vitest is NOT in `package.json`; project convention is `node:test` via tsx, see `tests/run.mjs`). Do NOT add e2e Playwright tests (out of scope, YAGNI).
8. **pnpm check target: 1152 → 1157 (+5 assertions)** — P54 baseline is 1152 pass / 0 fail / 0 skip. The new mutex test adds +5.
9. **3-way sync required at end** — origin (gitee: wlz679/calcKit) + github (github: wlz679/forgeflow) must reflect final commits. Apply P48 (pre-push fetch) + P44 (hook stale cache bypass).
10. **Ship memory writes to `~/.claude/projects/D--E-----youtube-tools/memory/`** — P47 + P49 + P50 + P51 + P52 + P53 + P54 patterns. MEMORY.md index updated.

---

## Task 1: Baseline verify before implementation

**Files:** None (read-only verification).

**Interfaces:**
- Consumes: nothing
- Produces: confirmation that current `pnpm check` baseline is 1152 pass / 0 fail / 0 skip + Header.astro + BaseLayout.astro structural snapshot matches spec §3 expected line numbers

- [ ] **Step 1.1: Verify pnpm check baseline is 1152/0/0**

Run: `pnpm check 2>&1 | tail -20`
Expected:
```
# tests 1152
# pass 1152
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

If baseline differs: STOP and report. The +5 target in Task 2/3 assumes 1152.

- [ ] **Step 1.2: Verify Header.astro has 4 `<details class="relative group">` elements (lines 40, 53, 66, 77)**

Run: `grep -n '<details class="relative group">' src/components/Header.astro`
Expected:
```
40:<details class="relative group">
53:<details class="relative group">
66:<details class="relative group">
77:<details class="relative group">
```

If line numbers differ: STOP and report. Task 3 depends on exact lines for surgical edits.

- [ ] **Step 1.3: Verify BaseLayout has 5 init script imports (lines 162-174)**

Run: `grep -n "import '\.\./scripts/" src/layouts/BaseLayout.astro`
Expected:
```
162:    import '../scripts/favorites-init.client.ts';
165:    import '../scripts/recent-init.client.ts';
168:    import '../scripts/history-init.client.ts';
171:    import '../scripts/clerk-init.client.ts';
174:    import '../scripts/sync-init.client.ts';
```

If line numbers differ: STOP and report. Task 3 inserts the mutex import at line 162 (before favorites-init).

- [ ] **Step 1.4: Verify `tests/header-dropdown-mutex.test.ts` does NOT exist yet (TDD red)**

Run: `ls tests/header-dropdown-mutex.test.ts 2>&1`
Expected: `ls: cannot access 'tests/header-dropdown-mutex.test.ts': No such file or directory`

If exists: STOP and investigate (orphan from prior attempt).

- [ ] **Step 1.5: Verify `src/scripts/header-dropdown-mutex.client.ts` does NOT exist yet**

Run: `ls src/scripts/header-dropdown-mutex.client.ts 2>&1`
Expected: `ls: cannot access 'src/scripts/header-dropdown-mutex.client.ts': No such file or directory`

If exists: STOP and investigate (orphan from prior attempt).

---

## Task 2: Write the failing test (TDD red)

**Files:**
- Create: `tests/header-dropdown-mutex.test.ts` (~200 lines)
- Modify: none (test-only file)

**Interfaces:**
- Consumes: `src/scripts/header-dropdown-mutex.client.ts` (does not yet exist — import will fail until Task 3); `node:test` runner via `tests/run.mjs`; `spawnSync` per-test pattern from `tests/favorites-init.test.ts:37-179`
- Produces: 5 `node:test` assertions covering spec §3 test matrix; all should FAIL at this point because the mutex module does not exist (or the red child-process scenario fails because mutex does not exist)

**Task class:** [MECHANICAL] (single-file test creation with clear assertion targets from spec §3). 1 reviewer (spec-compliance).

**AMENDMENT 2026-07-22 (mid-execution):** Original plan used vitest + jsdom, but `package.json` has neither (verified: `grep vitest` → no match, `grep jsdom` → no match). Project convention is `node:test` + `tsx` (see `tests/run.mjs:25-34`) + hand-rolled DOM stub + `spawnSync` per-test (see `tests/favorites-init.test.ts` pattern). This task now uses that pattern. Caught by Task 2 implementer with BLOCKED status; no production code touched.

- [ ] **Step 2.1: Create `tests/header-dropdown-mutex.test.ts` with 5 `node:test` cases (spawnSync per-test pattern)**

Create file `tests/header-dropdown-mutex.test.ts`:

```typescript
/**
 * Header dropdown mutex — unit tests.
 *
 * Spec: docs/superpowers/specs/2026-07-22-header-dropdown-mutex-design.md §3
 *
 * Pattern: hand-rolled DOM stub + spawnSync per-test (no jsdom/vitest).
 * Mirrors tests/favorites-init.test.ts but extends StubElement with
 * .closest(selector) + boolean .open (HTMLDetailsElement-ish) because
 * the mutex script calls element.closest() and reads .open.
 *
 * Run via: node tests/run.mjs tests/header-dropdown-mutex.test.ts
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// file:// URL for the mutex module under test.
const CWD_PATH = process.cwd().replace(/\\/g, '/');
const MUTEX_MOD_URL =
  'file:///' + CWD_PATH.replace(/^\/+/, '') + '/src/scripts/header-dropdown-mutex.client.ts';

// ============== DOM Stub (extended vs favorites-init) ==============
// Adds .closest() + boolean .open because the mutex script uses both.

class StubElement {
  constructor(tag, attrs = {}, dataset = {}) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parent = null;
    this.attrs = { ...attrs };
    this.dataset = { ...dataset };
    this._listeners = [];
    // HTMLDetailsElement — boolean open
    this.open = false;
  }
  appendChild(child) { this.children.push(child); child.parent = this; return child; }
  addEventListener(t, fn) { this._listeners.push({ type: t, fn }); }
  removeEventListener(t, fn) {
    this._listeners = this._listeners.filter(l => !(l.type === t && l.fn === fn));
  }
  dispatchEvent(ev) {
    ev.target = this;
    for (const l of this._listeners.filter(l => l.type === ev.type)) l.fn(ev);
    return !ev.defaultPrevented;
  }
  click() {
    // Mirror real HTMLSummaryElement.click — fires a bubbling MouseEvent
    this.dispatchEvent({ type: 'click', defaultPrevented: false });
  }
  // Walk up the parent chain looking for an element matching the selector.
  // Supports tag-only selectors (e.g. 'summary') and a single [attr="value"]
  // form used by the mutex script: closest('[data-dropdown] > *:not(summary)')
  // — implemented as "this element has the attribute and is a direct child
  // of [data-dropdown] and tag is not summary".
  closest(selector) {
    let cur = this;
    // Direct child-of-[data-dropdown]-and-not-summary check first
    if (selector === '[data-dropdown] > *:not(summary)') {
      while (cur) {
        if (cur.parent && cur.parent.matches?.('details[data-dropdown]') && cur.tagName.toLowerCase() !== 'summary') {
          return cur;
        }
        cur = cur.parent;
      }
      return null;
    }
    // Generic tag selector (e.g. 'summary')
    const tagMatch = selector.match(/^([a-zA-Z][a-zA-Z0-9-]*)$/);
    if (tagMatch) {
      const tag = tagMatch[1].toLowerCase();
      while (cur) {
        if (cur.tagName && cur.tagName.toLowerCase() === tag) return cur;
        cur = cur.parent;
      }
      return null;
    }
    return null;
  }
  matches(selector) {
    // Minimal selector matcher for 'details[data-dropdown]'
    const m = selector.match(/^([a-zA-Z][a-zA-Z0-9-]*)\[(\w[\w-]*)\]$/);
    if (!m) return false;
    const [, tag, attr] = m;
    if (this.tagName.toLowerCase() !== tag.toLowerCase()) return false;
    return this.attrs[attr] !== undefined;
  }
  querySelectorAll(sel) {
    const out = [];
    const matches = (n, s) => {
      s = s.trim();
      const m = s.match(/^([a-zA-Z][a-zA-Z0-9-]*)?\[(\w[\w-]*)(?:="([^"]*)")?\]$/);
      if (m) {
        const [, tag, attr, val] = m;
        if (tag && n.tagName.toLowerCase() !== tag.toLowerCase()) return false;
        if (val === undefined) {
          return n.attrs[attr] !== undefined;
        }
        return n.attrs[attr] === val;
      }
      return n.tagName.toLowerCase() === s.toLowerCase();
    };
    const walk = (n) => {
      if (matches(n, sel)) out.push(n);
      for (const c of n.children) walk(c);
    };
    for (const c of this.children) walk(c);
    return out;
  }
}

class StubEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.defaultPrevented = false;
    Object.assign(this, init);
  }
  preventDefault() { this.defaultPrevented = true; }
}

class StubKeyboardEvent extends StubEvent {
  constructor(type, init = {}) { super(type, init); this.key = init.key ?? ''; }
}

// ============== Test DOM factory ==============

function buildDom() {
  const body = new StubElement('body');
  const windowEl = { location: { pathname: '/en/' }, addEventListener() {}, removeEventListener() {} };

  function makeDetails(name) {
    const d = new StubElement('details', { class: 'relative group', 'data-dropdown': name });
    const s = new StubElement('summary');
    const inner = new StubElement('div');
    d.appendChild(s);
    d.appendChild(inner);
    return d;
  }
  for (const n of ['history', 'recent', 'favorites', 'categories']) {
    body.appendChild(makeDetails(n));
  }

  const doc = {
    body,
    addEventListener(t, fn) { windowEl._listeners = windowEl._listeners || []; windowEl._listeners.push({ type: t, fn }); },
    removeEventListener(t, fn) {
      windowEl._listeners = (windowEl._listeners || []).filter(l => !(l.type === t && l.fn === fn));
    },
    dispatchEvent(ev) {
      ev.target = doc;
      const ls = windowEl._listeners || [];
      for (const l of ls.filter(l => l.type === ev.type)) l.fn(ev);
      return !ev.defaultPrevented;
    },
    querySelectorAll(sel) { return body.querySelectorAll(sel); },
  };
  windowEl.document = doc;
  return { body, doc, windowEl };
}

// ============== Per-test runner ==============

function runScenario(scenarioBody) {
  const tmp = mkdtempSync(join(tmpdir(), 'mutex-'));
  const scenarioPath = join(tmp, 'scenario.mjs');
  const fullBody = `
const MUTEX_MOD_URL = '${MUTEX_MOD_URL.replace(/'/g, "\\'")}';
${StubElement.toString()}
${StubEvent.toString()}
${StubKeyboardEvent.toString()}
${buildDom.toString()}
const { body, doc, windowEl } = buildDom();
globalThis.document = doc;
globalThis.window = windowEl;
globalThis.HTMLElement = StubElement;
globalThis.Event = StubEvent;
globalThis.KeyboardEvent = StubKeyboardEvent;
${scenarioBody}
`;
  writeFileSync(scenarioPath, fullBody);
  const r = spawnSync('node', ['--import', 'tsx', scenarioPath], {
    cwd: process.cwd(),
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_NO_WARNINGS: '1' },
  });
  if (r.status !== 0) {
    // Expected for TDD red: module-not-found for mutex. Throw with stderr so
    // the parent test assertion catches the expected failure mode.
    throw new Error(`child failed (status ${r.status}): stderr=${r.stderr.toString().slice(0, 500)}`);
  }
  const lastLine = r.stdout.toString().trim().split('\\n').filter(Boolean).pop();
  return JSON.parse(lastLine);
}

// ============== Tests ==============

test('test 1: default state — all 4 details are closed', () => {
  const result = runScenario(`
(async () => {
  await import(MUTEX_MOD_URL);
  const h = doc.querySelectorAll('details[data-dropdown="history"]')[0].open;
  const r = doc.querySelectorAll('details[data-dropdown="recent"]')[0].open;
  const f = doc.querySelectorAll('details[data-dropdown="favorites"]')[0].open;
  const c = doc.querySelectorAll('details[data-dropdown="categories"]')[0].open;
  console.log(JSON.stringify({ h, r, f, c }));
})().catch(e => { console.error(e); process.exit(1); });
`);
  assert.equal(result.h, false);
  assert.equal(result.r, false);
  assert.equal(result.f, false);
  assert.equal(result.c, false);
});

test('test 2: click history summary → only history opens', () => {
  const result = runScenario(`
(async () => {
  await import(MUTEX_MOD_URL);
  const history = doc.querySelectorAll('details[data-dropdown="history"]')[0];
  const recent = doc.querySelectorAll('details[data-dropdown="recent"]')[0];
  const fav = doc.querySelectorAll('details[data-dropdown="favorites"]')[0];
  const cat = doc.querySelectorAll('details[data-dropdown="categories"]')[0];
  history.children[0].click();
  console.log(JSON.stringify({ h: history.open, r: recent.open, f: fav.open, c: cat.open }));
})().catch(e => { console.error(e); process.exit(1); });
`);
  assert.equal(result.h, true);
  assert.equal(result.r, false);
  assert.equal(result.f, false);
  assert.equal(result.c, false);
});

test('test 3: click history then click recent → only recent open (mutual exclusion)', () => {
  const result = runScenario(`
(async () => {
  await import(MUTEX_MOD_URL);
  const history = doc.querySelectorAll('details[data-dropdown="history"]')[0];
  const recent = doc.querySelectorAll('details[data-dropdown="recent"]')[0];
  const fav = doc.querySelectorAll('details[data-dropdown="favorites"]')[0];
  const cat = doc.querySelectorAll('details[data-dropdown="categories"]')[0];
  history.children[0].click();
  recent.children[0].click();
  console.log(JSON.stringify({ h: history.open, r: recent.open, f: fav.open, c: cat.open }));
})().catch(e => { console.error(e); process.exit(1); });
`);
  assert.equal(result.h, false);
  assert.equal(result.r, true);
  assert.equal(result.f, false);
  assert.equal(result.c, false);
});

test('test 4: ESC key closes all open dropdowns', () => {
  const result = runScenario(`
(async () => {
  await import(MUTEX_MOD_URL);
  const history = doc.querySelectorAll('details[data-dropdown="history"]')[0];
  const recent = doc.querySelectorAll('details[data-dropdown="recent"]')[0];
  const fav = doc.querySelectorAll('details[data-dropdown="favorites"]')[0];
  const cat = doc.querySelectorAll('details[data-dropdown="categories"]')[0];
  history.children[0].click();
  recent.children[0].click();
  doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  console.log(JSON.stringify({ h: history.open, r: recent.open, f: fav.open, c: cat.open }));
})().catch(e => { console.error(e); process.exit(1); });
`);
  assert.equal(result.h, false);
  assert.equal(result.r, false);
  assert.equal(result.f, false);
  assert.equal(result.c, false);
});

test('test 5: click outside (body) closes open dropdown', () => {
  const result = runScenario(`
(async () => {
  await import(MUTEX_MOD_URL);
  const history = doc.querySelectorAll('details[data-dropdown="history"]')[0];
  const recent = doc.querySelectorAll('details[data-dropdown="recent"]')[0];
  const fav = doc.querySelectorAll('details[data-dropdown="favorites"]')[0];
  const cat = doc.querySelectorAll('details[data-dropdown="categories"]')[0];
  history.children[0].click();
  body.click();
  console.log(JSON.stringify({ h: history.open, r: recent.open, f: fav.open, c: cat.open }));
})().catch(e => { console.error(e); process.exit(1); });
`);
  assert.equal(result.h, false);
  assert.equal(result.r, false);
  assert.equal(result.f, false);
  assert.equal(result.c, false);
});
```

- [ ] **Step 2.2: Run test file to verify it FAILS (mutex module missing — spawnSync child fails)**

Run: `node --import tsx tests/header-dropdown-mutex.test.ts 2>&1 | tail -30`
Expected: FAIL — each `test(...)` spawns a child that imports the missing `MUTEX_MOD_URL` (i.e. `src/scripts/header-dropdown-mutex.client.ts`). The child process will fail with module-not-found; the parent test catches via `runScenario`'s `throw new Error(...)`. The expected output is 5 failing test entries, each with stderr containing `Cannot find module` for `header-dropdown-mutex.client`.

If tests pass unexpectedly: STOP and investigate (mutex module may exist from prior commit).

If tests fail for OTHER reasons (e.g. TypeScript syntax error in test file, or stub class `toString()` injection broken): fix the test file and retry.

Run full suite via the project runner to ensure the new test file integrates:
Run: `node tests/run.mjs tests/header-dropdown-mutex.test.ts 2>&1 | tail -15`
Expected: same FAIL behavior (the project runner invokes tsx on the file).

---

## Task 3: Implement mutex script (TDD green)

**Files:**
- Create: `src/scripts/header-dropdown-mutex.client.ts` (~50 lines)
- Modify: none (no other source touched yet — integration in Task 4)

**Interfaces:**
- Consumes: browser DOM APIs (`document`, `Element.closest`, `HTMLDetailsElement`, `KeyboardEvent`); 4 `<details data-dropdown="...">` elements in Header.astro (not yet wired in Task 4 but the script is general)
- Produces: 3 document-level event listeners (click for summary toggle, click for outside-close, keydown for ESC); no exported functions; pure side-effect module (matches `src/scripts/favorites-init.client.ts` pattern)

**Task class:** [MECHANICAL] (single-file ~50-line implementation, spec §3 pseudo-code is the spec). 1 reviewer (spec-compliance).

- [ ] **Step 3.1: Create `src/scripts/header-dropdown-mutex.client.ts`**

Create file `src/scripts/header-dropdown-mutex.client.ts`:

```typescript
/**
 * Header dropdown mutex — enforce mutual exclusion across the 4 Header
 * `<details data-dropdown="...">` dropdowns (history / recent / favorites
 * / categories). Pure DOM coordination, zero deps, no LS / no fetch.
 *
 * Behavior:
 *   1. Click on any <summary> inside a details[data-dropdown] → close all
 *      other such dropdowns, toggle current.
 *   2. Click outside any such dropdown (not on summary, not inside panel)
 *      → close all.
 *   3. ESC key → close all.
 *
 * Spec: docs/superpowers/specs/2026-07-22-header-dropdown-mutex-design.md
 */

const DROPDOWN_SELECTOR = 'details[data-dropdown]';

function closeAllExcept(target: HTMLDetailsElement | null): void {
  document.querySelectorAll<HTMLDetailsElement>(DROPDOWN_SELECTOR).forEach((d) => {
    if (d !== target && d.open) d.open = false;
  });
}

// 1) summary click → mutual-exclusion toggle
document.addEventListener('click', (e) => {
  const target = e.target as Element | null;
  const summary = target?.closest('summary');
  const details = summary?.parentElement;
  if (!details || !(details instanceof HTMLDetailsElement)) return;
  if (!details.matches(DROPDOWN_SELECTOR)) return;
  e.preventDefault(); // suppress browser's native <details> toggle
  const wasOpen = details.open;
  closeAllExcept(details);
  details.open = !wasOpen;
});

// 2) click outside any dropdown → close all
document.addEventListener('click', (e) => {
  const target = e.target as Element | null;
  if (!target) return;
  if (target.closest('summary')) return; // summary click handled by listener #1
  if (target.closest('[data-dropdown] > *:not(summary)')) return; // inside a panel — keep open
  closeAllExcept(null);
});

// 3) ESC → close all
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAllExcept(null);
});
```

- [ ] **Step 3.2: Run test file to verify it now PASSES (all 5 green)**

Run: `node tests/run.mjs tests/header-dropdown-mutex.test.ts 2>&1 | tail -25`
Expected:
```
▶ tests/header-dropdown-mutex.test.ts
  ✔ test 1: default state — all 4 details are closed
  ✔ test 2: click history summary → only history opens
  ✓ header-dropdown-mutex > test 3: click history then click recent → mutual exclusion (only recent open)
  ✓ header-dropdown-mutex > test 4: ESC key closes all open dropdowns
  ✓ header-dropdown-mutex > test 5: click outside (document.body) closes open dropdown

Test Files  1 passed (1)
     Tests  5 passed (5)
```

If any test fails: STOP and investigate. Common bugs:
- `instanceof HTMLDetailsElement` check missing → Element-only path would still work but TS strict may complain about `details.open` access.
- `e.preventDefault()` not called → native `<details>` toggles BEFORE our manual toggle, causing double-flip.

- [ ] **Step 3.3: Run pnpm check to verify full suite green (1152 → 1157, +5)**

Run: `pnpm check 2>&1 | tail -10`
Expected:
```
# tests 1157
# pass 1157
# fail 0
```

If fail count > 0: STOP and investigate (something else regressed).

- [ ] **Step 3.4: Commit mutex module + test**

```bash
git add src/scripts/header-dropdown-mutex.client.ts tests/header-dropdown-mutex.test.ts
git commit -m "feat(p55): header dropdown mutex + 5 node:test cases

adds single-responsibility client script that enforces mutual exclusion
across the 4 Header <details> dropdowns (history/recent/favorites/
categories). closes user-reported overlap bug.

also adds click-outside-to-close and ESC-to-close as standard
dropdown affordances.

5 node:test assertions (spawnSync per-test + hand-rolled DOM stub)
cover: default closed, summary click open, mutual exclusion on
subsequent click, ESC close all, click-outside close.

zero changes to existing init scripts (history-init / recent-init /
favorites-init / clerk-init / sync-init).
zero changes to Header.astro structure (attr-only edits in Task 4)."
```

---

## Task 4: Wire mutex into BaseLayout + Header

**Files:**
- Modify: `src/layouts/BaseLayout.astro` (+1 `<script>` block at line 162)
- Modify: `src/components/Header.astro` (+4 attrs at lines 40, 53, 66, 77)

**Interfaces:**
- Consumes: Task 3's `src/scripts/header-dropdown-mutex.client.ts` (registered listeners activate on DOM load via Astro client bundling); Header's existing 4 `<details class="relative group">` elements
- Produces: BaseLayout imports mutex module; 4 `<details>` carry `data-dropdown` identifiers that mutex script's `DROPDOWN_SELECTOR` matches

**Task class:** [MECHANICAL] (surgical attr + 1-line import). 1 reviewer (spec-compliance).

- [ ] **Step 4.1: Add mutex import to BaseLayout.astro BEFORE favorites-init**

Read `src/layouts/BaseLayout.astro` around line 161-162 to confirm exact context. The current structure (verified in spec §8 Global Constraint 4 baseline):

```astro
  <script>
    import '../scripts/favorites-init.client.ts';
  </script>
```

Insert a new `<script>` block IMMEDIATELY BEFORE the favorites-init block (becomes new line 161, shifts favorites-init to 164):

```astro
  <script>
    import '../scripts/header-dropdown-mutex.client.ts';
  </script>
  <script>
    import '../scripts/favorites-init.client.ts';
  </script>
```

After edit, verify line numbers via `grep -n "import '\.\./scripts/" src/layouts/BaseLayout.astro`:
Expected:
```
161:    import '../scripts/header-dropdown-mutex.client.ts';
164:    import '../scripts/favorites-init.client.ts';
167:    import '../scripts/recent-init.client.ts';
170:    import '../scripts/history-init.client.ts';
173:    import '../scripts/clerk-init.client.ts';
176:    import '../scripts/sync-init.client.ts';
```

If line numbers differ from above (i.e., favorites-init at 162 instead of 164): the edit was not done correctly — undo and retry.

- [ ] **Step 4.2: Add `data-dropdown` attribute to 4 details in Header.astro**

Edit `src/components/Header.astro` to add `data-dropdown="..."` to each of the 4 `<details class="relative group">` lines:

Line 40:
- Before: `<details class="relative group">`
- After:  `<details class="relative group" data-dropdown="history">`

Line 53:
- Before: `<details class="relative group">`
- After:  `<details class="relative group" data-dropdown="recent">`

Line 66:
- Before: `<details class="relative group">`
- After:  `<details class="relative group" data-dropdown="favorites">`

Line 77:
- Before: `<details class="relative group">`
- After:  `<details class="relative group" data-dropdown="categories">`

After edit, verify via `grep -n 'data-dropdown' src/components/Header.astro`:
Expected:
```
40:<details class="relative group" data-dropdown="history">
53:<details class="relative group" data-dropdown="recent">
66:<details class="relative group" data-dropdown="favorites">
77:<details class="relative group" data-dropdown="categories">
```

If any line missing or wrong attribute value: undo and retry.

- [ ] **Step 4.3: Re-run node:test to verify tests still green after wiring**

Run: `node tests/run.mjs tests/header-dropdown-mutex.test.ts 2>&1 | tail -15`
Expected: 5 passed (tests don't read real Header.astro — they construct their own DOM via buildDom() — so this should still pass).

- [ ] **Step 4.4: Run full pnpm check**

Run: `pnpm check 2>&1 | tail -10`
Expected:
```
# tests 1157
# pass 1157
# fail 0
```

If fail count > 0: STOP and investigate (likely a TS error in BaseLayout or Header.astro from the edits — verify attribute syntax).

- [ ] **Step 4.5: Run pnpm build to verify static site still builds (313+ pages)**

Run: `pnpm build 2>&1 | tail -15`
Expected: build completes successfully with page count unchanged (313+ pages). Watch for:
- Astro compilation errors
- `data-dropdown` attribute type errors (Astro should treat unknown data-* attrs as plain attributes — no TS strict issue)

If build fails: STOP and investigate.

- [ ] **Step 4.6: Commit wiring changes**

```bash
git add src/layouts/BaseLayout.astro src/components/Header.astro
git commit -m "feat(p55): wire mutex script into BaseLayout + Header attrs

imports header-dropdown-mutex.client.ts as the first client script
(before favorites-init) so mutual-exclusion listeners register before
any init script's content rendering.

adds data-dropdown='history|recent|favorites|categories' attribute to
the 4 Header <details> elements, enabling DROPDOWN_SELECTOR matching.

zero class / structure / nested-element changes to Header.astro."
```

---

## Task 5: Ship — 3-way sync + memory append

**Files:**
- Create: `~/.claude/projects/D--E-----youtube-tools/memory/p55-header-dropdown-mutex-shipped.md`
- Modify: `~/.claude/projects/D--E-----youtube-tools/memory/MEMORY.md` (add 1-line index entry)

**Interfaces:**
- Consumes: local commits from Tasks 3 + 4; P44 bypass command pattern; P48 race condition pattern
- Produces: origin (gitee) + github (forgeflow) + local all on same SHA; memory index updated

**Task class:** [MECHANICAL] (standard ship pattern from P53/P54). 1 reviewer (spec-compliance).

- [ ] **Step 5.1: Pre-flight — verify local 2 commits ahead of origin + github**

Run:
```bash
git fetch origin && git fetch github && echo "=== origin/master ===" && git rev-parse origin/master && echo "=== github/master ===" && git rev-parse github/master && echo "=== local/master ===" && git rev-parse master
```

Expected: origin and github at SHAs BEFORE Task 3 (i.e., `15be97e` or earlier); local 2 commits ahead.

If origin/github are already at local SHA (race with GH Action cron): STOP and apply P48 reset+cherry-pick pattern.

- [ ] **Step 5.2: Push to origin (gitee: wlz679/calcKit)**

Run: `git push origin master 2>&1 | tail -5`
Expected: push succeeds, reports `* [new branch] master -> master` or similar (master may be fast-forward).

- [ ] **Step 5.3: Push to github (github: wlz679/forgeflow) — P44 bypass if hook stale-cache**

Run: `git push github master 2>&1 | tail -5`
Expected: push succeeds.

If push is blocked by pre-push hook with "ahead=0" false-negative: apply P44 bypass:
```bash
git -c core.hooksPath=/dev/null push github master 2>&1 | tail -5
```

- [ ] **Step 5.4: Verify 3-way sync `0\t0`**

Run:
```bash
echo "=== origin ahead of local ===" && git rev-list --left-right --count origin/master...master
echo "=== github ahead of local ===" && git rev-list --left-right --count github/master...master
```

Expected: `0\t0` and `0\t0`.

If divergence detected: STOP and resolve before claiming ship complete.

- [ ] **Step 5.5: Write ship memory file**

Create file `~/.claude/projects/D--E-----youtube-tools/memory/p55-header-dropdown-mutex-shipped.md`:

```markdown
---
name: p55-header-dropdown-mutex-shipped
description: P55 ship log — Header dropdown mutex bug fix (4 details mutual exclusion + ESC + click-outside)
metadata:
  type: project
---

# P55 — Header dropdown mutex — shipped 2026-07-22

> 2 commits, ~140 LOC (+50 mutex + 90 test + 5 BaseLayout/Header edits), 1152 → 1157 (+5).
> Closes user-reported visual bug: 4 Header `<details>` dropdowns (history/recent/favorites/categories) overlap when opened sequentially because HTML `<details>` has no built-in mutual-exclusion.

## What shipped

- `src/scripts/header-dropdown-mutex.client.ts` (~50 LOC) — pure DOM coordination; 3 document-level listeners (summary click toggle / click-outside / ESC); ZERO deps / ZERO LS / ZERO init-script coupling.
- `tests/header-dropdown-mutex.test.ts` (~200 LOC) — 5 `node:test` cases (spawnSync per-test pattern, hand-rolled DOM stub with `.closest` + boolean `.open`) covering spec §3 test matrix (default closed, summary click open, mutual exclusion, ESC, click-outside).
- `src/layouts/BaseLayout.astro` — 1 new `<script>` import at line 161 (BEFORE favorites-init).
- `src/components/Header.astro` — 4 `data-dropdown="..."` attrs added (lines 40/53/66/77); ZERO class / structure / nested-element changes.

## Key design decisions

- **Single-responsibility module** — mutex script does ONLY open/close coordination; init scripts (history-init/recent-init/favorites-init) keep doing panel rendering + badge updates + save logic untouched.
- **Pure DOM, zero deps** — no `localStorage`, no fetch, no third-party; matches Astro client-bundle YAGNI bar.
- **Defensive null checks + `instanceof HTMLDetailsElement`** — strict TS compliance; safe under hand-rolled DOM stub + real browsers.
- **3 listeners as separate document.addEventListener** — separation of concerns (toggle vs outside-close vs ESC); each handler has explicit return guards to avoid double-processing same click.

## pnpm check

`# tests 1157 / # pass 1157 / # fail 0` (P54 baseline 1152 + 5 new).

## 3-way sync

`origin\tlocal: 0\t0` and `github\tlocal: 0\t0` at final commit.

## What deferred to P56+ candidates

- aria-expanded / aria-haspopup enhancement (YAGNI; native `<details>` already semantic).
- focus trap (YAGNI; mouse + simple keyboard only).
- Click-inside-panel-to-close (spec §5 ③ locked as "keep open" — different from Notion-style).
- Open/close animation (YAGNI; native toggle has no animation, but visual change is acceptable).

## How to apply

Pattern: **single-responsibility client scripts that coordinate DOM behavior across multiple pre-existing components**. Apply when:
- Multiple UI components share a coordination concern (mutual exclusion, focus management, keyboard shortcuts).
- Coordination logic would muddy the existing components' single responsibilities if inlined.
- Zero persistence / zero network — pure DOM.

## Cross-refs

- Spec: [`docs/superpowers/specs/2026-07-22-header-dropdown-mutex-design.md`](../../../../D--E-----youtube-tools/docs/superpowers/specs/2026-07-22-header-dropdown-mutex-design.md)
- Plan: [`docs/superpowers/plans/2026-07-22-header-dropdown-mutex.md`](../../../../D--E-----youtube-tools/docs/superpowers/plans/2026-07-22-header-dropdown-mutex.md)
```

- [ ] **Step 5.6: Update MEMORY.md index**

Append a 1-line entry to `~/.claude/projects/D--E-----youtube-tools/memory/MEMORY.md` under "## P17+ (active batches — cascade audit + INDEX series)" (or new section if needed):

```
- [P55 header-dropdown-mutex shipped](p55-header-dropdown-mutex-shipped.md) — N commits `xxx`+`yyy` 2026-07-22; 4 details mutual exclusion + ESC + click-outside; +5 node:test cases; mutex script single-responsibility + zero init-script changes; closes user-reported overlap bug
```

Replace `xxx` and `yyy` with the actual commit SHAs from Task 3 (mutex + test) and Task 4 (BaseLayout + Header wiring). Verify via `git log --oneline -5`.

- [ ] **Step 5.7: Final verification — manual browser check (optional but recommended)**

If user has dev server running (`pnpm dev`):
1. Navigate to any page (e.g., `/zh/`).
2. Click "历史快照" → opens. Click "最近浏览" → history closes, recent opens.
3. Click "收藏" → recent closes, favorites opens.
4. Click outside (hero area) → favorites closes.
5. Press ESC on open dropdown → closes.
6. Reload page → verify no console errors related to `header-dropdown-mutex`.

Report results to user. If any step fails, file a follow-up bug.

---

## Self-Review Checklist (run before committing plan)

- [x] **Spec coverage:** every spec §3 test → covered by Task 2 Step 2.1 (test cases 1-5)
- [x] **Spec coverage:** spec §2 architecture (1 new file + 1 import + 4 attrs) → covered by Tasks 3, 4
- [x] **Spec coverage:** spec §4 data flow (3 listeners) → covered by Task 3 Step 3.1 (3 addEventListener)
- [x] **Spec coverage:** spec §5 8 interaction decisions → all 8 covered (1→test 2, 2→test 3, 3→test 5 implicitly via click-outside listener, 4→click-outside listener excludes panel-internal, 5→test 5, 6→test 4, 7→test 4, 8→test 2 then test 3 implicit)
- [x] **Spec coverage:** spec §6 error handling → covered by `instanceof` + `?.` null checks in Task 3 Step 3.1
- [x] **Spec coverage:** spec §8 global constraints → covered by Global Constraints 1-10 above
- [x] **Spec coverage:** spec §9 verification checklist → covered by Task 4 Step 4.4 (pnpm check) + Step 4.5 (pnpm build) + Task 5 Step 5.7 (manual browser)
- [x] **No placeholders:** TBD / TODO / "implement later" — none present in plan
- [x] **Type consistency:** `DROPDOWN_SELECTOR` defined in Task 3 Step 3.1 matches selector used in test (test uses `details[data-dropdown="${name}"]` which is same pattern); `closeAllExcept` signature `(HTMLDetailsElement | null) => void` matches both internal call sites
- [x] **File paths:** all absolute / repo-relative, all verified in Task 1 Step 1.2-1.5