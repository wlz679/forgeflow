# P3-1 Account Authentication — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:brainstorming (already done) → superpowers:writing-plans (next) → superpowers:subagent-driven-development (execution).
>
> **Status:** V1 design approved 2026-07-01. P3 umbrella split into 3 sub-projects:
> P3-1 (this spec) → P3-2 sync → P3-3 migration.

## 1. Background

**ForgeFlowKit** is an Astro 4.16.19 SSG calculator SPA, deployed at `forgeflowkit.com` (gitee mirror `wlz679/calcKit`, github mirror `wlz679/forgeflow`). 32 tools + blog + content pages, 159 static pages, 14 i18n keys × 2 langs.

**P2 trilogy** (shipped 2026-06-30 → 2026-07-01, 11 commits):
- P2a favorites — `forgeflowkit:favorites:v1` LS, ⭐ toggle, `/favorites/` page
- P2b recent viewed — `forgeflowkit:recent:v1` LS, 👁 auto-record, `/recent/` page
- P2c history snapshots — `forgeflowkit:history:v1` LS, 💾 save + restore-via-URL, `/history/` page

**P2 limitation:** all user data lives in **browser-local LocalStorage only**. A user on phone has favorites/recent/history that does not follow them to laptop. As the site grows, this is the most-requested missing feature in user feedback.

**P3 umbrella decision** (per brainstorming 2026-07-01): split into 3 sequential sub-projects, each shippable + rollback-able independently:

| Sub-project | Scope | Why separate |
|---|---|---|
| **P3-1 (this spec)** | Account authentication only — Clerk BaaS integration, no sync | Auth is a foundation. Sync logic can be redesigned without affecting auth. |
| P3-2 | LS ↔ backend sync protocol for favorites/recent/history | Needs backend choice + reconciliation algorithm. Independent of auth UI. |
| P3-3 | One-time migration wizard (LS-only → account-bound) | Needs both auth and sync shipped. One-shot migration script + UI. |

**P3-1 deliberately does NOT touch:**
- P2 LS data (favorites/recent/history keys unchanged)
- P2 init scripts (favorites-init / recent-init / history-init 0 lines changed)
- P2 pages (`/favorites/`, `/recent/`, `/history/`)
- engines/ (frozen per CLAUDE.md)
- 32 tool count (frozen per CLAUDE.md)

## 2. Goal

Add a Clerk-managed account entry point to the Header. After P3-1 ships:
- Header shows `[Login]` for logged-out users, `[Avatar + dropdown]` for logged-in users
- Click `[Login]` opens Clerk SignIn modal (email code + Google + GitHub + others)
- Click `[Avatar]` shows Clerk UserButton (Profile / Sign out / Multi-session)
- All P2 features unchanged
- Zero backend code on our side (Clerk is single source of truth for user identity)
- Zero user data stored on our side (we use Clerk, not our DB)

## 3. Non-Goals (V1 explicitly does NOT do)

| Not in V1 | Reason | Deferred to |
|---|---|---|
| Cross-device sync of favorites/recent/history | Sync logic needs backend choice + reconciliation algorithm | P3-2 |
| LS → cloud migration wizard | Needs both auth and sync first | P3-3 |
| i18n for "Login" / "Sign out" / "Account" | Clerk UI is English; mixing UI languages confuses users. V1 hardcode English. | P3-2 with full i18n sweep |
| `/status/` page for Clerk outage reporting | YAGNI; Clerk rarely down | When actual outage happens |
| Cookie consent banner | YAGNI; Clerk's cookies are essential under GDPR | When legally required |
| CSP / SRI headers for Clerk script domains | V1 has no CSP; Clerk JS runs as 3rd-party | P3-2 when we add server-to-server calls |
| E2E tests with real Clerk account | Requires Clerk test mode + Playwright/Cypress; out of scope | When P3-2 ship needs it |
| Custom Clerk UI theme / branding | Use Clerk defaults | Brand refresh project |
| User avatar upload | Clerk provides default; user can change in profile | N/A (Clerk feature) |
| Multi-account / switch account | Clerk `<UserButton />` has built-in multi-session | N/A (Clerk feature) |
| OAuth provider curation | Clerk enables 6+ by default; dev self-curates in Clerk dashboard | N/A |

## 4. User Story

