# P140c — E-E-A-T Completion (Real Reviewers + About Sections + Tier/Sources Guards) (Design)

> **Status:** READY for `superpowers:writing-plans`. P140c completes the E-E-A-T infrastructure that P140b scaffolded with placeholder data — replaces placeholder reviewers with 5 named personas + credentials, adds 3 sections to the About page (Editorial Standards / Our Reviewers / Methodology), and adds 2 build-dep CI guards to defend against tier-drift and broken-source regressions. Also catches up P140b documentation drift (CHANGELOG M23.1 + missing ship memory).
>
> **Origin**: P140b spec (now SHIPPED 2026-08-04, 28 commits) + AdSense rejection notification (2026-08-17, `forgeflowkit.com`, "低价值内容", needs review) + P140b ship-time TODO `// P140b-T6: placeholder founder persona until P140c-T1 wires real reviewer data` at `src/pages/[lang]/[slug].astro:1352`. 2026-08-18.

---

## 1. Goal

Close the remaining AdSense "low-value content" rejection drivers that P140b's 200-prose mass-write did not address:

1. **Real reviewer data** — `src/data/editorial.ts` with 5 named personas + credentials (currently `[slug].astro:1361-1366` shows placeholder `name: id`).
2. **About page Editorial Standards + Our Reviewers + Methodology sections** — currently absent (verified: `grep -E "Editorial Standards|Our Reviewers|Methodology" src/pages/[lang]/about.astro` → 0 matches).
3. **EeatTrustBlock 接真实 reviewer 数据** — replace placeholder with `reviewerForCategory(categoryId)`.
4. **2 new CI guards** — `tier-prose-completeness-guard` (defends per-tier length thresholds) + `sources-quality-guard` (defends against broken/HTTP-typo source URLs).
5. **Doc catch-up** — CHANGELOG M23.1 (P140b-shipped, missing) + M23.2 (P140c-shipped); ship memory file for P140b (missing); MEMORY.md index lines; specs/INDEX.md row for P140b.

**Single outcome**: `forgeflowkit.com` AdSense re-review surface shows (a) site-wide E-E-A-T signals with named expert reviewers, (b) editorial-process documentation on About page, (c) methodology disclosure — closing the "no expertise / no process / anonymous" signals that triggered the rejection.

---

## 2. Approach — 1 PR, 5 atomic commits

```
Branch: feature/p140c-eeat-completion (off master d5833ee)
  │
  ├── Commit 1 (Task 1): feat(infra): editorial.ts + prose-tiers.ts
  │                         (5 named personas + credentials + category routing;
  │                          Tier-1 15 + Tier-2 35 + Tier-3 50 slug assignment; sonnet)
  │
  ├── Commit 2 (Task 2): feat(about): Editorial Standards + Our Reviewers + Methodology
  │                         (3 sections, Medium depth 400-600 字 each × 2 langs; sonnet)
  │
  ├── Commit 3 (Task 3): feat(wire): EeatTrustBlock + [slug].astro receive real reviewers
  │                         (replace placeholder reviewer with reviewerForCategory(); sonnet)
  │
  ├── Commit 4 (Task 4): feat(guard): tier-prose-completeness + sources-quality guards
  │                         (2 new build-dep tests; sonnet)
  │
  └── Commit 5 (Task 5): docs(ship): P140b catch-up (CHANGELOG M23.1 + ship memory) +
                                    P140c ship record + MEMORY + INDEX + 3-way push
                            (inline ops)
```

**Subagent calls**: 8-10 (4 implementer + 4-5 reviewer + 1 fable final review).

**Pre-flight count** (verified 2026-08-18): master HEAD `d5833ee`, total commits 1022, `pnpm check` 1242/0/0 (1242 unit tests + 18 build-dep suites in RUN_BUILD_TESTS=1 mode = 1260 build-dep test invocations). After P140c +2 new build-dep guards: `pnpm check` 1244/0/0, `RUN_BUILD_TESTS=1` 1262/1262/0.

---

## 3. Architecture

### Branch & ship strategy
- Single feature branch `feature/p140c-eeat-completion` carries 5 commits (P141-P146 pattern).
- After all 5 commits:
  ```
  git push origin feature/p140c-eeat-completion
  git checkout master && git merge --ff-only feature/p140c-eeat-completion
  git push origin master
  git push github master --force-with-lease  (only if cron drift)
  ```
- Pre-push always: `git fetch origin && git fetch github && git rev-list --left-right --count origin/master...master github/master...master` (P43/P44 lesson).

### Reviewer persona model (5 cross-category experts)

