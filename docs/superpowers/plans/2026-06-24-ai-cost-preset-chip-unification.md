# AI Cost v3 — Preset Chip 统一化 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 4 个 AI Cost v3 计算器（image / training / gpu / ai-api-comparison）的 preset chip 在位置和风格上与 Business v3 统一，并把数据从 [slug].astro 搬到引擎文件 `engine.presets`。

**Architecture:** 新增 `Preset` 类型 + 抽出 `<PresetChips />` 组件；4 个引擎文件新增 `presets: [...]` 字段；[slug].astro 删 4 个 inline 块、加 1 个组件调用。组件渲染时把 camelCase 字段名转 kebab-case 写 data-attr，浏览器 DOM 自动转回 camelCase 给 JS handler 用——顺手修掉 AI Cost chip 当前点击无反应的 bug。

**Tech Stack:** Astro 4.16.19 + TypeScript 5.6 strict + Tailwind CSS 4。无需新依赖。

**Spec:** `docs/superpowers/specs/2026-06-24-ai-cost-preset-chip-unification-design.md`

**Out of scope:** 4 个 LLM token 计算器（openai/claude/deepseek/gemini）；24 个 Business v3 计算器。

---

## Task 1: Add `Preset` type to engine types

**Files:**
- Modify: `src/core/engines/types.ts`

- [ ] **Step 1: Read current types.ts to find insertion point**

Run: `grep -n "export interface ToolEngine\|export type" src/core/engines/types.ts`
Expected: see existing interface declarations and their location

- [ ] **Step 2: Add `Preset` interface and `presets` field on `ToolEngine`**

Open `src/core/engines/types.ts` and:
1. Add `Preset` interface above `ToolEngine`:
   ```ts
   /**
    * One-click preset that fills a calculator's inputs from a button click.
    * Rendered as a chip at the top of the form (above inputs) when `presets`
    * is set on the engine. Currently used by AI Cost v3 (4 calcs).
    */
   export interface Preset {
     /** Lookup key for i18n label via t(`tools.${slug}.preset.${key}`, lang) */
     key: string;
     /** Emoji prefix displayed before the label (e.g. '💼') */
     emoji: string;
     /** input.name → value. Component converts camelCase → kebab-case for HTML data-attr */
     fields: Record<string, string | number>;
   }
   ```
