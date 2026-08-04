# H1 + metaTitle Keyword Refresh — 65 B+C Class Rewrite

> **For agentic workers:** Strategy spec. The full 65-title matrix and exact new strings are produced during implementation per the templates + hard constraints in §6–§7; this file is the contract that gates every title change. After this spec is approved, the next step is `superpowers:writing-plans` to convert this contract into a task-by-task execution plan.

---

## 1. Goal

Bring all 65 B/C class tool pages into the same query-rich, fresh-signal shape that 35 already-strong pages already have. Outcome target: improve GSC average ranking from current **30–90 (90-day)** toward **20–30** within 14 days post-deploy, by writing `<h1>` and metaTitle that match the *head term* plus *intent modifier* plus *(2026)* that real search queries combine.

Single deliverable: **65 line edits in exactly one file**. No new files, no new tests, no schema changes, no engine code changes.

---

## 2. Background — Why this exists (from Phase 0 GSC audit)

GSC data (2026-08-04 export, last 90 days):

| Metric | Value |
|---|---|
| Total clicks (90 days, all pages) | 5 |
| Total impressions (90 days) | ≈ 600–700 |
| Pages with ≥ 1 click | 4 / 200 (1 tool page only — `zh/solopreneur-ai-api-cost-comparison`) |
| Pages with healthy CTR (≥ 16%) | 3 / 200 (top performers — `pos < 15`) |
| Average position (weighted) | ≈ 50 |
| Rich snippets (sheet 6) | 0 |

Diagnosis: **High ranking depth, not low CTR**. When pages do reach the first page (pos < 15), CTR is healthy (16–50 %). The bottleneck is Google not pushing 95 % of our 200 pages above the fold.

Root cause hypothesis: of 100 tool titles, **65 are "X Calculator" generic names** with no long-tail intent modifier (Free / Online / By Cohort / 2026 / With CI / etc.). Google treats these as undifferentiated candidates and ranks them at depth 30+. The 35 "already-strong" titles (e.g. `Hourly vs Fixed Rate Calculator`, `Cart Abandonment Cost Calculator`, `DSCR Calculator (Debt Service Coverage Ratio)`) have the query modifier Google is looking for.

Spec fix: rewrite all 65 weak titles to follow the same shape.

---

## 3. Architecture (1-line summary)

**Data layer change only.** `src/i18n/translations.ts` carries `{ en, zh }` strings per `tools.{slug}.title`. The rendering layer (`src/pages/[lang]/[slug].astro:50, 490`) already wires `toolTitle = t(`tools.${slug}.title`, lang)` into both the `<h1>` and `metaTitle`. **No template change required** — improving the data improves both at once.

---

## 4. File modifications (1 file, 65 lines)

| File | Change |
|---|---|
| `src/i18n/translations.ts` | Edit **65** lines of the form `'tools.{slug}.title': { en: 'OLD', zh: '旧' }` → update both `en` and `zh` to the new strings. |

That's it. **No other files touched.** Specifically:

- ❌ No change to `src/engines/**`
- ❌ No change to `src/pages/[lang]/[slug].astro`
- ❌ No change to `src/components/**`
- ❌ No change to `src/data/tools/**`
- ❌ No change to `src/content/tools/**` (P140b prose — out of scope)
- ❌ No new tests, no schema files, no codegen script in `src/` (the temporary codegen helper lives in `/tmp/`, never committed)

---

## 5. Out of scope (explicitly deferred)

| Item | Defer to | Why |
|---|---|---|
| 35 "already-strong" titles — adding `(2026)` + a free modifier for consistency | **P140d-T1** (if user approves coalescing) or **P140d-T2** (separate PR) | Out of C1 scope; user decision required |
| Modifying prose (`src/content/tools/**/*.md`) | P140b already shipped | Prose guards (P140a/b) can't be regressed by title-only changes |
| Modifying any engine code | n/a | Out of band |
| New calculators | maintenance-mode lock (P16) | 100/100 enforced |
| Blog post `datePublished` audit (currently synthetic) | **P140d-T3** | Different problem class |
| Backlink acquisition | **P140e** | Off-platform |

