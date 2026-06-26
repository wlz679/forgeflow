# AI Cost Preset Chip 位置+样式对齐 + 32 Chip Handler 统一 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 4 个 AI Cost v3 计算器的 preset chip 搬到 form 顶部并升级样式（与其他 28 个 chip 计算器视觉一致）；同时把 32 个 chip 的 data-attr 升级为 kebab-case + 合并 JS handler 为统一通用 handler——**顺手修复 28 个 chip click 无反应的 pre-existing bug**。

**Architecture:** 单文件改动（`src/pages/[lang]/[slug].astro`）。分 3 个独立改动组：(1) JS handler 合并（独立于 chip 块，可在 chip 改之前先做，便于测试）；(2) LLM token 4 + Business v3 24 共 28 个 chip data-attr 升级（位置不动）；(3) AI Cost 4 个块搬位置 + 模板升级 + emoji + kebab-case。零新组件、零引擎改动、零 `engine.presets` 字段。

**Tech Stack:** Astro 4.16.19 + TypeScript 5.6 strict + 原生 JS（无新依赖）。`pnpm` + Node `^20.19.0 || >=22.13.0`。

**Spec:** `docs/superpowers/specs/2026-06-26-ai-cost-preset-chip-position-alignment-design.md`

**Pre-flight note (drift from spec):** Spec 假设"无需改 JS"——pre-flight 发现该假设错误（`.preset-btn` handler 是硬编码 LLM 字段，不是通用的）。已与用户对齐：**扩展到 Y 方案**——全 32 个 chip 的 handler 统一 + 28 个兄弟 data-attr 升级 + 4 个 AI Cost 搬位置升级样式。**Spec 已 amend**（commit `e98e6b7`）。本计划反映 spec 最终版。

---

## File Structure

| 文件 | 操作 | 责任 |
|---|---|---|
| `src/pages/[lang]/[slug].astro` | **Modify**（3 处） | (1) line 1532-1581 handler 合并；(2) line 147-856 共 28 个 chip data-attr kebab-case；(3) line 879-995 4 个 AI Cost chip 搬位置 + 升级样式 |
| `src/i18n/translations.ts` | Modify（仅缺 key 时） | 补 AI Cost 4 × 6 preset key × 2 lang 的翻译（预计 0-48 行） |

**完全不动**：32 个 engine / `src/core/engines/types.ts` / 任何新组件 / 任何其他文件

---

## Task 1: 读现状 + 建字段名转换清单

**Files:** Read-only inspection

- [ ] **Step 1: 读 [slug].astro 4 段关键代码**

```bash
# LLM token 4 个块（OpenAI + Claude + Deepseek + Gemini）
sed -n '147,451p' src/pages/\[lang\]/\[slug\].astro > /tmp/llm-blocks.txt

# Business v3 参考模板（burn-rate 是第一个）
sed -n '453,468p' src/pages/\[lang\]/\[slug\].astro > /tmp/biz-reference.txt

# AI Cost 旧 4 个块
sed -n '879,995p' src/pages/\[lang\]/\[slug\].astro > /tmp/ai-cost-old.txt

# 两个旧 handler
sed -n '1532,1581p' src/pages/\[lang\]/\[slug\].astro > /tmp/old-handlers.txt
```

- [ ] **Step 2: 读 4 个 AI Cost engine 的 inputs[].name 清单**

```bash
grep -A 20 "inputs: \[" src/engines/ai-image-generation-cost-calculator.ts | grep "name:" | head -10
grep -A 20 "inputs: \[" src/engines/ai-training-cost-estimator.ts | grep "name:" | head -10
grep -A 20 "inputs: \[" src/engines/gpu-cloud-cost-calculator.ts | grep "name:" | head -10
grep -A 20 "inputs: \[" src/engines/ai-api-cost-comparison.ts | grep "name:" | head -10
```

Expected: 列出每个 engine 的 input name 字段名（camelCase）：
- AI image: `provider`, `imagesPerMonth`, `resolution`, `batchSize`, `advancedMode`
- AI training: `modelSize`, `gpuType`, `gpuCount`, `trainingHours`, `epochs`, `cloudStorage`, `dataProcessCost`
- GPU cloud: `provider`, `gpuType`, `gpuCount`, `hoursPerDay`, `pricingTier`, `includeStorage`
- AI API: `inputTokens`, `outputTokens`, `requestsPerDay`, `pricingMode`

- [ ] **Step 3: 建字段转换清单（camelCase → kebab-case）**

手写映射表（按 Step 2 结果）：

| camelCase | kebab-case | 所属 calc |
|---|---|---|
| `imagesPerMonth` | `images-per-month` | AI image |
| `batchSize` | `batch-size` | AI image |
| `advancedMode` | `advanced-mode` | AI image |
| `modelSize` | `model-size` | AI training |
| `gpuType` | `gpu-type` | AI training / GPU cloud |
| `gpuCount` | `gpu-count` | AI training / GPU cloud |
| `trainingHours` | `training-hours` | AI training |
| `cloudStorage` | `cloud-storage` | AI training |
| `dataProcessCost` | `data-process-cost` | AI training |
| `hoursPerDay` | `hours-per-day` | GPU cloud |
| `pricingTier` | `pricing-tier` | GPU cloud |
| `includeStorage` | `include-storage` | GPU cloud |
| `inputTokens` | `input-tokens` | AI API / Claude |
| `outputTokens` | `output-tokens` | AI API / Claude |
| `requestsPerDay` | `requests-per-day` | AI API / Claude / DeepSeek |
| `pricingMode` | `pricing-mode` | AI API / Claude / DeepSeek |
| `cacheWriteTokens` | `cache-write-tokens` | Claude |
| `cacheTTL` | `cache-ttl` | Claude |
| `cacheReadHitRate` | `cache-read-hit-rate` | Claude |
| `growthRate` | `growth-rate` | Claude |
| `projectionMonths` | `projection-months` | Claude |

