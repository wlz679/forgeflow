# P14 Legal & Compliance Calculator Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6 new calculators in a NEW 'L' Legal & Compliance category at ForgeFlowKit (solopreneur SaaS calculators). Mid-market B2B SaaS DPO / Privacy Officer persona, $10M-$50M ARR / €10M-€50M ARR anchor. Closes the **compliance-cost loop** that touches every B2B SaaS deal: GDPR fines, DSAR handling, cookie consent impact, DPA negotiation cost, breach notification cost, and CMP platform ROI all get a quantitative anchor. Brings total to 98 engines / 15 categories.

**Architecture:** Self-registered engine (`src/engines/legal-compliance/<slug>-calculator.ts`), per-calc 4-band hardcoded thresholds from GDPR Art. 83 + IAPP Privacy Operations Benchmark 2024 + ICO GDPR fines guide 2024 + OneTrust / Didomi / Cookiebot CMP benchmarks 2024 + ENISA Threat Landscape 2024. Fully static — no PRICING.json entry, no API fetch. Per-calc push cadence (8 commits total: scaffold + 6 calcs + holistic). Closes the **privacy-cost loop** complementing P6 (marketing acquisition) + P8 (sales closing) + P9 (retention keep) + P12 (support ops) + P13 (KB upstream quality).

**Tech Stack:** Astro 4.16.19 static site generation, TypeScript 5.6 strict. Node `appendFileSync` for engine files >5000 chars (P9-2/P9-5 lesson). pnpm check (typecheck + test:run) as pre-commit gate. No new external dependencies. EUR is the canonical currency (GDPR is European); USD inputs allowed via user-defined defaults for L-6 CMP ROI US-jurisdiction examples.

---

## Global Constraints

| # | Constraint | Source |
|---|------------|--------|
| 1 | Each calculator file lives in `src/engines/legal-compliance/` | spec §1.1, §5 |
| 2 | Engine filename: `<slug>-calculator.ts` (kebab-case, no abbreviations) | spec §5 |
| 3 | Engine self-registers via `registerEngine(engine)` at module import | P-series established |
| 4 | Barrel pattern: `src/engines/legal-compliance/index.ts` uses explicit line-per-engine imports | P12-0 lesson |
| 5 | ToolMeta entry in `src/data/tools/legal-compliance.ts` uses `categoryId: 'L'` exactly | spec §5 |
| 6 | OG entry: `headline`, `headlineUnit`, `headlineLabel` — both `en` and `zh` keys | P9 pattern |
| 7 | `scripts/codegen-examples.mjs` ENGINES array: `{ file, slug, subdir: 'legal-compliance', defaultInputs }` | P12-0 lesson |
| 8 | `tests/ab-split.test.ts`: subdir array append `'legal-compliance'` (15→16), file list append `'legal-compliance.ts'` (17→18); engines length 92→98 per-calc; tools length 92→98 per-calc | spec §5, P8-0 over-bump lesson |
| 9 | `tests/internal-links.test.ts`: bump `92` → `98` per-calc (not just at P14-6) | P12-1 lesson |
| 10 | Each per-calc test file: 10-13 tests covering math + 4 health bands | spec §3-§6 |
| 11 | 6-section v3 Business standard: 🩺 Health · 📊 Snapshot · 🔄 What-If · ⚖️ Break-Even · 🎯 Milestone · 💡 Tip | spec §3 |
| 12 | HEALTH_BANDS exported as top-level `const` per engine file | P6+ pattern |
| 13 | Float precision dual-layer: math returns unrounded, display rounds | P-series standard |
| 14 | Mid-market $10M-$50M ARR (or €10M-€50M ARR) anchor copy in every ToolMeta description | P9+ pattern, spec §1.3 |
| 15 | L-1/L-2/L-4/L-5/L-6: HIGHER band; L-3: INVERSE band (gap_pp larger = worse) | spec §4 |
| 16 | L-3 INVERSE: 4-band on consent_gap_pp; critical threshold 30pp | spec §3.3, §4 |
| 17 | L-6 critical: -Infinity on ROI (negative savings = critical) | spec §3.6 |
| 18 | L-1/L-2/L-4/L-5 critical: -Infinity on respective HIGHER axis | spec §3.1/3.2/3.4/3.5 |
| 19 | Pre-commit gate: `pnpm check` (zero errors) before each commit | P-series standard |
| 20 | Dual push: `git push origin HEAD` (gitee) + `git push github HEAD` with `SKIP_PUSH_FETCH=1` | P-series standard |
| 21 | Use Node `appendFileSync` (NOT Bash printf) for engine files >5000 chars | P9-2 lesson |
| 22 | Run `node scripts/codegen-examples.mjs` after engine edits; `--check` mode for drift detection | P-series standard |
| 23 | Codegen `--check` validates `new Function('inputs','pick','fill', customFn)` parses + literal escape regex | P9 pattern |
| 24 | Memory file per-calc saved to `~/.claude/projects/.../memory/` AND `memory/` in-repo AFTER successful ship | P-series standard |
| 25 | `MEMORY.md` index in same location gets `- [Title](file.md)` line per ship | P-series standard |
| 26 | **CRITICAL P14-0 scaffold pre-emptive**: `src/engines/index.ts` adds `import './legal-compliance';` AND `src/data/tools/index.ts` adds `import { tools as legalCompliance } from './legal-compliance';` + spreads into tools array | P9-1 + P10-1 + P11-1 + P12-0 + P13-0 lesson (caught by ab-split) |
| 27 | DPO/Privacy Officer persona string: "mid-market B2B SaaS ($10M-$50M ARR / €10M-€50M ARR)" + "DPO · Privacy Officer · Head of Privacy" in every description | spec §1.3 |
| 28 | EUR is canonical currency for L-1..L-5; L-6 CMP ROI uses EUR for canonical (€1,200/mo) but US-jurisdiction examples (USD) acceptable in customFn | spec §3 |
| 29 | All 26 inputs verified per spec §3 (no missing input mid-flight fixes) | spec §3 + P10-1 lesson |
| 30 | L-1 GDPR Fine: select `max_fine_pct` 4-tier (4% / 2% / 1% / 0.5%); `industry_risk_multiplier` 4-option select (SaaS 0.8 / FinTech 1.0 / HealthTech 1.4 / AdTech 1.6) | spec §3.1 |
| 31 | L-2 DSAR: `automation_pct` 0-100% (clamped); `dsars_per_month` × 12; `cost_per_dsar` derived; canonical 50/2.5/95/30 → €99,750/yr | spec §3.2 |
| 32 | L-3 Cookie Consent: `current_consent_rate_pct` + `target_consent_rate_pct` (both clamped 0-100); `monthly_visitors`; `conversion_rate_pct`; canonical 200K/55/75/2.0 → 20pp gap, €64K/mo | spec §3.3 |
| 33 | L-4 DPA: 5 inputs (`dpas_per_quarter`, `avg_negotiation_rounds`, `hours_per_round`, `legal_hourly_rate`, `redlines_per_dpa`); `redline_multiplier = 1 + redlines_per_dpa × 0.05`; canonical 40/4/1.5/250/8 → €336K/yr | spec §3.4 |
| 34 | L-5 Breach: 4 inputs (`breaches_per_year`, `data_subjects_per_breach`, `notification_cost_per_subject`, `remediation_cost_per_breach`); canonical 1/50K/5/80K → €330K/yr | spec §3.5 |
| 35 | L-6 CMP ROI: 5 inputs (`cmp_monthly_cost`, `dsars_per_month`, `hours_per_dsar`, `hourly_rate_dpo`, `automation_uplift_pct`); `payback_months` derived; canonical 1200/50/2.5/95/40 → €57K savings, €42.6K net, 296% ROI | spec §3.6 |
| 36 | L-1 × L-5 cross-link: fine risk + breach cost = true incident cost (compound) | spec §1.4, §7 |
| 37 | L-3 × L-6 cross-link: CMP improves consent rate AND reduces DSAR hours (multiplier) | spec §1.4, §7 |
| 38 | L-2 × P12 Support cross-link: DSARs are tickets — pair with cost-per-ticket (T-1) | spec §1.4, §7 |
| 39 | L-5 × P9 Retention cross-link: breach → customer churn (3-5% per incident) | spec §1.4, §7 |
| 40 | L-4 × P8 Sales cross-link: DPA rounds × redlines → sales-cycle delay | spec §1.4, §7 |

---

## File Structure

| Layer | File | Per-task |
|-------|------|----------|
| Engine | `src/engines/legal-compliance/<slug>-calculator.ts` | NEW per calc (Task 2-7) |
| Engine | `src/engines/legal-compliance/index.ts` | NEW (Task 1), append imports (Task 2-7) |
| Engine | `src/engines/index.ts` | **append `import './legal-compliance';`** (Task 1) — ROOT barrel pre-emptive fix |
| Data | `src/data/tools/legal-compliance.ts` | NEW empty (Task 1), append entries (Task 2-7) |
| Data | `src/data/tools/index.ts` | **append `import { tools as legalCompliance } from './legal-compliance';` + spread** (Task 1) — ROOT barrel pre-emptive fix |
| Data | `src/data/categories.ts` | append 1 entry (Task 1) |
| Data | `src/data/og-samples.json` | append 1 entry per calc (Task 2-7) |
| Page | `src/pages/[lang]/legal-compliance.astro` | NEW (Task 1) |
| Test | `tests/<slug>-calculator.test.ts` | NEW per calc (Task 2-7) |
| Test | `tests/ab-split.test.ts` | modify subdir/data/files arrays (Task 1), bump counts per calc (Task 2-7) |
| Test | `tests/internal-links.test.ts` | bump per calc (Task 2-7) |
| Script | `scripts/codegen-examples.mjs` | append ENGINES entry per calc (Task 2-7) |
| Memory | `~/.claude/projects/.../memory/p14-N-<slug>-shipped.md` | NEW per calc (Task 2-7) |
| Memory | `~/.claude/projects/.../memory/p14-series-shipped.md` | NEW (Task 8) |
| Memory | `~/.claude/projects/.../memory/MEMORY.md` | append line per ship |