---

## 6. Hard constraints — every new title MUST pass all 6

These rules are binding. Any title produced during implementation that violates a rule is a bug; rollback + rewrite.

### 6.1 Length budget

| Locale | max chars (title alone) | max chars (title + ` — ForgeFlowKit`) |
|---|---|---|
| en | 80 | 95 |
| zh | 35 | 50 |

Reason: `metaTitle` ends up in `<title>` tag and Google SERP. Truncation at ~60 chars desktop and ~50 chars mobile. We allow a 35-char headroom for the ` — ForgeFlowKit` suffix while staying ≤ 95 total (Google cuts at 60 visible chars, so full title matters less than first 60).

### 6.2 Year freshness

Every title MUST contain `2026` once, placed at the end before the closing parenthesis or as a year tag at the end. Year is a freshness signal; uniformity across 65 pages avoids cross-page inconsistency.

### 6.3 Head-term preservation

Every title MUST contain the original head term (`csat` / `roas` / `mrr` / `cac` / `ltv` / etc.). Renaming e.g. `csat-calculator` → `c-sat` would lose the search-intent match and *reduce* ranking.

### 6.4 ≥ 1 intent modifier

Every title MUST include at least one of:
- `Free` / `Online` / `Instant`
- `By <unit>` (e.g. `By Channel`, `By Cohort`, `By Tier`)
- `+ <formula output>` (e.g. `+ Sample Size`, `+ Runway`, `+ Breakeven`)
- `<year-tag>`

### 6.5 zh MUST NOT be a literal translation of en

Chinese SERP uses different intent signals. Common zh template:
```
<概念中文名>计算器 — <修饰> + <修饰>（2026）
```
where 修饰 ∈ {免费, 在线, 按月, 按渠道, 含样本量, 实时, ...}.

Examples of good zh shapes:
- `MRR 计算器 — 免费在线追踪新增/流失/扩展 MRR（2026）`  ✅
- `CSAT 计算器 — 含样本量 + 置信区间（2026）`  ✅
- `MRR计算器 免费版`  ❌ too short, no intent modifier, no year

### 6.6 Concept core word order preserved

For en titles, the canonical head term appears first: `<Concept> Calculator — <modifiers>`. Never bury the head term in the middle of modifiers.

---

## 7. Title templates (5 patterns; one is picked per slug type)

The 65 weak titles fall into these 5 categories. Each category has a template + 3 worked examples (audit output above; rest generated during implementation):

### 7.1 Pattern P1 — SaaS core metrics (28 slugs)
`[Metric] Calculator — [Free/Online] [Modifier Phrase 1] + [Modifier Phrase 2] (2026)`

Worked:
- `MRR Calculator — Free SaaS Tracker (New / Churn / Expansion) (2026)`
- `CAC Calculator — Free Blended + Paid CAC + Payback (2026)`
- `Burn Rate Calculator — Free Monthly Cash + Runway + Breakeven (2026)`

Risk: metaTitle `MRR Calculator — Free SaaS Tracker (New / Churn / Expansion) (2026) — ForgeFlowKit` ≈ 95 chars (within budget).

### 7.2 Pattern P2 — Unit-economics + ratio (12 slugs)
`[Concept] Calculator — [Sub-domain] [Formula]: [Output 1] + [Output 2] (2026)`

Worked:
- `Unit Economics Calculator — SaaS LTV/CAC + Payback Months (2026)`
- `SaaS Valuation Calculator — MRR Multiple + ARR Multiple (2026)`
- `Break-Even Calculator — Costs + Revenue + Time to Breakeven (2026)`

### 7.3 Pattern P3 — Marketing analytics (8 slugs)
`[Metric] Calculator — [Channel/Stage] [Output] + [Output] (2026)`

Worked:
- `ROAS Calculator — Ad Spend ROI by Channel (2026)`
- `Cohort Retention Calculator — User Retention + Revenue by Cohort (2026)`
- `Email Campaign ROI Calculator — Revenue per Send + List Growth (2026)`

