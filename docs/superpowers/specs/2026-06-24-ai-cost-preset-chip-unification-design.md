# AI Cost v3 — Preset Chip 统一化设计

**Date:** 2026-06-24
**Status:** Approved (brainstorming complete)
**Scope:** 4 AI Cost v3 calculators
**Out of scope:** 4 LLM token calculators, 24 Business v3 calculators

## 1. Problem

4 个 AI Cost v3 计算器的"场景预设"chip 在位置和风格上与系统统一标准（Business v3）不一致：

| 维度 | Business v3 (24个) | AI Cost v3 (4个：image/training/gpu/ai-api-comparison) |
|---|---|---|
| 位置 | 表单**顶部** | 表单**底部**（inputs 之下，submit 之上） |
| 容器 | `<div class="mb-5">` + 标签行 + `<div id="preset-buttons-{slugKey}">` | 平铺 `<div class="flex flex-wrap gap-2 mt-3">` 直接拼按钮 |
| 标签 | "🎭 Scenario Presets" / "🎭 场景预设"，含 emoji + 大写 tracking-wide | "Scenarios:" / "场景预设："，纯文本 |
| 按钮形状 | `rounded-lg`（圆角矩形） | `rounded-full`（胶囊） |
| 按钮 emoji | 有（每个按钮带 emoji 前缀） | 无 |
| Button class | `preset-btn` | `preset-chip` |
| i18n | `t(\`tools.{slug}.preset.{key}\`)` | 相同 |

**额外问题**：`src/engines/ai-image-generation-cost-calculator.ts` 第 21–28 行定义了 `PRESETS` 常量但**从未被引用**，UI 在 [slug].astro 里独立写了一份（key 命名也不同：引擎用 `Solopreneur`/`Content Creator` 这种 TitleCase，UI 用 `solopreneur`/`creator` 小写）。死代码 + 重复定义风险。

## 2. Goals

1. **视觉统一**：4 个 AI Cost v3 的 chip 区域和 Business v3 24 个完全一致（顶部、圆角矩形、emoji、tracking-wide 标签）
2. **数据归属清晰**：preset 数据归引擎（跟 `calculate()` / `staticExamples` 同级），页面只负责渲染
3. **死代码清理**：删除 ai-image 引擎里未使用的 `PRESETS` 常量
4. **不破坏**：4 个 LLM token 和 24 个 Business v3 完全不动

## 3. Non-Goals

- LLM token 4 个的 inline `p.zh`/`p.en` i18n 重构（视觉已经一致，架构是另一个问题）
- 任何引擎 `calculate()` / `customFn` / `staticExamples` 业务逻辑改动
- 改 chip 之外的其他 UI 元素（form inputs、submit、result 区域）

## 4. Design

### 4.1 Schema（`src/core/engines/types.ts`）

```ts
export interface Preset {
  key: string;                               // i18n lookup key (e.g. 'solopreneur')
  emoji: string;                             // emoji prefix (e.g. '💼')
  fields: Record<string, string | number>;   // input name → value, written as data-* attrs
}

export interface ToolEngine {
  // ... 现有字段保持不变 ...
  presets?: Preset[];                        // 可选；目前只 4 个 AI Cost 设置
}
```

**字段语义**：
- `key` 用于 `t(\`tools.${slug}.preset.${key}\`, lang)` 查 i18n label
- `emoji` 每个 chip 一个 emoji 前缀
- `fields` key = input 的 `name` 属性，value = 该 input 应被填的值。零翻译

### 4.2 组件（`src/components/PresetChips.astro`，新建）

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
        {...Object.fromEntries(Object.entries(p.fields).map(([k, v]) => [`data-${k}`, String(v)]))}
      >
        {p.emoji} {t(`tools.${slug}.preset.${p.key}`, lang)}
      </button>
    ))}
  </div>