LLM token 4 个的简化别名展开：

| 简化（当前） | 完整 kebab-case（目标） |
|---|---|
| `data-m` | `data-models` |
| `data-it` | `data-input-tokens` |
| `data-ot` | `data-output-tokens` |
| `data-rd` | `data-requests-per-day` |
| `data-pm` | `data-pricing-mode` |
| `data-cw` | `data-cache-write-tokens` |
| `data-cttl` | `data-cache-ttl` |
| `data-chr` | `data-cache-read-hit-rate` |
| `data-gr` | `data-growth-rate` |
| `data-pj` | `data-projection-months` |

**`data-models` 是多选 select**（handler 需要 multi-select case）—— **保留但 handler 特殊处理**。

- [ ] **Step 4: 列出 24 个 Business v3 calc 的字段名清单**

每个 Business v3 calc 的 chip data-attr 名都不同（heterogeneous）。实施时按字段名 pattern 用 Edit `replace_all` 替换：

```bash
# 24 个 Business v3 calc 的 chip 字段名（实施时 grep 确认完整清单）
# 已知字段（不完全列表，按需 grep 补充）：
# monthlyrevenue, teamcost, infracost, marketingcost, opscost, currentcash, netnewrevenue
# customersstart, customerslost, newcustomers, avgrevenuepercustomer, expansionrevenue
# arr, growthrate, grossmargin, multiple, companyvaluation, investmentamount, foundershares
# fixedcosts, priceperunit, variablecostperunit, annualincome, expenses, billablehrs, profit
# targetmonthlyincome, estimatedbuyerspermonth, platformfee, hoursperweek, weeksperyear
# monthlydownloads, emailsubscribers, socialfollowers, contenttype
# projectrevenue, hoursestimated, hourlycost, materialcost
# monthlytraffic, conversionrate, avgcommission, monthlycost
# annualincomegoal, billablehoursperweek, weeksoffperyear, annualexpenses
# attendees, avghourlyrate, meetingminutes, meetingsperweek
# annualsalary, benefitspercentage, location
# weeklydeepworkhours, toolsused
# producttype, targetcustomer, competitorprice
# businessexpenses, country
```

**实施时**：按 Task 5 的 Step 2 一次性 grep 全部 lowercase data-attr 名，按 camelCase→kebab-case 映射替换。

- [ ] **Step 5: 不 commit**

Task 1 是调研，无文件改动，不 commit。

---

## Task 2: 校验 + 补 48 条 i18n preset key

**Files:**
- Modify: `src/i18n/translations.ts`（仅缺 key 时）

- [ ] **Step 1: Grep 校验现有 48 条 key**

```bash
grep -nE "solopreneur-(ai-image-cost|ai-training-cost|gpu-cloud-cost|ai-api-cost-comparison)\.preset\." \
  src/i18n/translations.ts | wc -l
```

Expected: `48`（4 calc × 6 preset × 2 lang = 48 行）。如果 count < 48，记录缺失 key。

- [ ] **Step 2: 列出缺失 key**

对每个 calc 的 6 个 preset key，校验 en + zh 都存在：

```bash
# AI image 6 keys
for key in solopreneur creator agency budget logos artistic; do
  grep -q "solopreneur-ai-image-cost-calculator\.preset\.${key}'" src/i18n/translations.ts && \
  grep -q "solopreneur-ai-image-cost-calculator\.preset\.${key}':\s*{" src/i18n/translations.ts && \
  echo "AI image.${key}: ✓ both langs" || echo "AI image.${key}: ✗ MISSING"
done
# 重复跑 AI training (quick-lora/mid-13b/full-70b/enterprise-180b/budget-7b/pro-405b)
# 重复跑 GPU cloud (budget-single/dev-box/training-rig/enterprise-h100/cheapest-h200/pro-8h100)
# 重复跑 AI API (support-bot/rag-qa/code-review/content-gen/data-analysis/batch)
```

Expected: 4 个循环全部 ✓。如有 ✗，记下 calc.key + 缺失 lang。

- [ ] **Step 3: 补缺失 key（如有）**

按现有 `tools.solopreneur-{slug}.preset.{key}:` block 模式，在 en 和 zh 段各加一行：

```ts
// en 段示例（按现有 key 命名风格）
preset: {
  // ... existing keys
  {key}: '{English label}',  // 如 'Best Text Logos'
},

// zh 段示例
preset: {
  // ... existing keys
  {key}: '{中文标签}',  // 如 '文字设计'
},
```

中文 label 1-3 词，与同 calc 其他 key 风格一致。

- [ ] **Step 4: 验证**

