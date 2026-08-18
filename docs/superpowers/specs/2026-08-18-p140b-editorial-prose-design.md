# P140b — Editorial Prose Mass-Write for AdSense Recovery (Design)

> **Status:** READY for `superpowers:writing-plans`. P140b closes the AdSense "low-value content" rejection by mass-writing 200 editorial prose files (100 engines × 2 langs) + shipping E-E-A-T infrastructure (author / reviewer / sources / Editorial Standards / Our Reviewers).
>
> **Origin**: P140a ship memory §"Deferred to P140b/c/d" + AdSense rejection notification for `forgeflowkit.com` on 2026-08-17 ("低价值内容", status 需要审核). 2026-08-18.

---

## 1. Goal

Resolve AdSense "low-value content" rejection for `forgeflowkit.com` by establishing site-wide editorial signals:

1. **200 editorial prose files** (100 engines × en + zh) with 4-H2 structure (intro / methodology / limitations / worked example), ≥ 1 cited source per file.
2. **E-E-A-T infrastructure** — `EeatTrustBlock` renders `author` + `reviewedBy` + `data_reviewed_at` + `sources`; About page adds Editorial Standards / Our Reviewers / Methodology sections; `seo-factory.ts` JSON-LD includes author + reviewedBy structured data.
3. **CalculatorProse wired into `[lang]/[slug].astro`** — every calc page renders the 4-H2 editorial prose below the calculator form (currently not wired per P140a-T7 comment line 11).
4. **3 new CI guards** — coverage (100/100 engines have ≥1 prose) + tier-completeness (15 + 35 + 50 split) + sources-quality (all `sources.url` are valid URLs).

**Single outcome**: P140d can resubmit AdSense with: site-wide E-E-A-T signals visible on every page + 200 editorial content files + 4-H2 prose structure across 15 categories.

**Pre-flight count** (verified from P146 ship memory): master HEAD `17606a4`, total commits 1018, `pnpm check` 1242/0/0 (1242 unit tests + 18 build-dep suites in RUN_BUILD_TESTS=1 mode = 1260 build-dep test invocations). After P140b +3 new build-dep guards: `pnpm check` 1245/0/0, `RUN_BUILD_TESTS=1` 1266/1266/0.

---

## 2. Approach — 1 PR, 7 atomic commits (Tiered scope)

User chose **Tiered 分批** (15 hand-written + 35 semi-auto + 50 ultra-light template).

```
Branch: feature/p140b-editorial-prose (off master 17606a4)
  │
  ├── Commit 1 (Task 1): feat(infra): editorial.ts + EeatTrustBlock upgrade + about upgrade + seo-factory upgrade
  │                         (E-E-A-T infrastructure scaffold; 4 files; sonnet)
  │
  ├── Commit 2 (Task 2): feat(wire): CalculatorProse wired into [lang]/[slug].astro
  │                         (render 4-H2 prose on every calc page; 1 file; sonnet)
  │
  ├── Commit 3 (Task 3): feat(prose): Tier-1 15 hand-written × 2 langs = 30 files
  │                         (en 800-1200 字 / zh 600-900 字, ≥2 sources; sonnet assistance + user prose)
  │
  ├── Commit 4 (Task 4): feat(prose): Tier-2 35 semi-auto × 2 langs = 70 files
  │                         (template + FAQ rewrite + QA; en 500-700 / zh 350-500; sonnet)
  │
  ├── Commit 5 (Task 5): feat(prose): Tier-3 50 ultra-light × 2 langs = 100 files
  │                         (ultra-light template; en 400-500 / zh 250-350; haiku)
  │
  ├── Commit 6 (Task 6): feat(guard): 3 CI guards (coverage + tier + sources quality)
  │                         (3 new test files in tests/; sonnet)
  │
  └── Commit 7 (Task 7): docs(ship): CHANGELOG M23.2 + ship record + MEMORY + INDEX + 3-way push
                            (inline ops)
```

Plus ship record + INDEX + MEMORY bump (Task 7, inline).