> As a ForgeFlowKit user, I want to log in once and have my account session available across tabs and visits, **even before cross-device sync ships**. So I can: (a) know my preferences will eventually follow me to other devices, (b) build trust with the platform before sync ships, (c) avoid re-entering identity every visit.

**Note**: P3-1 ships the **identity substrate only**. The "preferences follow me" promise is P3-2's job. Privacy policy MUST clarify this (see Section 5.5).

## 5. Design

### 5.1 Architecture

**Layer model:**

```
┌─ Build time ─────────────────────────────────────────────┐
│  Astro reads PUBLIC_CLERK_PUBLISHABLE_KEY from .env     │
│  Header.astro hasClerkEnv() gate                        │
│  HTML rendered: <div data-clerk-mount>Login</div>       │
│  BaseLayout injects clerk-init.client.ts <script>       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─ Runtime (browser) ─────────────────────────────────────┐
│  clerk-init.client.ts runs (deferred)                   │
│  new Clerk(publishableKey).load()                       │
│    ├─ Success + logged in → mountUserButton             │
│    │   (Clerk prebuilt UI: avatar + dropdown)           │
│    ├─ Success + logged out → bind click → openSignIn    │
│    └─ Failure → console.error + clear mountEl          │
│                                                          │
│  User clicks Login → Clerk modal opens                  │
│    ├─ Email code / Google / GitHub / etc.               │
│    └─ On success → mount auto-updates to UserButton     │
└─────────────────────────────────────────────────────────┘
```

**Why this is the right depth:**
- Static front-end, no SSR runtime needed (project is SSG-only on Tencent CDN)
- Vanilla `@clerk/clerk-js` already runs in browser, no framework-specific glue
- Reuses existing P2 init pattern (per-script init.client.ts, document-level click delegation)
- Clerk handles all auth logic — we only mount the UI components

### 5.2 Components

#### 5.2.1 `src/lib/clerk-env.ts` (~25 lines, NEW)

Build-time helper: detect if Clerk publishable key is configured.

```typescript
/**
 * Detect if Clerk publishable key is present and valid (not placeholder).
 * Reads from .env / .env.production at build time via Vite/Astro.
 */
export function hasClerkEnv(): boolean {
  const key = import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY;
  return Boolean(key && key !== '' && !key.includes('REPLACE_ME'));
}
```

#### 5.2.2 `src/scripts/clerk-init.client.ts` (~80 lines, NEW)

Browser lifecycle for Clerk SDK + DOM mount.

```typescript
import { Clerk } from '@clerk/clerk-js';

const PUBLISHABLE_KEY = import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY;
let clerkInstance: Clerk | null = null;

export async function initClerk(): Promise<void> {
  if (!PUBLISHABLE_KEY) return;  // gated by Header, but defensive
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
    mountEl.innerHTML = '';  // silent failure — see Section 5.4
  }
}

function handleLoginClick(e: Event) {
  e.preventDefault();
  if (clerkInstance) clerkInstance.openSignIn();
}

/** @internal exported for tests */
export function getClerkInstance(): Clerk | null {
  return clerkInstance;
}
```

#### 5.2.3 `src/components/Header.astro` (MOD, +12 lines)

Add Clerk mount block after categories dropdown, before nav items.

```astro
---
import { hasClerkEnv } from '../lib/clerk-env';
const showClerk = hasClerkEnv();
---

<!-- existing dropdowns ... -->

{showClerk && (
  <div class="clerk-mount" data-clerk-mount aria-label="Account">
    <button type="button" class="login-fallback" data-clerk-login>
      Login
    </button>
  </div>
)}

<!-- existing nav items + lang switch ... -->
```

#### 5.2.4 `src/layouts/BaseLayout.astro` (MOD, +5 lines)

Add Clerk init script alongside existing 3 init scripts.

```astro
<script>
  import '../scripts/clerk-init.client.ts';
</script>
```

#### 5.2.5 `src/pages/[lang]/privacy-policy.astro` (MOD, +30 lines)

Add bilingual Clerk section between "Third-Party Services" and existing "Browser Storage" sections.

### 5.3 Data Flow

**No backend, no API routes, no DB.** All identity operations are browser-side against Clerk's hosted service:

```
User click [Login]
  ↓
clerk-init.handleLoginClick
  ↓
clerk.openSignIn()         [Clerk SDK → modal opens]
  ↓
User submits email code / OAuth
  ↓
Clerk validates on their server, sets __session JWT cookie
  ↓
Clerk.user becomes truthy
  ↓
Clerk auto-updates mountUserButton (we don't intervene)
  ↓
Avatar + dropdown shows
```

**No data crosses our domain.** Our site never sees the user's email or OAuth token.

### 5.4 Error Handling

| Failure mode | Behavior | Mitigation |
|---|---|---|
| `.env` missing `PUBLIC_CLERK_PUBLISHABLE_KEY` | Header Clerk block not rendered (`hasClerkEnv()` gate) | Local dev: warning. CI: build fails via `scripts/check-clerk-env.mjs`. |
| Key format invalid (not `pk_test_xxx`) | `new Clerk()` throws → `initClerk` catch → mountEl cleared | Console.error logged. V1 silent failure acceptable per non-goal. |
| Clerk CDN/API network error | `clerk.load()` rejects → catch → mountEl cleared | Console.error logged. Same as above. |
| Clerk service outage (500/error) | Same as network error | Same as above. Clerk has 99.9% SLA per their docs. |
| User disabled JS | Fallback button click no-op | V1 acceptable; not core feature. |
| User disabled 3rd-party cookies | Clerk modal prompts user to enable | We don't intervene. |
| Multiple mount elements present | `querySelector` returns first only | Defensive: only Header has mount; not a real risk. |
| Clerk JS slow to load (>5s) | Fallback button shown until Clerk ready | V1 no spinner per "简洁优先". |
| User changes language (en → zh) | Clerk UI remains English | V1 hardcode English per non-goal. |
| User signs out | `clerk.user = null` → mount auto-reverts to fallback button | Clerk self-handles. |
| LS full or disabled | N/A — P3-1 doesn't touch LS | P2 features unaffected. |
| Multi-tab open | Clerk broadcasts via BroadcastChannel + cookie | Clerk self-handles. |

**Fallback policy (revised from initial brainstorm):** on any Clerk init failure, `mountEl.innerHTML = ''` (clears the mount node). No fallback `<a href="/status/">` link — V1 doesn't create `/status/`. User sees empty space where login button was. Acceptable because:
- P2 features continue working fully
- Clerk outages are rare and self-resolve
- Adding a status page is YAGNI

### 5.5 Privacy / GDPR

Privacy policy must explicitly disclose Clerk. New bilingual section in `privacy-policy.astro`:

**English:**
> ## Account Authentication (Clerk)
> We use Clerk (clerk.com) to handle user authentication. When you log in, Clerk collects and processes your email address, IP address, and browser fingerprint on their servers. We do not store any of this data — Clerk is the sole data controller for authentication. Their privacy policy applies: https://clerk.com/privacy.

**Chinese:**
> ## 账户认证（Clerk）
> 我们使用 Clerk (clerk.com) 处理用户认证。当你登录时，Clerk 在他们的服务器上收集和处理你的邮箱地址、IP 地址和浏览器指纹。我们不存储任何这些数据 — Clerk 是认证数据的唯一控制方。其隐私政策适用于：https://clerk.com/privacy。

