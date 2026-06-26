# AI Cost v3 — Preset Chip 位置与样式对齐设计（含全 32 个 chip 数据 attr 升级）

**Date:** 2026-06-26
**Status:** Brainstormed (user-approved approach Y — full unification + click bug fix)
**Scope:**
- 4 AI Cost v3 计算器（ai-image-cost / ai-training-cost / gpu-cloud-cost / ai-api-cost-comparison）：搬位置 + 升级样式
- 4 LLM token 计算器：data-attr 升级为 kebab-case
- 24 Business v3 计算器：data-attr 升级为 kebab-case
- JS handler：合并 `.preset-btn` 硬编码 + `.preset-chip` 通用 handler 为统一通用 handler

**Out of scope:**
- 引擎 `calculate()` / `customFn` / `staticExamples` 任何业务逻辑
- 新组件（`<PresetChips />` 不建，inline blocks 架构保留）
- `engine.presets` 字段、`Preset` 类型
- ai-image engine 第 21-28 行未使用的 `PRESETS` 常量（死代码不在本次 scope）
- `BIZ_CONFIG_MAP` / `BIZ_*_CONFIG` 重构
- form 之外的其他元素（inputs、submit、advanced collapse）

## 1. Problem

### 1.1 用户可见问题

用户截图（`forgeflowkit.com/zh/solopreneur-ai-image-cost-calculator/`）显示 6 个场景预设 chip **仍在 form 底部**，紧贴「生成」按钮上方——与其他 28 个有 chip 的计算器视觉不一致。

### 1.2 隐藏 bug（用户没报，但本次解决）

JS 端有两个独立 handler：

```js
// Line 1532 — 硬编码，仅支持 LLM token 字段
var presetBtns = document.querySelectorAll('.preset-btn');
presetBtns.forEach(function(btn) {
  btn.addEventListener('click', function() {
    var modelsEl = document.getElementById('models');
    var itEl = document.getElementById('inputTokens');
    var otEl = document.getElementById('outputTokens');
    var rdEl = document.getElementById('requestsPerDay');
    if (modelsEl && this.dataset.models) modelsEl.value = this.dataset.models;
    if (itEl && this.dataset.it) itEl.value = this.dataset.it;  // 缩短别名!
    // ... 硬编码字段
  });
});

// Line 1560 — 通用 handler
var presetChips = document.querySelectorAll('.preset-chip');
presetChips.forEach(function(chip) {
  chip.addEventListener('click', function() {
    var ds = this.dataset;
    for (var key in ds) {
      var el = document.getElementById(key);
      if (el) el.value = ds[key];
    }
  });
});
```

input id = `input.name`（来自 engine `inputs[].name`，全部 camelCase，如 `imagesPerMonth`），但 chip HTML 中 data-attr 是 **lowercase**（`data-imagespermonth`）—— HTML 浏览器自动 lowercase 后 `dataset.imagespermonth` 与 input id `imagesPerMonth` 不匹配，**handler 找不到 input → click 无反应**。

**影响范围**：
- AI Cost 4 个：chip click 完全无反应（用 `.preset-chip` 通用 handler + lowercase data-attr）
- Business v3 24 个：chip click 也无反应（用 `.preset-btn` 硬编码 handler，business 字段不在硬编码列表里）
- LLM token 4 个：chip click 能工作（用缩短别名 `data-it` / `data-ot` / `data-rd` + handler 硬编码映射）

### 1.3 现状表格

```
┌───────────────────────────────────────────────────────────────┐
│ 类别        │ 数量 │ 位置      │ 样式       │ click 是否工作  │
├───────────────────────────────────────────────────────────────┤
│ LLM token   │  4   │ 顶部 ✓   │ 新样式 ✓  │ ✓ (短别名 + 硬编)│
│ Business v3 │ 24   │ 顶部 ✓   │ 新样式 ✓  │ ✗ (lowercase)    │
│ AI Cost v3  │  4   │ 底部 ✗   │ 旧样式 ✗  │ ✗ (lowercase)    │
└───────────────────────────────────────────────────────────────┘
```

## 2. Goals

