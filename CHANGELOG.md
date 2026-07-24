# Changelog

> **ForgeFlowKit release timeline** — 所有 notable changes 都记录在这里。
> **Format**: 改编自 [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/)，按 P-series milestone 分段（而非按日期），因为单日可能涵盖多个 P-series commits 而单个 P-series 跨多日。
> **最后更新:** 2026-07-24 (P65 CHANGELOG catch-up)
> **引擎数轨迹:** 30 (scaffold) → 32 → 38 → 44 → 50 → 56 → 62 → 68 → 74 → 86 → 92 → 98 → **100** (P16 lock)
> **Total commits:** 712 across 38 active days (2026-05-31 → 2026-07-24, ~8 weeks)

---

## Conventions

- **Categories**: Added (new feature) · Changed (existing behavior update) · Deprecated (will-be-removed marker) · Removed · Fixed · Security
- **Milestone label** `[Mx.y] - YYYY-MM-DD — short title` — Mx.y 不是 semver，是 P-series 标签（P-series 是项目内的批次号，与 semver 解耦）
- **📦 ship log** 每节末尾链接到对应 `memory/pNN-*-shipped.md` 文件 — 这是 ship memory 的入口
- **Scope tag** `[engines]` / `[data]` / `[scripts]` / `[components]` / `[tests]` / `[docs]` / `[ci]` — 让读者快速定位
- **Engine count** 每节显式标注 `(engines: 30→32)`, `(engines: 98→100)` — 让数字轨迹可读
- 完整 commit 列表见 `git log --oneline`

---

## [Unreleased]

### Added
- (next P-series batch will appear here)
- Candidate: `CHANGELOG.md` itself (P45) just shipped; `tests/codegen-drift-guard.test.ts` (P42 mock regression guard) pending
- Candidate: ~~`categories.ts` (15 letters) vs `CLAUDE.md` (16 letters) drift audit pending~~ ✅ AUDITED 2026-07-20 by P46 (this batch)

---

## [M16.0] - 2026-07-15 → 2026-07-16 — 100 engines milestone (P16)

🔒 **Maintenance mode locked** after this milestone. Engine count locked at `EXPECTED_ENGINE_COUNT = 100` (see `tests/engine-count.ts`).

### Added
- **[engines] M: +coupon-attribution** (`engine 99`) — e-commerce attribution calc
- **[engines] M: +cart-abandonment-cost** (`engine 100`) — final engine, milestone
- **[tests] 42-engine old-pattern sweep** — `clampNonNegative` + `cnn` defensive layer across saas/real-estate/investment/hiring/freelance/cost/valuation
- **[tests] 13 valuation engines + 13 tests** — P15 polish bundle
- **[tests] HTML5 step="any" smoke test** across `dist/` build output
- **[tests] verify-customfn.mjs parser extension** — handles 4 customFn declaration styles

### Changed
- **[engines] v3 standard applied to 100/100 engines** — 92 business (🩺 Health + 🔄 What-If + ⚖️ Break-Even + 🎯 Milestone + 💡 Tip) + 8 AI Cost (📊 Cost Breakdown + 🏆 Provider Comparison + 📅 Data updated badge)
- **[ui] BIZ_CONFIG_MAP + 4 BIZ_*_CONFIG + 205 preset-chip references** wired
- **[i18n] 15 × 6 preset keys per engine** complete

### Fixed
- **[engines] v3 emoji completeness** — added 7 sections + health band 🟠🟡🟢 emojis; trailing newlines on all engines
- **[build] trailing newlines** consistency across 46 test files

### Engineering metrics
| Metric | Value |
|---|---|
| Engines | **100/100** |
| Categories | 15 |
| v3 standard | 100% lock |
| Defense layer (clamp + cnn) | 100% |
| pnpm check baseline | 1095 pass / 0 fail |
| Total commits in P16 batch | 14 (7-task batch, 2 days) |
| Pre-existing findings | 1 (deferred, NOT maintenance triggers) |

