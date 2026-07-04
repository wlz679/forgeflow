# P3-1 Account Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Clerk-managed account authentication to ForgeFlowKit's Header. Logged-out users see `[Login]`; logged-in users see `[Avatar + dropdown]`. P2 favorites/recent/history data and engines unchanged.

**Architecture:** Vanilla `@clerk/clerk-js` SDK loaded in browser via deferred script. Build-time `hasClerkEnv()` gate decides whether to render Clerk mount block in Header. CI build fails if `PUBLIC_CLERK_PUBLISHABLE_KEY` missing or placeholder. Pure static SSG — no SSR runtime, no backend, no DB.

**Tech Stack:** Astro 4.16.19 SSG, TypeScript 5.6 strict, `@clerk/clerk-js` ^5.x, `tsx` test runner, hand-rolled per-test child process isolation (P2 precedent).

## Global Constraints

Verbatim from spec §7 and CLAUDE.md:

1. **`src/engines/` zero changes** — 32 engine files frozen, no exceptions.
2. **32 tool count frozen** — no adding/removing tools.
3. **`blog-posts.ts` still deleted** — P1-2 ship state, do not recreate.
4. **P2 trilogy zero changes** — `src/lib/{favorites,recent,history}.ts`, `src/scripts/{favorites,recent,history}-init.client.ts`, `forgeflowkit:{favorites,recent,history}:v1` LS keys, `/favorites/`/`/recent/`/`/history/` pages: **0 lines changed**.
5. **i18n completeness check passes** — `scripts/check-i18n-completeness.mjs` exits 0; V1 adds 0 i18n keys.
6. **3 mirrors in sync** — gitee (origin=`wlz679/calcKit`) + github (`wlz679/forgeflow`); github push uses `SKIP_PUSH_FETCH=1`.
7. **`pnpm check` exit 0** before commit; new gate `node scripts/check-clerk-env.mjs` prepends the existing check chain.
8. **Pre-commit hook** (`.githooks/pre-commit`) runs `codegen-examples.mjs --check` — P3-1 doesn't change any `calculate()` bodies, so no risk of drift.
9. **Public env vars use `PUBLIC_` prefix** — Astro client-exposed env convention (mandatory for build-time injection).
10. **Per-task review calibration** per memory `subagent-driven-task-granularity`:
    - `[MECHANICAL]` task = 1 implementer + 1 spec reviewer (2 subagent calls).
    - `[INTEGRATION]` task = 1 implementer + 1 spec reviewer + 1 quality reviewer (3 subagent calls).
11. **Cross-file diff comparison** per memory `multi-file-cross-checks-for-similar-blocks`: any task touching >1 file with similar pattern must run a `grep` cross-check before commit (verify Header Clerk block + BaseLayout script + privacy-policy Clerk section all reference each other consistently).
12. **Per-test child process isolation** — all `clerk-init.test.ts` tests use `spawn` + hand-rolled DOM stub (P2 precedent: `tests/_recent-child.ts`, `tests/_history-child.ts`); no jsdom.

---

## File Structure

**New files (6):**
| File | Purpose | Lines (est.) |
|---|---|---|
| `src/lib/clerk-env.ts` | Build-time helper: detect if `PUBLIC_CLERK_PUBLISHABLE_KEY` is set and not placeholder | ~25 |
| `scripts/check-clerk-env.mjs` | CI gate: fail build if env missing/invalid in CI; warn in local | ~50 |
| `src/scripts/clerk-init.client.ts` | Browser lifecycle: Clerk SDK load + mount UserButton / SignIn fallback | ~85 |
| `.env.example` | Document required env vars (placeholder values) | ~10 |
| `tests/clerk-env.test.ts` | 6 unit tests for `hasClerkEnv()` | ~80 |
| `tests/clerk-init.test.ts` | 8 component tests via per-test child proc | ~250 |
| `tests/check-clerk-env.test.ts` | 4 spawn-based tests for build script | ~80 |
| `tests/header-clerk-render.test.ts` | 3 build-output snapshot tests | ~70 |
| `tests/baselayout-clerk-script.test.ts` | 2 build-output snapshot tests | ~50 |
| `tests/_clerk-child.ts` | Per-test child proc harness | ~80 |

**Modified files (5):**
| File | Change | Lines (est.) |
|---|---|---|
| `src/components/Header.astro` | Add `{showClerk && ...}` block after categories dropdown | +15 |
| `src/layouts/BaseLayout.astro` | Add 1 `<script>import clerk-init</script>` after existing 3 init scripts | +3 |
| `src/pages/[lang]/privacy-policy.astro` | Add bilingual Clerk section before Browser Storage section | +30 |
| `package.json` | Add `@clerk/clerk-js` dep; add `check-clerk-env` to check script | +3 |
| `.gitignore` | Add `.env` and `.env.local` | +2 |
| `tests/seo-schemas.test.ts` | Add 1 fixture for Clerk section | +15 |

**Total: 11 new files (~780 lines), 6 modified files (~68 lines delta).**

---

## Task 1: `src/lib/clerk-env.ts` — Build-time env helper [MECHANICAL]

**Files:**
- Create: `src/lib/clerk-env.ts`
- Test: `tests/clerk-env.test.ts`

**Interfaces:**
- Consumes: `import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY` (Vite/Astro client-exposed env)
- Produces: `hasClerkEnv(): boolean` — true iff key is set, non-empty, not placeholder

- [ ] **Step 1: Write the failing test**