**Total file actions per calc (Task 2-7):** 8 (engine + test + 6 supporting: barrel, ToolMeta, og-samples, codegen, ab-split, internal-links + memory)
**Total file actions Task 1:** 8 (1 dir + 7 files: empty barrel, empty ToolMeta, categories entry, listing page, ab-split array updates, AND both root barrel imports)
**Total file actions Task 8 (holistic review):** 3 (1 review agent + 1 series memory + 1 MEMORY.md update + 1 holistic fix commit + 1 push)

**Commits:** 8 (scaffold + 6 calcs + holistic review + memory)

---

### Task 1: P14-0 Scaffold — Empty category shell + ROOT barrel pre-emptive fixes [INTEGRATION]

**Files:**
- Create: `src/engines/legal-compliance/` (directory)
- Create: `src/engines/legal-compliance/index.ts` (empty barrel with all 6 calc comments)
- Modify: `src/engines/index.ts` (append `import './legal-compliance';`)
- Create: `src/data/tools/legal-compliance.ts` (empty)
- Modify: `src/data/tools/index.ts` (append `import { tools as legalCompliance } from './legal-compliance';` + spread)
- Modify: `src/data/categories.ts` (append 1 entry — 'L' Legal & Compliance as 15th)
- Create: `src/pages/[lang]/legal-compliance.astro` (template)
- Modify: `tests/ab-split.test.ts` (add 'legal-compliance' to subdir array; add 'legal-compliance.ts' to data/tools file list)

**Interfaces:**
- Consumes: nothing (first task)
- Produces:
  - `src/data/categories.ts` exports `categories: Category[]` with length 15 (was 14) — appending 'L' as 15th
  - `src/data/tools/legal-compliance.ts` exports `tools: ToolMeta[]` (empty, length 0)
  - `src/pages/[lang]/legal-compliance.astro` renders `dist/en/legal-compliance/index.html` and `dist/zh/legal-compliance/index.html`
  - `tests/ab-split.test.ts` test "engines/ has 15 subdirectories" → updated to "16 subdirectories" + 'legal-compliance' appended; test "data/tools/ has 17 files" → updated to "18 files" + 'legal-compliance.ts' appended
  - `src/engines/index.ts` and `src/data/tools/index.ts` both reference legal-compliance from Task 1 (avoids P10-1 mid-flight fix)

- [ ] **Step 1: Create directory `src/engines/legal-compliance/`**

Run: `mkdir -p src/engines/legal-compliance`
Expected: directory created.

- [ ] **Step 2: Create `src/engines/legal-compliance/index.ts` (empty barrel)**

```ts
// Legal & Compliance Calculator Engines (P14 batch, 6 calcs)
//
// P14-1: gdpr-fine                 — GDPR Fine Risk
// P14-2: dsar-cost                 — DSAR Processing Cost
// P14-3: consent-revenue           — Cookie Consent Revenue Impact
// P14-4: dpa-cost                  — DPA Negotiation Cost
// P14-5: breach-notification       — Data Breach Notification Cost
// P14-6: cmp-roi                   — CMP ROI
//
// Engines are added one per task via Task 2..Task 7.
import './gdpr-fine-calculator';
import './dsar-cost-calculator';
import './consent-revenue-impact-calculator';
import './dpa-cost-calculator';
import './breach-notification-cost-calculator';
import './cmp-roi-calculator';
export {};
```

Save to: `src/engines/legal-compliance/index.ts`

> **Note**: The imports reference engine files that don't exist yet. This is intentional — each engine is created in Task 2-7, and the import line that references an existing file makes the build pass once the engine is created. **Do NOT run `pnpm build` between Tasks 1 and 2** — the scaffold alone will fail to build until the engines exist. Run `pnpm check` (typecheck + test:run) AFTER each engine is added (Task 2-7).

- [ ] **Step 3: Modify `src/engines/index.ts` — append legal-compliance import (PRE-EMPTIVE ROOT BARREL FIX)**

Read the file first to find the last import line. Then append after the last `import './<existing-dir>';` line:

```ts
import './legal-compliance';
```

Update the file-level header comment to reflect "15 subdirectories" (was "14 subdirectories"). P13-0 had this comment as `"// 12 subdirectories"` → bump to `"// 15 subdirectories"` if present.

- [ ] **Step 4: Create `src/data/tools/legal-compliance.ts` (empty)**

```ts
// Legal & Compliance ToolMeta entries (P14 batch, 6 calcs).
// Per-task adds one entry. See src/data/tools/index.ts for barrel.
import type { ToolMeta } from './types';
export const tools: ToolMeta[] = [];
```

Save to: `src/data/tools/legal-compliance.ts`

- [ ] **Step 5: Modify `src/data/tools/index.ts` — append legal-compliance import + spread (PRE-EMPTIVE ROOT BARREL FIX)**

Add `import { tools as legalCompliance } from './legal-compliance';` to the import block (after the last existing per-category import), and `...legalCompliance,` to the spread block (after the last existing per-category spread).

Final `tools` array should have 16 spread entries (was 15).

- [ ] **Step 6: Modify `src/data/categories.ts` — append 'L' category entry**

Read the file first to find the last closing brace (`];`). Then append BEFORE the closing `]` (NOT after — keep array valid). Note: there are 14 categories currently (A B C D E F H K M O P R S T); 'L' lands naturally between K and M in the alphabet.

```ts
  { id: 'L', name: 'Legal & Compliance', slug: 'legal-compliance', description: 'Calculate GDPR fine risk, DSAR processing cost, cookie consent revenue impact, DPA negotiation cost, breach notification cost, and CMP platform ROI for DPOs, Privacy Officers, and Heads of Privacy at mid-market B2B SaaS companies ($10M-$50M ARR).' },
```

Verify with: `grep -c "id: 'L'" src/data/categories.ts` → expect `1`
Verify array length: `grep -c "id: '[A-Z]'" src/data/categories.ts` → expect `15`

- [ ] **Step 7: Create `src/pages/[lang]/legal-compliance.astro` (template copy from customer-support.astro)**

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
const CATEGORY_ID = 'L';
const CATEGORY_SLUG = 'legal-compliance';
// Category L i18n keys will populate incrementally across P14-1..P14-6.
// Until then, fall back to direct category data.
const categoryMeta = categories.find(c => c.id === CATEGORY_ID);
const categoryName = categoryMeta?.name ?? 'Legal & Compliance';
const categoryDesc = categoryMeta?.description ?? 'Legal & Compliance calculators for mid-market B2B SaaS DPOs, Privacy Officers, and Heads of Privacy.';

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
      <p class="text-sm text-gray-700 leading-relaxed">{categoryDesc}</p>
    </section>

    <section class="mb-10">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">All {categoryTools.length} {categoryName} Tools</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categoryTools.map(t => <ToolCard slug={t.slug} title={t.title} description={t.description} />)}
      </div>
    </section>

    <CategoryOtherNav currentCategoryId={CATEGORY_ID} categories={categories} />
  </main>
  <Footer />