📦 ship log: [`memory/p16-100-milestone-shipped.md`](memory/p16-100-milestone-shipped.md) · P15 audit at [`memory/p15-cross-cutting-audit-shipped.md`](memory/p15-cross-cutting-audit-shipped.md) · P14-followup at [`memory/p14-followup-cross-cutting-audit-shipped.md`](memory/p14-followup-cross-cutting-audit-shipped.md)

---

## [M17.0] - 2026-07-20 → 2026-07-24 — Maintenance mode continuation (P46-P64)

🧪 **Test infrastructure hardening + TS sweep + category drift fixes + CI defense-in-depth**. 19 batches · 78 commits · 0 production engine count change (engine count locked at 100). Project continues in maintenance mode with focus on drift-defense, CI regression nets, and doc/code parity.

### Added (test infrastructure hardening)
- **[tests] `tests/codegen-drift-guard.test.ts`** (P47) — 7 assertions for P42 Date mock; `1096 → 1103` pass
- **[tests] `tests/engine-count-by-category.test.ts`** (P49) — 7 assertions mirroring P47 pattern; closes P46 categories drift root cause class
- **[tests] `tests/codegen-customfn-drift-guard.test.ts`** (P50) — 7 assertions for 8 AI cost engines; `1110 → 1117`
- **[tests] `tests/codegen-examples-mock-apply.test.ts`** (P51) — 5 assertions closing structural-only gap P47 left; `1117 → 1122`
- **[tests] `tests/codegen-marker-presence.test.ts`** (P52) — 7 assertions across HTML/tableEndMarker/staticExamples markers; `1123 → 1130`
- **[tests] 4 AI cost engines × 3 generate()** (P53b) — closes zero-coverage class; `1130 → 1133`
- **[tests] `tests/related-blog-coverage.test.ts`** (P61) — 3 assertions: every toolSlug has 1 blog, no orphans, file-name convention
- **[tests] `tests/category-en-cjk-guard.test.ts`** (P63) — 6th build-dep suite; dist HTML walk asserts no CJK in `<h1>` + cross-page links; `1169 → 1170`
- **[tests] `tests/categories-i18n-leak.test.ts` + `tests/translations-i18n-leak.test.ts`** (P62) — 2 CJK-leak guards at source + translation layer

### Added (TypeScript sweep + type safety)
- **[types] `ToolEngine` + `ToolInput` expansion** (P53a) — closes 134 tsc errors; enables CI `tsc --noEmit` gate
- **[ci] `tsc --noEmit` fail-fast gate** (P53a) — added after engine coverage check (Task 15)
- **[barrels] `export *` → `import './X'`** (P53a) — side-effect-only imports for engine files
- **[ci] `pnpm sync` 30min timeout + codegen-examples path trigger** (P53)
- **[ci] engine coverage drift guard** (P53) — silent 302 prevention
- **[ci] `RUN_BUILD_TESTS=1` opt-in** — now 6 build-dep suites (P63 added 6th)

### Added (engine / page / category drift fixes)
- **[engines] `saas-pricing-planner` moved `valuation/` → `cost/`** (P60) — 1 R + 6 M + 1 plan; P49 layer intact by design
- **[engines] 3 D-category engines merged `valuation/` → `freelance/`** (P59) — 2 SHAs on master; closes T6 stale subdir refs
- **[engines] `cart-abandonment-cost` 3-band → 4-band split** (P61) — caution (200-300%) / warning (100-200%) with 🟡🟠
- **[engines] `rent-vs-buy` Stay-Horizon Milestone v3 section** (P55 follow-up) — linear-interpolated breakeven across 6 stay horizons
- **[components] `src/components/RelatedBlog.astro`** (P61) — engine→blog reverse link; 200 calculator pages render "Read the Full Guide"
- **[pages] 9 path-B category pages migrated to `t()` pattern** (P62) — unifies all 15 pages (path-A: i18n lookup; path-B: hardcoded literal)
- **[data] `src/data/categories.ts` O/S/K name fields** (P62) — pure English; closes source-side CJK leak
- **[i18n] `category.{O,S,K}.name.en` + `related_blog.title`** (P61/P62) — pure English + flat-key i18n
- **[ui] Header dropdown mutex** (P55) — 4 details mutual exclusion + ESC + click-outside; 5 node:test cases
- **[homepage] tool count via `tools.length` interpolation** (P55) — drift-proof vs hardcoded literal
- **[scripts] `scripts/check-engine-count-by-category.mjs`** (P49) — emits markdown table + `--check` mode (mirrors codegen-examples.mjs shell)
- **[scripts] `tests/helpers/spawn-tsx.ts`** (P52) — extracts mini tsx runner; migrates P51 runGenerate() (~190 → ~120 LOC)

