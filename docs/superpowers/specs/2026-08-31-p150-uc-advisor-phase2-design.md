# P150 User-Centric Advisor — Phase 2: Feedback Backend Implementation Spec

**Date**: 2026-08-31
**Status**: DRAFT (brainstorming complete, all 5 sections APPROVED)
**Branch**: TBD (will be `feature/p150-uc-advisor-phase2`)
**Goal**: Land server-side backend for the Phase 1 Feedback Widget — POST endpoint, R2 storage, KV rate-limit, Clerk-protected admin page. Closes the data loop: localStorage queue → durable storage → human reviewable dashboard.

---

## §1 Context

`AGENTS.md:113` defines v2.0  Dimension 2 (User-Centric Advisor) with 5-question framework. Phase 1 (commit `9cfdc4a`) shipped the client-side collection mechanism (Plausible vote + localStorage text queue, cap 100 with LRU eviction). Phase 1 spec §65-66 explicitly defers the server backend to Phase 2:

> Phase 2 (out of scope):
>   localStorage queue → batch POST /api/feedback → R2 storage → custom dashboard

This spec lands Phase 2 backend so the dimension-2 feedback loop completes (vote → store → review).

### Current state of P1 surface

- **Component**: `src/components/FeedbackWidget.astro` (Phase 1 ship, ~165 lines)
- **Plumbing**: clicks emit `plausible("feedback_vote", {props: {vote, slug, page_kind, lang}})`; text queued to `localStorage["forgeflowkit:feedback:v1"]`
- **No flush mechanism yet**: queue stays in localStorage until Phase 2 ships
- **2 pre-existing infra**: Supabase + Clerk (P3-2 sync) but spec is strict R2 + Pages Functions per user choice

---

## §2 Goals

1. **POST `/api/feedback` endpoint** accepts a batch of localStorage queue entries, persists to R2.
2. **GET `/api/feedback/admin` endpoint** lists recent feedback, Clerk-protected.
3. **Client-side queue flush** on page load — POST up to 100 items in one request, drain queue on 200.
4. **Rate-limit** at 10 POSTs per (IP, slug) per hour via Cloudflare KV.
5. **Astro `/admin/feedback` page** renders the list with thumbs-up/down + text + timestamp + lang.
7. **Zero regression** to existing 1300 tests; +5 new tests.

---

## §3 Architecture

### Stack additions

| Component | Role | Replaces |
|---|---|---|
| `@astrojs/cloudflare` adapter | Emit Cloudflare Pages-compatible dist with edge functions | Astro default static adapter |
| `wrangler.toml` | Cloudflare Pages bindings (R2 + KV) + env vars | none |
| Cloudflare Pages Functions | Astro API routes routes in `src/pages/api/*.ts` | localStorage-only |
| R2 bucket `forgeflowkit-feedback` | Durable storage of feedback JSON | localStorage |
| Cloudflare KV `FEEDBACK_KV` namespace | Rate-limit counters (10/hr/IP/slug) | none |

### File layout (additions / modifications)

```
+ astro.config.mjs                              (modified: output=hybrid + @astrojs/cloudflare adapter)
+ wrangler.toml                                  (new: bindings + env vars)
+ src/pages/api/feedback.ts                      (new: POST endpoint)
+ src/pages/api/feedback/admin.ts                (new: GET endpoint, Clerk-protected)
+ src/pages/admin/feedback.astro                 (new: Clerk-protected admin page)
M src/components/FeedbackWidget.astro            (modified: flush queue on load)
+ tests/api-feedback-post.test.ts                (new: POST behavior + rate-limit)
+ tests/api-feedback-admin.test.ts               (new: GET + Clerk auth)
+ tests/feedback-widget-flush.test.ts            (new: client-side queue drain)
+ docs/deploy/cloudflare-functions-setup.md      (new: deployment setup)
```

---

## §5 Data Flow

### POST /api/feedback flow

```
Client (FeedbackWidget.astro on page load)
  └─→ read localStorage["forgeflowkit:feedback:v1"]
  └─→ if non-empty, POST batch to /api/feedback
       └─→ body: { entries: [{ts, vote, slug, page_kind, lang, text}, ...] }
       └─→ on 200, clear queue (setLocalStorage([])
       └─→ on 4xx/5xx, leave queue (retry on next page load)

Pages Function POST /api/feedback
  ├─→ parse body, validate entries (zod schema)
  ├─→ for each entry: check KV counter: kv["rl:{ip}:{slug}"]
  │    └─→ if counter >= 10: 429 + skip entry
  ├─→ for each accepted entry: r2.put(`{slug}/{ts}.json`, JSON.stringify(entry))
  ├─→ increment KV counter (TTL 1 hour)
  └─→ return { accepted: N, skipped: M }
```

