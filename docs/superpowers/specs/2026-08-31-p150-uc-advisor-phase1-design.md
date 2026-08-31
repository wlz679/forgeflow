# P150 Dimension 2: User-Centric Advisor — Phase 1 Feedback Widget

> **Status**: DRAFT (brainstorming complete, all 5 sections approved by user)
> **Branch**: TBD (will be `feature/p150-uc-advisor-feedback`)
> **Goal**: Ship Phase 1 of "v2.0 灵魂 维度 2 (User-Centric Advisor)" landing — feedback collection mechanism that starts the data feedback loop for future phases.
> **Trigger**: AGENTS.md §106-122 defines 3 v2.0 dimensions. Dimension 1 (Decision Support) and Dimension 3 (Proactive Co-Pilot) are landed. Dimension 2 (User-Centric Advisor 5-question framework) has no spec, no audit, no shipped mechanism — biggest constitutional gap.

---

## §1 Context

`AGENTS.md:113` defines Dimension 2 of v2.0 灵魂:
> **User-Centric Advisor** — 用户视角 5 问（功能价值 / UX / Advisor / Retention / Advocacy）

5 问 framework is named but no implementation has shipped. Phase 1 closes the smallest possible loop: **collect user feedback (👍/👎 + optional text) per page**, sending aggregation events to Plausible (already wired) and queuing text for a future server endpoint (Phase 2).

This is a **one-week ship target**, isolated from the AdSense reapply decision (deferred to 2026-09-08), with no impact on master traffic or SEO. Branch: `feature/p150-uc-advisor-feedback`.

---

## §2 Architecture

### Components

- **New**: `src/components/FeedbackWidget.astro` — single Astro component, client-hydrated for click handler
- **Modified**: `[slug].astro` page footer (calc + topic pages)
- **Modified**: `src/i18n/locales/{en,zh}.json` — 4 new keys per lang: `feedback.up`, `feedback.down`, `feedback.prompt`, `feedback.thanks`

### Integration

- **Plausible**: Custom event `feedback_vote` with props `{vote, slug, page_kind, lang}`. Plausible script is already loaded (P147 ship).
- **localStorage queue**: `forgeflowkit:feedback:v1` — JSON array, max 100 entries, LRU eviction. Phase 2 server endpoint will batch-POST from this queue.
- **No backend**: Phase 1 ships without server. Text feedback stays in localStorage until Phase 2.

---

## §3 Component API

```astro
<FeedbackWidget
  pageKind="calc" | "topic" | "blog"
  slug="solopreneur-mrr-calculator"
  lang="en" | "zh"
/>
```

Props drive:
- i18n key lookup (`feedback.*` namespace)
- Plausible event payload (`props.page_kind`)
- localStorage queue entry metadata

---

## §4 Data Flow

```
User clicks 👍 or 👎
  ├─→ JS handler intercepts click
  ├─→ window.plausible("feedback_vote", {props: {vote: "up"|"down", slug, page_kind, lang}})
  ├─→ UI state: button disabled, "Thanks!" message shown
  └─→ (if text present in optional textarea)
       └─→ append {ts, vote, slug, page_kind, lang, text} to localStorage queue
           └─→ LRU eviction if queue > 100 entries (oldest 10 evicted)

Phase 2 (out of scope):
  localStorage queue → batch POST /api/feedback → R2 storage → custom dashboard
```

---

## §5 Error Handling

| Scenario | Behavior |
|---|---|
| Plausible blocked (ad blocker, 25-30% of users) | Silent fail — UI still works; Plausible event lost |
| localStorage disabled (private mode, ~5% users) | 👍/👎 vote still works (Plausible sent); text input hidden with i18n message "feedback needs browser storage" |
| localStorage 5MB cap hit | LRU evict oldest 10 entries; new event accepted |
| No JS (server-rendered HTML only) | Static widget rendered but non-interactive; no Plausible event; no localStorage queue |
| Spam feedback (rapid clicks) | Phase 1 OK (low traffic); Phase 2 add Cloudflare Turnstile on text submit |

---

## §6 Testing (4 regression tests)

