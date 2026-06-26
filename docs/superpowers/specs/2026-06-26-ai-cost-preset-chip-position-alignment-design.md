# AI Cost v3 — Preset Chip 位置与样式对齐设计

**Date:** 2026-06-26
**Status:** Brainstormed (user-approved approach B)
**Scope:** 4 AI Cost v3 calculators (ai-image-cost / ai-training-cost / gpu-cloud-cost / ai-api-cost-comparison)
**Out of scope:** 4 LLM token calculators (already aligned), 24 Business v3 calculators (already aligned), any engine `calculate()`/`customFn`/`staticExamples` logic change, new component abstraction.

## 1. Problem

用户截图（`forgeflowkit.com/zh/solopreneur-ai-image-cost-calculator/`）显示 6 个场景预设 chip **仍在 form 底部**，紧贴「生成」按钮上方——与其他 28 个有 chip 的计算器视觉不一致。

```
现状（grep src/pages/[lang]/[slug].astro 实测）:

┌─────────────────────────────────────────────────────┐
│ 类别          │ 数量 │ 位置        │ 样式          │
├─────────────────────────────────────────────────────┤
│ LLM token     │  4   │ form 顶部 ✓ │ 新样式 ✓      │
│ Business v3   │ 24   │ form 顶部 ✓ │ 新样式 ✓      │
│ AI Cost v3    │  4   │ form 底部 ✗ │ 旧样式 ✗      │
└─────────────────────────────────────────────────────┘
```

**新样式（LLM token / Business v3 用的）**：
```html
<span class="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
  🎭 场景预设
</span>
<div class="flex flex-wrap gap-1.5" id="preset-buttons-{slugKey}">
  <button class="preset-btn text-xs px-2.5 py-1.5 rounded-lg border border-gray-200
                 bg-gray-50 hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-all"
          data-xxx="...">{emoji} {t('tools.{slug}.preset.{key}', lang)}</button>
  ...
</div>
```

**旧样式（AI Cost 4 个当前在用的）**：
```html
<span class="text-sm text-gray-500 mr-1">场景预设：</span>
<button class="preset-chip rounded-full ..." data-xxx="...">{p.zh}</button>
...
```

差异点：
- 位置：顶部 ↔ 底部
- 标签：emoji + uppercase tracking-wide ↔ 纯文本 "场景预设："
- 按钮形状：`rounded-lg` 圆角矩形 ↔ `rounded-full` 胶囊
- 按钮前缀：无 emoji ↔ 有 emoji
- class 名：`preset-btn` ↔ `preset-chip`

## 2. Goals

1. **位置对齐**：4 个 AI Cost 的 chip 区从 form 底部搬到 form 顶部，与 LLM token 4 个 / Business v3 24 个同位置
2. **样式对齐**：用 [slug].astro 现已存在的「新样式」HTML 模板（line 145-165 是 LLM token 的参考实现）替换 AI Cost 4 个的「旧样式」
3. **i18n 校验**：确认 AI Cost 4 个 × 6 preset key × 2 lang = 48 条 `t('tools.{slug}.preset.{key}', lang)` 翻译全部存在；缺啥补啥
4. **0 引擎改动**：4 个 AI Cost engine 文件不动；数据仍归 [slug].astro inline blocks
5. **0 架构变更**：不抽 PresetChips 组件、不加 engine.presets 字段——inline blocks 是 32 个计算器的现状架构，本次只做视觉对齐

## 3. Non-Goals

- LLM token 4 个 / Business v3 24 个任何改动（已对齐）
- 抽 `<PresetChips />` 组件（与本次 scope 无关，audit-polish 已明确 24 个 Business v3 preset 数据异构无法 DRY，单为 4 个 AI Cost 抽组件会破坏一致性）
- 加 `Preset` 类型 + `engine.presets` 字段（同上）
- 改 chip 之外的 form 元素（inputs、submit、advanced collapse）
- 改引擎 `calculate()` / `customFn` / `staticExamples` 任何业务逻辑
- 删除 ai-image engine 第 21-28 行未使用的 `PRESETS` 常量（死代码，但不在本次 scope）
- `BIZ_CONFIG_MAP` / `BIZ_*_CONFIG` 重构
- `pnpm check` / `pnpm build` 之外的 CI 改动

## 4. Design

### 4.1 页面改动（`src/pages/[lang]/[slug].astro`，唯一改动文件）

**改动 1**：把 4 个 AI Cost inline chip 块（当前在 line 879-995）**整体搬迁**到 form 顶部，紧跟 `<form>` 开始标签（line 145），与 LLM token 4 个（line 151 起）和 Business v3 24 个（line 455-856）的位置同构。