```bash
grep -nE "solopreneur-(ai-image-cost|ai-training-cost|gpu-cloud-cost|ai-api-cost-comparison)\.preset\." \
  src/i18n/translations.ts | wc -l
```

Expected: `48`。

- [ ] **Step 5: Commit（仅当 Step 3 改了）**

```bash
git add src/i18n/translations.ts
git commit -m "i18n: fill missing preset keys for 4 AI Cost calcs"
```

如果 Step 3 没改，跳过此 commit。

---

## Task 3: 合并两个 JS handler 为统一通用 handler

**Files:**
- Modify: `src/pages/[lang]/[slug].astro:1532-1581`

- [ ] **Step 1: 读现有 handler 精确内容**

```bash
sed -n '1530,1585p' src/pages/\[lang\]/\[slug\].astro
```

Expected: 看到 `.preset-btn` 硬编码 handler (line 1532-1557) + `.preset-chip` 通用 handler (line 1560-1581)。

- [ ] **Step 2: 删除两个旧 handler**

用 Edit 工具，old_string 必须精确匹配 line 1532-1581 的两段代码（连同中间空行）：

```bash
# 验证要删除的代码块（先 grep 确认无其他地方引用 .preset-chip）
grep -rn "preset-chip" src/ scripts/ 2>&1 | head -10
```

Expected: 只在 [slug].astro line 882-993（AI Cost 4 个块的 button class）出现。**Task 6 会删除这些 button class**——所以可以放心删 handler。

Edit：old_string = 两个 handler 的完整内容（line 1532-1581），new_string = 留一个空行（保留行号连续性）。

- [ ] **Step 3: 插入统一通用 handler**

在 line 1532（原 handler 起始位置）插入新统一 handler：

```js
      // --- Unified preset chip handler (replaces both old preset-btn hardcoded + preset-chip generic) ---
      var presetBtns = document.querySelectorAll('.preset-btn');
      presetBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
          var ds = this.dataset;
          for (var key in ds) {
            if (ds.hasOwnProperty(key)) {
              var el = document.getElementById(key);
              if (el) {
                if (el.tagName === 'SELECT' && el.multiple) {
                  // Multi-select (e.g. LLM token 'models'): split comma-separated values
                  var values = String(ds[key]).split(',');
                  Array.from(el.options).forEach(function(opt) {
                    opt.selected = values.indexOf(opt.value) !== -1;
                  });
                } else if (el.tagName === 'SELECT') {
                  // Single-select: set value if option exists
                  var opt = el.querySelector('option[value="' + ds[key] + '"]');
                  if (opt) el.value = ds[key];
                } else {
                  // text/number input
                  el.value = ds[key];
                }
              }
            }
          }
        });
      });
```

- [ ] **Step 4: Verify build 仍通过**

```bash
pnpm build 2>&1 | tail -5
```

Expected: 0 errors. 138 pages built.（handler 改了但 chip class 名还没改——`.preset-btn` 的 chip 暂时 click 不工作，但 build 应通过；Task 4-6 改完 chip 后才会全工作）

- [ ] **Step 5: Commit**

```bash
git add src/pages/\[lang\]/\[slug\].astro
git commit -m "refactor(page): merge preset chip handlers into unified generic handler"
```

---

## Task 4: LLM token 4 个 chip data-attr 升级（简化别名→完整 kebab-case）

**Files:**
- Modify: `src/pages/[lang]/[slug].astro:147-451`

- [ ] **Step 1: 读 4 个 LLM token 块确认简化别名分布**

```bash
sed -n '147,451p' src/pages/\[lang\]/\[slug\].astro | grep -oE 'data-[a-z]+=' | sort -u
```

Expected: 看到 `data-m=` / `data-it=` / `data-ot=` / `data-rd=` / `data-pm=` / `data-cw=` / `data-cttl=` / `data-chr=` / `data-gr=` / `data-pj=` 等简化别名。

- [ ] **Step 2: 替换 10 个简化别名为完整 kebab-case**

用 Edit 工具，每个简化别名单独 `replace_all`：

```ts
// Edit 1
old_string: "data-m="
new_string: "data-models="

// Edit 2
old_string: "data-it="
new_string: "data-input-tokens="

// Edit 3
old_string: "data-ot="
new_string: "data-output-tokens="

// Edit 4
old_string: "data-rd="
new_string: "data-requests-per-day="

// Edit 5
old_string: "data-pm="
new_string: "data-pricing-mode="

// Edit 6
old_string: "data-cw="
new_string: "data-cache-write-tokens="

// Edit 7
old_string: "data-cttl="
new_string: "data-cache-ttl="

// Edit 8
old_string: "data-chr="
new_string: "data-cache-read-hit-rate="

// Edit 9
old_string: "data-gr="
new_string: "data-growth-rate="

// Edit 10
old_string: "data-pj="
new_string: "data-projection-months="
```

每个 Edit 用 `replace_all: true`（每个简化别名在 4 个块里都出现多次）。

- [ ] **Step 3: 验证无残留简化别名**

```bash
grep -nE 'data-(m|it|ot|rd|pm|cw|cttl|chr|gr|pj)=' src/pages/\[lang\]/\[slug\].astro
```

Expected: 0 matches.

```bash
grep -nE 'data-(models|input-tokens|output-tokens|requests-per-day|pricing-mode|cache-write-tokens|cache-ttl|cache-read-hit-rate|growth-rate|projection-months)=' src/pages/\[lang\]/\[slug\].astro | wc -l
```