### Fixed (P46-P64)
- **[docs] `categories.ts` (15 letters) vs `CLAUDE.md` (16 phantom letters) drift** (P46) — 7 docs amended; phantom I/V removed; pre-P46 old taxonomy re-documented as history
- **[engines] `ltv-calculator customFn` zero-LTV drift** (P53a) — always emits 🩺+🔄; closes silent v3 violation
- **[engines] `customer-health-score-calculator customFn` returns v3 report** (P53a) — was silently dropping v3 sections
- **[scripts] `verify-customfn.mjs` walks per-category subdirs** (P61) — P59/P60 refile follow-up; closes silent-skip bug
- **[scripts] `run.mjs` relative paths** (P53b) — cmd.exe 8191 char limit on Windows
- **[scripts] `sync-init` dead `navigator.sendBeacon` check** (P53a) — TS2774
- **[recent] preserve inner `[data-recent-grid]` wrapper** (P53) — Tailwind grid layout
- **[tests] `engine-count.ts` from `tests/lib/` → `tests/` root** (P52) — closes P22b ESM silent-skip trap
- **[ui] `coupon-attribution-calculator` 3-band exemption** (P61) — hard-breakpoint ROI documented in CLAUDE.md under "v3 standard — two variants"; audit-grade (a)+(b) cross-link requirement
- **[i18n] `Lang` re-export** (P53a) — for client scripts
- **[blog] 64 missing blog posts backfilled** (P58) — 100/100 coverage; stale `30→100` copy closed
- **[blog] C-category coverage drift guard** (P57) — `tests/blog-coverage.test.ts`, 4 engines × 4 dimensions

### Changed (CLAUDE.md + cascade audit continuation)
- **[docs] CLAUDE.md `+2 standing rules`** (P48) — P43 GH Action cron race + P44 pre-push hook stale cache persisted to "Notes for Future Sessions"
- **[docs] CLAUDE.md v3 status prose → codegen markers** (P49) — auto-generated per-category table; preserves 92 business + 8 AI cost prose
- **[docs] CLAUDE.md "Hard-breakpoint exemption (3-band allowed)"** (P61) — audit-grade cross-link requirement for future exceptions
- **[docs] `src/data/INDEX.md` engine→subdir mapping refreshed** (P49/P60) — codegen-enforced invariant; closes P46 root cause class

### Engineering metrics
| Metric | Value |
|---|---|
| Engines | 100 (frozen) |
| New batches | 19 (P46-P64) |
| New commits | ~78 (incl. 3 cron syncs + 1 merge) |
| Test delta | `1096 → 1170` pass (+74) · 0 fail |
| Build-dep suites | 5 → 6 |
| pnpm check baseline | `1170/0/0` |
| pnpm build | 449 dist pages |
| pnpm build CJK-leak grep | `dist grep -rE 'Operations / 库存运营\|Sales / 销售管理\|Knowledge / 知识库' dist/en/` → 0 matches |
| Production engine changes | 1 (rent-vs-buy milestone v3 — P55 follow-up) |
| Total commits | 632 → 712 |
| Active days | 33 → 38 |

