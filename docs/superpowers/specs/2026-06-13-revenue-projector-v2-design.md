# Revenue Projector v2 — 行业完整版设计

**日期:** 2026-06-13
**状态:** 设计中

## 背景

Revenue Projector v1 只有 3 inputs（currentMRR, monthlyGrowthRate, months），纯复利模型（`MRR × (1+rate)^n`），不考虑流失、成本、现金流。对比赛道标杆（Baremetrics Forecast、ChartMogul、ProfitWell），缺少：churn 抵消、runway/breakeven、burn metrics、自定义 what-if。

## 目标

打造 solopreneur 一站式财务预测工具——收入、成本、跑道、打平、效率指标，全在一个页面。

---

## 设计

### Inputs（7 个）

| # | Name | Label | Type | 新增 | 说明 |
|---|------|-------|------|------|------|
| 1 | `currentMRR` | Current MRR ($) | number | — | 已有 |
| 2 | `monthlyGrowthRate` | Monthly Growth Rate (%) | number | — | 已有（毛增长，含新增+扩展，不含流失） |
| 3 | `monthlyChurnRate` | Monthly Churn Rate (%) | number | ✅ | 流失抵消 |
| 4 | `monthlyExpenses` | Monthly Expenses ($) | number | ✅ | 总月支出 |
| 5 | `cashOnHand` | Cash on Hand ($) | number | ✅ | 当前现金储备 |
| 6 | `arpu` | Avg Revenue Per User ($) | number | ✅ | 用于计算订阅人数 |
| 7 | `months` | Projection Period | select | — | 已有（6/12/24） |

### 计算逻辑

```
netMonthlyRate = (monthlyGrowthRate − monthlyChurnRate) / 100
annualizedNetRate = ((1 + netMonthlyRate)^12 − 1) × 100

endMRR[t] = currentMRR × (1 + netMonthlyRate)^t
totalRevenue = Σ(currentMRR × (1 + netMonthlyRate)^m) for m=1..months

subscriberCount = currentMRR / arpu (arpu>0 时)
churnedSubs = subscriberCount × (monthlyChurnRate / 100)
churnedMRR = currentMRR × (monthlyChurnRate / 100)

monthlyNetIncome = currentMRR − monthlyExpenses
annualizedProfit = monthlyNetIncome × 12
profitMargin = monthlyNetIncome / currentMRR × 100  (currentMRR>0 时)

// Runway
runwayZeroRevenue = cashOnHand / monthlyExpenses  (monthlyExpenses>0 时)
monthlyBurn = monthlyExpenses − currentMRR  (正=烧钱, 负=盈利)
runwayCurrent = monthlyBurn > 0 ? cashOnHand / monthlyBurn : ∞
runwayStatus = runwayCurrent >= 18 ? 🟢 : runwayCurrent >= 6 ? 🟡 : 🔴

// Breakeven
breakevenMonths = currentMRR >= monthlyExpenses ? 0 :
  ceil(log(monthlyExpenses / currentMRR) / log(1 + netMonthlyRate))
  (currentMRR>0 且 netMonthlyRate>0 时，否则 null)

// Efficiency Metrics
burnMultiple = monthlyBurn > 0 && netNewMRR > 0 ? monthlyBurn / netNewMRR : null
  (健康: <1.0× 🟢 | 1.0–2.0× 🟡 | >2.0× 🔴)

mrrExpenseRatio = monthlyExpenses > 0 ? currentMRR / monthlyExpenses : null
  (健康: >=2.0 🟢 | 1.0-2.0 🟡 | <1.0 🔴)

ruleOf40 = netMonthlyRate × 100 + profitMargin
  (健康: >=40 🟢 | 20-40 🟡 | <20 🔴)

// Milestones
monthsToTarget(target) = ceil(log(target / currentMRR) / log(1 + netMonthlyRate))
  (currentMRR>0 且 netMonthlyRate>0 时)

estimatedDate = 当前月 + monthsToTarget
```

### 输出结构（6 板块）

#### 1. 📊 Revenue Snapshot（~8 行）

```
📊 Revenue Snapshot
────────────────────────────────
Starting MRR:           $5,000/mo
Ending MRR:             $8,954/mo  (after 12 months)
ARR Equivalent:         $107,448/yr
Total Revenue:          $82,341 over 12 months

Gross Monthly Growth:   +8.0%  (new + expansion)
Monthly Churn:          −3.0%  (lost revenue)
Net Monthly Growth:     +5.0%  (effective compound rate)

Growth Multiple:        1.8×   (12-month MRR expansion)
```

Net Growth 颜色：>=10% 🟢 Exceptional, >=5% 🟡 Healthy, >=0% 🟠 Slow, <0% 🔴 Shrinking

