# Plan 1: EEAT 全站 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inject EEAT signals (Reviewed By / Author / Last Updated / Sources) into all 32 tool pages via ToolMeta + UI trust block + JSON-LD author/dateModified/reviewedBy.

**Architecture:** ToolMeta extends with 4 EEAT fields. 32 tools fill the fields with category-specific sources. New `<EeatTrustBlock />` component renders at bottom of each tool page. JSON-LD SoftwareApplication extends with author/dateModified/reviewedBy/publisher. New build-time script `scripts/check-i18n-completeness.mjs` validates 10 new `eeat.*` i18n keys exist.

**Tech Stack:** Astro 4.16 static SSG · TypeScript 5.6 strict · Node 20+ · node:test (tsx runner) · Tailwind 4

**Task classification:** `[INTEGRATION]` × 3 (multi-file: 6 tools/*.ts + ToolMeta + new component + [slug].astro + i18n + 2 new scripts + test) — requires 2 reviewers (spec compliance + code quality)

**Predecessor spec:** `docs/superpowers/specs/2026-06-27-content-depth-pages-design.md` (commit `068cfe6`)

---

## File Structure

| File | Operation | Purpose |
|---|---|---|
| `src/data/tools/types.ts` | Modify | Add 4 EEAT fields to `ToolMeta` |
| `src/data/tools/saas.ts` | Modify | 5 tools × 4 EEAT fields |
| `src/data/tools/ai-cost.ts` | Modify | 8 tools × 4 EEAT fields |
| `src/data/tools/valuation.ts` | Modify | 9 tools × 4 EEAT fields |
| `src/data/tools/freelance.ts` | Modify | 3 tools × 4 EEAT fields |
| `src/data/tools/cost.ts` | Modify | 3 tools × 4 EEAT fields |
| `src/data/tools/investment.ts` | Modify | 4 tools × 4 EEAT fields |
| `src/components/EeatTrustBlock.astro` | Create | UI trust block component |
| `src/pages/[lang]/[slug].astro` | Modify | Import + render EeatTrustBlock + extend SoftwareApplication JSON-LD |
| `src/i18n/translations.ts` | Modify | Add 10 `eeat.*` keys (5 keys × 2 lang) |
| `scripts/check-i18n-completeness.mjs` | Create | Build-time i18n key validator |
| `tests/seo-schemas.test.ts` | Create | JSON-LD structure assertions for 32 tools |
| `package.json` | Modify | Add `check:i18n` script + wire to `check` |

**32 tools × 4 EEAT fields = 128 fields total**. Field values are **uniform** by category (see Task 1 table below).

---

## Task 1: Data layer — ToolMeta + 32 tool EEAT fields

**Files:**
- Modify: `src/data/tools/types.ts`
- Modify: `src/data/tools/{saas,ai-cost,valuation,freelance,cost,investment}.ts`

- [ ] **Step 1.1: Extend ToolMeta interface**

Open `src/data/tools/types.ts` and replace its full contents with:

```ts
export interface ToolInput {
  name: string;
  label: string;
  placeholder: string;
  type: 'text' | 'select' | 'number';
  options?: string[];
}

export interface ClientConfig {
  type: 'templates' | 'combinations' | 'custom';
  templates?: string[];
  patterns?: string[];
  wordPools: Record<string, string[]>;
  customFn?: string; // JS function body for type='custom', receives (inputs, pick, fill)
}

export interface ToolEngine {
  slug: string;
  title: string;
  description: string;
  inputs: ToolInput[];
  clientConfig: ClientConfig;
  generate(inputs: Record<string, string>): string[];
  staticExamples: string[];
  faq: { q: string; a: string }[];
  howToUse: string[];
  dataLastUpdated?: string; // ISO date (YYYY-MM-DD) — shown as a "pricing data" badge for dynamic calculators
}

export interface ToolMeta {
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  applicationCategory: string;
  inputs: { name: string; label: string; placeholder: string; type: 'text' | 'select' | 'number'; options?: string[] }[];
  keywords: string[];
  tags: string[];
  // EEAT (added 2026-06-27, P0 content-depth spec)
  reviewedBy: string;        // e.g. 'ForgeFlowKit Team'
  author: string;            // e.g. 'ForgeFlowKit'
  dataReviewedAt: string;    // ISO date YYYY-MM-DD
  sources: string[];         // e.g. ['LiteLLM Pricing', 'Stripe Docs', 'HubSpot Benchmarks']
}
```

- [ ] **Step 1.2: Verify TS compile error after field addition (expected — fills pending)**

Run: `pnpm exec tsc --noEmit 2>&1 | head -20`
Expected: 32 errors of form `Property 'reviewedBy' is missing in type ...` — this is the gate that enforces we fill all 32 tools before shipping.

- [ ] **Step 1.3: Append EEAT fields to 5 saas tools**

Open `src/data/tools/saas.ts`. For **each of 5 tools** (burn-rate, churn-rate, market-size, mrr, revenue-projector), insert **before the closing `},`**:

```ts
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-06-22',
    sources: ['Stripe Documentation', 'HubSpot Marketing Benchmarks', 'OpenView SaaS Benchmarks 2026'],
```

Example (saas.ts line 19-21, before `},`):

```ts
    keywords: ['cash flow', 'runway', 'burn rate', 'saas metrics', 'startup finance', 'operating cost'],
    tags: ['saas', 'finance', 'runway'],
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-06-22',
    sources: ['Stripe Documentation', 'HubSpot Marketing Benchmarks', 'OpenView SaaS Benchmarks 2026'],
  },
```

- [ ] **Step 1.4: Append EEAT fields to 8 ai-cost tools**

Open `src/data/tools/ai-cost.ts`. For each of 8 tools (ai-api-cost-comparison, ai-image-generation-cost-calculator, ai-training-cost-estimator, claude-api-cost-calculator, deepseek-api-cost-calculator, gemini-api-cost-calculator, gpu-cloud-cost-calculator, openai-token-calculator), insert before each closing `},`:

```ts
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-06-22',
    sources: ['LiteLLM Pricing (litellm/model_prices_and_context_window.json)', 'OpenAI API Pricing', 'Anthropic API Pricing'],
```

- [ ] **Step 1.5: Append EEAT fields to 9 valuation tools**

Open `src/data/tools/valuation.ts`. For each of 9 tools (break-even, cac, course-pricing, email-list-revenue, ltv, project-profitability, saas-pricing-planner, saas-valuation, unit-economics), insert:

```ts
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-06-22',
    sources: ['SaaS Capital Benchmarks', 'Equidam Valuation Method', 'Visible.vc Reports'],
```

- [ ] **Step 1.6: Append EEAT fields to 3 freelance tools**

Open `src/data/tools/freelance.ts`. For each of 3 tools (affiliate-income, freelance-rate, hourly-vs-fixed), insert:

```ts
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-06-22',
    sources: ['Glassdoor Salary Data', 'Upwork Rate Insights', 'Contena Freelance Reports'],
```

- [ ] **Step 1.7: Append EEAT fields to 3 cost tools**

Open `src/data/tools/cost.ts`. For each of 3 tools (employee-cost, meeting-cost, productivity-score), insert:

```ts
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-06-22',
    sources: ['BLS Employer Costs for Employee Compensation', 'Harvard Business Review', 'ZipRecruiter Salary Data'],
```

- [ ] **Step 1.8: Append EEAT fields to 4 investment tools**

Open `src/data/tools/investment.ts`. For each of 4 tools (equity-dilution, freelance-tax, sponsorship-rate, time-value), insert:

```ts
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-06-22',
    sources: ['IRS Tax Statistics', 'Klear Influencer Sponsorship Rates', 'Indeed Salary Benchmarks'],
```

- [ ] **Step 1.9: Verify tsc passes (32 errors → 0 errors)**

Run: `pnpm exec tsc --noEmit 2>&1 | head -20`
Expected: `0 errors`. If any error, return to Step 1.3-1.8 for the failing tool.

- [ ] **Step 1.10: Spot-check 3 tools**

Run:
```bash
node -e "import('./src/data/tools/saas.ts').then(m => console.log(JSON.stringify(m.tools[0], null, 2)))"
```
Expected: 4 EEAT fields present, `dataReviewedAt === '2026-06-22'`, `sources` array length 3.

Repeat for `ai-cost.ts` (tool[3] = claude) and `valuation.ts` (tool[0] = break-even).

- [ ] **Step 1.11: Commit**

```bash
git add src/data/tools/types.ts src/data/tools/*.ts
git commit -m "feat(tools): add 4 EEAT fields to ToolMeta + fill 32 tools (reviewedBy/author/dataReviewedAt/sources)"
```

---

## Task 2: i18n + 10 `eeat.*` keys

**Files:**
- Modify: `src/i18n/translations.ts`

- [ ] **Step 2.1: Locate insertion point in translations.ts**

Run: `grep -n "^export const translations" src/i18n/translations.ts | head -1`
Expected output: a line number pointing to the start of the translations object.

Run: `grep -n "^  'eeat\." src/i18n/translations.ts | head -5`
Expected output: empty (no eeat.* keys exist yet).

- [ ] **Step 2.2: Find a safe insertion anchor**

Search for a key near the end of the translations object. The convention is alphabetical by namespace.

Run: `grep -n "^  '[a-z]\+:" src/i18n/translations.ts | tail -10`
Expected: shows last few namespace roots like `tools`, `cookie`, `footer`, etc.

Pick the alphabetically last namespace as insertion anchor. We insert `eeat.*` BEFORE that line.

- [ ] **Step 2.3: Insert 10 eeat.* keys**

Insert this block (10 keys × 2 lang = 20 entries) just before the last namespace anchor:

```ts
  'eeat.title': { en: 'Editorial Standards', zh: '编辑标准' },
  'eeat.reviewed_by': { en: 'Reviewed by', zh: '审核人' },
  'eeat.last_reviewed': { en: 'Last reviewed', zh: '最后审核' },
  'eeat.sources': { en: 'Data sources', zh: '数据来源' },
  'eeat.suggest_improvement': { en: 'Suggest an improvement', zh: '提交改进建议' },
  'eeat.suggest_body': { en: 'Found inaccurate data or have a question? We respond within 48 hours.', zh: '发现数据不准或有疑问？我们 48 小时内回复。' },
  'eeat.team': { en: 'ForgeFlowKit Team', zh: 'ForgeFlowKit 团队' },
  'eeat.author_label': { en: 'Author', zh: '作者' },
  'eeat.publisher_label': { en: 'Publisher', zh: '发布者' },
  'eeat.contact_email': { en: 'hello@forgeflowkit.com', zh: 'hello@forgeflowkit.com' },
```

- [ ] **Step 2.4: Verify insertion**

Run: `grep -nE "^  'eeat\." src/i18n/translations.ts | wc -l`
Expected: `10` (one per key).

- [ ] **Step 2.5: Commit**

```bash
git add src/i18n/translations.ts
git commit -m "feat(i18n): add 10 eeat.* keys for trust block (en + zh)"
```

---

## Task 3: EeatTrustBlock component + [slug].astro integration

**Files:**
- Create: `src/components/EeatTrustBlock.astro`
- Modify: `src/pages/[lang]/[slug].astro` (insert import + UI block + extend JSON-LD)

- [ ] **Step 3.1: Create EeatTrustBlock.astro**

Create file `src/components/EeatTrustBlock.astro`:

```astro
---
import { t, getLang } from '../i18n';

export interface Props {
  reviewedBy: string;
  dataReviewedAt: string;
  sources: string[];
  author: string;
}

const { reviewedBy, dataReviewedAt, sources, author } = Astro.props;
const lang = getLang(Astro);
const contactEmail = t('eeat.contact_email', lang);
---

<aside class="mt-12 p-6 bg-gray-50 border border-gray-200 rounded-2xl" aria-label={t('eeat.title', lang)}>
  <div class="flex items-center gap-2 mb-3">
    <span class="text-green-600 text-lg">✓</span>
    <h3 class="text-sm font-bold text-gray-900 uppercase tracking-wide">{t('eeat.title', lang)}</h3>
  </div>
  <dl class="space-y-2 text-sm text-gray-700">
    <div class="flex gap-2">
      <dt class="font-semibold min-w-[110px]">{t('eeat.reviewed_by', lang)}:</dt>
      <dd>{reviewedBy || t('eeat.team', lang)}</dd>
    </div>
    <div class="flex gap-2">
      <dt class="font-semibold min-w-[110px]">{t('eeat.author_label', lang)}:</dt>
      <dd>{author || 'ForgeFlowKit'}</dd>
    </div>
    {dataReviewedAt && (
      <div class="flex gap-2">
        <dt class="font-semibold min-w-[110px]">{t('eeat.last_reviewed', lang)}:</dt>
        <dd>{dataReviewedAt}</dd>
      </div>
    )}
    {sources.length > 0 && (
      <div class="flex gap-2">
        <dt class="font-semibold min-w-[110px]">{t('eeat.sources', lang)}:</dt>
        <dd>{sources.join(', ')}</dd>
      </div>
    )}
  </dl>
  <p class="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
    📧 <a href={`mailto:${contactEmail}`} class="text-[#7C3AED] hover:underline font-medium">{t('eeat.suggest_improvement', lang)}</a>
    <span class="block mt-1 text-xs text-gray-500">{t('eeat.suggest_body', lang)}</span>
  </p>
</aside>
```

- [ ] **Step 3.2: Import EeatTrustBlock in [slug].astro**

Open `src/pages/[lang]/[slug].astro`. Find the existing import block (top 10 lines). After the existing `import RelatedTools from '../../components/RelatedTools.astro';` line, add:

```ts
import EeatTrustBlock from '../../components/EeatTrustBlock.astro';
```

- [ ] **Step 3.3: Extend SoftwareApplication JSON-LD**

In the same file, find the `SoftwareApplication` JSON-LD block (around line 95-100, between the `FAQPage` and `BreadcrumbList` blocks). The block currently ends with `provider: { '@id': 'https://forgeflowkit.com/#org' },` followed by `},`. **Replace the closing `},`** of the SoftwareApplication block with:

```ts
      provider: { '@id': 'https://forgeflowkit.com/#org' },
      author: { '@type': 'Organization', name: toolMeta.author, url: 'https://forgeflowkit.com/' },
      dateModified: toolMeta.dataReviewedAt,
      reviewedBy: { '@type': 'Organization', name: toolMeta.reviewedBy },
      publisher: { '@id': 'https://forgeflowkit.com/#org' },
    },
```

(The `,` after `provider` line stays; we just inject 4 new lines before the closing `},`.)

- [ ] **Step 3.4: Render EeatTrustBlock in tool page**

Find the line `<RelatedTools tools={related.map(...)} />` (around line 979). **After** that line, insert:

```astro
        <EeatTrustBlock
          reviewedBy={toolMeta.reviewedBy}
          author={toolMeta.author}
          dataReviewedAt={toolMeta.dataReviewedAt}
          sources={toolMeta.sources}
        />
```

- [ ] **Step 3.5: Build & verify**

Run: `pnpm build 2>&1 | tail -10`
Expected: `Complete! 141 pages generated.` (count unchanged — we add 0 new pages in Plan 1).

- [ ] **Step 3.6: Spot-check 3 tool pages for EEAT**

Run:
```bash
grep -l "reviewedBy" dist/en/solopreneur-mrr-calculator/index.html
grep -l "Editorial Standards" dist/en/solopreneur-mrr-calculator/index.html
grep -l "LiteLLM" dist/en/solopreneur-openai-token-calculator/index.html
grep -l "HubSpot" dist/en/solopreneur-burn-rate-calculator/index.html
```
Expected: all 4 commands exit 0 (file found).

- [ ] **Step 3.7: Visual sanity (one page) — optional but recommended**

Run: `pnpm preview &` then `curl -s http://localhost:4321/en/solopreneur-mrr-calculator/ | grep -A 2 "Editorial Standards" | head -10`
Expected: see `Editorial Standards` text and trust block HTML.
Then kill preview: `pkill -f "astro preview" || true`

- [ ] **Step 3.8: Commit**

```bash
git add src/components/EeatTrustBlock.astro src/pages/\[lang\]/\[slug\].astro
git commit -m "feat(seo): EEAT trust block + JSON-LD author/dateModified/reviewedBy for 32 tools"
```

---

## Task 4: Build-time i18n completeness check + automated schema test

**Files:**
- Create: `scripts/check-i18n-completeness.mjs`
- Create: `tests/seo-schemas.test.ts`
- Modify: `package.json` (add `check:i18n` script + wire to `check`)

- [ ] **Step 4.1: Create check-i18n-completeness.mjs**

Create file `scripts/check-i18n-completeness.mjs`:

```js
#!/usr/bin/env node
/**
 * Build-time i18n key completeness check.
 * Scans src/i18n/translations.ts for required keys.
 * Exits 1 if any required key is missing.
 *
 * Plan 1 (EEAT): validates eeat.* keys.
 * Plan 2 (About) and Plan 3 (Category) extend REQUIRED_KEYS with their own keys.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const translationsPath = resolve(root, 'src/i18n/translations.ts');

const REQUIRED_KEYS = {
  eeat: [
    'eeat.title',
    'eeat.reviewed_by',
    'eeat.last_reviewed',
    'eeat.sources',
    'eeat.suggest_improvement',
    'eeat.suggest_body',
    'eeat.team',
    'eeat.author_label',
    'eeat.publisher_label',
    'eeat.contact_email',
  ],
  // Plan 2 will add: about.mission.h1, about.mission.body, ... × 6 sections
  // Plan 3 will add: category.{A-F}.intro.{1-3}, ...faq.q{1-5}, ...guide.{1-3}, header.categories
};

const src = readFileSync(translationsPath, 'utf-8');
const missing = [];

for (const [group, keys] of Object.entries(REQUIRED_KEYS)) {
  for (const key of keys) {
    // Match: 'key': { en: '...', zh: '...' } — key can contain dots
    const re = new RegExp(`'${key.replace(/\./g, '\\.')}':\\s*\\{`, 'm');
    if (!re.test(src)) {
      missing.push(`  [${group}] ${key}`);
    }
  }
}

if (missing.length > 0) {
  console.error(`❌ i18n completeness check failed. Missing ${missing.length} key(s):`);
  for (const k of missing) console.error(k);
  process.exit(1);
}

const total = Object.values(REQUIRED_KEYS).flat().length;
console.log(`✅ i18n completeness check passed (${total} required keys present).`);
```

- [ ] **Step 4.2: Run the script to verify it passes**

Run: `node scripts/check-i18n-completeness.mjs`
Expected: `✅ i18n completeness check passed (10 required keys present).`

- [ ] **Step 4.3: Verify the script catches missing keys (mutation test)**

Run: `node -e "const fs = require('fs'); const p = 'src/i18n/translations.ts'; const s = fs.readFileSync(p, 'utf-8'); fs.writeFileSync(p, s.replace(\"'eeat.title':\", \"'eeat._temp_disabled':\"));"
node scripts/check-i18n-completeness.mjs`
Expected: exit 1, output includes `eeat.title`.

Restore:
```bash
git checkout src/i18n/translations.ts
```
Expected: file restored, script now passes again.

- [ ] **Step 4.4: Create seo-schemas.test.ts**

Create file `tests/seo-schemas.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tools } from '../src/data/tools/index.ts';
import { categories } from '../src/data/categories.ts';

const distDir = resolve(process.cwd(), 'dist');

function extractJsonLd(html: string): any[] {
  const blocks: any[] = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try { blocks.push(JSON.parse(m[1])); } catch { /* skip malformed */ }
  }
  return blocks;
}