Expected: ~24+（4 blocks × 6+ buttons）。

- [ ] **Step 4: Build + 手动 click 测试 LLM token 4 个页面**

```bash
pnpm build 2>&1 | tail -5
```

Expected: 0 errors.

浏览器手测（或 `pnpm preview` + curl + 浏览器）：
- `/en/solopreneur-openai-token-calculator/` 点 "🎧 Support Bot" → models select 显示 `gpt-5-mini,gpt-5.5,gpt-4.1`，inputTokens=800，outputTokens=200，requestsPerDay=500
- `/en/solopreneur-claude-api-cost-calculator/` 点 "📚 RAG Q&A" → models=claude-fable-5,...，inputTokens=3000，outputTokens=400，pricingMode=realtime
- `/en/solopreneur-deepseek-api-cost-calculator/` 点任一 chip → 字段填入
- `/en/solopreneur-gemini-api-cost-calculator/` 点任一 chip → 字段填入

- [ ] **Step 5: Commit**

```bash
git add src/pages/\[lang\]/\[slug\].astro
git commit -m "refactor(page): upgrade LLM token chip data-attr to kebab-case (handler-compatible)"
```

---

## Task 5: Business v3 24 个 chip data-attr kebab-case 升级

**Files:**
- Modify: `src/pages/[lang]/[slug].astro:453-856`

- [ ] **Step 1: Grep 全部 Business v3 lowercase data-attr 名**

```bash
sed -n '453,856p' src/pages/\[lang\]/\[slug\].astro | grep -oE 'data-[a-z]+=' | sort -u
```

Expected: 输出 50+ 个 lowercase attr 名（如 `data-monthlyrevenue=`, `data-teamcost=` 等）。

- [ ] **Step 2: 建 kebab-case 映射表**

按 Step 1 输出，手动建映射（camelCase → kebab-case）。**重要**：Business v3 字段全部是单 word lowercase（如 `monthlyrevenue`, `teamcost`），**kebab-case 就是把它们 split**：

```ts
// 已知映射（按需扩展）：
// monthlyrevenue → monthly-revenue
// teamcost → team-cost
// infracost → infra-cost
// marketingcost → marketing-cost
// opscost → ops-cost
// currentcash → current-cash
// netnewrevenue → net-new-revenue
// customersstart → customers-start
// customerslost → customers-lost
// newcustomers → new-customers
// avgrevenuepercustomer → avg-revenue-per-customer
// expansionrevenue → expansion-revenue
// arr → arr (no change)
// growthrate → growth-rate
// grossmargin → gross-margin
// multiple → multiple (no change)
// companyvaluation → company-valuation
// investmentamount → investment-amount
// foundershares → founder-shares
// fixedcosts → fixed-costs
// priceperunit → price-per-unit
// variablecostperunit → variable-cost-per-unit
// annualincome → annual-income
// expenses → expenses (no change)
// billablehrs → billable-hrs
// profit → profit (no change)
// targetmonthlyincome → target-monthly-income
// estimatedbuyerspermonth → estimated-buyers-per-month
// platformfee → platform-fee
// hoursperweek → hours-per-week
// weeksperyear → weeks-per-year
// monthlydownloads → monthly-downloads
// emailsubscribers → email-subscribers
// socialfollowers → social-followers
// contenttype → content-type
// projectrevenue → project-revenue
// hoursestimated → hours-estimated
// hourlycost → hourly-cost
// materialcost → material-cost
// monthlytraffic → monthly-traffic
// conversionrate → conversion-rate
// avgcommission → avg-commission
// monthlycost → monthly-cost
// annualincomegoal → annual-income-goal
// billablehoursperweek → billable-hours-per-week
// weeksoffperyear → weeks-off-per-year
// annualexpenses → annual-expenses
// attendees → attendees (no change)
// avghourlyrate → avg-hourly-rate
// meetingminutes → meeting-minutes
// meetingsperweek → meetings-per-week
// annualsalary → annual-salary
// benefitspercentage → benefits-percentage
// location → location (no change)
// weeklydeepworkhours → weekly-deep-work-hours
// toolsused → tools-used
// producttype → product-type
// targetcustomer → target-customer
// competitorprice → competitor-price
// businessexpenses → business-expenses
// country → country (no change)
```

**单 word 的 attr（如 `arr`, `profit`, `attendees`, `location`, `country`）保持不变**——它们已经是单 segment kebab-case 等价。

- [ ] **Step 3: 批量替换 multi-word attr**

对每个 multi-word attr，用 Edit `replace_all: true`：

```ts
// 示例（按 Step 2 列表遍历）
old_string: "data-monthlyrevenue="
new_string: "data-monthly-revenue="

old_string: "data-teamcost="
new_string: "data-team-cost="

// ... 其他 multi-word attr ...
```

- [ ] **Step 4: 验证无残留**