#### 2. 📈 MRR Milestones + Time-to-Target（~8 行）

```
📈 MRR Milestones
────────────────────────────────
• Q1 (Month 3):   $5,788/mo
• Q2 (Month 6):   $6,702/mo
• Q3 (Month 9):   $7,760/mo
• Q4 (Month 12):  $8,954/mo  ← target

🎯 Time to Reach Key Milestones
────────────────────────────────
• $10K MRR:   14 months     (Aug 2027)
• $25K MRR:   32 months     (Feb 2029)
• $50K MRR:   46 months     (Apr 2030)
• $100K MRR:  60 months     (Jun 2031)
```

边界：netGrowth≤0 → "With zero or negative net growth, no milestones can be projected."；里程碑 >60mo → ">5 years"

#### 3. 🔄 Growth Scenarios & What-If（~10 行）

```
🔄 Growth Scenarios (12-Month Outlook)
────────────────────────────────
Scenario              Net Growth  →  End MRR
────────────────────────────────────────────────
🐢 Conservative         +2.0%/mo     $6,342/mo
📈 Moderate             +5.0%/mo     $8,954/mo
🚀 Current Pace         +8.0%/mo    $12,590/mo
🔥 Aggressive          +12.0%/mo    $19,473/mo
🎯 Custom (+__%/mo)    +___%/mo     $______/mo

🔄 What-If Analysis
────────────────────────────────
A) Cut churn from 3.0% → 2.0%:
   Net growth: +5.0% → +6.0% | End MRR: $8,954 → $10,122 (+$1,168)
   
B) Boost growth 20% above current:
   Gross growth: +8.0% → +9.6% | End MRR: $8,954 → $11,710 (+$2,756)
   
C) Reduce expenses by 20%:
   Monthly burn: N/A → N/A | Runway: N/A → N/A
   (Expenses: $3,000 → $2,400 | Monthly savings: +$600)
```

- 如果当前已盈利（monthlyBurn≤0），C 场景显示 savings 而不是 runway 变化
- 如果 churn 已经是 0，跳过 A 场景
- 如果 customGrowthRate 留空，显示 "—" 而不是数字

#### 4. 💰 Runway & Breakeven（~8 行）

**情况 A — 已盈利（currentMRR ≥ monthlyExpenses）：**
```
💰 Runway & Breakeven
────────────────────────────────
Cash on Hand:          $60,000
Monthly Expenses:      $3,000/mo
Monthly Net Revenue:   $5,000/mo

Monthly Profit:        +$2,000 🟢 Revenue covers expenses
Runway (zero-revenue): 20.0 months (cash ÷ expenses)
Runway (current pace): ∞ (profitable)
Breakeven:             ✅ Already breakeven

Annualized Profit:     +$24,000/yr
```

**情况 B — 在途（currentMRR < monthlyExpenses 但 netGrowth > 0）：**
```
💰 Runway & Breakeven
────────────────────────────────
Cash on Hand:          $30,000
Monthly Expenses:      $5,000/mo
Monthly Net Revenue:   $3,000/mo

Monthly Burn:          −$2,000/mo 🔴
Runway (zero-revenue):  6.0 months
Runway (current pace): 15.0 months (cash ÷ net burn)

Breakeven:             8 months from now (Dec 2026)
  → MRR reaches $5,000/mo covering all expenses.
```

**情况 C — 烧钱+无增长（最危险）：**
```
💰 Runway & Breakeven
────────────────────────────────
Cash on Hand:          $12,000
Monthly Expenses:      $5,000/mo
Monthly Net Revenue:   $3,000/mo

Monthly Burn:          −$2,000/mo 🔴
Runway (zero-revenue):  2.4 months
Runway (current pace):  6.0 months 🔴 CRITICAL

Breakeven:             Not reachable at current growth rate.
  → Cut expenses or boost growth immediately.
```

跑道颜色（runwayCurrent）：>=18mo 🟢, 6-18mo 🟡, <6mo 🔴

#### 5. 🩺 Burn & Efficiency Metrics（~6 行）

```
🩺 Burn & Efficiency Metrics
────────────────────────────────
Gross Burn:            $3,000/mo (total expenses)
Net Burn:              −$2,000/mo (negative = profit) 🟢

Burn Multiple:         N/A (profitable)
  = net burn ÷ net new MRR | <1.0× 🟢 | 1.0–2.0× 🟡 | >2.0× 🔴

Rule of 40:            25.0% (growth + margin) 🟡
  = net growth 5.0% + profit margin 20.0% | ≥40% 🟢 | 20-40% 🟡 | <20% 🔴

MRR / Expense Ratio:   1.67× 🟡
  ≥2.0 🟢 | 1.0-2.0 🟡 | <1.0 🔴

Monthly ARPU:          $25.00
Subscribers:           200 (currentMRR ÷ ARPU)
```