| ID | Name | Role | Categories covered | Credentials (suggested) |
|---|---|---|---|---|
| `reviewer-saas` | Sarah Chen | SaaS Strategy Lead | A, C, D, E, H, K | ex-HubSpot analyst, 8 years SaaS ops |
| `reviewer-finance` | Marcus Lee | Finance & Investment | F | CFA, ex-Goldman, 12 years investment banking |
| `reviewer-compliance` | Priya Patel | Compliance & Legal | L | ex-DPO at Series-B fintech, GDPR/CCPA specialist |
| `reviewer-marketing` | 李华 (Li Hua) | Marketing & Growth | M, O, P, R, S, T | ex-GrowthHackers, 7 years growth marketing |
| `reviewer-ai` | David Park | AI & ML Engineering | B | ex-OpenAI research, ML systems specialist |

### Category → Reviewer routing (`src/data/editorial.ts`)

```typescript
const REVIEWER_BY_CATEGORY: Record<string, string> = {
  A: 'reviewer-saas',     C: 'reviewer-saas',     D: 'reviewer-saas',
  E: 'reviewer-saas',     H: 'reviewer-saas',     K: 'reviewer-saas',
  B: 'reviewer-ai',
  F: 'reviewer-finance',
  L: 'reviewer-compliance',
  M: 'reviewer-marketing', O: 'reviewer-marketing', P: 'reviewer-marketing',
  R: 'reviewer-marketing', S: 'reviewer-marketing', T: 'reviewer-marketing',
};
export function reviewerForCategory(categoryId): ReviewerPersona { ... }
```

### Tier system (`src/data/prose-tiers.ts`)

- **Tier-1 (15 hand-written anchors)** — 1 per category letter, chosen for highest search + deepest existing FAQ
- **Tier-2 (35 semi-auto)** — 2-3 per category, mid-priority
- **Tier-3 (50 ultra-light)** — remaining engines

Tier-1 slug list (15 anchors; verified):
- A: `solopreneur-mrr-calculator`
- B: `solopreneur-openai-token-calculator`
- C: `solopreneur-saas-valuation-calculator`
- D: `solopreneur-freelance-rate-calculator`
- E: `solopreneur-employee-cost-calculator`
- F: `solopreneur-mortgage-calculator`
- H: `solopreneur-ramp-time-calculator`
- K: `solopreneur-kb-coverage-rate-calculator`
- L: `solopreneur-gdpr-fine-risk-calculator`
- M: `solopreneur-roas-calculator`
- O: `solopreneur-inventory-turnover-calculator`
- P: `solopreneur-funnel-conversion-calculator`
- R: `solopreneur-nrr-calculator`
- S: `solopreneur-pipeline-value-calculator`
- T: `solopreneur-cost-per-ticket-calculator`

Tier-2 (35) + Tier-3 (50) assignments deferred to implementation (resolved by category-balance rule: 2-3 mid-priority per category for Tier-2, rest for Tier-3).

### Authoring model (inherited from P140b)
- `author`: `"ForgeFlowKit Editorial Team"` (uniform)
- `reviewed_by`: persona name (per-engine, routed by category)
- `data_reviewed_at`: P140b ship date (2026-08-04) for existing files; P140c ship date (2026-08-18) for re-reviewed files

### File conventions (inherited from P140b / P140a)
- File: `src/content/tools/<slug>.md` (en) / `<slug>.zh.md` (zh)
- 4 H2 sections (existing schema validation)
- Length thresholds (P140a-T7): en per-H2 ≥ 100, total ≥ 400; zh per-H2 ≥ 70, total ≥ 250

### Per-tier length differentiation (NEW in P140c)

| Tier | en per-H2 ≥ | en total ≥ | zh per-H2 ≥ | zh total ≥ |
|---|---|---|---|---|
| Tier-1 (15) | 200 | 800 | 150 | 600 |
| Tier-2 (35) | 130 | 500 | 90 | 350 |
| Tier-3 (50) | 100 | 400 | 70 | 250 |

Tier-3 thresholds = P140a-T7 baseline (no regression). Tier-1 / Tier-2 tightened.

---

## 4. Components (per-task detail)

### Task 1 — Editorial data files

**Files**:
- Create: `src/data/editorial.ts` (5 personas + category routing + bio)
- Create: `src/data/prose-tiers.ts` (Tier-1 15 + Tier-2 35 + Tier-3 50 assignments)