```bash
# 验证 multi-word lowercase attr 全部升级
grep -nE 'data-(monthlyrevenue|teamcost|infracost|marketingcost|opscost|currentcash|netnewrevenue|customersstart|customerslost|newcustomers|avgrevenuepercustomer|expansionrevenue|growthrate|grossmargin|companyvaluation|investmentamount|foundershares|fixedcosts|priceperunit|variablecostperunit|annualincome|billablehrs|targetmonthlyincome|estimatedbuyerspermonth|platformfee|hoursperweek|weeksperyear|monthlydownloads|emailsubscribers|socialfollowers|contenttype|projectrevenue|hoursestimated|hourlycost|materialcost|monthlytraffic|conversionrate|avgcommission|monthlycost|annualincomegoal|billablehoursperweek|weeksoffperyear|annualexpenses|avghourlyrate|meetingminutes|meetingsperweek|annualsalary|benefitspercentage|weeklydeepworkhours|toolsused|producttype|targetcustomer|competitorprice|businessexpenses)=' \
  src/pages/\[lang\]/\[slug\].astro | head -20
```

Expected: 0 matches.

- [ ] **Step 5: Build + 手动 click 测试 Business v3**

```bash
pnpm build 2>&1 | tail -5
```

Expected: 0 errors.

浏览器手测 24 个 Business v3 页面（或至少抽样 5 个：MRR / Burn rate / Churn / LTV / CAC / SaaS valuation）：
- 点任一 chip → 对应 input 被填入

- [ ] **Step 6: Commit**

```bash
git add src/pages/\[lang\]/\[slug\].astro
git commit -m "refactor(page): upgrade 24 Business v3 chip data-attr to kebab-case (fixes pre-existing click bug)"
```

---

## Task 6: AI Cost 4 个块搬位置 + 升级样式 + kebab-case

**Files:**
- Modify: `src/pages/[lang]/[slug].astro:146-156`（新增位置）, `:879-995`（删除旧位置）

这是最复杂的 task——同时搬位置 + 改 4 块的 class/style/data-attr/emoji。

- [ ] **Step 1: 在新位置插入 4 个升级后的块**

在 `src/pages/[lang]/[slug].astro` line 146 后（紧跟 `<form>` 开始标签，**在 line 155 LLM token 块 if/else 链结束后**）插入：