2. Add `presets?: Preset[];` field to `ToolEngine` interface (after the last existing optional field; if `presets` doesn't fit alphabetically, put it last for stability):
   ```ts
     /** Optional preset chips rendered at top of form */
     presets?: Preset[];
   ```

- [ ] **Step 3: Verify type compiles**

Run: `pnpm check` (typecheck + tests; if only typecheck needed, run `pnpm exec tsc --noEmit` from project root)
Expected: passes, zero TS errors

- [ ] **Step 4: Commit**

```bash
git add src/core/engines/types.ts
git commit -m "feat(types): add Preset interface + ToolEngine.presets field"
```

---

## Task 2: Audit i18n keys for all 4 AI Cost calcs

**Files:**
- Modify: `src/i18n/translations.ts` (if missing keys found)

- [ ] **Step 1: Grep all 4 calc preset keys in translations.ts**

Run:
```bash
grep -nE "solopreneur-(ai-image-cost-calculator|ai-training-cost-estimator|gpu-cloud-cost-calculator|ai-api-cost-comparison)\.preset\." src/i18n/translations.ts
```
Expected: see all `tools.{slug}.preset.{key}` entries for both `en` and `zh` sections

- [ ] **Step 2: Compute missing-key list**

For each of the 4 calcs, the expected 6 keys × 2 langs = 12 entries are:

| Calc | Keys |
|---|---|
| `solopreneur-ai-image-cost-calculator` | `solopreneur`, `creator`, `agency`, `budget`, `logos`, `artistic` |
| `solopreneur-ai-training-cost-estimator` | `quick-lora`, `mid-13b`, `full-70b`, `enterprise-180b`, `budget-7b`, `pro-405b` |
| `solopreneur-gpu-cloud-cost-calculator` | `budget-single`, `dev-box`, `training-rig`, `enterprise-h100`, `cheapest-h200`, `pro-8h100` |
| `solopreneur-ai-api-cost-comparison` | `support-bot`, `rag-qa`, `code-review`, `content-gen`, `data-analysis`, `batch` |

Compare grep output against the expected list. Record any missing key.

- [ ] **Step 3: Add any missing keys to translations.ts**

Open `src/i18n/translations.ts` and find the existing `tools.solopreneur-{slug}:` block. For each missing key, add to both `en` and `zh` sections under `preset:`:

Example for AI image (en):
```ts
preset: {
  solopreneur: 'Solopreneur',
  creator: 'Content Creator',
  agency: 'Design Agency',
  budget: 'Budget Hacker',
  logos: 'Best Text Logos',
  artistic: 'High-End Artistic',
  // ... existing keys
},
```

Example for AI image (zh):
```ts
preset: {
  solopreneur: '独立创业者',
  creator: '内容创作者',
  agency: '设计工作室',
  budget: '预算极客',
  logos: '文字设计',
  artistic: '高端艺术',
  // ... existing keys
},
```

Adapt labels based on the calculator's domain. Use concise phrases that fit in a chip (1-3 words).

- [ ] **Step 4: Verify all keys present**

Re-run the grep from Step 1. Each line should now show 12 lines per calc (6 keys × 2 langs).

- [ ] **Step 5: Commit (only if Step 3 made changes)**

```bash
git add src/i18n/translations.ts
git commit -m "i18n: add missing preset keys for AI Cost calcs"
```

If Step 3 made no changes, skip this commit.

---

## Task 3: Create `<PresetChips />` Astro component

**Files:**
- Create: `src/components/PresetChips.astro`

- [ ] **Step 1: Create the component file**

Create `src/components/PresetChips.astro` with the following content:

```astro
---
import type { Preset } from '../core/engines/types';
import { t } from '../i18n';

interface Props {
  presets: Preset[];
  slug: string;
  lang: string;
}
const { presets, slug, lang } = Astro.props;
const slugKey = slug.replace('solopreneur-', '');
---
<div class="mb-5">
  <span class="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
    {lang === 'zh' ? '🎭 场景预设' : '🎭 Scenario Presets'}
  </span>
  <div class="flex flex-wrap gap-1.5" id={`preset-buttons-${slugKey}`}>
    {presets.map(p => (
      <button
        type="button"
        class="preset-btn text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-all"
        {...Object.fromEntries(
          Object.entries(p.fields).map(([k, v]) => [
            `data-${k.replace(/([A-Z])/g, '-$1').toLowerCase()}`,
            String(v),
          ])
        )}
      >
        {p.emoji} {t(`tools.${slug}.preset.${p.key}`, lang)}
      </button>
    ))}
  </div>
</div>
```

**Why the camelCase → kebab-case conversion matters**: HTML data attributes are auto-lowercased by the browser. Writing `data-imagesPerMonth` would render as `data-imagespermonth` and `dataset.imagespermonth` would not match the actual input id `imagesPerMonth`. Converting to `data-images-per-month` lets the DOM auto-convert back to `dataset.imagesPerMonth`, matching the input id exactly. This **fixes the existing bug** where AI Cost preset chips don't populate inputs.

- [ ] **Step 2: Verify component imports cleanly via tsc**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors (component uses exported `Preset` type and `t` helper — both should resolve)

- [ ] **Step 3: Commit**

```bash
git add src/components/PresetChips.astro
git commit -m "feat(component): add PresetChips component with camelCase→kebab-case data-attr"
```

---

## Task 4: Add presets to AI image cost calculator engine

**Files:**
- Modify: `src/engines/ai-image-generation-cost-calculator.ts`

- [ ] **Step 1: Read current `inputs` field to confirm exact input names**

Run: `grep -A 10 "inputs: \[" src/engines/ai-image-generation-cost-calculator.ts | head -15`
Expected output (verify these names):
```ts
{ name: 'provider', ... }
{ name: 'imagesPerMonth', ... }
{ name: 'resolution', ... }
{ name: 'batchSize', ... }
{ name: 'advancedMode', ... }
```

- [ ] **Step 2: Delete unused `PRESETS` constant (lines 21-28)**

Open `src/engines/ai-image-generation-cost-calculator.ts` and remove these 8 lines:

```ts
const PRESETS: Record<string, Record<string, string>> = {
  'Solopreneur': { provider: 'dalle-3', imagesPerMonth: '100', resolution: '1024×1024', batchSize: '1', advancedMode: 'standard' },
  'Content Creator': { provider: 'midjourney-v7', imagesPerMonth: '500', resolution: '2048×2048', batchSize: '4', advancedMode: 'standard' },
  'Design Agency': { provider: 'dalle-4', imagesPerMonth: '1000', resolution: '1024×1024', batchSize: '4', advancedMode: 'hd' },
  'Budget Hacker': { provider: 'stable-diffusion-4', imagesPerMonth: '5000', resolution: '512×512', batchSize: '8', advancedMode: 'standard' },
  'Best Text Logos': { provider: 'ideogram-3', imagesPerMonth: '300', resolution: '1024×1024', batchSize: '2', advancedMode: 'standard' },
  'High-End Artistic': { provider: 'flux-pro', imagesPerMonth: '800', resolution: '2048×2048', batchSize: '2', advancedMode: 'hd' },
};
```

This is the dead code identified in the spec — UI never reads it.

- [ ] **Step 3: Add `presets` field to the engine object**

In the same file, inside `const engine: ToolEngine = { ... }` (find it after `inputs: [...]`), add the field. Place it BEFORE `staticExamples` for readability:

```ts
  presets: [
    { key: 'solopreneur', emoji: '💼', fields: { provider: 'dalle-3', imagesPerMonth: '100', resolution: '1024×1024', batchSize: '1', advancedMode: 'standard' } },
    { key: 'creator',     emoji: '🎨', fields: { provider: 'midjourney-v7', imagesPerMonth: '500', resolution: '2048×2048', batchSize: '4', advancedMode: 'standard' } },
    { key: 'agency',      emoji: '🏢', fields: { provider: 'dalle-4', imagesPerMonth: '1000', resolution: '1024×1024', batchSize: '4', advancedMode: 'hd' } },
    { key: 'budget',      emoji: '💰', fields: { provider: 'stable-diffusion-4', imagesPerMonth: '5000', resolution: '512×512', batchSize: '8', advancedMode: 'standard' } },
    { key: 'logos',       emoji: '🔤', fields: { provider: 'ideogram-3', imagesPerMonth: '300', resolution: '1024×1024', batchSize: '2', advancedMode: 'standard' } },
    { key: 'artistic',    emoji: '🖼️', fields: { provider: 'flux-pro', imagesPerMonth: '800', resolution: '2048×2048', batchSize: '2', advancedMode: 'hd' } },
  ],
```

- [ ] **Step 4: Verify type compiles**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors

- [ ] **Step 5: Commit**

```bash
git add src/engines/ai-image-generation-cost-calculator.ts
git commit -m "feat(ai-image): move presets from dead const to engine.presets field"
```

---

## Task 5: Add presets to AI training cost estimator engine

**Files:**
- Modify: `src/engines/ai-training-cost-estimator.ts`

- [ ] **Step 1: Read current `inputs` field to confirm exact names**

Run: `grep -A 12 "inputs: \[" src/engines/ai-training-cost-estimator.ts | head -15`
Expected (verify): names like `modelSize`, `gpuType`, `gpuCount`, `trainingHours`, `epochs`, `cloudStorage`, `dataProcessCost` (plus a `provider` if any).

- [ ] **Step 2: Add `presets` field to the engine object**

In `src/engines/ai-training-cost-estimator.ts`, find `const engine: ToolEngine = { ... }` and add `presets` before `staticExamples`:

```ts
  presets: [
    { key: 'quick-lora',      emoji: '🚀', fields: { modelSize: '7B',   gpuType: 'H100-80GB',  gpuCount: '2',   trainingHours: '8',   epochs: '3', cloudStorage: '50',   dataProcessCost: '20' } },
    { key: 'mid-13b',         emoji: '📦', fields: { modelSize: '13B',  gpuType: 'A100-80GB',  gpuCount: '8',   trainingHours: '24',  epochs: '5', cloudStorage: '200',  dataProcessCost: '100' } },
    { key: 'full-70b',        emoji: '🏭', fields: { modelSize: '70B',  gpuType: 'H200-141GB', gpuCount: '16',  trainingHours: '48',  epochs: '3', cloudStorage: '500',  dataProcessCost: '300' } },
    { key: 'enterprise-180b', emoji: '🏢', fields: { modelSize: '180B', gpuType: 'H200-141GB', gpuCount: '64',  trainingHours: '168', epochs: '2', cloudStorage: '2000', dataProcessCost: '1000' } },
    { key: 'budget-7b',       emoji: '💰', fields: { modelSize: '7B',   gpuType: 'RTX-6000',   gpuCount: '4',   trainingHours: '12',  epochs: '5', cloudStorage: '30',   dataProcessCost: '10' } },
    { key: 'pro-405b',        emoji: '🏆', fields: { modelSize: '405B', gpuType: 'H200-141GB', gpuCount: '128', trainingHours: '720', epochs: '1', cloudStorage: '5000', dataProcessCost: '2000' } },
  ],
```

**Note**: The `provider` field is NOT in this preset set because Step 1 confirmed the engine's inputs don't include `provider` (the GPU type IS the implicit provider). If your grep showed `provider` as an input name, add it: `provider: '<value>'` to each entry.

- [ ] **Step 3: Verify type compiles**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors

- [ ] **Step 4: Commit**

```bash
git add src/engines/ai-training-cost-estimator.ts
git commit -m "feat(ai-training): add engine.presets field"
```

---

## Task 6: Add presets to GPU cloud cost calculator engine

**Files:**
- Modify: `src/engines/gpu-cloud-cost-calculator.ts`

- [ ] **Step 1: Read current `inputs` field**

Run: `grep -A 12 "inputs: \[" src/engines/gpu-cloud-cost-calculator.ts | head -15`
Expected: names like `provider`, `gpuType`, `gpuCount`, `hoursPerDay`, `pricingTier`, `includeStorage` (verify exact casing).

- [ ] **Step 2: Add `presets` field**

In `src/engines/gpu-cloud-cost-calculator.ts`, find `const engine: ToolEngine = { ... }` and add `presets` before `staticExamples`:

```ts
  presets: [
    { key: 'budget-single',     emoji: '💰', fields: { provider: 'vastai',    gpuType: 'RTX4090', gpuCount: '1', hoursPerDay: '12', pricingTier: 'spot',      includeStorage: 'yes' } },
    { key: 'dev-box',           emoji: '💻', fields: { provider: 'runpod',    gpuType: 'A100',    gpuCount: '1', hoursPerDay: '8',  pricingTier: 'on-demand', includeStorage: 'yes' } },
    { key: 'training-rig',      emoji: '🏋️', fields: { provider: 'lambdalabs',gpuType: 'A100',    gpuCount: '4', hoursPerDay: '24', pricingTier: 'reserved',  includeStorage: 'yes' } },
    { key: 'enterprise-h100',   emoji: '🏢', fields: { provider: 'aws',       gpuType: 'H100',    gpuCount: '8', hoursPerDay: '24', pricingTier: 'reserved',  includeStorage: 'yes' } },
    { key: 'cheapest-h200',     emoji: '🏷️', fields: { provider: 'vastai',    gpuType: 'H200',    gpuCount: '1', hoursPerDay: '4',  pricingTier: 'spot',      includeStorage: 'no' } },
    { key: 'pro-8h100',         emoji: '🏆', fields: { provider: 'runpod',    gpuType: 'H100',    gpuCount: '8', hoursPerDay: '24', pricingTier: 'on-demand', includeStorage: 'yes' } },
  ],
```

If the engine's `includeStorage` is actually a boolean (not 'yes'/'no' string), use `true`/`false` instead. **Verify with Step 1 grep**.

- [ ] **Step 3: Verify type compiles**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors

- [ ] **Step 4: Commit**

```bash
git add src/engines/gpu-cloud-cost-calculator.ts
git commit -m "feat(gpu): add engine.presets field"
```

---

## Task 7: Add presets to AI API cost comparison engine

**Files:**
- Modify: `src/engines/ai-api-cost-comparison.ts`

- [ ] **Step 1: Read current `inputs` field**

Run: `grep -A 12 "inputs: \[" src/engines/ai-api-cost-comparison.ts | head -15`
Expected: names like `inputTokens`, `outputTokens`, `requestsPerDay`, `pricingMode` (verify).

- [ ] **Step 2: Add `presets` field**

In `src/engines/ai-api-cost-comparison.ts`, find `const engine: ToolEngine = { ... }` and add `presets` before `staticExamples`:

```ts
  presets: [
    { key: 'support-bot',   emoji: '🤖', fields: { inputTokens: '800',  outputTokens: '200',  requestsPerDay: '500',   pricingMode: 'realtime' } },
    { key: 'rag-qa',        emoji: '📚', fields: { inputTokens: '3000', outputTokens: '400',  requestsPerDay: '200',   pricingMode: 'realtime' } },
    { key: 'code-review',   emoji: '💻', fields: { inputTokens: '5000', outputTokens: '800',  requestsPerDay: '50',    pricingMode: 'realtime' } },
    { key: 'content-gen',   emoji: '✍️', fields: { inputTokens: '500',  outputTokens: '2000', requestsPerDay: '100',   pricingMode: 'realtime' } },
    { key: 'data-analysis', emoji: '📊', fields: { inputTokens: '4000', outputTokens: '3000', requestsPerDay: '30',    pricingMode: 'realtime' } },
    { key: 'batch',         emoji: '⚡', fields: { inputTokens: '3000', outputTokens: '5000', requestsPerDay: '10000', pricingMode: 'batch' } },
  ],
```

- [ ] **Step 3: Verify type compiles**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors

- [ ] **Step 4: Commit**

```bash
git add src/engines/ai-api-cost-comparison.ts
git commit -m "feat(ai-api-comparison): add engine.presets field"
```

---

## Task 8: Replace inline blocks in [slug].astro with `<PresetChips />`

**Files:**
- Modify: `src/pages/[lang]/[slug].astro`

This is the most surgical step. Three edits in one file.

- [ ] **Step 1: Add `PresetChips` import**

Find the existing import block near the top of `src/pages/[lang]/[slug].astro` (around line 2-15). Add the new import alongside other component imports:

```ts
import PresetChips from '../../components/PresetChips.astro';
```

- [ ] **Step 2: Add `<PresetChips />` invocation inside `<form>`**

Find the `<form id="tool-form" ...>` opening tag (line ~129). IMMEDIATELY AFTER it (before the `{slug === 'solopreneur-openai-token-calculator' ? (...) : isClaude ? ...}` ternary), insert:

```astro
            {engine.presets && engine.presets.length > 0 && (
              <PresetChips presets={engine.presets} slug={slug} lang={lang} />
            )}
```

This places the chip region at the top of the form, matching Business v3 layout.

- [ ] **Step 3: Delete 4 inline preset blocks**

Delete these 4 blocks (approximately lines 863-978, ~116 lines total). Each block follows the same template:

```astro
            {isXxx && (
              <div class="flex flex-wrap gap-2 mt-3">
                <span class="text-sm text-gray-500 mr-1">{lang === 'zh' ? '场景预设：' : 'Scenarios:'}</span>
                <button type="button" class="preset-chip ..." data-xxx="...">{t('tools.{slug}.preset.{key}', lang)}</button>
                ... 5 more <button> elements ...
              </div>
            )}
```

To delete safely, run this for each of the 4 blocks:

1. Run `grep -n "isAiApiCostComparison &&\|isImage &&\|isTraining &&\|isGpu &&" src/pages/[lang]/[slug].astro` to find exact starting line numbers
2. Use `Read` with `offset` and `limit` to view the full block (each block is ~28-30 lines including blank lines)
3. Copy the exact block content (whitespace matters — preserve indentation exactly)
4. Use `Edit` tool: `old_string` = full block, `new_string` = empty string (or omit, leaving blank line)
5. Repeat for all 4 blocks
6. After all 4 deletions, re-run grep to confirm no orphaned `{isImage &&` etc. remain (only the constants declared at top should remain):
   ```bash
   grep -n "isAiApiCostComparison &&\|isImage &&\|isTraining &&\|isGpu &&" src/pages/[lang]/[slug].astro
   ```
   Expected: zero matches (the JS const declarations like `const isImage = ...` will match, but those are fine — just don't match `&& (` style).

If you have trouble with exact whitespace matching, use `git checkout -p src/pages/[lang]/[slug].astro` interactive to manually select the deletions line-by-line.

- [ ] **Step 4: Verify build succeeds**

Run: `pnpm build`
Expected: succeeds with 141 static pages (or current count); zero errors

If build fails with "X is defined but never used", it means one of the `isImage`/`isTraining`/`isGpu`/`isAiApiCostComparison` constants is now unused. **Do not delete these constants** — they're still needed by the `<script>` block for selecting `IMAGE_CONFIG` / `TRAINING_CONFIG` / `GPU_CONFIG` / `COMPARISON_CONFIG`. Use the constant in a comment or `// eslint-disable` style if TS complains.

- [ ] **Step 5: Verify net line reduction**

Run: `git diff --stat src/pages/[lang]/[slug].astro`
Expected: net reduction of ~116 lines (4 deleted blocks) plus a few added lines (1 import + 3-line PresetChips call)

- [ ] **Step 6: Commit**

```bash
git add src/pages/[lang]/[slug].astro
git commit -m "refactor(page): replace 4 inline preset blocks with PresetChips component"
```

---

## Task 9: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Full quality gate**

Run: `pnpm check`
Expected: typecheck + tests pass, zero errors

- [ ] **Step 2: Build**

Run: `pnpm build`
Expected: succeeds

- [ ] **Step 3: Manual visual check — AI image (en)**

Open in browser: `/en/solopreneur-ai-image-cost-calculator`
Verify:
- [ ] Preset chips appear at the **top** of the form card (above inputs)
- [ ] 6 chips with emoji: 💼 Solopreneur / 🎨 Content Creator / 🏢 Design Agency / 💰 Budget Hacker / 🔤 Best Text Logos / 🖼️ High-End Artistic
- [ ] Label "🎭 Scenario Presets" with uppercase tracking-wide style
- [ ] Chips are `rounded-lg` rectangles (not pills)

- [ ] **Step 4: Manual visual check — AI image (zh)**

Open in browser: `/zh/solopreneur-ai-image-cost-calculator`
Verify:
- [ ] Chips appear at top, label is "🎭 场景预设"
- [ ] Chip labels in Chinese: 独立创业者 / 内容创作者 / etc.

- [ ] **Step 5: Click test — verify bug fix**

On `/en/solopreneur-ai-image-cost-calculator`:
1. Click "💼 Solopreneur" chip
2. Verify Provider select = "dalle-3", Images per Month = "100", Resolution = "1024×1024", Batch Size = "1", Quality Mode = "standard"
3. Click "💰 Budget Hacker" chip
4. Verify Provider = "stable-diffusion-4", Images per Month = "5000", Resolution = "512×512", Batch Size = "8"

This verifies the camelCase→kebab-case fix is working.

- [ ] **Step 6: Manual check — other 3 AI Cost calcs**

Repeat Steps 3-5 for:
- `/en/solopreneur-ai-training-cost-estimator` — click "🚀 Quick LoRA", verify modelSize=H100-80GB / 7B / 2 / 8 / etc.
- `/en/solopreneur-gpu-cloud-cost-calculator` — click "💻 Dev Box", verify provider=runpod / A100 / 1 / 8 / on-demand / yes
- `/en/solopreneur-ai-api-cost-comparison` — click "🤖 Support Bot", verify inputTokens=800 / outputTokens=200 / requestsPerDay=500 / realtime

- [ ] **Step 7: Regression check — Business v3 and LLM token pages unchanged**

Quick visual diff against any Business v3 page (e.g. `/en/solopreneur-mrr-calculator`):
- [ ] Chip layout, label, button shape identical to AI Cost pages
- [ ] Click test on Business v3 chip still works

Quick visual diff against an LLM token page (e.g. `/en/solopreneur-openai-token-calculator`):
- [ ] LLM token page is **unchanged** (still uses inline p.zh/p.en labels, NOT t() keys)

- [ ] **Step 8: Final commit (only if any verification-fix commits were needed)**

If all checks pass, no commit needed. If you made any tweaks (e.g. typo fixes), commit them:

```bash
git add -A
git commit -m "fix(ai-cost-presets): address verification findings"
```

---

## Self-Review Checklist (run before declaring plan complete)

- [ ] Spec Section 4.1 (Schema) → Task 1
- [ ] Spec Section 4.2 (Component) → Task 3
- [ ] Spec Section 4.3 (Page) → Task 8
- [ ] Spec Section 4.4 (4 engines) → Tasks 4-7
- [ ] Spec Section 4.5 (i18n) → Task 2
- [ ] Bonus bug fix (camelCase → kebab-case) → Task 3 + verified in Task 9 Step 5
- [ ] Acceptance criteria (visual, click, build, check) → Task 9
- [ ] No `PRESETS` constant left in ai-image engine → Task 4 Step 2
- [ ] No "TBD"/"TODO"/"implement later" placeholders in plan steps

---

## Notes

- **Frequent commits**: 9 commits total (one per task, plus a final if needed). Each commit is independently revertable.
- **DRY**: Component is reused 4 times (one PresetChips definition, 4 different `presets` arrays in engines).
- **YAGNI**: No new abstractions beyond what's needed. Component is the only new file.
- **TDD caveat**: This is a pure UI refactor. The existing `pnpm check` (typecheck + vitest) doesn't have component-level tests, so verification is `pnpm check` + `pnpm build` + manual click test rather than unit tests. This matches the project's existing testing posture.
- **Out of scope reminder**: Do NOT touch LLM token calculators, do NOT touch Business v3 calculators, do NOT touch `calculate()` / `customFn` / `staticExamples` of any engine.