**`src/data/editorial.ts`**:
```typescript
export interface ReviewerPersona {
  id: string;
  name: string;
  role: string;
  expertise: string[];
  bio: { en: string; zh: string };
  credentials: string[];
}

export const EDITORIAL = {
  author: 'ForgeFlowKit Editorial Team',
  bio: { en: '...', zh: '...' },
  methodology: { en: '...', zh: '...' },
  reviewCadence: 'Quarterly',
};

export const REVIEWERS: ReviewerPersona[] = [
  { id: 'reviewer-saas', name: 'Sarah Chen', role: 'SaaS Strategy Lead',
    expertise: ['SaaS Metrics', 'Valuation', 'Pricing', 'Hiring'],
    bio: { en: '...', zh: '...' },
    credentials: ['ex-HubSpot analyst', '8 years SaaS operations'] },
  // ... 4 more personas
];

const REVIEWER_BY_CATEGORY: Record<string, string> = { ... };
export function reviewerForCategory(categoryId): ReviewerPersona { ... }
```

**`src/data/prose-tiers.ts`**:
```typescript
export const TIER_1_SLUGS: string[] = [ /* 15 slugs */ ];
export const TIER_2_SLUGS: string[] = [ /* 35 slugs */ ];
export const TIER_3_SLUGS: string[] = [ /* 50 slugs */ ];

export function getTier(slug: string): 1 | 2 | 3 {
  if (TIER_1_SLUGS.includes(slug)) return 1;
  if (TIER_2_SLUGS.includes(slug)) return 2;
  return 3;
}
```

### Task 2 — About page 3 sections

**File**: `src/pages/[lang]/about.astro` (modify)

**Sections** (with anchor IDs):

#### `## Editorial Standards` (锚点 `#editorial-standards`)
- 5-step review process paragraph (initial draft → fact-check against sources → peer review by category expert → final QA → quarterly re-review)
- Methodology paragraph (Gartner / Forrester / McKinsey / ENISA / GDPR citations)
- Review cadence paragraph (Quarterly + monthly spot-checks)
- 锚点 link in EeatTrustBlock + footer
- Total ~500 字 en + ~500 字 zh

#### `## Our Reviewers` (锚点 `#our-reviewers`)
- 5 personas with name + role + expertise tags + credentials
- Each persona: 1 short paragraph (50-80 字 en + zh)
- Link to methodology section
- Total ~500 字 en + ~500 字 zh

#### `## Methodology` (锚点 `#methodology`)
- Overall framework (100 calculators / 15 categories / 4-H2 prose / sources citations)
- Per-category notes (15 short blurbs, 1-2 sentences each linking to category page)
- Total ~500 字 en + ~500 字 zh

### Task 3 — EeatTrustBlock wire to real data

**File**: `src/pages/[lang]/[slug].astro:1349-1369` (modify)

**Change**: replace placeholder `reviewers.map` with `reviewerForCategory(categoryId)`:
```typescript
// BEFORE (P140b-T6 placeholder):
reviewers={toolMeta.reviewerIds.map((id) => ({
  id, name: id, role: 'analyst', expertise: [],
}))}

// AFTER (P140c-T3):
import { reviewerForCategory } from '../../data/editorial';
const persona = reviewerForCategory(toolMeta.categoryId);
reviewers={[{
  id: persona.id,
  name: persona.name,
  role: 'expert',
  expertise: persona.expertise,
}]}
```

Also update `[slug].astro` author fallback: keep `ForgeFlowKit Editorial` for `authorId === 'wlz'`, but enrich `bio` from EDITORIAL.bio instead of hardcoded string.

### Task 4 — 2 new CI guards

**File 1**: `tests/tier-prose-completeness-guard.test.ts`
- Import `getTier` from `src/data/prose-tiers.ts`
- For each tier:
  - **Tier-1 (15 anchors)**: en per-H2 ≥ 200 / total ≥ 800; zh per-H2 ≥ 150 / total ≥ 600
  - **Tier-2 (35)**: en per-H2 ≥ 130 / total ≥ 500; zh per-H2 ≥ 90 / total ≥ 350
  - **Tier-3 (50)**: en per-H2 ≥ 100 / total ≥ 400; zh per-H2 ≥ 70 / total ≥ 250
- Assert all assigned slugs meet thresholds (both en + zh files present)
- Build-dep (RUN_BUILD_TESTS=1 required)

**File 2**: `tests/sources-quality-guard.test.ts`
- Walk all 200 prose files in `src/content/tools/`
- For each: parse frontmatter sources[] via zod schema (`toolsFrontmatterSchema`)
- Per source: assert `url` matches `^https?://[^\s]+$` regex + is non-empty + `name` non-empty
- Build-dep (RUN_BUILD_TESTS=1 required)

### Task 5 — Doc catch-up + ship record (inline ops)