### 7.4 Pattern P4 — Operations / inventory + finance (10 slugs)
`[Concept] Calculator — [Unit/Formula] [Output 1] + [Output 2] (2026)`

Worked:
- `Inventory Turnover Calculator — Annual Turns + Days Inventory (2026)`
- `Reorder Point Calculator — Lead Time + Safety Stock (2026)`
- `Fulfillment Cost Calculator — Per Order + Per Unit (2026)`

### 7.5 Pattern P5 — Compliance / niche (7 slugs)
`[Concept] Calculator — [Standard/Regulation] [Risk/Output 1] + [Output 2] (2026)`

Worked:
- `DSAR Cost Calculator — Hourly + Per-Request GDPR Processing (2026)`
- `GDPR Fine Risk Calculator — Revenue-Tier Penalty + Compliance Cost (2026)`
- `Cookie Consent Revenue Impact Calculator — Opt-In vs Opt-Out (2026)`

Total: 28 + 12 + 8 + 10 + 7 = 65 slugs covered. Mapping from each `solopreneur-{slug}` to its `P{1..5}` pattern is generated during implementation by subagent (see §8).

---

## 8. Implementation flow (codegen + subagent + review)

This is the **process** for how a subagent converts this spec into the 65 line edits. It mirrors the P140b pattern: AI-draft → guard-validated → human-spot-checked.

### 8.1 Subagent brief (representative)

Subagent receives:
1. The 65-slug list (filtered by `title` lines that are B/C class).
2. The 5 patterns (§7) and 6 hard constraints (§6).
3. The current `en` and `zh` values from `translations.ts`.
4. Target: produce a TSV `slug<TAB>old_en<TAB>new_en<TAB>old_zh<TAB>new_zh<TAB>pattern_used<TAB>reason`.

Subagent returns a draft TSV. Implementer reviews, then bulk-applies via `Edit` or `sed`.

### 8.2 Apply step (mechanical)

For each TSV row: one `Edit` call replacing the `tools.{slug}.title` line. Order: ascending slug lexicographic. After each Edit, no separate verification — guard run after all 65 applied.

### 8.3 Guard suite (run once after all 65 edits)

```bash
pnpm exec tsc --noEmit             # 0 errors
pnpm test:unit                     # ~1172 tests, source-only suites
RUN_BUILD_TESTS=1 pnpm test:build # 51 build-dep suites
pnpm build                         # static gen, dist HTML lengths checked
```

Acceptance: all four pass with 0 errors. P140a/b guards (`content-prose-shape-guard`, `seo-*-guard`, `js-bundle-size-guard`, etc.) are NOT modified — running them with the old thresholds catches any unintended regression (e.g. 200 KB page-size-guard if title inflation tips a page over).

### 8.4 Self-imposed title-shape lint (run before `pnpm check`)

A tiny Node one-liner that scans `src/i18n/translations.ts` and emits a report:
- For each `tools.{slug}.title` (en + zh):
  - assert chars ≤ budget
  - assert contains year
  - assert contains head term
  - assert contains ≥ 1 modifier keyword (Free / Online / By / + / +free)
  - zh titles additionally assert ≥ 1 CJK char in zh value

Failure on any 65 lines → block ship until manually fixed.

### 8.5 Commit boundary

**Single commit, single message:**

```
feat(seo): refresh 65 B/C-class tool <h1> + metaTitle — add 2026 year + query intent modifier
```

Body lists the 65 slugs in a 5-group table (one per pattern). This anchors P-series index for future P140d work.

---

## 9. Acceptance criteria (gate for ship)

All must hold before pushing:

1. **65 / 65 lines rewritten** in `src/i18n/translations.ts` for the B/C slugs in the audit list.
2. **0 lines of `src/engines/**`, `src/pages/**`, `src/components/**`, `src/data/tools/**`, `src/content/tools/**`, or any test file** are modified. Verify via:
   ```bash
   git diff --stat HEAD~1 -- src/engines src/pages src/components src/data src/content tests
   ```
   Expected output: empty.