1. **位置对齐**：4 个 AI Cost chip 区从 form 底部搬到 form 顶部，与 LLM token 4 个 / Business v3 24 个同位置
2. **样式对齐**：4 个 AI Cost 块用新样式（label emoji + uppercase tracking-wide + rounded-lg + 按钮 emoji + `.preset-btn` class）
3. **handler 统一**：合并 `.preset-btn` 硬编码 handler + `.preset-chip` 通用 handler 为**一个统一的通用 handler**（`.preset-btn`，通过 `dataset` 遍历 + `getElementById` 自动匹配）
4. **data-attr kebab-case**：所有 32 个 chip 的 data-attr 从 camelCase/lowercase 改为 **kebab-case**（如 `data-imagesPerMonth` → `data-images-per-month`），浏览器 DOM 自动转 `dataset.imagesPerMonth` → `getElementById('imagesPerMonth')` 命中
5. **修复 click bug**：32 个 chip click 全部能正确填入 input（包括 LLM token 4 个——它们的缩短别名展开为完整 kebab-case 后，沿用同一通用 handler）
6. **0 引擎改动**：4 个 AI Cost + 24 个 Business v3 + 4 个 LLM token engine 文件不动

## 3. Non-Goals

- 引擎 `calculate()` / `customFn` / `staticExamples` 任何业务逻辑
- 新组件（`<PresetChips />` 不建）
- `Preset` 类型 / `engine.presets` 字段
- ai-image engine 第 21-28 行未使用的 `PRESETS` 常量
- `BIZ_CONFIG_MAP` / `BIZ_*_CONFIG` 重构
- form 之外的其他元素（inputs、submit、advanced collapse、result 区域）

## 4. Design

### 4.1 页面改动 — AI Cost 4 个块搬迁 + 升级（`src/pages/[lang]/[slug].astro`）

**改动 1**：搬位置
- 把 line 879-995 的 4 个 AI Cost inline 块（`isAiApiCostComparison` / `isImage` / `isTraining` / `isGpu`）**整体搬到 line 146 后**，紧跟 `<form>` 开始
- 位置排序（明确无歧义）：
  ```
  line 145: <form id="tool-form">
  line 146: {slug === 'solopreneur-openai-token-calculator' ? ( ... )}
           ... 其他 3 个 LLM token ...
  line 155: {isAiApiCostComparison && ( ... )}   ← AI Cost 4 个块插这里
           {isImage && ( ... )}
           {isTraining && ( ... )}
           {isGpu && ( ... )}
  line 175: {isMr && ( ... )}                    ← Business v3 24 个块从这开始
           ... 其他 23 个 ...
  ```

**改动 2**：HTML 模板升级
- 旧 `<div class="flex flex-wrap gap-2 mt-3">` → 新 `<div class="mb-5">`
- 旧 `<span class="text-sm text-gray-500 mr-1">场景预设：</span>` → 新 `<span class="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">🎭 场景预设</span>`（英文版 "🎭 Scenario Presets"）
- 旧 `<button class="preset-chip text-xs px-3 py-1.5 rounded-full border hover:bg-gray-100 transition" data-lowercase="...">{t(...)}</button>`
- 新 `<button class="preset-btn text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-all" data-kebab-case="...">{emoji} {t(\`tools.{slug}.preset.{key}\`, lang)}</button>`
- 按钮容器 id：`<div id={\`preset-buttons-${slug.replace('solopreneur-', '')}\`}>`（如 `preset-buttons-ai-image-cost-calculator`）

**改动 3**：emoji 前缀（每个 preset 一个）：
- AI image: 💼 Solopreneur / 🎨 Creator / 🏢 Agency / 💰 Budget / 🔤 Logos / 🖼️ Artistic
- AI training: 🚀 Quick LoRA / 📦 13B Mid / 🏭 Full 70B / 🏢 180B Enterprise / 💰 Budget 7B / 🏆 Pro 405B
- GPU cloud: 💰 Budget Single / 💻 Dev Box / 🏋️ Training Rig / 🏢 Enterprise H100 / 🏷️ Cheapest H200 / 🏆 Pro 8×H100
- AI API comparison: 🤖 Support Bot / 📚 RAG QA / 💻 Code Review / ✍️ Content Gen / 📊 Data Analysis / ⚡ Batch

### 4.2 页面改动 — Business v3 24 个 chip data-attr kebab-case 升级（同一文件）

24 个 Business v3 chip 块（line 455-856）位置不动，仅修改每个 `<button>` 的 data-attr 名：
- camelCase 字段：`data-monthlyrevenue` → `data-monthly-revenue`
- 其他字段同理（实施前 grep 拿全字段名清单）

按钮 class / emoji / label 全部不变。

### 4.3 页面改动 — LLM token 4 个 chip data-attr 升级 + 简化别名展开（同一文件）

