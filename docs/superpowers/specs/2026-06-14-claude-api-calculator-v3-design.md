# Claude API Cost Calculator v3 — Design Spec

> 对标 `openai-token-calculator.ts` v3 标准，升级 Claude API Cost Calculator 到行业顶级水平。

**版本:** v3  
**日期:** 2026-06-14  
**状态:** Design

---

## 1. 模型目录（7 个模型，3 个家族）

### ModelInfo 接口（扩展现有）

```typescript
interface ModelInfo {
  input: number;           // $ per 1M input tokens
  output: number;          // $ per 1M output tokens
  name: string;            // Display name
  family: 'mythos' | 'claude4x' | 'legacy';
  contextWindow: string;   // e.g. "1M"
  maxOutput: string;       // e.g. "128K"
  batchInput: number;
  batchOutput: number;
  order: number;           // Display sort (1=newest)
}
```

### 完整模型表

| Key | Name | Input | Output | 上下文 | 最大输出 | Batch In | Batch Out | Family | Order |
|-----|------|-------|--------|--------|----------|----------|-----------|--------|-------|
| `claude-fable-5` | Claude Fable 5 | $10.00 | $50.00 | 1M | 128K | $5.00 | $25.00 | mythos | 1 |
| `claude-opus-4-8` | Claude Opus 4.8 | $5.00 | $25.00 | 1M | 128K | $2.50 | $12.50 | claude4x | 2 |
| `claude-sonnet-4-6` | Claude Sonnet 4.6 | $3.00 | $15.00 | 1M | 64K | $1.50 | $7.50 | claude4x | 3 |
| `claude-haiku-4-5` | Claude Haiku 4.5 | $1.00 | $5.00 | 200K | 64K | $0.50 | $2.50 | claude4x | 4 |
| `claude-opus-4-1` | Claude Opus 4.1 | $15.00 | $75.00 | 200K | 32K | $7.50 | $37.50 | legacy | 5 |
| `claude-haiku-3-5` | Claude Haiku 3.5 | $0.80 | $4.00 | 200K | 8K | $0.40 | $2.00 | legacy | 6 |
| `claude-haiku-3` | Claude Haiku 3 | $0.25 | $1.25 | 200K | 4K | $0.125 | $0.625 | legacy | 7 |

### 家族元数据

```typescript
const FAMILY_ICONS: Record<string, string> = {
  mythos: '✦',    // Mythos class
  claude4x: '▲',   // Claude 4.x Current
  legacy: '◆',     // Legacy
};

const FAMILY_LABELS: Record<string, string> = {
  mythos: 'Mythos',
  claude4x: 'Claude 4.x',
  legacy: 'Legacy',
};

const FAMILY_COLORS: Record<string, string> = {
  mythos: '#7c3aed',    // Purple
  claude4x: '#2563eb',   // Blue
  legacy: '#6b7280',     // Gray
};
```

### Prompt Caching 常量

```typescript
// Cache write multipliers by TTL
const CACHE_WRITE_MULTIPLIER: Record<string, number> = {
  '5min': 1.25,
  '1hour': 2.0,
};

// Cache read multiplier (always 0.1x input price)
const CACHE_READ_MULTIPLIER = 0.1;
```

---

## 2. 输入字段（10 个）

| # | name | label | type | 默认值 | 说明 |
|---|------|-------|------|--------|------|
| 1 | `models` | Models | text (comma-sep keys) | `claude-fable-5,claude-opus-4-8,claude-sonnet-4-6,claude-haiku-4-5` | 多选模型，UI 渲染为 checkbox |
| 2 | `inputTokens` | Input Tokens per Request | number | 1000 | 1–10,000,000 |
| 3 | `outputTokens` | Output Tokens per Request | number | 500 | 1–10,000,000 |
| 4 | `requestsPerDay` | Requests per Day | number | 100 | 0–1,000,000 |
| 5 | `pricingMode` | Pricing Mode | select | realtime | realtime / batch |
| 6 | `cacheWriteTokens` | Cache Write Tokens | number | 1000 | 0–1,000,000，高级折叠内 |
| 7 | `cacheTTL` | Cache TTL | select | 5min | 5min / 1hour，高级折叠内 |
| 8 | `cacheReadHitRate` | Cache Read Hit Rate (%) | number | 0 | 0–100，高级折叠内 |
| 9 | `growthRate` | Monthly Growth Rate (%) | number | 0 | 0–50，高级折叠内 |
| 10 | `projectionMonths` | Projection Period | select | 12 | 3 / 6 / 12，高级折叠内 |