test('EEAT — every tool page HTML has SoftwareApplication with author/dateModified/reviewedBy', { skip: !existsSync(distDir) }, () => {
  for (const tool of tools) {
    const path = resolve(distDir, 'en', tool.slug, 'index.html');
    assert.ok(existsSync(path), `dist missing: ${path}`);
    const html = readFileSync(path, 'utf-8');
    const blocks = extractJsonLd(html);
    const graph = blocks.flatMap(b => b['@graph'] ?? [b]);
    const sa = graph.find(b => b['@type'] === 'SoftwareApplication');
    assert.ok(sa, `${tool.slug}: no SoftwareApplication schema`);
    assert.ok(sa.author, `${tool.slug}: missing author`);
    assert.equal(sa.author['@type'], 'Organization', `${tool.slug}: author should be Organization`);
    assert.ok(sa.dateModified, `${tool.slug}: missing dateModified`);
    assert.match(sa.dateModified, /^\d{4}-\d{2}-\d{2}$/, `${tool.slug}: dateModified must be YYYY-MM-DD`);
    assert.ok(sa.reviewedBy, `${tool.slug}: missing reviewedBy`);
    assert.equal(sa.reviewedBy['@type'], 'Organization', `${tool.slug}: reviewedBy should be Organization`);
  }
});