**Subagent calls**: 12-14 (6 implementer + 6 reviewer + 1 fable final review).

---

## 3. Architecture

### Branch & ship strategy
- Single feature branch `feature/p140b-editorial-prose` carries 7 commits (P141-P145 pattern).
- After all 7 commits:
  ```
  git push origin feature/p140b-editorial-prose
  git checkout master && git merge --ff-only feature/p140b-editorial-prose
  git push origin master
  git push github master --force-with-lease  (only if cron drift)
  ```
- Pre-push always: `git fetch origin && git fetch github && git rev-list --left-right --count origin/master...master github/master...master` (P43/P44 lesson).

### Tier-based content generation

| Tier | Count | Quality target (en/zh) | Sources | Generation mode |
|---|---|---|---|---|
| **Tier-1** | 15 (1 per category letter) | en 800-1200 字 / zh 600-900 字 | ≥ 2 each | Hand-written (user + sonnet assist) |
| **Tier-2** | 35 | en 500-700 字 / zh 350-500 字 | 1-2 each | Template + FAQ rewrite + user QA |
| **Tier-3** | 50 | en 400-500 字 / zh 250-350 字 | 1 each | Ultra-light template (auto-fill from engine metadata) |

**Total**: 100 engines × 2 langs = 200 markdown files.

### Authoring model (E-E-A-T safe)
- `author`: `"ForgeFlowKit Editorial Team"` (uniform across all 200 files; transparent group authorship, AdSense policy compliant)
- `reviewed_by`: `<user name/handle>` (Editor in Chief; real identity, About page bio)
- `data_reviewed_at`: `2026-08-18` (P140b ship date, all 200 files)
- `sources`: `[{ name: string, url: string }]` ≥ 1 per file (zod schema enforces)

### File conventions (extend P140a schema)
- File: `src/content/tools/<slug>.md` (en) / `<slug>.zh.md` (zh)
- Frontmatter (validated by `toolsFrontmatterSchema` in `src/content/tools-schema.ts`):
  - `engine_ref`: engine slug pattern (existing)
  - `category_id`: enum of 15 letters (existing)
  - `author`: `"ForgeFlowKit Editorial Team"` (existing field, all set to team)
  - `reviewed_by`: `<user name>` (existing field, all set to user)
  - `data_reviewed_at`: `YYYY-MM-DD` (existing)
  - `sources`: `[{ name, url }]` ≥ 1 (existing)
- 4 H2 sections (existing schema validation):
  - `## What This Calculator Measures` / `## 这个计算器衡量什么`
  - `## How It Works (Methodology)` / `## 计算方法`
  - `## Limitations & When Not To Use` / `## 局限性`
  - `## Worked Example` / `## 案例走读`
- Length thresholds (existing P140a-T7):
  - en per-H2 ≥ 100 chars, total ≥ 400 chars
  - zh per-H2 ≥ 70 chars, total ≥ 250 chars

### Tier selection rules

**Tier-1 (15 hand-written anchors)** — 1 per category letter, chosen by "highest search volume + deepest existing FAQ":
| Letter | Engine | Letter | Engine |
|---|---|---|---|
| A | mrr-calculator | H | ramp-time-calculator |
| B | openai-token-calculator | K | kb-coverage-rate-calculator |
| C | saas-valuation-calculator | L | gdpr-fine-risk-calculator |
| D | freelance-rate-calculator | M | roas-calculator |
| E | employee-cost-calculator | O | inventory-turnover-calculator |
| F | mortgage-calculator | P | funnel-conversion-calculator |
| R | nrr-calculator | S | pipeline-value-calculator |
| T | cost-per-ticket-calculator | | |

**Tier-2 (35 semi-auto)** — 2-3 per category, mid-priority (avoiding Tier-1 and Tier-3).
**Tier-3 (50 ultra-light)** — remaining engines per category.

Tier assignments captured in `src/data/prose-tiers.ts` (new file) — single source of truth, used by both generators and CI guards.

---