**UI 布局**（对标 OpenAI）：
- 前 5 个输入在主表单中
- 后 5 个输入在 `<details>` 高级折叠中
- Preset 按钮提供 6 个场景（小项目 / 中规模 / 大流量 / 批量处理 / 重度缓存 / 企业级）
- Token estimator textarea

---

## 3. calculate() 函数 — 7 个输出 Section

### Section 1: Header

```
🔴 Real-time Pricing | 💾 50% Cache Hit (5-min TTL)
📥 Input: 1,000 tokens/req | 📤 Output: 500 tokens/req | 🔄 100 reqs/day
```

- 图标前缀：Batch=⚡, Realtime=🔴
- Cache 行只在 cacheReadHitRate > 0 时显示
- Cache write tokens 和 TTL 在括号中显示

### Section 2: Bar Chart — Cost Comparison

```
All Models — Monthly Cost (100 reqs/day)
─────────────────────────────────────────
✦ Claude Fable 5          ████████████████████ $150.00
▲ Claude Opus 4.8         ██████████ $52.50
▲ Claude Sonnet 4.6       ██████ $31.50
▲ Claude Haiku 4.5         ██ $10.50
◆ Claude Opus 4.1         ██████████████████████████████ $236.25
◆ Claude Haiku 3.5         █ $8.40
◆ Claude Haiku 3                    ░ $2.63
```

- 按 order 排序（最新在前）
- 标签 padding 到固定宽度 26 chars
- 标注 cheapest 为绿色，其余为家族色
- 柱状图宽度 = monthlyCost / maxCost * 40 chars（最少 1 char）
- 格式：`{icon} {name:26s} {bars:40s} ${cost}`

### Section 3: Detail Cards — per model

```
✦ Claude Fable 5 (Mythos)
  Context: 1M | Max Output: 128K
  Rate: $10.00/$50.00 per 1M tokens
  Per Request: $0.0350
  Monthly Cost (100 reqs/day): $105.00
  💾 With caching: $58.50 (44% saved)
```

- 每个选中的模型一张卡片
- "With caching" 行只在 cacheReadHitRate > 0 时显示
- 卡片按 order 排序

### Section 4: Caching Breakdown — Claude 特有

```
💾 Prompt Caching Breakdown (5-min TTL × 1.25× write)
─────────────────────────────────────────────────────
• Cache Write: 1,000 tokens/req × $0.0063/write = $0.0063/req
• Cache Miss Cost: $0.0113/req (45% of requests)
• Cache Hit Cost: $0.0005/req (55% of requests)
• Blended Input Cost: $0.0118/req
• vs without caching: $0.0250/req → saves $0.0132/req (53%)
• Break-even: 1 cache hit to recoup write cost
```

- 只在 cacheWriteTokens > 0 时显示
- 使用当前选中的 cheapest 模型做示例计算
- Break-even 计算：5-min TTL 在 ~22% hit rate 回本，1-hour TTL 在 ~53% hit rate 回本

### Section 5: Growth Projection

```
📈 Growth Projection (5%/month, 12 months)

Month  │  Fable 5   │  Opus 4.8  │  Sonnet 4.6  │  Haiku 4.5
───────┼────────────┼────────────┼─────────────┼────────────
     1 │   $105.00  │   $52.50   │   $31.50    │   $10.50
     2 │   $110.25  │   $55.13   │   $33.08    │   $11.03
    ...
    12 │   $179.58  │   $89.79   │   $53.87    │   $17.96
───────┼────────────┼────────────┼─────────────┼────────────
 Total │ $1,678.50  │  $839.25   │  $503.55    │  $167.85
```

