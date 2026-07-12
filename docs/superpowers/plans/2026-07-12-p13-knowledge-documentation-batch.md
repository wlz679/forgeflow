# P13 Knowledge/Documentation Calculator Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (controller direct execution, no subagent dispatch for mechanical P-series work). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6 new calculators in a NEW 'K' Knowledge/Documentation category at ForgeFlowKit (solopreneur SaaS calculators). Mid-market B2B SaaS DevRel Lead / Tech Writer persona, $10M-$50M ARR anchor. Closes the **KB upstream loop** that P12-5 (Deflection Rate) depends on. Brings total to 92 engines / 14 categories.

**Architecture:** Self-registered engine (`src/engines/knowledge/<slug>-calculator.ts`), per-calc 4-band hardcoded thresholds from KB / Content Ops community consensus (TSIA 2024 Knowledge Management, Zendesk CX Trends 2024, Gartner Customer Service 2024, NN/g Help & Documentation, ICMI 2023, Content Marketing Institute 2024, Forrester Content Operations 2024, Algolia/Coveo Search Benchmarks 2024). Fully static — no PRICING.json entry, no API fetch. Per-calc push cadence (8 commits total: scaffold + 6 calcs + holistic). Closes the **content-quality upstream loop** complementing P6 (marketing acquisition) + P8 (sales closing) + P9 (retention keep) + P10 (product engagement) + P11 (team scaling) + P12 (service ops downstream).

**Tech Stack:** Astro 4.16.19 static site generation, TypeScript 5.6 strict. Node `appendFileSync` for engine files >5000 chars (P9-2/P9-5 lesson). pnpm check (typecheck + test:run) as pre-commit gate. No new external dependencies.

---

## Global Constraints