3. **`pnpm check` returns 0 errors.** (Pre-commit hook enforces; see CLAUDE.md.)
4. **`pnpm build` succeeds + `dist/` regenerates** with all 200 pages. Verify via:
   ```bash
   ls dist/en/ | wc -l   # expect ≥ 100
   ls dist/zh/ | wc -l   # expect ≥ 100
   ```
5. **Title-shape lint (§8.4) passes** for every changed line.
6. **Manual spot-check** (after apply, before commit): read 5 random new titles + their rendered `<h1>` in `dist/en/solopreneur-{slug}/index.html`. Should read naturally (not keyword-stuffed).
7. **zh gold check**: 5 random new zh titles + `dist/zh/.../{slug}/index.html` `<h1>`. Should read fluently Chinese (not machine-translated English).

---

## 10. Rollback

Single commit = single revert.

```bash
git revert HEAD --no-edit   # one-shot, no conflict
pnpm check                  # verify no leftover errors
pnpm build                  # verify dist still 200 pages
```

If `git revert` is too coarse (e.g. discovered regression post-ship), cherry-pick out individual lines via:

```bash
# Edit 1 specific line back to old value
git checkout HEAD~1 -- src/i18n/translations.ts
# then re-apply all OTHER 64 lines via re-run of the §8 subagent flow
```

---

## 11. Test strategy

### What we keep

- `tests/seo-meta-guard.test.ts` (page-size-guard) — runs against new `dist/`. Threshold (200 KB) is 50–72 % headroom; title rewrites add ≤ 5 KB total → no risk.
- `tests/json-ld-field-guard.test.ts` — title strings don't appear in JSON-LD, no risk.
- `tests/content-prose-shape-guard.test.ts` (P140a/b) — prose content unchanged, no risk.
- All other 50 build-dep guards — unchanged data layer.

### What we do NOT add

- No new tests in this spec. Adding tests for "title contains 2026" or "title contains head term" would couple the test to spec text, which is wrong — that's a build-time script (§8.4), not a runtime test.

### Why

> "A test double must never be more permissive than the runtime it stands in for." (CLAUDE.md §Notes). A guard that checks title text would only catch what we explicitly write, while missing whatever future PR writes. The title-shape lint (§8.4) is the right tool — runs every ship, doesn't ship with the codebase.

---

## 12. Open questions

1. **Should we coalesce the 35 A-class titles with `(2026)` + a modifier into the same PR?**
   - Cost: 30 extra line edits, ~10 minutes more work.
   - Benefit: full-site fresh-signal uniformity (no half-with-year / half-without mix).
   - Trade-off: breaks "65 changes" outline (becomes 100); changes pages that already have decent headers.
   - Spec default: **defer to P140d-T1** unless user pulls the trigger now.
2. **Should the test guard be added or stay script-only?**
   - Default: script-only (see §11).
   - If user wants CI guard, move §8.4 to `tests/title-shape-guard.test.ts`. Cost: 1 new suite to maintain.
3. **What about the blog `[slug].astro:33` title format `"best-{slug} — ForgeFlowKit Blog"`?**
   - Same `data:blog-posts.ts` is out of this spec. Same root cause.
   - Default: defer to P140d-T3. (Different file, different risk.)

---

## 13. Reference

- Audit output: see Phase 0 GSC export `C:\Users\元始天尊\Downloads\forgeflowkit.com-Performance-on-Search-2026-08-04.xlsx` — 90 days, 5 total clicks, 4 pages with any click, top pages: `en/` (pos 30), `zh/solopreneur-ai-api-cost-comparison/` (pos 11, CTR 33 %), `en/blog/best-solopreneur-resolution-time-calculator/` (pos 13, CTR 17 %).
- Audit summary table in conversation (2026-08-04).
- P140b ship sequence: same AI-draft → guard → human-spot-check pattern, validated at scale (200 markdown files).

---

## 14. Ship promise

When this spec is approved:
1. The next skill invoked is `superpowers:writing-plans` (per brainstorming terminal state).
2. The resulting plan produces 1 commit, 65 line edits, 4-step guard run, ~30-60 minute wall-clock for the whole batch.
3. Holistically there's nothing else to ship — single concern, single file, single commit.