- 只在 growthRate > 0 时显示
- 列头 = 选中的模型
- 最后一行 = 累计总成本

### Section 6: Savings Insights — 跨供应商对比

```
💰 Savings Insights
{'─' × 50}
• Claude Haiku 4.5 vs GPT-5 Nano: Claude costs $8.37 more/month (393% premium)
• Claude Haiku 4.5 vs DeepSeek Chat: Claude costs $8.66 more/month (470% premium)
• Claude Haiku 4.5 vs Gemini 1.5 Flash: Claude costs $8.25 more/month (367% premium)
💡 Claude's premium buys: 1M context, best-in-class safety, superior code generation
```

- 用 Claude 家族中最便宜的模型 vs OpenAI/DeepSeek/Gemini 最便宜的模型
- 同时显示溢价百分比
- 底部提示 Claude 的独特价值（不只是价格对比）

### Section 7: Usage Scenarios — per model

```
📊 Usage Scenarios (per model, monthly cost at 100 reqs/day)

✦ Fable 5 (Mythos): 50→$52.50 · 100→$105.00 · 500→$525.00 · 1K→$1,050.00 · 5K→$5,250.00 · 10K→$10,500.00
▲ Opus 4.8 (Claude 4.x): 50→$26.25 · 100→$52.50 · 500→$262.50 · 1K→$525.00 · 5K→$2,625.00 · 10K→$5,250.00
...
```

- 每个选中模型一行
- volumes: [50, 100, 500, 1000, 5000, 10000] reqs/day

---

## 4. customFn — 客户端 JS

必须与 `calculate()` 精确同步。关键约束：
- MODELS map key 必须用完整格式（`claude-fable-5`, `claude-opus-4-8` 等），与 inputs.models 的 key 一致
- 所有数学运算、格式化逻辑、section 顺序必须一致
- 7 个 section 的输出格式必须完全一致

```javascript
var MODELS={
  "claude-fable-5":{i:10,o:50,n:"Claude Fable 5",f:"mythos",cw:"1M",mo:"128K",bi:5,bo:25,od:1},
  "claude-opus-4-8":{i:5,o:25,n:"Claude Opus 4.8",f:"claude4x",cw:"1M",mo:"128K",bi:2.5,bo:12.5,od:2},
  "claude-sonnet-4-6":{i:3,o:15,n:"Claude Sonnet 4.6",f:"claude4x",cw:"1M",mo:"64K",bi:1.5,bo:7.5,od:3},
  "claude-haiku-4-5":{i:1,o:5,n:"Claude Haiku 4.5",f:"claude4x",cw:"200K",mo:"64K",bi:0.5,bo:2.5,od:4},
  "claude-opus-4-1":{i:15,o:75,n:"Claude Opus 4.1",f:"legacy",cw:"200K",mo:"32K",bi:7.5,bo:37.5,od:5},
  "claude-haiku-3-5":{i:0.8,o:4,n:"Claude Haiku 3.5",f:"legacy",cw:"200K",mo:"8K",bi:0.4,bo:2,od:6},
  "claude-haiku-3":{i:0.25,o:1.25,n:"Claude Haiku 3",f:"legacy",cw:"200K",mo:"4K",bi:0.125,bo:0.625,od:7}
};
```

---

## 5. UI 层改造（`[lang]/[slug].astro`）

### 5.1 Presets（6 个场景）

| Scenario | Input | Output | Reqs/day | Pricing | Cache Write | Cache TTL | Hit Rate |
|----------|-------|--------|----------|---------|-------------|-----------|----------|
| 小项目 | 500 | 1000 | 50 | realtime | 500 | 5min | 80% |
| 中规模 | 2000 | 1000 | 500 | realtime | 2000 | 5min | 60% |
| 大流量 | 5000 | 2000 | 5000 | realtime | 5000 | 1hour | 40% |
| 批量处理 | 3000 | 5000 | 10000 | batch | 0 | 5min | 0% |
| 重度缓存 | 2000 | 800 | 2000 | realtime | 2000 | 1hour | 90% |
| 企业级 | 10000 | 5000 | 50000 | batch | 10000 | 1hour | 70% |