4 个 LLM token chip 块（line 147-451）位置不动，但 data-attr **从缩短别名展开为完整 kebab-case**：
- `data-m` → `data-models`
- `data-it` → `data-input-tokens`
- `data-ot` → `data-output-tokens`
- `data-rd` → `data-requests-per-day`
- `data-pm` → `data-pricing-mode`
- `data-cw` → `data-cache-write-tokens`
- `data-cttl` → `data-cache-ttl`
- `data-chr` → `data-cache-read-hit-rate`
- `data-gr` → `data-growth-rate`
- `data-pj` → `data-projection-months`

按钮 class / emoji / label 全部不变。LLM token 4 个的 `data-models` 是特殊的（多选 select，handler 特殊处理）——保留并适配通用 handler。

### 4.4 JS handler 统一（同一文件 line 1532-1581）

**删除** line 1532-1581 的两个 handler（`.preset-btn` 硬编码 + `.preset-chip` 通用）。

**新增**统一通用 handler：

```js
// --- Unified preset chip handler (replaces both old handlers) ---
var presetBtns = document.querySelectorAll('.preset-btn');
presetBtns.forEach(function(btn) {
  btn.addEventListener('click', function() {
    var ds = this.dataset;
    for (var key in ds) {
      if (ds.hasOwnProperty(key)) {
        var el = document.getElementById(key);
        if (el) {
          if (el.tagName === 'SELECT' && el.multiple) {
            // Multi-select: split comma-separated values
            var values = String(ds[key]).split(',');
            Array.from(el.options).forEach(function(opt) {
              opt.selected = values.indexOf(opt.value) !== -1;
            });
          } else if (el.tagName === 'SELECT') {
            // Single-select: set value if option exists
            var opt = el.querySelector('option[value="' + ds[key] + '"]');
            if (opt) el.value = ds[key];
          } else {
            el.value = ds[key];
          }
        }
      }
    }
  });
});
```

**为什么这样能 work**：
- HTML `data-images-per-month="100"` → 浏览器保留 kebab-case
- JS `btn.dataset.imagesPerMonth` → DOM 自动 kebab → camelCase
- `getElementById('imagesPerMonth')` → 命中 `id={input.name}` 渲染的 input
- 32 个 chip 全用同一份逻辑，包括 LLM token 多选 `data-models`

### 4.5 i18n 校验（`src/i18n/translations.ts`，只读 + 必要时补）

实施前 grep 校验 48 条 key 存在性（4 AI Cost × 6 preset × 2 lang）：
```bash
grep -nE "solopreneur-(ai-image-cost|ai-training-cost|gpu-cloud-cost|ai-api-cost-comparison)\.preset\." \
  src/i18n/translations.ts
```

缺哪条补哪条。**不动 Business v3 / LLM token 的 i18n key**（它们已存在）。

### 4.6 实施顺序

1. **read**：line 147-451（LLM token 4 块）+ line 453-468（Business v3 参考模板）+ line 875-995（AI Cost 旧 4 块）+ line 1532-1581（两个旧 handler）
2. **grep i18n**：48 条 key 校验，缺啥先补
3. **edit handler**：合并两个 handler 为统一通用 handler（line 1532-1581）
4. **edit LLM token**：4 个块 data-attr 简化别名 → 完整 kebab-case（位置不动）
5. **edit Business v3**：24 个块 data-attr kebab-case 升级（位置不动）
6. **edit AI Cost**：4 个块搬位置 + 模板升级 + emoji + kebab-case data-attr
7. **verify**：`pnpm build` 0 错误；浏览器手测 4 个 AI Cost chip click 能填 input
8. **commit**：1 个 commit，message 描述完整范围

## 5. Files Touched

| 文件 | 操作 | 改动量估算 |
|---|---|---|
| `src/pages/[lang]/[slug].astro` | Modify（AI Cost 4 块搬位置 + 模板升级 + 24 Business + 4 LLM data-attr 改 kebab + 合并 handler） | ~250 行净变化（删除 ~50 行旧 handler + 重写 50 行新 handler；改 ~144 个 button 的 data-attr 名） |
| `src/i18n/translations.ts` | Modify（仅缺 key 时） | 0-48 行 |

**完全不动**：32 个 engine / `src/core/engines/types.ts` / 任何新组件 / CI / 任何其他 docs

## 6. Acceptance Criteria