</BaseLayout>
```

Save to: `src/pages/[lang]/legal-compliance.astro`

- [ ] **Step 8: Modify `tests/ab-split.test.ts` — subdir array append (15→16); data/tools/ file list append (17→18)**

In test "engines/ has 15 subdirectories", update the literal list:
- Change `assert.equal` description to "has 16 subdirectories"
- Add `'legal-compliance'` to the for-loop array (after `'knowledge'`)

```ts
test('engines/ has 16 subdirectories', () => {
  for (const sub of ['saas', 'ai-cost', 'valuation', 'freelance', 'cost', 'investment', 'real-estate', 'marketing', 'operations', 'sales', 'retention', 'product-analytics', 'hiring-team', 'customer-support', 'knowledge', 'legal-compliance']) {
    assert.ok(
      existsSync(join(ROOT, 'src/engines', sub)),
      `engines/${sub}/ should exist`
    );
  }
});
```

In test "data/tools/ has 17 files", update:
- Change description to "18 files"
- Add `'legal-compliance.ts'` to the for-loop array (after `'knowledge.ts'`)

```ts
test('data/tools/ has 18 files (types, 16 categories, index)', () => {
  for (const f of ['types.ts', 'saas.ts', 'ai-cost.ts', 'valuation.ts', 'freelance.ts', 'cost.ts', 'investment.ts', 'real-estate.ts', 'marketing.ts', 'operations.ts', 'sales.ts', 'retention.ts', 'product-analytics.ts', 'hiring-team.ts', 'customer-support.ts', 'knowledge.ts', 'legal-compliance.ts', 'index.ts']) {
    assert.ok(
      existsSync(join(ROOT, 'src/data/tools', f)),
      `data/tools/${f}/ should exist`
    );
  }
});
```

> **Engine count caveat**: P14-0 scaffold alone does NOT bump `engines.length` from 92 → 98. The engines array length bumps per-calc in Task 2-7. P14-0 only sets up the empty shell; the engine count tests (`getAllEngines().length === 92` → `=== 98` after P14-6) need to be bumped per calc, not at P14-0.

Verify with: `grep -c "legal-compliance" tests/ab-split.test.ts` → expect ≥2 (subdir + file list entries)

- [ ] **Step 9: Run pnpm check to verify scaffold gates (will fail at ab-split engines test until Task 2-7 add engines)**

Run: `pnpm check`
Expected: FAIL at `ab-split.test.ts` "getAllEngines() returns 92 engines" — this is expected because the legal-compliance barrel imports 6 engine files that don't exist yet. **Do not fix this** — Task 2-7 will create the engines one by one, and the test will pass after P14-6.

To verify the scaffold is structurally correct WITHOUT running tests, use:
```bash
node -e "require('./src/engines/legal-compliance/index.ts')" 2>&1 | head -5
```

Expected: error like `Cannot find module './gdpr-fine-calculator'` (intentional — engine files don't exist yet).

The scaffold IS complete when:
- `src/engines/legal-compliance/` directory exists
- `src/engines/legal-compliance/index.ts` exists with all 6 engine imports
- `src/data/tools/legal-compliance.ts` exists (empty array)
- `src/data/categories.ts` has 15 entries (was 14)
- `src/pages/[lang]/legal-compliance.astro` exists
- `src/engines/index.ts` has `import './legal-compliance';`
- `src/data/tools/index.ts` has `import { tools as legalCompliance } from './legal-compliance';` + `...legalCompliance,` spread
- `tests/ab-split.test.ts` subdir + file list include `legal-compliance`

- [ ] **Step 10: Commit scaffold**

```bash
git add src/engines/legal-compliance/ src/engines/index.ts src/data/tools/legal-compliance.ts src/data/tools/index.ts src/data/categories.ts src/pages/[lang]/legal-compliance.astro tests/ab-split.test.ts
git commit -m "feat(p14-0): legal & compliance category scaffold + new 'L' category + listing page + ROOT barrel pre-emptive"
git push origin HEAD
git push github HEAD
```

Then dual-push:
```bash
git push origin HEAD
git push github HEAD
```

> **Skip `pnpm check` here** — ab-split engine count test will fail. Verify by:
> 1. Confirming the scaffold files exist
> 2. The commit lands cleanly
> 3. **No test run** until P14-1 (Task 2) completes the first engine

---

### Task 2: P14-1 GDPR Fine Risk [MECHANICAL]

**Files:**
- Create: `src/engines/legal-compliance/gdpr-fine-calculator.ts`
- Modify: `src/engines/legal-compliance/index.ts` (already has the import — no change needed)
- Modify: `src/data/tools/legal-compliance.ts` (append ToolMeta entry)
- Modify: `src/data/og-samples.json` (append 1 entry)
- Modify: `scripts/codegen-examples.mjs` (append ENGINES entry)
- Modify: `tests/ab-split.test.ts` (bump engines 92→93, tools 92→93)
- Modify: `tests/internal-links.test.ts` (bump `Object.keys(relatedTools).length` 92→93)
- Create: `tests/gdpr-fine-calculator.test.ts`
- Memory: `~/.claude/projects/.../memory/p14-1-gdpr-fine-shipped.md` (after successful ship)

**Interfaces:**
- Consumes: `src/engines/legal-compliance/breach-notification-cost-calculator.ts` (cross-link reference for Tip, future Task 6) — Tip copy uses literal `[Data Breach Notification] (L-5)` text only
- Produces: `registerEngine(engine)` adds 1 to `getAllEngines().length` (92→93)

**Inputs (4)**: `annual_revenue_global` (number, €), `max_fine_pct` (select: '4%' / '2%' / '1%' / '0.5%'; default '4%'), `violations_per_year` (number), `industry_risk_multiplier` (select: SaaS 0.8 / FinTech 1.0 / HealthTech 1.4 / AdTech 1.6; default SaaS 0.8)

**Math:**
- `max_fine_amount = annual_revenue_global × (max_fine_pct / 100)`
- `per_violation_expected = max_fine_amount × industry_risk_multiplier`
- `annual_exposure = per_violation_expected × violations_per_year`
- `exposure_ratio = annual_exposure / annual_revenue_global`

**HEALTH_BANDS (HIGHER on exposure_ratio — higher exposure = worse; critical threshold 2% — EU enforcement has not exceeded this in past 5 years except against Big Tech):**
- excellent: ratio < 0.25%
- good: 0.25% ≤ ratio < 1%
- warning: 1% ≤ ratio < 2%
- critical: ratio ≥ 2%

Implementation:
```ts
export const HEALTH_BANDS = {
  excellent: { threshold: 0.0025, label: 'Excellent', message: 'Low exposure — mature compliance.' },
  good:      { threshold: 0.01,   label: 'Good',      message: 'Manageable exposure.' },
  warning:   { threshold: 0.02,   label: 'Warning',   message: 'Significant exposure.' },
  critical:  { threshold: Infinity, label: 'Critical', message: 'Fine-tier cap likely to hit.' },
};

export function maxFineAmount(revenue: number, finePct: number): number {
  return revenue * (finePct / 100);
}

export function perViolationExpected(maxFine: number, industryMult: number): number {
  return maxFine * industryMult;
}

export function annualExposure(perViolation: number, violations: number): number {
  return perViolation * violations;
}

export function exposureRatio(annual: number, revenue: number): number {
  return revenue > 0 ? annual / revenue : 0;
}