**Other privacy decisions:**
- No cookie consent banner V1 (Clerk's auth cookies are essential under GDPR, per their docs)
- No data deletion endpoint on our side (we don't store user data)
- Clerk default retention: 30 days post-account-deletion (per Clerk policy)
- P2 LS data unaffected (still local-only)

## 6. Testing Strategy

### 6.1 Test Matrix

| Layer | File | Type | Count | Covers |
|---|---|---|---|---|
| `clerk-env.ts` | `tests/clerk-env.test.ts` | unit | 6 | env present/missing/empty/REPLACE_ME/production-priority/CI-aware |
| `clerk-init.client.ts` | `tests/clerk-init.test.ts` | per-test child proc | 8 | mount missing/key missing/load success-loggedin/loggedout/load-failure/click handler/click-noop |
| `check-clerk-env.mjs` | `tests/check-clerk-env.test.ts` | spawn node | 4 | exit 0 (valid)/exit 1 (CI no env)/exit 0 (local no env)/exit 1 (REPLACE_ME) |
| Header Clerk block | `tests/header-clerk-render.test.ts` | build snapshot | 3 | mount appears (env)/absent (no env)/en+zh consistent |
| BaseLayout Clerk script | `tests/baselayout-clerk-script.test.ts` | build snapshot | 2 | clerk-init.client.ts script tag exists/no duplicate |
| privacy-policy Clerk section | `tests/seo-schemas.test.ts` (+fixture) | existing fixture | 1 | bilingual Clerk section present |

**Total: 24 new tests**

### 6.2 What V1 does NOT test

- Clerk internal behavior (login flow, JWT signing, OAuth callbacks) — Clerk tests this
- UserButton dropdown menu — Clerk prebuilt UI, we just mount
- SignIn modal UI — Clerk internal
- Cross-browser compatibility — Clerk tests; we only verify in Chrome (matches P2 CI)
- Real Clerk account creation — uses fake key, no real connection

### 6.3 Per-test isolation pattern (P2 precedent)

Each `clerk-init` test runs in a fresh child process to avoid module-cache pollution (mirrors P2a/P2b/P2c pattern shipped in 2026-06-30 → 2026-07-01).

### 6.4 E2E tests (NOT in V1)

No Playwright/Cypress. Project has no E2E framework per CLAUDE.md. Defer until P3-2 needs it.

## 7. Global Constraints (binding)

**CLAUDE.md invariants — must NOT appear in diff:**
1. ❌ `src/engines/` zero changes (32 engines frozen)
2. ❌ 32 tool count frozen
3. ❌ `blog-posts.ts` still deleted (P1-2)
4. ✅ i18n completeness check passes (143 keys; V1 adds 0 keys)
5. ✅ 3 mirrors in sync: gitee (origin=wlz679/calcKit) + github (wlz679/forgeflow)
6. ✅ github push uses `SKIP_PUSH_FETCH=1`
7. ✅ `pnpm check` exit 0 before commit (now includes `check-clerk-env`)
8. ✅ Pre-commit hook (`.githooks/pre-commit`) runs codegen check — P3-1 unaffected

**P2 trilogy invariants — must NOT change:**
- `forgeflowkit:favorites:v1` / `:recent:v1` / `:history:v1` LS keys
- `src/lib/{favorites,recent,history}.ts` (0 lines changed)
- `src/scripts/{favorites,recent,history}-init.client.ts` (0 lines changed)
- P2 dropdowns in Header (3 blocks, untouched)
- `/favorites/`, `/recent/`, `/history/` pages (0 lines changed)

**New constraints introduced by P3-1:**
- `PUBLIC_CLERK_PUBLISHABLE_KEY` required in CI env (build fails without it)
- `@clerk/clerk-js ^6.x` added to dependencies (revised 2026-07-01 during Task 3: pnpm resolved to 6.23.0; API surface (Clerk class + load() + mountUserButton + openSignIn + user getter) fully compatible with brief usage)
- `.env` and `.env.local` added to `.gitignore`
- `.env.example` created with placeholder key

## 8. Implementation Plan (preview — formal plan in next step)

6 tasks following P2 subagent-driven pattern:

| # | Task | Class | Files | Reviewers |
|---|---|---|---|---|
| T1 | `src/lib/clerk-env.ts` + 6 unit tests | [MECHANICAL] | +1 lib, +1 test | 1 impl + 1 spec |
| T2 | `scripts/check-clerk-env.mjs` + 4 tests | [MECHANICAL] | +1 script, +1 test | 1 impl + 1 spec |
| T3 | `src/scripts/clerk-init.client.ts` + 8 component tests | [INTEGRATION] | +1 init, +1 test | 1 impl + 1 spec + 1 quality |
| T4 | Header.astro + BaseLayout.astro + `.env.example` + package.json + .gitignore + 5 snapshot tests | [INTEGRATION] | +3 source, +1 test | 1 impl + 1 spec + 1 quality |
| T5 | privacy-policy.astro Clerk section (bilingual) + 1 SEO fixture | [MECHANICAL] | +1 page, +1 test | 1 impl + 1 spec |
| T6 | Docs + holistic review + push to mirrors | [INTEGRATION] | holistic fix wave | 1 impl + holistic 8 angles |

**Estimated commits: 8** (1+1+2+2+1+1, matches P2's 11-commit scope)

**Per-task review calibration** (per CLAUDE.md): mechanical tasks = 1 reviewer; integration tasks = 2 reviewers.

## 9. V1 Limitations (explicit)

| Limit | Reason | Resolved by |
|---|---|---|
| Header shows `[Login]` English only | i18n deferred | P3-2 full i18n sweep |
| No sync of P2 data | Sync logic is P3-2 | P3-2 |
| No migration of LS → cloud | Needs sync | P3-3 |
| Silent failure on Clerk outage | No `/status/` page | When outage happens |
| No CSP for Clerk domains | V1 has no CSP | P3-2 server-to-server |
| No E2E tests | No framework | P3-2 if needed |
| Clerk default theme (no brand match) | Brand refresh is its own project | Brand project |
| 6+ OAuth providers enabled by default | Clerk default | Dev curates in Clerk dashboard |

## 10. Rollback Strategy

Single-commit rollback feasible (V1 ships as ~8 commits but each is independently revertible):

```bash
git revert <last-p3-1-commit>     # reverts all P3-1 changes
# OR surgically:
rm src/scripts/clerk-init.client.ts
rm src/lib/clerk-env.ts
rm scripts/check-clerk-env.mjs
# Edit src/components/Header.astro → remove {showClerk && ...} block
# Edit src/layouts/BaseLayout.astro → remove <script>import clerk-init</script>
# Edit src/pages/[lang]/privacy-policy.astro → remove Clerk section
# Edit package.json → remove @clerk/clerk-js dep
```

**P2 data unaffected** by rollback (P3-1 doesn't touch P2 LS keys or scripts).

## 11. Decision Log (P3-2 / P3-3 reservation points)

When P3-2 ships, these points are reserved for the sync layer to integrate:

| Reservation point | Location | What P3-2 needs to add |
|---|---|---|
| Header avatar dropdown | `src/components/Header.astro` Clerk block | "Sync now" / "Last synced at" entries |
| Clerk user identity propagation | `src/scripts/clerk-init.client.ts` `getClerkInstance()` | Export `clerk.user.id` for sync key |
| Privacy policy Clerk section | `src/pages/[lang]/privacy-policy.astro` | Append "Data sync" section explaining what syncs |
| `/api/*` routes | NEW directory (P3-2 introduces) | Backend sync endpoints |
| `src/lib/sync.ts` | NEW file (P3-2) | LS ↔ backend reconciliation |
| Server-side env vars | `.env.example` | Add `CLERK_SECRET_KEY` + `SYNC_BACKEND_URL` (P3-2 only) |

**P3-3 migration UI reservation:**

| Reservation point | Location | What P3-3 needs |
|---|---|---|
| First-login detection | `src/scripts/clerk-init.client.ts` | Detect LS data on first auth, trigger migration wizard |
| Migration wizard route | `src/pages/[lang]/migrate.astro` (P3-3) | One-time UI |
| Migration API | `/api/migrate` (P3-3) | Bulk LS → cloud transfer |

---

**Spec complete.** Self-review follows.

---

## Appendix A: Self-Review (run 2026-07-01)

**1. Placeholder scan:** No "TBD" / "TODO" / "later" present. All deferred items marked as V1 non-goals with P3-2/P3-3 attribution.

**2. Internal consistency:** "P3-1 = auth only" stated in 5 places (Background, Goal, Non-Goals, Constraints, Limitations) — consistent.

**3. Scope check:** Single sub-project. ~1-2 weeks of work. Testable: 24 tests cover all layers. Rollback-able: single commit revert. ✅

**4. Ambiguity check:**
- "Sync interface" → §11 Decision Log specifies P3-2 reservation points
- "i18n" → §3 + §9 explicitly defer to P3-2
- "Migration" → §11 Decision Log specifies P3-3 reservation points
- "CSP" → §3 + §9 explicitly defer to P3-2

**5. CLAUDE.md alignment:**
- ✅ engines/ frozen (Section 7)
- ✅ 32 tools frozen (Section 7)
- ✅ Mirror push flow (Section 7)
- ✅ pnpm check exit 0 (Section 7)
- ✅ Subagent-driven execution pattern (Section 8)
- ✅ Per-task review calibration (Section 8)

**No issues found. Spec approved by self-review.**