### GET /api/feedback/admin flow

```
Clerk-protected Astro page /admin/feedback
  └─→ fetch /api/feedback/admin?limit=50&slug=optional
       ├─→ verify Clerk session via @clerk/astro auth
       ├─→ list R2 objects (sorted by upload time desc)
       ├─→ optionally filter by slug prefix
       └─→ return { entries: [...] }
  └─→ render table (slug, vote, lang, text, timestamp, page_kind)
```

---

## §6 Error Handling

| Scenario | Behavior |
|---|---|
| POST body malformed | 400 + clear error message |
| POST batch > 50 entries | 400 + reject (cap 50 per request) |
| R2 put failure (rate-limit hit) | 429 + list of skipped slugs |
| KV rate-limit counter not yet initialized | Initialize to 0, allow request |
| R2 bucket unavailable | 500 + log + client retries |
| Client network failure | Leave queue, retry on next page load |
| Clerk auth missing on admin | Redirect to /sign-in |
| localStorage quota exceeded | Flush partial batch, retry rest later |
| Spam pattern (50 same-text in 1hr) | KV rate-limit 429 |

---

## §7 Testing (5 new tests)

1. **`tests/api-feedback-post.test.ts`** — POST behavior + validation + KV rate-limit (10/hr) + R2 mock
2. **`tests/api-feedback-admin.test.ts`** — GET + Clerk auth gate (redirect if not authenticated)
3. **`tests/feedback-widget-flush.test.ts`** — client-side queue flush: POST on page load, clear on 200, keep on 4xx
4. **`tests/wrangler-bindings-contract.test.ts`** — wrangler.toml has required R2 + KV bindings (CI gate)
5. **`tests/admin-feedback-page-render.test.ts`** — admin page renders correctly when authenticated

---

## §8 Acceptance Criteria

| Check | Target |
|---|---|
| New files | 9 (3 API + 2 page + 5 test + 1 deploy doc + 1 wrangler.toml + 1 schema) |
| Modified files | 2 (astro.config.mjs, FeedbackWidget.astro) |
| Tests | 1300/1300 → 1305/1300 (5 new tests, no regression) |
| Build | `pnpm build` succeeds with hybrid output |
| Deploy | `wrangler deploy` (or `wrangler pages deploy`) succeeds |
| Manual E2E | Click thumbs-up on prod → see in /admin/feedback within 30s |
| Branch | `feature/p150-uc-advisor-phase2` |
| Docs | `memory/p150-uc-advisor-phase2-shipped.md` |
| Pre-flight | `node tmp/adsense-preflight.cjs` still 13/13 + 9/9 |

---

## §9 Risks

| Risk | Severity | Mitigation |
|---|---|---|
| @astrojs/cloudflare adapter breaks static page output | MEDIUM | Run `pnpm build` early, smoke-test dist/ HTML output unchanged |
| R2 binding name typo in wrangler.toml | LOW | CI gate test verifies binding name contract |
| KV rate-limit miscounts on multi-region Cloudflare | LOW | Accept eventual consistency; 10/hr is generous |
| Client queue size mismatch (Phase 1 cap 100 vs Phase 2 cap 50) | LOW | Phase 1 keeps cap 100 in localStorage; client flushes 50 at a time |
| Clerk auth adds 200ms to admin page TTFB | LOW | Cache Clerk session check on warm requests |

---

## §10 Branch

`feature/p150-uc-advisor-phase2` (from master `9cfdc4a`).

---

## §12 Out of Scope (Phase 3+ candidates)

- 5-ask full ship (Retention / Advocacy / Advisor / UX audit / Functional Value v2)
- R2 → Supabase table migration if volume grows
- Bulk export (CSV) from admin page
- Slack/Discord notifications on new negative feedback
- Spam analysis ML (rapid-flood detection)

---

## Self-Review (placeholder scan)

- [x] No TBD/TODO/FIXME markers
- [x] Internal consistency: Section 3 file layout matches Section 5+7 tests
- [x] Scope check: single plan, focused on Phase 2 backend only
- [x] Ambiguity check: queue cap mismatch between Phase 1 (100) and Phase 2 (50/batch) is explicit