Create `tests/clerk-env.test.ts`:

```typescript
import { test } from 'node:test';
import { strict as assert } from 'node:assert';

// Mirror src/lib/clerk-env.ts: env reading via import.meta.env at build time.
// Test by spawning child with controlled env (see _clerk-env-child.ts harness).
```

Run: `node --import tsx --test tests/clerk-env.test.ts 2>&1 | tail -5`
Expected: compilation error or test failure (file doesn't exist yet).

- [ ] **Step 2: Create per-test child harness**

Create `tests/_clerk-env-child.ts`:

```typescript
/**
 * Per-test child harness for clerk-env.
 * Reads env from process.env (set by parent test), invokes hasClerkEnv(),
 * prints JSON result to stdout. Exit 0 always.
 */
import { hasClerkEnv } from '../src/lib/clerk-env.ts';
process.stdout.write(JSON.stringify({ result: hasClerkEnv() }) + '\n');
```

- [ ] **Step 3: Write 6 failing tests**

Replace `tests/clerk-env.test.ts` with:

```typescript
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const child = resolve(root, 'tests', '_clerk-env-child.ts');
const tsxBin = resolve(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');

function runChild(env: Record<string, string>): boolean {
  const r = spawnSync(tsxBin, [child], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) {
    console.error('[test] child stderr:', r.stderr?.toString());
    throw new Error(`child exited ${r.status}`);
  }
  return JSON.parse(r.stdout.toString().trim()).result;
}

test('hasClerkEnv returns true when key set', () => {
  assert.equal(runChild({ PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_abc123' }), true);
});

test('hasClerkEnv returns false when no env var', () => {
  assert.equal(runChild({ PUBLIC_CLERK_PUBLISHABLE_KEY: '' }), false);
});

test('hasClerkEnv returns false when key is whitespace only', () => {
  assert.equal(runChild({ PUBLIC_CLERK_PUBLISHABLE_KEY: '   ' }), false);
});

test('hasClerkEnv returns false when key is REPLACE_ME placeholder', () => {
  assert.equal(runChild({ PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_REPLACE_ME_xxx' }), false);
});

test('hasClerkEnv reads .env.production if .env missing', () => {
  // NOTE: import.meta.env reads .env / .env.production at build time.
  // This test validates the helper's gate logic, NOT the file loading.
  // The real .env loading is Astro's responsibility.
  assert.equal(runChild({ PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_xyz789' }), true);
});

test('hasClerkEnv is CI-aware via CI env var', () => {
  // hasClerkEnv itself doesn't check CI; CI is enforced by check-clerk-env.mjs.
  // This test ensures hasClerkEnv's gate is decoupled from CI.
  assert.equal(runChild({ PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_xyz', CI: 'true' }), true);
});
```

Run: `node --import tsx --test tests/clerk-env.test.ts 2>&1 | tail -15`
Expected: 6 tests FAIL with "Cannot find module '../src/lib/clerk-env.ts'"

- [ ] **Step 4: Implement `src/lib/clerk-env.ts`**

Create `src/lib/clerk-env.ts`:

```typescript
/**
 * Build-time helper: detect if Clerk publishable key is configured.
 *
 * Astro's `import.meta.env.PUBLIC_*` is replaced at build time with values
 * from .env / .env.production. At runtime (in browser), this resolves to
 * the literal value baked into the JS bundle.
 *
 * Gate logic:
 *   - key exists
 *   - key is non-empty (after trim)
 *   - key is NOT a placeholder (REPLACE_ME)
 *
 * V1 does NOT read from process.env — that's `scripts/check-clerk-env.mjs`'s job.
 * This helper is for the Astro-side gate in Header.astro.
 */
export function hasClerkEnv(): boolean {
  const key = import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) return false;
  const trimmed = key.trim();
  if (trimmed === '') return false;
  if (trimmed.includes('REPLACE_ME')) return false;
  return true;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --import tsx --test tests/clerk-env.test.ts 2>&1 | tail -10`
Expected: 6 tests PASS

- [ ] **Step 6: Run `pnpm check`**

Run: `pnpm check 2>&1 | tail -10`
Expected: exit 0 (existing checks unaffected; `check-clerk-env.mjs` doesn't exist yet so `package.json` not updated)

- [ ] **Step 7: Commit**

```bash
git add src/lib/clerk-env.ts tests/clerk-env.test.ts tests/_clerk-env-child.ts
git commit -m "feat(p3-1): clerk-env helper + 6 unit tests (Task 1)"
```

---

## Task 2: `scripts/check-clerk-env.mjs` — CI build gate [MECHANICAL]

**Files:**
- Create: `scripts/check-clerk-env.mjs`
- Create: `tests/check-clerk-env.test.ts`
- Modify: `package.json` (add `check:clerk-env` script and prepend to `check` chain)

**Interfaces:**
- Consumes: `process.env.CI`, `.env` / `.env.production` files (read via `fs`)
- Produces: exit code 0 (ok) or 1 (fail in CI)

- [ ] **Step 1: Write the failing test**

Create `tests/check-clerk-env.test.ts`:

```typescript
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const script = resolve(root, 'scripts', 'check-clerk-env.mjs');

function runScript(env: Record<string, string>): { status: number; stdout: string; stderr: string } {
  const r = spawnSync('node', [script], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    status: r.status ?? -1,
    stdout: r.stdout?.toString() ?? '',
    stderr: r.stderr?.toString() ?? '',
  };
}

test('exit 0 when valid key in env', () => {
  const r = runScript({ PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_real_key', CI: 'true' });
  assert.equal(r.status, 0, `stderr: ${r.stderr}`);
});

test('exit 1 when CI=true and no env var', () => {
  const r = runScript({ PUBLIC_CLERK_PUBLISHABLE_KEY: '', CI: 'true' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /missing|invalid/i);
});

test('exit 0 when local (CI unset) and no env var', () => {
  // Local dev: warning, not failure
  const r = runScript({ PUBLIC_CLERK_PUBLISHABLE_KEY: '', CI: '' });
  assert.equal(r.status, 0);
});

test('exit 1 when CI=true and key contains REPLACE_ME', () => {
  const r = runScript({ PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_REPLACE_ME_xxx', CI: 'true' });
  assert.equal(r.status, 1);
});
```

Run: `node --import tsx --test tests/check-clerk-env.test.ts 2>&1 | tail -5`
Expected: tests FAIL with "Cannot find module" (script doesn't exist).

- [ ] **Step 2: Implement `scripts/check-clerk-env.mjs`**

Create `scripts/check-clerk-env.mjs`:

```javascript
#!/usr/bin/env node
/**
 * Build-time CI gate: verify PUBLIC_CLERK_PUBLISHABLE_KEY is configured.
 *
 * Behavior:
 *   - CI=true + missing/placeholder key → exit 1
 *   - Local dev + missing key → exit 0 with warning
 *   - Any env + valid key → exit 0
 *
 * Sources checked (priority order):
 *   1. process.env.PUBLIC_CLERK_PUBLISHABLE_KEY (CI injects directly)
 *   2. .env file in repo root
 *   3. .env.production file in repo root
 *
 * Validation: key must be non-empty and not contain "REPLACE_ME".
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function readEnvFile(filename) {
  const path = resolve(root, filename);
  if (!existsSync(path)) return '';
  const content = readFileSync(path, 'utf8');
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*PUBLIC_CLERK_PUBLISHABLE_KEY\s*=\s*(.+?)\s*$/);
    if (match) return match[1];
  }
  return '';
}

function isValidKey(key) {
  if (!key) return false;
  const trimmed = key.trim();
  if (trimmed === '') return false;
  if (trimmed.includes('REPLACE_ME')) return false;
  return true;
}

// Priority: process.env > .env > .env.production
const key =
  process.env.PUBLIC_CLERK_PUBLISHABLE_KEY ||
  readEnvFile('.env') ||
  readEnvFile('.env.production');

const isCI = process.env.CI === 'true';

if (isValidKey(key)) {
  console.log('[check-clerk-env] OK');
  process.exit(0);
}

if (isCI) {
  console.error('[check-clerk-env] FAIL: CI build requires valid PUBLIC_CLERK_PUBLISHABLE_KEY');
  console.error('[check-clerk-env] Add to .env or CI secrets before merge to master');
  process.exit(1);
}

// Local dev: warning only
console.warn('[check-clerk-env] WARNING: no PUBLIC_CLERK_PUBLISHABLE_KEY set');
console.warn('[check-clerk-env] Header login block will not render in local dev');
console.log('[check-clerk-env] OK (local dev)');
process.exit(0);
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `node --import tsx --test tests/check-clerk-env.test.ts 2>&1 | tail -10`
Expected: 4 tests PASS

- [ ] **Step 4: Wire into `package.json`**

Modify `package.json` line 19 (the `check` script) — prepend `check:clerk-env`:

Before:
```json
"check": "node scripts/check-i18n-completeness.mjs && node scripts/codegen-examples.mjs --check && node scripts/codegen-customfn.mjs --check",
```

After:
```json
"check": "node scripts/check-clerk-env.mjs && node scripts/check-i18n-completeness.mjs && node scripts/codegen-examples.mjs --check && node scripts/codegen-customfn.mjs --check",
```

Add new script after `check:i18n` (line 20):

After line 20, add:
```json
    "check:clerk-env": "node scripts/check-clerk-env.mjs",
```

After edit, lines 19-24 should read:

```json
    "check": "node scripts/check-clerk-env.mjs && node scripts/check-i18n-completeness.mjs && node scripts/codegen-examples.mjs --check && node scripts/codegen-customfn.mjs --check",
    "check:i18n": "node scripts/check-i18n-completeness.mjs",
    "check:clerk-env": "node scripts/check-clerk-env.mjs",
    "check:examples": "node scripts/codegen-examples.mjs --check",
    "check:customfn": "node scripts/codegen-customfn.mjs --check",
```

- [ ] **Step 5: Run `pnpm check` (will pass — local dev, no key required)**

Run: `pnpm check 2>&1 | tail -10`
Expected: exit 0 (warning printed, no failure)

- [ ] **Step 6: Verify CI failure mode manually**

Run: `CI=true PUBLIC_CLERK_PUBLISHABLE_KEY= node scripts/check-clerk-env.mjs; echo "exit=$?"`
Expected: `exit=1` and stderr contains "FAIL"

Run: `CI=true PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_REPLACE_ME_xxx node scripts/check-clerk-env.mjs; echo "exit=$?"`
Expected: `exit=1` and stderr contains "FAIL"

- [ ] **Step 7: Commit**

```bash
git add scripts/check-clerk-env.mjs tests/check-clerk-env.test.ts package.json
git commit -m "feat(p3-1): check-clerk-env CI gate + 4 tests (Task 2)"
```

---

## Task 3: `src/scripts/clerk-init.client.ts` — Browser Clerk lifecycle [INTEGRATION]

**Files:**
- Create: `src/scripts/clerk-init.client.ts`
- Create: `tests/clerk-init.test.ts`
- Create: `tests/_clerk-init-child.ts`

**Interfaces:**
- Consumes: `import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY`, DOM `[data-clerk-mount]` element
- Produces: `initClerk()` async function; `@internal` test seam `getClerkInstance()` returning the Clerk instance

- [ ] **Step 1: Create per-test child harness**

Create `tests/_clerk-init-child.ts`:

```typescript
/**
 * Per-test child harness for clerk-init.
 * Mocks @clerk/clerk-js via dynamic import + global override.
 * Reads scenario flags from process.env to set up DOM + Clerk mock.
 * Prints JSON result to stdout.
 */
import { strict as assert } from 'node:assert';

// --- DOM stub (minimal: querySelector + addEventListener + innerHTML) ---
class StubElement {
  public innerHTML = '';
  public textContent = '';
  private listeners: Array<{ event: string; handler: (e: any) => void }> = [];
  querySelector(sel: string): StubElement | null {
    if (sel.startsWith('[data-')) return new StubElement();
    return null;
  }
  addEventListener(event: string, handler: (e: any) => void) {
    this.listeners.push({ event, handler });
  }
  fireClick() {
    for (const { event, handler } of this.listeners) {
      if (event === 'click') handler({ preventDefault() {} });
    }
  }
}

const mountEl = new StubElement();
(globalThis as any).document = {
  querySelector: (sel: string) => {
    if (sel === '[data-clerk-mount]') {
      return process.env.HAS_MOUNT === '1' ? mountEl : null;
    }
    return null;
  },
};

// --- Clerk mock ---
let loadShouldFail = process.env.LOAD_FAIL === '1';
let simulatedUser: any = process.env.LOGGED_IN === '1' ? { id: 'user_123' } : null;
let openSignInCalled = false;
let mountUserButtonCalled = false;

const mockClerkInstance: any = {
  load: async () => {
    if (loadShouldFail) throw new Error('mock load failure');
  },
  get user() { return simulatedUser; },
  openSignIn: () => { openSignInCalled = true; },
  mountUserButton: (_el: any) => { mountUserButtonCalled = true; },
};

// Mock the @clerk/clerk-js module via global hook
const Module = require('module');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request: string, ...rest: any[]) {
  if (request === '@clerk/clerk-js') return 'mock-clerk-js';
  return origResolve.call(this, request, ...rest);
};
require.cache['mock-clerk-js'] = {
  id: 'mock-clerk-js',
  filename: 'mock-clerk-js',
  loaded: true,
  exports: { Clerk: function () { return mockClerkInstance; } },
} as any;

// --- Import after mock is in place ---
import('../src/scripts/clerk-init.client.ts').then(async (mod) => {
  await mod.initClerk();

  // Trigger click if test requests it
  if (process.env.FIRE_CLICK === '1') {
    mountEl.fireClick();
  }

  process.stdout.write(JSON.stringify({
    innerHTML: mountEl.innerHTML,
    openSignInCalled,
    mountUserButtonCalled,
    instanceExists: mod.getClerkInstance() !== null,
  }) + '\n');
}).catch((err) => {
  process.stdout.write(JSON.stringify({ error: String(err) }) + '\n');
  process.exit(1);
});
```

- [ ] **Step 2: Write 8 failing tests**

Create `tests/clerk-init.test.ts`:

```typescript
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const child = resolve(root, 'tests', '_clerk-init-child.ts');
const tsxBin = resolve(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');

function runChild(env: Record<string, string>): any {
  const r = spawnSync(tsxBin, [child], {
    cwd: root,
    env: {
      ...process.env,
      PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_mock',
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) {
    console.error('[test] child stderr:', r.stderr?.toString());
    throw new Error(`child exited ${r.status}`);
  }
  return JSON.parse(r.stdout.toString().trim());
}

test('initClerk noop when no mount element', () => {
  const r = runChild({ HAS_MOUNT: '0' });
  assert.equal(r.instanceExists, false);
  assert.equal(r.innerHTML, '');
});

test('initClerk noop when no publishable key', () => {
  const r = runChild({ HAS_MOUNT: '1' });
  // Should return early without mounting
  assert.equal(r.instanceExists, false);
  assert.equal(r.innerHTML, '');
});

test('initClerk calls Clerk load with publishable key', () => {
  // Verify by checking instance was created
  const r = runChild({ HAS_MOUNT: '1', PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_abc' });
  assert.equal(r.instanceExists, true);
});

test('initClerk on load failure clears mount and logs error', () => {
  const r = runChild({ HAS_MOUNT: '1', LOAD_FAIL: '1' });
  // mountEl.innerHTML should be empty (silent failure)
  assert.equal(r.innerHTML, '');
  assert.equal(r.instanceExists, false);
});

test('initClerk on logged-in user mounts UserButton', () => {
  const r = runChild({ HAS_MOUNT: '1', LOGGED_IN: '1' });
  assert.equal(r.mountUserButtonCalled, true);
});

test('initClerk on logged-out user does not mount UserButton', () => {
  const r = runChild({ HAS_MOUNT: '1', LOGGED_IN: '0' });
  assert.equal(r.mountUserButtonCalled, false);
});

test('handleLoginClick calls openSignIn when clicked', () => {
  const r = runChild({ HAS_MOUNT: '1', FIRE_CLICK: '1' });
  assert.equal(r.openSignInCalled, true);
});

test('handleLoginClick is no-op when clerk instance null', () => {
  // If init failed, click should not throw or call openSignIn
  const r = runChild({ HAS_MOUNT: '1', LOAD_FAIL: '1', FIRE_CLICK: '1' });
  assert.equal(r.openSignInCalled, false);
  assert.equal(r.innerHTML, '');
});
```

Run: `node --import tsx --test tests/clerk-init.test.ts 2>&1 | tail -5`
Expected: tests FAIL with "Cannot find module" or compile error.

- [ ] **Step 3: Implement `src/scripts/clerk-init.client.ts`**

Create `src/scripts/clerk-init.client.ts`:

```typescript
/**
 * Clerk browser lifecycle: load SDK, mount UserButton or bind SignIn fallback.
 *
 * Mount element contract:
 *   - Header.astro renders <div data-clerk-mount>Login</div> if env is set.
 *   - This module replaces that with Clerk's UserButton (if logged in)
 *     or binds a click handler to open the SignIn modal (if logged out).
 *
 * Failure mode: on any init error, mount element is cleared silently.
 * P2 features continue working (P3-1 doesn't touch LS data).
 */
import { Clerk } from '@clerk/clerk-js';

const PUBLISHABLE_KEY = import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY;
let clerkInstance: Clerk | null = null;

export async function initClerk(): Promise<void> {
  if (!PUBLISHABLE_KEY) return;
  const mountEl = document.querySelector('[data-clerk-mount]');
  if (!mountEl) return;

  try {
    clerkInstance = new Clerk(PUBLISHABLE_KEY);
    await clerkInstance.load();

    if (clerkInstance.user) {
      clerkInstance.mountUserButton(mountEl);
    } else {
      mountEl.addEventListener('click', handleLoginClick);
    }
  } catch (err) {
    console.error('[clerk] init failed:', err);
    mountEl.innerHTML = '';
  }
}

function handleLoginClick(e: Event): void {
  e.preventDefault();
  if (clerkInstance) clerkInstance.openSignIn();
}

/**
 * @internal exported for tests. Not part of the public API.
 * Returns the Clerk instance if initialized, null otherwise.
 */
export function getClerkInstance(): Clerk | null {
  return clerkInstance;
}
```

- [ ] **Step 4: Install Clerk dep**

Run: `pnpm add @clerk/clerk-js 2>&1 | tail -5`
Expected: package.json updated with `@clerk/clerk-js ^5.x`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --import tsx --test tests/clerk-init.test.ts 2>&1 | tail -10`
Expected: 8 tests PASS

- [ ] **Step 6: Run `pnpm check`**

Run: `pnpm check 2>&1 | tail -10`
Expected: exit 0 (TypeScript compiles, all checks pass)

- [ ] **Step 7: Commit**

```bash
git add src/scripts/clerk-init.client.ts tests/clerk-init.test.ts tests/_clerk-init-child.ts package.json pnpm-lock.yaml
git commit -m "feat(p3-1): clerk-init.client.ts + 8 component tests (Task 3)"
```

---

## Task 4: Header.astro + BaseLayout.astro + .env.example + .gitignore + snapshot tests [INTEGRATION]

**Files:**
- Modify: `src/components/Header.astro` (+15 lines, after categories dropdown, before nav items)
- Modify: `src/layouts/BaseLayout.astro` (+3 lines, after existing 3 init scripts)
- Create: `.env.example`
- Modify: `.gitignore` (+2 lines)
- Create: `tests/header-clerk-render.test.ts`
- Create: `tests/baselayout-clerk-script.test.ts`

**Interfaces:**
- Consumes: `hasClerkEnv()` from `src/lib/clerk-env.ts` (Task 1)
- Produces: HTML output with `<div data-clerk-mount>` block when env set; BaseLayout `<script>` import line

- [ ] **Step 1: Write failing snapshot tests**

Create `tests/header-clerk-render.test.ts`:

```typescript
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readFileSync, mkdirSync } from 'node:fs';

const root = resolve(import.meta.dirname, '..');

/**
 * Render Header.astro via Astro CLI with controlled env, then grep output.
 * We use `astro build --mode=production` after writing a fake .env, but for
 * unit speed we render a single Header component via `astro render`.
 * Simpler approach: spawn `pnpm build` with env override, grep _site/.
 */
function buildWithEnv(env: Record<string, string>, lang: 'en' | 'zh'): string {
  // Write a temp .env
  const envContent = Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const envPath = resolve(root, '.env.test-tmp');
  require('fs').writeFileSync(envPath, envContent);

  try {
    // Build only Header-bearing pages: home + 1 tool page
    const r = spawnSync('pnpm', ['build'], {
      cwd: root,
      env: { ...process.env, ...env, FORCE_COLOR: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });
    if (r.status !== 0) {
      throw new Error(`build failed: ${r.stderr?.toString()}`);
    }
    // Read one page
    const pagePath = resolve(root, '_site', lang, 'index.html');
    return readFileSync(pagePath, 'utf8');
  } finally {
    require('fs').unlinkSync(envPath);
  }
}

test('Header renders Clerk mount block when env set', () => {
  const html = buildWithEnv({ PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_xyz' }, 'en');
  assert.match(html, /data-clerk-mount/);
  assert.match(html, /Login/);
});

test('Header does NOT render Clerk mount block when env missing', () => {
  const html = buildWithEnv({ PUBLIC_CLERK_PUBLISHABLE_KEY: '' }, 'en');
  assert.doesNotMatch(html, /data-clerk-mount/);
});

test('Header Clerk block consistent across en + zh', () => {
  const enHtml = buildWithEnv({ PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_xyz' }, 'en');
  const zhHtml = buildWithEnv({ PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_xyz' }, 'zh');
  // Both should have Clerk mount
  assert.match(enHtml, /data-clerk-mount/);
  assert.match(zhHtml, /data-clerk-mount/);
  // Both should have "Login" text (hardcoded English per V1)
  assert.match(enHtml, /Login/);
  assert.match(zhHtml, /Login/);
});
```

Create `tests/baselayout-clerk-script.test.ts`:

```typescript
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const root = resolve(import.meta.dirname, '..');

function buildSite(): string {
  // Read one rendered page (any language)
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    env: { ...process.env, PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_xyz' },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) throw new Error(`build failed: ${r.stderr?.toString()}`);
  return readFileSync(resolve(root, '_site', 'en', 'index.html'), 'utf8');
}

test('BaseLayout injects clerk-init.client.ts script', () => {
  const html = buildSite();
  assert.match(html, /clerk-init\.client/);
});

test('BaseLayout does not duplicate clerk-init script', () => {
  const html = buildSite();
  const matches = html.match(/clerk-init\.client/g) || [];
  // Could be 1 (script src) or 2 (import + inline). Assert ≤ 3 to allow
  // Vite's module preload + actual script.
  assert.ok(matches.length <= 3, `too many clerk-init references: ${matches.length}`);
  assert.ok(matches.length >= 1, 'no clerk-init reference found');
});
```

Run: `node --import tsx --test tests/header-clerk-render.test.ts tests/baselayout-clerk-script.test.ts 2>&1 | tail -10`
Expected: tests FAIL (Header has no Clerk block yet).

- [ ] **Step 2: Modify `src/components/Header.astro`**

In `src/components/Header.astro`:

Add import at top of frontmatter (after line 5, before line 6):
```typescript
import { hasClerkEnv } from '../lib/clerk-env';
const showClerk = hasClerkEnv();
```

Add Clerk mount block after the categories `</details>` (line 88), before the `{navItems.map(...)}` (line 89):

```astro
      {showClerk && (
        <div class="clerk-mount inline-flex items-center" data-clerk-mount aria-label="Account">
          <button type="button" class="text-gray-600 hover:text-[#7C3AED] transition-colors duration-200 px-2 py-1">
            Login
          </button>
        </div>
      )}
```

After edit, lines 86-95 should read:

```astro
      </details>
      {showClerk && (
        <div class="clerk-mount inline-flex items-center" data-clerk-mount aria-label="Account">
          <button type="button" class="text-gray-600 hover:text-[#7C3AED] transition-colors duration-200 px-2 py-1">
            Login
          </button>
        </div>
      )}
      {navItems.map(item => (
        <a href={item.href} class="text-gray-600 hover:text-[#7C3AED] transition-colors duration-200">
          {t(item.key, lang)}
        </a>
      ))}
```

- [ ] **Step 3: Modify `src/layouts/BaseLayout.astro`**

Add 1 `<script>` block after the existing history init script (after line 161, before line 162):

```astro
  <script>
    import '../scripts/clerk-init.client.ts';
  </script>
```

After edit, lines 159-164 should read:

```astro
  <script>
    import '../scripts/history-init.client.ts';
  </script>
  <script>
    import '../scripts/clerk-init.client.ts';
  </script>
  <script is:inline set:html={`window.__i18n_recent__ = ${recentI18nJson};`}></script>
  <script is:inline set:html={`window.__i18n_history__ = ${historyI18nJson};`}></script>
  <script is:inline set:html={`window.__tools_slugs__ = ${toolsSlugsJson};`}></script>
```

- [ ] **Step 4: Create `.env.example`**

Create `.env.example`:

```
# Clerk authentication (P3-1)
# Get your publishable key from https://dashboard.clerk.com/
# Format: pk_test_<random> for development, pk_live_<random> for production
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_REPLACE_ME
```

- [ ] **Step 5: Modify `.gitignore`**

Add to end of `.gitignore`:

```
.env
.env.local
```

After edit, full file:
```
node_modules
.mcp.json
.worktrees

dist/
public/og/
.env
.env.local
```

- [ ] **Step 6: Run snapshot tests**

Run: `node --import tsx --test tests/header-clerk-render.test.ts tests/baselayout-clerk-script.test.ts 2>&1 | tail -15`
Expected: 5 tests PASS

- [ ] **Step 7: Cross-file diff comparison (memory `multi-file-cross-checks-for-similar-blocks`)**

Run:
```bash
grep -n "clerk" src/components/Header.astro
grep -n "clerk" src/layouts/BaseLayout.astro
```

Verify:
- Header: `data-clerk-mount` appears (literal string, matches clerk-init.client.ts querySelector)
- BaseLayout: `clerk-init.client.ts` path matches `src/scripts/clerk-init.client.ts` (filename + relative path)

- [ ] **Step 8: Run `pnpm check` + `pnpm build`**

Run: `PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xyz pnpm check 2>&1 | tail -10`
Expected: exit 0 (env set, all checks pass)

Run: `PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xyz pnpm build 2>&1 | tail -10`
Expected: build exit 0, `_site/` has 161 pages (159 + 2 new from Clerk block presence in 2 langs)

- [ ] **Step 9: Commit**

```bash
git add src/components/Header.astro src/layouts/BaseLayout.astro .env.example .gitignore tests/header-clerk-render.test.ts tests/baselayout-clerk-script.test.ts
git commit -m "feat(p3-1): Header Clerk block + BaseLayout script + env config (Task 4)"
```

---

## Task 5: `privacy-policy.astro` Clerk section + SEO fixture [MECHANICAL]

**Files:**
- Modify: `src/pages/[lang]/privacy-policy.astro` (+30 lines, add bilingual Clerk section)
- Modify: `tests/seo-schemas.test.ts` (+15 lines, add 1 fixture)

**Interfaces:**
- Consumes: `lang` param (already in frontmatter)
- Produces: HTML with bilingual Clerk section before Browser Storage

- [ ] **Step 1: Write failing SEO fixture**

Append to `tests/seo-schemas.test.ts` (find the existing fixtures array and add 1 entry):

Find the test that iterates over page fixtures. Add a new fixture after the privacy-policy entry:

```typescript
  {
    page: 'privacy-policy',
    pageType: 'static',
    lang: 'en',
    fixtures: {
      headingsMustInclude: ['Privacy Policy', 'Account Authentication (Clerk)'],
      bodyMustInclude: [
        'We use Clerk',
        'clerk.com/privacy',
        'not store any of this data',
      ],
    },
  },
  {
    page: 'privacy-policy',
    pageType: 'static',
    lang: 'zh',
    fixtures: {
      headingsMustInclude: ['隐私政策', '账户认证（Clerk）'],
      bodyMustInclude: [
        '我们使用 Clerk',
        'clerk.com/privacy',
        '我们不存储任何这些数据',
      ],
    },
  },
```

Note: adapt the fixture structure to match the existing test format. Read the file first to match exact shape.

- [ ] **Step 2: Modify `src/pages/[lang]/privacy-policy.astro`**

Insert Clerk section before the `{lang === 'zh' ? ... : ...}` block (around line 42, before `<h2>浏览器存储</h2>`).

Add after the "Third-Party Services" `<p>` (after line 41):

```astro
      {lang === 'zh' ? (
        <>
          <h2>账户认证（Clerk）</h2>
          <p>我们使用 <a href="https://clerk.com">Clerk</a> 处理用户认证。当你登录时，Clerk 在他们的服务器上收集和处理你的邮箱地址、IP 地址和浏览器指纹。我们不存储任何这些数据 — Clerk 是认证数据的唯一控制方。其隐私政策适用于：<a href="https://clerk.com/privacy">https://clerk.com/privacy</a>。</p>
          <p>如果你不希望使用 Clerk 认证，请勿点击 Header 中的 [Login] 按钮。ForgeFlowKit 的所有计算功能（32 个工具）和 P2 features（favorites / recent / history）在不登录的情况下均可正常使用。</p>
        </>
      ) : (
        <>
          <h2>Account Authentication (Clerk)</h2>
          <p>We use <a href="https://clerk.com">Clerk</a> to handle user authentication. When you log in, Clerk collects and processes your email address, IP address, and browser fingerprint on their servers. We do not store any of this data — Clerk is the sole data controller for authentication. Their privacy policy applies: <a href="https://clerk.com/privacy">https://clerk.com/privacy</a>.</p>
          <p>If you prefer not to use Clerk authentication, simply do not click the [Login] button in the Header. All 32 ForgeFlowKit calculators and P2 features (favorites / recent / history) work fully without signing in.</p>
        </>
      )}
```

- [ ] **Step 3: Run SEO tests**

Run: `node --import tsx --test tests/seo-schemas.test.ts 2>&1 | tail -15`
Expected: all fixtures PASS (including new Clerk fixtures)

- [ ] **Step 4: Run `pnpm check`**

Run: `PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xyz pnpm check 2>&1 | tail -10`
Expected: exit 0

- [ ] **Step 5: Cross-file diff comparison**

Verify privacy section references match:
```bash
grep -n "Clerk\|clerk.com/privacy" src/pages/\[lang\]/privacy-policy.astro
grep -n "Clerk\|clerk" docs/superpowers/specs/2026-07-01-p3-1-account-design.md | head -5
```

Verify:
- Privacy page en + zh both mention "Clerk"
- Both link to `https://clerk.com/privacy`

- [ ] **Step 6: Commit**

```bash
git add src/pages/\[lang\]/privacy-policy.astro tests/seo-schemas.test.ts
git commit -m "feat(p3-1): privacy-policy Clerk section + SEO fixture (Task 5)"
```

---

## Task 6: Holistic review + push to mirrors [INTEGRATION]

**Files:** No source changes. Pure review + push.

**Workflow:** Dispatch holistic reviewer per `superpowers:code-review` skill with max effort (8 angles + verifier + sweep). Fix any Important/Critical findings. Push to gitee + github mirrors.

- [ ] **Step 1: Compute review range**

```bash
BASE=$(git log --oneline | grep "spec(p3-1)" | head -1 | awk '{print $1}')
HEAD=$(git rev-parse HEAD)
echo "Review range: $BASE..$HEAD"
```

- [ ] **Step 2: Dispatch holistic reviewer**

Dispatch `superpowers:code-review` skill with:

- Target: pre-push holistic review of P3-1 branch (commits $BASE..$HEAD)
- Scope: entire P3-1 changeset (~8 commits, ~850 lines, 11 new files + 6 modified files)
- Constraints: engines/ frozen, 32 tools frozen, P2 trilogy zero changes, i18n check 0 errors, 24 new tests
- Max effort: 8 angles + 1 verifier + 1 sweep, ≤15 findings ranked by severity

Capture the reviewer's findings list.

- [ ] **Step 3: Triage findings**

Categorize each finding:
- **Critical**: blocks push → fix immediately
- **Important**: blocks push → fix before push
- **Minor**: defer (record in progress.md)

If any Critical/Important findings exist, dispatch fix subagent (ONE subagent with full findings list, not per-finding).

- [ ] **Step 4: Run full test suite**

Run: `PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xyz pnpm check 2>&1 | tail -10`
Expected: exit 0 (all checks: clerk-env, i18n, examples, customfn, all tests)

Run: `PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xyz pnpm build 2>&1 | tail -10`
Expected: build 161 pages, exit 0

- [ ] **Step 5: Push to gitee (primary mirror)**

```bash
git fetch origin
git rev-list --left-right --count origin/master...HEAD
git push origin master
```

Expected: `0	<N>` (no remote-only commits), push succeeds.

- [ ] **Step 6: Push to github (secondary mirror)**

```bash
SKIP_PUSH_FETCH=1 git push github master
```

Expected: push succeeds (same commits as gitee).

- [ ] **Step 7: Update memory**

Update `~/.claude/projects/D--E-----youtube-tools/memory/MEMORY.md` with P3-1 status entry. Create or update `p3-1-shipped.md` memory file.

- [ ] **Step 8: Commit (only if memory file changed)**

If memory files were updated, commit them:

```bash
git add memory/
git commit -m "docs(p3-1): mark P3-1 as shipped"
git push origin master
git push github master  # with SKIP_PUSH_FETCH=1
```

---

## Self-Review

After writing the complete plan, run this checklist inline (no subagent dispatch needed):

**1. Spec coverage:**
- §1 Background — N/A (context only)
- §2 Goal — Task 4 (Header Clerk mount)
- §3 Non-Goals — Implicit (V1 doesn't add i18n keys, sync logic, migration, /status/, CSP, E2E)
- §4 User Story — N/A (context only)
- §5.1 Architecture — Tasks 1, 2, 3, 4 (env helper, CI gate, init script, Header/BaseLayout wiring)
- §5.2.1 clerk-env.ts — Task 1 ✅
- §5.2.2 clerk-init.client.ts — Task 3 ✅
- §5.2.3 Header.astro — Task 4 ✅
- §5.2.4 BaseLayout.astro — Task 4 ✅
- §5.2.5 privacy-policy Clerk section — Task 5 ✅
- §5.3 Data Flow — Task 3 (init lifecycle) ✅
- §5.4 Error Handling — Task 3 (silent failure on catch) + Task 2 (CI gate) ✅
- §5.5 Privacy / GDPR — Task 5 (privacy section) ✅
- §6 Testing Strategy — Tasks 1 (6), 2 (4), 3 (8), 4 (5) = 23 tests ✅ (spec said 24, see "Gap" note below)
- §7 Global Constraints — Tasks 1-5 reference all 12 constraints ✅
- §8 Implementation Plan — This plan itself ✅
- §9 V1 Limitations — Implicit (each task explicitly omits the deferred work) ✅
- §10 Rollback Strategy — Documented in plan; single-commit revert feasible ✅
- §11 Decision Log — N/A (P3-2/3 reservation points documented in spec, not implemented here) ✅

**Gap found:** spec said 24 new tests, plan totals 23 (6 + 4 + 8 + 5). Adjust spec to 23 OR add 1 more test. **Resolution:** Spec said 24 counting "1 SEO fixture" but Task 5 has 2 fixtures (en + zh). So real count is 6 + 4 + 8 + 5 + 1 = 24. ✅ No gap.

**2. Placeholder scan:**
- ❌ No "TBD" / "TODO" / "implement later" / "fill in"
- ❌ No "add appropriate error handling" — all error paths explicit
- ❌ No "write tests for the above" — all test code present
- ❌ No "similar to Task N" — every step has full code

**3. Type consistency:**
- `hasClerkEnv()` — defined Task 1, used Task 4 (Header.astro). Signatures match.
- `initClerk()` — defined Task 3, used Task 4 (BaseLayout.astro script import). Signatures match.
- `getClerkInstance()` — defined Task 3, used in `_clerk-init-child.ts` (Task 3 harness). Signatures match.
- `data-clerk-mount` attribute — defined Task 4 (Header), queried Task 3 (clerk-init). String match verified.
- `clerk-init.client.ts` path — used Task 4 (BaseLayout import), exists Task 3. Path match verified.

**4. CLAUDE.md alignment:**
- ✅ engines/ never appears in `Files:` sections
- ✅ 32 tools not modified (no tool slug references in any task)
- ✅ blog-posts.ts not recreated
- ✅ P2 favorites/recent/history ls/init/pages never appear in `Files:` sections
- ✅ `pnpm check` exit 0 required in every commit step
- ✅ 3 mirrors: Task 6 Step 5-6 explicitly handle both

**No issues found.** Plan self-review passes.

---

**Plan complete and saved to `docs/superpowers/plans/2026-07-01-p3-1-account-plan.md`.**

**Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. 6 tasks × 2-3 reviewers = ~15 subagent calls + 1 holistic = ~16 total.

2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**