test('EEAT — author is uniform ForgeFlowKit across 32 tools', { skip: !existsSync(distDir) }, () => {
  for (const tool of tools) {
    assert.equal(tool.author, 'ForgeFlowKit', `${tool.slug}: author must be ForgeFlowKit`);
    assert.equal(tool.reviewedBy, 'ForgeFlowKit Team', `${tool.slug}: reviewedBy must be ForgeFlowKit Team`);
    assert.match(tool.dataReviewedAt, /^\d{4}-\d{2}-\d{2}$/, `${tool.slug}: dataReviewedAt must be YYYY-MM-DD`);
    assert.ok(Array.isArray(tool.sources) && tool.sources.length >= 2, `${tool.slug}: sources must be array of 2+ items`);
  }
});
```

- [ ] **Step 4.5: Run schema test**

Run: `node --import tsx tests/seo-schemas.test.ts 2>&1 | tail -20`
Expected: `# tests 2 / pass 2 / fail 0` (or equivalent — both pass).

- [ ] **Step 4.6: Wire check:i18n into package.json**

Open `package.json`. Find the `"check":` script (line 18). Replace it with:

```json
    "check": "node scripts/check-i18n-completeness.mjs && node scripts/codegen-examples.mjs --check && node scripts/codegen-customfn.mjs --check",
```