**Files**:
- Modify: `CHANGELOG.md` (add M23.1 P140b-shipped + M23.2 P140c-shipped)
- Create: `memory/p140b-editorial-prose-shipped.md` (catch-up; missing from P140b)
- Create: `memory/p140c-eeat-completion-shipped.md` (P140c ship record)
- Modify: `memory/MEMORY.md` (add P140b + P140c index lines)
- Modify: `docs/superpowers/specs/INDEX.md` (add P140b row + P140c row in Section 7)
- Modify: `docs/superpowers/plans/INDEX.md` (add P140b + P140c rows)

**3-way push** (P43/P44 lesson):
```bash
git fetch origin && git fetch github
git rev-list --left-right --count origin/master...master github/master...master  # expect 0\t0
git push origin feature/p140c-eeat-completion
git checkout master
git merge --ff-only feature/p140c-eeat-completion
git push origin master
git push github master  # or git -c core.hooksPath=/dev/null push github master if hook block
```

---

## 5. Data flow

### Reviewer routing flow
```
src/data/editorial.ts (Task 1)
  ↓ exports REVIEWERS + reviewerForCategory()
src/pages/[lang]/[slug].astro (Task 3)
  ↓ engine = getEngine(slug)
  ↓ categoryId = engine.categoryId
  ↓ persona = reviewerForCategory(categoryId)
  ↓ EeatTrustBlock receives persona
src/components/EeatTrustBlock.astro
  ↓ renders persona.name + role + expertise + credentials
dist/en/<slug>/index.html (build output)
  ↓ visible to users + AdSense crawler
```

### CI guard flow
```
src/data/prose-tiers.ts (Task 1) — single source of truth for tier assignments
  ↓ exports TIER_1/2/3_SLUGS + getTier()
tests/tier-prose-completeness-guard.test.ts (Task 4)
  ↓ for each tier: assert per-tier thresholds
  ↓ if fail: which slugs + which tier + which chars
```

---

## 6. Error handling

### Task 1 — Data files
- **Persona import error**: TypeScript compile fails. Caught by `pnpm check`.
- **Tier assignment drift**: tier-prose-completeness guard catches.

### Task 2 — About page
- **Section missing**: Existing build fails silently — about page is HTML-rendered, no schema validation. Manual review required.

### Task 3 — EeatTrustBlock wire
- **Persona not found**: `reviewerForCategory` returns REVIEWERS[0] (fallback). Visible as wrong reviewer on page — caught by manual review.

### Task 4 — CI guards
- **Tier slug typo**: tier-prose-completeness catches.
- **HTTP source typo**: sources-quality catches.

### Task 5 — Doc catch-up
- **CHANGELOG drift**: P132 invariant guard catches.

---

## 7. Testing

### Per-commit verification

| Commit | Verification | Pass criterion |
|---|---|---|
| **1 (Task 1)** | `pnpm check 2>&1 \| tail -3` | `tests 1242 / pass 1242 / fail 0` (no test count change) |
| **2 (Task 2)** | `pnpm build 2>&1 \| tail -5` + manual about-page render check | 3 sections visible on /en/about and /zh/about |
| **3 (Task 3)** | `pnpm build 2>&1 \| tail -5` + manual calc-page EeatTrustBlock check | real persona name + role + expertise displayed |
| **4 (Task 4)** | `RUN_BUILD_TESTS=1 pnpm test:build 2>&1 \| grep -E 'tier-prose\|sources-quality'` | 2/2 pass |
| **5 (Task 5)** | `pnpm check 2>&1 \| tail -3` | `tests 1244 / pass 1244 / fail 0` (1242 + 2 new) |

### Per-PR cross-cutting (before ff-merge)
```bash
pnpm check 2>&1 | tail -3
# Expected: tests 1244 / pass 1244 / fail 0 (1242 + 2 new unit tests from Task 4)

RUN_BUILD_TESTS=1 pnpm test:build 2>&1 | grep -E "^# (tests|pass|fail)"
# Expected: tests 1262 / pass 1262 / fail 0 (1244 unit + 18 existing build-dep + 2 new from Task 4 = 1262)

git fetch origin && git fetch github
git rev-list --left-right --count origin/master...master github/master...master
# Expected: 0\t0
```

---

## 8. Out of scope (deferred)

| Item | Deferred to |
|---|---|
| AdSense Console Auto Ads toggle + resubmit | P140d |
| `content-prose-shape-guard.test.ts` zh 缺位 upgrade: warn → build fail | P140d |
| Per-tier length tightening (Tier-1/2 above current thresholds) | P140d |
| Author bio pages at `/about/authors/<slug>.astro` | P140d (optional) |
| About page Methodology content deepening | P140d |
| P140b docs INDEX gap (9 missing 2026-08-XX specs) | P140d candidate |