**位置排序**（明确无歧义）：
```
line 145: <form id="tool-form">
line 146: {slug === 'solopreneur-openai-token-calculator' && ( ... )}
         ... 其他 3 个 LLM token ...
line 155: {isAiApiCostComparison && ( ... )}     ← AI Cost 4 个块插在这里
         {isImage && ( ... )}
         {isTraining && ( ... )}
         {isGpu && ( ... )}
line 175: {isMr && ( ... )}                     ← Business v3 24 个块从这开始
         ... 其他 23 个 ...
```

理由：AI Cost 与 LLM token 都属 AI 类，逻辑上挨着更自然；同时不打断 Business v3 的 if/else 长链。

涉及块（每个约 28-30 行）：
- `{isAiApiCostComparison && (...)}` — 当前 line 879-908
- `{isImage && (...)}` — 当前 line 910-937
- `{isTraining && (...)}` — 当前 line 939-966
- `{isGpu && (...)}` — 当前 line 968-995

**改动 2**：HTML 模板升级——4 个块内部 markup 从「旧样式」改为「新样式」（详见 §1 对比）。具体替换：

```diff
- <div class="flex flex-wrap gap-2 mt-3">
-   <span class="text-sm text-gray-500 mr-1">场景预设：</span>
-   <button class="preset-chip ..." data-xxx="...">{p.zh}</button>
+ <div class="mb-5">
+   <span class="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
+     🎭 场景预设
+   </span>
+   <div class="flex flex-wrap gap-1.5" id={`preset-buttons-{slugKey}`}>
+     <button class="preset-btn text-xs px-2.5 py-1.5 rounded-lg border border-gray-200
+                    bg-gray-50 hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-all"
+             data-xxx="...">{p.emoji} {t(`tools.{slug}.preset.{p.key}`, lang)}</button>
+   </div>
+ </div>
```

(英文版把 "场景预设" 换成 "Scenario Presets"，并加 🎭 emoji 前缀)

**改动 3**：emoji 前缀——4 个 AI Cost 当前 inline blocks 没存 emoji，需要补。Emoji 按 v3 风格（与 Business v3 24 个 + LLM token 4 个一致）：
- AI image: 💼 Solopreneur / 🎨 Creator / 🏢 Agency / 💰 Budget / 🔤 Logos / 🖼️ Artistic
- AI training: 🚀 Quick LoRA / 📦 13B Mid / 🏭 Full 70B / 🏢 180B Enterprise / 💰 Budget 7B / 🏆 Pro 405B
- GPU cloud: 💰 Budget Single / 💻 Dev Box / 🏋️ Training Rig / 🏢 Enterprise H100 / 🏷️ Cheapest H200 / 🏆 Pro 8×H100
- AI API comparison: 🤖 Support Bot / 📚 RAG QA / 💻 Code Review / ✍️ Content Gen / 📊 Data Analysis / ⚡ Batch

**改动 4**：JS handler 兼容——line 1532 的 `var presetBtns = document.querySelectorAll('.preset-btn');` 已存在，点击 handler 通过遍历 `data-*` attr 设 input 值。当前 AI Cost 块用 `preset-chip` class，本次升级为 `preset-btn`，自动纳入同一 handler，无需改 JS。

### 4.2 数据保留（不动引擎）

4 个 AI Cost engine 文件本次**完全不动**：
- `src/engines/ai-image-generation-cost-calculator.ts`（含未使用的 `PRESETS` 常量，本次保留）
- `src/engines/ai-training-cost-estimator.ts`
- `src/engines/gpu-cloud-cost-calculator.ts`
- `src/engines/ai-api-cost-comparison.ts`

preset 数据保留在 [slug].astro 的 4 个 inline 块（与 LLM token 4 个 / Business v3 24 个同架构）。

### 4.3 i18n 校验（`src/i18n/translations.ts`，只读 + 必要时补）

实施前 grep 校验 48 条 key 全部存在：

```bash
grep -nE "solopreneur-(ai-image-cost|ai-training-cost|gpu-cloud-cost|ai-api-cost-comparison)\.preset\." \
  src/i18n/translations.ts
```

期望：每 calc × 6 preset key × 2 lang = 48 行（en + zh 各 24 行）。

缺哪条补哪条（en 用短语，zh 用中文短语，沿用 LLM token / Business v3 key 命名风格）。

### 4.4 实施顺序

1. **read**：[slug].astro line 145-165（LLM token 参考实现）+ line 455-465（Business v3 参考实现）+ line 879-995（AI Cost 旧实现）
2. **grep**：i18n 校验 48 条 key 存在性，缺啥先补
3. **edit**：4 个 AI Cost 块搬到 line 146 之后（紧跟 form 开始），HTML 模板升级，emoji 加
4. **verify**：`pnpm build` 0 错误；`curl /zh/solopreneur-ai-image-cost-calculator/ | grep 场景预设` 应在 form 顶部
5. **commit**：1 个 commit，message 描述 4 个 AI Cost preset chip 视觉对齐