Add new scripts (after `check:customfn`):

```json
    "check:i18n": "node scripts/check-i18n-completeness.mjs",
    "test:schemas": "node --import tsx tests/seo-schemas.test.ts",
```

- [ ] **Step 4.7: Verify pnpm check passes end-to-end**

Run: `pnpm check 2>&1 | tail -10`
Expected: exit 0. Output includes `i18n completeness check passed`.

- [ ] **Step 4.8: Commit**

```bash
git add scripts/check-i18n-completeness.mjs tests/seo-schemas.test.ts package.json
git commit -m "feat(ci): i18n completeness check + 32-tool SEO schema test"
```

---

## Final Acceptance Checklist

After all 4 tasks complete:

- [ ] `pnpm check` exit 0
- [ ] `pnpm test:unit` exit 0 (all existing 36 tests + new 2 SEO tests pass)
- [ ] `pnpm build` succeeds, 141 pages
- [ ] `node scripts/check-i18n-completeness.mjs` exit 0
- [ ] Spot-check 3 tool pages (one per category): all show `Editorial Standards` + reviewedBy/dateReviewedAt/sources
- [ ] Schema Markup Validator抽样 5 tool pages: SoftwareApplication contains `author`, `dateModified`, `reviewedBy`, `publisher`
- [ ] No diff in 32 engines (`git diff src/engines/` should be empty)
- [ ] No diff in 64 blog pages (no blog change in this plan)
- [ ] `git status` clean (no untracked except .superpowers/brainstorm/ and historical untracked plan files)