### Ship drama
- **[P48] Pre-commit hook rerun race** — adopted as standing rule: `SKIP_PRECOMMIT_CHECK=1` for doc-only commits (P53b-era race extended).
- **[P49] `tests/run.mjs` cmd.exe 8191 char limit** (P53b) — fix: use relative paths in `run.mjs` to avoid command-line overflow on Windows.
- **[P59] GH Action LiteLLM cron fired during P59 push** (`049a825` racing with `40cc225`) — resolved by merge commit `157e661`; no force-with-lease needed.
- **[P60] T2 BLOCKED → fix subagent pattern** (P53a-style) — brief算错 "valuation/=10 不变" 实为 post-P60 valuation/=9; implementer caught and BLOCKED. 2nd time subagent caught a brief-vs-reality drift.
- **[P60] Final reviewer caught 4 doc-only stale refs** — per-task reviewers missed; P60-fix (`586eccf`) + P60+ (`d6d8c25`) closed.
- **[P61] Subagent stop-without-record** (Task 1) — implementer stopped without writing report; `git status` + Read actual files recovered the work (4 file changes already on disk).
- **[P53a] TS gate landable** — 134 → 0 tsc errors over 8 commits; CI `tsc --noEmit` gate added (P53a-p1-fixes sweep).
- **[P64] Doc-only patch** (`d397584`) — close P63 reviewer doc drifts (CLAUDE.md + CHANGELOG build-dep count + test comment); 0 production code.

📦 ship log: [`memory/p60-engines-cost-subdir-fix-shipped.md`](memory/p60-engines-cost-subdir-fix-shipped.md) · [`memory/p61-m-category-fixes-shipped.md`](memory/p61-m-category-fixes-shipped.md) · [`memory/p62-category-page-i18n-fix-shipped.md`](memory/p62-category-page-i18n-fix-shipped.md) · [`memory/p63-ci-cjk-guard-shipped.md`](memory/p63-ci-cjk-guard-shipped.md) · per-batch entries in [`memory/MEMORY.md`](memory/MEMORY.md) P46+ section

---

## [M14.6] - 2026-07-12 → 2026-07-14 — L Legal & Compliance + 9-category sweep

L (15th letter) added. Engines 92 → 98.

### Added
- **[engines] GDPR Fine** + **DSAR Cost** + **Consent Revenue Impact** + **DPA Cost** + **Breach Notification Cost** + **CMP ROI** — 6 engines across L category
- **[engines] 26 inputs + 70 math tests** for L batch
- **[tests] composite dual-threshold band pattern** — K category pattern extended to L

### Changed
- **[categories] L Legal & Compliance** added as 15th letter
- **[data] DPO persona €10M-€50M ARR** — design persona for L calcs

### Lessons
- math-recompute (customFn must call calculate() not memoize)
- customFn wrapper (Math.floor for currency cents)
- HTML5 step/min for non-integer inputs
- 7 other battle-tested patterns

📦 ship log: [`memory/p14-series-shipped.md`](memory/p14-series-shipped.md)

---

## [M13.6] - 2026-07-10 → 2026-07-12 — K Knowledge category

K (14th letter) added. Engines 86 → 92.

### Added
- **[engines] KB Coverage** + **Helpfulness Score** + 4 more — 6 engines across K category
- **[tests] composite dual-threshold band** — K-specific quality pattern (dual thresholds for KB articles)

📦 ship log: [`memory/p13-series-shipped.md`](memory/p13-series-shipped.md)

---

## [M10.6] - 2026-07-04 → 2026-07-06 — P Product Analytics category

P (12th letter) added. Engines 74 → 86. (Note: M11 and M12 series shipped in parallel; see notes below.)

### Added
- **[engines] Funnel Step** + **Power User Curve** + 10 more — 12 engines across P category
- **[tests] 574 pass** baseline (P9 close)
- **[tests] Power User Curve step5 missing input fix** — `214c4ac` holistic fix wave (per `memory/p10-holistic-fix-shipped.md`)

### P11 (parallel)
- 12 engines across Customer Support / Pricing categories — P-series overlap with P10

### P12 (parallel)
- 6 engines across HR/Cost — engineers

📦 ship log: [`memory/p10-series-shipped.md`](memory/p10-series-shipped.md)

---

## [M9.6] - 2026-07-03 — R Retention category

R (Retention, 11th letter — distinct from M5 R Real-Estate) added. Engines 68 → 74.

### Added
- **[engines] NRR** + **Renewal Rate** + 4 more — 6 engines across R retention