```astro
              {isAiApiCostComparison && (
                <div class="mb-5">
                  <span class="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">{lang === 'zh' ? '🎭 场景预设' : '🎭 Scenario Presets'}</span>
                  <div class="flex flex-wrap gap-1.5" id="preset-buttons-ai-api-cost-comparison">
                    {[
                      { emoji:'🤖', key:'support-bot',   'input-tokens':'800',  'output-tokens':'200',  'requests-per-day':'500',   'pricing-mode':'realtime' },
                      { emoji:'📚', key:'rag-qa',        'input-tokens':'3000', 'output-tokens':'400',  'requests-per-day':'200',   'pricing-mode':'realtime' },
                      { emoji:'💻', key:'code-review',   'input-tokens':'5000', 'output-tokens':'800',  'requests-per-day':'50',    'pricing-mode':'realtime' },
                      { emoji:'✍️', key:'content-gen',   'input-tokens':'500',  'output-tokens':'2000', 'requests-per-day':'100',   'pricing-mode':'realtime' },
                      { emoji:'📊', key:'data-analysis', 'input-tokens':'4000', 'output-tokens':'3000', 'requests-per-day':'30',    'pricing-mode':'realtime' },
                      { emoji:'⚡', key:'batch',         'input-tokens':'3000', 'output-tokens':'5000', 'requests-per-day':'10000', 'pricing-mode':'batch' },
                    ].map(p => (
                      <button type="button" class="preset-btn text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-all" data-input-tokens={p['input-tokens']} data-output-tokens={p['output-tokens']} data-requests-per-day={p['requests-per-day']} data-pricing-mode={p['pricing-mode']}>{p.emoji} {t(`tools.solopreneur-ai-api-cost-comparison.preset.${p.key}`, lang)}</button>
                    ))}
                  </div>
                </div>
              )}
              {isImage && (
                <div class="mb-5">
                  <span class="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">{lang === 'zh' ? '🎭 场景预设' : '🎭 Scenario Presets'}</span>
                  <div class="flex flex-wrap gap-1.5" id="preset-buttons-ai-image-cost-calculator">
                    {[
                      { emoji:'💼', key:'solopreneur', provider:'dalle-3',                'images-per-month':'100',  resolution:'1024×1024', 'batch-size':'1', 'advanced-mode':'standard' },
                      { emoji:'🎨', key:'creator',     provider:'midjourney-v7',         'images-per-month':'500',  resolution:'2048×2048', 'batch-size':'4', 'advanced-mode':'standard' },
                      { emoji:'🏢', key:'agency',      provider:'dalle-4',               'images-per-month':'1000', resolution:'1024×1024', 'batch-size':'4', 'advanced-mode':'hd' },
                      { emoji:'💰', key:'budget',      provider:'stable-diffusion-4',    'images-per-month':'5000', resolution:'512×512',   'batch-size':'8', 'advanced-mode':'standard' },
                      { emoji:'🔤', key:'logos',       provider:'ideogram-3',            'images-per-month':'300',  resolution:'1024×1024', 'batch-size':'2', 'advanced-mode':'standard' },
                      { emoji:'🖼️', key:'artistic',    provider:'flux-pro',              'images-per-month':'800',  resolution:'2048×2048', 'batch-size':'2', 'advanced-mode':'hd' },
                    ].map(p => (
                      <button type="button" class="preset-btn text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-all" data-provider={p.provider} data-images-per-month={p['images-per-month']} data-resolution={p.resolution} data-batch-size={p['batch-size']} data-advanced-mode={p['advanced-mode']}>{p.emoji} {t(`tools.solopreneur-ai-image-cost-calculator.preset.${p.key}`, lang)}</button>
                    ))}
                  </div>
                </div>
              )}
              {isTraining && (
                <div class="mb-5">
                  <span class="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">{lang === 'zh' ? '🎭 场景预设' : '🎭 Scenario Presets'}</span>
                  <div class="flex flex-wrap gap-1.5" id="preset-buttons-ai-training-cost-estimator">
                    {[
                      { emoji:'🚀', key:'quick-lora',      'model-size':'7B',   'gpu-type':'H100-80GB',  'gpu-count':'2',   'training-hours':'8',   epochs:'3', 'cloud-storage':'50',   'data-process-cost':'20' },
                      { emoji:'📦', key:'mid-13b',         'model-size':'13B',  'gpu-type':'A100-80GB',  'gpu-count':'8',   'training-hours':'24',  epochs:'5', 'cloud-storage':'200',  'data-process-cost':'100' },
                      { emoji:'🏭', key:'full-70b',        'model-size':'70B',  'gpu-type':'H200-141GB', 'gpu-count':'16',  'training-hours':'48',  epochs:'3', 'cloud-storage':'500',  'data-process-cost':'300' },
                      { emoji:'🏢', key:'enterprise-180b', 'model-size':'180B', 'gpu-type':'H200-141GB', 'gpu-count':'64',  'training-hours':'168', epochs:'2', 'cloud-storage':'2000', 'data-process-cost':'1000' },
                      { emoji:'💰', key:'budget-7b',       'model-size':'7B',   'gpu-type':'RTX-6000',   'gpu-count':'4',   'training-hours':'12',  epochs:'5', 'cloud-storage':'30',   'data-process-cost':'10' },
                      { emoji:'🏆', key:'pro-405b',        'model-size':'405B', 'gpu-type':'H200-141GB', 'gpu-count':'128', 'training-hours':'720', epochs:'1', 'cloud-storage':'5000', 'data-process-cost':'2000' },
                    ].map(p => (
                      <button type="button" class="preset-btn text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-all" data-model-size={p['model-size']} data-gpu-type={p['gpu-type']} data-gpu-count={p['gpu-count']} data-training-hours={p['training-hours']} data-epochs={p.epochs} data-cloud-storage={p['cloud-storage']} data-data-process-cost={p['data-process-cost']}>{p.emoji} {t(`tools.solopreneur-ai-training-cost-estimator.preset.${p.key}`, lang)}</button>
                    ))}
                  </div>
                </div>
              )}
              {isGpu && (
                <div class="mb-5">
                  <span class="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">{lang === 'zh' ? '🎭 场景预设' : '🎭 Scenario Presets'}</span>
                  <div class="flex flex-wrap gap-1.5" id="preset-buttons-gpu-cloud-cost-calculator">
                    {[
                      { emoji:'💰', key:'budget-single',   provider:'vastai',     gpuType:'RTX4090', gpuCount:'1',  'hours-per-day':'12', 'pricing-tier':'spot',       'include-storage':'yes' },
                      { emoji:'💻', key:'dev-box',         provider:'runpod',     gpuType:'A100',    gpuCount:'1',  'hours-per-day':'8',  'pricing-tier':'on-demand',  'include-storage':'yes' },
                      { emoji:'🏋️', key:'training-rig',    provider:'lambdalabs', gpuType:'A100',    gpuCount:'4',  'hours-per-day':'24', 'pricing-tier':'reserved',    'include-storage':'yes' },
                      { emoji:'🏢', key:'enterprise-h100', provider:'aws',        gpuType:'H100',    gpuCount:'8',  'hours-per-day':'24', 'pricing-tier':'reserved',    'include-storage':'yes' },
                      { emoji:'🏷️', key:'cheapest-h200',   provider:'vastai',     gpuType:'H200',    gpuCount:'1',  'hours-per-day':'4',  'pricing-tier':'spot',       'include-storage':'no' },
                      { emoji:'🏆', key:'pro-8h100',       provider:'runpod',     gpuType:'H100',    gpuCount:'8',  'hours-per-day':'24', 'pricing-tier':'on-demand',  'include-storage':'yes' },
                    ].map(p => (
                      <button type="button" class="preset-btn text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-all" data-provider={p.provider} data-gpu-type={p.gpuType} data-gpu-count={p.gpuCount} data-hours-per-day={p['hours-per-day']} data-pricing-tier={p['pricing-tier']} data-include-storage={p['include-storage']}>{p.emoji} {t(`tools.solopreneur-gpu-cloud-cost-calculator.preset.${p.key}`, lang)}</button>
                    ))}
                  </div>
                </div>
              )}
```

**注意**：
- `data-resolution='1024×1024'` / `data-epochs='3'` / `data-gpu-type='RTX4090'` 等**单 word 字段**保持单 word kebab-case（不强行加 hyphen）
- `gpuType` / `gpuCount` 在 GPU cloud 块的对象里**保持 camelCase**（因为 JSX prop 名自动 lowercase），但 **HTML attr 转成 kebab-case `data-gpu-type` / `data-gpu-count`**（DOM 自动转 camelCase 后匹配 input id `gpuType` / `gpuCount`）
- `data-resolution='1024×1024'` 的值含 `×` 字符——Astro/JSX 会原样输出