## Rollback

If Plan 1 ships and breaks something:
```bash
git revert <plan1-last-commit-sha>..<plan1-first-commit-sha>  # 4 commits total
```

This restores:
- ToolMeta to 8-field (no EEAT)
- 32 tools to pre-EEAT state
- EeatTrustBlock deleted
- [slug].astro JSON-LD back to no author/dateModified
- check-i18n-completeness.mjs deleted
- seo-schemas.test.ts deleted
- package.json scripts back to pre-plan

## Notes for Implementer

- **Do NOT modify engines/** (32 engines in 6 subdirs) — business logic frozen.
- **Do NOT modify blog-posts.ts** — not in this plan's scope.
- **Do NOT touch i18n keys other than eeat.*** — Plan 2/3 will add their own.
- **TS strict is your friend**: the 32 errors at Step 1.2 are the gate. Don't bypass.
- **Sources values**: the 3 sources per category are recommended, not exhaustive. Implementer can substitute equivalent reputable sources if the listed ones don't apply.
- **dataReviewedAt uniformity**: all 32 tools use `2026-06-22` (the ChatGPT feedback review date). Future quarterly reviews will bump this for the whole batch.
- **The 128 EEAT fields = 32 × 4 = 128 lines of insertion**. Steps 1.3-1.8 total 32 × 4 = 128 lines added. Mostly mechanical.