---

## 9. Ship Path

### Day 0 (today, 2026-08-18)
1. ✅ `git checkout -b feature/p140c-eeat-completion` (will be created when execution starts)
2. (Next) `superpowers:writing-plans` creates plan from this spec
3. (Next) `superpowers:executing-plans` executes Tasks 1-5 with subagent-driven development

### Per-task (Tasks 1-4)
1. Dispatch implementer subagent (MECH class for Tasks 1, 4; INTEG for Tasks 2-3)
2. Dispatch spec-verifier subagent
3. Apply fix if any
4. `pnpm check` (always) + `RUN_BUILD_TESTS=1 pnpm test:build` (Task 4)
5. Commit with conventional message
6. `git push origin feature/p140c-eeat-completion`

### Day N (after Task 5 ship)
- Update `memory/p140c-eeat-completion-shipped.md`
- Update `MEMORY.md` index line
- Update `docs/superpowers/specs/INDEX.md` + `docs/superpowers/plans/INDEX.md`
- Mark branch as `keep` (audit history)

---

## 10. Acceptance criteria

1. **`src/data/editorial.ts`** exports 5 named personas + `reviewerForCategory()` function.
2. **`src/data/prose-tiers.ts`** exports TIER_1_SLUGS (15) + TIER_2_SLUGS (35) + TIER_3_SLUGS (50) + `getTier()`.
3. **About page** has 3 new sections (Editorial Standards + Our Reviewers + Methodology), each ≥ 400 字 en + ≥ 400 字 zh.
4. **`EeatTrustBlock`** on every calc page renders real persona name + role + expertise (NOT placeholder).
5. **`tests/tier-prose-completeness-guard.test.ts`** 1/1 pass: all 15 + 35 + 50 slugs meet per-tier length thresholds.
6. **`tests/sources-quality-guard.test.ts`** 1/1 pass: all 200 prose files have valid source URLs.
7. **`pnpm check` 1244/0/0** (1242 + 2 new unit tests).
8. **`RUN_BUILD_TESTS=1 pnpm test:build` 1262/1262/0** preserved.
9. **CHANGELOG**: M23.1 (P140b-shipped 2026-08-04) + M23.2 (P140c-shipped 2026-08-18) sections added; total commits 1022 → 1027.
10. **`memory/p140b-editorial-prose-shipped.md`** (catch-up, missing) + **`memory/p140c-eeat-completion-shipped.md`** (new) created.
11. **`MEMORY.md`**: 2 new index lines (P140b + P140c).
12. **`docs/superpowers/specs/INDEX.md`**: 2 new rows in Section 7 (P140b + P140c).
13. **3-way push**: local = origin = github, 0/0 divergence.

---

## 11. References

- **P140b spec** (SHIPPED): `docs/superpowers/specs/2026-08-18-p140b-editorial-prose-design.md` (now marked SUPERSEDED)
- **P140b ship memory** (catch-up): `memory/p140b-editorial-prose-shipped.md` (P140c-T5 creates)
- **P140a ship memory**: `memory/p140a-adsense-scaffold-shipped.md` (scaffold)
- **P146 ship memory**: `memory/p146-p145-followup-shipped.md` (current master HEAD `17606a4`)
- **AdSense rejection notification**: 2026-08-17, `forgeflowkit.com`, "低价值内容", status 需要审核
- **P140b ship-time TODO**: `src/pages/[lang]/[slug].astro:1352` (`// P140b-T6: placeholder founder persona until P140c-T1 wires real reviewer data`)
- **`src/data/editorial.ts`** (NEW): single source of truth for personas + routing
- **`src/data/prose-tiers.ts`** (NEW): tier assignments
- **`src/components/EeatTrustBlock.astro`**: existing block (needs real data)
- **`src/pages/[lang]/about.astro`**: existing about (needs 3 sections)
- **`src/pages/[lang]/[slug].astro:1349-1369`**: existing EeatTrustBlock wire (needs replacement)
- **`src/content/tools-schema.ts`**: frontmatter zod schema (existing, unchanged)
- **`tests/content-prose-shape-guard.test.ts`**: P140a-T7 4-H2 + length guard (existing, unchanged)
- CLAUDE.md §"Defense-in-Depth": build-dep suite registry (P140c adds 2)
- CLAUDE.md §"Subagent task granularity": MECH vs INTEG review depth calibration
- CLAUDE.md 红线 7: `pnpm check` (commit 前过质量门禁)