### 5.2 Token Estimator

复用 OpenAI 的 textarea 模式，但需要说明 Claude tokenizer 差异：
- 提示文字："Claude uses a different tokenizer than OpenAI — roughly 1.0-1.35× more tokens for the same text"
- 英文估算：~1.3 tokens/word（Claude 比 OpenAI 的 1.3 略高，实际 1.3-1.5）
- 中文估算：~0.7 chars/token（与 OpenAI 相同）

### 5.3 Advanced Options Collapse

```html
<details>
  <summary>⚙️ Advanced: Prompt Caching, Growth Projections</summary>
  <!-- cacheWriteTokens, cacheTTL, cacheReadHitRate, growthRate, projectionMonths -->
</details>
```

### 5.4 美化层

复用现有的 `beautifyBars()` 通用函数。Claude 特定美化：

- 家族颜色:
  - `mythos` → `#7c3aed` (purple-600)
  - `claude4x` → `#2563eb` (blue-600)
  - `legacy` → `#6b7280` (gray-500)
- `beautifyClaude(text)` 函数：解析 7 个 section 并应用对应 CSS class
- Caching Breakdown section 用绿色色调

---

## 6. Engine Metadata 更新

### FAQ（7 条，对标 OpenAI）

1. How does Claude pricing compare to GPT-4o?
2. What is Prompt Caching and how much can it save?
3. When should I use Batch API vs Real-time?
4. Is Claude Fable 5 worth the premium?
5. How does Claude's tokenizer affect costs?
6. Can I switch between Claude models easily?
7. How do I estimate token counts for Claude?

### howToUse（6 步）

1. Select the Claude models you want to compare.
2. Enter your average input and output tokens per API call.
3. Choose pricing mode (Real-time or Batch).
4. Configure Prompt Caching (write tokens, TTL, hit rate) for savings estimates.
5. Set growth rate and projection period for long-term planning.
6. Review the cost comparison, caching breakdown, and cross-provider insights.

### staticExamples

必须从 customFn 实际输出生成，不能手写。

---

## 7. tools.ts 同步

更新 `src/data/tools.ts` 中 Claude 计算器的 inputs 数组为 10 个字段，同步 engine 定义。

---

## 8. i18n 翻译

新增 ~45 个 key：
- 10 个 input labels + placeholders
- 7 个 FAQ Q&A
- 6 个 howToUse steps
- 6 个 preset labels
- Section headers 等工具特定文本

Key pattern: `tools.solopreneur-claude-api-cost-calculator.<field>.<index>`

---

## 9. 实现检查清单

- [ ] MODELS 常量（7 个模型 × 3 家族）
- [ ] calculate() 函数（7 section 输出）
- [ ] customFn 字符串（精确同步 calculate）
- [ ] 输入定义更新（10 inputs）
- [ ] FAQ 更新（7 条）
- [ ] howToUse 更新（6 步）
- [ ] staticExamples 从实际输出生成
- [ ] tools.ts 同步
- [ ] i18n 翻译（en + zh）
- [ ] Preset 按钮（6 scenarios）
- [ ] Token estimator textarea
- [ ] Advanced options collapse
- [ ] beautifyClaude() 美化函数
- [ ] Schema.org 结构化数据
- [ ] `pnpm check` 零错误

---

## 10. 边界条件处理

- Input clamping: `Math.max(1, Math.min(10_000_000, ...))`
- Model key dedup: `[...new Set(...)]`
- cacheWriteTokens 不能超过 inputTokens
- cacheReadHitRate 在 0-100 之间
- 无 cache 时 Caching Breakdown section 不输出
- 无 growth 时 Growth Projection section 不输出
- 当所有模型相同时（如 caching 模式下），标注说明