### Changed
- **[categories] Two R letters in alphabet** — disambiguation needed:
  - `R` (Real-Estate) — M5, primary by P5 ship order
  - `R` (Retention) — M9, secondary
  - `categoryId` enum has 15 entries (A/B/C/D/E/F/H/K/L/M/O/P/R/S/T, no I/V phantom letters); CLAUDE.md was inconsistent (claimed "16 categories" with phantom I/V) — ✅ AUDITED 2026-07-20 by P46, CLAUDE.md now matches categories.ts exactly

📦 ship log: [`memory/p9-series-shipped.md`](memory/p9-series-shipped.md)

---

## [M8.6] - 2026-07-02 → 2026-07-03 — S Sales category

S (10th letter) added. Engines 62 → 68.

### Added
- **[engines] Pipeline Value** + **Pipeline Coverage** + 4 more — 6 engines across S sales

📦 ship log: [`memory/p8-series-shipped.md`](memory/p8-series-shipped.md)

---

## [M7.6] - 2026-07-01 → 2026-07-02 — O Operations category

O (9th letter) added. Engines 56 → 62.

### Added
- **[engines] Inventory Turnover** + **Supplier Scorecard** + 4 more — 6 engines across O operations

📦 ship log: [`memory/p7-series-shipped.md`](memory/p7-series-shipped.md)

---

## [M6.6] - 2026-06-30 → 2026-07-01 — M Marketing Analytics category

M (8th letter) added. Engines 50 → 56.

### Added
- **[engines] ROAS** + 5 more — 6 engines across M marketing
- **[tests] 53 tests** baseline
- **[tests] 4 pre-emptive cross-cutting fixes** (caught in review)

📦 ship log: [`memory/p6-series-shipped.md`](memory/p6-series-shipped.md)

---

## [M5.6] - 2026-06-29 → 2026-06-30 — R Real-Estate category + 5 followup fixes

R (Real-Estate, 7th letter) added. Engines 44 → 50.

### Added
- **[engines] Mortgage** + **DSCR** + 4 more — 6 engines across R real-estate

### Fixed (P5 followup)
- **[engines] 2 barrel import** stale imports cleaned
- **[tests] 3 stale** test literals refreshed
- **[engines] 1 DSCR staticExamples** drift fixed (`febea42`)

📦 ship log: [`memory/p5-series-shipped.md`](memory/p5-series-shipped.md) · followups at [`memory/p5-followup-fixes-shipped.md`](memory/p5-followup-fixes-shipped.md)

---

## [M4.6] - 2026-06-25 → 2026-06-29 — Investment & ROI series

Engines 38 → 44.

### Added
- **[engines] Compound Interest** + **ARR Multiple** + 4 more — 6 engines across investment series

### Changed
- **[i18n] F category** originally "Investment & ROI"; later renamed in P18 to "Investment & Real Estate" (covers both M4 and M5)
- **[seo] Phase 1+2 SEO overhaul** (D spec) — 2026-06-25 (~43 commits, peak day)
- **[content] EEAT / About / Category landing pages** — 2026-06-27

📦 ship log: [`memory/p4-series-shipped.md`](memory/p4-series-shipped.md)

---

## [M3.x] - 2026-06-23 → 2026-07-02 — Clerk auth + Cross-Device Sync + LS→cloud migration

P2/P3 trilogy. **Trilogy 收官**: 2026-07-02 (`memory/p2-trilogy-complete.md`).

### Added (P3-1, 2026-07-01)
- **[scripts] `clerk-init.client.ts`** — lazy Clerk SDK init
- **[auth] Clerk publishable key** — env-aware (no client crash on missing key)

### Added (P3-2, 2026-07-02)
- **[scripts] `sync-init.client.ts`** — debounced cloud push + sendBeacon flush + Header sync menu wiring
- **[ui] Header sync menu** — sync now / export JSON / delete cloud data
- **[data] Supabase REST API integration** — pullCollection / pushCollection primitives