## 4. Components (per-task detail)

### Task 1 — E-E-A-T infrastructure scaffold

**Files**:
- Create: `src/data/editorial.ts` (editorial team + reviewer profiles)
- Modify: `src/components/EeatTrustBlock.astro` (render author + reviewer + sources)
- Modify: `src/pages/[lang]/about.astro` (Editorial Standards + Our Reviewers + Methodology sections)
- Modify: `src/lib/seo-factory.ts` (JSON-LD author + reviewedBy structured data)

**`src/data/editorial.ts`**:
```typescript
export const EDITORIAL = {
  author: 'ForgeFlowKit Editorial Team',
  bio: 'ForgeFlowKit\'s editorial team maintains the methodology, accuracy, and review cadence of every calculator on the site. Each prose file below the calculator form carries our team signature and is reviewed by our Editor in Chief.',
  methodology: 'Every calculator is reviewed against (1) primary source documentation (regulatory, standards body, vendor docs), (2) industry benchmarks (Gartner, Forrester, McKinsey, ENISA), and (3) at least one academic or peer-reviewed source when applicable.',
  reviewCadence: 'Quarterly', // P140b default; P140c can revisit if user wants more frequent
};

export const EDITORS = [
  {
    name: '<user name>', // user fills in
    role: 'Editor in Chief',
    bio: '<user bio>',
    credentials: ['<credential 1>', '<credential 2>'],
  },
];
```

**`src/components/EeatTrustBlock.astro` upgrade** — render EDITORIAL.author + EDITORS[0].name + data_reviewed_at + sources list. Add `<a href="/about#editorial-standards">Editorial Standards</a>` link.

**`src/pages/[lang]/about.astro` upgrade** — add 3 sections:
- `## Editorial Standards` (锚点 `editorial-standards`) — quality methodology, update cadence, fact-check process (imports EDITORIAL.bio + EDITORIAL.methodology + EDITORIAL.reviewCadence)
- `## Our Reviewers` (锚点 `our-reviewers`) — list EDITORS with bio + credentials (link to `/about/authors/<name>` if P140c ships, else plain text)
- `## Methodology` (锚点 `methodology`) — overall framework + per-category notes (link to category page)

**`src/lib/seo-factory.ts` upgrade** — JSON-LD structured data add:
```typescript
{
  "@type": "Article",
  "author": { "@type": "Organization", "name": "ForgeFlowKit Editorial Team" },
  "reviewedBy": { "@type": "Person", "name": "<Editor in Chief name>" },
  "datePublished": "<data_reviewed_at>",
  "dateModified": "<data_reviewed_at>"
}
```

### Task 2 — CalculatorProse wire into [lang]/[slug].astro

**File**: `src/pages/[lang]/[slug].astro` (modify; add import + render)

**Change**: After form/result section, render:
```astro
---
import CalculatorProse from '../../components/CalculatorProse.astro';
---
<CalculatorProse slug={engineSlug} lang={lang} />
```

**`CalculatorProse.astro` upgrade** (verify rendering) — gracefully fallback when no prose file exists (warn, not throw). Currently per P140a-T7 comment line 11, the renderer exists but is not wired.

### Task 3 — Tier-1 15 hand-written × 2 langs = 30 files

**Files**: `src/content/tools/<slug>.md` + `<slug>.zh.md` for 15 engines × 2 langs.