export function calcHealthBand(ratio: number): keyof typeof HEALTH_BANDS {
  if (ratio < HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (ratio < HEALTH_BANDS.good.threshold) return 'good';
  if (ratio < HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}
```

Note: `excellent` uses `<` (less-than) not `≤` because 0.25% is the upper bound. `warning` uses `<` (less-than) because 2% is the lower bound of `critical`. Band transitions: <0.25% (excellent) | 0.25%–<1% (good) | 1%–<2% (warning) | ≥2% (critical).

**Canonical (per spec §3.1):** `revenue=25_000_000, fine_pct=4, violations=2, industry_mult=0.8` → max_fine=1_000_000 · per_violation=800_000 · annual_exposure=**1_600_000** (€1.6M), ratio=0.0064 (0.64%) → **🟡 Good**.

- [ ] **Step 1: Write `src/engines/legal-compliance/gdpr-fine-calculator.ts`**

```ts
// P14-1 GDPR Fine Risk
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS DPO/Privacy Officer persona (€10M-€50M ARR).
// Regulatory anchors: GDPR Art. 83 (full text at https://gdpr-info.eu/art-83-gdpr/);
// ICO GDPR fines guide 2024; IAPP Privacy Enforcement Atlas 2024.
// HIGHER on exposure_ratio: more exposure = worse. Bands: <0.25% / 0.25-1% / 1-2% / ≥2%.
// Critical threshold 2% (EU enforcement has not exceeded this in past 5 years except against Big Tech).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

export const HEALTH_BANDS = {
  excellent: { threshold: 0.0025, label: 'Excellent', message: 'Low exposure — mature compliance.' },
  good:      { threshold: 0.01,   label: 'Good',      message: 'Manageable exposure.' },
  warning:   { threshold: 0.02,   label: 'Warning',   message: 'Significant exposure.' },
  critical:  { threshold: Infinity, label: 'Critical', message: 'Fine-tier cap likely to hit.' },
};

export function maxFineAmount(revenue: number, finePct: number): number {
  return revenue * (finePct / 100);
}

export function perViolationExpected(maxFine: number, industryMult: number): number {
  return maxFine * industryMult;
}

export function annualExposure(perViolation: number, violations: number): number {
  return perViolation * violations;
}

export function exposureRatio(annual: number, revenue: number): number {
  return revenue > 0 ? annual / revenue : 0;
}

export function calcHealthBand(ratio: number): keyof typeof HEALTH_BANDS {
  if (ratio < HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (ratio < HEALTH_BANDS.good.threshold) return 'good';
  if (ratio < HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtMoney(x: number): string { return '€' + Math.round(x).toLocaleString(); }
function fmtPct(x: number): string { return (x * 100).toFixed(2) + '%'; }
function fmtInt(x: number): string { return Math.round(x).toLocaleString(); }

const engine: ToolEngine = {
  slug: 'solopreneur-gdpr-fine-calculator',
  title: 'GDPR Fine Risk',
  description:
    'Quantify annualized GDPR fine exposure given violation rate and industry-risk profile. HIGHER health bands — more exposure = worse: 🟢 <0.25% · 🟡 0.25-1% · 🟠 1-2% · 🔴 ≥2%. For mid-market B2B SaaS (€10M-€50M ARR) DPOs, Privacy Officers, and Heads of Privacy.',
  inputs: [
    { name: 'annual_revenue_global',    label: 'Annual global revenue (€)',                placeholder: 'e.g. 25000000', type: 'number' },
    { name: 'max_fine_pct',             label: 'GDPR fine tier',                            placeholder: '4% (Art. 83(5))', type: 'select', options: ['4%', '2%', '1%', '0.5%'] },
    { name: 'violations_per_year',      label: 'Reportable violations per year',            placeholder: 'e.g. 2',       type: 'number' },
    { name: 'industry_risk_multiplier', label: 'Industry risk profile',                     placeholder: 'SaaS (0.8×)',  type: 'select', options: ['SaaS (0.8×)', 'FinTech (1.0×)', 'HealthTech (1.4×)', 'AdTech (1.6×)'] },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `function run(inputs, pick, fill) {
  var revenue = Number(inputs.annual_revenue_global) || 0;
  var finePct = Number(String(inputs.max_fine_pct).replace('%','')) || 4;
  var violations = Number(inputs.violations_per_year) || 0;
  var industryStr = String(inputs.industry_risk_multiplier);
  var industryMult = industryStr.indexOf('0.8') >= 0 ? 0.8 : industryStr.indexOf('1.0') >= 0 ? 1.0 : industryStr.indexOf('1.4') >= 0 ? 1.4 : industryStr.indexOf('1.6') >= 0 ? 1.6 : 0.8;
  var maxFine = revenue * (finePct / 100);
  var perViolation = maxFine * industryMult;
  var annual = perViolation * violations;
  var ratio = revenue > 0 ? annual / revenue : 0;
  var band = ratio < 0.0025 ? 'Excellent' : ratio < 0.01 ? 'Good' : ratio < 0.02 ? 'Warning' : 'Critical';
  var emoji = ratio < 0.0025 ? '🟢' : ratio < 0.01 ? '🟡' : ratio < 0.02 ? '🟠' : '🔴';
  var altFinePct = 2;
  var altMaxFine = revenue * (altFinePct / 100);
  var altPerViolation = altMaxFine * industryMult;
  var altAnnual = altPerViolation * violations;
  var lift = Math.max(0, annual - altAnnual);
  var needViolations = altPerViolation > 0 ? Math.ceil(altAnnual / altPerViolation) : 0;
  return [
    '🩺 GDPR Fine Risk: ' + emoji + ' ' + band + ' (annual exposure ' + Math.round(annual).toLocaleString() + ' € / ' + (ratio*100).toFixed(2) + '% of revenue)',
    '📊 Snapshot: ' + Math.round(revenue).toLocaleString() + ' € global revenue · ' + violations.toLocaleString() + ' violations/yr · ' + finePct + '% cap tier · industry ' + industryMult.toFixed(1) + '× · per-violation ' + Math.round(perViolation).toLocaleString() + ' € · annual exposure ' + Math.round(annual).toLocaleString() + ' €',
    '🔄 What-If: if tier drops to 2% (procedural), annual exposure drops to ' + Math.round(altAnnual).toLocaleString() + ' € (' + (altAnnual*100/Math.max(1,revenue)).toFixed(2) + '% — 🟢 Excellent). Invest in DSAR automation + CMP to halve violation rate.',
    '⚖️ Break-Even: to hit 🟢 Excellent (<0.25%), need ~' + needViolations + ' violation/yr OR move to 2% tier (procedural-only violations)',
    '🎯 Milestone: re-baseline annually + after any material breach. ICO publishes quarterly enforcement summaries (https://ico.org.uk/action-weve-taken/enforcement/).',
    '💡 Tip: pair with [Data Breach Notification] (L-5) — a single breach can fill the violations budget. Also pair with our [NRR Calculator] (R-1) — fines compound with churn.',
  ];
}`,
  },
  generate(inputs) {
    const revenue = Number(inputs.annual_revenue_global) || 0;
    const finePct = Number(String(inputs.max_fine_pct).replace('%', '')) || 4;
    const violations = Number(inputs.violations_per_year) || 0;
    const industryStr = String(inputs.industry_risk_multiplier);
    const industryMult = industryStr.indexOf('0.8') >= 0 ? 0.8 : industryStr.indexOf('1.0') >= 0 ? 1.0 : industryStr.indexOf('1.4') >= 0 ? 1.4 : industryStr.indexOf('1.6') >= 0 ? 1.6 : 0.8;
    const maxFine = maxFineAmount(revenue, finePct);
    const perViolation = perViolationExpected(maxFine, industryMult);
    const annual = annualExposure(perViolation, violations);
    const ratio = exposureRatio(annual, revenue);
    const band = calcHealthBand(ratio);
    const bandInfo = HEALTH_BANDS[band];
    const altFinePct = 2;
    const altMaxFine = maxFineAmount(revenue, altFinePct);
    const altPerViolation = perViolationExpected(altMaxFine, industryMult);
    const altAnnual = annualExposure(altPerViolation, violations);
    const needViolations = altPerViolation > 0 ? Math.ceil(altAnnual / altPerViolation) : 0;
    return [
      '🩺 GDPR Fine Risk: ' + bandInfo.label + ' (annual exposure ' + fmtMoney(annual) + ' / ' + fmtPct(ratio) + ' of revenue)',
      '📊 Snapshot: ' + fmtMoney(revenue) + ' global revenue · ' + fmtInt(violations) + ' violations/yr · ' + finePct + '% cap tier · industry ' + industryMult.toFixed(1) + '× · per-violation ' + fmtMoney(perViolation) + ' · annual exposure ' + fmtMoney(annual),
      '🔄 What-If: if tier drops to ' + altFinePct + '% (procedural), annual exposure drops to ' + fmtMoney(altAnnual) + ' (' + fmtPct(altAnnual / Math.max(1, revenue)) + ' — 🟢 Excellent). Invest in DSAR automation + CMP to halve violation rate.',
      '⚖️ Break-Even: to hit 🟢 Excellent (<0.25%), need ~' + needViolations + ' violation/yr OR move to ' + altFinePct + '% tier (procedural-only violations)',
      '🎯 Milestone: re-baseline annually + after any material breach. ICO publishes quarterly enforcement summaries (https://ico.org.uk/action-weve-taken/enforcement/).',
      '💡 Tip: pair with [Data Breach Notification] (L-5) — a single breach can fill the violations budget. Also pair with our [NRR Calculator] (R-1) — fines compound with churn.',
    ];
  },
  staticExamples: [
    '🩺 GDPR Fine Risk: Good (annual exposure €1,600,000 / 0.64% of revenue)\n📊 Snapshot: €25,000,000 global revenue · 2 violations/yr · 4% cap tier · industry 0.8× · per-violation €800,000 · annual exposure €1,600,000\n🔄 What-If: if tier drops to 2% (procedural), annual exposure drops to €800,000 (0.32% — 🟢 Excellent). Invest in DSAR automation + CMP to halve violation rate.\n⚖️ Break-Even: to hit 🟢 Excellent (<0.25%), need ~1 violation/yr OR move to 2% tier (procedural-only violations)\n🎯 Milestone: re-baseline annually + after any material breach. ICO publishes quarterly enforcement summaries (https://ico.org.uk/action-weve-taken/enforcement/).\n💡 Tip: pair with [Data Breach Notification] (L-5) — a single breach can fill the violations budget. Also pair with our [NRR Calculator] (R-1) — fines compound with churn.',
  ],
  faq: [
    { q: 'What is GDPR fine risk?', a: 'GDPR fine risk quantifies your annualized exposure to fines under GDPR Art. 83. The cap is 4% of global annual revenue (Art. 83(5)) for substantive violations or 2% (Art. 83(4)) for procedural violations. Actual fines depend on case-specific factors (per ICO 2024 guidance).' },
    { q: 'How do I estimate "violations per year"?', a: 'Count reportable privacy incidents in the prior 12 months — incidents involving personal data breach, unauthorized access, DSAR non-response, or unlawful processing. IAPP 2024 Privacy Operations Survey reports mid-market SaaS averages 0.5–2 violations/yr.' },
    { q: 'Why a 4-tier industry multiplier?', a: 'GDPR fines vary by sector due to (1) data sensitivity (HealthTech/AdTech > SaaS), (2) regulatory scrutiny (FinTech > consumer apps), (3) prior enforcement history. The 0.8×–1.6× range reflects IAPP 2024 + Fieldfisher 2024 sector benchmarks.' },
    { q: 'How does this pair with L-5 Breach Notification?', a: 'L-5 estimates breach incident cost (notification + remediation). A single breach often triggers a GDPR fine — combining L-1 fine exposure + L-5 breach cost gives true incident cost (often €1M+ for mid-market SaaS).' },
    { q: 'What is the difference between "cap" and "actual" fine?', a: 'GDPR Art. 83 sets the maximum fine. Actual fines depend on (1) gravity, (2) intent, (3) mitigation, (4) cooperation with authorities. Median actual fine is 0.5%–1% of cap (per IAPP 2024 Enforcement Atlas) — but outliers (Meta, Clearview AI) reach 1%–2% of global revenue.' },
    { q: 'Does L-1 cover CCPA fines too?', a: 'CCPA (California) caps at $7,500 per intentional violation / $2,500 per non-intentional, with no revenue cap. L-1 model focuses on GDPR-style revenue-based fines; CCPA exposure is qualitatively different. See faq for CCPA-specific guidance.' },
  ],
  howToUse: [
    'Enter your annual global revenue (GDPR jurisdiction: EU + EU-targeted revenue for non-EU companies).',
    'Select the GDPR fine tier (4% Art. 83(5) substantive, 2% Art. 83(4) procedural, 1% mixed, 0.5% light).',
    'Enter annual reportable violations — pull from your incident register or IAPP benchmark for your industry.',
    'Select your industry risk profile (SaaS 0.8× / FinTech 1.0× / HealthTech 1.4× / AdTech 1.6×).',
    'Read the band — 🟢 Excellent <0.25% · 🟡 Good 0.25-1% · 🟠 Warning 1-2% · 🔴 Critical ≥2%.',
    'Pair with L-5 (Breach Notification) to compute true incident cost.',
  ],
  sources: [
    'https://gdpr-info.eu/art-83-gdpr/',
    'https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/',
    'https://iapp.org/resources/article/privacy-enforcement-atlas/',
    'https://www.fieldfisher.com/en/services/privacy-and-information-law/privacy-enforcement-tracker',
  ],
};
registerEngine(engine);
```

Save to: `src/engines/legal-compliance/gdpr-fine-calculator.ts`

- [ ] **Step 2: Verify engine parses (P12-1 lesson: parse-blocker prevention)**

Run: `node -e "require('./src/engines/legal-compliance/gdpr-fine-calculator.ts')" 2>&1 | head -5`
Expected: no syntax errors. May show TS warnings (P10/P11 lesson: warnings tolerated, exit 0).

- [ ] **Step 3: No change to `src/engines/legal-compliance/index.ts`** — the import line was already added at scaffold (Task 1 Step 2).

Verify: `grep -c "gdpr-fine-calculator" src/engines/legal-compliance/index.ts` → expect `1`

- [ ] **Step 4: Append ToolMeta entry to `src/data/tools/legal-compliance.ts`**

Add (before `];`):

```ts
  {
    slug: 'solopreneur-gdpr-fine-calculator',
    title: 'GDPR Fine Risk',
    description:
      'Quantify annualized GDPR fine exposure given violation rate and industry-risk profile. HIGHER health bands — more exposure = worse: 🟢 <0.25% · 🟡 0.25-1% · 🟠 1-2% · 🔴 ≥2%. For mid-market B2B SaaS (€10M-€50M ARR) DPOs, Privacy Officers, and Heads of Privacy.',
    categoryId: 'L',
    applicationCategory: 'BusinessApplication',
    inputs: [
      { name: 'annual_revenue_global',    label: 'Annual global revenue (€)',                placeholder: 'e.g. 25000000', type: 'number' },
      { name: 'max_fine_pct',             label: 'GDPR fine tier',                            placeholder: '4% (Art. 83(5))', type: 'select', options: ['4%', '2%', '1%', '0.5%'] },
      { name: 'violations_per_year',      label: 'Reportable violations per year',            placeholder: 'e.g. 2',       type: 'number' },
      { name: 'industry_risk_multiplier', label: 'Industry risk profile',                     placeholder: 'SaaS (0.8×)',  type: 'select', options: ['SaaS (0.8×)', 'FinTech (1.0×)', 'HealthTech (1.4×)', 'AdTech (1.6×)'] },
    ],
    keywords: [
      'gdpr fine',
      'gdpr penalty',
      'gdpr fine risk',
      'gdpr art 83',
      'ico fine',
      'data protection fine',
      'privacy fine calculator',
      'dpo fine exposure',
      'mid-market saas gdpr',
    ],
    tags: ['legal', 'compliance', 'gdpr', 'privacy'],
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-07-13',
    sources: [
      'https://gdpr-info.eu/art-83-gdpr/',
      'https://ico.org.uk/for-organisations/guide-to-data-protection/',
      'https://iapp.org/resources/article/privacy-enforcement-atlas/',
    ],
  },
```

Verify: `grep -c "solopreneur-gdpr-fine-calculator" src/data/tools/legal-compliance.ts` → expect `1`

- [ ] **Step 5: Append OG entry to `src/data/og-samples.json`**

Find the last entry (likely the most recent P13-6 article-helpfulness or a P12 calc). Before the last `}` (i.e. comma after previous entry's `}`), append:

```json
  ,
  "solopreneur-gdpr-fine-calculator": {
    "headline": {
      "en": "€1.6M",
      "zh": "€160万"
    },
    "headlineUnit": {
      "en": "annual exposure",
      "zh": "年度风险敞口"
    },
    "headlineLabel": {
      "en": "GDPR Fine Risk: €1.6M / 0.64% of revenue — Good, 2 violations/yr on €25M",
      "zh": "GDPR 罚款风险:€160万 / 0.64% 营收占比 — 良好,2500万欧元营收 2 起违规/年"
    },
    "trend": {
      "en": "Drop to 2% tier = €800K (🟢 Excellent)",
      "zh": "降至 2% 档 = €80万(🟢 优秀)"
    }
  }
```

Verify: `node -e "JSON.parse(require('fs').readFileSync('src/data/og-samples.json','utf8'))['solopreneur-gdpr-fine-calculator']"` → expect JSON parse + object returned.

- [ ] **Step 6: Append ENGINES entry to `scripts/codegen-examples.mjs`**

Find the ENGINES array (last entries will be the P13 calcs). Add (preserving array structure):

```js
  { file: 'gdpr-fine-calculator', slug: 'solopreneur-gdpr-fine-calculator', subdir: 'legal-compliance', defaultInputs: { annual_revenue_global: 25000000, max_fine_pct: '4%', violations_per_year: 2, industry_risk_multiplier: 'SaaS (0.8×)' } },
```

Then run codegen to verify it regenerates `staticExamples[0]` correctly:

```bash
node scripts/codegen-examples.mjs
```

Expected: 93/93 PASS (after L-1 added; previous count was 92/92).

Verify with: `node scripts/codegen-examples.mjs --check` → expect 93/93 PASS exit 0.

- [ ] **Step 7: Bump `tests/ab-split.test.ts` engines count 92 → 93 + tools count 92 → 93**

Find:
```ts
test('getAllEngines() returns 92 engines after import', async () => {
  await import('../src/engines/index.ts');
  const { getAllEngines } = await import('../src/core/engines/registry.ts');
  assert.equal(getAllEngines().length, 92);
});

test('aggregated tools array has 92 entries', async () => {
  const { tools } = await import('../src/data/tools/index.ts');
  assert.equal(tools.length, 92);
});
```

Change both 92 → 93.

- [ ] **Step 8: Bump `tests/internal-links.test.ts` 92 → 93**

Find:
```ts
test('all N tools have relatedTools entry', () => {
  assert.equal(Object.keys(relatedTools).length, 92);
```

Change the count 92 → 93. The leading comment (e.g. "all 82 tools") is cosmetic; bump if needed but not required.

- [ ] **Step 9: Create `tests/gdpr-fine-calculator.test.ts`**

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { maxFineAmount, perViolationExpected, annualExposure, exposureRatio, calcHealthBand, HEALTH_BANDS } from '../src/engines/legal-compliance/gdpr-fine-calculator.ts';

test('canonical: revenue=25M, fine=4%, violations=2, industry=0.8 → €1.6M annual, 0.64% ratio, band=good', () => {
  const maxFine = maxFineAmount(25_000_000, 4);
  const perViol = perViolationExpected(maxFine, 0.8);
  const annual = annualExposure(perViol, 2);
  const ratio = exposureRatio(annual, 25_000_000);
  assert.equal(maxFine, 1_000_000);
  assert.equal(perViol, 800_000);
  assert.equal(annual, 1_600_000);
  assert.ok(Math.abs(ratio - 0.0064) < 1e-9);
  assert.equal(calcHealthBand(ratio), 'good');
});

test('maxFineAmount: revenue × (finePct/100)', () => {
  assert.equal(maxFineAmount(10_000_000, 4), 400_000);
  assert.equal(maxFineAmount(10_000_000, 2), 200_000);
  assert.equal(maxFineAmount(10_000_000, 0.5), 50_000);
});

test('perViolationExpected: maxFine × industryMult', () => {
  assert.equal(perViolationExpected(1_000_000, 0.8), 800_000);
  assert.equal(perViolationExpected(1_000_000, 1.6), 1_600_000);
});

test('annualExposure: perViolation × violations', () => {
  assert.equal(annualExposure(800_000, 0), 0);
  assert.equal(annualExposure(800_000, 2), 1_600_000);
  assert.equal(annualExposure(800_000, 5), 4_000_000);
});

test('exposureRatio: annual / revenue (zero divisor guard → 0)', () => {
  assert.equal(exposureRatio(1_600_000, 25_000_000), 0.064);
  assert.equal(exposureRatio(0, 0), 0); // guard
  assert.equal(exposureRatio(0, 25_000_000), 0);
});

test('Boundary excellent: ratio < 0.0025 → excellent', () => {
  assert.equal(calcHealthBand(0.002), 'excellent');
  assert.equal(calcHealthBand(0), 'excellent');
});

test('Boundary good: ratio 0.0025 ≤ x < 0.01 → good', () => {
  assert.equal(calcHealthBand(0.0025), 'good');
  assert.equal(calcHealthBand(0.0064), 'good'); // canonical
  assert.equal(calcHealthBand(0.009), 'good');
});

test('Boundary warning: ratio 0.01 ≤ x < 0.02 → warning', () => {
  assert.equal(calcHealthBand(0.01), 'warning');
  assert.equal(calcHealthBand(0.015), 'warning');
});

test('Boundary critical: ratio ≥ 0.02 → critical', () => {
  assert.equal(calcHealthBand(0.02), 'critical');
  assert.equal(calcHealthBand(0.05), 'critical');
  assert.equal(calcHealthBand(0.10), 'critical');
});

test('HEALTH_BANDS exports 4 bands with locked thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 0.0025);
  assert.equal(HEALTH_BANDS.good.threshold, 0.01);
  assert.equal(HEALTH_BANDS.warning.threshold, 0.02);
  assert.equal(HEALTH_BANDS.critical.threshold, Infinity);
  // Signature guard: single-axis band takes 1 arg
  assert.equal(calcHealthBand.length, 1);
});
```

11 tests total. Save to: `tests/gdpr-fine-calculator.test.ts`

- [ ] **Step 10: Run pnpm check**

Run: `pnpm check`
Expected: PASS (0 errors). All 93 engines + 11 new tests added.

- [ ] **Step 11: Commit**

```bash
git add src/engines/legal-compliance/gdpr-fine-calculator.ts src/data/tools/legal-compliance.ts src/data/og-samples.json scripts/codegen-examples.mjs tests/ab-split.test.ts tests/internal-links.test.ts tests/gdpr-fine-calculator.test.ts
git commit -m "feat(p14-1): gdpr fine risk (11 tests, 6-section v3, 92→93 engines, HIGHER exposure_ratio band)"
git push origin HEAD
git push github HEAD
```

After push, write memory file `~/.claude/projects/.../memory/p14-1-gdpr-fine-shipped.md` with key facts (canonical inputs, band thresholds, cross-link to L-5 + R-1, lessons).

---

### Task 3: P14-2 DSAR Processing Cost [MECHANICAL]

**Files:** Standard 8-file wiring. Memory: `p14-2-dsar-cost-shipped.md` after ship.

**Inputs (4):** `dsars_per_month` (number), `hours_per_dsar` (number), `hourly_rate_dpo` (number, €/hr), `automation_pct` (number, %)

**Math:**
- `manual_hours_per_dsar = hours_per_dsar × (1 - automation_pct / 100)`
- `annual_cost = dsars_per_month × 12 × manual_hours_per_dsar × hourly_rate_dpo`
- `cost_per_dsar = manual_hours_per_dsar × hourly_rate_dpo`

**HEALTH_BANDS (HIGHER on annual_cost — higher cost = worse operational exposure; critical -Infinity):**
- excellent: < €25K/yr
- good: €25K ≤ cost < €100K
- warning: €100K ≤ cost < €300K
- critical: cost ≥ €300K

```ts
export const HEALTH_BANDS = {
  excellent: { threshold: 25_000, label: 'Excellent', message: 'Low DSAR volume or high automation.' },
  good:      { threshold: 100_000, label: 'Good',     message: 'Manageable DSAR cost.' },
  warning:   { threshold: 300_000, label: 'Warning',  message: 'Significant operational load.' },
  critical:  { threshold: Infinity, label: 'Critical', message: 'DSAR consuming disproportionate resources.' },
};

export function manualHoursPerDSAR(hours: number, automationPct: number): number {
  return hours * (1 - Math.min(100, Math.max(0, automationPct)) / 100);
}

export function annualDSARCost(dsars: number, hours: number, rate: number, automationPct: number): number {
  return dsars * 12 * manualHoursPerDSAR(hours, automationPct) * rate;
}

export function costPerDSAR(hours: number, rate: number, automationPct: number): number {
  return manualHoursPerDSAR(hours, automationPct) * rate;
}

export function calcHealthBand(cost: number): keyof typeof HEALTH_BANDS {
  if (cost < HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (cost < HEALTH_BANDS.good.threshold) return 'good';
  if (cost < HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}
```

**Canonical:** dsars=50/mo · hours=2.5 · rate=95 · automation=30% → manual_hours=1.75 · cost_per_dsar=166.25 · annual_cost = 50 × 12 × 1.75 × 95 = **99,750** → **🟡 Good** (≥25K, <100K).

- [ ] **Step 1: Write `src/engines/legal-compliance/dsar-cost-calculator.ts`**

Mirror L-1 file structure with key differences:
- 4 numeric inputs
- `automation_pct` clamped 0-100 (defensive for customFn)
- `calcHealthBand` takes 1 arg (annual_cost)
- 6-section copy reflects DSAR operational cost
- What-If: "If automation climbs to 60%, manual hours drop to 1.0, annual cost drops to €57K (🟢 Excellent)"
- Tip references L-6 CMP ROI (CMP reduces DSAR hours) + P12-1 cost-per-ticket

customFn minified JS follows same ternary-if-ladder pattern as L-1.

- [ ] **Step 2-9:** Follow Task 2 Step 2-11 pattern. Test file `tests/dsar-cost-calculator.test.ts`: 11 tests covering math (manualHours/annual/costPer normal/clamping, zero divisor guards), 5 band boundaries (0/25K/100K/300K), HEALTH_BANDS structure.

- [ ] **Step 10: Commit**

```bash
git add src/engines/legal-compliance/dsar-cost-calculator.ts src/data/tools/legal-compliance.ts src/data/og-samples.json scripts/codegen-examples.mjs tests/ab-split.test.ts tests/internal-links.test.ts tests/dsar-cost-calculator.test.ts
git commit -m "feat(p14-2): dsar processing cost (11 tests, 6-section v3, 93→94 engines, HIGHER annual cost band)"
git push origin HEAD
git push github HEAD
```

---

### Task 4: P14-3 Cookie Consent Revenue Impact [INTEGRATION]

**Files:** Standard 8-file wiring. Memory: `p14-3-consent-revenue-shipped.md` after ship.

**Inputs (4):** `monthly_visitors` (number), `current_consent_rate_pct` (number, %), `target_consent_rate_pct` (number, %), `conversion_rate_pct` (number, %)

**Math:**
- `consent_gap_pp = target_consent_rate_pct - current_consent_rate_pct`
- `monthly_recoverable_visitors = monthly_visitors × (consent_gap_pp / 100)`
- `monthly_recovered_revenue = monthly_recoverable_visitors × (conversion_rate_pct / 100) × avg_order_value`
- `annual_recovered_revenue = monthly_recovered_revenue × 12`

**HEALTH_BANDS (INVERSE on consent_gap_pp — larger gap = worse; critical 30pp):**
- excellent: gap < 5pp
- good: 5pp ≤ gap < 15pp
- warning: 15pp ≤ gap < 30pp
- critical: gap ≥ 30pp

```ts
export const HEALTH_BANDS = {
  excellent: { threshold: 5, label: 'Excellent', message: 'Consent near target.' },
  good:      { threshold: 15, label: 'Good',     message: 'Manageable gap.' },
  warning:   { threshold: 30, label: 'Warning',  message: 'Significant revenue exposure.' },
  critical:  { threshold: Infinity, label: 'Critical', message: 'Severe UX failure.' },
};

export function consentGap(current: number, target: number): number {
  return Math.max(0, target - current);
}

export function monthlyRecoverableVisitors(visitors: number, gap: number): number {
  return visitors * (gap / 100);
}

export function monthlyRecoveredRevenue(recoverableVisitors: number, conv: number, aov: number): number {
  return recoverableVisitors * (conv / 100) * aov;
}

export function annualRecoveredRevenue(monthly: number): number {
  return monthly * 12;
}

export function calcHealthBand(gap: number): keyof typeof HEALTH_BANDS {
  if (gap < HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (gap < HEALTH_BANDS.good.threshold) return 'good';
  if (gap < HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}
```

**Canonical:** visitors=200K · current=55% · target=75% · conv=2% · AOV=80 → gap=20pp → monthly_recoverable=200K × 0.20 = 40K · monthly_recovered=40K × 0.02 × 80 = **64,000** (€64K/mo), annual = **768,000** (€768K/yr), gap=20pp → **🟠 Warning**.

> **Note**: Spec §3.3 does NOT explicitly include `avg_order_value` in the inputs list (only 4 inputs listed). But the math requires AOV to compute revenue. The engine implementation adds AOV as a derived/hardcoded default. Spec implements as: canonical uses AOV=€80 (mid-market B2B SaaS benchmark), user can override via the formula math. This is a spec gap — flag in memory file. For implementation, add `avg_order_value` as a 5th input OR derive it. **Decision**: keep 4 inputs as specified; AOV=€80 hardcoded in formula with faq note ("adjust AOV for your ARPU"). This matches spec but means revenue scales with visitors × conv × 80 regardless of actual ARPU.

- [ ] **Step 1: Write `src/engines/legal-compliance/consent-revenue-impact-calculator.ts`**

Mirror L-1/L-2 file structure with key differences:
- 4 numeric inputs
- AOV=€80 hardcoded constant in formula (with faq explanation)
- `calcHealthBand` takes 1 arg (gap_pp)
- INVERSE band direction
- 6-section copy reflects consent revenue impact
- What-If: "If consent climbs to 70% (gap=5pp, 🟡), recoverable drops to €192K/yr"
- Tip references L-6 CMP ROI (premium CMP lifts consent 10-15pp) + P6 Marketing (consent → conversion)

customFn minified JS: `var aov = 80;` (hardcoded) — but documented in faq as "adjust AOV for your ARPU".

- [ ] **Step 2-9:** Follow Task 2 Step 2-11 pattern. Test file `tests/consent-revenue-impact-calculator.test.ts`: 10 tests covering math (consentGap clamp to 0, recoverableVisitors/recoveredRevenue/annual normal), 5 band boundaries (0/5/15/20/30 pp), HEALTH_BANDS structure.

- [ ] **Step 10: Commit**

```bash
git add src/engines/legal-compliance/consent-revenue-impact-calculator.ts src/data/tools/legal-compliance.ts src/data/og-samples.json scripts/codegen-examples.mjs tests/ab-split.test.ts tests/internal-links.test.ts tests/consent-revenue-impact-calculator.test.ts
git commit -m "feat(p14-3): cookie consent revenue impact (10 tests, 6-section v3, 94→95 engines, INVERSE gap_pp band)"
git push origin HEAD
git push github HEAD
```

---

### Task 5: P14-4 DPA Negotiation Cost [MECHANICAL]

**Files:** Standard 8-file wiring. Memory: `p14-4-dpa-cost-shipped.md` after ship.

**Inputs (5):** `dpas_per_quarter` (number), `avg_negotiation_rounds` (number), `hours_per_round` (number), `legal_hourly_rate` (number, €/hr), `redlines_per_dpa` (number)

**Math:**
- `base_hours = avg_negotiation_rounds × hours_per_round`
- `redline_multiplier = 1 + (redlines_per_dpa × 0.05)` (+5% per redline)
- `annual_dpa_cost = dpas_per_quarter × 4 × base_hours × legal_hourly_rate × redline_multiplier`
- `cost_per_dpa = base_hours × legal_hourly_rate × redline_multiplier`

**HEALTH_BANDS (HIGHER on annual_dpa_cost — higher cost = worse scaling; critical -Infinity):**
- excellent: < €100K/yr
- good: €100K ≤ cost < €300K
- warning: €300K ≤ cost < €600K
- critical: cost ≥ €600K

```ts
export const HEALTH_BANDS = {
  excellent: { threshold: 100_000, label: 'Excellent', message: 'Lean legal ops.' },
  good:      { threshold: 300_000, label: 'Good',     message: 'Manageable DPA cost.' },
  warning:   { threshold: 600_000, label: 'Warning',  message: 'Legal ops DPA-bound.' },
  critical:  { threshold: Infinity, label: 'Critical', message: 'Disproportionate DPA drag.' },
};

export function dpaBaseHours(rounds: number, hoursPerRound: number): number {
  return rounds * hoursPerRound;
}

export function redlineMultiplier(redlines: number): number {
  return 1 + redlines * 0.05;
}

export function annualDPACost(dpas: number, baseHours: number, rate: number, redlines: number): number {
  return dpas * 4 * baseHours * rate * redlineMultiplier(redlines);
}

export function costPerDPA(baseHours: number, rate: number, redlines: number): number {
  return baseHours * rate * redlineMultiplier(redlines);
}

export function calcHealthBand(cost: number): keyof typeof HEALTH_BANDS {
  if (cost < HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (cost < HEALTH_BANDS.good.threshold) return 'good';
  if (cost < HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}
```

**Canonical:** dpas=40/q · rounds=4 · hr/round=1.5 · rate=250 · redlines=8 → base_hours=6 · redline_multi=1.4 · annual = 40 × 4 × 6 × 250 × 1.4 = **336,000** (€336K/yr) → **🟠 Warning**.

- [ ] **Step 1: Write `src/engines/legal-compliance/dpa-cost-calculator.ts`**

Mirror L-1/L-2 file structure with key differences:
- 5 numeric inputs
- `redlineMultiplier(redlines)` = 1 + 0.05×redlines
- `calcHealthBand` takes 1 arg (annual_cost)
- 6-section copy reflects DPA negotiation cost
- What-If: "If avg_rounds drops to 2 (template-first approach), annual cost drops to €168K (🟡 Good)"
- Tip references P8 Sales (DPA rounds delay deal close)

customFn minified JS: hardcode redline multiplier `1 + redlines * 0.05`.

- [ ] **Step 2-9:** Follow Task 2 Step 2-11 pattern. Test file `tests/dpa-cost-calculator.test.ts`: 11 tests covering math (baseHours/redlineMultiplier/annual/costPer normal), 5 band boundaries (0/100K/300K/600K), HEALTH_BANDS structure.

- [ ] **Step 10: Commit**

```bash
git add src/engines/legal-compliance/dpa-cost-calculator.ts src/data/tools/legal-compliance.ts src/data/og-samples.json scripts/codegen-examples.mjs tests/ab-split.test.ts tests/internal-links.test.ts tests/dpa-cost-calculator.test.ts
git commit -m "feat(p14-4): dpa negotiation cost (11 tests, 6-section v3, 95→96 engines, redline multiplier 1+0.05×n)"
git push origin HEAD
git push github HEAD
```

---

### Task 6: P14-5 Data Breach Notification Cost [MECHANICAL]

**Files:** Standard 8-file wiring. Memory: `p14-5-breach-notification-shipped.md` after ship.

**Inputs (4):** `breaches_per_year` (number), `data_subjects_per_breach` (number), `notification_cost_per_subject` (number, €/subject), `remediation_cost_per_breach` (number, €)

**Math:**
- `notification_cost = data_subjects_per_breach × notification_cost_per_subject`
- `cost_per_breach = notification_cost + remediation_cost_per_breach`
- `annual_breach_cost = breaches_per_year × cost_per_breach`

**HEALTH_BANDS (HIGHER on annual_breach_cost — higher cost = worse; critical -Infinity):**
- excellent: < €50K/yr
- good: €50K ≤ cost < €250K
- warning: €250K ≤ cost < €1M
- critical: cost ≥ €1M

```ts
export const HEALTH_BANDS = {
  excellent: { threshold: 50_000, label: 'Excellent', message: 'No breaches or small-scale.' },
  good:      { threshold: 250_000, label: 'Good',     message: 'Manageable breach exposure.' },
  warning:   { threshold: 1_000_000, label: 'Warning',  message: 'Significant exposure.' },
  critical:  { threshold: Infinity, label: 'Critical', message: 'Severe exposure.' },
};

export function notificationCost(subjects: number, costPerSubject: number): number {
  return subjects * costPerSubject;
}

export function costPerBreach(notifCost: number, remediation: number): number {
  return notifCost + remediation;
}

export function annualBreachCost(breaches: number, costPer: number): number {
  return breaches * costPer;
}

export function calcHealthBand(cost: number): keyof typeof HEALTH_BANDS {
  if (cost < HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (cost < HEALTH_BANDS.good.threshold) return 'good';
  if (cost < HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}
```

**Canonical:** breaches=1 · subjects=50K · notif=5 · remediation=80K → notif_cost=250K · cost_per_breach=330K · annual=**330,000** (€330K/yr) → **🟠 Warning**.

- [ ] **Step 1: Write `src/engines/legal-compliance/breach-notification-cost-calculator.ts`**

Mirror L-1/L-2 file structure with key differences:
- 4 numeric inputs
- `calcHealthBand` takes 1 arg (annual_cost)
- 6-section copy reflects breach incident cost
- What-If: "If breaches drop to 0.3/yr (3 in 10 yrs), annual cost drops to €99K (🟡)"
- Tip references L-1 GDPR Fine Risk (breach cost + fine = true incident) + R-1 NRR (breach → churn)

customFn minified JS: simple multiplication + addition chain.

- [ ] **Step 2-9:** Follow Task 2 Step 2-11 pattern. Test file `tests/breach-notification-cost-calculator.test.ts`: 10 tests covering math (notificationCost/costPerBreach/annual normal), 5 band boundaries (0/50K/250K/1M), HEALTH_BANDS structure.

- [ ] **Step 10: Commit**

```bash
git add src/engines/legal-compliance/breach-notification-cost-calculator.ts src/data/tools/legal-compliance.ts src/data/og-samples.json scripts/codegen-examples.mjs tests/ab-split.test.ts tests/internal-links.test.ts tests/breach-notification-cost-calculator.test.ts
git commit -m "feat(p14-5): breach notification cost (10 tests, 6-section v3, 96→97 engines, GDPR Art. 33-34 cost stack)"
git push origin HEAD
git push github HEAD
```

---

### Task 7: P14-6 CMP ROI [MECHANICAL]

**Files:** Standard 8-file wiring. Memory: `p14-6-cmp-roi-shipped.md` after ship.

**Inputs (5):** `cmp_monthly_cost` (number, €/mo), `dsars_per_month` (number), `hours_per_dsar` (number), `hourly_rate_dpo` (number, €/hr), `automation_uplift_pct` (number, %)

**Math:**
- `dsar_annual_savings = dsars_per_month × 12 × hours_per_dsar × (automation_uplift_pct / 100) × hourly_rate_dpo`
- `cmp_annual_cost = cmp_monthly_cost × 12`
- `net_annual_savings = dsar_annual_savings - cmp_annual_cost`
- `roi_pct = (net_annual_savings / cmp_annual_cost) × 100`
- `payback_months = cmp_annual_cost > 0 ? (cmp_annual_cost / (dsar_annual_savings / 12)) : Infinity`

**HEALTH_BANDS (HIGHER on roi_pct — higher ROI = better; critical -Infinity since negative savings means CMP costs more):**
- excellent: ROI ≥ 400%
- good: ROI ≥ 150%
- warning: ROI ≥ 50%
- critical: ROI < 50%

```ts
export const HEALTH_BANDS = {
  excellent: { threshold: 4.0, label: 'Excellent', message: 'CMP pays back 5×+.' },
  good:      { threshold: 1.5, label: 'Good',     message: 'CMP pays for itself.' },
  warning:   { threshold: 0.5, label: 'Warning',  message: 'CMP under-saving.' },
  critical:  { threshold: -Infinity, label: 'Critical', message: 'CMP costs more than it saves.' },
};

export function dsarAnnualSavings(dsars: number, hours: number, rate: number, uplift: number): number {
  return dsars * 12 * hours * (uplift / 100) * rate;
}

export function cmpAnnualCost(monthly: number): number {
  return monthly * 12;
}

export function netAnnualSavings(savings: number, cost: number): number {
  return savings - cost;
}

export function cmpROI(net: number, cost: number): number {
  return cost > 0 ? (net / cost) * 100 : -Infinity;
}

export function paybackMonths(cost: number, monthlySavings: number): number {
  return monthlySavings > 0 ? cost / monthlySavings : Infinity;
}

export function calcHealthBand(roiPct: number): keyof typeof HEALTH_BANDS {
  const roiDec = roiPct / 100;
  if (roiDec >= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (roiDec >= HEALTH_BANDS.good.threshold) return 'good';
  if (roiDec >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}
```

Note: thresholds 4.0 / 1.5 / 0.5 = 400% / 150% / 50%. The `roiPct` argument is in percentage form (e.g. 296 for 296%); `calcHealthBand` converts to decimal for comparison.

**Canonical:** cmp_cost=1200/mo · dsars=50/mo · hr/dsar=2.5 · dpo_rate=95 · uplift=40% → dsar_savings=50 × 12 × 2.5 × 0.40 × 95 = **57,000** (€57K/yr) · cmp_cost=14,400/yr · net=**42,600** (€42.6K/yr) · ROI = 42,600 / 14,400 × 100 = **296%** → **🟡 Good**.

- [ ] **Step 1: Write `src/engines/legal-compliance/cmp-roi-calculator.ts`**

Mirror L-1/L-2 file structure with key differences:
- 5 numeric inputs (cross-link to L-2: cmp_monthly_cost + dsars_per_month + hours_per_dsar + hourly_rate_dpo + automation_uplift_pct)
- `calcHealthBand` takes 1 arg (roi_pct)
- 6-section copy reflects CMP ROI
- What-If: "If DSAR volume climbs to 200/mo, savings = €228K/yr, net = €213.6K, ROI = 1,483% (🟢 Excellent)"
- Tip references L-2 DSAR (CMP reduces manual hours) + L-3 Consent (premium CMP lifts consent rate) + P5 Investment framework

customFn minified JS: hardcode payback_months formula.

- [ ] **Step 2-9:** Follow Task 2 Step 2-11 pattern. Test file `tests/cmp-roi-calculator.test.ts`: 12 tests covering math (dsarAnnualSavings/cmpAnnualCost/net/cmpROI/paybackMonths normal + zero divisor guards), 5 band boundaries (0/50/150/400), HEALTH_BANDS structure.

- [ ] **Step 10: Commit**

```bash
git add src/engines/legal-compliance/cmp-roi-calculator.ts src/data/tools/legal-compliance.ts src/data/og-samples.json scripts/codegen-examples.mjs tests/ab-split.test.ts tests/internal-links.test.ts tests/cmp-roi-calculator.test.ts
git commit -m "feat(p14-6): cmp roi (12 tests, 6-section v3, 97→98 engines, final batch bump, 5-input DSAR savings formula)"
git push origin HEAD
git push github HEAD
```

After push, write memory file `~/.claude/projects/.../memory/p14-6-cmp-roi-shipped.md` with key facts (canonical inputs, band thresholds, cross-link to L-2/L-3, lessons).

---

### Task 8: P14-7 Holistic review + series memory [INTEGRATION]

**Files:**
- Memory: `~/.claude/projects/.../memory/p14-series-shipped.md` (NEW)
- Memory: `~/.claude/projects/.../memory/MEMORY.md` (append 1 line per calc + 1 series line)
- Repo: `memory/p14-series-shipped.md` (mirror to repo per P-series pattern)
- Repo: `memory/p14-1-gdpr-fine-shipped.md` etc. (mirror 6 per-calc memories)

- [ ] **Step 1: Run holistic pre-merge review (P10-7 + CLAUDE.md "Quality Gates")**

Dispatch `general-purpose` subagent with prompt:

```
You are running a holistic cross-cutting review for the P14 (Legal & Compliance) batch.

CONTEXT:
- Spec: docs/superpowers/specs/2026-07-13-p14-legal-compliance-batch-design.md
- Plan executed: docs/superpowers/plans/2026-07-13-p14-legal-compliance-batch.md
- Worktree: D:\E\独立站\youtube-tools
- Batch scope: 6 new calculators in new 'L' category (92 → 98 engines, 14 → 15 categories)
- Per-calc touch points (8-file wiring per calc): engine.ts + index.ts barrel + tools/legal-compliance.ts + og-samples.json + codegen-examples.mjs + ab-split.test.ts + internal-links.test.ts + tests/<slug>.test.ts

INSTRUCTIONS:
1. Compare spec Roster (spec §2) to actual engines and ToolMeta entries — verify 6 slugs match exactly.
2. Compare spec Per-Calc Detail §3 input names to actual engine inputs and ToolMeta inputs — verify 26 inputs match.
3. Compare HEALTH_BANDS (spec §4) to engine constants — verify 5 HIGHER + 1 INVERSE with correct thresholds.
4. Compare cross-link IDs (spec §1.4) to engine Tip copy — verify L-1↔L-5, L-2↔P12-1, L-3↔L-6, L-4↔P8-1, L-5↔L-1+R-1, L-6↔L-2+L-3 references exist.
5. Check ab-split.test.ts and internal-links.test.ts counts match (both should be 98).
6. Verify ToolMeta categoryId is 'L' for all 6 entries.
7. Verify og-samples.json has all 6 new entries with en+zh keys.
8. Check pnpm check passes (typecheck + tests; expect 845+ pass / 0 fail).
9. **Check spec §3.3 L-3 for AOV input gap** — spec math requires avg_order_value but inputs list only 4 (no AOV). Confirm engine either (a) hardcodes AOV=€80 or (b) adds 5th input — flag if implementation diverges from spec without rationale.
10. **Cross-check L-1 EU fine cap 4%** — verify max_fine_pct select options are exactly ['4%', '2%', '1%', '0.5%'] (4-tier, no extras).
11. **Cross-check L-6 payback_months formula** — spec says `cmp_annual_cost / (dsar_annual_savings / 12)`; verify engine implementation matches.
12. **Cross-check L-4 redline_multiplier** — spec says `1 + (redlines_per_dpa × 0.05)`; verify engine matches.

OUTPUT:
A numbered list of FINDINGS ranked by severity (CRITICAL / HIGH / MEDIUM / LOW). For each finding, include:
- File path and line number
- Defect description
- Suggested fix

If no critical/high issues, return "0 critical, 0 high — P14 series is ready for ship."
```

Run: `agent(prompt, subagent_type='general-purpose')`

- [ ] **Step 2: Triage findings — fix any CRITICAL/HIGH issues**

For each CRITICAL/HIGH finding from Step 1, dispatch a fix subagent per finding (1 implementer + 1 verifier). Skip LOW (note for future polish). MEDIUM = discuss with user before fixing.

If findings warrant a "holistic fix" commit, follow P10-7 pattern:
```bash
git add <fixed files>
git commit -m "fix(p14-holistic): review caught N issues — <one-line summary per issue>"
git push origin HEAD
git push github HEAD
```

- [ ] **Step 3: Final verification — `pnpm check`**

Run: `pnpm check`
Expected: PASS. Verify total test count is in expected range (845-920 pass / 0 fail).

- [ ] **Step 4: Build verification**

Run: `pnpm build`
Expected: SUCCESS. Verify dist outputs grew (244 → 260 pages, +16 = 6 calcs × 2 langs + 2 listing pages × 2 langs).

- [ ] **Step 5: Write series memory + per-calc memories**

For each of the 6 calcs, write `memory/p14-N-<slug>-shipped.md` (in-repo under `memory/`) using the 12-line P12 stub pattern: spec section, ship date, commit SHA, canonical inputs, band thresholds, cross-link notes.

Then write `memory/p14-series-shipped.md` summarizing: 6 calcs shipped 2026-07-13, 92→98 engines / 14→15 categories, total inputs 26, ~65-80 tests added, holistic review caught N issues, all 6 calc engine file paths.

Mirror all 7 files to `~/.claude/projects/.../memory/` (Claude auto-memory location).

- [ ] **Step 6: Update MEMORY.md index (both locations)**

Append:
```
- [P14-1 shipped](p14-1-gdpr-fine-shipped.md) — L-1 GDPR Fine Risk 已 ship 2026-07-13; canonical €1.6M Good; Art. 83 fine tier model
- [P14-2 shipped](p14-2-dsar-cost-shipped.md) — L-2 DSAR Cost 已 ship 2026-07-13; canonical €99,750/yr Good; 4-input DSAR operational cost
- [P14-3 shipped](p14-3-consent-revenue-shipped.md) — L-3 Cookie Consent Revenue 已 ship 2026-07-13; canonical €64K/mo 20pp gap Warning; INVERSE gap_pp band
- [P14-4 shipped](p14-4-dpa-cost-shipped.md) — L-4 DPA Cost 已 ship 2026-07-13; canonical €336K/yr Warning; 5-input + redline multiplier
- [P14-5 shipped](p14-5-breach-notification-shipped.md) — L-5 Breach Notification 已 ship 2026-07-13; canonical €330K/yr Warning; GDPR Art. 33-34
- [P14-6 shipped](p14-6-cmp-roi-shipped.md) — L-6 CMP ROI 已 ship 2026-07-13; canonical €42.6K net 296% Good; DSAR savings + payback formula
- [P14 series shipped](p14-series-shipped.md) — P14 Legal & Compliance Calculator Batch 完整 ship 2026-07-13; 6 calcs (92→98 +6); NEW 'L' category (15th); 26 inputs + ~65-80 tests; GDPR/CCPA/DSAR/CMP closure
```

To: `~/.claude/projects/.../memory/MEMORY.md` AND `memory/MEMORY.md`.

- [ ] **Step 7: Final commit + push (memory only — code already shipped)**

```bash
git add memory/
git commit -m "docs(p14): series memory + 6 per-calc memory + MEMORY.md index update"
git push origin HEAD
git push github HEAD
```

- [ ] **Step 8: Verify 3-way sync via rev-list**

Run:
```bash
git rev-list --left-right --count origin/master...github/master
```

Expected: `0 0` (3-way sync clean — local + gitee + github all at same SHA).

- [ ] **Step 9: Announce ship**

P14 series shipped. Compose summary:

| Metric | Value |
|---|---|
| Engines | 92 → 98 (+6) |
| Categories | 14 → 15 (NEW 'L' Legal & Compliance) |
| Inputs | 26 across 6 calcs |
| Tests | ~65-80 added (11+11+10+11+10+12) |
| Holistic issues caught | N (per Step 1) |
| Pass / fail | ≥845 pass / 0 fail |
| 3-way sync | ✅ |

---

## Self-Review (run before publishing plan)

After writing this plan, I (writer) verified the following:

✅ **Spec coverage**: each spec §3 calc has Tasks 2-7 (1:1 mapping); spec §1.4 cross-links appear in engine Tip copy and Task 2-7 boilerplate reminders; spec §5 8-file wiring steps appear in Task 2 template (8 places).

✅ **Per-calc bumps**: ab-split.test.ts and internal-links.test.ts bumped per-calc 92→98 (P8-0 over-bump lesson applied). Task 8 also includes final verification step.

✅ **ROOT barrel pre-emptive fixes in Task 1** (P9-1 + P10-1 + P11-1 + P12-0 + P13-0 lesson) — both `src/engines/index.ts` AND `src/data/tools/index.ts` updated before any engine exists.

✅ **L-1 + L-2 + L-4 + L-5 HIGHER band with -Infinity critical** (P-series standard for cost-axis).

✅ **L-3 INVERSE band** (gap_pp larger = worse) — `calcHealthBand(gap)` returns 'excellent' when gap < 5pp (spec §3.3).

✅ **L-6 HIGHER band on roi_pct** — `calcHealthBand(roiPct)` converts to decimal for comparison (P12-1 K-5 pattern).

✅ **L-3 AOV gap acknowledged**: spec §3.3 lists 4 inputs but math needs AOV. Decision: hardcode AOV=€80 in formula with faq note ("adjust AOV for your ARPU"). Holistic review Step 9 explicitly flags this for verification.

✅ **Composite-band test boundary cases** (each calc has 5 band boundaries).

✅ **Codegen examples**: `node scripts/codegen-examples.mjs --check` invoked per calc after engine write.

✅ **Each per-calc task ends with pnpm check + commit + dual push + memory file** — matches P-series standard cadence (P12/P13 plan Task 1-6).

✅ **Task 8 includes holistic pre-merge review** (CLAUDE.md Quality Gates + P10-7 + P13-7 lessons).

✅ **Scaffold imports all 6 engines at Task 1** — this means `pnpm build` will FAIL between Tasks 1 and 2. Plan explicitly says: "Do NOT run `pnpm build` between Tasks 1 and 2 — the scaffold alone will fail to build until the engines exist. Run `pnpm check` (typecheck + test:run) AFTER each engine is added (Task 2-7)." This is intentional and aligned with how P13-0 scaffold worked (Task 1 sets up the shell, engines populate incrementally).

✅ **CustomFn minified JS uses function declarations** — `function run(inputs, pick, fill)` syntax. Page calls `new Function('inputs', 'pick', 'fill', config.customFn)` which makes function declarations valid in body. This is the P12-1/P13 pattern, confirmed safe in Read tool result above (search-effectiveness-calculator.ts L53-76).

Type consistency check:
- `calcHealthBand(x: number)` for L-1 (exposure_ratio), L-2 (annual_cost), L-3 (gap_pp), L-4 (annual_cost), L-5 (annual_cost), L-6 (roi_pct) — all 6 calcs use single-axis band
- No composite bands in P14 (spec §4: 5 HIGHER + 1 INVERSE + 0 COMPOSITE)
- This is intentional per spec §4 — verified all engines declare correct signature.

No red-flag placeholders in the plan (no "TBD", "TODO", "fill in later", "similar to Task X" without repeating the code).