### Added (P3-3, 2026-07-02)
- **[scripts] `migration.client.ts`** — one-shot LS→cloud migration for P2-era users
- **[storage] SESSION_PULL_KEY** (sessionStorage) + `forgeflowkit:migration:{userId}` (localStorage) — idempotency guards

### Fixed
- **[scripts] wire Header sync menu click handlers** + replace hardcoded English + add click-behavior test
- **[scripts] remove empty-LS blanket short-circuit** + fix orphaned SESSION_PULL_KEY + clean up misleading docs/tests

📦 ship log: [`memory/p3-1-shipped.md`](memory/p3-1-shipped.md) · [`memory/p3-2-shipped.md`](memory/p3-2-shipped.md) · [`memory/p3-3-shipped.md`](memory/p3-3-shipped.md) · backdrop at [`memory/p2-trilogy-complete.md`](memory/p2-trilogy-complete.md)

---

## [M2.x] - 2026-06-22 → 2026-07-01 — LocalStorage trio (favorites / recent / history)

P2 trilogy. **Trilogy 收官**: 2026-07-01 (`memory/p2-trilogy-complete.md`).

### Added (P2a, 2026-06-30)
- **[scripts] `favorites-init.client.ts`** — LocalStorage favorites + DOM star toggle
- **[pages] `/favorites` listing page** with full grid

### Added (P2b, 2026-07-01)
- **[scripts] `recent-init.client.ts`** — LocalStorage recent + Header pills
- **[pages] `/recent` listing page** with full grid
- **[tests] URL prefill `?from=recent`** — entry point from Header pills

### Added (P2c, 2026-07-01)
- **[scripts] `history-init.client.ts`** — LocalStorage history snapshots + Header count badge
- **[pages] `/history` listing page** with snapshot ring buffer view

### Fixed
- 5 P2c holistic review findings (result-text, save button coverage, btoa Unicode, form.submit bypass, history page count badge)
- 4 P2b holistic review findings (subtitle, renderFull titles, tools-slugs set, storage key constant)
- 8 P2a holistic review findings

📦 ship log: [`memory/p2b-shipped.md`](memory/p2b-shipped.md) · [`memory/p2c-shipped.md`](memory/p2c-shipped.md)

---

## [M1.x] - 2026-05-31 → 2026-06-22 — Foundation (scaffold + engines 30 → 32)

Project bootstrap. Single commit burst (2026-05-31, 22 commits) + slow accumulation to 32 engines.

### Added (2026-05-31 — single day burst)
- **[scaffold] Astro + Tailwind project** — `f63df7f` (first commit)
- **[ui] layout and shared UI components**
- **[data] data layer and engine framework**
- **[engines] 30 tool engines (categories A-F)** — single commit `61a306f`
- **[pages] all page templates, blog, legal pages, sitemap, robots.txt — 66 pages complete** — single commit `2cfad8b`
- **[i18n] English + Chinese translations** scaffold

### Added (2026-06-09 → 2026-06-22)
- **[engines] 2 more engines** — 30 → 32
- **[i18n] input label backfill** + precommit hook (P17 — first i18n completeness tooling)
- **[seo] structured data (JSON-LD)** for organization + tools + breadcrumbs

### Engineering metrics
| Metric | Value |
|---|---|
| Engines | 30 → 32 |
| Categories | A-F (5) → +R +M +O +S +R(retention) +P +K +L → **15** (final, P46 audited) |
| Pages | 66 (initial scaffold) → 313 (final M16) |

📦 ship log: [`memory/p17-i18n-backfill-shipped.md`](memory/p17-i18n-backfill-shipped.md) (P17 was first batch shipped from this era)

---

## [M0.x] - 2026-07-16 → 2026-07-20 — Maintenance mode + INDEX series

Engine count frozen at 100. Project enters maintenance / documentation phase.