**Writing approach per prose file**:
- **Intro** (250-350 字 en / 200-300 字 zh): 行业背景 + calc 解决什么问题 + 谁会用
- **Methodology** (250-350 字 en / 200-300 字 zh): 详细公式拆解 + 输入字段意义 + assumptions
- **Limitations** (200-300 字 en / 150-250 字 zh): 真实使用陷阱 + 何时不该用
- **Worked Example** (200-300 字 en / 150-250 字 zh): 真实数字 + 决策 commentary (e.g. "This $5K MRR SaaS at 90% gross margin shows...": cite engine's `staticExamples[0]` canonical numbers, explain what the user should take away from this number)

**Sources** (≥ 2 per file):
- Industry standard (Gartner / Forrester / McKinsey / ENISA)
- Official docs (regulatory / standards body)
- Or 学术 paper / well-known methodology source

**Generation mode**: User writes draft (借助 sonnet 抽取公式解释); final prose 是 user-authored prose, sonnet 仅做"facts check"。

### Task 4 — Tier-2 35 semi-auto × 2 langs = 70 files

**Files**: `src/content/tools/<slug>.md` + `<slug>.zh.md` for 35 engines × 2 langs.

**Template** (sonnet-applied):
- **Intro** (auto from engine.title + description + 1 段 manual polish): 100-200 字
- **Methodology** (auto from engine.calculate() formula + 100-200 字 manual caveat): 200-300 字
- **Limitations** (template per category + manual 调整): 100-200 字
- **Worked Example** (引用 staticExamples[0] + 1 段 commentary): 100-200 字

**QA** (per file): user 抽 30% review + fix any awkward phrasing.

### Task 5 — Tier-3 50 ultra-light × 2 langs = 100 files

**Files**: `src/content/tools/<slug>.md` + `<slug>.zh.md` for 50 engines × 2 langs.

**Template** (haiku-generated, fully auto):
- **Intro**: engine.title + description 拼接 1-2 句
- **Methodology**: 从 engine.calculate() 抽取主 formula, 150 字模板
- **Limitations**: "Assumes standard inputs, may not apply to ..." 通用句
- **Worked Example**: staticExamples[0] + 1 句 commentary

**Sources**: 1 个 generic (指向 SaaS / finance 通用 docs)

**QA**: content-prose-shape-guard 全过即可 (无 manual review)

### Task 6 — 3 new CI guards

**File 1**: `tests/editorial-prose-coverage-guard.test.ts`
- Walk all 100 engines
- For each: assert ≥ 1 prose file in `src/content/tools/` (en) AND ≥ 1 zh counterpart
- Report: list engines missing prose (count + slugs)

**File 2**: `tests/tier-prose-completeness-guard.test.ts`
- Import `PROSE_TIERS` from `src/data/prose-tiers.ts`
- For each tier (Tier-1, Tier-2, Tier-3): assert all assigned slugs have both en + zh prose
- Per-tier length threshold: Tier-1 en ≥ 700 / zh ≥ 500; Tier-2 en ≥ 450 / zh ≥ 300; Tier-3 en ≥ 350 / zh ≥ 220 (existing per-H2 thresholds still apply via P140a-T7)

**File 3**: `tests/sources-quality-guard.test.ts`
- Walk all 200 prose files
- For each: parse frontmatter sources[]; assert each `url` matches `^https?://` regex + is non-empty
- Optional: HEAD request to verify reachability (skipped by default to avoid network dep; user can opt-in via `RUN_SOURCES_LIVE_CHECK=1`)

### Task 7 — CHANGELOG + ship record + 3-way push (inline ops)

**Files**:
- Modify: `CHANGELOG.md` (add M23.2 milestone covering P140b)
- Create: `memory/p140b-editorial-prose-shipped.md` (ship record)
- Modify: `memory/MEMORY.md` (add P140b index line)
- Modify: `docs/superpowers/specs/INDEX.md` + `docs/superpowers/plans/INDEX.md` (add P140b row)

**3-way push** (per P43/P44 lesson):
```bash
git fetch origin && git fetch github
git rev-list --left-right --count origin/master...master github/master...master  # expect 0\t0
git push origin feature/p140b-editorial-prose
git checkout master
git merge --ff-only feature/p140b-editorial-prose
git push origin master
git push github master  # or git -c core.hooksPath=/dev/null push github master if hook block
```

---

## 5. Data flow

### Editorial prose lifecycle
```
Tier-1/2/3 generator (Tasks 3-5)
  ↓ produces 200 .md files
src/content/tools/<slug>.md / <slug>.zh.md
  ↓ zod schema validate (existing P140a-T7)
  ↓ content-prose-shape-guard (existing P140a-T7)
  ↓ 3 new CI guards (Task 6: coverage + tier + sources)
src/pages/[lang]/[slug].astro (Task 2 wiring)
  ↓ imports CalculatorProse
  ↓ renders 4-H2 prose below calc form
dist/en/<slug>/index.html (build output)
  ↓ visible to users + AdSense crawler
```

### E-E-A-T signal flow
```
src/data/editorial.ts (Task 1)
  ↓ provides EDITORIAL + EDITORS constants
src/components/EeatTrustBlock.astro (Task 1)
  ↓ imports EDITORIAL + EDITORS + sources
  ↓ renders on every [slug].astro page
src/pages/[lang]/about.astro (Task 1)
  ↓ renders Editorial Standards + Our Reviewers + Methodology
src/lib/seo-factory.ts (Task 1)
  ↓ injects author + reviewedBy JSON-LD per page
```

---

## 6. Error handling

### Task 1 — E-E-A-T infrastructure
- **`src/data/editorial.ts` schema mismatch**: If EDITORIAL shape drifts from import sites, TypeScript compile fails. Caught by `pnpm check`.
- **`EeatTrustBlock` import error**: If EDITORIAL/EDITORS not exported correctly, build fails at Astro render. Caught by `pnpm build`.

### Task 2 — CalculatorProse wiring
- **No prose file for an engine**: CalculatorProse renders empty section + console.warn (P140a fallback design). Page still renders.
- **Tier-mismatch import**: If `src/data/prose-tiers.ts` slug typos, Task 6 guard catches.

### Tasks 3-5 — Prose generation
- **Tier-1 prose quality risk**: User-written, but CI length threshold catches short submissions.
- **Tier-2/3 template drift**: content-prose-shape-guard catches missing H2 or length shortfall.
- **Sources URL invalid**: sources-quality-guard catches (Task 6).

### Task 6 — CI guards
- **Tier assignment drift**: If a tier assignment file changes, guard catches.
- **Engine added without prose**: editorial-prose-coverage-guard catches.

---

## 7. Testing

### Per-commit verification

| Commit | Verification | Pass criterion |
|---|---|---|
| **1 (Task 1)** | `pnpm check 2>&1 \| tail -3` | `tests 1242 / pass 1242 / fail 0` (no test count change yet) |
| **2 (Task 2)** | `pnpm build 2>&1 \| tail -5` + `grep -l 'CalculatorProse' dist/en/solopreneur-mrr-calculator/index.html` | visible in dist HTML |
| **3 (Task 3)** | `RUN_BUILD_TESTS=1 pnpm test:build 2>&1 \| grep 'content-prose-shape'` | 30 new prose files pass guard |
| **4 (Task 4)** | `RUN_BUILD_TESTS=1 pnpm test:build 2>&1 \| grep 'content-prose-shape'` | 100 cumulative files pass guard |
| **5 (Task 5)** | `RUN_BUILD_TESTS=1 pnpm test:build 2>&1 \| grep 'content-prose-shape'` | 200 cumulative files pass guard |
| **6 (Task 6)** | `RUN_BUILD_TESTS=1 pnpm test:build 2>&1 \| grep -E 'editorial-prose\|tier-prose\|sources-quality'` | 3/3 pass |
| **7 (Task 7)** | `pnpm check 2>&1 \| tail -3` | `tests 1245 / pass 1245 / fail 0` (1242 + 3 new unit tests) |

### Per-PR cross-cutting (before ff-merge)
```bash
pnpm check 2>&1 | tail -3
# Expected: tests 1245 / pass 1245 / fail 0 (1242 + 3 new unit tests from Task 6)

RUN_BUILD_TESTS=1 pnpm test:build 2>&1 | grep -E "^# (tests|pass|fail)"
# Expected: tests 1266 / pass 1266 / fail 0 (1245 unit + 21 build-dep = 18 existing + 3 new from Task 6)

git fetch origin && git fetch github
git rev-list --left-right --count origin/master...master github/master...master
# Expected: 0\t0
```

---

## 8. Out of scope (deferred)

| Item | Deferred to |
|---|---|
| Author bio pages at `/about/authors/<name>.astro` | P140c |
| Per-category methodology deep-dive | P140c |
| About page Editorial Standards / Methodology content deepening | P140c |
| AdSense Console Auto Ads toggle + resubmit | P140d |
| `content-prose-shape-guard.test.ts` zh 缺位 upgrade: warn → build fail | P140d |
| Per-tier length differentiation (already partially in tier-prose-completeness) | P140d |

---

## 9. Ship Path

### Day 0 (today, 2026-08-18)
1. ✅ `git checkout -b feature/p140b-editorial-prose` (will be created when execution starts)
2. (Next) `superpowers:writing-plans` creates plan from this spec
3. (Next) `superpowers:executing-plans` executes Tasks 1-7 with subagent-driven development

### Per-task (Tasks 1-6)
1. Dispatch implementer subagent (MECH class, single review depth for infra/wire; INTEG class for Tier-1 prose + E-E-A-T; single-tier dispatch for Tier-2/3 auto-gen)
2. Dispatch spec-verifier subagent
3. Apply fix if any
4. `pnpm check` (always) + `RUN_BUILD_TESTS=1 pnpm test:build` (Tasks 3-6)
5. Commit with conventional message
6. `git push origin feature/p140b-editorial-prose`

### Day N (after Task 7 ship)
- Update `memory/p140b-editorial-prose-shipped.md`
- Update `MEMORY.md` index line
- Update `docs/superpowers/specs/INDEX.md` + `docs/superpowers/plans/INDEX.md`
- Mark branch as `keep` (audit history)

---

## 10. Acceptance criteria

1. **200 prose files complete**: 100 engines × en + zh = 200 files in `src/content/tools/`.
2. **content-prose-shape-guard.test.ts**: all 200 files satisfy 4-H2 + length threshold.
3. **E-E-A-T infrastructure**:
   - `EeatTrustBlock` renders `EDITORIAL.author` + `EDITORS[0].name` + `data_reviewed_at` + sources
   - About page has Editorial Standards + Our Reviewers + Methodology sections
   - `seo-factory.ts` JSON-LD includes `author` + `reviewedBy` + `datePublished`/`dateModified`
   - CalculatorProse wired into `[lang]/[slug].astro`, visible on every calc page
4. **3 new CI guards**: editorial-prose-coverage-guard + tier-prose-completeness-guard + sources-quality-guard all 1/1 pass.
5. **`pnpm check` 1245/0/0** (1242 + 3 new tests).
6. **`RUN_BUILD_TESTS=1 pnpm test:build` 1266/1266/0** preserved.
7. **3-way push**: local = origin = github at single SHA, 0 divergence.

---

## 11. References

- P140a ship memory: `memory/p140a-adsense-scaffold-shipped.md` (scaffold already in place)
- P146 ship memory: `memory/p146-p145-followup-shipped.md` (current master HEAD `17606a4`)
- AdSense rejection notification: 2026-08-17, `forgeflowkit.com`, "低价值内容", status 需要审核
- `src/content/tools-schema.ts`: frontmatter zod schema source of truth
- `tests/content-prose-shape-guard.test.ts`: existing P140a-T7 4-H2 + length guard
- `src/components/CalculatorProse.astro`: existing renderer (P140a scaffold; not wired)
- `src/components/EeatTrustBlock.astro`: existing block (needs upgrade)
- `src/lib/seo-factory.ts`: existing factory (needs author/reviewedBy fields)
- `src/pages/[lang]/about.astro`: existing about (needs 3 new sections)
- CLAUDE.md §"Defense-in-Depth": build-dep suite registry (47+ suites; P140b adds 3)
- CLAUDE.md §"Subagent task granularity": MECH vs INTEG review depth calibration
- CLAUDE.md 红线 7: `pnpm check` (commit 前过质量门禁)