- [ ] **Step 2: 删除旧 4 个块（line 879-995 整段）**

```bash
grep -n "isAiApiCostComparison &&\|isImage &&\|isTraining &&\|isGpu &&" src/pages/\[lang\]/\[slug\].astro
```

Expected: 4 matches（line 879, 908, 937, 966）—— AI Cost 的 if 条件。

Edit：old_string = line 879-995 的整段 4 个块（用空行作边界），new_string = 空（删除）。

**注意**：line 1040-1043 有 `var isAiApiCostComparison = ...` 等 const 声明（line 72-75 frontmatter 和 line 1040-1043 JS 段）—— 这些**不要删**，它们仍用于 select `IMAGE_CONFIG` / `TRAINING_CONFIG` / `GPU_CONFIG` / `COMPARISON_CONFIG`。

- [ ] **Step 3: 验证无残留 `preset-chip` class**

```bash
grep -n "preset-chip" src/pages/\[lang\]/\[slug\].astro
```

Expected: 0 matches（4 个 AI Cost 块已删除 + handler 已合并）。

- [ ] **Step 4: Build + 手动 click 测试 4 个 AI Cost**

```bash
pnpm build 2>&1 | tail -5
```

Expected: 0 errors.

浏览器手测（或 `pnpm preview` + 浏览器）：
- `/en/solopreneur-ai-image-cost-calculator/` 点 "💼 Solopreneur" → provider=dalle-3, imagesPerMonth=100, resolution=1024×1024, batchSize=1, advancedMode=standard
- `/en/solopreneur-ai-training-cost-estimator/` 点 "🚀 Quick LoRA" → modelSize=7B, gpuType=H100-80GB, gpuCount=2, trainingHours=8, epochs=3, cloudStorage=50, dataProcessCost=20
- `/en/solopreneur-gpu-cloud-cost-calculator/` 点 "💻 Dev Box" → provider=runpod, gpuType=A100, gpuCount=1, hoursPerDay=8, pricingTier=on-demand, includeStorage=yes
- `/en/solopreneur-ai-api-cost-comparison/` 点 "🤖 Support Bot" → inputTokens=800, outputTokens=200, requestsPerDay=500, pricingMode=realtime

**验证 chip 在 form 顶部**（不在底部）—— 视觉对比 form 内 chip 区紧跟 `<form>` 开始标签，4-5 个 input 在 chip 下面。

- [ ] **Step 5: Commit**

```bash
git add src/pages/\[lang\]/\[slug\].astro
git commit -m "feat(ai-cost): move preset chips to form top + upgrade style to match 28 siblings"
```

---

## Task 7: End-to-end 验证

**Files:** 无（仅验证）

- [ ] **Step 1: 全量质量门禁**

```bash
pnpm check 2>&1 | tail -10
```

Expected: `[codegen-examples] --check PASSED` + `[codegen-customfn] ✓ No drift detected` + exit 0。

- [ ] **Step 2: 全量 build**

```bash
pnpm build 2>&1 | tail -10
```

Expected: 138+ pages built, 0 errors.

- [ ] **Step 3: Grep 验证 chip 在 form 顶部**

```bash
# AI Cost 4 个页面：grep chip 应在 form 开始后立刻出现
for calc in ai-image-cost ai-training-cost gpu-cloud-cost ai-api-cost-comparison; do
  file="dist/en/${calc/-cost-calculator/-calculator}/index.html"
  # 简化版：grep preset-buttons- 应在 form 之前
  grep -n 'preset-buttons-' "dist/en/solopreneur-${calc}/index.html" 2>/dev/null | head -3
done
```

Expected: 4 行 grep 输出，line number < 50（form 内顶部位置）。

- [ ] **Step 4: 浏览器抽样测试 32 个页面**

`pnpm preview &` 然后浏览器手测：
- **AI Cost 4 × 2 lang = 8 个页面**：每个 calc 点 "Solopreneur" / "Quick LoRA" / "Dev Box" / "Support Bot" → input 填入
- **LLM token 4 × 2 lang = 8 个页面**：每个 calc 点 "Support Bot" → multi-select models + 4 个 input 填入
- **Business v3 24 × 2 lang = 48 个页面**：抽样 5 个（mrr / burn-rate / churn / ltv / cac）点任一 chip → input 填入

Expected: 32 个页面**全部 click 工作**（pre-existing bug 已修）。

- [ ] **Step 5: 视觉对比截图**

截 `/en/solopreneur-ai-image-cost-calculator/` 和 `/en/solopreneur-mrr-calculator/`：
- AI image chip 区在 form 顶部
- MRR chip 区在 form 顶部（参考）
- 两者 chip 视觉一致（除 emoji 字符）

Expected: 视觉不可区分（除业务相关 emoji）。

- [ ] **Step 6: 回归验证——28 个兄弟页面无 chip 改动**

```bash
# 验证 LLM token 4 + Business v3 24 = 28 个页面的 chip 块 line number 不变（除 attr 名）
grep -nE '<button type="button" class="preset-btn' src/pages/\[lang\]/\[slug\].astro | wc -l
```

