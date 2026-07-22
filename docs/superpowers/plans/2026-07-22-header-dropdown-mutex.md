# Header Dropdown Mutex — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Header dropdown overlap bug by adding a single-responsibility mutex script that enforces mutual exclusion across the 4 native `<details>` dropdowns (history / recent / favorites / categories). Closes the user-reported visual bug + standardizes click-outside and ESC-to-close behavior across all 4 dropdowns.

**Architecture:** 1 NEW script file (`src/scripts/header-dropdown-mutex.client.ts` ~50 lines, pure DOM coordination) + 1 NEW test file (`tests/header-dropdown-mutex.test.ts` ~80 lines, vitest + jsdom with 5 core assertions) + 1 line added to `src/layouts/BaseLayout.astro` (import) + 4 attrs added to `src/components/Header.astro` (`data-dropdown="..."`). Zero changes to existing init scripts (`history-init` / `recent-init` / `favorites-init` / `clerk-init` / `sync-init`).

**Tech Stack:** Vanilla TypeScript (browser DOM APIs); vitest 2.x + jsdom (already in `package.json`); Astro 4.16.19 static site generator; `*.client.ts` suffix for Astro client-only bundling.

**Spec:** [`docs/superpowers/specs/2026-07-22-header-dropdown-mutex-design.md`](../specs/2026-07-22-header-dropdown-mutex-design.md) @ commit `15be97e`.

## Global Constraints

These constraints apply to every task. Each task's requirements implicitly include this section.

1. **Test location MUST be `tests/` root** — P22b ESM trap: `tests/run.mjs` reads `tests/*.test.ts` only. Subdir placement is silently skipped by `pnpm test:unit`.
2. **Zero changes to existing init scripts** — `history-init.client.ts` / `recent-init.client.ts` / `favorites-init.client.ts` / `clerk-init.client.ts` / `sync-init.client.ts` must not be touched (spec §1 Out-of-Scope).
3. **Header.astro modification is attr-only** — 4 `<details>` elements get `data-dropdown="..."` attribute; do NOT modify class / summary / panel content / nested `<span>` / `<svg>`.
4. **BaseLayout import order matters** — mutex script MUST be imported BEFORE favorites-init (current BaseLayout:162) so mutual-exclusion listeners register before any init script's content rendering (defensive; not strictly required for correctness since listeners are idempotent).
5. **Mutex script uses pure DOM APIs only** — no `localStorage` / no fetch / no third-party deps / no imports from `src/lib/`. Pure browser DOM coordination.
6. **TypeScript strict mode** — project uses `tsconfig.json` strict; mutex script must compile under strict (no `any` leaks, explicit return types on exported functions, defensive null checks).
7. **5 vitest assertions must cover the spec's 5 behaviors** — see spec §3. Do NOT add e2e Playwright tests (out of scope, YAGNI).
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
- Create: `tests/header-dropdown-mutex.test.ts` (~110 lines)
- Modify: none (test-only file)

**Interfaces:**
- Consumes: `src/scripts/header-dropdown-mutex.client.ts` (does not yet exist — import will fail until Task 3); jsdom environment (vitest config provides); `document.querySelectorAll('details[data-dropdown]')`
- Produces: 5 vitest assertions covering spec §3 test matrix; all should FAIL at this point because the mutex module does not exist

**Task class:** [MECHANICAL] (single-file test creation with clear assertion targets from spec §3). 1 reviewer (spec-compliance).

- [ ] **Step 2.1: Create `tests/header-dropdown-mutex.test.ts` with 5 vitest cases**

Create file `tests/header-dropdown-mutex.test.ts`:

```typescript
/**
 * Header dropdown mutex — unit tests.
 *
 * Spec: docs/superpowers/specs/2026-07-22-header-dropdown-mutex-design.md §3
 *
 * Mocks 4 native <details data-dropdown="..."> elements with attached
 * <summary> + <div data-foo-container> children, loads the mutex module
 * (which registers 3 document-level listeners), and verifies the 5
 * core mutual-exclusion behaviors.
 *
 * Each test resets DOM via document.body.innerHTML = '...' to isolate state.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Import mutex module — registers 3 document-level listeners once per module load.
// Listener registration is idempotent (addEventListener dedup not required for
// the 5 assertions because beforeEach() reinstalls fresh DOM, listeners stay
// bound to document and fire for the new DOM nodes).
import '../src/scripts/header-dropdown-mutex.client';

const HEADER_HTML = `
  <header>
    <details class="relative group" data-dropdown="history">
      <summary>History</summary>
      <div data-history-container></div>
    </details>
    <details class="relative group" data-dropdown="recent">
      <summary>Recent</summary>
      <div data-recent-container></div>
    </details>
    <details class="relative group" data-dropdown="favorites">
      <summary>Favorites</summary>
      <div data-favorites-container></div>
    </details>
    <details class="relative group" data-dropdown="categories">
      <summary>Categories</summary>
      <ul></ul>
    </details>
  </header>