1. **`tests/feedback-widget-guard.test.ts`** — spot-check 10 strategic pages render `<div class="feedback-widget"` + Plausible handler attribute
2. **`tests/feedback-widget-render.test.ts`** — verify component renders correctly per `pageKind` (calc/topic/blog) + i18n keys resolve in both en + zh
3. **`tests/feedback-widget-plausible.test.ts`** — mock `window.plausible`, simulate click, verify event payload shape `{vote: "up"|"down", slug, page_kind, lang}`
4. **`tests/feedback-widget-localstorage.test.ts`** — mock localStorage in Node test, verify queue append + LRU eviction at cap 100

---

## §7 Acceptance Criteria

| Check | Target |
|---|---|
| New files | `src/components/FeedbackWidget.astro` + 4 test files |
| Modified files | `src/pages/[lang]/[slug].astro`, `src/i18n/locales/{en,zh}.json` (4 keys × 2 langs = 8 keys) |
| `pnpm check` | 1299/1300 → 1303/1300 (4 new tests, no regression) |
| Plausible dashboard | `feedback_vote` custom event visible within 1 hr of click |
| Manual test | 👍/👎 click → Plausible dashboard count +1 |
| New branch | `feature/p150-uc-advisor-feedback` |
| Documentation | `memory/p150-uc-advisor-phase1-shipped.md` |

---

## §8 Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Plausible blocked by ad blocker | LOW | Silent fail; UX not affected |
| localStorage 5MB cap hit | LOW | LRU eviction (max 100 entries) |
| Spam feedback (no auth in Phase 1) | LOW (low traffic) | Phase 2 add Cloudflare Turnstile |
| i18n key missing in zh | MEDIUM | Test verifies en + zh strings render |
| Widget affects Core Web Vitals (extra JS) | LOW | Astro island; widget JS <2KB; Plausible already loaded |

---

## §9 Out of Scope (Phase 2 candidates)

- Server endpoint `POST /api/feedback` (Cloudflare Pages Function)
- R2 storage + custom dashboard
- User authentication / rate limiting
- Cloudflare Turnstile for spam prevention
- 5-question framework full ship: Retention tracking, Advocacy share-link, UX audit, Advisor action loops, Functional value measurements
- P150 Dimension 3 (Proactive Co-Pilot) — already landing via market-signal-2026-08-25 rounds

---

## §10 Branch & Rollout

- **Branch**: `feature/p150-uc-advisor-feedback` (created after spec commit)
- **Commits**: 5-7 atomic commits
  1. Component skeleton (Astro file, no behavior)
  2. i18n keys (4 × 2 langs)
  3. Plausible event handler
  4. localStorage queue + LRU
  5. Render in `[slug].astro` (calc + topic)
  6. 4 regression tests
  7. Ship record + memory update
- **Merge to master**: After all tests pass + manual Plausible dashboard verification
- **AdSense impact**: ZERO (no production traffic change, no SEO change, no new pages)

---

## §11 Self-Review

1. **No placeholders**: All sections concrete; no TBD / TODO.
2. **Internal consistency**: Architecture (§2) → API (§3) → Data Flow (§4) all align on the same 4-element model (button click → Plausible event → localStorage queue).
3. **Scope**: Phase 1 ships 1 feedback widget; Phase 2-4 deferred to future sub-projects. Single implementation plan can cover.
4. **Ambiguity check**: `pageKind` enum (`calc`/`topic`/`blog`) is explicit; i18n key names are explicit; LRU cap is concrete (100).

---

## §12 Tasks (for writing-plans)

1. **Task 1**: Create `feature/p150-uc-advisor-feedback` branch from master
2. **Task 2**: Add i18n keys (`feedback.up`, `feedback.down`, `feedback.prompt`, `feedback.thanks`) to en.json + zh.json
3. **Task 3**: Create `src/components/FeedbackWidget.astro` skeleton (button + JS handler)
4. **Task 4**: Wire Plausible custom event `feedback_vote`
5. **Task 5**: Add localStorage queue + LRU eviction (cap 100)
6. **Task 6**: Mount widget in `[slug].astro` calc page footer
7. **Task 7**: Mount widget in topic/blog pages (TopicCard + blog footer)
8. **Task 8**: Write 4 regression tests
9. **Task 9**: Run `pnpm check` + verify 1303/1300 PASS
10. **Task 10**: Manual Plausible dashboard verify
11. **Task 11**: Ship record + memory update
12. **Task 12**: Merge feat → master, push gitee + github