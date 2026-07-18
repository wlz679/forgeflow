# P17b i18n Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the ~1998-key i18n backfill gap (FAQ q/a + how-to-use + niche input labels) and ship an `engineKey: true` opt-in marker that gates engine-level i18n completeness via pre-commit.

**Architecture:**
- Extend `scripts/check-i18n-completeness.mjs` to consume `scripts/extract-i18n-needed.mjs` output and validate engine-level keys (input.{name}.label|placeholder, faq.{i}.q|a, how_to_use.{i})
- Add `engineKey?: boolean` opt-in field to `ToolEngine` type — engines with this flag set must have all required keys in `translations.ts`
- Add `scripts/insert-translations.mjs` helper to bulk-insert JSON translation entries into `translations.ts` (alphabetical group ordering preserved)
- Per-category-batch subagent translation: each subagent gets a fresh context with engine list + extract JSON + ZH terminology guidance; returns JSON `{key: zh}` for the orchestrator to insert
- Pre-commit hook already wired (P17); no further hook changes needed — `engineKey=true` + missing keys triggers exit 1 via extended check script

**Tech Stack:** Node.js scripts, TypeScript, existing i18n pattern (`src/i18n/translations.ts`)

## Global Constraints

- **Defensive language**: ZH translations must be professional business terminology (no machine-translation artifacts, no character substitutions like "数量 of Epochs"). Use exact-match dictionary pattern from P17 (no substring replace).
- **Per-engine slug**: Use `src/data/tools/{slug}.ts` as canonical key namespace. NEVER use file name; engines like `productivity-ramp-calculator.ts` have slug `solopreneur-productivity-ramp-curve-calculator`. The extract script already does this resolution.
- **Schema preservation**: Existing 411 keys MUST NOT regress. New keys added in same `translations.ts` alphabetical group per their category (use `insert-translations.mjs` for bulk insert).
- **engineKey semantics**: `engineKey: true` = OPT-IN signal "all engine-level i18n keys present". Pre-P17b engines default to NOT set (legacy compat). P17b marks them `true`. Future engines should set this flag after translating keys.
- **Subagent isolation**: Each category-batch subagent gets a fresh context with: (1) list of engine slugs in batch, (2) `scripts/.scratch/i18n-needed.json` excerpt (EN values), (3) ZH terminology dict (per-category guidance), (4) JSON output spec. Returns ONLY the JSON `{key: zh}` translation block.
- **Verification per task**: `node scripts/check-i18n-completeness.mjs` passes (only for that task's engines); `node scripts/codegen-examples.mjs --check` passes; `pnpm exec astro build` succeeds (313 pages).
- **Engine count preservation**: 100 engines unchanged — only `src/i18n/translations.ts` + engine files gain `engineKey: true` marker.
- **3-way sync required before ship**: `git rev-list --left-right --count origin/master...github/master` → `0	0`.
- **Real-estate engines**: 6 engines in `src/engines/real-estate/` (P5 batch) lack a corresponding letter in `src/data/categories.ts` (R is Retention per P9 reassignment). For i18n, treat as separate batch — don't try to remap. Future P-series may resolve.

---

### Task 1: Tooling — extend check + add engineKey marker + insert helper

**Files:**
- Modify: `scripts/check-i18n-completeness.mjs` (extend to consume extract output + validate engine-level keys + read `engineKey` flag)
- Modify: `src/core/engines/types.ts` (add `engineKey?: boolean` field to `ToolEngine` interface)
- Create: `scripts/insert-translations.mjs` (bulk-insert JSON `{key: zh}` entries into `translations.ts`)

**Interfaces:**
- Consumes: `scripts/.scratch/i18n-needed.json` (from extract script), `src/engines/**/*.ts` (for `engineKey` flag), `src/i18n/translations.ts`
- Produces: validated i18n state + bulk-insert helper

- [ ] **Step 1.1: Add `engineKey?: boolean` to ToolEngine type**

Edit `src/core/engines/types.ts`, add field after `dataLastUpdated`:

```ts
/** Set true when all engine-level i18n keys (input.{name}.label|placeholder, faq.{i}.q|a,
 *  how_to_use.{i}) are present in src/i18n/translations.ts. Validated by
 *  scripts/check-i18n-completeness.mjs. Default false (legacy engines).
 *  New engines SHOULD set this after translating all keys. */
engineKey?: boolean;
```

- [ ] **Step 1.2: Extend `check-i18n-completeness.mjs` to read extract output + engineKey flag**

Modify the existing check script. Add a new validation phase after the dynamic_categories/dynamic_tools phase:

```js
// Read extract output (if exists)
const extractPath = resolve(root, 'scripts/.scratch/i18n-needed.json');
let extractData = null;
try {
  extractData = JSON.parse(readFileSync(extractPath, 'utf-8'));
} catch {
  console.warn('⚠️  scripts/.scratch/i18n-needed.json not found — run `node scripts/extract-i18n-needed.mjs` first');
}

// Scan engines for engineKey=true flag
const engineKeyEngines = []; // [{slug, file}]
function walk(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = resolve(dir, f);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (f.endsWith('.ts') && f !== 'index.ts') out.push(p);
  }
  return out;
}
const allEngines = walk(resolve(root, 'src/engines'));
for (const enginePath of allEngines) {
  const content = readFileSync(enginePath, 'utf-8');
  if (/engineKey:\s*true/.test(content)) {
    const slugMatch = content.match(/slug:\s*'([^']+)'/);
    if (slugMatch) engineKeyEngines.push({ slug: slugMatch[1], file: enginePath });
  }
}

// For each engineKey=true engine, validate ALL its required keys are in translations.ts
const engineMissing = [];
if (extractData) {
  for (const { slug } of engineKeyEngines) {
    const tool = extractData.tools.find(t => t.slug === slug);
    if (!tool) continue;
    const requiredKeys = [];
    // input labels
    for (const [name, _label] of Object.entries(tool.inputLabels || {})) {
      requiredKeys.push(`tools.${slug}.input.${name}.label`);
    }
    // input placeholders (if present)
    for (const name of Object.keys(tool.inputPlaceholders || {})) {
      requiredKeys.push(`tools.${slug}.input.${name}.placeholder`);
    }
    // faq
    for (let i = 0; i < (tool.faq || []).length; i++) {
      requiredKeys.push(`tools.${slug}.faq.${i}.q`, `tools.${slug}.faq.${i}.a`);
    }
    // how_to_use
    for (let i = 0; i < (tool.howToUse || []).length; i++) {
      requiredKeys.push(`tools.${slug}.how_to_use.${i}`);
    }
    // Validate each key
    for (const key of requiredKeys) {
      const re = new RegExp(`'${key.replace(/\./g, '\\.')}':\\s*\\{`, 'm');
      if (!re.test(src)) {
        engineMissing.push(`  [engine:${slug}] ${key}`);
      }
    }
  }
}

// Final summary
if (engineMissing.length > 0) {
  console.error(`❌ Engine-level i18n check failed. ${engineMissing.length} key(s) missing for engineKey=true engines:`);
  for (const k of engineMissing) console.error(k);
  process.exit(1);
}

const total = Object.values(REQUIRED_KEYS).flat().length;
const dynCount = REQUIRED_KEYS.dynamic_category.length + REQUIRED_KEYS.dynamic_tools.length;
const engineCompleteCount = engineKeyEngines.length;
console.log(`✅ i18n completeness check passed (${total} required keys: eeat/about/category.{A-F}.*/header/favorites/recent/history + ${dynCount} dynamic: ${categoryKeys.length} category names/descs + ${toolKeys.length} tool titles/descs + ${engineCompleteCount} engineKey=true engines fully translated).`);
```

- [ ] **Step 1.3: Create `scripts/insert-translations.mjs`**

```js
#!/usr/bin/env node
/**
 * Insert JSON translation entries into src/i18n/translations.ts.
 *
 * Usage:
 *   node scripts/insert-translations.mjs <json-file>
 *
 * JSON format: { "tools.{slug}.input.{name}.label": "<ZH text>", ... }
 * For each key, finds existing { en: ..., zh: '' } entry (or creates new block)
 * and fills in the zh field. Idempotent — re-running is safe.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const translationsPath = resolve(root, 'src/i18n/translations.ts');

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error('Usage: node scripts/insert-translations.mjs <json-file>');
  process.exit(1);
}

const entries = JSON.parse(readFileSync(resolve(jsonPath), 'utf-8'));
let src = readFileSync(translationsPath, 'utf-8');

let inserted = 0, skipped = 0, failed = 0;
for (const [key, zh] of Object.entries(entries)) {
  const escapedKey = key.replace(/\./g, '\\.');
  // Match: 'key': { en: '...', zh: '...' } OR 'key': { en: '...', zh: '' }
  const re = new RegExp(`('${escapedKey}':\\s*\\{[^}]*?zh:\\s*)'([^']*)'`, 'm');
  const m = src.match(re);
  if (!m) {
    console.warn(`⚠️  Key not found or no zh field: ${key}`);
    failed++;
    continue;
  }
  // Escape single quotes in zh
  const escapedZh = zh.replace(/'/g, "\\'");
  src = src.replace(re, `$1'${escapedZh}'`);
  inserted++;
}