Expected: ~190+（32 calc × ~6 buttons）。与改动前计数对比，应**增加 24**（AI Cost 4 个 calc × 6 buttons = 24 buttons 新增 `preset-btn` class）。

- [ ] **Step 7: 最终 git status**

```bash
git status
```

Expected: 工作区清洁（如有 emoji 微调，commit）。

---

## Task 8: Final commit（如有 verification 微调）

**Files:** 任何 Task 7 发现的微调

- [ ] **Step 1: 如有微调，commit**

```bash
git add -A
git commit -m "chore: post-verification tweaks for preset chip unification"
```

如果没有微调，跳过此 commit。

- [ ] **Step 2: 报告用户**

输出：
- AI Cost 4 个 chip 现已在 form 顶部（截图引用）
- 32 个 chip click 全部工作（含 28 个 pre-existing bug 修复）
- 改动 commit 列表（每个 Task 一个 commit，共 ~6 个 commits）
- 建议 push 到远程 + 触发 CI（if user approves）

---

## Acceptance Criteria (mirror spec §6)

- [ ] `pnpm build` 0 errors
- [ ] `pnpm check` (typecheck + test:run) 0 errors
- [ ] AI Cost 4 calc × 2 lang = 8 个页面：chip 在 form 顶部，"🎭 场景预设" / "🎭 Scenario Presets" 标签，6 个圆角矩形按钮带 emoji
- [ ] 4 个 AI Cost calc click 测试：4 个 case 全部 input 填入正确
- [ ] 4 个 LLM token click 测试：4 个 case 全部 input 填入正确
- [ ] 24 个 Business v3 click 测试：抽样 5 个全部 input 填入正确
- [ ] 视觉对比：32 个 chip 区位置一致 + 样式一致（除业务相关 emoji）
- [ ] `git status` 显示 32 个 engine 文件无变更
- [ ] `preset-chip` class 全仓 0 残留
- [ ] commit 列表 ~6 个（handler 合并 + LLM token + Business v3 + AI Cost + verification + final）

---

## Rollback Plan

| Failure mode | Rollback |
|---|---|
| handler 合并后 click 失败 | `git revert <commit>` — 单独 revert Task 3 commit；其他 3 个 commit 可保留（仅 attr 升级不影响 build） |
| Business v3 attr 改漏 | 逐 calc 检查；改回 lowercase 即可（但 click bug 会回归） |
| AI Cost 块搬位置后视觉错位 | `git revert Task 6 commit`；恢复 line 879-995 旧块 |
| i18n 缺 key | `git revert Task 2 commit`；chip 显示空白但不崩 |
| 整体失败 | `git reset --hard e98e6b7`（spec commit 之前） |

---

## Risks & Mitigations

| 风险 | 缓解 |
|---|---|
| LLM token `data-models` 是 multi-select，handler 通用逻辑需 special case | Task 3 handler 已包含 multi-select case（`el.multiple` 分支） |
| Business v3 attr 多 word split 错误（漏 hyph 或位置错） | Task 5 Step 4 grep 校验 0 残留；Step 5 抽样 click 测试 |
| AI Cost 块搬位置后 line 879-995 删除与 line 1040-1043 const 声明误碰 | Edit 严格用 `{isAiApiCostComparison && ... }` 作为 old_string 边界，不触碰外层 const |
| i18n 缺 key 导致 chip label 空白 | Task 2 校验 + 补齐 |
| `pnpm build` 报错（TS / Astro / JSX） | 阻塞，按错误逐个修 |
| 浏览器手测发现 click 仍坏 | 单步 revert：先 revert handler → 再 revert attr 升级 → 找到 root cause |

---

## Self-Review Checklist (run before declaring plan complete)

- [ ] Spec §2 Goals 6 条 → Task 1-7 全覆盖
- [ ] Spec §4.1-4.6 设计 → Task 1-6 实施步骤
- [ ] Spec §6 Acceptance 11 条 → Task 7 验证步骤
- [ ] Spec §7 Risks 8 条 → 本计划 Risks 表格对应
- [ ] No "TBD"/"TODO"/"implement later"/"similar to Task N" 占位符
- [ ] 所有 line number 与文件路径基于 pre-flight 真实读取（line 147-451 / 453-468 / 879-995 / 1532-1581）
- [ ] 所有 data-attr 映射基于 Task 1 Step 3 表
- [ ] 所有 commit 命令 git status 验证

---

## Notes

- **Frequent commits**: 6-7 commits（每个 Task 一个 + final）。每个 commit 独立可 revert。
- **DRY**: handler 合并是核心 DRY（2 个 handler → 1 个）。所有 chip 共用一份逻辑。
- **YAGNI**: 不抽组件、不加新类型、不加新字段。改动集中在 1 个文件的 3 段。
- **TDD 适用性**: 这是 UI 重构 + 视觉对齐，无单元测试（项目 preset chip 无组件测试）。验证靠 `pnpm build` + 浏览器手测 + grep 静态校验。
- **Pre-flight 教训**: spec "无需改 JS" 的 hidden assumption 是错的——pre-flight 必读关键代码 + 验证假设。这是本计划比前身多 5 倍工作量的根因，但避免了上线后 click bug 修复的更大成本。
- **Out of scope reminder**: 任何 chip 之外改动、引擎改动、新组件、BIZ_CONFIG 重构——**停下 + 报告用户**，不擅自扩展。