</div>
```

**为什么抽组件**：4 个 AI Cost 用同构 schema 后渲染逻辑通用；[slug].astro 已 1754 行；未来新增 preset 改组件比改 page 干净。

### 4.3 页面改动（`src/pages/[lang]/[slug].astro`）

**改动 1**：新增 import
```ts
import PresetChips from '../../components/PresetChips.astro';
```

**改动 2**：删除 4 个 inline 块（line 863–978，约 116 行）：
- `{isAiApiCostComparison && (...)}`
- `{isImage && (...)}`
- `{isTraining && (...)}`
- `{isGpu && (...)}`

**改动 3**：在 `<form>` 内、slug 三元链最前面插入：
```astro
{engine.presets && engine.presets.length > 0 && (
  <PresetChips presets={engine.presets} slug={slug} lang={lang} />
)}
```

**JS 端**：无需改动。`isImage`/`isTraining`/`isGpu`/`isAiApiCostComparison` 这 4 个变量在 `<script>` 里仍用于选择 `IMAGE_CONFIG` 等计算配置；preset chip 点击设置 input 的通用 handler（遍历 `data-*` → `getElementById(name).value = ...`）已被 Business v3 24 个 calc 使用，AI Cost 这 4 个直接复用同一份逻辑。

### 4.4 引擎改动（4 个文件）

每个引擎在 `const engine: ToolEngine = {...}` 内新增 `presets: [...]` 字段，6 项 preset，内容从当前 [slug].astro 的 inline 块搬过来（保留现有 key + 数值）。Emoji 按 v3 风格重选（避免重复，例如 gpu 的 🚀 / 📦 / 🏭 / 🏢 / 💰 / 🏆）。

| 引擎 | 文件 |
|---|---|
| AI Image | `src/engines/ai-image-generation-cost-calculator.ts` — **同时删除第 21–28 行未使用的 `PRESETS` 常量** |
| AI Training | `src/engines/ai-training-cost-estimator.ts` |
| GPU Cloud | `src/engines/gpu-cloud-cost-calculator.ts` |
| AI API Comparison | `src/engines/ai-api-cost-comparison.ts` |

**关键约束**：preset `fields` 的 key 必须等于该 calc 的 `engine.inputs[].name`。实施前先读每个引擎的 `inputs[]` 拿到准确 name 列表（推测为 camelCase 形式：provider / imagesPerMonth / resolution / batchSize / advancedMode 等，以读到的实际为准）。

### 4.5 i18n（`src/i18n/translations.ts`）

校验每个 AI Cost calc 有 6 preset key × 2 lang = 12 条翻译。缺哪条补哪条（en 用短语，zh 用中文短语，沿用现有 key 风格）。

涉及 key 集合（实施前 grep 确认存在性）：
- `tools.solopreneur-ai-image-cost-calculator.preset.{solopreneur, creator, agency, budget, logos, artistic}`
- `tools.solopreneur-ai-training-cost-estimator.preset.{quick-lora, mid-13b, full-70b, enterprise-180b, budget-7b, pro-405b}`
- `tools.solopreneur-gpu-cloud-cost-calculator.preset.{budget-single, dev-box, training-rig, enterprise-h100, cheapest-h200, pro-8h100}`
- `tools.solopreneur-ai-api-cost-comparison.preset.{support-bot, rag-qa, code-review, content-gen, data-analysis, batch}`

## 5. Files Touched

| 文件 | 操作 |
|---|---|
| `src/core/engines/types.ts` | 新增 `Preset` 接口；`ToolEngine` 加 `presets?: Preset[]` |
| `src/components/PresetChips.astro` | 新建 |
| `src/pages/[lang]/[slug].astro` | +1 import、+1 `<PresetChips />` 调用、−116 行（4 个 inline 块） |
| `src/engines/ai-image-generation-cost-calculator.ts` | +`presets: [...]`；−未使用的 `PRESETS` 常量（第 21–28 行） |
| `src/engines/ai-training-cost-estimator.ts` | +`presets: [...]` |
| `src/engines/gpu-cloud-cost-calculator.ts` | +`presets: [...]` |
| `src/engines/ai-api-cost-comparison.ts` | +`presets: [...]` |
| `src/i18n/translations.ts` | 缺啥补啥（预计每 calc × 2 lang × 6 key = 48 条，最大范围；实际是补缺） |

## 6. Acceptance Criteria

- [ ] `pnpm build` 通过，无 TS 错误
- [ ] `pnpm check`（typecheck + test:run）通过
- [ ] 访问 4 个 AI Cost calc 的 en/zh 页面：顶部出现 6 个 chip + "Scenario Presets" / "场景预设" 标签 + emoji 前缀
- [ ] 点击任一 chip：对应 input 被正确填充
- [ ] 视觉对比：AI Cost 4 个页面 chip 区域与 Business v3 24 个一致
- [ ] `ai-image-generation-cost-calculator.ts` 里未使用的 `PRESETS` 常量已删除
- [ ] LLM token 4 个 + Business v3 24 个完全未改动
- [ ] `git diff src/pages/[lang]/[slug].astro` 净减少 ~116 行

## 7. Risks & Mitigations

| 风险 | 缓解 |
|---|---|
| preset `fields` 字段名跟 `engine.inputs[].name` 不一致 → chip 点击不生效 | 实施前先读每个引擎 `inputs[]` 拿真实 name 列表 |
| 删 [slug].astro inline 块误删相邻代码 | Edit 用唯一 old_string 精确匹配；删前后 git diff 校验 |
| 组件 `id` 命名跟 Business v3 重名冲突 | 用 `slugKey`（去掉 `solopreneur-` 前缀）做 id 后缀 |
| translations.ts 缺 key 导致 chip 显示空白 | 实施前 grep 校验，缺啥补啥 |
| `pnpm build` / `pnpm check` 报错 | 阻塞 commit，按错误逐个修 |