writeFileSync(translationsPath, src);
console.log(`✅ Inserted ${inserted} ZH translations (${skipped} skipped, ${failed} failed).`);
```

- [ ] **Step 1.4: Verify scripts pass**

Run: `node scripts/extract-i18n-needed.mjs`
Expected: writes `scripts/.scratch/i18n-needed.json` + prints stats (100 tools × N keys)

Run: `node scripts/check-i18n-completeness.mjs`
Expected: PASS (no engines have engineKey=true yet, so engine-level phase is no-op)

Run: `node scripts/insert-translations.mjs scripts/.scratch/test-empty.json` (create empty {} file first)
Expected: 0 inserted, 0 skipped, 0 failed (sanity check)

- [ ] **Step 1.5: Commit**

```bash
git add scripts/check-i18n-completeness.mjs scripts/insert-translations.mjs src/core/engines/types.ts
git commit -m "feat(i18n): P17b tooling — engineKey marker + engine-level completeness check + insert helper"
```

---

### Task 2: AI Cost engines batch (8 engines)

**Files:**
- Modify: `src/i18n/translations.ts` (insert ~150 ZH keys)
- Modify: `src/engines/ai-cost/*.ts` (8 engines gain `engineKey: true`)
- Create: `scripts/.scratch/p17b-ai-cost-translations.json` (subagent output, gitignored)

**Engines:**
1. `openai-token-calculator`
2. `claude-api-cost-calculator`
3. `gemini-api-cost-calculator`
4. `deepseek-api-cost-calculator`
5. `ai-api-cost-comparison`
6. `ai-image-generation-cost-calculator`
7. `gpu-cloud-cost-calculator`
8. `ai-training-cost-estimator`

**ZH terminology guidance (for subagent prompt):**
- Token → 令牌/词元 (use 词元 for LLM context units)
- Context window → 上下文窗口
- Model → 模型
- Input/output tokens → 输入/输出词元
- GPU → GPU (保留英文)
- Image generation → 图像生成
- Training → 训练
- Cost → 成本
- Pricing → 定价
- Per token / per image / per hour → 每词元 / 每张 / 每小时
- Fine-tuning → 微调

- [ ] **Step 2.1: Dispatch subagent (mechanical pattern translation)**

Subagent prompt:
```
Translate the following i18n keys to professional Simplified Chinese.

Source data: scripts/.scratch/i18n-needed.json (filter by tools where slug starts with one of:
  - solopreneur-openai-token
  - solopreneur-claude-api-cost
  - solopreneur-gemini-api-cost
  - solopreneur-deepseek
  - solopreneur-ai-api-cost-comparison
  - solopreneur-ai-image-generation-cost
  - solopreneur-gpu-cloud-cost
  - solopreneur-ai-training-cost-estimate

For each tool, translate:
- tools.{slug}.input.{name}.label
- tools.{slug}.input.{name}.placeholder
- tools.{slug}.faq.{i}.q
- tools.{slug}.faq.{i}.a
- tools.{slug}.how_to_use.{i}

Use AI Cost terminology (see guidance above). For each ZH value:
- Professional business tone (no machine-translation artifacts)
- No character substitutions like "数量 of Epochs"
- Match the EN value's intent, not literal word-for-word
- For FAQ a (answer) — full sentences, not fragments

Output format: single JSON object { "key": "zh value", ... } sorted by key alphabetically.
Save to: scripts/.scratch/p17b-ai-cost-translations.json
Return: status (DONE / BLOCKED / NEEDS_CONTEXT) + commit hash if any + 1-line summary
```

- [ ] **Step 2.2: Insert translations**

```bash
node scripts/insert-translations.mjs scripts/.scratch/p17b-ai-cost-translations.json
```

Expected: ~150 keys inserted, 0 failed.

- [ ] **Step 2.3: Mark engines `engineKey: true`**

For each of 8 engine files in `src/engines/ai-cost/`, add `engineKey: true` to the ToolEngine object literal (after `dataLastUpdated` if present, else after `slug`).

- [ ] **Step 2.4: Verify**

```bash
node scripts/extract-i18n-needed.mjs   # refresh stats
node scripts/check-i18n-completeness.mjs  # PASS (8 engineKey=true engines fully translated)
node scripts/codegen-examples.mjs --check  # PASS
pnpm exec astro build  # 313 pages, 0 errors
```

- [ ] **Step 2.5: Commit**

```bash
git add src/i18n/translations.ts src/engines/ai-cost/
git commit -m "feat(i18n): P17b AI Cost engines — 8 engines fully translated + engineKey=true"
```

---

### Task 3: Valuation batch (13 engines)

**Files:**
- Modify: `src/i18n/translations.ts` (~200 ZH keys)
- Modify: `src/engines/valuation/*.ts` (13 engines gain `engineKey: true`)

**Engines (from `src/engines/valuation/`):**
break-even-calculator, business-valuation-calculator, cac-calculator, capital-efficiency-calculator, equity-dilution-calculator (?), ltv-calculator, ltv-cac-ratio-calculator, mrr-growth-calculator, rule-of-40-calculator, saas-valuation-calculator, startup-runway-calculator, burn-multiple-calculator, arr-multiple-calculator (verify actual list)

**ZH terminology guidance:**
- Valuation → 估值
- LTV (Lifetime Value) → 客户终身价值
- CAC (Customer Acquisition Cost) → 客户获取成本
- MRR (Monthly Recurring Revenue) → 月经常性收入
- ARR (Annual Recurring Revenue) → 年经常性收入
- Churn → 流失率
- Break-even → 盈亏平衡
- Equity dilution → 股权稀释
- Burn multiple → 燃烧倍数
- Runway → 跑道/资金可维持月数
- Rule of 40 → 40 法则

- [ ] **Step 3.1: Dispatch subagent**

Same pattern as Task 2.1, but slugs match valuation engines. Subagent reads extract JSON filtered by these slugs.

- [ ] **Step 3.2: Insert translations**

```bash
node scripts/insert-translations.mjs scripts/.scratch/p17b-valuation-translations.json
```

- [ ] **Step 3.3: Mark 13 engines `engineKey: true`**

- [ ] **Step 3.4: Verify** (same as 2.4)

- [ ] **Step 3.5: Commit**

```bash
git add src/i18n/translations.ts src/engines/valuation/
git commit -m "feat(i18n): P17b Valuation engines — 13 engines fully translated + engineKey=true"
```

---

### Task 4: Legacy mix batch (saas + cost + freelance + investment = 17 engines)

**Files:**
- Modify: `src/i18n/translations.ts` (~250 ZH keys)
- Modify: `src/engines/{saas,cost,freelance,investment}/*.ts` (17 engines gain `engineKey: true`)

**Engines breakdown:**
- `saas/` (5): stripe-fee, safe-convertible-note, plus 3 others (verify)
- `cost/` (4): employee-cost, meeting-cost, productivity-score, remote-vs-office
- `freelance/` (3): freelance-rate, hourly-vs-fixed, affiliate-income
- `investment/` (5): compound-interest, equity-dilution, freelance-tax, sponsorship-rate, time-value

**ZH terminology guidance:**
- SaaS → SaaS (保留)
- Pricing → 定价
- Hourly vs fixed → 时薪 vs 固定价
- Affiliate income → 联盟营销收入
- Sponsorship → 赞助
- Compound interest → 复利
- Time value of money → 货币时间价值

- [ ] **Step 4.1: Dispatch subagent** (same pattern)

- [ ] **Step 4.2: Insert + 4.3: Mark + 4.4: Verify + 4.5: Commit**

---

### Task 5: Mid batch (marketing + sales + operations = 20 engines)

**Files:**
- Modify: `src/i18n/translations.ts` (~300 ZH keys)
- Modify: `src/engines/{marketing,sales,operations}/*.ts` (20 engines gain `engineKey: true`)

**Engines:**
- `marketing/` (8): roas, ltv-by-channel, funnel-value, cohort-retention, content-marketing-roi, email-campaign-roi, coupon-attribution (P16), cart-abandonment-cost (P16)
- `sales/` (6): pipeline-value, sales-velocity, acv, win-rate-by-stage, quota-attainment, pipeline-coverage
- `operations/` (6): inventory-turnover, carrying-cost, stockout-cost, reorder-point, fulfillment-cost, supplier-scorecard

**ZH terminology:**
- ROAS → 广告支出回报率
- Funnel → 漏斗
- Cohort → 同期群
- Pipeline → 销售管道
- ACV (Average Contract Value) → 平均合同价值
- Win rate → 赢率
- Quota → 配额/指标
- Inventory → 库存
- Fulfillment → 履约
- Supplier → 供应商

- [ ] **Step 5.1-5.5** (same pattern as Task 2)

- [ ] **Step 5.5: Commit**

```bash
git commit -m "feat(i18n): P17b Marketing/Sales/Operations engines — 20 engines fully translated"
```

---

### Task 6: Mid batch (product-analytics + retention + customer-support + knowledge = 24 engines)

**Files:**
- Modify: `src/i18n/translations.ts` (~360 ZH keys)
- Modify: `src/engines/{product-analytics,retention,customer-support,knowledge}/*.ts` (24 engines gain `engineKey: true`)

**Engines:**
- `product-analytics/` (6): funnel-step, feature-adoption, activation-rate, stickiness, time-to-value, power-user-curve
- `retention/` (6): nrr, grr, expansion-revenue, logo-churn, customer-health, renewal-rate
- `customer-support/` (6): cost-per-ticket, csat, deflection-rate, first-response-time, resolution-time, support-capacity
- `knowledge/` (6): kb-coverage, article-freshness, search-effectiveness, deflection-quality, documentation-roi, article-helpfulness

**ZH terminology:**
- NRR → 净收入留存
- GRR → 总收入留存
- Churn → 流失
- CSAT → 客户满意度
- SLA → 服务等级协议
- FRT (First Response Time) → 首次响应时间
- KB → 知识库
- DevRel → 开发者关系

- [ ] **Step 6.1-6.5** (same pattern)

- [ ] **Step 6.5: Commit**

```bash
git commit -m "feat(i18n): P17b ProductAnalytics/Retention/CustomerSupport/Knowledge engines — 24 engines fully translated"
```

---

### Task 7: End batch (hiring + legal + real-estate = 18 engines)

**Files:**
- Modify: `src/i18n/translations.ts` (~270 ZH keys)
- Modify: `src/engines/{hiring-team,legal-compliance,real-estate}/*.ts` (18 engines gain `engineKey: true`)

**Engines:**
- `hiring-team/` (6): fully-loaded-employee-cost, time-to-productivity, productivity-ramp-curve, comp-banding, equity-refresh, attrition-cost
- `legal-compliance/` (6): gdpr-fine, dsar-cost, consent-revenue-impact, dpa-cost, breach-notification-cost, cmp-roi
- `real-estate/` (6): cap-rate, brrrr, mortgage, dscr, plus 2 others (verify)

**ZH terminology:**
- Hiring → 招聘
- Ramp → 成长曲线/上手
- Comp banding → 薪酬带宽
- GDPR → GDPR (保留)
- DSAR → 数据主体访问请求
- DPA → 数据处理协议
- CMP → 同意管理平台
- Cap rate → 资本化率
- BRRR → BRRR (买入-翻新-出租-再融资)
- Mortgage → 按揭/抵押贷款
- DSCR → 偿债覆盖率

- [ ] **Step 7.1-7.5** (same pattern)

- [ ] **Step 7.5: Commit**

```bash
git commit -m "feat(i18n): P17b Hiring/Legal/RealEstate engines — 18 engines fully translated"
```

---

### Task 8: Final ship — memory + 3-way sync + holistic review

**Files:**
- Modify: `memory/p17-i18n-backfill-shipped.md` (update status: shipped-partial → shipped-complete, add P17b section)
- Modify: `memory/MEMORY.md` (update P17 entry to reflect completion)

- [ ] **Step 8.1: Holistic pre-merge review**

Per CLAUDE.md trigger rules (multi-task batch, ≥3 commits, ≥5 files touched), run holistic cross-cutting review BEFORE pushing to canonical remote.

Use `superpowers:code-review` skill with max effort (~10 subagent calls). Focus areas:
1. Cross-file translation consistency (same ZH term used for same EN concept across all engines)
2. Per-engine `engineKey: true` flag correctness (no false-positive = engine marked true but missing keys)
3. `translations.ts` schema integrity (no syntax errors, all keys properly nested)
4. Build stability (pnpm exec astro build succeeds, 313 pages)
5. dist/{en,zh}/index.html raw-key count = 0 (P17 invariant preserved)
6. precommit hook still works (try a dummy commit with broken translation)

- [ ] **Step 8.2: Update memory**

Edit `memory/p17-i18n-backfill-shipped.md`:
- Change `status: shipped-partial` → `status: shipped-complete`
- Add new section: `## P17b — Engine-Level Completion (2026-07-XX)` documenting the 6 commits + ~1530 net keys added + engineKey marker ship

Edit `memory/MEMORY.md`:
- Update P17 entry to reflect "shipped-complete (P17a visible bug fix + P17b engine-level completion)"

- [ ] **Step 8.3: Verify 3-way sync**

```bash
pnpm exec astro build
git status
git log --oneline -10
git fetch origin github
git rev-list --left-right --count origin/master...github/master
```

Expected: working tree clean, `0	0` for sync count.

- [ ] **Step 8.4: Push**

```bash
git push origin master
git push github master
```

- [ ] **Step 8.5: Commit memory + push**

```bash
git add memory/p17-i18n-backfill-shipped.md memory/MEMORY.md
git commit -m "docs(p17b): i18n engine-level completion shipped — 100/100 engines fully translated"
git push origin master
git push github master
```

---

## Acceptance Criteria

| Check | Expected |
|---|---|
| Engine count | 100 (unchanged) |
| `node scripts/check-i18n-completeness.mjs` | PASS (100 engineKey=true engines, all required keys present) |
| `node scripts/codegen-examples.mjs --check` | PASS |
| `pnpm exec astro build` | 313 pages, 0 errors |
| `dist/{en,zh}/index.html` raw-key count | 0 |
| `node tests/scripts/test-customfn.mjs` | 100/100 engines parse OK |
| `pnpm test` | ≥1096 tests pass (P-series + others) |
| 3-way sync `git rev-list --left-right --count` | `0	0` |
| `src/i18n/translations.ts` size | ~4000-4500 lines (2126 → +2000) |
| `engineKey: true` coverage | 100/100 engines |
| Memory file | `p17-i18n-backfill-shipped.md` status = shipped-complete |

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Subagent translation quality varies | Use specific ZH terminology dict per batch + exact-match dict pattern (no substring replace per P17 lesson) |
| insert-translations.mjs regex breaks on edge-case zh chars | Use escaped single-quote pattern + manual review of diff before commit |
| engineKey=true flag prematurely set | Verify check script passes BEFORE setting flag in each task |
| Cross-file terminology inconsistency | Holistic review (Task 8.1) catches cross-engine term drift |
| Real-estate engines orphaned (no category letter) | Treat as separate batch (Task 7) — don't try to remap in P17b |
| Translation drift on P18+ engine additions | engineKey=false default + manual flag-setting forces explicit opt-in |