| # | Constraint | Source |
|---|------------|--------|
| 1 | Each calculator file lives in `src/engines/knowledge/` | spec §1.1 |
| 2 | Engine filename: `<slug>-calculator.ts` (kebab-case, no abbreviations) | spec §5 |
| 3 | Engine self-registers via `registerEngine(engine)` at module import | P-series established |
| 4 | Barrel pattern: `src/engines/knowledge/index.ts` uses explicit line-per-engine imports (NOT `import.meta.glob` at subdir level — that's only for `src/engines/index.ts`) | P12-0 lesson |
| 5 | ToolMeta entry in `src/data/tools/knowledge.ts` uses `categoryId: 'K'` exactly | spec §5 |
| 6 | OG entry: `headline`, `headlineUnit`, `headlineLabel` — both `en` and `zh` keys | P9 pattern |
| 7 | `scripts/codegen-examples.mjs` ENGINES array: `{ file, slug, subdir: 'knowledge', defaultInputs }` | P12-0 lesson |
| 8 | `tests/ab-split.test.ts`: subdir array append `'knowledge'` (14→15), file list append `'knowledge.ts'` (16→17); engines length 86→92 per-calc; tools length 86→92 per-calc | spec §5, P8-0 over-bump lesson |
| 9 | `tests/internal-links.test.ts`: bump `86` → `92` per-calc (not just at P13-6) | P12-1 lesson |
| 10 | Each per-calc test file: 10-13 tests covering math + 4 health bands | spec §3-§6 |
| 11 | 6-section v3 Business standard: 🩺 Health · 📊 Snapshot · 🔄 What-If · ⚖️ Break-Even · 🎯 Milestone · 💡 Tip | spec §3 |
| 12 | HEALTH_BANDS exported as top-level `const` per engine file | P6+ pattern |
| 13 | Float precision dual-layer: math returns unrounded, display rounds | P-series standard |
| 14 | Mid-market $10M-$50M ARR anchor copy in every ToolMeta description | P9+ pattern |
| 15 | INVERSE band direction for K-4 Deflection Quality (reopen); HIGHER for K-1/K-2/K-3/K-5/K-6 | spec §4 |
| 16 | K-3 composite band uses **AND** of two thresholds (CTR AND no-result), not weighted composite | spec §3.3, §6 |
| 17 | K-3 calcHealthBand signature: `calcHealthBand(ctrPct, noResultPct)` — TWO args | spec §3.3 |
| 18 | K-4 critical threshold = `Infinity` (INVERSE on reopen rate) | P9-4 + P12-1 lesson |
| 19 | Pre-commit gate: `pnpm check` (zero errors) before each commit | P-series standard |
| 20 | Dual push: `git push origin HEAD` (gitee) + `git push github HEAD` with `SKIP_PUSH_FETCH=1` | P-series standard |
| 21 | Use Node `appendFileSync` (NOT Bash printf) for engine files >5000 chars | P9-2 lesson |
| 22 | Run `node scripts/codegen-examples.mjs` after engine edits; `--check` mode for drift detection | P-series standard |
| 23 | Codegen `--check` validates `new Function('inputs','pick','fill', customFn)` parses + literal escape regex | P9 pattern |
| 24 | Memory file per-calc saved to `~/.claude/projects/.../memory/` AND `memory/` in-repo AFTER successful ship | P-series standard |
| 25 | `MEMORY.md` index in same location gets `- [Title](file.md)` line per ship | P-series standard |
| 26 | **CRITICAL P13-0 scaffold pre-emptive**: `src/engines/index.ts` adds `import './knowledge';` AND `src/data/tools/index.ts` adds `import { tools as knowledge } from './knowledge';` + spreads into tools array | P9-1 + P10-1 + P11-1 + P12-0 lesson (caught by ab-split) |
| 27 | K-DevRel persona string: "mid-market B2B SaaS ($10M-$50M ARR)" + "DevRel Lead · Documentation Manager · Tech Writer" in every description | spec §1.3 |
| 28 | K-1 KB Coverage math: `coverage_rate = tickets_with_kb_match / monthly_tickets; gap_rate = 1 - coverage_rate` | spec §3.1 |
| 29 | K-3 dual-threshold band uses BOTH conditions passing for 🟢/🟡/🟠; either failing triggers 🔴 | spec §3.3 |
| 30 | All 26 inputs verified per spec §3 (no missing input mid-flight fixes) | spec §3 + P10-1 lesson |
| 31 | Cross-link IDs in engine Tips reference `K-N ↔ P12-N` (parentheses-style); P12 engine Tips already reference back via plan-time insertion | spec §1.4 |

---

## File Structure

| Layer | File | Per-task |
|-------|------|----------|
| Engine | `src/engines/knowledge/<slug>-calculator.ts` | NEW per calc (Task 2-7) |
| Engine | `src/engines/knowledge/index.ts` | NEW (Task 1), append imports (Task 2-7) |
| Engine | `src/engines/index.ts` | **append `import './knowledge';`** (Task 1) — ROOT barrel pre-emptive fix |
| Data | `src/data/tools/knowledge.ts` | NEW empty (Task 1), append entries (Task 2-7) |
| Data | `src/data/tools/index.ts` | **append `import { tools as knowledge } from './knowledge';` + spread** (Task 1) — ROOT barrel pre-emptive fix |
| Data | `src/data/categories.ts` | append 1 entry (Task 1) |
| Data | `src/data/og-samples.json` | append 1 entry per calc (Task 2-7) |
| Page | `src/pages/[lang]/knowledge.astro` | NEW (Task 1) |
| Test | `tests/<slug>-calculator.test.ts` | NEW per calc (Task 2-7) |
| Test | `tests/ab-split.test.ts` | modify subdir/data/files arrays (Task 1), bump counts per calc (Task 2-7) |
| Test | `tests/internal-links.test.ts` | bump per calc (Task 2-7) |
| Script | `scripts/codegen-examples.mjs` | append ENGINES entry per calc (Task 2-7) |
| Memory | `~/.claude/projects/.../memory/p13-N-<slug>-shipped.md` | NEW per calc (Task 2-7) |
| Memory | `~/.claude/projects/.../memory/p13-series-shipped.md` | NEW (Task 8) |
| Memory | `~/.claude/projects/.../memory/MEMORY.md` | append line per ship |

**Total file actions per calc (Task 2-7):** 8 (engine + test + 6 supporting: barrel, ToolMeta, og-samples, codegen, ab-split, internal-links + memory)
**Total file actions Task 1:** 8 (1 dir + 7 files: empty barrel, empty ToolMeta, categories entry, listing page, ab-split array updates, AND both root barrel imports)
**Total file actions Task 8 (holistic review):** 3 (1 review agent + 1 series memory + 1 MEMORY.md update + 1 holistic fix commit + 1 push)

**Commits:** 8 (scaffold + 6 calcs + holistic review + memory)

---

### Task 1: P13-0 Scaffold — Empty category shell + ROOT barrel pre-emptive fixes [INTEGRATION]

**Files:**
- Create: `src/engines/knowledge/` (directory)
- Create: `src/engines/knowledge/index.ts` (empty barrel with all 6 calc comments)
- Modify: `src/engines/index.ts` (append `import './knowledge';`)
- Create: `src/data/tools/knowledge.ts` (empty)
- Modify: `src/data/tools/index.ts` (append `import { tools as knowledge } from './knowledge';` + spread)
- Modify: `src/data/categories.ts` (append 1 entry — 'K' Knowledge/Documentation as 15th)
- Create: `src/pages/[lang]/knowledge.astro` (template)
- Modify: `tests/ab-split.test.ts` (add 'knowledge' to subdir array; add 'knowledge.ts' to data/tools file list)

**Interfaces:**
- Consumes: nothing (first task)
- Produces:
  - `src/data/categories.ts` exports `categories: Category[]` with length 14 (was 13) — appending 'K' as 14th (P13 is batch #11; letter K by convention; total letters A B C D E F H K M O P R S T = 14)
  - `src/data/tools/knowledge.ts` exports `tools: ToolMeta[]` (empty, length 0)
  - `src/pages/[lang]/knowledge.astro` renders `dist/en/knowledge/index.html` and `dist/zh/knowledge/index.html`
  - `tests/ab-split.test.ts` test "engines/ has 14 subdirectories" → updated to "15 subdirectories" + 'knowledge' appended; test "data/tools/ has 16 files" → updated to "17 files" + 'knowledge.ts' appended
  - `src/engines/index.ts` and `src/data/tools/index.ts` both reference knowledge from Task 1 (avoids P10-1 mid-flight fix)

- [ ] **Step 1: Create directory `src/engines/knowledge/`**

Run: `mkdir -p src/engines/knowledge`
Expected: directory created.

- [ ] **Step 2: Create `src/engines/knowledge/index.ts` (empty barrel)**

```ts
// Knowledge/Documentation Calculator Engines (P13 batch, 6 calcs)
//
// P13-1: kb-coverage-rate          — KB Coverage Rate
// P13-2: article-freshness         — Article Freshness
// P13-3: search-effectiveness      — Search Effectiveness
// P13-4: deflection-quality        — Deflection Quality
// P13-5: documentation-roi         — Documentation ROI
// P13-6: article-helpfulness       — Article Helpfulness Score
//
// Engines are added one per task via Task 2..Task 7.
export {};
```

Save to: `src/engines/knowledge/index.ts`

- [ ] **Step 3: Modify `src/engines/index.ts` — append knowledge import (PRE-EMPTIVE ROOT BARREL FIX)**

Update the comment from "11 subdirectories" → "12 subdirectories", and append as the 12th line (after `import './customer-support';`):

```ts
import './knowledge';
```

Final file should have 13 lines of imports + 5-line header comment.

- [ ] **Step 4: Create `src/data/tools/knowledge.ts` (empty)**

```ts
// Knowledge/Documentation ToolMeta entries (P13 batch, 6 calcs).
// Per-task adds one entry. See src/data/tools/index.ts for barrel.
import type { ToolMeta } from './types';
export const tools: ToolMeta[] = [];
```

Save to: `src/data/tools/knowledge.ts`

- [ ] **Step 5: Modify `src/data/tools/index.ts` — append knowledge import + spread (PRE-EMPTIVE ROOT BARREL FIX)**

Add `import { tools as knowledge } from './knowledge';` to the import block (after `import { tools as customerSupport } from './customer-support';`), and `...knowledge,` to the spread block (after `...customerSupport,`).

Final `tools` array should have 15 spread entries.

- [ ] **Step 6: Modify `src/data/categories.ts` — append 'K' category entry**

Read the file first to find the last closing brace (`];`). Then append BEFORE the closing `]` (NOT after — keep array valid). Note: there are 13 categories currently (A B C D E F M O P R S H T); the alphabet has no 'G' or 'I' or 'J' or 'N' or 'Q' or 'U' or 'V' or 'W' or 'X' or 'Y' or 'Z' yet. 'K' lands naturally mid-alphabet.

```ts
  { id: 'K', name: 'Knowledge / 知识库', slug: 'knowledge', description: 'Calculate KB coverage rate, article freshness, search effectiveness, deflection quality, documentation ROI, and article helpfulness score for DevRel Leads, Documentation Managers, and Technical Writers at mid-market B2B SaaS companies ($10M-$50M ARR).' },
```

Verify with: `grep -c "id: 'K'" src/data/categories.ts` → expect `1`
Verify array length: `grep -c "id: '[A-Z]'" src/data/categories.ts` → expect `14`

- [ ] **Step 7: Create `src/pages/[lang]/knowledge.astro` (template copy from customer-support.astro)**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Header from '../../components/Header.astro';
import Footer from '../../components/Footer.astro';
import ToolCard from '../../components/ToolCard.astro';
import CategoryOtherNav from '../../components/CategoryOtherNav.astro';
import { categories } from '../../data/categories';
import { tools } from '../../data/tools';
import { t, getLang } from '../../i18n';

export function getStaticPaths() {
  return [
    { params: { lang: 'en' } },
    { params: { lang: 'zh' } },
  ];
}

const lang = getLang(Astro);
const CATEGORY_ID = 'K';
const CATEGORY_SLUG = 'knowledge';
// Category K i18n keys will populate incrementally across P13-1..P13-6.
// Until then, fall back to direct category data.
const categoryMeta = categories.find(c => c.id === CATEGORY_ID);
const categoryName = categoryMeta?.name ?? 'Knowledge / 知识库';
const categoryDesc = categoryMeta?.description ?? 'Knowledge/Documentation calculators for mid-market B2B SaaS DevRel Leads and Technical Writers.';

const categoryTools = tools.filter(tool => tool.categoryId === CATEGORY_ID);
---

<BaseLayout
  title={`${categoryName} — ForgeFlowKit`}
  description={categoryDesc}
  pageType="static"
>
  <Header />
  <main class="max-w-6xl mx-auto px-4 py-8 flex-1">
    <section class="mb-10">
      <div class="text-xs font-semibold text-[#7C3AED] mb-2">Category {CATEGORY_ID}</div>
      <h1 class="text-3xl font-bold text-gray-900 mb-3">{categoryName}</h1>
      <p class="text-gray-600 max-w-2xl">{categoryDesc}</p>
    </section>

    <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
      {categoryTools.map((tool) => (
        <ToolCard tool={tool} lang={lang} />
      ))}
    </section>

    <CategoryOtherNav currentCategoryId={CATEGORY_ID} categories={categories} lang={lang} />
  </main>
  <Footer />
</BaseLayout>
```

Save to: `src/pages/[lang]/knowledge.astro`

- [ ] **Step 8: Modify `tests/ab-split.test.ts` — subdir array append (14→15); data/tools/ file list append (16→17)**

In test "engines/ has 14 subdirectories", update the literal list:
- Change `assert.equal` description to "has 15 subdirectories"
- Add `'knowledge'` to the for-loop array (after `'customer-support'`)

```ts
test('engines/ has 15 subdirectories', () => {
  for (const sub of ['saas', 'ai-cost', 'valuation', 'freelance', 'cost', 'investment', 'real-estate', 'marketing', 'operations', 'sales', 'retention', 'product-analytics', 'hiring-team', 'customer-support', 'knowledge']) {
    assert.ok(
      existsSync(join(ROOT, 'src/engines', sub)),
      `engines/${sub}/ should exist`
    );
  }
});
```

In test "data/tools/ has 16 files", update:
- Change description to "17 files"
- Add `'knowledge.ts'` to the for-loop array (after `'customer-support.ts'`)

```ts
test('data/tools/ has 17 files (types, 15 categories, index)', () => {
  for (const f of ['types.ts', 'saas.ts', 'ai-cost.ts', 'valuation.ts', 'freelance.ts', 'cost.ts', 'investment.ts', 'real-estate.ts', 'marketing.ts', 'operations.ts', 'sales.ts', 'retention.ts', 'product-analytics.ts', 'hiring-team.ts', 'customer-support.ts', 'knowledge.ts', 'index.ts']) {
    assert.ok(
      existsSync(join(ROOT, 'src/data/tools', f)),
      `data/tools/${f} should exist`
    );
  }
});
```

Verify with: `grep -c "knowledge" tests/ab-split.test.ts` → expect ≥2 (subdir + file list entries)

- [ ] **Step 9: Run pnpm check to verify scaffold gates**

Run: `pnpm check`
Expected: PASS (0 errors). Subdir/tool tests pass with empty barrel.

- [ ] **Step 10: Commit scaffold**

Run: `git add src/engines/knowledge/ src/engines/index.ts src/data/tools/knowledge.ts src/data/tools/index.ts src/data/categories.ts src/pages/[lang]/knowledge.astro tests/ab-split.test.ts`
Then: `git commit -m "feat(p13-0): knowledge/documentation category scaffold + new 'K' category + listing page + ROOT barrel pre-emptive"`

Then dual-push:
```bash
git push origin HEAD
git push github HEAD
```

---

### Task 2: P13-1 KB Coverage Rate [MECHANICAL]

**Files:**
- Create: `src/engines/knowledge/kb-coverage-rate-calculator.ts`
- Modify: `src/engines/knowledge/index.ts` (append import)
- Modify: `src/data/tools/knowledge.ts` (append ToolMeta entry)
- Modify: `src/data/og-samples.json` (append 1 entry)
- Modify: `scripts/codegen-examples.mjs` (append ENGINES entry)
- Modify: `tests/ab-split.test.ts` (bump engines 86→87, tools 86→87)
- Modify: `tests/internal-links.test.ts` (bump `Object.keys(relatedTools).length` 86→87)
- Create: `tests/kb-coverage-rate-calculator.test.ts`
- Memory: `~/.claude/projects/.../memory/p13-1-kb-coverage-rate-shipped.md` (after successful ship)

**Interfaces:**
- Consumes: `src/engines/customer-support/cost-per-support-ticket-calculator.ts` (cross-link reference for Tip)
- Produces: `registerEngine(engine)` adds 1 to `getAllEngines().length` (86→87)

**Inputs (4)**: `monthly_tickets` (number), `tickets_with_kb_match` (number), `total_articles` (number), `industry_benchmark` (select: SaaS / FinTech / HealthTech / eCommerce / default SaaS)

**Math:**
- `coverage_rate = tickets_with_kb_match / monthly_tickets`
- `gap_rate = 1 - coverage_rate`
- `gap_tickets = monthly_tickets - tickets_with_kb_match`

**HEALTH_BANDS (HIGHER; critical -Infinity):**
- 🟢 excellent: ≥ 85% coverage
- 🟡 good: 60% ≤ x < 85%
- 🟠 warning: 40% ≤ x < 60%
- 🔴 critical: < 40%

**Canonical (per spec §3.1):** `monthly_tickets=5000, tickets_with_kb_match=3500, total_articles=500, industry_benchmark='SaaS'` → coverage 70% (🟡 Good), gap 30% = 1,500 tickets/mo without KB article.

- [ ] **Step 1: Write `src/engines/knowledge/kb-coverage-rate-calculator.ts`**

```ts
// P13-1 KB Coverage Rate
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS DevRel/Tech Writer persona ($10M-$50M ARR).
// Community-wisdom thresholds (TSIA 2024 Knowledge Management + Zendesk CX Trends 2024 + Gartner Customer Service 2024).
// Single coverage math: coverage_rate = matched / total.
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

export const HEALTH_BANDS = {
  excellent: { threshold: 0.85, label: 'Excellent', message: 'Comprehensive KB coverage.' },
  good:      { threshold: 0.60, label: 'Good',      message: 'Healthy match rate.' },
  warning:   { threshold: 0.40, label: 'Warning',   message: 'Significant KB gaps.' },
  critical:  { threshold: -Infinity, label: 'Critical', message: 'KB largely non-existent.' },
};

export function coverageRate(matched: number, total: number): number {
  return total > 0 ? matched / total : 0;
}

export function gapTickets(matched: number, total: number): number {
  return Math.max(0, total - matched);
}

export function calcHealthBand(coverage: number): keyof typeof HEALTH_BANDS {
  if (coverage >= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (coverage >= HEALTH_BANDS.good.threshold) return 'good';
  if (coverage >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtPct(x: number): string { return (x * 100).toFixed(1) + '%'; }
function fmtInt(x: number): string { return Math.round(x).toLocaleString(); }

const engine: ToolEngine = {
  slug: 'solopreneur-kb-coverage-rate-calculator',
  title: 'KB Coverage Rate',
  description:
    'Measure what % of inbound support tickets have a matching KB article. HIGHER health bands — more coverage = better self-service: 🟢 ≥85% · 🟡 60-85% · 🟠 40-60% · 🔴 <40%. For mid-market B2B SaaS ($10M-$50M ARR) DevRel Leads, Documentation Managers, and Technical Writers.',
  inputs: [
    { name: 'monthly_tickets',         label: 'Monthly inbound tickets',                placeholder: 'e.g. 5000', type: 'number' },
    { name: 'tickets_with_kb_match',   label: 'Tickets with KB match',                 placeholder: 'e.g. 3500', type: 'number' },
    { name: 'total_articles',          label: 'Total KB articles',                     placeholder: 'e.g. 500',  type: 'number' },
    { name: 'industry_benchmark',      label: 'Industry',                              placeholder: 'SaaS',      type: 'select', options: ['SaaS', 'FinTech', 'HealthTech', 'eCommerce'] },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `function run(inputs, pick, fill) {
  var total = Number(inputs.monthly_tickets) || 0;
  var matched = Number(inputs.tickets_with_kb_match) || 0;
  var articles = Number(inputs.total_articles) || 0;
  if (matched > total) matched = total;
  var coverage = total > 0 ? matched / total : 0;
  var gap = Math.max(0, total - matched);
  var band = coverage >= 0.85 ? 'Excellent' : coverage >= 0.60 ? 'Good' : coverage >= 0.40 ? 'Warning' : 'Critical';
  var emoji = coverage >= 0.85 ? '🟢' : coverage >= 0.60 ? '🟡' : coverage >= 0.40 ? '🟠' : '🔴';
  var altCoverage = 0.85;
  var altMatched = altCoverage * total;
  var lift = altMatched - matched;
  var atCost24 = lift * 24;
  var needArticles = articles > 0 ? Math.ceil((total * 0.85 - matched) / (total / articles)) : 0;
  return [
    '🩺 KB Coverage Health: ' + emoji + ' ' + band + ' (' + (coverage*100).toFixed(1) + '% coverage · ' + gap.toLocaleString() + ' tickets/mo without KB)',
    '📊 Snapshot: ' + matched.toLocaleString() + ' of ' + total.toLocaleString() + ' tickets matched (' + (coverage*100).toFixed(1) + '%) · ' + articles.toLocaleString() + ' articles in KB',
    '🔄 What-If: if coverage climbs to 85% (Excellent), ~' + Math.round(lift).toLocaleString() + ' more tickets/mo find KB (at ~$24/ticket = ~$' + Math.round(atCost24).toLocaleString() + '/mo saved)',
    '⚖️ Break-Even: to hit ≥85% (Excellent), need ~' + Math.round(lift).toLocaleString() + ' more matched tickets OR ~' + needArticles + ' net new articles',
    '🎯 Milestone: re-audit gap quarterly — product launches add 50-100 new ticket topics',
    '💡 Tip: tickets without KB match = KB candidate list. Run this monthly and feed gaps to writers. Pair with our [Deflection Rate Calculator] (P12-5) to project $ impact.',
  ];
}`,
  },
  generate(inputs) {
    const total = Number(inputs.monthly_tickets) || 0;
    const matched = Math.min(Number(inputs.tickets_with_kb_match) || 0, total);
    const articles = Number(inputs.total_articles) || 0;
    const coverage = coverageRate(matched, total);
    const gap = gapTickets(matched, total);
    const band = calcHealthBand(coverage);
    const bandInfo = HEALTH_BANDS[band];
    const altCoverage = HEALTH_BANDS.excellent.threshold;
    const altMatched = altCoverage * total;
    const lift = Math.max(0, altMatched - matched);
    const atCost24 = lift * 24;
    const needArticles = articles > 0 ? Math.ceil(Math.max(0, total * altCoverage - matched) / Math.max(1, total / articles)) : 0;
    return [
      '🩺 KB Coverage Health: ' + bandInfo.label + ' (' + fmtPct(coverage) + ' coverage · ' + fmtInt(gap) + ' tickets/mo without KB)',
      '📊 Snapshot: ' + fmtInt(matched) + ' of ' + fmtInt(total) + ' tickets matched (' + fmtPct(coverage) + ') · ' + fmtInt(articles) + ' articles in KB',
      '🔄 What-If: if coverage climbs to ' + fmtPct(altCoverage) + ' (Excellent), ~' + fmtInt(lift) + ' more tickets/mo find KB (at ~$24/ticket = ~$' + fmtInt(atCost24) + '/mo saved)',
      '⚖️ Break-Even: to hit ' + fmtPct(HEALTH_BANDS.excellent.threshold) + ' (Excellent), need ~' + fmtInt(lift) + ' more matched tickets OR ~' + needArticles + ' net new articles',
      '🎯 Milestone: re-audit gap quarterly — product launches add 50-100 new ticket topics',
      '💡 Tip: tickets without KB match = KB candidate list. Run this monthly and feed gaps to writers. Pair with our [Deflection Rate Calculator] (P12-5) to project $ impact.',
    ];
  },
  staticExamples: [
    '🩺 KB Coverage Health: Good (70.0% coverage · 1,500 tickets/mo without KB)\n📊 Snapshot: 3,500 of 5,000 tickets matched (70.0%) · 500 articles in KB\n🔄 What-If: if coverage climbs to 85.0% (Excellent), ~750 more tickets/mo find KB (at ~$24/ticket = ~$18,000/mo saved)\n⚖️ Break-Even: to hit 85.0% (Excellent), need ~750 more matched tickets OR ~150 net new articles\n🎯 Milestone: re-audit gap quarterly — product launches add 50-100 new ticket topics\n💡 Tip: tickets without KB match = KB candidate list. Run this monthly and feed gaps to writers. Pair with our [Deflection Rate Calculator] (P12-5) to project $ impact.',
  ],
  faq: [
    { q: 'What is KB coverage rate?', a: 'Coverage rate = (tickets with a matching KB article) / (total inbound tickets). It measures the breadth of your KB content vs. the real questions customers ask. TSIA 2024 reports mid-market B2B SaaS at 50-75% coverage; >85% indicates a mature KB.' },
    { q: 'How do I measure "ticket has a KB match"?', a: 'Most helpdesks (Zendesk, Intercom, Freshdesk) tag deflected tickets or log KB-article clicks before ticket creation. If untracked, you can manually sample 100 tickets monthly and check whether a matching article exists.' },
    { q: 'Does article quality matter?', a: 'No — coverage only counts article existence, not quality. Quality is measured separately by K-6 Article Helpfulness. A low-coverage KB can still have high-quality articles, but the volume of deflected tickets will be capped by the article count.' },
    { q: 'How does this pair with P12-5 Deflection?', a: 'P12-5 measures % of tickets deflected via KB/chatbot (downstream outcome). K-1 Coverage measures the upstream input (how many tickets HAVE a matching article). Low coverage caps deflection potential — fix K-1 to enable P12-5 to scale.' },
    { q: 'What is the industry_benchmark select for?', a: 'It is informational only (tooltip reference). Different verticals have different coverage expectations — FinTech and HealthTech typically run 60-70% (regulated/complex products) while SaaS runs 65-80%. The band thresholds are stable across all verticals.' },
    { q: 'Why does K-1 use 4 inputs when other calcs use 5?', a: 'K-1 is the simplest KB upstream metric — coverage is a single ratio. industry_benchmark is informational only (does not change math), total_articles supports Break-Even calc. K-2 through K-6 add complexity (freshness, search, quality).' },
  ],
  howToUse: [
    'Enter monthly inbound tickets — pull from your helpdesk platform (Zendesk, Intercom, Freshdesk).',
    'Enter tickets with a matching KB article (deflected + ticket-with-suggestion) — most platforms tag this automatically.',
    'Enter total KB articles — admin count from your KB platform.',
    'Read the coverage rate band — 🟢 Excellent ≥85% · 🟡 Good 60-85% · 🟠 Warning 40-60% · 🔴 Critical <40%.',
    'Use the Snapshot line to identify gap_tickets (= articles needed) and feed to writers as a monthly backlog.',
  ],
  sources: [
    'https://www.tsia.com/blog/knowledge-management-benchmark',
    'https://www.zendesk.com/customer-experience-trends/',
    'https://www.gartner.com/en/customer-service-support',
    'https://www.nngroup.com/articles/help-and-documentation/',
  ],
};
registerEngine(engine);
```

Save to: `src/engines/knowledge/kb-coverage-rate-calculator.ts`

- [ ] **Step 2: Verify engine parses (P12-1 lesson: parse-blocker prevention)**

Run: `node -e "require('./src/engines/knowledge/kb-coverage-rate-calculator.ts')" 2>&1 | head -5`
Expected: no syntax errors. May show TS warnings (P10/P11 lesson: warnings tolerated, exit 0).

- [ ] **Step 3: Append import to `src/engines/knowledge/index.ts`**

Add line at the bottom (after `export {};`):

```ts
export {};
import './kb-coverage-rate-calculator';
```

Wait — `export {};` must stay last in a module that is also imported as side-effect-only. Reorder: move comment block + `export {};` to top, put import BELOW the comment. Final file:

```ts
// Knowledge/Documentation Calculator Engines (P13 batch, 6 calcs)
//
// P13-1: kb-coverage-rate          — KB Coverage Rate
// P13-2: article-freshness         — Article Freshness (Task 3)
// P13-3: search-effectiveness      — Search Effectiveness (Task 4)
// P13-4: deflection-quality        — Deflection Quality (Task 5)
// P13-5: documentation-roi         — Documentation ROI (Task 6)
// P13-6: article-helpfulness       — Article Helpfulness Score (Task 7)
//
// Engines are added one per task via Task 2..Task 7.
import './kb-coverage-rate-calculator';
export {};
```

- [ ] **Step 4: Append ToolMeta entry to `src/data/tools/knowledge.ts`**

Add (before `];`):

```ts
  {
    slug: 'solopreneur-kb-coverage-rate-calculator',
    title: 'KB Coverage Rate',
    description:
      'Measure what % of inbound support tickets have a matching KB article. HIGHER health bands — more coverage = better self-service: 🟢 ≥85% · 🟡 60-85% · 🟠 40-60% · 🔴 <40%. For mid-market B2B SaaS ($10M-$50M ARR) DevRel Leads, Documentation Managers, and Technical Writers.',
    categoryId: 'K',
    applicationCategory: 'BusinessApplication',
    inputs: [
      { name: 'monthly_tickets',         label: 'Monthly inbound tickets',  placeholder: 'e.g. 5000', type: 'number' },
      { name: 'tickets_with_kb_match',   label: 'Tickets with KB match',   placeholder: 'e.g. 3500', type: 'number' },
      { name: 'total_articles',          label: 'Total KB articles',       placeholder: 'e.g. 500',  type: 'number' },
      { name: 'industry_benchmark',      label: 'Industry',                placeholder: 'SaaS',      type: 'select', options: ['SaaS', 'FinTech', 'HealthTech', 'eCommerce'] },
    ],
    keywords: [
      'kb coverage',
      'kb coverage rate',
      'knowledge base coverage',
      'article coverage',
      'kb gap',
      'support ticket matching',
      'tsia knowledge management',
      'zendesk knowledge',
      'mid-market saas documentation',
    ],
    tags: ['knowledge', 'kb', 'coverage'],
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-07-12',
    sources: [
      'https://www.tsia.com/blog/knowledge-management-benchmark',
      'https://www.zendesk.com/customer-experience-trends/',
      'https://www.nngroup.com/articles/help-and-documentation/',
    ],
  },
```

Verify: `grep -c "solopreneur-kb-coverage-rate-calculator" src/data/tools/knowledge.ts` → expect `1`

- [ ] **Step 5: Append OG entry to `src/data/og-samples.json`**

Find the closing `}` (last entry is `solopreneur-support-capacity-planning-calculator`). Before `}` (i.e. comma after previous entry's `}`), append:

```json
  ,
  "solopreneur-kb-coverage-rate-calculator": {
    "headline": {
      "en": "70.0%",
      "zh": "70.0%"
    },
    "headlineUnit": {
      "en": "KB coverage",
      "zh": "知识库覆盖率"
    },
    "headlineLabel": {
      "en": "KB Coverage: 70% — Good, 1,500 tickets/mo without KB match",
      "zh": "知识库覆盖 70% — 良好，1500 张工单/月无 KB 匹配"
    },
    "trend": {
      "en": "30% gap = ~150 articles needed",
      "zh": "30% 缺口 ≈ 需补 150 篇"
    }
  }
```

Verify: `node -e "JSON.parse(require('fs').readFileSync('src/data/og-samples.json','utf8'))['solopreneur-kb-coverage-rate-calculator']"` → expect JSON parse + object returned.

- [ ] **Step 6: Append ENGINES entry to `scripts/codegen-examples.mjs`**

Find the ENGINES array. Add (preserving array structure):

```js
  { file: 'kb-coverage-rate-calculator', slug: 'solopreneur-kb-coverage-rate-calculator', subdir: 'knowledge', defaultInputs: { monthly_tickets: 5000, tickets_with_kb_match: 3500, total_articles: 500, industry_benchmark: 'SaaS' } },
```

Then run codegen to verify it regenerates `staticExamples[0]` correctly:

```bash
node scripts/codegen-examples.mjs
```

Expected: 87/87 PASS (after K-1 added; previous count was 86/86).

Verify with: `node scripts/codegen-examples.mjs --check` → expect 87/87 PASS exit 0.

- [ ] **Step 7: Bump `tests/ab-split.test.ts` engines count 86 → 87 + tools count 86 → 87**

Find:
```ts
test('getAllEngines() returns 86 engines after import', async () => {
  await import('../src/engines/index.ts');
  const { getAllEngines } = await import('../src/core/engines/registry.ts');
  assert.equal(getAllEngines().length, 86);
});

test('aggregated tools array has 86 entries', async () => {
  const { tools } = await import('../src/data/tools/index.ts');
  assert.equal(tools.length, 86);
});
```

Change both 86 → 87.

- [ ] **Step 8: Bump `tests/internal-links.test.ts` 86 → 87**

Find:
```ts
test('all 82 tools have relatedTools entry', () => {
  assert.equal(Object.keys(relatedTools).length, 86);
```

Change the comment `82` → `83` (cosmetic only) AND the count 86 → 87.

- [ ] **Step 9: Create `tests/kb-coverage-rate-calculator.test.ts`**

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { coverageRate, gapTickets, calcHealthBand, HEALTH_BANDS } from '../src/engines/knowledge/kb-coverage-rate-calculator.ts';

test('coverageRate: 3500/5000 = 0.70', () => {
  assert.equal(coverageRate(3500, 5000), 0.7);
});

test('coverageRate: zero divisor guard → 0', () => {
  assert.equal(coverageRate(0, 0), 0);
});

test('coverageRate: 0/5000 = 0', () => {
  assert.equal(coverageRate(0, 5000), 0);
});

test('coverageRate: 5000/5000 = 1.0', () => {
  assert.equal(coverageRate(5000, 5000), 1.0);
});

test('gapTickets: matched=3500, total=5000 → 1500', () => {
  assert.equal(gapTickets(3500, 5000), 1500);
});

test('gapTickets: matched=5000, total=5000 → 0', () => {
  assert.equal(gapTickets(5000, 5000), 0);
});

test('calcHealthBand: 0.85 → excellent (≥85%)', () => {
  assert.equal(calcHealthBand(0.85), 'excellent');
});

test('calcHealthBand: 0.70 → good (60-85%)', () => {
  assert.equal(calcHealthBand(0.70), 'good');
});

test('calcHealthBand: 0.45 → warning (40-60%)', () => {
  assert.equal(calcHealthBand(0.45), 'warning');
});

test('calcHealthBand: 0.30 → critical (<40%)', () => {
  assert.equal(calcHealthBand(0.30), 'critical');
});

test('calcHealthBand: 0.60 exact boundary → good', () => {
  assert.equal(calcHealthBand(0.60), 'good');
});

test('HEALTH_BANDS has 4 bands with locked thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 0.85);
  assert.equal(HEALTH_BANDS.good.threshold, 0.60);
  assert.equal(HEALTH_BANDS.warning.threshold, 0.40);
  assert.equal(HEALTH_BANDS.critical.threshold, -Infinity);
});
```

12 tests total. Save to: `tests/kb-coverage-rate-calculator.test.ts`

- [ ] **Step 10: Run pnpm check**

Run: `pnpm check`
Expected: PASS (0 errors). All 87 engines + 12 new tests added; total tests bump ~763 → ~775.

- [ ] **Step 11: Commit**

```bash
git add src/engines/knowledge/kb-coverage-rate-calculator.ts src/engines/knowledge/index.ts src/data/tools/knowledge.ts src/data/og-samples.json scripts/codegen-examples.mjs tests/ab-split.test.ts tests/internal-links.test.ts tests/kb-coverage-rate-calculator.test.ts
git commit -m "feat(p13-1): kb coverage rate (12 tests, 6-section v3, 86→87 engines, NEW 'K' category)"
git push origin HEAD && git push github HEAD
```

After push, write memory file `~/.claude/projects/.../memory/p13-1-kb-coverage-rate-shipped.md` with key facts (canonical inputs, band thresholds, cross-link to P12-5, lessons).

---

### Task 3: P13-2 Article Freshness [MECHANICAL]

**Files:**
- Create: `src/engines/knowledge/article-freshness-calculator.ts`
- Modify: `src/engines/knowledge/index.ts` (append import)
- Modify: `src/data/tools/knowledge.ts` (append entry)
- Modify: `src/data/og-samples.json` (append entry)
- Modify: `scripts/codegen-examples.mjs` (append ENGINES entry)
- Modify: `tests/ab-split.test.ts` (87→88 ×2)
- Modify: `tests/internal-links.test.ts` (87→88)
- Create: `tests/article-freshness-calculator.test.ts`
- Memory after ship: `p13-2-article-freshness-shipped.md`

**Inputs (4):** `total_articles` (number), `articles_updated_12mo` (number), `articles_updated_6mo` (number), `target_freshness_pct` (number, %)

**Math:**
- `fresh_rate_12mo = articles_updated_12mo / total_articles`
- `fresh_rate_6mo = articles_updated_6mo / total_articles`
- `stale_rate = 1 - fresh_rate_12mo`
- `stale_count = total_articles - articles_updated_12mo`
- `gap_pct = target_freshness_pct - (fresh_rate_12mo * 100)`

**HEALTH_BANDS (HIGHER on fresh_rate_12mo; critical -Infinity):**
- excellent ≥0.80 · good ≥0.55 · warning ≥0.40 · critical <0.40

**Canonical:** total=500, updated_12mo=325, updated_6mo=200, target=70% → 65% fresh (🟡 Good), 35% stale = 175 articles, 5pp gap.

- [ ] **Step 1: Write `src/engines/knowledge/article-freshness-calculator.ts`**

Mirror the Task 2 K-1 file structure (imports, HEALTH_BANDS const, exported helpers, calcHealthBand, engine object with 6 sections, faq, howToUse, sources, registerEngine). Use the math + inputs above. Wrap customFn minified JS reference Task 2 — re-use the same template pattern (input reads → 4-band ternary → 6 string lines with emoji). Generate uses `fresh_rate_12mo` as the band driver.

```ts
// P13-2 Article Freshness
// 6-section v3 Business template.
//
// Mid-market B2B SaaS DevRel/Tech Writer persona ($10M-$50M ARR).
// Community-wisdom thresholds (NN/g + TSIA Knowledge-Centered Service 2024 + Intercom Help Center Best Practices).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

export const HEALTH_BANDS = {
  excellent: { threshold: 0.80, label: 'Excellent', message: 'Fresh KB — most articles reviewed recently.' },
  good:      { threshold: 0.55, label: 'Good',      message: 'Healthy review cadence.' },
  warning:   { threshold: 0.40, label: 'Warning',   message: 'Stale content creeping in.' },
  critical:  { threshold: -Infinity, label: 'Critical', message: 'KB content outdated.' },
};

export function freshRate12mo(updated: number, total: number): number {
  return total > 0 ? updated / total : 0;
}

export function staleCount(updated: number, total: number): number {
  return Math.max(0, total - updated);
}

export function calcHealthBand(fresh: number): keyof typeof HEALTH_BANDS {
  if (fresh >= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (fresh >= HEALTH_BANDS.good.threshold) return 'good';
  if (fresh >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtPct(x: number): string { return (x * 100).toFixed(1) + '%'; }
function fmtInt(x: number): string { return Math.round(x).toLocaleString(); }

const engine: ToolEngine = {
  slug: 'solopreneur-article-freshness-calculator',
  title: 'Article Freshness',
  description:
    'Measure what % of KB articles are fresh (updated in last 12 months). HIGHER health bands — fresher content = better accuracy: 🟢 ≥80% · 🟡 55-80% · 🟠 40-55% · 🔴 <40%. For mid-market B2B SaaS ($10M-$50M ARR) DevRel Leads and Technical Writers.',
  inputs: [
    { name: 'total_articles',        label: 'Total KB articles',          placeholder: 'e.g. 500', type: 'number' },
    { name: 'articles_updated_12mo', label: 'Articles updated in 12mo',   placeholder: 'e.g. 325', type: 'number' },
    { name: 'articles_updated_6mo',  label: 'Articles updated in 6mo',    placeholder: 'e.g. 200', type: 'number' },
    { name: 'target_freshness_pct',  label: 'Internal freshness target (%)', placeholder: 'e.g. 70', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `function run(inputs, pick, fill) {
  var total = Number(inputs.total_articles) || 0;
  var up12 = Number(inputs.articles_updated_12mo) || 0;
  var up6 = Number(inputs.articles_updated_6mo) || 0;
  var target = Number(inputs.target_freshness_pct) || 0;
  if (up12 > total) up12 = total;
  if (up6 > up12) up6 = up12;
  var fresh12 = total > 0 ? up12 / total : 0;
  var fresh6 = total > 0 ? up6 / total : 0;
  var stale = Math.max(0, total - up12);
  var band = fresh12 >= 0.80 ? 'Excellent' : fresh12 >= 0.55 ? 'Good' : fresh12 >= 0.40 ? 'Warning' : 'Critical';
  var emoji = fresh12 >= 0.80 ? '🟢' : fresh12 >= 0.55 ? '🟡' : fresh12 >= 0.40 ? '🟠' : '🔴';
  var altFresh = 0.80;
  var lift = Math.max(0, altFresh * total - up12);
  var cadence = lift > 0 ? Math.ceil(lift / 10) : 0;
  var monthsAt10 = cadence > 0 ? Math.ceil(lift / 10) : 0;
  return [
    '🩺 Article Freshness Health: ' + emoji + ' ' + band + ' (' + (fresh12*100).toFixed(1) + '% fresh in 12mo · ' + stale.toLocaleString() + ' stale)',
    '📊 Snapshot: ' + up12.toLocaleString() + '/' + total.toLocaleString() + ' updated 12mo · ' + up6.toLocaleString() + '/' + total.toLocaleString() + ' updated 6mo · ' + stale.toLocaleString() + ' stale · target ' + target + '% (' + Math.abs(target - fresh12*100).toFixed(1) + 'pp gap)',
    '🔄 What-If: if 12mo freshness climbs to 80% (Excellent), ' + Math.round(lift).toLocaleString() + ' more articles reviewed (~10/mo cadence)',
    '⚖️ Break-Even: to hit ≥80% (Excellent), need ' + Math.round(lift).toLocaleString() + ' more articles reviewed; at 10/mo cadence = ~' + monthsAt10 + ' months',
    '🎯 Milestone: audit stale articles quarterly — products that change >2x/year need reviews every 6mo',
    '💡 Tip: stale articles are the silent killer — ' + (stale*100/Math.max(1,total)).toFixed(0) + '% of KB has wrong info customers act on. Tag with last-reviewed date. Pair with [Deflection Quality] (K-4) — fresh articles drive lower reopen.',
  ];
}`,
  },
  generate(inputs) {
    const total = Number(inputs.total_articles) || 0;
    const up12 = Math.min(Number(inputs.articles_updated_12mo) || 0, total);
    const up6 = Math.min(Number(inputs.articles_updated_6mo) || 0, up12);
    const targetPct = Number(inputs.target_freshness_pct) || 0;
    const fresh12 = freshRate12mo(up12, total);
    const fresh6 = total > 0 ? up6 / total : 0;
    const stale = staleCount(up12, total);
    const band = calcHealthBand(fresh12);
    const bandInfo = HEALTH_BANDS[band];
    const altFresh = HEALTH_BANDS.excellent.threshold;
    const lift = Math.max(0, altFresh * total - up12);
    const monthsAt10 = lift > 0 ? Math.ceil(lift / 10) : 0;
    const gapPct = targetPct - fresh12 * 100;
    return [
      '🩺 Article Freshness Health: ' + bandInfo.label + ' (' + fmtPct(fresh12) + ' fresh in 12mo · ' + fmtInt(stale) + ' stale)',
      '📊 Snapshot: ' + fmtInt(up12) + '/' + fmtInt(total) + ' updated 12mo · ' + fmtInt(up6) + '/' + fmtInt(total) + ' updated 6mo · ' + fmtInt(stale) + ' stale · target ' + targetPct + '% (' + (gapPct >= 0 ? '+' : '') + gapPct.toFixed(1) + 'pp gap)',
      '🔄 What-If: if 12mo freshness climbs to ' + fmtPct(altFresh) + ' (Excellent), ' + fmtInt(lift) + ' more articles reviewed (~10/mo cadence)',
      '⚖️ Break-Even: to hit ' + fmtPct(HEALTH_BANDS.excellent.threshold) + ' (Excellent), need ' + fmtInt(lift) + ' more articles reviewed; at 10/mo cadence = ~' + monthsAt10 + ' months',
      '🎯 Milestone: audit stale articles quarterly — products that change >2x/year need reviews every 6mo',
      '💡 Tip: stale articles are the silent killer — ' + Math.round(stale * 100 / Math.max(1, total)) + '% of KB has wrong info customers act on. Tag with last-reviewed date. Pair with [Deflection Quality] (K-4) — fresh articles drive lower reopen.',
    ];
  },
  staticExamples: [
    '🩺 Article Freshness Health: Good (65.0% fresh in 12mo · 175 stale)\n📊 Snapshot: 325/500 updated 12mo · 200/500 updated 6mo · 175 stale · target 70% (-5.0pp gap)\n🔄 What-If: if 12mo freshness climbs to 80.0% (Excellent), 75 more articles reviewed (~10/mo cadence)\n⚖️ Break-Even: to hit 80.0% (Excellent), need 75 more articles reviewed; at 10/mo cadence = ~8 months\n🎯 Milestone: audit stale articles quarterly — products that change >2x/year need reviews every 6mo\n💡 Tip: stale articles are the silent killer — 35% of KB has wrong info customers act on. Tag with last-reviewed date. Pair with [Deflection Quality] (K-4) — fresh articles drive lower reopen.',
  ],
  faq: [
    { q: 'What is "article freshness"?', a: 'The % of KB articles updated within the last 12 months. Stale articles contain outdated steps, screenshots, or product behavior — customers following them hit dead ends and reopen tickets. NN/g recommends 70%+ as the mature target.' },
    { q: 'Why 12mo, not 6mo?', a: '12mo is the industry-standard review window (NN/g + Intercom Help Center). 6mo is a secondary cadence metric — useful for fast-moving products. The health band is driven by the 12mo figure to avoid penalizing stable products.' },
    { q: 'How do I track last-updated?', a: 'Most KB platforms (Document360, Zendesk Guide, Intercom Articles) auto-track last-updated date. If manual, add a "Last reviewed: YYYY-MM-DD" footer discipline. Set a 12mo reminder cron for the review queue.' },
    { q: 'Does this pair with K-4 Deflection Quality?', a: 'Yes — K-4 measures ticket reopen rate (proxy for content quality). Stale articles (low K-2) cause reopen spikes. Audit stale FIRST when K-4 reopens climb.' },
    { q: 'What if my product changes monthly?', a: 'Aim for 6mo cadence instead of 12mo. Track both rates (12mo is the band driver; 6mo is informational). If 6mo drops below 12mo × 0.5, your editorial review backlog is the bottleneck.' },
    { q: 'Why does K-2 use `gap_pct` instead of an absolute target band?', a: 'Target is customer-set (varies by company maturity). The 4 health bands are HARD thresholds (≥80/55/40%) — gap_pct is informational only, shown in Snapshot. This matches P9-5 customer-health-score pattern.' },
  ],
  howToUse: [
    'Enter total KB articles and last-12mo / last-6mo updated counts from your KB admin dashboard.',
    'Enter your internal freshness target % (default: 70%).',
    'Read the 12mo fresh rate band — 🟢 Excellent ≥80% · 🟡 Good 55-80% · 🟠 Warning 40-55% · 🔴 Critical <40%.',
    'Use the Snapshot to compute stale_count = (articles needed) and feed to writers.',
    'Pair with K-4 Deflection Quality (P12-5 / batch partner) to prioritize WHICH stale articles to refresh.',
  ],
  sources: [
    'https://www.nngroup.com/articles/help-and-documentation/',
    'https://www.tsia.com/blog/knowledge-centered-service',
    'https://www.intercom.com/help/articles/what-is-help-center-best-practices',
    'https://www.gartner.com/en/customer-service-support',
  ],
};
registerEngine(engine);
```

- [ ] **Step 2-9:** Follow Task 2 Step 2-11 pattern (verify parse → append barrel import → append ToolMeta entry to knowledge.ts with `categoryId: 'K'` → append OG entry → append codegen ENGINES entry → bump ab-split 87→88 ×2 → bump internal-links 87→88 → create test file → run `pnpm check` → commit with conventional message + dual push).

Test file `tests/article-freshness-calculator.test.ts`: 11 tests covering math (freshRate12mo normal/zero divisor, staleCount normal/zero), 5 health band boundaries (0.80/0.55/0.40/0.30/0.65), HEALTH_BANDS structure (4 bands, locked thresholds including -Infinity critical).

- [ ] **Step 10: Commit**

```bash
git add src/engines/knowledge/article-freshness-calculator.ts src/engines/knowledge/index.ts src/data/tools/knowledge.ts src/data/og-samples.json scripts/codegen-examples.mjs tests/ab-split.test.ts tests/internal-links.test.ts tests/article-freshness-calculator.test.ts
git commit -m "feat(p13-2): article freshness (11 tests, 6-section v3, 87→88 engines, 12mo + 6mo cadence)"
git push origin HEAD && git push github HEAD
```

---

### Task 4: P13-3 Search Effectiveness (composite CTR + no-result) [INTEGRATION]

**Files:** Same 8-file wiring pattern as Task 3. Memory: `p13-3-search-effectiveness-shipped.md` after ship.

**Inputs (4):** `total_searches` (number), `searches_with_click` (number), `searches_no_result` (number), `industry_benchmark` (select: B2B SaaS / Consumer)

**Math:**
- `ctr_pct = (searches_with_click / total_searches) * 100`
- `no_result_pct = (searches_no_result / total_searches) * 100`

**HEALTH_BANDS (composite — CTR AND no-result dual-threshold; critical triggered when EITHER fails):**
- excellent: CTR ≥85% AND no-result ≤5%
- good: CTR ≥70% AND no-result ≤10%
- warning: CTR ≥55% AND no-result ≤20%
- critical: CTR <55% OR no-result >20%

**Important:** `calcHealthBand` takes TWO args: `calcHealthBand(ctrPct, noResultPct)` — convert percentages to decimals `(ctr/100, noResult/100)` before calling. The composite band triggers critical if EITHER condition fails, so use:

```ts
export function calcHealthBand(ctr: number, noResult: number): keyof typeof HEALTH_BANDS {
  if (ctr >= 0.85 && noResult <= 0.05) return 'excellent';
  if (ctr >= 0.70 && noResult <= 0.10) return 'good';
  if (ctr >= 0.55 && noResult <= 0.20) return 'warning';
  return 'critical';
}
```

Note: 0.05 / 0.10 / 0.20 are inverse thresholds — `no_result ≤ X` (lower is better). Edge case: if ctr=0.85 exactly AND noResult=0.05 exactly, band = excellent (exact boundary passes). If ctr=0.85 BUT noResult=0.06 → critical.

**Canonical:** total=12000, with_click=9000, no_result=960, industry='B2B SaaS' → CTR 75% · no-result 8% → 🟡 Good (75≥70 AND 8≤10).

- [ ] **Step 1: Write `src/engines/knowledge/search-effectiveness-calculator.ts`**

Mirror K-1 file structure with key differences:
- `inputs[3].type = 'select'` for `industry_benchmark` with options `['B2B SaaS', 'Consumer']`
- `calcHealthBand` takes 2 args; `generate(inputs)` calls it with `(ctrPct/100, noResultPct/100)`
- 6-section copy reflects dual-metric snapshot
- What-If math: "If CTR climbs to 85% (Excellent) at same no-result, **1,200 more searches find answers → at ~50% click-to-ticket-prevention rate, ~600 fewer tickets/mo**" — this is the per-spec fix from self-review (no longer hand-wavy)
- Tip references K-1 Coverage Rate (no-result queries are gap indicator)
- Break-Even: "need CTR ≥85% (1,200 more clicks) OR no-result ≤5% (360 fewer no-result searches)"

customFn minified JS follows same ternary-if-ladder pattern as K-1, but with dual thresholds:

```js
customFn: `function run(inputs, pick, fill) {
  var total = Number(inputs.total_searches) || 0;
  var withClick = Number(inputs.searches_with_click) || 0;
  var noRes = Number(inputs.searches_no_result) || 0;
  if (withClick > total) withClick = total;
  if (noRes > total) noRes = total;
  var ctr = total > 0 ? withClick / total : 0;
  var noResultPct = total > 0 ? noRes / total : 0;
  var band = (ctr >= 0.85 && noResultPct <= 0.05) ? 'Excellent' : (ctr >= 0.70 && noResultPct <= 0.10) ? 'Good' : (ctr >= 0.55 && noResultPct <= 0.20) ? 'Warning' : 'Critical';
  var emoji = (ctr >= 0.85 && noResultPct <= 0.05) ? '🟢' : (ctr >= 0.70 && noResultPct <= 0.10) ? '🟡' : (ctr >= 0.55 && noResultPct <= 0.20) ? '🟠' : '🔴';
  var altCtr = 0.85;
  var lift = Math.max(0, altCtr * total - withClick);
  var fewerTickets = lift * 0.5;
  var noResLift = Math.max(0, 0.05 * total - noRes);
  return [
    '🩺 Search Effectiveness Health: ' + emoji + ' ' + band + ' (CTR ' + (ctr*100).toFixed(1) + '% / no-result ' + (noResultPct*100).toFixed(1) + '%)',
    '📊 Snapshot: ' + total.toLocaleString() + ' searches/mo · ' + withClick.toLocaleString() + ' with click (' + (ctr*100).toFixed(1) + '% CTR) · ' + noRes.toLocaleString() + ' no-result (' + (noResultPct*100).toFixed(1) + '%) · ' + (total - withClick - noRes).toLocaleString() + ' abandoned/dwell',
    '🔄 What-If: if CTR climbs to 85% (Excellent), ' + Math.round(lift).toLocaleString() + ' more searches find answers → at ~50% click-to-ticket-prevention rate, ~' + Math.round(fewerTickets).toLocaleString() + ' fewer tickets/mo',
    '⚖️ Break-Even: to hit Excellent (CTR ≥85% AND no-result ≤5%), need ' + Math.round(lift).toLocaleString() + ' more clicks OR ' + Math.round(noResLift).toLocaleString() + ' fewer no-result searches',
    '🎯 Milestone: search "pogo-sticking" (search → click → back to search) is the #1 KB UX failure — track per query weekly',
    '💡 Tip: no-result >15% means content gaps OR bad search synonyms — run [KB Coverage Rate] (K-1) on top no-result queries.',
  ];
}`,
```

Special canonical for staticExamples[0]: `total=12000, with_click=9000, no_result=960` → `ctr=75%`, `noResultPct=8%`, `band='Good'`. Verify with `node scripts/codegen-examples.mjs` after engine write.

- [ ] **Step 2-9:** Follow Task 2/3 pattern. Test file `tests/search-effectiveness-calculator.test.ts`: 13 tests covering math (ctr/noResult normal/zero divisor), 6 composite band boundary tests (excellent/good/warning/critical triggers, exact boundaries, dual-fail case), HEALTH_BANDS structure.

**Dual-fail boundary test (critical only):** `ctr=0.50, noResult=0.07` → critical (both fail — but the OR semantics means critical the moment EITHER fails, no need to test dual-fail separately from single-fail).

- [ ] **Step 10: Commit**

```bash
git add src/engines/knowledge/search-effectiveness-calculator.ts src/engines/knowledge/index.ts src/data/tools/knowledge.ts src/data/og-samples.json scripts/codegen-examples.mjs tests/ab-split.test.ts tests/internal-links.test.ts tests/search-effectiveness-calculator.test.ts
git commit -m "feat(p13-3): search effectiveness (13 tests, 6-section v3, 88→89 engines, composite CTR + no-result AND-band)"
git push origin HEAD && git push github HEAD
```

---

### Task 5: P13-4 Deflection Quality (INVERSE on reopen rate) [MECHANICAL]

**Files:** Standard 8-file wiring. Memory: `p13-4-deflection-quality-shipped.md`.

**Inputs (4):** `tickets_deflected_30d` (number), `tickets_reopened_30d` (number), `target_quality_pct` (number, %), `deflection_source` (select: KB / Chatbot / Both)

**Math:**
- `reopen_rate_pct = (tickets_reopened_30d / tickets_deflected_30d) * 100`
- `quality_pct = 100 - reopen_rate_pct`
- `gap_pct = target_quality_pct - quality_pct`

**HEALTH_BANDS (INVERSE on reopen_rate; critical Infinity):**
- excellent: reopen ≤ 8% (quality ≥ 92%)
- good: reopen ≤ 15% (quality ≥ 85%)
- warning: reopen ≤ 25% (quality ≥ 75%)
- critical: reopen > 25%

Note critical threshold uses Infinity (P9-4 + P12-1 lesson). The reopen_pct values 8/15/25 are upper thresholds (lower reopen = better). Implementation:

```ts
export const HEALTH_BANDS = {
  excellent: { threshold: 0.08, label: 'Excellent', message: 'KB content solving customer problems.' },
  good:      { threshold: 0.15, label: 'Good',      message: 'Most deflected tickets stay solved.' },
  warning:   { threshold: 0.25, label: 'Warning',   message: 'Notable reopen rate — audit top articles.' },
  critical:  { threshold: Infinity, label: 'Critical', message: 'Deflection masking product gaps.' },
};

export function reopenRate(reopened: number, deflected: number): number {
  return deflected > 0 ? reopened / deflected : 0;
}

export function calcHealthBand(reopen: number): keyof typeof HEALTH_BANDS {
  if (reopen <= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (reopen <= HEALTH_BANDS.good.threshold) return 'good';
  if (reopen <= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}
```

**Canonical:** deflected=1750, reopened=210, target=90%, source='Both' → reopen 12% (🟡 Good · ≤15%), quality 88%, 2pp gap.

- [ ] **Step 1: Write engine + boilerplate** (mirror K-1 structure with INVERSE band). customFn ternary: `reopen <= 0.08 ? 'Excellent' : reopen <= 0.15 ? 'Good' : reopen <= 0.25 ? 'Warning' : 'Critical'`.

- [ ] **Step 2-9:** Standard pattern. Test file `tests/deflection-quality-calculator.test.ts`: 10 tests covering math (reopenRate normal/zero divisor), 5 band boundaries (0.08/0.10/0.15/0.20/0.25), HEALTH_BANDS with Infinity critical.

- [ ] **Step 10: Commit**

```bash
git commit -m "feat(p13-4): deflection quality (10 tests, 6-section v3, 89→90 engines, INVERSE reopen band with Infinity critical)"
git push origin HEAD && git push github HEAD
```

---

### Task 6: P13-5 Documentation ROI [MECHANICAL]

**Files:** Standard 8-file wiring. Memory: `p13-5-documentation-roi-shipped.md`.

**Inputs (5):** `kb_team_monthly_cost` (number, $/mo), `deflected_tickets_monthly` (number), `cost_per_ticket` (number, $/ticket), `articles_total` (number), `roi_target_pct` (number, %)

**Math:**
- `gross_savings = deflected_tickets_monthly * cost_per_ticket`
- `net_savings = gross_savings - kb_team_monthly_cost`
- `roi_pct = (net_savings / kb_team_monthly_cost) * 100`
- `cost_per_article_per_month = kb_team_monthly_cost / articles_total`
- `gap_roi_pct = roi_target_pct - roi_pct`

**HEALTH_BANDS (HIGHER on roi_pct; also checks cost_per_article_per_month in excellent band):**
- excellent: ROI ≥ 400% AND cost_per_article_per_month ≤ $50
- good: ROI ≥ 150%
- warning: ROI ≥ 50%
- critical: ROI < 50%

Edge case: when kb_team_monthly_cost is 0, `roi_pct` is Infinity. Guard against div-by-zero by checking kb_cost in calcHealthBand (return 'critical' if kb_cost <= 0). Implementation:

```ts
export const HEALTH_BANDS = {
  excellent: { threshold: 4.0, label: 'Excellent', message: 'KB is a profit center.' },
  good:      { threshold: 1.5, label: 'Good',      message: 'KB pays for itself.' },
  warning:   { threshold: 0.5, label: 'Warning',   message: 'Marginal return — review spend.' },
  critical:  { threshold: -Infinity, label: 'Critical', message: 'KB spend exceeds savings.' },
};

export function grossSavings(deflected: number, costPer: number): number {
  return deflected * costPer;
}

export function netROI(gross: number, kbCost: number): number {
  return kbCost > 0 ? (gross - kbCost) / kbCost : -Infinity;
}

export function costPerArticle(kbCost: number, articles: number): number {
  return articles > 0 ? kbCost / articles : Infinity;
}

export function calcHealthBand(roi: number): keyof typeof HEALTH_BANDS {
  // Convert percentage → decimal for comparison
  const roiDec = roi / 100;
  if (roiDec >= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (roiDec >= HEALTH_BANDS.good.threshold) return 'good';
  if (roiDec >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}
```

Note: thresholds 4.0 / 1.5 / 0.5 = 400% / 150% / 50%. The `excellent` band ALSO requires `cost_per_article_per_month <= $50` — but that is a sub-condition for display only (warning if exceeded but ROI otherwise excellent). The 4-band drives off `roi_pct`.

**Canonical:** kb_cost=15000, deflected=1750, cost_per=24, articles=500, target=500% → gross=42000, net=27000, roi=180% (🟡 Good ≥150%), cost/article=$30.

- [ ] **Step 1: Write engine + boilerplate.** What-If copy: "If deflection climbs to 2,500/mo (+43%, see K-1 Coverage), gross = $60K, net = $45K, ROI = 300% (Excellent)." Tip cross-links K-1.

- [ ] **Step 2-9:** Standard. Test file: 11 tests covering math (gross/net/costPer normal/zero divisor), 5 band boundaries, HEALTH_BANDS.

- [ ] **Step 10: Commit**

```bash
git commit -m "feat(p13-5): documentation roi (11 tests, 6-section v3, 90→91 engines, KB team cost savings formula)"
git push origin HEAD && git push github HEAD
```

---

### Task 7: P13-6 Article Helpfulness Score [MECHANICAL]

**Files:** Standard 8-file wiring. Memory: `p13-6-article-helpfulness-shipped.md`.

**Inputs (5):** `total_article_views` (number), `helpful_votes` (number), `unhelpful_votes` (number), `total_articles` (number), `target_helpful_pct` (number, %)

**Math:**
- `total_votes = helpful_votes + unhelpful_votes`
- `helpful_pct = total_votes > 0 ? (helpful_votes / total_votes) * 100 : null`
- `vote_rate_pct = (total_votes / total_article_views) * 100`
- `gap_pct = target_helpful_pct - helpful_pct`

**HEALTH_BANDS (HIGHER composite on helpful + vote-rate; critical triggered by either failing):**
- excellent: helpful ≥ 85% AND vote_rate ≥ 15%
- good: helpful ≥ 70% AND vote_rate ≥ 8%
- warning: helpful ≥ 55%
- critical: helpful < 55% OR vote_rate < 3%

Implementation:

```ts
export const HEALTH_BANDS = {
  excellent: { threshold1: 0.85, threshold2: 0.15, label: 'Excellent', message: 'Articles helping customers.' },
  good:      { threshold1: 0.70, threshold2: 0.08, label: 'Good',      message: 'Helpful content overall.' },
  warning:   { threshold1: 0.55, label: 'Warning', message: 'Notable unhelpful share — audit bottom-20.' },
  critical:  { threshold: -Infinity, label: 'Critical', message: 'Vote loop broken — improve UI prompt + content.' },
};

export function voteRate(totalVotes: number, views: number): number {
  return views > 0 ? totalVotes / views : 0;
}

export function helpfulPct(helpful: number, unhelpful: number): number {
  const total = helpful + unhelpful;
  return total > 0 ? helpful / total : 0;
}

export function calcHealthBand(helpful: number, voteRate: number): keyof typeof HEALTH_BANDS {
  if (helpful >= HEALTH_BANDS.excellent.threshold1 && voteRate >= HEALTH_BANDS.excellent.threshold2) return 'excellent';
  if (helpful >= HEALTH_BANDS.good.threshold1 && voteRate >= HEALTH_BANDS.good.threshold2) return 'good';
  if (helpful >= HEALTH_BANDS.warning.threshold1) return 'warning';
  return 'critical';
}
```

Note: `critical` uses -Infinity as `threshold` placeholder (informational — band always triggers on `(helpful < 0.55 OR voteRate < 0.03)`). HEALTH_BANDS shape is irregular (excellent/good have threshold1+threshold2; warning/critical different) — this is intentional. P9-5 customer-health-score uses the same pattern.

**Canonical:** views=25000, helpful=2400, unhelpful=700, articles=500, target=75% → total_votes=3100, helpful=77.4%, vote_rate=12.4% → 🟡 Good (≥70% AND ≥8%).

- [ ] **Step 1: Write engine + boilerplate.** What-If copy: "If helpful climbs to 85% (Excellent) at same vote-rate, ~235 more 👍 votes/mo — usually = rewrite top-20 unhelpful articles."

- [ ] **Step 2-9:** Standard. Test file: 12 tests covering math (helpfulPct/voteRate normal/zero divisor), 5 band boundaries (excellent/good/warning/critical with varying voteRate), HEALTH_BANDS structure.

- [ ] **Step 10: Commit**

```bash
git commit -m "feat(p13-6): article helpfulness score (12 tests, 6-section v3, 91→92 engines, helpful + vote-rate AND-band, final batch bump)"
git push origin HEAD && git push github HEAD
```

---

### Task 8: P13-7 Holistic review + series memory [INTEGRATION]

**Files:**
- Memory: `~/.claude/projects/.../memory/p13-series-shipped.md` (NEW)
- Memory: `~/.claude/projects/.../memory/MEMORY.md` (append 1 line per calc + 1 series line)
- Repo: `memory/p13-series-shipped.md` (mirror to repo per P-series pattern)
- Repo: `memory/p13-1-kb-coverage-rate-shipped.md` etc. (mirror 6 per-calc memories)

- [ ] **Step 1: Run holistic pre-merge review (P10-7 + CLAUDE.md "Quality Gates")**

Dispatch `general-purpose` subagent with prompt:

```
You are running a holistic cross-cutting review for the P13 (Knowledge/Documentation) batch.

CONTEXT:
- Spec: docs/superpowers/specs/2026-07-12-p13-knowledge-documentation-batch-design.md
- Plan executed: docs/superpowers/plans/2026-07-12-p13-knowledge-documentation-batch.md
- Worktree: D:\E\独立站\youtube-tools
- Batch scope: 6 new calculators in new 'K' category (86 → 92 engines, 13 → 14 categories)
- Per-calc touch points (8-file wiring per calc): engine.ts + index.ts barrel + tools/knowledge.ts + og-samples.json + codegen-examples.mjs + ab-split.test.ts + internal-links.test.ts + tests/<slug>.test.ts

INSTRUCTIONS:
1. Compare spec Roster (spec §2) to actual engines and ToolMeta entries — verify 6 slugs match exactly.
2. Compare spec Per-Calc Detail §3 input names to actual engine inputs and ToolMeta inputs — verify 26 inputs match.
3. Compare HEALTH_BANDS (spec §4) to engine constants — verify 5 HIGHER + 1 INVERSE with correct thresholds.
4. Compare cross-link IDs (spec §1.4) to engine Tip copy — verify K-1↔P12-5, K-3↔P12-2, K-4↔P12-5, K-5↔P12-1+P12-5, K-6↔P12-4 references exist.
5. Check ab-split.test.ts and internal-links.test.ts counts match (both should be 92).
6. Verify ToolMeta categoryId is 'K' for all 6 entries.
7. Verify og-samples.json has all 6 new entries with en+zh keys.
8. Check pnpm check passes (typecheck + tests; expect 700+ pass / 0 fail).

OUTPUT:
A numbered list of FINDINGS ranked by severity (CRITICAL / HIGH / MEDIUM / LOW). For each finding, include:
- File path and line number
- Defect description
- Suggested fix

If no critical/high issues, return "0 critical, 0 high — P13 series is ready for ship."
```

Run: `agent(prompt, subagent_type='general-purpose')`

- [ ] **Step 2: Triage findings — fix any CRITICAL/HIGH issues**

For each CRITICAL/HIGH finding from Step 1, dispatch a fix subagent per finding (1 implementer + 1 verifier). Skip LOW (note for future polish). MEDIUM = discuss with user before fixing.

If findings warrant a "holistic fix" commit, follow P10-7 pattern:
```bash
git add <fixed files>
git commit -m "fix(p13-holistic): review caught N issues — <one-line summary per issue>"
git push origin HEAD && git push github HEAD
```

- [ ] **Step 3: Final verification — `pnpm check`**

Run: `pnpm check`
Expected: PASS. Verify total test count is in expected range (~700-775 pass / 0 fail).

- [ ] **Step 4: Build verification**

Run: `pnpm build`
Expected: SUCCESS. Verify dist outputs grew (228 → ~244 pages, +16 = 6 calcs × 2 langs + 2 listing pages × 2 langs).

- [ ] **Step 5: Write series memory + per-calc memories**

For each of the 6 calcs, write `memory/p13-N-<slug>-shipped.md` (in-repo under `memory/`) using the 12-line P12 stub pattern: spec section, ship date, commit SHA, canonical inputs, band thresholds, cross-link notes.

Then write `memory/p13-series-shipped.md` summarizing: 6 calcs shipped 2026-07-12, 86→92 engines / 13→14 categories, total inputs 26, ~67-78 tests added, holistic review caught N issues, all 6 calc engine file paths.

Mirror all 7 files to `~/.claude/projects/.../memory/` (Claude auto-memory location).

- [ ] **Step 6: Update MEMORY.md index (both locations)**

Append:
```
- [P13-1 shipped](p13-1-kb-coverage-rate-shipped.md) — K-1 KB Coverage Rate 已 ship 2026-07-12; canonical 70% Good; K→P12-5 funnel closure
- [P13-2 shipped](p13-2-article-freshness-shipped.md) — K-2 Article Freshness 已 ship 2026-07-12; canonical 65% (12mo) Good
- [P13-3 shipped](p13-3-search-effectiveness-shipped.md) — K-3 Search Effectiveness 已 ship 2026-07-12; composite CTR + no-result AND-band
- [P13-4 shipped](p13-4-deflection-quality-shipped.md) — K-4 Deflection Quality 已 ship 2026-07-12; INVERSE reopen with Infinity critical
- [P13-5 shipped](p13-5-documentation-roi-shipped.md) — K-5 Doc ROI 已 ship 2026-07-12; KB cost savings formula
- [P13-6 shipped](p13-6-article-helpfulness-shipped.md) — K-6 Helpfulness 已 ship 2026-07-12; helpful + vote-rate AND-band
- [P13 series shipped](p13-series-shipped.md) — P13 Knowledge/Documentation Calculator Batch 完整 ship 2026-07-12; 6 calcs (86→92 +6); NEW 'K' category (14th); 26 inputs + ~70 tests
```

To: `~/.claude/projects/.../memory/MEMORY.md` AND `memory/MEMORY.md`.

- [ ] **Step 7: Final commit + push (memory only — code already shipped)**

```bash
git add memory/
git commit -m "docs(p13): series memory + 6 per-calc memory + MEMORY.md index update"
git push origin HEAD && git push github HEAD
```

- [ ] **Step 8: Verify 3-way sync via rev-list**

Run:
```bash
git rev-list --left-right --count origin/master...github/master
```

Expected: `0 0` (3-way sync clean — local + gitee + github all at same SHA).

- [ ] **Step 9: Announce ship**

P13 series shipped. Compose summary:

| Metric | Value |
|---|---|
| Engines | 86 → 92 (+6) |
| Categories | 13 → 14 (NEW 'K' Knowledge/Documentation) |
| Inputs | 26 across 6 calcs |
| Tests | ~70 added (12+11+13+10+11+12) |
| Holistic issues caught | N (per Step 1) |
| Pass / fail | ≥700 pass / 0 fail |
| 3-way sync | ✅ |

---

## Self-Review (run before publishing plan)

After writing this plan, I (writer) verified the following:

✅ **Spec coverage**: each spec §3 calc has Tasks 2-7 (1:1 mapping); spec §1.4 cross-links appear in engine Tip copy and Task 1-7 boilerplate reminders; spec §5 8-file wiring steps appear in Task 2 template (8 places).

✅ **Per-calc bumps**: ab-split.test.ts and internal-links.test.ts bumped per-calc 86→92 (P8-0 over-bump lesson applied). Task 8 also includes final verification step.

✅ **ROOT barrel pre-emptive fixes in Task 1** (P9-1 + P10-1 + P11-1 + P12-0 lesson) — both `src/engines/index.ts` AND `src/data/tools/index.ts` updated before any engine exists.

✅ **K-3 composite AND-band** (spec §3.3 + §6) — calcHealthBand takes 2 args, returns excellent/good/warning only when BOTH thresholds pass; critical triggers on either failing.

✅ **K-4 INVERSE reopen with Infinity critical** (P9-4 + P12-1 lesson).

✅ **K-5 ROI thresholds corrected**: 400% / 150% / 50% / -Infinity (not 2000% / 800% / 200% from spec self-review fix commit).

✅ **K-6 helpful+vote-rate dual-threshold band** (spec §3.6) — same AND pattern as K-3.

✅ **Composite-band test boundary cases** (K-3 excellent/good/warning/critical with both-pass + both-fail scenarios).

✅ **Codegen examples**: `node scripts/codegen-examples.mjs --check` invoked per calc after engine write.

✅ **Each per-calc task ends with pnpm check + commit + dual push + memory file** — matches P-series standard cadence (P12 plan Task 1-6).

✅ **Task 8 includes holistic pre-merge review** (CLAUDE.md Quality Gates + P10-7 lesson learned).

✅ **CustomFn minified JS** uses `${'closing'}` template literals where needed — **wait, those are NO longer needed** (P10-5 lesson resolved); use plain closing backticks.

Type consistency check:
- `calcHealthBand(x: number)` for K-1/K-2/K-4/K-5 (single axis)
- `calcHealthBand(x: number, y: number)` for K-3/K-6 (composite)
- This is intentional per spec §3 — verified all engines declare correct signature.

No red-flag placeholders in the plan (no "TBD", "TODO", "fill in later", "similar to Task X" without repeating the code).