- [ ] `pnpm build` 0 错误，138+ 页面生成
- [ ] `pnpm check`（typecheck + test:run）0 错误
- [ ] 访问 `/zh/solopreneur-ai-image-cost-calculator/`：preset chip 在 form **顶部**，标签 "🎭 场景预设"，6 个按钮带 emoji，圆角矩形
- [ ] 访问 `/en/solopreneur-ai-image-cost-calculator/`：标签 "🎭 Scenario Presets"
- [ ] **click 测试 1**：点 AI image "💼 Solopreneur" chip → provider 选 DALL-E 4、imagesPerMonth=100、resolution=1024×1024、batchSize=1、advancedMode=standard
- [ ] **click 测试 2**：点 AI training "🚀 Quick LoRA" → modelSize=7B、gpuType=H100-80GB、gpuCount=2、trainingHours=8、epochs=3
- [ ] **click 测试 3**：点 GPU cloud "💻 Dev Box" → provider=runpod、gpuType=A100、gpuCount=1、hoursPerDay=8、pricingTier=on-demand
- [ ] **click 测试 4**：点 AI API comparison "🤖 Support Bot" → inputTokens=800、outputTokens=200、requestsPerDay=500、pricingMode=realtime
- [ ] **回归 click 测试**：4 个 LLM token chip click 仍能工作（kebab-case attr 后通用 handler 命中）
- [ ] **回归 click 测试（bonus）**：24 个 Business v3 chip click 也能工作（kebab-case attr 后通用 handler 命中——pre-existing bug 修复）
- [ ] 视觉对比：AI Cost 4 个 chip 区与 Business v3 24 个 / LLM token 4 个不可区分（除 emoji 字符和数据字段）
- [ ] 验证 HTML：grep AI Cost chip 页面 `<button class="preset-btn"` 在 form 顶部；grep `preset-chip` 全仓无残留
- [ ] `git status` 显示 `src/engines/*` 无变更

## 7. Risks & Mitigations

| 风险 | 缓解 |
|---|---|
| AI Cost chip data-attr 改名遗漏某个字段 → click 缺填 | 实施前 grep 当前块的全部 data-attr；按字段名清单逐一改 |
| Business v3 字段名异构（24 个 calc × ~5-8 字段 = 144 个 attr）手工改易漏 | 用 sed 或 Edit `replace_all` 按字段名 pattern 替换；改完 grep 验证 |
| LLM token 缩短别名展开后 handler 找不到 input | 实施前先列 input.name 全清单，对应 kebab-case attr 名 |
| 多选 select（LLM token `models`）通用 handler 不工作 | handler 单独 case：检测 `el.multiple` 时按 comma-split 设置 options |
| 合并 handler 后 LLM token 现有 click 行为退化 | click 测试强制跑 4 个 LLM token 页面；失败则回退 |
| 改 28 个兄弟块过程中 Edit 误匹配 | 用 `data-camelcase=` 作为唯一 old_string 锚点；改完 git diff 校验 |
| `pnpm build` 报错（TS / JSX 引号 / 模板语法） | 阻塞，逐个修；最常见是 JSX 单引号转义 |
| i18n 缺 key 导致 chip label 空白 | 实施前 grep 校验；补 key 时按已有命名风格 |

## 8. Out-of-Scope Reminder（避免 scope creep）

实施时如发现以下情况，**停下来 + 报告用户**：

1. ai-image engine 第 21-28 行 `PRESETS` 死代码——不删
2. 任何 chip 之外 form 元素（inputs、submit、advanced、result 卡片）——不动
3. 引擎文件任何字段（即使发现不一致）——不动
4. 新建 `<PresetChips />` 组件——克制，与 scope 无关
5. `BIZ_CONFIG_MAP` / `BIZ_*_CONFIG` 重构——克制
6. LLM token 缩短别名在 4 个块里的不一致（有的用 `data-m`，有的用 `data-models`）——本次统一展开为 `data-models`，不改其他

## 9. Predecessor & Lessons

`docs/superpowers/specs/2026-06-24-ai-cost-preset-chip-unification-design.md`（前身 C 方案）已被 scoped down + skipped，原因：抽组件 + 改 engine 风险 > 收益。

本次设计**主动选择 Y 方案（彻底统一）**——因为：
1. 用户已明确接受扩展 scope
2. 32 个 chip 的 click bug 是 pre-existing 隐患，**统一实现顺手修掉**比留作技术债价值高
3. 改动集中在 1 个文件，影响面可控（无新文件、无新依赖）
4. handler 合并是**减法**——从 ~50 行两套逻辑合并为 ~30 行一套，比之前更易维护

### Predecessor Mistakes Avoided

- ❌ C 方案的 `engine.presets` 字段 → 不加
- ❌ C 方案的 `<PresetChips />` 组件 → 不建
- ❌ C 方案的 `Preset` 类型 → 不加
- ✅ 单一文件改动，inline blocks 架构保留
- ✅ 减法逻辑（合并 handler）替代加法（新组件）