## 5. Files Touched

| 文件 | 操作 | 改动量估算 |
|---|---|---|
| `src/pages/[lang]/[slug].astro` | Modify（搬 4 块 + 模板升级 + emoji） | ~120 行净移动（删除 116 行旧模板 + 重写 4 块新模板） |
| `src/i18n/translations.ts` | Modify（仅缺 key 时） | 0-48 行（按实际缺口） |

**完全不动**：4 个 AI Cost engine / 24 个 Business v3 engine / 4 个 LLM token engine / `src/core/engines/types.ts` / 任何新组件文件 / 任何 CI / 任何 docs（除本 spec）

## 6. Acceptance Criteria

- [ ] `pnpm build` 0 错误，138+ 页面生成
- [ ] `pnpm check`（typecheck + test:run）0 错误
- [ ] 访问 `/zh/solopreneur-ai-image-cost-calculator/`：preset chip 在 form **顶部**，标签 "🎭 场景预设"，6 个按钮带 emoji，圆角矩形（非胶囊）
- [ ] 访问 `/en/solopreneur-ai-image-cost-calculator/`：标签 "🎭 Scenario Presets"，其他同上
- [ ] 4 个 AI Cost 页面（image / training / gpu / ai-api-comparison）× 2 langs = 8 个页面全部验证
- [ ] 视觉对比：AI Cost 4 个的 chip 区与 Business v3 24 个不可区分（除 emoji 字符）
- [ ] **回归保护**：4 个 LLM token 计算器 + 24 个 Business v3 计算器**完全无改动**
- [ ] **点击行为**：点 chip → 对应 input 被正确填充（沿用现有 `.preset-btn` handler）
- [ ] `git diff src/pages/[lang]/[slug].astro` 净减少约 116 行（旧模板 4 块）+ 4 块新模板约 130 行 ≈ +14 行净变化（来自模板升级和 emoji）
- [ ] `git status` 显示 `src/engines/*` 无变更

## 7. Risks & Mitigations

| 风险 | 缓解 |
|---|---|
| Edit `old_string` 误匹配相邻代码 | 用唯一标识（`isAiApiCostComparison &&` / `isImage &&` / `isTraining &&` / `isGpu &&`）+ 前后空行作为 old_string 边界 |
| 4 个块顺序错了——AI Cost 块跑到 Business v3 块中间 | 搬位置时按 line 145 form 开始后的顺序：LLM token (line 151) → Business v3 (line 455) → AI Cost (本次新增，在 LLM token 之后或 Business v3 之前——按 v3 规范 AI Cost 应紧跟 LLM token） |
| 升级模板后样式跟兄弟不一致 | 对照 line 151 / 455 的 LLM token / Business v3 模板逐行复制，只换 `data-*` attr 名和 emoji |
| i18n 缺 key 导致 chip 空白 | 实施前 grep 校验，缺啥补啥；翻译用最简短形式（1-3 词） |
| 旧 `preset-chip` class 在 JS handler 还有引用 | grep `preset-chip` 全仓验证无残留；当前唯一引用是 4 个 AI Cost 块 |
| 搬位置后 line number 偏移导致后续 step 错位 | 用 `grep -n "isImage &&"` 等关键标识找新行号，不要假设数字 |
| `pnpm build` 报错 | 阻塞，按错误逐个修（最可能是 TS 类型 + JSX 引号） |

## 8. Out-of-Scope Reminder（避免 scope creep）

实施时如发现以下情况，**停下来 + 报告用户**，不擅自扩展：

1. ai-image engine 第 21-28 行的 `PRESETS` 死代码——不删，本次不动 engine
2. 任何 Business v3 preset 块的样式微调——不动
3. 任何 LLM token preset 块的样式微调——不动
4. 抽 PresetChips 组件的诱惑——克制，与本次 scope 无关
5. chip 点击 handler 通用化——已有 `.preset-btn` handler 够用

## 9. Lessons From Predecessors

**前车之鉴**：`docs/superpowers/specs/2026-06-24-ai-cost-preset-chip-unification-design.md`（本次设计的「C 方案」前身）已被 scoped down + skipped（见 `docs/superpowers/plans/2026-06-24-audit-polish.md` Final State）——原因：抽组件 + 改 engine 风险 > 收益。

本次设计**主动避开**了 C 方案的所有失败点：不动 engine、不动 types.ts、不抽组件、不加新字段。**视觉对齐 = 改 1 个文件的 4 个块**。