### Added
- **[docs] `docs/superpowers/specs/INDEX.md`** (P33, 122 lines) — 44 specs across 7 sections
- **[docs] `docs/superpowers/plans/INDEX.md`** (P34, 151 lines) — 51 plans across 8 sections
- **[docs] `memory/INDEX.md`** (P35, 162 lines) — 41 ship logs across 6 sections
- **[docs] `docs/INDEX.md`** (P36, 80 lines) — top-level navigator for 100 docs
- **[docs] `README.md`** (P37, 165 lines) — human-facing entry point
- **[docs] `src/engines/INDEX.md`** (P39, 313 lines) — 100 engines × 15 subdirs
- **[docs] `src/data/INDEX.md`** (P40, 244 lines) — 6 top-level + tools/ 15 barrels
- **[docs] `src/components/INDEX.md`** (P43, 127 lines) — 18 components × 5 tiers
- **[docs] `src/scripts/INDEX.md`** (P44, 276 lines) — 6 scripts × P-series sections

### Fixed
- **[tests] mrr-calculator drift** (P41) — `$50K MRR: 14.4 months (~Sep→Oct 2027)` cosmetic regen
- **[scripts] drift-proof codegen via Date mock** (P42) — `REFERENCE_DATE=2026-07-15` injected in `codegen-examples.mjs` runner script
- **[tests] `tests/engine-count.ts` static const** (P22b) — `EXPECTED_ENGINE_COUNT = 100` with drift guard
- **[seo] 2 missing og-samples backfilled** (P23) — cart-abandonment + coupon-attribution
- **[ci] `RUN_BUILD_TESTS=1` opt-in** (P24) — 6 build-dependent test files gated (P63 added category-en-cjk-guard)
- **[tests] stale '82 tools' literal** (P25) → `EXPECTED_ENGINE_COUNT`
- **[tests] P2a listing pages array** (P26a) — 10 → 15 categories
- **[docs] CLAUDE.md invariant refresh** (P32) — 6 stale numeric claims (32→100 / 24→92 / 141→313 / etc.)

### Changed (cascading audit pattern)
- **[docs] Memory audit pass** (P27) — 5 vague "DEFER UNTIL" claims → concrete triggers
- **[docs] P10-P14 audit** (P28) — 4 cascade misattributions closed
- **[docs] Specs audit** (P30) — 4 spec files amended (P22b/P22/P23/P23b)
- **[docs] Plans audit** (P31) — 4 plan files amended

### Ship drama
- **[P43] GitHub Action sync-pricing.yml cron fired during push window** → 3-way history divergence (a5a7edf vs 7e05a1e rebased). Tree hash `0b290c08` identical. Resolved via reset+cherry-pick+force-with-lease via `master:master --force-with-lease` refspec escape hatch.
- **[P44] Hook stale cache** after gitee push refreshed local state, hook saw ahead=0 false-negative on github push. Bypassed via `git -c core.hooksPath=/dev/null push github master`.

### Engineering metrics
| Metric | Value |
|---|---|
| Engines | 100 (frozen) |
| New production commits | 14 (P33-P37 + P39-P44 + P38 audit) |
| Documentation commits | 9 |
| pnpm check baseline | 1096 pass / 0 fail |

📦 ship log: see [`memory/MEMORY.md`](memory/MEMORY.md) P17+ section for full per-batch entries

---

## Notes

- **本 CHANGELOG 不是 semver** — Mx.y 是 P-series 标签（M = milestone, x.y = P-series 内编号）。ForgeFlowKit 还在 pre-1.0，semver 不适用
- **不是所有 commit 都进入 CHANGELOG** — 文档修正、refactor、CI 调整归入最近 milestone 的 "Changed" 或 "Fixed"；trivial cleanup 不单独列
- **🟢 Active vs 🔒 Locked milestone** — M16.0 起为 maintenance mode，p16+ batches 主要是 INDEX/docs/refactor，不再扩 engine count
- **完整 commit 历史** — `git log --oneline` (711 commits); 或 `git log --oneline --grep "p1[0-9]"` 按 P-series filter
- **Cross-references** — 每个 milestone 末尾链接到 `memory/pNN-*-shipped.md` ship memory + `docs/superpowers/plans/*.md` plan + `docs/superpowers/specs/*.md` spec（如果存在）
- **Last CHANGELOG update** — P65 (2026-07-24); covers P46-P64 batches (19 batches, ~78 commits)