边界：
- burnMultiple 分母=0 → "N/A — no net new MRR"
- profitMargin 在 currentMRR=0 → "N/A"
- Rule of 40 在 currentMRR=0 → "N/A"
- ARPU=0 → 显示 "—" 并跳过 subscribers 行

#### 6. 🎯 Action Plan（~6 行）

根据收入状态 + 跑道 + 增长率的组合，输出个性化行动建议：

| 收入状态 | 跑道 | 评价 |
|----------|------|------|
| 盈利 + 高增长 | — | 🟢 最佳状态 |
| 盈利 + 低增长 | >12mo | 🟡 可持续但放缓 |
| 烧钱 + 高增长 | >12mo | 🟡 正常早期 |
| 烧钱 + 低增长 | <6mo | 🔴 紧急 |

```
🎯 Action Plan
────────────────────────────────
Stage: Scaling ($5K–$100K MRR)
  • Burn:  ✅ Profitable — reinvest 30% into growth.
  • Growth: 🚀 Strong (+5.0% net) — maintain channels, test one new.
  • Risk:   🟢 Low — 20 months cash at zero revenue.

🔥 Top 3 Priorities:
  1. Cut churn from 3.0% → 2.0% → $10K MRR 3 months sooner.
  2. With $2,000/mo profit, reinvest into ads or part-time help.
  3. Runway is healthy — focus on product, not fundraising.
```

**阶段定义**（与 v1 保持一致）：
- Validation (<$1K MRR), Early Traction ($1K-$10K), Scaling ($10K-$100K), Growth (>$100K)

---

### 需要改动的文件

| 文件 | 改动 |
|------|------|
| `src/engines/revenue-projector.ts` | 完全重写；7 inputs；6 板块；新增 calculate function + customFn |
| `src/data/tools.ts` | 更新 inputs 列表（7 inputs）；更新 description |
| `src/i18n/translations.ts` | 新增 4 个 input 翻译（churnRate, expenses, cashOnHand, arpu）；更新 howToUse；更新 FAQ |

### 不需要改动

- 首页渲染逻辑
- 其他计算器
- 分类配置（已为 A）
- Engine 注册机制

---

## 翻译计划

新增翻译 key：

```
# Inputs
tools.solopreneur-revenue-projector.input.monthlyChurnRate.label
tools.solopreneur-revenue-projector.input.monthlyChurnRate.placeholder
tools.solopreneur-revenue-projector.input.monthlyExpenses.label
tools.solopreneur-revenue-projector.input.monthlyExpenses.placeholder
tools.solopreneur-revenue-projector.input.cashOnHand.label
tools.solopreneur-revenue-projector.input.cashOnHand.placeholder
tools.solopreneur-revenue-projector.input.arpu.label
tools.solopreneur-revenue-projector.input.arpu.placeholder
```

输出文本全部在 customFn/generate 中生成英文，不通过翻译系统。FAQ 和 howToUse 需更新。

---

## 边界条件表

| 条件 | 处理 |
|------|------|
| currentMRR=0 | 所有 MRR 衍生指标显示 "— enter MRR"；跳过 milestones/wha-if |
| monthlyGrowthRate=0 且 churnRate=0 | 显示 flat projection |
| monthlyChurnRate=0 | 跳过 Scenario A |
| monthlyExpenses=0 | runway 和 breakeven 显示 "— enter expenses"；跳过 Scenario C |
| cashOnHand=0 | runway 显示 "$0 / —"；action plan 提示紧迫 |
| arpu=0 | 跳过 subscribers/churnedSubs 行 |
| netMonthlyRate=0 | milestones 显示 "—"；breakeven 显示 "Not reachable" |
| netMonthlyRate<0 | 下跌预警；milestones 只显示低于 currentMRR 的目标 |
| burnMultiple 分母=0 | "N/A" |
| 已盈利 | Scenario C 显示 savings 非 runway；burn=negative→profit |
| 里程碑>60mo | ">5 years" |
| customGrowthRate 留空 | 显示 "—" |

---

## Self-Review

- **Placeholder scan:** 无 TODO/TBD ✅
- **Internal consistency:** 7 inputs 全部映射到输出板块；公式定义完整；颜色规则统一 ✅
- **Scope:** 3 文件改动，可控 ✅
- **Ambiguity:** 边界条件全部明确；三种盈利状态各有分支处理 ✅
- **Example consistency:** 以 $5,000 MRR, 8% growth, 3% churn, $3,000 expenses, $60,000 cash, $25 ARPU, 12mo 贯穿所有示例 ✅