`;

function getDetails(name: string): HTMLDetailsElement {
  const el = document.querySelector<HTMLDetailsElement>(`details[data-dropdown="${name}"]`);
  if (!el) throw new Error(`details[data-dropdown="${name}"] not found in test DOM`);
  return el;
}

function getSummary(name: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(`details[data-dropdown="${name}"] > summary`);
  if (!el) throw new Error(`summary for ${name} not found`);
  return el;
}

beforeEach(() => {
  // Reset DOM to fresh 4-details layout before each test
  document.body.innerHTML = HEADER_HTML;
});

describe('header-dropdown-mutex', () => {
  it('test 1: default state — all 4 details are closed', () => {
    expect(getDetails('history').open).toBe(false);
    expect(getDetails('recent').open).toBe(false);
    expect(getDetails('favorites').open).toBe(false);
    expect(getDetails('categories').open).toBe(false);
  });

  it('test 2: click history summary → only history opens', () => {
    getSummary('history').click();
    expect(getDetails('history').open).toBe(true);
    expect(getDetails('recent').open).toBe(false);
    expect(getDetails('favorites').open).toBe(false);
    expect(getDetails('categories').open).toBe(false);
  });

  it('test 3: click history then click recent → mutual exclusion (only recent open)', () => {
    getSummary('history').click();
    expect(getDetails('history').open).toBe(true);

    getSummary('recent').click();
    expect(getDetails('history').open).toBe(false);
    expect(getDetails('recent').open).toBe(true);
    expect(getDetails('favorites').open).toBe(false);
    expect(getDetails('categories').open).toBe(false);
  });

  it('test 4: ESC key closes all open dropdowns', () => {
    getSummary('history').click();
    getSummary('recent').click();
    expect(getDetails('recent').open).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(getDetails('history').open).toBe(false);
    expect(getDetails('recent').open).toBe(false);
    expect(getDetails('favorites').open).toBe(false);
    expect(getDetails('categories').open).toBe(false);
  });

  it('test 5: click outside (document.body) closes open dropdown', () => {
    getSummary('history').click();
    expect(getDetails('history').open).toBe(true);

    // Click on body itself (not on summary or inside any details panel)
    document.body.click();

    expect(getDetails('history').open).toBe(false);
    expect(getDetails('recent').open).toBe(false);
    expect(getDetails('favorites').open).toBe(false);
    expect(getDetails('categories').open).toBe(false);
  });
});
```

- [ ] **Step 2.2: Run test file to verify it FAILS (mutex module missing)**

Run: `pnpm vitest run tests/header-dropdown-mutex.test.ts 2>&1 | tail -30`
Expected: FAIL with module-not-found error referencing `src/scripts/header-dropdown-mutex.client.ts` (or similar — the exact error depends on vitest config but should be import resolution failure for the mutex module path).

If test passes unexpectedly: STOP and investigate (mutex module may exist from prior commit; constraint 5 may be violated).

If test fails for other reasons (syntax error in test file): fix the test file and retry.

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

Run: `pnpm vitest run tests/header-dropdown-mutex.test.ts 2>&1 | tail -20`
Expected:
```
✓ tests/header-dropdown-mutex.test.ts (5)
  ✓ header-dropdown-mutex > test 1: default state — all 4 details are closed
  ✓ header-dropdown-mutex > test 2: click history summary → only history opens
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
git commit -m "feat(p55): header dropdown mutex + 5 vitest cases

adds single-responsibility client script that enforces mutual exclusion
across the 4 Header <details> dropdowns (history/recent/favorites/
categories). closes user-reported overlap bug.

also adds click-outside-to-close and ESC-to-close as standard
dropdown affordances.

5 vitest assertions cover: default closed, summary click open,
mutual exclusion on subsequent click, ESC close all, click-outside close.

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

- [ ] **Step 4.3: Re-run vitest to verify tests still green after wiring**

Run: `pnpm vitest run tests/header-dropdown-mutex.test.ts 2>&1 | tail -10`
Expected: 5 passed (tests don't read real Header.astro — they construct their own DOM — so this should still pass).

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
- `tests/header-dropdown-mutex.test.ts` (~110 LOC) — 5 vitest cases covering spec §3 test matrix (default closed, summary click open, mutual exclusion, ESC, click-outside).
- `src/layouts/BaseLayout.astro` — 1 new `<script>` import at line 161 (BEFORE favorites-init).
- `src/components/Header.astro` — 4 `data-dropdown="..."` attrs added (lines 40/53/66/77); ZERO class / structure / nested-element changes.

## Key design decisions

- **Single-responsibility module** — mutex script does ONLY open/close coordination; init scripts (history-init/recent-init/favorites-init) keep doing panel rendering + badge updates + save logic untouched.
- **Pure DOM, zero deps** — no `localStorage`, no fetch, no third-party; matches Astro client-bundle YAGNI bar.
- **Defensive null checks + `instanceof HTMLDetailsElement`** — strict TS compliance; safe under jsdom + real browsers.
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
- [P55 header-dropdown-mutex shipped](p55-header-dropdown-mutex-shipped.md) — N commits `xxx`+`yyy` 2026-07-22; 4 details mutual exclusion + ESC + click-outside; +5 vitest cases; mutex script single-responsibility + zero init-script changes; closes user-reported overlap bug
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